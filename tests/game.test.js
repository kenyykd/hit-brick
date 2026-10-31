import { describe, expect, it } from "vitest";
import { FIELD, LOOP } from "../src/config.js";
import { createEventBus } from "../src/core/events.js";
import { DEG } from "../src/core/math.js";
import { PADDLES } from "../src/data/paddles.js";
import { createGame } from "../src/game/game.js";
import { LEVELS } from "../src/levels/levels.js";

function setup(options = {}) {
  const events = createEventBus();
  const log = [];
  for (const type of ["ballLaunched", "paddleHit", "ballLost", "lifeLost", "gameOver", "levelCleared", "brickDestroyed"]) {
    events.on(type, (payload) => log.push({ type, ...payload }));
  }
  const game = createGame({ fieldHeight: FIELD.minHeight, paddleDef: PADDLES.standard, events, level: LEVELS[0], ...options });
  return { game, log, state: game.state };
}

const step = (game, input = {}) => game.step(LOOP.step, input);

describe("板子", () => {
  it("不會被拉出畫面", () => {
    const { game, state } = setup();
    for (let i = 0; i < 200; i++) step(game, { paddleTargetX: -1000 });
    expect(state.paddle.x).toBe(0);
    for (let i = 0; i < 200; i++) step(game, { paddleTargetX: 5000 });
    expect(state.paddle.x).toBe(FIELD.width - state.paddle.width);
  });

  it("一個 tick 內高速掃過下落中的球時，球被接住而不是穿過去", () => {
    // 板子速度不設上限，一個 tick 從最左邊瞬移到右邊；只看 tick 結束位置的話會漏接
    const fastPaddle = { ...PADDLES.standard, maxSpeed: 1e6 };
    const { game, state, log } = setup({ paddleDef: fastPaddle });
    const { paddle } = state;
    const ball = state.balls[0];
    ball.stuck = false;
    ball.x = 300;
    ball.y = paddle.y - ball.r + 1;
    ball.vx = 0;
    ball.vy = 720;
    paddle.x = paddle.prevX = 0;
    step(game, { paddleTargetX: 500 });
    expect(log.some((e) => e.type === "paddleHit")).toBe(true);
    expect(state.balls[0].vy).toBeLessThan(0);
    expect(log.some((e) => e.type === "ballLost")).toBe(false);
  });
});

describe("發射", () => {
  it("任何瞄準角度都往上發射", () => {
    for (const deg of [-200, -89, -70, 0, 45, 70, 89, 180]) {
      const { game, state } = setup();
      step(game, { launch: true, aimAngle: Math.max(-70, Math.min(70, deg)) * DEG });
      expect(state.balls[0].stuck).toBe(false);
      expect(state.balls[0].vy).toBeLessThan(0);
    }
  });

  it("沒持球時按發射鍵改成施放技能", () => {
    const events = createEventBus();
    let skill = 0;
    events.on("skillCast", () => skill++);
    const game = createGame({ fieldHeight: FIELD.minHeight, paddleDef: PADDLES.shield, events, level: LEVELS[0] });
    game.addEnergy(1);
    step(game, { launch: true, aimAngle: 0 });
    expect(skill).toBe(0); // 持球時是發射
    step(game, { skill: true });
    expect(skill).toBe(1);
  });
});

describe("生命與過關", () => {
  it("球掉出底部扣一條命，並在板上重生一顆球", () => {
    const { game, state, log } = setup();
    const ball = state.balls[0];
    ball.stuck = false;
    ball.y = state.field.height + 50;
    ball.vy = 100;
    step(game);
    expect(state.lives).toBe(2);
    expect(state.balls).toHaveLength(1);
    expect(state.balls[0].stuck).toBe(true);
    expect(log.map((e) => e.type)).toContain("lifeLost");
  });

  it("多顆球時要全部掉落才扣命", () => {
    const { game, state } = setup();
    const ball = state.balls[0];
    ball.stuck = false;
    ball.y = state.field.height + 50;
    ball.vy = 100;
    state.balls.push({ ...ball, id: 999, y: 400, vy: -300, prevY: 400 });
    step(game);
    expect(state.lives).toBe(3);
    expect(state.balls).toHaveLength(1);
  });

  it("生命歸零觸發 gameOver 並停止更新", () => {
    const { game, state, log } = setup();
    state.lives = 1;
    const ball = state.balls[0];
    ball.stuck = false;
    ball.y = state.field.height + 50;
    step(game);
    expect(state.status).toBe("over");
    expect(log.map((e) => e.type)).toContain("gameOver");
  });

  it("可破壞的磚都打完就過關，不可破壞磚不影響", () => {
    const { game, state, log } = setup();
    for (const brick of state.bricks) brick.alive = false;
    state.bricks[0].alive = true;
    state.bricks[0].breakable = false;
    step(game);
    expect(state.status).toBe("cleared");
    expect(log.map((e) => e.type)).toContain("levelCleared");
  });

  it("reset 後回到初始狀態", () => {
    const { game, state } = setup();
    state.score = 500;
    state.lives = 1;
    state.status = "over";
    game.reset();
    expect(state.score).toBe(0);
    expect(state.lives).toBe(3);
    expect(state.status).toBe("playing");
    expect(state.bricks.every((b) => b.alive)).toBe(true);
  });
});
