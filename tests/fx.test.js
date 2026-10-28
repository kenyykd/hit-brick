import { describe, expect, it, vi } from "vitest";
import { createSoundFx } from "../src/audio/sound-fx.js";
import { FIELD, LOOP } from "../src/config.js";
import { createEventBus } from "../src/core/events.js";
import { PADDLES } from "../src/data/paddles.js";
import { createEffects } from "../src/fx/effects.js";
import { createPool } from "../src/fx/pool.js";
import { createAutoQuality, resolveQuality } from "../src/fx/quality.js";
import { createGame } from "../src/game/game.js";
import { SANDBOX_LEVEL } from "../src/levels/levels.js";

const SETTINGS = { effects: "high", screenShake: true, vibration: true, sound: true, music: true };

function seededRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

function setupEffects(settings = SETTINGS, options = {}) {
  const events = createEventBus();
  const game = createGame({ fieldHeight: FIELD.minHeight, paddleDef: PADDLES.standard, events, level: SANDBOX_LEVEL, drops: false });
  const vibrate = vi.fn();
  const fx = createEffects({ events, getState: () => game.state, getSettings: () => settings, vibrate, ...options });
  return { events, game, fx, vibrate };
}

describe("物件池", () => {
  it("連續生成數萬次，物件數量不變且重複使用", () => {
    const pool = createPool(50, () => ({ x: 0 }));
    const original = new Set(pool.items);
    for (let i = 0; i < 50_000; i++) {
      const item = pool.spawn();
      expect(original.has(item)).toBe(true);
      if (i % 3 === 0) item.alive = false;
    }
    expect(pool.items).toHaveLength(50);
    expect(pool.count()).toBeLessThanOrEqual(50);
  });

  it("池滿時覆蓋最舊的", () => {
    const pool = createPool(2, () => ({}));
    const a = pool.spawn();
    pool.spawn();
    expect(pool.spawn()).toBe(a);
  });
});

describe("特效品質", () => {
  it("取玩家設定與自動降級中較低的一檔", () => {
    expect(resolveQuality("high").level).toBe("high");
    expect(resolveQuality("high", { autoLevel: "medium" }).level).toBe("medium");
    expect(resolveQuality("low", { autoLevel: "high" }).level).toBe("low");
    expect(resolveQuality("壞掉的值").level).toBe("high");
  });

  it("減少動態效果時不震動、不凍結、不拖尾、不灑彩帶", () => {
    const q = resolveQuality("high", { reducedMotion: true });
    expect(q).toMatchObject({ shake: false, hitStop: false, trailLength: 0, confetti: 0 });
  });

  it("幀率太低時自動降一檔，只降不升", () => {
    const auto = createAutoQuality({ minFps: 45, windowSeconds: 2 });
    for (let i = 0; i < 70; i++) auto.sample(1 / 30); // 30 FPS 跑 2 秒多
    expect(auto.level).toBe("medium");
    for (let i = 0; i < 500; i++) auto.sample(1 / 120);
    expect(auto.level).toBe("medium");
    auto.sample(3); // 切分頁回來的長間隔不算
    expect(auto.level).toBe("medium");
  });
});

describe("畫面震動與手機震動", () => {
  it("爆炸時震動，幅度隨時間衰減到 0", () => {
    const { events, game, fx, vibrate } = setupEffects();
    const brick = game.state.bricks.find((b) => b.explosive);
    events.emit("explosion", { brick, depth: 0 });
    const start = fx.shakeAmplitude();
    expect(start).toBeGreaterThan(0);
    fx.update(0.1);
    expect(fx.shakeAmplitude()).toBeLessThan(start);
    fx.update(1);
    expect(fx.shakeAmplitude()).toBe(0);
    expect(vibrate).toHaveBeenCalled();
  });

  it("設定關閉時不震動", () => {
    const { events, game, fx, vibrate } = setupEffects({ ...SETTINGS, screenShake: false, vibration: false });
    events.emit("explosion", { brick: game.state.bricks[0], depth: 0 });
    events.emit("lifeLost", { lives: 2 });
    expect(fx.shakeAmplitude()).toBe(0);
    expect(vibrate).not.toHaveBeenCalled();
  });

  it("命中凍結只停特效層", () => {
    const { events, game, fx } = setupEffects();
    const brick = game.state.bricks.find((b) => b.explosive);
    events.emit("explosion", { brick, depth: 2 });
    const amp = fx.shakeAmplitude();
    fx.update(0.03);
    expect(fx.shakeAmplitude()).toBe(amp); // 凍結中特效不前進
    fx.update(0.1);
    fx.update(0.05);
    expect(fx.shakeAmplitude()).toBeLessThan(amp);
  });
});

describe("粒子", () => {
  it("破磚產生粒子，時間到全部回收", () => {
    const { events, game, fx } = setupEffects();
    const brick = game.state.bricks[0];
    events.emit("brickDestroyed", { brick, score: 10, multiplier: 1, combo: 1 });
    expect(fx.particleCount()).toBeGreaterThan(0);
    for (let i = 0; i < 100; i++) fx.update(0.05);
    expect(fx.particleCount()).toBe(0);
  });

  it("連續大量破磚時粒子數有上限", () => {
    const { events, game, fx } = setupEffects();
    for (let i = 0; i < 1000; i++) events.emit("brickDestroyed", { brick: game.state.bricks[i % 10], score: 10, multiplier: 1, combo: 1 });
    expect(fx.particleCount()).toBeLessThanOrEqual(600);
  });
});

describe("關掉表現層判定不變", () => {
  function run(withPresentation) {
    const events = createEventBus();
    const game = createGame({
      fieldHeight: FIELD.minHeight,
      paddleDef: PADDLES.standard,
      events,
      level: SANDBOX_LEVEL,
      rng: seededRng(42),
    });
    let fx = null;
    if (withPresentation) {
      fx = createEffects({ events, getState: () => game.state, getSettings: () => SETTINGS, vibrate: () => {} });
      createSoundFx({ events, audio: { play: () => {} } });
    }
    const { state } = game;
    for (let t = 0; t < 20_000 && state.status === "playing"; t++) {
      const ball = state.balls.reduce((low, b) => (b.y > low.y ? b : low));
      game.step(LOOP.step, { paddleTargetX: ball.x + Math.sin(t / 97) * 40, aimAngle: 0.3, launch: game.isHolding() });
      fx?.update(LOOP.step);
    }
    return JSON.stringify({
      score: state.score,
      lives: state.lives,
      status: state.status,
      bricks: state.bricks.map((b) => [b.alive, b.hp]),
      balls: state.balls.map((b) => [b.x, b.y, b.vx, b.vy]),
      effects: state.effects,
      capsules: state.capsules.map((c) => [c.type, c.x, c.y]),
    });
  }

  it("同一關、同一亂數種子，有沒有特效與音效結果完全相同", () => {
    expect(run(true)).toBe(run(false));
  });
});
