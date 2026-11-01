'use strict';
// ─────────────────────────────────────────────────────────────
//  FXSEQ: 리셋 6종, 시대 전환, 이정표 연출 (v4)
//  공통 흐름: 화면 스냅샷 → 리셋마다 고유한 변형 → 카드(획득량 카운트업) → 화폐가 HUD로 날아감 → 새 회차
// ─────────────────────────────────────────────────────────────
(function () {
  const FX = T.fx;
  const seqEl = () => document.getElementById('seq');
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const anim = (ms, fn) => new Promise((res) => { const t0 = performance.now(); const step = (now) => { const k = Math.min(1, (now - t0) / ms); fn(k, now); if (k < 1) requestAnimationFrame(step); else res(); }; requestAnimationFrame(step); });
  const color = () => T.G.s.flags.color;
  const ease = T.easeInOut, eout = T.easeOut;
  const R = (a, b) => a + Math.random() * (b - a);
  const PAL = () => (color() ? ['#e8b86d', '#df7a5e', '#8fb996', '#6c96c4', '#b49ad8', '#5fbfb6', '#ffd166'] : ['#2b2b2b', '#6f6f6c', '#9a9a97', '#c8c8c5']);
  const PAPER = () => (color() ? '#fffdf8' : '#fafaf8');
  const INK = () => (color() ? '#2d2a32' : '#2b2b2b');

  // full-screen stage canvas + a snapshot of the world as it was
  function stage(el) {
    const W = innerWidth, H = innerHeight;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H; cv.className = 'seq-canvas';
    el.appendChild(cv);
    const g = cv.getContext('2d'); g.imageSmoothingEnabled = false;
    const snap = document.createElement('canvas'); snap.width = W; snap.height = H;
    const src = document.getElementById('cv');
    if (src) snap.getContext('2d').drawImage(src, 0, 0, W, H);
    return { cv, g, W, H, snap };
  }
  // the gain card: kicker, name, a count-up, then the currency flies to the HUD
  async function card(el, kicker, name, L, gain, sub, light) {
    const c = T.h(`<div class="seq-title ${light ? 'light' : ''}"><div class="seq-kicker">${kicker}</div><div class="seq-name">${name}</div><div class="seq-gain"><i class="ic ic-${L ? L.icon : 'shard'}"></i> ${L ? L.cur : ''} +<em>0</em></div>${sub ? `<div class="seq-sub">${sub}</div>` : ''}</div>`);
    el.appendChild(c);
    await wait(40); c.classList.add('in');
    const em = c.querySelector('em');
    T.audio.play('count');
    await anim(900, (k) => { em.textContent = T.fmt(gain * eout(k)); });
    em.textContent = T.fmt(gain);
    const r = em.getBoundingClientRect();
    const key = L ? ['', 'vertices', 'grains', 'prisms', 'pigments', 'folds', 'lanterns'][L.id] : 'shards';
    const row = document.querySelector(`[data-c=${key}]`) || document.getElementById('cur');
    FX.flyTo(r.left + r.width / 2, r.top + r.height / 2, row, PAL()[L ? L.id % PAL().length : 0], 10);
    await wait(1100);
    c.classList.remove('in'); c.classList.add('out');
    return c;
  }
  async function fadeOut(el, st, ms = 700) {
    await anim(ms, (k) => { el.style.background = `rgba(250,250,248,${1 - ease(k)})`; if (st) st.cv.style.opacity = String(1 - k); });
  }
  const KICK = ['', 'RECONSTRUCT', 'REFINE', 'REFRACTION', 'TINCTURE', 'LAYERS', 'SETTLEMENT'];

  // ── 1 재구성: the world breaks into tiles that spiral into a vertex ──
  async function sceneReconstruct(el, st, apply) {
    const { g, W, H, snap } = st;
    const ts = 24, cx = W / 2, cy = H / 2;
    const tiles = [];
    for (let y = 0; y < H; y += ts) for (let x = 0; x < W; x += ts) tiles.push({ x, y, d: Math.random() * 0.45, r: Math.hypot(x - cx, y - cy) });
    tiles.sort((a, b) => b.r - a.r);
    await anim(1500, (k) => {
      g.fillStyle = PAPER(); g.fillRect(0, 0, W, H);
      for (const t of tiles) {
        const p = T.clamp((k - t.d * (1 - t.r / Math.hypot(cx, cy))) / 0.55, 0, 1);
        if (p >= 1) continue;
        const e = p * p;
        const a0 = Math.atan2(t.y + ts / 2 - cy, t.x + ts / 2 - cx), r0 = t.r;
        const an = a0 + e * 2.2, rr = r0 * (1 - e);
        const sc = 1 - e * 0.85;
        const x = cx + Math.cos(an) * rr - (ts * sc) / 2, y = cy + Math.sin(an) * rr - (ts * sc) / 2;
        g.globalAlpha = 1 - e * 0.5;
        g.drawImage(snap, t.x, t.y, ts, ts, Math.round(x), Math.round(y), Math.ceil(ts * sc), Math.ceil(ts * sc));
      }
      g.globalAlpha = 1;
      if (k > 0.55) vertex(g, cx, cy, (k - 0.55) / 0.45, false);
    });
    T.audio.play('vertex');
    const gain = apply();
    await anim(600, (k) => { g.fillStyle = PAPER(); g.fillRect(0, 0, W, H); g.globalAlpha = 1 - k; vertex(g, cx, cy, 1, true, k); g.globalAlpha = 1; });
    return gain;
  }
  function vertex(g, cx, cy, k, burst, b = 0) {
    const s = 6, n = Math.round(14 * eout(Math.min(1, k)));
    g.fillStyle = color() ? '#df7a5e' : INK();
    for (let row = 0; row < n; row++) { const w = row * 2 + 1; for (let i = 0; i < w; i++) if (row === n - 1 || i === 0 || i === w - 1 || n < 14) g.fillRect(Math.round(cx + (i - row) * s - s / 2), Math.round(cy - 40 + row * s), s, s); }
    if (burst) { g.globalAlpha = 1 - b; g.fillStyle = INK(); for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2, r = 40 + b * 160; g.fillRect(Math.round(cx + Math.cos(a) * r), Math.round(cy + 2 + Math.sin(a) * r), s, s); } g.globalAlpha = 1; }
  }

  // ── 2 다듬기: three chisel taps split a block 1 → 2×2 → 4×4 → 8×8, the pieces fly off along the grain ──
  async function sceneRefine(el, st, apply) {
    const { g, W, H, snap } = st;
    const S = Math.min(W, H) * 0.3, x0 = Math.round(W / 2 - S / 2), y0 = Math.round(H / 2 - S / 2);
    const base = color() ? ['#bdb3a3', '#a99e8d', '#cfc6b6', '#8f8578'] : ['#bdbdba', '#a5a5a2', '#cfcfcc', '#8a8a87'];
    const draw = (res, gap, crack) => {
      g.fillStyle = PAPER(); g.fillRect(0, 0, W, H);
      g.globalAlpha = 0.18; g.drawImage(snap, 0, 0); g.globalAlpha = 1;
      const c = S / res;
      for (let j = 0; j < res; j++) for (let i = 0; i < res; i++) {
        const ox = (i - (res - 1) / 2) * gap, oy = (j - (res - 1) / 2) * gap;
        g.fillStyle = base[(i * 7 + j * 3 + res) % base.length];
        g.fillRect(Math.round(x0 + i * c + ox), Math.round(y0 + j * c + oy), Math.ceil(c), Math.ceil(c));
        g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(Math.round(x0 + i * c + ox), Math.round(y0 + j * c + oy), Math.ceil(c), Math.max(1, Math.round(c / 8)));
      }
      if (crack > 0) { g.fillStyle = INK(); for (let k = 0; k < 8 * crack; k++) g.fillRect(Math.round(W / 2 + R(-S / 2, S / 2)), Math.round(H / 2 + R(-S / 2, S / 2)), 3, 3); }
    };
    const chisel = (k) => { const x = x0 + S + 30 - k * 24, y = y0 - 30 + k * 24; g.fillStyle = color() ? '#7b5537' : '#5a5a58'; g.fillRect(Math.round(x), Math.round(y), 10, 34); g.fillStyle = color() ? '#56606b' : '#8a8a87'; g.fillRect(Math.round(x) - 2, Math.round(y) + 30, 14, 10); };
    await anim(400, (k) => draw(1, 0, 0));
    let res = 1;
    for (let hit = 0; hit < 3; hit++) {
      await anim(260, (k) => { draw(res, 0, 0); chisel(Math.sin(k * Math.PI)); });
      T.audio.play('chip'); T.main.hitstop(0.05);
      const next = res * 2;
      await anim(360, (k) => draw(next, eout(k) * (6 - hit * 2), 1 - k));
      res = next;
    }
    T.audio.play('grain');
    const gain = apply();
    const c = S / 8;
    const pieces = []; for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++) pieces.push({ x: x0 + i * c, y: y0 + j * c, vx: (i - 3.5) * R(20, 60), vy: (j - 3.5) * R(10, 40) - R(40, 120), col: base[(i + j) % base.length] });
    await anim(900, (k) => {
      g.fillStyle = PAPER(); g.fillRect(0, 0, W, H);
      for (const p of pieces) { const t = k * 1.2; g.globalAlpha = 1 - k; g.fillStyle = p.col; g.fillRect(Math.round(p.x + p.vx * t), Math.round(p.y + p.vy * t + 300 * t * t), Math.ceil(c), Math.ceil(c)); if (k > 0.2) { g.fillRect(Math.round(p.x + p.vx * t - p.vx * 0.08), Math.round(p.y + p.vy * t + 300 * t * t + c / 2), Math.ceil(c * 1.6), 1); } }
      g.globalAlpha = 1;
    });
    return gain;
  }

  // ── 3 굴절 (again): a beam crosses the screen through a prism, the spectrum sweeps by ──
  async function sceneRefract(el, st, apply) {
    const { g, W, H, snap } = st;
    const cx = W / 2, cy = H / 2;
    const hues = [0, 30, 55, 120, 200, 240, 280];
    const prism = () => { g.fillStyle = 'rgba(255,255,255,.95)'; g.strokeStyle = INK(); g.lineWidth = 3; g.beginPath(); g.moveTo(cx, cy - 40); g.lineTo(cx + 36, cy + 24); g.lineTo(cx - 36, cy + 24); g.closePath(); g.fill(); g.stroke(); };
    await anim(500, (k) => { g.fillStyle = PAPER(); g.fillRect(0, 0, W, H); g.globalAlpha = 0.25 * (1 - k); g.drawImage(snap, 0, 0); g.globalAlpha = 1; prism(); g.strokeStyle = INK(); g.lineWidth = 2; g.beginPath(); g.moveTo(0, cy + 120); g.lineTo(T.lerp(0, cx - 14, ease(k)), T.lerp(cy + 120, cy, ease(k))); g.stroke(); });
    T.audio.play('prism');
    const gain = apply();
    await anim(1100, (k) => {
      g.fillStyle = PAPER(); g.fillRect(0, 0, W, H);
      g.strokeStyle = INK(); g.lineWidth = 2; g.beginPath(); g.moveTo(0, cy + 120); g.lineTo(cx - 14, cy); g.stroke();
      const len = Math.max(W, H) * 1.3 * eout(k), sweep = -0.35 + k * 0.5;
      for (let i = 0; i < hues.length; i++) { const a0 = sweep + i * 0.06, a1 = a0 + 0.06; g.fillStyle = T.hsl(hues[i], 78, 60); g.globalAlpha = 1 - Math.max(0, k - 0.6) * 2.5; g.beginPath(); g.moveTo(cx + 14, cy); g.lineTo(cx + 14 + Math.cos(a0) * len, cy + Math.sin(a0) * len); g.lineTo(cx + 14 + Math.cos(a1) * len, cy + Math.sin(a1) * len); g.closePath(); g.fill(); }
      g.globalAlpha = 1; prism();
    });
    return gain;
  }

  // ── 4 물들임: paint drops fall, splash, and dithered rings of colour bloom and overlap ──
  async function sceneTincture(el, st, apply) {
    const { g, W, H, snap } = st;
    const lw = 240, lh = Math.round((240 * H) / W);
    const lo = document.createElement('canvas'); lo.width = lw; lo.height = lh; const lg = lo.getContext('2d');
    const pal = color() ? ['#df7a5e', '#e8b86d', '#8fb996', '#6c96c4', '#b49ad8', '#ef6f91'] : ['#3a3a3a', '#6f6f6c', '#9a9a97'];
    const drops = Array.from({ length: 9 }, (_, i) => ({ x: R(0.1, 0.9) * lw, y: R(0.35, 0.8) * lh, t: i * 0.08 + R(0, 0.05), c: pal[i % pal.length] }));
    const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
    let gain = 0, applied = false;
    await anim(2200, (k) => {
      lg.fillStyle = PAPER(); lg.fillRect(0, 0, lw, lh);
      lg.globalAlpha = 0.2 * (1 - k); lg.drawImage(snap, 0, 0, lw, lh); lg.globalAlpha = 1;
      for (const d of drops) {
        const tf = (k - d.t) / 0.18;
        if (tf < 0) continue;
        if (tf < 1) { const y = T.lerp(-6, d.y, tf * tf); lg.fillStyle = d.c; lg.fillRect(Math.round(d.x), Math.round(y), 2, 3); lg.fillRect(Math.round(d.x), Math.round(y) - 1, 1, 1); continue; }
        if (!d.hit) { d.hit = 1; T.audio.play('drip'); }
        const r = (k - d.t - 0.18) * lw * 0.55;
        // dithered disc: denser near the middle
        for (let y = Math.max(0, Math.floor(d.y - r)); y < Math.min(lh, d.y + r); y++) for (let x = Math.max(0, Math.floor(d.x - r)); x < Math.min(lw, d.x + r); x++) {
          const q = Math.hypot(x - d.x, y - d.y) / r; if (q > 1) continue;
          if ((1 - q) * 16 > BAYER[(y % 4) * 4 + (x % 4)] * 0.9) { lg.fillStyle = d.c; lg.fillRect(x, y, 1, 1); }
        }
      }
      if (!applied && k > 0.55) { applied = true; gain = apply(); }
      g.imageSmoothingEnabled = false; g.drawImage(lo, 0, 0, W, H);
    });
    return gain;
  }

  // ── 5 겹치기: the world is copied into sheets that recede in depth, then slam together ──
  async function sceneLayers(el, st, apply) {
    const { g, W, H, snap } = st;
    const N = 5;
    const drawSheets = (spread, slam) => {
      g.fillStyle = PAPER(); g.fillRect(0, 0, W, H);
      for (let i = N - 1; i >= 0; i--) {
        const d = i * spread;
        const sc = 1 - 0.11 * d, lift = d * 38;
        const w = W * sc * 0.82, h = H * sc * 0.82;
        const x = Math.round(W / 2 - w / 2), y = Math.round(H / 2 - h / 2 - lift);
        g.globalAlpha = 1 - d * 0.16;
        g.drawImage(snap, x, y, Math.round(w), Math.round(h));
        g.fillStyle = color() ? `rgba(236,238,242,${d * 0.14})` : `rgba(240,240,238,${d * 0.14})`; g.fillRect(x, y, Math.round(w), Math.round(h));
        g.strokeStyle = INK(); g.lineWidth = 2; g.strokeRect(x + 0.5, y + 0.5, Math.round(w), Math.round(h));
      }
      g.globalAlpha = 1;
      if (slam > 0) { g.fillStyle = `rgba(255,255,255,${slam})`; g.fillRect(0, 0, W, H); }
    };
    await anim(1300, (k) => drawSheets(eout(k), 0));
    await wait(200);
    T.audio.play('slam');
    await anim(260, (k) => drawSheets(1 - k * k, 0));
    T.main.hitstop(0.08);
    const gain = apply();
    await anim(500, (k) => drawSheets(0, 1 - k * 0.6));
    return gain;
  }

  // ── 6 정착 (again): darkness, then lanterns light one by one along a path ──
  async function sceneSettle(el, st, apply) {
    const { g, W, H } = st;
    const lw = 240, lh = Math.round((240 * H) / W);
    const lo = document.createElement('canvas'); lo.width = lw; lo.height = lh; const lg = lo.getContext('2d');
    const gy = Math.round(lh * 0.72);
    const posts = Array.from({ length: 9 }, (_, i) => Math.round(18 + i * ((lw - 36) / 8)));
    let gain = 0, applied = false, lit = 0;
    await anim(2600, (k) => {
      lg.fillStyle = '#141826'; lg.fillRect(0, 0, lw, lh);
      for (let i = 0; i < 40; i++) { lg.fillStyle = (i * 7 + Math.floor(k * 9)) % 5 ? '#3a4060' : '#fff6d8'; lg.fillRect((i * 53) % lw, (i * 29) % Math.round(lh * 0.6), 1, 1); }
      lg.fillStyle = '#20232f'; lg.fillRect(0, gy, lw, lh - gy);
      lg.fillStyle = '#4a3c2e'; lg.fillRect(0, gy + 6, lw, 4);
      const n = Math.floor(T.clamp((k - 0.1) / 0.75, 0, 1) * posts.length);
      if (n > lit) { lit = n; T.audio.play('lamp', { i: n }); }
      posts.forEach((x, i) => {
        lg.fillStyle = '#5b3f2c'; lg.fillRect(x, gy - 14, 1, 14); lg.fillRect(x - 1, gy - 15, 3, 1);
        if (i < n) {
          const gl = lg.createRadialGradient(x, gy - 17, 0, x, gy - 17, 14); gl.addColorStop(0, 'rgba(255,200,110,.6)'); gl.addColorStop(1, 'rgba(255,200,110,0)');
          lg.fillStyle = gl; lg.fillRect(x - 14, gy - 31, 28, 28);
          lg.fillStyle = '#ffd36b'; lg.fillRect(x - 1, gy - 18, 3, 3);
          lg.fillStyle = 'rgba(255,200,110,.25)'; lg.fillRect(x - 6, gy + 6, 13, 4);
        } else { lg.fillStyle = '#3a3a44'; lg.fillRect(x - 1, gy - 18, 3, 3); }
      });
      if (!applied && k > 0.7) { applied = true; gain = apply(); }
      g.imageSmoothingEnabled = false; g.drawImage(lo, 0, 0, W, H);
    });
    return gain;
  }

  const SCENES = [null, sceneReconstruct, sceneRefine, sceneRefract, sceneTincture, sceneLayers, sceneSettle];

  FX.reset = async function (n, opts = {}) {
    if (FX.busy) return;
    const s = T.G.s, L = T.G.L[n], preview = !!opts.preview;
    const first = (k) => (preview ? !!opts.first && n === k : !s.flags['l' + k + 'Done']);
    const firstColor = n === 3 && (preview ? !!opts.first : !s.flags.color);
    const firstSettle = n === 6 && first(6);
    const flags = { painter: n === 4 && first(4), split: n === 2 && first(2), layer: n === 5 && first(5), settle: firstSettle };
    const apply = () => (preview ? Math.max(1, L.gain(s)) || 3 : T.G.applyReset(n));
    FX.busy = true;
    T.hideTip && T.hideTip();
    if (!preview && n <= 3 && s.settings.skip[n] && !firstColor) {
      // quick reset (milestone setting): no curtain, a flash and the currency flying home
      const gain = apply();
      FX.flash();
      T.ui.rebuildPanel();
      const row = document.querySelector(`[data-c=${['', 'vertices', 'grains', 'prisms'][n]}]`);
      FX.flyTo(innerWidth / 2 - 170, innerHeight / 2, row, PAL()[n], 8);
      T.ui.toast(`${L.name}: ${L.cur} +${T.fmt(gain)}`);
      T.audio.play('resetQuick');
      FX.busy = false;
      return;
    }
    const el = seqEl();
    el.innerHTML = ''; el.className = 'seq on'; el.style.background = 'transparent';
    T.audio.duck(true);
    T.audio.play('reset' + n);
    let gain = 0;
    if (firstColor || firstSettle) {
      // the two big firsts keep their own scenes
      await anim(900, (k) => { el.style.background = `rgba(250,250,248,${ease(k)})`; });
      gain = apply();
      T.ui.rebuildPanel();
      if (firstColor && !preview) await FX._colorReveal(el, gain);
      else if (firstSettle) await FX._sunrise(el, gain);
      else await card(el, KICK[n], L.name, L, gain);
      if (preview && firstColor) await fadeOut(el, null);
    } else {
      const st = stage(el);
      el.style.background = 'rgba(250,250,248,1)';
      gain = await SCENES[n](el, st, () => { const g = apply(); if (!preview) T.ui.rebuildPanel(); return g; });
      await card(el, KICK[n], L.name, L, gain, null, n === 6);
      await fadeOut(el, st);
    }
    el.className = 'seq'; el.innerHTML = ''; el.style.background = '';
    T.audio.duck(false);
    FX.busy = false;
    if (preview) return;
    if (flags.painter) T.ui.introPainter();
    if (flags.settle) T.ui.introVillage();
    if (flags.split) T.ui.introSplit();
    if (flags.layer) T.ui.introLayers();
    T.ui.afterReset(n);
  };

  // ── 시대 전환: record → time flows → the chronicle turns a page → the new ground spreads ──
  FX.era = async function (opts = {}) {
    const preview = !!opts.preview;
    if (FX.busy || (!preview && !T.G.eraReady())) return;
    FX.busy = true;
    T.hideTip && T.hideTip();
    const s = T.G.s;
    const fromEra = s.era, toEra = Math.min(4, s.era + 1);
    const el = seqEl();
    el.innerHTML = ''; el.className = 'seq on era'; el.style.background = 'transparent';
    const st = stage(el);
    const { g, W, H, snap } = st;
    T.audio.duck(true);
    T.audio.play('era');
    // 1. the village fades into a sepia record in a frame
    const fw = Math.round(W * 0.56), fh = Math.round(H * 0.5), fx = Math.round(W / 2 - fw / 2), fy = Math.round(H * 0.18);
    const sep = document.createElement('canvas'); sep.width = fw; sep.height = fh;
    const sg = sep.getContext('2d'); sg.imageSmoothingEnabled = false;
    sg.drawImage(snap, W * 0.08, H * 0.25, W * 0.84, H * 0.7, 0, 0, fw, fh);
    try { const id = sg.getImageData(0, 0, fw, fh), d = id.data; for (let i = 0; i < d.length; i += 4) { const y = 0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2]; d[i] = Math.min(255, y * 1.07 + 18); d[i + 1] = y * 0.95 + 8; d[i + 2] = y * 0.78; } sg.putImageData(id, 0, 0); } catch (e) { /* tainted */ }
    const frame = (k, sky) => {
      g.fillStyle = sky; g.fillRect(0, 0, W, H);
      g.fillStyle = '#5b3f2c'; g.fillRect(fx - 10, fy - 10, fw + 20, fh + 20);
      g.fillStyle = '#e2b23c'; g.fillRect(fx - 6, fy - 6, fw + 12, fh + 12);
      g.globalAlpha = k; g.drawImage(sep, fx, fy); g.globalAlpha = 1;
      g.fillStyle = '#5b3f2c'; g.font = '14px Galmuri11, monospace'; g.textAlign = 'center';
      g.fillText(`제${fromEra}시대 · ${T.ERAS[fromEra].name}`, W / 2, fy + fh + 34);
    };
    await anim(1200, (k) => { g.drawImage(snap, 0, 0); g.globalAlpha = ease(k); frame(1, '#f2e6cf'); g.globalAlpha = 1; });
    // 2. three quick days pass behind the frame
    await anim(2200, (k) => {
      const d = (k * 3) % 1, night = (1 - Math.cos(d * Math.PI * 2)) / 2;
      const dusk = Math.max(0, 1 - Math.abs(night - 0.5) * 4) * 0.6;
      const sky = `rgb(${Math.round(242 - 200 * night + 20 * dusk)},${Math.round(230 - 190 * night - 40 * dusk)},${Math.round(207 - 130 * night - 60 * dusk)})`;
      frame(1, sky);
      g.fillStyle = night > 0.5 ? '#f4f1de' : '#ffd36b';
      const ax = W * (0.1 + 0.8 * d), ay = H * (0.16 - Math.sin(d * Math.PI) * 0.1);
      g.fillRect(Math.round(ax) - 6, Math.round(ay) - 6, 12, 12);
      if (night > 0.4) { g.fillStyle = '#fff6d8'; for (let i = 0; i < 30; i++) g.fillRect((i * 97 + Math.floor(k * 40) * 3) % W, (i * 41) % Math.round(H * 0.15), 2, 2); }
    });
    // 3. the chronicle page turns: the new era's title page with its house sharpening from 1 to 8 bit
    if (!preview) T.G.advanceEra();
    T.ui.rebuildPanel(true);
    const era = T.ERAS[toEra];
    const house = { 2: 'stonehouse', 3: 'timberhouse', 4: 'townhouse' }[toEra] || 'hut';
    const lw = 200, lh = Math.round((200 * H) / W);
    const lo = document.createElement('canvas'); lo.width = lw; lo.height = lh; const lg = lo.getContext('2d');
    T.audio.play('page');
    await anim(1600, (k) => {
      const turn = ease(Math.min(1, k * 1.6));
      g.fillStyle = '#e9dcc2'; g.fillRect(0, 0, W, H);
      // new page underneath
      lg.fillStyle = '#f4ead6'; lg.fillRect(0, 0, lw, lh);
      const gy = Math.round(lh * 0.66);
      const fl = { 2: '#a8987f', 3: '#9c9184', 4: '#8d8378' }[toEra] || '#7cbf5a';
      lg.fillStyle = fl; lg.fillRect(Math.round(lw * 0.25), gy, Math.round(lw * 0.5), 3);
      for (let i = 0; i < 20; i++) lg.fillRect(Math.round(lw * 0.25 + i * 5), gy + 3, 3, 1);
      const res = k < 0.45 ? 1 : k < 0.6 ? 2 : k < 0.75 ? 4 : 8;
      FX._blitShape(lg, house, 4, lw / 2 - 22, gy, 0.7, res);
      g.imageSmoothingEnabled = false; g.drawImage(lo, 0, 0, W, H);
      // the old page lifts away to the left
      const pw = W * (1 - turn);
      if (pw > 2) { g.fillStyle = '#f2e6cf'; g.fillRect(0, 0, pw, H); g.globalAlpha = 1 - turn; frame(1, 'rgba(0,0,0,0)'); g.globalAlpha = 1; g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(Math.round(pw) - 6, 0, 6, H); }
    });
    const c = T.h(`<div class="seq-title era-title"><div class="seq-kicker">${['', 'FIRST', 'SECOND', 'THIRD', 'FOURTH'][toEra]} AGE</div><div class="seq-name">${era.name}</div><div class="seq-sub">${era.sub}</div><div class="era-seal">제${toEra}시대</div></div>`);
    el.appendChild(c);
    await wait(40); c.classList.add('in');
    T.audio.play('stamp');
    await wait(2200);
    c.classList.add('out');
    // 4. back to the world: the new ground spreads out from the centre like a wave
    await anim(1000, (k) => {
      g.clearRect(0, 0, W, H);
      const r = ease(k) * W * 0.6;
      g.fillStyle = '#e9dcc2'; g.fillRect(0, 0, W / 2 - r, H); g.fillRect(W / 2 + r, 0, W / 2 - r, H);
      g.fillStyle = color() ? '#e2b23c' : '#888'; g.fillRect(Math.round(W / 2 - r) - 4, 0, 4, H); g.fillRect(Math.round(W / 2 + r), 0, 4, H);
    });
    el.className = 'seq'; el.innerHTML = ''; el.style.background = '';
    T.audio.duck(false);
    FX.busy = false;
    if (!preview) T.ui.toast(`새 시대: ${era.name}. 새로운 설계도와 구역이 열렸습니다.`, 'big');
  };

  // ── 이정표: a stone pillar rises, the rewards are dealt as cards one by one ──
  FX.milestone = async function (opts = {}) {
    const preview = !!opts.preview;
    if (FX.busy) return;
    const s = T.G.s;
    const idx = preview ? Math.max(0, s.ms - 1) : s.ms;
    const m = T.MILESTONES[idx];
    if (!m || (!preview && !T.G.msReady())) return;
    FX.busy = true;
    T.hideTip && T.hideTip();
    const el = seqEl();
    el.innerHTML = ''; el.className = 'seq on ms-seq'; el.style.background = 'transparent';
    T.audio.duck(true);
    await anim(380, (k) => { el.style.background = `rgba(30,28,34,${0.62 * eout(k)})`; });
    if (!preview) { T.G.claimMilestone(); T.ui.rebuildPanel(true); }
    const box = T.h(`<div class="ms-show"><div class="ms-pillar"><div class="msp-top"></div><div class="msp-body"><b>${idx + 1}</b></div><div class="msp-base"></div></div>
      <div class="ms-title"><small>MILESTONE ${idx + 1}</small><b>${m.name}</b></div><div class="ms-cards"></div><button class="btn primary ms-ok">확인</button></div>`);
    el.appendChild(box);
    await wait(30); box.classList.add('in');
    T.audio.play('pillar');
    T.main.hitstop(0.06);
    await wait(650);
    const cards = box.querySelector('.ms-cards');
    const RWI = { mult: 'star4', up: 'up', feat: 'gear', unlock: 'lock', cap: 'house', bp: 'grid' };
    const RWN = { mult: '배율', up: '업그레이드', feat: '기능', unlock: '해금', cap: '자리', bp: '설계도' };
    for (let i = 0; i < m.rewards.length; i++) {
      const r = m.rewards[i];
      const c = T.h(`<div class="msc msc-${r.k}"><div class="msc-ic">${T.icon(RWI[r.k])}</div><small>${RWN[r.k]}</small><span>${r.t}</span></div>`);
      cards.appendChild(c);
      await wait(20); c.classList.add('in');
      T.audio.play('reward', { i });
      await wait(260);
    }
    const ok = box.querySelector('.ms-ok');
    ok.classList.add('in');
    await new Promise((res) => { const t = setTimeout(res, 4200 + m.rewards.length * 300); ok.addEventListener('click', () => { clearTimeout(t); res(); }, { once: true }); });
    // cards fly toward the tab they unlocked, which then shows NEW
    box.querySelectorAll('.msc').forEach((c, i) => { const r = m.rewards[i]; const tab = r.tab && document.querySelector(`.tab[data-name="${({ work: '작업장', v: '공방', s: '석공소', p: '실험실', g: '아틀리에', z: '층계', l: '등불', auto: '물자', bp: '설계도' })[r.tab] || ''}"]`); const rc = c.getBoundingClientRect(); if (tab) FX.flyTo(rc.left + rc.width / 2, rc.top + rc.height / 2, tab, PAL()[i % PAL().length], 5); });
    box.classList.add('out');
    await anim(500, (k) => { el.style.background = `rgba(30,28,34,${0.62 * (1 - k)})`; });
    el.className = 'seq'; el.innerHTML = ''; el.style.background = '';
    T.audio.duck(false);
    FX.busy = false;
    if (!preview && s.ms === T.MILESTONES.length) setTimeout(() => FX.credits(), 600);
  };
})();
