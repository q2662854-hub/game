import * as THREE from 'three';
import { BALL_R, CLOTH_Y } from './constants.js';

/** Builds a detailed two-tone cue stick pivoting around the butt. */
function buildCueMesh() {
  const g = new THREE.Group();
  const length = 1.45;

  const shaftMat = new THREE.MeshPhysicalMaterial({
    color: 0xe8cfa6,
    roughness: 0.28,
    metalness: 0,
    clearcoat: 0.9,
    clearcoatRoughness: 0.18,
    envMapIntensity: 1.1
  });
  const buttMat = new THREE.MeshPhysicalMaterial({
    color: 0x180d08,
    roughness: 0.22,
    metalness: 0.05,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
    envMapIntensity: 1.2
  });
  const wrapMat = new THREE.MeshStandardMaterial({
    color: 0x0d1116,
    roughness: 0.78,
    metalness: 0.1
  });
  const brassMat = new THREE.MeshStandardMaterial({
    color: 0xe2b66b,
    metalness: 1,
    roughness: 0.25,
    envMapIntensity: 1.4
  });
  const tipMat = new THREE.MeshStandardMaterial({ color: 0x2c6cb5, roughness: 0.82 });
  const ferruleMat = new THREE.MeshStandardMaterial({ color: 0xf4f4ef, roughness: 0.35 });

  function segment(len, r0, r1, mat, y, castShadow = true) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, len, 20, 1), mat);
    mesh.rotation.x = Math.PI / 2;
    mesh.position.z = y + len / 2;
    mesh.castShadow = castShadow;
    mesh.receiveShadow = true;
    g.add(mesh);
    return mesh;
  }

  // Stacked from butt (z = 0) to tip (z = length).
  let z = 0;
  segment(0.012, 0.0155, 0.0155, brassMat, z); // bumper
  z += 0.012;
  segment(0.34, 0.0145, 0.0122, buttMat, z);
  z += 0.34;
  segment(0.28, 0.0122, 0.0112, wrapMat, z);
  z += 0.28;
  // Decorative brass ring pair.
  segment(0.008, 0.0113, 0.0113, brassMat, z);
  z += 0.008;
  segment(0.35, 0.0112, 0.0079, shaftMat, z);
  z += 0.35;
  // Long splice (two tone joint).
  segment(0.16, 0.0079, 0.0068, shaftMat, z);
  z += 0.16;
  segment(0.008, 0.0069, 0.0069, brassMat, z);
  z += 0.008;
  segment(0.022, 0.0064, 0.0062, ferruleMat, z);
  z += 0.022;
  segment(0.011, 0.0062, 0.0061, tipMat, z);
  z += 0.011;

  const finalLen = 1.45;
  if (z < finalLen) {
    segment(finalLen - z, 0.0069, 0.0064, shaftMat, z);
  }

  return g;
}

export function createCue(scene) {
  const group = buildCueMesh();
  // Gameplay camera sits close behind the ball, so the stick is drawn a little
  // shorter than life — it reads as a full cue without filling the screen.
  group.scale.z = 0.62;
  group.visible = false;
  scene.add(group);

  // Glowing aim beam along the cue axis, fading out toward the ball.
  const beamGeo = new THREE.CylinderGeometry(0.0018, 0.0018, 1, 8, 1, true);
  beamGeo.rotateX(Math.PI / 2);
  beamGeo.translate(0, 0, 0.5);
  const beamMat = new THREE.MeshBasicMaterial({
    color: 0xffdca6,
    transparent: true,
    opacity: 0.0,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const beam = new THREE.Mesh(beamGeo, beamMat);
  scene.add(beam);

  const tipLight = new THREE.PointLight(0xffd9a0, 0, 0.7, 2);
  scene.add(tipLight);

  const state = {
    pull: 0, // metres of backswing
    visible: false,
    strikeT: 0,
    phase: 'idle',
    strikeFrom: 0
  };

  /**
   * Place the cue with its tip hovering behind the cue ball.
   * @param {THREE.Vector3} ballPos cue ball centre
   * @param {THREE.Vector2} dir unit shot direction
   * @param {number} elevation radians (butt raised for draw/follow look)
   */
  function place(ballPos, dir, elevation = 0.1) {
    // The group pivots at the tip: local +Z runs from the tip back to the butt.
    const back = BALL_R + 0.014 + state.pull;
    const tipY = CLOTH_Y + BALL_R * 0.55;
    group.position.set(ballPos.x - dir.x * back, tipY, ballPos.z - dir.y * back);
    group.rotation.set(0, Math.atan2(dir.x, dir.y) + Math.PI, 0);
    // Negative pitch raises the butt end off the cloth.
    group.rotateX(-elevation);
    group.visible = state.visible;

    beam.position.set(ballPos.x, CLOTH_Y + 0.004, ballPos.z);
    beam.rotation.set(0, Math.atan2(dir.x, dir.y) + Math.PI, 0);
    beam.scale.z = 0.02;
    beamMat.opacity = state.visible ? 0.26 : 0;
    tipLight.position.set(ballPos.x - dir.x * 0.18, CLOTH_Y + 0.12, ballPos.z - dir.y * 0.18);
    tipLight.intensity = state.visible ? 0.5 : 0;
  }

  function animateStrike(dt, power) {
    if (state.phase === 'strike') {
      state.strikeT += dt / 0.085;
      const t = Math.min(1, state.strikeT);
      const eased = t * t * (3 - 2 * t);
      state.pull = (1 - eased) * state.strikeFrom - 0.004 * eased;
      if (t >= 1) {
        state.phase = 'idle';
        state.pull = 0;
      }
    }
  }

  function setVisible(v) {
    state.visible = v;
    group.visible = v;
    if (!v) {
      beamMat.opacity = 0;
      tipLight.intensity = 0;
    }
  }

  return {
    group,
    beam,
    tipLight,
    state,
    place,
    animateStrike,
    setVisible,
    fire(fromPull) {
      state.phase = 'strike';
      state.strikeT = 0;
      state.strikeFrom = fromPull;
    }
  };
}
