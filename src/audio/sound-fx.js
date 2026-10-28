// 遊戲事件 → 音效。只訂閱事件，不碰遊戲狀態；拿掉整個模組遊戲照常。

import { comboPitch } from "./sounds.js";

export function createSoundFx({ events, audio }) {
  const on = (type, handler) => events.on(type, handler);

  on("paddleHit", () => audio.play("paddle"));
  on("ballCaught", () => audio.play("catch"));
  on("wallHit", () => audio.play("wall"));
  on("ballLaunched", () => audio.play("launch"));
  on("brickHit", ({ brick, hp }) => {
    if (!brick.breakable) audio.play("steel");
    else if (hp > 0) audio.play("toughHit");
  });
  // 連鎖炸掉的磚由爆炸聲代表，不再一塊一塊響
  on("brickDestroyed", ({ combo, chain }) => {
    if (!chain) audio.play("brick", { pitch: comboPitch(combo) });
  });
  on("explosion", () => audio.play("explode"));
  on("capsuleSpawned", () => audio.play("capsule"));
  on("powerupCollected", () => audio.play("powerup"));
  on("powerupExpired", () => audio.play("powerupEnd"));
  on("lifeLost", () => audio.play("lifeLost"));
  on("levelCleared", () => audio.play("clear"));
  on("gameOver", () => audio.play("gameOver"));
}
