/* JIZURA pack: exitHold — 36 exits (退場) + 20 holds (待機中の動き)
   Exits:  p 0 (rest) → 1 (fully gone).   Holds: amt 0..1 × fx.motion, subtle idle motion.
   Everything is relative to it.size / the item box and deterministic (it.seed, glyph index, env.step). */
(() => {
'use strict';
const E = J.E;
const P = 'exitHold';
const DEG = J.DEG, TAU = J.TAU;
const HIDE = Object.freeze({ hide: true });

/* ============================== helpers ============================== */
const isHex = c => typeof c === 'string' && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(c);
const mixC = (a, b, t) => { t = J.clamp(t); if (t <= 0.002) return a; if (t >= 0.998) return b; return isHex(a) && isHex(b) ? J.mix(a, b, t) : (t < 0.5 ? a : b); };
const colOf = it => it.color || '#ffffff';
const inBack = (x, s = 1.7) => { x = J.clamp(x); return x * x * ((s + 1) * x - s); };
const motionK = env => J.clamp((env.fx && env.fx.motion != null ? env.fx.motion : 0.7) / 0.7, 0, 1.6);
const isSp = ch => ch === ' ' || ch === '　';
const layOf = it => (it._m || (it._m = J.measure(it))).lay;
const box = it => { it._m = J.measure(it); return J.itemBox(it); };       // fresh (sx/sy/size may have changed)
const cutN = env => Math.max(1, J.glyphCount(String(env.cut && env.cut.text || '')));
const cutBit = (env, k) => (J.h(env.cut && env.cut.seed | 0, k, 991) & 1) === 1;   // same choice for every item of a cut
const win = (p, o, spread) => J.clamp((p - o * spread) / (1 - spread));
const rot2 = (x, y, r) => { const c = Math.cos(r), s = Math.sin(r); return [x * c - y * s, x * s + y * c]; };
const toD = (it, lx, ly) => { const [x, y] = rot2(lx, ly, (it.rot || 0) * DEG); return [it.x + x, it.y + y]; };
/* design-space direction vectors expressed in item space (so charFn offsets move along screen axes) */
const downI = it => { const r = (it.rot || 0) * DEG; return [Math.sin(r), Math.cos(r)]; };

/* sequential order 0..1 of glyph i; single-glyph items (mixed / scatter layouts) use their mi within the cut */
function orderOf(env, it) {
  const N = cutN(env), mi = +it.mi || 0;
  return (i, n) => (n > 1 ? i / (n - 1) : N > 1 ? J.clamp(mi / (N - 1)) : 0);
}

/* merge per-glyph functions keeping every field drawItem understands (core combineChar drops clip/skew/blur/outline) */
function merged(fns) {
  return (i, g, n) => {
    let o = null;
    for (let k = 0; k < fns.length; k++) {
      const r = fns[k](i, g, n);
      if (!r) continue;
      if (r.hide) return HIDE;
      if (!o) o = { dx: 0, dy: 0, rot: 0, s: 1, a: 1 };
      if (r.dx) o.dx += r.dx; if (r.dy) o.dy += r.dy; if (r.rot) o.rot += r.rot;
      if (r.s != null) o.s *= r.s; if (r.a != null) o.a *= r.a;
      if (r.sx != null) o.sx = (o.sx == null ? 1 : o.sx) * r.sx;
      if (r.sy != null) o.sy = (o.sy == null ? 1 : o.sy) * r.sy;
      if (r.skew) o.skew = (o.skew || 0) + r.skew;
      if (r.blur) o.blur = (o.blur || 0) + r.blur;
      if (r.outline) o.outline = true;
      if (r.ch) o.ch = r.ch;
      if (r.color) o.color = r.color;
      if (r.clipX) o.clipX = o.clipX ? [Math.max(o.clipX[0], r.clipX[0]), Math.min(o.clipX[1], r.clipX[1])] : r.clipX;
      if (r.clipY) o.clipY = o.clipY ? [Math.max(o.clipY[0], r.clipY[0]), Math.min(o.clipY[1], r.clipY[1])] : r.clipY;
    }
    if (!o) return null;
    if (o.a <= 0.003 || Math.abs(o.s) < 0.004) return HIDE;
    if (o.sx != null && Math.abs(o.sx) < 0.004) return HIDE;
    if (o.sy != null && Math.abs(o.sy) < 0.004) return HIDE;
    if ((o.clipX && o.clipX[1] <= o.clipX[0]) || (o.clipY && o.clipY[1] <= o.clipY[0])) return HIDE;
    return o;
  };
}
/* push a glyph fn, folding the item's earlier fns into one full-field function */
function addC(it, fn) {
  if (!it.charFns) it.charFns = [];
  const prev = it.charFns.splice(0); prev.push(fn);
  it.charFns.push(merged(prev));
}
function chainPost(it, fn) { const p0 = it.post; it.post = (env, it2, bb) => { if (p0) p0(env, it2, bb); fn(env, it2, bb); }; }
function chainPre(it, fn) { const p0 = it.pre; it.pre = (env, it2) => { if (p0) p0(env, it2); fn(env, it2); }; }
/* main draw uses mainFn; each copyFn draws an extra copy of the item (after the main one) */
function withCopies(it, mainFn, copyFns, extra) {
  if (!it.charFns) it.charFns = [];
  const prev = it.charFns.slice();
  const cfs = copyFns.map(f => merged(prev.concat([f])));
  addC(it, mainFn);
  chainPost(it, (env, it2) => {
    for (const cf of cfs) {
      const c = Object.assign({}, it2, { charFn: cf, pieceFn: null, pre: null, post: null, streak: null, echo: null }, extra || null);
      J.drawItem(env, c);
    }
  });
}
/* draw in the item's own (rotated) space */
function inItem(env, it, fn) {
  const ctx = env.ctx; ctx.save(); ctx.translate(it.x, it.y); if (it.rot) ctx.rotate(it.rot * DEG);
  try { fn(ctx); } finally { ctx.restore(); }
}
/* per-line (per-column when vertical) extents in item space */
function lineExt(it) {
  const lay = J.layoutText(it), sx = it.sx || 1, sy = it.sy || 1, out = [];
  for (const g of lay) {
    if (isSp(g.ch)) continue;
    const L = out[g.li] || (out[g.li] = { li: g.li, x0: 1e9, x1: -1e9, y0: 1e9, y1: -1e9 });
    const hw = (it.vertical ? it.size : g.w) / 2, hh = (it.vertical ? g.h : it.size) / 2;
    L.x0 = Math.min(L.x0, (g.x - hw) * sx); L.x1 = Math.max(L.x1, (g.x + hw) * sx);
    L.y0 = Math.min(L.y0, (g.y - hh) * sy); L.y1 = Math.max(L.y1, (g.y + hh) * sy);
  }
  return out.filter(Boolean);
}
/* rotated item box → design-space AABB (+pad) */
function dBox(it, pad = 0) {
  const b = box(it);
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const [px, py] of [[b.x0, b.y0], [b.x1, b.y0], [b.x0, b.y1], [b.x1, b.y1]]) {
    const [X, Y] = toD(it, px - it.x, py - it.y);
    x0 = Math.min(x0, X); x1 = Math.max(x1, X); y0 = Math.min(y0, Y); y1 = Math.max(y1, Y);
  }
  const sk = Math.abs(Math.tan((it.skew || 0) * DEG)) * b.h * 0.5;
  return { x0: x0 - pad - sk, y0: y0 - pad, x1: x1 + pad + sk, y1: y1 + pad, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
}
/* scale sx/sy about an anchor given in item space (default: box centre) */
function scaleAbout(it, kx, ky, ax, ay) {
  if (ax == null) { const b = box(it); ax = b.cx - it.x; ay = b.cy - it.y; }
  const [dx, dy] = rot2(ax * (1 - kx), ay * (1 - ky), (it.rot || 0) * DEG);
  it.x += dx; it.y += dy; it.sx = (it.sx || 1) * kx; it.sy = (it.sy || 1) * ky; it._m = null;
}
/* scale font size about the box centre (positions, tracking and glyphs all follow) */
function sizeAbout(it, k) {
  const b = box(it), ax = b.cx - it.x, ay = b.cy - it.y;
  const [dx, dy] = rot2(ax * (1 - k), ay * (1 - k), (it.rot || 0) * DEG);
  it.x += dx; it.y += dy; it.size *= k; it._m = null;
}
function rotateAbout(it, deg, ax, ay) {
  const r0 = (it.rot || 0) * DEG, r1 = r0 + deg * DEG;
  const [x0, y0] = rot2(ax, ay, r0), [x1, y1] = rot2(ax, ay, r1);
  it.x += x0 - x1; it.y += y0 - y1; it.rot = (it.rot || 0) + deg;
}
/* per-glyph clip window that stays fixed in item space while the glyph is offset by (dx, dy) item px
   (kx, ky: extra glyph scale applied by the same charFn) */
function winShift(g, it, dx, dy, kx = 1, ky = 1) {
  const sx = it.sx || 1, sy = it.sy || 1, mx = dx ? 0.66 : 1.6, my = dy ? 0.66 : 1.6;
  if (!g.r90) {
    const fx = dx / (g.w * sx), fy = dy / (g.h * sy);
    return { clipX: [(-mx - fx) / kx, (mx - fx) / kx], clipY: [(-my - fy) / ky, (my - fy) / ky] };
  }
  // glyph rotated 90° (vertical text): local x runs along item +y (scaled by sx), local y along item −x (scaled by sy)
  const My = my * g.h * sx, Mx = mx * g.w * sy;
  return { clipX: [(-My - dy) / (sx * kx * g.w), (My - dy) / (sx * kx * g.w)], clipY: [(-Mx + dx) / (sy * ky * g.h), (Mx + dx) / (sy * ky * g.h)] };
}
const beatLen = (env, fb) => (env.beat && env.beat.len ? env.beat.len : fb);
const beatSince = (env, fb) => (env.beat ? env.beat.since : ((env.ltb % fb) + fb) % fb);
const beatIdx = (env, fb) => (env.beat ? env.beat.index : Math.floor(env.ltb / fb));

const POOL = '※◆◇■□▲△▼●○◎＃＊＋×÷＝≠∞§†01／＼＜＞';

/* ============================== EXITS ============================== */
const X = {};

/* ---- masks ---- */
X.sinkMask = {
  name: '沈む', tags: ['calm', 'editorial', 'graphic'], w: 1,
  apply(env, it, p) {
    const ord = orderOf(env, it), sy = it.sy || 1;
    addC(it, (i, g, n) => {
      const q = win(p, ord(i, n), 0.5);
      if (q <= 0) return null;
      if (q >= 1) return HIDE;
      const d = (E.inOutCubic(q) - 0.06 * Math.sin(Math.PI * J.clamp(q / 0.3))) * g.h * sy * 1.4;   // tiny lift, then sinks below its own baseline
      return Object.assign({ dy: d }, winShift(g, it, 0, d));
    });
  },
};

X.riseOut = {
  name: '上へ抜ける', tags: ['calm', 'emotional', 'editorial'], w: 1,
  apply(env, it, p) {
    const seed = it.seed | 0, sy = it.sy || 1;
    addC(it, (i, g) => {
      const q = win(p, J.r(seed, i, 201), 0.5);
      if (q <= 0) return null;
      if (q >= 1) return HIDE;
      const d = -Math.pow(q, 2.2) * g.h * sy * 1.5;
      const st = 1 + 0.5 * Math.sin(Math.PI * q) * q;       // speed stretch while leaving
      return Object.assign({ dy: d, sy: st, sx: 1 - 0.1 * (st - 1) }, winShift(g, it, 0, d, 1, st));
    });
  },
};

/* ---- slides ---- */
function slideOut(dir, name) {
  return {
    name, tags: ['pop', 'graphic'], w: 0.8,
    apply(env, it, p) {
      const ord = orderOf(env, it), b = box(it), dist = env.W + b.w + it.size * 1.5, sz = it.size;
      addC(it, (i, g, n) => {
        const o = dir < 0 ? ord(i, n) : 1 - ord(i, n);     // the leading edge leaves first
        const q = win(p, o, 0.5);
        if (q <= 0) return null;
        const wind = q < 0.24 ? Math.sin(q / 0.24 * Math.PI) * sz * 0.07 : 0;
        const u = J.clamp((q - 0.1) / 0.9), v = 3 * u * u;
        return { dx: dir * (dist * u * u * u - wind), sx: 1 + Math.min(1.3, v * 0.45), sy: 1 - Math.min(0.28, v * 0.09), skew: -dir * Math.min(22, v * 8), a: 1 - J.smooth(0.82, 1, q) };
      });
    },
  };
}
X.slideOutL = slideOut(-1, '左へ流れる');
X.slideOutR = slideOut(1, '右へ流れる');

/* ---- flips / folds ---- */
X.flipOutX = {
  name: '扉が閉まる', tags: ['graphic', 'pop', 'editorial'], w: 1,
  apply(env, it, p) {
    const ord = orderOf(env, it), sx0 = it.sx || 1, c0 = colOf(it), bg = env.sc.bg;
    const dir = cutBit(env, 1) ? 1 : -1;                      // hinge side
    addC(it, (i, g, n) => {
      const q = win(p, ord(i, n), 0.5);
      if (q <= 0) return null;
      if (q >= 1) return HIDE;
      const th = E.inQuad(q) * Math.PI / 2, c = Math.cos(th), s = Math.sin(th);
      return { sx: c, sy: 1 + 0.14 * s, dx: dir * (1 - c) * g.w * sx0 * 0.5, color: mixC(c0, bg, s * 0.55), a: 1 - J.smooth(0.8, 1, q) };
    });
  },
};

X.flipOutY = {
  name: 'パタン倒れ', tags: ['pop', 'graphic'], w: 0.9,
  apply(env, it, p) {
    const seed = it.seed | 0, sy0 = it.sy || 1, c0 = colOf(it), bg = env.sc.bg;
    addC(it, (i, g) => {
      const q = win(p, J.r(seed, i, 211), 0.5);
      if (q <= 0) return null;
      if (q >= 1) return HIDE;
      const th = E.inQuad(q) * Math.PI / 2, c = Math.cos(th), s = Math.sin(th);
      // hinge on the bottom edge: falls backwards flat onto its baseline
      return { sy: c, sx: 1 - 0.12 * s, dy: (1 - c) * g.h * sy0 * 0.5, color: mixC(c0, bg, s * 0.6) };
    });
  },
};

X.foldOut = {
  name: '折り畳み', tags: ['graphic', 'editorial'], w: 0.9,
  outDur: dur => J.clamp(dur * 0.34, 0.28, 0.65),
  apply(env, it, p) {
    const ord = orderOf(env, it), back = mixC(colOf(it), env.sc.accent, 0.75);
    const Q = (i, n) => win(p, ord(i, n), 0.3);
    const bottom = (i, g, n) => {
      const q = Q(i, n);
      if (q >= 1) return HIDE;
      const b = J.clamp((q - 0.5) / 0.5);
      return { clipY: [0, 1.2], sy: Math.cos(E.inQuad(b) * Math.PI / 2), a: 1 - J.smooth(0.85, 1, q) };
    };
    const top = (i, g, n) => {
      const q = Q(i, n);
      if (q >= 1) return HIDE;
      const a = E.inOutSine(J.clamp(q / 0.5)), b = J.clamp((q - 0.5) / 0.5);
      const sy = Math.cos(a * Math.PI) * Math.cos(E.inQuad(b) * Math.PI / 2);   // 1 → −1 (folded down) → 0
      return { clipY: [-1.2, 0.012], sy, color: sy < 0 ? back : undefined, a: 1 - J.smooth(0.85, 1, q) };
    };
    withCopies(it, bottom, [top]);
  },
};

X.squash = {
  name: '潰れる', tags: ['glitch', 'pop', 'graphic'], w: 0.9,
  apply(env, it, p) {
    const b0 = box(it), sz = it.size, col = colOf(it);
    const N = cutN(env), single = layOf(it).N === 1 && N > 1;
    const a1 = J.clamp(p / 0.42), a2 = J.clamp((p - 0.4) / 0.45);
    const ky = 1 - 0.97 * E.inCubic(a1);
    const kx = (1 + 0.08 * E.outCubic(a1)) * (1 - E.inOutCubic(a2));
    if (single) {                                             // one glyph per item: the whole line collapses to the centre
      it.x = J.lerp(it.x, env.W / 2, E.inOutCubic(a2));
      scaleAbout(it, 1 + 0.08 * E.outCubic(a1), ky);
      it.alpha = (it.alpha ?? 1) * (1 - J.smooth(0.7, 0.9, p));
    } else if (kx > 0.01) scaleAbout(it, kx, ky);
    else it.alpha = 0;
    // CRT-off: the collapsed line leaves a bright dot that fades
    const c = single ? [env.W / 2, it.y] : toD(it, b0.cx - it.x, b0.cy - it.y);
    const dotA = J.smooth(0.6, 0.8, p) * (1 - J.smooth(0.88, 1, p));
    if (dotA > 0.01 && (!single || Math.round(+it.mi || 0) === Math.floor((N - 1) / 2))) {
      const r = sz * 0.08;
      chainPost(it, (env2) => {
        env2.circle(c[0], c[1], r, col, null, 0, dotA, true);
        env2.rect(c[0] - r * 5 * (1 - a2 * 0.5), c[1] - r * 0.12, r * 10 * (1 - a2 * 0.5), r * 0.24, col, dotA * 0.8, false);
      });
    }
  },
};

X.trackOutWide = {
  name: '字間が開く', tags: ['calm', 'emotional', 'editorial'], w: 1,
  apply(env, it, p) {
    const b = box(it), ox = b.cx - it.x, oy = b.cy - it.y, sx = it.sx || 1, sy = it.sy || 1, vert = !!it.vertical;
    const k = E.inQuad(p) * 1.6 + p * 0.3, thin = 1 - 0.6 * E.inQuad(p);
    addC(it, (i, g) => (vert ? { dy: (g.y * sy - oy) * k, sy: thin } : { dx: (g.x * sx - ox) * k, sx: thin }));
    if (layOf(it).N === 1 && cutN(env) > 1) {                // single-glyph items drift apart from the screen centre
      it.x += (it.x - env.W / 2) * k * 0.7; it.y += (it.y - env.H / 2) * k * 0.4;
    }
    it.alpha = (it.alpha ?? 1) * (1 - J.smooth(0.2, 1, p));
    if (env.pass === 'main') it.blur = (it.blur || 0) + Math.min(E.inQuad(p) * it.size * 0.035, Math.min(env.W, env.H) * 0.012);
  },
};

X.collapse = {
  name: '吸い込み', tags: ['pop', 'graphic'], w: 0.9,
  apply(env, it, p) {
    const dir = cutBit(env, 2) ? 1 : -1;
    const r = 1 - E.inQuad(p), turn = dir * E.inQuad(p) * DEG, sc = Math.max(0.02, 1 - E.inQuad(p) * 0.94);
    // differential rotation (inner parts turn faster) draws a spiral into the centre
    const spiral = (px, py, R) => { const phi = turn * (140 + 220 * (1 - J.clamp(Math.hypot(px, py) / R))), c = Math.cos(phi), s = Math.sin(phi); return [(px * c - py * s) * r, (px * s + py * c) * r, phi]; };
    if (layOf(it).N === 1 && cutN(env) > 1) {                // spiral whole single-glyph items into the screen centre
      const px = it.x - env.W / 2, py = it.y - env.H / 2, [nx, ny, phi] = spiral(px, py, Math.max(env.W, env.H) * 0.5);
      it.x = env.W / 2 + nx; it.y = env.H / 2 + ny; it.rot = (it.rot || 0) + phi / DEG;
      it.size *= sc; it._m = null;
    } else {
      const b = box(it), ox = b.cx - it.x, oy = b.cy - it.y, sx = it.sx || 1, sy = it.sy || 1, R = Math.max(1, Math.hypot(b.w, b.h) * 0.5);
      addC(it, (i, g) => {
        const px = g.x * sx - ox, py = g.y * sy - oy, [nx, ny, phi] = spiral(px, py, R);
        return { dx: nx - px, dy: ny - py, rot: phi / DEG, s: sc };
      });
    }
    it.alpha = (it.alpha ?? 1) * (1 - J.smooth(0.8, 1, p));
  },
};

X.zoomThrough = {
  name: '手前へ抜ける', tags: ['emotional', 'pop'], w: 1,
  apply(env, it, p) {
    const sz0 = it.size, single = layOf(it).N === 1 && cutN(env) > 1;
    const maxK = Math.max(1.3, Math.max(env.W, env.H) * (single ? 0.8 : 1.6) / Math.max(1, sz0));
    const k = Math.min(maxK, 1 + 4.5 * E.inCubic(p) + 0.25 * p);
    if (single) { const kk = 1 + 4.5 * E.inCubic(p) + 0.25 * p; it.x = env.W / 2 + (it.x - env.W / 2) * kk; it.y = env.H / 2 + (it.y - env.H / 2) * kk; }
    sizeAbout(it, k);
    const a = 1 - J.smooth(0.3, 0.88, p);
    it.alpha = (it.alpha ?? 1) * a;
    if (a > 0.01) it.echo = { n: 3, dx: 0, dy: 0, scale: 0.84, a: 0.45 * J.smooth(0, 0.25, p), decay: 0.62 };
  },
};

X.zoomFar = {
  name: '奥へ遠ざかる', tags: ['emotional', 'calm'], w: 1,
  apply(env, it, p) {
    const sz0 = it.size, e = 1 - Math.pow(1 - p, 2.6);      // fast recede, slow settle
    sizeAbout(it, 1 - 0.9 * e);
    if (layOf(it).N === 1 && cutN(env) > 1) { it.x = J.lerp(it.x, env.W / 2, e * 0.85); it.y = J.lerp(it.y, env.H / 2, e * 0.85); }
    it.y -= sz0 * 0.35 * e;                                   // towards a vanishing point above
    it.alpha = (it.alpha ?? 1) * (1 - J.smooth(0.5, 1, p));
    it.echo = { n: 3, dx: 0, dy: sz0 * 0.06 * e, scale: 1.2, a: 0.6 * J.smooth(0, 0.2, p), decay: 0.62, outline: true };
  },
};

X.spinOut = {
  name: '回って消える', tags: ['pop'], w: 0.9,
  apply(env, it, p) {
    const ord = orderOf(env, it), dir = cutBit(env, 3) ? 1 : -1, sy = it.sy || 1;
    addC(it, (i, g, n) => {
      const q = win(p, ord(i, n), 0.45);
      if (q <= 0) return null;
      if (q >= 1) return HIDE;
      const e = E.inCubic(q);
      return { rot: dir * (i % 2 ? 1 : 0.8) * 250 * E.inQuad(q), s: Math.max(0.01, 1 - e), dy: -Math.sin(Math.PI * q) * g.h * sy * 0.18, a: 1 - J.smooth(0.8, 1, q) };
    });
  },
};

X.twist = {
  name: 'ねじれ', tags: ['pop', 'graphic'], w: 0.8,
  apply(env, it, p) {
    const ord = orderOf(env, it), vert = !!it.vertical, back = mixC(colOf(it), env.sc.bg, 0.5);
    const flat = 1 - E.inQuad(J.clamp((p - 0.55) / 0.45));  // the ribbon finally goes edge-on
    const e = Math.pow(p, 1.3);
    addC(it, (i, g, n) => {
      const th = e * (0.5 + 2 * ord(i, n)) * Math.PI;       // phase gradient along the reading axis = ribbon twist
      const c = Math.cos(th) * flat, r = { color: c < 0 ? back : undefined, skew: vert ? 0 : Math.sin(th) * 12 * flat };
      if (vert) r.sx = c; else r.sy = c;
      return r;
    });
    it.alpha = (it.alpha ?? 1) * (1 - J.smooth(0.9, 1, p));
  },
};

X.waveOut = {
  name: '波で崩れる', tags: ['pop', 'emotional'], w: 0.9,
  apply(env, it, p) {
    const ord = orderOf(env, it), sz = it.size;
    addC(it, (i, g, n) => {
      const q = win(p, ord(i, n), 0.55);
      if (q <= 0) return null;
      if (q >= 1) return HIDE;
      const A = sz * 0.42;
      return { dy: -Math.sin(q * Math.PI) * A + q * q * A * 2.6, dx: q * A * 0.6, rot: Math.sin(q * Math.PI * 1.5) * 28 + q * 30, a: 1 - J.smooth(0.45, 1, q) };
    });
  },
};

X.blurOutStagger = {
  name: '字ごとボケ', tags: ['calm', 'emotional'], w: 1,
  apply(env, it, p) {
    const ord = orderOf(env, it), sz = it.size, bmax = env.pass === 'main' ? Math.min(sz * 0.09, Math.min(env.W, env.H) * 0.02) : 0;   // blur only on the main pass (ghosts just fade)
    addC(it, (i, g, n) => {
      const q = win(p, ord(i, n), 0.55);
      if (q <= 0) return null;
      if (q >= 1) return HIDE;
      const e = E.inOutSine(q);
      return { blur: e * bmax, a: 1 - q, dy: -e * sz * 0.12, s: 1 + e * 0.22 };
    });
  },
};

/* ---- line work ---- */
X.undraw = {
  name: '線に戻る', tags: ['editorial', 'calm', 'graphic'], w: 1,
  outDur: dur => J.clamp(dur * 0.36, 0.25, 0.7),
  apply(env, it, p) {
    const a = J.clamp(p / 0.3), b = J.clamp((p - 0.24) / 0.76);
    it.stroke = Math.max(it.stroke || 0, it.size * 0.022);
    if (!it.strokeColor) it.strokeColor = colOf(it);
    it.fillAlpha = (it.fillAlpha ?? 1) * (1 - E.inOutSine(a));
    if (b > 0) it.dash = Math.max(0.002, 1 - E.inOutSine(b));
    it.alpha = (it.alpha ?? 1) * (1 - J.smooth(0.9, 1, p));
  },
};

X.outlineOut = {
  name: '塗りが抜ける', tags: ['graphic', 'emotional'], w: 0.9,
  apply(env, it, p) {
    const ord = orderOf(env, it), lw = Math.max(1, it.size * 0.024), acc = env.sc.accent;
    const Q = (i, n) => win(p, ord(i, n), 0.35);
    const fill = (i, g, n) => {
      const q = Q(i, n);
      if (q <= 0) return null;
      const k = E.inOutSine(J.clamp(q / 0.7));
      if (k >= 0.999) return HIDE;
      return { clipY: [-0.72 + 1.44 * k, 1.2] };             // the fill drains away, level falling from the top
    };
    const line = (i, g, n) => {
      const q = Q(i, n);
      if (q <= 0 || q >= 1) return HIDE;
      const u = J.clamp((q - 0.68) / 0.32);
      return { outline: true, s: 1 + 0.3 * E.outCubic(u), a: Math.min(1, q * 8) * (1 - u) };
    };
    withCopies(it, fill, [line], { stroke: lw, strokeColor: acc, fill: true });
  },
};

/* ---- clip shapes ---- */
X.irisClose = {
  name: 'アイリス', tags: ['graphic', 'pop', 'editorial'], w: 1,
  apply(env, it, p) {
    const b = box(it), c = toD(it, b.cx - it.x, b.cy - it.y);
    const R0 = Math.hypot(b.w, b.h) * 0.5 + it.size * 0.12;
    const r = R0 * (1 - E.inOutCubic(p));
    if (r < 0.5) { it.alpha = 0; return; }
    it.clipFn = (ctx) => { ctx.moveTo(c[0] + r, c[1]); ctx.arc(c[0], c[1], r, 0, TAU); };
    const lw = Math.max(1.5, it.size * 0.035), acc = env.sc.accent, a = Math.min(1, p * 6) * (1 - J.smooth(0.9, 1, p));
    chainPost(it, (env2) => env2.circle(c[0], c[1], r + lw * 0.5, null, acc, lw, a, false));
  },
};

X.diagWipeOut = {
  name: '斜めワイプ', tags: ['graphic', 'editorial'], w: 1,
  apply(env, it, p) {
    // one screen-wide diagonal edge per cut (direction from the cut seed), so every item of the cut is wiped by the same line
    const bb = dBox(it, it.size * 0.15), v = (J.h(env.cut.seed | 0, 77) >>> 3) & 3, W = env.W, H = env.H;
    const ang = [22, -22, 158, 202][v] * DEG, d = [Math.cos(ang), Math.sin(ang)], t = [-d[1], d[0]];
    const cs = [[bb.x0, bb.y0], [bb.x1, bb.y0], [bb.x0, bb.y1], [bb.x1, bb.y1], [0, 0], [W, 0], [0, H], [W, H]];
    const us = cs.map(q => q[0] * d[0] + q[1] * d[1]), ws = cs.slice(4).map(q => q[0] * t[0] + q[1] * t[1]);
    const u0 = Math.min(...us), u1 = Math.max(...us), w0 = Math.min(...ws), w1 = Math.max(...ws);
    const th = Math.max(2, Math.min(W, H) * 0.011);
    const s = J.lerp(u0 - th, u1 + th, E.inOutCubic(p));
    if (p >= 0.999) { it.alpha = 0; return; }
    const L = (W + H) * 3;
    const pt = (u, w) => [d[0] * u + t[0] * w, d[1] * u + t[1] * w];
    it.clipFn = (ctx) => { const a = pt(s, w0 - L), b2 = pt(s, w1 + L), c = pt(s + L, w1 + L), e = pt(s + L, w0 - L); ctx.moveTo(a[0], a[1]); ctx.lineTo(b2[0], b2[1]); ctx.lineTo(c[0], c[1]); ctx.lineTo(e[0], e[1]); ctx.closePath(); };
    if (Math.abs(+it.mi || 0) < 1e-6) {                        // the bar is drawn once (by the first item)
      const acc = env.sc.accent, pad = Math.max(W, H) * 0.1;
      chainPost(it, (env2) => env2.poly([pt(s - th, w0 - pad), pt(s, w0 - pad), pt(s, w1 + pad), pt(s - th, w1 + pad)], acc, 1, false));
    }
  },
};

X.blindsClose = {
  name: 'ブラインド', tags: ['graphic', 'editorial'], w: 0.9,
  apply(env, it, p) {
    const bb = dBox(it, it.size * 0.2), vert = !!it.vertical;
    const span = vert ? bb.x1 - bb.x0 : bb.y1 - bb.y0;
    const cnt = J.clamp(Math.ceil(span / Math.max(4, it.size * 0.26)), 2, 90), pitch = span / cnt;
    const hs = [];
    let any = false;
    for (let j = 0; j < cnt; j++) { const h = pitch * (1 - Math.pow(win(p, cnt > 1 ? j / (cnt - 1) : 0, 0.4), 0.85)); hs.push(h); if (h > 0.05) any = true; }
    if (!any) { it.alpha = 0; return; }
    it.clipFn = (ctx) => {
      for (let j = 0; j < cnt; j++) {
        const h = hs[j]; if (h <= 0.05) continue;
        if (vert) ctx.rect(bb.x0 + j * pitch + (pitch - h) / 2, bb.y0, h, bb.y1 - bb.y0);
        else ctx.rect(bb.x0, bb.y0 + j * pitch + (pitch - h) / 2, bb.x1 - bb.x0, h);
      }
    };
  },
};

X.checkerOut = {
  name: '市松', tags: ['graphic', 'glitch'], w: 0.8,
  apply(env, it, p) {
    const bb = dBox(it, it.size * 0.15), w = bb.x1 - bb.x0, h = bb.y1 - bb.y0;
    let cell = Math.max(4, it.size * 0.26);
    while ((w / cell) * (h / cell) > 420) cell *= 1.25;
    const nx = Math.ceil(w / cell), ny = Math.ceil(h / cell), dg = Math.max(1, nx + ny - 2);
    const rs = [];
    let any = false;
    for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++) {
      const st = ((x + y) & 1) * 0.42 + (x + y) / dg * 0.3;
      const k = 1 - E.inQuad(J.clamp((p - st) / 0.28));
      if (k > 0.02) { any = true; rs.push([bb.x0 + (x + 0.5) * cell, bb.y0 + (y + 0.5) * cell, cell * k + (k > 0.98 ? 0.8 : 0)]); }
    }
    if (!any) { it.alpha = 0; return; }
    it.clipFn = (ctx) => { for (const [cx, cy, s] of rs) ctx.rect(cx - s / 2, cy - s / 2, s, s); };
  },
};

/* ---- splits / slices ---- */
X.splitApart = {
  name: '上下に割れる', tags: ['graphic', 'pop'], w: 1,
  apply(env, it, p) {
    const vert = !!it.vertical, sz = it.size;
    const crack = J.clamp(p / 0.2), u = J.clamp((p - 0.16) / 0.84), e = E.outCubic(u);
    const off = crack * sz * 0.03 + sz * 0.75 * e;          // hairline crack, then the halves spring apart
    const a = 1 - J.smooth(0.35, 1, u), sq = 1 - 0.35 * e;
    const half = sgn => () => (vert
      ? { clipX: sgn < 0 ? [-1.6, 0.012] : [0, 1.6], dx: sgn * off, dy: sgn * off * 0.3, sx: sq, a }
      : { clipY: sgn < 0 ? [-1.6, 0.012] : [0, 1.6], dy: sgn * off, dx: sgn * off * 0.3, sy: sq, a });
    withCopies(it, half(-1), [half(1)]);
    const fl = J.clamp(p / 0.2) * (1 - J.smooth(0.55, 1, p));
    if (fl > 0.02) {
      const lines = lineExt(it), acc = env.sc.accent, lw = Math.max(1.5, sz * (0.02 + 0.05 * e)), pad = sz * (0.15 + 0.5 * e);
      chainPost(it, (env2, it2) => inItem(env2, it2, () => {
        for (const L of lines) {
          if (vert) { const x = (L.x0 + L.x1) / 2; env2.rect(x - lw / 2, L.y0 - pad, lw, L.y1 - L.y0 + pad * 2, acc, fl, false); }
          else { const y = (L.y0 + L.y1) / 2; env2.rect(L.x0 - pad, y - lw / 2, L.x1 - L.x0 + pad * 2, lw, acc, fl, false); }
        }
      }));
    }
  },
};

X.vSliceDrop = {
  name: '縦スライス落下', tags: ['graphic', 'glitch'], w: 0.9,
  outDur: dur => J.clamp(dur * 0.34, 0.25, 0.62),
  apply(env, it, p) {
    const bb = dBox(it, it.size * 0.35), seed = it.seed | 0, w = bb.x1 - bb.x0;
    const n = J.clamp(Math.round(w / (it.size * 0.24)), 4, 14);
    const D = env.H - bb.y0 + it.size;
    const out = [];
    for (let k = 0; k < n; k++) {
      const d0 = J.r(seed, k, 301) * 0.45, q = J.clamp((p - d0) / 0.55);
      const dy = (q * q * 1.05 - Math.sin(Math.PI * J.clamp(q / 0.25)) * 0.012) * D;
      out.push([bb.x0 + k * w / n, bb.x0 + (k + 1) * w / n + 0.6, dy]);
    }
    it.vbands = out;
    it.alpha = (it.alpha ?? 1) * (1 - J.smooth(0.95, 1, p));
  },
};

X.melt = {
  name: '溶ける', tags: ['emotional', 'glitch'], w: 0.8,
  outDur: dur => J.clamp(dur * 0.4, 0.3, 0.8), minDur: 0.9,
  apply(env, it, p) {
    const b0 = box(it), seed = it.seed | 0, sz = it.size;
    scaleAbout(it, 1 - 0.05 * p, 1 + 0.8 * E.inQuad(p), b0.cx - it.x, b0.y0 - it.y);   // stretch down, anchored at the top
    const bb = dBox(it, sz * 0.35), w = bb.x1 - bb.x0;
    const n = J.clamp(Math.round(w / (sz * (layOf(it).N === 1 ? 0.3 : 0.15))), 4, 16), e = E.inQuad(p);
    const out = [];
    for (let k = 0; k < n; k++) {
      const drip = 0.5 + 0.5 * J.noise1(k * 0.6, seed), spike = J.r(seed, k, 311) < 0.3 ? J.r(seed, k, 312) : 0;
      out.push([bb.x0 + k * w / n, bb.x0 + (k + 1) * w / n + 0.6, e * sz * (0.1 + 1.3 * drip + 1.1 * spike)]);
    }
    it.vbands = out;
    it.color = mixC(colOf(it), env.sc.accent, J.smooth(0.3, 0.9, p) * 0.45);
    it.alpha = (it.alpha ?? 1) * (1 - J.smooth(0.55, 1, p));
  },
};

/* ---- dissolves ---- */
X.dissolve = {
  name: 'ほろほろ', tags: ['calm', 'emotional'], w: 0.9, pieces: true,
  apply(env, it, p) {
    const seed = it.seed | 0, sz = it.size, b = dBox(it, 0), bw = Math.max(1, b.x1 - b.x0);
    it.shatter = true;
    it.pieceFns.push((ci, pj, pc, ox) => {
      const t0 = J.r(seed, ci, pj, 71) * 0.5 + J.clamp((ox + it.x - b.x0) / bw) * 0.25;   // random + a soft left→right sweep
      const x = (p - t0) / 0.25;
      if (x <= 0) return J.PID;
      if (x >= 1) return null;
      return J.PT(0, -x * sz * 0.05, 0, 1 + 0.3 * x, 1, 0, 1 - x);
    });
    if (it.gradient || it.fill === false || it.dash != null || it.pattern) {   // no pieces possible: glyph-level fallback
      const step = env.step;
      addC(it, (i) => { const t0 = J.r(seed, i, 72) * 0.7; return p > t0 + 0.3 ? HIDE : p > t0 && J.r(seed, step, i, 73) < (p - t0) / 0.3 ? HIDE : null; });
    }
  },
};

X.backspace = {
  name: 'バックスペース', tags: ['editorial', 'glitch'], w: 0.8, cursor: true, minDur: 0.9,
  outDur: (dur, n) => J.clamp(0.2 + n * 0.035, 0.3, Math.max(0.3, Math.min(0.9, dur * 0.45))),
  apply(env, it, p) {
    const lay = layOf(it), n = lay.N; if (!n) return;
    const N = cutN(env), single = n === 1 && N > 1;
    const sel = !single && (J.h(env.cut.seed | 0, 601) & 1) === 1;
    const acc = env.sc.accent, bg = env.sc.bg, sz = it.size, sx = it.sx || 1, sy = it.sy || 1, vert = !!it.vertical;
    const blink = Math.floor(env.ltb * 5) % 2 === 0;
    const cw = Math.max(2, sz * 0.07);
    const cursorAfter = (g) => (vert ? [g.x * sx - sz * sx * 0.48, (g.y + g.h / 2) * sy + sz * 0.05, sz * sx * 0.96, cw]
      : [(g.x + g.w / 2) * sx + sz * 0.05, g.y * sy - sz * sy * 0.5, cw, sz * sy]);
    const cursorBefore = (g) => (vert ? [g.x * sx - sz * sx * 0.48, (g.y - g.h / 2) * sy - sz * 0.05 - cw, sz * sx * 0.96, cw]
      : [(g.x - g.w / 2) * sx - sz * 0.05 - cw, g.y * sy - sz * sy * 0.5, cw, sz * sy]);
    const drawCur = r => chainPost(it, (env2, it2) => inItem(env2, it2, () => env2.rect(r[0], r[1], r[2], r[3], acc, 1, false)));
    if (single) {
      const j = J.clamp(Math.round(+it.mi || 0), 0, N - 1), del = Math.pow(J.clamp((p - 0.1) / 0.8), 1.3);
      const tj = (N - 1 - j) / N, g = lay[0];
      if (del > tj) addC(it, () => HIDE);
      let cur = null;
      if (p < 0.94) {
        if (j === N - 1 && del <= 0) cur = blink ? cursorAfter(g) : null;
        else if (del > tj && (j === 0 || del <= tj + 1 / N)) cur = (j === 0 && del >= 1 && !blink) ? null : cursorBefore(g);
      }
      if (cur) drawCur(cur);
      return;
    }
    const vis = lay.filter(g => !isSp(g.ch));
    if (!vis.length) return;
    if (sel) {
      // select-all from the end (shift+←), then delete in one stroke
      const s = Math.ceil(vis.length * E.outQuad(J.clamp(p / 0.42)));
      const from = vis.length - s;
      if (p >= 0.55) addC(it, () => HIDE);
      else if (s > 0) {
        const selIdx = new Set(vis.slice(from).map(g => g.i));
        chainPre(it, (env2, it2) => inItem(env2, it2, () => {
          for (const g of vis.slice(from)) {
            if (vert) env2.rect(g.x * sx - sz * sx * 0.6, (g.y - g.h / 2) * sy - 0.5, sz * sx * 1.2, g.h * sy + sz * (it.track || 0) * sy + 1, acc, 1, true);
            else env2.rect((g.x - g.w / 2) * sx - 0.5, g.y * sy - sz * sy * 0.6, g.w * sx + sz * (it.track || 0) * sx + 1, sz * sy * 1.2, acc, 1, true);
          }
        }));
        addC(it, (i) => (selIdx.has(i) ? { color: bg } : null));
      }
      if (p < 0.94) {
        const g0 = vis[Math.min(vis.length - 1, from)];
        if (p >= 0.55) { if (blink) drawCur(cursorBefore(vis[0])); }
        else if (s === 0) { if (blink) drawCur(cursorAfter(vis[vis.length - 1])); }
        else drawCur(cursorBefore(g0));
      }
      return;
    }
    // character-by-character, accelerating like key repeat
    const del = Math.pow(J.clamp((p - 0.1) / 0.8), 1.3);
    const k = vis.length - Math.min(vis.length, Math.floor(del * (vis.length + 0.999)));
    const keep = k > 0 ? vis[k - 1].i : -1;
    if (k < vis.length) addC(it, (i) => (i > keep ? HIDE : null));
    if (p < 0.94) {
      const idle = p < 0.1 || k === 0;
      if (!idle || blink) drawCur(k > 0 ? cursorAfter(vis[k - 1]) : cursorBefore(vis[0]));
    }
  },
};

X.scrambleOut = {
  name: '記号化', tags: ['glitch'], w: 0.9,
  apply(env, it, p) {
    const ord = orderOf(env, it), seed = it.seed | 0, step = env.step, acc = env.sc.accent;
    addC(it, (i, g, n) => {
      const q = win(p, 0.65 * ord(i, n) + 0.35 * J.r(seed, i, 701), 0.55);
      if (q <= 0) return null;
      if (q >= 1) return HIDE;
      if (q > 0.55 && J.r(seed, i, step, 703) < (q - 0.55) * 2.4) return HIDE;
      return { ch: POOL[J.h(seed, i, step, 702) % POOL.length], color: J.r(seed, i, step, 704) < 0.3 ? acc : undefined, s: 1 - 0.35 * J.smooth(0.4, 1, q) };
    });
  },
};

X.glitchDissolve = {
  name: 'ブロック化', tags: ['glitch'], w: 0.8,
  apply(env, it, p) {
    const seed = it.seed | 0, step = env.step, sz = it.size, lay = layOf(it), sx = it.sx || 1, sy = it.sy || 1;
    const acc = env.sc.accent, c0 = colOf(it), cols = [c0, acc, env.sc.ghostA || acc, env.sc.ghostB || c0];
    const T = i => J.r(seed, i, 801) * 0.55;
    addC(it, (i) => {
      const q = (p - T(i)) / 0.45;
      if (q <= 0) return null;
      if (q >= 0.3) return HIDE;
      const r = J.r(seed, i, step, 802), cut = J.rs(seed, i, step, 804) * 0.35;
      return { dx: J.rs(seed, i, step, 803) * sz * 0.12, clipY: r < 0.5 ? [-1.2, cut] : [cut, 1.2], color: r < 0.25 ? acc : undefined };
    });
    chainPost(it, (env2, it2) => inItem(env2, it2, () => {
      for (const g of lay) {
        if (isSp(g.ch)) continue;
        const q = (p - T(g.i)) / 0.45;
        if (q <= 0 || q >= 1) continue;
        const cnt = Math.ceil(5 * (1 - q * 0.8));
        for (let b = 0; b < cnt; b++) {
          const hk = g.i * 8 + b;
          if (J.r(seed, hk, step, 805) < q * 0.55) continue;
          const w = sz * J.rr(0.12, 0.6, seed, hk, step, 806) * (1 - q * 0.5), h = sz * J.rr(0.06, 0.3, seed, hk, step, 807);
          const x = g.x * sx + J.rs(seed, hk, step, 808) * sz * 0.34 - w / 2, y = g.y * sy + J.rs(seed, hk, step, 809) * sz * 0.34 - h / 2;
          env2.rect(x, y, w, h, cols[J.h(seed, hk, step, 810) % cols.length], 1, false);
        }
      }
    }));
  },
};

X.echoOut = {
  name: '残響', tags: ['emotional', 'calm'], w: 0.9,
  apply(env, it, p) {
    const b = box(it), ax = b.cx - it.x, ay = b.cy - it.y, a0 = it.alpha ?? 1, sz = it.size;
    const lw = Math.max(1, sz * 0.016), col = colOf(it), acc = env.sc.accent;
    it.alpha = a0 * (1 - E.inOutSine(J.clamp(p / 0.45)));
    chainPost(it, (env2, it2) => {
      for (let k = 0; k < 3; k++) {
        const q = J.clamp((p - k * 0.15) / 0.55);
        if (q <= 0 || q >= 1) continue;
        const s = 1 + 0.5 * E.outCubic(q) * (1 + k * 0.2);
        const [dx, dy] = rot2(ax * (1 - s), ay * (1 - s), (it2.rot || 0) * DEG);
        J.drawItem(env2, Object.assign({}, it2, {
          x: it2.x + dx, y: it2.y + dy, size: it2.size * s, alpha: a0 * 0.8 * (1 - q), fill: false, stroke: lw / s, strokeColor: k === 1 ? acc : col,
          pieceFn: null, pre: null, post: null, echo: null, streak: null, extrude: null, shadow: null, gradient: null, pattern: null, dash: null, fillAlpha: 1, _lay: null, _m: null,
        }));
      }
    });
  },
};

X.whipOut = {
  name: 'ホイップ', tags: ['pop', 'graphic'], w: 1,
  apply(env, it, p) {
    const b = box(it), vert = !!it.vertical, sz = it.size;
    const dir = cutBit(env, 4) ? 1 : -1;
    const dist = (vert ? env.H + b.h : env.W + b.w) + sz * 2;
    const pb = sz * 0.14 * E.outCubic(J.clamp(p / 0.28));
    const u = J.clamp((p - 0.26) / 0.74), e = Math.pow(u, 2), v = Math.min(1.6, 2 * u);
    const off = dir * (dist * e - pb * (1 - u));
    const r = (it.rot || 0) * DEG;
    if (vert) { it.x += -off * Math.sin(r); it.y += off * Math.cos(r); scaleAbout(it, 1, 1 + v * 0.45); }
    else { it.x += off * Math.cos(r); it.y += off * Math.sin(r); scaleAbout(it, 1 + v * 0.55, 1 - v * 0.08); it.skew = (it.skew || 0) - dir * Math.min(28, v * 16); }
    if (v > 0.05) {
      const m = Math.min(1, v);
      it.streak = vert ? { n: 4, dx: 0, dy: -dir * sz * 0.45 * m, a: 0.4 * m } : { n: 4, dx: -dir * sz * 0.45 * m, dy: 0, a: 0.4 * m };
    }
    it.alpha = (it.alpha ?? 1) * (1 - J.smooth(0.9, 1, p));
  },
};

X.gravity = {
  name: '重力落下', tags: ['pop', 'emotional'], w: 1,
  outDur: dur => J.clamp(dur * 0.38, 0.3, 0.75),
  apply(env, it, p) {
    const seed = it.seed | 0, sz = it.size, bb = dBox(it, 0), [dsx, dsy] = downI(it);
    const D = Math.max(sz * 2, env.H - bb.y0 + sz * 1.2);
    addC(it, (i) => {
      const d0 = J.r(seed, i, 901) * 0.4, q = J.clamp((p - d0) / 0.6);
      if (q <= 0) return null;
      if (q >= 1) return HIDE;
      const h = sz * (0.12 + 0.22 * J.r(seed, i, 902));
      const v0 = 2 * h + Math.sqrt(4 * h * h + 4 * h * D), G = D + v0;
      const down = -v0 * q + G * q * q, side = J.rs(seed, i, 903) * sz * 0.9 * q;
      return { dx: down * dsx + side * dsy, dy: down * dsy - side * dsx, rot: J.rs(seed, i, 904) * 240 * q * q, a: 1 - J.smooth(0.92, 1, q) };
    });
  },
};

X.popOut = {
  name: '弾ける', tags: ['pop'], w: 1,
  apply(env, it, p) {
    const ord = orderOf(env, it), seed = it.seed | 0, acc = env.sc.accent, c0 = colOf(it);
    const lay = layOf(it), sz = it.size, sx = it.sx || 1, sy = it.sy || 1;
    const Q = (i, n) => win(p, 0.6 * ord(i, n) + 0.4 * J.r(seed, i, 1001), 0.5);
    addC(it, (i, g, n) => {
      const q = Q(i, n);
      if (q <= 0) return null;
      if (q >= 0.55) return HIDE;
      const u = q / 0.55;
      return { s: 1 + 0.5 * u * u, sx: 1 + 0.07 * Math.sin(u * 26) * u, sy: 1 - 0.07 * Math.sin(u * 26) * u, color: mixC(c0, acc, u * 0.7) };
    });
    chainPost(it, (env2, it2) => inItem(env2, it2, () => {
      for (const g of lay) {
        if (isSp(g.ch)) continue;
        const q = Q(g.i, lay.N);
        if (q < 0.55 || q >= 1) continue;
        const u = (q - 0.55) / 0.45, e = E.outCubic(u), cx = g.x * sx, cy = g.y * sy, lw = Math.max(1, sz * 0.08 * (1 - u));
        env2.circle(cx, cy, sz * (0.35 + 0.45 * e), null, acc, lw, 1 - u, false);
        const a0 = J.r(seed, g.i, 1002) * TAU;
        for (let k = 0; k < 8; k++) {
          const a = a0 + k / 8 * TAU, r0 = sz * (0.5 + 0.55 * e), r1 = r0 + sz * 0.16 * (1 - u);
          env2.line([[cx + Math.cos(a) * r0, cy + Math.sin(a) * r0], [cx + Math.cos(a) * r1, cy + Math.sin(a) * r1]], acc, lw, 1 - u, false);
        }
      }
    }));
  },
};

X.burn = {
  name: '焼失', tags: ['emotional', 'glitch'], w: 0.8,
  outDur: dur => J.clamp(dur * 0.36, 0.28, 0.7),
  apply(env, it, p) {
    const ord0 = orderOf(env, it), seed = it.seed | 0, rev = cutBit(env, 5);
    const ord = (i, n) => (rev ? 1 - ord0(i, n) : ord0(i, n));
    const c0 = colOf(it), acc = env.sc.accent, bg = env.sc.bg, sz = it.size, lay = layOf(it), sx = it.sx || 1, sy = it.sy || 1, step = env.step;
    const Q = (i, n) => win(p, 0.6 * ord(i, n) + 0.4 * J.r(seed, i, 1101), 0.45);
    const K = q => Math.pow(J.clamp((q - 0.12) / 0.88), 1.15);   // burnt-away fraction, from the bottom up
    addC(it, (i, g, n) => {
      const q = Q(i, n);
      if (q <= 0) return null;
      if (q >= 1) return HIDE;
      const heat = J.smooth(0, 0.2, q), char = J.smooth(0.35, 0.95, q), k = K(q);
      return { color: char > 0 ? mixC(acc, bg, char * 0.75) : mixC(c0, acc, heat), clipY: [-1.2, 0.72 - 1.44 * k], dy: -k * sz * 0.1, dx: J.rs(seed, i, step, 1102) * sz * 0.012 * heat };
    });
    chainPost(it, (env2, it2) => inItem(env2, it2, () => {
      for (const g of lay) {
        if (isSp(g.ch)) continue;
        const q = Q(g.i, lay.N);
        if (q <= 0.15 || q >= 1) continue;
        for (let j = 0; j < 5; j++) {
          const b0 = 0.15 + J.r(seed, g.i, j, 1103) * 0.6, age = (q - b0) / 0.35;
          if (age <= 0 || age >= 1) continue;
          const ey = g.y * sy + (0.72 - 1.44 * K(b0)) * g.h * sy - K(b0) * sz * 0.1 - age * sz * 0.55;
          const ex = g.x * sx + J.rs(seed, g.i, j, 1104) * g.w * sx * 0.4 + Math.sin(age * 6 + j) * sz * 0.05;
          env2.circle(ex, ey, Math.max(1, sz * 0.04 * (1 - age)), acc, null, 0, 1 - age, false);
        }
      }
    }));
  },
};

X.sweepCover = {
  name: 'バーで隠す', tags: ['graphic', 'editorial', 'pop'], w: 1,
  outDur: dur => J.clamp(dur * 0.34, 0.26, 0.6),
  apply(env, it, p) {
    const lines = lineExt(it), vert = !!it.vertical, sz = it.size, acc = env.sc.accent;
    const L = lines.length; if (!L) return;
    const st = L > 1 ? Math.min(0.12, 0.3 / (L - 1)) : 0, span = 1 - (L - 1) * st;
    const N = cutN(env), single = layOf(it).N === 1 && N > 1;
    const U = single ? [win(p, orderOf(env, it)(0, 1), 0.45)] : lines.map((ln, k) => J.clamp((p - k * st) / span));
    const hidden = new Set(lines.filter((ln, k) => U[k] >= 0.5).map(ln => ln.li));
    if (hidden.size) addC(it, (i, g) => (hidden.has(g.li) ? HIDE : null));
    const pa = sz * 0.14, pc = sz * 0.1;
    chainPost(it, (env2, it2) => inItem(env2, it2, () => {
      lines.forEach((ln, k) => {
        const u = U[k]; if (u <= 0 || u >= 1) return;
        const c1 = E.inOutCubic(J.clamp(u / 0.5)), c2 = E.inOutCubic(J.clamp((u - 0.5) / 0.5));
        if (vert) {
          const a0 = ln.y0 - pa, a1 = ln.y1 + pa, y0 = J.lerp(a0, a1, c2), y1 = J.lerp(a0, a1, c1);
          if (y1 - y0 > 0.3) env2.rect(ln.x0 - pc, y0, ln.x1 - ln.x0 + pc * 2, y1 - y0, acc, 1, false);
        } else {
          const a0 = ln.x0 - pa, a1 = ln.x1 + pa, x0 = J.lerp(a0, a1, c2), x1 = J.lerp(a0, a1, c1);
          if (x1 - x0 > 0.3) env2.rect(x0, ln.y0 - pc, x1 - x0, ln.y1 - ln.y0 + pc * 2, acc, 1, false);
        }
      });
    }));
  },
};

X.shatterLite = {
  name: '四分割飛散', tags: ['pop', 'glitch'], w: 0.8,
  apply(env, it, p) {
    const seed = it.seed | 0, sz = it.size, dist = sz * 1.7;
    const quad = (qx, qy, id) => (i) => {
      const clipX = qx < 0 ? [-1.6, 0.012] : [0, 1.6], clipY = qy < 0 ? [-1.6, 0.012] : [0, 1.6];
      const d0 = J.r(seed, i, 1201) * 0.35, q = J.clamp((p - d0) / 0.65);
      if (q <= 0) return { clipX, clipY };
      if (q >= 1) return HIDE;
      const e = E.outCubic(q), dd = dist * (0.7 + 0.6 * J.r(seed, i, id, 1203));
      return { clipX, clipY, dx: (qx + J.rs(seed, i, id, 1202) * 0.5) * dd * e, dy: (qy + J.rs(seed, i, id, 1205) * 0.5) * dd * e + sz * 0.9 * q * q,
        rot: J.rs(seed, i, id, 1204) * 110 * e, s: 1 - 0.45 * q, a: 1 - J.smooth(0.45, 1, q) };
    };
    withCopies(it, quad(-1, -1, 0), [quad(1, -1, 1), quad(-1, 1, 2), quad(1, 1, 3)]);
  },
};

/* safety net: whatever a recipe leaves at the very end (thin strokes, compensated outlines…), p≈1 is always fully gone */
for (const k of Object.keys(X)) {
  const f = X[k].apply;
  X[k].apply = (env, it, p, ctx) => { if (p >= 0.998) { it.alpha = 0; return; } f(env, it, p, ctx); };
  J.register('exit', k, X[k], P);
}

/* ============================== HOLDS ============================== */
const H = {};

H.float = {
  name: 'ふわふわ', tags: ['calm', 'emotional'], w: 0.8,
  apply(env, it, amt) {
    const k = amt * motionK(env); if (k < 0.01) return;
    const t = env.ltb, seed = it.seed | 0, A = it.size * 0.075 * k, ph = (seed % 97) * 0.13;
    addC(it, (i) => ({ dy: (0.55 * Math.sin(t * 2.1 + i * 1.3 + ph) + 0.6 * J.noise1(t * 0.9 + i * 0.43, seed)) * A, dx: J.noise1(t * 0.6 + i * 0.31, seed + 7) * A * 0.35 }));
  },
};

H.sway = {
  name: 'ゆらぎ', tags: ['calm', 'emotional'], w: 0.6,
  apply(env, it, amt) {
    const k = amt * motionK(env); if (k < 0.01) return;
    const b = box(it), ang = Math.sin(env.ltb * TAU / 3.2 + ((it.seed | 0) % 7)) * 2.6 * k;
    rotateAbout(it, ang, b.cx - it.x, b.y0 - it.y - it.size * 0.6);   // pendulum hanging just above the text
  },
};

H.pulse = {
  name: '脈動', tags: ['pop', 'graphic'], w: 0.6,
  apply(env, it, amt) {
    const k = amt * motionK(env); if (k < 0.01) return;
    const f = 1 + 0.055 * Math.exp(-beatSince(env, 0.5) * 9) * k;
    scaleAbout(it, f, f);
  },
};

H.shimmer = {
  name: 'きらめき', tags: ['emotional', 'calm'], w: 0.5,
  apply(env, it, amt) {
    const k = amt * motionK(env); if (k < 0.01) return;
    const t = env.ltb, seed = it.seed | 0, step = env.step, acc = env.sc.accent, c0 = colOf(it);
    addC(it, (i) => {
      const tw = 0.5 + 0.5 * J.noise1(t * 3.2 + i * 1.7, seed);
      const sp = J.r(seed, step, i, 401) < 0.03 * k;
      return { a: 1 - 0.42 * Math.min(1, k) * tw * tw, color: sp ? mixC(c0, acc, 0.85) : undefined, s: sp ? 1.05 : 1 };
    });
  },
};

H.colorRun = {
  name: '色が走る', tags: ['pop', 'graphic'], w: 0.5,
  apply(env, it, amt) {
    const k = amt * Math.min(1, motionK(env)); if (k < 0.01) return;
    const c0 = colOf(it), acc = env.sc.accent; if (!isHex(c0) || !isHex(acc)) return;
    const N = cutN(env), mi = +it.mi || 0, sz = it.size, per = N + 5;
    const pos = ((env.ltb * 7) % per + per) % per - 2.5;
    addC(it, (i, g, n) => {
      const d = (n > 1 ? i : mi) - pos, w = Math.exp(-d * d / 1.6);
      if (w < 0.02) return null;
      return { color: mixC(c0, acc, w * 0.9 * k), dy: -w * sz * 0.035 * k };
    });
  },
};

H.rotateSlow = {
  name: 'ゆっくり回転', tags: ['calm', 'editorial'], w: 0.4,
  apply(env, it, amt) {
    const k = amt * motionK(env); if (k < 0.01) return;
    const dir = ((it.seed | 0) >>> 1) & 1 ? 1 : -1, b = box(it);
    rotateAbout(it, dir * Math.min(10, env.ltb * 2.6) * k, b.cx - it.x, b.cy - it.y);
  },
};

H.trackBreathe = {
  name: '字間の呼吸', tags: ['calm', 'editorial'], w: 0.5,
  apply(env, it, amt) {
    const k = amt * motionK(env); if (k < 0.01) return;
    const b = box(it), ox = b.cx - it.x, oy = b.cy - it.y, sx = it.sx || 1, sy = it.sy || 1, vert = !!it.vertical;
    const f = Math.sin(env.ltb * TAU / 2.8) * 0.075 * k;
    addC(it, (i, g) => (vert ? { dy: (g.y * sy - oy) * f } : { dx: (g.x * sx - ox) * f }));
  },
};

H.skewWobble = {
  name: '斜め揺れ', tags: ['pop', 'glitch'], w: 0.4,
  apply(env, it, amt) {
    const k = amt * motionK(env); if (k < 0.01) return;
    const b = box(it), oy = b.cy - it.y, s0 = it.skew || 0, s1 = s0 + Math.sin(env.ltb * TAU / 1.9) * 12 * k;
    const [dx, dy] = rot2(-(Math.tan(s1 * DEG) - Math.tan(s0 * DEG)) * oy, 0, (it.rot || 0) * DEG);   // keep the box centre put
    it.skew = s1; it.x += dx; it.y += dy;
  },
};

H.beatHop = {
  name: '拍で跳ねる', tags: ['pop'], w: 0.5,
  apply(env, it, amt) {
    const k = amt * motionK(env); if (k < 0.01) return;
    const len = beatLen(env, 0.45), u = beatSince(env, 0.45) / (len * 0.85); if (u >= 1) return;
    const N = cutN(env), idx = beatIdx(env, 0.45), cur = ((idx % N) + N) % N, mi = +it.mi || 0, sz = it.size;
    const h = Math.pow(Math.sin(Math.PI * u), 0.7);
    addC(it, (i, g, n) => {
      const d = Math.abs((n > 1 ? i : mi) - cur), w = d === 0 ? 1 : d === 1 ? 0.3 : 0;   // the neighbours ripple a little
      return w ? { dy: -h * w * sz * 0.2 * k, sy: 1 + 0.08 * h * w * k, sx: 1 - 0.05 * h * w * k } : null;
    });
  },
};

H.hWave = {
  name: '横波', tags: ['pop', 'emotional'], w: 0.4,
  apply(env, it, amt) {
    const k = amt * motionK(env); if (k < 0.01) return;
    const t = env.ltb, sz = it.size;
    addC(it, (i) => { const a = t * TAU * 0.55 - i * 0.9; return { dx: Math.sin(a) * sz * 0.085 * k, skew: -Math.cos(a) * 9 * k }; });
  },
};

H.heartbeat = {
  name: '鼓動', tags: ['emotional', 'pop'], w: 0.4,
  apply(env, it, amt) {
    const k = amt * motionK(env); if (k < 0.01) return;
    const u = env.beat ? (env.beat.index % 2) * env.beat.len + env.beat.since : ((env.ltb % 1.05) + 1.05) % 1.05;
    const v = Math.exp(-u * 9) + (u > 0.2 ? 0.75 * Math.exp(-(u - 0.2) * 9) : 0);
    const f = 1 + 0.055 * v * k;
    scaleAbout(it, f, f);
    it.color = mixC(colOf(it), env.sc.accent, Math.min(0.85, 0.6 * v * Math.min(1, k)));
  },
};

H.orbitSmall = {
  name: '小さな円運動', tags: ['calm', 'pop'], w: 0.5,
  apply(env, it, amt) {
    const k = amt * motionK(env); if (k < 0.01) return;
    const t = env.ltb * TAU / 1.7, r = it.size * 0.05 * k, dir = ((it.seed | 0) >>> 2) & 1 ? 1 : -1;
    addC(it, (i) => ({ dx: Math.cos(t * dir + i * 0.9) * r, dy: Math.sin(t * dir + i * 0.9) * r }));
  },
};

H.jelly = {
  name: 'ゼリー', tags: ['pop'], w: 0.4,
  apply(env, it, amt) {
    const k = amt * motionK(env); if (k < 0.01) return;
    const sy0 = it.sy || 1, t = env.ltb, bs = env.beat ? env.beat.since : null;
    addC(it, (i, g) => {
      const w = bs != null ? Math.exp(-(bs - i * 0.03) * 4.5) * Math.sin(Math.max(0, bs - i * 0.03) * 21) : Math.sin(t * TAU * 1.1 - i * 0.55);
      const a = 0.1 * w * k, syk = 1 - a;
      return { sx: 1 + a, sy: syk, dy: (1 - syk) * g.h * sy0 * 0.5 };   // bottom-anchored squash & stretch
    });
  },
};

H.scanBand = {
  name: '走査帯', tags: ['glitch', 'graphic'], w: 0.4,
  apply(env, it, amt) {
    const k = amt * motionK(env); if (k < 0.01) return;
    if (it.bands || it.vbands) return;                        // an entrance is already slicing this item
    const per = 2.2, cyc = Math.floor(env.ltb / per), v = ((env.ltb % per) + per) % per / (per * 0.7);
    if (v >= 1) return;
    const bb = dBox(it, it.size * 0.1), h = bb.y1 - bb.y0, bh = Math.max(it.size * 0.24, h * 0.12);
    const y = bb.y0 - bh + (h + bh) * v, dx = it.size * 0.075 * k * (J.r(it.seed | 0, cyc, 451) < 0.5 ? 1 : -1);
    it.bands = [[y, y + bh, dx]];
    const acc = env.sc.accent, lw = Math.max(1, it.size * 0.012);
    chainPost(it, (env2) => env2.rect(bb.x0, y + bh - lw, bb.x1 - bb.x0, lw, acc, 0.55 * Math.min(1, k), false));
  },
};

H.noiseDrift = {
  name: 'ノイズ漂流', tags: ['calm', 'emotional'], w: 0.6,
  apply(env, it, amt) {
    const k = amt * motionK(env); if (k < 0.01) return;
    const t = env.ltb * 0.35, seed = it.seed | 0, A = it.size * 0.075 * k;
    addC(it, (i) => ({ dx: J.noise1(t + i * 1.7, seed + 11) * A, dy: J.noise1(t + i * 2.3, seed + 23) * A, rot: J.noise1(t * 1.3 + i * 0.9, seed + 37) * 7 * k }));
  },
};

H.tilt = {
  name: 'シーソー', tags: ['calm', 'editorial'], w: 0.4,
  apply(env, it, amt) {
    const k = amt * motionK(env); if (k < 0.01) return;
    const b = box(it), ox = b.cx - it.x, oy = b.cy - it.y, sx = it.sx || 1, sy = it.sy || 1, vert = !!it.vertical;
    const tn = Math.tan(Math.sin(env.ltb * TAU / 4.2 + ((it.seed | 0) % 5)) * 4 * k * DEG);   // baseline tilts, glyphs stay upright
    addC(it, (i, g) => (vert ? { dx: -(g.y * sy - oy) * tn } : { dy: (g.x * sx - ox) * tn }));
  },
};

H.zoomSlow = {
  name: 'じわ寄り', tags: ['calm', 'emotional', 'editorial'], w: 0.8,
  apply(env, it, amt, ctx) {
    const k = amt * motionK(env); if (k < 0.01) return;
    const u = J.clamp(env.ltb / Math.max(0.3, (ctx && ctx.dur) || env.cut.dur || 1));
    const f = 1 + 0.07 * E.outQuad(u) * k;
    scaleAbout(it, f, f);
  },
};

H.stretchPulse = {
  name: '横伸び拍', tags: ['pop', 'graphic'], w: 0.4,
  apply(env, it, amt) {
    const k = amt * motionK(env); if (k < 0.01) return;
    const kick = Math.exp(-beatSince(env, 0.5) * 8) * k;
    scaleAbout(it, 1 + 0.12 * kick, 1 - 0.045 * kick);
  },
};

H.glitchJump = {
  name: '時々ずれる', tags: ['glitch'], w: 0.4,
  apply(env, it, amt) {
    const k = amt * motionK(env); if (k < 0.01) return;
    const seed = it.seed | 0, step = env.step, slot = Math.floor(step / 8), ph = step - slot * 8;
    const gl = env.fx.glitch != null ? env.fx.glitch : 0.5;
    if (ph > 2 || J.r(seed, slot, 501) > 0.4 + 0.3 * gl) return;
    const sz = it.size;
    it.x += J.rs(seed, slot, 502) * sz * 0.2 * k; it.y += J.rs(seed, slot, 503) * sz * 0.04 * k;
    if (ph === 0 && !it.bands && !it.vbands) {
      it.bands = J.itemBands(env, it, 5, (b) => (J.r(seed, slot, b, 504) < 0.6 ? J.rs(seed, slot, b, 505) * sz * 0.12 * k : 0));
      if (J.r(seed, slot, 506) < 0.5) it.color = env.sc.ghostA || env.sc.accent;
    }
  },
};

H.echoTrail = {
  name: '残像を引く', tags: ['emotional', 'glitch'], w: 0.4,
  apply(env, it, amt) {
    const k = amt * motionK(env); if (k < 0.01) return;
    const t = env.ltb, sz = it.size, w = TAU / 3.4, ph = ((it.seed | 0) % 100) * 0.1;
    const Ax = sz * 0.09 * k, Ay = sz * 0.05 * k;
    it.x += Math.sin(w * t + ph) * Ax; it.y += Math.sin(w * 1.37 * t + ph * 1.3) * Ay;
    const vx = Math.cos(w * t + ph) * w * Ax, vy = Math.cos(w * 1.37 * t + ph * 1.3) * w * 1.37 * Ay;
    if (!it.echo) it.echo = { n: 3, dx: -vx * 0.3, dy: -vy * 0.3, a: 0.34 * Math.min(1, k), decay: 0.62, color: env.sc.sub || it.color };
  },
};

for (const k of Object.keys(H)) J.register('hold', k, H[k], P);
})();
