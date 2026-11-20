/* ===========================================================
   شیشه‌شکن — audio (synthesized, no external files)
   =========================================================== */
const SFX = (() => {
  let ctx = null, master = null, enabled = true, noiseBuf = null;
  let sirenNodes = null;

  function init() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.5;
    // gentle limiter-ish
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.knee.value = 18; comp.ratio.value = 6;
    comp.attack.value = 0.003; comp.release.value = 0.25;
    master.connect(comp); comp.connect(ctx.destination);

    // reusable noise buffer
    const len = ctx.sampleRate * 2;
    noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }

  function resume() {
    init();
    if (ctx && ctx.state === 'suspended') ctx.resume();
  }

  function now() { return ctx.currentTime; }

  function noise(dur, { filter = 'bandpass', freq = 1200, q = 1, gain = 0.3, decay = dur, freqEnd = null, delay = 0 } = {}) {
    if (!ctx || !noiseBuf || !enabled) return;
    const t = now() + delay;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    src.loop = true;
    src.playbackRate.value = rand(0.85, 1.2);
    const f = ctx.createBiquadFilter();
    f.type = filter; f.frequency.setValueAtTime(freq, t);
    if (freqEnd) f.frequency.exponentialRampToValueAtTime(Math.max(40, freqEnd), t + dur);
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t); src.stop(t + dur + 0.05);
  }

  function tone(freq, dur, { type = 'sine', gain = 0.2, delay = 0, freqEnd = null, attack = 0.006 } = {}) {
    if (!ctx || !enabled) return;
    const t = now() + delay;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (freqEnd) o.frequency.exponentialRampToValueAtTime(Math.max(30, freqEnd), t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur + 0.05);
  }

  const api = {
    resume,
    setEnabled(v) { enabled = v; if (master) master.gain.value = v ? 0.5 : 0; if (!v) api.stopSiren(); },
    isEnabled() { return enabled; },

    throwStone() {
      noise(0.22, { filter: 'bandpass', freq: 700, freqEnd: 2400, q: 1.2, gain: 0.16, decay: 0.2 });
      tone(220, 0.18, { type: 'triangle', gain: 0.08, freqEnd: 520 });
    },

    woosh() { noise(0.16, { filter: 'highpass', freq: 900, freqEnd: 2600, gain: 0.1, decay: 0.14 }); },

    /* glass shatter: bright noise burst + sparkle highs */
    glass() {
      noise(0.55, { filter: 'highpass', freq: 2600, q: 0.6, gain: 0.34, decay: 0.5 });
      noise(0.3, { filter: 'bandpass', freq: 5200, q: 3, gain: 0.22, decay: 0.28 });
      for (let i = 0; i < 5; i++) {
        tone(rand(2400, 6200), rand(0.05, 0.13), { type: 'triangle', gain: 0.05, delay: rand(0, 0.22) });
      }
    },

    /* car body hit: dull metal thud */
    thud() {
      tone(rand(70, 110), 0.2, { type: 'sine', gain: 0.3, freqEnd: 42 });
      noise(0.16, { filter: 'lowpass', freq: 900, gain: 0.18, decay: 0.14 });
      tone(rand(900, 1500), 0.07, { type: 'square', gain: 0.03 });
    },

    /* the satisfying part: car wrecking out */
    wreck() {
      noise(1.1, { filter: 'lowpass', freq: 2200, freqEnd: 260, gain: 0.34, decay: 1.0 });
      noise(0.8, { filter: 'highpass', freq: 3200, gain: 0.16, decay: 0.7 });
      tone(150, 0.9, { type: 'sawtooth', gain: 0.16, freqEnd: 40 });
      for (let i = 0; i < 6; i++) {
        tone(rand(2000, 6500), rand(0.06, 0.16), { type: 'triangle', gain: 0.06, delay: rand(0, 0.5) });
      }
      noise(0.5, { filter: 'bandpass', freq: 500, q: 1.4, gain: 0.2, delay: 0.18, decay: 0.4 });
    },

    chirp() {
      noise(0.1, { filter: 'bandpass', freq: 2200, q: 4, gain: 0.1, decay: 0.08 });
    },

    combo(n) {
      const base = 420 * Math.pow(1.06, Math.min(n, 22));
      tone(base, 0.12, { type: 'triangle', gain: 0.1 });
      tone(base * 1.5, 0.16, { type: 'sine', gain: 0.07, delay: 0.05 });
    },

    levelUp() {
      [0, 4, 7, 12].forEach((s, i) => {
        tone(392 * Math.pow(2, s / 12), 0.35, { type: 'triangle', gain: 0.13, delay: i * 0.09 });
      });
      noise(0.5, { filter: 'highpass', freq: 4000, gain: 0.08, decay: 0.4, delay: 0.1 });
    },

    over() {
      [0, -3, -7, -12].forEach((s, i) => {
        tone(330 * Math.pow(2, s / 12), 0.6, { type: 'sine', gain: 0.16, delay: i * 0.16 });
      });
    },

    overheat() {
      noise(0.45, { filter: 'bandpass', freq: 3400, freqEnd: 900, q: 2, gain: 0.16, decay: 0.4 });
      tone(300, 0.35, { type: 'sawtooth', gain: 0.07, freqEnd: 130 });
    },

    cooled() { tone(600, 0.18, { type: 'sine', gain: 0.09, freqEnd: 900 }); },

    click() { tone(700, 0.05, { type: 'square', gain: 0.04 }); },

    startSiren() {
      if (!ctx || !enabled || sirenNodes) return;
      const t0 = now();
      const o = ctx.createOscillator();
      o.type = 'triangle';
      const lfo = ctx.createOscillator();
      const lg = ctx.createGain();
      const g = ctx.createGain();
      o.frequency.value = 900;
      lfo.frequency.value = 1.6;
      lg.gain.value = 320;
      lfo.connect(lg); lg.connect(o.frequency);
      g.gain.value = 0.0;
      g.gain.linearRampToValueAtTime(0.035, t0 + 0.6);
      o.connect(g); g.connect(master);
      o.start(); lfo.start();
      sirenNodes = { o, lfo, g };
    },

    stopSiren() {
      if (!sirenNodes || !ctx) return;
      const { o, lfo, g } = sirenNodes;
      const t = now();
      try {
        g.gain.cancelScheduledValues(t);
        g.gain.setValueAtTime(g.gain.value, t);
        g.gain.linearRampToValueAtTime(0.0001, t + 0.35);
        o.stop(t + 0.4); lfo.stop(t + 0.4);
      } catch (e) {}
      sirenNodes = null;
    }
  };
  return api;
})();
