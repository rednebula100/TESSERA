'use strict';
// ─────────────────────────────────────────────────────────────
//  GAME — 상태, 경제, 리셋, 저장
// ─────────────────────────────────────────────────────────────
(function () {
  const SAVE_KEY = 'tessera-save-v1';
  const B = T.B;

  function defaultState() {
    return {
      v: 1,
      shards: 0, runEarned: 0,
      vertices: 0, vertsRun: 0,
      prisms: 0, prismsRun: 0,
      pigments: 0,
      up: {}, vup: {}, pup: {}, gup: {},
      archs: [],
      player: [],
      bps: { active: [], done: {}, built: [] },
      palette: 'sunset', palDone: {}, palOwned: { sunset: 1 }, playerPainted: 0,
      flags: { l1Seen: false, l2Seen: false, l3Seen: false, l1Done: 0, l2Done: 0, l3Done: 0, color: false, painter: false,
        autoHire: true, autoL1: true, introDone: false, seenTabs: {} },
      stats: { lifeBlocks: 0, lifeEarned: 0, lifeVerts: 0, lifePrisms: 0, lifePigments: 0, clicks: 0, pets: 0, played: 0, bpDone: 0, paintBlocks: 0 },
      settings: { sound: true },
      last: Date.now(),
    };
  }

  const G = (T.G = {
    s: defaultState(),
    M: 1, // cached global multiplier
    rate: 0, // measured income per second (EMA)
    _acc: 0,
    arch: [], // runtime architect entities
  });

  const lv = (o, id) => o[id] || 0;
  G.lv = lv;

  // ── derived values ───────────────────────────────────────
  G.shapeUnlocked = function (id) {
    const s = G.s;
    if (id === 'square') return true;
    if (id === 'triangle') return !!s.vup.u_triangle;
    if (id === 'circle') return !!s.vup.u_circle;
    if (id === 'pentagon') return !!s.vup.u_pentagon;
    if (id === 'star') return !!s.pup.u_star;
    if (id === 'hexagon') return !!s.pup.u_hexagon;
    return false;
  };
  G.owned = function (shapeId) {
    let n = 0;
    for (const a of G.s.archs) if (a.s === shapeId) n++;
    return n;
  };
  G.fame = function () {
    let m = 1;
    for (const id in G.s.bps.done) {
      const n = G.s.bps.done[id];
      if (n > 0) m *= 1.15 * Math.pow(1.05, Math.min(n - 1, 20));
    }
    return m;
  };
  G.coverage = function () {
    const s = G.s;
    let tot = 0, p = 0;
    for (const a of s.archs) { tot += a.n; p += Math.min(a.p || 0, a.n); }
    return tot ? p / tot : 0;
  };
  G.computeMult = function () {
    const s = G.s;
    let m = Math.pow(1.5, lv(s.up, 'eye'));
    m *= Math.sqrt(1 + s.vertices);
    m *= Math.pow(1 + s.prisms, 0.6);
    m *= Math.pow(1 + s.pigments, 0.7);
    m *= Math.pow(2, lv(s.vup, 'bless'));
    m *= Math.pow(3, lv(s.pup, 'spectrum'));
    m *= Math.pow(5, lv(s.gup, 'all'));
    if (s.pup.harmony) {
      const kinds = new Set(s.archs.map((a) => a.s)).size;
      m *= Math.pow(1.5, kinds);
    }
    m *= G.fame();
    if (s.flags.painter) m *= 1 + 3 * G.coverage();
    m *= Math.pow(1.5, Object.keys(s.palDone).length);
    G.M = m;
    return m;
  };
  G.lvlMult = (l) => (1 + 0.35 * l) * Math.pow(2, Math.floor(l / 10));
  G.blockValue = function (a) {
    const sh = T.SHAPE[a.s];
    return (sh.value + lv(G.s.up, 'solid')) * G.lvlMult(a.lvl) * G.M;
  };
  G.bestValue = function () {
    let best = (1 + lv(G.s.up, 'solid')) * G.M;
    for (const a of G.s.archs) best = Math.max(best, G.blockValue(a));
    return best;
  };
  G.petDur = () => 10 * Math.pow(2, lv(G.s.vup, 'pet'));
  G.cooldown = function (a, petted) {
    const sh = T.SHAPE[a.s];
    let cd = sh.cd * Math.pow(0.92, lv(G.s.up, 'quick'));
    if (petted) cd *= G.s.vup.pet ? 0.55 : 0.7;
    return Math.max(0.35, cd);
  };
  G.walkSpeed = () => 34 * (1 + 0.3 * lv(G.s.up, 'walk')) * Math.pow(1.5, lv(G.s.vup, 'legs'));
  G.throwRange = () => 150 * (1 + 0.35 * lv(G.s.up, 'arm')) * Math.pow(1.5, lv(G.s.vup, 'legs'));
  G.clickValue = function () {
    const s = G.s;
    let v = (1 + lv(s.up, 'solid')) * Math.pow(2, lv(s.up, 'hand')) * G.M;
    if (lv(s.up, 'hand') > 0) v += G.rate * 0.03;
    return v;
  };
  G.hireCost = (shapeId) => {
    const sh = T.SHAPE[shapeId];
    return sh.cost * Math.pow(sh.growth, G.owned(shapeId));
  };
  G.levelCost = (a) => T.SHAPE[a.s].cost * 0.6 * Math.pow(1.5, a.lvl);
  G.bpSlots = () => 1 + lv(G.s.vup, 'shelf');
  G.focus = () => 0.4 + 0.12 * lv(G.s.up, 'focus');
  G.luckyChance = () => 0.01 * lv(G.s.vup, 'lucky');
  G.estIncome = function () {
    let r = 0;
    for (const a of G.s.archs) r += G.blockValue(a) / (G.cooldown(a) * 1.25);
    return r;
  };

  // ── reset layers ─────────────────────────────────────────
  G.L = [
    null,
    { id: 1, name: '재구성', cur: '꼭짓점', icon: 'vertex',
      seen: (s) => s.stats.lifeEarned >= 1e5 || s.flags.l1Done > 0,
      need: 1e6, prog: (s) => s.runEarned, needText: '이번 회차에 조각',
      gain: (s) => Math.floor(3 * Math.sqrt(s.runEarned / 1e6) * Math.pow(1.25, lv(s.up, 'omen')) * Math.pow(1.5, lv(s.vup, 'res')) * Math.pow(2, lv(s.pup, 'refr'))) },
    { id: 2, name: '굴절', cur: '프리즘', icon: 'prism',
      seen: (s) => s.vertsRun >= 500 || s.flags.l2Done > 0,
      need: 3000, prog: (s) => s.vertsRun, needText: '이번 굴절까지 꼭짓점',
      gain: (s) => Math.floor(2 * Math.sqrt(s.vertsRun / 3000) * Math.pow(2, lv(s.gup, 'prismX'))) },
    { id: 3, name: '물들임', cur: '안료', icon: 'pigment',
      seen: (s) => s.prismsRun >= 20 || s.flags.l3Done > 0,
      need: 100, prog: (s) => s.prismsRun, needText: '이번 물들임까지 프리즘',
      gain: (s) => Math.floor(2 * Math.sqrt(s.prismsRun / 100)) },
  ];
  G.canReset = (n) => G.L[n].prog(G.s) >= G.L[n].need && G.L[n].gain(G.s) >= 1;

  function baseRun() {
    const s = G.s;
    s.shards = s.vup.fund ? 100 * Math.pow(10, s.vup.fund) : 0;
    s.runEarned = 0;
    s.up = {};
    s.archs = [];
    s.player = [];
    s.playerPainted = 0;
    s.bps.active = [];
    s.bps.built = [];
    const mem = lv(s.vup, 'memory');
    for (let i = 0; i < mem; i++) G.addArch('square', 0, true);
    if (s.pup.dawn) for (let i = 0; i < 5; i++) G.addArch('square', 5, true);
  }
  G.applyReset = function (n) {
    const s = G.s;
    if (T.ui && T.ui.closeCard) T.ui.closeCard();
    if (T.bp && T.bp.placing) T.bp.cancel();
    const gain = G.L[n].gain(s);
    if (n === 1) {
      s.vertices += gain; s.vertsRun += gain; s.stats.lifeVerts += gain; s.flags.l1Done++;
    } else if (n === 2) {
      s.prisms += gain; s.prismsRun += gain; s.stats.lifePrisms += gain; s.flags.l2Done++;
      s.flags.color = true;
      s.vertices = 0; s.vertsRun = 0;
      const keep = s.pup.keepShapes;
      s.vup = keep ? { u_triangle: s.vup.u_triangle, u_circle: s.vup.u_circle, u_pentagon: s.vup.u_pentagon } : {};
    } else if (n === 3) {
      s.pigments += gain; s.stats.lifePigments += gain; s.flags.l3Done++;
      s.flags.painter = true;
      s.prisms = 0; s.prismsRun = 0;
      s.vertices = 0; s.vertsRun = 0;
      const keep = s.gup.keepPrism;
      s.pup = keep ? { u_star: s.pup.u_star, u_hexagon: s.pup.u_hexagon, keepShapes: s.pup.keepShapes } : {};
      s.vup = s.pup.keepShapes ? { u_triangle: s.vup.u_triangle, u_circle: s.vup.u_circle, u_pentagon: s.vup.u_pentagon } : {};
      for (const a of s.archs) a.p = 0;
    }
    baseRun();
    G.computeMult();
    G.rebuild();
    G.save();
    return gain;
  };

  // ── architects ───────────────────────────────────────────
  G.addArch = function (shapeId, lvl = 0, silent) {
    const s = G.s;
    const sh = T.SHAPE[shapeId];
    let ord = 0;
    for (const a of s.archs) if (a.s === shapeId) ord++;
    const pool = sh.names;
    const name = pool[ord % pool.length] + (ord >= pool.length ? ' ' + (Math.floor(ord / pool.length) + 1) : '');
    const d = { s: shapeId, o: ord, lvl, n: 0, p: 0, name };
    s.archs.push(d);
    const e = T.ent.spawnArch(d, silent);
    return e;
  };
  G.hire = function (shapeId) {
    const c = G.hireCost(shapeId);
    if (G.s.shards < c || !G.shapeUnlocked(shapeId)) return false;
    G.s.shards -= c;
    G.addArch(shapeId);
    G.computeMult();
    return true;
  };
  G.levelUp = function (d) {
    const c = G.levelCost(d);
    if (G.s.shards < c) return false;
    G.s.shards -= c;
    d.lvl++;
    return true;
  };
  G.buyUp = function (store, def) {
    const s = G.s;
    const book = store === 0 ? s.up : store === 1 ? s.vup : store === 2 ? s.pup : s.gup;
    const curKey = store === 0 ? 'shards' : store === 1 ? 'vertices' : store === 2 ? 'prisms' : 'pigments';
    const l = lv(book, def.id);
    if (l >= def.max) return false;
    const c = def.cost(l);
    if (s[curKey] < c) return false;
    s[curKey] -= c;
    book[def.id] = l + 1;
    if (store === 3 && def.id === 'painter') T.ent.syncPainters();
    G.computeMult();
    return true;
  };

  // ── earning & blocks ─────────────────────────────────────
  G.earn = function (v) {
    const s = G.s;
    s.shards += v; s.runEarned += v; s.stats.lifeEarned += v;
    G._acc += v;
  };
  G.hash = function (a, b, c) {
    let h = (a * 374761393 + b * 668265263 + c * 2246822519) >>> 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
  G.archColor = function (d, x, y, idx) {
    const sh = T.SHAPE[d.s];
    if (idx < (d.p || 0)) return T.PALETTE[G.s.palette].fn(x, y);
    const j = (G.hash(sh.index, d.o, idx) - 0.5) * 0.08;
    return T.shade(G.s.flags.color ? sh.color : sh.gray, j);
  };
  G.isLucky = (d, idx) => G.hash(idx, d.o + 77, T.SHAPE[d.s].index + 3) < G.luckyChance();
  G.playerColor = () => (G.s.flags.color ? T.PLAYER_COLOR.color : T.PLAYER_COLOR.gray);
  G.bpColor = (ch) => (G.s.flags.color ? T.BP_COLORS[ch].color : T.BP_COLORS[ch].gray);

  // ── world rebuild ────────────────────────────────────────
  G.rebuild = function () {
    T.world.clear();
    T.ent.rebuild();
    const s = G.s;
    s.player.forEach((p, i) => T.world.drawBlock(p[0], p[1], i < s.playerPainted ? T.PALETTE[s.palette].fn(p[0], p[1]) : G.playerColor()));
    for (const b of s.bps.built) T.bp.drawBuilt(b);
    for (const b of s.bps.active) T.bp.drawActive(b);
  };

  // ── save / load ──────────────────────────────────────────
  G.serialize = function () {
    const s = G.s;
    s.last = Date.now();
    return JSON.stringify(s);
  };
  G.save = function () {
    if (T.main && T.main.noSave) return;
    try { localStorage.setItem(SAVE_KEY, G.serialize()); } catch (e) { /* storage full or blocked */ }
  };
  G.load = function (str) {
    const raw = str || localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    try {
      const d = JSON.parse(raw);
      const base = defaultState();
      for (const k in base) if (d[k] === undefined) d[k] = base[k];
      d.flags = Object.assign(base.flags, d.flags);
      d.stats = Object.assign(base.stats, d.stats);
      d.bps = Object.assign(base.bps, d.bps);
      G.s = d;
      return true;
    } catch (e) {
      console.warn('load failed', e);
      return false;
    }
  };
  G.exportSave = () => btoa(unescape(encodeURIComponent(G.serialize())));
  G.importSave = function (b64) {
    try {
      const str = decodeURIComponent(escape(atob(b64.trim())));
      JSON.parse(str);
      localStorage.setItem(SAVE_KEY, str);
      return true;
    } catch (e) { return false; }
  };
  G.wipe = function () {
    localStorage.removeItem(SAVE_KEY);
    location.reload();
  };

  // offline progress (no walking; cooldown × 1.25)
  G.offline = function () {
    const s = G.s;
    const el = Math.min(8 * 3600, (Date.now() - (s.last || Date.now())) / 1000);
    if (el < 30 || !s.archs.length) return null;
    G.computeMult();
    let earned = 0, blocks = 0;
    const budget = 400000;
    let totalTicks = 0;
    const ticks = s.archs.map((a) => { const t = Math.floor(el / (G.cooldown(a) * 1.25)); totalTicks += t; return t; });
    const scale = totalTicks > budget ? budget / totalTicks : 1;
    s.archs.forEach((a, i) => {
      const t = ticks[i];
      const v = G.blockValue(a);
      earned += t * v;
      const add = Math.floor(t * scale);
      a.n += add; blocks += add;
    });
    G.earn(earned);
    s.stats.lifeBlocks += blocks;
    return { el, earned, blocks };
  };
})();
