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
const mazeGrid = document.getElementById("mazeGrid");
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
let clockSwipeAccumulator = 0;

let orbDragging = false;
let orbDone = false;
let orbPointerOffsetX = 0;
let orbPointerOffsetY = 0;

const MAZE_COLS = 16;
const MAZE_ROWS = 12;
const CELL_SIZE = 22;

/* 1 = wall, 0 = open */
const mazeMap = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,0,0,0,0,0,0,0,0,1,0,1,0,0,0,1],
  [1,0,1,1,1,0,1,1,0,1,0,1,0,1,0,1],
  [1,0,0,0,1,0,0,0,1,0,0,1,0,1,0,1],
  [1,1,1,0,1,1,1,0,1,1,0,1,1,1,0,1],
  [1,0,0,0,1,0,1,0,0,0,0,1,0,1,0,1],
  [1,0,1,1,1,0,1,0,1,1,1,1,0,1,1,1],
  [1,0,0,0,0,0,0,0,1,0,0,1,0,0,0,1],
  [1,1,1,0,1,0,1,1,1,0,1,1,1,0,1,1],
  [1,0,0,0,1,0,0,0,0,0,1,0,0,0,1,1],
  [1,0,1,1,1,1,1,1,1,0,1,1,1,1,0,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
];

const mazeStartCell = { col: 1, row: 9 };
const mazeEndCell = { col: 14, row: 10 };

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
  renderMaze();
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

  setupWireSlicing();
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

function setupWireSlicing() {
  wireLines.forEach((wire) => {
    let startX = 0;
    let startY = 0;
    let slicing = false;

    const startSlice = (clientX, clientY) => {
      if (missionLocked) return;
      slicing = true;
      startX = clientX;
      startY = clientY;
    };

    const moveSlice = (clientX, clientY) => {
      if (!slicing || missionLocked) return;

      const dx = clientX - startX;
      const dy = clientY - startY;

      if (Math.abs(dx) > 70 && Math.abs(dy) < 45) {
        slicing = false;
        cutWire(wire.dataset.wire, wire);
      }
    };

    const endSlice = () => {
      slicing = false;
    };

    wire.onmousedown = (e) => startSlice(e.clientX, e.clientY);
    wire.ontouchstart = (e) => {
      if (!e.touches[0]) return;
      startSlice(e.touches[0].clientX, e.touches[0].clientY);
    };

    wire.onmousemove = (e) => moveSlice(e.clientX, e.clientY);
    wire.ontouchmove = (e) => {
      if (!e.touches[0]) return;
      moveSlice(e.touches[0].clientX, e.touches[0].clientY);
    };

    wire.onmouseup = endSlice;
    wire.onmouseleave = endSlice;
    wire.ontouchend = endSlice;
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
  clockSwipeAccumulator = 0;
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
function renderMaze() {
  if (!mazeGrid) return;

  mazeGrid.innerHTML = "";
  mazeGrid.style.gridTemplateColumns = `repeat(${MAZE_COLS}, ${CELL_SIZE}px)`;
  mazeGrid.style.gridTemplateRows = `repeat(${MAZE_ROWS}, ${CELL_SIZE}px)`;

  for (let row = 0; row < MAZE_ROWS; row++) {
    for (let col = 0; col < MAZE_COLS; col++) {
      const cell = document.createElement("div");
      cell.className = mazeMap[row][col] === 1 ? "maze-cell wall" : "maze-cell open";
      mazeGrid.appendChild(cell);
    }
  }

  mazeWrapper.style.width = `${MAZE_COLS * CELL_SIZE}px`;
  mazeWrapper.style.height = `${MAZE_ROWS * CELL_SIZE}px`;

  mazeEnd.style.left = `${mazeEndCell.col * CELL_SIZE + 2}px`;
  mazeEnd.style.top = `${mazeEndCell.row * CELL_SIZE + 2}px`;
}

function resetYellowStage() {
  orbDragging = false;
  orbDone = false;

  setOrbToCellCenter(mazeStartCell.col, mazeStartCell.row);

  yellowOrb.onmousedown = startOrbDrag;
  yellowOrb.ontouchstart = (e) => {
    if (!e.touches[0]) return;
    startOrbDrag(e.touches[0]);
  };

  document.addEventListener("mousemove", moveOrbDrag);
  document.addEventListener("mouseup", endOrbDrag);
  document.addEventListener(
    "touchmove",
    (e) => {
      if (!orbDragging || !e.touches[0]) return;
      e.preventDefault();
      moveOrbDrag(e.touches[0]);
    },
    { passive: false }
  );
  document.addEventListener("touchend", endOrbDrag);
}

function initYellowStage() {
  gameStatus.textContent = "Guide the orb through the maze...";
}

function setOrbToCellCenter(col, row) {
  const orbSize = 18;
  const x = col * CELL_SIZE + (CELL_SIZE - orbSize) / 2;
  const y = row * CELL_SIZE + (CELL_SIZE - orbSize) / 2;

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
  const orbSize = 18;

  let x = e.clientX - wrapperRect.left - orbPointerOffsetX;
  let y = e.clientY - wrapperRect.top - orbPointerOffsetY;

  x = Math.max(0, Math.min(wrapperRect.width - orbSize, x));
  y = Math.max(0, Math.min(wrapperRect.height - orbSize, y));

  const centerX = x + orbSize / 2;
  const centerY = y + orbSize / 2;

  const col = Math.floor(centerX / CELL_SIZE);
  const row = Math.floor(centerY / CELL_SIZE);

  if (isOpenCell(col, row)) {
    yellowOrb.style.left = `${x}px`;
    yellowOrb.style.top = `${y}px`;
    checkMazeEnd(col, row);
  }
}

function endOrbDrag() {
  orbDragging = false;
}

function isOpenCell(col, row) {
  if (row < 0 || row >= MAZE_ROWS || col < 0 || col >= MAZE_COLS) return false;
  return mazeMap[row][col] === 0;
}

function checkMazeEnd(col, row) {
  if (orbDone) return;

  if (col === mazeEndCell.col && row === mazeEndCell.row) {
    orbDone = true;
    gameStatus.textContent = "You reached the end.";
    revealInviteWithSmoke("yellow");
  }
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
