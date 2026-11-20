import { sound } from './audio.js';
import { pickLuxuryCarSpec, drawLuxuryCar } from './cars.js';
import { EffectSystem } from './particles.js';

const LANES = [-6.75, -2.25, 2.25, 6.75];
const ROAD_HALF_WIDTH = 9.2;
const GUARDRAIL_X = 9.65;
const GRAVITY = 42;
const STORAGE_KEY = 'sange_atashin_best_v1';

const WAVE_TITLES = [
  'کاروان بنز و بی‌ام‌و در راه است!',
  'هجوم لامبورگینی و جی‌کلاس زرهی!',
  'رولزرویس VIP و فراری در اتوبان!',
  'مسابقه شبانه ابرخودروها!',
  'کاروان میلیاردرهای پرسرعت!',
  'توفان بنز، فراری و لامبورگینی!'
];

export function toPersianDigits(num) {
  const map = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return String(Math.floor(num)).replace(/\d/g, (d) => map[d]);
}

export class LuxuryHighwayGame {
  constructor(canvas, ui) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.ui = ui;

    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);

    // Camera settings (Overpass perspective looking down the 4-lane highway)
    this.camY = 8.4;
    this.camZ = -8.0;
    this.horizonRatio = 0.34;

    this.effects = new EffectSystem();

    // Game state: 'menu' | 'playing' | 'paused' | 'gameover'
    this.state = 'menu';
    this.mode = 'arcade'; // 'arcade' | 'endless'

    this.time = 0;
    this.nextCarId = 1;

    // Entities
    this.cars = [];
    this.rocks = [];
    this.brokenRails = []; // { side: -1|1, z: number, life: number }

    // Gameplay metrics
    this.score = 0;
    this.bestScore = Number(localStorage.getItem(STORAGE_KEY) || 0);
    this.wave = 1;
    this.waveCarsToSpawn = 10;
    this.spawnTimer = 0.8;

    this.shields = 5;
    this.maxShields = 5;

    this.combo = 0;
    this.comboTimer = 0;
    this.maxCombo = 0;
    this.carsDisabled = 0;
    this.windshieldsShattered = 0;
    this.chainReactions = 0;

    // Inferno fever mode
    this.infernoMeter = 0; // 0..100
    this.infernoActive = false;
    this.infernoTimer = 0;

    // Feel & juice
    this.hitstopTimer = 0;
    this.shakeMag = 0;
    this.damageFlash = 0;
    this.launcherRecoil = 0;

    // Pointer / aiming / charging
    this.pointer = {
      x: this.width * 0.5,
      y: this.height * 0.62,
      down: false,
      downTime: 0
    };
    this.throwCooldown = 0;
    this.lockedCarId = null;
    this.lockedZone = null;

    // Pre-generate static twilight stars, mountains, skyline & ambient floating embers
    this.stars = Array.from({ length: 60 }, () => ({
      x: Math.random(),
      y: Math.random() * 0.28,
      r: 0.7 + Math.random() * 1.4,
      twinkle: Math.random() * Math.PI * 2
    }));

    this.ambientEmbers = Array.from({ length: 24 }, () => ({
      x: Math.random(),
      y: 0.35 + Math.random() * 0.65,
      vx: (Math.random() - 0.5) * 0.018,
      vy: -(0.015 + Math.random() * 0.03),
      r: 1.2 + Math.random() * 2.1,
      phase: Math.random() * Math.PI * 2
    }));

    this.mountains = this.buildMountainRidge();
    this.skyline = this.buildSkyline();

    this.seedAmbientTraffic();
    this.resize();
  }

  buildMountainRidge() {
    const pts = [];
    const steps = 28;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const valley = Math.exp(-Math.pow((t - 0.5) / 0.16, 2));
      const peak =
        (0.056 + Math.sin(t * 17) * 0.02 + Math.cos(t * 9.5) * 0.026 + Math.sin(t * 31) * 0.008) *
        (1 - valley * 0.68);
      pts.push({ t, h: Math.max(0.014, peak) });
    }
    return pts;
  }

  buildSkyline() {
    const towers = [];
    for (let i = 0; i < 32; i++) {
      const x = i / 32;
      // Leave center open for the sunset highway vanishing point
      if (Math.abs(x - 0.5) < 0.09) continue;
      const w = 0.014 + Math.random() * 0.02;
      const h = 0.022 + Math.random() * 0.055;
      towers.push({ x, w, h, seed: Math.random() * 100 });
    }
    return towers;
  }

  resize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.floor(this.width * this.dpr);
    this.canvas.height = Math.floor(this.height * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  getFocal() {
    return Math.min(this.height * 0.94, this.width * 0.78);
  }

  project(x, y, z) {
    const dz = Math.max(0.4, z - this.camZ);
    const focal = this.getFocal();
    const scale = focal / dz;
    const horizonY = this.height * this.horizonRatio;
    const sx = this.width * 0.5 + x * scale;
    const sy = horizonY + (this.camY - y) * scale;
    return { sx, sy, scale, dz };
  }

  // Detect if cursor (mx, my) is hovering directly over a driving luxury car's windshield or body
  findCarUnderCursor(mx, my) {
    // Sort closest first so foreground cars take priority
    const driving = this.cars
      .filter((c) => c.state === 'driving' && c.z > 2 && c.z < 105)
      .sort((a, b) => a.z - b.z);

    for (const car of driving) {
      const p = this.project(car.x, car.y, car.z);
      const w = car.spec.width * p.scale;
      const h = car.spec.height * p.scale;
      const padX = Math.max(12, w * 0.16);
      const padY = Math.max(10, h * 0.16);

      if (
        mx >= p.sx - w * 0.52 - padX &&
        mx <= p.sx + w * 0.52 + padX &&
        my >= p.sy - h * 1.06 - padY &&
        my <= p.sy + padY * 0.4
      ) {
        // Upper 58% of silhouette is the windshield zone
        const wsSplitY = p.sy - h * 0.44;
        const zone = my <= wsSplitY ? 'windshield' : 'body';
        return { car, zone };
      }
    }
    return null;
  }

  computeAimSolution(mx, my) {
    // 1. Direct cursor-on-car smart intercept (super crisp feel when clicking directly on a windshield!)
    const direct = this.findCarUnderCursor(mx, my);
    if (direct) {
      const { car, zone } = direct;
      const baseT = Math.max(0.18, Math.min(0.46, 0.15 + car.z * 0.0038));
      const interceptZ = Math.max(2.5, car.z - car.speed * baseT);
      const targetY = zone === 'windshield' ? car.spec.height * 0.72 : car.spec.height * 0.24;
      const desiredX = LANES[car.targetLaneIndex];
      const predX = car.x + (desiredX - car.x) * Math.min(1, baseT * 3.0);
      return {
        tx: predX,
        ty: targetY,
        tz: interceptZ,
        flightTime: baseT,
        lockedCar: car,
        lockedZone: zone
      };
    }

    // 2. Free 3D highway plane aim (supports manual leading & meteor splash shots!)
    const horizonY = this.height * this.horizonRatio;
    const targetY = 1.05;
    const minSy = horizonY + 18;
    const clampedY = Math.max(minSy, Math.min(this.height - 20, my));
    const focal = this.getFocal();
    const scale = (clampedY - horizonY) / (this.camY - targetY);
    const dz = focal / Math.max(0.0001, scale);
    const tz = Math.max(4.5, Math.min(92, dz + this.camZ));
    const tx = Math.max(-13.5, Math.min(13.5, (mx - this.width * 0.5) / scale));
    const flightTime = Math.max(0.18, Math.min(0.52, 0.15 + tz * 0.0041));

    // Check if manual lead lands right on a car's future windshield
    let lockedCar = null;
    let bestDist = Infinity;
    for (const car of this.cars) {
      if (car.state !== 'driving') continue;
      const futureZ = car.z - car.speed * flightTime;
      const dx = Math.abs(car.x - tx);
      const dzErr = Math.abs(futureZ - tz);
      if (dx < car.spec.width * 0.72 && dzErr < 5.5) {
        const d = dx + dzErr * 0.4;
        if (d < bestDist) {
          bestDist = d;
          lockedCar = car;
        }
      }
    }

    return {
      tx,
      ty: targetY,
      tz,
      flightTime,
      lockedCar,
      lockedZone: lockedCar ? 'windshield' : null
    };
  }

  seedAmbientTraffic() {
    this.cars = [];
    for (let i = 0; i < 4; i++) {
      const car = this.createCar(1 + (i % 3), 24 + i * 24);
      this.cars.push(car);
    }
  }

  start(mode = 'arcade') {
    this.mode = mode;
    this.state = 'playing';
    this.cars = [];
    this.rocks = [];
    this.brokenRails = [];
    this.effects.clear();

    this.score = 0;
    this.wave = 1;
    this.shields = this.maxShields;
    this.combo = 0;
    this.comboTimer = 0;
    this.maxCombo = 0;
    this.carsDisabled = 0;
    this.windshieldsShattered = 0;
    this.chainReactions = 0;

    this.infernoMeter = 0;
    this.infernoActive = false;
    this.infernoTimer = 0;
    this.throwCooldown = 0;
    this.damageFlash = 0;
    this.shakeMag = 0;
    this.hitstopTimer = 0;
    this.pointer.down = false;
    this.pointer.downTime = 0;

    this.startWave(1);
    this.ui.syncHUD(this);
    this.ui.showGameplayUI(this);
  }

  startWave(waveNum) {
    this.wave = waveNum;
    this.waveCarsToSpawn = this.mode === 'endless' ? 99999 : 8 + waveNum * 3;
    this.spawnTimer = 0.6;

    if (this.mode === 'arcade') {
      const title = WAVE_TITLES[(waveNum - 1) % WAVE_TITLES.length];
      this.ui.showWaveBanner(`موج ${toPersianDigits(waveNum)}`, title);
      if (waveNum > 1) {
        sound.playWaveComplete();
        if (this.shields < this.maxShields) {
          this.shields += 1;
        }
      }
    } else {
      this.ui.showWaveBanner('حالت آزاد بی‌نهایت', 'هرچقدر دلت می‌خواهد ماشین لوکس بزن!');
    }
    this.ui.syncHUD(this);
  }

  pause() {
    if (this.state !== 'playing') return;
    this.state = 'paused';
    this.pointer.down = false;
    this.ui.showPause(true);
  }

  resume() {
    if (this.state !== 'paused') return;
    this.state = 'playing';
    this.ui.showPause(false);
  }

  goToMenu() {
    this.state = 'menu';
    this.pointer.down = false;
    this.rocks = [];
    this.effects.clear();
    this.seedAmbientTraffic();
    this.ui.showMenu(this.bestScore);
  }

  triggerGameOver() {
    this.state = 'gameover';
    this.pointer.down = false;
    sound.playGameOver();

    let isNewRecord = false;
    if (this.score > this.bestScore) {
      this.bestScore = this.score;
      localStorage.setItem(STORAGE_KEY, String(this.bestScore));
      isNewRecord = true;
    }

    this.ui.showGameOver({
      score: this.score,
      bestScore: this.bestScore,
      isNewRecord,
      carsDisabled: this.carsDisabled,
      windshieldsShattered: this.windshieldsShattered,
      maxCombo: this.maxCombo,
      chainReactions: this.chainReactions,
      wave: this.wave
    });
  }

  // --- INPUT HANDLERS ---
  onPointerMove(x, y) {
    this.pointer.x = x;
    this.pointer.y = y;
  }

  onPointerDown(x, y) {
    this.pointer.x = x;
    this.pointer.y = y;
    if (this.state !== 'playing') return;
    sound.ensureContext();
    this.pointer.down = true;
    this.pointer.downTime = 0;
  }

  onPointerUp(x, y) {
    this.pointer.x = x;
    this.pointer.y = y;
    if (this.state !== 'playing' || !this.pointer.down) return;
    const charge = this.getChargeRatio();
    this.pointer.down = false;
    this.pointer.downTime = 0;
    this.launchFlamingRock(x, y, charge);
  }

  getChargeRatio() {
    if (!this.pointer.down) return 0;
    return Math.max(0, Math.min(1, (this.pointer.downTime - 0.16) / 0.62));
  }

  launchFlamingRock(mx, my, chargeRatio) {
    if (this.throwCooldown > 0) return;

    const aim = this.computeAimSolution(mx, my);
    const isInferno = this.infernoActive;
    const effectiveCharge = isInferno ? Math.max(0.75, chargeRatio) : chargeRatio;
    const isMeteor = effectiveCharge >= 0.6;

    const startX = aim.tx * 0.22;
    const startY = 2.1;
    const startZ = -2.6;
    const T = aim.flightTime;

    const vx = (aim.tx - startX) / T;
    const vz = (aim.tz - startZ) / T;
    const vy = (aim.ty - startY + 0.5 * GRAVITY * T * T) / T;

    this.rocks.push({
      x: startX,
      y: startY,
      z: startZ,
      prevX: startX,
      prevY: startY,
      prevZ: startZ,
      vx,
      vy,
      vz,
      age: 0,
      flightTime: T,
      radius: isMeteor ? 0.72 : 0.46,
      damage: isMeteor ? 2 : 1,
      isMeteor,
      isInferno,
      rot: Math.random() * Math.PI * 2,
      vrot: (Math.random() > 0.5 ? 1 : -1) * (9 + effectiveCharge * 6),
      splashRadius: isMeteor ? 4.0 : 0,
      intendedZone: aim.lockedZone
    });

    this.throwCooldown = isInferno ? 0.13 : 0.21;
    this.launcherRecoil = 1.0;
    sound.playThrow(effectiveCharge);
  }

  // --- CAR SPAWNING ---
  createCar(wave, initialZ = 112) {
    const spec = pickLuxuryCarSpec(wave);
    const palette = spec.colors[Math.floor(Math.random() * spec.colors.length)];

    const laneOrder = [0, 1, 2, 3].sort(() => Math.random() - 0.5);
    let chosenLane = laneOrder[0];
    for (const laneIdx of laneOrder) {
      const lx = LANES[laneIdx];
      const occupied = this.cars.some(
        (c) => c.state === 'driving' && Math.abs(c.x - lx) < 2.5 && Math.abs(c.z - initialZ) < 18
      );
      if (!occupied) {
        chosenLane = laneIdx;
        break;
      }
    }

    const waveSpeedMult = 1 + Math.min(0.65, (wave - 1) * 0.075);

    return {
      id: this.nextCarId++,
      spec,
      palette,
      laneIndex: chosenLane,
      targetLaneIndex: chosenLane,
      x: LANES[chosenLane],
      y: 0,
      z: initialZ,
      speed: spec.speed * waveSpeedMult * (0.94 + Math.random() * 0.12),
      vx: 0,
      vy: 0,
      vz: 0,
      windshieldHp: spec.windshieldHp,
      bodyHp: spec.bodyHp,
      windshieldCracked: false,
      crackOffsetX: 0,
      state: 'driving',
      swerveDir: 0,
      swerveTimer: 0,
      railBroken: false,
      roll: 0,
      rollVel: 0,
      wobble: 0,
      wobbleTimer: 0,
      hitFlash: 0,
      smokeTimer: 0,
      skidPrevX: null,
      skidPrevZ: null,
      laneChangeTimer: 1.5 + Math.random() * 2.5
    };
  }

  // --- DISABLE & SWERVE OFF ROAD ---
  disableCar(car, pushDir, cause = 'windshield') {
    if (car.state !== 'driving') return;
    car.state = 'swerving';
    car.windshieldHp = 0;
    car.windshieldCracked = true;
    car.hitFlash = 0.22;

    let dir = pushDir;
    if (!dir) {
      dir = car.x >= 0 ? 1 : -1;
    }
    car.swerveDir = dir;
    car.vx = dir * (6.6 + Math.random() * 3.8);
    car.vz = -Math.max(10, car.speed * 0.72);
    car.rollVel = -dir * 1.45;
    car.swerveTimer = 0;
    car.skidPrevX = car.x;
    car.skidPrevZ = car.z;

    this.carsDisabled += 1;

    // Combo & Inferno
    this.combo += 1;
    this.comboTimer = 3.2;
    if (this.combo > this.maxCombo) this.maxCombo = this.combo;

    const infernoMult = this.infernoActive ? 2 : 1;
    const comboMult = 1 + Math.min(2.5, (this.combo - 1) * 0.25);
    const causeBonus = cause === 'chain' ? 1.4 : cause === 'windshield' ? 1.2 : 1.0;
    const pts = Math.round(car.spec.score * infernoMult * comboMult * causeBonus);
    this.score += pts;

    if (!this.infernoActive) {
      const gain = cause === 'windshield' ? 22 : cause === 'chain' ? 16 : 12;
      this.infernoMeter = Math.min(100, this.infernoMeter + gain);
      if (this.infernoMeter >= 100) {
        this.activateInferno();
      }
    }

    const p = this.project(car.x, car.spec.height * 0.9, car.z);
    if (cause === 'windshield') {
      this.windshieldsShattered += 1;
      sound.playWindshieldShatter(true, this.combo);
      sound.playTireScreech();
      this.effects.spawnGlassShatter(car.x, car.spec.height * 0.74, car.z, 34);
      this.effects.spawnFireExplosion(car.x, car.spec.height * 0.72, car.z, 1.18);
      this.effects.spawnText(
        p.sx,
        p.sy - 26,
        `شیشه ${car.spec.shortName} شکست! +${toPersianDigits(pts)}`,
        '#ffe26a',
        21
      );
    } else if (cause === 'chain') {
      this.chainReactions += 1;
      sound.playChainReaction();
      this.effects.spawnGlassShatter(car.x, car.spec.height * 0.7, car.z, 22);
      this.effects.spawnFireExplosion(car.x, car.spec.height * 0.6, car.z, 1.4);
      this.effects.spawnText(
        p.sx,
        p.sy - 34,
        `💥 واکنش زنجیره‌ای! +${toPersianDigits(pts)}`,
        '#ff9e40',
        24
      );
    } else {
      sound.playGuardrailCrash();
      sound.playTireScreech();
      this.effects.spawnFireExplosion(car.x, car.spec.height * 0.5, car.z, 1.1);
      this.effects.spawnText(
        p.sx,
        p.sy - 24,
        `${car.spec.shortName} از کار افتاد! +${toPersianDigits(pts)}`,
        '#ffb95c',
        20
      );
    }

    if (this.combo >= 3) {
      this.effects.spawnText(
        p.sx,
        p.sy - 56,
        `کمبو ×${toPersianDigits(this.combo)} 🔥`,
        '#ff6b35',
        18
      );
    }

    this.hitstopTimer = cause === 'windshield' ? 0.044 : 0.03;
    this.shakeMag = Math.max(this.shakeMag, cause === 'chain' ? 14 : 9.5);
    this.ui.syncHUD(this);
  }

  activateInferno() {
    this.infernoActive = true;
    this.infernoTimer = 8.0;
    this.infernoMeter = 100;
    sound.playInfernoStart();
    this.shakeMag = Math.max(this.shakeMag, 12);
    this.effects.spawnText(
      this.width * 0.5,
      this.height * 0.36,
      '🔥 خشم آتشفشان فعال شد! امتیاز ۲× 🔥',
      '#ffe266',
      28
    );
  }

  // --- MAIN UPDATE LOOP ---
  update(rawDt) {
    const dt = Math.min(0.05, rawDt);
    this.time += dt;

    if (this.state === 'paused') return;

    if (this.hitstopTimer > 0) {
      this.hitstopTimer -= dt;
      this.shakeMag = Math.max(0, this.shakeMag - dt * 20);
      return;
    }

    // Drift ambient volcanic sparks in the dusk breeze
    for (const em of this.ambientEmbers) {
      em.x += (em.vx + Math.sin(this.time + em.phase) * 0.008) * dt;
      em.y += em.vy * dt;
      if (em.y < 0.25) {
        em.y = 1.02;
        em.x = Math.random();
      }
      if (em.x < 0) em.x = 1;
      if (em.x > 1) em.x = 0;
    }

    this.shakeMag = Math.max(0, this.shakeMag - dt * 28);
    this.damageFlash = Math.max(0, this.damageFlash - dt * 2.4);
    this.launcherRecoil = Math.max(0, this.launcherRecoil - dt * 5.2);
    this.throwCooldown = Math.max(0, this.throwCooldown - dt);

    if (this.pointer.down && this.state === 'playing') {
      this.pointer.downTime += dt;
    }

    if (this.combo > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) {
        this.combo = 0;
        this.ui.syncHUD(this);
      }
    }

    if (this.infernoActive) {
      this.infernoTimer -= dt;
      this.infernoMeter = Math.max(0, (this.infernoTimer / 8.0) * 100);
      if (this.infernoTimer <= 0) {
        this.infernoActive = false;
        this.infernoMeter = 0;
      }
      this.ui.syncInferno(this);
    }

    this.updateSpawning(dt);
    this.updateCars(dt);
    this.updateRocks(dt);

    for (let i = this.brokenRails.length - 1; i >= 0; i--) {
      this.brokenRails[i].life -= dt;
      if (this.brokenRails[i].life <= 0) {
        this.brokenRails.splice(i, 1);
      }
    }

    this.effects.update(dt);

    if (this.state === 'playing') {
      const aim = this.computeAimSolution(this.pointer.x, this.pointer.y);
      this.lockedCarId = aim.lockedCar ? aim.lockedCar.id : null;
      this.lockedZone = aim.lockedZone;
    } else {
      this.lockedCarId = null;
      this.lockedZone = null;
    }

    if (this.state === 'playing' && this.mode === 'arcade') {
      const activeDriving = this.cars.filter((c) => c.state === 'driving').length;
      if (this.waveCarsToSpawn <= 0 && activeDriving === 0) {
        this.startWave(this.wave + 1);
      }
    }
  }

  updateSpawning(dt) {
    if (this.state === 'menu') {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0 && this.cars.length < 5) {
        this.cars.push(this.createCar(3, 114));
        this.spawnTimer = 1.45;
      }
      return;
    }

    if (this.state !== 'playing') return;

    if (this.mode === 'endless') {
      const effectiveWave = 1 + Math.floor(this.carsDisabled / 10);
      this.wave = effectiveWave;
      this.spawnTimer -= dt;
      const maxCars = Math.min(7, 3 + Math.floor(effectiveWave * 0.6));
      if (this.spawnTimer <= 0 && this.cars.length < maxCars) {
        this.cars.push(this.createCar(effectiveWave, 114));
        this.spawnTimer = Math.max(0.68, 1.65 - effectiveWave * 0.08);
      }
      return;
    }

    if (this.waveCarsToSpawn > 0) {
      this.spawnTimer -= dt;
      const maxSimultaneous = Math.min(7, 3 + Math.floor(this.wave * 0.65));
      const activeCount = this.cars.filter((c) => c.state === 'driving').length;
      if (this.spawnTimer <= 0 && activeCount < maxSimultaneous) {
        this.cars.push(this.createCar(this.wave, 114));
        this.waveCarsToSpawn -= 1;
        const baseInterval = Math.max(0.62, 1.65 - this.wave * 0.11);
        this.spawnTimer = baseInterval * (0.78 + Math.random() * 0.44);
      }
    }
  }

  updateCars(dt) {
    for (let i = this.cars.length - 1; i >= 0; i--) {
      const car = this.cars[i];
      car.hitFlash = Math.max(0, car.hitFlash - dt);

      if (car.wobbleTimer > 0) {
        car.wobbleTimer -= dt;
        car.wobble = Math.sin(car.wobbleTimer * 34) * 0.11 * (car.wobbleTimer / 0.5);
      } else {
        car.wobble = 0;
      }

      if (car.state === 'driving') {
        car.z -= car.speed * dt;

        car.laneChangeTimer -= dt;
        if (car.laneChangeTimer <= 0 && car.z > 24 && car.z < 92) {
          car.laneChangeTimer = 2.0 + Math.random() * 2.5;
          if (Math.random() < car.spec.laneChangeChance) {
            const delta = Math.random() > 0.5 ? 1 : -1;
            const candidate = car.targetLaneIndex + delta;
            if (candidate >= 0 && candidate < LANES.length) {
              const targetX = LANES[candidate];
              const blocked = this.cars.some(
                (other) =>
                  other.id !== car.id &&
                  Math.abs(other.x - targetX) < 2.6 &&
                  Math.abs(other.z - car.z) < 14
              );
              if (!blocked) {
                car.targetLaneIndex = candidate;
              }
            }
          }
        }

        const desiredX = LANES[car.targetLaneIndex];
        const diffX = desiredX - car.x;
        car.x += diffX * Math.min(1, dt * 4.5);
        car.roll = Math.max(-0.1, Math.min(0.1, -diffX * 0.04));

        if (car.windshieldCracked) {
          car.smokeTimer -= dt;
          if (car.smokeTimer <= 0) {
            car.smokeTimer = 0.14;
            this.effects.spawnSmokePlume(car.x, car.spec.height * 0.55, car.z, 0.55);
          }
        }

        if (car.z < -0.5) {
          this.cars.splice(i, 1);
          if (this.state === 'playing' && this.mode === 'arcade') {
            this.shields -= 1;
            this.combo = 0;
            this.damageFlash = 1.0;
            this.shakeMag = Math.max(this.shakeMag, 10);
            sound.playCarEscaped();
            this.effects.spawnText(
              this.width * 0.5,
              this.height * 0.74,
              `${car.spec.shortName} فرار کرد!`,
              '#ff4d6a',
              22
            );
            this.ui.syncHUD(this);
            if (this.shields <= 0) {
              this.triggerGameOver();
              return;
            }
          }
          continue;
        }
      } else if (car.state === 'swerving') {
        car.swerveTimer += dt;

        car.vx += car.swerveDir * 17.0 * dt;
        car.vz *= Math.pow(0.55, dt);
        car.x += car.vx * dt;
        car.z += car.vz * dt;
        car.roll += car.rollVel * dt;

        if (Math.abs(car.x) < ROAD_HALF_WIDTH + 0.5 && car.skidPrevX !== null) {
          const wheelOffset = car.spec.width * 0.34;
          if (Math.hypot(car.x - car.skidPrevX, car.z - car.skidPrevZ) > 0.55) {
            this.effects.addSkidMark(
              car.skidPrevX - wheelOffset,
              car.skidPrevZ,
              car.x - wheelOffset,
              car.z
            );
            this.effects.addSkidMark(
              car.skidPrevX + wheelOffset,
              car.skidPrevZ,
              car.x + wheelOffset,
              car.z
            );
            car.skidPrevX = car.x;
            car.skidPrevZ = car.z;
          }
        }

        car.smokeTimer -= dt;
        if (car.smokeTimer <= 0) {
          car.smokeTimer = 0.045;
          this.effects.spawnSmokePlume(car.x, car.spec.height * 0.52, car.z, 1.15);
        }

        // Chain Reaction collision with adjacent driving luxury cars!
        if (Math.abs(car.x) < ROAD_HALF_WIDTH) {
          for (const other of this.cars) {
            if (other.id === car.id || other.state !== 'driving') continue;
            const dx = Math.abs(other.x - car.x);
            const dz = Math.abs(other.z - car.z);
            if (dx < (car.spec.width + other.spec.width) * 0.45 && dz < 4.4) {
              this.disableCar(other, car.swerveDir, 'chain');
            }
          }
        }

        // Guardrail smash when leaving the highway!
        if (!car.railBroken && Math.abs(car.x) >= GUARDRAIL_X - 0.3) {
          car.railBroken = true;
          const side = Math.sign(car.x);
          this.brokenRails.push({ side, z: car.z, life: 9.0 });
          sound.playGuardrailCrash();
          this.effects.spawnGuardrailCrash(side * GUARDRAIL_X, 0.5, car.z, side);
          this.shakeMag = Math.max(this.shakeMag, 11);

          car.vy = 7.8 + Math.random() * 2.5;
          car.rollVel = -side * (5.2 + Math.random() * 2.4);
          car.state = 'crashed';

          const p = this.project(car.x, car.spec.height, car.z);
          if (car.z > 2) {
            this.effects.spawnText(
              Math.max(120, Math.min(this.width - 120, p.sx)),
              Math.max(95, p.sy - 20),
              `${car.spec.shortName} از جاده منحرف شد!`,
              '#ff8f3f',
              18
            );
          }
        }

        if (car.z < -4 || car.swerveTimer > 3.5) {
          this.cars.splice(i, 1);
        }
      } else if (car.state === 'crashed') {
        car.swerveTimer += dt;
        car.vy -= 22 * dt;
        car.x += car.vx * dt;
        car.y += car.vy * dt;
        car.z += car.vz * dt;
        car.roll += car.rollVel * dt;

        if (car.y < -1.8) {
          car.y = -1.8;
          car.vy = Math.abs(car.vy) * 0.35;
          car.vx *= 0.72;
          car.rollVel *= 0.7;
        }

        car.smokeTimer -= dt;
        if (car.smokeTimer <= 0) {
          car.smokeTimer = 0.055;
          this.effects.spawnSmokePlume(car.x, Math.max(0, car.y + 0.8), car.z, 1.3);
        }

        if (Math.abs(car.x) > 28 || car.z < -4 || car.swerveTimer > 2.3) {
          if (car.z > 4 && Math.abs(car.x) < 27) {
            this.effects.spawnFireExplosion(car.x, Math.max(0.4, car.y + 0.8), car.z, 1.5);
          }
          this.cars.splice(i, 1);
        }
      }
    }
  }

  updateRocks(dt) {
    for (let i = this.rocks.length - 1; i >= 0; i--) {
      const rock = this.rocks[i];
      rock.prevX = rock.x;
      rock.prevY = rock.y;
      rock.prevZ = rock.z;

      rock.age += dt;
      rock.vy -= GRAVITY * dt;
      rock.x += rock.vx * dt;
      rock.y += rock.vy * dt;
      rock.z += rock.vz * dt;
      rock.rot += rock.vrot * dt;

      this.effects.spawnRockTrail(rock.x, rock.y, rock.z, rock.isMeteor ? 1.55 : 1.0);

      let impacted = false;
      for (const car of this.cars) {
        if (car.state !== 'driving') continue;

        const zMin = Math.min(rock.prevZ, rock.z) - 2.6;
        const zMax = Math.max(rock.prevZ, rock.z) + 2.6;
        if (car.z < zMin || car.z > zMax) continue;

        const zSpan = rock.z - rock.prevZ;
        const t = Math.abs(zSpan) > 0.001 ? Math.max(0, Math.min(1, (car.z - rock.prevZ) / zSpan)) : 1;
        const rx = rock.prevX + (rock.x - rock.prevX) * t;
        const ry = rock.prevY + (rock.y - rock.prevY) * t;

        const halfW = car.spec.width * 0.58 + rock.radius;
        if (Math.abs(rx - car.x) <= halfW && ry >= -0.35 && ry <= car.spec.height + 1.15) {
          this.handleRockCarImpact(rock, car, rx, ry);
          impacted = true;
          break;
        }
      }

      if (impacted) {
        this.rocks.splice(i, 1);
        continue;
      }

      if (rock.y <= 0.15) {
        this.effects.spawnFireExplosion(rock.x, 0.2, rock.z, rock.isMeteor ? 1.65 : 0.85);
        sound.playBodyHit();

        if (rock.splashRadius > 0) {
          this.shakeMag = Math.max(this.shakeMag, 8);
          for (const car of this.cars) {
            if (car.state !== 'driving') continue;
            const dist = Math.hypot(car.x - rock.x, (car.z - rock.z) * 0.65);
            if (dist <= rock.splashRadius) {
              const dir = car.x >= rock.x ? 1 : -1;
              this.disableCar(car, dir, 'windshield');
            }
          }
        }
        this.rocks.splice(i, 1);
      } else if (rock.z > 130 || rock.age > 2.2) {
        this.rocks.splice(i, 1);
      }
    }
  }

  handleRockCarImpact(rock, car, hitX, hitY) {
    const pushDir = hitX >= car.x ? -1 : 1;
    const windshieldMinY = car.spec.height * 0.34;
    const isWindshieldHit =
      rock.isMeteor ||
      rock.intendedZone === 'windshield' ||
      (hitY >= windshieldMinY && Math.abs(hitX - car.x) <= car.spec.width * 0.5 + rock.radius * 0.7);

    if (isWindshieldHit) {
      car.windshieldHp -= rock.damage;
      car.crackOffsetX = Math.max(-1, Math.min(1, (hitX - car.x) / (car.spec.width * 0.4)));
      car.hitFlash = 0.2;

      if (car.windshieldHp <= 0) {
        this.disableCar(car, pushDir, 'windshield');
      } else {
        car.windshieldCracked = true;
        car.wobbleTimer = 0.5;
        car.speed *= 0.86;
        sound.playWindshieldShatter(false, this.combo);
        this.effects.spawnGlassShatter(hitX, car.spec.height * 0.74, car.z, 14);
        this.effects.spawnFireExplosion(hitX, car.spec.height * 0.7, car.z, 0.75);
        this.shakeMag = Math.max(this.shakeMag, 5.5);

        const p = this.project(car.x, car.spec.height, car.z);
        this.effects.spawnText(p.sx, p.sy - 22, 'شیشه ترک خورد! یک ضربه دیگه!', '#9ee6ff', 17);
      }
    } else {
      car.bodyHp -= rock.damage;
      car.hitFlash = 0.16;
      car.wobbleTimer = 0.42;
      car.speed *= 0.9;
      this.effects.spawnFireExplosion(hitX, Math.max(0.4, hitY), car.z, 0.8);

      if (car.bodyHp <= 0) {
        this.disableCar(car, pushDir, 'body');
      } else {
        sound.playBodyHit();
        const p = this.project(car.x, car.spec.height, car.z);
        this.effects.spawnText(p.sx, p.sy - 18, 'به بدنه خورد! بزن به شیشه!', '#ffd28f', 15);
      }
    }

    if (rock.splashRadius > 0) {
      for (const other of this.cars) {
        if (other.id === car.id || other.state !== 'driving') continue;
        const dist = Math.hypot(other.x - rock.x, (other.z - rock.z) * 0.7);
        if (dist <= rock.splashRadius) {
          this.disableCar(other, other.x >= rock.x ? 1 : -1, 'chain');
        }
      }
    }
  }

  // --- RENDER PIPELINE ---
  render() {
    const ctx = this.ctx;
    ctx.save();

    if (this.shakeMag > 0.2) {
      const ox = (Math.random() - 0.5) * this.shakeMag * 1.4;
      const oy = (Math.random() - 0.5) * this.shakeMag * 1.4;
      ctx.translate(ox, oy);
    }

    this.drawSkyAndEnvironment(ctx);
    this.drawHighway(ctx);
    this.effects.drawSkids(ctx, (x, y, z) => this.project(x, y, z));

    if (this.state === 'playing') {
      this.drawAimPreview(ctx);
    }

    const renderList = [];
    for (const car of this.cars) {
      renderList.push({ kind: 'car', z: car.z, item: car });
    }
    for (const rock of this.rocks) {
      renderList.push({ kind: 'rock', z: rock.z, item: rock });
    }
    renderList.sort((a, b) => b.z - a.z);

    for (const entry of renderList) {
      if (entry.kind === 'car') {
        const car = entry.item;
        if (car.z < -3 || car.z > 125) continue;
        const proj = this.project(car.x, car.y, car.z);
        drawLuxuryCar(ctx, car, proj, this.time, car.id === this.lockedCarId);
      } else {
        this.drawFlamingRock(ctx, entry.item);
      }
    }

    this.effects.drawParticles(ctx, (x, y, z) => this.project(x, y, z));

    // Ambient floating dusk volcanic embers
    this.drawAmbientEmbers(ctx);

    if (this.state === 'playing' || this.state === 'paused') {
      this.drawForegroundLauncher(ctx);
    }

    this.effects.drawTexts(ctx);
    this.drawScreenVignettes(ctx);

    ctx.restore();
  }

  drawSkyAndEnvironment(ctx) {
    const w = this.width;
    const h = this.height;
    const horizonY = h * this.horizonRatio;

    const skyGrad = ctx.createLinearGradient(0, 0, 0, horizonY + 20);
    if (this.infernoActive) {
      skyGrad.addColorStop(0, '#140512');
      skyGrad.addColorStop(0.45, '#521126');
      skyGrad.addColorStop(0.82, '#c83b18');
      skyGrad.addColorStop(1, '#ffb33b');
    } else {
      skyGrad.addColorStop(0, '#0a0718');
      skyGrad.addColorStop(0.42, '#241236');
      skyGrad.addColorStop(0.76, '#7a2540');
      skyGrad.addColorStop(0.95, '#e86830');
      skyGrad.addColorStop(1, '#ffbc57');
    }
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, horizonY + 24);

    // Stars
    ctx.fillStyle = '#fff5e6';
    for (const s of this.stars) {
      const alpha = 0.25 + 0.55 * (0.5 + 0.5 * Math.sin(this.time * 2.2 + s.twinkle));
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(s.x * w, s.y * h, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Glowing setting sun
    const sunX = w * 0.5;
    const sunY = horizonY - h * 0.015;
    const sunR = Math.min(w, h) * 0.11;

    const sunGlow = ctx.createRadialGradient(sunX, sunY, sunR * 0.2, sunX, sunY, sunR * 2.8);
    sunGlow.addColorStop(0, 'rgba(255, 240, 175, 0.95)');
    sunGlow.addColorStop(0.32, 'rgba(255, 145, 58, 0.55)');
    sunGlow.addColorStop(1, 'rgba(255, 70, 30, 0)');
    ctx.fillStyle = sunGlow;
    ctx.beginPath();
    ctx.arc(sunX, sunY, sunR * 2.8, 0, Math.PI * 2);
    ctx.fill();

    const sunDisc = ctx.createLinearGradient(0, sunY - sunR, 0, sunY + sunR * 0.7);
    sunDisc.addColorStop(0, '#fff7c2');
    sunDisc.addColorStop(0.6, '#ff9c3b');
    sunDisc.addColorStop(1, '#ff4526');
    ctx.fillStyle = sunDisc;
    ctx.beginPath();
    ctx.arc(sunX, sunY, sunR * 0.72, 0, Math.PI * 2);
    ctx.fill();

    // Distant mountain silhouette ridge
    ctx.fillStyle = '#180c24';
    ctx.beginPath();
    ctx.moveTo(0, horizonY + 4);
    for (const pt of this.mountains) {
      ctx.lineTo(pt.t * w, horizonY - pt.h * h);
    }
    ctx.lineTo(w, horizonY + 4);
    ctx.closePath();
    ctx.fill();

    // Distant metropolitan twilight skyline with glowing windows
    for (const t of this.skyline) {
      const tx = t.x * w;
      const tw = t.w * w;
      const th = t.h * h;
      const ty = horizonY - th + 3;
      ctx.fillStyle = '#12091c';
      ctx.fillRect(tx, ty, tw, th);

      ctx.fillStyle = 'rgba(255, 210, 130, 0.42)';
      const rows = Math.max(2, Math.floor(th / 7));
      for (let r = 0; r < rows; r++) {
        if ((r + Math.floor(t.seed)) % 2 === 0) {
          ctx.fillRect(tx + 2, ty + 3 + r * 6, Math.max(2, tw - 4), 2);
        }
      }
    }

    // Terrain below horizon
    const groundGrad = ctx.createLinearGradient(0, horizonY, 0, h);
    groundGrad.addColorStop(0, '#2a1524');
    groundGrad.addColorStop(0.3, '#1a111e');
    groundGrad.addColorStop(1, '#0e0a12');
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, horizonY, w, h - horizonY);
  }

  drawHighway(ctx) {
    const zNear = 0.6;
    const zFar = 122;

    // Gravel shoulders
    const shLNear = this.project(-14.5, 0, zNear);
    const shRNear = this.project(14.5, 0, zNear);
    const shLFar = this.project(-14.5, 0, zFar);
    const shRFar = this.project(14.5, 0, zFar);

    ctx.fillStyle = '#251a22';
    ctx.beginPath();
    ctx.moveTo(shLFar.sx, shLFar.sy);
    ctx.lineTo(shRFar.sx, shRFar.sy);
    ctx.lineTo(shRNear.sx, shRNear.sy);
    ctx.lineTo(shLNear.sx, shLNear.sy);
    ctx.closePath();
    ctx.fill();

    // 4-lane asphalt polygon
    const rLNear = this.project(-ROAD_HALF_WIDTH, 0, zNear);
    const rRNear = this.project(ROAD_HALF_WIDTH, 0, zNear);
    const rLFar = this.project(-ROAD_HALF_WIDTH, 0, zFar);
    const rRFar = this.project(ROAD_HALF_WIDTH, 0, zFar);

    const roadGrad = ctx.createLinearGradient(0, rLFar.sy, 0, rLNear.sy);
    roadGrad.addColorStop(0, '#2c2233');
    roadGrad.addColorStop(0.28, '#201e2b');
    roadGrad.addColorStop(1, '#14141c');
    ctx.fillStyle = roadGrad;
    ctx.beginPath();
    ctx.moveTo(rLFar.sx, rLFar.sy);
    ctx.lineTo(rRFar.sx, rRFar.sy);
    ctx.lineTo(rRNear.sx, rRNear.sy);
    ctx.lineTo(rLNear.sx, rLNear.sy);
    ctx.closePath();
    ctx.fill();

    // Sunset sheen down asphalt center
    const sheenFar = this.project(0, 0, zFar);
    const sheenNear = this.project(0, 0, zNear);
    const sheenGrad = ctx.createLinearGradient(0, sheenFar.sy, 0, sheenNear.sy);
    sheenGrad.addColorStop(0, 'rgba(255, 165, 76, 0.25)');
    sheenGrad.addColorStop(0.4, 'rgba(255, 110, 48, 0.08)');
    sheenGrad.addColorStop(1, 'rgba(255, 110, 48, 0)');
    ctx.fillStyle = sheenGrad;
    ctx.beginPath();
    ctx.moveTo(this.project(-2.5, 0, zFar).sx, sheenFar.sy);
    ctx.lineTo(this.project(2.5, 0, zFar).sx, sheenFar.sy);
    ctx.lineTo(this.project(5.5, 0, zNear).sx, sheenNear.sy);
    ctx.lineTo(this.project(-5.5, 0, zNear).sx, sheenNear.sy);
    ctx.closePath();
    ctx.fill();

    // Outer shoulder lines
    ctx.strokeStyle = 'rgba(255, 210, 145, 0.65)';
    for (const side of [-1, 1]) {
      const pF = this.project(side * (ROAD_HALF_WIDTH - 0.35), 0, zFar);
      const pN = this.project(side * (ROAD_HALF_WIDTH - 0.35), 0, zNear);
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(pF.sx, pF.sy);
      ctx.lineTo(pN.sx, pN.sy);
      ctx.stroke();
    }

    // Center double yellow highway divider
    for (const offset of [-0.14, 0.14]) {
      const cF = this.project(offset, 0, zFar);
      const cN = this.project(offset, 0, zNear);
      ctx.strokeStyle = 'rgba(255, 196, 62, 0.72)';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(cF.sx, cF.sy);
      ctx.lineTo(cN.sx, cN.sy);
      ctx.stroke();
    }

    // Dashed white lane lines
    for (const lx of [-4.5, 4.5]) {
      for (let z = 115; z >= 2; z -= 8) {
        const segZ1 = z;
        const segZ2 = Math.max(1.2, z - 3.6);
        const p1 = this.project(lx, 0, segZ1);
        const p2 = this.project(lx, 0, segZ2);
        ctx.strokeStyle = 'rgba(245, 240, 255, 0.5)';
        ctx.lineWidth = Math.max(1, p2.scale * 0.12);
        ctx.beginPath();
        ctx.moveTo(p1.sx, p1.sy);
        ctx.lineTo(p2.sx, p2.sy);
        ctx.stroke();
      }
    }

    // Breakable metallic guardrails
    for (const side of [-1, 1]) {
      const gx = side * GUARDRAIL_X;
      for (let z = 110; z >= 2; z -= 6) {
        const zNext = Math.max(1, z - 6);
        const isBroken = this.brokenRails.some(
          (br) => br.side === side && Math.abs(br.z - (z - 3)) < 4.5
        );

        const postBase = this.project(gx, 0, z);
        const postTop = this.project(gx, 0.85, z);

        if (!isBroken) {
          ctx.strokeStyle = '#6c7382';
          ctx.lineWidth = Math.max(1.2, postBase.scale * 0.12);
          ctx.beginPath();
          ctx.moveTo(postBase.sx, postBase.sy);
          ctx.lineTo(postTop.sx, postTop.sy);
          ctx.stroke();

          const r1 = this.project(gx, 0.65, z);
          const r2 = this.project(gx, 0.65, zNext);
          ctx.strokeStyle = '#adb8c9';
          ctx.lineWidth = Math.max(1.6, r2.scale * 0.22);
          ctx.beginPath();
          ctx.moveTo(r1.sx, r1.sy);
          ctx.lineTo(r2.sx, r2.sy);
          ctx.stroke();

          if (z % 12 === 2) {
            ctx.fillStyle = '#ff9824';
            const dotR = Math.max(1.2, r1.scale * 0.08);
            ctx.beginPath();
            ctx.arc(r1.sx, r1.sy, dotR, 0, Math.PI * 2);
            ctx.fill();
          }
        } else {
          ctx.strokeStyle = '#8b685e';
          ctx.lineWidth = Math.max(1.2, postBase.scale * 0.12);
          ctx.beginPath();
          ctx.moveTo(postBase.sx, postBase.sy);
          ctx.lineTo(postTop.sx + side * postBase.scale * 0.35, postTop.sy + postBase.scale * 0.25);
          ctx.stroke();
        }
      }
    }

    // Highway streetlights
    for (let z = 104; z >= 8; z -= 24) {
      for (const side of [-1, 1]) {
        const px = side * (GUARDRAIL_X + 1.4);
        const base = this.project(px, 0, z);
        const top = this.project(px, 6.2, z);
        const arm = this.project(px - side * 2.2, 6.0, z);

        ctx.strokeStyle = '#262333';
        ctx.lineWidth = Math.max(1.5, base.scale * 0.16);
        ctx.beginPath();
        ctx.moveTo(base.sx, base.sy);
        ctx.lineTo(top.sx, top.sy);
        ctx.lineTo(arm.sx, arm.sy);
        ctx.stroke();

        const lampR = Math.max(2, arm.scale * 0.24);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const lg = ctx.createRadialGradient(arm.sx, arm.sy, 0, arm.sx, arm.sy, lampR * 5);
        lg.addColorStop(0, 'rgba(255, 224, 150, 0.85)');
        lg.addColorStop(0.4, 'rgba(255, 150, 58, 0.22)');
        lg.addColorStop(1, 'rgba(255, 120, 40, 0)');
        ctx.fillStyle = lg;
        ctx.beginPath();
        ctx.arc(arm.sx, arm.sy, lampR * 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  }

  drawAimPreview(ctx) {
    const aim = this.computeAimSolution(this.pointer.x, this.pointer.y);
    const charge = this.getChargeRatio();
    const isLocked = aim.lockedCar !== null;
    const isMeteor = charge >= 0.6 || this.infernoActive;

    const startX = aim.tx * 0.22;
    const startY = 2.1;
    const startZ = -2.6;
    const T = aim.flightTime;
    const vx = (aim.tx - startX) / T;
    const vz = (aim.tz - startZ) / T;
    const vy = (aim.ty - startY + 0.5 * GRAVITY * T * T) / T;

    ctx.save();
    for (let step = 1; step <= 9; step++) {
      const frac = step / 10;
      const t = frac * T;
      const x = startX + vx * t;
      const y = startY + vy * t - 0.5 * GRAVITY * t * t;
      const z = startZ + vz * t;
      if (z < 0.2) continue;
      const p = this.project(x, y, z);
      const r = Math.max(1.8, (isMeteor ? 4.8 : 3.2) * (1 - frac * 0.35));
      ctx.fillStyle = isLocked
        ? `rgba(255, 226, 92, ${0.28 + frac * 0.55})`
        : `rgba(255, 134, 52, ${0.18 + frac * 0.42})`;
      ctx.beginPath();
      ctx.arc(p.sx, p.sy, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Reticle right at cursor (or locked windshield position)
    const retX = this.pointer.x;
    const retY = this.pointer.y;
    const ringR = Math.max(15, (isMeteor ? 28 : 20) + Math.sin(this.time * 10) * 1.8);

    ctx.translate(retX, retY);

    ctx.strokeStyle = isLocked ? '#ffe259' : isMeteor ? '#ff6a1f' : 'rgba(255, 175, 92, 0.85)';
    ctx.lineWidth = isLocked ? 2.8 : 2;
    ctx.beginPath();
    ctx.arc(0, 0, ringR, 0, Math.PI * 2);
    ctx.stroke();

    if (charge > 0.02) {
      ctx.strokeStyle = charge >= 0.6 ? '#fff07c' : '#ff8c24';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, ringR + 6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * charge);
      ctx.stroke();
    }

    const tick = ringR + 5;
    ctx.beginPath();
    ctx.moveTo(-tick, 0);
    ctx.lineTo(-ringR * 0.45, 0);
    ctx.moveTo(ringR * 0.45, 0);
    ctx.lineTo(tick, 0);
    ctx.moveTo(0, -tick);
    ctx.lineTo(0, -ringR * 0.45);
    ctx.moveTo(0, ringR * 0.45);
    ctx.lineTo(0, tick);
    ctx.stroke();

    ctx.fillStyle = isLocked ? '#fff599' : '#ff7b24';
    ctx.beginPath();
    ctx.arc(0, 0, isLocked ? 3.8 : 2.6, 0, Math.PI * 2);
    ctx.fill();

    if (isLocked) {
      ctx.font = '800 12.5px Vazirmatn, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffe56b';
      ctx.shadowColor = 'rgba(0,0,0,0.92)';
      ctx.shadowBlur = 4;
      ctx.fillText(aim.lockedZone === 'body' ? 'هدف بدنه' : 'قفل شیشه! 🎯', 0, ringR + 18);
    }

    ctx.restore();
  }

  drawFlamingRock(ctx, rock) {
    if (rock.z < -2.4) return;
    const p = this.project(rock.x, rock.y, rock.z);
    const rad = Math.max(4, rock.radius * p.scale);

    if (rock.z > 0.5) {
      const sh = this.project(rock.x, 0.02, rock.z);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.36)';
      ctx.beginPath();
      ctx.ellipse(sh.sx, sh.sy, rad * 0.85, rad * 0.32, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.save();
    ctx.translate(p.sx, p.sy);

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const haloR = rad * (rock.isMeteor ? 2.85 : 2.3);
    const glow = ctx.createRadialGradient(0, 0, rad * 0.25, 0, 0, haloR);
    glow.addColorStop(0, 'rgba(255, 250, 195, 0.95)');
    glow.addColorStop(0.38, 'rgba(255, 128, 22, 0.78)');
    glow.addColorStop(0.75, 'rgba(255, 42, 0, 0.28)');
    glow.addColorStop(1, 'rgba(255, 30, 0, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, haloR, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.rotate(rock.rot);
    const rockGrad = ctx.createRadialGradient(-rad * 0.2, -rad * 0.2, rad * 0.1, 0, 0, rad);
    rockGrad.addColorStop(0, '#ffe885');
    rockGrad.addColorStop(0.45, '#ff6519');
    rockGrad.addColorStop(0.78, '#4a1b17');
    rockGrad.addColorStop(1, '#1c0f12');

    ctx.fillStyle = rockGrad;
    ctx.beginPath();
    const pts = 8;
    for (let i = 0; i < pts; i++) {
      const ang = (i / pts) * Math.PI * 2;
      const r = rad * (i % 2 === 0 ? 1.05 : 0.78);
      const vx = Math.cos(ang) * r;
      const vy = Math.sin(ang) * r;
      if (i === 0) ctx.moveTo(vx, vy);
      else ctx.lineTo(vx, vy);
    }
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#fff099';
    ctx.lineWidth = Math.max(1.2, rad * 0.11);
    ctx.beginPath();
    ctx.moveTo(-rad * 0.45, -rad * 0.2);
    ctx.lineTo(0, rad * 0.05);
    ctx.lineTo(rad * 0.4, -rad * 0.3);
    ctx.moveTo(0, rad * 0.05);
    ctx.lineTo(rad * 0.22, rad * 0.48);
    ctx.stroke();

    ctx.restore();
  }

  drawAmbientEmbers(ctx) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const em of this.ambientEmbers) {
      const alpha = (this.infernoActive ? 0.8 : 0.4) * (0.5 + 0.5 * Math.sin(this.time * 4 + em.phase));
      ctx.fillStyle = `rgba(255, 168, 62, ${alpha})`;
      ctx.beginPath();
      ctx.arc(em.x * this.width, em.y * this.height, em.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  drawForegroundLauncher(ctx) {
    const cx = this.width * 0.5 + (this.pointer.x - this.width * 0.5) * 0.16;
    const cy = this.height - 14 + this.launcherRecoil * 24;
    const angle = Math.max(-0.42, Math.min(0.42, ((this.pointer.x - this.width * 0.5) / this.width) * 0.9));
    const charge = this.getChargeRatio();
    const readyRockR = 16 + charge * 13 + (this.infernoActive ? 5 : 0);

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);

    ctx.fillStyle = '#140e1c';
    ctx.strokeStyle = 'rgba(255, 146, 64, 0.38)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-42, 26);
    ctx.lineTo(-28, -22);
    ctx.lineTo(-16, -22);
    ctx.lineTo(-14, 4);
    ctx.lineTo(14, 4);
    ctx.lineTo(16, -22);
    ctx.lineTo(28, -22);
    ctx.lineTo(42, 26);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    if (this.throwCooldown < 0.08) {
      const rockY = -12 + charge * 8;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(0, rockY, 2, 0, rockY, readyRockR * 2.2);
      g.addColorStop(0, 'rgba(255, 245, 175, 0.95)');
      g.addColorStop(0.45, 'rgba(255, 110, 22, 0.72)');
      g.addColorStop(1, 'rgba(255, 30, 0, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, rockY, readyRockR * 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      const core = ctx.createRadialGradient(-4, rockY - 4, 2, 0, rockY, readyRockR);
      core.addColorStop(0, '#fff29e');
      core.addColorStop(0.55, '#ff5d14');
      core.addColorStop(1, '#331112');
      ctx.fillStyle = core;
      ctx.beginPath();
      ctx.arc(0, rockY, readyRockR, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  drawScreenVignettes(ctx) {
    const w = this.width;
    const h = this.height;

    if (this.infernoActive) {
      const pulse = 0.22 + Math.sin(this.time * 12) * 0.08;
      const vig = ctx.createRadialGradient(
        w * 0.5,
        h * 0.5,
        Math.min(w, h) * 0.34,
        w * 0.5,
        h * 0.5,
        Math.max(w, h) * 0.72
      );
      vig.addColorStop(0, 'rgba(255, 90, 20, 0)');
      vig.addColorStop(1, `rgba(255, 72, 16, ${pulse})`);
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, w, h);
    }

    if (this.damageFlash > 0.01) {
      const vig = ctx.createRadialGradient(
        w * 0.5,
        h * 0.5,
        Math.min(w, h) * 0.3,
        w * 0.5,
        h * 0.5,
        Math.max(w, h) * 0.72
      );
      vig.addColorStop(0, 'rgba(255, 20, 60, 0)');
      vig.addColorStop(1, `rgba(255, 30, 65, ${this.damageFlash * 0.45})`);
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, w, h);
    }
  }
}
