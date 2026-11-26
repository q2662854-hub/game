import * as THREE from 'three';
import {
  PLAY_W,
  PLAY_L,
  CLOTH_Y,
  RAIL_W,
  RAIL_TOP,
  CUSHION_H,
  CUSHION_DEPTH,
  CORNER_GAP,
  MIDDLE_GAP,
  POCKETS,
  BALL_R
} from './constants.js';
import {
  makeClothTexture,
  makeClothBump,
  makeWoodTexture,
  makeWoodRough,
  makeDiamondTexture
} from './textures.js';

const HALF_W = PLAY_W / 2;
const HALF_L = PLAY_L / 2;

function roundedRectShape(w, h, r) {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

/**
 * Builds the outline used by the cloth and the rail ring.
 *
 * Coordinates are shape space (x, y) where y maps to world -z, so the pocket
 * positions are mirrored in z. Each pocket is a circular arc; the straight
 * cushion lines run tangent-ish between the arc ends. With `grow` > 0 the
 * contour is inflated by that many metres (used to carve the wooden rail's
 * opening slightly wider than the cloth) while the pocket circles shrink by
 * the same amount — keeping the mouth boundaries perfectly parallel.
 */
/**
 * Walks the playing-boundary outline (world XZ) clockwise starting at the
 * right-hand cushion near the head corner. Each pocket contributes an arc that
 * bites into the cloth, exactly like the mouth of a real pocket.
 */
const C = {
  pocketR: POCKETS[0].r,
  pitchA: 0.03,
  sideR: POCKETS[4].r,
  sideB: 0.055
};

function outlinePoints(hw, hl) {
  const pts = [];
  const corner = (sx, sz) => {
    const cx = sx * (hw + C.pitchA);
    const cz = sz * (hl + C.pitchA);
    const r = C.pocketR;
    const a = { x: sx * hw, z: sz * (hl - CORNER_GAP) };
    const b = { x: sx * (hw - CORNER_GAP), z: sz * hl };
    const via = Math.atan2(-sz, -sx);
    arcThrough(cx, cz, r, a, b, via, 20, pts);
  };
  const side = (sz) => {
    const cz = sz * (hl + C.sideB);
    const r = C.sideR;
    const a = { x: MIDDLE_GAP, z: sz * hl };
    const b = { x: -MIDDLE_GAP, z: sz * hl };
    const via = Math.atan2(-sz, 0);
    arcThrough(0, cz, r, a, b, via, 20, pts);
  };

  // Head-right corner -> down the right cushion -> foot-right corner
  corner(1, 1);
  pts.push({ x: hw, z: hl - CORNER_GAP });
  pts.push({ x: hw, z: -(hl - CORNER_GAP) });
  corner(1, -1);
  // Along the foot rail to the side pocket
  pts.push({ x: hw - CORNER_GAP, z: -hl });
  pts.push({ x: MIDDLE_GAP, z: -hl });
  side(-1);
  pts.push({ x: -(hw - CORNER_GAP), z: -hl });
  corner(-1, -1);
  pts.push({ x: -hw, z: -(hl - CORNER_GAP) });
  pts.push({ x: -hw, z: hl - CORNER_GAP });
  corner(-1, 1);
  pts.push({ x: -(hw - CORNER_GAP), z: hl });
  pts.push({ x: -MIDDLE_GAP, z: hl });
  side(1);
  pts.push({ x: hw - CORNER_GAP, z: hl });
  return pts;
}

function arcThrough(cx, cz, r, a, b, viaAngle, steps, out) {
  const a0 = Math.atan2(a.z - cz, a.x - cx);
  const a1 = Math.atan2(b.z - cz, b.x - cx);
  const norm = (v) => {
    let x = v;
    while (x <= -Math.PI) x += Math.PI * 2;
    while (x > Math.PI) x -= Math.PI * 2;
    return x;
  };
  let d = norm(a1 - a0);
  const viaRel = norm(viaAngle - a0);
  const inside = d >= 0 ? viaRel >= 0 && viaRel <= d : viaRel <= 0 && viaRel >= d;
  if (!inside) d += d >= 0 ? -Math.PI * 2 : Math.PI * 2;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const ang = a0 + d * t;
    out.push({ x: cx + Math.cos(ang) * r, z: cz + Math.sin(ang) * r });
  }
}

function outlineShape(grow = 0) {
  const pts = outlinePoints(PLAY_W / 2 + grow, PLAY_L / 2 + grow);
  const shape = new THREE.Shape();
  // Shape space mirrors Z so that ExtrudeGeometry's rotation lands correctly.
  shape.moveTo(pts[0].x, -pts[0].z);
  for (let i = 1; i < pts.length; i++) shape.lineTo(pts[i].x, -pts[i].z);
  shape.closePath();
  return shape;
}

function extrudePlan(shape, depth, bevel = 0.004) {
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 2,
    curveSegments: 30,
    steps: 1
  });
  geo.rotateX(-Math.PI / 2);
  geo.computeVertexNormals();
  return geo;
}

/** Cushion cross-section: low nose, angled nose, then the beveled top. */
function cushionProfile(depth) {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.lineTo(0.005, 0.014);
  s.lineTo(0.014, 0.0275);
  s.lineTo(0.026, 0.0345);
  s.lineTo(0.044, CUSHION_H);
  s.lineTo(depth, CUSHION_H);
  s.lineTo(depth, 0);
  s.closePath();
  return s;
}

export function buildTable(renderer, { quality = 'high' } = {}) {
  const group = new THREE.Group();
  const clock = { t: 0 };

  const clothTex = makeClothTexture(renderer, '#0a6647');
  const clothBump = makeClothBump(renderer);
  const woodTex = makeWoodTexture(renderer, '#2c1308', '#7c3a1b');
  const woodRough = makeWoodRough(renderer);
  woodTex.repeat.set(0.5, 0.5);
  woodRough.repeat.set(0.5, 0.5);

  const chrome = new THREE.MeshStandardMaterial({
    color: 0xdfe4ea,
    metalness: 1,
    roughness: 0.12,
    envMapIntensity: 1.5
  });

  const woodMat = new THREE.MeshPhysicalMaterial({
    map: woodTex,
    roughnessMap: woodRough,
    roughness: 0.46,
    metalness: 0.04,
    clearcoat: 1,
    clearcoatRoughness: 0.1,
    envMapIntensity: 1.0
  });

  // -------------------------------------------------------------------------
  // Cloth (a true hole for every pocket)
  // -------------------------------------------------------------------------
  const clothShape = outlineShape(0);
  const clothGeo = new THREE.ShapeGeometry(clothShape, 30);
  clothGeo.rotateX(-Math.PI / 2);
  const uvAttr = clothGeo.attributes.uv;
  for (let i = 0; i < uvAttr.count; i++) {
    uvAttr.setXY(i, uvAttr.getX(i) * 0.95, uvAttr.getY(i) * 0.95);
  }
  const clothMat = new THREE.MeshPhysicalMaterial({
    map: clothTex,
    bumpMap: clothBump,
    bumpScale: 0.45,
    color: 0xd8ffe9,
    roughness: 0.99,
    metalness: 0,
    sheen: 0.18,
    sheenRoughness: 0.78,
    sheenColor: new THREE.Color(0x6fe3b4),
    envMapIntensity: 0.4
  });
  const cloth = new THREE.Mesh(clothGeo, clothMat);
  cloth.position.y = CLOTH_Y;
  cloth.receiveShadow = true;
  group.add(cloth);

  // Deep, dark tray below the cloth: looking into a pocket shows darkness.
  const tray = new THREE.Mesh(
    new THREE.BoxGeometry(PLAY_W + RAIL_W * 2 - 0.02, 0.03, PLAY_L + RAIL_W * 2 - 0.02),
    new THREE.MeshStandardMaterial({ color: 0x05070a, roughness: 0.99 })
  );
  tray.position.y = CLOTH_Y - 0.19;
  tray.visible = false;
  group.add(tray);

  // -------------------------------------------------------------------------
  // Rail ring (wood, with the mouth openings carved wider than the cloth)
  // -------------------------------------------------------------------------
  const railShape = roundedRectShape(PLAY_W + RAIL_W * 2, PLAY_L + RAIL_W * 2, 0.1);
  // The rail's opening is exactly the cloth outline, so the pocket mouths form
  // wooden jaws all the way down.
  railShape.holes = [outlineShape(0)];
  const railGeo = extrudePlan(railShape, 0.046, 0.006);
  const rail = new THREE.Mesh(railGeo, woodMat);
  rail.position.y = RAIL_TOP - 0.052;
  rail.castShadow = true;
  rail.receiveShadow = true;
  group.add(rail);

  // -------------------------------------------------------------------------
  // Cushions
  // -------------------------------------------------------------------------
  const cushionMat = new THREE.MeshPhysicalMaterial({
    map: clothTex,
    color: 0x0e8a60,
    roughness: 0.8,
    metalness: 0,
    sheen: 0.65,
    sheenRoughness: 0.66,
    sheenColor: new THREE.Color(0x8bf5cc),
    envMapIntensity: 0.5
  });

  function addCushion(side, from, to) {
    const len = Math.abs(to - from);
    const prof = cushionProfile(CUSHION_DEPTH);
    const geo = new THREE.ExtrudeGeometry(prof, { depth: len, bevelEnabled: false, steps: 1, curveSegments: 2 });
    geo.translate(0, 0, -len / 2);
    const mesh = new THREE.Mesh(geo, cushionMat);
    const mid = (from + to) / 2;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    if (side === '+x') mesh.position.set(HALF_W, CLOTH_Y, mid);
    else if (side === '-x') {
      mesh.position.set(-HALF_W, CLOTH_Y, mid);
      mesh.rotation.y = Math.PI;
    } else if (side === '+z') {
      mesh.position.set(mid, CLOTH_Y, HALF_L);
      mesh.rotation.y = -Math.PI / 2;
    } else {
      mesh.position.set(mid, CLOTH_Y, -HALF_L);
      mesh.rotation.y = Math.PI / 2;
    }
    group.add(mesh);
    return mesh;
  }

  const endLong = HALF_L - CORNER_GAP;
  addCushion('+x', -endLong, -MIDDLE_GAP);
  addCushion('+x', MIDDLE_GAP, endLong);
  addCushion('-x', -endLong, -MIDDLE_GAP);
  addCushion('-x', MIDDLE_GAP, endLong);
  const endShort = HALF_W - CORNER_GAP;
  addCushion('+z', -endShort, endShort);
  addCushion('-z', -endShort, endShort);

  // Brass inlay ribbon across the top of each cushion.
  const inlayMat = new THREE.MeshStandardMaterial({
    color: 0xd9a765,
    metalness: 1,
    roughness: 0.28,
    envMapIntensity: 1.3
  });
  const inlayY = CLOTH_Y + CUSHION_H + 0.0022;
  function addInlay(x, z, len, horiz) {
    const g = new THREE.BoxGeometry(horiz ? len : 0.0105, 0.0045, horiz ? 0.0105 : len);
    const m = new THREE.Mesh(g, inlayMat);
    m.position.set(x, inlayY, z);
    group.add(m);
  }
  const inset = 0.052;
  addInlay(HALF_W + inset, 0, 2 * endLong - 2 * MIDDLE_GAP - 0.16, false);
  addInlay(-HALF_W - inset, 0, 2 * endLong - 2 * MIDDLE_GAP - 0.16, false);
  addInlay(0, HALF_L + inset, 2 * endShort - 0.16, true);
  addInlay(0, -HALF_L - inset, 2 * endShort - 0.16, true);

  // -------------------------------------------------------------------------
  // Pockets: cup, chrome lip, glow
  // -------------------------------------------------------------------------
  const pocketGroup = new THREE.Group();
  group.add(pocketGroup);
  const pocketGlows = [];
  const pocketCenters = [];

  POCKETS.forEach((p, idx) => {
    const cx = p.corner ? p.x - Math.sign(p.x) * C.pitchA : p.x;
    const cz = p.corner ? p.z - Math.sign(p.z) * C.pitchA : p.z - C.sideB + 0.006;
    pocketCenters.push({ x: cx, z: cz, r: p.r });

    const cupMat = new THREE.MeshStandardMaterial({
      color: 0x0d0d10,
      roughness: 0.45,
      metalness: 0.6,
      side: THREE.DoubleSide
    });
    const cupR = p.r * 0.98;
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(cupR, cupR * 0.72, 0.46, 36, 1, true), cupMat);
    cup.position.set(cx, CLOTH_Y - 0.23, cz);
    pocketGroup.add(cup);

    const bottom = new THREE.Mesh(
      new THREE.CircleGeometry(cupR * 0.72, 28),
      new THREE.MeshStandardMaterial({ color: 0x020204, roughness: 1 })
    );
    bottom.rotation.x = -Math.PI / 2;
    bottom.position.set(cx, CLOTH_Y - 0.455, cz);
    pocketGroup.add(bottom);

    const lip = new THREE.Mesh(new THREE.TorusGeometry(p.r + 0.002, 0.0085, 14, 64), chrome);
    lip.rotation.x = Math.PI / 2;
    lip.position.set(cx, CLOTH_Y - 0.004, cz);
    lip.castShadow = true;
    pocketGroup.add(lip);

    // Amber light pooling in the pocket mouth (flashes when a ball drops).
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xffb066,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const glow = new THREE.Mesh(new THREE.CircleGeometry(p.r * 0.96, 30), glowMat);
    glow.rotation.x = -Math.PI / 2;
    glow.position.set(cx, CLOTH_Y - 0.045, cz);
    pocketGroup.add(glow);
    pocketGlows[idx] = glow;
  });

  // -------------------------------------------------------------------------
  // Body, chrome band, legs
  // -------------------------------------------------------------------------
  const bodyW = PLAY_W + RAIL_W * 2 + 0.03;
  const bodyL = PLAY_L + RAIL_W * 2 + 0.03;
  // The body is a FRAME (the play area is cut out) so it never covers the cloth.
  const bodyShape = roundedRectShape(bodyW, bodyL, 0.12);
  bodyShape.holes = [outlineShape(0)];
  const bodyGeo = extrudePlan(bodyShape, 0.21, 0.012);
  const body = new THREE.Mesh(bodyGeo, woodMat);
  body.position.y = RAIL_TOP - 0.052 - 0.21;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  const bandShape = roundedRectShape(bodyW + 0.008, bodyL + 0.008, 0.122);
  bandShape.holes = [roundedRectShape(bodyW - 0.035, bodyL - 0.035, 0.1)];
  const band = new THREE.Mesh(extrudePlan(bandShape, 0.018, 0.002), chrome);
  band.position.y = RAIL_TOP - 0.052 - 0.088;
  band.castShadow = true;
  group.add(band);

  const lower = new THREE.Mesh(extrudePlan(roundedRectShape(bodyW - 0.05, bodyL - 0.05, 0.09), 0.1, 0.01), woodMat);
  lower.position.y = RAIL_TOP - 0.052 - 0.325;
  lower.castShadow = true;
  group.add(lower);

  const legMat = new THREE.MeshStandardMaterial({ color: 0x0d0e12, metalness: 0.9, roughness: 0.3, envMapIntensity: 1.1 });
  const footMat = new THREE.MeshStandardMaterial({ color: 0x2b2f36, metalness: 0.95, roughness: 0.2 });
  const legX = bodyW / 2 - 0.16;
  const legZ = bodyL / 2 - 0.16;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.048, 0.44, 22), legMat);
      leg.position.set(sx * legX, 0.22, sz * legZ);
      leg.castShadow = true;
      leg.receiveShadow = true;
      group.add(leg);

      const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.02, 22), chrome);
      collar.position.set(sx * legX, 0.418, sz * legZ);
      group.add(collar);

      const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.054, 0.06, 0.024, 22), footMat);
      foot.position.set(sx * legX, 0.012, sz * legZ);
      foot.castShadow = true;
      group.add(foot);
    }
  }

  const stretcherA = new THREE.Mesh(new THREE.BoxGeometry(bodyW - 0.34, 0.05, 0.065), legMat);
  stretcherA.position.set(0, 0.16, 0);
  group.add(stretcherA);
  const stretcherB = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.05, bodyL - 0.34), legMat);
  stretcherB.position.set(0, 0.16, 0);
  group.add(stretcherB);

  // -------------------------------------------------------------------------
  // Rail sights + brand plate
  // -------------------------------------------------------------------------
  const diamondTex = makeDiamondTexture();
  const diamondMat = new THREE.MeshBasicMaterial({
    map: diamondTex,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    color: 0xffd9a8,
    opacity: 0.9
  });
  const sightY = RAIL_TOP + 0.0028;
  const sightGeo = new THREE.PlaneGeometry(0.03, 0.03);
  sightGeo.rotateX(-Math.PI / 2);
  const sightOffset = RAIL_W * 0.62;
  const addSight = (x, z) => {
    const m = new THREE.Mesh(sightGeo, diamondMat);
    m.position.set(x, sightY, z);
    group.add(m);
  };
  for (let i = 1; i <= 6; i++) {
    const z = -HALF_L + (PLAY_L * i) / 7;
    if (Math.abs(z) < MIDDLE_GAP + 0.03) continue;
    addSight(HALF_W + sightOffset, z);
    addSight(-HALF_W - sightOffset, z);
  }
  for (let i = 1; i <= 3; i++) {
    const x = -HALF_W + (PLAY_W * i) / 4;
    addSight(x, HALF_L + sightOffset);
    addSight(x, -HALF_L - sightOffset);
  }

  // Small brass name plate on the head rail.
  const plateCanvas = document.createElement('canvas');
  plateCanvas.width = 512;
  plateCanvas.height = 128;
  const pctx = plateCanvas.getContext('2d');
  pctx.font = '700 46px "Trebuchet MS", Arial, sans-serif';
  pctx.textAlign = 'center';
  pctx.textBaseline = 'middle';
  pctx.fillStyle = '#e8cfa0';
  pctx.shadowColor = 'rgba(255,200,130,0.9)';
  pctx.shadowBlur = 16;
  pctx.fillText('MAISON  BILLARD', 256, 66);
  const plateTex = new THREE.CanvasTexture(plateCanvas);
  plateTex.colorSpace = THREE.SRGBColorSpace;
  const plate = new THREE.Mesh(
    new THREE.PlaneGeometry(0.44, 0.11),
    new THREE.MeshBasicMaterial({ map: plateTex, transparent: true, depthWrite: false, opacity: 0.9 })
  );
  plate.position.set(0, RAIL_TOP - 0.056, HALF_L + RAIL_W / 2 + 0.004);
  plate.rotation.y = Math.PI;
  group.add(plate);

  function flashPocket(index) {
    const glow = pocketGlows[index];
    if (glow) glow.material.opacity = 0.85;
  }

  function update(dt) {
    clock.t += dt;
    for (const glow of pocketGlows) {
      if (glow.material.opacity > 0.001) {
        glow.material.opacity = Math.max(0, glow.material.opacity - dt * 1.5);
      }
    }
    clothMat.bumpScale = 0.45 + Math.sin(clock.t * 0.7) * 0.03;
  }

  return { group, cloth, rail, woodMat, chrome, pocketGlows, pocketCenters, flashPocket, update };
}
