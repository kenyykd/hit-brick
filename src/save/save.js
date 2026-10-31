// 存檔：localStorage 加版本號。讀到的內容一律當不可信資料驗證；
// 讀不到、毀損或瀏覽器不讓存（隱私模式）時用預設值，遊戲照常可玩，只是不保存。

import { ACHIEVEMENT_IDS } from "../data/achievements.js";
import { sanitizeKeybindings } from "../data/keybindings.js";
import { PADDLES } from "../data/paddles.js";
import { POWERUPS } from "../data/powerups.js";
import { BALL_SKINS, PADDLE_SKINS } from "../data/skins.js";

export const SAVE_KEY = "hit-brick-save";
export const SAVE_VERSION = 2;
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
    selectedBallSkin: "classic",
    selectedPaddleSkin: "solid",
    achievements: [], // 已達成的成就 id
    stats: {
      powerups: [], // 接過的道具種類
      laserBricks: 0, // 雷射累計打破的磚
      paddlesCleared: [], // 用來過關過的板子
    },
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
// 第 0 版代表沒有版本號的資料。新增的欄位由 sanitizeSave 補預設值，舊的進度原封保留。
const MIGRATIONS = {
  0: (data) => ({ ...data, version: 1 }),
  // 第 2 版（階段 7）：新增皮膚、成就、統計欄位
  1: (data) => ({ ...data, version: 2 }),
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
const keyOf = (v, table, fallback) => (typeof v === "string" && Object.hasOwn(table, v) ? v : fallback);
// 只留下清單裡認得的值，去掉重複
const knownList = (v, allowed) => (Array.isArray(v) ? [...new Set(v.filter((x) => allowed.includes(x)))] : []);

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
  save.selectedPaddle = keyOf(raw.selectedPaddle, PADDLES, "standard");
  save.selectedBallSkin = keyOf(raw.selectedBallSkin, BALL_SKINS, "classic");
  save.selectedPaddleSkin = keyOf(raw.selectedPaddleSkin, PADDLE_SKINS, "solid");
  save.achievements = knownList(raw.achievements, ACHIEVEMENT_IDS);

  const stats = isPlainObject(raw.stats) ? raw.stats : {};
  save.stats = {
    powerups: knownList(stats.powerups, Object.keys(POWERUPS)),
    laserBricks: intIn(stats.laserBricks, 0, 1e7, 0),
    paddlesCleared: knownList(stats.paddlesCleared, Object.keys(PADDLES)),
  };

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
    // 提示 id 可能有大寫（例如 powerup-extraLife）
    save.hintsSeen = [...new Set(raw.hintsSeen.filter((h) => typeof h === "string" && /^[A-Za-z-]{1,32}$/.test(h)))].slice(0, 100);
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

// 原始存檔文字裡的版本號；讀不出來（毀損或不是物件）時回傳 Infinity，不觸發升級寫回
function storedVersion(rawText) {
  try {
    const version = JSON.parse(rawText)?.version;
    return Number.isInteger(version) ? version : 0;
  } catch {
    return Infinity;
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
        // 舊版存檔升級後立刻寫回新版，不用等下一次存檔
        if (storedVersion(raw) < SAVE_VERSION) persist();
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
