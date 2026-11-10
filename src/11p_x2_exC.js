/* JIZURA pack: x2exC — 26 whole-item exits: the item leaves as ONE body (or a few copies of it)
   A. transforms (hinge, quarter turn, needle, big arc, corner pivot, ratchet)
   B. physical (string yank, trapdoor, ledge, puck, rubber band, toss, wall, slump, spring, tug)
   C. optical (focus hunting, double image, colour drain, comet trail, shell after body, shadow left behind, through focus, pan smear)
   D. stepped (held poses: stepped fade, onion skin)
   Every exit: p 0 = exactly the resting item → p 1 = fully gone (and every string / ledge / puck of its own).
   All geometry is relative to the item's box and it.size; deterministic (cut seed). */
(() => {
'use strict';
const E = J.E;
const P = 'x2exC';
const DEG = J.DEG, PI = Math.PI;
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
const mixC = (a, b, t) => { t = clamp(t); if (t <= 0.002) return a; if (t >= 0.998) return b; return isHex(a) && isHex(b) ? J.mix(a, b, t) : (t < 0.5 ? a : b); };
const al = it => it.alpha ?? 1;
const cutN = env => Math.max(1, J.glyphCount(String(env.cut && env.cut.text || '')));
const cutBit = (env, k) => (J.h(env.cut && env.cut.seed | 0, k, 977) & 1) === 1;      // same choice for every item of a cut
const hot = (env, it) => { const sc = env.sc; return it.color === sc.accent ? (sc.accent2 || sc.fg) : sc.accent; };
const inkOf = (env, it) => (isHex(it.color) ? it.color : env.sc.fg);
const rot2 = (x, y, r) => { const c = Math.cos(r), s = Math.sin(r); return [x * c - y * s, x * s + y * c]; };
const fresh = it => { it._m = null; it._lay = null; };
const lbox = it => { it._m = J.measure(it); return J.itemBox(it); };                 // the item's own (unrotated) box

function chainPost(it, fn) { const p0 = it.post; it.post = (env, it2, bb) => { if (p0) p0(env, it2, bb); fn(env, it2, bb); }; }
function chainPre(it, fn) { const p0 = it.pre; it.pre = (env, it2) => { if (p0) p0(env, it2); fn(env, it2); }; }

/* design-space point at the fraction (u, v) of the item's box (0,0 = its top-left, 1,1 = bottom-right, in the item's own frame) */
function at(it, u, v) {
  const b = lbox(it), [dx, dy] = rot2(lerp(b.x0, b.x1, u) - it.x, lerp(b.y0, b.y1, v) - it.y, (it.rot || 0) * DEG);
  return [it.x + dx, it.y + dy];
}
/* rotated item box → design-space AABB (+pad) */
function dBox(it, pad) {
  const b = lbox(it), r = (it.rot || 0) * DEG;
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const [px, py] of [[b.x0, b.y0], [b.x1, b.y0], [b.x0, b.y1], [b.x1, b.y1]]) {
    const [dx, dy] = rot2(px - it.x, py - it.y, r), x = it.x + dx, y = it.y + dy;
    x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
  }
  x0 -= pad; x1 += pad; y0 -= pad; y1 += pad;
  return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
}
/* rotate the whole item about a design-space point */
function pivot(it, px, py, deg) {
  if (!deg) return;
  const [dx, dy] = rot2(it.x - px, it.y - py, deg * DEG);
  it.x = px + dx; it.y = py + dy; it.rot = (it.rot || 0) + deg;
}
/* uniform scale about a design-space point */
function scaleAt(it, px, py, k) {
  k = Math.max(0, k);
  it.size *= k; it.x = px + (it.x - px) * k; it.y = py + (it.y - py) * k;
  if (it.stroke > 0) it.stroke *= k;
  fresh(it);
}
/* scale along the item's own axes, keeping the box fraction (u, v) where it is */
function stretch(it, u, v, kx, ky) {
  const b = lbox(it), ax = lerp(b.x0, b.x1, u) - it.x, ay = lerp(b.y0, b.y1, v) - it.y;
  const [dx, dy] = rot2(ax * (1 - kx), ay * (1 - ky), (it.rot || 0) * DEG);
  it.x += dx; it.y += dy; it.sx = (it.sx || 1) * kx; it.sy = (it.sy || 1) * ky;
  fresh(it);
}
/* the same in writing terms: a = fraction along the line, kA along the writing direction, kC across it */
const stretchAlong = (it, a, kA, kC) => (it.vertical ? stretch(it, 0.5, a, kC, kA) : stretch(it, a, 0.5, kA, kC));
/* unit vectors of the writing direction / across it (pointing "up" for horizontal text), in design space */
const alongV = it => (it.vertical ? rot2(0, 1, (it.rot || 0) * DEG) : rot2(1, 0, (it.rot || 0) * DEG));
const crossV = it => (it.vertical ? rot2(1, 0, (it.rot || 0) * DEG) : rot2(0, -1, (it.rot || 0) * DEG));
const lenAlong = it => { const b = lbox(it); return it.vertical ? b.h : b.w; };
/* how far the box has to travel along ±x / down to be completely out of the frame */
const offX = (env, bb, dir, pad) => (dir > 0 ? env.W - bb.x0 : bb.x1) + pad;
const offDown = (env, bb, pad) => env.H - bb.y0 + pad;
/* a plain copy of the item (no hooks, trails) with changes */
const copyOf = (it, mods) => Object.assign({}, it, { pre: null, post: null, streak: null, echo: null, pieceFn: null, _m: null, _lay: null }, mods);
/* main item becomes its own outline; returns what the filled copy needs */
function toOutline(it, lw) {
  const o = { fill: it.fill, stroke: it.stroke, strokeColor: it.strokeColor, shadow: it.shadow, extrude: it.extrude, alpha: al(it) };
  it.fill = false; it.stroke = Math.max(it.stroke || 0, lw);
  if (!it.strokeColor) it.strokeColor = it.color || '#ffffff';
  it.shadow = null; it.extrude = null;
  return o;
}
const OD = dur => clamp(dur * 0.42, 0.34, 0.85);       // the usual length of a "little story" exit
const OS = dur => clamp(dur * 0.34, 0.24, 0.62);       // short moves

/* =====================================================================
   A. TRANSFORMS
   ===================================================================== */

/* 開き戸 — the whole line is a door hinged on one end: it opens a hair the wrong way, then swings round edge-on and is gone */
X.xjGateSwing = {
  name: '開き戸', en: 'Swing Gate', tags: ['graphic', 'editorial', 'pop'], w: 1.2, ae: 'stretch', outDur: OS,
  apply(env, it, p) {
    const end = cutBit(env, 1) ? 1 : 0, v = !!it.vertical, c0 = inkOf(env, it), a = al(it), sz = it.size;
    const q = seg(p, 0.1, 1), th = E.inOutSine(q) * PI / 2, s = Math.sin(th);
    const k = Math.cos(th) + 0.05 * Math.sin(PI * seg(p, 0, 0.3)) * (1 - q);
    const h0 = v ? at(it, -0.12, end) : at(it, end, -0.12), h1 = v ? at(it, 1.12, end) : at(it, end, 1.12);
    if (k < 0.012) it.alpha = 0;
    else {
      stretchAlong(it, end, k, 1 + 0.14 * s);
      if (isHex(it.color)) it.color = mixC(c0, env.sc.bg, s * 0.5);
      it.alpha = a * (1 - J.smooth(0.86, 1, q));
    }
    const la = a * Math.sqrt(Math.sin(PI * clamp(p))), lw = Math.max(2, sz * 0.03), acc = hot(env, it);
    if (la > 0.01) chainPost(it, (env2) => env2.line([h0, h1], acc, lw, la, false));
  },
};

/* 直角に抜ける — the line turns a quarter turn on its centre, then shoots out along its own length */
X.xjQuarterTurn = {
  name: '直角に抜ける', en: 'Quarter Turn', tags: ['graphic', 'pop', 'editorial'], w: 1.1, ae: 'stretch', outDur: OD,
  apply(env, it, p) {
    const dir = cutBit(env, 2) ? 1 : -1, go = cutBit(env, 3) ? 1 : -1, sz = it.size, c = at(it, 0.5, 0.5);
    const L0 = lenAlong(it), room = (it.vertical ? env.W : env.H) * 0.8;
    pivot(it, c[0], c[1], dir * 90 * E.outBack(seg(p, 0, 0.5), 1.3));
    if (L0 > room) scaleAt(it, c[0], c[1], lerp(1, room / L0, ioC(seg(p, 0, 0.45))));
    const u = iC(seg(p, 0.42, 1)), ax = alongV(it), L = lenAlong(it), dist = Math.max(env.W, env.H) + L * 0.5 + sz;
    it.x += ax[0] * dist * u * go; it.y += ax[1] * dist * u * go;
    if (u > 0.004) {
      const m = Math.min(1, u * 5);
      stretchAlong(it, 0.5, 1 + 0.35 * m, 1 - 0.1 * m);
      it.streak = { n: 3, dx: -ax[0] * sz * 0.5 * m * go, dy: -ax[1] * sz * 0.5 * m * go, a: 0.32 * m };
    }
  },
};

/* 針になって飛ぶ — the line is pressed together into one thin needle across the writing direction; the needle fires off */
X.xjNeedle = {
  name: '針になって飛ぶ', en: 'Needle Shot', tags: ['graphic', 'glitch', 'pop'], w: 1, ae: 'stretch', outDur: OD,
  apply(env, it, p) {
    const sz = it.size, go = cutBit(env, 4) ? 1 : -1, c0 = inkOf(env, it);
    const q1 = ioC(seg(p, 0, 0.44)), u = iC(seg(p, 0.46, 1)), cr = crossV(it), b = lbox(it), cl = it.vertical ? b.w : b.h;
    stretchAlong(it, 0.5, lerp(1, 0.022, q1), lerp(1, 1.55, q1) + 1.5 * u);
    if (isHex(it.color)) it.color = mixC(c0, hot(env, it), q1 * 0.85);
    const dist = (it.vertical ? env.W : env.H) + cl * 4;
    it.x += cr[0] * dist * u * go; it.y += cr[1] * dist * u * go;
    if (u > 0.004) { const m = Math.min(1, u * 6); it.streak = { n: 4, dx: -cr[0] * sz * 0.6 * m * go, dy: -cr[1] * sz * 0.6 * m * go, a: 0.4 * m }; }
  },
};

/* 大きな弧で去る — the line rides the rim of a big unseen wheel: it rolls back a little, then swings away along the arc */
X.xjBigWheel = {
  name: '大きな弧で去る', en: 'Big Wheel', tags: ['pop', 'emotional', 'graphic'], w: 1.2, ae: 'drift', outDur: OD,
  apply(env, it, p) {
    const sz = it.size, bb = dBox(it, 0), side = cutBit(env, 5) ? 1 : -1, dir = cutBit(env, 6) ? 1 : -1;
    const R = Math.max(env.H * 0.75, bb.w * 0.65), px = bb.cx, py = bb.cy + side * R;
    const travel = env.W / 2 + Math.abs(bb.cx - env.W / 2) + bb.w / 2 + sz;
    const ang = travel < R * 0.9 ? Math.asin(travel / R) / DEG + 14 : 150;
    const back = -5 * oC(seg(p, 0, 0.2)) * (1 - ioC(seg(p, 0.2, 0.42)));
    pivot(it, px, py, dir * side * (back + ang * iC(seg(p, 0.2, 1))));
    it.alpha = al(it) * (1 - J.smooth(0.9, 1, p));
  },
};

/* 角を軸に払う — pinned at a bottom corner, the line sweeps up like a wiper blade and shrinks into its pin; the pin pops */
X.xjWiper = {
  name: '角を軸に払う', en: 'Corner Sweep', tags: ['graphic', 'pop', 'editorial'], w: 1, ae: 'shrink', outDur: OD,
  apply(env, it, p) {
    const sz = it.size, c = cutBit(env, 7) ? 0 : 1, pv = at(it, c, 1), a = al(it), acc = hot(env, it);
    pivot(it, pv[0], pv[1], (c ? 1 : -1) * 112 * ioC(seg(p, 0.06, 0.88)));
    scaleAt(it, pv[0], pv[1], 1 - 0.95 * iQ(seg(p, 0.1, 0.9)));
    if (p > 0.9) it.alpha = 0;
    const r = sz * 0.085 * E.outBack(seg(p, 0, 0.12), 2) * (1 - iC(seg(p, 0.86, 1)));
    if (r > 0.3) chainPost(it, (env2) => env2.circle(pv[0], pv[1], r, acc, null, 1, a, false));
  },
};

/* 歯車送り — the line is turned in clicks, like a ratchet: every click a sharp 30° and a size smaller, the last click closes it */
X.xjRatchet = {
  name: '歯車送り', en: 'Ratchet Out', tags: ['graphic', 'glitch', 'pop'], w: 0.9, ae: 'shrink', minDur: 0.55, outDur: OD,
  apply(env, it, p) {
    const n = 5, dir = cutBit(env, 8) ? 1 : -1, c = at(it, 0.5, 0.5);
    let r = 0, s = 0;
    for (let i = 0; i < n; i++) { const x = seg(p * n - i, 0.05, 0.5); r += E.outBack(x, 2.2); s += ioC(x); }
    pivot(it, c[0], c[1], dir * 30 * r);
    const k = 1 - s / n;
    if (k < 0.02) it.alpha = 0; else scaleAt(it, c[0], c[1], k);
  },
};

/* =====================================================================
   B. PHYSICAL
   ===================================================================== */

/* 糸で引き抜く — a string comes in from off-screen and catches the end of the line; two tugs, then the whole line is yanked out along it */
X.xjYank = {
  name: '糸で引き抜く', en: 'Yanked Away', tags: ['pop', 'graphic', 'emotional'], w: 1.1, ae: 'drift', minDur: 0.6, outDur: OD,
  apply(env, it, p) {
    const sz = it.size, a = al(it), dx = cutBit(env, 9) ? 1 : -1, v = !!it.vertical;
    const d = [dx * 0.8, -0.6], hu = v ? 0.5 : (dx > 0 ? 1 : 0), hv = v ? 0 : 0.5;
    const A = at(it, hu, hv), bb = dBox(it, 0), far = (env.W + bb.w * 1.2 + sz) / 0.8, T = [A[0] + d[0] * far, A[1] + d[1] * far];
    const s1 = oC(seg(p, 0, 0.17)), j1 = Math.sin(PI * seg(p, 0.2, 0.32)), j2 = Math.sin(PI * seg(p, 0.35, 0.5)), u = seg(p, 0.55, 1);
    const e = Math.pow(u, 1.25), mv = sz * (0.07 * j1 + 0.16 * j2) + far * e;
    pivot(it, A[0], A[1], -dx * (2.5 * j1 + 5 * j2 + 13 * J.smooth(0, 0.3, u)) * (v ? -0.6 : 1));
    it.x += d[0] * mv; it.y += d[1] * mv;
    if (u > 0.02) { const m = Math.min(1, u * 4); it.streak = { n: 3, dx: -d[0] * sz * 0.5 * m, dy: -d[1] * sz * 0.5 * m, a: 0.3 * m }; }
    const lw = Math.max(1.5, sz * 0.014), acc = hot(env, it), sa = a * (1 - seg(p, 0.9, 1));
    if (sa > 0.01) chainPost(it, (env2, it2) => {
      const h = at(it2, hu, hv), sag = sz * 0.35 * (1 - seg(p, 0.14, 0.24));
      const tip = [lerp(T[0], h[0], s1), lerp(T[1], h[1], s1)];
      env2.line([T, [(T[0] + tip[0]) / 2, (T[1] + tip[1]) / 2 + sag], tip], acc, lw, sa, false);
      if (s1 >= 1) env2.circle(h[0], h[1], lw * 2.2, acc, null, 1, sa, false);
    });
  },
};

/* 床が抜ける — a floor line appears under the line; the line hops, lands with a squash, the floor swings open and it drops straight through */
X.xjTrapdoor = {
  name: '床が抜ける', en: 'Trapdoor', tags: ['pop', 'graphic'], w: 1, ae: 'fall', minDur: 0.6, outDur: OD,
  apply(env, it, p) {
    const sz = it.size, a = al(it), bb = dBox(it, 0), yf = bb.y1 + sz * 0.1, x0 = bb.x0 - sz * 0.2, x1 = bb.x1 + sz * 0.2, half = (x1 - x0) / 2;
    const h = seg(p, 0.08, 0.36), sq = Math.sin(PI * seg(p, 0.36, 0.5)), cr = Math.sin(PI * seg(p, 0, 0.1));
    stretch(it, 0.5, 1, 1 + 0.1 * sq + 0.05 * cr, 1 - 0.24 * sq - 0.1 * cr);
    it.y += -sz * 0.45 * 4 * h * (1 - h) + offDown(env, bb, sz) * iQ(seg(p, 0.46, 1));
    const l = oC(seg(p, 0, 0.1)), ang = 86 * DEG * E.outBack(seg(p, 0.43, 0.66), 1.4), la = a * (1 - seg(p, 0.84, 1));
    const lw = Math.max(2, sz * 0.03), acc = hot(env, it), cx = Math.cos(ang) * half * l, cy = Math.sin(ang) * half * l;
    if (la > 0.01 && l > 0.01) chainPost(it, (env2) => {
      env2.line([[x0, yf], [x0 + cx, yf + cy]], acc, lw, la, false);
      env2.line([[x1, yf], [x1 - cx, yf + cy]], acc, lw, la, false);
    });
  },
};

/* 縁から落ちる — the line slides along a ledge until more than half of it hangs over the end; it tips over the edge, slips off and falls */
X.xjEdgeTeeter = {
  name: '縁から落ちる', en: 'Off The Ledge', tags: ['pop', 'graphic', 'editorial'], w: 1, ae: 'fall', minDur: 0.6, outDur: OD,
  apply(env, it, p) {
    const sz = it.size, a = al(it), bb = dBox(it, 0), dir = cutBit(env, 10) ? 1 : -1;
    const yl = bb.y1 + sz * 0.08, ex = bb.cx + dir * bb.w * 0.1, sx0 = dir > 0 ? bb.x0 - sz * 0.2 : bb.x1 + sz * 0.2;
    const th = dir * 78 * iQ(seg(p, 0.3, 0.8)), s2 = bb.w * 0.9 * iQ(seg(p, 0.42, 1));
    it.x += dir * bb.w * 0.24 * oC(seg(p, 0, 0.4));
    pivot(it, ex, yl, th);
    it.x += dir * Math.cos(th * DEG) * s2; it.y += dir * Math.sin(th * DEG) * s2 + offDown(env, bb, bb.w * 0.5 + sz) * iQ(seg(p, 0.55, 1));
    const l = oC(seg(p, 0, 0.12)), la = a * (1 - seg(p, 0.8, 1)), lw = Math.max(2, sz * 0.03), acc = hot(env, it);
    if (la > 0.01 && l > 0.01) chainPost(it, (env2) => {
      env2.line([[ex, yl], [lerp(ex, sx0, l), yl]], acc, lw, la, false);
      env2.line([[ex, yl - lw / 2], [ex, yl + sz * 0.22 * l]], acc, lw, la, false);
    });
  },
};

/* 横から弾かれる — a puck slides in from the side and hits the end of the line; the line shears with the blow and is knocked clean out, the puck stays behind */
X.xjPuckHit = {
  name: '横から弾かれる', en: 'Knocked Out', tags: ['pop', 'graphic'], w: 1, ae: 'scatter', minDur: 0.55, outDur: OD,
  apply(env, it, p) {
    const sz = it.size, a = al(it), bb = dBox(it, 0), dir = cutBit(env, 11) ? 1 : -1, s = sz * 0.3, t0 = 0.3;
    const hitX = (dir > 0 ? bb.x0 : bb.x1) - dir * s * 0.5, u = seg(p, t0, 1);
    if (u > 0) {
      const k = 1 - 0.14 * Math.sin(PI * seg(u, 0, 0.22));
      stretch(it, dir > 0 ? 1 : 0, 0.5, k, 1);
      it.skew = (it.skew || 0) + dir * 22 * seg(u, 0, 0.05) * Math.pow(1 - u, 3);
      const c = at(it, 0.5, 0.5); pivot(it, c[0], c[1], dir * 9 * u);
      it.x += dir * offX(env, bb, dir, sz * 1.5) * Math.pow(u, 1.15); it.y -= sz * 0.45 * u;
      const m = Math.min(1, u * 5) * (1 - u * 0.5); it.streak = { n: 3, dx: -dir * sz * 0.4 * m, dy: 0, a: 0.28 * m };
    }
    const px = p < t0 ? lerp(dir > 0 ? -s : env.W + s, hitX, iQ(seg(p, 0, t0))) : hitX + dir * sz * 0.35 * oC(seg(p, t0, 0.62));
    const pa = a * (1 - seg(p, 0.6, 0.86)), acc = hot(env, it);
    if (pa > 0.01) chainPost(it, (env2) => {
      env2.rect(px - s / 2, bb.cy - s / 2, s, s, acc, pa, false);
      const f = Math.sin(PI * seg(p, t0, t0 + 0.12));
      if (f > 0.02) for (let i = -1; i <= 1; i++) env2.line([[hitX + dir * s * 0.7, bb.cy + i * s * 0.7], [hitX + dir * s * (0.7 + 0.8 * f), bb.cy + i * s * (0.7 + 0.5 * f)]], acc, Math.max(1.5, sz * 0.02), pa * f, false);
    });
  },
};

/* ゴムで弾ける — pinned at one end, the line is stretched out long and thin like a rubber band; the pin lets go and it snaps away to the far side */
X.xjRubberSnap = {
  name: 'ゴムで弾ける', en: 'Rubber Snap', tags: ['pop', 'graphic'], w: 1.1, ae: 'stretch', minDur: 0.5, outDur: OD,
  apply(env, it, p) {
    const sz = it.size, a = al(it), a0 = cutBit(env, 12) ? 0 : 1, sgn = a0 ? -1 : 1, t0 = 0.52;
    const pin = it.vertical ? at(it, 0.5, a0) : at(it, a0, 0.5), acc = hot(env, it);
    const s1 = oC(seg(p, 0, t0)), K = 1 + 0.36 * s1, kc = 1 - 0.2 * s1;
    stretchAlong(it, a0, K, kc);
    if (p > t0) {
      const u = seg(p, t0, 1), k2 = (lerp(1.36, 0.5, E.outExpo(seg(u, 0, 0.22))) + 0.16 * Math.sin(u * 34) * Math.exp(-5 * u)) / 1.36;
      stretchAlong(it, 1 - a0, k2, lerp(1, 1.4, oC(seg(u, 0, 0.2))));
      const ax = alongV(it), dist = Math.max(env.W, env.H) + lenAlong(it) + sz, e = iQ(u);
      it.x += ax[0] * sgn * dist * e; it.y += ax[1] * sgn * dist * e;
      const m = Math.min(1, u * 5); it.streak = { n: 3, dx: -ax[0] * sgn * sz * 0.5 * m, dy: -ax[1] * sgn * sz * 0.5 * m, a: 0.3 * m };
    } else if (p > 0.3) { it.x += Math.sin(p * 190) * sz * 0.006 * s1; }
    const pop = seg(p, t0, t0 + 0.12), r = sz * 0.07 * E.outBack(seg(p, 0, 0.1), 2) * (1 + 1.6 * pop), pa = a * (1 - pop);
    if (pa > 0.01 && r > 0.3) chainPost(it, (env2) => (pop > 0 ? env2.circle(pin[0], pin[1], r, null, acc, Math.max(1.5, sz * 0.02), pa, false) : env2.circle(pin[0], pin[1], r, acc, null, 1, pa, false)));
  },
};

/* 放り投げる — the line is tossed like a card: up and across in an arc, flipping over and over, getting smaller, and down out of the frame */
X.xjCardToss = {
  name: '放り投げる', en: 'Card Toss', tags: ['pop', 'emotional'], w: 1, ae: 'fall', minDur: 0.5, outDur: OD,
  apply(env, it, p) {
    const sz = it.size, bb = dBox(it, 0), dir = cutBit(env, 13) ? 1 : -1, c0 = inkOf(env, it), u = clamp(p);
    const c = at(it, 0.5, 0.5), ph = PI * 3.5 * Math.pow(u, 1.15), cs = Math.cos(ph), up = env.H * 0.7;
    scaleAt(it, c[0], c[1], 1 - 0.42 * u);
    pivot(it, c[0], c[1], dir * 22 * u);
    stretchAlong(it, 0.5, 1, Math.max(0.045, Math.abs(cs)));
    if (cs < 0 && isHex(it.color)) it.color = mixC(c0, env.sc.bg, 0.5);
    it.x += dir * env.W * 0.3 * u; it.y += -up * u + (up + offDown(env, bb, sz) * 1.15) * u * u;
    it.alpha = al(it) * (1 - J.smooth(0.92, 1, p));
  },
};

/* 壁にぶつかる — the line is thrown at the side of the frame, flattens against it, then slides down the wall and out */
X.xjWallSplat = {
  name: '壁にぶつかる', en: 'Wall Splat', tags: ['pop', 'graphic'], w: 0.9, ae: 'fall', minDur: 0.55, outDur: OD,
  apply(env, it, p) {
    const sz = it.size, bb = dBox(it, 0), dir = cutBit(env, 14) ? 1 : -1, d = dir > 0 ? env.W - bb.x1 : bb.x0;
    const q1 = iQ(seg(p, 0, 0.4)), sq = oC(seg(p, 0.4, 0.5)), rb = Math.sin(PI * seg(p, 0.5, 0.66)), f = seg(p, 0.58, 1);
    const turned = Math.abs(Math.sin((it.rot || 0) * DEG)) > 0.72;
    it.x += dir * d * q1;
    if (q1 < 1 && q1 > 0.01) it.streak = { n: 3, dx: -dir * sz * 0.5 * q1, dy: 0, a: 0.3 * q1 };
    if (sq > 0) {
      const kx = 1 - 0.7 * sq + 0.1 * rb, ky = 1 + 0.3 * sq + 0.5 * f;
      if (turned) stretch(it, 0.5, 0.5, ky, kx); else stretch(it, dir > 0 ? 1 : 0, 0.5, kx, ky);
      if (turned) it.x += dir * bb.w * 0.5 * (1 - kx);
    }
    it.y += offDown(env, bb, bb.h + sz) * iQ(f);
  },
};

/* へたり込む — the air goes out of the line in three puffs: it sags lower and leans further each time, lies flat, and is whisked off along the ground */
X.xjSlump = {
  name: 'へたり込む', en: 'Slump', tags: ['emotional', 'pop', 'calm'], w: 1, ae: 'shrink', minDur: 0.55, outDur: OD,
  apply(env, it, p) {
    const sz = it.size, bb = dBox(it, 0), dir = cutBit(env, 15) ? 1 : -1, Lv = [1, 0.68, 0.38, 0.09];
    const x = clamp(p / 0.54) * 3, i = Math.min(2, Math.floor(x)), fr = x - i;
    const L = lerp(Lv[i], Lv[i + 1], oC(seg(fr, 0, 0.6))) + 0.035 * Math.sin(PI * seg(fr, 0.6, 1)) * (p < 0.54 ? 1 : 0);
    stretch(it, 0.5, 1, 1 + 0.1 * (1 - L), L);
    it.skew = (it.skew || 0) + dir * 42 * (1 - L);
    it.x += dir * (offX(env, bb, dir, sz * 2) * iQ(seg(p, 0.55, 0.97)) + sz * 0.25 * (1 - L));
    it.alpha = al(it) * (1 - J.smooth(0.9, 1, p));
  },
};

/* ばねで跳ぶ — the line is pressed down like a spring, lets go and leaps out of the top of the frame, still bouncing in the air */
X.xjSpringHop = {
  name: 'ばねで跳ぶ', en: 'Spring Leap', tags: ['pop', 'graphic'], w: 1, ae: 'drift', minDur: 0.5, outDur: OD,
  apply(env, it, p) {
    const sz = it.size, bb = dBox(it, 0), c = ioC(seg(p, 0, 0.34)), u = seg(p, 0.37, 1);
    const ky = u > 0 ? 1 - 0.5 * Math.cos(u * 17) * Math.exp(-4.2 * u) : 1 - 0.5 * c;
    stretch(it, 0.5, 1, 1 - 0.32 * (ky - 1), ky);
    it.y -= (bb.y1 + sz * 0.8) * (1 - Math.pow(1 - u, 2.2));
    const base = bb.y1 + sz * 0.04, w = bb.w * (0.5 + 0.5 * c) * (1 + 0.5 * seg(u, 0, 0.3)), la = al(it) * c * (1 - seg(u, 0.05, 0.4)), acc = hot(env, it);
    if (la > 0.01) chainPost(it, (env2) => env2.rect(bb.cx - w / 2, base, w, Math.max(2, sz * 0.025), acc, la, false));
  },
};

/* 揺さぶられる — something pulls the line one way, then harder the other, then harder again, and the last pull takes it out of the frame */
X.xjTug = {
  name: '揺さぶられる', en: 'Tug Of War', tags: ['pop', 'glitch', 'emotional'], w: 1, ae: 'drift', minDur: 0.55, outDur: OD,
  apply(env, it, p) {
    const sz = it.size, bb = dBox(it, 0), dir = cutBit(env, 16) ? 1 : -1, W = env.W, off = offX(env, bb, dir, sz * 2);
    const K = [0, -0.045 * W, 0.08 * W, -0.13 * W], T = [0, 0.17, 0.36, 0.56];
    const xAt = q => {
      q = clamp(q);
      if (q >= T[3]) return lerp(K[3], off - K[3], Math.pow(seg(q, T[3], 0.97), 2.4));
      for (let i = 0; i < 3; i++) if (q < T[i + 1]) return lerp(K[i], K[i + 1], ioC(seg(q, T[i], T[i + 1])));
      return K[3];
    };
    const x = xAt(p), vx = (xAt(p + 0.008) - xAt(p - 0.008)) / W;
    it.x += dir * x;
    it.skew = (it.skew || 0) + dir * clamp(vx * 1100, -24, 24);
    const sp = Math.min(1, Math.abs(vx) * 40);
    stretch(it, 0.5, 0.5, 1 + 0.12 * sp, 1 - 0.05 * sp);
    if (p > T[3] && sp > 0.05) it.streak = { n: 3, dx: -dir * sz * 0.5 * sp, dy: 0, a: 0.3 * sp };
  },
};

/* =====================================================================
   C. OPTICAL
   ===================================================================== */

/* ピント送り — the focus hunts: the line goes soft, nearly snaps sharp again, then the focus is pulled right away from it */
X.xjFocusPull = {
  name: 'ピント送り', en: 'Focus Pull', tags: ['emotional', 'calm', 'editorial'], w: 1.1, ae: 'blur', outDur: OD,
  apply(env, it, p) {
    const sz = it.size, a = al(it), c = at(it, 0.5, 0.5);
    const b = p < 0.3 ? 0.5 * ioC(p / 0.3) : p < 0.48 ? lerp(0.5, 0.08, ioC(seg(p, 0.3, 0.48))) : lerp(0.08, 1, iQ(seg(p, 0.48, 1)));
    scaleAt(it, c[0], c[1], 1 + 0.1 * b);
    const fade = 1 - J.smooth(0.58, 1, p);
    if (env.allowFilter) { it.blur = (it.blur || 0) + b * sz * 0.26; it.alpha = a * fade; return; }
    // fast preview: a ring of faint copies stands in for the blur disc
    const r = b * sz * 0.1, ca = a * fade * 0.24 * Math.min(1, b * 6);
    it.alpha = a * fade * (1 - 0.6 * Math.min(1, b * 3));
    if (ca > 0.01) chainPre(it, (env2, it2) => { for (let k = 0; k < 6; k++) J.drawItem(env2, copyOf(it2, { x: it2.x + Math.cos(k * PI / 3) * r, y: it2.y + Math.sin(k * PI / 3) * r, alpha: ca, shadow: null, extrude: null })); });
  },
};

/* 二重像に割れる — the image doubles across the line, each of the two doubles again along it; the four thin images drift apart and fade */
X.xjDoubleVision = {
  name: '二重像に割れる', en: 'Double Vision', tags: ['emotional', 'glitch', 'calm'], w: 1.1, ae: 'blur', outDur: OD,
  apply(env, it, p) {
    const sz = it.size, a = al(it), e1 = sz * 0.46 * oC(seg(p, 0, 0.7)), e2 = sz * 0.3 * oC(seg(p, 0.28, 1));
    const cr = crossV(it), ax = alongV(it);
    const A = a * lerp(1, 0.5, seg(p, 0, 0.3)) * (1 - iQ(seg(p, 0.4, 1)));
    const c = at(it, 0.5, 0.5);
    scaleAt(it, c[0], c[1], 1 + 0.05 * p);
    const x1 = it.x, y1 = it.y;
    const at4 = (s1, s2) => ({ x: x1 + s1 * cr[0] * e1 + s2 * ax[0] * e2, y: y1 + s1 * cr[1] * e1 + s2 * ax[1] * e2 });
    Object.assign(it, at4(1, 1)); it.alpha = A;
    if (A > 0.004) chainPost(it, (env2, it2) => {
      const m = { alpha: A, shadow: null, extrude: null };
      J.drawItem(env2, copyOf(it2, Object.assign(at4(-1, 1), m)));
      if (e2 > 0.3) {
        J.drawItem(env2, copyOf(it2, Object.assign(at4(1, -1), m)));
        J.drawItem(env2, copyOf(it2, Object.assign(at4(-1, -1), m)));
      }
    });
  },
};

/* 色が抜ける — the colour drains out of the line from one end to the other, leaving a pale print of it; the print then fades */
X.xjColourDrain = {
  name: '色が抜ける', en: 'Colour Drain', tags: ['emotional', 'calm', 'editorial'], w: 1.1, ae: 'wipe', outDur: OD,
  apply(env, it, p) {
    const sz = it.size, a = al(it), bb = dBox(it, sz * 0.3), turned = Math.abs(Math.sin((it.rot || 0) * DEG)) > 0.72, v = !!it.vertical !== turned;
    const rev = cutBit(env, 17), c0 = inkOf(env, it), pale = mixC(c0, env.sc.bg, 0.8), band = sz * 0.45, N = 3;
    const a0 = v ? bb.y0 : bb.x0, a1 = v ? bb.y1 : bb.x1, e = ioC(seg(p, 0, 0.62));
    const edge = rev ? lerp(a1 + band * N, a0, e) : lerp(a0 - band * N, a1, e), sg = rev ? 1 : -1;      // drained side lies at edge + sg·t
    const R = (ctx, t0, t1) => { const lo = Math.min(edge + sg * t0, edge + sg * t1), hi = Math.max(edge + sg * t0, edge + sg * t1); if (v) ctx.rect(-BIG, lo, BIG * 3, hi - lo); else ctx.rect(lo, -BIG, hi - lo, BIG * 3); };
    const fa = a * (1 - ioC(seg(p, 0.5, 1)));
    it.clipFn = (ctx) => R(ctx, 0, -BIG * 2);
    if (fa > 0.004) chainPost(it, (env2, it2) => {
      const ctx = env2.ctx;
      for (let k = 0; k <= N; k++) {
        ctx.save(); ctx.beginPath(); R(ctx, k * band, k === N ? BIG * 2 : (k + 1) * band); ctx.clip();
        J.drawItem(env2, copyOf(it2, { color: mixC(c0, pale, (k + 1) / (N + 1)), strokeColor: it2.strokeColor ? mixC(c0, pale, (k + 1) / (N + 1)) : it2.strokeColor,
          gradient: null, pattern: null, shadow: null, extrude: null, alpha: fa, clipFn: null }));
        ctx.restore();
      }
    });
    if (e >= 1) it.alpha = 0;
  },
};

/* 尾を引いて飛ぶ — the line dips, then climbs away on a curve, shrinking, with a tail of its own earlier positions strung out behind it */
X.xjComet = {
  name: '尾を引いて飛ぶ', en: 'Comet Tail', tags: ['pop', 'emotional', 'graphic'], w: 1.2, ae: 'drift', outDur: OD,
  apply(env, it, p) {
    const sz = it.size, a = al(it), bb = dBox(it, 0), dir = cutBit(env, 18) ? 1 : -1, off = offX(env, bb, dir, sz * 2), acc = hot(env, it), c0 = inkOf(env, it);
    const c = at(it, 0.5, 0.5), base = { x: it.x, y: it.y, size: it.size, rot: it.rot || 0, stroke: it.stroke };
    const pose = (o, u) => {
      u = clamp(u);
      scaleAt(o, c[0], c[1], 1 - 0.5 * u);
      pivot(o, c[0], c[1], -dir * 10 * J.smooth(0.1, 0.7, u));
      o.x += dir * off * Math.pow(u, 2.5);
      o.y += -env.H * 0.42 * Math.pow(u, 1.7) + sz * 0.3 * Math.sin(PI * Math.min(1, u * 2.4)) * (1 - u);
    };
    pose(it, p);
    const ta = a * 0.55 * Math.min(1, p * 5);
    if (ta > 0.01) chainPre(it, (env2, it2) => {
      if (env2.pass !== 'main') return;                 // the tail is already a trail: no chromatic ghosts of it
      for (let k = 4; k >= 1; k--) {
        const o = copyOf(it2, Object.assign({}, base, { alpha: ta * Math.pow(0.7, k - 1), color: mixC(c0, acc, k / 5), gradient: null, pattern: null, shadow: null, extrude: null, blur: 0, stroke: 0 }));
        pose(o, p - k * 0.055 * (0.4 + 0.6 * p));
        J.drawItem(env2, o);
      }
    });
    it.alpha = a * (1 - J.smooth(0.9, 1, p));
  },
};

/* 抜け殻が追う — the solid body of the line slips out sideways and leaves its empty outline standing; the shell shivers, then is sucked out after it */
X.xjShellChase = {
  name: '抜け殻が追う', en: 'Shell Follows', tags: ['graphic', 'emotional', 'pop'], w: 1, ae: 'stretch', minDur: 0.55, outDur: OD,
  apply(env, it, p) {
    const sz = it.size, a = al(it), bb = dBox(it, 0), dir = cutBit(env, 19) ? 1 : -1, off = offX(env, bb, dir, sz * 2);
    const u = seg(p, 0.42, 0.96), e = iC(u), hollow = it.fill === false;
    const b0 = { x: it.x, y: it.y, sx: it.sx, sy: it.sy };
    const o = hollow ? null : toOutline(it, Math.max(1.5, sz * 0.02) * Math.min(1, p * 8));
    if (!hollow) {
      const q = seg(p, 0, 0.48), bx = dir * off * iC(q), sk = (it.skew || 0) - dir * 14 * Math.sin(PI * Math.min(1, q * 1.4));
      chainPost(it, (env2, it2) => { if (q < 1) J.drawItem(env2, copyOf(it2, Object.assign({}, o, b0, { x: b0.x + bx, skew: sk }))); });
    }
    it.x += Math.sin(p * 140) * sz * 0.012 * seg(p, 0.2, 0.4) * (1 - u) + dir * off * e;
    if (u > 0) { stretch(it, 0.5, 0.5, 1 + 0.45 * Math.min(1, u * 2.5), 1 - 0.1 * Math.min(1, u * 2.5)); it.skew = (it.skew || 0) - dir * 10 * Math.min(1, u * 3); }
    it.alpha = a * (1 - J.smooth(0.9, 1, p));
  },
};

/* 影だけ残る — the line lifts off the page and its shadow parts from it; the line flies out of the top, the shadow stays a moment longer and fades */
X.xjShadowStay = {
  name: '影だけ残る', en: 'Shadow Stays', tags: ['emotional', 'calm', 'editorial'], w: 1.1, ae: 'drift', minDur: 0.55, outDur: OD,
  apply(env, it, p) {
    const sz = it.size, a = al(it), bb = dBox(it, 0), c = at(it, 0.5, 0.5), c0 = inkOf(env, it);
    const base = { x: it.x, y: it.y, size: it.size, stroke: it.stroke };
    const q1 = oC(seg(p, 0, 0.32)), u = iC(seg(p, 0.26, 0.74)), shC = mixC(env.sc.bg, c0, 0.34);
    scaleAt(it, c[0], c[1], 1 + 0.09 * q1 + 0.45 * u);
    it.x -= sz * 0.03 * q1; it.y -= sz * 0.22 * q1 + (bb.y1 + bb.h * 0.8 + sz) * u;
    const sa = a * seg(p, 0, 0.1) * (1 - ioC(seg(p, 0.66, 1))), k = 1 + 0.05 * u;
    if (sa > 0.004) chainPre(it, (env2, it2) => {
      const o = copyOf(it2, Object.assign({}, base, { x: base.x + sz * 0.05 * q1, y: base.y + sz * 0.1 * q1, color: shC, strokeColor: it2.strokeColor ? shC : it2.strokeColor,
        gradient: null, pattern: null, shadow: null, extrude: null, alpha: sa, ghost: false }));
      scaleAt(o, c[0], c[1] + sz * 0.1 * q1, k);
      J.drawItem(env2, o);
    });
  },
};

/* 焦点を越える — as through a lens: the image shrinks to a point at the focus, comes out the other side upside-down, large and soft, and dissolves */
X.xjThroughFocus = {
  name: '焦点を越える', en: 'Through Focus', tags: ['emotional', 'glitch', 'graphic'], w: 0.7, ae: 'shrink', minDur: 0.5, outDur: OD,
  apply(env, it, p) {
    const sz = it.size, a = al(it), c = at(it, 0.5, 0.5), t0 = 0.44;
    if (p < t0) { scaleAt(it, c[0], c[1], 1 - iC(p / t0)); return; }
    const q = seg(p, t0, 1), g = oC(q);
    pivot(it, c[0], c[1], 180);
    scaleAt(it, c[0], c[1], 1.25 * g);
    it.alpha = a * 0.7 * Math.pow(1 - q, 1.3);
    it.shadow = null; it.extrude = null;
    if (env.allowFilter) it.blur = (it.blur || 0) + sz * 0.12 * g;
    else { it.fillAlpha = (it.fillAlpha ?? 1) * 0.45; it.stroke = Math.max(it.stroke || 0, sz * 0.012); if (!it.strokeColor) it.strokeColor = it.color; }
  },
};

/* 流れて滲む — the camera pans off: the line smears out both ways along itself into a flat band of light and thins away */
X.xjPanSmear = {
  name: '流れて滲む', en: 'Pan Smear', tags: ['emotional', 'calm', 'glitch'], w: 1.1, ae: 'blur', outDur: OS,
  apply(env, it, p) {
    const sz = it.size, a = al(it), ax = alongV(it), d = sz * 0.42 * oC(seg(p, 0, 0.85)), e = iQ(p), ca = 0.55 * seg(p, 0, 0.14);
    stretchAlong(it, 0.5, 1 + 0.3 * e, 1 - 0.45 * e);
    it.streak = { n: 3, dx: ax[0] * d * 1.25, dy: ax[1] * d * 1.25, a: ca };
    it.echo = { n: 3, dx: -ax[0] * d * 1.25, dy: -ax[1] * d * 1.25, a: ca * 0.8, decay: 0.72 };
    it.alpha = a * (1 - ioC(seg(p, 0.22, 1)));
  },
};

/* =====================================================================
   D. STEPPED (held poses)
   ===================================================================== */

/* コマ落ちフェード — no in-betweens: the line drops through four held exposures, each paler and a notch lower, and the fifth frame is empty */
X.xjStepFade = {
  name: 'コマ落ちフェード', en: 'Stepped Fade', tags: ['calm', 'editorial', 'emotional'], w: 1, ae: 'blur', outDur: OS,
  apply(env, it, p) {
    const T = [0.07, 0.29, 0.51, 0.73, 0.92], sz = it.size;
    let s = 0; while (s < 5 && p >= T[s]) s++;
    if (!s) return;
    if (s >= 5) { it.alpha = 0; return; }
    const c = at(it, 0.5, 0.5);
    it.alpha = al(it) * [1, 0.66, 0.4, 0.2, 0.08][s];
    if (isHex(it.color)) it.color = mixC(it.color, env.sc.bg, [0, 0.12, 0.26, 0.4, 0.5][s]);
    scaleAt(it, c[0], c[1], 1 - 0.014 * s);
    it.y += sz * 0.04 * s;
    it.shadow = null;
  },
};

/* 残像コマ送り — the line leaves in four held poses, each a jump further along and a little more askew; the poses it has left stay as thin outlines for a beat */
X.xjOnionSkin = {
  name: '残像コマ送り', en: 'Onion Skin', tags: ['graphic', 'pop', 'glitch'], w: 1, ae: 'glitch', minDur: 0.5, outDur: OD,
  apply(env, it, p) {
    const sz = it.size, a = al(it), dir = cutBit(env, 20) ? 1 : -1, up = cutBit(env, 21) ? -1 : 1, acc = hot(env, it), c0 = inkOf(env, it);
    const c = at(it, 0.5, 0.5), base = { x: it.x, y: it.y, size: it.size, rot: it.rot || 0, stroke: it.stroke };
    const L = Math.max(sz * 0.9, env.W * 0.07), OF = [0, 1, 2.3, 3.9], RT = [0, -5, 4, -9], SC = [1, 0.95, 0.89, 0.82];
    const pose = (o, j) => { pivot(o, c[0], c[1], dir * RT[j]); scaleAt(o, c[0], c[1], SC[j]); o.x += dir * L * OF[j]; o.y += up * L * 0.32 * OF[j]; };
    const s = p < 0.1 ? 0 : p < 0.3 ? 1 : p < 0.5 ? 2 : p < 0.7 ? 3 : 4;
    if (!s) return;
    const fade = s === 4 ? 1 - seg(p, 0.7, 0.98) : 1, lw = Math.max(1.5, sz * 0.016);
    chainPre(it, (env2, it2) => {
      for (let j = Math.max(0, s - 2); j < s; j++) {
        const o = copyOf(it2, Object.assign({}, base, { fill: false, stroke: lw, strokeColor: j === s - 1 ? acc : c0, alpha: a * (j === s - 1 ? 0.75 : 0.35) * fade, shadow: null, extrude: null, gradient: null, pattern: null, dash: null }));
        pose(o, j);
        J.drawItem(env2, o);
      }
    });
    if (s === 4) { it.alpha = 0; return; }
    pose(it, s);
  },
};

/* ---------------- registration ----------------
   items that hold ONE glyph of a longer cut (mixed / scatter layouts) leave one after another, in reading order;
   p≈1 is always fully gone, whatever a recipe leaves at the very end */
for (const k of Object.keys(X)) {
  const f = X[k].apply;
  X[k].apply = (env, it, p, ctx) => {
    p = p / 0.88;                                   // on-twos playback shows its last drawing a little before p = 1: be gone by then
    if (p >= 0.998) { it.alpha = 0; return; }
    const N = cutN(env);
    if (N > 1 && J.glyphCount(String(it.text || '')) === 1) { p = win(p, clamp((+it.mi || 0) / (N - 1)), 0.4); if (p <= 0) return; if (p >= 0.998) { it.alpha = 0; return; } }
    f(env, it, p, ctx);
  };
  J.register('exit', k, X[k], P);
}
})();
