// 平衡報告：用自動玩家把每一關實際打完（每種設定跑 SEEDS 個亂數種子取平均）。
// 用法：npm run balance
// 自動玩家幾乎不會漏接，也不會刻意追求連擊，所以這份報告看的是
// 「關卡要打多久」與「普通打法的分數是基礎分的幾倍」；真人的難度還是要靠試玩。

import { autoPlay } from "../src/levels/autoplay.js";
import { LEVELS } from "../src/levels/levels.js";

const SEEDS = 5;
const CONFIGS = [
  { label: "標準", paddle: "standard", powerups: false },
  { label: "標準+道具", paddle: "standard", powerups: true },
  { label: "護盾", paddle: "shield", powerups: false },
  { label: "雷射", paddle: "laser", powerups: false },
];

// 中文字佔兩格寬
const width = (text) => [...String(text)].reduce((w, c) => w + (c.charCodeAt(0) > 255 ? 2 : 1), 0);
const pad = (text, n) => String(text) + " ".repeat(Math.max(1, n - width(text)));

function run(level, config) {
  const runs = Array.from({ length: SEEDS }, (_, i) => autoPlay(level, { ...config, seed: level.id * 100 + i + 1 }));
  const cleared = runs.filter((r) => r.cleared);
  const avg = (fn) => cleared.reduce((sum, r) => sum + fn(r), 0) / cleared.length;
  return {
    clearedCount: cleared.length,
    seconds: avg((r) => r.seconds),
    ratio: avg((r) => r.score / r.base),
    reached: cleared.filter((r) => r.score >= r.target).length,
    target: runs[0].target,
    base: runs[0].base,
  };
}

console.log(pad("關卡", 16) + pad("基礎分", 8) + pad("目標", 7) + CONFIGS.map((c) => pad(c.label, 22)).join(""));
for (const level of LEVELS) {
  const results = CONFIGS.map((config) => run(level, config));
  const cells = results.map((r) =>
    r.clearedCount === 0
      ? pad("✗ 全部沒清完", 22)
      : pad(`${Math.round(r.seconds)}s ×${r.ratio.toFixed(2)} ★${r.reached}/${SEEDS}${r.clearedCount < SEEDS ? ` 清${r.clearedCount}` : ""}`, 22),
  );
  console.log(pad(`${level.id}. ${level.name}`, 16) + pad(results[0].base, 8) + pad(results[0].target, 7) + cells.join(""));
}
console.log(`\n格式：平均清關秒數  分數 ÷ 基礎分  ★達到目標的次數/${SEEDS}（「清 n」= 只有 n 次在 10 分鐘內清完）`);
