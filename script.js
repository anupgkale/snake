const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('scoreDisplay');
const finalScore = document.getElementById('finalScore');
const gameOverOverlay = document.getElementById('gameOverOverlay');
const restartBtn = document.getElementById('restartBtn');
const nameOverlay = document.getElementById('nameOverlay');
const nameInput = document.getElementById('nameInput');
const nameSubmitBtn = document.getElementById('nameSubmitBtn');
const scoreList = document.getElementById('scoreList');

const GRID = 20;
const TILE = canvas.width / GRID;

const LS_KEY = 'ojas_snake_scores';

let snake, direction, buffer, apple, score, gameOver, gameLoopId;
let playerName = '';

// ---- AUDIO (Web Audio API — works on iOS) ----
let audioCtx = null;
let eatBuffer = null;
let collisionBuffer = null;

function initAudio() {
    if (audioCtx) return audioCtx;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    loadSound('sounds/eat.mp3').then(b => eatBuffer = b).catch(() => {});
    loadSound('sounds/boing.wav').then(b => collisionBuffer = b).catch(() => {});
    return audioCtx;
}

function resumeAudio() {
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
}

async function loadSound(url) {
    try {
        const res = await fetch(url);
        const buf = await res.arrayBuffer();
        return await audioCtx.decodeAudioData(buf);
    } catch (e) { return null; }
}

function playBuffer(buffer, volume) {
    if (!audioCtx || !buffer) return;
    resumeAudio();
    const src = audioCtx.createBufferSource();
    const gain = audioCtx.createGain();
    gain.gain.value = volume || 0.5;
    src.buffer = buffer;
    src.connect(gain);
    gain.connect(audioCtx.destination);
    src.start();
}

function playTone(freq, duration, type, volume) {
    try {
        initAudio();
        resumeAudio();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = type || 'square';
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        gain.gain.setValueAtTime(volume || 0.15, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + duration);
    } catch (e) {}
}

function playEatSound() {
    if (eatBuffer) { playBuffer(eatBuffer, 0.4); return; }
    playTone(660, 0.06, 'square', 0.10);
    setTimeout(() => playTone(880, 0.06, 'square', 0.08), 40);
    setTimeout(() => playTone(1100, 0.08, 'square', 0.07), 80);
}

function playCollisionSound() { playBuffer(collisionBuffer, 0.5); }

function playGameOverSound() {
    playTone(400, 0.15, 'square', 0.12);
    setTimeout(() => playTone(300, 0.15, 'square', 0.12), 150);
    setTimeout(() => playTone(200, 0.15, 'square', 0.12), 300);
    setTimeout(() => playTone(100, 0.4, 'sawtooth', 0.15), 450);
}

// ---- LEADERBOARD ----
function getScores() {
    try {
        return JSON.parse(localStorage.getItem(LS_KEY)) || [];
    } catch (e) { return []; }
}

function saveScore(name, score) {
    const scores = getScores();
    scores.push({ name: name.trim(), score });
    scores.sort((a, b) => b.score - a.score);
    if (scores.length > 20) scores.length = 20;
    localStorage.setItem(LS_KEY, JSON.stringify(scores));
}

function renderLeaderboard() {
    const scores = getScores();
    scoreList.innerHTML = '';
    scores.forEach(s => {
        const li = document.createElement('li');
        li.innerHTML = `<span class="entry-name">${escapeHtml(s.name)}</span><span class="entry-score">${s.score}</span>`;
        scoreList.appendChild(li);
    });
}

function escapeHtml(text) {
    const d = document.createElement('div');
    d.textContent = text;
    return d.innerHTML;
}

// ---- NAME PROMPT ----
function showNamePrompt() {
    nameOverlay.classList.remove('hidden');
    nameInput.value = '';
    nameInput.focus();
}

function hideNamePrompt() {
    nameOverlay.classList.add('hidden');
}

nameSubmitBtn.addEventListener('click', () => {
    const name = nameInput.value.trim();
    if (!name) { nameInput.focus(); return; }
    playerName = name;
    hideNamePrompt();
    startGame();
});

nameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') nameSubmitBtn.click();
});

// ---- GAME INIT ----
function initGame() {
    snake = [
        { x: 10, y: 10 },
        { x: 9, y: 10 },
        { x: 8, y: 10 },
        { x: 7, y: 10 },
        { x: 6, y: 10 }
    ];
    direction = { x: 1, y: 0 };
    buffer = [];
    score = 0;
    gameOver = false;
    scoreDisplay.textContent = '0';
    gameOverOverlay.classList.add('hidden');
    spawnApple();
}

function spawnApple() {
    let pos;
    do {
        pos = {
            x: Math.floor(Math.random() * GRID),
            y: Math.floor(Math.random() * GRID)
        };
    } while (snake.some(s => s.x === pos.x && s.y === pos.y));
    apple = pos;
}

// ---- DIRECTION BUFFERING ----
function setDirection(x, y) {
    if (gameOver) return;
    try { initAudio(); resumeAudio(); } catch (e) {}
    const last = buffer.length > 0 ? buffer[buffer.length - 1] : direction;
    if (last.x === x && last.y === y) return;
    if (last.x + x === 0 && last.y + y === 0) return;
    buffer.push({ x, y });
    if (buffer.length > 3) buffer.shift();
}

function consumeDirection() {
    if (buffer.length > 0) {
        direction = buffer.shift();
    }
}

// ---- UPDATE ----
function update() {
    if (gameOver) return;
    consumeDirection();

    const head = {
        x: snake[0].x + direction.x,
        y: snake[0].y + direction.y
    };

    if (head.x < 0 || head.x >= GRID || head.y < 0 || head.y >= GRID) {
        playCollisionSound();
        setTimeout(playGameOverSound, 400);
        gameOver = true;
        finalScore.textContent = score;
        if (playerName && score > 0) saveScore(playerName, score);
        renderLeaderboard();
        setTimeout(() => gameOverOverlay.classList.remove('hidden'), 600);
        return;
    }

    if (snake.some(s => s.x === head.x && s.y === head.y)) {
        playCollisionSound();
        setTimeout(playGameOverSound, 400);
        gameOver = true;
        finalScore.textContent = score;
        if (playerName && score > 0) saveScore(playerName, score);
        renderLeaderboard();
        setTimeout(() => gameOverOverlay.classList.remove('hidden'), 600);
        return;
    }

    snake.unshift(head);

    if (head.x === apple.x && head.y === apple.y) {
        playEatSound();
        score += 10;
        scoreDisplay.textContent = score;
        spawnApple();
    } else {
        snake.pop();
    }
}

// ---- DRAW ----
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGrid();
    drawApple();
    drawSnake();
    if (gameOver) drawGameOverDim();
}

function drawGrid() {
    ctx.strokeStyle = 'rgba(255, 0, 128, 0.05)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= GRID; i++) {
        ctx.beginPath();
        ctx.moveTo(i * TILE, 0);
        ctx.lineTo(i * TILE, canvas.height);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i * TILE);
        ctx.lineTo(canvas.width, i * TILE);
        ctx.stroke();
    }
}

function drawApple() {
    const x = apple.x * TILE;
    const y = apple.y * TILE;
    const cx = x + TILE / 2;
    const cy = y + TILE / 2;

    const grad = ctx.createRadialGradient(cx - 2, cy - 2, 1, cx, cy, TILE / 1.5);
    grad.addColorStop(0, '#ff4444');
    grad.addColorStop(0.6, '#ff0000');
    grad.addColorStop(1, '#aa0000');
    ctx.fillStyle = grad;
    ctx.shadowColor = '#ff0000';
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(cx, cy, TILE / 2 - 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#39ff14';
    ctx.shadowColor = '#39ff14';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(cx - 2, cy - TILE / 2 + 2, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
}

function drawSnake() {
    const len = snake.length;
    for (let i = len - 1; i >= 0; i--) {
        const s = snake[i];
        const x = s.x * TILE;
        const y = s.y * TILE;
        const t = i / Math.max(len - 1, 1);
        const r = Math.round(0 + t * 255);
        const g = Math.round(255 - t * 200);
        const b = Math.round(128 + t * 127);
        const color = `rgb(${r}, ${g}, ${b})`;
        ctx.shadowColor = color;
        ctx.shadowBlur = i === 0 ? 20 : 8;
        ctx.fillStyle = color;
        const pad = i === 0 ? 1 : 2;
        const radius = i === 0 ? 5 : 4;
        ctx.beginPath();
        ctx.roundRect(x + pad, y + pad, TILE - pad * 2, TILE - pad * 2, radius);
        ctx.fill();
        ctx.shadowBlur = 0;
        if (i === 0) drawEyes(x, y);
    }
}

function drawEyes(x, y) {
    const dir = direction;
    const cx = x + TILE / 2;
    const cy = y + TILE / 2;
    let ex1, ey1, ex2, ey2;

    if (dir.x === 1) {
        ex1 = cx + 3; ey1 = cy - 4;
        ex2 = cx + 3; ey2 = cy + 4;
    } else if (dir.x === -1) {
        ex1 = cx - 3; ey1 = cy - 4;
        ex2 = cx - 3; ey2 = cy + 4;
    } else if (dir.y === -1) {
        ex1 = cx - 4; ey1 = cy - 3;
        ex2 = cx + 4; ey2 = cy - 3;
    } else {
        ex1 = cx - 4; ey1 = cy + 3;
        ex2 = cx + 4; ey2 = cy + 3;
    }

    ctx.fillStyle = '#fff';
    ctx.shadowColor = '#fff';
    ctx.shadowBlur = 4;
    ctx.beginPath();
    ctx.arc(ex1, ey1, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(ex2, ey2, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(ex1, ey1, 1.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(ex2, ey2, 1.2, 0, Math.PI * 2);
    ctx.fill();
}

function drawGameOverDim() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

// ---- GAME LOOP ----
function gameLoop() {
    update();
    draw();
    if (!gameOver) {
        const speed = Math.max(60, 150 - Math.floor(score / 50) * 5);
        gameLoopId = setTimeout(gameLoop, speed);
    } else {
        draw();
    }
}

function startGame() {
    if (gameLoopId) clearTimeout(gameLoopId);
    initGame();
    gameLoop();
}

// ---- INPUT ----
document.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
    }
    switch (e.key) {
        case 'ArrowUp': setDirection(0, -1); break;
        case 'ArrowDown': setDirection(0, 1); break;
        case 'ArrowLeft': setDirection(-1, 0); break;
        case 'ArrowRight': setDirection(1, 0); break;
    }
});

// ---- SWIPE + TOUCH SUPPORT ----
let touchStartX = 0, touchStartY = 0;

canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const t = e.touches[0];
    touchStartX = t.clientX;
    touchStartY = t.clientY;
}, { passive: false });

canvas.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });

canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStartX;
    const dy = t.clientY - touchStartY;
    if (Math.abs(dx) < 15 && Math.abs(dy) < 15) return;
    if (Math.abs(dx) > Math.abs(dy)) {
        setDirection(dx > 0 ? 1 : -1, 0);
    } else {
        setDirection(0, dy > 0 ? 1 : -1);
    }
}, { passive: false });

// ---- RESTART ----
restartBtn.addEventListener('click', () => {
    gameOverOverlay.classList.add('hidden');
    startGame();
});
restartBtn.addEventListener('touchend', (e) => { e.preventDefault(); restartBtn.click(); });

// ---- POLYFILL roundRect ----
if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
        if (r > w / 2) r = w / 2;
        if (r > h / 2) r = h / 2;
        this.moveTo(x + r, y);
        this.lineTo(x + w - r, y);
        this.quadraticCurveTo(x + w, y, x + w, y + r);
        this.lineTo(x + w, y + h - r);
        this.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        this.lineTo(x + r, y + h);
        this.quadraticCurveTo(x, y + h, x, y + h - r);
        this.lineTo(x, y + r);
        this.quadraticCurveTo(x, y, x + r, y);
    };
}

// ---- START ----
showNamePrompt();
renderLeaderboard();
