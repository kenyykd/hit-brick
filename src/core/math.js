export const DEG = Math.PI / 180;

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

// 角度以「與正上方的夾角」表示：0 = 正上方，正值偏右，負值偏左
export function angleToUpVector(angle) {
  return { x: Math.sin(angle), y: -Math.cos(angle) };
}

// 把向量旋轉 angle 弧度（畫面座標，正值順時針）
export function rotate(x, y, angle) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return { x: x * cos - y * sin, y: x * sin + y * cos };
}
