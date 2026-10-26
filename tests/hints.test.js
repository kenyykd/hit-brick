import { describe, expect, it } from "vitest";
import { DEFAULT_KEYBINDINGS, rebind } from "../src/data/keybindings.js";
import { hintText, levelHintIds } from "../src/ui/hints.js";

describe("新手提示", () => {
  it("只列出這一關有的特殊磚", () => {
    expect(levelHintIds([{ type: "normal" }, { type: "explosive" }, { type: "explosive" }])).toEqual(["explosive"]);
    expect(levelHintIds([{ type: "normal" }])).toEqual([]);
  });

  it("文字依裝置切換", () => {
    const touch = hintText("aim", { touch: true, keybindings: DEFAULT_KEYBINDINGS });
    const desktop = hintText("aim", { touch: false, keybindings: DEFAULT_KEYBINDINGS });
    expect(touch).toContain("按住畫面");
    expect(desktop).toContain("滑鼠");
  });

  it("電腦版提示跟著自訂鍵位", () => {
    const custom = rebind(DEFAULT_KEYBINDINGS, "launchOrSkill", "KeyJ");
    expect(hintText("aim", { touch: false, keybindings: custom })).toContain("J 發射");
  });
});
