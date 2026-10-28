// 音效系統。手機瀏覽器要在使用者操作（點擊）時才允許發聲，
// 所以主選單的「開始遊戲」按鈕會呼叫 unlock()。
// 線路：音效 / 音樂各自的音量 → 總音量 → 壓縮器（避免很多聲音疊在一起時爆音）→ 喇叭。
// 沒有 AudioContext 或出錯時全部靜默，遊戲照常可玩。

import { AUDIO_LIMITS, SOUNDS, createVoiceLimiter, soundDuration } from "./sounds.js";

const MASTER_VOLUME = 0.8;
const MUSIC_VOLUME = 0.5;
const ATTACK = 0.005;
const SILENT = 0.0001; // 指數包絡不能到 0

export function createAudio({ getSettings }) {
  let context = null;
  let sfxGain = null;
  let musicGain = null;
  let noiseBuffer = null;
  const limiter = createVoiceLimiter(AUDIO_LIMITS);

  function setup() {
    const compressor = context.createDynamicsCompressor();
    compressor.connect(context.destination);
    const master = context.createGain();
    master.gain.value = MASTER_VOLUME;
    master.connect(compressor);
    sfxGain = context.createGain();
    sfxGain.connect(master);
    musicGain = context.createGain();
    musicGain.connect(master);

    // 1 秒白噪音，爆炸音效重複使用
    noiseBuffer = context.createBuffer(1, context.sampleRate, context.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    applySettings();
  }

  function unlock() {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      if (!context) {
        context = new AudioContextClass();
        setup();
      }
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

  // 設定頁的音效 / 音樂開關，改了立即生效
  function applySettings() {
    if (!context) return;
    const settings = getSettings();
    sfxGain.gain.value = settings.sound ? 1 : 0;
    musicGain.gain.value = settings.music ? MUSIC_VOLUME : 0;
  }

  function ready() {
    return context !== null && context.state === "running";
  }

  function envelope(gain, start, duration, volume) {
    gain.gain.setValueAtTime(SILENT, start);
    gain.gain.linearRampToValueAtTime(volume, start + ATTACK);
    gain.gain.exponentialRampToValueAtTime(SILENT, start + duration);
  }

  function tone({ wave, from, to = from, start, duration, volume, output }) {
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = wave;
    osc.frequency.setValueAtTime(from, start);
    if (to !== from) osc.frequency.exponentialRampToValueAtTime(to, start + duration);
    envelope(gain, start, duration, volume);
    osc.connect(gain);
    gain.connect(output);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  }

  function noise({ start, duration, volume }) {
    const source = context.createBufferSource();
    source.buffer = noiseBuffer;
    const filter = context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(3000, start);
    filter.frequency.exponentialRampToValueAtTime(150, start + duration);
    const gain = context.createGain();
    envelope(gain, start, duration, volume);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(sfxGain);
    source.start(start);
    source.stop(start + duration + 0.02);
  }

  // pitch：頻率倍率（連擊升調用）
  function play(name, { pitch = 1 } = {}) {
    if (!ready() || !getSettings().sound) return;
    const def = SOUNDS[name];
    if (!def) return;
    const now = context.currentTime;
    if (!limiter.tryPlay(name, now, soundDuration(def))) return;
    try {
      if (def.wave === "noise") {
        noise({ start: now, duration: def.duration, volume: def.volume });
      } else if (def.notes) {
        def.notes.forEach((freq, i) => {
          tone({ wave: def.wave, from: freq * pitch, start: now + i * def.noteLength, duration: def.noteLength, volume: def.volume, output: sfxGain });
        });
      } else {
        tone({ wave: def.wave, from: def.from * pitch, to: def.to * pitch, start: now, duration: def.duration, volume: def.volume, output: sfxGain });
      }
    } catch {
      // 表現層出錯不影響遊戲
    }
  }

  // 給背景音樂排程用：在指定時間播一個音
  function playNote(freq, start, duration, wave, volume) {
    if (!ready()) return;
    try {
      tone({ wave, from: freq, start, duration, volume, output: musicGain });
    } catch {
      // 同上
    }
  }

  return {
    unlock,
    play,
    playNote,
    applySettings,
    get context() {
      return context;
    },
  };
}
