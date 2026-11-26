import * as THREE from 'three';
import {
  BALL_R,
  BALL_D,
  POCKET_GEO,
  PLAY_W,
  PLAY_L,
  CLOTH_Y,
  CORNER_GAP,
  MIDDLE_GAP,
  POCKETS,
  ROLL_FRICTION,
  CUSHION_E,
  CUSHION_T,
  STOP_SPEED,
  MAX_SUBSTEP
} from './constants.js';

const HALF_W = PLAY_W / 2;
const HALF_L = PLAY_L / 2;
const EPS = 1e-7;
// Pocket circle centres as they are modelled on the table (slightly inboard of
// the mathematical pocket so the chrome lips sit on the cloth edge).
const POCKET_PTS = POCKETS.map((p) => ({
  x: p.corner ? p.x - Math.sign(p.x) * POCKET_GEO.cornerA : p.x,
  z: p.corner ? p.z - Math.sign(p.z) * POCKET_GEO.cornerA : p.z - POCKET_GEO.sideB + 0.006,
  r: p.r,
  corner: p.corner
}));

export class Physics {
  constructor(balls) {
    this.balls = balls;
    this.events = [];
    this.substep = MAX_SUBSTEP;
  }

  setBalls(balls) {
    this.balls = balls;
  }

  /**
   * Advance the simulation by dt seconds.
   * @returns {{moving:boolean, events:Array}}
   */
  step(dt, { cueBall } = {}) {
    this.events.length = 0;
    if (dt <= 0) return { moving: this.isMoving(), events: this.events };
    const clamped = Math.min(dt, 0.05);
    const n = Math.max(1, Math.ceil(clamped / this.substep));
    const h = clamped / n;

    for (let i = 0; i < n; i++) {
      this.integrate(h);
      this.collideBalls();
      this.collideCushions();
      this.capturePockets(cueBall);
    }
    return { moving: this.isMoving(), events: this.events };
  }

  isMoving() {
    for (const b of this.balls) {
      if (b.inPocket) continue;
      if (b.vel.lengthSq() > STOP_SPEED * STOP_SPEED) return true;
    }
    return false;
  }

  integrate(h) {
    for (const b of this.balls) {
      if (b.inPocket) continue;
      const speed = Math.hypot(b.vel.x, b.vel.z);
      if (speed > EPS) {
        const decel = ROLL_FRICTION * h;
        const newSpeed = Math.max(0, speed - decel);
        const k = newSpeed / speed;
        b.vel.x *= k;
        b.vel.z *= k;
      } else {
        b.vel.x = 0;
        b.vel.z = 0;
      }

      b.pos.x += b.vel.x * h;
      b.pos.z += b.vel.z * h;

      const sp = Math.hypot(b.vel.x, b.vel.z);
      b.sleep = sp <= STOP_SPEED;
      if (b.sleep && sp > 0) {
        b.vel.set(0, 0, 0);
      }
    }
  }

  collideBalls() {
    const balls = this.balls;
    for (let i = 0; i < balls.length; i++) {
      const a = balls[i];
      if (a.inPocket) continue;
      for (let j = i + 1; j < balls.length; j++) {
        const b = balls[j];
        if (b.inPocket) continue;

        let dx = b.pos.x - a.pos.x;
        let dz = b.pos.z - a.pos.z;
        const d2 = dx * dx + dz * dz;
        if (d2 > BALL_D * BALL_D || d2 < EPS) continue;

        const d = Math.sqrt(d2);
        dx /= d;
        dz /= d;

        // Separate overlapping balls and push them apart.
        const overlap = BALL_D - d;
        if (overlap > 0) {
          const push = overlap * 0.5 + 1e-5;
          a.pos.x -= dx * push;
          a.pos.z -= dz * push;
          b.pos.x += dx * push;
          b.pos.z += dz * push;
        }

        const rvx = b.vel.x - a.vel.x;
        const rvz = b.vel.z - a.vel.z;
        const vn = rvx * dx + rvz * dz;
        if (vn >= 0) continue; // separating

        const e = Math.min(a.restitution ?? 0.945, b.restitution ?? 0.945);
        const jImp = (-(1 + e) * vn) / 2;

        a.vel.x -= jImp * dx;
        a.vel.z -= jImp * dz;
        b.vel.x += jImp * dx;
        b.vel.z += jImp * dz;

        a.sleep = false;
        b.sleep = false;

        const impact = -vn;
        if (impact > 0.06) {
          this.events.push({
            type: 'ball-ball',
            a: a.n,
            b: b.n,
            impact,
            x: (a.pos.x + b.pos.x) / 2,
            z: (a.pos.z + b.pos.z) / 2
          });
        }
      }
    }
  }

  collideCushions() {
    for (const b of this.balls) {
      if (b.inPocket) continue;
      const { x, z } = b.pos;

      // Long rails (+/- z)
      if (Math.abs(z) + BALL_R > HALF_L) {
        const opening = Math.abs(x) < MIDDLE_GAP + BALL_R * 0.1;
        const cornerZone = Math.abs(x) > HALF_W - CORNER_GAP - BALL_R * 0.1;
        if (!opening && !cornerZone) {
          const wallZ = Math.sign(z) * (HALF_L - BALL_R);
          if (Math.sign(z) * (z - wallZ) > 0) {
            b.pos.z = wallZ;
            if (Math.sign(b.vel.z) === Math.sign(z)) {
              const impact = Math.abs(b.vel.z);
              b.vel.z *= -CUSHION_E;
              b.vel.x *= CUSHION_T;
              this.pocketSound(b, impact, x, wallZ, 'cushion');
            }
          }
        }
      }

      // Short rails (+/- x)
      if (Math.abs(x) + BALL_R > HALF_W) {
        const cornerZone = Math.abs(z) > HALF_L - CORNER_GAP - BALL_R * 0.1;
        if (!cornerZone) {
          const wallX = Math.sign(x) * (HALF_W - BALL_R);
          if (Math.sign(x) * (x - wallX) > 0) {
            b.pos.x = wallX;
            if (Math.sign(b.vel.x) === Math.sign(x)) {
              const impact = Math.abs(b.vel.x);
              b.vel.x *= -CUSHION_E;
              b.vel.z *= CUSHION_T;
              this.pocketSound(b, impact, wallX, z, 'cushion');
            }
          }
        } else {
          // Inside the corner pocket jaw: nudge the ball toward the cup.
          const px = Math.sign(x) * HALF_W;
          const pz = Math.sign(z) * HALF_L;
          const vx = px - b.pos.x;
          const vz = pz - b.pos.z;
          const vl = Math.hypot(vx, vz) || 1;
          const spin = Math.hypot(b.vel.x, b.vel.z);
          if (spin > 0.05) {
            b.vel.x = b.vel.x * 0.9 + (vx / vl) * spin * 0.08;
            b.vel.z = b.vel.z * 0.9 + (vz / vl) * spin * 0.08;
          }
        }
      }
    }
  }

  pocketSound(b, impact, x, z, kind) {
    if (impact > 0.12) {
      this.events.push({ type: kind, n: b.n, impact, x, z });
    }
  }

  capturePockets(cueBall) {
    for (const b of this.balls) {
      if (b.inPocket) continue;
      for (let pi = 0; pi < POCKET_PTS.length; pi++) {
        const p = POCKET_PTS[pi];
        const dx = b.pos.x - p.x;
        const dz = b.pos.z - p.z;
        const dist = Math.hypot(dx, dz);
        const speed = Math.hypot(b.vel.x, b.vel.z);
        // A ball drops once its centre is inside the pocket circle and has
        // travelled past the cushion line into the mouth.
        const pastLine = p.corner
          ? Math.abs(b.pos.x) > HALF_W - BALL_R * 0.75 || Math.abs(b.pos.z) > HALF_L - BALL_R * 0.75
          : Math.abs(b.pos.z) > HALF_L - BALL_R * 0.75;
        if (dist < p.r * 0.9 && (pastLine || dist < p.r * 0.5)) {
          b.inPocket = true;
          b.pocket = pi;
          b.vel.set(0, 0, 0);
          b.sleep = true;
          b.mesh.visible = false;
          this.events.push({
            type: 'pocket',
            n: b.n,
            pocket: pi,
            x: p.x,
            z: p.z,
            corner: p.corner,
            speed
          });
          break;
        }
      }
    }
    void cueBall;
  }

  /** Keep balls inside the playfield bounds after manual placement. */
  clampBall(ball) {
    const lim = 0.001;
    ball.pos.x = Math.max(-HALF_W + BALL_R + lim, Math.min(HALF_W - BALL_R - lim, ball.pos.x));
    ball.pos.z = Math.max(-HALF_L + BALL_R + lim, Math.min(HALF_L - BALL_R - lim, ball.pos.z));
    ball.pos.y = CLOTH_Y + BALL_R;
    ball.mesh.position.copy(ball.pos);
  }

  /** True when the given XY (table plane) spot is free for the cue ball. */
  spotFree(x, z, radius = BALL_R * 2.02) {
    for (const b of this.balls) {
      if (b.n === 0 || b.inPocket) continue;
      if (Math.hypot(b.pos.x - x, b.pos.z - z) < radius) return false;
    }
    return true;
  }

  /** Ray vs balls for aim assist: nearest ball along the shot direction. */
  rayCast(origin, dir, maxDist = 3) {
    let best = null;
    let bestT = maxDist;
    for (const b of this.balls) {
      if (b.n === 0 || b.inPocket) continue;
      const ox = b.pos.x - origin.x;
      const oz = b.pos.z - origin.z;
      const t = ox * dir.x + oz * dir.z;
      if (t < 0 || t > bestT) continue;
      const px = ox - dir.x * t;
      const pz = oz - dir.z * t;
      if (px * px + pz * pz <= BALL_D * BALL_D) {
        best = b;
        bestT = t;
      }
    }
    return best ? { ball: best, dist: bestT } : null;
  }

  /**
   * Straight-line prediction for the ghost guide: walks the cue ball path
   * (with up to 3 cushion bounces) and reports the first ball it would strike.
   */
  predictPath(origin, dir, maxLen) {
    const points = [{ x: origin.x, z: origin.z }];
    let x = origin.x;
    let z = origin.z;
    let remaining = maxLen;
    const dx0 = dir.x;
    const dz0 = dir.z;
    const len = Math.hypot(dx0, dz0) || 1;
    const d = { x: dx0 / len, z: dz0 / len };
    let hit = null;

    for (let bounce = 0; bounce < 3 && remaining > 1e-4; bounce++) {
      // Ray vs every other ball (expanded by 2R for the cue-ball contact).
      let nearestT = remaining;
      let nearestBall = null;
      for (const b of this.balls) {
        if (b.n === 0 || b.inPocket) continue;
        const ox = b.pos.x - x;
        const oz = b.pos.z - z;
        const t = ox * d.x + oz * d.z;
        if (t < 0 || t > nearestT) continue;
        const px = ox - d.x * t;
        const pz = oz - d.z * t;
        const perp2 = px * px + pz * pz;
        if (perp2 <= BALL_D * BALL_D) {
          const back = Math.sqrt(BALL_D * BALL_D - perp2);
          const th = Math.max(0, t - back);
          if (th < nearestT) {
            nearestT = th;
            nearestBall = b;
          }
        }
      }

      // Ray vs the four cushion walls.
      let wallT = Infinity;
      let wallAxis = null;
      if (d.x > 1e-9) {
        const t = (HALF_W - BALL_R - x) / d.x;
        if (t > 1e-5 && t < wallT) {
          wallT = t;
          wallAxis = 'x';
        }
      } else if (d.x < -1e-9) {
        const t = (-HALF_W + BALL_R - x) / d.x;
        if (t > 1e-5 && t < wallT) {
          wallT = t;
          wallAxis = 'x';
        }
      }
      if (d.z > 1e-9) {
        const t = (HALF_L - BALL_R - z) / d.z;
        if (t > 1e-5 && t < wallT) {
          wallT = t;
          wallAxis = 'z';
        }
      } else if (d.z < -1e-9) {
        const t = (-HALF_L + BALL_R - z) / d.z;
        if (t > 1e-5 && t < wallT) {
          wallT = t;
          wallAxis = 'z';
        }
      }

      if (nearestBall && nearestT <= wallT) {
        x += d.x * nearestT;
        z += d.z * nearestT;
        points.push({ x, z });
        hit = nearestBall;
        break;
      }

      if (!isFinite(wallT)) break;
      x += d.x * wallT;
      z += d.z * wallT;
      points.push({ x, z });
      remaining -= wallT;
      if (wallAxis === 'x') {
        d.x *= -1;
        x = Math.sign(x) * (HALF_W - BALL_R - 1e-4);
      } else {
        d.z *= -1;
        z = Math.sign(z) * (HALF_L - BALL_R - 1e-4);
      }
    }

    return { points, hit };
  }
}
