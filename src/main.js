import './style.css';

const SIZE = 4;
const boardEl = document.querySelector('#board');
const scoreEl = document.querySelector('#score');
const bestEl = document.querySelector('#best');
const overlay = document.querySelector('#overlay');
const announcement = document.querySelector('#announcement');
let grid, score, previous, won, ended, soundOn = false;
let best = 0;
try { best = Number(localStorage.getItem('numberplay-best')) || 0; } catch (_) { /* storage is optional */ }

function blank() { return Array.from({ length: SIZE }, () => Array(SIZE).fill(0)); }
function copyGrid(value) { return value.map(row => [...row]); }
function spawn() {
  const empty = [];
  grid.forEach((row, r) => row.forEach((value, c) => { if (!value) empty.push([r, c]); }));
  if (!empty.length) return null;
  const [r, c] = empty[Math.floor(Math.random() * empty.length)];
  grid[r][c] = Math.random() < 0.9 ? 2 : 4;
  return `${r}-${c}`;
}
function render(spawned = null, merged = []) {
  boardEl.replaceChildren();
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
    const value = grid[r][c];
    const cell = document.createElement('div');
    cell.className = 'cell';
    cell.setAttribute('role', 'gridcell');
    cell.setAttribute('aria-label', value ? String(value) : 'خالی');
    if (value) {
      const tile = document.createElement('div');
      tile.className = `tile tile-${Math.min(value, 2048)}${value > 2048 ? ' tile-super' : ''}${spawned === `${r}-${c}` ? ' tile-new' : ''}${merged.includes(`${r}-${c}`) ? ' tile-merged' : ''}`;
      tile.textContent = value;
      cell.append(tile);
    }
    boardEl.append(cell);
  }
  scoreEl.textContent = score.toLocaleString('en-US');
  bestEl.textContent = best.toLocaleString('en-US');
  document.querySelector('#undo').disabled = !previous;
}
function newGame() {
  grid = blank(); score = 0; previous = null; won = false; ended = false;
  overlay.classList.add('hidden');
  spawn(); const last = spawn(); render(last);
  announcement.textContent = 'بازی جدید شروع شد';
}
function hasMoves() {
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
    if (!grid[r][c] || (r < SIZE - 1 && grid[r][c] === grid[r + 1][c]) || (c < SIZE - 1 && grid[r][c] === grid[r][c + 1])) return true;
  }
  return false;
}
function showOverlay(isWin) {
  overlay.classList.remove('hidden');
  document.querySelector('#overlay-title').textContent = isWin ? 'فوق‌العاده بود!' : 'بازی تموم شد!';
  document.querySelector('#overlay-message').textContent = isWin ? 'تو به 2048 رسیدی! آماده‌ای رکوردت رو بیشتر کنی؟' : 'دیگه حرکتی باقی نمونده. آماده‌ای دوباره امتحان کنی؟';
  document.querySelector('#continue').classList.toggle('hidden', !isWin);
  announcement.textContent = isWin ? 'آفرین! به 2048 رسیدی.' : 'بازی تمام شد';
}
function playSound(merge) {
  if (!soundOn) return;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = ctx.createOscillator(), gain = ctx.createGain();
    oscillator.type = 'sine'; oscillator.frequency.setValueAtTime(merge ? 510 : 360, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(merge ? 760 : 450, ctx.currentTime + .1);
    gain.gain.setValueAtTime(.045, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + .13);
    oscillator.connect(gain); gain.connect(ctx.destination); oscillator.start(); oscillator.stop(ctx.currentTime + .14);
    oscillator.onended = () => ctx.close();
  } catch (_) { /* audio is optional */ }
}
function move(direction) {
  if (ended || !overlay.classList.contains('hidden')) return;
  const before = copyGrid(grid), oldScore = score;
  let gain = 0, merged = [];
  for (let i = 0; i < SIZE; i++) {
    const coords = Array.from({ length: SIZE }, (_, j) => {
      if (direction === 'left') return [i, j];
      if (direction === 'right') return [i, SIZE - 1 - j];
      if (direction === 'up') return [j, i];
      return [SIZE - 1 - j, i];
    });
    const values = coords.map(([r, c]) => grid[r][c]).filter(Boolean);
    const result = [];
    for (let j = 0; j < values.length; j++) {
      if (values[j] === values[j + 1]) {
        const value = values[j] * 2; gain += value;
        const [r, c] = coords[result.length]; merged.push(`${r}-${c}`);
        result.push(value); j++;
      } else result.push(values[j]);
    }
    coords.forEach(([r, c], j) => { grid[r][c] = result[j] || 0; });
  }
  if (JSON.stringify(grid) === JSON.stringify(before)) return;
  previous = { grid: before, score: oldScore, won };
  score += gain;
  if (score > best) { best = score; try { localStorage.setItem('numberplay-best', String(best)); } catch (_) {} }
  const spawned = spawn(); render(spawned, merged); playSound(gain > 0);
  if (!won && grid.some(row => row.some(value => value >= 2048))) { won = true; showOverlay(true); }
  else if (!hasMoves()) { ended = true; showOverlay(false); }
}
document.querySelector('#restart').addEventListener('click', newGame);
document.querySelector('#overlay-restart').addEventListener('click', newGame);
document.querySelector('#continue').addEventListener('click', () => { overlay.classList.add('hidden'); if (!hasMoves()) { ended = true; showOverlay(false); } });
document.querySelector('#undo').addEventListener('click', () => {
  if (!previous) return;
  grid = previous.grid; score = previous.score; won = previous.won; previous = null; ended = false;
  overlay.classList.add('hidden'); render(); announcement.textContent = 'آخرین حرکت برگشت';
});
document.querySelector('#sound').addEventListener('click', () => {
  soundOn = !soundOn; document.querySelector('#sound-label').textContent = soundOn ? 'صدا روشن' : 'صدا خاموش';
  document.querySelector('#sound').setAttribute('aria-label', soundOn ? 'خاموش کردن صدا' : 'روشن کردن صدا');
  if (soundOn) playSound(false);
});
const keys = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' };
window.addEventListener('keydown', event => { if (keys[event.key]) { event.preventDefault(); move(keys[event.key]); } });
document.querySelectorAll('[data-direction]').forEach(button => button.addEventListener('click', () => move(button.dataset.direction)));
let touchStart = null;
const swipeArea = document.querySelector('#swipe-area');
swipeArea.addEventListener('touchstart', event => { const t = event.changedTouches[0]; touchStart = [t.clientX, t.clientY]; }, { passive: true });
swipeArea.addEventListener('touchend', event => {
  if (!touchStart) return;
  const t = event.changedTouches[0], dx = t.clientX - touchStart[0], dy = t.clientY - touchStart[1]; touchStart = null;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 25) return;
  move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
}, { passive: true });
newGame();
