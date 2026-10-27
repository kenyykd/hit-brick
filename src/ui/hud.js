// 遊戲中 HUD：分數、關卡、生命、連擊、啟用中的道具。全部用 textContent，不拼 HTML。

import { POWERUPS } from "../data/powerups.js";

export function levelTitle(level) {
  return typeof level.id === "number" ? `第 ${level.id} 關` : level.name;
}

// 啟用中的計時道具，剩餘秒數無條件進位
export function powerupChips(effects) {
  return Object.entries(effects).map(([id, remaining]) => {
    const def = POWERUPS[id];
    return { id, color: def.color, text: `${def.icon} ${def.name} ${Math.ceil(remaining)}s` };
  });
}

export function createHud({ scoreEl, levelEl, livesEl, comboEl, powerupsEl, events, state }) {
  let lastPowerups = "";

  function render() {
    scoreEl.textContent = `分數 ${state.score}`;
    levelEl.textContent = levelTitle(state.level);
    livesEl.textContent = `生命 ${state.lives}`;
  }

  function renderCombo({ combo, multiplier }) {
    if (combo < 2) {
      comboEl.hidden = true;
      return;
    }
    comboEl.textContent = multiplier > 1 ? `${combo} 連擊 ×${multiplier}` : `${combo} 連擊`;
    comboEl.hidden = false;
  }

  // 每幀呼叫；只在道具清單或秒數改變時才重建
  function update() {
    const chips = powerupChips(state.effects);
    const key = chips.map((c) => c.text).join("|");
    if (key === lastPowerups) return;
    lastPowerups = key;
    powerupsEl.replaceChildren(
      ...chips.map((c) => {
        const chip = document.createElement("span");
        chip.className = "powerup-chip";
        chip.style.borderColor = c.color;
        chip.textContent = c.text;
        return chip;
      }),
    );
  }

  for (const type of ["gameReset", "brickDestroyed", "lifeLost", "powerupCollected"]) events.on(type, render);
  events.on("comboChanged", renderCombo);
  events.on("gameReset", () => renderCombo({ combo: 0, multiplier: 1 }));
  render();

  return { update };
}
