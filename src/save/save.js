// 存檔：localStorage 加版本號。讀到的內容一律當不可信資料驗證；
// 讀不到、毀損或瀏覽器不讓存（隱私模式）時用預設值，遊戲照常可玩，只是不保存。

import { sanitizeKeybindings } from "../data/keybindings.js";
import { PADDLES } from "../data/paddles.js";

export const SAVE_KEY = "hit-brick-save";
export const SAVE_VERSION = 1;
const MAX_RAW_LENGTH = 200_000;
const MAX_LEVEL_ENTRIES = 500;
const EFFECT_LEVELS = ["high", "medium", "low"];

export function defaultSave() {
  return {
    version: SAVE_VERSION,
    playerId: null, // 預留：之後雲端存檔用的匿名玩家編號
    unlockedLevel: 1,
    levels: {}, // { [關卡編號]: { bestScore, cleared, stars } }
    selectedPaddle: "standard",
    settings: {
      sound: true,
      music: true,
      effects: "high",
      screenShake: true,
      vibration: true,
      keybindings: null, // null = 使用預設鍵位
    },
    hintsSeen: [],
  };
}

// 舊版存檔升級：MIGRATIONS[n] 把第 n 版轉成第 n + 1 版。
// 第 0 版代表沒有版本號的資料（目前沒有實際的舊版，先放好機制）。
const MIGRATIONS = {
  0: (data) => ({ ...data, version: 1 }),
};

export function migrate(data) {
  let current = { ...data };
  let version = Number.isInteger(current.version) ? current.version : 0;
  while (version < SAVE_VERSION && MIGRATIONS[version]) {
    current = MIGRATIONS[version](current);
    version += 1;
  }
  return current;
}

const isPlainObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const bool = (v, fallback) => (typeof v === "boolean" ? v : fallback);
const intIn = (v, min, max, fallback) => (Number.isInteger(v) && v >= min && v <= max ? v : fallback);

function sanitizeLevels(raw) {
  const result = {};
  if (!isPlainObject(raw)) return result;
  for (const [id, entry] of Object.entries(raw).slice(0, MAX_LEVEL_ENTRIES)) {
    if (!/^\d{1,4}$/.test(id) || !isPlainObject(entry)) continue;
    result[id] = {
      bestScore: intIn(entry.bestScore, 0, 1e9, 0),
      cleared: bool(entry.cleared, false),
      stars: intIn(entry.stars, 0, 3, 0),
    };
  }
  return result;
}

// 只留下認得、格式正確的欄位，其他一律用預設值
export function sanitizeSave(raw) {
  const save = defaultSave();
  if (!isPlainObject(raw)) return save;

  if (typeof raw.playerId === "string" && /^[A-Za-z0-9-]{8,64}$/.test(raw.playerId)) save.playerId = raw.playerId;
  save.unlockedLevel = intIn(raw.unlockedLevel, 1, 9999, 1);
  save.levels = sanitizeLevels(raw.levels);
  if (typeof raw.selectedPaddle === "string" && Object.hasOwn(PADDLES, raw.selectedPaddle)) {
    save.selectedPaddle = raw.selectedPaddle;
  }

  const s = isPlainObject(raw.settings) ? raw.settings : {};
  save.settings = {
    sound: bool(s.sound, true),
    music: bool(s.music, true),
    effects: EFFECT_LEVELS.includes(s.effects) ? s.effects : "high",
    screenShake: bool(s.screenShake, true),
    vibration: bool(s.vibration, true),
    keybindings: sanitizeKeybindings(s.keybindings),
  };

  if (Array.isArray(raw.hintsSeen)) {
    save.hintsSeen = [...new Set(raw.hintsSeen.filter((h) => typeof h === "string" && /^[a-z-]{1,32}$/.test(h)))].slice(0, 100);
  }
  return save;
}

export function parseSave(rawText) {
  if (typeof rawText !== "string" || rawText.length > MAX_RAW_LENGTH) return defaultSave();
  try {
    return sanitizeSave(migrate(JSON.parse(rawText)));
  } catch {
    return defaultSave();
  }
}

// 確認瀏覽器真的能寫入 localStorage（隱私模式可能會丟錯）
export function getLocalStorage() {
  try {
    const storage = window.localStorage;
    const probe = "__hit-brick-probe__";
    storage.setItem(probe, "1");
    storage.removeItem(probe);
    return storage;
  } catch {
    return null;
  }
}

export function createSaveStore(storage = getLocalStorage()) {
  let persistent = Boolean(storage);
  let data = defaultSave();

  if (storage) {
    try {
      const raw = storage.getItem(SAVE_KEY);
      if (raw !== null) {
        data = parseSave(raw);
        // 讀到毀損的存檔時先備份一份原始內容，避免被下次存檔覆蓋就救不回來
        if (JSON.stringify(data) === JSON.stringify(defaultSave()) && raw !== JSON.stringify(data)) {
          storage.setItem(`${SAVE_KEY}-backup`, raw.slice(0, MAX_RAW_LENGTH));
        }
      }
    } catch {
      data = defaultSave();
    }
  }

  function persist() {
    if (!persistent) return false;
    try {
      storage.setItem(SAVE_KEY, JSON.stringify(data));
      return true;
    } catch {
      persistent = false; // 容量滿了或被封鎖：之後只留在記憶體
      return false;
    }
  }

  // 修改存檔並立即保存
  function update(mutate) {
    mutate(data);
    data = sanitizeSave(data);
    persist();
  }

  return {
    get data() {
      return data;
    },
    get persistent() {
      return persistent;
    },
    update,
  };
}
