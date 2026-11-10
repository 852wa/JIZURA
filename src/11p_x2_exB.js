/* JIZURA pack: x2exB — 27 mask / clip / band exits (windows that close in odd orders, clip shapes, slices that slide
   out of register, bars and plates that cover the text and take it away, fill and outline leaving separately)
   Every exit: p 0 = exactly the resting item → p 1 = fully gone (also every bar / plate of its own).
   Windows live in design space on the item's (rotated) bounding box; "along" = the writing direction, "cross" = across it,
   so the same recipe works for horizontal and vertical text. Deterministic (it.seed / cut seed). */
(() => {
'use strict';
const E = J.E;
const P = 'x2exB';
const DEG = J.DEG, TAU = J.TAU, PI = Math.PI;
const clamp = J.clamp, lerp = J.lerp;
const BIG = 8000;
const X = {};

/* ---------------- easing ---------------- */
const seg = (x, a, b) => clamp((x - a) / (b - a));
const ioC = x => E.inOutCubic(clamp(x));
const oC = x => E.outCubic(clamp(x));
const iC = x => { x = clamp(x); return x * x * x; };
const iQ = x => { x = clamp(x); return x * x; };
const win = (p, o, spread) => clamp((p - o * spread) / (1 - spread));

/* ---------------- item helpers ---------------- */
const isHex = c => typeof c === 'string' && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(c);
const al = it => it.alpha ?? 1;
const layOf = it => (it._m || (it._m = J.measure(it))).lay;
const cutN = env => Math.max(1, J.glyphCount(String(env.cut && env.cut.text || '')));
const cutBit = (env, k) => (J.h(env.cut && env.cut.seed | 0, k, 991) & 1) === 1;      // same choice for every item of a cut
const isBlank = ch => ch === ' ' || ch === '　';
const hot = (env, it) => { const sc = env.sc; return it.color === sc.accent ? (sc.accent2 || sc.fg) : sc.accent; };
const inkOf = (env, it) => (isHex(it.color) ? it.color : env.sc.fg);
const plateCol = (env, it) => {
  const sc = env.sc, c = sc.ink;
  return isHex(c) && isHex(sc.bg) && c !== it.color && Math.abs(J.lum(c) - J.lum(sc.bg)) > 0.3 ? c : hot(env, it);
};
const rot2 = (x, y, r) => { const c = Math.cos(r), s = Math.sin(r); return [x * c - y * s, x * s + y * c]; };

function chainPost(it, fn) { const p0 = it.post; it.post = (env, it2, bb) => { if (p0) p0(env, it2, bb); fn(env, it2, bb); }; }

/* rotated item box → design-space AABB (+pad) */
function dBox(it, pad) {
  it._m = J.measure(it);
  const b = J.itemBox(it), r = (it.rot || 0) * DEG;
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const [px, py] of [[b.x0, b.y0], [b.x1, b.y0], [b.x0, b.y1], [b.x1, b.y1]]) {
    const [dx, dy] = rot2(px - it.x, py - it.y, r), x = it.x + dx, y = it.y + dy;
    x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
  }
  const sk = Math.abs(Math.tan((it.skew || 0) * DEG)) * b.h * 0.5;
  x0 -= pad + sk; x1 += pad + sk; y0 -= pad; y1 += pad;
  return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
}
/* the box as along / cross extents: a = along the writing direction, b = across it */
function frame(it, pad) {
  const bb = dBox(it, pad), turned = Math.abs(Math.sin((it.rot || 0) * DEG)) > 0.72;
  const v = !!it.vertical !== turned;
  const F = v ? { v, a0: bb.y0, a1: bb.y1, b0: bb.x0, b1: bb.x1, bb } : { v, a0: bb.x0, a1: bb.x1, b0: bb.y0, b1: bb.y1, bb };
  F.len = F.a1 - F.a0; F.cr = F.b1 - F.b0; F.ac = (F.a0 + F.a1) / 2; F.bc = (F.b0 + F.b1) / 2;
  return F;
}
const rAB = (ctx, v, a0, b0, a1, b1) => (v ? ctx.rect(b0, a0, b1 - b0, a1 - a0) : ctx.rect(a0, b0, a1 - a0, b1 - b0));
const eAB = (env, v, a0, b0, a1, b1, col, a) => {
  if (a1 - a0 < 0.2 || b1 - b0 < 0.2 || a <= 0.004) return;
  if (v) env.rect(b0, a0, b1 - b0, a1 - a0, col, a, false); else env.rect(a0, b0, a1 - a0, b1 - b0, col, a, false);
};
const PT = (v, a, b) => (v ? [b, a] : [a, b]);
const barW = it => Math.max(3, it.size * 0.045);

/* rows across the line, shifted ALONG it: [[b0, b1, shift], …] (sorted) */
function setRows(it, F, rows) {
  rows[0][0] -= BIG; rows[rows.length - 1][1] += BIG;
  if (F.v) { it.vbands = rows; it.bands = null; } else { it.bands = rows; it.vbands = null; }
}
/* slices along the line, shifted ACROSS it: [[a0, a1, shift], …] (sorted) */
function setCols(it, F, cols) {
  cols[0][0] -= BIG; cols[cols.length - 1][1] += BIG;
  if (F.v) { it.bands = cols; it.vbands = null; } else { it.vbands = cols; it.bands = null; }
}
/* an extra copy of the item, optionally inside a clip path */
function copyDraw(env, it, mods, pathFn) {
  const ctx = env.ctx, c = Object.assign({}, it, { pre: null, post: null, streak: null, echo: null }, mods);
  ctx.save();
  if (pathFn) { ctx.beginPath(); pathFn(ctx); ctx.clip(); }
  J.drawItem(env, c);
  ctx.restore();
}
/* main item becomes its own outline; returns what the filled copy needs */
function toOutline(it, lw) {
  const o = { fill: it.fill, stroke: it.stroke, strokeColor: it.strokeColor, shadow: it.shadow, extrude: it.extrude, alpha: al(it), dash: it.dash, strokeDash: it.strokeDash };
  it.fill = false; it.stroke = Math.max(it.stroke || 0, lw);
  if (!it.strokeColor) it.strokeColor = it.color || '#ffffff';
  it.shadow = null; it.extrude = null;
  return o;
}
function inItem(env, it, fn) {
  const ctx = env.ctx; ctx.save(); ctx.translate(it.x, it.y); if (it.rot) ctx.rotate(it.rot * DEG);
  try { fn(ctx); } finally { ctx.restore(); }
}

/* =====================================================================
   A. WINDOWS
   ===================================================================== */

/* 四辺が詰まる — the crop closes one edge at a time: left, top, right, bottom, round after round, each move a clean step marked by a tick on the moving edge */
X.xiCropTurns = {
  name: '四辺が詰まる', en: 'Crop In Turns', tags: ['graphic', 'editorial', 'glitch'], w: 1, ae: 'wipe',
  outDur: dur => clamp(dur * 0.42, 0.32, 0.8),
  apply(env, it, p) {
    const sz = it.size, F = frame(it, sz * 0.3), S = 11, u = p * S, n = [0, 0, 0, 0];
    for (let s = 0; s < S; s++) n[s % 4] += ioC(seg(u - s, 0, 0.8));
    const a0 = lerp(F.a0, F.ac, n[0] / 3), b0 = lerp(F.b0, F.bc, n[1] / 3), a1 = lerp(F.a1, F.ac, n[2] / 3), b1 = lerp(F.b1, F.bc, n[3] / 3);
    if (a1 - a0 < 0.5 || b1 - b0 < 0.5) { it.alpha = 0; return; }
    it.clipFn = (ctx) => rAB(ctx, F.v, a0, b0, a1, b1);
    const s = Math.floor(u), j = s % 4, fr = u - s, th = barW(it), acc = hot(env, it), a = al(it);
    if (fr < 0.86) chainPost(it, (env2) => {
      if (j === 0) eAB(env2, F.v, a0 - th, b0, a0, b1, acc, a);
      else if (j === 1) eAB(env2, F.v, a0, b0 - th, a1, b0, acc, a);
      else if (j === 2) eAB(env2, F.v, a1, b0, a1 + th, b1, acc, a);
      else eAB(env2, F.v, a0, b1, a1, b1 + th, acc, a);
    });
  },
};

/* 覗き窓が去る — the view narrows to a small framed finder at the head of the line, the finder pans along the text, runs off its end and shuts */
X.xiFinder = {
  name: '覗き窓が去る', en: 'Viewfinder Pan', tags: ['editorial', 'graphic', 'calm'], w: 1.1, ae: 'wipe', minDur: 0.6,
  outDur: dur => clamp(dur * 0.45, 0.36, 0.9),
  apply(env, it, p) {
    const sz = it.size, F = frame(it, sz * 0.3), len = F.len, hb = F.cr / 2;
    const wl = Math.min(Math.max(sz * 0.95, len * 0.22), len * 0.55);
    const q1 = ioC(seg(p, 0, 0.3)), q2 = ioC(seg(p, 0.3, 0.78)), q3 = iC(seg(p, 0.78, 1));
    let s0 = F.a0 + (len - wl) * q2 + wl * q3;
    let s1 = lerp(F.a1, F.a0 + wl, q1) + (len - wl) * q2 + wl * q3;
    if (cutBit(env, 5)) { const t = s0; s0 = F.a0 + F.a1 - s1; s1 = F.a0 + F.a1 - t; }
    const h = hb * (1 - q3), b0 = F.bc - h, b1 = F.bc + h;
    if (h < 0.4 || s1 - s0 < 0.4) { it.alpha = 0; return; }
    it.clipFn = (ctx) => rAB(ctx, F.v, s0, b0, s1, b1);
    const a = al(it) * seg(p, 0, 0.14) * (1 - seg(p, 0.93, 1)), acc = hot(env, it), lw = Math.max(2, sz * 0.028);
    const m = Math.min(sz * 0.24, (s1 - s0) * 0.3, h * 0.7), v = F.v, g = lw * 0.5;
    if (a > 0.01) chainPost(it, (env2) => {
      for (const [ca, da] of [[s0 - g, 1], [s1 + g, -1]]) for (const [cb, db] of [[b0 - g, 1], [b1 + g, -1]])
        env2.line([PT(v, ca + da * m, cb), PT(v, ca, cb), PT(v, ca, cb + db * m)], acc, lw, a, false);
    });
  },
};

/* すれ違いワイプ — the upper half is wiped from the head, the lower half from the tail: two short bars pass each other in the middle */
X.xiCounterWipe = {
  name: 'すれ違いワイプ', en: 'Counter Wipe', tags: ['graphic', 'editorial', 'pop'], w: 1.2, ae: 'wipe',
  apply(env, it, p) {
    const sz = it.size, F = frame(it, sz * 0.3), th = barW(it), v = F.v;
    const e1 = ioC(seg(p, 0, 0.84)), e2 = ioC(seg(p, 0.16, 1));
    const x1 = lerp(F.a0, F.a1, e1), x2 = lerp(F.a1, F.a0, e2);
    it.clipFn = (ctx) => { if (e1 < 1) rAB(ctx, v, x1, F.b0 - BIG, F.a1 + BIG, F.bc); if (e2 < 1) rAB(ctx, v, F.a0 - BIG, F.bc, x2, F.b1 + BIG); };
    const acc = hot(env, it), a = al(it), i0 = F.b0 + sz * 0.16, i1 = F.b1 - sz * 0.16;
    chainPost(it, (env2) => {
      if (e1 > 0 && e1 < 1) eAB(env2, v, x1 - th, i0, x1, F.bc, acc, a);
      if (e2 > 0 && e2 < 1) eAB(env2, v, x2, F.bc, x2 + th, i1, acc, a);
    });
  },
};

/* 二度拭き — a bar crosses the text and takes every other hairline stripe with it; it turns at the end and on the way back takes the rest */
X.xiTwoPass = {
  name: '二度拭き', en: 'Two-Pass Wipe', tags: ['graphic', 'editorial', 'glitch'], w: 1.1, ae: 'wipe', minDur: 0.55,
  outDur: dur => clamp(dur * 0.45, 0.36, 0.85),
  apply(env, it, p) {
    const sz = it.size, F = frame(it, sz * 0.3), v = F.v;
    const n = Math.min(64, Math.max(4, Math.ceil(F.cr / Math.max(3, sz * 0.085)))), pitch = F.cr / n;
    const e1 = ioC(seg(p, 0, 0.46)), e2 = ioC(seg(p, 0.54, 1));
    const xa = lerp(F.a0, F.a1, e1), xb = lerp(F.a1, F.a0, e2), lim = Math.min(xa, xb);
    if (lim - F.a0 < 0.4 && e1 >= 1) { it.alpha = 0; return; }
    it.clipFn = (ctx) => {
      if (e1 < 1) rAB(ctx, v, xa, F.b0 - BIG, F.a1 + BIG, F.b1 + BIG);
      if (lim > F.a0) for (let j = 0; j < n; j += 2) rAB(ctx, v, F.a0 - (j ? 0 : 0), F.b0 + j * pitch, lim, F.b0 + (j + 1) * pitch);
    };
    const th = barW(it) * 1.3, acc = hot(env, it), a = al(it), pos = p < 0.5 ? xa : xb;
    const k = oC(seg(p, 0, 0.07)) * (1 - iC(seg(p, 0.93, 1))), h = (F.cr / 2 - sz * 0.12) * k;
    chainPost(it, (env2) => eAB(env2, v, pos - th / 2, F.bc - h, pos + th / 2, F.bc + h, acc, a));
  },
};

/* 中央から拭う — a double bar appears in the middle of the line and parts: the text is wiped from its centre out to both ends */
X.xiCentreOut = {
  name: '中央から拭う', en: 'Centre Parting', tags: ['graphic', 'editorial', 'calm'], w: 1.1, ae: 'wipe',
  apply(env, it, p) {
    const sz = it.size, F = frame(it, sz * 0.3), v = F.v, th = barW(it);
    const g = (F.len / 2) * ioC(seg(p, 0.08, 1));
    if (F.len / 2 - g < 0.4) { it.alpha = 0; return; }
    it.clipFn = (ctx) => { rAB(ctx, v, F.a0 - BIG, F.b0 - BIG, F.ac - g, F.b1 + BIG); rAB(ctx, v, F.ac + g, F.b0 - BIG, F.a1 + BIG, F.b1 + BIG); };
    const acc = hot(env, it), a = al(it), h = (F.cr / 2 - sz * 0.12) * oC(seg(p, 0, 0.12)) * (1 - iC(seg(p, 0.9, 1)));
    chainPost(it, (env2) => {
      eAB(env2, v, F.ac - g - th, F.bc - h, F.ac - g, F.bc + h, acc, a);
      eAB(env2, v, F.ac + g, F.bc - h, F.ac + g + th, F.bc + h, acc, a);
    });
  },
};

/* =====================================================================
   B. CLIP SHAPES
   ===================================================================== */

/* 斜めに挟む — two parallel slanted edges come in from opposite corners and pinch the text into a thin diagonal sliver */
X.xiDiagPinch = {
  name: '斜めに挟む', en: 'Diagonal Pinch', tags: ['graphic', 'pop', 'editorial'], w: 1.1, ae: 'wipe',
  apply(env, it, p) {
    const sz = it.size, F = frame(it, sz * 0.25), bb = F.bb;
    const ang = ((F.v ? 90 : 0) + (cutBit(env, 11) ? 34 : -34)) * DEG, d = [Math.cos(ang), Math.sin(ang)], t = [-d[1], d[0]];
    const cs = [[bb.x0, bb.y0], [bb.x1, bb.y0], [bb.x0, bb.y1], [bb.x1, bb.y1]];
    const us = cs.map(c => c[0] * d[0] + c[1] * d[1]), ws = cs.map(c => c[0] * t[0] + c[1] * t[1]);
    const u0 = Math.min(...us), u1 = Math.max(...us), w0 = Math.min(...ws), w1 = Math.max(...ws), uc = (u0 + u1) / 2;
    const s0 = lerp(u0, uc, ioC(seg(p, 0, 0.86))), s1 = lerp(u1, uc, ioC(seg(p, 0.14, 1)));
    if (s1 - s0 < 0.5) { it.alpha = 0; return; }
    const pt = (u, w) => [d[0] * u + t[0] * w, d[1] * u + t[1] * w];
    it.clipFn = (ctx) => {
      const A = pt(s0, w0 - BIG), B = pt(s0, w1 + BIG), C = pt(s1, w1 + BIG), D = pt(s1, w0 - BIG);
      ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.lineTo(C[0], C[1]); ctx.lineTo(D[0], D[1]); ctx.closePath();
    };
    const acc = hot(env, it), lw = Math.max(2, sz * 0.03), a = al(it) * seg(p, 0, 0.1) * (1 - seg(p, 0.92, 1)), ex = sz * 0.12;
    if (a > 0.01) chainPost(it, (env2) => {
      if (env2.pass !== 'main') return;
      const ctx = env2.ctx; ctx.save(); ctx.beginPath(); ctx.rect(bb.x0 - ex, bb.y0 - ex, bb.w + ex * 2, bb.h + ex * 2); ctx.clip();
      env2.line([pt(s0 - lw / 2, w0 - ex), pt(s0 - lw / 2, w1 + ex)], acc, lw, a, false);
      env2.line([pt(s1 + lw / 2, w0 - ex), pt(s1 + lw / 2, w1 + ex)], acc, lw, a, false);
      ctx.restore();
    });
  },
};

/* 虫食い穴 — round holes open here and there in the text, small at first, then they spread into each other until nothing is left */
X.xiMothHoles = {
  name: '虫食い穴', en: 'Moth Holes', tags: ['emotional', 'graphic', 'calm'], w: 1, ae: 'wipe', minDur: 0.6,
  outDur: dur => clamp(dur * 0.45, 0.36, 0.9),
  apply(env, it, p) {
    const sz = it.size, F = frame(it, sz * 0.15), seed = it.seed | 0, v = F.v;
    const n = clamp(Math.round(F.len / (sz * 0.6)) + 3, 5, 12), holes = [];
    const rm = Math.hypot(F.len / n * 0.96, F.cr * 0.86) + 2;      // every point is within rm of a hole centre
    for (let i = 0; i < n; i++) {
      const a = F.a0 + F.len * clamp((i + 0.5 + J.rs(seed, i, 71) * 0.45) / n), b = F.b0 + F.cr * (0.15 + 0.7 * J.r(seed, i, 72));
      const q = seg(p, i === 0 ? 0 : J.r(seed, i, 73) * 0.4, 1);
      if (q <= 0) continue;
      const r0 = sz * (0.16 + 0.2 * J.r(seed, i, 74));
      const r = r0 * oC(seg(q, 0, 0.35)) + (rm - r0) * iQ(seg(q, 0.3, 1));
      const c = PT(v, a, b);
      holes.push(c[0], c[1], r);
    }
    if (!holes.length) return;
    it.clipFn = (ctx) => {
      for (let j = 0; j < holes.length; j += 3) {             // one even-odd clip per hole, so overlapping holes stay holes
        ctx.beginPath(); ctx.rect(-BIG, -BIG, BIG * 3, BIG * 3);
        ctx.moveTo(holes[j] + holes[j + 2], holes[j + 1]); ctx.arc(holes[j], holes[j + 1], holes[j + 2], 0, TAU);
        ctx.clip('evenodd');
      }
      ctx.beginPath(); ctx.rect(-BIG, -BIG, BIG * 3, BIG * 3);
    };
  },
};

/* 噛みちぎる — two rows of interlocking saw teeth close on the text from both sides: a first bite, a breath, then the jaws lock and the seam pulls shut */
X.xiSawBite = {
  name: '噛みちぎる', en: 'Saw Bite', tags: ['pop', 'graphic', 'glitch'], w: 1, ae: 'wipe', minDur: 0.55,
  outDur: dur => clamp(dur * 0.42, 0.34, 0.8),
  apply(env, it, p) {
    const sz = it.size, F = frame(it, sz * 0.25), v = F.v;
    const A = Math.min(sz * 0.36, F.cr * 0.4), pitch = Math.max(sz * 0.62, F.len / 30), half = pitch / 2;
    const gap0 = F.cr + A;
    let gf;
    if (p < 0.3) gf = lerp(1, 0.2, ioC(p / 0.3)); else if (p < 0.46) gf = lerp(0.2, 0.42, oC(seg(p, 0.3, 0.46))); else gf = 0.42 * (1 - iC(seg(p, 0.46, 0.8)));
    const gap = gap0 * gf, bt = F.bc - A / 2 - gap / 2, bb2 = bt + A + gap;
    const m = Math.ceil((F.len + sz) / half) + 1, aS = F.a0 - sz * 0.5;
    const top = [], bot = [];
    for (let i = 0; i <= m; i++) { const a = aS + i * half; top.push(PT(v, a, bt + (i % 2 ? A : 0))); bot.push(PT(v, a, bb2 - (i % 2 ? 0 : A))); }
    if (gap < 0.4) it.alpha = 0;
    else it.clipFn = (ctx) => {
      ctx.moveTo(top[0][0], top[0][1]); for (let i = 1; i <= m; i++) ctx.lineTo(top[i][0], top[i][1]);
      for (let i = m; i >= 0; i--) ctx.lineTo(bot[i][0], bot[i][1]);
      ctx.closePath();
    };
    const acc = hot(env, it), lw = Math.max(2, sz * 0.03), a = al(it) * seg(p, 0, 0.1);
    const shut = iC(seg(p, 0.8, 1)), k0 = Math.floor(m / 2 * shut), k1 = m - k0;
    if (a > 0.01 && k1 - k0 >= 1) chainPost(it, (env2) => {
      env2.line(top.slice(k0, k1 + 1), acc, lw, a, false);
      if (gap >= 0.4) env2.line(bot.slice(k0, k1 + 1), acc, lw, a, false);
    });
  },
};

/* 放射ブラインド — the text is seen through a turning fan of wedges around its centre; the wedges narrow one after another until the fan is shut */
X.xiRadialBlinds = {
  name: '放射ブラインド', en: 'Radial Blinds', tags: ['graphic', 'pop', 'editorial'], w: 1, ae: 'wipe',
  apply(env, it, p) {
    const sz = it.size, bb = dBox(it, sz * 0.25), n = 12, R = Math.hypot(bb.w, bb.h) / 2 + sz * 0.2;
    const turn = (cutBit(env, 21) ? 1 : -1) * 42 * DEG * ioC(p), wd = [];
    for (let k = 0; k < n; k++) {
      const h = (PI / n) * (1 - ioC(win(p, (k % 2) * 0.62 + (k % 3) * 0.12, 0.5)));
      if (h > 0.002) wd.push(k * TAU / n + turn, h + (h > PI / n * 0.995 ? 0.004 : 0));
    }
    if (!wd.length) { it.alpha = 0; return; }
    it.clipFn = (ctx) => { for (let j = 0; j < wd.length; j += 2) { ctx.moveTo(bb.cx, bb.cy); ctx.arc(bb.cx, bb.cy, R, wd[j] - wd[j + 1], wd[j] + wd[j + 1]); ctx.closePath(); } };
  },
};

/* 丸窓 — the text shrinks back into a row of portholes, each ringed for a moment; the portholes then close from the ends towards the middle */
X.xiPortholes = {
  name: '丸窓', en: 'Portholes', tags: ['pop', 'graphic', 'calm'], w: 0.9, ae: 'shrink', minDur: 0.55,
  outDur: dur => clamp(dur * 0.42, 0.34, 0.8),
  apply(env, it, p) {
    const sz = it.size, F = frame(it, sz * 0.2), v = F.v;
    const n = clamp(Math.round(F.len / (F.cr * 0.95)), 1, 16), cw = F.len / n;
    const R0 = Math.hypot(cw / 2, F.cr / 2) * 1.03, rp = Math.min(F.cr * 0.4, cw * 0.46), hs = [], mid = (n - 1) / 2;
    const acc = hot(env, it), lw = Math.max(2, sz * 0.03), a0 = al(it);
    for (let i = 0; i < n; i++) {
      const o = n > 1 ? 1 - Math.abs(i - mid) / mid : 0, q = win(p, o, 0.3);
      const r = lerp(R0, rp, ioC(seg(q, 0, 0.42))) * (1 - iC(seg(q, 0.58, 1)));
      if (r < 0.3) continue;
      const c = PT(v, F.a0 + (i + 0.5) * cw, F.bc);
      hs.push(c[0], c[1], r, seg(q, 0.2, 0.42) * (1 - seg(q, 0.9, 1)));
    }
    if (!hs.length) { it.alpha = 0; return; }
    it.clipFn = (ctx) => { for (let j = 0; j < hs.length; j += 4) { ctx.moveTo(hs[j] + hs[j + 2], hs[j + 1]); ctx.arc(hs[j], hs[j + 1], hs[j + 2], 0, TAU); } };
    chainPost(it, (env2) => { for (let j = 0; j < hs.length; j += 4) if (hs[j + 3] > 0.01) env2.circle(hs[j], hs[j + 1], hs[j + 2] + lw / 2, null, acc, lw, a0 * hs[j + 3], false); });
  },
};

/* 網目に痩せる — the text thins to a diagonal lattice: only two sets of crossing slanted lines of it remain, and they grow finer until they are gone */
X.xiLattice = {
  name: '網目に痩せる', en: 'Lattice Thin', tags: ['graphic', 'editorial', 'calm'], w: 1, ae: 'wipe', minDur: 0.5,
  outDur: dur => clamp(dur * 0.42, 0.34, 0.8),
  apply(env, it, p) {
    const sz = it.size, F = frame(it, sz * 0.2), bb = F.bb;
    const f1 = lerp(1, 0.17, ioC(seg(p, 0, 0.4))) * (1 - iQ(seg(p, 0.42, 0.9)));
    const f2 = lerp(1, 0.17, ioC(seg(p, 0.06, 0.46))) * (1 - iQ(seg(p, 0.5, 1)));
    if (f1 < 0.004 && f2 < 0.004) { it.alpha = 0; return; }
    let pitch = Math.max(Math.min(F.cr * 0.75, sz * 1.1), sz * 0.55);
    const span = bb.w + bb.h; if (span / pitch > 22) pitch = span / 22;
    const bands = [], cs = [[bb.x0, bb.y0], [bb.x1, bb.y0], [bb.x0, bb.y1], [bb.x1, bb.y1]];
    [[(F.v ? 90 : 0) + 52, f1], [(F.v ? 90 : 0) - 52, f2]].forEach(([deg, f]) => {
      if (f < 0.004) return;
      const d = [Math.cos(deg * DEG), Math.sin(deg * DEG)], nr = [-d[1], d[0]];
      const os = cs.map(c => (c[0] - bb.cx) * nr[0] + (c[1] - bb.cy) * nr[1]), lo = Math.min(...os), hi = Math.max(...os);
      const hw = pitch / 2 * f + (f > 0.995 ? 0.4 : 0);
      for (let k = Math.floor(lo / pitch); k <= Math.ceil(hi / pitch); k++) bands.push(d, nr, k * pitch, hw);
    });
    it.clipFn = (ctx) => {
      for (let j = 0; j < bands.length; j += 4) {
        const d = bands[j], nr = bands[j + 1], o = bands[j + 2], hw = bands[j + 3], L = BIG;
        const q = (l, w) => [bb.cx + d[0] * l + nr[0] * w, bb.cy + d[1] * l + nr[1] * w];
        const A = q(-L, o - hw), B = q(L, o - hw), C = q(L, o + hw), D = q(-L, o + hw);
        ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.lineTo(C[0], C[1]); ctx.lineTo(D[0], D[1]); ctx.closePath();
      }
    };
  },
};

/* 波紋抜き — the text is cut into concentric rings around its centre; ring after ring thins to a hairline and goes out */
X.xiRings = {
  name: '波紋抜き', en: 'Ring Shutters', tags: ['graphic', 'calm', 'emotional'], w: 1, ae: 'wipe',
  outDur: dur => clamp(dur * 0.4, 0.3, 0.8),
  apply(env, it, p) {
    const sz = it.size, bb = dBox(it, sz * 0.2), Rm = Math.hypot(bb.w, bb.h) / 2;
    const pitch = Math.max(sz * 0.3, Rm / 14), n = Math.max(2, Math.ceil(Rm / pitch)), inward = cutBit(env, 31), rs = [];
    for (let k = 0; k < n; k++) {
      const o = inward ? 1 - k / (n - 1) : k / (n - 1), keep = 1 - ioC(win(p, o, 0.55));
      if (keep < 0.01) continue;
      const rm = (k + 0.5) * pitch, hw = pitch / 2 * keep + (keep > 0.995 ? 0.4 : 0);
      rs.push(Math.max(0, rm - hw), rm + hw);
    }
    if (!rs.length) { it.alpha = 0; return; }
    it.clipFn = (ctx) => {
      for (let j = 0; j < rs.length; j += 2) {
        ctx.moveTo(bb.cx + rs[j + 1], bb.cy); ctx.arc(bb.cx, bb.cy, rs[j + 1], 0, TAU, false);
        if (rs[j] > 0.3) { ctx.moveTo(bb.cx + rs[j], bb.cy); ctx.arc(bb.cx, bb.cy, rs[j], 0, TAU, true); }
      }
    };
  },
};

/* 渦巻きタイル — the text is seen through a grid of small windows that shut one by one along a spiral, from the rim inwards */
const SPIRAL = new Map();
function spiralOrder(nx, ny) {
  const key = nx + 'x' + ny; let o = SPIRAL.get(key); if (o) return o;
  o = new Array(nx * ny);
  let x0 = 0, y0 = 0, x1 = nx - 1, y1 = ny - 1, k = 0;
  while (x0 <= x1 && y0 <= y1) {
    for (let x = x0; x <= x1; x++) o[y0 * nx + x] = k++;
    for (let y = y0 + 1; y <= y1; y++) o[y * nx + x1] = k++;
    if (y1 > y0) for (let x = x1 - 1; x >= x0; x--) o[y1 * nx + x] = k++;
    if (x1 > x0) for (let y = y1 - 1; y > y0; y--) o[y * nx + x0] = k++;
    x0++; y0++; x1--; y1--;
  }
  if (SPIRAL.size > 200) SPIRAL.clear();
  SPIRAL.set(key, o); return o;
}
X.xiSpiralTiles = {
  name: '渦巻きタイル', en: 'Spiral Tiles', tags: ['graphic', 'glitch', 'pop'], w: 0.8, ae: 'wipe', minDur: 0.55,
  outDur: dur => clamp(dur * 0.45, 0.36, 0.9),
  apply(env, it, p) {
    const sz = it.size, F = frame(it, sz * 0.15), v = F.v;
    let ny = clamp(Math.round(F.cr / (sz * 0.5)), 2, 6), cell = F.cr / ny, nx = Math.max(1, Math.ceil(F.len / cell - 0.01));
    if (nx * ny > 132) { nx = Math.floor(132 / ny); }
    const cw = F.len / nx, N = nx * ny, ord = spiralOrder(nx, ny), rc = [];
    for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++) {
      const keep = 1 - ioC(win(p, N > 1 ? ord[y * nx + x] / (N - 1) : 0, 0.62));
      if (keep < 0.015) continue;
      const a = F.a0 + x * cw, b = F.b0 + y * cell, e = keep > 0.995 ? 0.4 : 0;
      if ((x + y) & 1) rc.push(a + cw * (1 - keep) / 2, b, a + cw * (1 + keep) / 2 + e, b + cell + e);
      else rc.push(a, b + cell * (1 - keep) / 2, a + cw + e, b + cell * (1 + keep) / 2 + e);
    }
    if (!rc.length) { it.alpha = 0; return; }
    it.clipFn = (ctx) => { for (let j = 0; j < rc.length; j += 4) rAB(ctx, v, rc[j], rc[j + 1], rc[j + 2], rc[j + 3]); };
  },
};

/* まぶたを閉じる — two curved lids close over the text like an eye: they droop, lift once more, then shut, and the lash line draws in to nothing */
X.xiEyelid = {
  name: 'まぶたを閉じる', en: 'Eyelid', tags: ['emotional', 'calm', 'editorial'], w: 1.1, ae: 'wipe', minDur: 0.6,
  outDur: dur => clamp(dur * 0.45, 0.38, 0.95),
  apply(env, it, p) {
    const sz = it.size, F = frame(it, sz * 0.25), v = F.v;
    const L = F.len * 0.5 + sz * 0.9, xc = F.len / 2, yc = F.cr / 2;
    const yy = (x, h) => { const R = (L * L + h * h) / (2 * h); return Math.sqrt(Math.max(0, R * R - x * x)) - (R - h); };
    let h0 = F.cr * 0.9 + sz * 0.3;
    for (let k = 0; k < 8 && yy(xc, h0) < yc; k++) h0 *= 1.3;
    const hA = yc * 0.5, hB = yc * 0.92;                      // half closed (cuts into the glyphs) / lifted again
    let h;
    if (p < 0.3) h = lerp(h0, hA, ioC(p / 0.3)); else if (p < 0.46) h = lerp(hA, hB, ioC(seg(p, 0.3, 0.46))); else h = hB * (1 - ioC(seg(p, 0.46, 0.8)));
    const K = 22, up = [], dn = [];
    const shut = ioC(seg(p, 0.8, 1)), acc = hot(env, it), lw = Math.max(2, sz * 0.028), a = al(it) * seg(p, 0.02, 0.14);
    if (h < 0.6) {
      it.alpha = 0;
      const e = L * (1 - shut);
      if (e > 1) chainPost(it, (env2) => env2.line([PT(v, F.ac - e, F.bc), PT(v, F.ac + e, F.bc)], acc, lw, a, false));
      return;
    }
    for (let i = 0; i <= K; i++) { const x = L * (i / K * 2 - 1), y = yy(x, h); up.push(PT(v, F.ac + x, F.bc - y)); dn.push(PT(v, F.ac + x, F.bc + y)); }
    it.clipFn = (ctx) => {
      ctx.moveTo(up[0][0], up[0][1]); for (let i = 1; i <= K; i++) ctx.lineTo(up[i][0], up[i][1]);
      for (let i = K - 1; i >= 0; i--) ctx.lineTo(dn[i][0], dn[i][1]);
      ctx.closePath();
    };
    if (a > 0.01) chainPost(it, (env2) => { env2.line(up, acc, lw, a, false); env2.line(dn, acc, lw, a, false); });
  },
};

/* 格子が通る — a picket of slits slides across the text while its slats widen: the text flickers through ever narrower gaps and is shut out */
X.xiPicket = {
  name: '格子が通る', en: 'Picket Pass', tags: ['graphic', 'glitch', 'editorial'], w: 1, ae: 'wipe',
  outDur: dur => clamp(dur * 0.4, 0.3, 0.8),
  apply(env, it, p) {
    const sz = it.size, F = frame(it, sz * 0.3), v = F.v;
    const pitch = Math.max(sz * 0.3, F.len / 48);
    const open = pitch * lerp(1, 0.42, ioC(seg(p, 0, 0.34))) * (1 - iQ(seg(p, 0.36, 0.96)));
    if (open < 0.3) { it.alpha = 0; return; }
    const off = (cutBit(env, 41) ? 1 : -1) * pitch * 3.2 * E.inOutSine(p), e = open > pitch * 0.995 ? 0.5 : 0;
    const s = F.a0 - pitch * 5 + off;
    it.clipFn = (ctx) => { for (let a = s; a < F.a1 + pitch; a += pitch) rAB(ctx, v, a + (pitch - open) / 2, F.b0 - BIG, a + (pitch + open) / 2 + e, F.b1 + BIG); };
  },
};

/* =====================================================================
   C. BANDS / SLICES
   ===================================================================== */

/* インターレース — the text splits into its two scan-line fields: one slips out of register, then the other the opposite way, and the two fields run off in opposite directions */
X.xiFields = {
  name: 'インターレース', en: 'Field Split', tags: ['glitch', 'graphic', 'editorial'], w: 1.1, ae: 'slice',
  outDur: dur => clamp(dur * 0.4, 0.3, 0.75),
  apply(env, it, p) {
    const sz = it.size, F = frame(it, sz * 0.3), v = F.v;
    let pitch = Math.max(2.5, sz * 0.055); if (F.cr / pitch > 90) pitch = F.cr / 90;
    const n = Math.ceil(F.cr / pitch), far = (v ? env.H : env.W) + F.len;
    const dB = sz * 0.11 * oC(seg(p, 0, 0.14)) + far * iC(seg(p, 0.34, 0.9));
    const dA = -sz * 0.11 * oC(seg(p, 0.2, 0.34)) - far * iC(seg(p, 0.42, 0.98));
    const rows = par => ctx => {
      for (let j = par; j < n; j += 2) rAB(ctx, v, -BIG, F.b0 + j * pitch, BIG * 2, F.b0 + (j + 1) * pitch);
      if (!par) { rAB(ctx, v, -BIG, F.b0 - BIG, BIG * 2, F.b0); rAB(ctx, v, -BIG, F.b0 + n * pitch, BIG * 2, F.b1 + BIG); }
    };
    if (v) it.y += dA; else it.x += dA;
    it.clipFn = rows(0);
    chainPost(it, (env2, it2) => copyDraw(env2, it2, v ? { y: it2.y - dA + dB } : { x: it2.x - dA + dB }, rows(1)));
  },
};

/* 引き出し — the text is a chest of drawers: slice after slice is tugged out a notch, waits, and is then pulled right out, alternately to either side */
X.xiDrawers = {
  name: '引き出し', en: 'Drawers', tags: ['graphic', 'pop', 'editorial'], w: 1, ae: 'slice', minDur: 0.5,
  outDur: dur => clamp(dur * 0.42, 0.34, 0.8),
  apply(env, it, p) {
    const sz = it.size, F = frame(it, sz * 0.2), n = clamp(Math.round(F.cr / (sz * 0.28)), 4, 9), h = F.cr / n;
    const far = (F.v ? env.H : env.W) + F.len, d = 0.44, st = (1 - d) / (n - 1), s0 = cutBit(env, 45) ? 1 : -1, rows = [];
    for (let k = 0; k < n; k++) {
      const q = seg(p, k * st, k * st + d);
      rows.push([F.b0 + k * h, F.b0 + (k + 1) * h + (k < n - 1 ? 0.6 : 0), (k % 2 ? 1 : -1) * s0 * (sz * 0.24 * oC(seg(q, 0, 0.24)) + far * iC(seg(q, 0.44, 1)))]);
    }
    setRows(it, F, rows);
  },
};

/* 行違い送り — the text scrolls out of its own fixed window in strips, neighbouring strips in opposite directions, between two end rails */
X.xiCounterScroll = {
  name: '行違い送り', en: 'Counter Scroll', tags: ['graphic', 'editorial', 'pop'], w: 1.2, ae: 'slice',
  outDur: dur => clamp(dur * 0.4, 0.3, 0.75),
  apply(env, it, p) {
    const sz = it.size, F = frame(it, sz * 0.25), v = F.v, n = clamp(Math.round(F.cr / (sz * 0.55)), 2, 8), h = F.cr / n;
    const dist = F.len + 2, s0 = cutBit(env, 51) ? 1 : -1, rows = [];
    for (let k = 0; k < n; k++) rows.push([F.b0 + k * h, F.b0 + (k + 1) * h + (k < n - 1 ? 0.6 : 0), (k % 2 ? 1 : -1) * s0 * dist * ioC(win(seg(p, 0.06, 0.96), k / (n - 1), 0.3))]);
    setRows(it, F, rows);
    it.clipFn = (ctx) => rAB(ctx, v, F.a0, F.b0 - BIG, F.a1, F.b1 + BIG);
    const th = barW(it), acc = hot(env, it), a = al(it), hh = (F.cr / 2 - sz * 0.1) * oC(seg(p, 0, 0.12)) * (1 - iC(seg(p, 0.86, 1)));
    chainPost(it, (env2) => { eAB(env2, v, F.a0 - th, F.bc - hh, F.a0, F.bc + hh, acc, a); eAB(env2, v, F.a1, F.bc - hh, F.a1 + th, F.bc + hh, acc, a); });
  },
};

/* ピストン抜け — between two rails the text is cut into upright slices that work like pistons: one after another they dip, then plunge out behind the rails, alternately up and down */
X.xiPistons = {
  name: 'ピストン抜け', en: 'Pistons', tags: ['graphic', 'pop', 'glitch'], w: 1, ae: 'slice', minDur: 0.5,
  outDur: dur => clamp(dur * 0.42, 0.34, 0.8),
  apply(env, it, p) {
    const sz = it.size, F = frame(it, sz * 0.25), v = F.v, n = clamp(Math.round(F.len / (sz * 0.5)), 3, 14), w = F.len / n;
    const dist = F.cr + 2, cols = [];
    for (let k = 0; k < n; k++) {
      const q = win(seg(p, 0.05, 0.95), k / (n - 1), 0.52), dir = k % 2 ? 1 : -1;
      cols.push([F.a0 + k * w, F.a0 + (k + 1) * w + (k < n - 1 ? 0.6 : 0), dir * (-sz * 0.09 * Math.sin(PI * seg(q, 0, 0.32)) + dist * iC(seg(q, 0.26, 1)))]);
    }
    setCols(it, F, cols);
    it.clipFn = (ctx) => rAB(ctx, v, F.a0 - BIG, F.b0, F.a1 + BIG, F.b1);
    const th = barW(it) * 0.7, acc = hot(env, it), a = al(it), hl = (F.len / 2) * oC(seg(p, 0, 0.12)) * (1 - iC(seg(p, 0.88, 1)));
    chainPost(it, (env2) => { eAB(env2, v, F.ac - hl, F.b0 - th, F.ac + hl, F.b0, acc, a); eAB(env2, v, F.ac - hl, F.b1, F.ac + hl, F.b1 + th, acc, a); });
  },
};

/* スライスの波 — a ripple runs through the upright slices of the text, each hopping as it passes; on the second pass every slice it reaches shoots away */
X.xiSliceWave = {
  name: 'スライスの波', en: 'Slice Wave', tags: ['pop', 'graphic', 'glitch'], w: 0.9, ae: 'slice', minDur: 0.55,
  outDur: dur => clamp(dur * 0.42, 0.34, 0.8),
  apply(env, it, p) {
    const sz = it.size, F = frame(it, sz * 0.3), n = clamp(Math.round(F.len / (sz * 0.4)), 4, 12), w = F.len / n;
    const far = F.b1 + sz * 0.6 + (F.v ? env.W : env.H) * 0.08, c = lerp(-0.2, 1.2, seg(p, 0, 0.42)), cols = [];
    const rev = cutBit(env, 55);
    for (let k = 0; k < n; k++) {
      const o = ((rev ? n - 1 - k : k) + 0.5) / n, hop = Math.max(0, 1 - Math.pow((o - c) / 0.2, 2));
      cols.push([F.a0 + k * w, F.a0 + (k + 1) * w + (k < n - 1 ? 0.6 : 0), -sz * 0.2 * hop - far * iQ(win(seg(p, 0.3, 0.98), o, 0.5))]);
    }
    setCols(it, F, cols);
  },
};

/* =====================================================================
   D. BARS AND PLATES
   ===================================================================== */

/* 板で持ち去る — a plate is laid over the text from above; after a beat the plate tips, backs up a little and slides off sideways, and the place is empty */
X.xiPlateCarry = {
  name: '板で持ち去る', en: 'Plate Carry', tags: ['pop', 'graphic', 'editorial'], w: 1.1, ae: 'wipe', minDur: 0.55,
  outDur: dur => clamp(dur * 0.45, 0.38, 0.9),
  apply(env, it, p) {
    const sz = it.size, F = frame(it, sz * 0.16), v = F.v, col = plateCol(env, it), a = al(it);
    const qa = ioC(seg(p, 0, 0.34)), front = lerp(F.b0, F.b1, qa), qc = seg(p, 0.46, 1);
    const dir = cutBit(env, 61) ? 1 : -1, far = (v ? env.H : env.W) + F.len;
    const slide = dir * far * qc * qc * (2.4 * qc - 1.4) * 0.999, rot = dir * 9 * DEG * iQ(qc);
    if (qa >= 1) it.alpha = 0; else it.clipFn = (ctx) => rAB(ctx, v, F.a0 - BIG, front, F.a1 + BIG, F.b1 + BIG);
    const hl = F.len / 2, hc = (front - F.b0) / 2, cb = F.b0 + hc;
    if (hc > 0.2) chainPost(it, (env2) => {
      const pts = [[-hl, -hc], [hl, -hc], [hl, hc], [-hl, hc]].map(([x, y]) => { const [rx, ry] = rot2(x, y, rot); return PT(v, F.ac + slide + rx, cb + ry); });
      env2.poly(pts, col, a, false);
    });
  },
};

/* 二枚板で閉じる — two plates slide in from the ends and meet over the text; each then folds away to its own edge, and the two edge lines draw back */
X.xiTwinPlates = {
  name: '二枚板で閉じる', en: 'Twin Plates', tags: ['graphic', 'editorial', 'pop'], w: 1, ae: 'wipe', minDur: 0.55,
  outDur: dur => clamp(dur * 0.45, 0.38, 0.9),
  apply(env, it, p) {
    const sz = it.size, F = frame(it, sz * 0.16), v = F.v, col = hot(env, it), a = al(it), th = barW(it);
    const qa = oC(seg(p, 0, 0.36)), eL = lerp(F.a0, F.ac, qa), eR = lerp(F.a1, F.ac, qa);
    if (qa >= 1) it.alpha = 0; else it.clipFn = (ctx) => rAB(ctx, v, eL, F.b0 - BIG, eR, F.b1 + BIG);
    const qb = ioC(seg(p, 0.46, 0.76)), qc = iC(seg(p, 0.76, 1));
    chainPost(it, (env2) => {
      eAB(env2, v, F.a0, F.b0, lerp(eL, F.a0, qc), lerp(F.b1, F.b0 + th, qb), col, a);
      eAB(env2, v, lerp(eR, F.a1, qc), lerp(F.b0, F.b1 - th, qb), F.a1, F.b1, col, a);
    });
  },
};

/* シャッター — a slatted shutter rolls down over the text; when it is down, the slats thin out one after another and behind them there is nothing */
X.xiRollShutter = {
  name: 'シャッター', en: 'Roll Shutter', tags: ['graphic', 'pop', 'editorial'], w: 1, ae: 'wipe', minDur: 0.55,
  outDur: dur => clamp(dur * 0.45, 0.38, 0.9),
  apply(env, it, p) {
    const sz = it.size, F = frame(it, sz * 0.16), v = F.v, col = hot(env, it), a = al(it);
    const n = clamp(Math.ceil(F.cr / (sz * 0.17)), 3, 40), pitch = F.cr / n, sh = pitch * 0.84;
    const qa = oC(seg(p, 0, 0.4)), front = F.b0 + F.cr * qa, p2 = seg(p, 0.5, 1);
    if (qa >= 1) it.alpha = 0; else it.clipFn = (ctx) => rAB(ctx, v, F.a0 - BIG, front, F.a1 + BIG, F.b1 + BIG);
    chainPost(it, (env2) => {
      for (let j = 0; j < n; j++) {
        const t0 = F.b0 + j * pitch; if (t0 >= front) break;
        const hh = sh * (1 - ioC(win(p2, j / (n - 1), 0.5))), c = t0 + sh / 2;
        eAB(env2, v, F.a0, c - hh / 2, F.a1, Math.min(front, c + hh / 2), col, a);
      }
    });
  },
};

/* 黒塗り — the text is redacted: solid bars in the text's own colour slam down over it piece by piece, then each bar flattens to a rule and the rule is drawn back */
X.xiRedact = {
  name: '黒塗り', en: 'Redacted', tags: ['editorial', 'graphic', 'glitch'], w: 0.9, ae: 'wipe', minDur: 0.6,
  outDur: dur => clamp(dur * 0.45, 0.38, 0.9),
  apply(env, it, p) {
    const lay = layOf(it), sz = it.size, sx = it.sx || 1, sy = it.sy || 1, v = !!it.vertical, seed = it.seed | 0;
    const lines = [];
    for (const g of lay) { if (isBlank(g.ch)) continue; (lines[g.li] || (lines[g.li] = [])).push(g); }
    const segs = [], segOf = {};
    lines.forEach((gs, li) => {
      const n = gs.length, parts = n <= 3 ? 1 : n <= 8 ? 2 : 3, cuts = [0];
      for (let k = 1; k < parts; k++) cuts.push(clamp(Math.round(n * k / parts + J.rs(seed, li, k, 81) * n * 0.12), cuts[cuts.length - 1] + 1, n - 1));
      cuts.push(n);
      for (let k = 0; k < cuts.length - 1; k++) {
        if (cuts[k + 1] <= cuts[k]) continue;
        const S = { a0: 1e9, a1: -1e9, b0: 1e9, b1: -1e9, o: J.r(seed, li, k, 82), idx: segs.length };
        for (let i = cuts[k]; i < cuts[k + 1]; i++) {
          const g = gs[i]; segOf[g.i] = S.idx;
          const ga = v ? g.y * sy : g.x * sx, ha = (v ? g.h * sy : g.w * sx) / 2, gb = v ? g.x * sx : g.y * sy, hb = sz * (v ? sx : sy) / 2;
          S.a0 = Math.min(S.a0, ga - ha); S.a1 = Math.max(S.a1, ga + ha); S.b0 = Math.min(S.b0, gb - hb); S.b1 = Math.max(S.b1, gb + hb);
        }
        const on = seg(p, S.o * 0.3, S.o * 0.3 + 0.1), w = seg(p, 0.56 + S.o * 0.2, 0.8 + S.o * 0.2);
        S.on = on; S.kb = E.outExpo(on) * lerp(1, 0.07, ioC(seg(w, 0, 0.5))); S.ka = 1 - iC(seg(w, 0.4, 1));
        segs.push(S);
      }
    });
    if (!segs.length) return;
    it.charFns.push((i) => (segOf[i] != null && segs[segOf[i]].on >= 0.55 ? { hide: true } : null));
    const col = inkOf(env, it), a = al(it), pa = sz * 0.07, pb = sz * 0.03;
    chainPost(it, (env2, it2) => inItem(env2, it2, () => {
      for (const S of segs) {
        if (S.kb <= 0.002 || S.ka <= 0.002) continue;
        const bc = (S.b0 + S.b1) / 2, hb = ((S.b1 - S.b0) / 2 + pb) * S.kb, a0 = S.a0 - pa, a1 = a0 + (S.a1 - S.a0 + pa * 2) * S.ka;
        eAB(env2, v, a0, bc - hb, a1, bc + hb, col, a);
      }
    }));
  },
};

/* 反転帯 — a band in the text's colour opens behind the line so the text flips to the background colour; the band then closes in from both ends and takes the text with it */
X.xiInverseBand = {
  name: '反転帯', en: 'Inverse Band', tags: ['graphic', 'editorial', 'pop'], w: 1.1, ae: 'wipe', minDur: 0.5,
  outDur: dur => clamp(dur * 0.42, 0.34, 0.85),
  apply(env, it, p) {
    const sz = it.size, F = frame(it, sz * 0.14), v = F.v, col = inkOf(env, it), inv = env.sc.bg, a = al(it);
    const q1 = E.outExpo(seg(p, 0, 0.26)), q2 = ioC(seg(p, 0.38, 1));
    const a0 = lerp(F.a0, F.ac, q2), a1 = lerp(F.a1, F.ac, q2), hb = F.cr / 2 * q1, b0 = F.bc - hb, b1 = F.bc + hb;
    if (seg(p, 0, 0.26) >= 1) it.alpha = 0;
    if (a1 - a0 < 0.4 || hb < 0.2) return;
    chainPost(it, (env2, it2) => {
      if (env2.pass !== 'main') return;
      eAB(env2, v, a0, b0, a1, b1, col, a);
      copyDraw(env2, it2, { color: inv, strokeColor: inv, gradient: null, pattern: null, shadow: null, extrude: null, blend: null, alpha: a, ghost: false },
        (ctx) => rAB(ctx, v, a0, b0, a1, b1));
    });
  },
};

/* 塗りが落ちる — the solid fill lets go of its outline and drops out through a slot under the line; the empty outline is then un-drawn */
X.xiFillDrop = {
  name: '塗りが落ちる', en: 'Fill Drops Out', tags: ['graphic', 'emotional', 'editorial'], w: 1, ae: 'fall', minDur: 0.55,
  outDur: dur => clamp(dur * 0.45, 0.38, 0.9),
  apply(env, it, p) {
    const sz = it.size, a = al(it), ud = seg(p, 0.38, 0.97);
    const fade = 1 - J.smooth(0.92, 1, p);
    if (it.fill === false) { it.dash = Math.max(0.002, 1 - E.inOutSine(p)); it.alpha = a * fade; return; }
    const bb = dBox(it, sz * 0.12), q = seg(p, 0, 0.56), drop = (bb.h + sz * 0.3) * (iQ(q) * 1.02 - 0.02 * Math.sin(PI * seg(q, 0, 0.3)));
    const o = toOutline(it, sz * 0.022 * Math.min(1, p * 10));
    if (ud > 0) it.dash = Math.max(0.002, 1 - E.inOutSine(ud));
    it.alpha = a * fade;
    const acc = hot(env, it), th = Math.max(2, sz * 0.03), la = a * seg(p, 0.02, 0.12) * (1 - seg(p, 0.5, 0.62));
    chainPost(it, (env2, it2) => {
      if (q < 1) copyDraw(env2, it2, Object.assign({}, o, { y: it2.y + drop, dash: null }), (ctx) => ctx.rect(-BIG, -BIG, BIG * 3, BIG + bb.y1));
      if (la > 0.01) env2.rect(bb.x0, bb.y1, bb.w, th, acc, la, false);
    });
  },
};

/* 点線にほどける — the fill is wiped off, leaving the bare outline; the outline breaks into dashes, the dashes shorten to dots, and the dots go out */
X.xiDotted = {
  name: '点線にほどける', en: 'Into Dashes', tags: ['calm', 'editorial', 'emotional'], w: 1, ae: 'wipe', minDur: 0.55,
  outDur: dur => clamp(dur * 0.45, 0.38, 0.9),
  apply(env, it, p) {
    const sz = it.size, a = al(it), F = frame(it, sz * 0.3), v = F.v, had = it.fill !== false;
    const o = toOutline(it, sz * 0.024 * Math.min(1, p * 10));
    const unit = Math.max(5, sz * 0.1), on = unit * (1 - ioC(seg(p, had ? 0.3 : 0.05, 0.96)));
    if (on < unit - 0.01) it.strokeDash = [Math.max(0.01, on), unit - on + 0.01];
    if (on < 0.05) it.alpha = 0; else it.alpha = a * (1 - J.smooth(0.9, 1, p));
    if (!had) return;
    const e = ioC(seg(p, 0, 0.4)), rev = cutBit(env, 65), x = rev ? lerp(F.a1, F.a0, e) : lerp(F.a0, F.a1, e);
    if (e < 1) chainPost(it, (env2, it2) => copyDraw(env2, it2, Object.assign({}, o),
      (ctx) => (rev ? rAB(ctx, v, F.a0 - BIG, F.b0 - BIG, x, F.b1 + BIG) : rAB(ctx, v, x, F.b0 - BIG, F.a1 + BIG, F.b1 + BIG))));
  },
};

/* ---------------- registration ----------------
   items that hold ONE glyph of a longer cut (mixed / scatter layouts) leave one after another, in reading order;
   p≈1 is always fully gone, whatever a recipe leaves at the very end */
for (const k of Object.keys(X)) {
  const f = X[k].apply;
  X[k].apply = (env, it, p, ctx) => {
    if (p >= 0.998) { it.alpha = 0; return; }
    const N = cutN(env);
    if (N > 1 && layOf(it).N === 1) { p = win(p, clamp((+it.mi || 0) / (N - 1)), 0.4); if (p <= 0) return; if (p >= 0.998) { it.alpha = 0; return; } }
    f(env, it, p, ctx);
  };
  J.register('exit', k, X[k], P);
}
})();
