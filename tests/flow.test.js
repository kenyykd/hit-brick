import { describe, expect, it } from "vitest";
import { GAME } from "../src/config.js";
import { DEFAULT_KEYBINDINGS, keyLabel, rebind, sanitizeKeybindings } from "../src/data/keybindings.js";
import { createFlow } from "../src/state/flow.js";

describe("流程狀態機", () => {
  it("只有遊戲中或倒數中可以暫停", () => {
    const flow = createFlow();
    expect(flow.pause()).toBe(false);
    flow.go("game");
    expect(flow.pause()).toBe(true);
    expect(flow.state.screen).toBe("paused");
    expect(flow.isRunning()).toBe(false);
  });

  it("恢復時先倒數 3 秒才回到遊戲", () => {
    const flow = createFlow();
    flow.go("game");
    flow.pause();
    flow.resume();
    expect(flow.state.screen).toBe("countdown");
    for (let t = 0; t < GAME.resumeCountdown - 0.1; t += 0.1) flow.tick(0.1);
    expect(flow.state.screen).toBe("countdown");
    flow.tick(0.2);
    expect(flow.state.screen).toBe("game");
  });

  it("倒數中再暫停會回到暫停畫面", () => {
    const flow = createFlow();
    flow.go("game");
    flow.pause();
    flow.resume();
    flow.tick(1);
    flow.pause();
    expect(flow.state.screen).toBe("paused");
  });

  it("暫停畫面不會倒數", () => {
    const flow = createFlow();
    flow.go("game");
    flow.pause();
    flow.tick(10);
    expect(flow.state.screen).toBe("paused");
  });

  it("設定頁關閉後回到原本的畫面", () => {
    const flow = createFlow();
    flow.go("game");
    flow.pause();
    flow.openSettings();
    flow.closeSettings();
    expect(flow.state.screen).toBe("paused");
  });

  it("返回鍵：遊戲中暫停、選關回主選單、主選單讓瀏覽器處理", () => {
    const flow = createFlow();
    expect(flow.back()).toBe(false);
    flow.go("levels");
    expect(flow.back()).toBe(true);
    expect(flow.state.screen).toBe("menu");
    flow.go("game");
    flow.back();
    expect(flow.state.screen).toBe("paused");
  });
});

describe("鍵位自訂", () => {
  it("指定新鍵會取代原本的鍵，並從其他動作移除", () => {
    const next = rebind(DEFAULT_KEYBINDINGS, "pause", "KeyA");
    expect(next.pause).toEqual(["KeyA"]);
    expect(next.moveLeft).toEqual(["ArrowLeft"]);
  });

  it("其他動作的鍵全被搶走時補回沒被占用的預設鍵", () => {
    const next = rebind(DEFAULT_KEYBINDINGS, "launchOrSkill", "KeyP");
    const again = rebind({ ...next, pause: ["KeyP"] }, "moveLeft", "KeyP");
    expect(again.moveLeft).toEqual(["KeyP"]);
    expect(again.pause).toEqual(["Escape"]);
  });

  it("鍵位驗證：格式錯誤的動作回到預設值", () => {
    expect(sanitizeKeybindings("壞掉")).toBeNull();
    const b = sanitizeKeybindings({ moveLeft: "KeyA", pause: ["KeyQ", "KeyQ"] });
    expect(b.moveLeft).toEqual(DEFAULT_KEYBINDINGS.moveLeft);
    expect(b.pause).toEqual(["KeyQ"]);
  });

  it("按鍵顯示名稱", () => {
    expect(keyLabel("ArrowLeft")).toBe("←");
    expect(keyLabel("KeyA")).toBe("A");
    expect(keyLabel("Digit3")).toBe("3");
    expect(keyLabel("Space")).toBe("空白鍵");
  });
});
