// 暫用的磚塊網格，大小依場地寬自動計算。階段 2 換成關卡資料。
//
// 碰撞框佔滿整個格子、格子貼滿左右牆，畫的時候才內縮 inset 露出間隙。
// 這樣場上不會出現比球還窄的縫（球會卡在縫裡來回彈）。
// 格子高度必須大於球的直徑，空格才不會變成卡球的窄通道。

const ROW_COLORS = ["#ff6b6b", "#ffa94d", "#ffd43b", "#69db7c", "#4dabf7"];

export function createBrickGrid(fieldWidth, { cols = 9, rows = 5, top = 96, cellHeight = 30, gap = 6 } = {}) {
  const cellWidth = fieldWidth / cols;
  const bricks = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      bricks.push({
        x: col * cellWidth,
        y: top + row * cellHeight,
        w: cellWidth,
        h: cellHeight,
        inset: gap / 2,
        type: "normal",
        hp: 1,
        breakable: true,
        alive: true,
        score: 10,
        color: ROW_COLORS[row % ROW_COLORS.length],
      });
    }
  }
  return bricks;
}
