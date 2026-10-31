// 關卡進度（純函式）：線性解鎖、各關最高分與星星、用星星解鎖板子與皮膚。

import { UNLOCKS } from "../data/unlocks.js";

export function totalStars(save) {
  return Object.values(save.levels).reduce((sum, record) => sum + record.stars, 0);
}

// 還差幾顆星才能用（0 表示已解鎖）。kind：paddles / ballSkins / paddleSkins
export function starsNeeded(save, kind, id) {
  const required = UNLOCKS[kind]?.[id] ?? Infinity;
  return Math.max(0, required - totalStars(save));
}

export function isUnlocked(save, kind, id) {
  return starsNeeded(save, kind, id) === 0;
}

export function starsNeededForPaddle(save, paddleId) {
  return starsNeeded(save, "paddles", paddleId);
}

export function isPaddleUnlocked(save, paddleId) {
  return isUnlocked(save, "paddles", paddleId);
}

// 目前已解鎖的所有項目，例如 ["paddles:shield", "ballSkins:gold"]
export function unlockedItems(save) {
  const items = [];
  for (const [kind, table] of Object.entries(UNLOCKS)) {
    for (const id of Object.keys(table)) {
      if (isUnlocked(save, kind, id)) items.push(`${kind}:${id}`);
    }
  }
  return items;
}

export function isLevelUnlocked(save, levelId) {
  return levelId <= save.unlockedLevel;
}

export function levelRecord(save, levelId) {
  return save.levels[levelId] ?? { bestScore: 0, cleared: false, stars: 0 };
}

// 過關 1 顆、達到目標分數 1 顆、沒失去生命 1 顆
export function computeStars({ score, target, livesLost }) {
  return 1 + (score >= target ? 1 : 0) + (livesLost === 0 ? 1 : 0);
}

// 過關才記錄。最高分與星星都取歷史最佳（只增不減），並解鎖下一關
export function recordLevelClear(save, levelId, { score, target, livesLost }) {
  const previous = levelRecord(save, levelId);
  const stars = computeStars({ score, target, livesLost });
  save.levels[levelId] = {
    bestScore: Math.max(previous.bestScore, score),
    cleared: true,
    stars: Math.max(previous.stars, stars),
  };
  save.unlockedLevel = Math.max(save.unlockedLevel, levelId + 1);
  return {
    isNewBest: score > previous.bestScore,
    previousBest: previous.bestScore,
    stars,
    previousStars: previous.stars,
  };
}
