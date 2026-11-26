import * as THREE from 'three';
import { createStage } from './environment.js';
import { buildTable } from './table.js';
import { createBalls } from './balls.js';
import { Physics } from './physics.js';
import { createCue } from './cue.js';
import { createAim } from './aim.js';
import { createFX } from './fx.js';
import { poolAudio } from './audio.js';
import { BALL_R, CLOTH_Y, MAX_SPEED, MIN_SPEED, PLAY_W, PLAY_L, HEAD_SPOT, POCKETS } from './constants.js';

const TWO_PI = Math.PI * 2;

export class PoolGame {
  constructor(canvas, ui) {
    this.ui = ui;
    this.isMobile = window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 760;
    this.quality = this.isMobile ? 'low' : 'high';

    this.stage = createStage(canvas);
    this.scene = this.stage.scene;

    this.table = buildTable(this.stage.renderer, { quality: this.quality });
    this.scene.add(this.table.group);

    this.ballsApi = createBalls(this.stage.renderer, this.scene, { quality: this.quality });
    this.physics = new Physics(this.ballsApi.balls);
    this.cue = createCue(this.scene);
    this.aim = createAim(this.scene);
    this.fx = createFX(this.scene);

    // ---------------------------------------------------------------- state
    this.mode = 'menu'; // menu | aim | watching | placing | paused | over
    this.state = 'idle'; // idle | shooting | resolving
    this.aimAngle = Math.PI;
    this.power = 0.55;
    this.dragging = false;
    this.turn = 'you';
    this.clock = 0;
    this.shake = 0;
    this.cueBallInHand = false;
    this.cueBallGhost = null;
    this.placingPos = null;

    this.playerGroup = null;
    this.aiGroup = null;
    this.playerGroupAssigned = false;
    this.aiGroupAssigned = false;

    this.score = 0;
    this.pots = 0;
    this.fouls = 0;
    this.streak = 0;
    this.elapsed = 0;
    this.timerRunning = false;
    this.newRecord = false;
    this.best = Number(localStorage.getItem('billiard.best') || 0);
    this.bestStreak = Number(localStorage.getItem('billiard.streak') || 0);

    // ---------------------------------------------------------------- camera
    this.camGoal = { pos: new THREE.Vector3(0, 2.2, 2.5), look: new THREE.Vector3(0, 0.8, 0) };
    this.camOrbit = { azimuth: 0, elevation: 0.72, distance: 2.9, targetAz: 0.55, targetEl: 0.7, targetDist: 2.9 };
    this.menuOrbit = 0;
    this.stage.camera.position.copy(this.camGoal.pos);

    this.raycaster = new THREE.Raycaster();
    this.pointerNdc = new THREE.Vector2();
    this.plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -CLOTH_Y);

    this.last = performance.now();
    this.acc = 0;
    this.aiPlan = null;

    this.bindEvents();
    this.rackNewGame({ silent: true });
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  // ---------------------------------------------------------------------------
  // Wiring
  // ---------------------------------------------------------------------------
  bindEvents() {
    const canvas = this.stage.renderer.domElement;

    this._down = (e) => {
      if (this.mode !== 'aim' && this.mode !== 'placing') return;
      if (e.button !== undefined && e.button !== 0) return;
      const hit = this.pickTable(e);
      if (this.mode === 'placing') {
        if (hit) this.placeCueBall(hit);
        return;
      }
      if (!hit) return;
      this.dragging = true;
      this.chargeAnchor = { x: e.clientX, y: e.clientY };
      this.chargeStart = this.power;
      this.pointerType = e.pointerType || 'mouse';
      if (this.pointerType !== 'mouse') this.aimToward(hit);
    };

    this._move = (e) => {
      if (this.mode === 'placing') {
        const hit = this.pickTable(e);
        if (hit) this.previewPlacement(hit);
        return;
      }
      if (this.mode !== 'aim') return;

      if (this.dragging) {
        const dx = e.clientX - this.chargeAnchor.x;
        const dy = this.chargeAnchor.y - e.clientY;
        if (this.pointerType === 'mouse') {
          this.setPower(Math.max(0.04, Math.min(1, this.chargeStart + dy / 240)), true);
        } else {
          // Touch: horizontal drag aims, vertical drag charges.
          if (Math.abs(dx) > 2) {
            this.setAimAngle(this.aimAngle + dx * 0.011);
            this.chargeAnchor.x = e.clientX;
          }
          if (Math.abs(dy) > 2) {
            this.setPower(Math.max(0.04, Math.min(1, this.power + dy / 420)), true);
            this.chargeAnchor.y = e.clientY;
          }
        }
        return;
      }

      if (e.pointerType === 'mouse') {
        const hit = this.pickTable(e);
        if (hit) this.aimToward(hit);
      }
    };

    this._up = (e) => {
      if (!this.dragging) return;
      this.dragging = false;
      const moved = Math.hypot(e.clientX - this.chargeAnchor.x, e.clientY - this.chargeAnchor.y);
      if (this.pointerType === 'mouse' && moved < 6) {
        // A plain click aims at the clicked spot and shoots.
        const hit = this.pickTable(e);
        if (hit) this.aimToward(hit);
        this.shoot();
      } else {
        this.shoot();
      }
    };

    canvas.addEventListener('pointerdown', this._down);
    window.addEventListener('pointermove', this._move);
    window.addEventListener('pointerup', this._up);
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    this._wheel = (e) => {
      if (this.mode !== 'aim') return;
      e.preventDefault();
      this.setPower(Math.max(0.04, Math.min(1, this.power - e.deltaY * 0.0011)), true);
    };
    canvas.addEventListener('wheel', this._wheel, { passive: false });

    this._key = (e) => {
      if (e.target && /input|textarea/i.test(e.target.tagName)) return;
      if (e.code === 'Space') e.preventDefault();
      if (this.mode === 'aim') {
        if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
          this.setAimAngle(this.aimAngle + 0.013);
        } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
          this.setAimAngle(this.aimAngle - 0.013);
        } else if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
          this.setPower(Math.min(1, this.power + 0.035), true);
        } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
          this.setPower(Math.max(0.04, this.power - 0.035), true);
        } else if (e.code === 'Space' && this.state === 'shooting' && !this.dragging) {
          this.shoot();
        }
        if (e.key === 'Escape') this.pause();
      } else if (this.mode === 'paused' && e.key === 'Escape') {
        this.resume();
      }
    };
    window.addEventListener('keydown', this._key);

    this.ui.bind?.(this);
  }

  // ---------------------------------------------------------------------------
  // Pointer math
  // ---------------------------------------------------------------------------
  setPointer(e) {
    const rect = this.stage.renderer.domElement.getBoundingClientRect();
    this.pointerNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointerNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointerNdc, this.stage.camera);
  }

  pickTable(e) {
    this.setPointer(e);
    const hit = new THREE.Vector3();
    if (this.raycaster.ray.intersectPlane(this.plane, hit)) {
      const pad = BALL_R * 0.2;
      if (Math.abs(hit.x) > PLAY_W / 2 - pad || Math.abs(hit.z) > PLAY_L / 2 - pad) return null;
      return { x: hit.x, z: hit.z };
    }
    return null;
  }

  aimToward(point) {
    const cueBall = this.ballsApi.cueBall;
    if (!cueBall || cueBall.inPocket) return;
    const dx = point.x - cueBall.pos.x;
    const dz = point.z - cueBall.pos.z;
    if (Math.hypot(dx, dz) < 0.08) return;
    const target = Math.atan2(dz, dx);
    // Smoothly rotate toward the pointer for a silky feel.
    let delta = target - this.aimAngle;
    while (delta > Math.PI) delta -= TWO_PI;
    while (delta < -Math.PI) delta += TWO_PI;
    this.aimAngle += delta * 0.65;
  }

  setAimAngle(a) {
    this.aimAngle = a;
  }

  setPower(p) {
    this.power = Math.max(0.02, Math.min(1, p));
    this.ui.setPower?.(this.power);
  }

  nudgePower(d) {
    this.setPower(this.power + d);
  }

  adjustCam(dAz, dEl, dDist) {
    this.camOrbit.targetAz += dAz;
    this.camOrbit.targetEl = Math.max(0.3, Math.min(1.42, this.camOrbit.targetEl + dEl));
    this.camOrbit.targetDist = Math.max(1.5, Math.min(4.4, this.camOrbit.targetDist + dDist));
  }

  // ---------------------------------------------------------------------------
  // Rack / lifecycle
  // ---------------------------------------------------------------------------
  rackNewGame({ silent = false } = {}) {
    this.ballsApi.rack();
    this.physics.setBalls(this.ballsApi.balls);
    this.ballsApi.resetCueBall(false);
    this.score = 0;
    this.pots = 0;
    this.fouls = 0;
    this.streak = 0;
    this.elapsed = 0;
    this.timerRunning = false;
    this.turn = 'you';
    this.cueBallInHand = false;
    this.playerGroup = null;
    this.aiGroup = null;
    this.playerGroupAssigned = false;
    this.aiGroupAssigned = false;
    this.aiPlan = null;
    this.lastShot = null;
    this.state = 'shooting';
    this.hideGhost();
    if (!silent) this.ui.onRack?.(this);
    this.ui.updateHud?.(this);
  }

  start() {
    poolAudio.ensure();
    poolAudio.startAmbient();
    this.mode = 'aim';
    this.state = 'shooting';
    this.timerRunning = true;
    this.aimAngle = Math.PI;
    this.setPower(0.55);
    this.suggestAim(false);
    this.ui.onTurn?.(this, 'you', true);
    this.ui.updateHud?.(this);
    poolAudio.uiClick();
  }

  restart() {
    this.hideGhost();
    this.rackNewGame({ silent: false });
    this.start();
  }

  toMenu() {
    this.mode = 'menu';
    this.state = 'idle';
    this.hideGhost();
    this.cue.setVisible(false);
    this.aim.update(null, { show: false });
    this.rackNewGame({ silent: true });
    this.ui.updateHud?.(this);
  }

  pause() {
    if (this.mode === 'menu' || this.mode === 'over' || this.mode === 'paused') return;
    this.pausedFrom = this.mode;
    this.mode = 'paused';
    this.ui.onPause?.(this, true);
  }

  resume() {
    if (this.mode !== 'paused') return;
    this.mode = this.pausedFrom || 'aim';
    this.last = performance.now();
    this.ui.onPause?.(this, false);
  }

  // ---------------------------------------------------------------------------
  // Shooting
  // ---------------------------------------------------------------------------
  shoot() {
    if (this.mode !== 'aim' || this.state !== 'shooting') return;
    const cueBall = this.ballsApi.cueBall;
    if (!cueBall || cueBall.inPocket) return;

    const speed = MIN_SPEED + (MAX_SPEED - MIN_SPEED) * Math.pow(this.power, 1.5);
    const dir = { x: Math.cos(this.aimAngle), z: Math.sin(this.aimAngle) };

    this.cue.fire(0.02 + this.power * 0.16);
    this.fx.chalkPuff(cueBall.pos.x, cueBall.pos.z, 9);
    poolAudio.cueStrike(this.power);

    cueBall.vel.set(dir.x * speed, 0, dir.z * speed);
    cueBall.sleep = false;

    this.state = 'resolving';
    this.lastShot = {
      by: 'you',
      cueStart: { x: cueBall.pos.x, z: cueBall.pos.z },
      dir,
      power: this.power,
      firstContact: null,
      potted: [],
      cuePotted: false,
      cushionHits: 0,
      pocketEvents: []
    };
    for (const b of this.ballsApi.balls) if (!b.inPocket) b.sleep = false;
    this.ui.onShot?.(this);
  }

  // ---------------------------------------------------------------------------
  // Frame loop
  // ---------------------------------------------------------------------------
  loop(now) {
    requestAnimationFrame(this.loop);
    const raw = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.clock += raw;

    if (this.mode === 'paused') {
      this.stage.composer.render();
      return;
    }

    if (this.mode === 'menu') {
      this.menuOrbit += raw * 0.045;
      const r = 3.5;
      const a = this.menuOrbit;
      this.stage.camera.position.set(Math.sin(a) * r, 2.15 + Math.sin(a * 0.8) * 0.16, Math.cos(a) * r * 0.82);
      this.stage.camera.lookAt(0, 0.74, 0);
      this.table.update(raw);
      this.fx.update(raw);
      this.cue.setVisible(false);
      this.aim.update(null, { show: false });
      this.stage.composer.render();
      this.frameCount = (this.frameCount || 0) + 1;
      return;
    }

    // Physics at a fixed-ish step for stability.
    let dt = raw;
    const step = 1 / 160;
    while (dt > 1e-5) {
      const s = Math.min(step, dt);
      this.simulate(s);
      dt -= s;
    }

    this.updateAi(raw);
    this.table.update(raw);
    this.fx.update(raw);
    this.ballsApi.updatePositions();
    this.ballsApi.rollMeshes(raw);
    this.updateAimVisual();
    this.updateCamera(raw);
    this.stage.composer.render();
    this.frameCount = (this.frameCount || 0) + 1;
  }

  simulate(dt) {
    const cueBall = this.ballsApi.cueBall;

    if (this.state === 'resolving') {
      const res = this.physics.step(dt, { cueBall });
      this.handleEvents(res.events);
      if (!res.moving) this.finishShot();
    }

    if (this.timerRunning && this.mode === 'aim') {
      this.elapsed += dt * 1000;
      this.ui.tickTimer?.(this.elapsed);
    }
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 2.2);
    if (this.cueBallGhost) {
      this.cueBallGhost.material.opacity = 0.3 + Math.sin(this.clock * 5) * 0.09;
    }
  }

  handleEvents(events) {
    for (const ev of events) {
      const pan = THREE.MathUtils.clamp((ev.x / PLAY_W) * 1.7, -0.9, 0.9);
      if (ev.type === 'ball-ball') {
        poolAudio.ballHit(ev.impact, pan);
        if (ev.impact > 0.4) {
          this.fx.impactSpark(ev.x, ev.z, ev.impact);
          this.shake = Math.min(1, this.shake + ev.impact * 0.14);
        }
        if (this.lastShot && !this.lastShot.firstContact && (ev.a === 0 || ev.b === 0)) {
          this.lastShot.firstContact = ev.a === 0 ? ev.b : ev.a;
        }
      } else if (ev.type === 'cushion') {
        poolAudio.cushion(ev.impact, pan);
        if (this.lastShot) this.lastShot.cushionHits++;
        if (ev.impact > 0.55) this.shake = Math.min(1, this.shake + ev.impact * 0.045);
      } else if (ev.type === 'pocket') {
        this.onPocket(ev);
      }
    }
  }

  onPocket(ev) {
    const ball = this.ballsApi.balls.find((b) => b.n === ev.n);
    if (!ball) return;
    if (ev.n === 0) {
      poolAudio.pocket();
      if (this.lastShot) {
        this.lastShot.cuePotted = true;
      }
      this.fx.pocketBurst(ev.x, ev.z, 0xff7b6b, 16);
      this.shake = Math.min(1, this.shake + 0.28);
      this.ui.onScratch?.(this);
    } else {
      poolAudio.pocket();
      this.fx.pocketBurst(ev.x, ev.z, ball.n === 8 ? 0x9fb4ff : 0xffc77a, 30);
      this.table.flashPocket(ev.pocket);
      if (this.lastShot) this.lastShot.potted.push(ball.n);
      this.shake = Math.min(1, this.shake + 0.16);
      const pts = 100;
      this.ui.floatLabel?.(`+${pts}`, new THREE.Vector3(ev.x, CLOTH_Y + 0.05, ev.z));
    }
  }

  // ---------------------------------------------------------------------------
  // Rules
  // ---------------------------------------------------------------------------
  groupOfBall(n) {
    if (n === 0) return 'cue';
    if (n === 8) return 'eight';
    return n < 8 ? 'solid' : 'stripe';
  }

  ballsLeft(group) {
    if (!group) return 99;
    return this.ballsApi.balls.filter(
      (b) => !b.inPocket && b.n !== 0 && b.n !== 8 && this.groupOfBall(b.n) === group
    ).length;
  }

  assignGroups(firstNumber) {
    const group = firstNumber < 8 ? 'solid' : 'stripe';
    this.playerGroup = group;
    this.aiGroup = group === 'solid' ? 'stripe' : 'solid';
    this.playerGroupAssigned = true;
    this.aiGroupAssigned = true;
    this.ui.onGroupAssigned?.(this, group);
  }

  finishShot() {
    const shot = this.lastShot;
    if (!shot) return;
    this.lastShot = null;
    this.state = 'shooting';
    if (shot.by === 'you') this.resolvePlayerShot(shot);
    else this.resolveAiShot(shot);
  }

  resolvePlayerShot(shot) {
    const potted = shot.potted;
    const eight = potted.includes(8);
    const cueBall = this.ballsApi.cueBall;

    // Open table: the first legally potted ball decides the groups.
    if (!this.playerGroupAssigned) {
      const first = potted.find((n) => n !== 8);
      if (first !== undefined) this.assignGroups(first);
    }

    // 8-ball finish.
    if (eight) {
      const legal = this.ballsLeft(this.playerGroup) === 0 && !shot.cuePotted && shot.firstContact !== null;
      if (legal) {
        this.score += 500;
      }
      this.endGame(legal ? 'win' : 'lose', legal ? 'توپ ۸ را در پایانِ تمیز انداختی!' : 'توپ ۸ زودتر از موعد افتاد');
      return;
    }

    let foul = null;
    if (shot.cuePotted) foul = 'cue';
    else if (shot.firstContact === null) foul = 'miss';
    else if (this.playerGroupAssigned && this.groupOfBall(shot.firstContact) !== this.playerGroup && shot.firstContact !== 8) foul = 'wrong';
    else if (shot.firstContact === 8 && this.ballsLeft(this.playerGroup) > 0) foul = 'eight-first';

    const legalPots = potted.filter((n) => !this.playerGroupAssigned || this.groupOfBall(n) === this.playerGroup);

    if (foul) {
      this.fouls++;
      this.streak = 0;
      this.score = Math.max(0, this.score - 40);
      poolAudio.foul();
      this.ui.toast?.(foul === 'cue' ? 'خطا! توپ سفید افتاد' : 'خطا! توپِ اشتباه');
      this.resetCueBallAfterScratch();
      this.ui.updateHud?.(this);
      this.startAiTurn({ inHand: true });
      return;
    }

    if (legalPots.length > 0) {
      this.streak += legalPots.length;
      this.pots += legalPots.length;
      this.score += legalPots.length * 100 + Math.max(0, this.streak - 1) * 30;
      if (legalPots.length > 1) this.score += (legalPots.length - 1) * 80;
      if (this.streak > this.bestStreak) {
        this.bestStreak = this.streak;
        localStorage.setItem('billiard.streak', String(this.bestStreak));
      }
      this.ui.updateHud?.(this);
      this.ui.onPot?.(this, legalPots.length);
      this.mode = 'aim';
      this.state = 'shooting';
      this.suggestAim(true);
      this.ui.onTurn?.(this, 'you', true);
      return;
    }

    this.streak = 0;
    this.ui.updateHud?.(this);
    this.startAiTurn({ inHand: false });
  }

  resolveAiShot(shot) {
    const potted = shot.potted;
    const eight = potted.includes(8);

    if (!this.aiGroupAssigned) {
      const first = potted.find((n) => n !== 8);
      if (first !== undefined) this.assignGroups(first);
    }

    if (eight) {
      const legal = this.ballsLeft(this.aiGroup) === 0 && !shot.cuePotted;
      this.endGame(legal ? 'lose' : 'win', legal ? 'حریف توپ ۸ را انداخت' : 'حریف توپ ۸ را زودتر انداخت');
      return;
    }

    let foul = null;
    if (shot.cuePotted) foul = 'cue';
    else if (shot.firstContact === null) foul = 'miss';
    else if (this.aiGroupAssigned && this.groupOfBall(shot.firstContact) !== this.aiGroup && shot.firstContact !== 8) foul = 'wrong';
    else if (shot.firstContact === 8 && this.ballsLeft(this.aiGroup) > 0) foul = 'eight-first';

    const legalPots = potted.filter((n) => !this.aiGroupAssigned || this.groupOfBall(n) === this.aiGroup);

    if (foul) {
      poolAudio.foul();
      this.ui.toast?.('حریف خطا کرد — توپ در دست!');
      this.resetCueBallAfterScratch();
      this.ui.updateHud?.(this);
      this.beginCueInHand();
      return;
    }

    if (legalPots.length > 0) {
      this.ui.updateHud?.(this);
      this.aiPlan = { think: 1.05, shot: null };
      this.state = 'shooting';
      this.turn = 'ai';
      this.ui.onTurn?.(this, 'ai', true);
      // Plan the next shot right away; updateAi will wait out the think timer.
      this.aiPlan.shot = this.planAiShot();
      return;
    }

    this.endAiTurn();
  }

  endAiTurn() {
    this.turn = 'you';
    this.mode = 'aim';
    this.state = 'shooting';
    this.cue.setVisible(true);
    this.suggestAim(true);
    this.ui.onTurn?.(this, 'you', true);
    this.ui.updateHud?.(this);
  }

  resetCueBallAfterScratch() {
    const cueBall = this.ballsApi.cueBall;
    if (!cueBall) return;
    if (cueBall.inPocket) {
      cueBall.inPocket = false;
      cueBall.pocket = null;
      cueBall.pos.set(HEAD_SPOT.x, CLOTH_Y + BALL_R, 0);
      cueBall.mesh.position.copy(cueBall.pos);
      cueBall.mesh.visible = true;
    }
    cueBall.vel.set(0, 0, 0);
    cueBall.sleep = true;
  }

  // ---------------------------------------------------------------------------
  // Ball in hand (player)
  // ---------------------------------------------------------------------------
  beginCueInHand() {
    this.cueBallInHand = true;
    this.turn = 'you';
    this.mode = 'placing';
    this.state = 'shooting';
    const cueBall = this.ballsApi.cueBall;
    cueBall.vel.set(0, 0, 0);
    cueBall.mesh.visible = false;
    this.cue.setVisible(false);
    this.aim.update(null, { show: false });
    this.ensureGhost();
    this.ui.onPlace?.(this, true);
  }

  ensureGhost() {
    if (!this.cueBallGhost) {
      const geo = new THREE.SphereGeometry(BALL_R, 26, 18);
      const mat = new THREE.MeshBasicMaterial({
        color: 0x7df0c8,
        transparent: true,
        opacity: 0.4,
        depthWrite: false
      });
      this.cueBallGhost = new THREE.Mesh(geo, mat);
      this.stage.scene.add(this.cueBallGhost);
    }
    this.cueBallGhost.visible = true;
    const spot = this.findFreeHeadSpot();
    this.previewPlacement(spot);
  }

  hideGhost() {
    if (this.cueBallGhost) this.cueBallGhost.visible = false;
  }

  previewPlacement(pos) {
    this.placingPos = pos;
    if (!this.cueBallGhost) this.ensureGhost();
    this.cueBallGhost.position.set(pos.x, CLOTH_Y + BALL_R, pos.z);
    const ok = this.physics.spotFree(pos.x, pos.z);
    this.cueBallGhost.material.color.set(ok ? 0x7df0c8 : 0xff5d6c);
    this.ui.setPlaceValid?.(ok);
  }

  findFreeHeadSpot() {
    const candidates = [
      { x: HEAD_SPOT.x, z: 0 },
      { x: HEAD_SPOT.x, z: 0.16 },
      { x: HEAD_SPOT.x, z: -0.16 },
      { x: HEAD_SPOT.x + 0.22, z: 0.08 },
      { x: 0.3, z: 0 },
      { x: 0, z: 0.3 }
    ];
    for (const c of candidates) {
      if (this.physics.spotFree(c.x, c.z)) return c;
    }
    return { x: 0, z: 0 };
  }

  placeCueBall(pos) {
    if (!this.physics.spotFree(pos.x, pos.z)) {
      this.ui.toast?.('اینجا جای توپ نیست');
      poolAudio.foul();
      return;
    }
    const cueBall = this.ballsApi.cueBall;
    cueBall.pos.set(pos.x, CLOTH_Y + BALL_R, pos.z);
    cueBall.mesh.position.copy(cueBall.pos);
    cueBall.mesh.visible = true;
    cueBall.inPocket = false;
    cueBall.vel.set(0, 0, 0);
    cueBall.sleep = true;
    this.cueBallInHand = false;
    this.hideGhost();
    this.ui.onPlace?.(this, false);
    poolAudio.uiClick();
    this.mode = 'aim';
    this.state = 'shooting';
    this.suggestAim(true);
    this.ui.onTurn?.(this, 'you', true);
  }

  // ---------------------------------------------------------------------------
  // AI
  // ---------------------------------------------------------------------------
  availableTargets(group) {
    return this.ballsApi.balls.filter((b) => {
      if (b.inPocket || b.n === 0) return false;
      if (group === null) return b.n !== 8;
      if (b.n === 8) return this.ballsLeft(group) === 0;
      return this.groupOfBall(b.n) === group;
    });
  }

  startAiTurn({ inHand = false } = {}) {
    this.turn = 'ai';
    this.mode = 'watching';
    this.state = 'shooting';
    this.cue.setVisible(false);
    this.aim.update(null, { show: false });
    this.ui.onTurn?.(this, 'ai', false);

    if (inHand) {
      const spot = this.aiChooseCueSpot();
      const cueBall = this.ballsApi.cueBall;
      cueBall.inPocket = false;
      cueBall.pos.set(spot.x, CLOTH_Y + BALL_R, spot.z);
      cueBall.mesh.position.copy(cueBall.pos);
      cueBall.mesh.visible = true;
      cueBall.vel.set(0, 0, 0);
      this.cueBallInHand = false;
      this.hideGhost();
    }

    this.aiPlan = { think: 1.15 + Math.random() * 0.6, shot: this.planAiShot() };
  }

  aiChooseCueSpot() {
    const group = this.aiGroup ?? (this.playerGroup ? (this.playerGroup === 'solid' ? 'stripe' : 'solid') : null);
    const targets = this.availableTargets(group);
    let best = { x: HEAD_SPOT.x, z: 0 };
    let bestScore = -Infinity;
    for (let i = 0; i < 40; i++) {
      const x = -PLAY_W / 2 + 0.16 + Math.random() * (PLAY_W - 0.32);
      const z = -PLAY_L / 2 + 0.14 + Math.random() * (PLAY_L - 0.28);
      if (!this.physics.spotFree(x, z)) continue;
      let score = 0;
      for (const t of targets) {
        const d = Math.hypot(t.pos.x - x, t.pos.z - z);
        score += 1.1 / (1 + d * 1.2);
        for (const p of POCKETS) {
          const align = this.alignmentScore({ x, z }, t.pos, p);
          const potDist = Math.hypot(p.x - t.pos.x, p.z - t.pos.z);
          if (align > 0.86) score += (3.4 * align) / (1 + potDist * 0.5) / (1 + d * 0.35);
        }
      }
      if (score > bestScore) {
        bestScore = score;
        best = { x, z };
      }
    }
    return best;
  }

  alignmentScore(from, target, pocket) {
    const ax = target.x - from.x;
    const az = target.z - from.z;
    const bx = pocket.x - target.x;
    const bz = pocket.z - target.z;
    const la = Math.hypot(ax, az) || 1;
    const lb = Math.hypot(bx, bz) || 1;
    return (ax / la) * (bx / lb) + (az / la) * (bz / lb);
  }

  planAiShot() {
    const cueBall = this.ballsApi.cueBall;
    const group = this.aiGroup ?? (this.playerGroup ? (this.playerGroup === 'solid' ? 'stripe' : 'solid') : null);
    const targets = this.availableTargets(group);
    if (!targets.length) {
      // Nothing legal: gentle roll at the 8 to avoid a repeat foul.
      const eight = this.ballsApi.balls.find((b) => b.n === 8 && !b.inPocket);
      if (!eight) return null;
      const dx = eight.pos.x - cueBall.pos.x;
      const dz = eight.pos.z - cueBall.pos.z;
      const l = Math.hypot(dx, dz) || 1;
      return { dir: { x: dx / l, z: dz / l }, target: eight, power: 0.4, safety: true };
    }

    let best = null;
    for (const target of targets) {
      for (const p of POCKETS) {
        const px = target.pos.x - p.x;
        const pz = target.pos.z - p.z;
        const pl = Math.hypot(px, pz) || 1;
        const aim = { x: target.pos.x + (px / pl) * BALL_R * 2, z: target.pos.z + (pz / pl) * BALL_R * 2 };
        const cx = aim.x - cueBall.pos.x;
        const cz = aim.z - cueBall.pos.z;
        const dist = Math.hypot(cx, cz);
        if (dist < 1e-3) continue;
        const dir = { x: cx / dist, z: cz / dist };
        if (this.pathBlocked(cueBall.pos, dir, dist - BALL_R * 1.7, target)) continue;
        const obx = p.x - target.pos.x;
        const obz = p.z - target.pos.z;
        const obl = Math.hypot(obx, obz) || 1;
        const cosCut = dir.x * (obx / obl) + dir.z * (obz / obl);
        if (cosCut < 0.3) continue;
        const score = cosCut * 2.6 + 1.8 / (1 + obl * 0.65) + 1.3 / (1 + dist * 0.55) + Math.random() * 0.3;
        if (!best || score > best.score) {
          best = { score, dir, target, pocket: p, dist, cosCut, potDist: obl };
        }
      }
    }

    if (!best) {
      let nearest = null;
      for (const t of targets) {
        const d = Math.hypot(t.pos.x - cueBall.pos.x, t.pos.z - cueBall.pos.z);
        if (!nearest || d < nearest.d) nearest = { t, d };
      }
      if (!nearest) return null;
      const dx = nearest.t.pos.x - cueBall.pos.x;
      const dz = nearest.t.pos.z - cueBall.pos.z;
      const l = Math.hypot(dx, dz) || 1;
      return { dir: { x: dx / l, z: dz / l }, target: nearest.t, power: 0.44 + Math.random() * 0.18, safety: true };
    }

    let power = 0.34 + best.potDist * 0.28 + best.dist * 0.12 + (1 - best.cosCut) * 0.3;
    power = Math.max(0.3, Math.min(0.95, power));
    const skill = 0.93;
    const err = (1 - skill) * (best.dist + best.potDist) * 0.044 * (Math.random() - 0.5) * 2;
    const ang = Math.atan2(best.dir.z, best.dir.x) + err;
    return {
      dir: { x: Math.cos(ang), z: Math.sin(ang) },
      target: best.target,
      pocket: best.pocket,
      power,
      safety: false
    };
  }

  pathBlocked(origin, dir, maxDist, ignore) {
    for (const b of this.ballsApi.balls) {
      if (b.inPocket || b.n === 0 || b === ignore) continue;
      const ox = b.pos.x - origin.x;
      const oz = b.pos.z - origin.z;
      const t = ox * dir.x + oz * dir.z;
      if (t < 0 || t > maxDist) continue;
      const px = ox - dir.x * t;
      const pz = oz - dir.z * t;
      if (px * px + pz * pz < (BALL_R * 2.05) * (BALL_R * 2.05)) return true;
    }
    return false;
  }

  updateAi(dt) {
    if (this.mode !== 'watching' || this.state !== 'shooting') return;
    const plan = this.aiPlan;
    if (!plan || !plan.shot) return;

    const cueBall = this.ballsApi.cueBall;
    const shot = plan.shot;
    this.aimAngle = Math.atan2(shot.dir.z, shot.dir.x);
    this.cue.setVisible(true);
    const previewPull = 0.02 + shot.power * 0.13;
    if (this.cue.state.phase !== 'strike') this.cue.state.pull = previewPull;
    this.cue.place(cueBall.pos, new THREE.Vector2(shot.dir.x, shot.dir.z), 0.08);
    if (this.cue.state.phase === 'strike') this.cue.animateStrike(dt, shot.power);
    const path = this.physics.predictPath(cueBall.pos, shot.dir, 2.2);
    this.aim.update(path, { show: true });
    this.aim.setOpacity(0.55);

    plan.think -= dt;
    if (plan.think <= 0 && this.cue.state.phase !== 'strike') {
      this.aiShoot(shot);
    }
  }

  aiShoot(shot) {
    const cueBall = this.ballsApi.cueBall;
    const speed = MIN_SPEED + (MAX_SPEED - MIN_SPEED) * Math.pow(shot.power, 1.5);
    this.cue.fire(0.02 + shot.power * 0.13);
    this.fx.chalkPuff(cueBall.pos.x, cueBall.pos.z, 8);
    poolAudio.cueStrike(shot.power);
    cueBall.vel.set(shot.dir.x * speed, 0, shot.dir.z * speed);
    cueBall.sleep = false;
    this.aim.update(null, { show: false });
    this.state = 'resolving';
    this.turn = 'ai';
    this.lastShot = {
      by: 'ai',
      cueStart: { x: cueBall.pos.x, z: cueBall.pos.z },
      dir: shot.dir,
      power: shot.power,
      firstContact: null,
      potted: [],
      cuePotted: false,
      cushionHits: 0,
      pocketEvents: []
    };
    for (const b of this.ballsApi.balls) if (!b.inPocket) b.sleep = false;
    this.ui.onShot?.(this);
  }

  // ---------------------------------------------------------------------------
  // Aim assist
  // ---------------------------------------------------------------------------
  suggestAim(autoPower = false) {
    const cueBall = this.ballsApi.cueBall;
    if (!cueBall || cueBall.inPocket) return;
    const targets = this.availableTargets(this.playerGroup);
    let best = null;
    for (const t of targets) {
      for (const p of POCKETS) {
        const px = t.pos.x - p.x;
        const pz = t.pos.z - p.z;
        const pl = Math.hypot(px, pz) || 1;
        const aim = { x: t.pos.x + (px / pl) * BALL_R * 2, z: t.pos.z + (pz / pl) * BALL_R * 2 };
        const dx = aim.x - cueBall.pos.x;
        const dz = aim.z - cueBall.pos.z;
        const dist = Math.hypot(dx, dz);
        if (dist < 1e-3) continue;
        const dir = { x: dx / dist, z: dz / dist };
        if (this.pathBlocked(cueBall.pos, dir, dist - BALL_R * 1.7, t)) continue;
        const obx = p.x - t.pos.x;
        const obz = p.z - t.pos.z;
        const obl = Math.hypot(obx, obz) || 1;
        const cosCut = dir.x * (obx / obl) + dir.z * (obz / obl);
        if (cosCut < 0.34) continue;
        const score = cosCut * 2 + 1.5 / (1 + obl * 0.6) + 1.1 / (1 + dist * 0.55);
        if (!best || score > best.score) best = { score, dir, dist, obl };
      }
    }
    if (best) {
      this.aimAngle = Math.atan2(best.dir.z, best.dir.x);
      if (autoPower) this.setPower(Math.max(0.24, Math.min(0.8, 0.26 + best.obl * 0.24 + best.dist * 0.13)));
    } else if (targets.length) {
      const t = targets[0];
      this.aimAngle = Math.atan2(t.pos.z - cueBall.pos.z, t.pos.x - cueBall.pos.x);
    }
  }

  updateAimVisual() {
    const cueBall = this.ballsApi.cueBall;
    if (!cueBall) return;

    if (this.mode === 'aim' && this.state === 'shooting') {
      const dir = { x: Math.cos(this.aimAngle), z: Math.sin(this.aimAngle) };
      const len = 0.9 + this.power * 1.7;
      const path = this.physics.predictPath(cueBall.pos, dir, len);
      this.aim.update(path, { show: true });
      this.aim.setOpacity(1);
      this.cue.setVisible(true);
      if (this.cue.state.phase !== 'strike') {
        this.cue.state.pull = 0.02 + this.power * 0.16;
      } else {
        this.cue.animateStrike(1 / 60, this.power);
      }
      this.cue.place(cueBall.pos, new THREE.Vector2(dir.x, dir.z), 0.1);
    } else {
      this.cue.setVisible(this.cue.state.phase === 'strike');
      if (this.cue.state.phase === 'strike') {
        const dir = this.lastShot ? this.lastShot.dir : { x: Math.cos(this.aimAngle), z: Math.sin(this.aimAngle) };
        this.cue.place(cueBall.pos, new THREE.Vector2(dir.x, dir.z), 0.1);
      }
      if (this.mode !== 'watching') this.aim.update(null, { show: false });
    }
  }

  // ---------------------------------------------------------------------------
  // Camera
  // ---------------------------------------------------------------------------
  updateCamera(dt) {
    const cam = this.stage.camera;
    const cueBall = this.ballsApi.cueBall;
    const k = 1 - Math.pow(0.0016, dt);

    if (this.state === 'resolving' && (this.mode === 'aim' || this.mode === 'watching')) {
      // Action camera: pull back and rise so the whole table is in frame while
      // the balls run, drifting slowly around the action.
      const o = this.camOrbit;
      o.azimuth += dt * 0.12;
      const dist = 2.15;
      const goal = new THREE.Vector3(
        Math.sin(o.azimuth) * Math.cos(0.62) * dist,
        Math.sin(0.62) * dist + 1.05,
        Math.cos(o.azimuth) * Math.cos(0.62) * dist
      );
      // Follow the centroid of the balls that are still moving.
      const moving = this.ballsApi.balls.filter((b) => !b.inPocket && !b.sleep);
      if (moving.length) {
        let cx = 0;
        let cz = 0;
        for (const b of moving) {
          cx += b.pos.x;
          cz += b.pos.z;
        }
        cx = cx / moving.length;
        cz = cz / moving.length;
        this.camGoal.look.lerp(new THREE.Vector3(cx * 0.45, CLOTH_Y, cz * 0.45), k * 0.55);
        this.camGoal.pos.lerp(goal, k * 0.6);
      } else {
        this.camGoal.look.lerp(new THREE.Vector3(0, CLOTH_Y, 0), k * 0.5);
        this.camGoal.pos.lerp(goal, k * 0.5);
      }
    } else if (this.mode === 'aim' && cueBall && !cueBall.inPocket) {

      const dirX = Math.cos(this.aimAngle);
      const dirZ = Math.sin(this.aimAngle);
      const rightX = -dirZ;
      const rightZ = dirX;

      // Over-the-shoulder rig offset to the side of the shot line: the cue
      // stick runs out of frame at the lower corner, the cue ball sits low and
      // the target stays centred.
      const portrait = window.innerHeight > window.innerWidth * 1.15;
      const back = (portrait ? 0.82 : 0.98) + this.power * 0.08;
      const side = portrait ? 0.46 : 0.55;
      const px = cueBall.pos.x - dirX * back + rightX * side;
      const pz = cueBall.pos.z - dirZ * back + rightZ * side;

      const outsideX = Math.max(0, Math.abs(px) - PLAY_W / 2);
      const outsideZ = Math.max(0, Math.abs(pz) - PLAY_L / 2);
      const outside = Math.max(outsideX, outsideZ);
      const py = CLOTH_Y + (portrait ? 0.66 : 0.6) + outside * 1.15 + this.power * 0.06;

      const goal = new THREE.Vector3(px, py, pz);
      this.camGoal.pos.lerp(goal, k);
      this.camGoal.look.lerp(
        new THREE.Vector3(
          cueBall.pos.x + dirX * (portrait ? 0.85 : 1.05),
          CLOTH_Y + 0.03,
          cueBall.pos.z + dirZ * (portrait ? 0.85 : 1.05)
        ),
        k
      );
    } else if (this.mode === 'placing' || this.mode === 'over') {
      const o = this.camOrbit;
      o.azimuth += (o.targetAz - o.azimuth) * Math.min(1, dt * 2.6);
      o.elevation += (o.targetEl - o.elevation) * Math.min(1, dt * 2.6);
      o.distance += (o.targetDist - o.distance) * Math.min(1, dt * 2.6);
      const goal = new THREE.Vector3(
        Math.sin(o.azimuth) * Math.cos(o.elevation) * o.distance,
        Math.sin(o.elevation) * o.distance + 0.42,
        Math.cos(o.azimuth) * Math.cos(o.elevation) * o.distance
      );
      this.camGoal.pos.lerp(goal, k * 0.8);
      this.camGoal.look.lerp(new THREE.Vector3(0, CLOTH_Y, 0), k);
      if (this.mode === 'over') o.targetAz += dt * 0.09;
    } else {
      const o = this.camOrbit;
      o.azimuth += dt * 0.045;
      o.elevation += (0.72 - o.elevation) * Math.min(1, dt * 2);
      o.distance += (2.85 - o.distance) * Math.min(1, dt * 2);
      const goal = new THREE.Vector3(
        Math.sin(o.azimuth) * Math.cos(o.elevation) * o.distance,
        Math.sin(o.elevation) * o.distance + 0.42,
        Math.cos(o.azimuth) * Math.cos(o.elevation) * o.distance
      );
      this.camGoal.pos.lerp(goal, k * 0.5);
      this.camGoal.look.lerp(new THREE.Vector3(0, CLOTH_Y, 0), k * 0.5);
    }

    cam.position.copy(this.camGoal.pos);
    if (this.shake > 0.001) {
      const s = this.shake * 0.02;
      cam.position.x += (Math.random() - 0.5) * s;
      cam.position.y += (Math.random() - 0.5) * s;
      cam.position.z += (Math.random() - 0.5) * s;
    }
    cam.lookAt(this.camGoal.look);
  }

  // ---------------------------------------------------------------------------
  // End of match
  // ---------------------------------------------------------------------------
  endGame(result, reason) {
    this.mode = 'over';
    this.state = 'idle';
    this.timerRunning = false;
    this.cue.setVisible(false);
    this.aim.update(null, { show: false });
    this.hideGhost();
    if (result === 'win') poolAudio.win();
    else poolAudio.lose();

    this.newRecord = this.score > this.best;
    if (this.newRecord) {
      this.best = this.score;
      localStorage.setItem('billiard.best', String(this.best));
    }
    this.ui.onGameOver?.(this, result, reason);
  }
}

export { TWO_PI };
