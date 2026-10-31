// 遊戲流程控制：把流程狀態機、遊戲邏輯、存檔、HTML 畫面串起來。

import { createAchievementTracker } from "./achievements/tracker.js";
import { DEFAULT_KEYBINDINGS } from "./data/keybindings.js";
import { PADDLES } from "./data/paddles.js";
import { BALL_SKINS, PADDLE_SKINS } from "./data/skins.js";
import { UNLOCK_KINDS } from "./data/unlocks.js";
import { LEVELS } from "./levels/levels.js";
import { levelRecord, recordLevelClear, starsNeeded as starsNeededFor, totalStars, unlockedItems } from "./save/progress.js";
import { sync } from "./save/sync.js";
import { createFlow } from "./state/flow.js";
import { createHints, levelHintIds, powerupHintId } from "./ui/hints.js";
import {
  createScreens,
  renderAchievements,
  renderLevelSelect,
  renderPaddleSelect,
  renderResult,
  renderSkinSelect,
} from "./ui/screens.js";
import { createSettings } from "./ui/settings.js";
import { createToast } from "./ui/toast.js";

// 選單類畫面放選單曲；設定頁沿用進來前的狀態（從暫停進設定時音樂維持暫停）
const MENU_SCREENS = new Set(["menu", "levels", "paddles", "achievements"]);

// 解鎖項目（例如 "paddles:shield"）的顯示名稱
const UNLOCK_TABLES = { paddles: PADDLES, ballSkins: BALL_SKINS, paddleSkins: PADDLE_SKINS };
function unlockName(item) {
  const [kind, id] = item.split(":");
  return `${UNLOCK_KINDS[kind]}「${UNLOCK_TABLES[kind][id].name}」`;
}

// unlockAll：除錯模式下所有板子與外觀都能用，方便測試
export function createApp({ dom, game, events, input, store, audio, music, unlockAll = false }) {
  const isTouch = window.matchMedia("(pointer: coarse)").matches;
  const keybindings = () => store.data.settings.keybindings ?? DEFAULT_KEYBINDINGS;
  const screens = createScreens(dom.stage);
  const flow = createFlow({ onChange: onFlowChange });
  const toast = createToast(dom.toast);

  createAchievementTracker({
    events,
    store,
    getContext: () => ({
      totalStars: totalStars(store.data),
      allCleared: LEVELS.every((l) => store.data.levels[l.id]?.cleared),
      ballCount: game.state.balls.length,
      fireball: Object.hasOwn(game.state.effects, "fireball"),
    }),
    onUnlock: (achievement) => toast.show(`🏆 成就達成：${achievement.name}`),
  });

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
    if (state.screen === "achievements") {
      renderAchievements(dom.achievementList, { unlocked: store.data.achievements, countEl: dom.achievementCount });
    }
    if (state.screen === "settings") settings.render();
    if (state.screen === "result") renderResult(dom.result, state.result);
    if (state.screen !== "menu") guardHistory();
  }

  function renderLevels() {
    renderLevelSelect(dom.levelGrid, { levels: LEVELS, save: store.data, totalEl: dom.levelStarsTotal, onPick: startLevel });
  }

  const starsNeeded = (kind, id) => (unlockAll ? 0 : starsNeededFor(store.data, kind, id));

  // 存檔裡選的項目如果還沒解鎖（例如在除錯模式選的），改用預設的
  function selected(kind, table, saveKey, fallback) {
    const id = store.data[saveKey];
    return (starsNeeded(kind, id) === 0 && table[id]) || table[fallback];
  }
  const selectedPaddle = () => selected("paddles", PADDLES, "selectedPaddle", "standard");
  const selectedBallSkin = () => selected("ballSkins", BALL_SKINS, "selectedBallSkin", "classic");
  const selectedPaddleSkin = () => selected("paddleSkins", PADDLE_SKINS, "selectedPaddleSkin", "solid");

  // 選擇一個已解鎖的項目並存檔，然後重畫畫面
  function pick(kind, saveKey, id) {
    if (starsNeeded(kind, id) > 0) return;
    store.update((s) => {
      s[saveKey] = id;
    });
    renderPaddles();
  }

  function renderPaddles() {
    renderPaddleSelect(dom.paddleList, {
      paddles: PADDLES,
      selectedId: selectedPaddle().id,
      starsNeeded: (id) => starsNeeded("paddles", id),
      onPick: (paddle) => pick("paddles", "selectedPaddle", paddle.id),
    });
    renderSkinSelect(dom.ballSkinList, {
      skins: BALL_SKINS,
      kind: "ball",
      selectedId: selectedBallSkin().id,
      starsNeeded: (id) => starsNeeded("ballSkins", id),
      onPick: (skin) => pick("ballSkins", "selectedBallSkin", skin.id),
    });
    renderSkinSelect(dom.paddleSkinList, {
      skins: PADDLE_SKINS,
      kind: "paddle",
      selectedId: selectedPaddleSkin().id,
      starsNeeded: (id) => starsNeeded("paddleSkins", id),
      paddleColor: selectedPaddle().color,
      onPick: (skin) => pick("paddleSkins", "selectedPaddleSkin", skin.id),
    });
  }

  function startLevel(level) {
    game.loadLevel(level, selectedPaddle());
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
  events.on("skillReady", () => hints.request("skill"));

  // 過關：記錄分數與星星，找出這次新解鎖的板子與外觀並慶祝
  events.on("levelCleared", ({ level, score, targetScore, livesLost }) => {
    const numbered = typeof level.id === "number";
    let outcome = { isNewBest: false, previousBest: 0, stars: 0 };
    let unlocks = [];
    if (numbered) {
      const before = new Set(unlockedItems(store.data));
      store.update((s) => {
        outcome = recordLevelClear(s, level.id, { score, target: targetScore, livesLost });
      });
      unlocks = unlockedItems(store.data).filter((item) => !before.has(item)).map(unlockName);
      sync.pushSave(store.data).catch(() => {});
      events.emit("levelRecorded", { levelId: level.id, stars: outcome.stars, unlocks });
      for (const name of unlocks) toast.show(`🎉 解鎖：${name}`);
    }
    const next = nextLevel();
    const isLast = numbered && level === LEVELS[LEVELS.length - 1];
    flow.showResult({
      kind: isLast ? "allCleared" : "cleared",
      score,
      best: Math.max(outcome.previousBest, score),
      isNewBest: outcome.isNewBest,
      target: targetScore,
      stars: outcome.stars,
      unlocks,
      hasNext: Boolean(next),
    });
  });

  events.on("gameOver", ({ level, score, targetScore }) => {
    flow.showResult({
      kind: "failed",
      score,
      best: typeof level.id === "number" ? levelRecord(store.data, level.id).bestScore : 0,
      target: targetScore,
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
    achievements: () => flow.go("achievements"),
    settings: () => flow.openSettings(),
    menu: () => flow.go("menu"),
    "close-settings": () => flow.closeSettings(),
    pause: () => flow.pause(),
    skill: () => input.requestSkill(),
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

  // 給繪製用：目前選用（且已解鎖）的皮膚
  const skins = () => ({ ball: selectedBallSkin(), paddle: selectedPaddleSkin() });

  return { update, flow, startLevel, skins };
}
