// 遊戲中 HUD：分數、關卡、生命、連擊。全部用 textContent，不拼 HTML。

export function levelTitle(level) {
  return typeof level.id === "number" ? `第 ${level.id} 關` : level.name;
}

export function createHud({ scoreEl, levelEl, livesEl, comboEl, events, state }) {
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

  for (const type of ["gameReset", "brickDestroyed", "lifeLost"]) events.on(type, render);
  events.on("comboChanged", renderCombo);
  events.on("gameReset", () => renderCombo({ combo: 0, multiplier: 1 }));
  render();
}
