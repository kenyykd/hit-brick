// 遊戲流程狀態機（純邏輯，不碰 DOM）。
//
// 畫面：menu 主選單、levels 選關、paddles 選板子、settings 設定、
//       game 遊戲中、paused 暫停、countdown 恢復倒數、result 結算
// 「準備中」（球還在板子上）屬於 game，由遊戲狀態判斷。

import { GAME } from "../config.js";

const PAUSABLE = new Set(["game", "countdown"]);

export function createFlow({ onChange = () => {} } = {}) {
  const state = {
    screen: "menu",
    countdown: 0, // 剩餘倒數秒數
    result: null, // { kind: "cleared" | "failed" | "allCleared", ... }
    settingsReturn: "menu",
  };

  function go(screen) {
    state.screen = screen;
    onChange(state);
  }

  function pause() {
    if (!PAUSABLE.has(state.screen)) return false;
    go("paused");
    return true;
  }

  function resume() {
    if (state.screen !== "paused") return;
    state.countdown = GAME.resumeCountdown;
    go("countdown");
  }

  // 倒數用的時間：暫停畫面不會呼叫
  function tick(dt) {
    if (state.screen !== "countdown") return;
    const before = Math.ceil(state.countdown);
    state.countdown -= dt;
    if (state.countdown <= 0) go("game");
    else if (Math.ceil(state.countdown) !== before) onChange(state);
  }

  function showResult(result) {
    state.result = result;
    go("result");
  }

  function openSettings() {
    state.settingsReturn = state.screen === "settings" ? state.settingsReturn : state.screen;
    go("settings");
  }

  function closeSettings() {
    go(state.settingsReturn);
  }

  // Android 返回鍵：回傳 false 表示讓瀏覽器照常離開
  function back() {
    switch (state.screen) {
      case "game":
      case "countdown":
        pause();
        return true;
      case "paused":
        return true;
      case "levels":
      case "paddles":
        go("menu");
        return true;
      case "settings":
        closeSettings();
        return true;
      case "result":
        go("levels");
        return true;
      default:
        return false;
    }
  }

  return {
    state,
    go,
    pause,
    resume,
    tick,
    showResult,
    openSettings,
    closeSettings,
    back,
    isRunning: () => state.screen === "game",
  };
}
