// ─────────────────────────────────────────────────────────────
//  موسیقی و افکت‌های صوتی کاملاً سنتزشده با Web Audio API
//  بدون هیچ فایل صوتی خارجی
// ─────────────────────────────────────────────────────────────

const PENTA = [0, 3, 5, 7, 10, 12, 15, 17, 19, 22, 24, 27, 29, 31, 34];

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.muted = false;
    this.started = false;
    this.musicTimer = null;
    this.chordIndex = 0;
  }

  init() {
    if (this.ctx) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.9;
    this.master.connect(this.ctx.destination);

    // یک reverb کوچک برای عمق صحنه
    this.reverb = this.ctx.createConvolver();
    const len = Math.floor(this.ctx.sampleRate * 2.2);
    const buf = this.ctx.createBuffer(2, len, this.ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.7);
      }
    }
    this.reverb.buffer = buf;

    this.reverbGain = this.ctx.createGain();
    this.reverbGain.gain.value = 0.34;
    this.reverbGain.connect(this.reverb);
    this.reverb.connect(this.master);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = 0.85;
    this.sfxGain.connect(this.master);
    this.sfxGain.connect(this.reverbGain);

    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 0.0;
    this.musicGain.connect(this.master);
    this.musicGain.connect(this.reverbGain);

    this.started = true;
  }

  resume() {
    this.init();
    if (this.ctx?.state === 'suspended') this.ctx.resume();
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) {
      this.master.gain.setTargetAtTime(this.muted ? 0 : 0.9, this.ctx.currentTime, 0.08);
    }
    return this.muted;
  }

  // ── ابزارهای پایه ─────────────────────────────────────────
  tone({ freq, type = 'sine', time = 0, dur = 0.35, gain = 0.2, attack = 0.006, dest = null, detune = 0, filter = null }) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + time;
    const osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    osc.detune.setValueAtTime(detune, t0);

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

    let node = osc;
    if (filter) {
      const f = this.ctx.createBiquadFilter();
      f.type = filter.type || 'lowpass';
      f.frequency.setValueAtTime(filter.freq || 1200, t0);
      if (filter.to) f.frequency.exponentialRampToValueAtTime(filter.to, t0 + dur);
      f.Q.value = filter.q ?? 1;
      node.connect(f);
      node = f;
    }
    node.connect(g);
    g.connect(dest || this.sfxGain);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  noise({ time = 0, dur = 0.16, gain = 0.07, hp = 400, lp = 4000, sweepTo = null }) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + time;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.setValueAtTime(hp, t0);
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t0 + dur);
    f.Q.value = 0.8;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f);
    f.connect(g);
    g.connect(this.sfxGain);
    src.start(t0);
  }

  // ── افکت‌ها ───────────────────────────────────────────────
  slide() {
    this.noise({ dur: 0.13, gain: 0.05, hp: 700, sweepTo: 2600 });
  }

  merge(value, streak = 0) {
    const steps = Math.max(1, Math.log2(value / 2));
    const semi = PENTA[Math.min(PENTA.length - 1, steps - 1)];
    const freq = 220 * Math.pow(2, (semi + streak * 2) / 12);
    this.tone({ freq, type: 'sine', dur: 0.42, gain: 0.17 });
    this.tone({ freq: freq * 2, type: 'triangle', dur: 0.26, gain: 0.06, detune: 6 });
    this.tone({ freq: freq * 0.5, type: 'sine', dur: 0.5, gain: 0.07 });
    this.noise({ dur: 0.09, gain: 0.028, hp: 3200, sweepTo: 7000 });
  }

  spawn() {
    this.tone({ freq: 620, type: 'sine', dur: 0.12, gain: 0.045 });
    this.tone({ freq: 930, type: 'sine', dur: 0.1, gain: 0.02, time: 0.02 });
  }

  milestone() {
    const notes = [0, 4, 7, 12];
    notes.forEach((n, i) => {
      this.tone({ freq: 262 * Math.pow(2, n / 12), type: 'triangle', dur: 0.65, gain: 0.11, time: i * 0.085 });
      this.tone({ freq: 262 * Math.pow(2, (n + 12) / 12), type: 'sine', dur: 0.5, gain: 0.035, time: i * 0.085 + 0.01 });
    });
    this.noise({ dur: 0.5, gain: 0.03, hp: 2600, sweepTo: 9000 });
  }

  win() {
    const seq = [0, 4, 7, 12, 16, 19, 24];
    seq.forEach((n, i) => {
      this.tone({ freq: 330 * Math.pow(2, n / 12), type: 'triangle', dur: 1.1, gain: 0.1, time: i * 0.12 });
      this.tone({ freq: 660 * Math.pow(2, n / 12), type: 'sine', dur: 0.8, gain: 0.03, time: i * 0.12 });
    });
  }

  undo() {
    this.tone({ freq: 520, type: 'sine', dur: 0.2, gain: 0.09, filter: { type: 'lowpass', freq: 1600, to: 420 } });
    this.tone({ freq: 390, type: 'sine', dur: 0.24, gain: 0.07, time: 0.06, filter: { type: 'lowpass', freq: 1400, to: 340 } });
  }

  gameOver() {
    const seq = [0, -3, -7, -12];
    seq.forEach((n, i) => {
      this.tone({ freq: 196 * Math.pow(2, n / 12), type: 'sawtooth', dur: 0.9, gain: 0.055, time: i * 0.18, filter: { type: 'lowpass', freq: 900, to: 260 } });
    });
    this.noise({ dur: 0.9, gain: 0.035, hp: 300, sweepTo: 90 });
  }

  click() {
    this.tone({ freq: 740, type: 'sine', dur: 0.09, gain: 0.07 });
    this.tone({ freq: 1180, type: 'sine', dur: 0.06, gain: 0.03, time: 0.01 });
  }

  // ── پد محیطی آرام (موسیقی پس‌زمینه) ────────────────────────
  startMusic() {
    this.init();
    if (!this.ctx || this.musicTimer) return;
    this.musicGain.gain.setTargetAtTime(0.5, this.ctx.currentTime, 1.5);
    this.playChord();
    this.musicTimer = setInterval(() => this.playChord(), 8600);
  }

  playChord() {
    if (!this.ctx) return;
    const roots = [110, 98, 87.31, 130.81];
    const root = roots[this.chordIndex % roots.length];
    this.chordIndex++;
    const chord = [0, 7, 12, 15, 19];
    chord.forEach((n, i) => {
      this.padTone(root * Math.pow(2, n / 12), 8.4, 0.028 + (i === 2 ? 0.012 : 0), i * 0.12);
    });
    // یک جرقه‌ی آرپژ
    for (let i = 0; i < 5; i++) {
      const semi = PENTA[Math.floor(Math.random() * PENTA.length)] + 24;
      this.tone({
        freq: root * 2 * Math.pow(2, semi / 12),
        type: 'sine',
        dur: 1.4,
        gain: 0.012,
        time: 1.8 + i * 0.75 + Math.random() * 0.3,
        dest: this.musicGain,
      });
    }
  }

  padTone(freq, dur, gain, time) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + time;
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    const osc2 = this.ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = freq * 1.005;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + 2.4);
    g.gain.linearRampToValueAtTime(0.0001, t0 + dur);
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 1000;
    osc.connect(f);
    osc2.connect(f);
    f.connect(g);
    g.connect(this.musicGain);
    osc.start(t0);
    osc2.start(t0);
    osc.stop(t0 + dur + 0.1);
    osc2.stop(t0 + dur + 0.1);
  }
}

export const audio = new AudioEngine();
