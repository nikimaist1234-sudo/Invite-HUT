const startBtn = document.getElementById("startBtn");
const music = document.getElementById("bgMusic");

const gameHint = document.getElementById("gameHint");
const gameStatus = document.getElementById("gameStatus");

const bombStage = document.getElementById("bombStage");
const greenStage = document.getElementById("greenStage");
const blueStage = document.getElementById("blueStage");
const yellowStage = document.getElementById("yellowStage");

const bombTimer = document.getElementById("bombTimer");
const bombShell = document.getElementById("bombShell");
const explosionFlash = document.getElementById("explosionFlash");
const wireButtons = document.querySelectorAll(".wire-btn");

const greenRunner = document.getElementById("greenRunner");
const runnerArea = document.getElementById("runnerArea");

const timelineTrack = document.getElementById("timelineTrack");
const timelineHandle = document.getElementById("timelineHandle");
const timelineFill = document.getElementById("timelineFill");

const yellowOrb = document.getElementById("yellowOrb");
const mazeEnd = document.getElementById("mazeEnd");

const colorSmokeOverlay = document.getElementById("colorSmokeOverlay");

let bombCountdown = 30;
let bombInterval = null;
let missionLocked = false;

let runnerAnimation = null;
let runnerX = -60;
let runnerDirection = 1;
let runnerCaught = false;

let timelineDragging = false;
let timelineDone = false;
let timelineProgress = 0;

let orbDragging = false;
let orbDone = false;
let orbPointerOffsetX = 0;
let orbPointerOffsetY = 0;

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
  [bombStage, greenStage, blueStage, yellowStage].forEach(stage => {
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
  bombShell?.classList.remove("explode");
  explosionFlash?.classList.remove("active");

  wireButtons.forEach(btn => {
    btn.disabled = false;
  });

  wireButtons.forEach(btn => {
    btn.onclick = () => handleWireChoice(btn.dataset.wire);
  });

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

function handleWireChoice(color) {
  if (missionLocked) return;
  stopBombCountdown();

  if (color === "red") {
    explodeBombAndRetry("Wrong wire...");
    return;
  }

  wireButtons.forEach(btn => btn.disabled = true);

  if (color === "green") {
    gameHint.textContent = "Catch the figure";
    gameStatus.textContent = "It won't stop for long...";
    setTimeout(() => {
      showStage("green");
      initGreenStage();
    }, 450);
  }

  if (color === "blue") {
    gameHint.textContent = "Drag the line to tomorrow";
    gameStatus.textContent = "Move the future into place...";
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
  bombShell?.classList.add("explode");
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
    const maxX = areaRect.width - 70;

    runnerX += 5 * runnerDirection;
    if (runnerX >= maxX) {
      runnerDirection = -1;
    }
    if (runnerX <= 0) {
      runnerDirection = 1;
    }

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

/* ---------------- BLUE STAGE ---------------- */
function resetBlueStage() {
  timelineDragging = false;
  timelineDone = false;
  timelineProgress = 0;
  updateTimelineUI();

  if (timelineHandle) {
    timelineHandle.onmousedown = startTimelineDrag;
    timelineHandle.ontouchstart = (e) => startTimelineDrag(e.touches[0]);
  }

  document.onmousemove = moveTimelineDrag;
  document.onmouseup = endTimelineDrag;
  document.ontouchmove = (e) => {
    if (!timelineDragging || !e.touches[0]) return;
    moveTimelineDrag(e.touches[0]);
  };
  document.ontouchend = endTimelineDrag;
}

function initBlueStage() {
  gameStatus.textContent = "Move the line forward...";
}

function startTimelineDrag(e) {
  if (timelineDone) return;
  timelineDragging = true;
  if (e.preventDefault) e.preventDefault();
}

function moveTimelineDrag(e) {
  if (!timelineDragging || timelineDone) return;

  const rect = timelineTrack.getBoundingClientRect();
  let x = e.clientX - rect.left;
  x = Math.max(0, Math.min(rect.width, x));

  timelineProgress = x / rect.width;
  updateTimelineUI();

  if (timelineProgress >= 0.93) {
    timelineDone = true;
    timelineDragging = false;
    timelineProgress = 1;
    updateTimelineUI();
    gameStatus.textContent = "Tomorrow aligned.";
    revealInviteWithSmoke("blue");
  }
}

function endTimelineDrag() {
  timelineDragging = false;
}

function updateTimelineUI() {
  if (timelineFill) {
    timelineFill.style.width = `${timelineProgress * 100}%`;
  }
  if (timelineHandle) {
    timelineHandle.style.left = `${timelineProgress * 100}%`;
  }
}

/* ---------------- YELLOW STAGE ---------------- */
function resetYellowStage() {
  orbDragging = false;
  orbDone = false;

  if (yellowOrb) {
    yellowOrb.style.left = "18px";
    yellowOrb.style.top = "345px";
  }

  yellowOrb.onmousedown = startOrbDrag;
  yellowOrb.ontouchstart = (e) => startOrbDrag(e.touches[0]);

  document.addEventListener("mousemove", moveOrbDrag);
  document.addEventListener("mouseup", endOrbDrag);
  document.addEventListener("touchmove", touchMoveOrbDrag, { passive: false });
  document.addEventListener("touchend", endOrbDrag);
}

function initYellowStage() {
  gameStatus.textContent = "Guide the orb to the end...";
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

  const wrapper = yellowOrb.parentElement.getBoundingClientRect();
  let x = e.clientX - wrapper.left - orbPointerOffsetX;
  let y = e.clientY - wrapper.top - orbPointerOffsetY;

  x = Math.max(4, Math.min(wrapper.width - 32, x));
  y = Math.max(4, Math.min(wrapper.height - 32, y));

  yellowOrb.style.left = `${x}px`;
  yellowOrb.style.top = `${y}px`;

  checkMazeEnd();
}

function touchMoveOrbDrag(e) {
  if (!orbDragging || orbDone || !e.touches[0]) return;
  e.preventDefault();
  moveOrbDrag(e.touches[0]);
}

function endOrbDrag() {
  orbDragging = false;
}

function checkMazeEnd() {
  if (orbDone) return;

  const orbRect = yellowOrb.getBoundingClientRect();
  const endRect = mazeEnd.getBoundingClientRect();

  const overlap = !(
    orbRect.right < endRect.left ||
    orbRect.left > endRect.right ||
    orbRect.bottom < endRect.top ||
    orbRect.top > endRect.bottom
  );

  if (overlap) {
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