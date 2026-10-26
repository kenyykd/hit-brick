// HTML 畫面：切換顯示、選關、選板子、結算。文字一律用 textContent。

import { isLevelUnlocked, levelRecord } from "../save/progress.js";

export function createScreens(stage) {
  const sections = [...stage.querySelectorAll("[data-screen]")];

  function show(name) {
    stage.dataset.screen = name;
    for (const section of sections) section.hidden = section.dataset.screen !== name;
  }

  return { show };
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function starsText(count) {
  return "★".repeat(count) + "☆".repeat(3 - count);
}

export function renderLevelSelect(container, { levels, save, onPick }) {
  container.replaceChildren();
  for (const level of levels) {
    const unlocked = isLevelUnlocked(save, level.id);
    const record = levelRecord(save, level.id);
    const button = el("button", "level-card");
    button.type = "button";
    button.disabled = !unlocked;
    button.append(
      el("span", "level-number", unlocked ? String(level.id) : "🔒"),
      el("span", "level-name", unlocked ? level.name : "未解鎖"),
      el("span", "level-stars", starsText(record.stars)),
      el("span", "level-best", record.cleared ? `最高 ${record.bestScore}` : " "),
    );
    button.setAttribute("aria-label", unlocked ? `第 ${level.id} 關 ${level.name}` : `第 ${level.id} 關，未解鎖`);
    button.addEventListener("click", () => onPick(level));
    container.append(button);
  }
}

// 選板子畫面骨架：目前只有標準板，其他板子在階段 6、7 加入
export function renderPaddleSelect(container, { paddles, selectedId, onPick }) {
  container.replaceChildren();
  for (const paddle of Object.values(paddles)) {
    const button = el("button", "paddle-card");
    button.type = "button";
    button.classList.toggle("selected", paddle.id === selectedId);
    button.setAttribute("aria-pressed", String(paddle.id === selectedId));
    const preview = el("span", "paddle-preview");
    preview.style.background = paddle.color;
    button.append(preview, el("span", "paddle-name", paddle.name), el("span", "paddle-skill", "技能：無"));
    button.addEventListener("click", () => onPick(paddle));
    container.append(button);
  }
}

const RESULT_TITLES = {
  cleared: "過關！",
  allCleared: "全部通關！",
  failed: "挑戰失敗",
};

export function renderResult(els, result) {
  els.title.textContent = RESULT_TITLES[result.kind];
  els.score.textContent = `分數 ${result.score}`;
  if (result.kind === "failed") {
    els.best.textContent = result.best > 0 ? `本關最高 ${result.best}` : "生命用完了，再試一次吧";
  } else {
    els.best.textContent = result.isNewBest ? "新紀錄！" : `本關最高 ${result.best}`;
  }
  els.target.textContent = result.target > 0 ? `目標分數 ${result.target}` : "";
  els.next.hidden = !result.hasNext;
}
