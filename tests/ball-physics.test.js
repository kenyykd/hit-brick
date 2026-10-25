import { describe, expect, it } from "vitest";
import { DEG } from "../src/core/math.js";
import {
  clampLaunchAngle,
  enforceMinVerticalAngle,
  normalizeSpeed,
  paddleBounce,
  reflect,
  slingshotAngle,
  substepCount,
} from "../src/physics/ball-physics.js";

const angleFromUp = (vx, vy) => Math.atan2(vx, -vy) / DEG;

describe("paddleBounce", () => {
  it("打中間幾乎垂直往上", () => {
    const v = paddleBounce(100, 100, 96, 55, 720);
    expect(v.vx).toBeCloseTo(0);
    expect(v.vy).toBeCloseTo(-720);
  });

  it("打邊緣偏 ±55 度", () => {
    const right = paddleBounce(148, 100, 96, 55, 720);
    const left = paddleBounce(52, 100, 96, 55, 720);
    expect(angleFromUp(right.vx, right.vy)).toBeCloseTo(55);
    expect(angleFromUp(left.vx, left.vy)).toBeCloseTo(-55);
  });

  it("超出板子邊緣時角度被夾住", () => {
    const v = paddleBounce(200, 100, 96, 55, 720);
    expect(angleFromUp(v.vx, v.vy)).toBeCloseTo(55);
    expect(v.offset).toBe(1);
  });

  it("反彈後速度維持目標速度", () => {
    const v = paddleBounce(130, 100, 96, 55, 720);
    expect(Math.hypot(v.vx, v.vy)).toBeCloseTo(720);
  });
});

describe("enforceMinVerticalAngle", () => {
  it("水平的球被修成至少 15 度，速度不變、水平方向保留", () => {
    const v = enforceMinVerticalAngle(-720, 0, 15);
    expect(Math.hypot(v.vx, v.vy)).toBeCloseTo(720);
    expect(v.vx).toBeLessThan(0);
    expect(Math.abs(Math.atan2(v.vy, v.vx) / DEG)).toBeCloseTo(165);
  });

  it("太平的往上球修正後仍往上", () => {
    const v = enforceMinVerticalAngle(700, -10, 15);
    expect(v.vy).toBeLessThan(0);
    expect(Math.abs(v.vy)).toBeCloseTo(Math.sin(15 * DEG) * Math.hypot(700, 10));
  });

  it("角度足夠時不修改", () => {
    expect(enforceMinVerticalAngle(300, -600, 15)).toEqual({ vx: 300, vy: -600 });
  });
});

describe("normalizeSpeed / reflect", () => {
  it("正規化回目標速度", () => {
    const v = normalizeSpeed(3, 4, 10);
    expect(v).toEqual({ vx: 6, vy: 8 });
  });

  it("沿法線反射，背離表面時不反射", () => {
    expect(reflect(5, 5, 0, -1)).toEqual({ vx: 5, vy: -5 });
    expect(reflect(5, -5, 0, -1)).toEqual({ vx: 5, vy: -5 });
  });
});

describe("clampLaunchAngle / slingshotAngle", () => {
  it("正上方是 0 度", () => {
    expect(clampLaunchAngle(0, -100, 70)).toBeCloseTo(0);
  });

  it("向量長度為 0 或無效時用預設角度", () => {
    expect(clampLaunchAngle(0, 0, 70, 10)).toBeCloseTo(10 * DEG);
    expect(clampLaunchAngle(NaN, 1, 70, 0)).toBe(0);
  });

  it("朝下或太斜時夾到 ±70 度，球一定往上", () => {
    expect(clampLaunchAngle(0, 100, 70) / DEG).toBeCloseTo(70); // 正下方 → atan2(0, -100) = π → 夾成 70
    expect(clampLaunchAngle(-100, 0, 70) / DEG).toBeCloseTo(-70);
    expect(clampLaunchAngle(100, 10, 70) / DEG).toBeCloseTo(70);
  });

  it("彈弓往左下拉 → 往右上射", () => {
    const angle = slingshotAngle(-50, 50, 70);
    expect(angle / DEG).toBeCloseTo(45);
  });

  it("彈弓往正下方拉 → 正上方射", () => {
    expect(slingshotAngle(0, 80, 70)).toBeCloseTo(0);
  });
});

describe("substepCount", () => {
  it("每個子步驟不超過半個球半徑", () => {
    expect(substepCount(12, 9, 0.5)).toBe(3);
    expect(substepCount(0, 9, 0.5)).toBe(1);
    expect(substepCount(4.5, 9, 0.5)).toBe(1);
  });
});
