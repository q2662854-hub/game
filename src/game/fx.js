// ─────────────────────────────────────────────────────────────
//  جلوه‌های بصری: ذرات، شوک‌ویو، ستون نور، گرد و غبار، شفق
// ─────────────────────────────────────────────────────────────
import * as THREE from 'three';
import { radialTexture } from './tile.js';

// ── ذرات (یک Points با بافرِ ثابت، بدون allocation در حلقه) ─────
export class ParticleSystem {
  constructor(scene, max = 1600) {
    this.max = max;
    this.cursor = 0;

    this.positions = new Float32Array(max * 3);
    this.colors = new Float32Array(max * 3);
    this.sizes = new Float32Array(max);
    this.alphas = new Float32Array(max);
    this.vel = new Float32Array(max * 3);
    this.life = new Float32Array(max);
    this.maxLife = new Float32Array(max);
    this.baseSize = new Float32Array(max);
    this.grav = new Float32Array(max);
    this.drag = new Float32Array(max);

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));
    geo.setAttribute('alpha', new THREE.BufferAttribute(this.alphas, 1));
    this.geo = geo;

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTex: { value: radialTexture() },
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
      },
      vertexShader: /* glsl */ `
        attribute float size;
        attribute float alpha;
        attribute vec3 color;
        varying vec3 vColor;
        varying float vAlpha;
        uniform float uPixelRatio;
        void main() {
          vColor = color;
          vAlpha = alpha;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * uPixelRatio * (240.0 / max(0.001, -mv.z));
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform sampler2D uTex;
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          float a = texture2D(uTex, gl_PointCoord).a * vAlpha;
          if (a < 0.006) discard;
          gl_FragColor = vec4(vColor, a);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.points = new THREE.Points(geo, this.material);
    this.points.frustumCulled = false;
    scene.add(this.points);
  }

  emit(pos, opts = {}) {
    const {
      count = 16, color = '#ffffff', speed = [0.8, 2.6], size = [0.1, 0.3],
      life = [0.5, 1.1], gravity = -1.4, upward = 1.0, drag = 1.5, spread = 0.3,
    } = opts;
    const c = color instanceof THREE.Color ? color : new THREE.Color(color);

    for (let i = 0; i < count; i++) {
      const idx = this.cursor;
      this.cursor = (this.cursor + 1) % this.max;
      const i3 = idx * 3;

      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * spread;
      this.positions[i3] = pos.x + Math.cos(a) * r;
      this.positions[i3 + 1] = pos.y + (Math.random() - 0.3) * 0.3;
      this.positions[i3 + 2] = pos.z + Math.sin(a) * r;

      const hs = speed[0] + Math.random() * (speed[1] - speed[0]);
      this.vel[i3] = Math.cos(a) * hs;
      this.vel[i3 + 1] = upward * (0.4 + Math.random()) * (0.6 + hs * 0.35);
      this.vel[i3 + 2] = Math.sin(a) * hs;

      const l = life[0] + Math.random() * (life[1] - life[0]);
      this.life[idx] = l;
      this.maxLife[idx] = l;
      this.baseSize[idx] = size[0] + Math.random() * (size[1] - size[0]);
      this.grav[idx] = gravity;
      this.drag[idx] = drag;

      const tint = 0.85 + Math.random() * 0.25;
      this.colors[i3] = Math.min(1, c.r * tint);
      this.colors[i3 + 1] = Math.min(1, c.g * tint);
      this.colors[i3 + 2] = Math.min(1, c.b * tint);
      this.alphas[idx] = 1;
      this.sizes[idx] = this.baseSize[idx];
    }
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.color.needsUpdate = true;
  }

  update(dt) {
    const { positions, vel, life, alphas, sizes, maxLife, baseSize } = this;
    for (let i = 0; i < this.max; i++) {
      if (life[i] <= 0) {
        if (alphas[i] !== 0) alphas[i] = 0;
        continue;
      }
      life[i] -= dt;
      const i3 = i * 3;
      const d = Math.max(0, 1 - this.drag[i] * dt);
      vel[i3] *= d;
      vel[i3 + 2] *= d;
      vel[i3 + 1] += this.grav[i] * dt;
      positions[i3] += vel[i3] * dt;
      positions[i3 + 1] += vel[i3 + 1] * dt;
      positions[i3 + 2] += vel[i3 + 2] * dt;

      const t = Math.max(0, life[i] / maxLife[i]);
      alphas[i] = Math.pow(t, 0.8);
      sizes[i] = baseSize[i] * (0.3 + t * 0.7);
    }
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.alpha.needsUpdate = true;
    this.geo.attributes.size.needsUpdate = true;
  }
}

// ── موج شوک ──────────────────────────────────────────────────
export class Shockwaves {
  constructor(scene) {
    this.pool = [];
    for (let i = 0; i < 14; i++) {
      const geo = new THREE.RingGeometry(0.978, 1, 96);
      const mat = new THREE.MeshBasicMaterial({
        color: 0xffffff, transparent: true, opacity: 0,
        side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false,
        toneMapped: false,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.visible = false;
      scene.add(mesh);
      this.pool.push({ mesh, t: 1, dur: 0.6, maxRadius: 2, opacity: 0.8 });
    }
    this.index = 0;
  }

  spawn(pos, { color = '#ffffff', maxRadius = 2, duration = 0.6, opacity = 0.4, y = 0.03 } = {}) {
    const item = this.pool[this.index];
    this.index = (this.index + 1) % this.pool.length;
    item.mesh.position.set(pos.x, y, pos.z);
    item.mesh.visible = true;
    item.mesh.scale.setScalar(0.2);
    item.mesh.material.color.set(color);
    item.t = 0;
    item.dur = duration;
    item.maxRadius = maxRadius;
    item.opacity = opacity;
  }

  update(dt) {
    for (const it of this.pool) {
      if (!it.mesh.visible) continue;
      it.t += dt / it.dur;
      if (it.t >= 1) {
        it.mesh.visible = false;
        continue;
      }
      const e = 1 - Math.pow(1 - it.t, 3);
      it.mesh.scale.setScalar(0.2 + e * it.maxRadius);
      it.mesh.material.opacity = Math.pow(1 - it.t, 2.2) * it.opacity;
    }
  }
}

// ── ستون نور برای بلوک‌های افسانه‌ای ─────────────────────────
export class LightPillar {
  constructor(scene) {
    this.group = new THREE.Group();
    this.group.visible = false;
    const geo = new THREE.CylinderGeometry(0.34, 0.72, 9, 28, 1, true);
    this.mat = new THREE.MeshBasicMaterial({
      color: 0xffdd88, transparent: true, opacity: 0,
      side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false,
      toneMapped: false,
      opacity: 0,
    });
    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.position.y = 4.5;
    this.group.add(this.mesh);
    scene.add(this.group);
    this.t = 0;
    this.dur = 1.05;
  }

  burst(pos, color) {
    this.group.position.set(pos.x, 0, pos.z);
    this.mat.color.set(color);
    this.group.visible = true;
    this.t = 0;
  }

  update(dt) {
    if (!this.group.visible) return;
    this.t += dt / this.dur;
    if (this.t >= 1) {
      this.group.visible = false;
      return;
    }
    this.mat.opacity = Math.sin(this.t * Math.PI) * 0.085;
    this.mesh.scale.set(1 + this.t * 0.5, 1, 1 + this.t * 0.5);
    this.group.rotation.y += dt * 0.8;
  }
}

// ── غبار معلق ────────────────────────────────────────────────
export class DustField {
  constructor(scene, count = 360) {
    this.count = count;
    const positions = new Float32Array(count * 3);
    this.seeds = [];
    for (let i = 0; i < count; i++) {
      const r = 3 + Math.random() * 15;
      const a = Math.random() * Math.PI * 2;
      positions[i * 3] = Math.cos(a) * r;
      positions[i * 3 + 1] = 2.2 + Math.random() * 6.4;
      positions[i * 3 + 2] = Math.sin(a) * r;
      this.seeds.push({ speed: 0.05 + Math.random() * 0.18, phase: Math.random() * Math.PI * 2, amp: 0.15 + Math.random() * 0.5 });
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geo = geo;
    const mat = new THREE.PointsMaterial({
      size: 0.085, map: radialTexture(), color: new THREE.Color('#9db0ff'),
      transparent: true, opacity: 0.4, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
    scene.add(this.points);
  }

  update(dt, time) {
    const pos = this.geo.attributes.position.array;
    for (let i = 0; i < this.count; i++) {
      const s = this.seeds[i];
      pos[i * 3 + 1] += s.speed * dt;
      if (pos[i * 3 + 1] > 8.6) pos[i * 3 + 1] = 2.2;
      pos[i * 3] += Math.sin(time * 0.35 + s.phase) * s.amp * dt * 0.4;
    }
    this.geo.attributes.position.needsUpdate = true;
  }
}

// ── پرده‌های نوری آرام بالای صفحه ───────────────────────────
export class AuroraRibbons {
  constructor(scene, count = 6) {
    this.meshes = [];
    const palette = ['#6f7bff', '#ff5ec4', '#2ef2e0', '#b06bff', '#ffe14d', '#4fc3ff'];
    for (let i = 0; i < count; i++) {
      const geo = new THREE.PlaneGeometry(7 + i * 0.8, 7 + i * 0.8, 1, 1);
      const mat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(palette[i % palette.length]),
        transparent: true, opacity: 0.02,
        blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
        toneMapped: false,
      });
      const mesh = new THREE.Mesh(geo, mat);
      const a = (i / count) * Math.PI * 2;
      mesh.position.set(Math.cos(a) * (1.2 + i * 0.35), 5.2 + (i % 3) * 0.9, Math.sin(a) * (1.2 + i * 0.35));
      mesh.rotation.set(-Math.PI / 2, 0, a);
      mesh.userData = { phase: Math.random() * 6.28, speed: 0.04 + Math.random() * 0.06 };
      scene.add(mesh);
      this.meshes.push(mesh);
    }
  }

  update(dt, time) {
    for (const m of this.meshes) {
      m.rotation.z += m.userData.speed * dt;
      m.material.opacity = 0.012 + Math.sin(time * 0.5 + m.userData.phase) * 0.01;
    }
  }
}
