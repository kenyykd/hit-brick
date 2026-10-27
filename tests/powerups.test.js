import { describe, expect, it } from "vitest";
import { BALL, FIELD, GAME, LOOP, POWERUP } from "../src/config.js";
import { createEventBus } from "../src/core/events.js";
import { PADDLES } from "../src/data/paddles.js";
import { POWERUPS } from "../src/data/powerups.js";
import { createGame } from "../src/game/game.js";
import { createCapsule, createDropper, pickWeighted, updateCapsules } from "../src/game/powerups.js";
import { LEVELS, SANDBOX_LEVEL } from "../src/levels/levels.js";
import { powerupChips } from "../src/ui/hud.js";

function setup(options = {}) {
  const events = createEventBus();
  const log = [];
  for (const type of ["capsuleSpawned", "powerupCollected", "powerupExpired", "ballCaught", "paddleHit", "brickDestroyed"]) {
    events.on(type, (payload) => log.push({ ...payload, event: type }));
  }
  const game = createGame({ fieldHeight: FIELD.minHeight, paddleDef: PADDLES.standard, events, level: LEVELS[0], drops: false, ...options });
  return { game, log, state: game.state };
}

const step = (game, input = {}) => game.step(LOOP.step, input);

// 讓球從指定位置以指定速度飛行
function fly(ball, { x, y, vx, vy }) {
  Object.assign(ball, { stuck: false, x, y, prevX: x, prevY: y, vx, vy });
}

describe("掉落", () => {
  it("依權重抽選，權重 0 的不會被抽到", () => {
    const entries = [
      { id: "a", weight: 1 },
      { id: "b", weight: 0 },
      { id: "c", weight: 3 },
    ];
    expect(pickWeighted(entries, () => 0)).toBe("a");
    expect(pickWeighted(entries, () => 0.24)).toBe("a");
    expect(pickWeighted(entries, () => 0.26)).toBe("c");
    expect(pickWeighted(entries, () => 0.999)).toBe("c");
    expect(pickWeighted([{ id: "x", weight: 0 }], () => 0.5)).toBeNull();
  });

  it("約 12% 機率掉落", () => {
    const hit = createDropper({ rng: () => 0.1, rate: 0.12, pity: 12, powerups: POWERUPS });
    expect(hit.roll()).not.toBeNull();
    const miss = createDropper({ rng: () => 0.5, rate: 0.12, pity: 12, powerups: POWERUPS });
    expect(miss.roll()).toBeNull();
  });

  it("連續打破多塊磚都沒掉時，保底必掉", () => {
    const dropper = createDropper({ rng: () => 0.99, rate: 0.12, pity: 12, powerups: POWERUPS });
    const results = Array.from({ length: 24 }, () => dropper.roll());
    expect(results.slice(0, 11).every((r) => r === null)).toBe(true);
    expect(results[11]).not.toBeNull();
    expect(results.slice(12, 23).every((r) => r === null)).toBe(true);
    expect(results[23]).not.toBeNull();
  });

  it("場上膠囊已滿時不掉，但保底計數照加", () => {
    const dropper = createDropper({ rng: () => 0.99, rate: 0.12, pity: 3, powerups: POWERUPS });
    expect(dropper.roll({ blocked: true })).toBeNull();
    expect(dropper.roll({ blocked: true })).toBeNull();
    expect(dropper.roll()).not.toBeNull();
  });

  it("生命已滿時不會抽到加一命", () => {
    const dropper = createDropper({ rng: () => 0.999, rate: 1, pity: 12, powerups: POWERUPS });
    expect(dropper.roll()).toBe("extraLife"); // 加一命排在最後
    expect(dropper.roll({ excluded: ["extraLife"] })).not.toBe("extraLife");
  });

  it("打破磚會依掉落判定產生膠囊", () => {
    const { game, state, log } = setup({ drops: true, rng: () => 0 });
    // 最下面一列的磚，球放在它正下方才不會同時壓到別的磚
    const bottom = Math.max(...state.bricks.map((b) => b.row));
    const brick = state.bricks.find((b) => b.row === bottom);
    fly(state.balls[0], { x: brick.x + brick.w / 2, y: brick.y + brick.h + BALL.radius - 1, vx: 0, vy: -600 });
    step(game);
    expect(brick.alive).toBe(false);
    expect(state.capsules).toHaveLength(1);
    expect(log.some((e) => e.event === "capsuleSpawned")).toBe(true);
  });
});

describe("膠囊", () => {
  it("碰到板子算接到，掉出底部消失", () => {
    const size = { w: 40, h: 20 };
    const paddle = { x: 100, y: 500, w: 100, h: 16 };
    const onPaddle = createCapsule("slow", 150, 490, size);
    const missed = createCapsule("slow", 400, 990, size);
    const falling = createCapsule("slow", 150, 100, size);
    const result = updateCapsules([onPaddle, missed, falling], 0.1, 220, paddle, 1000);
    expect(result.caught).toEqual([onPaddle]);
    expect(result.missed).toEqual([missed]);
    expect(result.remaining).toEqual([falling]);
    expect(falling.y).toBeGreaterThan(falling.prevY);
  });

  it("板子接到膠囊後道具生效", () => {
    const { game, state, log } = setup();
    const { paddle } = state;
    state.capsules.push(createCapsule("expand", paddle.x + paddle.width / 2, paddle.y - 5, POWERUP.capsuleSize));
    step(game);
    expect(state.capsules).toHaveLength(0);
    expect(state.effects.expand).toBeGreaterThan(0);
    expect(log.some((e) => e.event === "powerupCollected")).toBe(true);
  });
});

describe("計時道具", () => {
  it("同種道具重複接到只刷新時間", () => {
    const { game, state, log } = setup();
    game.grantPowerup("expand");
    const width = state.paddle.width;
    for (let i = 0; i < 120; i++) step(game);
    expect(state.effects.expand).toBeCloseTo(POWERUPS.expand.duration - 1, 5);
    game.grantPowerup("expand");
    expect(state.effects.expand).toBe(POWERUPS.expand.duration);
    expect(state.paddle.width).toBe(width);
    expect(log.filter((e) => e.event === "powerupCollected").map((e) => e.refreshed)).toEqual([false, true]);
  });

  it("倒數只隨遊戲時間前進（暫停時不呼叫 step，倒數就不動）", () => {
    const { game, state } = setup();
    game.grantPowerup("magnet");
    const before = state.effects.magnet;
    step(game);
    expect(state.effects.magnet).toBeCloseTo(before - LOOP.step, 9);
  });

  it("時間到自動結束：加長板還原寬度、不出界", () => {
    const { game, state, log } = setup();
    game.grantPowerup("expand");
    expect(state.paddle.width).toBeCloseTo(PADDLES.standard.width * POWERUP.expandFactor);
    for (let i = 0; i < 200; i++) step(game, { paddleTargetX: 5000 });
    expect(state.paddle.x + state.paddle.width).toBeCloseTo(FIELD.width);
    const ticks = Math.ceil(POWERUPS.expand.duration / LOOP.step) + 1;
    for (let i = 0; i < ticks; i++) step(game, { paddleTargetX: 5000 });
    expect(state.effects.expand).toBeUndefined();
    expect(state.paddle.width).toBe(PADDLES.standard.width);
    expect(state.paddle.x + state.paddle.width).toBeLessThanOrEqual(FIELD.width);
    expect(log.some((e) => e.event === "powerupExpired")).toBe(true);
  });

  it("減速球讓移動中的球變慢，結束後回到關卡球速", () => {
    const { game, state } = setup();
    const ball = state.balls[0];
    fly(ball, { x: 270, y: 600, vx: 0, vy: -state.ballSpeed });
    game.grantPowerup("slow");
    expect(Math.hypot(ball.vx, ball.vy)).toBeCloseTo(state.ballSpeed * POWERUP.slowFactor);
    state.effects.slow = LOOP.step / 2;
    step(game);
    expect(state.effects.slow).toBeUndefined();
    expect(Math.hypot(ball.vx, ball.vy)).toBeCloseTo(state.ballSpeed);
  });
});

describe("火球", () => {
  function sandbox() {
    return setup({ level: SANDBOX_LEVEL });
  }

  it("打穿多次擊破磚，一次就破、不反彈", () => {
    const { game, state } = sandbox();
    game.grantPowerup("fireball");
    const brick = state.bricks.find((b) => b.type === "tough" && b.hp === 2);
    const ball = state.balls[0];
    fly(ball, { x: brick.x + brick.w / 2, y: brick.y + brick.h + BALL.radius - 1, vx: 0, vy: -600 });
    step(game);
    expect(brick.alive).toBe(false);
    expect(ball.vy).toBeLessThan(0);
  });

  it("遇到不可破壞磚仍然反彈", () => {
    const { game, state } = sandbox();
    game.grantPowerup("fireball");
    const steel = state.bricks.find((b) => b.type === "steel");
    const ball = state.balls[0];
    fly(ball, { x: steel.x + steel.w / 2, y: steel.y + steel.h + BALL.radius - 1, vx: 0, vy: -600 });
    step(game);
    expect(steel.alive).toBe(true);
    expect(ball.vy).toBeGreaterThan(0);
  });

  it("爆炸磚照常爆炸連鎖", () => {
    const { game, state, log } = sandbox();
    game.grantPowerup("fireball");
    const bomb = state.bricks.find((b) => b.type === "explosive" && b.row === 4);
    const ball = state.balls[0];
    fly(ball, { x: bomb.x + bomb.w / 2, y: bomb.y + bomb.h + BALL.radius - 1, vx: 0, vy: -600 });
    step(game);
    expect(bomb.alive).toBe(false);
    expect(log.filter((e) => e.event === "brickDestroyed" && e.chain).length).toBeGreaterThan(0);
  });
});

describe("多球與磁鐵", () => {
  it("每顆移動中的球分出兩顆，總數上限 8", () => {
    const { game, state } = setup();
    fly(state.balls[0], { x: 270, y: 600, vx: 200, vy: -500 });
    game.grantPowerup("multiball");
    expect(state.balls).toHaveLength(3);
    expect(state.balls.every((b) => !b.stuck)).toBe(true);
    game.grantPowerup("multiball");
    game.grantPowerup("multiball");
    expect(state.balls).toHaveLength(POWERUP.maxBalls);
    expect(new Set(state.balls.map((b) => b.id)).size).toBe(POWERUP.maxBalls);
  });

  it("多球加磁鐵：所有球碰板都黏住，發射時一起放出", () => {
    const { game, state, log } = setup();
    const { paddle } = state;
    fly(state.balls[0], { x: 270, y: 500, vx: 0, vy: -500 });
    game.grantPowerup("multiball");
    game.grantPowerup("magnet");
    // 三顆球都放到板子正上方往下掉
    state.balls.forEach((b, i) => fly(b, { x: paddle.x + 20 + i * 25, y: paddle.y - BALL.radius - 2, vx: 0, vy: 400 }));
    step(game, { paddleTargetX: paddle.x + paddle.width / 2 });
    expect(state.balls).toHaveLength(3);
    expect(state.balls.every((b) => b.stuck)).toBe(true);
    expect(log.filter((e) => e.event === "ballCaught")).toHaveLength(3);
    expect(game.isHolding()).toBe(true);

    step(game, { launch: true, aimAngle: 0, paddleTargetX: paddle.x + paddle.width / 2 });
    expect(state.balls.every((b) => !b.stuck && b.vy < 0)).toBe(true);
  });

  it("全部的球都黏在板上時接到多球，新球也黏在板上", () => {
    const { game, state } = setup();
    game.grantPowerup("multiball");
    expect(state.balls).toHaveLength(3);
    expect(state.balls.every((b) => b.stuck)).toBe(true);
    step(game, { launch: true, aimAngle: 0 });
    expect(state.balls.every((b) => !b.stuck)).toBe(true);
  });

  it("磁鐵結束後，已黏住的球等玩家發射", () => {
    const { game, state } = setup();
    game.grantPowerup("magnet");
    state.effects.magnet = LOOP.step / 2;
    step(game);
    expect(state.effects.magnet).toBeUndefined();
    expect(state.balls[0].stuck).toBe(true);
  });
});

describe("加一命", () => {
  it("生命加一，上限 5 條", () => {
    const { game, state } = setup();
    game.grantPowerup("extraLife");
    expect(state.lives).toBe(GAME.startLives + 1);
    for (let i = 0; i < 5; i++) game.grantPowerup("extraLife");
    expect(state.lives).toBe(GAME.maxLives);
  });
});

describe("清除", () => {
  it("失去生命時清除所有道具效果與掉落中的膠囊", () => {
    const { game, state } = setup();
    game.grantPowerup("expand");
    game.grantPowerup("slow");
    state.capsules.push(createCapsule("fireball", 270, 300, POWERUP.capsuleSize));
    fly(state.balls[0], { x: 270, y: state.field.height + 50, vx: 0, vy: 100 });
    step(game);
    expect(state.lives).toBe(GAME.startLives - 1);
    expect(state.effects).toEqual({});
    expect(state.capsules).toEqual([]);
    expect(state.paddle.width).toBe(PADDLES.standard.width);
  });

  it("過關時清除所有道具效果與膠囊", () => {
    const { game, state } = setup();
    game.grantPowerup("magnet");
    state.capsules.push(createCapsule("slow", 270, 300, POWERUP.capsuleSize));
    for (const brick of state.bricks) brick.alive = false;
    step(game);
    expect(state.status).toBe("cleared");
    expect(state.effects).toEqual({});
    expect(state.capsules).toEqual([]);
  });
});

describe("HUD", () => {
  it("顯示啟用中的道具與剩餘秒數（無條件進位）", () => {
    expect(powerupChips({ slow: 4.2 }).map((c) => c.text)).toEqual(["◔ 減速 5s"]);
  });
});
