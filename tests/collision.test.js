import { describe, expect, it } from "vitest";
import { circleRectContact, findNearestHit } from "../src/physics/collision.js";

const rect = { x: 100, y: 100, w: 60, h: 20 };

describe("circleRectContact", () => {
  it("沒碰到時回傳 null", () => {
    expect(circleRectContact(50, 50, 9, rect)).toBeNull();
    expect(circleRectContact(130, 89, 9, rect)).toBeNull(); // 剛好貼齊不算
  });

  it("從四個邊碰到時法線正確", () => {
    expect(circleRectContact(130, 95, 9, rect)).toMatchObject({ nx: 0, ny: -1, depth: 4 });
    expect(circleRectContact(130, 125, 9, rect)).toMatchObject({ nx: 0, ny: 1, depth: 4 });
    expect(circleRectContact(95, 110, 9, rect)).toMatchObject({ nx: -1, ny: 0, depth: 4 });
    expect(circleRectContact(165, 110, 9, rect)).toMatchObject({ nx: 1, ny: 0, depth: 4 });
  });

  it("碰到角落時法線指向圓心", () => {
    const c = circleRectContact(96, 96, 9, rect);
    expect(c.nx).toBeCloseTo(-Math.SQRT1_2);
    expect(c.ny).toBeCloseTo(-Math.SQRT1_2);
    expect(c.depth).toBeCloseTo(9 - Math.hypot(4, 4));
  });

  it("圓心在矩形內時從最淺的一邊推出", () => {
    const c = circleRectContact(130, 102, 9, rect);
    expect(c).toMatchObject({ nx: 0, ny: -1, distance: 0 });
    expect(c.depth).toBe(11);
  });
});

describe("findNearestHit", () => {
  it("同時重疊兩塊磚時只回傳最近的一塊", () => {
    const bricks = [
      { x: 0, y: 0, w: 50, h: 20 },
      { x: 52, y: 0, w: 50, h: 20 },
    ];
    // 球在兩磚縫隙下方偏右，離第二塊較近
    const hit = findNearestHit(52, 26, 9, bricks);
    expect(hit.index).toBe(1);
  });

  it("略過已打掉的磚", () => {
    const bricks = [
      { x: 0, y: 0, w: 50, h: 20, alive: false },
      { x: 52, y: 0, w: 50, h: 20, alive: true },
    ];
    expect(findNearestHit(25, 25, 9, bricks)).toBeNull();
  });
});
