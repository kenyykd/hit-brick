import "./style.css";
import { createApp } from "./app.js";
import { createAudio } from "./audio/audio.js";
import { createMusic } from "./audio/music.js";
import { createSoundFx } from "./audio/sound-fx.js";
import { FIELD, LOOP } from "./config.js";
import { createEventBus } from "./core/events.js";
import { startLoop } from "./core/loop.js";
import { DEFAULT_KEYBINDINGS } from "./data/keybindings.js";
import { PADDLES } from "./data/paddles.js";
import { POWERUPS } from "./data/powerups.js";
import { createEffects } from "./fx/effects.js";
import { createAutoQuality } from "./fx/quality.js";
import { createGame } from "./game/game.js";
import { createInput } from "./input/input.js";
import { LEVELS, SANDBOX_LEVEL } from "./levels/levels.js";
import { createDebug, debugEnabledFromUrl } from "./render/debug.js";
import { createRenderer } from "./render/renderer.js";
import { createViewport } from "./render/viewport.js";
import { createSaveStore } from "./save/save.js";
import { createHud } from "./ui/hud.js";

const $ = (selector) => document.querySelector(selector);

const events = createEventBus();
const store = createSaveStore();
const canvas = $("#game");
const viewport = createViewport({ frame: $("#frame"), stage: $("#stage"), canvas });

const game = createGame({
  fieldHeight: viewport.layout?.height ?? FIELD.minHeight,
  paddleDef: PADDLES[store.data.selectedPaddle] ?? PADDLES.standard,
  events,
  level: LEVELS[0],
});
viewport.onChange((layout) => game.setFieldHeight(layout.height));

const input = createInput({
  element: $("#app"),
  canvas,
  getField: () => game.state.field,
  getPaddle: () => game.state.paddle,
  isHolding: game.isHolding,
  bindings: DEFAULT_KEYBINDINGS,
});

// 表現層：音效、音樂、特效都只訂閱事件，整層拿掉遊戲照常
const getSettings = () => store.data.settings;
const audio = createAudio({ getSettings });
const music = createMusic({ audio });
createSoundFx({ events, audio });
const autoQuality = createAutoQuality();
const fx = createEffects({
  events,
  getState: () => game.state,
  getSettings,
  reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  getAutoLevel: () => autoQuality.level,
  // app 在下面才建立；拖尾只在繪製時（app 建立之後）才會讀顏色
  getBallColor: () => app.skins().ball.color,
});

const hud = createHud({
  scoreEl: $("#hud-score"),
  levelEl: $("#hud-level"),
  livesEl: $("#hud-lives"),
  comboEl: $("#hud-combo"),
  powerupsEl: $("#hud-powerups"),
  skillButton: $("#skill-button"),
  getSkill: () => game.skillDef(),
  events,
  state: game.state,
});

const app = createApp({
  dom: {
    stage: $("#stage"),
    hint: $("#hint"),
    countdown: $("#countdown-number"),
    levelGrid: $("#level-grid"),
    levelStarsTotal: $("#level-stars-total"),
    paddleList: $("#paddle-list"),
    ballSkinList: $("#ball-skin-list"),
    paddleSkinList: $("#paddle-skin-list"),
    achievementList: $("#achievement-list"),
    achievementCount: $("#achievement-count"),
    toast: $("#toast"),
    saveWarning: $("#save-warning"),
    result: {
      title: $("#result-title"),
      stars: $("#result-stars"),
      score: $("#result-score"),
      best: $("#result-best"),
      target: $("#result-target"),
      unlocks: $("#result-unlocks"),
      next: $("#result-next"),
    },
    settings: {
      form: $("#settings-form"),
      keyList: $("#key-list"),
      resetKeysButton: $("#reset-keys"),
      keySection: $("#key-section"),
    },
  },
  game,
  events,
  input,
  store,
  audio,
  music,
  unlockAll: debugEnabledFromUrl(),
});

const renderer = createRenderer(canvas);
const debug = createDebug({ enabled: debugEnabledFromUrl() });

// 除錯模式：開放給瀏覽器 console 與自動化測試檢查狀態；?level=N 或 ?level=sandbox 直接開始該關
if (debugEnabledFromUrl()) {
  window.__game = game;
  window.__app = app;
  const param = new URLSearchParams(window.location.search).get("level");
  const level = param === "sandbox" ? SANDBOX_LEVEL : LEVELS.find((l) => String(l.id) === param);
  if (level) app.startLevel(level);

  // 數字鍵 1～6 直接給道具、0 直接充滿技能能量，方便實機測試；所有板子都能選
  const powerupIds = Object.keys(POWERUPS);
  window.addEventListener("keydown", (e) => {
    if (!app.flow.isRunning()) return;
    if (e.code === "Digit0") game.addEnergy(1);
    const match = /^Digit([1-9])$/.exec(e.code);
    const id = match && powerupIds[Number(match[1]) - 1];
    if (id) game.grantPowerup(id);
  });
}

function debugShapes(state) {
  const { paddle } = state;
  return {
    circles: state.balls.map((b) => ({ x: b.x, y: b.y, r: b.r })),
    rects: [
      { x: paddle.x, y: paddle.y, w: paddle.width, h: paddle.height },
      ...state.bricks.filter((b) => b.alive),
    ],
  };
}

let lastRender = null;

startLoop({
  config: LOOP,
  update: app.update,
  render: ({ alpha, steps, now }) => {
    const frameTime = lastRender === null ? 0 : (now - lastRender) / 1000;
    lastRender = now;
    autoQuality.sample(frameTime);
    // 特效用畫面時間推進；暫停時凍結，結算畫面時彩帶繼續飄
    const screen = app.flow.state.screen;
    if (app.flow.isRunning() || screen === "result") fx.update(Math.min(frameTime, LOOP.maxFrameTime));

    const layout = viewport.layout;
    if (!layout) return;
    debug.frame(now);
    renderer.draw(game.state, { alpha, aim: input.getAim(), layout, fx, skins: app.skins() });
    hud.update();
    if (debug.enabled) {
      debug.setStats({
        畫面: app.flow.state.screen,
        步數: steps,
        子步驟: game.state.lastSubsteps,
        球數: game.state.balls.length,
        膠囊: game.state.capsules.length,
        道具: Object.keys(game.state.effects).join(",") || "-",
        特效: `${fx.qualityLevel()} 粒子 ${fx.particleCount()}`,
        場地: `${game.state.field.width}×${game.state.field.height}`,
      });
      debug.draw(renderer.ctx, debugShapes(game.state));
    }
  },
});
