'use strict';
// ─────────────────────────────────────────────────────────────
//  AUDIO — 블록 음계 + ZzFX 효과음
// ─────────────────────────────────────────────────────────────
(function () {
  let ac = null, master = null;
  let lastNote = 0;
  const PENTA = [0, 2, 4, 7, 9];
  const A = {
    on: true,
    init() {
      if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
      try {
        ac = typeof zzfxX !== 'undefined' ? zzfxX : new AudioContext();
        master = ac.createGain();
        master.gain.value = 0.5;
        master.connect(ac.destination);
        if (ac.state === 'suspended') ac.resume();
      } catch (e) { ac = null; }
    },
    setOn(v) {
      A.on = v;
      if (typeof zzfxV !== 'undefined') zzfxV = v ? 0.12 : 0; // eslint-disable-line no-global-assign
    },
    tone(freq, dur = 0.25, type = 'sine', vol = 0.05, when = 0, slide = 0) {
      if (!A.on || !ac || ac.state !== 'running') return;
      const t = ac.currentTime + when;
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = type; o.frequency.setValueAtTime(freq, t);
      if (slide) o.frequency.exponentialRampToValueAtTime(freq * slide, t + dur);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vol, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(master);
      o.start(t); o.stop(t + dur + 0.02);
    },
    pitch(step, base = 523.25) {
      const oct = Math.floor(step / 5), deg = ((step % 5) + 5) % 5;
      return base * Math.pow(2, oct + PENTA[deg] / 12);
    },
    // blocks sing by height — the world becomes a quiet music box
    note(y, shapeIndex = 0) {
      const now = performance.now();
      if (now - lastNote < 85) return;
      lastNote = now;
      const step = Math.floor(y / 56) % 12;
      const types = ['triangle', 'sine', 'sine', 'triangle', 'sine', 'sine'];
      A.tone(A.pitch(step - 5, 523.25), 0.5, types[shapeIndex] || 'sine', 0.022 + Math.random() * 0.01);
    },
    click() { A.tone(880, 0.06, 'square', 0.018); },
    place(y) { A.tone(A.pitch(Math.floor(y / 56) % 10 - 3), 0.18, 'triangle', 0.05); },
    buy() { A.tone(659, 0.09, 'square', 0.025); A.tone(988, 0.14, 'square', 0.022, 0.07); },
    deny() { A.tone(196, 0.12, 'square', 0.02); },
    pet() { A.tone(1047, 0.12, 'sine', 0.04, 0, 1.5); A.tone(1568, 0.1, 'sine', 0.03, 0.08); },
    pop() { if (A.on && typeof zzfx !== 'undefined') zzfx(...[0.6, 0.05, 520, , 0.01, 0.04, 1, 2.2, , 40]); },
    thunk() { if (A.on && typeof zzfx !== 'undefined') zzfx(...[0.8, 0.05, 110, , 0.01, 0.08, 4, 1.5, -2]); },
    dizzy() { if (A.on && typeof zzfx !== 'undefined') zzfx(...[0.5, 0, 600, 0.02, 0.1, 0.3, 1, 0.5, , , -60, 0.05, , , , , , 0.6, 0.05]); },
    complete() {
      [0, 2, 4, 5, 7, 10].forEach((s, i) => A.tone(A.pitch(s, 392), 0.6, 'triangle', 0.045, i * 0.09));
      A.tone(A.pitch(10, 392) * 2, 1.2, 'sine', 0.03, 0.6);
    },
    reveal() {
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].forEach((s, i) => A.tone(A.pitch(s, 261.6), 1.8, 'sine', 0.03, i * 0.16));
    },
    reset() {
      [9, 7, 4, 2, 0].forEach((s, i) => A.tone(A.pitch(s, 523.25), 0.9, 'sine', 0.035, i * 0.12));
    },
    milestone() { [0, 4, 7, 12].forEach((s, i) => A.tone(A.pitch(s, 196), 0.9, 'triangle', 0.04, i * 0.11)); A.tone(98, 1.2, 'sine', 0.05); },
    era() { [0, 2, 4, 7, 9, 12, 14].forEach((s, i) => A.tone(A.pitch(s, 220), 1.4, 'sine', 0.03, i * 0.32)); A.tone(110, 3, 'triangle', 0.03); },
    farewell() { [7, 4, 2, 0].forEach((s, i) => A.tone(A.pitch(s, 330), 1.1, 'sine', 0.025, i * 0.28)); },
    chip() { A.tone(1800 + Math.random() * 600, 0.03, 'square', 0.008); },
    warp() { A.tone(330, 0.5, 'sine', 0.04, 0, 3); A.tone(660, 0.4, 'triangle', 0.02, 0.1, 0.5); },
    tick() { A.tone(1400, 0.03, 'square', 0.012); },
    unlock() { [0, 4, 7].forEach((s, i) => A.tone(A.pitch(s + 5, 392), 0.5, 'triangle', 0.035, i * 0.07)); },
  };
  A.play = (name, o) => { const f = { fill: () => A.place((o && o.y) || 0), tapEmpty: A.tick, open: A.click, tab: A.click, page: A.click, frame: A.unlock }[name] || A[name]; if (f) f((o && o.y) || 0); };
  T.audio = A;
})();
