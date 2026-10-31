import { describe, expect, it } from "vitest";
import { BRICK_LAYOUT, FIELD, LOOP, STARS } from "../src/config.js";
import { createEventBus } from "../src/core/events.js";
import { ACHIEVEMENTS, ACHIEVEMENT_CATEGORIES } from "../src/data/achievements.js";
import { PADDLES } from "../src/data/paddles.js";
import { BALL_SKINS, PADDLE_SKINS } from "../src/data/skins.js";
import { UNLOCKS } from "../src/data/unlocks.js";
import { createGame } from "../src/game/game.js";
import { LASER_STAT_CAP, checkAchievements, createAchievementTracker, updateStats } from "../src/achievements/tracker.js";
import { LEVELS } from "../src/levels/levels.js";
import { buildBricks, parseLevel } from "../src/levels/parse.js";
import { baseScore, targetScore } from "../src/levels/target.js";
import { computeStars, isUnlocked, recordLevelClear, starsNeeded, totalStars, unlockedItems } from "../src/save/progress.js";
import { createSaveStore, defaultSave } from "../src/save/save.js";

const bricksOf = (level) => buildBricks(parseLevel(level), FIELD.width, BRICK_LAYOUT);

describe("目標分數", () => {
  it("= 可破壞磚基礎總分 × 倍數，取到十位", () => {
    const level = { ...LEVELS[1], targetMultiplier: undefined };
    const bricks = bricksOf(level);
    expect(targetScore(level, bricks)).toBe(Math.round((baseScore(bricks) * STARS.targetMultiplier) / 10) * 10);
  });

  it("不可破壞磚不算分；多次擊破磚依耐久計分", () => {
    const level = { id: 9, name: "t", theme: "rainbow", ballSpeed: 600, layout: "N3#......" };
    expect(baseScore(bricksOf(level))).toBe(10 + 30);
  });

  it("關卡可以個別覆寫倍數或分數", () => {
    const bricks = bricksOf(LEVELS[0]);
    expect(targetScore({ targetMultiplier: 1 }, bricks)).toBe(baseScore(bricks));
    expect(targetScore({ targetScore: 123 }, bricks)).toBe(123);
  });

  it("第 1 關的倍數比其他關低（三星要很容易）", () => {
    expect(LEVELS[0].targetMultiplier).toBeLessThan(STARS.targetMultiplier);
  });

  it("遊戲開始時算好目標分數，過關事件帶著它", () => {
    const events = createEventBus();
    let cleared = null;
    events.on("levelCleared", (e) => (cleared = e));
    const game = createGame({ fieldHeight: FIELD.minHeight, paddleDef: PADDLES.standard, events, level: LEVELS[0], drops: false });
    expect(game.state.targetScore).toBe(targetScore(LEVELS[0], game.state.bricks));
    for (const b of game.state.bricks) b.alive = false;
    game.step(LOOP.step, {});
    expect(cleared).toMatchObject({ targetScore: game.state.targetScore, livesLost: 0, paddleId: "standard" });
  });
});

describe("星星", () => {
  it("過關 1 顆、達到目標 1 顆、沒失去生命 1 顆", () => {
    expect(computeStars({ score: 0, target: 100, livesLost: 2 })).toBe(1);
    expect(computeStars({ score: 100, target: 100, livesLost: 2 })).toBe(2);
    expect(computeStars({ score: 0, target: 100, livesLost: 0 })).toBe(2);
    expect(computeStars({ score: 150, target: 100, livesLost: 0 })).toBe(3);
  });

  it("只增不減，重玩取歷史最佳", () => {
    const save = defaultSave();
    recordLevelClear(save, 1, { score: 500, target: 300, livesLost: 0 });
    const r = recordLevelClear(save, 1, { score: 10, target: 300, livesLost: 2 });
    expect(r.stars).toBe(1);
    expect(r.previousStars).toBe(3);
    expect(save.levels[1].stars).toBe(3);
    expect(totalStars(save)).toBe(3);
  });
});

describe("解鎖", () => {
  it("解鎖表涵蓋所有板子與皮膚，預設的都是 0 顆星", () => {
    expect(Object.keys(UNLOCKS.paddles).sort()).toEqual(Object.keys(PADDLES).sort());
    expect(Object.keys(UNLOCKS.ballSkins).sort()).toEqual(Object.keys(BALL_SKINS).sort());
    expect(Object.keys(UNLOCKS.paddleSkins).sort()).toEqual(Object.keys(PADDLE_SKINS).sort());
    expect(unlockedItems(defaultSave()).sort()).toEqual(["ballSkins:classic", "paddleSkins:solid", "paddles:standard"]);
  });

  it("星星夠了就解鎖", () => {
    const save = defaultSave();
    expect(starsNeeded(save, "ballSkins", "gold")).toBe(UNLOCKS.ballSkins.gold);
    save.levels[1] = { bestScore: 0, cleared: true, stars: 3 };
    expect(isUnlocked(save, "ballSkins", "gold")).toBe(UNLOCKS.ballSkins.gold <= 3);
    expect(isUnlocked(save, "ballSkins", "不存在")).toBe(false);
  });
});

describe("成就", () => {
  it("12～15 個，三類都有，id 不重複", () => {
    expect(ACHIEVEMENTS.length).toBeGreaterThanOrEqual(12);
    expect(ACHIEVEMENTS.length).toBeLessThanOrEqual(15);
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(ACHIEVEMENTS.length);
    for (const category of Object.keys(ACHIEVEMENT_CATEGORIES)) {
      expect(ACHIEVEMENTS.some((a) => a.category === category)).toBe(true);
    }
  });

  it("統計：接過的道具不重複、雷射磚數到上限就停、過關用過的板子", () => {
    let stats = defaultSave().stats;
    stats = updateStats(stats, "powerupCollected", { type: "slow" });
    expect(updateStats(stats, "powerupCollected", { type: "slow" })).toBe(stats);
    stats = updateStats(stats, "brickDestroyed", { source: "laser" });
    expect(stats.laserBricks).toBe(1);
    expect(updateStats(stats, "brickDestroyed", { source: "ball" })).toBe(stats);
    expect(updateStats({ ...stats, laserBricks: LASER_STAT_CAP }, "brickDestroyed", { source: "laser" }).laserBricks).toBe(LASER_STAT_CAP);
    stats = updateStats(stats, "levelCleared", { paddleId: "shield" });
    expect(stats).toMatchObject({ powerups: ["slow"], paddlesCleared: ["shield"] });
  });

  it("雷射工程師的門檻和統計上限一致", () => {
    const laser = ACHIEVEMENTS.find((a) => a.id === "laser-50");
    const ctx = (n) => ({ stats: { laserBricks: n } });
    expect(laser.check({}, ctx(LASER_STAT_CAP))).toBe(true);
    expect(laser.check({}, ctx(LASER_STAT_CAP - 1))).toBe(false);
  });

  it("條件判斷；已達成的不會再觸發", () => {
    const ctx = { stats: defaultSave().stats, ballCount: 1, fireball: false, totalStars: 0, allCleared: false };
    expect(checkAchievements("comboChanged", { combo: 14 }, ctx, []).map((a) => a.id)).toEqual([]);
    expect(checkAchievements("comboChanged", { combo: 15 }, ctx, []).map((a) => a.id)).toEqual(["combo-15"]);
    expect(checkAchievements("comboChanged", { combo: 15 }, ctx, ["combo-15"])).toEqual([]);
    expect(checkAchievements("chainResolved", { count: 8 }, ctx, []).map((a) => a.id)).toEqual(["chain-8"]);
    const steel = { brick: { breakable: false } };
    expect(checkAchievements("brickHit", steel, ctx, [])).toEqual([]);
    expect(checkAchievements("brickHit", steel, { ...ctx, fireball: true }, []).map((a) => a.id)).toEqual(["fire-steel"]);
    const cleared = { score: 500, targetScore: 400, livesLost: 0 };
    expect(checkAchievements("levelCleared", cleared, ctx, []).map((a) => a.id).sort()).toEqual(["flawless", "target"]);
  });

  it("追蹤器：事件觸發成就、寫進存檔、只通知一次", () => {
    const events = createEventBus();
    const store = createSaveStore(null);
    const unlocked = [];
    createAchievementTracker({
      events,
      store,
      getContext: () => ({ totalStars: 0, allCleared: false, ballCount: 1, fireball: false }),
      onUnlock: (a) => unlocked.push(a.id),
    });
    events.emit("shieldHit", {});
    events.emit("shieldHit", {});
    for (const type of ["multiball", "expand", "slow", "fireball", "magnet"]) events.emit("powerupCollected", { type });
    expect(unlocked).toEqual(["shield-save"]);
    events.emit("powerupCollected", { type: "extraLife" });
    expect(unlocked).toEqual(["shield-save", "all-powerups"]);
    expect(store.data.achievements).toEqual(["shield-save", "all-powerups"]);
    expect(store.data.stats.powerups).toHaveLength(6);
  });

  it("遊戲中：一次爆炸連鎖發出 chainResolved，含引爆的那塊", () => {
    const events = createEventBus();
    const chains = [];
    events.on("chainResolved", (e) => chains.push(e.count));
    const level = { id: 9, name: "t", theme: "rainbow", ballSpeed: 600, layout: "N*NNNNNNN" };
    const game = createGame({ fieldHeight: FIELD.minHeight, paddleDef: PADDLES.standard, events, level, drops: false });
    const bomb = game.state.bricks[1];
    Object.assign(game.state.balls[0], { stuck: false, x: bomb.x + bomb.w / 2, y: bomb.y + bomb.h + 7, vx: 0, vy: -600 });
    game.step(LOOP.step, {});
    expect(chains).toEqual([3]);
  });
});
