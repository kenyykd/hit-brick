// 電腦預設鍵位（KeyboardEvent.code）。之後設定頁可以讓玩家自訂。

export const DEFAULT_KEYBINDINGS = {
  moveLeft: ["ArrowLeft", "KeyA"],
  moveRight: ["ArrowRight", "KeyD"],
  aimLeft: ["ArrowUp", "KeyW"],
  aimRight: ["ArrowDown", "KeyS"],
  launchOrSkill: ["Space"], // 持球時發射，沒持球時施放技能
  pause: ["Escape", "KeyP"],
};

// 建立 code → 動作 的反查表
export function buildKeyMap(bindings) {
  const map = new Map();
  for (const [action, codes] of Object.entries(bindings)) {
    for (const code of codes) map.set(code, action);
  }
  return map;
}
