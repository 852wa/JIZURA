/* ============================================================
   JIZURA — fonts: catalogue, loading, glyph decomposition
   ============================================================ */
(() => {
'use strict';

const JP_SANS_FB = '"Noto Sans JP","Noto Sans CJK JP","Hiragino Sans","Yu Gothic","Meiryo",sans-serif';
const JP_SERIF_FB = '"Noto Serif JP","Noto Serif CJK JP","Hiragino Mincho ProN","Yu Mincho",serif';

/* role catalogue: key -> {label, family, weight, kind} */
J.FONTS = {
  gothic_black:  { label: 'Noto Sans JP Black',        family: '"Noto Sans JP"', weight: 900, kind: 'gothic', fb: JP_SANS_FB, gf: 'Noto+Sans+JP:wght@300;500;700;900' },
  gothic_bold:   { label: 'Noto Sans JP Bold',         family: '"Noto Sans JP"', weight: 700, kind: 'gothic', fb: JP_SANS_FB, gf: 'Noto+Sans+JP:wght@300;500;700;900' },
  gothic_med:    { label: 'Noto Sans JP Medium',       family: '"Noto Sans JP"', weight: 500, kind: 'gothic', fb: JP_SANS_FB, gf: 'Noto+Sans+JP:wght@300;500;700;900' },
  gothic_light:  { label: 'Noto Sans JP Light',        family: '"Noto Sans JP"', weight: 300, kind: 'gothic', fb: JP_SANS_FB, gf: 'Noto+Sans+JP:wght@300;500;700;900' },
  dela:          { label: 'Dela Gothic One',           family: '"Dela Gothic One"', weight: 400, kind: 'display', fb: JP_SANS_FB, gf: 'Dela+Gothic+One' },
  zenkaku:       { label: 'Zen Kaku Gothic New Black', family: '"Zen Kaku Gothic New"', weight: 900, kind: 'gothic', fb: JP_SANS_FB, gf: 'Zen+Kaku+Gothic+New:wght@900' },
  mincho_black:  { label: 'Zen Old Mincho Black',      family: '"Zen Old Mincho"', weight: 900, kind: 'mincho', fb: JP_SERIF_FB, gf: 'Zen+Old+Mincho:wght@900' },
  mincho_bold:   { label: 'Noto Serif JP Bold',        family: '"Noto Serif JP"', weight: 700, kind: 'mincho', fb: JP_SERIF_FB, gf: 'Noto+Serif+JP:wght@300;500;700' },
  mincho:        { label: 'Noto Serif JP Medium',      family: '"Noto Serif JP"', weight: 500, kind: 'mincho', fb: JP_SERIF_FB, gf: 'Noto+Serif+JP:wght@300;500;700' },
  mincho_light:  { label: 'Noto Serif JP Light',       family: '"Noto Serif JP"', weight: 300, kind: 'mincho', fb: JP_SERIF_FB, gf: 'Noto+Serif+JP:wght@300;500;700' },
  tokumin:       { label: 'Kaisei Tokumin',            family: '"Kaisei Tokumin"', weight: 800, kind: 'mincho', fb: JP_SERIF_FB, gf: 'Kaisei+Tokumin:wght@800' },
  round:         { label: 'M PLUS Rounded 1c',         family: '"M PLUS Rounded 1c"', weight: 800, kind: 'round', fb: JP_SANS_FB, gf: 'M+PLUS+Rounded+1c:wght@800' },
  pop:           { label: 'Mochiy Pop One',            family: '"Mochiy Pop One"', weight: 400, kind: 'display', fb: JP_SANS_FB, gf: 'Mochiy+Pop+One' },
  dot:           { label: 'DotGothic16',               family: '"DotGothic16"', weight: 400, kind: 'pixel', fb: JP_SANS_FB, gf: 'DotGothic16' },
  brush:         { label: 'Yuji Syuku',                family: '"Yuji Syuku"', weight: 400, kind: 'brush', fb: JP_SERIF_FB, gf: 'Yuji+Syuku' },
  mono:          { label: 'IBM Plex Mono',             family: '"IBM Plex Mono"', weight: 500, kind: 'mono', fb: '"IBM Plex Sans JP",' + JP_SANS_FB, gf: 'IBM+Plex+Mono:wght@500;600' },
  reggae:        { label: 'Reggae One',                family: '"Reggae One"', weight: 400, kind: 'display', fb: JP_SANS_FB, gf: 'Reggae+One' },
  rampart:       { label: 'Rampart One',               family: '"Rampart One"', weight: 400, kind: 'display', fb: JP_SANS_FB, gf: 'Rampart+One' },
  potta:         { label: 'Potta One',                 family: '"Potta One"', weight: 400, kind: 'brush', fb: JP_SANS_FB, gf: 'Potta+One' },
  kiwi:          { label: 'Kiwi Maru',                 family: '"Kiwi Maru"', weight: 500, kind: 'round', fb: JP_SANS_FB, gf: 'Kiwi+Maru:wght@500' },
  klee:          { label: 'Klee One',                  family: '"Klee One"', weight: 600, kind: 'hand', fb: JP_SERIF_FB, gf: 'Klee+One:wght@600' },
  shippori:      { label: 'Shippori Mincho B1',        family: '"Shippori Mincho B1"', weight: 800, kind: 'mincho', fb: JP_SERIF_FB, gf: 'Shippori+Mincho+B1:wght@800' },
  sansui:        { label: 'IBM Plex Sans JP',          family: '"IBM Plex Sans JP"', weight: 500, kind: 'gothic', fb: JP_SANS_FB, gf: 'IBM+Plex+Sans+JP:wght@400;500;700' },
};
J.GOOGLE_FONTS_URL = 'https://fonts.googleapis.com/css2?family=Dela+Gothic+One&family=Noto+Sans+JP:wght@300;500;700;900&family=Noto+Serif+JP:wght@300;500;700&family=Zen+Kaku+Gothic+New:wght@900&family=Zen+Old+Mincho:wght@900&family=Kaisei+Tokumin:wght@800&family=M+PLUS+Rounded+1c:wght@800&family=Mochiy+Pop+One&family=DotGothic16&family=Yuji+Syuku&family=IBM+Plex+Mono:wght@500;600&family=IBM+Plex+Sans+JP:wght@400;500;700&display=swap';

/* user fonts (local family names or uploaded files) */
J.addUserFont = (key, label, family, weight = 400, kind = 'custom') => {
  J.FONTS[key] = { label, family: `"${family.replace(/"/g, '')}"`, weight, kind, fb: JP_SANS_FB, user: true };
  J.glyphs.clear();
};
J.loadFontFile = async (file) => {
  const buf = await file.arrayBuffer();
  const fam = 'UF_' + file.name.replace(/\.[^.]+$/, '').replace(/[^\w]/g, '_');
  const ff = new FontFace(fam, buf);
  await ff.load(); document.fonts.add(ff);
  const key = 'user_' + fam;
  J.addUserFont(key, file.name.replace(/\.[^.]+$/, ''), fam, 400, 'custom');
  return key;
};

J.fontCSS = (key, px) => {
  const f = J.faceOf ? J.faceOf(key) : (J.FONTS[key] || J.FONTS.gothic_bold);   // per-language face (02b_lang.js)
  return `${f.weight} ${px.toFixed(2)}px ${f.family},${f.fb}`;
};

/* Google Fonts stylesheets are attached lazily, one family at a time, only for the faces a plan actually uses —
   adding faces to the catalogue therefore costs nothing until a style or setting picks them */
const cssJobs = new Map();
function attachFamily(spec) {
  if (!spec || typeof document === 'undefined' || !document.head) return Promise.resolve();
  if (cssJobs.has(spec)) return cssJobs.get(spec);
  const job = new Promise(res => {
    const l = document.createElement('link');
    l.rel = 'stylesheet'; l.href = 'https://fonts.googleapis.com/css2?family=' + spec + '&display=swap';
    const done = () => res(); l.onload = done; l.onerror = done; setTimeout(done, 5000);
    document.head.appendChild(l);
  });
  cssJobs.set(spec, job);
  return job;
}
/* font keys a plan draws with: style roles, per-cut font params, mono for HUD */
J.fontsOfPlan = (plan) => {
  const set = new Set(['mono']);
  if (!plan) return [...set];
  for (const r of Object.values(plan.style.fonts || {})) for (const k of r) set.add(k);
  for (const c of plan.cuts || []) for (const v of Object.values(c.params || {})) {
    if (typeof v === 'string' && J.FONTS[v]) set.add(v);
    else if (Array.isArray(v)) v.forEach(x => { if (typeof x === 'string' && J.FONTS[x]) set.add(x); });
  }
  const out = [...set].filter(k => J.FONTS[k]);
  if ((plan.cuts || []).some(c => c.weightGrow)) out.push('@var');     // 太さ: the variable Noto Sans / Serif JP
  return out;
};
/* make sure the glyphs we need are loaded (Google Fonts are unicode-range split). keys = null → every catalogue face */
J.ensureFonts = async (text, keys) => {
  if (!document.fonts || !document.fonts.load) return;
  const uniq = [...new Set([...text])].join('') || 'あ';
  if (keys && keys.includes('@var')) {
    await Promise.all(['Noto+Sans+JP:wght@100..900', 'Noto+Serif+JP:wght@200..900'].map(attachFamily));
    await Promise.all(['100 64px "Noto Sans JP"', '900 64px "Noto Sans JP"', '200 64px "Noto Serif JP"', '900 64px "Noto Serif JP"'].map(f => document.fonts.load(f, uniq).catch(() => null)));
  }
  const list = (keys || Object.keys(J.FONTS)).filter(k => J.FONTS[k]);
  // faces in the current lyric language (+ its fallback sans / serif), each with the weight it is drawn at
  const faces = list.map(k => (J.faceOf ? J.faceOf(k) : J.FONTS[k]));
  if (J.langBaseFaces) for (const b of J.langBaseFaces(list)) faces.push({ family: '"' + b.family + '"', weight: b.weight, gf: b.gf });
  await Promise.all([...new Set(faces.map(f => f.gf).filter(Boolean))].map(attachFamily));
  const jobs = [], seen = new Set();
  for (const f of faces) {
    const spec = `${f.weight} 64px ${f.family}`;
    if (seen.has(spec)) continue; seen.add(spec);
    jobs.push(document.fonts.load(spec, uniq).catch(() => null));
  }
  await Promise.all(jobs);
  if (document.fonts.ready) await document.fonts.ready;
  J.glyphs.clear();
  J.metrics.clear();
};

/* ---------- metrics (advance widths) ---------- */
const _mc = document.createElement('canvas').getContext('2d');
J.metrics = {
  m: new Map(),
  clear() { this.m.clear(); },
  adv(fontKey, ch) {               // advance in em
    const k = fontKey + '\u0000' + ch;
    let v = this.m.get(k);
    if (v === undefined) {
      _mc.font = J.fontCSS(fontKey, 100);
      v = _mc.measureText(ch).width / 100;
      if (!(v > 0)) v = ch === ' ' ? 0.3 : 1;
      this.m.set(k, v);
    }
    return v;
  },
};

/* ---------- glyph decomposition (raster connected components) ----------
   A glyph is rasterised once per (font, char, resolution bucket); its alpha
   mask is split into connected pieces (strokes / radicals / dots) so that
   each can be flown, shattered or dropped independently. Works with any
   font the browser can render, including local and uploaded ones.        */
class GlyphCache {
  constructor() { this.map = new Map(); this.tint = new Map(); this.count = 0; this.maxRes = 512; }
  clear() { this.map.clear(); this.tint.clear(); }
  bucket(px) { let r = 64; while (r < px && r < this.maxRes) r *= 2; return r; }
  get(fontKey, ch, px) {
    const res = this.bucket(px);
    const key = fontKey + '|' + ch + '|' + res;
    let g = this.map.get(key);
    if (!g) { g = decompose(fontKey, ch, res); this.map.set(key, g); if (this.map.size > 1800) this.evict(); }
    return g;
  }
  evict() { let n = 0; for (const k of this.map.keys()) { this.map.delete(k); if (++n > 600) break; } this.tint.clear(); }
  sprite(piece, color) {              // tinted copy of a white piece sprite
    if (color === '#ffffff' || color === '#fff') return piece.cv;
    let m = this.tint.get(piece.id);
    if (!m) { m = new Map(); this.tint.set(piece.id, m); }
    let c = m.get(color);
    if (!c) {
      c = document.createElement('canvas'); c.width = piece.cv.width; c.height = piece.cv.height;
      const x = c.getContext('2d'); x.drawImage(piece.cv, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = color; x.fillRect(0, 0, c.width, c.height);
      m.set(color, c);
    }
    return c;
  }
}
J.glyphs = new GlyphCache();
let _pid = 0;

function decompose(fontKey, ch, res) {
  const S = Math.ceil(res * 1.45), half = S / 2;
  const cv = document.createElement('canvas'); cv.width = S; cv.height = S;
  const x = cv.getContext('2d', { willReadFrequently: true });
  x.font = J.fontCSS(fontKey, res); x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#fff';
  x.fillText(ch, half, half);
  const img = x.getImageData(0, 0, S, S).data;
  const N = S * S, A = new Uint8Array(N);
  for (let i = 0; i < N; i++) A[i] = img[i * 4 + 3];
  const L = new Int32Array(N), TH = 60;
  const stack = new Int32Array(N);
  let nl = 0; const boxes = [];
  for (let i = 0; i < N; i++) {
    if (A[i] < TH || L[i]) continue;
    nl++; let sp = 0; stack[sp++] = i; L[i] = nl;
    let x0 = S, y0 = S, x1 = 0, y1 = 0, area = 0;
    while (sp) {
      const p = stack[--sp], px = p % S, py = (p / S) | 0; area++;
      if (px < x0) x0 = px; if (px > x1) x1 = px; if (py < y0) y0 = py; if (py > y1) y1 = py;
      for (let dy = -1; dy <= 1; dy++) {
        const yy = py + dy; if (yy < 0 || yy >= S) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const xx = px + dx; if (xx < 0 || xx >= S) continue;
          const q = yy * S + xx;
          if (!L[q] && A[q] >= TH) { L[q] = nl; stack[sp++] = q; }
        }
      }
    }
    boxes[nl] = { x0, y0, x1, y1, area };
  }
  // attach anti-aliased fringe pixels to neighbouring labels (two dilation passes)
  for (let pass = 0; pass < 2; pass++) {
    const L2 = L.slice();
    for (let p = 0; p < N; p++) {
      if (L[p] || !A[p]) continue;
      const px = p % S, py = (p / S) | 0;
      let lab = 0;
      if (px > 0 && L[p - 1]) lab = L[p - 1]; else if (px < S - 1 && L[p + 1]) lab = L[p + 1];
      else if (py > 0 && L[p - S]) lab = L[p - S]; else if (py < S - 1 && L[p + S]) lab = L[p + S];
      if (lab) { L2[p] = lab; const b = boxes[lab]; if (px < b.x0) b.x0 = px; if (px > b.x1) b.x1 = px; if (py < b.y0) b.y0 = py; if (py > b.y1) b.y1 = py; }
    }
    L.set(L2);
  }
  // merge specks into nearest bigger piece
  const minA = res * res * 0.0012;
  const remap = new Int32Array(nl + 1);
  for (let l = 1; l <= nl; l++) remap[l] = l;
  for (let l = 1; l <= nl; l++) {
    const b = boxes[l]; if (b.area >= minA) continue;
    let best = 0, bd = 1e9; const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2;
    for (let m = 1; m <= nl; m++) {
      if (m === l || boxes[m].area < minA) continue;
      const o = boxes[m]; const dx = Math.max(o.x0 - cx, 0, cx - o.x1), dy = Math.max(o.y0 - cy, 0, cy - o.y1);
      const d = dx * dx + dy * dy; if (d < bd) { bd = d; best = m; }
    }
    if (best) { remap[l] = best; const o = boxes[best]; o.x0 = Math.min(o.x0, b.x0); o.y0 = Math.min(o.y0, b.y0); o.x1 = Math.max(o.x1, b.x1); o.y1 = Math.max(o.y1, b.y1); }
  }
  const pieces = [];
  for (let l = 1; l <= nl; l++) {
    if (remap[l] !== l) continue;
    const b = boxes[l]; const w = b.x1 - b.x0 + 1, h = b.y1 - b.y0 + 1;
    const pc = document.createElement('canvas'); pc.width = w; pc.height = h;
    const px = pc.getContext('2d'); const id = px.createImageData(w, h); const d = id.data;
    for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) {
      const p = (b.y0 + yy) * S + (b.x0 + xx);
      if (remap[L[p]] === l && L[p]) { const o = (yy * w + xx) * 4; d[o] = d[o + 1] = d[o + 2] = 255; d[o + 3] = A[p]; }
    }
    px.putImageData(id, 0, 0);
    pieces.push({
      id: ++_pid, cv: pc, res,
      // centre & size in em units, relative to glyph centre
      cx: ((b.x0 + b.x1 + 1) / 2 - half) / res, cy: ((b.y0 + b.y1 + 1) / 2 - half) / res,
      w: w / res, h: h / res, area: b.area / (res * res),
      frags: null,
    });
  }
  pieces.sort((a, b) => b.area - a.area);
  return { ch, res, pieces };
}

/* split a piece into up to 3 convex fragments (for shatter) — local em coords around piece centre */
J.fragments = (pc, seed) => {
  if (pc.frags) return pc.frags;
  const w = pc.w, h = pc.h;
  let polys = [[[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]]];
  const cuts = Math.max(pc.w, pc.h) > 0.42 ? 2 : Math.max(pc.w, pc.h) > 0.2 ? 1 : 0;
  for (let c = 0; c < cuts; c++) {
    const next = [];
    for (const poly of polys) {
      const ang = (w > h ? Math.PI / 2 : 0) + J.rs(seed, pc.id, c) * 0.5;
      const nx = Math.cos(ang), ny = Math.sin(ang);
      const cx = poly.reduce((s, p) => s + p[0], 0) / poly.length, cy = poly.reduce((s, p) => s + p[1], 0) / poly.length;
      const off = J.rs(seed, pc.id, c, 7) * 0.12 * Math.max(w, h);
      const d0 = nx * cx + ny * cy + off;
      next.push(clipHalf(poly, nx, ny, d0, 1), clipHalf(poly, nx, ny, d0, -1));
    }
    polys = next.filter(p => p.length >= 3);
  }
  pc.frags = polys.map(p => {
    const cx = p.reduce((s, q) => s + q[0], 0) / p.length, cy = p.reduce((s, q) => s + q[1], 0) / p.length;
    return { poly: p, cx, cy };
  });
  return pc.frags;
};
function clipHalf(poly, nx, ny, d0, sgn) {
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    const da = sgn * (nx * a[0] + ny * a[1] - d0), db = sgn * (nx * b[0] + ny * b[1] - d0);
    if (da >= 0) out.push(a);
    if ((da >= 0) !== (db >= 0)) { const t = da / (da - db); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); }
  }
  return out;
}
})();
