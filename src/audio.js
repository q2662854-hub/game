// Procedural Web Audio API Sound Engine for Firestone Overpass

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.masterGain = null;
    this.noiseBuffer = null;
    this.chargeOsc = null;
    this.chargeGain = null;
    this.chargeNoise = null;
    this.chargeFilter = null;
  }

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return;
    }
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    this.ctx = new AudioCtx();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this.muted ? 0 : 0.72;
    this.masterGain.connect(this.ctx.destination);

    // Pre-generate 2 seconds of white noise buffer for fire, glass, crashes
    const sampleRate = this.ctx.sampleRate;
    const length = sampleRate * 2;
    this.noiseBuffer = this.ctx.createBuffer(1, length, sampleRate);
    const data = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(muted ? 0 : 0.72, this.ctx.currentTime, 0.03);
    }
  }

  toggleMute() {
    this.setMuted(!this.muted);
    return this.muted;
  }

  startCharge() {
    this.init();
    if (!this.ctx || this.muted) return;
    this.stopCharge();

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(65, now);

    const lowpass = this.ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.setValueAtTime(180, now);

    oscGain.gain.setValueAtTime(0.001, now);
    oscGain.gain.linearRampToValueAtTime(0.14, now + 0.15);

    osc.connect(lowpass);
    lowpass.connect(oscGain);
    oscGain.connect(this.masterGain);
    osc.start(now);

    // Sizzling fire crackle
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    noise.loop = true;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(900, now);
    bp.Q.value = 1.6;
    const nGain = this.ctx.createGain();
    nGain.gain.setValueAtTime(0.001, now);
    nGain.gain.linearRampToValueAtTime(0.12, now + 0.2);

    noise.connect(bp);
    bp.connect(nGain);
    nGain.connect(this.masterGain);
    noise.start(now);

    this.chargeOsc = osc;
    this.chargeGain = oscGain;
    this.chargeNoise = noise;
    this.chargeNoiseGain = nGain;
    this.chargeFilter = lowpass;
    this.chargeNoiseFilter = bp;
  }

  updateCharge(ratio) {
    if (!this.ctx || !this.chargeOsc) return;
    const now = this.ctx.currentTime;
    const clamped = Math.max(0, Math.min(1, ratio));
    this.chargeOsc.frequency.setTargetAtTime(65 + clamped * 155, now, 0.04);
    this.chargeFilter.frequency.setTargetAtTime(180 + clamped * 720, now, 0.04);
    if (this.chargeNoiseFilter) {
      this.chargeNoiseFilter.frequency.setTargetAtTime(900 + clamped * 2200, now, 0.04);
    }
  }

  stopCharge() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    if (this.chargeOsc) {
      try {
        this.chargeGain.gain.cancelScheduledValues(now);
        this.chargeGain.gain.setTargetAtTime(0.0001, now, 0.025);
        this.chargeOsc.stop(now + 0.09);
      } catch (_) {}
      this.chargeOsc = null;
    }
    if (this.chargeNoise) {
      try {
        this.chargeNoiseGain.gain.cancelScheduledValues(now);
        this.chargeNoiseGain.gain.setTargetAtTime(0.0001, now, 0.025);
        this.chargeNoise.stop(now + 0.09);
      } catch (_) {}
      this.chargeNoise = null;
    }
  }

  playThrow(power = 0.5, isOverdrive = false) {
    this.init();
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;

    // Fiery whoosh
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 1.4;
    bp.frequency.setValueAtTime(320 + power * 300, now);
    bp.frequency.exponentialRampToValueAtTime(1400 + power * 700, now + 0.09);
    bp.frequency.exponentialRampToValueAtTime(220, now + 0.28);

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.001, now);
    g.gain.linearRampToValueAtTime(0.32 + power * 0.2, now + 0.03);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    noise.connect(bp);
    bp.connect(g);
    g.connect(this.masterGain);
    noise.start(now);
    noise.stop(now + 0.32);

    // Sub punch
    const osc = this.ctx.createOscillator();
    osc.type = isOverdrive ? 'sawtooth' : 'triangle';
    osc.frequency.setValueAtTime(160 + power * 80, now);
    osc.frequency.exponentialRampToValueAtTime(42, now + 0.16);

    const og = this.ctx.createGain();
    og.gain.setValueAtTime(0.28 + power * 0.15, now);
    og.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    osc.connect(og);
    og.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  playWindshieldShatter(isCharged = false) {
    this.init();
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;

    // 1. Heavy fiery stone impact boom
    const sub = this.ctx.createOscillator();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(isCharged ? 135 : 115, now);
    sub.frequency.exponentialRampToValueAtTime(28, now + 0.32);
    const subG = this.ctx.createGain();
    subG.gain.setValueAtTime(isCharged ? 0.65 : 0.48, now);
    subG.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    sub.connect(subG);
    subG.connect(this.masterGain);
    sub.start(now);
    sub.stop(now + 0.37);

    // 2. Crisp glass explosion burst (high-passed noise)
    const crash = this.ctx.createBufferSource();
    crash.buffer = this.noiseBuffer;
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.setValueAtTime(2400, now);
    const cg = this.ctx.createGain();
    cg.gain.setValueAtTime(0.45, now);
    cg.gain.exponentialRampToValueAtTime(0.001, now + 0.36);
    crash.connect(hp);
    hp.connect(cg);
    cg.connect(this.masterGain);
    crash.start(now);
    crash.stop(now + 0.38);

    // 3. Crystalline glass shard tinkles (multiple shimmering pings)
    const shardCount = isCharged ? 9 : 6;
    for (let i = 0; i < shardCount; i++) {
      const t = now + i * 0.022 + Math.random() * 0.025;
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      const freq = 2600 + Math.random() * 4200;
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.85, t + 0.09);

      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.11, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.09 + Math.random() * 0.06);

      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.16);
    }

    // 4. Fire ignition roar
    const fire = this.ctx.createBufferSource();
    fire.buffer = this.noiseBuffer;
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(620, now);
    lp.frequency.exponentialRampToValueAtTime(160, now + 0.55);
    const fg = this.ctx.createGain();
    fg.gain.setValueAtTime(0.35, now);
    fg.gain.exponentialRampToValueAtTime(0.001, now + 0.58);
    fire.connect(lp);
    lp.connect(fg);
    fg.connect(this.masterGain);
    fire.start(now);
    fire.stop(now + 0.6);
  }

  playBodyHit() {
    this.init();
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;

    // Metallic thud
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(185, now);
    osc.frequency.exponentialRampToValueAtTime(52, now + 0.18);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.4, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.22);

    // Metallic clang overtone
    const clang = this.ctx.createOscillator();
    clang.type = 'square';
    clang.frequency.setValueAtTime(540, now);
    clang.frequency.exponentialRampToValueAtTime(240, now + 0.12);
    const cg = this.ctx.createGain();
    cg.gain.setValueAtTime(0.11, now);
    cg.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
    clang.connect(cg);
    cg.connect(this.masterGain);
    clang.start(now);
    clang.stop(now + 0.15);
  }

  playTireScreech() {
    this.init();
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc2.type = 'triangle';

    const baseFreq = 980 + Math.random() * 240;
    osc1.frequency.setValueAtTime(baseFreq, now);
    osc1.frequency.linearRampToValueAtTime(baseFreq * 1.18, now + 0.16);
    osc1.frequency.exponentialRampToValueAtTime(baseFreq * 0.72, now + 0.55);

    osc2.frequency.setValueAtTime(baseFreq * 1.49, now);
    osc2.frequency.exponentialRampToValueAtTime(baseFreq * 1.04, now + 0.55);

    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(1550, now);
    bp.Q.value = 5.5;

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.001, now);
    g.gain.linearRampToValueAtTime(0.14, now + 0.05);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.58);

    osc1.connect(bp);
    osc2.connect(bp);
    bp.connect(g);
    g.connect(this.masterGain);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.6);
    osc2.stop(now + 0.6);
  }

  playGuardrailCrash() {
    this.init();
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;

    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(750, now);
    bp.Q.value = 0.8;

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.42, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    noise.connect(bp);
    bp.connect(g);
    g.connect(this.masterGain);
    noise.start(now);
    noise.stop(now + 0.52);

    const boom = this.ctx.createOscillator();
    boom.type = 'sine';
    boom.frequency.setValueAtTime(92, now);
    boom.frequency.exponentialRampToValueAtTime(24, now + 0.42);
    const bg = this.ctx.createGain();
    bg.gain.setValueAtTime(0.48, now);
    bg.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    boom.connect(bg);
    bg.connect(this.masterGain);
    boom.start(now);
    boom.stop(now + 0.46);
  }

  playGroundImpact() {
    this.init();
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(95, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.16);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.24, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  playCombo(combo) {
    this.init();
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    const step = Math.min(combo, 10);
    const freq = 420 * Math.pow(1.075, step);

    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.setValueAtTime(freq * 1.25, now + 0.06);

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.14, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.24);
  }

  playEscapeWarning() {
    this.init();
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(110, now + 0.28);

    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 800;

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.2, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(lp);
    lp.connect(g);
    g.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.32);
  }

  playOverdrive() {
    this.init();
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;

    const notes = [220, 330, 440, 660];
    notes.forEach((f, idx) => {
      const t = now + idx * 0.055;
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f, t);
      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 1800;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.16, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
      osc.connect(lp);
      lp.connect(g);
      g.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.42);
    });
  }

  playWaveClear() {
    this.init();
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    const freqs = [523.25, 659.25, 783.99, 1046.5];
    freqs.forEach((f, idx) => {
      const t = now + idx * 0.075;
      const osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, t);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.16, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.32);
      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.34);
    });
  }
}

export const sound = new SoundEngine();
