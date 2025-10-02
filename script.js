const canvas = document.getElementById("myCanvas");
const ctx = canvas.getContext("2d");

// 響應式 Canvas 設置
function resizeCanvas() {
  const container = canvas.parentElement;
  const containerWidth = container.clientWidth;
  const containerHeight = container.clientHeight;

  // 保持 4:3 的寬高比，但適應容器
  const aspectRatio = 800 / 600;
  let canvasWidth = Math.min(containerWidth * 0.95, 800);
  let canvasHeight = canvasWidth / aspectRatio;

  if (canvasHeight > containerHeight * 0.95) {
    canvasHeight = containerHeight * 0.95;
    canvasWidth = canvasHeight * aspectRatio;
  }

  canvas.style.width = canvasWidth + "px";
  canvas.style.height = canvasHeight + "px";

  // 計算縮放比例
  const scaleX = canvasWidth / 800;
  const scaleY = canvasHeight / 600;

  // 保存縮放信息供遊戲邏輯使用
  canvas.scaleX = scaleX;
  canvas.scaleY = scaleY;
}

// 初始化時設置 Canvas 大小
resizeCanvas();

// 監聽視窗大小變化
window.addEventListener("resize", resizeCanvas);

// Matter.js 模組（只導入需要的部分）
const MatterEngine = Matter.Engine;
const MatterWorld = Matter.World;
const MatterBodies = Matter.Bodies;
const MatterBody = Matter.Body;
const MatterEvents = Matter.Events;

// 創建輕量級 Matter.js 引擎（僅用於物理計算，不渲染）
const engine = MatterEngine.create();
const world = engine.world;

// 禁用 Matter.js 的渲染器，我們用原生 Canvas 渲染
engine.render = null;

// 球的屬性
const ball = {
  x: canvas.width / 2,
  y: canvas.height / 2,
  radius: 15,
  dx: 0.5, // x 方向速度
  dy: 0.5, // y 方向速度
  color: "blue",
  shakeOffset: 0, // 抖動偏移
  shakeIntensity: 0, // 抖動強度
  shakeDecay: 0.85, // 抖動衰減

  // 平滑移動相關
  targetX: canvas.width / 2, // 目標位置
  targetY: canvas.height / 2,
  smoothFactor: 0.15, // 平滑係數 (0-1，越小越平滑)
  maxSpeed: 8, // 最大速度限制
};

// 球拍屬性
const paddle = {
  x: canvas.width / 2 - 50,
  y: canvas.height - 20,
  width: 100,
  height: 15,
  color: "red",
  speed: 5,
  shakeOffset: 0, // 抖動偏移
  shakeIntensity: 0, // 抖動強度
  shakeDecay: 0.9, // 抖動衰減
};

// Matter.js 物理物件（只用於球拍碰撞）
let physicsPaddle;
let physicsBall; // 只用於與球拍的碰撞檢測

// 磚塊屬性
const brickRowCount = 5;
const brickColumnCount = 9;
const brickWidth = 75;
const brickHeight = 20;
const brickPadding = 10;
const brickOffsetTop = 60;
const brickOffsetLeft = 30;

// 磚塊陣列
const bricks = [];
for (let c = 0; c < brickColumnCount; c++) {
  bricks[c] = [];
  for (let r = 0; r < brickRowCount; r++) {
    bricks[c][r] = { x: 0, y: 0, status: 1 };
  }
}

// 初始化 Matter.js 物理世界（只用於球拍碰撞）
function initPhysics() {
  // 創建物理球拍
  physicsPaddle = MatterBodies.rectangle(
    paddle.x + paddle.width / 2,
    paddle.y + paddle.height / 2,
    paddle.width,
    paddle.height,
    {
      isStatic: true,
      render: { visible: false },
      label: "paddle",
    }
  );

  // 創建物理球（只用於與球拍的碰撞檢測）
  physicsBall = MatterBodies.circle(ball.x, ball.y, ball.radius, {
    restitution: 0.8,
    friction: 0,
    frictionAir: 0,
    render: { visible: false },
    label: "ball",
  });

  // 添加到世界
  MatterWorld.add(world, [physicsPaddle, physicsBall]);

  // 監聽碰撞事件
  MatterEvents.on(engine, "collisionStart", function (event) {
    const pairs = event.pairs;

    for (let i = 0; i < pairs.length; i++) {
      const pair = pairs[i];
      const bodyA = pair.bodyA;
      const bodyB = pair.bodyB;

      // 球與球拍碰撞
      if (
        (bodyA === physicsBall && bodyB === physicsPaddle) ||
        (bodyB === physicsBall && bodyA === physicsPaddle)
      ) {
        // 觸發球拍抖動
        paddle.shakeIntensity = 3;

        // 使用 Matter.js 計算反彈角度
        const hitPos = (ball.x - paddle.x) / paddle.width;
        const angle = ((hitPos - 0.5) * Math.PI) / 3; // -60度到60度

        // 設定新的速度
        const speed = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy);
        ball.dx = Math.sin(angle) * speed;
        ball.dy = -Math.abs(Math.cos(angle) * speed);

        // 更新物理球的位置和速度
        MatterBody.setPosition(physicsBall, { x: ball.x, y: ball.y });
        MatterBody.setVelocity(physicsBall, { x: ball.dx, y: ball.dy });
      }
    }
  });

  // 啟動物理引擎
  MatterEngine.run(engine);
}

// 遊戲狀態
let score = 0;
let lives = 3;
let ballLaunched = false; // 球是否已發射

// 平滑移動函數
function lerp(start, end, factor) {
  return start + (end - start) * factor;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// 滑鼠控制
let mouseX = 0;
let mouseY = 0;

// 滑鼠移動事件
canvas.addEventListener("mousemove", (e) => {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  mouseX = (e.clientX - rect.left) * scaleX;
  mouseY = (e.clientY - rect.top) * scaleY;
});

// 滑鼠點擊事件 - 直接發射
canvas.addEventListener("click", (e) => {
  if (!ballLaunched) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    // 直接發射到滑鼠位置
    launchBallToPosition(clickX, clickY);
  }
});

// 觸控事件支持
canvas.addEventListener("touchstart", (e) => {
  e.preventDefault();
  if (!ballLaunched) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const touch = e.touches[0];
    const clickX = (touch.clientX - rect.left) * scaleX;
    const clickY = (touch.clientY - rect.top) * scaleY;

    // 直接發射到觸控位置
    launchBallToPosition(clickX, clickY);
  }
});

canvas.addEventListener("touchmove", (e) => {
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  const touch = e.touches[0];
  mouseX = (touch.clientX - rect.left) * scaleX;
  mouseY = (touch.clientY - rect.top) * scaleY;
});

// 發射球函數 - 直接指向滑鼠位置
function launchBallToPosition(targetX, targetY) {
  // 計算從球到目標位置的方向
  const dx = targetX - ball.x;
  const dy = targetY - ball.y;

  // 計算距離
  const distance = Math.sqrt(dx * dx + dy * dy);

  // 固定發射速度
  const speed = 5;

  // 計算方向向量
  ball.dx = (dx / distance) * speed;
  ball.dy = (dy / distance) * speed;

  // 設置目標位置
  ball.targetX = ball.x + ball.dx;
  ball.targetY = ball.y + ball.dy;

  ballLaunched = true;
}

// 繪製發射預覽
function drawLaunchPreview() {
  if (!ballLaunched) {
    ctx.save();

    // 畫發射方向線
    ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
    ctx.lineWidth = 2;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(ball.x, ball.y);
    ctx.lineTo(mouseX, mouseY);
    ctx.stroke();

    // 畫發射目標點
    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    ctx.beginPath();
    ctx.arc(mouseX, mouseY, 6, 0, Math.PI * 2);
    ctx.fill();

    // 畫方向箭頭
    const dx = mouseX - ball.x;
    const dy = mouseY - ball.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 15) {
      const angle = Math.atan2(dy, dx);
      const arrowLength = 12;
      const arrowX = mouseX - Math.cos(angle) * arrowLength;
      const arrowY = mouseY - Math.sin(angle) * arrowLength;

      ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
      ctx.beginPath();
      ctx.moveTo(mouseX, mouseY);
      ctx.lineTo(
        arrowX - Math.cos(angle - Math.PI / 6) * 6,
        arrowY - Math.sin(angle - Math.PI / 6) * 6
      );
      ctx.lineTo(
        arrowX - Math.cos(angle + Math.PI / 6) * 6,
        arrowY - Math.sin(angle + Math.PI / 6) * 6
      );
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }
}

function drawBall() {
  ctx.beginPath();

  // 應用抖動效果
  const shakeX = ball.shakeOffset;
  const shakeY = Math.sin(Date.now() * 0.15) * ball.shakeIntensity * 0.3;

  ctx.arc(ball.x + shakeX, ball.y + shakeY, ball.radius, 0, Math.PI * 2);
  ctx.fillStyle = ball.color;
  ctx.fill();
  ctx.closePath();
}

function drawPaddle() {
  ctx.fillStyle = paddle.color;

  // 應用抖動效果
  const shakeX = paddle.shakeOffset;
  const shakeY = Math.sin(Date.now() * 0.1) * paddle.shakeIntensity * 0.5;

  ctx.fillRect(
    paddle.x + shakeX,
    paddle.y + shakeY,
    paddle.width,
    paddle.height
  );
}

function updatePaddle() {
  // 使用滑鼠位置控制球拍
  const targetX = mouseX - paddle.width / 2;

  // 限制球拍在畫布範圍內
  paddle.x = Math.max(0, Math.min(targetX, canvas.width - paddle.width));

  // 平滑移動球拍
  paddle.x = lerp(paddle.x, targetX, 0.3);

  // 更新物理球拍的位置
  MatterBody.setPosition(physicsPaddle, {
    x: paddle.x + paddle.width / 2,
    y: paddle.y + paddle.height / 2,
  });

  // 更新抖動效果
  if (paddle.shakeIntensity > 0) {
    paddle.shakeOffset = (Math.random() - 0.5) * paddle.shakeIntensity;
    paddle.shakeIntensity *= paddle.shakeDecay;

    if (paddle.shakeIntensity < 0.1) {
      paddle.shakeIntensity = 0;
      paddle.shakeOffset = 0;
    }
  }
}

function drawBricks() {
  for (let c = 0; c < brickColumnCount; c++) {
    for (let r = 0; r < brickRowCount; r++) {
      if (bricks[c][r].status === 1) {
        const brickX = c * (brickWidth + brickPadding) + brickOffsetLeft;
        const brickY = r * (brickHeight + brickPadding) + brickOffsetTop;
        bricks[c][r].x = brickX;
        bricks[c][r].y = brickY;

        ctx.beginPath();
        ctx.rect(brickX, brickY, brickWidth, brickHeight);
        ctx.fillStyle = "#0095DD";
        ctx.fill();
        ctx.closePath();
      }
    }
  }
}

function collisionDetection() {
  for (let c = 0; c < brickColumnCount; c++) {
    for (let r = 0; r < brickRowCount; r++) {
      const brick = bricks[c][r];
      if (brick.status === 1) {
        const brickX = c * (brickWidth + brickPadding) + brickOffsetLeft;
        const brickY = r * (brickHeight + brickPadding) + brickOffsetTop;

        // 更新磚塊位置
        brick.x = brickX;
        brick.y = brickY;

        // 更精確的圓形與矩形碰撞檢測
        if (
          checkCircleRectCollision(
            ball,
            brickX,
            brickY,
            brickWidth,
            brickHeight
          )
        ) {
          // 計算碰撞邊和反彈方向
          const collision = getCollisionSide(
            ball,
            brickX,
            brickY,
            brickWidth,
            brickHeight
          );

          if (collision.side === "left" || collision.side === "right") {
            ball.dx = -ball.dx;
            ball.targetX = ball.x; // 防止球卡在磚塊內
          }
          if (collision.side === "top" || collision.side === "bottom") {
            ball.dy = -ball.dy;
            ball.targetY = ball.y; // 防止球卡在磚塊內
          }

          brick.status = 0;
          score++;

          // 調整球的位置，避免重複碰撞
          if (collision.side === "left") {
            ball.x = brickX - ball.radius - 1;
            ball.targetX = ball.x;
          } else if (collision.side === "right") {
            ball.x = brickX + brickWidth + ball.radius + 1;
            ball.targetX = ball.x;
          } else if (collision.side === "top") {
            ball.y = brickY - ball.radius - 1;
            ball.targetY = ball.y;
          } else if (collision.side === "bottom") {
            ball.y = brickY + brickHeight + ball.radius + 1;
            ball.targetY = ball.y;
          }
        }
      }
    }
  }
}

// 圓形與矩形碰撞檢測
function checkCircleRectCollision(circle, rectX, rectY, rectWidth, rectHeight) {
  // 找到矩形上離圓心最近的點
  const closestX = Math.max(rectX, Math.min(circle.x, rectX + rectWidth));
  const closestY = Math.max(rectY, Math.min(circle.y, rectY + rectHeight));

  // 計算圓心到最近點的距離
  const distanceX = circle.x - closestX;
  const distanceY = circle.y - closestY;
  const distanceSquared = distanceX * distanceX + distanceY * distanceY;

  // 如果距離小於圓的半徑，則發生碰撞
  return distanceSquared < circle.radius * circle.radius;
}

// 獲取碰撞邊
function getCollisionSide(circle, rectX, rectY, rectWidth, rectHeight) {
  const ballLeft = circle.x - circle.radius;
  const ballRight = circle.x + circle.radius;
  const ballTop = circle.y - circle.radius;
  const ballBottom = circle.y + circle.radius;

  const rectLeft = rectX;
  const rectRight = rectX + rectWidth;
  const rectTop = rectY;
  const rectBottom = rectY + rectHeight;

  // 計算各邊的重疊距離
  const overlapLeft = ballRight - rectLeft;
  const overlapRight = rectRight - ballLeft;
  const overlapTop = ballBottom - rectTop;
  const overlapBottom = rectBottom - ballTop;

  // 找到最小的重疊距離
  const minOverlap = Math.min(
    overlapLeft,
    overlapRight,
    overlapTop,
    overlapBottom
  );

  if (minOverlap === overlapLeft) {
    return { side: "left", overlap: overlapLeft };
  } else if (minOverlap === overlapRight) {
    return { side: "right", overlap: overlapRight };
  } else if (minOverlap === overlapTop) {
    return { side: "top", overlap: overlapTop };
  } else {
    return { side: "bottom", overlap: overlapBottom };
  }
}

function updateBall() {
  // 只有在球已發射時才更新位置
  if (ballLaunched) {
    // 計算目標位置
    ball.targetX += ball.dx;
    ball.targetY += ball.dy;

    // 限制速度
    const speed = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy);
    if (speed > ball.maxSpeed) {
      ball.dx = (ball.dx / speed) * ball.maxSpeed;
      ball.dy = (ball.dy / speed) * ball.maxSpeed;
    }

    // 平滑移動到目標位置
    ball.x = lerp(ball.x, ball.targetX, ball.smoothFactor);
    ball.y = lerp(ball.y, ball.targetY, ball.smoothFactor);

    // 碰到左右邊界（使用目標位置檢測）
    if (
      ball.targetX + ball.radius > canvas.width ||
      ball.targetX - ball.radius < 0
    ) {
      ball.dx = -ball.dx; // 反彈
      ball.shakeIntensity = 2; // 觸發抖動
      // 調整目標位置避免重複碰撞
      ball.targetX = clamp(
        ball.targetX,
        ball.radius,
        canvas.width - ball.radius
      );
    }

    // 碰到上邊界（使用目標位置檢測）
    if (ball.targetY - ball.radius < 0) {
      ball.dy = -ball.dy;
      ball.shakeIntensity = 2; // 觸發抖動
      // 調整目標位置避免重複碰撞
      ball.targetY = Math.max(ball.radius, ball.targetY);
    }

    // 球掉落檢測
    if (ball.y > canvas.height) {
      lives--;
      if (lives === 0) {
        alert("遊戲結束！最終分數: " + score);
        document.location.reload();
      } else {
        resetBall();
      }
      return;
    }

    // 更新球的抖動效果
    if (ball.shakeIntensity > 0) {
      ball.shakeOffset = (Math.random() - 0.5) * ball.shakeIntensity;
      ball.shakeIntensity *= ball.shakeDecay;

      if (ball.shakeIntensity < 0.1) {
        ball.shakeIntensity = 0;
        ball.shakeOffset = 0;
      }
    }

    // 同步更新物理球的位置（用於與球拍的碰撞檢測）
    MatterBody.setPosition(physicsBall, { x: ball.x, y: ball.y });
    MatterBody.setVelocity(physicsBall, { x: ball.dx, y: ball.dy });
  } else {
    // 球未發射時，讓球跟隨板子移動
    const followX = paddle.x + paddle.width / 2;
    const followY = paddle.y - ball.radius;

    ball.targetX = followX;
    ball.targetY = followY;

    // 平滑跟隨球拍
    ball.x = lerp(ball.x, ball.targetX, 0.3);
    ball.y = lerp(ball.y, ball.targetY, 0.3);

    ball.dx = 0;
    ball.dy = 0;

    // 同步更新物理球
    MatterBody.setPosition(physicsBall, { x: ball.x, y: ball.y });
    MatterBody.setVelocity(physicsBall, { x: 0, y: 0 });
  }

  // 磚塊碰撞檢測
  collisionDetection();
}

function resetBall() {
  // 重置球的位置和狀態
  const resetX = paddle.x + paddle.width / 2;
  const resetY = paddle.y - ball.radius;

  ball.x = resetX;
  ball.y = resetY;
  ball.targetX = resetX;
  ball.targetY = resetY;
  ball.dx = 0;
  ball.dy = 0;
  ballLaunched = false;

  // 重置抖動狀態
  ball.shakeIntensity = 0;
  ball.shakeOffset = 0;

  // 重置物理球
  MatterBody.setPosition(physicsBall, { x: ball.x, y: ball.y });
  MatterBody.setVelocity(physicsBall, { x: 0, y: 0 });
}

function drawScore() {
  ctx.font = "16px Arial";
  ctx.fillStyle = "#0095DD";
  ctx.fillText("分數: " + score, 8, 20);
}

function drawLives() {
  ctx.font = "16px Arial";
  ctx.fillStyle = "#0095DD";
  ctx.fillText("生命: " + lives, canvas.width - 65, 20);
}

function drawInstructions() {
  // 移除所有操作說明文字
}

function animate() {
  // 清除畫布
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 繪製和更新
  drawBricks();
  drawBall();
  drawPaddle();
  drawLaunchPreview(); // 繪製發射預覽
  drawScore();
  drawLives();
  drawInstructions(); // 繪製操作說明
  updateBall();
  updatePaddle();

  // 檢查是否所有磚塊都被破壞
  let allBricksDestroyed = true;
  for (let c = 0; c < brickColumnCount; c++) {
    for (let r = 0; r < brickRowCount; r++) {
      if (bricks[c][r].status === 1) {
        allBricksDestroyed = false;
        break;
      }
    }
    if (!allBricksDestroyed) break;
  }

  if (allBricksDestroyed) {
    alert("恭喜！你贏了！最終分數: " + score);
    document.location.reload();
  }

  // 繼續動畫
  requestAnimationFrame(animate);
}

// 初始化物理引擎
initPhysics();

// 啟動遊戲
animate();
