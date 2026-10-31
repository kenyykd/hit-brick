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

// 選板子：外觀、技能說明；未解鎖的顯示剪影與還差幾顆星
// starsNeeded(paddleId)：還差幾顆星，0 表示已解鎖
export function renderPaddleSelect(container, { paddles, selectedId, starsNeeded, onPick }) {
  container.replaceChildren();
  const widest = Math.max(...Object.values(paddles).map((p) => p.width));
  for (const paddle of Object.values(paddles)) {
    const needed = starsNeeded(paddle.id);
    const locked = needed > 0;
    const button = el("button", "paddle-card");
    button.type = "button";
    button.disabled = locked;
    button.classList.toggle("locked", locked);
    button.classList.toggle("selected", paddle.id === selectedId);
    button.setAttribute("aria-pressed", String(paddle.id === selectedId));

    // 預覽條的長度反映板子寬度；未解鎖時是剪影
    const preview = el("span", "paddle-preview");
    preview.style.background = locked ? "#2b3040" : paddle.color;
    preview.style.width = `${(paddle.width / widest) * 100}%`;
    const previewBox = el("span", "paddle-preview-box");
    previewBox.append(preview);

    button.append(
      previewBox,
      el("span", "paddle-name", locked ? `${paddle.name}（未解鎖）` : paddle.name),
      el("span", "paddle-skill", locked ? `還差 ${needed} 顆星解鎖` : paddle.description),
    );
    button.setAttribute("aria-label", locked ? `${paddle.name}，還差 ${needed} 顆星解鎖` : `${paddle.name}：${paddle.description}`);
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
