// 固定步長迴圈：邏輯固定 120Hz，繪製跟著螢幕更新率。

// 純函式：把這一幀經過的時間加進累積器，算出要跑幾步
export function advanceAccumulator(acc, frameTime, { step, maxStepsPerFrame, maxFrameTime }) {
  let next = acc + Math.min(Math.max(frameTime, 0), maxFrameTime);
  let steps = Math.floor(next / step);
  if (steps >= maxStepsPerFrame) {
    // 卡頓後不一次補太多步，剩下的直接丟掉
    steps = maxStepsPerFrame;
    next = 0;
  } else {
    next -= steps * step;
  }
  return { steps, acc: next };
}

export function startLoop({ config, update, render }) {
  let acc = 0;
  let last = null;

  function frame(now) {
    const frameTime = last === null ? 0 : (now - last) / 1000;
    last = now;

    const result = advanceAccumulator(acc, frameTime, config);
    acc = result.acc;
    for (let i = 0; i < result.steps; i++) update(config.step);

    render({ alpha: acc / config.step, steps: result.steps, now });
    requestAnimationFrame(frame);
  }

  // 切分頁回來時重新計時，避免一次補一大段時間
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      last = null;
      acc = 0;
    }
  });

  requestAnimationFrame(frame);
}
