// 音效合成配方（純資料）與音高、限流計算（純函式）。全部用程式合成，不載入音檔。
// wave：振盪器波形，noise 為白噪音；from / to：起訖頻率（Hz）；notes：依序播放的音（琶音）。

export const SOUNDS = {
  paddle: { wave: "square", from: 330, to: 440, duration: 0.07, volume: 0.22 },
  wall: { wave: "square", from: 220, to: 200, duration: 0.04, volume: 0.1 },
  brick: { wave: "square", from: 523, to: 784, duration: 0.08, volume: 0.2 },
  toughHit: { wave: "triangle", from: 300, to: 250, duration: 0.07, volume: 0.25 },
  steel: { wave: "square", from: 1200, to: 1150, duration: 0.05, volume: 0.1 },
  explode: { wave: "noise", duration: 0.35, volume: 0.5 },
  launch: { wave: "triangle", from: 440, to: 880, duration: 0.1, volume: 0.2 },
  catch: { wave: "sine", from: 300, to: 200, duration: 0.08, volume: 0.25 },
  capsule: { wave: "sine", from: 660, to: 990, duration: 0.08, volume: 0.12 },
  powerup: { wave: "square", notes: [523, 784, 1047], noteLength: 0.06, volume: 0.2 },
  powerupEnd: { wave: "triangle", from: 600, to: 300, duration: 0.15, volume: 0.18 },
  lifeLost: { wave: "sawtooth", from: 440, to: 110, duration: 0.5, volume: 0.25 },
  skillReady: { wave: "sine", notes: [784, 1175], noteLength: 0.08, volume: 0.2 },
  skillCast: { wave: "square", notes: [392, 587, 784], noteLength: 0.05, volume: 0.2 },
  shieldHit: { wave: "triangle", from: 520, to: 880, duration: 0.14, volume: 0.25 },
  laser: { wave: "square", from: 1400, to: 900, duration: 0.05, volume: 0.07 },
  clear: { wave: "square", notes: [523, 659, 784, 1047], noteLength: 0.09, volume: 0.22 },
  gameOver: { wave: "triangle", notes: [392, 330, 262, 196], noteLength: 0.16, volume: 0.3 },
};

export const AUDIO_LIMITS = {
  maxVoices: 8, // 同時發聲數上限
  // 同種音效的最短間隔（秒），爆炸連鎖時不會疊成爆音
  minInterval: { default: 0.03, brick: 0.035, wall: 0.05, explode: 0.12, launch: 0.05, laser: 0.08 },
};

export const MAX_COMBO_SEMITONES = 12;

// 連擊越高音越高：每 +1 連擊升半音，最多升一個八度。回傳頻率倍率
export function comboPitch(combo) {
  const semitones = Math.min(Math.max(combo - 1, 0), MAX_COMBO_SEMITONES);
  return 2 ** (semitones / 12);
}

export function soundDuration(def) {
  return def.notes ? def.notes.length * def.noteLength : def.duration;
}

// 決定一個音效能不能播：同時發聲數有上限，同種音效有最短間隔。now 由呼叫端傳入（秒）
export function createVoiceLimiter({ maxVoices, minInterval }) {
  const endTimes = [];
  const lastPlayed = new Map();

  function tryPlay(name, now, duration) {
    for (let i = endTimes.length - 1; i >= 0; i--) {
      if (endTimes[i] <= now) endTimes.splice(i, 1);
    }
    if (endTimes.length >= maxVoices) return false;
    const gap = minInterval[name] ?? minInterval.default ?? 0;
    const last = lastPlayed.get(name);
    if (last !== undefined && now - last < gap) return false;
    endTimes.push(now + duration);
    lastPlayed.set(name, now);
    return true;
  }

  return { tryPlay };
}
