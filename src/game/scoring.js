// 計分規則（純函式）。

import { COMBO } from "../config.js";

// 每 COMBO.step 連擊加 1 倍：1～4 連擊 1 倍、5～9 連擊 2 倍……上限 COMBO.maxMultiplier 倍
export function comboMultiplier(combo) {
  return Math.min(COMBO.maxMultiplier, 1 + Math.floor(Math.max(combo, 0) / COMBO.step));
}
