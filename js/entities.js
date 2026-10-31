'use strict';
// ─────────────────────────────────────────────────────────────
//  ENTITIES: 건축가, 일꾼, 아기, 방울(채색), 망치(철거)
// ─────────────────────────────────────────────────────────────
(function () {
  const B = T.B;
  const P = 1.15;
  const GRAV = 1100;
  const archs = [], workers = [], kids = [], painters = [], demos = [];
  const flights = [];
  let hover = null;
  const S = () => T.G.s;
  const all = () => archs.concat(workers, kids, painters, demos);
  const PAINT_COLS = ['#f29fae', '#8ecae6', '#b8e0a1', '#ffd166', '#c3a6ff', '#ffb38a'];

  function base(kind, d) {
    return {
      kind, d, x: (Math.random() - 0.5) * 120, y: 0, vx: 0, vy: 0,
      st: 'idle', t: 1 + Math.random() * 2, dir: Math.random() < 0.5 ? -1 : 1, phase: Math.random() * 10,
      blinkT: 2 + Math.random() * 4, blink: 0, happyT: 0, surpriseT: 0, dizzyT: 0, mournT: 0, sleepyT: 0,
      petT: 0, sq: 0, look: [0, 0], lookAt: null, lookT: 0, bubble: null, held: false,
      emote: null, emoteT: 0, inside: null, insideT: 0, happy: 0, visitBuff: 0, proj: null, walkTo: null,
      emoteCD: 10 + Math.random() * 30,
    };
  }
  function motifFor(e) {
    if (!e.motif) { e.motif = new T.Motif(T.SHAPE[e.d.s], e.d.o); e.pos = []; }
    return e.motif;
  }

  function spawnArch(d, silent) {
    const e = base('arch', d);
    if (d.life === undefined) d.life = T.vil.maxLife();
    archs.push(e);
    if (!silent) {
      e.x = T.clamp(T.cam.x + (Math.random() - 0.5) * Math.min(300, (T.cam.W / T.cam.z) * 0.4), -6000, 6000);
      e.y = 240 + Math.random() * 60; e.vy = -40; e.surpriseT = 1.2; e.t = 1.2;
    }
    return e;
  }
  function spawnWorker(d) { const e = base('worker', d); if (d.life === undefined) d.life = T.vil.maxLife(); workers.push(e); return e; }
  function spawnKid(d, house) {
    const e = base('kid', d);
    if (house) { const sh = T.st.shape(house); e.x = house.x + (sh.w * B) / 2; e.y = 30; e.vy = 80; }
    kids.push(e); return e;
  }
  function growUp(kidD, workerD) {
    const k = kids.find((e) => e.d === kidD);
    const e = spawnWorker(workerD);
    if (k) { e.x = k.x; kids.splice(kids.indexOf(k), 1); }
    e.vy = 160; e.happyT = 2; e.bubble = { text: '다 컸다!', t: 1.6 };
  }
  function removeEntity(e) {
    for (const list of [archs, workers, kids, painters, demos]) { const i = list.indexOf(e); if (i >= 0) list.splice(i, 1); }
    if (e.proj) { const r = T.st.rt(e.proj); r.workers.delete(e); }
    if (hover === e) hover = null;
  }

  function rebuild() {
    archs.length = 0; workers.length = 0; kids.length = 0; flights.length = 0;
    const s = S();
    for (const d of s.archs) {
      const e = spawnArch(d, true);
      if (s.flags.rosette && d.n) {
        const m = motifFor(e);
        for (let i = 0; i < d.n; i++) { const p = m.next(); e.pos.push(p); T.world.drawBlock(p[0], p[1], T.G.archColor(d), false, 'back'); }
      }
    }
    for (const d of s.workers) spawnWorker(d);
    for (const d of s.kids) spawnKid(d);
    // place people near their home or their work
    for (const e of archs.concat(workers, kids)) {
      const h = e.d.home && T.st.byUid(e.d.home);
      if (h) e.x = h.x + Math.random() * T.st.shape(h).w * B;
      else e.x = (Math.random() - 0.5) * Math.min(800, 200 + s.structs.length * 30);
    }
    syncPets();
  }
  function syncPets() {
    const s = S();
    const wantP = s.flags.painter ? 1 + (s.gup.painter || 0) : 0;
    while (painters.length < wantP) { const e = base('painter', null); e.y = 260; e.x = T.cam.x + (Math.random() - 0.5) * 100; e.col = PAINT_COLS[painters.length % PAINT_COLS.length]; painters.push(e); }
    while (painters.length > wantP) painters.pop();
    const wantD = s.era >= 1 ? 1 + (s.lup.demo || 0) : 0;
    while (demos.length < wantD) { const e = base('demo', null); e.y = 260; e.x = T.cam.x + (Math.random() - 0.5) * 100; demos.push(e); }
    while (demos.length > wantD) demos.pop();
  }

  // ── projects ─────────────────────────────────────────────
  function joinable(st, e) {
    if (T.st.done(st) || st.clearing || !T.G.s.structs.includes(st)) return false;
    const r = T.st.rt(st);
    const maxW = T.clamp(Math.ceil(T.st.shape(st).cells.length / 35), 1, 8);
    return r.workers.size < maxW || r.workers.has(e);
  }
  function setProj(e, st) {
    if (e.proj) T.st.rt(e.proj).workers.delete(e);
    e.proj = st;
    if (st) T.st.rt(st).workers.add(e);
  }
  function findProject(e) {
    const s = S();
    const bps = T.st.activeBps().filter((st) => !st.clearing && T.st.openCells(st) > 0);
    if (bps.length && Math.random() < T.G.focus()) {
      bps.sort((a, b) => Math.abs(a.x - e.x) - Math.abs(b.x - e.x));
      return bps[0];
    }
    const autos = s.structs.filter((st) => st.src !== 'bp' && !T.st.done(st));
    const open = autos.filter((st) => joinable(st, e) && T.st.openCells(st) > 0);
    const solo = autos.length < T.vil.maxAuto() && (Math.random() < 0.55 || !open.length);
    if (solo) { const st = T.vil.startProject(e.x); if (st) { if (Math.random() < 0.4) e.bubble = { text: ['혼자 해볼래', '저기다!', '영차', '좋은 자리'][Math.floor(Math.random() * 4)], t: 1.5 }; return st; } }
    if (open.length) { open.sort((a, b) => Math.abs(a.x - e.x) - Math.abs(b.x - e.x)); return open[0]; }
    if (bps.length) return bps[0];
    return null;
  }

  function launch(e, st, ci, extra) {
    const d = e.d;
    T.st.reserve(st, ci);
    const [tx, ty] = T.st.cellPos(st, ci);
    const ch = T.st.cellCh(st, ci);
    const color = T.st.colorOf(ch, false);
    const from = [e.x + e.dir * 4, e.y + 14];
    const lucky = Math.random() < T.G.luckyChance();
    const onLand = () => {
      if (!T.st.fill(st, ci)) return;
      const v = T.G.blockValue(d) * (lucky ? 25 : 1);
      T.G.earn(v);
      S().stats.lifeBlocks++;
      T.fx.landed(tx, ty, v, lucky, color);
      T.audio.note(ty, T.SHAPE[d.s].index);
    };
    if (S().pup.light || flights.length > 400 || T.cam.z < 0.12) {
      if (S().pup.light && T.cam.z > 0.2) T.fx.beam(from[0], from[1], tx, ty, color);
      onLand(); return;
    }
    const dist = Math.hypot(tx - from[0], ty - from[1]);
    flights.push({ x0: from[0], y0: from[1], x1: tx, y1: ty, t: 0, dur: 0.45 + Math.min(1.2, dist / 700) + (extra ? 0.1 : 0), h: 24 + dist * 0.25, color, onLand });
  }
  function launchRosette(e) {
    const m = motifFor(e);
    const p = m.next();
    const d = e.d;
    const col = T.G.archColor(d);
    flights.push({ x0: e.x, y0: e.y + 14, x1: p[0], y1: p[1], t: 0, dur: 0.6 + Math.min(1.4, Math.hypot(p[0] - e.x, p[1]) / 700), h: 40, color: col,
      onLand: () => { e.pos.push(p); d.n++; T.world.drawBlock(p[0], p[1], col, false, 'back'); T.G.earn(T.G.blockValue(d) * 0.5); } });
  }

  // ── interactions ─────────────────────────────────────────
  function pick(wx, wy) {
    let best = null, bd = 1e9;
    for (const e of all()) {
      if (e.inside) continue;
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
  function hold(e) { e.held = true; e.st = 'idle'; e.walkTo = null; e.surpriseT = 0.6; T.audio.pop(); if (Math.random() < 0.5) e.bubble = { text: ['으앗', '?!', '높다…', '내려줘'][Math.floor(Math.random() * 4)], t: 1.2 }; }
  function drag(e, wx, wy) { const nx = wx, ny = Math.max(0, wy - 10); e.vx = (nx - e.x) * 30; e.vy = (ny - e.y) * 30; e.x = nx; e.y = ny; }
  function release(e) { e.held = false; e.vx = T.clamp(e.vx, -500, 500) * 0.5; e.vy = T.clamp(e.vy, -400, 600) * 0.5; }
  function hop(e, v = 130) { if (e.y === 0 && e.vy === 0 && !e.inside) e.vy = v; }
  function notifyPlayerBlock(x, y) {
    for (const e of archs.concat(workers, kids)) {
      const dx = x - e.x;
      if (Math.abs(dx) > 260 || e.held || e.inside) continue;
      e.lookAt = [x, y]; e.lookT = 1.6;
      if (Math.abs(dx) < 10 && y < 34 && e.y === 0) { e.surpriseT = 0.9; e.sq = 0.3; e.bubble = { text: '아얏!', t: 1 }; T.audio.thunk(); }
      else if (Math.random() < 0.12 && e.st !== 'walk') { hop(e, 140); e.bubble = { text: Math.random() < 0.5 ? '!' : '오오', t: 1 }; }
    }
  }
  // radial menu actions
  function groupAction(type, wx) {
    const list = archs.concat(workers, kids).filter((e) => !e.inside && !e.held && Math.abs(e.x - wx) < 700);
    if (type === 'hello') { for (const e of all()) { if (e.inside) continue; e.emote = 'wave'; e.emoteT = 2.5; } return list.length; }
    for (const e of list) {
      e.emote = type;
      e.emoteT = { gather: 12, dance: 6, cheer: 3, rest: 9, scatter: 5, follow: 14, parade: 16 }[type] || 4;
      e.emoteX = wx + (type === 'gather' ? (Math.random() - 0.5) * 70 : 0);
      if (type === 'scatter') e.emoteX = e.x + Math.sign(e.x - wx || 1) * (150 + Math.random() * 150);
      if (type === 'cheer') { e.happyT = 3; hop(e, 200); }
      if (type === 'parade') e.emoteX = wx + 1200;
      if (Math.random() < 0.3) e.bubble = { text: { gather: '모여라!', dance: '♪', cheer: '만세!', rest: '휴…', scatter: '와아', follow: '따라갈게', parade: '하나 둘' }[type], t: 1.3 };
    }
    return list.length;
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
        if (impact > 420) { e.dizzyT = 2.2; e.vy = impact * 0.32; e.st = 'idle'; T.fx.stars(e.x, e.y + 20); T.audio.dizzy(); if (Math.random() < 0.6) e.bubble = { text: '빙글빙글…', t: 1.6 }; }
        else if (impact > 160) { e.vy = impact * 0.25; T.fx.dust(e.x, 0); }
        else { e.vy = 0; e.vx = 0; if (impact > 60) T.fx.dust(e.x, 0); }
      }
    }
  }
  function timers(e, dt) {
    e.phase += dt;
    e.blinkT -= dt;
    if (e.blinkT < 0) { e.blink = 0.13; e.blinkT = 2.5 + Math.random() * 4; }
    e.blink = Math.max(0, e.blink - dt);
    for (const k of ['happyT', 'surpriseT', 'dizzyT', 'petT', 'lookT', 'mournT', 'emoteT', 'visitBuff', 'sleepyT']) if (e[k] > 0) e[k] = Math.max(0, e[k] - dt);
    if (e.emoteT <= 0) e.emote = null;
    e.sq *= Math.pow(0.002, dt);
    if (e.bubble) { e.bubble.t -= dt; if (e.bubble.t <= 0) e.bubble = null; }
  }
  function walkToward(e, x, dt, mult = 1) {
    const dx = x - e.x;
    e.dir = Math.sign(dx) || e.dir;
    const step = T.G.walkSpeed() * mult * dt * (e.kind === 'kid' ? 1.15 : 1);
    if (Math.abs(dx) <= step) { e.x = x; return true; }
    e.x += Math.sign(dx) * step;
    e.walking = true;
    if (Math.random() < dt * 0.6 && T.cam.z > 0.6) T.fx.dust(e.x - e.dir * 6, 0, 1);
    return false;
  }
  const doorX = (st) => st.x + (T.st.shape(st).w * B) / 2;

  // shared town routine for anyone who lives in the village; returns true if it took over this frame
  function townLife(e, dt) {
    const s = S();
    if (s.era < 1) return false;
    if (e.kind !== 'kid') {
      if (e.inside !== 'sleep') e.d.life -= dt * (e.inside ? 0.3 : 1);
      if (e.d.life <= 0) { T.vil.die(e); return true; }
      if (e.d.life < T.vil.maxLife() * 0.15 && Math.random() < dt * 0.1 && !e.bubble) e.bubble = { text: '졸려…', t: 1.4 };
    }
    const n = T.vil.night();
    const home = e.d.home && T.st.byUid(e.d.home);
    if (e.inside) {
      e.insideT -= dt;
      if (e.inside === 'sleep') {
        if (e.kind !== 'kid') e.d.life = Math.min(T.vil.maxLife(), e.d.life + dt * 4 * Math.pow(1.5, s.lup.nap || 0));
        if (n < 0.25 && e.insideT <= 0) { e.inside = null; e.y = 0; e.happyT = 1; e.vy = 90; e.sleepyT = 2; }
      } else if (e.insideT <= 0) { e.inside = null; e.y = 0; e.happyT = 1.6; e.visitBuff = 60; if (Math.random() < 0.4) e.bubble = { text: ['좋았다', '♪', '또 와야지'][Math.floor(Math.random() * 3)], t: 1.4 }; }
      return true;
    }
    if (n > 0.6) {
      if (home) {
        if (walkToward(e, doorX(home), dt, 1.2)) { e.inside = 'sleep'; e.insideT = 1 + Math.random() * 4; e.proj && setProj(e, null); }
        return true;
      }
      e.napping = true;
      if (e.kind !== 'kid') e.d.life = Math.min(T.vil.maxLife(), e.d.life + dt * 0.8);
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
      case 'rest': e.sleepyT = 0.3; if (e.kind !== 'kid' && S().era >= 1) e.d.life = Math.min(T.vil.maxLife(), e.d.life + dt * 0.6); break;
      case 'wave': e.happyT = 0.3; break;
    }
  }

  function updateArch(e, dt) {
    timers(e, dt); physics(e, dt);
    e.walking = false;
    if (e.held || e.y > 0 || e.dizzyT > 0) return;
    if (townLife(e, dt)) return;
    if (e.emote) { doEmote(e, dt); return; }
    const petted = e.petT > 0;
    if (petted && Math.random() < dt * 1.2) T.fx.sparkle(e.x + (Math.random() - 0.5) * 14, e.y + 18 + Math.random() * 6);
    e.emoteCD -= dt;
    if (e.emoteCD < 0) { e.emoteCD = 18 + Math.random() * 40; if (!e.bubble && T.cam.z > 0.8) e.bubble = { text: ['♪', '…', '흠흠', '♬', '영차'][Math.floor(Math.random() * 5)], t: 1.5 }; }
    if (e.mournT > 0 && !(e.proj && e.proj.src === 'grave')) return;
    e.t -= dt;
    // project upkeep
    if (e.proj && (!S().structs.includes(e.proj) || T.st.done(e.proj))) setProj(e, null);
    if (!e.proj && e.t <= 0) {
      const st = findProject(e);
      if (st) setProj(e, st);
      else if (S().era >= 1 && Math.random() < 0.3) startVisit(e);
      else { e.walkTo = e.x + (Math.random() - 0.5) * 160; e.t = 2 + Math.random() * 3; }
    }
    if (!e.proj) { if (e.walkTo !== null && walkToward(e, e.walkTo, dt, 0.6)) e.walkTo = null; lookAround(e); return; }
    const st = e.proj;
    const ci = T.st.nextCell(st, e.x);
    if (ci < 0) { // waiting: everything reserved or still being cleared
      if (e.t <= 0) { setProj(e, null); e.t = 1; }
      lookAround(e); return;
    }
    const [tx, ty] = T.st.cellPos(st, ci);
    const range = T.G.throwRange();
    const dx = tx - e.x;
    if (!S().pup.light && Math.abs(dx) > range * 0.9) { walkToward(e, tx - Math.sign(dx) * range * 0.5, dt); e.look = [e.dir, 0]; return; }
    e.dir = Math.sign(dx) || e.dir;
    e.look = [Math.abs(dx) > 6 ? Math.sign(dx) : 0, ty > 40 ? -1 : 0];
    if (e.t <= 0) {
      if (!e.windT) e.windT = 0.001;
      e.windT += dt;
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
    const vs = T.vil.done().filter((st) => T.DEF[st.id].visit && Math.abs(st.x - e.x) < 900);
    if (!vs.length) return;
    const st = vs[Math.floor(Math.random() * vs.length)];
    e.visitTarget = st;
    e.emote = 'visit'; e.emoteT = 30;
  }

  // ── workers & kids ───────────────────────────────────────
  function updateWorker(e, dt) {
    timers(e, dt); physics(e, dt);
    e.walking = false;
    if (e.held || e.y > 0 || e.dizzyT > 0) return;
    if (townLife(e, dt)) return;
    if (e.emote && e.emote !== 'visit') { doEmote(e, dt); return; }
    if (!e.job || !T.G.s.structs.includes(e.job)) {
      const jobs = T.vil.done().filter((st) => ['prod', 'market'].includes(T.DEF[st.id].cat));
      e.job = jobs.length ? jobs.sort((a, b) => Math.abs(a.x - e.x) - Math.abs(b.x - e.x))[Math.floor(Math.random() * Math.min(2, jobs.length))] : null;
      if (!e.job) { if (!e.walkTo) e.walkTo = e.x + (Math.random() - 0.5) * 120; if (walkToward(e, e.walkTo, dt, 0.5)) e.walkTo = null; lookAround(e); return; }
    }
    const sh = T.st.shape(e.job);
    const spot = e.job.x + B + ((e.phase * 13) % 1) * 0 + (e.spot ?? (e.spot = Math.random())) * (sh.w - 2) * B;
    if (!walkToward(e, spot, dt)) { lookAround(e); return; }
    e.t -= dt;
    e.look = [e.dir, 0];
    if (e.t <= 0) {
      e.t = 3;
      const g = T.vil.goodsRate();
      T.G.earnGoods(g);
      hop(e, 90);
      if (T.cam.z > 0.7) T.fx.floatText(e.x, e.y + 26, '+' + T.fmt(g) + ' 물자', false);
    }
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

  // ── painters ─────────────────────────────────────────────
  const brushSize = () => Math.round(5 * Math.pow(1.6, S().gup.brush || 0));
  const strokeTime = () => 2.5 * Math.pow(0.85, S().gup.stroke || 0);
  const paintMult = () => 4 * Math.pow(2, S().gup.dense || 0);
  function updatePainter(e, dt) {
    timers(e, dt); physics(e, dt);
    e.walking = false;
    if (e.held || e.y > 0 || e.dizzyT > 0) return;
    if (e.emote) { doEmote(e, dt); return; }
    if (e.walking || Math.random() < dt * 4) T.world.stain(e.x, e.col, e.walking ? 0.35 : 0.1);
    if (!e.job || !S().structs.includes(e.job) || (e.job.p || 0) >= T.st.shape(e.job).cells.length) {
      const todo = T.vil.done().filter((st) => (st.p || 0) < T.st.shape(st).cells.length && st.src !== 'grave');
      todo.sort((a, b) => Math.abs(a.x - e.x) - Math.abs(b.x - e.x));
      e.job = todo[Math.floor(Math.random() * Math.min(3, todo.length))] || null;
      if (!e.job) { if (!e.walkTo) e.walkTo = e.x + (Math.random() - 0.5) * 240; if (walkToward(e, e.walkTo, dt, 0.7)) e.walkTo = null; e.look = [e.dir, 0]; return; }
    }
    const sh = T.st.shape(e.job);
    const target = e.job.x + (sh.w * B) / 2;
    if (Math.abs(target - e.x) > T.G.throwRange()) { walkToward(e, target, dt, 1.3); e.walking = true; e.look = [e.dir, 0]; return; }
    e.look = [0, -1];
    e.t -= dt;
    if (e.t <= 0) {
      e.t = strokeTime();
      const st = e.job;
      const from = st.p || 0;
      const n = T.st.paint(st, brushSize());
      const v = T.G.bestValue() * paintMult() * n * 0.15;
      T.G.earn(v);
      S().stats.paintBlocks += n;
      hop(e, 140); e.sq = -0.2;
      for (let k = 0; k < Math.min(4, n); k++) {
        const [cx, cy] = T.st.cellPos(st, from + Math.floor((k / 4) * n));
        flights.push({ x0: e.x, y0: e.y + 16, x1: cx, y1: cy, t: 0, dur: 0.5, h: 30, color: T.CELL[T.st.cellCh(st, from)] || e.col, paint: true, onLand: () => T.fx.splash(cx, cy, e.col) });
      }
      if ((st.p || 0) >= sh.cells.length) { e.happyT = 2; if (Math.random() < 0.5) e.bubble = { text: '알록달록!', t: 1.4 }; }
    }
  }
  // ── demolishers ──────────────────────────────────────────
  function updateDemo(e, dt) {
    timers(e, dt); physics(e, dt);
    e.walking = false;
    if (e.held || e.y > 0 || e.dizzyT > 0) return;
    if (e.emote) { doEmote(e, dt); return; }
    if (!e.job || !S().structs.includes(e.job)) {
      const c = T.st.condemned();
      e.job = c.sort((a, b) => Math.abs(a.x - e.x) - Math.abs(b.x - e.x))[0] || null;
      if (!e.job) { T.st.clearedCheck(); if (!e.walkTo) e.walkTo = (Math.random() - 0.5) * 200; if (walkToward(e, e.walkTo, dt, 0.5)) e.walkTo = null; e.look = [e.dir, 0]; return; }
    }
    const sh = T.st.shape(e.job);
    const tx = e.job.x + (sh.w * B) / 2;
    if (!walkToward(e, tx, dt, 1.3)) { e.look = [e.dir, 0]; return; }
    e.t -= dt;
    e.look = [0, -1];
    if (e.t <= 0) {
      e.t = 0.55;
      e.hits = (e.hits || 0) + 1;
      e.sq = 0.25; hop(e, 80);
      T.audio.thunk();
      T.fx.dust(tx + (Math.random() - 0.5) * sh.w * B, Math.random() * sh.h * B * 0.6, 3);
      const need = Math.max(4, Math.ceil(sh.cells.length / 40));
      e.job.hits = (e.job.hits || 0) + 1;
      if (e.job.hits >= need) { T.st.remove(e.job); e.job = null; T.st.clearedCheck(); e.happyT = 1.5; }
    }
  }

  // ── update all ───────────────────────────────────────────
  function update(dt) {
    for (const e of archs.slice()) updateArch(e, dt);
    for (const e of workers.slice()) { if (e.emote === 'visit') visitStep(e, dt); updateWorker(e, dt); }
    for (const e of kids.slice()) updateKid(e, dt);
    for (const e of painters) updatePainter(e, dt);
    for (const e of demos) updateDemo(e, dt);
    for (const e of archs) if (e.emote === 'visit') visitStep(e, dt);
    for (let i = flights.length - 1; i >= 0; i--) {
      const f = flights[i];
      f.t += dt;
      if (f.t >= f.dur) { flights.splice(i, 1); f.onLand(); }
    }
  }
  function visitStep(e, dt) {
    const st = e.visitTarget;
    if (!st || !S().structs.includes(st) || e.inside || T.vil.night() > 0.6) { e.emote = null; return; }
    if (walkToward(e, doorX(st), dt)) { e.inside = 'visit'; e.insideT = 4 + Math.random() * 5; e.emote = null; }
  }

  // ── draw ─────────────────────────────────────────────────
  function drawCreature(ctx, e) {
    if (e.inside) return;
    const color = S().flags.color;
    const kind = e.kind === 'painter' ? 'drop' : e.kind === 'demo' ? 'demo' : e.d.s;
    const [sx, sy] = T.w2s(e.x, e.y);
    if (sx < -60 || sx > T.cam.W + 60 || sy < -80 || sy > T.cam.H + 80) return;
    const scale = e.kind === 'kid' ? 0.58 : e.kind === 'worker' ? 0.85 : 1;
    const ps = P * T.cam.z * scale;
    if (ps < 0.5) {
      ctx.fillStyle = color ? T.shade(kind === 'drop' ? '#7ec8e3' : kind === 'demo' ? '#c96f4a' : T.SHAPE[kind].color, -0.2) : '#555';
      const w = Math.max(1.5, 14 * ps); ctx.fillRect(sx - w / 2, sy - w, w, w); return;
    }
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
    if (e.kind === 'demo') hat = 'helmet';
    if (e.y > 2) { const [gx, gy] = T.w2s(e.x, 0); const k = T.clamp(1 - e.y / 300, 0.2, 1); ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(gx - 7 * ps * k, gy - ps, 14 * ps * k, ps); }
    const napY = e.napping ? 3 * ps : 0;
    T.sprites.draw(ctx, kind, color, { sx, sy: sy - bob + napY, ps, face, look: e.look, legs, hat, sq: e.napping ? 0.25 : e.sq, dangle: e.held });
    if (kind === 'drop') {
      const bx = sx + e.dir * 8 * ps, by = sy - 10 * ps - bob;
      ctx.fillStyle = color ? '#8d6748' : '#555'; ctx.fillRect(bx, by - 7 * ps, ps, 7 * ps);
      ctx.fillStyle = color ? e.col : '#999'; ctx.fillRect(bx - ps * 0.5, by - 9 * ps, ps * 2, ps * 2.5);
    }
    if (kind === 'demo') {
      const swing = e.t < 0.2 ? -1 : 1;
      const bx = sx + e.dir * 9 * ps, by = sy - 9 * ps - bob;
      ctx.fillStyle = color ? '#8d6748' : '#555'; ctx.fillRect(bx, by - 6 * ps * swing, ps, 6 * ps);
      ctx.fillStyle = color ? '#6b7280' : '#444'; ctx.fillRect(bx - ps, by - 8 * ps * swing, ps * 3, ps * 2);
    }
    if (e.kind === 'worker' && ps > 1) { ctx.fillStyle = color ? '#f4efe6' : '#ddd'; ctx.fillRect(sx - 3 * ps, sy - 6 * ps - bob, 6 * ps, 3 * ps); }
    if (e.napping && ps > 1 && Math.sin(e.phase * 2) > 0) { ctx.fillStyle = color ? '#8ecae6' : '#888'; ctx.font = `${Math.round(8 * T.cam.z)}px Galmuri9, monospace`; ctx.fillText('z', sx + 8 * ps, sy - 18 * ps - Math.sin(e.phase) * 3); }
    if (e.mournT > 0 && ps > 1 && Math.random() < 0.06) T.fx.tear(e.x + e.dir * 3, e.y + 12);
    if (e.petT > 0 && ps > 1) {
      ctx.fillStyle = color ? 'rgba(242,159,174,0.9)' : 'rgba(120,120,120,0.8)';
      const hx = sx + 9 * ps, hy = sy - 20 * ps - Math.sin(e.phase * 3) * ps, hp = Math.max(1, ps * 0.7);
      ctx.fillRect(hx, hy, hp, hp); ctx.fillRect(hx + 2 * hp, hy, hp, hp); ctx.fillRect(hx, hy + hp, hp * 3, hp); ctx.fillRect(hx + hp, hy + 2 * hp, hp, hp);
    }
    if (e.bubble && ps > 0.9) drawBubble(ctx, sx, sy - 24 * ps - bob, e.bubble.text, Math.min(1, e.bubble.t * 4));
  }
  function drawBubble(ctx, x, y, text, a) {
    ctx.save();
    ctx.globalAlpha = a;
    ctx.font = '11px Galmuri11, monospace';
    const w = Math.ceil(ctx.measureText(text).width) + 10, h = 17;
    const bx = Math.round(x - w / 2), by = Math.round(y - h);
    ctx.fillStyle = '#2b2b2b'; ctx.fillRect(bx - 1, by, w + 2, h); ctx.fillRect(bx, by - 1, w, h + 2);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(bx, by, w, h);
    ctx.fillStyle = '#2b2b2b'; ctx.fillRect(Math.round(x) - 1, by + h + 1, 3, 2); ctx.fillRect(Math.round(x), by + h + 3, 1, 1);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(x), by + h, 1, 1);
    ctx.fillStyle = '#2b2b2b'; ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
    ctx.fillText(text, Math.round(x), by + h / 2 + 1);
    ctx.restore();
  }
  function drawTag(ctx, e) {
    const [sx, sy] = T.w2s(e.x, e.y);
    const ps = P * T.cam.z;
    const text = e.kind === 'arch' ? `${e.d.name}  Lv.${e.d.lvl}` : e.kind === 'painter' ? '방울' : e.kind === 'demo' ? '망치' : e.d.name;
    ctx.save();
    ctx.font = '11px Galmuri11, monospace';
    const w = Math.ceil(ctx.measureText(text).width) + 10;
    const bx = Math.round(sx - w / 2), by = Math.round(sy - 22 * ps - 22 - (e.bubble ? 22 : 0));
    ctx.fillStyle = 'rgba(43,43,43,0.88)'; ctx.fillRect(bx, by, w, 16);
    if (S().era >= 1 && e.d && e.d.life !== undefined) { ctx.fillStyle = '#ef6f91'; ctx.fillRect(bx, by + 15, w * T.clamp(e.d.life / T.vil.maxLife(), 0, 1), 2); }
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, Math.round(sx), by + 9);
    ctx.restore();
  }
  function drawFlights(ctx) {
    const z = T.cam.z;
    for (const f of flights) {
      const t = T.easeInOut(Math.min(1, f.t / f.dur));
      const cx = (f.x0 + f.x1) / 2, cy = Math.max(f.y0, f.y1) + f.h;
      const u = 1 - t;
      const x = u * u * f.x0 + 2 * u * t * cx + t * t * f.x1;
      const y = u * u * f.y0 + 2 * u * t * cy + t * t * f.y1;
      const [sx, sy] = T.w2s(x, y);
      if (f.paint) { const r = Math.max(1.5, 2.5 * z); ctx.fillStyle = f.color; ctx.fillRect(sx - r, sy - r, r * 2, r * 2); }
      else {
        const sz = B * z;
        ctx.fillStyle = T.shade(f.color, -0.36); ctx.fillRect(sx - sz / 2, sy - sz / 2, sz, sz);
        ctx.fillStyle = f.color; ctx.fillRect(sx - sz / 2, sy - sz / 2, sz - Math.max(1, z), sz - Math.max(1, z));
      }
    }
  }
  function draw(ctx) {
    drawFlights(ctx);
    for (const e of archs) drawCreature(ctx, e);
    for (const e of workers) drawCreature(ctx, e);
    for (const e of kids) drawCreature(ctx, e);
    for (const e of painters) drawCreature(ctx, e);
    for (const e of demos) drawCreature(ctx, e);
    if (hover && !hover.held && !hover.inside && T.cam.z > 0.7) drawTag(ctx, hover);
  }
  // sleeping houses breathe little z's at night
  function drawSleepers(ctx, n) {
    if (n < 0.5 || T.cam.z < 0.5) return;
    const t = performance.now() / 1000;
    const seen = new Set();
    for (const e of archs.concat(workers, kids)) {
      if (e.inside !== 'sleep' || !e.d.home || seen.has(e.d.home)) continue;
      seen.add(e.d.home);
      const h = T.st.byUid(e.d.home);
      if (!h) continue;
      const sh = T.st.shape(h);
      const [sx, sy] = T.w2s(h.x + sh.w * B * 0.7, sh.h * B);
      ctx.fillStyle = `rgba(200,220,255,${0.5 + Math.sin(t * 2 + h.uid) * 0.3})`;
      ctx.font = `${Math.round(9 * T.cam.z)}px Galmuri9, monospace`;
      ctx.fillText('z', sx, sy - ((t * 8 + h.uid * 3) % 16) * T.cam.z);
      ctx.fillText('Z', sx + 6 * T.cam.z, sy - 8 * T.cam.z - ((t * 8 + h.uid * 3 + 8) % 16) * T.cam.z);
    }
  }

  T.ent = {
    archs, workers, kids, painters, demos, flights, all,
    spawnArch, spawnWorker, spawnKid, growUp, removeEntity, rebuild, syncPets, update, draw, drawSleepers,
    pick, pet, hold, drag, release, hop, notifyPlayerBlock, groupAction, setProj,
    set hover(v) { hover = v; }, get hover() { return hover; },
    brushSize, strokeTime, paintMult,
  };
})();
