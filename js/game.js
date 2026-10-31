'use strict';
// ─────────────────────────────────────────────────────────────
//  GAME: 상태, 경제, 리셋, 이정표, 연대기, 자동화, 저장
// ─────────────────────────────────────────────────────────────
(function () {
  const SAVE_KEY = 'tessera-save-v2';
  const B = T.B;
  const pw = Math.pow;

  function defaultState() {
    return {
      v: 2,
      shards: 0, runEarned: 0,
      vertices: 0, vertsRun: 0,
      prisms: 0, prismsRun: 0,
      pigments: 0, pigRun: 0,
      lanterns: 0, eraLanterns: 0,
      goods: 0, eraGoods: 0,
      up: {}, vup: {}, pup: {}, gup: {}, lup: {}, mup: {}, autoOff: {},
      ms: 0, era: 0, clock: 60,
      archs: [], workers: [], kids: [], structs: [], zones: [], player: [],
      bps: { done: {} }, run: { built: [] },
      flags: { l1Seen: false, l2Seen: false, l3Seen: false, l4Seen: false, l1Done: 0, l2Done: 0, l3Done: 0, l4Done: 0,
        color: false, painter: false, rosette: false, seenTabs: {}, credits: false },
      stats: { lifeBlocks: 0, lifeEarned: 0, lifeVerts: 0, lifePrisms: 0, lifePigments: 0, lifeLanterns: 0, lifeGoods: 0,
        clicks: 0, pets: 0, played: 0, built: 0, paintBlocks: 0 },
      settings: { sound: true, gap: 1 },
      last: Date.now(),
    };
  }

  const G = (T.G = { s: defaultState(), M: 1, rate: 0, _acc: 0 });
  const lv = (o, id) => (o && o[id]) || 0;
  G.lv = lv;

  // ── derived ──────────────────────────────────────────────
  G.shapeUnlocked = function (id) {
    const s = G.s;
    return id === 'square' || !!s.vup['u_' + id] || !!s.pup['u_' + id];
  };
  G.owned = (id) => G.s.archs.filter((a) => a.s === id).length;
  G.maxSculptTier = () => (G.s.ms >= 4 ? 2 : G.s.ms >= 2 ? 1 : 0);
  G.fame = function () {
    let m = 1;
    for (const id in G.s.bps.done) if (G.s.bps.done[id] > 0) m *= 1.1 * pw(1.02, Math.min(G.s.bps.done[id] - 1, 25));
    return m;
  };
  G.coverage = function () {
    let tot = 0, p = 0;
    for (const st of G.s.structs) { if (st.f !== null || st.src === 'grave') continue; const n = T.st.shape(st).cells.length; tot += n; p += Math.min(st.p || 0, n); }
    return tot ? p / tot : 0;
  };
  G.computeMult = function () {
    const s = G.s;
    let m = pw(1.5, lv(s.up, 'eye'));
    m *= Math.sqrt(1 + s.vertices) * pw(1 + s.prisms, 0.6) * pw(1 + s.pigments, 0.7) * pw(1 + s.lanterns, 0.8);
    m *= pw(2, lv(s.vup, 'bless')) * pw(3, lv(s.pup, 'spectrum')) * pw(5, lv(s.gup, 'all')) * pw(10, lv(s.lup, 'lshard')) * pw(25, lv(s.mup, 'm_shard'));
    if (s.pup.harmony) m *= pw(1.5, new Set(s.archs.map((a) => a.s)).size);
    m *= G.fame() * T.msShardMult(s.ms) * pw(4, s.era);
    if (s.flags.painter) m *= 1 + 2 * G.coverage();
    G.M = m;
    return m;
  };
  G.lvlMult = (l) => (1 + 0.4 * l) * pw(2, Math.floor(l / 10));
  G.blockValue = (d) => (T.SHAPE[d.s].value + lv(G.s.up, 'solid')) * G.lvlMult(d.lvl || 0) * G.M;
  G.bestValue = function () { let b = (1 + lv(G.s.up, 'solid')) * G.M; for (const a of G.s.archs) b = Math.max(b, G.blockValue(a)); return b; };
  G.petDur = () => 10 * pw(2, lv(G.s.vup, 'pet'));
  G.cooldown = function (d, petted, team = 1, happy = 0) {
    const s = G.s;
    let cd = T.SHAPE[d.s].cd * pw(0.92, lv(s.up, 'quick')) * pw(0.94, lv(s.mup, 'm_cd'));
    if (petted) cd *= s.vup.pet ? 0.55 : 0.7;
    if (team > 1) cd *= Math.max(0.5, 1 - 0.04 * lv(s.up, 'team') * (team - 1));
    cd /= 1 + happy * 0.5;
    return Math.max(0.3, cd);
  };
  G.walkSpeed = () => 34 * (1 + 0.3 * lv(G.s.up, 'walk')) * pw(1.5, lv(G.s.vup, 'legs'));
  G.throwRange = () => 130 * (1 + 0.35 * lv(G.s.up, 'arm')) * pw(1.5, lv(G.s.vup, 'legs'));
  G.clickCD = () => 0.7 * pw(0.88, lv(G.s.up, 'tap')) * (G.s.ms >= 5 ? 0.7 : 1);
  G.clickValue = () => (1 + lv(G.s.up, 'solid')) * pw(2, lv(G.s.up, 'hand')) * G.M;
  G.hireCost = (id) => { const sh = T.SHAPE[id]; return sh.cost * pw(sh.growth, G.owned(id)); };
  G.levelCost = (d) => T.SHAPE[d.s].cost * 0.5 * pw(1.5, d.lvl);
  G.bpSlots = () => 1 + lv(G.s.vup, 'shelf');
  G.focus = () => 0.6 + 0.08 * lv(G.s.up, 'focus');
  G.luckyChance = () => 0.01 * lv(G.s.vup, 'lucky');
  G.archColor = (d) => (G.s.flags.color ? T.SHAPE[d.s].color : T.SHAPE[d.s].gray);
  G.playerColor = () => (G.s.flags.color ? T.PLAYER_COLOR.color : T.PLAYER_COLOR.gray);

  // ── reset layers ─────────────────────────────────────────
  G.L = [
    null,
    { id: 1, name: '재구성', cur: '꼭짓점', icon: 'vertex', key: 'vertices',
      seen: (s) => s.ms >= 3 || s.flags.l1Done > 0, need: 1e6, prog: (s) => s.runEarned, needText: '이번 회차 조각',
      raw: (s) => 3 * Math.sqrt(s.runEarned / 1e6) * pw(1.25, lv(s.up, 'omen')) * pw(1.5, lv(s.vup, 'res')) * pw(2, lv(s.pup, 'refr')) * (s.ms >= 6 ? 1.5 : 1) },
    { id: 2, name: '굴절', cur: '프리즘', icon: 'prism', key: 'prisms',
      seen: (s) => s.ms >= 7 || s.flags.l2Done > 0, need: 1500, prog: (s) => s.vertsRun, needText: '이번 굴절까지 꼭짓점',
      raw: (s) => 2 * Math.sqrt(s.vertsRun / 1500) * pw(2, lv(s.gup, 'prismX')) * (s.ms >= 9 ? 1.5 : 1) },
    { id: 3, name: '물들임', cur: '안료', icon: 'pigment', key: 'pigments',
      seen: (s) => s.ms >= 10 || s.flags.l3Done > 0, need: 60, prog: (s) => s.prismsRun, needText: '이번 물들임까지 프리즘',
      raw: (s) => 2 * Math.sqrt(s.prismsRun / 60) },
    { id: 4, name: '정착', cur: '등불', icon: 'lantern', key: 'lanterns',
      seen: (s) => s.ms >= 12 || s.flags.l4Done > 0, need: 40, prog: (s) => s.pigRun, needText: '이번 정착까지 안료',
      raw: (s) => 2 * Math.sqrt(s.pigRun / 40) * pw(1.5, lv(s.lup, 'lantern')) * (s.ms >= 13 ? 1.5 : 1) * (s.ms >= 16 ? 2 : 1) },
  ];
  G.L.forEach((L) => { if (L) L.gain = (s) => Math.floor(L.raw(s)); });
  G.canReset = (n) => G.L[n].prog(G.s) >= G.L[n].need && G.L[n].gain(G.s) >= 1;

  // everything a run owns. After settling, the village and its people survive the small resets.
  function baseRun(level) {
    const s = G.s;
    s.shards = s.vup.fund ? 100 * pw(10, s.vup.fund) : 0;
    s.runEarned = 0;
    s.up = {};
    s.run = { built: [] };
    s.player = [];
    const keepVillage = s.era >= 1 && level < 4;
    if (keepVillage) {
      for (const a of s.archs) a.lvl = 0;
      s.structs = s.structs.filter((st) => st.f === null || st.src === 'bp');
    } else {
      s.archs = []; s.workers = []; s.kids = []; s.structs = [];
      if (level >= 4) s.zones = s.zones.filter((z) => !z.auto);
    }
    const mem = lv(s.vup, 'memory');
    while (G.owned('square') < mem) addArch('square', 0);
    if (s.pup.dawn) { let n = 0; for (const a of s.archs) if (a.lvl >= 5) n++; while (n < 2) { addArch('square', 5); n++; } }
  }
  function keepShapes(s) { return s.pup.keepShapes ? { u_triangle: s.vup.u_triangle, u_circle: s.vup.u_circle, u_pentagon: s.vup.u_pentagon } : {}; }
  G.applyReset = function (n) {
    const s = G.s;
    T.ui.closeCard();
    if (T.st.placing) T.st.cancel();
    const gain = G.L[n].gain(s);
    if (n === 1) { s.vertices += gain; s.vertsRun += gain; s.stats.lifeVerts += gain; s.flags.l1Done++; }
    if (n >= 2) { s.vertices = 0; s.vertsRun = 0; s.vup = keepShapes(s); }
    if (n === 2) { s.prisms += gain; s.prismsRun += gain; s.stats.lifePrisms += gain; s.flags.l2Done++; s.flags.color = true; }
    if (n >= 3) { s.prisms = 0; s.prismsRun = 0; const kp = s.gup.keepPrism; s.pup = kp ? { u_star: s.pup.u_star, u_hexagon: s.pup.u_hexagon, keepShapes: s.pup.keepShapes } : {}; s.vup = keepShapes(s); }
    if (n === 3) { s.pigments += gain; s.pigRun += gain; s.stats.lifePigments += gain; s.flags.l3Done++; s.flags.painter = true; }
    if (n === 4) {
      s.lanterns += gain; s.eraLanterns += gain; s.stats.lifeLanterns += gain; s.flags.l4Done++;
      s.pigments = 0; s.pigRun = 0;
      if (!s.lup.keepPig) s.gup = {};
      if (s.era < 1) { s.era = 1; s.clock = 30; }
    }
    baseRun(n);
    finishReset();
    return gain;
  };
  G.claimMilestone = function () {
    const s = G.s;
    const m = T.MILESTONES[s.ms];
    if (!m || !G.msReady()) return false;
    T.ui.closeCard();
    if (T.st.placing) T.st.cancel();
    s.ms++;
    baseRun(0);
    finishReset();
    return true;
  };
  G.msReady = function () {
    const m = T.MILESTONES[G.s.ms];
    if (!m) return false;
    const [c, n] = m.prog(G.s);
    return c >= n;
  };
  G.eraReady = function () {
    const s = G.s;
    const req = T.ERA_REQ[s.era + 1];
    if (!req || s.era < 1) return false;
    return req.every((r) => r.cur(s) >= r.need);
  };
  G.advanceEra = function () {
    const s = G.s;
    if (!G.eraReady()) return false;
    s.era++;
    s.eraLanterns = 0; s.eraGoods = 0;
    s.lanterns = 0; s.goods = 0;
    s.vertices = 0; s.vertsRun = 0; s.prisms = 0; s.prismsRun = 0; s.pigments = 0; s.pigRun = 0;
    s.vup = keepShapes(s); s.pup = {}; if (!s.lup.keepPig) s.gup = {};
    baseRun(5);
    s.clock = 30;
    finishReset();
    return true;
  };
  function finishReset() {
    T.ent.syncPets();
    G.computeMult();
    G.rebuild();
    G.save();
  }

  // ── architects ───────────────────────────────────────────
  function addArch(shapeId, lvl = 0, silent = true) {
    const s = G.s;
    const sh = T.SHAPE[shapeId];
    const ord = s.archs.filter((a) => a.s === shapeId).length + (s.stats['ord_' + shapeId] || 0);
    s.stats['ord_' + shapeId] = (s.stats['ord_' + shapeId] || 0) + 1;
    const pool = sh.names;
    const name = pool[ord % pool.length] + (ord >= pool.length ? ' ' + (Math.floor(ord / pool.length) + 1) : '');
    const d = { s: shapeId, o: ord % 64, lvl, n: 0, name, home: 0 };
    s.archs.push(d);
    return T.ent.spawnArch(d, silent);
  }
  G.addArch = addArch;
  G.hire = function (id) {
    const c = G.hireCost(id);
    if (G.s.shards < c || !G.shapeUnlocked(id)) return false;
    G.s.shards -= c;
    addArch(id, 0, false);
    G.computeMult();
    if (T.vil) T.vil.assignHomes();
    return true;
  };
  G.levelUp = function (d) {
    const c = G.levelCost(d);
    if (G.s.shards < c) return false;
    G.s.shards -= c; d.lvl++;
    return true;
  };
  G.book = (store) => [G.s.up, G.s.vup, G.s.pup, G.s.gup, G.s.lup, G.s.mup][store];
  G.curKey = (store) => ['shards', 'vertices', 'prisms', 'pigments', 'lanterns', 'goods'][store];
  G.UPS = () => [T.UP0, T.UP1, T.UP2, T.UP3, T.UP4, T.UP5];
  G.upVisible = (store, def) => G.s.ms >= (def.ms || 0) && (!def.req || def.req(G.s));
  G.buyUp = function (store, def) {
    const s = G.s, book = G.book(store), key = G.curKey(store);
    const l = lv(book, def.id);
    if (l >= def.max || !G.upVisible(store, def)) return false;
    const c = def.cost(l);
    if (s[key] < c) return false;
    s[key] -= c;
    book[def.id] = l + 1;
    if ((store === 3 && def.id === 'painter') || (store === 4 && def.id === 'demo')) T.ent.syncPets();
    G.computeMult();
    return true;
  };

  // ── earning ──────────────────────────────────────────────
  G.earn = function (v) {
    const s = G.s;
    s.shards += v; s.runEarned += v; s.stats.lifeEarned += v;
    G._acc += v;
  };
  G.earnGoods = function (g) {
    const s = G.s;
    s.goods += g; s.eraGoods += g; s.stats.lifeGoods += g;
  };

  // ── automation & passive income (bought with goods) ──────
  G.autoOn = (id) => !!G.s.mup[id] && !G.s.autoOff[id];
  G.automate = function (dt) {
    const s = G.s;
    if (G.autoOn('a_hire')) {
      let best = null, bc = Infinity;
      for (const sh of T.SHAPES) if (G.shapeUnlocked(sh.id)) { const c = G.hireCost(sh.id); if (c < bc) { bc = c; best = sh.id; } }
      if (best && s.shards >= bc) G.hire(best);
    }
    if (G.autoOn('a_level')) {
      let best = null, bc = Infinity;
      for (const d of s.archs) { const c = G.levelCost(d); if (c < bc) { bc = c; best = d; } }
      if (best && s.shards >= bc * 2) G.levelUp(best);
    }
    [['a_up0', 0], ['a_up1', 1], ['a_up2', 2], ['a_up3', 3]].forEach(([id, store]) => {
      if (!G.autoOn(id)) return;
      if (store === 1 && !s.flags.l1Done) return;
      if (store === 2 && !s.flags.l2Done) return;
      if (store === 3 && !s.flags.l3Done) return;
      const book = G.book(store), key = G.curKey(store);
      let best = null, bc = Infinity;
      for (const def of G.UPS()[store]) {
        if (!G.upVisible(store, def) || lv(book, def.id) >= def.max) continue;
        const c = def.cost(lv(book, def.id));
        if (c < bc) { bc = c; best = def; }
      }
      if (best && s[key] >= bc) G.buyUp(store, best);
    });
    const av = lv(s.mup, 'a_vert');
    if (av && s.flags.l1Done) { const g = G.L[1].raw(s) * 0.01 * av * dt; s.vertices += g; s.vertsRun += g; s.stats.lifeVerts += g; }
    const ap = lv(s.mup, 'a_prism');
    if (ap && s.flags.l2Done) { const g = G.L[2].raw(s) * 0.005 * ap * dt; s.prisms += g; s.prismsRun += g; s.stats.lifePrisms += g; }
  };

  // ── world drawing ────────────────────────────────────────
  function drawPlayerBlock(p) {
    const back = T.st.inFootprint(p[0], p[1]);
    T.world.drawBlock(p[0], p[1], G.playerColor(), false, back ? 'back' : 'front');
  }
  G.drawPlayerBlock = drawPlayerBlock;
  G.redrawRange = function (x0, x1) {
    const [a, b] = T.world.clearRange(x0, x1);
    const s = G.s;
    for (const p of s.player) if (p[0] >= a - B && p[0] <= b + B) drawPlayerBlock(p);
    if (s.flags.rosette) for (const e of T.ent.archs) if (e.pos) for (const p of e.pos) if (p[0] >= a - B && p[0] <= b + B) T.world.drawBlock(p[0], p[1], G.archColor(e.d), false, 'back');
    for (const st of s.structs) { const [sa, sb] = T.st.bbox(st); if (sb >= a && sa <= b) T.st.drawStruct(st); }
  };
  G.rebuild = function () {
    T.world.clear();
    T.st.resetColors();
    T.st.syncUid();
    const s = G.s;
    for (const p of s.player) drawPlayerBlock(p);
    for (const st of s.structs) T.st.drawStruct(st);
    T.ent.rebuild();
    T.vil.assignHomes();
  };

  // ── save / load ──────────────────────────────────────────
  G.serialize = function () { G.s.last = Date.now(); return JSON.stringify(G.s); };
  G.save = function () {
    if (T.main && T.main.noSave) return;
    try { localStorage.setItem(SAVE_KEY, G.serialize()); } catch (e) { /* storage full or blocked */ }
  };
  G.load = function (str) {
    const raw = str || localStorage.getItem(SAVE_KEY);
    if (!raw) { G.oldSave = !!localStorage.getItem('tessera-save-v1'); return false; }
    try {
      const d = JSON.parse(raw);
      if (d.v !== 2) return false;
      const base = defaultState();
      for (const k in base) if (d[k] === undefined) d[k] = base[k];
      d.flags = Object.assign(base.flags, d.flags);
      d.stats = Object.assign(base.stats, d.stats);
      d.settings = Object.assign(base.settings, d.settings);
      G.s = d;
      return true;
    } catch (e) { console.warn('load failed', e); return false; }
  };
  G.exportSave = () => btoa(unescape(encodeURIComponent(G.serialize())));
  G.importSave = function (b64) {
    try { const str = decodeURIComponent(escape(atob(b64.trim()))); if (JSON.parse(str).v !== 2) return false; localStorage.setItem(SAVE_KEY, str); return true; }
    catch (e) { return false; }
  };
  G.wipe = function () { localStorage.removeItem(SAVE_KEY); location.reload(); };

  // offline: architects keep earning (no building progress), workers keep producing
  G.offline = function () {
    const s = G.s;
    const el = Math.min(8 * 3600, (Date.now() - (s.last || Date.now())) / 1000);
    if (el < 60 || (!s.archs.length && !s.workers.length)) return null;
    G.computeMult();
    let earned = 0;
    for (const a of s.archs) earned += (G.blockValue(a) / (G.cooldown(a) * 1.6)) * el * 0.5;
    G.earn(earned);
    let goods = 0;
    if (s.workers.length && T.vil) { goods = s.workers.length * (T.vil.goodsRate() / 3) * el * 0.5; G.earnGoods(goods); }
    return { el, earned, goods };
  };
})();
