'use strict';
// ─────────────────────────────────────────────────────────────
//  BLUEPRINTS — 배치, 진행, 완공, 도면 시트
// ─────────────────────────────────────────────────────────────
(function () {
  const B = T.B;
  const BP = (T.bp = { placing: null, ghostPos: null });

  const defOf = (b) => T.BLUEPRINT[b.id];
  const cellWorld = (b, ci) => {
    const c = defOf(b).cells[ci];
    return [b.x + c.c * B + B / 2, b.y + c.r * B + B / 2];
  };

  function ensure(b) {
    if (!b.def) Object.defineProperty(b, 'def', { value: defOf(b), enumerable: false, writable: true });
    if (!b.res) Object.defineProperty(b, 'res', { value: new Set(), enumerable: false, writable: true });
    if (!b.t0) Object.defineProperty(b, 't0', { value: performance.now() - 5000, enumerable: false, writable: true });
  }

  BP.unlocked = (def) => def.unlock(T.G.s);
  BP.reward = (def) => def.cells.length * T.G.bestValue() * T.TIERS[def.tier].mult * Math.pow(2, T.G.s.pup.blue || 0);

  BP.startPlacing = function (id) {
    if (T.G.s.bps.active.length >= T.G.bpSlots()) {
      T.ui.toast(`동시에 배치할 수 있는 설계도는 ${T.G.bpSlots()}개입니다.`);
      T.audio.deny();
      return false;
    }
    BP.placing = id;
    document.body.classList.add('placing');
    T.ui.placingHint(true, T.BLUEPRINT[id].name);
    return true;
  };
  BP.cancel = function () {
    BP.placing = null;
    document.body.classList.remove('placing');
    T.ui.placingHint(false);
  };
  BP.ghostAt = function (wx, wy) {
    const def = T.BLUEPRINT[BP.placing];
    let x = Math.round((wx - (def.w * B) / 2) / B) * B;
    let y = Math.round((wy - (def.h * B) / 2) / B) * B;
    if (y < 48) y = 0;
    return [x, y];
  };
  BP.confirm = function (wx, wy) {
    const [x, y] = BP.ghostAt(wx, wy);
    const def = T.BLUEPRINT[BP.placing];
    const b = { id: def.id, x, y, f: new Array(def.cells.length).fill(0), n: 0 };
    ensure(b);
    b.t0 = performance.now();
    T.G.s.bps.active.push(b);
    BP.cancel();
    T.audio.unlock();
    T.ui.toast(`「${def.name}」 설계도를 현장에 펼쳤습니다.`);
  };

  BP.nextCell = function (nearX) {
    let best = null, bestScore = Infinity;
    for (const b of T.G.s.bps.active) {
      ensure(b);
      const def = b.def;
      // lowest row with a free cell
      let row = -1;
      for (let i = 0; i < def.cells.length; i++) {
        if (!b.f[i] && !b.res.has(i)) { row = def.cells[i].r; break; }
      }
      if (row < 0) continue;
      for (let i = 0; i < def.cells.length; i++) {
        const c = def.cells[i];
        if (c.r !== row) { if (c.r > row) break; continue; }
        if (b.f[i] || b.res.has(i)) continue;
        const [x] = cellWorld(b, i);
        const sc = Math.abs(x - nearX) + row * 2;
        if (sc < bestScore) { bestScore = sc; const [cx, cy] = cellWorld(b, i); best = { x: cx, y: cy, bp: b, ci: i }; }
      }
    }
    return best;
  };
  BP.cellFree = (b, ci) => T.G.s.bps.active.includes(b) && !b.f[ci] && !b.res.has(ci);
  BP.reserve = (b, ci) => { ensure(b); b.res.add(ci); };

  function drawCell(b, ci) {
    const def = b.def;
    const c = def.cells[ci];
    const [x, y] = cellWorld(b, ci);
    T.world.drawBlock(x, y, T.G.bpColor(c.ch), false);
  }
  BP.fill = function (b, ci) {
    ensure(b);
    b.res.delete(ci);
    if (!T.G.s.bps.active.includes(b) || b.f[ci]) return;
    b.f[ci] = 1; b.n++;
    drawCell(b, ci);
    if (b.n >= b.def.cells.length) complete(b);
  };
  // player click into a blueprint cell
  BP.playerFill = function (wx, wy) {
    for (const b of T.G.s.bps.active) {
      ensure(b);
      const def = b.def;
      const c = Math.floor((wx - b.x) / B), r = Math.floor((wy - b.y) / B);
      if (c < 0 || r < 0 || c >= def.w || r >= def.h) continue;
      const ci = def.cells.findIndex((q) => q.c === c && q.r === r);
      if (ci < 0 || b.f[ci] || b.res.has(ci)) continue;
      const [x, y] = cellWorld(b, ci);
      BP.fill(b, ci);
      return [x, y];
    }
    return null;
  };

  function complete(b) {
    const s = T.G.s;
    const def = b.def;
    s.bps.active.splice(s.bps.active.indexOf(b), 1);
    s.bps.built.push({ id: b.id, x: b.x, y: b.y });
    const first = !s.bps.done[b.id];
    s.bps.done[b.id] = (s.bps.done[b.id] || 0) + 1;
    s.stats.bpDone++;
    const reward = BP.reward(def);
    T.G.earn(reward);
    T.G.computeMult();
    T.world.drawOutline(def.cells, b.x, b.y, s.flags.color ? '#2a2333' : '#2b2b2b');
    T.fx.complete(b, def, reward, first);
    for (const e of T.ent.archs) {
      if (Math.abs(e.x - (b.x + (def.w * B) / 2)) < 360 && e.y === 0 && !e.held) {
        e.happyT = 2.2; e.vy = 180 + Math.random() * 120;
        if (Math.random() < 0.4) e.bubble = { text: ['완성!', '와아', '♪♪', '멋져!'][Math.floor(Math.random() * 4)], t: 1.8 };
      }
    }
  }

  BP.drawActive = function (b) {
    ensure(b);
    b.res = new Set();
    b.n = 0;
    for (let i = 0; i < b.f.length; i++) if (b.f[i]) { b.n++; drawCell(b, i); }
  };
  BP.drawBuilt = function (b) {
    const def = defOf(b);
    for (const c of def.cells) T.world.drawBlock(b.x + c.c * B + B / 2, b.y + c.r * B + B / 2, T.G.bpColor(c.ch), false);
    T.world.drawOutline(def.cells, b.x, b.y, T.G.s.flags.color ? '#2a2333' : '#2b2b2b');
  };

  // ── sketch texture for world ghosts (rough.js) ───────────
  const ghostCache = new Map();
  function ghostTex(def, color) {
    const key = def.id + (color ? 'c' : 'g');
    if (ghostCache.has(key)) return ghostCache.get(key);
    const sc = 3, pad = 6;
    const cv = document.createElement('canvas');
    cv.width = def.w * B * sc + pad * 2; cv.height = def.h * B * sc + pad * 2;
    const ctx = cv.getContext('2d');
    const ink = color ? '#2f6fb0' : '#6a6a68';
    const set = new Set(def.cells.map((c) => c.c + ',' + c.r));
    const X = (c) => pad + c * B * sc, Y = (r) => cv.height - pad - r * B * sc;
    // cell dashes
    ctx.strokeStyle = color ? 'rgba(47,111,176,0.35)' : 'rgba(90,90,90,0.28)';
    ctx.setLineDash([3, 3]);
    ctx.lineWidth = 1;
    for (const c of def.cells) ctx.strokeRect(X(c.c) + 0.5, Y(c.r + 1) + 0.5, B * sc - 1, B * sc - 1);
    ctx.setLineDash([]);
    // silhouette with rough sketch
    const rc = window.rough ? rough.canvas(cv) : null;
    const seg = [];
    for (const c of def.cells) {
      if (!set.has(c.c + ',' + (c.r + 1))) seg.push([X(c.c), Y(c.r + 1), X(c.c + 1), Y(c.r + 1)]);
      if (!set.has(c.c + ',' + (c.r - 1))) seg.push([X(c.c), Y(c.r), X(c.c + 1), Y(c.r)]);
      if (!set.has(c.c - 1 + ',' + c.r)) seg.push([X(c.c), Y(c.r), X(c.c), Y(c.r + 1)]);
      if (!set.has(c.c + 1 + ',' + c.r)) seg.push([X(c.c + 1), Y(c.r), X(c.c + 1), Y(c.r + 1)]);
    }
    for (const s of seg) {
      if (rc) rc.line(s[0], s[1], s[2], s[3], { stroke: ink, strokeWidth: 1.6, roughness: 0.9, bowing: 0.6, seed: 3 });
      else { ctx.strokeStyle = ink; ctx.beginPath(); ctx.moveTo(s[0], s[1]); ctx.lineTo(s[2], s[3]); ctx.stroke(); }
    }
    const out = { cv, sc, pad };
    ghostCache.set(key, out);
    return out;
  }

  function drawGhostTex(ctx, def, x, y, reveal, alpha) {
    const color = T.G.s.flags.color;
    const g = ghostTex(def, color);
    const [sx, sy] = T.w2s(x, y);
    const z = T.cam.z;
    const w = g.cv.width / g.sc * z, h = g.cv.height / g.sc * z;
    const px = sx - (g.pad / g.sc) * z, py = sy - h + (g.pad / g.sc) * z;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.imageSmoothingEnabled = true;
    if (reveal < 1) {
      ctx.beginPath();
      ctx.rect(px - 4, py + h * (1 - reveal), w + 8, h * reveal + 4);
      ctx.clip();
    }
    ctx.drawImage(g.cv, px, py, w, h);
    ctx.restore();
    // drafting pencil line at the reveal edge
    if (reveal < 1) {
      ctx.fillStyle = color ? 'rgba(47,111,176,0.8)' : 'rgba(60,60,60,0.7)';
      ctx.fillRect(px, py + h * (1 - reveal), w, Math.max(1, z));
    }
  }

  BP.render = function (ctx, now) {
    const color = T.G.s.flags.color;
    const z = T.cam.z;
    for (const b of T.G.s.bps.active) {
      ensure(b);
      const def = b.def;
      const rv = T.easeInOut(T.clamp((now - b.t0) / 1100, 0, 1));
      drawGhostTex(ctx, def, b.x, b.y, rv, 0.95);
      // reserved cells shimmer
      if (z > 0.4) {
        ctx.fillStyle = color ? 'rgba(47,111,176,0.18)' : 'rgba(80,80,80,0.12)';
        for (const ci of b.res) {
          const [cx, cy] = cellWorld(b, ci);
          const [sx, sy] = T.w2s(cx - B / 2, cy + B / 2);
          ctx.fillRect(sx, sy, B * z, B * z);
        }
      }
      // label
      if (z > 0.3 && rv > 0.6) {
        const [lx, ly] = T.w2s(b.x + (def.w * B) / 2, b.y + def.h * B);
        const text = `${def.name}  ${b.n}/${def.cells.length}`;
        ctx.save();
        ctx.font = '11px Galmuri11, monospace';
        const tw = Math.ceil(ctx.measureText(text).width) + 12;
        ctx.globalAlpha = T.clamp((rv - 0.6) * 3, 0, 1);
        ctx.fillStyle = color ? '#1f4e79' : '#3a3a3a';
        ctx.fillRect(Math.round(lx - tw / 2), Math.round(ly - 26), tw, 17);
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(text, Math.round(lx), Math.round(ly - 17));
        // progress bar
        const pw = tw - 8;
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.fillRect(Math.round(lx - pw / 2), Math.round(ly - 12), pw, 2);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(Math.round(lx - pw / 2), Math.round(ly - 12), pw * (b.n / def.cells.length), 2);
        ctx.restore();
      }
    }
    // built plaques
    if (z > 0.55) {
      ctx.save();
      ctx.font = '9px Galmuri9, monospace';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (const b of T.G.s.bps.built) {
        const def = defOf(b);
        if (b.y > 0) continue;
        const [px, py] = T.w2s(b.x + (def.w * B) / 2, 0);
        if (px < -100 || px > T.cam.W + 100) continue;
        const tw = Math.ceil(ctx.measureText(def.name).width) + 10;
        ctx.fillStyle = color ? '#5c5470' : '#5a5a58';
        ctx.fillRect(Math.round(px - tw / 2), Math.round(py + 6 * z), tw, 13);
        ctx.fillStyle = color ? '#f4e9d8' : '#eeeeec';
        ctx.fillText(def.name, Math.round(px), Math.round(py + 6 * z + 7));
      }
      ctx.restore();
    }
    // placement ghost
    if (BP.placing && BP.ghostPos) {
      const def = T.BLUEPRINT[BP.placing];
      const [x, y] = BP.ghostAt(BP.ghostPos[0], BP.ghostPos[1]);
      drawGhostTex(ctx, def, x, y, 1, 0.55 + Math.sin(now / 180) * 0.12);
      const [sx, sy] = T.w2s(x, y);
      ctx.fillStyle = color ? 'rgba(47,111,176,0.07)' : 'rgba(0,0,0,0.04)';
      ctx.fillRect(sx, sy - def.h * B * z, def.w * B * z, def.h * B * z);
    }
  };

  // ── drafting sheet for the modal ─────────────────────────
  BP.renderSheet = function (canvas, def, locked) {
    const color = T.G.s.flags.color;
    const W = canvas.width, H = canvas.height;
    const ctx = canvas.getContext('2d');
    const paper = color ? '#1f4e79' : '#e7e7e4';
    const line = color ? 'rgba(232,241,250,0.95)' : 'rgba(40,40,40,0.9)';
    const fine = color ? 'rgba(232,241,250,0.12)' : 'rgba(0,0,0,0.06)';
    const bold = color ? 'rgba(232,241,250,0.25)' : 'rgba(0,0,0,0.12)';
    ctx.fillStyle = paper; ctx.fillRect(0, 0, W, H);
    // paper grid
    for (let x = 0; x < W; x += 10) { ctx.fillStyle = x % 50 === 0 ? bold : fine; ctx.fillRect(x, 0, 1, H); }
    for (let y = 0; y < H; y += 10) { ctx.fillStyle = y % 50 === 0 ? bold : fine; ctx.fillRect(0, y, W, 1); }
    // fit
    const margin = 56;
    const cs = Math.floor(Math.min((W - margin * 2) / def.w, (H - margin * 2) / def.h));
    const ox = Math.round((W - cs * def.w) / 2), oy = Math.round((H - cs * def.h) / 2) - 6;
    const rc = window.rough ? rough.canvas(canvas) : null;
    const set = new Set(def.cells.map((c) => c.c + ',' + c.r));
    const cx = (c) => ox + c * cs, cy = (r) => oy + (def.h - r) * cs;
    const fills = { '#': 'hachure', '=': 'zigzag', x: 'cross-hatch', o: 'dots' };
    if (locked) ctx.globalAlpha = 0.35;
    for (const c of def.cells) {
      if (rc && cs >= 8) {
        rc.rectangle(cx(c.c) + 1, cy(c.r + 1) + 1, cs - 2, cs - 2, {
          stroke: 'transparent', fill: line, fillStyle: fills[c.ch], fillWeight: 0.6, hachureGap: Math.max(2.5, cs / 4), roughness: 0.6, seed: c.c * 31 + c.r,
        });
      } else {
        ctx.fillStyle = line; ctx.globalAlpha *= 0.4; ctx.fillRect(cx(c.c) + 1, cy(c.r + 1) + 1, cs - 2, cs - 2); ctx.globalAlpha = locked ? 0.35 : 1;
      }
      ctx.strokeStyle = color ? 'rgba(232,241,250,0.3)' : 'rgba(0,0,0,0.2)';
      ctx.lineWidth = 1;
      ctx.strokeRect(cx(c.c) + 0.5, cy(c.r + 1) + 0.5, cs - 1, cs - 1);
    }
    // silhouette
    ctx.strokeStyle = line; ctx.lineWidth = 2;
    for (const c of def.cells) {
      const segs = [];
      if (!set.has(c.c + ',' + (c.r + 1))) segs.push([cx(c.c), cy(c.r + 1), cx(c.c + 1), cy(c.r + 1)]);
      if (!set.has(c.c + ',' + (c.r - 1))) segs.push([cx(c.c), cy(c.r), cx(c.c + 1), cy(c.r)]);
      if (!set.has(c.c - 1 + ',' + c.r)) segs.push([cx(c.c), cy(c.r), cx(c.c), cy(c.r + 1)]);
      if (!set.has(c.c + 1 + ',' + c.r)) segs.push([cx(c.c + 1), cy(c.r), cx(c.c + 1), cy(c.r + 1)]);
      for (const s of segs) {
        if (rc) rc.line(s[0], s[1], s[2], s[3], { stroke: line, strokeWidth: 1.8, roughness: 0.7, bowing: 0.5, seed: 7 });
        else { ctx.beginPath(); ctx.moveTo(s[0], s[1]); ctx.lineTo(s[2], s[3]); ctx.stroke(); }
      }
    }
    ctx.globalAlpha = 1;
    // dimension lines
    ctx.strokeStyle = line; ctx.fillStyle = line; ctx.lineWidth = 1;
    ctx.font = '11px Galmuri11, monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const by = cy(0) + 22;
    dim(ctx, ox, by, ox + cs * def.w, by, `${def.w} 블럭`, paper);
    const rx = ox + cs * def.w + 24;
    dim(ctx, rx, cy(0), rx, cy(def.h), `${def.h}`, paper, true);
    // ground line
    ctx.fillStyle = line;
    for (let x = ox - 20; x < ox + cs * def.w + 20; x += 6) ctx.fillRect(x, cy(0) + 4, 3, 1);
    if (locked) {
      ctx.save();
      ctx.translate(W / 2, H / 2); ctx.rotate(-0.12);
      ctx.strokeStyle = color ? '#ffd166' : '#444'; ctx.lineWidth = 3;
      ctx.strokeRect(-110, -26, 220, 52);
      ctx.fillStyle = color ? '#ffd166' : '#444';
      ctx.font = '22px Galmuri14, monospace';
      ctx.fillText('기밀 · 미해금', 0, 2);
      ctx.restore();
    }
  };
  function dim(ctx, x0, y0, x1, y1, text, bg, vertical) {
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    const a = 4;
    if (!vertical) {
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0 + a, y0 - a); ctx.moveTo(x0, y0); ctx.lineTo(x0 + a, y0 + a);
      ctx.moveTo(x1, y1); ctx.lineTo(x1 - a, y1 - a); ctx.moveTo(x1, y1); ctx.lineTo(x1 - a, y1 + a);
      ctx.moveTo(x0, y0 - 8); ctx.lineTo(x0, y0 + 4); ctx.moveTo(x1, y1 - 8); ctx.lineTo(x1, y1 + 4); ctx.stroke();
    } else {
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0 - a, y0 - a); ctx.moveTo(x0, y0); ctx.lineTo(x0 + a, y0 - a);
      ctx.moveTo(x1, y1); ctx.lineTo(x1 - a, y1 + a); ctx.moveTo(x1, y1); ctx.lineTo(x1 + a, y1 + a);
      ctx.moveTo(x0 - 8, y0); ctx.lineTo(x0 + 4, y0); ctx.moveTo(x1 - 8, y1); ctx.lineTo(x1 + 4, y1); ctx.stroke();
    }
    const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
    const tw = ctx.measureText(text).width + 8;
    ctx.save(); ctx.fillStyle = bg; ctx.fillRect(mx - tw / 2, my - 7, tw, 14); ctx.restore();
    ctx.fillText(text, mx, my + 1);
  }
})();
