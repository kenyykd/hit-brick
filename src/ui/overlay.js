// 暫用的結束 / 過關畫面，取代 alert 與重新載入網頁。階段 3 換成完整的流程畫面。

export function createOverlay({ root, titleEl, scoreEl, restartButton, nextButton, events, state, hasNextLevel, onRestart, onNext }) {
  function show(title, canGoNext) {
    titleEl.textContent = title;
    scoreEl.textContent = `分數 ${state.score}`;
    nextButton.hidden = !canGoNext;
    root.hidden = false;
  }

  events.on("gameOver", () => show("遊戲結束", false));
  events.on("levelCleared", () => {
    const next = hasNextLevel();
    show(next ? "過關！" : "全部通關！", next);
  });
  events.on("gameReset", () => {
    root.hidden = true;
  });
  restartButton.addEventListener("click", onRestart);
  nextButton.addEventListener("click", onNext);
}
