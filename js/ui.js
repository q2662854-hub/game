/* ===========================================================
   شیشه‌شکن — UI / HUD glue
   =========================================================== */
const UI = (() => {
  const $ = (id) => document.getElementById(id);
  const el = {
    hud: $('hud'),
    score: $('hudScore'),
    level: $('hudLevel'),
    target: $('hudTarget'),
    progress: $('hudProgress'),
    wrecks: $('hudWrecks'),
    time: $('hudTime'),
    heat: $('hudHeat'),
    combo: $('hudCombo'),
    comboEl: $('hudCombo'),
    comboLbl: $('hudComboLbl'),
    banner: $('banner'),
    bannerText: $('bannerText'),
    toast: $('toast'),
    soundBtn: $('soundBtn'),
    overTitle: $('overTitle'),
    overScore: $('overScore'),
    overWrecks: $('overWrecks'),
    overShatters: $('overShatters'),
    overCombo: $('overCombo'),
    overLevel: $('overLevel'),
    recordTag: $('recordTag'),
    bestScore: $('bestScore'),
    bestCombo: $('bestCombo'),
    totalWrecks: $('totalWrecks'),
    heatWrap: document.querySelector('.heat-wrap'),
    timeBox: document.querySelector('.time-box')
  };
  const screens = {
    menu: $('screen-menu'),
    help: $('screen-help'),
    pause: $('screen-pause'),
    over: $('screen-over')
  };

  let bannerTimer = 0, toastTimer = 0;
  const last = {};

  function show(name) {
    for (const k in screens) screens[k].classList.toggle('hidden', k !== name);
    el.hud.classList.toggle('hidden', name === 'menu' || name === 'help');
  }
  function hideAll() {
    for (const k in screens) screens[k].classList.add('hidden');
    el.hud.classList.remove('hidden');
  }

  function setScore(v) { v = Math.round(v); if (v !== last.score) { last.score = v; el.score.textContent = faNum(v); } }
  function setLevel(v) { if (v !== last.level) { last.level = v; el.level.textContent = faNum(v); } }
  function setProgress(wrecks, target) {
    const pct = clamp(wrecks / target, 0, 1) * 100;
    el.progress.style.width = pct + '%';
    el.wrecks.textContent = faNum(wrecks);
    el.target.textContent = faNum(target);
  }
  function setTime(t) {
    const txt = faTime(t);
    if (txt !== last.time) { last.time = txt; el.time.textContent = txt; }
    el.timeBox.classList.toggle('warn', t <= 10);
  }
  function setHeat(h) {
    const v = Math.round(h);
    if (v !== last.heat) { last.heat = v; el.heat.style.width = v + '%'; }
  }
  function setCooling(on) { el.heatWrap.classList.toggle('cooling', on); }
  function setCombo(mult, streak) {
    if (mult !== last.mult) {
      last.mult = mult;
      el.combo.textContent = '×' + faNum(mult);
      el.combo.classList.add('pop');
      setTimeout(() => el.combo.classList.remove('pop'), 120);
    }
    if (streak !== last.streak) { last.streak = streak; el.comboLbl.textContent = 'زنجیره ' + faNum(streak); }
  }
  function banner(text) {
    el.bannerText.textContent = text;
    el.banner.classList.add('show');
    clearTimeout(bannerTimer);
    bannerTimer = setTimeout(() => el.banner.classList.remove('show'), 1300);
  }
  function toast(text) {
    el.toast.textContent = text;
    el.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.toast.classList.remove('show'), 1900);
  }

  function syncSound() {
    el.soundBtn.textContent = SFX.isEnabled() ? '🔊' : '🔇';
    el.soundBtn.classList.toggle('off', !SFX.isEnabled());
  }

  function refreshMenuStats() {
    el.bestScore.textContent = faNum(Records.best);
    el.bestCombo.textContent = '×' + faNum(Records.bestCombo);
    el.totalWrecks.textContent = faNum(Records.wrecks);
  }

  function showOver(game, record) {
    el.overScore.textContent = faNum(game.score);
    el.overWrecks.textContent = faNum(game.wrecks);
    el.overShatters.textContent = faNum(game.shatters);
    el.overCombo.textContent = '×' + faNum(Math.round(clamp(1 + Math.floor(game.bestStreak / 2) * 0.5, 1, 5))) + ' (' + faNum(game.bestStreak) + ')';
    el.overLevel.textContent = faNum(game.level);
    el.recordTag.classList.toggle('hidden', !record);
    let title = 'دستت گرم!';
    if (game.wrecks >= 24) title = 'سلطانِ جاده! 👑';
    else if (game.wrecks >= 14) title = 'شیشه‌شکن حرفه‌ای!';
    else if (game.wrecks >= 6) title = 'خوب بود!';
    else title = 'تازه شروع کردی';
    el.overTitle.textContent = title;
    show('over');
    refreshMenuStats();
  }

  return {
    el, screens, show, hideAll,
    setScore, setLevel, setProgress, setTime, setHeat, setCooling, setCombo,
    banner, toast, syncSound, refreshMenuStats, showOver
  };
})();
