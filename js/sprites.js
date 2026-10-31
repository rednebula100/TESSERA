'use strict';
// ─────────────────────────────────────────────────────────────
//  SPRITES — 절차적 픽셀 스프라이트 (건축가, 방울)
// ─────────────────────────────────────────────────────────────
(function () {
  const SW = 14, SH = 12; // body grid
  const PAD = 1, TOP = 4; // outline pad + room for sprout

  function inPoly(px, py, poly) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i], [xj, yj] = poly[j];
      if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }
  function regPoly(k, cx, cy, rx, ry, rot, star) {
    const pts = [];
    const n = star ? k * 2 : k;
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + rot + (Math.PI * 2 * i) / n;
      const r = star && i % 2 ? 0.5 : 1;
      pts.push([cx + Math.cos(a) * rx * r, cy + Math.sin(a) * ry * r]);
    }
    return pts;
  }

  const MASKS = {
    square: (x, y) => {
      if (x < 0 || x > 13 || y < 0 || y > 11) return false;
      const cx = x < 2 ? 2 - x : x > 11 ? x - 11 : 0;
      const cy = y < 2 ? 2 - y : y > 9 ? y - 9 : 0;
      return cx * cx + cy * cy <= 2;
    },
    triangle: (x, y) => {
      const yy = y + 0.5, xx = x + 0.5;
      if (yy < 0 || yy > 12) return false;
      const hw = 1.2 + (yy / 12) * 6.4;
      if (Math.abs(xx - 7) > hw) return false;
      if (y >= 11 && (x === 0 || x === 13)) return false;
      return true;
    },
    circle: (x, y) => {
      const dx = (x + 0.5 - 7) / 7, dy = (y + 0.5 - 6.2) / 6.4;
      return dx * dx + dy * dy <= 1;
    },
    pentagon: (() => {
      const p = regPoly(5, 7, 6.9, 7.4, 6.6, 0);
      return (x, y) => inPoly(x + 0.5, y + 0.5, p);
    })(),
    star: (() => {
      const p = regPoly(5, 7, 6.8, 8.6, 7.6, 0, true);
      return (x, y) => inPoly(x + 0.5, y + 0.5, p);
    })(),
    hexagon: (() => {
      const p = regPoly(6, 7, 6, 7.6, 6.6, Math.PI / 6);
      return (x, y) => inPoly(x + 0.5, y + 0.5, p);
    })(),
    drop: (x, y) => {
      const xx = x + 0.5, yy = y + 0.5;
      const dx = (xx - 7) / 6.2, dy = (yy - 7.4) / 4.8;
      if (yy >= 7.4) return dx * dx + dy * dy <= 1;
      const hw = ((yy - 0) / 7.4) * 6.2;
      return Math.abs(xx - 7) <= hw * 0.98 + 0.3 && yy > 0.6;
    },
  };

  // face layout per shape
  const FACE = {
    square: { ey: 5, el: 3, er: 9, cheekY: 7 },
    triangle: { ey: 7, el: 4, er: 8, cheekY: 9 },
    circle: { ey: 5, el: 3, er: 9, cheekY: 7 },
    pentagon: { ey: 6, el: 3, er: 9, cheekY: 8 },
    star: { ey: 6, el: 4, er: 8, cheekY: 8 },
    hexagon: { ey: 5, el: 3, er: 9, cheekY: 7 },
    drop: { ey: 7, el: 3, er: 9, cheekY: 9 },
  };
  T.FACE = FACE;

  const cache = new Map();
  function palette(kind, color) {
    if (kind === 'drop') return color
      ? { body: '#9fd8ec', shade: '#74bcd6', line: '#2e5f73', hi: '#ffffff', cheek: '#f4a0b5', ink: '#20343c', sprout: '#c8553d' }
      : { body: '#f2f2f0', shade: '#d6d6d3', line: '#3a3a39', hi: '#ffffff', cheek: '#c8c8c5', ink: '#262626', sprout: '#555' };
    const s = T.SHAPE[kind];
    if (!color) return { body: '#f5f5f3', shade: '#dcdcd9', line: '#353534', hi: '#ffffff', cheek: '#cfcfcc', ink: '#252525', sprout: '#7a7a78' };
    return {
      body: T.shade(s.color, 0.62), shade: T.shade(s.color, 0.3), line: T.shade(s.color, -0.55),
      hi: '#ffffff', cheek: '#f29fae', ink: '#2a2328', sprout: T.shade(s.color, -0.15),
    };
  }

  function build(kind, color) {
    const key = kind + (color ? '+c' : '');
    if (cache.has(key)) return cache.get(key);
    const pal = palette(kind, color);
    const W = SW + PAD * 2, H = SH + PAD * 2 + TOP;
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d');
    const m = MASKS[kind];
    const px = (x, y, c) => { ctx.fillStyle = c; ctx.fillRect(x + PAD, y + PAD + TOP, 1, 1); };
    // outline
    for (let y = -1; y <= SH; y++)
      for (let x = -1; x <= SW; x++) {
        if (m(x, y)) continue;
        if (m(x - 1, y) || m(x + 1, y) || m(x, y - 1) || m(x, y + 1)) px(x, y, pal.line);
      }
    // body + shading
    for (let y = 0; y < SH; y++)
      for (let x = 0; x < SW; x++) {
        if (!m(x, y)) continue;
        let c = pal.body;
        if (!m(x, y + 2) || !m(x + 2, y)) c = pal.shade;
        px(x, y, c);
      }
    // highlight
    for (let y = 0; y < SH; y++) {
      let done = false;
      for (let x = 0; x < SW && !done; x++) {
        if (m(x, y) && m(x + 1, y) && m(x, y + 1) && (!m(x, y - 1) || !m(x - 1, y))) {
          if (y < 4) { px(x + 1, y + 1, pal.hi); done = true; }
        }
      }
      if (done) break;
    }
    // sprout / antenna (not for star)
    if (kind !== 'star') {
      let topY = 0; while (!m(7, topY) && topY < 6) topY++;
      const sx = kind === 'drop' ? 7 : 7;
      ctx.fillStyle = pal.line;
      ctx.fillRect(sx + PAD, PAD + TOP + topY - 2, 1, 2);
      if (kind === 'drop') {
        // beret
        ctx.fillStyle = color ? '#b23a48' : '#4a4a49';
        ctx.fillRect(PAD + 4, PAD + TOP + 0, 7, 2);
        ctx.fillRect(PAD + 5, PAD + TOP - 1, 5, 1);
        ctx.fillRect(PAD + 9, PAD + TOP - 2, 1, 1);
      } else {
        ctx.fillStyle = pal.sprout;
        ctx.fillRect(sx + PAD - 1, PAD + TOP + topY - 4, 2, 2);
        ctx.fillStyle = pal.line;
        ctx.fillRect(sx + PAD + 1, PAD + TOP + topY - 3, 1, 1);
      }
    }
    const spr = { cv, W, H, pal };
    cache.set(key, spr);
    return spr;
  }

  // opts: sx, sy (screen bottom-center), ps (screen px per sprite px), face, look [dx,dy], legs [l,r], hat, sq (squash -0.3..0.3)
  function draw(ctx, kind, color, o) {
    const spr = build(kind, color);
    const ps = o.ps;
    const sqx = 1 + (o.sq || 0), sqy = 1 - (o.sq || 0);
    const pw = ps * sqx, ph = ps * sqy;
    const W = spr.W * pw, H = spr.H * ph;
    const legH = 2 * ph;
    const x0 = o.sx - W / 2, y0 = o.sy - H - legH + PAD * ph;
    const pal = spr.pal;
    // legs
    if (ps >= 0.6) {
      ctx.fillStyle = pal.line;
      const lgx = [4, 9];
      for (let i = 0; i < 2; i++) {
        const off = (o.legs ? o.legs[i] : 0);
        const lx = x0 + (lgx[i] + PAD + (o.dangle ? (i ? 0.5 : -0.5) : 0)) * pw;
        const ly = o.sy - legH - off * ph + (o.dangle ? ph : 0);
        ctx.fillRect(lx, ly, 2 * pw, legH + (o.dangle ? ph : 0));
      }
    }
    ctx.drawImage(spr.cv, x0, y0, W, H);
    if (ps < 0.8) return;
    // face
    const f = FACE[kind];
    const fx = (x) => x0 + (x + PAD) * pw;
    const fy = (y) => y0 + (y + PAD + TOP) * ph;
    const lx = o.look ? o.look[0] : 0, ly = o.look ? o.look[1] : 0;
    const face = o.face || 'normal';
    const ink = pal.ink;
    const rect = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(fx(x), fy(y), w * pw, h * ph); };
    for (const ex of [f.el, f.er]) {
      const x = ex + lx, y = f.ey + ly;
      switch (face) {
        case 'blink': rect(x, y + 1, 2, 1, ink); break;
        case 'happy': rect(x, y + 1, 1, 1, ink); rect(x + 1, y, 1, 1, ink); rect(x + 2, y + 1, 1, 1, ink); break;
        case 'sleepy': rect(x, y + 1, 2, 1, ink); break;
        case 'surprise': rect(x, y - 1, 2, 3, ink); rect(x, y - 1, 1, 1, pal.hi); break;
        case 'dizzy': rect(x, y - 1, 1, 1, ink); rect(x + 2, y - 1, 1, 1, ink); rect(x + 1, y, 1, 1, ink); rect(x, y + 1, 1, 1, ink); rect(x + 2, y + 1, 1, 1, ink); break;
        default: rect(x, y, 2, 2, ink); rect(x, y, 1, 1, pal.hi);
      }
    }
    // cheeks
    rect(f.el - 1 + (lx > 0 ? 1 : 0), f.cheekY + ly * 0.5, 2, 1, pal.cheek);
    rect(f.er + 1 + (lx < 0 ? -1 : 0), f.cheekY + ly * 0.5, 2, 1, pal.cheek);
    // mouth
    const mx = Math.round((f.el + f.er) / 2 + lx * 0.5) + 0.5;
    if (face === 'happy') { rect(mx, f.cheekY, 2, 1, ink); rect(mx + 0.5, f.cheekY + 1, 1, 1, '#e86a7a'); }
    else if (face === 'surprise') { rect(mx + 0.5, f.cheekY, 1, 2, ink); }
    else if (face === 'dizzy') { rect(mx, f.cheekY + 1, 2, 1, ink); }
    else rect(mx + 0.5, f.cheekY, 1, 1, ink);
    // hats
    if (o.hat === 'ribbon') {
      const c = color ? '#ef6f91' : '#8a8a88';
      rect(10, -1, 2, 1, c); rect(13, -1, 2, 1, c); rect(12, -0.5, 1, 1, T.shade(c, -0.3));
    } else if (o.hat === 'helmet') {
      const c = color ? '#f4c430' : '#b6b6b3';
      rect(3, -2, 8, 2, c); rect(2, 0, 10, 1, c); rect(4, -2, 2, 1, '#ffffff');
      rect(2, 1, 10, 0.5, T.shade(c, -0.4));
    } else if (o.hat === 'crown') {
      const c = color ? '#ffd166' : '#c9c9c6';
      rect(4, -1, 6, 2, c); rect(4, -3, 1, 2, c); rect(6.5, -3, 1, 2, c); rect(9, -3, 1, 2, c);
      rect(6.5, -0.5, 1, 1, color ? '#ef476f' : '#777');
    }
  }

  // tiny portrait for UI
  function portrait(kind, color, scale = 4, face = 'normal') {
    const spr = build(kind, color);
    const cv = document.createElement('canvas');
    cv.width = spr.W * scale; cv.height = (spr.H + 3) * scale;
    const ctx = cv.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    draw(ctx, kind, color, { sx: cv.width / 2, sy: cv.height, ps: scale, face });
    return cv;
  }

  T.sprites = { draw, portrait, build, PAD, TOP, SW, SH, clear: () => cache.clear() };
})();
