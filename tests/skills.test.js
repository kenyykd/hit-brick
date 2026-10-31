import { describe, expect, it } from "vitest";
import { FIELD, LOOP, SKILL } from "../src/config.js";
import { createEventBus } from "../src/core/events.js";
import { PADDLES } from "../src/data/paddles.js";
import { SKILLS } from "../src/data/skills.js";
import { createGame } from "../src/game/game.js";
import { addTimeEnergy, findBoltHit } from "../src/game/skills.js";
import { defaultSave } from "../src/save/save.js";
import { isPaddleUnlocked, starsNeededForPaddle, totalStars } from "../src/save/progress.js";
import { skillButtonView } from "../src/ui/hud.js";

const level = (layout) => ({ id: 1, name: "測試", theme: "rainbow", ballSpeed: 600, targetScore: 0, layout });

function setup(paddleId, layout = "NNNNNNNNN\nNNNNNNNNN\nNNNNNNNNN") {
  const events = createEventBus();
  const log = [];
  for (const type of ["skillReady", "skillCast", "skillEnded", "shieldHit", "laserFired", "ballLost", "lifeLost", "brickDestroyed"]) {
    events.on(type, (payload) => log.push({ ...payload, event: type }));
  }
  const game = createGame({ fieldHeight: FIELD.minHeight, paddleDef: PADDLES[paddleId], events, level: level(layout), drops: false });
  return { game, state: game.state, log, count: (type) => log.filter((e) => e.event === type).length };
}

const step = (game, input = {}) => game.step(LOOP.step, input);

function fly(ball, { x, y, vx, vy }) {
  Object.assign(ball, { stuck: false, x, y, prevX: x, prevY: y, vx, vy });
}

// 讓球從下方打中指定的磚
function hit(game, brick) {
  fly(game.state.balls[0], { x: brick.x + brick.w / 2, y: brick.y + brick.h + 7, vx: 0, vy: -600 });
  step(game);
}

describe("技能能量", () => {
  it("約打 15 塊磚集滿，集滿時發出 skillReady", () => {
    const { game, state, count } = setup("shield");
    const bricks = state.bricks.filter((b) => b.row === 2);
    const more = state.bricks.filter((b) => b.row === 1);
    for (const b of [...bricks, ...more].slice(0, 14)) hit(game, b);
    expect(state.energy).toBeLessThan(1);
    hit(game, more[5]);
    expect(state.energy).toBe(1);
    expect(count("skillReady")).toBe(1);
  });

  it("時間充能最多只到 30%，不打磚不能一直放技能", () => {
    const { game, state } = setup("shield");
    // 讓球在空中一直上下飛（不碰磚）：直接重複把球放回中間
    for (let i = 0; i < 120 * 120; i++) {
      fly(state.balls[0], { x: 270, y: 600, vx: 0, vy: -100 });
      step(game);
    }
    expect(state.energy).toBeCloseTo(SKILL.timeCap);
    expect(game.castSkill()).toBe(false);
  });

  it("發射前（球還在板上）不會隨時間充能", () => {
    const { game, state } = setup("shield");
    for (let i = 0; i < 600; i++) step(game);
    expect(state.energy).toBe(0);
  });

  it("失去生命保留能量，重玩或換關歸零", () => {
    const { game, state } = setup("shield");
    game.addEnergy(0.5);
    fly(state.balls[0], { x: 270, y: state.field.height + 50, vx: 0, vy: 100 });
    step(game);
    expect(state.lives).toBe(2);
    expect(state.energy).toBeCloseTo(0.5);
    game.reset();
    expect(state.energy).toBe(0);
  });

  it("標準板沒有技能，能量不會增加、按技能也沒反應", () => {
    const { game, state, count } = setup("standard");
    game.addEnergy(1);
    expect(state.energy).toBe(0);
    step(game, { skill: true });
    expect(count("skillCast")).toBe(0);
  });
});

describe("施放", () => {
  it("能量沒滿不能放；滿了放完能量歸零", () => {
    const { game, state, count } = setup("shield");
    game.addEnergy(0.9);
    step(game, { skill: true });
    expect(count("skillCast")).toBe(0);
    game.addEnergy(0.1);
    step(game, { skill: true });
    expect(count("skillCast")).toBe(1);
    expect(state.energy).toBe(0);
    expect(state.shield).toBe(true);
  });

  it("上一次的技能還在時不能再放", () => {
    const { game, state, count } = setup("shield");
    game.addEnergy(1);
    game.castSkill();
    game.addEnergy(1);
    expect(game.castSkill()).toBe(false);
    expect(state.energy).toBe(1);
    expect(count("skillCast")).toBe(1);
  });
});

describe("護盾", () => {
  it("接住第一顆掉落的球後消失，下一顆就會掉", () => {
    const { game, state, count } = setup("shield");
    game.addEnergy(1);
    game.castSkill();
    // 球從板子旁邊漏接
    fly(state.balls[0], { x: 20, y: state.paddle.y + 40, vx: 0, vy: 600 });
    for (let i = 0; i < 30; i++) step(game);
    expect(count("shieldHit")).toBe(1);
    expect(state.shield).toBe(false);
    expect(state.balls[0].vy).toBeLessThan(0);
    expect(count("ballLost")).toBe(0);

    fly(state.balls[0], { x: 20, y: state.paddle.y + 40, vx: 0, vy: 600 });
    for (let i = 0; i < 60; i++) step(game);
    expect(count("ballLost")).toBe(1);
  });

  it("多球時只擋一顆", () => {
    const { game, state, count } = setup("shield");
    game.addEnergy(1);
    game.castSkill();
    const y = state.paddle.y + 40;
    fly(state.balls[0], { x: 20, y, vx: 0, vy: 600 });
    state.balls.push({ ...state.balls[0], id: 999, x: 520, prevX: 520 });
    for (let i = 0; i < 60; i++) step(game);
    expect(count("shieldHit")).toBe(1);
    expect(count("ballLost")).toBe(1);
    expect(state.lives).toBe(3); // 還有一顆球在場上
  });

  it("失去生命時護盾消失", () => {
    const { game, state } = setup("shield");
    game.addEnergy(1);
    game.castSkill();
    // 直接把球放到護盾下方，模擬穿過
    fly(state.balls[0], { x: 20, y: state.field.height + 50, vx: 0, vy: 100 });
    step(game);
    expect(state.lives).toBe(2);
    expect(state.shield).toBe(false);
  });
});

describe("雷射", () => {
  it("4 秒內每 0.25 秒從兩端各發射一發，結束時發出 skillEnded", () => {
    const { game, count } = setup("laser");
    game.addEnergy(1);
    game.castSkill();
    for (let i = 0; i < 6 * 120; i++) step(game);
    const shots = SKILLS.laser.duration / SKILLS.laser.interval;
    expect(count("laserFired")).toBe(shots);
    expect(count("skillEnded")).toBe(1);
  });

  it("打到第一塊磚就消失；不可破壞磚擋住雷射", () => {
    // 第 0 欄：最上面普通磚、下面不可破壞磚；第 8 欄：兩塊普通磚
    const { game, state } = setup("laser", "N.......N\n#.......N\n.........");
    const paddle = state.paddle;
    paddle.x = paddle.prevX = 0; // 左端雷射對準第 0 欄
    game.addEnergy(1);
    game.castSkill();
    for (let i = 0; i < 30; i++) step(game, { paddleTargetX: paddle.width / 2 });
    const at = (row, col) => state.bricks.find((b) => b.row === row && b.col === col);
    expect(at(0, 0).alive).toBe(true); // 被不可破壞磚擋住
    expect(at(1, 0).alive).toBe(true);
  });

  it("多次擊破磚每發只扣 1 下", () => {
    const { game, state } = setup("laser", "3NNNNNNNN");
    const tough = state.bricks[0];
    state.bolts.push({ x: tough.x + 10, y: tough.y + tough.h + 2, prevY: 0, w: 4, h: 16 });
    step(game);
    expect(tough.hp).toBe(2);
    expect(tough.alive).toBe(true);
    expect(state.bolts).toHaveLength(0);
  });

  it("雷射打掉的磚不給能量", () => {
    const { game, state } = setup("laser");
    const brick = state.bricks.find((b) => b.row === 2);
    state.bolts.push({ x: brick.x + 10, y: brick.y + brick.h + 2, prevY: 0, w: 4, h: 16 });
    step(game);
    expect(brick.alive).toBe(false);
    expect(state.energy).toBe(0);
  });

  it("板子加長時雷射從新的兩端發射", () => {
    const { game, state } = setup("laser");
    game.grantPowerup("expand");
    game.addEnergy(1);
    game.castSkill();
    step(game);
    const xs = state.bolts.map((b) => b.x + b.w / 2).sort((a, b) => a - b);
    const { paddle } = state;
    expect(xs[0]).toBeCloseTo(paddle.x + SKILLS.laser.inset);
    expect(xs[1]).toBeCloseTo(paddle.x + paddle.width - SKILLS.laser.inset);
  });

  it("findBoltHit 選最下面的磚", () => {
    const bolt = { x: 10, y: 0, w: 4, h: 100 };
    const top = { x: 0, y: 0, w: 50, h: 30, alive: true };
    const bottom = { x: 0, y: 40, w: 50, h: 30, alive: true };
    expect(findBoltHit(bolt, [top, bottom])).toBe(bottom);
    expect(findBoltHit(bolt, [{ ...bottom, alive: false }])).toBeNull();
  });

  it("addTimeEnergy 不超過上限、超過上限時不再增加", () => {
    expect(addTimeEnergy(0.29, 0.05, 0.3)).toBeCloseTo(0.3);
    expect(addTimeEnergy(0.6, 0.05, 0.3)).toBe(0.6);
  });
});

describe("技能按鈕顯示", () => {
  it("沒有技能時隱藏；能量顯示百分比，滿了顯示技能名稱並發光", () => {
    expect(skillButtonView(null, 1)).toBeNull();
    expect(skillButtonView(SKILLS.laser, 0.426)).toMatchObject({ label: "42%", fill: 42, ready: false });
    expect(skillButtonView(SKILLS.laser, 1)).toMatchObject({ label: "雷射", fill: 100, ready: true });
  });
});

describe("板子解鎖", () => {
  it("依累積星星解鎖：護盾 10 顆、雷射 25 顆", () => {
    const save = defaultSave();
    expect(isPaddleUnlocked(save, "standard")).toBe(true);
    expect(starsNeededForPaddle(save, "shield")).toBe(10);
    for (let id = 1; id <= 4; id++) save.levels[id] = { bestScore: 0, cleared: true, stars: 3 };
    expect(totalStars(save)).toBe(12);
    expect(isPaddleUnlocked(save, "shield")).toBe(true);
    expect(starsNeededForPaddle(save, "laser")).toBe(13);
    expect(isPaddleUnlocked(save, "不存在")).toBe(false);
  });
});
