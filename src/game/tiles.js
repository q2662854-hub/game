// ارزش‌ها، رنگ‌ها و درجه‌بندی بصری هر بلوک
export const CELL_SIZE = 1.34;
export const BOARD_SIZE = 4;
export const BOARD_SPAN = BOARD_SIZE * CELL_SIZE; // اندازه‌ی کامل صفحه

// رنگ پایه (hex) + رنگ درخشان (glow) برای هر عدد
export const TILE_STYLE = {
  2: { base: '#1b6d7a', glow: '#2ee6d6', accent: '#b9fffa', dark: false },
  4: { base: '#1f5c3f', glow: '#3ef08b', accent: '#ccffe2', dark: false },
  8: { base: '#8a6021', glow: '#ffb340', accent: '#ffe6b8', dark: false },
  16: { base: '#a1401e', glow: '#ff7043', accent: '#ffd9c9', dark: false },
  32: { base: '#a5233c', glow: '#ff4d6d', accent: '#ffd6de', dark: false },
  64: { base: '#8a1d63', glow: '#ff3d9a', accent: '#ffd6ee', dark: false },
  128: { base: '#5f28a8', glow: '#b06bff', accent: '#e8d7ff', dark: false },
  256: { base: '#3b2ec4', glow: '#6f7bff', accent: '#dae0ff', dark: false },
  512: { base: '#1d54c2', glow: '#4fc3ff', accent: '#d3f2ff', dark: false },
  1024: { base: '#0b7a8c', glow: '#2ef2e0', accent: '#d2fffb', dark: false },
  2048: { base: '#b78412', glow: '#ffe14d', accent: '#fff6c9', dark: false },
  4096: { base: '#c22060', glow: '#ff5ec4', accent: '#ffe0f4', dark: false },
  8192: { base: '#123a1f', glow: '#b7ff4d', accent: '#ecffd2', dark: false },
  16384: { base: '#0f1440', glow: '#7d8bff', accent: '#e2e6ff', dark: false },
};

export const DEFAULT_STYLE = {
  base: '#161a3a',
  glow: '#8fa7ff',
  accent: '#e8ecff',
  dark: false,
};

export function styleFor(value) {
  return TILE_STYLE[value] || DEFAULT_STYLE;
}

export function formattedValue(value) {
  if (value < 1000) return String(value);
  if (value < 100000) return `${Math.round(value / 100) / 10}k`;
  return `${Math.round(value / 1000)}k`;
}

// ریاضیات صفحه: ستون و ردیف → مختصات جهانی
export function cellToWorld(col, row) {
  const offset = (BOARD_SIZE - 1) / 2;
  return {
    x: (col - offset) * CELL_SIZE,
    z: (row - offset) * CELL_SIZE,
  };
}

// تبلیغ «جهت» به بردار حرکت روی صفحه
export const DIR_VECTORS = {
  left: { dc: -1, dr: 0, dx: -1, dz: 0 },
  right: { dc: 1, dr: 0, dx: 1, dz: 0 },
  up: { dc: 0, dr: -1, dx: 0, dz: -1 },
  down: { dc: 0, dr: 1, dx: 0, dz: 1 },
};
