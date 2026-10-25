// 暫用的結束 / 過關畫面，取代 alert 與重新載入網頁。階段 3 換成完整的流程畫面。

export function createOverlay({ root, titleEl, scoreEl, button, events, state, onRestart }) {
  function show(title) {
    titleEl.textContent = title;
    scoreEl.textContent = `分數 ${state.score}`;
    root.hidden = false;
  }

  events.on("gameOver", () => show("遊戲結束"));
  events.on("levelCleared", () => show("過關！"));
  events.on("gameReset", () => {
    root.hidden = true;
  });
  button.addEventListener("click", onRestart);
}
