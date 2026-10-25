import { describe, expect, it } from "vitest";
import { advanceAccumulator } from "../src/core/loop.js";
import { LOOP } from "../src/config.js";

function totalSteps(hz, seconds) {
  let acc = 0;
  let steps = 0;
  const frames = Math.round(hz * seconds);
  for (let i = 0; i < frames; i++) {
    const r = advanceAccumulator(acc, 1 / hz, LOOP);
    acc = r.acc;
    steps += r.steps;
  }
  return steps;
}

describe("advanceAccumulator", () => {
  it("60Hz 與 144Hz 跑 1 秒的邏輯步數相同（球速一致）", () => {
    expect(Math.abs(totalSteps(60, 1) - 120)).toBeLessThanOrEqual(1);
    expect(Math.abs(totalSteps(144, 1) - 120)).toBeLessThanOrEqual(1);
    expect(Math.abs(totalSteps(30, 1) - 120)).toBeLessThanOrEqual(1);
  });

  it("60Hz 每幀約 2 步", () => {
    let acc = 0;
    const counts = [];
    for (let i = 0; i < 10; i++) {
      const r = advanceAccumulator(acc, 1 / 60, LOOP);
      acc = r.acc;
      counts.push(r.steps);
    }
    const avg = counts.reduce((a, b) => a + b, 0) / counts.length;
    expect(avg).toBeCloseTo(2, 0);
  });

  it("卡頓或切分頁回來時，最多補 maxStepsPerFrame 步並丟掉剩下的時間", () => {
    const r = advanceAccumulator(0, 5, LOOP);
    expect(r.steps).toBe(LOOP.maxStepsPerFrame);
    expect(r.acc).toBe(0);
  });

  it("負的或 0 的幀時間不會產生步數", () => {
    expect(advanceAccumulator(0, -1, LOOP).steps).toBe(0);
    expect(advanceAccumulator(0, 0, LOOP).steps).toBe(0);
  });
});
