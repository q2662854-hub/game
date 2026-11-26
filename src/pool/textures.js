import * as THREE from 'three';

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function noiseOverlay(ctx, w, h, amount) {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * amount;
    d[i] += n;
    d[i + 1] += n;
    d[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
}

/** Baize cloth: deep tournament green with a fine fibrous weave. */
export function makeClothTexture(renderer, color = '#0a5f42') {
  const w = 1024;
  const h = 1024;
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d');
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, w, h);

  // Very gentle large-scale variation (baize is almost uniform).
  for (let i = 0; i < 40; i++) {
    const r = 120 + Math.random() * 300;
    const g = ctx.createRadialGradient(Math.random() * w, Math.random() * h, 0, Math.random() * w, Math.random() * h, r);
    g.addColorStop(0, Math.random() > 0.5 ? 'rgba(255,255,255,0.018)' : 'rgba(0,0,0,0.022)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }

  // Fine wool weave: dense, short, mostly horizontal fibres.
  for (let i = 0; i < 9000; i++) {
    ctx.strokeStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
    ctx.lineWidth = 0.6;
    const x = Math.random() * w;
    const y = Math.random() * h;
    const a = (Math.random() - 0.5) * 0.5;
    const len = 2 + Math.random() * 5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
    ctx.stroke();
  }
  noiseOverlay(ctx, w, h, 8);

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  tex.repeat.set(1.6, 1.0);
  return tex;
}

/** Height map for the cloth, used as a bump map. */
export function makeClothBump(renderer) {
  const w = 512;
  const c = makeCanvas(w, w);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, w, w);
  ctx.globalAlpha = 0.16;
  for (let i = 0; i < 5000; i++) {
    ctx.fillStyle = Math.random() > 0.5 ? '#ffffff' : '#000000';
    ctx.fillRect(Math.random() * w, Math.random() * w, 1 + Math.random() * 2, 1 + Math.random() * 2);
  }
  ctx.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 3);
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return tex;
}

/** Polished walnut / ebony rail wood. */
export function makeWoodTexture(renderer, base = '#2a1109', light = '#6b2f16') {
  const w = 2048;
  const h = 512;
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d');

  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, light);
  bg.addColorStop(0.45, base);
  bg.addColorStop(1, '#160905');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Grain: long sweeping fibres along U.
  for (let i = 0; i < 300; i++) {
    const y0 = Math.random() * h;
    const amp = 3 + Math.random() * 26;
    const freq = 0.002 + Math.random() * 0.0055;
    const phase = Math.random() * Math.PI * 2;
    const dark = Math.random() > 0.42;
    ctx.strokeStyle = dark
      ? `rgba(12, 4, 2, ${0.05 + Math.random() * 0.24})`
      : `rgba(180, 110, 60, ${0.03 + Math.random() * 0.1})`;
    ctx.lineWidth = 0.8 + Math.random() * 2.6;
    ctx.beginPath();
    for (let x = 0; x <= w; x += 12) {
      const y = y0 + Math.sin(x * freq + phase) * amp + Math.sin(x * freq * 2.7 + phase) * amp * 0.28;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  // Knots.
  for (let k = 0; k < 6; k++) {
    const cx = Math.random() * w;
    const cy = Math.random() * h;
    for (let ring = 1; ring < 9; ring++) {
      ctx.strokeStyle = `rgba(10, 3, 1, ${0.16 - ring * 0.014})`;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.ellipse(cx, cy, ring * 9, ring * 3.4, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // Gloss sheen.
  const gloss = ctx.createLinearGradient(0, 0, w, 0);
  gloss.addColorStop(0, 'rgba(255,190,120,0.05)');
  gloss.addColorStop(0.35, 'rgba(255,210,150,0.14)');
  gloss.addColorStop(0.6, 'rgba(255,190,120,0.04)');
  gloss.addColorStop(1, 'rgba(0,0,0,0.18)');
  ctx.fillStyle = gloss;
  ctx.fillRect(0, 0, w, h);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return tex;
}

/** Roughness variation map for the wood (gloss streaks). */
export function makeWoodRough(renderer) {
  const w = 1024;
  const h = 256;
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#4d4d4d';
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 300; i++) {
    ctx.strokeStyle = `rgba(${Math.random() > 0.5 ? '255,255,255' : '0,0,0'},0.08)`;
    ctx.lineWidth = 1 + Math.random() * 4;
    const y = Math.random() * h;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y + (Math.random() - 0.5) * 10);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

/**
 * Ball skin: white or striped resin ball with two numbered discs
 * painted on opposite sides of the equator.
 */
export function makeBallTexture(number, color, striped) {
  const w = 512;
  const h = 256;
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d');

  const base = striped ? '#f7f2e6' : color;
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);

  if (striped) {
    ctx.fillStyle = color;
    ctx.fillRect(0, h * 0.27, w, h * 0.46);
    // Slightly darker edge under the stripe for depth.
    const g = ctx.createLinearGradient(0, h * 0.27, 0, h * 0.73);
    g.addColorStop(0, 'rgba(0,0,0,0.22)');
    g.addColorStop(0.18, 'rgba(0,0,0,0)');
    g.addColorStop(0.82, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.26)');
    ctx.fillStyle = g;
    ctx.fillRect(0, h * 0.27, w, h * 0.46);
  }

  const discs = number === 0 ? [0.25, 0.75] : [0.25, 0.75];
  for (const u of discs) {
    const cx = u * w;
    const cy = h * 0.5;
    const rx = w * 0.085;
    const ry = h * 0.17;
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#fbf8f0';
    ctx.fill();
    ctx.restore();

    if (number !== 0) {
      ctx.save();
      ctx.fillStyle = '#16171c';
      ctx.font = `700 ${Math.round(h * 0.19)}px "Helvetica Neue", Arial, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(number), cx, cy + h * 0.012);
      ctx.restore();
    } else {
      // Cue ball: a lone red dot on each disc (measle ball).
      ctx.fillStyle = '#c42b2b';
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx * 0.36, ry * 0.36, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Fine wear & speckle.
  ctx.globalAlpha = 0.05;
  for (let i = 0; i < 900; i++) {
    ctx.fillStyle = Math.random() > 0.5 ? '#ffffff' : '#000000';
    ctx.fillRect(Math.random() * w, Math.random() * h, 1, 1);
  }
  ctx.globalAlpha = 1;

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/** Soft radial sprite used for pocket glows and dust puffs. */
export function makeGlowTexture() {
  const s = 128;
  const c = makeCanvas(s, s);
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.25, 'rgba(255,255,255,0.55)');
  g.addColorStop(0.6, 'rgba(255,255,255,0.12)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Faint diamond pattern for the lacquered table body (diamond system sights). */
export function makeDiamondTexture() {
  const s = 256;
  const c = makeCanvas(s, s);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, s, s);
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, 'rgba(255,225,170,1)');
  g.addColorStop(1, 'rgba(255,200,120,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(s / 2, s * 0.12);
  ctx.lineTo(s * 0.88, s / 2);
  ctx.lineTo(s / 2, s * 0.88);
  ctx.lineTo(s * 0.12, s / 2);
  ctx.closePath();
  ctx.fill();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
