// ─────────────────────────────────────────────────────────────
//  NEON 2048 — کنترلر بازی
// ─────────────────────────────────────────────────────────────
import '@fontsource-variable/space-grotesk';
import '@fontsource/vazirmatn/400.css';
import '@fontsource/vazirmatn/700.css';
import './style.css';

import { GameScene } from './game/scene.js';
import { Game2048 } from './game/logic.js';
import { audio } from './game/audio.js';

const $ = (sel) => document.querySelector(sel);

const els = {
  canvas: $('#scene'),
  hud: $('#hud'),
  score: $('#score-value'),
  scoreCard: $('#score-card'),
  best: $('#best-value'),
  startBest: $('#start-best'),
  start: $('#screen-start'),
  over: $('#screen-over'),
  win: $('#screen-win'),
  overScore: $('#over-score'),
  overTile: $('#over-tile'),
  overMoves: $('#over-moves'),
  overRecord: $('#over-record'),
  milestone: $('#milestone'),
  milestoneTitle: $('#milestone-title'),
  milestoneSub: $('#milestone-sub'),
  loader: $('#loader'),
  dpad: $('#dpad'),
  btnUndo: $('#btn-undo'),
  btnRestart: $('#btn-restart'),
  btnSound: $('#btn-sound'),
  btnView: $('#btn-view'),
  btnPlay: $('#btn-play'),
  btnAgain: $('#btn-again'),
  btnUndoOver: $('#btn-undo-over'),
  btnKeep: $('#btn-keep'),
  btnRestartWin: $('#btn-restart-win'),
  hintBar: $('#hint-bar'),
};

const MILESTONES = {
  128: 'بلوک یاقوتی',
  256: 'بلوک نیلگون',
  512: 'بلوک اقیانوسی',
  1024: 'بلوک کوانتومی',
  2048: 'بلوک افسانه‌ای',
  4096: 'بلوک فراتر از نور',
  8192: 'بلوک کهکشانی',
};

class App {
  constructor() {
    this.scene = new GameScene(els.canvas);
    this.game = new Game2048({
      onScore: (score, best) => this.onScore(score, best),
      onWin: () => this.onWin(),
    });

    this.state = 'start'; // start | playing | modal | over
    this.displayScore = 0;
    this.targetScore = 0;
    this.scoreRaf = null;
    this.lastMove = 0;
    this.moveCooldown = 105;
    this.moveLockUntil = 0;
    this.queue = [];
    this.reached = new Set();
    this.inputEnabled = false;

    this.scene.sync(this.game, { pop: true });
    this.scene.showDemoBoard();
    els.best.textContent = fmt(this.game.best);
    els.startBest.textContent = fmt(this.game.best);

    this.bindEvents();
    this.loop();
    this.boot();
  }

  boot() {
    // اولین رندر بلافاصله، سپس محو شدن لودر
    this.scene.render?.();
    requestAnimationFrame(() => {
      this.scene.update(0.016, 0);
      setTimeout(() => {
        els.loader.classList.add('done');
        els.hintBar.classList.add('visible');
        if (window.matchMedia('(max-width: 760px)').matches) {
          setTimeout(() => els.hintBar.classList.remove('visible'), 9000);
        }
        this.reached.clear();
        this.game.cells().forEach((t) => this.reached.add(t.value));
      }, 420);
    });
    // دکمه‌ی پد لمسی فقط در دستگاه‌های لمسی
    if (window.matchMedia('(pointer: coarse)').matches) {
      els.dpad.classList.add('show');
    }
  }

  // ── ورودی ────────────────────────────────────────────────
  bindEvents() {
    const keyMap = {
      ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down',
      a: 'left', d: 'right', w: 'up', s: 'down',
      A: 'left', D: 'right', W: 'up', S: 'down',
      h: 'left', l: 'right', k: 'up', j: 'down',
    };

    window.addEventListener('keydown', (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const dir = keyMap[e.key];
      if (dir) {
        e.preventDefault();
        this.tryMove(dir);
        return;
      }
      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        this.restart();
      } else if (e.key === 'u' || e.key === 'U' || e.key === 'Backspace') {
        e.preventDefault();
        this.undo();
      } else if (e.key === 'm' || e.key === 'M') {
        this.toggleSound();
      } else if (e.key === 'v' || e.key === 'V') {
        this.toggleView();
      } else if (e.code === 'Space' || e.key === 'Enter') {
        e.preventDefault();
        if (this.state === 'start') this.startGame();
        else if (this.state === 'over') this.restart();
        else if (this.state === 'winmodal') this.continueGame();
      }
    });

    // سوایپ
    let touchStart = null;
    let touchMoved = false;
    const area = $('#app');
    area.addEventListener('touchstart', (e) => {
      if (e.target.closest('button, .screen')) return;
      const t = e.touches[0];
      touchStart = { x: t.clientX, y: t.clientY, time: performance.now() };
      touchMoved = false;
    }, { passive: true });

    area.addEventListener('touchmove', (e) => {
      if (!touchStart || touchMoved) return;
      const t = e.touches[0];
      const dx = t.clientX - touchStart.x;
      const dy = t.clientY - touchStart.y;
      if (Math.hypot(dx, dy) < 24) return;
      touchMoved = true;
      if (Math.abs(dx) > Math.abs(dy)) this.tryMove(dx > 0 ? 'right' : 'left');
      else this.tryMove(dy > 0 ? 'down' : 'up');
      touchStart = null;
    }, { passive: true });

    area.addEventListener('touchend', () => {
      if (!touchStart || touchMoved) return;
      const dt = performance.now() - touchStart.time;
      if (dt < 260) this.quickTap();
      touchStart = null;
    }, { passive: true });

    // پد لمسی
    els.dpad.querySelectorAll('button[data-dir]').forEach((b) => {
      b.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        this.tryMove(b.dataset.dir);
      });
    });

    // دکمه‌ها
    els.btnPlay.addEventListener('click', () => this.startGame());
    els.btnAgain.addEventListener('click', () => this.restart());
    els.btnRestart.addEventListener('click', () => this.restart());
    els.btnRestartWin.addEventListener('click', () => this.restart());
    els.btnUndo.addEventListener('click', () => this.undo());
    els.btnUndoOver.addEventListener('click', () => this.undoFromOver());
    els.btnKeep.addEventListener('click', () => this.continueGame());
    els.btnSound.addEventListener('click', () => this.toggleSound());
    els.btnView.addEventListener('click', () => this.toggleView());

    window.addEventListener('blur', () => (this.queue.length = 0));
  }

  quickTap() {
    if (this.state === 'start') this.startGame();
    else if (this.state === 'over') this.restart();
    else if (this.state === 'winmodal') this.continueGame();
  }

  startGame() {
    audio.resume();
    audio.startMusic();
    audio.click();
    this.hideScreens();
    els.start.classList.remove('active');
    els.hud.classList.add('visible');
    this.scene.setHeroMode(false);
    this.scene.clearDemoBoard();
    this.state = 'playing';
    this.inputEnabled = true;
    this.scene.sync(this.game, { pop: true });
    this.updateBestUI();
  }

  restart() {
    if (this.state === 'start') {
      this.startGame();
      return;
    }
    audio.resume();
    audio.click();
    this.game.reset({ silent: true });
    this.reached = new Set(this.game.cells().map((t) => t.value));
    this.setScore(0);
    this.scene.clearDemoBoard();
    this.scene.sync(this.game, { pop: true });
    this.hideScreens();
    els.hud.classList.add('visible');
    this.scene.setHeroMode(false);
    this.state = 'playing';
    this.inputEnabled = true;
    this.moveLockUntil = 0;
    this.lastMove = 0;
    this.updateBestUI();
  }

  hideScreens() {
    [els.start, els.over, els.win].forEach((s) => s.classList.remove('active'));
  }

  undo() {
    if (!this.inputEnabled) return;
    if (!this.game.history.length) {
      this.toast('UNDO', 'حرکتی برای بازگردانی نیست');
      return;
    }
    const res = this.game.undo();
    if (!res) return;
    audio.undo();
    this.scene.undoTo(this.game);
    this.reached = new Set(this.game.cells().map((t) => t.value));
    this.setScore(this.game.score, true);
    this.hideScreens();
    this.state = 'playing';
    this.inputEnabled = true;
    this.moveLockUntil = 0;
    this.lastMove = 0;
    this.bumpUndo();
  }

  undoFromOver() {
    const res = this.game.undo();
    if (!res) return;
    audio.undo();
    this.scene.undoTo(this.game);
    this.reached = new Set(this.game.cells().map((t) => t.value));
    this.setScore(this.game.score, true);
    this.hideScreens();
    this.state = 'playing';
    this.inputEnabled = true;
  }

  bumpUndo() {
    els.btnUndo.classList.add('bump');
    setTimeout(() => els.btnUndo.classList.remove('bump'), 320);
  }

  // ── حرکت ─────────────────────────────────────────────────
  tryMove(dir) {
    if (!this.inputEnabled || this.state !== 'playing') return;
    const now = performance.now();
    if (now < this.moveLockUntil || now - this.lastMove < this.moveCooldown) {
      if (this.queue.length < 1) this.queue.push(dir);
      return;
    }
    this.doMove(dir);
  }

  doMove(dir) {
    this.lastMove = performance.now();
    this.moveLockUntil = this.lastMove + 88;
    const result = this.game.move(dir);
    if (!result.moved) {
      // تکان کوچک صفحه به‌جای حرکت
      this.nudge(dir);
      audio.slide();
      if (result.gameOver) setTimeout(() => this.gameOver(), 380);
      return;
    }
    audio.slide();
    this.scene.playMove(result, this.game);
    this.flashScore(result.gained);
    this.queueMergesFx(result.merges);
    this.checkMilestones(result);

    if (result.gameOver) {
      setTimeout(() => this.gameOver(), 700);
    }
  }

  queueMergesFx(merges) {
    if (!merges.length) return;
    setTimeout(() => {
      const total = merges.length;
      merges.forEach((m, i) => {
        const streak = Math.min(total - 1, i);
        setTimeout(() => audio.merge(m.value, streak), i * 46);
      });
    }, 140);
  }

  nudge(dir) {
    const map = { left: 'nudge-left', right: 'nudge-right', up: 'nudge-up', down: 'nudge-down' };
    els.canvas.classList.remove('nudge-left', 'nudge-right', 'nudge-up', 'nudge-down');
    void els.canvas.offsetWidth;
    els.canvas.classList.add(map[dir]);
    setTimeout(() => els.canvas.classList.remove(map[dir]), 220);
  }

  // پس از هر حرکت، نوبت بعدی
  scheduleNext() {
    if (!this.queue.length) return;
    const dir = this.queue.shift();
    this.doMove(dir);
  }

  // ── امتیاز ───────────────────────────────────────────────
  setScore(value, instant = false) {
    this.targetScore = value;
    if (instant) {
      this.displayScore = value;
      this.renderScore();
    }
    this.animateScore();
  }

  onScore(score, best) {
    this.setScore(score);
    this.updateBestUI(best);
  }

  animateScore() {
    if (this.scoreRaf) return;
    const tick = (t) => {
      const diff = this.targetScore - this.displayScore;
      if (Math.abs(diff) < 1) {
        this.displayScore = this.targetScore;
        this.renderScore();
        this.scoreRaf = null;
        return;
      }
      this.displayScore += diff * 0.18;
      this.renderScore();
      this.scoreRaf = requestAnimationFrame(tick);
    };
    this.scoreRaf = requestAnimationFrame(tick);
  }

  renderScore() {
    els.score.textContent = fmt(Math.round(this.displayScore));
  }

  updateBestUI(best) {
    const b = best ?? this.game.best;
    els.best.textContent = fmt(b);
    els.startBest.textContent = fmt(b);
    if (this.game.best > 0) els.startBest.parentElement.classList.add('has-best');
  }

  flashScore(gained) {
    if (!gained) return;
    els.scoreCard.classList.remove('gain');
    void els.scoreCard.offsetWidth;
    els.scoreCard.classList.add('gain');
    const chip = document.createElement('span');
    chip.className = 'gain-chip';
    chip.textContent = `+${fmt(gained)}`;
    els.scoreCard.appendChild(chip);
    setTimeout(() => chip.remove(), 900);
  }

  // ── دستاوردها ────────────────────────────────────────────
  checkMilestones(result) {
    for (const m of result.merges) {
      if (!this.reached.has(m.value) && MILESTONES[m.value]) {
        this.reached.add(m.value);
        setTimeout(() => this.milestone(m.value), 220);
      } else {
        this.reached.add(m.value);
      }
    }
    if (result.merges.some((m) => m.value >= 256)) {
      this.scene?.milestoneFx?.();
    }
  }

  milestone(value) {
    els.milestoneTitle.textContent = fmt(value);
    els.milestoneSub.textContent = MILESTONES[value] || 'بلوک تازه';
    els.milestone.classList.remove('show');
    void els.milestone.offsetWidth;
    els.milestone.classList.add('show');
    setTimeout(() => els.milestone.classList.remove('show'), 2300);
    audio.milestone();
    this.scene.milestoneFx();
  }

  toast(title, sub) {
    els.milestoneTitle.textContent = title;
    els.milestoneSub.textContent = sub;
    els.milestone.classList.remove('show');
    void els.milestone.offsetWidth;
    els.milestone.classList.add('show');
    setTimeout(() => els.milestone.classList.remove('show'), 1600);
  }

  // ── پایان بازی ────────────────────────────────────────────
  onWin() {
    setTimeout(() => {
      if (this.state === 'over') return;
      audio.win();
      this.state = 'winmodal';
      this.inputEnabled = false;
      this.fillOverStats();
      els.win.classList.add('active');
    }, 900);
  }

  continueGame() {
    audio.click();
    els.win.classList.remove('active');
    this.state = 'playing';
    this.inputEnabled = true;
  }

  gameOver() {
    audio.gameOver();
    this.state = 'over';
    this.inputEnabled = false;
    els.overScore.textContent = fmt(this.game.score);
    els.overTile.textContent = fmt(this.game.maxOnBoard());
    els.overMoves.textContent = fmt(this.game.moves);
    const isRecord = this.game.score >= this.game.best && this.game.score > 0;
    els.overRecord.textContent = isRecord ? 'رکورد جدید ثبت شد' : `بهترین امتیاز: ${fmt(this.game.best)}`;
    els.overRecord.classList.toggle('record', isRecord);
    els.over.classList.add('active');
    this.updateBestUI();
    this.scene.shake = 0.35;
  }

  fillOverStats() {
    els.overScore.textContent = fmt(this.game.score);
    els.overTile.textContent = fmt(this.game.maxOnBoard());
    els.overMoves.textContent = fmt(this.game.moves);
  }

  // ── کنترلها ─────────────────────────────────────────────
  toggleSound() {
    audio.resume();
    const muted = audio.toggleMute();
    els.btnSound.classList.toggle('muted', muted);
    if (!muted) audio.click();
  }

  toggleView() {
    audio.resume();
    const auto = this.scene.toggleOrbit();
    els.btnView.classList.toggle('active', auto);
  }

  // ── حلقه اصلی ────────────────────────────────────────────
  loop() {
    let last = performance.now();
    const frame = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      this.scene.update(dt, now / 1000);
      if (this.queue.length && now - this.lastMove > this.moveCooldown) {
        this.scheduleNext();
      }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }
}

function fmt(n) {
  return new Intl.NumberFormat('en-US').format(Math.round(n));
}

// راه‌اندازی
window.addEventListener('DOMContentLoaded', () => {
  try {
    window.__app = new App();
  } catch (err) {
    console.error(err);
    const loader = document.querySelector('#loader');
    if (loader) {
      loader.innerHTML = `<div style="color:#ffb8e8;font-family:Vazirmatn,sans-serif;text-align:center;padding:24px;line-height:1.9">مرورگر شما از WebGL پشتیبانی نمی‌کند.<br/>لطفاً با Chrome یا Safari جدید باز کنید.</div>`;
    }
  }
});
