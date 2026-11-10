/* JIZURA pack: x2horrorB — 追加分2 for the ホラー set: 40 uneasy entrances, exits, holds, treatments, cameras, screen frights and handovers */
(() => {
'use strict';
const E = J.E;
const P = 'x2horrorB';
const TAGS = ['horror'];
const clamp = J.clamp, lerp = J.lerp, TAU = J.TAU;
const reg = (g, key, def) => J.register(g, key, def, P);
const HIDE = Object.freeze({ hide: true });

/* ------------------------------------------------------------------ helpers */
const isHex = c => typeof c === 'string' && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(c);
const colOf = it => (isHex(it.color) ? it.color : '#ffffff');
const mixC = (a, b, t) => (isHex(a) && isHex(b) ? J.mix(a, b, clamp(t)) : (t < 0.5 ? a : b));
const motionK = env => clamp((env.fx && env.fx.motion != null ? env.fx.motion : 0.7) / 0.7, 0, 1.6);
const layOf = it => (it._m || (it._m = J.measure(it))).lay;
const cutN = env => Math.max(1, J.glyphCount(String((env.cut && env.cut.text) || '')));
const cseed = env => (env.cut && env.cut.seed) | 0;
const isDark = c => J.lum(c) < 0.45;
const nightC = sc => J.mix(sc.bg, '#000000', isDark(sc.bg) ? 0.72 : 0.9);
/* position of glyph i along the whole lyric (0..1): within the item, or by motion index for one-glyph items */
const orderOf = (env, it) => {
  const N = cutN(env), mi = +it.mi || 0;
  return (i, n) => (n > 1 ? i / (n - 1) : N > 1 ? clamp(mi / (N - 1)) : 0);
};
/* integer index of glyph i within the whole lyric */
const indexOf = (env, it) => {
  const N = cutN(env), mi = Math.round(+it.mi || 0);
  return (i, n) => (n > 1 ? i : N > 1 ? Math.min(N - 1, Math.max(0, mi)) : 0);
};
const addPre = (it, f) => { const p = it.pre; it.pre = p ? (e, i) => { p(e, i); f(e, i); } : f; };
const addPost = (it, f) => { const p = it.post; it.post = p ? (e, i, b) => { p(e, i, b); f(e, i, b); } : f; };
const bare = (i, extra) => Object.assign({}, i, { pre: null, post: null, echo: null, streak: null, shadow: null, extrude: null, pattern: null, patternBg: null, gradient: null,
  pieceFn: null, strokeDash: null, strokeUnder: false, wipeBar: null, cursorAt: null, bands: null, vbands: null, clip: null, clipY: null, clipFn: null, blend: null, _lay: null }, extra || {});
/* run fn in item space (translate / rotate / skew of the item) */
const inItem = (env, it, fn) => {
  const ctx = env.ctx; ctx.save(); ctx.translate(it.x, it.y);
  if (it.rot) ctx.rotate(it.rot * J.DEG);
  if (it.skew) ctx.transform(1, 0, Math.tan(it.skew * J.DEG), 1, 0, 0);
  try { fn(); } finally { ctx.restore(); }
};
const alive = (it, amin = 0.9) => it.fill !== false && (it.alpha ?? 1) >= amin && !!it.text && it.size > 1;
/* scale an item about the screen centre, so a many-item composition moves as one picture */
const scaleAbout = (env, it, s) => { const cx = env.W / 2, cy = env.H / 2; it.x = cx + (it.x - cx) * s; it.y = cy + (it.y - cy) * s; it.size *= s; };
/* irregular (uneasy) timeline: N moments in 0..span with some long gaps */
const uneasyTimes = (seed, N, span) => {
  const gaps = []; let tot = 0;
  for (let k = 0; k < N; k++) { const r = J.r(seed, k, 917); const g = 0.3 + (r < 0.25 ? 2 : r); gaps.push(g); tot += g; }
  const out = []; let acc = 0;
  for (let k = 0; k < N; k++) { out.push(acc / tot * span); acc += gaps[k]; }
  return out;
};
/* a seeded order of 0..N-1 (rank of each index) */
const ranks = (seed, N, salt) => {
  const a = []; for (let k = 0; k < N; k++) a.push(k);
  a.sort((x, y) => J.r(seed, x, salt) - J.r(seed, y, salt) || x - y);
  const rk = new Array(N); for (let k = 0; k < N; k++) rk[a[k]] = k;
  return rk;
};
const gcd = (a, b) => (b ? gcd(b, a % b) : a);
/* attack (0..a) → hold → release (b..1) */
const ahr = (k, a, b) => (k < a ? E.outCubic(k / a) : k > b ? 1 - E.inOutCubic((k - b) / Math.max(1e-3, 1 - b)) : 1);

/* ================================================================== ENTRANCES */

/* already there: the line was standing in the dark all along; patches of it brighten at their own pace */
reg('enter', 'hzAlreadyThere', {
  name: '闇に居た', en: 'Already There', tags: TAGS.concat(['emotional', 'calm']), w: 1.3, ae: 'blur', minDur: 0.9,
  inDur: dur => clamp(dur * 0.5, 0.6, 1.4),
  apply(env, it, p) {
    const cs = cseed(env), idx = indexOf(env, it), c0 = colOf(it), dk = mixC(c0, env.sc.bg, 0.78), on = Math.min(1, p / 0.1);
    it.charFns.push((i, g, n) => {
      const k = J.h(cs, idx(i, n), 211), t0 = J.r(k, 1) * 0.5, len = 0.22 + J.r(k, 2) * 0.28;
      const q = clamp((p - t0) / len);
      // the brightening sags once on the way up
      const lv = clamp(E.inOutSine(q) - Math.sin(q * Math.PI) * 0.3 * J.r(k, 3));
      if (lv >= 0.999) return null;
      return { a: lerp(0.1, 1, lv) * on, color: mixC(dk, c0, lv) };
    });
  },
});

/* while unwatched: glyphs turn up far apart from each other, never where the eye just was; each one is faint until the next arrives */
reg('enter', 'hzUnwatched', {
  name: '目を離した隙', en: 'While Unwatched', tags: TAGS.concat(['editorial']), w: 1, ae: 'type', minDur: 0.9,
  inDur: dur => clamp(dur * 0.55, 0.55, 1.5),
  apply(env, it, p) {
    const cs = cseed(env), N = cutN(env), idx = indexOf(env, it), sz = it.size;
    let hop = Math.max(1, Math.round(N * 0.38)); while (gcd(hop, N) !== 1) hop++;
    const start = J.h(cs, 221) % N, slot = new Array(N);
    for (let k = 0; k < N; k++) slot[(start + k * hop) % N] = k;
    const gap = 0.86 / N;
    it.charFns.push((i, g, n) => {
      const ix = idx(i, n), q = p - slot[ix] * gap;
      if (q < 0) return HIDE;
      if (q >= gap) return null;
      return { a: 0.3, dy: sz * 0.05 * (J.r(cs, ix, 222) < 0.5 ? -1 : 1) };
    });
  },
});

/* unsteady hand: the outlines are traced in fits and starts by a trembling hand, and only then filled */
reg('enter', 'hzShakyHand', {
  name: '震える筆跡', en: 'Unsteady Hand', tags: TAGS.concat(['emotional', 'editorial']), w: 0.9, ae: 'wipe', minDur: 1,
  inDur: dur => clamp(dur * 0.55, 0.7, 1.5),
  apply(env, it, p) {
    const cs = cseed(env), idx = indexOf(env, it), sz = it.size, u = p / 0.8;
    if (u < 1) { const seg = Math.floor(u * 4), f = u * 4 - seg; it.dash = (seg + E.inOutCubic(clamp(f * 1.7))) / 4; }
    it.fillAlpha = (it.fillAlpha ?? 1) * J.smooth(0.78, 1, p);
    if (!(it.stroke > 0)) it.stroke = Math.max(0.6, sz * 0.03 * (1 - J.smooth(0.82, 1, p)));
    const tr = 1 - J.smooth(0.7, 1, p);
    if (tr > 0.01) it.charFns.push((i, g, n) => {
      const k = J.h(cs, idx(i, n), 231);
      return { dx: J.noise1(p * 38, k) * sz * 0.028 * tr, dy: J.noise1(p * 31 + 7, k + 1) * sz * 0.035 * tr, rot: J.noise1(p * 17 + 3, k + 2) * 3.5 * tr };
    });
  },
});

/* seeping up: each glyph soaks up from under the floor at its own rate, stalls halfway, then comes through */
reg('enter', 'hzFloorSeep', {
  name: '床下から滲む', en: 'Seeping Up', tags: TAGS.concat(['emotional']), w: 1, ae: 'wipe', minDur: 0.8,
  inDur: dur => clamp(dur * 0.5, 0.55, 1.3),
  apply(env, it, p) {
    const cs = cseed(env), idx = indexOf(env, it), sz = it.size, c0 = colOf(it), dk = mixC(c0, env.sc.bg, 0.6);
    it.charFns.push((i, g, n) => {
      const k = J.h(cs, idx(i, n), 241), t0 = J.r(k, 1) * 0.38, len = 0.4 + J.r(k, 2) * 0.22;
      const q = clamp((p - t0) / len);
      if (q <= 0) return HIDE;
      if (q >= 1) return null;
      const st = 0.3 + J.r(k, 3) * 0.2;      // where it stalls
      const e = q < 0.4 ? st * E.outCubic(q / 0.4) : q < 0.58 ? st : lerp(st, 1, E.inOutCubic((q - 0.58) / 0.42));
      return { clipY: [0.7 - e * 1.4, 0.75], dy: (1 - e) * sz * 0.16, color: e < 0.98 ? mixC(dk, c0, e) : null };
    });
  },
});

/* too close: it is suddenly there, a step nearer than it should be, stares, then backs off in three stiff steps */
reg('enter', 'hzTooClose', {
  name: '近すぎる', en: 'Too Close', tags: TAGS.concat(['glitch', 'graphic']), w: 0.9, ae: 'zoom', minDur: 0.9,
  inDur: dur => clamp(dur * 0.45, 0.55, 1.1),
  apply(env, it, p) {
    const lv = [1.12, 1.07, 1.03, 1], at = [0.5, 0.68, 0.86];
    let s = lv[0] + 0.015 * Math.min(1, p / 0.5);
    for (let k = 0; k < 3; k++) if (p >= at[k]) s = lerp(k === 0 ? lv[0] + 0.015 : lv[k], lv[k + 1], E.outExpo(clamp((p - at[k]) / 0.07)));
    scaleAbout(env, it, s);
    it.alpha = (it.alpha ?? 1) * Math.min(1, p / 0.06);
  },
});

/* one upside down: the line fades up with one glyph hanging head-down; it notices late and turns itself right */
reg('enter', 'hzWrongGlyph', {
  name: '逆さの一字', en: 'One Upside Down', tags: TAGS.concat(['glitch', 'editorial']), w: 0.9, ae: 'flicker', minDur: 0.9,
  inDur: dur => clamp(dur * 0.5, 0.6, 1.2),
  apply(env, it, p) {
    const cs = cseed(env), N = cutN(env), idx = indexOf(env, it), ord = orderOf(env, it), sz = it.size, st = env.step, acc = env.sc.accent;
    const pick = J.h(cs, 251) % N;
    it.charFns.push((i, g, n) => {
      const a = J.smooth(0, 0.3, p - ord(i, n) * 0.12);
      if (idx(i, n) !== pick) return a >= 0.999 ? null : (a <= 0 ? HIDE : { a });
      if (a <= 0) return HIDE;
      if (p < 0.58) return { a, rot: 180, color: acc };
      if (p < 0.7) return { rot: 180 + J.rs(cs, st, 252) * 9, dx: J.rs(cs, st, 253) * sz * 0.03, color: acc };
      const q = clamp((p - 0.7) / 0.24);
      if (q >= 1) return null;
      return { rot: 180 * (1 - E.outBack(q, 1.5)), color: q < 0.5 ? acc : null };
    });
  },
});

/* from scratches: every glyph starts as a thin slanted scratch that is drawn, then swells into the letter */
reg('enter', 'hzFromScratch', {
  name: '掻き傷から', en: 'From Scratches', tags: TAGS.concat(['graphic', 'glitch']), w: 1, ae: 'stretch',
  inDur: dur => clamp(dur * 0.42, 0.4, 0.95),
  apply(env, it, p) {
    const cs = cseed(env), idx = indexOf(env, it);
    it.charFns.push((i, g, n) => {
      const k = J.h(cs, idx(i, n), 261), q = clamp((p - J.r(k, 1) * 0.45) / 0.52);
      if (q <= 0) return HIDE;
      if (q >= 1) return null;
      const R = (J.r(k, 2) < 0.5 ? -1 : 1) * (28 + J.r(k, 3) * 30);
      if (q < 0.38) return { sx: 0.05, sy: lerp(0.12, 1.35, E.outCubic(q / 0.38)), rot: R };
      const e = E.inOutCubic((q - 0.38) / 0.62);
      return { sx: lerp(0.05, 1, e), sy: lerp(1.35, 1, e), rot: R * (1 - e) };
    });
  },
});

/* crooked rise: the glyphs creep up dim and out of true, and at the very end they all click into place at once */
reg('enter', 'hzLateSnap', {
  name: 'ずれて昇る', en: 'Crooked Rise', tags: TAGS.concat(['emotional', 'graphic']), w: 1.1, ae: 'pop', minDur: 0.8,
  inDur: dur => clamp(dur * 0.5, 0.55, 1.3),
  apply(env, it, p) {
    const cs = cseed(env), idx = indexOf(env, it), sz = it.size, at = 0.86;
    const u = Math.min(1, p / at), e = p < at ? 0 : E.outExpo((p - at) / (1 - at)), w = 1 - e;
    it.charFns.push((i, g, n) => {
      const k = J.h(cs, idx(i, n), 271);
      return { dx: J.rs(k, 1) * sz * 0.1 * w, dy: (J.rs(k, 2) * sz * 0.09 + (1 - u) * sz * 0.55) * w, rot: J.rs(k, 3) * 11 * w, a: lerp(lerp(0.12, 0.62, u) * Math.min(1, p / 0.1), 1, e) };
    });
  },
});

/* second pass: a beam of light crosses and shows the words for a moment; dark again; when it comes back they stay */
reg('enter', 'hzLampSweep', {
  name: '灯りが二度', en: 'Second Pass', tags: TAGS.concat(['emotional', 'graphic']), w: 0.9, ae: 'wipe', minDur: 1.1,
  inDur: dur => clamp(dur * 0.55, 0.8, 1.6),
  apply(env, it, p) {
    const W = env.W, H = env.H, xa = -0.14 * W, xb = 1.14 * W, bw = W * 0.13, sx = it.sx || 1, sy = it.sy || 1;
    const dir = (J.h(cseed(env), 281) & 1) === 1;
    const at = (g) => { const u = it.x + g.x * sx + (it.y + g.y * sy - H / 2) * 0.3; return dir ? W - u : u; };
    if (p < 0.42) {
      const X = lerp(xa, xb, p / 0.42);
      it.charFns.push((i, g) => { const a = 1 - Math.abs(at(g) - X) / bw; return a <= 0 ? HIDE : { a: 0.85 * E.outQuad(a) }; });
    } else if (p < 0.48) it.charFns.push(() => HIDE);
    else if (p < 0.94) {
      const X = lerp(xa, xb, (p - 0.48) / 0.46);
      it.charFns.push((i, g) => { const d = at(g) - X; if (d <= 0) return null; const a = 1 - d / bw; return a <= 0 ? HIDE : { a: 0.85 * E.outQuad(a) }; });
    }
  },
});

/* ================================================================== EXITS */

/* out of the light: the line sinks while the edge of the dark comes down over it from above */
reg('exit', 'hzOutOfLight', {
  name: '灯りの外へ', en: 'Out Of Light', tags: TAGS.concat(['emotional', 'calm']), w: 1.2, ae: 'wipe',
  outDur: dur => clamp(dur * 0.45, 0.5, 1.1),
  apply(env, it, p) {
    const bx = J.itemBox(it), sz = it.size, c0 = colOf(it), dk = nightC(env.sc);
    const edge = lerp(bx.y0 - sz * 0.4, bx.y1 + sz * 0.75, E.inOutSine(clamp(p / 0.92)));
    it.y += E.inQuad(p) * sz * 0.45;
    it.clipY = [edge, edge + env.H * 3];
    const d = J.smooth(0, 0.75, p);
    it.charFns.push(() => ({ color: mixC(c0, dk, d * 0.7) }));
    it.alpha = (it.alpha ?? 1) * (1 - J.smooth(0.8, 1, p));
  },
});

/* taken: one after another, at uneven moments, a glyph is snatched sideways into the dark; the rest flinch */
reg('exit', 'hzTaken', {
  name: '攫われる', en: 'Taken', tags: TAGS.concat(['glitch', 'emotional']), w: 1.1, ae: 'scatter', minDur: 0.9,
  outDur: dur => clamp(dur * 0.48, 0.5, 1.2),
  apply(env, it, p) {
    const cs = cseed(env), N = cutN(env), idx = indexOf(env, it), sz = it.size, st = env.step, W = env.W;
    const rk = ranks(cs, N, 311), times = uneasyTimes(cs, N, 0.8), side = (J.h(cs, 312) & 1) ? 1 : -1, len = 0.1;
    it.charFns.push((i, g, n) => {
      const ix = idx(i, n), q = (p - times[rk[ix]]) / len;
      if (q >= 1) return HIDE;
      if (q < 0) {
        const tr = clamp(1 + q / 2.5);
        return tr > 0 ? { dx: -side * sz * 0.05 * tr + J.rs(cs, ix, st, 313) * sz * 0.02 * tr, rot: J.rs(cs, ix, st, 314) * 5 * tr } : null;
      }
      const e = E.inCubic(q);
      return { dx: side * e * W * 0.85, sx: 1 + q * 3.5, sy: 1 - q * 0.35, a: 1 - 0.6 * q };
    });
  },
});

/* thumb smear: three slow rubs back and forth; each one drags the ink sideways and leaves less of it */
reg('exit', 'hzThumbSmear', {
  name: '指で擦る', en: 'Thumb Smear', tags: TAGS.concat(['emotional', 'editorial']), w: 1, ae: 'blur', minDur: 0.9,
  outDur: dur => clamp(dur * 0.5, 0.6, 1.2),
  apply(env, it, p) {
    if (p >= 0.9) { it.alpha = 0; return; }
    const sz = it.size, k = Math.min(2, Math.floor(p / 0.3)), v = p / 0.3 - k, L = [1, 0.62, 0.3, 0];
    const dir = ((J.h(cseed(env), 321) + k) & 1) ? 1 : -1, sw = Math.sin(v * Math.PI);
    it.x += dir * sw * sz * 0.1; it.y += sw * sz * 0.015 * (k - 1);
    it.streak = { n: 4, dx: -dir * sz * 0.13 * sw, a: 0.5 * sw };
    it.alpha = (it.alpha ?? 1) * lerp(L[k], L[k + 1], J.smooth(0.15, 0.85, v));
  },
});

/* retinal burn: the words cut out, but their outline stays on the eye, swelling and paling */
reg('exit', 'hzRetinal', {
  name: '目に焼きつく', en: 'Retinal Burn', tags: TAGS.concat(['glitch', 'graphic']), w: 1, ae: 'blur',
  outDur: dur => clamp(dur * 0.45, 0.5, 1.1),
  apply(env, it, p) {
    if (p < 0.06) return;
    const q = (p - 0.06) / 0.94, sz = it.size, col = mixC(colOf(it), env.sc.bg, 0.3), a = 0.85 * (1 - E.outQuad(q));
    it.shadow = null; it.extrude = null;
    if (!(it.stroke > 0)) it.stroke = Math.max(1, sz * 0.018);
    it.strokeColor = col;
    scaleAbout(env, it, 1 + 0.05 * q);
    it.y -= sz * 0.04 * q;
    it.charFns.push(() => (a <= 0.004 ? HIDE : { outline: true, color: col, a }));
  },
});

/* dragged off: something tugs the whole line towards a corner — a tug, a pause, a harder tug — and then it is gone */
reg('exit', 'hzDragCorner', {
  name: '隅へ引きずる', en: 'Dragged Off', tags: TAGS.concat(['emotional', 'graphic']), w: 0.9, ae: 'drift', minDur: 1,
  outDur: dur => clamp(dur * 0.5, 0.6, 1.2),
  apply(env, it, p) {
    const cs = cseed(env), W = env.W, H = env.H, st = env.step;
    const sxn = (J.h(cs, 331) & 1) ? 1 : -1, syn = J.r(cs, 332) < 0.75 ? 1 : -1;
    const g = p < 0.3 ? 0.07 * E.outCubic(clamp((p - 0.04) / 0.14)) : p < 0.58 ? lerp(0.07, 0.24, E.outCubic(clamp((p - 0.3) / 0.14))) : lerp(0.24, 1, E.inCubic((p - 0.58) / 0.42));
    const rest = (p > 0.2 && p < 0.3) || (p > 0.46 && p < 0.58) ? 1 : 0;
    const s = 1 - 0.45 * g, cx = W / 2, cy = H / 2;
    const ang = sxn * syn * -16 * g * J.DEG, dx = it.x - cx, dy = it.y - cy;
    it.x = cx + (dx * Math.cos(ang) - dy * Math.sin(ang)) * s + sxn * W * 0.62 * g + rest * J.rs(cs, st, 333) * it.size * 0.012;
    it.y = cy + (dx * Math.sin(ang) + dy * Math.cos(ang)) * s + syn * H * 0.62 * g;
    it.rot = (it.rot || 0) + ang / J.DEG;
    it.size *= s;
    it.alpha = (it.alpha ?? 1) * (1 - J.smooth(0.7, 0.97, p));
  },
});

/* flatline: two beats, each weaker; then the line goes flat, holds as a thin trace, and shortens to nothing */
reg('exit', 'hzFlatline', {
  name: '心停止', en: 'Flatline', tags: TAGS.concat(['emotional', 'graphic']), w: 0.8, ae: 'shrink', minDur: 1,
  outDur: dur => clamp(dur * 0.5, 0.6, 1.2),
  apply(env, it, p) {
    const bump = (c, w) => Math.exp(-Math.pow((p - c) / w, 2));
    if (p < 0.46) { it.size *= 1 + 0.08 * bump(0.08, 0.035) + 0.045 * bump(0.27, 0.04); return; }
    const flat = lerp(1, 0.035, E.outExpo(clamp((p - 0.46) / 0.14)));
    const vert = !!it.vertical;
    if (vert) it.sx = (it.sx || 1) * flat; else it.sy = (it.sy || 1) * flat;
    it.shadow = null; it.extrude = null;
    if (p > 0.8) {
      const q = (p - 0.8) / 0.2, k = Math.max(0.02, 1 - E.inOutCubic(q));
      if (vert) it.sy = (it.sy || 1) * k; else it.sx = (it.sx || 1) * k;
      it.alpha = (it.alpha ?? 1) * (1 - J.smooth(0.6, 1, q));
    }
  },
});

/* the shadow leaves: the words fade where they stand while their shadow slips out from under them and walks off */
reg('exit', 'hzShadowOff', {
  name: '影だけ去る', en: 'Shadow Leaves', tags: TAGS.concat(['emotional']), w: 0.9, ae: 'drift', minDur: 1,
  outDur: dur => clamp(dur * 0.5, 0.6, 1.3),
  apply(env, it, p) {
    const cs = cseed(env), sz = it.size, a0 = it.alpha ?? 1, c0 = colOf(it);
    const dir = (J.h(cs, 341) & 1) ? 1 : -1, shc = isDark(env.sc.bg) ? mixC(c0, env.sc.bg, 0.62) : mixC(c0, env.sc.bg, 0.45);
    it.alpha = a0 * (1 - J.smooth(0.08, 0.5, p));
    const slip = E.outCubic(clamp(p / 0.3)), walk = E.inQuad(clamp((p - 0.3) / 0.7));
    const sa = a0 * 0.75 * J.smooth(0, 0.2, p) * (1 - J.smooth(0.72, 1, p));
    if (sa < 0.01) return;
    const X = it.x + dir * (sz * 0.22 * slip + env.W * 0.55 * walk), Y = it.y + sz * 0.1 * slip + Math.abs(Math.sin(walk * 14)) * sz * 0.04 * (walk > 0 ? 1 : 0);
    const sk = (it.skew || 0) - dir * 14 * walk;
    addPre(it, (en, i) => { if (en.pass === 'main') J.drawItem(en, bare(i, { x: X, y: Y, skew: sk, color: shc, alpha: sa, ghost: false, stroke: 0, fill: true, fillAlpha: 1 })); });
  },
});

/* backing away: it retreats from you one stiff step at a time, smaller and dimmer, and after the last step it is not there */
reg('exit', 'hzBackAway', {
  name: '後ずさり', en: 'Backing Away', tags: TAGS.concat(['emotional', 'calm']), w: 1, ae: 'shrink', minDur: 0.9,
  outDur: dur => clamp(dur * 0.5, 0.55, 1.2),
  apply(env, it, p) {
    if (p >= 0.92) { it.alpha = 0; return; }
    const cs = cseed(env), at = [0.06, 0.28, 0.5, 0.72];
    let L = 0, sh = 0;
    for (let k = 0; k < 4; k++) { const e = E.outExpo(clamp((p - at[k]) / 0.08)); L += e; sh += e * J.rs(cs, k, 351); }
    scaleAbout(env, it, Math.pow(0.88, L));
    it.x += sh * env.W * 0.012; it.y -= L * env.H * 0.008;
    it.alpha = (it.alpha ?? 1) * Math.pow(0.7, L);
    const c0 = colOf(it), bg = env.sc.bg;
    it.charFns.push(() => ({ color: mixC(c0, bg, 0.12 * L) }));
  },
});

/* ================================================================== HOLDS */

/* too-slow breath: a very long breath in, held with a faint tremor, and let go all at once */
reg('hold', 'hzSlowBreath', {
  name: '遅すぎる呼吸', en: 'Slow Breath', tags: TAGS.concat(['emotional', 'calm']), w: 1, ae: 'breathe',
  apply(env, it, amt) {
    const k = amt * motionK(env); if (k < 0.02) return;
    const cs = cseed(env), per = 6.2, u = ((env.ltb / per + J.r(cs, 411) * 0.25) % 1 + 1) % 1;
    const v = u < 0.55 ? E.inOutSine(u / 0.55) : u < 0.8 ? 1 : u < 0.86 ? 1 - E.outExpo((u - 0.8) / 0.06) : 0;
    scaleAbout(env, it, 1 + 0.05 * v * k);
    if (u >= 0.55 && u < 0.8) { it.x += J.rs(cs, env.step, 412) * it.size * 0.006 * k; it.y += J.rs(cs, env.step, 413) * it.size * 0.004 * k; }
    it.alpha = (it.alpha ?? 1) * (1 - 0.14 * v * Math.min(1, k));
  },
});

/* lone tremor: everything is dead still except one glyph, which shivers in slow swells */
reg('hold', 'hzLoneTremor', {
  name: '一字の震え', en: 'Lone Tremor', tags: TAGS.concat(['glitch', 'emotional']), w: 1, ae: 'jitter',
  apply(env, it, amt) {
    const k = amt * motionK(env); if (k < 0.02) return;
    const cs = cseed(env), N = cutN(env), idx = indexOf(env, it), sz = it.size, st = env.step, target = J.h(cs, 421) % N;
    const sw = Math.pow(0.5 - 0.5 * Math.cos(env.ltb * TAU / 3.4 + J.r(cs, 422) * TAU), 1.6);
    if (sw < 0.02) return;
    it.charFns.push((i, g, n) => (idx(i, n) === target
      ? { dx: J.rs(cs, st, 423) * sz * 0.04 * sw * k, dy: J.rs(cs, st, 424) * sz * 0.03 * sw * k, rot: J.rs(cs, st, 425) * 6 * sw * k }
      : null));
  },
});

/* something passes: an unseen thing moves along the line; where it is, the glyphs dim and lean out of its way */
reg('hold', 'hzPassing', {
  name: '何かが通る', en: 'Something Passes', tags: TAGS.concat(['emotional']), w: 1.1, ae: 'wave',
  apply(env, it, amt) {
    const k = amt * motionK(env); if (k < 0.02) return;
    const cs = cseed(env), W = env.W, per = 3.6, T = env.ltb / per + J.r(cs, 431) * 0.4, cyc = Math.floor(T), u = (T - cyc) / 0.62;
    if (u >= 1) return;
    const back = ((J.h(cs, 432) + cyc) & 1) === 1, X = back ? lerp(1.2 * W, -0.2 * W, u) : lerp(-0.2 * W, 1.2 * W, u);
    const R = W * 0.15, sx = it.sx || 1, sz = it.size, kk = Math.min(1, k);
    it.charFns.push((i, g) => {
      const d = (it.x + g.x * sx - X) / R;
      if (d <= -1 || d >= 1) return null;
      const f = Math.pow(1 - d * d, 2), sg = d < 0 ? -1 : 1;
      return { a: 1 - 0.6 * f * kk, dx: sg * f * sz * 0.07 * k, rot: sg * 8 * f * k, dy: f * sz * 0.02 * k };
    });
  },
});

/* fading presence: each glyph is, at its own slow pace, a little less there — and then back */
reg('hold', 'hzPresence', {
  name: '薄れる気配', en: 'Fading Presence', tags: TAGS.concat(['calm', 'emotional']), w: 0.9, ae: 'breathe',
  apply(env, it, amt) {
    const k = amt * clamp(motionK(env), 0.5, 1.2); if (k < 0.02) return;
    const cs = cseed(env), idx = indexOf(env, it), sz = it.size, t = env.ltb * 0.42, kk = Math.min(1, k);
    it.charFns.push((i, g, n) => {
      const d = J.smooth(0.05, 0.75, J.noise1(t + idx(i, n) * 7.31, cs + 441));
      return d <= 0 ? null : { a: 1 - 0.62 * d * kk, dy: d * sz * 0.035 * k };
    });
  },
});

/* looming shadow: a larger, faint copy slowly rises up behind the words, and drops away the moment it is noticed */
reg('hold', 'hzLoom', {
  name: '背後の影', en: 'Looming Shadow', tags: TAGS.concat(['emotional', 'graphic']), w: 0.9, ae: 'drift',
  apply(env, it, amt) {
    const k = amt * motionK(env); if (k < 0.02 || it.fill === false || (it.alpha ?? 1) < 0.5) return;
    const cs = cseed(env), per = 4.8, u = ((env.ltb / per + J.r(cs, 451) * 0.3) % 1 + 1) % 1;
    const v = u < 0.8 ? E.inOutSine(u / 0.8) : 1 - E.outExpo((u - 0.8) / 0.2);
    if (v < 0.02) return;
    const sz = it.size, s = 1 + 0.17 * v * Math.min(1.2, k), bx = J.itemBox(it), c0 = colOf(it);
    const col = mixC(c0, env.sc.bg, isDark(env.sc.bg) ? 0.5 : 0.35);
    let dx = 0, dy = -sz * 0.1 * v * k;
    if (!it.vertical) { if (it.align === 'left') dx = -bx.w * (s - 1) / 2; else if (it.align === 'right') dx = bx.w * (s - 1) / 2; }
    else if (it.align === 'left') dy -= bx.h * (s - 1) / 2;
    const a = (it.alpha ?? 1) * 0.34 * Math.min(1, k) * Math.sqrt(v);
    addPre(it, (en, i) => { if (en.pass === 'main') J.drawItem(en, bare(i, { x: i.x + dx, y: i.y + dy, size: i.size * s, color: col, alpha: a, ghost: false, stroke: 0, fill: true, _m: null })); });
  },
});

/* ================================================================== TREATMENTS */

/* uneven ink: some glyphs took the ink badly — a few are much fainter than the rest, and sit a hair low */
reg('treat', 'hzUneven', {
  name: 'むらのある字', en: 'Uneven Ink', tags: TAGS.concat(['emotional', 'editorial']), w: 1, safe: true, ae: 'fadeChars',
  plan: rng => ({ lo: rng.range(0.36, 0.48), rate: rng.range(0.2, 0.34) }),
  apply(env, it, Pm) {
    if (!alive(it)) return;
    const cs = cseed(env), idx = indexOf(env, it), sz = it.size, lo = Pm.lo || 0.42, rate = Pm.rate || 0.26, N = cutN(env), sure = N > 1 ? J.h(cs, 512) % N : -1;
    it.charFns.push((i, g, n) => {
      const ix = idx(i, n), k = J.h(cs, ix, 511);
      // never two weak glyphs in a row
      const weak = ix === sure || (J.r(k, 1) < rate && ix !== sure + 1 && !(J.r(J.h(cs, ix - 1, 511), 1) < rate && (ix & 1)));
      return weak ? { a: lo, dy: sz * 0.025 } : { a: 0.72 + 0.28 * J.r(k, 2) };
    });
  },
});

/* hairline scratches: a few long, thin cuts run straight through the words */
reg('treat', 'hzHairlines', {
  name: '細い傷', en: 'Hairline Scratches', tags: TAGS.concat(['graphic', 'glitch']), w: 1, ae: 'strike',
  plan: rng => ({ n: rng.int(3, 5), slant: rng.range(-0.22, 0.22) }),
  apply(env, it, Pm) {
    if (!alive(it)) return;
    const seed = it.seed | 0, bg = env.sc.bg, sub = env.sc.sub;
    addPost(it, (en, i, bb) => {
      if (en.pass !== 'main' || !bb || (i.alpha ?? 1) < 0.25) return;
      const w = bb.x1 - bb.x0, h = bb.y1 - bb.y0; if (w < 2 || h < 2) return;
      const sz = i.size, one = bb.boxes && bb.boxes.length <= 1, n = one ? 1 + (seed & 1) : (Pm.n || 4);
      const lw = Math.max(1.2, sz * 0.014), a = i.alpha ?? 1, ox = -i.x, oy = -i.y;
      inItem(en, i, () => {
        for (let j = 0; j < n; j++) {
          const f = (j + 0.5 + J.rs(seed, j, 521) * 0.32) / n;
          const long = one || w >= h, sl = ((Pm.slant || 0) + J.rs(seed, j, 522) * 0.12) * (long ? h : w);
          let a0, a1;
          if (long) { const y = lerp(bb.y0, bb.y1, 0.12 + 0.76 * f); a0 = [bb.x0 - sz * 0.12, y - sl]; a1 = [bb.x1 + sz * 0.12, y + sl]; }
          else { const x = lerp(bb.x0, bb.x1, 0.12 + 0.76 * f); a0 = [x - sl, bb.y0 - sz * 0.12]; a1 = [x + sl, bb.y1 + sz * 0.12]; }
          en.line([[a0[0] + ox, a0[1] + oy], [a1[0] + ox, a1[1] + oy]], bg, lw * (1 + J.r(seed, j, 523)), a, false);
          // the cut runs a little past the letters as a faint line
          const ex = sz * (0.25 + 0.5 * J.r(seed, j, 524)), ux = a1[0] - a0[0], uy = a1[1] - a0[1], ul = Math.hypot(ux, uy) || 1;
          const e0 = J.r(seed, j, 525) < 0.5 ? a0 : a1, sg = e0 === a0 ? -1 : 1;
          en.line([[e0[0] + ox, e0[1] + oy], [e0[0] + ox + sg * ux / ul * ex, e0[1] + oy + sg * uy / ul * ex]], sub, lw * 0.8, a * 0.4, false);
        }
      });
    });
  },
});

/* cold rim: the letters themselves fall into shade; only a thin cold edge on one side still catches the light */
reg('treat', 'hzColdRim', {
  name: '冷たい縁', en: 'Cold Rim', tags: TAGS.concat(['emotional', 'graphic']), w: 0.9, ae: 'hardShadow',
  plan: rng => ({ side: rng.pick([-1, 1]), d: rng.range(0.022, 0.032) }),
  apply(env, it, Pm) {
    if (!alive(it) || it.shadow || it.extrude || it.gradient || it.pattern) return;
    const c0 = colOf(it), bg = env.sc.bg, sz = it.size, d = Math.max(1.5, sz * (Pm.d || 0.026));
    const shade = mixC(c0, bg, J.contrast(c0, bg) > 6 ? 0.6 : 0.48);
    it.shadow = { color: c0, blur: sz * 0.012, dx: (Pm.side || -1) * d, dy: -d * 0.8 };
    it.color = shade;
  },
});

/* husk: only a broken, irregular outline is left, with the faintest stain of the letter inside */
reg('treat', 'hzHusk', {
  name: '抜け殻', en: 'Husk', tags: TAGS.concat(['graphic', 'editorial']), w: 0.8, ae: 'dotted',
  plan: rng => ({ k: rng.range(0.85, 1.25), fill: rng.range(0.12, 0.2) }),
  apply(env, it, Pm) {
    if (!alive(it) || it.stroke > 0 || it.gradient || it.pattern) return;
    const sz = it.size, k = Pm.k || 1;
    it.fillAlpha = (it.fillAlpha ?? 1) * (Pm.fill || 0.15);
    it.stroke = Math.max(1.3, sz * 0.024);
    it.strokeColor = colOf(it);
    it.strokeDash = [0.2, 0.05, 0.05, 0.07, 0.34, 0.06, 0.1, 0.11].map(v => Math.max(1, v * sz * k));
    it.shadow = null;
  },
});

/* drag marks: every letter has been dragged a little way; a fading trail of it hangs underneath */
reg('treat', 'hzDragMarks', {
  name: '引きずり跡', en: 'Drag Marks', tags: TAGS.concat(['emotional', 'graphic']), w: 0.9, ae: 'longShadow',
  plan: rng => ({ len: rng.range(0.26, 0.42), lean: rng.range(-0.06, 0.06) }),
  apply(env, it, Pm) {
    if (!alive(it) || it.extrude || it.shadow) return;
    const sz = it.size, c0 = colOf(it);
    it.extrude = { n: 9, dx: sz * (Pm.lean || 0), dy: sz * (Pm.len || 0.4), color: mixC(c0, env.sc.bg, 0.45), fade: true, a: 0.42 };
  },
});

/* ================================================================== CAMERA */
const KM = env => clamp((env.fx.motion ?? 0.7) * 1.25, 0, 1.25);

/* creep and freeze: a very slow push that stops dead mid-move, as if it heard something, and eases a hair back */
reg('cam', 'hzCreepFreeze', {
  name: '寄って固まる', en: 'Creep And Freeze', tags: TAGS.concat(['emotional', 'calm']), w: 1.1, ae: 'push',
  plan: rng => ({ at: rng.range(0.5, 0.68), r: rng.range(-0.6, 0.6) }),
  get(env, Pm) {
    const K = KM(env), d = Math.max(0.4, env.cut.dur), t0 = d * (Pm.at || 0.6), u = Math.min(1, env.lt / t0);
    const back = env.lt > t0 ? E.outExpo(clamp((env.lt - t0) / 0.14)) : 0;
    return { s: 1 + 0.085 * K * u - 0.012 * K * back, y: -env.H * 0.01 * K * u, rot: (Pm.r || 0) * K * u };
  } });

/* glance back: a slow drift one way, a quick look over the shoulder the other way, held, and a reluctant return */
reg('cam', 'hzGlanceBack', {
  name: '振り返り', en: 'Glance Back', tags: TAGS.concat(['emotional', 'editorial']), w: 0.9, ae: 'panL',
  plan: rng => ({ at: rng.range(0.32, 0.5), dir: rng.pick([-1, 1]) }),
  get(env, Pm) {
    const K = KM(env), d = Math.max(0.6, env.cut.dur), dir = Pm.dir || 1, t = env.lt, t0 = d * (Pm.at || 0.4);
    const drift = dir * env.W * 0.02 * K * E.inOutSine(clamp(t / d));
    const hold = Math.min(0.55, d * 0.2), q = t - t0;
    const gl = q <= 0 ? 0 : q < 0.13 ? E.outExpo(q / 0.13) : q < 0.13 + hold ? 1 : 1 - E.inOutSine(clamp((q - 0.13 - hold) / 0.9));
    return { x: drift - dir * env.W * 0.045 * K * gl, rot: -dir * 1.3 * K * gl, s: 1.035 + 0.012 * K * gl, y: env.H * 0.004 * K * gl };
  } });

/* held breath: the frame sways with slow breathing, then the breath is held — stock still but for a tremor — and let out */
reg('cam', 'hzHeldBreath', {
  name: '息を殺す', en: 'Held Breath', tags: TAGS.concat(['calm', 'emotional']), w: 1, ae: 'floatNoise',
  plan: rng => ({ at: rng.range(0.3, 0.5), len: rng.range(0.9, 1.5), per: rng.range(2.8, 3.6) }),
  get(env, Pm) {
    const K = KM(env), d = Math.max(0.6, env.cut.dur), t = env.lt, hs = d * (Pm.at || 0.4), len = Math.min(Pm.len || 1.2, d * 0.4);
    const held = t >= hs && t < hs + len, te = t < hs ? t : held ? hs : t - len;
    const ph = te * TAU / (Pm.per || 3.2), br = Math.sin(ph), sd = env.cut.seed | 0;
    const tr = held ? Math.min(1, (t - hs) / 0.3) : 0;
    return { s: 1.03 + 0.014 * K * br, y: -env.H * 0.009 * K * br + J.noise1(t * 13, sd) * env.H * 0.0016 * K * tr,
      x: Math.sin(ph * 0.5) * env.W * 0.004 * K + J.noise1(t * 15, sd + 1) * env.W * 0.0014 * K * tr, rot: 0.35 * K * Math.sin(ph * 0.5 + 1) };
  } });

/* cold shiver: perfectly still — then a short, fine shudder runs through the frame and dies away */
reg('cam', 'hzColdShiver', {
  name: '悪寒', en: 'Cold Shiver', tags: TAGS.concat(['glitch', 'emotional']), w: 0.9, ae: 'handheld',
  plan: rng => ({ per: rng.range(1.9, 2.6), rate: rng.range(0.6, 0.85) }),
  get(env, Pm) {
    const K = KM(env), t = env.lt, sd = env.cut.seed | 0, per = Pm.per || 2.2;
    let x = 0, y = 0, rot = 0, s = 1.03 + 0.012 * K * clamp(t / Math.max(0.5, env.cut.dur));
    const cyc = Math.floor(t / per), since = t - cyc * per - (0.15 + J.r(sd, cyc, 611) * 0.45) * per;
    if (since > 0 && J.r(sd, cyc, 612) < (Pm.rate || 0.75)) {
      const en = Math.exp(-since * 5.5) * (1 - Math.exp(-since * 45)) * K;
      x = Math.sin(since * TAU * 13) * env.W * 0.0065 * en; y = Math.sin(since * TAU * 17 + 1) * env.H * 0.004 * en;
      rot = Math.sin(since * TAU * 11 + 2) * 0.8 * en; s -= 0.014 * en;
    }
    return { x, y, rot, s };
  } });

/* ================================================================== SCREEN EFFECTS */
const evS = ev => J.h(Math.round(ev.t * 1000), 7741);
const ampOf = ev => clamp(ev.amp ?? 1, 0.5, 1.3);
const fx = (k, d) => reg('fx', k, Object.assign({}, d, {
  draw(ctx, ev, k2, I) { ctx.save(); try { d.draw(ctx, ev, clamp(Number.isFinite(k2) ? k2 : 1), I); } finally { ctx.restore(); } } }));

/* closing tear: the picture rips open along a ragged vertical line, the halves slip against each other, and it closes */
fx('hzTear', {
  name: '縦の裂け目', en: 'Closing Tear', tags: TAGS.concat(['glitch', 'graphic']), w: 0.8, dur: 8, amp: 1, glitchy: true, mid: true, scratch: true, ae: 'slice',
  draw(ctx, ev, k, I) {
    const { cw, ch, S, sc } = I; if (!S) return;
    const s = evS(ev), M = Math.min(cw, ch), open = k < 0.18 ? E.outExpo(k / 0.18) : 1 - E.inOutCubic((k - 0.18) / 0.82);
    const gap = M * 0.075 * ampOf(ev) * open; if (gap < 0.6) return;
    const x0 = cw * J.rr(0.28, 0.72, s, 1), n = 14, slip = M * 0.014 * open * (J.r(s, 2) < 0.5 ? 1 : -1), lean = J.rs(s, 3) * cw * 0.05;
    const pts = [];
    for (let j = 0; j <= n; j++) pts.push([x0 + lean * (j / n - 0.5) + J.rs(s, j, 4) * M * 0.022, ch * j / n]);
    ctx.fillStyle = nightC(sc); ctx.fillRect(0, 0, cw, ch);
    for (const side of [-1, 1]) {
      ctx.save(); ctx.beginPath();
      ctx.moveTo(side < 0 ? -2 : cw + 2, -2);
      for (let j = 0; j <= n; j++) ctx.lineTo(pts[j][0] + side * gap / 2, j === 0 ? -2 : j === n ? ch + 2 : pts[j][1]);
      ctx.lineTo(side < 0 ? -2 : cw + 2, ch + 2); ctx.closePath(); ctx.clip();
      ctx.drawImage(S, side * gap / 2, side * slip);
      ctx.restore();
    }
  } });

/* colour drain: for a moment all colour leaves the picture and the contrast goes flat and pale */
fx('hzDrain', {
  name: '色を失う', en: 'Colour Drain', tags: TAGS.concat(['emotional', 'calm']), w: 0.9, dur: 10, pre: 2, amp: 1, mid: true, ae: 'flash',
  draw(ctx, ev, k, I) {
    const { cw, ch, sc } = I, e = ahr(k, 0.15, 0.55) * clamp(ampOf(ev), 0.6, 1.1); if (e < 0.004) return;
    ctx.globalCompositeOperation = 'saturation'; ctx.globalAlpha = Math.min(1, e); ctx.fillStyle = '#808080'; ctx.fillRect(0, 0, cw, ch);
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 0.3 * e; ctx.fillStyle = J.mix(sc.fg, sc.bg, 0.5); ctx.fillRect(0, 0, cw, ch);
  } });

/* closing dark: the dark at the edges of the frame swells inwards, nearly reaches the middle, and draws back */
fx('hzClosingDark', {
  name: '迫る闇', en: 'Closing Dark', tags: TAGS.concat(['emotional']), w: 1, dur: 13, pre: 4, amp: 1, mid: true, ae: 'flash',
  draw(ctx, ev, k, I) {
    const { cw, ch } = I, s = evS(ev), e = ahr(k, 0.4, 0.5) * clamp(ampOf(ev), 0.7, 1.1); if (e < 0.004) return;
    const R = Math.hypot(cw, ch) / 2, cx = cw * (0.5 + J.rs(s, 1) * 0.05), cy = ch * (0.5 + J.rs(s, 2) * 0.05);
    const wob = 1 + 0.04 * Math.sin(k * 23 + s % 7);
    const g = ctx.createRadialGradient(cx, cy, R * lerp(0.8, 0.26, e) * wob, cx, cy, R * lerp(1.25, 0.78, e) * wob);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.6, `rgba(0,0,0,${(0.7 * e).toFixed(3)})`); g.addColorStop(1, `rgba(0,0,0,${(0.96 * e).toFixed(3)})`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, cw, ch);
  } });

/* cold breath: a pale cloud of breath rises from below the frame, spreads and thins out */
fx('hzColdBreath', {
  name: '白い息', en: 'Cold Breath', tags: TAGS.concat(['calm', 'emotional']), w: 0.7, dur: 16, pre: 2, amp: 1, mid: true,
  draw(ctx, ev, k, I) {
    const { cw, ch, sc } = I, s = evS(ev), M = Math.min(cw, ch), dk = isDark(sc.bg), col = J.mix(sc.fg, sc.bg, dk ? 0.25 : 0.72);
    const x0 = cw * J.rr(0.3, 0.7, s, 1), lean = J.rs(s, 2) * cw * 0.16, amp = clamp(ampOf(ev), 0.7, 1.1);
    for (let j = 0; j < 9; j++) {
      const d = j * 0.055, q = clamp((k - d) / (1 - d)); if (q <= 0 || q >= 1) continue;
      const e = E.outCubic(q), r = M * (0.07 + 0.24 * e) * (0.6 + 0.8 * J.r(s, j, 3));
      const x = x0 + lean * e * (0.4 + j * 0.15) + J.rs(s, j, 4) * M * 0.34 * e, y = ch * 1.03 - ch * (0.16 + 0.34 * J.r(s, j, 5)) * e;
      const a = (dk ? 0.13 : 0.2) * amp * Math.sin(Math.PI * Math.pow(q, 0.7));
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, J.rgba(col, a)); g.addColorStop(0.55, J.rgba(col, a * 0.5)); g.addColorStop(1, J.rgba(col, 0));
      ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
  } });

/* faint: the picture slips away from you — smaller, dimmer, soft — into a dark surround, and swims back */
fx('hzFaint', {
  name: '気が遠のく', en: 'Faint', tags: TAGS.concat(['emotional', 'calm']), w: 0.8, dur: 13, pre: 3, amp: 1, mid: true, scratch: true, ae: 'zoom',
  draw(ctx, ev, k, I) {
    const { cw, ch, S, sc } = I; if (!S) return;
    const s = evS(ev), e = ahr(k, 0.38, 0.52) * clamp(ampOf(ev), 0.7, 1.1); if (e < 0.004) return;
    const z = 1 - 0.11 * e, cx = cw / 2 + J.rs(s, 1) * cw * 0.02 * e, cy = ch / 2 + ch * 0.025 * e;
    ctx.fillStyle = nightC(sc); ctx.fillRect(0, 0, cw, ch);
    ctx.save();
    if (I.allowFilter !== false && e > 0.1) ctx.filter = `blur(${(e * 3.2 * (I.scale || 1)).toFixed(1)}px)`;
    ctx.translate(cx, cy); ctx.rotate(J.rs(s, 2) * 0.02 * e); ctx.scale(z, z);
    ctx.drawImage(S, -cw / 2, -ch / 2);
    ctx.restore();
    ctx.globalAlpha = 0.5 * e; ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, cw, ch);
  } });

/* upside glimpse: for two frames the whole picture hangs upside down, dim and a little too near */
fx('hzUpside', {
  name: '逆さの一コマ', en: 'Upside Glimpse', tags: TAGS.concat(['glitch']), w: 0.5, dur: 3, amp: 1, glitchy: true, mid: true, scratch: true, ae: 'invert',
  draw(ctx, ev, k, I) {
    const { cw, ch, S, sc } = I; if (!S || k > 0.7) return;
    const z = 1.06;
    ctx.fillStyle = nightC(sc); ctx.fillRect(0, 0, cw, ch);
    ctx.save(); ctx.translate(cw / 2, ch / 2); ctx.scale(z, -z); ctx.drawImage(S, -cw / 2, -ch / 2); ctx.restore();
    ctx.globalAlpha = 0.42; ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, cw, ch);
  } });

/* ================================================================== TRANSITIONS */
const trReg = (k, d) => reg('trans', k, Object.assign({}, d, {
  draw(ctx, A, B, p, I) {
    ctx.save();
    try { if (!(p > 0)) ctx.drawImage(A, 0, 0); else if (p >= 1) ctx.drawImage(B, 0, 0); else d.draw(ctx, A, B, p, I, I.P || {}); }
    finally { ctx.restore(); }
  } }));

/* blackout: the light on the old shot sputters and fails; a beat of dark; it comes back on over the new one */
trReg('hzBlackout', {
  name: '停電', en: 'Blackout', tags: TAGS.concat(['glitch', 'emotional']), w: 1, dur: 0.55, ae: 'flashCross',
  plan: rng => ({ gap: rng.range(0.1, 0.18) }),
  draw(ctx, A, B, p, I, Pm) {
    const { cw, ch } = I, st = I.step, sd = I.seed | 0, g = Pm.gap || 0.14, a1 = 0.5 - g / 2, b0 = 0.5 + g / 2;
    let lv = 0, src = null;
    if (p < a1) { const q = p / a1; src = A; lv = 1 - E.inQuad(q); if (q > 0.2 && J.r(sd, st, 711) < 0.4) lv *= 0.25; }
    else if (p > b0) { const q = (p - b0) / (1 - b0); src = B; lv = E.outQuad(q); if (q < 0.6 && J.r(sd, st, 712) < 0.4) lv *= 0.3; }
    ctx.fillStyle = '#000000';
    if (!src || lv <= 0.003) { ctx.fillRect(0, 0, cw, ch); return; }
    ctx.drawImage(src, 0, 0);
    if (lv < 0.997) { ctx.globalAlpha = 1 - lv; ctx.fillRect(0, 0, cw, ch); }
  } });

/* sliding down: the old picture loses its grip and slides off downwards in uneven strips, stretching as it goes */
trReg('hzSlideDown', {
  name: 'ずり落ちる', en: 'Sliding Down', tags: TAGS.concat(['emotional', 'graphic']), w: 0.9, dur: 0.6, ae: 'sliceShift',
  plan: rng => ({ n: rng.pick([18, 28, 40]) }),
  draw(ctx, A, B, p, I, Pm) {
    const { cw, ch } = I, sd = I.seed | 0, n = Pm.n || 28, w = Math.ceil(cw / n);
    ctx.drawImage(B, 0, 0);
    for (let j = 0; j < n; j++) {
      const d = clamp(0.2 + J.noise1(j * 0.37, sd) * 0.2 + J.rs(sd, j, 721) * 0.05, 0, 0.4), q = clamp((p - d) / 0.6);
      const x = Math.floor(cw * j / n), ww = Math.min(w, cw - x); if (ww <= 0) continue;
      if (q <= 0) { ctx.drawImage(A, x, 0, ww, ch, x, 0, ww, ch); continue; }
      if (q >= 1) continue;
      const off = E.inCubic(q) * ch * 1.03;
      ctx.drawImage(A, x, 0, ww, ch, x, off, ww, ch * (1 + 0.45 * q));
    }
  } });

/* lingering ghost: the new shot is there at once, but the old one stays on as a pale ghost that drifts up and thins */
trReg('hzLinger', {
  name: '居残る影', en: 'Lingering Ghost', tags: TAGS.concat(['emotional', 'calm']), w: 1, dur: 0.75, ae: 'zoomThrough',
  plan: rng => ({ up: rng.pick([-1, -1, 1]) }),
  draw(ctx, A, B, p, I, Pm) {
    const { cw, ch, sc } = I, st = I.step, sd = I.seed | 0, t0 = 0.14;
    if (p < t0) { ctx.drawImage(A, 0, 0); ctx.globalAlpha = p / t0; ctx.drawImage(B, 0, 0); }
    else ctx.drawImage(B, 0, 0);
    const dA = isDark((I.scPrev || sc).bg), dB = isDark(sc.bg);
    let a = 0.6 * (1 - E.inOutSine(p));
    if (p > 0.3 && J.r(sd, st, 731) < 0.22) a *= 0.35;
    if (a <= 0.004) return;
    const z = 1 + 0.07 * p, dy = (Pm.up || -1) * ch * 0.035 * E.outCubic(p);
    ctx.globalAlpha = dA === dB ? a : a * 0.6; ctx.globalCompositeOperation = dA !== dB ? 'source-over' : dB ? 'lighten' : 'darken';
    ctx.drawImage(A, cw / 2 - cw / 2 * z, ch / 2 - ch / 2 * z + dy, cw * z, ch * z);
  } });
})();
