// 關卡進度（純函式）：線性解鎖、各關最高分。星星在階段 7 加入。

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
