import { describe, expect, it } from "vitest";
import { BRICK_LAYOUT, FIELD, LOOP } from "../src/config.js";
import { createEventBus } from "../src/core/events.js";
import { PADDLES } from "../src/data/paddles.js";
import { explode } from "../src/game/explosion.js";
import { createGame } from "../src/game/game.js";
import { buildBricks, parseLevel } from "../src/levels/parse.js";

const level = (layout) => ({ id: 99, name: "測試", theme: "rainbow", ballSpeed: 600, targetScore: 0, layout });

function bricksOf(layout) {
  const bricks = buildBricks(parseLevel(level(layout)), FIELD.width, BRICK_LAYOUT);
  const lookup = new Map(bricks.map((b) => [`${b.row},${b.col}`, b]));
  const at = (row, col) => lookup.get(`${row},${col}`);
  return { bricks, at };
}

describe("explode（十字 4 格）", () => {
  it("只炸上下左右，不炸斜角", () => {
    const { at } = bricksOf("NNN......\nN*N......\nNNN......");
    const origin = at(1, 1);
    origin.alive = false;
    const { destroyed } = explode(origin, at);
    expect(destroyed.map((d) => `${d.brick.row},${d.brick.col}`).sort()).toEqual(["0,1", "1,0", "1,2", "2,1"]);
    expect(at(0, 0).alive).toBe(true);
    expect(at(2, 2).alive).toBe(true);
  });

  it("多次擊破磚直接炸掉，不可破壞磚不受影響", () => {
    const { at } = bricksOf(".3.......\n#*#......");
    const origin = at(1, 1);
    origin.alive = false;
    const { destroyed } = explode(origin, at);
    expect(destroyed).toHaveLength(1);
    expect(at(0, 1).alive).toBe(false);
    expect(at(1, 0).alive).toBe(true);
    expect(at(1, 2).alive).toBe(true);
  });

  it("連鎖引爆並記錄層數，每塊磚只處理一次", () => {
    // 一圈爆炸磚：彼此互為鄰居，最容易重複觸發
    const { at } = bricksOf("**.......\n**.......");
    const origin = at(0, 0);
    origin.alive = false;
    const { destroyed, detonations } = explode(origin, at);
    const keys = destroyed.map((d) => `${d.brick.row},${d.brick.col}`);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys.sort()).toEqual(["0,1", "1,0", "1,1"]);
    expect(detonations).toHaveLength(4);
    expect(destroyed.find((d) => d.brick === at(1, 1)).depth).toBe(2);
  });
});

describe("遊戲中的爆炸連鎖", () => {
  it("球打到爆炸磚：連鎖計分遞增、每塊磚只觸發一次 brickDestroyed", () => {
    const events = createEventBus();
    const destroyedEvents = [];
    const explosions = [];
    events.on("brickDestroyed", (e) => destroyedEvents.push(e));
    events.on("explosion", (e) => explosions.push(e));
    const game = createGame({
      fieldHeight: FIELD.minHeight,
      paddleDef: PADDLES.standard,
      events,
      level: level("N**NN#NNN"),
    });
    const { state } = game;
    const target = state.bricks.find((b) => b.col === 1);
    const ball = state.balls[0];
    ball.stuck = false;
    ball.x = target.x + target.w / 2;
    ball.y = target.y + target.h + ball.r - 2;
    ball.vx = 0;
    ball.vy = -600;
    game.step(LOOP.step, {});

    // (0,1) 被球打破 → 炸 (0,0)、(0,2) → (0,2) 再炸 (0,3)；(0,4) 不在範圍內
    const cols = destroyedEvents.map((e) => e.brick.col);
    expect(cols.sort()).toEqual([0, 1, 2, 3]);
    expect(new Set(cols).size).toBe(cols.length);
    expect(explosions).toHaveLength(2);
    expect(state.score).toBe(15 + (10 + 5) + (15 + 5) + (10 + 10));
    expect(state.bricks.find((b) => b.col === 4).alive).toBe(true);
    expect(state.bricks.find((b) => b.col === 5).alive).toBe(true); // 不可破壞
  });

  it("多次擊破磚要打 2 下才破", () => {
    const events = createEventBus();
    const game = createGame({ fieldHeight: FIELD.minHeight, paddleDef: PADDLES.standard, events, level: level("2NNNNNNNN") });
    const { state } = game;
    const tough = state.bricks[0];
    const hitOnce = () => {
      const ball = state.balls[0];
      ball.stuck = false;
      ball.x = tough.x + tough.w / 2;
      ball.y = tough.y + tough.h + ball.r - 2;
      ball.vx = 0;
      ball.vy = -600;
      game.step(LOOP.step, {});
    };
    hitOnce();
    expect(tough.alive).toBe(true);
    expect(tough.hp).toBe(1);
    hitOnce();
    expect(tough.alive).toBe(false);
    expect(state.score).toBe(20);
  });
});
