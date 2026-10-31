// 自動玩家：給平衡報告與通關測試用，不會打包進遊戲（沒有任何遊戲模組引用它）。
// 板子跟著最低的那顆球走；每次接到球就隨機換一個接球位置（像真人一樣，
// 避免球陷入固定的反彈循環）；能量滿就放技能。

import { FIELD, LOOP } from "../config.js";
import { createEventBus } from "../core/events.js";
import { DEG } from "../core/math.js";
import { PADDLES } from "../data/paddles.js";
import { createGame } from "../game/game.js";
import { baseScore } from "./target.js";

// 固定種子的亂數，讓結果每次都一樣
export function seededRng(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

export function autoPlay(level, { paddle = "standard", powerups = false, seed = 1, maxSeconds = 600 } = {}) {
  const rng = seededRng(seed);
  const events = createEventBus();
  const game = createGame({
    fieldHeight: FIELD.minHeight,
    paddleDef: PADDLES[paddle],
    events,
    level,
    rng: seededRng(seed * 7919),
    drops: powerups,
  });
  const { state } = game;
  const maxTicks = Math.round(maxSeconds / LOOP.step);
  const reach = PADDLES[paddle].width * 0.4;
  let offset = 0;
  let aim = 0;
  events.on("paddleHit", () => {
    offset = (rng() * 2 - 1) * reach;
  });

  let t = 0;
  for (; t < maxTicks && state.status === "playing"; t++) {
    const ball = state.balls.reduce((low, b) => (b.y > low.y ? b : low));
    if (game.isHolding()) aim = (rng() * 2 - 1) * 50 * DEG;
    game.step(LOOP.step, {
      paddleTargetX: ball.x + offset,
      aimAngle: aim,
      launch: game.isHolding(),
      skill: state.energy >= 1,
    });
  }

  return {
    cleared: state.status === "cleared",
    seconds: t * LOOP.step,
    score: state.score,
    base: baseScore(state.bricks),
    target: state.targetScore,
    livesLost: state.livesLost,
  };
}
