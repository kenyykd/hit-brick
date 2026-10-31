// 解鎖條件集中在這張表：累積多少顆星星可以使用。
// 首發 20 關最多 60 顆星；目前做好的關卡較少，後面的項目要等關卡補完才拿得到。

export const UNLOCKS = {
  paddles: {
    standard: 0,
    shield: 10,
    laser: 25,
  },
  ballSkins: {
    classic: 0,
    gold: 3,
    neon: 9,
    pixel: 18,
  },
  paddleSkins: {
    solid: 0,
    stripes: 6,
    gradient: 14,
    glow: 30,
  },
};

export const UNLOCK_KINDS = {
  paddles: "板子",
  ballSkins: "球的外觀",
  paddleSkins: "板子外觀",
};
