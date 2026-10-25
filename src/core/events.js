// 遊戲邏輯只發事件，音效、特效、成就、介面各自訂閱。

export function createEventBus() {
  const listeners = new Map();

  function on(type, handler) {
    if (!listeners.has(type)) listeners.set(type, new Set());
    listeners.get(type).add(handler);
    return () => off(type, handler);
  }

  function off(type, handler) {
    listeners.get(type)?.delete(handler);
  }

  function emit(type, payload = {}) {
    const handlers = listeners.get(type);
    if (!handlers) return;
    for (const handler of handlers) {
      // 表現層出錯不能拖垮遊戲邏輯
      try {
        handler(payload);
      } catch (err) {
        console.error(`事件 ${type} 的處理函式出錯`, err);
      }
    }
  }

  return { on, off, emit };
}
