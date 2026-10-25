// 球的速度與角度計算（純函式）。速度格式：{ vx, vy }。

import { DEG, clamp, angleToUpVector } from "../core/math.js";

export function normalizeSpeed(vx, vy, speed) {
  const len = Math.hypot(vx, vy);
  if (len === 0) return { vx: 0, vy: -speed };
  return { vx: (vx / len) * speed, vy: (vy / len) * speed };
}

// 避免球水平來回彈：與水平線的夾角至少 minAngleDeg，保留原本的方向
export function enforceMinVerticalAngle(vx, vy, minAngleDeg) {
  const speed = Math.hypot(vx, vy);
  if (speed === 0) return { vx, vy };
  const minVy = Math.sin(minAngleDeg * DEG) * speed;
  if (Math.abs(vy) >= minVy) return { vx, vy };
  const signY = vy < 0 ? -1 : 1; // vy 為 0 時往下，讓球回到板子
  const newVx = Math.sign(vx || 1) * Math.sqrt(speed * speed - minVy * minVy);
  return { vx: newVx, vy: signY * minVy };
}

// 依擊中板子的位置決定反彈角度：中間偏直、邊緣最多 ±maxAngleDeg
export function paddleBounce(ballX, paddleCenterX, paddleWidth, maxAngleDeg, speed) {
  const offset = clamp((ballX - paddleCenterX) / (paddleWidth / 2), -1, 1);
  const dir = angleToUpVector(offset * maxAngleDeg * DEG);
  return { vx: dir.x * speed, vy: dir.y * speed, offset };
}

// 沿法線反射，只在速度朝向表面時才反射
export function reflect(vx, vy, nx, ny) {
  const dot = vx * nx + vy * ny;
  if (dot >= 0) return { vx, vy };
  return { vx: vx - 2 * dot * nx, vy: vy - 2 * dot * ny };
}

// 把任意方向向量轉成合法的發射角（與正上方的夾角）；向量無效或朝下時用預設角或夾到邊界
export function clampLaunchAngle(dx, dy, maxAngleDeg, defaultAngleDeg = 0) {
  if (!Number.isFinite(dx) || !Number.isFinite(dy) || Math.hypot(dx, dy) < 1e-6) {
    return defaultAngleDeg * DEG;
  }
  const angle = Math.atan2(dx, -dy); // 0 = 正上方
  const max = maxAngleDeg * DEG;
  return clamp(angle, -max, max);
}

// 彈弓：拉的方向的反方向就是發射方向
export function slingshotAngle(pullDx, pullDy, maxAngleDeg, defaultAngleDeg = 0) {
  return clampLaunchAngle(-pullDx, -pullDy, maxAngleDeg, defaultAngleDeg);
}

// 每個 tick 要切成幾個子步驟，讓每步移動不超過半個球半徑
export function substepCount(distance, radius, ratio) {
  const maxMove = radius * ratio;
  return Math.max(1, Math.ceil(distance / maxMove));
}
