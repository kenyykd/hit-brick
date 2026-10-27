import { paddleCenter } from "./paddle.js";

let nextId = 1;

// 黏在板子上的球；stuckOffset 是相對板子中心的位置（磁鐵與多球黏在板上時會用到）
export function createStuckBall(paddle, radius, stuckOffset = 0) {
  const ball = {
    id: nextId++,
    x: 0,
    y: 0,
    prevX: 0,
    prevY: 0,
    vx: 0,
    vy: 0,
    r: radius,
    stuck: true,
    stuckOffset,
  };
  followPaddle(ball, paddle);
  ball.prevX = ball.x;
  ball.prevY = ball.y;
  return ball;
}

// 從另一顆球的位置分出一顆新球（多球道具）
export function splitBall(source, vx, vy) {
  return { ...source, id: nextId++, vx, vy, stuck: false, stuckOffset: 0 };
}

export function followPaddle(ball, paddle) {
  ball.x = paddleCenter(paddle) + ball.stuckOffset;
  ball.y = paddle.y - ball.r;
}
