// ─────────────────────────────────────────────────────────────
//  صحنه‌ی سه‌بعدی — دوربین سینمایی، بلوم، ستاره‌ها، صفحه‌ی شیشه‌ای
// ─────────────────────────────────────────────────────────────
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { BOARD_SPAN, BOARD_SIZE, CELL_SIZE, styleFor } from './tiles.js';
import { Tile, radialTexture, worldX, worldZ, TILE_H } from './tile.js';
import { ParticleSystem, Shockwaves, LightPillar, DustField } from './fx.js';

export class GameScene {
  constructor(canvas) {
    this.canvas = canvas;
    this.tiles = new Map();
    this.time = 0;
    this.shake = 0;
    this.orbit = 0;
    this.orbitAuto = true;
    this.pointer = { x: 0, y: 0 };
    this.pointerSmooth = { x: 0, y: 0 };
    this.intro = 0;
    this.accentFlash = 0;
    this.heroMode = true;
    this.heroT = 1;
    this.heroLook = new THREE.Vector3(0, 0, 0);
    this.paused = false;

    this.initRenderer();
    this.initScene();
    this.initCamera();
    this.initBoard();
    this.initPostFX();
    this.initEvents();
  }

  // ── رندرر ─────────────────────────────────────────────────
  initRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
  }

  initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#04020b');
    this.scene.fog = new THREE.FogExp2('#060310', 0.03);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const envScene = new RoomEnvironment();
    this.envRT = pmrem.fromScene(envScene, 0.03);
    this.scene.environment = this.envRT.texture;
    this.scene.environmentIntensity = 0.25;
    pmrem.dispose();
    envScene.traverse?.((o) => o.material?.dispose?.());

    // نورها
    this.scene.add(new THREE.HemisphereLight('#9db4ff', '#150a2a', 0.5));

    const key = new THREE.DirectionalLight('#dfe6ff', 1.15);
    key.position.set(5.5, 13, 7.5);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 38;
    key.shadow.camera.left = -7.5;
    key.shadow.camera.right = 7.5;
    key.shadow.camera.top = 7.5;
    key.shadow.camera.bottom = -7.5;
    key.shadow.bias = -0.0006;
    key.shadow.normalBias = 0.025;
    key.shadow.radius = 3;
    this.scene.add(key);

    const pink = new THREE.DirectionalLight('#ff5ec4', 0.42);
    pink.position.set(-9, 6, -5);
    this.scene.add(pink);

    const cyan = new THREE.DirectionalLight('#2ef2e0', 0.3);
    cyan.position.set(2, 3, -10);
    this.scene.add(cyan);

    this.accentLight = new THREE.PointLight('#ffe14d', 5, 18, 2);
    this.accentLight.position.set(0, 5, 0);
    this.scene.add(this.accentLight);

    // ستاره‌ها
    this.stars = this.makeStars(1300);
    this.scene.add(this.stars);

    // هاله‌های رنگی پس‌زمینه (بدون تأثیر مه)
    this.backGlows = [];
    const glowSprite = (color, pos, scale, opacity) => {
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(1, 1),
        new THREE.MeshBasicMaterial({
          map: radialTexture(),
          color: new THREE.Color(color),
          transparent: true,
          opacity,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          depthTest: false,
          toneMapped: false,
          fog: false,
        })
      );
      m.position.copy(pos);
      m.scale.setScalar(scale);
      m.lookAt(0, 2, 0);
      m.renderOrder = -10;
      this.scene.add(m);
      this.backGlows.push(m);
      return m;
    };
    glowSprite('#00e2d0', new THREE.Vector3(30, 14, -48), 100, 0.14);
    glowSprite('#ff4fa8', new THREE.Vector3(-6, 4, -48), 90, 0.12);

    // پرده‌ی سحابی (شیدر نویز)
    this.nebula = new THREE.Mesh(
      new THREE.PlaneGeometry(52, 28),
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        depthTest: false,
        blending: THREE.AdditiveBlending,
        fog: false,
        uniforms: { uTime: { value: 0 } },
        vertexShader: /* glsl */ `
          varying vec2 vUv;
          void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
        `,
        fragmentShader: /* glsl */ `
          varying vec2 vUv;
          uniform float uTime;
          float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
          float noise(vec2 p){
            vec2 i = floor(p), f = fract(p);
            vec2 u = f * f * (3.0 - 2.0 * f);
            return mix(mix(hash(i), hash(i + vec2(1,0)), u.x),
                       mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), u.x), u.y);
          }
          void main() {
            vec2 uv = vUv;
            float n = noise(uv * vec2(6.0, 3.0) + uTime * 0.02);
            float n2 = noise(uv * vec2(11.0, 5.0) - uTime * 0.03);
            float glow = smoothstep(0.28, 1.0, n * 0.7 + n2 * 0.5);
            float edge = smoothstep(0.0, 0.34, uv.x) * smoothstep(1.0, 0.66, uv.x)
                       * smoothstep(0.0, 0.38, uv.y) * smoothstep(1.0, 0.62, uv.y);
            vec3 c1 = vec3(0.30, 0.22, 0.9);
            vec3 c2 = vec3(0.10, 0.85, 0.8);
            vec3 c3 = vec3(0.95, 0.32, 0.72);
            vec3 col = mix(c1, c2, smoothstep(0.2, 0.8, uv.y));
            col = mix(col, c3, smoothstep(0.55, 1.0, n2) * 0.6);
            gl_FragColor = vec4(col, glow * edge * 0.5);
          }
        `,
      })
    );
    this.nebula.position.set(0, 7, -18);
    this.nebula.renderOrder = -9;
    this.scene.add(this.nebula);

    // FX
    this.particles = new ParticleSystem(this.scene, 1700);
    this.shockwaves = new Shockwaves(this.scene);
    this.pillar = new LightPillar(this.scene);
    this.dust = new DustField(this.scene, 340);
  }

  makeStars(count) {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const c = new THREE.Color();
    for (let i = 0; i < count; i++) {
      const r = 36 + Math.random() * 30;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(THREE.MathUtils.randFloatSpread(1.1));
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = Math.abs(r * Math.cos(phi)) * 0.62 + 1.5;
      pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
      const roll = Math.random();
      if (roll < 0.55) c.set('#b6c4ff');
      else if (roll < 0.8) c.set('#ffb8ec');
      else c.set('#a8fff4');
      const b = 0.45 + Math.random() * 0.55;
      col[i * 3] = c.r * b;
      col[i * 3 + 1] = c.g * b;
      col[i * 3 + 2] = c.b * b;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const mat = new THREE.PointsMaterial({
      size: 0.3,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      map: radialTexture(),
    });
    const pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false;
    return pts;
  }

  // ── دوربین ────────────────────────────────────────────────
  initCamera() {
    this.camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.1, 220);
    this.cameraBase = new THREE.Vector3(0, 10.2, 11.4);
    this.cameraLook = new THREE.Vector3(0, 0.2, -0.25);
    this.camera.position.set(0, 17, 17.5);
    this.fitCamera();
    this.camera.lookAt(this.baseLook);
  }

  fitCamera() {
    const aspect = window.innerWidth / window.innerHeight;
    if (aspect < 0.85) {
      this.cameraBase.set(0, 15.2, 14.6);
      this.baseLook = new THREE.Vector3(0, -0.25, 0.15);
      this.camera.fov = 46;
      this.heroShift = 0;
    } else if (aspect < 1.25) {
      this.cameraBase.set(0, 10.4, 11);
      this.baseLook = new THREE.Vector3(0, 0.05, -0.1);
      this.camera.fov = 42;
      this.heroShift = aspect > 1.1 ? -0.9 : 0;
    } else {
      this.cameraBase.set(0, 7.7, 8.7);
      this.baseLook = new THREE.Vector3(0, 0.05, -0.1);
      this.camera.fov = 39;
      this.heroShift = -1.55;
    }
    if (!this.heroMode) this.heroT = 0;
    this.cameraLook.copy(this.baseLook);
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  // ── صفحه ──────────────────────────────────────────────────
  initBoard() {
    this.boardGroup = new THREE.Group();
    this.scene.add(this.boardGroup);

    const pad = 0.24;
    const size = BOARD_SPAN + pad * 2;
    const h = 0.55;

    // بدنه
    const bodyMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#16122e'),
      metalness: 0.45,
      roughness: 0.42,
      clearcoat: 1,
      clearcoatRoughness: 0.08,
      envMapIntensity: 0.32,
    });
    const body = new THREE.Mesh(new THREE.BoxGeometry(size, h, size), bodyMat);
    body.position.y = -h / 2;
    body.castShadow = true;
    body.receiveShadow = true;
    this.boardGroup.add(body);

    // نوار نئونی دور صفحه
    const rimMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#7a6bff'),
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    });
    // قاب نئونی (چهار میله‌ی باریک، نه یک سطح)
    const rimGeoX = new THREE.BoxGeometry(size + 0.06, 0.05, 0.05);
    const rimGeoZ = new THREE.BoxGeometry(0.05, 0.05, size + 0.06);
    const rimGroup = new THREE.Group();
    const half = size / 2;
    for (const zSign of [-1, 1]) {
      const bar = new THREE.Mesh(rimGeoX, rimMat);
      bar.position.set(0, 0.01, zSign * half);
      rimGroup.add(bar);
    }
    for (const xSign of [-1, 1]) {
      const bar = new THREE.Mesh(rimGeoZ, rimMat);
      bar.position.set(xSign * half, 0.01, 0);
      rimGroup.add(bar);
    }
    this.boardGroup.add(rimGroup);
    this.rimMat = rimMat;

    // سطح داخلی
    const innerMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#0b0920'),
      metalness: 0.2,
      roughness: 0.75,
      emissive: new THREE.Color('#120d33'),
      emissiveIntensity: 0.35,
      envMapIntensity: 0.15,
    });
    const inner = new THREE.Mesh(new THREE.PlaneGeometry(BOARD_SPAN, BOARD_SPAN), innerMat);
    inner.rotation.x = -Math.PI / 2;
    inner.position.y = 0.002;
    inner.receiveShadow = true;
    this.boardGroup.add(inner);
    this.innerMat = innerMat;

    // بافت سطح: مربع‌های روشن‌تر پشت هر خانه (صفحه‌ی بازی خوانا باشد)
    const cellTex = boardCellTexture(4);
    this.boardCellMat = new THREE.MeshStandardMaterial({
      map: cellTex,
      roughness: 0.62,
      metalness: 0.25,
      emissive: new THREE.Color('#4a3ec2'),
      emissiveIntensity: 0.14,
      emissiveMap: cellTex,
      envMapIntensity: 0.12,
    });
    const cellsPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(size, size),
      this.boardCellMat
    );
    cellsPlane.rotation.x = -Math.PI / 2;
    cellsPlane.position.y = 0.004;
    cellsPlane.receiveShadow = true;
    this.boardGroup.add(cellsPlane);

    // هاله‌ی نرم هر خانه
    this.slotGlows = [];
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const x = worldX(c);
        const z = worldZ(r);
        const haloMat = new THREE.MeshBasicMaterial({
          map: radialTexture(),
          color: new THREE.Color('#636dff'),
          transparent: true,
          opacity: 0.05,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        const halo = new THREE.Mesh(new THREE.PlaneGeometry(1.72, 1.72), haloMat);
        halo.rotation.x = -Math.PI / 2;
        halo.position.set(x, 0.006, z);
        this.boardGroup.add(halo);
        this.slotGlows.push(halo);
      }
    }

    // زمین: آینه‌ی تیره (بازتاب زنده‌ی صفحه و بلوک‌ها)
    const mirror = new Reflector(new THREE.CircleGeometry(46, 96), {
      color: new THREE.Color('#1b1838'),
      textureWidth: Math.min(1024, window.innerWidth),
      textureHeight: Math.min(1024, window.innerHeight),
      clipBias: 0.003,
    });
    mirror.rotation.x = -Math.PI / 2;
    mirror.position.y = -2.12;
    this.scene.add(mirror);
    this.mirror = mirror;

    // پرده‌ی محوکننده‌ی لبه‌ی زمین (شعاعی)
    const veilMat = new THREE.MeshBasicMaterial({
      map: floorFadeTexture(),
      color: new THREE.Color('#05030e'),
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
    });
    const veil = new THREE.Mesh(new THREE.CircleGeometry(47, 96), veilMat);
    veil.rotation.x = -Math.PI / 2;
    veil.position.y = -2.1;
    this.scene.add(veil);

    const grid = new THREE.GridHelper(60, 60, 0x1d1a42, 0x0c0a22);
    grid.position.y = -2.08;
    grid.material.transparent = true;
    grid.material.opacity = 0.4;
    this.scene.add(grid);

    // مخروط نور سینمایی
    this.spotCone = new THREE.Mesh(
      new THREE.CylinderGeometry(1.4, 7.6, 10, 64, 12, true),
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        uniforms: { uColor: { value: new THREE.Color('#8f9cff') } },
        vertexShader: /* glsl */ `
          varying vec2 vUv;
          varying vec3 vPos;
          void main() {
            vUv = uv;
            vPos = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          varying vec2 vUv;
          uniform vec3 uColor;
          void main() {
            // uv.y: 0 پایین، 1 بالا
            float vertical = smoothstep(0.0, 0.85, vUv.y) * smoothstep(1.0, 0.55, vUv.y);
            float rim = pow(1.0 - abs(vUv.x - 0.5) * 2.0, 2.2);
            gl_FragColor = vec4(uColor, vertical * rim * 0.05 + 0.006);
          }
        `,
      })
    );
    this.spotCone.position.y = 4.9;
    this.scene.add(this.spotCone);

    // هاله زیر صفحه
    const glowMat = new THREE.MeshBasicMaterial({
      map: radialTexture(),
      color: new THREE.Color('#5c5cff'),
      transparent: true,
      opacity: 0.22,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.underGlow = new THREE.Mesh(new THREE.PlaneGeometry(size * 2.8, size * 2.8), glowMat);
    this.underGlow.rotation.x = -Math.PI / 2;
    this.underGlow.position.y = -2.05;
    this.scene.add(this.underGlow);
  }

  // ── پست‌پروسسینگ ───────────────────────────────────────────
  initPostFX() {
    this.composer = new EffectComposer(this.renderer);
    this.composer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    this.composer.setSize(window.innerWidth, window.innerHeight);

    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.42,
      0.55,
      0.86
    );
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
  }

  // ── رویدادها ──────────────────────────────────────────────
  initEvents() {
    this._onResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      this.renderer.setSize(w, h);
      this.composer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
      this.composer.setSize(w, h);
      if (this.mirror) this.mirror.getRenderTarget().setSize(
        Math.min(1024, w), Math.min(1024, h)
      );
      this.fitCamera();
    };
    window.addEventListener('resize', this._onResize);
    window.addEventListener('pointermove', (e) => {
      this.pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
    });
  }

  // چیدمان نمایشی برای صفحه‌ی شروع
  showDemoBoard() {
    this.clearDemoBoard();
    const demo = [
      [0, 0, 1024], [1, 0, 4], [2, 0, 128], [3, 0, 2],
      [0, 1, 64], [1, 1, 256], [2, 1, 8], [3, 1, 32],
      [0, 2, 2], [1, 2, 512], [2, 2, 16], [3, 2, 4],
      [0, 3, 128], [1, 3, 8], [2, 3, 2048], [3, 3, 256],
    ];
    this.demoTiles = [];
    let uid = -1;
    for (const [col, row, value] of demo) {
      const t = this.createTile({ uid: uid--, value, col, row }, { pop: false });
      t.group.scale.setScalar(0.92);
      t.seed = Math.random() * 100;
      this.demoTiles.push(t);
    }
  }

  clearDemoBoard() {
    if (!this.demoTiles) return;
    for (const t of this.demoTiles) {
      this.boardGroup.remove(t.group);
      t.dispose();
      this.tiles.delete(t.uid);
    }
    this.demoTiles = null;
  }

  setHeroMode(on) {
    this.heroMode = on;
    if (!on) this.heroT = Math.min(this.heroT, 1);
  }

  toggleOrbit() {
    this.orbitAuto = !this.orbitAuto;
    return this.orbitAuto;
  }

  setPaused(p) {
    this.paused = p;
  }

  // ── مدیریت بلوک‌ها ────────────────────────────────────────
  createTile(tileData, { pop = true } = {}) {
    const tile = new Tile(tileData.value, tileData.col, tileData.row);
    tile.uid = tileData.uid;
    if (pop) {
      tile.spawnT = 0.001;
      tile.group.scale.setScalar(0.001);
    }
    this.tiles.set(tileData.uid, tile);
    this.boardGroup.add(tile.group);
    return tile;
  }

  // ساخت/حذف بلوک‌ها بر اساس وضعیت فعلی مدل (برای شروع/undo)
  sync(game, { pop = false } = {}) {
    const present = new Set();
    for (const t of game.cells()) {
      present.add(t.uid);
      let tile = this.tiles.get(t.uid);
      if (!tile) {
        tile = this.createTile(t, { pop });
      } else {
        tile.setValue(t.value);
        tile.snapTo(t.col, t.row);
      }
    }
    for (const [uid, tile] of [...this.tiles]) {
      if (uid < 0) continue; // بلوک‌های نمایشی
      if (!present.has(uid)) {
        this.boardGroup.remove(tile.group);
        tile.dispose();
        this.tiles.delete(uid);
      }
    }
  }

  /** تایمرهای متعلق به آخرین حرکت؛ با حرکت جدید لغو می‌شوند */
  after(ms, fn) {
    const id = setTimeout(() => {
      this._timers = (this._timers || []).filter((t) => t !== id);
      fn();
    }, ms);
    (this._timers ||= []).push(id);
    return id;
  }

  clearTimers() {
    for (const id of this._timers || []) clearTimeout(id);
    this._timers = [];
  }

  /** تطبیق کامل صحنه با مدل — تضمین می‌کند هرگز بلوک اضافه/کم نماند */
  reconcile(game) {
    const present = new Set(game.cells().map((t) => t.uid));
    for (const [uid, tile] of [...this.tiles]) {
      if (uid < 0) continue; // بلوک‌های دمو
      if (!present.has(uid)) {
        this.boardGroup.remove(tile.group);
        tile.dispose();
        this.tiles.delete(uid);
      }
    }
    for (const t of game.cells()) {
      let tile = this.tiles.get(t.uid);
      if (!tile) {
        tile = this.createTile(t, { pop: false });
        tile.group.scale.setScalar(1);
      }
      tile.setValue(t.value);
      tile.snapTo(t.col, t.row);
      tile.group.scale.setScalar(1);
      tile.rotation ||= 0;
      tile.group.rotation.y = 0;
      tile.dying = false;
      tile.spawnT = 1;
      tile.bump = 0;
      if (tile.face) tile.face.visible = true;
      tile.bodyMat.opacity = 1;
      tile.faceMat.opacity = 1;
    }
  }

  playMove(result, game) {
    // حرکت جدید: هر چیزی از حرکت قبلی منقضی شده است
    this.clearTimers();
    for (const [uid, tile] of [...this.tiles]) {
      if (tile.dying) {
        this.boardGroup.remove(tile.group);
        tile.dispose();
        this.tiles.delete(uid);
      }
    }

    // 1) اسلاید همه بلوک‌های درگیر + رد نور
    for (const s of result.slides) {
      const tile = this.tiles.get(s.uid);
      if (!tile) continue;
      tile.slideTo(s.toCol, s.toRow, 0.15, 0);
      if (s.fromCol !== s.toCol || s.fromRow !== s.toRow) {
        this.particles.emit(
          new THREE.Vector3(worldX(s.fromCol), 0.16, worldZ(s.fromRow)),
          {
            count: 3,
            color: styleFor(tile.value).glow,
            speed: [0.05, 0.4],
            size: [0.05, 0.14],
            life: [0.2, 0.45],
            gravity: 0.4,
            upward: 0.25,
            drag: 3,
          }
        );
      }
    }

    // 2) ادغام‌ها، سپس تولد بلوک تازه
    this.after(150, () => {
      if (!game) return;
      for (const m of result.merges) {
        const removed = this.tiles.get(m.removedUid);
        if (removed) {
          removed.snapTo(m.col, m.row);
          removed.startDeath();
        }
        const survivor = this.tiles.get(m.survivorUid);
        if (survivor) {
          survivor.setValue(m.value);
          survivor.bumpOnce();
        }
        this.mergeFx(m.col, m.row, m.value);
      }
      if (result.spawned) this.createTile(result.spawned, { pop: true });
    });

    // 3) برابرسازی نهایی پس از انیمیشن‌ها
    this.after(520, () => {
      if (!game) return;
      this.reconcile(game);
    });
  }

  undoTo(game) {
    // حذف بلوک‌هایی که نباید باشند و اصلاح وضعیت
    this.clearTimers();
    this.reconcile(game);
    for (const t of game.cells()) {
      const tile = this.tiles.get(t.uid);
      if (tile) {
        tile.snapTo(t.col, t.row);
        tile.bumpOnce();
        this.shockwaves.spawn(new THREE.Vector3(worldX(t.col), 0.02, worldZ(t.row)), {
          color: styleFor(t.value).glow,
          maxRadius: 0.7,
          duration: 0.45,
          opacity: 0.3,
        });
      }
    }
  }

  // ── جلوه‌ها ───────────────────────────────────────────────
  mergeFx(col, row, value) {
    const style = styleFor(value);
    const level = Math.log2(value);
    const isBig = level >= 11;
    const p = new THREE.Vector3(worldX(col), TILE_H * 0.55, worldZ(row));

    this.particles.emit(p, {
      count: Math.round(14 + Math.min(44, level * 3)),
      color: style.glow,
      speed: [0.9, isBig ? 5 : 3.1],
      size: [0.09, isBig ? 0.5 : 0.32],
      life: [0.45, isBig ? 1.5 : 1],
      gravity: -1.3,
      upward: isBig ? 2.2 : 1,
    });
    this.particles.emit(p, {
      count: Math.round(5 + Math.min(18, level * 1.5)),
      color: '#ffffff',
      speed: [0.25, 1.4],
      size: [0.05, 0.18],
      life: [0.22, 0.55],
      gravity: 0.3,
      upward: 0.4,
    });

    if (level >= 6) {
      this.shockwaves.spawn(p, {
        color: style.glow,
        maxRadius: isBig ? 3.2 : 1.1 + level * 0.05,
        duration: isBig ? 0.9 : 0.5,
        opacity: isBig ? 0.6 : 0.22,
        y: 0.02,
      });
    }

    if (level >= 10) {
      this.pillar.burst(p, style.glow);
      this.shake = Math.min(1, (level - 9) * 0.24);
      this.shockwaves.spawn(p, { color: '#ffffff', maxRadius: 4.4, duration: 1.05, opacity: 0.3, y: 0.025 });
    } else if (level >= 8) {
      this.shake = Math.max(this.shake, 0.14);
    }

    this.accentLight.color.set(style.glow);
    this.accentFlash = 1;
  }

  milestoneFx() {
    const palette = ['#ffe14d', '#ff5ec4', '#2ef2e0', '#b06bff', '#ffffff', '#4fc3ff'];
    for (let i = 0; i < 30; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 0.8 + Math.random() * 5;
      this.particles.emit(
        new THREE.Vector3(Math.cos(a) * r, 0.4 + Math.random() * 3.4, Math.sin(a) * r),
        {
          count: 6,
          color: palette[i % palette.length],
          speed: [0.6, 2.6],
          size: [0.1, 0.4],
          life: [1, 2.2],
          gravity: -0.5,
          upward: 1.5,
        }
      );
    }
    this.accentLight.color.set('#ffffff');
    this.shake = 0.28;
    this.accentFlash = 1.2;
  }

  spawnFx(tileData) {
    const style = styleFor(tileData.value);
    this.shockwaves.spawn(new THREE.Vector3(worldX(tileData.col), 0.02, worldZ(tileData.row)), {
      color: style.glow,
      maxRadius: 0.7,
      duration: 0.45,
      opacity: 0.22,
    });
    this.particles.emit(new THREE.Vector3(worldX(tileData.col), 0.3, worldZ(tileData.row)), {
      count: 9,
      color: style.glow,
      speed: [0.25, 1],
      size: [0.05, 0.16],
      life: [0.25, 0.55],
      gravity: 0.2,
      upward: 0.5,
    });
  }

  // ── حلقه رندر ────────────────────────────────────────────
  update(dt, time) {
    this.time = time;

    for (const [uid, tile] of [...this.tiles]) {
      const dead = tile.update(dt, time);
      if (dead) {
        this.boardGroup.remove(tile.group);
        tile.dispose();
        this.tiles.delete(uid);
      }
    }

    // دوربین
    const loop = (time * 0.05) % (Math.PI * 2);
    const targetOrbit = this.orbitAuto ? Math.sin(loop) * 0.13 : this.orbit;
    this.orbit += (targetOrbit - this.orbit) * Math.min(1, dt * 2);

    this.pointerSmooth.x += (this.pointer.x - this.pointerSmooth.x) * Math.min(1, dt * 1.2);
    this.pointerSmooth.y += (this.pointer.y - this.pointerSmooth.y) * Math.min(1, dt * 1.2);

    this.intro = Math.min(1, this.intro + dt * 0.45);
    const introEase = 1 - Math.pow(1 - this.intro, 3);

    const radius = Math.hypot(this.cameraBase.x, this.cameraBase.z);
    const ang = Math.atan2(this.cameraBase.x, this.cameraBase.z) + this.orbit;

    this.shake = Math.max(0, this.shake - dt * 2.6);
    const bob = Math.sin(time * 0.45) * 0.22;
    const sx = (Math.random() - 0.5) * this.shake * 0.25;
    const sz = (Math.random() - 0.5) * this.shake * 0.25;

    const tx = Math.sin(ang) * radius + this.pointerSmooth.x * 0.45 + sx;
    const tz = Math.cos(ang) * radius - this.pointerSmooth.y * 0.5 + sz;
    const ty = this.cameraBase.y + bob - this.pointerSmooth.y * 0.35;

    const k = Math.min(1, dt * (this.intro < 1 ? 3.2 : 5.5));
    this.camera.position.x += (tx - this.camera.position.x) * k;
    this.camera.position.y += (ty - this.camera.position.y) * k;
    this.camera.position.z += (tz - this.camera.position.z) * k;

    // حالت نمایشی شروع: صفحه به سمت چپ کادر می‌رود
    const heroTarget = this.heroMode ? 1 : 0;
    this.heroT += (heroTarget - this.heroT) * Math.min(1, dt * 1.9);
    const e = this.heroT * this.heroT * (3 - 2 * this.heroT);
    const hx = (this.heroShift ?? 0) * e;
    const hy = -0.3 * e;
    this.heroLook.set(hx, hy, 0);

    this.cameraLook.x += (this.baseLook.x + hx - this.cameraLook.x) * Math.min(1, dt * 1.8);
    this.cameraLook.y += (this.baseLook.y + hy - this.cameraLook.y) * Math.min(1, dt * 1.8);
    this.cameraLook.z += (this.baseLook.z - this.cameraLook.z) * Math.min(1, dt * 1.8);
    this.camera.lookAt(this.cameraLook);

    // نور
    this.accentFlash = Math.max(0, this.accentFlash - dt * 2);
    this.accentLight.intensity = 4 + this.accentFlash * 22;
    this.accentLight.position.y = 5 + Math.sin(time * 0.7) * 0.3;

    // FX
    this.particles.update(dt);
    this.shockwaves.update(dt);
    this.pillar.update(dt);
    this.dust.update(dt, time);

    this.stars.rotation.y = time * 0.005;
    if (this.nebula) this.nebula.material.uniforms.uTime.value = time;
    this.underGlow.material.opacity = 0.18 + Math.sin(time * 0.7) * 0.04;
    this.rimMat.color.setHSL(0.68 + Math.sin(time * 0.15) * 0.05, 0.78, 0.55);

    this.slotGlows.forEach((h, i) => {
      h.material.opacity = 0.03 + Math.sin(time * 1.1 + i * 0.7) * 0.015;
    });

    this.bloom.strength = 0.42 + Math.sin(time * 0.85) * 0.04 + this.accentFlash * 0.22;

    // نگاه بهانه‌ی ورود
    if (this.introActive !== false) this.introActive = true;

    this.composer.render();
  }
}

// ── بافت هاله‌ی افق ─────────────────────────────────────────
let _horizonTex = null;
function horizonTexture() {
  if (_horizonTex) return _horizonTex;
  const N = 1024;
  const c = document.createElement('canvas');
  c.width = c.height = N;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(N / 2, N / 2, 0, N / 2, N / 2, N / 2);
  g.addColorStop(0.0, 'rgba(90,80,255,0)');
  g.addColorStop(0.26, 'rgba(110,90,255,0.05)');
  g.addColorStop(0.34, 'rgba(140,110,255,0.42)');
  g.addColorStop(0.42, 'rgba(255,94,196,0.20)');
  g.addColorStop(0.52, 'rgba(46,242,224,0.10)');
  g.addColorStop(0.72, 'rgba(30,20,80,0.02)');
  g.addColorStop(1.0, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, N, N);
  _horizonTex = new THREE.CanvasTexture(c);
  _horizonTex.colorSpace = THREE.SRGBColorSpace;
  return _horizonTex;
}

// ── بافت خانه‌های صفحه ──────────────────────────────────────
function boardCellTexture(n) {
  const N = 512;
  const c = document.createElement('canvas');
  c.width = c.height = N;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, N, N);
  // پس‌زمینه‌ی تیره‌ی کل صفحه
  const bg = ctx.createLinearGradient(0, 0, N, N);
  bg.addColorStop(0, 'rgba(24,20,50,1)');
  bg.addColorStop(0.5, 'rgba(13,11,30,1)');
  bg.addColorStop(1, 'rgba(8,6,20,1)');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, N, N);

  const inset = N * 0.036;             // حاشیه‌ی لبه‌ی صفحه
  const pad = (N - inset * 2) / n;
  const gap = pad * 0.085;
  for (let r = 0; r < n; r++) {
    for (let col = 0; col < n; col++) {
      const x = inset + col * pad + gap;
      const y = inset + r * pad + gap;
      const w = pad - gap * 2;
      const rr = pad * 0.11;
      roundRect(ctx, x, y, w, w, rr);
      const g = ctx.createLinearGradient(x, y, x + w, y + w);
      g.addColorStop(0, 'rgba(46,40,96,1)');
      g.addColorStop(0.5, 'rgba(30,26,68,1)');
      g.addColorStop(1, 'rgba(20,17,48,1)');
      ctx.fillStyle = g;
      ctx.fill();
      ctx.strokeStyle = 'rgba(130,142,255,0.17)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// ── بافت محو‌شدن زمین ───────────────────────────────────────
let _floorFade = null;
function floorFadeTexture() {
  if (_floorFade) return _floorFade;
  const N = 512;
  const c = document.createElement('canvas');
  c.width = c.height = N;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(N / 2, N / 2, 0, N / 2, N / 2, N / 2);
  g.addColorStop(0, 'rgba(255,255,255,0)');
  g.addColorStop(0.34, 'rgba(255,255,255,0)');
  g.addColorStop(0.62, 'rgba(255,255,255,0.55)');
  g.addColorStop(0.86, 'rgba(255,255,255,0.95)');
  g.addColorStop(1, 'rgba(255,255,255,1)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, N, N);
  _floorFade = new THREE.CanvasTexture(c);
  _floorFade.colorSpace = THREE.SRGBColorSpace;
  return _floorFade;
}
