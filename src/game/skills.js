// 技能相關的純函式：能量計算、雷射移動與命中判定。

// 時間充能：低於 cap 時才加，而且最多加到 cap
export function addTimeEnergy(energy, amount, cap) {
  if (energy >= cap) return energy;
  return Math.min(cap, energy + amount);
}

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// 雷射往上飛時碰到的第一塊磚 = 重疊的磚中最下面的那塊
export function findBoltHit(bolt, bricks) {
  let best = null;
  for (const brick of bricks) {
    if (!brick.alive || !rectsOverlap(bolt, brick)) continue;
    if (!best || brick.y + brick.h > best.y + best.h) best = brick;
  }
  return best;
}

export function createBolt(cx, top, size) {
  const y = top - size.h;
  return { x: cx - size.w / 2, y, prevY: y, w: size.w, h: size.h };
}
