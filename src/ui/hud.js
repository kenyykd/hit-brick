// 暫用的 HTML HUD：分數與生命。階段 3 改成完整的遊戲中介面。

export function createHud({ scoreEl, livesEl, events, state }) {
  function render() {
    scoreEl.textContent = `分數 ${state.score}`;
    livesEl.textContent = `生命 ${state.lives}`;
  }

  for (const type of ["gameReset", "brickDestroyed", "lifeLost"]) events.on(type, render);
  render();
}
