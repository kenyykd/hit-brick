// 成就追蹤：只訂閱事件、只寫存檔，不碰遊戲邏輯。拿掉整個模組遊戲照常。
// 統計（接過的道具、雷射打破的磚、過關用過的板子）先更新，再檢查成就條件。

import { ACHIEVEMENTS } from "../data/achievements.js";

// 雷射打破的磚數到「雷射工程師」的門檻就不再增加，之後不用每塊磚都寫存檔
export const LASER_STAT_CAP = 50;

// 事件 → 要更新的統計。回傳新的統計物件，沒變就回傳原本的
export function updateStats(stats, type, payload) {
  if (type === "powerupCollected" && !stats.powerups.includes(payload.type)) {
    return { ...stats, powerups: [...stats.powerups, payload.type] };
  }
  if (type === "brickDestroyed" && payload.source === "laser" && stats.laserBricks < LASER_STAT_CAP) {
    return { ...stats, laserBricks: stats.laserBricks + 1 };
  }
  if (type === "levelCleared" && payload.paddleId && !stats.paddlesCleared.includes(payload.paddleId)) {
    return { ...stats, paddlesCleared: [...stats.paddlesCleared, payload.paddleId] };
  }
  return stats;
}

// 這個事件會讓哪些還沒達成的成就達成
export function checkAchievements(type, payload, ctx, unlocked) {
  return ACHIEVEMENTS.filter((a) => a.on === type && !unlocked.includes(a.id) && a.check(payload, ctx));
}

// getContext()：遊戲當下的狀態（totalStars、allCleared、ballCount、fireball）
export function createAchievementTracker({ events, store, getContext, onUnlock }) {
  const types = new Set([...ACHIEVEMENTS.map((a) => a.on), "powerupCollected", "brickDestroyed", "levelCleared"]);

  function handle(type, payload) {
    const before = store.data.stats;
    const stats = updateStats(before, type, payload);
    if (stats !== before) {
      store.update((s) => {
        s.stats = stats;
      });
    }
    const ctx = { ...getContext(), stats: store.data.stats };
    const reached = checkAchievements(type, payload, ctx, store.data.achievements);
    if (reached.length === 0) return;
    store.update((s) => {
      s.achievements.push(...reached.map((a) => a.id));
    });
    for (const achievement of reached) onUnlock(achievement);
  }

  for (const type of types) events.on(type, (payload) => handle(type, payload));
}
