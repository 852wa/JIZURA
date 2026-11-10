/* JIZURA pack: x2decA — 30 line-work decor parts: frames, markers, measuring and drafting marks that sit around the lyric */
(() => {
'use strict';
const E = J.E;
const P = 'x2decA';
const DEG = J.DEG, TAU = J.TAU, cl = J.clamp, lerp = J.lerp;

/* ============================================================ helpers */
const U = env => Math.min(env.W, env.H) / 1080;                     // 1 at a 1080 short side
const MG = env => Math.min(env.W, env.H) * 0.05;                    // safe margin
const monoF = env => (env.st.fonts.mono && env.st.fonts.mono[0]) || 'mono';
const serifF = env => (env.st.fonts.serif && env.st.fonts.serif[0]) || 'mincho';
const vis = (env, c) => (c && J.contrast(c, env.sc.bg) >= 1.6 ? c : env.sc.fg);
const ACC = env => vis(env, env.sc.accent);
const COL = (env, p) => (p.accent ? ACC(env) : env.sc.fg);
const ein = (t, d = 0.4, delay = 0, ease = E.outExpo) => ease(cl((t - delay) / d));
const mod = (a, n) => ((a % n) + n) % n;
const bw = bb => bb.x1 - bb.x0, bh = bb => bb.y1 - bb.y0;
const hit = (x0, y0, x1, y1, bb, pad = 0) => !(x1 < bb.x0 - pad || x0 > bb.x1 + pad || y1 < bb.y0 - pad || y0 > bb.y1 + pad);

/* lyric bbox: keep the last real one per cut so nothing jumps while the text is hidden or flying out */
const BBC = new WeakMap();
function getBB(env, bb) {
  if (env.pOut > 0 && env.cut && BBC.has(env.cut)) return BBC.get(env.cut);
  if (bb && isFinite(bb.x0 + bb.x1 + bb.y0 + bb.y1) && bb.x1 > bb.x0 && bb.y1 > bb.y0) {
    const b = { x0: Math.max(bb.x0, 0), x1: Math.min(bb.x1, env.W), y0: Math.max(bb.y0, 0), y1: Math.min(bb.y1, env.H) };
    if (b.x1 <= b.x0) { b.x0 = bb.x0; b.x1 = bb.x1; }
    if (b.y1 <= b.y0) { b.y0 = bb.y0; b.y1 = bb.y1; }
    if (env.cut) BBC.set(env.cut, b);
    return b;
  }
  const c = env.cut && BBC.get(env.cut);
  if (c) return c;
  const d = J.centerBB(env, null);
  return { x0: d.x0, x1: d.x1, y0: d.y0, y1: d.y1 };
}
/* padded frame round the lyric, kept on screen */
function frame(env, bb, pad) {
  const m = MG(env) * 0.35;
  const x0 = Math.max(m, bb.x0 - pad), y0 = Math.max(m, bb.y0 - pad), x1 = Math.min(env.W - m, bb.x1 + pad), y1 = Math.min(env.H - m, bb.y1 + pad);
  return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
}
const PAD = (bb, u, k = 1) => (24 * u + Math.min(bw(bb), bh(bb)) * 0.14) * k;
/* "along / across" axes of the lyric: horizontal text → along = x; vertical text → along = y */
function axes(env, bb, forceH) {
  const vert = !forceH && bh(bb) > bw(bb) * 1.25;
  return vert
    ? { vert, L0: bb.y0, L1: bb.y1, C0: bb.x0, C1: bb.x1, AM: env.H, CM: env.W, M: (a, c) => [c, a] }
    : { vert, L0: bb.x0, L1: bb.x1, C0: bb.y0, C1: bb.y1, AM: env.W, CM: env.H, M: (a, c) => [a, c] };
}
/* a free band of height h beside the lyric on the across axis (plus = below / right) */
function sideBand(env, ax, h, plus, gap) {
  const m = MG(env) * 0.5;
  const rp = ax.CM - m - (ax.C1 + gap), rm = ax.C0 - gap - m;
  let s = plus ? 1 : -1;
  if ((s > 0 ? rp : rm) < h) { if ((s > 0 ? rm : rp) >= h) s = -s; else s = rp >= rm ? 1 : -1; }
  const room = Math.max(s > 0 ? rp : rm, 4), hh = Math.min(h, room);
  const edge = s > 0 ? ax.C1 + gap : ax.C0 - gap;
  return { s, room, edge, c: edge + s * hh / 2, h: hh };
}
/* a free w×h box near the lyric or in a screen corner */
function spot(env, bb, w, h, p, gap) {
  const { W, H } = env, m = MG(env) * 0.7, sx = p.right ? 1 : -1, sy = p.low ? 1 : -1;
  const ord = [[sx, sy], [-sx, sy], [sx, -sy], [-sx, -sy]], near = [], cor = [];
  for (const [a, b] of ord) {
    near.push([a > 0 ? bb.x1 + gap : bb.x0 - gap - w, (bb.y0 + bb.y1) / 2 - h / 2]);
    near.push([a > 0 ? bb.x1 - w : bb.x0, b > 0 ? bb.y1 + gap : bb.y0 - gap - h]);
    cor.push([a > 0 ? W - m - w : m, b > 0 ? H - m - h : m]);
  }
  const all = p.corner ? cor.concat(near) : near.concat(cor);
  for (const [x, y] of all) {
    if (x < m - 1 || y < m - 1 || x + w > W - m + 1 || y + h > H - m + 1) continue;
    if (!hit(x, y, x + w, y + h, bb, gap * 0.4)) return { x, y, ok: true };
  }
  return { x: cl(cor[0][0], 0, Math.max(0, W - w)), y: cl(cor[0][1], 0, Math.max(0, H - h)), ok: false };
}

/* ---- drawing (main pass only: the wrapper below returns early in ghost passes) ---- */
function stroke(env, pts, c, lw, a = 1, o) {
  if (a <= 0.003 || !pts || pts.length < 2 || !(lw > 0)) return;
  const ctx = env.ctx; ctx.save();
  ctx.globalAlpha = Math.min(1, a); ctx.strokeStyle = c; ctx.lineWidth = lw;
  ctx.lineCap = (o && o.cap) || 'round'; ctx.lineJoin = (o && o.join) || 'round';
  if (o && o.dash) { ctx.setLineDash(o.dash); ctx.lineDashOffset = o.off || 0; }
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  if (o && o.close) ctx.closePath();
  ctx.stroke(); ctx.restore();
}
function segs(env, list, c, lw, a = 1, cap) {
  if (a <= 0.003 || !list.length || !(lw > 0)) return;
  const ctx = env.ctx; ctx.save();
  ctx.globalAlpha = Math.min(1, a); ctx.strokeStyle = c; ctx.lineWidth = lw; ctx.lineCap = cap || 'butt';
  ctx.beginPath();
  for (const s of list) { ctx.moveTo(s[0], s[1]); ctx.lineTo(s[2], s[3]); }
  ctx.stroke(); ctx.restore();
}
function fillPoly(env, pts, c, a = 1) {
  if (a <= 0.003 || pts.length < 3) return;
  const ctx = env.ctx; ctx.save(); ctx.globalAlpha = Math.min(1, a); ctx.fillStyle = c; ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath(); ctx.fill(); ctx.restore();
}
function dot(env, x, y, r, c, a = 1) {
  if (a <= 0.003 || r <= 0.05) return;
  const ctx = env.ctx; ctx.save(); ctx.globalAlpha = Math.min(1, a); ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); ctx.restore();
}
function ring(env, x, y, r, c, lw, a = 1) {
  if (a <= 0.003 || r <= 0.05) return;
  const ctx = env.ctx; ctx.save(); ctx.globalAlpha = Math.min(1, a); ctx.strokeStyle = c; ctx.lineWidth = lw; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke(); ctx.restore();
}
function label(env, text, x, y, o) {
  o = o || {};
  if ((o.alpha == null ? 1 : o.alpha) <= 0.003) return;
  env.draw({ text: String(text), font: o.font || monoF(env), size: o.size || Math.max(11, 15 * U(env)), align: o.align || 'center', x, y, track: o.track == null ? 0.06 : o.track, color: o.color || env.sc.fg, alpha: o.alpha == null ? 1 : o.alpha, ghost: false, plain: true });
}
/* polyline with cumulative lengths */
function mk(pts, closed) {
  const q = closed ? pts.concat([pts[0]]) : pts, cum = [0];
  for (let i = 1; i < q.length; i++) cum.push(cum[i - 1] + Math.hypot(q[i][0] - q[i - 1][0], q[i][1] - q[i - 1][1]));
  return { pts: q, cum, L: cum[cum.length - 1] || 1e-6 };
}
function at(pa, s) {
  const { pts, cum } = pa; s = cl(s, 0, pa.L);
  let i = 1; while (i < cum.length - 1 && cum[i] < s) i++;
  const d = cum[i] - cum[i - 1] || 1e-6, k = (s - cum[i - 1]) / d;
  return [lerp(pts[i - 1][0], pts[i][0], k), lerp(pts[i - 1][1], pts[i][1], k), Math.atan2(pts[i][1] - pts[i - 1][1], pts[i][0] - pts[i - 1][0])];
}
/* sub-polyline between lengths s0..s1; wrap = the path is closed and s may run past its ends */
function span(pa, s0, s1, wrap) {
  const out = []; if (!(s1 > s0)) return out;
  const { pts, cum, L } = pa;
  if (!wrap) {
    s0 = Math.max(0, s0); s1 = Math.min(L, s1); if (!(s1 > s0)) return out;
    out.push(at(pa, s0));
    for (let i = 0; i < pts.length; i++) if (cum[i] > s0 && cum[i] < s1) out.push(pts[i]);
    out.push(at(pa, s1)); return out;
  }
  if (s1 - s0 >= L) return pts;
  out.push(at(pa, mod(s0, L)));
  for (let k = Math.floor(s0 / L) * L, g = 0; k < s1 && g < 4; k += L, g++) for (let i = 0; i < pts.length - 1; i++) { const v = cum[i] + k; if (v > s0 && v < s1) out.push(pts[i]); }
  out.push(at(pa, mod(s1, L) || (s1 > 0 ? L : 0)));
  return out;
}
/* rounded rectangle as an open list of points, clockwise from the top-left arc */
function rrectPts(x0, y0, x1, y1, r, n = 8) {
  r = Math.max(0, Math.min(r, (x1 - x0) / 2, (y1 - y0) / 2));
  if (r < 0.6) return [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
  const out = [], cs = [[x0 + r, y0 + r, 180], [x1 - r, y0 + r, 270], [x1 - r, y1 - r, 0], [x0 + r, y1 - r, 90]];
  for (const [cx, cy, a0] of cs) for (let i = 0; i <= n; i++) { const a = (a0 + 90 * i / n) * DEG; out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
  return out;
}
const arcPts = (cx, cy, r, a0, a1, n = 24) => { const out = []; for (let i = 0; i <= n; i++) { const a = lerp(a0, a1, i / n); out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } return out; };
const quad = (a, b, c, n = 10) => { const out = []; for (let i = 0; i <= n; i++) { const t = i / n, k = 1 - t; out.push([k * k * a[0] + 2 * k * t * b[0] + t * t * c[0], k * k * a[1] + 2 * k * t * b[1] + t * t * c[1]]); } return out; };

/* registration: every part is main-pass line work that waits until the entrance has mostly settled */
function D(key, name, en, tags, w, ae, fn) {
  J.register('decor', key, {
    name, en, tags, w, ae, layer: 'front',
    draw(env, bb0, p) {
      if (env.pass !== 'main') return;
      const s = cl(((env.cut && env.cut.inDur) || 0) * 0.6, 0, 0.35), t = env.lt - s;
      if (!(t > 0)) return;
      const o = 1 - E.inCubic(env.pOut || 0); if (o <= 0.003) return;
      const q = Object.assign({ n: 1, v: 0, r: 0.5, seed: 1 }, p); q.n = cl(q.n | 0, 1, 3); q.v = q.v | 0;
      fn(env, getBB(env, bb0), q, t, o, U(env));
    },
  }, P);
}

/* ============================================================ frames */

/* 途切れ枠 — a frame drawn on by one pen stroke, broken by 2–4 gaps that keep travelling round it */
D('xlGapFrame', '途切れ枠', 'Gapped Frame', ['graphic', 'editorial', 'calm'], 1.3, 'brackets', (env, bb, p, t, o, u) => {
  const f = frame(env, bb, PAD(bb, u, 1.15)), c = COL(env, p);
  let pts = [[f.x0, f.y0], [f.x1, f.y0], [f.x1, f.y1], [f.x0, f.y1]];
  pts = pts.slice(p.v % 4).concat(pts.slice(0, p.v % 4));
  if (!p.right) pts = [pts[0]].concat(pts.slice(1).reverse());
  const pa = mk(pts, true), k = p.n + 1, e = ein(t, 0.55, 0, E.inOutCubic);
  const cell = pa.L / k, gap = lerp(cell, cl(pa.L * 0.045, 18 * u, 64 * u), o);
  const mv = env.ltb * 26 * u * (0.5 + env.fx.motion);
  stroke(env, e >= 1 ? pa.pts : span(pa, 0, pa.L * e), c, 3 * u, Math.min(1, o * 1.6), { dash: [Math.max(0.01, cell - gap), gap], off: -mv, cap: 'butt', join: 'miter' });
  if (p.big) {
    const d = 9 * u, pb = mk(pts.map(q => [q[0] + (q[0] < f.cx ? -d : d), q[1] + (q[1] < f.cy ? -d : d)]), true), e2 = ein(t, 0.55, 0.15, E.inOutCubic);
    stroke(env, e2 >= 1 ? pb.pts : span(pb, 0, pb.L * e2), env.sc.sub, 1.1 * u, 0.7 * o, { dash: [Math.max(0.01, pb.L / k - gap), gap], off: mv + pb.L / k / 2, cap: 'butt', join: 'miter' });
  }
});

/* 巡る角 — one or two corner marks that hop from corner to corner along the frame, bending round each corner */
D('xlHopCorners', '巡る角', 'Hopping Corners', ['graphic', 'pop', 'glitch'], 1, 'brackets', (env, bb, p, t, o, u) => {
  const f = frame(env, bb, PAD(bb, u)), c = COL(env, p);
  const pa = mk([[f.x0, f.y0], [f.x1, f.y0], [f.x1, f.y1], [f.x0, f.y1]], true), S = pa.cum;
  const T = 0.85, k = Math.floor(t / T), fr = E.inOutCubic(cl((t - k * T) / 0.4)) * (env.fx.motion > 0.05 ? 1 : 0), dir = p.right ? 1 : -1;
  const arm = (Math.min(f.w, f.h) * 0.2 + 10 * u) * ein(t, 0.35) * (1 + 0.7 * Math.sin(Math.PI * fr)) * o;
  for (let j = 0; j < (p.n >= 2 ? 2 : 1); j++) {
    const a = mod((env.fx.motion > 0.05 ? k : 0) * dir + j * 2 + p.v, 4);
    const sA = S[a], len = dir > 0 ? S[a + 1] - S[a] : S[mod(a - 1, 4) + 1] - S[mod(a - 1, 4)];
    const s = sA + dir * len * fr;
    stroke(env, span(pa, s - arm, s + arm, true), c, 3.6 * u, 1, { cap: 'butt', join: 'miter' });
  }
  for (let i = 0; i < 4; i++) dot(env, pa.pts[i][0], pa.pts[i][1], 2.4 * u, env.sc.sub, 0.7 * o * ein(t, 0.3, i * 0.05));
});

/* 下描き枠 — a pencil-sketched box: four overshooting strokes gone over twice, lightly boiling */
D('xlSketchBox', '下描き枠', 'Sketch Box', ['pop', 'emotional', 'editorial'], 1, 'brackets', (env, bb, p, t, o, u) => {
  const f = frame(env, bb, PAD(bb, u, 1.1)), c = COL(env, p), boil = Math.floor(t * 4), sd = p.seed;
  const ed = [[f.x0, f.y0, f.x1, f.y0], [f.x1, f.y0, f.x1, f.y1], [f.x1, f.y1, f.x0, f.y1], [f.x0, f.y1, f.x0, f.y0]];
  for (let ps = 0; ps < 2; ps++) for (let k = 0; k < 4; k++) {
    const e = ein(t, 0.24, k * 0.12 + ps * 0.5, E.inOutCubic); if (e <= 0) continue;
    const [ax, ay, bx, by] = ed[k], L = Math.hypot(bx - ax, by - ay) || 1, dx = (bx - ax) / L, dy = (by - ay) / L, nx = -dy, ny = dx;
    const o0 = (6 + 14 * J.r(sd, k, ps, 1)) * u, o1 = (6 + 14 * J.r(sd, k, ps, 2)) * u, pts = [];
    for (let i = 0; i <= 6; i++) {
      const s = i / 6, a = -o0 + (L + o0 + o1) * s;
      const j = (J.rs(sd, k, ps, i, 3) * 2.6 + J.rs(sd, k, ps, i, boil, 4) * 1.1 * env.fx.motion + (ps ? 3 : -1) * Math.sin(s * Math.PI) + J.rs(sd, k, ps, 5) * 4 * (s - 0.5)) * u;
      pts.push([ax + dx * a + nx * j, ay + dy * a + ny * j]);
    }
    const pa = mk(pts);
    stroke(env, span(pa, pa.L * (1 - o), pa.L * e), c, (ps ? 1.8 : 2.8) * u, (ps ? 0.6 : 0.95) * Math.min(1, o * 2));
  }
});

/* 破線トラック — a dashed racetrack (stadium) round the lyric with a start line and a runner lapping it */
D('xlDashTrack', '破線トラック', 'Dashed Track', ['pop', 'graphic'], 0.9, 'dots', (env, bb, p, t, o, u) => {
  const f = frame(env, bb, PAD(bb, u, 1.7)), dir = p.right ? 1 : -1;
  const pa = mk(rrectPts(f.x0, f.y0, f.x1, f.y1, Math.min(f.w, f.h) / 2, 10), true), e = ein(t, 0.6, 0, E.inOutCubic);
  stroke(env, e >= 1 ? pa.pts : span(pa, 0, pa.L * e), env.sc.fg, 2.2 * u, 0.9 * o, { dash: [11 * u, 8 * u], cap: 'butt' });
  const s0 = pa.L * 0.07, st = at(pa, s0), nx = -Math.sin(st[2]), ny = Math.cos(st[2]), g = ein(t, 0.25, 0.1) * 11 * u;
  segs(env, [[st[0] - nx * g, st[1] - ny * g, st[0] + nx * g, st[1] + ny * g], [st[0] - nx * g + Math.cos(st[2]) * 4 * u, st[1] - ny * g + Math.sin(st[2]) * 4 * u, st[0] + nx * g + Math.cos(st[2]) * 4 * u, st[1] + ny * g + Math.sin(st[2]) * 4 * u]], env.sc.fg, 1.6 * u, o);
  const ra = ein(t, 0.25, 0.45) * o; if (ra <= 0) return;
  const s = s0 + dir * Math.max(0, t - 0.45) * (90 + 160 * env.fx.motion) * u, q = at(pa, mod(s, pa.L)), c = ACC(env);
  stroke(env, span(pa, Math.min(s, s - dir * 80 * u), Math.max(s, s - dir * 80 * u), true), c, 4 * u, ra, { cap: 'butt' });
  const an = q[2] + (dir < 0 ? Math.PI : 0), r = 13 * u;
  fillPoly(env, [0, 2.5, -2.5].map(k => [q[0] + Math.cos(an + k) * r * (k ? 0.9 : 1.3), q[1] + Math.sin(an + k) * r * (k ? 0.9 : 1.3)]), c, ra);
});

/* 吹き出し線 — the lyric inside a hand-lettered speech balloon outline with a tail (or thought bubbles) */
D('xlBubbleLine', '吹き出し線', 'Speech Outline', ['pop', 'emotional'], 0.8, 'brackets', (env, bb, p, t, o, u) => {
  const pop = lerp(0.9, 1, E.outBack(cl(t / 0.4), 2)), f0 = frame(env, bb, PAD(bb, u, 1.5)), c = COL(env, p), m = MG(env) * 0.35;
  const f = { x0: f0.cx - f0.w / 2 * pop, x1: f0.cx + f0.w / 2 * pop, y0: f0.cy - f0.h / 2 * pop, y1: f0.cy + f0.h / 2 * pop };
  const r = Math.min(f0.h * 0.38, 44 * u, f0.w / 2), rb = env.H - m - f0.y1, rt = f0.y0 - m;
  let side = p.low ? (rb >= 22 * u ? 1 : rt >= 22 * u ? -1 : 0) : (rt >= 22 * u ? -1 : rb >= 22 * u ? 1 : 0);
  let tw = Math.min(46 * u, (f0.w - 2 * r) * 0.6); if (tw < 10 * u) side = 0;
  const tl = Math.min((side > 0 ? rb : rt) * 0.8, 64 * u), tx = cl(f0.cx + (p.right ? 0.2 : -0.2) * f0.w, f.x0 + r + tw / 2, f.x1 - r - tw / 2), sk = (p.right ? 1 : -1) * 26 * u;
  const thought = p.v % 2 === 1, C = (cx, cy, a0) => arcPts(cx, cy, r, a0 * DEG, (a0 + 90) * DEG, 8);
  let pts = C(f.x0 + r, f.y0 + r, 180);
  if (side < 0 && !thought) pts.push([tx - tw / 2, f.y0], [tx + sk, f.y0 - tl], [tx + tw / 2, f.y0]);
  pts = pts.concat(C(f.x1 - r, f.y0 + r, 270), C(f.x1 - r, f.y1 - r, 0));
  if (side > 0 && !thought) pts.push([tx + tw / 2, f.y1], [tx + sk, f.y1 + tl], [tx - tw / 2, f.y1]);
  pts = pts.concat(C(f.x0 + r, f.y1 - r, 90));
  const pa = mk(pts, true), e = ein(t, 0.55, 0, E.inOutCubic);
  stroke(env, e >= 1 ? pa.pts : span(pa, 0, pa.L * e), c, 3.2 * u, Math.min(1, o * 1.5), { join: 'round' });
  if (thought && side) {
    const y = side > 0 ? f.y1 : f.y0;
    [[0.28, 13], [0.66, 8.5], [1, 5]].forEach(([k, rr], i) => ring(env, tx + sk * k * 1.4, y + side * tl * k, rr * u * E.outBack(cl((t - 0.35 - i * 0.1) / 0.25), 2), c, 2.2 * u, o));
  }
});

/* 変形ハンドル — a design-tool transform box dragged open from one corner: marching ants, eight handles, a rotate stalk and a size readout */
D('xlTransformBox', '変形ハンドル', 'Transform Box', ['graphic', 'editorial', 'glitch'], 0.9, 'brackets', (env, bb, p, t, o, u) => {
  const f = frame(env, bb, PAD(bb, u)), e = ein(t, 0.5), sc = env.sc, m = MG(env) * 0.35;
  const x0 = f.x0, y0 = f.y0, x1 = lerp(f.x0 + 24 * u, f.x1, e), y1 = lerp(f.y0 + 24 * u, f.y1, e), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  stroke(env, [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], sc.fg, 1.6 * u, 0.9 * o, { dash: [7 * u, 5 * u], off: -env.ltb * 18 * u, close: true, cap: 'butt', join: 'miter' });
  const hs = 6 * u, ha = ein(t, 0.2, 0.1) * o, ctx = env.ctx;
  ctx.save(); ctx.globalAlpha = ha; ctx.lineWidth = 1.5 * u;
  for (const [hx, hy] of [[x0, y0], [cx, y0], [x1, y0], [x1, cy], [x1, y1], [cx, y1], [x0, y1], [x0, cy]]) {
    ctx.fillStyle = sc.bg; ctx.fillRect(hx - hs, hy - hs, hs * 2, hs * 2); ctx.strokeStyle = sc.fg; ctx.strokeRect(hx - hs, hy - hs, hs * 2, hs * 2);
  }
  ctx.restore();
  const up = y0 - 34 * u > m, ry = up ? y0 - 28 * u * e : y1 + 28 * u * e;
  segs(env, [[cx, up ? y0 - hs : y1 + hs, cx, ry]], sc.fg, 1.2 * u, ha);
  ring(env, cx, ry, 5 * u, ACC(env), 1.8 * u, ha);
  const below = y1 + 30 * u < env.H - m;
  label(env, `${Math.round(x1 - x0)} × ${Math.round(y1 - y0)}`, x1, below ? y1 + 18 * u : y0 - 18 * u, { align: 'right', size: Math.max(11, 16 * u), color: p.accent ? ACC(env) : sc.sub, alpha: ein(t, 0.3, 0.15) * o });
  const ca = (1 - ein(t, 0.3, 0.55, E.inCubic)) * o;                        // the dragging cursor
  if (ca > 0.01) fillPoly(env, [[x1 + 4 * u, y1 + 4 * u], [x1 + 4 * u, y1 + 24 * u], [x1 + 9.5 * u, y1 + 18.5 * u], [x1 + 18 * u, y1 + 18 * u]], sc.fg, ca);
});

/* ピント枠 — autofocus corners with rounded bends that hunt in and out, then lock with a confirm dot */
D('xlFocusHunt', 'ピント枠', 'Focus Hunt', ['graphic', 'calm', 'emotional'], 1, 'brackets', (env, bb, p, t, o, u) => {
  const f = frame(env, bb, PAD(bb, u, 1.35)), a = ein(t, 0.25, 0, E.outCubic) * o;
  const hunt = 1 + (0.2 * Math.exp(-t * 4.5) * Math.cos(t * 15) + 0.3 * (1 - ein(t, 0.3))) * (0.35 + 0.65 * env.fx.motion);
  const hw = f.w / 2 * hunt, hh = f.h / 2 * hunt, rr = cl(Math.min(f.w, f.h) * 0.24, 12 * u, 48 * u), lock = t > 0.78;
  const c = lock ? ACC(env) : env.sc.fg, lw = 2.8 * u, ctx = env.ctx;
  ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = c; ctx.lineWidth = lw; ctx.lineCap = 'butt'; ctx.beginPath();
  [[-1, -1, 180], [1, -1, 270], [1, 1, 0], [-1, 1, 90]].forEach(([sx, sy, a0]) => { const cx = f.cx + sx * (hw - rr), cy = f.cy + sy * (hh - rr); ctx.moveTo(cx + Math.cos(a0 * DEG) * rr, cy + Math.sin(a0 * DEG) * rr); ctx.arc(cx, cy, rr, a0 * DEG, (a0 + 90) * DEG); });
  ctx.stroke(); ctx.restore();
  const tk = 9 * u;
  segs(env, [[f.cx, f.cy - hh, f.cx, f.cy - hh - tk], [f.cx, f.cy + hh, f.cx, f.cy + hh + tk], [f.cx - hw, f.cy, f.cx - hw - tk, f.cy], [f.cx + hw, f.cy, f.cx + hw + tk, f.cy]], c, 1.4 * u, a);
  if (lock) {
    const bl = t < 1.25 ? (Math.floor((t - 0.78) * 10) % 2 === 0 ? 1 : 0.2) : 1;
    const dx = cl((p.right ? f.cx + hw + 14 * u : f.cx - hw - 14 * u), 8 * u, env.W - 8 * u);
    dot(env, dx, f.cy + (p.low ? 1 : -1) * (hh - rr * 0.4), 5.5 * u, c, bl * o);
  }
});

/* ============================================================ brackets */

/* 波括弧 — large curly braces that unfurl from their cusps at both ends of the lyric */
D('xlCurlyBrace', '波括弧', 'Curly Braces', ['editorial', 'pop', 'graphic'], 1.1, 'brackets', (env, bb, p, t, o, u) => {
  const ax = axes(env, bb), c = COL(env, p), m = MG(env) * 0.3;
  const c0 = ax.C0 - 8 * u, c1 = ax.C1 + 8 * u, sp = c1 - c0, mid = (c0 + c1) / 2, g = 22 * u;
  const e = ein(t, 0.55), ea = Math.min(e, o);
  for (const sd of [-1, 1]) {
    const base = sd < 0 ? ax.L0 - g : ax.L1 + g, room = sd < 0 ? base - m : ax.AM - m - base;
    const d = Math.min(cl(sp * 0.13, 10 * u, 38 * u), Math.max(5 * u, room / 2)), q = Math.min(d * 1.4, sp / 4);
    const sl = (1 - e) * 36 * u, X = x => base + sd * (x + sl);
    const raw = quad([X(0), c0], [X(d), c0], [X(d), c0 + q], 6).concat(quad([X(d), mid - q], [X(d), mid], [X(2 * d), mid], 6), quad([X(2 * d), mid], [X(d), mid], [X(d), mid + q], 6), quad([X(d), c1 - q], [X(d), c1], [X(0), c1], 6));
    const pa = mk(raw.map(v => ax.M(v[0], v[1])));
    stroke(env, span(pa, pa.L * (0.5 - ea / 2), pa.L * (0.5 + ea / 2)), c, (p.big ? 4 : 3) * u, Math.min(1, o * 2));
  }
});

/* 重ね括弧 — three nested square brackets on each side, fanning outward, a pulse running through them */
D('xlNestBracket', '重ね括弧', 'Nested Brackets', ['graphic', 'glitch', 'pop'], 1, 'brackets', (env, bb, p, t, o, u) => {
  const ax = axes(env, bb), c = COL(env, p), mid = (ax.C0 + ax.C1) / 2, sp = ax.C1 - ax.C0, m = MG(env) * 0.3;
  for (const sd of [-1, 1]) for (let k = 0; k < 3; k++) {
    const e = ein(t, 0.4, k * 0.07); if (e <= 0) continue;
    const a = cl((sd < 0 ? ax.L0 : ax.L1) + sd * (28 * u + k * 18 * u + (1 - e) * 60 * u + (1 - o) * 30 * u), m, ax.AM - m);
    const hk = sp * (1 - k * 0.2) / 2 + 8 * u, arm = 14 * u;
    const pulse = Math.pow(Math.max(0, Math.sin(t * 3.4 - k * 0.9)), 2);
    stroke(env, [[a - sd * arm, mid - hk], [a, mid - hk], [a, mid + hk], [a - sd * arm, mid + hk]].map(v => ax.M(v[0], v[1])), c, (4.6 - k * 1.2) * u, e * o * (0.5 + 0.5 * pulse), { cap: 'butt', join: 'miter' });
  }
});

/* 反復記号 — musical repeat signs: thick + thin bar lines and two dots enclosing the lyric */
D('xlRepeatBars', '反復記号', 'Repeat Bars', ['pop', 'editorial', 'emotional'], 1, 'brackets', (env, bb, p, t, o, u) => {
  const ax = axes(env, bb), c = COL(env, p), mid = (ax.C0 + ax.C1) / 2, sp = ax.C1 - ax.C0, hh = sp / 2 + 8 * u, m = MG(env) * 0.3;
  const bt = env.beat ? Math.exp(-env.beat.since * 8) : Math.pow(Math.max(0, Math.sin(t * 5)), 6) * 0.6;
  for (const sd of [-1, 1]) {
    const base = sd < 0 ? ax.L0 : ax.L1, X = d => cl(base + sd * d * u, m, ax.AM - m);
    const e1 = ein(t, 0.35, 0.05) * o, e2 = ein(t, 0.35, 0.15) * o, ed = E.outBack(cl((t - 0.3) / 0.25), 2.5) * o;
    segs(env, [[...ax.M(X(38), mid - hh * e1), ...ax.M(X(38), mid + hh * e1)]], c, 2.2 * u, 1);
    segs(env, [[...ax.M(X(52), mid - hh * e2), ...ax.M(X(52), mid + hh * e2)]], c, 9 * u, 1);
    for (const dy of [-1, 1]) { const q = ax.M(X(20), mid + dy * Math.max(10 * u, sp * 0.14)); dot(env, q[0], q[1], 6 * u * ed * (1 + 0.4 * bt * env.fx.motion), ACC(env), 1); }
  }
});

/* ============================================================ rules, underlines, overlines */

/* 太細罫 — thick-and-thin "Oxford" rules above and below: the thick ones open from the centre, the thin ones run in from opposite ends */
D('xlDoubleRule', '太細罫', 'Oxford Rules', ['editorial', 'calm', 'emotional'], 1.3, 'bars', (env, bb, p, t, o, u) => {
  const ax = axes(env, bb), c = COL(env, p), m = MG(env) * 0.4;
  const ext = 26 * u + (p.big ? (ax.L1 - ax.L0) * 0.1 : 0), a0 = Math.max(m, ax.L0 - ext), a1 = Math.min(ax.AM - m, ax.L1 + ext), am = (a0 + a1) / 2;
  const g = 16 * u + (ax.C1 - ax.C0) * 0.1, sep = 10 * u, v = p.v % 3;
  const cT = Math.max(m + sep, ax.C0 - g), cB = Math.min(ax.CM - m - sep, ax.C1 + g);
  const e1 = ein(t, 0.5) * o, e2 = ein(t, 0.5, 0.12, E.inOutCubic), k = v === 1 ? 0.5 : 1;
  const S = (x0, c0, x1) => [...ax.M(x0, c0), ...ax.M(x1, c0)];
  segs(env, [S(am - (am - a0) * e1 * k, cT - sep, am + (a1 - am) * e1 * k), S(am - (am - a0) * e1 * k, cB + sep, am + (a1 - am) * e1 * k)], c, 7 * u, 1);
  segs(env, [S(lerp(a0, a1, 1 - o), cT, lerp(a0, a1, e2)), S(lerp(a1, a0, 1 - o), cB, lerp(a1, a0, e2))], c, 1.8 * u, o);
  if (v === 2) for (const [a, cc] of [[a0, cT], [a1, cT], [a0, cB], [a1, cB]]) {
    const q = ax.M(a, cc), r = 5 * u * E.outBack(cl((t - 0.45) / 0.25), 2) * o;
    fillPoly(env, [[q[0] - r, q[1]], [q[0], q[1] - r], [q[0] + r, q[1]], [q[0], q[1] + r]], ACC(env), 1);
  }
});

/* 往復矢印 — an arrow shoots along under the lyric, a second one answers above in the opposite direction */
D('xlArrowRules', '往復矢印', 'Return Arrows', ['graphic', 'pop', 'editorial'], 1, 'arrows', (env, bb, p, t, o, u) => {
  const ax = axes(env, bb), c = COL(env, p), m = MG(env) * 0.5, g = 22 * u + (ax.C1 - ax.C0) * 0.08;
  const a0 = Math.max(m, ax.L0 - 30 * u), a1 = Math.min(ax.AM - m, ax.L1 + 30 * u), fl = p.right ? 1 : -1, one = p.v % 3 === 2;
  const rows = [[Math.min(ax.CM - m, ax.C1 + g), fl, 0], [Math.max(m, ax.C0 - g), -fl, 0.2]];
  for (const [cc, dir, dl] of one ? [rows[p.low ? 0 : 1]] : rows) {
    const e = ein(t, 0.5, dl); if (e <= 0) continue;
    const from = dir > 0 ? a0 : a1, to = dir > 0 ? a1 : a0, hd = lerp(from, to, e), tl = lerp(hd, from, o), hs = 20 * u * Math.min(1, e * 3);
    const H = ax.M(hd, cc), T = ax.M(tl, cc), w1 = ax.M(hd - dir * hs, cc - hs * 0.62), w2 = ax.M(hd - dir * hs, cc + hs * 0.62);
    segs(env, [[T[0], T[1], H[0], H[1]]], c, 3 * u, o);
    stroke(env, [w1, H, w2], c, 3 * u, o, { join: 'miter', cap: 'butt' });
    const b1 = ax.M(tl, cc - 10 * u), b2 = ax.M(tl, cc + 10 * u);
    segs(env, [[b1[0], b1[1], b2[0], b2[1]]], c, 3 * u, o);
    if (one) { const d1 = ax.M(tl, cc + 7 * u * (p.low ? 1 : -1)), d2 = ax.M(hd - dir * hs, cc + 7 * u * (p.low ? 1 : -1)); segs(env, [[d1[0], d1[1], d2[0], d2[1]]], c, 1.2 * u, o * 0.8); }
  }
});

/* クレッシェンド — a musical hairpin opening (or closing) along the lyric, with p / f at its ends */
D('xlHairpin', 'クレッシェンド', 'Hairpin', ['emotional', 'calm', 'editorial'], 0.9, 'arrows', (env, bb, p, t, o, u) => {
  const ax = axes(env, bb), c = COL(env, p), len = ax.L1 - ax.L0, m = MG(env) * 0.5;
  const hp = cl(len * 0.07, 30 * u, 84 * u), b = sideBand(env, ax, hp + 8 * u, !ax.vert || !!p.low, 18 * u + (ax.C1 - ax.C0) * 0.06);
  const dec = p.v % 2 === 1, e = ein(t, 0.65, 0, E.outCubic), open = Math.max(4 * u, Math.min(hp, b.h - 6 * u)) / 2 * (0.88 + 0.12 * Math.sin(t * 2.2) * env.fx.motion);
  const A = dec ? ax.L1 : ax.L0, B = dec ? ax.L0 : ax.L1, x = lerp(A, B, e), xs = lerp(A, B, 1 - o);
  const S = (x0, c0, x1, c1) => [...ax.M(x0, c0), ...ax.M(x1, c1)];
  segs(env, [S(xs, b.c - open * (1 - o), x, b.c - open * e), S(xs, b.c + open * (1 - o), x, b.c + open * e)], c, 2.6 * u, Math.min(1, o * 2), 'round');
  const fs = Math.max(16, 30 * u), la = ein(t, 0.3, 0.35) * o;
  if (ax.L0 - fs * 1.4 > m) { const q = ax.M(ax.L0 - fs * 0.8, b.c); label(env, dec ? 'f' : 'p', q[0], q[1], { font: serifF(env), size: fs, color: c, alpha: la, track: 0 }); }
  if (ax.L1 + fs * 1.4 < ax.AM - m) { const q = ax.M(ax.L1 + fs * 0.8, b.c); label(env, dec ? 'p' : 'f', q[0], q[1], { font: serifF(env), size: fs, color: c, alpha: la, track: 0 }); }
});

/* スラー — a tapered slur arc swept over the lyric from its first glyph to its last */
D('xlSlur', 'スラー', 'Slur Arc', ['emotional', 'calm', 'pop'], 1, 'waveform', (env, bb, p, t, o, u) => {
  const ax = axes(env, bb), c = COL(env, p), len = ax.L1 - ax.L0, hs = cl(len * 0.07, 16 * u, 56 * u), dash = p.v % 2 === 1;
  const sides = p.big ? [false, true] : [!!p.low];
  sides.forEach((plus, si) => {
    const b = sideBand(env, ax, hs + 6 * u, plus, 10 * u + (ax.C1 - ax.C0) * 0.05); if (si && b.s !== (plus ? 1 : -1)) return;
    const h = Math.min(hs, b.h), a0 = ax.L0 + len * 0.03, a1 = ax.L1 - len * 0.03, e = ein(t, 0.6, si * 0.15, E.inOutCubic), n = 28, th = 7 * u;
    const s0 = si ? 1 - e : (1 - o), s1 = si ? 1 - (1 - o) : e; if (s1 <= s0) return;
    const out = [], inn = [];
    for (let i = 0; i <= n; i++) { const s = lerp(s0, s1, i / n), y = 4 * s * (1 - s); out.push(ax.M(lerp(a0, a1, s), b.edge + b.s * h * y)); inn.push(ax.M(lerp(a0, a1, s), b.edge + b.s * (h * y - th * Math.sin(Math.PI * s)))); }
    if (dash) stroke(env, out, c, 2.8 * u, o, { dash: [12 * u, 8 * u], cap: 'butt' });
    else { fillPoly(env, out.concat(inn.reverse()), c, Math.min(1, o * 2)); stroke(env, out, c, 1 * u, Math.min(1, o * 2)); }
  });
});

/* はしご罫 — a ladder rule: two rails with rungs laid one by one, one lit rung climbing along it */
D('xlLadder', 'はしご罫', 'Ladder Rule', ['graphic', 'glitch', 'editorial'], 0.8, 'grid', (env, bb, p, t, o, u) => {
  const ax = axes(env, bb), b = sideBand(env, ax, 26 * u, !!p.low, 16 * u + (ax.C1 - ax.C0) * 0.08), m = MG(env) * 0.5;
  const a0 = Math.max(m, ax.L0 - 10 * u), a1 = Math.min(ax.AM - m, ax.L1 + 10 * u), hw = Math.min(12 * u, b.h / 2), e = ein(t, 0.6, 0, E.outCubic);
  const step = Math.max(26 * u, (a1 - a0) / 110), n = Math.max(1, Math.floor((a1 - a0) / step)), st = (a1 - a0) / n, dir = p.right ? -1 : 1;
  const x0 = dir > 0 ? a0 : a1, xe = x0 + dir * (a1 - a0) * e, xo = x0 + dir * (a1 - a0) * (1 - o);
  const S = (x, c0, x2, c1) => [...ax.M(x, c0), ...ax.M(x2, c1)];
  segs(env, [S(xo, b.c - hw, xe, b.c - hw), S(xo, b.c + hw, xe, b.c + hw)], env.sc.fg, 2 * u, 0.9 * o);
  const list = [], lit = Math.floor(t * (5 + 8 * env.fx.motion)) % (n + 1);
  for (let i = 0; i <= n; i++) { if (i / n > e || i / n < 1 - o) continue; const x = x0 + dir * i * st; list.push(S(x, b.c - hw, x, b.c + hw)); }
  segs(env, list, env.sc.fg, 1.6 * u, 0.8 * o);
  for (let k = 0; k < 3; k++) { const i = lit - k; if (i < 0 || i / n > e) continue; const x = x0 + dir * i * st; segs(env, [S(x, b.c - hw - 3 * u, x, b.c + hw + 3 * u)], COL(env, { accent: true }), 4 * u, o * (1 - k * 0.35)); }
});

/* 翼の線 — feathered stacks of parallel lines shooting out from both ends of the lyric like wings */
D('xlWingLines', '翼の線', 'Wing Lines', ['pop', 'emotional', 'graphic'], 1, 'slash', (env, bb, p, t, o, u) => {
  const ax = axes(env, bb), c = COL(env, p), m = MG(env) * 0.5, mid = (ax.C0 + ax.C1) / 2, sp = ax.C1 - ax.C0, len = ax.L1 - ax.L0;
  const K = 5, gc = cl(sp / 6, 9 * u, 22 * u), sym = p.v % 2 === 1;
  for (const sd of [-1, 1]) {
    const base = (sd < 0 ? ax.L0 : ax.L1) + sd * 16 * u, room = sd < 0 ? base - m : ax.AM - m - base;
    const Lm = Math.min(room, len * 0.25 + 70 * u, 260 * u); if (Lm < 22 * u) continue;
    const list = [];
    for (let i = 0; i < K; i++) {
      const e = ein(t, 0.45, i * 0.05); if (e <= 0) continue;
      const f = sym ? 1 - Math.abs(i - 2) * 0.3 : 1 - i * 0.17;
      const L = Lm * f * (1 + 0.07 * Math.sin(t * 3 - i * 0.7) * env.fx.motion), cc = mid + (i - 2) * gc, hd = base + sd * L * e, tl = lerp(hd, base, o);
      list.push([i, [...ax.M(tl, cc), ...ax.M(hd, cc)]]);
    }
    for (const [i, s] of list) segs(env, [s], i === (sym ? 2 : 0) && p.accent ? ACC(env) : c, (sym ? 4 - Math.abs(i - 2) * 0.8 : 4.2 - i * 0.55) * u, Math.min(1, o * 2), 'round');
  }
});

/* ============================================================ measuring & drafting */

/* ノギス — a vernier caliper: a graduated beam, a fixed jaw and a sliding jaw that closes on the lyric's width */
D('xlCaliper', 'ノギス', 'Caliper', ['graphic', 'editorial'], 0.8, 'leaders', (env, bb, p, t, o, u) => {
  const ax = axes(env, bb), m = MG(env) * 0.45, hB = 22 * u, c = env.sc.fg, len = ax.L1 - ax.L0, sp = ax.C1 - ax.C0, M = ax.M;
  const b = sideBand(env, ax, hB + 36 * u, !!p.low, 18 * u + sp * 0.06), s = b.s, ci = b.edge, co = b.edge + s * hB;
  const jl = 18 * u + sp * 0.06 + Math.min(sp * 0.45, 80 * u), a = ein(t, 0.3, 0, E.outCubic) * o, sw = 44 * u;
  const xa = Math.max(m + 14 * u, ax.L0 - 10 * u), xbT = Math.min(ax.AM - m - sw, ax.L1 + 10 * u);
  const xb = lerp(Math.min(ax.AM - m - sw, xbT + Math.max(140 * u, len * 0.35)), xbT, E.outBack(cl((t - 0.15) / 0.55), 1.1));
  const X0 = xa - 14 * u, X1 = lerp(X0, Math.min(ax.AM - m, xbT + 110 * u), ein(t, 0.45));
  stroke(env, [M(X1, ci), M(X0, ci), M(X0, co), M(X1, co), M(X1, ci)], c, 1.8 * u, a, { join: 'miter', cap: 'butt' });
  const tk = [];
  for (let i = 0, x = xa; x < X1 - 2 * u && i < 240; i++, x += 11 * u) tk.push([...M(x, ci), ...M(x, ci + s * (i % 5 ? 6 : 12) * u)]);
  segs(env, tk, c, 1.2 * u, 0.8 * a);
  const jaw = (x, d) => [M(x - d * 13 * u, ci), M(x - d * 13 * u, ci - s * jl * 0.55), M(x, ci - s * jl), M(x, ci)];
  stroke(env, jaw(xa, 1), c, 2.4 * u, a, { join: 'miter' });
  stroke(env, jaw(xb, -1), ACC(env), 2.4 * u, a, { join: 'miter' });
  stroke(env, [M(xb, ci - 4 * u * s), M(xb + sw, ci - 4 * u * s), M(xb + sw, co + 4 * u * s), M(xb, co + 4 * u * s)], ACC(env), 2.4 * u, a, { close: true, join: 'miter' });
  const vt = []; for (let i = 1; i < 6; i++) vt.push([...M(xb + i * 7 * u, co + 4 * u * s), ...M(xb + i * 7 * u, co - s * 5 * u)]);
  segs(env, vt, ACC(env), 1.2 * u, a);
  const lp = M(xb + sw / 2, co + s * 22 * u);
  label(env, ((xb - xa) / 10).toFixed(1), lp[0], lp[1], { size: Math.max(11, 16 * u), color: p.accent ? ACC(env) : c, alpha: ein(t, 0.3, 0.3) * o });
});

/* 分度器 — a half-disc protractor standing on the lyric: the scale sweeps on and a needle swings to an angle */
D('xlProtractor', '分度器', 'Protractor', ['graphic', 'editorial', 'calm'], 0.8, 'rings', (env, bb, p, t, o, u) => {
  const ax = axes(env, bb), sp = ax.C1 - ax.C0, len = ax.L1 - ax.L0, b = sideBand(env, ax, 180 * u, !!p.low, 18 * u + sp * 0.05);
  if (b.room < 44 * u) return;
  const R = cl(Math.min(len * 0.45, b.room - 28 * u), 34 * u, 260 * u), ca = cl((ax.L0 + ax.L1) / 2, R + 10 * u, ax.AM - R - 10 * u), c = env.sc.fg;
  const pt = (d, r) => ax.M(ca + Math.cos(d * DEG) * r, b.edge + b.s * Math.sin(d * DEG) * r);
  const e = ein(t, 0.65, 0, E.inOutCubic), a = Math.min(1, o * 1.5), k = R / (150 * u), eb = ein(t, 0.4);
  segs(env, [[...ax.M(ca - R * eb, b.edge), ...ax.M(ca + R * eb, b.edge)]], c, 1.8 * u, a);
  const arc = []; for (let i = 0; i <= 40; i++) arc.push(pt(180 * e * i / 40, R));
  stroke(env, arc, c, 2.2 * u, a, { cap: 'butt' });
  const tk = [];
  for (let d = 0; d <= 180; d += 5) { if (d > 180 * e) break; const l = (d % 30 === 0 ? 17 : d % 10 === 0 ? 10 : 6) * u * cl(k, 0.6, 1.2), A = pt(d, R), B = pt(d, R - l); tk.push([A[0], A[1], B[0], B[1]]); }
  segs(env, tk, c, 1.2 * u, 0.85 * a);
  const tg = 25 + p.r * 130, ang = tg * E.outBack(cl((t - 0.3) / 0.6), 1.5) + 2 * Math.sin(t * 2.1) * env.fx.motion, na = ein(t, 0.2, 0.3) * o;
  const N = pt(ang, R * 0.84), O = pt(0, 0);
  segs(env, [[O[0], O[1], N[0], N[1]]], ACC(env), 3 * u, na, 'round');
  ring(env, O[0], O[1], 5 * u, ACC(env), 2.2 * u, na);
  const Lp = pt(ang, R + 20 * u);
  if (R > 60 * u) label(env, Math.round(ang) + '°', Lp[0], Lp[1], { size: Math.max(11, 15 * u), color: env.sc.sub, alpha: ein(t, 0.3, 0.5) * o });
});

/* 角度記号 — a geometry angle mark at a corner of the lyric: a dashed base ray, a ray that swings open, the arc and its degrees */
D('xlAngleMark', '角度記号', 'Angle Mark', ['graphic', 'editorial'], 0.8, 'rings', (env, bb, p, t, o, u) => {
  const { W, H } = env, m = MG(env) * 0.6, c = COL(env, p);
  let sx = p.right ? 1 : -1, sy = p.low ? 1 : -1;
  const vx = s => (s > 0 ? bb.x1 + 10 * u : bb.x0 - 10 * u), rm = s => (s > 0 ? W - m - vx(s) : vx(s) - m);
  const vy = s => (s > 0 ? bb.y1 + 10 * u : bb.y0 - 10 * u), rv = s => (s > 0 ? H - m - vy(s) : vy(s) - m);
  if (rv(sy) < 34 * u && rv(-sy) > rv(sy)) sy = -sy;
  let dir = sx, len;
  if (rm(sx) >= 120 * u) len = rm(sx); else if (rm(-sx) >= 120 * u) { sx = -sx; dir = sx; len = rm(sx); } else { dir = -sx; len = bw(bb) * 0.55; }
  len = cl(len * 0.8, 90 * u, 230 * u);
  const V = [vx(sx), vy(sy)], room = Math.max(8 * u, rv(sy));
  const th = cl(Math.min(22 + p.r * 38, Math.atan2(room, len * 0.85) / DEG), 7, 60), the = th * E.outBack(cl((t - 0.2) / 0.5), 1.7), a = Math.min(1, o * 1.5);
  const ray = (d, r) => [V[0] + dir * Math.cos(d * DEG) * r, V[1] + sy * Math.sin(d * DEG) * r];
  const e = ein(t, 0.4), A = ray(0, len * e * o);
  stroke(env, [V, A], env.sc.fg, 1.8 * u, a * 0.7, { dash: [8 * u, 6 * u], cap: 'butt' });
  const B = ray(the, len * e * o);
  segs(env, [[V[0], V[1], B[0], B[1]]], c, 3 * u, a, 'round');
  const ra = len * 0.42 * e, arc = []; for (let i = 0; i <= 14; i++) arc.push(ray(the * i / 14, ra));
  stroke(env, arc, c, 2 * u, a, { cap: 'butt' });
  dot(env, V[0], V[1], 5 * u, ACC(env), a);
  const Lp = ray(the / 2, ra + 30 * u);
  label(env, Math.round(Math.abs(the)) + '°', Lp[0], Lp[1], { size: Math.max(11, 17 * u), color: c, alpha: ein(t, 0.3, 0.4) * o });
});

/* 水準器 — a spirit level beside the lyric: the bubble sloshes and settles between its two lines */
D('xlLevel', '水準器', 'Spirit Level', ['calm', 'graphic', 'editorial'], 0.8, 'bars', (env, bb, p, t, o, u) => {
  const ax = axes(env, bb, true), b = sideBand(env, ax, 40 * u, !!p.low, 16 * u + bh(bb) * 0.07), c = env.sc.fg, m = MG(env) * 0.5;
  const cx = (bb.x0 + bb.x1) / 2, e = ein(t, 0.45), w = cl(bw(bb) * 0.4, 150 * u, 290 * u) * e, h = Math.min(34 * u, b.h), y = b.c, a = Math.min(1, o * 1.5);
  stroke(env, rrectPts(cx - w / 2, y - h / 2, cx + w / 2, y + h / 2, h / 2, 6), c, 2.4 * u, a, { close: true });
  segs(env, [[cx - 24 * u * e, y - h / 2, cx - 24 * u * e, y + h / 2], [cx + 24 * u * e, y - h / 2, cx + 24 * u * e, y + h / 2]], c, 1.8 * u, a);
  const x0 = Math.max(m, bb.x0 - 6 * u), x1 = Math.min(env.W - m, bb.x1 + 6 * u), e2 = ein(t, 0.5, 0.1) * o;
  if (x1 - x0 > w + 40 * u) segs(env, [[cx - w / 2 - 10 * u, y, lerp(cx - w / 2 - 10 * u, x0, e2), y], [cx + w / 2 + 10 * u, y, lerp(cx + w / 2 + 10 * u, x1, e2), y], [x0, y - 6 * u * e2, x0, y + 6 * u * e2], [x1, y - 6 * u * e2, x1, y + 6 * u * e2]], env.sc.sub, 1.6 * u, a);
  const bx = cx + ((w / 2 - 30 * u) * Math.exp(-t * 1.5) * Math.cos(t * 5.5) * (p.right ? 1 : -1) + 2.5 * u * Math.sin(t * 1.3)) * (0.3 + 0.7 * env.fx.motion);
  const ba = ein(t, 0.25, 0.15) * o, bwd = 19 * u, bhh = Math.max(2 * u, Math.min(11 * u, h / 2 - 4 * u));
  stroke(env, rrectPts(bx - bwd, y - bhh, bx + bwd, y + bhh, bhh, 6), ACC(env), 2.6 * u, ba, { close: true });
  segs(env, [[bx - bwd * 0.45, y - bhh * 0.35, bx - bwd * 0.05, y - bhh * 0.35]], ACC(env), 1.3 * u, ba, 'round');
});

/* 下げ振り — a plumb line dropped from the top edge: the bob swings like a pendulum and comes to rest */
D('xlPlumb', '下げ振り', 'Plumb Line', ['calm', 'emotional', 'graphic'], 0.8, 'leaders', (env, bb, p, t, o, u) => {
  const { W, H } = env, m = MG(env), c = env.sc.fg, wr = W - bb.x1, wl = bb.x0, bob = 46 * u;
  let x, L, lim;
  const side = (p.right ? wr >= 90 * u : wl < 90 * u) ? 1 : -1;
  if (Math.max(wr, wl) >= 90 * u) { const sp = side > 0 ? wr : wl; x = side > 0 ? bb.x1 + sp * 0.5 : sp * 0.5; L = cl((bb.y0 + bb.y1) / 2 + bh(bb) * 0.2, H * 0.25, H * 0.72); lim = sp * 0.5 - 16 * u; }
  else if (bb.y0 >= 110 * u) { x = (bb.x0 + bb.x1) / 2 + (p.right ? 1 : -1) * bw(bb) * 0.3; L = bb.y0 - 22 * u - bob; lim = L * 0.3; }
  else { x = p.right ? W - m * 0.5 : m * 0.5; L = H * 0.4; lim = m * 0.3; }
  L *= E.outBack(cl(t / 0.55), 1.2) * lerp(0.2, 1, o); if (L < 4) return;
  const A = Math.min(9 * DEG, Math.atan2(Math.max(2, lim), L)), th = (A * Math.exp(-t * 0.9) * Math.cos(t * 4.2) + 1.2 * DEG * Math.sin(t * 1.7)) * (0.25 + 0.75 * env.fx.motion) * (p.low ? -1 : 1);
  const dx = Math.sin(th), dy = Math.cos(th), bx = x + dx * L, by = dy * L, nx = dy, ny = -dx, a = Math.min(1, o * 1.6);
  segs(env, [[x, 0, bx, by]], c, 1.8 * u, a);
  segs(env, [[x - 12 * u, 2 * u, x + 12 * u, 2 * u]], c, 4 * u, a);
  const w = 13 * u, T = (k, d) => [bx + nx * k + dx * d, by + ny * k + dy * d];
  fillPoly(env, [T(-w, 0), T(w, 0), T(w, bob * 0.35), T(0, bob), T(-w, bob * 0.35)], COL(env, p), a);
  dot(env, bx + dx * bob * 0.2, by + dy * bob * 0.2, 3.2 * u, env.sc.bg, a);
});

/* コンパス — a drafting compass in free space: the needle leg stays put while the pencil leg draws a full circle */
D('xlCompass', 'コンパス', 'Compass Arc', ['graphic', 'editorial', 'calm'], 0.7, 'rings', (env, bb, p, t, o, u) => {
  const mn = Math.min(env.W, env.H), R = cl(mn * 0.095, 50 * u, 112 * u), hg = R * 2.1, w = R * 2 + 12 * u, h = hg + R + 28 * u;
  const sp = spot(env, bb, w, h, p, 22 * u), px = sp.x + w / 2, py = sp.y + h - R - 6 * u, dir = p.right ? 1 : -1, a = ein(t, 0.3, 0, E.outCubic) * o;
  const ph0 = (-90 + p.r * 360) * DEG, sw = (TAU * E.inOutCubic(cl((t - 0.25) / 1.2)) + Math.max(0, t - 1.45) * 0.25 * env.fx.motion) * dir, ph = ph0 + sw;
  const qx = px + Math.cos(ph) * R, qy = py + Math.sin(ph) * R, hx = (px + qx) / 2, hy = py - hg * ein(t, 0.35);
  const n = Math.max(2, Math.ceil(Math.min(Math.abs(sw), TAU) / 0.12));
  stroke(env, arcPts(px, py, R, ph - Math.sign(sw || 1) * Math.min(Math.abs(sw), TAU), ph, n), COL(env, p), 3 * u, a, { cap: 'butt' });
  stroke(env, [[px, py], [hx, hy], [qx, qy]], env.sc.fg, 2.6 * u, a, { join: 'round' });
  segs(env, [[hx, hy, hx, hy - 18 * u]], env.sc.fg, 6 * u, a, 'round');
  dot(env, hx, hy, 7 * u, env.sc.bg, a); ring(env, hx, hy, 7 * u, env.sc.fg, 2.2 * u, a); dot(env, hx, hy, 2.6 * u, ACC(env), a);
  segs(env, [[px - 6 * u, py, px + 6 * u, py], [px, py - 6 * u, px, py + 6 * u]], env.sc.sub, 1 * u, a);
  dot(env, qx, qy, 4.5 * u, ACC(env), a);
});

/* ベジェ曲線 — a vector-tool curve beside the lyric: anchor points, control handles that slowly swing, the curve following them */
D('xlBezier', 'ベジェ曲線', 'Bezier Handles', ['graphic', 'editorial', 'calm'], 1, 'waveform', (env, bb, p, t, o, u) => {
  const ax = axes(env, bb), len = ax.L1 - ax.L0, hh0 = cl(len * 0.14, 54 * u, 130 * u), m = MG(env) * 0.5;
  const b = sideBand(env, ax, hh0 + 8 * u, !!p.low, 18 * u + (ax.C1 - ax.C0) * 0.06), hh = Math.max(6 * u, b.h - 8 * u), s = b.s, mo = 0.3 + 0.7 * env.fx.motion;
  const a0 = Math.max(m, ax.L0 - 10 * u), a1 = Math.min(ax.AM - m, ax.L1 + 10 * u), e1 = ein(t, 0.3, 0.1), ph = p.r * 6;
  const A = [a0, b.edge], B = [a1, b.edge];
  const HA = [a0 + len * (0.28 + 0.06 * Math.sin(t * 0.9 + ph) * mo) * e1, b.edge + s * hh * (0.6 + 0.38 * Math.sin(t * 1.3 + ph) * mo) * e1];
  const HB = [a1 - len * (0.28 + 0.06 * Math.cos(t * 1.1 + ph) * mo) * e1, b.edge + s * hh * (0.6 + 0.38 * Math.sin(t * 1.3 + ph + 2.3) * mo) * e1];
  const cv = []; for (let i = 0; i <= 32; i++) { const q = i / 32, k = 1 - q; cv.push(ax.M(k * k * k * A[0] + 3 * k * k * q * HA[0] + 3 * k * q * q * HB[0] + q * q * q * B[0], k * k * k * A[1] + 3 * k * k * q * HA[1] + 3 * k * q * q * HB[1] + q * q * q * B[1])); }
  const pa = mk(cv), e = ein(t, 0.55, 0.2, E.inOutCubic), a = Math.min(1, o * 1.5);
  stroke(env, span(pa, pa.L * (1 - o), pa.L * e), COL(env, p), 3 * u, a);
  const mA = ax.M(A[0], A[1]), mB = ax.M(B[0], B[1]), mHA = ax.M(HA[0], HA[1]), mHB = ax.M(HB[0], HB[1]), pa2 = E.outBack(cl(t / 0.25), 2) * o;
  segs(env, [[mA[0], mA[1], mHA[0], mHA[1]], [mB[0], mB[1], mHB[0], mHB[1]]], env.sc.sub, 1.6 * u, a);
  for (const q of [mA, mB]) { const r = 6 * u * pa2; fillPoly(env, [[q[0] - r, q[1] - r], [q[0] + r, q[1] - r], [q[0] + r, q[1] + r], [q[0] - r, q[1] + r]], ACC(env), 1); }
  for (const q of [mHA, mHB]) { dot(env, q[0], q[1], 6 * u * e1, env.sc.bg, o); ring(env, q[0], q[1], 6 * u * e1, ACC(env), 2 * u, o); }
});

/* ============================================================ connectors, pointers, marks */

/* 張り糸 — strings stretched taut from the lyric's frame to the screen edges, twanging like plucked strings */
D('xlEdgeTether', '張り糸', 'Edge Tethers', ['graphic', 'emotional', 'glitch'], 1, 'leaders', (env, bb, p, t, o, u) => {
  const { W, H } = env, f = frame(env, bb, PAD(bb, u, 0.8)), c = env.sc.fg;
  const dirs = [[1, 0], [-1, 0], [0, -1], [0, 1]], n = p.n + 1;
  for (let k = 0; k < n; k++) {
    const [dx, dy] = dirs[(k + p.v + (p.right ? 0 : 1)) % 4], lat = J.rs(p.seed, k, 1) * 0.3;
    const ax = dx ? (dx > 0 ? f.x1 : f.x0) : f.cx + lat * f.w, ay = dy ? (dy > 0 ? f.y1 : f.y0) : f.cy + lat * f.h;
    const ex = dx ? (dx > 0 ? W : 0) : ax, ey = dy ? (dy > 0 ? H : 0) : ay, L = Math.hypot(ex - ax, ey - ay); if (L < 12 * u) continue;
    const dl = k * 0.07, e = ein(t, 0.3, dl, E.outCubic); if (e <= 0) continue;
    const tau = t - 0.3 - dl, cyc = tau > 0 ? tau % 1.9 : 99, amp = 10 * u * Math.exp(-cyc * 3) * Math.sin(cyc * 40) * env.fx.motion * (e >= 1 ? 1 : 0);
    const pts = [];
    for (let i = 0; i <= 16; i++) { const s = lerp(1 - o, e, i / 16), d = amp * Math.sin(Math.PI * s); pts.push([lerp(ax, ex, s) - dy * d, lerp(ay, ey, s) + dx * d]); }
    stroke(env, pts, c, 2 * u, 0.9, { cap: 'butt' });
    dot(env, ax, ay, 5.5 * u, env.sc.bg, e * o); ring(env, ax, ay, 5.5 * u, ACC(env), 2.2 * u, e * o);
    if (e >= 1) { const q = 7 * u; env.rect(ex - (dx > 0 ? q * 2 : dx < 0 ? 0 : q), ey - (dy > 0 ? q * 2 : dy < 0 ? 0 : q), q * 2, q * 2, ACC(env), o, false); }
  }
});

/* 手描き矢印 — a hand-drawn arrow swooping in from the free space, its head flicked on at the end */
D('xlHandArrow', '手描き矢印', 'Sketch Arrow', ['pop', 'emotional', 'editorial'], 1.2, 'arrows', (env, bb, p, t, o, u) => {
  const { W, H } = env, m = MG(env) * 0.8, c = COL(env, p), sx = p.right ? 1 : -1, sy = p.low ? 1 : -1;
  const rooms = { r: W - m - bb.x1, l: bb.x0 - m, t: bb.y0 - m, b: H - m - bb.y1 };
  const hs = sx > 0 ? ['r', 'l'] : ['l', 'r'], vs = sy > 0 ? ['b', 't'] : ['t', 'b'];
  const ord = p.v % 2 ? [hs[0], vs[0], hs[1], vs[1]] : [vs[0], hs[0], vs[1], hs[1]];
  let sd = ord.find(k => rooms[k] >= 110 * u); if (!sd) sd = ord.slice().sort((a, b) => rooms[b] - rooms[a])[0];
  const room = Math.max(rooms[sd], 30 * u), len = cl(room * 0.75, 30 * u, 240 * u), cx = (bb.x0 + bb.x1) / 2, cy = (bb.y0 + bb.y1) / 2;
  let T, S, C;
  if (sd === 'r' || sd === 'l') {
    const d = sd === 'r' ? 1 : -1; T = [(d > 0 ? bb.x1 : bb.x0) + d * 16 * u, cy + sy * bh(bb) * 0.15];
    S = [T[0] + d * len, cl(T[1] + sy * len * 0.6, m, H - m)]; C = [lerp(T[0], S[0], 0.8), T[1] - sy * len * 0.1];
  } else {
    const d = sd === 'b' ? 1 : -1; T = [cx + sx * bw(bb) * 0.2, (d > 0 ? bb.y1 : bb.y0) + d * 16 * u];
    S = [cl(T[0] + sx * len * 0.7, m, W - m), T[1] + d * len]; C = [T[0] - sx * len * 0.12, lerp(T[1], S[1], 0.8)];
  }
  const raw = quad(S, C, T, 26).map((q, i) => { const k = Math.sin(i / 26 * Math.PI) * 2.6 * u; return [q[0] + J.noise1(i * 0.45, p.seed) * k, q[1] + J.noise1(i * 0.45 + 9, p.seed) * k]; });
  const pa = mk(raw), e = ein(t, 0.5, 0, E.inOutCubic), a = Math.min(1, o * 1.6);
  stroke(env, span(pa, pa.L * (1 - o), pa.L * e), c, 3.2 * u, a);
  const eh = ein(t, 0.2, 0.45); if (eh <= 0) return;
  const an = Math.atan2(C[1] - T[1], C[0] - T[0]), hl = Math.min(26 * u, len * 0.4) * eh;
  for (const k of [-0.52, 0.48]) stroke(env, [T, [T[0] + Math.cos(an + k) * hl * (k < 0 ? 1 : 0.85), T[1] + Math.sin(an + k) * hl * (k < 0 ? 1 : 0.85)]], c, 3.2 * u, a);
});

/* ちょん線 — three short strokes that flick outward from the lyric's corners, and flick again now and then */
D('xlAccentTicks', 'ちょん線', 'Accent Ticks', ['pop', 'emotional'], 1.2, 'sparks', (env, bb, p, t, o, u) => {
  const sx = p.right ? 1 : -1, c = COL(env, p), k0 = cl(bh(bb) / (170 * u), 0.8, 1.7);
  const cs = [[sx, -1], [-sx, 1], [-sx, -1]].slice(0, p.n);
  cs.forEach(([cxs, cys], ci) => {
    const ox = (cxs > 0 ? bb.x1 : bb.x0) - cxs * 6 * u, oy = (cys > 0 ? bb.y1 : bb.y0) - cys * 6 * u, base = Math.atan2(cys * 0.75, cxs);
    const tau = t - ci * 0.12; if (tau <= 0) return;
    const cyc = tau % 1.5, nud = 7 * u * Math.exp(-cyc * 7) * (tau > 1.5 ? 1 : 0) * env.fx.motion;
    [-0.46, 0, 0.46].forEach((da, i) => {
      const an = base + da * cxs * cys, L = (i === 1 ? 42 : 30) * u * k0, rb = 20 * u * k0 + nud, r1 = rb + L * ein(tau, 0.28, i * 0.03), r0 = lerp(r1, rb, o);
      if (r1 - r0 < 0.5) return;
      segs(env, [[ox + Math.cos(an) * r0, oy + Math.sin(an) * r0, ox + Math.cos(an) * r1, oy + Math.sin(an) * r1]], c, 4.4 * u * Math.min(k0, 1.3), Math.min(1, o * 2), 'round');
    });
  });
});

/* 旗ピン — a pin planted at a corner of the lyric: the pole rises and a pennant unfurls and flutters */
D('xlPennant', '旗ピン', 'Pennant Pin', ['pop', 'graphic'], 0.9, 'shapes', (env, bb, p, t, o, u) => {
  const { W, H } = env, m = MG(env) * 0.5, rt = bb.y0 - m, rb = H - m - bb.y1, sy = rt >= 60 * u || rt >= rb ? -1 : 1, room = sy < 0 ? rt : rb;
  const hgt = cl(room * 0.8, 24 * u, 120 * u), xs = p.big ? [p.right ? 1 : -1, p.right ? -1 : 1] : [p.right ? 1 : -1], c = COL(env, { accent: !p.accent });
  xs.forEach((sx, k) => {
    const x = cl(sx > 0 ? bb.x1 + 6 * u : bb.x0 - 6 * u, m, W - m), y0 = sy < 0 ? bb.y0 - 6 * u : bb.y1 + 6 * u;
    const rise = E.outBack(cl((t - k * 0.12) / 0.4), 1.4) * o; if (rise <= 0) return;
    const yT = y0 + sy * hgt * rise;
    segs(env, [[x, y0, x, yT]], env.sc.fg, 2.4 * u, 1, 'round'); dot(env, x, y0, 3.6 * u, env.sc.fg, 1);
    const fl = cl(hgt * 0.8, 26 * u, 96 * u) * ein(t, 0.45, 0.2 + k * 0.12) * o, fh = cl(hgt * 0.42, 14 * u, 50 * u) * Math.min(1, rise); if (fl < 1) return;
    const dir = (sx > 0 ? x + fl * 1.05 < W - m * 0.6 : x - fl * 1.05 < m * 0.6) ? 1 : -1, yB = yT - sy * fh, ym = (yT + yB) / 2;
    const wv = s => Math.sin(s * 5 - env.ltb * 6) * fh * 0.16 * s * (0.3 + 0.7 * env.fx.motion), A = [], B = [];
    for (let i = 0; i <= 8; i++) { const s = i / 8; A.push([x + dir * fl * s, lerp(yT, ym, s) + wv(s)]); B.push([x + dir * fl * s, lerp(yB, ym, s) + wv(s)]); }
    fillPoly(env, A.concat(B.reverse()), c, 0.95);
  });
});

/* チェック欄 — a drawn check box (or circle) beside the lyric, ticked by hand with an overshooting stroke */
D('xlCheckBox', 'チェック欄', 'Check Box', ['pop', 'editorial'], 0.8, 'shapes', (env, bb, p, t, o, u) => {
  const s = cl(Math.min(bw(bb), bh(bb)) * 0.5, 46 * u, 92 * u), sp = spot(env, bb, s * 1.25, s * 1.25, Object.assign({}, p, { corner: false }), 18 * u), x = sp.x + s * 0.05, y = sp.y + s * 0.2, sd = p.seed;
  const j = k => J.rs(sd, k) * s * 0.035, a = Math.min(1, o * 1.6), k = s / (44 * u);
  let pts;
  if (p.v % 2) { pts = []; for (let i = 0; i <= 30; i++) { const an = -2 + i / 30 * TAU * 1.07, r = s * 0.5 * (1 + 0.04 * Math.sin(i * 0.9 + sd % 7)); pts.push([x + s / 2 + Math.cos(an) * r, y + s / 2 + Math.sin(an) * r]); } }
  else pts = [[x + j(1), y + j(2)], [x + s + j(3), y + j(4)], [x + s + j(5), y + s + j(6)], [x + j(7), y + s + j(8)], [x + j(1) - 1, y + j(2) - s * 0.08]];
  const pa = mk(pts);
  stroke(env, span(pa, 0, pa.L * ein(t, 0.4, 0, E.inOutCubic)), env.sc.fg, 2.4 * u * Math.max(0.8, k), a);
  const pc = mk(quad([x + s * 0.2, y + s * 0.5], [x + s * 0.34, y + s * 0.62], [x + s * 0.44, y + s * 0.8], 4).concat(quad([x + s * 0.44, y + s * 0.8], [x + s * 0.66, y + s * 0.2], [x + s * 1.12, y - s * 0.14], 8)));
  stroke(env, span(pc, 0, pc.L * ein(t, 0.28, 0.42, E.inOutCubic)), ACC(env), 4.6 * u * Math.max(0.8, k), a);
});

/* 切り取り線 — a dashed cut line across the screen, opened by a pair of scissors that keeps snipping */
D('xlCutLine', '切り取り線', 'Cut Line', ['pop', 'editorial', 'graphic'], 0.9, 'slash', (env, bb, p, t, o, u) => {
  const ax = axes(env, bb), b = sideBand(env, ax, 56 * u, !!p.low, 16 * u + (ax.C1 - ax.C0) * 0.08), c = env.sc.fg, rev = !!p.right, ctx = env.ctx;
  const mv = E.inOutCubic(cl(t / 0.85)), s = ax.AM * lerp(0.03, 0.88, mv) + Math.max(0, t - 0.85) * 5 * u * env.fx.motion, X = a => (rev ? ax.AM - a : a);
  const A = ax.M(X(ax.AM * (1 - o) * 0.9), b.c), B = ax.M(X(Math.max(0, s - 28 * u)), b.c), a = Math.min(1, o * 1.6);
  if (s - 28 * u > ax.AM * (1 - o) * 0.9) stroke(env, [A, B], c, 2.2 * u, 0.9 * a, { dash: [14 * u, 9 * u], cap: 'butt' });
  const q = ax.M(X(s), b.c), ang = (9 + 15 * Math.abs(Math.sin(t * (mv < 1 ? 11 : 3.5)))) * DEG * (0.4 + 0.6 * env.fx.motion);
  ctx.save(); ctx.translate(q[0], q[1]); ctx.rotate((ax.vert ? Math.PI / 2 : 0) + (rev ? Math.PI : 0)); ctx.scale(u * 1.7, u * 1.7);
  ctx.globalAlpha = a * ein(t, 0.2); ctx.strokeStyle = p.accent ? ACC(env) : c; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
  for (const sg of [-1, 1]) {
    ctx.save(); ctx.rotate(sg * ang);
    ctx.beginPath(); ctx.moveTo(24, 0); ctx.lineTo(-13, 0); ctx.stroke();
    ctx.beginPath(); ctx.arc(-19.5, sg * -2.5, 6.5, 0, TAU); ctx.stroke();
    ctx.restore();
  }
  ctx.fillStyle = ctx.strokeStyle; ctx.beginPath(); ctx.arc(0, 0, 1.8, 0, TAU); ctx.fill();
  ctx.restore();
});

/* 縫い目 — a seam stitched round the screen margin (running, zig-zag or cross stitch) by a travelling needle */
D('xlSeam', '縫い目', 'Stitched Seam', ['pop', 'emotional', 'calm'], 0.8, 'leaders', (env, bb, p, t, o, u) => {
  const { W, H } = env, ins = MG(env) * 0.55, c = COL(env, p), v = p.v % 3;
  const pa = mk(rrectPts(ins, ins, W - ins, H - ins, 20 * u, 5), true), L = pa.L, a = 0.85 * Math.min(1, o * 1.5);
  const st0 = pa.L * ((p.right ? 0.25 : 0) + (p.low ? 0.5 : 0)), spans = [];
  if (p.corner) { const ln = Math.min(W, H) * 0.34 * ein(t, 0.7, 0, E.inOutCubic) * o; for (const cc of [st0, st0 + L / 2]) spans.push([cc - ln, cc + ln]); }
  else { const e = ein(t, 1.0, 0, E.inOutCubic); spans.push([st0 + L * e * (1 - o), st0 + L * e]); }
  for (const [s0, s1] of spans) {
    if (!(s1 > s0)) continue;
    if (v === 0) stroke(env, span(pa, s0, s1, true), c, 2.8 * u, a, { dash: [17 * u, 11 * u], cap: 'butt' });
    else {
      const step = (v === 1 ? 12 : 27) * u * Math.max(1, L / (400 * (v === 1 ? 12 : 27) * u)), zz = [], xs = [];
      for (let i = Math.ceil(s0 / step), g = 0; i * step <= s1 && g < 420; i++, g++) {
        const q = at(pa, mod(i * step, L)), nx = -Math.sin(q[2]), ny = Math.cos(q[2]), tx = Math.cos(q[2]), ty = Math.sin(q[2]), d = 5 * u;
        if (v === 1) zz.push([q[0] + nx * d * (i % 2 ? 1 : -1), q[1] + ny * d * (i % 2 ? 1 : -1)]);
        else xs.push([q[0] - tx * d - nx * d, q[1] - ty * d - ny * d, q[0] + tx * d + nx * d, q[1] + ty * d + ny * d], [q[0] - tx * d + nx * d, q[1] - ty * d + ny * d, q[0] + tx * d - nx * d, q[1] + ty * d - ny * d]);
      }
      if (v === 1) stroke(env, zz, c, 2.2 * u, a, { join: 'miter', cap: 'butt' }); else segs(env, xs, c, 2.2 * u, a, 'round');
    }
  }
  if (!p.corner) {                                                         // the needle leads the thread, then slips away
    const e = ein(t, 1.0, 0, E.inOutCubic), na = (1 - ein(t, 0.3, 0.95, E.inCubic)) * o; if (na <= 0.01) return;
    const q = at(pa, mod(st0 + L * e, L)), tx = Math.cos(q[2] - 0.35), ty = Math.sin(q[2] - 0.35);
    segs(env, [[q[0], q[1], q[0] + tx * 50 * u, q[1] + ty * 50 * u]], env.sc.fg, 2 * u, na, 'round');
    ring(env, q[0] + tx * 5 * u, q[1] + ty * 5 * u, 2.6 * u, env.sc.fg, 1.2 * u, na);
  }
});
})();
