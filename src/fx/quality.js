// 特效品質：高 / 中 / 低三檔，加上依實際幀率自動降級，並尊重系統「減少動態效果」。

export const QUALITY_LEVELS = ["high", "medium", "low"];

export const QUALITY = {
  high: { particlesPerBrick: 14, trailLength: 10, confetti: 120, shake: true, hitStop: true },
  medium: { particlesPerBrick: 8, trailLength: 6, confetti: 60, shake: true, hitStop: true },
  low: { particlesPerBrick: 3, trailLength: 0, confetti: 0, shake: true, hitStop: false },
};

// 取玩家設定與自動降級中較低的一檔；減少動態效果時關掉震動、命中凍結、拖尾、彩帶
export function resolveQuality(setting, { reducedMotion = false, autoLevel = "high" } = {}) {
  const index = Math.max(QUALITY_LEVELS.indexOf(setting), QUALITY_LEVELS.indexOf(autoLevel), 0);
  const level = QUALITY_LEVELS[index];
  const base = { ...QUALITY[level], level };
  if (!reducedMotion) return base;
  return {
    ...base,
    particlesPerBrick: Math.min(base.particlesPerBrick, QUALITY.low.particlesPerBrick),
    trailLength: 0,
    confetti: 0,
    shake: false,
    hitStop: false,
  };
}

// 每幀餵入幀時間；一段時間內平均 FPS 太低就降一檔，只降不升
export function createAutoQuality({ minFps = 45, windowSeconds = 2 } = {}) {
  let index = 0;
  let elapsed = 0;
  let frames = 0;

  function sample(dt) {
    if (!(dt > 0) || dt > 0.5) return; // 切分頁回來之類的長間隔不算
    elapsed += dt;
    frames += 1;
    if (elapsed < windowSeconds) return;
    if (frames / elapsed < minFps && index < QUALITY_LEVELS.length - 1) index += 1;
    elapsed = 0;
    frames = 0;
  }

  return {
    sample,
    get level() {
      return QUALITY_LEVELS[index];
    },
  };
}
