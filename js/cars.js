/* =========================================================
   cars.js — موتور گرافیک برداری ماشین‌های لوکس
   همه‌ی ماشین‌ها با مسیرهای Canvas ساخته می‌شوند (بدون تصویر)
   مختصات محلی: مبدأ = مرکز پایین ماشین (محل تماس لاستیک با زمین)
   x منفی = سمت جلو (ماشین‌ها به سمت چپ حرکت می‌کنند)
   ========================================================= */
window.CarArt = (function () {
  'use strict';

  /* ---------- ابزارهای رنگ ---------- */
  function hexToRgb(h) {
    h = h.replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    const n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function shade(hex, k, a) {
    const [r, g, b] = hexToRgb(hex);
    const f = (v) => Math.max(0, Math.min(255, Math.round(v * k)));
    return a === undefined
      ? `rgb(${f(r)},${f(g)},${f(b)})`
      : `rgba(${f(r)},${f(g)},${f(b)},${a})`;
  }

  /* ---------- مسیرها ---------- */
  function pathPoly(ctx, pts) {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath();
  }

  // Catmull-Rom → bezier برای فرم‌های نرم
  function pathSmooth(ctx, pts) {
    const n = pts.length;
    const g = (i) => pts[(i + n) % n];
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 0; i < n; i++) {
      const p0 = g(i - 1), p1 = g(i), p2 = g(i + 1), p3 = g(i + 2);
      const c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6;
      const c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6;
      ctx.bezierCurveTo(c1x, c1y, c2x, c2y, p2[0], p2[1]);
    }
    ctx.closePath();
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  /* =========================================================
     آرکی‌تایپ‌ها (مختصات نرمال‌شده: x در [-0.5,0.5] ، y در [-1,0])
     ========================================================= */
  const ARCH = {
    sedan: {
      smooth: true, wheelR: 0.176, wheels: [-0.30, 0.293],
      body: [[-0.500, -0.185], [-0.505, -0.360], [-0.478, -0.500], [-0.420, -0.560],
             [-0.300, -0.585], [0.180, -0.585], [0.400, -0.558], [0.470, -0.508],
             [0.500, -0.390], [0.505, -0.195], [0.480, -0.058], [-0.430, -0.048], [-0.492, -0.078]],
      cabin: [[-0.330, -0.575], [-0.245, -0.885], [0.000, -1.000], [0.130, -0.958], [0.230, -0.590]],
      glass: [
        [[-0.238, -0.610], [-0.178, -0.850], [-0.032, -0.895], [-0.032, -0.610]],
        [[-0.002, -0.610], [-0.002, -0.895], [0.092, -0.888], [0.168, -0.622]]
      ]
    },
    coupe: {
      smooth: true, wheelR: 0.182, wheels: [-0.298, 0.300],
      body: [[-0.500, -0.230], [-0.505, -0.400], [-0.462, -0.545], [-0.330, -0.595],
             [-0.060, -0.600], [0.220, -0.595], [0.420, -0.545], [0.495, -0.430],
             [0.500, -0.210], [0.470, -0.052], [-0.440, -0.048], [-0.500, -0.120]],
      cabin: [[-0.300, -0.590], [-0.215, -0.905], [0.030, -1.000], [0.135, -0.955], [0.245, -0.605]],
      glass: [
        [[-0.225, -0.620], [-0.165, -0.870], [-0.030, -0.905], [-0.030, -0.620]],
        [[-0.002, -0.620], [-0.002, -0.905], [0.082, -0.898], [0.178, -0.630]]
      ]
    },
    wedge: {
      smooth: false, wheelR: 0.215, wheels: [-0.295, 0.293],
      body: [[-0.500, -0.300], [-0.495, -0.470], [-0.440, -0.575], [-0.250, -0.620],
             [0.150, -0.620], [0.380, -0.575], [0.480, -0.470], [0.500, -0.300],
             [0.495, -0.078], [0.440, -0.042], [-0.430, -0.042], [-0.495, -0.110]],
      cabin: [[-0.270, -0.615], [-0.130, -0.930], [0.060, -1.000], [0.120, -0.955], [0.215, -0.630]],
      glass: [
        [[-0.200, -0.640], [-0.110, -0.895], [-0.012, -0.930], [-0.012, -0.640]],
        [[0.013, -0.640], [0.013, -0.930], [0.075, -0.920], [0.170, -0.655]]
      ]
    },
    box: {
      smooth: true, wheelR: 0.182, wheels: [-0.320, 0.302],
      body: [[-0.500, -0.240], [-0.505, -0.430], [-0.478, -0.560], [-0.430, -0.605],
             [-0.150, -0.618], [0.200, -0.618], [0.420, -0.592], [0.480, -0.505],
             [0.500, -0.340], [0.500, -0.180], [0.470, -0.048], [-0.440, -0.044], [-0.500, -0.135]],
      cabin: [[-0.430, -0.608], [-0.418, -0.900], [-0.350, -0.968], [0.055, -0.968], [0.150, -0.915], [0.192, -0.602]],
      glass: [
        [[-0.360, -0.640], [-0.358, -0.862], [-0.120, -0.900], [-0.120, -0.640]],
        [[-0.095, -0.640], [-0.095, -0.900], [0.098, -0.888], [0.148, -0.658]]
      ]
    },
    round: {
      smooth: true, wheelR: 0.196, wheels: [-0.285, 0.302],
      body: [[-0.500, -0.290], [-0.500, -0.470], [-0.450, -0.610], [-0.300, -0.655],
             [0.150, -0.645], [0.400, -0.575], [0.495, -0.450], [0.500, -0.220],
             [0.470, -0.048], [-0.440, -0.044], [-0.495, -0.130]],
      cabin: [[-0.360, -0.640], [-0.165, -0.930], [0.010, -1.000], [0.095, -0.960], [0.215, -0.660]],
      glass: [
        [[-0.290, -0.665], [-0.140, -0.895], [-0.020, -0.925], [-0.020, -0.665]],
        [[0.005, -0.665], [0.005, -0.925], [0.060, -0.918], [0.165, -0.685]]
      ]
    }
  };

  /* =========================================================
     مدل‌ها
     ========================================================= */
  const MODELS = [
    {
      id: 'benz', fa: 'مرسدس بنز', arch: 'sedan', len: 308, h: 114, pts: 140,
      colors: ['#c8ccd4', '#1a1c22', '#e8e6e1', '#7c1f2c', '#243044'],
      grille: 'star', trim: '#d9dde3'
    },
    {
      id: 'bmw', fa: 'بی‌ام‌و', arch: 'coupe', len: 296, h: 106, pts: 130,
      colors: ['#1b2a4a', '#c9ccd2', '#0f0f12', '#b5352f', '#3f5d6b'],
      grille: 'kidney', trim: '#cfd4da'
    },
    {
      id: 'rolls', fa: 'رولزرویس', arch: 'box', len: 340, h: 128, pts: 210,
      colors: ['#0f1319', '#e9e6df', '#3a2430', '#1d3b33'],
      grille: 'tall', trim: '#e8e2c9'
    },
    {
      id: 'porsche', fa: 'پورشه', arch: 'round', len: 288, h: 100, pts: 175,
      colors: ['#d9d5cc', '#171a1f', '#8b1b12', '#c6a24a'],
      grille: 'round', trim: '#d7d9dc', wing: 0.16
    },
    {
      id: 'ferrari', fa: 'فراری', arch: 'wedge', len: 296, h: 90, pts: 215,
      colors: ['#c1121f', '#f2c200', '#121317'],
      grille: 'none', trim: '#e6e2d8', vent: true
    },
    {
      id: 'lambo', fa: 'لامبورگینی', arch: 'wedge', len: 302, h: 86, pts: 235,
      colors: ['#d8f000', '#f45d00', '#1b1c22', '#e8e8e8'],
      grille: 'none', trim: '#d8d8d0', wing: 0.34
    },
    {
      id: 'bentley', fa: 'بنتلی', arch: 'sedan', len: 322, h: 120, pts: 185,
      colors: ['#1a2b24', '#0e1015', '#6a1b24', '#d6d2c6'],
      grille: 'mesh', trim: '#e2ddcc'
    },
    {
      id: 'bugatti', fa: 'بوگاتی', arch: 'wedge', len: 300, h: 94, pts: 265,
      colors: ['#1a3b6d', '#3b2140', '#101216'],
      grille: 'none', trim: '#d8d8d0', wing: 0.2, vent: true
    }
  ];

  /* ---------- هندسه برای برخورد ---------- */
  const geoCache = {};
  function geometry(model) {
    if (geoCache[model.id]) return geoCache[model.id];
    const A = ARCH[model.arch], L = model.len, H = model.h;
    const P = (p) => [-p[0] * L, p[1] * H];
    const g = {
      L, H,
      body: A.body.map(P),
      cabin: A.cabin.map(P),
      glass: A.glass.map((poly) => poly.map(P)),
      wheelR: A.wheelR * H,
      wheels: A.wheels.map((x) => ({ x: -x * L, r: A.wheelR * H })),
      minX: -0.52 * L, maxX: 0.52 * L,
      minY: -1.02 * H, maxY: 0
    };
    geoCache[model.id] = g;
    return g;
  }

  /* =========================================================
     لاستیک
     ========================================================= */
  function drawWheel(ctx, x, y, r, spin, accent, glow) {
    ctx.save();
    ctx.translate(x, y);

    // لاستیک
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = '#0b0a10';
    ctx.fill();
    if (glow) {
      ctx.shadowColor = 'rgba(255,120,30,.9)';
      ctx.shadowBlur = 14;
      ctx.strokeStyle = 'rgba(255,130,40,.5)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // رینگ
    const rg = ctx.createRadialGradient(-r * 0.2, -r * 0.25, r * 0.05, 0, 0, r * 0.66);
    rg.addColorStop(0, '#f2f4f7');
    rg.addColorStop(0.55, '#9aa1ab');
    rg.addColorStop(1, '#4a5058');
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.64, 0, Math.PI * 2);
    ctx.fillStyle = rg;
    ctx.fill();

    // پره‌ها
    ctx.save();
    ctx.rotate(spin);
    ctx.strokeStyle = 'rgba(30,33,40,.8)';
    ctx.lineWidth = Math.max(1.6, r * 0.12);
    ctx.lineCap = 'round';
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r * 0.17, Math.sin(a) * r * 0.17);
      ctx.lineTo(Math.cos(a) * r * 0.58, Math.sin(a) * r * 0.58);
      ctx.stroke();
    }
    ctx.restore();

    // توپی مرکزی + کالیپر
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.17, 0, Math.PI * 2);
    ctx.fillStyle = '#20242c';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.62, -0.45, 0.35);
    ctx.strokeStyle = accent || '#e0451c';
    ctx.lineWidth = Math.max(1.5, r * 0.13);
    ctx.stroke();

    // درخشش لاستیک
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.93, Math.PI * 1.05, Math.PI * 1.55);
    ctx.strokeStyle = 'rgba(255,255,255,.13)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
  }

  /* =========================================================
     شیشه (سالم / ترک‌خورده / خرد)
     ========================================================= */
  function drawGlass(ctx, poly, state, H, t) {
    ctx.save();
    pathPoly(ctx, poly);
    ctx.save();
    ctx.clip();

    if (!state.broken) {
      const g = ctx.createLinearGradient(poly[0][0], poly[1][1], poly[3][0], poly[0][1]);
      g.addColorStop(0, 'rgba(150,190,225,.60)');
      g.addColorStop(0.45, 'rgba(60,85,120,.52)');
      g.addColorStop(1, 'rgba(18,26,42,.75)');
      ctx.fillStyle = g;
      ctx.fill();

      // درخشش شیشه
      ctx.globalAlpha = 0.20;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.moveTo(poly[0][0] - 10, poly[0][1]);
      ctx.lineTo(poly[0][0] + 26, poly[0][1]);
      ctx.lineTo(poly[3][0] + 30, poly[3][1] - 14);
      ctx.lineTo(poly[3][0] - 6, poly[3][1] - 14);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
    } else {
      ctx.fillStyle = '#0a0c14';
      ctx.fill();
    }

    // ترک‌ها
    if (state.cracks && state.cracks.length) {
      ctx.strokeStyle = state.broken ? 'rgba(200,225,255,.55)' : 'rgba(215,235,255,.85)';
      ctx.lineWidth = state.broken ? 1 : 1.6;
      for (const c of state.cracks) {
        ctx.beginPath();
        ctx.moveTo(c.x0, c.y0);
        ctx.lineTo(c.x1, c.y1);
        ctx.stroke();
      }
      if (!state.broken) {
        ctx.fillStyle = 'rgba(230,245,255,.18)';
        ctx.beginPath();
        ctx.arc(state.hit[0], state.hit[1], H * 0.09, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // تکه‌های باقی‌مانده‌ی شیشه‌ی خردشده
    if (state.broken && state.shards) {
      ctx.fillStyle = 'rgba(175,215,245,.55)';
      for (const s of state.shards) {
        ctx.beginPath();
        ctx.moveTo(s[0], s[1]);
        ctx.lineTo(s[2], s[3]);
        ctx.lineTo(s[4], s[5]);
        ctx.closePath();
        ctx.fill();
      }
    }
    ctx.restore();

    // قاب شیشه
    pathPoly(ctx, poly);
    ctx.strokeStyle = 'rgba(12,14,20,.85)';
    ctx.lineWidth = 2.2;
    ctx.stroke();
    ctx.restore();
  }

  /* =========================================================
     رسم ماشین
     ========================================================= */
  function draw(ctx, car, t) {
    const m = car.model, A = ARCH[m.arch], L = m.len, H = m.h;
    const G = geometry(m);
    const P = (p) => [-p[0] * L, p[1] * H];
    const col = car.color;

    ctx.save();
    ctx.translate(car.x, car.y);

    /* --- درخشش نئون زیر ماشین (قبل از چرخش) --- */
    if (!car.dead) {
      const ng = ctx.createRadialGradient(0, -H * 0.05, 2, 0, -H * 0.05, L * 0.55);
      ng.addColorStop(0, shade(col, 1.6, 0.20));
      ng.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.save();
      ctx.scale(1, 0.28);
      ctx.beginPath();
      ctx.arc(0, -H * 0.18, L * 0.55, 0, Math.PI * 2);
      ctx.fillStyle = ng;
      ctx.fill();
      ctx.restore();
    }

    // چرخش حول مرکز بدنه
    ctx.rotate(car.angle);
    const piv = -H * 0.42;
    ctx.translate(0, -piv);
    ctx.scale(car.scale, car.scale);
    ctx.translate(0, piv);

    if (car.hitFlash > 0) {
      ctx.shadowColor = 'rgba(255,180,80,.9)';
      ctx.shadowBlur = 30 * car.hitFlash;
    }

    /* --- بدنه --- */
    const bodyPts = A.body.map(P);
    const bg = ctx.createLinearGradient(0, -H, 0, 0);
    bg.addColorStop(0, shade(col, 1.45));
    bg.addColorStop(0.22, shade(col, 1.18));
    bg.addColorStop(0.55, col);
    bg.addColorStop(0.82, shade(col, 0.62));
    bg.addColorStop(1, shade(col, 0.36));

    ctx.beginPath();
    A.smooth ? pathSmooth(ctx, bodyPts) : pathPoly(ctx, bodyPts);
    ctx.fillStyle = bg;
    ctx.fill();
    ctx.shadowBlur = 0;

    // خط تیره‌ی پایین (رکاب)
    ctx.save();
    A.smooth ? pathSmooth(ctx, bodyPts) : pathPoly(ctx, bodyPts);
    ctx.clip();
    ctx.fillStyle = 'rgba(0,0,0,.42)';
    ctx.fillRect(-L, -H * 0.11, L * 2, H * 0.2);

    // هایلایت بدنه
    ctx.beginPath();
    ctx.ellipse(-L * 0.04, -H * 0.44, L * 0.36, H * 0.05, -0.02, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,.16)';
    ctx.fill();

    // انعکاس آسمان روی سقف بدنه
    const rg2 = ctx.createLinearGradient(0, -H * 0.62, 0, -H * 0.30);
    rg2.addColorStop(0, 'rgba(255,180,120,.16)');
    rg2.addColorStop(1, 'rgba(255,180,120,0)');
    ctx.fillStyle = rg2;
    ctx.fillRect(-L, -H * 0.62, L * 2, H * 0.32);
    ctx.restore();

    // خط کروم دور بدنه
    ctx.beginPath();
    A.smooth ? pathSmooth(ctx, bodyPts) : pathPoly(ctx, bodyPts);
    ctx.strokeStyle = 'rgba(255,255,255,.10)';
    ctx.lineWidth = 1.4;
    ctx.stroke();

    /* --- کابین --- */
    const cabPts = A.cabin.map(P);
    const cg = ctx.createLinearGradient(0, -H, 0, -H * 0.5);
    cg.addColorStop(0, shade(col, 0.55));
    cg.addColorStop(0.6, shade(col, 0.78));
    cg.addColorStop(1, shade(col, 1.02));
    ctx.beginPath();
    A.smooth ? pathSmooth(ctx, cabPts) : pathPoly(ctx, cabPts);
    ctx.fillStyle = cg;
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.35)';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    /* --- شیشه‌ها --- */
    for (let i = 0; i < G.glass.length; i++) {
      drawGlass(ctx, G.glass[i], car.glass[i], H, t);
    }

    // ستون B و قاب
    ctx.beginPath();
    ctx.moveTo(-L * 0.017, -H * 0.60);
    ctx.lineTo(-L * 0.017, -H * 0.90);
    ctx.strokeStyle = 'rgba(10,12,18,.85)';
    ctx.lineWidth = Math.max(2, L * 0.013);
    ctx.stroke();

    /* --- خطوط درها / دستگیره --- */
    ctx.strokeStyle = 'rgba(0,0,0,.22)';
    ctx.lineWidth = 1.3;
    const doorX = -L * 0.02;
    ctx.beginPath();
    ctx.moveTo(doorX, -H * 0.585);
    ctx.quadraticCurveTo(doorX + L * 0.005, -H * 0.34, doorX - L * 0.005, -H * 0.10);
    ctx.stroke();

    ctx.fillStyle = 'rgba(230,235,240,.5)';
    roundRect(ctx, doorX - L * 0.055, -H * 0.50, L * 0.045, H * 0.022, H * 0.011);
    ctx.fill();
    ctx.fillStyle = 'rgba(230,235,240,.42)';
    roundRect(ctx, doorX + L * 0.10, -H * 0.50, L * 0.045, H * 0.022, H * 0.011);
    ctx.fill();

    /* --- آینه بغل --- */
    const mirX = -L * 0.215, mirY = -H * 0.66;
    ctx.beginPath();
    ctx.moveTo(mirX, mirY);
    ctx.lineTo(mirX - L * 0.05, mirY - H * 0.03);
    ctx.lineTo(mirX - L * 0.055, mirY + H * 0.02);
    ctx.lineTo(mirX, mirY + H * 0.035);
    ctx.closePath();
    ctx.fillStyle = shade(col, 0.7);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.18)';
    ctx.lineWidth = 1;
    ctx.stroke();

    /* --- چرخ‌ها --- */
    for (const w of G.wheels) {
      // سایه‌ی چرخ‌خانه
      ctx.beginPath();
      ctx.arc(w.x, -w.r, w.r * 1.18, Math.PI * 1.02, Math.PI * 1.98);
      ctx.strokeStyle = 'rgba(0,0,0,.5)';
      ctx.lineWidth = w.r * 0.42;
      ctx.stroke();
      drawWheel(ctx, w.x, -w.r, w.r, car.wheelRot, m.trim, false);
    }

    /* --- چراغ جلو (سمت چپ = جلو) --- */
    const hx = L * 0.455, hy = -H * 0.40;
    ctx.save();
    ctx.shadowColor = 'rgba(255,245,210,.95)';
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.moveTo(-hx + L * 0.02, hy - H * 0.045);
    ctx.lineTo(-hx - L * 0.055, hy - H * 0.02);
    ctx.lineTo(-hx - L * 0.05, hy + H * 0.035);
    ctx.lineTo(-hx + L * 0.02, hy + H * 0.05);
    ctx.closePath();
    ctx.fillStyle = '#fffbe8';
    ctx.fill();
    ctx.restore();

    // پرتو چراغ
    if (!car.dead) {
      const beam = ctx.createLinearGradient(-hx, hy, -hx - L * 0.6, hy);
      beam.addColorStop(0, 'rgba(255,240,200,.22)');
      beam.addColorStop(1, 'rgba(255,240,200,0)');
      ctx.beginPath();
      ctx.moveTo(-hx, hy - H * 0.05);
      ctx.lineTo(-hx - L * 0.62, hy - H * 0.22);
      ctx.lineTo(-hx - L * 0.62, hy + H * 0.20);
      ctx.lineTo(-hx, hy + H * 0.05);
      ctx.closePath();
      ctx.fillStyle = beam;
      ctx.fill();
    }

    /* --- چراغ عقب (سمت راست) --- */
    ctx.save();
    ctx.shadowColor = 'rgba(255,40,30,.9)';
    ctx.shadowBlur = 14;
    ctx.fillStyle = '#ff3b30';
    roundRect(ctx, L * 0.44, -H * 0.46, L * 0.055, H * 0.075, 3);
    ctx.fill();
    ctx.restore();

    /* --- جلوپنجره / نشان --- */
    const gx = -L * 0.485, gy = -H * 0.36;
    if (m.grille === 'star') {
      ctx.beginPath();
      ctx.moveTo(gx, gy - H * 0.10);
      ctx.lineTo(gx + L * 0.03, gy);
      ctx.lineTo(gx, gy + H * 0.10);
      ctx.closePath();
      ctx.fillStyle = 'rgba(20,22,26,.9)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(230,235,240,.5)';
      ctx.lineWidth = 1;
      ctx.stroke();
    } else if (m.grille === 'kidney') {
      ctx.fillStyle = 'rgba(14,16,20,.9)';
      roundRect(ctx, gx + L * 0.012, gy - H * 0.075, L * 0.022, H * 0.15, 3);
      ctx.fill();
    } else if (m.grille === 'tall') {
      ctx.fillStyle = '#cfd3d8';
      roundRect(ctx, gx + L * 0.005, gy - H * 0.14, L * 0.032, H * 0.28, 4);
      ctx.fill();
      ctx.strokeStyle = 'rgba(60,64,70,.6)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(gx + L * 0.005, gy - H * 0.14 + i * H * 0.07);
        ctx.lineTo(gx + L * 0.037, gy - H * 0.14 + i * H * 0.07);
        ctx.stroke();
      }
    } else if (m.grille === 'mesh') {
      ctx.fillStyle = 'rgba(16,18,22,.85)';
      roundRect(ctx, gx + L * 0.008, gy - H * 0.09, L * 0.028, H * 0.18, 4);
      ctx.fill();
      ctx.strokeStyle = 'rgba(200,205,210,.45)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // نشان روی در
    const ex = L * 0.10, ey = -H * 0.40;
    ctx.beginPath();
    ctx.arc(ex, ey, H * 0.028, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(225,230,238,.55)';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(ex, ey, H * 0.014, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(20,22,28,.8)';
    ctx.fill();

    /* --- دریچه/بال --- */
    if (m.vent) {
      ctx.beginPath();
      ctx.moveTo(L * 0.02, -H * 0.56);
      ctx.lineTo(L * 0.16, -H * 0.52);
      ctx.lineTo(L * 0.15, -H * 0.40);
      ctx.lineTo(L * 0.02, -H * 0.44);
      ctx.closePath();
      ctx.fillStyle = 'rgba(0,0,0,.35)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.14)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    if (m.wing) {
      const wy = -H * Math.min(0.90, 0.68 + m.wing * 0.5);
      const deckY = -H * 0.60;
      // پایه‌ها
      ctx.fillStyle = shade(col, 0.42);
      ctx.fillRect(L * 0.325, wy + H * 0.02, L * 0.022, deckY - wy - H * 0.02);
      ctx.fillRect(L * 0.435, wy + H * 0.02, L * 0.022, deckY - wy - H * 0.02);
      // تیغه‌ی بال
      ctx.beginPath();
      ctx.moveTo(L * 0.285, wy + H * 0.035);
      ctx.lineTo(L * 0.492, wy - H * 0.005);
      ctx.lineTo(L * 0.492, wy + H * 0.042);
      ctx.lineTo(L * 0.285, wy + H * 0.082);
      ctx.closePath();
      ctx.fillStyle = shade(col, 0.52);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,.45)';
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(L * 0.285, wy + H * 0.037);
      ctx.lineTo(L * 0.492, wy - H * 0.003);
      ctx.strokeStyle = 'rgba(255,255,255,.22)';
      ctx.lineWidth = 1.6;
      ctx.stroke();
    }

    // اگزوز
    ctx.beginPath();
    ctx.ellipse(L * 0.47, -H * 0.09, L * 0.014, H * 0.022, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#20232a';
    ctx.fill();

    ctx.restore();
  }

  /* =========================================================
     ساخت وضعیت شیشه برای یک ماشین
     ========================================================= */
  function makeGlass(armoredIndex) {
    return [0, 1].map((i) => ({
      broken: false,
      hp: armoredIndex === i ? 2 : 1,
      armored: armoredIndex === i,
      hit: null,
      cracks: [],
      shards: null
    }));
  }

  /* تولید ترک و تکه‌های شیشه (مختصات محلی ماشین) */
  function shatter(model, glassIndex, localPoint) {
    const G = geometry(model);
    const poly = G.glass[glassIndex];
    const xs = poly.map((p) => p[0]), ys = poly.map((p) => p[1]);
    const minX = Math.min.apply(null, xs), maxX = Math.max.apply(null, xs);
    const minY = Math.min.apply(null, ys), maxY = Math.max.apply(null, ys);
    const hit = localPoint || [(minX + maxX) / 2, (minY + maxY) / 2];

    const cracks = [];
    const n = 9 + Math.floor(Math.random() * 5);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = (0.6 + Math.random() * 0.9) * Math.max(maxX - minX, maxY - minY);
      cracks.push({
        x0: hit[0], y0: hit[1],
        x1: hit[0] + Math.cos(a) * r,
        y1: hit[1] + Math.sin(a) * r
      });
    }
    // حلقه‌ی ترک
    for (let i = 0; i < 5; i++) {
      const a0 = (i / 5) * Math.PI * 2, a1 = ((i + 1) / 5) * Math.PI * 2;
      const rr = (maxX - minX) * 0.22;
      cracks.push({
        x0: hit[0] + Math.cos(a0) * rr, y0: hit[1] + Math.sin(a0) * rr,
        x1: hit[0] + Math.cos(a1) * rr, y1: hit[1] + Math.sin(a1) * rr
      });
    }

    // تکه‌های باقی‌مانده در لبه‌ها
    const shards = [];
    const shardN = 14;
    for (let i = 0; i < shardN; i++) {
      const p = poly[i % poly.length];
      const q = poly[(i + 1) % poly.length];
      const t0 = Math.random() * 0.7, t1 = t0 + 0.15 + Math.random() * 0.2;
      const ax = p[0] + (q[0] - p[0]) * t0, ay = p[1] + (q[1] - p[1]) * t0;
      const bx = p[0] + (q[0] - p[0]) * Math.min(1, t1), by = p[1] + (q[1] - p[1]) * Math.min(1, t1);
      const inx = (minX + maxX) / 2, iny = (minY + maxY) / 2;
      const cx = ax + (inx - ax) * (0.06 + Math.random() * 0.14);
      const cy = ay + (iny - ay) * (0.06 + Math.random() * 0.14);
      shards.push([ax, ay, bx, by, cx, cy]);
    }

    return { hit, cracks, shards };
  }

  function randomModel() {
    return MODELS[Math.floor(Math.random() * MODELS.length)];
  }

  return {
    MODELS, ARCH, geometry, draw, makeGlass, shatter, randomModel, shade
  };
})();
