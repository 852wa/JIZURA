/* JIZURA pack: x2entC — 30 whole-item entrances (rigid transforms, physical arrivals, optical arrivals, held poses) */
(() => {
'use strict';
const E = J.E;
const P = 'x2entC';
const DEG = J.DEG, TAU = J.TAU, PI = Math.PI;
const clamp = J.clamp, lerp = J.lerp;
const reg = (key, def) => J.register('enter', key, def, P);

/* ---------------- easing ---------------- */
const oCubic = x => 1 - Math.pow(1 - clamp(x), 3);
const oQuart = x => 1 - Math.pow(1 - clamp(x), 4);
const iCubic = x => { x = clamp(x); return x * x * x; };
const ioCubic = x => { x = clamp(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const oBack = (x, s) => E.outBack(clamp(x), s);
const sstep = (a, b, x) => J.smooth(a, b, x);
// damped spring: 1 at t=0 → exactly 0 at t=1 (swings through 0)
const spring = (t, k, f) => { t = clamp(t); return Math.exp(-k * t) * Math.cos(f * PI * t) * (1 - t * t * t); };
// 0 → 1 with three decreasing rebounds
function bounce(x) {
  x = clamp(x);
  const n1 = 7.5625, d1 = 2.75;
  if (x < 1 / d1) return n1 * x * x;
  if (x < 2 / d1) return n1 * (x -= 1.5 / d1) * x + 0.75;
  if (x < 2.5 / d1) return n1 * (x -= 2.25 / d1) * x + 0.9375;
  return n1 * (x -= 2.625 / d1) * x + 0.984375;
}

/* ---------------- item helpers ---------------- */
const isHex = c => typeof c === 'string' && c[0] === '#' && (c.length === 7 || c.length === 4);
const colOf = it => (isHex(it.color) ? it.color : '#ffffff');
const pick = (...cs) => cs.find(isHex) || '#ffffff';
const dirOf = (env, salt) => (J.r(env.cut.seed | 0, salt, 5) < 0.5 ? -1 : 1);
const glyphN = it => [...String(it.text || '').replace(/\s/g, '')].length;
// a colour that differs from the item's own colour
const hotOf = (env, it) => (it.color === env.sc.accent ? pick(env.sc.accent2, env.sc.fg) : pick(env.sc.accent, env.sc.fg));
// the lyric's primary item (not a faded / outline copy, not one glyph of a multi-item layout): props only go here
const isPrimary = it => (it.alpha ?? 1) >= 0.85 && it.fill !== false && glyphN(it) > 1;
const fade = (it, k) => { it.alpha = (it.alpha ?? 1) * clamp(k); };
const shade = (env, it, t) => { if (isHex(it.color)) it.color = J.mix(it.color, pick(env.sc.bg), clamp(t)); };
const tint = (it, c, t) => {
  t = clamp(t); if (t <= 0.002) return;
  if (isHex(it.color)) it.color = J.mix(it.color, c, t);
  if (isHex(it.strokeColor)) it.strokeColor = J.mix(it.strokeColor, c, t);
};

function addPre(it, fn) { const prev = it.pre; it.pre = prev ? (env, x) => { prev(env, x); fn(env, x); } : fn; }
function addPost(it, fn) { const prev = it.post; it.post = prev ? (env, x, bb) => { prev(env, x, bb); fn(env, x, bb); } : fn; }
/* draw an extra copy of the item with the same glyph functions */
const STRIP = { pieceFn: null, streak: null, echo: null, pre: null, post: null, clipFn: null, clip: null, clipY: null, bands: null, vbands: null, wipeBar: null, cursorAt: null };
const FLAT = { gradient: null, pattern: null, shadow: null, extrude: null };
function copyDraw(env, x, extra) {
  const fns = x.charFns || [];
  return J.drawItem(env, Object.assign({}, x, STRIP, { charFn: fns.length ? J.combineChar(fns) : null }, extra || {}));
}

/* ---------------- geometry (item-local space: origin at it.x/it.y, before rotation) ---------------- */
function box(it) {
  const m = J.measure(it);
  const x0 = it.vertical ? -m.w / 2 : it.align === 'left' ? 0 : it.align === 'right' ? -m.w : -m.w / 2;
  const y0 = it.vertical && it.align === 'left' ? 0 : -m.h / 2;
  return { x0, y0, x1: x0 + m.w, y1: y0 + m.h, w: m.w, h: m.h, cx: x0 + m.w / 2, cy: y0 + m.h / 2 };
}
function toLocal(ctx, it) {
  ctx.translate(it.x, it.y);
  if (it.rot) ctx.rotate(it.rot * DEG);
}
/* local point → design space */
function toDesign(it, lx, ly) {
  const r = (it.rot || 0) * DEG, c = Math.cos(r), s = Math.sin(r);
  return [it.x + c * lx - s * ly, it.y + s * lx + c * ly];
}
/* move the item by a vector given in its local (rotated) frame */
function moveLocal(it, dx, dy) {
  const r = (it.rot || 0) * DEG, c = Math.cos(r), s = Math.sin(r);
  it.x += c * dx - s * dy; it.y += s * dx + c * dy;
}
/* rotate by `ang` degrees about the local point (lx, ly) */
function rotateAbout(it, ang, lx, ly) {
  if (!ang) return;
  const [px, py] = toDesign(it, lx, ly);
  it.rot = (it.rot || 0) + ang;
  const r = it.rot * DEG, c = Math.cos(r), s = Math.sin(r);
  it.x = px - (c * lx - s * ly); it.y = py - (s * lx + c * ly);
}
/* scale x / y keeping the local point (ax, ay) where it is */
function scaleFrom(it, kx, ky, ax, ay) {
  it.sx = (it.sx || 1) * kx; it.sy = (it.sy || 1) * ky;
  it._m = null; it._lay = null;
  moveLocal(it, -ax * (kx - 1), -ay * (ky - 1));
}
/* uniform scale (font size) keeping the local point (ax, ay) where it is */
function sizeFrom(it, k, ax, ay) {
  if (k === 1) return;
  it.size *= k; it._m = null; it._lay = null;
  moveLocal(it, -ax * (k - 1), -ay * (k - 1));
}
/* design-space AABB of the local box (rotation aware) */
function dRange(it, b) {
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  for (const [u, v] of [[b.x0, b.y0], [b.x1, b.y0], [b.x0, b.y1], [b.x1, b.y1]]) {
    const [X, Y] = toDesign(it, u, v);
    x0 = Math.min(x0, X); x1 = Math.max(x1, X); y0 = Math.min(y0, Y); y1 = Math.max(y1, Y);
  }
  return { x0, x1, y0, y1 };
}
/* graphics drawn after the item in its local frame: fn(env, box, item, itemAlpha) */
function postLocal(it, fn) {
  addPost(it, (env, x) => {
    const A = clamp(x.alpha ?? 1); if (A <= 0.01) return;
    const b = box(x), ctx = env.ctx; ctx.save(); toLocal(ctx, x);
    try { fn(env, b, x, A); } finally { ctx.restore(); ctx.globalAlpha = 1; }
  });
}

/* =====================================================================
   A. RIGID TRANSFORMS
   ===================================================================== */

/* 片開き戸 — the whole line is a door hinged on one edge: it swings shut from edge-on, rebounds open once and closes */
reg('xgGate', {
  name: '片開き戸', en: 'Gate Swing', tags: ['graphic', 'editorial', 'pop'], w: 1, ae: 'spin',
  inDur: dur => clamp(dur * 0.45, 0.22, 0.8),
  apply(env, it, p) {
    const vert = !!it.vertical, b = box(it), dir = dirOf(env, 11), size = it.size;
    const th = 88 * Math.abs(spring(p, 1.6, 2.2)), k = Math.max(0.02, Math.cos(th * DEG));
    if (vert) scaleFrom(it, 1, k, b.cx, dir > 0 ? b.y0 : b.y1); else scaleFrom(it, k, 1, dir > 0 ? b.x0 : b.x1, b.cy);
    const prim = isPrimary(it);
    fade(it, p * 8); shade(env, it, (1 - k) * 0.5);
    if (!prim) return;
    postLocal(it, (env2, bb, x, A) => {
      const a = A * (1 - sstep(0.55, 0.95, p)); if (a <= 0.01) return;
      const t = Math.max(2, size * 0.035), m = size * 0.12;
      if (vert) env2.rect(bb.x0 - m, (dir > 0 ? bb.y0 : bb.y1) - (dir > 0 ? t + m : -m), bb.w + m * 2, t, env2.sc.accent, a, false);
      else env2.rect((dir > 0 ? bb.x0 : bb.x1) - (dir > 0 ? t + m : -m), bb.y0 - m, t, bb.h + m * 2, env2.sc.accent, a, false);
    });
  },
});

/* 回転看板 — the line turns one and a half times around its own upright axis like a revolving sign, showing its dim back */
reg('xgSignSpin', {
  name: '回転看板', en: 'Sign Spin', tags: ['pop', 'graphic'], w: 0.9, ae: 'spin', minDur: 0.5,
  inDur: dur => clamp(dur * 0.45, 0.25, 0.85),
  apply(env, it, p) {
    const vert = !!it.vertical, b = box(it);
    const th = (1 - oCubic(p)) * 540, c = Math.cos(th * DEG), k = Math.max(0.03, Math.abs(c));
    if (vert) scaleFrom(it, 1, k, b.cx, b.cy); else scaleFrom(it, k, 1, b.cx, b.cy);
    fade(it, p * 5);
    if (c < 0) { shade(env, it, 0.55); it.charFns.push(() => (vert ? { sy: -1 } : { sx: -1 })); }
    else shade(env, it, (1 - k) * 0.35);
  },
});

/* 前のめり — slides in and brakes hard: the body pitches forward on its front bottom corner, the tail lifts and drops back */
reg('xgNoseDive', {
  name: '前のめり', en: 'Nose Dive', tags: ['pop', 'graphic'], w: 1, ae: 'stretch', minDur: 0.5,
  inDur: dur => clamp(dur * 0.45, 0.25, 0.85),
  apply(env, it, p) {
    const dir = dirOf(env, 13), b = box(it), size = it.size;
    const D = Math.min(env.W * 0.45, Math.max(size * 3, b.w * 0.6)) * (0.7 + 0.5 * env.fx.motion);
    const e = oQuart(p / 0.5), t = (p - 0.26) / 0.74;
    const pitch = t <= 0 ? 0 : t < 0.28 ? E.outCubic(t / 0.28) : 1 - bounce((t - 0.28) / 0.72);
    const amp = clamp(size * 30 / Math.max(1, b.w), 5, 15);
    rotateAbout(it, dir * amp * pitch, dir > 0 ? b.x1 : b.x0, b.y1);
    it.x -= dir * D * (1 - e);
    if (e < 0.98) it.streak = { n: 3, dx: -dir * size * 0.3 * (1 - e), dy: 0, a: 0.3 * (1 - e) };
    fade(it, p * 7);
  },
});

/* 四分回転 — the line stands on end, turns a quarter and lands level with a small over-rotation */
reg('xgQuarterTurn', {
  name: '四分回転', en: 'Quarter Turn', tags: ['graphic', 'pop', 'editorial'], w: 1, ae: 'spin',
  inDur: dur => clamp(dur * 0.4, 0.18, 0.7),
  apply(env, it, p) {
    const dir = dirOf(env, 15), b = box(it);
    rotateAbout(it, dir * 90 * (1 - oBack(p, 1.5)), b.cx, b.cy);
    sizeFrom(it, lerp(0.5, 1, oCubic(p)), b.cx, b.cy);
    fade(it, p * 5);
  },
});

/* 角から展開 — the line grows out of one of its own corners while swinging round that corner */
reg('xgCornerUnfurl', {
  name: '角から展開', en: 'Corner Unfurl', tags: ['graphic', 'editorial', 'pop'], w: 1, ae: 'zoom',
  inDur: dur => clamp(dur * 0.42, 0.2, 0.75),
  apply(env, it, p) {
    const b = box(it), c = J.h(env.cut.seed | 0, 17) % 4;
    const ax = c & 1 ? b.x1 : b.x0, ay = c & 2 ? b.y1 : b.y0, sgn = ((c & 1) ^ ((c >> 1) & 1)) ? 1 : -1;
    rotateAbout(it, sgn * 40 * spring(p, 2.8, 1.5), ax, ay);
    sizeFrom(it, Math.max(0.04, oBack(p, 1.3)), ax, ay);
    fade(it, p * 6);
  },
});

/* 弧で滑走 — the line rides in on a wide arc around a far pivot, like the tip of a wiper blade */
reg('xgWiper', {
  name: '弧で滑走', en: 'Arc Sweep', tags: ['graphic', 'pop', 'emotional'], w: 1.1, ae: 'spin',
  inDur: dur => clamp(dur * 0.42, 0.2, 0.75),
  apply(env, it, p) {
    const b = box(it), dir = dirOf(env, 19), up = J.h(env.cut.seed | 0, 20) & 1;
    const R = Math.max(Math.min(env.W, env.H) * 0.85, b.w * 0.7);
    rotateAbout(it, dir * 40 * (1 - oBack(p, 1.2)), b.cx, b.cy + (up ? -R : R));
    fade(it, p * 6);
  },
});

/* ぷるん — the whole line pops up from the ground like jelly: width and height overshoot out of phase */
reg('xgJelly', {
  name: 'ぷるん', en: 'Jelly Pop', tags: ['pop', 'emotional'], w: 1, ae: 'pop', minDur: 0.45,
  inDur: dur => clamp(dur * 0.45, 0.22, 0.8),
  apply(env, it, p) {
    const b = box(it), ph = 1.0, d = Math.exp(-4 * p) * (1 - p * p * p);
    // overshoot (scale > 1) is kept smaller than the dip so long lines stay on screen
    const os = v => (v < 0 ? v * 0.35 : v);
    const sx = Math.max(0.03, 1 - os(d * Math.cos(3 * PI * p)));
    const sy = Math.max(0.03, 1 - os(d * Math.cos(3 * PI * p - ph) / Math.cos(ph)) * (1 - 0.3 * sstep(0, 0.5, p)));
    scaleFrom(it, sx, sy, b.cx, b.y1);
    fade(it, p * 8);
  },
});

/* 斜体起こし — the line lies sheared flat along its baseline and whips upright, leaning past vertical once */
reg('xgShearUp', {
  name: '斜体起こし', en: 'Shear Up', tags: ['editorial', 'graphic', 'pop'], w: 1, ae: 'stretch',
  inDur: dur => clamp(dur * 0.42, 0.2, 0.75),
  apply(env, it, p) {
    const b = box(it), dir = dirOf(env, 23), size = it.size;
    const tn = dir * Math.min(2.2, size * 2.6 / Math.max(1, b.h)) * spring(p, 3.0, 2.3);
    it.skew = (it.skew || 0) + Math.atan(tn) / DEG;
    moveLocal(it, -tn * b.y1, 0);
    fade(it, p * 5);
  },
});

/* 号外スピン — the line spins in from a dot, two full turns, like a headline hitting the screen */
reg('xgNewsSpin', {
  name: '号外スピン', en: 'Headline Spin', tags: ['pop', 'graphic'], w: 0.6, ae: 'spin', minDur: 0.5,
  inDur: dur => clamp(dur * 0.45, 0.25, 0.8),
  apply(env, it, p) {
    const b = box(it), dir = dirOf(env, 25);
    rotateAbout(it, dir * 720 * (1 - oCubic(p)), b.cx, b.cy);
    sizeFrom(it, Math.max(0.03, sstep(0, 1, p)), b.cx, b.cy);
    fade(it, p * 4);
  },
});

/* コイン着地 — the line rattles flat like a coin settling: it tips back and forth faster and faster, less and less */
reg('xgCoinSettle', {
  name: 'コイン着地', en: 'Coin Settle', tags: ['pop', 'graphic'], w: 0.6, ae: 'spin', minDur: 0.6,
  inDur: dur => clamp(dur * 0.5, 0.3, 0.95),
  apply(env, it, p) {
    const vert = !!it.vertical, b = box(it), ph = TAU * (1.5 * p + 4.5 * p * p), d = Math.pow(1 - p, 1.3);
    const k = Math.max(0.05, 1 - 0.88 * d * (0.5 + 0.5 * Math.cos(ph)));
    rotateAbout(it, 5 * d * Math.sin(ph / 2) * (1 - p), b.cx, b.cy);
    if (vert) scaleFrom(it, k, 1, b.cx, b.cy); else scaleFrom(it, 1, k, b.cx, b.cy);
    shade(env, it, (1 - k) * 0.4);
    fade(it, p * 7);
  },
});

/* 空気入れ — pumped up in three puffs: each stroke swells the line past a size, it sags a little, the last one fills it */
reg('xgPumpUp', {
  name: '空気入れ', en: 'Pump Up', tags: ['pop'], w: 0.8, ae: 'pop', minDur: 0.55,
  inDur: dur => clamp(dur * 0.5, 0.3, 0.9),
  apply(env, it, p) {
    const b = box(it), L = [0.02, 0.45, 0.75, 1], x3 = p * 3, k = Math.min(2, Math.floor(x3)), f = x3 - k;
    let s = lerp(L[k], L[k + 1], oBack(f / 0.5, 2.4));
    if (k < 2) s -= 0.06 * sstep(0.55, 1, f);
    const puff = Math.sin(PI * clamp(f / 0.5)) * 0.07;
    sizeFrom(it, Math.max(0.02, s), b.cx, b.cy);
    scaleFrom(it, 1 + puff, 1 - puff * 0.6, b.cx * Math.max(0.02, s), b.cy * Math.max(0.02, s));
    fade(it, p * 10);
  },
});

/* =====================================================================
   B. PHYSICAL ARRIVALS
   ===================================================================== */

/* どすん — the line falls as one heavy body, flattens on the floor and hops twice, squashing less each time */
reg('xgHeavyDrop', {
  name: 'どすん', en: 'Heavy Drop', tags: ['pop', 'graphic'], w: 1.1, ae: 'drop', minDur: 0.55,
  inDur: dur => clamp(dur * 0.5, 0.3, 0.9),
  apply(env, it, p) {
    const b = box(it), size = it.size, D = size * 2.6 + b.h * 0.5;
    let dy = 0, sy = 1;
    const seg = (a, c) => clamp((p - a) / (c - a));
    if (p < 0.3) { const t = p / 0.3; dy = -(1 - t * t) * D; sy = 1 + 0.22 * t; }
    else if (p < 0.42) sy = 1 - 0.34 * Math.sin(PI * seg(0.3, 0.42));
    else if (p < 0.7) { const u = seg(0.42, 0.7); dy = -4 * u * (1 - u) * size * 0.55; sy = 1 + 0.1 * Math.sin(PI * u); }
    else if (p < 0.78) sy = 1 - 0.2 * Math.sin(PI * seg(0.7, 0.78));
    else if (p < 0.92) { const u = seg(0.78, 0.92); dy = -4 * u * (1 - u) * size * 0.14; }
    else sy = 1 - 0.07 * Math.sin(PI * seg(0.92, 1));
    const prim = isPrimary(it), R0 = prim ? dRange(it, b) : null;
    scaleFrom(it, 1 / Math.pow(sy, 0.35), sy, b.cx, b.y1);
    it.y += dy;
    fade(it, p * 10);
    if (!prim || p < 0.3) return;
    addPost(it, (env2, x) => {
      const t = clamp((p - 0.3) / 0.4), a = clamp(x.alpha ?? 1) * (1 - t) * 0.9; if (a <= 0.01) return;
      const w = (R0.x1 - R0.x0) * (0.6 + 0.6 * oCubic(t)), h = Math.max(2, size * 0.035 * (1 - t));
      env2.rect((R0.x0 + R0.x1) / 2 - w / 2, R0.y1 + size * 0.06, w, h, env2.sc.accent, a, false);
    });
  },
});

/* 押し棒 — a bar shoves the line into place at a steady pace; the bar pulls away and the squeezed line relaxes */
reg('xgPushBar', {
  name: '押し棒', en: 'Push Bar', tags: ['graphic', 'editorial', 'pop'], w: 1, ae: 'stretch', minDur: 0.5,
  inDur: dur => clamp(dur * 0.48, 0.25, 0.85),
  apply(env, it, p) {
    const vert = !!it.vertical, dir = dirOf(env, 29), b = box(it), size = it.size, tP = 0.6, a = 0.25, v = 1 / (1 - a / 2);
    const D = Math.min((vert ? env.H : env.W) * 0.42, (vert ? b.h : b.w) * 0.35 + size * 2.4);
    const prim = isPrimary(it);
    let off = 0, sq, t2 = 0;
    if (p < tP) { const t = p / tP, e = t < a ? v * t * t / (2 * a) : v * (t - a / 2); off = -dir * D * (1 - e); sq = 1 - 0.09 * sstep(0, 0.15, t); }
    else { t2 = (p - tP) / (1 - tP); sq = 1 - 0.09 * spring(t2, 3.5, 3); }
    if (vert) { scaleFrom(it, 1, sq, b.cx, dir > 0 ? b.y0 : b.y1); it.y += off; }
    else { scaleFrom(it, sq, 1, dir > 0 ? b.x0 : b.x1, b.cy); it.x += off; }
    fade(it, p * 8);
    if (!prim) return;
    postLocal(it, (env2, bb, x, A) => {
      const al = A * (p < tP ? 1 : 1 - sstep(0.25, 0.85, t2)); if (al <= 0.01) return;
      const bw = Math.max(6, size * 0.09), m = size * 0.2, gap = size * 0.06 + iCubic(t2) * size * 3;
      if (vert) env2.rect(bb.x0 - m, dir > 0 ? bb.y0 - gap - bw : bb.y1 + gap, bb.w + m * 2, bw, env2.sc.accent, al, false);
      else env2.rect(dir > 0 ? bb.x0 - gap - bw : bb.x1 + gap, bb.y0 - m, bw, bb.h + m * 2, env2.sc.accent, al, false);
    });
  },
});

/* 壁当て — the line speeds up from the side, hits an unseen wall, crumples against it and springs back to its length */
reg('xgWallHit', {
  name: '壁当て', en: 'Wall Hit', tags: ['pop', 'graphic', 'glitch'], w: 1, ae: 'stretch', minDur: 0.5,
  inDur: dur => clamp(dur * 0.45, 0.25, 0.8),
  apply(env, it, p) {
    const dir = dirOf(env, 31), b = box(it), size = it.size, tI = 0.4;
    const D = Math.min(env.W * 0.45, Math.max(size * 3.5, b.w * 0.5)) * (0.7 + 0.5 * env.fx.motion), front = dir > 0 ? b.x1 : b.x0;
    const prim = isPrimary(it), R0 = prim ? dRange(it, b) : null;
    let off, sq, t = 0;
    if (p < tI) {
      const u = p / tI, e = u * u * u;
      off = -dir * D * (1 - e); sq = 1 + 0.18 * u * u;
      it.streak = { n: 4, dx: -dir * size * 0.5 * u * u, dy: 0, a: 0.35 * u };
    } else {
      t = (p - tI) / (1 - tI);
      const u = clamp((t - 0.16) / 0.84);
      sq = t < 0.16 ? 1 - 0.36 * Math.sin(PI / 2 * t / 0.16) : 1 - 0.36 * spring(u, 3.2, 2.6);
      off = -dir * size * 0.4 * Math.sin(PI * u) * (1 - u);
    }
    scaleFrom(it, sq, 1 / Math.pow(sq, 0.5), front, b.cy);
    it.x += off;
    fade(it, p * 6);
    if (!prim || p < tI) return;
    addPost(it, (env2, x) => {
      const a = clamp(x.alpha ?? 1) * Math.exp(-t * 5) * (1 - t); if (a <= 0.01) return;
      const bw = Math.max(4, size * 0.06), m = size * (0.25 + 0.5 * oCubic(t));
      env2.rect(dir > 0 ? R0.x1 + size * 0.05 : R0.x0 - size * 0.05 - bw, R0.y0 - m, bw, R0.y1 - R0.y0 + m * 2, env2.sc.accent, a, false);
    });
  },
});

/* 吊り看板 — the line is let down on two chains like a hanging sign and rocks until it hangs still */
reg('xgHangSign', {
  name: '吊り看板', en: 'Hanging Sign', tags: ['pop', 'emotional', 'calm'], w: 0.9, ae: 'drop', minDur: 0.6,
  inDur: dur => clamp(dur * 0.55, 0.35, 1.0),
  apply(env, it, p) {
    const b = box(it), size = it.size, dir = dirOf(env, 33), L = size * 0.9 + b.h * 0.5;
    const prim = isPrimary(it), in0 = b.w * 0.1;
    const rest = prim ? [toDesign(it, b.x0 + in0, b.y0), toDesign(it, b.x1 - in0, b.y0)] : null;
    const amp = clamp(size * 34 / Math.max(1, b.w), 3.5, 12);
    rotateAbout(it, dir * amp * spring(p, 2.2, 4.4), b.cx, b.cy - L);
    it.y -= size * 1.2 * (1 - oCubic(p / 0.3));
    fade(it, p * 6);
    if (!prim) return;
    addPost(it, (env2, x) => {
      const a = clamp(x.alpha ?? 1) * (1 - sstep(0.7, 0.98, p)) * 0.75; if (a <= 0.01) return;
      const bx = box(x), lw = Math.max(1.5, size * 0.02), ix = bx.w * 0.1;
      const cur = [toDesign(x, bx.x0 + ix, bx.y0), toDesign(x, bx.x1 - ix, bx.y0)];
      for (let k = 0; k < 2; k++) {
        env2.line([[rest[k][0], -20], cur[k]], env2.sc.sub, lw, a, false);
        env2.circle(cur[k][0], cur[k][1], lw * 1.7, env2.sc.accent, null, 1, a, false);
      }
    });
  },
});

/* 判子の跳ね — the line is pressed down hard like a rubber stamp; the die (an outline) lifts off again and leaves the print */
reg('xgStampLift', {
  name: '判子の跳ね', en: 'Stamp Lift', tags: ['pop', 'graphic', 'editorial'], w: 1, ae: 'zoom',
  inDur: dur => clamp(dur * 0.42, 0.2, 0.75),
  apply(env, it, p) {
    const b = box(it), size = it.size, dir = dirOf(env, 35), tI = 0.3, hot = hotOf(env, it), a0 = clamp(it.alpha ?? 1);
    if (p < tI) {
      const t = iCubic(p / tI);
      rotateAbout(it, -dir * 7 * (1 - t), b.cx, b.cy);
      sizeFrom(it, lerp(1.45, 0.93, t), b.cx, b.cy);
      fade(it, p / tI * 2.5);
      return;
    }
    const t = (p - tI) / (1 - tI), lt = clamp(t / 0.85);
    sizeFrom(it, lerp(0.93, 1, oCubic(t / 0.5)), b.cx, b.cy);
    if (lt >= 1 || a0 < 0.3) return;
    addPost(it, (env2, x) => {
      if (env2.pass !== 'main') return;
      const bx = box(x), c = Object.assign({}, x);
      rotateAbout(c, dir * 5 * oCubic(lt), bx.cx, bx.cy);
      sizeFrom(c, 1 + 0.45 * oCubic(lt), bx.cx, bx.cy);
      copyDraw(env2, c, Object.assign({ fill: false, stroke: Math.max(1.5, size * 0.03), strokeColor: hot, color: hot, alpha: clamp(x.alpha ?? 1) * 0.8 * Math.pow(1 - lt, 1.4) }, FLAT));
    });
  },
});

/* ひらり着地 — the line sinks like a dropped sheet of paper, sliding from side to side and tilting with each swing */
reg('xgPaperFall', {
  name: 'ひらり着地', en: 'Paper Fall', tags: ['calm', 'emotional', 'pop'], w: 1, ae: 'drop', minDur: 0.6,
  inDur: dur => clamp(dur * 0.55, 0.35, 1.1),
  apply(env, it, p) {
    const b = box(it), size = it.size, dir = dirOf(env, 37), ph = p * TAU * 1.75, d = Math.pow(1 - p, 1.2);
    rotateAbout(it, -dir * 12 * Math.cos(ph) * d * sstep(0, 0.15, 1 - p), b.cx, b.cy);
    scaleFrom(it, 1, 1 - 0.3 * Math.abs(Math.sin(ph)) * d, b.cx, b.cy);
    it.x += dir * size * 0.9 * Math.sin(ph) * d;
    it.y -= size * 2.3 * (1 - Math.sin(p * PI / 2));
    fade(it, p * 4);
  },
});

/* ラチェット — the line is cranked in click by click: four short jerks, each one stops dead with a tiny kick */
reg('xgRatchet', {
  name: 'ラチェット', en: 'Ratchet', tags: ['graphic', 'glitch', 'pop'], w: 0.9, ae: 'stretch', minDur: 0.5,
  inDur: dur => clamp(dur * 0.5, 0.3, 0.9),
  apply(env, it, p) {
    const vert = !!it.vertical, b = box(it), size = it.size, dir = dirOf(env, 39), N = 4;
    const x4 = p * N, k = Math.min(N - 1, Math.floor(x4)), f = x4 - k;
    const e = (k + oBack(f / 0.4, 2.6)) / N, D = Math.min((vert ? env.H : env.W) * 0.4, size * 2.6) * (0.7 + 0.5 * env.fx.motion);
    rotateAbout(it, dir * 2.4 * Math.exp(-f * 7) * Math.sin(f * 18) * (1 - f), b.cx, b.cy);
    if (vert) it.y -= dir * D * (1 - e); else it.x -= dir * D * (1 - e);
    fade(it, p * N * 2.5);
  },
});

/* 滑車 — the line rides down a slanted wire on a pulley, is stopped short and swings forward under it */
reg('xgZipLine', {
  name: '滑車', en: 'Zip Line', tags: ['pop', 'graphic'], w: 0.6, ae: 'drop', minDur: 0.65,
  inDur: dur => clamp(dur * 0.55, 0.35, 1.0),
  apply(env, it, p) {
    const b = box(it), size = it.size, dir = dirOf(env, 41), tS = 0.55, slope = 0.42, hang = size * 0.7;
    const D = Math.max(size * 3, env.W * 0.42);
    const prim = isPrimary(it), P0 = prim ? toDesign(it, b.cx, b.y0 - hang) : null;
    const e = Math.pow(clamp(p / tS), 1.6), t = (p - tS) / (1 - tS);
    const amp = clamp(size * 40 / Math.max(1, b.w), 4, 13);
    const ang = p < tS ? dir * amp * sstep(0, 0.4, p / tS) : dir * amp * Math.cos(PI * 2.4 * t) * Math.pow(1 - t, 1.4);
    const ox = -dir * D * (1 - e), oy = -slope * D * (1 - e);
    rotateAbout(it, ang, b.cx, b.y0 - hang);
    it.x += ox; it.y += oy;
    fade(it, p * 6);
    if (!prim) return;
    addPost(it, (env2, x) => {
      const a = clamp(x.alpha ?? 1) * (1 - sstep(0.72, 0.98, p)) * 0.8; if (a <= 0.01) return;
      const lw = Math.max(1.5, size * 0.02), far = Math.max(env2.W, env2.H) * 1.5, bx = box(x);
      env2.line([[P0[0] - dir * far, P0[1] - slope * far], [P0[0] + dir * size * 0.5, P0[1] + slope * size * 0.5]], env2.sc.sub, lw, a, false);
      env2.line([[P0[0] + ox, P0[1] + oy], toDesign(x, bx.cx, bx.y0)], env2.sc.sub, lw, a, false);
      env2.circle(P0[0] + ox, P0[1] + oy, lw * 2.4, env2.sc.accent, null, 1, a, false);
    });
  },
});

/* =====================================================================
   C. OPTICAL ARRIVALS
   ===================================================================== */

/* ピント迷い — autofocus hunting: the blurred line snaps sharp, slips out of focus once more and locks */
reg('xgFocusHunt', {
  name: 'ピント迷い', en: 'Focus Hunt', tags: ['emotional', 'calm', 'editorial'], w: 1.1, ae: 'blur', minDur: 0.5,
  inDur: dur => clamp(dur * 0.5, 0.3, 0.95),
  apply(env, it, p) {
    const b = box(it), size = it.size;
    const f = p < 0.45 ? 1 - ioCubic(p / 0.45) : p < 0.85 ? 0.42 * Math.sin(PI * (p - 0.45) / 0.4) : 0;
    sizeFrom(it, 1 + 0.08 * f, b.cx, b.cy);
    fade(it, Math.pow(clamp(p * 3), 0.7) * (1 - 0.35 * f));
    if (env.allowFilter) it.blur = (it.blur || 0) + Math.min(24, size * 0.12) * f;
    else if (f > 0.02) it.echo = { n: 3, scale: 1 + 0.035 * f, a: 0.35 * f, decay: 0.7 };
  },
});

/* ストロボ — three flash exposures: the line is caught large and off to the side, closer, then on its mark, where it stays lit */
reg('xgStrobe', {
  name: 'ストロボ', en: 'Strobe', tags: ['glitch', 'pop', 'graphic'], w: 0.9, ae: 'flicker', minDur: 0.45,
  inDur: dur => clamp(dur * 0.42, 0.25, 0.7),
  apply(env, it, p) {
    const b = box(it), size = it.size, dir = dirOf(env, 45), hot = hotOf(env, it);
    const x3 = p * 3, k = Math.min(2, Math.floor(x3)), f = x3 - k;
    const pose = [[1.3, 0.34, -0.2], [1.13, -0.16, 0.09], [1, 0, 0]][k];
    sizeFrom(it, pose[0], b.cx, b.cy);
    it.x += dir * size * pose[1]; it.y += size * pose[2];
    if (k < 2) { fade(it, 0.9 * Math.exp(-f * 3.2) * clamp(p * 25)); tint(it, hot, 0.5); }
    else tint(it, hot, 0.9 * Math.exp(-f * 5) * (1 - f));
  },
});

/* 二重視 — double vision: two half-strength copies of the line drift across each other and fuse into one sharp line */
reg('xgDoubleVision', {
  name: '二重視', en: 'Double Vision', tags: ['emotional', 'glitch', 'calm'], w: 1, ae: 'blur', minDur: 0.5,
  inDur: dur => clamp(dur * 0.5, 0.3, 0.95),
  apply(env, it, p) {
    const size = it.size, vert = !!it.vertical;
    const d = size * 0.8 * Math.pow(1 - p, 1.5) * Math.cos(2.5 * PI * p), a0 = clamp(it.alpha ?? 1) * clamp(p * 4);
    if (vert) it.y += d; else it.x += d;
    fade(it, clamp(p * 4) * lerp(0.55, 1, sstep(0.6, 1, p)));
    const ca = 0.55 * (1 - sstep(0.7, 1, p)) * a0;
    if (ca <= 0.01) return;
    addPre(it, (env2, x) => {
      copyDraw(env2, Object.assign({}, x, vert ? { y: x.y - 2 * d } : { x: x.x - 2 * d }), { alpha: ca, shadow: null });
    });
  },
});

/* 尾引き着地 — the line drops in ahead of a long trail of afterimages, which then catches up with it */
reg('xgComet', {
  name: '尾引き着地', en: 'Comet Trail', tags: ['pop', 'emotional', 'glitch'], w: 1, ae: 'drop',
  inDur: dur => clamp(dur * 0.45, 0.22, 0.8),
  apply(env, it, p) {
    const size = it.size, vert = !!it.vertical, dir = vert ? dirOf(env, 49) : -1;
    const e = E.outExpo(clamp(p / 0.35)), D = size * 3 * (0.7 + 0.5 * env.fx.motion);
    const L = size * 2.4 * clamp(p / 0.12) * (1 - oCubic((p - 0.25) / 0.75)), n = 8;
    if (vert) it.x += dir * D * (1 - e); else it.y += dir * D * (1 - e);
    if (L > 0.5) it.streak = vert ? { n, dx: dir * L / n, dy: 0, a: 0.55 } : { n, dx: 0, dy: dir * L / n, a: 0.55 };
    fade(it, p * 8);
  },
});

/* 塗り合わせ — a hairline outline of the line waits in place; the solid fill slides in off-register and docks into it */
reg('xgFillDock', {
  name: '塗り合わせ', en: 'Fill Docking', tags: ['graphic', 'editorial', 'pop'], w: 1, ae: 'slice', minDur: 0.5,
  inDur: dur => clamp(dur * 0.48, 0.25, 0.85),
  apply(env, it, p) {
    const size = it.size, dir = dirOf(env, 51), a0 = clamp(it.alpha ?? 1), col = colOf(it);
    const q = clamp((p - 0.22) / 0.78), k = 1 - oBack(q, 1.6);
    const ox = dir * size * 0.5 * k, oy = size * 0.32 * k;
    it.x += ox; it.y += oy;
    if (it.fill === false) { fade(it, q * 4); return; }
    fade(it, clamp(q * 5) * lerp(0.8, 1, q));
    const oa = a0 * clamp(p * 7) * (1 - sstep(0.8, 1, p));
    if (oa <= 0.01) return;
    addPre(it, (env2, x) => {
      copyDraw(env2, Object.assign({}, x, { x: x.x - ox, y: x.y - oy }),
        Object.assign({ fill: false, stroke: Math.max(1.2, size * 0.022), strokeColor: col, color: col, alpha: oa, strokeDash: null, dash: null }, FLAT));
    });
  },
});

/* 色替わり — the line pops up in the accent colour, then its own colour pours down through the glyphs behind a thin band */
reg('xgColorPour', {
  name: '色替わり', en: 'Colour Pour', tags: ['pop', 'graphic', 'editorial'], w: 1, ae: 'wipe', minDur: 0.5,
  inDur: dur => clamp(dur * 0.48, 0.25, 0.85),
  apply(env, it, p) {
    const b = box(it), up = J.h(env.cut.seed | 0, 53) & 1, alt = hotOf(env, it);
    const band = alt === env.sc.accent ? pick(env.sc.accent2, env.sc.fg) : pick(env.sc.accent, env.sc.fg);
    sizeFrom(it, lerp(0.8, 1, oBack(p / 0.3, 2)), b.cx, b.cy);
    fade(it, p * 8);
    const k = ioCubic((p - 0.22) / 0.72) * 1.12;
    if (it.fill === false || it.gradient || it.pattern || !isHex(it.color)) { tint(it, alt, 1 - clamp(k)); if (it.fill === false && !isHex(it.strokeColor) && isHex(it.color)) it.strokeColor = it.color; return; }
    const col = it.color, k1 = clamp(k), k0 = clamp(k - 0.12);
    it.gradient = up
      ? [[0, alt], [1 - k1, alt], [1 - k1, band], [1 - k0, band], [1 - k0, col], [1, col]]
      : [[0, col], [k0, col], [k0, band], [k1, band], [k1, alt], [1, alt]];
    if (it.stroke > 0 && (!it.strokeColor || it.strokeColor === col)) it.strokeColor = J.mix(alt, col, clamp(k));
  },
});

/* 厚み沈み — the line arrives as a long extruded block; the depth sinks back into the page until only the face is left */
reg('xgBlockSink', {
  name: '厚み沈み', en: 'Extrude Sink', tags: ['graphic', 'pop'], w: 1, ae: 'zoom',
  inDur: dur => clamp(dur * 0.45, 0.22, 0.8),
  apply(env, it, p) {
    const size = it.size, dir = dirOf(env, 55), ex0 = it.extrude && it.extrude.n > 0 ? it.extrude : null;
    const L = size * 1.3 * (1 - oQuart(p)) * clamp(p * 5 + 0.25);
    fade(it, p * 6);
    if (L < 0.5) return;
    const dx = dir * L * 0.72, dy = L * 0.7, n = clamp(Math.ceil(L / Math.max(1.5, size * 0.035)), 1, 26);
    const col = J.mix(hotOf(env, it), pick(env.sc.bg), 0.3);
    it.extrude = ex0
      ? Object.assign({}, ex0, { n: Math.max(ex0.n, n), dx: (ex0.dx || 0) + dx, dy: (ex0.dy || 0) + dy })
      : { n, dx, dy, color: col, fade: true, a: clamp(L / (size * 0.18)) };
  },
});

/* 色収差 — lens fringing: two coloured copies sit larger around the line and shrink onto it as the lens settles */
reg('xgLensFringe', {
  name: '色収差', en: 'Lens Fringe', tags: ['glitch', 'graphic', 'emotional'], w: 1, ae: 'zoom',
  inDur: dur => clamp(dur * 0.42, 0.2, 0.75),
  apply(env, it, p) {
    const b = box(it), k = Math.pow(1 - p, 2), a0 = clamp(it.alpha ?? 1);
    const cols = [pick(env.sc.ghostA, env.sc.accent), pick(env.sc.ghostB, env.sc.accent2, env.sc.sub)];
    sizeFrom(it, 1 + 0.05 * k, b.cx, b.cy);
    fade(it, p * 3);
    const ca = a0 * 0.75 * Math.min(1, k * 3) * clamp(p * 6);
    if (ca <= 0.01) return;
    addPre(it, (env2, x) => {
      if (env2.pass !== 'main') return;
      const bx = box(x);
      for (let j = 0; j < 2; j++) {
        const c = Object.assign({}, x);
        sizeFrom(c, 1 + (j ? 0.16 : 0.32) * k, bx.cx, bx.cy);
        copyDraw(env2, c, Object.assign({ color: cols[j], strokeColor: cols[j], alpha: ca, blur: 0 }, FLAT));
      }
    });
  },
});

/* 残像焼き — one bright flash of the line, then only a faint after-image is left, which slowly burns in to full strength */
reg('xgAfterimage', {
  name: '残像焼き', en: 'Afterimage', tags: ['emotional', 'calm', 'glitch'], w: 0.8, ae: 'flicker', minDur: 0.6,
  inDur: dur => clamp(dur * 0.55, 0.35, 1.1),
  apply(env, it, p) {
    const b = box(it), hot = hotOf(env, it), tF = 0.1;
    if (p < tF) {
      sizeFrom(it, 1.05, b.cx, b.cy);
      tint(it, hot, 0.85); fade(it, p / 0.03);
      return;
    }
    const drop = sstep(tF, tF + 0.1, p), rise = E.inOutSine(clamp((p - 0.28) / 0.72));
    sizeFrom(it, 1 + 0.05 * (1 - drop), b.cx, b.cy);
    tint(it, hot, 0.85 * (1 - drop));
    fade(it, lerp(lerp(1, 0.14, drop), 1, rise));
  },
});

/* =====================================================================
   D. HELD POSES
   ===================================================================== */

/* キーポーズ — three held drawings and the rest pose: far and tilted, big and leaning the other way, almost there, home */
reg('xgKeyPoses', {
  name: 'キーポーズ', en: 'Key Poses', tags: ['pop', 'graphic', 'glitch'], w: 0.9, ae: 'pop', minDur: 0.5,
  inDur: dur => clamp(dur * 0.45, 0.28, 0.8),
  apply(env, it, p) {
    const b = box(it), size = it.size, dir = dirOf(env, 61);
    // [until p, dx, dy, rot, scale]
    const K = [[0.26, -1.0, 0.45, -13, 0.7], [0.52, 0.34, -0.3, 8, 1.1], [0.74, -0.14, 0.08, -3.5, 0.95], [1, 0, 0, 0, 1]];
    let k = 0; while (k < 3 && p >= K[k][0]) k++;
    const t0 = k ? K[k - 1][0] : 0, f = (p - t0) / (K[k][0] - t0), c = K[k], pr = k ? K[k - 1] : null;
    const settle = k === 3 ? 0.06 * (1 - oCubic(f / 0.6)) : 0;
    rotateAbout(it, dir * c[3], b.cx, b.cy);
    sizeFrom(it, c[4] + settle, b.cx, b.cy);
    it.x += dir * size * c[1]; it.y += size * c[2];
    if (pr && f < 0.22) it.streak = { n: 3, dx: dir * size * (pr[1] - c[1]) / 4, dy: size * (pr[2] - c[2]) / 4, a: 0.4 };
    fade(it, p * 20);
  },
});

/* ラフから清書 — animator's pass: a shaky pencil outline on threes, a half-inked drawing, then the clean final line */
reg('xgRoughCut', {
  name: 'ラフから清書', en: 'Rough To Clean', tags: ['pop', 'emotional', 'editorial'], w: 0.9, ae: 'flicker', minDur: 0.55,
  inDur: dur => clamp(dur * 0.5, 0.3, 0.9),
  apply(env, it, p) {
    const b = box(it), size = it.size, seed = env.cut.seed | 0, k = Math.min(5, Math.floor(p * 6));
    if (k >= 5) return;
    const w = [1, 0.85, 0.7, 0.4, 0.22][k], col = colOf(it);
    rotateAbout(it, J.rs(seed, k, 71) * 3 * w, b.cx, b.cy);
    sizeFrom(it, 1 + J.rs(seed, k, 72) * 0.045 * w, b.cx, b.cy);
    it.x += J.rs(seed, k, 73) * size * 0.05 * w; it.y += J.rs(seed, k, 74) * size * 0.05 * w;
    it.skew = (it.skew || 0) + J.rs(seed, k, 75) * 5 * w;
    fade(it, p * 14);
    if (it.fill === false) { fade(it, [0.45, 0.6, 0.75, 0.9, 1][k]); return; }
    const pencil = J.mix(col, pick(env.sc.sub, env.sc.fg), 0.5);
    if (k < 3) {
      it.fill = false; it.extrude = null; it.shadow = null;
      it.stroke = Math.max(1, size * (0.014 + 0.006 * k)); it.strokeColor = pencil;
      it.strokeDash = k === 0 ? [size * 0.16, size * 0.07] : null;
      fade(it, [0.6, 0.8, 0.95][k]);
    } else {
      it.fillAlpha = (it.fillAlpha ?? 1) * (k === 3 ? 0.45 : 0.8);
      if (!(it.stroke > 0)) { it.stroke = Math.max(1, size * 0.02); it.strokeColor = col; }
    }
  },
});
})();
