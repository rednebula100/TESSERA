'use strict';
// ─────────────────────────────────────────────────────────────
//  WORLD — 카메라, 청크 캐시 렌더링, 블럭 굽기
// ─────────────────────────────────────────────────────────────
(function () {
  const B = T.B;
  const CH = 256;

  const cam = (T.cam = { x: 0, y: 150, z: 2, tx: 0, ty: 150, tz: 2, W: 0, H: 0, dpr: 1 });
  T.w2s = (wx, wy) => [(wx - cam.x) * cam.z + cam.W / 2, cam.H / 2 - (wy - cam.y) * cam.z];
  T.s2w = (sx, sy) => [(sx - cam.W / 2) / cam.z + cam.x, (cam.H / 2 - sy) / cam.z + cam.y];

  const chunks = new Map();
  let count = 0;

  function getChunk(cx, cy) {
    const key = cx + ',' + cy;
    let c = chunks.get(key);
    if (!c) {
      const cv = document.createElement('canvas');
      cv.width = CH; cv.height = CH;
      const ctx = cv.getContext('2d');
      c = { cx, cy, cv, ctx, n: 0, lod: null, lodDirty: true };
      chunks.set(key, c);
    }
    return c;
  }

  const shadeCache = new Map();
  function shades(color) {
    let s = shadeCache.get(color);
    if (!s) {
      s = { base: color, hi: T.shade(color, 0.32), lo: T.shade(color, -0.22), edge: T.shade(color, -0.38) };
      shadeCache.set(color, s);
    }
    return s;
  }

  // draw a block into chunk rasters. x,y = block center (world units, y up)
  let maxR = 0;
  function drawBlock(x, y, color, glow) {
    const dr = Math.hypot(x, y - T.YC);
    if (dr > maxR) maxR = dr;
    const x0 = Math.round(x - B / 2), y1 = Math.round(y + B / 2);
    const cx0 = Math.floor(x0 / CH), cx1 = Math.floor((x0 + B - 1) / CH);
    const cy0 = Math.floor((y1 - B) / CH), cy1 = Math.floor((y1 - 1) / CH);
    const s = shades(color);
    for (let cx = cx0; cx <= cx1; cx++) {
      for (let cy = cy0; cy <= cy1; cy++) {
        const c = getChunk(cx, cy);
        const ctx = c.ctx;
        const px = x0 - cx * CH;
        const py = (cy + 1) * CH - y1;
        ctx.fillStyle = s.edge; ctx.fillRect(px, py, B, B);
        ctx.fillStyle = s.base; ctx.fillRect(px, py, B - 1, B - 1);
        ctx.fillStyle = s.hi; ctx.fillRect(px, py, B - 1, 1); ctx.fillRect(px, py, 1, B - 1);
        ctx.fillStyle = s.lo; ctx.fillRect(px + 1, py + B - 2, B - 2, 1); ctx.fillRect(px + B - 2, py + 1, 1, B - 2);
        if (glow) {
          ctx.fillStyle = '#ffffff'; ctx.fillRect(px + 2, py + 2, 2, 2);
          ctx.fillStyle = T.shade(color, 0.6); ctx.fillRect(px + 4, py + 4, 1, 1);
        }
        c.n++;
        c.lodDirty = true;
      }
    }
    count++;
  }

  // structure outline: a crisp 1px dark line around the silhouette of completed blueprint cells
  function drawOutline(cells, ox, oy, color) {
    const set = new Set(cells.map((c) => c.c + ',' + c.r));
    const pix = [];
    for (const c of cells) {
      const x = ox + c.c * B, y = oy + c.r * B; // bottom-left of cell
      if (!set.has(c.c + ',' + (c.r + 1))) pix.push([x, y + B - 1, B, 1]);
      if (!set.has(c.c + ',' + (c.r - 1))) pix.push([x, y, B, 1]);
      if (!set.has(c.c - 1 + ',' + c.r)) pix.push([x, y, 1, B]);
      if (!set.has(c.c + 1 + ',' + c.r)) pix.push([x + B - 1, y, 1, B]);
    }
    for (const [x, y, w, h] of pix) {
      const X = Math.round(x), Y = Math.round(y);
      const cx = Math.floor(X / CH), cy = Math.floor(Y / CH);
      const c = getChunk(cx, cy);
      c.ctx.fillStyle = color;
      c.ctx.fillRect(X - cx * CH, (cy + 1) * CH - (Y + h), w, h);
    }
  }

  function clear() {
    chunks.clear();
    count = 0;
    maxR = 0;
  }

  function render(ctx) {
    const z = cam.z;
    const [wx0, wy1] = T.s2w(0, 0);
    const [wx1, wy0] = T.s2w(cam.W, cam.H);
    const cx0 = Math.floor(wx0 / CH), cx1 = Math.floor(wx1 / CH);
    const cy0 = Math.max(0, Math.floor(wy0 / CH)), cy1 = Math.floor(wy1 / CH);
    ctx.imageSmoothingEnabled = z < 0.999;
    ctx.imageSmoothingQuality = 'high';
    const size = CH * z;
    const lodRes = z < 0.18 ? 64 : z < 0.45 ? 128 : 0;
    let budget = 12;
    for (const c of chunks.values()) {
      if (c.cx < cx0 || c.cx > cx1 || c.cy < cy0 || c.cy > cy1) continue;
      let img = c.cv;
      if (lodRes) {
        if (!c.lod || c.lod.width !== lodRes || (c.lodDirty && budget > 0)) {
          if (!c.lod || c.lod.width !== lodRes) { c.lod = document.createElement('canvas'); c.lod.width = c.lod.height = lodRes; }
          const lc = c.lod.getContext('2d');
          lc.imageSmoothingEnabled = true; lc.imageSmoothingQuality = 'high';
          lc.clearRect(0, 0, lodRes, lodRes);
          lc.drawImage(c.cv, 0, 0, lodRes, lodRes);
          c.lodDirty = false; budget--;
        }
        img = c.lod;
      }
      const sx = (c.cx * CH - cam.x) * z + cam.W / 2;
      const sy = cam.H / 2 - ((c.cy + 1) * CH - cam.y) * z;
      // snap to pixels when magnified to avoid seams
      if (z >= 1) ctx.drawImage(img, Math.round(sx), Math.round(sy), Math.round(sx + size) - Math.round(sx), Math.round(sy + size) - Math.round(sy));
      else ctx.drawImage(img, sx, sy, size + 0.6, size + 0.6);
    }
    ctx.imageSmoothingEnabled = false;
  }

  let skyCache = null, skyKey = '';
  let haloCache = {};
  function halo(color) {
    const key = color ? 'c' : 'g';
    if (haloCache[key]) return haloCache[key];
    const cv = document.createElement('canvas');
    cv.width = cv.height = 256;
    const g2 = cv.getContext('2d');
    const g = g2.createRadialGradient(128, 128, 0, 128, 128, 128);
    if (color) { g.addColorStop(0, 'rgba(255,248,232,0.95)'); g.addColorStop(0.5, 'rgba(255,244,226,0.45)'); g.addColorStop(1, 'rgba(255,244,226,0)'); }
    else { g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.5, 'rgba(255,255,255,0.5)'); g.addColorStop(1, 'rgba(255,255,255,0)'); }
    g2.fillStyle = g; g2.fillRect(0, 0, 256, 256);
    return (haloCache[key] = cv);
  }
  function drawSky(ctx, color) {
    const W = cam.W, H = cam.H;
    const key = W + 'x' + H + (color ? 'c' : 'g');
    if (key !== skyKey) {
      skyKey = key;
      skyCache = document.createElement('canvas');
      skyCache.width = Math.ceil(W); skyCache.height = Math.ceil(H);
      const c = skyCache.getContext('2d');
      if (color) {
        const g = c.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, '#e9f0f5'); g.addColorStop(0.75, '#f7f3ec'); g.addColorStop(1, '#fbf1e4');
        c.fillStyle = g;
      } else c.fillStyle = '#f6f6f4';
      c.fillRect(0, 0, W, H);
      const vg = c.createRadialGradient(W / 2, H * 0.55, Math.min(W, H) * 0.35, W / 2, H * 0.55, Math.max(W, H) * 0.8);
      vg.addColorStop(0, 'rgba(0,0,0,0)');
      vg.addColorStop(1, color ? 'rgba(70,60,90,0.10)' : 'rgba(0,0,0,0.07)');
      c.fillStyle = vg; c.fillRect(0, 0, W, H);
    }
    ctx.drawImage(skyCache, 0, 0);
    ctx.imageSmoothingEnabled = true;
    // a soft light behind the monument — grows with it
    if (maxR > 60) {
      const [cx, cy] = T.w2s(0, T.YC);
      const r = Math.max(80, maxR * 1.35 * cam.z);
      ctx.globalAlpha = T.clamp(maxR / 1500, 0.15, 1);
      ctx.drawImage(halo(color), cx - r, cy - r, r * 2, r * 2);
      ctx.globalAlpha = 1;
    }
    ctx.imageSmoothingEnabled = false;
    // faint world grid: every 8 blocks
    const step = B * 8;
    const sp = step * cam.z;
    if (sp >= 14) {
      const alpha = T.clamp((sp - 14) / 40, 0, 1) * 0.55;
      ctx.strokeStyle = color ? `rgba(120,140,160,${alpha * 0.22})` : `rgba(0,0,0,${alpha * 0.06})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      const [wx0, wy1] = T.s2w(0, 0);
      const [wx1, wy0] = T.s2w(W, H);
      for (let x = Math.floor(wx0 / step) * step; x <= wx1; x += step) {
        const sx = Math.round((x - cam.x) * cam.z + W / 2) + 0.5;
        ctx.moveTo(sx, 0); ctx.lineTo(sx, H);
      }
      for (let y = Math.max(0, Math.floor(wy0 / step) * step); y <= wy1; y += step) {
        const sy = Math.round(H / 2 - (y - cam.y) * cam.z) + 0.5;
        ctx.moveTo(0, sy); ctx.lineTo(W, sy);
      }
      ctx.stroke();
    }
  }

  function drawFloor(ctx, color) {
    const W = cam.W, H = cam.H;
    const [, gy] = T.w2s(0, 0);
    if (gy > H) return;
    const top = Math.round(gy);
    const z = cam.z;
    const c1 = color ? '#b9b2a6' : '#a9a9a6';
    const c2 = color ? '#a39b8e' : '#979794';
    const c3 = color ? '#8b8376' : '#858582';
    const c4 = color ? '#776f63' : '#737371';
    ctx.fillStyle = c2; ctx.fillRect(0, top, W, H - top);
    ctx.fillStyle = c1; ctx.fillRect(0, top, W, Math.max(1, Math.round(2 * z)));
    // pixel dither texture
    if (z >= 0.45) {
      const [wx0] = T.s2w(0, 0);
      const [wx1] = T.s2w(W, 0);
      const p = Math.max(1, Math.round(z * 2));
      for (let x = Math.floor(wx0 / 4) * 4; x < wx1; x += 4) {
        const hsh = Math.abs(Math.sin(x * 12.9898) * 43758.5453) % 1;
        const sx = Math.round((x - cam.x) * z + W / 2);
        if (hsh < 0.3) { ctx.fillStyle = c3; ctx.fillRect(sx, top + Math.round((2 + hsh * 20) * z), p, p); }
        else if (hsh > 0.86) { ctx.fillStyle = c1; ctx.fillRect(sx, top + Math.round((5 + hsh * 14) * z), p, p); }
      }
    }
    const band = Math.round(40 * z);
    ctx.fillStyle = c3; ctx.fillRect(0, top + band, W, H);
    ctx.fillStyle = c4; ctx.fillRect(0, top + band * 2.2, W, H);
  }

  T.world = { chunks, clear, drawBlock, drawOutline, render, drawSky, drawFloor, get count() { return count; }, get maxR() { return maxR; }, CH };
})();
