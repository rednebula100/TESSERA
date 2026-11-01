'use strict';
// ─────────────────────────────────────────────────────────────
//  ENTITIES: 건축가, 일꾼, 아기, 방울(채색), 톡톡(다듬기), 쿵쿵(철거), 폴짝(겹 건너기)
// ─────────────────────────────────────────────────────────────
(function () {
  const B = T.B;
  const P = 1.15;
  const GRAV = 1100;
  const archs = [], workers = [], kids = [], painters = [], splitters = [], demos = [], warpers = [];
  const flights = [];
  let hover = null;
  const S = () => T.G.s;
  const all = () => archs.concat(workers, kids, painters, splitters, demos, warpers);
  const PAINT_COLS = ['#f29fae', '#8ecae6', '#b8e0a1', '#ffd166', '#c3a6ff', '#ffb38a'];
  const PET = {
    painter: { list: painters, sprite: 'drop', name: '방울', role: '채색 주민', up: ['gup', 'painter'], need: (s) => s.flags.l4Done > 0 },
    splitter: { list: splitters, sprite: 'chisel', name: '톡톡', role: '다듬기 주민', up: ['sup', 'chisel'], need: (s) => s.flags.l2Done > 0 },
    demo: { list: demos, sprite: 'demo', name: '쿵쿵', role: '철거 주민', up: ['lup', 'demo'], need: (s) => s.era >= 1 },
    warper: { list: warpers, sprite: 'portal', name: '폴짝', role: '겹 건너기 주민', up: ['zup', 'warper'], need: (s) => s.flags.l5Done > 0 },
  };
  T.PET = PET;

  function base(kind, d) {
    return {
      kind, d, x: (Math.random() - 0.5) * 120, y: 0, vx: 0, vy: 0, st: 'idle', t: 1 + Math.random() * 2,
      dir: Math.random() < 0.5 ? -1 : 1, phase: Math.random() * 10, blinkT: 2 + Math.random() * 4, blink: 0,
      happyT: 0, surpriseT: 0, dizzyT: 0, mournT: 0, sleepyT: 0, petT: 0, sq: 0, look: [0, 0], lookAt: null, lookT: 0,
      bubble: null, held: false, emote: null, emoteT: 0, inside: null, insideT: 0, happy: 0, visitBuff: 0, proj: null, walkTo: null,
      emoteCD: 10 + Math.random() * 30, col: PAINT_COLS[Math.floor(Math.random() * PAINT_COLS.length)],
    };
  }
  const zOf = (e) => (e.d && e.d.z) || 0;
  function motifFor(e) { if (!e.motif) { e.motif = new T.Motif(T.SHAPE[e.d.s], e.d.o); e.pos = []; } return e.motif; }

  function spawnArch(d, silent) {
    const e = base('arch', d);
    if (d.life === undefined) d.life = T.vil.maxLife();
    archs.push(e);
    if (!silent) { e.x = T.clamp(T.cam.x + (Math.random() - 0.5) * Math.min(300, (T.cam.W / T.cam.z) * 0.4), -6000, 6000); e.y = 240 + Math.random() * 60; e.vy = -40; e.surpriseT = 1.2; e.t = 1.2; d.z = T.view(); T.fx.poof(e.x, e.y + 8); e.bubble = { text: ['안녕!', '반가워', '왔어요!', '일할게요'][Math.floor(Math.random() * 4)], t: 1.8 }; }
    return e;
  }
  function spawnWorker(d) { const e = base('worker', d); if (d.life === undefined) d.life = T.vil.maxLife(); workers.push(e); return e; }
  function spawnKid(d, house) { const e = base('kid', d); if (house) { const sh = T.st.shape(house); e.x = house.x + (sh.w * B) / 2; e.y = 30; e.vy = 80; } kids.push(e); return e; }
  function growUp(kidD, workerD) {
    const k = kids.find((e) => e.d === kidD);
    const e = spawnWorker(workerD);
    if (k) { e.x = k.x; kids.splice(kids.indexOf(k), 1); }
    e.vy = 160; e.happyT = 2; e.bubble = { text: '다 컸다!', t: 1.6 };
  }
  function removeEntity(e) {
    for (const list of [archs, workers, kids, painters, splitters, demos, warpers]) { const i = list.indexOf(e); if (i >= 0) list.splice(i, 1); }
    if (e.proj) T.st.rt(e.proj).workers.delete(e);
    if (hover === e) hover = null;
  }
  function rebuild() {
    for (const l of [archs, workers, kids, painters, splitters, demos, warpers]) l.length = 0;
    flights.length = 0;
    const s = S();
    for (const d of s.archs) {
      const e = spawnArch(d, true);
      if (s.flags.rosette && d.n) { const m = motifFor(e); for (let i = 0; i < d.n; i++) { const p = m.next(); e.pos.push(p); T.world.drawBlock(p[0], p[1], T.G.archColor(d), false, 'back', 0); } }
    }
    for (const d of s.workers) spawnWorker(d);
    for (const d of s.kids) spawnKid(d);
    for (const e of archs.concat(workers, kids)) {
      const h = e.d.home && T.st.byUid(e.d.home);
      e.x = h ? h.x + Math.random() * T.st.shape(h).w * B : (Math.random() - 0.5) * Math.min(800, 200 + s.structs.length * 30);
    }
    syncPets();
  }
  function syncPets() {
    const s = S();
    s.petWait = s.petWait || {};
    for (const kind in PET) {
      const P2 = PET[kind];
      const want = P2.need(s) ? 1 + (s[P2.up[0]][P2.up[1]] || 0) : 0;
      let ds = s.pets.filter((p) => p.kind === kind);
      while (ds.length > want) { const d = ds.pop(); s.pets.splice(s.pets.indexOf(d), 1); }
      while (ds.length < want && !(s.petWait[kind] > 0)) { const d = { kind, s: 'square', name: P2.name + (ds.length ? ' ' + (ds.length + 1) : ''), life: T.vil.maxLife(), home: 0, z: 0 }; s.pets.push(d); ds.push(d); }
      // runtime entities follow the saved residents
      const list = P2.list;
      for (let i = list.length - 1; i >= 0; i--) if (!ds.includes(list[i].d)) list.splice(i, 1);
      for (const d of ds) if (!list.some((e) => e.d === d)) { const e = base(kind, d); e.y = 200; e.vy = -20; e.x = T.cam.x + (Math.random() - 0.5) * 120; list.push(e); }
    }
  }
  function tickPetWait(dt) { const w = S().petWait; if (!w) return; for (const k in w) if (w[k] > 0) { w[k] -= dt; if (w[k] <= 0) syncPets(); } }

  // ── projects ─────────────────────────────────────────────
  function joinable(st, e) {
    if (T.st.done(st) || st.clearing || !S().structs.includes(st) || (st.z || 0) !== zOf(e)) return false;
    const r = T.st.rt(st);
    return r.workers.size < T.clamp(Math.ceil(T.st.count(st) / 30), 1, 10) || r.workers.has(e);
  }
  function setProj(e, st) { if (e.proj) T.st.rt(e.proj).workers.delete(e); e.proj = st; if (st) T.st.rt(st).workers.add(e); }
  function findProject(e) {
    const s = S(), z = zOf(e);
    const bps = T.st.activeBps().filter((st) => !st.clearing && (st.z || 0) === z && T.st.openCells(st) > 0);
    if (bps.length && Math.random() < T.G.focus()) { bps.sort((a, b) => Math.abs(a.x - e.x) - Math.abs(b.x - e.x)); return bps[0]; }
    const autos = s.structs.filter((st) => st.src !== 'bp' && !T.st.done(st) && (st.z || 0) === z);
    const open = autos.filter((st) => joinable(st, e) && T.st.openCells(st) > 0);
    const solo = autos.length < T.vil.maxAuto(z) && (Math.random() < 0.55 || !open.length);
    if (solo) { const st = T.vil.startProject(e.x, z); if (st) { if (Math.random() < 0.4) e.bubble = { text: ['혼자 해볼래', '저기다!', '영차', '좋은 자리'][Math.floor(Math.random() * 4)], t: 1.5 }; return st; } }
    if (open.length) { open.sort((a, b) => Math.abs(a.x - e.x) - Math.abs(b.x - e.x)); return open[0]; }
    return bps[0] || null;
  }
  // dropped or led next to a building site: pitch in
  function joinNearby(e) {
    if (e.kind !== 'arch') return;
    let best = null, bd = 110;
    for (const st of S().structs) {
      if (T.st.done(st) || (st.z || 0) !== zOf(e) || !joinable(st, e)) continue;
      const [a, b] = T.st.bbox(st);
      const d = e.x < a ? a - e.x : e.x > b ? e.x - b : 0;
      if (d < bd) { bd = d; best = st; }
    }
    if (best && best !== e.proj) { setProj(e, best); e.t = Math.min(e.t, 0.4); e.bubble = { text: ['도울게!', '여기구나', '맡겨줘'][Math.floor(Math.random() * 3)], t: 1.4 }; }
  }

  function launch(e, st, ci, extra) {
    const d = e.d;
    T.st.reserve(st, ci);
    const [tx, ty] = T.st.cellPos(st, ci);
    const color = T.st.tint(T.st.blockColor(st, ci), false);
    const from = [e.x + e.dir * 4, e.y + 14];
    const lucky = Math.random() < T.G.luckyChance();
    const z = zOf(e);
    const onLand = () => {
      if (!T.st.fill(st, ci)) return;
      const v = T.G.blockValue(d) * (lucky ? 25 : 1);
      T.G.earn(v);
      S().stats.lifeBlocks++;
      if (z === T.view()) T.fx.landed(tx, ty, v, lucky, color);
      T.audio.note(ty, T.SHAPE[d.s].index);
      if (Math.random() < 0.25) T.audio.play('land', { x: tx });
    };
    if (e.light || flights.length > 400 || T.cam.z < 0.12) {
      if (e.light && T.cam.z > 0.2 && z === T.view()) T.fx.beam(from[0], from[1], tx, ty, color);
      onLand(); return;
    }
    const dist = Math.hypot(tx - from[0], ty - from[1]);
    flights.push({ z, x0: from[0], y0: from[1], x1: tx, y1: ty, t: 0, dur: 0.4 + Math.min(1.2, dist / 500) + (extra ? 0.1 : 0), h: 18 + dist * 0.3, color, onLand });
  }
  function launchRosette(e) {
    const m = motifFor(e), p = m.next(), d = e.d, col = T.G.archColor(d);
    flights.push({ z: 0, x0: e.x, y0: e.y + 14, x1: p[0], y1: p[1], t: 0, dur: 0.6 + Math.min(1.4, Math.hypot(p[0] - e.x, p[1]) / 700), h: 40, color: col,
      onLand: () => { e.pos.push(p); d.n++; T.world.drawBlock(p[0], p[1], col, false, 'back', 0); T.G.earn(T.G.blockValue(d) * 0.5); } });
  }

  // ── interactions ─────────────────────────────────────────
  function pick(wx, wy) {
    let best = null, bd = 1e9;
    for (const e of all()) {
      if (e.inside || zOf(e) !== T.view()) continue;
      const sc = e.kind === 'kid' ? 0.6 : 1;
      const dx = wx - e.x, dy = wy - (e.y + 9 * sc);
      if (Math.abs(dx) < 11 * sc + 2 && Math.abs(dy) < 12 * sc + 2) { const dd = dx * dx + dy * dy; if (dd < bd) { bd = dd; best = e; } }
    }
    return best;
  }
  function pet(e) {
    e.happyT = 1.4; e.petT = T.G.petDur(); e.sq = 0.18;
    T.fx.hearts(e.x, e.y + 20); T.audio.pet(); S().stats.pets++;
    if (e.mournT > 0) { e.mournT = Math.max(0, e.mournT - 3); e.bubble = { text: '고마워', t: 1.4 }; return; }
    if (Math.random() < 0.35) e.bubble = { text: ['♥', '헤헤', '♪', '좋아!', '...!'][Math.floor(Math.random() * 5)], t: 1.4 };
  }
  function hold(e) { e.held = true; e.walkTo = null; e.surpriseT = 0.6; T.audio.pop(); if (Math.random() < 0.5) e.bubble = { text: ['으앗', '?!', '높다…', '내려줘'][Math.floor(Math.random() * 4)], t: 1.2 }; }
  function drag(e, wx, wy) { const ny = Math.max(0, wy - 10); e.vx = (wx - e.x) * 30; e.vy = (ny - e.y) * 30; e.x = wx; e.y = ny; }
  function release(e) { T.audio.play('drop'); e.held = false; e.vx = T.clamp(e.vx, -500, 500) * 0.5; e.vy = T.clamp(e.vy, -400, 600) * 0.5; e.joinOnLand = true; }
  function hop(e, v = 130) { if (e.y === 0 && e.vy === 0 && !e.inside) e.vy = v; }
  function notifyPlayerBlock(x, y) {
    for (const e of archs.concat(workers, kids)) {
      const dx = x - e.x;
      if (Math.abs(dx) > 260 || e.held || e.inside || zOf(e) !== 0) continue;
      e.lookAt = [x, y]; e.lookT = 1.6;
      if (Math.abs(dx) < 10 && y < 34 && e.y === 0) { e.surpriseT = 0.9; e.sq = 0.3; e.bubble = { text: '아얏!', t: 1 }; T.audio.thunk(); }
      else if (Math.random() < 0.12) { hop(e, 140); e.bubble = { text: Math.random() < 0.5 ? '!' : '오오', t: 1 }; }
    }
  }
  // radial menu. At night it even wakes the sleepers, who come running out
  function groupAction(type, wx) {
    const pool = archs.concat(workers, kids).filter((e) => zOf(e) === T.view() && !e.held && Math.abs(e.x - wx) < 700);
    if (type === 'hello') { for (const e of all()) if (!e.inside) { e.emote = 'wave'; e.emoteT = 2.5; } return pool.length; }
    let woke = 0;
    for (const e of pool) {
      if (e.inside === 'sleep') { e.inside = null; e.y = 0; e.surpriseT = 1.2; e.vy = 160; woke++; e.bubble = { text: ['깜짝!', '으응?', '지금?!'][Math.floor(Math.random() * 3)], t: 1.4 }; }
      else if (e.inside) continue;
      e.emote = type;
      e.emoteT = { gather: 12, dance: 6, cheer: 3, rest: 9, scatter: 5, follow: 14, parade: 16 }[type] || 4;
      e.emoteX = wx + (type === 'gather' ? (Math.random() - 0.5) * 70 : 0);
      if (type === 'scatter') {
        e.emoteX = e.x + Math.sign(e.x - wx || 1) * (150 + Math.random() * 150);
        // 「모여」 then 「흩어져」: they stay up and keep working through the night
        if (S().era >= 1 && performance.now() - (e.lastGather || -1e9) < 90000) { e.nightShift = true; e.bubble = { text: ['밤샘이다!', '오늘은 늦게까지', '불 켜고 일하자'][Math.floor(Math.random() * 3)], t: 1.6 }; }
      }
      if (type === 'gather') e.lastGather = performance.now();
      if (type === 'cheer') { e.happyT = 3; hop(e, 200); }
      if (type === 'parade') e.emoteX = wx + 1200;
      if (!e.bubble && Math.random() < 0.3) e.bubble = { text: { gather: '모여라!', dance: '♪', cheer: '만세!', rest: '휴…', scatter: '와아', follow: '따라갈게', parade: '하나 둘' }[type], t: 1.3 };
    }
    if (woke) T.ui.toast(`자던 주민 ${woke}명이 화들짝 깨서 달려옵니다.`);
    return pool.length;
  }

  // ── physics & timers ─────────────────────────────────────
  function physics(e, dt) {
    if (e.held || e.inside) return;
    if (e.y > 0 || e.vy > 0) {
      e.vy -= GRAV * dt; e.y += e.vy * dt; e.x += e.vx * dt; e.vx *= Math.pow(0.4, dt);
      if (e.y <= 0) {
        const impact = -e.vy;
        e.y = 0;
        e.sq = T.clamp(impact / 900, 0.08, 0.35);
        if (impact > 420) { e.dizzyT = 2.2; e.vy = impact * 0.32; T.fx.stars(e.x, e.y + 20); T.audio.dizzy(); if (Math.random() < 0.6) e.bubble = { text: '빙글빙글…', t: 1.6 }; }
        else if (impact > 160) { e.vy = impact * 0.25; T.fx.dust(e.x, 0); }
        else { e.vy = 0; e.vx = 0; if (impact > 60) T.fx.dust(e.x, 0); }
        if (e.joinOnLand && e.vy === 0) { e.joinOnLand = false; joinNearby(e); }
      }
    }
  }
  function timers(e, dt) {
    e.phase += dt;
    e.blinkT -= dt;
    if (e.blinkT < 0) { e.blink = 0.13; e.blinkT = 2.5 + Math.random() * 4; }
    e.blink = Math.max(0, e.blink - dt);
    for (const k of ['happyT', 'surpriseT', 'dizzyT', 'petT', 'lookT', 'mournT', 'visitBuff', 'sleepyT']) if (e[k] > 0) e[k] = Math.max(0, e[k] - dt);
    if (e.emoteT > 0) { e.emoteT -= dt; if (e.emoteT <= 0) { const was = e.emote; e.emote = null; if (was === 'follow' || was === 'gather') joinNearby(e); } }
    e.sq *= Math.pow(0.002, dt);
    if (e.bubble) { e.bubble.t -= dt; if (e.bubble.t <= 0) e.bubble = null; }
  }
  function walkToward(e, x, dt, mult = 1) {
    const dx = x - e.x;
    e.dir = Math.sign(dx) || e.dir;
    const step = T.G.walkSpeed() * mult * dt * (e.kind === 'kid' ? 1.15 : 1);
    if (Math.abs(dx) <= step) { e.x = x; return true; }
    e.x += Math.sign(dx) * step;
    if (S().era >= 1 && Math.random() < dt * 3) T.world.wear(e.x, zOf(e), 0.15);
    e.walking = true;
    if (Math.random() < dt * 0.6 && T.cam.z > 0.6 && zOf(e) === T.view()) T.fx.dust(e.x - e.dir * 6, 0, 1);
    return false;
  }
  const doorX = (st) => st.x + (T.st.shape(st).w * B) / 2;

  // village life shared by every resident; returns true when it took over this frame
  function townLife(e, dt) {
    const s = S();
    if (s.era < 1) return false;
    const n = T.vil.night();
    const home = e.d.home && T.st.byUid(e.d.home);
    if (e.inside) {
      e.insideT -= dt;
      if (e.inside === 'sleep') {
        e.d.life = Math.min(T.vil.maxLife(), e.d.life + dt * 4 * Math.pow(1.5, s.lup.nap || 0));
        if (n < 0.25 && e.insideT <= 0) { e.inside = null; e.y = 0; e.happyT = 1; e.vy = 90; e.sleepyT = 2; }
      } else if (e.insideT <= 0) { e.inside = null; e.y = 0; e.happyT = 1.6; e.visitBuff = 60; if (Math.random() < 0.4) e.bubble = { text: ['좋았다', '♪', '또 와야지'][Math.floor(Math.random() * 3)], t: 1.4 }; }
      return true;
    }
    // awake: life drains; awake or sleeping outside at night drains faster
    const outsideNight = n > 0.6;
    if (n < 0.25) e.nightShift = false;
    e.d.life -= dt * (outsideNight ? (e.nightShift ? 1.3 : 1.6) : 1);
    if (e.d.life <= 0) { T.vil.die(e); return true; }
    if (e.d.life < T.vil.maxLife() * 0.15 && Math.random() < dt * 0.1 && !e.bubble) e.bubble = { text: '졸려…', t: 1.4 };
    if (outsideNight && !e.emote && !e.nightShift) {
      if (home) {
        e.napping = false;
        if (walkToward(e, doorX(home), dt, 1.2)) { e.inside = 'sleep'; e.insideT = 1 + Math.random() * 4; if (e.proj) setProj(e, null); }
        return true;
      }
      e.napping = true;
      return true;
    }
    e.napping = false;
    return false;
  }
  function doEmote(e, dt) {
    switch (e.emote) {
      case 'gather': case 'scatter': case 'follow': case 'parade': {
        const x = e.emote === 'follow' ? T.main.cursorX() : e.emoteX;
        if (walkToward(e, x, dt, e.emote === 'follow' ? 1.4 : 1.2) && e.emote === 'gather' && Math.random() < dt) e.happyT = 0.6;
        if (e.emote === 'parade' && Math.random() < dt * 0.5) hop(e, 70);
        break;
      }
      case 'dance': if (e.y === 0 && Math.random() < dt * 3) { hop(e, 110 + Math.random() * 60); e.dir *= -1; } e.happyT = 0.3; break;
      case 'cheer': if (Math.random() < dt * 2) hop(e, 180); e.happyT = 0.3; break;
      case 'rest': e.sleepyT = 0.3; break;
      case 'wave': e.happyT = 0.3; break;
      case 'visit': visitStep(e, dt); break;
    }
  }

  function updateArch(e, dt) {
    timers(e, dt); physics(e, dt);
    e.walking = false;
    if (e.held || e.y > 0 || e.dizzyT > 0) return;
    if (townLife(e, dt)) return;
    if (e.emote) { doEmote(e, dt); return; }
    const petted = e.petT > 0;
    if ((petted || e.light) && Math.random() < dt * (e.light ? 4 : 1.2) && zOf(e) === T.view()) T.fx.sparkle(e.x + (Math.random() - 0.5) * 14, e.y + 6 + Math.random() * 16, e.light);
    e.emoteCD -= dt;
    if (e.emoteCD < 0) { e.emoteCD = 18 + Math.random() * 40; if (!e.bubble && T.cam.z > 0.8) e.bubble = { text: ['♪', '…', '흠흠', '♬', '영차'][Math.floor(Math.random() * 5)], t: 1.5 }; }
    if (e.mournT > 0 && !(e.proj && e.proj.src === 'grave')) return;
    e.t -= dt;
    if (e.proj && (!S().structs.includes(e.proj) || T.st.done(e.proj))) setProj(e, null);
    if (!e.proj && e.t <= 0) {
      const st = findProject(e);
      if (st) setProj(e, st);
      else if (S().era >= 1 && Math.random() < 0.3) startVisit(e);
      else { e.walkTo = e.x + (Math.random() - 0.5) * 120; e.t = 2 + Math.random() * 3; }
    }
    if (!e.proj) { if (e.walkTo !== null && walkToward(e, e.walkTo, dt, 0.6)) e.walkTo = null; lookAround(e); return; }
    const st = e.proj;
    const ci = T.st.nextCell(st, e.x);
    if (ci < 0) { if (e.t <= 0) { setProj(e, null); e.t = 1; } lookAround(e); return; }
    const [tx, ty] = T.st.cellPos(st, ci);
    const range = T.G.throwRange();
    const dx = tx - e.x;
    if (!e.light && Math.abs(dx) > range * 0.9) { walkToward(e, tx - Math.sign(dx) * range * 0.5, dt); e.look = [e.dir, 0]; return; }
    e.dir = Math.sign(dx) || e.dir;
    e.look = [Math.abs(dx) > 6 ? Math.sign(dx) : 0, ty - e.y > 40 ? -1 : 0];
    if (e.t <= 0) {
      e.windT = (e.windT || 0) + dt;
      e.sq = 0.22 * Math.min(1, e.windT / 0.22);
      if (e.windT >= 0.22) {
        launch(e, st, ci);
        if (Math.random() < 0.06 * (S().up.double || 0)) { const c2 = T.st.nextCell(st, e.x); if (c2 >= 0) launch(e, st, c2, true); }
        if (S().flags.rosette && Math.random() < 0.5) launchRosette(e);
        hop(e, 120); e.sq = -0.2; e.windT = 0;
        e.t = T.G.cooldown(e.d, petted, T.st.rt(st).workers.size, e.happy || 0);
      }
    }
  }
  function lookAround(e) {
    if (e.lookT > 0 && e.lookAt) { const dx = e.lookAt[0] - e.x; e.look = [Math.abs(dx) > 6 ? Math.sign(dx) : 0, e.lookAt[1] - e.y > 40 ? -1 : 0]; }
    else e.look = [e.walking ? e.dir : 0, 0];
  }
  function startVisit(e) {
    const vs = T.vil.done().filter((st) => T.DEF[st.id].visit && (st.z || 0) === zOf(e) && Math.abs(st.x - e.x) < 900);
    if (!vs.length) return;
    e.visitTarget = vs[Math.floor(Math.random() * vs.length)];
    e.emote = 'visit'; e.emoteT = 30;
  }
  function visitStep(e, dt) {
    const st = e.visitTarget;
    if (!st || !S().structs.includes(st) || T.vil.night() > 0.6) { e.emote = null; return; }
    if (walkToward(e, doorX(st), dt)) { e.inside = 'visit'; e.insideT = 4 + Math.random() * 5; e.emote = null; }
  }

  function updateWorker(e, dt) {
    timers(e, dt); physics(e, dt);
    e.walking = false;
    if (e.held || e.y > 0 || e.dizzyT > 0) return;
    if (townLife(e, dt)) return;
    if (e.emote) { doEmote(e, dt); return; }
    if (!e.job || !S().structs.includes(e.job)) {
      const jobs = T.vil.done().filter((st) => ['prod', 'market'].includes(T.DEF[st.id].cat) && (st.z || 0) === zOf(e));
      e.job = jobs.length ? jobs.sort((a, b) => Math.abs(a.x - e.x) - Math.abs(b.x - e.x))[Math.floor(Math.random() * Math.min(2, jobs.length))] : null;
      if (!e.job) { if (e.walkTo === null) e.walkTo = e.x + (Math.random() - 0.5) * 120; if (walkToward(e, e.walkTo, dt, 0.5)) e.walkTo = null; lookAround(e); return; }
    }
    const sh = T.st.shape(e.job);
    if (e.spot === undefined) e.spot = Math.random();
    if (!walkToward(e, e.job.x + B + e.spot * (sh.w - 2) * B, dt)) { lookAround(e); return; }
    e.t -= dt; e.look = [e.dir, 0];
    if (e.t <= 0) { e.t = 3; const g = T.vil.goodsRate(); T.G.earnGoods(g); hop(e, 90); if (T.cam.z > 0.7 && zOf(e) === T.view()) T.fx.floatText(e.x, e.y + 26, '+' + T.fmt(g) + ' 물자', false); }
  }
  function updateKid(e, dt) {
    timers(e, dt); physics(e, dt);
    e.walking = false;
    if (e.held || e.y > 0 || e.dizzyT > 0) return;
    if (townLife(e, dt)) return;
    if (e.emote) { doEmote(e, dt); return; }
    const parent = archs.concat(workers).find((p) => p.d.home === e.d.home && !p.inside) || null;
    const tx = parent ? parent.x - parent.dir * 14 : e.x;
    if (Math.abs(tx - e.x) > 10) walkToward(e, tx, dt, 1.1);
    else if (Math.random() < dt * 0.8) { hop(e, 80); e.happyT = 0.5; }
    lookAround(e);
  }

  // ── refinement residents ─────────────────────────────────
  // shared: walk to a finished structure and work on it every `cd`, `work(st)` returns pieces done or -1
  function refiner(e, dt, findJob, cd, work, idleWord) {
    timers(e, dt); physics(e, dt);
    e.walking = false;
    if (e.held || e.y > 0 || e.dizzyT > 0) return;
    if (townLife(e, dt)) return;
    if (e.emote) { doEmote(e, dt); return; }
    if (!e.job || !S().structs.includes(e.job) || e.jobDone) {
      e.jobDone = false;
      e.job = findJob(e);
      if (!e.job) { if (e.walkTo === null) e.walkTo = e.x + (Math.random() - 0.5) * 200; if (walkToward(e, e.walkTo, dt, 0.6)) e.walkTo = null; e.look = [e.dir, 0]; if (Math.random() < dt * 0.02) e.bubble = { text: idleWord, t: 1.2 }; return; }
    }
    const sh = T.st.shape(e.job);
    const target = e.job.x + (sh.w * B) / 2;
    if (Math.abs(target - e.x) > Math.max(T.G.throwRange(), (sh.w * B) / 2)) { walkToward(e, target, dt, 1.3); e.look = [e.dir, 0]; return; }
    e.look = [0, -1];
    e.t -= dt;
    if (e.t <= 0) {
      e.t = cd;
      const r = work(e, e.job);
      if (r < 0) e.jobDone = true;
      else { hop(e, 100); e.sq = -0.15; }
    }
  }
  const nearestDone = (e, test) => {
    let best = null, bd = Infinity;
    for (const st of S().structs) { if ((st.z || 0) !== zOf(e) || !T.st.done(st) || st.src === 'grave' || !test(st)) continue; const d = Math.abs(st.x - e.x); if (d < bd) { bd = d; best = st; } }
    return best;
  };
  function updateSplitter(e, dt) {
    const cd = T.G.carveCD();
    refiner(e, dt, (en) => nearestDone(en, (st) => T.st.nextCarve(st) >= 0), Math.max(0.05, cd), (en, st) => {
      let i = T.st.nextCarve(st);
      if (i < 0) return -1;
      // fast hands carve a whole block at once, very fast ones several
      const blocks = cd < 0.06 ? 3 : 1;
      let total = 0;
      for (let k = 0; k < blocks && i >= 0; k++) {
        total += T.st.carve(st, i, cd < 0.15 ? 64 : 1);
        const [cx, cy] = T.st.cellPos(st, i);
        if (zOf(en) === 0) T.fx.chips(cx, cy, T.st.tint(T.st.blockColor(st, i), false));
        i = T.st.nextCarve(st);
      }
      S().stats.carved += total;
      T.G.earn(T.G.bestValue() * 0.04 * total * (1 + (S().sup.sharp || 0)));
      if (Math.random() < 0.3) T.audio.play('chip', { x: e.x });
      return total;
    }, '다듬을 게 없네');
  }
  function updatePainter(e, dt) {
    const cd = T.G.paintCD();
    if (e.walking || Math.random() < dt * 4) T.world.stain(e.x, e.col, e.walking ? 0.35 : 0.1, zOf(e));
    refiner(e, dt, (en) => nearestDone(en, (st) => T.st.nextPaint(st) >= 0), Math.max(0.05, cd), (en, st) => {
      let i = T.st.nextPaint(st);
      if (i < 0) { en.happyT = 2; if (Math.random() < 0.5) en.bubble = { text: '알록달록!', t: 1.4 }; return -1; }
      const blocks = cd < 0.06 ? 3 : 1;
      let total = 0;
      for (let k = 0; k < blocks && i >= 0; k++) {
        total += T.st.paint(st, i, cd < 0.15 ? 64 : 1);
        const [cx, cy] = T.st.cellPos(st, i);
        if (zOf(en) === 0) flights.push({ z: 0, x0: en.x, y0: en.y + 16, x1: cx, y1: cy, t: 0, dur: 0.35, h: 20, color: en.col, paint: true, onLand: () => T.fx.splash(cx, cy, en.col) });
        i = T.st.nextPaint(st);
      }
      S().stats.paintBlocks += total;
      T.G.earn(T.G.bestValue() * 0.05 * total * (2 + (S().gup.dense || 0)));
      if (Math.random() < 0.35) T.audio.play('paint', { x: e.x });
      return total;
    }, '칠할 게 없네');
  }
  function updateDemo(e, dt) {
    const cd = 0.55 * Math.pow(0.85, S().lup.demo || 0);
    refiner(e, dt, (en) => { const c = T.st.condemned().filter((st) => (st.z || 0) === zOf(en)); if (!c.length) T.st.clearedCheck(); return c.sort((a, b) => Math.abs(a.x - en.x) - Math.abs(b.x - en.x))[0] || null; }, cd, (en, st) => {
      if (!S().structs.includes(st)) return -1;
      const n = cd < 0.2 ? 999 : 1;
      T.audio.play('knock', { x: e.x });
      T.st.knock(st, n);
      if (!S().structs.includes(st)) { T.st.clearedCheck(); en.happyT = 1.5; return -1; }
      return 1;
    }, '부술 게 없네');
  }
  function updateWarper(e, dt) {
    timers(e, dt); physics(e, dt);
    e.walking = false;
    if (e.held || e.y > 0 || e.dizzyT > 0) return;
    if (townLife(e, dt)) return;
    if (e.emote) { doEmote(e, dt); return; }
    const L = T.G.layers();
    if (L < 2) { if (e.walkTo === null) e.walkTo = e.x + (Math.random() - 0.5) * 160; if (walkToward(e, e.walkTo, dt, 0.5)) e.walkTo = null; return; }
    e.t -= dt;
    if (!e.target) {
      if (e.t > 0) return;
      // move someone idle from the busiest layer to the emptiest one
      const cnt = new Array(L).fill(0);
      for (const a of archs.concat(workers)) cnt[zOf(a)]++;
      let from = 0, to = 0;
      for (let z = 0; z < L; z++) { if (cnt[z] > cnt[from]) from = z; if (cnt[z] < cnt[to]) to = z; }
      if (cnt[from] - cnt[to] < 2) { e.t = 6; return; }
      const cands = archs.concat(workers).filter((a) => zOf(a) === from && !a.proj && !a.inside && !a.held && !a.emote);
      if (!cands.length) { e.t = 4; return; }
      e.target = cands[Math.floor(Math.random() * cands.length)]; e.toZ = to;
      e.d.z = from;
    }
    const tg = e.target;
    if (e.warp) { stepWarp(e, dt); return; }
    if (!all().includes(tg) || tg.inside || tg.proj) { e.target = null; e.t = 3; return; }
    if (!walkToward(e, tg.x - e.dir * 10, dt, 1.4)) return;
    // open a portal, both get pulled in, and pop out of the other layer
    e.warp = { t: 0, from: zOf(e), to: e.toZ, land: (Math.random() - 0.5) * 200, done: false };
    T.fx.portal(e.x + e.dir * 5, zOf(e), 'in');
    T.audio.play('warpIn', { x: e.x });
  }
  function stepWarp(e, dt) {
    const w = e.warp, tg = e.target;
    w.t += dt;
    const IN = 0.42, OUT = 0.45;
    if (w.t < IN) {
      const k = w.t / IN;
      e.warpScale = 1 - k * k; if (tg) tg.warpScale = 1 - k * k;
      return;
    }
    if (!w.done) {
      w.done = true;
      if (tg && all().includes(tg)) { tg.d.z = w.to; tg.d.home = 0; tg.x = w.land; tg.surpriseT = 1.2; }
      e.d.z = w.to; e.x = w.land + 14;
      T.fx.portal(w.land + 7, w.to, 'out');
      T.audio.play('warpOut', { x: w.land });
    }
    const k = T.clamp((w.t - IN) / OUT, 0, 1);
    const s = T.easeOutBack ? T.easeOutBack(k) : k;
    e.warpScale = s; if (tg) tg.warpScale = s;
    if (k >= 1) {
      e.warpScale = undefined; if (tg) tg.warpScale = undefined;
      if (tg) { tg.vy = 60; }
      e.warp = null; e.target = null; e.t = 8;
    }
  }

  // ── update all ───────────────────────────────────────────
  function update(dt) {
    // light projection: only the most skilled few
    const slots = T.G.lightSlots();
    if (slots) { const sorted = archs.slice().sort((a, b) => b.d.lvl - a.d.lvl); archs.forEach((e) => (e.light = false)); for (let i = 0; i < Math.min(slots, sorted.length); i++) sorted[i].light = true; }
    else for (const e of archs) e.light = false;
    for (const e of archs.slice()) updateArch(e, dt);
    for (const e of workers.slice()) updateWorker(e, dt);
    for (const e of kids.slice()) updateKid(e, dt);
    for (const e of painters.slice()) updatePainter(e, dt);
    for (const e of splitters.slice()) updateSplitter(e, dt);
    for (const e of demos.slice()) updateDemo(e, dt);
    for (const e of warpers.slice()) updateWarper(e, dt);
    tickPetWait(dt);
    for (let i = flights.length - 1; i >= 0; i--) { const f = flights[i]; f.t += dt; if (f.t >= f.dur) { flights.splice(i, 1); f.onLand(); } }
  }

  // ── draw ─────────────────────────────────────────────────
  function spriteOf(e) { return PET[e.kind] ? PET[e.kind].sprite : e.d.s; }
  function drawCreature(ctx, e) {
    if (e.inside) return;
    const color = S().flags.color;
    const kind = spriteOf(e);
    const [sx, sy] = T.w2s(e.x, e.y);
    if (sx < -60 || sx > T.cam.W + 60 || sy < -80 || sy > T.cam.H + 80) return;
    const scale = e.kind === 'kid' ? 0.58 : e.kind === 'worker' ? 0.85 : 1;
    const ps = P * T.cam.z * T.layerK() * scale;
    if (ps < 0.5) { ctx.fillStyle = color ? T.shade(T.SHAPE[kind] ? T.SHAPE[kind].color : '#9a8fb0', -0.2) : '#555'; const w = Math.max(1.5, 14 * ps); ctx.fillRect(sx - w / 2, sy - w, w, w); return; }
    let face = 'normal';
    if (e.dizzyT > 0) face = 'dizzy';
    else if (e.held || e.surpriseT > 0) face = 'surprise';
    else if (e.mournT > 0) face = 'sad';
    else if (e.happyT > 0) face = 'happy';
    else if (e.napping || e.sleepyT > 0 || e.emote === 'rest') face = 'sleepy';
    else if (e.blink > 0) face = 'blink';
    let legs = [0, 0];
    const walking = e.walking && e.y === 0;
    if (walking) { const ph = Math.sin(e.phase * 14); legs = [ph > 0 ? 1 : 0, ph <= 0 ? 1 : 0]; }
    if (e.held) { const ph = Math.sin(e.phase * 22); legs = [ph > 0 ? 1 : -0.5, ph <= 0 ? 1 : -0.5]; }
    const bob = walking ? Math.abs(Math.sin(e.phase * 14)) * 1.2 * ps : e.y === 0 ? Math.sin(e.phase * 2.2) * 0.35 * ps : 0;
    let hat = null;
    if (e.kind === 'arch') { const l = e.d.lvl; hat = l >= 25 ? 'crown' : l >= 10 ? 'helmet' : l >= 5 ? 'ribbon' : null; }
    if (e.kind === 'demo' || e.kind === 'splitter') hat = 'helmet';
    if (e.y > 2) { const [gx, gy] = T.w2s(e.x, 0); const k = T.clamp(1 - e.y / 300, 0.2, 1); ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(gx - 7 * ps * k, gy - ps, 14 * ps * k, ps); }
    if (e.light) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.35 + Math.sin(e.phase * 4) * 0.1; ctx.drawImage(T.world.glowSprite('rgba(255,236,150,1)'), sx - 16 * ps, sy - 24 * ps, 32 * ps, 32 * ps); ctx.restore(); }
    const napY = e.napping ? 3 * ps : 0;
    const wps = e.warpScale !== undefined ? ps * Math.max(0.02, e.warpScale) : ps;
    if (e.warpScale !== undefined && e.warpScale < 0.05) return;
    T.sprites.draw(ctx, kind, color, { sx, sy: sy - bob + napY, ps: wps, face: e.warpScale !== undefined ? 'surprise' : face, look: e.look, legs, hat, sq: e.napping ? 0.25 : e.sq, dangle: e.held });
    if (e.warpScale !== undefined) return;
    const tool = (c1, c2, len) => { const bx = sx + e.dir * 8 * ps, by = sy - 10 * ps - bob; const up = e.t < 0.15 ? -1 : 1; ctx.fillStyle = c1; ctx.fillRect(bx, by - len * ps * up, ps, len * ps); ctx.fillStyle = c2; ctx.fillRect(bx - ps * 0.5, by - (len + 2) * ps * up, ps * 2, ps * 2.5); };
    if (kind === 'drop') tool(color ? '#8d6748' : '#555', color ? e.col : '#999', 7);
    if (kind === 'demo') tool(color ? '#8d6748' : '#555', color ? '#6b7280' : '#444', 6);
    if (kind === 'chisel') tool(color ? '#6b7280' : '#555', color ? '#cfd6de' : '#aaa', 5);
    if (kind === 'portal' && ps > 0.8) { // two pixel motes circling the head, in front and behind
      for (let i = 0; i < 2; i++) {
        const a = e.phase * 2.4 + i * Math.PI;
        const mx = Math.round(sx + Math.cos(a) * 9 * ps), my = Math.round(sy - 17 * ps - bob + Math.sin(a) * 2.5 * ps);
        const front = Math.sin(a) > 0, m = Math.max(1, Math.round(ps * 1.3));
        ctx.globalAlpha = front ? 1 : 0.45;
        ctx.fillStyle = color ? (i ? '#c3a6ff' : '#ffe08a') : (i ? '#9a9a97' : '#d8d8d5');
        ctx.fillRect(mx - m / 2, my - m / 2, m, m);
        if (front) { ctx.fillStyle = '#ffffff'; ctx.fillRect(mx - m / 2, my - m / 2, Math.max(1, m / 2), Math.max(1, m / 2)); }
      }
      ctx.globalAlpha = 1;
    }
    if (e.kind === 'worker' && ps > 1) { ctx.fillStyle = color ? '#f4efe6' : '#ddd'; ctx.fillRect(sx - 3 * ps, sy - 6 * ps - bob, 6 * ps, 3 * ps); }
    if (e.napping && ps > 1 && Math.sin(e.phase * 2) > 0) { ctx.fillStyle = color ? '#8ecae6' : '#888'; ctx.font = `${Math.round(8 * T.cam.z)}px Galmuri9, monospace`; ctx.fillText('z', sx + 8 * ps, sy - 18 * ps - Math.sin(e.phase) * 3); }
    if (e.mournT > 0 && ps > 1 && Math.random() < 0.06) T.fx.tear(e.x + e.dir * 3, e.y + 12);
    if (e.petT > 0 && ps > 1) {
      ctx.fillStyle = color ? 'rgba(242,159,174,0.9)' : 'rgba(120,120,120,0.8)';
      const hx = sx + 9 * ps, hy = sy - 20 * ps - Math.sin(e.phase * 3) * ps, hp = Math.max(1, ps * 0.7);
      ctx.fillRect(hx, hy, hp, hp); ctx.fillRect(hx + 2 * hp, hy, hp, hp); ctx.fillRect(hx, hy + hp, hp * 3, hp); ctx.fillRect(hx + hp, hy + 2 * hp, hp, hp);
    }
    if (e.bubble && ps > 0.9 && T.Z === T.view()) drawBubble(ctx, sx, sy - 24 * ps - bob, e.bubble.text, Math.min(1, e.bubble.t * 4));
  }
  function drawBubble(ctx, x, y, text, a) {
    ctx.save();
    ctx.globalAlpha = a; ctx.font = '11px Galmuri11, monospace';
    const w = Math.ceil(ctx.measureText(text).width) + 10, h = 17;
    const bx = Math.round(x - w / 2), by = Math.round(y - h);
    ctx.fillStyle = '#2b2b2b'; ctx.fillRect(bx - 1, by, w + 2, h); ctx.fillRect(bx, by - 1, w, h + 2);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(bx, by, w, h);
    ctx.fillStyle = '#2b2b2b'; ctx.fillRect(Math.round(x) - 1, by + h + 1, 3, 2); ctx.fillRect(Math.round(x), by + h + 3, 1, 1);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(x), by + h, 1, 1);
    ctx.fillStyle = '#2b2b2b'; ctx.textBaseline = 'middle'; ctx.textAlign = 'center'; ctx.fillText(text, Math.round(x), by + h / 2 + 1);
    ctx.restore();
  }
  function drawTag(ctx, e) {
    const [sx, sy] = T.w2s(e.x, e.y);
    const ps = P * T.cam.z;
    const text = e.kind === 'arch' ? `${e.d.name}  Lv.${e.d.lvl}` : e.d.name;
    ctx.save(); ctx.font = '11px Galmuri11, monospace';
    const w = Math.ceil(ctx.measureText(text).width) + 10;
    const bx = Math.round(sx - w / 2), by = Math.round(sy - 22 * ps - 22 - (e.bubble ? 22 : 0));
    ctx.fillStyle = 'rgba(43,43,43,0.88)'; ctx.fillRect(bx, by, w, 16);
    if (S().era >= 1 && e.d.life !== undefined) { ctx.fillStyle = '#ef6f91'; ctx.fillRect(bx, by + 15, w * T.clamp(e.d.life / T.vil.maxLife(), 0, 1), 2); }
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, Math.round(sx), by + 9);
    ctx.restore();
  }
  function drawFlights(ctx, z) {
    const zz = T.cam.z * T.layerK();
    for (const f of flights) {
      if ((f.z || 0) !== z) continue;
      const t = T.easeInOut(Math.min(1, f.t / f.dur));
      const cx = (f.x0 + f.x1) / 2, cy = Math.max(f.y0, f.y1) + f.h, u = 1 - t;
      const x = u * u * f.x0 + 2 * u * t * cx + t * t * f.x1, y = u * u * f.y0 + 2 * u * t * cy + t * t * f.y1;
      const [sx, sy] = T.w2s(x, y);
      if (f.paint) { const r = Math.max(1.5, 2 * zz); ctx.fillStyle = f.color; ctx.fillRect(sx - r, sy - r, r * 2, r * 2); }
      else { const sz = B * zz; ctx.fillStyle = T.shade(f.color, -0.36); ctx.fillRect(sx - sz / 2, sy - sz / 2, sz, sz); ctx.fillStyle = f.color; ctx.fillRect(sx - sz / 2, sy - sz / 2, sz - Math.max(1, zz), sz - Math.max(1, zz)); }
    }
  }
  function draw(ctx, z = 0) {
    drawFlights(ctx, z);
    for (const e of all()) if (zOf(e) === z) drawCreature(ctx, e);
    if (z === T.view() && hover && !hover.held && !hover.inside && T.cam.z > 0.7) drawTag(ctx, hover);
  }
  function drawSleepers(ctx, n, z = 0) {
    if (n < 0.5 || T.cam.z < 0.5) return;
    const t = performance.now() / 1000;
    const seen = new Set();
    for (const e of all()) {
      if (e.inside !== 'sleep' || !e.d.home || seen.has(e.d.home)) continue;
      const h = T.st.byUid(e.d.home);
      if (!h || (h.z || 0) !== z) continue;
      seen.add(e.d.home);
      const sh = T.st.shape(h);
      const [sx, sy] = T.w2s(h.x + sh.w * B * 0.7, sh.h * B);
      const zz = T.cam.z * T.layerK();
      ctx.fillStyle = `rgba(200,220,255,${0.5 + Math.sin(t * 2 + h.uid) * 0.3})`;
      ctx.font = `${Math.round(9 * zz)}px Galmuri9, monospace`;
      ctx.fillText('z', sx, sy - ((t * 8 + h.uid * 3) % 16) * zz);
      ctx.fillText('Z', sx + 6 * zz, sy - 8 * zz - ((t * 8 + h.uid * 3 + 8) % 16) * zz);
    }
  }

  T.ent = {
    archs, workers, kids, painters, splitters, demos, warpers, flights, all, spriteOf,
    spawnArch, spawnWorker, spawnKid, growUp, removeEntity, rebuild, syncPets, update, draw, drawSleepers,
    pick, pet, hold, drag, release, hop, notifyPlayerBlock, groupAction, setProj, joinNearby,
    set hover(v) { hover = v; }, get hover() { return hover; },
  };
})();
