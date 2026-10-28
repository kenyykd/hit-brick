// 關卡主題：只影響外觀。普通磚依列數輪流使用 rows 的顏色。
// rows 要避開下面 BRICK_COLORS 用到的紫色系、灰色與深色，避免和特殊磚混淆。

export const THEMES = {
  rainbow: {
    field: "#141927",
    rows: ["#ff6b6b", "#ffa94d", "#ffd43b", "#69db7c", "#4dabf7", "#20c997"],
  },
  ocean: {
    field: "#0f1b2a",
    rows: ["#4dabf7", "#3bc9db", "#38d9a9", "#74c0fc", "#66d9e8"],
  },
  sunset: {
    field: "#1d1424",
    rows: ["#ff8787", "#ffa94d", "#f783ac", "#ffc078", "#ffd8a8"],
  },
};

// 種類固定的磚塊顏色（不隨主題變化，方便辨認）
export const BRICK_COLORS = {
  tough: { 3: "#7048e8", 2: "#9775fa", 1: "#d0bfff" },
  steel: "#868e96",
  explosive: "#3b1f1f", // 深色底，配亮橘色核心
  explosiveCore: "#ff7a2f",
};

// 磚塊的顯示顏色（繪製與破碎粒子共用）
export function brickColor(brick, theme) {
  if (brick.type === "tough") return BRICK_COLORS.tough[brick.hp] ?? BRICK_COLORS.tough[1];
  if (brick.type === "steel") return BRICK_COLORS.steel;
  if (brick.type === "explosive") return BRICK_COLORS.explosive;
  return theme.rows[brick.row % theme.rows.length];
}
