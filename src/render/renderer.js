// Canvas 繪製。只讀遊戲狀態，不改任何東西；球與板子用 alpha 在上一個與目前 tick 之間內插。

import { angleToUpVector, lerp } from "../core/math.js";

const COLORS = {
  field: "#141927",
  ball: "#f8f9fa",
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

  function drawBricks(bricks) {
    for (const b of bricks) {
      if (!b.alive) continue;
      ctx.fillStyle = b.color;
      roundRect(b.x + b.inset, b.y + b.inset, b.w - b.inset * 2, b.h - b.inset * 2, 4);
    }
  }

  function drawPaddle(paddle, alpha) {
    ctx.fillStyle = paddle.def.color;
    roundRect(lerp(paddle.prevX, paddle.x, alpha), paddle.y, paddle.width, paddle.height, paddle.height / 2);
  }

  function drawBalls(balls, alpha) {
    ctx.fillStyle = COLORS.ball;
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
    ctx.fillStyle = COLORS.field;
    ctx.fillRect(0, 0, width, height);

    drawBricks(state.bricks);
    drawPaddle(state.paddle, alpha);
    drawAim(state.balls, aim);
    drawBalls(state.balls, alpha);
  }

  return { ctx, draw };
}
