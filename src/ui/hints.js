// 情境式新手提示：新元素第一次出現時說明一次，看過的記在存檔裡。
// 文字依裝置切換；電腦版的按鍵名稱跟著玩家自訂的鍵位。

import { keysLabel } from "../data/keybindings.js";

const SHOW_SECONDS = 4.5;

export const HINTS = {
  aim: {
    touch: () => "按住畫面往後拉來瞄準，放開就發射；點一下直接往上發射",
    desktop: (k) => `按住滑鼠往後拉瞄準、放開發射；也可以用 ${keysLabel(k.aimLeft)}／${keysLabel(k.aimRight)} 調角度、${keysLabel(k.launchOrSkill)} 發射`,
  },
  move: {
    touch: () => "在畫面任意處左右拖曳來移動板子，手指不用壓在板子上",
    desktop: (k) => `移動滑鼠或按 ${keysLabel(k.moveLeft)}／${keysLabel(k.moveRight)} 移動板子；${keysLabel(k.pause)} 暫停`,
  },
  combo: { all: () => "連續打破磚會累積連擊：每 5 連擊加 1 倍，最高 4 倍；球碰到板子就歸零" },
  tough: { all: () => "紫色磚要打好幾下才會破，上面的點點代表還剩幾下" },
  steel: { all: () => "灰色外框的磚打不破，過關不需要打掉它" },
  explosive: { all: () => "爆炸磚被打破時會炸掉上下左右的磚，還能連鎖引爆" },
  "powerup-multiball": { all: () => "接住「⁂」膠囊：每顆球分成三顆，要全部掉光才會失去生命" },
  "powerup-expand": { all: () => "接住「↔」膠囊：板子暫時變長" },
  "powerup-slow": { all: () => "接住「◔」膠囊：球暫時變慢" },
  "powerup-fireball": { all: () => "接住「▲」膠囊：火球會直接穿過可破壞的磚，但遇到灰框磚還是會彈回" },
  "powerup-magnet": {
    touch: () => "接住「U」膠囊：球碰到板子會黏住，再拉一次彈弓重新瞄準發射",
    desktop: (k) => `接住「U」膠囊：球碰到板子會黏住，重新瞄準後按 ${keysLabel(k.launchOrSkill)} 或放開滑鼠發射`,
  },
  "powerup-extraLife": { all: () => "接住「♥」膠囊：多一條命（最多 5 條）" },
  skill: {
    touch: () => "技能能量滿了！按右下角發光的按鈕施放技能",
    desktop: (k) => `技能能量滿了！按 ${keysLabel(k.launchOrSkill)}、滑鼠右鍵或右下角的按鈕施放技能`,
  },
};

export function powerupHintId(type) {
  return `powerup-${type}`;
}

// 這一關有哪些需要說明的磚
export function levelHintIds(bricks) {
  const types = new Set(bricks.map((b) => b.type));
  return ["tough", "steel", "explosive"].filter((t) => types.has(t));
}

export function hintText(id, { touch, keybindings }) {
  const hint = HINTS[id];
  if (hint.all) return hint.all();
  return touch ? hint.touch() : hint.desktop(keybindings);
}

export function createHints({ element, isSeen, markSeen, getContext }) {
  const queue = [];
  let current = null;
  let remaining = 0;

  function render() {
    if (current) {
      element.textContent = hintText(current, getContext());
      element.hidden = false;
    } else {
      element.hidden = true;
    }
  }

  function showNext() {
    current = queue.shift() ?? null;
    remaining = SHOW_SECONDS;
    if (current) markSeen(current);
    render();
  }

  // 只排入還沒看過、也沒在排隊的提示
  function request(...ids) {
    for (const id of ids) {
      if (isSeen(id) || queue.includes(id) || current === id) continue;
      queue.push(id);
    }
    if (!current) showNext();
  }

  // 用遊戲時間倒數，暫停時提示也停住
  function tick(dt) {
    if (!current) return;
    remaining -= dt;
    if (remaining <= 0) showNext();
  }

  function clear() {
    queue.length = 0;
    current = null;
    render();
  }

  return { request, tick, clear };
}
