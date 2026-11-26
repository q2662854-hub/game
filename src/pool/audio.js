/**
 * Fully synthesised soundscape — no external audio files.
 * Everything is built from noise bursts and filtered sine partials so the
 * single-file build stays tiny.
 */
export class PoolAudio {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.volume = 0.9;
    this.ambientStarted = false;
  }

  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return true;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : this.volume;

    const comp = this.ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.knee.value = 22;
    comp.ratio.value = 3.2;
    comp.attack.value = 0.003;
    comp.release.value = 0.22;

    this.master.connect(comp);
    comp.connect(this.ctx.destination);

    // Noise buffer reused by every impact.
    const len = Math.floor(this.ctx.sampleRate * 0.5);
    this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;

    return true;
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) {
      this.master.gain.cancelScheduledValues(this.ctx.currentTime);
      this.master.gain.linearRampToValueAtTime(m ? 0 : this.volume, this.ctx.currentTime + 0.12);
    }
  }

  noiseBurst({ dur = 0.05, freq = 1800, q = 1.2, gain = 0.4, type = 'bandpass', when = 0 }) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + when;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    src.playbackRate.value = 0.8 + Math.random() * 0.5;

    const filt = this.ctx.createBiquadFilter();
    filt.type = type;
    filt.frequency.setValueAtTime(freq, t);
    filt.frequency.exponentialRampToValueAtTime(Math.max(120, freq * 0.32), t + dur);
    filt.Q.value = q;

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.0025);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    src.connect(filt);
    filt.connect(g);
    g.connect(this.master);
    src.start(t);
    src.stop(t + dur + 0.03);
  }

  tone({ freq = 440, dur = 0.12, gain = 0.2, type = 'sine', when = 0, slideTo = null, pan = 0 }) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    let node = g;
    if (pan && this.ctx.createStereoPanner) {
      const p = this.ctx.createStereoPanner();
      p.pan.value = Math.max(-1, Math.min(1, pan));
      g.connect(p);
      node = p;
    }
    osc.connect(g);
    node.connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  // ---------------------------------------------------------------------------
  // Game sounds
  // ---------------------------------------------------------------------------
  ballHit(impact = 1, pan = 0) {
    if (!this.ensure()) return;
    const p = Math.min(1, impact / 3.4);
    const freq = 2600 - p * 900;
    this.noiseBurst({ dur: 0.035, freq, q: 2.4, gain: 0.1 + p * 0.36, when: 0, type: 'bandpass' });
    this.tone({ freq: 1500 + Math.random() * 260, dur: 0.05, gain: 0.03 + p * 0.13, type: 'triangle', pan });
    this.tone({ freq: 640 + Math.random() * 90, dur: 0.09, gain: 0.02 + p * 0.07, type: 'sine', pan });
  }

  cushion(impact = 1, pan = 0) {
    if (!this.ensure()) return;
    const p = Math.min(1, impact / 2.6);
    this.noiseBurst({ dur: 0.07, freq: 700, q: 0.9, gain: 0.06 + p * 0.16, type: 'lowpass' });
    this.tone({ freq: 210, dur: 0.08, gain: 0.03 + p * 0.06, type: 'sine', pan });
  }

  cueStrike(power = 1, pan = 0) {
    if (!this.ensure()) return;
    this.noiseBurst({ dur: 0.045, freq: 3100, q: 1.6, gain: 0.14 + power * 0.24, type: 'bandpass' });
    this.tone({ freq: 900 + power * 320, dur: 0.07, gain: 0.05 + power * 0.1, type: 'triangle', pan });
    this.tone({ freq: 176, dur: 0.11, gain: 0.05 + power * 0.08, type: 'sine', pan });
  }

  pocket() {
    if (!this.ensure()) return;
    this.noiseBurst({ dur: 0.22, freq: 520, q: 0.7, gain: 0.22, type: 'lowpass' });
    this.tone({ freq: 320, slideTo: 120, dur: 0.18, gain: 0.1, type: 'sine' });
    // Rattle at the bottom of the cup.
    for (let i = 0; i < 3; i++) {
      this.tone({
        freq: 420 + Math.random() * 320,
        dur: 0.05,
        gain: 0.055,
        type: 'triangle',
        when: 0.12 + i * 0.075 + Math.random() * 0.03
      });
    }
  }

  foul() {
    if (!this.ensure()) return;
    this.tone({ freq: 300, slideTo: 170, dur: 0.28, gain: 0.11, type: 'sawtooth' });
    this.tone({ freq: 226, slideTo: 128, dur: 0.34, gain: 0.07, type: 'sine', when: 0.02 });
  }

  pot(n = 1) {
    if (!this.ensure()) return;
    const scale = [523.25, 659.25, 783.99, 1046.5, 1318.5, 1567.98];
    const base = scale[Math.min(scale.length - 1, n - 1)];
    this.tone({ freq: base, dur: 0.28, gain: 0.1, type: 'sine' });
    this.tone({ freq: base * 1.5, dur: 0.34, gain: 0.06, type: 'sine', when: 0.035 });
    this.tone({ freq: base * 2, dur: 0.42, gain: 0.035, type: 'triangle', when: 0.07 });
  }

  win() {
    if (!this.ensure()) return;
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.51];
    notes.forEach((f, i) => {
      this.tone({ freq: f, dur: 0.5, gain: 0.1, type: 'triangle', when: i * 0.11 });
      this.tone({ freq: f * 2, dur: 0.4, gain: 0.045, type: 'sine', when: i * 0.11 + 0.01 });
    });
  }

  lose() {
    if (!this.ensure()) return;
    const notes = [392, 329.63, 261.63, 196];
    notes.forEach((f, i) => {
      this.tone({ freq: f, dur: 0.5, gain: 0.09, type: 'sawtooth', when: i * 0.14 });
    });
  }

  uiClick() {
    if (!this.ensure()) return;
    this.tone({ freq: 1250, dur: 0.05, gain: 0.05, type: 'sine' });
  }

  /** Low, warm room tone so silence never feels broken. */
  startAmbient() {
    if (!this.ensure() || this.ambientStarted) return;
    this.ambientStarted = true;
    const t = this.ctx.currentTime;
    const g = this.ctx.createGain();
    g.gain.value = 0;
    g.gain.linearRampToValueAtTime(0.035, t + 3);
    g.connect(this.master);

    [55, 82.5, 110, 164.8].forEach((f, i) => {
      const o = this.ctx.createOscillator();
      o.type = i % 2 ? 'triangle' : 'sine';
      o.frequency.value = f;
      const og = this.ctx.createGain();
      og.gain.value = i === 0 ? 0.5 : 0.18 / (i + 1);
      const lfo = this.ctx.createOscillator();
      lfo.frequency.value = 0.06 + i * 0.031;
      const lfoGain = this.ctx.createGain();
      lfoGain.gain.value = og.gain.value * 0.6;
      lfo.connect(lfoGain);
      lfoGain.connect(og.gain);
      o.connect(og);
      og.connect(g);
      o.start();
      lfo.start();
    });
  }
}

export const poolAudio = new PoolAudio();
