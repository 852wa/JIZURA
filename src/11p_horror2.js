/* JIZURA pack: horror (2/3) — entrances, exits, holds and text treatments with an uneasy, J-horror / found-footage feel */
(() => {
'use strict';
const E = J.E;
const P = 'horror';
const TAGS = ['horror'];
const reg = (g, key, def) => J.register(g, key, Object.assign({ set: 'horror' }, def), P);
const HIDE = Object.freeze({ hide: true });

/* ------------------------------------------------------------------ helpers */
const isHex = c => typeof c === 'string' && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(c);
const colOf = it => (isHex(it.color) ? it.color : '#ffffff');
const mixC = (a, b, t) => (isHex(a) && isHex(b) ? J.mix(a, b, J.clamp(t)) : (t < 0.5 ? a : b));
const motionK = env => J.clamp((env.fx && env.fx.motion != null ? env.fx.motion : 0.7) / 0.7, 0, 1.6);
const layOf = it => (it._m || (it._m = J.measure(it))).lay;
const cutN = env => Math.max(1, J.glyphCount(String((env.cut && env.cut.text) || '')));
const cseed = env => (env.cut && env.cut.seed) | 0;
/* position of glyph i along the whole lyric (0..1): within the item, or by motion index for one-glyph items */
const orderOf = (env, it) => {
  const N = cutN(env), mi = +it.mi || 0;
  return (i, n) => (n > 1 ? i / (n - 1) : N > 1 ? J.clamp(mi / (N - 1)) : 0);
};
/* integer index of glyph i within the whole lyric */
const indexOf = (env, it) => {
  const N = cutN(env), mi = Math.round(+it.mi || 0);
  return (i, n) => (n > 1 ? i : N > 1 ? Math.min(N - 1, mi) : 0);
};
const isDarkBg = env => J.lum(env.sc.bg) < 0.45;
const nightC = sc => J.mix(sc.bg, '#000000', J.lum(sc.bg) < 0.45 ? 0.72 : 0.9);
/* item-space centre of the laid-out text */
const layCenter = it => {
  const lay = layOf(it); let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  for (const g of lay) { x0 = Math.min(x0, g.x - g.w / 2); x1 = Math.max(x1, g.x + g.w / 2); y0 = Math.min(y0, g.y - g.h / 2); y1 = Math.max(y1, g.y + g.h / 2); }
  return lay.length ? [(x0 + x1) / 2, (y0 + y1) / 2, x1 - x0, y1 - y0] : [0, 0, 0, 0];
};
/* irregular (uneasy) timeline: cumulative random gaps, some long, normalised to 0..span */
const uneasyTimes = (seed, N, span) => {
  const gaps = []; let tot = 0;
  for (let k = 0; k < N; k++) { const r = J.r(seed, k, 901); const g = 0.25 + (r < 0.25 ? 2.2 : r * 1.1); gaps.push(g); tot += g; }
  const out = []; let acc = 0;
  for (let k = 0; k < N; k++) { out.push(acc / tot * span); acc += gaps[k]; }
  return out;
};
const addPre = (it, f) => { const p = it.pre; it.pre = p ? (e, i) => { p(e, i); f(e, i); } : f; };
const addPost = (it, f) => { const p = it.post; it.post = p ? (e, i, b) => { p(e, i, b); f(e, i, b); } : f; };
const bare = (i, extra) => Object.assign({}, i, { pre: null, post: null, echo: null, streak: null, shadow: null, extrude: null, pattern: null, patternBg: null, gradient: null,
  pieceFn: null, strokeDash: null, strokeUnder: false, wipeBar: null, cursorAt: null, bands: null, vbands: null, clip: null, clipY: null, clipFn: null, blend: null, _lay: null }, extra || {});
/* visible glyphs in item space following the per-glyph motion */
const glyphList = (it) => {
  const lay = J.layoutText(it), sx = it.sx || 1, sy = it.sy || 1, out = [];
  for (const g of lay) {
    if (g.ch === ' ' || g.ch === '　') continue;
    const c = it.charFn ? it.charFn(g.i, g, lay.N) : null;
    if (c && c.hide) continue;
    const s = c && c.s != null ? c.s : 1;
    out.push({ g, x: g.x * sx + g.vx * sx + ((c && c.dx) || 0), y: g.y * sy + g.vy * sy + ((c && c.dy) || 0), w: g.w * sx * s, h: g.h * sy * s, a: c && c.a != null ? c.a : 1, rot: (c && c.rot) || 0 });
  }
  return out;
};
/* run fn in item space (translate / rotate / skew of the item) */
const inItem = (env, it, fn) => {
  const ctx = env.ctx; ctx.save(); ctx.translate(it.x, it.y);
  if (it.rot) ctx.rotate(it.rot * J.DEG);
  if (it.skew) ctx.transform(1, 0, Math.tan(it.skew * J.DEG), 1, 0, 0);
  try { fn(); } finally { ctx.restore(); }
};
const alive = (it, amin = 0.9) => it.fill !== false && (it.alpha ?? 1) >= amin && !!it.text && it.size > 1;

/* ================================================================== ENTRANCES */

/* between blinks: every time the screen blinks, the glyphs are closer */
reg('enter', 'hrBlinkCreep', {
  name: '瞬きの間に', tags: TAGS.concat(['emotional']), w: 0.9, ae: 'flicker', minDur: 1,
  inDur: dur => J.clamp(dur * 0.5, 0.6, 1.3),
  apply(env, it, p) {
    const seed = it.seed | 0, sz = it.size, cs = cseed(env), ord = orderOf(env, it);
    const B = [0.26, 0.52, 0.78], bw = 0.05;
    for (const b of B) if (p >= b && p < b + bw) { it.charFns.push(() => HIDE); return; }
    const stage = B.filter(b => p >= b + bw).length;
    const f = stage / B.length;
    it.charFns.push((i, g, n) => {
      const k = J.h(cs, Math.round(ord(i, n) * 97), 11);
      const ang = J.r(k, 1) * J.TAU, dist = sz * (0.9 + J.r(k, 2) * 1.1);
      const r = 1 - f;
      if (r <= 0) return null;
      return { dx: Math.cos(ang) * dist * r, dy: Math.sin(ang) * dist * r * 0.6, s: 1 - 0.45 * r, rot: J.rs(k, 3) * 25 * r, a: 0.3 + 0.7 * (1 - r) };
    });
  },
});

/* jump scare: faint and tiny, then it snaps at you and settles */
reg('enter', 'hrJumpScare', {
  name: '飛び出し', tags: TAGS.concat(['glitch', 'pop']), w: 0.7, ae: 'zoom', minDur: 0.9,
  inDur: dur => J.clamp(dur * 0.42, 0.45, 1),
  apply(env, it, p) {
    const at = 0.62, seed = it.seed | 0;
    if (p < at) {
      const q = p / at;
      it.size *= 0.42 + 0.08 * q;
      it.alpha = (it.alpha ?? 1) * (0.1 + 0.12 * q) * (J.r(seed, env.step, 3) < 0.15 ? 0.3 : 1);
      it.x += J.rs(seed, env.step, 1) * it.size * 0.02; it.y += J.rs(seed, env.step, 2) * it.size * 0.02;
      return;
    }
    const q = (p - at) / (1 - at), e = E.outExpo(q), k = 1 - e;
    it.size *= 1 + 0.95 * k;
    it.x += J.rs(seed, env.step, 4) * it.size * 0.12 * k; it.y += J.rs(seed, env.step, 5) * it.size * 0.12 * k;
    it.rot = (it.rot || 0) + J.rs(seed, env.step, 6) * 7 * k;
  },
});

/* uneasy timing: glyphs arrive one by one after irregular, too-long pauses, each with a twitch */
reg('enter', 'hrUneasy', {
  name: '間の悪い出現', tags: TAGS.concat(['editorial']), w: 1, ae: 'type', minDur: 0.9,
  inDur: (dur, n) => J.clamp(dur * 0.55, 0.5, 1.6),
  apply(env, it, p) {
    const cs = cseed(env), N = cutN(env), idx = indexOf(env, it), times = uneasyTimes(cs, N, 0.86), sz = it.size, acc = env.sc.accent;
    it.charFns.push((i, g, n) => {
      const t0 = times[Math.min(N - 1, idx(i, n))] || 0, q = (p - t0) / 0.1;
      if (q < 0) return HIDE;
      if (q >= 1) return null;
      const k = J.h(cs, idx(i, n), 21);
      return { dx: J.rs(k, 1) * sz * 0.18 * (1 - q), dy: J.rs(k, 2) * sz * 0.1 * (1 - q), rot: J.rs(k, 3) * 18 * (1 - q), color: q < 0.5 ? acc : null };
    });
  },
});

/* vertical hold: the line rolls through the frame like a TV losing sync, then locks */
reg('enter', 'hrVhold', {
  name: '垂直同期', tags: TAGS.concat(['glitch']), w: 0.8, ae: 'slice',
  inDur: dur => J.clamp(dur * 0.4, 0.35, 0.8),
  apply(env, it, p) {
    const bx = J.itemBox(it), pad = it.size * 0.25, y0 = bx.y0 - pad, y1 = bx.y1 + pad, Hh = y1 - y0;
    if (Hh <= 1) return;
    const e = E.outCubic(p), rolls = 2.6, m = (((1 - e) * rolls * Hh) % Hh + Hh) % Hh;
    it.clipY = [y0, y1];
    it.y += m;
    it.echo = { n: 1, dx: 0, dy: -Hh, a: 1, decay: 1 };
    it.x += J.rs(it.seed | 0, env.step, 1) * it.size * 0.05 * (1 - e);
    it.alpha = (it.alpha ?? 1) * Math.min(1, 0.4 + p * 2);
    const bar = J.mix(env.sc.bg, '#000000', 0.6), single = layOf(it).N === 1 && cutN(env) > 1;
    addPost(it, (en) => {
      if (en.pass !== 'main' || m < 1 || single) return;
      const yb = y0 + m, fa = 1 - J.smooth(0.75, 1, p);
      en.rect(bx.x0 - pad * 2, yb - Hh * 0.05, bx.x1 - bx.x0 + pad * 4, Hh * 0.07, bar, 0.85 * fa, false);
      en.rect(bx.x0 - pad * 2, yb + Hh * 0.03, bx.x1 - bx.x0 + pad * 4, Math.max(1, Hh * 0.008), en.sc.fg, 0.35 * fa, false);
    });
  },
});

/* mirror writing: it appears reversed, shudders, and snaps the right way round */
reg('enter', 'hrMirrorSnap', {
  name: '鏡文字', tags: TAGS.concat(['glitch']), w: 0.8, ae: 'flicker', minDur: 0.8,
  inDur: dur => J.clamp(dur * 0.45, 0.5, 1.1),
  apply(env, it, p) {
    const seed = it.seed | 0, [cx] = layCenter(it), sx = it.sx || 1, st = env.step;
    let s = -1;
    if (p >= 0.55 && p < 0.72) s = J.r(seed, st, 7) < 0.5 ? -1 : 0.25;
    else if (p >= 0.72) s = J.lerp(-0.2, 1, E.outBack((p - 0.72) / 0.28, 2.2));
    it.alpha = (it.alpha ?? 1) * Math.min(1, p / 0.18);
    if (p < 0.55) it.rot = (it.rot || 0) + Math.sin(p * 30) * 1.5;
    if (s === 1) return;
    it.charFns.push((i, g) => ({ sx: Math.abs(s) < 0.04 ? 0.04 : s, dx: (cx - g.x) * sx * (1 - s) }));
  },
});

/* manifesting: it wavers in and out, each glyph on its own breath, and finally holds */
reg('enter', 'hrManifest', {
  name: '浮かび上がる', tags: TAGS.concat(['emotional', 'calm']), w: 1, ae: 'blur', minDur: 0.8,
  inDur: dur => J.clamp(dur * 0.5, 0.5, 1.4),
  apply(env, it, p) {
    const cs = cseed(env), idx = indexOf(env, it), sz = it.size, N = cutN(env);
    const fin = J.smooth(0.72, 1, p);
    it.charFns.push((i, g, n) => {
      const k = J.h(cs, idx(i, n), 31), ph = J.r(k, 1) * J.TAU, f = 7 + J.r(k, 2) * 6;
      const wav = J.clamp(p * 1.3) * (0.45 + 0.55 * Math.max(0, Math.sin(p * f + ph)));
      const a = J.lerp(wav, 1, fin);
      if (a >= 0.999) return null;
      return { a, dx: J.noise1(p * 4 + ph, k) * sz * 0.12 * (1 - fin), dy: J.noise1(p * 3 + ph, k + 1) * sz * 0.08 * (1 - fin) };
    });
  },
});

/* claw marks: four slanted tears open across the line and widen until it is all there */
reg('enter', 'hrClawReveal', {
  name: '爪痕から', tags: TAGS.concat(['graphic']), w: 0.8, ae: 'wipe',
  inDur: dur => J.clamp(dur * 0.36, 0.3, 0.7),
  apply(env, it, p) {
    const seed = it.seed | 0, bx = J.itemBox(it), pad = it.size * 0.3;
    const x0 = bx.x0 - pad, x1 = bx.x1 + pad, y0 = bx.y0 - pad, y1 = bx.y1 + pad, W = x1 - x0, Hh = y1 - y0;
    const n = 4, sp = W / n, slope = Math.min(0.55 * Hh, sp * 1.4), dir = (J.h(seed, 3) & 1) ? 1 : -1;
    if (p > 0.97) return;
    it.clipFn = (ctx) => {
      for (let k = -2; k < n + 2; k++) {
        const q = J.clamp((p - J.clamp(k, 0, n - 1) * 0.08) / 0.7) * (k < 0 || k >= n ? J.smooth(0.5, 0.9, p) : 1); if (q <= 0) continue;
        const e = E.inOutCubic(q), cx = x0 + (k + 0.5) * sp, w = sp * 0.08 + sp * 1.1 * e * e;
        // a slanted band, drawn in the swipe from one end to the other
        const reach = E.outCubic(J.clamp(q * 3)), ya = dir > 0 ? y0 : y1, yb = J.lerp(ya, dir > 0 ? y1 : y0, reach);
        const off = (y) => (y - y0) / Hh * slope - slope / 2;
        const j = (a, b) => J.rs(seed, k, a, b) * sp * 0.06;
        ctx.moveTo(cx - w / 2 + off(ya) + j(1, 1), ya); ctx.lineTo(cx + w / 2 + off(ya) + j(1, 2), ya);
        ctx.lineTo(cx + w / 2 + off((ya + yb) / 2) + j(2, 1), (ya + yb) / 2);
        ctx.lineTo(cx + w / 2 * 0.3 + off(yb), yb); ctx.lineTo(cx - w / 2 * 0.3 + off(yb), yb);
        ctx.lineTo(cx - w / 2 + off((ya + yb) / 2) + j(2, 2), (ya + yb) / 2); ctx.closePath();
      }
    };
  },
});

/* ================================================================== EXITS */

/* pulled under: glyphs are yanked down one by one; the last one clings and trembles first */
reg('exit', 'hrPulledDown', {
  name: '引きずり込み', tags: TAGS.concat(['glitch', 'emotional']), w: 1, ae: 'fall',
  outDur: dur => J.clamp(dur * 0.4, 0.4, 0.9),
  apply(env, it, p) {
    const cs = cseed(env), N = cutN(env), idx = indexOf(env, it), H = env.H, sz = it.size, st = env.step;
    const last = J.h(cs, 41) % N;
    it.charFns.push((i, g, n) => {
      const ix = idx(i, n);
      const t0 = ix === last ? 0.7 : J.r(cs, ix, 42) * 0.5;
      const q = (p - t0) / 0.28;
      if (q < 0) {
        const tr = J.clamp(1 + q * 1.5) * (ix === last ? 1.6 : 0.6);
        return tr > 0 ? { dx: J.rs(cs, ix, st, 43) * sz * 0.03 * tr, dy: J.rs(cs, ix, st, 44) * sz * 0.02 * tr, rot: J.rs(cs, ix, st, 45) * 6 * tr } : null;
      }
      if (q >= 1) return HIDE;
      const e = q * q;
      return { dy: e * H * 1.1, sy: 1 + q * 1.8, sx: 1 - q * 0.3, rot: J.rs(cs, ix, 46) * 12 * q, a: 1 - E.inCubic(q) };
    });
  },
});

/* one stays behind: the line vanishes at once except one glyph, which turns to look, then is gone */
reg('exit', 'hrLookBack', {
  name: '一字残る', tags: TAGS.concat(['emotional']), w: 0.9, ae: 'cut', minDur: 1,
  outDur: dur => J.clamp(dur * 0.45, 0.55, 1.2),
  apply(env, it, p) {
    const cs = cseed(env), N = cutN(env), idx = indexOf(env, it), sz = it.size, st = env.step;
    const txt = [...String(env.cut.text || '').replace(/\s+/g, '')];
    let pick = J.h(cs, 51) % N;
    for (let k = 0; k < N; k++) { const j = (pick + k) % N; if (J.isKanji(txt[j] || '') || /[A-Za-z]/.test(txt[j] || '')) { pick = j; break; } }
    const dir = (J.h(cs, 52) & 1) ? 1 : -1, acc = env.sc.accent;
    it.charFns.push((i, g, n) => {
      if (idx(i, n) !== pick) return p < 0.06 ? { a: 0.4 } : HIDE;
      if (p >= 0.86) return HIDE;
      const q = E.inOutSine(J.clamp((p - 0.12) / 0.55));
      const tw = J.r(cs, st, 53) < 0.12 ? J.rs(cs, st, 54) * 6 : 0;
      return { rot: dir * 24 * q + tw, s: 1 + 0.16 * q, dx: J.rs(cs, st, 55) * sz * 0.01 * q, color: q > 0.3 ? acc : null };
    });
  },
});

/* turning away: each glyph turns its back (edge-on, then reversed and darkened) and fades */
reg('exit', 'hrTurnAway', {
  name: '背を向ける', tags: TAGS.concat(['calm', 'emotional']), w: 0.9, ae: 'stretch',
  outDur: dur => J.clamp(dur * 0.4, 0.4, 0.9),
  apply(env, it, p) {
    const ord = orderOf(env, it), c0 = colOf(it), dk = nightC(env.sc), sz = it.size;
    it.charFns.push((i, g, n) => {
      const q = J.clamp((p - ord(i, n) * 0.4) / 0.6);
      if (q <= 0) return null;
      if (q >= 1) return HIDE;
      const sx = Math.cos(q * Math.PI * 0.95);
      return { sx: Math.abs(sx) < 0.04 ? 0.04 : sx, color: q > 0.5 ? mixC(c0, dk, 0.35 + q * 0.5) : null, a: 1 - J.smooth(0.6, 1, q), dy: q * sz * 0.08 };
    });
  },
});

/* shiver: a tremor that keeps growing, and glyphs drop out of existence between frames */
reg('exit', 'hrShiver', {
  name: '震えて消える', tags: TAGS.concat(['glitch']), w: 0.9, ae: 'glitch',
  outDur: dur => J.clamp(dur * 0.35, 0.35, 0.8),
  apply(env, it, p) {
    const cs = cseed(env), idx = indexOf(env, it), sz = it.size, st = env.step;
    it.charFns.push((i, g, n) => {
      const ix = idx(i, n), t0 = 0.3 + J.r(cs, ix, 61) * 0.62;
      if (p >= t0) return HIDE;
      const a = sz * (0.025 + 0.13 * p);
      return { dx: J.rs(cs, ix, st, 62) * a, dy: J.rs(cs, ix, st, 63) * a, rot: J.rs(cs, ix, st, 64) * 14 * p };
    });
  },
});

/* swallowed: a stain of darkness spreads from one point and eats the line */
reg('exit', 'hrSwallow', {
  name: '闇に呑まれる', tags: TAGS.concat(['emotional', 'graphic']), w: 0.9, ae: 'wipe',
  outDur: dur => J.clamp(dur * 0.4, 0.4, 0.9),
  apply(env, it, p) {
    const seed = it.seed | 0, bx = J.itemBox(it), sz = it.size;
    const cx = J.lerp(bx.x0, bx.x1, J.rr(0.15, 0.85, seed, 71)), cy = J.lerp(bx.y0, bx.y1, J.rr(0.3, 0.7, seed, 72));
    const Rmax = Math.hypot(Math.max(cx - bx.x0, bx.x1 - cx), Math.max(cy - bx.y0, bx.y1 - cy)) + sz * 0.2;
    const R = Rmax * E.inCubic(J.clamp(p / 0.75)) * 1.08;
    const pts = [], m = 22;
    for (let k = 0; k < m; k++) { const a = k / m * J.TAU, r = R * (0.72 + 0.4 * J.r(seed, k, 73) + 0.08 * Math.sin(p * 9 + k)); pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
    it.clipFn = (ctx, en) => {
      ctx.rect(-en.W * 2, -en.H * 2, en.W * 5, en.H * 5);
      if (R > 0.5) { ctx.moveTo(pts[0][0], pts[0][1]); for (let k = m - 1; k >= 0; k--) ctx.lineTo(pts[k][0], pts[k][1]); ctx.closePath(); }
    };
    const dk = nightC(env.sc), fade = 1 - J.smooth(0.62, 0.95, p);
    addPost(it, (en) => { if (en.pass === 'main' && R > 0.5) en.blob(pts, dk, 0.85 * fade, false); });
    if (p > 0.97) it.alpha = 0;
  },
});

/* dying light: the words strobe out, with single frames where they come back wrong */
reg('exit', 'hrFlickerDie', {
  name: '明滅して消える', tags: TAGS.concat(['glitch']), w: 0.9, ae: 'glitch',
  outDur: dur => J.clamp(dur * 0.38, 0.35, 0.8),
  apply(env, it, p) {
    const seed = it.seed | 0, st = env.step, r = J.r(seed, st, 81);
    if (p > 0.92 || r > Math.pow(1 - p, 1.3) * 0.95) { it.charFns.push(() => HIDE); return; }
    if (J.r(seed, st, 82) < 0.22 && p > 0.15) {
      const [cx] = layCenter(it), sx = it.sx || 1, acc = env.sc.accent;
      it.charFns.push((i, g) => ({ sx: -1, dx: (cx - g.x) * sx * 2, color: acc }));
      it.y += J.rs(seed, st, 83) * it.size * 0.1;
    } else it.alpha = (it.alpha ?? 1) * (0.55 + 0.45 * J.r(seed, st, 84));
  },
});

/* draining: the ink level sinks inside each glyph while drips run out of the bottom */
reg('exit', 'hrDrain', {
  name: '滴り落ちる', tags: TAGS.concat(['emotional']), w: 0.8, ae: 'wipe', minDur: 0.8,
  outDur: dur => J.clamp(dur * 0.45, 0.5, 1.1),
  apply(env, it, p) {
    const cs = cseed(env), idx = indexOf(env, it), ord = orderOf(env, it), sz = it.size;
    const lev = (i, n) => E.inOutSine(J.clamp((p - ord(i, n) * 0.25) / 0.72));
    it.charFns.push((i, g, n) => {
      const q = lev(i, n); if (q <= 0) return null; if (q >= 0.995) return HIDE;
      return { clipY: [-0.7 + q * 1.4, 0.7] };
    });
    const c = colOf(it);
    addPost(it, (en) => {
      if (en.pass !== 'main') return;
      inItem(en, it, () => {
        const lay = layOf(it), sx = it.sx || 1, sy = it.sy || 1;
        for (const g of lay) {
          if (g.ch === ' ' || g.ch === '　') continue;
          const q = lev(g.i, lay.N); if (q <= 0.02) continue;
          const k = J.h(cs, idx(g.i, lay.N), 91), nd = 1 + (k % 2);
          for (let d = 0; d < nd; d++) {
            const x = (g.x + J.rs(k, d, 1) * g.w * 0.3) * sx, yb = (g.y + g.h * 0.4) * sy;
            const L = sz * (0.3 + 1.4 * J.r(k, d, 2)) * E.outCubic(q), a = (it.alpha ?? 1) * (1 - J.smooth(0.75, 1, q));
            en.line([[x, yb - sz * 0.05], [x, yb + L]], c, Math.max(1, sz * 0.035), a, false);
            en.circle(x, yb + L, sz * 0.03, c, null, 0, a, false);
          }
        }
      });
    });
  },
});

/* ================================================================== HOLDS */

/* twitch: dead still, then a rare violent jerk of one glyph (or the whole line) */
reg('hold', 'hrTwitch', {
  name: '痙攣', tags: TAGS.concat(['glitch']), w: 1, ae: 'glitchtick',
  apply(env, it, amt) {
    const k = amt * motionK(env); if (k < 0.02) return;
    const cs = cseed(env), st = env.step, idx = indexOf(env, it), N = cutN(env), sz = it.size;
    if (J.r(cs, st, 101) > 0.07 * k) return;
    const whole = J.r(cs, st, 102) < 0.25, target = J.h(cs, st, 103) % N;
    it.charFns.push((i, g, n) => {
      if (!whole && idx(i, n) !== target) return null;
      return { dx: J.rs(cs, st, 104) * sz * 0.22 * k, dy: J.rs(cs, st, 105) * sz * 0.14 * k, rot: J.rs(cs, st, 106) * 28 * k, s: 1 + J.r(cs, st, 107) * 0.12 * k };
    });
  },
});

/* staring: now and then one glyph slowly tilts its head towards you, holds, and snaps back */
reg('hold', 'hrStare', {
  name: '見つめる字', tags: TAGS.concat(['emotional']), w: 0.8, ae: 'drift',
  apply(env, it, amt) {
    const k = amt * motionK(env); if (k < 0.02) return;
    const cs = cseed(env), idx = indexOf(env, it), N = cutN(env), per = 2, t = env.ltb - 0.3;
    if (t <= 0) return;
    const cyc = Math.floor(t / per), u = (t - cyc * per) / per, target = J.h(cs, cyc, 111) % N;
    const q = u < 0.6 ? E.inOutSine(u / 0.6) : u < 0.85 ? 1 : 1 - E.outExpo((u - 0.85) / 0.15);
    const dir = (J.h(cs, cyc, 112) & 1) ? 1 : -1;
    it.charFns.push((i, g, n) => (idx(i, n) === target ? { rot: dir * 22 * q * k, s: 1 + 0.12 * q * k, dy: -g.h * 0.04 * q * k } : null));
  },
});

/* the late one: the line sways together, one glyph follows a moment too late */
reg('hold', 'hrLagOne', {
  name: '遅れる一字', tags: TAGS.concat(['calm']), w: 0.8, ae: 'drift',
  apply(env, it, amt) {
    const k = amt * motionK(env); if (k < 0.02) return;
    const cs = cseed(env), idx = indexOf(env, it), N = cutN(env), sz = it.size, t = env.ltb, late = J.h(cs, 121) % N;
    const sw = (tt) => [J.noise1(tt * 0.9, cs) * sz * 0.1 * k, J.noise1(tt * 0.7 + 5, cs + 1) * sz * 0.06 * k, J.noise1(tt * 0.5 + 9, cs + 2) * 4 * k];
    const a = sw(t), b = sw(t - 0.75);
    it.charFns.push((i, g, n) => { const v = idx(i, n) === late ? b : a; return { dx: v[0], dy: v[1], rot: v[2] }; });
  },
});

/* failing light: the words buzz, dim and drop out for a frame or two */
reg('hold', 'hrFlickerLight', {
  name: '切れかけの灯', tags: TAGS.concat(['glitch', 'emotional']), w: 0.9, ae: 'glitchtick',
  apply(env, it, amt) {
    const k = amt * J.clamp(motionK(env), 0.4, 1.3); if (k < 0.02) return;
    const cs = cseed(env), st = env.step, run = st >> 1;
    let lvl = 0.9 + 0.1 * J.r(cs, st, 131);
    if (J.r(cs, run, 132) < 0.09 * k) lvl = J.r(cs, st, 133) < 0.5 ? 0.08 : 0.35;
    else if (J.r(cs, st, 134) < 0.05 * k) lvl = 0.5;
    const a = 1 - (1 - lvl) * Math.min(1, k);
    it.alpha = (it.alpha ?? 1) * a;
    if (a < 0.6) it.color = mixC(colOf(it), env.sc.bg, 0.3);
  },
});

/* ================================================================== TREATMENTS */

/* ink bleed: a dark halo seeps out of the letters and thin drips run down from some of them */
reg('treat', 'hrInkBleed', {
  name: '滲み垂れ', tags: TAGS.concat(['emotional']), w: 0.8, ae: 'softShadow',
  plan: rng => ({ drips: rng.range(0.25, 0.45), red: rng.chance(0.4) }),
  apply(env, it, P) {
    if (!alive(it)) return;
    const sc = env.sc, c = colOf(it), halo = P.red ? sc.accent : (isDarkBg(env) ? mixC(c, sc.bg, 0.5) : mixC(c, sc.bg, 0.3));
    const sz = it.size;
    const single = layOf(it).N === 1 && cutN(env) > 4;
    if (!it.shadow && !single) it.shadow = { color: J.rgba(isHex(halo) ? halo : '#000000', 0.8), blur: sz * 0.07, dx: 0, dy: sz * 0.02 };
    const cs = cseed(env), rate = P.drips || 0.35;
    addPost(it, (en, i) => {
      if (en.pass !== 'main') return;
      const cut = en.cut, d0 = cut.inDur * 1.1, grow = J.clamp((en.lt - d0) / Math.max(0.8, cut.dur * 0.7));
      if (grow <= 0) return;
      const a = (i.alpha ?? 1) * (1 - en.pOut);
      if (a < 0.05) return;
      const dc = P.red ? sc.accent : c;
      inItem(en, i, () => {
        for (const q of glyphList(i)) {
          const k = J.h(cs, q.g.i, Math.round(i.x), 141);
          if (J.r(k, 1) > rate || J.isPunct(q.g.ch)) continue;
          const x = q.x + J.rs(k, 2) * q.w * 0.25, y = q.y + q.h * 0.36, L = sz * (0.2 + 0.9 * J.r(k, 3)) * E.outCubic(grow);
          const lw = Math.max(1, sz * (0.018 + 0.02 * J.r(k, 4)));
          en.line([[x, y], [x + J.rs(k, 5) * sz * 0.02, y + L]], dc, lw, a * q.a * 0.9, false);
          en.circle(x + J.rs(k, 5) * sz * 0.02, y + L, lw * 0.9, dc, null, 0, a * q.a * 0.9, false);
        }
      });
    });
  },
});

/* eroded: letters worn away with pits and scratches in the background colour */
reg('treat', 'hrEroded', {
  name: '風化', tags: TAGS.concat(['editorial', 'graphic']), w: 0.8, ae: 'halftone',
  plan: rng => ({ dens: rng.range(0.7, 1.2), scr: rng.chance(0.7) }),
  apply(env, it, P) {
    if (!alive(it)) return;
    const cs = cseed(env), bg = env.sc.bg, sz = it.size, dens = P.dens || 1;
    addPost(it, (en, i) => {
      if (en.pass !== 'main' || (i.alpha ?? 1) < 0.3) return;
      inItem(en, i, () => {
        let budget = 420;
        for (const q of glyphList(i)) {
          if (q.a < 0.3) continue;
          const k = J.h(cs, q.g.i, 151), n = Math.round((16 + J.r(k, 1) * 14) * dens);
          for (let j = 0; j < n && budget-- > 0; j++) {
            const r = sz * (0.01 + 0.045 * Math.pow(J.r(k, j, 2), 2));
            en.circle(q.x + J.rs(k, j, 3) * q.w * 0.45, q.y + J.rs(k, j, 4) * q.h * 0.45, r, bg, null, 0, 1, false);
          }
          if (P.scr && J.r(k, 5) < 0.45) {
            const a = J.r(k, 6) * Math.PI, L = q.w * 0.6;
            en.line([[q.x - Math.cos(a) * L / 2, q.y - Math.sin(a) * L / 2], [q.x + Math.cos(a) * L / 2, q.y + Math.sin(a) * L / 2]], bg, Math.max(1.5, sz * 0.022), 1, false);
          }
        }
      });
    });
  },
});

/* redacted: a black bar covers part of the line and is pulled off later, leaving its outline */
reg('treat', 'hrRedact', {
  name: '黒塗り', tags: TAGS.concat(['editorial', 'graphic']), w: 0.7, ae: 'boxed',
  plan: rng => ({ at: rng.range(0.25, 0.5), frac: rng.range(0.3, 0.6), from: rng.range(0, 1) }),
  apply(env, it, P) {
    if (!alive(it)) return;
    const lay = layOf(it), N = lay.N, cs = cseed(env), ord = orderOf(env, it);
    if (N === 1 && cutN(env) > 1) {
      // one-glyph items: cover a run of glyphs of the lyric
      const o = ord(0, 1), a = P.from * (1 - P.frac);
      if (o < a || o > a + P.frac) return;
    }
    const c = colOf(it), sc = env.sc;
    addPost(it, (en, i) => {
      if (en.pass !== 'main') return;
      const cut = en.cut, t0 = cut.inDur + (cut.dur - cut.inDur - cut.outDur) * P.at;
      const k = E.inOutCubic(J.clamp((en.lt - t0) / 0.35));
      const gl = glyphList(i); if (!gl.length) return;
      let s0 = 0, s1 = gl.length - 1;
      if (gl.length > 2) { const m = Math.max(1, Math.round(gl.length * P.frac)); s0 = Math.min(gl.length - m, Math.floor(P.from * (gl.length - m + 1))); s1 = s0 + m - 1; }
      let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
      for (let j = s0; j <= s1; j++) { const q = gl[j]; x0 = Math.min(x0, q.x - q.w / 2); x1 = Math.max(x1, q.x + q.w / 2); y0 = Math.min(y0, q.y - q.h / 2); y1 = Math.max(y1, q.y + q.h / 2); }
      const pd = i.size * 0.06, a = (i.alpha ?? 1);
      inItem(en, i, () => {
        const w = (x1 - x0 + pd * 2);
        if (k < 1) en.rect(x0 - pd + w * k, y0 - pd * 0.5, w * (1 - k), y1 - y0 + pd, c, a, false);
        if (k > 0) en.line([[x0 - pd, y0 - pd * 0.5], [x1 + pd, y0 - pd * 0.5], [x1 + pd, y1 + pd * 0.5], [x0 - pd, y1 + pd * 0.5], [x0 - pd, y0 - pd * 0.5]], sc.sub, Math.max(1, i.size * 0.01), a * 0.5 * k, false);
      });
    });
  },
});

/* double exposure: a second, fainter take of the line drifts out of register */
reg('treat', 'hrDoubleExp', {
  name: '二重露光', tags: TAGS.concat(['emotional', 'glitch']), w: 0.8, ae: 'echoOutline',
  plan: rng => ({ amp: rng.range(0.18, 0.28), k: rng.range(1.03, 1.08) }),
  apply(env, it, P) {
    if (!alive(it)) return;
    const cs = cseed(env), sc = env.sc;
    const col = [sc.sub, sc.ghostA, sc.fg].find(c => c && c !== it.color && J.contrast(c, sc.bg) > 1.3) || sc.sub;
    addPre(it, (en, i) => {
      if (en.pass !== 'main' || (i.alpha ?? 1) < 0.05) return;
      const t = en.ltb, sz = i.size, amp = P.amp || 0.12;
      const c = bare(i, { x: i.x + J.noise1(t * 0.6, cs + 3) * sz * amp, y: i.y + J.noise1(t * 0.5, cs + 4) * sz * amp * 0.7, size: sz * (P.k || 1.05), color: col, alpha: (i.alpha ?? 1) * 0.4, ghost: false });
      J.drawItem(en, c);
    });
  },
});
})();
