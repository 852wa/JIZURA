/* JIZURA pack: decor — 45 refined graphic accents: HUD / measuring marks, geometry, particles & light, hand-drawn marks, type ornaments */
(() => {
'use strict';
const E = J.E;
const PK = 'decor';
const DEG = J.DEG, TAU = J.TAU;

/* ============================================================
   shared helpers
   ============================================================ */
const U = env => Math.min(env.W, env.H) / 1080;                    // 1 at 1080p short side
const MG = env => Math.round(Math.min(env.W, env.H) * 0.05);        // safe margin
const monoF = env => (env.st.fonts.mono && env.st.fonts.mono[0]) || 'mono';
const bodyF = env => (env.st.fonts.body && env.st.fonts.body[0]) || 'gothic_med';
const serifF = env => (env.st.fonts.serif && env.st.fonts.serif[0]) || 'mincho';
const dark = env => J.lum(env.sc.bg) < 0.5;
const inE = (env, d = 0.4, delay = 0, ease = E.outExpo) => ease(J.clamp((env.lt - delay) / d));
const outE = env => 1 - E.inCubic(env.pOut);
const L2 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const colOf = (env, c, g) => (env.pass === 'main' ? c : g ? env.passColor : null);
const FS = env => Math.max(12, 16 * U(env));                         // small label size

/* lyric bbox: remember the last real one per cut so decor never jumps to the centre while the text is hidden */
const BBC = new WeakMap();
const getBB = (env, bb) => {
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

/* place a w×h box next to the lyric (outside it, inside the safe margin). returns {x, y, cx, cy, ok, sx, sy} (top-left + centre) */
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
/* many straight segments [[x0,y0,x1,y1],…] in one path */
function segs(env, list, c, lw, a = 1, g = false, cap) {
  const k = colOf(env, c, g); if (!k || a <= 0.003 || !list.length) return;
  const ctx = env.ctx;
  ctx.globalAlpha = Math.min(1, a); ctx.strokeStyle = k; ctx.lineWidth = lw; ctx.lineCap = cap || 'butt';
  ctx.beginPath();
  for (const s of list) { ctx.moveTo(s[0], s[1]); ctx.lineTo(s[2], s[3]); }
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
/* many filled rects [[x,y,w,h],…] */
function rects(env, list, c, a = 1, g = false) {
  const k = colOf(env, c, g); if (!k || a <= 0.003 || !list.length) return;
  const ctx = env.ctx;
  ctx.globalAlpha = Math.min(1, a); ctx.fillStyle = k; ctx.beginPath();
  for (const r of list) if (r[2] > 0 && r[3] > 0) ctx.rect(r[0], r[1], r[2], r[3]);
  ctx.fill(); ctx.globalAlpha = 1;
}
/* filled polygons [[pts],…] in one path */
function polys(env, list, c, a = 1, g = false) {
  const k = colOf(env, c, g); if (!k || a <= 0.003 || !list.length) return;
  const ctx = env.ctx;
  ctx.globalAlpha = Math.min(1, a); ctx.fillStyle = k; ctx.beginPath();
  for (const pts of list) { if (pts.length < 3) continue; ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.closePath(); }
  ctx.fill(); ctx.globalAlpha = 1;
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
const star5 = (cx, cy, R, r, rot = -90) => { const o = []; for (let i = 0; i < 10; i++) { const a = (rot + i * 36) * DEG, q = i % 2 ? r : R; o.push([cx + Math.cos(a) * q, cy + Math.sin(a) * q]); } return o; };
const glint = (cx, cy, R, w, rot = 0) => {        // 4-point concave star
  const o = []; const n = 4;
  for (let i = 0; i < n * 2; i++) { const a = rot * DEG + i * Math.PI / n, q = i % 2 ? w : R; o.push([cx + Math.cos(a) * q, cy + Math.sin(a) * q]); }
  // add concave in-between control points
  const out = [];                                   // pull each edge midpoint inward → concave sides
  for (let i = 0; i < o.length; i++) { out.push(o[i]); out.push(L2(L2(o[i], o[(i + 1) % o.length], 0.5), [cx, cy], 0.35)); }
  return out;
};
const heart = (cx, cy, s) => {
  const o = [];
  for (let i = 0; i < 28; i++) { const t = i / 28 * TAU; const x = 16 * Math.pow(Math.sin(t), 3), y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t); o.push([cx + x * s / 17, cy - y * s / 17]); }
  return o;
};

const DEF = {};

/* ============================================================
   HUD / technical
   ============================================================ */

/* 照準線 — hairlines through the lyric centre, broken around it, graduated near the gap */
DEF.crosshair = {
  name: '照準線', nameEn: 'Crosshair', tags: ['graphic', 'editorial', 'glitch'], w: 1, layer: 'front',
  draw(env, bb0, P) {
    if (env.pass !== 'main') return;
    const bb = getBB(env, bb0), { W, H, sc } = env, u = U(env), m = MG(env);
    const o = outE(env); if (o <= 0.003 || env.lt < 0) return;
    const cx = (bb.x0 + bb.x1) / 2, cy = (bb.y0 + bb.y1) / 2;
    const gx = 26 * u + bw(bb) * 0.02, gy = 22 * u + bh(bb) * 0.1;
    const v = (P.v | 0) % 3, lw = Math.max(1, 1.3 * u);
    // vertical arms always; horizontal arms only where there is room beside the lyric
    const arms = [[[cx, bb.y0 - gy], [cx, m * 0.5]], [[cx, bb.y1 + gy], [cx, H - m * 0.5]], [[bb.x0 - gx, cy], [m * 0.5, cy]], [[bb.x1 + gx, cy], [W - m * 0.5, cy]]];
    const pOut = E.inCubic(env.pOut);
    arms.forEach(([a, b], i) => {
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]); if (len < 40 * u) return;
      const ee = E.outExpo(J.clamp((env.lt - i * 0.06) / 0.6));
      if (ee <= pOut) return;
      stroke(env, [L2(a, b, pOut), L2(a, b, ee)], sc.sub, lw, 0.75);
      const dx = (b[0] - a[0]) / len, dy = (b[1] - a[1]) / len, nx = -dy, ny = dx;
      if (v !== 2 || i < 2) {        // graduation near the gap
        const st = 10 * u, nt = Math.min(20, Math.floor(len * 0.5 / st)), list = [];
        for (let t = 1; t <= nt; t++) {
          const d = t * st; if (d > len * ee || d < len * pOut) continue;
          const tl = (t % 5 === 0 ? 8 : 3.5) * u * J.clamp((ee * len - d) / (40 * u));
          list.push([a[0] + dx * d - nx * tl, a[1] + dy * d - ny * tl, a[0] + dx * d + nx * tl, a[1] + dy * d + ny * tl]);
        }
        segs(env, list, sc.fg, lw, 0.8 * o);
      }
      const cap = 9 * u * ee;          // accent cap at the inner end
      if (pOut < 0.02) stroke(env, [[a[0] - nx * cap, a[1] - ny * cap], [a[0] + nx * cap, a[1] + ny * cap]], i < 2 || P.accent ? sc.accent : sc.fg, 2.4 * u, ee * o);
      if (v === 1) env.circle(b[0], b[1], 3 * u * ee, null, sc.fg, lw, o * ee, false);
    });
    if (v !== 2) {
      const e = inE(env, 0.3, 0.35) * o, fs = FS(env) * 0.85;
      label(env, `Y ${pad2(bb.y0, 4)}`, cx + 12 * u, bb.y0 - gy - fs * 0.9, { size: fs, alpha: e });
      label(env, `Y ${pad2(bb.y1, 4)}`, cx + 12 * u, bb.y1 + gy + fs * 0.9, { size: fs, alpha: e });
      label(env, `X ${pad2(cx, 4)}`, cx - 12 * u, H - m * 0.5 - fs * 0.6, { size: fs, align: 'right', alpha: e, color: sc.fg });
    }
  },
};

/* トンボ — printer's crop / registration marks around the lyric */
DEF.cropMarks = {
  name: 'トンボ', nameEn: 'Crop marks', tags: ['editorial', 'graphic', 'calm'], w: 1.1, layer: 'front',
  draw(env, bb0, P) {
    if (env.pass !== 'main') return;
    const bb = getBB(env, bb0), { sc } = env, u = U(env);
    const o = outE(env); if (o <= 0.003) return;
    const pad = 14 * u + Math.min(bw(bb), bh(bb)) * 0.08 + P.r * 10 * u;
    const cm = 12 * u;
    const X0 = Math.max(cm, bb.x0 - pad), X1 = Math.min(env.W - cm, bb.x1 + pad), Y0 = Math.max(cm, bb.y0 - pad), Y1 = Math.min(env.H - cm, bb.y1 + pad);
    const g = 8 * u, Lm = 26 * u + Math.min(bw(bb), bh(bb)) * 0.05, b = 9 * u, lw = Math.max(1, 1 * u);
    const col = sc.fg;
    [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sy], k) => {
      const e = E.outExpo(J.clamp((env.lt - k * 0.05) / 0.45)); if (e <= 0) return;
      const X = sx < 0 ? X0 : X1, Y = sy < 0 ? Y0 : Y1;
      const hl = (y) => [[X + sx * g, y], [X + sx * (g + Lm * e), y]];
      const vl = (x) => [[x, Y + sy * g], [x, Y + sy * (g + Lm * e)]];
      segs(env, [[...hl(Y)[0], ...hl(Y)[1]], [...vl(X)[0], ...vl(X)[1]]], col, lw, 0.9 * o);
      segs(env, [[...hl(Y + sy * b)[0], ...hl(Y + sy * b)[1]], [...vl(X + sx * b)[0], ...vl(X + sx * b)[1]]], col, lw, 0.55 * o);
    });
    // centre marks (十) + register circles
    const e2 = inE(env, 0.45, 0.15); if (e2 <= 0) return;
    const cx = (X0 + X1) / 2, cy = (Y0 + Y1) / 2, cl = 20 * u * e2, rr = 6 * u;
    const rc = P.accent ? sc.accent : sc.fg;
    const marks = [[cx, Y0 - g, 0, -1], [cx, Y1 + g, 0, 1]];
    if (P.big || bh(bb) > bw(bb)) marks.push([X0 - g, cy, -1, 0], [X1 + g, cy, 1, 0]);
    for (const [x, y, dx, dy] of marks) {
      const ex = x + dx * cl, ey = y + dy * cl, mx = x + dx * cl * 0.55, my = y + dy * cl * 0.55;
      segs(env, [[x, y, ex, ey], [mx - dy * cl * 0.45, my - dx * cl * 0.45, mx + dy * cl * 0.45, my + dx * cl * 0.45]], rc, lw, 0.85 * o);
      if (P.big) env.circle(mx, my, rr * e2, null, rc, lw, 0.85 * o, false);
    }
  },
};

/* ロックオン — a targeting reticle that shrinks, spins and locks beside the lyric */
DEF.reticle = {
  name: 'ロックオン', nameEn: 'Lock-on', tags: ['glitch', 'graphic'], w: 0.9, layer: 'front',
  draw(env, bb0, P) {
    if (env.pass !== 'main') return;
    const bb = getBB(env, bb0), { sc } = env, u = U(env);
    const o = outE(env); if (o <= 0.003 || env.lt < 0) return;
    const R = J.clamp(Math.min(bw(bb), bh(bb)) * 0.3, 40 * u, 72 * u), LW = FS(env) * 3.6;
    const sp = nearBB(env, bb, R * 2.8 + LW, R * 2.6, P, 18 * u);
    const lLeft = sp.cx > env.W / 2, cx = lLeft ? sp.x + LW + R * 1.4 : sp.x + R * 1.4, cy = sp.cy;
    const lock = E.outExpo(J.clamp(env.lt / 0.6)), r = R * (2.1 - 1.1 * lock) * (1 + 0.25 * E.inCubic(env.pOut));
    const rot = (1 - lock) * 140 + env.ltb * 16 + P.r * 90, lw = Math.max(1.2, 1.6 * u), a = Math.min(1, env.lt / 0.12) * o;
    const on = lock > 0.97 || env.step % 2 === 0;
    for (let k = 0; k < 4; k++) env.arc(cx, cy, r, rot + k * 90 - 28, rot + k * 90 + 28, sc.fg, lw, a * (on ? 1 : 0.5), false);
    env.arc(cx, cy, r * 0.62, -90, -90 + 360 * lock, sc.sub, Math.max(1, u), a * 0.6, false);
    const tk = [];
    for (let k = 0; k < 4; k++) { const an = k * 90 * DEG; tk.push([cx + Math.cos(an) * r * 0.74, cy + Math.sin(an) * r * 0.74, cx + Math.cos(an) * r * 1.16, cy + Math.sin(an) * r * 1.16]); }
    segs(env, tk, sc.fg, Math.max(1, u), a * 0.9);
    const tri = [], r2 = r * 1.32;
    for (let k = 0; k < 3; k++) {
      const an = (-env.ltb * 30 + k * 120 + P.r * 60) * DEG, px = cx + Math.cos(an) * r2, py = cy + Math.sin(an) * r2, s = 5 * u;
      const ix = -Math.cos(an), iy = -Math.sin(an), nx = -iy, ny = ix;
      tri.push([[px + ix * s, py + iy * s], [px - ix * s * 0.6 + nx * s * 0.8, py - iy * s * 0.6 + ny * s * 0.8], [px - ix * s * 0.6 - nx * s * 0.8, py - iy * s * 0.6 - ny * s * 0.8]]);
    }
    polys(env, tri, sc.accent, a);
    env.circle(cx, cy, 2.6 * u, sc.accent, null, 0, a * (lock > 0.97 ? 1 : (env.step % 2 ? 1 : 0.2)), false);
    const fs = FS(env) * 0.9, lx = lLeft ? cx - R * 1.5 : cx + R * 1.5, al = lLeft ? 'right' : 'left';
    label(env, lock > 0.97 ? 'LOCK' : 'SCAN', lx, cy - R * 0.9, { size: fs, align: al, color: lock > 0.97 ? sc.accent : sc.sub, alpha: a });
    label(env, (lock * 100).toFixed(1).padStart(5, '0'), lx, cy - R * 0.9 + fs * 1.3, { size: fs, align: al, alpha: a * 0.8 });
  },
};

/* レーダー — a small scope with a sweeping beam and blips in a free corner */
DEF.radar = {
  name: 'レーダー', nameEn: 'Radar', tags: ['glitch', 'graphic'], w: 0.7, layer: 'front',
  draw(env, bb0, P) {
    if (env.pass !== 'main') return;
    const bb = getBB(env, bb0), { sc } = env, u = U(env);
    const o = outE(env); if (o <= 0.003 || env.lt < 0) return;
    const R = J.clamp(Math.min(env.W, env.H) * 0.07, 40 * u, 96 * u), fs = FS(env) * 0.85;
    const sp = cornerSpot(env, bb, R * 2 + 8 * u, R * 2 + fs * 2.2, P);
    const cx = sp.cx, cy = sp.y + R + 4 * u;
    const e = E.outExpo(J.clamp(env.lt / 0.5)), s = e * (1 - 0.15 * E.inCubic(env.pOut)), rr = R * s, lw = Math.max(1, u);
    const a = o * (sp.ok ? 1 : 0.35);
    [1, 0.66, 0.33].forEach((k, i) => env.arc(cx, cy, rr * k, -90, -90 + 360 * J.clamp(e * 1.4 - i * 0.15), sc.sub, lw, 0.55 * a, false));
    segs(env, [[cx - rr, cy, cx + rr, cy], [cx, cy - rr, cx, cy + rr]], sc.sub, lw, 0.3 * a);
    const tk = [];
    for (let i = 0; i < 36; i++) { const an = i * 10 * DEG, l = i % 3 === 0 ? 5 * u : 2.5 * u; tk.push([cx + Math.cos(an) * rr, cy + Math.sin(an) * rr, cx + Math.cos(an) * (rr + l), cy + Math.sin(an) * (rr + l)]); }
    segs(env, tk, sc.fg, lw, 0.6 * a);
    const sw = (env.ltb * 150 + P.r * 360) % 360;
    for (let k = 14; k >= 0; k--) {
      const an = (sw - k * 3.2) * DEG;
      stroke(env, [[cx, cy], [cx + Math.cos(an) * rr, cy + Math.sin(an) * rr]], sc.accent, k ? lw : 1.6 * lw, a * (k ? 0.3 * (1 - k / 15) : 0.95));
    }
    const bl = [];
    for (let i = 0; i < 3 + (P.n | 0); i++) {
      const ang = J.r(P.seed, i, 1) * 360, rad = J.rr(0.2, 0.9, P.seed, i, 2);
      const since = (((sw - ang) % 360) + 360) % 360, glow = Math.exp(-since / 70);
      if (glow > 0.03) bl.push([cx + Math.cos(ang * DEG) * rr * rad, cy + Math.sin(ang * DEG) * rr * rad, (2 + 2.2 * glow) * u, glow]);
    }
    for (const b of bl) env.circle(b[0], b[1], b[2], sc.fg, null, 0, a * b[3], false);
    const ea = inE(env, 0.3, 0.3) * a;
    label(env, `RDR-${pad2((env.cut.line | 0) + 1)}`, cx - R, sp.y + R * 2 + fs * 1.4, { size: fs, alpha: ea });
    label(env, `${pad2(sw, 3)}°`, cx + R, sp.y + R * 2 + fs * 1.4, { size: fs, align: 'right', alpha: ea, color: sc.fg });
  },
};

/* 進行リング — a thin gauge that fills with the cut's progress */
DEF.progressRing = {
  name: '進行リング', nameEn: 'Progress ring', tags: ['graphic', 'editorial', 'calm'], w: 0.9, layer: 'front',
  draw(env, bb0, P) {
    if (env.pass !== 'main') return;
    const bb = getBB(env, bb0), { sc } = env, u = U(env);
    const o = outE(env); if (o <= 0.003 || env.lt < 0) return;
    const R = J.clamp(Math.min(env.W, env.H) * 0.05, 34 * u, 64 * u);
    const sp = nearBB(env, bb, R * 2 + 24 * u, R * 2 + 24 * u, P, 22 * u);
    const cx = sp.cx, cy = sp.cy, lw = Math.max(1, u);
    const e = E.outExpo(J.clamp(env.lt / 0.5)), a = o * (sp.ok ? 1 : 0.4);
    const prog = J.clamp(env.lt / Math.max(0.1, env.cut.dur));
    const tk = [], nT = 60;
    for (let i = 0; i < nT * e; i++) { const an = (-90 + i * 6) * DEG, l = i % 5 === 0 ? 6 * u : 3 * u, r0 = R + 6 * u; tk.push([cx + Math.cos(an) * r0, cy + Math.sin(an) * r0, cx + Math.cos(an) * (r0 + l), cy + Math.sin(an) * (r0 + l)]); }
    segs(env, tk, sc.sub, lw, 0.55 * a);
    if ((P.v | 0) % 2) {
      const nS = 24;
      for (let i = 0; i < nS; i++) {
        const a0 = -90 + i * 360 / nS + 2, a1 = a0 + 360 / nS - 4, lit = (i + 1) / nS <= prog + 1e-3;
        if (i / nS > e) break;
        env.arc(cx, cy, R, a0, a1, lit ? sc.accent : sc.sub, lit ? 3 * u : lw, a * (lit ? 1 : 0.35), false);
      }
    } else {
      env.arc(cx, cy, R, -90, -90 + 360 * e, sc.sub, lw, 0.35 * a, false);
      env.arc(cx, cy, R, -90, -90 + 360 * prog * e, sc.accent, 2.6 * u, a, false);
      const ha = (-90 + 360 * prog * e) * DEG;
      env.circle(cx + Math.cos(ha) * R, cy + Math.sin(ha) * R, 3.2 * u, sc.accent, null, 0, a, false);
    }
    const fs = R * 0.52;
    label(env, pad2(prog * 100), cx - fs * 0.12, cy, { size: fs, align: 'center', color: sc.fg, alpha: a * e, track: 0.02 });
    label(env, '%', cx + fs * 0.72, cy + fs * 0.12, { size: fs * 0.42, align: 'left', alpha: a * e });
  },
};

/* タイムコード — rolling SMPTE readout + a mini scrub bar with in/out points */
DEF.timecodeBar = {
  name: 'タイムコード', nameEn: 'Timecode', tags: ['editorial', 'glitch', 'graphic'], w: 0.9, layer: 'front',
  draw(env, bb0, P) {
    if (env.pass !== 'main') return;
    const bb = getBB(env, bb0), { W, H, sc } = env, u = U(env), m = MG(env);
    const o = outE(env); if (o <= 0.003 || env.lt < 0) return;
    const fs = FS(env), w = Math.min(W * 0.38, 460 * u), h = fs * 3.4;
    let low = !!P.low, x0 = P.right ? W - m - w : m;
    let y0 = low ? H - m - h : m;
    if (hitBB(x0, y0, x0 + w, y0 + h, bb, 10 * u)) { low = !low; y0 = low ? H - m - h : m; }
    const a = o * (hitBB(x0, y0, x0 + w, y0 + h, bb, 0) ? 0.3 : 1);
    const e = E.outExpo(J.clamp(env.lt / 0.5));
    const t = Math.max(0, env.t || 0), fr = Math.floor(t * 24);
    const tc = `${pad2(t / 3600)}:${pad2((t / 60) % 60)}:${pad2(t % 60)}:${pad2(fr % 24)}`;
    const n = Math.ceil(tc.length * J.clamp(env.lt / 0.35));
    const ty = y0 + fs * 0.8;
    const tcW = textW('TC ', monoF(env), fs * 0.8, 0.1);
    label(env, 'TC', x0, ty + fs * 0.12, { size: fs * 0.8, color: sc.accent, alpha: a });
    label(env, tc.slice(0, n), x0 + tcW, ty, { size: fs * 1.25, color: sc.fg, alpha: a, track: 0.06 });
    label(env, `F ${pad2(Math.floor(env.lt * 24), 4)}`, x0 + w, ty + fs * 0.12, { size: fs * 0.8, align: 'right', alpha: a * e });
    // scrub bar
    const by = y0 + h - fs * 0.6, lw = Math.max(1, u), prog = J.clamp(env.lt / Math.max(0.1, env.cut.dur));
    stroke(env, [[x0, by], [x0 + w * e, by]], sc.sub, lw, 0.6 * a);
    const tk = [];
    for (let i = 0; i <= 48; i++) { const x = x0 + w * i / 48; if (x > x0 + w * e) break; const l = i % 12 === 0 ? 7 * u : i % 4 === 0 ? 4 * u : 2 * u; tk.push([x, by, x, by - l]); }
    segs(env, tk, sc.sub, lw, 0.6 * a);
    const px = x0 + w * prog * e;
    stroke(env, [[x0, by], [px, by]], sc.fg, 2.2 * u, a);
    polys(env, [[[px - 5 * u, by - 12 * u], [px + 5 * u, by - 12 * u], [px, by - 4 * u]]], sc.accent, a);
    const ib = [[x0, by + 4 * u, x0, by + 10 * u], [x0 + w * e, by + 4 * u, x0 + w * e, by + 10 * u]];
    segs(env, ib, sc.fg, lw, a * e);
    label(env, 'IN', x0 + 4 * u, by + 9 * u + fs * 0.35, { size: fs * 0.6, alpha: a * e * 0.8 });
    label(env, 'OUT', x0 + w * e - 4 * u, by + 9 * u + fs * 0.35, { size: fs * 0.6, align: 'right', alpha: a * e * 0.8 });
  },
};

/* 端の定規 — a graduated ruler on one screen edge whose markers track the lyric */
DEF.rulerEdge = {
  name: '端の定規', nameEn: 'Edge ruler', tags: ['editorial', 'graphic', 'calm'], w: 1, layer: 'front',
  draw(env, bb0, P) {
    if (env.pass !== 'main') return;
    const bb = getBB(env, bb0), { W, H, sc } = env, u = U(env), m = MG(env);
    const o = outE(env); if (o <= 0.003 || env.lt < 0) return;
    const vert = P.corner ? true : false, fs = FS(env) * 0.72, lw = Math.max(1, u);
    const st = 10 * u, e = E.outCubic(J.clamp(env.lt / 0.55));
    const len = vert ? H : W, a0 = m, a1 = len - m;
    const side = vert ? (P.right ? 1 : -1) : (P.low ? 1 : -1);
    const base = vert ? (side > 0 ? W - m * 0.55 : m * 0.55) : (side > 0 ? H - m * 0.55 : m * 0.55);
    const inward = -side;
    const P2 = (along, off) => (vert ? [base + inward * off, along] : [along, base + inward * off]);
    const n = Math.floor((a1 - a0) / st), list = [];
    const head = a0 + (a1 - a0) * e;
    for (let i = 0; i <= n; i++) {
      const s = a0 + i * st; if (s > head) break;
      const l = (i % 10 === 0 ? 14 : i % 5 === 0 ? 9 : 4.5) * u * J.clamp((head - s) / (60 * u));
      const p = P2(s, 0), q = P2(s, l);
      list.push([p[0], p[1], q[0], q[1]]);
    }
    const a = o;
    segs(env, list, sc.sub, lw, 0.7 * a);
    const bl0 = P2(a0, 0), bl1 = P2(head, 0);
    stroke(env, [bl0, bl1], sc.sub, lw, 0.5 * a);
    for (let i = 0; i <= n; i += 10) {
      const s = a0 + i * st; if (s > head - 20 * u) break;
      const q = P2(s + (vert ? 0 : 3 * u), 20 * u + fs * 0.4);
      label(env, pad2(i, 3), vert ? q[0] : q[0], vert ? q[1] + 0 : q[1], { size: fs, align: vert ? (inward > 0 ? 'left' : 'right') : 'left', alpha: 0.7 * a });
    }
    // lyric markers
    const em = inE(env, 0.5, 0.2, E.outCubic) * o;
    if (em <= 0) return;
    const lo = vert ? bb.y0 : bb.x0, hi = vert ? bb.y1 : bb.x1, mid = (lo + hi) / 2;
    const from = vert ? H / 2 : W / 2;
    const Lo = J.lerp(from, J.clamp(lo, a0, a1), em), Hi = J.lerp(from, J.clamp(hi, a0, a1), em), Mid = J.lerp(from, J.clamp(mid, a0, a1), em);
    const off = 26 * u;
    stroke(env, [P2(Lo, off), P2(Hi, off)], sc.accent, 2 * u, 0.9 * em);
    segs(env, [[...P2(Lo, off - 5 * u), ...P2(Lo, off + 5 * u)], [...P2(Hi, off - 5 * u), ...P2(Hi, off + 5 * u)]], sc.accent, 2 * u, 0.9 * em);
    const tp = P2(Mid, 3 * u), s5 = 5 * u;
    const tri = vert ? [[tp[0], tp[1]], [tp[0] + inward * s5 * 1.6, tp[1] - s5], [tp[0] + inward * s5 * 1.6, tp[1] + s5]] : [[tp[0], tp[1]], [tp[0] - s5, tp[1] + inward * s5 * 1.6], [tp[0] + s5, tp[1] + inward * s5 * 1.6]];
    polys(env, [tri], sc.fg, em);
    const lp = P2(Mid, off + 8 * u + fs);
    label(env, `${pad2(hi - lo, 4)}`, lp[0] + (vert ? 0 : 6 * u), lp[1], { size: fs, color: sc.fg, align: vert ? (inward > 0 ? 'left' : 'right') : 'left', alpha: em });
  },
};

/* 寸法線 — drafting dimension lines measuring the lyric (width / height) */
DEF.dimension = {
  name: '寸法線', nameEn: 'Dimension lines', tags: ['editorial', 'graphic'], w: 1, layer: 'front',
  draw(env, bb0, P) {
    if (env.pass !== 'main') return;
    const bb = getBB(env, bb0), { W, H, sc } = env, u = U(env), m = MG(env);
    const o = outE(env); if (o <= 0.003 || env.lt < 0) return;
    const lw = Math.max(1, u), fs = FS(env) * 0.85, arch = (P.v | 0) % 2 === 1;
    const gap = 20 * u + bh(bb) * 0.1;
    let below = !!P.low;
    let y = below ? bb.y1 + gap : bb.y0 - gap;
    if (y < m * 0.6 || y > H - m * 0.6) { below = !below; y = below ? bb.y1 + gap : bb.y0 - gap; }
    const e = E.outExpo(J.clamp(env.lt / 0.55)), e2 = inE(env, 0.35, 0.05);
    const x0 = bb.x0, x1 = bb.x1, cx = (x0 + x1) / 2, sy = below ? 1 : -1;
    const lab = `${Math.round(x1 - x0)}`;
    const lwid = textW(lab, monoF(env), fs, 0.08) + 14 * u;
    const X0 = J.lerp(cx, x0, e), X1 = J.lerp(cx, x1, e);
    // extension lines
    const ext = [[x0, (below ? bb.y1 : bb.y0) + sy * 6 * u, x0, y + sy * 8 * u], [x1, (below ? bb.y1 : bb.y0) + sy * 6 * u, x1, y + sy * 8 * u]];
    segs(env, ext.map(s => [s[0], s[1], s[2], J.lerp(s[1], s[3], e2)]), sc.sub, lw, 0.7 * o);
    // dimension line with a gap for the value
    if (X1 - X0 > lwid) {
      segs(env, [[X0, y, cx - lwid / 2, y], [cx + lwid / 2, y, X1, y]], sc.fg, lw, 0.9 * o);
    }
    const ea = J.clamp((e - 0.7) / 0.3) * o;
    if (arch) segs(env, [[x0 - 5 * u, y + 5 * u, x0 + 5 * u, y - 5 * u], [x1 - 5 * u, y + 5 * u, x1 + 5 * u, y - 5 * u]], sc.fg, 1.6 * u, ea);
    else polys(env, [[[x0, y], [x0 + 10 * u, y - 3.5 * u], [x0 + 10 * u, y + 3.5 * u]], [[x1, y], [x1 - 10 * u, y - 3.5 * u], [x1 - 10 * u, y + 3.5 * u]]], sc.fg, ea);
    label(env, lab, cx, y, { size: fs, align: 'center', color: P.accent ? sc.accent : sc.fg, alpha: e2 * o });
    // height dimension on one side
    if (P.big || (P.v | 0) % 3 === 0) {
      const gx = 20 * u + bw(bb) * 0.02;
      let right = !!P.right, x = right ? bb.x1 + gx : bb.x0 - gx;
      if (x < m || x > W - m) { right = !right; x = right ? bb.x1 + gx : bb.x0 - gx; }
      const sx = right ? 1 : -1, cy = (bb.y0 + bb.y1) / 2;
      const Y0 = J.lerp(cy, bb.y0, e), Y1 = J.lerp(cy, bb.y1, e);
      const labH = `${Math.round(bh(bb))}`, lh = textW(labH, monoF(env), fs, 0.08) + 14 * u;
      const ex2 = [[(right ? bb.x1 : bb.x0) + sx * 6 * u, bb.y0, x + sx * 8 * u, bb.y0], [(right ? bb.x1 : bb.x0) + sx * 6 * u, bb.y1, x + sx * 8 * u, bb.y1]];
      segs(env, ex2.map(s => [s[0], s[1], J.lerp(s[0], s[2], e2), s[3]]), sc.sub, lw, 0.7 * o);
      if (Y1 - Y0 > lh) segs(env, [[x, Y0, x, cy - lh / 2], [x, cy + lh / 2, x, Y1]], sc.fg, lw, 0.9 * o);
      if (arch) segs(env, [[x - 5 * u, bb.y0 + 5 * u, x + 5 * u, bb.y0 - 5 * u], [x - 5 * u, bb.y1 + 5 * u, x + 5 * u, bb.y1 - 5 * u]], sc.fg, 1.6 * u, ea);
      else polys(env, [[[x, bb.y0], [x - 3.5 * u, bb.y0 + 10 * u], [x + 3.5 * u, bb.y0 + 10 * u]], [[x, bb.y1], [x - 3.5 * u, bb.y1 - 10 * u], [x + 3.5 * u, bb.y1 - 10 * u]]], sc.fg, ea);
      label(env, labH, x, cy, { size: fs, align: 'center', rot: -90, color: sc.fg, alpha: e2 * o });
    }
  },
};

/* 通し番号 — a thin numeral "03 / 12" with rolling digits in a free corner */
DEF.indexNum = {
  name: '通し番号', nameEn: 'Index number', tags: ['editorial', 'graphic', 'calm'], w: 1, layer: 'front',
  draw(env, bb0, P) {
    if (env.pass !== 'main') return;
    const bb = getBB(env, bb0), { sc } = env, u = U(env);
    const o = outE(env); if (o <= 0.003 || env.lt < 0) return;
    const lines = env.plan && env.plan.lines ? env.plan.lines.length : 0;
    const idx = env.cut.line >= 0 ? (env.cut.line | 0) + 1 : (env.cut.index | 0) + 1;
    const num = pad2(idx), tot = '/' + pad2(Math.max(lines, idx));
    const font = (P.v | 0) % 2 ? 'mincho_light' : 'gothic_light';
    const S = J.clamp(Math.min(env.W, env.H) * 0.1, 64 * u, 132 * u), ts = S * 0.3;
    const nw = textW(num, font, S, 0.02), tw = textW(tot, font, ts, 0.06);
    const w = nw + tw + S * 0.12, h = S * 1.25;
    const sp = cornerSpot(env, bb, w, h, P, 1.1);
    const a = o * (sp.ok ? 1 : 0.35) * E.outCubic(J.clamp(env.lt / 0.2)), x0 = sp.x, base = sp.y + S * 0.8;
    const ctx = env.ctx, digits = [...num];
    let x = x0;
    // rolling digits (clipped window, main pass only)
    if (env.pass === 'main') {
      digits.forEach((d, i) => {
        const dw = textW(d, font, S, 0.02);
        const p = E.outExpo(J.clamp((env.lt - 0.04 - i * 0.08) / 0.55));
        const steps = P.mode === 'count' ? 6 + i * 3 : 3;
        const off = (1 - p) * steps;                   // how many digits still to roll
        ctx.save(); ctx.beginPath(); ctx.rect(x - 2, base - S * 0.5, dw + 4, S * 0.98); ctx.clip();
        const fl = Math.floor(off), frac = off - fl;
        for (let k = 0; k <= (frac > 0.001 ? 1 : 0); k++) {
          const val = ((+d - (fl + k)) % 10 + 10) % 10, dy = (k - frac) * S * 1.25;
          env.draw({ text: String(val), font, size: S, x: x + dw / 2, y: base + dy, color: sc.fg, align: 'center', track: 0.02, alpha: a * (1 - Math.abs(k - frac) * 0.6), ghost: false });
        }
        ctx.restore();
        x += dw;
      });
    } else x += nw;
    const e2 = inE(env, 0.4, 0.25);
    label(env, tot, x + S * 0.1, base + S * 0.26, { font, size: ts, color: sc.sub, alpha: a * e2, track: 0.06 });
    const ry = base + S * 0.52;
    stroke(env, [[x0, ry], [x0 + w * E.outExpo(J.clamp((env.lt - 0.1) / 0.5)), ry]], sc.sub, Math.max(1, u), 0.8 * a);
    env.rect(x0, ry - 1.5 * u, S * 0.22 * e2, 3 * u, sc.accent, a, false);
    label(env, env.cut.line >= 0 ? 'LYRIC' : 'INTRO', x0, ry + FS(env) * 0.9, { size: FS(env) * 0.72, alpha: a * e2, track: 0.3 });
  },
};

/* 日付写真 — orange seven-segment date imprint like an old film camera */
const SEG = { 0: 'abcdef', 1: 'bc', 2: 'abged', 3: 'abgcd', 4: 'fgbc', 5: 'afgcd', 6: 'afgedc', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg' };
function segDigit(x, y, dw, dh, t, d, sk) {
  const out = [], h2 = dh / 2, k = t / 2;
  const hs = (x0, x1, yy) => [[x0 + k, yy], [x0 + 2 * k, yy - k], [x1 - 2 * k, yy - k], [x1 - k, yy], [x1 - 2 * k, yy + k], [x0 + 2 * k, yy + k]];
  const vs = (xx, y0, y1) => [[xx, y0 + k], [xx + k, y0 + 2 * k], [xx + k, y1 - 2 * k], [xx, y1 - k], [xx - k, y1 - 2 * k], [xx - k, y0 + 2 * k]];
  const S2 = { a: hs(x, x + dw, y), g: hs(x, x + dw, y + h2), d: hs(x, x + dw, y + dh), f: vs(x, y, y + h2), b: vs(x + dw, y, y + h2), e: vs(x, y + h2, y + dh), c: vs(x + dw, y + h2, y + dh) };
  for (const s of SEG[d] || '') out.push([s, S2[s].map(p => [p[0] + (y + dh / 2 - p[1]) * sk, p[1]])]);
  return out;
}
DEF.dateStamp = {
  name: '日付写真', nameEn: 'Date stamp', tags: ['emotional', 'pop', 'calm'], w: 0.7, layer: 'front',
  draw(env, bb0, P) {
    if (env.pass !== 'main') return;
    const bb = getBB(env, bb0), { sc } = env, u = U(env);
    const o = outE(env); if (o <= 0.003 || env.lt < 0) return;
    const yy = J.h(P.seed, 1) % 2 ? 90 + J.h(P.seed, 2) % 10 : J.h(P.seed, 3) % 27, mm = 1 + J.h(P.seed, 4) % 12, dd = 1 + J.h(P.seed, 5) % 28;
    const groups = [pad2(yy), String(mm), pad2(dd)];
    const dh = J.clamp(Math.min(env.W, env.H) * 0.034, 24 * u, 46 * u), dw = dh * 0.52, t = dh * 0.12, gapD = dw * 0.42, gapG = dw * 1.35;
    const width = groups.reduce((s, g) => s + g.length * (dw + gapD), 0) + gapG * 2 + dw * 0.5;
    const sp = cornerSpot(env, bb, width, dh * 1.4, { right: (P.v | 0) % 3 === 2 ? !P.right : true, low: true }, 1.2);
    let x = sp.x + dw * 0.5; const y = sp.y + dh * 0.2;
    const pieces = [];
    pieces.push(['q', [[x - dw * 0.1, y - t * 0.2], [x + t * 0.9, y - t * 0.2], [x + t * 0.2, y + dh * 0.32], [x - dw * 0.1 - t * 0.6, y + dh * 0.32]]]);
    x += dw * 0.35;
    groups.forEach(g => { for (const ch of g) { segDigit(x, y, dw, dh, t, +ch, 0.1).forEach(s => pieces.push(s)); x += dw + gapD; } x += gapG - gapD; });
    const ctx = env.ctx, col = sc.accent;
    if (env.pass !== 'main') return;
    const on = [];
    pieces.forEach((pc, i) => {
      const t0 = 0.05 + J.r(P.seed, i, 7) * 0.35;
      if (env.lt < t0) return;
      const fl = env.lt - t0 < 0.12 ? (J.r(P.seed, i, env.step) < 0.5 ? 0.3 : 1) : 1;
      on.push([pc[1], fl]);
    });
    ctx.save();
    if (env.allowFilter) { ctx.shadowColor = J.rgba(col, 0.8); ctx.shadowBlur = 10 * u * (env.scale || 1); }
    polys(env, on.filter(p => p[1] === 1).map(p => p[0]), col, 0.92 * o * (sp.ok ? 1 : 0.4));
    polys(env, on.filter(p => p[1] !== 1).map(p => p[0]), col, 0.3 * o);
    ctx.restore();
  },
};

/* QR風 — a QR-like module block that scans in, with finder squares */
DEF.qrBlock = {
  name: 'QR風ブロック', nameEn: 'QR block', tags: ['graphic', 'glitch', 'pop'], w: 0.7, layer: 'front',
  draw(env, bb0, P) {
    if (env.pass !== 'main') return;
    const bb = getBB(env, bb0), { sc } = env, u = U(env);
    const o = outE(env); if (o <= 0.003 || env.lt < 0) return;
    const N = 21, S = J.clamp(Math.min(env.W, env.H) * 0.1, 76 * u, 140 * u), c = S / N, fs = FS(env) * 0.72;
    const sp = cornerSpot(env, bb, S, S + fs * 2, P, 1.1);
    const x0 = sp.x, y0 = sp.y, a = o * (sp.ok ? 1 : 0.35);
    const e = J.clamp(env.lt / 0.55), pOut = env.pOut;
    const fg = [], acc = [];
    const finder = (i, j) => { for (const [fi, fj] of [[0, 0], [N - 7, 0], [0, N - 7]]) { const di = i - fi, dj = j - fj; if (di >= 0 && di < 7 && dj >= 0 && dj < 7) { const r = Math.max(Math.abs(di - 3), Math.abs(dj - 3)); return r === 3 || r <= 1 ? (r <= 1 ? 2 : 1) : 0; } } return -1; };
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      let f = finder(i, j);
      if (f === -1) {
        if ((i === 7 || j === 7) && (i < 8 && j < 8 || i > N - 9 && j < 8 || i < 8 && j > N - 9)) f = 0;
        else if (i === 6 || j === 6) f = (i + j) % 2 === 0 ? 1 : 0;
        else f = J.r(P.seed, i, j, 3) < 0.48 ? 1 : 0;
      }
      if (!f) continue;
      const d = (i + j) / (2 * N - 2);
      if (d > e * 1.25 - 0.1 + (J.r(P.seed, i, j, 9) - 0.5) * 0.1) continue;
      if (pOut > 0 && J.r(P.seed, i, j, 11) < pOut * 1.1) continue;
      (f === 2 && P.accent ? acc : fg).push([x0 + i * c, y0 + j * c, c + 0.35, c + 0.35]);
    }
    rects(env, fg, sc.fg, a);
    rects(env, acc, sc.accent, a);
    // scan line during the build
    if (e < 1) { const sy = y0 + S * e * 1.1; if (sy < y0 + S) stroke(env, [[x0 - 6 * u, sy], [x0 + S + 6 * u, sy]], sc.accent, 1.5 * u, a); }
    label(env, `ID ${(J.h(P.seed, 12) % 0xffffff).toString(16).toUpperCase().padStart(6, '0')}`, x0, y0 + S + fs * 1.2, { size: fs, alpha: a * inE(env, 0.3, 0.4), track: 0.14 });
  },
};

/* グリッチ片 — flickering data slivers and hollow frames hugging the lyric's sides */
DEF.glitchRects = {
  name: 'グリッチ片', nameEn: 'Glitch shards', tags: ['glitch'], w: 0.9, layer: 'front',
  draw(env, bb0, P) {
    const bb = getBB(env, bb0), { W, H, sc } = env, u = U(env);
    const o = outE(env); if (o <= 0.003 || env.lt < 0) return;
    const burst = Math.max(1 - J.clamp(env.lt / 0.45), env.pOut > 0 ? 1 - env.pOut * 0.6 : 0);
    const st = env.step, idle = (J.h(P.seed, st, 1) % 5) === 0;
    const n = Math.round((burst > 0 ? 7 + 6 * burst : idle ? 3 : 1) * (0.7 + 0.2 * (P.n | 0)));
    const gap = 10 * u + bh(bb) * 0.06;
    const cols = [sc.fg, sc.accent, sc.ghostA || sc.accent, sc.ghostB || sc.sub];
    const solid = [[], [], [], []], hollow = [];
    for (let i = 0; i < n; i++) {
      const r = k => J.r(P.seed, st, i, k);
      const right = r(1) < 0.5, h = (1.5 + r(3) * 9) * u, room = right ? W - bb.x1 - gap : bb.x0 - gap;
      let w = (18 + r(4) * r(4) * 220) * u, x, y;
      if (room > 60 * u && r(8) < 0.75) {
        y = J.lerp(bb.y0, bb.y1, r(2)); w = Math.min(w, room - 8 * u);
        x = right ? bb.x1 + gap + r(5) * Math.max(0, room - w - 8 * u) * 0.5 : bb.x0 - gap - w - r(5) * Math.max(0, room - w - 8 * u) * 0.5;
      } else {                                   // cramped sides: hug the top / bottom edge instead
        const top = r(9) < 0.5; y = top ? bb.y0 - gap - r(2) * 40 * u : bb.y1 + gap + r(2) * 40 * u;
        x = J.lerp(bb.x0, bb.x1 - w, r(5));
      }
      x = J.clamp(x, 4 * u, W - w - 4 * u);
      if (hitBB(x, y, x + w, y + h, bb, 2)) continue;
      if (r(6) < 0.25) hollow.push([x, y - h * 1.5, w * 0.7, h * 3.5]);
      else solid[Math.floor(r(7) * 4)].push([x, y, w, h]);
    }
    solid.forEach((l, k) => rects(env, l, cols[k], 0.9 * o, k < 2));
    for (const hr of hollow) stroke(env, [[hr[0], hr[1]], [hr[0] + hr[2], hr[1]], [hr[0] + hr[2], hr[1] + hr[3]], [hr[0], hr[1] + hr[3]]], sc.fg, Math.max(1, u), 0.8 * o, false, { close: true });
    if (burst > 0.2 || idle) {
      const r = k => J.r(P.seed, st, 99, k), right = r(1) < 0.5;
      const x = right ? bb.x1 + gap : bb.x0 - gap, y = J.lerp(bb.y0, bb.y1, r(2));
      label(env, `0x${(J.h(P.seed, st, 5) % 0xffff).toString(16).toUpperCase().padStart(4, '0')}`, x, y - 10 * u, { size: FS(env) * 0.75, align: right ? 'left' : 'right', color: sc.accent, alpha: o });
    }
  },
};

/* ============================================================
   geometry
   ============================================================ */

/* 同心四角 — nested hairline squares: a slow twist or an endless tunnel */
DEF.concentricSquares = {
  name: '同心四角', nameEn: 'Concentric squares', tags: ['graphic', 'calm', 'editorial'], w: 1, layer: 'front',
  draw(env, bb0, P) {
    if (env.pass !== 'main') return;
    const bb = getBB(env, bb0), { sc } = env, u = U(env);
    const o = outE(env); if (o <= 0.003 || env.lt < 0) return;
    const S = J.clamp(Math.min(env.W, env.H) * 0.17, 100 * u, 220 * u);
    const sp = P.corner ? cornerSpot(env, bb, S * 1.2, S * 1.2, P) : nearBB(env, bb, S * 1.2, S * 1.2, P, 24 * u);
    const cx = sp.cx, cy = sp.cy, n = 5 + (P.n | 0), lw = Math.max(1, 1.2 * u), tunnel = (P.v | 0) % 2 === 1;
    const a = o * (sp.ok ? 1 : 0.35);
    for (let i = 0; i < n; i++) {
      let s, rot, al = 1;
      if (tunnel) { const f = ((i / n + env.ltb * 0.18) % 1); s = S * 0.5 * (0.08 + 0.92 * f); rot = 45 * (P.r > 0.5 ? 1 : 0); al = Math.sin(Math.PI * f); }
      else { s = S * 0.5 * (1 - i / n * 0.86); rot = i * (6 + P.r * 8) + env.ltb * 7 * (P.right ? 1 : -1); }
      const e = E.outExpo(J.clamp((env.lt - i * 0.045) / 0.5));
      if (e <= 0) continue;
      const pts = [];
      for (let k = 0; k <= 4; k++) { const an = (rot + 45 + k * 90) * DEG; pts.push([cx + Math.cos(an) * s * Math.SQRT2, cy + Math.sin(an) * s * Math.SQRT2]); }
      stroke(env, part(pts, 0, e), i === (P.n | 0) ? sc.accent : sc.fg, i === (P.n | 0) ? lw * 1.6 : lw, a * al * (0.45 + 0.55 * (1 - i / n)));
    }
    env.circle(cx, cy, 2.4 * u, sc.accent, null, 0, a * inE(env, 0.3, 0.3), false);
  },
};

/* 回転三角 — a huge hairline triangle whose edges circle clear of the lyric, or a counter-rotating pair with an orbiting solid */
DEF.triangleSpin = {
  name: '回転三角', nameEn: 'Spinning triangle', tags: ['graphic', 'pop', 'glitch'], w: 0.9, layer: 'front',
  draw(env, bb0, P) {
    const bb = getBB(env, bb0), { W, H, sc } = env, u = U(env);
    const o = outE(env); if (o <= 0.003 || env.lt < 0) return;
    const e = E.outExpo(J.clamp(env.lt / 0.6)), lw = Math.max(1, 1.4 * u);
    const tri = (cx, cy, R, rot) => { const p = []; for (let k = 0; k <= 3; k++) { const an = (rot - 90 + k * 120) * DEG; p.push([cx + Math.cos(an) * R, cy + Math.sin(an) * R]); } return p; };
    const dir = P.right ? 1 : -1;
    const rin = Math.hypot(bw(bb) / 2, bh(bb) / 2) + 18 * u;
    if (P.big && rin * 2 < Math.max(W, H) * 0.62) {          // one big triangle whose edges stay clear of the lyric
      const cx = (bb.x0 + bb.x1) / 2, cy = (bb.y0 + bb.y1) / 2, R = rin * 2 * (1 + 0.08 * E.inCubic(env.pOut));
      const rot = dir * ((1 - e) * -70 + env.ltb * 5) + P.r * 120;
      if (env.pass !== 'main') return;
      stroke(env, part(tri(cx, cy, R, rot), 0, e), sc.fg, lw, 0.75 * o);
      stroke(env, part(tri(cx, cy, R * 1.07, -rot * 0.6 + 60), 0, E.outExpo(J.clamp((env.lt - 0.12) / 0.6))), P.accent ? sc.accent : sc.sub, lw, 0.45 * o);
      return;
    }
    // counter-rotating concentric pair + a small solid triangle orbiting them
    const S = J.clamp(Math.min(W, H) * 0.19, 110 * u, 230 * u);
    const sp = P.corner ? cornerSpot(env, bb, S, S, P) : nearBB(env, bb, S, S, P, 24 * u), a = o * (sp.ok ? 1 : 0.35);
    const cx = sp.cx, cy = sp.cy + S * 0.06, R = S * 0.42;
    const r1 = dir * (env.ltb * 16 + (1 - e) * -90) + P.r * 120, r2 = -dir * (env.ltb * 24 + (1 - e) * -140) + 60;
    stroke(env, part(tri(cx, cy, R, r1), 0, e), sc.fg, lw * 1.1, a);
    stroke(env, part(tri(cx, cy, R * 0.62, r2), 0, E.outExpo(J.clamp((env.lt - 0.1) / 0.6))), sc.sub, lw, 0.8 * a);
    const q = E.outBack(J.clamp((env.lt - 0.25) / 0.35), 1.8);
    if (q > 0) {
      const an = (env.ltb * 50 * dir + P.r * 360) * DEG, rr = R * 1.18;
      polys(env, [tri(cx + Math.cos(an) * rr, cy + Math.sin(an) * rr, R * 0.13 * q, env.ltb * 90 * dir)], sc.accent, a, true);
    }
    env.circle(cx, cy, 2.2 * u, sc.accent, null, 0, a * e, false);
  },
};

/* 放射線 — short emphasis dashes radiating from the lyric's outline */
const superR = (a, b, p, th) => { const c = Math.abs(Math.cos(th)), s = Math.abs(Math.sin(th)); return 1 / Math.pow(Math.pow(c / a, p) + Math.pow(s / b, p), 1 / p); };
DEF.lineBurst = {
  name: '放射線', nameEn: 'Radial burst lines', tags: ['pop', 'graphic', 'emotional'], w: 1.1, layer: 'front',
  draw(env, bb0, P) {
    const bb = getBB(env, bb0), { sc } = env, u = U(env);
    const o = outE(env); if (o <= 0.003 || env.lt < 0 || env.pass !== 'main') return;
    const cx = (bb.x0 + bb.x1) / 2, cy = (bb.y0 + bb.y1) / 2, pad = 18 * u + bh(bb) * 0.14;
    const A = bw(bb) / 2 * 1.08 + pad, B = bh(bb) / 2 * 1.12 + pad;
    // sample the outline and space the dashes evenly along its length
    const M = 180, pts = [], cum = [0];
    for (let i = 0; i <= M; i++) { const th = i / M * TAU, r = superR(A, B, 4, th); pts.push([cx + Math.cos(th) * r, cy + Math.sin(th) * r]); if (i) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])); }
    const L = cum[M], N = Math.round(J.clamp(L / (34 * u), 24, 76) * (0.8 + 0.1 * (P.n | 0)));
    const beat = env.beat ? Math.exp(-env.beat.since * 7) : 0.5 + 0.5 * Math.sin(env.ltb * 5);
    const main = [], acc = [], pOut = E.inCubic(env.pOut);
    let j = 1;
    for (let i = 0; i < N; i++) {
      const s = ((i + 0.5 + J.rs(P.seed, i, 1) * 0.3) / N) * L;
      while (j < M && cum[j] < s) j++;
      const k = (s - cum[j - 1]) / Math.max(1e-6, cum[j] - cum[j - 1]), p = L2(pts[j - 1], pts[j], k);
      let tx = pts[j][0] - pts[j - 1][0], ty = pts[j][1] - pts[j - 1][1]; const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
      let nx = ty, ny = -tx; if (nx * (p[0] - cx) + ny * (p[1] - cy) < 0) { nx = -nx; ny = -ny; }
      const len = J.rr(10, 30, P.seed, i, 3) * u * (P.big ? 1.5 : 1) * (1 + 0.2 * beat * J.r(P.seed, i, 4));
      const sE = E.outExpo(J.clamp((env.lt - J.r(P.seed, i, 5) * 0.18) / 0.35));
      if (sE <= 0) continue;
      const d0 = J.r(P.seed, i, 2) * 8 * u + pOut * 60 * u, d1 = d0 + len * sE;
      (i % 6 === 0 ? acc : main).push([p[0] + nx * d0, p[1] + ny * d0, p[0] + nx * d1, p[1] + ny * d1]);
    }
    segs(env, main, sc.fg, 1.6 * u, 0.85 * o, false, 'round');
    segs(env, acc, sc.accent, 2.4 * u, o, false, 'round');
  },
};

/* プラス格子 — a precise grid of + marks with a scanning highlight */
DEF.plusGrid = {
  name: 'プラス格子', nameEn: 'Plus grid', tags: ['graphic', 'editorial', 'calm'], w: 1, layer: 'front',
  draw(env, bb0, P) {
    if (env.pass !== 'main') return;
    const bb = getBB(env, bb0), { sc } = env, u = U(env);
    const o = outE(env); if (o <= 0.003 || env.lt < 0) return;
    const cols = 4 + (P.n | 0) + ((P.v | 0) % 3), rows = 2 + ((P.v | 0) % 2) + (P.big ? 1 : 0);
    const s = J.clamp(Math.min(env.W, env.H) * 0.034, 24 * u, 44 * u), ps = s * 0.22;
    const w = (cols - 1) * s + ps * 2, h = (rows - 1) * s + ps * 2;
    const sp = P.corner ? cornerSpot(env, bb, w, h, P) : nearBB(env, bb, w, h, P, 26 * u);
    const a = o * (sp.ok ? 1 : 0.35), list = [], hl = Math.floor(env.ltb * 7 + P.r * 50) % (cols * rows);
    let hx = 0, hy = 0;
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const q = E.outBack(J.clamp((env.lt - (i + j) * 0.03) / 0.3), 2);
      if (q <= 0) continue;
      const x = sp.x + ps + i * s, y = sp.y + ps + j * s, k = ps * q;
      if (j * cols + i === hl && env.lt > 0.5) { hx = x; hy = y; continue; }
      list.push([x - k, y, x + k, y], [x, y - k, x, y + k]);
    }
    segs(env, list, sc.sub, Math.max(1, 1.3 * u), a);
    if (hx) { const k = ps * 1.5; segs(env, [[hx - k, hy - k, hx + k, hy + k], [hx - k, hy + k, hx + k, hy - k]], sc.accent, 1.8 * u, a); }
  },
};

/* ガイド線 — dashed layout guides along the lyric's edges, with handles and readouts */
DEF.guides = {
  name: 'ガイド線', nameEn: 'Guide lines', tags: ['editorial', 'graphic', 'calm'], w: 1, layer: 'front',
  draw(env, bb0, P) {
    if (env.pass !== 'main') return;
    const bb = getBB(env, bb0), { W, H, sc } = env, u = U(env);
    const o = outE(env); if (o <= 0.003 || env.lt < 0) return;
    const pad = 10 * u + bh(bb) * 0.05, e = E.outExpo(J.clamp(env.lt / 0.6)), lw = Math.max(1, 1.1 * u);
    const X0 = bb.x0 - pad, X1 = bb.x1 + pad, Y0 = bb.y0 - pad, Y1 = bb.y1 + pad, cx = (X0 + X1) / 2, cy = (Y0 + Y1) / 2;
    const col = P.accent ? sc.accent : (sc.accent2 && J.contrast(sc.accent2, sc.bg) > 2 ? sc.accent2 : sc.accent);
    const hw = W * 0.55 * e, hh = H * 0.55 * e, a = 0.75 * o;
    const vert = P.big || (P.v | 0) % 2 === 1 || bh(bb) > bw(bb);
    for (const y of [Y0, Y1]) if (y > 0 && y < H) dash(env, cx - hw, y, cx + hw, y, 7 * u, 5 * u, col, lw, a);
    if (vert) for (const x of [X0, X1]) if (x > 0 && x < W) dash(env, x, cy - hh, x, cy + hh, 7 * u, 5 * u, col, lw, a);
    const ea = inE(env, 0.3, 0.3) * o, hs = 3.5 * u;
    for (const [x, y] of [[X0, Y0], [X1, Y0], [X0, Y1], [X1, Y1]]) {
      stroke(env, [[x - hs, y - hs], [x + hs, y - hs], [x + hs, y + hs], [x - hs, y + hs]], sc.fg, lw, ea, false, { close: true });
    }
    const fs = FS(env) * 0.75, m = MG(env) * 0.5;
    label(env, `Y ${pad2(Y0, 4)}`, m, Y0 - fs * 0.8, { size: fs, color: col, alpha: ea });
    label(env, `Y ${pad2(Y1, 4)}`, m, Y1 + fs * 0.9, { size: fs, color: col, alpha: ea });
    if (vert) label(env, `X ${pad2(X1, 4)}`, X1 + 6 * u, m + fs * 0.6, { size: fs, color: col, alpha: ea });
  },
};

/* 波線 — a long, precise sine hairline pair drifting across the free band */
function freeBand(env, bb, low) {
  const { H } = env, m = MG(env);
  const above = bb.y0 - m * 0.5, below = H - m * 0.5 - bb.y1;
  let lo = low;
  if ((lo ? below : above) < 60 * U(env) && (lo ? above : below) > (lo ? below : above)) lo = !lo;
  const room = lo ? below : above;
  const d = Math.min(room * 0.5, 40 * U(env) + room * 0.22);
  return { low: lo, room, y: lo ? bb.y1 + d : bb.y0 - d };
}
DEF.waveLine = {
  name: '波線', nameEn: 'Wave line', tags: ['calm', 'emotional', 'graphic'], w: 1, layer: 'front',
  draw(env, bb0, P) {
    if (env.pass !== 'main') return;
    const bb = getBB(env, bb0), { W, sc } = env, u = U(env), m = MG(env);
    const o = outE(env); if (o <= 0.003 || env.lt < 0) return;
    const fb = freeBand(env, bb, !!P.low); if (fb.room < 30 * u) return;
    const A = J.clamp(fb.room * 0.1, 5 * u, 14 * u), lam = J.clamp(Math.min(W, env.H) * 0.07, 44 * u, 96 * u);
    const dir = P.right ? 1 : -1, ph = env.ltb * 2.4 * dir, x0 = m, x1 = W - m;
    const e = E.inOutCubic(J.clamp(env.lt / 0.7)), pOut = E.inCubic(env.pOut);
    const mk = (amp, off) => { const p = []; for (let x = x0; x <= x1 + 0.1; x += 6 * u) { const env2 = Math.min(1, (x - x0) / (lam * 1.5), (x1 - x) / (lam * 1.5)); p.push([x, fb.y + Math.sin((x - x0) / lam * TAU + ph + off) * amp * env2]); } return p; };
    if ((P.v | 0) % 3 === 2) {
      const pts = mk(A, 0), d = [];
      for (let i = 0; i < pts.length; i += 2) { const f = i / pts.length; if (f <= e && f >= pOut) d.push([pts[i][0], pts[i][1], 1.8 * u]); }
      dots(env, d, sc.fg, 0.85 * o);
    } else {
      stroke(env, part(mk(A, 0), pOut, e), sc.fg, 1.4 * u, 0.85 * o);
      stroke(env, part(mk(A * 0.55, Math.PI * 0.6), pOut, E.inOutCubic(J.clamp((env.lt - 0.12) / 0.7))), P.accent ? sc.accent : sc.sub, Math.max(1, u), 0.6 * o);
    }
  },
};

/* 渦巻き — an Archimedean or square spiral drawn on from its centre */
DEF.spiralLine = {
  name: '渦巻き', nameEn: 'Spiral', tags: ['graphic', 'pop', 'calm'], w: 0.8, layer: 'front',
  draw(env, bb0, P) {
    if (env.pass !== 'main') return;
    const bb = getBB(env, bb0), { sc } = env, u = U(env);
    const o = outE(env); if (o <= 0.003 || env.lt < 0) return;
    const R = J.clamp(Math.min(env.W, env.H) * 0.085, 54 * u, 104 * u);
    const sp = nearBB(env, bb, R * 2.3, R * 2.3, P, 20 * u), cx = sp.cx, cy = sp.cy, a = o * (sp.ok ? 1 : 0.35);
    const turns = 3 + (P.n | 0) * 0.5, pts = [], sq = (P.v | 0) % 2 === 1;
    const rot = env.ltb * 18 * (P.right ? 1 : -1) * DEG + P.r * TAU;
    if (sq) {
      const n = Math.round(turns * 4), d = R / (n / 2);
      let x = 0, y = 0; pts.push([0, 0]);
      for (let k = 0; k < n; k++) { const L = d * (Math.floor(k / 2) + 1), dirs = [[1, 0], [0, 1], [-1, 0], [0, -1]][k % 4]; x += dirs[0] * L; y += dirs[1] * L; pts.push([x, y]); }
    } else {
      const M = Math.round(turns * 40);
      for (let k = 0; k <= M; k++) { const th = k / M * turns * TAU, r = R * k / M; pts.push([Math.cos(th) * r, Math.sin(th) * r]); }
    }
    const tp = pts.map(([x, y]) => [cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)]);
    const e = E.inOutCubic(J.clamp(env.lt / 0.7)), pOut = E.inCubic(env.pOut);
    const seg = part(tp, pOut, e);
    stroke(env, seg, sc.fg, 1.4 * u, 0.85 * a, false, { cap: 'round', join: 'round' });
    if (seg.length) { const q = seg[seg.length - 1]; env.circle(q[0], q[1], 3.2 * u, sc.accent, null, 0, a, false); }
  },
};

/* 網点 — a halftone (dot or line screen) gradient bleeding from a screen corner, under the lyric */
DEF.halftonePatch = {
  name: '網点', nameEn: 'Halftone', tags: ['graphic', 'pop', 'editorial'], w: 1, layer: 'back', subtle: true,
  draw(env, bb, P) {
    const { W, H, sc } = env, u = U(env);
    const o = outE(env); if (o <= 0.003 || env.lt < 0 || env.pass !== 'main') return;
    const sx = P.right ? 1 : -1, sy = P.low ? 1 : -1, ox = sx > 0 ? W : 0, oy = sy > 0 ? H : 0;
    const pw = W * J.rr(0.38, 0.58, P.seed, 1), ph = H * J.rr(0.38, 0.6, P.seed, 2);
    let g = J.clamp(Math.min(W, H) * 0.018, 12 * u, 22 * u);
    while ((pw / g) * (ph / g) > 1100) g *= 1.15;
    const col = P.accent ? sc.accent : sc.sub, al = (P.accent ? 0.3 : 0.2) * (dark(env) ? 1 : 0.8) * o;
    const lines = (P.v | 0) % 2 === 1;
    const grow = J.clamp(env.lt / 0.7) * 1.3;
    const f = (x, y) => { const d = Math.hypot((x - ox) / pw, (y - oy) / ph); return J.clamp(1 - d) * J.clamp((grow - d) * 3); };
    if (lines) {
      const list = [];
      for (let y = oy - sy * g * 0.5; Math.abs(y - oy) < ph; y -= sy * g) {
        const top = [], bot = [];
        for (let x = ox; Math.abs(x - ox) <= pw; x -= sx * g * 0.5) { const t = g * 0.46 * Math.pow(f(x, y), 1.1); top.push([x, y - t]); bot.push([x, y + t]); }
        list.push(top.concat(bot.reverse()));
      }
      polys(env, list, col, al);
    } else {
      const list = []; let row = 0;
      for (let y = oy - sy * g * 0.5; Math.abs(y - oy) < ph; y -= sy * g, row++) {
        for (let x = ox - sx * (row % 2 ? g : g * 0.5); Math.abs(x - ox) <= pw; x -= sx * g) { const r = g * 0.5 * Math.pow(f(x, y), 1.2); if (r > 0.4) list.push([x, y, r]); }
      }
      dots(env, list, col, al);
    }
  },
};

/* 市松 — a small checkerboard band that wipes open and scrolls */
DEF.checkerStrip = {
  name: '市松の帯', nameEn: 'Checker bands', tags: ['pop', 'graphic'], w: 0.8, layer: 'front',
  draw(env, bb0, P) {
    if (env.pass !== 'main') return;
    const bb = getBB(env, bb0), { W, sc } = env, u = U(env);
    const o = outE(env); if (o <= 0.003 || env.lt < 0) return;
    const v = (P.v | 0) % 3, rows = v === 1 ? 3 : v === 2 ? 1 : 2;
    const c = J.clamp(Math.min(W, env.H) * 0.016, 10 * u, 18 * u), L = Math.min(W * 0.32, 400 * u), h = rows * c;
    const sp = cornerSpot(env, bb, L, h + (v === 2 ? 10 * u : 0), P, 1);
    const a = o * (sp.ok ? 1 : 0.35), x0 = sp.x, y0 = sp.y + (v === 2 ? 5 * u : 0);
    const e = E.outExpo(J.clamp(env.lt / 0.55)), vis = L * e, off = (env.ltb * c * 1.6 * (P.right ? -1 : 1)) % (2 * c);
    const list = [];
    for (let j = 0; j < rows; j++) for (let i = -2; i * c < L + 2 * c; i++) {
      if ((i + j) % 2 !== 0) continue;
      let x = x0 + i * c + off, w = c;
      const k = v === 1 ? J.clamp(1 - (i * c) / L * 0.95) : 1;
      const cw = w * k, ch = c * k, cx0 = x + (w - cw) / 2;
      const xa = Math.max(cx0, x0), xb = Math.min(cx0 + cw, x0 + vis);
      if (xb <= xa) continue;
      list.push([xa, y0 + j * c + (c - ch) / 2, xb - xa, ch]);
    }
    rects(env, list, P.accent ? sc.accent : sc.fg, 0.9 * a);
    if (v === 2) { const lw = Math.max(1, u); segs(env, [[x0, y0 - 5 * u, x0 + vis, y0 - 5 * u], [x0, y0 + h + 5 * u, x0 + vis, y0 + h + 5 * u]], sc.fg, lw, 0.8 * a); }
  },
};

/* 拍の輪 — thin rings that ripple outward from the centre on every beat (under the lyric) */
DEF.beatRing = {
  name: '拍の輪', nameEn: 'Beat ring', tags: ['pop', 'emotional', 'calm'], w: 1, layer: 'back', subtle: true,
  draw(env, bb, P) {
    if (env.pass !== 'main') return;
    const { W, H, sc } = env, u = U(env);
    const o = outE(env) * inE(env, 0.4, 0, E.outCubic); if (o <= 0.003 || env.lt < 0) return;
    let since, len;
    if (env.beat) { since = env.beat.since; len = env.beat.len; } else { len = 0.5; since = ((env.ltb % len) + len) % len; }
    const cx = W / 2, cy = H / 2, r0 = Math.min(W, H) * 0.2, r1 = Math.hypot(W, H) * 0.55;
    const col = P.accent ? sc.accent : sc.sub, base = (P.accent ? 0.45 : 0.4) * o, dashed = (P.v | 0) % 2 === 1;
    for (let k = 0; k < 3; k++) {
      const p = (since + k * len) / (len * 3); if (p >= 1) continue;
      const r = J.lerp(r0, r1, E.outCubic(p)), al = base * Math.pow(1 - p, 1.6);
      if (dashed) { for (let s = 0; s < 48; s++) env.arc(cx, cy, r, s * 7.5, s * 7.5 + 4, col, 1.4 * u, al, false); }
      else env.circle(cx, cy, r, null, col, (1 + 1.5 * (1 - p)) * u, al, false);
    }
    const pulse = Math.exp(-since * 9);
    env.circle(cx, cy, r0 * (1 + 0.03 * pulse), null, col, (1 + 2.2 * pulse) * u, base * 0.6, false);
  },
};

/* 周回する点 — a tilted orbit around the lyric; dots and trails pass "behind" the text */
DEF.orbitDots = {
  name: '周回する点', nameEn: 'Orbiting dots', tags: ['calm', 'emotional', 'graphic'], w: 1, layer: 'front',
  draw(env, bb0, P) {
    if (env.pass !== 'main') return;
    const bb = getBB(env, bb0), { W, sc } = env, u = U(env);
    const o = outE(env); if (o <= 0.003 || env.lt < 0) return;
    const cx = (bb.x0 + bb.x1) / 2, cy = (bb.y0 + bb.y1) / 2;
    const tall = bh(bb) > bw(bb) * 1.2;
    const rx = tall ? Math.max(bw(bb) * 0.9, 50 * u) : Math.min(bw(bb) / 2 + 50 * u + bw(bb) * 0.08, W * 0.47);
    const ry = tall ? Math.min(bh(bb) / 2 + 50 * u + bh(bb) * 0.08, env.H * 0.47) : Math.max(bh(bb) * 0.9, 50 * u);
    const tilt = (P.r - 0.5) * 22 * DEG, ct = Math.cos(tilt), st = Math.sin(tilt);
    const pt = th => { const x = Math.cos(th) * rx, y = Math.sin(th) * ry; return [cx + x * ct - y * st, cy + x * st + y * ct]; };
    const pad = 8 * u, inside = p => p[0] > bb.x0 - pad && p[0] < bb.x1 + pad && p[1] > bb.y0 - pad && p[1] < bb.y1 + pad;
    const e = E.inOutCubic(J.clamp(env.lt / 0.7)), th0 = P.r * TAU;
    // orbit path, skipping the parts hidden by the lyric
    const M = 160, segsL = [];
    let prev = null;
    for (let k = 0; k <= M * e; k++) { const p = pt(th0 + k / M * TAU); if (prev && !inside(p) && !inside(prev)) segsL.push([prev[0], prev[1], p[0], p[1]]); prev = p; }
    segs(env, segsL, sc.sub, Math.max(1, u), 0.55 * o);
    const nd = 2 + (P.n | 0) % 3, dir = P.right ? 1 : -1;
    for (let d = 0; d < nd; d++) {
      const w = (0.35 + d * 0.22) * dir * (1 + 2 * E.inCubic(env.pOut));
      const th = th0 + d * TAU / nd + env.ltb * w, sz = (d === 0 ? 5 : 3.2) * u;
      const trail = [];
      for (let k = 0; k < 10; k++) { const a1 = th - k * 0.045 * Math.sign(w), a2 = th - (k + 1) * 0.045 * Math.sign(w); const p1 = pt(a1), p2 = pt(a2); if (!inside(p1) && !inside(p2)) trail.push([p1, p2, 1 - k / 10]); }
      for (const [p1, p2, f] of trail) stroke(env, [p1, p2], d === 0 ? sc.accent : sc.fg, sz * 0.8 * f, 0.6 * f * o * e);
      const p = pt(th);
      if (!inside(p)) env.circle(p[0], p[1], sz * e, d === 0 ? sc.accent : sc.fg, null, 0, o, false);
    }
  },
};

/* 星座 — a small constellation: stars joined by hairlines, drawn in sequence */
DEF.constellation = {
  name: '星座', nameEn: 'Constellation', tags: ['calm', 'emotional', 'editorial'], w: 0.9, layer: 'front',
  draw(env, bb0, P) {
    if (env.pass !== 'main') return;
    const bb = getBB(env, bb0), { sc } = env, u = U(env);
    const o = outE(env); if (o <= 0.003 || env.lt < 0) return;
    const w = J.clamp(Math.min(env.W, env.H) * 0.3, 190 * u, 340 * u), h = w * 0.62;
    const sp = P.corner ? cornerSpot(env, bb, w, h, P) : nearBB(env, bb, w, h, P, 30 * u), a = o * (sp.ok ? 1 : 0.35);
    const n = 5 + (P.n | 0), cells = [];
    for (let i = 0; i < 12; i++) cells.push([i % 4, Math.floor(i / 4), J.r(P.seed, i, 1)]);
    cells.sort((a, b) => a[2] - b[2]);
    const raw = cells.slice(0, n).map(([cx, cy], i) => [sp.x + w * (cx + 0.5 + J.rs(P.seed, i, 2) * 0.35) / 4, sp.y + h * (cy + 0.5 + J.rs(P.seed, i, 3) * 0.35) / 3]);
    raw.sort((a, b) => a[0] - b[0]);
    const pts = [raw.shift()];
    while (raw.length) { const q = pts[pts.length - 1]; let bi = 0, bd = 1e18; raw.forEach((r, i) => { const d = (r[0] - q[0]) ** 2 + (r[1] - q[1]) ** 2; if (d < bd) { bd = d; bi = i; } }); pts.push(raw.splice(bi, 1)[0]); }
    const path = pts.slice();
    const branch = [pts[Math.floor(n / 2)], [sp.x + w * J.rr(0.3, 0.7, P.seed, 9), sp.y + h * (pts[Math.floor(n / 2)][1] - sp.y > h / 2 ? 0.08 : 0.92)]];
    const e = E.inOutCubic(J.clamp((env.lt - 0.1) / 0.8));
    stroke(env, part(path, 0, e), sc.sub, Math.max(1, u), 0.7 * a);
    stroke(env, part(branch, 0, J.clamp((env.lt - 0.6) / 0.4)), sc.sub, Math.max(1, u), 0.7 * a);
    const all = pts.concat([branch[1]]), stars = [], big = [];
    all.forEach((p, i) => {
      const q = E.outBack(J.clamp((env.lt - i * 0.06) / 0.3), 2);
      if (q <= 0) return;
      const tw = 0.65 + 0.35 * J.noise1(env.ltb * 2.5 + i * 3, P.seed);
      const r = (J.r(P.seed, i, 4) < 0.3 ? 3.6 : 2.2) * u * q;
      stars.push([p[0], p[1], r]);
      if (r > 3 * u * q && i % 2 === 0) big.push([p, tw]);
    });
    dots(env, stars, sc.fg, a);
    for (const [p, tw] of big) { const L = 11 * u * tw; segs(env, [[p[0] - L, p[1], p[0] + L, p[1]], [p[0], p[1] - L, p[0], p[1] + L]], sc.accent, Math.max(1, u), a * tw); }
    label(env, `C-${pad2((env.cut.line | 0) + 1)}`, all[0][0] + 8 * u, all[0][1] - 12 * u, { size: FS(env) * 0.72, alpha: a * inE(env, 0.3, 0.5) });
  },
};

/* ============================================================
   organic / atmosphere
   ============================================================ */
/* alpha that fades a particle out near the lyric (front particles never cover it) */
const clearOf = (bb, x, y, pad, soft) => { const dx = Math.max(bb.x0 - pad - x, 0, x - bb.x1 - pad), dy = Math.max(bb.y0 - pad - y, 0, y - bb.y1 - pad); return J.clamp(Math.hypot(dx, dy) / soft); };
const wrap = (v, lo, span) => lo + (((v - lo) % span) + span) % span;

/* 紙吹雪 — tumbling confetti drifting down around (never over) the lyric */
DEF.confetti = {
  name: '紙吹雪', nameEn: 'Confetti', tags: ['pop', 'emotional'], w: 0.9, layer: 'front',
  draw(env, bb0, P) {
    if (env.pass !== 'main') return;
    const bb = getBB(env, bb0), { W, H, sc } = env, u = U(env);
    const o = outE(env); if (o <= 0.003 || env.lt < 0) return;
    const N = Math.min(56, 26 + (P.n | 0) * 9), cols = [sc.accent, sc.accent2 || sc.fg, sc.fg, sc.sub], buckets = [[], [], [], []];
    const pad = 10 * u, soft = 24 * u;
    for (let i = 0; i < N; i++) {
      const r = k => J.r(P.seed, i, k);
      const q = E.outBack(J.clamp((env.lt - r(1) * 0.35) / 0.3), 1.8);
      if (q <= 0) continue;
      const vy = (70 + r(2) * 110) * u * (1 + E.inCubic(env.pOut)), span = H + 80 * u;
      const y = wrap(r(3) * H + vy * env.ltb, -40 * u, span);
      const x = r(4) * W + Math.sin(env.ltb * (1 + r(5) * 1.8) + r(6) * 6) * (10 + r(7) * 30) * u;
      const al = clearOf(bb, x, y, pad, soft); if (al <= 0.02) continue;
      const w = (11 + r(8) * 11) * u * q, h = w * (0.4 + r(9) * 0.3), rot = r(10) * TAU + env.ltb * (r(11) - 0.5) * 8;
      const flip = Math.max(0.15, Math.abs(Math.cos(env.ltb * (2 + r(12) * 4) + r(13) * 6)));
      const c = Math.cos(rot), s = Math.sin(rot), hw = w / 2 * flip, hh = h / 2;
      const pts = [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]].map(([px, py]) => [x + px * c - py * s, y + px * s + py * c]);
      if (al < 1) { if (al > 0.5) buckets[i % 4].push(pts); }
      else buckets[i % 4].push(pts);
    }
    buckets.forEach((l, k) => polys(env, l, cols[k], 0.95 * o));
  },
};

/* 花びら — cherry petals tumbling diagonally on the wind, clear of the lyric */
const PETAL = (() => { const h = [[0, -0.5], [0.16, -0.38], [0.3, -0.18], [0.36, 0.04], [0.32, 0.24], [0.22, 0.42], [0.1, 0.5], [0, 0.4]]; return h.concat(h.slice(1, -1).reverse().map(([x, y]) => [-x, y])); })();
DEF.petals = {
  name: '花びら', nameEn: 'Petals', tags: ['emotional', 'calm', 'pop'], w: 0.9, layer: 'front',
  draw(env, bb0, P) {
    if (env.pass !== 'main') return;
    const bb = getBB(env, bb0), { W, H, sc } = env, u = U(env);
    const o = outE(env); if (o <= 0.003 || env.lt < 0) return;
    const N = Math.min(26, 10 + (P.n | 0) * 5), dir = P.right ? 1 : -1;
    const cA = [], cB = [];
    for (let i = 0; i < N; i++) {
      const r = k => J.r(P.seed, i, k);
      const q = E.outCubic(J.clamp((env.lt - r(1) * 0.4) / 0.35));
      if (q <= 0) continue;
      const vy = (40 + r(2) * 60) * u, vx = dir * (30 + r(3) * 50) * u;
      const x = wrap(r(4) * W + vx * env.ltb + Math.sin(env.ltb * (0.8 + r(5)) + r(6) * 6) * 30 * u, -60 * u, W + 120 * u);
      const y = wrap(r(7) * H + vy * env.ltb, -60 * u, H + 120 * u);
      const al = clearOf(bb, x, y, 12 * u, 28 * u); if (al <= 0.5) continue;
      const L = (24 + r(8) * 20) * u * q, rot = r(9) * TAU + env.ltb * (r(10) - 0.5) * 3;
      const fx = Math.max(0.2, Math.abs(Math.cos(env.ltb * (1.2 + r(11) * 2) + r(12) * 6)));
      const c = Math.cos(rot), s = Math.sin(rot);
      const pts = PETAL.map(([px, py]) => { const X = px * L * fx, Y = py * L; return [x + X * c - Y * s, y + X * s + Y * c]; });
      (r(13) < 0.7 ? cA : cB).push(pts);
    }
    polys(env, cA, sc.accent, 0.9 * o);
    polys(env, cB, dark(env) ? sc.fg : sc.sub, 0.85 * o);
  },
};

/* 雨の筋 — fine slanted rain streaks falling behind the lyric */
DEF.rainStreaks = {
  name: '雨の筋', nameEn: 'Rain streaks', tags: ['emotional', 'calm', 'glitch'], w: 0.9, layer: 'back', subtle: true,
  draw(env, bb, P) {
    const { W, H, sc } = env, u = U(env);
    const o = outE(env) * inE(env, 0.45, 0, E.outCubic); if (o <= 0.003 || env.lt < 0 || env.pass !== 'main') return;
    const N = Math.min(110, 60 + (P.n | 0) * 16), sl = (P.right ? 1 : -1) * (8 + P.r * 10) * DEG, tn = Math.tan(sl);
    const b = [[], [], []];
    for (let i = 0; i < N; i++) {
      const r = k => J.r(P.seed, i, k), z = r(1);
      const v = (1200 + z * 1300) * u, len = (36 + z * 80) * u, span = H + len + 80 * u;
      const y = wrap(r(2) * span + v * env.ltb, -len - 40 * u, span);
      const x = r(3) * (W + H * Math.abs(tn)) - (tn > 0 ? H * tn : 0) + y * tn;
      b[z < 0.4 ? 0 : z < 0.8 ? 1 : 2].push([x, y, x + len * tn, y + len]);
    }
    const col = dark(env) ? sc.sub : sc.fg;
    const k = dark(env) ? 1 : 0.75;
    segs(env, b[0], col, Math.max(1, 0.9 * u), 0.18 * o * k);
    segs(env, b[1], col, Math.max(1, 1.2 * u), 0.3 * o * k);
    segs(env, b[2], col, 1.6 * u, 0.46 * o * k);
  },
};

/* 雪 — soft snow in three depth layers, gently swaying (under the lyric) */
DEF.snow = {
  name: '雪', nameEn: 'Snow', tags: ['calm', 'emotional'], w: 0.8, layer: 'back', subtle: true,
  draw(env, bb, P) {
    const { W, H, sc } = env, u = U(env);
    const o = outE(env) * inE(env, 0.5, 0, E.outCubic); if (o <= 0.003 || env.lt < 0 || env.pass !== 'main') return;
    const N = Math.min(90, 46 + (P.n | 0) * 14), L = [[], [], []], halo = [];
    for (let i = 0; i < N; i++) {
      const r = k => J.r(P.seed, i, k), z = r(1), lay = z < 0.5 ? 0 : z < 0.85 ? 1 : 2;
      const rad = [2, 3.4, 5.6][lay] * u * (0.8 + r(2) * 0.4), vy = (22 + lay * 22 + r(3) * 14) * u;
      const y = wrap(r(4) * H + vy * env.ltb, -10 * u, H + 20 * u);
      const x = wrap(r(5) * W + Math.sin(env.ltb * (0.6 + r(6)) + r(7) * 6) * (8 + lay * 10) * u + (P.right ? 1 : -1) * env.ltb * 8 * u, -10 * u, W + 20 * u);
      L[lay].push([x, y, rad]);
      if (lay) halo.push([x, y, rad * 2.2]);
    }
    const col = dark(env) ? sc.fg : sc.sub, k = dark(env) ? 1 : 0.55;
    dots(env, halo, col, 0.08 * o * k);
    dots(env, L[0], col, 0.35 * o * k);
    dots(env, L[1], col, 0.55 * o * k);
    dots(env, L[2], col, 0.75 * o * k);
  },
};

/* 光漏れ — a soft warm light leak breathing in from a screen edge (main pass only) */
DEF.lightLeak = {
  name: '光漏れ', nameEn: 'Light leak', tags: ['emotional', 'calm', 'pop'], w: 1, layer: 'back', subtle: true,
  draw(env, bb, P) {
    const { W, H, sc, ctx } = env;
    if (env.pass !== 'main' || env.lt < 0) return;
    const o = outE(env) * inE(env, 0.6, 0, E.outCubic); if (o <= 0.003) return;
    const dk = dark(env), pick = c => c && (dk ? J.lum(c) > 0.2 : J.lum(c) < 0.85) ? c : null;
    const c1 = pick(sc.accent) || pick(sc.accent2) || sc.sub, c2 = pick(sc.accent2) || c1;
    const breathe = 0.85 + 0.15 * Math.sin(env.ltb * 1.4 + P.r * 6);
    const sx = P.right ? 1 : -1, sy = P.low ? 1 : -1;
    const blob = (x, y, R, c, a) => {
      const g = ctx.createRadialGradient(x, y, 0, x, y, R);
      g.addColorStop(0, J.rgba(c, a)); g.addColorStop(0.35, J.rgba(c, a * 0.5)); g.addColorStop(1, J.rgba(c, 0));
      ctx.fillStyle = g; ctx.fillRect(x - R, y - R, R * 2, R * 2);
    };
    ctx.save();
    ctx.globalCompositeOperation = dk ? 'screen' : 'multiply';
    const A = (dk ? 0.5 : 0.28) * o * breathe, M = Math.max(W, H);
    const drift = env.ltb * 18 * (P.corner ? 1 : -1);
    blob((sx > 0 ? W : 0) + sx * M * 0.05, (sy > 0 ? H : 0) * 0.9 + H * 0.05 + drift, M * J.rr(0.42, 0.6, P.seed, 1), c1, A);
    blob((sx > 0 ? W : 0) - sx * M * 0.02, H * J.rr(0.3, 0.7, P.seed, 2) - drift, M * J.rr(0.22, 0.32, P.seed, 3), c2, A * 0.8);
    if ((P.v | 0) % 2) {
      ctx.translate(sx > 0 ? W * 0.82 : W * 0.18, H / 2); ctx.rotate(sx * 14 * DEG);
      const w = W * 0.12, g = ctx.createLinearGradient(-w, 0, w, 0);
      g.addColorStop(0, J.rgba(c1, 0)); g.addColorStop(0.5, J.rgba(c1, A * 0.5)); g.addColorStop(1, J.rgba(c1, 0));
      ctx.fillStyle = g; ctx.fillRect(-w + drift * 0.5, -H, w * 2, H * 2);
    }
    ctx.restore();
  },
};

/* ボケ玉 — out-of-focus light discs (or aperture hexagons) that pull into focus */
DEF.bokeh = {
  name: 'ボケ玉', nameEn: 'Bokeh', tags: ['emotional', 'calm', 'pop'], w: 1, layer: 'back', subtle: true,
  draw(env, bb, P) {
    const { W, H, sc } = env, u = U(env);
    const o = outE(env); if (o <= 0.003 || env.lt < 0 || env.pass !== 'main') return;
    const N = Math.min(18, 8 + (P.n | 0) * 3), hex = (P.v | 0) % 2 === 1, M = Math.min(W, H);
    const cols = [sc.accent, sc.accent2 || sc.fg, sc.fg];
    const dk = dark(env);
    for (let i = 0; i < N; i++) {
      const r = k => J.r(P.seed, i, k);
      const f = E.outCubic(J.clamp((env.lt - r(1) * 0.4) / 0.6));
      if (f <= 0) continue;
      const R0 = M * (0.025 + r(2) * r(2) * 0.075), R = R0 * (1.5 - 0.5 * f);
      const x = r(3) * W + Math.sin(env.ltb * 0.5 + r(4) * 6) * 14 * u, y = wrap(r(5) * H - env.ltb * (6 + r(6) * 12) * u, -R0, H + R0 * 2);
      const c = cols[i % 3], al = (dk ? 0.06 + r(7) * 0.1 : 0.05 + r(7) * 0.07) * f * o;
      if (hex) {
        const pts = []; for (let k = 0; k < 6; k++) { const an = (k * 60 + 15) * DEG; pts.push([x + Math.cos(an) * R, y + Math.sin(an) * R]); }
        polys(env, [pts], c, al);
        stroke(env, pts, c, 1.4 * u, al * 1.4, false, { close: true });
      } else {
        env.circle(x, y, R, c, null, 0, al, false);
        env.circle(x, y, R * 0.97, null, c, 1.6 * u, al * 1.3, false);
      }
    }
  },
};

/* 集中線 — manga speed lines rushing in from the edges, stopping short of the lyric */
DEF.speedCorner = {
  name: '集中線', nameEn: 'Speed lines', tags: ['pop', 'emotional', 'glitch'], w: 0.9, layer: 'front',
  draw(env, bb0, P) {
    const bb = getBB(env, bb0), { W, H, sc } = env, u = U(env);
    const o = outE(env); if (o <= 0.003 || env.lt < 0 || env.pass !== 'main') return;
    const cx = (bb.x0 + bb.x1) / 2, cy = (bb.y0 + bb.y1) / 2, pad = 30 * u + bh(bb) * 0.2;
    const A = bw(bb) / 2 * 1.1 + pad, B = bh(bb) / 2 * 1.15 + pad;
    const N = Math.min(150, 80 + (P.n | 0) * 22), corners = !!P.corner;
    const pOut = E.inCubic(env.pOut), list = [];
    for (let i = 0; i < N; i++) {
      const r = k => J.r(P.seed, i, k);
      let th = r(1) * TAU;
      if (corners) { const q = Math.floor(r(2) * 4), base = Math.atan2((q < 2 ? -1 : 1) * H, (q % 2 ? 1 : -1) * W); th = base + (r(3) - 0.5) * 0.7; }
      const c = Math.cos(th), s = Math.sin(th);
      const tx = c > 0 ? (W + 4 - cx) / c : c < 0 ? (-4 - cx) / c : 1e9, ty = s > 0 ? (H + 4 - cy) / s : s < 0 ? (-4 - cy) / s : 1e9;
      const dEdge = Math.min(tx, ty), dIn = superR(A, B, 4, th) + (20 + r(4) * 0.35 * Math.max(0, dEdge - superR(A, B, 4, th))) * u / u;
      if (dEdge - dIn < 30 * u) continue;
      const jit = 0.85 + 0.15 * J.r(P.seed, i, env.step);
      const e = E.outExpo(J.clamp((env.lt - r(5) * 0.15) / 0.3));
      const tip = J.lerp(dEdge, J.lerp(dEdge, dIn, jit), e) , tipO = J.lerp(tip, dEdge, pOut);
      if (dEdge - tipO < 4 * u) continue;
      const wd = (1.2 + r(6) * 4.5) * u, nx = -s * wd, ny = c * wd;
      const ex = cx + c * dEdge, ey = cy + s * dEdge;
      list.push([[ex + nx, ey + ny], [ex - nx, ey - ny], [cx + c * tipO, cy + s * tipO]]);
    }
    polys(env, list, dark(env) ? sc.fg : sc.ink || sc.fg, 0.8 * o);
  },
};

/* 立ち上る粒 — small embers / light motes rising and fading (under the lyric) */
DEF.risingParticles = {
  name: '立ち上る粒', nameEn: 'Rising particles', tags: ['emotional', 'calm', 'glitch'], w: 0.9, layer: 'back', subtle: true,
  draw(env, bb, P) {
    const { W, H, sc } = env, u = U(env);
    const o = outE(env) * inE(env, 0.45, 0, E.outCubic); if (o <= 0.003 || env.lt < 0 || env.pass !== 'main') return;
    const N = Math.min(54, 24 + (P.n | 0) * 10), shape = (P.v | 0) % 3;
    const col = P.accent || shape === 1 ? sc.accent : (dark(env) ? sc.fg : sc.sub);
    const heads = [[], [], []], trails = [[], [], []], glow = [];
    for (let i = 0; i < N; i++) {
      const r = k => J.r(P.seed, i, k);
      const vy = (40 + r(1) * 90) * u, span = H + 120 * u;
      const y = H + 60 * u - wrap(r(2) * span + vy * env.ltb, 0, span);
      const p = J.clamp(1 - y / H), fade = Math.pow(Math.sin(Math.PI * J.clamp(p)), 0.7);
      if (fade <= 0.05) continue;
      const ph = r(5) * 6, f = 0.7 + r(4), sw = 14 * u;
      const x = r(3) * W + Math.sin(env.ltb * f + ph) * sw, dx = Math.cos(env.ltb * f + ph) * f * sw;   // dx: sway velocity
      const s = (1.6 + r(6) * 2.6) * u, b = fade > 0.66 ? 2 : fade > 0.33 ? 1 : 0, tl = vy * 0.28;
      if (shape === 2) heads[b].push([[x, y - s * 1.6], [x + s, y], [x, y + s * 1.6], [x - s, y]]);
      else heads[b].push([x, y, s]);
      trails[b].push([x, y + s * 1.5, x - dx * tl / vy, y + s * 1.5 + tl]);
      if (s > 3 * u) glow.push([x, y, s * 3.2]);
    }
    dots(env, glow, col, 0.06 * o);
    const lw = Math.max(1, u);
    for (let b = 0; b < 3; b++) {
      segs(env, trails[b], col, lw, [0.08, 0.16, 0.26][b] * o, false, 'round');
      (shape === 2 ? polys : dots)(env, heads[b], col, [0.25, 0.5, 0.85][b] * o);
    }
  },
};

/* きらめき — four-point glints twinkling just outside the lyric's corners */
DEF.twinkle = {
  name: 'きらめき', nameEn: 'Glimmer', tags: ['pop', 'emotional', 'calm'], w: 1, layer: 'front',
  draw(env, bb0, P) {
    if (env.pass !== 'main') return;
    const bb = getBB(env, bb0), { W, H, sc } = env, u = U(env);
    const o = outE(env); if (o <= 0.003 || env.lt < 0) return;
    const K = Math.min(7, 3 + (P.n | 0) + (P.big ? 1 : 0)), pad = 16 * u + bh(bb) * 0.12;
    const X0 = bb.x0 - pad, X1 = bb.x1 + pad, Y0 = bb.y0 - pad, Y1 = bb.y1 + pad, per = 2 * (X1 - X0 + Y1 - Y0);
    const fills = [[], []], lines = [];
    for (let i = 0; i < K; i++) {
      const r = k => J.r(P.seed, i, k);
      let t = (i + r(1) * 0.6) / K * per, x, y;
      if (t < X1 - X0) { x = X0 + t; y = Y0; } else if ((t -= X1 - X0) < Y1 - Y0) { x = X1; y = Y0 + t; } else if ((t -= Y1 - Y0) < X1 - X0) { x = X1 - t; y = Y1; } else { t -= X1 - X0; x = X0; y = Y1 - t; }
      x += J.rs(P.seed, i, 2) * 14 * u; y += J.rs(P.seed, i, 3) * 14 * u;
      x = J.clamp(x, 16 * u, W - 16 * u); y = J.clamp(y, 16 * u, H - 16 * u);
      if (clearOf(bb, x, y, 4 * u, 1) < 1) continue;
      const R = (i === 0 ? 30 : 13 + r(4) * 12) * u;
      const cyc = 1.3 + r(5) * 0.8, ph = ((env.ltb - r(6) * 0.3) / cyc + r(7)) % 1;
      const intro = E.outBack(J.clamp((env.lt - r(6) * 0.3) / 0.3), 2);
      const s = Math.min(intro, env.lt > 0.6 ? 0.25 + 0.75 * Math.pow(Math.sin(Math.PI * ph), 2) : intro) * o;
      if (s <= 0.02) continue;
      fills[i % 3 === 0 ? 1 : 0].push(glint(x, y, R * s, R * s * 0.2, 0));
      const L = R * 1.9 * s; lines.push([x - L, y, x + L, y], [x, y - L, x, y + L]);
    }
    segs(env, lines, sc.fg, Math.max(1, 0.9 * u), 0.5 * o);
    polys(env, fills[0], sc.fg, o);
    polys(env, fills[1], sc.accent, o);
  },
};

/* ============================================================
   hand-drawn
   ============================================================ */

/* 筆の払い — a dry-brush sweep with bristle streaks and a tapering flick (under the lyric) */
DEF.brushStroke = {
  name: '筆の払い', nameEn: 'Brush sweep', tags: ['emotional', 'editorial', 'pop'], w: 1, layer: 'back',
  draw(env, bb, P) {
    const { W, H, sc, ctx } = env, u = U(env);
    if (env.pass !== 'main' || env.lt < 0) return;
    const o = outE(env); if (o <= 0.003) return;
    const v = (P.v | 0) % 3;
    // colour + opacity chosen so the lyric (sc.fg) keeps >= 3:1 contrast on top of the stroke
    const cands = v === 1 ? [sc.dim, sc.accent2, sc.sub] : [sc.accent, sc.accent2, sc.ghostA, sc.ghostB, sc.sub, sc.dim];
    let col = null, al = 0;
    for (const c of cands.filter(Boolean)) {
      if (J.contrast(c, sc.bg) < 1.15) continue;
      for (let a = v === 1 ? 0.9 : 0.55; a >= 0.2; a -= 0.07) if (J.contrast(J.mix(sc.bg, c, a), sc.fg) >= 3) { col = c; al = a; break; }
      if (col) break;
    }
    if (!col) return;
    al *= o;
    const T = Math.min(W, H) * J.rr(0.11, 0.16, P.seed, 1);
    const yc = H * 0.5 + (P.low ? 1 : -1) * H * J.rr(0.0, 0.05, P.seed, 2) + (W < H ? 0 : T * 0.1);
    const ltr = !!P.right, xa = W * J.rr(0.06, 0.16, P.seed, 3), xb = W * J.rr(0.84, 0.95, P.seed, 4);
    const tilt = J.rs(P.seed, 5) * T * 0.35, bow = J.rs(P.seed, 6) * T * 0.25;
    const head = E.outCubic(J.clamp(env.lt / 0.5)), K = 22, S = 26;
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.globalAlpha = al; ctx.strokeStyle = col;
    // bristles: all in one path per width band, so overlaps never darken (no alpha build-up)
    const bands = [[], []];
    for (let j = 0; j < K; j++) {
      const f = j / (K - 1) - 0.5, r = k => J.r(P.seed, j, k);
      const edge = Math.abs(f) * 2;
      const t0 = r(1) * 0.05 + edge * edge * 0.06, t1 = 1 - edge * J.rr(0.12, 0.4, P.seed, j, 2) - r(3) * 0.06;
      const te = Math.min(t1, head);
      if (te <= t0) continue;
      const gapAt = r(4) < 0.45 ? J.rr(0.55, 0.9, P.seed, j, 5) : 2, gapL = 0.03 + r(6) * 0.05;
      const pl = []; let cur = null;
      for (let k = 0; k <= S; k++) {
        const t = t0 + (te - t0) * k / S;
        if (t > gapAt && t < gapAt + gapL) { cur = null; continue; }
        const tt = ltr ? t : 1 - t, x = J.lerp(xa, xb, tt);
        const taper = 1 - Math.pow(t, 3) * 0.55;
        const y = yc + tilt * (tt - 0.5) + bow * Math.sin(tt * Math.PI) + f * T * taper + J.rs(P.seed, j, k, 8) * 0.8 * u;
        if (!cur) { cur = []; pl.push(cur); }
        cur.push([x, y]);
      }
      bands[edge > 0.6 || r(7) < 0.3 ? 1 : 0].push(...pl);
    }
    bands.forEach((list, bi) => {
      ctx.lineWidth = T / K * (bi ? 1.3 : 2.2);
      ctx.beginPath();
      for (const pts of list) { if (pts.length < 2) continue; ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); }
      ctx.stroke();
    });
    ctx.restore();
  },
};

/* マスキングテープ — translucent tape pieces pinning the lyric's corners */
DEF.tapePieces = {
  name: 'マスキングテープ', nameEn: 'Masking tape', tags: ['pop', 'emotional', 'editorial'], w: 0.9, layer: 'front',
  draw(env, bb0, P) {
    const bb = getBB(env, bb0), { sc, ctx } = env, u = U(env);
    if (env.pass !== 'main' || env.lt < 0) return;
    const o = outE(env); if (o <= 0.003) return;
    const Lt = J.clamp(Math.min(env.W, env.H) * 0.115, 90 * u, 150 * u) * (0.9 + P.r * 0.2), Ht = Lt * 0.4, v = (P.v | 0) % 3;
    const cs = P.big ? [[-1, -1], [1, -1], [1, 1], [-1, 1]] : P.right ? [[1, -1], [-1, 1]] : [[-1, -1], [1, 1]];
    const col = [sc.accent2 && J.contrast(sc.accent2, sc.bg) > 1.6 ? sc.accent2 : sc.sub, sc.accent, sc.sub][v];
    cs.forEach(([sx, sy], k) => {
      const q = J.clamp((env.lt - 0.08 - k * 0.1) / 0.25); if (q <= 0) return;
      const eq = E.outCubic(q), X = sx < 0 ? bb.x0 : bb.x1, Y = sy < 0 ? bb.y0 : bb.y1;
      const cx = X + sx * Ht * 0.55, cy = Y + sy * Ht * 0.55;
      const ang = (-sx * sy * 40 + J.rs(P.seed, k, 1) * 10 + (1 - eq) * 10 * sx) * DEG, s = 1 + 0.2 * (1 - eq);
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(ang); ctx.scale(s, s);
      const hl = Lt / 2, hh = Ht / 2, teeth = 5, pts = [];
      for (let i = 0; i <= teeth; i++) pts.push([-hl + (i % 2 ? 3 : 0) * u + J.rs(P.seed, k, i, 2) * 2 * u, -hh + i / teeth * Ht]);
      for (let i = teeth; i >= 0; i--) pts.push([hl - (i % 2 ? 3 : 0) * u + J.rs(P.seed, k, i, 3) * 2 * u, -hh + i / teeth * Ht]);
      polys(env, [pts], col, 0.62 * eq * o);
      if (v !== 1) {                                     // printed stripes on the tape
        ctx.save(); ctx.beginPath(); ctx.rect(-hl + 3 * u, -hh, Lt - 6 * u, Ht); ctx.clip();
        const list = []; for (let x = -hl - Ht; x < hl + Ht; x += 9 * u) list.push([x, hh, x + Ht, -hh]);
        segs(env, list, dark(env) ? sc.bg : sc.fg, 2 * u, 0.14 * eq * o);
        ctx.restore();
      }
      ctx.restore();
    });
  },
};

/* 手描きの囲み — a loose hand-drawn loop around the lyric */
function handLoop(env, bb, P, turns) {
  const u = U(env), { W, H } = env, pad = 14 * u + Math.min(bw(bb), bh(bb)) * 0.08;
  const hw = bw(bb) / 2, hh = bh(bb) / 2, cx = (bb.x0 + bb.x1) / 2, cy = (bb.y0 + bb.y1) / 2;
  const lx = Math.max(hw * 0.9, Math.min(cx, W - cx) - 10 * u), ly = Math.max(hh * 0.9, Math.min(cy, H - cy) - 10 * u);
  let A = Math.min(hw * 1.22 + pad, lx), B = Math.min(hh * 1.22 + pad, ly);
  // keep the lyric's corners inside the loop (a loose ring may graze them when the screen is tight)
  if ((hw / A) ** 2 + (hh / B) ** 2 > 1) {
    if (A < hw * 1.22 + pad) B = Math.min(ly, hh / Math.sqrt(Math.max(0.06, 1 - (hw / A) ** 2)) * 0.96 + pad * 0.3);
    else A = Math.min(lx, hw / Math.sqrt(Math.max(0.06, 1 - (hh / B) ** 2)) * 0.96 + pad * 0.3);
  }
  const th0 = (P.right ? -0.3 : 0.3) * Math.PI - Math.PI / 2, dir = P.right ? 1 : -1, M = 140, pts = [], tilt = J.rs(P.seed, 1) * 2 * DEG;
  for (let i = 0; i <= M; i++) {
    const t = i / M, th = th0 + dir * t * turns * TAU;
    const k = 1 + 0.03 * J.noise1(t * 6 + (P.seed % 97), P.seed) + 0.05 * Math.max(0, t * turns - 0.85);
    const x = Math.cos(th) * A * k, y = Math.sin(th) * B * k;
    pts.push([cx + x * Math.cos(tilt) - y * Math.sin(tilt), cy + x * Math.sin(tilt) + y * Math.cos(tilt)]);
  }
  return pts;
}
DEF.scribbleCircle = {
  name: '手描きの囲み', nameEn: 'Hand-drawn frame', tags: ['pop', 'emotional', 'editorial'], w: 1, layer: 'front',
  draw(env, bb0, P) {
    if (env.pass !== 'main') return;
    const bb = getBB(env, bb0), { sc } = env, u = U(env);
    const o = outE(env); if (o <= 0.003 || env.lt < 0) return;
    const pts = handLoop(env, bb, P, (P.v | 0) % 2 ? 1.85 : 1.12);
    const e = E.inOutCubic(J.clamp((env.lt - 0.05) / 0.6));
    stroke(env, part(pts, 0, e), P.accent || !dark(env) ? sc.accent : sc.fg, 3 * u, 0.95 * o, false, { cap: 'round', join: 'round' });
  },
};

/* 手描き下線 — a hand-drawn underline: a double swipe, a wavy line or a zig-zag scribble */
DEF.scribbleUnder = {
  name: '手描き下線', nameEn: 'Hand-drawn underline', tags: ['pop', 'emotional', 'editorial'], w: 1.1, layer: 'front',
  draw(env, bb0, P) {
    if (env.pass !== 'main') return;
    const bb = getBB(env, bb0), { sc } = env, u = U(env);
    const o = outE(env); if (o <= 0.003 || env.lt < 0) return;
    const vert = bh(bb) > bw(bb) * 1.3, v = (P.v | 0) % 3;
    const L0 = vert ? bb.y0 : bb.x0, L1 = vert ? bb.y1 : bb.x1, len = L1 - L0;
    const base = vert ? bb.x1 + 14 * u + bw(bb) * 0.1 : bb.y1 + 14 * u + bh(bb) * 0.14;
    const map = ([a, c]) => (vert ? [base + c, a] : [a, base + c]);
    const n = (t, k) => J.noise1(t * 3 + k * 7, P.seed) * 3 * u;
    const strokes = [];
    if (v === 0) {
      const s1 = [], s2 = [];
      for (let i = 0; i <= 24; i++) { const t = i / 24; s1.push([L0 - 8 * u + (len + 16 * u) * t, Math.sin(t * Math.PI) * 5 * u + n(t, 1) - t * 4 * u]); }
      for (let i = 0; i <= 16; i++) { const t = i / 16; s2.push([L0 + len * 0.18 + len * 0.78 * t, 11 * u + Math.sin(t * Math.PI) * 4 * u + n(t, 2)]); }
      strokes.push(s1, s2);
    } else if (v === 1) {
      const s = [], lam = J.clamp(len / 22, 30 * u, 64 * u);
      for (let x = 0; x <= len + 0.1; x += 5 * u) s.push([L0 + x, Math.sin(x / lam * TAU) * 5 * u + n(x / len, 3)]);
      strokes.push(s);
    } else {
      const s = [], passes = 5;
      for (let i = 0; i <= passes; i++) { const t = i / passes; s.push([L0 + (i % 2 ? len * 0.96 : len * 0.04) + J.rs(P.seed, i, 4) * 8 * u, t * 14 * u + n(t, 5)]); }
      strokes.push(s);
    }
    const col = P.accent || !dark(env) ? sc.accent : sc.fg;
    strokes.forEach((s, k) => {
      const e = E.inOutCubic(J.clamp((env.lt - 0.05 - k * 0.28) / (v === 2 ? 0.55 : 0.35)));
      stroke(env, part(s.map(map), 0, e), col, (k ? 2.6 : 3.4) * u, 0.95 * o, false, { cap: 'round', join: 'round' });
    });
  },
};

/* 取り消し線 — a small "draft" word beside the lyric, struck out by hand */
DEF.crossOut = {
  name: '推敲の走り書き', nameEn: 'Revision scribbles', tags: ['editorial', 'emotional'], w: 0.4, layer: 'front',
  draw(env, bb0, P) {
    if (env.pass !== 'main') return;
    const bb = getBB(env, bb0), { sc } = env, u = U(env);
    const o = outE(env); if (o <= 0.003 || env.lt < 0) return;
    const txt = String(env.cut.text || '').replace(/\s+/g, '');
    const arr = [...txt]; if (arr.length < 1) return;
    const w0 = ((env.cut.words && env.cut.words[0]) || '').replace(/\s+/g, '');
    const word = [...w0].length >= 2 && [...w0].length <= 4 ? w0 : arr.slice(0, Math.min(arr.length, 2 + (P.v | 0) % 3)).join('');
    const font = serifF(env), fs = J.clamp(bh(bb) * 0.3, 22 * u, 46 * u);
    const tw = textW(word, font, fs, 0.1);
    const sp = nearBB(env, bb, tw + 24 * u, fs * 1.8, Object.assign({}, P, { low: false }), 16 * u);
    const cx = sp.cx, cy = sp.cy, a = o * (sp.ok ? 1 : 0.4);
    label(env, word, cx, cy, { font, size: fs, align: 'center', color: sc.sub, alpha: a * inE(env, 0.2), track: 0.1 });
    const col = sc.accent, x0 = cx - tw / 2 - 6 * u, x1 = cx + tw / 2 + 6 * u;
    const strikes = (P.v | 0) % 2 ? [[[x0, cy - fs * 0.05], [x1, cy - fs * 0.12]], [[x0 + 4 * u, cy + fs * 0.1], [x1 - 2 * u, cy + fs * 0.02]]]
      : [(() => { const s = []; for (let i = 0; i <= 6; i++) s.push([J.lerp(x0, x1, i / 6), cy + (i % 2 ? -1 : 1) * fs * 0.28]); return s; })()];
    strikes.forEach((s, k) => stroke(env, part(s, 0, E.inOutCubic(J.clamp((env.lt - 0.3 - k * 0.14) / 0.25))), col, 2.4 * u, 0.95 * a, false, { cap: 'round', join: 'round' }));
    // a little hand-drawn arrow to the nearest edge of the lyric
    const e3 = E.outCubic(J.clamp((env.lt - 0.6) / 0.3)); if (e3 <= 0) return;
    let c1, c3;
    if (cy + fs * 0.6 < bb.y0) { c1 = [cx + tw * 0.25, cy + fs * 0.75]; c3 = [J.clamp(cx + tw * 0.35, bb.x0 + 10 * u, bb.x1 - 10 * u), bb.y0 - 6 * u]; }
    else if (cy - fs * 0.6 > bb.y1) { c1 = [cx + tw * 0.25, cy - fs * 0.75]; c3 = [J.clamp(cx + tw * 0.35, bb.x0 + 10 * u, bb.x1 - 10 * u), bb.y1 + 6 * u]; }
    else if (cx < bb.x0) { c1 = [cx + tw / 2 + 8 * u, cy + fs * 0.3]; c3 = [bb.x0 - 6 * u, J.clamp(cy + fs, bb.y0 + 10 * u, bb.y1 - 10 * u)]; }
    else { c1 = [cx - tw / 2 - 8 * u, cy + fs * 0.3]; c3 = [bb.x1 + 6 * u, J.clamp(cy + fs, bb.y0 + 10 * u, bb.y1 - 10 * u)]; }
    const dd = Math.hypot(c3[0] - c1[0], c3[1] - c1[1]);
    if (dd > 14 * u && dd < 260 * u) {
      const nx = -(c3[1] - c1[1]) / dd, ny = (c3[0] - c1[0]) / dd, bend = dd * 0.25;
      const c2 = [(c1[0] + c3[0]) / 2 + nx * bend, (c1[1] + c3[1]) / 2 + ny * bend];
      const pts = []; for (let i = 0; i <= 12; i++) { const t = i / 12; pts.push([(1 - t) * (1 - t) * c1[0] + 2 * t * (1 - t) * c2[0] + t * t * c3[0], (1 - t) * (1 - t) * c1[1] + 2 * t * (1 - t) * c2[1] + t * t * c3[1]]); }
      stroke(env, part(pts, 0, e3), col, 2 * u, 0.9 * a, false, { cap: 'round', join: 'round' });
      if (e3 > 0.95) { const p = pts[pts.length - 1], q = pts[pts.length - 3], an = Math.atan2(p[1] - q[1], p[0] - q[0]), L = 9 * u; stroke(env, [[p[0] - Math.cos(an - 0.5) * L, p[1] - Math.sin(an - 0.5) * L], p, [p[0] - Math.cos(an + 0.5) * L, p[1] - Math.sin(an + 0.5) * L]], col, 2 * u, 0.9 * a, false, { cap: 'round', join: 'round' }); }
    }
  },
};

/* 蛍光マーカー — a highlighter swipe under the lower half of each lyric line (screen / multiply, so glyphs stay crisp) */
DEF.highlightMark = {
  name: '蛍光マーカー', nameEn: 'Highlighter', tags: ['pop', 'editorial', 'emotional'], w: 1, layer: 'front',
  draw(env, bb0, P) {
    const bb = getBB(env, bb0), { sc, ctx } = env, u = U(env);
    if (env.pass !== 'main' || env.lt < 0) return;
    const o = outE(env); if (o <= 0.003) return;
    const dk = dark(env);
    // marker colour: visible on the background AND clearly different from the text colour
    const cands = [sc.accent, sc.accent2, sc.ghostA, sc.ghostB, sc.sub].filter(Boolean);
    // light text → screen a lighter colour; dark text → multiply a darker one (the glyphs themselves stay untouched)
    const lighten = J.lum(sc.fg) > J.lum(sc.bg), lb = J.lum(sc.bg);
    const side = c => (lighten ? J.lum(c) > lb + 0.06 : J.lum(c) < lb - 0.06);
    const pool = cands.filter(side);
    let col = pool.find(c => J.contrast(c, sc.fg) >= 1.6), weak = 1;
    if (!col) { if (!pool.length) return; col = pool.sort((x, y) => J.contrast(y, sc.fg) - J.contrast(x, sc.fg))[0]; weak = 0.7; }
    const vert = bh(bb) > bw(bb) * 1.25;
    // group glyph boxes into lines (or columns)
    let lines = [];
    if (bb.boxes && bb.boxes.length && bb.cx != null) {
      const bx = bb.boxes.map(b => ({ x0: bb.cx + b.x - b.w / 2, x1: bb.cx + b.x + b.w / 2, y0: bb.cy + b.y - b.h / 2, y1: bb.cy + b.y + b.h / 2 }));
      for (const b of bx) {
        const key = vert ? (b.x0 + b.x1) / 2 : (b.y0 + b.y1) / 2, sz = vert ? b.x1 - b.x0 : b.y1 - b.y0;
        let L = lines.find(l => Math.abs(l.k - key) < sz * 0.4);
        if (!L) { L = { k: key, x0: b.x0, x1: b.x1, y0: b.y0, y1: b.y1 }; lines.push(L); }
        else { L.x0 = Math.min(L.x0, b.x0); L.x1 = Math.max(L.x1, b.x1); L.y0 = Math.min(L.y0, b.y0); L.y1 = Math.max(L.y1, b.y1); }
      }
      lines.sort((a, b) => (vert ? b.k - a.k : a.k - b.k));
    }
    if (!lines.length) lines = [{ x0: bb.x0, x1: bb.x1, y0: bb.y0, y1: bb.y1 }];
    ctx.save();
    ctx.globalCompositeOperation = lighten ? 'screen' : 'multiply';
    lines.slice(0, 4).forEach((L, k) => {
      const e = E.inOutCubic(J.clamp((env.lt - 0.1 - k * 0.22) / 0.4)); if (e <= 0) return;
      const pts = [], s = vert ? L.x1 - L.x0 : L.y1 - L.y0, M = 14;
      const a0 = (vert ? L.y0 : L.x0) - s * 0.12, a1 = (vert ? L.y1 : L.x1) + s * 0.12, aE = J.lerp(a0, a1, e);
      const c0 = vert ? L.x0 + s * 0.52 : L.y0 + s * 0.46, c1 = vert ? L.x1 + s * 0.06 : L.y1 + s * 0.06;
      const sl = s * 0.18;
      for (let i = 0; i <= M; i++) { const t = i / M, a = J.lerp(a0 + sl, aE, t); pts.push(vert ? [c1 + J.noise1(t * 4, P.seed) * 1.5 * u, a] : [a, c0 + J.noise1(t * 4, P.seed) * 1.5 * u]); }
      for (let i = M; i >= 0; i--) { const t = i / M, a = J.lerp(a0, aE - (e < 1 ? 0 : sl), t); pts.push(vert ? [c0 + J.noise1(t * 4 + 9, P.seed) * 1.5 * u, a] : [a, c1 + J.noise1(t * 4 + 9, P.seed) * 1.5 * u]); }
      polys(env, [pts], col, (dk ? 0.6 : 0.62) * o * weak);
    });
    ctx.restore();
  },
};

/* ハートと星 — little hearts / stars popping around the lyric */
DEF.heartsStars = {
  name: 'ハートと星', nameEn: 'Hearts and stars', tags: ['pop', 'emotional'], w: 0.9, layer: 'front',
  draw(env, bb0, P) {
    const bb = getBB(env, bb0), { W, H, sc } = env, u = U(env);
    const o = outE(env); if (o <= 0.003 || env.lt < 0) return;
    const K = Math.min(7, 3 + (P.n | 0) + (P.big ? 1 : 0)), v = (P.v | 0) % 3, pad = 26 * u + bh(bb) * 0.15;
    const X0 = bb.x0 - pad, X1 = bb.x1 + pad, Y0 = bb.y0 - pad, Y1 = bb.y1 + pad, per = 2 * (X1 - X0 + Y1 - Y0);
    const cols = [sc.accent, sc.fg, sc.accent2 && J.contrast(sc.accent2, sc.bg) > 1.8 ? sc.accent2 : sc.accent];
    for (let i = 0; i < K; i++) {
      const r = k => J.r(P.seed, i, k);
      let t = ((i + 0.3 + r(1) * 0.4) / K) * per, x, y;
      if (t < X1 - X0) { x = X0 + t; y = Y0; } else if ((t -= X1 - X0) < Y1 - Y0) { x = X1; y = Y0 + t; } else if ((t -= Y1 - Y0) < X1 - X0) { x = X1 - t; y = Y1; } else { t -= X1 - X0; x = X0; y = Y1 - t; }
      x = J.clamp(x, 24 * u, W - 24 * u); y = J.clamp(y, 24 * u, H - 24 * u);
      if (clearOf(bb, x, y, 6 * u, 1) < 1) continue;
      const q = E.outBack(J.clamp((env.lt - 0.05 - i * 0.07) / 0.3), 2.4) * (1 - E.inCubic(env.pOut));
      if (q <= 0.01) continue;
      const s = (i === 0 ? 36 : 18 + r(2) * 14) * u * q;
      const yy = y + Math.sin(env.ltb * 3 + i * 1.7) * 3 * u, rot = Math.sin(env.ltb * 2 + i) * 10 + J.rs(P.seed, i, 3) * 15;
      const isHeart = v === 0 || (v === 2 && i % 2 === 0);
      let pts = isHeart ? heart(0, 0, s) : star5(0, 0, s, s * 0.45);
      const c = Math.cos(rot * DEG), sn = Math.sin(rot * DEG);
      pts = pts.map(([px, py]) => [x + px * c - py * sn, yy + px * sn + py * c]);
      const col = cols[i % 3];
      if (r(4) < 0.35) stroke(env, pts, col, 2.2 * u, o, false, { close: true, join: 'round' });
      else polys(env, [pts], col, o, true);
    }
  },
};

/* ============================================================
   type ornaments
   ============================================================ */

/* 透かし大漢字 — one character of the lyric, huge and dim, cropped by the screen edge */
DEF.watermarkKanji = {
  name: '透かし大漢字', nameEn: 'Giant kanji watermark', tags: ['editorial', 'emotional', 'calm'], w: 1, layer: 'back',
  draw(env, bb, P) {
    if (env.pass !== 'main') return;
    const { W, H, sc } = env, u = U(env);
    const o = outE(env); if (o <= 0.003 || env.lt < 0) return;
    const ch = lyricChar(env, P.v); if (!ch) return;
    const e = E.outCubic(J.clamp(env.lt / 0.6));
    const S = Math.min(H * 0.86, W * 0.92) * (1.06 - 0.06 * e);
    const x = P.right ? W - S * 0.3 : S * 0.3, y = H * 0.5 + (P.low ? 1 : -1) * H * 0.06 - env.ltb * 5 * u;
    const outline = (P.v | 0) % 2 === 1;
    const font = (P.v | 0) % 3 === 0 ? env.st.fonts.display[0] : serifF(env);
    if (outline) env.draw({ text: ch, font, size: S, x, y, color: sc.sub, fill: false, stroke: 1.6 * u, alpha: 0.32 * e * o, ghost: false });
    else env.draw({ text: ch, font, size: S, x, y, color: sc.dim, alpha: e * o, ghost: false });
  },
};

/* 縦書き帯 — the whole lyric line set small and vertical at a screen edge, with a hairline rule */
DEF.verticalStrip = {
  name: '縦書き帯', nameEn: 'Vertical text band', tags: ['editorial', 'calm', 'emotional'], w: 1, layer: 'front',
  draw(env, bb0, P) {
    if (env.pass !== 'main') return;
    const bb = getBB(env, bb0), { W, H, sc } = env, u = U(env), m = MG(env);
    const o = outE(env); if (o <= 0.003 || env.lt < 0) return;
    const all = [...String(env.cut.lineText || env.cut.text || '').replace(/\s+/g, '　')].slice(0, 26);
    if (!all.join('').trim()) return;
    const fs = J.clamp(Math.min(W, H) * 0.022, 15 * u, 24 * u), track = 0.28, step = fs * (1 + track), clear = 44 * u;
    const font = (P.v | 0) % 2 ? serifF(env) : bodyF(env);
    // pick the edge / end with the most room (the strip never approaches the lyric)
    let best = null;
    for (const right of [!!P.right, !P.right]) for (const top of [!P.low, !!P.low]) {
      const x = right ? W - m * 0.95 : m * 0.95, hClear = x + fs * 1.8 < bb.x0 - clear || x - fs * 1.8 > bb.x1 + clear;
      const y0 = top ? m * 1.6 + fs : null, yEnd = top ? null : H - m * 1.3;
      const avail = hClear ? H - m * 2.9 - fs : top ? bb.y0 - clear - y0 : yEnd - (bb.y1 + clear);
      const n = Math.min(all.length, Math.floor(avail / step));
      if (n >= 4 && (!best || n > best.n + 1)) best = { right, top, x, y0, yEnd, n };
    }
    if (!best) return;
    const chars = all.slice(0, best.n), text = chars.join(''), th = best.n * step - fs * track;
    const y0 = best.top ? best.y0 : best.yEnd - th, x = best.x;
    const shown = Math.ceil(best.n * J.clamp((env.lt - 0.08) / 0.55));
    if (shown > 0) env.draw({ text: chars.slice(0, shown).join(''), font, size: fs, x, y: y0, vertical: true, align: 'left', track, color: sc.fg, alpha: 0.9 * o, ghost: false });
    const rx = x + (best.right ? -1 : 1) * fs * 1.1, e = E.outExpo(J.clamp(env.lt / 0.6));
    stroke(env, [[rx, y0 - fs * 0.2], [rx, y0 - fs * 0.2 + (th + fs * 0.4) * e]], sc.sub, Math.max(1, u), 0.7 * o);
    env.rect(rx - 2 * u, y0 - fs * 0.2 - 12 * u, 4 * u, 8 * u, sc.accent, o * e, false);
    label(env, pad2((env.cut.line | 0) + 1), x, y0 - fs * 1.6, { size: FS(env) * 0.75, align: 'center', alpha: o * e });
  },
};

/* ローマ字 — a thin, widely-tracked latin line under the lyric that decodes letter by letter */
const AZ = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
DEF.romajiLine = {
  name: 'ローマ字', nameEn: 'Roman letters', tags: ['editorial', 'calm', 'graphic'], w: 1, layer: 'front',
  draw(env, bb0, P) {
    if (env.pass !== 'main') return;
    const bb = getBB(env, bb0), { W, H, sc } = env, u = U(env), m = MG(env);
    const o = outE(env); if (o <= 0.003 || env.lt < 0) return;
    const raw = String(env.cut.text || '').replace(/\s+/g, ' ').trim(); if (!raw) return;
    let str = env.cut.note ? String(env.cut.note) : null;
    if (!str) { const rj = J.romaji(raw.replace(/[、。！？!?,.・「」]/g, ' ')); str = rj ? rj.toUpperCase().replace(/\s+/g, ' ').trim() : [...raw].filter(c => c.trim()).slice(0, 6).map(c => 'U+' + c.codePointAt(0).toString(16).toUpperCase()).join(' '); }
    const font = (P.v | 0) % 2 ? bodyF(env) : monoF(env), track = 0.34;
    let fs = J.clamp(Math.min(W, H) * 0.018, 12 * u, 20 * u);
    const maxW = Math.min(W - m * 2.4, Math.max(bw(bb) * 1.15, W * 0.4));
    let tw = textW(str, font, fs, track);
    if (tw > maxW) { fs = Math.max(10 * u, fs * maxW / tw); tw = textW(str, font, fs, track); }
    while (tw > maxW && str.length > 4) { str = str.slice(0, -2); tw = textW(str + '...', font, fs, track); if (tw <= maxW) { str += '...'; break; } }
    const gap = 18 * u + bh(bb) * 0.1;
    let below = !!P.low, y = below ? bb.y1 + gap + fs * 0.5 : bb.y0 - gap - fs * 0.5;
    if (y < m * 0.6 || y > H - m * 0.6) { below = !below; y = below ? bb.y1 + gap + fs * 0.5 : bb.y0 - gap - fs * 0.5; }
    const cx = J.clamp((bb.x0 + bb.x1) / 2, m + tw / 2, W - m - tw / 2);
    const chars = [...str], n = chars.length;
    const out = chars.map((c, i) => {
      if (c === ' ') return ' ';
      const ti = 0.06 + i / Math.max(1, n) * 0.5;
      if (env.lt >= ti) return c;
      if (env.lt < ti - 0.22) return ' ';
      return AZ[J.h(P.seed, i, env.step) % 26];
    }).join('');
    // keep glyph positions stable: draw with left alignment from the final string's start
    label(env, out, cx - tw / 2, y, { font, size: fs, color: sc.sub, alpha: o * E.outCubic(J.clamp(env.lt / 0.2)), track });
    const e = E.outExpo(J.clamp((env.lt - 0.1) / 0.5)), hl = 36 * u * e, g = 14 * u;
    segs(env, [[cx - tw / 2 - g - hl, y, cx - tw / 2 - g, y], [cx + tw / 2 + g, y, cx + tw / 2 + g + hl, y]], P.accent ? sc.accent : sc.sub, Math.max(1, u), 0.8 * o);
  },
};

/* 隅付き括弧 — bold 【 】 lenticular brackets clasping the lyric (︻ ︼ for vertical text) */
function lentil(xo, yT, yB, aw, tb, side) {           // xo = outer straight edge; side -1 = 【 (tips to the right), 1 = 】
  const pts = [[xo, yT], [xo - side * aw, yT]], M = 16, h = yB - yT;
  for (let i = 1; i < M; i++) { const t = i / M, b = Math.pow(Math.sin(t * Math.PI), 0.7); pts.push([xo - side * (aw - (aw - tb) * b), yT + h * t]); }
  pts.push([xo - side * aw, yB], [xo, yB]);
  return pts;
}
DEF.bracketsJP = {
  name: '隅付き括弧', nameEn: 'Corner brackets', tags: ['pop', 'graphic', 'editorial'], w: 1, layer: 'front',
  draw(env, bb0, P) {
    const bb = getBB(env, bb0), { W, H, sc } = env, u = U(env);
    const o = outE(env); if (o <= 0.003 || env.lt < 0) return;
    const e = E.outExpo(J.clamp(env.lt / 0.45)), pOut = E.inCubic(env.pOut), sl = (1 - e + pOut * 0.6) * 60 * u;
    const vert = bh(bb) > bw(bb) * 1.25, col = P.accent ? sc.accent : sc.fg, a = o * J.clamp(env.lt / 0.12);
    if (!vert) {
      const h = J.clamp(bh(bb) * 1.08 + 16 * u, 40 * u, H * 0.6) * (0.5 + 0.5 * e), aw = Math.min(h * 0.24, 26 * u + Math.min(W, H) * 0.028), tb = aw * 0.3, gap = 12 * u + bh(bb) * 0.05;
      const yc = (bb.y0 + bb.y1) / 2;
      const xl = Math.max(bb.x0 - gap, aw + 6 * u), xr = Math.min(bb.x1 + gap, W - aw - 6 * u);
      polys(env, [lentil(xl - aw - sl, yc - h / 2, yc + h / 2, aw, tb, -1), lentil(xr + aw + sl, yc - h / 2, yc + h / 2, aw, tb, 1)], col, a, true);
    } else {
      const wv = J.clamp(bw(bb) * 1.05 + 16 * u, 40 * u, W * 0.6) * (0.5 + 0.5 * e), aw = Math.min(wv * 0.24, 26 * u + Math.min(W, H) * 0.028), tb = aw * 0.3, gap = 12 * u + bw(bb) * 0.05;
      const xc = (bb.x0 + bb.x1) / 2, xL = xc - wv / 2, M = 16;
      const yt = Math.max(bb.y0 - gap, aw + 6 * u) - sl, yb = Math.min(bb.y1 + gap, H - aw - 6 * u) + sl;
      const mk = (yi, dir) => { const p = [[xL, yi + dir * aw], [xL, yi]]; for (let i = 1; i < M; i++) { const t = i / M, b = Math.pow(Math.sin(t * Math.PI), 0.7); p.push([xL + wv * t, yi + dir * (aw - tb) * b]); } p.push([xL + wv, yi], [xL + wv, yi + dir * aw]); return p; };
      polys(env, [mk(yt, -1), mk(yb, 1)], col, a, true);
    }
  },
};

/* 落款 — a red seal stamp with one character of the lyric, pressed beside it */
DEF.seal = {
  name: '落款', nameEn: 'Seal stamp', tags: ['editorial', 'emotional', 'calm'], w: 0.9, layer: 'front',
  draw(env, bb0, P) {
    if (env.pass !== 'main') return;
    const bb = getBB(env, bb0), { sc, ctx } = env, u = U(env);
    const o = outE(env); if (o <= 0.003 || env.lt < 0.08) return;
    const ch = lyricChar(env, 3 + (P.v | 0)); if (!ch) return;
    const S = J.clamp(Math.min(env.W, env.H) * 0.074, 48 * u, 92 * u);
    const sp = nearBB(env, bb, S * 1.3, S * 1.3, Object.assign({}, P, { right: P.v % 3 !== 2, low: true }), 14 * u);
    const p = J.clamp((env.lt - 0.08) / 0.3), q = E.outCubic(p), a = J.clamp(p * 4) * o * (sp.ok ? 1 : 0.4);
    const s = J.lerp(1.5, 1, q), rot = (J.rs(P.seed, 1) * 5 - (1 - q) * 12) * DEG, round = (P.v | 0) % 2 === 1;
    ctx.save(); ctx.translate(sp.cx, sp.cy); ctx.rotate(rot); ctx.scale(s, s);
    const h = S / 2, pts = [];
    if (round) { for (let i = 0; i < 28; i++) { const an = i / 28 * TAU, r = h * (1 + J.rs(P.seed, i, 2) * 0.025); pts.push([Math.cos(an) * r, Math.sin(an) * r]); } }
    else { const c = [[-h, -h], [h, -h], [h, h], [-h, h]]; for (let k = 0; k < 4; k++) { const p0 = c[k], p1 = c[(k + 1) % 4]; for (let i = 0; i < 4; i++) { const t = i / 4, j = J.rs(P.seed, k, i, 3) * 1.3 * u; pts.push([J.lerp(p0[0], p1[0], t) + (k % 2 ? j : 0), J.lerp(p0[1], p1[1], t) + (k % 2 ? 0 : j)]); } } }
    polys(env, [pts], sc.accent, a * 0.95, false);
    if (env.pass === 'main') {
      const inner = (P.v | 0) % 3 === 2;
      if (inner) { if (round) env.circle(0, 0, h * 0.84, null, sc.bg, 1.6 * u, a, false); else stroke(env, [[-h * 0.84, -h * 0.84], [h * 0.84, -h * 0.84], [h * 0.84, h * 0.84], [-h * 0.84, h * 0.84]], sc.bg, 1.6 * u, a, false, { close: true }); }
      env.draw({ text: ch, font: serifF(env) === 'mincho_light' ? 'mincho_bold' : serifF(env), size: S * 0.62, x: 0, y: S * 0.02, color: sc.bg, alpha: a, ghost: false });
      const sp2 = []; for (let i = 0; i < 9; i++) sp2.push([J.rs(P.seed, i, 5) * h * 0.9, J.rs(P.seed, i, 6) * h * 0.9, (0.6 + J.r(P.seed, i, 7) * 1.6) * u]);
      dots(env, sp2, sc.bg, a * 0.7);
    }
    ctx.restore();
  },
};

/* ============================================================ registration */
for (const k of Object.keys(DEF)) J.register('decor', k, DEF[k], PK);
})();
