'use strict';
// ─────────────────────────────────────────────────────────────
//  VILLAGE: 부지 선정, 구역, 낮과 밤, 행복, 수명, 가족
// ─────────────────────────────────────────────────────────────
(function () {
  const B = T.B;
  const V = (T.vil = { zoneTool: null });
  const S = () => T.G.s;
  const DAY = 210; // seconds per full day

  // ── counting ─────────────────────────────────────────────
  V.done = () => S().structs.filter((st) => st.f === null);
  V.countCat = (cat) => V.done().filter((st) => T.DEF[st.id].cat === cat).length;
  V.countId = (id) => V.done().filter((st) => st.id === id).length;
  V.countTier = (t) => V.done().filter((st) => T.DEF[st.id].tier >= t).length;
  V.population = () => S().archs.length + S().workers.length + S().kids.length;
  V.capacity = function () {
    let c = 0;
    for (const st of V.done()) { const d = T.DEF[st.id]; if (d.cap) c += d.cap + (S().gup2 ? 0 : 0) + (S().lup.roomy || 0); }
    return c;
  };
  V.houseCap = (st) => (T.DEF[st.id].cap || 0) + (S().lup.roomy || 0);
  V.avgHappy = function () {
    const a = T.ent.archs;
    if (!a.length) return 0;
    let t = 0; for (const e of a) t += e.happy || 0;
    return Math.round((t / a.length) * 100) / 100;
  };

  // ── day & night (after settling) ─────────────────────────
  V.night = function () {
    const s = S();
    if (s.era < 1) return 0;
    const t = (s.clock % DAY) / DAY; // 0..1, night centred at 0.85
    const nightLen = 0.28 * Math.pow(0.85, s.lup.night || 0);
    const d = Math.abs(t - 0.85);
    const dd = Math.min(d, 1 - d);
    return T.clamp((nightLen / 2 + 0.05 - dd) / 0.1, 0, 1);
  };
  V.isNight = () => V.night() > 0.6;
  V.timeLabel = function () {
    const t = (S().clock % DAY) / DAY;
    const h = Math.floor(((t * 24) + 6) % 24);
    return (h < 10 ? '0' : '') + h + ':00';
  };

  // ── site planning ────────────────────────────────────────
  function free(x0, x1, margin = 3 * B) {
    return !T.st.overlaps(x0 - margin, x1 + margin).length;
  }
  V.pickSiteWild = function (w, nearX) {
    // before settling: architects wander off and drop sculptures wherever they like
    const n = S().structs.length;
    const R = 220 + 110 * Math.pow(n + 1, 0.75);
    for (let tries = 0; tries < 40; tries++) {
      const base = Math.random() < 0.4 ? nearX : 0;
      const x = Math.round((base + (Math.random() * 2 - 1) * R) / B) * B;
      if (free(x, x + w)) return x;
    }
    return null;
  };
  const ZONE_W = { home: 420, park: 220, market: 300, prod: 340, civic: 420, water: 280 };
  V.zoneFor = (cat) => ({ house: 'home', park: 'park', sculpture: 'park', market: 'market', prod: 'prod', civic: 'civic', water: 'water', deco: null })[cat];
  V.zoneAt = (x) => S().zones.find((z) => x >= z.x0 && x < z.x1);
  function gapIn(z, w) {
    // scan from the zone edge nearest the village centre outward
    const step = B * 2;
    const nearLeft = Math.abs(z.x0) < Math.abs(z.x1);
    for (let i = 0; z.x0 + i * step + w <= z.x1; i++) {
      const x = nearLeft ? z.x0 + i * step : z.x1 - w - i * step;
      if (free(x, x + w, 2 * B)) return x;
    }
    return null;
  }
  V.newZone = function (type) {
    const s = S();
    const w = ZONE_W[type] || 260;
    let L = 0, R = 0;
    for (const z of s.zones) { L = Math.min(L, z.x0); R = Math.max(R, z.x1); }
    if (!s.zones.length) { const z = { x0: -w / 2, x1: w / 2, type, auto: 1 }; s.zones.push(z); return z; }
    const right = R <= -L ? true : Math.random() < 0.25;
    const z = right ? { x0: R + B * 4, x1: R + B * 4 + w, type, auto: 1 } : { x0: L - B * 4 - w, x1: L - B * 4, type, auto: 1 };
    s.zones.push(z);
    T.fx.zoneBorn(z);
    return z;
  };
  V.pickSiteZoned = function (def, w) {
    const s = S();
    const want = V.zoneFor(def.cat);
    const zones = s.zones.filter((z) => (want ? z.type === want : true) || (T.ZONES[z.type].fill || []).includes(def.cat));
    zones.sort((a, b) => Math.min(Math.abs(a.x0), Math.abs(a.x1)) - Math.min(Math.abs(b.x0), Math.abs(b.x1)));
    for (const z of zones) { const x = gapIn(z, w); if (x !== null) return x; }
    const type = want || 'park';
    if (T.ZONES[type].era > s.era) return null;
    const z = V.newZone(type);
    return gapIn(z, w);
  };

  // ── what to build next (auto projects) ───────────────────
  V.chooseDef = function () {
    const s = S();
    const opts = [];
    if (s.era < 1) {
      const maxT = T.G.maxSculptTier();
      for (const d of T.DEFS) if (d.era === 0 && !d.hidden && d.tier <= maxT) opts.push([d, [6, 3, 1][d.tier]]);
    } else {
      const pop = V.population(), cap = V.capacity();
      const needHouse = cap < pop + 2;
      for (const d of T.DEFS) {
        if (d.hidden || d.era > s.era || (d.era === 0 && d.tier > 1)) continue;
        if (!T.ZONES[V.zoneFor(d.cat) || 'park'] || T.ZONES[V.zoneFor(d.cat) || 'park'].era > s.era) continue;
        if (d.tier >= 4 && (pop < 6 || T.ent.archs.length < 3)) continue;
        let w = { house: needHouse ? 10 : 1.2, park: 2.2, deco: 1.6, market: 1.1, prod: 1.3, civic: 0.6, water: 0.5, sculpture: 0.4 }[d.cat] || 1;
        if (d.era === s.era) w *= 1.8; // build the new era's things more often
        if (d.era < s.era - 1) w *= 0.3;
        if (d.tier === 5) w *= 0.15; else if (d.tier === 4) w *= 0.35;
        opts.push([d, w]);
      }
    }
    let tot = 0; for (const o of opts) tot += o[1];
    let r = Math.random() * tot;
    for (const o of opts) { r -= o[1]; if (r <= 0) return o[0]; }
    return opts.length ? opts[0][0] : null;
  };
  V.startProject = function (nearX) {
    const def = V.chooseDef();
    if (!def) return null;
    const seed = 1 + Math.floor(Math.random() * 99999);
    const sh = T.shapeOf(def.id, seed);
    const w = sh.w * B;
    const x = S().era < 1 ? V.pickSiteWild(w, nearX) : V.pickSiteZoned(def, w);
    if (x === null || x === undefined) return null;
    return T.st.create(def.id, seed, x, 'auto');
  };
  V.maxAuto = () => Math.max(1, Math.ceil(T.ent.archs.length / 2.2));

  // ── happiness ────────────────────────────────────────────
  let happyT = 0;
  V.updateHappiness = function (dt) {
    happyT -= dt;
    if (happyT > 0) return;
    happyT = 1;
    const s = S();
    const auras = [];
    const rmul = 1 + 0.3 * (s.lup.aura || 0);
    for (const st of V.done()) {
      const d = T.DEF[st.id];
      if (d.cap || d.cat === 'special') continue;
      const t = T.TIERS[d.tier];
      const sh = T.st.shape(st);
      auras.push([st.x + (sh.w * B) / 2, t.radius * rmul, t.aura * (st.src === 'bp' ? 1.5 : 1)]);
    }
    for (const e of T.ent.archs.concat(T.ent.workers)) {
      let h = 0;
      for (const [x, r, a] of auras) { const d = Math.abs(e.x - x); if (d < r) h += a * (1 - (d / r) * 0.5); }
      if (e.visitBuff > 0) h += 0.4;
      e.happy = Math.min(2.5, h);
    }
  };

  // ── homes ────────────────────────────────────────────────
  V.assignHomes = function () {
    const s = S();
    if (s.era < 1) return;
    const houses = V.done().filter((st) => T.DEF[st.id].cap);
    const occ = new Map(houses.map((h) => [h.uid, 0]));
    const people = T.ent.archs.concat(T.ent.workers);
    for (const e of people) {
      const h = e.d.home && houses.find((x) => x.uid === e.d.home);
      if (h) occ.set(h.uid, occ.get(h.uid) + 1); else e.d.home = 0;
    }
    for (const e of people) {
      if (e.d.home) continue;
      let best = null, bd = Infinity;
      for (const h of houses) {
        if (occ.get(h.uid) >= V.houseCap(h)) continue;
        const d = Math.abs(h.x - e.x);
        if (d < bd) { bd = d; best = h; }
      }
      if (best) { e.d.home = best.uid; occ.set(best.uid, occ.get(best.uid) + 1); if (Math.random() < 0.5) e.bubble = { text: '우리 집!', t: 1.6 }; }
    }
  };
  V.onBuilt = function (st) {
    if (T.DEF[st.id].cap) V.assignHomes();
  };

  // ── lifespan & death ─────────────────────────────────────
  V.maxLife = () => 520 * (1 + 0.4 * (S().lup.life || 0)) * (1 + 0.3 * (S().mup.m_life || 0));
  V.die = function (e) {
    const s = S();
    const name = e.d.name;
    T.fx.ghost(e.x, e.y + 10, e.d.s || 'square');
    if (e.kind === 'worker') s.workers.splice(s.workers.indexOf(e.d), 1);
    else s.archs.splice(s.archs.indexOf(e.d), 1);
    T.ent.removeEntity(e);
    T.ui.toast(`${name}이(가) 긴 잠에 들었습니다.`);
    T.audio.farewell();
    let mourner = null, md = Infinity;
    for (const o of T.ent.archs.concat(T.ent.workers)) {
      const d = Math.abs(o.x - e.x);
      if (d < 320) { o.mournT = 6 + Math.random() * 3; o.bubble = { text: ['…', '안녕', '흑', '…!'][Math.floor(Math.random() * 4)], t: 2 }; }
      if (o.kind !== 'worker' && d < md) { md = d; mourner = o; }
    }
    if (mourner && Math.random() < 0.45) {
      const sh = T.shapeOf('grave', 1);
      for (let k = 0; k < 12; k++) {
        const x = Math.round((e.x + (Math.random() * 2 - 1) * (60 + k * 20)) / B) * B;
        if (free(x, x + sh.w * B, B)) { mourner.proj = T.st.create('grave', 1 + Math.floor(Math.random() * 99), x, 'grave', { name }); break; }
      }
    }
    T.G.computeMult();
  };

  // ── families (after milestone 14) ────────────────────────
  let lastNight = false;
  V.familyTick = function () {
    const s = S();
    const night = V.isNight();
    if (night && !lastNight && s.ms >= 14) {
      // a new night: couples may welcome a baby
      const houses = V.done().filter((st) => T.DEF[st.id].cap);
      for (const h of houses) {
        const fam = T.ent.archs.concat(T.ent.workers).filter((e) => e.d.home === h.uid);
        const kidsHere = s.kids.filter((k) => k.home === h.uid).length;
        if (fam.length >= 2 && fam.length + kidsHere < V.houseCap(h) + 1 && Math.random() < 0.35 * (1 + 0.3 * (s.lup.birth || 0))) {
          const p = fam[Math.floor(Math.random() * fam.length)];
          const kid = { s: p.d.s, home: h.uid, age: 0, name: '아기 ' + ['콩', '꼬마', '아가', '몽글', '솜', '방글'][Math.floor(Math.random() * 6)] };
          s.kids.push(kid);
          T.ent.spawnKid(kid, h);
          T.ui.toast(`${T.DEF[h.id].name}에 아기가 태어났습니다!`);
          T.audio.unlock();
        }
      }
    }
    lastNight = night;
  };
  V.growKids = function (dt) {
    const s = S();
    const rate = 1 + 0.3 * (s.lup.birth || 0);
    for (const k of s.kids.slice()) {
      k.age += dt * rate;
      if (k.age >= 240) {
        s.kids.splice(s.kids.indexOf(k), 1);
        const w = { s: k.s, home: k.home, name: k.name.replace('아기 ', ''), life: V.maxLife() };
        s.workers.push(w);
        T.ent.growUp(k, w);
        T.ui.toast(`${w.name}이(가) 어른이 되어 일꾼이 되었습니다.`);
      }
    }
  };
  V.goodsRate = () => 0.6 * Math.pow(1.5, S().mup.m_work || 0) * (1 + 0.5 * S().era);

  // ── zones: player painting ───────────────────────────────
  V.paintZone = function (x0, x1, type) {
    const s = S();
    if (x1 < x0) [x0, x1] = [x1, x0];
    x0 = Math.round(x0 / B) * B; x1 = Math.round(x1 / B) * B;
    if (x1 - x0 < B * 6) return;
    const out = [];
    for (const z of s.zones) {
      if (z.x1 <= x0 || z.x0 >= x1) { out.push(z); continue; }
      if (z.x0 < x0) out.push({ ...z, x1: x0 });
      if (z.x1 > x1) out.push({ ...z, x0: x1 });
    }
    out.push({ x0, x1, type, auto: 0 });
    out.sort((a, b) => a.x0 - b.x0);
    s.zones = out;
    T.fx.zoneBorn({ x0, x1, type });
    T.audio.unlock();
  };

  // ── render: zone bands, signs, night glows ───────────────
  V.renderZones = function (ctx) {
    const s = S();
    if (s.era < 1 || !s.zones.length) return;
    const color = s.flags.color;
    const z = T.cam.z;
    const [, gy] = T.w2s(0, 0);
    for (const zn of s.zones) {
      const def = T.ZONES[zn.type];
      const [a] = T.w2s(zn.x0, 0), [b] = T.w2s(zn.x1, 0);
      if (b < 0 || a > T.cam.W) continue;
      ctx.fillStyle = color ? def.color : def.gray;
      ctx.globalAlpha = 0.55;
      ctx.fillRect(a, gy + Math.max(2, 4 * z), b - a, Math.max(1, 1.5 * z));
      ctx.globalAlpha = 1;
      if (z > 0.6) {
        ctx.font = '9px Galmuri9, monospace'; ctx.textBaseline = 'top'; ctx.textAlign = 'left';
        ctx.fillStyle = color ? T.shade(def.color, -0.35) : '#555';
        ctx.fillText(def.name, a + 3, gy + 8 * z);
      }
    }
    if (V.zoneDrag) {
      const [a] = T.w2s(Math.min(V.zoneDrag[0], V.zoneDrag[1]), 0), [b] = T.w2s(Math.max(V.zoneDrag[0], V.zoneDrag[1]), 0);
      ctx.fillStyle = (T.ZONES[V.zoneTool] || T.ZONES.park).color;
      ctx.globalAlpha = 0.25; ctx.fillRect(a, gy - 60, b - a, 60); ctx.globalAlpha = 1;
      ctx.fillRect(a, gy, b - a, 3);
    }
  };
  const glowSpr = {};
  function glowSprite(col) {
    if (glowSpr[col]) return glowSpr[col];
    const cv = document.createElement('canvas'); cv.width = cv.height = 64;
    const g = cv.getContext('2d');
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    return (glowSpr[col] = cv);
  }
  V.renderGlow = function (ctx, n) {
    if (n < 0.02) return;
    const z = T.cam.z;
    const [vx0] = T.s2w(-80, 0), [vx1] = T.s2w(T.cam.W + 80, 0);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.imageSmoothingEnabled = true;
    for (const st of V.done()) {
      const sh = T.st.shape(st);
      if (st.x + sh.w * B < vx0 || st.x > vx1 || !sh.glow.length) continue;
      const d = T.DEF[st.id];
      for (const i of sh.glow) {
        const c = sh.cells[i];
        if (c.ch === 'o' && !(d.cap || d.visit)) continue;
        const [sx, sy] = T.w2s(st.x + c.c * B + B / 2, c.r * B + B / 2);
        const r = (c.ch === 'y' ? 26 : 12) * z;
        ctx.globalAlpha = n * (c.ch === 'y' ? 0.75 : 0.5) * (0.85 + Math.sin(performance.now() / 300 + i) * 0.15);
        ctx.drawImage(glowSprite(c.ch === 'y' ? 'rgba(255,200,90,1)' : 'rgba(255,214,140,1)'), sx - r, sy - r, r * 2, r * 2);
      }
    }
    ctx.restore();
  };
})();
