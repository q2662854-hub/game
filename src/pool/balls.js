import * as THREE from 'three';
import { BALL_R, BALL_D, BALL_COLORS, FOOT_SPOT, CLOTH_Y, PLAY_W, isStriped } from './constants.js';
import { makeBallTexture } from './textures.js';

const GROUP_OF = (n) => (n === 0 ? 'cue' : n === 8 ? 'eight' : n < 8 ? 'solid' : 'stripe');

function makeBallMaterial(texture, quality) {
  return new THREE.MeshPhysicalMaterial({
    map: texture,
    color: 0xffffff,
    roughness: quality === 'high' ? 0.045 : 0.08,
    metalness: 0,
    clearcoat: 1,
    clearcoatRoughness: 0.05,
    envMapIntensity: 1.35,
    reflectivity: 1,
    sheen: 0,
    specularIntensity: 1
  });
}

/** Proper rack layout: apex 1-ball, 8 in the middle, mixed back corners. */
function rackNumbers() {
  const solids = [2, 3, 4, 5, 6, 7];
  const stripes = [9, 10, 11, 12, 13, 14, 15];
  const shuffle = (a) => {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  shuffle(solids);
  shuffle(stripes);

  // Row structure (row, index) -> slot index 0..14, apex first.
  const slots = new Array(15).fill(0);
  slots[0] = 1; // apex
  slots[4] = 8; // centre of the third row
  // Every rack slot except the apex and the 8, with the two back corners
  // reserved for one solid and one stripe.
  const free = [1, 2, 3, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
  const backA = 10;
  const backB = 14;
  const rest = free.filter((i) => i !== backA && i !== backB);
  slots[backA] = solids.pop();
  slots[backB] = stripes.pop();
  const pool = shuffle([...solids, ...stripes]);
  for (const i of rest) slots[i] = pool.pop();
  if (slots.some((n) => n === 0)) throw new Error('rack builder produced an empty slot');
  return slots;
}

export function createBalls(renderer, scene, { quality = 'high' } = {}) {
  const seg = quality === 'high' ? [48, 32] : [32, 20];
  const geo = new THREE.SphereGeometry(BALL_R, seg[0], seg[1]);
  const balls = [];

  function makeBall(number, x, z) {
    const striped = isStriped(number);
    const color = number === 0 ? '#f7f4ec' : BALL_COLORS[number];
    const tex = makeBallTexture(number, color, striped);
    const mat = makeBallMaterial(tex, quality);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.position.set(x, CLOTH_Y + BALL_R, z);
    scene.add(mesh);

    const ball = {
      n: number,
      mesh,
      pos: new THREE.Vector3(x, CLOTH_Y + BALL_R, z),
      vel: new THREE.Vector3(),
      spin: new THREE.Vector3(), // roll/side spin axis * rate (rad/s), horizontal
      inPocket: false,
      pocket: null,
      group: GROUP_OF(number),
      sleep: true,
      restitution: number === 0 ? 0.96 : 0.945
    };
    balls.push(ball);
    return ball;
  }

  let cueBall = null;

  function rack() {
    // Clear previous.
    for (const b of balls) {
      scene.remove(b.mesh);
      b.mesh.material.map?.dispose();
      b.mesh.material.dispose();
    }
    balls.length = 0;

    const numbers = rackNumbers();
    const rows = [1, 2, 3, 4, 5];
    const gap = 0.00035;
    const dz = BALL_D + gap;
    const dx = (Math.sqrt(3) / 2) * dz;
    const apexX = FOOT_SPOT.x - 0.02;
    let k = 0;
    for (let r = 0; r < rows.length; r++) {
      for (let i = 0; i <= r; i++) {
        const x = apexX - r * dx;
        const z = (i - r / 2) * dz;
        makeBall(numbers[k++], x, z);
      }
    }

    cueBall = makeBall(0, PLAY_W / 4 + 0.12, 0.004);
    // Start each rack with a whisper of random imperfection, like a real rack.
    for (const b of balls) {
      b.mesh.position.copy(b.pos);
    }
    return cueBall;
  }

  function resetCueBall(handleInHand = false) {
    if (!cueBall) return;
    cueBall.inPocket = false;
    cueBall.pocket = null;
    cueBall.vel.set(0, 0, 0);
    cueBall.spin.set(0, 0, 0);
    cueBall.mesh.visible = true;
    if (!handleInHand) {
      cueBall.pos.set(PLAY_W / 4 + 0.12, CLOTH_Y + BALL_R, 0);
    }
    cueBall.mesh.position.copy(cueBall.pos);
    cueBall.sleep = true;
  }

  /** Rolls ball meshes so the number discs follow the travel direction. */
  function rollMeshes(dt) {
    for (const b of balls) {
      if (b.inPocket || b.sleep) continue;
      const speed = Math.hypot(b.vel.x, b.vel.z);
      if (speed < 1e-4) continue;
      const axis = new THREE.Vector3(b.vel.z, 0, -b.vel.x).normalize();
      const angle = (speed / BALL_R) * dt;
      const q = new THREE.Quaternion().setFromAxisAngle(axis, angle);
      b.mesh.quaternion.premultiply(q);
    }
  }

  function updatePositions() {
    for (const b of balls) {
      if (!b.inPocket) {
        b.mesh.position.set(b.pos.x, b.pos.y, b.pos.z);
      }
    }
  }

  function activeBalls() {
    return balls.filter((b) => !b.inPocket);
  }

  return {
    balls,
    get cueBall() {
      return cueBall;
    },
    rack,
    resetCueBall,
    rollMeshes,
    updatePositions,
    activeBalls,
    groupOf: GROUP_OF
  };
}
