'use strict';
// ─────────────────────────────────────────────────────────────
//  WORLD: 카메라, 깊이 레이어(z), 청크 캐시, 하늘(해·달·별·오로라·일식), 바닥
// ─────────────────────────────────────────────────────────────
(function () {
  const B = T.B;
  const CH = 256;
  const cam = (T.cam = { x: 0, y: 150, z: 2, tx: 0, ty: 150, tz: 2, W: 0, H: 0, dpr: 1 });
  // depth layers: farther = smaller, slower, lifted toward the horizon
  T.Z = 0;
  // the depth plane the player is looking at (float while the camera dollies)
  T.focus = 0;
  T.view = () => Math.round(T.focus);
  T.layerK = (z = T.Z) => 1 - 0.13 * z;
  const lift = (z) => z * 26;
  T.w2s = (wx, wy) => { const k = T.layerK(); return [(wx - cam.x) * cam.z * k + cam.W / 2, cam.H / 2 - ((wy - cam.y) * k + lift(T.Z)) * cam.z]; };
  T.s2w = (sx, sy) => { const k = T.layerK(); return [(sx - cam.W / 2) / (cam.z * k) + cam.x, ((cam.H / 2 - sy) / cam.z - lift(T.Z)) / k + cam.y]; };

  const maps = new Map(); // `${z}|${layer}` -> Map(chunks)
  const mapOf = (layer, z) => { const k = z + '|' + layer; let m = maps.get(k); if (!m) { m = new Map(); maps.set(k, m); } return m; };
  let maxR = 0;

  function getChunk(layer, z, cx, cy) {
    const map = mapOf(layer, z);
    const key = cx + ',' + cy;
    let c = map.get(key);
    if (!c) {
      const cv = document.createElement('canvas');
      cv.width = CH; cv.height = CH;
      c = { cx, cy, cv, ctx: cv.getContext('2d'), lod: null, lodDirty: true };
      map.set(key, c);
    }
    return c;
  }
  const shadeCache = new Map();
  function shades(color) {
    let s = shadeCache.get(color);
    if (!s) { s = { base: color, hi: T.shade(color, 0.3), lo: T.shade(color, -0.2), edge: T.shade(color, -0.36) }; shadeCache.set(color, s); if (shadeCache.size > 6000) shadeCache.clear(); }
    return s;
  }
  // run fn(ctx, px, py) on every chunk touched by an 8×8 cell whose bottom-left is (x0,y0)
  function eachChunk(x0, y0, layer, z, fn) {
    const X0 = Math.round(x0), Y1 = Math.round(y0) + B;
    const cx0 = Math.floor(X0 / CH), cx1 = Math.floor((X0 + B - 1) / CH);
    const cy0 = Math.floor((Y1 - B) / CH), cy1 = Math.floor((Y1 - 1) / CH);
    for (let cx = cx0; cx <= cx1; cx++) for (let cy = cy0; cy <= cy1; cy++) {
      const c = getChunk(layer, z, cx, cy);
      fn(c.ctx, X0 - cx * CH, (cy + 1) * CH - Y1);
      c.lodDirty = true;
    }
  }
  // classic bevelled block. x,y = centre
  function drawBlock(x, y, color, glow, layer = 'front', z = 0) {
    const s = shades(color);
    eachChunk(x - B / 2, y - B / 2, layer, z, (ctx, px, py) => {
      ctx.fillStyle = s.edge; ctx.fillRect(px, py, B, B);
      ctx.fillStyle = s.base; ctx.fillRect(px, py, B - 1, B - 1);
      ctx.fillStyle = s.hi; ctx.fillRect(px, py, B - 1, 1); ctx.fillRect(px, py, 1, B - 1);
      ctx.fillStyle = s.lo; ctx.fillRect(px + 1, py + B - 2, B - 2, 1); ctx.fillRect(px + B - 2, py + 1, 1, B - 2);
      if (glow) { ctx.fillStyle = '#ffffff'; ctx.fillRect(px + 2, py + 2, 2, 2); }
    });
    if (layer === 'front' && z === 0) { const dr = Math.abs(x) + y * 0.6; if (dr > maxR) maxR = dr; }
  }
  // a split block: R×R cells, colours listed top-left first (null = empty, undefined = leave as is)
  function drawCells(x0, y0, R, colors, layer = 'front', z = 0, overlay) {
    const s = B / R;
    eachChunk(x0, y0, layer, z, (ctx, px, py) => {
      for (let k = 0; k < colors.length; k++) {
        const c = colors[k];
        if (c === undefined) continue;
        const i = k % R, j = Math.floor(k / R);
        if (c === null) { if (overlay) ctx.clearRect(px + i * s, py + j * s, s, s); continue; }
        ctx.fillStyle = c; ctx.fillRect(px + i * s, py + j * s, s, s);
        if (R === 2) { ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(px + i * s, py + j * s, s, 1); ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(px + i * s, py + j * s + s - 1, s, 1); }
      }
    });
  }
  function clearCell(x0, y0, layer = 'front', z = 0) { eachChunk(x0, y0, layer, z, (ctx, px, py) => ctx.clearRect(px, py, B, B)); }
  function clear() { maps.clear(); maxR = 0; }
  function clearRange(x0, x1) {
    const a = Math.floor(x0 / CH), b = Math.floor(x1 / CH);
    for (const m of maps.values()) for (const [k, c] of m) if (c.cx >= a && c.cx <= b) m.delete(k);
    return [a * CH, (b + 1) * CH];
  }

  function render(ctx, layer = 'front', alpha = 1, z = 0) {
    const map = maps.get(z + '|' + layer);
    if (!map || !map.size) return;
    const k = T.layerK(z);
    const zz = cam.z * k;
    const [wx0, wy1] = T.s2w(0, 0), [wx1, wy0] = T.s2w(cam.W, cam.H);
    const cx0 = Math.floor(wx0 / CH), cx1 = Math.floor(wx1 / CH), cy0 = Math.floor(wy0 / CH), cy1 = Math.floor(wy1 / CH);
    ctx.imageSmoothingEnabled = zz < 0.999;
    ctx.imageSmoothingQuality = 'high';
    if (alpha < 1) ctx.globalAlpha = alpha;
    const size = CH * zz;
    const lodRes = zz < 0.18 ? 64 : zz < 0.45 ? 128 : 0;
    let budget = 12;
    for (const c of map.values()) {
      if (c.cx < cx0 || c.cx > cx1 || c.cy < cy0 || c.cy > cy1) continue;
      let img = c.cv;
      if (lodRes) {
        if (!c.lod || c.lod.width !== lodRes || (c.lodDirty && budget > 0)) {
          if (!c.lod || c.lod.width !== lodRes) { c.lod = document.createElement('canvas'); c.lod.width = c.lod.height = lodRes; }
          const lc = c.lod.getContext('2d');
          lc.imageSmoothingEnabled = true; lc.imageSmoothingQuality = 'high';
          lc.clearRect(0, 0, lodRes, lodRes); lc.drawImage(c.cv, 0, 0, lodRes, lodRes);
          c.lodDirty = false; budget--;
        }
        img = c.lod;
      }
      const [sx, sy] = T.w2s(c.cx * CH, (c.cy + 1) * CH);
      if (zz >= 1) ctx.drawImage(img, Math.round(sx), Math.round(sy), Math.round(sx + size) - Math.round(sx), Math.round(sy + size) - Math.round(sy));
      else ctx.drawImage(img, sx, sy, size + 0.6, size + 0.6);
    }
    ctx.globalAlpha = 1;
    ctx.imageSmoothingEnabled = false;
  }

  // ── glow sprite (shared) ─────────────────────────────────
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

  // ── sky ──────────────────────────────────────────────────
  let skyCache = null, skyKey = '';
  const stars = [];
  for (let i = 0; i < 220; i++) stars.push({ x: Math.random(), y: Math.random() * 0.72, s: Math.random() < 0.08 ? 2 : 1, ph: Math.random() * 6, col: ['#fffbe8', '#dfe8ff', '#ffe6cf', '#ffffff'][i % 4] });
  const shooting = [];
  // pixel sprites for sun and moon (drawn small, scaled up crisp)
  const pixCache = {};
  function sunSprite(eclipse) {
    const key = 'sun' + eclipse;
    if (pixCache[key]) return pixCache[key];
    const cv = document.createElement('canvas'); cv.width = cv.height = 24;
    const g = cv.getContext('2d');
    for (let y = 0; y < 24; y++) for (let x = 0; x < 24; x++) {
      const d = Math.hypot(x - 11.5, y - 11.5);
      if (d < 7) g.fillStyle = eclipse ? '#1a1a22' : d < 5 ? '#fff4c8' : '#ffd36b';
      else if (d < 8.2 && eclipse) g.fillStyle = '#fff6d8';
      else if (!eclipse && d < 11 && ((x + y) % 4 === 0) && (Math.abs(x - 11.5) < 1.5 || Math.abs(y - 11.5) < 1.5 || Math.abs(Math.abs(x - 11.5) - Math.abs(y - 11.5)) < 1.2)) g.fillStyle = '#ffd36b';
      else continue;
      g.fillRect(x, y, 1, 1);
    }
    return (pixCache[key] = cv);
  }
  function moonSprite(phase) { // phase 0..7 (0 new, 4 full)
    const key = 'moon' + phase;
    if (pixCache[key]) return pixCache[key];
    const cv = document.createElement('canvas'); cv.width = cv.height = 18;
    const g = cv.getContext('2d');
    const f = phase / 8; // 0..1 around the cycle
    const lit = (x, y) => {
      const dx = (x - 8.5) / 7, dy = (y - 8.5) / 7;
      if (dx * dx + dy * dy > 1) return null;
      const t = Math.cos(f * Math.PI * 2); // 1 = new, -1 = full
      const edge = Math.sqrt(Math.max(0, 1 - dy * dy)) * t;
      const right = f < 0.5; // waxing: lit on the right
      const on = right ? dx > edge : dx < -edge;
      return on ? 'lit' : 'dark';
    };
    for (let y = 0; y < 18; y++) for (let x = 0; x < 18; x++) {
      const l = lit(x, y);
      if (!l) continue;
      g.fillStyle = l === 'lit' ? ((x * 7 + y * 3) % 11 === 0 ? '#d9d6c4' : '#f4f1de') : 'rgba(40,44,70,0.85)';
      g.fillRect(x, y, 1, 1);
    }
    return (pixCache[key] = cv);
  }

  function drawSky(ctx, color, sky) {
    const W = cam.W, H = cam.H;
    const night = sky.night || 0;
    const key = W + 'x' + H + (color ? 'c' : 'g');
    if (key !== skyKey) {
      skyKey = key;
      skyCache = document.createElement('canvas'); skyCache.width = Math.ceil(W); skyCache.height = Math.ceil(H);
      const c = skyCache.getContext('2d');
      if (color) { const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#e6eef5'); g.addColorStop(0.75, '#f7f3ec'); g.addColorStop(1, '#fbf1e4'); c.fillStyle = g; }
      else c.fillStyle = '#f6f6f4';
      c.fillRect(0, 0, W, H);
      const vg = c.createRadialGradient(W / 2, H * 0.55, Math.min(W, H) * 0.35, W / 2, H * 0.55, Math.max(W, H) * 0.8);
      vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, color ? 'rgba(70,60,90,0.10)' : 'rgba(0,0,0,0.07)');
      c.fillStyle = vg; c.fillRect(0, 0, W, H);
    }
    ctx.drawImage(skyCache, 0, 0);
    const t = sky.t || 0;
    if (sky.day) {
      // dusk / dawn warmth
      const dusk = sky.dusk || 0;
      if (dusk > 0.01 && color) { const g = ctx.createLinearGradient(0, H * 0.3, 0, H); g.addColorStop(0, 'rgba(255,170,120,0)'); g.addColorStop(1, `rgba(255,150,110,${0.35 * dusk})`); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
      if (night > 0.01) { ctx.fillStyle = color ? `rgba(20,24,56,${0.84 * night})` : `rgba(26,26,30,${0.8 * night})`; ctx.fillRect(0, 0, W, H); }
      if (sky.event === 'eclipse') { ctx.fillStyle = 'rgba(20,20,40,0.45)'; ctx.fillRect(0, 0, W, H); }
      // stars
      if (night > 0.05) {
        for (const s of stars) {
          ctx.globalAlpha = night * (0.35 + 0.65 * Math.abs(Math.sin(t * 0.9 + s.ph)));
          ctx.fillStyle = s.col;
          const x = Math.round(s.x * W), y = Math.round(s.y * H);
          ctx.fillRect(x, y, s.s, s.s);
          if (s.s === 2 && Math.sin(t * 0.9 + s.ph) > 0.92) { ctx.fillRect(x - 2, y, 6, 1); ctx.fillRect(x, y - 2, 1, 6); }
        }
        ctx.globalAlpha = 1;
        if (Math.random() < 0.004 * night) shooting.push({ x: Math.random() * W, y: Math.random() * H * 0.3, vx: -300 - Math.random() * 200, vy: 120 + Math.random() * 80, life: 0.7 });
        for (let i = shooting.length - 1; i >= 0; i--) {
          const s = shooting[i]; s.life -= 1 / 60; s.x += s.vx / 60; s.y += s.vy / 60;
          if (s.life <= 0) { shooting.splice(i, 1); continue; }
          ctx.strokeStyle = `rgba(255,255,240,${s.life * night})`; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x - s.vx * 0.06, s.y - s.vy * 0.06); ctx.stroke();
        }
      }
      // aurora ribbons
      if (sky.event === 'aurora' && night > 0.3) {
        for (let band = 0; band < 3; band++) {
          for (let x = 0; x < W; x += 4) {
            const y = H * (0.12 + band * 0.06) + Math.sin(x * 0.006 + t * 0.6 + band) * 30 + Math.sin(x * 0.017 - t * 0.9) * 12;
            const hgt = 60 + Math.sin(x * 0.01 + t + band * 2) * 30;
            const g = ctx.createLinearGradient(0, y, 0, y + hgt);
            const c1 = band === 1 ? '178,120,255' : '90,255,170';
            g.addColorStop(0, `rgba(${c1},0)`); g.addColorStop(0.6, `rgba(${c1},${0.22 * night})`); g.addColorStop(1, `rgba(${c1},0)`);
            ctx.fillStyle = g; ctx.fillRect(x, y, 4, hgt);
          }
        }
      }
      // sun and moon on an arc
      ctx.imageSmoothingEnabled = false;
      const arc = (p) => [W * (0.08 + 0.84 * p), H * (0.62 - Math.sin(p * Math.PI) * 0.48)];
      if (sky.sunP >= 0 && sky.sunP <= 1) { const [x, y] = arc(sky.sunP); const sz = 72; ctx.drawImage(sunSprite(sky.event === 'eclipse'), x - sz / 2, y - sz / 2, sz, sz); if (sky.event === 'eclipse') { ctx.globalAlpha = 0.5 + Math.sin(t * 3) * 0.2; ctx.drawImage(glowSprite('rgba(255,250,220,1)'), x - 60, y - 60, 120, 120); ctx.globalAlpha = 1; } }
      if (sky.moonP >= 0 && sky.moonP <= 1) { const [x, y] = arc(sky.moonP); const sz = 54; ctx.globalAlpha = Math.max(0.3, night); ctx.drawImage(glowSprite('rgba(230,235,255,1)'), x - 46, y - 46, 92, 92); ctx.drawImage(moonSprite(sky.phase), x - sz / 2, y - sz / 2, sz, sz); ctx.globalAlpha = 1; }
    } else if (maxR > 60) {
      const [cx, cy] = T.w2s(0, 60);
      const r = Math.max(80, maxR * 1.1 * cam.z);
      ctx.globalAlpha = T.clamp(maxR / 2500, 0.1, 0.5); ctx.imageSmoothingEnabled = true;
      ctx.drawImage(glowSprite(color ? 'rgba(255,248,232,0.9)' : 'rgba(255,255,255,0.9)'), cx - r, cy - r, r * 2, r * 2);
      ctx.imageSmoothingEnabled = false; ctx.globalAlpha = 1;
    }
    // faint grid
    const step = B * 8, sp = step * cam.z;
    if (sp >= 14 && night < 0.5) {
      const alpha = T.clamp((sp - 14) / 40, 0, 1) * 0.55 * (1 - night * 2);
      ctx.strokeStyle = color ? `rgba(120,140,160,${alpha * 0.2})` : `rgba(0,0,0,${alpha * 0.055})`;
      ctx.lineWidth = 1; ctx.beginPath();
      const [wx0, wy1] = T.s2w(0, 0), [wx1, wy0] = T.s2w(W, H);
      for (let x = Math.floor(wx0 / step) * step; x <= wx1; x += step) { const sx = Math.round((x - cam.x) * cam.z + W / 2) + 0.5; ctx.moveTo(sx, 0); ctx.lineTo(sx, H); }
      for (let y = Math.max(0, Math.floor(wy0 / step) * step); y <= wy1; y += step) { const sy = Math.round(H / 2 - (y - cam.y) * cam.z) + 0.5; ctx.moveTo(0, sy); ctx.lineTo(W, sy); }
      ctx.stroke();
    }
  }
  // haze laid over farther layers so depth reads clearly
  function fog(ctx, color, night, amt) {
    ctx.fillStyle = night > 0.5 ? `rgba(24,28,60,${amt})` : color ? `rgba(236,238,242,${amt})` : `rgba(240,240,238,${amt})`;
    ctx.fillRect(0, 0, cam.W, cam.H);
  }

  // ── floor ────────────────────────────────────────────────
  const FLOORS = {
    stone: { c: ['#b9b2a6', '#a39b8e', '#8b8376', '#776f63'], g: ['#a9a9a6', '#979794', '#858582', '#737371'] },
    grass: { c: ['#8fc06a', '#a39b8e', '#8b8376', '#776f63'], g: ['#b0b0ad', '#979794', '#858582', '#737371'] },
    path: { c: ['#86b862', '#a8987f', '#8b7c66', '#74675a'], g: ['#adadaa', '#999996', '#868683', '#727270'] },
    cobble: { c: ['#7fb25d', '#9f9a92', '#878177', '#6f6a62'], g: ['#ababa8', '#979794', '#848481', '#70706e'] },
    town: { c: ['#79ab58', '#a4a29c', '#8a877f', '#706d66'], g: ['#aaaaa7', '#989895', '#858582', '#71716f'] },
  };
  const paint = new Map();
  function stain(x, col, amt = 1) {
    const k = Math.floor(x / 4);
    for (let d = -1; d <= 1; d++) {
      const e = paint.get(k + d) || { col, n: 0 };
      if (d === 0) e.col = col;
      e.n = Math.min(60, e.n + amt * (d === 0 ? 1 : 0.4));
      paint.set(k + d, e);
    }
  }
  function drawFloor(ctx, color, era = 0, night = 0, z = 0) {
    const W = cam.W, H = cam.H;
    const zz = cam.z * T.layerK(z);
    const [, gy] = T.w2s(0, 0);
    if (gy > H) return;
    const top = Math.round(gy);
    const f = FLOORS[(T.ERAS[era] || T.ERAS[0]).floor];
    const p = color ? f.c : f.g;
    ctx.fillStyle = p[1]; ctx.fillRect(0, top, W, H - top);
    const [wx0] = T.s2w(0, 0), [wx1] = T.s2w(W, 0);
    if (z === 0 && paint.size && color) {
      for (const [k, e] of paint) {
        const x = k * 4;
        if (x < wx0 - 8 || x > wx1 + 8) continue;
        const [sx] = T.w2s(x, 0);
        ctx.globalAlpha = T.clamp(0.25 + e.n / 60, 0.25, 0.85);
        ctx.fillStyle = e.col; ctx.fillRect(Math.floor(sx), top, Math.ceil(4 * zz) + 1, (2 + e.n * 0.55) * zz);
        ctx.globalAlpha = 1;
      }
    }
    ctx.fillStyle = p[0]; ctx.fillRect(0, top, W, Math.max(1, Math.round((era >= 1 ? 3 : 2) * zz)));
    if (zz >= 0.45) {
      const ps = Math.max(1, Math.round(zz * 2));
      for (let x = Math.floor(wx0 / 4) * 4; x < wx1; x += 4) {
        const hsh = Math.abs(Math.sin(x * 12.9898 + z * 7) * 43758.5453) % 1;
        const [sx] = T.w2s(x, 0);
        if (era >= 1 && color && hsh < 0.22) { ctx.fillStyle = p[0]; ctx.fillRect(Math.round(sx), top - ps, ps, ps); }
        if (hsh < 0.3) { ctx.fillStyle = p[2]; ctx.fillRect(Math.round(sx), top + Math.round((3 + hsh * 20) * zz), ps, ps); }
        else if (hsh > 0.86) { ctx.fillStyle = p[0]; ctx.fillRect(Math.round(sx), top + Math.round((6 + hsh * 14) * zz), ps, ps); }
      }
    }
    const band = Math.round(40 * zz);
    ctx.fillStyle = p[2]; ctx.fillRect(0, top + band, W, H);
    ctx.fillStyle = p[3]; ctx.fillRect(0, top + band * 2.2, W, H);
    if (night > 0.01) { ctx.fillStyle = `rgba(14,16,40,${0.55 * night})`; ctx.fillRect(0, top, W, H - top); }
  }

  T.world = { clear, clearRange, clearCell, drawBlock, drawCells, render, drawSky, drawFloor, fog, stain, paint, glowSprite, get maxR() { return maxR; }, CH };
})();
