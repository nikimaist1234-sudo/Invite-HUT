const startBtn = document.getElementById("startBtn");
const music = document.getElementById("bgMusic");

const gameHint = document.getElementById("gameHint");
const gameStatus = document.getElementById("gameStatus");

const bombStage = document.getElementById("bombStage");
const greenStage = document.getElementById("greenStage");
const blueStage = document.getElementById("blueStage");

const bombTimer = document.getElementById("bombTimer");
const bombDevice = document.getElementById("bombDevice");
const explosionFlash = document.getElementById("explosionFlash");
const wireLines = document.querySelectorAll(".wire-line");

const greenRunner = document.getElementById("greenRunner");
const runnerArea = document.getElementById("runnerArea");

const digitalClockPanel = document.getElementById("digitalClockPanel");
const digitalClockReadout = document.getElementById("digitalClockReadout");

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

function setGameText(hint, status) {
  if (gameHint) gameHint.textContent = hint;
  if (gameStatus) gameStatus.textContent = status;
}

function initGame() {
  missionLocked = false;
  stopBombCountdown();
  cancelRunnerAnimation();

  if (colorSmokeOverlay) {
    colorSmokeOverlay.className = "color-smoke-overlay";
  }

  resetBombStage();
  resetGreenStage();
  resetBlueStage();

  showStage("bomb");
  setGameText("Choose carefully...", "A ticking choice waits for you...");
}

function showStage(stageName) {
  [bombStage, greenStage, blueStage].forEach((stage) => {
    if (stage) stage.classList.remove("active");
  });

  if (stageName === "bomb" && bombStage) bombStage.classList.add("active");
  if (stageName === "green" && greenStage) greenStage.classList.add("active");
  if (stageName === "blue" && blueStage) blueStage.classList.add("active");
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

      if (Math.abs(dy) > 55 && Math.abs(dy) > Math.abs(dx) * 1.2) {
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
    wire.ontouchcancel = endSlice;
  });
}

function cutWire(color, wireEl) {
  if (missionLocked) return;

  stopBombCountdown();

  wireEl.classList.add("cut");
  wireLines.forEach((w) => (w.style.pointerEvents = "none"));

  if (color === "red" || color === "yellow") {
    explodeBombAndRetry("Wrong wire...");
    return;
  }

  if (color === "green") {
    setGameText("Catch the figure", "It won't stop for long...");
    setTimeout(() => {
      showStage("green");
      initGreenStage();
    }, 450);
  }

  if (color === "blue") {
    setGameText("Swipe the clock into tomorrow", "Push time forward...");
    setTimeout(() => {
      showStage("blue");
      initBlueStage();
    }, 450);
  }
}

function explodeBombAndRetry(message) {
  missionLocked = true;
  bombDevice?.classList.add("explode");
  explosionFlash?.classList.add("active");
  setGameText("Try again", message);

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
    greenRunner.onclick = catchGreenRunner;
    greenRunner.ontouchstart = catchGreenRunner;
  }
}

function initGreenStage() {
  cancelRunnerAnimation();

  let phase = 0;

  function animateRunner() {
    if (runnerCaught || !greenRunner || !runnerArea) return;

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
  e?.preventDefault();

  runnerCaught = true;
  cancelRunnerAnimation();
  greenRunner?.classList.add("caught");
  setGameText("Caught.", "Nice one.");
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
      setGameText("Tomorrow reached.", "You made it.");
      digitalClockPanel?.classList.add("done");
      revealInviteWithSmoke("blue");
    }
  };

  const end = () => {
    active = false;
  };

  if (!digitalClockPanel) return;

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
  digitalClockPanel.ontouchcancel = end;
}

function initBlueStage() {
  setGameText("Swipe the clock into tomorrow", "Swipe upward to push time forward...");
}

function updateClockReadout() {
  if (!digitalClockReadout) return;

  const normalized = clockMinutes % (24 * 60);
  const hours = Math.floor(normalized / 60);
  const mins = normalized % 60;

  const hh = String(hours).padStart(2, "0");
  const mm = String(mins).padStart(2, "0");

  digitalClockReadout.textContent = `${hh}:${mm}`;
}

/* ---------------- REVEAL ---------------- */
function revealInviteWithSmoke(color) {
  missionLocked = true;
  stopBombCountdown();
  cancelRunnerAnimation();

  if (colorSmokeOverlay) {
    colorSmokeOverlay.className = `color-smoke-overlay active ${color}`;
  }

  setTimeout(() => {
    colorSmokeOverlay?.classList.add("swipe-up");
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
