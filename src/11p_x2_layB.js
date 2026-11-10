/* JIZURA pack: x2layB — 追加分2 layouts B: geometric / graphic compositions (primitives, split fields, modular grids, dials) */
(() => {
'use strict';
const E = J.E;
const P = 'x2layB';
const reg = (key, def) => J.register('layout', key, def, P);

/* ------------------------------------------------------------------ helpers */
const TAU = J.TAU, DEG = J.DEG;
const slotsOf = t => [...String(t || '').trim().replace(/[\s　]+/g, ' ')];
const isSp = c => c === ' ' || c === '　';
const closeP = ch => J.isPunct(ch) && !'「『（(［【〈《“‘'.includes(ch);
/* glyph cells: closing punctuation rides with the glyph before it; ' ' marks a word gap */
const cellsOf = t => { const o = []; for (const ch of slotsOf(t)) { const l = o[o.length - 1]; if (l && !isSp(l) && closeP(ch) && [...l].length < 2) o[o.length - 1] += ch; else o.push(ch); } return o; };
const chunk = (a, per) => { const o = []; for (let i = 0; i < a.length; i += per) o.push(a.slice(i, i + per)); return o; };
/* rows of cells: Latin lyrics break between words, anything else into even runs */
const rowCells = (txt, RN) => { const all = cellsOf(txt); if (isLatinT(txt) && all.includes(' ')) return linesOf(txt.replace(/\s+/g, ' '), RN).split('\n').map(cellsOf); return chunk(all, Math.ceil(all.length / Math.max(1, Math.min(RN, all.length)))); };
const padRows = rows => { const per = Math.max(1, ...rows.map(r => r.length)); return { per, rows: rows.length, flat: rows.flatMap(r => r.concat(Array(per - r.length).fill(' '))) }; };
const fontsOf = (st, roles) => J.fontsOf(st, roles);
const monoF = env => (env.st.fonts.mono && env.st.fonts.mono[0]) || 'mono';
const inE = (env, d = 0.35, delay = 0) => E.outExpo(J.clamp((env.lt - delay) / d));
const inC = (env, d = 0.35, delay = 0) => E.outCubic(J.clamp((env.lt - delay) / d));
const outK = env => 1 - E.inCubic(env.pOut);
const hair = env => Math.max(1, Math.min(env.W, env.H) * 0.0016);
const U = J.unionBB;
const isLatinT = t => J.isLatinText(t);
/* J.splitLines, but never leave a line of punctuation only */
const splitL = (t, per) => {
  const ls = J.splitLines(String(t), Math.max(1, per)).split('\n');
  const out = [];
  for (const l of ls) { if (out.length && [...l].every(c => J.isPunct(c) || c === ' ')) out[out.length - 1] += l; else out.push(l); }
  return out.join('\n');
};
const linesOf = (t, L) => { const s = String(t || '').trim(), n = [...s].length; return L <= 1 ? s : splitL(s, Math.ceil(n / L)); };
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
const mainLines = (text, W, H, perL = 11, perP = 5) => {
  const t = String(text || '').trim(), n = J.glyphCount(t), per = W < H ? perP : perL;
  return n <= per ? t : splitL(t, Math.ceil(n / Math.ceil(n / per)));
};
/* colours */
const onCol = (sc, fill) => {
  let best = null, bv = 0;
  for (const c of [sc.bg, sc.fg, sc.ink, sc.sub]) { if (!c || c === fill) continue; const k = J.contrast(c, fill); if (k > bv) { bv = k; best = c; } }
  return bv >= 3 ? best : (J.lum(fill) > 0.45 ? '#000' : '#fff');
};
const plateCol = (sc, pref) => { for (const c of pref) if (c && J.contrast(c, sc.bg) >= 1.7) return c; return sc.fg; };
const pickPlate = (sc, k) => plateCol(sc, k === 'accent' ? [sc.accent, sc.ink, sc.fg] : k === 'accent2' ? [sc.accent2, sc.accent, sc.fg] : k === 'ink' ? [sc.ink, sc.accent, sc.fg] : [sc.fg, sc.ink]);
const accentOn = sc => (J.contrast(sc.accent, sc.bg) >= 2 ? sc.accent : sc.accent2 && J.contrast(sc.accent2, sc.bg) >= 2 ? sc.accent2 : sc.fg);
const dimOf = sc => J.mix(sc.bg, sc.fg, 0.17);
/* small drawing tools (main pass only) */
const lsz = env => J.clamp(Math.min(env.W, env.H) * 0.019, 11, 24);
const label = (env, text, x, y, o = {}) => { if ((o.alpha ?? 1) <= 0.003) return; env.draw({ text: String(text), font: o.font || monoF(env), size: o.size || lsz(env), x, y, align: o.align || 'left', track: o.track ?? 0.1, color: o.color || env.sc.sub, alpha: o.alpha ?? 1, rot: o.rot || 0, ghost: false }); };
const R = (env, x, y, w, h, c, a = 1) => { if (a > 0.003 && w > 0 && h > 0) env.rect(x, y, w, h, c, a, false); };
const Ln = (env, x0, y0, x1, y1, c, lw, a = 1) => { if (a > 0.003) env.line([[x0, y0], [x1, y1]], c, lw, a, false); };
const poly = (env, pts, c, a = 1) => { if (a > 0.003) env.poly(pts, c, a, false); };
const disc = (env, cx, cy, r, c, a = 1) => { if (a > 0.003 && r > 0) env.circle(cx, cy, r, c, null, 0, a, false); };
const ringS = (env, cx, cy, r, c, lw, a = 1) => { if (a > 0.003 && r > 0) env.circle(cx, cy, r, null, c, lw, a, false); };
const loop = (env, pts, c, lw, a = 1) => { if (a > 0.003 && pts.length > 2) env.line([...pts, pts[0], pts[1]], c, lw, a, false); };
const mainOnly = (env, fn) => { if (env.pass !== 'main') return; const ctx = env.ctx; ctx.save(); try { fn(ctx); } finally { ctx.restore(); } };
const pathPoly = (ctx, pts) => { pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); };
const pathCirc = (ctx, cx, cy, r) => { ctx.moveTo(cx + r, cy); ctx.arc(cx, cy, Math.max(0.01, r), 0, TAU); ctx.closePath(); };
/* run fn clipped to a path (all passes); pathFn must start its sub-paths with moveTo */
const clipped = (env, pathFn, fn) => { const ctx = env.ctx; ctx.save(); ctx.beginPath(); pathFn(ctx); ctx.clip(); let r; try { r = fn(); } finally { ctx.restore(); } return r; };
const clippedOut = (env, pathFn, fn) => { const ctx = env.ctx, W = env.W, H = env.H; ctx.save(); ctx.beginPath(); ctx.rect(-W * 3, -H * 3, W * 7, H * 7); pathFn(ctx); ctx.clip('evenodd'); let r; try { r = fn(); } finally { ctx.restore(); } return r; };
/* pie slice / ring segment (degrees) */
const sector = (env, cx, cy, r0, r1, a0, a1, c, a = 1) => {
  if (a <= 0.003 || a1 - a0 < 0.01 || r1 <= 0) return;
  mainOnly(env, ctx => { ctx.globalAlpha = a; ctx.fillStyle = c; ctx.beginPath(); ctx.arc(cx, cy, r1, a0 * DEG, a1 * DEG); if (r0 > 0) ctx.arc(cx, cy, r0, a1 * DEG, a0 * DEG, true); else ctx.lineTo(cx, cy); ctx.closePath(); ctx.fill(); });
};
const arcS = (env, cx, cy, r, a0, a1, c, lw, a = 1) => { if (a > 0.003 && a1 - a0 > 0.01) env.arc(cx, cy, r, a0, a1, c, lw, a, false); };
const mkBB = (x0, y0, x1, y1) => ({ x0, y0, x1, y1, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, boxes: [] });
const ptsBB = pts => { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const p of pts) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); } return mkBB(x0, y0, x1, y1); };
const xfPt = (m, x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
/* run fn inside a canvas transform (all passes) and return its bbox in design space */
const withXf = (env, m, fn) => {
  const ctx = env.ctx; ctx.save(); ctx.transform(m[0], m[1], m[2], m[3], m[4], m[5]);
  let r; try { r = fn(); } finally { ctx.restore(); }
  return r ? ptsBB([xfPt(m, r.x0, r.y0), xfPt(m, r.x1, r.y0), xfPt(m, r.x1, r.y1), xfPt(m, r.x0, r.y1)]) : r;
};
const rotM = (cx, cy, deg) => { const c = Math.cos(deg * DEG), s = Math.sin(deg * DEG); return [c, s, -s, c, cx - c * cx + s * cy, cy - s * cx - c * cy]; };
const rectPts = (cx, cy, w, h, deg = 0) => { const m = rotM(cx, cy, deg); return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(k => xfPt(m, cx + k[0] * w / 2, cy + k[1] * h / 2)); };
const ngon = (cx, cy, rx, ry, n, deg = -90) => { const o = []; for (let i = 0; i < n; i++) { const a = (deg + i * 360 / n) * DEG; o.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); } return o; };
const base = env => { const cut = env.cut; return { W: env.W, H: env.H, sc: env.sc, cut, Pm: cut.params || {}, lt: env.lt, M: Math.min(env.W, env.H), port: env.W < env.H, txt: String(cut.text || '').trim(), out: outK(env), lw: hair(env), ls: lsz(env), no: (cut.line | 0) + 1 }; };
const stg = (env, i, step = 0.05, d = 0.4) => E.outExpo(J.clamp((env.lt - i * step) / d));

/* ================================================================== 1 xbHalfDisc — 半円またぎ
   a huge disc rises over one screen edge; the lyric crosses its curved rim and reverses on it */
reg('xbHalfDisc', {
  name: '半円またぎ', en: 'Half Disc', tags: ['graphic', 'pop', 'emotional'], ae: 'center', w: 1.2, treat: 'safe', emph: 1.2, fits: n => n >= 1 && n <= 16,
  plan(rng, cut, st) { return { font: rng.pick(fontsOf(st, ['display'])), side: rng.pick(['b', 'b', 't', 'l', 'r']), col: rng.pick(['accent', 'ink', 'fg']), off: rng.range(-0.1, 0.1), ring: rng.chance(0.6) }; },
  render(env) {
    const { W, H, sc, Pm, M, txt, out, lw } = base(env);
    const lead = 1.2, fb = fitBox(txt, Pm.font, W * 0.84, H * 0.5, { lead, track: 0.02 }, 4), mt = fb.text, size = Math.min(fb.size, M * 0.32);
    const plate = pickPlate(sc, Pm.col), pon = onCol(sc, plate), q = inE(env, 0.6) * (1 - E.inExpo(env.pOut));
    const R0 = Math.max(W * 0.42, H * 0.45), horiz = Pm.side === 'b' || Pm.side === 't', sg = Pm.side === 'b' || Pm.side === 'r' ? 1 : -1;
    const cx = horiz ? W / 2 + Pm.off * W : W / 2 + sg * R0 * 0.97, cy = horiz ? H / 2 + sg * R0 * 0.97 : H / 2 + Pm.off * H, r = R0 * q;
    disc(env, cx, cy, r, plate, 1);
    if (Pm.ring) { ringS(env, cx, cy, R0 * (0.6 + 0.5 * q), sc.sub, lw * 1.5, 0.6 * out * q); ringS(env, cx, cy, R0 * (0.5 + 0.72 * q), sc.sub, lw, 0.35 * out * q); }
    const mk = color => ({ text: mt, font: Pm.font, size, x: W / 2, y: H / 2, lead, track: 0.02, color });
    let bb = clippedOut(env, c => pathCirc(c, cx, cy, r), () => J.mainDraw(env, mk(sc.fg)));
    if (r > 1) bb = U(bb, clipped(env, c => pathCirc(c, cx, cy, r), () => J.mainDraw(env, mk(pon))));
    return bb;
  },
});

/* ================================================================== 2 xbDiagSplit — 斜め二色
   the screen is cut diagonally into two colour fields; the lyric runs across the cut and swaps colour */
reg('xbDiagSplit', {
  name: '斜め二色', en: 'Diagonal Split', tags: ['graphic', 'pop', 'glitch'], ae: 'center', w: 1.2, treat: 'safe', fits: n => n >= 1 && n <= 16,
  plan(rng, cut, st) { return { font: rng.pick(fontsOf(st, ['display', 'display', 'serif'])), ang: rng.pick([-34, -22, 22, 34, 58, -58]), side: rng.pick([1, -1]), col: rng.pick(['ink', 'accent', 'fg']), line: rng.chance(0.65) }; },
  render(env) {
    const { W, H, sc, Pm, M, txt, out, lw } = base(env);
    const lead = 1.2, fb = fitBox(txt, Pm.font, W * 0.84, H * 0.5, { lead, track: 0.02 }, 4), mt = fb.text, size = Math.min(fb.size, M * 0.32);
    const plate = pickPlate(sc, Pm.col), pon = onCol(sc, plate), q = inE(env, 0.55) * (1 - E.inExpo(env.pOut));
    const a = Pm.ang * DEG, dx = Math.cos(a), dy = Math.sin(a), nx = -dy * Pm.side, ny = dx * Pm.side, L = Math.hypot(W, H);
    const o = (1 - q) * L * 0.8, c0 = [W / 2 + nx * o, H / 2 + ny * o];
    const pts = [[c0[0] - dx * L, c0[1] - dy * L], [c0[0] + dx * L, c0[1] + dy * L], [c0[0] + dx * L + nx * L * 2, c0[1] + dy * L + ny * L * 2], [c0[0] - dx * L + nx * L * 2, c0[1] - dy * L + ny * L * 2]];
    if (q > 0.001) poly(env, pts, plate, 1);
    if (Pm.line) { const g = M * 0.028, e = inE(env, 0.6, 0.15) * out; Ln(env, W / 2 - nx * g - dx * L * e, H / 2 - ny * g - dy * L * e, W / 2 - nx * g + dx * L * e, H / 2 - ny * g + dy * L * e, accentOn(sc), lw * 2.5, out); }
    const mk = color => ({ text: mt, font: Pm.font, size, x: W / 2, y: H / 2, lead, track: 0.02, color });
    let bb = clippedOut(env, c => pathPoly(c, pts), () => J.mainDraw(env, mk(sc.fg)));
    if (q > 0.001) bb = U(bb, clipped(env, c => pathPoly(c, pts), () => J.mainDraw(env, mk(pon))));
    return bb;
  },
});

/* ================================================================== 3 xbChevronChain — 矢印つなぎ
   the lyric in interlocking chevron plates, like the steps of a process arrow */
reg('xbChevronChain', {
  name: '矢印つなぎ', en: 'Chevron Chain', tags: ['graphic', 'pop'], ae: 'labels', w: 1, treat: 'safe', fits: n => n >= 1 && n <= 16,
  plan(rng, cut, st) { return { font: rng.pick(fontsOf(st, ['display', 'body'])), swap: rng.chance(0.5), second: rng.pick(['accent', 'fg', 'accent2']), tail: rng.chance(0.7) }; },
  render(env) {
    const { W, H, sc, Pm, M, port, txt, out, lw } = base(env);
    const n = J.glyphCount(txt), rowMode = port || n > 6;
    const K0 = port ? Math.min(4, Math.ceil(n / 4)) : (n <= 3 ? 1 : n <= 10 ? 2 : 3);
    const segs = linesOf(txt, K0).split('\n'), K = segs.length;
    const cA = pickPlate(sc, 'ink'), cB = pickPlate(sc, Pm.second), cols = Pm.swap ? [cB, cA] : [cA, cB];
    let hh, t, ws, size, gap = M * 0.014, wsI = null;
    const fit = (w, h) => Math.min(...segs.map(s => J.fitSize(s, Pm.font, w, h, { track: 0.03 })));
    if (rowMode) {
      hh = Math.min(H * 0.66 / K - gap, M * (K === 1 ? 0.34 : 0.26)); t = hh * 0.4; size = fit(W * 0.84 - 2 * t - hh * 0.15, hh * 0.6);
      const h2 = Math.max(size * 1.7, hh * 0.5); if (h2 < hh) { hh = h2; t = hh * 0.4; }
      wsI = segs.map(s => Math.max(W * 0.34, J.measure({ text: s, font: Pm.font, size, track: 0.03 }).w + 2 * t + hh * 0.3));
    } else {
      hh = M * 0.34; t = hh * 0.42;
      for (let k = 0; k < 2; k++) { ws = (W * 0.9 + (K - 1) * (t - gap)) / K; size = fit(ws - 2 * t - hh * 0.12, hh * 0.6); hh = J.clamp(size * 1.8, M * 0.13, M * 0.34); t = hh * 0.42; }
      ws = (W * 0.9 + (K - 1) * (t - gap)) / K;
    }
    const chev = (x0, yc, w) => [[x0, yc - hh / 2], [x0 + w - t, yc - hh / 2], [x0 + w, yc], [x0 + w - t, yc + hh / 2], [x0, yc + hh / 2], [x0 + t, yc]];
    const stepX = rowMode ? Math.min(W * 0.05, (W * 0.92 - Math.max(...wsI)) / Math.max(1, K - 1)) : 0;
    let bb = null, xe = 0, ye = H / 2;
    for (let i = 0; i < K; i++) {
      const e = stg(env, i, 0.08, 0.45), dx = -(1 - e) * W * 0.45, w = rowMode ? wsI[i] : ws;
      const x0 = rowMode ? (W - w) / 2 + (i - (K - 1) / 2) * stepX : W * 0.05 + i * (ws - t + gap);
      const yc = rowMode ? H / 2 + (i - (K - 1) / 2) * (hh + gap) : H / 2;
      const col = cols[i % 2];
      poly(env, chev(x0 + dx, yc, w), col, out * J.clamp(e * 3));
      bb = U(bb, J.mainDraw(env, { text: segs[i], font: Pm.font, size, x: x0 + w / 2 + t * 0.08, y: yc, track: 0.03, color: onCol(sc, col), mi: i }));
      xe = x0 + w; ye = yc;
    }
    if (Pm.tail) {
      const yc = ye;
      for (let k = 1; k <= 2; k++) {
        const e = inE(env, 0.4, 0.2 + k * 0.08), x = xe + k * gap * 2.2 - (1 - e) * t;
        if (x > W * 0.99) break;
        env.line([[x - t, yc - hh / 2], [x, yc], [x - t, yc + hh / 2]], k === 1 ? accentOn(sc) : sc.sub, lw * 3, e * out * (k === 1 ? 0.9 : 0.5), false);
      }
    }
    return bb;
  },
});

/* ================================================================== 4 xbTwistFrames — ねじれ枠
   nested frames, each turned a little further than the one inside it; the lyric sits level in the innermost */
reg('xbTwistFrames', {
  name: 'ねじれ枠', en: 'Twisted Frames', tags: ['graphic', 'calm', 'emotional'], ae: 'center', w: 1.1, treat: 'safe', fits: n => n >= 1 && n <= 16,
  plan(rng, cut, st) { return { font: rng.pick(fontsOf(st, ['display', 'serif'])), th: rng.range(5, 10) * rng.pick([1, -1]), n: rng.pick([5, 6, 7]), plate: rng.chance(0.35), acc: rng.int(1, 3), sq: rng.chance(0.5) }; },
  render(env) {
    const { W, H, sc, Pm, M, port, txt, out, lw } = base(env);
    const f = fitBox(txt, Pm.font, W * (port ? 0.7 : 0.6), H * (port ? 0.34 : 0.42), { lead: 1.2, track: 0.03 }, 3), size = Math.min(f.size, M * 0.22);
    const it = { text: f.text, font: Pm.font, size, x: W / 2, y: H / 2, lead: 1.2, track: 0.03, color: sc.fg };
    const m = J.measure(it); let bw = m.w + size * 0.9, bh = m.h + size * 0.8;
    if (Pm.sq) bh = Math.max(bh, Math.min(bw, M * 0.5));
    const d = M * 0.075, plate = pickPlate(sc, 'ink');
    for (let k = Pm.n; k >= 0; k--) {
      const e = stg(env, k, 0.045, 0.6), rot = k * Pm.th * (e + 0.1 * Math.sin(env.ltb * 0.8 + k * 0.5) + env.pOut * 0.7);
      const pts = rectPts(W / 2, H / 2, (bw + k * d * 2) * (0.7 + 0.3 * e), (bh + k * d * 2) * (0.7 + 0.3 * e), rot), a = out * J.clamp(e * 2);
      if (k === 0 && Pm.plate) poly(env, pts, plate, a);
      loop(env, pts, k === 0 ? sc.fg : k === Pm.acc ? accentOn(sc) : sc.sub, k === 0 ? lw * 3 : k === Pm.acc ? lw * 2.5 : lw * 1.5, a * (k === 0 || k === Pm.acc ? 1 : 0.8 - 0.5 * k / Pm.n));
    }
    if (Pm.plate) it.color = onCol(sc, plate);
    return J.mainDraw(env, it);
  },
});

/* ================================================================== 5 xbDonut — ドーナツ図
   a thick segmented chart ring (or a gauge) turns around the lyric */
reg('xbDonut', {
  name: 'ドーナツ図', en: 'Donut Chart', tags: ['graphic', 'pop', 'calm'], ae: 'circle', w: 1, fits: n => n >= 1 && n <= 16,
  plan(rng, cut, st) { return { font: rng.pick(fontsOf(st, ['display', 'serif'])), mode: rng.pick(['seg', 'gauge', 'seg']), n: rng.int(3, 5), a0: rng.range(0, 360), val: rng.range(0.55, 0.92), dir: rng.pick([1, -1]) }; },
  render(env) {
    const { W, H, sc, cut, Pm, M, txt, out, lw, ls } = base(env);
    const cx = W / 2, cy = H / 2, Ro = M * 0.455, th = M * 0.07, Ri = Ro - th;
    const f = fitBox(txt, Pm.font, Ri * 1.5, Ri * 1.12, { lead: 1.2, track: 0.02 }, 4), size = Math.min(f.size, M * 0.22);
    const e = inE(env, 0.7), plate = pickPlate(sc, 'ink'), acc = accentOn(sc);
    if (Pm.mode === 'gauge') {
      sector(env, cx, cy, Ri, Ro, 0, 360, dimOf(sc), out * inC(env, 0.3));
      const a1 = -90 + 360 * Pm.val * e * (1 - 0.06 * env.pOut) + 3 * Math.sin(env.ltb * 1.3);
      sector(env, cx, cy, Ri, Ro, -90, a1, acc, out);
      const er = a1 * DEG; disc(env, cx + Math.cos(er) * (Ro - th / 2), cy + Math.sin(er) * (Ro - th / 2), th * 0.24, onCol(sc, acc), out * e);
      label(env, String(Math.round(Pm.val * 100 * e)).padStart(3, '0') + '%', cx, cy + Ri * 0.78, { align: 'center', size: ls * 1.2, alpha: out * inC(env, 0.3, 0.2) });
    } else {
      const cols = [plate, acc, pickPlate(sc, 'accent2'), sc.sub], wts = []; let sum = 0;
      for (let i = 0; i < Pm.n; i++) { const w = 0.5 + J.r(cut.seed, i, 21); wts.push(w); sum += w; }
      let a = Pm.a0 + env.ltb * 5 * Pm.dir + (1 - e) * 120 * Pm.dir;
      for (let i = 0; i < Pm.n; i++) {
        const span = wts[i] / sum * 360, ei = stg(env, i, 0.07, 0.6);
        sector(env, cx, cy, i === 1 ? Ri - th * 0.18 : Ri, i === 1 ? Ro + th * 0.18 : Ro, a + 2, a + 2 + (span - 4) * ei, cols[i % cols.length], out * (i % cols.length === 3 ? 0.6 : 1));
        a += span;
      }
    }
    mainOnly(env, ctx => {
      ctx.globalAlpha = 0.55 * out; ctx.strokeStyle = sc.sub; ctx.lineWidth = lw * 1.5; ctx.beginPath();
      const N = 60, r0 = Ro + M * 0.014;
      for (let i = 0; i < N * e; i++) { const an = (i / N * 360 - 90) * DEG, r1 = r0 + M * (i % 5 ? 0.008 : 0.018); ctx.moveTo(cx + Math.cos(an) * r0, cy + Math.sin(an) * r0); ctx.lineTo(cx + Math.cos(an) * r1, cy + Math.sin(an) * r1); }
      ctx.stroke();
    });
    return J.mainDraw(env, { text: f.text, font: Pm.font, size, x: cx, y: cy, lead: 1.2, track: 0.02, color: sc.fg });
  },
});

/* ================================================================== 6 xbIsoStack — アイソメ積層
   each line is lettered on the front face of an extruded slab; the slabs stack in parallel projection */
reg('xbIsoStack', {
  name: 'アイソメ積層', en: 'Isometric Stack', tags: ['graphic', 'pop'], ae: 'labels', w: 1, treat: 'safe', fits: n => n >= 1 && n <= 16,
  plan(rng, cut, st) { return { font: rng.pick(fontsOf(st, ['display'])), ang: rng.pick([13, 17, 21]), shift: rng.range(0.4, 1) * rng.pick([1, -1]), second: rng.pick(['accent', 'ink', 'fg']), deep: rng.range(0.55, 0.9) }; },
  render(env) {
    const { W, H, sc, Pm, M, port, txt, out } = base(env);
    const n = J.glyphCount(txt), lines = linesOf(txt, port ? (n <= 3 ? 1 : n <= 6 ? 2 : n <= 10 ? 3 : 4) : (n <= 5 ? 1 : n <= 10 ? 2 : 3)).split('\n'), L = lines.length;
    const c = Math.cos(Pm.ang * DEG), s = Math.sin(Pm.ang * DEG);
    let size = Math.min(M * 0.22, ...lines.map(l => J.fitSize(l, Pm.font, W * 0.74 / c, M, { track: 0.03 })));
    const build = sz => {
      const h = sz * 1.42, D = sz * Pm.deep, slabs = [], all = [];
      lines.forEach((l, i) => {
        const w = J.measure({ text: l, font: Pm.font, size: sz, track: 0.03 }).w + sz * 0.8, u = (i % 2 ? 1 : -1) * sz * 0.4 * Pm.shift * (L > 1 ? 1 : 0) - w / 2;
        const p = [u * c, -u * s + (i + 1) * h], q = [p[0] + w * c, p[1] - w * s], dz = [-c * D, -s * D];
        const front = [p, q, [q[0], q[1] - h], [p[0], p[1] - h]], top = [front[3], front[2], [front[2][0] + dz[0], front[2][1] + dz[1]], [front[3][0] + dz[0], front[3][1] + dz[1]]];
        const side = [p, front[3], top[3], [p[0] + dz[0], p[1] + dz[1]]];
        slabs.push({ p, w, front, top, side }); all.push(...front, ...top, ...side);
      });
      return { h, slabs, bb: ptsBB(all) };
    };
    let B = build(size);
    const k = Math.min(1, W * 0.88 / (B.bb.x1 - B.bb.x0), H * 0.8 / (B.bb.y1 - B.bb.y0));
    if (k < 1) { size *= k; B = build(size); }
    const ox = W / 2 - B.bb.cx, oy = H / 2 - B.bb.cy, cA = pickPlate(sc, 'ink'), cB = pickPlate(sc, Pm.second);
    let bb = null;
    for (let i = L - 1; i >= 0; i--) {
      const S = B.slabs[i], e = stg(env, L - 1 - i, 0.09, 0.5), dy = -(1 - e) * H * 0.45 + oy, a = out * J.clamp(e * 4), col = i % 2 ? cB : cA;
      const mv = pts => pts.map(p => [p[0] + ox, p[1] + dy]);
      poly(env, mv(S.side), J.mix(col, sc.bg, 0.68), a); poly(env, mv(S.top), J.mix(col, sc.bg, 0.4), a); poly(env, mv(S.front), col, a);
      bb = U(bb, withXf(env, [c, -s, 0, 1, S.p[0] + ox, S.p[1] + oy], () => J.mainDraw(env, { text: lines[i], font: Pm.font, size, x: S.w / 2, y: -B.h / 2, track: 0.03, color: onCol(sc, col), mi: i })));
    }
    return bb;
  },
});

/* ================================================================== 7 xbPolyTrack — 多角形周回
   a big triangle / diamond / hexagon whose outline is a track of small running text; the lyric sits inside */
reg('xbPolyTrack', {
  name: '多角形周回', en: 'Polygon Track', tags: ['graphic', 'pop', 'glitch'], ae: 'ring', w: 0.9, fits: n => n >= 1 && n <= 16,
  plan(rng, cut, st) { return { font: rng.pick(fontsOf(st, ['display', 'serif'])), fontS: rng.pick(fontsOf(st, ['body', 'mono'])), sides: rng.pick([3, 4, 6, 6]), speed: rng.range(0.012, 0.03) * rng.pick([1, -1]), flip: rng.chance(0.5), inner: rng.chance(0.6) }; },
  render(env) {
    const { W, H, sc, Pm, M, txt, out, lw } = base(env);
    let pts, bw, bh, ty = H / 2;
    if (Pm.sides === 3) {
      const ry = H * 0.6, rx = W * 0.53, f = Pm.flip ? -1 : 1, cy = H / 2 + f * ry * 0.25;
      pts = [[W / 2, cy - f * ry], [W / 2 + rx * 0.866, cy + f * ry * 0.5], [W / 2 - rx * 0.866, cy + f * ry * 0.5]];
      if (f < 0) pts = [pts[0], pts[2], pts[1]];
      bw = rx * 0.86; bh = ry * 0.56; ty = cy + f * ry * 0.13;
    } else if (Pm.sides === 4) { pts = ngon(W / 2, H / 2, W * 0.47, H * 0.47, 4, -90); bw = W * 0.47 * 0.98; bh = H * 0.47 * 0.84; }
    else { pts = ngon(W / 2, H / 2, W * 0.47, H * 0.5, 6, 0); bw = W * 0.47 * 1.3; bh = H * 0.5 * 1.1; }
    const f = fitBox(txt, Pm.font, bw, bh, { lead: 1.2, track: 0.02 }, 4), size = Math.min(f.size, M * 0.24);
    // perimeter
    const N = pts.length, segL = [], cum = [0]; let Lp = 0;
    for (let i = 0; i < N; i++) { const a = pts[i], b = pts[(i + 1) % N], d = Math.hypot(b[0] - a[0], b[1] - a[1]); segL.push(d); Lp += d; cum.push(Lp); }
    const gs = M * 0.036, cnt = Math.min(110, Math.floor(Lp / (gs * 1.22))), pitch = Lp / cnt;
    const unit = [...(txt.replace(/\s+/g, ' ') + ' ◆ ')];
    const e = inE(env, 0.8);
    if (Pm.inner) loop(env, pts.map(p => [W / 2 + (p[0] - W / 2) * 0.86, (Pm.sides === 3 ? ty : H / 2) + (p[1] - (Pm.sides === 3 ? ty : H / 2)) * 0.86]), sc.sub, lw * 1.5, 0.5 * out * e);
    for (let i = 0; i < cnt; i++) {
      const ch = unit[i % unit.length]; if (ch === ' ') continue;
      const a = J.clamp((env.lt - i / cnt * 0.6) / 0.12) * out; if (a <= 0) continue;
      const d = (((i * pitch + env.ltb * Pm.speed * Lp) % Lp) + Lp) % Lp;
      let k = 0; while (k < N - 1 && cum[k + 1] < d) k++;
      const u = (d - cum[k]) / segL[k], A = pts[k], Bp = pts[(k + 1) % N];
      env.draw({ text: ch, font: Pm.fontS, size: ch === '◆' ? gs * 0.6 : gs, x: J.lerp(A[0], Bp[0], u), y: J.lerp(A[1], Bp[1], u), rot: Math.atan2(Bp[1] - A[1], Bp[0] - A[0]) / DEG, color: ch === '◆' ? accentOn(sc) : sc.fg, alpha: a * (ch === '◆' ? 1 : 0.85), ghost: false });
    }
    return J.mainDraw(env, { text: f.text, font: Pm.font, size, x: W / 2, y: ty, lead: 1.2, track: 0.02, color: sc.fg });
  },
});

/* ================================================================== 8 xbShapeRow — 図形並べ
   every glyph sits in its own primitive: circle, square, triangle, diamond in turn */
reg('xbShapeRow', {
  name: '図形並べ', en: 'Shape Parade', tags: ['pop', 'graphic'], ae: 'labels', w: 0.9, treat: 'safe', fits: n => n >= 1 && n <= 16,
  plan(rng, cut, st) { return { font: rng.pick(fontsOf(st, ['display'])), order: rng.int(0, 3), rot: rng.range(0, 9), fill: rng.pick(['mix', 'mix', 'solid']) }; },
  render(env) {
    const { W, H, sc, cut, Pm, M, port, txt, out, lw } = base(env);
    const n = J.glyphCount(txt), RN0 = port ? Math.ceil(n / 3) : (n <= 6 ? 1 : n <= 12 ? 2 : 3);
    const rowsT = rowCells(txt, RN0);
    const units = r => r.reduce((s, c) => s + (isSp(c) ? 0.4 : 1), 0), maxU = Math.max(...rowsT.map(units)), RN = rowsT.length;
    const cell = Math.min(W * 0.9 / maxU, H * 0.78 / RN, M * 0.38), r = cell * 0.46;
    const cA = pickPlate(sc, 'ink'), cB = pickPlate(sc, 'accent'), cC = pickPlate(sc, 'accent2');
    let bb = null, gi = 0;
    rowsT.forEach((row, ri) => {
      let x = W / 2 - units(row) * cell / 2; const y = H / 2 + (ri - (RN - 1) / 2) * cell;
      for (const ch of row) {
        if (isSp(ch)) { x += cell * 0.4; continue; }
        const i = gi++, kind = (i + Pm.order) % 4, sty = Pm.fill === 'solid' ? i % 2 : i % 3, col = sty === 0 ? cA : sty === 1 ? (i % 2 ? cB : cC === cA ? cB : cC) : null;
        const p = E.outBack(J.clamp((env.lt - i * 0.035) / 0.32), 1.5), rr = r * p, cx = x + cell / 2, wob = J.rs(cut.seed, i, 33) * Pm.rot;
        let pts = null, gs = cell * 0.5, gy = y;
        if (kind === 1) { pts = rectPts(cx, y, rr * 1.72, rr * 1.72, wob); gs = cell * 0.54; }
        else if (kind === 2) { pts = [[cx, y - rr * 1.22], [cx + rr * 1.16, y + rr * 0.86], [cx - rr * 1.16, y + rr * 0.86]]; gs = cell * 0.42; gy = y + r * 0.3; }
        else if (kind === 3) { pts = ngon(cx, y, rr * 1.08, rr * 1.08, 4, -90); gs = cell * 0.42; }
        if (p > 0) {
          if (col) { if (pts) poly(env, pts, col, out); else disc(env, cx, y, rr, col, out); }
          else if (pts) loop(env, pts, sc.fg, lw * 2.5, out); else ringS(env, cx, y, rr, sc.fg, lw * 2.5, out);
        }
        bb = U(bb, J.mainDraw(env, { text: ch, font: Pm.font, size: [...ch].length > 1 ? gs * 0.74 : gs, x: cx, y: gy, color: col ? onCol(sc, col) : sc.fg, mi: i }));
        x += cell;
      }
    });
    return bb;
  },
});

/* ================================================================== 9 xbCompGrid — 分割構成
   the screen is ruled into a few unequal cells with heavy lines; some cells are flat colour, the largest holds the lyric */
reg('xbCompGrid', {
  name: '分割構成', en: 'Composition Grid', tags: ['graphic', 'pop', 'editorial'], ae: 'center', w: 1, busy: true, fits: n => n >= 1 && n <= 16,
  plan(rng, cut, st) { return { font: rng.pick(fontsOf(st, ['display', 'serif'])), vx: rng.pick([0, 1]), hy: rng.pick([0, 1]), fills: rng.int(0, 4), fr: rng.range(0.24, 0.3), ya: rng.range(0.42, 0.66), xa: rng.range(0.5, 0.72) }; },
  render(env) {
    const { W, H, sc, Pm, M, port, txt, out } = base(env);
    const fx = port ? 0.2 : Pm.fr, fy = port ? Pm.fr * 0.85 : 0.22, T = M * 0.011;
    const xv = Pm.vx ? W * fx : W * (1 - fx), yh = Pm.hy ? H * fy : H * (1 - fy);
    const bx0 = Pm.vx ? xv : 0, bx1 = Pm.vx ? W : xv, by0 = Pm.hy ? yh : 0, by1 = Pm.hy ? H : yh;
    const cx0 = Pm.vx ? 0 : xv, cx1 = Pm.vx ? xv : W, ry0 = Pm.hy ? 0 : yh, ry1 = Pm.hy ? yh : H;
    const ya = J.lerp(by0, by1, Pm.ya), xa = J.lerp(bx0, bx1, Pm.xa);
    const yc = [0, yh, ya, H].sort((a, b) => a - b);
    const cells = [[cx0, yc[0], cx1, yc[1]], [cx0, yc[1], cx1, yc[2]], [cx0, yc[2], cx1, yc[3]], [bx0, ry0, xa, ry1], [xa, ry0, bx1, ry1]];
    const colsAll = [accentOn(sc), pickPlate(sc, 'ink'), null, pickPlate(sc, 'accent2'), null];
    cells.forEach((c, i) => {
      const col = colsAll[(i + Pm.fills) % 5]; if (!col) return;
      const e = E.outCubic(J.clamp((env.lt - 0.18 - i * 0.06) / 0.35));
      R(env, c[0], c[1], (c[2] - c[0]) * e, c[3] - c[1], col, out);
    });
    const fg = sc.fg, g = k => inE(env, 0.5, k * 0.05);
    R(env, xv - T / 2, 0, T, H * g(0), fg, out); R(env, W * (1 - g(1)), yh - T / 2, W * g(1), T, fg, out);
    R(env, cx0, ya - T / 2, (cx1 - cx0) * g(3), T, fg, out); R(env, xa - T / 2, ry0, T, (ry1 - ry0) * g(4), fg, out);
    const tx0 = Math.max(bx0 + T, W * 0.05), tx1 = Math.min(bx1 - T, W * 0.95), ty0 = Math.max(by0 + T, H * 0.05), ty1 = Math.min(by1 - T, H * 0.95);
    const f = fitBox(txt, Pm.font, (tx1 - tx0) * 0.86, (ty1 - ty0) * 0.78, { lead: 1.2, track: 0.02 }, 4), size = Math.min(f.size, M * 0.3);
    return J.mainDraw(env, { text: f.text, font: Pm.font, size, x: (tx0 + tx1) / 2, y: (ty0 + ty1) / 2, lead: 1.2, track: 0.02, color: sc.fg });
  },
});

/* ================================================================== 10 xbPrimitives — 三原形
   circle, triangle and square thrown together on one side; the lyric set flush on the other */
reg('xbPrimitives', {
  name: '三原形', en: 'Three Primitives', tags: ['graphic', 'pop', 'calm'], ae: 'center', w: 1.1, fits: n => n >= 1 && n <= 16,
  plan(rng, cut, st) { return { font: rng.pick(fontsOf(st, ['display', 'body'])), flip: rng.chance(0.4), mir: rng.chance(0.5), rot: rng.range(-24, 24), bar: rng.chance(0.7), v: rng.int(0, 2) }; },
  render(env) {
    const { W, H, sc, Pm, M, port, txt, out, lw } = base(env);
    const ms = Pm.mir ? -1 : 1, fs = Pm.flip ? -1 : 1;
    const S = port ? M * 0.3 : Math.min(M * 0.27, W * 0.15);
    const gx = port ? W / 2 + ms * W * 0.08 : (ms > 0 ? W - W * 0.05 - S * 1.35 : W * 0.05 + S * 1.35), gy = port ? H / 2 - fs * H * 0.2 : H / 2 - fs * H * 0.1;
    const cA = accentOn(sc), cB = pickPlate(sc, 'ink'), cC = pickPlate(sc, 'accent2');
    const e1 = E.outBack(J.clamp(env.lt / 0.5), 1.4), e2 = inE(env, 0.6, 0.08), e3 = inE(env, 0.6, 0.16), t = env.ltb;
    // circle
    disc(env, gx + S * 0.3 * ms, gy - S * 0.15, S * e1, [cA, cB, cA][Pm.v], out);
    // square
    const sq = rectPts(gx - S * 0.55 * ms + (1 - e2) * ms * -W * 0.3, gy + S * 0.55, S * 1.05, S * 1.05, Pm.rot * 0.4 + (1 - e2) * 60 + Math.sin(t * 0.5) * 2);
    poly(env, sq, [cB, cA, cC][Pm.v], out * J.clamp(e2 * 3));
    // triangle
    const tc = [gx + S * 0.75 * ms, gy + S * 0.7 + (1 - e3) * H * 0.4], ta = Pm.rot + t * 4;
    poly(env, ngon(tc[0], tc[1], S * 0.62, S * 0.62, 3, ta - 90), [cC === cB ? sc.fg : cC, sc.fg, cB][Pm.v], out * J.clamp(e3 * 3));
    if (Pm.bar) { const a = (Pm.rot * 0.6 - 35 * ms) * DEG, L = S * 2.3 * inE(env, 0.7, 0.2); Ln(env, gx - Math.cos(a) * L, gy - Math.sin(a) * L, gx + Math.cos(a) * L, gy + Math.sin(a) * L, sc.fg, lw * 3, out); }
    ringS(env, gx - S * 0.9 * ms, gy - S * 0.75, S * 0.22 * e3, sc.fg, lw * 3, out);
    // lyric
    const tw = port ? W * 0.86 : W * 0.85 - S * 2.7, th = port ? H * 0.3 : H * 0.5;
    const tx = port ? (Pm.mir ? W * 0.93 : W * 0.07) : (Pm.mir ? W * 0.94 : W * 0.06), tyc = port ? H / 2 + fs * H * 0.24 : H / 2 + fs * H * 0.12;
    const f = fitBox(txt, Pm.font, tw, th, { lead: 1.18, track: 0.02 }, 4), size = Math.min(f.size, M * 0.24);
    const it = { text: f.text, font: Pm.font, size, x: tx, y: tyc, align: Pm.mir ? 'right' : 'left', lead: 1.18, track: 0.02, color: sc.fg };
    const m = J.measure(it), eb = inE(env, 0.5, 0.1);
    R(env, tx - (Pm.mir ? -size * 0.22 : size * 0.22) - lw * 2, tyc - m.h / 2 * eb - size * 0.1, lw * 4, (m.h + size * 0.2) * eb, cA, out);
    return J.mainDraw(env, it);
  },
});

/* ================================================================== 11 xbArcPoster — 同心弧
   concentric arcs whose weight doubles ring by ring fill one corner; the lyric is set small and flush in the opposite one */
reg('xbArcPoster', {
  name: '同心弧', en: 'Concentric Arcs', tags: ['graphic', 'editorial', 'calm'], ae: 'center', w: 1, fits: n => n >= 1 && n <= 16,
  plan(rng, cut, st) { return { font: rng.pick(fontsOf(st, ['body', 'display', 'serif'])), corner: rng.int(0, 3), n: rng.pick([5, 6]), a0: rng.range(0, 360), col: rng.pick(['fg', 'fg', 'ink', 'accent']), acc: rng.int(0, 7), rule: rng.chance(0.7) }; },
  render(env) {
    const { W, H, sc, cut, Pm, M, port, txt, out, lw, ls, no } = base(env);
    const right = Pm.corner % 2 === 1, low = Pm.corner >= 2;            // where the arcs live
    const cx = W * (right ? 0.74 : 0.26), cy = H * (low ? 0.7 : 0.3);
    const tw = port ? W * 0.88 : W * 0.5, th = H * (port ? 0.28 : 0.36);
    const tx = port ? (right ? W * 0.06 : W * 0.94) : (right ? W * 0.06 : W * 0.94), ty0 = low ? H * 0.08 : H * 0.92 - th;
    // nearest point of the text zone to the arc centre
    const zx0 = right ? tx : tx - tw, zx1 = zx0 + tw, px = J.clamp(cx, zx0, zx1), py = J.clamp(cy, ty0, ty0 + th);
    const dist = Math.hypot(px - cx, py - cy), n = Pm.n, wMax = dist * 0.15, rMax = dist - wMax / 2 - M * 0.03;
    const col = pickPlate(sc, Pm.col), acc = accentOn(sc);
    for (let k = 0; k < n; k++) {
      const r = rMax * Math.pow(1.5, k - (n - 1)), w = wMax * Math.pow(1.6, k - (n - 1)), e = stg(env, n - 1 - k, 0.06, 0.8);
      const a0 = Pm.a0 + k * 53 + env.ltb * (k % 2 ? -1 : 1) * (7 - k * 0.8) + (1 - e) * 90, sw = (130 + 90 * J.r(cut.seed, k, 51)) * e * (1 - 0.5 * env.pOut);
      arcS(env, cx, cy, r, a0, a0 + sw, k === Pm.acc ? acc : col, w, out);
    }
    disc(env, cx, cy, rMax * Math.pow(1.5, -(n - 1)) * 0.3 * inE(env, 0.5), acc, out);
    const f = fitBox(txt, Pm.font, tw, th, { lead: 1.22, track: 0.03 }, 4), size = Math.min(f.size, M * 0.2);
    const it = { text: f.text, font: Pm.font, size, x: tx, y: ty0 + th / 2, align: right ? 'left' : 'right', lead: 1.22, track: 0.03, color: sc.fg };
    if (Pm.rule) {
      const m = J.measure(it), yr = it.y - m.h / 2 - size * 0.42, e = inE(env, 0.5, 0.1), sg = right ? 1 : -1;
      R(env, right ? tx : tx - M * 0.16 * e, yr - lw * 1.5, M * 0.16 * e, lw * 3, sc.fg, out);
      label(env, 'No.' + String(no).padStart(2, '0'), tx + sg * M * 0.18, yr, { align: right ? 'left' : 'right', alpha: out * inC(env, 0.3, 0.25) });
    }
    return J.mainDraw(env, it);
  },
});

/* ================================================================== 12 xbZiggurat — 段ピラミッド
   a stepped pyramid of solid blocks; every step carries one line */
reg('xbZiggurat', {
  name: '段ピラミッド', en: 'Step Pyramid', tags: ['graphic', 'pop'], ae: 'stack', w: 1, treat: 'safe', fits: n => n >= 1 && n <= 16,
  plan(rng, cut, st) { return { font: rng.pick(fontsOf(st, ['display'])), inv: rng.chance(0.35), alt: rng.chance(0.6), col: rng.pick(['ink', 'fg', 'accent']) }; },
  render(env) {
    const { W, H, sc, Pm, M, port, txt, out } = base(env);
    const n = J.glyphCount(txt), lines = linesOf(txt, port ? Math.min(4, Math.ceil(n / 4)) : (n <= 6 ? 1 : n <= 12 ? 2 : 3)).split('\n'), L = lines.length;
    let size = Math.min(M * 0.21, H * 0.66 / (L * 1.5 + 0.85), ...lines.map(l => J.fitSize(l, Pm.font, W * 0.74, M, { track: 0.03 })));
    const build = sz => {
      const inc = sz * 0.5, tw = lines.map(l => J.measure({ text: l, font: Pm.font, size: sz, track: 0.03 }).w + sz * 0.9), w = tw.slice();
      if (!Pm.inv) for (let i = 1; i < L; i++) w[i] = Math.max(w[i], w[i - 1] + inc * 2); else for (let i = L - 2; i >= 0; i--) w[i] = Math.max(w[i], w[i + 1] + inc * 2);
      const h = sz * 1.5, nar = Math.min(...w), wid = Math.max(...w);
      const cap = { w: Math.max(sz * 0.7, nar - inc * 2.2), h: h * 0.42, k: 'cap' }, bs = { w: wid + inc * 2, h: h * 0.28, k: 'base' };
      const mid = w.map((ww, i) => ({ w: ww, h, k: 'line', i }));
      return Pm.inv ? [bs, ...mid, cap] : [cap, ...mid, bs];
    };
    let steps = build(size); const mw = Math.max(...steps.map(s => s.w));
    if (mw > W * 0.92) { size *= W * 0.92 / mw; steps = build(size); }
    const TH = steps.reduce((s, x) => s + x.h, 0), plate = pickPlate(sc, Pm.col), p2 = J.mix(plate, sc.bg, 0.22), acc = accentOn(sc) === plate ? sc.sub : accentOn(sc);
    let y = H / 2 - TH / 2, bb = null;
    steps.forEach((s, si) => {
      const ord = Pm.inv ? si : steps.length - 1 - si, e = stg(env, ord, 0.07, 0.45);
      const col = s.k === 'cap' ? acc : (Pm.alt && s.k === 'line' && s.i % 2) ? p2 : plate;
      R(env, W / 2 - s.w / 2 * e, y, s.w * e, s.h + 0.6, col, out);
      if (s.k === 'line') bb = U(bb, J.mainDraw(env, { text: lines[s.i], font: Pm.font, size, x: W / 2, y: y + s.h / 2, track: 0.03, color: onCol(sc, col), mi: s.i }));
      y += s.h;
    });
    return bb;
  },
});

/* ================================================================== 13 xbHoneycomb — ハニカム
   glyphs in the cells of a honeycomb: offset rows of hexagons, with empty cells around */
reg('xbHoneycomb', {
  name: 'ハニカム', en: 'Honeycomb', tags: ['graphic', 'pop', 'glitch'], ae: 'labels', w: 0.8, treat: 'safe', fits: n => n >= 2 && n <= 15,
  plan(rng, cut, st) { return { font: rng.pick(fontsOf(st, ['display', 'body'])), acc: rng.int(0, 30), extra: rng.chance(0.85), col: rng.pick(['ink', 'fg']) }; },
  render(env) {
    const { W, H, sc, cut, Pm, M, port, txt, out, lw } = base(env);
    const c0 = cellsOf(txt).length, pr = padRows(rowCells(txt, port ? Math.ceil(c0 / 3) : (c0 <= 5 ? 1 : c0 <= 10 ? 2 : 3))), sl = pr.flat, n = sl.length, rows = pr.rows, per = pr.per;
    const wu = per + (rows > 1 ? 0.5 : 0), r = Math.min(W * 0.88 / (wu * 1.732), H * 0.8 / ((rows - 1) * 1.5 + 2), M * 0.19), cw = r * 1.732;
    const X0 = (W - wu * cw) / 2, Y0 = (H - ((rows - 1) * 1.5 + 2) * r) / 2 + r;
    const pos = (ri, c) => [X0 + (c + 0.5 + (((ri % 2) + 2) % 2) * 0.5) * cw, Y0 + ri * 1.5 * r];
    const plate = pickPlate(sc, Pm.col), acc = accentOn(sc) === plate ? pickPlate(sc, 'fg') : accentOn(sc);
    if (Pm.extra) for (let ri = -1; ri <= rows; ri++) for (let c = -1; c <= per; c++) {
      const idx = ri * per + c, used = ri >= 0 && ri < rows && c >= 0 && c < per && idx < n && !isSp(sl[idx]);
      if (used || J.r(cut.seed, ri + 3, c + 3, 61) < 0.35) continue;
      const [x, y] = pos(ri, c), e = inE(env, 0.5, 0.1 + J.r(cut.seed, ri + 3, c + 3, 62) * 0.3);
      if (x < r * 0.2 || x > W - r * 0.2 || y < r * 0.2 || y > H - r * 0.2) continue;
      loop(env, ngon(x, y, r * 0.9 * e, r * 0.9 * e, 6, -90), sc.sub, lw * 1.5, 0.55 * out * e);
    }
    let bb = null, gi = 0;
    for (let i = 0; i < n; i++) {
      if (isSp(sl[i])) continue;
      const ri = Math.floor(i / per), c = i % per, [x, y] = pos(ri, c), p = E.outBack(J.clamp((env.lt - gi * 0.03) / 0.32), 1.4), col = gi === Pm.acc % Math.max(1, n) ? acc : plate;
      if (p > 0) poly(env, ngon(x, y, r * 0.93 * p, r * 0.93 * p, 6, -90), col, out);
      bb = U(bb, J.mainDraw(env, { text: sl[i], font: Pm.font, size: [...sl[i]].length > 1 ? r * 0.72 : r * 1.02, x, y, color: onCol(sc, col), mi: gi }));
      gi++;
    }
    return bb;
  },
});

/* ================================================================== 14 xbShear — 平行四辺形
   each line on its own slanted slab; slabs stack flush, pushed alternately left and right */
reg('xbShear', {
  name: '平行四辺形', en: 'Slanted Slabs', tags: ['graphic', 'pop', 'glitch'], ae: 'labels', w: 1.1, treat: 'safe', fits: n => n >= 1 && n <= 16,
  plan(rng, cut, st) { return { font: rng.pick(fontsOf(st, ['display'])), k: rng.pick([0.26, 0.36, -0.26, -0.36]), cols: rng.int(0, 2), stag: rng.range(0.025, 0.06) }; },
  render(env) {
    const { W, H, sc, Pm, M, port, txt, out } = base(env);
    const n = J.glyphCount(txt), lines = linesOf(txt, port ? Math.min(4, Math.ceil(n / 4)) : (n <= 6 ? 1 : n <= 12 ? 2 : 3)).split('\n'), L = lines.length;
    const size = Math.min(M * 0.23, H * 0.66 / (L * 1.5), ...lines.map(l => J.fitSize(l, Pm.font, W * (0.7 - (L > 1 ? Pm.stag * 2 : 0)), M, { track: 0.03 })));
    const h = size * 1.5, k = Pm.k, m = [1, 0, -k, 1, k * H / 2, 0];
    const cs = [pickPlate(sc, 'ink'), accentOn(sc), pickPlate(sc, 'fg')];
    let bb = null;
    const ctx = env.ctx;
    for (let i = 0; i < L; i++) {
      const w = J.measure({ text: lines[i], font: Pm.font, size, track: 0.03 }).w + size * 1.3, sd = i % 2 ? 1 : -1;
      const xc = W / 2 + (L > 1 ? sd * W * Pm.stag : 0), yc = H / 2 + (i - (L - 1) / 2) * h, e = stg(env, i, 0.07, 0.5), col = cs[(i + Pm.cols) % 3];
      ctx.save(); ctx.transform(m[0], m[1], m[2], m[3], m[4], m[5]);
      R(env, xc - w / 2 + (1 - e) * sd * W, yc - h / 2, w, h + 0.6, col, out);
      if (L === 1) { const a2 = cs[(Pm.cols + 1) % 3], e2 = stg(env, 2, 0.07, 0.5); R(env, xc + w * 0.02 - (1 - e2) * W, yc - h / 2 - h * 0.2, w * 0.48, h * 0.2 + 0.6, a2, out); R(env, xc - w / 2 + (1 - e2) * W, yc + h / 2, w * 0.36, h * 0.2, a2, out); }
      ctx.restore();
      bb = U(bb, withXf(env, m, () => J.mainDraw(env, { text: lines[i], font: Pm.font, size, x: xc, y: yc, track: 0.03, color: onCol(sc, col), mi: i })));
    }
    return bb;
  },
});

/* ================================================================== 15 xbPatternPanel — 図形タイル
   a panel of modular tiles (quarter discs, half discs, triangles) that keep turning; the lyric sits beside it */
reg('xbPatternPanel', {
  name: '図形タイル', en: 'Tile Panel', tags: ['graphic', 'pop', 'calm'], ae: 'center', w: 1, fits: n => n >= 1 && n <= 16,
  plan(rng, cut, st) { return { font: rng.pick(fontsOf(st, ['display', 'serif'])), kind: rng.pick(['quarter', 'half', 'tri', 'mix']), side: rng.pick([0, 1]), align: rng.pick(['c', 'c', 'e']) }; },
  render(env) {
    const { W, H, sc, cut, Pm, M, port, txt, out } = base(env);
    const tile = port ? W / 5 : H / 5, cols = port ? 5 : Math.max(2, Math.round(W * 0.31 / tile)), rows = port ? Math.max(2, Math.round(H * 0.3 / tile)) : 5;
    const pw = cols * tile, ph = rows * tile, px = port ? 0 : (Pm.side ? W - pw : 0), py = port ? (Pm.side ? H - ph : 0) : 0;
    const cFg = [accentOn(sc), pickPlate(sc, 'fg'), pickPlate(sc, 'accent2')], cBg = [pickPlate(sc, 'ink'), null, dimOf(sc)];
    mainOnly(env, ctx => {
      const kinds = ['quarter', 'half', 'tri'];
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
        const s = cut.seed, e = E.outCubic(J.clamp((env.lt - (i + j) * 0.035) / 0.35)); if (e <= 0) continue;
        const kind = Pm.kind === 'mix' ? kinds[J.h(s, i, j, 71) % 3] : Pm.kind;
        let turn = J.h(s, i, j, 72) % 4;
        if (J.r(s, i, j, 73) < 0.55) { const per = 1.4 + J.r(s, i, j, 74) * 1.6, u = env.lt / per + J.r(s, i, j, 75); turn += Math.floor(u) + E.inOutCubic(J.clamp((u - Math.floor(u)) / 0.3)); }
        const bg = cBg[J.h(s, i, j, 76) % 3]; let fg = cFg[J.h(s, i, j, 77) % 3]; if (fg === bg) fg = sc.bg;
        ctx.save(); ctx.translate(px + (i + 0.5) * tile, py + (j + 0.5) * tile); ctx.globalAlpha = out;
        const t = tile * e, hf = t / 2;
        if (bg) { ctx.fillStyle = bg; ctx.fillRect(-hf, -hf, t, t); }
        ctx.beginPath(); ctx.rect(-hf, -hf, t, t); ctx.clip();
        ctx.rotate(turn * 90 * DEG); ctx.fillStyle = fg; ctx.beginPath();
        if (kind === 'quarter') { ctx.moveTo(-hf, -hf); ctx.arc(-hf, -hf, t, 0, 90 * DEG); }
        else if (kind === 'half') { ctx.moveTo(-hf, -hf); ctx.arc(0, -hf, hf, 0, 180 * DEG); }
        else { ctx.moveTo(-hf, -hf); ctx.lineTo(hf, -hf); ctx.lineTo(-hf, hf); }
        ctx.closePath(); ctx.fill(); ctx.restore();
      }
    });
    const ax0 = port ? W * 0.06 : (Pm.side ? W * 0.05 : pw + W * 0.045), ax1 = port ? W * 0.94 : (Pm.side ? W - pw - W * 0.045 : W * 0.95);
    const ay0 = port ? (Pm.side ? H * 0.06 : ph + H * 0.04) : H * 0.08, ay1 = port ? (Pm.side ? H - ph - H * 0.04 : H * 0.94) : H * 0.92;
    const f = fitBox(txt, Pm.font, (ax1 - ax0) * 0.96, (ay1 - ay0) * 0.7, { lead: 1.2, track: 0.02 }, 4), size = Math.min(f.size, M * 0.26);
    const edge = Pm.align === 'e' && !port, al = edge ? (Pm.side ? 'right' : 'left') : 'center';
    return J.mainDraw(env, { text: f.text, font: Pm.font, size, x: edge ? (Pm.side ? ax1 : ax0) : (ax0 + ax1) / 2, y: (ay0 + ay1) / 2, align: al, lead: 1.2, track: 0.02, color: sc.fg });
  },
});

/* ---- rows of glyphs that draw a silhouette (diamond / triangle) */
const DIA = { 1: [1], 2: [2], 3: [3], 4: [1, 2, 1], 5: [1, 3, 1], 6: [1, 2, 2, 1], 7: [2, 3, 2], 8: [1, 3, 3, 1], 9: [2, 5, 2], 10: [3, 4, 3], 11: [3, 5, 3], 12: [2, 4, 4, 2], 13: [1, 3, 5, 3, 1], 14: [3, 4, 4, 3], 15: [1, 4, 5, 4, 1], 16: [3, 5, 5, 3] };
const DIAW = Object.assign({}, DIA, { 6: [1, 4, 1], 9: [2, 5, 2], 12: [3, 6, 3], 14: [2, 5, 5, 2] });
const TRI = { 1: [1], 2: [2], 3: [1, 2], 4: [1, 3], 5: [2, 3], 6: [1, 2, 3], 7: [3, 4], 8: [1, 3, 4], 9: [2, 3, 4], 10: [1, 2, 3, 4], 11: [2, 4, 5], 12: [3, 4, 5], 13: [1, 3, 4, 5], 14: [2, 3, 4, 5], 15: [1, 2, 3, 4, 5], 16: [1, 2, 3, 4, 6] };
const shapeRows = (txt, table, rev) => {
  if (isLatinT(txt)) return null;
  const a = [...txt.replace(/\s+/g, '')]; let pat = table[a.length]; if (!pat) return null;
  if (rev) pat = pat.slice().reverse();
  const rows = []; let k = 0; for (const c of pat) { rows.push(a.slice(k, k + c)); k += c; }
  const bad = ch => (J.isPunct(ch) && !'「『（(［【〈《“‘'.includes(ch)) || J.isSmallKana(ch) || ch === 'ー';
  for (let i = 1; i < rows.length; i++) while (rows[i].length > 1 && bad(rows[i][0])) rows[i - 1].push(rows[i].shift());
  return rows.map(r => r.join(''));
};

/* ================================================================== 16 xbDiamond — 菱形組
   the glyphs are set in rows that swell and shrink, drawing a diamond; a diamond plate holds them */
reg('xbDiamond', {
  name: '菱形組', en: 'Diamond Setting', tags: ['graphic', 'editorial', 'calm'], ae: 'center', w: 0.9, treat: 'safe', fits: n => n >= 1 && n <= 16,
  plan(rng, cut, st) { return { font: rng.pick(fontsOf(st, ['display', 'serif'])), style: rng.pick(['plate', 'plate', 'outline']), col: rng.pick(['ink', 'accent', 'fg']), spin: rng.pick([1, -1]) }; },
  render(env) {
    const { W, H, sc, Pm, M, txt, out, lw } = base(env);
    const rows = shapeRows(txt, W > H * 1.2 ? DIAW : DIA) || fitBox(txt, Pm.font, W * 0.5, H * 0.36, { track: 0.04 }, 3).text.split('\n'), Rn = rows.length, lead = 1.16;
    const hw = rows.map(r => J.measure({ text: r, font: Pm.font, size: 100, track: 0.04 }).w / 2);
    const b0 = Rn * 100 * lead / 2 + 78, a0 = Math.max(...hw.map((w, r) => w / (1 - (Math.abs(r - (Rn - 1) / 2) * 100 * lead + 44) / b0)));
    const k = Math.min(W * 0.47 / a0, H * 0.465 / b0, M * 0.0027), size = 100 * k, a = a0 * k, b = b0 * k, cx = W / 2, cy = H / 2;
    const e = E.outBack(J.clamp(env.lt / 0.5), 1.2), rot = (1 - inE(env, 0.6)) * 45 * Pm.spin, m = rotM(cx, cy, rot);
    const dia = s => [[cx, cy - b * s], [cx + a * s, cy], [cx, cy + b * s], [cx - a * s, cy]].map(p => xfPt(m, p[0], p[1]));
    const plate = pickPlate(sc, Pm.col), solid = Pm.style === 'plate', acc = accentOn(sc);
    if (e > 0) {
      if (solid) poly(env, dia(e), plate, out); else { loop(env, dia(e), sc.fg, lw * 3, out); }
      const g = M * 0.03; loop(env, dia(e).map(p => [cx + (p[0] - cx) * (1 + g / a), cy + (p[1] - cy) * (1 + g / b)]), solid ? plate : acc, lw * 2, out * 0.8);
      const q = inE(env, 0.5, 0.25); [[a + g * 2.2, 0], [-a - g * 2.2, 0]].forEach(d => { if (cx + d[0] > g && cx + d[0] < W - g) disc(env, cx + d[0], cy, M * 0.008 * q, acc, out); });
    }
    let bb = null;
    rows.forEach((r, i) => { bb = U(bb, J.mainDraw(env, { text: r, font: Pm.font, size, x: cx, y: cy + (i - (Rn - 1) / 2) * size * lead, track: 0.04, color: solid ? onCol(sc, plate) : sc.fg, mi: i })); });
    return bb;
  },
});

/* ================================================================== 17 xbShapeLens — 図形レンズ
   the lyric is only an outline; three drifting primitives act as lenses that show it solid on their colour */
reg('xbShapeLens', {
  name: '図形レンズ', en: 'Shape Lenses', tags: ['graphic', 'pop', 'glitch'], ae: 'huge', w: 0.9, treat: 'safe', fits: n => n >= 1 && n <= 14,
  plan(rng, cut, st) { return { font: rng.pick(fontsOf(st, ['display'])), ord: rng.int(0, 5), drift: rng.range(0.5, 1), sz: rng.range(0.95, 1.2), rot: rng.range(-20, 20) }; },
  render(env) {
    const { W, H, sc, Pm, M, txt, out } = base(env);
    const fb = fitBox(txt, Pm.font, W * 0.88, H * 0.54, { lead: 1.15, track: 0.02 }, 3), size = Math.min(fb.size, M * 0.36);
    const mk = () => ({ text: fb.text, font: Pm.font, size, x: W / 2, y: H / 2, lead: 1.15, track: 0.02, color: sc.fg });
    const m = J.measure(mk()), t = env.ltb;
    let bb = J.mainDraw(env, Object.assign(mk(), { fill: false, stroke: Math.max(2.5, size * 0.03), strokeColor: sc.fg }));
    const perm = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]][Pm.ord % 6];
    const cols = [accentOn(sc), pickPlate(sc, 'ink'), pickPlate(sc, 'accent2')], fxs = [0.16, 0.5, 0.84];
    const rs = J.clamp(Math.max(m.h * 0.6, M * 0.15) * Pm.sz, M * 0.12, Math.min(M * 0.3, m.w * 0.3 + M * 0.06));
    for (let i = 0; i < 3; i++) {
      const kind = perm[i], p = E.outBack(J.clamp((env.lt - 0.05 - i * 0.07) / 0.45), 1.3) * (1 - E.inCubic(env.pOut)); if (p <= 0.01) continue;
      const x = W / 2 + (fxs[i] - 0.5) * m.w + Math.sin(t * 0.55 + i * 2.1) * M * 0.035 * Pm.drift, y = H / 2 + (i % 2 ? 1 : -1) * m.h * 0.1 + Math.cos(t * 0.45 + i * 1.3) * M * 0.025 * Pm.drift, r = rs * p;
      const pts = kind === 1 ? ngon(x, y + r * 0.12, r * 1.25, r * 1.25, 3, -90 + Pm.rot * 0.4 + t * 3) : kind === 2 ? rectPts(x, y, r * 1.7, r * 1.7, Pm.rot + t * 2) : null;
      const path = c => (pts ? pathPoly(c, pts) : pathCirc(c, x, y, r)), col = cols[i];
      if (pts) poly(env, pts, col, 1); else disc(env, x, y, r, col, 1);
      clipped(env, path, () => J.mainDraw(env, Object.assign(mk(), { color: onCol(sc, col) })));
    }
    return bb;
  },
});

/* ================================================================== 18 xbConstruct — 斜め構成
   everything hangs on one strong angle: a bleeding bar under the first line, a crossing bar, a long wedge, a ring */
reg('xbConstruct', {
  name: '斜め構成', en: 'Slant Construction', tags: ['graphic', 'pop', 'editorial'], ae: 'diag', w: 1.1, treat: 'safe', emph: 1.2, fits: n => n >= 1 && n <= 16,
  plan(rng, cut, st) { return { font: rng.pick(fontsOf(st, ['display'])), ang: rng.pick([-16, -12, 12, 16]), col: rng.pick(['ink', 'fg', 'accent']), wedge: rng.chance(0.8), circ: rng.chance(0.65), key: rng.int(0, 2) }; },
  render(env) {
    const { W, H, sc, Pm, M, port, txt, out, lw } = base(env);
    const n = J.glyphCount(txt), lines = linesOf(txt, port ? Math.min(4, Math.ceil(n / 4)) : (n <= 7 ? 1 : n <= 14 ? 2 : 3)).split('\n'), L = lines.length;
    const size = Math.min(M * 0.24, H * 0.5 / (L * 1.34), ...lines.map(l => J.fitSize(l, Pm.font, W * (port ? 0.76 : 0.7), M, { track: 0.02 })));
    const h = size * 1.34, ws = lines.map(l => J.measure({ text: l, font: Pm.font, size, track: 0.02 }).w), mw = Math.max(...ws), xL = W / 2 - mw / 2;
    const key = L > 1 ? Pm.key % L : 0, plate = pickPlate(sc, Pm.col), acc = accentOn(sc) === plate ? pickPlate(sc, 'fg') : accentOn(sc);
    const yTop = H / 2 - L * h / 2, yBot = H / 2 + L * h / 2;
    return withXf(env, rotM(W / 2, H / 2, Pm.ang), () => {
      const e0 = inE(env, 0.5), e1 = inE(env, 0.55, 0.1), e2 = inE(env, 0.6, 0.18);
      // crossing bar
      R(env, xL - size * 0.62, H / 2 - H * 1.5 * e1, size * 0.16, H * 3 * e1, sc.fg, out);
      // key plate, bleeding to the left
      const kx1 = xL + ws[key] + size * 0.4;
      R(env, -W, yTop + key * h + h * 0.02, (kx1 + W) * e0, h * 0.96, plate, out);
      if (Pm.wedge) { const ty = yBot + size * 0.3, tx = xL + mw * 0.15 + (1 - e2) * W; poly(env, [[tx, ty + size * 0.12], [W * 1.6 + (1 - e2) * W, ty - size * 0.05], [W * 1.6 + (1 - e2) * W, ty + size * 1.5]], acc, out); }
      if (Pm.circ) ringS(env, xL + mw + size * 0.2, yTop - size * 0.75, size * 0.55 * E.outBack(J.clamp((env.lt - 0.2) / 0.4), 1.5), sc.fg, lw * 5, out);
      let bb = null;
      lines.forEach((l, i) => { bb = U(bb, J.mainDraw(env, { text: l, font: Pm.font, size, x: xL, y: yTop + (i + 0.5) * h, align: 'left', track: 0.02, color: i === key ? onCol(sc, plate) : sc.fg, mi: i })); });
      return bb;
    });
  },
});

/* ================================================================== 19 xbGolden — 黄金分割
   golden-ratio squares spiral away from the lyric, which fills the largest square */
reg('xbGolden', {
  name: '黄金分割', en: 'Golden Section', tags: ['graphic', 'calm', 'editorial', 'emotional'], ae: 'center', w: 0.9, fits: n => n >= 1 && n <= 16,
  plan(rng, cut, st) { return { font: rng.pick(fontsOf(st, ['serif', 'display'])), fh: rng.chance(0.5), fv: rng.chance(0.5), fill: rng.pick([1, 2, 3]), spiral: rng.chance(0.85) }; },
  render(env) {
    const { W, H, sc, Pm, M, port, txt, out, lw } = base(env);
    const Wc = port ? H : W, Hc = port ? W : H, PHI = 1.618034, s0 = Math.min(Hc * 0.86, Wc * 0.9 / PHI);
    const fh = Pm.fh ? -1 : 1, fv = Pm.fv ? -1 : 1, tx = Pm.fh ? Wc : 0, ty = Pm.fv ? Hc : 0;
    const m = port ? [0, fh, fv, 0, ty, tx] : [fh, 0, 0, fv, tx, ty];
    const sq = []; let x = (Wc - s0 * PHI) / 2, y = (Hc - s0) / 2, w = s0 * PHI, h = s0;
    for (let k = 0; k < 7; k++) {
      const d = k % 4; let s;
      if (d === 0) { s = h; sq.push({ x, y, s, cx: x + s, cy: y + s, a: 180 }); x += s; w -= s; }
      else if (d === 1) { s = w; sq.push({ x, y, s, cx: x, cy: y + s, a: 270 }); y += s; h -= s; }
      else if (d === 2) { s = h; sq.push({ x: x + w - s, y, s, cx: x + w - s, cy: y, a: 0 }); w -= s; }
      else { s = w; sq.push({ x, y: y + h - s, s, cx: x + w, cy: y + h - s, a: 90 }); h -= s; }
    }
    const e = inE(env, 1.0), acc = accentOn(sc);
    mainOnly(env, ctx => {
      ctx.transform(m[0], m[1], m[2], m[3], m[4], m[5]);
      sq.forEach((q, k) => {
        const a = out * J.clamp((env.lt - k * 0.06) / 0.25); if (a <= 0) return;
        if (k === Pm.fill) { ctx.globalAlpha = a; ctx.fillStyle = acc; ctx.fillRect(q.x, q.y, q.s, q.s); }
        else if (k === Pm.fill + 2) { ctx.globalAlpha = a; ctx.fillStyle = pickPlate(sc, 'ink'); ctx.fillRect(q.x, q.y, q.s, q.s); }
        ctx.globalAlpha = a * 0.75; ctx.strokeStyle = sc.sub; ctx.lineWidth = lw * 1.5; ctx.strokeRect(q.x, q.y, q.s, q.s);
      });
      if (Pm.spiral) {
        ctx.globalAlpha = out; ctx.strokeStyle = sc.fg; ctx.lineWidth = lw * 2.5; ctx.beginPath();
        sq.forEach((q, k) => { const f = J.clamp(e * 7 - k); if (f > 0) ctx.arc(q.cx, q.cy, q.s, q.a * DEG, (q.a + 90 * f) * DEG); });
        ctx.stroke();
      }
    });
    const c = xfPt(m, sq[0].x + s0 / 2, sq[0].y + s0 / 2);
    const f = fitBox(txt, Pm.font, s0 * 0.86, s0 * 0.6, { lead: 1.22, track: 0.03 }, 4), size = Math.min(f.size, M * 0.24);
    return J.mainDraw(env, { text: f.text, font: Pm.font, size, x: c[0], y: c[1], lead: 1.22, track: 0.03, color: sc.fg });
  },
});

/* ================================================================== 20 xbVenn — ベン図
   two overlapping discs, one half of the lyric in each; the overlap takes a third colour */
reg('xbVenn', {
  name: 'ベン図', en: 'Venn Diagram', tags: ['graphic', 'pop', 'calm'], ae: 'circle', w: 0.9, treat: 'safe', fits: n => n >= 2 && n <= 16,
  plan(rng, cut, st) { return { font: rng.pick(fontsOf(st, ['display', 'serif'])), swap: rng.chance(0.5), second: rng.pick(['accent', 'accent', 'fg']), ol: rng.chance(0.5) }; },
  render(env) {
    const { W, H, sc, Pm, M, port, txt, out, lw } = base(env);
    const l2 = linesOf(txt, 2).split('\n'), g2 = l2.map(l => J.glyphCount(l));
    let parts = l2.length >= 2 ? [l2[0], l2.slice(1).join(isLatinT(txt) ? ' ' : '')] : [txt];
    if (!isLatinT(txt) && (l2.length !== 2 || Math.min(...g2) / Math.max(...g2) < 0.3)) {   // no usable phrase break: cut in the middle
      const a = [...txt.replace(/\s+/g, '')]; let c = Math.round(a.length / 2); while (c < a.length - 1 && (closeP(a[c]) || J.isSmallKana(a[c]) || a[c] === 'ー')) c++;
      parts = c > 0 && c < a.length ? [a.slice(0, c).join(''), a.slice(c).join('')] : [txt];
    }
    const two = parts.length === 2;
    const Rr = port ? Math.min(W * 0.42, H * 0.26) : Math.min(H * 0.42, W * 0.26), d = Rr * 0.74, cx = W / 2, cy = H / 2;
    const c1 = port ? [cx, cy - d] : [cx - d, cy], c2 = port ? [cx, cy + d] : [cx + d, cy];
    let colA = pickPlate(sc, 'ink'), colB = pickPlate(sc, Pm.second); if (colA === colB) colB = pickPlate(sc, 'fg');
    if (Pm.swap) { const t = colA; colA = colB; colB = t; }
    const e1 = E.outBack(J.clamp(env.lt / 0.5), 1.3), e2 = E.outBack(J.clamp((env.lt - 0.1) / 0.5), 1.3);
    disc(env, c1[0], c1[1], Rr * e1, colA, out);
    if (two) {
      disc(env, c2[0], c2[1], Rr * e2, colB, out);
      const lens = J.mix(colA, colB, 0.5);
      if (env.pass === 'main' && e2 > 0) clipped(env, c => pathCirc(c, c1[0], c1[1], Rr * e1), () => disc(env, c2[0], c2[1], Rr * e2, J.contrast(lens, colA) > 1.15 ? lens : sc.bg, out));
    } else ringS(env, c2[0], c2[1], Rr * e2, sc.fg, lw * 3, out);
    if (Pm.ol) { ringS(env, c1[0], c1[1], Rr * e1 + M * 0.018, sc.sub, lw * 1.5, 0.6 * out); if (two) ringS(env, c2[0], c2[1], Rr * e2 + M * 0.018, sc.sub, lw * 1.5, 0.6 * out); }
    const o = { lead: 1.18, track: 0.02 }, bw = Rr * 1.2, bh = Rr * 1.0, size = Math.min(M * 0.2, ...parts.map(p => fitBox(p, Pm.font, bw, bh, o, 3).size));
    const fs = parts.map(p => { for (let L = 1; L <= 3; L++) { const t = linesOf(p, L); if (J.fitSize(t, Pm.font, bw, bh, o) >= size * 0.995) return { text: t }; } return fitBox(p, Pm.font, bw, bh, o, 3); });
    let bb = null;
    parts.forEach((p, i) => {
      const c = i ? c2 : c1, sh = two ? Rr * 0.26 * (i ? 1 : -1) : 0;
      bb = U(bb, J.mainDraw(env, Object.assign({ text: fs[i].text, font: Pm.font, size, x: c[0] + (port ? 0 : sh), y: c[1] + (port ? sh : 0), color: onCol(sc, i ? colB : colA), mi: i * 2 }, o)));
    });
    return bb;
  },
});

/* ================================================================== 21 xbSlitDisc — 割れ円
   a disc is cut in two and the halves slide apart sideways; the lyric runs through the slit */
reg('xbSlitDisc', {
  name: '割れ円', en: 'Split Disc', tags: ['graphic', 'pop', 'emotional'], ae: 'circle', w: 1.1, fits: n => n >= 1 && n <= 16,
  plan(rng, cut, st) { return { font: rng.pick(fontsOf(st, ['display', 'serif'])), dir: rng.pick([1, -1]), cols: rng.int(0, 2), shift: rng.range(0.22, 0.5), rule: rng.chance(0.6) }; },
  render(env) {
    const { W, H, sc, Pm, M, port, txt, out, lw } = base(env);
    const fb = fitBox(txt, Pm.font, W * 0.88, H * (port ? 0.22 : 0.3), { lead: 1.15, track: 0.03 }, port ? 3 : 2), size = Math.min(fb.size, M * 0.26);
    const it = { text: fb.text, font: Pm.font, size, x: W / 2, y: H / 2, lead: 1.15, track: 0.03, color: sc.fg };
    const m = J.measure(it), gap = m.h + size * 0.5, Rr = Math.max(M * 0.16, Math.min(M * 0.42, H * 0.47 - gap / 2, W * 0.36));
    const eR = inE(env, 0.4), eG = E.inOutCubic(J.clamp((env.lt - 0.08) / 0.5)) * (1 - 0.6 * E.inCubic(env.pOut)), g = gap / 2 * eG, sh = Rr * Pm.shift * Pm.dir * eG, cx = W / 2, cy = H / 2;
    const pal = [[accentOn(sc), pickPlate(sc, 'ink')], [pickPlate(sc, 'ink'), accentOn(sc)], [pickPlate(sc, 'fg'), accentOn(sc)]][Pm.cols % 3];
    sector(env, cx - sh, cy - g, 0, Rr * eR, 180, 360, pal[0], out);
    sector(env, cx + sh, cy + g, 0, Rr * eR, 0, 180, pal[1], out);
    if (Pm.rule) { const k = Rr * 1.35 * eG; Ln(env, cx - sh - k, cy - g, cx - sh + k, cy - g, sc.sub, lw * 1.5, 0.7 * out); Ln(env, cx + sh - k, cy + g, cx + sh + k, cy + g, sc.sub, lw * 1.5, 0.7 * out); }
    return J.mainDraw(env, it);
  },
});

/* ================================================================== 22 xbDial — 文字盤
   the glyphs are the numerals of a dial; a hand sweeps from the first to the last and lights each in turn */
reg('xbDial', {
  name: '文字盤', en: 'Dial Face', tags: ['graphic', 'calm', 'pop'], ae: 'ring', w: 0.6, fits: n => n >= 3 && n <= 12,
  plan(rng, cut, st) { return { font: rng.pick(fontsOf(st, ['display', 'serif'])), ticks: rng.pick([60, 48, 72]), hub: rng.chance(0.6), inner: rng.chance(0.6) }; },
  render(env) {
    const { W, H, sc, cut, Pm, M, txt, out, lw } = base(env);
    const sl = slotsOf(txt), N = sl.length, cx = W / 2, cy = H / 2;
    const gs = Math.min(M * 0.15, TAU * M * 0.33 / N * 0.72), Rg = M * 0.44 - gs * 0.82, Ro = Rg + gs * 0.82;
    const e = inE(env, 0.7), acc = accentOn(sc);
    ringS(env, cx, cy, Ro * (0.8 + 0.2 * e), sc.fg, lw * 2.5, out * e);
    if (Pm.inner) ringS(env, cx, cy, (Rg - gs * 0.8) * e, sc.sub, lw * 1.5, 0.6 * out);
    mainOnly(env, ctx => {
      ctx.globalAlpha = 0.8 * out; ctx.strokeStyle = sc.sub; ctx.lineWidth = lw * 2; ctx.beginPath();
      const T = Pm.ticks;
      for (let i = 0; i < T * e; i++) { const a = (i / T * 360 - 90) * DEG, r1 = Ro + M * (i % (T / 12) ? 0.011 : 0.024); ctx.moveTo(cx + Math.cos(a) * (Ro + M * 0.004), cy + Math.sin(a) * (Ro + M * 0.004)); ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); }
      ctx.stroke();
    });
    const hold = Math.max(0.05, cut.dur - cut.inDur - cut.outDur), pr = E.inOutSine(J.clamp((env.lt - cut.inDur * 0.8) / hold)), pos = pr * (N - 1), cur = Math.round(pos);
    const ha = (-90 + pos * 360 / N) * DEG, hl = (Rg - gs * 0.72) * e, hw = M * 0.012, ca = Math.cos(ha), sa = Math.sin(ha);
    poly(env, [[cx - sa * hw - ca * hw * 2, cy + ca * hw - sa * hw * 2], [cx + ca * hl, cy + sa * hl], [cx + sa * hw - ca * hw * 2, cy - ca * hw - sa * hw * 2]], acc, out);
    disc(env, cx, cy, M * 0.022 * e, sc.fg, out); if (Pm.hub) ringS(env, cx, cy, M * 0.04 * e, sc.fg, lw * 2, out);
    poly(env, [[cx - M * 0.012, cy - Ro - M * 0.045], [cx + M * 0.012, cy - Ro - M * 0.045], [cx, cy - Ro - M * 0.027]], acc, out * e);
    let bb = null;
    sl.forEach((ch, i) => {
      if (isSp(ch)) return;
      const a = (-90 + i * 360 / N) * DEG;
      bb = U(bb, J.mainDraw(env, { text: ch, font: Pm.font, size: gs, x: cx + Math.cos(a) * Rg, y: cy + Math.sin(a) * Rg, color: i === cur && env.lt > cut.inDur ? acc : sc.fg, mi: i * 0.6 }));
    });
    return bb;
  },
});

/* ================================================================== 23 xbCrosshair — 照準
   two full-bleed hairlines cross off-centre with rings and ticks; the lyric takes the largest quadrant */
reg('xbCrosshair', {
  name: '照準', en: 'Crosshair', tags: ['graphic', 'glitch', 'calm'], ae: 'gloss', w: 0.9, fits: n => n >= 1 && n <= 16,
  plan(rng, cut, st) { return { font: rng.pick(fontsOf(st, ['display', 'serif', 'body'])), qx: rng.pick([0, 1]), qy: rng.pick([0, 1]), fr: rng.range(0.22, 0.3), pulse: rng.chance(0.75), marks: rng.chance(0.7) }; },
  render(env) {
    const { W, H, sc, Pm, M, port, txt, out, lw, ls } = base(env);
    const fxr = port ? Pm.fr * 0.9 : Pm.fr, fyr = port ? Pm.fr * 0.8 : Pm.fr * 1.05;
    const px = W * (Pm.qx ? 1 - fxr : fxr), py = H * (Pm.qy ? 1 - fyr : fyr), gp = M * 0.05;
    const x0 = Pm.qx ? W * 0.05 : px + gp, x1 = Pm.qx ? px - gp : W * 0.95, y0 = Pm.qy ? H * 0.06 : py + gp, y1 = Pm.qy ? py - gp : H * 0.94;
    const e = inE(env, 0.7), acc = accentOn(sc);
    Ln(env, px - px * e, py, px + (W - px) * e, py, sc.fg, lw * 2, 0.85 * out); Ln(env, px, py - py * e, px, py + (H - py) * e, sc.fg, lw * 2, 0.85 * out);
    mainOnly(env, ctx => {
      ctx.globalAlpha = 0.7 * out; ctx.strokeStyle = sc.sub; ctx.lineWidth = lw * 1.5; ctx.beginPath();
      const st = M * 0.04, kx = Math.ceil(W / st), ky = Math.ceil(H / st);
      for (let i = -kx; i <= kx; i++) { const x = px + i * st; if (!i || x < 0 || x > W || Math.abs(i) > kx * e) continue; const t = M * (i % 5 ? 0.007 : 0.016); ctx.moveTo(x, py - t); ctx.lineTo(x, py + t); }
      for (let i = -ky; i <= ky; i++) { const y = py + i * st; if (!i || y < 0 || y > H || Math.abs(i) > ky * e) continue; const t = M * (i % 5 ? 0.007 : 0.016); ctx.moveTo(px - t, y); ctx.lineTo(px + t, y); }
      ctx.stroke();
    });
    ringS(env, px, py, M * 0.034 * e, sc.fg, lw * 2.5, out); ringS(env, px, py, M * 0.085 * e, acc, lw * 2, out); disc(env, px, py, M * 0.009 * e, acc, out);
    if (Pm.pulse) { const f = (env.ltb * 0.55) % 1; ringS(env, px, py, M * (0.085 + 0.2 * f), acc, lw * 1.5, (1 - f) * 0.6 * out * e); }
    const sx = Pm.qx ? 1 : -1, sy = Pm.qy ? 1 : -1, la = out * inC(env, 0.3, 0.3);
    label(env, 'X ' + (px / W).toFixed(3), px + sx * M * 0.11, py + sy * ls * 1.5, { align: Pm.qx ? 'left' : 'right', alpha: la });
    label(env, 'Y ' + (py / H).toFixed(3), px + sx * M * 0.11, py + sy * ls * 3.1, { align: Pm.qx ? 'left' : 'right', alpha: la });
    const f = fitBox(txt, Pm.font, (x1 - x0) * 0.9, (y1 - y0) * 0.72, { lead: 1.2, track: 0.02 }, 4), size = Math.min(f.size, M * 0.26);
    const it = { text: f.text, font: Pm.font, size, x: (x0 + x1) / 2, y: (y0 + y1) / 2, lead: 1.2, track: 0.02, color: sc.fg };
    if (Pm.marks) {
      const m = J.measure(it), bx = m.w / 2 + size * 0.35, by = m.h / 2 + size * 0.3, k = size * 0.32 * inE(env, 0.5, 0.2);
      [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(c => env.line([[it.x + c[0] * bx, it.y + c[1] * (by - k)], [it.x + c[0] * bx, it.y + c[1] * by], [it.x + c[0] * (bx - k), it.y + c[1] * by]], acc, lw * 2.5, out, false));
    }
    return J.mainDraw(env, it);
  },
});

/* ================================================================== 24 xbStripeDisc — 縞の円
   a disc sliced into bands that thin out as they drift down; the lyric fills the widest gap and runs past the rim */
reg('xbStripeDisc', {
  name: '縞の円', en: 'Striped Disc', tags: ['graphic', 'pop', 'emotional', 'calm'], ae: 'circle', w: 1.1, fits: n => n >= 1 && n <= 16,
  plan(rng, cut, st) { return { font: rng.pick(fontsOf(st, ['display', 'serif'])), col: rng.pick(['accent', 'accent', 'ink', 'fg']), pos: rng.pick([0.08, 0.18, 0.28]), off: rng.range(-0.06, 0.06), n: rng.pick([5, 6, 7]), up: rng.chance(0.25) }; },
  render(env) {
    const { W, H, sc, Pm, M, port, txt, out } = base(env);
    const fb = fitBox(txt, Pm.font, W * 0.88, H * (port ? 0.2 : 0.26), { lead: 1.15, track: 0.03 }, port ? 3 : 2), size = Math.min(fb.size, M * 0.24);
    const it = { text: fb.text, font: Pm.font, size, lead: 1.15, track: 0.03, color: sc.fg, x: W / 2 };
    const m = J.measure(it), Rr = M * 0.43, cx = W / 2 + Pm.off * W, cy = H / 2, dir = Pm.up ? -1 : 1;
    const ty = cy + dir * Rr * Pm.pos, gh = m.h / 2 + size * 0.24; it.y = ty;
    const e = inE(env, 0.6), col = pickPlate(sc, Pm.col);
    mainOnly(env, ctx => {
      if (e <= 0) return;
      ctx.globalAlpha = out; ctx.beginPath(); ctx.arc(cx, cy, Rr * e, 0, TAU); ctx.clip(); ctx.fillStyle = col;
      // solid cap on one side of the lyric
      if (dir > 0) ctx.fillRect(cx - Rr, cy - Rr, Rr * 2, Math.max(0, ty - gh - (cy - Rr))); else ctx.fillRect(cx - Rr, ty + gh, Rr * 2, Math.max(0, cy + Rr - (ty + gh)));
      // bands on the other side
      const ya = dir > 0 ? ty + gh : ty - gh, len = dir > 0 ? cy + Rr - ya : ya - (cy - Rr), N = Pm.n, ph = (env.lt * 0.22) % 1;
      if (len > 2) for (let k = 0; k < N; k++) {
        const u = (k + ph) / N, th = len / N * (0.78 * (1 - u) + 0.06) * J.clamp(u * N), off = u * len + len / N * 0.2;
        ctx.fillRect(cx - Rr, dir > 0 ? ya + off : ya - off - th, Rr * 2, th);
      }
    });
    return J.mainDraw(env, it);
  },
});

/* ================================================================== 25 xbWedge — くさび
   a long thin wedge opens from one side; the lines ride its two edges, tilting apart */
reg('xbWedge', {
  name: 'くさび', en: 'Wedge', tags: ['graphic', 'pop', 'emotional'], ae: 'diag', w: 1, fits: n => n >= 1 && n <= 16,
  plan(rng, cut, st) { return { font: rng.pick(fontsOf(st, ['display', 'serif'])), dir: rng.pick([1, -1]), th: rng.pick([4.5, 6, 7.5]), col: rng.pick(['accent', 'accent', 'ink']), dot: rng.chance(0.7) }; },
  render(env) {
    const { W, H, sc, Pm, M, port, txt, out, lw, ls, no } = base(env);
    const n = J.glyphCount(txt), lines = linesOf(txt, (port ? n <= 3 : n <= 5) ? 1 : 2).split('\n'), L2 = lines.length > 1;
    if (lines.length > 2) { lines[1] = lines.slice(1).join(''); lines.length = 2; }
    const th = Pm.th * DEG, c = Math.cos(th), s = Math.sin(th), d = Pm.dir, Lw = W * 0.86, ax = d > 0 ? W * 0.07 : W * 0.93, ay = H / 2;
    const size = Math.min(M * 0.2, H * 0.2, ...lines.map(l => J.fitSize(l, Pm.font, Lw * 0.8, M, { track: 0.03 })));
    const e = inE(env, 0.6) * (1 - E.inCubic(env.pOut)), col = pickPlate(sc, Pm.col), far = Lw / c * e;
    if (e > 0.001) poly(env, [[ax, ay], [ax + d * c * far, ay - s * far], [ax + d * c * far, ay + s * far]], col, 1);
    if (Pm.dot) disc(env, ax - d * M * 0.022, ay, M * 0.009 * inE(env, 0.4, 0.2), sc.fg, out);
    const t = Lw * 0.55 / c; let bb = null;
    lines.forEach((l, i) => {
      const sg = i ? 1 : -1, ex = ax + d * c * t, ey = ay + sg * s * t, nx = -s * d, ny = sg * c, off = size * 0.64;
      bb = U(bb, J.mainDraw(env, { text: l, font: Pm.font, size, x: ex + nx * off, y: ey + ny * off, rot: sg * d * Pm.th, track: 0.03, color: sc.fg, mi: i }));
    });
    if (!L2) { const ex = ax + d * c * t, ey = ay + s * t + c * ls * 1.6; label(env, 'No.' + String(no).padStart(2, '0') + '  ' + Pm.th.toFixed(1) + '°', ex, ey, { align: 'center', rot: d * Pm.th, alpha: out * inC(env, 0.3, 0.3) }); }
    return bb;
  },
});

/* ================================================================== 26 xbGradBars — 漸増ストライプ
   full-bleed bars whose weight grows step by step down the screen; the lyric takes the place of one bar */
reg('xbGradBars', {
  name: '漸増ストライプ', en: 'Growing Bars', tags: ['graphic', 'editorial', 'calm'], ae: 'center', w: 1, busy: true, fits: n => n >= 1 && n <= 16,
  plan(rng, cut, st) { return { font: rng.pick(fontsOf(st, ['display', 'body', 'serif'])), flip: rng.chance(0.5), col: rng.pick(['fg', 'ink', 'accent']), acc: rng.int(0, 4), align: rng.pick(['left', 'left', 'center', 'right']) }; },
  render(env) {
    const { W, H, sc, Pm, M, port, txt, out } = base(env);
    const fb = fitBox(txt, Pm.font, W * 0.88, H * (port ? 0.24 : 0.3), { lead: 1.15, track: 0.03 }, port ? 3 : 2), size = Math.min(fb.size, M * 0.24);
    const al = Pm.align, it = { text: fb.text, font: Pm.font, size, x: al === 'left' ? W * 0.06 : al === 'right' ? W * 0.94 : W / 2, align: al, lead: 1.15, track: 0.03, color: sc.fg };
    const m = J.measure(it), sg = Pm.flip ? -1 : 1, ty = H / 2 + sg * H * 0.12; it.y = ty;
    const col = pickPlate(sc, Pm.col), acc = accentOn(sc) === col ? pickPlate(sc, 'fg') : accentOn(sc), t0 = Math.min(size * 0.4, M * 0.07);
    // thin side: bars shrink away from the lyric
    let y = ty - sg * (m.h / 2 + size * 0.32), k = 0;
    for (; k < 9; k++) {
      const th = t0 * Math.pow(0.68, k); if (th < 1.2) break;
      const e = stg(env, k, 0.045, 0.5), yy = sg > 0 ? y - th : y;
      if (yy > H || yy + th < 0) break;
      R(env, k % 2 ? W * (1 - e) : 0, yy, W * e, th, k === Pm.acc ? acc : col, out);
      y -= sg * th * 2;
    }
    // heavy side
    y = ty + sg * (m.h / 2 + size * 0.32);
    for (let j = 0; j < 4; j++) {
      const th = t0 * Math.pow(1.6, j + 1), e = stg(env, j + 1, 0.06, 0.5), yy = sg > 0 ? y : y - th;
      if (yy > H || yy + th < 0) break;
      R(env, j % 2 ? 0 : W * (1 - e), yy, W * e, th, col, out);
      y += sg * (th + t0 * 0.6 * Math.pow(1.3, j));
    }
    return J.mainDraw(env, it);
  },
});

/* ================================================================== 27 xbGraph — 折れ線グラフ
   a line chart: each glyph is a data point's label, standing over its dot on a rising or falling polyline */
reg('xbGraph', {
  name: '折れ線グラフ', en: 'Line Chart', tags: ['graphic', 'pop', 'editorial'], ae: 'wave', w: 0.8, fits: n => n >= 2 && n <= 14,
  plan(rng, cut, st) { return { font: rng.pick(fontsOf(st, ['display', 'body'])), trend: rng.pick([1, 1, -1, 0]), amp: rng.range(0.5, 1), area: rng.chance(0.5), drop: rng.chance(0.7) }; },
  render(env) {
    const { W, H, sc, cut, Pm, M, port, txt, out, lw, ls } = base(env);
    const N0 = cellsOf(txt).length, pr = padRows(rowCells(txt, port ? (N0 > 10 ? 3 : N0 > 5 ? 2 : 1) : (N0 > 9 ? 2 : 1))), cells = pr.flat, RN = pr.rows, per = pr.per;
    const x0 = W * 0.09, x1 = W * 0.94, RH = Math.min(H * 0.84 / RN, M * 0.62), top = H / 2 - RH * RN / 2, cw = (x1 - x0) / per;
    const gs = Math.min(M * 0.2, cw * 0.84, RH * 0.33), acc = accentOn(sc), e = inE(env, 0.9);
    let bb = null, gi = 0, lab = 0;
    for (let r = 0; r < RN; r++) {
      const yb = top + r * RH + RH * 0.9, row = cells.slice(r * per, (r + 1) * per), pts = [];
      Ln(env, x0, yb, x0 + (x1 - x0) * e, yb, sc.fg, lw * 2.5, out); Ln(env, x0, yb, x0, yb - RH * 0.82 * e, sc.fg, lw * 2.5, out);
      poly(env, [[x1 + M * 0.014, yb], [x1, yb - M * 0.008], [x1, yb + M * 0.008]], sc.fg, out * J.clamp(e * 4 - 3));
      row.forEach((ch, c) => {
        if (isSp(ch)) return;
        const i = r * per + c, x = x0 + (c + 0.6) * cw, u = per > 1 ? c / (per - 1) : 0.5;
        const v = (Pm.trend > 0 ? u : Pm.trend < 0 ? 1 - u : 0.5) * 0.62 + 0.38 * J.r(cut.seed, i, 81) * Pm.amp, y = yb - RH * (0.1 + 0.36 * v);
        Ln(env, x, yb, x, yb + M * 0.012, sc.fg, lw * 2, out * e);
        label(env, String(++lab).padStart(2, '0'), x, yb + M * 0.012 + ls * 0.9, { align: 'center', size: ls * 0.85, alpha: 0.8 * out * J.clamp((env.lt - 0.1 - c * 0.03) / 0.2) });
        pts.push([x, y, ch, i]);
      });
      if (Pm.area && pts.length > 1) { const k = Math.max(2, Math.ceil(pts.length * e)); poly(env, [[pts[0][0], yb], ...pts.slice(0, k).map(p => [p[0], p[1]]), [pts[k - 1][0], yb]], acc, 0.16 * out); }
      env.polyPartial(pts.map(p => [p[0], p[1]]), e, acc, lw * 3.5, out, false);
      pts.forEach((p, j) => {
        const a = J.clamp((e * pts.length - j) * 2);
        if (Pm.drop) Ln(env, p[0], p[1], p[0], yb, sc.sub, lw * 1.2, 0.5 * out * a);
        disc(env, p[0], p[1], gs * 0.085 * a, sc.fg, out); disc(env, p[0], p[1], gs * 0.045 * a, sc.bg, out);
        bb = U(bb, J.mainDraw(env, { text: p[2], font: Pm.font, size: [...p[2]].length > 1 ? gs * 0.74 : gs, x: p[0], y: p[1] - gs * 0.78, color: sc.fg, mi: gi++ }));
      });
    }
    return bb;
  },
});

/* ================================================================== 28 xbPie — 円グラフ
   a pie chart whose slices are the lines of the lyric; leaders run from each slice to its line */
reg('xbPie', {
  name: '円グラフ', en: 'Pie Chart', tags: ['graphic', 'pop', 'editorial'], ae: 'gloss', w: 0.9, fits: n => n >= 1 && n <= 16,
  plan(rng, cut, st) { return { font: rng.pick(fontsOf(st, ['display', 'body', 'serif'])), a0: rng.range(-150, -60), side: rng.pick([0, 1]), rest: rng.range(0.14, 0.3), ex: rng.int(0, 3), hole: rng.chance(0.3) }; },
  render(env) {
    const { W, H, sc, Pm, M, port, txt, out, lw, ls } = base(env);
    const Rp = port ? Math.min(W * 0.3, H * 0.15) : Math.min(H * 0.3, W * 0.15);
    const pcx = port ? W / 2 : (Pm.side ? W * 0.95 - Rp * 1.2 : W * 0.05 + Rp * 1.2), pcy = port ? (Pm.side ? H * 0.94 - Rp * 1.15 : H * 0.06 + Rp * 1.15) : H / 2;
    const zx0 = port ? W * 0.08 : (Pm.side ? W * 0.06 : pcx + Rp * 1.45), zx1 = port ? W * 0.94 : (Pm.side ? pcx - Rp * 1.45 : W * 0.94);
    const zy0 = port ? (Pm.side ? H * 0.08 : pcy + Rp * 1.4) : H * 0.14, zy1 = port ? (Pm.side ? pcy - Rp * 1.4 : H * 0.92) : H * 0.86;
    const fb = fitBox(txt, Pm.font, (zx1 - zx0) * 0.84, (zy1 - zy0) * 0.82, { lead: 1.5, track: 0.03 }, 4), lines = fb.text.split('\n'), L = lines.length, size = Math.min(M * 0.2, fb.size);
    const chip = size * 0.3, pitch = Math.min(size * 1.5, (zy1 - zy0) / L), mw = Math.max(...lines.map(l => J.measure({ text: l, font: Pm.font, size, track: 0.03 }).w));
    const bx = (zx0 + zx1) / 2 - (mw + chip + size * 0.35) / 2, tx = bx + chip + size * 0.35, cyT = (zy0 + zy1) / 2;
    const cnt = lines.map(l => Math.max(1, J.glyphCount(l))), tot = cnt.reduce((a, b) => a + b, 0) / (1 - Pm.rest);
    let c1 = accentOn(sc), c2 = pickPlate(sc, 'ink'), c3 = pickPlate(sc, 'accent2'); if (c3 === c1 || c3 === c2) c3 = pickPlate(sc, 'fg');
    const cols = [c1, c2, c3, sc.sub], e = inE(env, 0.9), lim = Pm.a0 + 360 * e;
    let a = Pm.a0, bb = null;
    for (let i = 0; i <= L; i++) {
      const sp = (i < L ? cnt[i] : tot - cnt.reduce((x, y) => x + y, 0)) / tot * 360, a1 = Math.min(a + sp, lim), mid = (a + sp / 2) * DEG;
      const col = i < L ? cols[i % 4] : dimOf(sc), exo = i < L && i === Pm.ex % L ? Rp * 0.09 : 0, ox = Math.cos(mid) * exo, oy = Math.sin(mid) * exo;
      sector(env, pcx + ox, pcy + oy, Pm.hole ? Rp * 0.42 : 0, Rp, a + 0.6, a1 - 0.6, col, out);
      if (i < L) {
        const y = cyT + (i - (L - 1) / 2) * pitch, el = inE(env, 0.5, 0.25 + i * 0.08);
        const p0 = [pcx + ox + Math.cos(mid) * Rp * 0.72, pcy + oy + Math.sin(mid) * Rp * 0.72], p1 = [pcx + ox + Math.cos(mid) * Rp * 1.14, pcy + oy + Math.sin(mid) * Rp * 1.14], p2 = [bx - size * 0.18, y];
        if (Math.cos(mid) * (p2[0] - pcx) + Math.sin(mid) * (p2[1] - pcy) > Rp * 0.3) env.polyPartial([p0, p1, p2], el, sc.sub, lw * 1.6, 0.8 * out, false);
        disc(env, p0[0], p0[1], M * 0.006 * el, onCol(sc, col), out);
        R(env, bx, y - chip / 2, chip * el, chip, col, out);
        label(env, Math.round(cnt[i] / tot * 100) + '%', p1[0] + (Math.cos(mid) >= 0 ? ls * 0.4 : -ls * 0.4), p1[1] - ls * 0.9, { align: Math.cos(mid) >= 0 ? 'left' : 'right', size: ls * 0.9, alpha: out * J.clamp((env.lt - 0.5 - i * 0.08) / 0.2) });
        bb = U(bb, J.mainDraw(env, { text: lines[i], font: Pm.font, size, x: tx, y, align: 'left', track: 0.03, color: sc.fg, mi: i }));
      }
      a += sp;
    }
    return bb;
  },
});

/* ================================================================== 29 xbCircleFit — 円形組
   every line is sized to the chord it sits on, so the block of type itself becomes a disc */
reg('xbCircleFit', {
  name: '円形組', en: 'Disc Setting', tags: ['graphic', 'pop', 'editorial'], ae: 'circle', w: 0.9, treat: 'safe', emph: 1.2, fits: n => n >= 1 && n <= 16,
  plan(rng, cut, st) { return { font: rng.pick(fontsOf(st, ['display'])), style: rng.pick(['plate', 'plate', 'ring']), col: rng.pick(['ink', 'accent', 'fg']), orb: rng.chance(0.6) }; },
  render(env) {
    const { W, H, sc, Pm, M, txt, out, lw } = base(env);
    const n = J.glyphCount(txt), lines = linesOf(txt, n <= 3 ? 1 : n <= 7 ? 2 : n <= 12 ? 3 : 4).split('\n'), L = lines.length, Rr = M * 0.44, Ri = Rr * 0.9, ld = 1.1;
    const u = lines.map(l => Math.max(0.2, J.measure({ text: l, font: Pm.font, size: 100, track: 0.02 }).w / 100));
    let sz = lines.map(() => Ri * 1.5 / L), ys = [];
    for (let k = 0; k < 14; k++) {
      const tot = sz.reduce((a, b) => a + b * ld, 0); let y = -tot / 2; ys = [];
      sz.forEach(s => { ys.push(y + s * ld / 2); y += s * ld; });
      sz = sz.map((s, i) => { const far = Math.abs(ys[i]) + s * 0.46, ch = 2 * Math.sqrt(Math.max(Ri * Ri * 0.01, Ri * Ri - far * far)); return s * 0.45 + 0.55 * Math.min(Ri * 0.95, ch * 0.95 / u[i]); });
    }
    { const tot = sz.reduce((a, b) => a + b * ld, 0); let y = -tot / 2; ys = []; sz.forEach(s => { ys.push(y + s * ld / 2); y += s * ld; });
      sz = sz.map((s, i) => { const far = Math.abs(ys[i]) + s * 0.46, ch = 2 * Math.sqrt(Math.max(Ri * Ri * 0.01, Ri * Ri - far * far)); return Math.min(s, ch * 0.97 / u[i]); }); }
    const cx = W / 2, cy = H / 2, e = E.outBack(J.clamp(env.lt / 0.5), 1.2), plate = pickPlate(sc, Pm.col), solid = Pm.style === 'plate', acc = accentOn(sc);
    if (solid) disc(env, cx, cy, Rr * e, plate, out); else { ringS(env, cx, cy, Rr * e, sc.fg, lw * 4, out); }
    ringS(env, cx, cy, (Rr + M * 0.022) * e, solid ? plate : acc, lw * 1.6, 0.7 * out);
    if (Pm.orb) { const a = env.ltb * 0.5 - 1.2; disc(env, cx + Math.cos(a) * (Rr + M * 0.022), cy + Math.sin(a) * (Rr + M * 0.022), M * 0.011 * e, acc === plate ? sc.fg : acc, out); }
    let bb = null;
    lines.forEach((l, i) => { bb = U(bb, J.mainDraw(env, { text: l, font: Pm.font, size: sz[i], x: cx, y: cy + ys[i], track: 0.02, color: solid ? onCol(sc, plate) : sc.fg, mi: i })); });
    return bb;
  },
});

/* ================================================================== 30 xbTriangleSet — 三角組
   rows of one, two, three… glyphs build a triangle of type on a triangular plate */
reg('xbTriangleSet', {
  name: '三角組', en: 'Triangle Setting', tags: ['graphic', 'pop', 'editorial'], ae: 'stack', w: 0.8, treat: 'safe', fits: n => n >= 1 && n <= 16,
  plan(rng, cut, st) { return { font: rng.pick(fontsOf(st, ['display', 'serif'])), inv: rng.chance(0.4), style: rng.pick(['plate', 'plate', 'outline']), col: rng.pick(['ink', 'accent', 'fg']) }; },
  render(env) {
    const { W, H, sc, Pm, M, txt, out, lw } = base(env);
    const fbk = () => linesOf(txt, txt.split(/\s+/).length >= 3 ? 3 : 2).split('\n');
    const shaped = shapeRows(txt, TRI, Pm.inv), rows = shaped || fbk(), Rn = rows.length, ld = 116, sg = Pm.inv ? -1 : 1;
    const hw = rows.map(r => J.measure({ text: r, font: Pm.font, size: 100, track: 0.04 }).w / 2);
    // unit space: apex at yA, base at yB (apex-up); inverted layouts mirror y
    const yr = i => ((Pm.inv ? Rn - 1 - i : i) - (Rn - 1) / 2) * ld, yB = (Rn * ld) / 2 + 26;
    // apex distance: try a few and keep the one that lets the type come out largest
    let yA = 0, Ht = 1, hb = 1, k = 0;
    for (const A of [92, 140, 200, 270, 350]) {
      const ya = -(Rn * ld) / 2 - A, ht = yB - ya, h2 = Math.max(...hw.map((w, i) => (w + 24) * ht / (yr(i) - 46 - ya))), kk = Math.min(W * 0.465 / h2, H * 0.9 / ht, M * 0.0026);
      if (kk > k * 1.03) { k = kk; yA = ya; Ht = ht; hb = h2; }
    }
    const size = 100 * k, cx = W / 2, mid = (yA + yB) / 2;
    const Y = y => H / 2 + sg * (y - mid) * k, e = E.outBack(J.clamp(env.lt / 0.5), 1.15), plate = pickPlate(sc, Pm.col), solid = Pm.style === 'plate', acc = accentOn(sc);
    const tri = (s, g) => [[cx, Y(mid) + sg * ((yA - mid) * k - g * 2) * s], [cx + (hb * k + g * 1.8) * s, Y(mid) + sg * ((yB - mid) * k + g) * s], [cx - (hb * k + g * 1.8) * s, Y(mid) + sg * ((yB - mid) * k + g) * s]];
    if (e > 0) {
      if (solid) poly(env, tri(e, 0), plate, out); else loop(env, tri(e, 0), sc.fg, lw * 3, out);
      const g = Math.min(M * 0.022, (H * 0.96 - Ht * k) / 6); if (g > 2) loop(env, tri(e, g), solid ? plate : acc, lw * 2, 0.8 * out);
    }
    let bb = null;
    rows.forEach((r, i) => { bb = U(bb, J.mainDraw(env, { text: r, font: Pm.font, size, x: cx, y: Y(yr(i)), track: 0.04, color: solid ? onCol(sc, plate) : sc.fg, mi: i })); });
    return bb;
  },
});
})();
