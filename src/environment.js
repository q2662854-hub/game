import * as THREE from 'three';
import { createGlowTexture, createMagmaStoneTextures, createRoadTexture } from './textures.js';

export const ROAD_WIDTH = 18;
export const ROAD_HALF_WIDTH = ROAD_WIDTH / 2; // 9
export const LANE_XS = [-6.3, -2.1, 2.1, 6.3];

export function buildEnvironment(scene) {
  // Atmospheric twilight sunset fog
  scene.fog = new THREE.FogExp2(0x1b1226, 0.0052);

  // 1. Sunset Twilight Sky Dome (Canvas Gradient)
  const skyCanvas = document.createElement('canvas');
  skyCanvas.width = 512;
  skyCanvas.height = 512;
  const sCtx = skyCanvas.getContext('2d');
  const grad = sCtx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0.0, '#070918');
  grad.addColorStop(0.28, '#161130');
  grad.addColorStop(0.46, '#3a183f');
  grad.addColorStop(0.56, '#8f273c');
  grad.addColorStop(0.63, '#e8682c');
  grad.addColorStop(0.69, '#ffbe55');
  grad.addColorStop(0.75, '#2b1824');
  grad.addColorStop(1.0, '#0f0c14');
  sCtx.fillStyle = grad;
  sCtx.fillRect(0, 0, 512, 512);

  // Subtle twilight stars in upper sky
  for (let i = 0; i < 160; i++) {
    const sx = Math.random() * 512;
    const sy = Math.random() * 210;
    const a = 0.25 + Math.random() * 0.7;
    sCtx.fillStyle = `rgba(255, 248, 235, ${a})`;
    sCtx.fillRect(sx, sy, 1.5, 1.5);
  }

  const skyTex = new THREE.CanvasTexture(skyCanvas);
  skyTex.colorSpace = THREE.SRGBColorSpace;
  const skyDome = new THREE.Mesh(
    new THREE.SphereGeometry(320, 32, 24),
    new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false })
  );
  scene.add(skyDome);

  // Glowing sunset sun orb on the horizon
  const sunGlowTex = createGlowTexture('#fff8d4', '#ff7b24', 'rgba(255, 60, 10, 0)');
  const sunSprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: sunGlowTex,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      fog: false,
      depthWrite: false,
    })
  );
  sunSprite.position.set(0, 26, -240);
  sunSprite.scale.set(95, 95, 1);
  scene.add(sunSprite);

  // 2. Lighting Setup (Dramatic Sunset + Overhead Streetlamp Clarity)
  const hemi = new THREE.HemisphereLight(0xffb480, 0x241c38, 1.15);
  scene.add(hemi);

  const sunLight = new THREE.DirectionalLight(0xffa060, 2.0);
  sunLight.position.set(16, 38, -80);
  scene.add(sunLight);

  // Front fill light so windshields & luxury grilles sparkle brightly toward the player
  const frontFill = new THREE.DirectionalLight(0xa8d4ff, 1.35);
  frontFill.position.set(-10, 24, 42);
  scene.add(frontFill);

  // 3. 4-Lane Luxury Highway Asphalt
  const roadTex = createRoadTexture();
  const roadLen = 280;
  const roadGeo = new THREE.PlaneGeometry(ROAD_WIDTH, roadLen);
  roadGeo.rotateX(-Math.PI / 2);
  const roadMat = new THREE.MeshStandardMaterial({
    map: roadTex,
    roughness: 0.42,
    metalness: 0.22,
  });
  const road = new THREE.Mesh(roadGeo, roadMat);
  road.position.set(0, 0, -90);
  road.receiveShadow = true;
  scene.add(road);

  // 4. Rocky Mountain Canyon Shoulders (where disabled cars swerve off & crash!)
  const terrainMat = new THREE.MeshStandardMaterial({
    color: 0x261d22,
    roughness: 0.92,
    metalness: 0.05,
  });
  const groundGeo = new THREE.PlaneGeometry(240, roadLen + 40);
  groundGeo.rotateX(-Math.PI / 2);
  const ground = new THREE.Mesh(groundGeo, terrainMat);
  ground.position.set(0, -0.06, -90);
  scene.add(ground);

  // 5. Metallic Guardrails + Reflector Posts on Both Edges
  const railMat = new THREE.MeshStandardMaterial({
    color: 0x9aa4b4,
    metalness: 0.78,
    roughness: 0.3,
  });
  const postMat = new THREE.MeshStandardMaterial({
    color: 0x454c58,
    metalness: 0.6,
    roughness: 0.5,
  });
  const reflectorMat = new THREE.MeshBasicMaterial({ color: 0xff4c1e });

  [-1, 1].forEach((side) => {
    const railX = side * (ROAD_HALF_WIDTH + 0.65);
    // Horizontal steel beam
    const beam = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.34, roadLen), railMat);
    beam.position.set(railX, 0.72, -90);
    scene.add(beam);

    // Posts & reflectors
    for (let z = 20; z >= -210; z -= 8) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.9, 0.16), postMat);
      post.position.set(railX + side * 0.08, 0.45, z);
      scene.add(post);

      const ref = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.18), reflectorMat);
      ref.position.set(railX - side * 0.1, 0.75, z);
      scene.add(ref);
    }
  });

  // 6. Highway Streetlamps with Warm Glowing Bulbs
  const lampGlowTex = createGlowTexture('#fff5d6', '#ffaa38', 'rgba(255, 120, 20, 0)');
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x2c303a, metalness: 0.7, roughness: 0.4 });
  const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffe4a8 });

  for (let z = 6; z >= -185; z -= 26) {
    [-1, 1].forEach((side) => {
      const px = side * (ROAD_HALF_WIDTH + 1.8);
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.17, 9.2, 8), poleMat);
      pole.position.set(px, 4.6, z);
      scene.add(pole);

      const arm = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.14, 0.14), poleMat);
      arm.position.set(px - side * 1.2, 9.1, z);
      scene.add(arm);

      const bulb = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.12, 0.32), bulbMat);
      bulb.position.set(px - side * 2.2, 8.98, z);
      scene.add(bulb);

      const halo = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: lampGlowTex,
          transparent: true,
          opacity: 0.65,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
      );
      halo.position.set(px - side * 2.2, 8.85, z);
      halo.scale.set(5.2, 5.2, 1);
      scene.add(halo);
    });
  }

  // 7. Dramatic Canyon Cliffs, Rocks & Distant Mountain Range
  const cliffMat = new THREE.MeshStandardMaterial({
    color: 0x231724,
    roughness: 0.95,
    flatShading: true,
  });

  const mountainMat = new THREE.MeshStandardMaterial({
    color: 0x191022,
    roughness: 1.0,
    flatShading: true,
  });

  // Flanking roadside hills & boulders (kept safely beyond crash shoulder x > 18)
  for (let i = 0; i < 42; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const z = 12 - i * 5.2 + (Math.random() - 0.5) * 4;
    const x = side * (22 + Math.random() * 28);
    const radius = 5 + Math.random() * 11;
    const height = 8 + Math.random() * 22;

    const rock = new THREE.Mesh(new THREE.ConeGeometry(radius, height, 6), cliffMat);
    rock.position.set(x, height * 0.42 - 1, z);
    rock.rotation.y = Math.random() * Math.PI;
    scene.add(rock);
  }

  // Distant horizon mountain peaks framing the sunset
  const peakPositions = [
    [-95, -210, 52, 68],
    [-48, -225, 42, 55],
    [52, -225, 46, 62],
    [98, -210, 56, 74],
    [-140, -190, 58, 76],
    [142, -190, 62, 78],
  ];
  peakPositions.forEach(([mx, mz, mr, mh]) => {
    const peak = new THREE.Mesh(new THREE.ConeGeometry(mr, mh, 7), mountainMat);
    peak.position.set(mx, mh * 0.46, mz);
    peak.rotation.y = Math.random() * Math.PI;
    scene.add(peak);
  });

  // Scattered roadside boulders along the shoulder
  const boulderGeo = new THREE.DodecahedronGeometry(1.1, 0);
  const boulderMat = new THREE.MeshStandardMaterial({ color: 0x35282c, roughness: 0.9, flatShading: true });
  for (let i = 0; i < 36; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const b = new THREE.Mesh(boulderGeo, boulderMat);
    const sc = 0.5 + Math.random() * 1.4;
    b.scale.set(sc * 1.3, sc * 0.85, sc);
    b.position.set(side * (12.8 + Math.random() * 9), sc * 0.35, 10 - Math.random() * 170);
    b.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
    scene.add(b);
  }

  // 8. Foreground Overpass Parapet + Ready-to-Throw Fiery Magma Stone
  const magmaTex = createMagmaStoneTextures();
  const heldStoneGeo = new THREE.DodecahedronGeometry(0.55, 1);
  // Slightly craggy rock deformation
  const posAttr = heldStoneGeo.attributes.position;
  for (let i = 0; i < posAttr.count; i++) {
    const vx = posAttr.getX(i);
    const vy = posAttr.getY(i);
    const vz = posAttr.getZ(i);
    const n = 0.86 + (Math.sin(vx * 7 + vy * 5) * Math.cos(vz * 6)) * 0.16;
    posAttr.setXYZ(i, vx * n, vy * n, vz * n);
  }
  heldStoneGeo.computeVertexNormals();

  const heldStoneMat = new THREE.MeshStandardMaterial({
    map: magmaTex.map,
    emissive: new THREE.Color(0xff5e00),
    emissiveMap: magmaTex.emissiveMap,
    emissiveIntensity: 2.2,
    roughness: 0.65,
    metalness: 0.15,
  });

  const heldStoneGroup = new THREE.Group();
  const heldStoneMesh = new THREE.Mesh(heldStoneGeo, heldStoneMat);
  heldStoneGroup.add(heldStoneMesh);

  const stoneGlow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: createGlowTexture('#fff8cc', '#ff6400', 'rgba(255, 30, 0, 0)'),
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  stoneGlow.scale.set(2.4, 2.4, 1);
  heldStoneGroup.add(stoneGlow);

  const heldLight = new THREE.PointLight(0xff6b1a, 4.5, 12);
  heldStoneGroup.add(heldLight);

  heldStoneGroup.position.set(0, 6.25, 15.7);
  scene.add(heldStoneGroup);

  // Subtle stone overpass parapet ledge visible along bottom edge
  const ledgeMat = new THREE.MeshStandardMaterial({ color: 0x26222d, roughness: 0.85 });
  const ledge = new THREE.Mesh(new THREE.BoxGeometry(18, 0.75, 1.4), ledgeMat);
  ledge.position.set(0, 5.25, 15.9);
  scene.add(ledge);

  return {
    magmaTex,
    stoneGeo: heldStoneGeo,
    heldStoneGroup,
    heldStoneMesh,
    heldStoneMat,
    stoneGlow,
    heldLight,
  };
}
