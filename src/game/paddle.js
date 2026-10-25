import { clamp } from "../core/math.js";

export function createPaddle(def, fieldWidth, y) {
  const x = (fieldWidth - def.width) / 2;
  return { def, x, prevX: x, y, width: def.width, height: def.height };
}

export function paddleCenter(paddle) {
  return paddle.x + paddle.width / 2;
}

// 往目標中心點移動，速度有上限，並夾在場地內
export function updatePaddle(paddle, targetCenterX, dt, fieldWidth) {
  paddle.prevX = paddle.x;
  const targetX = clamp(targetCenterX - paddle.width / 2, 0, fieldWidth - paddle.width);
  const maxMove = paddle.def.maxSpeed * dt;
  paddle.x = clamp(paddle.x + clamp(targetX - paddle.x, -maxMove, maxMove), 0, fieldWidth - paddle.width);
}
