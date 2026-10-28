// 物件池：一開始就配置好固定數量的物件，之後只重複使用，連續遊玩記憶體不會成長。
// 池滿時覆蓋最舊的（依輪替順序），寧可少一顆粒子也不配置新物件。

export function createPool(capacity, factory) {
  const items = Array.from({ length: capacity }, () => ({ ...factory(), alive: false }));
  let cursor = 0;

  function spawn() {
    for (let i = 0; i < capacity; i++) {
      const index = (cursor + i) % capacity;
      if (!items[index].alive) {
        cursor = (index + 1) % capacity;
        items[index].alive = true;
        return items[index];
      }
    }
    const item = items[cursor];
    cursor = (cursor + 1) % capacity;
    return item;
  }

  function forEachAlive(fn) {
    for (const item of items) {
      if (item.alive) fn(item);
    }
  }

  function count() {
    let n = 0;
    for (const item of items) if (item.alive) n++;
    return n;
  }

  function clear() {
    for (const item of items) item.alive = false;
  }

  return { items, spawn, forEachAlive, count, clear };
}
