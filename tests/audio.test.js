import { describe, expect, it } from "vitest";
import { noteFrequency } from "../src/audio/music.js";
import { AUDIO_LIMITS, MAX_COMBO_SEMITONES, SOUNDS, comboPitch, createVoiceLimiter, soundDuration } from "../src/audio/sounds.js";
import { TRACKS } from "../src/data/music.js";

describe("連擊升調", () => {
  it("連擊越高音越高，最多升一個八度", () => {
    expect(comboPitch(1)).toBe(1);
    expect(comboPitch(2)).toBeGreaterThan(comboPitch(1));
    expect(comboPitch(MAX_COMBO_SEMITONES + 1)).toBeCloseTo(2);
    expect(comboPitch(100)).toBeCloseTo(2);
    expect(comboPitch(0)).toBe(1);
  });
});

describe("音效限流", () => {
  it("爆炸連鎖同時破十幾塊磚時，發聲數不超過上限，同種音效有間隔", () => {
    const limiter = createVoiceLimiter(AUDIO_LIMITS);
    let played = 0;
    // 同一個 tick 內 15 塊磚破掉、3 次爆炸
    for (let i = 0; i < 15; i++) if (limiter.tryPlay("brick", 0, soundDuration(SOUNDS.brick))) played++;
    for (let i = 0; i < 3; i++) if (limiter.tryPlay("explode", 0, soundDuration(SOUNDS.explode))) played++;
    expect(played).toBe(2);
  });

  it("同時發聲數有上限", () => {
    const limiter = createVoiceLimiter({ maxVoices: 3, minInterval: {} });
    const results = ["a", "b", "c", "d"].map((name) => limiter.tryPlay(name, 0, 1));
    expect(results).toEqual([true, true, true, false]);
    expect(limiter.tryPlay("d", 1.01, 1)).toBe(true); // 前面的播完就有空位
  });

  it("超過最短間隔後同種音效可以再播", () => {
    const limiter = createVoiceLimiter({ maxVoices: 8, minInterval: { brick: 0.05 } });
    expect(limiter.tryPlay("brick", 0, 0.01)).toBe(true);
    expect(limiter.tryPlay("brick", 0.04, 0.01)).toBe(false);
    expect(limiter.tryPlay("brick", 0.06, 0.01)).toBe(true);
  });
});

describe("背景音樂", () => {
  it("音名轉頻率", () => {
    expect(noteFrequency("A4")).toBeCloseTo(440);
    expect(noteFrequency("C5")).toBeCloseTo(523.25, 1);
    expect(noteFrequency("A#4")).toBeCloseTo(466.16, 1);
    expect(noteFrequency("-")).toBeNull();
  });

  it("曲子裡的每個音都認得", () => {
    for (const track of Object.values(TRACKS)) {
      for (const voice of track.voices) {
        for (const note of voice.notes.split(/\s+/).filter(Boolean)) {
          expect(note === "-" || noteFrequency(note) !== null, note).toBe(true);
        }
      }
    }
  });
});
