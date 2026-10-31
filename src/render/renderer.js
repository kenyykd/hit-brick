// Canvas 繪製。只讀遊戲狀態，不改任何東西；球與板子用 alpha 在上一個與目前 tick 之間內插。

import { angleToUpVector, lerp } from "../core/math.js";
import { POWERUPS } from "../data/powerups.js";
import { SKILLS } from "../data/skills.js";
import { BALL_SKINS, PADDLE_SKINS } from "../data/skins.js";
import { BRICK_COLORS, THEMES, brickColor } from "../data/themes.js";

const DEFAULT_SKINS = { ball: BALL_SKINS.classic, paddle: PADDLE_SKINS.solid };

const COLORS = {
  fireball: "#ff922b",
  magnet: "#f783ac",
  capsuleIcon: "#141927",
  mark: "rgba(0, 0, 0, 0.35)",
  aim: "rgba(255, 255, 255, 0.75)",
  pull: "rgba(255, 255, 255, 0.3)",
  pullInvalid: "rgba(255, 120, 120, 0.4)",
};

const AIM_LENGTH = 150;
const SHAKE_MARGIN = 20; // 震動時背景多畫一圈，邊緣才不會露出空白

export function createRenderer(canvas) {
  const ctx = canvas.getContext("2d");

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
    else ctx.rect(x, y, w, h);
    ctx.fill();
  }

  // 除了顏色，每種磚還有形狀記號，色盲也能分辨
  function drawBrickMark(b, x, y, w, h) {
    const cx = x + w / 2;
    const cy = y + h / 2;
    ctx.fillStyle = COLORS.mark;
    ctx.strokeStyle = COLORS.mark;
    if (b.type === "explosive") {
      ctx.fillStyle = BRICK_COLORS.explosiveCore;
      ctx.beginPath();
      ctx.arc(cx, cy, h * 0.3, 0, Math.PI * 2);
      ctx.fill();
    } else if (b.type === "steel") {
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 4, y + 4, w - 8, h - 8);
    } else if (b.type === "tough") {
      // 剩幾下就畫幾個點
      const spacing = 9;
      const startX = cx - ((b.hp - 1) * spacing) / 2;
      for (let i = 0; i < b.hp; i++) {
        ctx.beginPath();
        ctx.arc(startX + i * spacing, cy, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function drawBricks(bricks, theme) {
    for (const b of bricks) {
      if (!b.alive) continue;
      const x = b.x + b.inset;
      const y = b.y + b.inset;
      const w = b.w - b.inset * 2;
      const h = b.h - b.inset * 2;
      ctx.fillStyle = brickColor(b, theme);
      roundRect(x, y, w, h, 4);
      drawBrickMark(b, x, y, w, h);
    }
  }

  // 板子外觀：套在板子本身的顏色上（純外觀，判定框不變）
  function drawPaddleSkin(skin, color, x, y, w, h) {
    const r = h / 2;
    ctx.save();
    if (skin.style === "glow") {
      ctx.shadowColor = color;
      ctx.shadowBlur = 14;
    }
    ctx.fillStyle = color;
    roundRect(x, y, w, h, r);
    ctx.shadowBlur = 0;
    if (skin.style === "stripes") {
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
      else ctx.rect(x, y, w, h);
      ctx.clip();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
      ctx.lineWidth = 4;
      for (let sx = x - h; sx < x + w; sx += 12) {
        ctx.beginPath();
        ctx.moveTo(sx, y + h);
        ctx.lineTo(sx + h, y);
        ctx.stroke();
      }
    } else if (skin.style === "gradient") {
      const g = ctx.createLinearGradient(x, y, x, y + h);
      g.addColorStop(0, "rgba(255, 255, 255, 0.55)");
      g.addColorStop(0.5, "rgba(255, 255, 255, 0)");
      g.addColorStop(1, "rgba(0, 0, 0, 0.3)");
      ctx.fillStyle = g;
      roundRect(x, y, w, h, r);
    }
    ctx.restore();
  }

  function drawPaddle(paddle, alpha, magnet, skin) {
    const x = lerp(paddle.prevX, paddle.x, alpha);
    drawPaddleSkin(skin, paddle.def.color, x, paddle.y, paddle.width, paddle.height);
    if (magnet) {
      ctx.fillStyle = COLORS.magnet;
      roundRect(x + 6, paddle.y - 2, paddle.width - 12, 4, 2);
    }
  }

  // 膠囊：顏色加記號，色盲也能分辨
  function drawCapsules(capsules, alpha) {
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const c of capsules) {
      const def = POWERUPS[c.type];
      const y = lerp(c.prevY, c.y, alpha);
      ctx.fillStyle = def.color;
      roundRect(c.x, y, c.w, c.h, c.h / 2);
      ctx.fillStyle = COLORS.capsuleIcon;
      ctx.font = `bold ${Math.round(c.h * 0.8)}px system-ui, sans-serif`;
      ctx.fillText(def.icon, c.x + c.w / 2, y + c.h / 2 + 1);
    }
  }

  // 護盾：板子下方一條橫跨場地的亮線
  function drawShield(state) {
    if (!state.shield) return;
    const y = state.field.height - SKILLS.shield.bottomMargin;
    ctx.fillStyle = SKILLS.shield.color;
    ctx.globalAlpha = 0.25;
    ctx.fillRect(0, y - 4, state.field.width, 12);
    ctx.globalAlpha = 1;
    ctx.fillRect(0, y, state.field.width, 4);
  }

  function drawBolts(bolts, alpha) {
    ctx.fillStyle = SKILLS.laser.color;
    for (const bolt of bolts) {
      roundRect(bolt.x, lerp(bolt.prevY, bolt.y, alpha), bolt.w, bolt.h, bolt.w / 2);
    }
  }

  // 球的外觀（純外觀）。火球生效時一律畫成橘色圓球：那是遊戲資訊，皮膚不能蓋掉
  function drawBall(skin, x, y, r, fire) {
    if (fire) {
      ctx.fillStyle = COLORS.fireball;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    if (skin.style === "pixel") {
      // 8-bit 方塊球：外框加亮色內塊
      ctx.fillStyle = skin.color;
      ctx.fillRect(x - r, y - r * 0.6, r * 2, r * 1.2);
      ctx.fillRect(x - r * 0.6, y - r, r * 1.2, r * 2);
      ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
      ctx.fillRect(x - r * 0.5, y - r * 0.6, r * 0.4, r * 0.4);
      return;
    }
    ctx.save();
    if (skin.style === "glow") {
      ctx.shadowColor = skin.color;
      ctx.shadowBlur = 12;
    }
    if (skin.style === "shine") {
      const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
      g.addColorStop(0, "#fff9db");
      g.addColorStop(1, skin.color);
      ctx.fillStyle = g;
    } else {
      ctx.fillStyle = skin.color;
    }
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawBalls(balls, alpha, fire, skin) {
    for (const ball of balls) {
      drawBall(skin, lerp(ball.prevX, ball.x, alpha), lerp(ball.prevY, ball.y, alpha), ball.r, fire);
    }
  }

  function drawAim(balls, aim) {
    if (!aim.holding) return;

    if (aim.pull) {
      ctx.strokeStyle = aim.valid ? COLORS.pull : COLORS.pullInvalid;
      ctx.lineWidth = 3;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(aim.pull.start.x, aim.pull.start.y);
      ctx.lineTo(aim.pull.current.x, aim.pull.current.y);
      ctx.stroke();
    }
    if (!aim.valid) return;

    const dir = angleToUpVector(aim.angle);
    ctx.strokeStyle = COLORS.aim;
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 8]);
    for (const ball of balls) {
      if (!ball.stuck) continue;
      ctx.beginPath();
      ctx.moveTo(ball.x, ball.y);
      ctx.lineTo(ball.x + dir.x * AIM_LENGTH, ball.y + dir.y * AIM_LENGTH);
      ctx.stroke();
    }
    ctx.setLineDash([]);
  }

  // fx：特效層（可省略）；畫面震動只是整個畫面平移，不影響判定
  // skins：{ ball, paddle } 皮膚，省略時用預設外觀
  function draw(state, { alpha, aim, layout, fx, skins = DEFAULT_SKINS }) {
    const { width, height } = state.field;
    const sx = layout.pixelWidth / width;
    const sy = layout.pixelHeight / height;
    const shake = fx?.shakeOffset() ?? { x: 0, y: 0 };
    ctx.setTransform(sx, 0, 0, sy, shake.x * sx, shake.y * sy);
    const theme = THEMES[state.level.theme];
    ctx.fillStyle = theme.field;
    ctx.fillRect(-SHAKE_MARGIN, -SHAKE_MARGIN, width + SHAKE_MARGIN * 2, height + SHAKE_MARGIN * 2);

    drawBricks(state.bricks, theme);
    fx?.drawBrickFlash(ctx);
    drawCapsules(state.capsules, alpha);
    drawShield(state);
    drawBolts(state.bolts, alpha);
    drawPaddle(state.paddle, alpha, Object.hasOwn(state.effects, "magnet"), skins.paddle);
    fx?.drawUnder(ctx);
    drawAim(state.balls, aim);
    drawBalls(state.balls, alpha, Object.hasOwn(state.effects, "fireball"), skins.ball);
    fx?.drawOver(ctx);
  }

  return { ctx, draw };
}
