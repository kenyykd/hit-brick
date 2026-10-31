import { describe, expect, it } from "vitest";
import { BALL, BRICK_LAYOUT, FIELD } from "../src/config.js";
import { LEVELS, LEVEL_SPEED_CAP, SANDBOX_LEVEL } from "../src/levels/levels.js";
import { LevelError, buildBricks, isLevelSolvable, parseLevel } from "../src/levels/parse.js";

const base = { id: 99, name: "測試", theme: "rainbow", ballSpeed: 600, targetScore: 0 };
const level = (layout, extra = {}) => ({ ...base, layout, ...extra });

describe("內建關卡", () => {
  it("編號從 1 開始連續，首發 20 關", () => {
    expect(LEVELS.map((l) => l.id)).toEqual(LEVELS.map((_, i) => i + 1));
    expect(LEVELS).toHaveLength(20);
  });

  it("球速隨關卡只升不降，而且不超過上限", () => {
    for (let i = 1; i < LEVELS.length; i++) expect(LEVELS[i].ballSpeed).toBeGreaterThanOrEqual(LEVELS[i - 1].ballSpeed);
    expect(Math.max(...LEVELS.map((l) => l.ballSpeed))).toBeLessThanOrEqual(LEVEL_SPEED_CAP);
  });

  it("引入節奏：每種特殊磚第一次出現的關卡", () => {
    const firstLevel = (char) => LEVELS.find((l) => l.layout.includes(char))?.id;
    expect(Math.min(firstLevel("2"), firstLevel("3"))).toBe(6);
    expect(firstLevel("#")).toBe(9);
    expect(firstLevel("*")).toBe(12);
  });

  for (const l of [...LEVELS, SANDBOX_LEVEL]) {
    it(`第 ${l.id} 關（${l.name}）格式正確、可以通關、排列不跑版`, () => {
      const parsed = parseLevel(l);
      expect(isLevelSolvable(parsed)).toBe(true);

      const bricks = buildBricks(parsed, FIELD.width, BRICK_LAYOUT);
      for (const b of bricks) {
        expect(b.x).toBeGreaterThanOrEqual(0);
        expect(b.x + b.w).toBeLessThanOrEqual(FIELD.width + 1e-9);
        expect(b.h).toBeGreaterThan(BALL.radius * 2);
      }
      // 最矮的場地也要在磚區和板子之間留足夠空間
      const gridBottom = Math.max(...bricks.map((b) => b.y + b.h));
      const paddleY = FIELD.minHeight - FIELD.paddleBottomMargin;
      expect(paddleY - gridBottom).toBeGreaterThan(400);
    });
  }
});

describe("parseLevel 驗證", () => {
  it("9 欄與 10 欄都可以，前後空白會被去掉", () => {
    expect(parseLevel(level("\n   NNNNNNNNN\n   .........\n")).cols).toBe(9);
    expect(parseLevel(level("NNNNNNNNNN")).cols).toBe(10);
  });

  it("各列長度不一致時報錯", () => {
    expect(() => parseLevel(level("NNNNNNNNN\nNNNNNNNN"))).toThrow(LevelError);
  });

  it("欄數超出範圍時報錯", () => {
    expect(() => parseLevel(level("NNNNNNNN"))).toThrow(/欄數/);
    expect(() => parseLevel(level("NNNNNNNNNNN"))).toThrow(/欄數/);
  });

  it("未知字元報錯", () => {
    expect(() => parseLevel(level("NNNNXNNNN"))).toThrow(/未知字元/);
  });

  it("沒有可破壞的磚時報錯", () => {
    expect(() => parseLevel(level("###...###"))).toThrow(/可破壞/);
  });

  it("球速、主題、layout 不合法時報錯", () => {
    expect(() => parseLevel(level("NNNNNNNNN", { ballSpeed: 99999 }))).toThrow(/球速/);
    expect(() => parseLevel(level("NNNNNNNNN", { ballSpeed: "快" }))).toThrow(/球速/);
    expect(() => parseLevel(level("NNNNNNNNN", { theme: "nope" }))).toThrow(/主題/);
    expect(() => parseLevel({ ...base })).toThrow(LevelError);
    expect(() => parseLevel(level("NNNNNNNNN\n".repeat(20)))).toThrow(/最多/);
  });
});

describe("isLevelSolvable", () => {
  it("被不可破壞磚整個包住的磚無法通關", () => {
    const parsed = parseLevel(level("###......\n#N#......\n###......"));
    expect(isLevelSolvable(parsed)).toBe(false);
  });

  it("可破壞磚擋住的路可以打穿", () => {
    const parsed = parseLevel(level("###......\n#N#......\n#N#......"));
    expect(isLevelSolvable(parsed)).toBe(true);
  });

  it("整排不可破壞磚擋住時，後面的磚無法通關（磚區佔滿寬度，繞不過去）", () => {
    const parsed = parseLevel(level("NNNNNNNNN\n#########\n........."));
    expect(isLevelSolvable(parsed)).toBe(false);
  });
});

describe("buildBricks", () => {
  it("多次擊破磚的耐久與分數依字元決定", () => {
    const bricks = buildBricks(parseLevel(level("23N#*....")), FIELD.width, BRICK_LAYOUT);
    const [two, three, normal, steel, bomb] = bricks;
    expect([two.hp, three.hp, normal.hp]).toEqual([2, 3, 1]);
    expect([two.score, three.score, normal.score, steel.score, bomb.score]).toEqual([20, 30, 10, 0, 15]);
    expect(steel.breakable).toBe(false);
    expect(bomb.explosive).toBe(true);
  });
});
