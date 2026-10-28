// 背景音樂：用 lookahead 排程，每 25ms 把接下來 0.1 秒的音先排進 AudioContext，
// 音準不受主執行緒卡頓影響。不需要載入檔案，也就不用等音樂載完才能開始。

import { TRACKS } from "../data/music.js";

const LOOKAHEAD = 0.1;
const INTERVAL_MS = 25;
const NOTE_NAMES = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

// "A4" → 440；「-」或格式不對回傳 null
export function noteFrequency(name) {
  const match = /^([A-G])(#?)(\d)$/.exec(name);
  if (!match) return null;
  const midi = (Number(match[3]) + 1) * 12 + NOTE_NAMES[match[1]] + (match[2] ? 1 : 0);
  return 440 * 2 ** ((midi - 69) / 12);
}

function parseTrack(track) {
  return {
    stepSeconds: 60 / track.bpm / 2,
    voices: track.voices.map((v) => ({ ...v, freqs: v.notes.split(/\s+/).filter(Boolean).map(noteFrequency) })),
  };
}

const PARSED = Object.fromEntries(Object.entries(TRACKS).map(([id, t]) => [id, parseTrack(t)]));

export function createMusic({ audio }) {
  let current = null;
  let playing = false;
  let step = 0;
  let nextTime = 0;
  let timer = null;

  function schedule() {
    const ctx = audio.context;
    if (!playing || !current || !ctx || ctx.state !== "running") return;
    const track = PARSED[current];
    // 剛開始或被擋住一段時間後，從現在重新起算
    if (nextTime < ctx.currentTime) nextTime = ctx.currentTime + 0.05;
    while (nextTime < ctx.currentTime + LOOKAHEAD) {
      for (const voice of track.voices) {
        const freq = voice.freqs[step % voice.freqs.length];
        if (freq) audio.playNote(freq, nextTime, track.stepSeconds * voice.length, voice.wave, voice.volume);
      }
      step += 1;
      nextTime += track.stepSeconds;
    }
  }

  // 換曲從頭開始；同一首暫停後繼續
  function play(id) {
    if (!PARSED[id]) return;
    if (current !== id) {
      current = id;
      step = 0;
    }
    if (playing) return;
    playing = true;
    nextTime = 0;
    timer = setInterval(schedule, INTERVAL_MS);
  }

  function pause() {
    playing = false;
    clearInterval(timer);
    timer = null;
  }

  return { play, pause };
}
