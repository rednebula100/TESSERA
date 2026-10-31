'use strict';
// ─────────────────────────────────────────────────────────────
//  PIXELART: 재질 기반 픽셀 아트 엔진
//  1 월드 단위 = 1 픽셀, 블럭 = 8×8 픽셀. y=0 은 바닥 바로 위, 음수는 땅속.
//  재질마다 색조 이동 램프(T.ramp) + 질감 + 자동 외곽선/명암으로 최종 색을 정합니다.
// ─────────────────────────────────────────────────────────────
(function () {
  const H = (x, y, s = 0) => {
    let h = (x * 374761393 + y * 668265263 + s * 2246822519) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
  // tex(x, y, n) -> ramp offset (-2..+2)
  const M = {
    stone: { c: '#bdb3a3', tex(x, y) { const row = Math.floor(y / 4), off = row % 2 ? 3 : 0; if (y % 4 === 0 || (x + off) % 6 === 0) return -1; return H(Math.floor((x + off) / 6), row, 1) < 0.3 ? 1 : H(Math.floor((x + off) / 6), row, 2) < 0.2 ? -1 : 0; } },
    dstone: { c: '#8f8578', tex(x, y) { const row = Math.floor(y / 4), off = row % 2 ? 3 : 0; if (y % 4 === 0 || (x + off) % 6 === 0) return -1; return H(Math.floor((x + off) / 6), row, 3) < 0.3 ? 1 : 0; } },
    marble: { c: '#e7e2d8', tex(x, y, n) { return n < 0.05 ? -1 : 0; } },
    brick: { c: '#b4603f', tex(x, y) { const row = Math.floor(y / 3), off = row % 2 ? 2 : 0; if (y % 3 === 0) return 2; if ((x + off) % 5 === 0) return 2; return H(Math.floor((x + off) / 5), row, 4) < 0.25 ? -1 : 0; } },
    plaster: { c: '#efe4cc', tex(x, y, n) { return n < 0.06 ? -1 : 0; } },
    timber: { c: '#5b3f2c', tex(x, y, n) { return n < 0.12 ? 1 : 0; } },
    wood: { c: '#a8714a', tex(x, y, n) { return x % 3 === 0 ? -1 : n < 0.07 ? -1 : 0; } },
    plank: { c: '#b07c50', tex(x, y, n) { return y % 3 === 0 ? -1 : n < 0.06 ? -1 : 0; } },
    roof: { c: '#c4553b', tex(x, y) { if (y % 3 === 0) return -1; return (x + Math.floor(y / 3) * 2) % 4 === 0 ? -1 : 0; } },
    slate: { c: '#5f6f82', tex(x, y) { if (y % 3 === 0) return -1; return (x + Math.floor(y / 3) * 3) % 5 === 0 ? 1 : 0; } },
    thatch: { c: '#d8b257', tex(x, y, n) { if (y % 4 === 0) return -1; return (x + Math.floor(n * 3)) % 3 === 0 ? -1 : n > 0.85 ? 1 : 0; } },
    glass: { c: '#9fd3e6', glow: 1, tex(x, y) { return (x - y + 100) % 5 === 0 ? 2 : 0; } },
    door: { c: '#7a4a2c', tex(x, y, n) { return x % 3 === 0 ? -1 : n < 0.05 ? 1 : 0; } },
    leaf: { c: '#5fa54a', tex(x, y, n) { const c = H(Math.floor(x / 3), Math.floor(y / 3), 5); const b = c < 0.3 ? 1 : c > 0.75 ? -1 : 0; return n < 0.12 ? b - 1 : n > 0.92 ? b + 1 : b; } },
    dleaf: { c: '#3f7f3c', tex(x, y, n) { const c = H(Math.floor(x / 3), Math.floor(y / 3), 6); return (c < 0.3 ? 1 : 0) + (n < 0.12 ? -1 : 0); } },
    trunk: { c: '#7b5537', tex(x, y, n) { return x % 2 === 0 ? -1 : n < 0.1 ? 1 : 0; } },
    grass: { c: '#7cbf5a', tex(x, y, n) { return n < 0.3 ? 1 : n > 0.9 ? -1 : 0; } },
    path: { c: '#a8987f', tex(x, y, n) { return n < 0.2 ? -1 : n > 0.85 ? 1 : 0; } },
    water: { c: '#5aa9d6', flat: 1, tex(x, y) { return y % 3 === 0 && (x + y * 2) % 7 < 3 ? 2 : (x + y) % 9 === 0 ? 1 : 0; } },
    metal: { c: '#56606b', tex(x, y, n) { return n < 0.1 ? 1 : 0; } },
    gold: { c: '#e2b23c', tex(x, y, n) { return n < 0.15 ? 2 : 0; } },
    red: { c: '#d64545', tex() { return 0; } },
    white: { c: '#f4efe6', tex() { return 0; } },
    blue: { c: '#4f7cc0', tex() { return 0; } },
    purple: { c: '#8e7cc3', tex() { return 0; } },
    flower: { c: '#f08aa8', flat: 1, tex(x, y, n) { return n < 0.3 ? 1 : 0; } },
    flower2: { c: '#ffd166', flat: 1, tex(x, y, n) { return n < 0.3 ? 1 : 0; } },
    flower3: { c: '#b39ddb', flat: 1, tex(x, y, n) { return n < 0.3 ? 1 : 0; } },
    flame: { c: '#ffb43a', glow: 2, flat: 1, tex(x, y, n) { return n < 0.4 ? 2 : n < 0.7 ? 1 : 0; } },
    ink: { c: '#2b2b2b', flat: 1, tex() { return 0; } },
    blush: { c: '#f29fae', flat: 1, tex() { return 0; } },
    cloud: { c: '#f6f7fb', tex(x, y, n) { return n < 0.1 ? -1 : 0; } },
    straw: { c: '#e2c27a', tex(x, y, n) { return (x + y) % 3 === 0 ? -1 : 0; } },
  };
  const MATS = Object.keys(M);
  const MID = {}; MATS.forEach((k, i) => { MID[k] = i + 1; M[k].ramp = T.ramp(M[k].c); M[k].id = i + 1; });
  T.MAT = M;

  class Px {
    constructor(w, h, sink = 0) { this.w = w; this.h = h; this.sink = sink; this.d = new Map(); }
    k(x, y) { return x + ',' + y; }
    set(x, y, mat) { x = Math.round(x); y = Math.round(y); if (x < 0 || x >= this.w || y >= this.h || y < -this.sink) return; if (!mat) this.d.delete(this.k(x, y)); else this.d.set(this.k(x, y), mat); }
    get(x, y) { return this.d.get(this.k(x, y)) || null; }
    rect(x, y, w, h, mat) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.set(i, j, mat); return this; }
    clear(x, y, w, h) { return this.rect(x, y, w, h, null); }
    line(x0, y0, x1, y1, mat, th = 1) {
      const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
      for (let i = 0; i <= n; i++) { const x = x0 + ((x1 - x0) * i) / n, y = y0 + ((y1 - y0) * i) / n; this.rect(Math.round(x - (th - 1) / 2), Math.round(y - (th - 1) / 2), th, th, mat); }
      return this;
    }
    ellipse(cx, cy, rx, ry, mat, rng, rough = 0) {
      for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y++)
        for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x++) {
          const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
          if (dx * dx + dy * dy <= 1 - (rng ? (rng() - 0.5) * rough : 0)) this.set(x, y, mat);
        }
      return this;
    }
    // gable roof: base [x0,x1] at row y0, rising `rise` px per px inward
    roof(x0, x1, y0, mat, rise = 1, eave = 2, ridge = null) {
      let a = x0 - eave, b = x1 + eave, y = y0;
      while (a <= b) { this.rect(a, y, b - a + 1, 1, mat); y++; if ((y - y0) % rise === 0) { a++; b--; } }
      if (ridge) this.rect(x0 - eave, y0, x1 - x0 + 1 + eave * 2, 1, ridge);
      return y;
    }
    arch(cx, y0, hw, legH, mat = null) {
      this.rect(Math.round(cx - hw), y0, Math.round(hw * 2), legH, mat);
      for (let dy = 0; dy <= hw; dy++) { const w = Math.sqrt(Math.max(0, hw * hw - dy * dy)); this.rect(Math.round(cx - w), y0 + legH + dy, Math.round(w * 2), 1, mat); }
      return this;
    }
    // framed window with a cross bar
    win(x, y, w, h, frame = 'timber', cross = true) {
      this.rect(x - 1, y - 1, w + 2, h + 2, frame);
      this.rect(x, y, w, h, 'glass');
      if (cross && w >= 4) this.rect(x + Math.floor(w / 2), y, 1, h, frame);
      if (cross && h >= 5) this.rect(x, y + Math.floor(h / 2), w, 1, frame);
      return this;
    }
    door(x, y, w, h, round = true) {
      this.rect(x - 1, y, w + 2, h + 1, 'timber');
      this.rect(x, y, w, h, 'door');
      if (round) { this.set(x, y + h - 1, 'timber'); this.set(x + w - 1, y + h - 1, 'timber'); }
      this.set(x + w - 2, y + Math.floor(h / 2), 'gold');
      return this;
    }
    mirror(cx) { for (const [k, m] of [...this.d]) { const [x, y] = k.split(',').map(Number); if (x < cx) this.set(2 * cx - x - 1, y, m); } return this; }
    paintIf(fn) { for (const [k, m] of [...this.d]) { const [x, y] = k.split(',').map(Number); const n = fn(x, y, m); if (n !== undefined) this.set(x, y, n); } return this; }
  }
  T.Px = Px;

  // ── finalize to colours ──────────────────────────────────
  const SHADE_UNDER = { roof: 1, slate: 1, thatch: 1, leaf: 1, cloth: 1, red: 1, white: 1, blue: 1 };
  function finalize(px) {
    const col = new Map();
    let minx = Infinity, maxx = -Infinity, miny = Infinity, maxy = -Infinity;
    for (const [k, m] of px.d) {
      const [x, y] = k.split(',').map(Number);
      minx = Math.min(minx, x); maxx = Math.max(maxx, x); miny = Math.min(miny, y); maxy = Math.max(maxy, y);
      const mat = M[m];
      if (!mat) continue;
      let idx = 2 + mat.tex(x, y, H(x, y, 9));
      if (!mat.flat) {
        const up = px.get(x, y + 1), dn = px.get(x, y - 1), lf = px.get(x - 1, y), rt = px.get(x + 1, y);
        if (!up) idx += 1;
        if (!lf) idx += 1;
        if (!rt) idx = Math.min(idx, 1) - (dn ? 0 : 1);
        if (!dn && y !== 0) idx = Math.min(idx, 1);
        if (up && up !== m && SHADE_UNDER[up]) idx -= 1;
        if (!up || !lf) idx = Math.max(idx, 3);
        if ((!rt || (!dn && y !== 0)) && (lf && up)) idx = 0;
      }
      col.set(k, mat.ramp[T.clamp(idx, 0, 4)]);
    }
    return { col, minx, maxx, miny, maxy };
  }

  // ── block extraction ─────────────────────────────────────
  // returns shape: { w, h, sink (blocks), blocks:[{c,r}], colorAt(i,res)->[colors], glow:[[x,y]], px }
  T.toShape = function (px) {
    const B = 8;
    const f = finalize(px);
    const ox = f.minx; // shift so x starts at 0
    const sinkPx = Math.max(0, -f.miny);
    const sinkB = Math.ceil(sinkPx / B);
    const pix = new Map();
    for (const [k, c] of f.col) { const [x, y] = k.split(',').map(Number); pix.set((x - ox) + ',' + y, c); }
    const wPx = f.maxx - ox + 1, hPx = f.maxy + 1;
    const W = Math.ceil(wPx / B), Hh = Math.ceil(hPx / B);
    const blocks = [];
    for (let r = -sinkB; r < Hh; r++)
      for (let c = 0; c < W; c++) {
        let n = 0;
        for (let y = 0; y < B; y++) for (let x = 0; x < B; x++) if (pix.has((c * B + x) + ',' + (r * B + y))) n++;
        if (n > 0) blocks.push({ c, r, n });
      }
    blocks.sort((a, b) => a.r - b.r || a.c - b.c);
    const cache = new Map();
    function colorAt(i, res) {
      const key = i * 16 + res;
      let out = cache.get(key);
      if (out) return out;
      const b = blocks[i];
      const s = B / res;
      out = [];
      for (let j = res - 1; j >= 0; j--) // top row first
        for (let ii = 0; ii < res; ii++) {
          const cnt = new Map(); let n = 0;
          for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
            const c = pix.get((b.c * B + ii * s + x) + ',' + (b.r * B + j * s + y));
            if (c) { n++; cnt.set(c, (cnt.get(c) || 0) + 1); }
          }
          if (!n || (res > 1 && n * 2 < s * s)) { out.push(null); continue; }
          let best = null, bn = -1; for (const [c, k] of cnt) if (k > bn) { bn = k; best = c; }
          out.push(best);
        }
      cache.set(key, out);
      return out;
    }
    const glow = [];
    for (const [k, m] of px.d) { const g = M[m] && M[m].glow; if (!g) continue; const [x, y] = k.split(',').map(Number); if (H(x, y, 11) < (g === 2 ? 0.08 : 0.06)) glow.push([x - ox, y, g]); }
    return { w: W, h: Hh, sink: sinkB, blocks, colorAt, glow, wPx, hPx };
  };
  T.pxHash = H;
})();
