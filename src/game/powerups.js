// 道具掉落與膠囊移動（純函式）。

// entries：[{ id, weight }]；權重為 0 的不會被抽到。全部為 0 時回傳 null
export function pickWeighted(entries, rng) {
  const total = entries.reduce((sum, e) => sum + Math.max(0, e.weight), 0);
  if (total <= 0) return null;
  let roll = rng() * total;
  for (const e of entries) {
    if (e.weight <= 0) continue;
    roll -= e.weight;
    if (roll < 0) return e.id;
  }
  return entries.findLast((e) => e.weight > 0).id;
}

// 每打破一塊磚呼叫 roll 一次；連續 pity - 1 塊都沒掉，下一塊必掉
export function createDropper({ rng, rate, pity, powerups }) {
  let misses = 0;

  // blocked：這次不能掉（例如場上膠囊已滿），但保底計數照加
  // excluded：這次不能抽到的道具 id
  function roll({ blocked = false, excluded = [] } = {}) {
    if (blocked) {
      misses += 1;
      return null;
    }
    const forced = misses + 1 >= pity;
    if (!forced && rng() >= rate) {
      misses += 1;
      return null;
    }
    const entries = Object.values(powerups).map((p) => ({ id: p.id, weight: excluded.includes(p.id) ? 0 : p.weight }));
    const id = pickWeighted(entries, rng);
    misses = id ? 0 : misses + 1;
    return id;
  }

  function reset() {
    misses = 0;
  }

  return { roll, reset };
}

export function createCapsule(type, cx, cy, size) {
  const x = cx - size.w / 2;
  const y = cy - size.h / 2;
  return { type, x, y, prevY: y, w: size.w, h: size.h };
}

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// 膠囊往下掉；碰到板子 = 接到，掉出底部 = 消失。回傳剩下的膠囊與這個 tick 的結果
export function updateCapsules(capsules, dt, speed, paddleRect, fieldHeight) {
  const caught = [];
  const missed = [];
  const remaining = [];
  for (const c of capsules) {
    c.prevY = c.y;
    c.y += speed * dt;
    if (rectsOverlap(c, paddleRect)) caught.push(c);
    else if (c.y > fieldHeight) missed.push(c);
    else remaining.push(c);
  }
  return { remaining, caught, missed };
}
