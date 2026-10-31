// 目標分數（純函式）：不用每關手算，新增關卡時自動得到合理的目標。

import { STARS } from "../config.js";

// 可破壞磚的基礎總分（不含連擊倍率與爆炸連鎖加分）
export function baseScore(bricks) {
  return bricks.filter((b) => b.breakable).reduce((sum, b) => sum + b.score, 0);
}

// 關卡有 targetScore 就直接用；否則用 targetMultiplier（或預設倍數）乘上基礎總分，取到十位
export function targetScore(level, bricks) {
  if (Number.isFinite(level.targetScore)) return level.targetScore;
  const multiplier = level.targetMultiplier ?? STARS.targetMultiplier;
  return Math.round((baseScore(bricks) * multiplier) / 10) * 10;
}
