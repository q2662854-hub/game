/* =========================================================
   game.js — شیشه‌شکن
   بازی: با سنگ آتشین شیشه‌ی ماشین‌های لوکس را بشکن و از جاده منحرفشان کن
   ========================================================= */
(function () {
  'use strict';

  /* ================= پیکربندی ================= */
  const W = 1280, H = 720;
  const ROAD_TOP = 424, ROAD_BOT = 660;
  const SIDEWALK = 660;
  const TIME_TOTAL = 60;
  const AMMO_MAX = 5;
  const AMMO_REGEN = 0.66;
  const GRAV = 1350;
  const ORIGIN = { x: 176, y: 566 };
  const PLAYER = { x: 104, y: 700 };
  const BEST_KEY = 'glassbreak_best_v1';

  const LANES = [
    { baseline: 556, scale: 0.74, speed: 286 },
    { baseline: 652, scale: 1.00, speed: 338 }
  ];

  /* ================= ابزارها ================= */
  const FA = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  const toFa = (n) => String(n).replace(/\d/g, (d) => FA[+d]);
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const rand = (a, b) => a + Math.random() * (b - a);
  const randInt = (a, b) => Math.floor(rand(a, b + 1));
  const lerp = (a, b, t) => a + (b - a) * t;
  const TAU = Math.PI * 2;

  const store = {
    get(k, d) {
      try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; }
    },
    set(k, v) {
      try { localStorage.setItem(k, String(v)); } catch (e) {}
    }
  };

  function makeRng(seed) {
    let s = seed >>> 0;
    return function () {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  function pointInPoly(px, py, poly) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i][0], yi = poly[i][1];
      const xj = poly[j][0], yj = poly[j][1];
      if ((yi > py) !== (yj > py) &&
          px < ((xj - xi) * (py - yi)) / (yj - yi + 1e-9) + xi) inside = !inside;
    }
    return inside;
  }

  /* ================= DOM ================= */
  const $ = (id) => document.getElementById(id);
  const canvas = $('game');
  const ctx = canvas.getContext('2d');
  const el = {
    hud: $('hud'), score: $('score'), time: $('time'), timePanel: document.querySelector('.time-panel'),
    combo: $('combo'), comboNum: $('combo-num'), ammo: $('ammo'),
    menu: $('menu'), over: $('gameover'), pause: $('pause'), hint: $('hint'),
    bestMenu: $('best-menu'), finalScore: $('final-score'), newRecord: $('new-record'),
    stCars: $('st-cars'), stAcc: $('st-acc'), stCombo: $('st-combo'), stBest: $('st-best'),
    btnSound: $('btn-sound')
  };

  let dpr = 1, viewRect = { left: 0, top: 0, width: W, height: H };

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const availW = window.innerWidth, availH = window.innerHeight;
    const scale = Math.min(availW / W, availH / H);
    const cw = Math.round(W * scale), ch = Math.round(H * scale);
    canvas.style.width = cw + 'px';
    canvas.style.height = ch + 'px';
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.direction = 'rtl';
    const r = canvas.getBoundingClientRect();
    viewRect = { left: r.left, top: r.top, width: r.width, height: r.height };
  }
  window.addEventListener('resize', resize);

  function pointerPos(e) {
    const r = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * W,
      y: ((e.clientY - r.top) / r.height) * H
    };
  }

  /* ================= وضعیت ================= */
  const state = {
    mode: 'menu', // menu | playing | paused | over
    t: 0,
    timeLeft: TIME_TOTAL,
    score: 0, combo: 0, maxCombo: 0, throws: 0, disabled: 0, windowHits: 0,
    best: +(store.get(BEST_KEY, 0) || 0),
    ammo: AMMO_MAX, ammoT: 0,
    cars: [], rocks: [], parts: [], texts: [], carId: 1,
    shake: 0, shakeX: 0, shakeY: 0,
    timeScale: 1, slow: 0, flash: 0,
    spawnT: 0.6,
    scroll: 0, roadScroll: 0,
    charge: { active: false, power: 0, start: 0, px: 700, py: 300, ang: 0.8 },
    kick: 0,
    ended: false,
    lastBeep: 99,
    hintT: 0
  };

  /* ================= پس‌زمینه ================= */
  const stars = (() => {
    const r = makeRng(7717), out = [];
    for (let i = 0; i < 110; i++) {
      out.push({ x: r() * W, y: r() * 330, s: r() * 1.7 + 0.4, p: r() * TAU, a: 0.25 + r() * 0.6 });
    }
    return out;
  })();

  function makeCity(seed, count, tile, opt) {
    const r = makeRng(seed), items = [];
    let x = 0;
    for (let i = 0; i < count; i++) {
      const w = opt.wMin + r() * (opt.wMax - opt.wMin);
      const h = opt.hMin + r() * (opt.hMax - opt.hMin);
      const b = { x: x, w: w, h: h * 0.86, wins: [], ant: r() < 0.5 };
      const cols = Math.max(2, Math.floor(w / 16));
      const rows = Math.max(3, Math.floor(h / 22));
      for (let cx = 0; cx < cols; cx++) {
        for (let cy = 0; cy < rows; cy++) {
          if (r() < opt.winChance) {
            b.wins.push({
              x: 6 + cx * (w - 12) / cols,
              y: 10 + cy * (h - 16) / rows,
              w: Math.max(2, (w - 12) / cols - 4),
              h: Math.max(2, (h - 16) / rows - 5),
              c: r() < 0.72 ? 'warm' : 'cool',
              a: 0.28 + r() * 0.62,
              bl: r() < 0.06
            });
          }
        }
      }
      items.push(b);
      x += w + opt.gap * (0.4 + r());
    }
    return { items: items, tile: Math.max(tile, x) };
  }

  const farCity = makeCity(4242, 26, 1900, {
    wMin: 42, wMax: 96, hMin: 70, hMax: 210, gap: 26, winChance: 0.30
  });
  const midCity = makeCity(9191, 20, 1750, {
    wMin: 60, wMax: 130, hMin: 90, hMax: 260, gap: 40, winChance: 0.22
  });

  const lamps = (() => {
    const out = [];
    for (let i = 0; i < 8; i++) out.push(i * 420 + 120);
    return out;
  })();

  /* ================= صدا ================= */
  let soundOn = true;
  function audioOn() { SFX.init(); }

  /* ================= ذرات ================= */
  const MAX_PARTS = 950;

  function addPart(p) {
    if (state.parts.length > MAX_PARTS) return;
    p.life = p.life || 1;
    p.max = p.life;
    p.rot = p.rot || 0;
    p.rotV = p.rotV || 0;
    state.parts.push(p);
  }

  function addFlame(x, y, vx, vy, size, life) {
    addPart({
      type: 'flame', x, y, vx, vy,
      size: size || rand(4, 9), life: life || rand(0.25, 0.5),
      gravity: -90, drag: 2.2
    });
  }
  function addSmoke(x, y, vx, vy, size, life, dark) {
    addPart({
      type: 'smoke', x, y, vx, vy,
      size: size || rand(10, 24), life: life || rand(0.7, 1.6),
      gravity: -30, drag: 1.0, dark: dark
    });
  }
  function addSpark(x, y, vx, vy, life, color) {
    addPart({
      type: 'spark', x, y, vx, vy, size: rand(1.5, 3.2),
      life: life || rand(0.25, 0.6), gravity: 620, drag: 0.4, color: color || '#ffd27a'
    });
  }
  function addGlassBit(x, y, vx, vy) {
    addPart({
      type: 'glassbit', x, y, vx, vy, size: rand(3, 8), life: rand(0.7, 1.4),
      gravity: 1500, drag: 0.2, rot: rand(0, TAU), rotV: rand(-9, 9)
    });
  }
  function addRing(x, y, r, color) {
    addPart({ type: 'ring', x, y, vx: 0, vy: 0, size: r, life: 0.42, ringColor: color || '#ffd27a' });
  }
  function addText(x, y, txt, color, size, owner) {
    state.texts.push({ x: x, y: y, txt: txt, color: color || '#fff', size: size || 26,
      life: 0.95, max: 0.95, owner: owner === undefined ? -1 : owner });
  }

  /* ================= ماشین‌ها ================= */
  function spawnCar(forceLane, forceModel) {
    const laneIdx = forceLane !== undefined ? forceLane : (Math.random() < 0.48 ? 0 : 1);
    const lane = LANES[laneIdx];
    for (const c of state.cars) {
      if (c.lane === laneIdx && c.x > W - 480) return null;
    }
    const model = forceModel || CarArt.randomModel();
    const diff = state.mode === 'playing' ? (1 - state.timeLeft / TIME_TOTAL) : 0.12;
    const speedBase = lane.speed * (1 + diff * 0.34) * rand(0.92, 1.1);
    const armored = state.mode === 'playing' && diff > 0.15 && Math.random() < 0.16;
    const golden = Math.random() < 0.07;

    const car = {
      id: state.carId++,
      model: model,
      lane: laneIdx,
      x: W + 220 + rand(0, 260),
      y: lane.baseline,
      scale: lane.scale,
      vx: -speedBase,
      angle: 0,
      wheelRot: rand(0, TAU),
      glass: CarArt.makeGlass(armored ? randInt(0, 1) : -1),
      hits: 0,
      hitFlash: 0,
      dead: false,
      deadT: 0,
      spinV: 0,
      vy: 0,
      golden: golden,
      armed: armored,
      pts: model.pts * (golden ? 2 : 1),
      glow: rand(0, TAU)
    };
    if (golden) {
      car.color = '#e3c268';
    } else {
      const cols = model.colors;
      car.color = cols[randInt(0, cols.length - 1)];
    }
    state.cars.push(car);
    return car;
  }

  function carLocal(car, wx, wy) {
    const a = -car.angle;
    const c = Math.cos(a), s = Math.sin(a);
    const qx = wx - car.x, qy = wy - car.y;
    const ux = qx * c - qy * s;
    const uy = qx * s + qy * c;
    const F = car.model.h * 0.42;
    return {
      x: ux / car.scale,
      y: (uy - F) / car.scale + F
    };
  }

  /* ================= شکستن شیشه ================= */
  function hitGlass(car, idx, localPt) {
    const g = car.glass[idx];
    if (g.broken) return;
    const geo = CarArt.geometry(car.model);
    const poly = geo.glass[idx];

    if (g.hp > 1) {
      // شیشه‌ی زره‌پوش: ترک می‌خورد
      g.hp--;
      const s = CarArt.shatter(car.model, idx, localPt);
      g.cracks = s.cracks;
      g.hit = s.hit;
      car.hitFlash = 0.6;
      SFX.crack();
      for (let i = 0; i < 8; i++) {
        addSpark(car.x + rand(-20, 20), car.y - car.model.h * 0.6 * car.scale,
          rand(-160, 160), rand(-220, -40), 0.35, '#cfe8ff');
      }
      addRing(car.x, car.y - car.model.h * 0.62 * car.scale, 34, '#cfe8ff');
      addText(car.x, car.y - car.model.h * 1.1 * car.scale, 'زره‌پوش!', '#9fd8ff', 20, car.id);
      return;
    }

    // شکستن کامل
    g.hp = 0;
    g.broken = true;
    const s = CarArt.shatter(car.model, idx, localPt);
    g.cracks = s.cracks;
    g.shards = s.shards;
    g.hit = s.hit;
    car.hits++;
    state.windowHits++;
    car.hitFlash = 1;
    car.vx *= 0.74;

    const wx = car.x, wy = car.y - car.model.h * 0.7 * car.scale;
    SFX.glass();
    for (let i = 0; i < 22; i++) {
      const sp = rand(80, 420);
      const ang = rand(-Math.PI * 0.95, Math.PI * 0.3);
      addGlassBit(wx + rand(-24, 24), wy + rand(-14, 14),
        Math.cos(ang) * sp, Math.sin(ang) * sp);
    }
    for (let i = 0; i < 14; i++) {
      addSpark(wx, wy, rand(-260, 260), rand(-320, -60), rand(0.2, 0.5), '#ffe6a8');
    }
    addRing(wx, wy, 46, '#d9f0ff');
    state.shake = Math.max(state.shake, 7);
    state.flash = Math.max(state.flash, 0.18);

    // آیا هر دو شیشه خرد شد؟
    if (car.glass.every((x) => x.broken)) disableCar(car);
    else {
      addText(car.x, car.y - car.model.h * 1.05 * car.scale, 'شیشه شکست!', '#bfe8ff', 20, car.id);
    }
  }

  function hitBody(car, rock) {
    SFX.metal();
    const wy = rock.y;
    for (let i = 0; i < 10; i++) {
      addSpark(rock.x, wy, rand(-240, 240), rand(-260, -20), rand(0.2, 0.45), '#ffd9a0');
    }
    addRing(rock.x, wy, 24, '#ffcf8a');
    car.hitFlash = Math.max(car.hitFlash, 0.35);
    addText(rock.x, wy - 26, 'بدنه!', '#ffc38a', 17);
    state.shake = Math.max(state.shake, 3);
  }

  function disableCar(car) {
    car.dead = true;
    car.deadT = 0;
    car.spinV = (Math.random() < 0.5 ? -1 : 1) * rand(2.4, 5.2);
    const up = Math.random() < 0.5;
    car.vy = up ? -rand(260, 520) : rand(80, 200);
    car.vx *= 0.92;

    const cx = car.x, cy = car.y - car.model.h * 0.5 * car.scale;
    addRing(cx, cy, 150, '#ffb347');
    for (let i = 0; i < 14; i++) {
      addSmoke(cx + rand(-70, 70), cy + rand(-40, 40), rand(-90, 90), rand(-140, 20),
        rand(12, 26), rand(0.9, 1.9), i % 3 === 0);
    }
    for (let i = 0; i < 16; i++) {
      addSpark(cx, cy, rand(-420, 420), rand(-420, 120), rand(0.3, 0.8), '#ffcf6b');
    }
    for (let i = 0; i < 8; i++) {
      addGlassBit(cx + rand(-30, 30), cy, rand(-320, 320), rand(-380, -40));
    }

    state.shake = Math.max(state.shake, 16);
    state.flash = Math.max(state.flash, 0.42);
    state.slow = 0.34;
    state.timeScale = 0.32;
    SFX.crash();

    if (state.mode === 'playing') {
      state.combo++;
      state.maxCombo = Math.max(state.maxCombo, state.combo);
      const mult = Math.min(state.combo, 5);
      const gain = Math.round(car.pts * mult);
      state.score += gain;
      state.disabled++;
      // متن‌های قبلی همین ماشین پاک شوند تا روی هم نیفتند
      state.texts = state.texts.filter(function (t) { return t.owner !== car.id; });
      addText(cx, cy - 72, '+' + toFa(gain), '#ffd27a', 34, car.id);
      if (car.golden) addText(cx, cy - 112, 'طلایی!', '#ffe08a', 22, car.id);
      if (state.combo > 1) addText(cx, cy + 16, '×' + toFa(mult) + ' کمبو', '#ff9d4d', 19, car.id);
      SFX.yes(state.combo);
      state.ammo = Math.min(AMMO_MAX, state.ammo + (car.golden ? 2 : 1));
      bumpCombo();
    }
  }

  /* ================= پرتاب ================= */
  function launchVec(power, angDeg) {
    const speed = 540 + power * 1000;
    const a = angDeg !== undefined ? angDeg : state.charge.ang;
    return { vx: Math.cos(a) * speed, vy: -Math.sin(a) * speed };
  }

  function throwRock() {
    const power = clamp(state.charge.power, 0, 1);
    if (state.ammo <= 0) {
      SFX.ui();
      addText(ORIGIN.x + 40, ORIGIN.y - 40, 'سنگ نداری!', '#ff8a6a', 18);
      return;
    }
    state.ammo--;
    state.ammoT = 0;
    state.throws++;
    const v = launchVec(power);
    state.rocks.push({
      x: ORIGIN.x, y: ORIGIN.y,
      vx: v.vx, vy: v.vy,
      r: 10, rot: rand(0, TAU), rotV: rand(-8, 8), trailT: 0
    });
    state.kick = 1;
    state.shake = Math.max(state.shake, 3.5);
    SFX.throw();
    for (let i = 0; i < 12; i++) {
      addFlame(ORIGIN.x + rand(-6, 6), ORIGIN.y + rand(-6, 6),
        v.vx * 0.12 + rand(-70, 70), v.vy * 0.12 + rand(-70, 70), rand(5, 11), rand(0.2, 0.4));
    }
  }

  function updateRocks(dt) {
    for (let i = state.rocks.length - 1; i >= 0; i--) {
      const r = state.rocks[i];
      let dead = false;
      const steps = 3;
      for (let s = 0; s < steps && !dead; s++) {
        const h = dt / steps;
        r.vy += GRAV * h;
        r.x += r.vx * h;
        r.y += r.vy * h;
        r.rot += r.rotV * h;

        // ذرات شعله
        r.trailT += h;
        if (r.trailT > 0.012) {
          r.trailT = 0;
          addFlame(r.x + rand(-4, 4), r.y + rand(-4, 4),
            -r.vx * 0.05 + rand(-40, 40), -r.vy * 0.05 + rand(-40, 40),
            rand(4, 9), rand(0.2, 0.42));
          if (Math.random() < 0.3) {
            addSmoke(r.x, r.y, rand(-20, 20), rand(-40, -10), rand(6, 14), rand(0.4, 0.9));
          }
        }

        // برخورد با ماشین‌ها
        for (const car of state.cars) {
          if (car.dead) continue;
          const lp = carLocal(car, r.x, r.y);
          const geo = CarArt.geometry(car.model);
          if (lp.x < geo.minX || lp.x > geo.maxX || lp.y < geo.minY || lp.y > 2) continue;
          // چند نقطه از محیط سنگ را هم تست می‌کنیم تا برخورد منصفانه‌تر باشد
          const rr = r.r * 1.0;
          const probes = [[0, 0], [rr, 0], [-rr, 0], [0, rr], [0, -rr],
                          [rr * 0.7, rr * 0.7], [-rr * 0.7, rr * 0.7],
                          [rr * 0.7, -rr * 0.7], [-rr * 0.7, -rr * 0.7]];
          let hitGlassIdx = -1;
          let hitPt = null;
          for (let k = 0; k < probes.length && hitGlassIdx < 0; k++) {
            const qx = lp.x + probes[k][0], qy = lp.y + probes[k][1];
            for (let gi = 0; gi < 2; gi++) {
              if (!car.glass[gi].broken && pointInPoly(qx, qy, geo.glass[gi])) {
                hitGlassIdx = gi;
                hitPt = [qx, qy];
                break;
              }
            }
          }
          if (hitGlassIdx >= 0) {
            hitGlass(car, hitGlassIdx, hitPt);
            dead = true;
            break;
          }
          // برخورد با بدنه
          if (pointInPoly(lp.x, lp.y, geo.body) || lp.y > -geo.H * 0.1) {
            hitBody(car, r);
            dead = true;
            break;
          }
        }

        if (r.x > W + 120 || r.x < -120 || r.y > H + 120) dead = true;
      }
      if (dead) state.rocks.splice(i, 1);
    }
  }

  /* ================= به‌روزرسانی دنیا ================= */
  function updateCars(dt) {
    const playing = state.mode === 'playing';
    for (let i = state.cars.length - 1; i >= 0; i--) {
      const c = state.cars[i];

      if (c.dead) {
        c.deadT += dt;
        c.angle += c.spinV * dt;
        c.spinV *= 1 - 0.7 * dt;
        c.vy += 780 * dt;
        c.x += c.vx * dt;
        c.y += c.vy * dt;
        c.vx *= 1 - 0.35 * dt;
        c.wheelRot += c.vx * dt / 22;
        if (Math.random() < 0.55) {
          addSmoke(c.x + rand(-40, 40) * c.scale, c.y - rand(10, 60) * c.scale,
            rand(-40, 40), rand(-90, -20), rand(12, 30), rand(0.6, 1.4), Math.random() < 0.4);
        }
        if (Math.random() < 0.4) {
          addFlame(c.x + rand(-50, 50) * c.scale, c.y - rand(10, 50) * c.scale,
            rand(-60, 60), rand(-120, -30), rand(6, 14), rand(0.2, 0.45));
        }
        if (c.y > H + 260 || c.x < -700) state.cars.splice(i, 1);
        continue;
      }

      c.x += c.vx * dt;
      c.wheelRot += c.vx * dt / (c.model.h * 0.17);
      c.hitFlash = Math.max(0, c.hitFlash - dt * 2.2);
      c.glow += dt;

      // تلوتلو بعد از شکستن یک شیشه
      if (c.hits > 0) {
        c.angle = Math.sin(state.t * 9 + c.glow) * 0.05;
        c.y = LANES[c.lane].baseline + Math.sin(state.t * 11 + c.glow) * 2.5;
      }

      if (c.x < -520) {
        state.cars.splice(i, 1);
        if (playing && state.combo > 0) {
          state.combo = 0;
          updateComboDom();
        }
      }
    }
  }

  function trafficTick(dt) {
    if (state.mode !== 'playing' && state.mode !== 'menu') return;
    state.spawnT -= dt;
    if (state.spawnT > 0) return;
    const diff = state.mode === 'playing' ? 1 - state.timeLeft / TIME_TOTAL : 0.15;
    state.spawnT = lerp(1.55, 0.62, clamp(diff, 0, 1)) * rand(0.8, 1.25);
    spawnCar();
    if (Math.random() < 0.28) spawnCar();
  }

  function updateParticles(dt) {
    for (let i = state.parts.length - 1; i >= 0; i--) {
      const p = state.parts[i];
      p.life -= dt;
      if (p.life <= 0) { state.parts.splice(i, 1); continue; }
      p.vy += (p.gravity || 0) * dt;
      if (p.drag) {
        const d = Math.exp(-p.drag * dt);
        p.vx *= d; p.vy *= d;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += (p.rotV || 0) * dt;
    }
    for (let i = state.texts.length - 1; i >= 0; i--) {
      const t = state.texts[i];
      t.life -= dt;
      t.y -= 42 * dt;
      if (t.life <= 0) state.texts.splice(i, 1);
    }
  }

  function updateAim(dt) {
    const c = state.charge;
    if (!c.active) return;
    c.power = clamp((performance.now() - c.start) / 640, 0, 1);
    const dx = c.px - ORIGIN.x;
    const dy = c.py - ORIGIN.y;
    let ang = Math.atan2(-dy, dx);
    if (dx < 0) ang = 1.45;
    c.ang = clamp(ang, 0.06, 1.46);
  }

  function update(dt) {
    state.t += dt * state.timeScale;

    // زمان بازی
    if (state.mode === 'playing') {
      state.timeLeft -= dt;
      if (state.timeLeft <= 0) {
        state.timeLeft = 0;
        endGame();
      }
      const secs = Math.ceil(state.timeLeft);
      if (secs <= 10 && secs !== state.lastBeep && secs > 0) {
        state.lastBeep = secs;
        SFX.ui();
      }
      updateHudTime();
    }

    // مقیاس زمان (اسلوموشن)
    if (state.slow > 0) {
      state.slow -= dt;
      state.timeScale = 0.32;
    } else {
      state.timeScale += (1 - state.timeScale) * Math.min(1, dt * 5);
    }

    const gdt = dt * state.timeScale;

    updateCars(gdt);
    updateRocks(gdt);
    updateParticles(gdt);
    updateAim(dt);
    trafficTick(dt);

    // مهمات
    if (state.mode === 'playing' && state.ammo < AMMO_MAX) {
      state.ammoT += dt;
      if (state.ammoT >= AMMO_REGEN) {
        state.ammoT = 0;
        state.ammo++;
        updateAmmoDom();
      }
    }

    state.scroll += dt * 120;
    state.roadScroll += dt * 430;

    state.shake *= Math.exp(-7 * dt);
    if (state.shake < 0.2) state.shake = 0;
    state.shakeX = rand(-1, 1) * state.shake;
    state.shakeY = rand(-1, 1) * state.shake;
    state.flash = Math.max(0, state.flash - dt * 2.4);
    state.kick = Math.max(0, state.kick - dt * 4);
    if (state.hintT > 0) {
      state.hintT -= dt;
      if (state.hintT <= 0) el.hint.classList.add('hidden');
    }
  }

  /* ================= رسم پس‌زمینه ================= */
  function drawSky(t) {
    const g = ctx.createLinearGradient(0, 0, 0, ROAD_TOP + 60);
    g.addColorStop(0, '#0a0a20');
    g.addColorStop(0.28, '#1c1033');
    g.addColorStop(0.52, '#43193f');
    g.addColorStop(0.72, '#8c2f3f');
    g.addColorStop(0.88, '#d95a2b');
    g.addColorStop(1, '#f08a3c');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, ROAD_TOP + 70);

    // ستاره‌ها
    for (const s of stars) {
      const a = s.a * (0.55 + 0.45 * Math.sin(t * 1.6 + s.p));
      ctx.globalAlpha = a * clamp(1 - s.y / 330, 0, 1);
      ctx.fillStyle = '#fff6e8';
      ctx.fillRect(s.x, s.y, s.s, s.s);
    }
    ctx.globalAlpha = 1;

    // خورشید
    const sx = 930, sy = 398;
    const sg = ctx.createRadialGradient(sx, sy, 10, sx, sy, 300);
    sg.addColorStop(0, 'rgba(255,225,170,.95)');
    sg.addColorStop(0.16, 'rgba(255,160,70,.55)');
    sg.addColorStop(0.5, 'rgba(255,110,50,.18)');
    sg.addColorStop(1, 'rgba(255,90,40,0)');
    ctx.fillStyle = sg;
    ctx.fillRect(sx - 320, sy - 320, 640, 640);

    ctx.beginPath();
    ctx.arc(sx, sy, 54, 0, TAU);
    ctx.fillStyle = 'rgba(255,236,190,.85)';
    ctx.fill();

    // مه افق
    const hz = ctx.createLinearGradient(0, ROAD_TOP - 120, 0, ROAD_TOP + 30);
    hz.addColorStop(0, 'rgba(255,120,60,0)');
    hz.addColorStop(0.7, 'rgba(255,130,70,.18)');
    hz.addColorStop(1, 'rgba(255,150,90,.30)');
    ctx.fillStyle = hz;
    ctx.fillRect(0, ROAD_TOP - 120, W, 150);
  }

  const speckles = (() => {
    const r = makeRng(1234), out = [];
    for (let i = 0; i < 260; i++) {
      out.push({
        x: r() * W,
        y: ROAD_TOP + r() * (ROAD_BOT - ROAD_TOP),
        s: r() < 0.8 ? 1 : 2,
        a: 0.02 + r() * 0.07
      });
    }
    return out;
  })();

  function drawCity(city, offset, alpha, baseColor, warm, t) {
    const off = ((offset % city.tile) + city.tile) % city.tile;
    for (let k = -1; k <= 1; k++) {
      for (const b of city.items) {
        const x = b.x + k * city.tile - off;
        if (x > W + 40 || x + b.w < -40) continue;
        const y = ROAD_TOP + 4 - b.h;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = baseColor;
        ctx.fillRect(x, y, b.w, b.h + 10);
        if (b.ant) {
          ctx.fillRect(x + b.w * 0.5 - 1, y - 22, 2, 22);
          ctx.fillStyle = 'rgba(255,80,60,.7)';
          ctx.fillRect(x + b.w * 0.5 - 2, y - 25, 4, 4);
          ctx.fillStyle = baseColor;
        }
        // پنجره‌ها
        for (const w of b.wins) {
          let a = w.a;
          if (w.bl) a *= 0.35 + 0.65 * (Math.sin(t * 6 + x) > 0.4 ? 1 : 0.15);
          ctx.globalAlpha = alpha * a;
          ctx.fillStyle = w.c === 'warm' ? warm : '#8fc6ff';
          ctx.fillRect(x + w.x, y + w.y, w.w, w.h);
        }
      }
    }
    ctx.globalAlpha = 1;
  }

  function drawFarWall() {
    const top = ROAD_TOP - 26;
    const g = ctx.createLinearGradient(0, top, 0, ROAD_TOP + 2);
    g.addColorStop(0, '#221a30');
    g.addColorStop(0.6, '#171225');
    g.addColorStop(1, '#0f0b18');
    ctx.fillStyle = g;
    ctx.fillRect(0, top, W, 28);

    // لبه‌ی روشن
    ctx.fillStyle = 'rgba(255,180,120,.35)';
    ctx.fillRect(0, top, W, 2);

    // ستون‌های جداکننده
    const spacing = 148;
    const off = ((state.roadScroll * 0.62) % spacing + spacing) % spacing;
    for (let x = -spacing; x < W + spacing; x += spacing) {
      const px = x - off;
      ctx.fillStyle = 'rgba(0,0,0,.35)';
      ctx.fillRect(px, top + 2, 3, 26);
      // شبرنگ قرمز
      ctx.fillStyle = 'rgba(255,70,50,.55)';
      ctx.fillRect(px + 8, top + 8, 10, 4);
    }
  }

  function drawRoad() {
    // آسفالت
    const g = ctx.createLinearGradient(0, ROAD_TOP, 0, ROAD_BOT);
    g.addColorStop(0, '#2b2138');
    g.addColorStop(0.32, '#2a2338');
    g.addColorStop(0.7, '#322b42');
    g.addColorStop(1, '#3b3350');
    ctx.fillStyle = g;
    ctx.fillRect(0, ROAD_TOP, W, ROAD_BOT - ROAD_TOP);

    // بازتاب گرم افق روی آسفالت
    const refl = ctx.createLinearGradient(0, ROAD_TOP, 0, ROAD_TOP + 70);
    refl.addColorStop(0, 'rgba(255,150,80,.16)');
    refl.addColorStop(1, 'rgba(255,120,60,0)');
    ctx.fillStyle = refl;
    ctx.fillRect(0, ROAD_TOP, W, 70);

    // دانه‌های آسفالت
    for (const s of speckles) {
      ctx.globalAlpha = s.a;
      ctx.fillStyle = '#fff';
      ctx.fillRect(s.x, s.y, s.s, s.s);
    }
    ctx.globalAlpha = 1;

    // لاین دور (تیره‌تر = عمق)
    const far = ctx.createLinearGradient(0, ROAD_TOP, 0, 556);
    far.addColorStop(0, 'rgba(0,0,0,.20)');
    far.addColorStop(1, 'rgba(0,0,0,.02)');
    ctx.fillStyle = far;
    ctx.fillRect(0, ROAD_TOP, W, 132);

    // خط جداکننده‌ی لاین‌ها
    const dash = 70, gap = 44, spacing = dash + gap;
    const off = ((state.roadScroll) % spacing + spacing) % spacing;
    for (let x = -spacing; x < W + spacing; x += spacing) {
      const dx = x - off;
      ctx.fillStyle = 'rgba(255,228,175,.55)';
      ctx.fillRect(dx, 556, dash, 4);
      ctx.fillStyle = 'rgba(255,228,175,.10)';
      ctx.fillRect(dx, 560, dash, 3);
    }

    // خط لبه‌ی نزدیک
    ctx.fillStyle = 'rgba(255,228,175,.40)';
    ctx.fillRect(0, ROAD_BOT - 10, W, 4);

    // رگه‌های سرعت
    for (let i = 0; i < 18; i++) {
      const seed = i * 137.5;
      const y = ROAD_TOP + 20 + ((seed * 7.3) % (ROAD_BOT - ROAD_TOP - 40));
      const len = 40 + ((seed * 3.1) % 120);
      const x = W - ((state.roadScroll * (1.4 + (i % 3) * 0.3) + seed * 40) % (W + 300));
      ctx.globalAlpha = 0.06 + (i % 4) * 0.025;
      ctx.fillStyle = '#fff';
      ctx.fillRect(x, y, len, 1.8);
    }
    ctx.globalAlpha = 1;
  }

  function drawLamps() {
    const spacing = 430;
    const off = ((state.roadScroll * 0.9) % spacing + spacing) % spacing;
    const H_POLE = 176;
    for (let i = -1; i < W / spacing + 2; i++) {
      const x = i * spacing + 170 - off;
      if (x < -120 || x > W + 120) continue;
      const baseY = ROAD_TOP + 6;
      const headY = baseY - H_POLE;
      const headX = x - 44;

      // ستون
      ctx.fillStyle = '#0d0a15';
      ctx.fillRect(x - 3.5, headY, 7, H_POLE);
      ctx.fillRect(headX, headY - 2, 48, 6);
      ctx.fillStyle = 'rgba(255,170,100,.22)';
      ctx.fillRect(x + 2.5, headY, 1.4, H_POLE);

      // نور چراغ
      const halo = ctx.createRadialGradient(headX + 2, headY + 6, 2, headX + 2, headY + 6, 70);
      halo.addColorStop(0, 'rgba(255,235,190,.95)');
      halo.addColorStop(0.18, 'rgba(255,190,110,.55)');
      halo.addColorStop(1, 'rgba(255,170,90,0)');
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(headX + 2, headY + 6, 70, 0, TAU);
      ctx.fill();

      ctx.beginPath();
      ctx.ellipse(headX + 2, headY + 6, 12, 5, 0, 0, TAU);
      ctx.fillStyle = '#1a1522';
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(headX + 2, headY + 7, 8.5, 3.4, 0, 0, TAU);
      ctx.fillStyle = '#fff3cf';
      ctx.fill();

      // مخروط نور (فقط روی آسفالت)
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, ROAD_TOP, W, ROAD_BOT - ROAD_TOP);
      ctx.clip();
      const lg = ctx.createLinearGradient(0, headY, 0, baseY + 90);
      lg.addColorStop(0, 'rgba(255,205,130,.22)');
      lg.addColorStop(0.5, 'rgba(255,190,110,.10)');
      lg.addColorStop(1, 'rgba(255,180,100,0)');
      ctx.fillStyle = lg;
      ctx.beginPath();
      ctx.moveTo(headX - 4, headY + 6);
      ctx.lineTo(headX + 8, headY + 6);
      ctx.lineTo(x + 110, baseY + 96);
      ctx.lineTo(x - 130, baseY + 96);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // برکه‌ی نور روی آسفالت
      ctx.save();
      ctx.translate(x, 604);
      ctx.scale(1, 0.42);
      const pool = ctx.createRadialGradient(0, 0, 8, 0, 0, 150);
      pool.addColorStop(0, 'rgba(255,200,130,.18)');
      pool.addColorStop(0.5, 'rgba(255,180,110,.08)');
      pool.addColorStop(1, 'rgba(255,170,90,0)');
      ctx.fillStyle = pool;
      ctx.beginPath();
      ctx.arc(0, 0, 150, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawSidewalk() {
    const g = ctx.createLinearGradient(0, SIDEWALK, 0, H);
    g.addColorStop(0, '#241d31');
    g.addColorStop(0.35, '#171227');
    g.addColorStop(1, '#0a0812');
    ctx.fillStyle = g;
    ctx.fillRect(0, SIDEWALK, W, H - SIDEWALK);

    // جدول
    ctx.fillStyle = 'rgba(255,190,130,.45)';
    ctx.fillRect(0, SIDEWALK, W, 2.5);
    ctx.fillStyle = 'rgba(255,255,255,.06)';
    ctx.fillRect(0, SIDEWALK + 3, W, 9);

    // خط‌کشی پیاده‌رو
    const spacing = 150;
    const off = ((state.roadScroll * 0.5) % spacing + spacing) % spacing;
    ctx.strokeStyle = 'rgba(255,255,255,.06)';
    ctx.lineWidth = 2;
    for (let x = -spacing; x < W + spacing; x += spacing) {
      ctx.beginPath();
      ctx.moveTo(x - off, SIDEWALK + 12);
      ctx.lineTo(x - off - 40, H);
      ctx.stroke();
    }
  }

  /* ================= رسم بازیکن و تیرکمان ================= */
  function drawPlayer() {
    const px = PLAYER.x, py = PLAYER.y;
    const idle = Math.sin(state.t * 2.2) * 2;

    // برکه‌ی نور زیر پای بازیکن
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.translate(px + 18, py - 6);
    ctx.scale(1, 0.34);
    const gl = ctx.createRadialGradient(0, 0, 4, 0, 0, 165);
    gl.addColorStop(0, 'rgba(255,190,120,.22)');
    gl.addColorStop(0.55, 'rgba(255,150,80,.08)');
    gl.addColorStop(1, 'rgba(255,140,70,0)');
    ctx.fillStyle = gl;
    ctx.beginPath();
    ctx.arc(0, 0, 165, 0, TAU);
    ctx.fill();
    ctx.restore();

    // سکو / جدول کوچکی که بازیکن رویش ایستاده
    ctx.save();
    const pg = ctx.createLinearGradient(0, py, 0, py + 22);
    pg.addColorStop(0, '#2a2438');
    pg.addColorStop(1, '#100c1a');
    ctx.fillStyle = pg;
    ctx.fillRect(px - 46, py, 132, 22);
    ctx.fillStyle = 'rgba(255,190,130,.35)';
    ctx.fillRect(px - 46, py, 132, 2);
    ctx.restore();

    // سایه
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = '#05040a';
    ctx.beginPath();
    ctx.ellipse(px + 14, py - 2, 48, 12, 0, 0, TAU);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(px, py + idle * 0.4);
    ctx.scale(1.3, 1.3);

    // پاها
    ctx.fillStyle = '#14111c';
    ctx.beginPath();
    ctx.moveTo(-16, 0); ctx.lineTo(-2, 0); ctx.lineTo(0, -44); ctx.lineTo(-18, -44);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(8, 0); ctx.lineTo(24, 0); ctx.lineTo(22, -44); ctx.lineTo(4, -44);
    ctx.closePath(); ctx.fill();

    // بدن / هودی
    const bg = ctx.createLinearGradient(-20, -110, 26, -40);
    bg.addColorStop(0, '#3b3050');
    bg.addColorStop(0.45, '#241d34');
    bg.addColorStop(1, '#120f1e');
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.moveTo(-20, -40);
    ctx.quadraticCurveTo(-26, -78, -14, -96);
    ctx.quadraticCurveTo(0, -106, 16, -96);
    ctx.quadraticCurveTo(26, -78, 22, -40);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,150,80,.34)';
    ctx.lineWidth = 1.8;
    ctx.stroke();

    // رگه‌ی نارنجی روی هودی
    ctx.strokeStyle = 'rgba(255,130,50,.75)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-14, -58);
    ctx.quadraticCurveTo(0, -50, 15, -60);
    ctx.stroke();

    // کاپشن / زره
    ctx.fillStyle = 'rgba(255,255,255,.05)';
    ctx.beginPath();
    ctx.moveTo(-18, -44);
    ctx.quadraticCurveTo(0, -38, 20, -46);
    ctx.lineTo(20, -70);
    ctx.quadraticCurveTo(0, -64, -18, -72);
    ctx.closePath();
    ctx.fill();

    // دست عقب
    ctx.strokeStyle = '#15121f';
    ctx.lineWidth = 13;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-8, -88);
    ctx.quadraticCurveTo(-22, -76, -20, -62);
    ctx.stroke();

    // سر + کلاه
    ctx.fillStyle = '#0f0c17';
    ctx.beginPath();
    ctx.arc(2, -110, 15, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-14, -110);
    ctx.quadraticCurveTo(-16, -132, 4, -128);
    ctx.quadraticCurveTo(20, -126, 16, -108);
    ctx.quadraticCurveTo(8, -118, -14, -110);
    ctx.closePath();
    ctx.fillStyle = '#1b1626';
    ctx.fill();

    // چشم‌های درخشان
    ctx.save();
    ctx.shadowColor = 'rgba(255,150,50,.95)';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#ffb257';
    ctx.beginPath();
    ctx.arc(9, -109, 2.2, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(15, -108, 2.2, 0, TAU);
    ctx.fill();
    ctx.restore();

    ctx.restore();

    // ---- دست جلو + تیرکمان ----
    const shoulder = { x: px + 10, y: py - 88 * 1.3 + idle * 0.4 };
    ctx.save();
    ctx.strokeStyle = '#231d31';
    ctx.lineWidth = 13;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(shoulder.x, shoulder.y);
    ctx.lineTo(ORIGIN.x - 3, ORIGIN.y + 14);
    ctx.stroke();
    // دست
    ctx.fillStyle = '#2c2438';
    ctx.beginPath();
    ctx.arc(ORIGIN.x - 3, ORIGIN.y + 14, 7.5, 0, TAU);
    ctx.fill();
    ctx.restore();

    drawSling();
  }

  function drawSling() {
    const c = state.charge;
    const ang = c.ang;
    const backX = -Math.cos(ang), backY = Math.sin(ang);
    const pull = 10 + (c.active ? c.power * 30 : 0) + state.kick * 6;
    const pouch = { x: ORIGIN.x + backX * pull, y: ORIGIN.y + backY * pull };

    const base = { x: ORIGIN.x, y: ORIGIN.y + 20 };
    const tipA = { x: ORIGIN.x - 11, y: ORIGIN.y - 14 };
    const tipB = { x: ORIGIN.x + 11, y: ORIGIN.y - 14 };

    // بندها
    ctx.strokeStyle = 'rgba(200,60,50,.85)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(tipA.x, tipA.y); ctx.lineTo(pouch.x, pouch.y);
    ctx.moveTo(tipB.x, tipB.y); ctx.lineTo(pouch.x, pouch.y);
    ctx.stroke();

    // چوب Y
    ctx.strokeStyle = '#6d4a2c';
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(base.x, base.y);
    ctx.lineTo(ORIGIN.x, ORIGIN.y + 2);
    ctx.moveTo(ORIGIN.x, ORIGIN.y + 2); ctx.lineTo(tipA.x, tipA.y);
    ctx.moveTo(ORIGIN.x, ORIGIN.y + 2); ctx.lineTo(tipB.x, tipB.y);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,200,140,.25)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // سنگ درون بند
    if (state.ammo > 0) {
      drawRockShape(pouch.x, pouch.y, 9, state.t * 2);

      if (c.active) {
        ctx.save();
        ctx.globalAlpha = 0.5 + c.power * 0.5;
        const g = ctx.createRadialGradient(pouch.x, pouch.y, 2, pouch.x, pouch.y, 30 + c.power * 40);
        g.addColorStop(0, 'rgba(255,220,140,.85)');
        g.addColorStop(0.4, 'rgba(255,120,30,.45)');
        g.addColorStop(1, 'rgba(255,80,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(pouch.x, pouch.y, 30 + c.power * 40, 0, TAU);
        ctx.fill();
        ctx.restore();
      }
    }

    // حلقه‌ی قدرت دور سنگ
    if (c.active) {
      ctx.save();
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(10,6,16,.65)';
      ctx.beginPath();
      ctx.arc(pouch.x, pouch.y, 24, 0, TAU);
      ctx.stroke();
      const pg = ctx.createLinearGradient(pouch.x - 24, pouch.y - 24, pouch.x + 24, pouch.y + 24);
      pg.addColorStop(0, '#ffe6a8');
      pg.addColorStop(0.55, '#ff9a2e');
      pg.addColorStop(1, '#ff3b0d');
      ctx.strokeStyle = pg;
      ctx.beginPath();
      ctx.arc(pouch.x, pouch.y, 24, -Math.PI / 2, -Math.PI / 2 + TAU * c.power);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawRockShape(x, y, r, rot) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);

    // شعله پشت سنگ
    const g = ctx.createRadialGradient(0, 0, r * 0.2, 0, 0, r * 2.6);
    g.addColorStop(0, 'rgba(255,200,90,.55)');
    g.addColorStop(0.45, 'rgba(255,110,20,.30)');
    g.addColorStop(1, 'rgba(255,60,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, r * 2.6, 0, TAU);
    ctx.fill();

    // بدنه‌ی سنگ
    ctx.beginPath();
    const n = 7;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU;
      const rr = r * (0.8 + 0.32 * Math.abs(Math.sin(i * 2.7)));
      const px = Math.cos(a) * rr, py = Math.sin(a) * rr;
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.closePath();
    const sg = ctx.createLinearGradient(-r, -r, r, r);
    sg.addColorStop(0, '#5b5468');
    sg.addColorStop(0.5, '#332e3e');
    sg.addColorStop(1, '#171420');
    ctx.fillStyle = sg;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,150,60,.55)';
    ctx.lineWidth = 1.4;
    ctx.stroke();

    // شکاف‌های گداخته
    ctx.strokeStyle = 'rgba(255,170,60,.9)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-r * 0.5, -r * 0.2);
    ctx.lineTo(0, r * 0.15);
    ctx.lineTo(r * 0.45, -r * 0.35);
    ctx.stroke();

    ctx.restore();
  }

  /* ================= رسم ماشین‌ها ================= */
  function drawCarShadow(car) {
    const L = car.model.len * car.scale;
    const sc = car.scale;

    // نور چراغ جلو روی آسفالت (سمت چپ = جلوی ماشین)
    if (!car.dead) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.translate(car.x - L * 0.72, car.y - 2 * sc);
      ctx.scale(1, 0.3);
      const fg = ctx.createRadialGradient(0, 0, 4, 0, 0, L * 0.62);
      fg.addColorStop(0, 'rgba(255,225,170,.30)');
      fg.addColorStop(0.5, 'rgba(255,190,120,.10)');
      fg.addColorStop(1, 'rgba(255,170,90,0)');
      ctx.fillStyle = fg;
      ctx.beginPath();
      ctx.arc(0, 0, L * 0.62, 0, TAU);
      ctx.fill();
      ctx.restore();

      // درخشش سرخ چراغ عقب
      const rg = ctx.createRadialGradient(car.x + L * 0.44, car.y - 6 * sc, 2,
        car.x + L * 0.44, car.y - 6 * sc, L * 0.26);
      rg.addColorStop(0, 'rgba(255,60,40,.35)');
      rg.addColorStop(1, 'rgba(255,40,20,0)');
      ctx.fillStyle = rg;
      ctx.beginPath();
      ctx.arc(car.x + L * 0.44, car.y - 6 * sc, L * 0.26, 0, TAU);
      ctx.fill();
      ctx.restore();
    }

    // سایه‌ی تماس
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = '#08060d';
    ctx.beginPath();
    ctx.ellipse(car.x, car.y + 2, L * 0.5, 10 * sc, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  function drawBadges(car, t) {
    if (car.dead) return;
    const topY = car.y - car.model.h * 1.42 * car.scale;
    if (car.golden) {
      const pulse = 0.7 + 0.3 * Math.sin(t * 6 + car.glow);
      ctx.save();
      ctx.globalAlpha = pulse;
      ctx.shadowColor = 'rgba(255,200,80,.9)';
      ctx.shadowBlur = 18;
      drawStar(car.x, topY, 9, '#ffd45e');
      ctx.restore();
    }
    if (car.armed) {
      ctx.save();
      ctx.globalAlpha = 0.9;
      ctx.translate(car.x + (car.golden ? 26 : 0), topY);
      ctx.beginPath();
      ctx.moveTo(0, -9);
      ctx.lineTo(8, -5);
      ctx.lineTo(8, 3);
      ctx.quadraticCurveTo(0, 11, -8, 3);
      ctx.lineTo(-8, -5);
      ctx.closePath();
      ctx.fillStyle = 'rgba(90,170,255,.85)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(220,240,255,.9)';
      ctx.lineWidth = 1.3;
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawStar(cx, cy, r, color) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const rr = i % 2 === 0 ? r : r * 0.45;
      const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }

  function drawCars() {
    const far = [], near = [];
    for (const c of state.cars) (c.lane === 0 ? far : near).push(c);
    for (const c of far) { drawCarShadow(c); CarArt.draw(ctx, c, state.t); drawBadges(c, state.t); }
    for (const c of near) { drawCarShadow(c); CarArt.draw(ctx, c, state.t); drawBadges(c, state.t); }
  }

  /* ================= رسم ذرات ================= */
  function drawParticles() {
    // لایه‌ی معمولی
    for (const p of state.parts) {
      const a = p.life / p.max;
      if (p.type === 'smoke') {
        ctx.globalAlpha = a * 0.26;
        ctx.fillStyle = p.dark ? '#141018' : '#9a8f9e';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (1.7 - a * 0.7), 0, TAU);
        ctx.fill();
      } else if (p.type === 'glassbit') {
        ctx.save();
        ctx.globalAlpha = clamp(a * 1.4, 0, 1);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = 'rgba(190,230,255,.85)';
        ctx.beginPath();
        ctx.moveTo(-p.size * 0.5, -p.size * 0.5);
        ctx.lineTo(p.size * 0.6, -p.size * 0.2);
        ctx.lineTo(p.size * 0.1, p.size * 0.6);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    }
    ctx.globalAlpha = 1;

    // لایه‌ی نورانی
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const p of state.parts) {
      const a = p.life / p.max;
      if (p.type === 'flame') {
        const t = 1 - a;
        const r = p.size * (0.4 + a * 0.9);
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 2);
        if (a > 0.6) {
          g.addColorStop(0, 'rgba(255,255,220,' + (a * 0.95) + ')');
          g.addColorStop(0.4, 'rgba(255,190,70,' + (a * 0.7) + ')');
          g.addColorStop(1, 'rgba(255,90,0,0)');
        } else {
          g.addColorStop(0, 'rgba(255,150,40,' + (a * 0.8) + ')');
          g.addColorStop(0.5, 'rgba(230,70,10,' + (a * 0.5) + ')');
          g.addColorStop(1, 'rgba(120,20,0,0)');
        }
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r * 2, 0, TAU);
        ctx.fill();
      } else if (p.type === 'spark') {
        ctx.globalAlpha = a;
        ctx.strokeStyle = p.color || '#ffd27a';
        ctx.lineWidth = p.size;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 0.022, p.y - p.vy * 0.022);
        ctx.stroke();
      } else if (p.type === 'ring') {
        ctx.globalAlpha = a * 0.6;
        ctx.strokeStyle = p.ringColor;
        ctx.lineWidth = 2.5 * a + 0.8;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (1.15 - a * 0.9), 0, TAU);
        ctx.stroke();
      }
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function drawTexts() {
    for (const t of state.texts) {
      const a = clamp(t.life / t.max * 1.6, 0, 1);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.font = '900 ' + t.size + 'px Vazirmatn, Tahoma, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(10,6,14,.75)';
      ctx.strokeText(t.txt, t.x, t.y);
      ctx.fillStyle = t.color;
      ctx.fillText(t.txt, t.x, t.y);
      ctx.restore();
    }
  }

  /* ================= نشانه‌گیری ================= */
  function drawAim() {
    const c = state.charge;
    if (!c.active) return;

    const v = launchVec(c.power);
    let x = ORIGIN.x, y = ORIGIN.y, vy = v.vy;
    const h = 1 / 60;
    const pts = [];
    for (let i = 0; i < 140; i++) {
      vy += GRAV * h;
      x += v.vx * h;
      y += vy * h;
      if (y > H + 40 || x > W + 80) break;
      pts.push({ x: x, y: y });
    }

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < pts.length; i += 2) {
      const p = pts[i];
      const k = i / Math.max(1, pts.length - 1);
      ctx.globalAlpha = 0.85 * (1 - k * 0.75);
      ctx.fillStyle = '#ffdca6';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3.6 - k * 1.6, 0, TAU);
      ctx.fill();
    }
    // حلقه‌ی نقطه‌ی پایان
    if (pts.length) {
      const last = pts[pts.length - 1];
      const pulse = 1 + 0.12 * Math.sin(performance.now() / 90);
      ctx.globalAlpha = 0.7;
      ctx.strokeStyle = '#ffb45e';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(last.x, last.y, 12 * pulse, 0, TAU);
      ctx.stroke();
    }
    ctx.restore();

    // نشانگر
    const px = c.px, py = c.py;
    const hot = clamp(c.power, 0, 1);
    ctx.save();
    ctx.translate(px, py);
    ctx.strokeStyle = `rgba(255,${Math.round(160 + 70 * hot)},${Math.round(90 - 60 * hot)},.95)`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 13 + hot * 5, 0, TAU);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-22, 0); ctx.lineTo(-8, 0);
    ctx.moveTo(8, 0); ctx.lineTo(22, 0);
    ctx.moveTo(0, -22); ctx.lineTo(0, -8);
    ctx.moveTo(0, 8); ctx.lineTo(0, 22);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,140,50,.9)';
    ctx.beginPath();
    ctx.arc(0, 0, 2.5, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  function drawVignette() {
    const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.92);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,.62)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    if (state.flash > 0.01) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = state.flash * 0.35;
      const fg = ctx.createRadialGradient(W / 2, H / 2, 40, W / 2, H / 2, H);
      fg.addColorStop(0, 'rgba(255,190,120,.9)');
      fg.addColorStop(1, 'rgba(255,80,20,0)');
      ctx.fillStyle = fg;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
  }

  /* ================= رندر ================= */
  function render(t) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    ctx.save();
    ctx.translate(state.shakeX, state.shakeY);

    drawSky(t);
    drawCity(farCity, state.scroll * 0.5, 0.75, '#150f26', '#ffcf8a', t);
    drawCity(midCity, state.scroll * 1.1, 0.92, '#0d0917', '#ffb060', t);
    drawFarWall();
    drawRoad();
    drawLamps();
    drawCars();
    drawSidewalk();
    drawPlayer();

    // سنگ‌ها
    for (const r of state.rocks) {
      // دنباله‌ی نور
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createLinearGradient(r.x, r.y, r.x - r.vx * 0.045, r.y - r.vy * 0.045);
      g.addColorStop(0, 'rgba(255,190,80,.75)');
      g.addColorStop(1, 'rgba(255,60,0,0)');
      ctx.strokeStyle = g;
      ctx.lineWidth = 14;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(r.x, r.y);
      ctx.lineTo(r.x - r.vx * 0.045, r.y - r.vy * 0.045);
      ctx.stroke();
      ctx.restore();
      drawRockShape(r.x, r.y, r.r, r.rot);
    }

    drawParticles();
    drawTexts();
    drawAim();
    ctx.restore();

    drawVignette();
  }

  /* ================= HUD ================= */
  let lastScoreTxt = '', lastTimeTxt = '';
  function updateScoreDom() {
    const s = toFa(state.score);
    if (s !== lastScoreTxt) { lastScoreTxt = s; el.score.textContent = s; }
  }
  function updateHudTime() {
    const secs = Math.max(0, Math.ceil(state.timeLeft));
    const txt = toFa(secs);
    if (txt !== lastTimeTxt) {
      lastTimeTxt = txt;
      el.time.textContent = txt;
      el.timePanel.classList.toggle('urgent', secs <= 10);
    }
  }
  function updateComboDom() {
    const mult = Math.min(state.combo, 5);
    if (state.combo >= 2) {
      el.combo.classList.remove('hidden');
      el.comboNum.textContent = toFa(mult);
    } else {
      el.combo.classList.add('hidden');
    }
  }
  function bumpCombo() {
    updateComboDom();
    el.combo.classList.remove('pop');
    void el.combo.offsetWidth;
    el.combo.classList.add('pop');
  }
  function updateAmmoDom() {
    const kids = el.ammo.children;
    for (let i = 0; i < kids.length; i++) {
      kids[i].className = 'rock' + (i < state.ammo ? ' ready' : ' gone');
    }
  }
  function buildAmmoDom() {
    el.ammo.innerHTML = '';
    for (let i = 0; i < AMMO_MAX; i++) {
      const d = document.createElement('div');
      d.className = 'rock';
      el.ammo.appendChild(d);
    }
  }

  /* ================= جریان بازی ================= */
  function resetWorld() {
    state.cars.length = 0;
    state.rocks.length = 0;
    state.parts.length = 0;
    state.texts.length = 0;
    state.score = 0;
    state.combo = 0;
    state.maxCombo = 0;
    state.throws = 0;
    state.disabled = 0;
    state.windowHits = 0;
    state.timeLeft = TIME_TOTAL;
    state.ammo = AMMO_MAX;
    state.ammoT = 0;
    state.timeScale = 1;
    state.slow = 0;
    state.flash = 0;
    state.shake = 0;
    state.spawnT = 0.9;
    state.charge.active = false;
    state.charge.power = 0;
    state.ended = false;
    state.lastBeep = 99;
    lastScoreTxt = ''; lastTimeTxt = '';
    updateScoreDom(); updateHudTime(); updateComboDom(); updateAmmoDom();
  }

  function startGame() {
    audioOn();
    SFX.ui();
    resetWorld();
    state.mode = 'playing';
    el.menu.classList.add('hidden');
    el.over.classList.add('hidden');
    el.pause.classList.add('hidden');
    el.hud.classList.add('live');
    state.hintT = 4.2;
    el.hint.classList.remove('hidden');
    canvas.classList.add('playing');
  }

  function endGame() {
    if (state.ended) return;
    state.ended = true;
    state.mode = 'over';
    state.charge.active = false;

    const acc = state.throws > 0 ? Math.round((state.windowHits / state.throws) * 100) : 0;
    const isRecord = state.score > state.best;
    if (isRecord) {
      state.best = state.score;
      store.set(BEST_KEY, state.best);
    }

    el.finalScore.textContent = toFa(state.score);
    el.newRecord.classList.toggle('hidden', !isRecord);
    el.stCars.textContent = toFa(state.disabled);
    el.stAcc.textContent = toFa(acc) + '٪';
    el.stCombo.textContent = '×' + toFa(Math.min(state.maxCombo, 5));
    el.stBest.textContent = toFa(state.best);
    el.bestMenu.textContent = toFa(state.best);
    el.over.classList.remove('hidden');
    el.hud.classList.remove('live');

    if (isRecord) SFX.record(); else SFX.over();
  }

  function pauseGame() {
    if (state.mode !== 'playing') return;
    state.mode = 'paused';
    state.charge.active = false;
    el.pause.classList.remove('hidden');
  }
  function resumeGame() {
    if (state.mode !== 'paused') return;
    state.mode = 'playing';
    el.pause.classList.add('hidden');
  }

  /* ================= ورودی ================= */
  function onDown(e) {
    audioOn();
    if (state.mode !== 'playing') return;
    const p = pointerPos(e);
    state.charge.active = true;
    state.charge.start = performance.now();
    state.charge.power = 0;
    state.charge.px = p.x;
    state.charge.py = p.y;
    try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
    e.preventDefault();
  }

  function onMove(e) {
    if (!state.charge.active) return;
    const p = pointerPos(e);
    state.charge.px = p.x;
    state.charge.py = p.y;
    e.preventDefault();
  }

  function onUp(e) {
    if (!state.charge.active) return;
    const p = pointerPos(e);
    state.charge.px = p.x;
    state.charge.py = p.y;
    state.charge.active = false;
    if (state.mode === 'playing') throwRock();
    updateAmmoDom();
  }

  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', function () { state.charge.active = false; });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  window.addEventListener('keydown', function (e) {
    if (e.key === ' ' || e.key === 'Enter') {
      if (state.mode === 'menu' || state.mode === 'over') { e.preventDefault(); startGame(); }
      else if (state.mode === 'paused') { e.preventDefault(); resumeGame(); }
    }
    if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
      if (state.mode === 'playing') pauseGame();
      else if (state.mode === 'paused') resumeGame();
    }
    if (e.key === 'm' || e.key === 'M') toggleSound();
    if (e.key === 'r' || e.key === 'R') { if (state.mode === 'playing' || state.mode === 'over') startGame(); }
  });

  function toggleSound() {
    soundOn = !soundOn;
    SFX.setMuted(!soundOn);
    el.btnSound.textContent = soundOn ? '🔊' : '🔇';
    if (soundOn) { audioOn(); SFX.ui(); }
  }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) pauseGame();
  });

  $('btn-start').addEventListener('click', startGame);
  $('btn-again').addEventListener('click', startGame);
  $('btn-menu').addEventListener('click', function () {
    state.mode = 'menu';
    el.over.classList.add('hidden');
    el.menu.classList.remove('hidden');
    el.bestMenu.textContent = toFa(state.best);
  });
  $('btn-pause').addEventListener('click', pauseGame);
  $('btn-resume').addEventListener('click', resumeGame);
  el.btnSound.addEventListener('click', toggleSound);

  /* ================= حلقه ================= */
  let last = performance.now();
  function frame(now) {
    let dt = (now - last) / 1000;
    last = now;
    if (dt > 0.06) dt = 0.06;
    if (dt < 0) dt = 0;

    if (state.mode !== 'paused') update(dt);
    render(now / 1000);
    updateScoreDom();

    requestAnimationFrame(frame);
  }

  /* ================= راه‌اندازی ================= */
  function boot() {
    resize();
    buildAmmoDom();
    updateAmmoDom();
    el.bestMenu.textContent = toFa(state.best);
    el.stBest.textContent = toFa(state.best);
    el.time.textContent = toFa(TIME_TOTAL);
    el.hint.classList.add('hidden');

    // ترافیک پس‌زمینه‌ی منو
    for (let i = 0; i < 3; i++) {
      const c = spawnCar(i % 2);
      if (c) c.x = W + 120 + i * 430;
    }

    requestAnimationFrame(frame);
  }

  window.__GLASSBREAK__ = { state: state, start: startGame };
  boot();
})();
