// 關卡文字解析、驗證與擺放（純函式）。關卡之後可能來自編輯器或匯入，一律驗證。

import { BRICK_CHARS, BRICK_TYPES, EMPTY_CHAR } from "../data/brick-types.js";
import { THEMES } from "../data/themes.js";

export const LEVEL_LIMITS = {
  minCols: 9,
  maxCols: 10,
  maxRows: 14,
  minBallSpeed: 300,
  maxBallSpeed: 1400,
};

export class LevelError extends Error {}

export function parseLevel(level) {
  if (!level || typeof level.layout !== "string") throw new LevelError("關卡缺少 layout 文字");

  const rows = level.layout
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  if (rows.length === 0) throw new LevelError("關卡沒有任何一列");
  if (rows.length > LEVEL_LIMITS.maxRows) throw new LevelError(`關卡最多 ${LEVEL_LIMITS.maxRows} 列`);

  const cols = rows[0].length;
  if (cols < LEVEL_LIMITS.minCols || cols > LEVEL_LIMITS.maxCols) {
    throw new LevelError(`欄數要在 ${LEVEL_LIMITS.minCols}～${LEVEL_LIMITS.maxCols} 之間，目前是 ${cols}`);
  }

  const cells = [];
  rows.forEach((line, row) => {
    if (line.length !== cols) throw new LevelError(`第 ${row + 1} 列有 ${line.length} 個字元，應為 ${cols}`);
    [...line].forEach((char, col) => {
      if (char === EMPTY_CHAR) return;
      if (!Object.hasOwn(BRICK_CHARS, char)) throw new LevelError(`第 ${row + 1} 列有未知字元「${char}」`);
      cells.push({ row, col, char });
    });
  });

  const hasBreakable = cells.some((c) => BRICK_TYPES[BRICK_CHARS[c.char].type].breakable);
  if (!hasBreakable) throw new LevelError("關卡至少要有一塊可破壞的磚");

  const speed = level.ballSpeed;
  if (!Number.isFinite(speed) || speed < LEVEL_LIMITS.minBallSpeed || speed > LEVEL_LIMITS.maxBallSpeed) {
    throw new LevelError(`球速要在 ${LEVEL_LIMITS.minBallSpeed}～${LEVEL_LIMITS.maxBallSpeed} 之間`);
  }
  if (!Object.hasOwn(THEMES, level.theme)) throw new LevelError(`未知的主題「${level.theme}」`);

  return { cols, rows: rows.length, cells };
}

// 可通關檢查：從磚區下方（球的出發處）往上走，不穿過不可破壞磚（可破壞磚打掉後可通過），
// 每一塊可破壞磚都要到得了。磚區佔滿整個寬度，所以磚區上方的空地也只能穿過磚區才到得了。
// 用上下左右四方向，比實際更保守。
export function isLevelSolvable(parsed) {
  const { cols, rows, cells } = parsed;
  const blocked = new Set();
  const breakable = [];
  for (const c of cells) {
    const type = BRICK_TYPES[BRICK_CHARS[c.char].type];
    if (!type.breakable) blocked.add(c.row * cols + c.col);
    else breakable.push(c);
  }

  const seen = new Set();
  const queue = [];
  const visit = (row, col) => {
    if (col < 0 || col >= cols || row < 0 || row >= rows) return;
    const key = row * cols + col;
    if (blocked.has(key) || seen.has(key)) return;
    seen.add(key);
    queue.push([row, col]);
  };
  for (let col = 0; col < cols; col++) visit(rows - 1, col);
  while (queue.length > 0) {
    const [row, col] = queue.shift();
    visit(row + 1, col);
    visit(row - 1, col);
    visit(row, col + 1);
    visit(row, col - 1);
  }
  return breakable.every((c) => seen.has(c.row * cols + c.col));
}

// 依場地寬度擺放磚塊。碰撞框佔滿格子、畫的時候才內縮 inset 露出間隙，
// 格子高度一定大於球的直徑，避免出現卡球的窄縫。
export function buildBricks(parsed, fieldWidth, { top, gap, cellHeightRatio, minCellHeight }) {
  const cellWidth = fieldWidth / parsed.cols;
  const cellHeight = Math.max(Math.round(cellWidth * cellHeightRatio), minCellHeight);
  return parsed.cells.map(({ row, col, char }) => {
    const spec = BRICK_CHARS[char];
    const type = BRICK_TYPES[spec.type];
    const hp = spec.hp ?? type.hp;
    return {
      x: col * cellWidth,
      y: top + row * cellHeight,
      w: cellWidth,
      h: cellHeight,
      inset: gap / 2,
      row,
      col,
      type: spec.type,
      hp,
      maxHp: hp,
      breakable: type.breakable,
      explosive: type.explosive,
      alive: true,
      score: type.breakable ? type.score * hp : 0,
    };
  });
}
