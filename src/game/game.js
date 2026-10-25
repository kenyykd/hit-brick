// 遊戲邏輯：每次 step 推進一個固定步長的 tick。不碰 DOM，可以在測試裡直接跑。

import { BALL, FIELD, GAME, LAUNCH } from "../config.js";
import { angleToUpVector, lerp } from "../core/math.js";
import { circleRectContact, findNearestHit } from "../physics/collision.js";
import {
  enforceMinVerticalAngle,
  normalizeSpeed,
  paddleBounce,
  reflect,
  substepCount,
} from "../physics/ball-physics.js";
import { createStuckBall, followPaddle } from "./ball.js";
import { createBrickGrid } from "./bricks.js";
import { createPaddle, paddleCenter, updatePaddle } from "./paddle.js";

const MAX_PUSHOUT_ITERATIONS = 4;

export function createGame({ fieldHeight, paddleDef, events, ballSpeed = BALL.speed, makeBricks = createBrickGrid }) {
  const field = { width: FIELD.width, height: fieldHeight };
  const state = {
    field,
    paddle: null,
    balls: [],
    bricks: [],
    score: 0,
    lives: GAME.startLives,
    status: "playing", // playing | cleared | over
    ballSpeed,
    lastSubsteps: 0,
  };

  function paddleY() {
    return field.height - FIELD.paddleBottomMargin;
  }

  function reset() {
    state.paddle = createPaddle(paddleDef, field.width, paddleY());
    state.balls = [createStuckBall(state.paddle, BALL.radius)];
    state.bricks = makeBricks(field.width);
    state.score = 0;
    state.lives = GAME.startLives;
    state.status = "playing";
    events.emit("gameReset", { lives: state.lives, score: state.score });
  }

  // 視窗大小改變時調整場地高度：磚塊貼頂不動、板子貼底
  function setFieldHeight(height) {
    field.height = height;
    state.paddle.y = paddleY();
    for (const ball of state.balls) {
      if (ball.stuck) followPaddle(ball, state.paddle);
    }
  }

  function isHolding() {
    return state.balls.some((b) => b.stuck);
  }

  function launch(angle) {
    const dir = angleToUpVector(angle);
    for (const ball of state.balls) {
      if (!ball.stuck) continue;
      ball.stuck = false;
      ball.vx = dir.x * state.ballSpeed;
      ball.vy = dir.y * state.ballSpeed;
      events.emit("ballLaunched", { ballId: ball.id, angle });
    }
  }

  // 碰撞後把速度修回目標速度，並避免太水平
  function fixVelocity(ball) {
    let v = normalizeSpeed(ball.vx, ball.vy, state.ballSpeed);
    v = enforceMinVerticalAngle(v.vx, v.vy, BALL.minVerticalAngleDeg);
    ball.vx = v.vx;
    ball.vy = v.vy;
  }

  function collideWalls(ball) {
    let hit = false;
    if (ball.x - ball.r < 0) {
      ball.x = ball.r;
      ball.vx = Math.abs(ball.vx);
      hit = true;
    } else if (ball.x + ball.r > field.width) {
      ball.x = field.width - ball.r;
      ball.vx = -Math.abs(ball.vx);
      hit = true;
    }
    if (ball.y - ball.r < 0) {
      ball.y = ball.r;
      ball.vy = Math.abs(ball.vy);
      hit = true;
    }
    if (hit) events.emit("wallHit", { ballId: ball.id });
    return hit;
  }

  function collidePaddle(ball, paddleX) {
    const paddle = state.paddle;
    const rect = { x: paddleX, y: paddle.y, w: paddle.width, h: paddle.height };
    if (!circleRectContact(ball.x, ball.y, ball.r, rect)) return false;

    if (ball.y <= paddle.y) {
      // 打到上緣：依擊中位置決定角度
      ball.y = paddle.y - ball.r;
      if (ball.vy > 0) {
        const bounce = paddleBounce(ball.x, paddleX + paddle.width / 2, paddle.width, paddle.def.maxBounceAngleDeg, state.ballSpeed);
        ball.vx = bounce.vx;
        ball.vy = bounce.vy;
        events.emit("paddleHit", { ballId: ball.id, offset: bounce.offset });
      }
    } else if (ball.x < paddleX + paddle.width / 2) {
      // 打到側邊：水平推出，往外彈
      ball.x = paddleX - ball.r;
      ball.vx = -Math.abs(ball.vx);
    } else {
      ball.x = paddleX + paddle.width + ball.r;
      ball.vx = Math.abs(ball.vx);
    }
    return true;
  }

  function collideBricks(ball) {
    const hit = findNearestHit(ball.x, ball.y, ball.r, state.bricks);
    if (!hit) return false;

    // 計分只算最近的一塊，但推出位置要考慮所有重疊的磚，
    // 否則同時碰到上下兩塊磚的角時，會被推進另一塊而卡在縫裡
    const brick = state.bricks[hit.index];
    let sumX = 0;
    let sumY = 0;
    let contact = hit.contact;
    for (let i = 0; i < MAX_PUSHOUT_ITERATIONS && contact; i++) {
      ball.x += contact.nx * contact.depth;
      ball.y += contact.ny * contact.depth;
      sumX += contact.nx;
      sumY += contact.ny;
      contact = findNearestHit(ball.x, ball.y, ball.r, state.bricks)?.contact;
    }
    const len = Math.hypot(sumX, sumY);
    const nx = len > 1e-6 ? sumX / len : hit.contact.nx;
    const ny = len > 1e-6 ? sumY / len : hit.contact.ny;
    const v = reflect(ball.vx, ball.vy, nx, ny);
    ball.vx = v.vx;
    ball.vy = v.vy;

    events.emit("brickHit", { brick, ballId: ball.id });
    if (brick.breakable) {
      brick.hp -= 1;
      if (brick.hp <= 0) {
        brick.alive = false;
        state.score += brick.score;
        events.emit("brickDestroyed", { brick, type: brick.type, score: brick.score, chain: false });
      }
    }
    return true;
  }

  // 回傳 false 表示球掉出場外
  function moveBall(ball, dt) {
    const paddle = state.paddle;
    const paddleMove = Math.abs(paddle.x - paddle.prevX);
    const distance = Math.hypot(ball.vx, ball.vy) * dt;
    const n = substepCount(Math.max(distance, paddleMove), ball.r, BALL.maxSubstepRatio);
    state.lastSubsteps = Math.max(state.lastSubsteps, n);

    for (let i = 1; i <= n; i++) {
      // 板子位置也切成子步驟，快速移動時才不會穿過球
      const paddleX = lerp(paddle.prevX, paddle.x, i / n);
      ball.x += (ball.vx * dt) / n;
      ball.y += (ball.vy * dt) / n;

      let bounced = collideWalls(ball);
      bounced = collidePaddle(ball, paddleX) || bounced;
      bounced = collideBricks(ball) || bounced;
      if (bounced) fixVelocity(ball);

      if (ball.y - ball.r > field.height) return false;
    }
    return true;
  }

  function loseBall(ball) {
    events.emit("ballLost", { ballId: ball.id });
  }

  function step(dt, input) {
    if (state.status !== "playing") return;
    state.lastSubsteps = 0;

    const paddle = state.paddle;
    updatePaddle(paddle, input.paddleTargetX ?? paddleCenter(paddle), dt, field.width);

    if (input.launch && isHolding()) launch(input.aimAngle ?? LAUNCH.defaultAngleDeg);
    else if (input.skill) events.emit("skillRequested", {});
    if (input.pause) events.emit("pauseRequested", {});

    for (const ball of state.balls) {
      ball.prevX = ball.x;
      ball.prevY = ball.y;
    }

    const survivors = [];
    for (const ball of state.balls) {
      if (ball.stuck) {
        followPaddle(ball, paddle);
        survivors.push(ball);
      } else if (moveBall(ball, dt)) {
        survivors.push(ball);
      } else {
        loseBall(ball);
      }
    }
    state.balls = survivors;

    if (state.balls.length === 0) {
      state.lives -= 1;
      events.emit("lifeLost", { lives: state.lives });
      if (state.lives <= 0) {
        state.status = "over";
        events.emit("gameOver", { score: state.score });
        return;
      }
      state.balls.push(createStuckBall(paddle, BALL.radius));
    }

    if (!state.bricks.some((b) => b.alive && b.breakable)) {
      state.status = "cleared";
      events.emit("levelCleared", { score: state.score, lives: state.lives });
    }
  }

  reset();

  return { state, step, reset, setFieldHeight, isHolding };
}
