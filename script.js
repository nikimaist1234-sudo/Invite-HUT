const startBtn = document.getElementById("startBtn");
const music = document.getElementById("bgMusic");

const gameHint = document.getElementById("gameHint");
const gameStatus = document.getElementById("gameStatus");

const bombStage = document.getElementById("bombStage");
const greenStage = document.getElementById("greenStage");
const blueStage = document.getElementById("blueStage");
const yellowStage = document.getElementById("yellowStage");

const bombTimer = document.getElementById("bombTimer");
const bombDevice = document.getElementById("bombDevice");
const explosionFlash = document.getElementById("explosionFlash");
const wireLines = document.querySelectorAll(".wire-line");

const greenRunner = document.getElementById("greenRunner");
const runnerArea = document.getElementById("runnerArea");

const digitalClockPanel = document.getElementById("digitalClockPanel");
const digitalClockReadout = document.getElementById("digitalClockReadout");

const yellowOrb = document.getElementById("yellowOrb");
const mazeWrapper = document.getElementById("mazeWrapper");
const mazeEnd = document.getElementById("mazeEnd");

const colorSmokeOverlay = document.getElementById("colorSmokeOverlay");

let bombCountdown = 30;
let bombInterval = null;
let missionLocked = false;

let runnerAnimation = null;
let runnerX = -60;
let runnerDirection = 1;
let runnerCaught = false;

let clockMinutes = 23 * 60 + 45;
let clockDone = false;
let clockSwipeStartY = 0;

let orbDragging = false;
let orbDone = false;
let orbPointerOffsetX = 0;
let orbPointerOffsetY = 0;
let orbX = 0;
let orbY = 0;

const ORB_SIZE = 18;
const ORB_RADIUS = ORB_SIZE / 2;

/* MAZE WALLS based on uploaded reference image */
const mazeWalls = [
  // outer border
  { x1: 30, y1: 20, x2: 30, y2: 290 },
  { x1: 30, y1: 290, x2: 350, y2: 290 },
  { x1: 350, y1: 290, x2: 350, y2: 20 },
  { x1: 30, y1: 20, x2: 120, y2: 20 },
  { x1: 165, y1: 20, x2: 350, y2: 20 },

  // inner walls
  { x1: 120, y1: 20, x2: 120, y2: 105 },
  { x1: 75, y1: 60, x2: 75, y2: 145 },
  { x1: 120, y1: 60, x2: 245, y2: 60 },
  { x1: 165, y1: 60, x2: 165, y2: 195 },
  { x1: 215, y1: 105, x2: 215, y2: 145 },
  { x1: 305, y1: 20, x2: 305, y2: 145 },
  { x1: 305, y1: 60, x2: 350, y2: 60 },
  { x1: 305, y1: 105, x2: 350, y2: 105 },
  { x1: 215, y1: 145, x2: 350, y2: 145 },
  { x1: 30, y1: 145, x2: 120, y2: 145 },
  { x1: 165, y1: 195, x2: 260, y2: 195 },
  { x1: 75, y1: 195, x2: 75, y2: 235 },
  { x1: 30, y1: 235, x2: 75, y2: 235 },
  { x1: 120, y1: 195, x2: 120, y2: 235 },
  { x1: 260, y1: 195, x2: 260, y2: 235 },
  { x1: 215, y1: 235, x2: 260, y2: 235 },
  { x1: 305, y1: 195, x2: 305, y2: 235 },
  { x1: 120, y1: 235, x2: 120, y2: 290 },
  { x1: 215, y1: 235, x2: 215, y2: 290 }
];

const mazeStartPoint = { x: 45, y: 170 };
const mazeEndPoint = { x: 333, y: 45 };
const END_RADIUS = 18;
const WALL_THICKNESS = 10;
const COLLISION_BUFFER = ORB_RADIUS + WALL_THICKNESS / 2 - 1;

startBtn?.addEventListener("click", () => {
  showOnlyPage(1);
  music?.play().catch(() => {});
  initGame();
});

function showOnlyPage(pageNumber) {
  document.querySelectorAll(".page").forEach((p) => p.classList.remove("active"));
  const el = document.getElementById("page" + pageNumber);
  if (el) el.classList.add("active");
}

function initGame() {
  missionLocked = false;
  stopBombCountdown();
  cancelRunnerAnimation();

  colorSmokeOverlay.className = "color-smoke-overlay";

  resetBombStage();
  resetGreenStage();
  resetBlueStage();
  resetYellowStage();

  showStage("bomb");

  gameHint.textContent = "Choose carefully...";
  gameStatus.textContent = "A ticking choice waits for you...";
}

function showStage(stageName) {
  [bombStage, greenStage, blueStage, yellowStage].forEach((stage) => {
    stage.classList.remove("active");
  });

  if (stageName === "bomb") bombStage.classList.add("active");
  if (stageName === "green") greenStage.classList.add("active");
  if (stageName === "blue") blueStage.classList.add("active");
  if (stageName === "yellow") yellowStage.classList.add("active");
}

/* ---------------- BOMB STAGE ---------------- */
function resetBombStage() {
  bombCountdown = 30;
  if (bombTimer) bombTimer.textContent = bombCountdown;

  bombDevice?.classList.remove("explode");
  explosionFlash?.classList.remove("active");

  wireLines.forEach((wire) => {
    wire.classList.remove("cut");
    wire.style.pointerEvents = "auto";
  });

  setupWireSwipes();
  startBombCountdown();
}

function startBombCountdown() {
  stopBombCountdown();

  bombInterval = setInterval(() => {
    if (missionLocked) return;

    bombCountdown--;
    if (bombTimer) bombTimer.textContent = bombCountdown;

    if (bombCountdown <= 0) {
      explodeBombAndRetry("Too late...");
    }
  }, 1000);
}

function stopBombCountdown() {
  if (bombInterval) {
    clearInterval(bombInterval);
    bombInterval = null;
  }
}

function setupWireSwipes() {
  wireLines.forEach((wire) => {
    let startX = 0;
    let startY = 0;
    let active = false;

    const startSwipe = (clientX, clientY) => {
      if (missionLocked) return;
      active = true;
      startX = clientX;
      startY = clientY;
    };

    const moveSwipe = (clientX, clientY) => {
      if (!active || missionLocked) return;

      const dx = clientX - startX;
      const dy = clientY - startY;

      // require a strong vertical swipe on the chosen wire
      if (Math.abs(dy) > 55 && Math.abs(dy) > Math.abs(dx) * 1.2) {
        active = false;
        cutWire(wire.dataset.wire, wire);
      }
    };

    const endSwipe = () => {
      active = false;
    };

    wire.onmousedown = (e) => startSwipe(e.clientX, e.clientY);
    wire.ontouchstart = (e) => {
      if (!e.touches[0]) return;
      startSwipe(e.touches[0].clientX, e.touches[0].clientY);
    };

    wire.onmousemove = (e) => moveSwipe(e.clientX, e.clientY);
    wire.ontouchmove = (e) => {
      if (!e.touches[0]) return;
      moveSwipe(e.touches[0].clientX, e.touches[0].clientY);
    };

    wire.onmouseup = endSwipe;
    wire.onmouseleave = endSwipe;
    wire.ontouchend = endSwipe;
  });
}

function cutWire(color, wireEl) {
  if (missionLocked) return;

  stopBombCountdown();

  wireEl.classList.add("cut");
  wireLines.forEach((w) => (w.style.pointerEvents = "none"));

  if (color === "red") {
    explodeBombAndRetry("Wrong wire...");
    return;
  }

  if (color === "green") {
    gameHint.textContent = "Catch the figure";
    gameStatus.textContent = "It won't stop for long...";
    setTimeout(() => {
      showStage("green");
      initGreenStage();
    }, 450);
  }

  if (color === "blue") {
    gameHint.textContent = "Swipe the clock into tomorrow";
    gameStatus.textContent = "Push time forward...";
    setTimeout(() => {
      showStage("blue");
      initBlueStage();
    }, 450);
  }

  if (color === "yellow") {
    gameHint.textContent = "Guide the orb to the end";
    gameStatus.textContent = "Stay inside the maze...";
    setTimeout(() => {
      showStage("yellow");
      initYellowStage();
    }, 450);
  }
}

function explodeBombAndRetry(message) {
  missionLocked = true;
  bombDevice?.classList.add("explode");
  explosionFlash?.classList.add("active");
  gameStatus.textContent = message;
  gameHint.textContent = "Try again";

  setTimeout(() => {
    explosionFlash?.classList.remove("active");
    initGame();
  }, 1800);
}

/* ---------------- GREEN STAGE ---------------- */
function resetGreenStage() {
  runnerCaught = false;
  runnerX = -60;
  runnerDirection = 1;

  if (greenRunner) {
    greenRunner.style.left = "-60px";
    greenRunner.style.top = "55%";
    greenRunner.classList.remove("caught");
  }

  greenRunner.onclick = catchGreenRunner;
  greenRunner.ontouchstart = catchGreenRunner;
}

function initGreenStage() {
  cancelRunnerAnimation();

  let phase = 0;

  function animateRunner() {
    if (runnerCaught) return;

    const areaRect = runnerArea.getBoundingClientRect();
    const maxX = Math.max(20, areaRect.width - 70);

    runnerX += 5 * runnerDirection;

    if (runnerX >= maxX) runnerDirection = -1;
    if (runnerX <= 0) runnerDirection = 1;

    phase += 0.12;
    const y = 55 + Math.sin(phase) * 18;

    greenRunner.style.left = `${runnerX}px`;
    greenRunner.style.top = `${y}%`;

    runnerAnimation = requestAnimationFrame(animateRunner);
  }

  animateRunner();
}

function cancelRunnerAnimation() {
  if (runnerAnimation) {
    cancelAnimationFrame(runnerAnimation);
    runnerAnimation = null;
  }
}

function catchGreenRunner(e) {
  if (runnerCaught) return;
  if (e) e.preventDefault();

  runnerCaught = true;
  cancelRunnerAnimation();
  greenRunner.classList.add("caught");
  gameStatus.textContent = "Caught.";
  revealInviteWithSmoke("green");
}

/* ---------------- BLUE CLOCK STAGE ---------------- */
function resetBlueStage() {
  clockMinutes = 23 * 60 + 45;
  clockDone = false;
  updateClockReadout();

  let active = false;

  const start = (clientY) => {
    if (clockDone) return;
    active = true;
    clockSwipeStartY = clientY;
  };

  const move = (clientY) => {
    if (!active || clockDone) return;

    const deltaY = clockSwipeStartY - clientY;
    if (Math.abs(deltaY) >= 18) {
      const minuteSteps = Math.floor(Math.abs(deltaY) / 18);
      if (minuteSteps > 0) {
        clockMinutes += minuteSteps;
        if (clockMinutes > 24 * 60 + 1) clockMinutes = 24 * 60 + 1;
        updateClockReadout();
        clockSwipeStartY = clientY;
      }
    }

    if (clockMinutes >= 24 * 60 + 1) {
      active = false;
      clockDone = true;
      gameStatus.textContent = "Tomorrow reached.";
      digitalClockPanel.classList.add("done");
      revealInviteWithSmoke("blue");
    }
  };

  const end = () => {
    active = false;
  };

  digitalClockPanel.classList.remove("done");

  digitalClockPanel.onmousedown = (e) => start(e.clientY);
  digitalClockPanel.ontouchstart = (e) => {
    if (!e.touches[0]) return;
    start(e.touches[0].clientY);
  };

  digitalClockPanel.onmousemove = (e) => move(e.clientY);
  digitalClockPanel.ontouchmove = (e) => {
    if (!e.touches[0]) return;
    move(e.touches[0].clientY);
  };

  digitalClockPanel.onmouseup = end;
  digitalClockPanel.onmouseleave = end;
  digitalClockPanel.ontouchend = end;
}

function initBlueStage() {
  gameStatus.textContent = "Swipe upward to push time forward...";
}

function updateClockReadout() {
  const normalized = clockMinutes % (24 * 60);
  const hours = Math.floor(normalized / 60);
  const mins = normalized % 60;

  const hh = String(hours).padStart(2, "0");
  const mm = String(mins).padStart(2, "0");

  digitalClockReadout.textContent = `${hh}:${mm}`;
}

/* ---------------- YELLOW MAZE STAGE ---------------- */
function resetYellowStage() {
  orbDragging = false;
  orbDone = false;

  setOrbPosition(mazeStartPoint.x - ORB_RADIUS, mazeStartPoint.y - ORB_RADIUS);

  yellowOrb.onmousedown = startOrbDrag;
  yellowOrb.ontouchstart = (e) => {
    if (!e.touches[0]) return;
    startOrbDrag(e.touches[0]);
  };

  document.onmousemove = moveOrbDrag;
  document.onmouseup = endOrbDrag;

  document.ontouchmove = (e) => {
    if (!orbDragging || !e.touches[0]) return;
    e.preventDefault();
    moveOrbDrag(e.touches[0]);
  };

  document.ontouchend = endOrbDrag;

  if (mazeEnd) {
    mazeEnd.style.left = `${mazeEndPoint.x - END_RADIUS}px`;
    mazeEnd.style.top = `${mazeEndPoint.y - END_RADIUS}px`;
  }
}

function initYellowStage() {
  gameStatus.textContent = "Guide the orb through the maze...";
}

function setOrbPosition(x, y) {
  orbX = x;
  orbY = y;
  yellowOrb.style.left = `${x}px`;
  yellowOrb.style.top = `${y}px`;
}

function startOrbDrag(e) {
  if (orbDone) return;

  orbDragging = true;
  const orbRect = yellowOrb.getBoundingClientRect();
  orbPointerOffsetX = e.clientX - orbRect.left;
  orbPointerOffsetY = e.clientY - orbRect.top;

  if (e.preventDefault) e.preventDefault();
}

function moveOrbDrag(e) {
  if (!orbDragging || orbDone) return;

  const wrapperRect = mazeWrapper.getBoundingClientRect();

  let targetX = e.clientX - wrapperRect.left - orbPointerOffsetX;
  let targetY = e.clientY - wrapperRect.top - orbPointerOffsetY;

  targetX = clamp(targetX, 0, wrapperRect.width - ORB_SIZE);
  targetY = clamp(targetY, 0, wrapperRect.height - ORB_SIZE);

  // Move in small steps so the orb stops at walls instead of jumping through them
  const dx = targetX - orbX;
  const dy = targetY - orbY;
  const distance = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(distance / 3));

  let nextX = orbX;
  let nextY = orbY;

  for (let i = 1; i <= steps; i++) {
    const stepX = orbX + (dx * i) / steps;
    const stepY = orbY + (dy * i) / steps;

    if (canPlaceOrb(stepX, nextY)) {
      nextX = stepX;
    }

    if (canPlaceOrb(nextX, stepY)) {
      nextY = stepY;
    }
  }

  setOrbPosition(nextX, nextY);
  checkMazeEnd();
}

function endOrbDrag() {
  orbDragging = false;
}

function canPlaceOrb(x, y) {
  const centerX = x + ORB_RADIUS;
  const centerY = y + ORB_RADIUS;

  for (const wall of mazeWalls) {
    const dist = distancePointToSegment(centerX, centerY, wall.x1, wall.y1, wall.x2, wall.y2);
    if (dist < COLLISION_BUFFER) {
      return false;
    }
  }

  return true;
}

function checkMazeEnd() {
  if (orbDone) return;

  const centerX = orbX + ORB_RADIUS;
  const centerY = orbY + ORB_RADIUS;
  const dist = Math.hypot(centerX - mazeEndPoint.x, centerY - mazeEndPoint.y);

  if (dist <= END_RADIUS) {
    orbDone = true;
    gameStatus.textContent = "You reached the end.";
    revealInviteWithSmoke("yellow");
  }
}

function distancePointToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;

  if (dx === 0 && dy === 0) {
    return Math.hypot(px - x1, py - y1);
  }

  const t = ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy);
  const clampedT = Math.max(0, Math.min(1, t));

  const nearestX = x1 + clampedT * dx;
  const nearestY = y1 + clampedT * dy;

  return Math.hypot(px - nearestX, py - nearestY);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/* ---------------- REVEAL ---------------- */
function revealInviteWithSmoke(color) {
  missionLocked = true;
  stopBombCountdown();
  cancelRunnerAnimation();

  colorSmokeOverlay.className = `color-smoke-overlay active ${color}`;

  setTimeout(() => {
    colorSmokeOverlay.classList.add("swipe-up");
    document.body.classList.add("launch-reveal");
  }, 1800);

  setTimeout(() => {
    finishGame();
  }, 3200);
}

function finishGame() {
  document.body.classList.remove("locked");
  document.body.classList.add("scroll-mode");
  document.getElementById("page2")?.scrollIntoView({ behavior: "smooth" });
}
