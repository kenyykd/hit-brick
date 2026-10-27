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

export const BRICK_LAYOUT = {
  top: 96, // 磚區上緣，上方留給 HUD
  gap: 6, // 只用於繪製的間隙
  cellHeightRatio: 0.5, // 格子高度 = 格子寬度 × 比例
  minCellHeight: 26, // 必須大於球的直徑
};
