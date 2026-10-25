import { describe, expect, it } from "vitest";
import { FIELD } from "../src/config.js";
import { applyRelativeDrag, clientToLogical, isValidPull } from "../src/input/input.js";
import { computeLayout } from "../src/render/viewport.js";

describe("computeLayout", () => {
  it("9:19.5 的手機：高度跟著變長並填滿寬度", () => {
    const l = computeLayout(390, 845, 3);
    expect(l.height).toBe(1170);
    expect(l.cssWidth).toBeCloseTo(390);
    expect(l.cssHeight).toBeCloseTo(845, 0);
  });

  it("比上限更長的螢幕：高度夾在上限，寬度填滿、上下留邊", () => {
    const l = computeLayout(360, 900, 2);
    expect(l.height).toBe(FIELD.maxHeight);
    expect(l.cssWidth).toBeCloseTo(360);
    expect(l.cssHeight).toBeCloseTo(800);
  });

  it("電腦橫向螢幕用 9:16 並以高度為準置中", () => {
    const l = computeLayout(1920, 1000, 1);
    expect(l.height).toBe(FIELD.minHeight);
    expect(l.cssHeight).toBeCloseTo(1000);
    expect(l.cssWidth).toBeCloseTo(562.5);
  });

  it("高解析倍率上限 2", () => {
    const l = computeLayout(390, 845, 3);
    expect(l.pixelWidth).toBe(780);
  });
});

describe("輸入換算", () => {
  it("螢幕座標轉邏輯座標", () => {
    const rect = { left: 10, top: 20, width: 270, height: 480 };
    expect(clientToLogical(145, 260, rect, 540, 960)).toEqual({ x: 270, y: 480 });
  });

  it("相對拖曳依倍率移動並夾在範圍內", () => {
    expect(applyRelativeDrag(200, 10, 1.5, 48, 492)).toBe(215);
    expect(applyRelativeDrag(480, 100, 1.5, 48, 492)).toBe(492);
  });

  it("彈弓只有往下拉才有效", () => {
    expect(isValidPull(20)).toBe(true);
    expect(isValidPull(0)).toBe(false);
    expect(isValidPull(-20)).toBe(false);
  });
});
