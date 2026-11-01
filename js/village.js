'use strict';
// ─────────────────────────────────────────────────────────────
//  VILLAGE: 부지와 구역, 레이어, 낮과 밤, 하늘 이벤트, 행복, 수명, 가족
// ─────────────────────────────────────────────────────────────
(function () {
  const B = T.B;
  const V = (T.vil = { zoneTool: null });
  const S = () => T.G.s;
  const DAY = 210;
  V.DAY = DAY;

  // ── counting ─────────────────────────────────────────────
  V.done = () => S().structs.filter((st) => st.f === null);
  V.countCat = (cat) => V.done().filter((st) => T.DEF[st.id].cat === cat).length;
  V.countId = (id) => V.done().filter((st) => st.id === id).length;
  V.countTier = (t) => V.done().filter((st) => T.DEF[st.id].tier >= t).length;
  V.population = () => S().archs.length + S().workers.length + S().kids.length + S().pets.length;
  V.houseCap = (st) => (T.DEF[st.id].cap || 0) + (S().lup.roomy || 0);
  V.capacity = () => V.done().reduce((a, st) => a + (T.DEF[st.id].cap ? V.houseCap(st) : 0), 0);
  V.avgHappy = function () { const a = T.ent.archs; if (!a.length) return 0; let t = 0; for (const e of a) t += e.happy || 0; return Math.round((t / a.length) * 100) / 100; };

  // ── day, night and sky ───────────────────────────────────
  V.dayFrac = () => (S().clock % DAY) / DAY;
  V.night = function () {
    if (S().era < 1) return 0;
    const t = V.dayFrac();
    const a = T.clamp((t - 0.68) / 0.06, 0, 1), b = T.clamp((t - 0.96) / 0.04, 0, 1);
    return a * (1 - b);
  };
  V.isNight = () => V.night() > 0.6;
  V.timeLabel = function () { const t = V.dayFrac(); const m = Math.floor(((t * 24 + 6) % 24) * 60); return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; };
  V.day = () => Math.floor(S().clock / DAY) + 1;
  const PHASES = ['그믐달', '초승달', '상현달', '차오르는 달', '보름달', '기우는 달', '하현달', '그믐 무렵'];
  V.moon = () => { const p = (V.day() + 3) % 8; return { p, name: PHASES[p] }; };
  V.sky = function (t) {
    const s = S();
    if (s.era < 1) return { day: false };
    const f = V.dayFrac();
    return {
      day: true, t, night: V.night(), phase: V.moon().p,
      sunP: f < 0.74 ? f / 0.74 : -1, moonP: f >= 0.66 ? (f - 0.66) / 0.34 : -1,
      dusk: T.clamp(1 - Math.abs(f - 0.7) / 0.06, 0, 1) + T.clamp(1 - Math.min(f, 1 - f) / 0.04, 0, 1),
      event: s.event && s.event.t > 0 ? s.event.type : null,
      // eclipse: the moon slides over the sun (0→1), stays (totality), slides off
      ecl: s.event && s.event.t > 0 && s.event.type === 'eclipse' ? (() => { const k = 1 - s.event.t / (s.event.dur || 40); return k < 0.3 ? k / 0.3 : k < 0.7 ? 1 : (1 - k) / 0.3; })() : 0,
      eclK: s.event && s.event.type === 'eclipse' ? 1 - s.event.t / (s.event.dur || 40) : 0,
    };
  };
  let lastDay = 0, lastNightFlag = false;
  V.tickSky = function (dt) {
    const s = S();
    if (s.era < 1) return;
    if (s.event && s.event.t > 0) { s.event.t -= dt; if (s.event.t <= 0) { s.event = null; T.ui.toast('하늘이 다시 평소로 돌아왔습니다.'); T.G.computeMult(); } }
    const d = V.day(), n = V.isNight();
    if (d !== lastDay) { lastDay = d; s.day = d; s.eclipseAt = Math.random() < 0.05 ? 0.25 + Math.random() * 0.2 : -1; }
    if (s.eclipseAt > 0 && V.dayFrac() >= s.eclipseAt && !s.event) { s.eclipseAt = -1; startEvent('eclipse', 40); }
    if (n && !lastNightFlag && !s.event && Math.random() < 0.07) startEvent('aurora', DAY * 0.25);
    if (n !== lastNightFlag && lastDay) T.audio.play(n ? 'night' : 'morning');
    lastNightFlag = n;
  };
  function startEvent(type, dur) {
    S().event = { type, t: dur, dur };
    T.G.computeMult();
    T.fx.banner(type === 'aurora' ? '오로라' : '일식', type === 'aurora' ? '하늘이 춤춥니다. 잠시 동안 조각 ×3, 쿨타임 감소' : '해가 숨었습니다. 잠시 동안 조각 ×3, 쿨타임 감소');
    T.audio.play('sky');
  }
  V.startEvent = startEvent;

  // ── sites ────────────────────────────────────────────────
  const free = (x0, x1, z, y0 = 0, y1 = 400, margin = 2 * B) => !T.st.overlaps(x0 - margin, x1 + margin, y0, y1, z).length;
  V.pickSiteWild = function (w, h, nearX, z, sky) {
    const n = S().structs.filter((st) => (st.z || 0) === z).length;
    const R = 160 + 70 * Math.pow(n + 1, 0.8);
    for (let tries = 0; tries < 40; tries++) {
      const base = Math.random() < 0.5 ? nearX : 0;
      const x = Math.round((base + (Math.random() * 2 - 1) * R) / B) * B;
      const y = sky ? Math.round((90 + Math.random() * 120) / B) * B : 0;
      if (free(x, x + w, z, y - 2 * B, y + h + 2 * B)) return [x, y];
    }
    return null;
  };
  const ZONE_W = { home: 360, park: 200, market: 260, prod: 300, civic: 360, water: 260 };
  V.zoneFor = (cat) => ({ house: 'home', park: 'park', sculpture: 'park', market: 'market', prod: 'prod', civic: 'civic', water: 'water', deco: null })[cat];
  function gapIn(zn, w, h) {
    const step = B * 2;
    const nearLeft = Math.abs(zn.x0) < Math.abs(zn.x1);
    for (let i = 0; zn.x0 + i * step + w <= zn.x1; i++) {
      const x = nearLeft ? zn.x0 + i * step : zn.x1 - w - i * step;
      if (free(x, x + w, zn.z || 0, -40, h + 8, B)) return x;
    }
    return null;
  }
  V.newZone = function (type, z) {
    const s = S();
    const w = ZONE_W[type] || 240;
    let L = 0, R = 0, any = false;
    for (const zn of s.zones) if ((zn.z || 0) === z) { L = Math.min(L, zn.x0); R = Math.max(R, zn.x1); any = true; }
    const zn = !any ? { x0: -w / 2, x1: w / 2, type, auto: 1, z } : (R <= -L ? { x0: R + B * 4, x1: R + B * 4 + w, type, auto: 1, z } : { x0: L - B * 4 - w, x1: L - B * 4, type, auto: 1, z });
    s.zones.push(zn);
    T.fx.zoneBorn(zn);
    return zn;
  };
  V.pickSiteZoned = function (def, w, h, z) {
    const s = S();
    const want = V.zoneFor(def.cat);
    const zones = s.zones.filter((zn) => (zn.z || 0) === z && ((want ? zn.type === want : true) || (T.ZONES[zn.type].fill || []).includes(def.cat)));
    zones.sort((a, b) => Math.min(Math.abs(a.x0), Math.abs(a.x1)) - Math.min(Math.abs(b.x0), Math.abs(b.x1)));
    for (const zn of zones) { const x = gapIn(zn, w, h); if (x !== null) return x; }
    const type = want || 'park';
    if (T.ZONES[type].era > s.era) return null;
    return gapIn(V.newZone(type, z), w, h);
  };
  V.chooseDef = function (z) {
    const s = S();
    const opts = [];
    if (s.era < 1) {
      // builders' own works stay modest; the big ones are left to the player's blueprints
      const maxT = Math.min(3, T.G.maxTier());
      for (const d of T.DEFS) if (d.era === 0 && !d.hidden && d.tier <= maxT && (d.res || 0) <= s.resLv && (!d.sky || s.ms >= 6)) opts.push([d, (6 / Math.pow(1 + d.tier, 1.3)) * (d.sky ? 0.5 : 1)]);
    } else {
      const pop = V.population(), cap = V.capacity();
      const needHouse = cap < pop + 2;
      for (const d of T.DEFS) {
        if (d.hidden || d.era > s.era || (d.res || 0) > s.resLv || (d.era === 0 && (d.tier > 2 || d.sky))) continue;
        const zt = T.ZONES[V.zoneFor(d.cat) || 'park'];
        if (!zt || zt.era > s.era) continue;
        if (d.tier >= 4 && (pop < 6 || T.ent.archs.length < 3)) continue;
        let w = { house: needHouse ? 10 : 1.2, park: 2.2, deco: 1.6, market: 1.1, prod: 1.3, civic: 0.6, water: 0.5, sculpture: 0.4 }[d.cat] || 1;
        if (d.era === s.era) w *= 1.8;
        if (d.era < s.era - 1) w *= 0.3;
        if (d.tier >= 6) w *= 0.15; else if (d.tier >= 4) w *= 0.35;
        opts.push([d, w]);
      }
    }
    let tot = 0; for (const o of opts) tot += o[1];
    let r = Math.random() * tot;
    for (const o of opts) { r -= o[1]; if (r <= 0) return o[0]; }
    return opts.length ? opts[0][0] : null;
  };
  V.startProject = function (nearX, z = 0) {
    const def = V.chooseDef(z);
    if (!def) return null;
    const seed = 1 + Math.floor(Math.random() * 99999);
    const sh = T.shapeOf(def.id, seed);
    const w = sh.w * B, h = sh.h * B;
    let x, y = 0;
    if (S().era < 1) { const p = V.pickSiteWild(w, h, nearX, z, def.sky); if (!p) return null; [x, y] = p; }
    else { x = V.pickSiteZoned(def, w, h, z); if (x === null || x === undefined) return null; }
    return T.st.create(def.id, seed, x, 'auto', { y, z });
  };
  V.maxAuto = (z = 0) => Math.max(1, Math.ceil(T.ent.archs.filter((e) => (e.d.z || 0) === z).length / 2.2));
  V.onLayer = function () { T.ui.toast(`새 겹이 열렸습니다. 이제 ${T.G.layers()}겹입니다. 폴짝 주민이 주민들을 데려갑니다.`, 'big'); T.fx.layerOpen(); };

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
      auras.push([st.x + (T.st.shape(st).w * B) / 2, t.radius * rmul, V.auraAt(st), st.z || 0]);
    }
    for (const e of T.ent.archs.concat(T.ent.workers)) {
      let h = 0;
      for (const [x, r, a, z] of auras) { if (z !== (e.d.z || 0)) continue; const d = Math.abs(e.x - x); if (d < r) h += a * (1 - (d / r) * 0.5); }
      if (e.visitBuff > 0) h += 0.4;
      e.happy = Math.min(2.5, h);
    }
  };
  V.auraAt = function (st) { const d = T.DEF[st.id]; if (d.cap || d.cat === 'special') return 0; return T.TIERS[d.tier].aura * (st.src === 'bp' ? 1.5 : 1) * (T.st.completeness(st) / 3); };

  // ── homes ────────────────────────────────────────────────
  V.residents = () => T.ent.archs.concat(T.ent.workers, T.ent.painters, T.ent.splitters, T.ent.demos, T.ent.warpers);
  V.assignHomes = function () {
    const s = S();
    if (s.era < 1) return;
    const houses = V.done().filter((st) => T.DEF[st.id].cap);
    const occ = new Map(houses.map((h) => [h.uid, 0]));
    const people = V.residents();
    for (const e of people) { const h = e.d.home && houses.find((x) => x.uid === e.d.home); if (h) occ.set(h.uid, occ.get(h.uid) + 1); else e.d.home = 0; }
    for (const e of people) {
      if (e.d.home) continue;
      let best = null, bd = Infinity;
      for (const h of houses) { if ((h.z || 0) !== (e.d.z || 0) || occ.get(h.uid) >= V.houseCap(h)) continue; const d = Math.abs(h.x - e.x); if (d < bd) { bd = d; best = h; } }
      if (best) { e.d.home = best.uid; occ.set(best.uid, occ.get(best.uid) + 1); if (Math.random() < 0.5) e.bubble = { text: '우리 집!', t: 1.6 }; }
    }
  };
  V.onBuilt = function (st) { if (T.DEF[st.id].cap) V.assignHomes(); };
  V.sleepersIn = (st) => V.residents().concat(T.ent.kids).filter((e) => e.d.home === st.uid);

  // ── lifespan ─────────────────────────────────────────────
  V.maxLife = () => 520 * (1 + 0.35 * (S().lup.life || 0)) * (1 + 0.25 * (S().mup.m_life || 0));
  V.die = function (e) {
    const s = S();
    const name = e.d.name;
    T.fx.ghost(e.x, e.y + 10);
    const lists = { arch: s.archs, worker: s.workers, kid: s.kids };
    const list = lists[e.kind] || s.pets;
    const i = list.indexOf(e.d); if (i >= 0) list.splice(i, 1);
    if (!lists[e.kind]) s.petWait = Object.assign(s.petWait || {}, { [e.kind]: 60 });
    T.ent.removeEntity(e);
    T.ui.toast(`${name}이(가) 긴 잠에 들었습니다.`);
    T.audio.farewell();
    let mourner = null, md = Infinity;
    for (const o of T.ent.archs.concat(T.ent.workers)) {
      const d = Math.abs(o.x - e.x);
      if ((o.d.z || 0) !== (e.d.z || 0)) continue;
      if (d < 320) { o.mournT = 6 + Math.random() * 3; o.bubble = { text: ['…', '안녕', '흑', '…!'][Math.floor(Math.random() * 4)], t: 2 }; }
      if (o.kind === 'arch' && d < md) { md = d; mourner = o; }
    }
    if (mourner && Math.random() < 0.45) {
      const sh = T.shapeOf('grave', 1);
      for (let k = 0; k < 12; k++) {
        const x = Math.round((e.x + (Math.random() * 2 - 1) * (40 + k * 16)) / B) * B;
        if (free(x, x + sh.w * B, e.d.z || 0, -8, 40, B)) { T.ent.setProj(mourner, T.st.create('grave', 1 + Math.floor(Math.random() * 99), x, 'grave', { name, z: e.d.z || 0 })); break; }
      }
    }
    T.G.computeMult();
  };

  // ── families ─────────────────────────────────────────────
  let lastNight = false;
  V.familyTick = function () {
    const s = S();
    const night = V.isNight();
    if (night && !lastNight && s.ms >= 18) {
      for (const h of V.done().filter((st) => T.DEF[st.id].cap)) {
        const fam = T.ent.archs.concat(T.ent.workers).filter((e) => e.d.home === h.uid);
        const kidsHere = s.kids.filter((k) => k.home === h.uid).length;
        if (fam.length >= 2 && fam.length + kidsHere < V.houseCap(h) + 1 && Math.random() < 0.3 * (1 + 0.3 * (s.lup.birth || 0))) {
          const p = fam[Math.floor(Math.random() * fam.length)];
          const kid = { s: p.d.s, home: h.uid, age: 0, z: h.z || 0, life: V.maxLife(), name: '아기 ' + ['콩', '꼬마', '아가', '몽글', '솜', '방글'][Math.floor(Math.random() * 6)] };
          s.kids.push(kid);
          T.ent.spawnKid(kid, h); T.audio.play('birth');
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
        const w = { s: k.s, home: k.home, z: k.z || 0, name: k.name.replace('아기 ', ''), life: V.maxLife() };
        s.workers.push(w);
        T.ent.growUp(k, w);
        T.ui.toast(`${w.name}이(가) 어른이 되어 일꾼이 되었습니다.`);
      }
    }
  };
  V.goodsRate = () => 0.5 * Math.pow(1.5, S().mup.m_work || 0) * (1 + 0.5 * S().era);

  // ── zones ────────────────────────────────────────────────
  V.paintZone = function (x0, x1, type) {
    const s = S();
    if (x1 < x0) [x0, x1] = [x1, x0];
    x0 = Math.round(x0 / B) * B; x1 = Math.round(x1 / B) * B;
    if (x1 - x0 < B * 6) return;
    const out = [];
    for (const zn of s.zones) {
      if ((zn.z || 0) !== 0 || zn.x1 <= x0 || zn.x0 >= x1) { out.push(zn); continue; }
      if (zn.x0 < x0) out.push({ ...zn, x1: x0 });
      if (zn.x1 > x1) out.push({ ...zn, x0: x1 });
    }
    out.push({ x0, x1, type, auto: 0, z: 0 });
    out.sort((a, b) => a.x0 - b.x0);
    s.zones = out;
    T.fx.zoneBorn({ x0, x1, type });
    T.audio.unlock();
  };
  V.renderZones = function (ctx, z = 0) {
    const s = S();
    if (s.era < 1 || !s.zones.length) return;
    const color = s.flags.color;
    const zz = T.cam.z * T.layerK();
    const [, gy] = T.w2s(0, 0);
    for (const zn of s.zones) {
      if ((zn.z || 0) !== z) continue;
      const d = T.ZONES[zn.type];
      const [a] = T.w2s(zn.x0, 0), [b] = T.w2s(zn.x1, 0);
      if (b < 0 || a > T.cam.W) continue;
      ctx.fillStyle = color ? d.color : d.gray;
      ctx.globalAlpha = 0.55; ctx.fillRect(a, gy + Math.max(2, 4 * zz), b - a, Math.max(1, 1.5 * zz)); ctx.globalAlpha = 1;
      if (zz > 0.6 && z === 0) { ctx.font = '9px Galmuri9, monospace'; ctx.textBaseline = 'top'; ctx.textAlign = 'left'; ctx.fillStyle = color ? T.shade(d.color, -0.35) : '#555'; ctx.fillText(d.name, a + 3, gy + 8 * zz); }
    }
    if (V.zoneDrag && z === 0) {
      const [a] = T.w2s(Math.min(V.zoneDrag[0], V.zoneDrag[1]), 0), [b] = T.w2s(Math.max(V.zoneDrag[0], V.zoneDrag[1]), 0);
      ctx.fillStyle = (T.ZONES[V.zoneTool] || T.ZONES.park).color;
      ctx.globalAlpha = 0.25; ctx.fillRect(a, gy - 60, b - a, 60); ctx.globalAlpha = 1; ctx.fillRect(a, gy, b - a, 3);
    }
  };
})();
