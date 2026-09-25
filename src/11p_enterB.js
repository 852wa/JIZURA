/* JIZURA pack: enterB — 47 more entrances (physics, paper, light, digital devices, graphic masks) */
(() => {
'use strict';
const E = J.E;
const P = 'enterB';
const DEG = J.DEG, TAU = J.TAU, PI = Math.PI;
const clamp = J.clamp, lerp = J.lerp;
const HIDE = Object.freeze({ hide: true });

/* ---------------- easing ---------------- */
const oCubic = x => 1 - Math.pow(1 - clamp(x), 3);
const oQuart = x => 1 - Math.pow(1 - clamp(x), 4);
const oQuint = x => 1 - Math.pow(1 - clamp(x), 5);
const ioCubic = x => { x = clamp(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const ioQuart = x => { x = clamp(x); return x < 0.5 ? 8 * x * x * x * x : 1 - Math.pow(-2 * x + 2, 4) / 2; };
const oBack = (x, s) => E.outBack(clamp(x), s);
const sstep = (a, b, x) => J.smooth(a, b, x);
// damped spring: 1 at t=0 → exactly 0 at t=1 (overshoots through 0)
const spring = (t, k, f) => { t = clamp(t); return Math.exp(-k * t) * Math.cos(f * PI * t) * (1 - t * t * t); };

/* ---------------- stagger ---------------- */
const stg = (p, k, spread) => clamp((p - spread * k) / (1 - spread));
const ordLR = (i, n) => (n > 1 ? i / (n - 1) : 0);
const ordRL = (i, n) => (n > 1 ? 1 - i / (n - 1) : 0);

const isHex = c => typeof c === 'string' && c[0] === '#' && (c.length === 7 || c.length === 4);
const colOf = it => (isHex(it.color) ? it.color : '#ffffff');
const pick = (...cs) => cs.find(isHex) || '#ffffff';
const dirOf = (env, salt) => (J.r(env.cut.seed | 0, salt, 5) < 0.5 ? -1 : 1);
const glyphN = it => [...String(it.text || '').replace(/\s/g, '')].length;
const hotOf = (env, it) => { const bg = pick(env.sc.bg); return J.lum(bg) < 0.5 ? '#ffffff' : pick(env.sc.accent, env.sc.fg); };
const isBlank = ch => ch === ' ' || ch === '　';
// the lyric's primary item (not a faded / outline copy, not one glyph of a multi-item layout): helper graphics only go here
const isPrimary = it => (it.alpha ?? 1) >= 0.85 && it.fill !== false && glyphN(it) > 1;
const isMain = it => (it.alpha ?? 1) >= 0.85 && it.fill !== false;

/* ---------------- hooks & glyph functions ---------------- */
function addPre(it, fn) { const prev = it.pre; it.pre = prev ? (env, x) => { prev(env, x); fn(env, x); } : fn; }
function addPost(it, fn) { const prev = it.post; it.post = prev ? (env, x, bb) => { prev(env, x, bb); fn(env, x, bb); } : fn; }
function glyphs(it, fn) { if (!it.charFns) it.charFns = []; it.charFns.push(fn); return fn; }
/* draw an extra copy of the item (all passes); `fn` replaces `main` among the item's glyph functions */
const STRIP = { pieceFn: null, streak: null, echo: null, pre: null, post: null, clipFn: null, bands: null, vbands: null, wipeBar: null, cursorAt: null };
function copyDraw(env, x, main, fn, extra) {
  const others = (x.charFns || []).filter(f => f !== main);
  const c = Object.assign({}, x, STRIP, { charFn: fn ? J.combineChar(others.concat([fn])) : (others.length ? J.combineChar(others) : null) }, extra || {});
  return J.drawItem(env, c);
}

/* ---------------- geometry (item-local space: origin at it.x/it.y, before rotation) ---------------- */
function box(it) {
  const m = J.measure(it);
  const x0 = it.vertical ? -m.w / 2 : it.align === 'left' ? 0 : it.align === 'right' ? -m.w : -m.w / 2;
  const y0 = it.vertical && it.align === 'left' ? 0 : -m.h / 2;
  return { x0, y0, x1: x0 + m.w, y1: y0 + m.h, w: m.w, h: m.h, cx: x0 + m.w / 2, cy: y0 + m.h / 2, lay: m.lay };
}
function toLocal(ctx, it) {
  ctx.translate(it.x, it.y);
  if (it.rot) ctx.rotate(it.rot * DEG);
  if (it.skew) ctx.transform(1, 0, Math.tan(it.skew * DEG), 1, 0, 0);
}
function clipLocal(it, fn) {
  it.clipFn = (ctx, env, x) => { const b = box(x); ctx.save(); toLocal(ctx, x); fn(ctx, b, x, env); ctx.restore(); };
}
function postLocal(it, fn) {
  addPost(it, (env, x) => {
    const A = clamp(x.alpha ?? 1); if (A <= 0.01) return;
    const b = box(x), ctx = env.ctx; ctx.save(); toLocal(ctx, x);
    try { fn(env, b, x, A); } finally { ctx.restore(); ctx.globalAlpha = 1; }
  });
}
function preLocal(it, fn) {
  addPre(it, (env, x) => {
    const A = clamp(x.alpha ?? 1); if (A <= 0.01) return;
    const b = box(x), ctx = env.ctx; ctx.save(); toLocal(ctx, x);
    try { fn(env, b, x, A); } finally { ctx.restore(); ctx.globalAlpha = 1; }
  });
}
/* move the item by a vector given in its local (rotated) frame */
function moveLocal(it, dx, dy) {
  const r = (it.rot || 0) * DEG, c = Math.cos(r), s = Math.sin(r);
  it.x += c * dx - s * dy; it.y += s * dx + c * dy;
}
/* scale x / y about the item's own box centre */
function scaleXY(it, kx, ky, b) {
  b = b || box(it);
  it.sx = (it.sx || 1) * kx; it.sy = (it.sy || 1) * ky;
  it._m = null; it._lay = null;
  moveLocal(it, -b.cx * (kx - 1), -b.cy * (ky - 1));
}
function scaleAbout(it, k, b) {
  if (k === 1) return;
  b = b || box(it);
  it.size *= k; it._m = null; it._lay = null;
  moveLocal(it, -b.cx * (k - 1), -b.cy * (k - 1));
}
const glyphPos = (g, isx, isy) => [(g.x + g.vx) * isx, (g.y + g.vy) * isy];
/* per-line extents in local coords: [{li, u0, u1, v, n}] where u = reading axis, v = line centre across it */
function lines(it, b) {
  const vert = !!it.vertical, isx = it.sx || 1, isy = it.sy || 1, map = new Map();
  for (const g of b.lay) {
    if (isBlank(g.ch)) continue;
    const [gx, gy] = glyphPos(g, isx, isy), hu = (vert ? g.h * isy : g.w * isx) / 2;
    const u = vert ? gy : gx, v = vert ? g.x * isx : g.y * isy;
    let L = map.get(g.li);
    if (!L) { L = { li: g.li, u0: 1e9, u1: -1e9, v, n: 0, first: g.i, last: g.i }; map.set(g.li, L); }
    L.u0 = Math.min(L.u0, u - hu); L.u1 = Math.max(L.u1, u + hu); L.n++; L.last = g.i;
  }
  return [...map.values()];
}
const pt = (vert, u, v) => (vert ? [v, u] : [u, v]);

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

/* ================================================================ */
const DEFS = {

  /* ================= PHYSICS ================= */

  springIn: {
    // every glyph is fired up from below on a loose spring: overshoots the line, dips back, settles
    name: 'バネ', tags: ['pop'], w: 0.9, ae: 'drop', minDur: 0.5,
    inDur: dur => clamp(dur * 0.45, 0.2, 0.8),
    apply(env, it, p) {
      const vert = !!it.vertical, size = it.size, D = size * 1.7;
      glyphs(it, (i, g, n) => {
        const q = stg(p, ordLR(i, n), 0.45);
        if (q <= 0) return HIDE; if (q >= 1) return null;
        const f = spring(q, 4.2, 3), v = (spring(q + 0.01, 4.2, 3) - f) / 0.01;
        const st = 1 + Math.min(0.5, Math.abs(v) * 0.075), cp = 1 / Math.sqrt(st);
        return vert ? { dx: -f * D, sx: st, sy: cp, a: clamp(q * 6) } : { dy: f * D, sy: st, sx: cp, a: clamp(q * 6) };
      });
    },
  },

  pendulum: {
    // glyphs hang from a pin above them and swing into place like hanging tags
    name: '振り子', tags: ['pop', 'emotional', 'calm'], w: 0.9, ae: 'spin', minDur: 0.5,
    inDur: dur => clamp(dur * 0.5, 0.22, 0.9),
    apply(env, it, p) {
      const isx = it.sx || 1, isy = it.sy || 1, dir = dirOf(env, 41), size = it.size;
      const qf = (i, n) => stg(p, ordLR(i, n), 0.45);
      const ang = q => dir * 62 * spring(q, 3.1, 2.4);
      const len = g => g.h * isy * 0.5 + size * 0.45;
      glyphs(it, (i, g, n) => {
        const q = qf(i, n);
        if (q <= 0) return HIDE; if (q >= 1) return null;
        const th = ang(q), r = th * DEG, L = len(g);
        return { dx: -L * Math.sin(r), dy: L * Math.cos(r) - L, rot: th, a: clamp(q * 5) };
      });
      if (!isMain(it)) return;
      postLocal(it, (env2, b, x, A) => {
        const lw = Math.max(1.2, size * 0.012), n = b.lay.N;
        for (const g of b.lay) {
          if (isBlank(g.ch)) continue;
          const q = qf(g.i, n); if (q <= 0 || q >= 1) continue;
          const a = A * (1 - sstep(0.45, 0.9, q)) * clamp(q * 5); if (a <= 0.01) continue;
          const [gx, gy] = glyphPos(g, isx, isy), L = len(g), r = ang(q) * DEG;
          const px = gx, py = gy - L, tx = px - Math.sin(r) * (L - g.h * isy * 0.5), ty = py + Math.cos(r) * (L - g.h * isy * 0.5);
          env2.line([[px, py], [tx, ty]], env2.sc.sub, lw, a * 0.8, false);
          env2.circle(px, py, Math.max(2, size * 0.035), env2.sc.accent, null, 1, a, false);
        }
      });
    },
  },

  rollIn: {
    // glyphs roll in along the line like wheels (rotation coupled to distance travelled)
    name: '転がり', tags: ['pop', 'graphic'], w: 0.9, ae: 'spin',
    apply(env, it, p) {
      const vert = !!it.vertical, isx = it.sx || 1, isy = it.sy || 1, size = it.size, dir = dirOf(env, 43);
      const D = size * 2.3 * (0.75 + 0.4 * env.fx.motion);
      glyphs(it, (i, g, n) => {
        // the glyph at the front of the train starts first, so the wheels never roll through each other
        const q = stg(p, dir < 0 ? ordRL(i, n) : ordLR(i, n), 0.22);
        if (q <= 0) return HIDE; if (q >= 1) return null;
        const off = dir * D * (1 - oBack(q, 1.25)), r = Math.max(4, Math.min(g.w * isx, g.h * isy) * 0.5);
        const rot = -off / r / DEG, k = lerp(0.72, 1, oCubic(q));
        return vert ? { dy: off, rot: -rot, s: k, a: clamp(q * 5) } : { dx: off, rot, s: k, a: clamp(q * 5) };
      });
    },
  },

  slingshot: {
    // the line is drawn back on two elastic bands, released, overshoots and settles
    name: 'パチンコ', tags: ['pop', 'graphic'], w: 0.7, ae: 'stretch', minDur: 0.55,
    inDur: dur => clamp(dur * 0.5, 0.25, 0.9),
    apply(env, it, p) {
      const vert = !!it.vertical, b = box(it), size = it.size, tA = 0.36;
      const pull = size * 0.7 + (vert ? b.w : b.h) * 0.35;
      let f, along = 1, across = 1, a = 1, band = 1;
      if (p < tA) {
        const t = p / tA; f = lerp(0.2, 1, E.outCubic(t)); a = clamp(t * 3);
        along = 1 - 0.14 * E.outCubic(t); across = 1 + 0.07 * E.outCubic(t);
      } else {
        const t = (p - tA) / (1 - tA), v = (spring(t + 0.01, 4.6, 2.6) - spring(t, 4.6, 2.6)) / 0.01;
        f = spring(t, 4.6, 2.6);
        along = 1 + Math.min(0.4, Math.abs(v) * 0.05); across = 1 / Math.sqrt(along);
        band = 1 - sstep(0.03, 0.2, t);
        if (t > 0.9 && Math.abs(f) < 0.002) return;
      }
      const R0 = dRange(it, b), prim = isPrimary(it);
      if (vert) scaleXY(it, along, across, b); else scaleXY(it, across, along, b);
      if (vert) it.x += f * pull; else it.y += f * pull;
      it.alpha = (it.alpha ?? 1) * a;
      if (band <= 0.01 || !prim) return;
      addPost(it, (env2, x) => {
        const R = dRange(x, box(x)), m = size * 0.35, lw = Math.max(1.5, size * 0.03), col = env2.sc.accent, A = band * clamp(x.alpha ?? 1);
        const posts = vert ? [[(R0.x0 + R0.x1) / 2, R0.y0 - m], [(R0.x0 + R0.x1) / 2, R0.y1 + m]] : [[R0.x0 - m, (R0.y0 + R0.y1) / 2], [R0.x1 + m, (R0.y0 + R0.y1) / 2]];
        const ends = vert ? [[R.x1, R.y0 + (R.y1 - R.y0) * 0.15], [R.x1, R.y1 - (R.y1 - R.y0) * 0.15]] : [[R.x0 + (R.x1 - R.x0) * 0.12, R.y1], [R.x1 - (R.x1 - R.x0) * 0.12, R.y1]];
        for (let k = 0; k < 2; k++) {
          env2.line([posts[k], ends[k]], col, lw, A, false);
          env2.circle(posts[k][0], posts[k][1], lw * 1.6, col, null, 1, A, false);
        }
      });
    },
  },

  rockSettle: {
    // glyphs drop in tilted, land on a corner and rock side to side until they sit flat
    name: 'ぐらぐら着地', tags: ['pop'], w: 0.8, ae: 'drop', minDur: 0.55,
    inDur: dur => clamp(dur * 0.5, 0.22, 0.9),
    apply(env, it, p) {
      const isx = it.sx || 1, isy = it.sy || 1, seed = it.seed | 0, tL = 0.3;
      glyphs(it, (i, g, n) => {
        const q = stg(p, ordLR(i, n), 0.4);
        if (q <= 0) return HIDE; if (q >= 1) return null;
        const hw = g.w * isx / 2, hh = g.h * isy / 2, th0 = (J.r(seed, i, 45) < 0.5 ? -1 : 1) * (16 + 10 * J.r(seed, i, 46));
        let th, dy = 0;
        if (q < tL) { const t = q / tL; th = th0; dy = -(1 - t * t) * hh * 4; }
        else { const t = (q - tL) / (1 - tL); th = th0 * Math.pow(1 - t, 1.5) * Math.cos(PI * (1.4 * t + 1.9 * t * t)); }
        const r = th * DEG, c = Math.cos(r), s = Math.sin(r), cx = th >= 0 ? hw : -hw, cy = hh;
        return { dx: cx - (cx * c - cy * s), dy: dy + cy - (cx * s + cy * c), rot: th, a: clamp(q * 8) };
      });
    },
  },

  bounceBall: {
    // karaoke ball: an accent ball hops from glyph to glyph, each landing kicks its glyph into place
    name: 'バウンドボール', tags: ['pop', 'emotional'], w: 0.8, ae: 'pop', minDur: 0.8, maxChars: 20,
    inDur: (dur, n) => clamp(0.3 + n * 0.06, 0.45, Math.max(0.45, Math.min(1.25, dur * 0.6))),
    apply(env, it, p) {
      const vert = !!it.vertical, isx = it.sx || 1, isy = it.sy || 1, size = it.size;
      const lay = J.layoutText(it), gl = lay.filter(g => !isBlank(g.ch)), n = gl.length;
      if (!n) return;
      const hit = k => (n > 1 ? lerp(0.16, 0.76, k / (n - 1)) : 0.45);
      const hitOf = new Map(gl.map((g, k) => [g.i, hit(k)]));
      glyphs(it, (i, g) => {
        const h = hitOf.get(i); if (h == null) return null;
        if (p < h) return HIDE;
        const u = (p - h) / 0.2; if (u >= 1) return null;
        const sq = lerp(0.55, 1, oBack(u, 2.4)), gs = vert ? g.w * isx : g.h * isy;
        return vert ? { sx: sq, sy: 1 + 0.3 * (1 - oQuint(u)), dx: (1 - sq) * gs / 2 } : { sy: sq, sx: 1 + 0.3 * (1 - oQuint(u)), dy: (1 - sq) * gs / 2 };
      });
      const R = Math.max(3, size * 0.13), solo = n === 1;
      // contact point on each glyph (top edge; right edge for vertical text) and "up" direction
      const contact = g => { const [gx, gy] = glyphPos(g, isx, isy); return vert ? [gx + g.w * isx * 0.5 + R, gy] : [gx, gy - g.h * isy * 0.5 - R]; };
      const up = vert ? [1, 0] : [0, -1], fw = vert ? [0, 1] : [1, 0];
      const H = size * 0.6;
      let P0, P1, s, alpha = 1;
      const c0 = contact(gl[0]), cl = contact(gl[n - 1]);
      if (p < hit(0)) {
        const back = solo ? 0 : 1.3, t0 = solo ? hit(0) * 0.2 : 0;
        P0 = solo ? c0 : [c0[0] - fw[0] * size * back + up[0] * size * 0.5, c0[1] - fw[1] * size * back + up[1] * size * 0.5]; P1 = c0;
        s = (p - t0) / (hit(0) - t0); alpha = clamp(s * 6); if (s <= 0) return;
      }
      else if (p >= hit(n - 1)) { P0 = cl; P1 = [cl[0] + fw[0] * size * 1.4 - up[0] * size * 0.2, cl[1] + fw[1] * size * 1.4 - up[1] * size * 0.2]; s = (p - hit(n - 1)) / 0.2; alpha = 1 - sstep(0.4, 1, s); }
      else { let k = 1; while (k < n - 1 && p >= hit(k)) k++; P0 = contact(gl[k - 1]); P1 = contact(gl[k]); s = (p - hit(k - 1)) / (hit(k) - hit(k - 1)); }
      if (alpha <= 0.01 || s > 1 || !isMain(it)) return;
      const arc = solo && p < hit(0) ? size * 0.85 * (1 - s * s) : 4 * H * s * (1 - s);
      const bx = lerp(P0[0], P1[0], s) + up[0] * arc, by = lerp(P0[1], P1[1], s) + up[1] * arc;
      postLocal(it, (env2, b, x, A) => env2.circle(bx, by, R, env2.sc.accent, null, 1, A * alpha, false));
    },
  },

  snapRail: {
    // glyphs float off the line at random heights; an accent rail draws in and they all snap onto it
    name: 'スナップ整列', tags: ['graphic', 'pop', 'editorial'], w: 0.9, ae: 'assemble', minDur: 0.55,
    inDur: dur => clamp(dur * 0.5, 0.25, 0.9),
    apply(env, it, p) {
      const vert = !!it.vertical, size = it.size, seed = it.seed | 0;
      glyphs(it, (i, g, n) => {
        const d = J.r(seed, i, 53) * 0.2, a = clamp((p - d) / 0.2);
        if (a <= 0) return HIDE;
        const ts = 0.46 + J.r(seed, i, 54) * 0.06, sgn = J.r(seed, i, 51) < 0.5 ? -1 : 1;
        const off0 = sgn * size * (0.3 + 0.6 * J.r(seed, i, 52)), rot0 = J.rs(seed, i, 55) * 16;
        let off, rot, sq = 1;
        if (p < ts) { const k = 1 - 0.14 * (p / ts); off = off0 * k; rot = rot0 * k; }
        else {
          const t = (p - ts) / 0.13;
          if (t < 1) { const e = E.inCubic(t); off = off0 * 0.86 * (1 - e); rot = rot0 * 0.86 * (1 - e); }
          else { const u = clamp((t - 1) / 1.6); if (u >= 1) return null; off = -sgn * size * 0.06 * Math.sin(PI * u) * (1 - u); rot = 0; sq = 1 - 0.16 * Math.sin(PI * clamp(u * 2)) * (1 - u); }
        }
        const o = { a, rot };
        if (vert) { o.dx = off; o.sx = sq; o.sy = 1 / Math.sqrt(sq); } else { o.dy = off; o.sy = sq; o.sx = 1 / Math.sqrt(sq); }
        return o;
      });
      if (!isPrimary(it)) return;
      postLocal(it, (env2, b, x, A) => {
        const grow = oQuart(p / 0.4), flash = Math.exp(-Math.pow((p - 0.6) / 0.05, 2)), gone = sstep(0.68, 0.95, p);
        if (grow <= 0 || gone >= 1) return;
        const t = Math.max(2, size * 0.028) * (1 + flash * 1.2), isx = x.sx || 1, isy = x.sy || 1;
        for (const L of lines(x, b)) {
          const half = (L.u1 - L.u0) / 2 + size * 0.15, c = (L.u0 + L.u1) / 2, len = half * grow * (1 - gone);
          const v = L.v + (vert ? -1 : 1) * size * 0.62 * (vert ? isx : isy);
          if (vert) env2.rect(v - t / 2, c - len, t, len * 2, env2.sc.accent, A, false);
          else env2.rect(c - len, v - t / 2, len * 2, t, env2.sc.accent, A, false);
        }
      });
    },
  },

  fanOpen: {
    // glyphs start stacked like the ribs of a closed folding fan and sweep open around a pivot
    name: '扇開き', tags: ['emotional', 'graphic', 'calm'], w: 0.9, ae: 'spin',
    inDur: dur => clamp(dur * 0.45, 0.2, 0.8),
    apply(env, it, p) {
      const vert = !!it.vertical, isx = it.sx || 1, isy = it.sy || 1, size = it.size, b = box(it);
      // pivot under the start of the line (left of the top of a vertical column): the closed fan reads in order along one rib
      const R0 = size * 0.8 + (vert ? b.w : b.h) / 2;
      const pv = vert ? [b.x0 - R0, b.y0 + size * 0.5] : [b.x0 + size * 0.5, b.y1 + R0];
      let aMin = 1e9;
      for (const g of b.lay) { const [gx, gy] = glyphPos(g, isx, isy); aMin = Math.min(aMin, Math.atan2(gy - pv[1], gx - pv[0])); }
      const a0 = aMin - 0.45;
      const e = oBack(p, 1.15);
      glyphs(it, (i, g) => {
        const [gx, gy] = glyphPos(g, isx, isy), vx = gx - pv[0], vy = gy - pv[1];
        const d = (a0 - Math.atan2(vy, vx)) * (1 - e), c = Math.cos(d), s = Math.sin(d);
        const nx = c * vx - s * vy, ny = s * vx + c * vy;
        return { dx: nx - vx, dy: ny - vy, rot: d / DEG, a: clamp(p * 3.5) };
      });
    },
  },
  cylinder: {
    // the line is printed on a turning drum: glyphs wrap round from the back, then the drum unrolls flat
    name: '円筒回転', tags: ['graphic', 'pop', 'editorial'], w: 0.9, ae: 'spin',
    apply(env, it, p) {
      const vert = !!it.vertical, isx = it.sx || 1, isy = it.sy || 1, size = it.size, b = box(it);
      const U0 = vert ? b.y0 : b.x0, U1 = vert ? b.y1 : b.x1, uc = (U0 + U1) / 2;
      const R = Math.max(size * 0.6, (U1 - U0) / 2) / 1.2, dir = dirOf(env, 61);
      const phi = dir * (1 - oQuart(p)) * 2.4, flat = sstep(0.5, 1, p), bg = pick(env.sc.bg), col = colOf(it);
      const A = clamp(p * 6);
      glyphs(it, (i, g) => {
        const [gx, gy] = glyphPos(g, isx, isy), u = (vert ? gy : gx) - uc;
        const th = u / R + phi, cu = Math.cos(th);
        if (cu <= 0.04 && flat < 0.5) return HIDE;
        const nu = lerp(R * Math.sin(th), u, flat), k = lerp(Math.max(0.04, cu), 1, flat);
        const o = { a: A * lerp(clamp(cu * 1.6), 1, flat), color: J.mix(col, bg, (1 - lerp(clamp(cu), 1, flat)) * 0.6) };
        if (vert) { o.dy = nu - u; o.sy = k; } else { o.dx = nu - u; o.sx = k; }
        return o;
      });
    },
  },

  shuffle: {
    // the glyphs appear in shuffled slots, then trade places along over/under arcs like a shell game
    name: 'シャッフル', tags: ['pop', 'glitch', 'graphic'], w: 0.9, ae: 'scramble', minDur: 0.55,
    inDur: dur => clamp(dur * 0.5, 0.25, 0.9),
    apply(env, it, p) {
      const vert = !!it.vertical, size = it.size, seed = it.seed | 0;
      const S = { lay: null, perm: null };
      addPre(it, (env2, x) => {
        const lay = J.layoutText(x), ids = lay.filter(g => !isBlank(g.ch)).map(g => g.i), n = ids.length, arr = ids.slice();
        for (let k = n - 1; k > 0; k--) { const j = Math.floor(J.r(seed, k, 71) * (k + 1)); const t = arr[k]; arr[k] = arr[j]; arr[j] = t; }
        if (n > 1 && arr.every((v, k) => v === ids[k])) arr.push(arr.shift());
        const perm = new Map(); ids.forEach((id, k) => perm.set(id, arr[k]));
        S.lay = lay; S.perm = perm;
      });
      const A = clamp(p / 0.12), isx = it.sx || 1, isy = it.sy || 1;
      glyphs(it, (i, g, n) => {
        if (!S.lay) return null;
        const src = S.lay[S.perm.get(i) ?? i];
        const q = stg(clamp((p - 0.16) / 0.84), J.r(seed, i, 72), 0.3);
        if (q >= 1) return null;
        const [sx0, sy0] = glyphPos(src, isx, isy), [tx, ty] = glyphPos(g, isx, isy);
        const ex = sx0 - tx, ey = sy0 - ty, d = Math.hypot(ex, ey), e = ioCubic(q);
        if (d < 0.5) return { a: A, s: lerp(0.8, 1, oBack(q, 2)) };
        const sgn = (vert ? ey : ex) > 0 ? 1 : -1, h = Math.min(size * 0.85, d * 0.4) * Math.sin(PI * e);
        const nx = -ey / d * sgn, ny = ex / d * sgn;                         // perpendicular: moving forward arcs "over"
        return { dx: ex * (1 - e) + nx * h * (vert ? -1 : 1), dy: ey * (1 - e) + ny * h * (vert ? -1 : 1), s: 1 + sgn * 0.14 * Math.sin(PI * e), a: A };
      });
    },
  },

  stopMotion: {
    // stop-motion: glyphs jump toward their place in a handful of held key poses, each slightly off
    name: 'コマ撮り', tags: ['pop', 'emotional'], w: 0.8, ae: 'pop', minDur: 0.5,
    inDur: dur => clamp(dur * 0.45, 0.25, 0.8),
    apply(env, it, p) {
      const size = it.size, seed = it.seed | 0, K = 5;
      glyphs(it, (i, g, n) => {
        const q = stg(p, J.r(seed, i, 81) * 0.5 + ordLR(i, n) * 0.5, 0.45);
        if (q <= 0) return HIDE;
        const k = Math.min(K - 1, Math.floor(q * K));
        if (k >= K - 1) return null;
        const f = 1 - oCubic(k / (K - 1)), ang = J.r(seed, i, 82) * TAU, D = size * (0.7 + 0.5 * J.r(seed, i, 83));
        return { dx: Math.cos(ang) * D * f + J.rs(seed, i, k, 84) * size * 0.05, dy: Math.sin(ang) * D * f + J.rs(seed, i, k, 85) * size * 0.05,
          rot: J.rs(seed, i, k, 86) * 22 * f + J.rs(seed, i, 87) * 6 * f, s: 1 + J.rs(seed, i, k, 88) * 0.14 * f };
      });
    },
  },

  ripple: {
    // a ring wave spreads from the middle; each glyph surfaces as the crest passes and bobs once
    name: '波紋', tags: ['emotional', 'calm', 'graphic'], w: 1, ae: 'pop',
    apply(env, it, p) {
      const isx = it.sx || 1, isy = it.sy || 1, size = it.size, b0 = box(it);
      const Rmax = Math.hypot(b0.w, b0.h) / 2 + size * 0.3;
      glyphs(it, (i, g) => {
        const [gx, gy] = glyphPos(g, isx, isy), vx = gx - b0.cx, vy = gy - b0.cy, d = Math.hypot(vx, vy);
        const pd = 0.68 * d / Rmax, q = clamp((p - pd) / 0.32);
        if (q <= 0) return HIDE; if (q >= 1) return null;
        const w = Math.sin(q * PI * 2) * Math.pow(1 - q, 2), push = size * 0.28 * w;
        const o = { s: 1 + 0.4 * Math.sin(q * PI) * (1 - q), a: clamp(q * 5) };
        if (d > 1) { o.dx = vx / d * push; o.dy = vy / d * push; }
        return o;
      });
      if (!isMain(it)) return;
      postLocal(it, (env2, b, x, A) => {
        const lw = Math.max(1.5, size * 0.022);
        for (let k = 0; k < 2; k++) {
          const f = clamp(p / 0.68 - k * 0.12); if (f <= 0) continue;
          const r = Rmax * f * 1.05, a = A * (1 - f) * (k ? 0.5 : 0.85);
          if (a > 0.01 && r > 1) env2.circle(b.cx, b.cy, r, null, env2.sc.accent, lw * (1 - f * 0.5), a, false);
        }
      });
    },
  },

  zipper: {
    // a zip slider runs along the line; ahead of it the glyphs are split up/down like open teeth
    name: 'ジッパー', tags: ['graphic', 'pop'], w: 0.8, ae: 'slice',
    inDur: dur => clamp(dur * 0.42, 0.18, 0.75),
    apply(env, it, p) {
      const vert = !!it.vertical, isx = it.sx || 1, isy = it.sy || 1, size = it.size, b = box(it);
      const U0 = vert ? b.y0 : b.x0, U1 = vert ? b.y1 : b.x1, Lv = size * 2.4, A = size * 0.8;
      const s = lerp(U0 - size * 0.3, U1 + size * 0.4, E.inOutSine(clamp(p / 0.92)));
      const fade = clamp(p * 5), solo = glyphN(it) <= 1;
      glyphs(it, (i, g) => {
        const [gx, gy] = glyphPos(g, isx, isy), u = vert ? gy : gx;
        const o = clamp((u - s) / Lv + 0.25);
        if (o <= 0) return null;
        const sgn = ((g.ci + (solo ? it.mi | 0 : 0)) % 2 ? 1 : -1), e = Math.pow(o, 0.8) * A;
        return vert ? { dx: sgn * e, rot: -sgn * 14 * o, a: fade } : { dy: sgn * e, rot: sgn * 14 * o, a: fade };
      });
      if (!isPrimary(it)) return;
      postLocal(it, (env2, bb, x, A2) => {
        const a = A2 * fade * (1 - sstep(0.82, 0.98, p)); if (a <= 0.01) return;
        const w = size * 0.3, h = size * 0.46, col = env2.sc.accent;
        for (const L of lines(x, bb)) {
          const [px, py] = pt(vert, s, L.v);
          if (vert) env2.rrect(px - h / 2, py - w / 2, h, w, w * 0.2, col, a, false); else env2.rrect(px - w / 2, py - h / 2, w, h, w * 0.2, col, a, false);
          const tab = size * 0.2;
          if (vert) env2.rect(px + h / 2, py - tab * 0.25, tab, tab * 0.5, col, a, false); else env2.rect(px - tab * 0.25, py + h / 2, tab * 0.5, tab, col, a, false);
        }
      });
    },
  },

  zoomAlt: {
    // depth alternates: odd glyphs dive in from in front of the lens, even ones grow from far away
    name: '交互ズーム', tags: ['pop', 'graphic', 'glitch'], w: 0.9, ae: 'zoom',
    apply(env, it, p) {
      const size = it.size, bl = Math.min(30, size * 0.1);
      glyphs(it, (i, g, n) => {
        const q = stg(p, ordLR(i, n), 0.35);
        if (q <= 0) return HIDE; if (q >= 1) return null;
        if ((g.ci + (glyphN(it) <= 1 ? it.mi | 0 : 0)) % 2 === 0) { const e = oQuint(q); return { s: lerp(2.4, 1, e), blur: bl * (1 - e), a: clamp(q * 2.5) }; }
        return { s: Math.max(0.02, oBack(q, 2.2)), a: clamp(q * 4) };
      });
    },
  },

  tiltUp: {
    // the line lies flat on the floor and swings up on a hinge along its bottom edge
    name: '起立', tags: ['graphic', 'editorial', 'pop'], w: 0.9, ae: 'stretch',
    apply(env, it, p) {
      const th = 86 * spring(p, 3.2, 1.25), k = Math.max(0.03, Math.cos(th * DEG)), b = box(it), size = it.size;
      const bg = pick(env.sc.bg), col = colOf(it), main = isMain(it);
      it.sy = (it.sy || 1) * k; it._m = null; it._lay = null;
      moveLocal(it, 0, b.y1 * (1 - k));
      it.alpha = (it.alpha ?? 1) * clamp(p * 6);
      if (isHex(it.color)) it.color = J.mix(col, bg, (1 - k) * 0.55);
      if (!main) return;
      postLocal(it, (env2, bb, x, A) => {
        const a = A * (1 - sstep(0.35, 0.8, p)); if (a <= 0.01) return;
        const m = size * 0.2, t = Math.max(1.5, size * 0.025);
        env2.rect(bb.x0 - m, bb.y1 + t, bb.w + m * 2, t, env2.sc.accent, a, false);
      });
    },
  },

  stickerPeel: {
    // every glyph is pressed on like a die-cut sticker: the stuck part grows from one corner while
    // the rest is still folded back as a mirrored flap
    name: 'シール貼り', tags: ['pop', 'graphic', 'editorial'], w: 0.9, ae: 'wipe', minDur: 0.5,
    inDur: dur => clamp(dur * 0.45, 0.2, 0.85),
    apply(env, it, p) {
      const isx = it.sx || 1, isy = it.sy || 1, size = it.size, pad = size * 0.12, bg = pick(env.sc.bg), col = colOf(it);
      const qf = (i, n) => stg(p, ordLR(i, n), 0.5);
      // glyph box and fold offset along the 45° diagonal (bottom-left → top-right)
      const geo = (g, u) => {
        const [gx, gy] = glyphPos(g, isx, isy), hw = g.w * isx / 2 + pad, hh = g.h * isy / 2 + pad;
        const L = gx - hw, B = gy + hh, Sd = hw * 2 + hh * 2;
        return { gx, gy, L, R: gx + hw, T: gy - hh, B, c: lerp(-0.02, 1.02, ioCubic(u)) * Sd };
      };
      const quad = G => [[G.L, G.T], [G.R, G.T], [G.R, G.B], [G.L, G.B]];
      const side = G => v => G.c - ((v[0] - G.L) + (G.B - v[1]));        // ≥ 0 on the stuck side
      clipLocal(it, (ctx, b, x) => {
        const n = b.lay.N; let any = false;
        for (const g of b.lay) {
          if (isBlank(g.ch)) continue;
          const u = qf(g.i, n); if (u <= 0) continue;
          const G = geo(g, u), poly = u >= 1 ? quad(G) : clipHalf(quad(G), side(G));
          if (poly.length < 3) continue;
          poly.forEach((v, k) => (k ? ctx.lineTo(v[0], v[1]) : ctx.moveTo(v[0], v[1]))); ctx.closePath(); any = true;
        }
        if (!any) ctx.rect(0, 0, 0, 0);
      });
      // the free part of each sticker is still lifted ~62° off the surface: seen from the front it is the
      // glyph foreshortened toward the fold line (drawn in every pass so the chromatic ghosts stay consistent)
      addPost(it, (env2, x) => {
        const A = clamp(x.alpha ?? 1); if (A <= 0.01) return;
        const lay = J.layoutText(x), n = lay.N, ctx = env2.ctx, lift = J.mix(col, bg, 0.3);
        for (const g of lay) {
          if (isBlank(g.ch)) continue;
          const u = qf(g.i, n); if (u <= 0 || u >= 1) continue;
          const G = geo(g, u), sd = side(G), poly = clipHalf(quad(G), v => -sd(v));
          if (poly.length < 3) continue;
          const px = G.L + G.c / 2, py = G.B - G.c / 2, kk = 1 - Math.cos(62 * DEG), m11 = 1 - kk / 2, m12 = kk / 2;
          ctx.save(); toLocal(ctx, x);
          ctx.translate(px, py); ctx.transform(m11, m12, m12, m11, 0, 0); ctx.translate(-px, -py);
          ctx.beginPath(); poly.forEach((v, k) => (k ? ctx.lineTo(v[0], v[1]) : ctx.moveTo(v[0], v[1]))); ctx.closePath(); ctx.clip();
          const gi = g.i;
          J.drawItem(env2, Object.assign({}, x, STRIP, { x: 0, y: 0, rot: 0, skew: 0, charFn: j => (j === gi ? null : HIDE), shadow: null, extrude: null,
            gradient: null, pattern: null, color: lift, strokeColor: lift, alpha: A * clamp(u * 6) }));
          ctx.restore();
        }
      });
    },
  },

  /* ================= PAPER ================= */

  crumple: {
    // each glyph arrives as a crumpled ball of its own strokes and springs open flat
    name: 'くしゃ戻り', tags: ['pop', 'graphic', 'emotional'], w: 0.7, ae: 'assemble', pieces: true, minDur: 0.5,
    inDur: dur => clamp(dur * 0.45, 0.22, 0.8),
    apply(env, it, p) {
      if (p >= 1) return;
      const seed = it.seed | 0, isx = it.sx || 1, isy = it.sy || 1, N = Math.max(1, J.layoutText(it).N);
      if (it.fill === false || it.gradient) {
        glyphs(it, (i, g, n) => { const q = stg(p, ordLR(i, n), 0.45); if (q <= 0) return HIDE; if (q >= 1) return null;
          const e = oBack(q, 1.6); return { s: lerp(0.35, 1, e), rot: J.rs(seed, i, 92) * 120 * (1 - e), a: clamp(q * 4) }; });
        return;
      }
      it.pieceFns.push((ci, pj, pc, ox, oy, g) => {
        const q = stg(p, N > 1 ? ci / (N - 1) : 0, 0.45);
        if (q <= 0) return null; if (q >= 1) return J.PID;
        const gx = g ? (g.x + g.vx) * isx : ox, gy = g ? (g.y + g.vy) * isy : oy, vx = ox - gx, vy = oy - gy;
        const tB = 0.3;
        let k, beta, s, a = 1, rot;
        const rot0 = J.rs(seed, ci, pj, 91) * 160, beta0 = J.rs(seed, ci, 92) * 2.4;
        if (q < tB) { const t = q / tB; k = 0.78; beta = beta0 * (1.3 - 0.3 * t); s = 0.72 * oBack(t, 2); a = clamp(t * 4); rot = rot0; }
        else { const t = (q - tB) / (1 - tB); if (t > 0.95) return J.PID; const e = oBack(t, 1.5); k = 0.78 * (1 - e); beta = beta0 * (1 - e); s = lerp(0.72, 1, e); rot = rot0 * (1 - e); }
        const c = Math.cos(beta), sn = Math.sin(beta), fx = vx * (1 - k), fy = vy * (1 - k);
        const nx = c * fx - sn * fy, ny = sn * fx + c * fy;
        return J.PT(nx - vx, ny - vy, rot + beta / DEG, s, 1, 0, a);
      });
    },
  },

  noteUnfold: {
    // every glyph is a note folded in four: the top-left quarter shows, the right half swings open on the
    // vertical crease, then the bottom half swings down on the horizontal crease
    name: '手紙開き', tags: ['emotional', 'calm', 'graphic'], w: 0.8, ae: 'pop', minDur: 0.6,
    inDur: dur => clamp(dur * 0.5, 0.25, 0.9),
    apply(env, it, p) {
      const col = colOf(it), bg = pick(env.sc.bg), size = it.size, isx = it.sx || 1, isy = it.sy || 1;
      const qf = (i, n) => stg(p, ordLR(i, n), 0.45);
      const T1 = [0.14, 0.52], T2 = [0.5, 0.94];
      const op = (q, T) => oCubic(clamp((q - T[0]) / (T[1] - T[0])));
      const shade = e => J.mix(col, bg, (1 - e) * 0.55);
      const main = glyphs(it, (i, g, n) => {
        const q = qf(i, n);
        if (q <= 0) return HIDE; if (q >= 1) return null;
        if (g.r90) return { a: clamp(q * 2) };
        if (q < T1[1]) return { a: clamp(q / T1[0]), s: lerp(0.9, 1, oBack(q / T1[0], 2)), clipX: [-0.64, 0.004], clipY: [-0.66, 0.004] };
        return { clipX: [-0.7, 0.7], clipY: [-0.66, 0.004] };
      });
      addPost(it, (env2, x) => {
        copyDraw(env2, x, main, (i, g, n) => {
          const q = qf(i, n); if (q <= T1[0] || q >= T1[1] || g.r90) return HIDE;
          const e = op(q, T1);
          return { sx: Math.max(0.03, e), clipX: [0, 0.64], clipY: [-0.66, 0.004], color: shade(e) };
        }, { shadow: null, extrude: null });
        copyDraw(env2, x, main, (i, g, n) => {
          const q = qf(i, n); if (q <= T2[0] || q >= 1 || g.r90) return HIDE;
          const e = op(q, T2);
          return { sy: Math.max(0.03, e), clipY: [0, 0.66], clipX: [-0.7, 0.7], color: shade(e) };
        }, { shadow: null, extrude: null });
        if (env2.pass !== 'main' || !isMain(x)) return;
        const A = clamp(x.alpha ?? 1), lay = J.layoutText(x), n = lay.N, ctx = env2.ctx, lw = Math.max(1, size * 0.012), cc = env2.sc.sub;
        ctx.save(); toLocal(ctx, x);
        for (const g of lay) {                                                // faint creases while the note is still folded
          if (isBlank(g.ch) || g.r90) continue;
          const q = qf(g.i, n); if (q <= 0 || q >= 1) continue;
          const [gx, gy] = glyphPos(g, isx, isy), hw = g.w * isx * 0.55, hh = g.h * isy * 0.58, a = A * 0.6 * (1 - sstep(0.85, 1, q)) * clamp(q * 6);
          env2.line([[gx, gy - hh], [gx, q < T1[1] ? gy : gy + hh]], cc, lw, a, false);
          env2.line([[gx - hw, gy], [q < T1[0] ? gx : gx + hw, gy]], cc, lw, a, false);
        }
        ctx.restore();
      });
    },
  },

  tornJoin: {
    // the line is torn in two along a ragged seam; the halves slide in from opposite sides and butt together
    name: '破れ合わせ', tags: ['graphic', 'emotional', 'pop'], w: 0.8, ae: 'slice',
    inDur: dur => clamp(dur * 0.42, 0.18, 0.75),
    apply(env, it, p) {
      const vert = !!it.vertical, size = it.size, seed = it.seed | 0, b0 = box(it);
      const D = size * 2 + (vert ? b0.h : b0.w) * 0.25, e = oQuart(p / 0.72), k = 1 - e;
      const hit = sstep(0.62, 0.72, p) * (1 - sstep(0.72, 1, p));
      const seam = b => {                                                   // ragged seam across the reading axis (local coords)
        const U = vert ? b.cy : b.cx, V0 = (vert ? b.x0 : b.y0) - size * 0.15, V1 = (vert ? b.x1 : b.y1) + size * 0.15, K = 11, out = [];
        for (let j = 0; j <= K; j++) out.push([U + J.rs(seed, j, 95) * size * 0.1 + (j % 2 ? 1 : -1) * size * 0.03, lerp(V0, V1, j / K)]);
        return out;
      };
      const half = (b, side, ov = 0) => {                                   // polygon of one half in local coords (ov: overlap into the other half)
        const s = seam(b), far = (vert ? b.h : b.w) + size * 6, U = vert ? b.cy : b.cx;
        const pts = s.map(([u, v]) => pt(vert, u - side * ov, v));
        const cap = [pt(vert, U + side * far, s[s.length - 1][1]), pt(vert, U + side * far, s[0][1])];
        return pts.concat(cap);
      };
      const path = (ctx, poly) => { poly.forEach((q, j) => (j ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); ctx.closePath(); };
      const shift = (x, side) => { const o = Object.assign({}, x); const d = side * D * k; if (vert) o.y += d; else o.x += d; o.rot = (x.rot || 0) + side * 5 * k; return o; };
      const fib = pick(env.sc.fg), fa = 1 - sstep(0.7, 0.95, p), prim = isPrimary(it);
      it.alpha = (it.alpha ?? 1) * clamp(p * 5);
      const jolt = hit * size * 0.035 * Math.sin(p * 90);
      if (vert) it.x += jolt; else it.y += jolt;
      const fibres = (env2, q) => {                                         // paper fibres along a torn edge
        const ctx = env2.ctx; ctx.save(); toLocal(ctx, q);
        env2.line(seam(box(q)).map(([u, v]) => pt(vert, u, v)), J.mix(fib, pick(env2.sc.bg), 0.35), Math.max(1, size * 0.018), fa * 0.8 * clamp(q.alpha ?? 1), false);
        ctx.restore();
      };
      if (k <= 1e-4) {                                                      // the halves have met: draw the line whole, only the fibres linger
        if (fa > 0.01 && prim) addPost(it, (env2, x) => { if (env2.pass === 'main') fibres(env2, x); });
        return;
      }
      const dX = -(vert ? 0 : D * k), dY = -(vert ? D * k : 0), dR = -5 * k;
      it.x += dX; it.y += dY; it.rot = (it.rot || 0) + dR;
      clipLocal(it, (ctx, b) => path(ctx, half(b, -1)));
      addPre(it, (env2, x) => {
        const o = Object.assign({}, x, { x: x.x - 2 * dX, y: x.y - 2 * dY, rot: (x.rot || 0) - 2 * dR });
        const ctx = env2.ctx; ctx.save(); ctx.beginPath(); ctx.save(); toLocal(ctx, o); path(ctx, half(box(o), 1, 1.2 / (env2.scale || 1))); ctx.restore(); ctx.clip();
        copyDraw(env2, o, null, null);
        ctx.restore();
        if (fa > 0.01 && env2.pass === 'main' && prim) { fibres(env2, x); fibres(env2, o); }
      });
    },
  },

  splitFlap: {
    // split-flap display (パタパタ): each glyph flaps through a few random characters before landing on its own
    name: 'パタパタ', tags: ['glitch', 'editorial', 'graphic'], w: 0.9, ae: 'scramble', minDur: 0.75,
    inDur: (dur, n) => clamp(0.35 + n * 0.03, 0.45, Math.max(0.45, Math.min(1.0, dur * 0.55))),
    apply(env, it, p) {
      const seed = it.seed | 0, col = colOf(it), bg = pick(env.sc.bg), size = it.size, isx = it.sx || 1, isy = it.sy || 1;
      const st = (i, n) => {
        const q = stg(p, ordLR(i, n), 0.4), F = 3 + (i % 2);
        if (q <= 0 || q >= 1) return { q, F };
        const x = q * F, j = Math.min(F - 1, Math.floor(x)), f = x - j;
        const chOf = k => (k <= 0 ? null : k >= F ? '' : J.pool('signs')[J.h(seed, i, k, 97) % J.pool('signs').length]);
        return { q, F, j, f, oldCh: chOf(j), newCh: chOf(j + 1) };
      };
      const ch = c => (c ? { ch: c } : {});
      const main = glyphs(it, (i, g, n) => {
        const S = st(i, n);
        if (S.q <= 0) return HIDE; if (S.q >= 1) return null;
        if (g.r90) return { a: S.q };
        const c1 = S.f < 0.5 ? Math.cos(S.f * PI) : 0;
        return Object.assign({ clipY: [-0.64, -0.64 * c1], clipX: [-0.7, 0.7] }, ch(S.newCh));
      });
      addPre(it, (env2, x) => {
        copyDraw(env2, x, main, (i, g, n) => {                               // old character's bottom half, until the new leaf covers it
          const S = st(i, n); if (S.q <= 0 || S.q >= 1 || g.r90 || S.oldCh === null) return HIDE;
          const c2 = S.f >= 0.5 ? -Math.cos(S.f * PI) : 0;
          return Object.assign({ clipY: [0.64 * c2, 0.66], clipX: [-0.7, 0.7] }, ch(S.oldCh));
        }, { shadow: null });
      });
      addPost(it, (env2, x) => {
        copyDraw(env2, x, main, (i, g, n) => {                               // the falling leaf
          const S = st(i, n); if (S.q <= 0 || S.q >= 1 || g.r90) return HIDE;
          if (S.f < 0.5) {
            if (S.oldCh === null) return HIDE;
            const c = Math.max(0.03, Math.cos(S.f * PI));
            return Object.assign({ sy: c, clipY: [-0.64, 0], clipX: [-0.7, 0.7], color: J.mix(col, bg, (1 - c) * 0.5) }, ch(S.oldCh));
          }
          const c = Math.max(0.03, -Math.cos(S.f * PI));
          return Object.assign({ sy: c, clipY: [0, 0.66], clipX: [-0.7, 0.7], color: J.mix(col, bg, (1 - c) * 0.5) }, ch(S.newCh));
        }, { shadow: null });
        if (env2.pass !== 'main') return;
        const A = clamp(x.alpha ?? 1), lay = J.layoutText(x), n = lay.N, ctx = env2.ctx;
        ctx.save(); toLocal(ctx, x);
        for (const g of lay) {                                              // the hairline gap between the two flaps
          if (isBlank(g.ch) || g.r90) continue;
          const S = st(g.i, n); if (S.q <= 0 || S.q >= 1) continue;
          const [gx, gy] = glyphPos(g, isx, isy), w = g.w * isx * 1.04, t = Math.max(1, size * 0.018);
          env2.rect(gx - w / 2, gy - t / 2, w, t, bg, A, false);
        }
        ctx.restore();
      });
    },
  },

  /* ================= LIGHT ================= */

  overexpose: {
    // the line flashes in blown-out white (bloom + glow) and the exposure is pulled down to its real colour
    name: '露出オーバー', tags: ['emotional', 'pop', 'glitch'], w: 1, ae: 'blur',
    inDur: dur => clamp(dur * 0.42, 0.18, 0.75),
    apply(env, it, p) {
      const hot = hotOf(env, it), size = it.size, tF = 0.12;
      const ex = p < tF ? 1 : 1 - E.inOutSine(clamp((p - tF) / (1 - tF)));
      if (p < tF) it.alpha = (it.alpha ?? 1) * E.outCubic(p / tF);
      if (isHex(it.color)) it.color = J.mix(it.color, hot, ex * 0.96);
      const sc0 = isHex(it.strokeColor) ? it.strokeColor : colOf(it);
      if (it.stroke > 0 || it.fill === false) it.strokeColor = J.mix(sc0, hot, ex * 0.96);
      if (it.fill !== false && ex > 0.02) { it.stroke = (it.stroke || 0) + size * 0.045 * ex; it.strokeColor = it.stroke > size * 0.045 * ex + 0.01 ? it.strokeColor : J.mix(colOf(it), hot, 1); it.strokeUnder = false; }
      it.blur = (it.blur || 0) + Math.min(14, size * 0.04) * ex * ex;
      if (!it.shadow && ex > 0.02) it.shadow = { color: J.rgba(hot, 0.9 * ex), blur: Math.min(90, size * 0.5) * ex, dx: 0, dy: 0 };
      scaleAbout(it, 1 + 0.06 * ex);
    },
  },

  glint: {
    // the line waits as a faint ghost; a slanted glint sweeps across and leaves it lit behind the highlight
    name: 'グリント', tags: ['editorial', 'emotional', 'graphic'], w: 1, ae: 'wipe',
    inDur: dur => clamp(dur * 0.45, 0.2, 0.8),
    apply(env, it, p) {
      const vert = !!it.vertical, size = it.size, kS = 0.45, hot = J.lum(colOf(it)) > 0.7 || J.lum(pick(env.sc.bg)) > 0.5 ? pick(env.sc.accent, env.sc.fg) : '#ffffff';
      const geo = b => {
        const U0 = vert ? b.y0 : b.x0, U1 = vert ? b.y1 : b.x1, V0 = (vert ? b.x0 : b.y0) - size * 0.3, V1 = (vert ? b.x1 : b.y1) + size * 0.3, vc = (V0 + V1) / 2;
        const bw = size * 0.55, sl = kS * (V1 - V0) / 2;
        return { U0, U1, V0, V1, vc, bw, B: lerp(U0 - bw - sl, U1 + bw + sl, E.inOutSine(clamp(p / 0.9))), big: (U1 - U0) + size * 8 };
      };
      // region where u + kS·(v - vc) is between a and b
      const band = (ctx, G, a, b) => {
        const q = [[a - kS * (G.V0 - G.vc), G.V0], [b - kS * (G.V0 - G.vc), G.V0], [b - kS * (G.V1 - G.vc), G.V1], [a - kS * (G.V1 - G.vc), G.V1]];
        q.forEach(([u, v], j) => { const P2 = pt(vert, u, v); j ? ctx.lineTo(P2[0], P2[1]) : ctx.moveTo(P2[0], P2[1]); }); ctx.closePath();
      };
      clipLocal(it, (ctx, b) => { const G = geo(b); band(ctx, G, G.U0 - G.big, G.B); });
      const ghostA = 0.2 * clamp(p * 6);
      addPre(it, (env2, x) => {
        const ctx = env2.ctx, G = geo(box(x));
        ctx.save(); ctx.beginPath(); ctx.save(); toLocal(ctx, x); band(ctx, G, G.B, G.U1 + G.big); ctx.restore(); ctx.clip();
        copyDraw(env2, x, null, null, { alpha: (x.alpha ?? 1) * ghostA, shadow: null });
        ctx.restore();
      });
      addPost(it, (env2, x) => {
        if (env2.pass !== 'main') return;
        const ctx = env2.ctx, G = geo(box(x)), A = clamp(x.alpha ?? 1) * (1 - sstep(0.85, 1, p));
        for (const [a, b, al] of [[G.B - G.bw, G.B + G.bw * 0.15, 0.45], [G.B - G.bw * 0.45, G.B, 1]]) {
          ctx.save(); ctx.beginPath(); ctx.save(); toLocal(ctx, x); band(ctx, G, a, b); ctx.restore(); ctx.clip();
          copyDraw(env2, x, null, null, { color: hot, strokeColor: hot, alpha: A * al, shadow: null, gradient: null, pattern: null });
          ctx.restore();
        }
      });
    },
  },

  loupe: {
    // a magnifying glass slides along the line; glyphs swell under the lens and are left sharp behind it
    name: 'ルーペ', tags: ['editorial', 'pop', 'calm'], w: 0.8, ae: 'zoom', minDur: 0.6,
    inDur: dur => clamp(dur * 0.5, 0.25, 0.9),
    apply(env, it, p) {
      const vert = !!it.vertical, isx = it.sx || 1, isy = it.sy || 1, size = it.size, b = box(it);
      const U0 = vert ? b.y0 : b.x0, U1 = vert ? b.y1 : b.x1, V0 = vert ? b.x0 : b.y0, V1 = vert ? b.x1 : b.y1, vc = (V0 + V1) / 2;
      const r = Math.max(size * 0.95, (V1 - V0) * 0.62);
      const Lc = lerp(U0 - r * 0.7, U1 + r * 1.4, E.inOutSine(clamp(p / 0.9)));
      const pre = 0.14 * clamp(p * 5), fin = clamp(p * 6);
      glyphs(it, (i, g) => {
        const [gx, gy] = glyphPos(g, isx, isy), u = vert ? gy : gx, v = vert ? gx : gy;
        const du = u - Lc, dv = v - vc, d = Math.hypot(du, dv) / r;
        if (d >= 1) return du > 0 ? { a: pre } : null;
        const m = 1 - d * d, o = { s: 1 + 0.6 * m, a: fin * (du > 0 ? lerp(pre, 1, Math.min(1, m * 3)) : 1) };
        const push = 0.35 * m;
        if (vert) { o.dy = du * push; o.dx = dv * push; } else { o.dx = du * push; o.dy = dv * push; }
        return o;
      });
      if (!isPrimary(it)) return;
      postLocal(it, (env2, bb, x, A) => {
        const a = A * clamp(p * 8) * (1 - sstep(0.8, 0.97, p)); if (a <= 0.01) return;
        const [cx, cy] = pt(vert, Lc, vc), lw = Math.max(2, size * 0.05), col = env2.sc.accent;
        env2.circle(cx, cy, r, null, col, lw, a, false);
        env2.arc(cx, cy, r * 0.8, 200, 250, env2.sc.fg, lw * 0.5, a * 0.5, false);
        const hx = cx + Math.cos(PI / 4) * r, hy = cy + Math.sin(PI / 4) * r;
        env2.line([[hx, hy], [hx + r * 0.55, hy + r * 0.55]], col, lw * 2, a, false);
      });
    },
  },

  filmFeed: {
    // projector losing its loop: the frame rolls through the gate with a frame line, the lamp flickers, then it locks
    name: 'フィルム送り', tags: ['emotional', 'glitch', 'editorial'], w: 0.8, ae: 'flicker', minDur: 0.55,
    inDur: dur => clamp(dur * 0.48, 0.22, 0.85),
    apply(env, it, p) {
      const size = it.size, seed = env.cut.seed | 0, b = box(it), R0 = dRange(it, b);
      const FH = (R0.y1 - R0.y0) + size * 0.7, e = oCubic(p / 0.82);
      const off = ((FH * 2.35 * (1 - e)) % FH + FH) % FH;
      const gate = [(R0.y0 + R0.y1) / 2 - FH / 2, (R0.y0 + R0.y1) / 2 + FH / 2];
      const fl = 1 - sstep(0.55, 0.95, p);
      it.alpha = (it.alpha ?? 1) * clamp(p * 7) * (1 - 0.45 * fl * J.r(seed, env.step, 99));
      it.x += J.rs(seed, env.step, 98) * size * 0.02 * fl;
      if (off < 0.5) return;
      it.y += off;
      it.clipY = [gate[0], gate[1]];
      addPre(it, (env2, x) => {
        const ctx = env2.ctx; ctx.save(); ctx.beginPath(); ctx.rect(-env2.W, gate[0], env2.W * 3, FH); ctx.clip();
        copyDraw(env2, Object.assign({}, x, { y: x.y - FH }), null, null);
        ctx.restore();
        const yb = gate[0] + off - size * 0.06, w = (R0.x1 - R0.x0) + size * 1.2;
        env2.rect((R0.x0 + R0.x1) / 2 - w / 2, yb, w, size * 0.12, J.mix(pick(env2.sc.bg), pick(env2.sc.fg), 0.18), clamp(x.alpha ?? 1), false);
      });
    },
  },

  backlight: {
    // a halo of light rises behind the line first, the glyphs read as dark silhouettes against it, then light up
    name: '逆光', tags: ['emotional', 'calm'], w: 0.9, ae: 'blur', minDur: 0.5,
    inDur: dur => clamp(dur * 0.48, 0.22, 0.85),
    apply(env, it, p) {
      const size = it.size, bg = pick(env.sc.bg), col = colOf(it), glow = pick(env.sc.accent, env.sc.fg);
      const rise = oCubic(p / 0.4), lit = E.inOutSine(clamp((p - 0.3) / 0.6)), halo = rise * (1 - sstep(0.45, 1, p)), main = isMain(it);
      if (isHex(it.color)) it.color = J.mix(J.mix(bg, col, 0.12), col, lit);
      if (it.fill === false && isHex(it.strokeColor || it.color)) it.strokeColor = J.mix(bg, it.strokeColor || col, Math.max(0.25, lit));
      it.alpha = (it.alpha ?? 1) * clamp(p * 5);
      if (!it.shadow && halo > 0.01) it.shadow = { color: J.rgba(glow, 0.95 * halo), blur: Math.min(110, size * 0.55) * (0.5 + 0.5 * rise), dx: 0, dy: 0 };
      scaleAbout(it, 1 + 0.035 * (1 - lit));
      if (!main) return;
      preLocal(it, (env2, b, x, A) => {
        if (env2.pass !== 'main' || halo <= 0.01) return;
        const ctx = env2.ctx, r = Math.hypot(b.w, b.h) / 2 + size * 0.8;
        const g = ctx.createRadialGradient(b.cx, b.cy, 0, b.cx, b.cy, r);
        g.addColorStop(0, J.rgba(glow, 0.3 * halo * A)); g.addColorStop(1, J.rgba(glow, 0));
        ctx.fillStyle = g; ctx.fillRect(b.cx - r, b.cy - r, r * 2, r * 2);
      });
    },
  },

  lightLeak: {
    // a warm light leak drifts along the line; each glyph burns in hot where it passes and cools to its colour
    name: '光漏れ', tags: ['emotional', 'calm', 'pop'], w: 0.9, ae: 'blur',
    inDur: dur => clamp(dur * 0.5, 0.25, 0.9),
    apply(env, it, p) {
      const vert = !!it.vertical, isx = it.sx || 1, isy = it.sy || 1, size = it.size, b = box(it);
      const warm = pick(env.sc.accent, env.sc.fg), dark = J.lum(pick(env.sc.bg)) < 0.5, core = J.mix(warm, '#ffffff', dark ? 0.45 : 0.2), col = colOf(it);
      const U0 = vert ? b.y0 : b.x0, U1 = vert ? b.y1 : b.x1, span = Math.max(1, U1 - U0), bl = Math.min(20, size * 0.06);
      glyphs(it, (i, g) => {
        const [gx, gy] = glyphPos(g, isx, isy), f = ((vert ? gy : gx) - U0) / span;
        const q = clamp((p - 0.55 * f) / 0.45);
        if (q <= 0) return HIDE; if (q >= 1) return null;
        const e = oCubic(q), heat = 1 - e;
        return { a: clamp(q * 4), color: J.mix(col, heat > 0.6 ? J.mix(warm, core, (heat - 0.6) / 0.4) : warm, Math.min(1, heat * 1.5)), s: 1 + 0.07 * heat, blur: bl * heat * heat };
      });
      if (!isPrimary(it)) return;
      postLocal(it, (env2, bb, x, A) => {
        if (env2.pass !== 'main') return;
        const a = A * clamp(p * 6) * (1 - sstep(0.55, 0.95, p)); if (a <= 0.01) return;
        const ctx = env2.ctx, H = lerp(U0 - size * 0.5, U1 + size * 0.5, clamp(p / 0.62));
        const [cx, cy] = pt(vert, H, vert ? bb.cx : bb.cy), r = Math.max(size * 1.4, (vert ? bb.w : bb.h) * 1.1);
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        const tint = dark ? warm : J.mix(warm, '#ffffff', 0.55), k = dark ? 0.55 : 0.4;
        g.addColorStop(0, J.rgba(dark ? core : tint, k * a)); g.addColorStop(0.45, J.rgba(tint, k * 0.4 * a)); g.addColorStop(1, J.rgba(tint, 0));
        ctx.globalCompositeOperation = dark ? 'screen' : 'multiply';
        ctx.fillStyle = g; ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
      });
    },
  },

  heatHaze: {
    // the line shimmers in through heat haze: thin slices wobble sideways and calm down
    name: '陽炎', tags: ['emotional', 'calm', 'glitch'], w: 0.9, ae: 'slice',
    inDur: dur => clamp(dur * 0.45, 0.2, 0.8),
    apply(env, it, p) {
      const vert = !!it.vertical, size = it.size, R = dRange(it, box(it)), t = env.lt;
      const amp = size * 0.36 * (1 - E.inOutSine(p));
      it.alpha = (it.alpha ?? 1) * E.outCubic(clamp(p * 2.4));
      if (env.pass !== 'main' || amp < 0.5) return;                        // the lagged ghost copies stay undistorted (cost)
      const pad = size * 0.3;
      if (!vert) {
        const y0 = R.y0 - pad, h = R.y1 - R.y0 + pad * 2, n = clamp(Math.round(h / (size * 0.085)), 8, 14);
        it.bands = [];
        for (let k = 0; k < n; k++) it.bands.push([y0 + h * k / n, y0 + h * (k + 1) / n + 0.5, amp * Math.sin(k * 0.9 + t * 17) * (0.55 + 0.45 * Math.sin(k * 0.37 + t * 6))]);
      } else {
        const x0 = R.x0 - pad, w = R.x1 - R.x0 + pad * 2, n = clamp(Math.round(w / (size * 0.085)), 8, 14);
        it.vbands = [];
        for (let k = 0; k < n; k++) it.vbands.push([x0 + w * k / n, x0 + w * (k + 1) / n + 0.5, amp * Math.sin(k * 0.9 + t * 17) * (0.55 + 0.45 * Math.sin(k * 0.37 + t * 6))]);
      }
    },
  },

  /* ================= DIGITAL ================= */

  crtOn: {
    // CRT power-on: a bright dot stretches into a scan line, which opens vertically into the text
    name: 'CRT電源', tags: ['glitch', 'pop', 'graphic'], w: 0.9, ae: 'stretch',
    apply(env, it, p) {
      const size = it.size, b = box(it), hot = hotOf(env, it), col = colOf(it), prim = isPrimary(it);
      const e1 = oQuart(p / 0.3), e2 = oBack(clamp((p - 0.24) / 0.5), 1.6), cool = sstep(0.3, 0.95, p);
      const ky = Math.max(0.012, e2), kx = lerp(1.18, 1, oCubic((p - 0.24) / 0.5));
      scaleXY(it, kx, ky, b);
      if (isHex(it.color)) it.color = J.mix(col, hot, 1 - cool);
      it.alpha = (it.alpha ?? 1) * (p < 0.24 ? 0 : 1);
      if (!prim) return;
      addPost(it, (env2, x) => {
        const la = (1 - sstep(0.3, 0.55, p)) * clamp(p * 12);
        if (la <= 0.01) return;
        const ctx = env2.ctx, bb = box(x); ctx.save(); toLocal(ctx, x);
        const w = (b.w + size * 0.6) * e1, th = Math.max(2, size * 0.045) * (1 + 2 * sstep(0.2, 0.3, p));
        env2.rect(bb.cx - w / 2, bb.cy - th * 2, w, th * 4, hot, la * 0.25, false);
        env2.rect(bb.cx - w / 2, bb.cy - th / 2, w, th, hot, la, false);
        ctx.restore();
      });
    },
  },

  interlace: {
    // interlaced scan: the even scanlines are drawn top to bottom, then a second field fills the odd ones
    name: 'インターレース', tags: ['glitch', 'graphic', 'editorial'], w: 0.9, ae: 'slice',
    apply(env, it, p) {
      const size = it.size, hr = Math.max(2.5, size * 0.065);
      const geo = b => { const pad = size * 0.25, V0 = b.y0 - pad, V1 = b.y1 + pad; return { V0, V1, n: Math.min(260, Math.ceil((V1 - V0) / hr)) }; };
      const f1 = clamp(p / 0.52), f2 = clamp((p - 0.48) / 0.52);
      clipLocal(it, (ctx, b, x, env2) => {
        const G = geo(b), x0 = b.x0 - size, w = b.w + size * 2, ov = 1.2 / (env2.scale || 1); let any = false;
        for (let k = 0; k < G.n; k++) {
          const y = G.V0 + k * hr, f = k % 2 ? f2 : f1;
          if ((y - G.V0) / (G.V1 - G.V0) < f) { ctx.rect(x0, y - ov / 2, w, hr + ov); any = true; }
        }
        if (!any) ctx.rect(0, 0, 0, 0);
      });
      if (!isPrimary(it)) return;
      postLocal(it, (env2, b, x, A) => {
        const G = geo(b), f = p < 0.5 ? f1 : f2; if (f <= 0 || f >= 1) return;
        const y = lerp(G.V0, G.V1, f), m = size * 0.3, fade = p < 0.5 ? 1 : 1 - sstep(0.85, 0.99, f);
        env2.rect(b.x0 - m, y - 1, b.w + m * 2, Math.max(1.5, size * 0.02), hotOf(env2, x), A * 0.9 * fade, false);
      });
    },
  },

  loadingBar: {
    // a progress bar fills in uneven bursts (with a % counter); glyphs pop up as the bar passes under them
    name: 'ローディング', tags: ['graphic', 'editorial', 'glitch'], w: 0.8, ae: 'wipe', minDur: 0.7,
    inDur: dur => clamp(dur * 0.55, 0.3, 1.0),
    apply(env, it, p) {
      const vert = !!it.vertical, isx = it.sx || 1, isy = it.sy || 1, size = it.size, seed = env.cut.seed | 0;
      const keys = [[0.06, 0], [0.2, 0.16 + 0.08 * J.r(seed, 1)], [0.3, 0.24 + 0.08 * J.r(seed, 2)], [0.42, 0.52 + 0.1 * J.r(seed, 3)], [0.52, 0.6 + 0.08 * J.r(seed, 4)], [0.7, 1]];
      let pr = 0;
      for (let k = 1; k < keys.length; k++) if (p >= keys[k - 1][0]) pr = lerp(keys[k - 1][1], keys[k][1], oCubic((p - keys[k - 1][0]) / (keys[k][0] - keys[k - 1][0])));
      const b0 = box(it), U0 = vert ? b0.y0 : b0.x0, U1 = vert ? b0.y1 : b0.x1, span = Math.max(1, U1 - U0);
      glyphs(it, (i, g) => {
        const [gx, gy] = glyphPos(g, isx, isy), f = ((vert ? gy : gx) - U0) / span;
        const q = clamp((pr - f) / 0.12 + 0.35);
        if (q <= 0) return HIDE; if (q >= 1) return null;
        const e = oBack(q, 2);
        return vert ? { a: clamp(q * 3), dx: -(1 - e) * size * 0.25 } : { a: clamp(q * 3), dy: (1 - e) * size * 0.25 };
      });
      if (!isPrimary(it)) return;
      const out = sstep(0.74, 0.96, p), barA = clamp(p / 0.08) * (1 - sstep(0.88, 1, p));
      const font = (env.st.fonts.mono && env.st.fonts.mono[0]) || 'mono';
      postLocal(it, (env2, b, x, A) => {
        const a = A * barA; if (a <= 0.01) return;
        const th = Math.max(3, size * 0.07), gap = size * 0.24, L = vert ? b.h : b.w, fs = Math.max(14, size * 0.26);
        const lo = L * out, hi = L * pr;
        if (!vert) {
          const y = b.y1 + gap;
          env2.rect(b.x0 + lo, y, L - lo, th, env2.sc.sub, a * 0.3, false);
          if (hi > lo) env2.rect(b.x0 + lo, y, hi - lo, th, env2.sc.accent, a, false);
          env2.draw({ text: Math.round(pr * 100) + '%', font, size: fs, x: b.x1 + fs * 0.4, y: y + th / 2, align: 'left', color: env2.sc.sub, alpha: a * (1 - out), ghost: false });
        } else {
          const x0 = b.x0 - gap - th;
          env2.rect(x0, b.y0 + lo, th, L - lo, env2.sc.sub, a * 0.3, false);
          if (hi > lo) env2.rect(x0, b.y0 + lo, th, hi - lo, env2.sc.accent, a, false);
          env2.draw({ text: Math.round(pr * 100) + '%', font, size: fs, x: x0 + th / 2, y: b.y1 + fs * 0.9, color: env2.sc.sub, alpha: a * (1 - out), ghost: false });
        }
      });
    },
  },

  dither: {
    // ordered (Bayer 4×4) dither dissolve: the line fills in through a regular crosshatch of pixels
    name: 'ディザ', tags: ['glitch', 'graphic'], w: 0.9, ae: 'flicker',
    apply(env, it, p) {
      const size = it.size, dir = dirOf(env, 101);
      clipLocal(it, (ctx, b, x, env2) => {
        const pad = size * 0.2, W = b.w + pad * 2, H = b.h + pad * 2, ov = 1.2 / (env2.scale || 1);
        let cs = Math.max(3, size * 0.075);
        while ((W / cs) * (H / cs) > 1400) cs *= 1.2;
        const nx = Math.ceil(W / cs), ny = Math.ceil(H / cs), ox = b.cx - nx * cs / 2, oy = b.cy - ny * cs / 2;
        let any = false;
        for (let iy = 0; iy < ny; iy++) {
          let run = -1;
          for (let ix = 0; ix <= nx; ix++) {
            let on = false;
            if (ix < nx) {
              const th = (BAYER[(iy & 3) * 4 + (ix & 3)] + 0.5) / 16, u = nx > 1 ? ix / (nx - 1) : 0;
              on = p * 1.35 - 0.3 * (dir > 0 ? u : 1 - u) > th;
            }
            if (on && run < 0) run = ix;
            if (!on && run >= 0) { ctx.rect(ox + run * cs - ov / 2, oy + iy * cs - ov / 2, (ix - run) * cs + ov, cs + ov); run = -1; any = true; }
          }
        }
        if (!any) ctx.rect(0, 0, 0, 0);
      });
    },
  },

  odometer: {
    // odometer reels: each glyph rolls up through a few characters inside its own window and clicks to a stop
    name: 'ドラム回転', tags: ['glitch', 'editorial', 'pop'], w: 0.9, ae: 'scramble', minDur: 0.55,
    inDur: dur => clamp(dur * 0.5, 0.25, 0.9),
    apply(env, it, p) {
      const seed = it.seed | 0, isy = it.sy || 1, digits = /^[0-9\s]+$/.test(String(it.text || ''));
      const pool = digits ? '0123456789' : J.pool('signs');
      const reel = (i, n) => { const q = stg(p, ordLR(i, n), 0.45), R = 3 + (J.h(seed, i, 111) % 3); return { q, R, s: R * (1 - oBack(q, 1.15)) }; };
      const cell = (g, j, s, chs) => {                              // character j of the reel (0 = the real glyph), masked to the window
        const f = (s - j) * 1.02;
        if (Math.abs(f) >= 1) return HIDE;
        const o = { dy: f * g.h * isy, clipY: [-0.58 - f, 0.58 - f], clipX: [-2, 2], a: 1 - 0.35 * Math.abs(f) };
        if (chs) o.ch = chs;
        return o;
      };
      const main = glyphs(it, (i, g, n) => {
        const r = reel(i, n);
        if (r.q <= 0) return HIDE; if (r.q >= 1) return null;
        if (g.r90) return { a: r.q };
        return cell(g, 0, r.s);
      });
      addPre(it, (env2, x) => {
        for (const side of [0, 1]) {
          copyDraw(env2, x, main, (i, g, n) => {
            const r = reel(i, n); if (r.q <= 0 || r.q >= 1 || g.r90) return HIDE;
            const j = side ? Math.ceil(r.s) : Math.floor(r.s); if (j < 1 || j > r.R || (side && j === Math.floor(r.s))) return HIDE;
            return cell(g, j, r.s, pool[J.h(seed, i, j, 112) % pool.length]);
          }, { shadow: null });
        }
      });
    },
  },

  matrixRain: {
    // data rain: each glyph falls in as the bright head of a short stream of flickering characters
    name: 'データ降下', tags: ['glitch', 'graphic'], w: 0.8, ae: 'scramble', minDur: 0.55,
    inDur: dur => clamp(dur * 0.5, 0.25, 0.9),
    apply(env, it, p) {
      const vert = !!it.vertical, isy = it.sy || 1, size = it.size, seed = it.seed | 0, step = env.step;
      const hot = hotOf(env, it), acc = pick(env.sc.accent, env.sc.fg), col = colOf(it), K = 4, land = 0.62;
      const lay0 = J.layoutText(it), nL = lay0.reduce((m, g) => Math.max(m, g.li + 1), 1);
      // lower glyphs land first so no stream ever runs over a glyph that has already landed
      const key = g => 0.35 * J.r(seed, g.i, 121) + 0.65 * (vert ? (g.n > 1 ? 1 - g.ci / (g.n - 1) : 0) : (nL > 1 ? (nL - 1 - g.li) / (nL - 1) : 0));
      const st = g => { const q = stg(p, key(g), 0.45), D = size * (2.2 + J.r(seed, g.i, 122)); return { q, y: -D * (1 - oCubic(q / land)) }; };
      const rnd = (i, k) => J.pool('signs')[J.h(seed, i, k, step, 123) % J.pool('signs').length];
      const main = glyphs(it, (i, g) => {
        const S = st(g);
        if (S.q <= 0) return HIDE; if (S.q >= 1) return null;
        if (S.q < land) return { dy: S.y, ch: rnd(i, 0), color: hot };
        return { color: J.mix(col, hot, 1 - oCubic((S.q - land) / (1 - land))) };
      });
      addPre(it, (env2, x) => {
        for (let k = 1; k <= K; k++) {
          copyDraw(env2, x, main, (i, g) => {
            const S = st(g); if (S.q <= 0 || S.q >= 1) return HIDE;
            const a = (1 - k / (K + 1)) * 0.75 * (1 - sstep(land * 0.9, 1, S.q)) * clamp(S.q * 6);
            if (a <= 0.01) return HIDE;
            return { dy: S.y - k * g.h * isy * 0.92, ch: rnd(i, k), color: acc, a, s: 0.9 };
          }, { shadow: null, extrude: null, gradient: null, pattern: null });
        }
      });
    },
  },

  /* ================= GRAPHIC ================= */

  hatchFill: {
    // each glyph is first printed as a hatch / halftone pattern with a hairline outline, then the solid ink fills in
    name: 'ハッチ→ベタ', tags: ['graphic', 'editorial'], w: 0.9, ae: 'blur',
    inDur: dur => clamp(dur * 0.45, 0.2, 0.8),
    apply(env, it, p) {
      const size = it.size, col = colOf(it), pat = ['stripes', 'hatch', 'dots'][J.h(env.cut.seed | 0, 131) % 3];
      const qf = (i, n) => stg(p, ordLR(i, n), 0.45);
      const main = glyphs(it, (i, g, n) => {
        const q = qf(i, n);
        if (q <= 0.35) return HIDE; if (q >= 1) return null;
        return { a: E.inOutSine((q - 0.35) / 0.55) };
      });
      if (it.fill === false) return;
      addPre(it, (env2, x) => {
        if (env2.pass !== 'main') return;
        copyDraw(env2, x, main, (i, g, n) => {
          const q = qf(i, n); if (q <= 0 || q >= 1) return HIDE;
          return { a: clamp(q * 5) * (1 - sstep(0.75, 1, q)), s: lerp(1.1, 1, oCubic(q / 0.4)) };
        }, { pattern: pat, patternColor: x.color || col, patternBg: null, gradient: null, stroke: Math.max(1, size * 0.014), strokeColor: x.color || col, strokeUnder: false, shadow: null, extrude: null });
      });
    },
  },

  brushReveal: {
    // dry-brush stroke: a ragged-edged brush pass (its bristle tips in the accent colour) paints each line in, line after line
    name: '筆払い', tags: ['emotional', 'editorial', 'calm'], w: 1, ae: 'wipe',
    inDur: dur => clamp(dur * 0.45, 0.2, 0.85),
    apply(env, it, p) {
      const vert = !!it.vertical, size = it.size, seed = it.seed | 0, K = 14, tail = size * 1.1, pad = size * 0.2;
      // every bristle strip of every line: fn(line, v, thickness, u-start, u-end, q)
      const strips = (x, b, fn) => {
        const Ls = lines(x, b), nL = Ls.length;
        for (const L of Ls) {
          const q = stg(p, nL > 1 ? L.li / (nL - 1) : 0, nL > 1 ? 0.4 : 0); if (q <= 0) continue;
          const F = lerp(L.u0 - pad, L.u1 + pad + tail, E.inOutSine(q)), hv = size * 0.66 * (vert ? (x.sx || 1) : (x.sy || 1)), th = hv * 2 / K;
          for (let k = 0; k < K; k++) {
            const lag = tail * Math.pow(J.r(seed, L.li, k, 141), 1.6), end = F - lag;
            if (end > L.u0 - pad) fn(L, L.v - hv + k * th, th, L.u0 - pad, end, q);
          }
        }
      };
      const rect = (ctx, v, th, u0, u1) => (vert ? ctx.rect(v, u0, th + 0.6, u1 - u0) : ctx.rect(u0, v, u1 - u0, th + 0.6));
      clipLocal(it, (ctx, b, x, env2) => { const ov = 1.2 / (env2.scale || 1); let any = false; strips(x, b, (L, v, th, u0, u1) => { rect(ctx, v - ov / 2, th + ov, u0, u1); any = true; }); if (!any) ctx.rect(0, 0, 0, 0); });
      if (!isMain(it)) return;
      postLocal(it, (env2, b, x, A) => {
        const tip = size * 0.32;
        strips(x, b, (L, v, th, u0, u1, q) => {
          const a = A * 0.9 * (1 - sstep(0.7, 0.95, q)); if (a <= 0.01 || u1 > L.u1 + pad + tip) return;
          const s0 = Math.max(u0, u1 - tip);
          if (vert) env2.rect(v, s0, th * 0.92, u1 - s0, env2.sc.accent, a, false); else env2.rect(s0, v, u1 - s0, th * 0.92, env2.sc.accent, a, false);
        });
      });
    },
  },

  inkDrop: {
    // an ink drop lands inside every glyph and spreads outwards in an irregular blot that reveals it
    name: 'インク滴', tags: ['calm', 'emotional', 'graphic'], w: 1, ae: 'blur',
    inDur: dur => clamp(dur * 0.45, 0.2, 0.85),
    apply(env, it, p) {
      const isx = it.sx || 1, isy = it.sy || 1, size = it.size, seed = it.seed | 0;
      const qf = i => stg(p, J.r(seed, i, 151), 0.5);
      const drop = g => {
        const [gx, gy] = glyphPos(g, isx, isy), hw = g.w * isx / 2, hh = g.h * isy / 2;
        const px = gx + J.rs(seed, g.i, 152) * hw * 0.4, py = gy + J.rs(seed, g.i, 153) * hh * 0.4;
        return { px, py, R: Math.hypot(hw + Math.abs(px - gx), hh + Math.abs(py - gy)) + size * 0.08 };
      };
      clipLocal(it, (ctx, b) => {
        const n = b.lay.N; let any = false;
        for (const g of b.lay) {
          if (isBlank(g.ch)) continue;
          const q = qf(g.i); if (q <= 0.12) continue;
          const D = drop(g), r = D.R * oCubic((q - 0.12) / 0.88), ph1 = J.r(seed, g.i, 154) * TAU, ph2 = J.r(seed, g.i, 155) * TAU;
          if (q >= 1) { ctx.rect(D.px - D.R * 1.2, D.py - D.R * 1.2, D.R * 2.4, D.R * 2.4); any = true; continue; }
          for (let k = 0; k <= 20; k++) {
            const a = k / 20 * TAU, rr = r * (1 + 0.1 * Math.sin(3 * a + ph1) + 0.07 * Math.sin(5 * a + ph2));
            k ? ctx.lineTo(D.px + Math.cos(a) * rr, D.py + Math.sin(a) * rr) : ctx.moveTo(D.px + rr, D.py);
          }
          ctx.closePath(); any = true;
        }
        if (!any) ctx.rect(0, 0, 0, 0);
      });
      if (!isMain(it)) return;
      postLocal(it, (env2, b, x, A) => {
        for (const g of b.lay) {
          if (isBlank(g.ch)) continue;
          const q = qf(g.i); if (q <= 0 || q >= 0.4) continue;
          const D = drop(g), t = q / 0.12, r = size * 0.07 * (q < 0.12 ? oBack(t, 2) : 1 + (q - 0.12) * 4);
          env2.circle(D.px, D.py, r, env2.sc.accent, null, 1, A * (q < 0.12 ? 1 : 1 - (q - 0.12) / 0.28), false);
        }
      });
    },
  },

  quarters: {
    // the line is cut into four quadrants that fly in from the four corners and lock together
    name: '四方集結', tags: ['graphic', 'pop'], w: 0.9, ae: 'assemble',
    apply(env, it, p) {
      const size = it.size, b0 = box(it), D = size * (glyphN(it) > 1 ? 1.1 : 0.5) + Math.max(b0.w, b0.h) * 0.12, big = size * 30, dir = dirOf(env, 161);
      const Q = [[-1, -1, 0], [1, 1, 1], [1, -1, 2], [-1, 1, 3]];                  // diagonal pairs arrive together
      const ek = k => oQuint(stg(p, k < 2 ? 0 : 1, 0.2));
      const place = (x, k) => { const [sx, sy] = Q[k], e = ek(k), o = Object.assign({}, x); moveLocal(o, sx * D * (1 - e), sy * D * (1 - e)); o.rot = (x.rot || 0) + dir * sx * sy * 9 * (1 - e); return o; };
      const quad = (ctx, b, k, ov = 0) => { const [sx, sy] = Q[k]; ctx.rect(sx < 0 ? b.cx - big : b.cx - ov, sy < 0 ? b.cy - big : b.cy - ov, big + ov, big + ov); };
      it.alpha = (it.alpha ?? 1) * clamp(p * 5);
      if (ek(0) > 0.9995 && ek(2) > 0.9995) return;                         // locked together: draw the line whole
      const m = place(it, 0), dX = m.x - it.x, dY = m.y - it.y, dR = (m.rot || 0) - (it.rot || 0);
      it.x = m.x; it.y = m.y; it.rot = m.rot;
      clipLocal(it, (ctx, b) => quad(ctx, b, 0));
      addPre(it, (env2, x) => {
        const rest = Object.assign({}, x, { x: x.x - dX, y: x.y - dY, rot: (x.rot || 0) - dR });
        for (let k = 1; k < 4; k++) {
          const o = place(rest, k), ctx = env2.ctx;
          ctx.save(); ctx.beginPath(); ctx.save(); toLocal(ctx, o); quad(ctx, box(o), k, 1.2 / (env2.scale || 1)); ctx.restore(); ctx.clip();
          copyDraw(env2, o, null, null);
          ctx.restore();
        }
      });
    },
  },

  invertBox: {
    // a solid block wipes on with the lyric knocked out of it, then drops away and leaves the plain text
    name: '反転抜け', tags: ['graphic', 'editorial', 'pop'], w: 0.9, ae: 'wipe',
    inDur: dur => clamp(dur * 0.45, 0.2, 0.8),
    apply(env, it, p) {
      const size = it.size, m = size * 0.16, bg = pick(env.sc.bg);
      const e1 = oQuart(p / 0.34), e2 = ioQuart((p - 0.42) / 0.55);
      const blk = b => ({ x0: b.x0 - m, y0: lerp(b.y0 - m, b.y1 + m, e2), x1: lerp(b.x0 - m, b.x1 + m, e1), y1: b.y1 + m });
      clipLocal(it, (ctx, b) => { const B = blk(b); if (e2 <= 0) { ctx.rect(0, 0, 0, 0); return; } ctx.rect(b.x0 - size * 20, b.y0 - size * 20, b.w + size * 40, B.y0 - (b.y0 - size * 20)); });
      postLocal(it, (env2, b, x, A) => {
        const B = blk(b); if (B.x1 - B.x0 < 0.5 || B.y1 - B.y0 < 0.5) return;
        const fill = isHex(x.color) ? x.color : pick(env2.sc.fg);
        env2.rect(B.x0, B.y0, B.x1 - B.x0, B.y1 - B.y0, fill, A, false);
        if (env2.pass !== 'main') return;
        const ctx = env2.ctx; ctx.save(); ctx.beginPath(); ctx.rect(B.x0, B.y0, B.x1 - B.x0, B.y1 - B.y0); ctx.clip();
        copyDraw(env2, Object.assign({}, x, { x: 0, y: 0, rot: 0, skew: 0 }), null, null, { color: bg, strokeColor: bg, gradient: null, pattern: null, shadow: null, extrude: null });
        ctx.restore();
      });
    },
  },

  printRegister: {
    // misregistered riso print: two halftone colour plates sit offset and jolt into register in a few hard steps
    name: '版ズレ', tags: ['graphic', 'pop', 'editorial'], w: 0.9, ae: 'slice',
    inDur: dur => clamp(dur * 0.45, 0.2, 0.8),
    apply(env, it, p) {
      const size = it.size, seed = env.cut.seed | 0;
      const plates = [pick(env.sc.accent), pick(env.sc.accent2, env.sc.ghostA, env.sc.accent)];
      const x4 = clamp(p / 0.8) * 4, k = Math.min(3, Math.floor(x4)), e = p >= 0.8 ? 1 : (k + oBack(clamp((x4 - k) / 0.3), 2.2)) / 4;
      const a0 = J.r(seed, 171) * TAU, D = size * 0.42 * (1 - e);
      const off = j => [Math.cos(a0 + j * TAU / 3) * D, Math.sin(a0 + j * TAU / 3) * D];
      const [mx, my] = off(0);
      it.x += mx; it.y += my;
      it.alpha = (it.alpha ?? 1) * clamp(p * 4);
      if (D < 0.3) return;
      const pa = 1 - sstep(0.8, 1, p);
      addPre(it, (env2, x) => {
        if (env2.pass !== 'main') return;
        for (let j = 1; j <= 2; j++) {
          const [ox, oy] = off(j);
          copyDraw(env2, Object.assign({}, x, { x: x.x - mx + ox, y: x.y - my + oy }), null, null,
            { color: plates[j - 1], strokeColor: plates[j - 1], alpha: clamp(x.alpha ?? 1) * pa, pattern: j === 1 ? 'dots' : 'lines', patternColor: plates[j - 1], patternBg: null, gradient: null, shadow: null, extrude: null });
        }
      });
    },
  },

  echoCount: {
    // count-in: three stepped copies trail behind the line and drop off one per beat (3, 2, 1, on)
    name: 'カウントイン', tags: ['pop', 'graphic', 'glitch'], w: 0.8, ae: 'zoom', minDur: 0.55,
    inDur: dur => clamp(dur * 0.5, 0.25, 0.9),
    apply(env, it, p) {
      const size = it.size, dir = dirOf(env, 181), x4 = clamp(p / 0.88) * 4, b = Math.min(3, Math.floor(x4)), f = x4 - b;
      const n = p >= 0.88 ? 0 : 3 - b, punch = p >= 1 ? 0 : 0.14 * Math.exp(-f * 7) * (p < 0.88 ? 1 : 0) + (p >= 0.88 ? 0.1 * Math.exp(-(p - 0.88) * 40) * (1 - sstep(0.9, 0.99, p)) : 0);
      scaleAbout(it, 1 + punch);
      it.alpha = (it.alpha ?? 1) * clamp(p * 10);
      if (n > 0) it.echo = { n, dx: dir * size * 0.16, dy: size * 0.11, a: 0.75, decay: 0.72, color: pick(env.sc.accent, env.sc.sub) };
    },
  },

  liquidFill: {
    // the glyphs fill up like glasses: a wavy liquid level rises through hairline outlines
    name: '水位上昇', tags: ['emotional', 'calm', 'pop'], w: 0.9, ae: 'wipe', minDur: 0.5,
    inDur: dur => clamp(dur * 0.5, 0.25, 0.9),
    apply(env, it, p) {
      const size = it.size, t = env.ltb, ph = J.r(env.cut.seed | 0, 201) * TAU, col = colOf(it);
      const e = E.inOutSine(clamp(p / 0.94)), amp = size * 0.08 * (1 - sstep(0.75, 1, p)), kx = TAU / (size * 1.7);
      const surface = (b, fn) => {
        const m = size * 0.3, lvl = lerp(b.y1 + m, b.y0 - m - amp * 2, e), n = clamp(Math.ceil((b.w + m * 2) / (size * 0.12)), 8, 90);
        for (let k = 0; k <= n; k++) {
          const x = b.x0 - m + (b.w + m * 2) * k / n;
          fn(x, lvl + amp * Math.sin(x * kx + t * 7 + ph) + amp * 0.45 * Math.sin(x * kx * 2.3 - t * 5), k);
        }
        return m;
      };
      clipLocal(it, (ctx, b) => {
        let x1 = 0; const m = surface(b, (x, y, k) => { k ? ctx.lineTo(x, y) : ctx.moveTo(x, y); x1 = x; });
        ctx.lineTo(x1, b.y1 + m + size * 20); ctx.lineTo(b.x0 - m, b.y1 + m + size * 20); ctx.closePath();
      });
      const oa = clamp(p * 6) * (1 - sstep(0.8, 1, p));
      if (it.fill === false || oa <= 0.01) return;
      addPre(it, (env2, x) => {
        if (env2.pass !== 'main') return;
        copyDraw(env2, x, null, null, { fill: false, stroke: Math.max(1, size * 0.014), strokeColor: isHex(x.color) ? x.color : col, alpha: clamp(x.alpha ?? 1) * 0.45 * oa, shadow: null, extrude: null, gradient: null, pattern: null });
      });
      if (!isPrimary(it)) return;
      postLocal(it, (env2, b, x, A) => {
        const pts = []; surface(b, (xx, y) => pts.push([xx, y]));
        env2.line(pts, env2.sc.accent, Math.max(1.5, size * 0.025), A * oa * (e > 0.02 ? 1 : 0), false);
      });
    },
  },

  windBlown: {
    // the strokes of every glyph are blown in from one side on a gust, fluttering like leaves before they settle
    name: '風に乗って', tags: ['emotional', 'calm'], w: 0.8, ae: 'assemble', pieces: true, minDur: 0.55,
    inDur: dur => clamp(dur * 0.5, 0.25, 0.9),
    apply(env, it, p) {
      if (p >= 1) return;
      const dir = dirOf(env, 191), seed = it.seed | 0, size = it.size, N = Math.max(1, J.layoutText(it).N);
      const D = env.W * 0.3 + size * 2;
      if (it.fill === false || it.gradient) {
        glyphs(it, (i, g, n) => { const q = stg(p, dir > 0 ? ordRL(i, n) : ordLR(i, n), 0.5); if (q <= 0) return HIDE; if (q >= 1) return null;
          const k = 1 - oCubic(q), ph = J.r(seed, i, 193) * TAU; return { dx: -dir * D * k, dy: Math.sin(ph + k * 6) * 0.5 * size * k, rot: Math.sin(ph * 2 + k * 7) * 120 * k, a: clamp(q * 4) }; });
        return;
      }
      it.pieceFns.push((ci, pj) => {
        const o = N > 1 ? (dir > 0 ? 1 - ci / (N - 1) : ci / (N - 1)) : 0;
        const q = stg(p, 0.55 * o + 0.45 * J.r(seed, ci, pj, 192), 0.55);
        if (q <= 0) return null; if (q >= 1) return J.PID;
        const e = oCubic(q), k = 1 - e, ph = J.r(seed, ci, pj, 193) * TAU;
        const dx = -dir * D * k * (0.8 + 0.4 * J.r(seed, ci, pj, 194));
        const dy = (Math.sin(ph + k * 6) * 0.55 - 0.5 * J.rs(seed, ci, pj, 195)) * size * k;
        return J.PT(dx, dy, Math.sin(ph * 2 + k * 7) * 170 * k, 1 - 0.3 * k, 1, 0, clamp(q * 4));
      });
    },
  },

  strokeOrder: {
    // each glyph is built up stroke by stroke, top-left to bottom-right, as if written by hand
    name: '一画ずつ', tags: ['calm', 'emotional', 'editorial'], w: 0.9, ae: 'assemble', pieces: true, minDur: 0.6,
    inDur: (dur, n) => clamp(0.3 + n * 0.06, 0.4, Math.max(0.4, Math.min(1.2, dur * 0.6))),
    apply(env, it, p) {
      if (p >= 1) return;
      const N = Math.max(1, J.layoutText(it).N), size = it.size;
      if (it.fill === false || it.gradient) {
        glyphs(it, (i, g, n) => { const q = stg(p, ordLR(i, n), 0.6); if (q <= 0) return HIDE; if (q >= 1) return null; return { a: E.inOutSine(q), s: lerp(1.15, 1, oCubic(q)) }; });
        return;
      }
      it.pieceFns.push((ci, pj, pc) => {
        const gq = stg(p, N > 1 ? ci / (N - 1) : 0, N > 1 ? 0.6 : 0);
        const kp = clamp((pc.cy + 0.5) * 0.62 + (pc.cx + 0.5) * 0.38);
        const u = clamp((gq - kp * 0.72) / 0.28);
        if (u <= 0) return null; if (u >= 1) return J.PID;
        return J.PT(0, -(1 - oCubic(u)) * size * 0.04, 0, lerp(1.3, 1, oBack(u, 1.8)), 1, 0, clamp(u * 3));
      });
    },
  },

  clockWipe: {
    // every glyph is uncovered by a clock hand sweeping once around its centre
    name: '時計回り', tags: ['graphic', 'pop', 'editorial'], w: 0.9, ae: 'wipe',
    apply(env, it, p) {
      const isx = it.sx || 1, isy = it.sy || 1, size = it.size, seed = it.seed | 0;
      const qf = (i, n) => stg(p, ordLR(i, n), 0.5);
      const geo = (g, q) => { const [gx, gy] = glyphPos(g, isx, isy); return { gx, gy, R: Math.hypot(g.w * isx, g.h * isy) * 0.55 + size * 0.05, a0: -PI / 2, sw: E.inOutSine(q) * TAU, cw: J.r(seed, g.i, 211) < 0.5 }; };
      clipLocal(it, (ctx, b) => {
        const n = b.lay.N; let any = false;
        for (const g of b.lay) {
          if (isBlank(g.ch)) continue;
          const q = qf(g.i, n); if (q <= 0) continue;
          const G = geo(g, q);
          if (q >= 1) { ctx.rect(G.gx - G.R, G.gy - G.R, G.R * 2, G.R * 2); any = true; continue; }
          ctx.moveTo(G.gx, G.gy);
          if (G.cw) ctx.arc(G.gx, G.gy, G.R, G.a0, G.a0 + G.sw); else ctx.arc(G.gx, G.gy, G.R, G.a0 - G.sw, G.a0);
          ctx.closePath(); any = true;
        }
        if (!any) ctx.rect(0, 0, 0, 0);
      });
      if (!isMain(it)) return;
      postLocal(it, (env2, b, x, A) => {
        const n = b.lay.N, lw = Math.max(1.5, size * 0.028);
        for (const g of b.lay) {
          if (isBlank(g.ch)) continue;
          const q = qf(g.i, n); if (q <= 0 || q >= 1) continue;
          const G = geo(g, q), an = G.a0 + (G.cw ? G.sw : -G.sw), a = A * (1 - sstep(0.8, 1, q)) * clamp(q * 8);
          env2.line([[G.gx, G.gy], [G.gx + Math.cos(an) * G.R * 0.9, G.gy + Math.sin(an) * G.R * 0.9]], env2.sc.accent, lw, a, false);
          env2.circle(G.gx, G.gy, lw * 1.3, env2.sc.accent, null, 1, a, false);
        }
      });
    },
  },

  shadowFirst: {
    // each glyph's shadow lands first; the glyph drops from above the lens straight onto it
    name: '影落とし', tags: ['pop', 'graphic', 'emotional'], w: 0.9, ae: 'drop', minDur: 0.5,
    inDur: dur => clamp(dur * 0.48, 0.22, 0.85),
    apply(env, it, p) {
      const size = it.size, bg = pick(env.sc.bg), sh = J.mix(bg, J.lum(bg) < 0.5 ? pick(env.sc.fg) : '#000000', 0.28), tL = 0.72;
      const qf = (i, n) => stg(p, ordLR(i, n), 0.45);
      const main = glyphs(it, (i, g, n) => {
        const q = qf(i, n);
        if (q <= 0.12) return HIDE; if (q >= 1) return null;
        if (q < tL) { const e = E.inQuad((q - 0.12) / (tL - 0.12)); return { s: lerp(1.75, 1, e), dx: -size * 0.22 * (1 - e), dy: -size * 0.34 * (1 - e), a: clamp((q - 0.12) * 4) }; }
        const u = (q - tL) / (1 - tL);
        return { s: 1 - 0.07 * Math.sin(PI * u) * (1 - u) };
      });
      addPre(it, (env2, x) => {
        copyDraw(env2, x, main, (i, g, n) => {
          const q = qf(i, n); if (q <= 0 || q >= tL + 0.05) return HIDE;
          const e = clamp(q / tL);
          return { color: sh, s: lerp(0.55, 1, E.inQuad(e)), a: clamp(q * 5) * 0.85, blur: size * 0.05 * (1 - e) };
        }, { color: sh, strokeColor: sh, gradient: null, pattern: null, shadow: null, extrude: null });
      });
    },
  },

  bubbles: {
    // glyphs float up inside soap bubbles, wobbling, and pop out full size when the bubbles burst
    name: '泡', tags: ['pop', 'emotional', 'calm'], w: 0.8, ae: 'pop', minDur: 0.55,
    inDur: dur => clamp(dur * 0.5, 0.25, 0.9),
    apply(env, it, p) {
      const vert = !!it.vertical, isx = it.sx || 1, isy = it.sy || 1, size = it.size, seed = it.seed | 0, tP = 0.68;
      const st = (i, n) => {
        const q = stg(p, 0.5 * J.r(seed, i, 221) + 0.5 * ordLR(i, n), 0.45), f = clamp(q / tP), ph = J.r(seed, i, 222) * TAU;
        return { q, dx: Math.sin(ph + f * 9) * size * 0.1 * (1 - f), dy: size * 1.7 * (1 - oCubic(f)) };
      };
      glyphs(it, (i, g, n) => {
        const S = st(i, n);
        if (S.q <= 0) return HIDE; if (S.q >= 1) return null;
        if (S.q < tP) return { dx: S.dx, dy: S.dy, s: 0.68, a: clamp(S.q * 6) };
        return { s: lerp(0.68, 1, oBack((S.q - tP) / (1 - tP), 2.6)) };
      });
      if (!isMain(it)) return;
      postLocal(it, (env2, b, x, A) => {
        const n = b.lay.N, lw = Math.max(1.2, size * 0.018);
        for (const g of b.lay) {
          if (isBlank(g.ch)) continue;
          const S = st(g.i, n); if (S.q <= 0 || S.q >= 1) continue;
          const [gx, gy] = glyphPos(g, isx, isy), r = Math.max(g.w * isx, g.h * isy) * 0.5;
          if (S.q < tP) {
            const cx = gx + S.dx, cy = gy + S.dy, a = A * clamp(S.q * 6);
            env2.circle(cx, cy, r, null, env2.sc.accent, lw, a * 0.85, false);
            env2.arc(cx, cy, r * 0.72, 200, 245, env2.sc.fg, lw * 1.2, a * 0.6, false);
          } else {
            const u = (S.q - tP) / (1 - tP);
            if (u < 0.5) env2.circle(gx, gy, r * (1 + 0.6 * oCubic(u / 0.5)), null, env2.sc.accent, lw * (1 - u), A * (1 - u / 0.5), false);
          }
        }
      });
    },
  },

  tokoroten: {
    // ところてん: the line is pushed out through a slit, glyphs squeezed thin at the slit and relaxing as they emerge
    name: 'ところてん', tags: ['pop', 'graphic'], w: 0.7, ae: 'stretch', minDur: 0.5,
    inDur: dur => clamp(dur * 0.48, 0.22, 0.85),
    apply(env, it, p) {
      const vert = !!it.vertical, isx = it.sx || 1, isy = it.sy || 1, size = it.size, b0 = box(it);
      const U0 = vert ? b0.y0 : b0.x0, U1 = vert ? b0.y1 : b0.x1, slit = U0 - size * 0.12, L = U1 - U0 + size * 0.3;
      const off = -(1 - E.inOutSine(clamp(p / 0.9))) * L, rel = size * 2, km = 0.18, c = 1 - sstep(0.55, 1, p);
      // squeeze factor ramps from km at the slit to 1 at `rel` past it; d() = compressed distance travelled past the slit
      const kAt = e => 1 - c * (1 - (km + (1 - km) * clamp(e / rel)));
      const d = e => { if (e <= 0) return e * (1 - c * (1 - km)); const r = Math.min(e, rel), k0 = 1 - c * (1 - km); return k0 * r + (1 - k0) * r * r / (2 * rel) + Math.max(0, e - rel); };
      glyphs(it, (i, g) => {
        const [gx, gy] = glyphPos(g, isx, isy), u = vert ? gy : gx, hu = (vert ? g.h * isy : g.w * isx) / 2, e = u + off - slit;
        if (e + hu < 0) return HIDE;
        if (off >= -0.5 && c <= 0) return null;
        const k = Math.max(0.05, kAt(e)), du = slit + d(e) - u, st = 1 + 0.3 * (1 - k);
        return vert ? { dy: du, sy: k, sx: st } : { dx: du, sx: k, sy: st };
      });
      const m = size * 0.3;
      clipLocal(it, (ctx, b) => { if (vert) ctx.rect(b.x0 - m * 4, slit, b.w + m * 8, b.h + size * 20); else ctx.rect(slit, b.y0 - m * 4, b.w + size * 20, b.h + m * 8); });
      if (!isPrimary(it)) return;
      postLocal(it, (env2, b, x, A) => {
        const a = A * clamp(p * 8) * (1 - sstep(0.85, 1, p)); if (a <= 0.01) return;
        const t = Math.max(3, size * 0.07), ext = size * 0.25;
        if (vert) env2.rect(b.x0 - ext, slit - t, b.w + ext * 2, t, env2.sc.accent, a, false);
        else env2.rect(slit - t, b.y0 - ext, t, b.h + ext * 2, env2.sc.accent, a, false);
      });
    },
  },

};

/* Sutherland–Hodgman: keep the part of a polygon where f(v) >= 0 (f linear) */
function clipHalf(poly, f) {
  const out = [];
  for (let k = 0; k < poly.length; k++) {
    const a = poly[k], b = poly[(k + 1) % poly.length], fa = f(a), fb = f(b);
    if (fa >= 0) out.push(a);
    if ((fa >= 0) !== (fb >= 0)) { const t = fa / (fa - fb); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); }
  }
  return out;
}
/* design-space AABB of a local box (rotation aware) */
function dRange(it, b) {
  const r = (it.rot || 0) * DEG, c = Math.cos(r), s = Math.sin(r);
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  for (const [u, v] of [[b.x0, b.y0], [b.x1, b.y0], [b.x0, b.y1], [b.x1, b.y1]]) {
    const X = it.x + c * u - s * v, Y = it.y + s * u + c * v;
    x0 = Math.min(x0, X); x1 = Math.max(x1, X); y0 = Math.min(y0, Y); y1 = Math.max(y1, Y);
  }
  return { x0, x1, y0, y1 };
}

for (const k of Object.keys(DEFS)) J.register('enter', k, DEFS[k], P);
})();
