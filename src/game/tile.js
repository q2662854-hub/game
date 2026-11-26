// ─────────────────────────────────────────────────────────────
//  بلوک سه‌بعدی: بدنه‌ی شیشه‌ای تیره + صفحه‌ی عددی تخت و درخشان
//  اعداد همیشه با کیفیت و خوانا هستند (مستقل از نورپردازی)
// ─────────────────────────────────────────────────────────────
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { CELL_SIZE, BOARD_SIZE, styleFor } from './tiles.js';

export const TILE_H = 0.5;
const FACE = 1.17;
const PLATE = 1.06;

let geoBody = null;
let geoPlate = null;
// (width, height, depth) — height باید در محور Y باشد
const getBodyGeo = () => (geoBody ??= new RoundedBoxGeometry(FACE, TILE_H, FACE, 4, 0.09));
// صفحه‌ی عددی یک کوآد کامل است تا UV دقیقاً کل بافت مربع را بپوشاند
const getPlateGeo = () => (geoPlate ??= new THREE.PlaneGeometry(PLATE, PLATE));

export class Tile {
  constructor(value, col, row) {
    this.value = value;
    this.uid = null;
    this.group = new THREE.Group();
    this.group.position.set(worldX(col), 0, worldZ(row));
    this.seed = Math.random() * 100;

    this.moving = false;
    this.moveT = 1;
    this.moveDur = 0.16;
    this.moveDelay = 0;
    this.from = new THREE.Vector3();
    this.to = new THREE.Vector3();

    this.spawnT = 1;
    this.bump = 0;
    this.dying = false;
    this.deathT = 0;

    this.build();
  }

  build() {
    const style = styleFor(this.value);

    // ── بدنه: شیشه‌ی رنگی ضخیم ──
    this.bodyMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(style.base).multiplyScalar(0.3),
      metalness: 0.42,
      roughness: 0.44,
      clearcoat: 1,
      clearcoatRoughness: 0.05,
      emissive: new THREE.Color(style.glow),
      emissiveIntensity: 0.14,
      envMapIntensity: 0.3,
    });
    this.body = new THREE.Mesh(getBodyGeo(), this.bodyMat);
    this.body.position.y = TILE_H * 0.5;
    this.body.castShadow = true;
    this.body.receiveShadow = true;
    this.group.add(this.body);

    // ── صفحه‌ی بالایی با عدد ──
    this.faceMat = new THREE.MeshBasicMaterial({
      map: faceTexture(this.value),
      transparent: true,
      depthWrite: false,
      toneMapped: false,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    this.face = new THREE.Mesh(getPlateGeo(), this.faceMat);
    this.face.rotation.x = -Math.PI / 2;
    this.face.position.y = TILE_H + 0.004;
    this.face.renderOrder = 5;
    this.group.add(this.face);

    // ── قاب نئونی دور بلوک (خط باریک درخشان) ──
    this.rimMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(style.glow),
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    const rimGroup = new THREE.Group();
    const barLen = FACE * 0.98;
    const barTh = 0.028;
    const rimGeoX = new THREE.PlaneGeometry(barLen, barTh);
    const rimGeoZ = new THREE.PlaneGeometry(barTh, barLen);
    const y = TILE_H + 0.002;
    const half = FACE / 2 - barTh * 0.4;
    for (const sgn of [-1, 1]) {
      const bx = new THREE.Mesh(rimGeoX, this.rimMat);
      bx.rotation.x = -Math.PI / 2;
      bx.position.set(0, y, sgn * half);
      rimGroup.add(bx);
      const bz = new THREE.Mesh(rimGeoZ, this.rimMat);
      bz.rotation.x = -Math.PI / 2;
      bz.position.set(sgn * half, y, 0);
      rimGroup.add(bz);
    }
    this.rim = rimGroup;
    this.group.add(rimGroup);

    // ── هاله‌ی نور زیر بلوک ──
    this.glowMat = new THREE.MeshBasicMaterial({
      map: radialTexture(),
      color: new THREE.Color(style.glow),
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.glowMesh = new THREE.Mesh(glowPlaneGeo(), this.glowMat);
    this.glowMesh.rotation.x = -Math.PI / 2;
    this.glowMesh.position.y = 0.012;
    this.group.add(this.glowMesh);

    // ── برچسب عددی روی اضلاع کناری (خوانایی از هر زاویه) ──
    this.sideMats = [];
    const tex = faceTexture(this.value);
    const sideGeo = new THREE.PlaneGeometry(FACE * 0.78, TILE_H * 0.62);
    for (let i = 0; i < 4; i++) {
      const mat = new THREE.MeshBasicMaterial({
        map: sidePlateTexture(this.value),
        transparent: true,
        depthWrite: false,
        toneMapped: false,
      });
      const side = new THREE.Mesh(sideGeo, mat);
      const angle = (i * Math.PI) / 2;
      side.position.set(Math.sin(angle) * (FACE / 2 + 0.002), TILE_H * 0.5, Math.cos(angle) * (FACE / 2 + 0.002));
      side.rotation.y = angle;
      this.group.add(side);
      this.sideMats.push(mat);
    }
  }

  setValue(value) {
    if (this.value === value) return;
    this.value = value;
    const tex = faceTexture(value);
    this.faceMat.map = tex;
    this.faceMat.needsUpdate = true;

    const style = styleFor(value);
    this.bodyMat.color.set(new THREE.Color(style.base).multiplyScalar(0.3));
    this.bodyMat.emissive.set(style.glow);
    this.rimMat.color.set(style.glow);
    this.glowMat.color.set(style.glow);
    const sideTex = sidePlateTexture(value);
    for (const m of this.sideMats || []) {
      m.map = sideTex;
      m.needsUpdate = true;
    }
  }

  slideTo(col, row, dur = 0.16, delay = 0) {
    this.from.copy(this.group.position);
    this.to.set(worldX(col), 0, worldZ(row));
    this.moveT = 0;
    this.moveDur = dur;
    this.moveDelay = delay;
    this.moving = true;
  }

  snapTo(col, row) {
    this.group.position.set(worldX(col), 0, worldZ(row));
    this.moving = false;
    this.moveT = 1;
  }

  startDeath() {
    this.dying = true;
    this.deathT = 0;
    // عدد بلوک جذب‌شده فوراً محو می‌شود تا عدد روی عدد نیفتد
    if (this.face) this.face.visible = false;
    if (this.rimBroadcast) this.rimBroadcast = false;
  }

  bumpOnce() {
    this.bump = 1;
  }

  /** بازگرداندن بلوک از حالت مرگ (وقتی حرکت سریع ادامه دارد) */
  revive() {
    this.dying = false;
    this.deathT = 0;
    this.group.rotation.y = 0;
    this.group.scale.setScalar(1);
    this.bodyMat.opacity = 1;
    this.faceMat.opacity = 1;
    if (this.face) this.face.visible = true;
  }

  update(dt, time) {
    if (this.moving) {
      if (this.moveDelay > 0) this.moveDelay -= dt;
      else {
        this.moveT = Math.min(1, this.moveT + dt / this.moveDur);
        this.group.position.lerpVectors(this.from, this.to, easeOutQuint(this.moveT));
        if (this.moveT >= 1) {
          this.moving = false;
          this.group.position.copy(this.to);
        }
      }
    }

    if (this.dying) {
      this.deathT += dt / 0.14;
      const t = Math.min(1, this.deathT);
      this.group.scale.setScalar((1 - t) * 1.04);
      this.bodyMat.opacity = 1 - t;
      this.faceMat.opacity = 1 - t;
      this.glowMat.opacity = (1 - t) * 0.45;
      this.rimMat.opacity = (1 - t) * 0.85;
      this.group.rotation.y = t * 1.4;
      return t >= 1;
    }

    // رشد هنگام تولد (با کمی overshoot) + تپش هنگام ادغام
    let scl = 1;
    if (this.spawnT < 1) {
      this.spawnT = Math.min(1, this.spawnT + dt / 0.22);
      scl = easeOutBack(this.spawnT);
    }
    if (this.bump > 0) {
      this.bump = Math.max(0, this.bump - dt * 3.6);
      const b = this.bump;
      scl *= 1 + Math.sin((1 - b) * Math.PI) * 0.13 * b;
    }
    this.group.scale.setScalar(Math.max(0.001, scl));

    // شناوری و درخشش
    const level = Math.log2(this.value);
    this.group.position.y = Math.sin(time * 1.2 + this.seed) * 0.008;

    const pulse = 0.5 + Math.sin(time * 1.9 + this.seed) * 0.5;
    this.rimMat.opacity = 0.4 + Math.min(0.45, level * 0.04) + pulse * 0.14;
    this.glowMat.opacity = 0.18 + Math.min(0.5, level * 0.05) + pulse * 0.06;
    this.faceMat.color.setScalar(1);

    return false;
  }

  dispose() {
    this.faceMat?.dispose();
    for (const m of this.sideMats || []) m.dispose();
    this.bodyMat?.dispose();
    this.rimMat?.dispose();
    this.glowMat?.dispose();
  }
}

// ── موقعیت جهانی ─────────────────────────────────────────────
const OFFSET = (BOARD_SIZE - 1) / 2;
export const worldX = (col) => (col - OFFSET) * CELL_SIZE;
export const worldZ = (row) => (row - OFFSET) * CELL_SIZE;

// ── بافت صورت عدد ────────────────────────────────────────────
const faceCache = new Map();
const S = 512;

export function faceTexture(value) {
  let tex = faceCache.get(value);
  if (tex) return tex;
  tex = drawFace(value);
  faceCache.set(value, tex);
  return tex;
}

function drawFace(value) {
  const style = styleFor(value);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = S;
  const ctx = canvas.getContext('2d');

  const r = S * 0.17;
  // پس‌زمینه‌ی کامل پلیت (گوشه‌ها گرد و شفاف)
  ctx.clearRect(0, 0, S, S);
  roundRectPath(ctx, 6, 6, S - 12, S - 12, r);
  const bg = ctx.createLinearGradient(0, 0, S * 0.35, S);
  bg.addColorStop(0, lighten(style.base, 20));
  bg.addColorStop(0.5, style.base);
  bg.addColorStop(1, darken(style.base, 30));
  ctx.fillStyle = bg;
  ctx.fill();

  // گودال داخلی
  ctx.save();
  roundRectPath(ctx, 6, 6, S - 12, S - 12, r);
  ctx.clip();

  // هاله‌ی رنگی بالای پلیت
  const halo = ctx.createRadialGradient(S * 0.32, S * 0.14, 0, S * 0.32, S * 0.14, S * 1.05);
  halo.addColorStop(0, rgba(style.glow, 0.36));
  halo.addColorStop(0.45, rgba(style.glow, 0.14));
  halo.addColorStop(1, rgba(style.glow, 0));
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, S, S);

  // خطوط مورب ریز
  ctx.globalAlpha = 0.05;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.5;
  for (let i = -S; i < S * 2; i += 30) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + S, S);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // حاشیه‌ی روشن داخلی
  roundRectPath(ctx, S * 0.055, S * 0.055, S * 0.89, S * 0.89, r * 0.78);
  ctx.strokeStyle = rgba('#ffffff', 0.22);
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();

  // حاشیه‌ی نئونی بیرونی
  roundRectPath(ctx, 6, 6, S - 12, S - 12, r);
  ctx.strokeStyle = rgba(style.glow, 0.7);
  ctx.lineWidth = 5;
  ctx.stroke();

  // عدد
  const text = formatValue(value);
  let fontSize = S * (text.length <= 2 ? 0.46 : text.length === 3 ? 0.37 : text.length === 4 ? 0.3 : 0.24);
  const font = (px) => `700 ${px}px "Space Grotesk", "Space Grotesk Variable", Arial, sans-serif`;
  ctx.font = font(fontSize);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const w = ctx.measureText(text).width;
  if (w > S * 0.74) {
    fontSize *= (S * 0.74) / w;
    ctx.font = font(fontSize);
  }

  const cx = S / 2;
  const cy = S / 2 + S * 0.012;

  ctx.shadowColor = rgba(style.glow, 1);
  ctx.shadowBlur = S * 0.075;
  ctx.fillStyle = style.accent;
  ctx.fillText(text, cx, cy);
  ctx.shadowBlur = S * 0.07;
  ctx.fillText(text, cx, cy);

  ctx.shadowBlur = 0;
  ctx.globalCompositeOperation = 'source-atop';
  const tg = ctx.createLinearGradient(0, cy - fontSize * 0.58, 0, cy + fontSize * 0.58);
  tg.addColorStop(0, '#ffffff');
  tg.addColorStop(0.5, style.accent);
  tg.addColorStop(1, mix(style.accent, style.glow, 0.55));
  ctx.fillStyle = tg;
  ctx.fillText(text, cx, cy);
  ctx.globalCompositeOperation = 'source-over';

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

// ── بافت‌های کمکی ────────────────────────────────────────────
let _radial = null;
export function radialTexture() {
  if (_radial) return _radial;
  const N = 256;
  const c = document.createElement('canvas');
  c.width = c.height = N;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(N / 2, N / 2, 0, N / 2, N / 2, N / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.25, 'rgba(255,255,255,0.6)');
  g.addColorStop(0.55, 'rgba(255,255,255,0.18)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, N, N);
  _radial = new THREE.CanvasTexture(c);
  _radial.colorSpace = THREE.SRGBColorSpace;
  return _radial;
}

let _glowPlane = null;
function glowPlaneGeo() {
  if (!_glowPlane) _glowPlane = new THREE.PlaneGeometry(FACE * 2.3, FACE * 2.3);
  return _glowPlane;
}

const sideCache = new Map();
function sidePlateTexture(value) {
  if (sideCache.has(value)) return sideCache.get(value);
  const style = styleFor(value);
  const W = 256, H = 128;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, rgba(lighten(style.base, 16), 0.95));
  bg.addColorStop(1, rgba(darken(style.base, 34), 0.95));
  ctx.fillStyle = bg;
  roundRectPath(ctx, 2, 2, W - 4, H - 4, 16);
  ctx.fill();

  const sheen = ctx.createLinearGradient(0, 0, 0, H * 0.5);
  sheen.addColorStop(0, rgba('#ffffff', 0.22));
  sheen.addColorStop(1, rgba('#ffffff', 0));
  ctx.fillStyle = sheen;
  roundRectPath(ctx, 2, 2, W - 4, H - 4, 16);
  ctx.fill();

  roundRectPath(ctx, 3, 3, W - 6, H - 6, 15);
  ctx.strokeStyle = rgba(style.glow, 0.6);
  ctx.lineWidth = 3;
  ctx.stroke();

  const text = formatValue(value);
  let fs = text.length <= 2 ? 62 : text.length === 3 ? 52 : 42;
  const font = (px) => `700 ${px}px "Space Grotesk", "Space Grotesk Variable", Arial, sans-serif`;
  ctx.font = font(fs);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const w = ctx.measureText(text).width;
  if (w > W * 0.78) { fs *= (W * 0.78) / Math.max(1, w); ctx.font = font(fs); }

  ctx.shadowColor = rgba(style.glow, 0.9);
  ctx.shadowBlur = 14;
  ctx.fillStyle = style.accent;
  ctx.fillText(text, W / 2, H / 2 + 2);
  ctx.shadowBlur = 0;

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  sideCache.set(value, tex);
  return tex;
}

function formatValue(value) {
  if (value < 10000) return String(value);
  if (value < 100000) return `${Math.round(value / 100) / 10}k`;
  return `${Math.round(value / 1000)}k`;
}

function rgba(hex, a) {
  const n = parseInt(hex.replace('#', ''), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
function lighten(hex, p) { return mix(hex, '#ffffff', p / 100); }
function darken(hex, p) { return mix(hex, '#000000', p / 100); }
function mix(a, b, t) {
  const pa = parseInt(a.replace('#', ''), 16);
  const pb = parseInt(b.replace('#', ''), 16);
  const c1 = [(pa >> 16) & 255, (pa >> 8) & 255, pa & 255];
  const c2 = [(pb >> 16) & 255, (pb >> 8) & 255, pb & 255];
  const out = c1.map((v, i) => Math.round(v * (1 - t) + c2[i] * t));
  return `#${((out[0] << 16) | (out[1] << 8) | out[2]).toString(16).padStart(6, '0')}`;
}
function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function easeOutQuint(x) { return 1 - Math.pow(1 - x, 5); }
function easeOutBack(x) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
}
