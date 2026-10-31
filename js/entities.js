'use strict';
// ─────────────────────────────────────────────────────────────
//  ENTITIES — 건축가 / 방울 / 날아가는 블럭
// ─────────────────────────────────────────────────────────────
(function () {
  const B = T.B;
  const P = 1.15; // world units per sprite pixel
  const GRAV = 1100;
  const archs = [];
  const painters = [];
  const flights = [];
  let hover = null;

  function makeEntity(d) {
    return {
      d, motif: new T.Motif(T.SHAPE[d.s], d.o), pos: new Float32Array(64), len: 0,
      x: (Math.random() - 0.5) * 120, y: 0, vx: 0, vy: 0,
      st: 'idle', t: 1 + Math.random() * 3, target: null, walkTo: 0, windT: 0,
      dir: Math.random() < 0.5 ? -1 : 1, phase: Math.random() * 10,
      blinkT: 2 + Math.random() * 4, blink: 0, happyT: 0, surpriseT: 0, dizzyT: 0,
      petT: 0, sq: 0, look: [0, 0], lookAt: null, lookT: 0, bubble: null, held: false, emoteT: 6 + Math.random() * 20,
    };
  }
  function pushPos(e, x, y) {
    if (e.len * 2 + 2 > e.pos.length) {
      const n = new Float32Array(e.pos.length * 2);
      n.set(e.pos); e.pos = n;
    }
    e.pos[e.len * 2] = x; e.pos[e.len * 2 + 1] = y; e.len++;
  }

  function spawnArch(d, silent) {
    const e = makeEntity(d);
    archs.push(e);
    if (!silent) {
      // arrival: drop from the sky near the camera centre
      e.x = T.clamp(T.cam.x + (Math.random() - 0.5) * Math.min(300, T.cam.W / T.cam.z * 0.5), -4000, 4000);
      e.y = 220 + Math.random() * 60;
      e.vy = -50;
      e.surpriseT = 1.2;
      e.t = 1.5;
    }
    return e;
  }

  function rebuild() {
    archs.length = 0;
    flights.length = 0;
    for (const d of T.G.s.archs) {
      const e = makeEntity(d);
      for (let i = 0; i < d.n; i++) {
        const p = e.motif.next();
        pushPos(e, p[0], p[1]);
        T.world.drawBlock(p[0], p[1], T.G.archColor(d, p[0], p[1], i), T.G.isLucky(d, i));
      }
      // put the architect near its latest work
      if (d.n) e.x = T.clamp(e.pos[(d.n - 1) * 2], -6000, 6000);
      archs.push(e);
    }
    syncPainters();
  }

  function syncPainters() {
    const s = T.G.s;
    const want = s.flags.painter ? 1 + (s.gup.painter || 0) : 0;
    while (painters.length < want) {
      painters.push({
        x: T.cam.x + (Math.random() - 0.5) * 100, y: 260, vx: 0, vy: 0, st: 'idle', t: 1 + Math.random() * 2,
        dir: 1, phase: Math.random() * 10, blinkT: 3, blink: 0, happyT: 0, surpriseT: 1, dizzyT: 0, sq: 0, look: [0, 0],
        held: false, bubble: null, job: null, foot: 0, isPainter: true, petT: 0,
      });
    }
    while (painters.length > want) painters.pop();
  }

  // ── targets ──────────────────────────────────────────────
  function chooseTarget(e) {
    const bps = T.G.s.bps.active;
    if (bps.length && Math.random() < T.G.focus()) {
      const c = T.bp.nextCell(e.x);
      if (c) return { kind: 'bp', x: c.x, y: c.y, bp: c.bp, ci: c.ci };
    }
    const p = e.motif.peek();
    return { kind: 'pat', x: p[0], y: p[1] };
  }

  function launch(e, tgt, extra) {
    const d = e.d;
    const from = [e.x + e.dir * 4, e.y + 14];
    let color, onLand;
    if (tgt.kind === 'pat') {
      e.motif.next();
      const idx = d.n + flightsFor(e);
      const lucky = T.G.isLucky(d, idx);
      onLand = () => {
        const i = d.n;
        pushPos(e, tgt.x, tgt.y);
        d.n++;
        const col = T.G.archColor(d, tgt.x, tgt.y, i);
        T.world.drawBlock(tgt.x, tgt.y, col, lucky);
        const v = T.G.blockValue(d) * (lucky ? 25 : 1);
        T.G.earn(v);
        T.G.s.stats.lifeBlocks++;
        T.fx.landed(tgt.x, tgt.y, v, lucky, col);
        T.audio.note(tgt.y, T.SHAPE[d.s].index);
      };
      color = T.G.archColor(d, tgt.x, tgt.y, idx);
    } else {
      T.bp.reserve(tgt.bp, tgt.ci);
      color = T.G.bpColor(tgt.bp.def.grid[tgt.bp.def.h - 1 - tgt.bp.def.cells[tgt.ci].r][tgt.bp.def.cells[tgt.ci].c]);
      onLand = () => {
        const v = T.G.blockValue(d);
        T.G.earn(v);
        T.G.s.stats.lifeBlocks++;
        T.fx.landed(tgt.x, tgt.y, v, false, color);
        T.audio.note(tgt.y, T.SHAPE[d.s].index);
        T.bp.fill(tgt.bp, tgt.ci);
      };
    }
    const instant = T.G.s.pup.light;
    const tooMany = flights.length > 500 || T.cam.z < 0.12;
    if (instant || tooMany) {
      if (instant && T.cam.z > 0.2 && flights.length < 500) T.fx.beam(from[0], from[1], tgt.x, tgt.y, color);
      onLand();
      return;
    }
    const dist = Math.hypot(tgt.x - from[0], tgt.y - from[1]);
    flights.push({ e, x0: from[0], y0: from[1], x1: tgt.x, y1: tgt.y, t: 0, dur: 0.45 + Math.min(1.4, dist / 700) + (extra ? 0.12 : 0),
      h: 30 + dist * 0.22, color, onLand });
  }
  function flightsFor(e) { let n = 0; for (const f of flights) if (f.e === e && f.pat !== false) n++; return n; }

  // ── interactions ─────────────────────────────────────────
  function pick(wx, wy) {
    let best = null, bd = 1e9;
    const list = painters.concat(archs);
    for (const e of list) {
      const dx = wx - e.x, dy = wy - (e.y + 9);
      if (Math.abs(dx) < 11 && Math.abs(dy) < 12) {
        const dd = dx * dx + dy * dy;
        if (dd < bd) { bd = dd; best = e; }
      }
    }
    return best;
  }
  function pet(e) {
    e.happyT = 1.4;
    e.petT = T.G.petDur();
    e.sq = 0.18;
    T.fx.hearts(e.x, e.y + 20);
    T.audio.pet();
    T.G.s.stats.pets++;
    if (Math.random() < 0.35) e.bubble = { text: ['♥', '헤헤', '♪', '좋아!', '...!'][Math.floor(Math.random() * 5)], t: 1.4 };
  }
  function hold(e) {
    e.held = true; e.st = 'idle'; e.target = null;
    e.surpriseT = 0.6;
    T.audio.pop();
    if (Math.random() < 0.5) e.bubble = { text: ['으앗', '?!', '높다…', '내려줘'][Math.floor(Math.random() * 4)], t: 1.2 };
  }
  function drag(e, wx, wy) {
    const nx = wx, ny = Math.max(0, wy - 10);
    e.vx = (nx - e.x) * 30; e.vy = (ny - e.y) * 30;
    e.x = nx; e.y = ny;
  }
  function release(e) {
    e.held = false;
    e.vx = T.clamp(e.vx, -500, 500) * 0.5;
    e.vy = T.clamp(e.vy, -400, 600) * 0.5;
    e.fallFrom = e.y;
  }
  function notifyPlayerBlock(x, y) {
    for (const e of archs) {
      const dx = x - e.x;
      if (Math.abs(dx) > 260 || e.held) continue;
      e.lookAt = [x, y]; e.lookT = 1.6;
      if (Math.abs(dx) < 10 && y < 34 && e.y === 0) {
        e.surpriseT = 0.9; e.sq = 0.3; e.bubble = { text: '아얏!', t: 1 };
        T.audio.thunk();
      } else if (Math.random() < 0.18 && e.y === 0 && e.st !== 'walk') {
        e.vy = 140; e.bubble = { text: Math.random() < 0.5 ? '!' : '오오', t: 1 };
      }
    }
  }

  // ── update ───────────────────────────────────────────────
  function physics(e, dt) {
    if (e.held) return;
    if (e.y > 0 || e.vy > 0) {
      e.vy -= GRAV * dt;
      e.y += e.vy * dt;
      e.x += e.vx * dt;
      e.vx *= Math.pow(0.4, dt);
      if (e.y <= 0) {
        const impact = -e.vy;
        e.y = 0;
        e.sq = T.clamp(impact / 900, 0.08, 0.35);
        if (impact > 420) {
          e.dizzyT = 2.2; e.vy = impact * 0.32; e.st = 'idle';
          T.fx.stars(e.x, e.y + 20); T.audio.dizzy();
          if (Math.random() < 0.6) e.bubble = { text: '빙글빙글…', t: 1.6 };
        } else if (impact > 160) { e.vy = impact * 0.25; T.fx.dust(e.x, 0); }
        else { e.vy = 0; e.vx = 0; if (impact > 60) T.fx.dust(e.x, 0); }
      }
    }
  }
  function commonTimers(e, dt) {
    e.phase += dt;
    e.blinkT -= dt;
    if (e.blinkT < 0) { e.blink = 0.13; e.blinkT = 2.5 + Math.random() * 4; }
    e.blink = Math.max(0, e.blink - dt);
    e.happyT = Math.max(0, e.happyT - dt);
    e.surpriseT = Math.max(0, e.surpriseT - dt);
    e.dizzyT = Math.max(0, e.dizzyT - dt);
    e.petT = Math.max(0, e.petT - dt);
    e.lookT = Math.max(0, (e.lookT || 0) - dt);
    e.sq *= Math.pow(0.002, dt);
    if (e.bubble) { e.bubble.t -= dt; if (e.bubble.t <= 0) e.bubble = null; }
  }

  function updateArch(e, dt) {
    commonTimers(e, dt);
    physics(e, dt);
    if (e.held || e.y > 0 || e.dizzyT > 0) return;
    const petted = e.petT > 0;
    if (petted && Math.random() < dt * 1.2) T.fx.sparkle(e.x + (Math.random() - 0.5) * 14, e.y + 18 + Math.random() * 6);
    e.emoteT -= dt;
    if (e.emoteT < 0) {
      e.emoteT = 15 + Math.random() * 40;
      if (!e.bubble && T.cam.z > 0.8) e.bubble = { text: ['♪', '…', '흠흠', '♬', '영차'][Math.floor(Math.random() * 5)], t: 1.5 };
    }
    switch (e.st) {
      case 'idle':
        e.t -= dt;
        if (e.t <= 0) {
          e.target = chooseTarget(e);
          if (!e.target) { e.t = 1; break; }
          const range = T.G.throwRange();
          const dx = e.target.x - e.x;
          if (!T.G.s.pup.light && Math.abs(dx) > range) {
            e.st = 'walk';
            e.walkTo = e.target.x - Math.sign(dx) * range * (0.3 + Math.random() * 0.4);
          } else { e.st = 'wind'; e.windT = 0; }
          e.dir = Math.sign(dx) || e.dir;
        }
        break;
      case 'walk': {
        const sp = T.G.walkSpeed() * (petted ? 1.3 : 1);
        const dx = e.walkTo - e.x;
        e.dir = Math.sign(dx) || e.dir;
        const step = sp * dt;
        if (Math.abs(dx) <= step) { e.x = e.walkTo; e.st = 'wind'; e.windT = 0; }
        else e.x += Math.sign(dx) * step;
        if (Math.random() < dt * 0.8 && T.cam.z > 0.6) T.fx.dust(e.x - e.dir * 6, 0, 1);
        break;
      }
      case 'wind':
        e.windT += dt;
        e.sq = 0.22 * Math.min(1, e.windT / 0.22);
        if (e.target) e.dir = Math.sign(e.target.x - e.x) || e.dir;
        if (e.windT >= 0.22) {
          let tgt = e.target;
          if (tgt && tgt.kind === 'bp' && !T.bp.cellFree(tgt.bp, tgt.ci)) tgt = chooseTarget(e);
          if (tgt && tgt.kind === 'bp' && !T.bp.cellFree(tgt.bp, tgt.ci)) { const p = e.motif.peek(); tgt = { kind: 'pat', x: p[0], y: p[1] }; }
          if (tgt) {
            launch(e, tgt);
            if (Math.random() < 0.06 * (T.G.s.up.double || 0)) {
              const t2 = chooseTarget(e);
              if (t2 && !(t2.kind === 'bp' && !T.bp.cellFree(t2.bp, t2.ci))) launch(e, t2, true);
            }
          }
          e.vy = 120; e.sq = -0.2;
          e.st = 'idle';
          e.t = T.G.cooldown(e.d, petted);
          e.target = null;
        }
        break;
    }
    // look
    let lt = e.lookT > 0 ? e.lookAt : e.target ? [e.target.x, e.target.y] : null;
    if (lt) {
      const dx = lt[0] - e.x, dy = lt[1] - (e.y + 10);
      e.look = [Math.abs(dx) > 6 ? Math.sign(dx) : 0, dy > 40 ? -1 : 0];
    } else e.look = [e.st === 'walk' ? e.dir : 0, 0];
  }

  // ── painters ─────────────────────────────────────────────
  function paintFrontier() {
    let best = null, bp = Infinity;
    for (const e of archs) {
      const p = e.d.p || 0;
      if (p < e.len && p < bp) { bp = p; best = e; }
    }
    return best;
  }
  function brushSize() { return Math.round(6 * Math.pow(1.6, T.G.s.gup.brush || 0)); }
  function strokeTime() { return 2.5 * Math.pow(0.85, T.G.s.gup.stroke || 0); }
  function paintMult() { return 4 * Math.pow(2, T.G.s.gup.dense || 0); }

  function doPaint(e, n, painter) {
    const s = T.G.s;
    const pal = T.PALETTE[s.palette];
    const d = e.d;
    let p = d.p || 0;
    const end = Math.min(e.len, p + n);
    const v = T.G.blockValue(d) * paintMult();
    let shown = 0;
    for (; p < end; p++) {
      const x = e.pos[p * 2], y = e.pos[p * 2 + 1];
      const col = pal.fn(x, y);
      if (shown < 5 && T.cam.z > 0.25) {
        shown++;
        flights.push({ e: null, x0: painter.x, y0: painter.y + 16, x1: x, y1: y, t: 0, dur: 0.5 + Math.min(1, Math.hypot(x - painter.x, y) / 900), h: 40, color: col, paint: true,
          onLand: () => { T.world.drawBlock(x, y, col, T.G.isLucky(d, 0) && false); T.fx.splash(x, y, col); } });
      } else T.world.drawBlock(x, y, col, false);
    }
    const painted = end - (d.p || 0);
    d.p = end;
    s.stats.paintBlocks += painted;
    T.G.earn(v * painted);
    return painted;
  }

  function updatePainter(e, dt) {
    commonTimers(e, dt);
    physics(e, dt);
    e.foot -= dt;
    if (e.held || e.y > 0 || e.dizzyT > 0) return;
    switch (e.st) {
      case 'idle':
        e.t -= dt;
        if (e.t <= 0) {
          const f = paintFrontier();
          if (!f) { e.t = 1.5; e.look = [0, 0]; if (Math.random() < 0.2) e.bubble = { text: '다 칠했다!', t: 1.4 }; break; }
          const p = f.d.p || 0;
          e.job = f;
          e.tx = f.pos[p * 2];
          const range = T.G.throwRange() * 1.2;
          if (Math.abs(e.tx - e.x) > range) { e.st = 'walk'; e.walkTo = e.tx - Math.sign(e.tx - e.x) * range * 0.5; }
          else { e.st = 'wind'; e.windT = 0; }
        }
        break;
      case 'walk': {
        const dx = e.walkTo - e.x;
        e.dir = Math.sign(dx) || e.dir;
        const step = T.G.walkSpeed() * 1.4 * dt;
        if (Math.abs(dx) <= step) { e.x = e.walkTo; e.st = 'wind'; e.windT = 0; }
        else e.x += Math.sign(dx) * step;
        if (e.foot <= 0) { e.foot = 0.22; T.fx.footprint(e.x, T.PALETTE[T.G.s.palette].fn(e.x, 200)); }
        break;
      }
      case 'wind':
        e.windT += dt;
        e.sq = 0.2 * Math.min(1, e.windT / 0.3);
        if (e.windT > 0.3) {
          if (e.job && (e.job.d.p || 0) < e.job.len) doPaint(e.job, brushSize(), e);
          const pv = paintCoverageCheck();
          e.vy = 150; e.sq = -0.2; e.st = 'idle'; e.t = strokeTime();
          if (pv) e.happyT = 2;
        }
        break;
    }
    e.look = e.st === 'walk' ? [e.dir, 0] : [0, -1];
  }
  function paintCoverageCheck() {
    const s = T.G.s;
    if (s.palDone[s.palette]) return false;
    let tot = 0;
    for (const e of archs) tot += e.len;
    if (tot < 2000) return false;
    if (T.G.coverage() >= 0.999) {
      s.palDone[s.palette] = 1;
      T.ui.toast(`색 설계도 「${T.PALETTE[s.palette].name}」 완성!  영구 조각 ×1.5`, 'big');
      T.audio.complete();
      T.G.computeMult();
      return true;
    }
    return false;
  }

  // ── update all ───────────────────────────────────────────
  function update(dt) {
    for (const e of archs) updateArch(e, dt);
    for (const e of painters) updatePainter(e, dt);
    for (let i = flights.length - 1; i >= 0; i--) {
      const f = flights[i];
      f.t += dt;
      if (f.t >= f.dur) {
        flights.splice(i, 1);
        f.onLand();
      }
    }
  }

  // ── draw ─────────────────────────────────────────────────
  function drawCreature(ctx, e, kind, color) {
    const [sx, sy] = T.w2s(e.x, e.y);
    if (sx < -60 || sx > T.cam.W + 60 || sy < -80 || sy > T.cam.H + 80) return;
    const ps = P * T.cam.z;
    if (ps < 0.5) {
      ctx.fillStyle = color ? T.shade(kind === 'drop' ? '#7ec8e3' : T.SHAPE[kind].color, -0.2) : '#555';
      const w = Math.max(1.5, 14 * ps);
      ctx.fillRect(sx - w / 2, sy - w, w, w);
      return;
    }
    let face = 'normal';
    if (e.dizzyT > 0) face = 'dizzy';
    else if (e.held || e.surpriseT > 0) face = 'surprise';
    else if (e.happyT > 0) face = 'happy';
    else if (e.blink > 0) face = 'blink';
    let legs = [0, 0];
    const walking = e.st === 'walk' && e.y === 0;
    if (walking) { const ph = Math.sin(e.phase * 14); legs = [ph > 0 ? 1 : 0, ph <= 0 ? 1 : 0]; }
    if (e.held) { const ph = Math.sin(e.phase * 22); legs = [ph > 0 ? 1 : -0.5, ph <= 0 ? 1 : -0.5]; }
    const bob = walking ? Math.abs(Math.sin(e.phase * 14)) * 1.2 * ps : e.st === 'idle' && e.y === 0 ? Math.sin(e.phase * 2.2) * 0.35 * ps : 0;
    let hat = null;
    if (e.d) { const l = e.d.lvl; hat = l >= 25 ? 'crown' : l >= 10 ? 'helmet' : l >= 5 ? 'ribbon' : null; }
    // soft ground shadow
    if (e.y > 2) {
      const [gx, gy] = T.w2s(e.x, 0);
      const k = T.clamp(1 - e.y / 300, 0.2, 1);
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      ctx.fillRect(gx - 7 * ps * k, gy - ps, 14 * ps * k, ps);
    }
    T.sprites.draw(ctx, kind, color, { sx, sy: sy - bob, ps, face, look: e.look, legs, hat, sq: e.sq, dangle: e.held });
    // painter brush
    if (kind === 'drop') {
      const bx = sx + e.dir * 8 * ps, by = sy - 10 * ps - bob;
      ctx.fillStyle = color ? '#8d6748' : '#555';
      ctx.fillRect(bx, by - 7 * ps, ps, 7 * ps);
      ctx.fillStyle = color ? T.PALETTE[T.G.s.palette].fn(e.x, 300) : '#999';
      ctx.fillRect(bx - ps * 0.5, by - 9 * ps, ps * 2, ps * 2.5);
    }
    // petted aura
    if (e.petT > 0 && ps > 1) {
      ctx.fillStyle = color ? 'rgba(242,159,174,0.9)' : 'rgba(120,120,120,0.8)';
      const hx = sx + 9 * ps, hy = sy - 20 * ps - Math.sin(e.phase * 3) * ps;
      const hp = Math.max(1, ps * 0.7);
      ctx.fillRect(hx, hy, hp, hp); ctx.fillRect(hx + 2 * hp, hy, hp, hp);
      ctx.fillRect(hx - hp * 0.0, hy + hp, hp * 3, hp); ctx.fillRect(hx + hp, hy + 2 * hp, hp, hp);
    }
    if (e.bubble && ps > 0.9) drawBubble(ctx, sx, sy - 24 * ps - bob, e.bubble.text, Math.min(1, e.bubble.t * 4));
  }
  function drawBubble(ctx, x, y, text, a) {
    ctx.save();
    ctx.globalAlpha = a;
    ctx.font = '11px Galmuri11, monospace';
    const w = Math.ceil(ctx.measureText(text).width) + 10, h = 17;
    const bx = Math.round(x - w / 2), by = Math.round(y - h);
    ctx.fillStyle = '#2b2b2b';
    ctx.fillRect(bx - 1, by, w + 2, h); ctx.fillRect(bx, by - 1, w, h + 2);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(bx, by, w, h);
    ctx.fillStyle = '#2b2b2b';
    ctx.fillRect(Math.round(x) - 1, by + h + 1, 3, 2);
    ctx.fillRect(Math.round(x), by + h + 3, 1, 1);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(x), by + h, 1, 1);
    ctx.fillStyle = '#2b2b2b';
    ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
    ctx.fillText(text, Math.round(x), by + h / 2 + 1);
    ctx.restore();
  }
  function drawTag(ctx, e) {
    const [sx, sy] = T.w2s(e.x, e.y);
    const ps = P * T.cam.z;
    const text = e.d ? `${e.d.name} · Lv.${e.d.lvl}` : '방울';
    ctx.save();
    ctx.font = '11px Galmuri11, monospace';
    const w = Math.ceil(ctx.measureText(text).width) + 10;
    const bx = Math.round(sx - w / 2), by = Math.round(sy - 22 * ps - 22 - (e.bubble ? 22 : 0));
    ctx.fillStyle = 'rgba(43,43,43,0.88)';
    ctx.fillRect(bx, by, w, 16);
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, Math.round(sx), by + 9);
    ctx.restore();
  }

  function drawFlights(ctx) {
    const z = T.cam.z;
    for (const f of flights) {
      const t = T.easeInOut(Math.min(1, f.t / f.dur));
      const cx = (f.x0 + f.x1) / 2, cy = Math.max(f.y0, f.y1) + f.h;
      const u = 1 - t;
      const x = u * u * f.x0 + 2 * u * t * cx + t * t * f.x1;
      const y = u * u * f.y0 + 2 * u * t * cy + t * t * f.y1;
      const [sx, sy] = T.w2s(x, y);
      if (f.paint) {
        const r = Math.max(1.5, 2.5 * z);
        ctx.fillStyle = f.color;
        ctx.fillRect(sx - r, sy - r, r * 2, r * 2);
      } else {
        const sz = B * z;
        ctx.fillStyle = T.shade(f.color, -0.38);
        ctx.fillRect(sx - sz / 2, sy - sz / 2, sz, sz);
        ctx.fillStyle = f.color;
        ctx.fillRect(sx - sz / 2, sy - sz / 2, sz - Math.max(1, z), sz - Math.max(1, z));
      }
    }
  }

  function draw(ctx) {
    const color = T.G.s.flags.color;
    drawFlights(ctx);
    for (const e of archs) drawCreature(ctx, e, e.d.s, color);
    for (const e of painters) drawCreature(ctx, e, 'drop', color);
    if (hover && !hover.held && T.cam.z > 0.7) drawTag(ctx, hover);
  }

  T.ent = {
    archs, painters, flights, spawnArch, rebuild, syncPainters, update, draw, pick, pet, hold, drag, release, notifyPlayerBlock,
    set hover(v) { hover = v; }, get hover() { return hover; },
    brushSize, strokeTime, paintMult,
  };
})();
