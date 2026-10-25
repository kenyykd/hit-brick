import "./style.css";
import { FIELD, LOOP } from "./config.js";
import { createEventBus } from "./core/events.js";
import { startLoop } from "./core/loop.js";
import { DEFAULT_KEYBINDINGS } from "./data/keybindings.js";
import { PADDLES } from "./data/paddles.js";
import { createGame } from "./game/game.js";
import { createInput } from "./input/input.js";
import { createDebug, debugEnabledFromUrl } from "./render/debug.js";
import { createRenderer } from "./render/renderer.js";
import { createViewport } from "./render/viewport.js";
import { createHud } from "./ui/hud.js";
import { createOverlay } from "./ui/overlay.js";

const $ = (selector) => document.querySelector(selector);

const events = createEventBus();
const canvas = $("#game");
const viewport = createViewport({ frame: $("#frame"), stage: $("#stage"), canvas });

const game = createGame({
  fieldHeight: viewport.layout?.height ?? FIELD.minHeight,
  paddleDef: PADDLES.standard,
  events,
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

createHud({ scoreEl: $("#hud-score"), livesEl: $("#hud-lives"), events, state: game.state });
createOverlay({
  root: $("#overlay"),
  titleEl: $("#overlay-title"),
  scoreEl: $("#overlay-score"),
  button: $("#overlay-restart"),
  events,
  state: game.state,
  onRestart: () => game.reset(),
});

const renderer = createRenderer(canvas);
const debug = createDebug({ enabled: debugEnabledFromUrl() });
// 除錯模式下開放給瀏覽器 console 與自動化測試檢查狀態
if (debugEnabledFromUrl()) window.__game = game;

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

startLoop({
  config: LOOP,
  update: (dt) => game.step(dt, input.poll(dt)),
  render: ({ alpha, steps, now }) => {
    const layout = viewport.layout;
    if (!layout) return;
    debug.frame(now);
    renderer.draw(game.state, { alpha, aim: input.getAim(), layout });
    if (debug.enabled) {
      debug.setStats({
        步數: steps,
        子步驟: game.state.lastSubsteps,
        球數: game.state.balls.length,
        場地: `${game.state.field.width}×${game.state.field.height}`,
      });
      debug.draw(renderer.ctx, debugShapes(game.state));
    }
  },
});
