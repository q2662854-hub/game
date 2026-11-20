import * as THREE from 'three';
import { createGlowTexture, createSmokeTexture } from './textures.js';

export class ParticleSystem {
  constructor(scene) {
    this.scene = scene;
    this.particles = [];
    this.rings = [];

    this.fireTex = createGlowTexture('#fffce0', '#ff6e0a', 'rgba(220, 20, 0, 0)');
    this.sparkTex = createGlowTexture('#ffffff', '#ffd045', 'rgba(255, 110, 0, 0)');
    this.smokeTex = createSmokeTexture();

    this.shardGeo = new THREE.OctahedronGeometry(0.14, 0);
    this.shardGeo.scale(1.4, 0.22, 1.0);
    this.shardMatBase = new THREE.MeshStandardMaterial({
      color: 0xcbeeff,
      emissive: 0x3b78a8,
      emissiveIntensity: 0.45,
      roughness: 0.1,
      metalness: 0.8,
      transparent: true,
      opacity: 0.92,
    });

    this.ringGeo = new THREE.RingGeometry(0.25, 0.42, 24);
    this.skidGeo = new THREE.PlaneGeometry(0.36, 1.35);
    this.skidGeo.rotateX(-Math.PI / 2);
    this.skids = [];
  }

  _addSprite(tex, pos, vel, opts = {}) {
    const mat = new THREE.SpriteMaterial({
      map: tex,
      color: opts.color ?? 0xffffff,
      transparent: true,
      opacity: opts.opacity ?? 1,
      blending: opts.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      depthWrite: false,
    });
    const sprite = new THREE.Sprite(mat);
    sprite.position.copy(pos);
    const s = opts.size ?? 0.6;
    sprite.scale.set(s, s, 1);
    this.scene.add(sprite);

    this.particles.push({
      mesh: sprite,
      type: 'sprite',
      vel: vel.clone(),
      gravity: opts.gravity ?? 0,
      drag: opts.drag ?? 0.98,
      age: 0,
      life: opts.life ?? 0.7,
      startSize: s,
      endSize: opts.endSize ?? s * 0.2,
      startOpacity: opts.opacity ?? 1,
    });
  }

  spawnGlassShatter(pos, forwardZ = 10, intense = false) {
    const count = intense ? 38 : 26;
    for (let i = 0; i < count; i++) {
      const mat = this.shardMatBase.clone();
      const mesh = new THREE.Mesh(this.shardGeo, mat);
      mesh.position.set(
        pos.x + (Math.random() - 0.5) * 1.5,
        pos.y + (Math.random() - 0.5) * 0.5,
        pos.z + (Math.random() - 0.5) * 0.6
      );
      const s = 0.65 + Math.random() * 1.15;
      mesh.scale.set(s, s, s);
      mesh.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
      this.scene.add(mesh);

      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 14,
        3.5 + Math.random() * 9.5,
        forwardZ * 0.35 + (Math.random() - 0.5) * 11
      );

      this.particles.push({
        mesh,
        type: 'shard',
        vel,
        rotVel: new THREE.Vector3(
          (Math.random() - 0.5) * 20,
          (Math.random() - 0.5) * 20,
          (Math.random() - 0.5) * 20
        ),
        gravity: -24,
        drag: 0.99,
        age: 0,
        life: 0.95 + Math.random() * 0.65,
        startOpacity: 0.95,
      });
    }
  }

  spawnFireBurst(pos, scale = 1.0) {
    // Core flash + fireball sprites
    const fireCount = Math.round(14 * scale);
    for (let i = 0; i < fireCount; i++) {
      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 9 * scale,
        2.0 + Math.random() * 7.5 * scale,
        (Math.random() - 0.5) * 9 * scale
      );
      this._addSprite(this.fireTex, pos, vel, {
        size: (0.9 + Math.random() * 1.1) * scale,
        endSize: (2.2 + Math.random() * 1.4) * scale,
        life: 0.32 + Math.random() * 0.28,
        gravity: 3.5,
        drag: 0.93,
        additive: true,
        opacity: 0.95,
      });
    }

    // Hot flying embers
    const emberCount = Math.round(18 * scale);
    for (let i = 0; i < emberCount; i++) {
      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 17 * scale,
        4 + Math.random() * 11 * scale,
        (Math.random() - 0.5) * 17 * scale
      );
      this._addSprite(this.sparkTex, pos, vel, {
        size: 0.28 + Math.random() * 0.28,
        endSize: 0.04,
        life: 0.55 + Math.random() * 0.45,
        gravity: -18,
        drag: 0.97,
        additive: true,
        color: Math.random() > 0.4 ? 0xffbb33 : 0xff5511,
      });
    }

    // Dark smoke billow
    for (let i = 0; i < Math.round(6 * scale); i++) {
      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 4,
        2.5 + Math.random() * 3.5,
        (Math.random() - 0.5) * 4
      );
      this._addSprite(this.smokeTex, pos, vel, {
        size: 0.9 * scale,
        endSize: 3.1 * scale,
        life: 0.8 + Math.random() * 0.5,
        gravity: 1.5,
        drag: 0.96,
        color: 0x262220,
        opacity: 0.65,
      });
    }

    // Shockwave ring
    const rMat = new THREE.MeshBasicMaterial({
      color: 0xff9d2e,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const ring = new THREE.Mesh(this.ringGeo, rMat);
    ring.position.copy(pos);
    ring.lookAt(0, 8, 22);
    this.scene.add(ring);
    this.rings.push({
      mesh: ring,
      age: 0,
      life: 0.34,
      maxScale: 5.5 * scale,
    });
  }

  spawnFireTrail(pos, isCharged = false) {
    const vel = new THREE.Vector3(
      (Math.random() - 0.5) * 1.4,
      0.8 + Math.random() * 1.6,
      (Math.random() - 0.5) * 1.4
    );
    this._addSprite(this.fireTex, pos, vel, {
      size: isCharged ? 1.15 : 0.72,
      endSize: 0.12,
      life: isCharged ? 0.34 : 0.24,
      gravity: 2.2,
      drag: 0.94,
      additive: true,
      opacity: 0.9,
      color: isCharged ? 0xffe699 : 0xff9944,
    });

    if (Math.random() < 0.65) {
      this._addSprite(this.smokeTex, pos, new THREE.Vector3(0, 1.2, 0), {
        size: isCharged ? 0.6 : 0.4,
        endSize: isCharged ? 1.6 : 1.0,
        life: 0.45,
        gravity: 0.8,
        color: 0x2a2422,
        opacity: 0.4,
      });
    }
  }

  spawnTireSmoke(pos) {
    const vel = new THREE.Vector3(
      (Math.random() - 0.5) * 2.4,
      1.2 + Math.random() * 1.4,
      (Math.random() - 0.5) * 2.4
    );
    this._addSprite(this.smokeTex, pos, vel, {
      size: 0.65,
      endSize: 2.3,
      life: 0.65,
      gravity: 0.8,
      drag: 0.96,
      color: 0xd0d4dc,
      opacity: 0.42,
    });
  }

  spawnEngineFire(pos) {
    // Flame tongue
    this._addSprite(
      this.fireTex,
      new THREE.Vector3(
        pos.x + (Math.random() - 0.5) * 0.7,
        pos.y + Math.random() * 0.3,
        pos.z + (Math.random() - 0.5) * 0.7
      ),
      new THREE.Vector3((Math.random() - 0.5) * 1.6, 3.2 + Math.random() * 2.5, (Math.random() - 0.5) * 1.6),
      {
        size: 0.85 + Math.random() * 0.5,
        endSize: 0.2,
        life: 0.32 + Math.random() * 0.16,
        gravity: 3.2,
        additive: true,
        opacity: 0.92,
      }
    );

    // Thick black smoke
    if (Math.random() < 0.7) {
      this._addSprite(
        this.smokeTex,
        new THREE.Vector3(pos.x, pos.y + 0.5, pos.z),
        new THREE.Vector3((Math.random() - 0.5) * 2.2, 3.8 + Math.random() * 2.4, (Math.random() - 0.5) * 2.2),
        {
          size: 0.9,
          endSize: 3.0,
          life: 0.85,
          gravity: 1.4,
          drag: 0.97,
          color: 0x191718,
          opacity: 0.62,
        }
      );
    }
  }

  spawnMetalSparks(pos, count = 16) {
    for (let i = 0; i < count; i++) {
      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 18,
        3 + Math.random() * 9,
        (Math.random() - 0.5) * 15
      );
      this._addSprite(this.sparkTex, pos, vel, {
        size: 0.34,
        endSize: 0.05,
        life: 0.4 + Math.random() * 0.35,
        gravity: -22,
        drag: 0.97,
        additive: true,
        color: 0xffd86b,
      });
    }
  }

  spawnSkidMark(pos, yaw) {
    if (Math.abs(pos.x) > 9.0) return;
    const mat = new THREE.MeshBasicMaterial({
      color: 0x09090c,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(this.skidGeo, mat);
    mesh.position.set(pos.x, 0.03, pos.z);
    mesh.rotation.y = yaw;
    this.scene.add(mesh);
    this.skids.push({ mesh, age: 0, life: 5.5 });
    if (this.skids.length > 90) {
      const oldest = this.skids.shift();
      this.scene.remove(oldest.mesh);
      oldest.mesh.material.dispose();
    }
  }

  update(dt) {
    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.age += dt;
      if (p.age >= p.life) {
        this.scene.remove(p.mesh);
        if (p.mesh.material) p.mesh.material.dispose();
        this.particles.splice(i, 1);
        continue;
      }

      const t = p.age / p.life;
      p.vel.y += p.gravity * dt;
      p.vel.multiplyScalar(Math.pow(p.drag, dt * 60));
      p.mesh.position.addScaledVector(p.vel, dt);

      if (p.type === 'shard') {
        p.mesh.rotation.x += p.rotVel.x * dt;
        p.mesh.rotation.y += p.rotVel.y * dt;
        p.mesh.rotation.z += p.rotVel.z * dt;
        // Bounce off asphalt
        if (p.mesh.position.y < 0.08) {
          p.mesh.position.y = 0.08;
          p.vel.y *= -0.45;
          p.vel.x *= 0.72;
          p.vel.z *= 0.72;
        }
        p.mesh.material.opacity = p.startOpacity * (1 - t * t);
      } else {
        const s = p.startSize + (p.endSize - p.startSize) * t;
        p.mesh.scale.set(s, s, 1);
        p.mesh.material.opacity = p.startOpacity * (1 - t);
      }
    }

    // Update shockwave rings
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i];
      r.age += dt;
      if (r.age >= r.life) {
        this.scene.remove(r.mesh);
        r.mesh.material.dispose();
        this.rings.splice(i, 1);
        continue;
      }
      const t = r.age / r.life;
      const sc = 0.5 + (r.maxScale - 0.5) * (1 - Math.pow(1 - t, 3));
      r.mesh.scale.set(sc, sc, 1);
      r.mesh.material.opacity = 0.85 * (1 - t);
    }

    // Fade tire skid marks
    for (let i = this.skids.length - 1; i >= 0; i--) {
      const sk = this.skids[i];
      sk.age += dt;
      if (sk.age >= sk.life) {
        this.scene.remove(sk.mesh);
        sk.mesh.material.dispose();
        this.skids.splice(i, 1);
        continue;
      }
      const rem = 1 - sk.age / sk.life;
      sk.mesh.material.opacity = 0.72 * Math.min(1, rem * 2.2);
    }
  }

  clear() {
    for (const p of this.particles) {
      this.scene.remove(p.mesh);
      if (p.mesh.material) p.mesh.material.dispose();
    }
    this.particles = [];
    for (const r of this.rings) {
      this.scene.remove(r.mesh);
      r.mesh.material.dispose();
    }
    this.rings = [];
    for (const sk of this.skids) {
      this.scene.remove(sk.mesh);
      sk.mesh.material.dispose();
    }
    this.skids = [];
  }
}
