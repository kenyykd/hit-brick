import { describe, expect, it } from "vitest";
import { SAVE_KEY, SAVE_VERSION, createSaveStore, defaultSave, migrate, parseSave, sanitizeSave } from "../src/save/save.js";
import { isLevelUnlocked, levelRecord, recordLevelClear } from "../src/save/progress.js";

function memoryStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
    map,
  };
}

describe("讀取存檔", () => {
  it("沒有存檔時用預設值", () => {
    const store = createSaveStore(memoryStorage());
    expect(store.data).toEqual(defaultSave());
    expect(store.persistent).toBe(true);
  });

  it("瀏覽器不讓存（隱私模式）時仍可遊玩，只是不保存", () => {
    const store = createSaveStore(null);
    expect(store.persistent).toBe(false);
    expect(() => store.update((s) => (s.unlockedLevel = 3))).not.toThrow();
    expect(store.data.unlockedLevel).toBe(3);
  });

  it("存檔毀損時用預設值，並備份原始內容", () => {
    const storage = memoryStorage({ [SAVE_KEY]: "{這不是 JSON" });
    const store = createSaveStore(storage);
    expect(store.data).toEqual(defaultSave());
    expect(storage.getItem(`${SAVE_KEY}-backup`)).toBe("{這不是 JSON");
  });

  it("讀取時丟錯也不會壞掉", () => {
    const storage = { getItem: () => { throw new Error("blocked"); }, setItem: () => {}, removeItem: () => {} };
    expect(createSaveStore(storage).data).toEqual(defaultSave());
  });

  it("寫入失敗（容量滿）時不丟錯，之後改為只存在記憶體", () => {
    const storage = memoryStorage();
    storage.setItem = () => { throw new Error("QuotaExceeded"); };
    const store = createSaveStore(storage);
    expect(() => store.update((s) => (s.unlockedLevel = 2))).not.toThrow();
    expect(store.persistent).toBe(false);
  });

  it("寫入後重新讀取內容一致", () => {
    const storage = memoryStorage();
    createSaveStore(storage).update((s) => {
      s.unlockedLevel = 4;
      s.levels[1] = { bestScore: 500, cleared: true, stars: 0 };
      s.settings.sound = false;
    });
    const again = createSaveStore(storage).data;
    expect(again.unlockedLevel).toBe(4);
    expect(again.levels[1].bestScore).toBe(500);
    expect(again.settings.sound).toBe(false);
    expect(again.version).toBe(SAVE_VERSION);
  });
});

describe("存檔驗證（不可信資料）", () => {
  it("不合法的欄位改用預設值", () => {
    const save = sanitizeSave({
      unlockedLevel: -5,
      levels: { 1: { bestScore: -10, cleared: "yes", stars: 99 }, abc: { bestScore: 5 }, 2: "壞掉" },
      selectedPaddle: "不存在的板子",
      settings: { sound: "off", effects: "ultra", keybindings: { moveLeft: ["<script>"], pause: ["KeyQ"] } },
      hintsSeen: ["aim", 42, "<img>", "aim"],
      playerId: "<script>alert(1)</script>",
      extra: "多出來的欄位",
    });
    expect(save.unlockedLevel).toBe(1);
    expect(save.levels).toEqual({ 1: { bestScore: 0, cleared: false, stars: 0 } });
    expect(save.selectedPaddle).toBe("standard");
    expect(save.settings.sound).toBe(true);
    expect(save.settings.effects).toBe("high");
    expect(save.settings.keybindings.moveLeft).toEqual(["ArrowLeft", "KeyA"]);
    expect(save.settings.keybindings.pause).toEqual(["KeyQ"]);
    expect(save.hintsSeen).toEqual(["aim"]);
    expect(save.playerId).toBeNull();
    expect(save).not.toHaveProperty("extra");
  });

  it("不是物件、過大的內容都回到預設值", () => {
    expect(parseSave("[]")).toEqual(defaultSave());
    expect(parseSave("null")).toEqual(defaultSave());
    expect(parseSave("x".repeat(300_000))).toEqual(defaultSave());
  });

  it("沒有版本號的舊存檔會升級並保留進度", () => {
    const old = { unlockedLevel: 3, levels: { 1: { bestScore: 100, cleared: true } } };
    expect(migrate(old).version).toBe(SAVE_VERSION);
    const save = parseSave(JSON.stringify(old));
    expect(save.unlockedLevel).toBe(3);
    expect(save.levels[1].bestScore).toBe(100);
  });
});

describe("關卡進度", () => {
  it("過關解鎖下一關並記錄最高分", () => {
    const save = defaultSave();
    expect(isLevelUnlocked(save, 2)).toBe(false);
    const r = recordLevelClear(save, 1, 300);
    expect(r.isNewBest).toBe(true);
    expect(isLevelUnlocked(save, 2)).toBe(true);
    expect(levelRecord(save, 1)).toMatchObject({ bestScore: 300, cleared: true });
  });

  it("最高分只增不減，重玩舊關不會降低解鎖進度", () => {
    const save = defaultSave();
    recordLevelClear(save, 1, 300);
    recordLevelClear(save, 2, 200);
    const r = recordLevelClear(save, 1, 100);
    expect(r.isNewBest).toBe(false);
    expect(levelRecord(save, 1).bestScore).toBe(300);
    expect(save.unlockedLevel).toBe(3);
  });
});
