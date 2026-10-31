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

// 固定種子的亂數，讓開啟道具的模擬每次都一樣
function seededRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

// 開啟道具時：多球會掉球、火球不反彈、減速改變球速，所以只檢查不出界、不卡磚，
// 生命用完就補回來，速度改對照 currentSpeed()
// paddle：用哪塊板子；有技能的板子能量一滿就施放
function simulate(level, { powerups = false, paddle = "standard" } = {}) {
  const events = createEventBus();
  let lost = 0;
  let collected = 0;
  let casts = 0;
  events.on("lifeLost", () => lost++);
  events.on("powerupCollected", () => collected++);
  events.on("skillCast", () => casts++);

  const game = createGame({
    fieldHeight: FIELD.minHeight,
    paddleDef: PADDLES[paddle],
    events,
    level,
    ballSpeed: BALL.maxSpeed,
    drops: powerups,
    rng: seededRng(level.name.length * 7919),
  });
  const { state } = game;
  const parsed = parseLevel(level);
  const freshBricks = () => buildBricks(parsed, state.field.width, BRICK_LAYOUT);
  const gridBottom = Math.max(...freshBricks().map((b) => b.y + b.h));
  const ticks = 10 * 60 * 120;
  let refills = 0;
  let failure = null;

  for (let t = 0; t < ticks && !failure; t++) {
    // 自動板子：跟著最低的球走，加一點偏移讓反彈角度有變化
    const ball = state.balls.reduce((low, b) => (b.y > low.y ? b : low));
    const offset = Math.sin(t / 97) * 40;
    game.step(LOOP.step, {
      paddleTargetX: ball.x + offset,
      aimAngle: Math.sin(t) * 60 * DEG,
      launch: game.isHolding(),
      skill: state.energy >= 1,
    });
    if (powerups) state.lives = 3;

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

    const speed = game.currentSpeed();
    const minVy = Math.sin(BALL.minVerticalAngleDeg * DEG) * speed - 1e-6;
    for (const b of state.balls) {
      if (b.stuck) continue;
      if (b.x < b.r - 1e-6 || b.x > state.field.width - b.r + 1e-6 || b.y < b.r - 1e-6) {
        failure = `第 ${t} 個 tick 球出界 (${b.x}, ${b.y})`;
      }
      if (Math.abs(Math.hypot(b.vx, b.vy) - speed) > 1e-6) {
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
  return { failure, lost, refills, collected, casts };
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

describe("護盾板與雷射板的 10 分鐘最高球速模擬（能量滿就放技能）", () => {
  for (const paddle of ["shield", "laser"]) {
    for (const level of [LEVELS[4], SANDBOX_LEVEL]) {
      it(`${PADDLES[paddle].name}・第 ${level.id} 關（${level.name}）：能反覆清關，球不穿磚、不卡磚、不出界`, () => {
        const result = simulate(level, { paddle });
        expect(result.failure).toBeNull();
        expect(result.lost).toBe(0);
        expect(result.refills).toBeGreaterThan(3);
        expect(result.casts).toBeGreaterThan(5);
      });
      it(`${PADDLES[paddle].name}・第 ${level.id} 關（${level.name}）：技能與道具同時作用時不出錯`, () => {
        const result = simulate(level, { paddle, powerups: true });
        expect(result.failure).toBeNull();
        expect(result.casts).toBeGreaterThan(5);
      });
    }
  }
});

describe("開啟道具的 10 分鐘最高球速模擬", () => {
  for (const level of [LEVELS[4], SANDBOX_LEVEL]) {
    it(`第 ${level.id} 關（${level.name}）：多球、火球、磁鐵等道具下球不穿磚、不卡磚、不出界`, () => {
      const result = simulate(level, { powerups: true });
      expect(result.failure).toBeNull();
      expect(result.collected).toBeGreaterThan(10);
    });
  }
});
