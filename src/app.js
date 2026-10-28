// 遊戲流程控制：把流程狀態機、遊戲邏輯、存檔、HTML 畫面串起來。

import { DEFAULT_KEYBINDINGS } from "./data/keybindings.js";
import { PADDLES } from "./data/paddles.js";
import { LEVELS } from "./levels/levels.js";
import { levelRecord, recordLevelClear } from "./save/progress.js";
import { sync } from "./save/sync.js";
import { createFlow } from "./state/flow.js";
import { createHints, levelHintIds, powerupHintId } from "./ui/hints.js";
import { createScreens, renderLevelSelect, renderPaddleSelect, renderResult } from "./ui/screens.js";
import { createSettings } from "./ui/settings.js";

// 選單類畫面放選單曲；設定頁沿用進來前的狀態（從暫停進設定時音樂維持暫停）
const MENU_SCREENS = new Set(["menu", "levels", "paddles"]);

export function createApp({ dom, game, events, input, store, audio, music }) {
  const isTouch = window.matchMedia("(pointer: coarse)").matches;
  const keybindings = () => store.data.settings.keybindings ?? DEFAULT_KEYBINDINGS;
  const screens = createScreens(dom.stage);
  const flow = createFlow({ onChange: onFlowChange });

  const hints = createHints({
    element: dom.hint,
    isSeen: (id) => store.data.hintsSeen.includes(id),
    markSeen: (id) => store.update((s) => s.hintsSeen.push(id)),
    getContext: () => ({ touch: isTouch, keybindings: keybindings() }),
  });

  const settings = createSettings({
    ...dom.settings,
    store,
    isTouch,
    onKeybindingsChange: (next) => input.setBindings(next),
    onChange: () => audio.applySettings(),
  });

  function nextLevel() {
    const index = LEVELS.indexOf(game.state.level);
    return index >= 0 ? LEVELS[index + 1] : undefined;
  }

  // 返回鍵（Android）會先退回這一筆，不會直接離開網頁
  function guardHistory() {
    if (!window.history.state?.hitBrick) window.history.pushState({ hitBrick: true }, "");
  }

  function updateMusic(screen) {
    if (screen === "game") music.play("game");
    else if (MENU_SCREENS.has(screen)) music.play("menu");
    else if (screen !== "settings") music.pause();
  }

  function onFlowChange(state) {
    screens.show(state.screen);
    updateMusic(state.screen);
    input.setEnabled(state.screen === "game");
    if (state.screen === "countdown") dom.countdown.textContent = String(Math.ceil(state.countdown));
    if (state.screen === "levels") renderLevels();
    if (state.screen === "paddles") renderPaddles();
    if (state.screen === "settings") settings.render();
    if (state.screen === "result") renderResult(dom.result, state.result);
    if (state.screen !== "menu") guardHistory();
  }

  function renderLevels() {
    renderLevelSelect(dom.levelGrid, { levels: LEVELS, save: store.data, onPick: startLevel });
  }

  function renderPaddles() {
    renderPaddleSelect(dom.paddleList, {
      paddles: PADDLES,
      selectedId: store.data.selectedPaddle,
      onPick: (paddle) => {
        store.update((s) => {
          s.selectedPaddle = paddle.id;
        });
        renderPaddles();
      },
    });
  }

  function startLevel(level) {
    game.loadLevel(level, PADDLES[store.data.selectedPaddle] ?? PADDLES.standard);
    input.reset();
    hints.clear();
    flow.go("game");
    hints.request("aim", ...levelHintIds(game.state.bricks));
  }

  function restartLevel() {
    startLevel(game.state.level);
  }

  function resume() {
    input.reset();
    flow.resume();
  }

  // ---- 遊戲事件 ----
  events.on("pauseRequested", () => flow.pause());
  events.on("ballLaunched", () => hints.request("move"));
  events.on("comboChanged", ({ multiplier }) => {
    if (multiplier > 1) hints.request("combo");
  });
  events.on("capsuleSpawned", ({ type }) => hints.request(powerupHintId(type)));

  events.on("levelCleared", ({ level, score }) => {
    const numbered = typeof level.id === "number";
    let outcome = { isNewBest: false, previousBest: 0 };
    if (numbered) {
      store.update((s) => {
        outcome = recordLevelClear(s, level.id, score);
      });
      sync.pushSave(store.data).catch(() => {});
    }
    const next = nextLevel();
    const isLast = numbered && level === LEVELS[LEVELS.length - 1];
    flow.showResult({
      kind: isLast ? "allCleared" : "cleared",
      score,
      best: Math.max(outcome.previousBest, score),
      isNewBest: outcome.isNewBest,
      target: level.targetScore,
      hasNext: Boolean(next),
    });
  });

  events.on("gameOver", ({ level, score }) => {
    flow.showResult({
      kind: "failed",
      score,
      best: typeof level.id === "number" ? levelRecord(store.data, level.id).bestScore : 0,
      target: level.targetScore,
      hasNext: false,
    });
  });

  // ---- 按鈕 ----
  const actions = {
    start: () => {
      audio.unlock(); // 手機瀏覽器要在使用者點擊時解鎖音效
      flow.go("levels");
    },
    levels: () => flow.go("levels"),
    paddles: () => flow.go("paddles"),
    settings: () => flow.openSettings(),
    menu: () => flow.go("menu"),
    "close-settings": () => flow.closeSettings(),
    pause: () => flow.pause(),
    resume,
    restart: restartLevel,
    next: () => startLevel(nextLevel()),
  };

  dom.stage.addEventListener("click", (e) => {
    const button = e.target instanceof Element ? e.target.closest("[data-action]") : null;
    if (button && actions[button.dataset.action]) actions[button.dataset.action]();
  });

  // 暫停畫面按暫停鍵 = 繼續（遊戲中的暫停鍵由輸入層處理）
  window.addEventListener("keydown", (e) => {
    if (e.repeat || flow.state.screen !== "paused") return;
    if (keybindings().pause.includes(e.code)) {
      e.preventDefault();
      resume();
    }
  });

  // ---- 自動暫停：切分頁、鎖屏、來電、切到別的 App、返回鍵 ----
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) flow.pause();
  });
  window.addEventListener("blur", () => flow.pause());
  window.addEventListener("pagehide", () => flow.pause());
  window.addEventListener("popstate", () => {
    if (flow.back()) guardHistory();
  });

  dom.saveWarning.hidden = store.persistent;
  input.setBindings(keybindings());
  onFlowChange(flow.state);

  // 每個邏輯 tick 呼叫；暫停時遊戲、提示、倒數以外的時間都不前進
  function update(dt) {
    if (flow.state.screen === "countdown") {
      flow.tick(dt);
    } else if (flow.isRunning()) {
      game.step(dt, input.poll(dt));
      hints.tick(dt);
    }
  }

  return { update, flow, startLevel };
}
