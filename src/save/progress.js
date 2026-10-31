// 關卡進度（純函式）：線性解鎖、各關最高分、板子解鎖。星星的計算在階段 7 加入。

import { UNLOCKS } from "../data/unlocks.js";

export function totalStars(save) {
  return Object.values(save.levels).reduce((sum, record) => sum + record.stars, 0);
}

// 回傳還差幾顆星才能用這塊板子（0 表示已解鎖）
export function starsNeededForPaddle(save, paddleId) {
  const required = UNLOCKS.paddles[paddleId] ?? Infinity;
  return Math.max(0, required - totalStars(save));
}

export function isPaddleUnlocked(save, paddleId) {
  return starsNeededForPaddle(save, paddleId) === 0;
}

export function isLevelUnlocked(save, levelId) {
  return levelId <= save.unlockedLevel;
}

export function levelRecord(save, levelId) {
  return save.levels[levelId] ?? { bestScore: 0, cleared: false, stars: 0 };
}

// 過關才記錄最高分並解鎖下一關；回傳是否刷新紀錄
export function recordLevelClear(save, levelId, score) {
  const previous = levelRecord(save, levelId);
  const isNewBest = score > previous.bestScore;
  save.levels[levelId] = {
    ...previous,
    bestScore: Math.max(previous.bestScore, score),
    cleared: true,
  };
  save.unlockedLevel = Math.max(save.unlockedLevel, levelId + 1);
  return { isNewBest, previousBest: previous.bestScore };
}
