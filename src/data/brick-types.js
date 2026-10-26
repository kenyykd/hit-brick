// 磚塊種類與關卡文字的對應。新增磚塊只改這裡，不動核心。

export const BRICK_TYPES = {
  normal: { hp: 1, breakable: true, explosive: false, score: 10 },
  tough: { hp: 2, breakable: true, explosive: false, score: 10 }, // 分數 = score × 最大耐久
  steel: { hp: Infinity, breakable: false, explosive: false, score: 0 },
  explosive: { hp: 1, breakable: true, explosive: true, score: 15 },
};

// 關卡文字中的字元 → 磚塊種類（hp 可覆寫種類預設值）
export const BRICK_CHARS = {
  N: { type: "normal" },
  2: { type: "tough", hp: 2 },
  3: { type: "tough", hp: 3 },
  "#": { type: "steel" },
  "*": { type: "explosive" },
};

export const EMPTY_CHAR = ".";

// 爆炸連鎖每多一層，被炸掉的磚多給的分數
export const CHAIN_BONUS = 5;
