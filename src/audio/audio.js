// 音效系統骨架。手機瀏覽器要在使用者操作（點擊）時才允許發聲，
// 所以主選單的「開始遊戲」按鈕會呼叫 unlock()。音效本身在階段 5 加入。

export function createAudio() {
  let context = null;

  function unlock() {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      context ??= new AudioContextClass();
      if (context.state === "suspended") context.resume();
      // 播一段無聲的音訊，iOS Safari 才會真正解鎖
      const source = context.createBufferSource();
      source.buffer = context.createBuffer(1, 1, 22050);
      source.connect(context.destination);
      source.start(0);
    } catch {
      // 沒有音效也能玩
    }
  }

  return {
    unlock,
    get context() {
      return context;
    },
  };
}
