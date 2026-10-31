'use strict';
// ─────────────────────────────────────────────────────────────
//  STRUCTURES: 건축물의 배치, 진행, 완공, 쪼개기, 채색, 철거
//  블럭마다 lv(쪼개기 단계 0..3), cv(다음 단계로 깎인 조각 수), pt(칠한 조각 수)
// ─────────────────────────────────────────────────────────────
(function () {
  const B = T.B;
  const ST = (T.st = { placing: null, ghost: null, seed: 1, selected: null });
  let uidSeq = 1;
  const S = () => T.G.s;

  const hidden = (o, k, v) => Object.defineProperty(o, k, { value: v, enumerable: false, writable: true, configurable: true });
  function rt(st) { if (!st._rt) hidden(st, '_rt', { res: new Set(), workers: new Set(), t0: performance.now() - 5000 }); return st._rt; }
  ST.rt = rt;
  ST.shape = (st) => T.shapeOf(st.id, st.seed);
  ST.def = (st) => T.DEF[st.id];
  ST.done = (st) => st.f === null;
  ST.bbox = (st) => { const sh = ST.shape(st); const y = st.y || 0; return [st.x, st.x + sh.w * B, y + sh.h * B, y - sh.sink * B]; };
  ST.cellPos = (st, i) => { const b = ST.shape(st).blocks[i]; return [st.x + b.c * B + B / 2, (st.y || 0) + b.r * B + B / 2]; };
  ST.count = (st) => ST.shape(st).blocks.length;

  // ── colours ──────────────────────────────────────────────
  const ccache = new Map();
  ST.tint = function (hex, painted) {
    const mode = S().flags.color ? (painted ? 'p' : 'b') : 'g';
    if (mode === 'p') return hex;
    const key = hex + mode;
    let c = ccache.get(key);
    if (c) return c;
    const [r, g, b] = T.hexToRgb(hex);
    const y = 0.299 * r + 0.587 * g + 0.114 * b;
    const k = mode === 'g' ? 1 : 0.72;
    c = T.rgbToHex(r + (y - r) * k, g + (y - g) * k, b + (y - b) * k);
    if (mode === 'b') c = T.shade(c, 0.06);
    ccache.set(key, c);
    if (ccache.size > 8000) ccache.clear();
    return c;
  };
  ST.resetColors = () => ccache.clear();
  ST.blockColor = (st, i) => ST.shape(st).colorAt(i, 1)[0] || '#cccccc';

  // ── occupancy ────────────────────────────────────────────
  ST.overlaps = function (x0, x1, y0, y1, z, except) {
    const out = [];
    for (const st of S().structs) {
      if (st === except || (st.z || 0) !== z) continue;
      const [a, b, top, bot] = ST.bbox(st);
      if (a < x1 && b > x0 && bot < y1 && top > y0) out.push(st);
    }
    return out;
  };
  ST.at = function (x, y, z = 0, activeOnly) {
    for (const st of S().structs) {
      if ((st.z || 0) !== z || (activeOnly && ST.done(st))) continue;
      const [a, b, top, bot] = ST.bbox(st);
      if (x >= a && x < b && y < top && y >= Math.min(bot, (st.y || 0))) return st;
    }
    return null;
  };
  // only real pixels count when clicking a finished structure
  ST.hit = function (x, y, z = 0) {
    const st = ST.at(x, y, z);
    if (!st) return null;
    if (!ST.done(st)) return st;
    const sh = ST.shape(st);
    const c = Math.floor((x - st.x) / B), r = Math.floor((y - (st.y || 0)) / B);
    return sh.blocks.some((b) => b.c === c && b.r === r) ? st : null;
  };

  ST.create = function (id, seed, x, src, extra) {
    const sh = T.shapeOf(id, seed);
    const st = Object.assign({ uid: uidSeq++, id, seed, x: Math.round(x / B) * B, y: 0, z: 0, src, f: new Array(sh.blocks.length).fill(0), n: 0, res: [] }, extra || {});
    rt(st);
    S().structs.push(st);
    return st;
  };
  ST.syncUid = () => { for (const st of S().structs) uidSeq = Math.max(uidSeq, st.uid + 1); };
  ST.byUid = (uid) => S().structs.find((s) => s.uid === uid);

  ST.nextCell = function (st, nearX) {
    if (ST.done(st) || st.clearing) return -1;
    const r = rt(st), bl = ST.shape(st).blocks;
    let row = null, best = -1, bd = Infinity;
    for (let i = 0; i < bl.length; i++) {
      if (st.f[i] || r.res.has(i)) continue;
      if (row === null) row = bl[i].r;
      if (bl[i].r !== row) break;
      const d = Math.abs(st.x + bl[i].c * B - nearX);
      if (d < bd) { bd = d; best = i; }
    }
    return best;
  };
  ST.reserve = (st, i) => rt(st).res.add(i);
  ST.openCells = (st) => (ST.done(st) ? 0 : ST.count(st) - st.n - rt(st).res.size);

  // ── drawing one block (handles split level, carving and paint) ──
  function drawBlock(st, i) {
    const sh = ST.shape(st);
    const b = sh.blocks[i];
    const x0 = st.x + b.c * B, y0 = (st.y || 0) + b.r * B;
    const z = st.z || 0;
    const layer = b.r < 0 ? 'under' : 'front';
    const done = ST.done(st);
    const lv = done && st.lv ? st.lv[i] : 0;
    const cv = done && st.cv ? st.cv[i] : 0;
    const pt = done && st.pt ? st.pt[i] : 0;
    T.world.clearCell(x0, y0, layer, z);
    const R = T.RES[lv];
    const cols = sh.colorAt(i, R);
    if (R === 1) {
      if (cols[0]) T.world.drawBlock(x0 + B / 2, y0 + B / 2, ST.tint(cols[0], pt > 0), false, layer, z);
    } else T.world.drawCells(x0, y0, R, cols.map((c, k) => (c ? ST.tint(c, k < pt) : null)), layer, z);
    if (cv > 0 && lv < 3) {
      const R2 = R * 2;
      const c2 = sh.colorAt(i, R2);
      const out = new Array(R2 * R2).fill(undefined);
      // carving goes top-left to bottom-right; carved pieces reveal finer colour (or emptiness)
      for (let k = 0; k < cv; k++) {
        const row = Math.floor(k / R2), col = k % R2;
        const parent = Math.floor(row / 2) * R + Math.floor(col / 2);
        out[k] = c2[k] ? ST.tint(c2[k], parent < pt) : null;
      }
      T.world.drawCells(x0, y0, R2, out, layer, z, true);
    }
  }
  ST.drawBlock = drawBlock;
  function initDone(st) {
    const n = ST.count(st);
    if (!st.lv) st.lv = new Array(n).fill(0);
    if (!st.cv) st.cv = new Array(n).fill(0);
    if (!st.pt) st.pt = new Array(n).fill(0);
  }

  ST.fill = function (st, i) {
    rt(st).res.delete(i);
    if (!S().structs.includes(st) || ST.done(st) || st.f[i]) return false;
    st.f[i] = 1; st.n++;
    drawBlock(st, i);
    if (st.n >= st.f.length) complete(st);
    return true;
  };

  function complete(st) {
    const s = S();
    const def = ST.def(st);
    const sh = ST.shape(st);
    st.f = null;
    initDone(st);
    rt(st).res.clear();
    s.stats.built++;
    s.run.built.push(def.tier);
    const isBp = st.src === 'bp';
    if (isBp) s.bps.done[st.id] = (s.bps.done[st.id] || 0) + 1;
    if (st.src !== 'grave') {
      const reward = ST.reward(def, sh) * (isBp ? 1 : 0.6);
      T.G.earn(reward);
      T.fx.complete(st, def, sh, reward, isBp);
    }
    T.G.computeMult();
    for (const e of T.ent.archs) {
      if (e.proj === st) {
        if (e.y === 0 && !e.held && !e.inside) { e.happyT = 2; T.ent.hop(e, 150); }
        if (isBp && Math.random() < 0.3) e.bubble = { text: ['완성!', '와아', '♪♪', '멋져!', '해냈다'][Math.floor(Math.random() * 5)], t: 1.8 };
        T.ent.setProj(e, null);
      }
    }
    if (s.player.length) T.G.redrawRange(st.x - B, st.x + sh.w * B + B);
    T.vil.onBuilt(st);
  }
  ST.reward = (def, sh) => sh.blocks.length * T.G.bestValue() * T.TIERS[def.tier].mult * Math.pow(2, S().pup.blue || 0) * (1 + 0.25 * S().era);

  ST.drawStruct = function (st) {
    const n = ST.count(st);
    const done = ST.done(st);
    for (let i = 0; i < n; i++) if (done || st.f[i]) drawBlock(st, i);
  };

  ST.remove = function (st, silent) {
    const s = S();
    const i = s.structs.indexOf(st);
    if (i < 0) return;
    s.structs.splice(i, 1);
    for (const e of T.ent.all()) { if (e.proj === st) T.ent.setProj(e, null); if (e.job === st) e.job = null; if (e.d && e.d.home === st.uid) e.d.home = 0; }
    if (ST.selected === st) T.ui.closeCard();
    const sh = ST.shape(st);
    if (!silent) T.fx.demolish(st, sh);
    T.G.redrawRange(st.x - B, st.x + sh.w * B + B);
  };

  // ── refine: carving (splitter), painting (painter), knocking down (hammer) ──
  ST.maxLv = () => S().resLv || 0;
  // next block on a finished structure that can still be carved finer
  ST.nextCarve = function (st) {
    if (!ST.done(st)) return -1;
    initDone(st);
    const mx = ST.maxLv();
    for (let i = 0; i < st.lv.length; i++) if (st.lv[i] < mx) return i;
    return -1;
  };
  ST.carve = function (st, i, pieces) {
    initDone(st);
    let carved = 0;
    while (pieces > 0 && st.lv[i] < ST.maxLv()) {
      const R2 = T.RES[st.lv[i] + 1];
      const need = R2 * R2 - st.cv[i];
      const k = Math.min(need, pieces);
      st.cv[i] += k; pieces -= k; carved += k;
      if (st.cv[i] >= R2 * R2) {
        const R = T.RES[st.lv[i]];
        st.pt[i] = Math.round((st.pt[i] / (R * R)) * R2 * R2);
        st.lv[i]++; st.cv[i] = 0;
      }
    }
    drawBlock(st, i);
    return carved;
  };
  ST.nextPaint = function (st) {
    if (!ST.done(st)) return -1;
    initDone(st);
    for (let i = 0; i < st.pt.length; i++) { const R = T.RES[st.lv[i]]; if (st.pt[i] < R * R) return i; }
    return -1;
  };
  ST.paint = function (st, i, pieces) {
    initDone(st);
    const R = T.RES[st.lv[i]];
    const k = Math.min(pieces, R * R - st.pt[i]);
    st.pt[i] += k;
    drawBlock(st, i);
    return k;
  };
  ST.paintedFrac = function (st) {
    if (!ST.done(st) || !st.pt) return 0;
    let a = 0, t = 0;
    for (let i = 0; i < st.pt.length; i++) { const R = T.RES[st.lv[i]]; a += st.pt[i] / (R * R); t++; }
    return t ? a / t : 0;
  };
  ST.splitFrac = function (st) {
    if (!ST.done(st) || !st.lv) return 0;
    const mx = Math.max(1, ST.maxLv());
    let a = 0; for (const l of st.lv) a += Math.min(l, mx) / mx;
    return a / st.lv.length;
  };
  // hammers knock blocks off one by one (from the top)
  ST.knock = function (st, n) {
    const sh = ST.shape(st);
    if (!st.gone) st.gone = 0;
    const total = sh.blocks.length;
    const s = Math.min(n, total - st.gone);
    for (let k = 0; k < s; k++) {
      const i = total - 1 - st.gone;
      const b = sh.blocks[i];
      const x0 = st.x + b.c * B, y0 = (st.y || 0) + b.r * B;
      T.world.clearCell(x0, y0, b.r < 0 ? 'under' : 'front', st.z || 0);
      T.fx.debris(x0 + B / 2, y0 + B / 2, ST.tint(ST.blockColor(st, i), false));
      st.gone++;
    }
    if (st.gone >= total) ST.remove(st, true);
    return s;
  };

  // ── player blueprints ────────────────────────────────────
  ST.available = function (def) {
    const s = S();
    if (def.hidden || def.era > s.era) return false;
    if ((def.minRes || 0) > (s.resLv || 0)) return false;
    if (def.era === 0 && def.tier <= 2 && def.tier > T.G.maxSculptTier()) return false;
    if (def.sky && s.ms < 6) return false;
    if (def.tier === 4 && s.era < 2) return false;
    if (def.tier === 5 && s.era < 3) return false;
    return true;
  };
  ST.visible = function (def) {
    const s = S();
    if (def.hidden) return false;
    if (def.era === 0) return def.tier <= T.G.maxSculptTier() + 1 && (def.minRes || 0) <= (s.resLv || 0) + 1 && (!def.sky || s.ms >= 5);
    return s.flags.l6Done > 0 && def.era <= s.era + 1;
  };
  ST.activeBps = () => S().structs.filter((st) => st.src === 'bp' && !ST.done(st));
  ST.startPlacing = function (id) {
    if (ST.activeBps().length >= T.G.bpSlots()) { T.ui.toast(`동시에 펼칠 수 있는 설계도는 ${T.G.bpSlots()}개입니다.`); T.audio.deny(); return false; }
    ST.placing = id;
    ST.seed = 1 + Math.floor(Math.random() * 9999);
    document.body.classList.add('placing');
    T.ui.placingHint(true, T.DEF[id].name);
    return true;
  };
  ST.cancel = function () { ST.placing = null; document.body.classList.remove('placing'); T.ui.placingHint(false); };
  ST.ghostPos = function (wx, wy) {
    const sh = T.shapeOf(ST.placing, ST.seed);
    const x = Math.round((wx - (sh.w * B) / 2) / B) * B;
    const y = T.DEF[ST.placing].sky ? Math.max(B * 10, Math.round((wy - (sh.h * B) / 2) / B) * B) : 0;
    return [x, y];
  };
  ST.check = function (id, seed, x, y) {
    const sh = T.shapeOf(id, seed);
    const ov = ST.overlaps(x - B, x + sh.w * B + B, y - sh.sink * B, y + sh.h * B, 0);
    const s = S();
    if (!ov.length) return { ok: true, ov };
    if (s.era < 1) return { ok: false, ov, why: '다른 건축물과 겹칩니다.' };
    if (ov.some((o) => !ST.done(o) && o.src === 'bp')) return { ok: false, ov, why: '짓고 있는 설계도와 겹칩니다.' };
    return { ok: true, ov, demolish: true, warn: ov.some((o) => o.src === 'bp') };
  };
  ST.confirm = function (wx, wy) {
    const id = ST.placing, seed = ST.seed;
    const [x, y] = ST.ghostPos(wx, wy);
    const chk = ST.check(id, seed, x, y);
    if (!chk.ok) { T.ui.toast(chk.why); T.audio.deny(); return; }
    const go = () => {
      const st = ST.create(id, seed, x, 'bp', { y });
      rt(st).t0 = performance.now();
      if (chk.demolish) { st.clearing = true; for (const o of chk.ov) o.condemned = st.uid; T.ui.toast('철거 주민들이 먼저 자리를 비웁니다.'); }
      ST.cancel();
      T.audio.unlock();
      T.ui.toast(`「${T.DEF[id].name}」 설계도를 펼쳤습니다.`);
      T.G.redrawRange(x - B, x + T.shapeOf(id, seed).w * B + B);
    };
    if (chk.warn) {
      const names = [...new Set(chk.ov.filter((o) => o.src === 'bp').map((o) => T.DEF[o.id].name))].join(', ');
      T.ui.modal(`<div class="m-head"><span class="m-kicker">경고</span><h2>건축물을 허물까요?</h2></div>
        <p class="m-flavor">이 자리에는 설계도로 지은 「${names}」이(가) 있습니다. 철거하고 새로 지으면 되돌릴 수 없습니다.</p>
        <div class="m-actions"><button class="btn ghost" data-close>그만두기</button><button class="btn danger" id="demo-ok">철거하고 짓기</button></div>`);
      T.$('#demo-ok').addEventListener('click', () => { T.ui.closeModal(); go(); });
    } else go();
  };
  ST.condemned = () => S().structs.filter((st) => st.condemned);
  ST.clearedCheck = function () {
    for (const st of S().structs) {
      if (!st.clearing || S().structs.some((o) => o.condemned === st.uid)) continue;
      const [a, b] = ST.bbox(st);
      const before = S().player.length;
      S().player = S().player.filter((p) => p[0] < a || p[0] > b);
      st.clearing = false;
      if (before !== S().player.length) { T.G.redrawRange(a - B, b + B); T.main.reindex(); }
    }
  };
  // estimated time to finish (shown after milestone 10)
  ST.eta = function (st) {
    const left = ST.count(st) - st.n;
    const ws = [...rt(st).workers];
    if (!ws.length) return null;
    let rate = 0; for (const e of ws) rate += 1 / T.G.cooldown(e.d, false, ws.length, e.happy || 0);
    return left / Math.max(0.01, rate) * 1.25;
  };

  // ── render: ghosts, scaffolding, labels, plaques, aura ───
  const ghostCache = new Map();
  function ghostTex(id, seed, color, faint) {
    const key = id + '#' + seed + (color ? 'c' : 'g') + (faint ? 'f' : '');
    if (ghostCache.has(key)) return ghostCache.get(key);
    const sh = T.shapeOf(id, seed);
    const sc = 3, pad = 6;
    const cv = document.createElement('canvas');
    cv.width = sh.w * B * sc + pad * 2; cv.height = (sh.h + sh.sink) * B * sc + pad * 2;
    const ctx = cv.getContext('2d');
    const ink = faint ? 'rgba(110,100,90,0.5)' : color ? '#2f6fb0' : '#6a6a68';
    const set = new Set(sh.blocks.map((b) => b.c + ',' + b.r));
    const X = (c) => pad + c * B * sc, Y = (r) => pad + (sh.h - r) * B * sc;
    ctx.strokeStyle = faint ? 'rgba(120,110,100,0.16)' : color ? 'rgba(47,111,176,0.3)' : 'rgba(90,90,90,0.25)';
    ctx.setLineDash([3, 3]); ctx.lineWidth = 1;
    for (const b of sh.blocks) ctx.strokeRect(X(b.c) + 0.5, Y(b.r + 1) + 0.5, B * sc - 1, B * sc - 1);
    ctx.setLineDash([]);
    const rc = window.rough && !faint ? rough.canvas(cv) : null;
    for (const b of sh.blocks) {
      const segs = [];
      if (!set.has(b.c + ',' + (b.r + 1))) segs.push([X(b.c), Y(b.r + 1), X(b.c + 1), Y(b.r + 1)]);
      if (!set.has(b.c + ',' + (b.r - 1))) segs.push([X(b.c), Y(b.r), X(b.c + 1), Y(b.r)]);
      if (!set.has(b.c - 1 + ',' + b.r)) segs.push([X(b.c), Y(b.r), X(b.c), Y(b.r + 1)]);
      if (!set.has(b.c + 1 + ',' + b.r)) segs.push([X(b.c + 1), Y(b.r), X(b.c + 1), Y(b.r + 1)]);
      for (const s of segs) {
        if (rc) rc.line(s[0], s[1], s[2], s[3], { stroke: ink, strokeWidth: 1.5, roughness: 0.9, bowing: 0.6, seed: 3 });
        else { ctx.strokeStyle = ink; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(s[0], s[1]); ctx.lineTo(s[2], s[3]); ctx.stroke(); }
      }
    }
    const out = { cv, sc, pad, sh };
    ghostCache.set(key, out);
    if (ghostCache.size > 200) ghostCache.delete(ghostCache.keys().next().value);
    return out;
  }
  function drawGhost(ctx, id, seed, x, y, reveal, alpha, faint, tint) {
    const g = ghostTex(id, seed, S().flags.color, faint);
    const z = T.cam.z * T.layerK();
    const [sx, sy] = T.w2s(x, y + g.sh.h * B);
    const w = (g.cv.width / g.sc) * z, h = (g.cv.height / g.sc) * z;
    const px = sx - (g.pad / g.sc) * z, py = sy - (g.pad / g.sc) * z;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.imageSmoothingEnabled = true;
    if (reveal < 1) { ctx.beginPath(); ctx.rect(px - 4, py + h * (1 - reveal), w + 8, h * reveal + 4); ctx.clip(); }
    ctx.drawImage(g.cv, px, py, w, h);
    if (tint) { ctx.globalCompositeOperation = 'source-atop'; ctx.fillStyle = tint; ctx.fillRect(px, py, w, h); }
    ctx.restore();
    if (reveal < 1 && reveal > 0) { ctx.fillStyle = S().flags.color ? 'rgba(47,111,176,0.8)' : 'rgba(60,60,60,0.7)'; ctx.fillRect(px, py + h * (1 - reveal), w, Math.max(1, z)); }
  }
  // after settling: wooden scaffolding instead of a blueprint ghost (readable at night)
  function drawScaffold(ctx, st, night) {
    const sh = ST.shape(st);
    const z = T.cam.z * T.layerK();
    const set = new Set(sh.blocks.map((b) => b.c + ',' + b.r));
    const y0 = st.y || 0;
    let topRow = -1; for (const b of sh.blocks) topRow = Math.max(topRow, b.r);
    let maxFilledRow = -1; sh.blocks.forEach((b, i) => { if (st.f[i]) maxFilledRow = Math.max(maxFilledRow, b.r); });
    const color = S().flags.color;
    ctx.save();
    ctx.globalAlpha = 0.85;
    const pole = color ? (night > 0.5 ? '#e0b070' : '#9c7048') : '#7a7a77';
    // poles every 3 columns, up to one row above the work
    const scaffoldTop = Math.min(topRow + 1, maxFilledRow + 3);
    for (let c = 0; c <= sh.w; c += 3) {
      const [px, py0] = T.w2s(st.x + c * B, y0);
      const [, py1] = T.w2s(st.x + c * B, y0 + (scaffoldTop + 1) * B);
      ctx.fillStyle = pole; ctx.fillRect(Math.round(px) - Math.max(1, z * 0.6), py1, Math.max(1.5, z * 1.2), py0 - py1);
    }
    for (let r = 2; r <= scaffoldTop; r += 3) {
      const [px0, py] = T.w2s(st.x, y0 + r * B);
      const [px1] = T.w2s(st.x + sh.w * B, y0 + r * B);
      ctx.fillStyle = pole; ctx.fillRect(px0, Math.round(py), px1 - px0, Math.max(1.5, z * 1.2));
    }
    // dashed silhouette so the final shape stays readable
    ctx.strokeStyle = color ? (night > 0.5 ? 'rgba(255,220,150,0.65)' : 'rgba(120,90,60,0.5)') : 'rgba(80,80,80,0.4)';
    ctx.lineWidth = 1; ctx.setLineDash([4, 3]);
    ctx.beginPath();
    for (const b of sh.blocks) {
      const x = st.x + b.c * B, y = y0 + b.r * B;
      const edge = (dc, dr, ax, ay, bx, by) => { if (!set.has((b.c + dc) + ',' + (b.r + dr))) { const [p, q] = T.w2s(ax, ay), [p2, q2] = T.w2s(bx, by); ctx.moveTo(p, q); ctx.lineTo(p2, q2); } };
      edge(0, 1, x, y + B, x + B, y + B); edge(-1, 0, x, y, x, y + B); edge(1, 0, x + B, y, x + B, y + B);
    }
    ctx.stroke();
    ctx.restore();
  }

  ST.render = function (ctx, now, z = 0, night = 0) {
    const s = S();
    const color = s.flags.color;
    const zoom = T.cam.z * T.layerK();
    for (const st of s.structs) {
      if ((st.z || 0) !== z) continue;
      const [a, b, top] = ST.bbox(st);
      const [sa] = T.w2s(a, 0), [sb] = T.w2s(b, 0);
      if (sb < -40 || sa > T.cam.W + 40) continue;
      const def = ST.def(st);
      const sh = ST.shape(st);
      if (!ST.done(st)) {
        const bp = st.src === 'bp';
        const rv = bp ? T.easeInOut(T.clamp((now - rt(st).t0) / 1100, 0, 1)) : 1;
        if (s.era >= 1 && !(bp && rv < 1)) drawScaffold(ctx, st, night);
        else drawGhost(ctx, st.id, st.seed, st.x, st.y || 0, rv, bp ? (st.clearing ? 0.45 : 0.95) : 0.75, !bp);
        if (zoom > 0.4) {
          ctx.fillStyle = color ? 'rgba(47,111,176,0.16)' : 'rgba(80,80,80,0.12)';
          for (const i of rt(st).res) { const [cx, cy] = ST.cellPos(st, i); const [px, py] = T.w2s(cx - B / 2, cy + B / 2); ctx.fillRect(px, py, B * zoom, B * zoom); }
        }
        if (z === 0 && zoom > 0.3 && (bp || zoom > 0.9)) {
          let text = `${def.name}  ${st.n}/${sh.blocks.length}${st.clearing ? '  철거 대기' : ''}`;
          if (s.ms >= 10) { const eta = ST.eta(st); if (eta) text += `  약 ${T.fmtTime(eta)}`; }
          label(ctx, st.x + (sh.w * B) / 2, top, text, st.n / sh.blocks.length, bp, rv);
        }
      } else if (st.src === 'bp' && zoom > 0.55 && z === 0) plaque(ctx, st.x + (sh.w * B) / 2, (st.y || 0), def.name);
      if (st.condemned && zoom > 0.3) {
        ctx.save(); ctx.globalAlpha = 0.35 + Math.sin(now / 160) * 0.15;
        ctx.strokeStyle = '#c0392b'; ctx.lineWidth = 2; ctx.setLineDash([6, 4]);
        const [px, py] = T.w2s(a, top), [px2, py2] = T.w2s(b, st.y || 0);
        ctx.strokeRect(px, py, px2 - px, py2 - py); ctx.restore();
      }
    }
    if (z !== 0) return;
    // happiness range of the selected structure
    if (ST.selected && s.structs.includes(ST.selected)) {
      const st = ST.selected, d = ST.def(st), sh = ST.shape(st);
      if (!d.cap && d.cat !== 'special') {
        const t = T.TIERS[d.tier];
        const R = t.radius * (1 + 0.3 * (s.lup.aura || 0));
        const cx = st.x + (sh.w * B) / 2;
        const [x0, gy] = T.w2s(cx - R, 0), [x1] = T.w2s(cx + R, 0);
        const g = ctx.createLinearGradient(0, gy - 90 * T.cam.z, 0, gy);
        g.addColorStop(0, 'rgba(255,209,102,0)'); g.addColorStop(1, color ? 'rgba(255,209,102,0.35)' : 'rgba(80,80,80,0.18)');
        ctx.fillStyle = g; ctx.fillRect(x0, gy - 90 * T.cam.z, x1 - x0, 90 * T.cam.z);
        ctx.strokeStyle = color ? '#e2b23c' : '#555'; ctx.lineWidth = 2; ctx.setLineDash([5, 4]);
        ctx.beginPath(); ctx.moveTo(x0, gy - 90 * T.cam.z); ctx.lineTo(x0, gy); ctx.moveTo(x1, gy - 90 * T.cam.z); ctx.lineTo(x1, gy); ctx.stroke(); ctx.setLineDash([]);
      }
      const [a, b, top, bot] = ST.bbox(st);
      const [p0, q0] = T.w2s(a, top), [p1, q1] = T.w2s(b, Math.min(bot, st.y || 0));
      ctx.strokeStyle = color ? '#2f6fb0' : '#333'; ctx.lineWidth = 1; ctx.strokeRect(Math.round(p0) + 0.5, Math.round(q0) + 0.5, p1 - p0, q1 - q0);
    }
    if (ST.placing && ST.ghost) {
      const [x, y] = ST.ghostPos(ST.ghost[0], ST.ghost[1]);
      const chk = ST.check(ST.placing, ST.seed, x, y);
      const tint = !chk.ok ? 'rgba(200,60,60,0.5)' : chk.demolish ? 'rgba(220,140,40,0.35)' : null;
      drawGhost(ctx, ST.placing, ST.seed, x, y, 1, 0.6 + Math.sin(now / 180) * 0.12, false, tint);
    }
  };
  function label(ctx, x, top, text, k, bp, rv) {
    const color = S().flags.color;
    const [lx, ly] = T.w2s(x, top);
    ctx.save();
    ctx.font = '11px Galmuri11, monospace';
    const tw = Math.ceil(ctx.measureText(text).width) + 12;
    ctx.globalAlpha = bp ? T.clamp((rv - 0.6) * 3, 0, 1) : 0.75;
    ctx.fillStyle = bp ? (color ? '#1f4e79' : '#3a3a3a') : 'rgba(60,60,60,0.75)';
    ctx.fillRect(Math.round(lx - tw / 2), Math.round(ly - 26), tw, 17);
    ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, Math.round(lx), Math.round(ly - 17));
    const pw = tw - 8;
    ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(Math.round(lx - pw / 2), Math.round(ly - 12), pw, 2);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(lx - pw / 2), Math.round(ly - 12), pw * k, 2);
    ctx.restore();
  }
  function plaque(ctx, x, y, name) {
    const color = S().flags.color;
    const z = T.cam.z;
    const [px, py] = T.w2s(x, y);
    ctx.save();
    ctx.font = '9px Galmuri9, monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const tw = Math.ceil(ctx.measureText(name).width) + 10;
    ctx.fillStyle = color ? '#5c5470' : '#5a5a58';
    ctx.fillRect(Math.round(px - tw / 2), Math.round(py + 6 * z), tw, 13);
    ctx.fillStyle = color ? '#f4e9d8' : '#eeeeec';
    ctx.fillText(name, Math.round(px), Math.round(py + 6 * z + 7));
    ctx.restore();
  }
  ST.renderGlow = function (ctx, n, z = 0) {
    if (n < 0.02) return;
    const zoom = T.cam.z * T.layerK();
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.imageSmoothingEnabled = true;
    const t = performance.now();
    for (const st of S().structs) {
      if ((st.z || 0) !== z || !ST.done(st)) continue;
      const sh = ST.shape(st);
      const [sa] = T.w2s(st.x, 0), [sb] = T.w2s(st.x + sh.w * B, 0);
      if (sb < -60 || sa > T.cam.W + 60 || !sh.glow.length) continue;
      const d = ST.def(st);
      for (let k = 0; k < sh.glow.length; k++) {
        const [gx, gy, g] = sh.glow[k];
        if (g === 1 && !(d.cap || d.visit)) continue;
        const [sx, sy] = T.w2s(st.x + gx, (st.y || 0) + gy);
        const r = (g === 2 ? 12 : 8) * zoom;
        ctx.globalAlpha = n * (g === 2 ? 0.45 : 0.28) * (0.85 + Math.sin(t / 300 + k) * 0.15);
        ctx.drawImage(T.world.glowSprite(g === 2 ? 'rgba(255,190,90,1)' : 'rgba(255,214,140,1)'), sx - r, sy - r, r * 2, r * 2);
      }
    }
    ctx.restore();
  };

  // ── drafting sheet (modal) ───────────────────────────────
  ST.renderSheet = function (canvas, id, seed, locked) {
    const color = S().flags.color;
    const sh = T.shapeOf(id, seed);
    const W = canvas.width, H = canvas.height;
    const ctx = canvas.getContext('2d');
    const paper = color ? '#1f4e79' : '#e7e7e4';
    const line = color ? 'rgba(232,241,250,0.95)' : 'rgba(40,40,40,0.9)';
    ctx.fillStyle = paper; ctx.fillRect(0, 0, W, H);
    for (let x = 0; x < W; x += 10) { ctx.fillStyle = x % 50 === 0 ? (color ? 'rgba(232,241,250,0.22)' : 'rgba(0,0,0,0.11)') : color ? 'rgba(232,241,250,0.1)' : 'rgba(0,0,0,0.05)'; ctx.fillRect(x, 0, 1, H); }
    for (let y = 0; y < H; y += 10) { ctx.fillStyle = y % 50 === 0 ? (color ? 'rgba(232,241,250,0.22)' : 'rgba(0,0,0,0.11)') : color ? 'rgba(232,241,250,0.1)' : 'rgba(0,0,0,0.05)'; ctx.fillRect(0, y, W, 1); }
    const margin = 52;
    const rows = sh.h + sh.sink;
    const cs = Math.max(2, Math.floor(Math.min((W - margin * 2) / sh.w, (H - margin * 2) / rows) / 8) * 8) || Math.min((W - margin * 2) / sh.w, (H - margin * 2) / rows);
    const ox = Math.round((W - cs * sh.w) / 2), groundY = Math.round((H - cs * rows) / 2) + cs * sh.h - 4;
    if (locked) ctx.globalAlpha = 0.35;
    // the actual pixel art, in ink colour, at the best resolution available
    const res = T.RES[Math.max(0, Math.min(3, (S().resLv || 0)))];
    sh.blocks.forEach((b, i) => {
      const cols = sh.colorAt(i, res), sub = cs / res;
      cols.forEach((c, k) => { if (!c) return; const ii = k % res, jj = Math.floor(k / res); const [r, g, bl] = T.hexToRgb(c); const lum = (0.3 * r + 0.59 * g + 0.11 * bl) / 255;
        ctx.fillStyle = color ? `rgba(232,241,250,${0.15 + (1 - lum) * 0.55})` : `rgba(30,30,30,${0.1 + (1 - lum) * 0.6})`;
        ctx.fillRect(ox + b.c * cs + ii * sub, groundY - (b.r + 1) * cs + jj * sub, Math.ceil(sub), Math.ceil(sub)); });
    });
    const set = new Set(sh.blocks.map((b) => b.c + ',' + b.r));
    const rc = window.rough ? rough.canvas(canvas) : null;
    for (const b of sh.blocks) {
      const X = (c) => ox + c * cs, Y = (r) => groundY - r * cs;
      const segs = [];
      if (!set.has(b.c + ',' + (b.r + 1))) segs.push([X(b.c), Y(b.r + 1), X(b.c + 1), Y(b.r + 1)]);
      if (!set.has(b.c + ',' + (b.r - 1))) segs.push([X(b.c), Y(b.r), X(b.c + 1), Y(b.r)]);
      if (!set.has(b.c - 1 + ',' + b.r)) segs.push([X(b.c), Y(b.r), X(b.c), Y(b.r + 1)]);
      if (!set.has(b.c + 1 + ',' + b.r)) segs.push([X(b.c + 1), Y(b.r), X(b.c + 1), Y(b.r + 1)]);
      for (const sg of segs) { if (rc) rc.line(sg[0], sg[1], sg[2], sg[3], { stroke: line, strokeWidth: 1.4, roughness: 0.7, bowing: 0.5, seed: 7 }); else { ctx.strokeStyle = line; ctx.beginPath(); ctx.moveTo(sg[0], sg[1]); ctx.lineTo(sg[2], sg[3]); ctx.stroke(); } }
    }
    ctx.globalAlpha = 1;
    ctx.strokeStyle = line; ctx.fillStyle = line; ctx.lineWidth = 1;
    ctx.font = '11px Galmuri11, monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    dim(ctx, ox, groundY + sh.sink * cs + 20, ox + cs * sh.w, groundY + sh.sink * cs + 20, `${sh.w} 블럭`, paper);
    dim(ctx, ox + cs * sh.w + 22, groundY, ox + cs * sh.w + 22, groundY - sh.h * cs, `${sh.h}`, paper, true);
    for (let x = ox - 24; x < ox + cs * sh.w + 24; x += 6) ctx.fillRect(x, groundY + 2, 3, 1);
    if (locked) {
      ctx.save(); ctx.translate(W / 2, H / 2); ctx.rotate(-0.12);
      ctx.strokeStyle = color ? '#ffd166' : '#444'; ctx.lineWidth = 3; ctx.strokeRect(-110, -26, 220, 52);
      ctx.fillStyle = color ? '#ffd166' : '#444'; ctx.font = '22px Galmuri14, monospace'; ctx.fillText('아직 이른 도면', 0, 2);
      ctx.restore();
    }
  };
  function dim(ctx, x0, y0, x1, y1, text, bg, vertical) {
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    const a = 4;
    ctx.beginPath();
    if (!vertical) { ctx.moveTo(x0, y0); ctx.lineTo(x0 + a, y0 - a); ctx.moveTo(x0, y0); ctx.lineTo(x0 + a, y0 + a); ctx.moveTo(x1, y1); ctx.lineTo(x1 - a, y1 - a); ctx.moveTo(x1, y1); ctx.lineTo(x1 - a, y1 + a); }
    else { ctx.moveTo(x0, y0); ctx.lineTo(x0 - a, y0 - a); ctx.moveTo(x0, y0); ctx.lineTo(x0 + a, y0 - a); ctx.moveTo(x1, y1); ctx.lineTo(x1 - a, y1 + a); ctx.moveTo(x1, y1); ctx.lineTo(x1 + a, y1 + a); }
    ctx.stroke();
    const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
    const tw = ctx.measureText(text).width + 8;
    ctx.save(); ctx.fillStyle = bg; ctx.fillRect(mx - tw / 2, my - 7, tw, 14); ctx.restore();
    ctx.fillText(text, mx, my + 1);
  }
})();
