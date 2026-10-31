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
  FX.sparkle = function (x, y) {
    add({ x, y, vx: 0, vy: 14, g: 0, life: 0.7, max: 0.7, kind: 'spark', color: '#ffffff', size: 1.3 });
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
        g.addColorStop(0.8, 'rgba(255,255,255,0.85)');
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
    if (isBp) T.main.hitstop(0.09);
    effects.push({ type: 'sweep', x: st.x, y: 0, w: sh.w * B, h: sh.h * B, t: 0, dur: 1.1 });
    const cols = colorOn() ? ['#e9b872', '#e07a5f', '#81b29a', '#5b8fb9', '#b388eb', '#4ecdc4', '#ffd166'] : ['#2b2b2b', '#8a8a88', '#c8c8c5', '#ffffff'];
    const n = isBp ? 60 : 22;
    setTimeout(() => {
      for (let i = 0; i < n; i++) add({ x: st.x + Math.random() * sh.w * B, y: sh.h * B + 10, vx: (Math.random() - 0.5) * 160, vy: 80 + Math.random() * 200, g: 260, life: 1.6 + Math.random(), max: 2.6, kind: 'confetti', color: cols[i % cols.length], size: 1.3 });
    }, 650);
    if (isBp || def.tier >= 2) { T.audio.complete(); setTimeout(() => T.ui.stamp(def, reward, isBp && (T.G.s.bps.done[def.id] || 0) <= 1), 500); }
    else { T.audio.unlock(); floatText(st.x + (sh.w * B) / 2, sh.h * B + 14, `${def.name} 완성  +${T.fmt(reward)}`, true); }
  };
  FX.demolish = function (st, sh) {
    const B = T.B;
    for (let i = 0; i < Math.min(80, sh.cells.length); i++) {
      const c = sh.cells[Math.floor(Math.random() * sh.cells.length)];
      add({ x: st.x + c.c * B + B / 2, y: Math.max(1, c.r * B), vx: (Math.random() - 0.5) * 140, vy: 40 + Math.random() * 160, g: 380, life: 0.9 + Math.random() * 0.5, max: 1.4, kind: 'px', color: T.st.colorOf(c.ch, false), size: 2.4 });
    }
    for (let i = 0; i < 18; i++) add({ x: st.x + Math.random() * sh.w * B, y: 2, vx: (Math.random() - 0.5) * 60, vy: 10 + Math.random() * 30, g: -10, life: 1.6, max: 1.6, kind: 'puff', color: colorOn() ? '#d8cfc0' : '#cfcfcc', size: 6 + Math.random() * 6 });
    T.audio.thunk();
  };
  FX.ghost = function (x, y) {
    add({ x, y, vx: 0, vy: 22, g: 0, life: 3.2, max: 3.2, kind: 'ghost', color: '#ffffff', size: 1.2 });
    for (let i = 0; i < 10; i++) add({ x: x + (Math.random() - 0.5) * 16, y: y + Math.random() * 10, vx: (Math.random() - 0.5) * 10, vy: 20 + Math.random() * 30, g: 0, life: 2.4, max: 2.4, kind: 'spark', color: '#fffbe8', size: 1.2 });
  };
  FX.tear = function (x, y) { add({ x, y, vx: 0, vy: -10, g: 160, life: 0.6, max: 0.6, kind: 'px', color: '#8ecae6', size: 1.3 }); };
  FX.zoneBorn = function (z) {
    effects.push({ type: 'zone', x0: z.x0, x1: z.x1, color: (T.ZONES[z.type] || T.ZONES.park).color, t: 0, dur: 1.4 });
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
    const firstColor = n === 2 && !T.G.s.flags.color;
    const firstPainter = n === 3 && !T.G.s.flags.painter;
    const firstSettle = n === 4 && !T.G.s.flags.l4Done;
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
      const card = T.h(`<div class="seq-title"><div class="seq-kicker">${['', 'RECONSTRUCT', 'REFRACTION', 'TINCTURE', 'SETTLEMENT'][n]}</div><div class="seq-name">${L.name}</div><div class="seq-gain"><i class="ic ic-${L.icon}"></i> ${L.cur} +${T.fmt(gain)}</div></div>`);
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
    T.ui.afterReset(n);
  };

  // first settlement: a night falls, then the first dawn over a village-to-be
  async function sunrise(el, gain) {
    const cv = document.createElement('canvas');
    const W = innerWidth, H = innerHeight;
    cv.width = W; cv.height = H; cv.className = 'seq-canvas';
    el.appendChild(cv);
    const ctx = cv.getContext('2d');
    const scene = (k) => {
      const g = ctx.createLinearGradient(0, 0, 0, H);
      const top = k < 0.5 ? T.hsl(232, 40, 12 + k * 20) : T.hsl(220 - (k - 0.5) * 60, 50, 22 + (k - 0.5) * 120);
      const bot = k < 0.5 ? T.hsl(240, 30, 18 + k * 10) : T.hsl(30, 80, 40 + (k - 0.5) * 70);
      g.addColorStop(0, top); g.addColorStop(1, bot);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      const sunY = H * 0.78 - Math.max(0, k - 0.45) * H * 0.5;
      ctx.fillStyle = '#ffe3a3'; ctx.globalAlpha = T.clamp((k - 0.4) * 3, 0, 1);
      ctx.beginPath(); ctx.arc(W / 2, sunY, 46, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
      ctx.fillStyle = k < 0.5 ? '#1d1f2e' : T.hsl(30, 25, 18 + (k - 0.5) * 30);
      ctx.fillRect(0, H * 0.78, W, H);
      // a little hut silhouette
      const hx = W / 2 - 60, hy = H * 0.78;
      ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx + 60, hy - 70); ctx.lineTo(hx + 120, hy); ctx.closePath(); ctx.fill();
      if (k > 0.2) { ctx.fillStyle = `rgba(255,200,100,${T.clamp((k - 0.2) * 3, 0, 1) * (1 - T.clamp((k - 0.7) * 3, 0, 1))})`; ctx.fillRect(hx + 52, hy - 22, 16, 22); }
    };
    await anim(3600, (k) => scene(k));
    const card = T.h(`<div class="seq-title light"><div class="seq-kicker">SETTLEMENT</div><div class="seq-name">정착</div><div class="seq-gain"><i class="ic ic-lantern"></i> 등불 +${T.fmt(gain)}</div><div class="seq-sub">첫 지붕 아래에서, 마을이 시작됩니다.</div></div>`);
    el.appendChild(card);
    await wait(60); card.classList.add('in');
    await wait(2200);
    card.classList.add('out');
    await anim(1200, (k) => { cv.style.opacity = String(1 - k); el.style.background = `rgba(250,250,248,${1 - T.easeInOut(k)})`; });
  }

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
    const cv = document.createElement('canvas');
    const W = innerWidth, H = innerHeight;
    cv.width = W; cv.height = H; cv.className = 'seq-canvas';
    el.appendChild(cv);
    const ctx = cv.getContext('2d');
    T.audio.era();
    const clock = (k, a) => {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = `rgba(40,32,24,${a})`; ctx.fillRect(0, 0, W, H);
      const cx = W / 2, cy = H / 2 - 30, R = 70;
      ctx.globalAlpha = a; ctx.strokeStyle = '#f2e6cf'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
      for (let i = 0; i < 12; i++) { const an = (i / 12) * Math.PI * 2; ctx.fillStyle = '#f2e6cf'; ctx.fillRect(cx + Math.cos(an) * (R - 10) - 2, cy + Math.sin(an) * (R - 10) - 2, 4, 4); }
      const spin = k * k * 60;
      ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(spin) * (R - 18), cy + Math.sin(spin) * (R - 18)); ctx.stroke();
      ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(spin / 12) * (R - 34), cy + Math.sin(spin / 12) * (R - 34)); ctx.stroke();
      ctx.globalAlpha = 1;
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
        <div class="cr-sec"><small>철거</small><b>망치</b></div>
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
    ['square', 'triangle', 'circle', 'pentagon', 'star', 'hexagon', 'drop', 'demo'].forEach((k, i) => {
      const c = T.sprites.portrait(k, s.flags.color || true, 3, i % 2 ? 'happy' : 'normal');
      c.style.animationDelay = `${-i * 1.2}s`;
      parade.appendChild(c);
    });
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add('in'));
    T.audio.reveal();
    el.addEventListener('click', () => { el.classList.remove('in'); setTimeout(() => el.remove(), 700); });
  };

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
