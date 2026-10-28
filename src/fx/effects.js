// 打擊感特效：受擊閃白、破碎粒子、分數飄字、球拖尾、畫面震動、彩帶、命中凍結、手機震動。
// 只訂閱事件、只讀遊戲狀態，所有特效狀態都在這個模組裡；拿掉整個模組遊戲判定完全不變。
// 時間用畫面時間推進，暫停時呼叫端不推進，特效跟著凍結。

import { BALL } from "../config.js";
import { clamp } from "../core/math.js";
import { POWERUPS } from "../data/powerups.js";
import { BRICK_COLORS, THEMES, brickColor } from "../data/themes.js";
import { createPool } from "./pool.js";
import { resolveQuality } from "./quality.js";

const MAX_PARTICLES = 600;
const MAX_TEXTS = 40;
const MAX_TRAIL = 12;
const FLASH_TIME = 0.09; // 磚受擊閃白
const TEXT_TIME = 0.75;
const TEXT_RISE = 50; // 飄字每秒上升
const SHAKE = { explosion: 6, lifeLost: 10, duration: 0.3 };
const HIT_STOP = { time: 0.06, minDepth: 2 }; // 爆炸連鎖到第 3 層（depth 2）才凍結
const SCREEN_FLASH_TIME = 0.1;
const VIBRATE_MS = { explosion: 30, lifeLost: 120 };
const GRAVITY = 900;
const CONFETTI_COLORS = ["#ff6b6b", "#ffd43b", "#69db7c", "#4dabf7", "#f783ac", "#ffa94d"];
const COMBO_TEXT_COLOR = "#ffd43b";

const random = (min, max) => min + Math.random() * (max - min);

function defaultVibrate(ms) {
  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") navigator.vibrate(ms);
}

export function createEffects({ events, getState, getSettings, reducedMotion = false, getAutoLevel = () => "high", vibrate = defaultVibrate }) {
  const particles = createPool(MAX_PARTICLES, () => ({
    x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 0, color: "", gravity: 0, confetti: false, rot: 0, spin: 0,
  }));
  const texts = createPool(MAX_TEXTS, () => ({ x: 0, y: 0, life: 0, text: "", color: "", size: 0 }));
  const flashes = new Map(); // brick → 剩餘時間
  const trails = new Map(); // ballId → { xs, ys, start, count }
  let shakeTime = 0;
  let shakeStrength = 0;
  let hitStop = 0;
  let screenFlash = 0;

  function quality() {
    return resolveQuality(getSettings().effects, { reducedMotion, autoLevel: getAutoLevel() });
  }

  function theme() {
    return THEMES[getState().level.theme];
  }

  function spawnParticle(x, y, { vx, vy, life, size, color, gravity = GRAVITY, confetti = false }) {
    const p = particles.spawn();
    Object.assign(p, { x, y, vx, vy, life, maxLife: life, size, color, gravity, confetti, rot: random(0, Math.PI), spin: random(-8, 8) });
  }

  function burst(x, y, count, color, speed = 260) {
    for (let i = 0; i < count; i++) {
      const angle = random(0, Math.PI * 2);
      const v = random(speed * 0.3, speed);
      spawnParticle(x, y, { vx: Math.cos(angle) * v, vy: Math.sin(angle) * v - 80, life: random(0.35, 0.7), size: random(2.5, 5), color });
    }
  }

  function floatText(x, y, text, color, size = 18) {
    const t = texts.spawn();
    Object.assign(t, { x, y, life: TEXT_TIME, text, color, size });
  }

  function shake(strength) {
    if (!quality().shake || !getSettings().screenShake) return;
    shakeStrength = Math.max(shakeStrength * (shakeTime / SHAKE.duration), strength);
    shakeTime = SHAKE.duration;
  }

  function buzz(ms) {
    if (getSettings().vibration) vibrate(ms);
  }

  function clearAll() {
    particles.clear();
    texts.clear();
    flashes.clear();
    trails.clear();
    shakeTime = 0;
    hitStop = 0;
    screenFlash = 0;
  }

  // ---- 事件 ----
  events.on("gameReset", clearAll);

  events.on("brickHit", ({ brick }) => flashes.set(brick, FLASH_TIME));

  events.on("brickDestroyed", ({ brick, score, multiplier }) => {
    const cx = brick.x + brick.w / 2;
    const cy = brick.y + brick.h / 2;
    const color = brick.explosive ? BRICK_COLORS.explosiveCore : brickColor(brick, theme());
    burst(cx, cy, quality().particlesPerBrick, color);
    floatText(cx, cy, multiplier > 1 ? `+${score} ×${multiplier}` : `+${score}`, multiplier > 1 ? COMBO_TEXT_COLOR : "#ffffff");
  });

  events.on("explosion", ({ brick, depth }) => {
    const q = quality();
    burst(brick.x + brick.w / 2, brick.y + brick.h / 2, q.particlesPerBrick * 2, BRICK_COLORS.explosiveCore, 420);
    shake(SHAKE.explosion);
    buzz(VIBRATE_MS.explosion);
    if (q.hitStop && depth >= HIT_STOP.minDepth) {
      hitStop = HIT_STOP.time;
      screenFlash = SCREEN_FLASH_TIME;
    }
  });

  events.on("lifeLost", () => {
    trails.clear();
    shake(SHAKE.lifeLost);
    buzz(VIBRATE_MS.lifeLost);
  });

  events.on("powerupCollected", ({ type }) => {
    const def = POWERUPS[type];
    const { paddle } = getState();
    const cx = paddle.x + paddle.width / 2;
    const count = quality().particlesPerBrick * 2;
    // 光環：粒子往四周平均散開，不受重力
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      spawnParticle(cx, paddle.y, { vx: Math.cos(angle) * 220, vy: Math.sin(angle) * 220, life: 0.45, size: 4, color: def.color, gravity: 0 });
    }
    floatText(cx, paddle.y - 24, `${def.icon} ${def.name}`, def.color, 20);
  });

  events.on("levelCleared", () => {
    const { width } = getState().field;
    const count = quality().confetti;
    for (let i = 0; i < count; i++) {
      spawnParticle(random(0, width), random(-120, -10), {
        vx: random(-60, 60),
        vy: random(60, 220),
        life: random(1.8, 3),
        size: random(5, 9),
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        gravity: 120,
        confetti: true,
      });
    }
  });

  // ---- 每幀 ----

  // 記錄每顆移動中的球最近的位置；球速越快拖尾越長
  function recordTrails() {
    const length = quality().trailLength;
    const balls = getState().balls;
    const ids = new Set();
    for (const ball of balls) {
      if (ball.stuck || length === 0) continue;
      ids.add(ball.id);
      let trail = trails.get(ball.id);
      if (!trail) {
        trail = { xs: new Float32Array(MAX_TRAIL), ys: new Float32Array(MAX_TRAIL), start: 0, count: 0, max: 0 };
        trails.set(ball.id, trail);
      }
      const speed = Math.hypot(ball.vx, ball.vy);
      trail.max = Math.min(MAX_TRAIL, Math.round(length * clamp(speed / BALL.speed, 0.5, 1.4)));
      trail.start = (trail.start + MAX_TRAIL - 1) % MAX_TRAIL;
      trail.xs[trail.start] = ball.x;
      trail.ys[trail.start] = ball.y;
      trail.count = Math.min(trail.count + 1, trail.max);
    }
    for (const id of trails.keys()) {
      if (!ids.has(id)) trails.delete(id);
    }
  }

  function update(dt) {
    recordTrails();
    screenFlash = Math.max(0, screenFlash - dt);
    // 命中凍結：只停特效層，遊戲邏輯照常
    if (hitStop > 0) {
      hitStop -= dt;
      return;
    }

    particles.forEachAlive((p) => {
      p.life -= dt;
      if (p.life <= 0) {
        p.alive = false;
        return;
      }
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.spin * dt;
    });
    texts.forEachAlive((t) => {
      t.life -= dt;
      if (t.life <= 0) t.alive = false;
      else t.y -= TEXT_RISE * dt;
    });
    for (const [brick, time] of flashes) {
      if (time - dt <= 0) flashes.delete(brick);
      else flashes.set(brick, time - dt);
    }
    shakeTime = Math.max(0, shakeTime - dt);
  }

  // 目前的震動幅度（邏輯單位），隨時間衰減到 0
  function shakeAmplitude() {
    return shakeTime > 0 ? shakeStrength * (shakeTime / SHAKE.duration) : 0;
  }

  function shakeOffset() {
    const amp = shakeAmplitude();
    if (amp === 0) return { x: 0, y: 0 };
    return { x: random(-amp, amp), y: random(-amp, amp) };
  }

  // ---- 繪製 ----

  function drawUnder(ctx) {
    ctx.fillStyle = getState().effects?.fireball ? "#ff922b" : "#f8f9fa";
    for (const trail of trails.values()) {
      for (let i = 1; i < trail.count; i++) {
        const index = (trail.start + i) % MAX_TRAIL;
        const t = 1 - i / trail.max;
        ctx.globalAlpha = 0.35 * t;
        ctx.beginPath();
        ctx.arc(trail.xs[index], trail.ys[index], BALL.radius * (0.4 + 0.6 * t), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  function drawBrickFlash(ctx) {
    for (const [brick, time] of flashes) {
      if (!brick.alive) continue;
      ctx.fillStyle = `rgba(255, 255, 255, ${(0.75 * time) / FLASH_TIME})`;
      ctx.fillRect(brick.x + brick.inset, brick.y + brick.inset, brick.w - brick.inset * 2, brick.h - brick.inset * 2);
    }
  }

  function drawOver(ctx) {
    particles.forEachAlive((p) => {
      ctx.globalAlpha = clamp(p.life / p.maxLife, 0, 1);
      ctx.fillStyle = p.color;
      if (p.confetti) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        ctx.restore();
      } else {
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      }
    });

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    texts.forEachAlive((t) => {
      ctx.globalAlpha = clamp(t.life / TEXT_TIME, 0, 1);
      ctx.font = `bold ${t.size}px system-ui, sans-serif`;
      ctx.lineWidth = 3;
      ctx.strokeStyle = "rgba(0, 0, 0, 0.6)";
      ctx.strokeText(t.text, t.x, t.y);
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, t.x, t.y);
    });
    ctx.globalAlpha = 1;

    if (screenFlash > 0) {
      const { width, height } = getState().field;
      ctx.fillStyle = `rgba(255, 255, 255, ${(0.35 * screenFlash) / SCREEN_FLASH_TIME})`;
      ctx.fillRect(0, 0, width, height);
    }
  }

  return {
    update,
    shakeOffset,
    shakeAmplitude,
    drawUnder,
    drawBrickFlash,
    drawOver,
    particleCount: particles.count,
    qualityLevel: () => quality().level,
  };
}
