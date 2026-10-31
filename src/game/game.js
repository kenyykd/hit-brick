// 遊戲邏輯：每次 step 推進一個固定步長的 tick。不碰 DOM，可以在測試裡直接跑。

import { BALL, BRICK_LAYOUT, FIELD, GAME, LAUNCH, POWERUP, SKILL } from "../config.js";
import { DEG, angleToUpVector, clamp, lerp, rotate } from "../core/math.js";
import { CHAIN_BONUS } from "../data/brick-types.js";
import { POWERUPS } from "../data/powerups.js";
import { SKILLS } from "../data/skills.js";
import { buildBricks, parseLevel } from "../levels/parse.js";
import { targetScore } from "../levels/target.js";
import { circleRectContact, findNearestHit } from "../physics/collision.js";
import {
  enforceMinVerticalAngle,
  normalizeSpeed,
  paddleBounce,
  reflect,
  substepCount,
} from "../physics/ball-physics.js";
import { createStuckBall, followPaddle, splitBall } from "./ball.js";
import { explode } from "./explosion.js";
import { createPaddle, paddleCenter, updatePaddle } from "./paddle.js";
import { createCapsule, createDropper, updateCapsules } from "./powerups.js";
import { comboMultiplier } from "./scoring.js";
import { addTimeEnergy, createBolt, findBoltHit } from "./skills.js";

const MAX_PUSHOUT_ITERATIONS = 4;

// ballSpeed 只給測試覆寫用，平常用關卡資料的球速
// rng：掉落用的亂數來源；drops 為 false 時完全不掉膠囊（模擬測試用）
export function createGame({ fieldHeight, paddleDef, events, level, ballSpeed, rng = Math.random, drops = true }) {
  const field = { width: FIELD.width, height: fieldHeight };
  const state = {
    field,
    level: null,
    paddle: null,
    balls: [],
    bricks: [],
    capsules: [], // 掉落中的道具膠囊
    effects: {}, // 啟用中的計時道具：id → 剩餘秒數（遊戲時間）
    score: 0,
    targetScore: 0, // 這關「達到目標分數」星星的門檻
    lives: GAME.startLives,
    livesLost: 0, // 本關失去的生命數（星星「未失去生命」用）
    combo: 0, // 球連續打破的磚數，碰到板子或失去生命歸零
    energy: 0, // 技能能量 0～1；失去生命保留、過關或重玩歸零
    shield: false, // 護盾是否在場上
    laser: { time: 0, cooldown: 0 }, // 雷射剩餘時間與下一發的倒數
    bolts: [], // 飛行中的雷射
    status: "playing", // playing | cleared | over
    ballSpeed: 0,
    lastSubsteps: 0,
  };
  let parsedLevel = null;
  let brickLookup = new Map();
  let solidBricks = []; // 不可破壞磚，火球只會被這些彈回
  const dropper = createDropper({ rng, rate: POWERUP.dropRate, pity: POWERUP.pity, powerups: POWERUPS });

  // 道具生效與結束行為；計時道具在 start 前已記入 effects、在 end 前已移除
  const EFFECTS = {
    multiball: { start: splitBalls },
    expand: {
      start: () => setPaddleWidth(paddleDef.width * POWERUP.expandFactor),
      end: () => setPaddleWidth(paddleDef.width),
    },
    slow: { start: respeedBalls, end: respeedBalls },
    fireball: {},
    magnet: {},
    extraLife: {
      start: () => {
        state.lives = Math.min(state.lives + 1, GAME.maxLives);
      },
    },
  };

  function paddleY() {
    return field.height - FIELD.paddleBottomMargin;
  }

  function setBricks(bricks) {
    state.bricks = bricks;
    brickLookup = new Map(bricks.map((b) => [`${b.row},${b.col}`, b]));
    solidBricks = bricks.filter((b) => !b.breakable);
  }

  // 重新開始目前這一關
  function reset() {
    state.paddle = createPaddle(paddleDef, field.width, paddleY());
    state.balls = [createStuckBall(state.paddle, BALL.radius)];
    setBricks(buildBricks(parsedLevel, field.width, BRICK_LAYOUT));
    state.targetScore = targetScore(state.level, state.bricks);
    state.ballSpeed = Math.min(ballSpeed ?? state.level.ballSpeed, BALL.maxSpeed);
    state.capsules = [];
    state.effects = {};
    dropper.reset();
    state.score = 0;
    state.lives = GAME.startLives;
    state.livesLost = 0;
    state.combo = 0;
    state.energy = 0;
    clearSkillEffects();
    state.status = "playing";
    events.emit("gameReset", { level: state.level, lives: state.lives, score: state.score });
  }

  // paddle 可選：換板子（選板子畫面），不傳則沿用目前的板子
  function loadLevel(nextLevel, nextPaddleDef = paddleDef) {
    parsedLevel = parseLevel(nextLevel);
    state.level = nextLevel;
    paddleDef = nextPaddleDef;
    reset();
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

  function hasEffect(id) {
    return Object.hasOwn(state.effects, id);
  }

  // 目前的目標球速（減速球生效時較慢）
  function currentSpeed() {
    return state.ballSpeed * (hasEffect("slow") ? POWERUP.slowFactor : 1);
  }

  function launch(angle) {
    const dir = angleToUpVector(angle);
    const speed = currentSpeed();
    for (const ball of state.balls) {
      if (!ball.stuck) continue;
      ball.stuck = false;
      ball.vx = dir.x * speed;
      ball.vy = dir.y * speed;
      events.emit("ballLaunched", { ballId: ball.id, angle });
    }
  }

  // 碰撞後把速度修回目標速度，並避免太水平
  function fixVelocity(ball) {
    let v = normalizeSpeed(ball.vx, ball.vy, currentSpeed());
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
      // 打到上緣：依擊中位置決定角度；磁鐵生效時黏住，等玩家重新瞄準發射
      ball.y = paddle.y - ball.r;
      if (ball.vy > 0) {
        const center = paddleX + paddle.width / 2;
        if (hasEffect("magnet")) {
          ball.stuck = true;
          ball.stuckOffset = clamp(ball.x - center, -paddle.width / 2, paddle.width / 2);
          ball.vx = 0;
          ball.vy = 0;
          events.emit("ballCaught", { ballId: ball.id });
        } else {
          const bounce = paddleBounce(ball.x, center, paddle.width, paddle.def.maxBounceAngleDeg, currentSpeed());
          ball.vx = bounce.vx;
          ball.vy = bounce.vy;
          events.emit("paddleHit", { ballId: ball.id, offset: bounce.offset });
        }
        resetCombo();
      }
    } else if (ball.x < paddleX + paddle.width / 2) {
      // 打到側邊：水平推出，往外彈；不推出牆外（板子貼牆變長時可能發生）
      ball.x = Math.max(paddleX - ball.r, ball.r);
      ball.vx = -Math.abs(ball.vx);
    } else {
      ball.x = Math.min(paddleX + paddle.width + ball.r, field.width - ball.r);
      ball.vx = Math.abs(ball.vx);
    }
    return true;
  }

  // 火球：碰到的可破壞磚直接打破（多次擊破磚也一次破），不反彈
  function burnBricks(ball) {
    for (const brick of state.bricks) {
      if (!brick.alive || !brick.breakable) continue;
      if (!circleRectContact(ball.x, ball.y, ball.r, brick)) continue;
      brick.hp = 0;
      events.emit("brickHit", { brick, ballId: ball.id, hp: 0, fire: true });
      destroyBrick(brick);
    }
  }

  function collideBricks(ball) {
    const fire = hasEffect("fireball");
    if (fire) burnBricks(ball);
    const bricks = fire ? solidBricks : state.bricks;

    const hit = findNearestHit(ball.x, ball.y, ball.r, bricks);
    if (!hit) return false;

    // 計分只算最近的一塊，但推出位置要考慮所有重疊的磚，
    // 否則同時碰到上下兩塊磚的角時，會被推進另一塊而卡在縫裡
    const brick = bricks[hit.index];
    let sumX = 0;
    let sumY = 0;
    let contact = hit.contact;
    for (let i = 0; i < MAX_PUSHOUT_ITERATIONS && contact; i++) {
      ball.x += contact.nx * contact.depth;
      ball.y += contact.ny * contact.depth;
      sumX += contact.nx;
      sumY += contact.ny;
      contact = findNearestHit(ball.x, ball.y, ball.r, bricks)?.contact;
    }
    const len = Math.hypot(sumX, sumY);
    const nx = len > 1e-6 ? sumX / len : hit.contact.nx;
    const ny = len > 1e-6 ? sumY / len : hit.contact.ny;
    const v = reflect(ball.vx, ball.vy, nx, ny);
    ball.vx = v.vx;
    ball.vy = v.vy;

    if (brick.breakable) brick.hp -= 1;
    events.emit("brickHit", { brick, ballId: ball.id, hp: brick.hp });
    if (brick.breakable && brick.hp <= 0) destroyBrick(brick);
    return true;
  }

  function resetCombo() {
    if (state.combo === 0) return;
    state.combo = 0;
    events.emit("comboChanged", { combo: 0, multiplier: 1 });
  }

  // 每打破一塊磚（含爆炸連鎖）連擊 +1，分數乘上連擊倍率。
  // source 為 "laser" 時不給技能能量，否則雷射會自己把能量充滿
  function awardBrick(brick, baseScore, chainDepth, source) {
    if (source !== "laser") addEnergy(SKILL.energyPerBrick);
    state.combo += 1;
    const multiplier = comboMultiplier(state.combo);
    const score = baseScore * multiplier;
    state.score += score;
    events.emit("brickDestroyed", {
      brick,
      type: brick.type,
      score,
      chain: chainDepth > 0,
      chainDepth,
      combo: state.combo,
      multiplier,
      source,
    });
    events.emit("comboChanged", { combo: state.combo, multiplier });
    dropCapsule(brick);
  }

  function destroyBrick(brick, source = "ball") {
    brick.alive = false;
    awardBrick(brick, brick.score, 0, source);
    if (!brick.explosive) return;

    const { destroyed, detonations } = explode(brick, (row, col) => brickLookup.get(`${row},${col}`));
    for (const { brick: b, depth } of detonations) events.emit("explosion", { brick: b, depth });
    // 連鎖越深分數越高
    for (const { brick: b, depth } of destroyed) awardBrick(b, b.score + CHAIN_BONUS * depth, depth, source);
    // 一次爆炸總共打破幾塊磚（含引爆的那塊）
    events.emit("chainResolved", { count: destroyed.length + 1, source });
  }

  // ---- 板子技能 ----

  function skillDef() {
    return paddleDef.skill ? SKILLS[paddleDef.skill] : null;
  }

  function addEnergy(amount) {
    if (!skillDef() || state.energy >= 1) return;
    state.energy = Math.min(1, state.energy + amount);
    if (state.energy >= 1) events.emit("skillReady", { skill: paddleDef.skill });
  }

  function skillActive() {
    return state.shield || state.laser.time > 0;
  }

  // 能量滿、而且上一次的技能已經結束才能施放
  function castSkill() {
    const skill = skillDef();
    if (!skill || state.energy < 1 || skillActive()) return false;
    state.energy = 0;
    if (skill.id === "shield") state.shield = true;
    if (skill.id === "laser") state.laser = { time: skill.duration, cooldown: 0 };
    events.emit("skillCast", { skill: skill.id });
    return true;
  }

  // 失去生命、過關、重玩時：護盾與雷射消失（能量不在這裡處理）
  function clearSkillEffects() {
    state.shield = false;
    state.laser = { time: 0, cooldown: 0 };
    state.bolts = [];
  }

  function shieldY() {
    return field.height - SKILLS.shield.bottomMargin;
  }

  // 護盾：接住第一顆從上方穿過護盾的球後消失。
  // beforeY 是這個子步驟移動前的位置；已經在護盾下方的球不會被拉回來
  function collideShield(ball, beforeY) {
    if (!state.shield || ball.vy <= 0) return false;
    if (beforeY + ball.r > shieldY() || ball.y + ball.r < shieldY()) return false;
    ball.y = shieldY() - ball.r;
    ball.vy = -Math.abs(ball.vy);
    state.shield = false;
    events.emit("shieldHit", { ballId: ball.id, x: ball.x, y: shieldY() });
    return true;
  }

  function fireLasers() {
    const { boltSize, inset } = SKILLS.laser;
    const paddle = state.paddle;
    for (const cx of [paddle.x + inset, paddle.x + paddle.width - inset]) {
      state.bolts.push(createBolt(cx, paddle.y, boltSize));
    }
    events.emit("laserFired", { x: paddleCenter(paddle), y: paddle.y });
  }

  // 雷射打到第一塊磚就消失：可破壞磚扣 1 下耐久，不可破壞磚擋住
  function updateLaser(dt) {
    const skill = SKILLS.laser;
    if (state.laser.time > 0) {
      // 先判斷發射、再扣冷卻與時間（第一發在施放的那個 tick）；
      // 判斷都留一點誤差，避免浮點誤差讓間隔或總發數差一
      if (state.laser.cooldown <= 1e-9) {
        fireLasers();
        state.laser.cooldown += skill.interval;
      }
      state.laser.cooldown -= dt;
      state.laser.time -= dt;
      if (state.laser.time <= 1e-9) {
        state.laser.time = 0;
        events.emit("skillEnded", { skill: "laser" });
      }
    }

    const flying = [];
    for (const bolt of state.bolts) {
      bolt.prevY = bolt.y;
      bolt.y -= skill.boltSpeed * dt;
      const brick = findBoltHit(bolt, state.bricks);
      if (brick) {
        if (brick.breakable) brick.hp -= 1;
        events.emit("brickHit", { brick, hp: brick.hp, laser: true });
        if (brick.breakable && brick.hp <= 0) destroyBrick(brick, "laser");
      } else if (bolt.y + bolt.h > 0) {
        flying.push(bolt);
      }
    }
    state.bolts = flying;
  }

  // ---- 道具 ----

  function dropCapsule(brick) {
    if (!drops) return;
    const type = dropper.roll({
      blocked: state.capsules.length >= POWERUP.maxCapsules,
      excluded: state.lives >= GAME.maxLives ? ["extraLife"] : [],
    });
    if (!type) return;
    const capsule = createCapsule(type, brick.x + brick.w / 2, brick.y + brick.h / 2, POWERUP.capsuleSize);
    state.capsules.push(capsule);
    events.emit("capsuleSpawned", { type, capsule });
  }

  // 同種計時道具再接到只刷新時間，不重複生效
  function grantPowerup(id) {
    const def = POWERUPS[id];
    if (!def) return;
    const refreshed = hasEffect(id);
    if (def.kind === "timed") state.effects[id] = def.duration;
    if (!refreshed) EFFECTS[id].start?.();
    events.emit("powerupCollected", { type: id, refreshed, lives: state.lives });
  }

  function expirePowerup(id) {
    delete state.effects[id];
    EFFECTS[id].end?.();
    events.emit("powerupExpired", { type: id });
  }

  // 失去生命、過關時：結束所有道具效果、清掉掉落中的膠囊
  function clearPowerups() {
    for (const id of Object.keys(state.effects)) expirePowerup(id);
    state.capsules = [];
  }

  function updatePowerups(dt) {
    for (const id of Object.keys(state.effects)) {
      state.effects[id] -= dt;
      if (state.effects[id] <= 0) expirePowerup(id);
    }

    const paddle = state.paddle;
    const paddleRect = { x: paddle.x, y: paddle.y, w: paddle.width, h: paddle.height };
    const { remaining, caught, missed } = updateCapsules(state.capsules, dt, POWERUP.capsuleSpeed, paddleRect, field.height);
    state.capsules = remaining;
    for (const c of missed) events.emit("capsuleMissed", { type: c.type });
    for (const c of caught) grantPowerup(c.type);
  }

  // 加長 / 還原板子：以中心為準，夾在場地內；黏著的球跟著夾在板子範圍內
  function setPaddleWidth(width) {
    const paddle = state.paddle;
    const x = clamp(paddleCenter(paddle) - width / 2, 0, field.width - width);
    paddle.prevX += x - paddle.x;
    paddle.x = x;
    paddle.width = width;
    for (const ball of state.balls) {
      if (!ball.stuck) continue;
      ball.stuckOffset = clamp(ball.stuckOffset, -width / 2, width / 2);
      followPaddle(ball, paddle);
    }
  }

  // 減速開始或結束時，把移動中的球改成新的目標速度
  function respeedBalls() {
    for (const ball of state.balls) {
      if (!ball.stuck) fixVelocity(ball);
    }
  }

  // 多球：每顆移動中的球往左右各分出一顆，總數有上限。
  // 全部的球都黏在板上（磁鐵）時，新球也黏在旁邊，發射時一起出去
  function splitBalls() {
    const moving = state.balls.filter((b) => !b.stuck);
    const spread = POWERUP.multiballSpreadDeg * DEG;
    for (const sign of [-1, 1]) {
      for (const source of moving.length > 0 ? moving : [state.balls[0]]) {
        if (state.balls.length >= POWERUP.maxBalls) return;
        if (source.stuck) {
          const half = state.paddle.width / 2;
          const offset = clamp(source.stuckOffset + sign * BALL.radius * 2.5, -half, half);
          state.balls.push(createStuckBall(state.paddle, BALL.radius, offset));
        } else {
          const dir = rotate(source.vx, source.vy, sign * spread);
          const v = enforceMinVerticalAngle(dir.x, dir.y, BALL.minVerticalAngleDeg);
          state.balls.push(splitBall(source, v.vx, v.vy));
        }
      }
    }
  }

  // ---- 每個 tick ----

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
      const beforeY = ball.y;
      ball.x += (ball.vx * dt) / n;
      ball.y += (ball.vy * dt) / n;

      let bounced = collideWalls(ball);
      bounced = collidePaddle(ball, paddleX) || bounced;
      if (ball.stuck) {
        followPaddle(ball, paddle);
        return true;
      }
      bounced = collideBricks(ball) || bounced;
      bounced = collideShield(ball, beforeY) || bounced;
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
    else if (input.skill) castSkill();
    if (input.pause) events.emit("pauseRequested", {});

    // 時間充能只在有球在飛的時候，避免發射前放著不動也能充
    if (skillDef() && state.balls.some((b) => !b.stuck)) {
      state.energy = addTimeEnergy(state.energy, SKILL.energyPerSecond * dt, SKILL.timeCap);
    }

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
      state.livesLost += 1;
      resetCombo();
      clearPowerups();
      clearSkillEffects();
      events.emit("lifeLost", { lives: state.lives });
      if (state.lives <= 0) {
        state.status = "over";
        events.emit("gameOver", { level: state.level, score: state.score, targetScore: state.targetScore });
        return;
      }
      state.balls.push(createStuckBall(paddle, BALL.radius));
    }

    updateLaser(dt);
    updatePowerups(dt);

    if (!state.bricks.some((b) => b.alive && b.breakable)) {
      state.status = "cleared";
      clearPowerups();
      clearSkillEffects();
      events.emit("levelCleared", {
        level: state.level,
        score: state.score,
        targetScore: state.targetScore,
        lives: state.lives,
        livesLost: state.livesLost,
        paddleId: paddleDef.id,
      });
    }
  }

  loadLevel(level);

  return {
    state,
    step,
    reset,
    loadLevel,
    setFieldHeight,
    isHolding,
    setBricks,
    grantPowerup,
    currentSpeed,
    castSkill,
    addEnergy,
    skillDef,
    shieldY,
  };
}
