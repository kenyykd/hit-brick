// 圓形對矩形碰撞（純函式）。矩形格式：{ x, y, w, h }。

// 回傳 null 表示沒碰到；碰到時回傳從矩形指向圓心的法線、穿透深度、圓心到最近點的距離
export function circleRectContact(cx, cy, r, rect) {
  const closestX = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
  const closestY = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
  const dx = cx - closestX;
  const dy = cy - closestY;
  const distSq = dx * dx + dy * dy;

  if (distSq > 0) {
    if (distSq >= r * r) return null;
    const dist = Math.sqrt(distSq);
    return { nx: dx / dist, ny: dy / dist, depth: r - dist, distance: dist };
  }

  // 圓心在矩形內：從最淺的一邊推出去
  const left = cx - rect.x;
  const right = rect.x + rect.w - cx;
  const top = cy - rect.y;
  const bottom = rect.y + rect.h - cy;
  const min = Math.min(left, right, top, bottom);
  if (min === top) return { nx: 0, ny: -1, depth: top + r, distance: 0 };
  if (min === bottom) return { nx: 0, ny: 1, depth: bottom + r, distance: 0 };
  if (min === left) return { nx: -1, ny: 0, depth: left + r, distance: 0 };
  return { nx: 1, ny: 0, depth: right + r, distance: 0 };
}

// 在所有重疊的矩形裡，找出圓心距離最近的一個；一個子步驟只處理這一個。
// alive 為 false 的矩形（已打掉的磚）會被略過。
export function findNearestHit(cx, cy, r, rects) {
  let best = null;
  for (let i = 0; i < rects.length; i++) {
    if (rects[i].alive === false) continue;
    const contact = circleRectContact(cx, cy, r, rects[i]);
    if (contact && (best === null || contact.distance < best.contact.distance)) {
      best = { index: i, contact };
    }
  }
  return best;
}
