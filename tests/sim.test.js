// 無畫面模擬：以最高球速連續玩 10 分鐘，檢查球不穿磚、不卡磚、不出界、不會水平無限彈。
// 每一關（含四種磚都有的沙盒關）各跑一次。

import { describe, expect, it } from "vitest";
import { BALL, BRICK_LAYOUT, FIELD, LOOP } from "../src/config.js";
import { createEventBus } from "../src/core/events.js";
import { DEG } from "../src/core/math.js";
import { PADDLES } from "../src/data/paddles.js";
import { createGame } from "../src/game/game.js";
import { LEVELS, SANDBOX_LEVEL } from "../src/levels/levels.js";
import { buildBricks, parseLevel } from "../src/levels/parse.js";
import { circleRectContact } from "../src/physics/collision.js";

function simulate(level) {
  const events = createEventBus();
  let lost = 0;
  events.on("ballLost", () => lost++);

  const game = createGame({
    fieldHeight: FIELD.minHeight,
    paddleDef: PADDLES.standard,
    events,
    level,
    ballSpeed: BALL.maxSpeed,
  });
  const { state } = game;
  const parsed = parseLevel(level);
  const freshBricks = () => buildBricks(parsed, state.field.width, BRICK_LAYOUT);
  const gridBottom = Math.max(...freshBricks().map((b) => b.y + b.h));
  const ticks = 10 * 60 * 120;
  const minVy = Math.sin(BALL.minVerticalAngleDeg * DEG) * BALL.maxSpeed - 1e-6;
  let refills = 0;
  let failure = null;

  for (let t = 0; t < ticks && !failure; t++) {
    const ball = state.balls[0];
    // 自動板子：跟著球走，加一點偏移讓反彈角度有變化
    const offset = Math.sin(t / 97) * 40;
    game.step(LOOP.step, {
      paddleTargetX: ball.x + offset,
      aimAngle: Math.sin(t) * 60 * DEG,
      launch: game.isHolding(),
    });

    if (state.status === "cleared") {
      // 等球離開磚區再補磚，避免新磚直接生在球上
      state.status = "playing";
      if (state.balls.every((b) => b.y - b.r > gridBottom)) {
        game.setBricks(freshBricks());
        refills++;
      }
    }
    if (state.status === "over") {
      failure = `第 ${t} 個 tick 生命歸零`;
      break;
    }

    for (const b of state.balls) {
      if (b.stuck) continue;
      if (b.x < b.r - 1e-6 || b.x > state.field.width - b.r + 1e-6 || b.y < b.r - 1e-6) {
        failure = `第 ${t} 個 tick 球出界 (${b.x}, ${b.y})`;
      }
      if (Math.abs(Math.hypot(b.vx, b.vy) - BALL.maxSpeed) > 1e-6) {
        failure = `第 ${t} 個 tick 球速錯誤 ${Math.hypot(b.vx, b.vy)}`;
      }
      if (Math.abs(b.vy) < minVy) {
        failure = `第 ${t} 個 tick 球太水平 vy=${b.vy}`;
      }
      for (const brick of state.bricks) {
        if (!brick.alive) continue;
        const c = circleRectContact(b.x, b.y, b.r, brick);
        // 一個子步驟只處理最近的一塊，所以可能和旁邊的磚有很小的重疊，但圓心絕不能進到磚裡
        if (c && (c.distance === 0 || c.depth > b.r * BALL.maxSubstepRatio + 1e-6)) {
          failure = `第 ${t} 個 tick 球卡進磚裡 depth=${c.depth}`;
        }
      }
    }
  }
  return { failure, lost, refills };
}

describe("10 分鐘最高球速模擬", () => {
  for (const level of [...LEVELS, SANDBOX_LEVEL]) {
    it(`第 ${level.id} 關（${level.name}）：球不穿磚、不卡磚、不出界，角度與速度都正確`, () => {
      const result = simulate(level);
      expect(result.failure).toBeNull();
      expect(result.lost).toBe(0);
      expect(result.refills).toBeGreaterThan(3);
    });
  }
});
