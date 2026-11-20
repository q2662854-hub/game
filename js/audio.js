/* =========================================================
   audio.js — همه‌ی صداها با WebAudio ساخته می‌شوند (بدون فایل)
   ========================================================= */
window.SFX = (function () {
  'use strict';

  let ac = null, master = null, noiseBuf = null;
  let muted = false;

  function init() {
    if (ac) {
      if (ac.state === 'suspended') ac.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ac = new AC();
    master = ac.createGain();
    master.gain.value = 0.55;
    master.connect(ac.destination);

    // بافر نویز
    const len = ac.sampleRate * 1.2;
    noiseBuf = ac.createBuffer(1, len, ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }

  function now() { return ac ? ac.currentTime : 0; }

  function noise(dur, type, freq, freqTo, gain, q) {
    if (!ac || muted) return;
    const src = ac.createBufferSource();
    src.buffer = noiseBuf;
    src.loop = true;
    const f = ac.createBiquadFilter();
    f.type = type || 'bandpass';
    f.frequency.setValueAtTime(freq, now());
    if (freqTo) f.frequency.exponentialRampToValueAtTime(Math.max(40, freqTo), now() + dur);
    f.Q.value = q || 1;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, now());
    g.gain.exponentialRampToValueAtTime(gain, now() + Math.min(0.02, dur * 0.2));
    g.gain.exponentialRampToValueAtTime(0.0001, now() + dur);
    src.connect(f); f.connect(g); g.connect(master);
    src.start(); src.stop(now() + dur + 0.05);
  }

  function tone(freq, dur, type, gain, freqTo, delay) {
    if (!ac || muted) return;
    const t0 = now() + (delay || 0);
    const o = ac.createOscillator();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t0);
    if (freqTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, freqTo), t0 + dur);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(master);
    o.start(t0); o.stop(t0 + dur + 0.05);
  }

  return {
    init,
    setMuted(v) { muted = v; if (master) master.gain.value = v ? 0 : 0.55; },
    isMuted() { return muted; },

    throw() {
      noise(0.28, 'bandpass', 1100, 220, 0.30, 1.2);
      tone(420, 0.18, 'triangle', 0.06, 180);
    },
    glass() {
      noise(0.35, 'highpass', 1800, 5200, 0.30, 0.7);
      for (let i = 0; i < 5; i++) {
        tone(1800 + Math.random() * 3200, 0.10 + Math.random() * 0.18, 'triangle',
             0.05 + Math.random() * 0.05, 900 + Math.random() * 1200, i * 0.012);
      }
    },
    crack() {
      noise(0.12, 'highpass', 2600, 4200, 0.20, 0.9);
      tone(2600, 0.08, 'square', 0.03, 1500);
    },
    metal() {
      noise(0.16, 'bandpass', 2400, 700, 0.22, 0.8);
      tone(230, 0.14, 'square', 0.05, 90);
    },
    crash() {
      noise(0.7, 'lowpass', 1600, 160, 0.42, 0.4);
      tone(120, 0.6, 'sawtooth', 0.16, 34);
      tone(70, 0.9, 'sine', 0.20, 28);
    },
    boom() {
      noise(0.5, 'lowpass', 600, 90, 0.35, 0.6);
      tone(90, 0.5, 'sine', 0.22, 30);
    },
    yes(n) {
      const base = 520 + Math.min(n || 1, 6) * 70;
      tone(base, 0.10, 'triangle', 0.10, base * 1.6);
      tone(base * 2, 0.09, 'sine', 0.05, base * 2.6, 0.05);
    },
    ui() { tone(660, 0.07, 'triangle', 0.07, 880); },
    over() {
      tone(440, 0.25, 'triangle', 0.12, 330);
      tone(330, 0.35, 'triangle', 0.12, 220, 0.18);
      tone(220, 0.6, 'sine', 0.14, 110, 0.4);
    },
    record() {
      [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.22, 'triangle', 0.10, f, i * 0.11));
    }
  };
})();
