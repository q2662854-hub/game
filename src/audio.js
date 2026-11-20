// Procedural Web Audio API SFX Engine (Zero external assets required)

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.noiseBuffer = null;
  }

  ensureContext() {
    if (this.muted) return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
      this.noiseBuffer = this.createNoiseBuffer(1.5);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  createNoiseBuffer(seconds) {
    const sampleRate = this.ctx.sampleRate;
    const length = Math.floor(sampleRate * seconds);
    const buffer = this.ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  playThrow(chargeRatio = 0) {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Fiery whoosh via filtered noise
    const noise = ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    const startFreq = 320 + chargeRatio * 180;
    const endFreq = 1400 + chargeRatio * 700;
    filter.frequency.setValueAtTime(startFreq, now);
    filter.frequency.exponentialRampToValueAtTime(endFreq, now + 0.09);
    filter.frequency.exponentialRampToValueAtTime(220, now + 0.26);
    filter.Q.value = 1.4;

    const gain = ctx.createGain();
    const vol = 0.22 + chargeRatio * 0.16;
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(vol, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.27);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start(now);
    noise.stop(now + 0.28);

    // Deep magma launch thump
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(160 - chargeRatio * 45, now);
    osc.frequency.exponentialRampToValueAtTime(48, now + 0.18);
    oscGain.gain.setValueAtTime(0.22 + chargeRatio * 0.14, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(oscGain);
    oscGain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.21);
  }

  playWindshieldShatter(isFullShatter = true, combo = 1) {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // 1. Sharp glass crackle noise burst
    const noise = ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;

    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.setValueAtTime(isFullShatter ? 2400 : 3400, now);

    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(isFullShatter ? 0.34 : 0.22, now);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + (isFullShatter ? 0.34 : 0.18));

    noise.connect(hp);
    hp.connect(nGain);
    nGain.connect(ctx.destination);
    noise.start(now);
    noise.stop(now + 0.36);

    // 2. Sparkling glass shard pings
    const shardCount = isFullShatter ? 7 : 4;
    for (let i = 0; i < shardCount; i++) {
      const delay = i * 0.018 + Math.random() * 0.025;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = i % 2 === 0 ? 'sine' : 'triangle';
      const freq = 2600 + Math.random() * 3400;
      osc.frequency.setValueAtTime(freq, now + delay);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.72, now + delay + 0.09);

      g.gain.setValueAtTime(0.001, now + delay);
      g.gain.linearRampToValueAtTime(0.085, now + delay + 0.008);
      g.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.11);

      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(now + delay);
      osc.stop(now + delay + 0.12);
    }

    // 3. Fiery rock impact punch
    const punch = ctx.createOscillator();
    const pGain = ctx.createGain();
    punch.type = 'sine';
    punch.frequency.setValueAtTime(150, now);
    punch.frequency.exponentialRampToValueAtTime(36, now + 0.22);
    pGain.gain.setValueAtTime(isFullShatter ? 0.36 : 0.22, now);
    pGain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
    punch.connect(pGain);
    pGain.connect(ctx.destination);
    punch.start(now);
    punch.stop(now + 0.25);

    // 4. Combo ascending chime
    if (isFullShatter && combo >= 2) {
      const pitch = 440 * Math.pow(1.075, Math.min(combo, 12));
      const chime = ctx.createOscillator();
      const cGain = ctx.createGain();
      chime.type = 'triangle';
      chime.frequency.setValueAtTime(pitch, now + 0.03);
      chime.frequency.exponentialRampToValueAtTime(pitch * 1.25, now + 0.18);
      cGain.gain.setValueAtTime(0.11, now + 0.03);
      cGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      chime.connect(cGain);
      cGain.connect(ctx.destination);
      chime.start(now + 0.03);
      chime.stop(now + 0.26);
    }
  }

  playBodyHit() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Metallic dent thud
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(210, now);
    osc.frequency.exponentialRampToValueAtTime(62, now + 0.16);

    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 650;

    gain.gain.setValueAtTime(0.24, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    osc.connect(lp);
    lp.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.19);
  }

  playTireScreech() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // High resonant tire squeal with pitch wobble
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();

    osc1.type = 'sawtooth';
    osc2.type = 'triangle';
    const baseFreq = 920 + Math.random() * 220;
    osc1.frequency.setValueAtTime(baseFreq, now);
    osc1.frequency.linearRampToValueAtTime(baseFreq * 1.22, now + 0.18);
    osc1.frequency.linearRampToValueAtTime(baseFreq * 0.85, now + 0.55);

    osc2.frequency.setValueAtTime(baseFreq * 1.48, now);
    osc2.frequency.linearRampToValueAtTime(baseFreq * 1.15, now + 0.55);

    lfo.frequency.value = 26;
    lfoGain.gain.value = 45;
    lfo.connect(lfoGain);
    lfoGain.connect(osc1.frequency);

    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1400;
    bp.Q.value = 4.2;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.11, now + 0.05);
    gain.gain.setValueAtTime(0.095, now + 0.34);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.58);

    osc1.connect(bp);
    osc2.connect(bp);
    bp.connect(gain);
    gain.connect(ctx.destination);

    lfo.start(now);
    osc1.start(now);
    osc2.start(now);
    lfo.stop(now + 0.6);
    osc1.stop(now + 0.6);
    osc2.stop(now + 0.6);
  }

  playGuardrailCrash() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Heavy metallic crash + fiery boom
    const noise = ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;

    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(950, now);
    bp.frequency.exponentialRampToValueAtTime(180, now + 0.48);
    bp.Q.value = 0.9;

    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(0.32, now);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.52);

    noise.connect(bp);
    bp.connect(nGain);
    nGain.connect(ctx.destination);
    noise.start(now);
    noise.stop(now + 0.55);

    // Sub-bass explosion thump
    const sub = ctx.createOscillator();
    const sGain = ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(105, now);
    sub.frequency.exponentialRampToValueAtTime(28, now + 0.42);
    sGain.gain.setValueAtTime(0.36, now);
    sGain.gain.exponentialRampToValueAtTime(0.001, now + 0.46);
    sub.connect(sGain);
    sGain.connect(ctx.destination);
    sub.start(now);
    sub.stop(now + 0.48);
  }

  playChainReaction() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    this.playGuardrailCrash();

    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      const t = now + idx * 0.05;
      osc.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.12, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.25);
    });
  }

  playCarEscaped() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Dual-tone luxury car horn passing by + warning drop
    [340, 428].forEach((freq) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.86, now + 0.34);

      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 1100;

      g.gain.setValueAtTime(0.001, now);
      g.gain.linearRampToValueAtTime(0.09, now + 0.03);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.36);

      osc.connect(lp);
      lp.connect(g);
      g.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.38);
    });
  }

  playInfernoStart() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const noise = ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(220, now);
    lp.frequency.exponentialRampToValueAtTime(2800, now + 0.32);
    lp.frequency.exponentialRampToValueAtTime(420, now + 0.8);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.32, now + 0.2);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.85);

    noise.connect(lp);
    lp.connect(gain);
    gain.connect(ctx.destination);
    noise.start(now);
    noise.stop(now + 0.86);

    [220, 330, 440, 660].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now + i * 0.04);
      g.gain.setValueAtTime(0.07, now + i * 0.04);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(now + i * 0.04);
      osc.stop(now + 0.68);
    });
  }

  playWaveComplete() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const chord = [392, 493.88, 587.33, 783.99];
    chord.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      const t = now + idx * 0.075;
      osc.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.11, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.48);
    });
  }

  playGameOver() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = [330, 293.66, 261.63, 196];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sawtooth';
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 720;
      const t = now + idx * 0.16;
      osc.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.12, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.42);
      osc.connect(lp);
      lp.connect(g);
      g.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.45);
    });
  }
}

export const sound = new SoundEngine();
