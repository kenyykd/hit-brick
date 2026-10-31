// 板子定義。新增板子在這裡加一筆，不動核心。關卡以標準板為基準設計，其他板子再微調。
// skill：專屬技能（見 src/data/skills.js），null 表示沒有技能。解鎖條件在 src/data/unlocks.js。

export const PADDLES = {
  standard: {
    id: "standard",
    name: "標準板",
    description: "平衡的基本板子",
    width: 96,
    height: 16,
    color: "#e94f4f",
    maxBounceAngleDeg: 55,
    maxSpeed: 2600, // 板子追目標位置的最大速度（每秒邏輯單位）
    keyboardSpeed: 620, // 鍵盤移動速度
    dragSensitivity: 1.3, // 手機相對拖曳的倍率
    skill: null,
  },
  shield: {
    id: "shield",
    name: "護盾板",
    description: "技能：底部出現一道護盾，接住一次掉落的球",
    width: 96,
    height: 16,
    color: "#22b8cf",
    maxBounceAngleDeg: 55,
    maxSpeed: 2600,
    keyboardSpeed: 620,
    dragSensitivity: 1.3,
    skill: "shield",
  },
  laser: {
    id: "laser",
    name: "雷射板",
    description: "技能：4 秒內自動從兩端發射雷射",
    width: 88, // 比標準板窄一點，抵消雷射的威力
    height: 16,
    color: "#be4bdb",
    maxBounceAngleDeg: 55,
    maxSpeed: 2600,
    keyboardSpeed: 620,
    dragSensitivity: 1.3,
    skill: "laser",
  },
};
