'use strict';
// ─────────────────────────────────────────────────────────────
//  PATTERNS — 건축가 고유의 결정론적 기하 패턴
//  모든 패턴은 공통 중심 (0, YC)를 공유한다 → 겹치면 하나의 장미창.
// ─────────────────────────────────────────────────────────────
(function () {
  const B = T.B;
  const TAU = Math.PI * 2;
  const vdc = (n) => { let v = 0, d = 0.5; n = n | 0; while (n) { if (n & 1) v += d; n >>= 1; d /= 2; } return v; };
  T.vdc = vdc;

  let SP = B; // point spacing along the current ring (wider far out → dotted, airy lines)
  function samplePolyline(pts, closed, out) {
    const n = pts.length;
    const segs = closed ? n : n - 1;
    let carry = 0;
    for (let i = 0; i < segs; i++) {
      const a = pts[i], b = pts[(i + 1) % n];
      const dx = b[0] - a[0], dy = b[1] - a[1];
      const len = Math.hypot(dx, dy);
      if (len < 1e-6) continue;
      let t = carry;
      while (t < len) {
        out.push([a[0] + (dx * t) / len, a[1] + (dy * t) / len]);
        t += SP;
      }
      carry = t - len;
    }
    return out;
  }

  function polygon(k, R, rot, step = 1) {
    const v = [];
    for (let i = 0; i < k; i++) {
      const idx = (i * step) % k;
      const a = Math.PI / 2 + rot + (TAU * idx) / k;
      v.push([Math.cos(a) * R, Math.sin(a) * R]);
    }
    return v;
  }

  function curve(R, fnR, rot) {
    const out = [];
    let th = 0;
    while (th < TAU) {
      const r = fnR(th);
      out.push([Math.cos(th + rot) * r, Math.sin(th + rot) * r]);
      th += SP / Math.max(r, B);
    }
    return out;
  }

  class Motif {
    constructor(shape, ordinal) {
      this.shape = shape;
      const mi = ordinal % shape.motifs.length;
      this.type = shape.motifs[mi];
      const m = Math.floor(ordinal / shape.motifs.length);
      this.m = m;
      const k = shape.k;
      this.k = k;
      // van der Corput rotation: 0, 1/2, 1/4, 3/4, 1/8 … of the symmetry period.
      // Each new architect halves the gaps → the rosette becomes ever finer but stays perfectly regular.
      const v = vdc(m);
      const period = this.type === 'rays' ? Math.PI / k : (Math.PI * 2) / k;
      this.rot = v * period;
      // rings grow geometrically: dense luminous core, airy lace at the rim
      this.Q = 1 + shape.ring / 100;
      const radial = this.type === 'circle' || this.type === 'arch' || this.type === 'zigg' ? v : 0;
      this.R0 = shape.start * B * Math.pow(this.Q, mi / shape.motifs.length + radial);
      this.j = 0;
      this.buf = [];
      this.bi = 0;
    }
    ringPoints(j) {
      const k = this.k, rot = this.rot;
      if (this.Rc === undefined) this.Rc = this.R0;
      let R = this.Rc;
      this.Rc = Math.max(R * this.Q, R + B * 3.5);
      SP = B * (1 + T.clamp((R - 500) / 2500, 0, 0.9));
      let pts = [];
      let centered = true;
      switch (this.type) {
        case 'poly': samplePolyline(polygon(k, R, rot), true, pts); break;
        case 'diamond': samplePolyline(polygon(4, R, rot + Math.PI / 4), true, pts); break;
        case 'hexagram':
          samplePolyline(polygon(3, R, rot), true, pts);
          samplePolyline(polygon(3, R, rot + Math.PI), true, pts);
          break;
        case 'star': samplePolyline(polygon(5, R, rot, 2), true, pts); break;
        case 'circle': pts = curve(R, () => R, 0); break;
        case 'petal': pts = curve(R, (th) => R * (0.74 + 0.26 * Math.cos(k * (th)) ), rot + Math.PI / 2); break;
        case 'petal8': pts = curve(R, (th) => R * (0.74 + 0.26 * Math.cos(8 * th)), rot + Math.PI / 2); break;
        case 'rays': {
          // spokes subdivide as they travel outward, like the tracery of a rose window
          R = this.R0 + j * SP * 1.2;
          this.Rc = undefined;
          const lv = Math.max(0, Math.floor(Math.log2(Math.max(1, R / (this.R0 * 2.2)))));
          const n = 2 * k * Math.pow(2, Math.min(lv, 6));
          for (let v = 0; v < n; v++) {
            const a = Math.PI / 2 + rot / Math.pow(2, Math.min(lv, 6)) + (Math.PI * 2 * v) / n;
            pts.push([Math.cos(a) * R, Math.sin(a) * R]);
          }
          if (j % 24 === 23) {
            const arc = curve(R, () => R, 0);
            for (let i = 0; i < arc.length; i += 3) pts.push(arc[i]);
          }
          break;
        }
        case 'arch': {
          centered = false;
          const W = R * 0.62, Hl = R * 0.55;
          const half = [];
          const prof = [[W, 0], [W, Hl]];
          samplePolyline(prof, false, half);
          // gothic pointed arch: two arcs meeting at the apex
          const rr = W * 1.6;
          const cx = W - rr;
          const apexA = Math.acos((0 - cx) / rr);
          let a = 0;
          while (a < apexA) { half.push([cx + Math.cos(a) * rr, Hl + Math.sin(a) * rr]); a += B / rr; }
          const left = half.slice().reverse().map((p) => [-p[0], p[1]]);
          pts = half.concat(left);
          break;
        }
        case 'zigg': {
          centered = false;
          const W = R * 1.15;
          const n = Math.max(2, Math.round(R / (5 * B)));
          const sh = (R * 0.85) / n, sw = W / n;
          const prof = [[W, 0]];
          for (let s = 0; s < n; s++) {
            const x = W - s * sw;
            prof.push([x, (s + 1) * sh]);
            prof.push([x - sw, (s + 1) * sh]);
          }
          const half = [];
          samplePolyline(prof, false, half);
          const left = half.slice().reverse().map((p) => [-p[0], p[1]]);
          pts = half.concat(left);
          break;
        }
      }
      // to world coords + clip at floor
      const minY = B / 2 + 1;
      const out = [];
      for (const p of pts) {
        const x = p[0], y = centered ? T.YC + p[1] : p[1] + B / 2 + 1;
        if (y < minY) continue;
        out.push([x, y]);
      }
      if (centered) {
        // order along the ring starting at the bottom so the walking path is continuous
        out.sort((a, b) => {
          const ta = (Math.atan2(a[1] - T.YC, a[0]) + Math.PI / 2 + TAU) % TAU;
          const tb = (Math.atan2(b[1] - T.YC, b[0]) + Math.PI / 2 + TAU) % TAU;
          return ta - tb;
        });
      }
      // dedupe close points
      const ded = [];
      for (const p of out) {
        const q = ded[ded.length - 1];
        if (q && Math.abs(q[0] - p[0]) < B * 0.55 && Math.abs(q[1] - p[1]) < B * 0.55) continue;
        ded.push(p);
      }
      if (j % 2 === 1) ded.reverse();
      return ded;
    }
    fill() {
      let guard = 0;
      while (this.bi >= this.buf.length && guard++ < 50) {
        this.buf = this.ringPoints(this.j++);
        this.bi = 0;
      }
    }
    peek() { this.fill(); return this.buf[this.bi]; }
    next() { this.fill(); return this.buf[this.bi++]; }
  }

  T.Motif = Motif;
})();
