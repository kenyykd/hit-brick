// 統一輸入：滑鼠、觸控、鍵盤都轉成「板子目標位置、瞄準角度、發射」，遊戲邏輯不分裝置。
//
// 持球時（發射前）：按住拖曳 = 彈弓瞄準，往後拉的反方向就是發射方向；放開發射。
//   沒拉超過門檻就放開 = 點擊，用目前的瞄準角度（預設或鍵盤調整過的）發射。
//   往上拉（拉的方向不對）放開 = 取消，不發射。
// 沒持球時：觸控是相對拖曳移板子；滑鼠是板子跟著滑鼠 x 走。

import { LAUNCH } from "../config.js";
import { DEG, clamp } from "../core/math.js";
import { buildKeyMap } from "../data/keybindings.js";
import { slingshotAngle } from "../physics/ball-physics.js";

export function clientToLogical(clientX, clientY, rect, fieldWidth, fieldHeight) {
  return {
    x: ((clientX - rect.left) * fieldWidth) / rect.width,
    y: ((clientY - rect.top) * fieldHeight) / rect.height,
  };
}

export function applyRelativeDrag(targetX, dx, sensitivity, minX, maxX) {
  return clamp(targetX + dx * sensitivity, minX, maxX);
}

// 彈弓拉的方向是否有效：手指要在起點下方，往後拉
export function isValidPull(pullDy) {
  return pullDy > 0;
}

export function createInput({ element, canvas, getField, getPaddle, isHolding, bindings }) {
  const keyMap = buildKeyMap(bindings);
  const held = new Set();
  const defaultAim = LAUNCH.defaultAngleDeg * DEG;
  const s = {
    paddleTargetX: getField().width / 2,
    aimAngle: defaultAim,
    launch: false,
    skill: false,
    pause: false,
  };
  let pointer = null;

  function paddleBounds() {
    const half = getPaddle().width / 2;
    return [half, getField().width - half];
  }

  function setTarget(x) {
    const [min, max] = paddleBounds();
    s.paddleTargetX = clamp(x, min, max);
  }

  function toLogical(e) {
    const field = getField();
    return clientToLogical(e.clientX, e.clientY, canvas.getBoundingClientRect(), field.width, field.height);
  }

  // 按鈕等 HTML 介面上的操作不算遊戲輸入
  function onUi(e) {
    return e.target instanceof Element && e.target.closest(".ui");
  }

  function paddleCenterX() {
    const paddle = getPaddle();
    return paddle.x + paddle.width / 2;
  }

  element.addEventListener("pointerdown", (e) => {
    if (onUi(e)) return;
    if (e.pointerType === "mouse" && e.button === 2) {
      s.skill = true;
      return;
    }
    if ((e.pointerType === "mouse" && e.button !== 0) || pointer) return;
    e.preventDefault();

    const p = toLogical(e);
    pointer = {
      id: e.pointerId,
      type: e.pointerType,
      startClientX: e.clientX,
      startClientY: e.clientY,
      start: p,
      current: p,
      lastX: p.x,
      holding: isHolding(),
      aiming: false,
      valid: false,
    };
    // 相對拖曳從板子目前的位置開始算
    if (e.pointerType !== "mouse") s.paddleTargetX = paddleCenterX();
    element.setPointerCapture?.(e.pointerId);
  });

  element.addEventListener("pointermove", (e) => {
    const p = toLogical(e);
    if (!pointer) {
      if (e.pointerType === "mouse") setTarget(p.x);
      return;
    }
    if (e.pointerId !== pointer.id) return;
    pointer.current = p;

    if (pointer.holding && isHolding()) {
      const moved = Math.hypot(e.clientX - pointer.startClientX, e.clientY - pointer.startClientY);
      if (moved > LAUNCH.dragThresholdPx) pointer.aiming = true;
      if (pointer.aiming) {
        const pullDx = p.x - pointer.start.x;
        const pullDy = p.y - pointer.start.y;
        pointer.valid = isValidPull(pullDy);
        if (pointer.valid) s.aimAngle = slingshotAngle(pullDx, pullDy, LAUNCH.maxAngleDeg, LAUNCH.defaultAngleDeg);
      }
    } else if (pointer.type === "mouse") {
      setTarget(p.x);
    } else {
      const [min, max] = paddleBounds();
      s.paddleTargetX = applyRelativeDrag(s.paddleTargetX, p.x - pointer.lastX, getPaddle().def.dragSensitivity, min, max);
    }
    pointer.lastX = p.x;
  });

  function endPointer(e, cancelled) {
    if (!pointer || e.pointerId !== pointer.id) return;
    const launchable = pointer.holding && isHolding();
    const cancelledPull = pointer.aiming && !pointer.valid;
    if (!cancelled && launchable && !cancelledPull) s.launch = true;
    pointer = null;
  }

  element.addEventListener("pointerup", (e) => endPointer(e, false));
  element.addEventListener("pointercancel", (e) => endPointer(e, true));
  element.addEventListener("contextmenu", (e) => e.preventDefault());

  window.addEventListener("keydown", (e) => {
    const action = keyMap.get(e.code);
    if (!action) return;
    e.preventDefault();
    held.add(action);
    if (e.repeat) return;
    if (action === "launchOrSkill") {
      if (isHolding()) s.launch = true;
      else s.skill = true;
    } else if (action === "pause") {
      s.pause = true;
    }
  });

  window.addEventListener("keyup", (e) => {
    const action = keyMap.get(e.code);
    if (action) held.delete(action);
  });

  window.addEventListener("blur", () => {
    held.clear();
    pointer = null;
  });

  // 每個邏輯 tick 呼叫一次，回傳這個 tick 的輸入並清掉一次性的動作
  function poll(dt) {
    const paddle = getPaddle();
    const holding = isHolding();

    const moveDir = (held.has("moveRight") ? 1 : 0) - (held.has("moveLeft") ? 1 : 0);
    if (moveDir !== 0) setTarget(s.paddleTargetX + moveDir * paddle.def.keyboardSpeed * dt);

    const aimDir = (held.has("aimRight") ? 1 : 0) - (held.has("aimLeft") ? 1 : 0);
    if (aimDir !== 0 && holding) {
      const max = LAUNCH.maxAngleDeg * DEG;
      s.aimAngle = clamp(s.aimAngle + aimDir * LAUNCH.keyboardAimSpeedDeg * DEG * dt, -max, max);
    }

    // 滑鼠按住瞄準時板子不動
    if (pointer?.type === "mouse" && pointer.holding && holding) s.paddleTargetX = paddleCenterX();

    const snapshot = {
      paddleTargetX: s.paddleTargetX,
      aimAngle: s.aimAngle,
      launch: s.launch,
      skill: s.skill,
      pause: s.pause,
    };
    if (s.launch && holding) s.aimAngle = defaultAim;
    s.launch = false;
    s.skill = false;
    s.pause = false;
    return snapshot;
  }

  // 給繪製用：瞄準線與彈弓線
  function getAim() {
    const holding = isHolding();
    const aiming = holding && pointer?.holding && pointer.aiming;
    return {
      holding,
      angle: s.aimAngle,
      aiming: Boolean(aiming),
      valid: aiming ? pointer.valid : true,
      pull: aiming ? { start: pointer.start, current: pointer.current } : null,
    };
  }

  return { poll, getAim };
}
