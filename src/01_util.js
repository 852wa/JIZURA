/* ============================================================
   JIZURA — util: math, easing, deterministic randomness, colour
   ============================================================ */
'use strict';
const J = (window.J = window.J || {});

J.clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
J.lerp = (a, b, t) => a + (b - a) * t;
J.inv = (a, b, x) => (b === a ? 0 : (x - a) / (b - a));
J.smooth = (a, b, x) => { const t = J.clamp(J.inv(a, b, x)); return t * t * (3 - 2 * t); };
J.TAU = Math.PI * 2;
J.DEG = Math.PI / 180;

J.E = {
  lin: x => J.clamp(x),
  inQuad: x => { x = J.clamp(x); return x * x; },
  outQuad: x => { x = J.clamp(x); return 1 - (1 - x) * (1 - x); },
  inCubic: x => { x = J.clamp(x); return x * x * x; },
  outCubic: x => { x = J.clamp(x); return 1 - Math.pow(1 - x, 3); },
  inOutCubic: x => { x = J.clamp(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; },
  outExpo: x => { x = J.clamp(x); return x >= 1 ? 1 : 1 - Math.pow(2, -10 * x); },
  inExpo: x => { x = J.clamp(x); return x <= 0 ? 0 : Math.pow(2, 10 * x - 10); },
  inOutExpo: x => { x = J.clamp(x); if (x <= 0 || x >= 1) return x; return x < 0.5 ? Math.pow(2, 20 * x - 10) / 2 : (2 - Math.pow(2, -20 * x + 10)) / 2; },
  outBack: (x, s = 1.9) => { x = J.clamp(x); const c = s + 1; return 1 + c * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2); },
  outElastic: x => { x = J.clamp(x); if (x === 0 || x === 1) return x; return Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * (J.TAU / 3)) + 1; },
  inOutSine: x => { x = J.clamp(x); return -(Math.cos(Math.PI * x) - 1) / 2; },
};

/* ---- deterministic hashing: numbers only on the hot path ---- */
const _sidCache = new Map();
J.sid = s => {                       // string -> uint32 (cached)
  let v = _sidCache.get(s);
  if (v !== undefined) return v;
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  v = h >>> 0; _sidCache.set(s, v); return v;
};
J.h = function (a, b, c, d, e) {      // up to 5 numeric keys -> uint32
  let h = 0x9e3779b9 ^ (a | 0);
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h = (h + Math.imul((b | 0) + 0x632be5ab, 0xc2b2ae35)) | 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  h = (h + Math.imul((c | 0) + 0x5bd1e995, 0x27d4eb2f)) | 0;
  h = Math.imul(h ^ (h >>> 15), 0x165667b1);
  h = (h + Math.imul((d | 0) + 0x1b873593, 0x85ebca6b)) | 0;
  h = Math.imul(h ^ (h >>> 16), 0x27d4eb2f);
  h = (h + Math.imul((e | 0) + 0x68e31da4, 0x9e3779b1)) | 0;
  h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d); h ^= h >>> 12; h = Math.imul(h, 0x297a2d39); h ^= h >>> 15;
  return h >>> 0;
};
J.r = (a, b, c, d, e) => J.h(a, b, c, d, e) / 4294967296;          // 0..1
J.rs = (a, b, c, d, e) => J.r(a, b, c, d, e) * 2 - 1;               // -1..1
J.rr = (lo, hi, a, b, c, d, e) => lo + (hi - lo) * J.r(a, b, c, d, e);
J.pick = (arr, a, b, c, d) => arr[Math.floor(J.r(a, b, c, d) * arr.length) % arr.length];

J.rng = seed => {                    // mulberry32 stream
  let s = seed >>> 0;
  const f = () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  f.range = (lo, hi) => lo + (hi - lo) * f();
  f.int = (lo, hi) => Math.floor(lo + (hi - lo + 1) * f());
  f.pick = arr => arr[Math.floor(f() * arr.length) % arr.length];
  f.chance = p => f() < p;
  f.wpick = list => {               // [{w, v}] or [[v,w]]
    let tot = 0; for (const it of list) tot += Array.isArray(it) ? it[1] : it.w;
    let x = f() * tot;
    for (const it of list) { const w = Array.isArray(it) ? it[1] : it.w; if ((x -= w) <= 0) return Array.isArray(it) ? it[0] : it.v; }
    const last = list[list.length - 1]; return Array.isArray(last) ? last[0] : last.v;
  };
  return f;
};

/* smooth 1D value noise (for drift / wiggle) */
J.noise1 = (x, seed = 0) => {
  const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
  return J.lerp(J.rs(seed, i), J.rs(seed, i + 1), u);
};

/* ---- colour ---- */
J.hex = h => {
  h = String(h || '#000').replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  const n = parseInt(h.slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
J.rgba = (h, a = 1) => { const [r, g, b] = J.hex(h); return `rgba(${r},${g},${b},${a})`; };
J.mix = (h1, h2, t) => {
  const a = J.hex(h1), b = J.hex(h2);
  const c = a.map((v, i) => Math.round(J.lerp(v, b[i], t)));
  return '#' + c.map(v => v.toString(16).padStart(2, '0')).join('');
};
J.lum = h => { const [r, g, b] = J.hex(h); return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255; };
J.toHex = (r, g, b) => '#' + [r, g, b].map(v => Math.round(J.clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('').toUpperCase();
J.hsl = (h, s, l) => {                 // h 0..360, s/l 0..1 -> hex
  h = ((h % 360) + 360) % 360 / 360;
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const f = t => { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
  return J.toHex(f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255);
};
J.toHsl = hex => {
  const [r, g, b] = J.hex(hex).map(v => v / 255);
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  if (mx === mn) return [0, 0, l];
  const d = mx - mn, s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  const h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
};
J.contrast = (a, b) => {               // WCAG contrast ratio
  const L = h => { const c = J.hex(h).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
  const x = L(a), y = L(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};
J.fitContrast = (hex, bg, min = 3) => {  // nudge lightness away from the background until it reads
  if (J.contrast(hex, bg) >= min) return hex.toUpperCase();
  let [h, s, l] = J.toHsl(hex);
  const dark = J.lum(bg) < 0.5;
  for (let i = 0; i < 24; i++) {
    l = dark ? Math.min(0.96, l + 0.035) : Math.max(0.04, l - 0.035);
    const c = J.hsl(h, s, l);
    if (J.contrast(c, bg) >= min) return c;
  }
  return dark ? '#FFFFFF' : '#111111';
};
/* random accent + chromatic ghost pair that works on the given background */
J.GHOST_PAIRS = [['#16F4D4', '#F5A50C'], ['#FF2A2A', '#2AA8FF'], ['#FF2BD6', '#2BFF88'], ['#FFE600', '#7B2BFF'], ['#FF6A00', '#00C2B8'],
  ['#FF6FAE', '#B6FF3B'], ['#00E0FF', '#FF3D6E'], ['#C8FF00', '#FF00A8'], ['#4D6BFF', '#FFB000'], ['#FF4B2B', '#2BD9FF']];
J.randomPalette = (bg, rnd = Math.random) => {
  const dark = J.lum(bg) < 0.5;
  let a, b, mode;
  if (rnd() < 0.4) {
    mode = 'curated';
    [a, b] = J.GHOST_PAIRS[Math.floor(rnd() * J.GHOST_PAIRS.length)];
    if (rnd() < 0.5) [a, b] = [b, a];
    if (!dark) { a = J.hsl(J.toHsl(a)[0], 0.95, 0.47); b = J.hsl(J.toHsl(b)[0], 0.95, 0.47); }
  } else {
    mode = 'harmony';
    const h = rnd() * 360, gap = [180, 165, 150, 135][Math.floor(rnd() * 4)] * (rnd() < 0.5 ? 1 : -1);
    const s = 0.82 + rnd() * 0.18, l = dark ? 0.52 + rnd() * 0.1 : 0.44 + rnd() * 0.08;
    a = J.hsl(h, s, l); b = J.hsl(h + gap, s, l);
  }
  // accent: one of the pair, or the hue between them, made readable on the background
  const r = rnd();
  const ha = J.toHsl(a)[0], hb = J.toHsl(b)[0];
  let acc = r < 0.35 ? a : r < 0.6 ? b : J.hsl((ha + hb) / 2 + (rnd() < 0.5 ? 0 : 180), 0.9, dark ? 0.6 : 0.45);
  acc = J.fitContrast(acc, bg, 3);
  return { accent: acc, ghostA: a, ghostB: b, mode };
};

/* ---- script classes for Japanese text ---- */
J.isKanji = c => /[㐀-鿿豈-﫿々〆ヶ]/.test(c);
J.isHira = c => /[ぁ-ゟ]/.test(c);
J.isKata = c => /[゠-ヿㇰ-ㇿｦ-ﾟ]/.test(c);
J.isSmallKana = c => 'ぁぃぅぇぉっゃゅょゎァィゥェォッャュョヮヵヶ'.includes(c);
J.isPunct = c => /[、。，．,.!?！？…‥・「」『』（）()【】〈〉《》〔〕［］\[\]'"“”‘’ー〜～:：;；\-—―]/.test(c);
J.isLatin = c => /[A-Za-z0-9]/.test(c);
J.VERT_ROTATE = 'ー〜～…‥―—-()（）「」『』【】〈〉《》〔〕[]［］→←:：;；=＝';

/* ---- kana → romaji (for annotation labels; kanji left out) ---- */
(() => {
  const base = { あ: 'a', い: 'i', う: 'u', え: 'e', お: 'o', か: 'ka', き: 'ki', く: 'ku', け: 'ke', こ: 'ko', さ: 'sa', し: 'shi', す: 'su', せ: 'se', そ: 'so', た: 'ta', ち: 'chi', つ: 'tsu', て: 'te', と: 'to', な: 'na', に: 'ni', ぬ: 'nu', ね: 'ne', の: 'no', は: 'ha', ひ: 'hi', ふ: 'fu', へ: 'he', ほ: 'ho', ま: 'ma', み: 'mi', む: 'mu', め: 'me', も: 'mo', や: 'ya', ゆ: 'yu', よ: 'yo', ら: 'ra', り: 'ri', る: 'ru', れ: 're', ろ: 'ro', わ: 'wa', を: 'wo', ん: 'n', が: 'ga', ぎ: 'gi', ぐ: 'gu', げ: 'ge', ご: 'go', ざ: 'za', じ: 'ji', ず: 'zu', ぜ: 'ze', ぞ: 'zo', だ: 'da', ぢ: 'ji', づ: 'zu', で: 'de', ど: 'do', ば: 'ba', び: 'bi', ぶ: 'bu', べ: 'be', ぼ: 'bo', ぱ: 'pa', ぴ: 'pi', ぷ: 'pu', ぺ: 'pe', ぽ: 'po', ぁ: 'a', ぃ: 'i', ぅ: 'u', ぇ: 'e', ぉ: 'o', ゔ: 'vu' };
  const yo = { ゃ: 'ya', ゅ: 'yu', ょ: 'yo' };
  J.romaji = s => {
    let out = '', i = 0;
    const toH = c => (J.isKata(c) && c !== 'ー' ? String.fromCharCode(c.charCodeAt(0) - 0x60) : c);
    const arr = [...s].map(toH);
    while (i < arr.length) {
      const c = arr[i], n = arr[i + 1];
      if (c === 'っ') { const nx = base[n] || ''; out += nx ? nx[0] : ''; i++; continue; }
      if (c === 'ー') { out += out.slice(-1); i++; continue; }
      if (n && yo[n] && base[c]) { const b = base[c]; out += (b.length > 1 && (b.endsWith('i')) ? b.slice(0, -1) : b) + (b === 'shi' || b === 'chi' || b === 'ji' ? yo[n].slice(1) : yo[n]); i += 2; continue; }
      if (base[c]) out += base[c]; else if (/[A-Za-z0-9 ]/.test(c)) out += c; else return null;
      i++;
    }
    return out;
  };
})();

J.fmtTime = (t, fps) => {
  t = Math.max(0, t);
  const m = Math.floor(t / 60), s = Math.floor(t % 60), f = Math.floor((t % 1) * (fps || 100));
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}${fps ? ':' + String(f).padStart(2, '0') : '.' + String(f).padStart(2, '0')}`;
};
