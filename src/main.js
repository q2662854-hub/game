import './style.css';
import { sound } from './audio.js';
import { LuxuryHighwayGame, toPersianDigits } from './game.js';

const canvas = document.getElementById('game-canvas');

// HUD & Overlay Elements
const els = {
  hud: document.getElementById('hud'),
  score: document.getElementById('hud-score'),
  wave: document.getElementById('hud-wave'),
  wavePill: document.getElementById('wave-pill'),
  comboPill: document.getElementById('combo-pill'),
  combo: document.getElementById('hud-combo'),
  infernoWrap: document.getElementById('inferno-wrap'),
  infernoTitle: document.getElementById('inferno-title'),
  infernoPercent: document.getElementById('inferno-percent'),
  infernoFill: document.getElementById('inferno-fill'),
  shieldsPill: document.getElementById('shields-pill'),
  shields: document.getElementById('hud-shields'),
  controlsTip: document.getElementById('controls-tip'),
  waveBanner: document.getElementById('wave-banner'),
  waveBannerSub: document.getElementById('wave-banner-sub'),
  waveBannerTitle: document.getElementById('wave-banner-title'),

  startOverlay: document.getElementById('start-overlay'),
  startBest: document.getElementById('start-best'),
  pauseOverlay: document.getElementById('pause-overlay'),
  gameoverOverlay: document.getElementById('gameover-overlay'),

  goScore: document.getElementById('go-score'),
  goNewRecord: document.getElementById('go-new-record'),
  goCars: document.getElementById('go-cars'),
  goWindshields: document.getElementById('go-windshields'),
  goCombo: document.getElementById('go-combo'),
  goChains: document.getElementById('go-chains'),

  btnStartArcade: document.getElementById('btn-start-arcade'),
  btnStartEndless: document.getElementById('btn-start-endless'),
  btnMute: document.getElementById('btn-mute'),
  btnPause: document.getElementById('btn-pause'),
  btnResume: document.getElementById('btn-resume'),
  btnRestartPause: document.getElementById('btn-restart-pause'),
  btnMenuPause: document.getElementById('btn-menu-pause'),
  btnPlayAgain: document.getElementById('btn-play-again'),
  btnMenuGameover: document.getElementById('btn-menu-gameover')
};

let bannerTimeout = null;
let tipTimeout = null;

const ui = {
  showMenu(bestScore) {
    els.startBest.textContent = `رکورد: ${toPersianDigits(bestScore)}`;
    els.startOverlay.classList.remove('hidden');
    els.pauseOverlay.classList.add('hidden');
    els.gameoverOverlay.classList.add('hidden');
    els.hud.classList.add('hidden');
    els.controlsTip.classList.add('hidden');
    els.waveBanner.classList.add('hidden');
  },

  showGameplayUI(game) {
    els.startOverlay.classList.add('hidden');
    els.pauseOverlay.classList.add('hidden');
    els.gameoverOverlay.classList.add('hidden');
    els.hud.classList.remove('hidden');

    // Hide shields in endless mode
    els.shieldsPill.classList.toggle('hidden', game.mode === 'endless');

    // Show quick controls tip for first 7 seconds
    els.controlsTip.classList.remove('hidden');
    clearTimeout(tipTimeout);
    tipTimeout = setTimeout(() => {
      els.controlsTip.classList.add('hidden');
    }, 7500);
  },

  showPause(paused) {
    els.pauseOverlay.classList.toggle('hidden', !paused);
  },

  showWaveBanner(sub, title) {
    els.waveBannerSub.textContent = sub;
    els.waveBannerTitle.textContent = title;
    els.waveBanner.classList.remove('hidden');
    clearTimeout(bannerTimeout);
    bannerTimeout = setTimeout(() => {
      els.waveBanner.classList.add('hidden');
    }, 2400);
  },

  syncInferno(game) {
    const pct = Math.round(game.infernoMeter);
    els.infernoFill.style.width = `${pct}%`;
    els.infernoPercent.textContent = `${toPersianDigits(pct)}٪`;
    els.infernoWrap.classList.toggle('active', game.infernoActive);
    els.infernoTitle.textContent = game.infernoActive ? '🔥 خشم آتشفشان (۲×)' : 'خشم آتشفشان';
  },

  syncHUD(game) {
    els.score.textContent = toPersianDigits(game.score);
    els.wave.textContent = game.mode === 'endless' ? '∞' : toPersianDigits(game.wave);

    if (game.combo >= 2) {
      els.comboPill.classList.remove('hidden');
      els.combo.textContent = `×${toPersianDigits(game.combo)}`;
    } else {
      els.comboPill.classList.add('hidden');
    }

    // Shields dots
    els.shields.innerHTML = '';
    for (let i = 0; i < game.maxShields; i++) {
      const dot = document.createElement('span');
      dot.className = `shield-dot${i >= game.shields ? ' lost' : ''}`;
      els.shields.appendChild(dot);
    }

    this.syncInferno(game);
  },

  showGameOver(summary) {
    els.hud.classList.add('hidden');
    els.controlsTip.classList.add('hidden');
    els.waveBanner.classList.add('hidden');
    els.gameoverOverlay.classList.remove('hidden');

    els.goScore.textContent = toPersianDigits(summary.score);
    els.goNewRecord.classList.toggle('hidden', !summary.isNewRecord);
    els.goCars.textContent = toPersianDigits(summary.carsDisabled);
    els.goWindshields.textContent = toPersianDigits(summary.windshieldsShattered);
    els.goCombo.textContent = `×${toPersianDigits(summary.maxCombo)}`;
    els.goChains.textContent = toPersianDigits(summary.chainReactions);
  }
};

const game = new LuxuryHighwayGame(canvas, ui);
ui.showMenu(game.bestScore);

// Button Listeners
els.btnStartArcade.addEventListener('click', () => {
  sound.ensureContext();
  game.start('arcade');
});

els.btnStartEndless.addEventListener('click', () => {
  sound.ensureContext();
  game.start('endless');
});

els.btnMute.addEventListener('click', () => {
  const muted = sound.toggleMute();
  els.btnMute.textContent = muted ? '🔇' : '🔊';
});

els.btnPause.addEventListener('click', () => game.pause());
els.btnResume.addEventListener('click', () => game.resume());
els.btnRestartPause.addEventListener('click', () => game.start(game.mode));
els.btnMenuPause.addEventListener('click', () => game.goToMenu());
els.btnPlayAgain.addEventListener('click', () => game.start(game.mode));
els.btnMenuGameover.addEventListener('click', () => game.goToMenu());

// Pointer Events (unified mouse + touch)
function getCanvasCoords(ev) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ev.clientX - rect.left,
    y: ev.clientY - rect.top
  };
}

canvas.addEventListener('pointermove', (ev) => {
  const { x, y } = getCanvasCoords(ev);
  game.onPointerMove(x, y);
});

canvas.addEventListener('pointerdown', (ev) => {
  if (ev.button !== 0 && ev.pointerType === 'mouse') return;
  canvas.setPointerCapture(ev.pointerId);
  const { x, y } = getCanvasCoords(ev);
  game.onPointerDown(x, y);
});

canvas.addEventListener('pointerup', (ev) => {
  const { x, y } = getCanvasCoords(ev);
  game.onPointerUp(x, y);
});

canvas.addEventListener('pointercancel', () => {
  game.pointer.down = false;
  game.pointer.downTime = 0;
});

// Keyboard shortcuts
window.addEventListener('keydown', (ev) => {
  if (ev.key === 'Escape' || ev.key.toLowerCase() === 'p') {
    if (game.state === 'playing') game.pause();
    else if (game.state === 'paused') game.resume();
  } else if (ev.key.toLowerCase() === 'm') {
    const muted = sound.toggleMute();
    els.btnMute.textContent = muted ? '🔇' : '🔊';
  }
});

window.addEventListener('resize', () => game.resize());

// Main Animation Loop
let lastTs = performance.now();
function loop(ts) {
  const dt = (ts - lastTs) / 1000;
  lastTs = ts;

  game.update(dt);
  game.render();

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
