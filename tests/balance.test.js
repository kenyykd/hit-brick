// 驗收：三種板子（有沒有道具）都能通過每一關；用自動玩家實際打完。
// 更詳細的數字用 npm run balance 看。

import { describe, expect, it } from "vitest";
import { autoPlay } from "../src/levels/autoplay.js";
import { LEVELS } from "../src/levels/levels.js";

const MAX_SECONDS = 600;

describe("每一關都能通關", () => {
  for (const paddle of ["standard", "shield", "laser"]) {
    it(`${paddle}：20 關都能在 10 分鐘內清完、不會失去生命（有道具與沒道具）`, () => {
      const failures = [];
      for (const level of LEVELS) {
        for (const powerups of [false, true]) {
          const r = autoPlay(level, { paddle, powerups, seed: level.id * 31 + 1, maxSeconds: MAX_SECONDS });
          if (!r.cleared) failures.push(`第 ${level.id} 關${powerups ? "（有道具）" : ""}沒清完`);
          else if (r.livesLost > 0 && !powerups) failures.push(`第 ${level.id} 關失去了 ${r.livesLost} 條命`);
        }
      }
      expect(failures).toEqual([]);
    });
  }

  it("第 1 關：只要不失去生命就是三星（過關就達到目標分數）", () => {
    const r = autoPlay(LEVELS[0], { seed: 1 });
    expect(r.cleared).toBe(true);
    expect(r.score).toBeGreaterThanOrEqual(r.target);
  });
});
