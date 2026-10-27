// Canvas 繪製。只讀遊戲狀態，不改任何東西；球與板子用 alpha 在上一個與目前 tick 之間內插。

import { angleToUpVector, lerp } from "../core/math.js";
import { POWERUPS } from "../data/powerups.js";
import { BRICK_COLORS, THEMES } from "../data/themes.js";

const COLORS = {
  ball: "#f8f9fa",
  fireball: "#ff922b",
  magnet: "#f783ac",
  capsuleIcon: "#141927",
  mark: "rgba(0, 0, 0, 0.35)",
  aim: "rgba(255, 255, 255, 0.75)",
  pull: "rgba(255, 255, 255, 0.3)",
  pullInvalid: "rgba(255, 120, 120, 0.4)",
};

const AIM_LENGTH = 150;

export function createRenderer(canvas) {
  const ctx = canvas.getContext("2d");

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
    else ctx.rect(x, y, w, h);
    ctx.fill();
  }

  function brickColor(b, theme) {
    if (b.type === "tough") return BRICK_COLORS.tough[b.hp] ?? BRICK_COLORS.tough[1];
    if (b.type === "steel") return BRICK_COLORS.steel;
    if (b.type === "explosive") return BRICK_COLORS.explosive;
    return theme.rows[b.row % theme.rows.length];
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

  function drawPaddle(paddle, alpha, magnet) {
    const x = lerp(paddle.prevX, paddle.x, alpha);
    ctx.fillStyle = paddle.def.color;
    roundRect(x, paddle.y, paddle.width, paddle.height, paddle.height / 2);
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

  function drawBalls(balls, alpha, fire) {
    ctx.fillStyle = fire ? COLORS.fireball : COLORS.ball;
    for (const ball of balls) {
      ctx.beginPath();
      ctx.arc(lerp(ball.prevX, ball.x, alpha), lerp(ball.prevY, ball.y, alpha), ball.r, 0, Math.PI * 2);
      ctx.fill();
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

  function draw(state, { alpha, aim, layout }) {
    const { width, height } = state.field;
    ctx.setTransform(layout.pixelWidth / width, 0, 0, layout.pixelHeight / height, 0, 0);
    const theme = THEMES[state.level.theme];
    ctx.fillStyle = theme.field;
    ctx.fillRect(0, 0, width, height);

    drawBricks(state.bricks, theme);
    drawCapsules(state.capsules, alpha);
    drawPaddle(state.paddle, alpha, Object.hasOwn(state.effects, "magnet"));
    drawAim(state.balls, aim);
    drawBalls(state.balls, alpha, Object.hasOwn(state.effects, "fireball"));
  }

  return { ctx, draw };
}
