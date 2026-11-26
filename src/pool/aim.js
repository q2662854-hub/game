import * as THREE from 'three';
import { BALL_R, CLOTH_Y } from './constants.js';

/**
 * Visual aiming aids: dashed guide line along the cue-ball path, the ghost
 * ball at the contact point, and the predicted object-ball direction.
 */
export function createAim(scene) {
  const group = new THREE.Group();
  scene.add(group);

  const dashCount = 90;
  const dashGeo = new THREE.BufferGeometry();
  const positions = new Float32Array(dashCount * 2 * 3);
  dashGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const dashMat = new THREE.LineBasicMaterial({
    color: 0xffe3b0,
    transparent: true,
    opacity: 0.55,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const dashes = new THREE.LineSegments(dashGeo, dashMat);
  dashes.frustumCulled = false;
  group.add(dashes);

  const ghostGeo = new THREE.SphereGeometry(BALL_R * 0.985, 26, 18);
  const ghostMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.16,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  const ghost = new THREE.Mesh(ghostGeo, ghostMat);
  ghost.visible = false;
  group.add(ghost);

  const ghostRingGeo = new THREE.RingGeometry(BALL_R * 0.99, BALL_R * 1.08, 40);
  ghostRingGeo.rotateX(-Math.PI / 2);
  const ghostRingMat = new THREE.MeshBasicMaterial({
    color: 0xffdca6,
    transparent: true,
    opacity: 0.5,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  const ghostRing = new THREE.Mesh(ghostRingGeo, ghostRingMat);
  ghostRing.visible = false;
  group.add(ghostRing);

  // Object-ball predicted travel direction.
  const objGeo = new THREE.BufferGeometry();
  objGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(2 * 3), 3));
  const objMat = new THREE.LineBasicMaterial({
    color: 0x7df0c8,
    transparent: true,
    opacity: 0.75,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const objLine = new THREE.Line(objGeo, objMat);
  objLine.frustumCulled = false;
  objLine.visible = false;
  group.add(objLine);

  // Target marker shown where the ghost ball would stop on open cloth.
  const markerGeo = new THREE.RingGeometry(0.028, 0.04, 36);
  markerGeo.rotateX(-Math.PI / 2);
  const markerMat = new THREE.MeshBasicMaterial({
    color: 0xffdca6,
    transparent: true,
    opacity: 0.45,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  const marker = new THREE.Mesh(markerGeo, markerMat);
  marker.visible = false;
  group.add(marker);

  const y = CLOTH_Y + 0.003;

  /**
   * @param {{points:{x,z}[], hit:any}|null} path
   * @param {THREE.Vector3} cuePos
   * @param {{x:number,z:number}} dir
   */
  function update(path, { show = true } = {}) {
    group.visible = show;
    if (!show || !path || path.points.length < 2) {
      ghost.visible = false;
      ghostRing.visible = false;
      objLine.visible = false;
      marker.visible = false;
      dashes.visible = false;
      return;
    }

    dashes.visible = true;

    // Build the dashed guide along the polyline.
    let k = 0;
    const arr = dashGeo.attributes.position.array;
    arr.fill(0);
    const dashLen = 0.052;
    const gapLen = 0.032;
    for (let s = 0; s < path.points.length - 1 && k < dashCount; s++) {
      const a = path.points[s];
      const b = path.points[s + 1];
      const segLen = Math.hypot(b.x - a.x, b.z - a.z);
      if (segLen < 1e-6) continue;
      const ux = (b.x - a.x) / segLen;
      const uz = (b.z - a.z) / segLen;
      let t = 0;
      while (t < segLen && k < dashCount) {
        const segStart = t;
        const segEnd = Math.min(segLen, t + dashLen);
        const idx = k * 6;
        arr[idx] = a.x + ux * segStart;
        arr[idx + 1] = y;
        arr[idx + 2] = a.z + uz * segStart;
        arr[idx + 3] = a.x + ux * segEnd;
        arr[idx + 4] = y;
        arr[idx + 5] = a.z + uz * segEnd;
        k++;
        t = segEnd + gapLen;
      }
    }
    // Hide unused dashes by collapsing them at the origin.
    for (let i = k; i < dashCount; i++) {
      const idx = i * 6;
      arr[idx] = arr[idx + 3] = 0;
      arr[idx + 1] = arr[idx + 4] = -10;
      arr[idx + 2] = arr[idx + 5] = 0;
    }
    dashGeo.attributes.position.needsUpdate = true;

    if (path.hit) {
      const b = path.hit;
      const gp = path.points[path.points.length - 1];
      ghost.visible = true;
      ghost.position.set(gp.x, CLOTH_Y + BALL_R, gp.z);
      ghostRing.visible = true;
      ghostRing.position.set(gp.x, y, gp.z);
      marker.visible = false;

      // Object ball departs along the line joining ball centres.
      let ox = b.pos.x - gp.x;
      let oz = b.pos.z - gp.z;
      const ol = Math.hypot(ox, oz) || 1;
      ox /= ol;
      oz /= ol;
      const oarr = objGeo.attributes.position.array;
      oarr[0] = b.pos.x;
      oarr[1] = CLOTH_Y + 0.02;
      oarr[2] = b.pos.z;
      oarr[3] = b.pos.x + ox * 0.62;
      oarr[4] = CLOTH_Y + 0.02;
      oarr[5] = b.pos.z + oz * 0.62;
      objGeo.attributes.position.needsUpdate = true;
      objLine.visible = true;
    } else {
      ghost.visible = false;
      ghostRing.visible = false;
      objLine.visible = false;
      const last = path.points[path.points.length - 1];
      marker.visible = true;
      marker.position.set(last.x, y, last.z);
    }
  }

  function setOpacity(v) {
    dashMat.opacity = 0.12 + v * 0.5;
    ghostMat.opacity = 0.05 + v * 0.14;
    markerMat.opacity = 0.1 + v * 0.4;
  }

  return { group, update, setOpacity };
}
