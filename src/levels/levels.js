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
    targetMultiplier: 1, // 第 1 關三星要很容易：過關就達到目標分數
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

  // ---- 6～8：引入多次擊破磚 ----
  {
    id: 6,
    name: "硬磚初見",
    theme: "rainbow",
    ballSpeed: 735,
    layout: `
      .........
      NNNNNNNNN
      N2N2N2N2N
      NNNNNNNNN
    `,
  },
  {
    id: 7,
    name: "紫色城牆",
    theme: "ocean",
    ballSpeed: 750,
    layout: `
      222222222
      N.N.N.N.N
      NNNNNNNNN
      .2.2.2.2.
    `,
  },
  {
    id: 8,
    name: "三層蛋糕",
    theme: "sunset",
    ballSpeed: 765,
    layout: `
      ....33....
      ...2222...
      ..NNNNNN..
      .22222222.
      NNNNNNNNNN
    `,
  },

  // ---- 9～11：引入不可破壞磚 ----
  {
    id: 9,
    name: "鐵柱",
    theme: "rainbow",
    ballSpeed: 780,
    layout: `
      NNNNNNNNN
      N#NN#NN#N
      NNNNNNNNN
      N#NN#NN#N
      NNNNNNNNN
    `,
  },
  {
    id: 10,
    name: "笑臉",
    theme: "sunset",
    ballSpeed: 795,
    layout: `
      ..NNNNN..
      .NNNNNNN.
      NN#NNN#NN
      NNNNNNNNN
      N2NNNNN2N
      NN22222NN
      .NNNNNNN.
      ..NNNNN..
    `,
  },
  {
    id: 11,
    name: "迷宮",
    theme: "ocean",
    ballSpeed: 810,
    layout: `
      NNNNNNNNN
      ##NN#NN##
      N2NNNNN2N
      NNN###NNN
      NNNNNNNNN
    `,
  },

  // ---- 12～14：引入爆炸磚 ----
  {
    id: 12,
    name: "炸彈初登場",
    theme: "rainbow",
    ballSpeed: 825,
    layout: `
      NNNNNNNNN
      NN*NNN*NN
      NNNNNNNNN
      N*NN*NN*N
      NNNNNNNNN
    `,
  },
  {
    id: 13,
    name: "連鎖",
    targetMultiplier: 4.6, // 爆炸連鎖分數高，見平衡報告
    theme: "sunset",
    ballSpeed: 840,
    layout: `
      NNNNNNNNNN
      N********N
      NNNNNNNNNN
      2N2N2N2N2N
    `,
  },
  {
    id: 14,
    name: "炸藥庫",
    targetMultiplier: 1.7, // 爆炸連鎖分數高，見平衡報告
    theme: "ocean",
    ballSpeed: 855,
    layout: `
      #NNNNNNN#
      #N*N*N*N#
      #NNNNNNN#
      #*N*N*N*#
      ##N###N##
    `,
  },

  // ---- 15～20：組合運用，後期提高不可破壞磚比例 ----
  {
    id: 15,
    name: "星星",
    theme: "rainbow",
    ballSpeed: 870,
    layout: `
      ....3....
      ...NNN...
      NNNN*NNNN
      .NNN3NNN.
      ..NNNNN..
      .NN...NN.
      NN.....NN
    `,
  },
  {
    id: 16,
    name: "棋盤之二",
    theme: "ocean",
    ballSpeed: 885,
    layout: `
      3N3N3N3N3N
      N#N#N#N#N#
      *N*N*N*N*N
      N2N2N2N2N2
      NNNNNNNNNN
    `,
  },
  {
    id: 17,
    name: "堡壘",
    theme: "sunset",
    ballSpeed: 900,
    layout: `
      N3N3N3N3N
      NNNNNNNNN
      #N#####N#
      2N2*N*2N2
      NNNNNNNNN
    `,
  },
  {
    id: 18,
    name: "雙重防線",
    theme: "rainbow",
    ballSpeed: 900,
    layout: `
      NNNNNNNNNN
      *2*2**2*2*
      ##NN##NN##
      N33NNNN33N
      NNNN##NNNN
      NNNNNNNNNN
    `,
  },
  {
    id: 19,
    name: "鐵壁",
    targetMultiplier: 1.5, // 爆炸連鎖分數高，見平衡報告
    theme: "ocean",
    ballSpeed: 900,
    layout: `
      3*3*3*3*3
      NNNNNNNNN
      #N#N#N#N#
      N2N2N2N2N
      #NN#N#NN#
      NNNNNNNNN
    `,
  },
  {
    id: 20,
    name: "皇冠",
    theme: "sunset",
    ballSpeed: 900,
    layout: `
      N...NN...N
      3N.3333.N3
      22N3333N22
      2222**2222
      NNNNNNNNNN
      ##NNNNNN##
      NNNNNNNNNN
    `,
  },
];

// 球速隨關卡緩慢提升，上限 LEVEL_SPEED_CAP（測試會檢查）
export const LEVEL_SPEED_CAP = 900;

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
