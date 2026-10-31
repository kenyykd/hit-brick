// 遊戲中 HUD：分數、關卡、生命、連擊、啟用中的道具、技能能量。全部用 textContent，不拼 HTML。

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

// 技能按鈕顯示的內容；沒有技能的板子回傳 null（按鈕隱藏）
export function skillButtonView(skill, energy) {
  if (!skill) return null;
  const percent = Math.floor(Math.min(energy, 1) * 100);
  return {
    icon: skill.icon,
    label: percent >= 100 ? skill.name : `${percent}%`,
    fill: percent,
    ready: percent >= 100,
    color: skill.color,
  };
}

export function createHud({ scoreEl, levelEl, livesEl, comboEl, powerupsEl, skillButton, getSkill, events, state }) {
  let lastPowerups = "";
  let lastCombo = 0;
  let lastSkill = "";
  const skillFill = skillButton.querySelector(".skill-fill");
  const skillIcon = skillButton.querySelector(".skill-icon");
  const skillLabel = skillButton.querySelector(".skill-label");

  // 能量條與技能按鈕：只在內容改變時才更新 DOM
  function updateSkill() {
    const view = skillButtonView(getSkill(), state.energy);
    const key = view ? `${view.icon}|${view.label}|${view.fill}` : "none";
    if (key === lastSkill) return;
    lastSkill = key;
    skillButton.hidden = !view;
    if (!view) return;
    skillButton.style.setProperty("--skill-color", view.color);
    skillButton.classList.toggle("ready", view.ready);
    skillButton.setAttribute("aria-label", view.ready ? `施放${view.label}` : `技能能量 ${view.label}`);
    skillFill.style.height = `${view.fill}%`;
    skillIcon.textContent = view.icon;
    skillLabel.textContent = view.label;
  }

  function render() {
    scoreEl.textContent = `分數 ${state.score}`;
    levelEl.textContent = levelTitle(state.level);
    livesEl.textContent = `生命 ${state.lives}`;
  }

  function renderCombo({ combo, multiplier }) {
    const increased = combo > lastCombo;
    lastCombo = combo;
    if (combo < 2) {
      comboEl.hidden = true;
      return;
    }
    comboEl.textContent = multiplier > 1 ? `${combo} 連擊 ×${multiplier}` : `${combo} 連擊`;
    comboEl.hidden = false;
    comboEl.classList.toggle("boosted", multiplier > 1);
    if (increased) {
      // 重新觸發放大動畫
      comboEl.classList.remove("pulse");
      void comboEl.offsetWidth;
      comboEl.classList.add("pulse");
    }
  }

  // 每幀呼叫；只在道具清單或秒數改變時才重建
  function update() {
    updateSkill();
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
