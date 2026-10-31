'use strict';
// ─────────────────────────────────────────────────────────────
//  STRUCTURES: 건축물의 배치, 진행, 완공, 철거, 도면 시트
//  모든 건축물은 바닥(y=0) 위에 섭니다. r<0 칸은 땅속(물).
// ─────────────────────────────────────────────────────────────
(function () {
  const B = T.B;
  const ST = (T.st = { placing: null, ghostX: 0, seed: 1 });
  let uidSeq = 1;

  const hidden = (o, k, v) => Object.defineProperty(o, k, { value: v, enumerable: false, writable: true, configurable: true });
  function rt(st) {
    if (!st._rt) hidden(st, '_rt', { res: new Set(), workers: new Set(), t0: performance.now() - 5000 });
    return st._rt;
  }
  ST.rt = rt;
  ST.shape = (st) => T.shapeOf(st.id, st.seed);
  ST.def = (st) => T.DEF[st.id];
  ST.done = (st) => st.f === null;
  ST.bbox = (st) => { const sh = ST.shape(st); return [st.x, st.x + sh.w * B, sh.h * B, -sh.sink * B]; };
  ST.cellPos = (st, i) => { const c = ST.shape(st).cells[i]; return [st.x + c.c * B + B / 2, c.r * B + B / 2]; };
  ST.cellCh = (st, i) => ST.shape(st).cells[i].ch;

  // ── colours ──────────────────────────────────────────────
  const ccache = new Map();
  ST.colorOf = function (ch, painted) {
    const mode = T.G.s.flags.color ? (painted ? 'p' : 'b') : 'g';
    const key = ch + mode;
    let c = ccache.get(key);
    if (c) return c;
    const base = T.CELL[ch] || '#cccccc';
    if (mode === 'p') c = base;
    else {
      const [r, g, b] = T.hexToRgb(base);
      const y = 0.299 * r + 0.587 * g + 0.114 * b;
      const k = mode === 'g' ? 1 : 0.72; // unpainted = mostly desaturated
      c = T.rgbToHex(r + (y - r) * k, g + (y - g) * k, b + (y - b) * k);
      if (mode === 'b') c = T.shade(c, 0.05);
    }
    ccache.set(key, c);
    return c;
  };
  ST.resetColors = () => ccache.clear();

  // ── occupancy ────────────────────────────────────────────
  ST.overlaps = function (x0, x1, except) {
    const out = [];
    for (const st of T.G.s.structs) {
      if (st === except) continue;
      const [a, b] = ST.bbox(st);
      if (a < x1 && b > x0) out.push(st);
    }
    return out;
  };
  ST.inFootprint = function (x, y, activeOnly) {
    for (const st of T.G.s.structs) {
      if (activeOnly && ST.done(st)) continue;
      const [a, b, top, bottom] = ST.bbox(st);
      if (x >= a - 1 && x <= b + 1 && y <= top + B && y >= bottom - 1) return st;
    }
    return null;
  };

  ST.create = function (id, seed, x, src, extra) {
    const sh = T.shapeOf(id, seed);
    const st = Object.assign({ uid: uidSeq++, id, seed, x: Math.round(x / B) * B, src, f: new Array(sh.cells.length).fill(0), n: 0, p: 0, res: [] }, extra || {});
    rt(st);
    T.G.s.structs.push(st);
    return st;
  };
  ST.syncUid = () => { for (const st of T.G.s.structs) uidSeq = Math.max(uidSeq, st.uid + 1); };
  ST.byUid = (uid) => T.G.s.structs.find((s) => s.uid === uid);

  // next free cell: lowest row first, nearest to the builder
  ST.nextCell = function (st, nearX) {
    if (ST.done(st) || st.clearing) return -1;
    const r = rt(st);
    const sh = ST.shape(st);
    let row = null, best = -1, bd = Infinity;
    for (let i = 0; i < sh.cells.length; i++) {
      if (st.f[i] || r.res.has(i)) continue;
      const c = sh.cells[i];
      if (row === null) row = c.r;
      if (c.r !== row) break;
      const d = Math.abs(st.x + c.c * B - nearX);
      if (d < bd) { bd = d; best = i; }
    }
    return best;
  };
  ST.cellFree = (st, i) => T.G.s.structs.includes(st) && !ST.done(st) && !st.f[i] && !rt(st).res.has(i);
  ST.reserve = (st, i) => rt(st).res.add(i);
  ST.release = (st, i) => rt(st).res.delete(i);
  ST.openCells = (st) => (ST.done(st) ? 0 : ST.shape(st).cells.length - st.n - rt(st).res.size);

  function drawCell(st, i, painted) {
    const sh = ST.shape(st);
    const c = sh.cells[i];
    const x = st.x + c.c * B + B / 2, y = c.r * B + B / 2;
    const col = ST.colorOf(c.ch, painted);
    if (c.r < 0) T.world.drawFlat(x, y, col, 'under');
    else if (c.ch === 'a') T.world.drawFlat(x, y, col, 'front');
    else T.world.drawBlock(x, y, col, false, 'front');
  }
  ST.drawCell = drawCell;

  ST.fill = function (st, i) {
    const r = rt(st);
    r.res.delete(i);
    if (!T.G.s.structs.includes(st) || ST.done(st) || st.f[i]) return false;
    st.f[i] = 1; st.n++;
    drawCell(st, i, false);
    if (st.n >= st.f.length) complete(st);
    return true;
  };

  function complete(st) {
    const s = T.G.s;
    const def = ST.def(st);
    const sh = ST.shape(st);
    st.f = null;
    st.p = 0;
    rt(st).res.clear();
    s.stats.built++;
    s.run.built.push(def.tier);
    if (st.src === 'bp') { s.bps.done[st.id] = (s.bps.done[st.id] || 0) + 1; }
    if (st.src !== 'grave') {
      const reward = ST.reward(def, sh);
      T.G.earn(reward);
      T.fx.complete(st, def, sh, reward, st.src === 'bp');
    }
    T.world.drawOutline(sh.cells, st.x, 0, s.flags.color ? '#2a2333' : '#2b2b2b');
    T.G.computeMult();
    // whoever helped cheers
    for (const e of T.ent.archs) {
      if (e.proj === st || Math.abs(e.x - (st.x + (sh.w * B) / 2)) < 260) {
        if (e.y === 0 && !e.held && !e.inside) { e.happyT = 2.2; if (e.vy === 0) e.vy = 170 + Math.random() * 100; }
        if (e.proj === st) e.proj = null;
        if (Math.random() < 0.3) e.bubble = { text: ['완성!', '와아', '♪♪', '멋져!', '해냈다'][Math.floor(Math.random() * 5)], t: 1.8 };
      }
    }
    // player blocks that were pushed behind stay behind; refresh so the outline is crisp
    if (s.player.length) T.G.redrawRange(st.x - B, st.x + sh.w * B + B);
    T.vil.onBuilt(st);
  }
  ST.reward = (def, sh) => sh.cells.length * T.G.bestValue() * T.TIERS[def.tier].mult * Math.pow(2, T.G.s.pup.blue || 0) * (1 + 0.25 * T.G.s.era);

  ST.drawStruct = function (st) {
    const sh = ST.shape(st);
    const done = ST.done(st);
    for (let i = 0; i < sh.cells.length; i++) if (done || st.f[i]) drawCell(st, i, done && i < (st.p || 0));
    if (done) T.world.drawOutline(sh.cells, st.x, 0, T.G.s.flags.color ? '#2a2333' : '#2b2b2b');
  };

  ST.remove = function (st, silent) {
    const s = T.G.s;
    const i = s.structs.indexOf(st);
    if (i < 0) return;
    s.structs.splice(i, 1);
    for (const e of T.ent.all()) { if (e.proj === st) e.proj = null; if (e.home === st) { e.home = null; if (e.d) e.d.home = 0; } }
    const sh = ST.shape(st);
    if (!silent) T.fx.demolish(st, sh);
    T.G.redrawRange(st.x - B, st.x + sh.w * B + B);
  };

  // painters: repaint the next n cells of a finished structure
  ST.paint = function (st, n) {
    const sh = ST.shape(st);
    const from = st.p || 0, to = Math.min(sh.cells.length, from + n);
    for (let i = from; i < to; i++) drawCell(st, i, true);
    st.p = to;
    if (to >= sh.cells.length) T.world.drawOutline(sh.cells, st.x, 0, '#2a2333');
    return to - from;
  };

  // ── player blueprints ────────────────────────────────────
  ST.available = function (def) {
    const s = T.G.s;
    if (def.hidden) return false;
    if (def.era > s.era) return false;
    if (def.era === 0 && def.tier <= 2) return def.tier <= T.G.maxSculptTier();
    if (def.tier === 4 && s.era < 2) return false;
    if (def.tier === 5 && s.era < 3) return false;
    return true;
  };
  ST.visible = function (def) {
    // hide everything that belongs to reset layers the player hasn't reached
    const s = T.G.s;
    if (def.hidden) return false;
    if (def.era === 0) return def.tier <= T.G.maxSculptTier() + 1;
    return s.flags.l4Done > 0 && def.era <= s.era + 1;
  };
  ST.activeBps = () => T.G.s.structs.filter((st) => st.src === 'bp' && !ST.done(st));
  ST.startPlacing = function (id) {
    if (ST.activeBps().length >= T.G.bpSlots()) {
      T.ui.toast(`동시에 펼칠 수 있는 설계도는 ${T.G.bpSlots()}개입니다.`);
      T.audio.deny();
      return false;
    }
    ST.placing = id;
    ST.seed = 1 + Math.floor(Math.random() * 9999);
    document.body.classList.add('placing');
    T.ui.placingHint(true, T.DEF[id].name);
    return true;
  };
  ST.cancel = function () {
    ST.placing = null;
    document.body.classList.remove('placing');
    T.ui.placingHint(false);
  };
  ST.ghostLeft = function (wx) {
    const sh = T.shapeOf(ST.placing, ST.seed);
    return Math.round((wx - (sh.w * B) / 2) / B) * B;
  };
  ST.check = function (id, seed, x) {
    const sh = T.shapeOf(id, seed);
    const ov = ST.overlaps(x - B, x + sh.w * B + B);
    const s = T.G.s;
    if (!ov.length) return { ok: true, ov };
    if (s.era < 1) return { ok: false, ov, why: '다른 건축물과 겹칩니다.' };
    if (ov.some((o) => !ST.done(o) && o.src === 'bp')) return { ok: false, ov, why: '짓고 있는 설계도와 겹칩니다.' };
    return { ok: true, ov, demolish: true, warn: ov.some((o) => o.src === 'bp') };
  };
  ST.confirm = function (wx) {
    const id = ST.placing, seed = ST.seed;
    const x = ST.ghostLeft(wx);
    const chk = ST.check(id, seed, x);
    if (!chk.ok) { T.ui.toast(chk.why); T.audio.deny(); return; }
    const go = () => {
      const st = ST.create(id, seed, x, 'bp');
      rt(st).t0 = performance.now();
      if (chk.demolish) { st.clearing = true; for (const o of chk.ov) o.condemned = st.uid; T.ui.toast('철거반이 먼저 자리를 비웁니다.'); }
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
  // demolition queue for the hammer pets
  ST.condemned = () => T.G.s.structs.filter((st) => st.condemned);
  ST.clearedCheck = function () {
    for (const st of T.G.s.structs) {
      if (!st.clearing) continue;
      if (!T.G.s.structs.some((o) => o.condemned === st.uid)) {
        // also sweep loose player blocks from the footprint
        const [a, b] = ST.bbox(st);
        const before = T.G.s.player.length;
        T.G.s.player = T.G.s.player.filter((p) => p[0] < a || p[0] > b);
        st.clearing = false;
        if (before !== T.G.s.player.length) T.G.redrawRange(a - B, b + B);
      }
    }
  };

  // ── render: ghosts, labels, plaques ──────────────────────
  const ghostCache = new Map();
  function ghostTex(id, seed, color, faint) {
    const key = id + '#' + seed + (color ? 'c' : 'g') + (faint ? 'f' : '');
    if (ghostCache.has(key)) return ghostCache.get(key);
    const sh = T.shapeOf(id, seed);
    const sc = 3, pad = 6;
    const cv = document.createElement('canvas');
    cv.width = sh.w * B * sc + pad * 2; cv.height = (sh.h + sh.sink) * B * sc + pad * 2;
    const ctx = cv.getContext('2d');
    const ink = faint ? (color ? 'rgba(90,80,70,0.45)' : 'rgba(90,90,90,0.4)') : color ? '#2f6fb0' : '#6a6a68';
    const set = new Set(sh.cells.map((c) => c.c + ',' + c.r));
    const X = (c) => pad + c * B * sc, Y = (r) => pad + (sh.h - r) * B * sc;
    ctx.strokeStyle = faint ? 'rgba(120,110,100,0.18)' : color ? 'rgba(47,111,176,0.32)' : 'rgba(90,90,90,0.26)';
    ctx.setLineDash([3, 3]); ctx.lineWidth = 1;
    if (!faint) for (const c of sh.cells) ctx.strokeRect(X(c.c) + 0.5, Y(c.r + 1) + 0.5, B * sc - 1, B * sc - 1);
    ctx.setLineDash([]);
    const rc = window.rough ? rough.canvas(cv) : null;
    for (const c of sh.cells) {
      const segs = [];
      if (!set.has(c.c + ',' + (c.r + 1))) segs.push([X(c.c), Y(c.r + 1), X(c.c + 1), Y(c.r + 1)]);
      if (!set.has(c.c + ',' + (c.r - 1))) segs.push([X(c.c), Y(c.r), X(c.c + 1), Y(c.r)]);
      if (!set.has(c.c - 1 + ',' + c.r)) segs.push([X(c.c), Y(c.r), X(c.c), Y(c.r + 1)]);
      if (!set.has(c.c + 1 + ',' + c.r)) segs.push([X(c.c + 1), Y(c.r), X(c.c + 1), Y(c.r + 1)]);
      for (const s of segs) {
        if (rc && !faint) rc.line(s[0], s[1], s[2], s[3], { stroke: ink, strokeWidth: 1.5, roughness: 0.9, bowing: 0.6, seed: 3 });
        else { ctx.strokeStyle = ink; ctx.lineWidth = faint ? 1 : 1.5; ctx.beginPath(); ctx.moveTo(s[0], s[1]); ctx.lineTo(s[2], s[3]); ctx.stroke(); }
      }
    }
    const out = { cv, sc, pad, sh };
    ghostCache.set(key, out);
    if (ghostCache.size > 300) ghostCache.delete(ghostCache.keys().next().value);
    return out;
  }
  function drawGhost(ctx, id, seed, x, reveal, alpha, faint, tint) {
    const color = T.G.s.flags.color;
    const g = ghostTex(id, seed, color, faint);
    const z = T.cam.z;
    const [sx, sy] = T.w2s(x, g.sh.h * B);
    const w = (g.cv.width / g.sc) * z, h = (g.cv.height / g.sc) * z;
    const px = sx - (g.pad / g.sc) * z, py = sy - (g.pad / g.sc) * z;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.imageSmoothingEnabled = true;
    if (reveal < 1) { ctx.beginPath(); ctx.rect(px - 4, py + h * (1 - reveal), w + 8, h * reveal + 4); ctx.clip(); }
    ctx.drawImage(g.cv, px, py, w, h);
    if (tint) { ctx.globalCompositeOperation = 'source-atop'; ctx.fillStyle = tint; ctx.fillRect(px, py, w, h); }
    ctx.restore();
    if (reveal < 1 && reveal > 0) {
      ctx.fillStyle = color ? 'rgba(47,111,176,0.8)' : 'rgba(60,60,60,0.7)';
      ctx.fillRect(px, py + h * (1 - reveal), w, Math.max(1, z));
    }
  }

  ST.render = function (ctx, now) {
    const s = T.G.s;
    const color = s.flags.color;
    const z = T.cam.z;
    const [vx0] = T.s2w(-50, 0), [vx1] = T.s2w(T.cam.W + 50, 0);
    for (const st of s.structs) {
      const [a, b, top] = ST.bbox(st);
      if (b < vx0 || a > vx1) continue;
      const def = ST.def(st);
      const sh = ST.shape(st);
      if (!ST.done(st)) {
        const bp = st.src === 'bp';
        const rv = bp ? T.easeInOut(T.clamp((now - rt(st).t0) / 1100, 0, 1)) : 1;
        drawGhost(ctx, st.id, st.seed, st.x, rv, bp ? (st.clearing ? 0.45 : 0.95) : 0.8, !bp);
        if (z > 0.4) {
          ctx.fillStyle = color ? 'rgba(47,111,176,0.16)' : 'rgba(80,80,80,0.12)';
          for (const i of rt(st).res) {
            const [cx, cy] = ST.cellPos(st, i);
            const [px, py] = T.w2s(cx - B / 2, cy + B / 2);
            ctx.fillRect(px, py, B * z, B * z);
          }
        }
        if (z > 0.3 && (bp || z > 0.9)) label(ctx, st.x + (sh.w * B) / 2, top, `${def.name}  ${st.n}/${sh.cells.length}${st.clearing ? '  철거 대기' : ''}`, st.n / sh.cells.length, bp, rv);
      } else if (st.src === 'bp' && z > 0.55) {
        plaque(ctx, st.x + (sh.w * B) / 2, def.name);
      }
      if (st.condemned && z > 0.3) {
        ctx.save();
        ctx.globalAlpha = 0.35 + Math.sin(now / 160) * 0.15;
        ctx.strokeStyle = '#c0392b'; ctx.lineWidth = 2; ctx.setLineDash([6, 4]);
        const [px, py] = T.w2s(a, top);
        ctx.strokeRect(px, py, (b - a) * z, top * z);
        ctx.restore();
      }
    }
    if (ST.placing && ST.ghostX !== null) {
      const x = ST.ghostLeft(ST.ghostX);
      const chk = ST.check(ST.placing, ST.seed, x);
      const tint = !chk.ok ? 'rgba(200,60,60,0.5)' : chk.demolish ? 'rgba(220,140,40,0.35)' : null;
      drawGhost(ctx, ST.placing, ST.seed, x, 1, 0.6 + Math.sin(now / 180) * 0.12, false, tint);
      const sh = T.shapeOf(ST.placing, ST.seed);
      const [px, py] = T.w2s(x, sh.h * B);
      ctx.fillStyle = !chk.ok ? 'rgba(200,60,60,0.08)' : color ? 'rgba(47,111,176,0.07)' : 'rgba(0,0,0,0.04)';
      ctx.fillRect(px, py, sh.w * B * z, sh.h * B * z);
    }
  };
  function label(ctx, x, top, text, k, bp, rv) {
    const color = T.G.s.flags.color;
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
  function plaque(ctx, x, name) {
    const color = T.G.s.flags.color;
    const z = T.cam.z;
    const [px, py] = T.w2s(x, 0);
    ctx.save();
    ctx.font = '9px Galmuri9, monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const tw = Math.ceil(ctx.measureText(name).width) + 10;
    ctx.fillStyle = color ? '#5c5470' : '#5a5a58';
    ctx.fillRect(Math.round(px - tw / 2), Math.round(py + 6 * z), tw, 13);
    ctx.fillStyle = color ? '#f4e9d8' : '#eeeeec';
    ctx.fillText(name, Math.round(px), Math.round(py + 6 * z + 7));
    ctx.restore();
  }

  // ── drafting sheet (modal) ───────────────────────────────
  ST.renderSheet = function (canvas, id, seed, locked) {
    const color = T.G.s.flags.color;
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
    const cs = Math.max(2, Math.floor(Math.min((W - margin * 2) / sh.w, (H - margin * 2) / rows)));
    const ox = Math.round((W - cs * sh.w) / 2), groundY = Math.round((H - cs * rows) / 2) + cs * sh.h - 4;
    const cx = (c) => ox + c * cs, cy = (r) => groundY - r * cs;
    const rc = window.rough ? rough.canvas(canvas) : null;
    const set = new Set(sh.cells.map((c) => c.c + ',' + c.r));
    const fills = { '#': 'hachure', '=': 'zigzag', x: 'cross-hatch', o: 'dots', a: 'dashed', l: 'dots' };
    if (locked) ctx.globalAlpha = 0.35;
    for (const c of sh.cells) {
      if (rc && cs >= 7) rc.rectangle(cx(c.c) + 1, cy(c.r + 1) + 1, cs - 2, cs - 2, { stroke: 'transparent', fill: line, fillStyle: fills[c.ch] || 'hachure', fillWeight: 0.55, hachureGap: Math.max(2.5, cs / 4), roughness: 0.6, seed: c.c * 31 + c.r + 99 });
      else { ctx.save(); ctx.globalAlpha *= 0.4; ctx.fillStyle = line; ctx.fillRect(cx(c.c) + 1, cy(c.r + 1) + 1, cs - 2, cs - 2); ctx.restore(); }
      if (cs >= 5) { ctx.strokeStyle = color ? 'rgba(232,241,250,0.25)' : 'rgba(0,0,0,0.18)'; ctx.lineWidth = 1; ctx.strokeRect(cx(c.c) + 0.5, cy(c.r + 1) + 0.5, cs - 1, cs - 1); }
    }
    ctx.strokeStyle = line;
    for (const c of sh.cells) {
      const segs = [];
      if (!set.has(c.c + ',' + (c.r + 1))) segs.push([cx(c.c), cy(c.r + 1), cx(c.c + 1), cy(c.r + 1)]);
      if (!set.has(c.c + ',' + (c.r - 1))) segs.push([cx(c.c), cy(c.r), cx(c.c + 1), cy(c.r)]);
      if (!set.has(c.c - 1 + ',' + c.r)) segs.push([cx(c.c), cy(c.r), cx(c.c), cy(c.r + 1)]);
      if (!set.has(c.c + 1 + ',' + c.r)) segs.push([cx(c.c + 1), cy(c.r), cx(c.c + 1), cy(c.r + 1)]);
      for (const sg of segs) {
        if (rc) rc.line(sg[0], sg[1], sg[2], sg[3], { stroke: line, strokeWidth: 1.6, roughness: 0.7, bowing: 0.5, seed: 7 });
        else { ctx.beginPath(); ctx.moveTo(sg[0], sg[1]); ctx.lineTo(sg[2], sg[3]); ctx.stroke(); }
      }
    }
    ctx.globalAlpha = 1;
    ctx.strokeStyle = line; ctx.fillStyle = line; ctx.lineWidth = 1;
    ctx.font = '11px Galmuri11, monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    dim(ctx, ox, cy(-sh.sink) + 20, ox + cs * sh.w, cy(-sh.sink) + 20, `${sh.w} 블럭`, paper);
    dim(ctx, ox + cs * sh.w + 22, cy(0), ox + cs * sh.w + 22, cy(sh.h), `${sh.h}`, paper, true);
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
