// -----------------------------------------------------------------------------
// Shared table / physics constants (metres, seconds).
// A 9ft tournament table: 2540 x 1270 mm playing surface, 57.15 mm balls.
// -----------------------------------------------------------------------------

export const BALL_R = 0.028575;
export const BALL_D = BALL_R * 2;

export const PLAY_W = 2.54; // long axis  -> X
export const PLAY_L = 1.27; // short axis -> Z

export const CLOTH_Y = 0.8; // height of the cloth surface
export const RAIL_W = 0.15; // width of the wooden rail ring
export const RAIL_TOP = CLOTH_Y + 0.048;
export const CUSHION_H = 0.0445;

// Pocket geometry: each pocket is a circle whose centre sits slightly outside
// the playfield. The cushion ends are where that circle crosses the cushion
// line, which gives the mouth its width.
export const CORNER_GAP = 0.1015; // mouth end measured from the corner
export const MIDDLE_GAP = 0.0687; // half mouth of the side pockets
export const CUSHION_DEPTH = 0.064;

export const POCKET_GEO = {
  cornerR: 0.135,
  cornerA: 0.03,
  sideR: 0.088,
  sideB: 0.055
};

function pocketList() {
  const out = [];
  for (const sx of [1, -1]) {
    for (const sz of [1, -1]) {
      out.push({
        id: `c${sx > 0 ? 'p' : 'n'}${sz > 0 ? 'p' : 'n'}`,
        x: sx * (PLAY_W / 2 + POCKET_GEO.cornerA),
        z: sz * (PLAY_L / 2 + POCKET_GEO.cornerA),
        r: POCKET_GEO.cornerR,
        corner: true,
        sx,
        sz
      });
    }
  }
  for (const sz of [1, -1]) {
    out.push({
      id: `m${sz > 0 ? 'p' : 'n'}`,
      x: 0,
      z: sz * (PLAY_L / 2 + POCKET_GEO.sideB),
      r: POCKET_GEO.sideR,
      corner: false,
      sx: 0,
      sz
    });
  }
  return out;
}

export const POCKETS = pocketList();

export const MAX_SPEED = 7.6; // m/s at 100% power
export const MIN_SPEED = 0.55;
export const ROLL_FRICTION = 0.32; // deceleration while rolling (m/s^2)
export const CUSHION_E = 0.84; // restitution off the cushion
export const CUSHION_T = 0.955; // tangential friction off the cushion
export const BALL_E = 0.95; // restitution ball vs ball
export const STOP_SPEED = 0.014; // below this a ball is considered at rest
export const MAX_SUBSTEP = 1 / 300;

export const HEAD_SPOT = { x: PLAY_W / 4, z: 0 };
export const FOOT_SPOT = { x: -PLAY_W / 4, z: 0 };

export const BALL_COLORS = {
  1: '#f5c518',
  2: '#1c63d5',
  3: '#d92b2b',
  4: '#7a3fb8',
  5: '#f07a16',
  6: '#12954a',
  7: '#8d2020',
  8: '#15171c',
  9: '#f5c518',
  10: '#1c63d5',
  11: '#d92b2b',
  12: '#7a3fb8',
  13: '#f07a16',
  14: '#12954a',
  15: '#8d2020'
};

export const isStriped = (n) => n > 8;

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const FA_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
export function fa(n) {
  return String(n).replace(/\d/g, (d) => FA_DIGITS[+d]);
}
export function faTime(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${fa(String(m).padStart(2, '0'))}:${fa(String(s).padStart(2, '0'))}`;
}
