/* ===========================================================
   شیشه‌شکن — utilities
   =========================================================== */
const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a = 0, b = 1) => a + Math.random() * (b - a);
const randInt = (a, b) => Math.floor(rand(a, b + 1));
const pick = (arr) => arr[(Math.random() * arr.length) | 0];
const chance = (p) => Math.random() < p;

function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
function easeInCubic(t) { return t * t * t; }
function easeInOutQuad(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
function easeOutBack(t) { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); }

/* Persian digits */
const FA_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
function faNum(n) {
  return String(Math.round(n)).replace(/\d/g, (d) => FA_DIGITS[+d]);
}
function faTime(sec) {
  sec = Math.max(0, Math.ceil(sec));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return faNum(m) + ':' + (s < 10 ? faNum(0) + FA_DIGITS[s] : faNum(s));
}

/* rounded rectangle path helper */
function roundRect(ctx, x, y, w, h, r) {
  r = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/* cheap deterministic hash noise for road texture */
function hash(n) { const s = Math.sin(n * 127.1) * 43758.5453; return s - Math.floor(s); }

/* storage helpers (never throw, e.g. private mode) */
const Store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
};

/* cached radial-gradient sprites (much cheaper than building gradients every frame) */
const GlowCache = (() => {
  const cache = new Map();
  const canCanvas = () => (typeof document !== 'undefined' && document.createElement) || typeof OffscreenCanvas !== 'undefined';
  function make(color, inner) {
    let cv;
    if (typeof document !== 'undefined' && document.createElement) cv = document.createElement('canvas');
    else cv = new OffscreenCanvas(64, 64);
    cv.width = 64; cv.height = 64;
    const c = cv.getContext('2d');
    const g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, `rgba(${color},${inner})`);
    g.addColorStop(0.35, `rgba(${color},${inner * 0.45})`);
    g.addColorStop(1, `rgba(${color},0)`);
    c.fillStyle = g;
    c.fillRect(0, 0, 64, 64);
    return cv;
  }
  return {
    get(color, inner = 1) {
      const key = color + '|' + inner;
      let v = cache.get(key);
      if (!v) { if (!canCanvas()) return null; v = make(color, inner); cache.set(key, v); }
      return v;
    }
  };
})();

/* draw a cached glow centred at x,y with radius r */
function glowAt(ctx, x, y, r, color, alpha = 1, inner = 1) {
  const sp = GlowCache.get(color, inner);
  if (!sp) return false;
  const prev = ctx.globalAlpha;
  ctx.globalAlpha = prev * alpha;
  ctx.drawImage(sp, x - r, y - r, r * 2, r * 2);
  ctx.globalAlpha = prev;
  return true;
}

/* persistent record book */
const Records = {
  best: 0, bestCombo: 0, wrecks: 0,
  load() {
    this.best = Store.get('ss_best', 0) | 0;
    this.bestCombo = Store.get('ss_combo', 0) | 0;
    this.wrecks = Store.get('ss_wrecks', 0) | 0;
  },
  save() {
    Store.set('ss_best', this.best);
    Store.set('ss_combo', this.bestCombo);
    Store.set('ss_wrecks', this.wrecks);
  }
};
