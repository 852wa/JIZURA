/* JIZURA pack: decorB — 55 more graphic accents: Japanese motifs, sci-fi HUD, print & stationery, nature / atmosphere, graphic shapes, UI widgets */
(() => {
'use strict';
const E = J.E;
const PK = 'decorB';
const DEG = J.DEG, TAU = J.TAU;

/* ============================================================
   shared helpers
   ============================================================ */
const U = env => Math.min(env.W, env.H) / 1080;                    // 1 at 1080p short side
const MG = env => Math.round(Math.min(env.W, env.H) * 0.05);        // safe margin
const monoF = env => (env.st.fonts.mono && env.st.fonts.mono[0]) || 'mono';
const bodyF = env => (env.st.fonts.body && env.st.fonts.body[0]) || 'gothic_med';
const serifF = env => (env.st.fonts.serif && env.st.fonts.serif[0]) || 'mincho';
const dispF = env => (env.st.fonts.display && env.st.fonts.display[0]) || 'gothic_black';
const dark = env => J.lum(env.sc.bg) < 0.5;
const inE = (env, d = 0.4, delay = 0, ease = E.outExpo) => ease(J.clamp((env.lt - delay) / d));
const outE = env => 1 - E.inCubic(env.pOut);
const L2 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const colOf = (env, c, g) => (env.pass === 'main' ? c : g ? env.passColor : null);
const FS = env => Math.max(12, 16 * U(env));                         // small label size
/* a scheme colour that is actually visible on the background (falls back to fg) */
const vis = (env, c, min = 1.5) => (c && J.contrast(c, env.sc.bg) >= min ? c : env.sc.fg);
const ACC = env => vis(env, env.sc.accent);
const ACC2 = env => vis(env, env.sc.accent2 || env.sc.accent);

/* lyric bbox: remember the last real one per cut so decor never jumps to the centre while the text is hidden */
const BBC = new WeakMap();
const getBB = (env, bb) => {
  if (env.pOut > 0 && env.cut && BBC.has(env.cut)) return BBC.get(env.cut);     // hold the resting bbox during the exit (text may grow / fly away)
  if (bb && isFinite(bb.x0 + bb.x1 + bb.y0 + bb.y1) && bb.x1 > bb.x0 && bb.y1 > bb.y0) {
    const b = { x0: Math.max(bb.x0, -env.W * 0.1), x1: Math.min(bb.x1, env.W * 1.1), y0: Math.max(bb.y0, -env.H * 0.1), y1: Math.min(bb.y1, env.H * 1.1), boxes: bb.boxes || [], cx: bb.cx, cy: bb.cy };
    if (b.x1 <= b.x0) { b.x0 = bb.x0; b.x1 = bb.x1; }
    if (b.y1 <= b.y0) { b.y0 = bb.y0; b.y1 = bb.y1; }
    if (env.cut) BBC.set(env.cut, b);
    return b;
  }
  const c = env.cut && BBC.get(env.cut);
  return c || Object.assign({ boxes: [] }, J.centerBB(env, null));
};
const bw = bb => bb.x1 - bb.x0, bh = bb => bb.y1 - bb.y0;
const hitBB = (x0, y0, x1, y1, bb, pad = 0) => !(x1 < bb.x0 - pad || x0 > bb.x1 + pad || y1 < bb.y0 - pad || y0 > bb.y1 + pad);
const isVert = bb => bh(bb) > bw(bb) * 1.25;

/* place a w×h box next to the lyric (outside it, inside the safe margin). returns {x, y, cx, cy, ok, sx, sy} */
function nearBB(env, bb, w, h, P, gap) {
  const { W, H } = env, m = MG(env) * 0.8;
  const sx0 = P.right ? 1 : -1, sy0 = P.low ? 1 : -1;
  const order = P.corner ? [[sx0, sy0], [-sx0, sy0], [sx0, -sy0], [-sx0, -sy0]] : [[sx0, sy0], [sx0, -sy0], [-sx0, sy0], [-sx0, -sy0]];
  const tries = [];
  for (const [sx, sy] of order) {
    const ax = sx > 0 ? bb.x1 - w : bb.x0, ox = sx > 0 ? bb.x1 + gap : bb.x0 - gap - w;
    const ay = sy > 0 ? bb.y1 + gap : bb.y0 - gap - h, iy = sy > 0 ? bb.y1 - h : bb.y0;
    if ((P.v | 0) % 2) tries.push([ox, iy, sx, sy], [ax, ay, sx, sy], [ox, ay, sx, sy]);
    else tries.push([ax, ay, sx, sy], [ox, iy, sx, sy], [ox, ay, sx, sy]);
  }
  for (const [x, y, sx, sy] of tries) {
    const X = J.clamp(x, m, Math.max(m, W - m - w)), Y = J.clamp(y, m, Math.max(m, H - m - h));
    if (!hitBB(X, Y, X + w, Y + h, bb, gap * 0.4)) return { x: X, y: Y, cx: X + w / 2, cy: Y + h / 2, ok: true, sx, sy };
  }
  return cornerSpot(env, bb, w, h, P);
}
/* a screen corner (inside the margin) that keeps clear of the lyric */
function cornerSpot(env, bb, w, h, P, mk = 1) {
  const { W, H } = env, m = MG(env) * mk;
  const sx0 = P.right ? 1 : -1, sy0 = P.low ? 1 : -1;
  const order = [[sx0, sy0], [-sx0, sy0], [sx0, -sy0], [-sx0, -sy0]];
  let best = null, bestA = 1e18;
  for (const [sx, sy] of order) {
    const X = sx > 0 ? W - m - w : m, Y = sy > 0 ? H - m - h : m;
    if (!hitBB(X, Y, X + w, Y + h, bb, 8)) return { x: X, y: Y, cx: X + w / 2, cy: Y + h / 2, ok: true, sx, sy };
    const ov = Math.max(0, Math.min(X + w, bb.x1) - Math.max(X, bb.x0)) * Math.max(0, Math.min(Y + h, bb.y1) - Math.max(Y, bb.y0));
    if (ov < bestA) { bestA = ov; best = { x: X, y: Y, cx: X + w / 2, cy: Y + h / 2, ok: false, sx, sy }; }
  }
  return best;
}
const spot = (env, bb, w, h, P, gap) => (P.corner ? cornerSpot(env, bb, w, h, P) : nearBB(env, bb, w, h, P, gap));
/* free rectangles around the lyric (top / bottom / left / right), biggest usable first */
function freeRects(env, bb, gap) {
  const { W, H } = env, m = MG(env) * 0.8;
  const out = [
    { x: m, y: m, w: W - 2 * m, h: bb.y0 - gap - m, side: 't' },
    { x: m, y: bb.y1 + gap, w: W - 2 * m, h: H - m - bb.y1 - gap, side: 'b' },
    { x: m, y: m, w: bb.x0 - gap - m, h: H - 2 * m, side: 'l' },
    { x: bb.x1 + gap, y: m, w: W - m - bb.x1 - gap, h: H - 2 * m, side: 'r' },
  ].filter(r => r.w > 30 && r.h > 30);
  out.sort((a, b) => Math.min(b.w, b.h * 1.5) - Math.min(a.w, a.h * 1.5));
  return out;
}

/* stroke a polyline (round caps optional); ghost=false → main pass only */
function stroke(env, pts, c, lw, a = 1, g = false, o) {
  const k = colOf(env, c, g); if (!k || a <= 0.003 || !pts || pts.length < 2) return;
  const ctx = env.ctx;
  ctx.globalAlpha = Math.min(1, a); ctx.strokeStyle = k; ctx.lineWidth = lw;
  ctx.lineCap = (o && o.cap) || 'butt'; ctx.lineJoin = (o && o.join) || 'miter';
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  if (o && o.close) ctx.closePath();
  ctx.stroke(); ctx.globalAlpha = 1; ctx.lineCap = 'butt'; ctx.lineJoin = 'miter';
}
/* several polylines in one path */
function strokes(env, list, c, lw, a = 1, g = false, o) {
  const k = colOf(env, c, g); if (!k || a <= 0.003 || !list.length) return;
  const ctx = env.ctx;
  ctx.globalAlpha = Math.min(1, a); ctx.strokeStyle = k; ctx.lineWidth = lw;
  ctx.lineCap = (o && o.cap) || 'butt'; ctx.lineJoin = (o && o.join) || 'miter';
  ctx.beginPath();
  for (const pts of list) { if (!pts || pts.length < 2) continue; ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); if (o && o.close) ctx.closePath(); }
  ctx.stroke(); ctx.globalAlpha = 1; ctx.lineCap = 'butt'; ctx.lineJoin = 'miter';
}
/* many straight segments [[x0,y0,x1,y1],…] in one path */
function segs(env, list, c, lw, a = 1, g = false, cap) {
  const k = colOf(env, c, g); if (!k || a <= 0.003 || !list.length) return;
  const ctx = env.ctx;
  ctx.globalAlpha = Math.min(1, a); ctx.strokeStyle = k; ctx.lineWidth = lw; ctx.lineCap = cap || 'butt';
  ctx.beginPath();
  for (const s of list) { ctx.moveTo(s[0], s[1]); ctx.lineTo(s[2], s[3]); }
  ctx.stroke(); ctx.globalAlpha = 1; ctx.lineCap = 'butt';
}
/* many circular arcs [[cx,cy,r,a0,a1],…] (radians) in one path */
function arcs(env, list, c, lw, a = 1, g = false, cap) {
  const k = colOf(env, c, g); if (!k || a <= 0.003 || !list.length) return;
  const ctx = env.ctx;
  ctx.globalAlpha = Math.min(1, a); ctx.strokeStyle = k; ctx.lineWidth = lw; ctx.lineCap = cap || 'butt';
  ctx.beginPath();
  for (const s of list) { if (s[2] <= 0) continue; ctx.moveTo(s[0] + Math.cos(s[3]) * s[2], s[1] + Math.sin(s[3]) * s[2]); ctx.arc(s[0], s[1], s[2], s[3], s[4]); }
  ctx.stroke(); ctx.globalAlpha = 1; ctx.lineCap = 'butt';
}
/* many filled circles [[x,y,r],…] in one path */
function dots(env, list, c, a = 1, g = false) {
  const k = colOf(env, c, g); if (!k || a <= 0.003 || !list.length) return;
  const ctx = env.ctx;
  ctx.globalAlpha = Math.min(1, a); ctx.fillStyle = k; ctx.beginPath();
  for (const d of list) { if (d[2] <= 0.05) continue; ctx.moveTo(d[0] + d[2], d[1]); ctx.arc(d[0], d[1], d[2], 0, TAU); }
  ctx.fill(); ctx.globalAlpha = 1;
}
/* many stroked circles [[x,y,r],…] */
function rings(env, list, c, lw, a = 1, g = false) {
  const k = colOf(env, c, g); if (!k || a <= 0.003 || !list.length) return;
  const ctx = env.ctx;
  ctx.globalAlpha = Math.min(1, a); ctx.strokeStyle = k; ctx.lineWidth = lw; ctx.beginPath();
  for (const d of list) { if (d[2] <= 0.05) continue; ctx.moveTo(d[0] + d[2], d[1]); ctx.arc(d[0], d[1], d[2], 0, TAU); }
  ctx.stroke(); ctx.globalAlpha = 1;
}
/* many filled rects [[x,y,w,h],…] */
function rects(env, list, c, a = 1, g = false) {
  const k = colOf(env, c, g); if (!k || a <= 0.003 || !list.length) return;
  const ctx = env.ctx;
  ctx.globalAlpha = Math.min(1, a); ctx.fillStyle = k; ctx.beginPath();
  for (const r of list) if (r[2] > 0 && r[3] > 0) ctx.rect(r[0], r[1], r[2], r[3]);
  ctx.fill(); ctx.globalAlpha = 1;
}
/* filled polygons [[pts],…] in one path (nonzero → overlapping parts never double up) */
function polys(env, list, c, a = 1, g = false) {
  const k = colOf(env, c, g); if (!k || a <= 0.003 || !list.length) return;
  const ctx = env.ctx;
  ctx.globalAlpha = Math.min(1, a); ctx.fillStyle = k; ctx.beginPath();
  for (const pts of list) { if (!pts || pts.length < 3) continue; ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.closePath(); }
  ctx.fill(); ctx.globalAlpha = 1;
}
/* rounded rect path helper (main pass drawing with ctx) */
function rrPath(ctx, x, y, w, h, r) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function rrStroke(env, x, y, w, h, r, c, lw, a) {
  if (env.pass !== 'main' || a <= 0.003 || w <= 0 || h <= 0) return;
  const ctx = env.ctx; ctx.globalAlpha = Math.min(1, a); ctx.strokeStyle = c; ctx.lineWidth = lw; ctx.beginPath(); rrPath(ctx, x, y, w, h, r); ctx.stroke(); ctx.globalAlpha = 1;
}
function rrFill(env, x, y, w, h, r, c, a) {
  if (env.pass !== 'main' || a <= 0.003 || w <= 0 || h <= 0) return;
  const ctx = env.ctx; ctx.globalAlpha = Math.min(1, a); ctx.fillStyle = c; ctx.beginPath(); rrPath(ctx, x, y, w, h, r); ctx.fill(); ctx.globalAlpha = 1;
}
/* dashed straight line (main pass only) */
function dash(env, x0, y0, x1, y1, on, off, c, lw, a = 1, phase = 0) {
  if (env.pass !== 'main' || a <= 0.003) return;
  const L = Math.hypot(x1 - x0, y1 - y0); if (L < 1) return;
  const dx = (x1 - x0) / L, dy = (y1 - y0) / L, per = on + off, list = [];
  let s = -(((phase % per) + per) % per);
  for (let i = 0; i < 600 && s < L; i++, s += per) {
    const a0 = Math.max(0, s), a1 = Math.min(L, s + on);
    if (a1 > a0) list.push([x0 + dx * a0, y0 + dy * a0, x0 + dx * a1, y0 + dy * a1]);
  }
  segs(env, list, c, lw, a, false);
}
/* sub-polyline between length fractions e0..e1 */
function part(pts, e0, e1) {
  e0 = J.clamp(e0); e1 = J.clamp(e1);
  if (e1 <= e0 || pts.length < 2) return [];
  const d = [0];
  for (let i = 1; i < pts.length; i++) d.push(d[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const L = d[d.length - 1]; if (L <= 0) return [];
  const A = e0 * L, B = e1 * L;
  const at = s => { let i = 1; while (i < d.length - 1 && d[i] < s) i++; const k = (s - d[i - 1]) / Math.max(1e-6, d[i] - d[i - 1]); return L2(pts[i - 1], pts[i], J.clamp(k)); };
  const out = [at(A)];
  for (let i = 1; i < pts.length - 1; i++) if (d[i] > A && d[i] < B) out.push(pts[i]);
  out.push(at(B));
  return out;
}
/* point + tangent angle at length fraction t */
function along(pts, t) {
  const p = part(pts, 0, J.clamp(t, 0.0005, 1));
  const a = p[p.length - 1], b = p.length > 1 ? p[p.length - 2] : pts[0];
  return { x: a[0], y: a[1], ang: Math.atan2(a[1] - b[1], a[0] - b[0]) };
}
const arcP = (cx, cy, r, a0, a1, n = 48) => { const o = []; for (let i = 0; i <= n; i++) { const a = (a0 + (a1 - a0) * i / n) * DEG; o.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } return o; };
const ellP = (cx, cy, rx, ry, rot, a0, a1, n = 48) => { const o = [], c = Math.cos(rot), s = Math.sin(rot); for (let i = 0; i <= n; i++) { const a = (a0 + (a1 - a0) * i / n) * DEG, x = Math.cos(a) * rx, y = Math.sin(a) * ry; o.push([cx + x * c - y * s, cy + x * s + y * c]); } return o; };
const xf = (pts, cx, cy, ang = 0, s = 1) => { const c = Math.cos(ang), sn = Math.sin(ang); return pts.map(([x, y]) => [cx + (x * c - y * sn) * s, cy + (x * sn + y * c) * s]); };
const bez = (p0, p1, p2, p3, n = 20) => { const o = []; for (let i = 0; i <= n; i++) { const t = i / n, mt = 1 - t; o.push([mt * mt * mt * p0[0] + 3 * mt * mt * t * p1[0] + 3 * mt * t * t * p2[0] + t * t * t * p3[0], mt * mt * mt * p0[1] + 3 * mt * mt * t * p1[1] + 3 * mt * t * t * p2[1] + t * t * t * p3[1]]); } return o; };
/* small secondary text (never ghosted) */
const label = (env, text, x, y, o) => env.draw(Object.assign({ text: String(text), font: monoF(env), size: FS(env), x, y, color: env.sc.sub, align: 'left', track: 0.08, ghost: false }, o || {}));
const textW = (text, font, size, track = 0.08) => J.measure({ text: String(text), font, size, track }).w;
const pad2 = (n, k = 2) => String(Math.max(0, Math.floor(n))).padStart(k, '0');
/* a character from the lyric: prefer kanji, then kana */
function lyricChar(env, salt) {
  const arr = [...String(env.cut.text || env.cut.lineText || '')].filter(c => c.trim() && !J.isPunct(c));
  if (!arr.length) return '';
  const kan = arr.filter(c => J.isKanji(c));
  const pool = kan.length ? kan : arr.filter(c => J.isKata(c) || J.isHira(c) || J.isLatin(c));
  const p = pool.length ? pool : arr;
  return p[J.h(env.cut.seed, salt | 0, 5) % p.length];
}
/* 0 (touching the lyric) … 1 (clear by `soft`) */
const clearOf = (bb, x, y, pad, soft) => { const dx = Math.max(bb.x0 - pad - x, 0, x - bb.x1 - pad), dy = Math.max(bb.y0 - pad - y, 0, y - bb.y1 - pad); return J.clamp(Math.hypot(dx, dy) / soft); };
const wrap = (v, lo, span) => lo + (((v - lo) % span) + span) % span;
/* glyph boxes of the lyric in screen space, grouped into lines (or columns for vertical text) */
function glyphLines(bb) {
  const vert = isVert(bb);
  const lines = [];
  if (bb.boxes && bb.boxes.length && bb.cx != null) {
    for (const b of bb.boxes) {
      const g = { x0: bb.cx + b.x - b.w / 2, x1: bb.cx + b.x + b.w / 2, y0: bb.cy + b.y - b.h / 2, y1: bb.cy + b.y + b.h / 2 };
      const key = vert ? (g.x0 + g.x1) / 2 : (g.y0 + g.y1) / 2, sz = vert ? g.x1 - g.x0 : g.y1 - g.y0;
      let L = lines.find(l => Math.abs(l.k - key) < sz * 0.4);
      if (!L) { L = { k: key, g: [] }; lines.push(L); }
      L.g.push(g);
    }
    lines.sort((a, b) => (vert ? b.k - a.k : a.k - b.k));
    for (const L of lines) L.g.sort((a, b) => (vert ? a.y0 - b.y0 : a.x0 - b.x0));
  }
  return { vert, lines };
}

const DEF = {};
/* decor placed relative to the lyric wait until the entrance has (mostly) settled, so they never jump while the bbox changes */
const settleT = env => J.clamp(((env.cut && env.cut.inDur) || 0) * 0.6, 0, 0.35);
function withSettle(draw) {
  return function (env, bb, P) {
    const s = settleT(env);
    if (s <= 0.001) return draw.call(this, env, bb, P);
    if (env.lt < s) return;
    const ev = Object.create(env); ev.lt = env.lt - s; ev.ltb = env.ltb - s;
    return draw.call(this, ev, bb, P);
  };
}

/* ============================================================
   Japanese motifs
   ============================================================ */

/* 家紋 — a family crest (circles & arcs only) drawn on inside a double ring, with its name set small beneath */
const KAMON = ['TRISKELE', 'SHIPPO', 'PLUM', 'RINGS', 'TRIPLE'];
function kamonPaths(kind) {            // unit-radius motif paths (closed polylines), local coordinates
  const out = [];
  if (kind === 0) {                    // mitsudomoe: three swirling commas
    for (let k = 0; k < 3; k++) {
      const th0 = (-90 + k * 120) * DEG, sw = 150 * DEG, h0 = 0.27, M = 30, outer = [], inner = [];
      for (let i = 0; i <= M; i++) {
        const t = i / M, th = th0 + t * sw, rc = 0.38 + 0.46 * t, w = h0 * Math.pow(1 - t, 0.85);
        outer.push([Math.cos(th) * (rc + w), Math.sin(th) * (rc + w)]);
        inner.push([Math.cos(th) * (rc - w), Math.sin(th) * (rc - w)]);
      }
      const hc = [Math.cos(th0) * 0.38, Math.sin(th0) * 0.38], rh = [Math.cos(th0), Math.sin(th0)], th = [-Math.sin(th0), Math.cos(th0)], cap = [];
      for (let i = 1; i < 16; i++) { const f = i / 16 * Math.PI; cap.push([hc[0] + h0 * (-rh[0] * Math.cos(f) - th[0] * Math.sin(f)), hc[1] + h0 * (-rh[1] * Math.cos(f) - th[1] * Math.sin(f))]); }
      out.push(outer.concat(inner.reverse(), cap, [outer[0]]));
    }
  } else if (kind === 1) {             // shippō: four circles through the centre
    for (let k = 0; k < 4; k++) { const a = k * 90; out.push(arcP(Math.cos(a * DEG) * 0.5, Math.sin(a * DEG) * 0.5, 0.5, a + 180, a + 540, 40)); }
    out.push(arcP(0, 0, 0.13, -90, 270, 20));
  } else if (kind === 2) {             // umebachi: five round petals round a small centre
    for (let k = 0; k < 5; k++) { const a = -90 + k * 72; out.push(arcP(Math.cos(a * DEG) * 0.6, Math.sin(a * DEG) * 0.6, 0.3, a + 180, a + 540, 32)); }
    out.push(arcP(0, 0, 0.17, -90, 270, 20));
  } else if (kind === 3) {             // wachigai: two interlocked rings
    out.push(arcP(-0.3, 0, 0.55, 0, 360, 48), arcP(0.3, 0, 0.55, 180, 540, 48));
  } else {                             // mitsuwa: three interlocked rings
    for (let k = 0; k < 3; k++) { const a = -90 + k * 120; out.push(arcP(Math.cos(a * DEG) * 0.4, Math.sin(a * DEG) * 0.4, 0.46, a + 180, a + 540, 40)); }
  }
  return out;
}
DEF.kamon = {
  name: '家紋', nameEn: 'Family crest', tags: ['editorial', 'calm', 'emotional'], w: 0.8, layer: 'front', ae: 'shapes',
  draw(env, bb0, P) {
    if (env.pass !== 'main') return;
    const bb = getBB(env, bb0), { sc } = env, u = U(env);
    const o = outE(env); if (o <= 0.003 || env.lt < 0) return;
    const R = J.clamp(Math.min(env.W, env.H) * 0.075, 48 * u, 96 * u), fs = FS(env) * 0.85;
    const sp = spot(env, bb, R * 2.3, R * 2.3 + fs * 2.2, P, 24 * u);
    const cx = sp.cx, cy = sp.y + R * 1.15, a = o * (sp.ok ? 1 : 0.35);
    const kind = (P.v | 0) % 5, lw = Math.max(1, 1.5 * u);
    const e0 = E.inOutCubic(J.clamp(env.lt / 0.6));
    stroke(env, arcP(cx, cy, R, -90, -90 + 360 * e0, 90), sc.fg, lw, a);
    stroke(env, arcP(cx, cy, R * 0.9, 90, 90 + 360 * e0, 90), sc.fg, Math.max(1, 0.8 * u), a * 0.55);
    const spin = kind === 0 || kind === 4 ? env.ltb * 8 * (P.right ? 1 : -1) : 0;
    const ang = ((1 - E.outExpo(J.clamp(env.lt / 0.9))) * -70 + spin + (kind === 0 ? P.r * 120 : 0)) * DEG;
    const paths = kamonPaths(kind), col = P.accent ? ACC(env) : sc.fg, s = R * 0.8;
    paths.forEach((p, i) => {
      const e = E.inOutCubic(J.clamp((env.lt - 0.12 - i * 0.07) / 0.55)); if (e <= 0) return;
      stroke(env, part(xf(p, cx, cy, ang, s), 0, e), col, lw * 1.1, a, false, { join: 'round' });
    });
    env.circle(cx, cy, 2.2 * u, ACC(env), null, 0, a * inE(env, 0.3, 0.5), false);
    const le = inE(env, 0.4, 0.45, E.outCubic);
    label(env, KAMON[kind], cx, cy + R + fs * 1.35, { font: serifF(env), size: fs, align: 'center', track: 0.32, color: sc.sub, alpha: a * le });
  },
};

/* 青海波 — overlapping concentric-arc waves spreading from a screen corner, under the lyric */
DEF.seigaiha = {
  name: '青海波', nameEn: 'Seigaiha waves', tags: ['calm', 'emotional', 'editorial'], w: 0.8, layer: 'back', subtle: true, ae: 'grid',
  draw(env, bb, P) {
    if (env.pass !== 'main' || env.lt < 0) return;
    const { W, H, sc } = env, u = U(env);
    const o = outE(env); if (o <= 0.003) return;
    const r = J.clamp(Math.min(W, H) * 0.05, 34 * u, 60 * u);
    const sx = P.right ? 1 : -1, sy = P.low ? 1 : -1, ox = sx > 0 ? W : 0, oy = sy > 0 ? H : 0;
    const pw = W * J.rr(0.42, 0.62, P.seed, 1), ph = H * J.rr(0.45, 0.65, P.seed, 2);
    const grow = E.outCubic(J.clamp(env.lt / 1.0)) * 1.3;
    const drift = ((env.ltb * 7 * u) % (2 * r)) * -sx;
    const NR = 4, gam = [];                               // visible arc range per ring (clipped by the row below)
    for (let k = 0; k < NR; k++) { const rho = r * (1 - k / NR), ca = (rho * rho + 1.25 * r * r - r * r) / (2 * rho * 1.118 * r); gam.push(Math.max(0, Math.acos(J.clamp(ca, -1, 1)) - 26.565 * DEG)); }
    const buckets = [[], [], [], []];
    const rows = Math.ceil(ph / (r / 2)) + 2, cols = Math.ceil(pw / (2 * r)) + 2;
    const y0 = sy > 0 ? H - ph : -r, x0 = sx > 0 ? W - pw - 2 * r : -2 * r;
    for (let j = 0; j < rows && j < 80; j++) {
      const y = y0 + j * r / 2;
      for (let i = 0; i < cols && i < 60; i++) {
        const x = x0 + i * 2 * r + (j % 2) * r + drift;
        const d = Math.hypot((x - ox) / pw, (y - oy) / ph);
        const f = Math.pow(J.clamp(1 - d), 0.6) * J.clamp((grow - d) * 3);
        if (f <= 0.04) continue;
        const b = Math.min(3, Math.floor(f * 4));
        for (let k = 0; k < NR; k++) buckets[b].push([x, y, r * (1 - k / NR), Math.PI + gam[k], TAU - gam[k]]);
      }
    }
    const col = P.accent ? ACC(env) : sc.sub, base = (P.accent ? 0.5 : 0.46) * (dark(env) ? 1 : 0.8) * o;
    const lw = Math.max(1, 1.3 * u);
    buckets.forEach((l, b) => arcs(env, l, col, lw, base * (b + 1) / 4));
  },
};

/* 麻の葉 — the hemp-leaf lattice seen through a round (or square) window that irises open behind the lyric */
DEF.asanoha = {
  name: '麻の葉', nameEn: 'Asanoha leaves', tags: ['calm', 'editorial', 'emotional'], w: 0.8, layer: 'back', subtle: true, ae: 'grid',
  draw(env, bb, P) {
    if (env.pass !== 'main' || env.lt < 0) return;
    const { W, H, sc, ctx } = env, u = U(env);
    const o = outE(env); if (o <= 0.003) return;
    const M = Math.min(W, H), R0 = M * J.rr(0.27, 0.36, P.seed, 1), portrait = H > W * 1.1;
    const cx = portrait ? W * (0.5 + (P.right ? 0.14 : -0.14)) : W * (0.5 + (P.right ? 0.22 : -0.22)) + J.rs(P.seed, 2) * W * 0.04;
    const cy = portrait ? H * (P.low ? 0.66 : 0.34) : H * (0.5 + (P.low ? 0.07 : -0.07));
    const e = E.outCubic(J.clamp(env.lt / 0.8)), R = R0 * e * (1 + 0.06 * E.inCubic(env.pOut));
    if (R < 2) return;
    const sq = !!P.corner, s = R0 / 3.2, h3 = s * Math.sqrt(3) / 2, rot = (P.r * 60 + env.ltb * 2.5) * DEG;
    const c = Math.cos(rot), sn = Math.sin(rot), T = (x, y) => [cx + x * c - y * sn, cy + x * sn + y * c];
    const col = P.accent ? ACC(env) : sc.sub, al = (dark(env) ? 0.3 : 0.34) * o, lw = Math.max(1, 1.1 * u);
    ctx.save(); ctx.beginPath();
    if (sq) rrPath(ctx, cx - R, cy - R, R * 2, R * 2, 6 * u); else ctx.arc(cx, cy, R, 0, TAU);
    ctx.clip();
    const n = Math.ceil(R0 * 1.5 / s) + 1, grid = [], star = [];
    const bloom = E.outCubic(J.clamp((env.lt - 0.15) / 0.8));
    for (let j = -n; j <= n; j++) for (let i = -n; i <= n; i++) {
      const px = i * s + j * s / 2, py = j * h3;
      if (Math.hypot(px, py) > R0 * 1.45) continue;
      const A = T(px, py), B = T(px + s, py), C = T(px + s / 2, py + h3), D = T(px + s * 1.5, py + h3);
      grid.push([A[0], A[1], B[0], B[1]], [A[0], A[1], C[0], C[1]], [B[0], B[1], C[0], C[1]]);
      for (const tri of [[A, B, C], [B, D, C]]) {
        const g = [(tri[0][0] + tri[1][0] + tri[2][0]) / 3, (tri[0][1] + tri[1][1] + tri[2][1]) / 3];
        for (const v of tri) star.push([g[0], g[1], J.lerp(g[0], v[0], bloom), J.lerp(g[1], v[1], bloom)]);
      }
    }
    segs(env, grid, col, lw, al * 0.8);
    if (bloom > 0) segs(env, star, col, lw, al);
    ctx.restore();
    const e2 = E.inOutCubic(J.clamp(env.lt / 0.9));
    if (sq) stroke(env, part([[cx - R, cy - R], [cx + R, cy - R], [cx + R, cy + R], [cx - R, cy + R], [cx - R, cy - R]], 0, e2), col, lw * 1.3, al * 1.6);
    else stroke(env, arcP(cx, cy, R, -90, -90 + 360 * e2, 96), col, lw * 1.3, al * 1.6);
    const R2 = R + 7 * u;
    if (!sq) stroke(env, arcP(cx, cy, R2, 90, 90 + 300 * e2, 90), col, Math.max(1, 0.8 * u), al * 0.9);
  },
};

/* 花火 — firework shells bursting in the free space around the lyric (chrysanthemum trails, peony stars or drooping willow) */
DEF.hanabi = {
  name: '花火', nameEn: 'Fireworks', tags: ['emotional', 'pop', 'calm'], w: 0.8, layer: 'front', ae: 'sparks',
  draw(env, bb0, P) {
    if (env.pass !== 'main') return;
    const bb = getBB(env, bb0), { sc } = env, u = U(env);
    const o = outE(env); if (o <= 0.003 || env.lt < 0) return;
    const fr = freeRects(env, bb, 26 * u); if (!fr.length) return;
    const nB = 2 + ((P.n | 0) % 2), T = 2.2, style = (P.v | 0) % 3;
    const cols = [ACC(env), ACC2(env), sc.fg];
    const pad = 8 * u, soft = 30 * u;
    for (let k = 0; k < nB; k++) {
      const all = env.ltb - 0.02 - k * 0.6; if (all < 0) continue;
      const cyc = Math.floor(all / T), tau = all - cyc * T;
      const rr = i => J.r(P.seed, k, cyc, i);
      const reg = fr[(k + cyc) % Math.min(2, fr.length)];
      const R = J.clamp(Math.min(reg.w * 0.5, reg.h) * 0.5, 44 * u, 190 * u) * (0.75 + 0.3 * rr(3));
      const x = reg.x + R * 0.9 + Math.max(0, reg.w - R * 1.8) * rr(1), y = reg.y + R * 0.8 + Math.max(0, reg.h - R * 1.7) * rr(2);
      const c1 = cols[(k + cyc) % 3], c2 = cols[(k + cyc + 1) % 3];
      const rise = 0.3;
      if (tau < rise) {                                   // rising shell with a short tail
        const q = E.outCubic(tau / rise), yy = y + R * 1.1 * (1 - q);
        const al = clearOf(bb, x, yy, pad, soft);
        segs(env, [[x, yy, x, yy + 34 * u * (1 - q * 0.7)]], c1, 1.4 * u, 0.7 * o * al, false, 'round');
        dots(env, [[x, yy, 2.2 * u]], c1, o * al);
        continue;
      }
      const tb = tau - rise, life = style === 2 ? 1.75 : 1.4;
      if (tb > life) continue;
      const fade = 1 - J.clamp((tb - life * 0.4) / (life * 0.6));
      const g = R * (style === 2 ? 0.75 : 0.28);
      if (tb < 0.16) dots(env, [[x, y, R * 0.16 * (1 - tb / 0.16) + 2 * u]], sc.fg, 0.6 * o * clearOf(bb, x, y, pad, soft));
      for (const [M, rk, col, lw] of [[style === 1 ? 32 : 28, 1, c1, 1.4 * u], [style === 2 ? 0 : 16, 0.52, c2, 1.2 * u]]) {
        if (!M) continue;
        const segL = [], segT = [], hd = [];
        for (let i = 0; i < M; i++) {
          const th = (i + J.r(P.seed, k, cyc, i, rk * 10) * 0.35) / M * TAU + rk, sp = rk * (0.86 + 0.18 * J.r(P.seed, k, cyc, i, 3));
          const pos = style === 2
            ? t => { const rad = R * sp * (1 - Math.exp(-t * 2.6)); return [x + Math.cos(th) * rad, y + Math.sin(th) * rad + g * 0.55 * t * t]; }
            : t => { const rad = R * sp * E.outCubic(J.clamp(t / 0.85)); return [x + Math.cos(th) * rad, y + Math.sin(th) * rad + g * t * t]; };
          const p = pos(tb);
          const al = clearOf(bb, p[0], p[1], pad, soft); if (al <= 0.3) continue;
          const tw = tb > life * 0.5 && J.r(P.seed, k, i, env.step) < 0.4 ? 0.2 : 1;
          if (style === 1) { hd.push([p[0], p[1], 2.6 * u * (0.5 + 0.5 * fade) * tw]); const q = pos(Math.max(0, tb - 0.05)); segL.push([q[0], q[1], p[0], p[1]]); }
          else if (style === 2) { const q = []; for (let j = 0; j <= 7; j++) q.push(pos(Math.max(0, tb - 0.9 + j * 0.9 / 7))); for (let j = 3; j <= 7; j++) segL.push([q[j - 1][0], q[j - 1][1], q[j][0], q[j][1]]); for (let j = 1; j < 3; j++) segT.push([q[j - 1][0], q[j - 1][1], q[j][0], q[j][1]]); hd.push([p[0], p[1], 1.6 * u * tw]); }
          else { const q = pos(Math.max(0, tb - 0.2)); segL.push([q[0], q[1], p[0], p[1]]); hd.push([p[0], p[1], 2 * u * tw]); }
        }
        segs(env, segT, col, lw, 0.3 * o * fade, false, 'round');
        segs(env, segL, col, lw, (style === 1 ? 0.35 : 0.8) * o * fade, false, 'round');
        dots(env, hd, col, o * fade);
      }
    }
  },
};

/* 提灯 — paper lanterns dropping in on strings from the top edge, swinging, each bearing a character of the lyric */
DEF.chochin = {
  name: '提灯', nameEn: 'Lantern', tags: ['emotional', 'pop', 'calm'], w: 0.7, layer: 'front', ae: 'shapes',
  draw(env, bb0, P) {
    if (env.pass !== 'main') return;
    const bb = getBB(env, bb0), { W, H, sc, ctx } = env, u = U(env), m = MG(env);
    const o = outE(env); if (o <= 0.003 || env.lt < 0) return;
    const lw0 = J.clamp(Math.min(W, H) * 0.066, 42 * u, 86 * u), lh = lw0 * 1.32, gap = 24 * u;
    const K = Math.max(5, Math.floor((W - 2 * m) / (lw0 * 1.9))), cands = [];
    for (let i = 0; i < K; i++) {
      const x = m + lw0 * 0.7 + (W - 2 * m - lw0 * 1.4) * i / Math.max(1, K - 1);
      const over = x + lw0 * 0.75 > bb.x0 - gap && x - lw0 * 0.75 < bb.x1 + gap;
      const floor = over ? bb.y0 - gap : H * 0.62;
      const room = floor - lh * 1.3 - 10 * u;
      if (room >= 16 * u) cands.push({ x, room, i });
    }
    // an even, symmetric-ish spread: every other slot starting from a seed-dependent phase
    const want = Math.min(K, 3 + (P.n | 0) % 3), pick = [];
    for (let j = 0; j < want; j++) {
      const ideal = Math.round((j + 0.5) * K / want - 0.5 + J.rs(P.seed, j, 4) * 0.4);
      const c = cands.filter(c => pick.every(p => Math.abs(p.x - c.x) > lw0 * 1.6)).sort((a, b) => Math.abs(a.i - ideal) - Math.abs(b.i - ideal))[0];
      if (c && Math.abs(c.i - ideal) <= Math.max(1, K / want / 2)) pick.push(c);
    }
    pick.sort((a, b) => a.x - b.x);
    const body = ACC(env), rib = J.mix(body, sc.bg, 0.45), cap = dark(env) ? sc.fg : (sc.ink || sc.fg);
    const txtC = J.lum(body) > 0.55 ? '#000000' : sc.bg;
    pick.forEach((p, j) => {
      const q = J.clamp((env.lt - 0.03 - j * 0.08) / 0.6); if (q <= 0) return;
      const Lf = Math.min(p.room, p.room * (0.25 + 0.6 * J.r(P.seed, p.i, 2)) + 20 * u);
      const drop = E.outBack(q, 1.4), L = J.lerp(-lh * 1.6, Lf, drop);
      const amp = (2.5 + 8 * Math.exp(-env.lt * 1.5)) * (J.r(P.seed, j, 3) < 0.5 ? 1 : -1), ang = amp * Math.sin(env.ltb * (1.7 + j * 0.23) + j * 1.3) * DEG;
      ctx.save(); ctx.translate(p.x, 0); ctx.rotate(ang);
      const top = L, cy = top + lh / 2;
      if (top > 0) segs(env, [[0, 0, 0, top]], sc.sub, Math.max(1, u), 0.8 * o);
      if (dark(env)) { dots(env, [[0, cy, lw0 * 1.05]], body, 0.06 * o); dots(env, [[0, cy, lw0 * 0.78]], body, 0.08 * o); }
      const shape = [];
      for (let i = 0; i <= 32; i++) { const t = i / 32 * TAU, cs = Math.cos(t), sn = Math.sin(t); shape.push([Math.sign(cs) * Math.pow(Math.abs(cs), 0.8) * lw0 / 2, Math.sign(sn) * Math.pow(Math.abs(sn), 0.9) * lh * 0.42 + cy]); }
      polys(env, [shape], body, 0.94 * o);
      const rl = [];
      for (let k = 1; k < 8; k++) { const yy = -lh * 0.42 + lh * 0.84 * k / 8, sn = Math.pow(Math.abs(yy) / (lh * 0.42), 1 / 0.9), f = Math.pow(Math.sqrt(Math.max(0, 1 - sn * sn)), 0.8) * lw0 / 2 - 1.5 * u; if (f > 2 * u) rl.push([-f, cy + yy, f, cy + yy]); }
      segs(env, rl, rib, Math.max(1, 1.1 * u), 0.7 * o);
      rects(env, [[-lw0 * 0.27, cy - lh * 0.5, lw0 * 0.54, lh * 0.1], [-lw0 * 0.27, cy + lh * 0.4, lw0 * 0.54, lh * 0.1]], cap, o);
      const ch = lyricChar(env, p.i * 7 + 1);
      if (ch) env.draw({ text: ch, font: serifF(env) === 'mincho_light' ? 'mincho_bold' : serifF(env), size: lw0 * 0.5, x: 0, y: cy + lw0 * 0.02, color: txtC, alpha: o * J.clamp((q - 0.35) / 0.4), ghost: false });
      const ts = [];
      for (let k = -2; k <= 2; k++) ts.push([k * 2.4 * u, cy + lh * 0.5, k * 3.2 * u, cy + lh * 0.5 + lh * 0.24]);
      segs(env, ts, body, Math.max(1, u), 0.85 * o);
      ctx.restore();
    });
  },
};

/* 注連縄 — a twisted sacred rope sagging across the free band, with zigzag shide papers and straw tassels */
DEF.shimenawa = {
  name: '注連縄', nameEn: 'Shimenawa rope', tags: ['editorial', 'emotional', 'calm'], w: 0.6, layer: 'front', ae: 'leaders',
  draw(env, bb0, P) {
    if (env.pass !== 'main') return;
    const bb = getBB(env, bb0), { W, H, sc, ctx } = env, u = U(env), m = MG(env);
    const o = outE(env); if (o <= 0.003 || env.lt < 0) return;
    const gap = 30 * u, need0 = 210 * u;
    const topRoom = bb.y0 - gap - m * 0.3, botRoom = H - m * 0.4 - bb.y1 - gap;
    const top = P.low ? !(botRoom >= need0 * 0.7 || botRoom > topRoom) : (topRoom >= need0 * 0.7 || topRoom >= botRoom);
    const room = top ? topRoom : botRoom; if (room < 60 * u) return;
    const k = J.clamp(room / need0, 0.4, 1.15);
    const T0 = 17 * u * k, sag = 46 * u * k, shL = 112 * u * k, shW = shL * 0.17;
    const ya = top ? m * 0.3 + T0 * 0.6 : bb.y1 + gap + T0 * 0.6;
    const Y = x => ya + sag * 4 * (x / W) * (1 - x / W), TK = x => T0 * (0.45 + 0.55 * Math.sin(Math.PI * J.clamp(x / W)));
    const e = E.inOutCubic(J.clamp(env.lt / 0.8)), half = (W / 2 + 12) * e;
    const xa = W / 2 - half, xb = W / 2 + half;
    const col = dark(env) ? sc.fg : (sc.ink || sc.fg), lw = Math.max(1, 1.1 * u);
    // rope: slanted twisted bundles separated by hairline gaps
    const step = T0 * 1.05, ph = (env.ltb * 5 * u) % step, twist = [];
    for (let x = -2 * step + ph; x < W + step; x += step) {
      if (x < xa - step * 0.5 || x > xb) continue;
      const x0 = Math.max(xa, x), x1 = Math.min(xb, x + step * 0.82), sl = TK(x) * 0.7;
      if (x1 - x0 < 1) continue;
      twist.push([[x0, Y(x0) - TK(x0) / 2], [x1, Y(x1) - TK(x1) / 2], [x1 + sl, Y(x1) + TK(x1) / 2], [x0 + sl, Y(x0) + TK(x0) / 2]]);
    }
    polys(env, twist, col, 0.82 * o);
    const tp = [], bt = [];
    for (let x = xa; x <= xb + 0.1; x += 8 * u) { tp.push([x, Y(x) - TK(x) / 2 - 1.5 * u]); bt.push([x, Y(x) + TK(x) / 2 + 1.5 * u]); }
    strokes(env, [tp, bt], col, lw, 0.45 * o);
    const ns = 3 + ((P.n | 0) % 2 ? 1 : 0), paperC = dark(env) ? sc.fg : sc.bg;
    for (let i = 0; i < ns; i++) {
      const x = W * (i + 1) / (ns + 1), ex = Math.abs(x - W / 2) / (W / 2 + 12);
      if (e < ex) continue;
      const qy = E.outBack(J.clamp((env.lt - 0.2 - ex * 0.5) / 0.45), 1.6); if (qy <= 0) continue;
      const y = Y(x) + TK(x) / 2, sw = Math.sin(env.ltb * 1.4 + i * 1.7) * 3 * DEG;
      ctx.save(); ctx.translate(x, y); ctx.rotate(sw); ctx.scale(1, qy);
      const h = shL / 4, rs = [];
      for (let s = 0; s < 4; s++) {
        const dx = (s % 2 ? shW * 0.62 : 0) - shW / 2, sk = (s % 2 ? -1 : 1) * shW * 0.18;
        rs.push([[dx, s * h], [dx + shW, s * h + sk * 0.3], [dx + shW + sk, (s + 1) * h + 0.5], [dx + sk, (s + 1) * h + 0.5 - sk * 0.3]]);
      }
      polys(env, rs, paperC, 0.94 * o);
      if (!dark(env)) strokes(env, rs, sc.fg, Math.max(1, u), 0.85 * o, false, { close: true });
      ctx.restore();
      if (i < ns - 1) {                                    // straw tassels between the papers
        const tx = W * (i + 1.5) / (ns + 1), ty = Y(tx) + TK(tx) / 2, tl = shL * 0.36 * E.outCubic(J.clamp((env.lt - 0.4) / 0.4)), t = [];
        for (let s = -4; s <= 4; s++) t.push([tx + s * 1.4 * u, ty, tx + s * 2 * u + Math.sin(env.ltb * 1.2 + i) * 2 * u, ty + tl * (1 - Math.abs(s) * 0.05)]);
        if (tl > 1) segs(env, t, sc.sub, Math.max(1, u), 0.85 * o);
      }
    }
  },
};

/* 扇 — a folding fan that opens with pleated ribs (plain, with a red sun, or with painted wave bands) and folds shut on exit */
DEF.sensu = {
  name: '扇', nameEn: 'Fan', tags: ['emotional', 'editorial', 'calm'], w: 0.8, layer: 'front', ae: 'shapes',
  draw(env, bb0, P) {
    if (env.pass !== 'main') return;
    const bb = getBB(env, bb0), { sc } = env, u = U(env);
    const o = outE(env); if (o <= 0.003 || env.lt < 0) return;
    const R = J.clamp(Math.min(env.W, env.H) * 0.105, 62 * u, 124 * u), r0 = R * 0.36;
    const sp = spot(env, bb, R * 2.05, R * 1.2, P, 22 * u), a = o * (sp.ok ? 1 : 0.35);
    const tilt = (P.right ? 1 : -1) * (5 + P.r * 9);
    const px = sp.cx, py = sp.y + R * 1.12;
    const open = E.outBack(J.clamp((env.lt - 0.05) / 0.65), 1.1) * (1 - 0.9 * E.inCubic(env.pOut));
    const spread = 12 + 140 * open, N = 14, v = (P.v | 0) % 3;
    const ang = i => (-90 + tilt - spread / 2 + spread * i / N) * DEG;
    const outer = [], inner = [], ribs = [], folds = [];
    for (let i = 0; i <= N; i++) {
      const an = ang(i), c = Math.cos(an), s = Math.sin(an), rr = R * (i % 2 ? 0.965 : 1);
      outer.push([px + c * rr, py + s * rr]); inner.push([px + c * r0, py + s * r0]);
      ribs.push([px + c * R * 0.06, py + s * R * 0.06, px + c * r0, py + s * r0]);
      if (i > 0 && i < N) folds.push([px + c * r0, py + s * r0, px + c * rr, py + s * rr]);
    }
    const leaf = outer.concat(inner.slice().reverse());
    const ac = ACC(env);
    polys(env, [leaf], ac, 0.13 * a);
    if (v === 1 && open > 0.6) {                          // hinomaru painted on the leaf
      const an = (-90 + tilt) * DEG, rc = (r0 + R) / 2;
      dots(env, [[px + Math.cos(an) * rc, py + Math.sin(an) * rc, (R - r0) * 0.28 * J.clamp((open - 0.6) / 0.4)]], ac, 0.9 * a);
    } else if (v === 2) {                                 // painted wave bands following the leaf
      for (const f of [0.55, 0.72]) { const pts = []; for (let i = 0; i <= 40; i++) { const an = ang(i * N / 40), rr = J.lerp(r0, R, f) + Math.sin(i / 40 * TAU * 2 + env.ltb) * 3 * u; pts.push([px + Math.cos(an) * rr, py + Math.sin(an) * rr]); } stroke(env, pts, ac, 2 * u, 0.8 * a); }
    }
    segs(env, folds, sc.fg, Math.max(1, 0.8 * u), 0.45 * a);
    segs(env, ribs, sc.fg, Math.max(1, 1.1 * u), 0.8 * a);
    stroke(env, outer, sc.fg, Math.max(1, 1.3 * u), 0.95 * a, false, { join: 'round' });
    stroke(env, inner, sc.fg, Math.max(1, 1.1 * u), 0.8 * a);
    segs(env, [[px, py, outer[0][0], outer[0][1]], [px, py, outer[N][0], outer[N][1]]], sc.fg, Math.max(1, 1.6 * u), a);
    env.circle(px, py, 4 * u, null, sc.fg, Math.max(1, u), a, false);
    env.circle(px, py, 1.6 * u, ac, null, 0, a, false);
  },
};

/* 月に雲 — a moon (full or crescent) with a haloed ring, crossed by a curling Japanese cloud that drifts past */
function kumo(x0, yb, L, hc) {             // stylised cloud outline: bumpy top, flat base, spiral curl on the left
  const bumps = [[0.22, 0.5], [0.48, 0.78], [0.74, 0.55], [0.9, 0.32]];
  const top = [];
  for (let i = 0; i <= 44; i++) {
    const x = x0 + L * i / 44; let y = yb;
    for (const [bx, br] of bumps) { const dx = x - (x0 + L * bx), R = br * hc; if (Math.abs(dx) < R) y = Math.min(y, yb - Math.sqrt(R * R - dx * dx)); }
    top.push([x, y]);
  }
  const curl = [], c = [x0 - hc * 0.05, yb - hc * 0.3];
  for (let i = 0; i <= 30; i++) { const t = i / 30, an = (90 + t * 400) * DEG, r = hc * 0.3 * (1 - t * 0.78); curl.push([c[0] - Math.cos(an) * r * 1.1, c[1] + Math.sin(an) * r]); }
  return { outline: top.concat([[x0 + L, yb], [x0, yb]]), curl };
}
DEF.tsukiKumo = {
  name: '月に雲', nameEn: 'Moon and clouds', tags: ['emotional', 'calm', 'editorial'], w: 0.8, layer: 'front', ae: 'shapes',
  draw(env, bb0, P) {
    if (env.pass !== 'main') return;
    const bb = getBB(env, bb0), { sc } = env, u = U(env);
    const o = outE(env); if (o <= 0.003 || env.lt < 0) return;
    const Rm = J.clamp(Math.min(env.W, env.H) * 0.064, 40 * u, 84 * u);
    const bw0 = Rm * 4.6, bh0 = Rm * 2.9;
    const sp = spot(env, bb, bw0, bh0, P, 24 * u), a = o * (sp.ok ? 1 : 0.35);
    const flip = sp.cx < env.W / 2 ? -1 : 1;
    const mx = sp.cx + flip * Rm * 0.9, my = sp.y + Rm * 1.3;
    const e = E.outCubic(J.clamp(env.lt / 0.6));
    const moonC = dark(env) ? sc.fg : ACC(env), cres = (P.v | 0) % 2 === 1;
    const rr = Rm * (0.85 + 0.15 * e);
    if (cres) {
      const pts = arcP(mx, my, rr, 60, 300, 40), k = 0.62;
      const inner = []; for (let i = 0; i <= 40; i++) { const an = (300 - 240 * i / 40) * DEG; inner.push([mx + rr * 0.42 + Math.cos(an) * rr * k * 1.12, my + Math.sin(an) * rr * 0.93]); }
      polys(env, [pts.concat(inner)], moonC, 0.95 * a * e);
    } else dots(env, [[mx, my, rr]], moonC, 0.95 * a * e);
    const e2 = E.inOutCubic(J.clamp((env.lt - 0.1) / 0.7));
    stroke(env, arcP(mx, my, Rm * 1.28, -90, -90 + 360 * e2, 80), sc.sub, Math.max(1, u), 0.5 * a);
    stroke(env, arcP(mx, my, Rm * 1.5, 90, 90 + 200 * e2, 60), sc.sub, Math.max(1, 0.8 * u), 0.3 * a);
    // cloud drifting across the lower half of the moon (fills with the background so it passes in front)
    const L = Rm * 3.3, hc = Rm * 0.7, drift = Math.sin(env.ltb * 0.5 + P.r * 6) * Rm * 0.35 - flip * (1 - e) * Rm * 1.4;
    const x0 = mx - L * 0.55 + drift, yb = my + Rm * 0.62;
    const cl = kumo(x0, yb, L, hc), ce = E.inOutCubic(J.clamp((env.lt - 0.2) / 0.7));
    polys(env, [cl.outline], sc.bg, a * J.clamp(ce * 2));
    stroke(env, part(cl.outline.slice(0, -1), 0, ce), sc.fg, Math.max(1, 1.4 * u), 0.9 * a, false, { join: 'round' });
    stroke(env, part(cl.curl, 0, ce), sc.fg, Math.max(1, 1.4 * u), 0.9 * a, false, { cap: 'round', join: 'round' });
    const inner = cl.outline.slice(6, 40).map(([x, y]) => [x, y + hc * 0.28]);
    stroke(env, part(inner, 0, ce), sc.sub, Math.max(1, u), 0.5 * a);
    const ce2 = E.inOutCubic(J.clamp((env.lt - 0.35) / 0.7));
    const L2c = L * 0.55, x2 = mx + flip * Rm * 0.2 - L2c / 2 - drift * 0.6, y2 = my - Rm * 0.9;
    const c2 = kumo(x2, y2, L2c, hc * 0.55);
    stroke(env, part(c2.outline.slice(0, -1), 0, ce2), sc.sub, Math.max(1, 1.1 * u), 0.7 * a, false, { join: 'round' });
    stroke(env, part(c2.curl, 0, ce2), sc.sub, Math.max(1, 1.1 * u), 0.7 * a, false, { cap: 'round' });
  },
};

/* 紅葉 — a few maple leaves falling in a pendulum sway (tilting with each swing), clear of the lyric */
const MAPLE = (() => {
  const lobes = [[-125, 0.36], [-82, 0.66], [-42, 0.9], [0, 1], [42, 0.9], [82, 0.66], [125, 0.36]], pts = [];
  const P2 = (a, r) => [Math.sin(a * DEG) * r, -Math.cos(a * DEG) * r];
  pts.push(P2(180, 0.1));
  lobes.forEach(([a, l], i) => {
    pts.push(P2(a - 17, l * 0.6), P2(a - 11, l * 0.64), P2(a - 6, l * 0.84), P2(a, l), P2(a + 6, l * 0.84), P2(a + 11, l * 0.64), P2(a + 17, l * 0.6));
    const nx = i < lobes.length - 1 ? lobes[i + 1][0] : 180;
    pts.push(P2((a + nx) / 2, i < lobes.length - 1 ? 0.3 : 0.1));
  });
  return pts;
})();
DEF.momiji = {
  name: '紅葉', nameEn: 'Autumn leaves', tags: ['emotional', 'calm'], w: 0.8, layer: 'front', ae: 'shapes',
  draw(env, bb0, P) {
    if (env.pass !== 'main') return;
    const bb = getBB(env, bb0), { W, H, sc } = env, u = U(env);
    const o = outE(env); if (o <= 0.003 || env.lt < 0) return;
    const N = 4 + (P.n | 0) + (P.big ? 1 : 0), ac = ACC(env), cols = [ac, J.mix(ac, sc.fg, 0.3), J.mix(ac, sc.bg, 0.3)];
    const vein = dark(env) ? sc.bg : sc.bg;
    for (let i = 0; i < N; i++) {
      const r = k => J.r(P.seed, i, k);
      const q = E.outCubic(J.clamp((env.lt - r(1) * 0.35) / 0.45)); if (q <= 0) continue;
      const L = (40 + r(2) * 26) * u * (i === 0 ? 1.35 : 1), v = (38 + r(3) * 30) * u, om = 1.3 + r(4) * 0.9, ph = r(5) * TAU;
      const span = H + L * 4, y = wrap(r(6) * span + v * env.ltb, -L * 2, span);
      const x0 = W * (i + 0.5) / N + J.rs(P.seed, i, 7) * W * 0.4 / N, A = (26 + r(8) * 34) * u;
      const s = Math.sin(env.ltb * om + ph), x = x0 + A * s, yy = y - Math.abs(Math.cos(env.ltb * om + ph)) * A * 0.25;
      const al = clearOf(bb, x, yy, 12 * u + L * 0.5, 30 * u); if (al <= 0.02) continue;
      const rot = (J.rs(P.seed, i, 9) * 40 + s * 38) * DEG, fx = 0.55 + 0.45 * Math.abs(Math.cos(env.ltb * om * 0.5 + ph));
      const c = Math.cos(rot), sn = Math.sin(rot), T = ([px, py]) => { const X = px * L * fx * q, Y = py * L * q; return [x + X * c - Y * sn, yy + X * sn + Y * c]; };
      const col = cols[i % 3], a = 0.92 * o * al;
      polys(env, [MAPLE.map(T)], col, a);
      const vs = [];
      for (const [ang, l] of [[0, 0.82], [-42, 0.7], [42, 0.7], [-82, 0.5], [82, 0.5]]) { const p0 = T([0, 0]), p1 = T([Math.sin(ang * DEG) * l, -Math.cos(ang * DEG) * l]); vs.push([p0[0], p0[1], p1[0], p1[1]]); }
      segs(env, vs, vein, Math.max(1, 0.9 * u), 0.45 * a);
      const s0 = T([0, 0.05]), s1 = T([0.06, 0.42]);
      segs(env, [[s0[0], s0[1], s1[0], s1[1]]], col, Math.max(1, 1.4 * u), a, false, 'round');
    }
  },
};

/* 波頭 — a row of curling wave crests (line art with water lines and spray) rising along the bottom band */
function waveCrest(x, yb, w, h) {
  const back = bez([x - w / 2, yb], [x - w * 0.18, yb], [x - w * 0.28, yb - h], [x, yb - h], 16);
  const r0 = h * 0.4, cx = x, cy = yb - h + r0, curl = [];
  for (let i = 1; i <= 30; i++) { const deg = i / 30 * 430, an = (-90 + deg) * DEG, rr = r0 * (deg < 90 ? 1 : 1 - 0.8 * (deg - 90) / 340); curl.push([cx + Math.cos(an) * rr, cy + Math.sin(an) * rr]); }
  const face = bez([cx + r0, cy], [cx + r0 * 1.05, cy + h * 0.35], [x + w * 0.3, yb], [x + w / 2, yb], 12);
  const inner = [0.7, 0.44].map(k => bez([x - w / 2 + w * 0.12 * (1 - k), yb], [x - w * 0.2, yb], [x - w * 0.24, yb - h * k], [x - w * 0.02, yb - h * k + h * 0.08], 12));
  return { crest: back.concat(curl), face, inner, top: [x + r0 * 0.9, yb - h] };
}
DEF.namiGashira = {
  name: '波頭', nameEn: 'Wave crests', tags: ['emotional', 'editorial', 'graphic'], w: 0.8, layer: 'front', ae: 'waveform',
  draw(env, bb0, P) {
    if (env.pass !== 'main') return;
    const bb = getBB(env, bb0), { W, H, sc } = env, u = U(env), m = MG(env);
    const o = outE(env); if (o <= 0.003 || env.lt < 0) return;
    const room = H - m * 0.6 - (bb.y1 + 26 * u); if (room < 34 * u) return;
    const h = Math.min(Math.min(W, H) * 0.085, room * 0.72), w = h * 2.3;
    const e = E.outCubic(J.clamp(env.lt / 0.6)), sink = (1 - e) * h * 1.2 + E.inCubic(env.pOut) * h * 0.8;
    const yb = H - m * 0.6 + sink;
    const dir = P.right ? 1 : -1, off = wrap(env.ltb * 16 * u * dir, 0, w);
    const n = Math.ceil(W / w) + 2, col = sc.fg, lw = Math.max(1, 1.5 * u);
    const crest = [], faces = [], inner = [], spray = [];
    const de = E.inOutCubic(J.clamp((env.lt - 0.05) / 0.8));
    for (let i = -1; i < n; i++) {
      const x = i * w + off - w * 0.5, hh = h * (0.82 + 0.18 * Math.sin(i * 1.7 + P.r * 6)), bob = Math.sin(env.ltb * 1.6 + i * 0.9) * h * 0.04;
      const wc = waveCrest(x, yb + bob, w, hh);
      crest.push(part(wc.crest, 0, de)); faces.push(part(wc.face, 0, de)); inner.push(...wc.inner.map(p => part(p, 0, de)));
      if (de > 0.8) for (let k = 0; k < 4; k++) { const tw = 0.5 + 0.5 * Math.sin(env.ltb * 5 + i * 3 + k * 2); spray.push([wc.top[0] + (k * 0.12 + 0.06) * w * 0.45, wc.top[1] - (k % 2 ? 0.1 : 0.2) * hh - k * 1.5 * u, (1.2 + 1.2 * tw) * u]); }
    }
    strokes(env, crest, col, lw, 0.9 * o, false, { cap: 'round', join: 'round' });
    strokes(env, faces, col, lw, 0.9 * o, false, { cap: 'round' });
    strokes(env, inner, sc.sub, Math.max(1, u), 0.6 * o, false, { cap: 'round' });
    dots(env, spray, ACC(env), 0.9 * o * J.clamp((de - 0.8) / 0.2));
    segs(env, [[m * 0.5, yb + 3 * u, W - m * 0.5, yb + 3 * u]], sc.sub, Math.max(1, 0.8 * u), 0.5 * o * de);
  },
};

/* 霞 — layered suyari-gasumi mist bands (rounded stepped bars) drifting behind the lyric, edged with a gold hairline */
DEF.kasumi = {
  name: '霞', nameEn: 'Mist', tags: ['calm', 'emotional', 'editorial'], w: 0.8, layer: 'back', subtle: true, ae: 'bars',
  draw(env, bb, P) {
    if (env.pass !== 'main' || env.lt < 0) return;
    const { W, H, sc, ctx } = env, u = U(env);
    const o = outE(env); if (o <= 0.003) return;
    const n = 2 + ((P.n | 0) % 2), hb = J.clamp(Math.min(W, H) * 0.046, 28 * u, 58 * u);
    const fill = sc.dim, line = ACC(env), dk = dark(env);
    const fa = (dk ? 0.9 : 0.75) * o;
    for (let k = 0; k < n; k++) {
      const r = i => J.r(P.seed, k, i);
      const dir = (k + (P.right ? 1 : 0)) % 2 ? 1 : -1;
      const e = E.outCubic(J.clamp((env.lt - k * 0.12) / 0.8));
      const Lm = W * (0.34 + r(1) * 0.22), yc = H * ((k + 0.5) / n) + (r(2) - 0.5) * H * 0.16;
      const xc = W * (0.5 + dir * (0.2 + r(3) * 0.18)) + dir * (1 - e) * W * 0.25 + dir * env.ltb * 7 * u;
      const Lu = Lm * (0.45 + r(4) * 0.2), xu = xc + (r(5) < 0.5 ? -1 : 1) * Lm * 0.22, hu = hb * 0.8;
      const Ld = Lm * (0.3 + r(6) * 0.2), xd = xc - (xu - xc) * 0.8;
      ctx.save(); ctx.globalAlpha = fa * e; ctx.fillStyle = fill; ctx.beginPath();
      rrPath(ctx, xc - Lm / 2, yc - hb / 2, Lm, hb, hb / 2);
      rrPath(ctx, xu - Lu / 2, yc - hb / 2 - hu + 1, Lu, hu + 2, hu / 2);
      if (r(7) < 0.6) rrPath(ctx, xd - Ld / 2, yc + hb / 2 - 1, Ld, hu * 0.85 + 2, hu * 0.42);
      ctx.fill(); ctx.restore();
      const lw = Math.max(1, 1.2 * u), la = 0.75 * o * e;
      const tl = [[xu - Lu / 2 + hu / 2, yc - hb / 2 - hu + 1], [xu + Lu / 2 - hu / 2, yc - hb / 2 - hu + 1]];
      stroke(env, part(tl, 0, E.inOutCubic(J.clamp((env.lt - 0.3 - k * 0.12) / 0.6))), line, lw, la);
      stroke(env, part([[xc + Lm / 2 - hb / 2, yc + hb / 2], [xc - Lm / 2 + hb / 2, yc + hb / 2]], 0, E.inOutCubic(J.clamp((env.lt - 0.4 - k * 0.12) / 0.6))), line, lw, la * 0.7);
    }
  },
};

/* ============================================================
   sci-fi / HUD
   ============================================================ */

/* 六角格子 — a honeycomb patch whose cells ripple in, with a scan band and a few lit cells */
DEF.hexGrid = {
  name: '六角格子', nameEn: 'Hex grid', tags: ['glitch', 'graphic'], w: 0.9, layer: 'front', ae: 'grid',
  draw(env, bb0, P) {
    if (env.pass !== 'main') return;
    const bb = getBB(env, bb0), { sc } = env, u = U(env);
    const o = outE(env); if (o <= 0.003 || env.lt < 0) return;
    const rc = J.clamp(Math.min(env.W, env.H) * 0.021, 13 * u, 24 * u), cols = 5 + (P.n | 0) + (P.big ? 1 : 0), rows = 3 + ((P.v | 0) % 2);
    const dx = rc * 1.5, dy = rc * Math.sqrt(3), fs = FS(env) * 0.72;
    const w = (cols - 1) * dx + rc * 2, h = rows * dy + dy / 2 + fs * 1.8;
    const sp = spot(env, bb, w, h, P, 24 * u), a = o * (sp.ok ? 1 : 0.35);
    const x0 = sp.x + rc, y0 = sp.y + fs * 1.8 + dy / 2;
    const seedC = [Math.floor(P.r * cols), Math.floor(J.r(P.seed, 2) * rows)];
    const scan = ((env.ltb * 0.45 + P.r) % 1.4) * (w + 40 * u) - 20 * u;
    const outl = [], hot = [], lit = [], litA = [];
    const nl = 3 + (P.n | 0), tick = Math.floor(env.ltb * 2.5);
    const litSet = new Set(); for (let k = 0; k < nl; k++) litSet.add(J.h(P.seed, tick, k) % (cols * rows));
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
      const cx = x0 + i * dx, cy = y0 + j * dy + (i % 2 ? dy / 2 : 0);
      const d = Math.hypot(i - seedC[0], j - seedC[1]);
      const q = E.outBack(J.clamp((env.lt - d * 0.045) / 0.3), 1.6); if (q <= 0) continue;
      const rr = rc * 0.88 * q, hx = [];
      for (let k = 0; k <= 6; k++) { const an = k * 60 * DEG; hx.push([cx + Math.cos(an) * rr, cy + Math.sin(an) * rr]); }
      const near = Math.abs(cx - sp.x - scan) < rc * 1.2;
      (near ? hot : outl).push(hx);
      if (litSet.has(i * rows + j) && env.lt > 0.5) (J.r(P.seed, i, j, 4) < 0.5 ? lit : litA).push(hx.map(([px, py]) => [cx + (px - cx) * 0.62, cy + (py - cy) * 0.62]));
    }
    const lw = Math.max(1, u);
    strokes(env, outl, sc.sub, lw, 0.6 * a);
    strokes(env, hot, sc.fg, lw * 1.3, 0.95 * a);
    polys(env, lit, sc.fg, 0.5 * a);
    polys(env, litA, ACC(env), 0.9 * a);
    const le = inE(env, 0.3, 0.35);
    label(env, `SECTOR ${pad2((env.cut.line | 0) + 1)}`, sp.x, sp.y + fs * 0.5, { size: fs, alpha: a * le, track: 0.2 });
    label(env, `${pad2(litSet.size)}/${cols * rows}`, sp.x + w, sp.y + fs * 0.5, { size: fs, align: 'right', color: sc.fg, alpha: a * le });
    segs(env, [[sp.x, sp.y + fs * 1.15, sp.x + w * le, sp.y + fs * 1.15]], sc.sub, lw, 0.5 * a);
  },
};

/* 円形スペクトラム — a radial spectrum analyser: mirrored bars around a small ring, with falling peak dots */
DEF.spectrumRing = {
  name: '円形スペクトラム', nameEn: 'Circular spectrum', tags: ['glitch', 'pop', 'graphic'], w: 0.9, layer: 'front', ae: 'waveform',
  draw(env, bb0, P) {
    if (env.pass !== 'main') return;
    const bb = getBB(env, bb0), { sc } = env, u = U(env);
    const o = outE(env); if (o <= 0.003 || env.lt < 0) return;
    const R0 = J.clamp(Math.min(env.W, env.H) * 0.052, 34 * u, 66 * u), Lm = R0 * 0.95;
    const sp = spot(env, bb, (R0 + Lm) * 2.1, (R0 + Lm) * 2.1, P, 18 * u), a = o * (sp.ok ? 1 : 0.35);
    const cx = sp.cx, cy = sp.cy, N = 60, e = E.outExpo(J.clamp(env.lt / 0.5));
    const en = env.energy != null ? 0.35 + env.energy * 1.1 : 1;
    const beat = env.beat ? Math.exp(-env.beat.since * 6) : 0.5 + 0.5 * Math.sin(env.ltb * 7);
    const rot = (P.r * 360 + env.ltb * 6) * DEG, bars = [], hot = [], peaks = [];
    for (let i = 0; i < N; i++) {
      if (i / N > e) break;
      const k = i < N / 2 ? i : N - 1 - i;                 // mirrored
      const f = k / (N / 2);
      const v = J.clamp((0.55 + 0.45 * J.noise1(k * 0.5 + env.ltb * 5.5, P.seed)) * (1 - f * 0.55) * en * (0.75 + 0.35 * beat));
      const an = rot + i / N * TAU, c = Math.cos(an), s = Math.sin(an), L = Lm * v * e;
      const r1 = R0 + 3 * u + L;
      (v > 0.78 ? hot : bars).push([cx + c * (R0 + 3 * u), cy + s * (R0 + 3 * u), cx + c * r1, cy + s * r1]);
      const pk = R0 + 3 * u + Lm * J.clamp(0.25 + 0.7 * (0.55 + 0.45 * J.noise1(k * 0.5 + (env.ltb - 0.25) * 5.5, P.seed)) * (1 - f * 0.55) * en) * e + 5 * u;
      if (i % 2 === 0) peaks.push([cx + c * Math.max(pk, r1 + 4 * u), cy + s * Math.max(pk, r1 + 4 * u), 1.3 * u]);
    }
    const bl = Math.max(1.4, Math.min(3.2 * u, TAU * R0 / N * 0.55));
    segs(env, bars, sc.fg, bl, 0.85 * a);
    segs(env, hot, ACC(env), bl, a);
    dots(env, peaks, sc.sub, 0.8 * a);
    env.arc(cx, cy, R0, -90, -90 + 360 * e, sc.sub, Math.max(1, u), 0.7 * a, false);
    env.arc(cx, cy, R0 * 0.72, 90, 90 + 360 * inE(env, 0.5, 0.15), sc.sub, Math.max(1, 0.8 * u), 0.4 * a, false);
    const fs = R0 * 0.42;
    label(env, pad2((env.cut.line | 0) + 1), cx, cy - fs * 0.1, { size: fs, align: 'center', color: sc.fg, alpha: a * inE(env, 0.3, 0.3), track: 0.04 });
    label(env, 'Hz', cx, cy + fs * 0.75, { size: fs * 0.42, align: 'center', alpha: a * inE(env, 0.3, 0.4), track: 0.2 });
  },
};

/* データ列 — a small memory-dump panel: address / bytes / code-point rows scrolling up, newest row flagged */
DEF.dataColumns = {
  name: 'データ列', nameEn: 'Data column', tags: ['glitch', 'editorial', 'graphic'], w: 0.9, layer: 'front', ae: 'barcode',
  draw(env, bb0, P) {
    if (env.pass !== 'main') return;
    const bb = getBB(env, bb0), { sc, ctx } = env, u = U(env);
    const o = outE(env); if (o <= 0.003 || env.lt < 0) return;
    const fs = FS(env) * 0.9, rh = fs * 1.55, nR = 6 + (P.n | 0), font = monoF(env);
    const chars = [...String(env.cut.text || '')].filter(c => c.trim());
    const sample = '0x0000  00 00 00 00  U+0000';
    const w = textW(sample, font, fs, 0.06) + 22 * u, hwin = nR * rh, h = hwin + fs * 2.2;
    const sp = spot(env, bb, w, h, P, 24 * u), a = o * (sp.ok ? 1 : 0.35);
    const x0 = sp.x + 14 * u, yTop = sp.y + fs * 2.2;
    const e = E.outExpo(J.clamp(env.lt / 0.5)), vis = hwin * e;
    const hex = (n, k) => (n >>> 0).toString(16).toUpperCase().padStart(k, '0').slice(-k);
    // header
    label(env, 'MEM', sp.x, sp.y + fs * 0.6, { size: fs, color: ACC(env), alpha: a * e, track: 0.2 });
    label(env, `LYRIC_${pad2((env.cut.line | 0) + 1)}`, sp.x + w, sp.y + fs * 0.6, { size: fs, align: 'right', alpha: a * e, track: 0.1 });
    segs(env, [[sp.x, sp.y + fs * 1.4, sp.x + w * e, sp.y + fs * 1.4]], sc.sub, Math.max(1, u), 0.7 * a);
    segs(env, [[sp.x, yTop, sp.x, yTop + vis]], sc.sub, Math.max(1, u), 0.5 * a);
    // rows
    const speed = 2.6, off = env.ltb * speed, base = Math.floor(off), frac = E.inOutCubic(J.clamp((off - base) * 2.5));
    ctx.save(); ctx.beginPath(); ctx.rect(sp.x - 2 * u, yTop, w + 4 * u, vis); ctx.clip();
    for (let k = -1; k <= nR; k++) {
      const n = base + k, y = yTop + (k + 1 - frac) * rh - rh * 0.5;
      if (y < yTop - rh || y > yTop + vis + rh) continue;
      const bytes = [0, 1, 2, 3].map(j => hex(J.h(P.seed, n, j), 2)).join(' ');
      const ch = chars.length ? chars[((n % chars.length) + chars.length) % chars.length] : 'A';
      const txt = `0x${hex(((J.h(P.seed, 7) & 0xff) << 8) + n * 16, 4)}  ${bytes}  U+${hex(ch.codePointAt(0), 4)}`;
      const newest = k === nR - 1, age = (nR - 1 - k) / nR;
      label(env, txt, x0, y, { size: fs, font, color: newest ? sc.fg : sc.sub, alpha: a * (newest ? 1 : 0.3 + 0.6 * (1 - age)), track: 0.06 });
      if (newest) polys(env, [[[sp.x + 3 * u, y - 4 * u], [sp.x + 9 * u, y], [sp.x + 3 * u, y + 4 * u]]], ACC(env), a);
    }
    ctx.restore();
  },
};

/* 読み込み — a loading spinner (segments, twin arcs or orbiting dots) that resolves into a check mark */
DEF.spinner = {
  name: '読み込み', nameEn: 'Loading', tags: ['glitch', 'pop', 'graphic'], w: 0.8, layer: 'front', ae: 'rings',
  draw(env, bb0, P) {
    if (env.pass !== 'main') return;
    const bb = getBB(env, bb0), { sc } = env, u = U(env);
    const o = outE(env); if (o <= 0.003 || env.lt < 0) return;
    const R = J.clamp(Math.min(env.W, env.H) * 0.036, 22 * u, 44 * u), fs = FS(env) * 0.95, font = monoF(env);
    const tw = textW('LOADING...', font, fs, 0.16);
    const w = R * 2 + 14 * u + tw, h = R * 2 + 4 * u;
    const sp = spot(env, bb, w, h, P, 22 * u), a = o * (sp.ok ? 1 : 0.35);
    const left = sp.cx < env.W / 2 || !sp.ok;
    const cx = left ? sp.x + R : sp.x + w - R, cy = sp.cy;
    const tDone = J.clamp(env.cut.dur * 0.55, 0.9, 2.4), done = J.clamp((env.lt - tDone) / 0.35);
    const e = E.outBack(J.clamp(env.lt / 0.35), 1.6), v = (P.v | 0) % 3, lw = Math.max(1.4, 2.2 * u), ac = ACC(env);
    const sa = a * (1 - done);
    if (sa > 0.01) {
      if (v === 0) {                                     // 12 fading segments stepping round
        const st = Math.floor(env.ltb * 12), list = [[], [], []];
        for (let i = 0; i < 12; i++) { const k = ((st - i) % 12 + 12) % 12, an = i * 30 * DEG; list[k < 2 ? 0 : k < 6 ? 1 : 2].push([cx + Math.cos(an) * R * 0.5 * e, cy + Math.sin(an) * R * 0.5 * e, cx + Math.cos(an) * R * e, cy + Math.sin(an) * R * e]); }
        segs(env, list[0], sc.fg, lw, sa, false, 'round'); segs(env, list[1], sc.fg, lw, 0.5 * sa, false, 'round'); segs(env, list[2], sc.fg, lw, 0.18 * sa, false, 'round');
      } else if (v === 1) {                              // twin counter-rotating arcs
        const a1 = env.ltb * 300, a2 = -env.ltb * 200, sw = 90 + 60 * Math.sin(env.ltb * 4);
        env.arc(cx, cy, R * e, a1, a1 + sw, sc.fg, lw, sa, false);
        env.arc(cx, cy, R * 0.62 * e, a2, a2 + sw * 0.8, ac, lw, sa, false);
        env.circle(cx, cy, R * e, null, sc.sub, Math.max(1, 0.8 * u), 0.25 * sa, false);
      } else {                                           // dots chasing with size falloff
        const d = [];
        for (let i = 0; i < 8; i++) { const an = (env.ltb * 280 - i * 26) * DEG; d.push([cx + Math.cos(an) * R * 0.8 * e, cy + Math.sin(an) * R * 0.8 * e, (3.4 - i * 0.35) * u * e]); }
        dots(env, d.slice(0, 1), ac, sa); dots(env, d.slice(1), sc.fg, 0.7 * sa);
      }
    }
    if (done > 0) {
      const de = E.outCubic(done);
      env.arc(cx, cy, R, -90, -90 + 360 * de, ac, lw, a, false);
      const ck = [[cx - R * 0.42, cy + R * 0.02], [cx - R * 0.1, cy + R * 0.32], [cx + R * 0.45, cy - R * 0.3]];
      stroke(env, part(ck, 0, E.inOutCubic(J.clamp((env.lt - tDone - 0.15) / 0.3))), ac, lw, a, false, { cap: 'round', join: 'round' });
    }
    const dotsN = Math.floor(env.ltb * 3) % 4;
    const txt = done > 0.5 ? 'COMPLETE' : 'LOADING' + '.'.repeat(dotsN);
    const lx = left ? cx + R + 12 * u : cx - R - 12 * u - tw;
    label(env, txt, lx, cy - fs * 0.35, { size: fs, font, color: done > 0.5 ? ac : sc.fg, alpha: a * inE(env, 0.3, 0.1), track: 0.16 });
    const pr = done > 0 ? 100 : Math.min(99, Math.floor(100 * (1 - Math.exp(-env.lt / tDone * 2.2))));
    label(env, `${pad2(pr, 3)}%  ${(env.lt * 1000 | 0).toString().padStart(5, '0')}ms`, lx, cy + fs * 0.75, { size: fs * 0.72, font, alpha: a * 0.8 * inE(env, 0.3, 0.2), track: 0.1 });
  },
};

/* 方位テープ — a scrolling compass heading tape with a fixed pointer and a boxed readout */
DEF.headingTape = {
  name: '方位テープ', nameEn: 'Compass tape', tags: ['glitch', 'graphic', 'editorial'], w: 0.9, layer: 'front', ae: 'grid',
  draw(env, bb0, P) {
    if (env.pass !== 'main') return;
    const bb = getBB(env, bb0), { W, H, sc } = env, u = U(env), m = MG(env);
    const o = outE(env); if (o <= 0.003 || env.lt < 0) return;
    const fs = FS(env) * 0.85, font = monoF(env), gap = 22 * u;
    let ht = fs * 1.4 + 16 * u + fs * 2.2;
    const aboveRoom = bb.y0 - gap - m * 0.6, belowRoom = H - m * 0.6 - bb.y1 - gap;
    let above = !P.low; if ((above ? aboveRoom : belowRoom) < ht && (above ? belowRoom : aboveRoom) > (above ? aboveRoom : belowRoom)) above = !above;
    const room = above ? aboveRoom : belowRoom;
    const compact = room < ht; if (compact) ht = fs * 1.4 + 18 * u;
    const yT = above ? Math.max(m * 0.6, bb.y0 - gap - ht - Math.max(0, (room - ht) * 0.35)) : bb.y1 + gap + Math.max(0, (room - ht) * 0.35);
    const a = o * (room >= ht * 0.8 ? 1 : 0.35);
    const Wt = Math.min(W * 0.56, 620 * u, W - 2 * m), cx = J.clamp((bb.x0 + bb.x1) / 2, m + Wt / 2, W - m - Wt / 2);
    const e = E.outExpo(J.clamp(env.lt / 0.55)) * (1 - 0.7 * E.inCubic(env.pOut)), half = Wt / 2 * e;
    const hdg = ((P.r * 360 + env.ltb * 7 * (P.right ? 1 : -1) + 18 * Math.sin(env.ltb * 0.6 + P.r * 5)) % 360 + 360) % 360;
    const k = Wt / 100, base = yT + fs * 1.4 + 14 * u, lw = Math.max(1, u);
    const buckets = [[], [], []];
    const d0 = Math.ceil((hdg - 50) / 5) * 5;
    for (let d = d0; d <= hdg + 50; d += 5) {
      const x = cx + (d - hdg) * k; if (Math.abs(x - cx) > half) continue;
      const f = Math.abs(x - cx) / (Wt / 2), b = f < 0.5 ? 0 : f < 0.8 ? 1 : 2;
      const L = (d % 15 === 0 ? 12 : 6) * u;
      buckets[b].push([x, base, x, base - L]);
      if (d % 15 === 0 && f < 0.92) {
        const dd = ((d % 360) + 360) % 360, lab = { 0: 'N', 90: 'E', 180: 'S', 270: 'W' }[dd] || pad2(dd, 3);
        label(env, lab, x, base - 12 * u - fs * 0.75, { size: fs, font, align: 'center', color: lab.length === 1 ? ACC(env) : sc.sub, alpha: a * (1 - f) * 1.2, track: 0.04 });
      }
    }
    buckets.forEach((l, b) => segs(env, l, sc.fg, lw, a * [0.9, 0.55, 0.22][b]));
    segs(env, [[cx - half, base, cx + half, base]], sc.sub, lw, 0.6 * a);
    const pw = 6 * u, py = base + 3 * u;
    polys(env, [[[cx, py], [cx - pw, py + pw * 1.3], [cx + pw, py + pw * 1.3]]], ACC(env), a);
    const txt = `${pad2(hdg, 3)}°`, tw = textW(txt, font, fs * 1.1, 0.08) + 14 * u, bh0 = fs * 1.6;
    const bx = compact ? cx + half + 12 * u : cx - tw / 2, by = compact ? base - 6 * u - bh0 / 2 : py + pw * 1.3 + 4 * u;
    const be = inE(env, 0.3, 0.25);
    rrStroke(env, bx, by, tw, bh0 * be, 2 * u, sc.fg, lw, a);
    if (be > 0.6) label(env, txt, bx + tw / 2, by + bh0 / 2, { size: fs * 1.1, font, align: 'center', color: sc.fg, alpha: a * J.clamp((be - 0.6) / 0.4), track: 0.08 });
    label(env, 'HDG', compact ? cx - half - 10 * u : bx - 8 * u, by + bh0 / 2, { size: fs * 0.72, font, align: 'right', alpha: a * be, track: 0.2 });
  },
};

/* 文字ロック — HUD lock-on corners that hop from glyph to glyph along the lyric's outer edge, leaving index ticks */
DEF.glyphLock = {
  name: '文字ロック', nameEn: 'Type lock', tags: ['glitch', 'graphic', 'editorial'], w: 0.9, layer: 'front', ae: 'brackets',
  draw(env, bb0, P) {
    if (env.pass !== 'main') return;
    const bb = getBB(env, bb0), { W, H, sc } = env, u = U(env), m = MG(env);
    const o = outE(env); if (o <= 0.003 || env.lt < 0) return;
    const gl = glyphLines(bb), vert = gl.vert;
    let A, B;                                            // glyph boxes along the two outer edges
    if (gl.lines.length) { A = gl.lines[0].g; B = gl.lines[gl.lines.length - 1].g; }
    else {
      const n = Math.max(1, Math.min(12, J.glyphCount(String(env.cut.text || '').replace(/\s+/g, '')) || 1)), list = [];
      for (let i = 0; i < n; i++) list.push(vert ? { x0: bb.x0, x1: bb.x1, y0: J.lerp(bb.y0, bb.y1, i / n), y1: J.lerp(bb.y0, bb.y1, (i + 1) / n) } : { x0: J.lerp(bb.x0, bb.x1, i / n), x1: J.lerp(bb.x0, bb.x1, (i + 1) / n), y0: bb.y0, y1: bb.y1 });
      A = B = list;
    }
    const pad = 12 * u + (vert ? bw(bb) : bh(bb)) * 0.07, lw = Math.max(1.2, 1.9 * u), ac = ACC(env);
    const hop = 0.34, t = Math.max(0, env.lt - 0.15), k = Math.floor(t / hop), f = E.outExpo(J.clamp((t - k * hop) / 0.16));
    const idx = (i, L) => ((i + (J.h(P.seed, 1) % 3)) % L.length + L.length) % L.length;
    const lerpBox = (L, i) => { const a = L[idx(i - 1, L)], b = L[idx(i, L)]; return k === 0 ? b : { x0: J.lerp(a.x0, b.x0, f), x1: J.lerp(a.x1, b.x1, f), y0: J.lerp(a.y0, b.y0, f), y1: J.lerp(a.y1, b.y1, f) }; };
    const e = E.outExpo(J.clamp(env.lt / 0.3));
    // visited ticks
    const tk = [];
    const nVis = Math.min(A.length, k + 1);
    for (let j = 0; j < nVis; j++) { const g = A[idx(j, A)]; if (vert) tk.push([bb.x1 + pad * 0.45, (g.y0 + g.y1) / 2, bb.x1 + pad * 0.45 + 5 * u, (g.y0 + g.y1) / 2]); else tk.push([(g.x0 + g.x1) / 2, bb.y0 - pad * 0.45, (g.x0 + g.x1) / 2, bb.y0 - pad * 0.45 - 5 * u]); }
    segs(env, tk, sc.sub, Math.max(1, u), 0.6 * o);
    const corners = (g, side) => {                        // side: -1 = top/right edge, 1 = bottom/left edge
      const s = (1 - e) * 10 * u, list = [];
      if (!vert) {
        const y = side < 0 ? bb.y0 - pad - s : bb.y1 + pad + s, dy = side < 0 ? 1 : -1, Lh = Math.min((g.x1 - g.x0) * 0.36, 22 * u), Lv = pad * 0.8;
        const x0 = g.x0 - 3 * u - s, x1 = g.x1 + 3 * u + s;
        list.push([[x0, y + dy * Lv], [x0, y], [x0 + Lh, y]], [[x1 - Lh, y], [x1, y], [x1, y + dy * Lv]]);
      } else {
        const x = side < 0 ? bb.x1 + pad + s : bb.x0 - pad - s, dx = side < 0 ? -1 : 1, Lh = Math.min((g.y1 - g.y0) * 0.36, 22 * u), Lv = pad * 0.8;
        const y0 = g.y0 - 3 * u - s, y1 = g.y1 + 3 * u + s;
        list.push([[x + dx * Lv, y0], [x, y0], [x, y0 + Lh]], [[x, y1 - Lh], [x, y1], [x + dx * Lv, y1]]);
      }
      return list;
    };
    const ga = lerpBox(A, k), gb = lerpBox(B, k + 2);
    strokes(env, corners(ga, -1), ac, lw, o * e);
    strokes(env, corners(gb, 1), sc.fg, lw, 0.8 * o * e);
    // label on the active target
    const fs = FS(env) * 0.9, ch = [...String(env.cut.text || '').replace(/\s+/g, '')][idx(k, A)] || '';
    const txt = `TGT ${pad2(idx(k, A) + 1)}/${pad2(A.length)}`;
    const le = inE(env, 0.25, 0.2);
    if (!vert) {
      const lx = J.clamp((ga.x0 + ga.x1) / 2, m, W - m), up = bb.y0 - pad - 14 * u - fs > m * 0.4;
      const ly = up ? bb.y0 - pad - 10 * u - fs * 0.6 : bb.y1 + pad + 14 * u + fs * 0.6;
      segs(env, [[lx, up ? bb.y0 - pad - 2 * u : bb.y1 + pad + 2 * u, lx, up ? ly + fs * 0.6 : ly - fs * 0.6]], ac, Math.max(1, u), o * le);
      label(env, txt, lx + 6 * u, ly, { size: fs, color: sc.fg, alpha: o * le, track: 0.12 });
      if (ch) label(env, ch, lx - 6 * u, ly, { size: fs * 1.1, font: bodyF(env), align: 'right', color: ac, alpha: o * le });
    } else {
      const ly = J.clamp((ga.y0 + ga.y1) / 2, m, H - m), right = bb.x1 + pad + 16 * u + textW(txt, monoF(env), fs, 0.12) < W - m * 0.4;
      const lx = right ? bb.x1 + pad + 12 * u : bb.x0 - pad - 12 * u;
      label(env, txt, lx, ly, { size: fs, color: sc.fg, align: right ? 'left' : 'right', alpha: o * le, track: 0.12 });
    }
  },
};

/* 原子軌道 — three tilted orbit ellipses round a small nucleus, electrons passing in front of / behind it */
DEF.atomOrbit = {
  name: '原子軌道', nameEn: 'Atomic orbit', tags: ['graphic', 'glitch', 'calm'], w: 0.8, layer: 'front', ae: 'rings',
  draw(env, bb0, P) {
    if (env.pass !== 'main') return;
    const bb = getBB(env, bb0), { sc } = env, u = U(env);
    const o = outE(env); if (o <= 0.003 || env.lt < 0) return;
    const R = J.clamp(Math.min(env.W, env.H) * 0.072, 46 * u, 92 * u), fs = FS(env) * 0.75;
    const sp = spot(env, bb, R * 2.3, R * 2.3 + fs * 1.6, P, 22 * u), a = o * (sp.ok ? 1 : 0.35);
    const cx = sp.cx, cy = sp.y + R * 1.15, ac = ACC(env), lw = Math.max(1, 1.1 * u);
    const base = P.r * 180 + env.ltb * 5 * (P.right ? 1 : -1), ry = R * 0.34, n = 3;
    const back = [], front = [];
    for (let k = 0; k < n; k++) {
      const rot = (base + k * 180 / n) * DEG, e = E.inOutCubic(J.clamp((env.lt - k * 0.07) / 0.45));
      stroke(env, ellP(cx, cy, R, ry, rot, 0, 360 * e, 80), sc.fg, lw, 0.55 * a);
      const w = (1.4 + k * 0.35) * (k % 2 ? -1 : 1), ph = J.r(P.seed, k) * 360;
      const pos = t => { const an = (ph + t * w * 90) * DEG, x = Math.cos(an) * R, y = Math.sin(an) * ry; return [cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot), Math.sin(an)]; };
      if (e < 0.9) continue;
      const p = pos(env.ltb), tr = [];
      for (let j = 0; j < 8; j++) { const q0 = pos(env.ltb - j * 0.035), q1 = pos(env.ltb - (j + 1) * 0.035); tr.push([q0[0], q0[1], q1[0], q1[1], 1 - j / 8]); }
      (p[2] < 0 ? back : front).push([p, tr, k]);
    }
    const drawE = ([p, tr, k]) => {
      const dim = p[2] < 0 ? 0.45 : 1;
      for (const s of tr) segs(env, [[s[0], s[1], s[2], s[3]]], k === 0 ? ac : sc.fg, 2.2 * u * s[4], 0.5 * s[4] * a * dim, false, 'round');
      env.circle(p[0], p[1], (p[2] < 0 ? 2.6 : 3.8) * u, k === 0 ? ac : sc.fg, null, 0, a * dim, false);
    };
    back.forEach(drawE);
    const q = E.outBack(J.clamp((env.lt - 0.1) / 0.35), 2), pulse = 1 + 0.06 * Math.sin(env.ltb * 6);
    const nr = 5 * u * q * pulse;
    dots(env, [[cx - nr * 0.6, cy - nr * 0.3, nr], [cx + nr * 0.6, cy + nr * 0.35, nr]], ac, a);
    dots(env, [[cx + nr * 0.5, cy - nr * 0.55, nr], [cx - nr * 0.5, cy + nr * 0.5, nr]], sc.fg, a);
    env.circle(cx, cy, nr * 2.6, null, sc.sub, Math.max(1, 0.8 * u), 0.5 * a * q, false);
    front.forEach(drawE);
    label(env, `ORB-${n}  e⁻${n}`, cx, cy + R * 1.15 + fs * 0.4, { size: fs, align: 'center', alpha: a * inE(env, 0.3, 0.5), track: 0.2 });
  },
};

/* 音波 — sound-wave arcs radiating outward from both sides of the lyric (above / below for vertical text), on the beat */
DEF.sonarArcs = {
  name: '音波', nameEn: 'Sound waves', tags: ['pop', 'emotional', 'graphic'], w: 0.9, layer: 'front', ae: 'rings',
  draw(env, bb0, P) {
    if (env.pass !== 'main') return;
    const bb = getBB(env, bb0), { W, H, sc } = env, u = U(env), m = MG(env);
    const o = outE(env); if (o <= 0.003 || env.lt < 0) return;
    const cx = (bb.x0 + bb.x1) / 2, cy = (bb.y0 + bb.y1) / 2;
    const roomH = Math.min(bb.x0, W - bb.x1) - m * 0.5, roomV = Math.min(bb.y0, H - bb.y1) - m * 0.5;
    let vert = isVert(bb);
    if ((vert ? bh(bb) / H : bw(bb) / W) > 0.66 && (vert ? roomH : roomV) > 60 * u) vert = !vert;
    const g0 = 16 * u + (vert ? bw(bb) : bh(bb)) * 0.04;
    const sides = vert ? [[cx, bb.y0 - g0, -90, bb.y0 - g0 - m * 0.5], [cx, bb.y1 + g0, 90, H - m * 0.5 - bb.y1 - g0]]
      : [[bb.x0 - g0, cy, 180, bb.x0 - g0 - m * 0.5], [bb.x1 + g0, cy, 0, W - m * 0.5 - bb.x1 - g0]];
    const len = env.beat ? env.beat.len : 0.62, since = env.beat ? env.beat.since : ((env.ltb % len) + len) % len;
    const span = vert ? 40 : 34, e = E.outCubic(J.clamp(env.lt / 0.4)), ac = ACC(env);
    for (const [ex, ey, dir, room] of sides) {
      if (room < 30 * u) continue;
      const rMax = Math.min(room, 190 * u), r0 = 8 * u;
      const lists = [[], [], []];
      for (let k = 0; k < 4; k++) {
        const p = (since + k * len) / (len * 4); if (p >= 1) continue;
        const r = J.lerp(r0, rMax, E.outCubic(p)) * e, al = Math.pow(1 - p, 1.3);
        lists[al > 0.66 ? 0 : al > 0.33 ? 1 : 2].push([ex, ey, r, (dir - span) * DEG, (dir + span) * DEG]);
      }
      arcs(env, lists[0], ac, 2.4 * u, 0.95 * o, false, 'round');
      arcs(env, lists[1], sc.fg, 1.6 * u, 0.6 * o, false, 'round');
      arcs(env, lists[2], sc.fg, 1.1 * u, 0.3 * o, false, 'round');
      const st = [];                                     // static inner "speaker" arcs
      for (let j = 1; j <= 2; j++) st.push([ex, ey, j * 7 * u * e, (dir - span * 1.2) * DEG, (dir + span * 1.2) * DEG]);
      arcs(env, st, sc.sub, Math.max(1, 1.2 * u), 0.8 * o, false, 'round');
      env.circle(ex, ey, 2.2 * u * e, ac, null, 0, o, false);
    }
  },
};

/* 回路 — circuit-board traces routed with 45° bends from a screen edge toward the lyric, pads, vias and travelling pulses */
DEF.circuit = {
  name: '回路', nameEn: 'Circuit', tags: ['glitch', 'graphic'], w: 0.9, layer: 'front', ae: 'leaders',
  draw(env, bb0, P) {
    if (env.pass !== 'main') return;
    const bb = getBB(env, bb0), { W, H, sc } = env, u = U(env);
    const o = outE(env); if (o <= 0.003 || env.lt < 0) return;
    const gap = 18 * u + Math.min(bw(bb), bh(bb)) * 0.05;
    const rooms = { l: bb.x0 - gap, r: W - bb.x1 - gap, t: bb.y0 - gap, b: H - bb.y1 - gap };
    let order = Object.keys(rooms).sort((a, b) => rooms[b] - rooms[a]);
    const pref = P.right ? 'r' : 'l';
    if (rooms[pref] > 140 * u) order = [pref].concat(order.filter(s => s !== pref));
    const sides = [order[0]]; if (P.big && rooms[order[1]] > 140 * u) sides.push(order[1]);
    const ac = ACC(env), lw = Math.max(1, 1.3 * u);
    sides.forEach((side, si) => {
      const sEnd = rooms[side]; if (sEnd < 70 * u) return;
      const horiz = side === 'l' || side === 'r';
      const tc = horiz ? J.clamp((bb.y0 + bb.y1) / 2, 60 * u, H - 60 * u) : J.clamp((bb.x0 + bb.x1) / 2, 60 * u, W - 60 * u);
      const across = horiz ? bh(bb) : bw(bb), n = 4 + ((P.n | 0) % 3);
      const pe = J.clamp(across / n, 10 * u, 22 * u), ps = pe * (1.6 + P.r * 0.8);
      const M = (s, t) => side === 'l' ? [s, t] : side === 'r' ? [W - s, t] : side === 't' ? [t, s] : [t, H - s];
      const paths = [], pads = [], vias = [];
      for (let i = 0; i < n; i++) {
        const c = i - (n - 1) / 2, t0 = tc + c * ps + J.rs(P.seed, i, 1) * 3 * u, t1 = tc + c * pe;
        const d = Math.abs(t1 - t0), sm = sEnd * (0.45 + 0.15 * J.rs(P.seed, si, 2)), sa = Math.max(10 * u, sm - d / 2);
        const pts = [M(-6 * u, t0), M(sa, t0), M(sa + d, t1), M(sEnd - (i % 2 ? 14 * u : 0), t1)];
        paths.push(pts); pads.push(pts[3]); if (d > 3 * u) vias.push(pts[1]);
      }
      const drawn = [];
      paths.forEach((p, i) => { const e = E.inOutCubic(J.clamp((env.lt - i * 0.06 - si * 0.1) / 0.6)); drawn.push(part(p, 0, e)); });
      strokes(env, drawn, sc.sub, lw, 0.85 * o, false, { join: 'miter' });
      const ea = inE(env, 0.3, 0.55);
      rings(env, pads.map(p => [p[0], p[1], 4 * u * ea]), sc.fg, Math.max(1, 1.2 * u), o);
      dots(env, pads.map(p => [p[0], p[1], 1.6 * u * ea]), ac, o);
      rings(env, vias.map(p => [p[0], p[1], 2.6 * u * ea]), sc.sub, Math.max(1, u), 0.8 * o);
      // pulses
      const pl = [];
      paths.forEach((p, i) => {
        const T = 1.3 + J.r(P.seed, i, 5) * 0.8, ph = ((env.ltb - 0.7 - J.r(P.seed, i, 6) * T) / T) % 1;
        if (env.lt < 0.7 || ph < 0) return;
        pl.push(part(p, Math.max(0, ph - 0.1), ph));
      });
      strokes(env, pl, ac, 2.4 * u, o, false, { cap: 'round' });
    });
  },
};

/* ============================================================
   print & stationery
   ============================================================ */

/* 色見本 — a printer's colour-control strip built from the scheme: solids over 50 % tints, with codes and a register mark */
DEF.swatches = {
  name: '色見本', nameEn: 'Color swatches', tags: ['editorial', 'graphic'], w: 0.9, layer: 'front', ae: 'bars',
  draw(env, bb0, P) {
    if (env.pass !== 'main') return;
    const bb = getBB(env, bb0), { sc } = env, u = U(env);
    const o = outE(env); if (o <= 0.003 || env.lt < 0) return;
    const seen = new Set(), cols = [];
    for (const [c, k] of [[sc.accent, 'ACC'], [sc.accent2, 'AC2'], [sc.fg, 'FG'], [sc.sub, 'SUB'], [sc.ink, 'INK'], [sc.dim, 'DIM']]) { if (!c) continue; const h = String(c).toUpperCase(); if (seen.has(h)) continue; seen.add(h); cols.push([c, k]); }
    const sq = J.clamp(Math.min(env.W, env.H) * 0.037, 24 * u, 44 * u), g = 2 * u, fs = FS(env) * 0.7;
    const n = Math.min(6, cols.length), w = n * (sq + g) + sq * 1.4, h = sq * 1.7 + fs * 3.4;
    const sp = spot(env, bb, w, h, Object.assign({}, P, { low: P.low || P.corner }), 24 * u), a = o * (sp.ok ? 1 : 0.35);
    const x0 = sp.x, y0 = sp.y + fs * 1.6, lw = Math.max(1, u);
    label(env, `COLOR BAR  ${pad2(n)}`, x0, sp.y + fs * 0.6, { size: fs, alpha: a * inE(env, 0.3), track: 0.2 });
    for (let i = 0; i < n; i++) {
      const [c, k] = cols[i], q = E.outExpo(J.clamp((env.lt - 0.05 - i * 0.06) / 0.35)); if (q <= 0) continue;
      const x = x0 + i * (sq + g);
      rects(env, [[x, y0, sq, sq * q]], c, a);
      const q2 = E.outExpo(J.clamp((env.lt - 0.25 - i * 0.06) / 0.35));
      rects(env, [[x, y0 + sq + g, sq, sq * 0.7 * q2]], J.mix(sc.bg, c, 0.5), a);
      if (J.contrast(c, sc.bg) < 1.3) rrStroke(env, x, y0, sq, sq * q, 0, sc.sub, lw, 0.6 * a);
      label(env, k, x + sq / 2, y0 + sq * 1.7 + g + fs * 0.9, { size: fs, align: 'center', alpha: a * q2, track: 0.05 });
      label(env, String(c).replace('#', '').toUpperCase().slice(0, 6), x + sq / 2, y0 + sq * 1.7 + g + fs * 2.1, { size: fs * 0.8, align: 'center', color: sc.fg, alpha: 0.8 * a * q2, track: 0 });
    }
    // register target at the end of the strip
    const e = inE(env, 0.4, 0.3), rx = x0 + n * (sq + g) + sq * 0.7, ry = y0 + sq * 0.85, rr = sq * 0.42;
    env.arc(rx, ry, rr, -90, -90 + 360 * e, sc.fg, lw, a, false);
    segs(env, [[rx - rr * 1.5 * e, ry, rx + rr * 1.5 * e, ry], [rx, ry - rr * 1.5 * e, rx, ry + rr * 1.5 * e]], sc.fg, lw, a);
  },
};

/* 罫線ノート — faint notebook rules drawn on across the screen behind the lyric, with a red margin line and a date header */
DEF.ruledLines = {
  name: '罫線ノート', nameEn: 'Ruled notebook', tags: ['editorial', 'calm', 'emotional'], w: 0.8, layer: 'back', subtle: true, ae: 'grid',
  draw(env, bb, P) {
    if (env.pass !== 'main' || env.lt < 0) return;
    const { W, H, sc } = env, u = U(env);
    const o = outE(env); if (o <= 0.003) return;
    const s = J.clamp(Math.min(W, H) * 0.078, 44 * u, 96 * u), dk = dark(env), lw = Math.max(1, 1.2 * u);
    const col = sc.sub, al = (dk ? 0.36 : 0.42) * o, dotted = (P.v | 0) % 2 === 1;
    const y0 = s * 1.6 + (J.r(P.seed, 1) - 0.5) * s * 0.4, rows = Math.floor((H - y0) / s);
    const list = [];
    for (let i = 0; i <= rows && i < 40; i++) {
      const y = y0 + i * s, e = E.inOutCubic(J.clamp((env.lt - i * 0.025) / 0.6)); if (e <= 0) continue;
      if (dotted) dash(env, 0, y, W * e, y, 2 * u, 7 * u, col, lw * 1.4, al);
      else list.push([0, y, W * e, y]);
    }
    segs(env, list, col, lw, al);
    const mx = P.right ? W - W * 0.09 : W * 0.09, me = E.inOutCubic(J.clamp((env.lt - 0.1) / 0.7));
    const mc = ACC(env), ma = (dk ? 0.55 : 0.6) * o;
    segs(env, [[mx, 0, mx, H * me]], mc, lw, ma);
    if ((P.v | 0) % 3 === 2) segs(env, [[mx + (P.right ? -5 : 5) * u, 0, mx + (P.right ? -5 : 5) * u, H * me]], mc, lw, ma * 0.7);
    const fs = FS(env) * 0.95, he = inE(env, 0.4, 0.4), hy = y0 - s * 0.35;
    const hx = P.right ? W * 0.06 : W - W * 0.06, al2 = P.right ? 'left' : 'right';
    const dd = 1 + J.h(P.seed, 3) % 28, mm = 1 + J.h(P.seed, 4) % 12;
    label(env, `No.  ${pad2((env.cut.line | 0) + 1)}      Date   ${pad2(mm)} . ${pad2(dd)}`, hx, hy, { size: fs, align: al2, alpha: 0.6 * o * he, track: 0.1 });
  },
};

/* 見当合わせ — a registration target printed in three offset colours that slide into perfect register */
DEF.registration = {
  name: '見当合わせ', nameEn: 'Registration marks', tags: ['editorial', 'graphic', 'glitch'], w: 0.8, layer: 'front', ae: 'brackets',
  draw(env, bb0, P) {
    if (env.pass !== 'main') return;
    const bb = getBB(env, bb0), { sc, ctx } = env, u = U(env);
    const o = outE(env); if (o <= 0.003 || env.lt < 0) return;
    const R = J.clamp(Math.min(env.W, env.H) * 0.045, 28 * u, 56 * u), fs = FS(env) * 0.72;
    const sp = spot(env, bb, R * 3.2, R * 3.2 + fs * 2, P, 22 * u), a = o * (sp.ok ? 1 : 0.35);
    const cx = sp.cx, cy = sp.y + R * 1.6;
    const lock = E.outExpo(J.clamp((env.lt - 0.05) / 0.9));
    const jit = env.lt > 1.2 && (Math.floor(env.ltb / 1.7) !== Math.floor((env.ltb - 0.08) / 1.7)) ? 2.5 * u : 0;
    const D = 18 * u * (1 - lock) + jit;
    const cols = [ACC(env), ACC2(env), sc.fg], dirs = [[-1, -0.6], [0.9, -0.5], [0.1, 1]], lw = Math.max(1, 1.3 * u);
    const e = E.outBack(J.clamp(env.lt / 0.35), 1.4);
    ctx.save();
    ctx.globalCompositeOperation = dark(env) ? 'screen' : 'multiply';
    cols.forEach((c, k) => {
      const x = cx + dirs[k][0] * D, y = cy + dirs[k][1] * D, r = R * e;
      env.circle(x, y, r * 0.98, null, c, lw, 0.9 * a, false);
      env.circle(x, y, r * 0.62, null, c, lw, 0.9 * a, false);
      segs(env, [[x - r * 1.45, y, x + r * 1.45, y], [x, y - r * 1.45, x, y + r * 1.45]], c, lw, 0.9 * a);
      const pie = (a0) => { const p = [[x, y]]; for (let i = 0; i <= 8; i++) { const an = (a0 + i * 90 / 8) * DEG; p.push([x + Math.cos(an) * r * 0.32, y + Math.sin(an) * r * 0.32]); } return p; };
      polys(env, [pie(-90), pie(90)], c, 0.9 * a);
    });
    ctx.restore();
    const ok = lock > 0.985 && !jit, dx = D * 0.1, t = `ΔX ${(dirs[0][0] * dx).toFixed(2)}  ΔY ${(dirs[0][1] * dx).toFixed(2)}`;
    const ly = cy + R * 1.6 + fs * 0.5;
    label(env, ok ? 'REG  OK' : 'REG', cx - R * 1.5, ly, { size: fs, color: ok ? ACC(env) : sc.sub, alpha: a * inE(env, 0.3, 0.1), track: 0.2 });
    label(env, ok ? '±0.00mm' : t, cx + R * 1.5, ly, { size: fs, align: 'right', color: sc.fg, alpha: a * inE(env, 0.3, 0.1), track: 0.06 });
  },
};

/* パンチ穴 — binder punch holes along a free screen edge, punched in one by one, with reinforcement rings and a dimension */
DEF.punchHoles = {
  name: 'パンチ穴', nameEn: 'Punch holes', tags: ['editorial', 'calm', 'graphic'], w: 0.7, layer: 'front', ae: 'dots',
  draw(env, bb0, P) {
    if (env.pass !== 'main') return;
    const bb = getBB(env, bb0), { W, H, sc } = env, u = U(env), m = MG(env);
    const o = outE(env); if (o <= 0.003 || env.lt < 0) return;
    const r = J.clamp(Math.min(W, H) * 0.016, 10 * u, 19 * u), n = (P.v | 0) % 3 === 2 ? 3 : 2;
    // candidate edges: [side, vertical?]; holes run along the edge, centred on it
    const edges = (P.right ? ['r', 'l'] : ['l', 'r']).concat(P.low ? ['b', 't'] : ['t', 'b']);
    let pick = null;
    for (const ed of edges) {
      const vertE = ed === 'l' || ed === 'r', L = vertE ? H : W, spc = Math.min(L * 0.3, 260 * u) * (n === 3 ? 0.8 : 1);
      const c = ed === 'l' ? m * 0.9 + r : ed === 'r' ? W - m * 0.9 - r : ed === 't' ? m * 0.9 + r : H - m * 0.9 - r;
      const span = spc * (n - 1) / 2 + r * 3, mid = vertE ? H / 2 : W / 2;
      const box = vertE ? [c - r * 5, mid - span, c + r * 5, mid + span] : [mid - span, c - r * 5, mid + span, c + r * 5];
      if (!hitBB(box[0], box[1], box[2], box[3], bb, 6 * u)) { pick = { ed, vertE, spc, c, mid }; break; }
    }
    if (!pick) return;
    const { ed, vertE, spc, c, mid } = pick, lw = Math.max(1, 1.2 * u), inward = ed === 'r' || ed === 'b' ? -1 : 1;
    const Pt = (along, off) => (vertE ? [c + inward * off, along] : [along, c + inward * off]);
    const pos = []; for (let i = 0; i < n; i++) pos.push(mid + (i - (n - 1) / 2) * spc);
    const t0 = Math.min(env.cut.inDur || 0, 0.6) * 0.9, lt = env.lt - t0;           // start once the lyric has settled
    if (lt <= 0) return;
    const ge = E.inOutCubic(J.clamp(lt / 0.7)), Lh = (vertE ? H : W) * 0.5 * ge;
    const g0 = Pt(mid - Lh, r * 3.4), g1 = Pt(mid + Lh, r * 3.4);
    dash(env, g0[0], g0[1], g1[0], g1[1], 6 * u, 6 * u, sc.sub, lw, 0.5 * o);
    pos.forEach((al, i) => {
      const q = J.clamp((lt - 0.08 - i * 0.14) / 0.22); if (q <= 0) return;
      const [x, y] = Pt(al, 0), s = 1 + 0.35 * (1 - E.outCubic(q));
      if ((P.v | 0) % 2 === 0) env.circle(x, y, r * 1.85 * s, null, sc.sub, r * 0.75, 0.18 * o * q, false);
      env.circle(x, y, r * s, sc.dim, null, 0, 0.95 * o * q, false);
      env.circle(x, y, r * s, null, sc.fg, lw, 0.9 * o * q, false);
      env.arc(x, y, r * s * 0.76, 200, 290, sc.sub, 2 * u, 0.6 * o * q, false);
      if (q < 1) { const b = []; for (let k = 0; k < 6; k++) { const an = k * 60 * DEG + 0.3, d0 = r * 1.3 + q * 8 * u; b.push([x + Math.cos(an) * d0, y + Math.sin(an) * d0, x + Math.cos(an) * (d0 + 5 * u), y + Math.sin(an) * (d0 + 5 * u)]); } segs(env, b, ACC(env), lw, o * (1 - q)); }
    });
    const de = E.outExpo(J.clamp((lt - 0.4) / 0.4)), fs = FS(env) * 0.72;
    if (de > 0) {
      const a0 = pos[0], a1 = pos[n - 1], am = (a0 + a1) / 2, hl = (a1 - a0) / 2 * de, gp = fs * 2.4, off = r * 2.3;
      const S = (al, d) => Pt(al, off + d);
      const l1 = [S(am - hl, 0), S(am - gp, 0)], l2 = [S(am + gp, 0), S(am + hl, 0)];
      segs(env, [[...l1[0], ...l1[1]], [...l2[0], ...l2[1]], [...S(a0, -3 * u), ...S(a0, 3 * u)], [...S(a1, -3 * u), ...S(a1, 3 * u)]], sc.sub, lw, 0.85 * o);
      const lp = S(am, 0);
      label(env, `${n === 2 ? 80 : 108}mm`, lp[0], lp[1], { size: fs, align: 'center', rot: vertE ? -90 : 0, alpha: o * de, track: 0.1 });
    }
  },
};

/* virtual "sheet" around the lyric: its corner lines (two offset sheets) — used by staple / paper clip */
function sheetCorner(env, X, Y, sx, sy, L, e, a) {
  const u = U(env), lw = Math.max(1, u);
  const c1 = part([[X + sx * L, Y], [X, Y], [X, Y + sy * L]], 0.5 - 0.5 * e, 0.5 + 0.5 * e);
  const o = 5 * u, c2 = part([[X + sx * L * 0.8 + sx * o, Y + sy * o], [X + sx * o, Y + sy * o], [X + sx * o, Y + sy * L * 0.8 + sy * o]], 0.5 - 0.5 * e, 0.5 + 0.5 * e);
  stroke(env, c2, env.sc.sub, lw, 0.35 * a);
  stroke(env, c1, env.sc.sub, lw, 0.8 * a);
}

/* ホチキス — the lyric treated as a stapled sheet: paper-corner lines, a dog-ear, and a staple that snaps in diagonally */
DEF.staple = {
  name: 'ホチキス', nameEn: 'Staples', tags: ['editorial', 'pop', 'emotional'], w: 0.7, layer: 'front', ae: 'shapes',
  draw(env, bb0, P) {
    if (env.pass !== 'main') return;
    const bb = getBB(env, bb0), { W, H, sc, ctx } = env, u = U(env), m = MG(env);
    const o = outE(env); if (o <= 0.003 || env.lt < 0) return;
    const Ls = J.clamp(Math.min(W, H) * 0.058, 38 * u, 70 * u), padP = Ls * 0.7 + 14 * u + bh(bb) * 0.04;
    const sx = P.right ? 1 : -1, sy = P.low ? 1 : -1;
    const X = J.clamp(sx < 0 ? bb.x0 - padP : bb.x1 + padP, m * 0.5, W - m * 0.5), Y = J.clamp(sy < 0 ? bb.y0 - padP : bb.y1 + padP, m * 0.5, H - m * 0.5);
    const e = E.inOutCubic(J.clamp(env.lt / 0.5)), L = Math.min(Ls * 3.4, Math.max(bw(bb), bh(bb)) * 0.45);
    sheetCorner(env, X, Y, -sx, -sy, L, e, o);
    if ((P.v | 0) % 2 === 1) {                           // dog-eared opposite corner
      const X2 = sx < 0 ? bb.x1 + padP * 0.6 : bb.x0 - padP * 0.6, Y2 = sy < 0 ? bb.y1 + padP * 0.6 : bb.y0 - padP * 0.6, f = Ls * 0.7 * inE(env, 0.4, 0.3);
      if (X2 > m * 0.5 && X2 < W - m * 0.5 && Y2 > m * 0.5 && Y2 < H - m * 0.5 && f > 1) {
        stroke(env, [[X2 + sx * L * 0.7 * e, Y2], [X2 + sx * f, Y2], [X2, Y2 + sy * f], [X2, Y2 + sy * L * 0.7 * e]], sc.sub, Math.max(1, u), 0.8 * o);
        stroke(env, [[X2 + sx * f, Y2], [X2 + sx * f, Y2 + sy * f], [X2, Y2 + sy * f]], sc.sub, Math.max(1, u), 0.55 * o);
      }
    }
    const d = Ls * 0.3, cx = X - sx * d, cy = Y - sy * d, ang = sx * sy > 0 ? -45 : 45;
    const q = J.clamp((env.lt - 0.3) / 0.18); if (q <= 0) return;
    const s = 1 + 0.6 * (1 - E.outCubic(q)), al = o * J.clamp(q * 3);
    ctx.save(); ctx.translate(cx, cy); ctx.rotate((ang + (1 - q) * 14) * DEG); ctx.scale(s, s);
    const hl = Ls / 2, t = 2.6 * u;
    rrFill(env, -hl + 2 * u, -t + 2.5 * u, Ls, t * 2, t, sc.sub, 0.3 * al);           // soft shadow
    rrFill(env, -hl, -t, Ls, t * 2, t, sc.fg, 0.95 * al);
    segs(env, [[-hl + t * 1.5, -t * 0.3, hl - t * 1.5, -t * 0.3]], sc.bg, Math.max(1, 0.8 * u), 0.45 * al);
    rects(env, [[-hl - 1.5 * u, -t * 1.6, 3 * u, t * 3.2], [hl - 1.5 * u, -t * 1.6, 3 * u, t * 3.2]], sc.fg, 0.8 * al);
    ctx.restore();
    if (q < 1) {                                         // impact ticks
      const b = []; for (let i = 0; i < 4; i++) { const an = (ang + 90 + (i < 2 ? 0 : 180) + (i % 2 ? 28 : -28)) * DEG, d0 = 9 * u + q * 12 * u; b.push([cx + Math.cos(an) * d0, cy + Math.sin(an) * d0, cx + Math.cos(an) * (d0 + 7 * u), cy + Math.sin(an) * (d0 + 7 * u)]); }
      segs(env, b, ACC(env), Math.max(1, 1.4 * u), o * (1 - q), false, 'round');
    }
  },
};

/* クリップ — a gem paper clip drawn on in one wire stroke, clipping the top edge of the lyric's "sheet" */
const CLIP = (() => {
  const p = [], seg = (a, b) => { for (let i = 0; i <= 6; i++) p.push(L2(a, b, i / 6)); };
  const arc = (cx, cy, r, a0, a1) => { for (let i = 0; i <= 14; i++) { const an = (a0 + (a1 - a0) * i / 14) * DEG; p.push([cx + Math.cos(an) * r, cy + Math.sin(an) * r]); } };
  seg([-0.2, 0.95], [-0.2, 2.45]); arc(0.05, 2.45, 0.25, 180, 0);
  seg([0.3, 2.45], [0.3, 0.42]); arc(-0.02, 0.42, 0.32, 0, -180);
  seg([-0.34, 0.42], [-0.34, 2.62]); arc(0.06, 2.62, 0.4, 180, 0);
  seg([0.46, 2.62], [0.46, 0.85]);
  return p.map(([x, y]) => [x, y - 1.5]);                // centred vertically
})();
DEF.paperClip = {
  name: 'クリップ', nameEn: 'Paper clip', tags: ['editorial', 'pop', 'emotional'], w: 0.7, layer: 'front', ae: 'shapes',
  draw(env, bb0, P) {
    if (env.pass !== 'main') return;
    const bb = getBB(env, bb0), { W, H, sc } = env, u = U(env), m = MG(env);
    const o = outE(env); if (o <= 0.003 || env.lt < 0) return;
    const S = J.clamp(Math.min(W, H) * 0.035, 22 * u, 40 * u), hc = S * 3.3;       // wire unit & clip height
    const low = !!P.low && H - bb.y1 > hc * 1.2 + m;
    const padP = hc * 0.42 + 10 * u + bh(bb) * 0.03;
    const Y = low ? bb.y1 + padP : Math.max(m * 0.5 + hc * 0.55, bb.y0 - padP), sy = low ? 1 : -1;
    const sx = P.right ? 1 : -1, Xc = J.clamp(sx < 0 ? bb.x0 - 26 * u - bw(bb) * 0.02 : bb.x1 + 26 * u + bw(bb) * 0.02, m * 0.5, W - m * 0.5);
    const e = E.inOutCubic(J.clamp(env.lt / 0.45)), L = Math.min(S * 7, Math.max(bw(bb) * 0.45, S * 4));
    sheetCorner(env, Xc, Y, -sx, -sy, L, e, o);
    const cx = J.clamp(Xc - sx * L * 0.42, m, W - m), tilt = (sx * 7 + J.rs(P.seed, 1) * 5) * DEG;
    const slide = (1 - E.outCubic(J.clamp((env.lt - 0.1) / 0.45))) * 24 * u;
    const cy = Y + sy * (hc * 0.12) - sy * slide;
    const pts = xf(low ? CLIP.map(([x, y]) => [x, -y]) : CLIP, cx, cy, tilt, S);
    const de = E.inOutCubic(J.clamp((env.lt - 0.1) / 0.6));
    const wire = part(pts, 0, de);
    stroke(env, wire, sc.fg, Math.max(1.4, 2.1 * u), 0.95 * o, false, { cap: 'round', join: 'round' });
    stroke(env, wire.map(([x, y]) => [x - 0.8 * u, y - 0.8 * u]), sc.bg, Math.max(1, 0.7 * u), 0.35 * o, false, { cap: 'round', join: 'round' });
  },
};

/* 見出しタブ — binder index tabs sliding out of a free screen edge; the current line's tab sticks out in the accent */
DEF.indexTabs = {
  name: '見出しタブ', nameEn: 'Heading tab', tags: ['editorial', 'pop', 'graphic'], w: 0.8, layer: 'front', ae: 'bars',
  draw(env, bb0, P) {
    if (env.pass !== 'main') return;
    const bb = getBB(env, bb0), { W, H, sc, ctx } = env, u = U(env);
    const o = outE(env); if (o <= 0.003 || env.lt < 0) return;
    const t0 = Math.min(env.cut.inDur || 0, 0.6) * 0.9, lt = env.lt - t0; if (lt <= 0) return;   // wait for the lyric to settle
    const n = 5, th = J.clamp(Math.min(W, H) * 0.066, 42 * u, 76 * u), tw = th * 0.8, g = 6 * u, fs = FS(env) * 1.05;
    const edges = (P.right ? ['r', 'l'] : ['l', 'r']).concat(['t', 'b']);
    const span = n * th + (n - 1) * g;
    let pick = null;
    for (const ed of edges) {
      const vertE = ed === 'l' || ed === 'r', mid = vertE ? H * (P.low ? 0.58 : 0.42) : W / 2, depth = tw + 22 * u;
      const box = ed === 'l' ? [0, mid - span / 2, depth, mid + span / 2] : ed === 'r' ? [W - depth, mid - span / 2, W, mid + span / 2] : ed === 't' ? [mid - span / 2, 0, mid + span / 2, depth] : [mid - span / 2, H - depth, mid + span / 2, H];
      if ((vertE ? H : W) > span + 40 * u && !hitBB(box[0], box[1], box[2], box[3], bb, 26 * u)) { pick = { ed, vertE, mid }; break; }
    }
    if (!pick) return;
    const { ed, vertE, mid } = pick, cur = ((env.cut.line | 0) % n + n) % n;
    const labs = [['01', '02', '03', '04', '05'], ['I', 'II', 'III', 'IV', 'V'], ['A', 'B', 'C', 'D', 'E']][(P.v | 0) % 3];
    for (let i = 0; i < n; i++) {
      const q = E.outBack(J.clamp((lt - i * 0.06) / 0.35), 1.3); if (q <= 0) continue;
      const isC = i === cur, d = (tw + (isC ? 16 * u : 0)) * q, along = mid - span / 2 + i * (th + g);
      let x, y, w, h;
      if (ed === 'l') { x = -12 * u; y = along; w = d + 12 * u; h = th; }
      else if (ed === 'r') { x = W - d; y = along; w = d + 12 * u; h = th; }
      else if (ed === 't') { x = along; y = -12 * u; w = th; h = d + 12 * u; }
      else { x = along; y = H - d; w = th; h = d + 12 * u; }
      const col = isC ? ACC(env) : sc.dim;
      rrFill(env, x, y, w, h, 6 * u, col, (isC ? 0.95 : 0.9) * o);
      if (!isC) rrStroke(env, x, y, w, h, 6 * u, sc.sub, Math.max(1, u), 0.7 * o);
      const tx = ed === 'l' ? d - tw * 0.5 : ed === 'r' ? W - d + tw * 0.5 : x + th / 2;
      const ty = ed === 't' ? d - tw * 0.5 : ed === 'b' ? H - d + tw * 0.5 : y + th / 2;
      const tc = isC ? (J.lum(col) > 0.55 ? '#000000' : sc.bg) : sc.fg;
      label(env, labs[i], tx, ty, { size: fs * (labs[i].length > 1 ? 1 : 1.15), font: labs[i].length > 1 ? monoF(env) : bodyF(env), align: 'center', color: tc, alpha: o * J.clamp((q - 0.5) * 2), track: 0.04 });
    }
    // hairline "page edge" along the tabs
    const ge = E.outExpo(J.clamp((lt - 0.1) / 0.5)), L = (vertE ? H : W) * 0.5 * ge;
    const pe = ed === 'l' ? [[1.5 * u, mid - L], [1.5 * u, mid + L]] : ed === 'r' ? [[W - 1.5 * u, mid - L], [W - 1.5 * u, mid + L]] : ed === 't' ? [[mid - L, 1.5 * u], [mid + L, 1.5 * u]] : [[mid - L, H - 1.5 * u], [mid + L, H - 1.5 * u]];
    stroke(env, pe, sc.sub, Math.max(1, u), 0.5 * o);
  },
};

/* ============================================================
   nature / atmosphere
   ============================================================ */

/* 蔓 — a tendril growing in from a screen corner, sprouting leaves and curls, stopping short of the lyric */
DEF.vines = {
  name: '蔓', nameEn: 'Vine', tags: ['emotional', 'calm', 'pop'], w: 0.8, layer: 'front', ae: 'leaders',
  draw(env, bb0, P) {
    if (env.pass !== 'main') return;
    const bb = getBB(env, bb0), { W, H, sc } = env, u = U(env);
    const o = outE(env); if (o <= 0.003 || env.lt < 0) return;
    const nV = P.big ? 2 : 1, ac = ACC(env), leafC = J.mix(ac, sc.fg, 0.15);
    for (let v = 0; v < nV; v++) {
      const sx = (P.right ? 1 : -1) * (v ? -1 : 1), sy = (P.low ? 1 : -1) * (v ? -1 : 1);
      const x0 = sx > 0 ? W - W * 0.08 : W * 0.08, y0 = sy > 0 ? H + 4 * u : -4 * u;
      let th = Math.atan2(-sy, -sx * 0.55), x = x0, y = y0;
      const step = 7 * u, Lmax = Math.min(W, H) * 0.62, pts = [[x, y]], seed = P.seed + v * 17;
      for (let s = 0; s < Lmax && pts.length < 200; s += step) {
        th += Math.sin(s / (90 * u) + seed % 7) * 0.05 + J.noise1(s / (60 * u), seed) * 0.03;
        x += Math.cos(th) * step; y += Math.sin(th) * step;
        if (clearOf(bb, x, y, 22 * u, 1) < 1 || x < 4 || x > W - 4 || y < -8 || y > H + 8) break;
        pts.push([x, y]);
      }
      if (pts.length < 6) continue;
      const e = E.outCubic(J.clamp((env.lt - v * 0.12) / 1.0)), sway = Math.sin(env.ltb * 0.9 + v) * 1.2 * DEG;
      const T = xf(pts.map(([px, py]) => [px - x0, py - y0]), x0, y0, sway);
      const stem = part(T, 0, e);
      stroke(env, stem, sc.fg, Math.max(1.2, 1.7 * u), 0.9 * o, false, { cap: 'round', join: 'round' });
      const Ltot = T.length, leaves = [], curls = [];
      for (let k = 1; k < 12; k++) {
        const f = k / 12 + J.rs(seed, k, 1) * 0.02; if (f > e) break;
        const p = along(T, f), side = k % 2 ? 1 : -1, grow = E.outBack(J.clamp((e - f) / 0.12), 1.8);
        if (k % 4 === 3) {                                // a curling tendril
          const cp = []; const an0 = p.ang + side * 1.2, R0 = 12 * u, cx = p.x + Math.cos(an0) * R0, cy = p.y + Math.sin(an0) * R0;
          for (let i = 0; i <= 20; i++) { const t = i / 20, an = an0 + Math.PI + side * t * 8, r = R0 * (1 - t * 0.85); cp.push([cx + Math.cos(an) * r, cy + Math.sin(an) * r]); }
          curls.push(part(cp, 0, grow));
          continue;
        }
        const Ll = (17 + J.r(seed, k, 2) * 12) * u * grow, an = p.ang + side * 0.95, c = Math.cos(an), s = Math.sin(an), leaf = [];
        for (let i = 0; i <= 10; i++) { const t = i / 10; leaf.push([t * Ll, Math.sin(t * Math.PI) * Ll * 0.3]); }
        for (let i = 10; i >= 0; i--) { const t = i / 10; leaf.push([t * Ll, -Math.sin(t * Math.PI) * Ll * 0.3]); }
        leaves.push(leaf.map(([lx, ly]) => [p.x + lx * c - ly * s, p.y + lx * s + ly * c]));
      }
      polys(env, leaves, leafC, 0.9 * o);
      strokes(env, curls, sc.fg, Math.max(1, 1.2 * u), 0.85 * o, false, { cap: 'round', join: 'round' });
      if (stem.length && e < 1) { const q = stem[stem.length - 1]; env.circle(q[0], q[1], 2.4 * u, ac, null, 0, o, false); }
    }
  },
};

/* 雲 — puffy line-art cumulus clouds (union of circles) drifting slowly through the free band */
function cloudOutline(cx, by, Wc, seed) {
  const cs = [[-0.38, 0.15, 0.3], [-0.21, 0.22, 0.5], [0.02, 0.26, 0.75], [0.23, 0.2, 0.5], [0.39, 0.13, 0.3], [-0.07, 0.19, 1.35]].map(([fx, fr, fy], i) => { const r = fr * Wc * (0.9 + 0.2 * J.r(seed, i, 1)); return [cx + fx * Wc, by - r * fy, r]; });
  const runs = [];
  for (const [x, y, r] of cs) {
    let cur = null;
    for (let i = 0; i <= 40; i++) {
      const an = Math.PI + i / 40 * Math.PI, px = x + Math.cos(an) * r, py = y + Math.sin(an) * r;
      const hidden = py > by || cs.some(c => c !== undefined && (c[0] !== x || c[1] !== y) && Math.hypot(px - c[0], py - c[1]) < c[2] - 0.5);
      if (hidden) { cur = null; continue; }
      if (!cur) { cur = []; runs.push(cur); }
      cur.push([px, py]);
    }
    // lower half of the circle, above the base line
    cur = null;
    for (let i = 0; i <= 20; i++) {
      const an = i / 20 * Math.PI, px = x + Math.cos(an) * r, py = y + Math.sin(an) * r;
      const hidden = py > by || cs.some(c => (c[0] !== x || c[1] !== y) && Math.hypot(px - c[0], py - c[1]) < c[2] - 0.5);
      if (hidden) { cur = null; continue; }
      if (!cur) { cur = []; runs.push(cur); }
      cur.push([px, py]);
    }
  }
  let xl = 1e9, xr = -1e9;
  for (const [x, y, r] of cs) { if (by - y < r) { const d = Math.sqrt(r * r - (by - y) * (by - y)); xl = Math.min(xl, x - d); xr = Math.max(xr, x + d); } }
  return { runs, base: [[xl, by], [xr, by]], circles: cs };
}
DEF.cloudPuffs = {
  name: '雲', nameEn: 'Clouds', tags: ['calm', 'pop', 'emotional'], w: 0.8, layer: 'front', ae: 'blobs',
  draw(env, bb0, P) {
    if (env.pass !== 'main') return;
    const bb = getBB(env, bb0), { W, sc, ctx } = env, u = U(env);
    const o = outE(env); if (o <= 0.003 || env.lt < 0) return;
    const fr = freeRects(env, bb, 20 * u).filter(r => r.side === 't' || r.side === 'b' || r.h > r.w); if (!fr.length) return;
    const reg = fr[0], n = 2 + ((P.n | 0) % 2);
    for (let i = 0; i < n; i++) {
      const r = k => J.r(P.seed, i, k);
      const Wc = Math.min(J.clamp(reg.w * 0.42 * (0.6 + 0.4 * r(1)), 90 * u, 260 * u), reg.h / 0.56);
      if (Wc < 50 * u) continue;
      const q = E.outBack(J.clamp((env.lt - i * 0.12) / 0.45), 1.5); if (q <= 0) continue;
      const Wq = Wc * (0.6 + 0.4 * q);
      const lane = (i + 0.5) / n, dir = (P.right ? 1 : -1) * (i % 2 ? -1 : 1);
      const cx = wrap(reg.x + reg.w * (lane + (r(2) - 0.5) * 0.25) + dir * env.ltb * (6 + r(3) * 8) * u, reg.x - Wc * 0.2, reg.w + Wc * 0.4);
      const by = reg.y + Wc * 0.52 + Math.max(0, reg.h - Wc * 0.56) * r(4) + Math.sin(env.ltb * 0.8 + i) * 2 * u;
      if (cx - Wc * 0.6 < reg.x - Wc * 0.1 || cx + Wc * 0.6 > reg.x + reg.w + Wc * 0.1) continue;
      const cl = cloudOutline(cx, by, Wq, P.seed + i);
      // soft body fill (single path, no alpha build-up)
      ctx.save(); ctx.beginPath(); ctx.rect(cx - Wq * 2, by - Wq * 2, Wq * 4, Wq * 2); ctx.clip();
      ctx.globalAlpha = 0.5 * o; ctx.fillStyle = sc.dim; ctx.beginPath();
      for (const [x, y, rr] of cl.circles) { ctx.moveTo(x + rr, y); ctx.arc(x, y, rr, 0, TAU); }
      ctx.fill(); ctx.restore();
      strokes(env, cl.runs, sc.fg, Math.max(1.2, 1.6 * u), 0.9 * o, false, { cap: 'round', join: 'round' });
      if (cl.base[0][0] < 1e8) stroke(env, cl.base, sc.fg, Math.max(1.2, 1.6 * u), 0.9 * o, false, { cap: 'round' });
      const c0 = cl.circles[2];                           // an inner shading curl
      stroke(env, arcP(c0[0] - c0[2] * 0.1, c0[1] + c0[2] * 0.12, c0[2] * 0.55, 200, 290, 16), sc.sub, Math.max(1, u), 0.6 * o, false, { cap: 'round' });
    }
  },
};

/* 星空 — a fine twinkling star field behind the lyric with an occasional shooting star */
DEF.starField = {
  name: '星空', nameEn: 'Starfield', tags: ['calm', 'emotional'], w: 0.8, layer: 'back', subtle: true, ae: 'dots',
  draw(env, bb, P) {
    if (env.pass !== 'main' || env.lt < 0) return;
    const { W, H, sc } = env, u = U(env);
    const o = outE(env); if (o <= 0.003) return;
    const dk = dark(env), col = dk ? sc.fg : sc.sub, k = dk ? 1 : 0.7;
    const N = Math.min(160, 90 + (P.n | 0) * 25), b = [[], [], []], bright = [];
    for (let i = 0; i < N; i++) {
      const r = j => J.r(P.seed, i, j);
      const f = J.clamp((env.lt - r(1) * 0.5) / 0.3); if (f <= 0) continue;
      const x = r(2) * W, y = r(3) * H, tw = 0.5 + 0.5 * Math.sin(env.ltb * (1.5 + r(4) * 3) + r(5) * 6);
      const lvl = r(6) < 0.6 ? 0 : r(6) < 0.9 ? 1 : 2;
      b[lvl].push([x, y, [1.2, 1.9, 2.8][lvl] * u * (0.6 + 0.4 * tw) * f]);
      if (lvl === 2 && r(7) < 0.5) bright.push([x, y, tw * f]);
    }
    dots(env, b[0], col, 0.45 * o * k); dots(env, b[1], col, 0.65 * o * k); dots(env, b[2], col, 0.9 * o * k);
    for (const [x, y, tw] of bright) { const L = (7 + 7 * tw) * u; segs(env, [[x - L, y, x + L, y], [x, y - L, x, y + L]], col, Math.max(1, 0.8 * u), 0.5 * tw * o * k); }
    // shooting star
    const T = 2.4, ph = env.ltb - 0.6 - P.r * 0.8; if (ph < 0) return;
    const cyc = Math.floor(ph / T), t = (ph - cyc * T) / 0.55; if (t > 1) return;
    const sx0 = W * J.rr(0.15, 0.85, P.seed, cyc, 1), sy0 = H * J.rr(0.05, 0.4, P.seed, cyc, 2), ang = (J.r(P.seed, cyc, 3) < 0.5 ? 25 : 155) * DEG, Ls = Math.min(W, H) * 0.35;
    const hx = sx0 + Math.cos(ang) * Ls * E.outCubic(t), hy = sy0 + Math.sin(ang) * Ls * E.outCubic(t), tail = Ls * 0.35 * Math.sin(Math.PI * t);
    for (let s = 0; s < 6; s++) { const a0 = s / 6, a1 = (s + 1) / 6; segs(env, [[hx - Math.cos(ang) * tail * a0, hy - Math.sin(ang) * tail * a0, hx - Math.cos(ang) * tail * a1, hy - Math.sin(ang) * tail * a1]], col, 1.4 * u * (1 - a0), 0.8 * (1 - a0) * o * k, false, 'round'); }
  },
};

/* 月齢 — a row of moon-phase icons (new → full → new) with the evening's phase ringed and named */
const MOON_NAMES = ['NEW', 'WAX', '1Q', 'GIB', 'FULL', 'WAN', 'LQ', 'OLD'];
DEF.moonPhases = {
  name: '月齢', nameEn: 'Moon phase', tags: ['calm', 'emotional', 'editorial'], w: 0.8, layer: 'front', ae: 'dots',
  draw(env, bb0, P) {
    if (env.pass !== 'main') return;
    const bb = getBB(env, bb0), { W, H, sc } = env, u = U(env), m = MG(env);
    const o = outE(env); if (o <= 0.003 || env.lt < 0) return;
    const n = 8, fs = FS(env) * 0.95;
    let r = J.clamp(Math.min(W, H) * 0.025, 14 * u, 27 * u), dx = r * 2.8;
    if (dx * (n - 1) + r * 2 > W - 2 * m) { dx = (W - 2 * m - r * 2) / (n - 1); r = Math.min(r, dx / 2.6); }
    const w = dx * (n - 1) + r * 2, h = r * 2 + fs * 2.6;
    const gap = 26 * u, above = P.low ? false : true;
    let y0 = above ? bb.y0 - gap - h : bb.y1 + gap;
    if (y0 < m * 0.6 || y0 + h > H - m * 0.6) y0 = above ? bb.y1 + gap : bb.y0 - gap - h;
    let sp = { x: J.clamp((bb.x0 + bb.x1) / 2 - w / 2, m, W - m - w), y: y0, ok: true };
    if (y0 < m * 0.4 || y0 + h > H - m * 0.4) sp = spot(env, bb, w, h, P, gap);
    const a = o * (sp.ok ? 1 : 0.35), cy = sp.y + r, ac = ACC(env);
    const target = J.h(env.cut.seed, 3) % n, sel = E.inOutCubic(J.clamp((env.lt - 0.25) / 0.7)) * target;
    const outl = [], lit = [];
    for (let k = 0; k < n; k++) {
      const q = E.outBack(J.clamp((env.lt - k * 0.05) / 0.3), 1.8); if (q <= 0) continue;
      const cx = sp.x + r + k * dx, rr = r * q, p = k / n, f = (1 - Math.cos(p * TAU)) / 2, wax = p <= 0.5;
      outl.push([cx, cy, rr]);
      if (f > 0.02) {
        const kx = 1 - 2 * f, pts = [];
        for (let i = 0; i <= 16; i++) { const t = (-90 + 180 * i / 16) * DEG; pts.push([cx + (wax ? 1 : -1) * Math.cos(t) * rr, cy + Math.sin(t) * rr]); }
        for (let i = 16; i >= 0; i--) { const t = (-90 + 180 * i / 16) * DEG; pts.push([cx + (wax ? 1 : -1) * kx * Math.cos(t) * rr, cy + Math.sin(t) * rr]); }
        lit.push(pts);
      }
    }
    rings(env, outl, sc.sub, Math.max(1, u), 0.8 * a);
    polys(env, lit, sc.fg, 0.92 * a);
    const hx = sp.x + r + sel * dx;
    env.circle(hx, cy, r * 1.45, null, ac, Math.max(1.2, 1.6 * u), a * inE(env, 0.3, 0.2), false);
    segs(env, [[sp.x, cy + r * 1.8, sp.x + w * inE(env, 0.5, 0.1), cy + r * 1.8]], sc.sub, Math.max(1, u), 0.5 * a);
    segs(env, [[hx, cy + r * 1.8 - 3 * u, hx, cy + r * 1.8 + 3 * u]], ac, Math.max(1, 1.4 * u), a);
    const done = J.clamp((env.lt - 0.9) / 0.3);
    label(env, MOON_NAMES[Math.round(sel)], hx, cy + r * 1.8 + fs * 1.1, { font: serifF(env), size: fs, align: 'center', color: sc.fg, alpha: a * (0.5 + 0.5 * done), track: 0.2 });
  },
};

/* 陽射し — faint sunburst wedges slowly turning out of a corner (or the bottom edge), behind the lyric */
DEF.sunRays = {
  name: '陽射し', nameEn: 'Sunbeams', tags: ['emotional', 'pop', 'calm'], w: 0.8, layer: 'back', subtle: true, ae: 'stripes',
  draw(env, bb, P) {
    if (env.pass !== 'main' || env.lt < 0) return;
    const { W, H, sc } = env, u = U(env);
    const o = outE(env); if (o <= 0.003) return;
    const bottom = (P.v | 0) % 3 === 2;
    const cx = bottom ? W / 2 : P.right ? W + W * 0.02 : -W * 0.02, cy = bottom ? H + H * 0.08 : P.low ? H + H * 0.03 : -H * 0.03;
    const N = 16 + (P.n | 0) * 4, R = Math.hypot(W, H) * 1.05, e = E.outCubic(J.clamp(env.lt / 0.8));
    const rot = (P.r * 30 + env.ltb * 2.2 * (P.right ? -1 : 1)) * DEG, list = [];
    for (let i = 0; i < N; i++) {
      const a0 = rot + i / N * TAU, a1 = a0 + TAU / N * 0.5;
      list.push([[cx, cy], [cx + Math.cos(a0) * R * e, cy + Math.sin(a0) * R * e], [cx + Math.cos(a1) * R * e, cy + Math.sin(a1) * R * e]]);
    }
    const dk = dark(env);
    polys(env, list, P.accent ? ACC(env) : sc.dim, (P.accent ? (dk ? 0.07 : 0.09) : (dk ? 0.45 : 0.6)) * o);
    const R0 = Math.min(W, H) * 0.13 * E.outBack(J.clamp(env.lt / 0.5), 1.4), ac = ACC(env);
    env.circle(cx, cy, R0, null, ac, Math.max(1, 1.4 * u), 0.5 * o, false);
    env.circle(cx, cy, R0 * 1.18, null, ac, Math.max(1, u), 0.25 * o, false);
    dots(env, [[cx, cy, R0 * 0.8]], ac, 0.12 * o);
  },
};

/* 雨の波紋 — raindrops landing on a still "ground plane" in the lower screen: perspective ripple rings (under the lyric) */
DEF.rainRipples = {
  name: '雨の波紋', nameEn: 'Rain ripples', tags: ['calm', 'emotional'], w: 0.8, layer: 'back', subtle: true, ae: 'rings',
  draw(env, bb, P) {
    if (env.pass !== 'main' || env.lt < 0) return;
    const { W, H, sc } = env, u = U(env);
    const o = outE(env) * inE(env, 0.4, 0, E.outCubic); if (o <= 0.003) return;
    const dk = dark(env), col = dk ? sc.fg : sc.sub, k = dk ? 0.55 : 0.6;
    const N = 9 + (P.n | 0) * 3, y0 = H * 0.6, y1 = H * 0.97;
    const b = [[], [], []], drops = [];
    for (let i = 0; i < N; i++) {
      const T = 1.5 + J.r(P.seed, i, 1) * 0.9, t = env.ltb + J.r(P.seed, i, 2) * T, cyc = Math.floor(t / T), tau = t - cyc * T - 0.22;
      const x = W * J.rr(0.03, 0.97, P.seed, i, cyc, 3), f = J.r(P.seed, i, cyc, 4), y = J.lerp(y0, y1, f * f * 0.3 + f * 0.7);
      const depth = 0.45 + 0.55 * (y - y0) / (y1 - y0), Rm = (70 + J.r(P.seed, i, cyc, 5) * 90) * u * depth;
      if (tau < 0) { const q = 1 + tau / 0.22, L = 26 * u * depth; drops.push([x, y - (1 - q) * H * 0.18 - L, x, y - (1 - q) * H * 0.18]); continue; }
      for (let j = 0; j < 3; j++) {
        const tj = (tau - j * 0.14) / 1.1; if (tj <= 0 || tj >= 1) continue;
        const r = Rm * E.outCubic(tj) * (1 - j * 0.18), al = Math.pow(1 - tj, 1.4);
        b[al > 0.6 ? 0 : al > 0.3 ? 1 : 2].push(ellP(x, y, r, r * 0.26 * (0.8 + 0.4 * depth), 0, 0, 360, 36));
      }
    }
    const lw = Math.max(1, 1.1 * u);
    strokes(env, b[0], col, lw, 0.8 * o * k); strokes(env, b[1], col, lw, 0.5 * o * k); strokes(env, b[2], col, lw, 0.22 * o * k);
    segs(env, drops, col, lw, 0.6 * o * k, false, 'round');
  },
};

/* シャボン玉 — soap bubbles rising and wobbling; bubbles that drift up under the lyric pop just before touching it */
DEF.bubbles = {
  name: 'シャボン玉', nameEn: 'Bubbles', tags: ['pop', 'emotional', 'calm'], w: 0.8, layer: 'front', ae: 'dots',
  draw(env, bb0, P) {
    if (env.pass !== 'main') return;
    const bb = getBB(env, bb0), { W, H, sc } = env, u = U(env), m = MG(env);
    const o = outE(env); if (o <= 0.003 || env.lt < 0) return;
    const N = Math.min(14, 7 + (P.n | 0) * 2), iri = ACC2(env), pad = 10 * u;
    const outl = [], hi = [], irid = [], glints = [], pops = [];
    for (let i = 0; i < N; i++) {
      const r = k => J.r(P.seed, i, k);
      const born = r(9) < 0.4 && bb.y0 - pad - 30 * u > m;          // blown from the lyric's top edge instead of rising from below
      const Tc = born ? 2.2 + r(1) * 1.2 : 3.4 + r(1) * 1.6, t = born ? env.ltb - 0.1 - r(2) * 1.4 : env.ltb + r(2) * Tc;
      if (t < 0) continue;
      const cyc = Math.floor(t / Tc), tau = t - cyc * Tc;
      const rc = k => J.r(P.seed, i, cyc, k);
      const R = (14 + rc(3) * rc(3) * 30) * u * (born ? 0.8 : 1), v = (born ? 45 + rc(4) * 40 : 60 + rc(4) * 60) * u;
      const x0 = born ? J.lerp(bb.x0 + R, bb.x1 - R, rc(5)) : m + (W - 2 * m) * rc(5);
      let y0 = born ? bb.y0 - pad - R : H + R + 10 * u, life = born ? Math.min(Tc - 0.3, (y0 + R) / v) : 2.2 + rc(6) * (Tc - 2.6);
      const x = x0 + Math.sin(tau * 1.4 + rc(7) * 6) * 16 * u * (born ? Math.min(1, tau) : 1);
      const over = x0 + R + 16 * u > bb.x0 - pad && x0 - R - 16 * u < bb.x1 + pad;
      if (!born && over && y0 > bb.y1) life = Math.min(life, (y0 - (bb.y1 + pad + R)) / v);
      const y = y0 - v * Math.min(tau, life);
      const inflate = born ? E.outBack(J.clamp(tau / 0.45), 1.6) : E.outBack(J.clamp(env.lt / 0.35 + (cyc > 0 || r(2) * Tc > 0.4 ? 1 : 0)), 1.6);
      if (tau < life) {
        if (clearOf(bb, x, y, pad * 0.5 + R, 1) < 1) continue;
        const wob = Math.sin(tau * 5 + i) * 0.05, rx = R * (1 + wob) * inflate, ry = R * (1 - wob) * inflate;
        outl.push(ellP(x, y, rx, ry, 0, 0, 360, 32));
        irid.push(ellP(x, y, rx * 0.8, ry * 0.8, 0, 200, 262, 10));
        hi.push(ellP(x, y, rx * 0.8, ry * 0.8, 0, 292, 330, 8));
        glints.push([x - rx * 0.36, y - ry * 0.44, 1.6 * u * inflate]);
      } else if (tau < life + 0.24) {
        const q = (tau - life) / 0.24, d0 = R * (1 + q * 0.6);
        for (let k = 0; k < 8; k++) { const an = k * 45 * DEG + i; pops.push([x + Math.cos(an) * d0, y + Math.sin(an) * d0, x + Math.cos(an) * (d0 + 5 * u * (1 - q)), y + Math.sin(an) * (d0 + 5 * u * (1 - q)), 1 - q]); }
      }
    }
    const lw = Math.max(1, 1.2 * u);
    strokes(env, outl, sc.fg, lw, 0.7 * o);
    strokes(env, irid, iri, 1.8 * u, 0.8 * o, false, { cap: 'round' });
    strokes(env, hi, sc.fg, 1.6 * u, 0.7 * o, false, { cap: 'round' });
    dots(env, glints, sc.fg, 0.9 * o);
    for (const p of pops) segs(env, [p.slice(0, 4)], sc.fg, lw, p[4] * 0.9 * o, false, 'round');
  },
};

/* 煙 — thin wisps of smoke curling upward (optionally from a stick of incense with a glowing tip), under the lyric */
DEF.smoke = {
  name: '煙', nameEn: 'Smoke', tags: ['calm', 'emotional', 'editorial'], w: 0.8, layer: 'back', subtle: true, ae: 'blobs',
  draw(env, bb, P) {
    if (env.pass !== 'main' || env.lt < 0) return;
    const { W, H, sc } = env, u = U(env), m = MG(env);
    const o = outE(env); if (o <= 0.003) return;
    const incense = (P.v | 0) % 2 === 1, dk = dark(env), col = dk ? sc.fg : sc.sub, k = dk ? 0.5 : 0.6;
    const nW = incense ? 1 : 2 + ((P.n | 0) % 2), Hs = H * 0.72 * E.outCubic(J.clamp(env.lt / 1.0));
    for (let w = 0; w < nW; w++) {
      const xb = incense ? (P.right ? W - W * 0.12 : W * 0.12) : W * J.rr(0.15, 0.85, P.seed, w, 1);
      const yb = incense ? H - m - 90 * u : H + 10 * u, seed = P.seed + w * 31;
      if (incense && w === 0) {
        segs(env, [[xb, yb, xb + 1.5 * u, H - m * 0.4]], sc.sub, 2 * u, 0.8 * o);
        const gl = 0.7 + 0.3 * Math.sin(env.ltb * 7);
        dots(env, [[xb, yb, 6 * u]], ACC(env), 0.15 * o * gl); dots(env, [[xb, yb, 2.4 * u]], ACC(env), o);
      }
      for (let s = 0; s < 4; s++) {
        const pts = [], sp = (s - 1.5);
        for (let d = 0; d <= Hs; d += 8 * u) {
          const A = 6 * u + d * 0.17, x = xb + sp * d * 0.035 + J.noise1(d / (130 * u) - env.ltb * 0.8 + s * 0.45, seed) * A + Math.sin(d / (75 * u) - env.ltb * 1.5 + s * 0.8) * A * 0.4;
          pts.push([x, yb - d]);
        }
        const n = pts.length; if (n < 3) continue;
        for (let q = 0; q < 4; q++) {
          const seg = pts.slice(Math.floor(n * q / 4), Math.floor(n * (q + 1) / 4) + 1);
          stroke(env, seg, col, (1.7 - s * 0.25) * u, (0.6 - q * 0.13) * (1 - s * 0.18) * o * k, false, { cap: 'round', join: 'round' });
        }
      }
    }
  },
};

/* 綿毛 — dandelion seeds (stalk + umbrella of filaments) drifting on the wind, optionally shed from a puffball */
DEF.dandelion = {
  name: '綿毛', nameEn: 'Seed fluff', tags: ['calm', 'emotional'], w: 0.8, layer: 'front', ae: 'sparks',
  draw(env, bb0, P) {
    if (env.pass !== 'main') return;
    const bb = getBB(env, bb0), { W, H, sc } = env, u = U(env), m = MG(env);
    const o = outE(env); if (o <= 0.003 || env.lt < 0) return;
    const dir = P.right ? 1 : -1, N = 6 + (P.n | 0) * 2 + (P.big ? 3 : 0), lw = Math.max(1, 0.9 * u);
    const lines = [], tips = [], bodies = [];
    const seedShape = (x, y, s, rot) => {
      const c = Math.cos(rot), sn = Math.sin(rot), T = (px, py) => [x + (px * c - py * sn) * s, y + (px * sn + py * c) * s];
      const top = T(0, -24 * u), bot = T(0, 2 * u);
      lines.push([bot[0], bot[1], top[0], top[1]]);
      for (let k = 0; k < 13; k++) { const an = (-90 + (k - 6) * 14) * DEG, L = 17 * u; const p = T(Math.cos(an) * L, -24 * u + Math.sin(an) * L * 0.75); lines.push([top[0], top[1], p[0], p[1]]); tips.push([p[0], p[1], 1.1 * u * s]); }
      const b0 = T(0, 2 * u), b1 = T(0, 10 * u); bodies.push([b0[0], b0[1], b1[0], b1[1]]);
    };
    const puff = !!P.big, px = P.right ? W * 0.1 : W * 0.9, py = H - m - H * 0.16;
    for (let i = 0; i < N; i++) {
      const r = k => J.r(P.seed, i, k);
      const q = E.outCubic(J.clamp((env.lt - r(1) * 0.35) / 0.4)); if (q <= 0) continue;
      const v = (40 + r(2) * 50) * u, span = W + 120 * u, t = env.ltb;
      let x, y;
      if (puff) {                                      // released one after another, strung out along the wind from the puffball
        const T = (W * 0.9) / v, age = wrap(t + r(4) * T, 0, T);
        x = px + dir * v * age; y = py - v * 0.38 * age + Math.sin(t * (1 + r(7)) + r(8) * 6) * 14 * u * Math.min(1, age);
        if (age < 0.15) continue;
      } else {
        x = wrap(r(3) * W + dir * v * (t + r(4) * 8), -60 * u, span); y = wrap(H * (0.12 + 0.76 * r(5)) - (18 + r(6) * 20) * u * t + Math.sin(t * (1 + r(7)) + r(8) * 6) * 18 * u, -40 * u, H + 80 * u);
      }
      const al = clearOf(bb, x, y, 14 * u, 26 * u); if (al < 0.6) continue;
      seedShape(x, y, (0.8 + r(9) * 0.5) * q, (dir * 12 + Math.sin(t * 1.2 + i) * 18) * DEG);
    }
    if (puff) {                                        // the puffball the seeds come from
      const e = E.outCubic(J.clamp(env.lt / 0.5)), R = 30 * u * e, st = [];
      for (let k = 0; k <= 12; k++) { const f = k / 12; st.push([px + Math.sin(f * 2) * 8 * u * (P.right ? -1 : 1), H + 4 * u - (H + 4 * u - py) * f * e]); }
      stroke(env, st, sc.sub, 1.6 * u, 0.9 * o, false, { cap: 'round' });
      for (let k = 0; k < 30; k++) { if (J.r(P.seed, k, 44) < 0.25) continue; const an = k / 30 * TAU; const x1 = px + Math.cos(an) * R, y1 = py + Math.sin(an) * R; lines.push([px, py, x1, y1]); tips.push([x1, y1, 1.3 * u]); }
      dots(env, [[px, py, 4 * u * e]], sc.sub, o);
    }
    segs(env, lines, sc.fg, lw, 0.7 * o);
    dots(env, tips, sc.fg, 0.8 * o);
    segs(env, bodies, ACC(env), 2.2 * u, 0.9 * o, false, 'round');
  },
};

/* 蛍 — fireflies wandering around the lyric, glowing on and off with soft halos and faint trails */
DEF.fireflies = {
  name: '蛍', nameEn: 'Fireflies', tags: ['emotional', 'calm'], w: 0.8, layer: 'front', ae: 'dots',
  draw(env, bb0, P) {
    if (env.pass !== 'main') return;
    const bb = getBB(env, bb0), { W, H, sc } = env, u = U(env), m = MG(env);
    const o = outE(env); if (o <= 0.003 || env.lt < 0) return;
    const col = dark(env) ? [ACC2(env), ACC(env)].sort((a, b) => J.lum(b) - J.lum(a))[0] : ACC(env);
    const N = Math.min(16, 9 + (P.n | 0) * 2), halo = [[], []], core = [], trails = [];
    const cx = (bb.x0 + bb.x1) / 2, cy = (bb.y0 + bb.y1) / 2;
    for (let i = 0; i < N; i++) {
      const r = k => J.r(P.seed, i, k);
      const f = J.clamp((env.lt - r(1) * 0.4) / 0.4); if (f <= 0) continue;
      const pos = t => {
        const th = r(2) * TAU + J.noise1(t * 0.18 + i * 3.1, P.seed) * 1.6;
        const rad = 0.55 + 0.45 * r(3) + 0.12 * J.noise1(t * 0.3 + i * 5.3, P.seed + 1);
        return [J.clamp(cx + Math.cos(th) * (W * 0.5 - m) * rad, m * 0.5, W - m * 0.5), J.clamp(cy + Math.sin(th) * (H * 0.5 - m) * rad, m * 0.5, H - m * 0.5)];
      };
      const p = pos(env.ltb), al = clearOf(bb, p[0], p[1], 10 * u, 34 * u); if (al <= 0.02) continue;
      const b = Math.pow(Math.max(0, Math.sin(env.ltb * (1.6 + r(4) * 1.4) + r(5) * 6)), 2) * 0.85 + 0.15, a = f * al * b;
      halo[0].push([p[0], p[1], 20 * u, a]); halo[1].push([p[0], p[1], 8.5 * u, a]);
      core.push([p[0], p[1], 3 * u, a]);
      const q = pos(env.ltb - 0.25);
      trails.push([q[0], q[1], p[0], p[1], a]);
    }
    for (const h of halo[0]) dots(env, [h], col, 0.1 * h[3] * o);
    for (const h of halo[1]) dots(env, [h], col, 0.26 * h[3] * o);
    for (const t of trails) segs(env, [t.slice(0, 4)], col, 1.2 * u, 0.2 * t[4] * o, false, 'round');
    for (const c of core) dots(env, [c], col, (0.35 + 0.65 * c[3]) * o * Math.min(1, c[3] * 3));
  },
};

/* ============================================================
   graphic shapes
   ============================================================ */

/* メンフィス — Memphis-style squiggles, zigzags, outlined triangles, dot grids and hatch strokes placed round the lyric */
DEF.memphis = {
  name: 'メンフィス', nameEn: 'Memphis', tags: ['pop', 'graphic'], w: 0.9, layer: 'front', ae: 'shapes',
  draw(env, bb0, P) {
    if (env.pass !== 'main') return;
    const bb = getBB(env, bb0), { W, H, sc, ctx } = env, u = U(env);
    const o = outE(env); if (o <= 0.003 || env.lt < 0) return;
    const K = Math.min(8, 5 + (P.n | 0)), pad = 34 * u + bh(bb) * 0.22;
    const X0 = bb.x0 - pad, X1 = bb.x1 + pad, Y0 = bb.y0 - pad, Y1 = bb.y1 + pad, per = 2 * (X1 - X0 + Y1 - Y0);
    const cols = [ACC(env), ACC2(env), sc.fg], S = J.clamp(Math.min(W, H) * 0.036, 24 * u, 44 * u), lw = 3.4 * u;
    const types = ['squig', 'zig', 'tri', 'dots', 'half', 'hatch'];
    for (let i = 0; i < K; i++) {
      const r = k => J.r(P.seed, i, k);
      let t = ((i + 0.2 + r(1) * 0.6) / K) * per, x, y;
      if (t < X1 - X0) { x = X0 + t; y = Y0; } else if ((t -= X1 - X0) < Y1 - Y0) { x = X1; y = Y0 + t; } else if ((t -= Y1 - Y0) < X1 - X0) { x = X1 - t; y = Y1; } else { t -= X1 - X0; x = X0; y = Y1 - t; }
      x = J.clamp(x, S * 1.6, W - S * 1.6); y = J.clamp(y, S * 1.6, H - S * 1.6);
      if (clearOf(bb, x, y, S * 1.3, 1) < 1) continue;
      const q = J.clamp((env.lt - 0.04 - i * 0.06) / 0.4); if (q <= 0) continue;
      const sc2 = E.outBack(q, 2), de = E.inOutCubic(q), type = types[(i + (P.v | 0)) % types.length], col = cols[i % 3];
      const rot = (r(3) * 360 + Math.sin(env.ltb * 1.3 + i) * 6) * DEG;
      ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
      if (type === 'squig') { const p = []; for (let k = 0; k <= 24; k++) { const f = k / 24; p.push([(f - 0.5) * S * 2.6, Math.sin(f * TAU * 1.5) * S * 0.28]); } stroke(env, part(p, 0, de), col, lw, o, false, { cap: 'round', join: 'round' }); }
      else if (type === 'zig') { const p = []; for (let k = 0; k <= 6; k++) p.push([(k / 6 - 0.5) * S * 2.4, (k % 2 ? -1 : 1) * S * 0.3]); stroke(env, part(p, 0, de), col, lw, o, false, { cap: 'round', join: 'round' }); }
      else if (type === 'tri') { const p = []; for (let k = 0; k <= 3; k++) { const an = (-90 + k * 120) * DEG; p.push([Math.cos(an) * S * 0.8 * sc2, Math.sin(an) * S * 0.8 * sc2]); } stroke(env, p, col, lw * 0.8, o, false, { join: 'round' }); }
      else if (type === 'dots') { const d = []; for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) d.push([a * S * 0.5, b * S * 0.5, 2.6 * u * sc2]); dots(env, d, col, o); }
      else if (type === 'half') { const p = arcP(0, 0, S * 0.7 * sc2, 180, 360, 20); polys(env, [p], col, o); }
      else { const l = []; for (let k = -1; k <= 1; k++) l.push([k * S * 0.45 - S * 0.3 * de, S * 0.5 * de, k * S * 0.45 + S * 0.3 * de, -S * 0.5 * de]); segs(env, l, col, lw * 0.9, o, false, 'round'); }
      ctx.restore();
    }
  },
};

/* ジグザグリボン — an accordion-folded two-tone ribbon unfurling in from a screen corner */
DEF.zigzagRibbon = {
  name: 'ジグザグリボン', nameEn: 'Zigzag ribbon', tags: ['pop', 'graphic'], w: 0.8, layer: 'front', ae: 'bars',
  draw(env, bb0, P) {
    if (env.pass !== 'main') return;
    const bb = getBB(env, bb0), { W, H, sc } = env, u = U(env);
    const o = outE(env); if (o <= 0.003 || env.lt < 0) return;
    const rw = J.clamp(Math.min(W, H) * 0.3, 200 * u, 420 * u), rh = rw * 0.42;
    const sp = cornerSpot(env, bb, rw, rh, P, 0.6), a = o * (sp.ok ? 1 : 0.3);
    const sx = sp.sx, sy = sp.sy, ox = sx > 0 ? W + 20 * u : -20 * u, oy = sy > 0 ? sp.y + rh * 0.75 : sp.y + rh * 0.25;
    const ix = sx > 0 ? sp.x : sp.x + rw, iy = sy > 0 ? sp.y + rh * 0.2 : sp.y + rh * 0.8;
    const L = Math.hypot(ix - ox, iy - oy), dx = (ix - ox) / L, dy = (iy - oy) / L, nx = -dy, ny = dx;
    const seg = 7, Z = rh * 0.22, wv = rh * 0.3, vx = nx * 0.35 + dx * 0.0 + 0, vy = 1;       // ribbon "thickness" runs mostly vertical
    const vl = Math.hypot(vx, vy), VX = vx / vl * wv, VY = vy / vl * wv;
    const e = E.outCubic(J.clamp(env.lt / 0.6)) * seg;
    const C = k => { const s = L * k / seg; return [ox + dx * s + nx * (k % 2 ? Z : -Z), oy + dy * s + ny * (k % 2 ? Z : -Z)]; };
    const front = [], back = [], edges = [];
    for (let k = 0; k < seg; k++) {
      if (k >= e) break;
      const f = Math.min(1, e - k), p0 = C(k), p1f = C(k + 1), p1 = L2(p0, p1f, f);
      const quad = [p0, p1, [p1[0] + VX, p1[1] + VY], [p0[0] + VX, p0[1] + VY]];
      (k % 2 ? back : front).push(quad);
      edges.push([p0, p1], [[p0[0] + VX, p0[1] + VY], [p1[0] + VX, p1[1] + VY]]);
    }
    const c1 = ACC(env), c2 = J.contrast(ACC2(env), sc.bg) > 1.6 && ACC2(env) !== c1 ? ACC2(env) : J.mix(c1, sc.bg, 0.4);
    polys(env, back, c2, 0.95 * a, true);
    polys(env, front, c1, 0.95 * a, true);
    strokes(env, edges, sc.bg, Math.max(1, 0.8 * u), 0.25 * a);
  },
};

/* 水玉 — a patch of polka dots whose sizes breathe in a travelling diagonal wave */
DEF.polkaPatch = {
  name: '水玉', nameEn: 'Polka dots', tags: ['pop', 'graphic', 'calm'], w: 0.9, layer: 'front', ae: 'dots',
  draw(env, bb0, P) {
    if (env.pass !== 'main') return;
    const bb = getBB(env, bb0), { sc } = env, u = U(env);
    const o = outE(env); if (o <= 0.003 || env.lt < 0) return;
    const cols = 6 + (P.n | 0), rows = 3 + ((P.v | 0) % 2), s = J.clamp(Math.min(env.W, env.H) * 0.03, 20 * u, 36 * u);
    const w = (cols - 0.5) * s, h = (rows - 1) * s * 0.87 + s;
    const sp = spot(env, bb, w, h, P, 24 * u), a = o * (sp.ok ? 1 : 0.35);
    const round = (P.v | 0) % 3 === 2, ac = ACC(env), main = [], hot = [];
    const dir = P.right ? 1 : -1;
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const x = sp.x + s * 0.5 + i * s + (j % 2 ? s * 0.5 : 0), y = sp.y + s * 0.5 + j * s * 0.87;
      if (x > sp.x + w) continue;
      if (round) { const fx = (x - sp.x - w / 2) / (w / 2), fy = (y - sp.y - h / 2) / (h / 2); if (fx * fx + fy * fy > 1.05) continue; }
      const d = (dir > 0 ? i : cols - i) + j;
      const q = E.outBack(J.clamp((env.lt - d * 0.03) / 0.3), 2); if (q <= 0) continue;
      const wv = 0.5 + 0.5 * Math.sin(env.ltb * 3.2 - d * 0.7);
      const rr = s * 0.42 * (0.35 + 0.65 * wv) * q;
      (wv > 0.93 && (i + j) % 3 === 0 ? hot : main).push([x, y, rr]);
    }
    dots(env, main, P.accent ? ac : sc.fg, 0.9 * a);
    dots(env, hot, P.accent ? sc.fg : ac, a);
  },
};

/* 縞の円 — a disc filled with fine rotating stripes, ringed, with an off-register outline "shadow" */
DEF.stripeCircle = {
  name: '縞の円', nameEn: 'Striped circles', tags: ['graphic', 'pop'], w: 0.9, layer: 'front', ae: 'stripes',
  draw(env, bb0, P) {
    if (env.pass !== 'main') return;
    const bb = getBB(env, bb0), { sc, ctx } = env, u = U(env);
    const o = outE(env); if (o <= 0.003 || env.lt < 0) return;
    const R = J.clamp(Math.min(env.W, env.H) * 0.062, 40 * u, 80 * u);
    const sp = spot(env, bb, R * 2.4, R * 2.4, P, 22 * u), a = o * (sp.ok ? 1 : 0.35);
    const cx = sp.cx - 3 * u, cy = sp.cy - 3 * u, e = E.outBack(J.clamp(env.lt / 0.45), 1.5), r = R * e, v = (P.v | 0) % 2;
    if (r <= 1) return;
    const ac = ACC(env), half = v === 1;
    env.circle(cx + 7 * u, cy + 7 * u, r, null, sc.sub, Math.max(1, u), 0.7 * a * J.clamp((env.lt - 0.2) / 0.3), false);
    ctx.save(); ctx.beginPath();
    if (half) ctx.arc(cx, cy, r, 0, Math.PI); else ctx.arc(cx, cy, r, 0, TAU);
    ctx.clip();
    const th = (45 + env.ltb * (half ? 0 : 18) * (P.right ? 1 : -1)) * DEG, sp2 = 8 * u, shift = half ? (env.ltb * 14 * u) % sp2 : 0;
    const c = Math.cos(th), s = Math.sin(th), list = [];
    for (let k = -Math.ceil(R / sp2) - 1; k <= Math.ceil(R / sp2) + 1; k++) { const d = k * sp2 + shift; list.push([cx + c * d - s * R * 1.2, cy + s * d + c * R * 1.2, cx + c * d + s * R * 1.2, cy + s * d - c * R * 1.2]); }
    segs(env, list, ac, 3.2 * u, a);
    ctx.restore();
    if (half) {                                          // upper half: fine concentric arcs drawing on
      const he = E.inOutCubic(J.clamp((env.lt - 0.2) / 0.5)), ar = [];
      for (let k = 1; k <= 3; k++) ar.push([cx, cy, r * k / 4, Math.PI, Math.PI + Math.PI * he]);
      arcs(env, ar, sc.fg, Math.max(1, 1.1 * u), 0.8 * a);
      segs(env, [[cx - r, cy, cx + r, cy]], sc.fg, Math.max(1, 1.2 * u), a);
    }
    env.circle(cx, cy, r, null, sc.fg, Math.max(1, 1.5 * u), a, false);
  },
};

/* 装飾コーナー — art-deco corner ornaments (stepped double L, quarter arc, diamonds) drawn out from two screen corners */
DEF.decoCorners = {
  name: '装飾コーナー', nameEn: 'Decorative corners', tags: ['editorial', 'graphic', 'calm'], w: 0.9, layer: 'front', ae: 'brackets',
  draw(env, bb0, P) {
    if (env.pass !== 'main') return;
    const bb = getBB(env, bb0), { W, H, sc } = env, u = U(env), m = MG(env);
    const o = outE(env); if (o <= 0.003 || env.lt < 0) return;
    const Lc = J.clamp(Math.min(W, H) * 0.15, 90 * u, 190 * u), g = 9 * u, lw = Math.max(1, 1.3 * u), ac = ACC(env);
    const cs = P.big ? [[-1, -1], [1, -1], [1, 1], [-1, 1]] : P.corner ? [[-1, -1], [1, 1]] : [[1, -1], [-1, 1]];
    cs.forEach(([sx, sy], k) => {
      const X = sx < 0 ? m * 0.7 : W - m * 0.7, Y = sy < 0 ? m * 0.7 : H - m * 0.7;
      if (hitBB(Math.min(X, X - sx * Lc), Math.min(Y, Y - sy * Lc), Math.max(X, X - sx * Lc), Math.max(Y, Y - sy * Lc), bb, 6 * u)) return;
      const e = E.outCubic(J.clamp((env.lt - k * 0.06) / 0.55)); if (e <= 0) return;
      const ix = -sx, iy = -sy, P2 = (dx, dy) => [X + ix * dx, Y + iy * dy];
      const outer = [P2(Lc, 0), P2(0, 0), P2(0, Lc)];
      const inner = [P2(Lc * 0.62, g), P2(g * 2, g), P2(g * 2, g * 2), P2(g, g * 2), P2(g, Lc * 0.62)];
      stroke(env, part(outer, 0.5 - 0.5 * e, 0.5 + 0.5 * e), sc.fg, lw, 0.85 * o);
      stroke(env, part(inner, 0.5 - 0.5 * e, 0.5 + 0.5 * e), sc.fg, lw, 0.6 * o);
      const e2 = E.outCubic(J.clamp((env.lt - 0.15 - k * 0.06) / 0.5));
      const a0 = Math.atan2(iy, 0) / DEG, a1 = Math.atan2(0, ix) / DEG;
      let s0 = a0, s1 = a1; if (Math.abs(s1 - s0) > 180) { if (s1 < s0) s1 += 360; else s0 += 360; }
      const mid = (s0 + s1) / 2, hs = (s1 - s0) / 2 * e2;
      stroke(env, arcP(X, Y, Lc * 0.42, mid - hs, mid + hs, 30), sc.fg, lw, 0.5 * o);
      stroke(env, arcP(X, Y, Lc * 0.42 + 5 * u, mid - hs * 0.6, mid + hs * 0.6, 20), sc.sub, Math.max(1, 0.8 * u), 0.5 * o);
      const q = E.outBack(J.clamp((env.lt - 0.35 - k * 0.06) / 0.3), 2); if (q <= 0) return;
      const dia = (x, y, r) => [[x, y - r], [x + r, y], [x, y + r], [x - r, y]];
      const d1 = P2(Lc, 0), d2 = P2(0, Lc), dm = P2(Lc * 0.42 * 0.7071, Lc * 0.42 * 0.7071);
      polys(env, [dia(d1[0], d1[1], 4 * u * q), dia(d2[0], d2[1], 4 * u * q)], ac, o);
      polys(env, [dia(dm[0], dm[1], 5.5 * u * q)], sc.fg, 0.9 * o);
      dots(env, [[...P2(g * 3.4, g * 3.4), 1.8 * u * q]], ac, o);
    });
  },
};

/* 半円の積層 — Bauhaus half-circles: a stacked tower of domes, a scalloped row, or nested rainbow arches */
DEF.halfCircles = {
  name: '半円の積層', nameEn: 'Stacked half-circles', tags: ['graphic', 'pop', 'calm'], w: 0.9, layer: 'front', ae: 'shapes',
  draw(env, bb0, P) {
    if (env.pass !== 'main') return;
    const bb = getBB(env, bb0), { sc } = env, u = U(env);
    const o = outE(env); if (o <= 0.003 || env.lt < 0) return;
    const v = (P.v | 0) % 3, R = J.clamp(Math.min(env.W, env.H) * 0.058, 38 * u, 74 * u), lw = Math.max(1.2, 1.6 * u);
    const bw0 = v === 1 ? R * 7.4 : R * 2.2, bh0 = v === 0 ? R * 2.5 : v === 1 ? R * 1.3 : R * 1.2;
    const sp = spot(env, bb, bw0, bh0, P, 24 * u), a = o * (sp.ok ? 1 : 0.35), ac = ACC(env), a2 = ACC2(env);
    const grow = k => E.outBack(J.clamp((env.lt - k * 0.08) / 0.35), 1.6);
    if (v === 0) {                                     // tower of domes
      let yb = sp.y + bh0;
      for (let k = 0; k < 4; k++) {
        const r = R * (1 - k * 0.2), q = grow(k); if (q <= 0) break;
        const cx = sp.cx + Math.sin(env.ltb * 1.2 + k) * 2 * u * k, pts = arcP(cx, yb, r * q, 180, 360, 28);
        if (k % 2 === 0) polys(env, [pts], k === 0 ? ac : sc.fg, 0.95 * a); else stroke(env, pts.concat([pts[0]]), sc.fg, lw, a, false, { join: 'round' });
        yb -= r * q * 0.62;
      }
    } else if (v === 1) {                              // scalloped row, alternating up / down
      const r = R * 0.6, y = sp.cy;
      for (let k = 0; k < 6; k++) {
        const q = grow(k); if (q <= 0) break;
        const cx = sp.x + r + k * r * 2, up = k % 2 === 0, bob = Math.sin(env.ltb * 2 + k) * 2 * u;
        const pts = arcP(cx, y + bob, r * q, up ? 180 : 0, up ? 360 : 180, 20);
        if (k % 3 === 0) polys(env, [pts], ac, 0.95 * a); else if (k % 3 === 1) polys(env, [pts], a2, 0.9 * a); else stroke(env, pts.concat([pts[0]]), sc.fg, lw, a);
      }
      segs(env, [[sp.x, y, sp.x + bw0 * inE(env, 0.5), y]], sc.fg, Math.max(1, u), 0.6 * a);
    } else {                                           // nested arches
      const yb = sp.y + bh0, rot = Math.sin(env.ltb * 0.8) * 3;
      for (let k = 0; k < 5; k++) {
        const r = R * (1 - k * 0.18), q = grow(4 - k); if (q <= 0) continue;
        const pts = arcP(sp.cx, yb, r, 180 + rot, 180 + rot + 180 * E.outCubic(J.clamp(q)), 36);
        if (k === 4) polys(env, [arcP(sp.cx, yb, r * q, 180, 360, 20)], ac, a);
        else stroke(env, pts, k % 2 ? ac : sc.fg, 3 * u, a, false, { cap: 'butt' });
      }
      segs(env, [[sp.cx - R * 1.1, yb, sp.cx + R * 1.1, yb]], sc.fg, Math.max(1, u), 0.7 * a * inE(env, 0.4));
    }
  },
};

/* 循環矢印 — circular chasing arrows (2 or 3) rotating round a small readout, like a repeat / refresh glyph */
DEF.loopArrows = {
  name: '循環矢印', nameEn: 'Cycle arrows', tags: ['graphic', 'pop', 'editorial'], w: 0.8, layer: 'front', ae: 'arrows',
  draw(env, bb0, P) {
    if (env.pass !== 'main') return;
    const bb = getBB(env, bb0), { sc } = env, u = U(env);
    const o = outE(env); if (o <= 0.003 || env.lt < 0) return;
    const R = J.clamp(Math.min(env.W, env.H) * 0.055, 36 * u, 70 * u);
    const sp = spot(env, bb, R * 2.8, R * 2.8, P, 22 * u), a = o * (sp.ok ? 1 : 0.35);
    const cx = sp.cx, cy = sp.cy, n = 2 + ((P.n | 0) % 2), dir = P.right ? 1 : -1, ac = ACC(env), lw = Math.max(1.4, 2.4 * u);
    const e = E.outCubic(J.clamp(env.lt / 0.5)), rot = dir * (env.ltb * 70 + (1 - e) * -120) + P.r * 360;
    const seg = 360 / n, sw = (seg - 38) * e;
    for (let k = 0; k < n; k++) {
      const a0 = rot + k * seg, a1 = a0 + dir * sw;
      stroke(env, arcP(cx, cy, R, a0, a1, 30), sc.fg, lw, a, false, { cap: 'round' });
      const an = a1 * DEG, tx = -Math.sin(an) * dir, ty = Math.cos(an) * dir, px = cx + Math.cos(an) * R, py = cy + Math.sin(an) * R, hs = 7 * u * e;
      polys(env, [[[px + tx * hs * 1.3, py + ty * hs * 1.3], [px - tx * hs * 0.4 + Math.cos(an) * hs, py - ty * hs * 0.4 + Math.sin(an) * hs], [px - tx * hs * 0.4 - Math.cos(an) * hs, py - ty * hs * 0.4 - Math.sin(an) * hs]]], ac, a);
    }
    env.circle(cx, cy, R * 1.32, null, sc.sub, Math.max(1, 0.8 * u), 0.35 * a * e, false);
    const fs = R * 0.5, loops = 1 + Math.floor(env.lt / 1.1);
    label(env, `×${loops}`, cx, cy, { size: fs, align: 'center', color: sc.fg, alpha: a * inE(env, 0.3, 0.2), track: 0.02 });
  },
};

/* スターバースト — a zig-zag "sale sticker" badge that spins in beside the lyric, with a word / number inside */
DEF.starburst = {
  name: 'スターバースト', nameEn: 'Starburst', tags: ['pop', 'graphic'], w: 0.8, layer: 'front', ae: 'shapes',
  draw(env, bb0, P) {
    if (env.pass !== 'main') return;
    const bb = getBB(env, bb0), { sc, ctx } = env, u = U(env);
    const o = outE(env); if (o <= 0.003 || env.lt < 0) return;
    const R = J.clamp(Math.min(env.W, env.H) * 0.068, 44 * u, 88 * u);
    const sp = nearBB(env, bb, R * 2.2, R * 2.2, P, 14 * u), a = o * (sp.ok ? 1 : 0.35);
    const q = E.outBack(J.clamp((env.lt - 0.05) / 0.4), 2.2); if (q <= 0) return;
    const rot = (env.ltb * 9 + (1 - q) * -120 + P.r * 30) * DEG, N = 22, ac = ACC(env);
    const pts = []; for (let i = 0; i < N * 2; i++) { const an = i / (N * 2) * TAU, r = i % 2 ? R * 0.83 : R; pts.push([Math.cos(an) * r, Math.sin(an) * r]); }
    const txtC = J.lum(ac) > 0.55 ? '#000000' : sc.bg;
    ctx.save(); ctx.translate(sp.cx, sp.cy); ctx.rotate(rot); ctx.scale(q, q);
    polys(env, [pts], ac, 0.97 * a);
    env.circle(0, 0, R * 0.7, null, txtC, Math.max(1, 1.2 * u), 0.55 * a, false);
    const v = (P.v | 0) % 5, ch = lyricChar(env, 9);
    const txt = [`No.${pad2((env.cut.line | 0) + 1)}`, 'NEW', 'HIT!', ch || '♪', 'LOVE'][v];
    const font = v === 3 ? serifF(env) : dispF(env);
    let fs = R * (v === 3 ? 0.7 : 0.42); const tw = textW(txt, font, fs, 0.02); if (tw > R * 1.15) fs *= R * 1.15 / tw;
    ctx.rotate(-rot * 0.85);
    env.draw({ text: txt, font, size: fs, x: 0, y: 0, color: txtC, alpha: a, track: 0.02, ghost: false });
    ctx.restore();
  },
};

/* 正の字 — hand-drawn tally marks (正) counting up stroke by stroke through the cut */
const SEI = [[[0.1, 0.12], [0.9, 0.12]], [[0.5, 0.12], [0.5, 0.9]], [[0.5, 0.5], [0.84, 0.5]], [[0.22, 0.46], [0.22, 0.9]], [[0.02, 0.9], [0.98, 0.9]]];
DEF.tally = {
  name: '正の字', nameEn: 'Tally marks', tags: ['editorial', 'pop', 'emotional'], w: 0.8, layer: 'front', ae: 'counter',
  draw(env, bb0, P) {
    if (env.pass !== 'main') return;
    const bb = getBB(env, bb0), { sc } = env, u = U(env);
    const o = outE(env); if (o <= 0.003 || env.lt < 0) return;
    const nC = 2 + ((P.n | 0) % 2), S = J.clamp(Math.min(env.W, env.H) * 0.064, 40 * u, 76 * u), gp = S * 0.3, fs = FS(env) * 1.05;
    const w = nC * S + (nC - 1) * gp + fs * 3.2, h = S * 1.1;
    const sp = spot(env, bb, w, h, P, 24 * u), a = o * (sp.ok ? 1 : 0.35);
    const total = nC * 5, dt = J.clamp((env.cut.dur * 0.75 - 0.2) / total, 0.09, 0.26);
    const col = P.accent ? ACC(env) : sc.fg, lw = Math.max(1.6, 3 * u);
    let count = 0;
    for (let c = 0; c < nC; c++) {
      const x0 = sp.x + c * (S + gp), y0 = sp.y + (h - S) / 2, tilt = J.rs(P.seed, c, 1) * 4 * DEG;
      for (let k = 0; k < 5; k++) {
        const idx = c * 5 + k, t0 = 0.1 + idx * dt, e = E.outCubic(J.clamp((env.lt - t0) / Math.min(0.14, dt * 0.9))); if (e <= 0) continue;
        if (e >= 1) count++;
        const j = i => J.rs(P.seed, idx, i) * 0.035;
        const p = SEI[k].map(([x, y], i) => [x + j(i * 2), y + j(i * 2 + 1)]).map(([x, y]) => { const X = (x - 0.5) * S, Y = (y - 0.5) * S; return [x0 + S / 2 + X * Math.cos(tilt) - Y * Math.sin(tilt), y0 + S / 2 + X * Math.sin(tilt) + Y * Math.cos(tilt)]; });
        stroke(env, part(p, 0, e), col, lw, 0.95 * a, false, { cap: 'round' });
      }
    }
    const lx = sp.x + nC * (S + gp) - gp + fs * 0.8;
    label(env, '×', lx, sp.y + h / 2, { size: fs, alpha: a * inE(env, 0.3, 0.1) });
    label(env, pad2(count), lx + fs * 0.9, sp.y + h / 2, { size: fs * 1.3, color: count >= total ? ACC(env) : sc.fg, alpha: a * inE(env, 0.3, 0.1), track: 0.04 });
  },
};

/* ============================================================
   UI widgets
   ============================================================ */

/* カーソル — a mouse pointer glides in and clicks beside the lyric (ripple + tooltip), or drags a marching-ants selection round it */
const CURSOR = [[0, 0], [0, 1], [0.27, 0.76], [0.45, 1.13], [0.6, 1.06], [0.42, 0.7], [0.74, 0.7]];
DEF.cursorClick = {
  name: 'カーソル', nameEn: 'Cursor', tags: ['pop', 'graphic', 'glitch'], w: 0.8, layer: 'front', ae: 'arrows',
  draw(env, bb0, P) {
    if (env.pass !== 'main') return;
    const bb = getBB(env, bb0), { W, H, sc, ctx } = env, u = U(env), m = MG(env);
    const o = outE(env); if (o <= 0.003 || env.lt < 0) return;
    const Sc = J.clamp(Math.min(W, H) * 0.034, 24 * u, 42 * u), ac = ACC(env), marquee = (P.v | 0) % 2 === 1;
    const pad = 14 * u + bh(bb) * 0.06, lw = Math.max(1, 1.2 * u);
    let tip;
    if (marquee) {
      const A = [J.clamp(bb.x0 - pad, m * 0.4, W), J.clamp(bb.y0 - pad, m * 0.4, H)], B = [J.clamp(bb.x1 + pad, 0, W - m * 0.4), J.clamp(bb.y1 + pad, 0, H - m * 0.4)];
      const enter = E.outCubic(J.clamp(env.lt / 0.3)), drag = E.inOutCubic(J.clamp((env.lt - 0.3) / 0.6));
      const start = [A[0] - 60 * u, A[1] - 90 * u];
      tip = drag <= 0 ? L2(start, A, enter) : L2(A, B, drag);
      if (env.lt > 0.95) tip = [B[0] + 18 * u * E.outCubic(J.clamp((env.lt - 0.95) / 0.4)), B[1] + 12 * u * E.outCubic(J.clamp((env.lt - 0.95) / 0.4))];
      if (drag > 0) {
        const C = drag < 1 ? tip : B, x0 = Math.min(A[0], C[0]), y0 = Math.min(A[1], C[1]), x1 = Math.max(A[0], C[0]), y1 = Math.max(A[1], C[1]);
        const ph = env.ltb * 30 * u;
        dash(env, x0, y0, x1, y0, 6 * u, 4 * u, sc.fg, lw, 0.9 * o, ph); dash(env, x1, y0, x1, y1, 6 * u, 4 * u, sc.fg, lw, 0.9 * o, ph);
        dash(env, x1, y1, x0, y1, 6 * u, 4 * u, sc.fg, lw, 0.9 * o, ph); dash(env, x0, y1, x0, y0, 6 * u, 4 * u, sc.fg, lw, 0.9 * o, ph);
        if (drag >= 1) {
          const hs = 3.5 * u, hq = E.outBack(J.clamp((env.lt - 0.9) / 0.25), 2) * hs, hl = [];
          for (const [x, y] of [[x0, y0], [x1, y0], [x1, y1], [x0, y1], [(x0 + x1) / 2, y0], [(x0 + x1) / 2, y1], [x0, (y0 + y1) / 2], [x1, (y0 + y1) / 2]]) hl.push([x - hq, y - hq, hq * 2, hq * 2]);
          rects(env, hl, ac, o);
          label(env, `${Math.round(x1 - x0)} × ${Math.round(y1 - y0)}`, x1, y1 + FS(env) * 1.1, { size: FS(env) * 0.8, align: 'right', color: sc.fg, alpha: o * J.clamp((env.lt - 1) / 0.3) });
        }
      }
    } else {
      const sx = P.right ? 1 : -1, target = [sx > 0 ? bb.x1 + 10 * u : bb.x0 - 10 * u - Sc * 0.7, (P.low ? bb.y1 : bb.y0) + (P.low ? 8 * u : -Sc * 1.2)];
      target[0] = J.clamp(target[0], m * 0.5, W - m * 0.5 - Sc); target[1] = J.clamp(target[1], m * 0.5, H - m * 0.5 - Sc * 1.2);
      const from = [target[0] + sx * W * 0.22, target[1] + H * 0.18], mv = E.outCubic(J.clamp(env.lt / 0.55));
      tip = [J.lerp(from[0], target[0], mv) + Math.sin(mv * Math.PI) * 30 * u, J.lerp(from[1], target[1], mv)];
      const away = E.inCubic(env.pOut); tip = [tip[0] + sx * away * 60 * u, tip[1] + away * 40 * u];
      for (const tc of [0.62, 0.84, 1.9]) {                 // double click, then another
        const q = (env.lt - tc) / 0.5; if (q <= 0 || q >= 1) continue;
        env.circle(target[0], target[1], (6 + 26 * E.outCubic(q)) * u, null, ac, 2 * u * (1 - q), o * (1 - q), false);
      }
      const tq = J.clamp((env.lt - 0.9) / 0.25);
      if (tq > 0) {
        const txt = `LYRIC ${pad2((env.cut.line | 0) + 1)}`, fs = FS(env) * 0.85, tw = textW(txt, monoF(env), fs, 0.1) + 16 * u, th = fs * 1.9;
        const bx = J.clamp(target[0] + Sc * 0.9, m * 0.4, W - m * 0.4 - tw), by = J.clamp(target[1] + Sc * 1.25, m * 0.4, H - m * 0.4 - th);
        if (!hitBB(bx, by, bx + tw, by + th, bb, 2)) {
          rrFill(env, bx, by, tw, th * E.outBack(tq, 1.5), 4 * u, sc.fg, 0.92 * o);
          label(env, txt, bx + tw / 2, by + th / 2, { size: fs, align: 'center', color: sc.bg, alpha: o * tq, track: 0.1 });
        }
      }
    }
    const click = !marquee && [0.62, 0.84, 1.9].some(tc => env.lt > tc && env.lt < tc + 0.1);
    const s = Sc * (click ? 0.86 : 1), pts = CURSOR.map(([x, y]) => [tip[0] + x * s, tip[1] + y * s]);
    polys(env, [pts.map(([x, y]) => [x + 3 * u, y + 4 * u])], sc.sub, 0.3 * o);
    polys(env, [pts], sc.fg, o);
    strokes(env, [pts], sc.bg, Math.max(1, 1.4 * u), o, false, { close: true, join: 'round' });
  },
};

/* ウィンドウ — an OS window frame opening round the lyric: title bar with buttons, file name, scrollbar and status line */
DEF.windowChrome = {
  name: 'ウィンドウ', nameEn: 'Window', tags: ['pop', 'graphic', 'glitch'], w: 0.8, layer: 'front', ae: 'brackets',
  draw(env, bb0, P) {
    if (env.pass !== 'main') return;
    const bb = getBB(env, bb0), { W, H, sc } = env, u = U(env), m = MG(env);
    const o = outE(env); if (o <= 0.003 || env.lt < 0) return;
    const bar = J.clamp(Math.min(W, H) * 0.036, 26 * u, 44 * u), px = 30 * u + bw(bb) * 0.03, py = 20 * u + bh(bb) * 0.08;
    let X0 = bb.x0 - px, X1 = bb.x1 + px, Y0 = bb.y0 - py - bar, Y1 = bb.y1 + py + bar * 0.6;
    X0 = Math.max(X0, m * 0.35); X1 = Math.min(X1, W - m * 0.35); Y0 = Math.max(Y0, m * 0.35); Y1 = Math.min(Y1, H - m * 0.35);
    if (Y0 + bar > bb.y0 - 4 * u) Y0 = bb.y0 - 4 * u - bar;
    const e = E.outExpo(J.clamp(env.lt / 0.45)) * (1 - 0.06 * E.inCubic(env.pOut)), s = 0.94 + 0.06 * e;
    const cx = (X0 + X1) / 2, cy = (Y0 + Y1) / 2, T = (x, y) => [cx + (x - cx) * s, cy + (y - cy) * s];
    const [x0, y0] = T(X0, Y0), [x1, y1] = T(X1, Y1), lw = Math.max(1, 1.4 * u), a = o * J.clamp(env.lt / 0.15);
    const r = 8 * u, ac = ACC(env), mac = (P.v | 0) % 2 === 0;
    rrStroke(env, x0, y0, x1 - x0, y1 - y0, r, sc.fg, lw, 0.9 * a);
    rrFill(env, x0, y0, x1 - x0, bar * s, r, sc.fg, 0.1 * a);
    segs(env, [[x0, y0 + bar * s, x1, y0 + bar * s]], sc.fg, lw, 0.8 * a);
    const be = inE(env, 0.3, 0.2), by = y0 + bar * s / 2, br = bar * 0.17;
    if (mac) { const cs2 = [ac, ACC2(env), sc.sub]; cs2.forEach((c, k) => env.circle(x0 + bar * 0.55 + k * br * 3, by, br * be, c, null, 0, a, false)); }
    else {
      const bx = x1 - bar * 0.6, k = br * be;
      segs(env, [[bx - k, by - k, bx + k, by + k], [bx - k, by + k, bx + k, by - k]], sc.fg, lw, a);
      rrStroke(env, bx - bar * 0.95 - k, by - k, k * 2, k * 2, 0, sc.fg, lw, a);
      segs(env, [[bx - bar * 1.9 - k, by, bx - bar * 1.9 + k, by]], sc.fg, lw, a);
    }
    const fs = FS(env) * 0.92, title = `lyric_${pad2((env.cut.line | 0) + 1)}.txt`;
    label(env, title, (x0 + x1) / 2, by, { size: fs, align: 'center', color: sc.fg, alpha: a * be, track: 0.08 });
    // scrollbar + status line
    const sbx = x1 - 9 * u, st = y0 + bar * s + 8 * u, sbH = (y1 - 8 * u) - st;
    if (sbH > 30 * u && sbx > bb.x1 + 12 * u) {
      segs(env, [[sbx, st, sbx, st + sbH * be]], sc.sub, Math.max(1, u), 0.4 * a);
      const th = sbH * 0.35, ty = st + (sbH - th) * J.clamp(env.lt / Math.max(1, env.cut.dur));
      rrFill(env, sbx - 2 * u, ty, 4 * u, th * be, 2 * u, sc.sub, 0.8 * a);
    }
    if (y1 - bb.y1 > fs * 1.4) label(env, `Ln ${pad2((env.cut.line | 0) + 1)}, Col ${[...String(env.cut.text || '')].length}   UTF-8`, x1 - 14 * u, y1 - fs * 0.8, { size: fs * 0.8, align: 'right', alpha: a * be * 0.8, track: 0.08 });
  },
};

/* a w×h block in the free band under (or over) the lyric, centred on it; falls back to spot() */
function bandSpot(env, bb, w, h, P, gap) {
  const { W, H } = env, m = MG(env) * 0.8;
  for (const below of P.low ? [false, true] : [true, false]) {
    const y = below ? bb.y1 + gap : bb.y0 - gap - h;
    if (y < m || y + h > H - m) continue;
    const x = J.clamp((bb.x0 + bb.x1) / 2 - w / 2, m, W - m - w);
    return { x, y, cx: x + w / 2, cy: y + h / 2, ok: true };
  }
  return spot(env, bb, w, h, P, gap);
}

/* 読み込みバー — a UI progress bar: pill track, barber-pole fill that loads in uneven bursts, file-size readout */
DEF.progressBar = {
  name: '読み込みバー', nameEn: 'Loading bar', tags: ['pop', 'graphic', 'glitch'], w: 0.8, layer: 'front', ae: 'bars',
  draw(env, bb0, P) {
    if (env.pass !== 'main') return;
    const bb = getBB(env, bb0), { W, sc, ctx } = env, u = U(env);
    const o = outE(env); if (o <= 0.003 || env.lt < 0) return;
    const fs = FS(env) * 0.9, th = J.clamp(Math.min(W, env.H) * 0.014, 10 * u, 18 * u);
    const w = Math.min(W * 0.4, 460 * u, Math.max(bw(bb) * 0.65, 260 * u)), h = th + fs * 3.2;
    const sp = bandSpot(env, bb, w, h, P, 26 * u), a = o * (sp.ok ? 1 : 0.35), ac = ACC(env);
    const x0 = sp.x, ty = sp.y + fs * 1.5;
    const e = E.outExpo(J.clamp(env.lt / 0.45)), tw = w * e, tx = x0 + (w - tw) / 2;
    // uneven progress: 5 bursts with stalls, reaching 100 % at ~85 % of the cut
    const T = Math.max(0.8, env.cut.dur * 0.85 - 0.3); let p = 0;
    for (let k = 0; k < 5; k++) { const t0 = 0.25 + T * k / 5 + J.r(P.seed, k, 1) * T * 0.08, d = T / 5 * (0.35 + J.r(P.seed, k, 2) * 0.4); p += 0.2 * E.inOutCubic(J.clamp((env.lt - t0) / d)); }
    p = J.clamp(p);
    rrStroke(env, tx, ty, tw, th, th / 2, sc.fg, Math.max(1, 1.2 * u), 0.8 * a);
    const fw = Math.max(0, (tw - 4 * u) * p);
    if (fw > 1) {
      ctx.save(); ctx.beginPath(); rrPath(ctx, tx + 2 * u, ty + 2 * u, fw, th - 4 * u, (th - 4 * u) / 2); ctx.clip();
      rects(env, [[tx, ty, tw, th]], ac, a);
      const st = [], gap = 12 * u, off = (env.ltb * 26 * u) % gap;
      for (let x = tx - th + off; x < tx + fw + th; x += gap) st.push([x, ty + th, x + th, ty]);
      segs(env, st, J.lum(ac) > 0.5 ? '#000000' : '#ffffff', 4 * u, 0.16 * a);
      ctx.restore();
    }
    const done = p >= 0.999, le = inE(env, 0.3, 0.15);
    const dots3 = '.'.repeat(Math.floor(env.ltb * 3) % 4);
    label(env, done ? 'Complete' : 'Loading' + dots3, tx, sp.y + fs * 0.6, { size: fs, font: bodyF(env), color: sc.fg, alpha: a * le, track: 0.04 });
    label(env, `${Math.floor(p * 100)}%`, tx + tw, sp.y + fs * 0.6, { size: fs, align: 'right', color: done ? ac : sc.fg, alpha: a * le });
    const tot = 8 + (J.h(P.seed, 3) % 400) / 10;
    label(env, `${(tot * p).toFixed(1)} MB / ${tot.toFixed(1)} MB`, tx + tw, ty + th + fs * 1.1, { size: fs * 0.78, align: 'right', alpha: a * le * 0.85 });
    if (done) { const ck = [[tx + 2 * u, ty + th + fs * 1.1], [tx + 6 * u, ty + th + fs * 1.1 + 4 * u], [tx + 13 * u, ty + th + fs * 1.1 - 5 * u]]; stroke(env, part(ck, 0, J.clamp((env.lt - T - 0.3) * 4)), ac, 2 * u, a, false, { cap: 'round', join: 'round' }); }
  },
};

/* トグル — a small settings panel: two or three iOS-style switches flicking on one after another */
const TOGGLE_LABELS = [['SHUFFLE', 'REPEAT', 'LYRICS'], ['IDEAS', 'MEMORIES', 'REGRETS'], ['LOVE', 'MEMORY', 'REPLAY'], ['VOICE', 'LIGHT', 'NIGHT']];
DEF.toggleSwitch = {
  name: 'トグル', nameEn: 'Toggle', tags: ['pop', 'graphic'], w: 0.7, layer: 'front', ae: 'shapes',
  draw(env, bb0, P) {
    if (env.pass !== 'main') return;
    const bb = getBB(env, bb0), { sc } = env, u = U(env);
    const o = outE(env); if (o <= 0.003 || env.lt < 0) return;
    const n = 2 + ((P.n | 0) % 2), th = J.clamp(Math.min(env.W, env.H) * 0.034, 24 * u, 44 * u), tw = th * 1.8, rowH = th * 1.7, fs = th * 0.58;
    const labs = TOGGLE_LABELS[(P.v | 0) % TOGGLE_LABELS.length], lw0 = Math.max(...labs.slice(0, n).map(l => textW(l, bodyF(env), fs, 0.12)));
    const w = lw0 + 16 * u + tw, h = n * rowH;
    const sp = spot(env, bb, w, h, P, 24 * u), a = o * (sp.ok ? 1 : 0.35), ac = ACC(env), knobC = J.lum(ac) > 0.6 ? '#000000' : sc.bg;
    for (let i = 0; i < n; i++) {
      const q = E.outCubic(J.clamp((env.lt - i * 0.08) / 0.3)); if (q <= 0) continue;
      const y = sp.y + i * rowH + (rowH - th) / 2, x = sp.x + w - tw, on = E.outBack(J.clamp((env.lt - 0.45 - i * 0.32) / 0.25), 1.6);
      label(env, labs[i], sp.x, y + th / 2, { size: fs, font: bodyF(env), color: sc.fg, alpha: a * q, track: 0.12 });
      rrFill(env, x, y, tw, th, th / 2, ac, a * J.clamp(on) * q);
      rrStroke(env, x, y, tw, th, th / 2, J.clamp(on) > 0.5 ? ac : sc.sub, Math.max(1, 1.2 * u), a * q);
      const kx = x + th / 2 + (tw - th) * on;
      env.circle(kx, y + th / 2, th * 0.38 * q, J.clamp(on) > 0.5 ? knobC : sc.fg, null, 0, a, false);
      if (i < n - 1) segs(env, [[sp.x, sp.y + (i + 1) * rowH, sp.x + w * q, sp.y + (i + 1) * rowH]], sc.sub, Math.max(1, 0.8 * u), 0.3 * a);
    }
  },
};

/* 通知 — a line-art bell that rings each time its red badge counts up */
DEF.notifBell = {
  name: '通知', nameEn: 'Notification', tags: ['pop', 'emotional'], w: 0.7, layer: 'front', ae: 'counter',
  draw(env, bb0, P) {
    if (env.pass !== 'main') return;
    const bb = getBB(env, bb0), { sc, ctx } = env, u = U(env);
    const o = outE(env); if (o <= 0.003 || env.lt < 0) return;
    const S = J.clamp(Math.min(env.W, env.H) * 0.075, 48 * u, 92 * u), fs = FS(env) * 0.95;
    const sp = spot(env, bb, S * 1.9, S * 1.7 + fs * 1.8, P, 22 * u), a = o * (sp.ok ? 1 : 0.35), ac = ACC(env);
    const cx = sp.cx - S * 0.15, cy = sp.y + S * 0.95;
    const step = 0.5, k = Math.max(0, Math.floor((env.lt - 0.35) / step) + 1), maxN = 3 + (J.h(P.seed, 2) % 7), cnt = Math.min(maxN, k);
    const since = env.lt - (0.35 + (Math.min(k, maxN) - 1) * step), ring = cnt > 0 ? Math.exp(-since * 5) * Math.sin(since * 30) * 16 : 0;
    const e = E.outBack(J.clamp(env.lt / 0.4), 1.6);
    const body = [[-0.44, 0.36]].concat(bez([-0.34, 0.26], [-0.38, -0.12], [-0.3, -0.45], [0, -0.47], 12), bez([0, -0.47], [0.3, -0.45], [0.38, -0.12], [0.34, 0.26], 12), [[0.44, 0.36]]);
    ctx.save(); ctx.translate(cx, cy - S * 0.5); ctx.rotate(ring * DEG); ctx.translate(0, S * 0.5); ctx.scale(e, e);
    const pts = body.map(([x, y]) => [x * S, y * S]);
    stroke(env, pts.concat([pts[0]]), sc.fg, Math.max(1.4, 2 * u), a, false, { join: 'round', cap: 'round' });
    env.circle(0, -0.52 * S, 0.06 * S, null, sc.fg, Math.max(1.2, 1.6 * u), a, false);
    env.arc(Math.sin(ring * DEG * 2) * S * 0.08, 0.44 * S, 0.1 * S, 0, 180, sc.fg, Math.max(1.4, 2 * u), a, false);
    ctx.restore();
    if (cnt > 0) {
      const bump = 1 + 0.35 * Math.exp(-since * 9), br = S * 0.26 * bump, bx = cx + S * 0.36, by = cy - S * 0.42;
      env.circle(bx, by, br, ac, null, 0, a, false);
      env.circle(bx, by, br + 2 * u, null, sc.bg, 2 * u, a, false);
      label(env, cnt >= 9 ? '9+' : String(cnt), bx, by, { size: br * 1.15, font: dispF(env), align: 'center', color: J.lum(ac) > 0.6 ? '#000000' : sc.bg, alpha: a, track: 0 });
    }
    label(env, `NOTICE ${pad2(cnt)}`, cx, cy + S * 0.72 + fs * 0.8, { size: fs, font: bodyF(env), align: 'center', alpha: a * inE(env, 0.3, 0.3), track: 0.1 });
  },
};

/* いいね — a heart button that fills with a burst when "liked", beside a rolling like counter */
const heartPts = (cx, cy, s) => { const o = []; for (let i = 0; i < 36; i++) { const t = i / 36 * TAU; const x = 16 * Math.pow(Math.sin(t), 3), y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t); o.push([cx + x * s / 17, cy - y * s / 17]); } return o; };
DEF.likeCounter = {
  name: 'いいね', nameEn: 'Like', tags: ['pop', 'emotional'], w: 0.8, layer: 'front', ae: 'counter',
  draw(env, bb0, P) {
    if (env.pass !== 'main') return;
    const bb = getBB(env, bb0), { sc, ctx } = env, u = U(env);
    const o = outE(env); if (o <= 0.003 || env.lt < 0) return;
    const S = J.clamp(Math.min(env.W, env.H) * 0.042, 28 * u, 52 * u), fs = S * 0.85, font = monoF(env);
    const base = 1000 + J.h(P.seed, 5) % 90000, tLike = 0.45;
    const inc = t => t < tLike ? 0 : 1 + Math.floor(Math.max(0, t - tLike - 0.4) / 0.38) * (1 + J.h(P.seed, 6) % 3);
    const fmt = n => n.toLocaleString('en-US');
    const txtMax = fmt(base + inc(env.cut.dur)), w = S * 2.4 + textW(txtMax, font, fs, 0.04) + 10 * u, h = S * 2.4;
    const sp = spot(env, bb, w, h, P, 20 * u), a = o * (sp.ok ? 1 : 0.35), ac = ACC(env);
    const hx = sp.x + S * 1.2, hy = sp.cy;
    const liked = J.clamp((env.lt - tLike) / 0.3), pop = liked > 0 ? 1 + 0.35 * Math.sin(Math.PI * J.clamp(liked * 1.4)) : E.outBack(J.clamp(env.lt / 0.3), 1.6);
    const hp = heartPts(hx, hy + S * 0.05, S * pop);
    if (liked > 0) polys(env, [hp], ac, a);
    stroke(env, hp.concat([hp[0]]), liked > 0 ? ac : sc.fg, Math.max(1.4, 2 * u), a, false, { join: 'round' });
    if (liked > 0 && liked < 1) {
      env.circle(hx, hy, S * (0.6 + 0.8 * liked), null, ac, 2 * u * (1 - liked), a * (1 - liked), false);
      const b = []; for (let k = 0; k < 7; k++) { const an = (-90 + k * 360 / 7) * DEG, d0 = S * (0.9 + 0.7 * E.outCubic(liked)); b.push([hx + Math.cos(an) * d0, hy + Math.sin(an) * d0, 2.4 * u * (1 - liked)]); }
      dots(env, b, ac, a);
    }
    // rolling counter: the old value slides up and out as the new one slides in
    const t = env.lt, cur = base + inc(t), prev = base + inc(Math.max(0, t - 0.16));
    const lx = hx + S * 1.25, ly = hy;
    ctx.save(); ctx.beginPath(); ctx.rect(lx - 2 * u, ly - fs * 0.75, w, fs * 1.5); ctx.clip();
    if (cur !== prev) {
      const f = E.outCubic(J.clamp(((t - tLike - 0.4) % 0.38 + 0.38) % 0.38 / 0.16));
      label(env, fmt(prev), lx, ly - fs * 1.2 * f, { size: fs, font, color: sc.fg, alpha: a * (1 - f), track: 0.04 });
      label(env, fmt(cur), lx, ly + fs * 1.2 * (1 - f), { size: fs, font, color: liked > 0 ? ac : sc.fg, alpha: a * f, track: 0.04 });
    } else label(env, fmt(cur), lx, ly, { size: fs, font, color: liked > 0 ? ac : sc.fg, alpha: a * inE(env, 0.3, 0.1), track: 0.04 });
    ctx.restore();
  },
};

/* 再生ボタン — transport controls (prev / play / next); play morphs into pause on a click, with a running time readout */
DEF.mediaControls = {
  name: '再生ボタン', nameEn: 'Play button', tags: ['pop', 'graphic', 'emotional'], w: 0.8, layer: 'front', ae: 'shapes',
  draw(env, bb0, P) {
    if (env.pass !== 'main') return;
    const bb = getBB(env, bb0), { sc } = env, u = U(env);
    const o = outE(env); if (o <= 0.003 || env.lt < 0) return;
    const R = J.clamp(Math.min(env.W, env.H) * 0.04, 28 * u, 52 * u), fs = FS(env) * 0.9, w = R * 6.4, h = R * 2.2 + fs * 1.8;
    const sp = bandSpot(env, bb, w, h, P, 34 * u), a = o * (sp.ok ? 1 : 0.35), ac = ACC(env);
    const cx = sp.cx, cy = sp.y + R * 1.1, e = E.outBack(J.clamp(env.lt / 0.35), 1.6), lw = Math.max(1.2, 1.6 * u);
    const tc = 0.55, m = E.inOutCubic(J.clamp((env.lt - tc) / 0.22));
    env.circle(cx, cy, R * e, null, sc.fg, lw, a, false);
    if (env.lt > tc) { const q = J.clamp((env.lt - tc) / 0.45); env.circle(cx, cy, R * (1 + 0.5 * E.outCubic(q)), null, ac, 2 * u * (1 - q), a * (1 - q), false); }
    const s = R * 0.42 * e;
    const A0 = [[-0.35, -0.5], [0.075, -0.25], [0.075, 0.25], [-0.35, 0.5]], B0 = [[0.075, -0.25], [0.5, 0], [0.5, 0], [0.075, 0.25]];
    const A1 = [[-0.4, -0.5], [-0.12, -0.5], [-0.12, 0.5], [-0.4, 0.5]], B1 = [[0.12, -0.5], [0.4, -0.5], [0.4, 0.5], [0.12, 0.5]];
    const mix = (P0, P1) => P0.map((p, i) => [cx + J.lerp(p[0], P1[i][0], m) * s * 2 + (1 - m) * s * 0.12, cy + J.lerp(p[1], P1[i][1], m) * s * 2]);
    polys(env, [mix(A0, A1), mix(B0, B1)], sc.fg, a);
    const side = (dir, k) => {                              // prev / next glyphs
      const q = E.outBack(J.clamp((env.lt - 0.1 - k * 0.06) / 0.3), 1.6); if (q <= 0) return;
      const x = cx + dir * R * 2.3, ss = R * 0.36 * q;
      polys(env, [[[x - dir * ss * 0.6, cy - ss], [x + dir * ss * 0.9, cy], [x - dir * ss * 0.6, cy + ss]]], sc.fg, a);
      rects(env, [[x + dir * ss * 0.9 - (dir > 0 ? 0 : 2.4 * u), cy - ss, 2.4 * u, ss * 2]], sc.fg, a);
    };
    side(-1, 0); side(1, 1);
    const tot = env.plan && env.plan.duration ? env.plan.duration : 200, t = Math.max(0, env.t || 0);
    const mmss = x => `${Math.floor(x / 60)}:${pad2(x % 60)}`;
    label(env, `${mmss(t)} / ${mmss(tot)}`, cx, cy + R * 1.1 + fs * 1.1, { size: fs, align: 'center', color: sc.sub, alpha: a * inE(env, 0.3, 0.2), track: 0.1 });
  },
};

/* 音量 — a speaker glyph with an ascending stepped volume meter that follows the music */
DEF.volumeBars = {
  name: '音量', nameEn: 'Volume', tags: ['pop', 'glitch', 'graphic'], w: 0.8, layer: 'front', ae: 'waveform',
  draw(env, bb0, P) {
    if (env.pass !== 'main') return;
    const bb = getBB(env, bb0), { sc } = env, u = U(env);
    const o = outE(env); if (o <= 0.003 || env.lt < 0) return;
    const S = J.clamp(Math.min(env.W, env.H) * 0.042, 28 * u, 52 * u), nB = 8, bwid = S * 0.3, gap = S * 0.18, fs = FS(env) * 0.9;
    const w = S * 1.9 + nB * (bwid + gap), h = S * 1.8 + fs * 1.6;
    const sp = spot(env, bb, w, h, P, 22 * u), a = o * (sp.ok ? 1 : 0.35), ac = ACC(env);
    const x0 = sp.x, yb = sp.y + S * 1.6, lw = Math.max(1.2, 1.6 * u);
    const e = E.outBack(J.clamp(env.lt / 0.3), 1.6), cy = yb - S * 0.55;
    // speaker
    polys(env, [[[x0, cy - S * 0.2 * e], [x0 + S * 0.25, cy - S * 0.2 * e], [x0 + S * 0.6, cy - S * 0.48 * e], [x0 + S * 0.6, cy + S * 0.48 * e], [x0 + S * 0.25, cy + S * 0.2 * e], [x0, cy + S * 0.2 * e]]], sc.fg, a);
    const en = env.energy != null ? J.clamp(env.energy * 1.4) : 0.55 + 0.4 * J.noise1(env.ltb * 3, P.seed);
    const lvl = Math.round(J.clamp(en) * nB * E.outCubic(J.clamp((env.lt - 0.15) / 0.5)));
    arcs(env, [[x0 + S * 0.62, cy, S * 0.35, -45 * DEG, 45 * DEG], [x0 + S * 0.62, cy, S * 0.62, -45 * DEG, 45 * DEG]].slice(0, lvl > nB / 2 ? 2 : lvl > 0 ? 1 : 0), sc.fg, lw, a, false, 'round');
    const lit = [], hot = [], off = [];
    for (let i = 0; i < nB; i++) {
      const q = E.outBack(J.clamp((env.lt - 0.05 - i * 0.03) / 0.25), 1.6); if (q <= 0) continue;
      const bh0 = S * (0.3 + 1.3 * (i + 1) / nB) * q, x = x0 + S * 1.5 + i * (bwid + gap);
      (i < lvl ? (i === lvl - 1 ? hot : lit) : off).push([x, yb - bh0, bwid, bh0]);
    }
    rects(env, off, sc.sub, 0.3 * a); rects(env, lit, sc.fg, 0.9 * a); rects(env, hot, ac, a);
    label(env, `VOL ${pad2(lvl)}`, x0, yb + fs * 1.0, { size: fs, alpha: a * inE(env, 0.3, 0.2), track: 0.16 });
  },
};

/* 音符 — eighth / beamed / quarter notes floating up and swaying out of the free space beside the lyric */
DEF.musicNotes = {
  name: '音符', nameEn: 'Musical notes', tags: ['pop', 'emotional', 'calm'], w: 0.8, layer: 'front', ae: 'sparks',
  draw(env, bb0, P) {
    if (env.pass !== 'main') return;
    const bb = getBB(env, bb0), { W, H, sc, ctx } = env, u = U(env);
    const o = outE(env); if (o <= 0.003 || env.lt < 0) return;
    const N = Math.min(10, 5 + (P.n | 0) * 2), S = J.clamp(Math.min(W, H) * 0.036, 24 * u, 44 * u), pad = 26 * u + bh(bb) * 0.15;
    const X0 = bb.x0 - pad, X1 = bb.x1 + pad, Y0 = bb.y0 - pad, Y1 = bb.y1 + pad, per = 2 * (X1 - X0 + Y1 - Y0);
    const cols = [sc.fg, ACC(env), ACC2(env)];
    for (let i = 0; i < N; i++) {
      const r = k => J.r(P.seed, i, k);
      const T = 2.2 + r(1) * 1.2, t = env.ltb - r(2) * 0.8; if (t < 0) continue;
      const cyc = Math.floor(t / T), tau = (t - cyc * T) / T;
      let pt = ((i + J.r(P.seed, i, cyc, 3)) / N) * per, x, y;
      if (pt < X1 - X0) { x = X0 + pt; y = Y0; } else if ((pt -= X1 - X0) < Y1 - Y0) { x = X1; y = Y0 + pt; } else if ((pt -= Y1 - Y0) < X1 - X0) { x = X1 - pt; y = Y1; } else { pt -= X1 - X0; x = X0; y = Y1 - pt; }
      const out = [Math.sign(x - (bb.x0 + bb.x1) / 2) || 1, -1];
      x += out[0] * tau * 40 * u + Math.sin(tau * TAU + i) * 12 * u; y += -tau * 90 * u;
      x = J.clamp(x, S, W - S); y = J.clamp(y, S * 1.5, H - S);
      const al = clearOf(bb, x, y, S * 1.1, 20 * u) * Math.sin(Math.PI * tau) * 1.4; if (al <= 0.02) continue;
      const q = E.outBack(J.clamp(tau * 5), 1.8), s = S * (0.75 + 0.4 * J.r(P.seed, i, cyc, 4)) * q, col = cols[i % 3];
      ctx.save(); ctx.translate(x, y); ctx.rotate((Math.sin(tau * 5 + i) * 14 - 6) * DEG);
      const type = (i + J.h(P.seed, cyc)) % 3, a = o * Math.min(1, al), lw = Math.max(1.2, s * 0.07);
      const head = hx => ellP(hx, 0, s * 0.3, s * 0.21, -22 * DEG, 0, 360, 16);
      if (type === 2) {                                   // beamed pair
        polys(env, [head(-s * 0.35), head(s * 0.45)], col, a);
        segs(env, [[-s * 0.35 + s * 0.26, -s * 0.05, -s * 0.35 + s * 0.26, -s * 1.05], [s * 0.45 + s * 0.26, -s * 0.05, s * 0.45 + s * 0.26, -s * 1.15]], col, lw, a);
        polys(env, [[[-s * 0.09 - lw / 2, -s * 1.05], [s * 0.71 + lw / 2, -s * 1.15], [s * 0.71 + lw / 2, -s * 0.97], [-s * 0.09 - lw / 2, -s * 0.87]]], col, a);
      } else {
        polys(env, [head(0)], col, a);
        segs(env, [[s * 0.26, -s * 0.05, s * 0.26, -s * 1.05]], col, lw, a);
        if (type === 0) stroke(env, bez([s * 0.26, -s * 1.05], [s * 0.3, -s * 0.8], [s * 0.72, -s * 0.72], [s * 0.55, -s * 0.35], 10), col, lw * 1.3, a, false, { cap: 'round' });
      }
      ctx.restore();
    }
  },
};

/* ============================================================ registration */
const SETTLE = ['kamon', 'hanabi', 'chochin', 'shimenawa', 'sensu', 'tsukiKumo', 'namiGashira', 'hexGrid', 'spectrumRing', 'dataColumns', 'spinner', 'headingTape', 'atomOrbit', 'circuit',
  'swatches', 'registration', 'staple', 'paperClip', 'vines', 'cloudPuffs', 'moonPhases', 'zigzagRibbon', 'polkaPatch', 'stripeCircle', 'halfCircles', 'loopArrows', 'starburst', 'tally',
  'progressBar', 'toggleSwitch', 'notifBell', 'likeCounter', 'mediaControls', 'volumeBars', 'musicNotes', 'glyphLock', 'sonarArcs', 'memphis', 'windowChrome'];
for (const k of SETTLE) if (DEF[k]) DEF[k].draw = withSettle(DEF[k].draw);
for (const k of Object.keys(DEF)) J.register('decor', k, DEF[k], PK);
})();
