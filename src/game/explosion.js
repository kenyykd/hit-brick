// 爆炸連鎖（純函式）：炸掉十字 4 格內的可破壞磚，被炸到的爆炸磚再接著炸。
// 每塊磚只會被處理一次（alive 變成 false 後就不再加入），不會重複計分或重複觸發。

const CROSS = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];

// origin：剛被打破的爆炸磚（呼叫前已設為 alive = false）
// getBrick(row, col)：查詢該格的磚，沒有則回傳 undefined
// 回傳：依序被炸掉的磚與連鎖層數，以及每個引爆的爆炸磚
export function explode(origin, getBrick) {
  const destroyed = [];
  const detonations = [{ brick: origin, depth: 0 }];
  const queue = [{ brick: origin, depth: 0 }];

  while (queue.length > 0) {
    const { brick, depth } = queue.shift();
    for (const [dr, dc] of CROSS) {
      const target = getBrick(brick.row + dr, brick.col + dc);
      if (!target || !target.alive || !target.breakable) continue;
      target.alive = false;
      target.hp = 0;
      destroyed.push({ brick: target, depth: depth + 1 });
      if (target.explosive) {
        detonations.push({ brick: target, depth: depth + 1 });
        queue.push({ brick: target, depth: depth + 1 });
      }
    }
  }
  return { destroyed, detonations };
}
