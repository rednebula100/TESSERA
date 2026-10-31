'use strict';
// ─────────────────────────────────────────────────────────────
//  GRIDGEN: 건축물 도면을 절차적으로 그리는 작은 도구
//  r=0 이 바닥 바로 위 첫 줄, r<0 은 땅속(물길, 호수)
// ─────────────────────────────────────────────────────────────
(function () {
  class Grid {
    constructor(w, h, sink = 0) {
      this.w = w; this.h = h; this.sink = sink;
      this.m = new Map();
    }
    k(c, r) { return c + ',' + r; }
    in(c, r) { return c >= 0 && c < this.w && r >= -this.sink && r < this.h; }
    set(c, r, ch) { c = Math.round(c); r = Math.round(r); if (!this.in(c, r)) return; if (ch === '.') this.m.delete(this.k(c, r)); else this.m.set(this.k(c, r), ch); }
    get(c, r) { return this.m.get(this.k(Math.round(c), Math.round(r))) || '.'; }
    rect(c0, r0, c1, r1, ch) { for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) this.set(c, r, ch); return this; }
    frame(c0, r0, c1, r1, ch) { for (let c = c0; c <= c1; c++) { this.set(c, r0, ch); this.set(c, r1, ch); } for (let r = r0; r <= r1; r++) { this.set(c0, r, ch); this.set(c1, r, ch); } return this; }
    clear(c0, r0, c1, r1) { return this.rect(c0, r0, c1, r1, '.'); }
    // symmetric triangle roof: base row r0 spans [c0,c1], shrinking by `step` per row
    roof(c0, c1, r0, ch, step = 1, eave = 1) {
      let a = c0 - eave, b = c1 + eave, r = r0;
      while (a <= b) { this.rect(a, r, b, r, ch); a += step; b -= step; r++; }
      return r;
    }
    // rounded arch hole: width w centred at cx, legs up to rLeg then semicircle
    arch(cx, r0, halfw, legH, ch = '.') {
      for (let r = r0; r < r0 + legH; r++) for (let c = Math.ceil(cx - halfw); c <= Math.floor(cx + halfw); c++) this.set(c, r, ch);
      for (let dy = 0; dy <= halfw; dy++) {
        const hw = Math.sqrt(Math.max(0, halfw * halfw - dy * dy));
        for (let c = Math.ceil(cx - hw); c <= Math.floor(cx + hw); c++) this.set(c, r0 + legH + dy, ch);
      }
      return this;
    }
    blob(cx, cy, rx, ry, ch, rng, rough = 0.25) {
      for (let r = Math.floor(cy - ry - 1); r <= Math.ceil(cy + ry + 1); r++)
        for (let c = Math.floor(cx - rx - 1); c <= Math.ceil(cx + rx + 1); c++) {
          const dx = (c - cx) / rx, dy = (r - cy) / ry;
          const d = dx * dx + dy * dy;
          if (d <= 1 - (rng ? (rng() - 0.5) * rough : 0)) this.set(c, r, ch);
        }
      return this;
    }
    mirrorX() { // copy left half onto right half
      for (const [key, ch] of [...this.m]) { const [c, r] = key.split(',').map(Number); this.set(this.w - 1 - c, r, ch); }
      return this;
    }
    // overlay a char only where cells already exist
    paintIf(fn) { for (const [key, ch] of [...this.m]) { const [c, r] = key.split(',').map(Number); const n = fn(c, r, ch); if (n) this.m.set(key, n); } return this; }
    cells() {
      const out = [];
      for (const [key, ch] of this.m) { const [c, r] = key.split(',').map(Number); out.push({ c, r, ch }); }
      out.sort((a, b) => a.r - b.r || a.c - b.c);
      return out;
    }
  }
  T.Grid = Grid;

  // window pattern helper
  T.gwin = function (g, c0, c1, r0, r1, every, ch = 'o', sz = 1) {
    for (let c = c0; c + sz - 1 <= c1; c += every) for (let r = r0; r <= r1; r++) for (let k = 0; k < sz; k++) g.set(c + k, r, ch);
  };
})();
