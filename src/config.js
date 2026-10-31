// 遊戲數值集中在這裡，實際遊玩後再調整。長度單位都是「邏輯單位」。

export const FIELD = {
  width: 540,
  minHeight: 960, // 9:16
  maxHeight: 1200, // 9:20
  paddleBottomMargin: 110, // 板子離底部的距離，避開系統手勢區
};

export const LOOP = {
  step: 1 / 120, // 固定 120Hz 邏輯更新
  maxStepsPerFrame: 8,
  maxFrameTime: 0.25, // 單幀最多累積的秒數
};

export const BALL = {
  radius: 9,
  speed: 720, // 每秒移動的邏輯單位
  maxSpeed: 1400,
  maxSubstepRatio: 0.5, // 每個子步驟最多移動半個球半徑
  minVerticalAngleDeg: 15, // 與水平線的最小夾角
  // 防卡死：球太久沒碰到板子也沒打到可破壞的磚（例如在不可破壞磚上方繞固定的軌道），
  // 下次反彈時隨機偏轉一點角度；沒進展就每隔 retrySeconds 再偏一次
  antiLoop: { idleSeconds: 6, retrySeconds: 1, nudgeMinDeg: 4, nudgeMaxDeg: 10 },
};

export const LAUNCH = {
  maxAngleDeg: 70, // 與正上方的最大夾角
  defaultAngleDeg: 0,
  keyboardAimSpeedDeg: 90, // 鍵盤調瞄準的每秒角速度
  dragThresholdPx: 12, // 超過這個 CSS 像素才算拖曳，否則算點擊
};

export const RENDER = {
  maxPixelRatio: 2,
};

export const GAME = {
  startLives: 3,
  maxLives: 5,
  resumeCountdown: 3, // 暫停恢復前的倒數秒數
};

// 星星：過關 1 顆、達到目標分數 1 顆、沒失去生命 1 顆。
// 目標分數 = 可破壞磚的基礎總分 × 倍數（要靠連擊才拿得到），關卡可個別覆寫
export const STARS = {
  targetMultiplier: 1.2, // 依平衡報告：普通打法約 1.0～1.3 倍，要有連擊才拿得到
};

export const COMBO = {
  step: 5, // 每幾連擊加 1 倍
  maxMultiplier: 4,
};

export const POWERUP = {
  dropRate: 0.12, // 每打破一塊磚掉膠囊的機率
  pity: 12, // 連續這麼多塊沒掉，這一塊必掉
  maxCapsules: 3, // 場上同時最多幾顆膠囊
  capsuleSpeed: 220,
  capsuleSize: { w: 44, h: 20 },
  maxBalls: 8,
  multiballSpreadDeg: 20, // 多球分出去的球偏轉角度
  expandFactor: 1.5,
  slowFactor: 0.7,
};

// 技能能量 0～1：打磚為主、時間為輔；時間最多只能充到 timeCap，不打磚就不能一直放技能
export const SKILL = {
  energyPerBrick: 1 / 15, // 約打 15 塊磚集滿（雷射打掉的磚不算）
  energyPerSecond: 0.01, // 球在飛的時候才會隨時間充能
  timeCap: 0.3,
};

export const BRICK_LAYOUT = {
  top: 96, // 磚區上緣，上方留給 HUD
  gap: 6, // 只用於繪製的間隙
  cellHeightRatio: 0.5, // 格子高度 = 格子寬度 × 比例
  minCellHeight: 26, // 必須大於球的直徑
};
