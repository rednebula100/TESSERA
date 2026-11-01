#!/usr/bin/env node
'use strict';
// ─────────────────────────────────────────────────────────────
//  TESSERA 밸런스 상한 계산기
//  게임의 실제 data.js / game.js 공식을 그대로 불러와서
//   1) 구조 검사: 모든 업그레이드를 최대로 샀을 때의 조각 배율 상한
//   2) 이상 플레이 모델: 언제나 가장 싼 것을 바로 사고, 정해진 규칙으로 리셋하는 결정론적 진행
//  을 계산하고, 판정 기준을 어기면 실패(exit 1)합니다.  node tools/balance.js [--check] [--quiet]
// ─────────────────────────────────────────────────────────────
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const root = path.join(__dirname, '..');

function load() {
  const ctx = { window: {}, console, Math, Date, JSON, Set, Map, Object, Array, Number, String, Infinity, isFinite, parseInt, parseFloat, localStorage: { getItem: () => null, setItem() {} } };
  vm.createContext(ctx);
  // util.js declares `const T`; run all three as one script so data.js and game.js see it
  const src = ['util', 'data', 'game'].map((f) => fs.readFileSync(path.join(root, 'js', f + '.js'), 'utf8').replace(/^'use strict';/, '')).join('\n;\n');
  vm.runInContext(src, ctx, { filename: 'game-bundle.js' });
  const T = ctx.window.T;
  // minimal stand-ins for the world-side modules the economy touches
  T.ent = { syncPets() {}, spawnArch: (d) => ({ d }), archs: [], rebuild() {} };
  T.vil = { capacity: () => 0, population: () => 0, assignHomes() {}, onLayer() {} };
  T.st = { placing: null, resetColors() {}, syncUid() {}, paintedFrac: () => 0, count: () => 1 };
  T.ui = { closeCard() {} };
  T.main = { reindex() {}, noSave: true };
  T.world = { clear() {} };
  T.G.rebuild = () => {};
  T.G.save = () => {};
  return T;
}

const fmt = (n) => (n < 1e4 ? n.toFixed(n < 10 ? 2 : 0) : n.toExponential(2));
const mins = (t) => (t / 60).toFixed(1) + '분';

// ── 1) structural bound: every upgrade at its max level ─────
function structuralBound(T, holdings) {
  const G = T.G, s = G.s;
  s.ms = T.MILESTONES.length; s.era = 4;
  Object.assign(s.flags, { l1Done: 1, l2Done: 1, l3Done: 1, l4Done: 1, l5Done: 1, l6Done: 1 });
  for (let round = 0; round < 3; round++) // caps raise other caps, so settle a few times
    G.UPS().forEach((list, store) => { const book = G.book(store); for (const def of list) book[def.id] = G.maxOf(store, def); });
  Object.assign(s, holdings);
  for (const id of Object.keys(T.SHAPE)) s.bps.done[id] = 0;
  for (const d of T.DEFS || []) s.bps.done[d.id] = 26;
  s.archs = T.SHAPES.map((sh) => ({ s: sh.id, lvl: 0 }));
  return G.computeMult();
}

// ── 2) idealised progression model ──────────────────────────
// one tick = 1s. income = builders + clicks; the player buys the cheapest thing it can afford, every tick.
function model(T, opts = {}) {
  const G = T.G;
  G.s = JSON.parse(JSON.stringify(G.s)); // fresh copy
  const s = G.s;
  const log = [];
  const firsts = {};
  let t = 0;
  const limit = (opts.hours || 30) * 3600;
  const addArch = (id) => { s.archs.push({ s: id, lvl: 0 }); };
  const hireBest = () => {
    if (G.capFull()) return false;
    let best = null, bc = Infinity;
    for (const sh of T.SHAPES) if (G.shapeUnlocked(sh.id)) { const c = G.hireCost(sh.id); if (c <= s.shards && c < bc) { bc = c; best = sh.id; } }
    if (!best) return false;
    s.shards -= bc; addArch(best); return true;
  };
  const buyCheapest = (store) => {
    const book = G.book(store), key = G.curKey(store);
    let best = null, bc = Infinity;
    for (const def of G.UPS()[store]) {
      if (!G.upVisible(store, def) || G.lv(book, def.id) >= G.maxOf(store, def)) continue;
      const c = def.cost(G.lv(book, def.id));
      if (c < bc) { bc = c; best = def; }
    }
    if (best && s[key] >= bc) { s[key] -= bc; book[best.id] = G.lv(book, best.id) + 1; return true; }
    return false;
  };
  const levelCheapest = () => {
    let best = null, bc = Infinity;
    for (const d of s.archs) { const c = G.levelCost(d); if (c < bc) { bc = c; best = d; } }
    if (best && s.shards >= bc) { s.shards -= bc; best.lvl++; return true; }
    return false;
  };
  const replaceWeakest = () => { // when full, swap the weakest builder for a stronger shape (free in the model = upper bound)
    if (!G.capFull()) return;
    let top = null; for (const sh of T.SHAPES) if (G.shapeUnlocked(sh.id)) top = sh;
    const weak = s.archs.find((a) => T.SHAPE[a.s].index < top.index);
    if (weak && s.shards >= G.hireCost(top.id)) { s.shards -= G.hireCost(top.id); weak.s = top.id; }
  };
  const run = { t0: 0 };
  const resetTo = (n) => {
    const gain = G.L[n].gain(s);
    const keepVillage = false;
    if (n === 1) { s.vertices += gain; s.vertsRun += gain; s.stats.lifeVerts += gain; s.flags.l1Done++; }
    if (n >= 2) { s.vertices = 0; s.vertsRun = 0; s.vup = s.pup.keepShapes ? { u_triangle: s.vup.u_triangle, u_circle: s.vup.u_circle, u_pentagon: s.vup.u_pentagon } : {}; }
    if (n === 2) { s.grains += gain; s.grainRun += gain; s.stats.lifeGrains += gain; s.flags.l2Done++; }
    if (n >= 3) { s.grains = 0; s.grainRun = 0; s.sup = {}; }
    if (n === 3) { s.prisms += gain; s.prismsRun += gain; s.stats.lifePrisms += gain; s.flags.l3Done++; s.flags.color = true; }
    if (n >= 4) { s.prisms = 0; s.prismsRun = 0; s.pup = {}; }
    if (n === 4) { s.pigments += gain; s.pigRun += gain; s.stats.lifePigments += gain; s.flags.l4Done++; }
    if (n >= 5) { s.pigments = 0; s.pigRun = 0; s.gup = {}; }
    if (n === 5) { s.folds += gain; s.foldRun += gain; s.stats.lifeFolds += gain; s.flags.l5Done++; }
    s.shards = s.vup.fund ? 100 * Math.pow(10, s.vup.fund) : 0; s.runEarned = 0; s.up = {}; s.archs = [];
    const mem = G.lv(s.vup, 'memory'); for (let i = 0; i < mem; i++) addArch('square');
    if (!keepVillage) s.run = { built: [] };
    if (!firsts[n]) { firsts[n] = { t, gain }; log.push(`  ${mins(t).padStart(8)}  첫 ${G.L[n].name}  +${fmt(gain)} ${G.L[n].cur}`); }
    run.t0 = t;
    return gain;
  };
  // milestones the model can reach on its own (no village)
  const tryMilestone = () => {
    const m = T.MILESTONES[s.ms];
    if (!m || s.ms >= 15) return false;
    const [c, n] = m.prog(s);
    if (c < n) return false;
    s.ms++;
    log.push(`  ${mins(t).padStart(8)}  이정표 ${s.ms} ${m.name}`);
    s.shards = 0; s.runEarned = 0; s.up = {}; s.archs = []; s.run = { built: [] };
    const mem = G.lv(s.vup, 'memory'); for (let i = 0; i < mem; i++) addArch('square');
    run.t0 = t;
    return true;
  };
  let builtAcc = 0;
  while (t < limit) {
    G.computeMult();
    const passive = G.passive();
    const click = G.clickValue() / G.clickCD() * 0.5; // the player clicks half the time
    const inc = passive * 1.15 + click; // +15%: blueprint rewards
    s.shards += inc; s.runEarned += inc; s.stats.lifeEarned += inc;
    // structures complete roughly every (40 blocks / builders) seconds
    builtAcc += s.archs.length / 40; while (builtAcc >= 1) { builtAcc--; s.run.built.push(1); }
    if (s.ms >= 7 && s.resLv < 1 && s.grains >= 1) { s.grains -= 1; s.resLv = 1; }
    if (s.ms >= 10 && s.resLv < 2 && s.grains >= 20) { s.grains -= 20; s.resLv = 2; }
    if (s.ms >= 13 && s.resLv < 3 && s.grains >= 300) { s.grains -= 300; s.resLv = 3; }
    for (let k = 0; k < 40; k++) { if (!(hireBest() || buyCheapest(0) || levelCheapest())) break; }
    replaceWeakest();
    for (let st = 1; st <= 5; st++) for (let k = 0; k < 20; k++) if (!buyCheapest(st)) break;
    tryMilestone();
    // reset policy: the deepest layer whose gain is worth it
    const rt = t - run.t0;
    for (let n = 5; n >= 1; n--) {
      if (!G.L[n].seen(s) || !G.canReset(n)) continue;
      const cur = [0, s.vertices, s.grains, s.prisms, s.pigments, s.folds][n];
      const g = G.L[n].gain(s);
      if ((g >= Math.max(1, cur * 0.6) && rt > 90) || (n === 1 && !s.flags.l1Done)) { resetTo(n); break; }
    }
    if (opts.stop && opts.stop(s, firsts)) break;
    t++;
  }
  return { log, firsts, s, t };
}

// ── checks ───────────────────────────────────────────────────
function main() {
  const quiet = process.argv.includes('--quiet');
  const check = process.argv.includes('--check');
  const fails = [];
  const out = (x) => { if (!quiet) console.log(x); };

  out('■ 1) 구조 상한: 모든 업그레이드 최대 + 모든 이정표 + 중세 성읍');
  for (const h of [1e6, 1e15, 1e30]) {
    const T = load();
    const m = structuralBound(T, { vertices: h, grains: h, prisms: h, pigments: h, folds: h, lanterns: h });
    out(`  보유 화폐 각 ${fmt(h).padEnd(9)} → 조각 배율 ×${fmt(m)}`);
    if (h === 1e15 && m > 1e26) fails.push(`(c) 보유 1e15에서 조각 배율 상한 ${fmt(m)} > 1e26`);
  }
  // (e) late game: everything maxed, holdings 1e9, one hour of ideal income per 재구성, ten 재구성 per 다듬기
  {
    const T = load(), G = T.G;
    structuralBound(T, { vertices: 1e9, grains: 1e9, prisms: 1e9, pigments: 1e9, folds: 1e9, lanterns: 1e9 });
    const s = G.s;
    s.archs = []; for (let i = 0; i < 12; i++) s.archs.push({ s: 'hexagon', lvl: 0 });
    let inc = 0;
    for (let k = 0; k < 400; k++) { inc = G.passive() * 1.15; const c = G.levelCost(s.archs[0]); if (c * s.archs.length > inc * 600) break; for (const a of s.archs) a.lvl++; }
    s.runEarned = inc * 3600;
    const V = G.L[1].gain(s);
    s.vertsRun = V * 10;
    const Gr = G.L[2].gain(s);
    s.grainRun = Gr * 6;
    const P = G.L[3].gain(s);
    out(`  후반(모두 최대, 보유 1e9): 건축가 Lv${s.archs[0].lvl}, 초당 조각 ${fmt(inc)} → 재구성 1회 꼭짓점 ${fmt(V)} → 다듬기 1회 결 ${fmt(Gr)} → 굴절 1회 프리즘 ${fmt(P)}`);
    if (Gr > 1e5) fails.push(`(e) 후반 다듬기 1회 결 ${fmt(Gr)} > 1e5`);
  }

  out('\n■ 2) 이상 플레이 모델 (가장 싼 것을 바로 구매, 획득이 보유의 60% 이상이면 리셋)');
  const T = load();
  const r = model(T, { hours: 14, stop: (s, f) => f[5] });
  r.log.forEach((l) => out(l));
  const f = r.firsts;
  if (f[1]) { out(`  첫 재구성까지 ${mins(f[1].t)}`); if (f[1].t < 6 * 60 || f[1].t > 30 * 60) fails.push(`(d) 첫 재구성 ${mins(f[1].t)} (목표 6~30분)`); }
  else fails.push('(d) 재구성에 도달하지 못함');

  // (a) right after the first 굴절, how many 결 does one 다듬기 give?
  {
    const T2 = load();
    let afterL3 = null, l2gain = null;
    model(T2, {
      hours: 14,
      stop: (s, firsts) => {
        if (firsts[3] && afterL3 === null) afterL3 = s.flags.l2Done;
        if (afterL3 !== null && s.flags.l2Done > afterL3) { l2gain = s.grains; return true; }
        return false;
      },
    });
    if (l2gain !== null) {
      out(`  첫 굴절 직후 다듬기 1회: 결 +${fmt(l2gain)} (굴절 조건 ${T2.G.L[3].need})`);
      if (l2gain > T2.G.L[3].need * 4) fails.push(`(a) 첫 굴절 직후 다듬기 1회로 결 ${fmt(l2gain)} > ${T2.G.L[3].need * 4}`);
    } else out('  (a) 모델이 굴절 뒤 다듬기까지 가지 못함');
  }

  // (b) overshoot: any first reset that already gives > 10× the next layer's need
  for (const n of [1, 2, 3, 4]) {
    if (!f[n]) continue;
    const nextNeed = T.G.L[n + 1] ? T.G.L[n + 1].need : Infinity;
    if (f[n].gain > nextNeed * 10) fails.push(`(b) 첫 ${T.G.L[n].name} 획득 ${fmt(f[n].gain)}이 다음 층 조건의 10배 초과`);
  }

  out('\n■ 판정');
  if (fails.length) { fails.forEach((x) => console.log('  ✗ ' + x)); if (check) process.exit(1); }
  else out('  ✓ 모든 기준 통과');
}
if (require.main === module) main();
module.exports = { load, model, structuralBound };
