// 成就定義：事件驅動，新增成就只要加一筆。
// on：要聽的事件；check(payload, ctx)：回傳 true 就達成。
// ctx 由成就追蹤器提供：{ stats, totalStars, allCleared, ballCount, fireball }。
// 原則：不做鼓勵拖延或鑽漏洞的成就（例如「撐過 10 分鐘」）。

export const ACHIEVEMENT_CATEGORIES = {
  progress: "進度",
  skill: "技巧",
  explore: "探索",
};

export const ACHIEVEMENTS = [
  // ---- 進度 ----
  { id: "first-clear", category: "progress", name: "第一步", description: "第一次過關", on: "levelRecorded", check: () => true },
  { id: "clear-5", category: "progress", name: "漸入佳境", description: "通過第 5 關", on: "levelRecorded", check: (e) => e.levelId === 5 },
  { id: "three-stars", category: "progress", name: "完美表現", description: "任一關拿到 3 顆星", on: "levelRecorded", check: (e) => e.stars === 3 },
  { id: "stars-10", category: "progress", name: "星星收藏家", description: "累積 10 顆星", on: "levelRecorded", check: (e, ctx) => ctx.totalStars >= 10 },
  { id: "all-clear", category: "progress", name: "全破", description: "通過所有關卡", on: "levelRecorded", check: (e, ctx) => ctx.allCleared },

  // ---- 技巧 ----
  { id: "combo-15", category: "skill", name: "連擊大師", description: "連擊達到 15（4 倍）", on: "comboChanged", check: (e) => e.combo >= 15 },
  { id: "chain-8", category: "skill", name: "連鎖反應", description: "一次爆炸打破 8 塊以上的磚", on: "chainResolved", check: (e) => e.count >= 8 },
  { id: "flawless", category: "skill", name: "零失誤", description: "不失去任何生命過一關", on: "levelCleared", check: (e) => e.livesLost === 0 },
  { id: "target", category: "skill", name: "高分達標", description: "達到任一關的目標分數", on: "levelCleared", check: (e) => e.score >= e.targetScore },
  { id: "multiball-8", category: "skill", name: "滿場飛", description: "場上同時有 8 顆球", on: "powerupCollected", check: (e, ctx) => ctx.ballCount >= 8 },
  { id: "shield-save", category: "skill", name: "千鈞一髮", description: "用護盾接住一顆球", on: "shieldHit", check: () => true },

  // ---- 探索 ----
  { id: "all-powerups", category: "explore", name: "道具收藏家", description: "接過全部 6 種道具", on: "powerupCollected", check: (e, ctx) => ctx.stats.powerups.length >= 6 },
  { id: "fire-steel", category: "explore", name: "燒不動", description: "用火球撞上不可破壞的磚", on: "brickHit", check: (e, ctx) => !e.brick.breakable && ctx.fireball },
  { id: "laser-50", category: "explore", name: "雷射工程師", description: "用雷射累計打破 50 塊磚", on: "brickDestroyed", check: (e, ctx) => ctx.stats.laserBricks >= 50 },
  { id: "all-paddles", category: "explore", name: "全能選手", description: "三種板子都至少過關一次", on: "levelCleared", check: (e, ctx) => ctx.stats.paddlesCleared.length >= 3 },
];

export const ACHIEVEMENT_IDS = ACHIEVEMENTS.map((a) => a.id);
