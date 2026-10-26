// 暫用的 HTML HUD：分數、關卡、生命。階段 3 改成完整的遊戲中介面。

export function createHud({ scoreEl, levelEl, livesEl, events, state }) {
  function render() {
    scoreEl.textContent = `分數 ${state.score}`;
    const { id, name } = state.level;
    levelEl.textContent = typeof id === "number" ? `第 ${id} 關` : name;
    livesEl.textContent = `生命 ${state.lives}`;
  }

  for (const type of ["gameReset", "brickDestroyed", "lifeLost"]) events.on(type, render);
  render();
}
