'use strict';
// ─────────────────────────────────────────────────────────────
//  GAME: 상태, 경제, 리셋 6겹, 이정표, 연대기, 자동화, 저장
// ─────────────────────────────────────────────────────────────
(function () {
  const SAVE_KEY = 'tessera-save-v4';
  const B = T.B;
  const pw = Math.pow;

  function defaultState() {
    return {
      v: 4, variants: {},
      shards: 0, runEarned: 0,
      vertices: 0, vertsRun: 0, grains: 0, grainRun: 0, prisms: 0, prismsRun: 0,
      pigments: 0, pigRun: 0, folds: 0, foldRun: 0, lanterns: 0, eraLanterns: 0, goods: 0, eraGoods: 0,
      up: {}, vup: {}, sup: {}, pup: {}, gup: {}, zup: {}, lup: {}, mup: {}, autoOff: {},
      resLv: 0, ms: 0, era: 0, clock: 60, day: 1,
      archs: [], workers: [], kids: [], pets: [], structs: [], zones: [], player: [],
      bps: { done: {} }, run: { built: [] }, event: null,
      flags: { l1Done: 0, l2Done: 0, l3Done: 0, l4Done: 0, l5Done: 0, l6Done: 0, seen: {}, color: false, rosette: false, seenTabs: {}, credits: false, tut: 0 },
      stats: { lifeBlocks: 0, lifeEarned: 0, lifeVerts: 0, lifeGrains: 0, lifePrisms: 0, lifePigments: 0, lifeFolds: 0, lifeLanterns: 0, lifeGoods: 0,
        clicks: 0, pets: 0, played: 0, built: 0, paintBlocks: 0, carved: 0, radial: 0 },
      settings: { sound: true, gap: 1, skip: {}, noPlace: false, buyN: 1, vol: { master: 0.8, sfx: 0.9, ui: 0.7 } },
      last: Date.now(),
    };
  }
  const G = (T.G = { s: defaultState(), M: 1, rate: 0, _acc: 0 });
  const lv = (o, id) => (o && o[id]) || 0;
  G.lv = lv;

  // ── stores ───────────────────────────────────────────────
  G.UPS = () => [T.UP0, T.UP1, T.UP2, T.UP3, T.UP4, T.UP5, T.UP6, T.UP7];
  const BOOK = ['up', 'vup', 'sup', 'pup', 'gup', 'zup', 'lup', 'mup'];
  G.book = (store) => G.s[BOOK[store]];
  G.curKey = (store) => ['shards', 'vertices', 'grains', 'prisms', 'pigments', 'folds', 'lanterns', 'goods'][store];
  G.maxOf = function (store, def) {
    if (def.max <= 1 || def.noCap) return def.max;
    const c = T.CAPS[store];
    return c ? def.max + lv(G.s[BOOK[c[0]]], c[1]) * c[2] : def.max;
  };
  G.upVisible = (store, def) => G.s.ms >= (def.ms || 0) && (!def.req || def.req(G.s));

  // ── derived ──────────────────────────────────────────────
  G.shapeUnlocked = (id) => id === 'square' || !!G.s.vup['u_' + id] || !!G.s.pup['u_' + id];
  G.owned = (id) => G.s.archs.filter((a) => a.s === id).length;
  G.layers = () => 1 + lv(G.s.zup, 'layer');
  // highest primitive blueprint tier opened by milestones
  G.maxTier = () => { let t = 0; T.TIER_MS.forEach((m, i) => { if (G.s.ms >= m) t = i; }); return t; };
  G.fever = () => (G.s.event && G.s.event.t > 0 ? 3 : 1);
  // 명성: each recorded design +10%, each repeat +0.4% (up to 25 per design). additive so it stays bounded
  G.fame = function () {
    let m = 1;
    for (const id in G.s.bps.done) if (G.s.bps.done[id] > 0) m += 0.1 + 0.004 * Math.min(G.s.bps.done[id] - 1, 25);
    return m;
  };
  G.coverage = function () {
    let tot = 0, p = 0;
    for (const st of G.s.structs) { if (st.f !== null || st.src === 'grave') continue; const n = T.st.count(st); tot += n; p += T.st.paintedFrac(st) * n; }
    return tot ? p / tot : 0;
  };
  // holding bonus: logarithmic, so piling up a currency never feeds back into itself
  G.hold = (x, p) => pw(1 + Math.log10(1 + Math.max(0, x)), p);
  const ad = (a, l) => 1 + a * l;
  G.computeMult = function () {
    const s = G.s;
    let m = ad(0.4, lv(s.up, 'eye'));
    m *= G.hold(s.vertices, 1) * G.hold(s.grains, 1.1) * G.hold(s.prisms, 1.2) * G.hold(s.pigments, 1.3) * G.hold(s.folds, 1.4) * G.hold(s.lanterns, 1.5);
    m *= ad(1, lv(s.vup, 'bless')) * ad(1, lv(s.sup, 'sharp')) * ad(1.5, lv(s.pup, 'spectrum')) * ad(2, lv(s.gup, 'all'));
    m *= ad(0.75, lv(s.zup, 'depth')) * pw(1.25, G.layers() - 1) * ad(2, lv(s.lup, 'lshard')) * ad(1.5, lv(s.mup, 'm_shard'));
    if (s.pup.harmony) m *= pw(1.25, new Set(s.archs.map((a) => a.s)).size);
    m *= G.fame() * T.msShardMult(s.ms) * pw(1.5, s.era) * G.fever();
    if (s.flags.l4Done) m *= 1 + 2 * G.coverage();
    G.M = m;
    return m;
  };
  G.lvlMult = (l) => (1 + 0.5 * l) * pw(2, Math.floor(l / 10));
  G.blockValue = (d) => (T.SHAPE[d.s].value + lv(G.s.up, 'solid')) * G.lvlMult(d.lvl || 0) * G.M;
  G.bestValue = function () { let b = (1 + lv(G.s.up, 'solid')) * G.M; for (const a of G.s.archs) b = Math.max(b, G.blockValue(a)); return b; };
  G.passive = function () { let r = 0; for (const a of G.s.archs) r += G.blockValue(a) / G.cooldown(a); return r; };
  G.petDur = () => 10 * pw(2, lv(G.s.vup, 'pet'));
  G.cooldown = function (d, petted, team = 1, happy = 0) {
    const s = G.s;
    let cd = T.SHAPE[d.s].cd / (ad(0.1, lv(s.up, 'quick')) * ad(0.06, lv(s.mup, 'm_cd')));
    if (petted) cd *= s.vup.pet ? 0.55 : 0.7;
    if (team > 1) cd *= Math.max(0.5, 1 - 0.04 * lv(s.up, 'team') * (team - 1));
    if (G.fever() > 1) cd *= 0.7;
    cd /= 1 + happy * 0.5;
    return Math.max(0.3, cd);
  };
  // small, capped steps: fully upgraded builders walk ×1.56 and throw ×1.70 at most
  G.walkSpeed = () => 24 * ad(0.1, Math.min(3, lv(G.s.up, 'walk'))) * ad(0.1, Math.min(2, lv(G.s.vup, 'legs')));
  G.throwRange = () => 46 * ad(0.12, Math.min(3, lv(G.s.up, 'arm'))) * ad(0.1, Math.min(2, lv(G.s.vup, 'legs')));
  G.clickCD = () => 0.7 * pw(0.9, lv(G.s.up, 'tap')) * (G.s.ms >= 8 ? 0.7 : 1);
  // click value follows what the builders make (seconds of their output), so clicking never dwarfs the game
  // and no cap is needed: 0.25s at first, approaching 1s with 손재주
  G.clickSecs = (l = lv(G.s.up, 'hand')) => 0.25 + 0.75 * (1 - pw(0.8, l));
  G.clickValue = function () {
    const s = G.s;
    const base = (1 + lv(s.up, 'solid')) * (1 + lv(s.up, 'hand')) * G.M;
    return Math.max(base, G.passive() * G.clickSecs());
  };
  G.carveCD = () => 1.1 * pw(0.8, lv(G.s.sup, 'carve'));
  G.paintCD = () => 1.4 * pw(0.8, lv(G.s.gup, 'brush'));
  G.lightSlots = () => (G.s.pup.light ? 1 + lv(G.s.pup, 'lightN') : 0);
  // 자리: how many builders the world can hold. Milestones, two small upgrades and, after settling, houses raise it
  const CAP_MS = [[0, 3], [1, 4], [2, 5], [4, 6], [6, 7], [9, 8], [11, 9], [13, 10]];
  G.archCap = function () {
    const s = G.s;
    let c = 3; for (const [m, v] of CAP_MS) if (s.ms >= m) c = v;
    c += lv(s.vup, 'room') + lv(s.pup, 'attic');
    if (s.era >= 1 && T.vil) c = Math.max(c, T.vil.capacity() - G.s.workers.length);
    return c;
  };
  G.capFull = () => G.s.archs.length >= G.archCap();
  G.hireCostAt = (id, k = 0) => { const sh = T.SHAPE[id]; const n = G.owned(id) + k; return sh.cost * pw(sh.growth, n) * pw(1.1, n * n * 0.25); };
  G.hireCost = (id) => G.hireCostAt(id, 0);
  G.levelCostAt = (d, k = 0) => T.SHAPE[d.s].cost * 0.5 * pw(1.42, d.lvl + k) * pw(1.01, (d.lvl + k) * (d.lvl + k));
  G.levelCost = (d) => T.SHAPE[d.s].cost * 0.5 * pw(1.42, d.lvl) * pw(1.01, d.lvl * d.lvl);
  G.bpSlots = () => 1 + lv(G.s.vup, 'shelf');
  G.focus = () => 0.6 + 0.08 * lv(G.s.up, 'focus');
  G.luckyChance = () => 0.01 * lv(G.s.vup, 'lucky');
  G.archColor = (d) => (G.s.flags.color ? T.SHAPE[d.s].color : T.SHAPE[d.s].gray);
  G.playerColor = () => (G.s.flags.color ? T.PLAYER_COLOR.color : T.PLAYER_COLOR.gray);

  // ── reset layers ─────────────────────────────────────────
  G.L = [
    null,
    { id: 1, name: '재구성', cur: '꼭짓점', icon: 'vertex', seen: (s) => s.ms >= 3 || s.flags.l1Done > 0, need: 1e6, prog: (s) => s.runEarned, needText: '이번 회차 조각',
      raw: (s) => 3 * T.taper(s.runEarned / 1e6, 0.5, 24) * ad(0.2, lv(s.up, 'omen')) * ad(0.3, lv(s.vup, 'res')) * ad(0.5, lv(s.pup, 'refr')) * (s.ms >= 5 ? 1.5 : 1) },
    { id: 2, name: '다듬기', cur: '결', icon: 'chisel', seen: (s) => s.ms >= 6 || s.flags.l2Done > 0, need: 100, prog: (s) => s.vertsRun, needText: '이번 회차 꼭짓점',
      raw: (s) => 3 * T.taper(s.vertsRun / 100, 0.4, 16) * ad(0.3, lv(s.sup, 'grain')) },
    { id: 3, name: '굴절', cur: '프리즘', icon: 'prism', seen: (s) => s.ms >= 9 || s.flags.l3Done > 0, need: 30, prog: (s) => s.grainRun, needText: '이번 회차 결',
      raw: (s) => 2 * T.taper(s.grainRun / 30, 0.35, 12) * ad(0.3, lv(s.gup, 'prismX')) * (s.ms >= 11 ? 1.5 : 1) },
    { id: 4, name: '물들임', cur: '안료', icon: 'pigment', seen: (s) => s.ms >= 12 || s.flags.l4Done > 0, need: 30, prog: (s) => s.prismsRun, needText: '이번 회차 프리즘',
      raw: (s) => 2 * T.taper(s.prismsRun / 30, 0.35, 12) },
    { id: 5, name: '겹치기', cur: '안개', icon: 'layers', seen: (s) => s.ms >= 14 || s.flags.l5Done > 0, need: 30, prog: (s) => s.pigRun, needText: '이번 회차 안료',
      raw: (s) => 2 * T.taper(s.pigRun / 30, 0.3, 10) * ad(0.3, lv(s.zup, 'fold')) },
    { id: 6, name: '정착', cur: '등불', icon: 'lantern', seen: (s) => s.ms >= 16 || s.flags.l6Done > 0, need: 20, prog: (s) => s.foldRun, needText: '이번 회차 안개',
      raw: (s) => 2 * T.taper(s.foldRun / 20, 0.3, 10) * ad(0.3, lv(s.lup, 'lantern')) * (s.ms >= 17 ? 1.5 : 1) * (s.ms >= 20 ? 2 : 1) },
  ];
  G.L.forEach((L) => { if (L) L.gain = (s) => Math.floor(L.raw(s)); });
  G.canReset = (n) => G.L[n].prog(G.s) >= G.L[n].need && G.L[n].gain(G.s) >= 1;

  function baseRun(level) {
    const s = G.s;
    s.shards = s.vup.fund ? 100 * pw(10, s.vup.fund) : 0;
    s.runEarned = 0;
    if (!(s.mup.k_up0 && level <= 1)) s.up = {};
    s.run = { built: [] };
    s.player = [];
    const keepVillage = s.era >= 1 && level < 6;
    if (keepVillage) {
      for (const a of s.archs) a.lvl = 0;
      s.structs = s.structs.filter((st) => st.f === null || st.src === 'bp');
    } else {
      s.archs = []; s.workers = []; s.kids = []; s.structs = [];
      if (level >= 6) s.zones = s.zones.filter((z) => !z.auto);
    }
    const mem = lv(s.vup, 'memory');
    while (G.owned('square') < mem) addArch('square', 0);
    if (s.pup.dawn) { let n = 0; for (const a of s.archs) if (a.lvl >= 5) n++; while (n < 2) { addArch('square', 5); n++; } }
  }
  const keepShapes = (s) => (s.pup.keepShapes ? { u_triangle: s.vup.u_triangle, u_circle: s.vup.u_circle, u_pentagon: s.vup.u_pentagon } : {});
  G.applyReset = function (n) {
    const s = G.s;
    T.ui.closeCard();
    if (T.st.placing) T.st.cancel();
    const gain = G.L[n].gain(s);
    const keepUp = (store) => (store === 1 && s.mup.k_up1) || ((store === 2 || store === 3) && s.mup.k_up2);
    if (n === 1) { s.vertices += gain; s.vertsRun += gain; s.stats.lifeVerts += gain; s.flags.l1Done++; }
    if (n >= 2) { s.vertices = 0; s.vertsRun = 0; if (!keepUp(1)) s.vup = keepShapes(s); }
    if (n === 2) { s.grains += gain; s.grainRun += gain; s.stats.lifeGrains += gain; s.flags.l2Done++; }
    if (n >= 3) { s.grains = 0; s.grainRun = 0; if (!keepUp(2)) s.sup = {}; }
    if (n === 3) { s.prisms += gain; s.prismsRun += gain; s.stats.lifePrisms += gain; s.flags.l3Done++; s.flags.color = true; }
    if (n >= 4) { s.prisms = 0; s.prismsRun = 0; if (!keepUp(3)) s.pup = s.gup.keepPrism ? { u_star: s.pup.u_star, u_hexagon: s.pup.u_hexagon, keepShapes: s.pup.keepShapes } : {}; if (!keepUp(1)) s.vup = keepShapes(s); }
    if (n === 4) { s.pigments += gain; s.pigRun += gain; s.stats.lifePigments += gain; s.flags.l4Done++; }
    if (n >= 5) { s.pigments = 0; s.pigRun = 0; if (!s.zup.keepPig) s.gup = {}; }
    if (n === 5) { s.folds += gain; s.foldRun += gain; s.stats.lifeFolds += gain; s.flags.l5Done++; }
    if (n >= 6) { s.folds = 0; s.foldRun = 0; s.zup = { layer: s.zup.layer, warper: s.zup.warper }; }
    if (n === 6) { s.lanterns += gain; s.eraLanterns += gain; s.stats.lifeLanterns += gain; s.flags.l6Done++; if (s.era < 1) { s.era = 1; s.clock = 30; s.day = 1; } }
    baseRun(n);
    finishReset();
    return gain;
  };
  G.msReady = function () { const m = T.MILESTONES[G.s.ms]; if (!m) return false; const [c, n] = m.prog(G.s); return c >= n; };
  G.claimMilestone = function () {
    const s = G.s;
    if (!G.msReady()) return false;
    T.ui.closeCard();
    if (T.st.placing) T.st.cancel();
    s.ms++;
    baseRun(0);
    finishReset();
    return true;
  };
  G.eraReady = function () { const s = G.s; const req = T.ERA_REQ[s.era + 1]; return !!req && s.era >= 1 && req.every((r) => r.cur(s) >= r.need); };
  G.advanceEra = function () {
    const s = G.s;
    if (!G.eraReady()) return false;
    s.era++;
    s.eraLanterns = 0; s.eraGoods = 0; s.lanterns = 0; s.goods = 0;
    s.vertices = s.vertsRun = s.grains = s.grainRun = s.prisms = s.prismsRun = s.pigments = s.pigRun = s.folds = s.foldRun = 0;
    if (!s.mup.k_up1) s.vup = keepShapes(s);
    if (!s.mup.k_up2) { s.sup = {}; s.pup = {}; }
    if (!s.zup.keepPig) s.gup = {};
    baseRun(7);
    s.clock = 30; s.day = 1;
    finishReset();
    return true;
  };
  function finishReset() {
    T.ent.syncPets();
    G.computeMult();
    G.rebuild();
    T.main.reindex();
    G.save();
  }
  G.buyRes = function () {
    const s = G.s;
    const next = s.resLv + 1;
    if (next > 3 || s.ms < T.RES_MS[next] || s.grains < T.RES_COST[next]) return false;
    s.grains -= T.RES_COST[next];
    s.resLv = next;
    return true;
  };

  // ── architects & residents ───────────────────────────────
  function addArch(shapeId, lvl = 0, silent = true) {
    const s = G.s;
    const sh = T.SHAPE[shapeId];
    s.stats['ord_' + shapeId] = (s.stats['ord_' + shapeId] || 0) + 1;
    const ord = s.stats['ord_' + shapeId] - 1;
    const name = sh.names[ord % sh.names.length] + (ord >= sh.names.length ? ' ' + (Math.floor(ord / sh.names.length) + 1) : '');
    const d = { s: shapeId, o: ord % 64, lvl, n: 0, name, home: 0, z: 0 };
    s.archs.push(d);
    return T.ent.spawnArch(d, silent);
  }
  G.addArch = addArch;
  G.hire = function (id) {
    const c = G.hireCost(id);
    if (G.s.shards < c || !G.shapeUnlocked(id) || G.capFull()) return false;
    G.s.shards -= c;
    addArch(id, 0, false);
    T.audio.play('hire');
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
  G.buyUp = function (store, def) {
    const s = G.s, book = G.book(store), key = G.curKey(store);
    const l = lv(book, def.id);
    if (l >= G.maxOf(store, def) || !G.upVisible(store, def)) return false;
    const c = def.cost(l);
    if (!(c < Infinity) || s[key] < c) return false;
    s[key] -= c;
    book[def.id] = l + 1;
    if (['chisel', 'painter', 'demo', 'warper'].includes(def.id)) T.ent.syncPets();
    if (def.id === 'layer') T.vil.onLayer();
    G.computeMult();
    return true;
  };

  // ── earning ──────────────────────────────────────────────
  G.earn = function (v) { const s = G.s; s.shards += v; s.runEarned += v; s.stats.lifeEarned += v; G._acc += v; };
  G.earnGoods = function (g) { const s = G.s; s.goods += g; s.eraGoods += g; s.stats.lifeGoods += g; };

  // ── automation ───────────────────────────────────────────
  G.autoOn = (id) => !!G.s.mup[id] && !G.s.autoOff[id];
  function autoBuy(store) {
    const s = G.s, book = G.book(store), key = G.curKey(store);
    let best = null, bc = Infinity;
    for (const def of G.UPS()[store]) {
      if (!G.upVisible(store, def) || lv(book, def.id) >= G.maxOf(store, def)) continue;
      const c = def.cost(lv(book, def.id));
      if (c < bc) { bc = c; best = def; }
    }
    if (best && s[key] >= bc) G.buyUp(store, best);
  }
  G.automate = function (dt) {
    const s = G.s;
    if (G.autoOn('a_hire')) {
      let best = null, bc = Infinity;
      if (!G.capFull()) for (const sh of T.SHAPES) if (G.shapeUnlocked(sh.id)) { const c = G.hireCost(sh.id); if (c < bc) { bc = c; best = sh.id; } }
      if (best && s.shards >= bc) G.hire(best);
    }
    if (G.autoOn('a_level')) {
      let best = null, bc = Infinity;
      for (const d of s.archs) { const c = G.levelCost(d); if (c < bc) { bc = c; best = d; } }
      if (best && s.shards >= bc * 2) G.levelUp(best);
    }
    if (G.autoOn('a_up0')) autoBuy(0);
    if (G.autoOn('a_up1') && s.flags.l1Done) autoBuy(1);
    if (G.autoOn('a_up2')) { if (s.flags.l2Done) autoBuy(2); if (s.flags.l3Done) autoBuy(3); }
    if (G.autoOn('a_up3') && s.flags.l4Done) autoBuy(4);
    const av = lv(s.mup, 'a_vert');
    if (av && s.flags.l1Done) { const g = G.L[1].raw(s) * 0.01 * av * dt; s.vertices += g; s.vertsRun += g; s.stats.lifeVerts += g; }
    const ap = lv(s.mup, 'a_prism');
    if (ap) {
      if (s.flags.l2Done) { const g = G.L[2].raw(s) * 0.005 * ap * dt; s.grains += g; s.grainRun += g; s.stats.lifeGrains += g; }
      if (s.flags.l3Done) { const g = G.L[3].raw(s) * 0.005 * ap * dt; s.prisms += g; s.prismsRun += g; s.stats.lifePrisms += g; }
    }
  };

  // ── world drawing ────────────────────────────────────────
  function drawPlayerBlock(p) {
    const back = T.st.at(p[0], p[1], 0);
    T.world.drawBlock(p[0], p[1], G.playerColor(), false, back ? 'back' : 'front', 0);
  }
  G.drawPlayerBlock = drawPlayerBlock;
  G.redrawRange = function (x0, x1) {
    const [a, b] = T.world.clearRange(x0, x1);
    const s = G.s;
    for (const p of s.player) if (p[0] >= a - B && p[0] <= b + B) drawPlayerBlock(p);
    if (s.flags.rosette) for (const e of T.ent.archs) if (e.pos) for (const p of e.pos) if (p[0] >= a - B && p[0] <= b + B) T.world.drawBlock(p[0], p[1], G.archColor(e.d), false, 'back', 0);
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
  G.save = function () { if (T.main && T.main.noSave) return; try { localStorage.setItem(SAVE_KEY, G.serialize()); } catch (e) { /* storage full */ } };
  G.load = function (str) {
    let raw = str || localStorage.getItem(SAVE_KEY);
    if (!raw && !str) { raw = localStorage.getItem('tessera-save-v3'); if (raw) G.migrated = true; }
    if (!raw) { G.oldSave = !!(localStorage.getItem('tessera-save-v2') || localStorage.getItem('tessera-save-v1')); return false; }
    try {
      const d = JSON.parse(raw);
      if (d.v === 3) migrate3(d);
      if (d.v !== 4) return false;
      const base = defaultState();
      for (const k in base) if (d[k] === undefined) d[k] = base[k];
      d.flags = Object.assign(base.flags, d.flags);
      d.stats = Object.assign(base.stats, d.stats);
      d.settings = Object.assign(base.settings, d.settings);
      d.settings.vol = Object.assign(defaultState().settings.vol, d.settings.vol);
      G.s = d;
      return true;
    } catch (e) { console.warn('load failed', e); return false; }
  };
  // v3 → v4: finished structures keep their reward state; everything else carries over
  function migrate3(d) {
    for (const st of d.structs || []) if (st.f === null) st.fin = 1;
    d.variants = d.variants || {};
    d.v = 4;
  }
  G.exportSave = () => btoa(unescape(encodeURIComponent(G.serialize())));
  G.importSave = function (b64) {
    try { const str = decodeURIComponent(escape(atob(b64.trim()))); const d = JSON.parse(str); if (d.v === 3) migrate3(d); if (d.v !== 4) return false; localStorage.setItem(SAVE_KEY, JSON.stringify(d)); return true; }
    catch (e) { return false; }
  };
  G.wipe = function () { localStorage.removeItem(SAVE_KEY); location.reload(); };
  G.offline = function () {
    const s = G.s;
    const el = Math.min(8 * 3600, (Date.now() - (s.last || Date.now())) / 1000);
    if (el < 60 || (!s.archs.length && !s.workers.length)) return null;
    G.computeMult();
    const earned = G.passive() * el * 0.3;
    G.earn(earned);
    let goods = 0;
    if (s.workers.length && T.vil) { goods = s.workers.length * (T.vil.goodsRate() / 3) * el * 0.4; G.earnGoods(goods); }
    return { el, earned, goods };
  };
})();
