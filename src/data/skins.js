// 皮膚：純外觀，不影響判定與速度。和板子（手感、技能）分開。
// 全部用 Canvas 程式畫，不載入圖檔；style 決定畫法（見 src/render/renderer.js）。
// 解鎖條件在 src/data/unlocks.js。

export const BALL_SKINS = {
  classic: { id: "classic", name: "經典白", color: "#f8f9fa", style: "plain" },
  gold: { id: "gold", name: "黃金", color: "#fcc419", style: "shine" },
  neon: { id: "neon", name: "霓虹", color: "#66d9e8", style: "glow" },
  pixel: { id: "pixel", name: "像素", color: "#8ce99a", style: "pixel" },
};

// 板子外觀套在板子本身的顏色上
export const PADDLE_SKINS = {
  solid: { id: "solid", name: "純色", style: "solid" },
  stripes: { id: "stripes", name: "條紋", style: "stripes" },
  gradient: { id: "gradient", name: "漸層", style: "gradient" },
  glow: { id: "glow", name: "發光", style: "glow" },
};
