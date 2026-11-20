/* ===========================================================
   شیشه‌شکن — cars: specs, silhouette drawing, hit panes
   Local car space: width = 1 unit (x: -0.5..0.5), y = 0 at ground,
   negative y goes up. Scale applied by renderer.
   =========================================================== */

const SHAPES = {
  sedan: {
    h: 0.760,
    half: [
      [0.000, -0.072], [0.470, -0.082], [0.498, -0.130], [0.506, -0.230],
      [0.508, -0.330], [0.502, -0.440], [0.487, -0.500], [0.458, -0.540],
      [0.404, -0.596], [0.362, -0.662], [0.336, -0.712], [0.286, -0.741],
      [0.190, -0.756], [0.095, -0.760], [0.000, -0.760]
    ],
    glass: { halfW: 0.362, bot: -0.552, top: -0.714, topRatio: 0.845 },
    lights: { y: -0.462, h: 0.056, w: 0.215 },
    shoulder: -0.478, roofY: -0.760
  },
  suv: {
    h: 0.972,
    half: [
      [0.000, -0.080], [0.474, -0.086], [0.500, -0.130], [0.507, -0.230],
      [0.508, -0.400], [0.504, -0.560], [0.497, -0.700], [0.487, -0.800],
      [0.470, -0.885], [0.462, -0.920], [0.430, -0.944], [0.330, -0.958],
      [0.200, -0.967], [0.090, -0.971], [0.000, -0.972]
    ],
    glass: { halfW: 0.376, bot: -0.702, top: -0.902, topRatio: 0.862 },
    lights: { y: -0.400, h: 0.170, w: 0.072 },
    shoulder: -0.600, roofY: -0.972
  },
  sport: {
    h: 0.646,
    half: [
      [0.000, -0.050], [0.480, -0.056], [0.514, -0.092], [0.526, -0.170],
      [0.530, -0.250], [0.522, -0.340], [0.503, -0.402], [0.470, -0.448],
      [0.424, -0.488], [0.382, -0.540], [0.345, -0.592], [0.300, -0.622],
      [0.215, -0.638], [0.110, -0.645], [0.000, -0.646]
    ],
    glass: { halfW: 0.330, bot: -0.468, top: -0.610, topRatio: 0.830 },
    lights: { y: -0.330, h: 0.044, w: 0.250 },
    shoulder: -0.398, roofY: -0.646
  }
};

const CAR_SPECS = [
  {
    id: 'sclass', name: 'مرسدس بنز کلاس S', short: 'S-Class', badge: 'S',
    shape: 'sedan', value: 150, weight: 10,
    paint: ['#0d1117', '#1d2530', '#080a0e'], trim: '#c9ced6', glassTint: '#1b2a3e',
    light: '#ff2d3d', plate: '#dfe4ea'
  },
  {
    id: 'maybach', name: 'مایباخ S۶۸۰', short: 'Maybach', badge: 'M',
    shape: 'sedan', value: 300, weight: 4,
    paint: ['#3b1e33', '#5c2c4c', '#1d0e19'], trim: '#e8c87a', glassTint: '#22182e',
    light: '#ff3344', plate: '#efe3c2', gold: true
  },
  {
    id: 'gclass', name: 'بنز G-Class', short: 'G-Wagon', badge: 'G',
    shape: 'suv', value: 220, weight: 8,
    paint: ['#14181c', '#2a323a', '#0a0d10'], trim: '#9aa3ad', glassTint: '#16222c',
    light: '#ff3a2a', plate: '#e8e8e8', spare: true
  },
  {
    id: 'range', name: 'رنج روور اتوبیوگرافی', short: 'Range Rover', badge: 'R',
    shape: 'suv', value: 190, weight: 9,
    paint: ['#22262b', '#3c434b', '#12151a'], trim: '#cfd6de', glassTint: '#172331',
    light: '#ff3a2a', plate: '#e2e6ea'
  },
  {
    id: 'urus', name: 'لامبورگینی اوروس', short: 'Urus', badge: 'L',
    shape: 'suv', value: 280, weight: 5,
    paint: ['#d9a316', '#f2c53d', '#8c6608'], trim: '#26282c', glassTint: '#15212e',
    light: '#ff3a2a', plate: '#fff3cf', sporty: true
  },
  {
    id: 'porsche', name: 'پورشه ۹۱۱', short: '911', badge: 'P',
    shape: 'sport', value: 240, weight: 7,
    paint: ['#dfe4ea', '#ffffff', '#9aa4b0'], trim: '#2b3038', glassTint: '#16222f',
    light: '#ff2d3d', plate: '#ffffff', ducktail: true
  },
  {
    id: 'ferrari', name: 'فراری F۸', short: 'F8', badge: 'F',
    shape: 'sport', value: 290, weight: 6,
    paint: ['#b31818', '#e03434', '#6d0b0b'], trim: '#1d1f22', glassTint: '#1a1014',
    light: '#ff4040', plate: '#f6f1e6', ducktail: true
  },
  {
    id: 'bugatti', name: 'بوگاتی شیرون', short: 'Chiron', badge: 'B',
    shape: 'sport', value: 420, weight: 2,
    paint: ['#123a63', '#2a6bb5', '#0a1e36'], trim: '#d6dee7', glassTint: '#101c2e',
    light: '#ff3a4a', plate: '#eaf2ff', ducktail: true, rare: true
  },
  {
    id: 'rolls', name: 'رولز رویس فانتوم', short: 'Phantom', badge: 'RR',
    shape: 'sedan', value: 360, weight: 3,
    paint: ['#eae6dc', '#fffdf6', '#a8a294'], trim: '#b8985a', glassTint: '#1d2530',
    light: '#ff3a3a', plate: '#fffbe9', gold: true
  },
  {
    id: 'maserati', name: 'مازراتی کواتروپورته', short: 'Quattroporte', badge: 'T',
    shape: 'sedan', value: 260, weight: 5,
    paint: ['#1a2b46', '#2f4870', '#0c1523'], trim: '#c3ccd8', glassTint: '#121e2c',
    light: '#ff3344', plate: '#e6edf7'
  },
  {
    id: 'police', name: 'پلیس راهور', short: 'پلیس', badge: 'P',
    shape: 'sedan', value: 450, weight: 2,
    paint: ['#12161c', '#222a35', '#080a0e'], trim: '#e8eef5', glassTint: '#131f2c',
    light: '#ff2233', plate: '#dbe4ee', police: true
  }
];

/* ---------- small canvas helpers ---------- */
function smoothPath(ctx, pts, close = true) {
  const n = pts.length;
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  ctx.beginPath();
  if (!close) {
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < n - 1; i++) {
      const m = mid(pts[i], pts[i + 1]);
      ctx.quadraticCurveTo(pts[i][0], pts[i][1], m[0], m[1]);
    }
    ctx.lineTo(pts[n - 1][0], pts[n - 1][1]);
    return;
  }
  const start = mid(pts[n - 1], pts[0]);
  ctx.moveTo(start[0], start[1]);
  for (let i = 0; i < n; i++) {
    const cur = pts[i], nxt = pts[(i + 1) % n];
    const m = mid(cur, nxt);
    ctx.quadraticCurveTo(cur[0], cur[1], m[0], m[1]);
  }
  ctx.closePath();
}

function trapezoidPath(ctx, x, halfW, top, bot, topRatio) {
  const tw = halfW * topRatio;
  ctx.beginPath();
  ctx.moveTo(x - halfW, bot);
  ctx.lineTo(x + halfW, bot);
  ctx.lineTo(x + tw, top);
  ctx.lineTo(x - tw, top);
  ctx.closePath();
}

/* ---------- Car ---------- */
class Car {
  constructor(spec, opts) {
    this.spec = spec;
    this.shape = SHAPES[spec.shape];
    this.lane = opts.lane;
    this.lateral = opts.lane * 0.66;      // fraction of road half-width
    this.baseLateral = this.lateral;
    this.t = opts.t || 0;
    this.duration = opts.duration;
    this.armored = !!opts.armored;
    this.panes = this.buildPanes();
    this.hp = this.panes.length + (this.armored ? 2 : 0);
    this.maxHp = this.hp;
    this.state = 'drive';
    this.rot = 0; this.rotVel = 0;
    this.tilt = 1;
    this.rollVel = 0;
    this.latVel = 0;
    this.speedMul = 1;
    this.bob = 0;                 // vertical bob offset (derived from phase)
    this.wander = rand(0, TAU);
    this.wanderSpeed = rand(0.7, 1.5);
    this.wobbleAmp = rand(0.012, 0.05);
    this.dents = [];
    this.lightsBroken = false;
    this.smokeTimer = 0;
    this.deadT = 0;
    this.flash = 0;
    this.hitTint = 0;
    this.phase = rand(0, 10);
    this.armorHit = 0;
    this.pointValue = spec.value * (this.armored ? 2 : 1);
    this.engineStutter = 0;
    this.spinDir = chance(0.5) ? 1 : -1;
  }

  get done() { return this.t > 1.16 || Math.abs(this.lateral) > 1.9; }

  /* three glass sections: left pillar, center, right */
  buildPanes() {
    const g = this.shape.glass;
    const segs = [
      { id: 'left', x: -0.665 * g.halfW, halfW: 0.335 * g.halfW },
      { id: 'center', x: 0, halfW: 0.340 * g.halfW },
      { id: 'right', x: 0.665 * g.halfW, halfW: 0.335 * g.halfW }
    ];
    return segs.map((s) => ({
      ...s, top: g.top, bot: g.bot, topRatio: g.topRatio,
      broken: false, seed: Math.random() * 1000, main: s.id === 'center'
    }));
  }

  /* ------- geometry ------- */
  frame(road) {
    const p = Math.pow(clamp(this.t, 0, 2), 1.78);
    const y = road.horizon + (road.bottom - road.horizon) * p;
    const half = road.halfBottom * p;
    const x = road.cx + this.lateral * half;
    const scale = road.carW * p;
    return { x, y, scale, p };
  }

  localToScreen(lx, ly, road) {
    const f = this.frame(road);
    const cs = Math.cos(this.rot), sn = Math.sin(this.rot);
    const sx = lx * f.scale, sy = ly * f.scale * this.tilt;
    return { x: f.x + sx * cs - sy * sn, y: f.y + sx * sn + sy * cs, scale: f.scale };
  }

  screenToLocal(px, py, road) {
    const f = this.frame(road);
    const dx = px - f.x, dy = py - f.y;
    const cs = Math.cos(-this.rot), sn = Math.sin(-this.rot);
    const rx = dx * cs - dy * sn, ry = dx * sn + dy * cs;
    return { lx: rx / f.scale, ly: ry / (f.scale * this.tilt), f };
  }

  paneTest(px, py, road, pad = 0) {
    const { lx, ly, f } = this.screenToLocal(px, py, road);
    if (Math.abs(lx) > 0.62 || ly > 0.06 || ly < -1.05) return null;
    for (const pane of this.panes) {
      if (pane.broken) continue;
      if (ly < pane.top || ly > pane.bot) continue;
      const k = (ly - pane.top) / (pane.bot - pane.top);
      const hw = pane.halfW * (pane.topRatio + (1 - pane.topRatio) * k) + pad;
      if (Math.abs(lx - pane.x) <= hw) return { pane, lx, ly, f };
    }
    return null;
  }

  bodyTest(px, py, road) {
    const { lx, ly, f } = this.screenToLocal(px, py, road);
    const h = this.shape.h;
    if (Math.abs(lx) > 0.56 || ly > 0.05 || ly < -h - 0.05) return null;
    return { lx, ly, f };
  }

  allGlassBroken() { return this.panes.every((p) => p.broken); }

  /* ------- update ------- */
  update(dt, road, game) {
    this.flash = Math.max(0, this.flash - dt * 4);
    this.hitTint = Math.max(0, this.hitTint - dt * 2.4);
    this.phase += dt;

    if (this.state === 'drive') {
      this.t += dt / this.duration * this.speedMul;
      const wob = Math.sin(this.phase * this.wanderSpeed + this.wander) * this.wobbleAmp;
      this.lateral = this.baseLateral + wob;
      this.rot = Math.sin(this.phase * this.wanderSpeed * 0.8 + this.wander) * 0.012;
      if (this.engineStutter > 0) {
        this.engineStutter -= dt;
        this.speedMul = lerp(this.speedMul, 0.62, dt * 3);
      } else {
        this.speedMul = lerp(this.speedMul, 1, dt * 2);
      }
    } else {
      /* wrecked: dying engine, veering off the road, spinning out */
      this.deadT += dt;
      this.t += dt / this.duration * this.speedMul;
      this.speedMul = Math.max(0.05, this.speedMul - dt * 0.45);
      this.lateral += this.latVel * dt;
      this.rot += this.rotVel * dt;
      this.rotVel *= 1 - dt * 1.6;
      this.rollVel += dt * this.spinDir * 0.32;
      this.tilt = clamp(this.tilt - this.rollVel * dt * 0.38, 0.44, 1);
      if (this.tilt <= 0.45) this.rollVel = 0;

      this.smokeTimer -= dt;
      if (this.smokeTimer <= 0) {
        this.smokeTimer = rand(0.035, 0.09);
        const pt = this.localToScreen(rand(-0.28, 0.28), rand(-0.62, -0.24), road);
        const f = this.frame(road);
        game.smoke(pt.x, pt.y, f.scale * 0.22, this.deadT < 1.6);
      }
    }
    this.bob = Math.sin(this.phase * 9) * 0.004 * this.shape.h;
  }

  /* ------- draw ------- */
  draw(ctx, road) {
    const f = this.frame(road);
    const s = f.scale;
    if (s <= 0.6) return;
    const h = this.shape.h;
    const sp = this.spec;
    const LOD = s < 42;

    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.rotate(this.rot);

    /* ground shadow — tight contact patch + soft spill */
    ctx.save();
    const sh = ctx.createRadialGradient(0, 0, 0, 0, 0, 0.62 * s);
    sh.addColorStop(0, 'rgba(0,0,0,.72)');
    sh.addColorStop(0.45, 'rgba(0,0,0,.4)');
    sh.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = sh;
    ctx.beginPath();
    ctx.ellipse(0, 0.002 * s, 0.56 * s, 0.062 * s, 0, 0, TAU);
    ctx.fill();
    ctx.restore();

    ctx.scale(s, s * this.tilt);
    if (this.bob) ctx.translate(0, this.bob);

    const half = this.shape.half;
    const pts = [];
    for (let i = 0; i < half.length; i++) pts.push([half[i][0], half[i][1]]);
    for (let i = half.length - 2; i >= 1; i--) pts.push([-half[i][0], half[i][1]]);

    /* ---- underbody shadow instead of fake tires ---- */
    ctx.fillStyle = 'rgba(0,0,0,.55)';
    roundRect(ctx, -0.44, -0.055, 0.88, 0.045, 0.02);
    ctx.fill();

    /* ---- body ---- */
    smoothPath(ctx, pts);
    const grad = ctx.createLinearGradient(0, -h, 0, 0);
    grad.addColorStop(0, sp.paint[1]);
    grad.addColorStop(0.34, sp.paint[0]);
    grad.addColorStop(0.72, sp.paint[0]);
    grad.addColorStop(1, sp.paint[2]);
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.save();
    smoothPath(ctx, pts);
    ctx.clip();

    // side falloff (volume)
    const sideG = ctx.createLinearGradient(-0.5, 0, 0.5, 0);
    sideG.addColorStop(0, 'rgba(0,0,0,.62)');
    sideG.addColorStop(0.16, 'rgba(0,0,0,.10)');
    sideG.addColorStop(0.40, 'rgba(255,255,255,.04)');
    sideG.addColorStop(0.62, 'rgba(0,0,0,0)');
    sideG.addColorStop(0.86, 'rgba(0,0,0,.14)');
    sideG.addColorStop(1, 'rgba(0,0,0,.62)');
    ctx.fillStyle = sideG;
    ctx.fillRect(-0.6, -h, 1.2, h);

    // beltline crease shadow
    const crease = ctx.createLinearGradient(0, this.shape.shoulder - 0.05, 0, this.shape.shoulder + 0.10);
    crease.addColorStop(0, 'rgba(0,0,0,0)');
    crease.addColorStop(0.42, 'rgba(0,0,0,.30)');
    crease.addColorStop(0.58, 'rgba(255,255,255,.07)');
    crease.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = crease;
    ctx.fillRect(-0.6, this.shape.shoulder - 0.06, 1.2, 0.17);

    // top sheen
    const shine = ctx.createLinearGradient(0, -h, 0, -h * 0.35);
    shine.addColorStop(0, 'rgba(255,255,255,.10)');
    shine.addColorStop(0.5, 'rgba(255,255,255,.035)');
    shine.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = shine;
    ctx.fillRect(-0.6, -h, 1.2, h * 0.65);

    // warm city bounce from asphalt
    const bounce = ctx.createLinearGradient(0, 0, 0, -h * 0.34);
    bounce.addColorStop(0, 'rgba(255,140,60,.13)');
    bounce.addColorStop(1, 'rgba(255,140,60,0)');
    ctx.fillStyle = bounce;
    ctx.fillRect(-0.6, -h * 0.34, 1.2, h * 0.34);

    // vertical reflection streaks on the flanks
    ctx.globalAlpha = 0.10;
    ctx.fillStyle = '#dbeaff';
    for (const dir of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(dir * 0.47, -0.12);
      ctx.lineTo(dir * 0.415, -0.12);
      ctx.lineTo(dir * 0.36, this.shape.shoulder - 0.02);
      ctx.lineTo(dir * 0.45, this.shape.shoulder - 0.02);
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    /* outline + rim light */
    smoothPath(ctx, pts);
    ctx.strokeStyle = 'rgba(0,0,0,.55)';
    ctx.lineWidth = Math.max(0.004, 1.4 / s);
    ctx.stroke();
    ctx.save();
    smoothPath(ctx, pts);
    ctx.clip();
    smoothPath(ctx, pts);
    ctx.strokeStyle = 'rgba(212,228,255,.30)';
    ctx.lineWidth = Math.max(0.012, 3.4 / s);
    ctx.stroke();
    ctx.restore();

    /* shoulder trim line */
    ctx.strokeStyle = sp.trim;
    ctx.globalAlpha = 0.34;
    ctx.lineWidth = Math.max(0.005, 1.4 / s);
    ctx.beginPath();
    const sy = this.shape.shoulder + 0.025;
    ctx.moveTo(-0.465, sy);
    ctx.lineTo(0.465, sy);
    ctx.stroke();
    ctx.globalAlpha = 1;

    /* ---- glass house ---- */
    this.drawGlass(ctx, s, LOD);

    /* ---- badge / plate ---- */
    if (!LOD) this.drawDetails(ctx, s);

    /* ---- signature bits ---- */
    if (sp.spare) {
      ctx.save();
      ctx.translate(0, -0.535);
      ctx.fillStyle = '#0b0d10';
      ctx.beginPath(); ctx.arc(0, 0, 0.118, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.10)';
      ctx.lineWidth = Math.max(0.01, 2 / s);
      ctx.beginPath(); ctx.arc(0, 0, 0.086, 0, TAU); ctx.stroke();
      ctx.fillStyle = sp.trim;
      ctx.globalAlpha = 0.55;
      ctx.beginPath(); ctx.arc(0, 0, 0.028, 0, TAU); ctx.fill();
      ctx.restore();
    }
    if (this.spec.shape === 'suv') {
      // roof spoiler lip
      ctx.fillStyle = sp.paint[2];
      roundRect(ctx, -0.405, this.shape.glass.top - 0.034, 0.81, 0.026, 0.010);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.10)';
      roundRect(ctx, -0.405, this.shape.glass.top - 0.034, 0.81, 0.007, 0.003);
      ctx.fill();
    }
    if (sp.ducktail) {
      ctx.fillStyle = 'rgba(0,0,0,.5)';
      roundRect(ctx, -0.35, -0.495, 0.70, 0.026, 0.011); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.12)';
      roundRect(ctx, -0.35, -0.495, 0.70, 0.007, 0.003); ctx.fill();
    }

    /* ---- tail lights ---- */
    this.drawLights(ctx, s);

    /* ---- police bar ---- */
    if (sp.police) this.drawPoliceBar(ctx, s);

    /* ---- dents: crumpled metal ---- */
    for (const d of this.dents) {
      ctx.save();
      ctx.translate(d.x, d.y);
      ctx.rotate(d.r);
      const dg = ctx.createRadialGradient(0.012, 0.010, 0, 0, 0, 0.062);
      dg.addColorStop(0, 'rgba(0,0,0,.42)');
      dg.addColorStop(0.65, 'rgba(0,0,0,.20)');
      dg.addColorStop(1, 'rgba(255,255,255,.0)');
      ctx.fillStyle = dg;
      ctx.beginPath();
      ctx.ellipse(0, 0, 0.068, 0.044, 0, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.22)';
      ctx.lineWidth = Math.max(0.004, 1.1 / s);
      ctx.beginPath();
      ctx.arc(0.006, 0.006, 0.048, -2.5, -0.9);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(0,0,0,.35)';
      ctx.beginPath();
      ctx.arc(-0.006, -0.006, 0.040, 0.7, 2.3);
      ctx.stroke();
      ctx.restore();
    }

    /* ---- damage flashes ---- */
    if (this.flash > 0) {
      smoothPath(ctx, pts);
      ctx.fillStyle = `rgba(255,240,200,${this.flash * 0.4})`;
      ctx.fill();
    }
    if (this.hitTint > 0) {
      smoothPath(ctx, pts);
      ctx.fillStyle = `rgba(255,90,30,${this.hitTint * 0.16})`;
      ctx.fill();
    }

    ctx.restore();

    /* ---- HP pips ---- */
    if (this.state === 'drive' && this.t > 0.10) this.drawPips(ctx, f, s);
  }

  /* glass: one continuous surface + 3 breakable sections */
  drawGlass(ctx, s, LOD) {
    const g = this.shape.glass;
    const sp = this.spec;

    // surround / pillar frame
    trapezoidPath(ctx, 0, g.halfW + 0.028, g.top - 0.018, g.bot + 0.012, g.topRatio + 0.02);
    ctx.fillStyle = sp.trim;
    ctx.globalAlpha = 0.42;
    ctx.fill();
    ctx.globalAlpha = 1;

    // glass surface
    trapezoidPath(ctx, 0, g.halfW, g.top, g.bot, g.topRatio);
    if (LOD) {
      ctx.fillStyle = sp.glassTint;
      ctx.fill();
    } else {
      const gg = ctx.createLinearGradient(0, g.top, 0, g.bot);
      gg.addColorStop(0, shade(sp.glassTint, 1.5));
      gg.addColorStop(0.45, sp.glassTint);
      gg.addColorStop(1, shade(sp.glassTint, 0.62));
      ctx.fillStyle = gg;
      ctx.fill();

      ctx.save();
      trapezoidPath(ctx, 0, g.halfW, g.top, g.bot, g.topRatio);
      ctx.clip();
      // interior: headrests + people silhouettes
      ctx.fillStyle = 'rgba(0,0,0,.5)';
      ctx.beginPath();
      ctx.ellipse(-0.155, g.bot - 0.028, 0.068, 0.042, 0, 0, TAU);
      ctx.ellipse(0.155, g.bot - 0.028, 0.068, 0.042, 0, 0, TAU);
      ctx.fill();
      // reflections
      ctx.fillStyle = 'rgba(255,255,255,.11)';
      ctx.beginPath();
      ctx.moveTo(-0.40, g.bot + 0.02); ctx.lineTo(-0.08, g.top - 0.02);
      ctx.lineTo(0.04, g.top - 0.02); ctx.lineTo(-0.26, g.bot + 0.02);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(130,200,255,.09)';
      ctx.beginPath();
      ctx.moveTo(0.02, g.top - 0.02); ctx.lineTo(0.16, g.top - 0.02);
      ctx.lineTo(0.33, g.bot + 0.02); ctx.lineTo(0.19, g.bot + 0.02);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }

    // C-pillars dividing the rear glass into three panes
    if (!LOD) {
      const tw = g.topRatio;
      for (const px of [-0.335, 0.335]) {
        const xt = px * g.halfW * (tw + 0.02);
        const xb = px * g.halfW * 1.0;
        ctx.beginPath();
        ctx.moveTo(xt - 0.015, g.top - 0.004);
        ctx.lineTo(xt + 0.015, g.top - 0.004);
        ctx.lineTo(xb + 0.024, g.bot + 0.004);
        ctx.lineTo(xb - 0.024, g.bot + 0.004);
        ctx.closePath();
        ctx.fillStyle = sp.paint[0];
        ctx.fill();
        ctx.strokeStyle = 'rgba(200,220,250,.13)';
        ctx.lineWidth = Math.max(0.004, 1 / s);
        ctx.stroke();
      }
    }

    // broken sections
    for (const p of this.panes) {
      if (!p.broken) continue;
      drawBrokenPane(ctx, p, s, sp);
    }

    // glass top edge highlight
    ctx.strokeStyle = 'rgba(210,235,255,.22)';
    ctx.lineWidth = Math.max(0.005, 1.3 / s);
    ctx.beginPath();
    ctx.moveTo(-g.halfW * g.topRatio, g.top);
    ctx.lineTo(g.halfW * g.topRatio, g.top);
    ctx.stroke();

    // armored mesh
    if (this.armored && !LOD) {
      ctx.save();
      trapezoidPath(ctx, 0, g.halfW + 0.01, g.top - 0.008, g.bot + 0.008, g.topRatio);
      ctx.clip();
      ctx.strokeStyle = 'rgba(185,200,215,.5)';
      ctx.lineWidth = Math.max(0.006, 1.2 / s);
      for (let i = -9; i <= 9; i++) {
        ctx.beginPath();
        ctx.moveTo(i * 0.05 - 0.22, g.bot + 0.06);
        ctx.lineTo(i * 0.05 + 0.22, g.top - 0.06);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(i * 0.05 + 0.22, g.bot + 0.06);
        ctx.lineTo(i * 0.05 - 0.22, g.top - 0.06);
        ctx.stroke();
      }
      ctx.restore();
      ctx.strokeStyle = 'rgba(160,175,190,.7)';
      ctx.lineWidth = Math.max(0.008, 2 / s);
      trapezoidPath(ctx, 0, g.halfW + 0.028, g.top - 0.018, g.bot + 0.012, g.topRatio + 0.02);
      ctx.stroke();
    }
  }

  drawDetails(ctx, s) {
    const sp = this.spec;
    const g = this.shape.glass;
    // roof trim above glass
    ctx.strokeStyle = 'rgba(255,255,255,.05)';
    ctx.lineWidth = Math.max(0.005, 1.2 / s);
    ctx.beginPath();
    ctx.moveTo(-g.halfW * 0.88, g.top - 0.012);
    ctx.lineTo(g.halfW * 0.88, g.top - 0.012);
    ctx.stroke();

    // rear bumper band
    ctx.fillStyle = 'rgba(0,0,0,.34)';
    roundRect(ctx, -0.465, -0.155, 0.93, 0.082, 0.024);
    ctx.fill();
    // lower reflectors
    const rl = this.shape.lights;
    ctx.fillStyle = 'rgba(255,80,60,.30)';
    for (const d of [-1, 1]) {
      roundRect(ctx, d * 0.30 - 0.030, -0.106, 0.060, 0.011, 0.004);
      ctx.fill();
    }

    // plate
    const pw = this.spec.shape === 'sport' ? 0.215 : 0.235;
    ctx.fillStyle = '#0b0e13';
    roundRect(ctx, -pw / 2 - 0.014, -0.262, pw + 0.028, 0.078, 0.013); ctx.fill();
    ctx.fillStyle = this.state === 'wreck' ? '#c4b294' : sp.plate;
    roundRect(ctx, -pw / 2, -0.25, pw, 0.054, 0.007); ctx.fill();
    ctx.fillStyle = 'rgba(22,28,40,.9)';
    ctx.font = `700 ${0.036}px Vazirmatn, Tahoma, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('۲۴ ایران ۷', 0, -0.223);

    // badge
    ctx.fillStyle = sp.gold ? 'rgba(231,200,120,.95)' : 'rgba(200,212,228,.6)';
    ctx.beginPath();
    ctx.arc(0, -0.352, 0.030, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(18,22,30,.92)';
    ctx.font = '700 0.026px Vazirmatn, Tahoma, sans-serif';
    ctx.fillText(sp.badge, 0, -0.35);

    // diffuser
    const suvLike = this.spec.shape !== 'sport';
    const dy = suvLike ? -0.175 : -0.145;
    ctx.fillStyle = 'rgba(6,7,10,.72)';
    roundRect(ctx, -0.42, dy, 0.84, suvLike ? 0.105 : 0.085, 0.02);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.07)';
    ctx.lineWidth = Math.max(0.004, 1 / s);
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 0.10, dy + 0.012);
      ctx.lineTo(i * 0.11, dy + (suvLike ? 0.093 : 0.073));
      ctx.stroke();
    }
    // exhaust tips
    const tips = this.spec.sporty || this.spec.shape === 'sport' ? [-0.33, -0.245, 0.245, 0.33] : [-0.315, 0.315];
    for (const tx of tips) {
      ctx.fillStyle = '#2a2f38';
      roundRect(ctx, tx - 0.028, dy + 0.026, 0.056, 0.030, 0.012);
      ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,.85)';
      roundRect(ctx, tx - 0.019, dy + 0.033, 0.038, 0.016, 0.008);
      ctx.fill();
    }
  }

  drawLights(ctx, s) {
    const sp = this.spec;
    const L = this.shape.lights;
    const wrecked = this.state === 'wreck';
    const flick = (wrecked && Math.random() < 0.35) || (this.lightsBroken && Math.random() < 0.4);
    const on = !flick;
    const col = wrecked ? '255,140,60' : '255,45,55';

    for (const dir of [-1, 1]) {
      const lx = dir * (0.5 - L.w / 2 - 0.028);
      const lampH = L.h;
      const ly = L.y;

      if (on) {
        const gr = Math.max(L.w * 1.9, 0.075);
        ctx.globalCompositeOperation = 'lighter';
        glowAt(ctx, lx, ly, gr, col, 0.8);
        ctx.globalCompositeOperation = 'source-over';
      }

      const lg = ctx.createLinearGradient(0, ly - lampH / 2, 0, ly + lampH / 2);
      if (wrecked) {
        lg.addColorStop(0, '#ffb060'); lg.addColorStop(1, '#96300c');
      } else if (on) {
        lg.addColorStop(0, '#ff9a9a'); lg.addColorStop(0.35, sp.light); lg.addColorStop(1, '#6d0510');
      } else {
        lg.addColorStop(0, '#54222a'); lg.addColorStop(1, '#260b0f');
      }
      ctx.fillStyle = lg;
      const w = L.w, hh = lampH;
      if (this.spec.shape === 'sport') {
        roundRect(ctx, lx - w / 2, ly - hh / 2, w, hh, hh * 0.45);
      } else if (this.spec.shape === 'suv') {
        roundRect(ctx, lx - w / 2, ly - hh / 2, w, hh, 0.012);
      } else {
        roundRect(ctx, lx - w / 2, ly - hh / 2, w, hh, 0.011);
      }
      ctx.fill();

      if (on) {
        ctx.fillStyle = 'rgba(255,235,235,.75)';
        ctx.beginPath();
        ctx.ellipse(lx, ly - hh * 0.12, w * 0.22, hh * 0.18, 0, 0, TAU);
        ctx.fill();
      }
    }

    // center light strip on sports cars
    if (this.spec.shape === 'sport' && !wrecked) {
      ctx.fillStyle = 'rgba(255,55,65,.20)';
      roundRect(ctx, -0.085, L.y - 0.006, 0.17, 0.012, 0.005);
      ctx.fill();
    }
  }

  drawPoliceBar(ctx, s) {
    const g = this.shape.glass;
    const yb = g.top - 0.062;
    ctx.fillStyle = '#08090d';
    roundRect(ctx, -0.215, yb, 0.43, 0.055, 0.014); ctx.fill();
    const t = performance.now() / 170;
    const blue = Math.sin(t) > 0;
    const gb = ctx.createRadialGradient(0.1, yb + 0.028, 0, 0.1, yb + 0.028, 0.34);
    gb.addColorStop(0, blue ? 'rgba(80,160,255,.55)' : 'rgba(80,160,255,.05)');
    gb.addColorStop(1, 'rgba(80,160,255,0)');
    ctx.fillStyle = gb; ctx.beginPath(); ctx.arc(0.1, yb + 0.028, 0.34, 0, TAU); ctx.fill();
    const gr = ctx.createRadialGradient(-0.1, yb + 0.028, 0, -0.1, yb + 0.028, 0.34);
    gr.addColorStop(0, !blue ? 'rgba(255,70,70,.55)' : 'rgba(255,70,70,.05)');
    gr.addColorStop(1, 'rgba(255,70,70,0)');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(-0.1, yb + 0.028, 0.34, 0, TAU); ctx.fill();
    ctx.fillStyle = blue ? 'rgba(40,70,150,.6)' : '#ff4a4a';
    roundRect(ctx, -0.198, yb + 0.009, 0.175, 0.036, 0.01); ctx.fill();
    ctx.fillStyle = blue ? '#4d9dff' : 'rgba(40,70,150,.6)';
    roundRect(ctx, 0.023, yb + 0.009, 0.175, 0.036, 0.01); ctx.fill();
  }

  drawPips(ctx, f, s) {
    const shown = Math.min(this.maxHp, 7);
    const w = Math.max(15, s * 0.075);
    const gap = w * 0.24;
    const total = shown * w + (shown - 1) * gap;
    const top = f.y - (this.shape.h + 0.135) * s * this.tilt;
    ctx.save();
    ctx.globalAlpha = clamp((this.t - 0.10) * 6, 0, 1);
    for (let i = 0; i < shown; i++) {
      const x = f.x - total / 2 + i * (w + gap);
      const alive = i < this.hp;
      ctx.fillStyle = alive ? (this.armored ? '#8fd0ff' : '#ffd36a') : 'rgba(255,255,255,.16)';
      roundRect(ctx, x, top, w, Math.max(2.4, s * 0.021), 2);
      ctx.fill();
    }
    if (this.armored) {
      ctx.fillStyle = 'rgba(150,205,255,.95)';
      ctx.font = `700 ${Math.max(8, s * 0.05)}px Vazirmatn, Tahoma, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText('زره‌پوش', f.x, top - Math.max(5, s * 0.045));
    }
    ctx.restore();
  }
}

function drawBrokenPane(ctx, p, s, sp) {
  trapezoidPath(ctx, p.x, p.halfW, p.top, p.bot, p.topRatio);
  const hg = ctx.createLinearGradient(0, p.top, 0, p.bot);
  hg.addColorStop(0, 'rgba(10,4,7,.97)');
  hg.addColorStop(1, 'rgba(34,9,13,.92)');
  ctx.fillStyle = hg;
  ctx.fill();

  ctx.save();
  trapezoidPath(ctx, p.x, p.halfW, p.top, p.bot, p.topRatio);
  ctx.clip();
  const h = p.bot - p.top;
  // jagged remaining glass
  ctx.fillStyle = 'rgba(200,228,250,.28)';
  ctx.beginPath();
  ctx.moveTo(p.x - p.halfW, p.bot);
  const steps = 6;
  for (let i = 0; i <= steps; i++) {
    const k = i / steps;
    const x = p.x - p.halfW + k * p.halfW * 2;
    ctx.lineTo(x, p.top + hash(p.seed + i * 13) * h * 0.34 + h * 0.04);
  }
  ctx.lineTo(p.x + p.halfW, p.bot);
  ctx.closePath();
  ctx.fill();

  // radial cracks from centre
  ctx.strokeStyle = 'rgba(215,240,255,.4)';
  ctx.lineWidth = Math.max(0.004, 1.1 / s);
  for (let i = 0; i < 6; i++) {
    const a = hash(p.seed + i * 7.3) * TAU;
    const r = h * (0.3 + hash(p.seed + i * 3.1) * 0.6);
    ctx.beginPath();
    ctx.moveTo(p.x, p.top + h * 0.5);
    ctx.lineTo(p.x + Math.cos(a) * r, p.top + h * 0.5 + Math.sin(a) * r * 0.7);
    ctx.stroke();
  }
  ctx.restore();

  ctx.strokeStyle = 'rgba(225,240,252,.3)';
  ctx.lineWidth = Math.max(0.006, 1.4 / s);
  trapezoidPath(ctx, p.x, p.halfW, p.top, p.bot, p.topRatio);
  ctx.stroke();
}

/* color shade helper: hex -> lighter/darker */
function shade(hex, k) {
  const c = hex.replace('#', '');
  let r = parseInt(c.substring(0, 2), 16);
  let g = parseInt(c.substring(2, 4), 16);
  let b = parseInt(c.substring(4, 6), 16);
  if (k > 1) {
    r = clamp(Math.round(r + (255 - r) * (k - 1) * 0.5), 0, 255);
    g = clamp(Math.round(g + (255 - g) * (k - 1) * 0.5), 0, 255);
    b = clamp(Math.round(b + (255 - b) * (k - 1) * 0.5), 0, 255);
  } else {
    r = Math.round(r * k); g = Math.round(g * k); b = Math.round(b * k);
  }
  return `rgb(${r},${g},${b})`;
}

/* weighted random spec */
function rollCarSpec() {
  const total = CAR_SPECS.reduce((a, s) => a + s.weight, 0);
  let r = Math.random() * total;
  for (const s of CAR_SPECS) { r -= s.weight; if (r <= 0) return s; }
  return CAR_SPECS[0];
}
