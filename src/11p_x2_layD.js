/* JIZURA pack: x2layD — 追加分2 layouts D: arrangements of the glyphs themselves, multi-copy settings and layouts with built-in motion */
(() => {
'use strict';
const E = J.E;
const P = 'x2layD';
const reg = (key, def) => J.register('layout', key, def, P);

/* ------------------------------------------------------------------ helpers */
const TAU = J.TAU, DEG = J.DEG, clamp = J.clamp, lerp = J.lerp;
const isSp = c => c === ' ' || c === '　';
const isLatinT = t => J.isLatinText(t);
const closeP = ch => J.isPunct(ch) && !'「『（(［【〈《“‘'.includes(ch);
/* glyph cells: closing punctuation rides with the glyph before it; ' ' marks a word gap (Latin lyrics only) */
const cellsOf = t => {
  let s = String(t || '').trim().replace(/[\s　]+/g, ' ');
  if (!(isLatinT(s) && s.includes(' '))) s = s.replace(/ /g, '');
  const o = [];
  for (const ch of [...s]) { const l = o[o.length - 1]; if (l && !isSp(l) && closeP(ch) && [...l].length < 2) o[o.length - 1] += ch; else o.push(ch); }
  return o;
};
const glyphsOf = t => cellsOf(t).filter(c => !isSp(c));
/* split into R rows of (almost) equal length, longer rows first */
const chunkBal = (a, R) => { const o = [], n = a.length; R = Math.max(1, Math.min(R, n)); let at = 0; for (let r = 0; r < R; r++) { const k = Math.ceil((n - at) / (R - r)); o.push(a.slice(at, at + k)); at += k; } return o; };
/* J.splitLines, but never leave a line of punctuation only */
const splitL = (t, per) => {
  const ls = J.splitLines(String(t), Math.max(1, per)).split('\n'), out = [];
  for (const l of ls) { if (out.length && [...l].every(c => J.isPunct(c) || c === ' ')) out[out.length - 1] += l; else out.push(l); }
  return out.join('\n');
};
const linesOf = (t, L) => { const s = String(t || '').trim(), n = [...s].length; return L <= 1 ? s : splitL(s, Math.ceil(n / L)); };
/* rows of cells: Latin lyrics break between words, anything else into even runs */
const rowCells = (txt, RN) => {
  const all = cellsOf(txt);
  if (RN <= 1) return [all];
  if (all.includes(' ')) return linesOf(String(txt).trim().replace(/\s+/g, ' '), RN).split('\n').map(cellsOf).filter(r => r.length);
  return chunkBal(all, RN);
};
const fontsOf = (st, roles) => J.fontsOf(st, roles);
const monoF = env => (env.st.fonts.mono && env.st.fonts.mono[0]) || 'mono';
const inE = (env, d = 0.35, delay = 0) => E.outExpo(clamp((env.lt - delay) / d));
const inC = (env, d = 0.35, delay = 0) => E.outCubic(clamp((env.lt - delay) / d));
const outK = env => 1 - E.inCubic(env.pOut);
const hair = env => Math.max(1, Math.min(env.W, env.H) * 0.0016);
const U = J.unionBB;
const frac = x => x - Math.floor(x);
const accentOn = sc => (J.contrast(sc.accent, sc.bg) >= 2 ? sc.accent : sc.accent2 && J.contrast(sc.accent2, sc.bg) >= 2 ? sc.accent2 : sc.fg);
const subOn = sc => (J.contrast(sc.sub, sc.bg) >= 1.6 ? sc.sub : J.mix(sc.bg, sc.fg, 0.6));
const dimOf = sc => J.mix(sc.bg, sc.fg, 0.17);
const lsz = env => clamp(Math.min(env.W, env.H) * 0.019, 11, 24);
const label = (env, text, x, y, o = {}) => { if ((o.alpha ?? 1) <= 0.003) return; env.draw({ text: String(text), font: o.font || monoF(env), size: o.size || lsz(env), x, y, align: o.align || 'center', track: o.track ?? 0.08, color: o.color || env.sc.sub, alpha: o.alpha ?? 1, rot: o.rot || 0, ghost: false }); };
const Rc = (env, x, y, w, h, c, a = 1) => { if (a > 0.003 && w > 0 && h > 0) env.rect(x, y, w, h, c, a, false); };
const Ln = (env, x0, y0, x1, y1, c, lw, a = 1) => { if (a > 0.003) env.line([[x0, y0], [x1, y1]], c, lw, a, false); };
const disc = (env, cx, cy, r, c, a = 1) => { if (a > 0.003 && r > 0) env.circle(cx, cy, r, c, null, 0, a, false); };
const ringS = (env, cx, cy, r, c, lw, a = 1) => { if (a > 0.003 && r > 0) env.circle(cx, cy, r, null, c, lw, a, false); };
const polyF = (env, pts, c, a = 1) => { if (a > 0.003) env.poly(pts, c, a, false); };
const mainOnly = (env, fn) => { if (env.pass !== 'main') return; const ctx = env.ctx; ctx.save(); try { fn(ctx); } finally { ctx.restore(); } };
const pathPoly = (ctx, pts) => { pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); };
/* run fn clipped to / outside of a path (all passes) */
const clipped = (env, pathFn, fn) => { const ctx = env.ctx; ctx.save(); ctx.beginPath(); pathFn(ctx); ctx.clip(); let r; try { r = fn(); } finally { ctx.restore(); } return r; };
const clippedOut = (env, pathFn, fn) => { const ctx = env.ctx, W = env.W, H = env.H; ctx.save(); ctx.beginPath(); ctx.rect(-W * 3, -H * 3, W * 7, H * 7); pathFn(ctx); ctx.clip('evenodd'); let r; try { r = fn(); } finally { ctx.restore(); } return r; };
const base = env => { const cut = env.cut; return { W: env.W, H: env.H, sc: env.sc, cut, Pm: cut.params || {}, lt: env.lt, M: Math.min(env.W, env.H), port: env.H > env.W * 1.08, txt: String(cut.text || '').trim(), out: outK(env), lw: hair(env), seed: cut.seed | 0 }; };
const stg = (env, i, step = 0.05, d = 0.4) => E.outExpo(clamp((env.lt - i * step) / d));
/* choose the line count (1..maxL) that gives the biggest type inside a box */
const fitBox = (text, font, bw, bh, o = {}, maxL = 4) => {
  const t = String(text || '').trim(), n = [...t].length;
  let best = null;
  for (let L = 1; L <= Math.min(maxL, Math.max(1, n)); L++) {
    const tt = linesOf(t, L);
    if (tt.split('\n').length < L && best) continue;
    const s = J.fitSize(tt, font, bw, bh, o);
    if (!best || s > best.size * 1.04) best = { text: tt, size: s };
  }
  return best || { text: t, size: 10 };
};
/* per-glyph row setting.  o: track (em), lead, maxR, cap (px), mono (em cell, 0 = natural advance), spw (space width em)
   → { g: [{t, i, r, j, ex, ey, a}], size, R, ws, n }  (ex/ey in em from the block centre) */
const advOf = (font, c, o) => (isSp(c) ? (o.spw ?? (o.mono ? o.mono * 0.5 : 0.34)) : o.mono ? o.mono : [...c].reduce((s, ch) => s + J.metrics.adv(font, ch), 0));
const rowW = (row, font, o) => row.reduce((s, c) => s + advOf(font, c, o), 0) + (o.track || 0) * Math.max(0, row.length - 1);
const layRows = (txt, font, bw, bh, o = {}) => {
  const lead = o.lead ?? 1.2, maxR = o.maxR || 1, tr = o.track || 0;
  let best = null;
  for (let R = 1; R <= maxR; R++) {
    const rows = rowCells(txt, R);
    if (best && rows.length <= best.rows.length) continue;
    const ws = rows.map(r => Math.max(0.3, rowW(r, font, o)));
    const size = Math.min(bw / Math.max(...ws), bh / (rows.length * lead - (lead - 1)), o.cap || 1e9);
    if (!best || size > best.size * 1.04) best = { rows, ws, size };
  }
  const g = [], R = best.rows.length; let gi = 0;
  best.rows.forEach((row, r) => {
    let x = -best.ws[r] / 2;
    row.forEach((c, j) => { const a = advOf(font, c, o); if (!isSp(c)) g.push({ t: c, i: gi++, r, j, ex: x + a / 2, ey: (r - (R - 1) / 2) * lead, a }); x += a + tr; });
  });
  return { g, size: best.size, R, ws: best.ws, n: gi, lead };
};
/* a cell that carries its closing punctuation is squeezed to stay inside a fixed-width cell */
const sqz = c => ([...c].length > 1 ? 0.68 : 1);
const miOf = (i, n) => (n <= 10 ? i : Math.round(i * 10 / n));
/* draw one glyph cell as a main item */
const put = (env, g, n, it) => J.mainDraw(env, Object.assign({ text: g.t, mi: miOf(g.i, n), color: env.sc.fg }, it));
/* secondary copy styles */
const copyStyle = (env, kind, size, k = 1) => {
  const sc = env.sc;
  if (kind === 'dim') return { color: J.mix(sc.bg, sc.fg, 0.3), alpha: 0.9 * k };
  if (kind === 'lines') return { pattern: 'lines', patternColor: sc.fg, color: sc.fg, alpha: 0.75 * k };
  if (kind === 'dots') return { pattern: 'dots', patternColor: sc.fg, color: sc.fg, alpha: 0.8 * k };
  if (kind === 'stripes') return { pattern: 'stripes', patternColor: accentOn(sc), color: accentOn(sc), alpha: 0.85 * k };
  return { fill: false, stroke: Math.max(1.5, size * 0.016), strokeColor: sc.fg, alpha: 0.75 * k };
};

/* ================================================================== 1 xdHelix — 二重らせん
   the glyphs ride one strand of a slowly turning double helix (near glyphs grow, far ones shrink); the other strand is dots and rungs */
reg('xdHelix', {
  name: '二重らせん', en: 'Double Helix', tags: ['graphic', 'calm', 'emotional'], ae: 'wave', w: 0.9, fits: n => n >= 3 && n <= 16,
  plan(rng, cut, st) { return { font: rng.pick(fontsOf(st, ['display', 'serif'])), turns: rng.range(0.9, 1.5), speed: rng.range(16, 30) * rng.pick([1, -1]), rungs: rng.chance(0.75), dot: rng.pick(['dot', 'ring']) }; },
  render(env) {
    const { W, H, sc, Pm, M, port, txt, out, lw } = base(env);
    const sl = cellsOf(txt), N = sl.length, n = sl.filter(c => !isSp(c)).length, K = 1.08;
    const size = port ? Math.min(H * 0.8 / (N * K), W * 0.24) : Math.min(W * 0.84 / (N * K), M * 0.2);
    const amp = port ? Math.min(size * 0.7, W * 0.44 - size * 0.62) : size * 0.62;
    const ph0 = env.ltb * Pm.speed * DEG, q = inE(env, 0.5) * out, acc = accentOn(sc);
    const at = s => { const ph = (N > 1 ? s / (N - 1) : 0.5) * Pm.turns * TAU + ph0, a = (s - (N - 1) / 2) * size * K, o = Math.sin(ph) * amp, c = Math.cos(ph); return port ? { x: W / 2 + o, y: H / 2 + a, xb: W / 2 - o, yb: H / 2 + a, c } : { x: W / 2 + a, y: H / 2 + o, xb: W / 2 + a, yb: H / 2 - o, c }; };
    // far strand
    const pts = []; for (let k = 0; k <= 48; k++) { const p = at(-0.4 + (N - 0.2) * k / 48); pts.push([p.xb, p.yb]); }
    env.polyPartial(pts, inE(env, 0.8), sc.sub, lw * 1.2, 0.45 * out, false);
    const items = [];
    let gi = 0;
    sl.forEach((c, s) => {
      const p = at(s), e = stg(env, s, 0.03, 0.4) * out;
      if (Pm.rungs) Ln(env, p.x, p.y, p.xb, p.yb, sc.sub, lw, 0.28 * e);
      const r = size * 0.075 * (1 - 0.4 * p.c) * e;
      if (Pm.dot === 'ring') ringS(env, p.xb, p.yb, r * 1.2, acc, lw * 1.5, 0.9 * out); else disc(env, p.xb, p.yb, r, acc, 0.9 * out);
      if (!isSp(c)) items.push({ t: c, i: gi++, p });
    });
    items.sort((a, b) => a.p.c - b.p.c);
    let bb = null;
    for (const g of items) bb = U(bb, put(env, g, n, { font: Pm.font, size: size * (1 + 0.16 * g.p.c), sx: sqz(g.t), x: g.p.x, y: g.p.y }));
    return bb;
  },
});

/* ================================================================== 2 xdConstellation — 星座つなぎ
   glyphs sit loosely like stars of different magnitude, joined in reading order by thin lines; the whole sky turns very slowly */
reg('xdConstellation', {
  name: '星座つなぎ', en: 'Constellation', tags: ['calm', 'emotional', 'graphic'], ae: 'scatter', w: 1, fits: n => n >= 3 && n <= 16,
  plan(rng, cut, st) { return { font: rng.pick(fontsOf(st, ['serif', 'display', 'body'])), jit: rng.range(0.18, 0.28), star: rng.pick(['dot', 'cross']), extra: rng.int(6, 11), turn: rng.range(0.5, 1.1) * rng.pick([1, -1]) }; },
  render(env) {
    const { W, H, sc, Pm, M, port, txt, out, lw, seed, cut, lt } = base(env);
    const L = layRows(txt, Pm.font, W * 0.74, H * 0.56, { mono: 1, track: 0.42, lead: 1.8, maxR: port ? 5 : 3, cap: M * 0.19 }), size = L.size;
    const rot = (lt - cut.dur / 2) * Pm.turn * DEG, cr = Math.cos(rot), sr = Math.sin(rot);
    const pt = L.g.map(g => {
      const x = (g.ex + J.rs(seed, g.i, 1) * Pm.jit) * size, y = (g.ey + J.rs(seed, g.i, 2) * Pm.jit * 1.5) * size;
      return { g, k: 0.8 + 0.4 * J.r(seed, g.i, 3), x: W / 2 + x * cr - y * sr, y: H / 2 + x * sr + y * cr };
    });
    // background stars
    for (let k = 0; k < Pm.extra; k++) {
      const x0 = (J.r(seed, k, 11) - 0.5) * W * 0.88, y0 = (J.r(seed, k, 12) - 0.5) * H * 0.84;
      const x = W / 2 + x0 * cr - y0 * sr, y = H / 2 + x0 * sr + y0 * cr, a = (0.3 + 0.3 * Math.sin(lt * 2.2 + k * 1.7)) * inC(env, 0.5, k * 0.04) * out, r = lw * (1.4 + 1.6 * J.r(seed, k, 13));
      if (pt.some(p => Math.hypot(p.x - x, p.y - y) < size * 0.6)) continue;
      if (Pm.star === 'cross') { Ln(env, x - r * 2.4, y, x + r * 2.4, y, sc.sub, lw, a); Ln(env, x, y - r * 2.4, x, y + r * 2.4, sc.sub, lw, a); } else disc(env, x, y, r, sc.sub, a);
    }
    // links in reading order
    for (let i = 0; i < pt.length - 1; i++) {
      const a = pt[i], b = pt[i + 1], d = Math.hypot(b.x - a.x, b.y - a.y), ra = size * a.k * 0.6, rb = size * b.k * 0.6;
      if (d < ra + rb + size * 0.08) continue;
      const ux = (b.x - a.x) / d, uy = (b.y - a.y) / d, e = stg(env, i, 0.07, 0.45);
      const x0 = a.x + ux * ra, y0 = a.y + uy * ra, x1 = lerp(x0, b.x - ux * rb, e), y1 = lerp(y0, b.y - uy * rb, e);
      Ln(env, x0, y0, x1, y1, sc.sub, lw * 1.2, (a.g.r === b.g.r ? 0.7 : 0.3) * out);
      disc(env, x0, y0, lw * 2, accentOn(sc), out * e); disc(env, x1, y1, lw * 2, accentOn(sc), out * e);
    }
    let bb = null;
    for (const p of pt) bb = U(bb, put(env, p.g, L.n, { font: Pm.font, size: size * p.k, sx: sqz(p.g.t), x: p.x, y: p.y }));
    return bb;
  },
});

/* ================================================================== 3 xdBrick — レンガ積み
   one glyph per brick in running bond: every other course is shifted by half a brick */
reg('xdBrick', {
  name: 'レンガ積み', en: 'Brick Bond', tags: ['graphic', 'pop', 'editorial'], ae: 'tile', w: 1, fits: n => n >= 2 && n <= 16,
  plan(rng, cut, st) { return { font: rng.pick(fontsOf(st, ['display'])), style: rng.pick(['line', 'line', 'fill']), acc: rng.chance(0.65), off: rng.pick([0, 1]) }; },
  render(env) {
    const { W, H, sc, Pm, M, port, txt, out, lw, seed } = base(env);
    let best = null;
    for (let R = 1; R <= (port ? 6 : 3); R++) {
      const rows = rowCells(txt, R); if (best && rows.length <= best.rows.length) continue;
      const per = Math.max(...rows.map(r => r.length)), s = Math.min(W * 0.86 / ((per + 0.5) * 1.22), H * 0.74 / (rows.length * 1.3), M * 0.26);
      if (!best || s > best.s * 1.04) best = { rows, per, s };
    }
    const { rows, per, s } = best, R = rows.length, bw = s * 1.22, bh = s * 1.3, ww = (per + 0.5) * bw, left = W / 2 - ww / 2, top = H / 2 - R * bh / 2, n = J.glyphCount(txt);
    const col = subOn(sc), gap = Math.max(lw * 2, s * 0.035);
    const x0r = r => left + ((r + Pm.off) % 2) * bw / 2;
    if (Pm.style === 'line') {
      for (let r = 0; r <= R; r++) { const e = inE(env, 0.5, r * 0.05); Ln(env, left, top + r * bh, left + ww * e, top + r * bh, col, lw * 1.4, 0.8 * out); }
      for (let r = 0; r < R; r++) {
        const xs = [left, left + ww]; for (let j = 0; j <= per; j++) xs.push(x0r(r) + j * bw);
        xs.forEach((x, j) => { const e = inE(env, 0.35, 0.12 + r * 0.05 + j * 0.02); Ln(env, x, top + r * bh, x, top + r * bh + bh * e, col, lw * 1.4, 0.8 * out); });
      }
    } else {
      for (let r = 0; r < R; r++) {
        const x0 = x0r(r), cells = [];
        if (x0 > left + 1) cells.push([left, x0]);
        for (let j = 0; j < per; j++) cells.push([x0 + j * bw, x0 + (j + 1) * bw]);
        if (x0 + per * bw < left + ww - 1) cells.push([x0 + per * bw, left + ww]);
        cells.forEach((c, j) => { const e = E.outBack(clamp((env.lt - r * 0.05 - j * 0.025) / 0.35), 1.4) * out; if (e > 0.01) Rc(env, c[0] + gap / 2, top + r * bh + gap / 2 + (bh - gap) * (1 - e) / 2, c[1] - c[0] - gap, (bh - gap) * e, dimOf(sc), 1); });
      }
    }
    if (Pm.acc) { const r = J.h(seed, 5) % R, onL = (r + Pm.off) % 2 === 1, e = E.outBack(clamp((env.lt - 0.3) / 0.35), 1.6) * out; if (e > 0.01) Rc(env, (onL ? left : left + ww - bw / 2) + gap / 2, top + r * bh + gap / 2, bw / 2 - gap, (bh - gap) * e, accentOn(sc), 1); }
    let bb = null, gi = 0;
    rows.forEach((row, r) => row.forEach((c, j) => { if (isSp(c)) return; bb = U(bb, J.mainDraw(env, { text: c, font: Pm.font, size: s, sx: sqz(c), x: x0r(r) + (j + 0.5) * bw, y: top + (r + 0.5) * bh, color: sc.fg, mi: miOf(gi++, n) })); }));
    return bb;
  },
});

/* ================================================================== 4 xdMirrorAxis — 鏡合わせ
   the lyric stands against a vertical centre line and a left-right flipped copy unfolds on the other side */
reg('xdMirrorAxis', {
  name: '鏡合わせ', en: 'Centre Mirror', tags: ['graphic', 'emotional', 'calm'], ae: 'center', w: 1, fits: n => n >= 1 && n <= 14,
  plan(rng, cut, st) { return { font: rng.pick(fontsOf(st, ['display', 'serif'])), side: rng.pick([-1, -1, 1]), copy: rng.pick(['outline', 'dim', 'lines']), ticks: rng.chance(0.6) }; },
  render(env) {
    const { W, H, sc, Pm, M, port, txt, out, lw } = base(env);
    let it;
    if (port) {
      const n = J.glyphCount(txt), text = linesOf(txt, n > 8 ? 2 : 1), o = { vertical: true, lead: 1.15, track: 0.02 };
      const size = Math.min(J.fitSize(text, Pm.font, W * 0.36, H * 0.8, o), M * 0.28), gap = Math.max(size * 0.14, M * 0.022);
      it = { text, font: Pm.font, size, x: 0, y: H / 2, vertical: true, lead: 1.15, track: 0.02, color: sc.fg };
      it.x = W / 2 + Pm.side * (gap + J.measure(it).w / 2);
    } else {
      const fb = fitBox(txt, Pm.font, W * 0.4, H * 0.62, { lead: 1.2, track: 0.02 }, 4), size = Math.min(fb.size, M * 0.3), gap = Math.max(size * 0.14, M * 0.022);
      it = { text: fb.text, font: Pm.font, size, x: W / 2 + Pm.side * gap, y: H / 2, align: Pm.side < 0 ? 'right' : 'left', lead: 1.2, track: 0.02, color: sc.fg };
    }
    const e = inE(env, 0.6), L = H * 0.4 * e;
    Ln(env, W / 2, H / 2 - L, W / 2, H / 2 + L, accentOn(sc), lw * 2, out);
    if (Pm.ticks) for (let k = -6; k <= 6; k++) { const y = H / 2 + k * H * 0.06; if (Math.abs(y - H / 2) < L) Ln(env, W / 2 - M * 0.012, y, W / 2 + M * 0.012, y, accentOn(sc), lw, 0.7 * out); }
    const kf = inE(env, 0.7, 0.12);
    if (kf > 0.01) mainOnly(env, ctx => { ctx.translate(W / 2, 0); ctx.scale(-kf, 1); ctx.translate(-W / 2, 0); env.draw(Object.assign({}, it, copyStyle(env, Pm.copy, it.size, kf * out), { ghost: false })); });
    return J.mainDraw(env, it);
  },
});

/* ================================================================== 5 xdUpSide — 縦横交互
   every other glyph lies on its side; half-way through the cut the two groups trade places with a quarter turn */
reg('xdUpSide', {
  name: '縦横交互', en: 'Upright Sideways', tags: ['graphic', 'pop', 'glitch'], ae: 'mixed', w: 0.6, fits: n => n >= 2 && n <= 16,
  plan(rng, cut, st) { return { font: rng.pick(fontsOf(st, ['display'])), mode: rng.pick(['alt', 'alt', 'pairs']), sgn: rng.pick([1, -1]), marks: rng.chance(0.7), swap: rng.chance(0.55) }; },
  render(env) {
    const { W, H, sc, Pm, M, port, txt, out, lw, cut, lt } = base(env);
    const L = layRows(txt, Pm.font, W * 0.84, H * 0.62, { mono: 1.12, lead: 1.3, maxR: port ? 4 : 2, cap: M * 0.26 }), size = L.size;
    const tw = Pm.swap && cut.dur > 1.8 ? E.inOutCubic(clamp((lt - cut.dur * 0.5) / 0.45)) : 0, acc = accentOn(sc);
    let bb = null;
    for (const g of L.g) {
      const side = Pm.mode === 'alt' ? g.i % 2 === 1 : (g.i >> 1) % 2 === 1, f = side ? 1 - tw : tw;
      const x = W / 2 + g.ex * size, y = H / 2 + g.ey * size;
      if (Pm.marks) {
        const e = stg(env, g.i, 0.04, 0.35) * out, d = size * 0.6, h = size * 0.26;
        Ln(env, x - h, y + d, x + h, y + d, acc, lw * 2, e * (1 - f));
        Ln(env, x - Pm.sgn * d, y - h, x - Pm.sgn * d, y + h, acc, lw * 2, e * f);
      }
      bb = U(bb, put(env, g, L.n, { font: Pm.font, size, sx: sqz(g.t), x, y, rot: 90 * Pm.sgn * f }));
    }
    return bb;
  },
});

/* ================================================================== 6 xdPivotFan — 回転コピー
   outlined copies of the line swing open around a pivot at the end of the solid line, and keep opening slowly */
reg('xdPivotFan', {
  name: '回転コピー', en: 'Pivot Fan', tags: ['graphic', 'pop', 'emotional'], ae: 'stack', w: 1, emph: 1.2, fits: n => n >= 1 && n <= 14,
  plan(rng, cut, st) { return { font: rng.pick(fontsOf(st, ['display', 'serif'])), dir: rng.pick(['up', 'down', 'both']), K: rng.int(4, 6), step: rng.range(6.5, 10), pv: rng.pick(['l', 'l', 'r']), style: rng.pick(['outline', 'outline', 'dim']) }; },
  render(env) {
    const { W, H, sc, Pm, M, port, txt, out, lw, lt } = base(env);
    const fb = fitBox(txt, Pm.font, W * (port ? 0.76 : 0.6), H * 0.26, { lead: 1.15, track: 0.02 }, port ? 3 : 2), size = Math.min(fb.size, M * 0.2);
    const it = { text: fb.text, font: Pm.font, size, x: W / 2, y: H / 2 + (Pm.dir === 'up' ? 1 : Pm.dir === 'down' ? -1 : 0) * H * (port ? 0.1 : 0.15), lead: 1.15, track: 0.02, color: sc.fg };
    const m = J.measure(it), sp = Pm.pv === 'l' ? -1 : 1, px = W / 2 + sp * (m.w / 2 + size * 0.2), py = it.y;
    it.x -= sp * size * 0.1;
    const a = Pm.step * (0.15 + 0.85 * inE(env, 0.8)) + lt * 0.45, K = Pm.K;
    let amax = 0, amin = 0;
    for (let k = K; k >= 1; k--) {
      const up = Pm.dir === 'up' ? 1 : Pm.dir === 'down' ? -1 : (k % 2 ? 1 : -1), mag = Pm.dir === 'both' ? Math.ceil(k / 2) : k;
      const ang = up * mag * a * sp; amax = Math.max(amax, ang); amin = Math.min(amin, ang);
      const al = (0.85 - 0.11 * mag) * inC(env, 0.4, 0.05 * mag) * out;
      if (al > 0.01) mainOnly(env, ctx => { ctx.translate(px, py); ctx.rotate(ang * DEG); ctx.translate(-px, -py); env.draw(Object.assign({}, it, copyStyle(env, Pm.style, size, al), { ghost: false })); });
    }
    const base0 = sp < 0 ? 0 : 180;
    if (amax - amin > 0.5) env.arc(px, py, size * 0.55, base0 + amin, base0 + amax, accentOn(sc), lw * 1.5, 0.8 * out, false);
    disc(env, px, py, size * 0.05 * inE(env, 0.3), accentOn(sc), out);
    return J.mainDraw(env, it);
  },
});

/* ================================================================== 7 xdDrum — 回転ドラム
   the line sits on the face of a slowly rolling drum; flattened copies curve away above and below */
reg('xdDrum', {
  name: '回転ドラム', en: 'Rolling Drum', tags: ['graphic', 'calm', 'editorial'], ae: 'stack', w: 1, fits: n => n >= 1 && n <= 16,
  plan(rng, cut, st) { return { font: rng.pick(fontsOf(st, ['display', 'serif'])), dir: rng.pick([1, -1]), style: rng.pick(['outline', 'dim', 'outline']), rails: rng.chance(0.75) }; },
  render(env) {
    const { W, H, sc, Pm, M, port, txt, out, lw, lt, cut } = base(env);
    const K = port ? 3 : 2, D = 27, maxP = H * (K === 2 ? 0.215 : 0.185);
    const fb = fitBox(txt, Pm.font, W * 0.76, maxP * 0.72, { lead: 1.1, track: 0.03 }, port ? 2 : 1), size = Math.min(fb.size, M * 0.2);
    const it = { text: fb.text, font: Pm.font, size, x: W / 2, y: H / 2, lead: 1.1, track: 0.03, color: sc.fg };
    const m = J.measure(it), pitch = Math.min(maxP, m.h + size * 0.38), Rd = pitch / Math.sin(D * DEG);
    const drift = (lt / Math.max(0.5, cut.dur) - 0.5) * D * 0.7 * Pm.dir;
    const hw = m.w / 2 + size * 0.45;
    if (Pm.rails) {
      const e = inE(env, 0.6), top = H / 2 - Rd * 0.99 * e, bot = H / 2 + Rd * 0.99 * e;
      for (const sx of [-1, 1]) {
        Ln(env, W / 2 + sx * hw, top, W / 2 + sx * hw, bot, sc.sub, lw * 1.2, 0.6 * out);
        for (let k = -8; k <= 8; k++) { const th = (k * D / 2 + drift) * DEG; if (Math.abs(th) > 1.5) continue; const y = H / 2 + Rd * Math.sin(th) * e, c = Math.cos(th); Ln(env, W / 2 + sx * hw, y, W / 2 + sx * (hw + size * 0.12), y, sc.sub, lw * 1.2, 0.7 * c * out); }
      }
    }
    for (let k = -K; k <= K; k++) {
      if (!k) continue;
      const th = (k * D + drift) * DEG; if (Math.abs(th) > 1.5) continue;
      const c = Math.cos(th), al = Math.pow(c, 1.2) * inC(env, 0.4, Math.abs(k) * 0.07) * out;
      env.draw(Object.assign({}, it, { y: H / 2 + Rd * Math.sin(th), sy: c }, copyStyle(env, Pm.style, size, al), { ghost: false }));
    }
    const y0 = H / 2 + Rd * Math.sin(drift * DEG), e = inE(env, 0.5, 0.1);
    for (const s of [-1, 1]) Ln(env, W / 2 - hw * e, y0 + s * pitch / 2, W / 2 + hw * e, y0 + s * pitch / 2, accentOn(sc), lw * 1.5, out);
    return J.mainDraw(env, Object.assign(it, { y: y0, sy: Math.cos(drift * DEG) }));
  },
});

/* ================================================================== 8 xdSlowSpread — じわ開き
   the line starts tightly set and its letter-spacing keeps opening for the whole cut (or closes, the other way round) */
reg('xdSlowSpread', {
  name: 'じわ開き', en: 'Slow Spread', tags: ['calm', 'emotional', 'editorial'], ae: 'center', w: 1.2, fits: n => n >= 3 && n <= 16,
  plan(rng, cut, st) { return { font: rng.pick(fontsOf(st, ['display', 'serif', 'serif'])), mode: rng.pick(['open', 'open', 'close']), dots: rng.chance(0.6), arrows: rng.chance(0.7) }; },
  render(env) {
    const { W, H, sc, Pm, M, port, txt, out, lw, lt, cut } = base(env);
    const L = layRows(txt, Pm.font, W * 0.5, H * 0.6, { track: 0.03, lead: 1.4, maxR: port ? 4 : 2, cap: M * 0.19 }), size = L.size;
    const wmax = Math.max(...L.ws) * size, fmax = clamp((W * 0.87 - size) / Math.max(1, wmax - size), 1.15, 2.3);
    const u = clamp(lt / Math.max(0.6, cut.dur - cut.outDur * 0.4)), k0 = 0.35 * E.outCubic(u) + 0.65 * u, k = Pm.mode === 'close' ? 1 - k0 : k0;
    const f = lerp(1, fmax, k), acc = accentOn(sc), q = inE(env, 0.4) * out;
    let bb = null, prev = null;
    for (const g of L.g) {
      const x = W / 2 + g.ex * size * f, y = H / 2 + g.ey * size;
      if (Pm.dots && prev && prev.r === g.r) disc(env, (prev.x + x) / 2, y, Math.max(lw * 1.6, size * 0.022), sc.sub, clamp((f - 1) / (fmax - 1) * 1.6 - 0.15) * out);
      prev = { x, r: g.r };
      bb = U(bb, put(env, g, L.n, { font: Pm.font, size, x, y }));
    }
    if (Pm.arrows) L.ws.forEach((w, r) => {
      const y = H / 2 + (r - (L.R - 1) / 2) * L.lead * size, hx = (w * size - size) / 2 * f + size * 0.5 + size * 0.34, a = size * 0.11, d = Pm.mode === 'close' ? -1 : 1;
      for (const s of [-1, 1]) env.line([[W / 2 + s * (hx - a * d), y - a], [W / 2 + s * hx, y], [W / 2 + s * (hx - a * d), y + a]], acc, lw * 2, q, false);
    });
    return bb;
  },
});

/* ================================================================== 9 xdBentRoad — 曲がり道
   the glyphs follow a road that runs right, turns down and turns right again (reading never goes backwards) */
reg('xdBentRoad', {
  name: '曲がり道', en: 'Bent Road', tags: ['graphic', 'pop', 'editorial'], ae: 'mixed', w: 0.9, treat: 'safe', fits: n => n >= 3 && n <= 16,
  plan(rng, cut, st) { return { font: rng.pick(fontsOf(st, ['display'])), road: rng.pick(['dim', 'dim', 'accent']), arrow: rng.chance(0.75) }; },
  render(env) {
    const { W, H, sc, Pm, M, port, txt, out, lw } = base(env);
    const sl = cellsOf(txt), N = sl.length, n = sl.filter(c => !isSp(c)).length;
    let h1, h2, v;
    if (port) { h1 = clamp(Math.round(N * 0.2), 1, 3); h2 = N >= 5 ? clamp(Math.round(N * 0.2), 1, 3) : 0; v = N - h1 - h2; }
    else { v = clamp(Math.round(N * 0.22), 1, 4); h1 = Math.ceil((N - v) / 2); h2 = N - v - h1; }
    const cols = h1 + h2, rowsN = v + 1, cell = Math.min(W * 0.86 / cols, H * 0.8 / rowsN, M * 0.25), size = cell * 0.82;
    const ox = W / 2 - (cols - 1) * cell / 2, oy = H / 2 - (rowsN - 1) * cell / 2;
    const at = s => (s < h1 ? [s, 0] : s < h1 + v ? [h1 - 1, s - h1 + 1] : [h1 + (s - h1 - v), v]);
    const XY = c => [ox + c[0] * cell, oy + c[1] * cell];
    const pts = [[ox - cell / 2, oy], XY([h1 - 1, 0]), XY([h1 - 1, v])];
    if (h2 > 0) pts.push([ox + (cols - 1) * cell + cell / 2, oy + v * cell]); else pts[2] = [pts[2][0], pts[2][1] + cell / 2];
    const e = E.inOutCubic(clamp(env.lt / 0.6)), rc = Pm.road === 'accent' ? J.mix(sc.bg, accentOn(sc), 0.32) : dimOf(sc);
    env.polyPartial(pts, e, rc, cell * 0.96, out, false);
    if (Pm.arrow) {
      const end = pts[pts.length - 1], hz = h2 > 0, a = cell * 0.2, q = E.outBack(clamp((env.lt - 0.45) / 0.3), 1.6) * out, g = cell * 0.12;
      if (q > 0.01) polyF(env, hz ? [[end[0] + g, end[1] - a * q], [end[0] + g + a * 1.1 * q, end[1]], [end[0] + g, end[1] + a * q]] : [[end[0] - a * q, end[1] + g], [end[0], end[1] + g + a * 1.1 * q], [end[0] + a * q, end[1] + g]], accentOn(sc), 1);
      disc(env, pts[0][0] - cell * 0.14, pts[0][1], cell * 0.05 * inE(env, 0.3), accentOn(sc), out);
    }
    let bb = null, gi = 0;
    sl.forEach((c, s) => { if (isSp(c)) return; const p = XY(at(s)); bb = U(bb, J.mainDraw(env, { text: c, font: Pm.font, size, sx: sqz(c), x: p[0], y: p[1], color: sc.fg, mi: miOf(gi++, n) })); });
    return bb;
  },
});

/* ================================================================== 10 xdStaff — 五線譜
   glyphs are set like notes at different heights on a five-line staff while a playhead crosses it */
reg('xdStaff', {
  name: '五線譜', en: 'Music Staff', tags: ['calm', 'emotional', 'pop', 'editorial'], ae: 'wave', w: 1, fits: n => n >= 2 && n <= 16,
  plan(rng, cut, st) { return { font: rng.pick(fontsOf(st, ['display', 'serif'])), play: rng.chance(0.75), stems: rng.chance(0.65), sig: rng.chance(0.6), ph: rng.range(0, 6) }; },
  render(env) {
    const { W, H, sc, Pm, M, port, txt, out, lw, seed, lt, cut } = base(env);
    const sl = cellsOf(txt), N = sl.length, n = sl.filter(c => !isSp(c)).length;
    const R = port ? clamp(Math.ceil(N / 4.5), 1, 4) : N > 9 ? 2 : 1, per = Math.ceil(N / R), sg = Pm.sig ? 1.5 : 0.7;
    const size = Math.min(W * 0.86 / (per * 1.2 + sg), H * 0.8 / (R * 3.5), M * 0.2), g = size / 2.5, pitch = size * 1.2;
    const sw = per * pitch + sg * size, left = W / 2 - sw / 2, rowH = size * 3.5, acc = accentOn(sc), col = subOn(sc);
    let bb = null, gi = 0;
    for (let r = 0; r < R; r++) {
      const cy = H / 2 + (r - (R - 1) / 2) * rowH, e = inE(env, 0.6, r * 0.08);
      for (let k = 0; k < 5; k++) Ln(env, left, cy + (k - 2) * g, left + sw * e, cy + (k - 2) * g, col, lw * 1.2, 0.55 * out);
      Ln(env, left, cy - 2 * g, left, cy + 2 * g, col, lw * 1.5, 0.8 * out * e);
      if (e > 0.98) { Ln(env, left + sw, cy - 2 * g, left + sw, cy + 2 * g, col, lw * (r === R - 1 ? 4 : 1.5), 0.8 * out); if (r === R - 1) Ln(env, left + sw - g * 0.45, cy - 2 * g, left + sw - g * 0.45, cy + 2 * g, col, lw * 1.2, 0.8 * out); }
      if (Pm.sig && r === 0) { const a = inC(env, 0.4, 0.15) * out; label(env, n, left + size * 0.5, cy - g, { size: g * 1.9, color: col, alpha: a, track: 0 }); label(env, 4, left + size * 0.5, cy + g, { size: g * 1.9, color: col, alpha: a, track: 0 }); }
      for (let j = 0; j < per; j++) {
        const s = r * per + j; if (s >= N) break; const c = sl[s]; if (isSp(c)) continue;
        const lv = clamp(Math.round(2.6 * Math.sin(s * 1.25 + Pm.ph) + J.rs(seed, s, 4)), -3, 3);
        const x = left + (sg - 0.1) * size + (j + 0.5) * pitch, y = cy - lv * g * 0.5;
        if (Pm.stems) { const up = lv <= 0, q = stg(env, s, 0.04, 0.35) * out, sx = x + (up ? 1 : -1) * size * 0.5; Ln(env, sx, y, sx, y + (up ? -1 : 1) * size * 0.95 * q, sc.fg, lw * 1.6, 0.7 * out); }
        bb = U(bb, J.mainDraw(env, { text: c, font: Pm.font, size, sx: sqz(c), x, y, color: sc.fg, mi: miOf(gi++, n) }));
      }
    }
    if (Pm.play) {
      const u = clamp(lt / Math.max(0.5, cut.dur)) * R, r = Math.min(R - 1, Math.floor(u)), f = u - r, cy = H / 2 + (r - (R - 1) / 2) * rowH, x = left + sw * clamp(f);
      Ln(env, x, cy - 3.2 * g, x, cy + 3.2 * g, acc, lw * 2, 0.9 * out * inC(env, 0.3));
      polyF(env, [[x - g * 0.4, cy - 3.9 * g], [x + g * 0.4, cy - 3.9 * g], [x, cy - 3.2 * g]], acc, out * inC(env, 0.3));
    }
    return bb;
  },
});

/* ================================================================== 11 xdOverlap — 重なり連鎖
   big glyphs overlap each other like chain links; a background-coloured edge keeps every glyph legible and the spacing breathes */
reg('xdOverlap', {
  name: '重なり連鎖', en: 'Overlap Chain', tags: ['graphic', 'pop', 'emotional'], ae: 'condensed', w: 1.1, emph: 1.3, treat: false, fits: n => n >= 2 && n <= 16,
  plan(rng, cut, st) { return { font: rng.pick(fontsOf(st, ['display'])), ov: rng.range(0.22, 0.32), cols: rng.pick(['alt', 'alt', 'mono', 'tri']), breathe: rng.chance(0.75), order: rng.pick(['fwd', 'fwd', 'rev']) }; },
  render(env) {
    const { W, H, sc, Pm, M, port, txt, lt } = base(env);
    const L = layRows(txt, Pm.font, W * 0.82, H * 0.6, { track: -Pm.ov, spw: 0.6, lead: 1.0, maxR: port ? 4 : 2, cap: M * 0.36 }), size = L.size;
    const f = Pm.breathe ? 1 + 0.045 * Math.sin(lt * 1.1) : 1, acc = accentOn(sc), main = env.pass === 'main';
    const colOf = i => (Pm.cols === 'mono' ? sc.fg : Pm.cols === 'alt' ? (i % 2 ? acc : sc.fg) : [sc.fg, acc, subOn(sc)][i % 3]);
    const gs = Pm.order === 'rev' ? L.g.slice().reverse() : L.g;
    let bb = null;
    for (const g of gs) bb = U(bb, put(env, g, L.n, { font: Pm.font, size, x: W / 2 + g.ex * size * f, y: H / 2 + g.ey * size, color: colOf(g.i), stroke: main ? size * 0.075 : 0, strokeColor: sc.bg, strokeUnder: true }));
    return bb;
  },
});

/* ================================================================== 12 xdCyclic — 巡回ずらし
   the line with its cyclic shifts above and below (ABCD / BCDA / CDAB …); the shifted rows step one glyph further at intervals */
reg('xdCyclic', {
  name: '巡回ずらし', en: 'Cyclic Shift', tags: ['graphic', 'glitch', 'editorial'], ae: 'tile', w: 0.9, busy: true, fits: n => n >= 3 && n <= 16,
  plan(rng, cut, st) { return { font: rng.pick(fontsOf(st, ['display', 'body'])), style: rng.pick(['dim', 'outline', 'dim']), move: rng.chance(0.75), per: rng.range(1.0, 1.6), dir: rng.pick([1, -1]), marks: rng.chance(0.7) }; },
  render(env) {
    const { W, H, sc, Pm, M, port, txt, out, lw, lt } = base(env);
    const sl = cellsOf(txt), N = sl.length, n = sl.filter(c => !isSp(c)).length;
    let R = N >= 5 ? 5 : 3, cw, chh;
    if (!port) { cw = Math.min(W * 0.86 / N, M * 0.22); chh = cw * 1.2; if (R * chh > H * 0.8) { chh = H * 0.8 / R; cw = chh / 1.2; } }
    else { chh = Math.min(H * 0.82 / N, M * 0.22); cw = chh * 1.16; if (R * cw > W * 0.86) { cw = W * 0.86 / R; chh = cw / 1.16; } }
    const size = Math.min(cw, chh) * 0.84, mid = (R - 1) / 2;
    const u = Math.max(0, lt - 0.6) / Pm.per, c = Pm.move ? Math.floor(u) + E.inOutCubic(clamp(frac(u) * 2.6 - 1.6)) : 0;
    // cell (along the line a, across the rows k) → screen
    const XY = (a, k) => (port ? [W / 2 - k * cw, H / 2 + (a - (N - 1) / 2) * chh] : [W / 2 + (a - (N - 1) / 2) * cw, H / 2 + k * chh]);
    if (env.pass === 'main') {
      for (let r = 0; r < R; r++) {
        const k = r - mid; if (!k) continue;
        const ra = (0.62 - 0.17 * (Math.abs(k) - 1)) * inC(env, 0.4, 0.08 * Math.abs(k)) * out; if (ra <= 0.01) continue;
        const o = k * (1 + c) * Pm.dir, stl = copyStyle(env, Pm.style, size, 1);
        sl.forEach((ch, s) => {
          if (isSp(ch)) return;
          const col = ((s + o) % N + N) % N, over = clamp(col - (N - 1));
          const one = (a, al) => { if (al <= 0.01) return; const p = XY(a, k); env.draw(Object.assign({ text: ch, font: Pm.font, size, sx: port ? 1 : sqz(ch), x: p[0], y: p[1], vertical: port, ghost: false }, stl, { alpha: stl.alpha * ra * al })); };
          one(col - over * 0.6, 1 - over); if (over > 0) one(-0.4 + over * 0.4, over);
        });
      }
    }
    if (Pm.marks) {
      const e = inE(env, 0.5), a0 = XY(-0.62, 0), a1 = XY(N - 0.38, 0), acc = accentOn(sc);
      for (const s of [-1, 1]) {
        if (port) Ln(env, W / 2 + s * cw * 0.52, a0[1], W / 2 + s * cw * 0.52, lerp(a0[1], a1[1], e), acc, lw * 1.6, out);
        else Ln(env, a0[0], H / 2 + s * chh * 0.5, lerp(a0[0], a1[0], e), H / 2 + s * chh * 0.5, acc, lw * 1.6, out);
      }
    }
    let bb = null, gi = 0;
    sl.forEach((ch, s) => { if (isSp(ch)) return; const p = XY(s, 0); bb = U(bb, J.mainDraw(env, { text: ch, font: Pm.font, size, sx: port ? 1 : sqz(ch), x: p[0], y: p[1], vertical: port, color: sc.fg, mi: miOf(gi++, n) })); });
    return bb;
  },
});

/* ================================================================== 13 xdKaraoke — カラオケ送り
   the line waits as an outline and fills with colour from left to right over the length of the cut, like a karaoke subtitle */
reg('xdKaraoke', {
  name: 'カラオケ送り', en: 'Karaoke Fill', tags: ['pop', 'emotional', 'calm', 'editorial'], ae: 'type', w: 1.3, fits: n => n >= 2 && n <= 16,
  plan(rng, cut, st) { return { font: rng.pick(fontsOf(st, ['display', 'display', 'serif'])), un: rng.pick(['outline', 'dim', 'outline']), bar: rng.chance(0.6), clock: rng.chance(0.6), col: rng.pick(['accent', 'accent', 'fg']) }; },
  render(env) {
    const { W, H, sc, Pm, M, port, txt, out, lw, lt, cut } = base(env);
    const o = { lead: 1.3, track: 0.03 }, fb = fitBox(txt, Pm.font, W * 0.84, H * 0.5, o, port ? 4 : 2), size = Math.min(fb.size, M * 0.3);
    const lines = fb.text.split('\n'), LN = lines.length, cnt = lines.map(l => Math.max(1, J.glyphCount(l))), total = cnt.reduce((a, b) => a + b, 0);
    const t0 = cut.inDur * 0.6, p = clamp((lt - t0) / Math.max(0.3, cut.dur - t0 - cut.outDur - 0.12)) * total;
    const acc = accentOn(sc), dim = Pm.un === 'dim', sung = Pm.col === 'accent' && acc !== sc.fg ? acc : sc.fg;
    const unCol = dim ? J.mix(sc.bg, sc.fg, 0.34) : sc.fg;
    let bb = null, at = 0, barAt = null;
    lines.forEach((l, i) => {
      const y = H / 2 + (i - (LN - 1) / 2) * size * o.lead, mk = extra => Object.assign({ text: l, font: Pm.font, size, x: W / 2, y, track: o.track, mi: i * 2 }, extra);
      const w = J.measure(mk({})).w, pl = clamp((p - at) / cnt[i]), xs = W / 2 - w / 2 - size * 0.05 + (w + size * 0.1) * pl; at += cnt[i];
      if (pl > 0 && pl < 1) barAt = [xs, y];
      const ctx = env.ctx;
      if (pl < 1) { ctx.save(); ctx.beginPath(); ctx.rect(xs, -H, W * 3, H * 3); ctx.clip(); bb = U(bb, J.mainDraw(env, mk(dim ? { color: unCol } : { color: sc.fg, fill: false, stroke: Math.max(1.5, size * 0.022), strokeColor: unCol }))); ctx.restore(); }
      if (pl > 0) { ctx.save(); ctx.beginPath(); ctx.rect(-W, -H, xs + W, H * 3); ctx.clip(); bb = U(bb, J.mainDraw(env, mk({ color: sung }))); ctx.restore(); }
    });
    if (Pm.bar && barAt) Rc(env, barAt[0] - lw * 1.5, barAt[1] - size * 0.6, lw * 3, size * 1.2, acc, out);
    if (Pm.clock) {
      const fmt = t => Math.floor(t / 60) + ':' + String(Math.floor(t % 60)).padStart(2, '0') + '.' + Math.floor(t * 10 % 10);
      label(env, fmt(Math.min(lt, cut.dur)) + ' / ' + fmt(cut.dur), W / 2, H / 2 + (LN / 2) * size * o.lead + lsz(env) * 1.6, { alpha: inC(env, 0.4, 0.1) * out, color: subOn(sc) });
    }
    return bb;
  },
});

/* ================================================================== 14 xdPassing — すれ違い
   the line is split into rows that slide slowly past each other in opposite directions for the whole cut */
reg('xdPassing', {
  name: 'すれ違い', en: 'Passing Rows', tags: ['calm', 'emotional', 'graphic', 'editorial'], ae: 'stack', w: 1.1, fits: n => n >= 2 && n <= 16,
  plan(rng, cut, st) { return { font: rng.pick(fontsOf(st, ['display', 'serif'])), travel: rng.range(0.08, 0.12), rails: rng.chance(0.75), dir: rng.pick([1, -1]), acc: rng.chance(0.35) }; },
  render(env) {
    const { W, H, sc, Pm, M, port, txt, out, lw, lt, cut } = base(env);
    const n = J.glyphCount(txt), T = Pm.travel * W;
    let lines = null, size = 0;
    for (let k = 2; k <= (port && n > 6 ? 4 : 2); k++) { const ls = linesOf(txt, k).split('\n'), s = Math.min(...ls.map(l => J.fitSize(l, Pm.font, W * 0.9 - T, H * 0.3, { track: 0.03 })), M * 0.25, H * 0.7 / (ls.length * 1.5)); if (!lines || s > size * 1.04) { lines = ls; size = s; } }
    const Rn = lines.length, pitch = size * 1.5;
    const u = clamp(lt / Math.max(0.5, cut.dur)) - 0.5, acc = accentOn(sc), e = inE(env, 0.6);
    let bb = null;
    lines.forEach((l, i) => {
      const sg = (i % 2 ? -1 : 1) * Pm.dir, y = H / 2 + (i - (Rn - 1) / 2) * pitch;
      if (Pm.rails) {
        const ry = y + size * 0.68, x0 = W * 0.05, x1 = W * 0.95, a = size * 0.07;
        Ln(env, sg > 0 ? x0 : x1, ry, sg > 0 ? lerp(x0, x1, e) : lerp(x1, x0, e), ry, subOn(sc), lw * 1.2, 0.6 * out);
        for (let k = 0; k < 4; k++) { const x = x0 + frac(k / 4 + sg * env.ltb * 0.09) * (x1 - x0), al = Math.sin(Math.PI * (x - x0) / (x1 - x0)) * e * out; if (al > 0.01) env.line([[x - sg * a, ry - a], [x, ry], [x - sg * a, ry + a]], acc, lw * 1.6, al, false); }
      }
      bb = U(bb, J.mainDraw(env, { text: l, font: Pm.font, size, x: W / 2 + sg * u * T, y, track: 0.03, color: Pm.acc && i === 1 ? acc : sc.fg, mi: i * 3 }));
    });
    return bb;
  },
});

/* ================================================================== 15 xdChecker — チェッカー
   glyphs take the light squares of a checkerboard; the other squares are solid blocks that pop in and blink */
reg('xdChecker', {
  name: 'チェッカー', en: 'Checkerboard', tags: ['graphic', 'pop', 'glitch'], ae: 'tile', w: 1, fits: n => n >= 2 && n <= 16,
  plan(rng, cut, st) { return { font: rng.pick(fontsOf(st, ['display'])), sq: rng.pick(['solid', 'solid', 'outline', 'dot']), col: rng.pick(['fg', 'accent', 'dim']), start: rng.pick([0, 0, 1]), blink: rng.chance(0.65) }; },
  render(env) {
    const { W, H, sc, Pm, M, txt, lw, lt, seed } = base(env);
    const gl = glyphsOf(txt), n = gl.length;
    let best = null;
    for (let C = 2; C <= 9; C++) for (let R = 1; R <= 9; R++) {
      const cap = Pm.start === 0 ? Math.ceil(C * R / 2) : Math.floor(C * R / 2); if (cap < n) continue;
      const cell = Math.min(W * 0.86 / C, H * 0.8 / R, M * 0.3), score = cell * (1 - 0.07 * (cap - n)) * (R === 1 ? 0.8 : 1);
      if (!best || score > best.score) best = { C, R, cell, score };
    }
    const { C, R, cell } = best, ox = W / 2 - C * cell / 2, oy = H / 2 - R * cell / 2, size = cell * 0.8;
    const pc = Pm.col === 'accent' ? accentOn(sc) : Pm.col === 'dim' ? J.mix(sc.bg, sc.fg, 0.3) : sc.fg, acc = Pm.col === 'accent' ? sc.fg : accentOn(sc);
    const sq = []; let bb = null, gi = 0;
    for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
      const x = ox + (c + 0.5) * cell, y = oy + (r + 0.5) * cell;
      if ((r + c) % 2 === Pm.start) { if (gi < n) { bb = U(bb, J.mainDraw(env, { text: gl[gi], font: Pm.font, size, sx: sqz(gl[gi]), x, y, color: sc.fg, mi: miOf(gi, n) })); gi++; } }
      else sq.push([x, y, r + c]);
    }
    const hot = Pm.blink && sq.length ? J.h(seed, Math.floor(lt / 0.55), 3) % sq.length : -1;
    sq.forEach(([x, y, d], k) => {
      const e = E.outBack(clamp((lt - d * 0.035) / 0.32), 1.5) * (1 - E.inCubic(env.pOut)), h = cell * 0.46 * e, on = k === hot && lt > 0.6, col = on ? acc : pc; if (e <= 0.01) return;
      if (Pm.sq === 'dot') disc(env, x, y, h * 0.86, col, 1);
      else if (Pm.sq === 'outline') env.rrect(x - h, y - h, h * 2, h * 2, 0, on ? col : null, 1, false, col, lw * 2);
      else Rc(env, x - h, y - h, h * 2, h * 2, col, 1);
    });
    return bb;
  },
});

/* ================================================================== 16 xdSquareWave — 矩形波
   glyphs sit on the high and low levels of a square-wave signal that keeps travelling, so they step up and down in turn */
reg('xdSquareWave', {
  name: '矩形波', en: 'Square Wave', tags: ['glitch', 'graphic', 'pop'], ae: 'wave', w: 1, fits: n => n >= 3 && n <= 16,
  plan(rng, cut, st) { return { font: rng.pick(fontsOf(st, ['display', 'mono', 'body'])), wl: rng.pick([2, 4, 4, 6]), speed: rng.range(0.1, 0.2) * rng.pick([1, -1]), line: rng.chance(0.85), amp: rng.range(0.36, 0.44), bits: rng.chance(0.6) }; },
  render(env) {
    const { W, H, sc, Pm, M, port, txt, out, lw } = base(env);
    const n0 = J.glyphCount(txt), L = layRows(txt, Pm.font, W * 0.8, H * 0.76, { mono: 1.12, spw: 1.12, lead: 2.35, maxR: port ? 4 : n0 > 10 ? 2 : 1, cap: M * 0.19 }), size = L.size;
    const sg = xc => clamp(Math.sin(TAU * (xc / Pm.wl - env.ltb * Pm.speed) + 0.4) * 6, -1, 1), acc = accentOn(sc);
    if (Pm.line) for (let r = 0; r < L.R; r++) {
      const y = H / 2 + (r - (L.R - 1) / 2) * L.lead * size, w = L.ws[r], pts = [], K = Math.min(160, Math.ceil(w / 1.12 * 10) + 10);
      for (let k = 0; k <= K; k++) { const xe = -w / 2 - 0.5 + (w + 1) * k / K; pts.push([W / 2 + xe * size, y - sg((xe + w / 2) / 1.12 - 0.5 + r * 1.7) * size * 0.15]); }
      env.polyPartial(pts, inE(env, 0.7, r * 0.08), acc, lw * 2, 0.9 * out, false);
      if (Pm.bits) { const a = inC(env, 0.4, 0.2) * out, x = W / 2 - (w / 2 + 0.85) * size; label(env, '1', x, y - Pm.amp * size, { alpha: a }); label(env, '0', x, y + Pm.amp * size, { alpha: a }); }
    }
    let bb = null;
    for (const g of L.g) { const w = L.ws[g.r], s = sg((g.ex + w / 2) / 1.12 - 0.5 + g.r * 1.7); bb = U(bb, put(env, g, L.n, { font: Pm.font, size, sx: sqz(g.t), x: W / 2 + g.ex * size, y: H / 2 + g.ey * size + s * Pm.amp * size })); }
    return bb;
  },
});

/* ================================================================== 17 xdAxisAlt — 軸振り分け
   glyphs branch off a centre axis alternately to either side (above / below, or left / right in portrait); a marker runs along the axis */
reg('xdAxisAlt', {
  name: '軸振り分け', en: 'Axis Branches', tags: ['graphic', 'editorial', 'pop'], ae: 'mixed', w: 1, fits: n => n >= 3 && n <= 16,
  plan(rng, cut, st) { return { font: rng.pick(fontsOf(st, ['display', 'serif'])), first: rng.pick([1, -1]), marker: rng.chance(0.75), nums: rng.chance(0.4) }; },
  render(env) {
    const { W, H, sc, Pm, M, port, txt, out, lw, lt, cut } = base(env);
    const sl = cellsOf(txt), N = sl.length, n = sl.filter(c => !isSp(c)).length, K = 1.0;
    const size = port ? Math.min(H * 0.84 / ((N - 1) * K + 1), W * 0.28) : Math.min(W * 0.86 / ((N - 1) * K + 1), H * 0.27, M * 0.26);
    const pitch = size * K, off = size * 0.62, acc = accentOn(sc), col = subOn(sc);
    const A = s => (s - (N - 1) / 2) * pitch, P2 = (a, d) => (port ? [W / 2 + d, H / 2 + a] : [W / 2 + a, H / 2 + d]);
    const e = inE(env, 0.7), a0 = A(-0.9), a1 = lerp(a0, A(N - 0.1), e), p0 = P2(a0, 0), p1 = P2(a1, 0);
    Ln(env, p0[0], p0[1], p1[0], p1[1], col, lw * 1.6, 0.85 * out);
    if (e > 0.9) { const h = size * 0.07, q = P2(a1 - h * 1.4, h), q2 = P2(a1 - h * 1.4, -h); env.line([q, p1, q2], col, lw * 1.6, 0.85 * out, false); }
    let bb = null, gi = 0;
    sl.forEach((c, s) => {
      if (isSp(c)) return;
      const side = Pm.first * (s % 2 ? -1 : 1), nd = P2(A(s), 0), gp = P2(A(s), side * off), st0 = P2(A(s), side * size * 0.13), q = stg(env, s, 0.04, 0.35) * out;
      Ln(env, nd[0], nd[1], lerp(nd[0], st0[0], q), lerp(nd[1], st0[1], q), col, lw * 1.2, 0.8 * out);
      disc(env, nd[0], nd[1], size * 0.035 * q, sc.fg, 1);
      if (Pm.nums) { const np = P2(A(s), -side * size * 0.17); label(env, String(gi + 1).padStart(2, '0'), np[0], np[1], { size: size * 0.11, alpha: q * 0.9 }); }
      bb = U(bb, J.mainDraw(env, { text: c, font: Pm.font, size, sx: sqz(c), x: gp[0], y: gp[1], color: sc.fg, mi: miOf(gi++, n) }));
    });
    if (Pm.marker) { const u = clamp(lt / Math.max(0.5, cut.dur)), m = P2(lerp(A(-0.5), A(N - 0.5), u), 0); ringS(env, m[0], m[1], size * 0.085, acc, lw * 2.2, inC(env, 0.3, 0.2) * out); }
    return bb;
  },
});

/* ================================================================== 18 xdPointSym — 点対称
   like a playing card: the line upright in one half and a copy turned 180° about the screen centre in the other */
reg('xdPointSym', {
  name: '回転コピー対', en: 'Half-Turn Twin', tags: ['graphic', 'editorial', 'pop', 'calm'], ae: 'stack', w: 1, fits: n => n >= 1 && n <= 16,
  plan(rng, cut, st) { return { font: rng.pick(fontsOf(st, ['display', 'serif'])), mode: rng.pick(['tb', 'tb', 'corner']), copy: rng.pick(['outline', 'dim', 'lines']), mark: rng.pick(['diamond', 'dot']) }; },
  render(env) {
    const { W, H, sc, Pm, M, port, txt, out, lw } = base(env);
    const corner = Pm.mode === 'corner', o = { lead: 1.15, track: 0.02 };
    const fb = fitBox(txt, Pm.font, W * (corner ? 0.62 : 0.8), H * (corner ? 0.3 : 0.31), o, port ? 4 : 2), size = Math.min(fb.size, M * 0.26);
    const it = { text: fb.text, font: Pm.font, size, x: W / 2, y: H / 2, lead: 1.15, track: 0.02, color: sc.fg };
    const m = J.measure(it), acc = accentOn(sc);
    if (corner) { it.align = 'left'; it.x = W * 0.07; it.y = H * 0.08 + m.h / 2; } else it.y = H / 2 - m.h / 2 - Math.max(size * 0.32, H * 0.04);
    const sw = inE(env, 0.8, 0.05), al = inC(env, 0.4, 0.05) * out;
    if (al > 0.01) mainOnly(env, ctx => { ctx.translate(W / 2, H / 2); ctx.rotate(Math.PI * sw); ctx.translate(-W / 2, -H / 2); env.draw(Object.assign({}, it, copyStyle(env, Pm.copy, size, al), { ghost: false })); });
    const e = inE(env, 0.6, 0.1), r = M * 0.016 * e;
    if (corner) { const dx = W * 0.5 - (it.x + m.w), dy = H * 0.5 - (it.y + m.h / 2), k = 0.55; Ln(env, W / 2 - dx * k * e, H / 2 - dy * k * e, W / 2 + dx * k * e, H / 2 + dy * k * e, subOn(sc), lw * 1.2, 0.6 * out); }
    else for (const s of [-1, 1]) Ln(env, W / 2 + s * r * 2.2, H / 2, W / 2 + s * (r * 2.2 + W * 0.3 * e), H / 2, subOn(sc), lw * 1.2, 0.6 * out);
    if (Pm.mark === 'dot') disc(env, W / 2, H / 2, r * 0.8, acc, out); else polyF(env, [[W / 2 - r, H / 2], [W / 2, H / 2 - r * 1.4], [W / 2 + r, H / 2], [W / 2, H / 2 + r * 1.4]], acc, out);
    return J.mainDraw(env, it);
  },
});

/* ================================================================== 19 xdWindSway — なびく字
   every glyph stands on the ground line and leans with a gust that travels along the line, like grass in the wind */
reg('xdWindSway', {
  name: 'なびく字', en: 'Wind Sway', tags: ['calm', 'emotional', 'pop'], ae: 'wave', w: 1, fits: n => n >= 2 && n <= 16,
  plan(rng, cut, st) { return { font: rng.pick(fontsOf(st, ['display', 'serif', 'serif'])), amp: rng.range(11, 18), speed: rng.range(1.2, 1.9), dir: rng.pick([1, -1]), streaks: rng.chance(0.7), ground: rng.chance(0.75) }; },
  render(env) {
    const { W, H, sc, Pm, M, port, txt, out, lw, seed } = base(env);
    const L = layRows(txt, Pm.font, W * 0.78, H * 0.58, { track: 0.07, lead: 1.5, maxR: port ? 4 : 2, cap: M * 0.26 }), size = L.size, t = env.ltb;
    const gust = 0.7 + 0.3 * Math.sin(t * 0.7 + (seed % 7));
    if (Pm.ground) L.ws.forEach((w, r) => { const y = H / 2 + (r - (L.R - 1) / 2) * L.lead * size + size * 0.56, e = inE(env, 0.6, r * 0.06), hw = (w / 2 + 0.3) * size; Ln(env, W / 2 - hw * e, y, W / 2 + hw * e, y, subOn(sc), lw * 1.4, 0.7 * out); });
    if (Pm.streaks) for (let k = 0; k < 4; k++) {
      const u = frac(t * 0.16 * (0.8 + 0.3 * J.r(seed, k, 2)) + J.r(seed, k, 1)), x = W * (Pm.dir > 0 ? -0.1 + 1.2 * u : 1.1 - 1.2 * u), y = H * (0.16 + 0.68 * J.r(seed, k, 3)), len = W * (0.05 + 0.06 * J.r(seed, k, 4));
      Ln(env, x, y, x + len, y, sc.sub, lw * 1.2, 0.4 * Math.sin(Math.PI * u) * inC(env, 0.5) * out);
    }
    let bb = null;
    for (const g of L.g) {
      const sk = Pm.dir * Pm.amp * gust * (0.3 + 0.7 * (0.5 + 0.5 * Math.sin(t * Pm.speed - Pm.dir * (g.j * 0.55) + g.r * 1.3))), tn = Math.tan(-sk * DEG);
      bb = U(bb, put(env, g, L.n, { font: Pm.font, size, x: W / 2 + g.ex * size - tn * size * 0.5, y: H / 2 + g.ey * size, skew: -sk }));
    }
    return bb;
  },
});

/* ================================================================== 20 xdSunShadow — 動く影
   the line casts a long shadow on the ground; a small sun crosses the sky during the cut and the shadow swings round with it */
reg('xdSunShadow', {
  name: '動く影', en: 'Moving Shadow', tags: ['emotional', 'calm', 'graphic'], ae: 'stack', w: 1, fits: n => n >= 1 && n <= 16,
  plan(rng, cut, st) { return { font: rng.pick(fontsOf(st, ['display', 'serif'])), dir: rng.pick([1, -1]), sun: rng.chance(0.75), style: rng.pick(['fill', 'fill', 'lines']) }; },
  render(env) {
    const { W, H, sc, Pm, M, port, txt, out, lw, lt, cut } = base(env);
    const fb = fitBox(txt, Pm.font, W * 0.7, H * 0.28, { lead: 1.12, track: 0.02 }, port ? 3 : 2), size = Math.min(fb.size, M * 0.24);
    const it = { text: fb.text, font: Pm.font, size, x: W / 2, y: H * 0.43, lead: 1.12, track: 0.02, color: sc.fg };
    const m = J.measure(it), by = it.y + m.h / 2 - size * 0.04;
    const u = clamp(lt / Math.max(0.5, cut.dur)), sh = Pm.dir * lerp(1.15, 0.3, u), len = 0.5 + 0.34 * Math.abs(sh), a = inC(env, 0.5) * out;
    const e = inE(env, 0.6), gw = Math.min(W * 0.45, m.w / 2 + size * 1.2);
    Ln(env, W / 2 - gw * e, by, W / 2 + gw * e, by, subOn(sc), lw * 1.4, 0.7 * out);
    if (a > 0.01) mainOnly(env, ctx => {
      ctx.transform(1, 0, -sh, -len, sh * by, by * (1 + len));
      env.draw(Object.assign({}, it, Pm.style === 'lines' ? { pattern: 'lines', patternColor: J.mix(sc.bg, sc.fg, 0.4), color: J.mix(sc.bg, sc.fg, 0.4) } : { color: J.mix(sc.bg, sc.fg, 0.27) }, { alpha: a, ghost: false }));
    });
    if (Pm.sun) {
      const Rs = by - H * 0.09, rx = Math.min(Rs, W * 0.42), ph = -sh * 50 * DEG, acc = accentOn(sc), sx = W / 2 + Math.sin(ph) * rx, sy = by - Math.cos(ph) * Rs, r = M * 0.02 * inE(env, 0.4, 0.1);
      for (let k = -6; k <= 6; k++) { const p2 = k * 8.5 * DEG; disc(env, W / 2 + Math.sin(p2) * rx, by - Math.cos(p2) * Rs, lw * 1.3, sc.sub, 0.45 * inC(env, 0.5, 0.03 * (k + 6)) * out); }
      disc(env, sx, sy, r, acc, out); ringS(env, sx, sy, r * 1.9, acc, lw * 1.4, 0.6 * out);
    }
    return J.mainDraw(env, it);
  },
});

/* ================================================================== 21 xdSkewSweep — 斜体の残像
   outlined copies lean further and further from the same baseline, like the afterimages of a line falling into italics */
reg('xdSkewSweep', {
  name: '斜体の残像', en: 'Skew Sweep', tags: ['graphic', 'glitch', 'pop', 'emotional'], ae: 'stack', w: 0.9, emph: 1.2, fits: n => n >= 1 && n <= 14,
  plan(rng, cut, st) { return { font: rng.pick(fontsOf(st, ['display', 'serif'])), dir: rng.pick([1, -1]), K: rng.int(4, 6), total: rng.range(36, 50), style: rng.pick(['outline', 'outline', 'dim']) }; },
  render(env) {
    const { W, H, sc, Pm, M, port, txt, out, lw, lt } = base(env);
    const fb = fitBox(txt, Pm.font, W * (port ? 0.7 : 0.6), H * 0.3, { lead: 1.15, track: 0.02 }, port ? 3 : 2), size = Math.min(fb.size, M * 0.24);
    const it = { text: fb.text, font: Pm.font, size, x: W / 2, y: H / 2, lead: 1.15, track: 0.02, color: sc.fg };
    const m = J.measure(it), by = it.y + m.h / 2 - size * 0.05;
    it.x = W / 2 - Pm.dir * Math.min(m.h * 0.3, W * 0.06);
    const a = Pm.total / Pm.K * (0.12 + 0.88 * inE(env, 0.8)) * (0.86 + 0.14 * Math.sin(lt * 0.9));
    for (let k = Pm.K; k >= 1; k--) {
      const sk = Math.tan(k * a * DEG) * Pm.dir, al = (0.9 - 0.12 * k) * inC(env, 0.4, 0.04 * k) * out;
      if (al > 0.01) mainOnly(env, ctx => { ctx.transform(1, 0, -sk, 1, sk * by, 0); env.draw(Object.assign({}, it, copyStyle(env, Pm.style, size, al), { ghost: false })); });
    }
    const e = inE(env, 0.6), hw = m.w / 2 + size * 0.3;
    Ln(env, it.x - hw * e, by + size * 0.08, it.x + hw * e, by + size * 0.08, accentOn(sc), lw * 2, out);
    return J.mainDraw(env, it);
  },
});

/* ================================================================== 22 xdStretchEcho — 縦伸びエコー
   outlined copies of the line are pulled taller and taller from the same foot (or the same middle) and breathe */
reg('xdStretchEcho', {
  name: '縦伸びエコー', en: 'Stretch Echo', tags: ['graphic', 'emotional', 'glitch'], ae: 'condensed', w: 1, emph: 1.3, fits: n => n >= 1 && n <= 16,
  plan(rng, cut, st) { return { font: rng.pick(fontsOf(st, ['display', 'serif'])), mode: rng.pick(['up', 'up', 'both']), K: rng.int(3, 4), q: rng.range(0.42, 0.58), style: rng.pick(['outline', 'outline', 'dim']) }; },
  render(env) {
    const { W, H, sc, Pm, M, port, txt, out, lt } = base(env);
    const maxSy = 1 + Pm.K * Pm.q, o = { lead: 1.08, track: 0.03 };
    const fb = fitBox(txt, Pm.font, W * 0.84, H * 0.7 / maxSy, o, port ? 3 : 1), size = Math.min(fb.size, M * 0.2);
    const it = { text: fb.text, font: Pm.font, size, x: W / 2, y: H / 2, lead: 1.08, track: 0.03, color: sc.fg };
    const m = J.measure(it), up = Pm.mode === 'up', by = H / 2 + m.h * maxSy / 2;
    for (let k = Pm.K; k >= 1; k--) {
      const sy = 1 + k * Pm.q * inE(env, 0.7, k * 0.06) * (1 + 0.06 * Math.sin(lt * 1.3 + k * 0.9)), al = (0.85 - 0.15 * k) * inC(env, 0.3, k * 0.05) * out;
      if (al > 0.01) env.draw(Object.assign({}, it, { sy, y: up ? by - m.h * sy / 2 : H / 2 }, copyStyle(env, Pm.style, size, al), { ghost: false }));
    }
    if (up) it.y = by - m.h / 2;
    return J.mainDraw(env, it);
  },
});

/* ================================================================== 23 xdColumnEcho — 縦こだま
   every glyph keeps sending small outlined echoes of itself away from the line — odd glyphs one way, even glyphs the other */
reg('xdColumnEcho', {
  name: '縦こだま', en: 'Column Echo', tags: ['graphic', 'calm', 'emotional', 'glitch'], ae: 'stack', w: 1, fits: n => n >= 2 && n <= 16,
  plan(rng, cut, st) { return { font: rng.pick(fontsOf(st, ['display', 'serif'])), speed: rng.range(0.22, 0.36), style: rng.pick(['outline', 'outline', 'dim']), mode: rng.pick(['alt', 'alt', 'pair']) }; },
  render(env) {
    const { W, H, sc, Pm, M, port, txt, out } = base(env);
    const sl = cellsOf(txt), N = sl.length, n = sl.filter(c => !isSp(c)).length, K = 3, pk = 1.08;
    const size = port ? Math.min(H * 0.82 / (N * pk), W * 0.165) : Math.min(W * 0.86 / (N * pk), H * 0.165, M * 0.2);
    const XY = (s, d) => (port ? [W / 2 + d, H / 2 + (s - (N - 1) / 2) * size * pk] : [W / 2 + (s - (N - 1) / 2) * size * pk, H / 2 + d]);
    const q = inC(env, 0.5, 0.15) * out;
    let bb = null, gi = 0;
    sl.forEach((c, s) => {
      if (isSp(c)) return;
      const i = gi++, sgn = (Pm.mode === 'alt' ? i % 2 : (i >> 1) % 2) ? 1 : -1;
      if (env.pass === 'main' && q > 0.01) for (let k = 0; k < K; k++) {
        const u = k + frac(env.ltb * Pm.speed + i * 0.37), d = size * (0.3 + 0.6 * u), al = (1 - u / K) * clamp(u * 2.2) * q; if (al <= 0.01) continue;
        const p = XY(s, sgn * d);
        env.draw(Object.assign({ text: c, font: Pm.font, size: size * (1 - 0.1 * u), sx: sqz(c), x: p[0], y: p[1], ghost: false }, copyStyle(env, Pm.style, size, al)));
      }
      const p = XY(s, 0);
      bb = U(bb, J.mainDraw(env, { text: c, font: Pm.font, size, sx: sqz(c), x: p[0], y: p[1], color: sc.fg, mi: miOf(i, n) }));
    });
    return bb;
  },
});

/* ================================================================== 24 xdSkyline — 伸び縮み
   glyphs stand on a ground line and are stretched to different heights like a skyline that keeps changing */
reg('xdSkyline', {
  name: '伸び縮み', en: 'Stretch Skyline', tags: ['pop', 'graphic', 'glitch'], ae: 'condensed', w: 1, fits: n => n >= 2 && n <= 16,
  plan(rng, cut, st) { return { font: rng.pick(fontsOf(st, ['display'])), mode: rng.pick(['wave', 'wave', 'rand']), A: rng.range(0.8, 1.25), speed: rng.range(0.8, 1.3), sx: rng.pick([0.82, 0.9, 1]), ground: rng.chance(0.8) }; },
  render(env) {
    const { W, H, sc, Pm, M, port, txt, out, lw, seed } = base(env);
    const n0 = J.glyphCount(txt), rowK = 1 + Pm.A, lead = rowK + 0.32;
    const L = layRows(txt, Pm.font, W * 0.84 / Pm.sx, H * 0.78, { track: 0.03, lead, maxR: port ? 3 : n0 > 9 ? 2 : 1, cap: M * 0.2 }), size = L.size, t = env.ltb;
    const top = H / 2 - (L.R * lead - 0.32) * size / 2;
    const lvl = g => (Pm.mode === 'wave' ? 0.5 + 0.5 * Math.sin(t * Pm.speed * 1.6 - g.i * 0.95) : 0.5 + 0.27 * Math.sin(t * Pm.speed * 1.9 + J.r(seed, g.i, 1) * 6.3) + 0.23 * Math.sin(t * Pm.speed * 1.1 + J.r(seed, g.i, 2) * 6.3));
    let bb = null;
    if (Pm.ground) L.ws.forEach((w, r) => { const y = top + r * lead * size + rowK * size + size * 0.07, e = inE(env, 0.6, r * 0.06), hw = (w * Pm.sx / 2 + 0.2) * size; Ln(env, W / 2 - hw * e, y, W / 2 + hw * e, y, accentOn(sc), lw * 2.4, out); });
    for (const g of L.g) {
      const sy = 1 + Pm.A * lvl(g), by = top + g.r * lead * size + rowK * size;
      bb = U(bb, put(env, g, L.n, { font: Pm.font, size, sx: Pm.sx, sy, x: W / 2 + g.ex * size * Pm.sx, y: by - size * sy / 2 }));
    }
    return bb;
  },
});

/* ================================================================== 25 xdSpiralEcho — 渦巻きコピー
   copies of the line turn and shrink around a pivot below it, winding into a nautilus-like spiral */
reg('xdSpiralEcho', {
  name: '渦巻きコピー', en: 'Nautilus Echo', tags: ['graphic', 'emotional', 'calm'], ae: 'stack', w: 0.9, fits: n => n >= 1 && n <= 12,
  plan(rng, cut, st) { return { font: rng.pick(fontsOf(st, ['display', 'serif'])), dir: rng.pick([1, -1]), K: rng.int(6, 8), th: rng.range(17, 24), q: rng.range(0.8, 0.85), style: rng.pick(['outline', 'outline', 'dim']) }; },
  render(env) {
    const { W, H, sc, Pm, M, port, txt, out, lw, lt } = base(env);
    const fb = fitBox(txt, Pm.font, W * (port ? 0.74 : 0.5), H * 0.2, { lead: 1.12, track: 0.02 }, port ? 3 : 2), size = Math.min(fb.size, M * 0.19);
    const it = { text: fb.text, font: Pm.font, size, x: W / 2, y: H / 2, lead: 1.12, track: 0.02, color: sc.fg };
    const m = J.measure(it), r0 = Math.max(m.h * 1.25, Math.min(H * 0.26, m.w * 0.5));
    it.y = H / 2 - r0 * 0.5; it.x = W / 2 - Pm.dir * m.w * 0.12;
    const px = it.x - Pm.dir * m.w * 0.16, py = it.y + r0;
    const open = (0.15 + 0.85 * inE(env, 0.9)) * (1 + 0.07 * Math.sin(lt * 0.8));
    for (let k = Pm.K; k >= 1; k--) {
      const al = (0.9 - 0.09 * k) * inC(env, 0.4, 0.04 * k) * out, sc2 = Math.pow(Pm.q, k);
      if (al > 0.01) mainOnly(env, ctx => { ctx.translate(px, py); ctx.rotate(Pm.dir * k * Pm.th * open * DEG); ctx.scale(sc2, sc2); ctx.translate(-px, -py); env.draw(Object.assign({}, it, copyStyle(env, Pm.style, size, al), { ghost: false })); });
    }
    disc(env, px, py, size * 0.045 * inE(env, 0.3), accentOn(sc), out);
    return J.mainDraw(env, it);
  },
});

/* ================================================================== 26 xdRipple — 波紋の字
   loosely spaced glyphs, each the centre of thin rings that keep spreading like drops on water */
reg('xdRipple', {
  name: '波紋の字', en: 'Ripple Drops', tags: ['calm', 'emotional', 'graphic'], ae: 'scatter', w: 1, fits: n => n >= 2 && n <= 16,
  plan(rng, cut, st) { return { font: rng.pick(fontsOf(st, ['serif', 'display', 'body'])), shape: rng.pick(['ring', 'ring', 'square']), sync: rng.pick(['wave', 'rand']), speed: rng.range(0.32, 0.5), K: rng.pick([2, 3]) }; },
  render(env) {
    const { W, H, sc, Pm, M, port, txt, out, lw, seed } = base(env);
    const L = layRows(txt, Pm.font, W * 0.76, H * 0.6, { mono: 1, track: 0.34, lead: 1.62, maxR: port ? 5 : 3, cap: M * 0.19 }), size = L.size;
    const q = inC(env, 0.6, 0.1) * out, col = subOn(sc);
    let bb = null;
    for (const g of L.g) {
      const x = W / 2 + g.ex * size, y = H / 2 + g.ey * size, ph = Pm.sync === 'wave' ? -g.i * 0.14 : J.r(seed, g.i, 5);
      if (q > 0.01) for (let k = 0; k < Pm.K; k++) {
        const u = frac(env.ltb * Pm.speed + k / Pm.K + ph), r = size * (0.5 + 0.62 * u), a = Math.pow(1 - u, 1.2) * clamp(u * 5) * 0.95 * q;
        if (Pm.shape === 'ring') ringS(env, x, y, r, col, lw * 2, a); else if (a > 0.003) env.rrect(x - r, y - r, r * 2, r * 2, r * 0.16, null, a, false, col, lw * 2);
      }
      bb = U(bb, put(env, g, L.n, { font: Pm.font, size, sx: sqz(g.t), x, y }));
    }
    return bb;
  },
});

/* ================================================================== 27 xdFourUp — 四面刷り
   the line printed four times in a grid — once solid, the others outlined, striped and dotted, and the fills keep swapping */
reg('xdFourUp', {
  name: '四面刷り', en: 'Four-Up Print', tags: ['pop', 'graphic', 'editorial'], ae: 'tile', w: 1, busy: true, fits: n => n >= 1 && n <= 16,
  plan(rng, cut, st) { return { font: rng.pick(fontsOf(st, ['display'])), main: rng.int(0, 3), cyc: rng.chance(0.65), cross: rng.chance(0.8), rot: rng.int(0, 3), per: rng.range(0.7, 1.1) }; },
  render(env) {
    const { W, H, sc, Pm, M, port, txt, out, lw, lt } = base(env);
    const n = J.glyphCount(txt), col1 = port && n > 4, C = col1 ? 1 : 2, R = col1 ? 4 : 2, cw = W * 0.92 / C, ch = H * 0.9 / R;
    const fb = fitBox(txt, Pm.font, cw * 0.84, ch * 0.7, { lead: 1.12, track: 0.02 }, 3), size = Math.min(fb.size, M * 0.2);
    const kinds = ['outline', 'stripes', 'dots', 'lines', 'dim'], stp = Pm.cyc ? Math.floor(Math.max(0, lt - 0.5) / Pm.per) : 0;
    if (Pm.cross) {
      const e = inE(env, 0.6), col = subOn(sc);
      for (let c = 1; c < C; c++) Ln(env, W / 2, H / 2 - H * 0.45 * e, W / 2, H / 2 + H * 0.45 * e, col, lw * 1.3, 0.7 * out);
      for (let r = 1; r < R; r++) { const y = H / 2 + (r - R / 2) * ch; Ln(env, W / 2 - W * 0.46 * e, y, W / 2 + W * 0.46 * e, y, col, lw * 1.3, 0.7 * out); }
    }
    let bb = null, k = 0;
    for (let i = 0; i < C * R; i++) {
      const x = W / 2 + ((i % C) - (C - 1) / 2) * cw, y = H / 2 + (Math.floor(i / C) - (R - 1) / 2) * ch;
      const it = { text: fb.text, font: Pm.font, size, x, y, lead: 1.12, track: 0.02, color: sc.fg };
      if (i === Pm.main % (C * R)) { bb = J.mainDraw(env, it); continue; }
      const al = inC(env, 0.35, 0.1 + k * 0.1) * out;
      if (al > 0.01) env.draw(Object.assign(it, copyStyle(env, kinds[(k + Pm.rot + stp) % kinds.length], size, al), { ghost: false }));
      k++;
    }
    return bb;
  },
});

/* ================================================================== 28 xdTrace — なぞり書き
   the solid line on top; below it outlined copies are traced stroke by stroke, glyph after glyph, during the cut */
reg('xdTrace', {
  name: 'なぞり書き', en: 'Trace Copies', tags: ['calm', 'editorial', 'emotional', 'pop'], ae: 'stack', w: 1, fits: n => n >= 1 && n <= 16,
  plan(rng, cut, st) { return { font: rng.pick(fontsOf(st, ['display', 'serif', 'serif'])), C: rng.pick([2, 2, 3]), guide: rng.chance(0.8), col: rng.pick(['fg', 'accent', 'fg']) }; },
  render(env) {
    const { W, H, sc, Pm, M, port, txt, out, lw, lt, cut } = base(env);
    const n0 = J.glyphCount(txt), o = { track: 0.06, lead: 1.2, maxR: port ? (n0 > 10 ? 3 : n0 > 5 ? 2 : 1) : 1 };
    const R0 = layRows(txt, Pm.font, W * 0.84, H, o).R, C = Math.max(1, Math.min(Pm.C, R0 >= 3 ? 1 : R0 === 2 ? 2 : 3)), gapK = 1.3;
    const L = layRows(txt, Pm.font, W * 0.84, H * 0.8 / ((C + 1) * gapK), Object.assign({ cap: M * 0.19 }, o)), size = L.size, hb = (L.R * 1.2 - 0.2) * size, pit = hb * gapK;
    const top = H / 2 - ((C + 1) * pit - (pit - hb)) / 2, tc = Pm.col === 'accent' ? accentOn(sc) : sc.fg;
    const dt = clamp((cut.dur * 0.82 - 0.35) / Math.max(1, C * L.n), 0.03, 0.16);
    let bb = null;
    for (let b = 0; b <= C; b++) {
      const cy = top + b * pit + hb / 2;
      if (Pm.guide) L.ws.forEach((w, r) => { const y = cy + (r - (L.R - 1) / 2) * 1.2 * size + size * 0.56, e = inE(env, 0.5, b * 0.08), hw = Math.max(...L.ws) / 2 * size + size * 0.2; Ln(env, W / 2 - hw * e, y, W / 2 + hw * e, y, sc.sub, lw, 0.5 * out); });
      for (const g of L.g) {
        const x = W / 2 + g.ex * size, y = cy + g.ey * size;
        if (b === 0) { bb = U(bb, put(env, g, L.n, { font: Pm.font, size, x, y })); continue; }
        if (env.pass !== 'main') continue;
        const p = clamp((lt - 0.35 - ((b - 1) * L.n + g.i) * dt) / (dt * 2.4));
        env.draw({ text: g.t, font: Pm.font, size, x, y, color: J.mix(sc.bg, sc.fg, 0.12), alpha: inC(env, 0.4, 0.1) * out, ghost: false });
        if (p > 0.002) env.draw({ text: g.t, font: Pm.font, size, x, y, fill: false, stroke: Math.max(1.6, size * 0.022), strokeColor: tc, color: tc, dash: p, alpha: out, ghost: false });
      }
    }
    return bb;
  },
});

/* ================================================================== 29 xdTide — 満ち潮
   a waving water line rises through the line during the cut; the submerged part of the glyphs takes the water colour */
reg('xdTide', {
  name: '満ち潮', en: 'Rising Tide', tags: ['emotional', 'calm', 'pop'], ae: 'center', w: 1.1, treat: 'safe', fits: n => n >= 1 && n <= 16,
  plan(rng, cut, st) { return { font: rng.pick(fontsOf(st, ['display', 'display', 'serif'])), lvl: rng.range(0.5, 0.78), col: rng.pick(['accent', 'accent', 'accent2']), speed: rng.range(1.4, 2.2) * rng.pick([1, -1]), body: rng.chance(0.8) }; },
  render(env) {
    const { W, H, sc, Pm, M, port, txt, out, lw, lt, cut } = base(env);
    const fb = fitBox(txt, Pm.font, W * 0.84, H * 0.5, { lead: 1.2, track: 0.02 }, port ? 4 : 2), size = Math.min(fb.size, M * 0.32);
    const mk = color => ({ text: fb.text, font: Pm.font, size, x: W / 2, y: H / 2, lead: 1.2, track: 0.02, color });
    const m = J.measure(mk(sc.fg)), y1 = H / 2 + m.h / 2;
    let wc = Pm.col === 'accent2' && sc.accent2 && J.contrast(sc.accent2, sc.bg) >= 2 ? sc.accent2 : accentOn(sc);
    if (wc === sc.fg) wc = J.mix(sc.fg, sc.bg, 0.45);
    const u = E.inOutSine(clamp(lt / Math.max(0.6, cut.dur * 0.85))), ys = lerp(y1 + size * 0.3, y1 - m.h * Pm.lvl, u), A = size * 0.05, t = env.ltb * Pm.speed;
    const pts = [];
    for (let k = 0; k <= 40; k++) { const x = -W * 0.05 + W * 1.1 * k / 40; pts.push([x, ys + A * Math.sin(x / W * TAU * 2.2 + t) + A * 0.45 * Math.sin(x / W * TAU * 5.1 - t * 1.6)]); }
    const q = inC(env, 0.5) * out, poly = pts.concat([[W * 1.05, H * 1.2], [-W * 0.05, H * 1.2]]);
    if (Pm.body && q > 0.01) mainOnly(env, ctx => { ctx.globalAlpha = 0.13 * q; ctx.fillStyle = wc; ctx.beginPath(); pathPoly(ctx, poly); ctx.fill(); });
    env.line(pts, wc, lw * 2, 0.85 * q, false);
    let bb = clippedOut(env, c => pathPoly(c, poly), () => J.mainDraw(env, mk(sc.fg)));
    bb = U(bb, clipped(env, c => pathPoly(c, poly), () => J.mainDraw(env, mk(wc))));
    return bb;
  },
});

/* ================================================================== 30 xdStitch — 縫い目
   a dashed thread weaves over and under the glyphs like a running stitch; the stitches keep crawling along it */
reg('xdStitch', {
  name: '縫い目', en: 'Running Stitch', tags: ['pop', 'calm', 'emotional', 'editorial'], ae: 'wave', w: 0.8, fits: n => n >= 2 && n <= 16,
  plan(rng, cut, st) { return { font: rng.pick(fontsOf(st, ['display', 'serif'])), style: rng.pick(['dash', 'dash', 'knot']), speed: rng.range(0.5, 0.9) * rng.pick([1, -1]), first: rng.pick([1, -1]), col: rng.pick(['accent', 'accent', 'sub']) }; },
  render(env) {
    const { W, H, sc, Pm, M, port, txt, out, lw } = base(env);
    const n0 = J.glyphCount(txt), pk = 1.3;
    const L = layRows(txt, Pm.font, W * 0.78, H * 0.6, { mono: pk, spw: pk, lead: 2.0, maxR: port ? 4 : n0 > 9 ? 2 : 1, cap: M * 0.19 }), size = L.size, A = size * 0.68;
    const col = Pm.col === 'accent' ? accentOn(sc) : subOn(sc), dx = size * 0.15;
    for (let r = 0; r < L.R; r++) {
      const cy = H / 2 + (r - (L.R - 1) / 2) * L.lead * size, w = L.ws[r] * size, x0 = W / 2 - w / 2 + pk * size / 2, xa = x0 - pk * size * 0.75, xb = x0 + w - pk * size * 0.25;
      const yAt = x => cy - Pm.first * A * Math.cos(Math.PI * (x - x0) / (pk * size)), e = E.inOutCubic(clamp((env.lt - r * 0.1) / 0.8)), xe = lerp(xa, xb, e);
      if (Pm.style === 'knot') {
        const pts = []; for (let x = xa; x <= xe; x += dx) pts.push([x, yAt(x)]);
        if (pts.length > 1) env.line(pts, col, lw * 1.6, 0.85 * out, false);
        for (let j = 0; j * pk * size + x0 - pk * size / 2 <= xe; j++) { const x = x0 + (j - 0.5) * pk * size; disc(env, x, cy, lw * 3, col, out); }
      } else {
        const off = frac(env.ltb * Pm.speed) * 2 * dx;
        for (let x = xa - 2 * dx + off; x < xe; x += 2 * dx) { const a = Math.max(xa, x), b = Math.min(xe, x + dx * 1.15); if (b - a > dx * 0.2) env.line([[a, yAt(a)], [(a + b) / 2, yAt((a + b) / 2)], [b, yAt(b)]], col, lw * 2.2, 0.9 * out, false); }
      }
      if (e > 0.02 && e < 1) { const s2 = (yAt(xe + 1) - yAt(xe - 1)) / 2, d = Math.hypot(1, s2); Ln(env, xe, yAt(xe), xe + size * 0.3 / d, yAt(xe) + size * 0.3 * s2 / d, sc.fg, lw * 1.6, out); }
    }
    let bb = null;
    for (const g of L.g) {
      const sgn = (Math.round(g.ex / pk + L.ws[g.r] / pk / 2 - 0.5) % 2 ? -1 : 1) * Pm.first;
      bb = U(bb, put(env, g, L.n, { font: Pm.font, size, sx: sqz(g.t), x: W / 2 + g.ex * size, y: H / 2 + g.ey * size + sgn * size * 0.07 }));
    }
    return bb;
  },
});

})();
