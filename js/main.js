/* ===========================================================
   شیشه‌شکن — boot, input, loop
   =========================================================== */
(() => {
  const cv = document.getElementById('cv');
  const game = new Game(cv);
  window.__game = game;   // handy for debugging / tests
  Records.load();
  UI.refreshMenuStats();
  UI.syncSound();
  UI.show('menu');

  /* ---------------- sizing ---------------- */
  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    game.resize(w, h, dpr);
  }
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', () => setTimeout(resize, 120));
  resize();

  /* ---------------- input ---------------- */
  let pointerDown = false;

  function setPointer(e) {
    const r = cv.getBoundingClientRect();
    game.pointer.x = e.clientX - r.left;
    game.pointer.y = e.clientY - r.top;
    game.aim.active = true;
    game.isTouch = e.pointerType === 'touch' || e.pointerType === 'pen';
  }

  cv.addEventListener('pointermove', (e) => {
    setPointer(e);
    SFX.resume();
  });

  cv.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    SFX.resume();
    setPointer(e);
    pointerDown = true;
    if (game.state === State.PLAY) game.throwAt(game.pointer.x, game.pointer.y);
  });

  cv.addEventListener('pointerup', () => { pointerDown = false; });
  cv.addEventListener('pointercancel', () => { pointerDown = false; });
  cv.addEventListener('pointerleave', () => { game.aim.active = false; });
  cv.addEventListener('contextmenu', (e) => e.preventDefault());

  // touch drag rapid fire
  let lastFire = 0;
  cv.addEventListener('pointermove', (e) => {
    if (!pointerDown || game.state !== State.PLAY) return;
    if (performance.now() - lastFire < 110) return;
    lastFire = performance.now();
    game.throwAt(game.pointer.x, game.pointer.y);
  });

  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    const k = e.key.toLowerCase();
    if (k === ' ' || k === 'enter') {
      e.preventDefault();
      SFX.resume();
      if (game.state === State.PLAY) {
        game.throwAt(game.pointer.x || game.W / 2, game.pointer.y || game.H * 0.45);
      } else if (game.state === State.MENU) startGame();
      else if (game.state === State.OVER) startGame();
      else if (game.state === State.PAUSE) resumeGame();
    } else if (k === 'p' || k === 'escape') {
      if (game.state === State.PLAY) pauseGame();
      else if (game.state === State.PAUSE) resumeGame();
    } else if (k === 'm') {
      toggleSound();
    }
  });

  /* ---------------- actions ---------------- */
  function startGame() {
    SFX.resume();
    SFX.click();
    game.start();
    UI.hideAll();
    UI.setScore(0);
    UI.setLevel(1);
    UI.setProgress(0, game.levelTarget);
    UI.setTime(game.time);
    UI.setHeat(0);
    UI.setCombo(1, 0);
    UI.setCooling(false);
    UI.banner('شروع!');
    setTimeout(() => { if (game.state === State.PLAY) UI.toast('روی شیشهٔ ماشین‌ها کلیک کن یا ضربه بزن 🔥'); }, 700);
    game.pointer.x = game.W / 2;
    game.pointer.y = game.H * 0.42;
    game.aim.active = true;
    game.lastHud = {};
  }
  function pauseGame() {
    if (game.state !== State.PLAY) return;
    game.pause();
    UI.show('pause');
    SFX.click();
  }
  function resumeGame() {
    if (game.state !== State.PAUSE) return;
    game.resume();
    UI.hideAll();
    SFX.click();
  }
  function goMenu() {
    game.state = State.MENU;
    game.reset();
    UI.show('menu');
    UI.refreshMenuStats();
    SFX.stopSiren();
    SFX.click();
  }
  function toggleSound() {
    SFX.resume();
    SFX.setEnabled(!SFX.isEnabled());
    UI.syncSound();
    if (SFX.isEnabled()) SFX.click();
  }

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const a = btn.dataset.action;
    SFX.resume();
    if (a === 'start') startGame();
    else if (a === 'help') { SFX.click(); UI.show('help'); }
    else if (a === 'menu') goMenu();
    else if (a === 'pause') pauseGame();
    else if (a === 'resume') resumeGame();
    else if (a === 'restart') startGame();
    else if (a === 'sound') toggleSound();
  });

  // prevent double-tap zoom etc.
  document.addEventListener('gesturestart', (e) => e.preventDefault());

  /* ---------------- HUD sync ---------------- */
  function syncHud() {
    UI.setScore(game.score);
    UI.setLevel(game.level);
    UI.setProgress(game.levelWrecks, game.levelTarget);
    UI.setTime(game.time);
    UI.setHeat(game.heat);
    UI.setCooling(game.overheat > 0);
  }

  /* ---------------- loop ---------------- */
  let prev = performance.now();
  let rafId = 0;
  let paused = false;

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && game.state === State.PLAY) pauseGame();
  });

  function frame(now) {
    rafId = requestAnimationFrame(frame);
    let dt = (now - prev) / 1000;
    prev = now;
    if (!isFinite(dt) || dt <= 0) dt = 1 / 60;
    dt = Math.min(dt, 1 / 30); // clamp so a lag spike cannot teleport cars past you

    if (game.state === State.PLAY || game.state === State.MENU || game.state === State.OVER) {
      game.update(dt);
    } else {
      // paused: keep idle fx cheap
      game.update(0);
    }
    game.draw(now);

    if (game.state === State.PLAY) syncHud();
    else if (game.state !== State.MENU) syncHud();
  }
  requestAnimationFrame(frame);
})();
