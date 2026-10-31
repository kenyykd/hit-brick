// 板子技能定義。施放與效果寫在 src/game/game.js；能量規則在 src/config.js 的 SKILL。

export const SKILLS = {
  shield: {
    id: "shield",
    name: "護盾",
    icon: "◡",
    color: "#22b8cf",
    bottomMargin: 36, // 護盾離場地底部的距離（在板子下方）
  },
  laser: {
    id: "laser",
    name: "雷射",
    icon: "↟",
    color: "#e599f7",
    duration: 4, // 秒（遊戲時間）
    interval: 0.25, // 每隔多久發射一對
    boltSpeed: 1100,
    boltSize: { w: 4, h: 16 },
    inset: 8, // 從板子兩端往內多少發射
  },
};
