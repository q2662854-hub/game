/* ===========================================================
   شیشه‌شکن — game core
   =========================================================== */

const State = { MENU: 'menu', PLAY: 'play', PAUSE: 'pause', OVER: 'over' };

class Game {
  constructor(canvas) {
    this.cv = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.W = 0; this.H = 0; this.dpr = 1;
    this.state = State.MENU;
    this.menuTime = 0;

    this.cars = [];
    this.stones = [];
    this.parts = [];
    this.texts = [];
    this.rings = [];
    this.flash = 0;
    this.shake = 0;
    this.shakeX = 0; this.shakeY = 0;
    this.timeScale = 1;
    this.slowT = 0;

    this.aim = { x: 0, y: 0, active: false, overCar: null, overPane: false };
    this.pointer = { x: 0, y: 0 };
    this.hand = { x: 0, y: 0, angle: -1.1, recoil: 0, glow: 0 };

    this.road = { cx: 0, horizon: 0, bottom: 0, halfBottom: 0, carW: 0 };
    this.worldPhase = 0;
    this.stars = [];
    this.buildings = [];
    this.clouds = [];

    this.reset();
  }

  /* ---------------- layout ---------------- */
  resize(w, h, dpr) {
    this.W = w; this.H = h; this.dpr = dpr;
    this.cv.width = Math.round(w * dpr);
    this.cv.height = Math.round(h * dpr);
    this.cv.style.width = w + 'px';
    this.cv.style.height = h + 'px';

    const R = this.road;
    R.cx = w * 0.5;
    R.horizon = h * (h > w ? 0.29 : 0.31);
    R.bottom = h * 1.02;
    R.halfBottom = Math.min(w * 0.52, h * 1.05);
    R.carW = R.halfBottom * 0.62;

    this.hand.x = w * 0.085;
    this.hand.y = h * 1.005;

    this.makeSky();
  }

  makeSky() {
    const { W, H } = this;
    const R = this.road;
    this.stars = [];
    const n = Math.round((W * H) / 12000);
    for (let i = 0; i < n; i++) {
      this.stars.push({
        x: Math.random() * W,
        y: Math.random() * R.horizon * 0.92,
        r: rand(0.4, 1.5),
        a: rand(0.25, 0.95),
        tw: rand(0.4, 2.2),
        ph: rand(0, TAU)
      });
    }
    this.buildings = [];
    const layers = [
      { depth: 0.05, hMin: 0.10, hMax: 0.26, color: '#131024', win: 0.16, step: 90 },
      { depth: 0.13, hMin: 0.07, hMax: 0.20, color: '#0e0b1b', win: 0.22, step: 62 }
    ];
    for (const L of layers) {
      let x = -40;
      while (x < W + 60) {
        const bw = rand(L.step * 0.55, L.step * 1.5);
        const bh = rand(L.hMin, L.hMax) * H;
        this.buildings.push({
          x, w: bw, h: bh, color: L.color, win: L.win, depth: L.depth,
          seed: Math.random() * 999, antenna: chance(0.25)
        });
        x += bw + rand(3, 18);
      }
    }
    this.clouds = [];
    for (let i = 0; i < 5; i++) {
      this.clouds.push({ x: rand(0, W), y: rand(0.05, 0.2) * H, w: rand(0.25, 0.6) * W, h: rand(10, 26), sp: rand(2, 7), a: rand(0.03, 0.08) });
    }
    this.bakeSky();
  }

  /* static sky is expensive (stars, windows) — render it once per resize */
  bakeSky() {
    const { W, H } = this;
    let cv;
    if (typeof document !== 'undefined' && document.createElement) cv = document.createElement('canvas');
    else if (typeof OffscreenCanvas !== 'undefined') cv = new OffscreenCanvas(W, H);
    if (!cv) { this.skyCanvas = null; return; }
    const dpr = this.dpr;
    cv.width = Math.max(1, Math.round(W * dpr));
    cv.height = Math.max(1, Math.round(H * dpr));
    const c = cv.getContext('2d');
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.paintSky(c, 0);
    this.skyCanvas = cv;
  }

  /* ---------------- lifecycle ---------------- */
  reset() {
    this.cars = []; this.stones = []; this.parts = []; this.texts = []; this.rings = [];
    this.score = 0;
    this.level = 1;
    this.levelWrecks = 0;
    this.levelTarget = 5;
    this.time = 75;
    this.maxTime = 75;
    this.wrecks = 0;
    this.shatters = 0;
    this.streak = 0;
    this.bestStreak = 0;
    this.mult = 1;
    this.streakTimer = 0;
    this.heat = 0;
    this.overheat = 0;
    this.cooled = true;
    this.cooldown = 0;
    this.spawnTimer = 1.0;
    this.lastLane = -1;
    this.policeTimer = rand(18, 30);
    this.flash = 0;
    this.shake = 0;
    this.timeScale = 1;
    this.slowT = 0;
    this.hand.recoil = 0;
    this.hand.glow = 0;
    this.worldPhase = 0;
    this.hintT = 8;
    this.throwCount = 0;
    this.hitCount = 0;
  }

  start() {
    this.reset();
    this.state = State.PLAY;
    SFX.resume();
    this.spawnCar(0.02);
  }

  pause() { if (this.state === State.PLAY) { this.state = State.PAUSE; SFX.stopSiren(); } }
  resume() { if (this.state === State.PAUSE) { this.state = State.PLAY; SFX.resume(); } }

  gameOver() {
    this.state = State.OVER;
    SFX.stopSiren();
    SFX.over();
    Records.wrecks += this.wrecks;
    let record = false;
    if (this.score > Records.best) { Records.best = this.score; record = true; }
    if (this.bestStreak > Records.bestCombo) Records.bestCombo = this.bestStreak;
    Records.save();
    UI.showOver(this, record);
  }

  /* ---------------- spawning ---------------- */
  spawnCar(t = 0) {
    let lane = randInt(-1, 1);
    // avoid stacking same lane back to back
    let guard = 0;
    while (lane === this.lastLane && guard++ < 8) lane = randInt(-1, 1);
    this.lastLane = lane;

    // police occasionally
    let spec;
    if (this.policeTimer <= 0) {
      spec = CAR_SPECS.find((s) => s.id === 'police');
      this.policeTimer = rand(22, 38);
    } else {
      spec = rollCarSpec();
      while (spec.id === 'police') spec = rollCarSpec();
    }

    const armoredChance = this.level >= 3 ? Math.min(0.09 + this.level * 0.02, 0.28) : 0;
    const armored = !spec.police && spec.value < 400 && chance(armoredChance);
    const duration = Math.max(2.6, 5.6 - this.level * 0.3) * rand(0.9, 1.1);

    const car = new Car(spec, { lane, t, duration, armored });
    this.cars.push(car);

    // from level 4 the traffic occasionally comes in pairs
    if (this.level >= 4 && chance(0.22)) {
      const otherLane = lane === 0 ? (chance(0.5) ? -1 : 1) : 0;
      const spec2 = rollCarSpec();
      if (spec2.id !== 'police') {
        this.cars.push(new Car(spec2, { lane: otherLane, t: t * 0.5, duration: duration * 1.05, armored: false }));
      }
    }
    if (spec.police) {
      SFX.startSiren();
      UI.toast('🚨 پلیس راهور نزدیک می‌شود');
    }
    return car;
  }

  /* ---------------- main step ---------------- */
  update(dt) {
    this.menuTime += dt;
    for (const c of this.clouds) { c.x += c.sp * dt; if (c.x > this.W + c.w) c.x = -c.w; }

    // slow motion easing
    if (this.slowT > 0) { this.slowT -= dt; this.timeScale = lerp(this.timeScale, 0.35, dt * 12); }
    else this.timeScale = lerp(this.timeScale, 1, dt * 5);

    const sdt = dt * this.timeScale;

    if (this.state === State.MENU) {
      // idle attract mode: a few cars cruising
      this.worldPhase += dt * 0.7;
      if (this.cars.length < 2 && chance(dt * 0.9)) {
        const spec = rollCarSpec();
        const car = new Car(spec, { lane: randInt(-1, 1), t: 0, duration: rand(5, 7) });
        this.cars.push(car);
      }
      for (const c of this.cars) c.update(sdt, this.road, this);
      this.cars = this.cars.filter((c) => !c.done);
      this.updateParts(sdt);
      return;
    }

    if (this.state === State.OVER) {
      // let the wreckage keep smouldering behind the summary card
      for (const c of this.cars) c.update(sdt * 0.5, this.road, this);
      this.cars = this.cars.filter((c) => !c.done);
      this.updateStones(sdt * 0.5, dt);
      this.updateParts(sdt * 0.5);
      this.flash = Math.max(0, this.flash - dt * 2.6);
      return;
    }
    if (this.state !== State.PLAY) {
      this.updateParts(sdt * 0.4);
      return;
    }

    this.worldPhase += sdt * 1.15;
    this.time -= sdt;
    this.hintT -= sdt;
    this.policeTimer -= sdt;

    // heat
    if (this.overheat > 0) {
      this.overheat -= sdt;
      this.heat = Math.max(0, this.heat - sdt * 45);
      if (this.overheat <= 0) {
        this.cooled = true;
        SFX.cooled();
        UI.toast('دستت خنک شد ✋');
      }
    } else {
      this.heat = Math.max(0, this.heat - sdt * 34);
    }
    this.cooldown = Math.max(0, this.cooldown - sdt);

    // streak decay
    if (this.streakTimer > 0) {
      this.streakTimer -= sdt;
      if (this.streakTimer <= 0 && this.streak > 0) {
        this.streak = 0; this.mult = 1;
        UI.setCombo(1, 0);
      }
    }

    // spawn
    this.spawnTimer -= sdt;
    if (this.spawnTimer <= 0) {
      this.spawnCar();
      const base = Math.max(0.72, 2.25 - this.level * 0.17);
      this.spawnTimer = base * rand(0.75, 1.3);
    }

    // cars
    for (const c of this.cars) c.update(sdt, this.road, this);
    // trail glow under cars handled at draw
    this.cars = this.cars.filter((c) => {
      if (c.done) {
        if (c.spec.police) SFX.stopSiren();
        if (c.state === 'drive' && c.t > 1.05) this.carEscaped(c);
        return false;
      }
      return true;
    });

    this.updateStones(sdt, dt);
    this.updateParts(sdt);
    this.updateAim();

    // fx decay
    this.flash = Math.max(0, this.flash - dt * 2.6);
    this.shake = Math.max(0, this.shake - dt * 9);
    const sk = this.shake * this.shake;
    this.shakeX = rand(-1, 1) * sk * 13;
    this.shakeY = rand(-1, 1) * sk * 13;
    this.hand.recoil = Math.max(0, this.hand.recoil - dt * 5);
    this.hand.glow = Math.max(0, this.hand.glow - dt * 3);

    if (this.time <= 0) { this.time = 0; this.gameOver(); }
  }

  updateAim() {
    const p = this.pointer;
    this.aim.x = p.x; this.aim.y = p.y;
    this.aim.overCar = null; this.aim.overPane = false;
    const hit = this.pickCar(p.x, p.y);
    if (hit) {
      this.aim.overCar = hit.car;
      this.aim.overPane = !!hit.pane;
    }
    const dx = p.x - this.hand.x, dy = p.y - this.hand.y;
    this.hand.angle = Math.atan2(dy, dx);
  }

  /* pick topmost (nearest) car under a screen point */
  pickCar(px, py) {
    const sorted = this.cars.slice().sort((a, b) => a.t - b.t);
    for (let i = sorted.length - 1; i >= 0; i--) {
      const c = sorted[i];
      if (c.t < 0.02 || c.state !== 'drive') continue;
      const pane = c.paneTest(px, py, this.road);
      if (pane) return { car: c, pane: pane.pane, lx: pane.lx, ly: pane.ly };
      const body = c.bodyTest(px, py, this.road);
      if (body) return { car: c, pane: null, lx: body.lx, ly: body.ly };
    }
    return null;
  }

  /* ---------------- throwing ---------------- */
  throwAt(x, y) {
    if (this.state !== State.PLAY) return;
    if (this.cooldown > 0 || this.overheat > 0) return;

    const hx = this.hand.x + Math.cos(this.hand.angle) * 26;
    const hy = this.hand.y + Math.sin(this.hand.angle) * 26;
    const dist = Math.hypot(x - hx, y - hy);
    const dur = clamp(0.20 + dist / 4200, 0.20, 0.36);

    // soft lock: the stone homes to the pane the player aimed at
    const aimed = this.pickCar(x, y);
    let target = null;
    if (aimed) {
      target = { car: aimed.car, pane: aimed.pane, lx: aimed.lx, ly: aimed.ly, lockT: 0 };
    }

    this.stones.push({
      x0: hx, y0: hy, x1: x, y1: y,
      t: 0, dur,
      arc: clamp(dist * 0.13, 22, 120),
      spin: rand(-9, 9),
      rot: rand(0, TAU),
      trail: 0,
      target
    });

    this.cooldown = 0.105;
    this.heat += 13;
    this.hand.recoil = 1;
    this.hand.glow = 1;
    this.throwCount++;
    SFX.throwStone();
    this.spawnMuzzle(hx, hy);
    if (this.heat >= 100) {
      this.heat = 100;
      this.overheat = 1.5;
      this.cooled = false;
      SFX.overheat();
      UI.toast('دستت داغ شد! یه لحظه صبر کن 🔥');
      this.addText(this.hand.x + 40, this.hand.y - 150, 'داغ شد!', '#ff8a3d', 20);
    }
  }

  updateStones(dt, realDt) {
    for (let i = this.stones.length - 1; i >= 0; i--) {
      const s = this.stones[i];
      s.t += dt / s.dur;
      s.rot += s.spin * dt;

      // homing: track the aimed car so the hit lands where the player clicked
      const tg = s.target;
      if (tg && tg.car.state === 'drive' && tg.car.t < 1.06) {
        const pane = (tg.pane && !tg.pane.broken) ? tg.pane
          : (tg.car.panes.find((p) => p.id === tg.pane?.id && !p.broken) || tg.car.panes.find((p) => !p.broken));
        if (pane) {
          tg.pane = pane;
          const pt = tg.car.localToScreen(pane.x, (pane.top + pane.bot) / 2, this.road);
          const k = clamp(dt * 14, 0, 1);
          s.x1 = lerp(s.x1, pt.x, k);
          s.y1 = lerp(s.y1, pt.y, k);
        } else {
          const pt = tg.car.localToScreen(clamp(tg.lx, -0.4, 0.4), clamp(tg.ly, -0.8, -0.08), this.road);
          s.x1 = lerp(s.x1, pt.x, dt * 10);
          s.y1 = lerp(s.y1, pt.y, dt * 10);
        }
      }
      if (s.t >= 1) { this.impact(s); this.stones.splice(i, 1); continue; }
      const pos = this.stonePos(s);
      // ember trail
      s.trail -= dt;
      if (s.trail <= 0) {
        s.trail = 0.012;
        this.spawnEmber(pos.x, pos.y, pos.k, s);
      }
      if (chance(realDt * 40)) this.spawnEmber(pos.x + rand(-3, 3), pos.y + rand(-3, 3), pos.k * 0.7, s);
    }
  }

  stonePos(s) {
    const t = s.t;
    const e = t; // travel
    const x = lerp(s.x0, s.x1, e);
    const y = lerp(s.y0, s.y1, e) - Math.sin(t * Math.PI) * s.arc;
    const k = clamp(1 - t * 0.72, 0.28, 1);
    return { x, y, k };
  }

  /* ---------------- impact resolution ---------------- */
  impact(s) {
    const tg = s.target;
    if (tg && tg.car.state === 'drive' && tg.car.t < 1.06) {
      const car = tg.car;
      const pane = (tg.pane && !tg.pane.broken) ? tg.pane
        : (car.panes.find((p) => p.id === tg.pane?.id && !p.broken) || car.panes.find((p) => !p.broken));
      if (pane) {
        const pt = car.localToScreen(pane.x, (pane.top + pane.bot) / 2, this.road);
        this.shatterPane(car, pane, pt.x, pt.y);
        return;
      }
      const bpt = car.localToScreen(clamp(tg.lx, -0.45, 0.45), clamp(tg.ly, -0.75, -0.06), this.road);
      this.hitBody(car, bpt.x, bpt.y, tg.lx, tg.ly);
      return;
    }
    const hit = this.pickCar(s.x1, s.y1);
    if (!hit) {
      this.spawnDust(s.x1, s.y1);
      this.breakStreak();
      return;
    }
    if (hit.pane) this.shatterPane(hit.car, hit.pane, s.x1, s.y1);
    else this.hitBody(hit.car, s.x1, s.y1, hit.lx, hit.ly);
  }

  shatterPane(car, pane, x, y) {
    pane.broken = true;
    car.hp--;
    car.flash = 1;
    car.hitTint = 1;
    this.shatters++;
    this.hitCount++;

    const f = car.frame(this.road);
    const scale = f.scale;

    this.spawnGlass(x, y, scale, car.spec.glassTint, pane.main ? 26 : 14);
    this.spawnFire(x, y, scale, 0.7);
    SFX.glass();
    this.addShake(0.34);
    this.flash = Math.max(this.flash, 0.18);

    this.addStreak();
    const pts = Math.round(car.pointValue * this.mult * 0.6);
    this.addScore(pts);
    this.addText(x, y - 12, '+' + faNum(pts), '#ffe6a0', 16 + scale * 0.03);
    SFX.combo(this.streak);

    if (car.allGlassBroken() || car.hp <= 0) {
      this.wreckCar(car, x, y);
    } else {
      car.engineStutter = 0.35;
      // crack the remaining glass visually already handled
    }
  }

  hitBody(car, x, y, lx, ly) {
    car.flash = 0.6;
    car.hitTint = 1;
    car.dents.push({
      x: clamp(lx != null ? lx : rand(-0.4, 0.4), -0.42, 0.42),
      y: clamp(ly != null ? ly : rand(-0.6, -0.2), -0.7, -0.12),
      r: rand(0, Math.PI)
    });
    if (car.dents.length > 8) car.dents.shift();
    const f = car.frame(this.road);
    this.spawnSparks(x, y, f.scale, 16);
    SFX.thud();
    this.addShake(0.14);
    this.breakStreak();
    this.addText(x, y - 10, 'بدنه!', '#9fb0c4', 13 + f.scale * 0.02);
    // small consolation
    this.addScore(Math.round(6 + car.pointValue * 0.03));
  }

  wreckCar(car, x, y) {
    if (car.state !== 'drive') return;
    car.state = 'wreck';
    car.deadT = 0;
    car.rotVel = rand(0.5, 1.5) * (chance(0.5) ? 1 : -1);
    car.spinDir = chance(0.5) ? 1 : -1;
    car.latVel = Math.sign(car.lateral || (chance(0.5) ? 1 : -1)) * rand(0.28, 0.55) + (chance(0.5) ? 0.1 : -0.1);
    car.smokeTimer = 0;
    car.speedMul = 1;
    car.lightsBroken = true;
    if (car.t > 0.86) { car.duration *= 1 + (car.t - 0.86) * 7; car.t = Math.min(car.t, 0.9); }

    this.wrecks++;
    this.levelWrecks++;
    this.addStreak();

    const f = car.frame(this.road);
    const pts = Math.round(car.pointValue * 2 * this.mult);
    this.addScore(pts);
    this.addTime(0.9);

    this.spawnExplosion(x, y, f.scale);
    this.spawnGlass(x, y, f.scale, car.spec.glassTint, 22);
    SFX.wreck();
    this.addShake(1);
    this.flash = Math.max(this.flash, 0.55);
    this.slowT = 0.22;

    const cn = car.armored ? car.spec.name + ' زره‌پوش' : car.spec.name;
    this.addText(x, y - 26, '+' + faNum(pts), '#ffd56a', 22 + Math.min(f.scale * 0.05, 14));
    this.addText(x, y + 8, cn + ' از کار افتاد!', '#ff9c6b', 13 + Math.min(f.scale * 0.02, 6), 1.5);
    this.rings.push({ x, y, r: 0, max: 16 + f.scale * 0.42, life: 0.45, maxLife: 0.45, color: '255,190,110' });

    if (car.spec.police) SFX.stopSiren();

    if (this.levelWrecks >= this.levelTarget) this.levelUp();
  }

  levelUp() {
    this.level++;
    this.levelWrecks = 0;
    this.levelTarget = 4 + this.level * 2;
    this.addTime(11);
    this.score += 200 * this.level;
    SFX.levelUp();
    UI.banner(`مرحله ${faNum(this.level)}`);
    UI.toast('+۱۱ ثانیه و پاداش مرحله');
    this.flash = Math.max(this.flash, 0.22);
    for (let i = 0; i < 5; i++) {
      this.rings.push({
        x: rand(0.2, 0.8) * this.W, y: rand(0.3, 0.6) * this.H,
        r: 0, max: rand(60, 180), life: 1.1, maxLife: 1.1, color: '150,210,255'
      });
    }
  }

  addStreak() {
    this.streak++;
    this.streakTimer = 3.2;
    if (this.streak > this.bestStreak) this.bestStreak = this.streak;
    this.mult = clamp(1 + Math.floor(this.streak / 2) * 0.5, 1, 5);
    UI.setCombo(this.mult, this.streak);
    if (this.streak > 0 && this.streak % 4 === 0) {
      this.addTime(1.2);
      this.addText(this.W / 2, this.H * 0.62, 'زنجیره ' + faNum(this.streak) + ' — +زمان', '#8ef1c3', 16);
    }
  }

  breakStreak() {
    if (this.streak > 1) UI.toast('زنجیره شکست ×' + faNum(this.mult));
    this.streak = 0;
    this.mult = 1;
    UI.setCombo(1, 0);
  }

  addScore(n) { this.score += n; }
  addTime(s) { this.time = Math.min(this.time + s, this.maxTime + 30); }

  /* ---------------- particles ---------------- */
  addShake(v) { this.shake = Math.min(1.4, this.shake + v); }

  push(p) {
    if (this.parts.length > 520) this.parts.splice(0, 40);
    p.life = p.maxLife;
    this.parts.push(p);
  }

  spawnMuzzle(x, y) {
    for (let i = 0; i < 8; i++) {
      const a = rand(-2.6, -0.5);
      const sp = rand(30, 120);
      this.push({ type: 'ember', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, size: rand(1, 3), maxLife: rand(0.2, 0.5), color: '255,170,70', grav: 120 });
    }
  }

  spawnEmber(x, y, k, s) {
    this.push({
      type: 'ember', x, y,
      vx: rand(-22, 22), vy: rand(-30, 10),
      size: rand(1, 2.6) * k * 1.4,
      maxLife: rand(0.16, 0.42),
      color: chance(0.4) ? '255,240,180' : '255,150,50',
      grav: -20
    });
  }

  spawnGlass(x, y, scale, tint, n) {
    const k = clamp(scale / 320, 0.35, 1.6);
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU);
      const sp = rand(40, 320) * k;
      this.push({
        type: 'shard',
        x, y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - rand(30, 140),
        size: rand(1.6, 5.2) * k,
        rot: rand(0, TAU), vr: rand(-14, 14),
        maxLife: rand(0.45, 1.1),
        color: chance(0.34) ? '255,240,240' : chance(0.5) ? '190,235,255' : '140,200,255',
        grav: 700
      });
    }
    // glass dust
    for (let i = 0; i < n / 3; i++) {
      this.push({
        type: 'spark', x: x + rand(-8, 8) * k, y: y + rand(-8, 8) * k,
        vx: rand(-50, 50), vy: rand(-60, 20), size: rand(0.8, 2) * k,
        maxLife: rand(0.3, 0.7), color: '220,245,255', grav: 60
      });
    }
  }

  spawnSparks(x, y, scale, n) {
    const k = clamp(scale / 320, 0.35, 1.5);
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU);
      const sp = rand(90, 420) * k;
      this.push({
        type: 'spark', x, y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        size: rand(1, 2.8) * k,
        maxLife: rand(0.18, 0.5),
        color: chance(0.5) ? '255,230,160' : '255,160,60',
        grav: 320
      });
    }
    this.rings.push({ x, y, r: 0, max: 16 + scale * 0.09, life: 0.22, maxLife: 0.22, color: '255,220,170' });
  }

  spawnFire(x, y, scale, power = 1) {
    const k = clamp(scale / 320, 0.3, 1.6);
    for (let i = 0; i < 14 * power; i++) {
      this.push({
        type: 'fire', x: x + rand(-10, 10) * k, y: y + rand(-8, 8) * k,
        vx: rand(-60, 60) * k, vy: rand(-130, -20) * k,
        size: rand(4, 13) * k,
        maxLife: rand(0.25, 0.6),
        color: chance(0.4) ? '255,240,170' : chance(0.5) ? '255,160,50' : '255,90,30',
        grav: -60
      });
    }
  }

  spawnExplosion(x, y, scale) {
    const k = clamp(scale / 320, 0.3, 1.8);
    for (let i = 0; i < 44; i++) {
      const a = rand(0, TAU);
      const sp = rand(40, 380) * k;
      this.push({
        type: 'fire', x, y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - rand(0, 60),
        size: rand(3, 11) * k,
        maxLife: rand(0.35, 0.95),
        color: chance(0.35) ? '255,245,200' : chance(0.5) ? '255,170,60' : '255,90,25',
        grav: -80
      });
    }
    for (let i = 0; i < 16; i++) {
      this.push({
        type: 'smoke', x: x + rand(-20, 20) * k, y: y + rand(-16, 16) * k,
        vx: rand(-60, 60) * k, vy: rand(-70, 10) * k,
        size: rand(8, 22) * k, grow: rand(12, 30) * k,
        maxLife: rand(0.8, 1.7), color: '96,90,108', grav: -30
      });
    }
    for (let i = 0; i < 18; i++) {
      const a = rand(0, TAU);
      const sp = rand(120, 460) * k;
      this.push({
        type: 'debris', x, y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - rand(60, 180),
        size: rand(2, 6) * k, rot: rand(0, TAU), vr: rand(-12, 12),
        maxLife: rand(0.6, 1.3), color: '30,34,42', grav: 760
      });
    }
    this.rings.push({ x, y, r: 0, max: 40 + scale * 0.30, life: 0.42, maxLife: 0.42, color: '255,190,120' });
  }

  smoke(x, y, size, withFire) {
    this.push({
      type: 'smoke', x: x + rand(-6, 6), y,
      vx: rand(-16, 16), vy: rand(-60, -20),
      size: size * rand(0.7, 1.2), grow: size * 1.4,
      maxLife: rand(0.6, 1.2), color: '84,78,96', grav: -34
    });
    if (withFire && chance(0.6)) {
      this.push({
        type: 'fire', x: x + rand(-5, 5), y,
        vx: rand(-20, 20), vy: rand(-70, -20),
        size: size * rand(0.35, 0.8), maxLife: rand(0.2, 0.45),
        color: chance(0.5) ? '255,180,70' : '255,110,40', grav: -80
      });
    }
  }

  spawnDust(x, y) {
    for (let i = 0; i < 9; i++) {
      this.push({
        type: 'smoke', x, y,
        vx: rand(-40, 40), vy: rand(-50, 0),
        size: rand(5, 13), grow: rand(8, 20),
        maxLife: rand(0.3, 0.6), color: '90,84,100', grav: 20
      });
    }
  }

  addText(x, y, txt, color, size, life = 1) {
    this.texts.push({ x, y, txt, color, size, life, maxLife: life, vy: -34 });
    if (this.texts.length > 26) this.texts.shift();
  }

  carEscaped(car) {
    this.addTime(-1.6);
    this.breakStreak();
    UI.toast('یه ' + car.spec.short + ' در رفت! −۱.۶ ثانیه');
    this.addText(this.W / 2, this.H * 0.72, '−۱.۶', '#ff6b6b', 18);
    this.flash = Math.max(this.flash, 0.12);
    SFX.chirp();
  }

  updateParts(dt) {
    const parts = this.parts;
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.life -= dt;
      if (p.life <= 0) { parts.splice(i, 1); continue; }
      p.vy += (p.grav || 0) * dt;
      p.vx *= 1 - dt * 1.1;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.vr) p.rot += p.vr * dt;
      if (p.grow) p.size += p.grow * dt;
    }
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const t = this.texts[i];
      t.life -= dt;
      t.y += t.vy * dt;
      t.vy *= 1 - dt * 2.4;
      if (t.life <= 0) this.texts.splice(i, 1);
    }
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i];
      r.life -= dt;
      const k = 1 - r.life / r.maxLife;
      r.r = r.max * easeOutCubic(clamp(k, 0, 1));
      if (r.life <= 0) this.rings.splice(i, 1);
    }
  }

  /* ---------------- drawing ---------------- */
  draw(now) {
    const ctx = this.ctx;
    const { W, H } = this;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    ctx.save();
    if (this.shake > 0) ctx.translate(this.shakeX, this.shakeY);

    this.drawSky(ctx, now);
    this.drawRoad(ctx, now);
    this.drawRoadside(ctx, now);
    this.drawDepthHaze(ctx);

    // cars sorted far -> near
    const order = this.cars.slice().sort((a, b) => a.t - b.t);
    for (const c of order) {
      this.drawCarGlow(ctx, c);
      c.draw(ctx, this.road);
    }

    this.drawRings(ctx);
    this.drawParticles(ctx);
    this.drawStones(ctx);
    this.drawTexts(ctx);

    if (this.state === State.PLAY || this.state === State.PAUSE) {
      this.drawVignette(ctx);
      this.drawHand(ctx, now);
      this.drawReticle(ctx, now);
    } else if (this.state === State.OVER) {
      this.drawVignette(ctx);
    }

    if (this.flash > 0.001) {
      ctx.fillStyle = `rgba(255,225,190,${this.flash * 0.38})`;
      ctx.fillRect(0, 0, W, H);
    }
    ctx.restore();
  }

  drawSky(ctx, now) {
    if (this.skyCanvas) {
      ctx.drawImage(this.skyCanvas, 0, 0, this.W, this.H);
      // drifting clouds over the baked layer
      for (const c of this.clouds) {
        const cg = ctx.createLinearGradient(c.x, c.y, c.x, c.y + c.h);
        cg.addColorStop(0, `rgba(160,140,220,${c.a})`);
        cg.addColorStop(1, 'rgba(120,100,180,0)');
        ctx.fillStyle = cg;
        ctx.beginPath();
        ctx.ellipse(c.x + c.w / 2, c.y + c.h / 2, c.w / 2, c.h / 2, 0, 0, TAU);
        ctx.fill();
      }
      return;
    }
    this.paintSky(ctx, now);
  }

  paintSky(ctx, now) {
    const { W, H } = this;
    const R = this.road;
    // base night gradient
    let g = ctx.createLinearGradient(0, 0, 0, R.horizon * 1.25);
    g.addColorStop(0, '#05030c');
    g.addColorStop(0.42, '#0b0820');
    g.addColorStop(0.72, '#1a1035');
    g.addColorStop(1, '#3a1d3f');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, R.horizon * 1.3);

    // stars
    for (const s of this.stars) {
      const tw = 0.72 + 0.28 * Math.sin(now * 0.001 * s.tw + s.ph);
      ctx.globalAlpha = s.a * tw;
      ctx.fillStyle = '#eaf2ff';
      ctx.fillRect(s.x, s.y, s.r, s.r);
    }
    ctx.globalAlpha = 1;

    // moon
    const mx = W * 0.76, my = R.horizon * 0.30;
    const mr = Math.min(W, H) * 0.042;
    let mg = ctx.createRadialGradient(mx, my, mr * 0.4, mx, my, mr * 4.6);
    mg.addColorStop(0, 'rgba(190,215,255,.20)');
    mg.addColorStop(0.4, 'rgba(140,170,255,.10)');
    mg.addColorStop(1, 'rgba(120,150,255,0)');
    ctx.fillStyle = mg;
    ctx.fillRect(mx - mr * 5, my - mr * 5, mr * 10, mr * 10);
    const md = ctx.createRadialGradient(mx - mr * 0.3, my - mr * 0.3, mr * 0.1, mx, my, mr);
    md.addColorStop(0, '#f6f8ff');
    md.addColorStop(0.6, '#e8eeff');
    md.addColorStop(1, '#9fb0d8');
    ctx.fillStyle = md;
    ctx.beginPath(); ctx.arc(mx, my, mr, 0, TAU); ctx.fill();
    // craters
    ctx.fillStyle = 'rgba(150,165,210,.14)';
    ctx.beginPath(); ctx.arc(mx - mr * 0.28, my - mr * 0.2, mr * 0.22, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(mx + mr * 0.3, my + mr * 0.32, mr * 0.16, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(mx + mr * 0.1, my - mr * 0.5, mr * 0.1, 0, TAU); ctx.fill();

    // skyline
    for (const b of this.buildings) {
      const y = R.horizon - b.h;
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x, y, b.w, b.h);
      // windows
      const cols = Math.max(2, Math.floor(b.w / 13));
      const rows = Math.max(2, Math.floor(b.h / 15));
      for (let cx2 = 0; cx2 < cols; cx2++) {
        for (let ry = 0; ry < rows; ry++) {
          const hsh = hash(b.seed + cx2 * 7.7 + ry * 31.3);
          if (hsh > 1 - b.win) {
            const flick = hash(b.seed + cx2 + ry + Math.floor(now / 900)) > 0.985 ? 0.2 : 1;
            ctx.fillStyle = hsh > 0.86
              ? `rgba(255,210,130,${0.34 * flick})`
              : `rgba(150,200,255,${0.20 * flick})`;
            ctx.fillRect(b.x + 4 + cx2 * (b.w / cols), y + 5 + ry * (b.h / rows), 3.4, 4.6);
          }
        }
      }
      if (b.antenna) {
        ctx.strokeStyle = 'rgba(120,110,160,.45)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(b.x + b.w * 0.5, y);
        ctx.lineTo(b.x + b.w * 0.5, y - b.h * 0.22);
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,90,90,.8)';
        ctx.beginPath();
        ctx.arc(b.x + b.w * 0.5, y - b.h * 0.22, 1.6, 0, TAU);
        ctx.fill();
      }
    }

    // horizon haze + light pollution
    const hg = ctx.createLinearGradient(0, R.horizon - H * 0.12, 0, R.horizon + 4);
    hg.addColorStop(0, 'rgba(255,120,60,0)');
    hg.addColorStop(0.6, 'rgba(255,130,70,.12)');
    hg.addColorStop(1, 'rgba(255,160,90,.24)');
    ctx.fillStyle = hg;
    ctx.fillRect(0, R.horizon - H * 0.12, W, H * 0.12 + 4);
  }

  drawRoad(ctx, now) {
    const { W, H } = this;
    const R = this.road;

    // ground beyond road
    let gg = ctx.createLinearGradient(0, R.horizon, 0, H);
    gg.addColorStop(0, '#120c1e');
    gg.addColorStop(0.35, '#0c0913');
    gg.addColorStop(1, '#070509');
    ctx.fillStyle = gg;
    ctx.fillRect(0, R.horizon, W, H - R.horizon);

    const topHalf = W * 0.012;
    const botHalf = R.halfBottom;

    // asphalt
    ctx.beginPath();
    ctx.moveTo(R.cx - topHalf, R.horizon);
    ctx.lineTo(R.cx + topHalf, R.horizon);
    ctx.lineTo(R.cx + botHalf, R.bottom);
    ctx.lineTo(R.cx - botHalf, R.bottom);
    ctx.closePath();
    const ag = ctx.createLinearGradient(0, R.horizon, 0, R.bottom);
    ag.addColorStop(0, '#221f2c');
    ag.addColorStop(0.12, '#161520');
    ag.addColorStop(0.5, '#14131c');
    ag.addColorStop(1, '#191722');
    ctx.fillStyle = ag;
    ctx.fill();

    ctx.save();
    ctx.clip();

    // asphalt texture streaks
    ctx.globalAlpha = 0.25;
    for (let i = 0; i < 14; i++) {
      const p = hash(i * 3.1 + 1);
      const y0 = R.horizon + (R.bottom - R.horizon) * Math.pow((i / 14 + this.worldPhase * 0.06) % 1, 2.1);
      const k = (y0 - R.horizon) / (R.bottom - R.horizon);
      const wdt = lerp(topHalf, botHalf, k) * 2;
      ctx.fillStyle = p > 0.5 ? 'rgba(255,255,255,.02)' : 'rgba(0,0,0,.25)';
      ctx.fillRect(R.cx - wdt / 2 + p * wdt, y0, wdt * 0.35, Math.max(1, k * 5));
    }
    ctx.globalAlpha = 1;

    // lane dashes (animated), two dividers
    for (const lane of [-1, 1]) {
      const N = 16;
      for (let i = 0; i < N; i++) {
        const fr = (i / N + this.worldPhase * 0.55) % 1;
        const k = Math.pow(fr, 2.3);
        const y = R.horizon + (R.bottom - R.horizon) * k;
        const half = lerp(topHalf, botHalf, k);
        const x = R.cx + lane * (half / 3);
        const len = lerp(1.5, 34, k);
        const wid = lerp(0.8, 8, k);
        ctx.fillStyle = `rgba(226,232,248,${lerp(0.05, 0.5, k)})`;
        ctx.fillRect(x - wid / 2, y, wid, len);
      }
    }

    // solid edge lines
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(R.cx + side * topHalf * 0.92, R.horizon);
      ctx.lineTo(R.cx + side * botHalf * 0.965, R.bottom);
      ctx.lineTo(R.cx + side * botHalf * 0.94, R.bottom);
      ctx.lineTo(R.cx + side * topHalf * 0.8, R.horizon);
      ctx.closePath();
      ctx.fillStyle = 'rgba(255,255,255,.30)';
      ctx.fill();
    }

    // curb lights flowing
    for (let i = 0; i < 14; i++) {
      const fr = (i / 14 + this.worldPhase * 0.55) % 1;
      const k = Math.pow(fr, 2.3);
      const y = R.horizon + (R.bottom - R.horizon) * k;
      const half = lerp(topHalf, botHalf, k);
      const a = lerp(0.05, 0.5, k);
      for (const side of [-1, 1]) {
        ctx.fillStyle = side < 0 ? `rgba(120,220,255,${a})` : `rgba(255,150,80,${a})`;
        ctx.beginPath();
        ctx.arc(R.cx + side * half * 0.99, y, lerp(1, 4.5, k), 0, TAU);
        ctx.fill();
      }
    }

    // warm reflection pool under horizon (city glow on asphalt)
    const rg = ctx.createRadialGradient(R.cx, R.horizon, 0, R.cx, R.horizon, W * 0.5);
    rg.addColorStop(0, 'rgba(255,140,70,.16)');
    rg.addColorStop(0.5, 'rgba(150,90,200,.06)');
    rg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = rg;
    ctx.fillRect(0, R.horizon, W, H - R.horizon);

    ctx.restore();
  }

  drawDepthHaze(ctx) {
    // atmospheric haze so distant cars dissolve toward the horizon
    const R = this.road;
    const h = this.H;
    const g = ctx.createLinearGradient(0, R.horizon - h * 0.02, 0, R.horizon + h * 0.30);
    g.addColorStop(0, 'rgba(38,26,54,.55)');
    g.addColorStop(0.35, 'rgba(30,20,44,.18)');
    g.addColorStop(1, 'rgba(20,14,30,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, R.horizon - h * 0.02, this.W, h * 0.32);
  }

  drawRoadside(ctx, now) {
    const R = this.road;
    const topHalf = this.W * 0.012;
    for (let i = 0; i < 9; i++) {
      const fr = (i / 9 + this.worldPhase * 0.55) % 1;
      const k = Math.pow(fr, 2.25);
      const y = R.horizon + (R.bottom - R.horizon) * k;
      const half = lerp(topHalf, R.halfBottom, k);
      for (const side of [-1, 1]) {
        const x = R.cx + side * half * 1.16;
        const hgt = lerp(6, 200, k);
        // pole
        ctx.strokeStyle = `rgba(90,86,110,${lerp(0.25, 0.75, k)})`;
        ctx.lineWidth = lerp(0.5, 5, k);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + side * hgt * 0.06, y - hgt);
        ctx.stroke();
        // arm
        ctx.beginPath();
        ctx.moveTo(x + side * hgt * 0.06, y - hgt);
        ctx.lineTo(x - side * hgt * 0.10, y - hgt * 0.97);
        ctx.stroke();
        // lamp glow (cached sprite)
        const lx = x - side * hgt * 0.10;
        const ly = y - hgt * 0.95;
        const lr = lerp(2, 54, k);
        ctx.globalCompositeOperation = 'lighter';
        glowAt(ctx, lx, ly, lr, '255,190,120', lerp(0.18, 0.75, k));
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = `rgba(255,248,225,${lerp(0.3, 0.95, k)})`;
        ctx.beginPath(); ctx.arc(lx, ly, lerp(0.7, 5, k), 0, TAU); ctx.fill();
      }
    }
  }

  drawCarGlow(ctx, car) {
    const f = car.frame(this.road);
    if (f.p < 0.05) return;
    // road reflection of tail lights
    const k = f.p;
    const w = f.scale * (car.state === 'wreck' ? 0.5 : 0.62);
    const hh = f.scale * lerp(0.04, 0.16, k);
    const y = f.y + 4;
    const col = car.state === 'wreck' ? '255,140,60' : '255,50,60';
    ctx.save();
    ctx.translate(f.x, y);
    ctx.scale(1, Math.max(0.05, hh / (w * 0.6)));
    ctx.globalCompositeOperation = 'lighter';
    glowAt(ctx, 0, 0, w * 0.62, col, 0.5 * k);
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
  }

  drawParticles(ctx) {
    // smoke first (normal blending)
    for (const p of this.parts) {
      if (p.type !== 'smoke') continue;
      const a = clamp(p.life / p.maxLife, 0, 1) * 0.30;
      ctx.fillStyle = `rgba(${p.color},${a})`;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, TAU); ctx.fill();
    }
    // additive stuff
    ctx.globalCompositeOperation = 'lighter';
    for (const p of this.parts) {
      if (p.type === 'smoke') continue;
      const lifeK = clamp(p.life / p.maxLife, 0, 1);
      if (p.type === 'shard') {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = clamp(lifeK * 1.6, 0, 1);
        ctx.fillStyle = `rgba(${p.color},.9)`;
        ctx.beginPath();
        ctx.moveTo(-p.size, -p.size * 0.5);
        ctx.lineTo(p.size, -p.size * 0.2);
        ctx.lineTo(p.size * 0.2, p.size);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      } else if (p.type === 'debris') {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = clamp(lifeK * 1.4, 0, 1);
        ctx.fillStyle = 'rgb(34,38,46)';
        ctx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.66);
        ctx.restore();
      } else {
        const isFire = p.type === 'fire';
        const a = isFire ? clamp(lifeK, 0, 1) * 0.5 : clamp(lifeK * 1.3, 0, 1) * 0.85;
        const rr = Math.max(0.5, p.size * (isFire ? 1.55 : 1.9));
        ctx.globalAlpha = a;
        const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, rr);
        grd.addColorStop(0, `rgba(${p.color},.95)`);
        grd.addColorStop(0.45, `rgba(${p.color},.34)`);
        grd.addColorStop(1, `rgba(${p.color},0)`);
        ctx.fillStyle = grd;
        ctx.beginPath(); ctx.arc(p.x, p.y, rr, 0, TAU); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  drawRings(ctx) {
    ctx.globalCompositeOperation = 'lighter';
    for (const r of this.rings) {
      const k = clamp(r.life / r.maxLife, 0, 1);
      ctx.strokeStyle = `rgba(${r.color},${k * 0.55})`;
      ctx.lineWidth = Math.max(1, 3 * k);
      ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, TAU); ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  drawStones(ctx) {
    for (const s of this.stones) {
      const p = this.stonePos(s);
      const r = lerp(13, 4.5, p.k) * (this.W > 800 ? 1 : 0.75);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      // trail
      for (let i = 1; i <= 7; i++) {
        const tt = Math.max(0, s.t - i * 0.03);
        const q = this.stonePos({ ...s, t: tt });
        const a = (1 - i / 8) * 0.22;
        const rr = r * (1 - i / 10) * 1.5;
        const gg = ctx.createRadialGradient(q.x, q.y, 0, q.x, q.y, rr);
        gg.addColorStop(0, `rgba(255,200,110,${a})`);
        gg.addColorStop(0.45, `rgba(255,110,40,${a * 0.5})`);
        gg.addColorStop(1, 'rgba(255,80,20,0)');
        ctx.fillStyle = gg;
        ctx.beginPath(); ctx.arc(q.x, q.y, rr, 0, TAU); ctx.fill();
      }
      // core glow
      const cg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 2.0);
      cg.addColorStop(0, 'rgba(255,240,190,.8)');
      cg.addColorStop(0.35, 'rgba(255,160,55,.34)');
      cg.addColorStop(1, 'rgba(255,90,20,0)');
      ctx.fillStyle = cg;
      ctx.beginPath(); ctx.arc(p.x, p.y, r * 2.0, 0, TAU); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      // rock
      ctx.translate(p.x, p.y);
      ctx.rotate(s.rot);
      ctx.fillStyle = '#2a2018';
      ctx.beginPath();
      ctx.moveTo(-r * 0.5, -r * 0.35);
      ctx.lineTo(r * 0.42, -r * 0.55);
      ctx.lineTo(r * 0.6, r * 0.2);
      ctx.lineTo(-r * 0.1, r * 0.6);
      ctx.lineTo(-r * 0.55, r * 0.1);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255,205,120,.9)';
      ctx.beginPath();
      ctx.moveTo(-r * 0.5, -r * 0.35);
      ctx.lineTo(r * 0.42, -r * 0.55);
      ctx.lineTo(r * 0.1, -r * 0.1);
      ctx.lineTo(-r * 0.35, r * 0.02);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  drawTexts(ctx) {
    for (const t of this.texts) {
      const k = clamp(t.life / t.maxLife, 0, 1);
      const pop = t.life > t.maxLife - 0.08 ? 1.15 : 1;
      ctx.save();
      ctx.globalAlpha = k;
      ctx.translate(t.x, t.y);
      ctx.scale(pop, pop);
      ctx.font = `900 ${t.size}px Vazirmatn, Tahoma, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = Math.max(2, t.size * 0.18);
      ctx.strokeStyle = 'rgba(10,6,14,.75)';
      ctx.strokeText(t.txt, 0, 0);
      ctx.fillStyle = t.color;
      ctx.fillText(t.txt, 0, 0);
      ctx.restore();
    }
  }

  drawVignette(ctx) {
    const { W, H } = this;
    const g = ctx.createRadialGradient(W / 2, H * 0.55, Math.min(W, H) * 0.25, W / 2, H * 0.55, Math.max(W, H) * 0.78);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(0.65, 'rgba(0,0,0,.22)');
    g.addColorStop(1, 'rgba(0,0,0,.62)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    if (this.overheat > 0) {
      const p = 0.18 + 0.12 * Math.sin(performance.now() / 90);
      const fg = ctx.createRadialGradient(W / 2, H * 0.55, Math.min(W, H) * 0.3, W / 2, H * 0.55, Math.max(W, H) * 0.7);
      fg.addColorStop(0, 'rgba(255,60,20,0)');
      fg.addColorStop(1, `rgba(255,60,20,${p})`);
      ctx.fillStyle = fg;
      ctx.fillRect(0, 0, W, H);
    }
  }

  /* the gloved fist + burning stone in the bottom-left corner */
  drawHand(ctx, now) {
    const h = this.hand;
    const size = Math.min(Math.max(Math.min(this.W, this.H) * 0.155, 92), 175);
    const recoil = easeOutCubic(h.recoil);
    const ang = clamp(h.angle, -Math.PI * 0.94, -Math.PI * 0.06);
    const hx = h.x, hy = h.y;

    ctx.save();
    ctx.translate(hx, hy);
    ctx.rotate(ang);

    // heat haze around the fist
    const gl = ctx.createRadialGradient(size * 0.98, -size * 0.10, 0, size * 0.98, -size * 0.10, size * 1.15);
    gl.addColorStop(0, `rgba(255,150,60,${0.26 + h.glow * 0.18})`);
    gl.addColorStop(0.45, 'rgba(255,110,30,.09)');
    gl.addColorStop(1, 'rgba(255,90,20,0)');
    ctx.fillStyle = gl;
    ctx.beginPath(); ctx.arc(size * 0.98, -size * 0.10, size * 1.15, 0, TAU); ctx.fill();

    // ---- forearm + sleeve, running off-screen ----
    const armG = ctx.createLinearGradient(0, -size * 0.42, 0, size * 0.42);
    armG.addColorStop(0, '#4a3059');
    armG.addColorStop(0.4, '#33203f');
    armG.addColorStop(1, '#150e1d');
    ctx.fillStyle = armG;
    ctx.beginPath();
    ctx.moveTo(-size * 0.9, -size * 0.46);
    ctx.quadraticCurveTo(size * 0.20, -size * 0.44, size * 0.70, -size * 0.30);
    ctx.lineTo(size * 0.70, size * 0.30);
    ctx.quadraticCurveTo(size * 0.20, size * 0.44, -size * 0.9, size * 0.46);
    ctx.closePath();
    ctx.fill();

    // sleeve stitching
    ctx.strokeStyle = 'rgba(255,175,80,.30)';
    ctx.lineWidth = Math.max(1.2, size * 0.016);
    ctx.setLineDash([size * 0.05, size * 0.035]);
    ctx.beginPath();
    ctx.moveTo(-size * 0.4, -size * 0.455);
    ctx.quadraticCurveTo(size * 0.1, -size * 0.45, size * 0.42, -size * 0.36);
    ctx.moveTo(-size * 0.4, size * 0.455);
    ctx.quadraticCurveTo(size * 0.1, size * 0.45, size * 0.42, size * 0.36);
    ctx.stroke();
    ctx.setLineDash([]);

    // cuff
    const cuffG = ctx.createLinearGradient(0, -size * 0.40, 0, size * 0.40);
    cuffG.addColorStop(0, '#2c1c39');
    cuffG.addColorStop(0.5, '#1c1226');
    cuffG.addColorStop(1, '#0f0a15');
    ctx.fillStyle = cuffG;
    roundRect(ctx, size * 0.42, -size * 0.38, size * 0.16, size * 0.76, size * 0.07);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,185,90,.42)';
    roundRect(ctx, size * 0.50, -size * 0.375, size * 0.035, size * 0.75, size * 0.02);
    ctx.fill();

    // ---- fist (leather glove) ----
    const fx = size * 0.80 - recoil * size * 0.16;
    const fw = size * 0.50, fh = size * 0.56;
    const fistG = ctx.createRadialGradient(fx - fw * 0.28, -fh * 0.34, size * 0.02, fx, 0, fw * 1.15);
    fistG.addColorStop(0, '#63456f');
    fistG.addColorStop(0.42, '#3a2547');
    fistG.addColorStop(1, '#17101f');
    ctx.fillStyle = fistG;
    ctx.beginPath();
    ctx.moveTo(fx - fw * 0.50, -fh * 0.46);
    ctx.quadraticCurveTo(fx - fw * 0.02, -fh * 0.62, fx + fw * 0.46, -fh * 0.34);
    ctx.quadraticCurveTo(fx + fw * 0.62, 0, fx + fw * 0.42, fh * 0.36);
    ctx.quadraticCurveTo(fx, fh * 0.60, fx - fw * 0.50, fh * 0.44);
    ctx.quadraticCurveTo(fx - fw * 0.68, 0, fx - fw * 0.50, -fh * 0.46);
    ctx.closePath();
    ctx.fill();

    // knuckle bumps
    for (let i = 0; i < 3; i++) {
      const kx = fx - fw * 0.26 + i * fw * 0.26;
      const ky = -fh * 0.30 - Math.sin(i * 1.1) * fh * 0.03;
      const kg = ctx.createRadialGradient(kx - fw * 0.05, ky - fh * 0.06, 0, kx, ky, fh * 0.20);
      kg.addColorStop(0, 'rgba(120,88,140,.75)');
      kg.addColorStop(1, 'rgba(60,40,75,0)');
      ctx.fillStyle = kg;
      ctx.beginPath();
      ctx.ellipse(kx, ky, fh * 0.185, fh * 0.155, 0, 0, TAU);
      ctx.fill();
    }
    // stitched seams across the glove
    ctx.strokeStyle = 'rgba(255,180,95,.16)';
    ctx.lineWidth = Math.max(1, size * 0.011);
    ctx.beginPath();
    ctx.moveTo(fx - fw * 0.34, -fh * 0.10);
    ctx.quadraticCurveTo(fx - fw * 0.05, -fh * 0.02, fx + fw * 0.30, -fh * 0.12);
    ctx.stroke();

    // thumb wrapping the stone
    ctx.fillStyle = '#2a1a36';
    ctx.beginPath();
    ctx.ellipse(fx + fw * 0.18, fh * 0.10, fw * 0.26, fh * 0.15, -0.35, 0, TAU);
    ctx.fill();

    // warm rim light on the top edge
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const rim = ctx.createLinearGradient(fx - fw * 0.5, -fh * 0.5, fx + fw * 0.4, -fh * 0.1);
    rim.addColorStop(0, 'rgba(255,150,70,0)');
    rim.addColorStop(0.55, 'rgba(255,165,80,.30)');
    rim.addColorStop(1, 'rgba(255,190,110,.06)');
    ctx.strokeStyle = rim;
    ctx.lineWidth = Math.max(2, size * 0.028);
    ctx.beginPath();
    ctx.moveTo(fx - fw * 0.46, -fh * 0.42);
    ctx.quadraticCurveTo(fx, -fh * 0.58, fx + fw * 0.42, -fh * 0.32);
    ctx.stroke();
    ctx.restore();

    // ---- the burning stone ----
    const sx = fx + fw * 0.30;
    const sy = -fh * 0.52;
    const flick = 0.92 + 0.08 * Math.sin(now / 80);
    const r = size * 0.155;

    ctx.globalCompositeOperation = 'lighter';
    const sg = ctx.createRadialGradient(sx, sy, 0, sx, sy, r * 3.0 * flick);
    sg.addColorStop(0, 'rgba(255,250,225,.8)');
    sg.addColorStop(0.15, 'rgba(255,205,95,.5)');
    sg.addColorStop(0.45, 'rgba(255,120,40,.20)');
    sg.addColorStop(1, 'rgba(255,80,20,0)');
    ctx.fillStyle = sg;
    ctx.beginPath(); ctx.arc(sx, sy, r * 3.0 * flick, 0, TAU); ctx.fill();
    // flame tongues
    for (let i = 0; i < 4; i++) {
      const fa = now / 210 + i * 1.9;
      const fl = r * (1.0 + Math.sin(fa) * 0.3);
      const fx2 = sx + Math.cos(fa * 1.4) * r * 0.55;
      const fy2 = sy - r * 0.55 - Math.abs(Math.sin(fa)) * r * 0.95;
      const fg = ctx.createRadialGradient(fx2, fy2, 0, fx2, fy2, fl);
      fg.addColorStop(0, 'rgba(255,215,130,.38)');
      fg.addColorStop(1, 'rgba(255,90,20,0)');
      ctx.fillStyle = fg;
      ctx.beginPath(); ctx.arc(fx2, fy2, fl, 0, TAU); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';

    // rock
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(now / 1200);
    ctx.fillStyle = '#241a12';
    ctx.beginPath();
    ctx.moveTo(-r, -r * 0.55); ctx.lineTo(r * 0.85, -r * 0.9);
    ctx.lineTo(r, r * 0.45); ctx.lineTo(-r * 0.15, r);
    ctx.lineTo(-r * 0.95, r * 0.2);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,178,78,.92)';
    ctx.beginPath();
    ctx.moveTo(-r, -r * 0.55); ctx.lineTo(r * 0.85, -r * 0.9);
    ctx.lineTo(r * 0.15, -r * 0.05); ctx.lineTo(-r * 0.62, r * 0.05);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,100,25,.9)';
    ctx.beginPath();
    ctx.moveTo(-r * 0.6, r * 0.15); ctx.lineTo(r * 0.2, r * 0.0);
    ctx.lineTo(-r * 0.05, r * 0.9);
    ctx.closePath(); ctx.fill();
    ctx.restore();

    ctx.restore();

    // embers spitting off the stone
    if (this.state === State.PLAY && chance(0.55)) {
      const ex2 = hx + Math.cos(ang) * size * 1.12;
      const ey2 = hy + Math.sin(ang) * size * 1.12;
      this.push({
        type: 'ember', x: ex2 + rand(-12, 12), y: ey2 + rand(-12, 12),
        vx: rand(-18, 28), vy: rand(-80, -30), size: rand(0.9, 2.4),
        maxLife: rand(0.35, 0.9), color: '255,150,60', grav: -25
      });
    }
  }

  drawReticle(ctx, now) {
    const a = this.aim;
    if (!a.active && !this.isTouch) return;
    const x = a.x, y = a.y;
    const locked = !!a.overPane;
    const col = locked ? '125,240,255' : a.overCar ? '255,200,110' : '255,255,255';
    const pulse = 0.85 + 0.15 * Math.sin(now / 130);
    const r = locked ? 20 * pulse : 14;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = `rgba(${col},.85)`;
    ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
    // ticks
    for (let i = 0; i < 4; i++) {
      const ang = i * Math.PI / 2 + now / 1400;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(ang) * (r + 3), y + Math.sin(ang) * (r + 3));
      ctx.lineTo(x + Math.cos(ang) * (r + 9), y + Math.sin(ang) * (r + 9));
      ctx.stroke();
    }
    ctx.fillStyle = `rgba(${col},.95)`;
    ctx.beginPath(); ctx.arc(x, y, 1.8, 0, TAU); ctx.fill();
    // corner brackets when locked
    if (locked) {
      const b = r + 12;
      ctx.strokeStyle = `rgba(${col},.7)`;
      for (let i = 0; i < 4; i++) {
        const sx = i < 2 ? -1 : 1, sy = i % 2 ? -1 : 1;
        ctx.beginPath();
        ctx.moveTo(x + sx * b, y + sy * (b - 7));
        ctx.lineTo(x + sx * b, y + sy * b);
        ctx.lineTo(x + sx * (b - 7), y + sy * b);
        ctx.stroke();
      }
    }
    ctx.globalCompositeOperation = 'source-over';

    // target info
    if (a.overCar) {
      const c = a.overCar;
      const label = c.spec.name + (c.armored ? ' • زره‌پوش' : '');
      const val = faNum(c.pointValue) + ' امتیاز';
      const ly = y - (locked ? 44 : 38);
      ctx.font = '700 12px Vazirmatn, Tahoma, sans-serif';
      const w1 = ctx.measureText(label).width;
      ctx.font = '700 11px Vazirmatn, Tahoma, sans-serif';
      const w2 = ctx.measureText(val).width;
      const bw = Math.max(w1, w2) + 20;
      ctx.fillStyle = 'rgba(10,7,18,.85)';
      roundRect(ctx, x - bw / 2, ly - 16, bw, 36, 10);
      ctx.fill();
      ctx.strokeStyle = `rgba(${col},.45)`;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.textAlign = 'center';
      ctx.fillStyle = '#f4ecff';
      ctx.font = '700 12px Vazirmatn, Tahoma, sans-serif';
      ctx.fillText(label, x, ly - 3);
      ctx.fillStyle = locked ? '#7df0ff' : '#ffcb6b';
      ctx.font = '700 11px Vazirmatn, Tahoma, sans-serif';
      ctx.fillText(locked ? 'شیشه! ' + val : 'بدنه • ' + val, x, ly + 12);
    }
    ctx.restore();
  }
}
