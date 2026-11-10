/* JIZURA pack: x2exA — 27 per-glyph exits (ordering patterns, glyph paths, glyph shape changes, glyph swaps, stroke pieces coming apart)
   Every exit: p 0 = exactly the resting item → p 1 = fully gone. Everything is relative to it.size / the glyph box and
   deterministic (it.seed, glyph index). Layouts that draw one glyph per item are handled through the item's mi. */
(() => {
'use strict';
const E = J.E;
const P = 'x2exA';
const DEG = J.DEG, TAU = J.TAU, PI = Math.PI;
const clamp = J.clamp, lerp = J.lerp;
const HIDE = Object.freeze({ hide: true });
const X = {};

/* ---------------- easing ---------------- */
const oCubic = x => 1 - Math.pow(1 - clamp(x), 3);
const oQuart = x => 1 - Math.pow(1 - clamp(x), 4);
const iQuad = x => { x = clamp(x); return x * x; };
const iCubic = x => { x = clamp(x); return x * x * x; };
const ioCubic = x => { x = clamp(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const oBack = (x, s) => E.outBack(clamp(x), s);
const seg = (x, a, b) => clamp((x - a) / (b - a));

/* ---------------- item helpers ---------------- */
const stg = (p, k, spread) => clamp((p - spread * k) / (1 - spread));
const isHex = c => typeof c === 'string' && c[0] === '#' && (c.length === 7 || c.length === 4);
const pick = (...cs) => cs.find(isHex) || '#ffffff';
const isBlank = ch => ch === ' ' || ch === '　';
const layOf = it => (it._m || (it._m = J.measure(it))).lay;
const gpos = (g, it) => [(g.x + (g.vx || 0)) * (it.sx || 1), (g.y + (g.vy || 0)) * (it.sy || 1)];
const glyphs = (it, fn) => { it.charFns.push(fn); };
const dirOf = (it, salt) => (J.r(it.seed | 0, salt, 5) < 0.5 ? -1 : 1);
const cutN = env => Math.max(1, J.glyphCount(String(env.cut && env.cut.text || '')));
// offset along the writing direction / across it (cr < 0 = "above" a horizontal line, to the right of a vertical one)
const mv = (it, al, cr) => (it.vertical ? { dx: -cr, dy: al } : { dx: al, dy: cr });
const hotOf = (env, it) => (it.color === env.sc.accent ? pick(env.sc.accent2, env.sc.fg) : pick(env.sc.accent, env.sc.fg));
const noPieces = it => it.fill === false || !!it.gradient || !!it.pattern || it.dash != null;
const motionK = env => clamp(0.55 + (env.fx && env.fx.motion != null ? env.fx.motion : 0.7) * 0.65, 0.5, 1.3);

/* ordering of the glyphs of an item. Items that hold ONE glyph of a longer cut (mixed / scatter layouts) use their mi */
function orders(env, it) {
  const lay = layOf(it), N = cutN(env), mi = clamp(+it.mi || 0, 0, N - 1), single = lay.N === 1 && N > 1;
  const half = (N - 1) / 2;
  return {
    single, N: single ? N : lay.N,
    idx: (i) => (single ? mi : i),
    ci: (g) => (single ? mi : g.ci),
    lr: (i, n) => (single ? mi / (N - 1) : n > 1 ? i / (n - 1) : 0),
    // 0 at the middle of the glyph's own line → 1 at both ends
    ctr: (g) => (single ? Math.abs(mi - half) / half : g.n > 1 ? Math.abs(g.ci - (g.n - 1) / 2) / ((g.n - 1) / 2) : 0),
    side: (g) => (single ? Math.sign(mi - half) : g.n > 1 ? Math.sign(g.ci - (g.n - 1) / 2) : 0),
  };
}
/* per line: glyph positions by column index (item-local, scaled) */
function linePos(it) {
  const lay = layOf(it), L = [];
  for (const g of lay) (L[g.li] || (L[g.li] = []))[g.ci] = gpos(g, it);
  return L;
}
/* position at a fractional column index of a line (extrapolates past both ends) */
function posAt(row, f) {
  const n = row.length;
  if (n === 1) return row[0];
  const a = clamp(Math.floor(f), 0, n - 2), t = f - a, A = row[a], B = row[a + 1];
  return [A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t];
}
/* rotate a design-space vector into the item's space */
const toItem = (it, X0, Y0) => { const r = -(it.rot || 0) * DEG, c = Math.cos(r), s = Math.sin(r); return [X0 * c - Y0 * s, X0 * s + Y0 * c]; };

/* =====================================================================
   A. ORDERING PATTERNS
   ===================================================================== */

/* 中央から細る — starting in the middle of the line and spreading to both ends, each glyph narrows to a hairline, and the hairline then shortens to nothing */
X.xhCentreThin = {
  name: '中央から細る', en: 'Centre Thins', tags: ['editorial', 'graphic', 'calm'], w: 1.1, ae: 'stretch',
  outDur: dur => clamp(dur * 0.4, 0.3, 0.8),
  apply(env, it, p) {
    const O = orders(env, it);
    glyphs(it, (i, g) => {
      const q = stg(p, O.ctr(g), 0.5);
      if (q <= 0) return null; if (q >= 1) return HIDE;
      const a = ioCubic(seg(q, 0, 0.6)), b = iQuad(seg(q, 0.5, 1));
      return it.vertical ? { sy: Math.max(0.03, lerp(1, 0.05, a)), sx: Math.max(0.02, 1 - b) } : { sx: Math.max(0.03, lerp(1, 0.05, a)), sy: Math.max(0.02, 1 - b) };
    });
  },
};

/* かなが先に — the light glyphs (kana, lower case) soften and sink away first; the heavy ones (kanji, capitals) stand alone for a beat, then punch out one by one */
X.xhKanaFirst = {
  name: 'かなが先に', en: 'Kana First', tags: ['editorial', 'emotional', 'calm'], w: 1.1, ae: 'shrink', minDur: 0.6,
  outDur: dur => clamp(dur * 0.46, 0.36, 0.95),
  apply(env, it, p) {
    const O = orders(env, it), size = it.size;
    const heavyCh = ch => J.isKanji(ch) || /[A-Z0-9]/.test(ch);
    const all = [...String(env.cut && env.cut.text || it.text || '')].filter(c => !isBlank(c) && c !== '\n');
    const nh = all.filter(heavyCh).length, natural = nh > 0 && nh < all.length;
    glyphs(it, (i, g, n) => {
      const heavy = natural ? heavyCh(g.ch) : O.idx(i) % 3 === 1;
      if (!heavy) {
        const q = stg(seg(p, 0, 0.55), O.lr(i, n), 0.45);
        if (q <= 0) return null; if (q >= 1) return HIDE;
        return { dy: iQuad(q) * size * 0.3, s: 1 - 0.2 * q, a: 1 - iQuad(q) };
      }
      const q = stg(seg(p, 0.5, 1), O.lr(i, n), 0.4);
      if (q <= 0) return null; if (q >= 1) return HIDE;
      const up = Math.sin(seg(q, 0, 0.35) * PI / 2) * 0.16, dn = iCubic(seg(q, 0.3, 1));
      return { s: Math.max(0.01, (1 + up) * (1 - dn)), a: 1 - iCubic(seg(q, 0.6, 1)) };
    });
  },
};

/* 櫛抜け — like two combs pulled apart: every other glyph slides up out of its own cell, then the remaining ones slide down out of theirs */
X.xhCombOut = {
  name: '櫛抜け', en: 'Comb Apart', tags: ['graphic', 'editorial', 'pop'], w: 1.2, ae: 'slice',
  outDur: dur => clamp(dur * 0.42, 0.32, 0.85),
  apply(env, it, p) {
    const O = orders(env, it), isx = it.sx || 1, isy = it.sy || 1;
    glyphs(it, (i, g, n) => {
      const odd = O.ci(g) % 2 === 1;
      const q = stg(odd ? seg(p, 0.38, 1) : seg(p, 0, 0.62), O.lr(i, n), 0.3);
      if (q <= 0) return null; if (q >= 1) return HIDE;
      const d = ioCubic(q) * 1.3, sg = odd ? 1 : -1;
      if (it.vertical && !g.r90) return { dx: -sg * d * g.w * isx, clipX: sg > 0 ? [-0.65 + d, 0.65] : [-0.65, 0.65 - d] };
      if (g.r90) return { dx: -sg * d * g.w * isx, a: 1 - iQuad(q) };
      return { dy: sg * d * g.h * isy, clipY: sg > 0 ? [-0.65, 0.65 - d] : [-0.65 + d, 0.65] };
    });
  },
};

/* 両端から抜ける — the outermost pair is pulled off outwards first, then pair after pair; the glyph in the middle is the last to go */
X.xhEndsOut = {
  name: '両端から抜ける', en: 'Ends Leave First', tags: ['graphic', 'editorial', 'pop'], w: 1, ae: 'stretch',
  outDur: dur => clamp(dur * 0.42, 0.32, 0.85),
  apply(env, it, p) {
    const O = orders(env, it), size = it.size, mk = motionK(env);
    glyphs(it, (i, g) => {
      const q = stg(p, 1 - O.ctr(g), 0.62);
      if (q <= 0) return null; if (q >= 1) return HIDE;
      const sd = O.side(g);
      if (!sd) return { s: Math.max(0.01, 1 + Math.sin(seg(q, 0, 0.4) * PI) * 0.12 - iCubic(seg(q, 0.3, 1))), a: 1 - iCubic(q) };
      const e = iCubic(q), o = mv(it, sd * e * size * 2.6 * mk, 0), st = 1 + e * 1.3;
      o.a = 1 - iQuad(seg(q, 0.35, 1));
      if (it.vertical) o.sy = st; else o.sx = st;
      return o;
    });
  },
};

/* 指名されて消える — in a shuffled order, one glyph at a time lights up in the accent colour, swells, and snaps shut */
X.xhRollCall = {
  name: '指名されて消える', en: 'Roll Call', tags: ['pop', 'graphic', 'glitch'], w: 0.9, ae: 'cut', minDur: 0.5,
  outDur: (dur, n) => clamp(dur * 0.44, 0.34, 0.9),
  apply(env, it, p) {
    const O = orders(env, it), seed = O.single ? (env.cut.seed | 0) : (it.seed | 0), hot = hotOf(env, it), N = Math.max(1, O.N);
    // shuffled rank 0..1 (a permutation, so the calls are evenly spaced)
    const rank = k => { let r = 0; const v = J.r(seed, k, 71); for (let j = 0; j < N; j++) if (J.r(seed, j, 71) < v) r++; return N > 1 ? r / (N - 1) : 0; };
    glyphs(it, (i) => {
      const q = stg(p, rank(O.idx(i)), 0.72);
      if (q <= 0) return null; if (q >= 1) return HIDE;
      const up = oBack(seg(q, 0, 0.45), 2.4), dn = iCubic(seg(q, 0.55, 1));
      return { s: 1 + up * 0.24, sy: Math.max(0.02, 1 - dn), color: hot };
    });
  },
};

/* =====================================================================
   B. PER-GLYPH PATHS
   ===================================================================== */

/* 天井に貼り付く — one after another the glyphs squat, shoot straight up and splat flat against the top edge of the frame, where they slip out of sight */
X.xhCeiling = {
  name: '天井に貼り付く', en: 'Stick To Ceiling', tags: ['pop', 'graphic'], w: 0.7, ae: 'drift', minDur: 0.6,
  outDur: dur => clamp(dur * 0.48, 0.4, 1.0),
  apply(env, it, p) {
    const O = orders(env, it), isy = it.sy || 1, r = (it.rot || 0) * DEG, cr = Math.cos(r), sr = Math.sin(r);
    glyphs(it, (i, g, n) => {
      const q = stg(p, O.lr(i, n), 0.5);
      if (q <= 0) return null; if (q >= 1) return HIDE;
      const [gx, gy] = gpos(g, it), gh = g.h * isy;
      const Y = it.y + gx * sr + gy * cr;                     // design-space y of the glyph
      const flat = 0.2, rise = Math.max(0, Y - gh * flat * 0.5 - 2);
      const sq = seg(q, 0, 0.14), fl = iQuad(seg(q, 0.14, 0.4)), hit = seg(q, 0.4, 0.52), out = iQuad(seg(q, 0.62, 1));
      let sy, sx;
      if (q < 0.14) { sy = 1 - 0.22 * Math.sin(sq * PI / 2); sx = 1 + 0.1 * sq; }
      else if (q < 0.4) { sy = lerp(0.78, 1.5, oCubic(seg(q, 0.14, 0.24))); sx = 0.86; }
      else { sy = lerp(1.5, flat, oCubic(hit * 2.5)) + Math.sin(hit * PI) * 0.06; sx = lerp(0.86, 1.4, oBack(hit, 2)); }
      const d = (q < 0.14 ? (1 - sy) * gh * 0.5 : -rise * fl) - out * gh * 0.45;
      const [dx, dy] = toItem(it, 0, d);
      return { dx, dy, sx, sy, a: 1 - iCubic(seg(q, 0.7, 1)) };
    });
  },
};

/* 指で弾く — each glyph in turn is pressed back, then flicked: it shoots off low and fast, spinning and shrinking into the distance */
X.xhFlick = {
  name: '指で弾く', en: 'Flicked Away', tags: ['pop', 'graphic'], w: 1.1, ae: 'scatter',
  outDur: dur => clamp(dur * 0.44, 0.34, 0.9),
  apply(env, it, p) {
    const O = orders(env, it), size = it.size, dir = dirOf(it, 81), mk = motionK(env), dist = Math.max(env.W, env.H) * 0.42 * mk, seed = it.seed | 0;
    glyphs(it, (i, g, n) => {
      const k = dir > 0 ? 1 - O.lr(i, n) : O.lr(i, n);        // the glyph at the front of the flick direction goes first
      const q = stg(p, k, 0.6);
      if (q <= 0) return null; if (q >= 1) return HIDE;
      if (q < 0.2) { const a = Math.sin(seg(q, 0, 0.2) * PI / 2); return { dx: -dir * a * size * 0.07, rot: -dir * a * 9, sx: 1 - a * 0.08 }; }
      const u = seg(q, 0.2, 1), e = oQuart(u), lift = 0.6 + J.r(seed, i, 82) * 0.9;
      return { dx: dir * (e * dist - (1 - u) * size * 0.07 * (u < 0.1 ? 1 : 0)), dy: (-lift * u + 0.9 * u * u) * size * 1.6, rot: dir * (e * 620 - 9 * (1 - u)), s: 1 - 0.72 * e, a: 1 - iQuad(seg(u, 0.45, 1)) };
    });
  },
};

/* 遠くへ跳ねる — every glyph hops three times on the spot, each hop smaller and further away, until it is too far to see */
X.xhHopFar = {
  name: '遠くへ跳ねる', en: 'Hop Into Distance', tags: ['pop', 'emotional'], w: 1, ae: 'shrink', minDur: 0.6,
  outDur: dur => clamp(dur * 0.5, 0.42, 1.05),
  apply(env, it, p) {
    const O = orders(env, it), size = it.size, isy = it.sy || 1, S = [1, 0.6, 0.3, 0.04];
    glyphs(it, (i, g, n) => {
      const q = stg(p, O.lr(i, n), 0.3);
      if (q <= 0) return null; if (q >= 1) return HIDE;
      const h = Math.min(2, Math.floor(q * 3)), f = q * 3 - h, s = lerp(S[h], S[h + 1], ioCubic(f));
      const [gx, gy] = gpos(g, it), far = 1 - s, land = Math.max(0, 1 - f / 0.14) + Math.max(0, (f - 0.86) / 0.14);
      const sy = 1 + Math.sin(f * PI) * 0.16 - land * 0.2;
      return {
        s, sy, sx: 1 + land * 0.12,
        dx: -gx * far * 0.32, dy: -gy * far * 0.32 - Math.sin(f * PI) * size * S[h] * 0.85 - far * size * 0.18 + (1 - sy) * g.h * isy * s * 0.5,
        a: h < 2 ? 1 : 1 - iQuad(seg(f, 0.3, 1)),
      };
    });
  },
};

/* コンベア送り — the line is fed towards its head in jerky steps like a conveyor; whatever passes the head tips over the end and drops */
X.xhConveyor = {
  name: 'コンベア送り', en: 'Conveyor', tags: ['graphic', 'pop', 'glitch'], w: 0.9, ae: 'fall', minDur: 0.6,
  outDur: dur => clamp(dur * 0.5, 0.42, 1.05),
  apply(env, it, p) {
    const O = orders(env, it), size = it.size, L = linePos(it);
    const per = Math.max(1, Math.ceil(O.N / 7));              // glyphs per step
    const steps = Math.ceil(O.N / per) + 1.4, x = p * steps, k = Math.floor(x), f = x - k;
    const s = (k + oCubic(seg(f, 0, 0.55))) * per;            // how far the belt has moved, in glyph cells
    const drop = (t, ax, ay) => {                             // t = cells past the head
      const u = t / per, v = it.vertical ? [Math.min(1.1, u * 1.6) * size * 0.95, -Math.min(u, 0.5) * size * 0.5 + u * u * size * 2.4] : [-u * size * 0.5, u * u * size * 2.4];
      return { dx: ax + v[0], dy: ay + v[1], rot: (it.vertical ? 1 : -1) * Math.min(1.4, u) * 80, a: 1 - iQuad(seg(u, 0.35, 1.3)) };
    };
    glyphs(it, (i, g) => {
      if (O.single) {
        const t = s - O.idx(i);
        if (t <= 0) return f < 0.55 && k > 0 ? { dx: -Math.sin(seg(f, 0, 0.55) * PI) * size * 0.05 } : null;
        return t >= per * 1.3 ? HIDE : drop(t, 0, 0);
      }
      const row = L[g.li], [gx, gy] = row[g.ci], t = s - g.ci;
      if (t <= 0) { const q = posAt(row, s); return { dx: row[0][0] - q[0], dy: row[0][1] - q[1] }; }   // rigid shift: no overlaps with proportional glyphs
      if (t >= per * 1.3) return HIDE;
      return drop(t, row[0][0] - gx, row[0][1] - gy);
    });
  },
};

/* カード集め — the glyphs are swept up like playing cards: one by one they slide onto the first glyph of their line, and the pile is flipped away */
X.xhGather = {
  name: 'カード集め', en: 'Gather The Cards', tags: ['pop', 'graphic', 'editorial'], w: 0.9, ae: 'shrink', minDur: 0.6,
  outDur: dur => clamp(dur * 0.48, 0.4, 1.0),
  apply(env, it, p) {
    const O = orders(env, it), size = it.size, L = linePos(it), seed = it.seed | 0;
    const fl = iCubic(seg(p, 0.72, 1));
    glyphs(it, (i, g, n) => {
      if (p >= 1) return HIDE;
      const flip = { sx: Math.max(0.02, 1 - fl), a: 1 - iCubic(seg(p, 0.86, 1)) };
      if (O.single) { const q = stg(p, O.lr(i, n), 0.6); return q <= 0 ? null : q >= 1 ? HIDE : { sx: Math.max(0.02, 1 - iCubic(q)), rot: q * 14 }; }
      const row = L[g.li], [gx, gy] = row[g.ci], k = g.n > 1 ? g.ci / (g.n - 1) : 0;
      const q = g.ci === 0 ? 0 : stg(seg(p, 0, 0.72), k, 0.62);
      if (q <= 0 && fl <= 0) return null;
      const e = ioCubic(q), arc = Math.sin(e * PI) * size * 0.22;
      const tx = row[0][0] + J.rs(seed, i, 91) * size * 0.05 - gx, ty = row[0][1] + J.rs(seed, i, 92) * size * 0.05 - gy;
      const o = mv(it, 0, -arc);
      return { dx: tx * e + o.dx, dy: ty * e + o.dy - fl * size * 0.25, rot: J.rs(seed, i, 93) * 9 * e, sx: flip.sx, a: flip.a };
    });
  },
};

/* 階段落ち — the line breaks into a staircase, each glyph one step lower than the one before; then the glyphs slide down the stairs and off, lowest first */
X.xhStairs = {
  name: '階段落ち', en: 'Down The Stairs', tags: ['graphic', 'pop', 'editorial'], w: 1, ae: 'fall', minDur: 0.55,
  outDur: dur => clamp(dur * 0.48, 0.4, 1.0),
  apply(env, it, p) {
    const O = orders(env, it), size = it.size, mk = motionK(env);
    const nn = Math.max(2, O.N), stepH = Math.min(size * 0.24, size * 2.2 / nn);
    const x = seg(p, 0, 0.42) * (nn - 1), fk = Math.floor(x), m = fk + oBack(seg(x - fk, 0, 0.7), 2.2);
    glyphs(it, (i, g, n) => {
      const ci = O.single ? O.idx(i) : (n > 1 ? O.lr(i, n) * (nn - 1) : 0);
      const down = stepH * Math.min(ci, m);
      const q = stg(seg(p, 0.36, 1), 1 - ci / (nn - 1), 0.4);
      if (q >= 1) return HIDE;
      if (down <= 0 && q <= 0) return null;
      const e = iQuad(q) * size * 4.2 * mk;
      const o = it.vertical ? { dx: -down - e * 0.5, dy: e } : { dx: e, dy: down + e * 0.5 };
      o.rot = q > 0 ? Math.min(1, q * 4) * (it.vertical ? -10 : 10) : 0;
      o.a = 1 - iQuad(seg(q, 0.4, 1));
      return o;
    });
  },
};

/* 隣を呑み込む — starting at the head of the line, each glyph slides into its neighbour and is swallowed; the neighbour bulges, then is swallowed in turn, and the last one gulps and is gone */
X.xhEatAlong = {
  name: '隣を呑み込む', en: 'Swallow Along', tags: ['pop', 'emotional', 'graphic'], w: 1, ae: 'shrink', minDur: 0.55,
  outDur: dur => clamp(dur * 0.48, 0.4, 1.0),
  apply(env, it, p) {
    const O = orders(env, it), L = linePos(it);
    const gulp = (q) => ({ s: Math.max(0.01, (1 + Math.sin(seg(q, 0, 0.45) * PI / 2) * 0.3) * (1 - iCubic(seg(q, 0.35, 1)))) });
    glyphs(it, (i, g, n) => {
      if (O.single) { const q = stg(p, O.lr(i, n), 0.6); return q <= 0 ? null : q >= 1 ? HIDE : gulp(q); }
      const row = L[g.li], nn = g.n, f = seg(p, 0, 0.78) * (nn - 1);
      const bulge = g.ci > 0 ? Math.sin(seg(f - (g.ci - 1), 0.35, 1.25) * PI) * 0.26 : 0;
      if (g.ci === nn - 1) {
        const q = seg(p, 0.74, 1);
        if (q >= 1) return HIDE;
        const grow = nn > 1 ? seg(f / (nn - 1), 0, 1) * 0.14 : 0;
        if (q <= 0) return bulge || grow ? { s: 1 + bulge + grow } : null;
        const o = gulp(q); o.s *= 1 + grow; return o;
      }
      const t = f - g.ci;
      if (t >= 1) return HIDE;
      if (t <= 0) return bulge ? { s: 1 + bulge } : null;
      const e = iQuad(t), [gx, gy] = row[g.ci], T = row[g.ci + 1];
      return { dx: (T[0] - gx) * e, dy: (T[1] - gy) * e, s: (1 + bulge) * (1 - 0.6 * e), a: 1 - iCubic(t) };
    });
  },
};

/* 席替え — neighbours trade places over and under each other, then trade again with the neighbour on the other side, fading with every exchange */
X.xhShuffle = {
  name: '席替え', en: 'Trade Places', tags: ['pop', 'graphic', 'glitch'], w: 0.9, ae: 'scatter', minDur: 0.55,
  outDur: dur => clamp(dur * 0.48, 0.4, 1.0),
  apply(env, it, p) {
    const O = orders(env, it), size = it.size, L = linePos(it);
    const e1 = ioCubic(seg(p, 0, 0.42)), e2 = ioCubic(seg(p, 0.4, 0.8)), end = iCubic(seg(p, 0.62, 1));
    glyphs(it, (i, g) => {
      if (p >= 1) return HIDE;
      const sg = O.ci(g) % 2 ? 1 : -1;
      const arc = (Math.sin(e1 * PI) + Math.sin(e2 * PI) * 0.8) * size * 0.5 * sg;
      const tail = { s: Math.max(0.01, 1 - end * 0.7), a: (1 - 0.3 * e1) * (1 - end) };
      if (O.single || g.n < 2) { const o = mv(it, 0, arc); return Object.assign(o, tail, { rot: sg * (e1 + e2) * 25 }); }
      const row = L[g.li], n = g.n, s0 = g.ci;
      let s1 = s0 ^ 1; if (s1 >= n) s1 = s0;
      let s2 = s1 % 2 ? s1 + 1 : s1 - 1; if (s2 < 0 || s2 >= n) s2 = s1;
      const A = row[s0], B = row[s1], C = row[s2];
      const x = lerp(lerp(A[0], B[0], e1), C[0], e2), y = lerp(lerp(A[1], B[1], e1), C[1], e2);
      const o = mv(it, 0, arc);
      return Object.assign(tail, { dx: x - A[0] + o.dx, dy: y - A[1] + o.dy });
    });
  },
};

/* =====================================================================
   C. PER-GLYPH SHAPE CHANGES
   ===================================================================== */

/* 字ごとシャッター — every glyph has its own shutter: in a scattered order they close, alternately from the sides and from top and bottom, to a slit and out */
X.xhShutters = {
  name: '字ごとシャッター', en: 'Glyph Shutters', tags: ['graphic', 'editorial', 'glitch'], w: 1.1, ae: 'wipe',
  outDur: dur => clamp(dur * 0.4, 0.3, 0.8),
  apply(env, it, p) {
    const O = orders(env, it), seed = O.single ? (env.cut.seed | 0) : (it.seed | 0);
    glyphs(it, (i) => {
      const k = O.idx(i), q = stg(p, J.r(seed, k, 101), 0.55);
      if (q <= 0) return null; if (q >= 1) return HIDE;
      const w = 0.62 * (1 - ioCubic(seg(q, 0, 0.8)) * 0.94) * (1 - iQuad(seg(q, 0.8, 1)));
      if (w <= 0.004) return HIDE;
      return k % 2 ? { clipY: [-w, w] } : { clipX: [-w, w] };
    });
  },
};

/* 踏み潰し — a heavy foot walks along the line: glyph after glyph is slammed flat onto the baseline into a dash, the neighbours jump, and the dashes shrink away */
X.xhStomp = {
  name: '踏み潰し', en: 'Stomped Flat', tags: ['pop', 'graphic'], w: 1, ae: 'shrink',
  outDur: dur => clamp(dur * 0.46, 0.36, 0.95),
  apply(env, it, p) {
    const O = orders(env, it), size = it.size, isy = it.sy || 1, SP = 0.55, HIT = 0.26;
    const qOf = k => stg(p, k, SP);
    glyphs(it, (i, g, n) => {
      const k = O.lr(i, n), q = qOf(k);
      if (q >= 1) return HIDE;
      // jolt from the neighbour that was just hit
      const dk = 1 / Math.max(1, O.N - 1), qp = qOf(k - dk), jt = k - dk >= -1e-6 ? seg(qp, HIT, HIT + 0.3) : 0;
      const jolt = jt > 0 && jt < 1 && q < HIT ? Math.sin(jt * PI) * (1 - jt) * size * 0.12 : 0;
      if (q <= 0) return jolt ? { dy: -jolt } : null;
      const hit = iCubic(seg(q, 0, HIT)), wob = seg(q, HIT, 0.5), back = iQuad(seg(q, 0.5, 1));
      const sy = Math.max(0.035, lerp(1, 0.07, hit)), sx = (1 + hit * 0.5 - Math.sin(wob * PI) * 0.08 * (q > HIT ? 1 : 0)) * (1 - back);
      if (sx <= 0.01) return HIDE;
      return { sx, sy, dy: (1 - sy) * g.h * isy * 0.5 - jolt, a: 1 - iCubic(seg(q, 0.8, 1)) };
    });
  },
};

/* コイン回転 — each glyph is tossed like a coin: it spins faster and faster about its upright axis while it rises and dwindles */
X.xhCoinSpin = {
  name: 'コイン回転', en: 'Coin Spin', tags: ['pop', 'graphic', 'emotional'], w: 1, ae: 'shrink',
  outDur: dur => clamp(dur * 0.46, 0.36, 0.95),
  apply(env, it, p) {
    const O = orders(env, it), size = it.size;
    glyphs(it, (i, g, n) => {
      const q = stg(p, O.lr(i, n), 0.4);
      if (q <= 0) return null; if (q >= 1) return HIDE;
      const c = Math.cos(q * q * TAU * 2.25), sp = (c < 0 ? -1 : 1) * Math.max(0.03, Math.abs(c));
      const o = { s: Math.max(0.01, 1 - iCubic(q)), dy: -(1.5 * q - 0.5 * q * q) * size * 0.9, a: 1 - iCubic(seg(q, 0.6, 1)) };
      if (it.vertical && !g.r90) o.sy = sp; else o.sx = sp;
      return o;
    });
  },
};

/* 一字ずつめくる — the glyphs are turned like pages, each swinging round its leading edge onto the place of the one before and fading as it lands */
X.xhPageTurn = {
  name: '一字ずつめくる', en: 'Page By Page', tags: ['editorial', 'calm', 'emotional'], w: 1.1, ae: 'wipe',
  outDur: dur => clamp(dur * 0.46, 0.36, 0.95),
  apply(env, it, p) {
    const O = orders(env, it), isx = it.sx || 1, isy = it.sy || 1;
    glyphs(it, (i, g, n) => {
      const q = stg(p, O.lr(i, n), 0.62);
      if (q <= 0) return null; if (q >= 1) return HIDE;
      const th = ioCubic(q) * PI, c = Math.cos(th), sc = (c < 0 ? -1 : 1) * Math.max(0.03, Math.abs(c));
      const a = th < PI / 2 ? 1 : 1 - seg(th, PI * 0.5, PI * 0.92);
      if (a <= 0.003) return HIDE;
      if (it.vertical && !g.r90) return { sy: sc, dy: -(1 - c) * g.h * isy * 0.5, a };
      return { sx: sc, dx: -(1 - c) * g.w * isx * 0.5, sy: 1 + Math.sin(th) * 0.08, a };
    });
  },
};

/* 傾いて滑る — the glyphs tip over one by one as if the floor were tilted, then slide down the slope and off, the downhill ones first */
X.xhTiltSlide = {
  name: '傾いて滑る', en: 'Tilt And Slide', tags: ['pop', 'graphic', 'editorial'], w: 1.1, ae: 'drift',
  outDur: dur => clamp(dur * 0.46, 0.36, 0.95),
  apply(env, it, p) {
    const O = orders(env, it), dir = dirOf(it, 111), ANG = 22, mk = motionK(env), dist = Math.max(env.W, env.H) * 0.55 * mk;
    const ca = Math.cos(ANG * DEG), sa = Math.sin(ANG * DEG);
    glyphs(it, (i, g, n) => {
      const k = dir > 0 ? O.lr(i, n) : 1 - O.lr(i, n);          // k = 1 is the downhill end
      const t = stg(seg(p, 0, 0.5), 1 - k, 0.55), q = stg(seg(p, 0.3, 1), 1 - k, 0.45);
      if (t <= 0) return null; if (q >= 1) return HIDE;
      const e = iQuad(q) * dist;
      return { rot: dir * ANG * oBack(t, 2.6), dx: dir * ca * e, dy: sa * e, a: 1 - iQuad(seg(q, 0.45, 1)) };
    });
  },
};

/* 蛇腹畳み — the line folds up like a concertina: the glyphs lean alternately left and right, squeeze thin and close up against the head of the line, and the folded stack shuts */
X.xhConcertina = {
  name: '蛇腹畳み', en: 'Concertina', tags: ['graphic', 'editorial', 'pop'], w: 1, ae: 'shrink',
  outDur: dur => clamp(dur * 0.44, 0.34, 0.9),
  apply(env, it, p) {
    const O = orders(env, it), L = linePos(it), isx = it.sx || 1, isy = it.sy || 1;
    const shut = iQuad(seg(p, 0.5, 0.94));
    glyphs(it, (i, g, n) => {
      if (p >= 1) return HIDE;
      const e = ioCubic(stg(seg(p, 0, 0.6), 1 - O.lr(i, n), 0.25)), sg = O.ci(g) % 2 ? 1 : -1, thin = Math.max(0.03, 1 - e * 0.88);
      const o = { a: 1 - iCubic(seg(p, 0.85, 1)) };
      if (!O.single) {
        const row = L[g.li], [gx, gy] = row[g.ci], H = row[0], half = (it.vertical ? g.h * isy : g.w * isx) * 0.5 * (1 - thin);
        o.dx = (H[0] - gx) * e * 0.9 - (it.vertical ? 0 : (g.ci === 0 ? half : 0));
        o.dy = (H[1] - gy) * e * 0.9 - (it.vertical ? (g.ci === 0 ? half : 0) : 0);
      }
      if (it.vertical && !g.r90) { o.sy = thin; o.rot = sg * e * 10; o.sx = Math.max(0.02, 1 - shut); }
      else { o.sx = thin; o.skew = sg * e * 30; o.sy = Math.max(0.02, 1 - shut); }
      return o;
    });
  },
};

/* =====================================================================
   D. SWAPS
   ===================================================================== */

/* バーコード化 — each glyph is squeezed into a bar of its own width, so the line becomes a barcode; a reader then runs along it and the bars drop out */
X.xhBarcode = {
  name: 'バーコード化', en: 'Into Barcode', tags: ['graphic', 'glitch', 'editorial'], w: 0.9, ae: 'glitch', minDur: 0.55,
  outDur: dur => clamp(dur * 0.48, 0.4, 1.0),
  apply(env, it, p) {
    const O = orders(env, it), seed = O.single ? (env.cut.seed | 0) : (it.seed | 0), isx = it.sx || 1, isy = it.sy || 1, vert = it.vertical;
    glyphs(it, (i, g, n) => {
      const k = O.lr(i, n), id = O.idx(i);
      const a = stg(seg(p, 0, 0.55), k, 0.5), b = stg(seg(p, 0.5, 1), k, 0.55);
      if (a <= 0) return null; if (b >= 1) return HIDE;
      const wk = 0.07 + 0.2 * J.r(seed, id, 121) * J.r(seed, id, 122) + (J.r(seed, id, 123) < 0.3 ? 0.14 : 0);
      const bar = a >= 0.5, thin = bar ? lerp(0.34, wk, oCubic(seg(a, 0.5, 1))) : lerp(1, 0.3, iQuad(seg(a, 0, 0.5)));
      const long = (bar ? lerp(0.9, 1.12, oCubic(seg(a, 0.5, 1))) : 1) * Math.max(0.02, 1 - ioCubic(b));
      const cell = vert ? g.w * isx : g.h * isy, off = (bar ? 1.12 : 1) * ioCubic(b) * cell * 0.5;
      const o = vert ? { sy: thin, sx: long, dx: -off } : { sx: thin, sy: long, dy: off };
      if (bar) { o.ch = '■'; o.s = 1 / (g.fs || 1); if (g.r90) o.rot = -90; }
      return o;
    });
  },
};

/* 信号になる — the glyphs shrink into dots and dashes, a line of Morse in the accent colour, which is then keyed off signal by signal */
X.xhMorse = {
  name: '信号になる', en: 'Into Morse', tags: ['graphic', 'glitch', 'editorial'], w: 0.8, ae: 'glitch', minDur: 0.6,
  outDur: dur => clamp(dur * 0.5, 0.42, 1.05),
  apply(env, it, p) {
    const O = orders(env, it), seed = O.single ? (env.cut.seed | 0) : (it.seed | 0), hot = hotOf(env, it), vert = it.vertical;
    glyphs(it, (i, g, n) => {
      const k = O.lr(i, n), id = O.idx(i);
      const a = stg(seg(p, 0, 0.5), k, 0.5), b = stg(seg(p, 0.5, 1), k, 0.6);
      if (a <= 0) return null; if (b >= 1) return HIDE;
      if (a < 0.5) return { s: Math.max(0.05, 1 - iQuad(a * 2) * 0.9), a: 1 - iQuad(a * 2) * 0.5 };
      if (b > 0.45 && b < 0.72) return HIDE;                   // keyed off … on … off
      const dash = J.r(seed, id, 131) < 0.42, u = oBack(seg(a, 0.5, 1), 2.2), fs = 1 / (g.fs || 1);
      const o = { ch: '●', color: hot, s: 0.24 * u * fs * (b >= 0.72 ? 0.8 : 1), rot: g.r90 ? -90 : 0 };
      if (dash) { if (vert) o.sy = 3.1; else o.sx = 3.1; }
      return o;
    });
  },
};

/* 句点で終わる — the sentence closes itself: the glyphs dwindle into the baseline one after another, the last one turns into a full stop that stays for a beat, then drops */
X.xhFullStop = {
  name: '句点で終わる', en: 'Full Stop', tags: ['editorial', 'calm', 'emotional'], w: 1, ae: 'shrink', minDur: 0.65,
  outDur: dur => clamp(dur * 0.5, 0.45, 1.1),
  apply(env, it, p) {
    const O = orders(env, it), size = it.size, isy = it.sy || 1, lay = layOf(it);
    let last = -1;
    for (const g of lay) if (!isBlank(g.ch)) last = g.i;
    const isLast = i => (O.single ? O.idx(i) >= O.N - 1 : i === last);
    glyphs(it, (i, g, n) => {
      if (!isLast(i)) {
        const q = stg(seg(p, 0, 0.62), O.lr(i, n), 0.55);
        if (q <= 0) return null; if (q >= 1) return HIDE;
        const e = iQuad(q);
        return { s: Math.max(0.01, 1 - e), dy: e * g.h * isy * 0.42, a: 1 - iCubic(q) };
      }
      if (p >= 1) return HIDE;
      const fall = iQuad(seg(p, 0.84, 1)), end = { dy: fall * size * 0.55, a: 1 - fall };
      if ('。．.'.includes(g.ch)) return p > 0.84 ? end : null;        // already a full stop: it simply stays to the end
      const a = seg(p, 0.42, 0.6);
      if (a <= 0) return null;
      if (a < 1) { const e = iQuad(a); return { s: Math.max(0.01, 1 - e), dy: e * g.h * isy * 0.42 }; }
      const latin = J.isLatin(g.ch) || /[0-9]/.test(g.ch), u = oBack(seg(p, 0.6, 0.72), 2.6);
      const o = { ch: latin ? '.' : '。', s: Math.max(0.01, u) / (g.fs || 1), dx: 0, dy: end.dy, a: end.a };
      if (it.vertical && !latin) { o.dx += size * 0.3; o.dy -= size * 0.3; }
      if (g.r90) o.rot = -90;
      return o;
    });
  },
};

/* =====================================================================
   E. STROKE PIECES COMING APART
   ===================================================================== */
/* glyph-level stand-in for items whose strokes cannot be drawn separately (outline / gradient / pattern text) */
const softOut = (env, it, p, spread, fn) => { const O = orders(env, it); glyphs(it, (i, g, n) => {
  const q = stg(p, O.lr(i, n), spread);
  if (q <= 0) return null; if (q >= 1) return HIDE;
  return fn(q, i, g);
}); };
/* per-glyph progress for piece functions + a late fade that also catches glyphs without separate pieces */
function pieceSetup(env, it, p, spread) {
  const O = orders(env, it), lay = layOf(it);
  glyphs(it, () => (p >= 1 ? HIDE : p > 0.84 ? { a: 1 - iQuad(seg(p, 0.84, 1)) } : null));
  return ci => stg(p, O.lr(ci, lay.N), spread);
}

/* 段ずれ抜け — every glyph comes apart in horizontal layers: its strokes are drawn out row by row, alternately to the left and to the right */
X.xhPieceStrata = {
  name: '段ずれ抜け', en: 'Strata Slide Out', tags: ['graphic', 'editorial', 'glitch'], w: 1, ae: 'slice', pieces: true, minDur: 0.5,
  outDur: dur => clamp(dur * 0.46, 0.36, 0.95),
  apply(env, it, p) {
    const size = it.size, mk = motionK(env);
    if (noPieces(it)) { softOut(env, it, p, 0.4, (q, i) => ({ dx: (i % 2 ? 1 : -1) * iCubic(q) * size * 1.2, a: 1 - iQuad(q) })); return; }
    const gq = pieceSetup(env, it, p, 0.35);
    it.pieceFns.push((ci, pj, pc) => {
      const row = clamp(Math.floor((pc.cy + 0.5) * 5), 0, 4);
      const u = seg(gq(ci), row / 4 * 0.42, row / 4 * 0.42 + 0.58);
      if (u <= 0) return J.PID; if (u >= 1) return null;
      const e = iCubic(u);
      return J.PT(((row + ci) % 2 ? 1 : -1) * e * size * 1.7 * mk, 0, 0, 1, 1 + e * 1.3, 0, 1 - iQuad(seg(u, 0.35, 1)));
    });
  },
};

/* 画が痩せる — the glyphs lose their strokes in place: the smallest dots and ticks shrink to nothing first, the big strokes hold out longest */
X.xhPieceThin = {
  name: '画が痩せる', en: 'Strokes Wither', tags: ['emotional', 'calm', 'editorial'], w: 1.1, ae: 'shrink', pieces: true, minDur: 0.5,
  outDur: dur => clamp(dur * 0.48, 0.38, 1.0),
  apply(env, it, p) {
    const seed = it.seed | 0;
    if (noPieces(it)) { softOut(env, it, p, 0.4, q => ({ s: Math.max(0.01, 1 - iQuad(q)), a: 1 - iCubic(q) })); return; }
    const gq = pieceSetup(env, it, p, 0.3);
    it.pieceFns.push((ci, pj, pc) => {
      const big = clamp(Math.sqrt(pc.area || 0.02) / 0.5) * 0.45 + J.r(seed, ci, pj, 141) * 0.12;
      const u = seg(gq(ci), big, big + 0.42);
      if (u <= 0) return J.PID; if (u >= 1) return null;
      const s = 1 - ioCubic(u);
      return s <= 0.02 ? null : J.PT(0, 0, 0, s, 1, 0, 1);
    });
  },
};

/* 画が回る — every stroke starts to spin on its own centre like a propeller, faster and faster, until the whirling pieces dwindle to nothing */
X.xhPieceSpin = {
  name: '画が回る', en: 'Stroke Propellers', tags: ['pop', 'glitch', 'graphic'], w: 0.9, ae: 'scatter', pieces: true, minDur: 0.5,
  outDur: dur => clamp(dur * 0.48, 0.38, 1.0),
  apply(env, it, p) {
    const size = it.size, seed = it.seed | 0;
    if (noPieces(it)) { softOut(env, it, p, 0.4, (q, i) => ({ rot: (i % 2 ? 1 : -1) * q * q * 300, s: Math.max(0.01, 1 - iCubic(q)), a: 1 - iCubic(q) })); return; }
    const gq = pieceSetup(env, it, p, 0.35);
    it.pieceFns.push((ci, pj, pc) => {
      const d = J.r(seed, ci, pj, 151) * 0.22, u = seg(gq(ci), d, d + 0.78);
      if (u <= 0) return J.PID; if (u >= 1) return null;
      const dir = (ci + pj) % 2 ? 1 : -1, out = iQuad(u) * size * 0.22;
      const r = Math.hypot(pc.cx, pc.cy), ax = r > 0.02 ? pc.cx / r : 0, ay = r > 0.02 ? pc.cy / r : 0;
      return J.PT(ax * out, ay * out, dir * u * u * 760, Math.max(0.02, 1 - iCubic(seg(u, 0.35, 1))), 1, 0, 1 - iCubic(seg(u, 0.6, 1)));
    });
  },
};

/* 画が積もる — the strokes let go from the bottom up and drop into a little heap at the foot of each glyph; the heaps then sink away */
X.xhPieceHeap = {
  name: '画が積もる', en: 'Stroke Heaps', tags: ['pop', 'emotional', 'graphic'], w: 0.9, ae: 'fall', pieces: true, shatter: true, minDur: 0.6,
  outDur: dur => clamp(dur * 0.52, 0.44, 1.1),
  apply(env, it, p) {
    const size = it.size, isx = it.sx || 1, isy = it.sy || 1, seed = it.seed | 0;
    if (noPieces(it)) {
      softOut(env, it, p, 0.4, (q, i, g) => { const sy = Math.max(0.05, 1 - iQuad(seg(q, 0, 0.6)) * 0.9); return { sy, dy: (1 - sy) * g.h * isy * 0.5, a: 1 - iQuad(seg(q, 0.6, 1)) }; });
      return;
    }
    const gq = pieceSetup(env, it, p, 0.3);
    it.shatter = true;                                         // rubble, not whole strokes
    it.pieceFns.push((ci, pj, pc) => {
      const q = gq(ci);
      if (q <= 0) return J.PID; if (q >= 1) return null;
      const t0 = clamp(0.5 - pc.cy) * 0.3, u = seg(q, t0, t0 + 0.3), sink = iQuad(seg(q, 0.68, 1));
      if (u <= 0) return J.PID;
      const e = iQuad(u), land = seg(q, t0 + 0.3, t0 + 0.42);
      const dy0 = (0.44 - pc.cy) * size * isy - J.r(seed, ci, pj, 161) * size * 0.1, dx0 = -pc.cx * size * isx * 0.5 + J.rs(seed, ci, pj, 162) * size * 0.16;
      const hop = u >= 1 && land < 1 ? Math.sin(land * PI) * size * 0.05 : 0;
      return J.PT(dx0 * e, dy0 * e - hop + sink * size * 0.3, J.rs(seed, ci, pj, 163) * 120 * e, 1 - sink * 0.4, 1 + (u < 1 ? e * 0.5 : 0), 90, 1 - sink);
    });
  },
};

/* 偏と旁が別れる — each glyph parts down the middle: the strokes of its left side and of its right side draw apart, pause, and then fly off in opposite directions */
X.xhPieceParts = {
  name: '偏と旁が別れる', en: 'Radicals Part', tags: ['editorial', 'emotional', 'graphic'], w: 1.1, ae: 'slice', pieces: true, minDur: 0.5,
  outDur: dur => clamp(dur * 0.48, 0.38, 1.0),
  apply(env, it, p) {
    const size = it.size, mk = motionK(env), far = Math.max(env.W, env.H) * 0.4 * mk;
    if (noPieces(it)) {
      softOut(env, it, p, 0.3, (q, i) => { const o = mv(it, (i % 2 ? 1 : -1) * (oCubic(seg(q, 0, 0.35)) * size * 0.12 + iCubic(seg(q, 0.4, 1)) * far), 0); o.a = 1 - iQuad(seg(q, 0.5, 1)); return o; });
      return;
    }
    const gq = pieceSetup(env, it, p, 0.3);
    it.pieceFns.push((ci, pj, pc) => {
      const q = gq(ci);
      if (q <= 0) return J.PID; if (q >= 1) return null;
      const d = oCubic(seg(q, 0, 0.32)) * size * 0.13 + iCubic(seg(q, 0.42, 1)) * far, a = 1 - iQuad(seg(q, 0.55, 1));
      const st = 1 + iCubic(seg(q, 0.42, 1)) * 1.2;
      if (Math.abs(pc.cx) < 0.05) { const sg = Math.abs(pc.cy) < 0.05 ? (ci % 2 ? 1 : -1) : pc.cy < 0 ? -1 : 1; return J.PT(0, sg * d * 0.8, 0, 1, st, 90, a); }   // centred strokes part up / down
      return J.PT((pc.cx < 0 ? -1 : 1) * d, 0, 0, 1, st, 0, a);
    });
  },
};

/* safety net: p≈1 is always fully gone, whatever a recipe leaves at the very end */
for (const k of Object.keys(X)) {
  const f = X[k].apply;
  X[k].apply = (env, it, p, ctx) => { if (p >= 0.998) { it.alpha = 0; return; } f(env, it, p, ctx); };
  J.register('exit', k, X[k], P);
}
})();
