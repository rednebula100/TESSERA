'use strict';
// Shared namespace
const T = (window.T = {});

T.B = 8; // block size in world units
T.YC = 320; // common pattern center height

// tapering power curve for reset gains: ratio^e near the start, the exponent shrinks smoothly as the ratio grows
// (every extra power of ten is worth a bit less than the last). no break points, no caps.
T.taper = (ratio, e, k) => { if (ratio <= 0) return 0; const L = Math.log10(ratio); return L <= 0 ? Math.pow(ratio, e) : Math.pow(10, (e * L) / (1 + L / k)); };
T.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
T.lerp = (a, b, t) => a + (b - a) * t;
T.easeOut = (t) => 1 - Math.pow(1 - t, 3);
T.easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
T.easeOutBack = (t) => {
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};
T.PHI = 0.6180339887;

T.rng = function (seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const UNITS = ['만', '억', '조', '경', '해', '자', '양', '구', '간', '정', '재', '극'];
T.fmt = function (n) {
  if (n === undefined || n === null || isNaN(n)) return '0';
  if (!isFinite(n)) return '∞';
  if (n < 0) return '-' + T.fmt(-n);
  if (n < 10 && n % 1 !== 0) return n.toFixed(1);
  if (n < 1e4) return Math.floor(n).toLocaleString('ko-KR');
  const e = Math.floor(Math.log10(n) / 4);
  if (e > UNITS.length) {
    const s = n.toExponential(2);
    return s.replace('e+', 'e');
  }
  const v = n / Math.pow(10, 4 * e);
  const str = v < 10 ? v.toFixed(2) : v < 100 ? v.toFixed(1) : Math.floor(v).toString();
  return str + UNITS[e - 1];
};
T.fmtInt = (n) => (n < 1e4 ? Math.floor(n).toLocaleString('ko-KR') : T.fmt(n));
T.fmtTime = function (s) {
  s = Math.floor(s);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  if (h) return `${h}시간 ${m}분`;
  if (m) return `${m}분 ${sec}초`;
  return `${sec}초`;
};

T.$ = (sel, root = document) => root.querySelector(sel);
T.$$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
T.h = function (html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
};

// color helpers
T.hexToRgb = function (hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
T.rgbToHex = (r, g, b) =>
  '#' + ((1 << 24) | (T.clamp(r | 0, 0, 255) << 16) | (T.clamp(g | 0, 0, 255) << 8) | T.clamp(b | 0, 0, 255)).toString(16).slice(1);
T.shade = function (hex, amt) {
  const [r, g, b] = T.hexToRgb(hex);
  if (amt >= 0) return T.rgbToHex(r + (255 - r) * amt, g + (255 - g) * amt, b + (255 - b) * amt);
  return T.rgbToHex(r * (1 + amt), g * (1 + amt), b * (1 + amt));
};
T.hsl = function (h, s, l) {
  h = ((h % 360) + 360) % 360; s /= 100; l /= 100;
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return T.rgbToHex(255 * f(0), 255 * f(8), 255 * f(4));
};
T.gray = function (hex) {
  const [r, g, b] = T.hexToRgb(hex);
  const y = 0.299 * r + 0.587 * g + 0.114 * b;
  return T.rgbToHex(y, y, y);
};

// Soft cap: above `cap`, growth is compressed to (v/cap)^p (Profectus-style formula softcap)
T.softcap = (v, cap, p = 0.5) => (v <= cap || cap <= 0 ? v : cap * Math.pow(v / cap, p));
// hue-shifted ramp: cool, darker shadows and warm, lighter highlights
T.ramp = function (hex) {
  const [r, g, b] = T.hexToRgb(hex);
  const mx = Math.max(r, g, b) / 255, mn = Math.min(r, g, b) / 255;
  let h = 0, s = 0; const l = (mx + mn) / 2;
  if (mx !== mn) {
    const d = mx - mn;
    s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    const R = r / 255, G = g / 255, Bl = b / 255;
    h = mx === R ? (G - Bl) / d + (G < Bl ? 6 : 0) : mx === G ? (Bl - R) / d + 2 : (R - G) / d + 4;
    h *= 60;
  }
  const S = s * 100, L = l * 100;
  const toward = (hh, target, k) => { let d = ((target - hh + 540) % 360) - 180; return hh + d * k; };
  return [
    T.hsl(toward(h, 250, 0.1), S * (L > 70 ? 0.45 : 0.85), Math.max(4, L - 32)),
    T.hsl(toward(h, 250, 0.05), S * (L > 70 ? 0.6 : 0.92), Math.max(6, L - 15)),
    hex,
    T.hsl(toward(h, 55, 0.12), S * 0.92, Math.min(96, L + 11)),
    T.hsl(toward(h, 55, 0.22), S * 0.8, Math.min(98, L + 21)),
  ];
};
