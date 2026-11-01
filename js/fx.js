'use strict';
// ─────────────────────────────────────────────────────────────
//  FX — 파티클, 완공 연출, 리셋 & 색의 탄생
// ─────────────────────────────────────────────────────────────
(function () {
  const parts = [];
  const effects = [];
  let lastText = 0;
  const FX = (T.fx = { parts, effects, busy: false });

  function add(p) { if (parts.length < 1500) parts.push(p); }
  const colorOn = () => T.G.s.flags.color;

  FX.dust = function (x, y, n = 3) {
    if (T.cam.z < 0.5) return;
    for (let i = 0; i < n; i++)
      add({ x: x + (Math.random() - 0.5) * 8, y: y + 1, vx: (Math.random() - 0.5) * 40, vy: 20 + Math.random() * 30, g: 120, life: 0.5, max: 0.5, kind: 'px', color: colorOn() ? '#b9b2a6' : '#bdbdba', size: 1.4 });
  };
  FX.sparkle = function (x, y, gold) {
    add({ x, y, vx: (Math.random() - 0.5) * 8, vy: 14, g: 0, life: 0.7, max: 0.7, kind: 'spark', color: gold ? '#ffe08a' : '#ffffff', size: 1.3 });
  };
  FX.hearts = function (x, y) {
    for (let i = 0; i < 3; i++)
      add({ x: x + (i - 1) * 7, y: y + i * 2, vx: (i - 1) * 10, vy: 30 + Math.random() * 15, g: -5, life: 1.1 + i * 0.15, max: 1.3, kind: 'heart', color: colorOn() ? '#ef6f91' : '#7a7a78', size: 1.1 });
  };
  FX.stars = function (x, y) {
    add({ x, y, vx: 0, vy: 0, g: 0, life: 2.2, max: 2.2, kind: 'orbit', color: colorOn() ? '#ffd166' : '#888', size: 1.2 });
  };
  FX.splash = function (x, y, col) {
    if (T.cam.z < 0.3) return;
    for (let i = 0; i < 4; i++)
      add({ x, y, vx: (Math.random() - 0.5) * 70, vy: Math.random() * 60, g: 160, life: 0.45, max: 0.45, kind: 'px', color: col, size: 1.6 });
  };
  FX.footprint = function (x, col) {
    if (T.cam.z < 0.5) return;
    add({ x, y: 0.5, vx: 0, vy: 0, g: 0, life: 3, max: 3, kind: 'foot', color: col, size: 1 });
  };
  FX.beam = function (x0, y0, x1, y1, color) {
    effects.push({ type: 'beam', x0, y0, x1, y1, color, t: 0, dur: 0.28 });
  };
  FX.landed = function (x, y, v, lucky, col) {
    const z = T.cam.z;
    if (z > 0.6 && Math.random() < 0.5) {
      for (let i = 0; i < 2; i++) add({ x, y: y + 3, vx: (Math.random() - 0.5) * 40, vy: 10 + Math.random() * 30, g: 90, life: 0.35, max: 0.35, kind: 'px', color: T.shade(col, 0.4), size: 1.2 });
    }
    const now = performance.now();
    if (lucky) {
      for (let i = 0; i < 8; i++) add({ x, y, vx: Math.cos(i) * 60, vy: Math.sin(i) * 60, g: 0, life: 0.6, max: 0.6, kind: 'spark', color: '#ffffff', size: 1.5 });
      floatText(x, y + 8, '+' + T.fmt(v), true);
    } else if (z > 0.7 && now - lastText > 140) {
      lastText = now;
      floatText(x, y + 6, '+' + T.fmt(v), false);
    }
  };
  function floatText(x, y, text, big) {
    add({ x, y, vx: 0, vy: 26, g: 0, life: 1.0, max: 1.0, kind: 'text', text, big, color: '#2b2b2b' });
  }
  FX.floatText = floatText;

  FX.update = function (dt) {
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.life -= dt;
      if (p.life <= 0) { parts.splice(i, 1); continue; }
      p.vy -= p.g * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.kind === 'px' && p.y < 0.5) { p.y = 0.5; p.vy = 0; p.vx *= 0.5; }
    }
    for (let i = effects.length - 1; i >= 0; i--) {
      const e = effects[i];
      e.t += dt;
      if (e.t >= e.dur) effects.splice(i, 1);
    }
  };

  const HEART = ['.x.x.', 'xxxxx', 'xxxxx', '.xxx.', '..x..'];
  FX.draw = function (ctx) {
    const z = T.cam.z;
    for (const p of parts) {
      const [sx, sy] = T.w2s(p.x, p.y);
      if (sx < -40 || sy < -40 || sx > T.cam.W + 40 || sy > T.cam.H + 40) continue;
      const a = T.clamp(p.life / p.max, 0, 1);
      const ps = Math.max(1, p.size * z);
      ctx.globalAlpha = p.kind === 'text' ? Math.min(1, a * 2) : a;
      switch (p.kind) {
        case 'px': case 'spark':
          ctx.fillStyle = p.color; ctx.fillRect(sx - ps / 2, sy - ps / 2, ps, ps);
          if (p.kind === 'spark') { ctx.fillRect(sx - ps * 1.5, sy - ps / 2, ps * 3, ps * 0.5); ctx.fillRect(sx - ps / 2, sy - ps * 1.5, ps * 0.5, ps * 3); }
          break;
        case 'foot':
          ctx.globalAlpha = a * 0.5;
          ctx.fillStyle = p.color; ctx.fillRect(sx - ps, sy - ps, ps * 2, ps);
          break;
        case 'heart':
          ctx.fillStyle = p.color;
          for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) if (HEART[r][c] === 'x') ctx.fillRect(sx + (c - 2.5) * ps, sy + (r - 2.5) * ps, ps, ps);
          break;
        case 'orbit': {
          ctx.fillStyle = p.color;
          for (let k = 0; k < 3; k++) {
            const an = (2.2 - p.life) * 7 + (k * Math.PI * 2) / 3;
            const ox = Math.cos(an) * 9 * z, oy = Math.sin(an) * 3 * z;
            ctx.fillRect(sx + ox - ps, sy + oy - ps * 0.5, ps * 2, ps); ctx.fillRect(sx + ox - ps * 0.5, sy + oy - ps, ps, ps * 2);
          }
          break;
        }
        case 'text':
          ctx.font = p.big ? '13px Galmuri11, monospace' : '10px Galmuri9, monospace';
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillStyle = p.big ? (colorOn() ? '#c48a00' : '#222') : 'rgba(40,40,40,0.75)';
          ctx.fillText(p.text, Math.round(sx), Math.round(sy));
          break;
        case 'ghost': {
          const [hx, hy] = [sx, sy - (1 - a) * 6];
          ctx.globalAlpha = a * 0.75;
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(hx - 5 * ps, hy - 9 * ps, 10 * ps, 8 * ps); ctx.fillRect(hx - 4 * ps, hy - 10 * ps, 8 * ps, ps);
          for (let k = 0; k < 3; k++) ctx.fillRect(hx - 5 * ps + k * 4 * ps, hy - ps, 2 * ps, ps * (1 + ((k + Math.floor(p.life * 6)) % 2)));
          ctx.fillStyle = '#555'; ctx.fillRect(hx - 3 * ps, hy - 7 * ps, ps, 2 * ps); ctx.fillRect(hx + 2 * ps, hy - 7 * ps, ps, 2 * ps);
          break;
        }
        case 'puff':
          ctx.globalAlpha = a * 0.5;
          ctx.fillStyle = p.color; ctx.fillRect(sx - ps, sy - ps, ps * 2, ps * 2);
          p.size *= 1.004;
          break;
        case 'confetti':
          ctx.fillStyle = p.color; ctx.fillRect(sx, sy, ps * 2, ps * 2);
          break;
      }
    }
    ctx.globalAlpha = 1;
    for (const e of effects) {
      const k = e.t / e.dur;
      if (e.type === 'beam') {
        const [a, b] = T.w2s(e.x0, e.y0), [c, d] = T.w2s(e.x1, e.y1);
        ctx.globalAlpha = 1 - k;
        ctx.strokeStyle = colorOn() ? e.color : '#ffffff';
        ctx.lineWidth = Math.max(1, 2 * z * (1 - k));
        ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(c, d); ctx.stroke();
        ctx.globalAlpha = 1;
      } else if (e.type === 'portal') {
        if (T.Z !== (e.z || 0)) continue;
        const zz = z * T.layerK(e.z);
        const [px, py] = T.w2s(e.x, 11);
        const open = k < 0.3 ? T.easeOut(k / 0.3) : k > 0.75 ? 1 - (k - 0.75) / 0.25 : 1;
        const P = Math.max(1, Math.round(zz)); // one portal pixel
        const rings = colorOn() ? ['#5e4b8b', '#8e7cc3', '#c3a6ff', '#efe6ff'] : ['#3a3a3a', '#6a6a68', '#9a9a97', '#e0e0de'];
        const RX = 7, RY = 12;
        for (let j = -RY; j <= RY; j++) {
          if (Math.abs(j) > RY * open) continue; // unfold from the middle scanline
          for (let i = -RX; i <= RX; i++) {
            const q = (i * i) / (RX * RX) + (j * j) / (RY * RY);
            if (q > 1) continue;
            const ring = Math.min(3, Math.floor((1 - q) * 4 + Math.sin(e.t * 18 + j * 0.7) * 0.4));
            if (ring === 3 && ((i + j + Math.floor(e.t * 20)) & 1)) continue; // dithered core
            ctx.fillStyle = rings[Math.max(0, ring)];
            ctx.fillRect(Math.round(px + i * P), Math.round(py + j * P), P, P);
          }
        }
        // stars: spiral inward on the way in, scatter outward on the way out
        ctx.fillStyle = colorOn() ? '#ffe08a' : '#ffffff';
        for (let n = 0; n < 8; n++) {
          const a = n * 0.785 + e.t * (e.dir === 'in' ? 7 : -5);
          const r = (e.dir === 'in' ? (1 - k) * 22 + 3 : k * 24 + 3) * zz;
          ctx.globalAlpha = 1 - k * 0.6;
          ctx.fillRect(Math.round(px + Math.cos(a) * r) - P, Math.round(py + Math.sin(a) * r * 0.8), P * 2, P); ctx.fillRect(Math.round(px + Math.cos(a) * r) - P / 2, Math.round(py + Math.sin(a) * r * 0.8) - P / 2, P, P * 2);
        }
        ctx.globalAlpha = 1;
      } else if (e.type === 'ring') {
        const [px, py] = T.w2s(e.x, e.y);
        const r = Math.round((4 + k * 7) * z);
        ctx.globalAlpha = 1 - k;
        ctx.fillStyle = colorOn() ? '#2f6fb0' : '#444';
        const t = Math.max(1, Math.round(z * 0.8));
        ctx.fillRect(Math.round(px - r), Math.round(py - r), r * 2, t); ctx.fillRect(Math.round(px - r), Math.round(py + r - t), r * 2, t);
        ctx.fillRect(Math.round(px - r), Math.round(py - r), t, r * 2); ctx.fillRect(Math.round(px + r - t), Math.round(py - r), t, r * 2);
        ctx.globalAlpha = 1;
      } else if (e.type === 'layer') {
        ctx.fillStyle = `rgba(255,255,255,${(1 - k) * 0.35})`; ctx.fillRect(0, 0, T.cam.W, T.cam.H);
      } else if (e.type === 'zone') {
        const [a] = T.w2s(e.x0, 0), [b, gy] = T.w2s(e.x1, 0);
        const g = ctx.createLinearGradient(0, gy - 120 * z * (1 - k), 0, gy);
        g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, colorOn() ? e.color : '#999');
        ctx.globalAlpha = (1 - k) * 0.35; ctx.fillStyle = g; ctx.fillRect(a, gy - 120 * z, b - a, 120 * z); ctx.globalAlpha = 1;
      } else if (e.type === 'sweep') {
        const [x0, y0] = T.w2s(e.x, e.y);
        const w = e.w * z, h = e.h * z;
        const ky = T.easeInOut(Math.min(1, k * 1.25));
        const yy = y0 - h * ky;
        const g = ctx.createLinearGradient(0, yy - 30 * z, 0, yy + 6 * z);
        g.addColorStop(0, 'rgba(255,255,255,0)');
        g.addColorStop(0.8, e.soft ? 'rgba(231,214,255,0.6)' : 'rgba(255,255,255,0.85)');
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.fillRect(x0 - 6 * z, yy - 30 * z, w + 12 * z, 36 * z);
        if (k > 0.75) {
          ctx.globalAlpha = (1 - k) * 4 * 0.6;
          ctx.strokeStyle = '#ffffff'; ctx.lineWidth = Math.max(2, 3 * z);
          ctx.strokeRect(x0 - 3 * z, y0 - h - 3 * z, w + 6 * z, h + 6 * z);
          ctx.globalAlpha = 1;
        }
      }
    }
  };

  // ── structure completion ─────────────────────────────────
  FX.complete = function (st, def, sh, reward, isBp) {
    const B = T.B;
    if (!isBp) { // builders' own works finish quietly
      for (let i = 0; i < 6; i++) add({ x: st.x + Math.random() * sh.w * B, y: (st.y || 0) + sh.h * B, vx: 0, vy: 18, g: 0, life: 0.9, max: 0.9, kind: 'spark', color: '#ffffff', size: 1.2 });
      return;
    }
    T.main.hitstop(0.09);
    effects.push({ type: 'sweep', x: st.x, y: st.y || 0, w: sh.w * B, h: sh.h * B, t: 0, dur: 1.1 });
    const cols = colorOn() ? ['#e9b872', '#e07a5f', '#81b29a', '#5b8fb9', '#b388eb', '#4ecdc4', '#ffd166'] : ['#2b2b2b', '#8a8a88', '#c8c8c5', '#ffffff'];
    setTimeout(() => { for (let i = 0; i < 60; i++) add({ x: st.x + Math.random() * sh.w * B, y: (st.y || 0) + sh.h * B + 10, vx: (Math.random() - 0.5) * 160, vy: 80 + Math.random() * 200, g: 260, life: 1.6 + Math.random(), max: 2.6, kind: 'confetti', color: cols[i % cols.length], size: 1.3 }); }, 650);
    T.audio.complete();
    setTimeout(() => T.ui.stamp(def, reward, (T.G.s.bps.done[def.id] || 0) <= 1), 500);
  };
  // a newcomer arrives: a little pixel smoke ring
  FX.poof = function (x, y) {
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; add({ x: x + Math.cos(a) * 6, y: y + Math.sin(a) * 6, vx: Math.cos(a) * 40, vy: Math.sin(a) * 40 + 10, g: 0, life: 0.6, max: 0.6, kind: 'puff', color: colorOn() ? '#f4ead6' : '#e4e4e2', size: 3 }); }
    for (let i = 0; i < 5; i++) add({ x, y, vx: (Math.random() - 0.5) * 60, vy: 40 + Math.random() * 40, g: 60, life: 0.7, max: 0.7, kind: 'spark', color: colorOn() ? '#ffd166' : '#ffffff', size: 1.3 });
  };
  // a cell snaps into place: a tiny pixel ring
  FX.snapRing = function (x, y) {
    effects.push({ type: 'ring', x, y, t: 0, dur: 0.32, z: T.view() });
  };
  // all blocks placed, waiting for 톡톡: a soft shimmer instead of the big stamp
  FX.frameDone = function (st, sh) {
    const B = T.B;
    effects.push({ type: 'sweep', x: st.x, y: st.y || 0, w: sh.w * B, h: sh.h * B, t: 0, dur: 0.8, soft: true });
    for (let i = 0; i < 10; i++) add({ x: st.x + Math.random() * sh.w * B, y: (st.y || 0) + Math.random() * sh.h * B, vx: 0, vy: 14, g: 0, life: 0.9, max: 0.9, kind: 'spark', color: colorOn() ? '#e7d6ff' : '#ffffff', size: 1.2 });
    if (st.src === 'bp') T.ui.toast(`「${T.DEF[st.id].name}」 골조 완성. 톡톡 주민이 ${T.RES_NAME[T.st.needRes(st)]}까지 다듬으면 완공됩니다.`);
  };
  FX.demolish = function (st, sh) {
    const B = T.B;
    for (let i = 0; i < Math.min(60, sh.blocks.length); i++) {
      const k = Math.floor(Math.random() * sh.blocks.length), c = sh.blocks[k];
      add({ x: st.x + c.c * B + B / 2, y: Math.max(1, (st.y || 0) + c.r * B), vx: (Math.random() - 0.5) * 140, vy: 40 + Math.random() * 160, g: 380, life: 0.9 + Math.random() * 0.5, max: 1.4, kind: 'px', color: T.st.tint(T.st.blockColor(st, k), false), size: 2.4 });
    }
    for (let i = 0; i < 18; i++) add({ x: st.x + Math.random() * sh.w * B, y: 2, vx: (Math.random() - 0.5) * 60, vy: 10 + Math.random() * 30, g: -10, life: 1.6, max: 1.6, kind: 'puff', color: colorOn() ? '#d8cfc0' : '#cfcfcc', size: 6 + Math.random() * 6 });
    T.audio.thunk();
  };
  FX.debris = function (x, y, col) {
    if (T.cam.z < 0.3) return;
    for (let i = 0; i < 4; i++) add({ x, y, vx: (Math.random() - 0.5) * 120, vy: 30 + Math.random() * 120, g: 380, life: 0.8, max: 0.8, kind: 'px', color: col, size: 2 });
    add({ x, y, vx: 0, vy: 12, g: -6, life: 1, max: 1, kind: 'puff', color: colorOn() ? '#d8cfc0' : '#cfcfcc', size: 5 });
  };
  FX.chips = function (x, y, col) {
    if (T.cam.z < 0.35) return;
    for (let i = 0; i < 3; i++) add({ x: x + (Math.random() - 0.5) * 6, y: y + (Math.random() - 0.5) * 6, vx: (Math.random() - 0.5) * 90, vy: 30 + Math.random() * 70, g: 300, life: 0.5, max: 0.5, kind: 'px', color: Math.random() < 0.5 ? '#ffffff' : col, size: 1 });
  };
  // pixel portal: dithered purple ovals unfold from a scanline; stars spiral in ('in') or burst out ('out')
  FX.portal = function (x, z, dir = 'in') {
    effects.push({ type: 'portal', x, z, dir, t: 0, dur: dir === 'in' ? 0.75 : 0.65 });
  };
  FX.layerOpen = function () { effects.push({ type: 'layer', t: 0, dur: 1.6 }); };
  FX.banner = function (title, sub) {
    const el = T.h(`<div class="banner"><b>${title}</b><span>${sub}</span></div>`);
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add('in'));
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 700); }, 4200);
  };
  FX.ghost = function (x, y) {
    add({ x, y, vx: 0, vy: 22, g: 0, life: 3.2, max: 3.2, kind: 'ghost', color: '#ffffff', size: 1.2 });
    for (let i = 0; i < 10; i++) add({ x: x + (Math.random() - 0.5) * 16, y: y + Math.random() * 10, vx: (Math.random() - 0.5) * 10, vy: 20 + Math.random() * 30, g: 0, life: 2.4, max: 2.4, kind: 'spark', color: '#fffbe8', size: 1.2 });
  };
  FX.tear = function (x, y) { add({ x, y, vx: 0, vy: -10, g: 160, life: 0.6, max: 0.6, kind: 'px', color: '#8ecae6', size: 1.3 }); };
  FX.zoneBorn = function (z) {
    effects.push({ type: 'zone', x0: z.x0, x1: z.x1, color: (T.ZONES[z.type] || T.ZONES.park).color, t: 0, dur: 1.4 });
  };

  // ── UI layer: pixel particles over the panels (screen space) ──
  const uip = [];
  let uicv = null, uictx = null;
  function uiCanvas() {
    if (uicv) return uictx;
    uicv = document.createElement('canvas'); uicv.id = 'uifx';
    document.body.appendChild(uicv);
    const fit = () => { uicv.width = innerWidth; uicv.height = innerHeight; };
    fit(); addEventListener('resize', fit);
    uictx = uicv.getContext('2d');
    return uictx;
  }
  const UIPAL = () => (colorOn() ? ['#ffd166', '#ef6f91', '#81b29a', '#5b8fb9', '#ffffff', '#e9b872'] : ['#2b2b2b', '#8a8a88', '#ffffff', '#5a5a58']);
  function uiAdd(p) { if (uip.length < 600) uip.push(p); }
  // little pixel sparks out of a button (k = how many were bought)
  FX.uiBurst = function (el, k = 1) {
    if (!el || !el.getBoundingClientRect) return;
    uiCanvas();
    const r = el.getBoundingClientRect(), pal = UIPAL();
    const n = Math.min(26, 6 + k * 2);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, sp = 60 + Math.random() * 120;
      uiAdd({ x: r.left + r.width * (0.2 + Math.random() * 0.6), y: r.top + r.height / 2, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60, g: 380, life: 0.5 + Math.random() * 0.3, max: 0.8, s: Math.random() < 0.3 ? 3 : 2, c: pal[i % pal.length], kind: Math.random() < 0.25 ? 'plus' : 'px' });
    }
    if (k > 1) uiAdd({ x: r.left + r.width / 2, y: r.top - 4, vx: 0, vy: -34, g: 0, life: 0.9, max: 0.9, s: 1, c: colorOn() ? '#c48a00' : '#2b2b2b', kind: 'text', text: `×${k}` });
  };
  // a panel row lights up once
  FX.rowFlash = function (el) { if (!el) return; el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); };
  // a roster tile: white pixel frame flash, a +n badge and three stars
  FX.tileLevel = function (el, n, delay = 0) {
    if (!el) return;
    setTimeout(() => {
      uiCanvas();
      el.classList.remove('lvflash'); void el.offsetWidth; el.classList.add('lvflash');
      const r = el.getBoundingClientRect(), pal = UIPAL();
      uiAdd({ x: r.left + r.width / 2, y: r.top + 4, vx: 0, vy: -30, g: 0, life: 1, max: 1, s: 1, c: colorOn() ? '#c48a00' : '#2b2b2b', kind: 'text', text: `+${n}` });
      for (let i = 0; i < 3; i++) uiAdd({ x: r.left + r.width / 2, y: r.top + r.height / 2, vx: (i - 1) * 50, vy: -80 - Math.random() * 40, g: 260, life: 0.7, max: 0.7, s: 2, c: pal[i], kind: 'star' });
    }, delay);
  };
  // fly a currency icon from a point to the HUD row
  FX.flyTo = function (fromX, fromY, toEl, color, n = 8) {
    uiCanvas();
    const r = toEl && toEl.getBoundingClientRect ? toEl.getBoundingClientRect() : { left: 40, top: 60, width: 10, height: 10 };
    for (let i = 0; i < n; i++) uiAdd({ x: fromX + (Math.random() - 0.5) * 40, y: fromY + (Math.random() - 0.5) * 30, tx: r.left + 12, ty: r.top + r.height / 2, t: -i * 0.05, life: 1.2, max: 1.2, s: 4, c: color, kind: 'fly' });
  };
  FX.drawUI = function (dt) {
    if (!uicv) return;
    const g = uictx;
    g.clearRect(0, 0, uicv.width, uicv.height);
    for (let i = uip.length - 1; i >= 0; i--) {
      const p = uip[i];
      p.life -= dt;
      if (p.life <= 0) { uip.splice(i, 1); continue; }
      if (p.kind === 'fly') {
        p.t += dt; if (p.t < 0) continue;
        const k = T.easeInOut(Math.min(1, p.t / 0.8));
        const x = T.lerp(p.x, p.tx, k), y = T.lerp(p.y, p.ty, k) - Math.sin(k * Math.PI) * 60;
        g.globalAlpha = 1; g.fillStyle = p.c; g.fillRect(Math.round(x) - 2, Math.round(y) - 2, 4, 4); g.fillStyle = '#ffffff'; g.fillRect(Math.round(x) - 2, Math.round(y) - 2, 1, 1);
        continue;
      }
      p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt;
      const a = T.clamp(p.life / p.max, 0, 1);
      g.globalAlpha = a;
      g.fillStyle = p.c;
      const x = Math.round(p.x), y = Math.round(p.y), s = p.s;
      if (p.kind === 'text') { g.font = '11px Galmuri11, monospace'; g.textAlign = 'center'; g.fillText(p.text, x, y); }
      else if (p.kind === 'plus' || p.kind === 'star') { g.fillRect(x - s, y, s * 3, s); g.fillRect(x, y - s, s, s * 3); }
      else g.fillRect(x, y, s, s);
    }
    g.globalAlpha = 1;
  };

  // ── reset sequences ──────────────────────────────────────
  const seq = () => document.getElementById('seq');
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  function anim(ms, fn) {
    return new Promise((res) => {
      const t0 = performance.now();
      function step(now) {
        const k = Math.min(1, (now - t0) / ms);
        fn(k);
        if (k < 1) requestAnimationFrame(step); else res();
      }
      requestAnimationFrame(step);
    });
  }

  FX.reset = async function (n) {
    if (FX.busy) return;
    FX.busy = true;
    const L = T.G.L[n];
    const firstColor = n === 3 && !T.G.s.flags.color;
    const firstPainter = n === 4 && !T.G.s.flags.l4Done;
    const firstSettle = n === 6 && !T.G.s.flags.l6Done;
    const firstSplit = n === 2 && !T.G.s.flags.l2Done;
    const firstLayer = n === 5 && !T.G.s.flags.l5Done;
    if (n <= 3 && T.G.s.settings.skip[n] && !firstColor) {
      // milestone-unlocked quick reset: no curtain, just a flash
      const gain = T.G.applyReset(n);
      FX.flash();
      T.ui.rebuildPanel();
      T.ui.toast(`${L.name}: ${L.cur} +${T.fmt(gain)}`);
      T.audio.reset();
      FX.busy = false;
      return;
    }
    const el = seq();
    el.innerHTML = '';
    el.className = 'seq on';
    T.audio.reset();
    // dissolve: blocks rise as motes while screen whitens
    await anim(900, (k) => { el.style.background = `rgba(250,250,248,${T.easeInOut(k)})`; });
    const gain = T.G.applyReset(n);
    T.ui.rebuildPanel();
    if (firstColor) {
      await colorReveal(el, gain);
    } else if (firstSettle) {
      await sunrise(el, gain);
    } else {
      const card = T.h(`<div class="seq-title"><div class="seq-kicker">${['', 'RECONSTRUCT', 'SPLIT', 'REFRACTION', 'TINCTURE', 'LAYERS', 'SETTLEMENT'][n]}</div><div class="seq-name">${L.name}</div><div class="seq-gain"><i class="ic ic-${L.icon}"></i> ${L.cur} +${T.fmt(gain)}</div></div>`);
      el.appendChild(card);
      await wait(60);
      card.classList.add('in');
      await wait(1500);
      card.classList.remove('in');
      card.classList.add('out');
      await anim(1000, (k) => { el.style.background = `rgba(250,250,248,${1 - T.easeInOut(k)})`; });
    }
    el.className = 'seq';
    el.innerHTML = '';
    el.style.background = '';
    FX.busy = false;
    if (firstPainter) T.ui.introPainter();
    if (firstSettle) T.ui.introVillage();
    if (firstSplit) T.ui.introSplit();
    if (firstLayer) T.ui.introLayers();
    T.ui.afterReset(n);
  };

  // pixel scene helper: draw on a tiny canvas, blit it up with crisp pixels
  function pixelStage(el) {
    const W = innerWidth, H = innerHeight;
    const lw = 200, lh = Math.round((200 * H) / W);
    const lo = document.createElement('canvas'); lo.width = lw; lo.height = lh;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H; cv.className = 'seq-canvas';
    el.appendChild(cv);
    const out = cv.getContext('2d');
    const g = lo.getContext('2d');
    return { g, lw, lh, cv, blit() { out.imageSmoothingEnabled = false; out.clearRect(0, 0, W, H); out.drawImage(lo, 0, 0, W, H); } };
  }
  function blitShape(g, id, seed, x, groundY, scale, res = 8) {
    const sh = T.shapeOf(id, seed);
    sh.blocks.forEach((b, i) => {
      const cols = sh.colorAt(i, res), sub = 8 / res;
      cols.forEach((c, k) => { if (!c) return; const ii = k % res, jj = Math.floor(k / res); g.fillStyle = c; g.fillRect(Math.round(x + (b.c * 8 + ii * sub) * scale), Math.round(groundY - ((b.r + 1) * 8 - jj * sub) * scale), Math.ceil(sub * scale), Math.ceil(sub * scale)); });
    });
    return sh;
  }
  // first settlement: night falls, then the first dawn breaks over the first hut
  async function sunrise(el, gain) {
    const st = pixelStage(el);
    const { g, lw, lh } = st;
    const stars = Array.from({ length: 50 }, () => [Math.random() * lw, Math.random() * lh * 0.6]);
    const scene = (k) => {
      for (let y = 0; y < lh; y++) {
        const f = y / lh;
        const night = T.clamp(1 - k * 1.6, 0, 1);
        const top = [20 + (1 - night) * 120, 24 + (1 - night) * 150, 56 + (1 - night) * 170];
        const bot = [36 + (1 - night) * 219, 34 + (1 - night) * 150, 60 + (1 - night) * 60];
        const band = Math.floor(f * 10) / 10; // stepped bands = pixel sky
        g.fillStyle = `rgb(${top.map((v, i) => Math.round(v + (bot[i] - v) * band)).join(',')})`;
        g.fillRect(0, y, lw, 1);
      }
      g.fillStyle = '#fffbe8';
      for (const [x, y] of stars) if (Math.random() > k * 1.4) g.fillRect(Math.round(x), Math.round(y), 1, 1);
      const sy = lh * 0.78 - Math.max(0, k - 0.35) * lh * 0.6;
      if (k > 0.3) { g.fillStyle = '#ffd36b'; for (let dy = -9; dy <= 9; dy++) { const w = Math.round(Math.sqrt(81 - dy * dy)); g.fillRect(Math.round(lw / 2 + 30 - w), Math.round(sy + dy), w * 2, 1); } }
      const gy = Math.round(lh * 0.78);
      g.fillStyle = k < 0.45 ? '#20232f' : '#6f9b4f'; g.fillRect(0, gy, lw, lh - gy);
      g.fillStyle = k < 0.45 ? '#2a2d3b' : '#8fc06a'; g.fillRect(0, gy, lw, 1);
      blitShape(g, 'hut', 2, lw / 2 - 30, gy, 0.75, k < 0.5 ? 1 : k < 0.65 ? 2 : k < 0.8 ? 4 : 8);
      if (k < 0.55) { g.fillStyle = `rgba(255,190,90,${0.5 + Math.sin(k * 40) * 0.2})`; g.fillRect(Math.round(lw / 2 - 30 + 18), gy - 8, 4, 6); }
      st.blit();
    };
    await anim(4200, (k) => scene(k));
    const card = T.h(`<div class="seq-title light"><div class="seq-kicker">SETTLEMENT</div><div class="seq-name">정착</div><div class="seq-gain"><i class="ic ic-lantern"></i> 등불 +${T.fmt(gain)}</div><div class="seq-sub">첫 지붕 아래에서, 마을이 시작됩니다.</div></div>`);
    el.appendChild(card);
    await wait(60); card.classList.add('in');
    await wait(2200);
    card.classList.add('out');
    await anim(1200, (k) => { st.cv.style.opacity = String(1 - k); el.style.background = `rgba(250,250,248,${1 - T.easeInOut(k)})`; });
  }
  FX.flash = function () {
    const el = T.h('<div class="flash"></div>');
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add('go'));
    setTimeout(() => el.remove(), 700);
  };

  FX.milestone = async function () {
    if (FX.busy) return;
    const s = T.G.s;
    const m = T.MILESTONES[s.ms];
    if (!m || !T.G.msReady()) return;
    FX.busy = true;
    const el = seq();
    el.innerHTML = ''; el.className = 'seq on';
    T.audio.milestone();
    await anim(500, (k) => { el.style.background = `rgba(30,30,32,${0.55 * T.easeOut(k)})`; });
    T.G.claimMilestone();
    T.ui.rebuildPanel(true);
    const card = T.h(`<div class="seq-title ms"><div class="ms-stone"></div><div class="seq-kicker">MILESTONE ${s.ms}</div><div class="seq-name small">${m.name}</div><div class="seq-sub">${m.reward}</div></div>`);
    el.appendChild(card);
    await wait(40); card.classList.add('in');
    await wait(1900);
    card.classList.add('out');
    await anim(700, (k) => { el.style.background = `rgba(30,30,32,${0.55 * (1 - k)})`; });
    el.className = 'seq'; el.innerHTML = ''; el.style.background = '';
    FX.busy = false;
    if (s.ms === T.MILESTONES.length) setTimeout(() => FX.credits(), 600);
  };

  FX.era = async function () {
    if (FX.busy || !T.G.eraReady()) return;
    FX.busy = true;
    const el = seq();
    el.innerHTML = ''; el.className = 'seq on era';
    const stg = pixelStage(el);
    const { g, lw, lh } = stg;
    T.audio.era();
    const nextEra = T.G.s.era + 1;
    const house = { 2: 'stonehouse', 3: 'timberhouse', 4: 'townhouse' }[nextEra] || 'hut';
    const clock = (k, a) => {
      g.clearRect(0, 0, lw, lh);
      g.fillStyle = `rgba(40,32,24,${a})`; g.fillRect(0, 0, lw, lh);
      g.globalAlpha = a;
      const cx = Math.round(lw / 2), cy = Math.round(lh * 0.38), R = 18;
      g.fillStyle = '#f2e6cf';
      for (let i = 0; i < 360; i += 2) { const an = (i / 180) * Math.PI; g.fillRect(Math.round(cx + Math.cos(an) * R), Math.round(cy + Math.sin(an) * R), 1, 1); }
      for (let i = 0; i < 12; i++) { const an = (i / 12) * Math.PI * 2; g.fillRect(Math.round(cx + Math.cos(an) * (R - 3)), Math.round(cy + Math.sin(an) * (R - 3)), 1, 1); }
      const spin = k * k * 60;
      const hand = (len, an) => { for (let r = 0; r <= len; r++) g.fillRect(Math.round(cx + Math.cos(an) * r), Math.round(cy + Math.sin(an) * r), 1, 1); };
      hand(R - 5, spin - Math.PI / 2); g.fillStyle = '#ffd166'; hand(R - 9, spin / 12 - Math.PI / 2);
      const gy = Math.round(lh * 0.86);
      g.fillStyle = '#4a3c2e'; g.fillRect(0, gy, lw, lh - gy);
      // the next era's house rises out of the ground as time spins
      g.save(); g.beginPath(); g.rect(0, 0, lw, gy); g.clip();
      blitShape(g, house, 4, cx - 18, gy + Math.round((1 - T.easeOut(k)) * 50), 0.6, k < 0.4 ? 1 : k < 0.6 ? 2 : k < 0.8 ? 4 : 8);
      g.restore();
      g.globalAlpha = 1;
      stg.blit();
    };
    await anim(1200, (k) => clock(k * 0.3, k));
    await anim(2200, (k) => clock(0.3 + k * 0.7, 1));
    T.G.advanceEra();
    T.ui.rebuildPanel(true);
    const era = T.ERAS[T.G.s.era];
    const card = T.h(`<div class="seq-title light"><div class="seq-kicker">${['', '', 'SECOND', 'THIRD', 'FOURTH'][T.G.s.era]} AGE</div><div class="seq-name">${era.name}</div><div class="seq-sub">${era.sub}</div></div>`);
    el.appendChild(card);
    await wait(40); card.classList.add('in');
    await wait(2400);
    card.classList.add('out');
    await anim(1100, (k) => clock(1, 1 - k));
    el.className = 'seq'; el.innerHTML = ''; el.style.background = '';
    FX.busy = false;
    T.ui.toast(`새 시대: ${era.name}. 새로운 설계도와 구역이 열렸습니다.`, 'big');
  };

  FX.credits = function () {
    const s = T.G.s;
    s.flags.credits = true;
    const el = T.h(`<div class="credits-roll">
      <div class="cr-scroll">
        <img class="cr-logo" src="docs/rednebula-logo.png" alt="Red Nebula">
        <div class="cr-title">TESSERA</div>
        <div class="cr-sub">작은 건축가들</div>
        <div class="cr-sec"><small>기획, 디자인, 개발</small><b>Red Nebula</b></div>
        <div class="cr-sec"><small>함께 만든</small><b>Claude</b></div>
        <div class="cr-sec"><small>건축가</small><b>네모, 세모, 동그라미, 오각, 별, 육각</b></div>
        <div class="cr-sec"><small>채색</small><b>방울</b></div>
        <div class="cr-sec"><small>다듬기</small><b>톡톡</b></div>
        <div class="cr-sec"><small>철거</small><b>쿵쿵</b></div>
        <div class="cr-sec"><small>겹 건너기</small><b>폴짝</b></div>
        <div class="cr-sec"><small>마을 사람들</small><b>지금까지 태어나고 떠난 모든 주민</b></div>
        <div class="cr-sec"><small>글꼴</small><b>Galmuri by Quiple (SIL OFL 1.1)</b></div>
        <div class="cr-sec"><small>도면 선</small><b>Rough.js by Preet Shihn (MIT)</b></div>
        <div class="cr-sec"><small>효과음</small><b>ZzFX by Frank Force (MIT)</b></div>
        <div class="cr-end">플레이해 주셔서 고맙습니다.</div>
      </div>
      <div class="cr-parade"></div>
      <div class="cr-hint">클릭하면 닫힙니다</div>
    </div>`);
    const parade = el.querySelector('.cr-parade');
    ['square', 'triangle', 'circle', 'pentagon', 'star', 'hexagon', 'chisel', 'drop', 'demo', 'portal'].forEach((k, i) => {
      const c = T.sprites.portrait(k, s.flags.color || true, 3, i % 2 ? 'happy' : 'normal');
      c.style.animationDelay = `${-i * 1.2}s`;
      parade.appendChild(c);
    });
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add('in'));
    T.audio.reveal();
    el.addEventListener('click', () => { el.classList.remove('in'); setTimeout(() => el.remove(), 700); });
  };

  FX._pixelStage = (el) => pixelStage(el);
  FX._blitShape = (...a) => blitShape(...a);
  FX._sunrise = (el, gain) => sunrise(el, gain);
  FX._colorReveal = (el, gain) => colorReveal(el, gain);
  FX._anim = anim; FX._wait = wait;
  async function colorReveal(el, gain) {
    const veil = document.getElementById('veil');
    const cv = document.createElement('canvas');
    const W = innerWidth, H = innerHeight;
    cv.width = W; cv.height = H;
    cv.className = 'seq-canvas';
    el.appendChild(cv);
    const ctx = cv.getContext('2d');
    const cx = W / 2, cy = H / 2 - 20;
    veil.classList.remove('gone');
    veil.style.webkitMaskImage = veil.style.maskImage = 'none';
    await wait(30);
    document.body.classList.add('color');
    T.sprites.clear();
    T.ui.rebuildPanel();
    const hues = [0, 30, 55, 120, 200, 240, 280];
    const drawScene = (beamK, fanK, white) => {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = `rgba(250,250,248,${white})`;
      ctx.fillRect(0, 0, W, H);
      const s = 46;
      // incoming white beam
      if (beamK > 0) {
        const bx0 = -20, by0 = cy + 160;
        const bx = T.lerp(bx0, cx - s * 0.45, beamK), by = T.lerp(by0, cy, beamK);
        ctx.strokeStyle = '#3a3a3a'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(bx0, by0); ctx.lineTo(bx, by); ctx.stroke();
      }
      // fan
      if (fanK > 0) {
        for (let i = 0; i < hues.length; i++) {
          const a0 = -0.28 + i * 0.075, a1 = a0 + 0.075;
          const len = Math.max(W, H) * 1.2 * T.easeOut(fanK);
          ctx.fillStyle = T.hsl(hues[i], 80, 58);
          ctx.beginPath();
          ctx.moveTo(cx + s * 0.35, cy);
          ctx.lineTo(cx + s * 0.35 + Math.cos(a0) * len, cy + Math.sin(a0) * len);
          ctx.lineTo(cx + s * 0.35 + Math.cos(a1) * len, cy + Math.sin(a1) * len);
          ctx.closePath(); ctx.fill();
        }
      }
      // prism
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.strokeStyle = '#2b2b2b'; ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx, cy - s); ctx.lineTo(cx + s * 0.9, cy + s * 0.6); ctx.lineTo(cx - s * 0.9, cy + s * 0.6); ctx.closePath();
      ctx.fill(); ctx.stroke();
    };
    const setHole = (r) => {
      const m = `radial-gradient(circle at ${cx}px ${cy}px, transparent ${r}px, black ${r + 90}px)`;
      veil.style.webkitMaskImage = m; veil.style.maskImage = m;
    };
    setHole(0);
    await anim(700, (k) => drawScene(0, 0, 1));
    T.audio.unlock();
    await anim(900, (k) => drawScene(T.easeInOut(k), 0, 1));
    T.audio.reveal();
    await anim(1200, (k) => { drawScene(1, k, 1); setHole(T.easeOut(k) * 70); });
    const cap = T.h(`<div class="seq-caption">빛이 갈라졌습니다.<br><b>세상에 색이 생겼습니다.</b></div>`);
    el.appendChild(cap);
    requestAnimationFrame(() => cap.classList.add('in'));
    await wait(900);
    const R = Math.hypot(W, H);
    await anim(2600, (k) => {
      const e = T.easeInOut(k);
      setHole(70 + e * R);
      drawScene(1, 1, 1 - T.clamp((k - 0.2) / 0.8, 0, 1));
      cv.style.opacity = String(1 - T.clamp((k - 0.55) / 0.45, 0, 1));
    });
    veil.classList.add('gone');
    await wait(1400);
    cap.classList.add('out');
    await wait(700);
    T.ui.toast(`프리즘 +${T.fmt(gain)}, 새로운 공간: 프리즘 실험실`, 'big');
  }
})();
