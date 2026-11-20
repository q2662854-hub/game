import * as THREE from 'three';
import { sound } from './audio.js';
import { LUXURY_CAR_SPECS, LuxuryCar } from './cars.js';
import { buildEnvironment, LANE_XS, ROAD_HALF_WIDTH } from './environment.js';
import { ParticleSystem } from './particles.js';
import { createGlowTexture } from './textures.js';

const GRAVITY = -36;
const MAX_LIVES = 5;
const STORAGE_KEY = 'firestone_luxury_best_v1';

// Helper: closest point distance squared between segment AB and point P
function segmentPointDistSq(a, b, p) {
  const ab = new THREE.Vector3().subVectors(b, a);
  const ap = new THREE.Vector3().subVectors(p, a);
  const abLenSq = ab.lengthSq();
  if (abLenSq < 1e-6) return ap.lengthSq();
  const t = THREE.MathUtils.clamp(ap.dot(ab) / abLenSq, 0, 1);
  const closest = a.clone().addScaledVector(ab, t);
  return closest.distanceToSquared(p);
}

export class FirestoneGame {
  constructor(canvas, uiCallbacks) {
    this.canvas = canvas;
    this.ui = uiCallbacks;

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;

    // Scene & Camera (Elevated Highway Overpass Perspective)
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(56, window.innerWidth / window.innerHeight, 0.3, 420);
    this.baseCamPos = new THREE.Vector3(0, 9.2, 21.5);
    this.camera.position.copy(this.baseCamPos);
    this.camera.lookAt(0, 1.4, -38);

    // Environment & Particles
    this.env = buildEnvironment(this.scene);
    this.particles = new ParticleSystem(this.scene);
    this.fireGlowTex = createGlowTexture('#fff8d6', '#ff6200', 'rgba(255, 20, 0, 0)');

    // Aiming trajectory preview dots & ground/target ring
    this._buildAimVisuals();

    // State
    this.phase = 'menu'; // 'menu' | 'playing' | 'paused' | 'gameover'
    this.mode = 'arcade'; // 'arcade' | 'freeplay'
    this.score = 0;
    this.bestScore = Number(localStorage.getItem(STORAGE_KEY) || 0);
    this.lives = MAX_LIVES;
    this.wave = 1;
    this.waveQuota = 8;
    this.waveWrecked = 0;
    this.totalWrecked = 0;
    this.windshieldHits = 0;
    this.shotsFired = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.comboTimer = 0;
    this.fury = 0; // 0..100
    this.overdriveTimer = 0;
    this.wreckedByBrand = {};

    this.cars = [];
    this.stones = [];

    // Timers & Juice
    this.spawnTimer = 0.6;
    this.hitstopTimer = 0;
    this.shakeIntensity = 0;
    this.elapsedTime = 0;
    this.overdriveRapidTimer = 0;

    // Pointer / Aim state
    this.pointerNDC = new THREE.Vector2(0, -0.05);
    this.pointerScreen = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    this.raycaster = new THREE.Raycaster();
    this.aimPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -1.15); // windshield height plane
    this.aimWorldPoint = new THREE.Vector3(0, 1.15, -40);
    this.lockedCar = null;
    this.isCharging = false;
    this.chargeTime = 0;
    this.throwCooldown = 0;
    this.heldStoneRecoil = 0;

    this._bindEvents();
    this._spawnAmbientMenuCars();

    this.lastFrameTime = performance.now();
    this._loop = this._loop.bind(this);
    requestAnimationFrame(this._loop);
  }

  _buildAimVisuals() {
    this.arcDots = [];
    const dotGeo = new THREE.SphereGeometry(0.14, 8, 8);
    for (let i = 0; i < 16; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xffa638,
        transparent: true,
        opacity: 0.72 * (1 - i / 20),
      });
      const dot = new THREE.Mesh(dotGeo, mat);
      dot.visible = false;
      this.scene.add(dot);
      this.arcDots.push(dot);
    }

    const ringGeo = new THREE.RingGeometry(0.75, 1.05, 28);
    ringGeo.rotateX(-Math.PI / 2);
    this.targetRingMat = new THREE.MeshBasicMaterial({
      color: 0xff8c24,
      transparent: true,
      opacity: 0.65,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.targetRing = new THREE.Mesh(ringGeo, this.targetRingMat);
    this.targetRing.position.set(0, 0.12, -40);
    this.targetRing.visible = false;
    this.scene.add(this.targetRing);
  }

  _bindEvents() {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    const updatePointer = (clientX, clientY) => {
      this.pointerScreen.x = clientX;
      this.pointerScreen.y = clientY;
      this.pointerNDC.x = (clientX / window.innerWidth) * 2 - 1;
      this.pointerNDC.y = -(clientY / window.innerHeight) * 2 + 1;
    };

    this.canvas.addEventListener('pointermove', (e) => {
      updatePointer(e.clientX, e.clientY);
    });

    this.canvas.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      if (this.phase !== 'playing') return;
      sound.init();
      updatePointer(e.clientX, e.clientY);
      this._updateAiming();

      if (this.overdriveTimer > 0) {
        this.isCharging = true;
        this._fireStone(1.0, true);
        this.overdriveRapidTimer = 0.16;
      } else {
        this.isCharging = true;
        this.chargeTime = 0;
        sound.startCharge();
      }
    });

    const releaseFire = () => {
      if (!this.isCharging) return;
      this.isCharging = false;
      sound.stopCharge();

      if (this.phase === 'playing' && this.overdriveTimer <= 0) {
        this._updateAiming();
        const chargeRatio = THREE.MathUtils.clamp(this.chargeTime / 0.55, 0, 1);
        this._fireStone(chargeRatio, false);
      }
      this.chargeTime = 0;
    };

    window.addEventListener('pointerup', releaseFire);
    window.addEventListener('pointercancel', releaseFire);

    window.addEventListener('keydown', (e) => {
      if (this.phase !== 'playing') return;
      if (e.code === 'Space') {
        e.preventDefault();
        this.activateOverdrive();
      } else if (e.code === 'Escape' || e.code === 'KeyP') {
        this.togglePause();
      }
    });
  }

  _spawnAmbientMenuCars() {
    this._clearEntities();
    const initialZs = [-135, -95, -55, -20];
    initialZs.forEach((z, idx) => {
      const spec = LUXURY_CAR_SPECS[idx % LUXURY_CAR_SPECS.length];
      const car = new LuxuryCar(spec, LANE_XS[idx % LANE_XS.length], z, 0.85);
      this.scene.add(car.group);
      this.cars.push(car);
    });
  }

  startGame(mode = 'arcade') {
    sound.init();
    this.mode = mode;
    this.phase = 'playing';
    this.score = 0;
    this.lives = MAX_LIVES;
    this.wave = 1;
    this.waveQuota = 8;
    this.waveWrecked = 0;
    this.totalWrecked = 0;
    this.windshieldHits = 0;
    this.shotsFired = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.comboTimer = 0;
    this.fury = 0;
    this.overdriveTimer = 0;
    this.wreckedByBrand = {};
    this.spawnTimer = 0.35;
    this.isCharging = false;
    this.chargeTime = 0;
    this.throwCooldown = 0;

    this._clearEntities();
    this.ui.onStateChange(this._getHUDState());
    this.ui.onBanner(
      mode === 'freeplay' ? 'حالت تخریب آزاد فعال شد!' : 'موج ۱ — شیشه ماشین‌های لوکس رو هدف بگیر!'
    );

    // Spawn 2 immediate incoming cars so action starts right away!
    this._spawnCar(-105);
    this._spawnCar(-145);
  }

  togglePause() {
    if (this.phase === 'playing') {
      this.phase = 'paused';
      this.isCharging = false;
      sound.stopCharge();
      this.ui.onPauseChange(true);
    } else if (this.phase === 'paused') {
      this.phase = 'playing';
      this.lastFrameTime = performance.now();
      this.ui.onPauseChange(false);
    }
  }

  returnToMenu() {
    this.phase = 'menu';
    this.isCharging = false;
    sound.stopCharge();
    this._spawnAmbientMenuCars();
    this.ui.onMenuReturn();
  }

  activateOverdrive() {
    if (this.phase !== 'playing') return;
    if (this.fury < 100 || this.overdriveTimer > 0) return;
    this.fury = 0;
    this.overdriveTimer = 5.5;
    this.shakeIntensity = 0.55;
    sound.playOverdrive();
    this.ui.onBanner('🔥 باران سنگ‌های آتشین فعال شد! 🔥');
    this.ui.onStateChange(this._getHUDState());
  }

  _clearEntities() {
    for (const c of this.cars) {
      this.scene.remove(c.group);
    }
    this.cars = [];
    for (const s of this.stones) {
      this.scene.remove(s.mesh);
    }
    this.stones = [];
    this.particles.clear();
  }

  _pickCarSpec() {
    const maxWave = this.mode === 'freeplay' ? 99 : this.wave;
    const pool = LUXURY_CAR_SPECS.filter((s) => s.minWave <= maxWave);
    const totalWeight = pool.reduce((sum, s) => sum + s.weight, 0);
    let r = Math.random() * totalWeight;
    for (const spec of pool) {
      r -= spec.weight;
      if (r <= 0) return spec;
    }
    return pool[0];
  }

  _spawnCar(customZ = null) {
    const spec = this._pickCarSpec();
    // Pick a lane that isn't occupied near spawn
    const spawnZ = customZ ?? -160 - Math.random() * 18;
    const shuffledLanes = [...LANE_XS].sort(() => Math.random() - 0.5);
    let chosenLane = shuffledLanes[0];
    for (const lx of shuffledLanes) {
      const blocked = this.cars.some(
        (c) => c.state === 'driving' && Math.abs(c.group.position.x - lx) < 2.2 && Math.abs(c.group.position.z - spawnZ) < 22
      );
      if (!blocked) {
        chosenLane = lx;
        break;
      }
    }

    const speedMult = this.mode === 'freeplay' ? 1.0 : 1.0 + (this.wave - 1) * 0.085;
    const car = new LuxuryCar(spec, chosenLane, spawnZ, Math.min(speedMult, 1.55));
    this.scene.add(car.group);
    this.cars.push(car);
  }

  _updateAiming() {
    this.raycaster.setFromCamera(this.pointerNDC, this.camera);

    // 1. Check if pointer ray passes near any driving car's windshield for crisp lock-on
    let bestCar = null;
    let bestDist = Infinity;
    let bestPoint = null;

    const ray = this.raycaster.ray;
    for (const car of this.cars) {
      if (car.state !== 'driving' || car.group.position.z < -155 || car.group.position.z > 13) continue;
      car.group.updateMatrixWorld();
      const wsPos = car.getWindshieldWorldPos();
      const distToRay = ray.distanceToPoint(wsPos);
      const snapRadius = car.windshieldRadius * 1.48;
      if (distToRay < snapRadius && distToRay < bestDist) {
        bestDist = distToRay;
        bestCar = car;
        bestPoint = wsPos;
      }
    }

    this.lockedCar = bestCar;

    if (bestCar && bestPoint) {
      // Predict slight forward movement during flight time so aiming directly at windshield hits dead-center!
      const startPos = this.env.heldStoneGroup.position;
      const dist = startPos.distanceTo(bestPoint);
      const isCharged = this.chargeTime > 0.35 || this.overdriveTimer > 0;
      const estSpeed = isCharged ? 128 : 98;
      const estFlight = THREE.MathUtils.clamp(dist / estSpeed, 0.14, 0.65);
      // Lead 85% of car forward movement when locked directly on windshield
      this.aimWorldPoint.set(
        bestPoint.x,
        bestPoint.y,
        bestPoint.z + bestCar.speed * estFlight * 0.85
      );
    } else {
      const hit = new THREE.Vector3();
      if (ray.intersectPlane(this.aimPlane, hit)) {
        hit.x = THREE.MathUtils.clamp(hit.x, -16, 16);
        hit.z = THREE.MathUtils.clamp(hit.z, -145, 6);
        this.aimWorldPoint.copy(hit);
      }
    }

    // Update trajectory arc dots & target ring
    const showAim = this.phase === 'playing';
    this.targetRing.visible = showAim;

    if (showAim) {
      const start = this.env.heldStoneGroup.position;
      const isCharged = this.chargeTime > 0.35 || this.overdriveTimer > 0;
      const { velocity, flightTime } = this._computeBallisticVelocity(start, this.aimWorldPoint, isCharged);

      for (let i = 0; i < this.arcDots.length; i++) {
        const dot = this.arcDots[i];
        dot.visible = true;
        const frac = (i + 1) / (this.arcDots.length + 1);
        const t = flightTime * frac;
        dot.position.set(
          start.x + velocity.x * t,
          start.y + velocity.y * t + 0.5 * GRAVITY * t * t,
          start.z + velocity.z * t
        );
        const c = this.lockedCar ? 0xff3b14 : isCharged ? 0xffe46b : 0xff9a2e;
        dot.material.color.setHex(c);
        const s = isCharged ? 1.3 : 1.0;
        dot.scale.setScalar(s * (1 - frac * 0.35));
      }

      this.targetRing.position.set(this.aimWorldPoint.x, 0.14, this.aimWorldPoint.z);
      const pulse = 1 + Math.sin(this.elapsedTime * 14) * 0.12;
      this.targetRing.scale.setScalar(this.lockedCar ? 1.25 * pulse : 0.9 * pulse);
      this.targetRingMat.color.setHex(this.lockedCar ? 0xff2b14 : 0xff9b26);
    } else {
      for (const dot of this.arcDots) dot.visible = false;
    }
  }

  _computeBallisticVelocity(start, target, isSuper) {
    const dist = start.distanceTo(target);
    const speed = isSuper ? 128 : 98;
    const flightTime = THREE.MathUtils.clamp(dist / speed, 0.14, 0.72);
    const vx = (target.x - start.x) / flightTime;
    const vz = (target.z - start.z) / flightTime;
    const vy = (target.y - start.y - 0.5 * GRAVITY * flightTime * flightTime) / flightTime;
    return { velocity: new THREE.Vector3(vx, vy, vz), flightTime };
  }

  _fireStone(chargeRatio, isOverdrive) {
    if (this.throwCooldown > 0 && !isOverdrive) return;
    this.throwCooldown = 0.16;
    this.heldStoneRecoil = 1.0;
    this.shotsFired++;

    const isCharged = isOverdrive || chargeRatio >= 0.62;
    const startPos = this.env.heldStoneGroup.position.clone();
    const target = this.aimWorldPoint.clone();

    const { velocity } = this._computeBallisticVelocity(startPos, target, isCharged);

    // Create blazing 3D volcanic stone mesh
    const stoneGroup = new THREE.Group();
    stoneGroup.position.copy(startPos);

    const scale = isCharged ? 1.45 : 0.95 + chargeRatio * 0.25;
    const mat = new THREE.MeshStandardMaterial({
      map: this.env.magmaTex.map,
      emissive: new THREE.Color(isCharged ? 0xffaa22 : 0xff5400),
      emissiveMap: this.env.magmaTex.emissiveMap,
      emissiveIntensity: isCharged ? 3.8 : 2.5,
      roughness: 0.6,
    });
    const rock = new THREE.Mesh(this.env.stoneGeo, mat);
    rock.scale.setScalar(scale);
    stoneGroup.add(rock);

    const glow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: this.fireGlowTex,
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    glow.scale.set(2.6 * scale, 2.6 * scale, 1);
    stoneGroup.add(glow);

    const light = new THREE.PointLight(isCharged ? 0xffbb33 : 0xff5a00, isCharged ? 8 : 5, 16);
    stoneGroup.add(light);

    this.scene.add(stoneGroup);

    this.stones.push({
      mesh: stoneGroup,
      rockMesh: rock,
      prevPos: startPos.clone(),
      vel: velocity,
      radius: 0.68 * scale,
      isCharged,
      age: 0,
      trailTimer: 0,
      alive: true,
    });

    sound.playThrow(isCharged ? 1 : chargeRatio, isOverdrive);
    this.particles.spawnFireBurst(startPos, isCharged ? 0.55 : 0.35);
    this.ui.onStateChange(this._getHUDState());
  }

  _projectToScreen(worldPos) {
    const v = worldPos.clone().project(this.camera);
    return {
      x: (v.x * 0.5 + 0.5) * window.innerWidth,
      y: (-v.y * 0.5 + 0.5) * window.innerHeight,
    };
  }

  _handleCarDisabled(car, isWindshield, isCharged, impactPos, isChain = false) {
    this.totalWrecked++;
    this.waveWrecked++;
    this.wreckedByBrand[car.spec.shortFa] = (this.wreckedByBrand[car.spec.shortFa] || 0) + 1;

    this.combo++;
    this.maxCombo = Math.max(this.maxCombo, this.combo);
    this.comboTimer = 3.8;

    const comboMult = Math.min(1 + (this.combo - 1) * 0.25, 4.0);
    const wsBonus = isWindshield ? 1.5 : 1.0;
    const earned = Math.round(car.spec.points * wsBonus * comboMult) + (isChain ? 500 : 0);
    this.score += earned;
    if (this.score > this.bestScore) {
      this.bestScore = this.score;
      localStorage.setItem(STORAGE_KEY, String(this.bestScore));
    }

    // Fill Fire Fury bar
    if (this.overdriveTimer <= 0) {
      const furyGain = isWindshield ? 22 : 14;
      const wasFull = this.fury >= 100;
      this.fury = Math.min(100, this.fury + furyGain);
      if (!wasFull && this.fury >= 100) {
        this.ui.onBanner('⚡ خشم آتشین پر شد! کلید Space یا دکمه باران آتش را بزن!');
      }
    }

    // Dramatic visual & audio feedback
    const screenPt = this._projectToScreen(impactPos);
    if (isChain) {
      this.ui.onFloatingText(screenPt.x, screenPt.y - 20, `⚡ تصادف زنجیره‌ای! +${earned}`, 'chain');
    } else if (isWindshield) {
      this.windshieldHits++;
      const label =
        this.combo >= 3
          ? `🔥 شیشه ${car.spec.shortFa} خرد شد! +${earned} (x${this.combo})`
          : `💥 شیشه ${car.spec.shortFa} خرد شد! +${earned}`;
      this.ui.onFloatingText(screenPt.x, screenPt.y - 16, label, 'bullseye');
    } else {
      this.ui.onFloatingText(screenPt.x, screenPt.y - 14, `🚗 ${car.spec.shortFa} منحرف شد! +${earned}`, 'normal');
    }

    if (this.combo >= 2) {
      sound.playCombo(this.combo);
    }

    // Check Arcade Wave Clear
    if (this.mode === 'arcade' && this.waveWrecked >= this.waveQuota) {
      this.wave++;
      this.waveWrecked = 0;
      this.waveQuota = Math.round(8 + (this.wave - 1) * 3.5);
      if (this.lives < MAX_LIVES) this.lives++;
      sound.playWaveClear();
      this.ui.onBanner(`🏆 موج ${this.wave} آغاز شد! (+۱ سپر بازیابی شد)`);
    }

    this.ui.onStateChange(this._getHUDState());
  }

  _updateStones(dt) {
    for (let i = this.stones.length - 1; i >= 0; i--) {
      const s = this.stones[i];
      s.age += dt;
      s.prevPos.copy(s.mesh.position);

      s.vel.y += GRAVITY * dt;
      s.mesh.position.addScaledVector(s.vel, dt);
      s.rockMesh.rotation.x += dt * 11;
      s.rockMesh.rotation.y += dt * 8;

      // Blazing fire trail
      s.trailTimer -= dt;
      if (s.trailTimer <= 0) {
        s.trailTimer = 0.018;
        this.particles.spawnFireTrail(s.mesh.position, s.isCharged);
      }

      // Check collision against driving cars
      let hitSomething = false;
      for (const car of this.cars) {
        if (car.state !== 'driving') continue;
        car.group.updateMatrixWorld();

        // 1. Windshield critical sphere check (swept segment test)
        const wsPos = car.getWindshieldWorldPos();
        const wsHitRad = car.windshieldRadius + s.radius * 0.95;
        const wsDistSq = segmentPointDistSq(s.prevPos, s.mesh.position, wsPos);

        if (wsDistSq <= wsHitRad * wsHitRad) {
          hitSomething = true;
          const res = car.applyHit({
            isWindshield: true,
            isCharged: s.isCharged,
            impactX: s.mesh.position.x,
          });

          if (res.result === 'windshield_disable') {
            this.particles.spawnGlassShatter(wsPos, car.speed, s.isCharged);
            this.particles.spawnFireBurst(wsPos, s.isCharged ? 1.55 : 1.2);
            sound.playWindshieldShatter(s.isCharged);
            sound.playTireScreech();
            this.hitstopTimer = 0.032;
            this.shakeIntensity = s.isCharged ? 0.65 : 0.44;
            this._handleCarDisabled(car, true, s.isCharged, wsPos, false);
          } else if (res.result === 'armor_cracked') {
            this.particles.spawnGlassShatter(wsPos, car.speed * 0.6, false);
            this.particles.spawnFireBurst(wsPos, 0.85);
            sound.playBodyHit();
            this.shakeIntensity = 0.28;
            const pt = this._projectToScreen(wsPos);
            this.ui.onFloatingText(pt.x, pt.y - 12, '🛡️ شیشه ضدگلوله ترک خورد! دوباره بزن!', 'armor');
          }
          break;
        }

        // 2. Car chassis/body check
        const center = car.getCenterWorldPos();
        const dx = Math.abs(s.mesh.position.x - center.x);
        const dz = Math.abs(s.mesh.position.z - center.z);
        const dy = s.mesh.position.y;
        if (
          dx < car.spec.width * 0.62 + s.radius * 0.7 &&
          dz < car.spec.length * 0.56 + s.radius * 0.7 &&
          dy < car.spec.bodyHeight + car.spec.cabinHeight + 0.75
        ) {
          hitSomething = true;
          const res = car.applyHit({
            isWindshield: false,
            isCharged: s.isCharged,
            impactX: s.mesh.position.x,
          });

          if (res.result === 'body_disable') {
            this.particles.spawnGlassShatter(wsPos, car.speed, s.isCharged);
            this.particles.spawnFireBurst(s.mesh.position, s.isCharged ? 1.45 : 1.05);
            sound.playWindshieldShatter(s.isCharged);
            sound.playTireScreech();
            this.hitstopTimer = 0.025;
            this.shakeIntensity = 0.4;
            this._handleCarDisabled(car, false, s.isCharged, s.mesh.position, false);
          } else {
            this.particles.spawnFireBurst(s.mesh.position, 0.75);
            this.particles.spawnMetalSparks(s.mesh.position, 14);
            sound.playBodyHit();
            this.shakeIntensity = 0.2;
            const pt = this._projectToScreen(s.mesh.position);
            this.ui.onFloatingText(pt.x, pt.y - 10, '🔧 ضربه به بدنه! شیشه رو بزن!', 'body');
          }
          break;
        }
      }

      // Ground impact
      if (!hitSomething && s.mesh.position.y <= 0.25) {
        hitSomething = true;
        const gPos = new THREE.Vector3(s.mesh.position.x, 0.25, s.mesh.position.z);
        this.particles.spawnFireBurst(gPos, s.isCharged ? 1.1 : 0.68);
        sound.playGroundImpact();
        if (s.isCharged) {
          this.shakeIntensity = Math.max(this.shakeIntensity, 0.22);
          // Charged stone splash blast can still shatter nearby car windshields!
          for (const car of this.cars) {
            if (car.state !== 'driving') continue;
            const d = car.getCenterWorldPos().distanceTo(gPos);
            if (d < 4.5) {
              const wsPos = car.getWindshieldWorldPos();
              const res = car.applyHit({ isWindshield: true, isCharged: true, impactX: gPos.x });
              if (res.result === 'windshield_disable') {
                this.particles.spawnGlassShatter(wsPos, car.speed, true);
                sound.playWindshieldShatter(true);
                sound.playTireScreech();
                this._handleCarDisabled(car, true, true, wsPos, false);
              }
            }
          }
        }
      }

      if (hitSomething || s.age > 3.0) {
        this.scene.remove(s.mesh);
        this.stones.splice(i, 1);
      }
    }
  }

  _updateCars(dt) {
    for (let i = this.cars.length - 1; i >= 0; i--) {
      const car = this.cars[i];
      car.update(dt, this.particles, sound, ROAD_HALF_WIDTH, LANE_XS);

      // Chain-reaction collision: swerving out-of-control car slams into another driving luxury car!
      if (car.state === 'swerving') {
        for (const other of this.cars) {
          if (other === car || other.state !== 'driving') continue;
          const dist = car.group.position.distanceTo(other.group.position);
          if (dist < 3.45) {
            if (other.triggerChainCrash(car.swerveDir)) {
              const mid = car.group.position.clone().lerp(other.group.position, 0.5);
              mid.y = 1.2;
              this.particles.spawnGlassShatter(mid, other.speed, true);
              this.particles.spawnFireBurst(mid, 1.35);
              this.particles.spawnMetalSparks(mid, 24);
              sound.playGuardrailCrash();
              sound.playTireScreech();
              this.shakeIntensity = 0.55;
              this._handleCarDisabled(other, true, false, mid, true);
            }
          }
        }
      }

      if (!car.alive) {
        if (car.escaped && this.phase === 'playing') {
          this.combo = 0;
          if (this.mode === 'arcade') {
            this.lives--;
            sound.playEscapeWarning();
            this.shakeIntensity = 0.35;
            this.ui.onEscapeFlash();
            this.ui.onStateChange(this._getHUDState());

            if (this.lives <= 0) {
              this._triggerGameOver();
            }
          } else {
            this.ui.onStateChange(this._getHUDState());
          }
        }
        this.scene.remove(car.group);
        this.cars.splice(i, 1);
      }
    }
  }

  _triggerGameOver() {
    this.phase = 'gameover';
    this.isCharging = false;
    sound.stopCharge();
    this.ui.onGameOver({
      score: this.score,
      bestScore: this.bestScore,
      wave: this.wave,
      totalWrecked: this.totalWrecked,
      windshieldHits: this.windshieldHits,
      shotsFired: this.shotsFired,
      maxCombo: this.maxCombo,
      wreckedByBrand: this.wreckedByBrand,
    });
  }

  _updateHeldStone(dt) {
    const g = this.env.heldStoneGroup;
    const targetX = THREE.MathUtils.clamp(this.pointerNDC.x * 2.8, -2.6, 2.6);
    g.position.x = THREE.MathUtils.lerp(g.position.x, targetX, dt * 12);

    this.heldStoneRecoil = Math.max(0, this.heldStoneRecoil - dt * 4.5);
    const chargeRatio = this.isCharging ? THREE.MathUtils.clamp(this.chargeTime / 0.55, 0, 1) : 0;
    const isOver = this.overdriveTimer > 0;

    g.position.y = 6.25 - this.heldStoneRecoil * 0.95 + Math.sin(this.elapsedTime * 4) * 0.08;
    g.position.z = 15.7 + this.heldStoneRecoil * 1.15 - chargeRatio * 0.35;

    const scale = isOver ? 1.42 : 1.0 + chargeRatio * 0.48;
    this.env.heldStoneMesh.scale.setScalar(scale * (1 - this.heldStoneRecoil * 0.45));
    this.env.heldStoneMesh.rotation.y += dt * (1.8 + chargeRatio * 8 + (isOver ? 7 : 0));
    this.env.heldStoneMesh.rotation.x += dt * (1.1 + chargeRatio * 5);

    this.env.heldStoneMat.emissiveIntensity = isOver ? 4.2 : 2.0 + chargeRatio * 2.6;
    this.env.heldLight.intensity = isOver ? 8.5 : 4.2 + chargeRatio * 4.5;
    const glowScale = isOver ? 3.5 : 2.3 + chargeRatio * 1.5;
    this.env.stoneGlow.scale.set(glowScale, glowScale, 1);

    // Emit rising sparks while charging or in overdrive
    if ((chargeRatio > 0.25 || isOver) && Math.random() < 0.45) {
      this.particles.spawnFireTrail(g.position.clone().add(new THREE.Vector3(0, 0.3, 0)), true);
    }
  }

  _getHUDState() {
    return {
      score: this.score,
      bestScore: this.bestScore,
      lives: this.lives,
      maxLives: MAX_LIVES,
      wave: this.wave,
      waveWrecked: this.waveWrecked,
      waveQuota: this.waveQuota,
      totalWrecked: this.totalWrecked,
      combo: this.combo,
      fury: this.fury,
      overdriveTimer: this.overdriveTimer,
      mode: this.mode,
    };
  }

  _loop(now) {
    requestAnimationFrame(this._loop);
    let rawDt = (now - this.lastFrameTime) / 1000;
    this.lastFrameTime = now;
    rawDt = Math.min(rawDt, 0.05);

    if (this.phase === 'paused') {
      this.renderer.render(this.scene, this.camera);
      return;
    }

    // Impact hitstop punch
    if (this.hitstopTimer > 0) {
      this.hitstopTimer -= rawDt;
      this.renderer.render(this.scene, this.camera);
      return;
    }

    const dt = rawDt;
    this.elapsedTime += dt;

    if (this.throwCooldown > 0) this.throwCooldown -= dt;

    // Update charging & Overdrive
    if (this.phase === 'playing') {
      if (this.overdriveTimer > 0) {
        this.overdriveTimer -= dt;
        if (this.overdriveTimer <= 0) {
          this.overdriveTimer = 0;
        }
        this.ui.onStateChange(this._getHUDState());
        if (this.isCharging && this.overdriveTimer > 0) {
          this.overdriveRapidTimer -= dt;
          if (this.overdriveRapidTimer <= 0) {
            this._fireStone(1.0, true);
            this.overdriveRapidTimer = 0.15;
          }
        }
      } else if (this.isCharging) {
        this.chargeTime += dt;
        const ratio = THREE.MathUtils.clamp(this.chargeTime / 0.55, 0, 1);
        sound.updateCharge(ratio);
      }

      if (this.combo > 0) {
        this.comboTimer -= dt;
        if (this.comboTimer <= 0) {
          this.combo = 0;
          this.ui.onStateChange(this._getHUDState());
        }
      }

      // Spawn incoming luxury cars
      this.spawnTimer -= dt;
      const maxSimultaneous = this.mode === 'freeplay' ? 6 : Math.min(3 + this.wave, 8);
      const drivingCount = this.cars.filter((c) => c.state === 'driving').length;
      if (this.spawnTimer <= 0 && drivingCount < maxSimultaneous) {
        this._spawnCar();
        const baseInterval = this.mode === 'freeplay' ? 1.25 : Math.max(0.68, 1.78 - (this.wave - 1) * 0.15);
        this.spawnTimer = baseInterval * (0.75 + Math.random() * 0.5);
      }
    } else if (this.phase === 'menu') {
      // Keep ambient highway alive on title screen!
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0 && this.cars.length < 5) {
        this._spawnCar();
        this.spawnTimer = 1.6;
      }
    }

    this._updateAiming();
    this._updateHeldStone(dt);
    this._updateStones(dt);
    this._updateCars(dt);
    this.particles.update(dt);

    // Screen shake decay
    if (this.shakeIntensity > 0.005) {
      this.camera.position.set(
        this.baseCamPos.x + (Math.random() - 0.5) * this.shakeIntensity * 1.4,
        this.baseCamPos.y + (Math.random() - 0.5) * this.shakeIntensity * 1.1,
        this.baseCamPos.z
      );
      this.shakeIntensity *= Math.pow(0.02, dt);
    } else {
      this.camera.position.copy(this.baseCamPos);
      this.shakeIntensity = 0;
    }

    // Update Crosshair UI
    const chargeRatio = this.isCharging && this.overdriveTimer <= 0 ? THREE.MathUtils.clamp(this.chargeTime / 0.55, 0, 1) : 0;
    this.ui.onCrosshairUpdate({
      visible: this.phase === 'playing',
      x: this.pointerScreen.x,
      y: this.pointerScreen.y,
      lockedCarName: this.lockedCar ? this.lockedCar.spec.shortFa : null,
      lockedArmored: this.lockedCar ? this.lockedCar.spec.armored && this.lockedCar.hp > 1 : false,
      chargeRatio,
      overdriveActive: this.overdriveTimer > 0,
      overdriveRatio: this.overdriveTimer / 5.5,
    });

    this.renderer.render(this.scene, this.camera);
  }
}
