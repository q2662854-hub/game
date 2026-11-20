import * as THREE from 'three';
import {
  createBrandGrilleTexture,
  createGlowTexture,
  createWindshieldTexture,
} from './textures.js';

export const LUXURY_CAR_SPECS = [
  {
    key: 'benz_s',
    nameFa: 'مرسدس بنز S-Class',
    shortFa: 'بنز S-Class',
    colors: [0x141820, 0xc9d2dc, 0x1e2b38],
    speed: 25,
    points: 220,
    hp: 1,
    armored: false,
    width: 2.22,
    length: 5.25,
    bodyHeight: 0.72,
    cabinHeight: 0.62,
    cabinLength: 2.35,
    cabinOffsetZ: -0.22,
    style: 'sedan',
    minWave: 1,
    weight: 26,
  },
  {
    key: 'bmw',
    nameFa: 'بی‌ام‌و M8 کوپه',
    shortFa: 'بی‌ام‌و M8',
    colors: [0x13428f, 0x3b4454, 0x9b1826],
    speed: 29,
    points: 250,
    hp: 1,
    armored: false,
    width: 2.18,
    length: 4.95,
    bodyHeight: 0.66,
    cabinHeight: 0.56,
    cabinLength: 2.1,
    cabinOffsetZ: -0.28,
    style: 'coupe',
    minWave: 1,
    weight: 22,
  },
  {
    key: 'porsche',
    nameFa: 'پورشه ۹۱۱ توربو',
    shortFa: 'پورشه ۹۱۱',
    colors: [0xeff2f7, 0xf2c511, 0x1c75a8],
    speed: 32,
    points: 280,
    hp: 1,
    armored: false,
    width: 2.12,
    length: 4.65,
    bodyHeight: 0.6,
    cabinHeight: 0.54,
    cabinLength: 1.95,
    cabinOffsetZ: -0.25,
    style: 'sports',
    minWave: 1,
    weight: 18,
  },
  {
    key: 'benz_g',
    nameFa: 'مرسدس بنز G-Class',
    shortFa: 'بنز G-Class',
    colors: [0x121519, 0x0f3b2e, 0xd8dce0],
    speed: 22,
    points: 420,
    hp: 2,
    armored: true,
    width: 2.38,
    length: 5.05,
    bodyHeight: 0.96,
    cabinHeight: 0.88,
    cabinLength: 2.85,
    cabinOffsetZ: -0.45,
    style: 'suv',
    minWave: 2,
    weight: 16,
  },
  {
    key: 'ferrari',
    nameFa: 'فراری F8 تریبوتو',
    shortFa: 'فراری F8',
    colors: [0xd9161f, 0xf2bf18],
    speed: 36,
    points: 380,
    hp: 1,
    armored: false,
    width: 2.24,
    length: 4.78,
    bodyHeight: 0.52,
    cabinHeight: 0.46,
    cabinLength: 1.85,
    cabinOffsetZ: -0.18,
    style: 'supercar',
    minWave: 2,
    weight: 14,
  },
  {
    key: 'lamborghini',
    nameFa: 'لامبورگینی اوراکان',
    shortFa: 'لامبورگینی',
    colors: [0x76e81c, 0xff620a, 0xffe014],
    speed: 39,
    points: 440,
    hp: 1,
    armored: false,
    width: 2.28,
    length: 4.82,
    bodyHeight: 0.49,
    cabinHeight: 0.44,
    cabinLength: 1.88,
    cabinOffsetZ: -0.1,
    style: 'wedge',
    minWave: 2,
    weight: 13,
  },
  {
    key: 'rolls',
    nameFa: 'رولز رویس فانتوم',
    shortFa: 'رولز رویس',
    colors: [0xc7a76c, 0x16141c, 0x3b1724],
    speed: 21,
    points: 560,
    hp: 2,
    armored: true,
    width: 2.36,
    length: 5.75,
    bodyHeight: 0.86,
    cabinHeight: 0.72,
    cabinLength: 2.65,
    cabinOffsetZ: -0.42,
    style: 'luxury',
    minWave: 3,
    weight: 10,
  },
  {
    key: 'bugatti',
    nameFa: 'بوگاتی شیرون',
    shortFa: 'بوگاتی شیرون',
    colors: [0x1152cc, 0x0b1a36],
    speed: 44,
    points: 750,
    hp: 1,
    armored: false,
    width: 2.32,
    length: 4.88,
    bodyHeight: 0.52,
    cabinHeight: 0.46,
    cabinLength: 1.92,
    cabinOffsetZ: -0.12,
    style: 'hypercar',
    minWave: 3,
    weight: 6,
  },
];

// Shared cached textures
const grilleTexCache = {};
let sharedWinIntact = null;
let sharedWinCracked = null;
let sharedWinShattered = null;
let sharedHeadlightGlow = null;
let sharedTaillightGlow = null;

function ensureCarTextures() {
  if (!sharedWinIntact) {
    sharedWinIntact = createWindshieldTexture('intact');
    sharedWinCracked = createWindshieldTexture('cracked');
    sharedWinShattered = createWindshieldTexture('shattered');
    sharedHeadlightGlow = createGlowTexture('#ffffff', '#d8f0ff', 'rgba(130, 200, 255, 0)');
    sharedTaillightGlow = createGlowTexture('#ff9988', '#ff1a1a', 'rgba(200, 0, 0, 0)');
  }
}

function getGrilleTex(key) {
  if (!grilleTexCache[key]) {
    grilleTexCache[key] = createBrandGrilleTexture(key);
  }
  return grilleTexCache[key];
}

export class LuxuryCar {
  constructor(spec, laneX, startZ, speedMultiplier = 1.0) {
    ensureCarTextures();
    this.spec = spec;
    this.laneX = laneX;
    this.targetLaneX = laneX;
    this.hp = spec.hp;
    this.maxHp = spec.hp;
    this.baseSpeed = spec.speed * speedMultiplier * (0.94 + Math.random() * 0.12);
    this.speed = this.baseSpeed;
    this.state = 'driving'; // 'driving' | 'swerving' | 'crashed'
    this.alive = true;
    this.escaped = false;
    this.hitByChain = false;
    this.guardrailSmashed = false;

    // Physics values for swerve / disable crash
    this.velX = 0;
    this.velZ = this.speed;
    this.velY = 0;
    this.yaw = 0;
    this.yawVel = 0;
    this.roll = 0;
    this.rollVel = 0;
    this.pitch = 0;
    this.swerveDir = 0;
    this.swerveTimer = 0;
    this.crashTimer = 0;
    this.wobbleTimer = 0;
    this.laneChangeCooldown = 1.4 + Math.random() * 2.8;
    this.fireEmitTimer = 0;
    this.tireSmokeTimer = 0;

    this.wheels = [];
    this.frontWheels = [];
    this.headlightSprites = [];

    this.group = new THREE.Group();
    this.group.position.set(laneX, 0, startZ);

    this._buildMesh();
  }

  _buildMesh() {
    const s = this.spec;
    const paintColor = s.colors[Math.floor(Math.random() * s.colors.length)];

    const paintMat = new THREE.MeshPhysicalMaterial({
      color: paintColor,
      metalness: 0.72,
      roughness: 0.18,
      clearcoat: 1.0,
      clearcoatRoughness: 0.08,
    });

    const darkTrimMat = new THREE.MeshStandardMaterial({
      color: 0x12141a,
      roughness: 0.55,
      metalness: 0.4,
    });

    const chromeMat = new THREE.MeshStandardMaterial({
      color: 0xe8eff8,
      metalness: 0.95,
      roughness: 0.12,
    });

    const wheelRadius = s.style === 'suv' ? 0.5 : 0.39;
    const groundClearance = s.style === 'suv' ? 0.38 : s.style === 'supercar' || s.style === 'wedge' || s.style === 'hypercar' ? 0.18 : 0.25;

    // 1. Main Lower Chassis Body
    const bodyGeo = new THREE.BoxGeometry(s.width, s.bodyHeight, s.length);
    const body = new THREE.Mesh(bodyGeo, paintMat);
    body.position.set(0, groundClearance + s.bodyHeight * 0.5, 0);
    body.castShadow = true;
    body.receiveShadow = true;
    this.group.add(body);
    this.bodyMesh = body;

    // Sloped sleek hood cap for sports/supercars
    const hoodLen = s.length * 0.36;
    const hoodY = groundClearance + s.bodyHeight;
    if (s.style !== 'suv') {
      const hoodGeo = new THREE.BoxGeometry(s.width * 0.94, 0.14, hoodLen);
      const hood = new THREE.Mesh(hoodGeo, paintMat);
      hood.position.set(0, hoodY - 0.02, s.length * 0.27);
      hood.rotation.x = s.style === 'wedge' || s.style === 'supercar' ? 0.16 : 0.08;
      this.group.add(hood);
    }

    // Front Bumper & Splitter
    const bumperGeo = new THREE.BoxGeometry(s.width * 1.02, 0.22, 0.36);
    const bumper = new THREE.Mesh(bumperGeo, darkTrimMat);
    bumper.position.set(0, groundClearance + 0.12, s.length * 0.5 - 0.06);
    this.group.add(bumper);

    // 2. Cabin / Greenhouse
    const cabinW = s.style === 'suv' ? s.width * 0.92 : s.width * 0.84;
    const cabinGeo = new THREE.BoxGeometry(cabinW, s.cabinHeight, s.cabinLength);
    const cabin = new THREE.Mesh(cabinGeo, paintMat);
    const cabinCenterY = hoodY + s.cabinHeight * 0.47;
    cabin.position.set(0, cabinCenterY, s.cabinOffsetZ);
    this.group.add(cabin);

    // Side tinted windows
    const sideGlassMat = new THREE.MeshPhysicalMaterial({
      color: 0x162b42,
      roughness: 0.1,
      metalness: 0.3,
      clearcoat: 1.0,
    });
    const sideWinGeo = new THREE.BoxGeometry(cabinW + 0.03, s.cabinHeight * 0.68, s.cabinLength * 0.78);
    const sideWin = new THREE.Mesh(sideWinGeo, sideGlassMat);
    sideWin.position.set(0, cabinCenterY + 0.03, s.cabinOffsetZ);
    this.group.add(sideWin);

    // 3. FRONT WINDSHIELD (The Iconic Primary Target!)
    // Angled sleek glass plane facing +Z (toward the player!)
    const rakeAngle =
      s.style === 'suv'
        ? -0.26
        : s.style === 'luxury'
          ? -0.44
          : s.style === 'wedge' || s.style === 'supercar' || s.style === 'hypercar'
            ? -0.82
            : -0.62;

    const wsHeight = s.cabinHeight / Math.cos(Math.abs(rakeAngle)) * 1.05;
    const wsWidth = cabinW * 0.94;
    const wsGeo = new THREE.PlaneGeometry(wsWidth, wsHeight);
    this.windshieldMat = new THREE.MeshPhysicalMaterial({
      map: sharedWinIntact,
      roughness: 0.08,
      metalness: 0.2,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
      emissive: new THREE.Color(0x183854),
      emissiveIntensity: 0.38,
      side: THREE.DoubleSide,
    });
    const windshield = new THREE.Mesh(wsGeo, this.windshieldMat);

    // Position windshield cleanly on the front slope of the cabin
    const wsFrontZ = s.cabinOffsetZ + s.cabinLength * 0.5 + Math.sin(Math.abs(rakeAngle)) * (wsHeight * 0.42);
    windshield.position.set(0, cabinCenterY + 0.02, wsFrontZ);
    windshield.rotation.x = rakeAngle;
    this.group.add(windshield);
    this.windshieldMesh = windshield;

    // Subtle chrome windshield trim border so player's eyes lock onto the windshield cleanly
    const frameTop = new THREE.Mesh(new THREE.BoxGeometry(wsWidth + 0.08, 0.06, 0.06), chromeMat);
    frameTop.position.set(0, hoodY + s.cabinHeight - 0.02, s.cabinOffsetZ + s.cabinLength * 0.5);
    this.group.add(frameTop);

    // Store local windshield target center for fast accurate hit detection
    this.windshieldLocalPos = new THREE.Vector3(0, cabinCenterY + 0.05, wsFrontZ + 0.12);
    this.windshieldRadius = Math.max(wsWidth, wsHeight) * 0.64;

    // 4. Brand Signature Front Grille + Emblems (facing +Z)
    const grilleW = s.style === 'luxury' ? s.width * 0.46 : s.width * 0.56;
    const grilleH = s.style === 'suv' || s.style === 'luxury' ? s.bodyHeight * 0.62 : s.bodyHeight * 0.48;
    const grilleGeo = new THREE.PlaneGeometry(grilleW, grilleH);
    const grilleMat = new THREE.MeshStandardMaterial({
      map: getGrilleTex(s.key),
      roughness: 0.25,
      metalness: 0.65,
    });
    const grille = new THREE.Mesh(grilleGeo, grilleMat);
    grille.position.set(0, groundClearance + s.bodyHeight * 0.48, s.length * 0.5 + 0.02);
    this.group.add(grille);

    // Upright hood ornament for Mercedes-Benz S-Class & Rolls-Royce Phantom!
    if (s.key === 'benz_s' || s.key === 'rolls') {
      const ornament = new THREE.Mesh(
        s.key === 'benz_s'
          ? new THREE.TorusGeometry(0.08, 0.018, 8, 16)
          : new THREE.ConeGeometry(0.06, 0.16, 6),
        s.key === 'rolls'
          ? new THREE.MeshStandardMaterial({ color: 0xf7d154, metalness: 0.95, roughness: 0.1 })
          : chromeMat
      );
      ornament.position.set(0, hoodY + 0.1, s.length * 0.46);
      this.group.add(ornament);
    }

    // Rear spoiler for sports/supercars
    if (s.style === 'supercar' || s.style === 'wedge' || s.style === 'sports' || s.style === 'hypercar') {
      const wing = new THREE.Mesh(new THREE.BoxGeometry(s.width * 0.92, 0.07, 0.34), darkTrimMat);
      wing.position.set(0, hoodY + 0.24, -s.length * 0.45);
      this.group.add(wing);
      const strutGeo = new THREE.BoxGeometry(0.08, 0.24, 0.14);
      [-0.55, 0.55].forEach((sx) => {
        const strut = new THREE.Mesh(strutGeo, darkTrimMat);
        strut.position.set(sx, hoodY + 0.12, -s.length * 0.45);
        this.group.add(strut);
      });
    }

    // Spare wheel on back for G-Class
    if (s.key === 'benz_g') {
      const spare = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.26, 18), darkTrimMat);
      spare.rotation.x = Math.PI / 2;
      spare.position.set(0, groundClearance + s.bodyHeight * 0.72, -s.length * 0.5 - 0.12);
      this.group.add(spare);
    }

    // 5. Glowing LED Headlights + Volumetric Glow Sprites
    const hlMat = new THREE.MeshBasicMaterial({ color: 0xeef9ff });
    const hlW = s.style === 'suv' ? 0.32 : 0.46;
    const hlH = s.style === 'suv' ? 0.32 : 0.16;
    const hlY = groundClearance + s.bodyHeight * 0.62;
    const hlX = s.width * 0.36;

    [-hlX, hlX].forEach((x) => {
      const hl = new THREE.Mesh(
        s.style === 'suv' || s.style === 'sports'
          ? new THREE.CylinderGeometry(0.16, 0.16, 0.08, 14)
          : new THREE.BoxGeometry(hlW, hlH, 0.08),
        hlMat
      );
      if (s.style === 'suv' || s.style === 'sports') hl.rotation.x = Math.PI / 2;
      hl.position.set(x, hlY, s.length * 0.5 + 0.01);
      this.group.add(hl);

      const glow = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: sharedHeadlightGlow,
          transparent: true,
          opacity: 0.75,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
      );
      glow.position.set(x, hlY, s.length * 0.5 + 0.18);
      glow.scale.set(1.5, 1.1, 1);
      this.group.add(glow);
      this.headlightSprites.push(glow);
    });

    // Taillights (red LED bar on rear)
    const tlMat = new THREE.MeshBasicMaterial({ color: 0xff2222 });
    const tlBar = new THREE.Mesh(new THREE.BoxGeometry(s.width * 0.84, 0.12, 0.08), tlMat);
    tlBar.position.set(0, groundClearance + s.bodyHeight * 0.64, -s.length * 0.5 - 0.01);
    this.group.add(tlBar);

    // Side Mirrors
    [-1, 1].forEach((dir) => {
      const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.12, 0.18), paintMat);
      mirror.position.set(dir * (s.width * 0.52), hoodY + 0.12, s.cabinOffsetZ + s.cabinLength * 0.42);
      this.group.add(mirror);
    });

    // 6. Spinning Alloy Wheels
    const tireGeo = new THREE.CylinderGeometry(wheelRadius, wheelRadius, 0.32, 18);
    tireGeo.rotateZ(Math.PI / 2);
    const rimGeo = new THREE.CylinderGeometry(wheelRadius * 0.62, wheelRadius * 0.62, 0.34, 12);
    rimGeo.rotateZ(Math.PI / 2);
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x111216, roughness: 0.85 });

    const wheelZ = s.length * 0.32;
    const wheelX = s.width * 0.47;
    const wheelCoords = [
      [-wheelX, wheelRadius, wheelZ, true],
      [wheelX, wheelRadius, wheelZ, true],
      [-wheelX, wheelRadius, -wheelZ, false],
      [wheelX, wheelRadius, -wheelZ, false],
    ];

    wheelCoords.forEach(([wx, wy, wz, isFront]) => {
      const wGroup = new THREE.Group();
      wGroup.position.set(wx, wy, wz);
      const tire = new THREE.Mesh(tireGeo, tireMat);
      const rim = new THREE.Mesh(rimGeo, chromeMat);
      wGroup.add(tire);
      wGroup.add(rim);
      this.group.add(wGroup);
      this.wheels.push(wGroup);
      if (isFront) this.frontWheels.push(wGroup);
    });

    // Armored badge indicator glow ring on top/front for 2-HP cars (G-Class & Rolls-Royce)
    if (s.armored) {
      const armorPip = new THREE.Mesh(
        new THREE.BoxGeometry(cabinW * 0.65, 0.06, 0.08),
        new THREE.MeshBasicMaterial({ color: 0x45d6ff })
      );
      armorPip.position.set(0, hoodY + s.cabinHeight + 0.04, s.cabinOffsetZ + s.cabinLength * 0.48);
      this.group.add(armorPip);
      this.armorBar = armorPip;
    }

    // Dynamic fire light (off until disabled)
    this.fireLight = new THREE.PointLight(0xff5500, 0, 14);
    this.fireLight.position.set(0, hoodY + 0.6, s.length * 0.15);
    this.group.add(this.fireLight);
  }

  getWindshieldWorldPos() {
    return this.windshieldLocalPos.clone().applyMatrix4(this.group.matrixWorld);
  }

  getCenterWorldPos() {
    return new THREE.Vector3(this.group.position.x, 1.0, this.group.position.z);
  }

  applyHit({ isWindshield, isCharged, impactX }) {
    if (this.state !== 'driving') return { result: 'already_disabled' };

    const damage = isCharged ? 2 : isWindshield ? 1 : 0.65;
    this.hp -= damage;

    if (this.hp <= 0.01) {
      // DISABLED! Shatter windshield & lose control off the road!
      this.windshieldMat.map = sharedWinShattered;
      this.windshieldMat.emissive.setHex(0xff4400);
      this.windshieldMat.emissiveIntensity = 1.25;
      this.windshieldMat.needsUpdate = true;

      if (this.armorBar) this.armorBar.visible = false;

      this.startSwerveOffRoad(impactX);
      return {
        result: isWindshield ? 'windshield_disable' : 'body_disable',
      };
    } else {
      // Partial hit (armored windshield cracked OR body hit on normal car)
      this.wobbleTimer = 0.55;
      this.speed = Math.max(this.baseSpeed * 0.68, this.speed * 0.78);
      if (isWindshield) {
        this.windshieldMat.map = sharedWinCracked;
        this.windshieldMat.emissive.setHex(0x8a3a18);
        this.windshieldMat.emissiveIntensity = 0.5;
        this.windshieldMat.needsUpdate = true;
      }
      if (this.armorBar) {
        this.armorBar.scale.x = Math.max(0.25, this.hp / this.maxHp);
        this.armorBar.material.color.setHex(0xff9922);
      }
      return {
        result: isWindshield ? 'armor_cracked' : 'body_hit',
      };
    }
  }

  startSwerveOffRoad(impactX = null) {
    if (this.state !== 'driving') return;
    this.state = 'swerving';
    this.swerveTimer = 0;

    // Pick swerve direction toward the nearer roadside guardrail so it dramatically flies off the highway!
    if (Math.abs(this.group.position.x) > 1.0) {
      this.swerveDir = this.group.position.x > 0 ? 1 : -1;
    } else if (impactX !== null) {
      this.swerveDir = impactX > this.group.position.x ? -1 : 1;
    } else {
      this.swerveDir = Math.random() > 0.5 ? 1 : -1;
    }

    this.velZ = Math.max(14, this.speed * 0.82);
    this.velX = this.swerveDir * (13.5 + Math.random() * 5.5);
    this.yawVel = this.swerveDir * (2.6 + Math.random() * 1.4);
    this.rollVel = -this.swerveDir * 1.1;

    // Turn front wheels violently
    this.frontWheels.forEach((w) => {
      w.rotation.y = this.swerveDir * 0.58;
    });

    // Flicker/dim one headlight for realistic damage
    if (this.headlightSprites[0]) {
      this.headlightSprites[0].material.opacity = 0.12;
    }
    this.fireLight.intensity = 4.5;
  }

  triggerChainCrash(fromDir) {
    if (this.state !== 'driving') return false;
    this.hitByChain = true;
    this.windshieldMat.map = sharedWinShattered;
    this.windshieldMat.emissive.setHex(0xff5500);
    this.windshieldMat.emissiveIntensity = 1.1;
    this.windshieldMat.needsUpdate = true;
    this.swerveDir = fromDir || (this.group.position.x >= 0 ? 1 : -1);
    this.startSwerveOffRoad();
    this.velX = this.swerveDir * 18;
    return true;
  }

  update(dt, particles, sound, roadHalfWidth, allLaneXs) {
    if (!this.alive) return;

    if (this.state === 'driving') {
      // Smooth forward motion
      this.group.position.z += this.speed * dt;

      // Occasional smart lane weaving on faster luxury cars (gives life to the highway)
      if (this.group.position.z < -35 && this.group.position.z > -135) {
        this.laneChangeCooldown -= dt;
        if (this.laneChangeCooldown <= 0) {
          this.laneChangeCooldown = 2.6 + Math.random() * 3.0;
          if (Math.random() < 0.35 && allLaneXs && allLaneXs.length) {
            const idx = allLaneXs.indexOf(this.targetLaneX);
            const candidates = [];
            if (idx > 0) candidates.push(allLaneXs[idx - 1]);
            if (idx >= 0 && idx < allLaneXs.length - 1) candidates.push(allLaneXs[idx + 1]);
            if (candidates.length > 0) {
              this.targetLaneX = candidates[Math.floor(Math.random() * candidates.length)];
            }
          }
        }
      }

      const dx = this.targetLaneX - this.group.position.x;
      if (Math.abs(dx) > 0.04) {
        const moveX = Math.sign(dx) * Math.min(Math.abs(dx), 4.6 * dt);
        this.group.position.x += moveX;
        this.group.rotation.y = THREE.MathUtils.lerp(this.group.rotation.y, Math.sign(dx) * 0.12, dt * 8);
      } else {
        this.group.rotation.y = THREE.MathUtils.lerp(this.group.rotation.y, 0, dt * 8);
      }

      // Impact wobble from non-fatal hit
      if (this.wobbleTimer > 0) {
        this.wobbleTimer -= dt;
        this.group.rotation.z = Math.sin(this.wobbleTimer * 32) * 0.14 * (this.wobbleTimer / 0.55);
        this.fireEmitTimer -= dt;
        if (this.fireEmitTimer <= 0) {
          this.fireEmitTimer = 0.08;
          particles.spawnTireSmoke(
            new THREE.Vector3(this.group.position.x, 1.1, this.group.position.z + this.spec.length * 0.25)
          );
        }
      } else {
        this.group.rotation.z = THREE.MathUtils.lerp(this.group.rotation.z, 0, dt * 10);
      }

      // Spin wheels
      const spin = this.speed * dt * 2.4;
      this.wheels.forEach((w) => {
        w.children[0].rotation.x += spin;
        w.children[1].rotation.x += spin;
      });

      // Check if escaped past the overpass under the camera!
      if (this.group.position.z > 13.5) {
        this.escaped = true;
        this.alive = false;
      }
    } else if (this.state === 'swerving') {
      this.swerveTimer += dt;

      // Accelerate lateral swerve off road & slow forward momentum
      this.velX += this.swerveDir * 10.5 * dt;
      this.velZ *= Math.pow(0.58, dt);

      this.group.position.x += this.velX * dt;
      this.group.position.z += this.velZ * dt;

      // Fishtail spin + dramatic tilt
      this.yaw += this.yawVel * dt;
      this.yawVel *= Math.pow(0.75, dt);
      this.roll = THREE.MathUtils.clamp(this.roll + this.rollVel * dt, -0.58, 0.58);

      this.group.rotation.y = this.yaw;
      this.group.rotation.z = this.roll;

      // Frantic damaged headlight flicker
      if (this.headlightSprites[1]) {
        this.headlightSprites[1].material.opacity = Math.sin(this.swerveTimer * 30) > 0 ? 0.85 : 0.12;
      }

      // Emit billowing tire smoke, asphalt skid marks & hood flames!
      this.tireSmokeTimer -= dt;
      if (this.tireSmokeTimer <= 0) {
        this.tireSmokeTimer = 0.045;
        particles.spawnTireSmoke(
          new THREE.Vector3(this.group.position.x, 0.25, this.group.position.z)
        );
        const sideOffset = this.spec.width * 0.42;
        const cosY = Math.cos(this.yaw);
        const sinY = Math.sin(this.yaw);
        particles.spawnSkidMark(
          new THREE.Vector3(this.group.position.x - sideOffset * cosY, 0, this.group.position.z + sideOffset * sinY),
          this.yaw
        );
        particles.spawnSkidMark(
          new THREE.Vector3(this.group.position.x + sideOffset * cosY, 0, this.group.position.z - sideOffset * sinY),
          this.yaw
        );
      }

      this.fireEmitTimer -= dt;
      if (this.fireEmitTimer <= 0) {
        this.fireEmitTimer = 0.055;
        const wsPos = this.getWindshieldWorldPos();
        particles.spawnEngineFire(wsPos);
      }

      // Flickering engine fire light
      this.fireLight.intensity = 3.8 + Math.sin(this.swerveTimer * 35) * 1.6;

      // Guardrail Smash when exiting the asphalt!
      if (!this.guardrailSmashed && Math.abs(this.group.position.x) > roadHalfWidth + 0.5) {
        this.guardrailSmashed = true;
        sound.playGuardrailCrash();
        const crashPos = new THREE.Vector3(
          Math.sign(this.group.position.x) * (roadHalfWidth + 0.6),
          1.1,
          this.group.position.z
        );
        particles.spawnMetalSparks(crashPos, 28);
        particles.spawnFireBurst(crashPos, 1.15);

        // Hop/vault slightly as it smashes past the guardrail onto the canyon shoulder
        this.velY = 5.4;
        this.rollVel = -this.swerveDir * 3.8;
        this.yawVel *= 1.4;
      }

      if (this.guardrailSmashed) {
        this.velY -= 19 * dt;
        this.group.position.y += this.velY * dt;
        if (this.group.position.y < 0.05) {
          this.group.position.y = 0.05;
          if (Math.abs(this.velY) > 2.0) {
            this.velY *= -0.32;
            particles.spawnMetalSparks(this.group.position.clone().add(new THREE.Vector3(0, 0.5, 0)), 12);
          } else {
            this.velY = 0;
          }
        }
      }

      // Transition to crashed wreck once far off-road or slow enough
      if (Math.abs(this.group.position.x) > roadHalfWidth + 5.8 || this.swerveTimer > 1.85) {
        this.state = 'crashed';
        this.crashTimer = 0;
      }
    } else if (this.state === 'crashed') {
      this.crashTimer += dt;
      this.velX *= Math.pow(0.12, dt);
      this.velZ *= Math.pow(0.15, dt);
      this.group.position.x += this.velX * dt;
      this.group.position.z += this.velZ * dt;

      if (this.group.position.y > 0.05) {
        this.velY -= 19 * dt;
        this.group.position.y = Math.max(0.05, this.group.position.y + this.velY * dt);
      }

      // Burning wreck flames & black smoke
      this.fireEmitTimer -= dt;
      if (this.fireEmitTimer <= 0 && this.crashTimer < 2.2) {
        this.fireEmitTimer = 0.09;
        particles.spawnEngineFire(
          new THREE.Vector3(this.group.position.x, this.group.position.y + 1.0, this.group.position.z)
        );
      }
      this.fireLight.intensity = Math.max(0, (3.2 - this.crashTimer * 1.1) + Math.sin(this.crashTimer * 28));

      // Shrink smoothly & remove after dramatic burn
      if (this.crashTimer > 2.3) {
        const shrink = Math.max(0.001, 1 - (this.crashTimer - 2.3) * 1.4);
        this.group.scale.setScalar(shrink);
        if (shrink <= 0.02) {
          this.alive = false;
        }
      }
    }
  }
}
