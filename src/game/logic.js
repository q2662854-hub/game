// ─────────────────────────────────────────────────────────────
//  منطق خالص بازی 2048 — بدون وابستگی به رندر
//  هر حرکت یک «شبیه‌سازی» برمی‌گرداند: اسلایدها، ادغام‌ها، بلوک تازه
// ─────────────────────────────────────────────────────────────
import { DIR_VECTORS } from './tiles.js';

export const SIZE = 4;

let uidCounter = 1;
const nextUid = () => uidCounter++;

export function createTile(value, row, col) {
  return { uid: nextUid(), value, row, col };
}

const LINES = {
  left: (i) => Array.from({ length: SIZE }, (_, j) => [i, j]),
  right: (i) => Array.from({ length: SIZE }, (_, j) => [i, SIZE - 1 - j]),
  up: (i) => Array.from({ length: SIZE }, (_, j) => [j, i]),
  down: (i) => Array.from({ length: SIZE }, (_, j) => [SIZE - 1 - j, i]),
};

export class Game2048 {
  constructor(handlers = {}) {
    this.handlers = handlers;
    this.best = loadNumber('neon2048.best', 0);
    this.reset({ silent: true });
  }

  reset({ silent = false } = {}) {
    this.grid = Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
    this.score = 0;
    this.moves = 0;
    this.won = false;
    this.over = false;
    this.winShown = false;
    this.history = [];
    this.maxTile = 0;
    const spawns = [this.spawnRandom(), this.spawnRandom()].filter(Boolean);
    if (!silent) this.handlers.onScore?.(this.score, this.best, { gained: 0 });
    return spawns;
  }

  cloneGrid() {
    return this.grid.map((row) => row.map((t) => (t ? { ...t } : null)));
  }

  restoreGrid(grid) {
    this.grid = grid.map((row) => row.map((t) => (t ? { ...t } : null)));
  }

  emptyCells() {
    const out = [];
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) if (!this.grid[r][c]) out.push([r, c]);
    }
    return out;
  }

  spawnRandom() {
    const cells = this.emptyCells();
    if (!cells.length) return null;
    const [row, col] = cells[Math.floor(Math.random() * cells.length)];
    const value = Math.random() < 0.9 ? 2 : 4;
    const tile = createTile(value, row, col);
    this.grid[row][col] = tile;
    this.maxTile = Math.max(this.maxTile, value);
    return tile;
  }

  canMove() {
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const t = this.grid[r][c];
        if (!t) return true;
        if (c + 1 < SIZE && this.grid[r][c + 1]?.value === t.value) return true;
        if (r + 1 < SIZE && this.grid[r + 1][c]?.value === t.value) return true;
      }
    }
    return false;
  }

  // ── حرکت ──────────────────────────────────────────────────
  move(dir) {
    if (this.over) return { moved: false };

    const spec = DIR_VECTORS[dir];
    if (!spec) return { moved: false };

    const snapshot = {
      grid: this.cloneGrid(),
      score: this.score,
      moves: this.moves,
      won: this.won,
      winShown: this.winShown,
      maxTile: this.maxTile,
    };

    const nextGrid = Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
    const slides = [];
    const merges = [];
    let gained = 0;

    for (let i = 0; i < SIZE; i++) {
      const line = LINES[dir](i);
      const tiles = line.map(([r, c]) => this.grid[r][c]).filter(Boolean);

      let out = 0;
      let k = 0;
      while (k < tiles.length) {
        const tile = tiles[k];
        const next = tiles[k + 1];
        const [tr, tc] = line[out];

        if (next && next.value === tile.value) {
          // ادغام: tile به سمت next می‌رود و ناپدید می‌شود، survivor = next
          const survivorValue = tile.value * 2;
          const survivor = { uid: next.uid, value: survivorValue, row: tr, col: tc };
          nextGrid[tr][tc] = survivor;
          slides.push({
            uid: tile.uid,
            fromRow: tile.row,
            fromCol: tile.col,
            toRow: tr,
            toCol: tc,
            removed: true,
          });
          if (next.row !== tr || next.col !== tc) {
            slides.push({
              uid: next.uid,
              fromRow: next.row,
              fromCol: next.col,
              toRow: tr,
              toCol: tc,
            });
          }
          merges.push({
            value: survivorValue,
            row: tr,
            col: tc,
            survivorUid: next.uid,
            removedUid: tile.uid,
          });
          gained += survivorValue;
          this.maxTile = Math.max(this.maxTile, survivorValue);
          if (survivorValue >= 2048) this.won = true;
          k += 2;
        } else {
          const survivor = { uid: tile.uid, value: tile.value, row: tr, col: tc };
          nextGrid[tr][tc] = survivor;
          if (tile.row !== tr || tile.col !== tc) {
            slides.push({
              uid: tile.uid,
              fromRow: tile.row,
              fromCol: tile.col,
              toRow: tr,
              toCol: tc,
            });
          }
          k += 1;
        }
        out += 1;
      }
    }

    if (!slides.length) {
      // حتی بدون جابه‌جایی، اگر صفحه قفل باشد بازی تمام است
      if (!this.canMove()) {
        this.over = true;
        this.handlers.onScore?.(this.score, this.best, { gained: 0 });
        return { moved: false, gameOver: true };
      }
      return { moved: false };
    }

    this.grid = nextGrid;
    this.history.push(snapshot);
    if (this.history.length > 25) this.history.shift();

    this.moves += 1;
    this.score += gained;
    if (this.score > this.best) {
      this.best = this.score;
      saveNumber('neon2048.best', this.best);
    }

    const spawned = this.spawnRandom();

    const result = {
      moved: true,
      dir,
      slides,
      merges,
      spawned,
      gained,
      score: this.score,
      best: this.best,
    };

    if (this.won && !this.winShown) {
      this.winShown = true;
      this.handlers.onWin?.(this.score);
    } else if (!this.canMove()) {
      this.over = true;
      result.gameOver = true;
    }

    this.handlers.onScore?.(this.score, this.best, { gained });
    return result;
  }

  undo() {
    const snapshot = this.history.pop();
    if (!snapshot) return null;
    this.restoreGrid(snapshot.grid);
    this.score = snapshot.score;
    this.moves = snapshot.moves;
    this.won = snapshot.won;
    this.winShown = snapshot.winShown;
    this.maxTile = snapshot.maxTile;
    this.over = false;
    this.handlers.onScore?.(this.score, this.best, { gained: 0 });
    return { grid: this.cloneGrid(), score: this.score };
  }

  cells() {
    const out = [];
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) if (this.grid[r][c]) out.push(this.grid[r][c]);
    }
    return out;
  }

  maxOnBoard() {
    return this.cells().reduce((m, t) => Math.max(m, t.value), 0);
  }
}

function loadNumber(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    const n = Number(raw);
    return Number.isFinite(n) ? n : fallback;
  } catch {
    return fallback;
  }
}

function saveNumber(key, value) {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    /* ignore */
  }
}
