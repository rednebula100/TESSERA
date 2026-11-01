'use strict';
// ─────────────────────────────────────────────────────────────
//  AUDIO — 효과음 엔진 (v4)
//  · audio/*.mp3: Kenney(CC0)와 uisfx(CC0)에서 골라 음량을 맞춘 효과음 (audio/CREDITS.md)
//  · 버스: ui / sfx(세계) → 덕킹 → 마스터 → 컴프레서. 효과음마다 음량, 음높이 흔들림, 동시 재생 수, 최소 간격
//  · 블록 소리는 높이에 따라 5음계로 음높이를 바꿔 「음악 상자」를 유지 (블록 착지는 ZzFX 합성 음)
//  · file:// 처럼 불러올 수 없을 때는 합성음으로 대신합니다
// ─────────────────────────────────────────────────────────────
(function () {
  let ac = null, master = null, comp = null, duckNode = null, bus = {}, analyser = null;
  const buffers = {};
  const last = {}, active = {};
  let lastNote = 0, loaded = false, loading = false;
  const PENTA = [0, 2, 4, 7, 9];

  // bus, volume, random pitch (semitones), max voices, min gap (s); music: pitch follows height
  const C = (bus, vol, rand = 0, voices = 3, gap = 0.03, extra = {}) => Object.assign({ bus, vol, rand, voices, gap }, extra);
  const CUES = {
    place: C('sfx', 0.75, 0, 6, 0.02, { music: true }), fill: C('sfx', 0.8, 0.5, 6, 0.02, { music: true }), tapEmpty: C('ui', 0.6, 1, 2, 0.06),
    land: C('sfx', 0.35, 1.5, 4, 0.05, { world: true }), pet: C('sfx', 0.8, 1, 2, 0.08), lift: C('sfx', 0.7, 0.5, 2, 0.1), drop: C('sfx', 0.7, 0.5, 2, 0.1),
    buy: C('ui', 0.75, 0.6, 3, 0.04), buyMany: C('ui', 0.8, 0.3, 2, 0.08), hire: C('sfx', 0.8, 0.5, 2, 0.08), levelup: C('ui', 0.7, 0.4, 3, 0.05),
    deny: C('ui', 0.6, 0, 1, 0.15), unlock: C('ui', 0.85, 0, 1, 0.2), ready: C('ui', 0.8, 0, 1, 0.5),
    blueprint: C('sfx', 0.8, 0, 1, 0.2), frame: C('sfx', 0.85, 0, 2, 0.2, { world: true }), complete: C('sfx', 1, 0, 1, 0.3), stamp: C('sfx', 0.9, 0, 1, 0.2),
    chip: C('sfx', 0.45, 2, 3, 0.05, { world: true }), paint: C('sfx', 0.4, 2, 3, 0.07, { world: true }), demolish: C('sfx', 0.85, 1, 2, 0.15, { world: true }), knock: C('sfx', 0.5, 2, 3, 0.06, { world: true }),
    warpIn: C('sfx', 0.75, 0, 2, 0.2, { world: true }), warpOut: C('sfx', 0.75, 0, 2, 0.2, { world: true }),
    tab: C('ui', 0.7, 0, 1, 0.05), open: C('ui', 0.7, 0, 1, 0.08), close: C('ui', 0.6, 0, 1, 0.08), page: C('ui', 0.6, 0.5, 2, 0.06), expand: C('ui', 0.6), collapse: C('ui', 0.6),
    tick: C('ui', 0.55, 0.5, 2, 0.04), toggleOn: C('ui', 0.7), toggleOff: C('ui', 0.7), guide: C('ui', 0.75, 0, 1, 0.5), check: C('ui', 0.75, 0, 1, 0.2), count: C('ui', 0.55, 0, 1, 0.3),
    birth: C('sfx', 0.8, 0, 1, 0.5), farewell: C('sfx', 0.8, 0, 1, 0.5), morning: C('sfx', 0.6, 0, 1, 2), night: C('sfx', 0.6, 0, 1, 2), sky: C('sfx', 0.9, 0, 1, 1),
    reset: C('ui', 1, 0, 1, 0.5), resetQuick: C('ui', 0.9, 0, 1, 0.3), vertex: C('ui', 1, 0, 1, 0.3), grain: C('ui', 0.9, 0, 1, 0.3), prism: C('ui', 1, 0, 1, 0.3), drip: C('ui', 0.8, 3, 4, 0.03),
    slam: C('ui', 1, 0, 1, 0.3), lamp: C('ui', 0.8, 0, 3, 0.05), era: C('ui', 1, 0, 1, 1), pillar: C('ui', 1, 0, 1, 0.5), reward: C('ui', 0.85, 0, 4, 0.05), milestone: C('ui', 1, 0, 1, 0.5), credits: C('ui', 1, 0, 1, 1),
  };
  // per-layer accent for the reset curtain
  ['reset1', 'reset2', 'reset3', 'reset4', 'reset5', 'reset6'].forEach((k) => (CUES[k] = Object.assign({}, CUES.reset, { file: 'reset' })));

  const S = () => (T.G && T.G.s) || { settings: { vol: { master: 0.8, sfx: 0.9, ui: 0.7 }, sound: true } };
  const A = { on: true, cues: CUES, failed: false };

  A.init = function () {
    if (ac) { if (ac.state === 'suspended') ac.resume(); if (!loaded && !loading) load(); return; }
    try {
      ac = typeof zzfxX !== 'undefined' ? zzfxX : new AudioContext();
      comp = ac.createDynamicsCompressor();
      comp.threshold.value = -14; comp.knee.value = 10; comp.ratio.value = 3; comp.attack.value = 0.004; comp.release.value = 0.18;
      master = ac.createGain();
      duckNode = ac.createGain();
      analyser = ac.createAnalyser(); analyser.fftSize = 1024;
      bus.ui = ac.createGain(); bus.sfx = ac.createGain(); bus.synth = ac.createGain();
      bus.sfx.connect(duckNode); bus.synth.connect(duckNode);
      duckNode.connect(master); bus.ui.connect(master);
      master.connect(comp); comp.connect(analyser); analyser.connect(ac.destination);
      A.applyVolume();
      if (ac.state === 'suspended') ac.resume();
      load();
    } catch (e) { ac = null; }
  };
  function load() {
    if (loading || !ac) return;
    loading = true;
    const names = [...new Set(Object.keys(CUES).map((k) => CUES[k].file || k))];
    let left = names.length, ok = 0;
    for (const n of names) {
      fetch('audio/' + n + '.mp3').then((r) => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
        .then((b) => ac.decodeAudioData(b)).then((buf) => { buffers[n] = buf; ok++; })
        .catch(() => {}).finally(() => { if (--left === 0) { loaded = true; A.failed = ok === 0; A.loadedCount = ok; } });
    }
  }
  A.applyVolume = function () {
    if (!ac) return;
    const v = S().settings.vol || { master: 0.8, sfx: 0.9, ui: 0.7 };
    const t = ac.currentTime;
    master.gain.setTargetAtTime(A.on ? v.master : 0, t, 0.03);
    bus.sfx.gain.setTargetAtTime(v.sfx, t, 0.03);
    bus.synth.gain.setTargetAtTime(v.sfx * 0.9, t, 0.03);
    bus.ui.gain.setTargetAtTime(v.ui, t, 0.03);
  };
  A.setOn = function (v) {
    A.on = v;
    if (typeof zzfxV !== 'undefined') zzfxV = v ? 0.12 : 0; // eslint-disable-line no-global-assign
    A.applyVolume();
  };
  // sequences lower the world (not the UI) and bring it back with a fade
  A.duck = function (on) { if (!ac) return; duckNode.gain.cancelScheduledValues(ac.currentTime); duckNode.gain.setTargetAtTime(on ? 0.3 : 1, ac.currentTime, on ? 0.08 : 0.35); };

  // play a cue. o: { y (height → pentatonic pitch), x (world x → pan, distance), i (index → rising pitch), force }
  A.play = function (name, o = {}) {
    const cue = CUES[name];
    if (!A.on || !ac || ac.state !== 'running') return;
    if (!cue) { const f = A[name]; if (typeof f === 'function' && f !== A.play) f(); return; }
    const now = ac.currentTime;
    if (!o.force && last[name] !== undefined && now - last[name] < cue.gap) return;
    active[name] = (active[name] || []).filter((s) => s.end > now);
    if (active[name].length >= cue.voices) { if (!o.force) return; }
    last[name] = now;
    const buf = buffers[cue.file || name];
    if (!buf) { synthFallback(name, o); return; }
    let semi = (Math.random() * 2 - 1) * cue.rand;
    if (cue.music && o.y !== undefined) semi = pentaSemi(o.y);
    if (o.i !== undefined) semi += [0, 2, 4, 7, 9, 12, 14, 16, 19][o.i % 9];
    let vol = cue.vol;
    const src = ac.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = Math.pow(2, semi / 12);
    const g = ac.createGain();
    let node = src;
    if (cue.world && o.x !== undefined && T.cam && T.w2s) {
      // world sounds: pan by screen position, quieter when far or zoomed out
      const [sx] = T.w2s(o.x, 0);
      const W = T.cam.W || innerWidth;
      const off = sx < -40 || sx > W + 40;
      vol *= T.clamp(T.cam.z, 0.25, 1) * (off ? 0.35 : 1);
      if (ac.createStereoPanner) { const p = ac.createStereoPanner(); p.pan.value = T.clamp((sx - W / 2) / (W / 2), -1, 1) * 0.55; node.connect(p); node = p; }
    }
    g.gain.value = vol;
    node.connect(g); g.connect(bus[cue.bus] || bus.sfx);
    src.start();
    active[name].push({ end: now + buf.duration / src.playbackRate.value });
  };
  function pentaSemi(y) {
    const step = Math.floor(Math.max(0, y) / 56) % 10 - 3;
    const oct = Math.floor(step / 5), deg = ((step % 5) + 5) % 5;
    return oct * 12 + PENTA[deg];
  }
  // meter: the loudest sample on the master over the next 700ms (for the dev sound board)
  A.meter = function (cb) {
    if (!analyser) return;
    const data = new Float32Array(analyser.fftSize);
    let peak = 0; const t0 = performance.now();
    const step = () => { analyser.getFloatTimeDomainData(data); for (const v of data) peak = Math.max(peak, Math.abs(v)); if (performance.now() - t0 < 700) requestAnimationFrame(step); else cb(peak); };
    step();
  };

  // ── synthesis: the music box, and stand-ins when files are unavailable ──
  A.tone = function (freq, dur = 0.25, type = 'sine', vol = 0.05, when = 0, slide = 0) {
    if (!A.on || !ac || ac.state !== 'running') return;
    const t = ac.currentTime + when;
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(freq * slide, t + dur);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(bus.synth);
    o.start(t); o.stop(t + dur + 0.02);
  };
  A.pitch = (step, base = 523.25) => { const oct = Math.floor(step / 5), deg = ((step % 5) + 5) % 5; return base * Math.pow(2, oct + PENTA[deg] / 12); };
  // blocks sing by height — the world becomes a quiet music box
  A.note = function (y, shapeIndex = 0) {
    const now = performance.now();
    if (now - lastNote < 95) return;
    lastNote = now;
    const step = Math.floor(y / 56) % 12;
    A.tone(A.pitch(step - 5, 523.25), 0.5, ['triangle', 'sine', 'sine', 'triangle', 'sine', 'sine'][shapeIndex] || 'sine', 0.016 + Math.random() * 0.008);
  };
  const SYN = {
    tick: () => A.tone(880, 0.05, 'square', 0.014), tab: () => A.tone(660, 0.06, 'square', 0.016), open: () => A.tone(523, 0.08, 'triangle', 0.03), close: () => A.tone(392, 0.08, 'triangle', 0.03),
    page: () => A.tone(740, 0.05, 'square', 0.012), place: (o) => A.tone(A.pitch(Math.floor((o.y || 0) / 56) % 10 - 3), 0.18, 'triangle', 0.05), fill: (o) => A.tone(A.pitch(Math.floor((o.y || 0) / 56) % 10 - 1), 0.16, 'triangle', 0.05),
    buy: () => { A.tone(659, 0.09, 'square', 0.025); A.tone(988, 0.14, 'square', 0.022, 0.07); }, buyMany: () => [0, 2, 4].forEach((s, i) => A.tone(A.pitch(s + 5), 0.1, 'square', 0.02, i * 0.05)),
    deny: () => A.tone(196, 0.12, 'square', 0.02), pet: () => { A.tone(1047, 0.12, 'sine', 0.04, 0, 1.5); A.tone(1568, 0.1, 'sine', 0.03, 0.08); },
    hire: () => { A.tone(784, 0.1, 'triangle', 0.04); A.tone(1175, 0.14, 'triangle', 0.035, 0.08); }, unlock: () => [0, 4, 7].forEach((s, i) => A.tone(A.pitch(s + 5, 392), 0.5, 'triangle', 0.035, i * 0.07)),
    complete: () => { [0, 2, 4, 5, 7, 10].forEach((s, i) => A.tone(A.pitch(s, 392), 0.6, 'triangle', 0.045, i * 0.09)); A.tone(A.pitch(10, 392) * 2, 1.2, 'sine', 0.03, 0.6); },
    demolish: () => { if (typeof zzfx !== 'undefined') zzfx(...[0.8, 0.05, 110, , 0.01, 0.08, 4, 1.5, -2]); }, chip: () => A.tone(1800 + Math.random() * 600, 0.03, 'square', 0.008),
    warpIn: () => A.tone(330, 0.5, 'sine', 0.04, 0, 3), warpOut: () => A.tone(660, 0.4, 'triangle', 0.03, 0, 0.5),
    farewell: () => [7, 4, 2, 0].forEach((s, i) => A.tone(A.pitch(s, 330), 1.1, 'sine', 0.025, i * 0.28)),
    reset: () => [9, 7, 4, 2, 0].forEach((s, i) => A.tone(A.pitch(s, 523.25), 0.9, 'sine', 0.035, i * 0.12)),
    era: () => { [0, 2, 4, 7, 9, 12, 14].forEach((s, i) => A.tone(A.pitch(s, 220), 1.4, 'sine', 0.03, i * 0.32)); A.tone(110, 3, 'triangle', 0.03); },
    pillar: () => { [0, 4, 7, 12].forEach((s, i) => A.tone(A.pitch(s, 196), 0.9, 'triangle', 0.04, i * 0.11)); A.tone(98, 1.2, 'sine', 0.05); },
    reward: (o) => A.tone(A.pitch(5 + (o.i || 0), 392), 0.3, 'triangle', 0.035), lamp: (o) => A.tone(A.pitch(3 + (o.i || 0), 392), 0.4, 'sine', 0.035),
  };
  function synthFallback(name, o) {
    const base = name.replace(/\d+$/, '');
    const f = SYN[name] || SYN[base] || (CUES[name] && CUES[name].bus === 'ui' ? SYN.tick : null);
    if (f) f(o || {});
  }
  // the colour reveal keeps its long synth arpeggio (it is music, not an effect)
  A.reveal = () => [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].forEach((s, i) => A.tone(A.pitch(s, 261.6), 1.8, 'sine', 0.03, i * 0.16));
  A.dizzy = () => { if (A.on && typeof zzfx !== 'undefined') zzfx(...[0.5, 0, 600, 0.02, 0.1, 0.3, 1, 0.5, , , -60, 0.05, , , , , , 0.6, 0.05]); };
  // older call sites
  A.click = () => A.play('tick');
  A.buy = () => A.play('buy');
  A.deny = () => A.play('deny');
  A.unlock = () => A.play('unlock');
  A.place = (y) => A.play('place', { y });
  A.pet = () => A.play('pet');
  A.pop = () => A.play('lift');
  A.thunk = () => A.play('demolish');
  A.complete = () => { A.play('complete'); setTimeout(() => A.play('stamp'), 480); };
  A.chip = () => A.play('chip');
  A.farewell = () => A.play('farewell');
  A.tick = () => A.play('tick');
  A.reset = () => A.play('reset');
  A.milestone = () => A.play('milestone');
  A.era = () => A.play('era');
  A.warp = () => A.play('warpOut');
  T.audio = A;
})();
