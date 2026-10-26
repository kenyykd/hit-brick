import { describe, expect, it } from "vitest";
import { FIELD, LOOP } from "../src/config.js";
import { createEventBus } from "../src/core/events.js";
import { PADDLES } from "../src/data/paddles.js";
import { createGame } from "../src/game/game.js";
import { comboMultiplier } from "../src/game/scoring.js";

describe("comboMultiplier（每 5 連擊 +1 倍，上限 4 倍）", () => {
  it("倍率門檻", () => {
    expect([0, 1, 4].map(comboMultiplier)).toEqual([1, 1, 1]);
    expect([5, 9].map(comboMultiplier)).toEqual([2, 2]);
    expect([10, 14].map(comboMultiplier)).toEqual([3, 3]);
    expect([15, 30, 999].map(comboMultiplier)).toEqual([4, 4, 4]);
  });
});

function setup(layout = "NNNNNNNNN\nNNNNNNNNN") {
  const events = createEventBus();
  const level = { id: 1, name: "測試", theme: "rainbow", ballSpeed: 600, targetScore: 0, layout };
  const game = createGame({ fieldHeight: FIELD.minHeight, paddleDef: PADDLES.standard, events, level });
  return { game, state: game.state, events };
}

// 讓球從下方打中指定的磚
function hit(game, brick) {
  const ball = game.state.balls[0];
  ball.stuck = false;
  ball.x = brick.x + brick.w / 2;
  ball.y = brick.y + brick.h + ball.r - 2;
  ball.vx = 0;
  ball.vy = -600;
  game.step(LOOP.step, {});
}

describe("遊戲中的連擊", () => {
  it("連續打破磚會累加連擊並套用倍率", () => {
    const { game, state } = setup();
    const row = state.bricks.filter((b) => b.row === 1);
    for (let i = 0; i < 6; i++) hit(game, row[i]);
    expect(state.combo).toBe(6);
    // 第 1～4 塊 1 倍、第 5～6 塊 2 倍
    expect(state.score).toBe(10 * 4 + 20 * 2);
  });

  it("球碰到板子時連擊歸零", () => {
    const { game, state } = setup();
    hit(game, state.bricks.find((b) => b.row === 1));
    expect(state.combo).toBe(1);
    const ball = state.balls[0];
    const { paddle } = state;
    ball.x = paddle.x + paddle.width / 2;
    ball.y = paddle.y - ball.r + 1;
    ball.vx = 0;
    ball.vy = 600;
    game.step(LOOP.step, {});
    expect(state.combo).toBe(0);
  });

  it("失去生命時連擊歸零，並記錄本關失去的生命數", () => {
    const { game, state } = setup();
    hit(game, state.bricks.find((b) => b.row === 1));
    const ball = state.balls[0];
    ball.y = state.field.height + 50;
    ball.vy = 100;
    game.step(LOOP.step, {});
    expect(state.combo).toBe(0);
    expect(state.livesLost).toBe(1);
    game.reset();
    expect(state.livesLost).toBe(0);
  });
});
