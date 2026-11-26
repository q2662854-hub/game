import * as THREE from 'three';
import { CLOTH_Y } from './constants.js';
import { makeGlowTexture } from './textures.js';

/**
 * Lightweight particle systems: pocket sparkles, chalk puffs, and
 * floating "+120" score labels are handled outside (DOM), here it's 3D only.
 */
export function createFX(scene) {
  const glowTex = makeGlowTexture();

  // ---------------------------------------------------------------- sparkles
  const MAX = 260;
  const positions = new Float32Array(MAX * 3);
  const colors = new Float32Array(MAX * 3);
  const sizes = new Float32Array(MAX);
  const life = new Float32Array(MAX);
  const vel = new Float32Array(MAX * 3);
  const baseColor = new Float32Array(MAX * 3);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  geo.setAttribute('alpha', new THREE.BufferAttribute(life, 1));

  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTex: { value: glowTex },
      uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) }
    },
    vertexShader: /* glsl */ `
      attribute float size;
      attribute float alpha;
      varying vec3 vColor;
      varying float vAlpha;
      uniform float uPixelRatio;
      void main() {
        vColor = color;
        vAlpha = alpha;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = size * uPixelRatio * (46.0 / max(0.001, -mv.z));
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D uTex;
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        vec4 t = texture2D(uTex, gl_PointCoord);
        if (t.a * vAlpha < 0.01) discard;
        gl_FragColor = vec4(vColor * (0.6 + vAlpha * 0.9), t.a * vAlpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexColors: true
  });

  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  scene.add(points);

  let cursor = 0;

  function spawn(x, y, z, vx, vy, vz, color, size, ttl) {
    const i = cursor;
    cursor = (cursor + 1) % MAX;
    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;
    vel[i * 3] = vx;
    vel[i * 3 + 1] = vy;
    vel[i * 3 + 2] = vz;
    const c = new THREE.Color(color);
    baseColor[i * 3] = c.r;
    baseColor[i * 3 + 1] = c.g;
    baseColor[i * 3 + 2] = c.b;
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
    sizes[i] = size;
    life[i] = ttl;
  }

  function pocketBurst(x, z, color = 0xffc77a, count = 26) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 0.28 + Math.random() * 1.25;
      spawn(
        x + Math.cos(a) * 0.035,
        CLOTH_Y + 0.02 + Math.random() * 0.05,
        z + Math.sin(a) * 0.035,
        Math.cos(a) * sp,
        0.35 + Math.random() * 0.95,
        Math.sin(a) * sp,
        Math.random() > 0.55 ? color : 0xfff1cf,
        0.35 + Math.random() * 0.5,
        0.4 + Math.random() * 0.7
      );
    }
  }

  function chalkPuff(x, z, count = 8) {
    for (let i = 0; i < count; i++) {
      spawn(
        x,
        CLOTH_Y + 0.02,
        z,
        (Math.random() - 0.5) * 0.35,
        0.08 + Math.random() * 0.22,
        (Math.random() - 0.5) * 0.35,
        0x9fd8ff,
        0.35 + Math.random() * 0.35,
        0.35 + Math.random() * 0.4
      );
    }
  }

  function impactSpark(x, z, impact, count = 6) {
    const n = Math.max(2, Math.min(12, Math.round(impact * 4)));
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 0.15 + Math.random() * 0.45 * impact;
      spawn(
        x,
        0.86,
        z,
        Math.cos(a) * sp,
        0.1 + Math.random() * 0.3,
        Math.sin(a) * sp,
        0xffe6b8,
        0.22 + Math.random() * 0.3,
        0.18 + Math.random() * 0.22
      );
    }
  }

  const trail = (x, z, color) => spawn(x, 0.84, z, (Math.random() - 0.5) * 0.06, 0.02, (Math.random() - 0.5) * 0.06, color, 0.3, 0.35);

  function update(dt) {
    let dirty = false;
    for (let i = 0; i < MAX; i++) {
      if (life[i] <= 0) {
        if (sizes[i] !== 0) {
          sizes[i] = 0;
          dirty = true;
        }
        continue;
      }
      life[i] -= dt;
      vel[i * 3 + 1] -= 1.6 * dt;
      positions[i * 3] += vel[i * 3] * dt;
      positions[i * 3 + 1] += vel[i * 3 + 1] * dt;
      positions[i * 3 + 2] += vel[i * 3 + 2] * dt;
      if (life[i] < 0) life[i] = 0;
      dirty = true;
    }
    if (dirty) {
      geo.attributes.position.needsUpdate = true;
      geo.attributes.size.needsUpdate = true;
      geo.attributes.alpha.needsUpdate = true;
      geo.attributes.color.needsUpdate = true;
    }
  }

  return { points, update, pocketBurst, chalkPuff, impactSpark, trail, setPixelRatio: (r) => (mat.uniforms.uPixelRatio.value = r) };
}
