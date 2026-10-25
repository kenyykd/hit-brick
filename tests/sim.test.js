// 無畫面模擬：以最高球速連續玩 10 分鐘，檢查球不穿磚、不卡磚、不出界、不會水平無限彈。

import { describe, expect, it } from "vitest";
import { BALL, FIELD, LOOP } from "../src/config.js";
import { createEventBus } from "../src/core/events.js";
import { DEG } from "../src/core/math.js";
import { PADDLES } from "../src/data/paddles.js";
import { createBrickGrid } from "../src/game/bricks.js";
import { createGame } from "../src/game/game.js";
import { circleRectContact } from "../src/physics/collision.js";

describe("10 分鐘最高球速模擬", () => {
  it("球不穿磚、不卡磚、不出界，角度與速度都正確", () => {
    const events = createEventBus();
    let destroyed = 0;
    let lost = 0;
    events.on("brickDestroyed", () => destroyed++);
    events.on("ballLost", () => lost++);

    const game = createGame({
      fieldHeight: FIELD.minHeight,
      paddleDef: PADDLES.standard,
      events,
      ballSpeed: BALL.maxSpeed,
    });
    const { state } = game;
    const ticks = 10 * 60 * 120;
    const minVy = Math.sin(BALL.minVerticalAngleDeg * DEG) * BALL.maxSpeed - 1e-6;
    let refills = 0;
    let failure = null;

    for (let t = 0; t < ticks && !failure; t++) {
      const ball = state.balls[0];
      // 自動板子：跟著球走，加一點偏移讓反彈角度有變化
      const offset = Math.sin(t / 97) * 40;
      const holding = game.isHolding();
      game.step(LOOP.step, {
        paddleTargetX: ball.x + offset,
        aimAngle: Math.sin(t) * 60 * DEG,
        launch: holding,
      });

      if (state.status === "cleared") {
        // 等球離開磚區再補磚，避免新磚直接生在球上
        state.status = "playing";
        const gridBottom = Math.max(...createBrickGrid(state.field.width).map((b) => b.y + b.h));
        if (state.balls.every((b) => b.y - b.r > gridBottom)) {
          state.bricks = createBrickGrid(state.field.width);
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

    expect(failure).toBeNull();
    expect(lost).toBe(0);
    expect(refills).toBeGreaterThan(5);
    expect(destroyed).toBeGreaterThan(45);
  });
});
