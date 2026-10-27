// 道具定義。新增道具在這裡加一筆，生效與結束行為寫在 src/game/game.js 的 EFFECTS 表。
// kind：instant 接到立即生效；timed 持續 duration 秒（遊戲時間），同種再接只刷新時間。
// weight：掉落權重。icon：膠囊與 HUD 共用的記號，除了顏色還能靠形狀分辨。

export const POWERUPS = {
  multiball: { id: "multiball", name: "多球", kind: "instant", weight: 3, color: "#4dabf7", icon: "⁂" },
  expand: { id: "expand", name: "加長", kind: "timed", duration: 12, weight: 3, color: "#69db7c", icon: "↔" },
  slow: { id: "slow", name: "減速", kind: "timed", duration: 10, weight: 3, color: "#ffd43b", icon: "◔" },
  fireball: { id: "fireball", name: "火球", kind: "timed", duration: 6, weight: 2, color: "#ff922b", icon: "▲" },
  magnet: { id: "magnet", name: "磁鐵", kind: "timed", duration: 12, weight: 2, color: "#f783ac", icon: "U" },
  extraLife: { id: "extraLife", name: "加一命", kind: "instant", weight: 1, color: "#ff6b6b", icon: "♥" },
};
