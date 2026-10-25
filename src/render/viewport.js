// 場地寬度固定，高度依螢幕比例在上下限之間伸縮；畫布依高解析螢幕放大（倍率有上限）。

import { FIELD, RENDER } from "../config.js";
import { clamp } from "../core/math.js";

// 純函式：依可用空間算出邏輯高度、CSS 尺寸與畫布像素尺寸
export function computeLayout(availWidth, availHeight, devicePixelRatio, field = FIELD, maxPixelRatio = RENDER.maxPixelRatio) {
  const height = clamp(Math.round((field.width * availHeight) / availWidth), field.minHeight, field.maxHeight);
  const scale = Math.min(availWidth / field.width, availHeight / height);
  const cssWidth = field.width * scale;
  const cssHeight = height * scale;
  const ratio = Math.min(devicePixelRatio || 1, maxPixelRatio);
  return {
    height,
    scale,
    cssWidth,
    cssHeight,
    pixelWidth: Math.round(cssWidth * ratio),
    pixelHeight: Math.round(cssHeight * ratio),
  };
}

export function createViewport({ frame, stage, canvas }) {
  const listeners = new Set();
  let layout = null;

  function update() {
    const width = frame.clientWidth;
    const height = frame.clientHeight;
    if (width <= 0 || height <= 0) return;

    layout = computeLayout(width, height, window.devicePixelRatio);
    stage.style.width = `${layout.cssWidth}px`;
    stage.style.height = `${layout.cssHeight}px`;
    stage.style.setProperty("--ui-scale", layout.scale);
    canvas.width = layout.pixelWidth;
    canvas.height = layout.pixelHeight;
    for (const fn of listeners) fn(layout);
  }

  window.addEventListener("resize", update);
  window.visualViewport?.addEventListener("resize", update);
  update();

  return {
    get layout() {
      return layout;
    },
    onChange(fn) {
      listeners.add(fn);
    },
  };
}
