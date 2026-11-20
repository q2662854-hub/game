import './style.css';
import { sound } from './audio.js';
import { FirestoneGame } from './game.js';

const toFaNum = (n) => Number(n).toLocaleString('fa-IR');

// DOM Elements
const canvas = document.getElementById('game-canvas');
const escapeFlash = document.getElementById('escape-flash');
const crosshairEl = document.getElementById('crosshair');
const chargeRingEl = document.getElementById('ch-charge-ring');
const crosshairTagEl = document.getElementById('crosshair-tag');
const floatingLayer = document.getElementById('floating-layer');
const waveBanner = document.getElementById('wave-banner');

const hudEl = document.getElementById('hud');
const hudScore = document.getElementById('hud-score');
const hudComboPill = document.getElementById('hud-combo-pill');
const hudCombo = document.getElementById('hud-combo');
const hudWaveLabel = document.getElementById('hud-wave-label');
const hudWaveFill = document.getElementById('hud-wave-fill');
const hudLivesBox = document.getElementById('hud-lives-box');
const hudLives = document.getElementById('hud-lives');
const hudWrecked = document.getElementById('hud-wrecked');
const btnMute = document.getElementById('btn-mute');
const btnPause = document.getElementById('btn-pause');
const btnOverdrive = document.getElementById('btn-overdrive');
const overdriveFill = document.getElementById('overdrive-fill');
const overdriveLabel = document.getElementById('overdrive-label');

const menuOverlay = document.getElementById('menu-overlay');
const pauseOverlay = document.getElementById('pause-overlay');
const gameoverOverlay = document.getElementById('gameover-overlay');
const menuBest = document.getElementById('menu-best');

const modeButtons = document.querySelectorAll('.mode-btn');
const btnStart = document.getElementById('btn-start');
const btnResume = document.getElementById('btn-resume');
const btnRestartPause = document.getElementById('btn-restart-pause');
const btnMenuPause = document.getElementById('btn-menu-pause');
const btnReplay = document.getElementById('btn-replay');
const btnMenuGo = document.getElementById('btn-menu-go');

let selectedMode = 'arcade';
let bannerTimeout = null;
let escapeFlashTimeout = null;

function updateMenuBest(score) {
  if (score > 0) {
    menuBest.textContent = `🏅 بهترین رکورد ثبت‌شده: ${toFaNum(score)}`;
  } else {
    menuBest.textContent = '';
  }
}

const game = new FirestoneGame(canvas, {
  onStateChange(st) {
    hudScore.textContent = toFaNum(st.score);
    hudWrecked.textContent = toFaNum(st.totalWrecked);

    if (st.combo >= 2) {
      hudComboPill.classList.remove('hidden');
      hudCombo.textContent = `🔥 کمبو x${toFaNum(st.combo)}`;
    } else {
      hudComboPill.classList.add('hidden');
    }

    if (st.mode === 'freeplay') {
      hudWaveLabel.textContent = 'تخریب آزاد ∞';
      hudWaveFill.style.width = '100%';
      hudLivesBox.classList.add('hidden');
    } else {
      hudWaveLabel.textContent = `موج ${toFaNum(st.wave)}`;
      const pct = Math.min(100, Math.round((st.waveWrecked / st.waveQuota) * 100));
      hudWaveFill.style.width = `${pct}%`;
      hudLivesBox.classList.remove('hidden');
      hudLives.textContent = '🛡️'.repeat(Math.max(0, st.lives)) + '▫️'.repeat(Math.max(0, st.maxLives - st.lives));
    }

    // Overdrive meter
    if (st.overdriveTimer > 0) {
      const pct = Math.max(0, Math.min(100, (st.overdriveTimer / 5.5) * 100));
      overdriveFill.style.width = `${pct}%`;
      overdriveLabel.textContent = '☄️ باران سنگ‌های آتشین فعال!';
      btnOverdrive.disabled = true;
      btnOverdrive.classList.remove('ready');
      btnOverdrive.classList.add('active-mode');
    } else {
      overdriveFill.style.width = `${Math.round(st.fury)}%`;
      btnOverdrive.classList.remove('active-mode');
      if (st.fury >= 100) {
        overdriveLabel.textContent = '🔥 آماده! کلیک کن یا Space بزن (باران آتش)';
        btnOverdrive.disabled = false;
        btnOverdrive.classList.add('ready');
      } else {
        overdriveLabel.textContent = `🔥 خشم آتشین: ${toFaNum(Math.round(st.fury))}٪`;
        btnOverdrive.disabled = true;
        btnOverdrive.classList.remove('ready');
      }
    }
  },

  onCrosshairUpdate(ch) {
    if (!ch.visible) {
      crosshairEl.classList.add('hidden');
      document.body.classList.remove('playing-cursor');
      return;
    }

    crosshairEl.classList.remove('hidden');
    document.body.classList.add('playing-cursor');
    crosshairEl.style.transform = `translate3d(${ch.x}px, ${ch.y}px, 0)`;

    const circumference = 188.5;
    const progress = ch.overdriveActive ? ch.overdriveRatio : ch.chargeRatio;
    chargeRingEl.style.strokeDashoffset = String(circumference * (1 - progress));

    crosshairEl.classList.toggle('locked', Boolean(ch.lockedCarName));
    crosshairEl.classList.toggle('overdrive', ch.overdriveActive);

    if (ch.lockedCarName) {
      crosshairTagEl.classList.remove('hidden');
      crosshairTagEl.textContent = ch.lockedArmored
        ? `🛡️ ${ch.lockedCarName} (نگه‌دار برای شارژ!)`
        : `🎯 شیشه ${ch.lockedCarName}`;
    } else {
      crosshairTagEl.classList.add('hidden');
    }
  },

  onFloatingText(x, y, text, variant = 'normal') {
    const el = document.createElement('div');
    el.className = `float-pop ${variant}`;
    el.textContent = text;
    el.style.left = `${Math.max(90, Math.min(window.innerWidth - 90, x))}px`;
    el.style.top = `${Math.max(80, Math.min(window.innerHeight - 100, y))}px`;
    floatingLayer.appendChild(el);
    setTimeout(() => el.remove(), 1180);
  },

  onBanner(text) {
    waveBanner.textContent = text;
    waveBanner.classList.remove('hidden');
    clearTimeout(bannerTimeout);
    bannerTimeout = setTimeout(() => {
      waveBanner.classList.add('hidden');
    }, 2600);
  },

  onEscapeFlash() {
    escapeFlash.classList.add('active');
    clearTimeout(escapeFlashTimeout);
    escapeFlashTimeout = setTimeout(() => {
      escapeFlash.classList.remove('active');
    }, 320);
  },

  onPauseChange(paused) {
    pauseOverlay.classList.toggle('hidden', !paused);
    if (paused) {
      document.body.classList.remove('playing-cursor');
    }
  },

  onMenuReturn() {
    hudEl.classList.add('hidden');
    pauseOverlay.classList.add('hidden');
    gameoverOverlay.classList.add('hidden');
    menuOverlay.classList.remove('hidden');
    document.body.classList.remove('playing-cursor');
    updateMenuBest(game.bestScore);
  },

  onGameOver(summary) {
    hudEl.classList.add('hidden');
    gameoverOverlay.classList.remove('hidden');
    document.body.classList.remove('playing-cursor');

    document.getElementById('go-score').textContent = toFaNum(summary.score);
    document.getElementById('go-best').textContent = toFaNum(summary.bestScore);
    document.getElementById('go-wrecked').textContent = toFaNum(summary.totalWrecked);
    const acc = summary.shotsFired > 0 ? Math.round((summary.windshieldHits / summary.shotsFired) * 100) : 0;
    document.getElementById('go-accuracy').textContent = `${toFaNum(Math.min(100, acc))}٪`;
    document.getElementById('go-combo').textContent = `x${toFaNum(summary.maxCombo)}`;
    document.getElementById('go-wave').textContent = toFaNum(summary.wave);

    const brandsEl = document.getElementById('go-brands');
    brandsEl.innerHTML = '';
    const entries = Object.entries(summary.wreckedByBrand).sort((a, b) => b[1] - a[1]);
    if (entries.length === 0) {
      brandsEl.innerHTML = '<span class="brand-chip">هنوز ماشینی شکار نشد — دوباره امتحان کن!</span>';
    } else {
      entries.forEach(([name, count]) => {
        const chip = document.createElement('span');
        chip.className = 'brand-chip';
        chip.textContent = `🔥 ${name} × ${toFaNum(count)}`;
        brandsEl.appendChild(chip);
      });
    }
  },
});

updateMenuBest(game.bestScore);

// Mode Selection
modeButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    modeButtons.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    selectedMode = btn.dataset.mode;
  });
});

// Start / Control Buttons
btnStart.addEventListener('click', () => {
  menuOverlay.classList.add('hidden');
  hudEl.classList.remove('hidden');
  game.startGame(selectedMode);
});

btnReplay.addEventListener('click', () => {
  gameoverOverlay.classList.add('hidden');
  hudEl.classList.remove('hidden');
  game.startGame(selectedMode);
});

btnResume.addEventListener('click', () => game.togglePause());
btnRestartPause.addEventListener('click', () => {
  pauseOverlay.classList.add('hidden');
  game.startGame(selectedMode);
});
btnMenuPause.addEventListener('click', () => game.returnToMenu());
btnMenuGo.addEventListener('click', () => game.returnToMenu());

btnPause.addEventListener('click', () => game.togglePause());
btnMute.addEventListener('click', () => {
  const muted = sound.toggleMute();
  btnMute.textContent = muted ? '🔇' : '🔊';
});
btnOverdrive.addEventListener('click', (e) => {
  e.stopPropagation();
  game.activateOverdrive();
});
