import { SnakeGame } from './game.js';

const game = new SnakeGame();
const board = document.querySelector('#game-board');
const context = board.getContext('2d');
const overlay = document.querySelector('#game-overlay');
const playButton = document.querySelector('#play-button');
const pauseButton = document.querySelector('#pause-button');
const scoreElement = document.querySelector('#score');
const bestElement = document.querySelector('#best-score');
const storageKey = 'one-more-bite:best-score';
const speeds = { slow: 200, normal: 140, fast: 85 };
const descriptions = { slow: '放慢一点，享受每一口。', normal: '不快不慢，快乐刚刚好。', fast: '眼疾手快，挑战你的反应。' };
const directions = {
  ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
  w: 'up', s: 'down', a: 'left', d: 'right',
};
const eyes = {
  up: [[.32, .3], [.68, .3]], down: [[.32, .7], [.68, .7]],
  left: [[.3, .32], [.3, .68]], right: [[.7, .32], [.7, .68]],
};
let speed = 'normal';
let timer;
let best = 0;
let newRecord = false;
let touchStart = null;

try {
  const stored = Number(localStorage.getItem(storageKey));
  best = Number.isSafeInteger(stored) && stored > 0 ? stored : 0;
} catch { /* The game also works when browser storage is unavailable. */ }

const formatScore = (score) => String(score).padStart(3, '0');
const announce = (message) => { document.querySelector('#announcement').textContent = message; };

function saveBest() {
  if (game.score <= best) return;
  best = game.score;
  newRecord = true;
  try { localStorage.setItem(storageKey, String(best)); } catch { /* Keep the current session's score. */ }
}

function roundedRect(x, y, width, height, radius, color) {
  context.fillStyle = color;
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
  context.fill();
}

function renderBoard() {
  const width = board.width;
  const cell = width / game.size;
  context.clearRect(0, 0, width, width);
  context.fillStyle = '#eef2e6';
  context.fillRect(0, 0, width, width);
  context.strokeStyle = '#e1e8d6';
  context.lineWidth = Math.max(1, width / 1000);
  context.beginPath();
  for (let index = 1; index < game.size; index++) {
    const position = index * cell;
    context.moveTo(position, 0);
    context.lineTo(position, width);
    context.moveTo(0, position);
    context.lineTo(width, position);
  }
  context.stroke();
  if (game.food) {
    const x = (game.food.x + .5) * cell;
    const y = (game.food.y + .54) * cell;
    context.fillStyle = '#e3a07a';
    context.beginPath();
    context.arc(x, y, cell * .31, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#f2c2a6';
    context.beginPath();
    context.arc(x - cell * .09, y - cell * .09, cell * .07, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#7e995e';
    context.beginPath();
    context.ellipse(x + cell * .1, y - cell * .34, cell * .14, cell * .07, -.6, 0, Math.PI * 2);
    context.fill();
  }
  game.snake.forEach((segment, index) => {
    const inset = cell * .065;
    const x = segment.x * cell;
    const y = segment.y * cell;
    const tint = Math.min(index / Math.max(game.snake.length - 1, 1), 1);
    const color = index === 0 ? '#4d733d' : `hsl(91 28% ${53 + tint * 10}%)`;
    roundedRect(x + inset, y + inset, cell - inset * 2, cell - inset * 2, cell * .24, color);
    if (index === 0) {
      for (const [eyeX, eyeY] of eyes[game.direction]) {
        context.fillStyle = '#f8f9ed';
        context.beginPath();
        context.arc(x + cell * eyeX, y + cell * eyeY, cell * .073, 0, Math.PI * 2);
        context.fill();
      }
    }
  });
}

function updateInterface() {
  scoreElement.textContent = formatScore(game.score);
  bestElement.textContent = formatScore(best);
  document.querySelector('#snake-length').textContent = game.snake.length;
  document.querySelector('#score-caption').textContent = newRecord ? '新纪录！今天的你，又长大了一点。' : '每一个新纪录，都从第一口开始。';
  const labels = { ready: '准备就绪', running: '快乐生长中', paused: '休息一下', over: '本局结束', won: '完美通关' };
  document.querySelector('#status-text').textContent = labels[game.status];
  document.querySelector('#status-pill').dataset.state = game.status;
  pauseButton.disabled = !['running', 'paused'].includes(game.status);
  const paused = game.status === 'paused';
  document.querySelector('#pause-label').textContent = paused ? '继续' : '暂停';
  pauseButton.setAttribute('aria-label', paused ? '继续游戏' : '暂停游戏');
  document.querySelectorAll('[data-speed]').forEach((button) => {
    button.disabled = game.status === 'running';
    button.classList.toggle('selected', button.dataset.speed === speed);
    button.setAttribute('aria-pressed', String(button.dataset.speed === speed));
  });
  document.querySelector('#speed-description').textContent = game.status === 'running' ? '想换个节奏？暂停后就能调整。' : descriptions[speed];
  overlay.hidden = game.status === 'running';
  if (overlay.hidden) return;
  const messages = {
    ready: ['A FRESH LITTLE START', '准备好开吃了吗？', '不着急，一口一口来。', '开始游戏', '或按空格键开始'],
    paused: ['TAKE YOUR TIME', '休息一下，也很好。', '你的小蛇会在这里等你。', '继续游戏', '或按空格键继续'],
    over: ['ONE MORE LITTLE TRY', newRecord ? '新的纪录，新的快乐！' : '差一点，再来一口？', `这一局收获了 ${game.score} 分，长到了 ${game.snake.length} 格。`, '再玩一次', '或按空格键 / R 重新开始'],
    won: ['YOU ATE IT ALL!', '整个花园，都属于你！', `恭喜填满棋盘，收获 ${game.score} 分。`, '再玩一次', '或按空格键 / R 重新开始'],
  };
  ['overlay-kicker', 'overlay-title', 'overlay-description', 'play-label', 'overlay-hint'].forEach((id, index) => {
    document.getElementById(id).textContent = messages[game.status][index];
  });
}

function stopTimer() {
  window.clearInterval(timer);
  timer = undefined;
}

function startTimer() {
  stopTimer();
  timer = window.setInterval(() => {
    game.tick();
    saveBest();
    renderBoard();
    updateInterface();
    if (game.status !== 'running') {
      stopTimer();
      announce(`${game.status === 'won' ? '恭喜通关' : '游戏结束'}。本局 ${game.score} 分。`);
      playButton.focus({ preventScroll: true });
    }
  }, speeds[speed]);
}

function begin(restart = false) {
  stopTimer();
  if (restart || ['over', 'won'].includes(game.status)) {
    game.reset();
    newRecord = false;
  }
  if (game.status === 'paused') game.resume();
  else game.start();
  updateInterface();
  renderBoard();
  if (game.status === 'running') {
    startTimer();
    announce('游戏开始。方向键或 W A S D 移动，空格暂停。');
    board.focus({ preventScroll: true });
  }
}

function pause() {
  if (game.status !== 'running') return;
  game.pause();
  stopTimer();
  updateInterface();
  announce('游戏已暂停。按空格继续。');
}

function togglePause() {
  if (game.status === 'running') pause();
  else begin();
}

function steer(direction) {
  if (game.status === 'ready') begin();
  if (game.status === 'running') game.setDirection(direction);
}

playButton.addEventListener('click', () => begin());
pauseButton.addEventListener('click', togglePause);
document.querySelector('#restart-button').addEventListener('click', () => begin(true));
document.querySelectorAll('[data-speed]').forEach((button) => {
  button.addEventListener('click', () => {
    if (game.status === 'running') return;
    speed = button.dataset.speed;
    updateInterface();
  });
});
document.querySelectorAll('[data-direction]').forEach((button) => {
  button.addEventListener('click', () => steer(button.dataset.direction));
});
document.addEventListener('keydown', (event) => {
  if (event.altKey || event.ctrlKey || event.metaKey || event.target.closest('input, textarea, select, [contenteditable="true"]')) return;
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  if (directions[key]) {
    event.preventDefault();
    steer(directions[key]);
  } else if (event.code === 'Space' || key === ' ') {
    // Preserve the native keyboard activation of focused buttons and links.
    if (event.target.closest('button, a')) return;
    event.preventDefault();
    if (!event.repeat) togglePause();
  } else if (key === 'r' && !event.repeat) {
    event.preventDefault();
    begin(true);
  }
});
board.addEventListener('pointerdown', (event) => {
  if (!event.isPrimary) return;
  touchStart = { x: event.clientX, y: event.clientY, id: event.pointerId };
  board.setPointerCapture(event.pointerId);
});
board.addEventListener('pointermove', (event) => {
  if (!touchStart || event.pointerId !== touchStart.id) return;
  const dx = event.clientX - touchStart.x;
  const dy = event.clientY - touchStart.y;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) return;
  steer(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
  touchStart = { x: event.clientX, y: event.clientY, id: event.pointerId };
});
for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) {
  board.addEventListener(name, () => { touchStart = null; });
}
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
window.addEventListener('blur', pause);

function resizeBoard() {
  const width = Math.max(1, Math.round(board.getBoundingClientRect().width * Math.min(window.devicePixelRatio || 1, 2)));
  if (board.width !== width) {
    board.width = width;
    board.height = width;
  }
  renderBoard();
}
new ResizeObserver(resizeBoard).observe(board);
updateInterface();
resizeBoard();
