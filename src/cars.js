// Luxury Car Catalog & High-Craft Procedural Front-3/4 Renderer

export const LUXURY_CARS = [
  {
    id: 'benz_amg',
    name: 'بنز AMG GT',
    shortName: 'بنز AMG',
    brand: 'benz',
    width: 2.55,
    height: 1.48,
    speed: 19.5,
    windshieldHp: 1,
    bodyHp: 2,
    score: 150,
    colors: [
      { body: '#d9e0e8', dark: '#7c8796', accent: '#ffffff', trim: '#1d222b' },
      { body: '#232830', dark: '#101318', accent: '#8ca0ba', trim: '#c7d2e0' },
      { body: '#f0ede6', dark: '#9e9990', accent: '#ffffff', trim: '#222730' }
    ],
    laneChangeChance: 0.25,
    minWave: 1,
    weight: 26
  },
  {
    id: 'benz_g63',
    name: 'بنز G63 جی‌کلاس',
    shortName: 'بنز G63',
    brand: 'benz_g',
    width: 2.75,
    height: 2.08,
    speed: 16.5,
    windshieldHp: 2,
    bodyHp: 3,
    score: 320,
    armored: true,
    colors: [
      { body: '#1f2329', dark: '#0d1014', accent: '#6b7788', trim: '#d5dde8' },
      { body: '#3b493f', dark: '#1d2620', accent: '#8fa394', trim: '#15191c' },
      { body: '#e6e3dc', dark: '#8d8a82', accent: '#ffffff', trim: '#191d22' }
    ],
    laneChangeChance: 0.1,
    minWave: 2,
    weight: 14
  },
  {
    id: 'bmw_m8',
    name: 'بی‌ام‌و M8',
    shortName: 'بی‌ام‌و M8',
    brand: 'bmw',
    width: 2.5,
    height: 1.48,
    speed: 21.5,
    windshieldHp: 1,
    bodyHp: 2,
    score: 170,
    colors: [
      { body: '#1c5fb8', dark: '#0e2f63', accent: '#69b4ff', trim: '#101622' },
      { body: '#49257a', dark: '#210f3d', accent: '#a87dff', trim: '#12121c' },
      { body: '#cfd8e3', dark: '#6d7a8a', accent: '#ffffff', trim: '#171c26' }
    ],
    laneChangeChance: 0.35,
    minWave: 1,
    weight: 20
  },
  {
    id: 'porsche',
    name: 'پورشه ۹۱۱ GT3',
    shortName: 'پورشه ۹۱۱',
    brand: 'porsche',
    width: 2.42,
    height: 1.4,
    speed: 23.5,
    windshieldHp: 1,
    bodyHp: 2,
    score: 200,
    colors: [
      { body: '#1f88e5', dark: '#0d4685', accent: '#80ccff', trim: '#11161f' },
      { body: '#e5352d', dark: '#7c120d', accent: '#ff968f', trim: '#17171b' },
      { body: '#f0f4f8', dark: '#8a95a3', accent: '#ffffff', trim: '#19202b' }
    ],
    laneChangeChance: 0.45,
    minWave: 1,
    weight: 18
  },
  {
    id: 'lambo',
    name: 'لامبورگینی اونتادور',
    shortName: 'لامبورگینی',
    brand: 'lambo',
    width: 2.66,
    height: 1.24,
    speed: 27.5,
    windshieldHp: 1,
    bodyHp: 2,
    score: 260,
    colors: [
      { body: '#ffd21f', dark: '#9e6f00', accent: '#fff4a8', trim: '#141418' },
      { body: '#ff5d17', dark: '#8f2500', accent: '#ffc28f', trim: '#141418' },
      { body: '#7be815', dark: '#357005', accent: '#d2ff9e', trim: '#141418' }
    ],
    laneChangeChance: 0.5,
    minWave: 2,
    weight: 14
  },
  {
    id: 'ferrari',
    name: 'فراری SF90',
    shortName: 'فراری',
    brand: 'ferrari',
    width: 2.58,
    height: 1.28,
    speed: 28.5,
    windshieldHp: 1,
    bodyHp: 2,
    score: 280,
    colors: [
      { body: '#e31b23', dark: '#75090d', accent: '#ff8a8f', trim: '#161417' },
      { body: '#ffbf00', dark: '#8f6200', accent: '#fff0a3', trim: '#161417' }
    ],
    laneChangeChance: 0.45,
    minWave: 3,
    weight: 12
  },
  {
    id: 'bentley',
    name: 'بنتلی کانتیننتال',
    shortName: 'بنتلی',
    brand: 'bentley',
    width: 2.6,
    height: 1.54,
    speed: 20.0,
    windshieldHp: 1,
    bodyHp: 2,
    score: 210,
    colors: [
      { body: '#155c42', dark: '#08291d', accent: '#6fd4aa', trim: '#dbe6e1' },
      { body: '#273552', dark: '#101829', accent: '#89a3d6', trim: '#e0e6f0' }
    ],
    laneChangeChance: 0.2,
    minWave: 2,
    weight: 13
  },
  {
    id: 'rolls',
    name: 'رولزرویس فانتوم',
    shortName: 'رولزرویس VIP',
    brand: 'rolls',
    width: 2.82,
    height: 1.84,
    speed: 17.5,
    windshieldHp: 2,
    bodyHp: 3,
    score: 450,
    armored: true,
    vip: true,
    colors: [
      { body: '#5c1836', dark: '#290717', accent: '#f3d18a', trim: '#f2e4c4' },
      { body: '#1a1f36', dark: '#090b17', accent: '#e8d49c', trim: '#eef2fa' }
    ],
    laneChangeChance: 0.08,
    minWave: 2,
    weight: 9
  }
];

export function pickLuxuryCarSpec(wave) {
  const eligible = LUXURY_CARS.filter((c) => c.minWave <= wave);
  const totalWeight = eligible.reduce((acc, c) => acc + c.weight, 0);
  let r = Math.random() * totalWeight;
  for (const spec of eligible) {
    r -= spec.weight;
    if (r <= 0) return spec;
  }
  return eligible[0];
}

function roundedRectPath(ctx, x, y, w, h, r) {
  const rad = Math.min(r, w * 0.5, h * 0.5);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.lineTo(x + w - rad, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rad);
  ctx.lineTo(x + w, y + h - rad);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
  ctx.lineTo(x + rad, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rad);
  ctx.lineTo(x, y + rad);
  ctx.quadraticCurveTo(x, y, x + rad, y);
  ctx.closePath();
}

export function drawLuxuryCar(ctx, car, proj, time, isLockedOn) {
  const { sx, sy, scale } = proj;
  const w = car.spec.width * scale;
  const h = car.spec.height * scale;

  if (w < 6) return;

  const isBoxy = car.spec.brand === 'benz_g' || car.spec.brand === 'rolls';
  const isSuperLow = car.spec.brand === 'lambo' || car.spec.brand === 'ferrari';
  const palette = car.palette;
  const disabled = car.state === 'swerving' || car.state === 'crashed';

  ctx.save();
  ctx.translate(sx, sy);

  // Suspension micro-bounce + hit wobble + swerve roll/yaw
  const bounce = disabled
    ? Math.sin(time * 28 + car.id) * scale * 0.05
    : Math.sin(time * 14 + car.id) * scale * 0.015;
  ctx.translate(0, bounce);

  // Ground shadow (before rotation so it stays grounded while car tilts/flips)
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.56)';
  ctx.beginPath();
  ctx.ellipse(0, 0, w * 0.6, Math.max(2, h * 0.14), 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Headlight volumetric cones on the highway asphalt ahead of the car
  if (!disabled && car.z > 2 && car.z < 95) {
    const beamAlpha = Math.min(0.28, (1 - car.z / 110) * 0.34);
    const beamLen = h * 1.45;
    const lx = -w * 0.34;
    const rx = w * 0.34;
    const ly = -h * 0.25;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const bx of [lx, rx]) {
      const grad = ctx.createLinearGradient(bx, ly, bx * 1.35, ly + beamLen);
      grad.addColorStop(0, `rgba(255, 246, 214, ${beamAlpha})`);
      grad.addColorStop(1, 'rgba(255, 210, 140, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(bx - w * 0.06, ly);
      ctx.lineTo(bx + w * 0.06, ly);
      ctx.lineTo(bx + w * 0.26, ly + beamLen);
      ctx.lineTo(bx - w * 0.26, ly + beamLen);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  // Apply swerve tilt & flip rotation around car base
  const tilt = car.roll + car.wobble;
  if (Math.abs(tilt) > 0.001) {
    ctx.translate(0, -h * 0.38);
    ctx.rotate(tilt);
    ctx.translate(0, h * 0.38);
  }

  // Hit flash tint
  const flash = car.hitFlash > 0;

  // --- WHEELS ---
  const wheelW = w * 0.16;
  const wheelH = h * (isBoxy ? 0.27 : 0.28);
  ctx.fillStyle = '#0e0f13';
  roundedRectPath(ctx, -w * 0.48, -wheelH, wheelW, wheelH * 1.05, wheelW * 0.28);
  ctx.fill();
  roundedRectPath(ctx, w * 0.48 - wheelW, -wheelH, wheelW, wheelH * 1.05, wheelW * 0.28);
  ctx.fill();

  // Tire tread highlight
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.fillRect(-w * 0.44, -wheelH * 0.85, wheelW * 0.4, wheelH * 0.7);
  ctx.fillRect(w * 0.48 - wheelW * 0.6, -wheelH * 0.85, wheelW * 0.4, wheelH * 0.7);

  // --- LOWER CHASSIS / BUMPER & HOOD ---
  const bodyBottom = -h * 0.14;
  const bodyH = h * (isBoxy ? 0.45 : isSuperLow ? 0.48 : 0.46);
  const bodyTop = bodyBottom - bodyH;

  const bodyGrad = ctx.createLinearGradient(0, bodyTop - h * 0.2, 0, bodyBottom);
  bodyGrad.addColorStop(0, flash ? '#fff2cc' : palette.accent);
  bodyGrad.addColorStop(0.32, flash ? '#ffbe6b' : palette.body);
  bodyGrad.addColorStop(1, flash ? '#d95b16' : palette.dark);

  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  if (isSuperLow) {
    // Sleek angular supercar nose
    ctx.moveTo(-w * 0.51, bodyBottom);
    ctx.lineTo(-w * 0.48, bodyTop + bodyH * 0.22);
    ctx.lineTo(-w * 0.34, bodyTop);
    ctx.lineTo(w * 0.34, bodyTop);
    ctx.lineTo(w * 0.48, bodyTop + bodyH * 0.22);
    ctx.lineTo(w * 0.51, bodyBottom);
  } else if (isBoxy) {
    // Bold upright G-Wagon / Rolls front
    const r = w * 0.04;
    ctx.moveTo(-w * 0.47, bodyBottom);
    ctx.lineTo(-w * 0.47, bodyTop + r);
    ctx.quadraticCurveTo(-w * 0.47, bodyTop, -w * 0.47 + r, bodyTop);
    ctx.lineTo(w * 0.47 - r, bodyTop);
    ctx.quadraticCurveTo(w * 0.47, bodyTop, w * 0.47, bodyTop + r);
    ctx.lineTo(w * 0.47, bodyBottom);
  } else {
    // Luxury GT / Coupe sculpted fenders
    ctx.moveTo(-w * 0.49, bodyBottom);
    ctx.quadraticCurveTo(-w * 0.5, bodyTop + bodyH * 0.2, -w * 0.39, bodyTop);
    ctx.lineTo(w * 0.39, bodyTop);
    ctx.quadraticCurveTo(w * 0.5, bodyTop + bodyH * 0.2, w * 0.49, bodyBottom);
  }
  ctx.closePath();
  ctx.fill();

  // Front carbon splitter / lower lip
  ctx.fillStyle = '#0d0f14';
  ctx.fillRect(-w * 0.46, bodyBottom - h * 0.055, w * 0.92, h * 0.065);

  // Side mirrors
  const mirrorY = bodyTop - h * 0.04;
  ctx.fillStyle = palette.body;
  roundedRectPath(ctx, -w * 0.54, mirrorY, w * 0.1, h * 0.085, h * 0.03);
  ctx.fill();
  roundedRectPath(ctx, w * 0.44, mirrorY, w * 0.1, h * 0.085, h * 0.03);
  ctx.fill();

  // --- CABIN & ROOF ---
  const roofBottom = bodyTop + h * 0.04;
  const roofH = h * (isBoxy ? 0.42 : isSuperLow ? 0.39 : 0.41);
  const roofTop = roofBottom - roofH;
  const roofTopHalfW = w * (isBoxy ? 0.4 : isSuperLow ? 0.31 : 0.34);
  const roofBotHalfW = w * (isBoxy ? 0.44 : 0.42);

  // A-pillars & roof frame
  const roofGrad = ctx.createLinearGradient(0, roofTop, 0, roofBottom);
  roofGrad.addColorStop(0, palette.accent);
  roofGrad.addColorStop(0.5, palette.body);
  roofGrad.addColorStop(1, palette.dark);
  ctx.fillStyle = roofGrad;
  ctx.beginPath();
  ctx.moveTo(-roofBotHalfW, roofBottom);
  ctx.lineTo(-roofTopHalfW, roofTop);
  ctx.lineTo(roofTopHalfW, roofTop);
  ctx.lineTo(roofBotHalfW, roofBottom);
  ctx.closePath();
  ctx.fill();

  // --- WINDSHIELD (THE PRIMARY TARGET!) ---
  const wsTopY = roofTop + roofH * 0.14;
  const wsBotY = roofBottom - roofH * 0.05;
  const wsTopHalfW = roofTopHalfW * 0.87;
  const wsBotHalfW = roofBotHalfW * 0.88;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(-wsBotHalfW, wsBotY);
  ctx.lineTo(-wsTopHalfW, wsTopY);
  ctx.lineTo(wsTopHalfW, wsTopY);
  ctx.lineTo(wsBotHalfW, wsBotY);
  ctx.closePath();

  if (disabled) {
    // Completely shattered hollow dark cabin with inner flames!
    const fireCabGrad = ctx.createLinearGradient(0, wsTopY, 0, wsBotY);
    fireCabGrad.addColorStop(0, '#12080a');
    fireCabGrad.addColorStop(0.55, '#3b1109');
    fireCabGrad.addColorStop(1, '#ff6414');
    ctx.fillStyle = fireCabGrad;
    ctx.fill();

    // Jagged remaining glass shards clinging to frame corners
    ctx.fillStyle = 'rgba(205, 236, 255, 0.75)';
    ctx.beginPath();
    ctx.moveTo(-wsTopHalfW, wsTopY);
    ctx.lineTo(-wsTopHalfW + w * 0.1, wsTopY);
    ctx.lineTo(-wsTopHalfW + w * 0.03, wsTopY + roofH * 0.25);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(wsTopHalfW, wsTopY);
    ctx.lineTo(wsTopHalfW - w * 0.11, wsTopY);
    ctx.lineTo(wsTopHalfW - w * 0.04, wsTopY + roofH * 0.22);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(-wsBotHalfW, wsBotY);
    ctx.lineTo(-wsBotHalfW + w * 0.14, wsBotY);
    ctx.lineTo(-wsBotHalfW + w * 0.05, wsBotY - roofH * 0.2);
    ctx.closePath();
    ctx.fill();
  } else {
    // Glossy luxury tinted windshield
    const wsGrad = ctx.createLinearGradient(0, wsTopY, 0, wsBotY);
    if (car.spec.armored && car.windshieldHp > 1) {
      wsGrad.addColorStop(0, '#2a4c6e');
      wsGrad.addColorStop(0.45, '#192a42');
      wsGrad.addColorStop(1, '#0c1322');
    } else {
      wsGrad.addColorStop(0, '#446d91');
      wsGrad.addColorStop(0.42, '#1f2e48');
      wsGrad.addColorStop(1, '#0e1320');
    }
    ctx.fillStyle = wsGrad;
    ctx.fill();

    // Clip reflections and cracks inside windshield
    ctx.clip();

    // Driver silhouette inside cabin
    ctx.fillStyle = 'rgba(8, 10, 16, 0.72)';
    ctx.beginPath();
    ctx.arc(-wsBotHalfW * 0.36, wsBotY - roofH * 0.32, w * 0.075, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(-wsBotHalfW * 0.36, wsBotY + roofH * 0.02, w * 0.14, roofH * 0.28, 0, Math.PI, 0);
    ctx.fill();

    // Animated diagonal sunset reflection sheen
    const sheenOffset = ((time * 0.7 + car.id * 0.31) % 2.4) - 1.2;
    const sheenX = sheenOffset * wsBotHalfW;
    const sheenGrad = ctx.createLinearGradient(sheenX - w * 0.18, wsTopY, sheenX + w * 0.18, wsBotY);
    sheenGrad.addColorStop(0, 'rgba(255, 214, 158, 0)');
    sheenGrad.addColorStop(0.48, 'rgba(255, 224, 182, 0.36)');
    sheenGrad.addColorStop(0.55, 'rgba(255, 255, 255, 0.5)');
    sheenGrad.addColorStop(1, 'rgba(255, 214, 158, 0)');
    ctx.fillStyle = sheenGrad;
    ctx.beginPath();
    ctx.moveTo(sheenX - w * 0.14, wsTopY);
    ctx.lineTo(sheenX + w * 0.06, wsTopY);
    ctx.lineTo(sheenX - w * 0.14, wsBotY);
    ctx.lineTo(sheenX - w * 0.34, wsBotY);
    ctx.closePath();
    ctx.fill();

    // Spiderweb glass crack if partially damaged (e.g. Armored G-Class or Rolls after 1st hit!)
    if (car.windshieldCracked) {
      const cx = (car.crackOffsetX || 0) * wsBotHalfW * 0.5;
      const cy = (wsTopY + wsBotY) * 0.52;

      // Glowing magma scorch mark at impact center
      const scorch = ctx.createRadialGradient(cx, cy, 0, cx, cy, w * 0.16);
      scorch.addColorStop(0, 'rgba(255, 130, 30, 0.85)');
      scorch.addColorStop(0.5, 'rgba(255, 65, 15, 0.35)');
      scorch.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = scorch;
      ctx.beginPath();
      ctx.arc(cx, cy, w * 0.16, 0, Math.PI * 2);
      ctx.fill();

      // White crystalline spiderweb fracture lines
      ctx.strokeStyle = 'rgba(235, 248, 255, 0.92)';
      ctx.lineWidth = Math.max(1, scale * 0.032);
      for (let i = 0; i < 9; i++) {
        const ang = (i / 9) * Math.PI * 2 + 0.3;
        const len = w * (0.22 + (i % 3) * 0.09);
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        const mx = cx + Math.cos(ang + 0.08) * len * 0.5;
        const my = cy + Math.sin(ang + 0.08) * len * 0.5;
        ctx.lineTo(mx, my);
        ctx.lineTo(cx + Math.cos(ang) * len, cy + Math.sin(ang) * len);
        ctx.stroke();
      }
      // Concentric fracture ring
      ctx.beginPath();
      ctx.arc(cx, cy, w * 0.11, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  ctx.restore();

  // Subtle windshield chrome border + lock-on target glow
  ctx.strokeStyle = isLockedOn && !disabled ? '#ffd954' : 'rgba(255, 255, 255, 0.28)';
  ctx.lineWidth = isLockedOn && !disabled ? Math.max(1.8, scale * 0.065) : Math.max(1, scale * 0.025);
  ctx.beginPath();
  ctx.moveTo(-wsBotHalfW, wsBotY);
  ctx.lineTo(-wsTopHalfW, wsTopY);
  ctx.lineTo(wsTopHalfW, wsTopY);
  ctx.lineTo(wsBotHalfW, wsBotY);
  ctx.closePath();
  ctx.stroke();

  // --- BRAND-SPECIFIC GRILLES, BADGES & HEADLIGHTS ---
  drawBrandFrontDetails(ctx, car, w, h, bodyTop, bodyBottom, bodyH, disabled, time);

  // --- HOOD DAMAGE / FLAMES IF DISABLED ---
  if (disabled) {
    // Flickering engine fire bursting out of shattered windshield & hood
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 3; i++) {
      const fx = Math.sin(time * 22 + i * 2.1 + car.id) * w * 0.16;
      const fy = bodyTop - Math.abs(Math.cos(time * 18 + i)) * h * 0.18;
      const fr = w * (0.14 + (i % 2) * 0.06);
      const fg = ctx.createRadialGradient(fx, fy, 0, fx, fy, fr);
      fg.addColorStop(0, 'rgba(255, 245, 160, 0.92)');
      fg.addColorStop(0.45, 'rgba(255, 110, 20, 0.72)');
      fg.addColorStop(1, 'rgba(255, 40, 0, 0)');
      ctx.fillStyle = fg;
      ctx.beginPath();
      ctx.arc(fx, fy, fr, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // --- ARMOR / VIP INDICATOR BADGE ---
  if (!disabled && car.spec.armored && car.windshieldHp > 1 && w > 34) {
    const tagY = roofTop - Math.max(8, h * 0.18);
    ctx.save();
    ctx.font = `700 ${Math.max(10, Math.min(13, w * 0.14))}px Vazirmatn, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillStyle = car.spec.vip ? '#ffd954' : '#9ee2ff';
    ctx.shadowColor = 'rgba(0,0,0,0.85)';
    ctx.shadowBlur = 4;
    ctx.fillText(car.spec.vip ? '👑 زرهی VIP' : '🛡 شیشه دوجداره', 0, tagY);
    ctx.restore();
  } else if (isLockedOn && !disabled && w > 30) {
    const tagY = roofTop - Math.max(8, h * 0.16);
    ctx.save();
    ctx.font = `800 ${Math.max(10, Math.min(14, w * 0.15))}px Vazirmatn, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffe169';
    ctx.shadowColor = 'rgba(0,0,0,0.9)';
    ctx.shadowBlur = 5;
    ctx.fillText(car.spec.shortName, 0, tagY);
    ctx.restore();
  }

  ctx.restore();
}

function drawBrandFrontDetails(ctx, car, w, h, bodyTop, bodyBottom, bodyH, disabled, time) {
  const brand = car.spec.brand;
  const midY = bodyTop + bodyH * 0.56;
  const hlY = bodyTop + bodyH * 0.36;

  // Headlight glow state (flickers wildly when disabled or cracked!)
  const hlOn = disabled
    ? Math.sin(time * 45 + car.id) > 0.35
    : true;
  const hlColor = hlOn ? '#fffbe6' : '#3a3f4a';

  if (brand === 'benz' || brand === 'benz_g') {
    // Iconic Mercedes Panamericana / horizontal grille + 3-pointed star!
    const gw = w * (brand === 'benz_g' ? 0.48 : 0.42);
    const gh = bodyH * (brand === 'benz_g' ? 0.34 : 0.42);
    const gy = midY - gh * 0.45;

    ctx.fillStyle = '#11141a';
    roundedRectPath(ctx, -gw * 0.5, gy, gw, gh, gh * 0.22);
    ctx.fill();

    // Chrome border
    ctx.strokeStyle = '#d5dfeb';
    ctx.lineWidth = Math.max(1, w * 0.015);
    ctx.stroke();

    // Vertical slats for AMG GT, horizontal bars for G-Class
    ctx.strokeStyle = 'rgba(220, 232, 245, 0.65)';
    ctx.lineWidth = Math.max(0.8, w * 0.01);
    if (brand === 'benz') {
      for (let i = -3; i <= 3; i++) {
        const sx = (i / 4) * gw * 0.45;
        ctx.beginPath();
        ctx.moveTo(sx, gy + 2);
        ctx.lineTo(sx, gy + gh - 2);
        ctx.stroke();
      }
    } else {
      for (let j = 1; j <= 2; j++) {
        const sy = gy + (gh * j) / 3;
        ctx.beginPath();
        ctx.moveTo(-gw * 0.46, sy);
        ctx.lineTo(gw * 0.46, sy);
        ctx.stroke();
      }
    }

    // Iconic 3-pointed Mercedes star emblem right in the center!
    const starR = Math.max(3, gh * 0.42);
    const starY = gy + gh * 0.5;
    ctx.fillStyle = '#151922';
    ctx.beginPath();
    ctx.arc(0, starY, starR, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#f2f7ff';
    ctx.lineWidth = Math.max(1, w * 0.014);
    ctx.stroke();

    // 3 points of the star
    for (let p = 0; p < 3; p++) {
      const ang = -Math.PI / 2 + (p * Math.PI * 2) / 3;
      ctx.beginPath();
      ctx.moveTo(0, starY);
      ctx.lineTo(Math.cos(ang) * starR * 0.85, starY + Math.sin(ang) * starR * 0.85);
      ctx.stroke();
    }

    // Headlights
    if (brand === 'benz_g') {
      // Iconic round G-Wagon halo headlights
      const r = w * 0.072;
      for (const side of [-1, 1]) {
        const hx = side * w * 0.34;
        ctx.fillStyle = '#14171f';
        ctx.beginPath();
        ctx.arc(hx, starY, r * 1.15, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = hlColor;
        ctx.lineWidth = Math.max(1.4, w * 0.02);
        ctx.beginPath();
        ctx.arc(hx, starY, r * 0.85, 0, Math.PI * 2);
        ctx.stroke();
        if (hlOn) {
          ctx.fillStyle = 'rgba(255, 250, 224, 0.75)';
          ctx.beginPath();
          ctx.arc(hx, starY, r * 0.48, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else {
      // Sleek aggressive AMG DRL eyebrows
      for (const side of [-1, 1]) {
        ctx.fillStyle = hlColor;
        ctx.beginPath();
        ctx.moveTo(side * w * 0.25, hlY + bodyH * 0.08);
        ctx.lineTo(side * w * 0.44, hlY - bodyH * 0.06);
        ctx.lineTo(side * w * 0.42, hlY + bodyH * 0.14);
        ctx.lineTo(side * w * 0.26, hlY + bodyH * 0.17);
        ctx.closePath();
        ctx.fill();
      }
    }
  } else if (brand === 'bmw') {
    // Iconic BMW twin kidney grilles!
    const kw = w * 0.17;
    const kh = bodyH * 0.42;
    const ky = midY - kh * 0.45;
    for (const side of [-1, 1]) {
      const kx = side < 0 ? -kw - w * 0.02 : w * 0.02;
      ctx.fillStyle = '#111520';
      roundedRectPath(ctx, kx, ky, kw, kh, kw * 0.32);
      ctx.fill();
      ctx.strokeStyle = '#a8d5ff';
      ctx.lineWidth = Math.max(1.2, w * 0.015);
      ctx.stroke();
    }
    // Quad angel-eye headlights
    for (const side of [-1, 1]) {
      const hx = side * w * 0.34;
      ctx.strokeStyle = hlColor;
      ctx.lineWidth = Math.max(1.3, w * 0.018);
      ctx.beginPath();
      ctx.arc(hx - side * w * 0.035, hlY + bodyH * 0.08, w * 0.04, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(hx + side * w * 0.04, hlY + bodyH * 0.06, w * 0.036, 0, Math.PI * 2);
      ctx.stroke();
    }
  } else if (brand === 'rolls') {
    // Tall chrome Parthenon vertical grille + golden Spirit of Ecstasy!
    const gw = w * 0.34;
    const gh = bodyH * 0.72;
    const gy = bodyTop + bodyH * 0.12;
    const gGrad = ctx.createLinearGradient(-gw * 0.5, gy, gw * 0.5, gy);
    gGrad.addColorStop(0, '#c7ccd4');
    gGrad.addColorStop(0.5, '#ffffff');
    gGrad.addColorStop(1, '#a9b0bd');
    ctx.fillStyle = gGrad;
    roundedRectPath(ctx, -gw * 0.5, gy, gw, gh, w * 0.02);
    ctx.fill();

    ctx.strokeStyle = '#474f5e';
    ctx.lineWidth = Math.max(0.8, w * 0.01);
    for (let i = -4; i <= 4; i++) {
      const sx = (i / 5) * gw * 0.44;
      ctx.beginPath();
      ctx.moveTo(sx, gy + 2);
      ctx.lineTo(sx, gy + gh - 2);
      ctx.stroke();
    }

    // Golden Spirit of Ecstasy ornament on top of grille
    ctx.fillStyle = '#ffd954';
    ctx.beginPath();
    ctx.moveTo(0, gy - h * 0.09);
    ctx.lineTo(-w * 0.03, gy);
    ctx.lineTo(w * 0.03, gy);
    ctx.closePath();
    ctx.fill();

    // Rectangular luxury LED headlights
    for (const side of [-1, 1]) {
      const hx = side < 0 ? -w * 0.43 : w * 0.24;
      ctx.fillStyle = hlColor;
      roundedRectPath(ctx, hx, hlY, w * 0.19, bodyH * 0.22, 3);
      ctx.fill();
    }
  } else if (brand === 'lambo') {
    // Low aggressive black hexagon air intakes + Y-shaped LEDs
    ctx.fillStyle = '#101117';
    ctx.beginPath();
    ctx.moveTo(-w * 0.42, bodyBottom - h * 0.04);
    ctx.lineTo(-w * 0.34, midY);
    ctx.lineTo(w * 0.34, midY);
    ctx.lineTo(w * 0.42, bodyBottom - h * 0.04);
    ctx.closePath();
    ctx.fill();

    // Y-shaped Lambo headlights
    ctx.strokeStyle = hlColor;
    ctx.lineWidth = Math.max(1.5, w * 0.022);
    ctx.lineCap = 'round';
    for (const side of [-1, 1]) {
      const bx = side * w * 0.28;
      const by = hlY + bodyH * 0.1;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(side * w * 0.41, hlY - bodyH * 0.05);
      ctx.moveTo(bx + side * w * 0.06, by - bodyH * 0.03);
      ctx.lineTo(side * w * 0.42, by + bodyH * 0.09);
      ctx.stroke();
    }
  } else if (brand === 'porsche') {
    // Wide lower intake + signature oval frog-eye headlights
    ctx.fillStyle = '#10131a';
    roundedRectPath(ctx, -w * 0.36, midY + bodyH * 0.04, w * 0.72, bodyH * 0.28, bodyH * 0.1);
    ctx.fill();

    for (const side of [-1, 1]) {
      ctx.fillStyle = hlColor;
      ctx.beginPath();
      ctx.ellipse(side * w * 0.34, hlY + bodyH * 0.02, w * 0.085, bodyH * 0.17, side * 0.22, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (brand === 'ferrari') {
    // Wide Cavallino grille + yellow nose crest + razor LED slits
    ctx.fillStyle = '#121014';
    roundedRectPath(ctx, -w * 0.38, midY + bodyH * 0.02, w * 0.76, bodyH * 0.32, bodyH * 0.12);
    ctx.fill();

    // Yellow Ferrari emblem shield
    ctx.fillStyle = '#ffd926';
    ctx.fillRect(-w * 0.028, bodyTop + bodyH * 0.12, w * 0.056, bodyH * 0.18);

    // Razor LED slits
    for (const side of [-1, 1]) {
      ctx.fillStyle = hlColor;
      ctx.beginPath();
      ctx.moveTo(side * w * 0.22, hlY + bodyH * 0.08);
      ctx.lineTo(side * w * 0.45, hlY - bodyH * 0.08);
      ctx.lineTo(side * w * 0.43, hlY + bodyH * 0.07);
      ctx.closePath();
      ctx.fill();
    }
  } else {
    // Bentley: diamond mesh grille + quad round crystal headlights
    const gw = w * 0.38;
    const gh = bodyH * 0.46;
    const gy = midY - gh * 0.4;
    ctx.fillStyle = '#1b2229';
    roundedRectPath(ctx, -gw * 0.5, gy, gw, gh, w * 0.03);
    ctx.fill();
    ctx.strokeStyle = '#d7e3eb';
    ctx.lineWidth = Math.max(1.2, w * 0.015);
    ctx.stroke();

    for (const side of [-1, 1]) {
      ctx.fillStyle = hlColor;
      ctx.beginPath();
      ctx.arc(side * w * 0.32, hlY + bodyH * 0.12, w * 0.062, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(side * w * 0.42, hlY + bodyH * 0.15, w * 0.038, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Flashing amber hazard blinkers when cracked or swerving!
  if ((car.windshieldCracked || disabled) && Math.floor(time * 8) % 2 === 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = 'rgba(255, 165, 20, 0.9)';
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(side * w * 0.44, bodyBottom - bodyH * 0.22, w * 0.055, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}
