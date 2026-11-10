/* JIZURA pack: x2hold — 30 more holds (待機中の動き) for 追加分2
   Holds: amt 0..1 × fx.motion; amt = 0 is exactly the resting item. Subtle idle motion, the lyric stays readable.
   Families: rigid whole-item motions (depth rock, buoy, metronome, creep & snap, wall bounce, stop motion…),
   per-glyph sequences (magnifier, nod, pair up, ripple, cradle, blink…), optical copies (double vision, floor
   reflection, marching edge, heat haze, karaoke fill) and loudness-driven ones (weight, arch, level fill).
   Everything is relative to it.size / the item box and deterministic (cut seed, it.seed, glyph index, env.step). */
(() => {
'use strict';
const E = J.E;
const P = 'x2hold';
const DEG = J.DEG, TAU = J.TAU;
const HIDE = Object.freeze({ hide: true });

/* ============================== helpers ============================== */
const isHex = c => typeof c === 'string' && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(c);
const mixC = (a, b, t) => { t = J.clamp(t); if (t <= 0.002) return a; if (t >= 0.998) return b; return isHex(a) && isHex(b) ? J.mix(a, b, t) : (t < 0.5 ? a : b); };
const colOf = it => (isHex(it.color) ? it.color : '#ffffff');
const motionK = env => J.clamp((env.fx && env.fx.motion != null ? env.fx.motion : 0.7) / 0.7, 0, 1.6);
const isSp = ch => ch === ' ' || ch === '　';
const layOf = it => (it._m || (it._m = J.measure(it))).lay;
const box = it => { it._m = J.measure(it); return J.itemBox(it); };       // fresh (sx/sy/size may have changed)
const cutN = env => Math.max(1, J.glyphCount(String(env.cut && env.cut.text || '')));
const cseed = env => (env.cut && env.cut.seed) | 0;
const cphase = (env, m = 97) => (cseed(env) % m) / m * TAU;                 // same phase for every item of a cut
const isSingle = (env, it) => layOf(it).N === 1 && cutN(env) > 1;         // one glyph per item (mixed / scatter layouts)
const rot2 = (x, y, r) => { const c = Math.cos(r), s = Math.sin(r); return [x * c - y * s, x * s + y * c]; };
const toD = (it, lx, ly) => { const [x, y] = rot2(lx, ly, (it.rot || 0) * DEG); return [it.x + x, it.y + y]; };
const frac = x => x - Math.floor(x);

/* sequential order 0..1 of glyph i; single-glyph items use their mi within the cut */
function orderOf(env, it) {
  const N = cutN(env), mi = +it.mi || 0;
  return (i, n) => (n > 1 ? i / (n - 1) : N > 1 ? J.clamp(mi / (N - 1)) : 0);
}
/* integer sequence position of a glyph + how many there are in the sequence */
function seqOf(env, it) {
  const lay = layOf(it), single = lay.N === 1 && cutN(env) > 1, mi = Math.round(+it.mi || 0);
  return { single, tot: single ? cutN(env) : Math.max(1, lay.N), idx: i => (single ? mi : i) };
}
/* merge per-glyph functions keeping every field drawItem understands */
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
    return o;
  };
}
function addC(it, fn) {
  if (!it.charFns) it.charFns = [];
  const prev = it.charFns.splice(0); prev.push(fn);
  it.charFns.push(merged(prev));
}
function chainPost(it, fn) { const p0 = it.post; it.post = (env, it2, bb) => { if (p0) p0(env, it2, bb); fn(env, it2, bb); }; }
function chainPre(it, fn) { const p0 = it.pre; it.pre = (env, it2) => { if (p0) p0(env, it2); fn(env, it2); }; }
/* a plain copy of a (hook) item: no hooks, no clip / bands / trails */
const COPY_RESET = { pre: null, post: null, streak: null, echo: null, wipeBar: null, cursorAt: -1, clip: null, clipY: null, clipFn: null, bands: null, vbands: null, pieceFn: null };
const copyOf = (it2, over) => Object.assign({}, it2, COPY_RESET, over || null);
/* item box in item space (relative to it.x/it.y, unrotated) */
function lBox(it, pad = 0) {
  const b = box(it);
  return { x0: b.x0 - it.x - pad, y0: b.y0 - it.y - pad, x1: b.x1 - it.x + pad, y1: b.y1 - it.y + pad, cx: b.cx - it.x, cy: b.cy - it.y, w: b.w + pad * 2, h: b.h + pad * 2 };
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
  return { x0: x0 - pad - sk, y0: y0 - pad, x1: x1 + pad + sk, y1: y1 + pad, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, w: x1 - x0 + 2 * pad + 2 * sk, h: y1 - y0 + 2 * pad };
}
function scaleAbout(it, kx, ky, ax, ay) {
  if (ax == null) { const b = box(it); ax = b.cx - it.x; ay = b.cy - it.y; }
  const [dx, dy] = rot2(ax * (1 - kx), ay * (1 - ky), (it.rot || 0) * DEG);
  it.x += dx; it.y += dy; it.sx = (it.sx || 1) * kx; it.sy = (it.sy || 1) * ky; it._m = null; it._lay = null;
}
function sizeAbout(it, k) {
  const b = box(it), ax = b.cx - it.x, ay = b.cy - it.y;
  const [dx, dy] = rot2(ax * (1 - k), ay * (1 - k), (it.rot || 0) * DEG);
  it.x += dx; it.y += dy; it.size *= k; it._m = null; it._lay = null;
}
/* rotate an item about a point given in its own item space */
function rotateAbout(it, deg, ax, ay) {
  const r0 = (it.rot || 0) * DEG, r1 = r0 + deg * DEG;
  const [x0, y0] = rot2(ax, ay, r0), [x1, y1] = rot2(ax, ay, r1);
  it.x += x0 - x1; it.y += y0 - y1; it.rot = (it.rot || 0) + deg;
}
const gCX = (g, it) => (g.x + g.vx) * (it.sx || 1);       // glyph centre in item space (at rest)
const gCY = (g, it) => (g.y + g.vy) * (it.sy || 1);
/* the reading axis of an item: glyph position −1..1 along it */
function axisOf(it) {
  const b = lBox(it), vert = !!it.vertical;
  return { vert, c: vert ? b.cy : b.cx, half: Math.max(1, (vert ? b.h : b.w) / 2), b };
}
const uOf = (g, it, A) => J.clamp(((A.vert ? gCY(g, it) : gCX(g, it)) - A.c) / A.half, -1, 1);
const along = (A, v, extra) => Object.assign(A.vert ? { dy: v } : { dx: v }, extra || null);     // offset along the reading axis
const across = (A, v, extra) => Object.assign(A.vert ? { dx: -v } : { dy: v }, extra || null);   // offset across it (+ = below the baseline)
const beatLen = (env, fb) => (env.beat && env.beat.len ? env.beat.len : fb);
const beatSince = (env, fb) => (env.beat ? env.beat.since : ((env.ltb % fb) + fb) % fb);
const beatIdx = (env, fb) => (env.beat ? env.beat.index : Math.floor(env.ltb / fb));
/* loudness 0..1: the song's energy when analysed, else a beat envelope, else a slow swell */
function loud(env, seed, rate = 1.5) {
  if (env.energy != null) return J.clamp(env.energy * 1.15);
  if (env.beat) return 0.2 + 0.75 * Math.exp(-env.beat.since * 4.5);
  return J.clamp(0.5 + 0.34 * Math.sin(env.ltb * rate + (seed % 7)) + 0.3 * J.noise1(env.ltb * rate * 1.9, seed));
}
const rgbOf = c => { let h = c.slice(1); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; const v = parseInt(h, 16); return [v >> 16 & 255, v >> 8 & 255, v & 255]; };
const cdist = (a, b) => { if (!isHex(a) || !isHex(b)) return 0; const p = rgbOf(a), q = rgbOf(b); return (Math.abs(p[0] - q[0]) + Math.abs(p[1] - q[1]) + Math.abs(p[2] - q[2])) / 765; };
/* a scheme colour that reads as "the other colour" next to the item's own colour and on the background */
function accFor(env, it) {
  const sc = env.sc, c0 = colOf(it);
  for (const c of [sc.accent, sc.accent2, sc.fg, sc.sub]) if (isHex(c) && cdist(c, c0) > 0.16 && cdist(c, sc.bg) > 0.16) return c;
  return isHex(sc.accent) ? sc.accent : c0;
}
const primary = it => (it.alpha ?? 1) > 0.9 && it.fill !== false;      // optical copies only on the real lyric, not on faded / outline copies

const H = {};

/* ============================== whole-item motions ============================== */

/* depth rock: the line turns about its vertical axis like a card — one end comes forward (bigger, wider), the other recedes */
H.xkDepthRock = {
  name: '奥行きゆれ', en: 'Depth Rock', tags: ['calm', 'editorial', 'emotional'], w: 1.2, ae: 'breathe',
  apply(env, it, amt) {
    const k = amt * motionK(env); if (k < 0.01) return;
    const a = Math.sin(env.ltb * TAU / 5.2 + cphase(env)) * Math.min(k, 1.4);
    if (isSingle(env, it)) {
      const vert = env.H > env.W * 1.2, u = J.clamp((vert ? it.y - env.H / 2 : it.x - env.W / 2) / ((vert ? env.H : env.W) * 0.4), -1, 1);
      sizeAbout(it, 1 + 0.1 * a * u);
      return;
    }
    const A = axisOf(it), c = 0.12 * a, nar = 1 - 0.06 * a * a;
    addC(it, (i, g) => {
      const u = uOf(g, it, A);
      return along(A, A.half * ((u + 0.5 * c * (u * u - 1 / 3)) * nar - u), { s: 1 + c * u });
    });
  },
};

/* parallax: every glyph sits on one of three depth planes; the planes slide against each other as if the camera trucked sideways */
H.xkParallax = {
  name: '視差ゆれ', en: 'Parallax Sway', tags: ['calm', 'graphic', 'emotional'], w: 1, ae: 'drift',
  apply(env, it, amt) {
    const k = amt * motionK(env); if (k < 0.01) return;
    const cs = cseed(env), sz = it.size, kk = Math.min(1, k), mi = Math.round(+it.mi || 0), single = isSingle(env, it);
    const sway = Math.sin(env.ltb * TAU / 4.6 + cphase(env)), bob = Math.sin(env.ltb * TAU / 6.3 + 1);
    addC(it, (i) => {
      const d = (J.h(cs, single ? mi : i, single ? 0 : mi, 711) % 3) - 1;
      if (!d) return null;
      return { dx: sway * sz * 0.075 * d * k, dy: bob * sz * 0.022 * d * k, s: 1 + 0.06 * d * kk, a: d < 0 ? 1 - 0.22 * kk : 1 };
    });
  },
};

/* tall breath: the letters grow taller from the baseline and sink back — a slow inhale, a quicker exhale; the width never changes */
H.xkTallBreath = {
  name: '縦の呼吸', en: 'Tall Breath', tags: ['calm', 'emotional', 'editorial'], w: 1, ae: 'breathe',
  apply(env, it, amt) {
    const k = amt * motionK(env); if (k < 0.01) return;
    const u = frac(env.ltb / 3.8), b = u < 0.62 ? E.inOutSine(u / 0.62) : 1 - E.inOutSine((u - 0.62) / 0.38);
    const f = 1 + 0.1 * b * k, B = lBox(it);
    if (it.vertical) scaleAbout(it, f, 1, B.cx, B.cy);
    else scaleAbout(it, 1, f, B.cx, B.y1);
  },
};

/* beat bump: on every beat something nudges the line from a new side; it gives way and springs back to rest */
H.xkBeatBump = {
  name: '拍で小突く', en: 'Beat Bump', tags: ['pop', 'graphic'], w: 1, ae: 'jitter',
  apply(env, it, amt) {
    const k = amt * motionK(env); if (k < 0.01) return;
    const cs = cseed(env), s = beatSince(env, 0.6), idx = beatIdx(env, 0.6), sz = it.size;
    const v = Math.exp(-s * 5.5) * Math.cos(s * 20) * Math.min(1, s / 0.03);
    if (Math.abs(v) < 0.004) return;
    const ang = J.r(cs, idx, 721) * TAU, d = sz * 0.14 * k * v, B = lBox(it);
    it.x += Math.cos(ang) * d; it.y += Math.sin(ang) * d * 0.75;
    rotateAbout(it, J.rs(cs, idx, 722) * 2 * k * v, B.cx, B.cy);
  },
};

/* metronome: an inverted pendulum pivoting below the text — it swings over on the beat and waits at each end */
H.xkMetronome = {
  name: 'メトロノーム', en: 'Metronome', tags: ['pop', 'graphic', 'editorial'], w: 0.6, ae: 'wave',
  apply(env, it, amt) {
    const k = amt * motionK(env); if (k < 0.01) return;
    const len = beatLen(env, 0.62), s = beatSince(env, 0.62), idx = beatIdx(env, 0.62);
    const to = idx % 2 ? 1 : -1, e = E.inOutCubic(J.clamp(s / (len * 0.55)));
    const B = lBox(it);
    rotateAbout(it, J.lerp(-to, to, e) * 2.4 * k, B.cx, B.y1 + Math.max(it.size * 1.2, B.h * 0.8));
  },
};

/* buoy: the whole line rides a slow swell as one rigid body — it rises, and tips as each wave passes under it */
H.xkBuoy = {
  name: '波に浮かぶ', en: 'Buoy', tags: ['calm', 'emotional'], w: 1.2, ae: 'drift',
  apply(env, it, amt) {
    const k = amt * motionK(env); if (k < 0.01) return;
    const t = env.ltb, ph = cphase(env), w = TAU / 3.4, sz = it.size, B = lBox(it);
    const y = Math.sin(w * t + ph) + 0.35 * Math.sin(w * 1.83 * t + ph * 2);
    const tip = Math.cos(w * t + ph - 0.5) + 0.35 * Math.cos(w * 1.83 * t + ph * 2 - 0.5);
    it.y += y * sz * 0.045 * k; it.x += Math.sin(w * 0.5 * t + ph) * sz * 0.03 * k;
    rotateAbout(it, tip * 1.5 * k, B.cx, B.cy);
  },
};

/* creep & snap: the line slowly slips out of true, then is knocked straight again with a small overshoot */
H.xkTiltSnap = {
  name: 'ずれて直る', en: 'Creep & Snap', tags: ['pop', 'editorial', 'glitch'], w: 0.7, ae: 'drift',
  apply(env, it, amt) {
    const k = amt * motionK(env); if (k < 0.01) return;
    let cyc, u;
    if (env.beat && env.beat.len) { const L = env.beat.len, bi = env.beat.index; cyc = Math.floor(bi / 4); u = ((((bi % 4) + 4) % 4) * L + env.beat.since) / (4 * L); }
    else { const per = 2.6, T = env.ltb / per; cyc = Math.floor(T); u = T - cyc; }
    const dir = (J.h(cseed(env), 731) + cyc) % 2 ? 1 : -1;
    const v = u < 0.9 ? Math.pow(u / 0.9, 1.4) : 1 - E.outBack((u - 0.9) / 0.1, 2.4);
    const B = lBox(it);
    rotateAbout(it, dir * 3.4 * k * v, B.cx, B.cy);
    it.y += v * it.size * 0.02 * k;
  },
};

/* stop motion: a slow sway and bob, but shot on threes — the line holds each pose for three frames like a puppet film */
H.xkStopMotion = {
  name: 'コマ撮りゆれ', en: 'Stop Motion', tags: ['pop', 'graphic', 'glitch'], w: 0.8, ae: 'jitter',
  apply(env, it, amt) {
    const k = amt * motionK(env); if (k < 0.01) return;
    const q = Math.floor(env.step / 3), cs = cseed(env), seed = it.seed | 0, sz = it.size, B = lBox(it);
    it.x += J.noise1(q * 0.31, cs + 3) * sz * 0.06 * k; it.y += J.noise1(q * 0.37, cs + 11) * sz * 0.045 * k;
    rotateAbout(it, Math.sin(q * 0.42 + cphase(env)) * 2.2 * k, B.cx, B.cy);
    addC(it, (i) => ({ rot: J.rs(seed, q, i, 741) * 1.6 * k, dy: J.rs(seed, q, i, 742) * sz * 0.008 * k }));
  },
};

/* slide & bunch: the floor tilts; the glyphs slide downhill and crowd at the low end, then the floor tips the other way */
H.xkSlideBunch = {
  name: '片寄り', en: 'Slide & Bunch', tags: ['pop', 'calm'], w: 0.8, ae: 'wave',
  apply(env, it, amt) {
    const k = amt * motionK(env); if (k < 0.01) return;
    const t = env.ltb * TAU / 4.4 + cphase(env), tiltV = Math.sin(t), slide = Math.sin(t - 0.9);
    const A = axisOf(it), c = 0.15 * Math.min(k, 1.3) * slide;
    rotateAbout(it, tiltV * 3 * k, A.b.cx, A.b.cy);
    if (isSingle(env, it)) return;
    addC(it, (i, g) => { const u = uOf(g, it, A); return along(A, A.half * c * (1 - u * u)); });
  },
};

/* wall bounce: the line glides sideways at a steady pace and rebounds off invisible walls, flattening a little on each hit */
H.xkWallBounce = {
  name: '壁で弾む', en: 'Wall Bounce', tags: ['pop', 'graphic'], w: 0.6, ae: 'drift',
  apply(env, it, amt) {
    const k = amt * motionK(env); if (k < 0.01) return;
    const T = 1.5, p = env.ltb / T, tri = Math.asin(Math.sin(Math.PI * p)) * 2 / Math.PI, vert = !!it.vertical;
    const R = Math.min((vert ? env.H : env.W) * 0.028, it.size * 0.4) * k;
    if (vert) it.y += tri * R; else it.x += tri * R;
    if (p > 0.5) {
      const tau = frac(p - 0.5) * T, q = 0.07 * k * Math.exp(-tau * 9) * Math.cos(tau * 24);
      const B = lBox(it), side = Math.floor(p - 0.5) % 2 ? -1 : 1;         // which wall was hit: squash against that edge
      if (vert) scaleAbout(it, 1 + q * 0.5, 1 - q, B.cx, side > 0 ? B.y1 : B.y0);
      else scaleAbout(it, 1 - q, 1 + q * 0.5, side > 0 ? B.x1 : B.x0, B.cy);
    }
  },
};

/* ============================== optical ============================== */

/* focus breath: now and then the lens drifts — the text swells a touch and goes soft, then pulls sharp again */
H.xkFocusBreath = {
  name: 'ピントの呼吸', en: 'Focus Breath', tags: ['calm', 'emotional'], w: 0.7, ae: 'breathe',
  apply(env, it, amt) {
    const k = amt * motionK(env); if (k < 0.01) return;
    const per = 2.9, T = env.ltb - 0.55; if (T < 0) return;
    const u = frac(T / per) / 0.42; if (u >= 1) return;
    const p = Math.pow(Math.sin(Math.PI * u), 1.5), kk = Math.min(1, k);
    sizeAbout(it, 1 + 0.03 * p * k);
    it.alpha = (it.alpha ?? 1) * (1 - 0.14 * p * kk);
    if (env.pass === 'main' && env.allowFilter && !it.extrude) it.blur = (it.blur || 0) + Math.min(it.size * 0.04, 9) * p * kk;
    else it.track = (it.track || 0) + 0.012 * p * k;
  },
};

/* double vision: two faint images of the line slide out from behind it and merge back, like eyes losing and finding focus */
H.xkDoubleVision = {
  name: '二重像', en: 'Double Vision', tags: ['emotional', 'glitch', 'calm'], w: 0.8, ae: 'drift',
  apply(env, it, amt) {
    const k = amt * motionK(env); if (k < 0.01 || !primary(it)) return;
    const t = env.ltb, ph = cphase(env), kk = Math.min(1, k);
    const open = Math.pow(0.5 - 0.5 * Math.cos(t * TAU / 3.6 + ph), 1.6);
    const sep = it.size * 0.085 * k * open; if (sep < 0.4) return;
    const dy = sep * 0.22 * Math.sin(t * TAU / 5.1 + ph);
    chainPre(it, (env2, it2) => {
      if (env2.pass !== 'main') return;
      const a = (it2.alpha ?? 1) * 0.36 * kk;
      for (const s of [-1, 1]) J.drawItem(env2, copyOf(it2, { x: it2.x + s * sep, y: it2.y + s * dy, alpha: a, shadow: null, extrude: null, blur: 0 }));
    });
  },
};

/* floor reflection: the bottom line stands on a glossy floor — a faint mirrored image below it that ripples like water */
H.xkReflection = {
  name: '床の映り込み', en: 'Floor Reflection', tags: ['calm', 'emotional', 'editorial'], w: 0.7, ae: 'still',
  apply(env, it, amt) {
    const k = amt * motionK(env); if (k < 0.01 || !primary(it)) return;
    const lay = layOf(it), vert = !!it.vertical, t = env.ltb, sz = it.size, sy0 = it.sy || 1, kk = Math.min(1, k);
    let lastLi = 0; for (const g of lay) if (g.li > lastLi) lastLi = g.li;
    const c0 = colOf(it), sq = 0.72;
    chainPost(it, (env2, it2) => {
      if (env2.pass !== 'main') return;
      const base = it2.charFn;
      const fn = (i, g, n) => {
        if (g.r90 || (vert ? g.ci !== g.n - 1 : g.li !== lastLi)) return HIDE;
        const r = base ? base(i, g, n) : null;
        if (r && r.hide) return HIDE;
        const o = Object.assign({}, r), ph = t * 2.6 + i * 1.3;
        o.sy = -(o.sy == null ? 1 : o.sy) * sq * (1 + 0.05 * Math.sin(ph * 1.3));
        o.dy = (o.dy || 0) + g.h * sy0 * (0.5 + sq * 0.5 - 0.03);
        o.dx = (o.dx || 0) + Math.sin(ph) * sz * 0.014 * k;
        o.skew = (o.skew || 0) + Math.sin(ph + 1) * 5 * kk;
        o.rot = -(o.rot || 0); o.color = undefined;
        return o;
      };
      J.drawItem(env2, copyOf(it2, { charFn: fn, alpha: (it2.alpha ?? 1) * 0.34 * kk, color: c0, gradient: [J.rgba(c0, 0), J.rgba(c0, 1)], pattern: null, stroke: 0, shadow: null, extrude: null, blur: 0 }));
    });
  },
};

/* marching edge: a dashed contour in the second colour runs round every glyph like the "marching ants" of a selection */
H.xkMarchEdge = {
  name: '走る破線', en: 'Marching Edge', tags: ['graphic', 'pop', 'glitch'], w: 0.6, ae: 'still',
  apply(env, it, amt) {
    const k = amt * motionK(env); if (k < 0.01 || (it.alpha ?? 1) < 0.5) return;
    const sz = it.size, kk = Math.min(1, k), t = env.ltb;
    const filled = it.fill !== false;
    let col = accFor(env, it);
    if (filled && J.lum(colOf(it)) > 0.5 === J.lum(col) > 0.5 && cdist(col, colOf(it)) < 0.3) col = env.sc.bg;
    const lw = Math.max(1.5, sz * (filled ? 0.028 : 0.034)), d = sz * 0.11;
    chainPost(it, (env2, it2) => {
      if (env2.pass !== 'main') return;
      const ctx = env2.ctx;
      ctx.save();
      ctx.lineDashOffset = -t * sz * 0.42 * (0.4 + 0.6 * kk);
      J.drawItem(env2, copyOf(it2, { fill: false, stroke: lw, strokeColor: col, strokeDash: [d, d * 0.8], alpha: (it2.alpha ?? 1) * kk, shadow: null, extrude: null, gradient: null, pattern: null, blur: 0, dash: null }));
      ctx.restore();
    });
  },
};

/* heat haze: the line shimmers as if seen through rising hot air — thin horizontal slices waver in a travelling ripple */
H.xkHeatHaze = {
  name: '陽炎', en: 'Heat Haze', tags: ['emotional', 'calm', 'glitch'], w: 0.7, ae: 'wave',
  apply(env, it, amt) {
    const k = amt * motionK(env); if (k < 0.01 || it.bands || it.vbands) return;
    const sz = it.size, t = env.ltb, seed = it.seed | 0, bb = dBox(it, sz * 0.12), n = 9;
    const A = sz * 0.03 * k, f = (j) => (Math.sin(t * 4.2 - j * 0.85) * 0.7 + J.noise1(t * 1.7 + j * 0.6, seed) * 0.5) * A;
    if (A < 0.25) return;
    const px = 1 / (env.scale || 1), snap = v => Math.round(v / px) * px;      // slice edges on device pixels, one pixel of overlap: no hairline seams
    if (it.vertical) { const w = bb.w / n; it.vbands = []; for (let j = 0; j < n; j++) it.vbands.push([j ? snap(bb.x0 + j * w) : -env.W, j === n - 1 ? env.W * 2 : snap(bb.x0 + (j + 1) * w) + px, f(j)]); }
    else { const h = bb.h / n; it.bands = []; for (let j = 0; j < n; j++) it.bands.push([snap(bb.y0 + j * h), snap(bb.y0 + (j + 1) * h) + (j < n - 1 ? px : 0), f(j)]); }
  },
};

/* split shear: the upper and lower halves of the line glide past each other and lock back together */
H.xkSplitShear = {
  name: '上下すれ違い', en: 'Split Shear', tags: ['graphic', 'glitch', 'pop'], w: 0.6, ae: 'glitchtick',
  apply(env, it, amt) {
    const k = amt * motionK(env); if (k < 0.01 || it.bands || it.vbands) return;
    const per = 2.4, T = env.ltb - 0.4; if (T < 0) return;
    const cyc = Math.floor(T / per), u = (T - cyc * per) / 1.0; if (u >= 1) return;
    const dir = (J.h(cseed(env), 751) + cyc) % 2 ? 1 : -1;
    const v = u < 0.3 ? E.outCubic(u / 0.3) : u < 0.7 ? 1 : 1 - E.inOutCubic((u - 0.7) / 0.3);
    const d = dir * it.size * 0.055 * k * v; if (Math.abs(d) < 0.3) return;
    const bb = dBox(it, 0), big = Math.max(env.W, env.H), px = 1 / (env.scale || 1), snap = v => Math.round(v / px) * px;
    if (it.vertical) it.vbands = [[-big, snap(bb.cx), d], [snap(bb.cx), big * 2, -d]];
    else it.bands = [[bb.y0 - big, snap(bb.cy), d], [snap(bb.cy), bb.y1 + big, -d]];
  },
};

/* ============================== loudness-driven ============================== */

/* level fill: the glyphs are vessels — the second colour stands in them like a liquid and its level follows the loudness */
H.xkLevelFill = {
  name: '音量の水位', en: 'Level Fill', tags: ['pop', 'graphic'], w: 0.7, ae: 'breathe',
  apply(env, it, amt) {
    const k = amt * motionK(env); if (k < 0.01) return;
    const seed = cseed(env), lv = loud(env, seed, 1.3), kk = Math.min(1, k);
    if (it.gradient || it.pattern || it.fill === false || !isHex(it.color)) { const f = 1 + 0.035 * lv * k; scaleAbout(it, f, f); return; }
    const L = (0.12 + 0.8 * lv) * kk; if (L < 0.02) return;
    const o = J.clamp(1 - L, 0.002, 0.998), acc = accFor(env, it), soft = Math.min(0.03, o * 0.5);
    it.gradient = [[0, it.color], [o - soft, it.color], [o, mixC(it.color, acc, 0.9)], [1, acc]];
  },
};

/* loud weight: the strokes put on weight with the loudness — the type goes from its own weight to extra bold and back */
H.xkLoudWeight = {
  name: '音圧で太る', en: 'Loud Weight', tags: ['pop', 'graphic', 'emotional'], w: 0.8, ae: 'breathe',
  apply(env, it, amt) {
    const k = amt * motionK(env); if (k < 0.01) return;
    const lv = loud(env, cseed(env), 2.1), sz = it.size;
    if (it.gradient || it.pattern || (it.stroke > 0 && it.fill !== false)) { const f = 1 + 0.04 * lv * k; scaleAbout(it, f, f); return; }
    const add = Math.min(sz * 0.08, sz * 0.065 * lv * k); if (add < 0.3) return;
    if (it.fill === false) { it.stroke = (it.stroke || Math.max(1, sz * 0.02)) + add; return; }
    it.stroke = add; it.strokeColor = it.color;
  },
};

/* loud arch: the baseline bows upward with the loudness — a flat line when quiet, a proud arch when loud */
H.xkLoudArch = {
  name: '音圧アーチ', en: 'Loud Arch', tags: ['pop', 'emotional'], w: 0.7, ae: 'wave',
  apply(env, it, amt) {
    const k = amt * motionK(env); if (k < 0.01) return;
    const lv = loud(env, cseed(env), 1.7), sz = it.size, S = seqOf(env, it);
    if (S.tot < 2) { const f = 1 + 0.04 * lv * k; scaleAbout(it, f, f); return; }
    const A0 = sz * 0.26 * lv * Math.min(k, 1.3);
    if (S.single) {
      const u = S.idx(0) / (S.tot - 1) * 2 - 1;
      it.y -= A0 * 0.7 * (0.5 - u * u); it.rot = (it.rot || 0) + u * 7 * lv * k;
      return;
    }
    const A = axisOf(it), slope = Math.min(0.35, 2 * A0 / A.half);
    addC(it, (i, g) => {
      const u = uOf(g, it, A);
      return across(A, -A0 * (0.5 - u * u), A.vert ? null : { rot: Math.atan(slope * u) / DEG });
    });
  },
};

/* ============================== per-glyph sequences ============================== */

/* magnifier: an invisible lens travels to and fro along the line; glyphs under it swell and push their neighbours aside */
H.xkMagnifier = {
  name: '虫めがね', en: 'Magnifier', tags: ['pop', 'graphic', 'editorial'], w: 1, ae: 'wave',
  apply(env, it, amt) {
    const k = amt * motionK(env); if (k < 0.01) return;
    const S = seqOf(env, it), kk = Math.min(k, 1.2), sz = it.size, sy0 = it.sy || 1, vert = !!it.vertical;
    const per = 1.6 + S.tot * 0.3, pos = (S.tot + 1) * (0.5 - 0.5 * Math.cos(env.ltb * TAU / per)) - 1;
    addC(it, (i, g) => {
      const d = S.idx(i) - pos, w = Math.exp(-d * d / 1.3), push = S.single ? 0 : Math.tanh(d / 1.1) * (1 - Math.exp(-d * d * 4)) * sz * 0.2 * kk * J.clamp(1.6 - Math.abs(d) * 0.12);
      if (w < 0.01 && Math.abs(push) < 0.2) return null;
      const s = 1 + (S.single ? 0.13 : 0.24) * kk * w;
      return vert ? { dy: push, s } : { dx: push, s, dy: -(s - 1) * g.h * sy0 * 0.3 };
    });
  },
};

/* nodding: one glyph after another bows forward from its foot and straightens up, a beat apart */
H.xkNod = {
  name: '順にうなずく', en: 'Nodding', tags: ['pop', 'calm'], w: 0.8, ae: 'wave',
  apply(env, it, amt) {
    const k = amt * motionK(env); if (k < 0.01) return;
    const len = beatLen(env, 0.5), u = beatSince(env, 0.5) / Math.min(len * 0.95, 0.6); if (u >= 1) return;
    const S = seqOf(env, it), lay = layOf(it), vis = lay.filter(g => !isSp(g.ch)); if (!vis.length) return;
    const idx = beatIdx(env, 0.5);
    let gi;
    if (S.single) { if (S.idx(0) !== ((idx % S.tot) + S.tot) % S.tot) return; gi = vis[0].i; }
    else gi = vis[((idx % vis.length) + vis.length) % vis.length].i;
    const h = u < 0.35 ? E.outCubic(u / 0.35) : Math.cos((u - 0.35) / 0.65 * Math.PI * 1.5) * Math.exp(-(u - 0.35) * 3.2);
    const th = 17 * k * h * DEG, sy0 = it.sy || 1;
    addC(it, (i, g) => {
      if (i !== gi) return null;
      const hh = g.h * sy0 * 0.5;
      return g.r90 ? { rot: th / DEG * 0.6 } : { dx: hh * Math.sin(th), dy: hh * (1 - Math.cos(th)), rot: th / DEG };
    });
  },
};

/* karaoke fill: the second colour wipes through the line from its first glyph to its last, stays a moment, and drains the same way */
H.xkKaraoke = {
  name: 'カラオケ塗り', en: 'Karaoke Fill', tags: ['pop', 'graphic', 'editorial'], w: 0.9, ae: 'still',
  apply(env, it, amt) {
    const k = amt * motionK(env); if (k < 0.01 || (it.alpha ?? 1) < 0.5) return;
    const S = seqOf(env, it), N = cutN(env), per = J.clamp(1.5 + N * 0.16, 2.2, 4), T = env.ltb - 0.25; if (T < 0) return;
    const u = frac(T / per);
    let F = E.inOutSine(J.clamp(u / 0.5)), Tl = E.inOutSine(J.clamp((u - 0.62) / 0.38));
    if (S.single) { const a = S.idx(0) / S.tot, b = (S.idx(0) + 1) / S.tot; F = J.clamp((F - a) / (b - a)); Tl = J.clamp((Tl - a) / (b - a)); }
    if (F - Tl < 0.004) return;
    const acc = accFor(env, it), kk = Math.min(1, k), sz = it.size, vert = !!it.vertical;
    chainPost(it, (env2, it2) => {
      if (env2.pass !== 'main') return;
      const bb = dBox(it2, sz * 0.2), ctx = env2.ctx;
      ctx.save(); ctx.beginPath();
      if (vert) ctx.rect(bb.x0, bb.y0 + bb.h * Tl, bb.w, bb.h * (F - Tl));
      else ctx.rect(bb.x0 + bb.w * Tl, bb.y0, bb.w * (F - Tl), bb.h);
      ctx.clip();
      J.drawItem(env2, copyOf(it2, { color: acc, strokeColor: it2.fill === false || !(it2.stroke > 0) ? acc : it2.strokeColor, gradient: null, pattern: null, shadow: null, extrude: null, alpha: (it2.alpha ?? 1) * kk }));
      ctx.restore();
    });
  },
};

/* pair up: neighbours lean together two by two; then everyone lets go and pairs up with the neighbour on the other side */
H.xkPairUp = {
  name: '寄り添う', en: 'Pair Up', tags: ['emotional', 'pop', 'calm'], w: 0.8, ae: 'wave',
  apply(env, it, amt) {
    const k = amt * motionK(env); if (k < 0.01) return;
    const per = env.beat && env.beat.len ? env.beat.len * 2 : 1.5, T = env.ltb / per, cyc = Math.floor(T), e = E.inOutCubic(J.clamp((T - cyc) / 0.4));
    const sz = it.size, vert = !!it.vertical, single = isSingle(env, it), mi = Math.round(+it.mi || 0), N = cutN(env);
    const side = (ci, n, par) => (((ci - par) % 2 + 2) % 2 === 0 ? (ci + 1 < n ? 1 : 0) : (ci - 1 >= par ? -1 : 0));
    addC(it, (i, g) => {
      const ci = single ? mi : g.ci, n = single ? N : g.n;
      const v = J.lerp(side(ci, n, (cyc + 1) % 2), side(ci, n, cyc % 2), e);
      if (!v) return null;
      return vert ? { dy: v * sz * 0.06 * k } : { dx: v * sz * 0.06 * k, rot: v * 5 * k };
    });
  },
};

/* ripple out: a drop lands on one glyph; a ring travels outward along the line both ways, lifting each glyph as it passes */
H.xkRippleOut = {
  name: '波紋', en: 'Ripple Out', tags: ['calm', 'emotional', 'pop'], w: 1, ae: 'wave',
  apply(env, it, amt) {
    const k = amt * motionK(env); if (k < 0.01) return;
    let cyc, since;
    if (env.beat && env.beat.len) { const L = env.beat.len, bi = env.beat.index; cyc = Math.floor(bi / 4); since = (((bi % 4) + 4) % 4) * L + env.beat.since; }
    else { const per = 2.3, T = env.ltb - 0.3; if (T < 0) return; cyc = Math.floor(T / per); since = T - cyc * per; }
    const ord = orderOf(env, it), e0 = J.r(cseed(env), cyc, 761), N = cutN(env), sz = it.size, A = axisOf(it);
    const span = Math.max(3, Math.min(N, 16)) * 0.075;
    addC(it, (i, g, n) => {
      const d = Math.abs(ord(i, n) - e0), tau = since - d * span * 2.2;
      if (tau <= 0) return null;
      const y = Math.exp(-tau * 3) * Math.sin(tau * 12) / (1 + d * 1.4);
      if (Math.abs(y) < 0.004) return null;
      return across(A, -y * sz * 0.17 * k, { s: 1 + 0.06 * y * k });
    });
  },
};

/* zigzag flip: odd glyphs sit a little high, even ones a little low — and on every beat they trade places with a snap */
H.xkZigzagFlip = {
  name: '互い違い拍', en: 'Zigzag Flip', tags: ['pop', 'graphic'], w: 0.7, ae: 'jitter',
  apply(env, it, amt) {
    const k = amt * motionK(env); if (k < 0.01) return;
    const s = beatSince(env, 0.55), idx = beatIdx(env, 0.55), to = idx % 2 ? 1 : -1;
    const v = J.lerp(-to, to, E.outBack(J.clamp(s / 0.16), 2.4)) * it.size * 0.042 * k;
    const single = isSingle(env, it), mi = Math.round(+it.mi || 0), A = axisOf(it);
    addC(it, (i, g) => across(A, ((single ? mi : g.ci) % 2 ? 1 : -1) * v));
  },
};

/* spin one: every so often a single glyph turns one full turn on the spot, like a coin spun on a table, and settles */
H.xkSpinOne = {
  name: '一字くるり', en: 'Spin One', tags: ['pop', 'graphic'], w: 0.6, ae: 'glitchtick',
  apply(env, it, amt) {
    const k = amt * motionK(env); if (k < 0.01) return;
    const per = 1.5, T = env.ltb - 0.35; if (T < 0) return;
    const cyc = Math.floor(T / per), u = (T - cyc * per) / 0.8; if (u >= 1) return;
    const S = seqOf(env, it), lay = layOf(it), vis = lay.filter(g => !isSp(g.ch)); if (!vis.length) return;
    const cs = cseed(env), pick = J.h(cs, cyc, 771);
    let gi;
    if (S.single) { if (S.idx(0) !== pick % S.tot) return; gi = vis[0].i; }
    else gi = vis[pick % vis.length].i;
    const dir = J.h(cs, cyc, 772) & 1 ? 1 : -1, full = motionK(env) >= 0.4;       // a full turn needs room: at low motion it only rocks
    const rot = full ? dir * 360 * E.inOutCubic(u) * amt : dir * 14 * k * Math.sin(TAU * u), s = 1 + 0.12 * Math.sin(Math.PI * u) * Math.min(1, k);
    addC(it, (i) => (i === gi ? { rot, s } : null));
  },
};

/* blink: the whole line blinks like an eye — the glyphs shut to a slit in a quick ripple and open again, sometimes twice */
H.xkBlink = {
  name: 'まばたき', en: 'Blink', tags: ['pop', 'emotional', 'glitch'], w: 0.6, ae: 'glitchtick',
  apply(env, it, amt) {
    const k = amt * motionK(env); if (k < 0.01) return;
    const per = 2.5, T = env.ltb - 0.7; if (T < 0) return;
    const cyc = Math.floor(T / per), tau = T - cyc * per, twice = J.r(cseed(env), cyc, 781) < 0.4;
    if (tau > 0.75) return;
    const ord = orderOf(env, it), kk = Math.min(1, k), D = 0.2;
    const shut = x => (x > 0 && x < D ? Math.pow(Math.sin(Math.PI * x / D), 0.8) : 0);
    addC(it, (i, g, n) => {
      const x = tau - ord(i, n) * 0.09, c = Math.max(shut(x), twice ? shut(x - 0.3) : 0);
      if (c <= 0) return null;
      const f = 1 - 0.62 * kk * c;
      return g.r90 ? { sx: f } : { sy: f };
    });
  },
};

/* stair step: the glyphs stand on a three-step staircase that moves along the line one glyph per tick, in hard steps */
H.xkStairStep = {
  name: '階段送り', en: 'Stair Step', tags: ['graphic', 'pop', 'glitch'], w: 0.7, ae: 'jitter',
  apply(env, it, amt) {
    const k = amt * motionK(env); if (k < 0.01) return;
    let b, e;
    if (env.beat) { b = env.beat.index; e = J.clamp(env.beat.since / 0.07); }
    else { const q = env.step / 9; b = Math.floor(q); e = J.clamp((q - b) * 9 / 2); }       // every 9 steps, moving over two of them
    const single = isSingle(env, it), mi = Math.round(+it.mi || 0), A = axisOf(it), d = it.size * 0.05 * k;
    const lvl = (ci, bb) => (((ci - bb) % 3 + 3) % 3) - 1;
    addC(it, (i, g) => { const ci = single ? mi : g.ci; return across(A, -J.lerp(lvl(ci, b - 1), lvl(ci, b), e) * d); });
  },
};

/* big small swap: every other glyph grows while its neighbours shrink, all standing on the baseline; then they trade sizes */
H.xkBigSmall = {
  name: '大小交代', en: 'Big Small Swap', tags: ['pop', 'graphic', 'editorial'], w: 0.8, ae: 'breathe',
  apply(env, it, amt) {
    const k = amt * motionK(env); if (k < 0.01) return;
    const v = J.clamp(Math.sin(env.ltb * TAU / 3.2 + cphase(env)) * 1.7, -1, 1) * 0.1 * Math.min(k, 1.3);
    const single = isSingle(env, it), mi = Math.round(+it.mi || 0), sy0 = it.sy || 1, vert = !!it.vertical;
    addC(it, (i, g) => {
      const s = 1 + ((single ? mi : g.ci) % 2 ? v : -v);
      return vert ? { s } : { s, dy: -(s - 1) * g.h * sy0 * 0.36 };
    });
  },
};

/* cradle: like Newton's cradle — the last glyph swings out and falls back, the knock runs through, and the first one swings out */
H.xkCradle = {
  name: '振り子玉', en: "Newton's Cradle", tags: ['pop', 'graphic', 'calm'], w: 0.6, ae: 'wave',
  apply(env, it, amt) {
    const k = amt * motionK(env); if (k < 0.01) return;
    const half = env.beat && env.beat.len ? Math.max(0.35, env.beat.len) : 0.62, T = env.ltb / half, hc = Math.floor(T), u = T - hc;
    const end = hc % 2 ? -1 : 1, sw = Math.sin(Math.PI * u), th = 13 * k * sw * DEG;
    const sz = it.size, L = sz * 1.25, vert = !!it.vertical, single = isSingle(env, it), mi = Math.round(+it.mi || 0), N = cutN(env);
    const lay = layOf(it), first = [], last = [];
    for (const g of lay) { if (isSp(g.ch)) continue; if (first[g.li] == null) first[g.li] = g.ci; last[g.li] = g.ci; }
    const knock = Math.exp(-u * 14) * sz * 0.012 * k;
    addC(it, (i, g) => {
      const ci = single ? mi : g.ci, a = single ? 0 : first[g.li], b = single ? N - 1 : last[g.li];
      if (a === b) return vert ? null : { rot: end * sw * 3 * k };
      if (ci === (end > 0 ? b : a)) {
        const out = end * L * Math.sin(th), up = -L * (1 - Math.cos(th));
        return vert ? { dy: out, dx: -up } : { dx: out, dy: up, rot: -end * th / DEG };
      }
      return vert ? { dy: end * knock } : { dx: end * knock };
    });
  },
};

for (const k of Object.keys(H)) J.register('hold', k, H[k], P);
})();
