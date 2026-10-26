// 電腦預設鍵位（KeyboardEvent.code）。玩家可以在設定頁自訂。

export const DEFAULT_KEYBINDINGS = {
  moveLeft: ["ArrowLeft", "KeyA"],
  moveRight: ["ArrowRight", "KeyD"],
  aimLeft: ["ArrowUp", "KeyW"],
  aimRight: ["ArrowDown", "KeyS"],
  launchOrSkill: ["Space"], // 持球時發射，沒持球時施放技能
  pause: ["Escape", "KeyP"],
};

export const ACTION_LABELS = {
  moveLeft: "板子往左",
  moveRight: "板子往右",
  aimLeft: "瞄準往左",
  aimRight: "瞄準往右",
  launchOrSkill: "發射／技能",
  pause: "暫停",
};

const MAX_KEYS_PER_ACTION = 4;
const CODE_PATTERN = /^[A-Za-z0-9]{1,24}$/;

// 建立 code → 動作 的反查表
export function buildKeyMap(bindings) {
  const map = new Map();
  for (const [action, codes] of Object.entries(bindings)) {
    for (const code of codes) map.set(code, action);
  }
  return map;
}

// 存檔裡的鍵位是不可信資料：格式不對的動作改回預設值
export function sanitizeKeybindings(raw) {
  if (!raw || typeof raw !== "object") return null;
  const result = {};
  for (const action of Object.keys(DEFAULT_KEYBINDINGS)) {
    const codes = raw[action];
    const valid =
      Array.isArray(codes) &&
      codes.length <= MAX_KEYS_PER_ACTION &&
      codes.every((c) => typeof c === "string" && CODE_PATTERN.test(c));
    result[action] = valid ? [...new Set(codes)] : [...DEFAULT_KEYBINDINGS[action]];
  }
  return result;
}

// 把 code 指定給 action（取代原本的鍵），並從其他動作移除同一個鍵。
// 其他動作若因此沒有任何鍵，就補回它預設鍵中沒被占用的。
export function rebind(bindings, action, code) {
  const next = {};
  for (const [a, codes] of Object.entries(bindings)) next[a] = codes.filter((c) => c !== code);
  next[action] = [code];
  for (const a of Object.keys(next)) {
    if (next[a].length > 0) continue;
    const used = new Set(Object.values(next).flat());
    next[a] = DEFAULT_KEYBINDINGS[a].filter((c) => !used.has(c));
  }
  return next;
}

const KEY_NAMES = {
  ArrowLeft: "←",
  ArrowRight: "→",
  ArrowUp: "↑",
  ArrowDown: "↓",
  Space: "空白鍵",
  Escape: "Esc",
  Enter: "Enter",
  ShiftLeft: "左 Shift",
  ShiftRight: "右 Shift",
  ControlLeft: "左 Ctrl",
  ControlRight: "右 Ctrl",
};

export function keyLabel(code) {
  if (KEY_NAMES[code]) return KEY_NAMES[code];
  if (/^Key[A-Z]$/.test(code)) return code.slice(3);
  if (/^Digit[0-9]$/.test(code)) return code.slice(5);
  return code;
}

export function keysLabel(codes) {
  return codes.length > 0 ? codes.map(keyLabel).join(" / ") : "（未設定）";
}
