// 關卡資料。新增一關只要在 LEVELS 加一筆。
// 字元：. 空格、N 普通、2 / 3 多次擊破、# 不可破壞、* 爆炸（見 src/data/brick-types.js）
// 每列字元數要一樣，欄數 9～10。
// 目標分數自動計算（見 src/levels/target.js）；要個別調整可加 targetMultiplier 或 targetScore。

export const LEVELS = [
  {
    id: 1,
    name: "暖身",
    theme: "rainbow",
    ballSpeed: 600,
    targetMultiplier: 1.2, // 第 1 關三星要很容易
    layout: `
      .........
      .NNNNNNN.
      .NNNNNNN.
      .NNNNNNN.
    `,
  },
  {
    id: 2,
    name: "金字塔",
    theme: "sunset",
    ballSpeed: 630,
    layout: `
      ....NN....
      ...NNNN...
      ..NNNNNN..
      .NNNNNNNN.
      NNNNNNNNNN
    `,
  },
  {
    id: 3,
    name: "雙塔",
    theme: "ocean",
    ballSpeed: 660,
    layout: `
      NN.....NN
      NN.....NN
      NN..N..NN
      NN.NNN.NN
      NNNNNNNNN
    `,
  },
  {
    id: 4,
    name: "棋盤",
    theme: "rainbow",
    ballSpeed: 690,
    layout: `
      N.N.N.N.N
      .N.N.N.N.
      N.N.N.N.N
      .N.N.N.N.
      N.N.N.N.N
      .N.N.N.N.
    `,
  },
  {
    id: 5,
    name: "愛心",
    theme: "sunset",
    ballSpeed: 720,
    layout: `
      .NN...NN.
      NNNN.NNNN
      NNNNNNNNN
      NNNNNNNNN
      .NNNNNNN.
      ..NNNNN..
      ...NNN...
      ....N....
    `,
  },
];

// 除錯用沙盒關（網址 ?debug&level=sandbox），四種磚都有
export const SANDBOX_LEVEL = {
  id: "sandbox",
  name: "沙盒",
  theme: "rainbow",
  ballSpeed: 720,
  layout: `
    *N*N*N*N*
    333333333
    222222222
    NNN###NNN
    *.*.*.*.*
  `,
};
