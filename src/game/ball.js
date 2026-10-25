import { paddleCenter } from "./paddle.js";

let nextId = 1;

// 黏在板子上的球；stuckOffset 是相對板子中心的位置（之後磁鐵道具會用到）
export function createStuckBall(paddle, radius) {
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
    stuckOffset: 0,
  };
  followPaddle(ball, paddle);
  ball.prevX = ball.x;
  ball.prevY = ball.y;
  return ball;
}

export function followPaddle(ball, paddle) {
  ball.x = paddleCenter(paddle) + ball.stuckOffset;
  ball.y = paddle.y - ball.r;
}
