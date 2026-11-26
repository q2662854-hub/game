import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

/**
 * Builds the renderer, camera, lighting rig, ballroom and post-processing chain.
 */
export function createStage(canvas) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance'
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.85));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.02;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();

  // Deep salon backdrop: a soft vertical gradient with a warm pool behind the table.
  const bgCanvas = document.createElement('canvas');
  bgCanvas.width = 512;
  bgCanvas.height = 512;
  const bgCtx = bgCanvas.getContext('2d');
  const radial = bgCtx.createRadialGradient(256, 330, 30, 256, 330, 420);
  radial.addColorStop(0, '#123a2b');
  radial.addColorStop(0.35, '#0a1c17');
  radial.addColorStop(0.7, '#050d0b');
  radial.addColorStop(1, '#020505');
  bgCtx.fillStyle = radial;
  bgCtx.fillRect(0, 0, 512, 512);
  const vg = bgCtx.createLinearGradient(0, 0, 0, 512);
  vg.addColorStop(0, 'rgba(0,0,0,0.55)');
  vg.addColorStop(0.5, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.35)');
  bgCtx.fillStyle = vg;
  bgCtx.fillRect(0, 0, 512, 512);
  const bgTex = new THREE.CanvasTexture(bgCanvas);
  bgTex.colorSpace = THREE.SRGBColorSpace;
  scene.background = bgTex;
  scene.fog = new THREE.FogExp2(0x04100c, 0.048);

  const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.05, 90);
  camera.position.set(0, 2.05, 2.3);
  camera.lookAt(0, 0.8, 0);

  // -------------------------------------------------------------------------
  // Image based lighting: a neutral studio so the resin balls read as glossy.
  // -------------------------------------------------------------------------
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
  scene.environment = envRT.texture;
  scene.environmentIntensity = 0.34;
  pmrem.dispose();

  // -------------------------------------------------------------------------
  // Ballroom: a dark void with a warm pool of light over the table.
  // -------------------------------------------------------------------------
  const amb = new THREE.HemisphereLight(0x8fb6ff, 0x0d0805, 0.32);
  scene.add(amb);

  const spot = new THREE.SpotLight(0xfff2dc, 30, 14, Math.PI * 0.25, 0.62, 2.0);
  spot.position.set(0.1, 4.9, 0.45);
  spot.target.position.set(0, 0.8, 0);
  spot.castShadow = true;
  spot.shadow.mapSize.set(2048, 2048);
  spot.shadow.camera.near = 1.2;
  spot.shadow.camera.far = 9;
  spot.shadow.bias = -0.0006;
  spot.shadow.normalBias = 0.015;
  spot.shadow.radius = 2.5;
  scene.add(spot);
  scene.add(spot.target);

  const fill = new THREE.DirectionalLight(0x7fb0ff, 0.4);
  fill.position.set(-3.4, 3.0, -2.4);
  scene.add(fill);

  const rim = new THREE.DirectionalLight(0xffb066, 0.22);
  rim.position.set(3.2, 2.0, 2.8);
  scene.add(rim);

  // Two soft accents that graze the rail from the sides.
  const accentA = new THREE.PointLight(0xff7a3c, 1.1, 5.5, 2);
  accentA.position.set(-2.6, 1.9, -2.0);
  scene.add(accentA);
  const accentB = new THREE.PointLight(0x3cc8ff, 0.9, 5.5, 2);
  accentB.position.set(2.6, 1.9, 2.0);
  scene.add(accentB);

  // -------------------------------------------------------------------------
  // Floor + backdrop
  // -------------------------------------------------------------------------
  const floorGeo = new THREE.CircleGeometry(18, 64);
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x080a0d,
    roughness: 0.22,
    metalness: 0.72,
    envMapIntensity: 0.28
  });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.02;
  floor.receiveShadow = true;
  scene.add(floor);

  // Glowing inlay ring drawn on the floor.
  const ringGeo = new THREE.RingGeometry(2.45, 2.475, 128);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xffa552,
    transparent: true,
    opacity: 0.22,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.002;
  scene.add(ring);

  const ring2 = new THREE.Mesh(
    new THREE.RingGeometry(3.35, 3.365, 128),
    new THREE.MeshBasicMaterial({
      color: 0x3cc8ff,
      transparent: true,
      opacity: 0.1,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  ring2.rotation.x = -Math.PI / 2;
  ring2.position.y = 0.002;
  scene.add(ring2);

  // -------------------------------------------------------------------------
  // Post processing: subtle bloom sells the lights and the cloth sheen.
  // -------------------------------------------------------------------------
  const composer = new EffectComposer(renderer);
  composer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  composer.setSize(window.innerWidth, window.innerHeight);
  const renderPass = new RenderPass(scene, camera);
  const bloom = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.24,
    0.58,
    0.9
  );
  const output = new OutputPass();
  composer.addPass(renderPass);
  composer.addPass(bloom);
  composer.addPass(output);

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / h;
    // Pull the camera back a little on tall screens so the whole table fits.
    camera.fov = h > w ? 52 : 42;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.85));
    renderer.setSize(w, h, false);
    composer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    composer.setSize(w, h);
    bloom.resolution.set(w, h);
  }

  window.addEventListener('resize', resize);
  resize();

  return {
    renderer,
    scene,
    camera,
    composer,
    bloom,
    lights: { spot, fill, rim, accentA, accentB, amb },
    floor,
    ring,
    ring2
  };
}
