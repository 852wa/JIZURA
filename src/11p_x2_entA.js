/* JIZURA pack: x2entA — 30 per-glyph entrances (ordering patterns, glyph paths, glyph shape changes, placeholder swaps, stroke assemblies) */
(() => {
'use strict';
const E = J.E;
const P = 'x2entA';
const DEG = J.DEG, TAU = J.TAU, PI = Math.PI;
const clamp = J.clamp, lerp = J.lerp;
const HIDE = Object.freeze({ hide: true });
const reg = (key, def) => J.register('enter', key, def, P);

/* ---------------- easing ---------------- */
const oCubic = x => 1 - Math.pow(1 - clamp(x), 3);
const oQuart = x => 1 - Math.pow(1 - clamp(x), 4);
const iQuad = x => { x = clamp(x); return x * x; };
const ioCubic = x => { x = clamp(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const oBack = (x, s) => E.outBack(clamp(x), s);
// damped spring: 1 at t=0 → exactly 0 at t=1 (swings through 0)
const spring = (t, k, f) => { t = clamp(t); return Math.exp(-k * t) * Math.cos(f * PI * t) * (1 - t * t * t); };
// triangle wave −1..1 (starts at −1)
const tri = x => 2 * Math.abs(2 * (x - Math.floor(x + 0.5))) - 1;

/* ---------------- stagger / order ---------------- */
const stg = (p, k, spread) => clamp((p - spread * k) / (1 - spread));
const ordLR = (i, n) => (n > 1 ? i / (n - 1) : 0);
// 0 at the middle of the glyph's own line → 1 at both ends
const ctr = g => (g.n > 1 ? Math.abs(g.ci - (g.n - 1) / 2) / ((g.n - 1) / 2) : 0);
const sideOf = g => (g.n > 1 ? Math.sign(g.ci - (g.n - 1) / 2) : 0);

/* ---------------- item helpers ---------------- */
const isHex = c => typeof c === 'string' && c[0] === '#' && (c.length === 7 || c.length === 4);
const pick = (...cs) => cs.find(isHex) || '#ffffff';
const isBlank = ch => ch === ' ' || ch === '　';
const layOf = it => (it._m || (it._m = J.measure(it))).lay;
const gpos = (g, it) => [(g.x + (g.vx || 0)) * (it.sx || 1), (g.y + (g.vy || 0)) * (it.sy || 1)];
const glyphs = (it, fn) => { it.charFns.push(fn); };
const dirOf = (it, salt) => (J.r(it.seed | 0, salt, 5) < 0.5 ? -1 : 1);
// offset along the writing direction / across it (cr < 0 = "above" a horizontal line, to the right of a vertical one)
const mv = (it, al, cr) => (it.vertical ? { dx: -cr, dy: al } : { dx: al, dy: cr });
// glyph extent along the writing direction, in item px
const alongW = (g, it) => (it.vertical ? g.h * (it.sy || 1) : g.w * (it.sx || 1));
// flash colour that differs from the item's own colour
const hotOf = (env, it) => (it.color === env.sc.accent ? pick(env.sc.accent2, env.sc.fg) : pick(env.sc.accent, env.sc.fg));
// stroke pieces cannot be used on outline / gradient / pattern items: those get a glyph-level fallback
const noPieces = it => it.fill === false || !!it.gradient || !!it.pattern || it.dash != null;
// width of a full-width placeholder glyph relative to this glyph's slot (keeps ■ □ inside narrow latin slots)
// (glyphs turned sideways in vertical text keep their advance along their own x axis)
const inkW = g => (g.r90 ? g.h : g.w);
const slotK = (g, it) => clamp(inkW(g) / Math.max(1, it.size * (g.fs || 1)), 0.3, 1);
/* per line: positions of the first / last glyph and the middle between them (item-local, scaled) */
function lineInfo(it) {
  const lay = layOf(it), L = [];
  for (const g of lay) {
    const [x, y] = gpos(g, it);
    const l = L[g.li] || (L[g.li] = { x0: x, y0: y, x1: x, y1: y });
    if (g.ci === 0) { l.x0 = x; l.y0 = y; }
    l.x1 = x; l.y1 = y;
  }
  for (const l of L) if (l) { l.cx = (l.x0 + l.x1) / 2; l.cy = (l.y0 + l.y1) / 2; }
  return L;
}

/* =====================================================================
   A. ORDERING PATTERNS
   ===================================================================== */

/* 中央から配る — every glyph starts stacked on the middle of its line and is dealt outwards like cards, middle first */
reg('xeCenterDeal', {
  name: '中央から配る', en: 'Centre Deal', tags: ['pop', 'graphic', 'editorial'], w: 1.2, ae: 'assemble',
  inDur: dur => clamp(dur * 0.42, 0.18, 0.75),
  apply(env, it, p) {
    const L = lineInfo(it);
    glyphs(it, (i, g) => {
      const q = stg(p, ctr(g), 0.45);
      if (q <= 0) return HIDE; if (q >= 1) return null;
      const l = L[g.li], [gx, gy] = gpos(g, it), e = oBack(q, 1.25), k = 1 - e;
      return { dx: (l.cx - gx) * k, dy: (l.cy - gy) * k, rot: sideOf(g) * (1 - oCubic(q)) * 22, s: lerp(0.72, 1, oCubic(q)), a: clamp(q * 5) };
    });
  },
});

/* 両端から — the outermost pair slides in first, then pair after pair closes in; the middle glyph punches in last */
reg('xeEndsInward', {
  name: '両端から', en: 'Ends Inward', tags: ['graphic', 'editorial', 'pop'], w: 1.1, ae: 'slice',
  inDur: dur => clamp(dur * 0.42, 0.18, 0.75),
  apply(env, it, p) {
    const size = it.size;
    glyphs(it, (i, g) => {
      const q = stg(p, 1 - ctr(g), 0.5);
      if (q <= 0) return HIDE; if (q >= 1) return null;
      const sd = sideOf(g);
      if (!sd) return { s: lerp(1.9, 1, oBack(q, 1.4)), a: clamp(q * 4) };
      const k = 1 - oQuart(q), st = 1 + k * 0.7;
      const o = mv(it, sd * k * size * 1.7, 0);
      o.a = clamp(q * 4);
      if (it.vertical) o.sy = st; else o.sx = st;
      return o;
    });
  },
});

/* 隙間埋め — every other glyph fades in first, leaving gaps; the missing ones then fall into the gaps and jolt their neighbours */
reg('xeFillGaps', {
  name: '隙間埋め', en: 'Fill The Gaps', tags: ['pop', 'graphic'], w: 1, ae: 'drop', minDur: 0.5,
  inDur: dur => clamp(dur * 0.46, 0.22, 0.85),
  apply(env, it, p) {
    const size = it.size, isy = it.sy || 1, lay = layOf(it), N = lay.N;
    const t0 = i => 0.36 + ordLR(i, N) * 0.34, LAND = 0.26;
    const fallen = j => (j >= 0 && j < N && lay[j] && lay[j].ci % 2 === 1 ? (p - t0(j) - LAND) / 0.2 : -1);
    glyphs(it, (i, g, n) => {
      if (g.ci % 2 === 0) {
        const q = clamp((p - ordLR(i, n) * 0.18) / 0.28);
        if (q <= 0) return HIDE;
        let jolt = 0;
        for (const j of [i - 1, i + 1]) { const v = fallen(j); if (v > 0 && v < 1) jolt += Math.sin(v * PI) * (1 - v); }
        if (q >= 1 && !jolt) return null;
        return { s: lerp(0.82, 1, oCubic(q)), a: E.inOutSine(q), dy: jolt * size * 0.09, rot: jolt * (g.ci % 4 ? 3 : -3) };
      }
      const u = (p - t0(i)) / LAND;
      if (u <= 0) return HIDE;
      if (u < 1) return { dy: -(1 - iQuad(u)) * size * 1.5, a: clamp(u * 5) };
      const v = clamp((u - 1) * LAND / 0.14);
      if (v >= 1) return null;
      const sq = 1 - 0.2 * Math.sin(v * PI);
      return { sy: sq, sx: 1 + (1 - sq) * 0.6, dy: (1 - sq) * g.h * isy * 0.5 };
    });
  },
});

/* 漢字が先 — kanji (or word heads) drop in heavy and big; the kana then float up softly around them */
reg('xeKanjiFirst', {
  name: '漢字が先', en: 'Kanji First', tags: ['editorial', 'emotional', 'graphic', 'calm'], w: 1.2, ae: 'drop',
  inDur: dur => clamp(dur * 0.45, 0.2, 0.85),
  apply(env, it, p) {
    const size = it.size, lay = layOf(it), chs = lay.map(g => g.ch);
    const vis = chs.filter(c => !isBlank(c)).length;
    let heavy = chs.map(c => J.isKanji(c)), cnt = heavy.filter(Boolean).length;
    if (!cnt || cnt === vis) { heavy = chs.map((c, i) => !isBlank(c) && (lay[i].ci === 0 || isBlank(chs[i - 1]))); cnt = heavy.filter(Boolean).length; }
    if (vis > 3 && (cnt <= 1 || cnt === vis)) heavy = chs.map((c, i) => lay[i].ci % 3 === 0);
    glyphs(it, (i, g, n) => {
      if (heavy[i]) {
        const q = clamp((p - ordLR(i, n) * 0.22) / 0.42);
        if (q <= 0) return HIDE; if (q >= 1) return null;
        const f = iQuad(clamp(q / 0.55)), v = clamp((q - 0.55) / 0.45);
        return { dy: -(1 - f) * size * 1.1 - Math.sin(v * PI) * (1 - v) * size * 0.1, s: lerp(1.55, 1, f) * (1 + 0.08 * Math.sin(v * PI) * (1 - v)), a: clamp(q * 6) };
      }
      const q = clamp((p - 0.36 - ordLR(i, n) * 0.26) / 0.38);
      if (q <= 0) return HIDE; if (q >= 1) return null;
      return { dy: (1 - oCubic(q)) * size * 0.42, a: E.inOutSine(q), s: lerp(0.9, 1, oCubic(q)) };
    });
  },
});

/* 三拍子 — the glyphs are dealt into three groups that snap on, on three hard beats */
const PERM3 = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
reg('xeTripleBeat', {
  name: '三拍子', en: 'Three Beats', tags: ['pop', 'graphic', 'glitch'], w: 1, ae: 'flicker', minDur: 0.45,
  inDur: dur => clamp(dur * 0.45, 0.24, 0.8),
  apply(env, it, p) {
    const seed = it.seed | 0, hot = hotOf(env, it);
    glyphs(it, (i, g, n) => {
      const grp = n < 3 ? i % 3 : PERM3[J.h(seed, (i / 3) | 0, 41) % 6][i % 3];
      const u = (p - 0.03 - grp * 0.31) / 0.3;
      if (u <= 0) return HIDE; if (u >= 1) return null;
      const k = Math.pow(1 - u, 3), o = { s: 1 + 0.5 * k, dy: -k * it.size * 0.06 };
      if (u < 0.3) o.color = hot;
      return o;
    });
  },
});

/* 行進 — the line walks in from the side in a few steps, every glyph waddling from foot to foot */
reg('xeMarch', {
  name: '行進', en: 'March In', tags: ['pop'], w: 0.7, ae: 'drop', minDur: 0.6,
  inDur: dur => clamp(dur * 0.5, 0.3, 0.95),
  apply(env, it, p) {
    const size = it.size, dir = dirOf(it, 11), STEPS = 5;
    glyphs(it, (i, g, n) => {
      const lead = dir > 0 ? 1 - ordLR(i, n) : ordLR(i, n);
      const q = clamp(p * 1.14 - lead * 0.14);
      if (q <= 0) return HIDE; if (q >= 1) return null;
      const k = q * STEPS, fl = Math.floor(k), fr = clamp((k - fl) / 0.62);
      const prog = (fl + ioCubic(fr)) / STEPS, hop = Math.sin(fr * PI);
      const o = mv(it, dir * (1 - prog) * size * 2.4, 0);
      o.dy -= hop * size * 0.13;
      o.rot = ((fl + i) % 2 ? 1 : -1) * hop * 10;
      o.a = clamp(q * 5);
      return o;
    });
  },
});

/* 落ちゲー — glyphs come down like falling blocks: grid steps, one sideways shift and one quarter turn on the way */
reg('xeBlockDrop', {
  name: '落ちゲー', en: 'Block Drop', tags: ['pop', 'glitch', 'graphic'], w: 0.7, ae: 'drop', minDur: 0.6,
  inDur: dur => clamp(dur * 0.52, 0.3, 1.0),
  apply(env, it, p) {
    const seed = it.seed | 0, step = it.size * 0.44, T = 6;
    glyphs(it, (i, g, n) => {
      const d = n > 1 ? J.r(seed, i, 51) * 0.52 : 0;
      const u = (p - d) / 0.46;
      if (u <= 0) return HIDE; if (u >= 1) return null;
      const k = Math.floor(u * T), sgn = J.r(seed, i, 52) < 0.5 ? -1 : 1;
      return { dy: -(T - k) * step, dx: k < 2 ? sgn * step : 0, rot: k < 4 ? sgn * 90 : 0 };
    });
  },
});

/* =====================================================================
   B. PER-GLYPH PATHS
   ===================================================================== */

/* 放り投げ — all glyphs are thrown from one point below the line and land in their slots along parabolas */
reg('xeArcToss', {
  name: '放り投げ', en: 'Arc Toss', tags: ['pop', 'emotional'], w: 1, ae: 'drop', minDur: 0.5,
  inDur: dur => clamp(dur * 0.48, 0.24, 0.9),
  apply(env, it, p) {
    const size = it.size, dir = dirOf(it, 13), b = J.itemBox(it);
    const ox = (dir > 0 ? b.x0 : b.x1) - it.x - dir * size * 0.8, oy = b.y1 - it.y + size * 1.6;
    glyphs(it, (i, g, n) => {
      const q = stg(p, dir > 0 ? ordLR(i, n) : 1 - ordLR(i, n), 0.5);
      if (q <= 0) return HIDE; if (q >= 1) return null;
      const [gx, gy] = gpos(g, it), t = oCubic(q), h = size * 1.7 + Math.abs(gx - ox) * 0.18;
      return { dx: (ox - gx) * (1 - t), dy: (oy - gy) * (1 - t) - 4 * h * t * (1 - t), rot: -dir * (1 - t) * 210, s: lerp(0.45, 1, t), a: clamp(q * 5) };
    });
  },
});

/* 小回り — each glyph, upright, circles its own slot on a shrinking orbit; neighbours turn opposite ways */
reg('xeOrbitIn', {
  name: '小回り', en: 'Small Orbit', tags: ['pop', 'calm', 'emotional'], w: 0.9, ae: 'spin', minDur: 0.5,
  inDur: dur => clamp(dur * 0.48, 0.24, 0.9),
  apply(env, it, p) {
    const size = it.size;
    glyphs(it, (i, g, n) => {
      const q = stg(p, ordLR(i, n), 0.4);
      if (q <= 0) return HIDE; if (q >= 1) return null;
      const k = 1 - oCubic(q), ang = -PI / 2 + (i % 2 ? 1 : -1) * k * TAU * 1.2, r = size * 0.95 * k;
      return { dx: Math.cos(ang) * r, dy: Math.sin(ang) * r, s: lerp(0.6, 1, oCubic(q)), a: clamp(q * 4) };
    });
  },
});

/* 跳ね返り — each glyph shoots in from the side zigzagging between two invisible walls, the corridor narrowing to its slot */
reg('xeRicochet', {
  name: '跳ね返り', en: 'Ricochet', tags: ['pop', 'glitch', 'graphic'], w: 0.9, ae: 'drop', minDur: 0.5,
  inDur: dur => clamp(dur * 0.48, 0.24, 0.9),
  apply(env, it, p) {
    const size = it.size, dir = dirOf(it, 17);
    glyphs(it, (i, g, n) => {
      const q = stg(p, dir > 0 ? 1 - ordLR(i, n) : ordLR(i, n), 0.45);
      if (q <= 0) return HIDE; if (q >= 1) return null;
      const k = Math.pow(1 - q, 1.5), w = tri(q * 2.5 + (i % 2) * 0.5);
      const o = mv(it, dir * k * size * 3.2, w * size * 0.95 * (1 - q));
      o.rot = w * 14 * (1 - q); o.a = clamp(q * 6);
      return o;
    });
  },
});

/* 馬跳び — each glyph starts on its predecessor's slot and hops over into its own, the line laying itself out by leaps */
reg('xeLeapfrog', {
  name: '馬跳び', en: 'Leapfrog', tags: ['pop'], w: 0.9, ae: 'drop', minDur: 0.55, maxChars: 14,
  inDur: (dur, n) => clamp(0.25 + n * 0.05, 0.3, Math.max(0.3, Math.min(1.0, dur * 0.55))),
  apply(env, it, p) {
    const size = it.size, lay = layOf(it), isy = it.sy || 1;
    glyphs(it, (i, g, n) => {
      const q = stg(p, ordLR(i, n), 0.72);
      if (q <= 0) return HIDE; if (q >= 1) return null;
      const [gx, gy] = gpos(g, it), pg = g.ci > 0 ? lay[i - 1] : null;
      const [px, py] = pg ? gpos(pg, it) : (it.vertical ? [gx, gy - alongW(g, it)] : [gx - alongW(g, it), gy]);
      const t = ioCubic(clamp(q / 0.8)), hop = Math.sin(t * PI) * size * 0.85, v = clamp((q - 0.8) / 0.2);
      const sq = 1 - 0.16 * Math.sin(v * PI);
      const o = { dx: (px - gx) * (1 - t), dy: (py - gy) * (1 - t), a: clamp(q * 8), sy: sq, sx: 1 + (1 - sq) * 0.5 };
      if (it.vertical) o.dx += hop; else o.dy += -hop + (1 - sq) * g.h * isy * 0.5;
      return o;
    });
  },
});

/* 天井から — the glyphs first hang upside down from a ceiling above the line, then let go one by one, turning over as they fall */
reg('xeCeilingFall', {
  name: '天井から', en: 'Off The Ceiling', tags: ['pop', 'glitch', 'emotional'], w: 0.8, ae: 'drop', minDur: 0.6,
  inDur: dur => clamp(dur * 0.52, 0.3, 1.0),
  apply(env, it, p) {
    const size = it.size, isy = it.sy || 1, up = size * 1.2 * isy;
    glyphs(it, (i, g, n) => {
      const qa = clamp((p - ordLR(i, n) * 0.14) / 0.14);
      if (qa <= 0) return HIDE;
      const u = clamp((p - 0.3 - ordLR(i, n) * 0.38) / 0.32);
      if (u >= 1) return null;
      const f = iQuad(clamp(u / 0.72)), v = clamp((u - 0.72) / 0.28), sq = 1 - 0.18 * Math.sin(v * PI);
      return { dy: -(1 - f) * up + (1 - sq) * g.h * isy * 0.5, rot: 180 * (1 - ioCubic(clamp(u / 0.72))), a: qa * lerp(0.6, 1, clamp(u * 4)), sy: sq, sx: 1 + (1 - sq) * 0.5 };
    });
  },
});

/* 玉突き — the first glyph slides in and hits the row; the knock runs down the line, each glyph appearing as it is struck */
reg('xeChainBump', {
  name: '玉突き', en: 'Chain Bump', tags: ['pop', 'graphic'], w: 0.9, ae: 'pop', minDur: 0.5,
  inDur: dur => clamp(dur * 0.46, 0.24, 0.85),
  apply(env, it, p) {
    const size = it.size, HIT = 0.26;
    glyphs(it, (i, g) => {
      const last = g.ci === g.n - 1 && g.n > 1;
      if (g.ci === 0) {
        if (p < HIT) { const o = mv(it, -(1 - iQuad(p / HIT)) * size * 3, 0); o.a = clamp(p * 9); return o; }
        const v = clamp((p - HIT) / 0.3);
        return mv(it, -Math.sin(v * PI) * (1 - v) * size * 0.22, 0);
      }
      const t = HIT + (g.n > 1 ? (g.ci - 1) / Math.max(1, g.n - 1) : 0) * 0.42;
      const v = (p - t) / (1 - t);
      if (v <= 0) return HIDE; if (v >= 1) return null;
      const o = mv(it, Math.sin(Math.min(1, v * 1.6) * PI) * (1 - v) * size * (last ? 0.9 : 0.34), 0);
      o.a = clamp(v * 9); o.s = 1 + 0.22 * Math.pow(1 - v, 4);
      if (last) o.rot = Math.sin(Math.min(1, v * 1.6) * PI) * (1 - v) * 16;
      return o;
    });
  },
});

/* 消失点から — glyphs fly out of one far point high above the line, growing along perspective lines, in random order */
reg('xeVanishPoint', {
  name: '消失点から', en: 'Vanishing Point', tags: ['graphic', 'emotional', 'pop'], w: 1, ae: 'zoom', minDur: 0.5,
  inDur: dur => clamp(dur * 0.48, 0.24, 0.9),
  apply(env, it, p) {
    const seed = it.seed | 0, b = J.itemBox(it);
    const vx = b.cx - it.x + dirOf(it, 19) * Math.min(env.W * 0.12, b.w * 0.3), vy = b.cy - it.y - Math.min(env.H * 0.3, Math.max(it.size * 2.2, b.h * 1.4));
    glyphs(it, (i, g, n) => {
      const q = stg(p, n > 1 ? J.r(seed, i, 23) : 0, 0.42);
      if (q <= 0) return HIDE; if (q >= 1) return null;
      const [gx, gy] = gpos(g, it), k = Math.max(0.03, Math.pow(q, 2.2) * (1 + 0.12 * Math.sin(q * PI)));
      return { dx: (vx - gx) * (1 - k), dy: (vy - gy) * (1 - k), s: k, a: clamp(q * 3) };
    });
  },
});

/* 尺取り — each glyph stretches from the previous slot across to its own, then pulls its tail in, inching the line forward */
reg('xeInchworm', {
  name: '尺取り', en: 'Inchworm', tags: ['pop', 'graphic'], w: 0.6, ae: 'stretch', minDur: 0.5,
  inDur: dur => clamp(dur * 0.48, 0.24, 0.9),
  apply(env, it, p) {
    const lay = layOf(it);
    glyphs(it, (i, g, n) => {
      const q = stg(p, ordLR(i, n), 0.66);
      if (q <= 0) return HIDE; if (q >= 1) return null;
      const [gx, gy] = gpos(g, it), aw = Math.max(1, alongW(g, it)), pg = g.ci > 0 ? lay[i - 1] : null;
      let dist = aw;
      if (pg) { const [px, py] = gpos(pg, it); dist = it.vertical ? gy - py : gx - px; }
      dist = clamp(dist, aw * 0.4, aw * 2.2);
      const e1 = oCubic(clamp(q / 0.5)), e2 = ioCubic(clamp((q - 0.5) / 0.5));
      const len = q < 0.5 ? dist * e1 : dist * (1 - e2);                      // extra length beyond the glyph's own
      const mid = q < 0.5 ? -dist + len / 2 : -len / 2;                       // centre offset from the resting slot
      const o = mv(it, mid, 0), st = 1 + len / aw;
      if (it.vertical) { o.sy = st; o.sx = 1 / Math.pow(st, 0.25); } else { o.sx = st; o.sy = 1 / Math.pow(st, 0.25); }
      o.a = clamp(q * 8);
      return o;
    });
  },
});

/* =====================================================================
   C. PER-GLYPH SHAPE CHANGES
   ===================================================================== */

/* ドア開き — every glyph swings shut like a door on its own edge hinge (alternating sides), rattling a little as it closes */
reg('xeSwingDoor', {
  name: 'ドア開き', en: 'Swing Doors', tags: ['graphic', 'editorial', 'pop'], w: 1, ae: 'spin',
  inDur: dur => clamp(dur * 0.45, 0.2, 0.85),
  apply(env, it, p) {
    const isx = it.sx || 1, isy = it.sy || 1;
    glyphs(it, (i, g, n) => {
      const q = stg(p, ordLR(i, n), 0.45);
      if (q <= 0) return HIDE; if (q >= 1) return null;
      const th = 88 * DEG * spring(q, 3.2, 2.5), c = Math.max(0.03, Math.cos(th)), far = 1 + 0.16 * Math.abs(Math.sin(th)), hinge = i % 2 ? 1 : -1;
      const a = clamp(q * 6);
      return it.vertical ? { sy: c, sx: far, dy: hinge * (1 - c) * g.h * isy / 2, a }
                         : { sx: c, sy: far, dx: hinge * (1 - c) * g.w * isx / 2, a };
    });
  },
});

/* はためき — glyphs arrive sheared hard to one side and flap back and forth like small flags until they stand straight */
reg('xeSkewFlap', {
  name: 'はためき', en: 'Flutter', tags: ['pop', 'emotional', 'glitch'], w: 1, ae: 'stretch',
  inDur: dur => clamp(dur * 0.46, 0.2, 0.85),
  apply(env, it, p) {
    glyphs(it, (i, g, n) => {
      const q = stg(p, ordLR(i, n), 0.42);
      if (q <= 0) return HIDE; if (q >= 1) return null;
      const s = spring(q, 2.6, 3.4) * (i % 2 ? 1 : -1);
      return { skew: s * 46, sx: 1 - 0.45 * Math.abs(s), a: clamp(q * 5) };
    });
  },
});

/* 字ごと開帳 — each glyph has its own pair of curtains: it is uncovered from its centre line outwards while easing narrower */
reg('xeGlyphCurtain', {
  name: '字ごと開帳', en: 'Glyph Curtains', tags: ['editorial', 'calm', 'graphic', 'emotional'], w: 1.2, ae: 'wipe',
  inDur: dur => clamp(dur * 0.44, 0.18, 0.8),
  apply(env, it, p) {
    const seed = it.seed | 0;
    glyphs(it, (i, g, n) => {
      const q = stg(p, n > 1 ? (ordLR(i, n) * 0.6 + J.r(seed, i, 29) * 0.4) : 0, 0.5);
      if (q <= 0) return HIDE; if (q >= 1) return null;
      const k = 0.02 + 0.8 * ioCubic(q), st = lerp(1.3, 1, oCubic(q));
      return it.vertical ? { clipY: [-k, k], clipX: [-2, 2], sy: st } : { clipX: [-k, k], clipY: [-2, 2], sx: st };
    });
  },
});

/* 互い違い窓 — every glyph sits behind its own window; odd ones slide up into it from below, even ones down from above */
reg('xeCellSlide', {
  name: '互い違い窓', en: 'Alternating Windows', tags: ['editorial', 'graphic', 'calm'], w: 1.2, ae: 'wipe',
  inDur: dur => clamp(dur * 0.44, 0.18, 0.8),
  apply(env, it, p) {
    const isx = it.sx || 1, isy = it.sy || 1;
    glyphs(it, (i, g, n) => {
      const q = stg(p, ordLR(i, n), 0.5);
      if (q <= 0) return HIDE; if (q >= 1) return null;
      const off = (i % 2 ? 1 : -1) * (1 - oQuart(q)) * 1.15;
      return it.vertical ? { dx: off * g.w * isx, clipX: [-0.62 - off, 0.62 - off], clipY: [-2, 2] }
                         : { dy: off * g.h * isy, clipY: [-0.62 - off, 0.62 - off], clipX: [-2, 2] };
    });
  },
});

/* 歯車 — the whole row turns like meshed gears: neighbours rotate opposite ways, advancing in clockwork ticks */
reg('xeGearTick', {
  name: '歯車', en: 'Gear Tick', tags: ['graphic', 'glitch', 'pop'], w: 0.8, ae: 'spin', minDur: 0.5,
  inDur: dur => clamp(dur * 0.5, 0.28, 0.9),
  apply(env, it, p) {
    const T = 5;
    glyphs(it, (i, g, n) => {
      const q = stg(p, ordLR(i, n), 0.12);
      if (q <= 0) return HIDE; if (q >= 1) return null;
      const k = q * T, fl = Math.floor(k), e = (fl + oBack((k - fl) / 0.45, 2.2)) / T;
      return { rot: (i % 2 ? 1 : -1) * 150 * (1 - e), s: lerp(0.5, 1, e), a: clamp(q * 6) };
    });
  },
});

/* コイントス — each glyph is flipped up off the line like a coin, turning over end to end, and lands face up */
reg('xeCoinToss', {
  name: 'コイントス', en: 'Coin Toss', tags: ['pop'], w: 0.8, ae: 'spin', minDur: 0.5,
  inDur: dur => clamp(dur * 0.5, 0.26, 0.9),
  apply(env, it, p) {
    const size = it.size;
    glyphs(it, (i, g, n) => {
      const q = stg(p, ordLR(i, n), 0.5);
      if (q <= 0) return HIDE; if (q >= 1) return null;
      const c = Math.cos((1 - q) * TAU * 1.5);
      return { dy: -4 * size * 1.15 * q * (1 - q), sy: (c < 0 ? -1 : 1) * Math.max(0.04, Math.abs(c)), a: clamp(q * 7), s: lerp(0.8, 1, q) };
    });
  },
});

/* 蛇腹のばし — the line starts pressed together at its head as a zigzag of thin slanted glyphs and is pulled out like bellows */
reg('xeBellows', {
  name: '蛇腹のばし', en: 'Bellows', tags: ['graphic', 'pop', 'editorial'], w: 0.9, ae: 'stretch',
  inDur: dur => clamp(dur * 0.45, 0.2, 0.85),
  apply(env, it, p) {
    const L = lineInfo(it), a = clamp(p * 6);
    glyphs(it, (i, g) => {
      const q = stg(p, g.n > 1 ? g.ci / (g.n - 1) : 0, 0.28);
      if (q >= 1) return a < 1 ? { a } : null;
      const e = oBack(q, 1.3), k = 1 - e, l = L[g.li], [gx, gy] = gpos(g, it), thin = Math.max(0.12, lerp(0.12, 1, e));
      const o = { dx: (l.x0 - gx) * k * 0.9, dy: (l.y0 - gy) * k * 0.9, a };
      if (it.vertical) { o.sy = thin; o.rot = (g.ci % 2 ? 1 : -1) * 22 * k; } else { o.sx = thin; o.skew = (g.ci % 2 ? 1 : -1) * 38 * k; }
      return o;
    });
  },
});

/* 背くらべ — the glyphs fade in at wildly different sizes standing on one baseline, then spring to equal size one by one */
reg('xeUnevenScale', {
  name: '背くらべ', en: 'Size Sort', tags: ['pop', 'graphic', 'emotional'], w: 1, ae: 'pop', minDur: 0.5,
  inDur: dur => clamp(dur * 0.48, 0.24, 0.9),
  apply(env, it, p) {
    const seed = it.seed | 0, isy = it.sy || 1, a = clamp(p * 5);
    glyphs(it, (i, g, n) => {
      const v = clamp((p - 0.2 - ordLR(i, n) * 0.4) / 0.4);
      if (v >= 1) return null;
      const r = J.r(seed, i, 33), s0 = (i + (seed & 1)) % 2 ? lerp(0.35, 0.65, r) : lerp(1.3, 1.6, r);
      const s = 1 + (s0 - 1) * spring(v, 3, 2.5);
      return it.vertical ? { s, a } : { s, a, dy: (1 - s) * g.h * isy * 0.36 };
    });
  },
});

/* =====================================================================
   D. PLACEHOLDER SWAPS
   ===================================================================== */

/* 伏せ字めくり — the line first appears censored as solid blocks; the blocks then turn over, in random order, into the real glyphs */
reg('xeRedact', {
  name: '伏せ字めくり', en: 'Redacted', tags: ['glitch', 'editorial', 'graphic'], w: 1, ae: 'scramble', minDur: 0.55,
  inDur: dur => clamp(dur * 0.5, 0.28, 0.95),
  apply(env, it, p) {
    const seed = it.seed | 0;
    glyphs(it, (i, g, n) => {
      const qa = clamp((p - ordLR(i, n) * 0.16) / 0.1);
      if (qa <= 0) return HIDE;
      const u = (p - 0.3 - (n > 1 ? J.r(seed, i, 37) : 0) * 0.5) / 0.2;
      if (u >= 1) return null;
      const k = slotK(g, it);
      if (u < 0.5) {
        const c = u <= 0 ? 1 : Math.max(0.05, Math.cos(u * PI));
        return it.vertical && !g.r90 ? { ch: '■', sx: k, sy: c * oBack(qa, 2) } : { ch: '■', sx: k * c, s: oBack(qa, 2) };
      }
      const c = Math.max(0.05, Math.sin((u - 0.5) * PI));
      return it.vertical && !g.r90 ? { sy: c } : { sx: c };
    });
  },
});

/* 空欄埋め — empty answer boxes mark every slot; the glyphs are then filled in one after another, each box becoming its glyph */
reg('xeBlanks', {
  name: '空欄埋め', en: 'Fill Blanks', tags: ['editorial', 'pop', 'graphic'], w: 1, ae: 'type', minDur: 0.55,
  inDur: dur => clamp(dur * 0.5, 0.28, 0.95),
  apply(env, it, p) {
    const sub = pick(env.sc.sub, env.sc.fg);
    glyphs(it, (i, g, n) => {
      const qa = clamp(p / 0.16);
      if (qa <= 0) return HIDE;
      const u = (p - 0.24 - ordLR(i, n) * 0.5) / 0.26;
      if (u >= 1) return null;
      if (u <= 0) return { ch: '□', sx: slotK(g, it), a: 0.75 * qa, s: lerp(0.8, 0.94, oCubic(qa)), color: sub };
      return { s: lerp(0.45, 1, oBack(u, 2.4)), a: clamp(0.4 + u * 3), dy: -(1 - oCubic(u)) * it.size * 0.12 };
    });
  },
});

/* 分身から — the first glyph copies itself along the whole line; the copies then turn, one by one, into the glyphs that belong there */
reg('xeCloneMorph', {
  name: '分身から', en: 'Clones', tags: ['glitch', 'pop', 'graphic'], w: 0.8, ae: 'scramble', minDur: 0.55,
  inDur: dur => clamp(dur * 0.5, 0.28, 0.95),
  apply(env, it, p) {
    const lay = layOf(it), first = lay.find(g => !isBlank(g.ch));
    if (!first) return;
    const [fx, fy] = gpos(first, it), fw = Math.max(1, inkW(first));
    glyphs(it, (i, g, n) => {
      if (isBlank(g.ch)) return null;
      const lead = g.i === first.i;
      const qa = lead ? clamp(p / 0.12) : stg(clamp(p / 0.34), ordLR(i, n), 0.55);
      if (qa <= 0) return HIDE;
      if (lead) return qa < 1 ? { s: oBack(qa, 2.2), a: clamp(qa * 3) } : null;
      const u = (p - 0.4 - ordLR(i, n) * 0.4) / 0.2;
      if (u >= 1) return null;
      const sq = u > 0 ? 1 - 0.55 * Math.sin(u * PI) : 1;
      if (u < 0.5) {
        const [gx, gy] = gpos(g, it), k = 1 - oCubic(qa);
        return { ch: first.ch, dx: (fx - gx) * k, dy: (fy - gy) * k, sx: clamp(inkW(g) / fw, 0.35, 1), sy: sq, a: 0.5 };
      }
      return { sy: sq, a: lerp(0.5, 1, clamp((u - 0.5) * 4)) };
    });
  },
});

/* =====================================================================
   E. STROKE-PIECE ASSEMBLIES
   ===================================================================== */
/* glyph-level stand-in for items whose strokes cannot be drawn separately */
const softIn = (it, p, spread, fn) => glyphs(it, (i, g, n) => {
  const q = stg(p, ordLR(i, n), spread);
  if (q <= 0) return HIDE; if (q >= 1) return null;
  return fn(q, i, g);
});

/* 画の雨 — the strokes of each glyph rain straight down, the lowest strokes landing first so the glyph stacks up from its foot */
reg('xePieceRain', {
  name: '画の雨', en: 'Stroke Rain', tags: ['emotional', 'calm', 'graphic'], w: 1, ae: 'assemble', pieces: true, minDur: 0.55,
  inDur: dur => clamp(dur * 0.5, 0.28, 0.95),
  apply(env, it, p) {
    if (p >= 1) return;
    const size = it.size, N = Math.max(1, layOf(it).N);
    if (noPieces(it)) { softIn(it, p, 0.5, q => ({ dy: -(1 - iQuad(q)) * size * 1.3, a: clamp(q * 4), sy: 1 + (1 - q) * 0.4 })); return; }
    it.pieceFns.push((ci, pj, pc) => {
      const gq = stg(p, ordLR(ci, N), 0.5);
      const u = clamp((gq - clamp(0.5 - pc.cy) * 0.55) / 0.45);
      if (u <= 0) return null; if (u >= 1) return J.PID;
      const k = 1 - u * u;
      return J.PT(0, -k * size * 1.7, 0, 1, 1 + k * 0.7, 90, clamp(u * 5));
    });
  },
});

/* 渦巻き組み — each glyph's strokes swirl around the glyph's centre on a wide vortex and wind in to their places */
reg('xePieceVortex', {
  name: '渦巻き組み', en: 'Stroke Vortex', tags: ['pop', 'emotional', 'glitch'], w: 0.9, ae: 'assemble', pieces: true, minDur: 0.55,
  inDur: dur => clamp(dur * 0.5, 0.28, 0.95),
  apply(env, it, p) {
    if (p >= 1) return;
    const size = it.size, N = Math.max(1, layOf(it).N), isx = it.sx || 1, isy = it.sy || 1, seed = it.seed | 0;
    if (noPieces(it)) { softIn(it, p, 0.45, (q, i) => ({ rot: (i % 2 ? 1 : -1) * (1 - oCubic(q)) * 160, s: lerp(1.6, 1, oCubic(q)), a: clamp(q * 3) })); return; }
    it.pieceFns.push((ci, pj, pc) => {
      const gq = stg(p, ordLR(ci, N), 0.45);
      const u = clamp((gq - J.r(seed, ci, pj, 43) * 0.25) / 0.75);
      if (u <= 0) return null; if (u >= 1) return J.PID;
      const k = 1 - oCubic(u), dir = ci % 2 ? 1 : -1, th = dir * k * 230 * DEG, c = Math.cos(th), s = Math.sin(th);
      // strokes near the centre (and one-piece glyphs) get an orbit radius of their own so they still travel
      const ex = pc.cx * size * isx, ey = pc.cy * size * isy, r0 = Math.hypot(ex, ey), lift = r0 < size * 0.16 ? size * 0.3 : 0;
      const a0 = r0 > 1 ? Math.atan2(ey, ex) : J.r(seed, ci, pj, 44) * TAU, bx = ex + Math.cos(a0) * lift * k, by = ey + Math.sin(a0) * lift * k, m = 1 + 1.3 * k;
      return J.PT((c * bx - s * by) * m - ex, (s * bx + c * by) * m - ey, th / DEG, lerp(0.45, 1, oCubic(u)), 1, 0, clamp(u * 4));
    });
  },
});

/* 段すべり — each glyph is built in horizontal layers: its strokes slide in row by row, alternately from the left and the right */
reg('xePieceStrata', {
  name: '段すべり', en: 'Sliding Strata', tags: ['graphic', 'editorial', 'glitch'], w: 1, ae: 'slice', pieces: true, minDur: 0.5,
  inDur: dur => clamp(dur * 0.46, 0.24, 0.85),
  apply(env, it, p) {
    if (p >= 1) return;
    const size = it.size, N = Math.max(1, layOf(it).N);
    if (noPieces(it)) { softIn(it, p, 0.4, (q, i) => ({ dx: (i % 2 ? 1 : -1) * (1 - oQuart(q)) * size * 0.9, a: clamp(q * 4) })); return; }
    it.pieceFns.push((ci, pj, pc) => {
      const row = clamp(Math.floor((pc.cy + 0.5) * 5), 0, 4);
      const u = clamp((stg(p, ordLR(ci, N), 0.35) - row / 4 * 0.42) / 0.58);
      if (u <= 0) return null; if (u >= 1) return J.PID;
      const k = 1 - oQuart(u);
      return J.PT(((row + ci) % 2 ? 1 : -1) * k * size * 1.25, 0, 0, 1, 1 + k * 1.1, 0, clamp(u * 4));
    });
  },
});

/* 積み木起こし — the strokes lie in a small heap at the foot of every glyph; they hop up out of the heap and lock into the glyph */
reg('xePiecePile', {
  name: '積み木起こし', en: 'From The Pile', tags: ['pop', 'graphic'], w: 0.8, ae: 'assemble', pieces: true, minDur: 0.6,
  inDur: dur => clamp(dur * 0.52, 0.3, 1.0),
  apply(env, it, p) {
    if (p >= 1) return;
    const size = it.size, N = Math.max(1, layOf(it).N), isx = it.sx || 1, isy = it.sy || 1, seed = it.seed | 0;
    if (noPieces(it)) {
      softIn(it, p, 0.4, (q, i, g) => { const sy = Math.max(0.06, oBack(q, 1.8)); return { sy, dy: (1 - sy) * g.h * isy * 0.5, a: clamp(q * 5) }; });
      return;
    }
    it.pieceFns.push((ci, pj, pc) => {
      const gq = stg(p, ordLR(ci, N), 0.4);
      if (gq <= 0) return null;
      const u = clamp((gq - 0.2 - clamp(0.5 - pc.cy) * 0.36) / 0.44);
      if (u >= 1) return J.PID;
      const e = ioCubic(u), k = 1 - e;
      const dy0 = (0.44 - pc.cy) * size * isy - J.r(seed, ci, pj, 47) * size * 0.1, dx0 = -pc.cx * size * isx * 0.55 + J.rs(seed, ci, pj, 48) * size * 0.14;
      return J.PT(dx0 * k, dy0 * k - Math.sin(u * PI) * size * 0.4, J.rs(seed, ci, pj, 49) * 85 * k, 1, 1, 0, clamp(gq / 0.14));
    });
  },
});
})();
