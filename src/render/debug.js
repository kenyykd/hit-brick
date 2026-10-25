// 除錯層：網址加 ?debug 或按 ` 鍵開關。
// 只負責顯示，不影響遊戲邏輯。

const FPS_SMOOTHING = 0.9;

export function createDebug({ enabled = false } = {}) {
  const state = {
    enabled,
    fps: 0,
    lastFrameTime: 0,
    stats: {},
  };

  window.addEventListener("keydown", (e) => {
    if (e.code === "Backquote") state.enabled = !state.enabled;
  });

  // 每幀呼叫一次，用滑動平均算 FPS
  function frame(now) {
    if (state.lastFrameTime > 0) {
      const dt = now - state.lastFrameTime;
      if (dt > 0) {
        const instant = 1000 / dt;
        state.fps = state.fps === 0 ? instant : state.fps * FPS_SMOOTHING + instant * (1 - FPS_SMOOTHING);
      }
    }
    state.lastFrameTime = now;
  }

  // 由呼叫端填入要顯示的數值，例如 { 步數: 2, 子步驟: 3 }
  function setStats(stats) {
    state.stats = stats;
  }

  // shapes: { circles: [{x, y, r}], rects: [{x, y, w, h}] }，座標用邏輯單位
  function draw(ctx, shapes = {}) {
    if (!state.enabled) return;

    ctx.save();
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(0, 255, 0, 0.9)";
    for (const r of shapes.rects ?? []) ctx.strokeRect(r.x, r.y, r.w, r.h);
    ctx.strokeStyle = "rgba(255, 0, 255, 0.9)";
    for (const c of shapes.circles ?? []) {
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
      ctx.stroke();
    }

    const lines = [`FPS: ${state.fps.toFixed(0)}`];
    for (const [key, value] of Object.entries(state.stats)) lines.push(`${key}: ${value}`);

    ctx.font = "12px monospace";
    ctx.textBaseline = "top";
    const width = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 12;
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.fillRect(4, 28, width, lines.length * 16 + 8);
    ctx.fillStyle = "#0f0";
    lines.forEach((line, i) => ctx.fillText(line, 10, 32 + i * 16));
    ctx.restore();
  }

  return {
    get enabled() {
      return state.enabled;
    },
    frame,
    setStats,
    draw,
  };
}

export function debugEnabledFromUrl() {
  return new URLSearchParams(window.location.search).has("debug");
}
