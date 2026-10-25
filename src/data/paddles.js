// 板子定義。之後的雷射板、護盾板在這裡新增，不動核心。

export const PADDLES = {
  standard: {
    id: "standard",
    name: "標準板",
    width: 96,
    height: 16,
    color: "#e94f4f",
    maxBounceAngleDeg: 55,
    maxSpeed: 2600, // 板子追目標位置的最大速度（每秒邏輯單位）
    keyboardSpeed: 620, // 鍵盤移動速度
    dragSensitivity: 1.3, // 手機相對拖曳的倍率
  },
};
