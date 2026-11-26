import { fa, faTime } from './constants.js';
import { poolAudio } from './audio.js';

const $ = (id) => document.getElementById(id);

const GROUP_FA = { solid: 'توپ‌های تکرنگ', stripe: 'توپ‌های راه‌راه' };
const GROUP_COLOR = { solid: 1, stripe: 9 };

export class UI {
  constructor() {
    this.game = null;
    this.timers = {};
    this.muted = false;
    this.soundReady = false;

    this.els = {
      hud: $('hud'),
      score: $('stat-score'),
      pots: $('stat-pots'),
      streak: $('stat-streak'),
      time: $('stat-time'),
      best: $('stat-best'),
      cellScore: $('cell-score'),
      cellPots: $('cell-pots'),
      cellStreak: $('cell-streak'),
      turnCard: $('turn-card'),
      turnAvatar: $('turn-avatar'),
      turnName: $('turn-name'),
      turnState: $('turn-state'),
      chipYou: $('chip-you'),
      chipYouDot: $('chip-you-dot'),
      chipYouLabel: $('chip-you-label'),
      chipAi: $('chip-ai'),
      chipAiDot: $('chip-ai-dot'),
      chipAiLabel: $('chip-ai-label'),
      groupBadge: $('group-badge'),
      powerFill: $('power-fill'),
      powerReadout: $('power-readout'),
      powerTrack: $('power-track'),
      shotPanel: $('shot-panel'),
      shootBtn: $('btn-shoot'),
      shootLabel: $('shoot-label'),
      banner: $('turn-banner'),
      tbTitle: $('tb-title'),
      tbSub: $('tb-sub'),
      floatLayer: $('float-layer'),
      toastWrap: $('toast-wrap'),
      overlayStart: $('overlay-start'),
      overlayHelp: $('overlay-help'),
      overlayPause: $('overlay-pause'),
      overlayResult: $('overlay-result'),
      startBest: $('start-best'),
      startStreak: $('start-streak'),
      resultTitle: $('result-title'),
      resultReason: $('result-reason'),
      resultCrest: $('result-crest'),
      resultCrestMark: $('result-crest-mark'),
      resultKicker: $('result-kicker'),
      recordPill: $('record-pill'),
      resScore: $('res-score'),
      resPots: $('res-pots'),
      resFouls: $('res-fouls'),
      resTime: $('res-time'),
      btnSound: $('btn-sound'),
      boot: $('boot')
    };
  }

  // ---------------------------------------------------------------------------
  bind(game) {
    this.game = game;
    const e = this.els;

    $('btn-start').addEventListener('click', () => {
      this.hideOverlays();
      poolAudio.ensure();
      game.start();
      this.showHud(true);
      this.banner('نوبت تو', 'À TOI DE JOUER');
    });

    $('btn-howto').addEventListener('click', () => e.overlayHelp.classList.remove('hidden'));
    $('btn-help-close').addEventListener('click', () => e.overlayHelp.classList.add('hidden'));

    $('btn-pause').addEventListener('click', () => game.pause());
    $('btn-resume').addEventListener('click', () => game.resume());
    $('btn-restart-pause').addEventListener('click', () => {
      this.hideOverlays();
      game.restart();
      this.showHud(true);
      this.banner('میز نو', 'NOUVELLE PARTIE');
    });
    $('btn-menu-pause').addEventListener('click', () => {
      this.hideOverlays();
      this.showHud(false);
      game.toMenu();
      this.refreshBest();
    });

    $('btn-again').addEventListener('click', () => {
      this.hideOverlays();
      game.restart();
      this.showHud(true);
      this.banner('بازی دوباره', 'REVANCHE');
    });
    $('btn-menu-result').addEventListener('click', () => {
      this.hideOverlays();
      this.showHud(false);
      game.toMenu();
      this.refreshBest();
    });

    e.shootBtn.addEventListener('click', () => {
      poolAudio.ensure();
      game.shoot();
    });

    e.btnSound.addEventListener('click', () => {
      this.muted = !this.muted;
      poolAudio.setMuted(this.muted);
      e.btnSound.style.opacity = this.muted ? '0.4' : '1';
      e.btnSound.classList.toggle('muted', this.muted);
    });

    $('btn-cam').addEventListener('click', () => {
      game.adjustCam(Math.PI * 0.35, 0.12, 0.55);
      this.toast('نمای میز چرخید');
    });

    // Power track: click or drag to set power.
    const setFromEvent = (ev) => {
      const r = e.powerTrack.getBoundingClientRect();
      const t = 1 - (ev.clientX - r.left) / r.width;
      game.setPower(Math.max(0.03, Math.min(1, t)));
    };
    let draggingPower = false;
    e.powerTrack.addEventListener('pointerdown', (ev) => {
      draggingPower = true;
      e.powerTrack.setPointerCapture?.(ev.pointerId);
      setFromEvent(ev);
    });
    e.powerTrack.addEventListener('pointermove', (ev) => {
      if (draggingPower) setFromEvent(ev);
    });
    window.addEventListener('pointerup', () => {
      draggingPower = false;
    });

    // Touch aim nudge buttons.
    document.querySelectorAll('[data-nudge]').forEach((btn) => {
      const dir = btn.dataset.nudge;
      const apply = (ev) => {
        ev.preventDefault();
        if (dir === '+') game.setAimAngle(game.aimAngle + 0.04);
        else if (dir === '-') game.setAimAngle(game.aimAngle - 0.04);
        else game.nudgePower(-0.06);
      };
      btn.addEventListener('pointerdown', apply);
    });

    this.refreshBest();
    e.time.textContent = faTime(0);
    this.setPower(0.55);
    this.updateGroupChips(game);
  }

  // ---------------------------------------------------------------------------
  // HUD
  // ---------------------------------------------------------------------------
  showHud(show) {
    this.els.hud.classList.toggle('hidden-fade', !show);
    this.els.hud.setAttribute('aria-hidden', show ? 'false' : 'true');
  }

  hideOverlays() {
    ['overlayStart', 'overlayHelp', 'overlayPause', 'overlayResult'].forEach((k) =>
      this.els[k].classList.add('hidden')
    );
  }

  refreshBest() {
    const g = this.game;
    if (!g) return;
    this.els.startBest.textContent = fa(g.best.toLocaleString('en-US'));
    this.els.startStreak.textContent = fa(g.bestStreak);
    this.els.best.textContent = fa(g.best.toLocaleString('en-US'));
  }

  updateHud(game) {
    const e = this.els;
    e.score.textContent = fa(game.score.toLocaleString('en-US'));
    e.pots.textContent = fa(game.pots);
    e.streak.textContent = `×${fa(game.streak)}`;
    e.best.textContent = fa(Math.max(game.best, game.score).toLocaleString('en-US'));
    this.updateGroupChips(game);
    this.updateTurnCard(game.turn, game.mode);
  }

  updateGroupChips(game) {
    const e = this.els;
    const set = (chip, dot, label, group, side) => {
      dot.className = 'dot';
      if (!group) {
        dot.classList.add('solid');
        dot.style.setProperty('--chip-color', 'rgba(255,255,255,0.25)');
        label.textContent = side === 'you' ? 'رنگ تو' : 'رنگ حریف';
        chip.classList.remove('active');
        return;
      }
      dot.classList.add(group === 'solid' ? 'solid' : 'stripe');
      const color = group === 'solid' ? '#f5c518' : '#1c63d5';
      dot.style.setProperty('--chip-color', color);
      const remaining = game.ballsLeft(group);
      label.textContent = `${GROUP_FA[group]} · ${fa(remaining)}`;
      chip.classList.add('active');
      chip.style.color = '#f3efe4';
    };
    set(e.chipYou, e.chipYouDot, e.chipYouLabel, game.playerGroup, 'you');
    set(e.chipAi, e.chipAiDot, e.chipAiLabel, game.aiGroup, 'ai');
    e.groupBadge.textContent = game.playerGroup ? 'گروه‌ها مشخص شد' : 'میز باز — اولین توپ تعیین می‌کند';
    void GROUP_COLOR;
  }

  updateTurnCard(turn, mode) {
    const e = this.els;
    const isAi = turn === 'ai';
    e.turnCard.classList.toggle('is-you', !isAi);
    e.turnCard.classList.toggle('is-ai', isAi);
    e.turnAvatar.textContent = isAi ? 'ح' : 'تو';
    e.turnName.textContent = isAi ? 'نوبتِ حریف' : 'نوبتِ توست';
    if (mode === 'placing') e.turnState.textContent = 'توپ سفید در دست';
    else if (mode === 'watching') e.turnState.textContent = 'در حال نشانه‌گیری';
    else e.turnState.textContent = isAi ? 'در حال اندیشیدن…' : 'آمادهٔ ضربه';
    e.shootBtn.disabled = isAi || mode !== 'aim';
  }

  setPower(p) {
    const e = this.els;
    const pct = Math.round(p * 100);
    e.powerFill.style.width = `${pct}%`;
    e.powerReadout.textContent = `${fa(pct)}٪`;
    e.powerTrack.setAttribute('aria-valuenow', String(pct));
    if (e.shootLabel) {
      e.shootLabel.textContent = pct > 78 ? 'ضربهٔ سهمگین' : pct > 45 ? 'ضربه' : 'ضربهٔ آرام';
    }
  }

  tickTimer(ms) {
    this.els.time.textContent = faTime(ms);
  }

  banner(title, sub) {
    const e = this.els;
    e.tbTitle.textContent = title;
    e.tbSub.textContent = sub;
    e.banner.classList.remove('show');
    void e.banner.offsetWidth;
    e.banner.classList.add('show');
  }

  toast(text, kind = '') {
    const el = document.createElement('div');
    el.className = `toast ${kind}`;
    el.textContent = text;
    this.els.toastWrap.appendChild(el);
    setTimeout(() => {
      el.style.transition = 'opacity .3s ease, transform .3s ease';
      el.style.opacity = '0';
      el.style.transform = 'translateY(-8px)';
      setTimeout(() => el.remove(), 340);
    }, 1500);
  }

  floatLabel(text, worldPos) {
    const game = this.game;
    if (!game) return;
    const v = worldPos.clone().project(game.stage.camera);
    const x = (v.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-v.y * 0.5 + 0.5) * window.innerHeight;
    const el = document.createElement('div');
    el.className = 'float-label';
    el.textContent = fa(text);
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    this.els.floatLayer.appendChild(el);
    setTimeout(() => el.remove(), 1200);
  }

  // ---------------------------------------------------------------------------
  // Game callbacks
  // ---------------------------------------------------------------------------
  onTurn(game, who, keep) {
    this.updateTurnCard(who, game.mode);
    this.setPower(game.power);
    if (who === 'you') {
      if (keep) this.banner('نوبت تو', 'À TOI DE JOUER');
      else {
        this.banner('نوبت تو', 'À TOI DE JOUER');
      }
    } else {
      this.banner('نوبتِ حریف', 'AU MAÎTRE DE MAISON');
    }
    this.updateGroupChips(game);
  }

  onGroupAssigned(game, group) {
    this.updateGroupChips(game);
    this.toast(group === 'solid' ? 'گروهٔ تو: توپ‌های تک‌رنگ' : 'گروهٔ تو: توپ‌های راه‌راه', 'good');
  }

  onPot(game, count) {
    this.els.cellPots.classList.add('pop');
    this.els.cellScore.classList.add('pop');
    setTimeout(() => {
      this.els.cellPots.classList.remove('pop');
      this.els.cellScore.classList.remove('pop');
    }, 240);
    if (count > 1) {
      this.toast(`دو توپ در یک ضربه!`, 'good');
      this.banner('ضربهٔ دوگانه', 'DOUBLE POT');
    }
  }

  onScratch() {
    this.toast('توپ سفید افتاد!', 'warn');
  }

  onPlace(game, active) {
    this.els.shotPanel.style.opacity = active ? '0.35' : '1';
    this.els.shootBtn.disabled = active;
    this.updateTurnCard(game.turn, game.mode);
    if (active) {
      this.toast(game.turn === 'ai' ? 'حریف توپ را می‌گذارد' : 'توپ سفید را روی میز بگذار', '');
    }
  }

  setPlaceValid() {
    /* handled by the 3D ghost colour */
  }

  onShot() {
    this.els.shootBtn.disabled = true;
  }

  onPause(game, paused) {
    if (paused) this.els.overlayPause.classList.remove('hidden');
    else this.els.overlayPause.classList.add('hidden');
    void game;
  }

  onRack(game) {
    this.updateHud(game);
    this.els.time.textContent = faTime(0);
  }

  onGameOver(game, result, reason) {
    const e = this.els;
    this.showHud(false);
    e.overlayResult.classList.remove('hidden');
    const win = result === 'win';
    e.resultTitle.textContent = win ? 'پیروزی' : 'باخت';
    e.resultTitle.className = `result-title ${win ? 'win' : 'lose'}`;
    e.resultKicker.textContent = win ? 'Victoire' : 'Défaite';
    e.resultReason.textContent = reason;
    e.resultCrest.classList.toggle('win', win);
    e.resScore.textContent = fa(game.score.toLocaleString('en-US'));
    e.resPots.textContent = fa(game.pots);
    e.resFouls.textContent = fa(game.fouls);
    e.resTime.textContent = faTime(game.elapsed);
    e.recordPill.classList.toggle('hidden', !game.newRecord);
    this.refreshBest();
  }

  bootDone() {
    this.els.boot.classList.add('done');
    setTimeout(() => this.els.boot.remove(), 900);
  }
}
