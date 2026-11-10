/* JIZURA pack: x2waA — 追加分2 和風: 15 layouts, 10 decor, 6 backgrounds built on traditional Japanese objects and patterns (every def carries wa: true) */
(() => {
'use strict';
const E = J.E;
const P = 'x2waA';
const DEG = J.DEG, TAU = J.TAU, cl = J.clamp, lerp = J.lerp;
const reg = (key, def) => J.register('layout', key, Object.assign({ wa: true }, def), P);

/* ------------------------------------------------------------------ helpers */
const fontsOf = (st, roles) => J.fontsOf(st, roles);
const fontPick = (rng, st, heavy) => (rng.chance(heavy ? 0.25 : 0.4) ? 'brush' : rng.pick(fontsOf(st, heavy ? ['display'] : ['serif', 'display'])));
const serifF = env => (env.st.fonts.serif && env.st.fonts.serif[0]) || 'mincho';
const inE = (env, d = 0.4, delay = 0) => E.outExpo(cl((env.lt - delay) / d));
const inC = (env, d = 0.35, delay = 0) => E.outCubic(cl((env.lt - delay) / d));
const inB = (env, d = 0.4, delay = 0, s = 1.4) => { const k = cl((env.lt - delay) / d); return k <= 0 ? 0 : k >= 1 ? 1 : E.outBack(k, s); };
const outK = env => 1 - E.inCubic(env.pOut);
const hasLatin = t => /[A-Za-z]/.test(t);
const strip = t => String(t || '').replace(/\s+/g, '');
const flat = t => (hasLatin(t) ? String(t || '').trim().replace(/\s+/g, ' ') : strip(t));
const miAt = (env, t) => Math.max(0, t) / Math.max(0.005, env.cut.stagger || 0.04);
const KNUM = '〇一二三四五六七八九';
const kanjiNum = n => { n = Math.max(0, n | 0); if (n < 10) return KNUM[n]; if (n < 20) return '十' + (n % 10 ? KNUM[n % 10] : ''); if (n < 100) return KNUM[Math.floor(n / 10)] + '十' + (n % 10 ? KNUM[n % 10] : ''); return String(n); };
/* J.splitLines, but never leave a line of punctuation only */
const splitL = (t, per) => {
  const ls = J.splitLines(String(t), Math.max(1, per)).split('\n'), out = [];
  for (const l of ls) { if (out.length && [...l].every(c => J.isPunct(c) || c === ' ')) out[out.length - 1] += l; else out.push(l); }
  return out.join('\n');
};
const linesOf = (t, L) => { const s = String(t || '').trim(), n = [...s].length; return L <= 1 ? s : splitL(s, Math.ceil(n / L)); };
const toLines = (t, L) => linesOf(t, L).split('\n').filter(s => s.trim().length);
/* choose the line / column count (1..maxL) that gives the biggest type inside a box */
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
const fitMain = (env, text, font, x, y, bw, bh, color, o, maxL = 3, cap = 1e9, extra) => {
  const oo = Object.assign({ lead: 1.2, track: 0.02 }, o || {});
  const f = fitBox(text, font, bw, bh, oo, maxL);
  return J.mainDraw(env, Object.assign({ text: f.text, font, size: Math.min(f.size, cap), x, y, color }, oo, extra || {}));
};
/* vertical setting: columns chosen for the biggest type; centred on (x, y) */
const VO = { vertical: true, lead: 1.35, track: 0.06 };
const fitMainV = (env, text, font, x, y, bw, bh, color, maxC = 2, cap = 1e9, extra) => {
  const f = fitBox(flat(text), font, bw, bh, VO, maxC);
  return J.mainDraw(env, Object.assign({ text: f.text, font, size: Math.min(f.size, cap), x, y, color }, VO, extra || {}));
};
/* colours: only scheme colours */
const PAL = sc => [sc.bg, sc.fg, sc.ink, sc.sub, sc.accent, sc.accent2, sc.dim].filter(Boolean);
const lightest = sc => PAL(sc).reduce((a, c) => (J.lum(c) > J.lum(a) ? c : a));
const darkest = sc => PAL(sc).reduce((a, c) => (J.lum(c) < J.lum(a) ? c : a));
const onCol = (sc, fill) => {
  let best = null, bv = 0;
  for (const c of [sc.bg, sc.fg, sc.ink, sc.sub]) { if (!c || c === fill) continue; const k = J.contrast(c, fill); if (k > bv) { bv = k; best = c; } }
  return bv >= 3 ? best : (J.lum(fill) > 0.45 ? '#000' : '#fff');
};
const plateCol = (sc, pref, against, min = 1.6) => {
  const b = against || sc.bg;
  for (const c of pref) if (c && J.contrast(c, b) >= min) return c;
  return J.contrast(sc.fg, b) >= J.contrast(sc.bg, b) ? sc.fg : sc.bg;
};
/* light "paper": fill, text colour, an accent that reads on it, faint line colour */
const card = sc => {
  const fill = lightest(sc), text = onCol(sc, fill);
  return { fill, text, acc: plateCol(sc, [sc.accent, sc.accent2, sc.ink], fill, 2), faint: J.mix(fill, text, 0.2), line: J.mix(fill, text, 0.4) };
};
const woodOf = sc => { const w = J.mix(darkest(sc), plateCol(sc, [sc.accent, sc.sub]), 0.35); return J.contrast(w, sc.bg) >= 1.35 ? w : J.mix(w, sc.fg, 0.4); };
/* shape set with a baked-in alpha (secondary graphics: main pass only) */
const G = (env, a) => ({
  a,
  r: (x, y, w, h, c, k = 1) => { if (a * k > 0.003 && w > 0 && h > 0) env.rect(x, y, w, h, c, a * k, false); },
  rr: (x, y, w, h, rad, c, k = 1) => { if (a * k > 0.003 && w > 0 && h > 0) env.rrect(x, y, w, h, rad, c, a * k, false); },
  rs: (x, y, w, h, rad, c, lw, k = 1) => { if (a * k > 0.003 && w > 0 && h > 0) env.rrect(x, y, w, h, rad, null, a * k, false, c, lw); },
  c: (x, y, r, c, k = 1) => { if (a * k > 0.003 && r > 0) env.circle(x, y, r, c, null, 1, a * k, false); },
  cs: (x, y, r, c, lw, k = 1) => { if (a * k > 0.003 && r > 0) env.circle(x, y, r, null, c, lw, a * k, false); },
  l: (x0, y0, x1, y1, c, lw, k = 1) => { if (a * k > 0.003) env.line([[x0, y0], [x1, y1]], c, lw, a * k, false); },
  pl: (pts, c, lw, k = 1) => { if (a * k > 0.003 && pts.length > 1) env.line(pts, c, lw, a * k, false); },
  p: (pts, c, k = 1) => { if (a * k > 0.003 && pts.length > 2) env.poly(pts, c, a * k, false); },
  t: (text, x, y, o = {}) => { const al = a * (o.alpha ?? 1); if (al > 0.003) env.draw({ text: String(text), font: o.font || serifF(env), size: o.size || 20, x, y, align: o.align || 'center', track: o.track ?? 0.08, color: o.color || env.sc.sub, alpha: al, vertical: !!o.vertical, ghost: false, plain: true }); },
});
/* custom canvas drawing, main pass only, state restored */
const MP = (env, a, fn) => { if (env.pass !== 'main' || a <= 0.003) return; const ctx = env.ctx; ctx.save(); ctx.globalAlpha = Math.min(1, a); try { fn(ctx); } finally { ctx.restore(); } };
/* run fn with the canvas moved / scaled / rotated around a point (all passes); identity at rest */
const pose = (env, cx, cy, t, fn) => {
  const ctx = env.ctx; ctx.save();
  ctx.translate(cx + (t.dx || 0), cy + (t.dy || 0));
  if (t.rot) ctx.rotate(t.rot * DEG);
  if (t.s != null) ctx.scale(Math.max(0.001, t.s), Math.max(0.001, t.s));
  ctx.translate(-cx, -cy);
  let r; try { r = fn(); } finally { ctx.restore(); }
  return r;
};
const base = env => { const cut = env.cut, W = env.W, H = env.H; return { W, H, sc: env.sc, cut, Pm: cut.params || {}, lt: env.lt, M: Math.min(W, H), port: H > W * 1.08, txt: String(cut.text || '').trim(), out: outK(env), lw: Math.max(1, Math.min(W, H) * 0.0016), no: (cut.line | 0) + 1, mo: env.fx ? env.fx.motion : 0.6 }; };
const FIT = n => n >= 1 && n <= 16;
const UB = (a, b) => J.unionBB(a, b);
const arcP = (cx, cy, rx, ry, a0, a1, n = 20) => { const o = []; for (let i = 0; i <= n; i++) { const a = lerp(a0, a1, i / n) * DEG; o.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); } return o; };

/* ================================================================== LAYOUTS */

/* 1 屏風 — a zigzag folding screen that unfolds from the middle; the line runs across all panels */
reg('wzByobu', {
  name: '屏風', en: 'Folding Screen', tags: ['calm', 'editorial', 'emotional'], ae: 'center', w: 1.1, treat: 'safe', fits: FIT,
  plan(rng, cut, st) { return { font: fontPick(rng, st), n: rng.pick([4, 6, 6]), look: rng.pick(['gold', 'plain', 'hills']), sun: rng.chance(0.5) }; },
  render(env) {
    const { W, H, sc, cut, Pm, M, port, txt, lw } = base(env);
    const n = port ? 4 : (Pm.n || 6), sw = W * (port ? 0.92 : 0.86), sh = port ? H * 0.44 : H * 0.6, cx = W / 2, cy = H / 2;
    const C = card(sc), gold = Pm.look === 'gold';
    const fill = gold ? J.mix(plateCol(sc, [sc.accent, sc.accent2, sc.fg], sc.bg, 1.3), C.fill, 0.35) : C.fill;
    const ink = onCol(sc, fill), shade = J.mix(fill, ink, 0.13), rim = J.mix(fill, ink, 0.82), faint = J.mix(fill, ink, 0.17);
    const open = E.inOutCubic(cl(env.lt / 0.55)) * (1 - E.inOutCubic(cl(env.pOut / 0.9)));
    const a = inC(env, 0.15) * (1 - cl((env.pOut - 0.75) / 0.25));
    if (a <= 0.01) return null;
    const g = G(env, a), ww = sw * lerp(0.1, 1, open), fold = M * 0.02 * lerp(3.2, 1, open), X = [], T = [], B = [];
    for (let j = 0; j <= n; j++) { const k = (j % 2 ? 1 : -1) * fold; X.push(cx - ww / 2 + ww * j / n); T.push(cy - sh / 2 - k); B.push(cy + sh / 2 + k); }
    for (let i = 0; i < n; i++) {
      g.p([[X[i], T[i]], [X[i + 1], T[i + 1]], [X[i + 1], B[i + 1]], [X[i], B[i]]], i % 2 ? shade : fill);
      if (gold) { for (const f of [1 / 3, 2 / 3]) g.l(X[i], lerp(T[i], B[i], f), X[i + 1], lerp(T[i + 1], B[i + 1], f), faint, lw * 1.5); g.l((X[i] + X[i + 1]) / 2, (T[i] + T[i + 1]) / 2, (X[i] + X[i + 1]) / 2, (B[i] + B[i + 1]) / 2, faint, lw * 1.5); }
      if (Pm.look === 'hills') {
        const h0 = B[i] - sh * (0.08 + 0.2 * J.r(cut.seed, i, 7)), h1 = B[i + 1] - sh * (0.08 + 0.2 * J.r(cut.seed, i + 1, 7)), hm = Math.min(h0, h1) - sh * 0.07 * J.r(cut.seed, i, 9);
        g.p([[X[i], h0], [(X[i] + X[i + 1]) / 2, hm], [X[i + 1], h1], [X[i + 1], B[i + 1]], [X[i], B[i]]], faint, 1.2);
      }
    }
    if (Pm.sun && Pm.look !== 'gold') g.c(lerp(X[0], X[n], 0.82), cy - sh * 0.33, sh * 0.065 * open, C.acc, 0.85);
    for (let i = 0; i < n; i++) g.pl([[X[i], T[i]], [X[i + 1], T[i + 1]], [X[i + 1], B[i + 1]], [X[i], B[i]], [X[i], T[i]]], rim, M * 0.007);
    return fitMain(env, txt, Pm.font, cx, cy, sw * 0.84, sh * 0.5, ink, null, port ? 3 : 2, sh * 0.4, { mi: miAt(env, 0.3) });
  },
});

/* 2 のぼり旗 — tall banner flags on poles; one column of the line per flag, the cloth edge flutters */
reg('wzNobori', {
  name: 'のぼり旗', en: 'Banner Flags', tags: ['pop', 'graphic', 'emotional'], ae: 'vcols', w: 1, treat: 'safe', fits: FIT, portrait: 1.2,
  plan(rng, cut, st) { return { font: fontPick(rng, st, true), multi: rng.chance(0.7), col: rng.pick(['accent', 'ink', 'paper']), sway: rng.range(0.7, 1.3), band: rng.chance(0.6) }; },
  render(env) {
    const { W, H, sc, cut, Pm, M, port, txt, lw, out, mo } = base(env);
    const t0 = flat(txt), n = J.glyphCount(t0);
    const want = port ? (n > 10 && Pm.multi ? 2 : 1) : !Pm.multi ? 1 : n <= 3 ? 1 : n <= 9 ? 2 : 3;
    const parts = want === 1 ? [t0] : toLines(t0, want), nb = parts.length, ltr = hasLatin(t0);
    const bh = H * 0.78, y0 = H * 0.1, gap = M * 0.07, tk = M * 0.012;
    const bw = nb === 1 ? Math.min(W * 0.44, bh * 0.36) : Math.min((W * 0.86 - gap * (nb - 1)) / nb, bh * 0.27);
    const tot = nb * bw + (nb - 1) * gap, C = card(sc);
    const pap = J.contrast(C.fill, sc.bg) >= 1.3 ? C.fill : plateCol(sc, [sc.fg, sc.ink, sc.sub], sc.bg, 1.3);
    const cA = Pm.col === 'paper' ? pap : plateCol(sc, Pm.col === 'accent' ? [sc.accent, sc.ink, sc.fg] : [sc.ink, sc.accent, sc.fg]);
    const cB = Pm.col === 'paper' ? plateCol(sc, [sc.accent, sc.ink, sc.fg].filter(c => c !== pap)) : pap === cA ? plateCol(sc, [sc.accent, sc.ink, sc.sub].filter(c => c !== cA)) : pap, pole = woodOf(sc);
    const g = G(env, inC(env, 0.15) * out);
    let bb = null;
    for (let k = 0; k < nb; k++) {
      const i = ltr ? k : nb - 1 - k, xl = (W - tot) / 2 + i * (bw + gap) + tk, xr = xl + bw - tk, e = inE(env, 0.55, k * 0.09), fill = k % 2 ? cB : cA, on = onCol(sc, fill);
      const hh = bh * e, pts = [[xl, y0]];
      for (let s = 0; s <= 10; s++) pts.push([xr + Math.sin(env.ltb * 1.7 * (Pm.sway || 1) + s * 0.75 + k * 1.3) * bw * 0.035 * mo * (s / 10), y0 + hh * s / 10]);
      pts.push([xl, y0 + hh]);
      g.r(xl - tk * 2.2, lerp(H * 0.99, y0 - M * 0.045, inE(env, 0.45, k * 0.07)), tk, H, pole);
      g.r(xl - tk * 2.2, y0 - tk * 1.6, (bw + tk * 1.2) * e, tk * 0.8, pole);
      g.c(xl - tk * 1.7, y0 - M * 0.045, tk * 1.1 * e, pole);
      g.p(pts, fill);
      for (let s = 0; s < 6; s++) g.r(xl - tk * 2.6, y0 + hh * (s + 0.5) / 6 - tk * 0.9, tk * 2.8, tk * 1.8, fill);
      for (let s = 0; s < 3; s++) g.r(xl + (bw - tk) * e * (s + 0.5) / 3 - tk * 0.9, y0 - tk * 2.2, tk * 1.8, tk * 2.6, fill);
      if (Pm.band) { g.r(xl, y0 + hh * 0.045, bw - tk * 1.6, hh * 0.012, on, 0.85); g.r(xl, y0 + hh * 0.925, bw - tk * 1.6, hh * 0.03, on, 0.85); }
      bb = UB(bb, fitMainV(env, parts[k], Pm.font, (xl + xr) / 2 - tk * 0.3, y0 + bh * 0.49, bw * 0.66, bh * 0.76, on, nb === 1 || J.glyphCount(parts[k]) > 6 ? 2 : 1, bw * 0.6, { mi: miAt(env, 0.18 + k * 0.1) + k }));
    }
    return bb;
  },
});

/* 3 千社札 — votive name stickers: tall double-framed slips slapped on one after another */
reg('wzSenjafuda', {
  name: '千社札', en: 'Votive Stickers', tags: ['graphic', 'pop', 'editorial'], ae: 'labels', w: 1, treat: 'safe', fits: FIT,
  enterBias: { pop: 1.5, cut: 1.4, blur: 0.5 },
  plan(rng, cut, st) { return { font: fontPick(rng, st, true), inv: rng.chance(0.5), tilt: [rng.range(-4, 4), rng.range(-4, 4), rng.range(-4, 4)], dy: [rng.range(-1, 1), rng.range(-1, 1), rng.range(-1, 1)], head: rng.chance(0.7) }; },
  render(env) {
    const { W, H, sc, Pm, M, port, txt, out, no } = base(env);
    const t0 = flat(txt), n = J.glyphCount(t0), want = n <= 3 ? 1 : n <= 8 ? 2 : port ? 2 : 3;
    const parts = toLines(t0, want), k = parts.length, ltr = hasLatin(t0);
    const sh = H * (port ? 0.6 : 0.74), gap = M * 0.03, sw = Math.min(sh * 0.36, (W * 0.86 - gap * (k - 1)) / k), tot = k * sw + (k - 1) * gap;
    const C = card(sc), tilt = Pm.tilt || [0, 0, 0], dys = Pm.dy || [0, 0, 0];
    let bb = null;
    for (let j = 0; j < k; j++) {
      const i = ltr ? j : k - 1 - j, cx = (W - tot) / 2 + i * (sw + gap) + sw / 2, cy = H / 2 + dys[j % 3] * H * 0.025, e = inB(env, 0.38, j * 0.14, 1.6);
      if (e <= 0) continue;
      const inv = Pm.inv && j % 2 === 1, fill = inv ? C.text : C.fill, ink = inv ? C.fill : C.text, acc = plateCol(sc, [sc.accent, sc.accent2], fill, 1.8);
      const g = G(env, cl(e * 2.5) * out), x0 = cx - sw / 2, y0 = cy - sh / 2, bd = sw * 0.05, hd = Pm.head ? sw * 0.5 : 0;
      const r = pose(env, cx, cy, { rot: tilt[j % 3], s: lerp(1.35, 1, e) }, () => {
        g.r(x0 + M * 0.008, y0 + M * 0.01, sw, sh, darkest(sc), 0.3);
        g.r(x0, y0, sw, sh, fill);
        g.rs(x0 + bd, y0 + bd, sw - bd * 2, sh - bd * 2, 0, ink, bd * 0.7);
        g.rs(x0 + bd * 2.1, y0 + bd * 2.1, sw - bd * 4.2, sh - bd * 4.2, 0, ink, Math.max(1, bd * 0.16));
        if (hd) {
          g.r(x0 + bd * 2.1, y0 + bd * 2.1, sw - bd * 4.2, hd, j === 0 ? acc : ink);
          g.t(j === 0 ? kanjiNum(no) : '・', cx, y0 + bd * 2.1 + hd / 2, { size: hd * 0.52, color: onCol(sc, j === 0 ? acc : ink), track: 0 });
        }
        const ty = y0 + bd * 2.1 + hd, th = sh - bd * 4.2 - hd;
        return fitMainV(env, parts[j], Pm.font, cx, ty + th / 2, sw * 0.6, th * 0.88, ink, 1, sw * 0.62, { mi: miAt(env, j * 0.14 + 0.08) + j, noHold: true });
      });
      bb = UB(bb, r);
    }
    return bb;
  },
});

/* 4 行灯 — a box lamp with paper sides that flickers on; the line is written on the lit paper */
reg('wzAndon', {
  name: '行灯', en: 'Paper Floor Lamp', tags: ['calm', 'emotional', 'graphic'], ae: 'center', w: 1, treat: 'safe', fits: FIT,
  enterBias: { blur: 1.5, flicker: 1.6, cut: 1.2 },
  plan(rng, cut, st) { return { font: fontPick(rng, st), kind: rng.pick(['floor', 'floor', 'hang']), bars: rng.int(5, 8) }; },
  render(env) {
    const { W, H, sc, cut, Pm, M, port, txt, out, lw } = base(env);
    const ww = port ? W * 0.72 : Math.min(W * 0.62, H * 1.15), hh = H * (port ? 0.46 : 0.5), cx = W / 2, cy = H * (Pm.kind === 'hang' ? 0.53 : 0.47), x0 = cx - ww / 2, y0 = cy - hh / 2;
    const C = card(sc), wood = woodOf(sc), k = cl(env.lt / 0.6);
    const lit = E.outCubic(k) * (k < 0.75 && J.r(cut.seed, env.step, 3) < 0.3 ? 0.45 : 1) * (0.94 + 0.06 * J.noise1(env.ltb * 3, cut.seed)) * (1 - E.inCubic(env.pOut));
    const paperC = J.mix(J.mix(C.fill, sc.bg, 0.55), C.fill, lit), ink = onCol(sc, C.fill);
    const e = inE(env, 0.45), g = G(env, inC(env, 0.2) * (1 - cl((env.pOut - 0.6) / 0.4))), fw = M * 0.016;
    return pose(env, cx, cy, { s: 0.95 + 0.05 * e, dy: (1 - e) * M * 0.025 }, () => {
      MP(env, g.a * lit * 0.9, ctx => {
        const R = Math.max(ww, hh) * 0.95, gr = ctx.createRadialGradient(cx, cy, hh * 0.2, cx, cy, R);
        gr.addColorStop(0, J.rgba(C.acc, 0.3)); gr.addColorStop(1, J.rgba(C.acc, 0));
        ctx.fillStyle = gr; ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
      });
      g.r(x0, y0, ww, hh, paperC);
      MP(env, g.a * lit, ctx => {
        const gr = ctx.createRadialGradient(cx, y0 + hh * 0.8, 0, cx, y0 + hh * 0.8, ww * 0.6);
        gr.addColorStop(0, J.rgba(C.acc, 0.2)); gr.addColorStop(1, J.rgba(C.acc, 0));
        ctx.fillStyle = gr; ctx.fillRect(x0, y0, ww, hh);
      });
      // frame, rails with short lattice bars
      const rl = hh * 0.1, nb = (Pm.bars || 6) * (port ? 1 : 2);
      for (const yy of [y0 + rl, y0 + hh - rl]) g.r(x0, yy - fw * 0.25, ww, fw * 0.5, wood);
      for (let i = 1; i < nb; i++) { const xx = x0 + ww * i / nb - fw * 0.2; g.r(xx, y0, fw * 0.4, rl, wood); g.r(xx, y0 + hh - rl, fw * 0.4, rl, wood); }
      g.r(x0 - fw, y0 - fw, fw, hh + fw * 2, wood); g.r(x0 + ww, y0 - fw, fw, hh + fw * 2, wood);
      g.r(x0 - fw * 2.6, y0 - fw * 2.4, ww + fw * 5.2, fw * 1.8, wood); g.r(x0 - fw * 2, y0 + hh + fw * 0.4, ww + fw * 4, fw * 1.6, wood);
      if (Pm.kind === 'hang') { g.pl([[x0 + ww * 0.12, y0 - fw * 2.4], [cx, y0 - fw * 2.4 - hh * 0.2], [x0 + ww * 0.88, y0 - fw * 2.4]], wood, fw * 0.45); g.l(cx, y0 - fw * 2.4 - hh * 0.2, cx, 0, wood, fw * 0.3); }
      else for (const s of [-1, 1]) { const lx = cx + s * ww * 0.4; g.p([[lx - fw * 0.8, y0 + hh + fw * 2], [lx + fw * 0.8, y0 + hh + fw * 2], [lx + s * fw * 1.6 + fw * 0.7, y0 + hh + hh * 0.2], [lx + s * fw * 1.6 - fw * 0.7, y0 + hh + hh * 0.2]], wood); }
      return fitMain(env, txt, Pm.font, cx, cy, ww * 0.86, hh * 0.6, ink, null, port ? 4 : 2, hh * 0.42, { mi: miAt(env, 0.25) });
    });
  },
});

/* 5 色紙 — a square poem card; the columns are "scatter-written" at staggered heights */
reg('wzShikishi', {
  name: '色紙', en: 'Poem Card', tags: ['calm', 'emotional', 'editorial'], ae: 'vcols', w: 1.2, treat: 'safe', fits: FIT,
  plan(rng, cut, st) { return { font: fontPick(rng, st), flow: rng.pick(['down', 'up', 'wave']), tilt: rng.range(-2, 2), deco: rng.pick(['flecks', 'band', 'flecks']), seal: rng.chance(0.75) }; },
  render(env) {
    const { W, H, sc, cut, Pm, M, port, txt, out, lw } = base(env);
    const S = Math.min(W * 0.88, H * 0.84), cx = W / 2, cy = H / 2, x0 = cx - S / 2, y0 = cy - S / 2, C = card(sc);
    const t0 = flat(txt), n = J.glyphCount(t0), L = n <= 3 ? 1 : n <= 6 ? 2 : n <= 11 ? 3 : 4, cols = toLines(t0, L), k = cols.length;
    const o = { vertical: true, track: 0.06 };
    let size = S * (k === 1 ? 0.27 : 0.2);
    for (const c of cols) size = Math.min(size, J.fitSize(c, Pm.font, S * 0.72 / k * 0.82, S * 0.6, o));
    const pitch = Math.min(S * 0.74 / k, size * 1.55), offs = { down: [0, 0.5, 1, 0.55], up: [1, 0.5, 0, 0.45], wave: [0.1, 1, 0.3, 0.8] }[Pm.flow] || [0, 0.5, 1, 0.5];
    const e = inE(env, 0.5), g = G(env, inC(env, 0.2) * out);
    return pose(env, cx, cy, { rot: lerp(-5, Pm.tilt || 0, e), dy: (1 - e) * M * 0.05, s: 0.94 + 0.06 * e }, () => {
      g.r(x0 + M * 0.01, y0 + M * 0.014, S, S, darkest(sc), 0.32);
      g.r(x0, y0, S, S, C.fill);
      if (Pm.deco === 'band') g.p([[x0, y0 + S * 0.62], [x0 + S, y0 + S * 0.38], [x0 + S, y0 + S * 0.58], [x0, y0 + S * 0.82]], C.acc, 0.13 * e);
      for (let i = 0; i < 16; i++) {
        const q = J.r(cut.seed, i, 1), fx = i % 2 ? x0 + S * (0.06 + 0.4 * q * q) : x0 + S * (0.94 - 0.4 * q * q), fy = i % 2 ? y0 + S * (0.05 + 0.3 * J.r(cut.seed, i, 2)) : y0 + S * (0.95 - 0.3 * J.r(cut.seed, i, 2)), fs = S * (0.006 + 0.012 * J.r(cut.seed, i, 3));
        g.r(fx - fs / 2, fy - fs / 2, fs, fs, C.acc, 0.55 * inC(env, 0.3, 0.2 + i * 0.02));
      }
      g.rs(x0 + S * 0.022, y0 + S * 0.022, S * 0.956, S * 0.956, 0, C.acc, Math.max(1.5, S * 0.004), 0.8);
      let bb = null, lastX = cx, lastB = cy;
      for (let i = 0; i < k; i++) {
        const x = cx + ((k - 1) / 2 - i) * pitch, mh = J.measure(Object.assign({ text: cols[i], font: Pm.font, size }, o)).h;
        const top = k === 1 ? cy - mh / 2 : y0 + S * 0.12 + offs[i % 4] * Math.max(0, S * 0.7 - mh) * 0.75;
        bb = UB(bb, J.mainDraw(env, Object.assign({ text: cols[i], font: Pm.font, size, x, y: top, align: 'left', color: C.text, mi: i * 3 }, o)));
        lastX = x; lastB = top + mh;
      }
      if (Pm.seal) { const ss = Math.min(S * 0.07, size * 0.6), sx = Math.max(x0 + S * 0.07, lastX - pitch * 0.5 - ss * 1.2), sy = Math.min(y0 + S * 0.9 - ss, lastB - ss); const sa = cl((env.lt - 0.6) * 5); g.r(sx, sy, ss, ss, C.acc, sa); g.rs(sx + ss * 0.2, sy + ss * 0.2, ss * 0.6, ss * 0.6, 0, C.fill, ss * 0.08, sa * 0.8); }
      return bb;
    });
  },
});

/* 6 風鈴 — wind chimes: a glass bell with the line on the paper strip that swings below it */
reg('wzFurin', {
  name: '風鈴', en: 'Wind Chime', tags: ['calm', 'emotional', 'pop'], ae: 'vcols', w: 0.8, treat: 'safe', fits: FIT, portrait: 1.2,
  plan(rng, cut, st) { return { font: fontPick(rng, st), multi: rng.chance(0.7), pat: rng.pick(['dots', 'wave', 'ring']), ph: rng.range(0, 6), amp: rng.range(3.5, 6) }; },
  render(env) {
    const { W, H, sc, cut, Pm, M, port, txt, out, lw, mo } = base(env);
    const t0 = flat(txt), n = J.glyphCount(t0), want = port ? 1 : !Pm.multi ? 1 : n <= 3 ? 1 : n <= 9 ? 2 : 3;
    const parts = want === 1 ? [t0] : toLines(t0, want), nb = parts.length, ltr = hasLatin(t0), C = card(sc);
    const r = M * 0.055, gap = M * 0.1, shh = H * (port ? 0.6 : 0.6);
    const bwMax = nb === 1 ? Math.min(W * 0.44, shh * 0.42) : Math.min((W * 0.84 - gap * (nb - 1)) / nb, shh * 0.3);
    const tot = nb * bwMax + (nb - 1) * gap, glass = plateCol(sc, [sc.accent, sc.accent2, sc.fg]), line = plateCol(sc, [sc.fg, sc.sub]);
    const g = G(env, inC(env, 0.25) * out);
    if (!port) g.r(0, H * 0.03, W, M * 0.014, woodOf(sc));
    let bb = null;
    for (let k = 0; k < nb; k++) {
      const i = ltr ? k : nb - 1 - k, cx = (W - tot) / 2 + i * (bwMax + gap) + bwMax / 2, yb = H * (port ? 0.07 : 0.1) + (k % 2) * H * 0.035, e = inE(env, 0.5, k * 0.1);
      const f = fitBox(parts[k], Pm.font, bwMax * 0.74, shh * 0.84, VO, nb === 1 || J.glyphCount(parts[k]) > 6 ? 2 : 1), size = Math.min(f.size, bwMax * 0.6), nc = f.text.split('\n').length;
      const sw = Math.min(bwMax, size * (1.5 + (nc - 1) * 1.35)), ph = (Pm.ph || 0) + k * 1.9;
      const th = (Math.sin(env.ltb * 1.35 + ph) * (Pm.amp || 4) * mo + 13 * Math.exp(-env.lt * 1.4) * Math.cos(env.lt * 5.2 + ph)) * (0.4 + 0.6 * mo);
      const by = yb + r * 2.05, sy = by + r * 1.3;
      g.l(cx, 0, cx, yb, line, lw * 1.5);
      // bell (sways a little), then the clapper cord + strip (sway more)
      pose(env, cx, yb, { rot: th * 0.25, s: 0.6 + 0.4 * e }, () => {
        const pts = arcP(cx, yb + r, r, r, 180, 360, 16).concat([[cx + r * 1.08, by], [cx - r * 1.08, by]]);
        g.p(pts, glass, 0.3); g.pl(pts.concat([pts[0]]), glass, lw * 2.4);
        if (Pm.pat === 'dots') for (let d = -1; d <= 1; d++) g.c(cx + d * r * 0.5, yb + r * 1.25, r * 0.11, glass);
        else if (Pm.pat === 'wave') g.pl(Array.from({ length: 13 }, (_, q) => [cx - r * 0.85 + q * r * 0.142, yb + r * 1.3 + Math.sin(q * 1.05) * r * 0.13]), glass, lw * 2.4);
        else g.cs(cx, yb + r * 1.05, r * 0.36, glass, lw * 2.4);
      });
      const res = pose(env, cx, by, { rot: th }, () => {
        g.l(cx, by - r * 0.6, cx, sy, line, lw * 1.5); g.c(cx, by + r * 0.35, r * 0.13, line);
        const hh = shh * e;
        g.r(cx - sw / 2, sy, sw, hh, C.fill);
        if (J.contrast(C.fill, sc.bg) < 1.35) g.rs(cx - sw / 2, sy, sw, hh, 0, C.line, lw * 1.5);
        g.r(cx - sw / 2, sy + hh * 0.03, sw, hh * 0.012, C.acc, 0.8); g.r(cx - sw / 2, sy + hh * 0.955, sw, hh * 0.012, C.acc, 0.8);
        return J.mainDraw(env, Object.assign({ text: f.text, font: Pm.font, size, x: cx, y: sy + shh * 0.5, color: C.text, mi: miAt(env, 0.2 + k * 0.1) + k, noHold: true }, VO));
      });
      bb = UB(bb, res);
    }
    return bb;
  },
});

/* 7 番付表 — a ranking sheet: columns shrink from right to left like a sumo banzuke, small print fills the rest */
reg('wzBanzuke', {
  name: '番付表', en: 'Ranking Sheet', tags: ['graphic', 'editorial', 'pop'], ae: 'vcols', w: 1, treat: 'safe', fits: FIT,
  plan(rng, cut, st) { return { font: fontPick(rng, st, true), ratio: rng.range(0.7, 0.82), tiers: rng.int(2, 3), stamp: rng.chance(0.5) }; },
  render(env) {
    const { W, H, sc, cut, Pm, M, port, txt, out, lw, no } = base(env);
    const pw = W * (port ? 0.9 : 0.8), ph = H * (port ? 0.7 : 0.84), cx = W / 2, cy = H / 2, x0 = cx - pw / 2, y0 = cy - ph / 2, C = card(sc);
    const t0 = flat(txt), n = J.glyphCount(t0), L = n <= 2 ? 1 : n <= 5 ? 2 : n <= 9 ? 3 : 4, cols = toLines(t0, L), k = cols.length, T = k + Math.max(2, 6 - k);
    const ws = []; let sum = 0; for (let i = 0; i < T; i++) { const w = Math.pow(Pm.ratio || 0.76, i); ws.push(w); sum += w; }
    const hd = ph * 0.11, bd = M * 0.014, ux = pw - bd * 4, by0 = y0 + bd * 2 + hd, bh = ph - bd * 4 - hd;
    const e = inE(env, 0.45), g = G(env, inC(env, 0.2) * out), o = { vertical: true, track: 0.04 };
    return pose(env, cx, cy, { dy: -(1 - e) * M * 0.05 }, () => {
      g.r(x0 + M * 0.01, y0 + M * 0.012, pw, ph, darkest(sc), 0.3);
      g.r(x0, y0, pw, ph, C.fill);
      g.rs(x0 + bd, y0 + bd, pw - bd * 2, ph - bd * 2, 0, C.text, bd * 0.35);
      g.r(x0 + bd * 2, by0 - lw * 1.5, ux * inE(env, 0.5, 0.1), lw * 3, C.text);
      g.t('第' + kanjiNum(no) + '番', cx, y0 + bd * 1.6 + hd / 2, { size: hd * 0.5, color: C.text, track: 0.5, font: Pm.font });
      let bb = null, xr = x0 + pw - bd * 2;
      for (let i = 0; i < T; i++) {
        const cw = ux * ws[i] / sum, xc = xr - cw / 2, ei = inE(env, 0.45, 0.1 + i * 0.05);
        if (i > 0) g.r(xr - lw, by0, lw * 2, bh * ei, C.line);
        let top = by0 + bh * 0.04;
        if (i < k) {
          const size = Math.min(J.fitSize(cols[i], Pm.font, cw * 0.76, bh * 0.9, o), cw * 0.8), mh = J.measure(Object.assign({ text: cols[i], font: Pm.font, size }, o)).h;
          bb = UB(bb, J.mainDraw(env, Object.assign({ text: cols[i], font: Pm.font, size, x: xc, y: top, align: 'left', color: i === 0 ? C.acc : C.text, mi: i * 3, noHold: true }, o)));
          top += mh + bh * 0.05;
        }
        // small print: tiers of thin vertical bars
        const rest = by0 + bh * 0.97 - top, tiers = i < k ? 1 : (Pm.tiers || 2), nbar = Math.max(2, Math.round(cw / (M * 0.02)));
        if (rest > bh * 0.1) for (let tr = 0; tr < tiers; tr++) {
          const ty = top + rest * tr / tiers, th = rest / tiers * 0.86;
          if (tr > 0) g.r(xr - cw + lw * 2, ty - rest / tiers * 0.07, (cw - lw * 4) * ei, lw * 1.4, C.line);
          for (let b = 0; b < nbar; b++) g.r(xr - cw * (b + 0.5) / nbar - cw / nbar * 0.2, ty, cw / nbar * 0.4, th * (0.55 + 0.45 * J.r(cut.seed, i, tr, b)) * ei, C.faint, 1.5);
        }
        xr -= cw;
      }
      if (Pm.stamp) { const ss = hd * 0.6; g.cs(x0 + bd * 3 + ss, y0 + bd * 1.6 + hd / 2, ss * 0.5, C.acc, lw * 2.5, cl((env.lt - 0.5) * 5)); g.c(x0 + bd * 3 + ss, y0 + bd * 1.6 + hd / 2, ss * 0.22, C.acc, cl((env.lt - 0.5) * 5)); }
      return bb;
    });
  },
});

/* 8 手ぬぐい — a long patterned cotton cloth that unrolls; a plain panel in the middle carries the line */
reg('wzTenugui', {
  name: '手ぬぐい', en: 'Printed Cotton Cloth', tags: ['pop', 'graphic', 'calm'], ae: 'pill', w: 1, treat: 'safe', fits: FIT,
  plan(rng, cut, st) { return { font: fontPick(rng, st), pat: rng.pick(['mame', 'shima', 'uroko']), col: rng.pick(['ink', 'accent', 'paper']), tilt: rng.range(-2.5, 2.5), rev: rng.chance(0.5) }; },
  render(env) {
    const { W, H, sc, cut, Pm, M, port, txt, out, lw } = base(env);
    const cw = W * (port ? 0.92 : 0.88), ch = H * (port ? 0.36 : 0.46), cx = W / 2, cy = H / 2, x0 = cx - cw / 2, y0 = cy - ch / 2, C = card(sc);
    const fill = Pm.col === 'paper' ? C.fill : plateCol(sc, Pm.col === 'accent' ? [sc.accent, sc.ink, sc.fg] : [sc.ink, sc.accent, sc.fg]);
    const on = onCol(sc, fill), pc = Pm.col === 'paper' ? C.acc : on;
    const e = E.inOutCubic(cl(env.lt / 0.6)), a = inC(env, 0.15) * out, g = G(env, a), vw = cw * e, rev = !!Pm.rev;
    const vx0 = rev ? x0 + cw - vw : x0, zone = cw * 0.17, px0 = x0 + zone, pw = cw - zone * 2;
    return pose(env, cx, cy, { rot: Pm.tilt || 0 }, () => {
      g.r(vx0 + M * 0.008, y0 + M * 0.012, vw, ch, darkest(sc), 0.28);
      g.r(vx0, y0, vw, ch, fill);
      MP(env, a, ctx => {
        ctx.beginPath(); ctx.rect(vx0, y0, vw, ch); ctx.clip();
        ctx.fillStyle = pc; ctx.globalAlpha = a * (Pm.pat === 'mame' ? 0.5 : 0.75);
        ctx.beginPath();
        if (Pm.pat === 'mame') {
          const d = ch * 0.085, rr = d * 0.2;
          for (let yy = y0 + d * 0.6, row = 0; yy < y0 + ch && row < 40; yy += d, row++) for (let xx = x0 + d * (row % 2 ? 1.1 : 0.6), c = 0; xx < x0 + cw && c < 120; xx += d, c++) {
            if (xx > px0 - d * 0.3 && xx < px0 + pw + d * 0.3 && yy > y0 + ch * 0.13 && yy < y0 + ch * 0.87) continue;
            ctx.moveTo(xx + rr, yy); ctx.arc(xx, yy, rr, 0, TAU);
          }
        } else if (Pm.pat === 'shima') {
          for (const s of [0, 1]) for (let q = 0; q < 5; q++) { const bx = (s ? x0 + cw - zone : x0) + zone * (0.12 + q * 0.17), wq = zone * (q % 2 ? 0.035 : 0.09); ctx.rect(bx, y0, wq, ch); }
        } else {
          const d = ch / 8, hw = d * 0.58;
          for (const s of [0, 1]) for (let c = 0; c < 4; c++) for (let rw = 0; rw < 9; rw++) {
            const dir = s ? -1 : 1, tx = (s ? x0 + cw : x0) + dir * (c * hw * 2 * 0.5 + hw * 0.2), ty = y0 + rw * d + (c % 2 ? d / 2 : 0) - d / 2;
            ctx.moveTo(tx, ty); ctx.lineTo(tx + dir * hw, ty + d / 2); ctx.lineTo(tx, ty + d); ctx.closePath();
          }
        }
        ctx.fill();
      });
      // plain panel edges + frayed ends
      if (Pm.pat === 'mame') g.rs(px0, y0 + ch * 0.13, pw, ch * 0.74, 0, pc, lw * 2, 0.6 * inC(env, 0.3, 0.35));
      else for (const s of [0, 1]) g.r(s ? px0 + pw : px0 - lw * 3, y0, lw * 3, ch, pc, (rev ? !s : s) ? 0.7 * inC(env, 0.2, 0.45) : 0.7 * inC(env, 0.2, 0.1));
      for (let q = 0; q < 26; q++) { const fy = y0 + ch * (q + 0.5) / 26, fl = M * (0.006 + 0.008 * J.r(cut.seed, q)); g.r(x0 - fl, fy, fl, lw * 1.6, fill, rev ? cl(e * 8 - 7) : 1); g.r(x0 + cw, fy, fl, lw * 1.6, fill, rev ? 1 : cl(e * 8 - 7)); }
      if (e < 0.995) g.rr((rev ? vx0 : vx0 + vw) - ch * 0.035, y0 - ch * 0.03, ch * 0.07, ch * 1.06, ch * 0.03, J.mix(fill, on, 0.25));
      return fitMain(env, txt, Pm.font, cx, cy, pw * 0.9, ch * (port ? 0.7 : 0.58), on, null, port ? 4 : 2, ch * 0.42, { mi: miAt(env, 0.3) });
    });
  },
});

/* 9 竹簡 — bamboo slips tied with cords; each column of the line sits on its own slip, unrolled right to left */
reg('wzChikkan', {
  name: '竹簡', en: 'Bamboo Slips', tags: ['editorial', 'calm', 'graphic'], ae: 'vcols', w: 1, treat: 'safe', fits: FIT,
  plan(rng, cut, st) { return { font: fontPick(rng, st), extra: rng.int(1, 2), roll: rng.chance(0.6), cord: rng.pick(['accent', 'ink']) }; },
  render(env) {
    const { W, H, sc, cut, Pm, M, port, txt, out, lw } = base(env);
    const t0 = flat(txt), n = J.glyphCount(t0);
    let cols = [t0], k = 1;
    const sh = H * (port ? 0.66 : 0.74), cx = W / 2, cy = H / 2, y0 = cy - sh / 2, o = { vertical: true, track: 0.06 }, C = card(sc);
    let ex = Pm.extra || 1;
    let size = 10;
    for (let q = 1; q <= Math.min(port ? 3 : 5, Math.max(1, n)); q++) {
      const cs = toLines(t0, q); let s = Math.min(sh * 0.2, W * 0.86 / (cs.length + 2) / 1.64);
      for (const c of cs) s = Math.min(s, J.fitSize(c, Pm.font, s * 1.2, sh * 0.76, o));
      if (s > size * 1.04) { size = s; cols = cs; k = cs.length; }
    }
    const sw = size * 1.5, gp = size * 0.14;
    while (ex > 0 && (k + ex * 2) * (sw + gp) > W * 0.92) ex--;
    const T = k + ex * 2, bam = J.mix(C.fill, plateCol(sc, [sc.sub, sc.accent], C.fill, 1.2), 0.22), ink = onCol(sc, bam), node = J.mix(bam, ink, 0.3);
    const cord = Pm.cord === 'accent' ? plateCol(sc, [sc.accent, sc.accent2], bam, 1.6) : J.mix(bam, ink, 0.75), a = inC(env, 0.15) * out;
    let bb = null, xl = 1e9, xrr = -1e9;
    for (let q = 0; q < T; q++) {
      const x = cx + ((T - 1) / 2 - q) * (sw + gp), e = inE(env, 0.42, q * 0.055), g = G(env, a * cl(e * 3)), dx = (1 - e) * size * 1.4;
      const tone = J.mix(bam, ink, 0.07 * J.r(cut.seed, q, 5));
      g.r(x - sw / 2 + dx + M * 0.004, y0 + M * 0.008, sw, sh, darkest(sc), 0.25);
      g.r(x - sw / 2 + dx, y0, sw, sh, tone);
      for (const f of [0.1 + 0.06 * J.r(cut.seed, q, 1), 0.62 + 0.2 * J.r(cut.seed, q, 2)]) { g.r(x - sw / 2 + dx, y0 + sh * f, sw, lw * 1.6, node); g.r(x - sw / 2 + dx, y0 + sh * f + lw * 4, sw, lw, node, 0.6); }
      for (const f of [0.055, 0.945]) { g.r(x - sw / 2 + dx - gp, y0 + sh * f - lw * 2, sw + gp * 2, lw * 4, cord); g.l(x - sw * 0.16 + dx, y0 + sh * f - sw * 0.14, x + sw * 0.16 + dx, y0 + sh * f + sw * 0.14, cord, lw * 2.5); g.l(x + sw * 0.16 + dx, y0 + sh * f - sw * 0.14, x - sw * 0.16 + dx, y0 + sh * f + sw * 0.14, cord, lw * 2.5); }
      xl = Math.min(xl, x - sw / 2); xrr = Math.max(xrr, x + sw / 2);
      const ci = q - ex;
      if (ci >= 0 && ci < k) bb = UB(bb, J.mainDraw(env, Object.assign({ text: cols[ci], font: Pm.font, size, x, y: cy, color: ink, mi: miAt(env, 0.12 + q * 0.055) + ci, noHold: true }, o)));
    }
    if (Pm.roll && xl - sw * 0.9 > W * 0.02) { const g = G(env, a * inC(env, 0.3, T * 0.055)); g.rr(xl - gp - sw * 0.8, y0 - sh * 0.012, sw * 0.8, sh * 1.024, sw * 0.3, J.mix(bam, ink, 0.14)); for (const f of [0.055, 0.945]) g.r(xl - gp - sw * 0.8, y0 + sh * f - lw * 2, sw * 0.8, lw * 4, cord); }
    return bb;
  },
});

/* 10 将棋の駒 — every glyph is a five-sided shogi piece slapped onto the board grid */
reg('wzShogi', {
  name: '将棋の駒', en: 'Shogi Pieces', tags: ['graphic', 'pop', 'editorial'], ae: 'labels', w: 0.9, treat: false, fits: n => n >= 1 && n <= 12,
  enterBias: { pop: 1.5, drop: 1.5, cut: 1.2 },
  plan(rng, cut, st) { return { font: fontPick(rng, st, true), red: rng.int(0, 11), hasRed: rng.chance(0.6), stars: rng.chance(0.7) }; },
  render(env) {
    const { W, H, sc, cut, Pm, M, port, txt, out, lw } = base(env);
    const t0 = flat(txt), cells = [...t0].length, rows = port ? Math.ceil(cells / (cells <= 9 ? 3 : 4)) : cells <= 7 ? 1 : 2, lines = toLines(t0, rows).map(s => [...s]);
    const R = lines.length, maxc = Math.max(1, ...lines.map(l => l.length)), gc = maxc + 1, gr = R + 1;
    const c = Math.min(W * 0.9 / gc, H * 0.8 / gr, M * 0.3), bx = W / 2 - gc * c / 2, by = H / 2 - gr * c / 2, C = card(sc);
    const board = J.mix(C.fill, plateCol(sc, [sc.accent, sc.sub], C.fill, 1.2), 0.3), bl = J.mix(board, onCol(sc, board), 0.55), ink = C.text;
    const e = inE(env, 0.4), a = inC(env, 0.2) * out, g = G(env, a);
    g.r(bx - c * 0.12 + M * 0.008, by - c * 0.12 + M * 0.012, gc * c + c * 0.24, gr * c + c * 0.24, darkest(sc), 0.3 * e);
    g.r(bx - c * 0.12, by - c * 0.12, gc * c + c * 0.24, gr * c + c * 0.24, board);
    for (let i = 0; i <= gc; i++) g.r(bx + i * c - lw, by, lw * 2, gr * c * inE(env, 0.45, i * 0.02), bl);
    for (let j = 0; j <= gr; j++) g.r(bx, by + j * c - lw, gc * c * inE(env, 0.45, j * 0.03), lw * 2, bl);
    if (Pm.stars) for (const [i, j] of [[1, 1], [gc - 1, gr - 1]]) g.c(bx + i * c, by + j * c, c * 0.035, bl);
    let bb = null, idx = 0, cnt = 0;
    for (const l of lines) cnt += l.filter(ch => ch !== ' ').length;
    const redI = Pm.hasRed && cnt > 1 ? (Pm.red || 0) % cnt : -1;
    for (let r = 0; r < R; r++) {
      const l = lines[r], off = Math.floor((gc - l.length) / 2) + ((gc - l.length) % 2 ? 0.5 : 0);
      for (let q = 0; q < l.length; q++) {
        if (l[q] === ' ') continue;
        const x = bx + (off + q + 0.5) * c, y = by + (r + 1) * c, d = 0.05 + idx * 0.055, ep = inB(env, 0.32, d, 1.8), i = idx++;
        if (ep <= 0) continue;
        const gp = G(env, cl(ep * 3) * out), w2 = c * 0.39, h2 = c * 0.44;
        const r0 = pose(env, x, y, { s: lerp(1.7, 1, ep), rot: J.rs(cut.seed, i, 4) * 3 }, () => {
          const pts = [[x, y - h2], [x + w2 * 0.74, y - h2 * 0.58], [x + w2, y + h2], [x - w2, y + h2], [x - w2 * 0.74, y - h2 * 0.58]];
          gp.p(pts.map(p => [p[0] + c * 0.03, p[1] + c * 0.045]), darkest(sc), 0.35);
          gp.p(pts, C.fill); gp.pl(pts.concat([pts[0]]), J.mix(C.fill, ink, 0.45), lw * 2);
          return J.mainDraw(env, { text: l[q], font: Pm.font, size: c * 0.5, x, y: y + c * 0.06, color: i === redI ? C.acc : ink, mi: miAt(env, d + 0.04) + i * 0.5, noHold: true });
        });
        bb = UB(bb, r0);
      }
    }
    return bb;
  },
});

/* 11 のし紙 — gift wrapping paper: a red-and-white cord runs across and ties itself into a bow above the line */
reg('wzNoshi', {
  name: 'のし紙', en: 'Gift Wrap Cord', tags: ['pop', 'emotional', 'editorial'], ae: 'center', w: 1, treat: 'safe', fits: FIT,
  plan(rng, cut, st) { return { font: fontPick(rng, st), knot: rng.pick(['cho', 'cho', 'kiri']), emblem: rng.chance(0.75), strands: rng.int(3, 5) }; },
  render(env) {
    const { W, H, sc, cut, Pm, M, port, txt, out, lw } = base(env);
    const pw = W * (port ? 0.9 : 0.84), ph = H * (port ? 0.56 : 0.76), cx = W / 2, cy = H / 2, x0 = cx - pw / 2, y0 = cy - ph / 2, C = card(sc);
    const cA = C.acc, cB = plateCol(sc, [sc.accent2, sc.sub, sc.ink].filter(c => c !== cA), C.fill, 1.5), ky = y0 + ph * 0.3, ns = Pm.strands || 4, sp = ph * 0.011;
    const e = inE(env, 0.45), a = inC(env, 0.2) * out, g = G(env, a), e1 = E.inOutCubic(cl((env.lt - 0.1) / 0.45)), e2 = inB(env, 0.5, 0.42, 1.5);
    return pose(env, cx, cy, { s: 0.95 + 0.05 * e, dy: (1 - e) * M * 0.03 }, () => {
      g.r(x0 + M * 0.01, y0 + M * 0.014, pw, ph, darkest(sc), 0.3);
      g.r(x0, y0, pw, ph, C.fill);
      for (let s = 0; s < ns; s++) { const yy = ky + (s - (ns - 1) / 2) * sp * 2; g.r(x0, yy - sp * 0.5, pw / 2 * e1, sp, cB); g.r(x0 + pw - pw / 2 * e1, yy - sp * 0.5, pw / 2 * e1, sp, cA); }
      if (e2 > 0) MP(env, a * cl(e2 * 3), ctx => {
        const u = ph * 0.2 * e2; ctx.lineCap = 'round'; ctx.lineWidth = sp;
        for (let s = 0; s < 3; s++) {
          const q = 1 - s * 0.16;
          if (Pm.knot === 'kiri') {
            for (const d of [-1, 1]) { ctx.strokeStyle = d < 0 ? cA : cB; ctx.beginPath(); ctx.moveTo(cx, ky); ctx.quadraticCurveTo(cx + d * u * 0.5 * q, ky - u * 0.2, cx + d * u * (0.75 + s * 0.12), ky - u * (1.0 - s * 0.1)); ctx.stroke(); }
            ctx.strokeStyle = s % 2 ? cA : cB; ctx.beginPath(); ctx.ellipse(cx, ky, u * 0.42 * q, u * 0.3 * q, 0, 0, TAU); ctx.stroke();
          } else {
            for (const d of [-1, 1]) {
              ctx.strokeStyle = d < 0 ? cA : cB; ctx.beginPath(); ctx.moveTo(cx, ky);
              ctx.bezierCurveTo(cx + d * u * 0.5 * q, ky - u * 1.25 * q, cx + d * u * 1.75 * q, ky - u * 0.75 * q, cx + d * u * 1.3 * q, ky - u * 0.05);
              ctx.bezierCurveTo(cx + d * u * 0.95 * q, ky + u * 0.3 * q, cx + d * u * 0.4, ky + u * 0.12, cx, ky); ctx.stroke();
              ctx.strokeStyle = d < 0 ? cB : cA; ctx.beginPath(); ctx.moveTo(cx, ky); ctx.quadraticCurveTo(cx + d * u * 0.25, ky + u * 0.6, cx + d * u * (0.75 + s * 0.14), ky + u * (0.95 - s * 0.05)); ctx.stroke();
            }
          }
        }
        ctx.fillStyle = cA; ctx.fillRect(cx - u * 0.11, ky - u * 0.2, u * 0.22, u * 0.4);
      });
      if (Pm.emblem) { const eh = ph * 0.17 * inB(env, 0.4, 0.5), ew = eh * 0.34, ex = x0 + pw * (port ? 0.88 : 0.91), ey = y0 + ph * 0.14; g.p([[ex - ew / 2, ey - eh * 0.36], [ex, ey - eh / 2], [ex + ew / 2, ey - eh * 0.36], [ex + ew * 0.3, ey + eh / 2], [ex - ew * 0.3, ey + eh / 2]], cA); g.r(ex - ew * 0.09, ey - eh * 0.4, ew * 0.18, eh * 0.86, cB === cA ? C.fill : cB); }
      return fitMain(env, txt, Pm.font, cx, y0 + ph * 0.69, pw * 0.84, ph * 0.42, C.text, null, port ? 3 : 2, ph * 0.3, { mi: miAt(env, 0.3) });
    });
  },
});

/* 12 源氏雲 — stepped cloud bands with round ends slide in from both sides; the line sits in the gap between them */
reg('wzGenjiGumo', {
  name: '源氏雲', en: 'Cloud Bands', tags: ['calm', 'emotional', 'editorial'], ae: 'center', w: 1.1, fits: FIT,
  plan(rng, cut, st) { return { font: fontPick(rng, st), col: rng.pick(['accent', 'fg', 'accent']), side: rng.pick(['diag', 'anti', 'both']), dust: rng.chance(0.7), seed: rng.int(1, 1e6) }; },
  render(env) {
    const { W, H, sc, cut, Pm, M, port, txt, out, mo } = base(env);
    const gapH = H * (port ? 0.36 : 0.4), bhh = M * 0.07, sd = Pm.seed || 1;
    const c1 = Pm.col === 'fg' ? J.mix(sc.bg, sc.fg, 0.2) : J.mix(sc.bg, plateCol(sc, [sc.accent, sc.accent2, sc.fg], sc.bg, 1.3), 0.72), c2 = J.mix(c1, sc.bg, 0.4);
    const dust = J.mix(c1, sc.fg, 0.35);
    for (const top of [1, 0]) {
      const rows = Math.min(14, Math.ceil((H - gapH) / 2 / bhh) + 1);
      for (let r = 0; r < rows; r++) {
        // r = 0 is the row next to the gap (short); rows near the screen edge are long
        const f = r / Math.max(1, rows - 1), fromL = Pm.side === 'both' ? J.r(sd, top, r, 1) < 0.5 : (Pm.side === 'diag') === !!top;
        const len = W * cl(0.16 + 0.75 * Math.pow(f, 0.8) + 0.22 * J.rs(sd, top, r, 2), 0.1, 1.05);
        const e = inE(env, 0.7, 0.03 * (rows - r)) * out, drift = Math.sin(env.ltb * 0.5 + r * 1.3 + top * 2) * W * 0.012 * mo;
        const ll = len * e + drift * e; if (ll <= 2) continue;
        const y = top ? H / 2 - gapH / 2 - (r + 1) * bhh : H / 2 + gapH / 2 + r * bhh;
        const col = (r + top) % 3 === 2 ? c2 : c1;
        env.rrect(fromL ? -bhh : W - ll, y, ll + bhh, bhh + 1, bhh / 2, col, 1, false);
        if (Pm.dust && r < 4) for (let d = 0; d < 3; d++) { const dx = (fromL ? ll : W - ll) + (fromL ? 1 : -1) * bhh * (0.4 + 1.6 * J.r(sd, r, d, top)), ds = M * (0.004 + 0.006 * J.r(sd, d, r, 9)); env.rect(dx, y + bhh * J.r(sd, d, r, 5), ds, ds, dust, 0.8 * e, false); }
      }
    }
    return fitMain(env, txt, Pm.font, W / 2, H / 2, W * 0.84, gapH * 0.72, sc.fg, null, port ? 4 : 2, gapH * 0.5);
  },
});

/* 13 鳥居 — a shrine gate is raised (pillars, tie beam, curved top beam); the line stands between its pillars or beside it */
reg('wzTorii', {
  name: '鳥居', en: 'Torii Gate', tags: ['graphic', 'emotional', 'calm'], ae: 'center', w: 1, fits: FIT,
  plan(rng, cut, st) { return { font: fontPick(rng, st), pos: rng.pick(['in', 'in', 'side']), sun: rng.chance(0.5), flip: rng.chance(0.5) }; },
  render(env) {
    const { W, H, sc, cut, Pm, M, port, txt, out, lw } = base(env);
    const side = Pm.pos === 'side';
    let gw, gh, cx, y1, tb;
    if (!side) { gw = port ? W * 0.9 : Math.min(W * 0.68, H * 1.2); gh = port ? H * 0.6 : H * 0.84; cx = W / 2; y1 = H / 2 + gh / 2; }
    else if (port) { gw = W * 0.62; gh = H * 0.36; cx = W / 2; y1 = H * 0.46; }
    else { gw = Math.min(W * 0.36, H * 0.7); gh = H * 0.66; cx = Pm.flip ? W * 0.76 : W * 0.24; y1 = H / 2 + gh / 2; }
    const y0 = y1 - gh, red = plateCol(sc, [sc.accent, sc.accent2, sc.fg], sc.bg, 1.5);
    let cap = J.mix(darkest(sc), red, 0.15); if (J.contrast(cap, sc.bg) < 1.4) cap = J.mix(red, sc.fg, 0.45);
    const a = inC(env, 0.15) * out, g = G(env, a), pwd = gw * 0.058;
    const e1 = inE(env, 0.5), e2 = inE(env, 0.45, 0.18), e3 = inB(env, 0.45, 0.3, 1.3);
    if (Pm.sun) g.c(cx, y0 + gh * 0.42, gw * 0.3 * inE(env, 0.7), sc.dim, 0.8);
    g.r(cx - gw * 0.62 * e1, y1, gw * 1.24 * e1, lw * 2, sc.sub, 0.7);
    for (const s of [-1, 1]) {
      const xb = cx + s * gw * 0.36, xt = cx + s * gw * 0.335, top = lerp(y1, y0 + gh * 0.09, e1);
      const xtt = lerp(xb, xt, e1);
      g.p([[xb - pwd / 2, y1], [xb + pwd / 2, y1], [xtt + pwd * 0.44, top], [xtt - pwd * 0.44, top]], red);
      g.r(xb - pwd * 0.75, y1 - gh * 0.045 * e1, pwd * 1.5, gh * 0.045 * e1, cap);
    }
    const ny = y0 + gh * 0.25, nh = gh * 0.05;
    g.r(cx - gw * 0.43 * e2, ny, gw * 0.86 * e2, nh, red);
    if (e3 > 0) {
      const dy = -(1 - e3) * gh * 0.22, g3 = G(env, a * cl(e3 * 3)), th1 = gh * 0.04, th2 = gh * 0.05;
      const curve = (hw, yy, up) => Array.from({ length: 13 }, (_, i) => { const u = i / 12 * 2 - 1; return [cx + u * hw, yy - up * u * u + dy]; });
      const topE = curve(gw * 0.5, y0 + gh * 0.035, gh * 0.035), botE = curve(gw * 0.485, y0 + gh * 0.035 + th1, gh * 0.03).reverse();
      const top2 = curve(gw * 0.47, y0 + gh * 0.035 + th1, gh * 0.03), bot2 = curve(gw * 0.455, y0 + gh * 0.035 + th1 + th2, gh * 0.026).reverse();
      g3.p(top2.concat(bot2), red); g3.p(topE.concat(botE), cap);
      g3.r(cx - gw * 0.035, y0 + gh * 0.035 + th1 + th2 * 0.8 + dy, gw * 0.07, ny - (y0 + gh * 0.035 + th1 + th2 * 0.8), cap);
      g3.rs(cx - gw * 0.035, y0 + gh * 0.035 + th1 + th2 * 0.8 + dy, gw * 0.07, ny - (y0 + gh * 0.035 + th1 + th2 * 0.8), 0, red, lw * 2);
    }
    if (!side) { tb = ny + nh + gh * 0.04; return fitMain(env, txt, Pm.font, cx, (tb + y1 - gh * 0.07) / 2, gw * 0.6, (y1 - gh * 0.07 - tb) * 0.9, sc.fg, null, port ? 4 : 3, gh * 0.3, { mi: miAt(env, 0.2) }); }
    if (port) return fitMain(env, txt, Pm.font, W / 2, H * 0.71, W * 0.86, H * 0.34, sc.fg, null, 4, H * 0.14, { mi: miAt(env, 0.2) });
    return fitMain(env, txt, Pm.font, Pm.flip ? W * 0.33 : W * 0.67, H / 2, W * 0.52, H * 0.6, sc.fg, null, 3, H * 0.26, { mi: miAt(env, 0.2) });
  },
});

/* 14 団扇 — a round paper fan swings in on its handle and keeps fanning gently; the line is printed on its face */
reg('wzUchiwa', {
  name: '団扇', en: 'Round Fan', tags: ['pop', 'calm', 'emotional'], ae: 'circle', w: 1, treat: 'safe', fits: FIT,
  plan(rng, cut, st) { return { font: fontPick(rng, st), pat: rng.pick(['nami', 'maru', 'plain']), col: rng.pick(['paper', 'paper', 'accent']), dir: rng.pick([-1, 1]), ribs: rng.int(13, 19) }; },
  render(env) {
    const { W, H, sc, cut, Pm, M, port, txt, out, lw, mo } = base(env);
    const ry = port ? Math.min(W * 0.36, H * 0.26) : H * 0.36, rx = Math.min(ry * 1.3, W * 0.45), cx = W / 2, fy = H / 2 - ry * 0.24, C = card(sc);
    const fill = Pm.col === 'accent' ? plateCol(sc, [sc.accent, sc.ink, sc.fg]) : C.fill, ink = onCol(sc, fill), acc = plateCol(sc, [sc.accent, sc.accent2, sc.ink].filter(c => c !== fill), fill, 1.6);
    const wood = woodOf(sc), pvx = cx, pvy = fy + ry * 0.98, e = inB(env, 0.6, 0, 1.2), a = inC(env, 0.2) * out, g = G(env, a), dir = Pm.dir || 1;
    const rot = dir * (1 - e) * 55 + Math.sin(env.ltb * 2.1) * 2.4 * mo * cl(env.lt - 0.4) + dir * E.inCubic(env.pOut) * 30;
    return pose(env, pvx, pvy + ry * 0.55, { rot }, () => {
      g.r(pvx - ry * 0.045, pvy - ry * 0.1, ry * 0.09, ry * 0.72, wood);
      const face = arcP(cx, fy, rx, ry, 0, 360, 48);
      g.p(face.map(p => [p[0] + M * 0.008, p[1] + M * 0.012]), darkest(sc), 0.28);
      g.p(face, fill);
      MP(env, a, ctx => {
        ctx.beginPath(); ctx.ellipse(cx, fy, rx, ry, 0, 0, TAU); ctx.clip();
        if (Pm.pat === 'nami') { ctx.fillStyle = acc; for (let b = 0; b < 2; b++) { ctx.globalAlpha = a * (b ? 0.55 : 0.3); ctx.beginPath(); ctx.moveTo(cx - rx, fy + ry); for (let i = 0; i <= 40; i++) { const xx = cx - rx + rx * 2 * i / 40; ctx.lineTo(xx, fy + ry * (0.56 + b * 0.16) + Math.sin(i * 0.5 + b * 2 + env.ltb * 0.8 * mo) * ry * 0.05); } ctx.lineTo(cx + rx, fy + ry); ctx.closePath(); ctx.fill(); } }
        else if (Pm.pat === 'maru') { ctx.fillStyle = acc; ctx.globalAlpha = a * 0.3; ctx.beginPath(); ctx.arc(cx + rx * 0.5 * dir, fy - ry * 0.45, ry * 0.42, 0, TAU); ctx.fill(); }
        ctx.globalAlpha = a * 0.5; ctx.strokeStyle = J.mix(fill, ink, 0.25); ctx.lineWidth = lw * 1.2; ctx.beginPath();
        const nr = Pm.ribs || 15;
        for (let i = 0; i < nr; i++) { const th = (-78 + 156 * i / (nr - 1)) * DEG; ctx.moveTo(pvx, pvy); ctx.lineTo(pvx + Math.sin(th) * rx * 2.2, pvy - Math.cos(th) * ry * 2.2); }
        ctx.stroke();
        ctx.globalAlpha = a; ctx.fillStyle = sc.bg; ctx.beginPath(); ctx.ellipse(pvx, pvy, rx * 0.26, ry * 0.2, 0, 0, TAU); ctx.fill();
        ctx.strokeStyle = wood; ctx.lineWidth = lw * 1.6; ctx.beginPath();
        for (let i = 0; i < nr; i++) { const th = (-78 + 156 * i / (nr - 1)) * DEG; ctx.moveTo(pvx, pvy); ctx.lineTo(pvx + Math.sin(th) * rx * 0.3, pvy - Math.cos(th) * ry * 0.3); }
        ctx.stroke();
      });
      g.pl(face, J.mix(fill, ink, 0.5), lw * 2.5);
      g.r(pvx - ry * 0.045, pvy - ry * 0.02, ry * 0.09, ry * 0.1, wood);
      return fitMain(env, txt, Pm.font, cx, fy - ry * 0.1, rx * 1.36, ry * 0.86, ink, null, 3, ry * 0.56, { mi: miAt(env, 0.25), noHold: true });
    });
  },
});

/* 15 簾 — a bamboo blind covers the screen, rolls up to uncover the line and comes down again at the end */
reg('wzSudare', {
  name: 'すだれ', en: 'Bamboo Blind', tags: ['calm', 'emotional', 'graphic'], ae: 'center', w: 0.9, fits: FIT,
  enterBias: { cut: 1.6, blur: 1.2 },
  plan(rng, cut, st) { return { font: fontPick(rng, st), kind: rng.pick(['one', 'one', 'two']), lift: rng.range(0.24, 0.32), tassel: rng.chance(0.8) }; },
  render(env) {
    const { W, H, sc, cut, Pm, M, port, txt, out, lw } = base(env);
    const two = Pm.kind === 'two', lift = H * (Pm.lift || 0.28), top = H * 0.045, pitch = M * 0.02;
    const op = E.inOutCubic(cl((env.ltb - 0.08) / 0.75)) * (1 - E.inOutCubic(env.cut.outDur > 0 ? cl((env.ltb - (env.cut.dur - env.cut.outDur)) / env.cut.outDur) : 0));
    const yEnd = lift + (two ? H * 0.05 : 0) + pitch * 4.5;
    const bb = fitMain(env, txt, Pm.font, W / 2, (yEnd + H * 0.95) / 2, W * 0.84, (H * 0.95 - yEnd) * 0.74, sc.fg, null, port ? 4 : 2, M * 0.3, { mi: miAt(env, 0.35) });
    const slat = J.mix(sc.bg, plateCol(sc, [sc.sub, sc.fg], sc.bg, 1.3), 0.6), back = J.mix(sc.bg, slat, 0.45), thr = J.mix(slat, darkest(sc), 0.45), acc = plateCol(sc, [sc.accent, sc.accent2, sc.fg]);
    const a = cl(env.lt / 0.1) * (1 - cl((env.pOut - 0.92) / 0.08));
    const blinds = two ? [[W * 0.015, W * 0.475, 0], [W * 0.51, W * 0.475, H * 0.05]] : [[W * 0.015, W * 0.97, 0]];
    MP(env, a, ctx => {
      for (const [x, w, dl] of blinds) {
        const yb = lerp(H * 0.985, lift + dl, op), n = Math.min(120, Math.floor((yb - top) / pitch));
        ctx.fillStyle = back; ctx.fillRect(x, top, w, yb - top);
        ctx.fillStyle = slat; ctx.beginPath();
        for (let i = 0; i < n; i++) ctx.rect(x, top + i * pitch + pitch * 0.2, w, pitch * 0.6);
        ctx.fill();
        ctx.fillStyle = thr; for (const f of [0.08, 0.36, 0.64, 0.92]) ctx.fillRect(x + w * f - lw, top, lw * 2, yb - top);
        const rh = pitch * lerp(1.4, 3.6, op);
        ctx.fillStyle = J.mix(slat, darkest(sc), 0.25); ctx.beginPath(); ctx.roundRect(x - pitch * 0.3, yb - rh * 0.4, w + pitch * 0.6, rh, rh / 2); ctx.fill();
        ctx.fillStyle = acc; ctx.fillRect(x - pitch * 0.2, top - pitch * 1.3, w + pitch * 0.4, pitch * 1.6);
        if (Pm.tassel) for (const f of [0.22, 0.78]) {
          const tx = x + w * f, ty = yb + rh * 0.6;
          ctx.fillRect(tx - lw * 1.5, top, lw * 3, ty - top + pitch);
          ctx.beginPath(); ctx.arc(tx, ty + pitch * 1.4, pitch * 0.55, 0, TAU); ctx.fill();
          ctx.fillRect(tx - pitch * 0.42, ty + pitch * 1.7, pitch * 0.84, pitch * 2.2 * (0.4 + 0.6 * op));
        }
      }
    });
    return bb;
  },
});

/* ================================================================== DECOR */
const DU = env => Math.min(env.W, env.H) / 1080;
const MG = env => Math.min(env.W, env.H) * 0.05;
const visC = (env, c) => (c && J.contrast(c, env.sc.bg) >= 1.6 ? c : env.sc.fg);
const ACC = env => visC(env, env.sc.accent);
const COL = (env, p) => (p.accent ? ACC(env) : env.sc.fg);
const ein = (t, d = 0.4, delay = 0, ease = E.outExpo) => ease(cl((t - delay) / d));
const eback = (t, d = 0.4, delay = 0, s = 1.6) => { const k = cl((t - delay) / d); return k <= 0 ? 0 : k >= 1 ? 1 : E.outBack(k, s); };
const wrap = (v, m) => ((v % m) + m) % m;
const bwOf = bb => bb.x1 - bb.x0, bhOf = bb => bb.y1 - bb.y0;
const hit = (x0, y0, x1, y1, bb, pad = 0) => !(x1 < bb.x0 - pad || x0 > bb.x1 + pad || y1 < bb.y0 - pad || y0 > bb.y1 + pad);
/* lyric bbox: keep the last real one per cut so nothing jumps while the text is hidden or flying out */
const BBC = new WeakMap();
function getBB(env, bb) {
  if (env.pOut > 0 && env.cut && BBC.has(env.cut)) return BBC.get(env.cut);
  if (bb && isFinite(bb.x0 + bb.x1 + bb.y0 + bb.y1) && bb.x1 > bb.x0 && bb.y1 > bb.y0) {
    const b = { x0: Math.max(bb.x0, 0), x1: Math.min(bb.x1, env.W), y0: Math.max(bb.y0, 0), y1: Math.min(bb.y1, env.H) };
    if (b.x1 <= b.x0) { b.x0 = bb.x0; b.x1 = bb.x1; }
    if (b.y1 <= b.y0) { b.y0 = bb.y0; b.y1 = bb.y1; }
    b.cx = (b.x0 + b.x1) / 2; b.cy = (b.y0 + b.y1) / 2;
    if (env.cut) BBC.set(env.cut, b);
    return b;
  }
  const c = env.cut && BBC.get(env.cut);
  if (c) return c;
  const d = J.centerBB(env, null);
  return { x0: d.x0, x1: d.x1, y0: d.y0, y1: d.y1, cx: (d.x0 + d.x1) / 2, cy: (d.y0 + d.y1) / 2 };
}
/* a free w×h box next to the lyric or in a screen corner (ok = false when nothing is free) */
function spot(env, bb, w, h, p, gap) {
  const { W, H } = env, m = MG(env) * 0.7, sx = p.right ? 1 : -1, sy = p.low ? 1 : -1;
  const ord = [[sx, sy], [-sx, sy], [sx, -sy], [-sx, -sy]], near = [], cor = [];
  for (const [a, b] of ord) {
    near.push([a > 0 ? bb.x1 + gap : bb.x0 - gap - w, cl(bb.cy - h / 2, m, Math.max(m, H - m - h))]);
    near.push([cl(a > 0 ? bb.x1 - w : bb.x0, m, Math.max(m, W - m - w)), b > 0 ? bb.y1 + gap : bb.y0 - gap - h]);
    cor.push([a > 0 ? W - m - w : m, b > 0 ? H - m - h : m]);
  }
  const all = p.corner ? cor.concat(near) : near.concat(cor);
  for (const [x, y] of all) {
    if (x < m - 1 || y < m - 1 || x + w > W - m + 1 || y + h > H - m + 1) continue;
    if (!hit(x, y, x + w, y + h, bb, gap * 0.4)) return { x, y, ok: true };
  }
  return { x: 0, y: 0, ok: false };
}
/* spot() with the box shrunk step by step until it fits; returns {x, y, k} or null */
function spotFit(env, bb, w, h, p, gap) {
  for (const k of [1, 0.78, 0.6, 0.46]) { const s = spot(env, bb, w * k, h * k, p, gap * k); if (s.ok) return { x: s.x, y: s.y, k }; }
  return null;
}
/* registration: main-pass graphics that start once the entrance has mostly settled */
function D(key, name, en, tags, w, ae, layer, fn, extra) {
  J.register('decor', key, Object.assign({
    name, en, tags, w, ae, layer, wa: true,
    draw(env, bb0, p) {
      if (env.pass !== 'main') return;
      const s = cl(((env.cut && env.cut.inDur) || 0) * 0.5, 0, 0.3), t = env.lt - s;
      if (!(t > 0)) return;
      const o = 1 - E.inCubic(env.pOut || 0); if (o <= 0.003) return;
      const q = Object.assign({ n: 1, v: 0, r: 0.5, seed: 1 }, p); q.n = cl(q.n | 0, 1, 3); q.v = q.v | 0;
      const ctx = env.ctx; ctx.save();
      try { fn(env, ctx, getBB(env, bb0), q, t, o, DU(env), env.fx ? env.fx.motion : 0.6); } finally { ctx.restore(); }
    },
  }, extra || {}), P);
}
const polyFill = (ctx, pts) => { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.closePath(); ctx.fill(); };
/* 雪輪: a ring with six small notches */
const yukiwaPath = (ctx, x, y, R, rot) => {
  const N = 84;
  for (let i = 0; i <= N; i++) {
    const th = i / N * TAU, u = (th / (TAU / 6)) % 1, d = Math.min(u, 1 - u) * (TAU / 6), r = R * (1 - 0.17 * Math.exp(-(d / 0.075) * (d / 0.075)));
    const px = x + Math.cos(th + rot) * r, py = y + Math.sin(th + rot) * r;
    if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
  }
  ctx.closePath();
};

/* 七宝 — a window (round, band or panel) of interlocking circles that wipes open; the knots pulse */
D('wzShippo', '七宝', 'Interlocked Circles', ['calm', 'graphic', 'editorial'], 1, 'grid', 'front', (env, ctx, bb, p, t, o, u, mo) => {
  const r = 30 * u * (p.big ? 1.3 : 1), shape = p.v % 3;
  const w0 = shape === 0 ? r * 6.2 : shape === 1 ? cl(bwOf(bb) * 0.8, r * 8, env.W * 0.7) : r * 8, h0 = shape === 0 ? r * 6.2 : shape === 1 ? r * 3 : r * 4.4;
  const sp = spotFit(env, bb, w0, h0, p, 26 * u); if (!sp) return;
  const w = w0 * sp.k, h = h0 * sp.k, x0 = sp.x, y0 = sp.y, e = ein(t, 0.6, 0, E.inOutCubic), c = COL(env, p), ac = p.accent ? env.sc.fg : ACC(env);
  const outline = () => { ctx.beginPath(); if (shape === 0) ctx.arc(x0 + w / 2, y0 + h / 2, w / 2 * e, 0, TAU); else ctx.rect(p.right ? x0 + w * (1 - e) : x0, y0, w * e, h); };
  outline(); ctx.save(); ctx.clip();
  const ox = wrap(env.ltb * 7 * u * mo, 2 * r), ni = Math.min(60, Math.ceil(w / r) + 3), nj = Math.min(40, Math.ceil(h / r) + 3);
  ctx.globalAlpha = 0.85 * o; ctx.strokeStyle = c; ctx.lineWidth = 2 * u; ctx.beginPath();
  for (let j = -1; j < nj; j++) for (let i = -2; i < ni; i++) { if ((i + j) & 1) continue; const x = x0 + i * r + ox, y = y0 + j * r; ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, TAU); }
  ctx.stroke();
  ctx.fillStyle = ac; ctx.beginPath();
  for (let j = -1; j < nj; j++) for (let i = -2; i < ni; i++) { if ((i + j) & 1) continue; const x = x0 + i * r + ox, y = y0 + j * r, d = r * 0.17 * (1 + 0.35 * Math.sin(env.ltb * 2.2 + (i + j) * 0.7)); ctx.moveTo(x + d, y); ctx.arc(x, y, d, 0, TAU); }
  ctx.fill();
  ctx.restore();
  ctx.globalAlpha = o; ctx.strokeStyle = c; ctx.lineWidth = 3 * u; outline(); ctx.stroke();
});

/* 矢絣 — strips of arrow-feather chevrons beside the lyric (above / below it when the sides are full), scrolling in opposite directions */
D('wzYagasuri', '矢絣', 'Arrow Feather Strips', ['graphic', 'pop', 'editorial'], 1, 'stripes', 'front', (env, ctx, bb, p, t, o, u, mo) => {
  const { W, H } = env, m = MG(env) * 0.7, sw = 46 * u * (p.big ? 1.3 : 1), gap = 14 * u, g0 = 30 * u;
  let horiz = false, plus = !!p.right;
  const fr = [W - m - bb.x1 - g0, bb.x0 - g0 - m, H - m - bb.y1 - g0, bb.y0 - g0 - m];
  if ((plus ? fr[0] : fr[1]) < sw) plus = !plus;
  let free = plus ? fr[0] : fr[1];
  if (free < sw) { horiz = true; plus = !!p.low; if ((plus ? fr[2] : fr[3]) < sw) plus = !plus; free = plus ? fr[2] : fr[3]; if (free < sw) return; }
  const n = Math.max(1, Math.min(p.n, Math.floor((free + gap) / (sw + gap)))), AM = horiz ? W : H;
  const h = horiz ? cl(bwOf(bb) * 1.02, 280 * u, W - m * 2) : cl(bhOf(bb) * 1.25, 280 * u, H * 0.8), mid = cl(horiz ? bb.cx : bb.cy, h / 2 + m, Math.max(h / 2 + m, AM - h / 2 - m));
  const c = COL(env, p), ph = sw * 0.8, e0 = horiz ? (plus ? bb.y1 : bb.y0) : (plus ? bb.x1 : bb.x0);
  for (let k = 0; k < n; k++) {
    const ec = e0 + (plus ? 1 : -1) * (g0 + sw / 2 + k * (sw + gap)), e = ein(t, 0.55, k * 0.09), hh = h * e, dir = k % 2 ? -1 : 1, x0 = -sw / 2;
    if (hh < 2) continue;
    ctx.save();
    if (horiz) { ctx.translate(mid, ec); ctx.rotate(-Math.PI / 2); } else ctx.translate(ec, mid);
    ctx.globalAlpha = o; ctx.fillStyle = c; ctx.fillRect(x0 - 3 * u, -hh / 2, 2 * u, hh); ctx.fillRect(x0 + sw + u, -hh / 2, 2 * u, hh);
    ctx.beginPath(); ctx.rect(x0, -hh / 2, sw, hh); ctx.clip();
    const off = wrap(env.ltb * 22 * u * mo * dir, ph * 2), sl = dir * sw * 0.5, gp = 1.5 * u;
    ctx.globalAlpha = 0.85 * o; ctx.fillStyle = k === 1 && !p.accent ? ACC(env) : c; ctx.beginPath();
    for (let r = 0, y = -h / 2 - ph * 6 + off; r < 80 && y < h / 2 + ph * 2; r++, y += ph * 2) {
      ctx.moveTo(x0, y); ctx.lineTo(-gp, y + sl); ctx.lineTo(-gp, y + sl + ph); ctx.lineTo(x0, y + ph); ctx.closePath();
      ctx.moveTo(x0 + sw, y); ctx.lineTo(gp, y + sl); ctx.lineTo(gp, y + sl + ph); ctx.lineTo(x0 + sw, y + ph); ctx.closePath();
    }
    ctx.fill(); ctx.restore();
  }
});

/* 鱗 — rows of scale triangles under (or over) the lyric that pop up one by one and shimmer */
D('wzUroko', '鱗文', 'Scale Triangles', ['graphic', 'pop', 'glitch'], 1, 'shapes', 'front', (env, ctx, bb, p, t, o, u, mo) => {
  const { W, H } = env, m = MG(env) * 0.7, b = 42 * u * (p.big ? 1.3 : 1), th = b * 0.82, g0 = 24 * u;
  const roomB = H - m - bb.y1 - g0, roomT = bb.y0 - g0 - m;
  let low = !!p.low; if ((low ? roomB : roomT) < th) low = !low;
  const room = low ? roomB : roomT; if (room < th) return;
  const rows = Math.max(1, Math.min(p.n, Math.floor(room / th))), wd = cl(bwOf(bb), 5 * b, W - m * 2), n = Math.min(48, Math.floor(wd / b));
  const x0 = cl(bb.cx - n * b / 2, m, Math.max(m, W - m - n * b)), c = COL(env, p), ac = p.accent ? env.sc.fg : ACC(env);
  for (let r = 0; r < rows; r++) {
    const cnt = n - (r % 2), yb = low ? bb.y1 + g0 + (r + 1) * th : bb.y0 - g0 - r * th;
    ctx.fillStyle = r % 2 ? ac : c;
    for (let i = 0; i < cnt; i++) {
      const idx = p.right ? cnt - 1 - i : i, e = eback(t, 0.3, idx * 0.022 + r * 0.1) * o; if (e <= 0) continue;
      const cx = x0 + (i + 0.5 + (r % 2) * 0.5) * b, cyy = yb - th / 3, hw = b / 2 * e;
      ctx.globalAlpha = Math.min(1, o * (0.62 + 0.38 * Math.sin(env.ltb * 3 * (0.4 + mo) - idx * 0.5 - r)));
      ctx.beginPath(); ctx.moveTo(cx, cyy - th * 2 / 3 * e); ctx.lineTo(cx + hw, cyy + th / 3 * e); ctx.lineTo(cx - hw, cyy + th / 3 * e); ctx.closePath(); ctx.fill();
    }
  }
});

/* 水引 — a red-and-white cord knot (three interlocked loops and two tails) tying itself beside the lyric */
D('wzMizuhiki', '水引', 'Gift Cord Knot', ['pop', 'emotional', 'calm'], 0.9, 'shapes', 'front', (env, ctx, bb, p, t, o, u, mo) => {
  const s0 = 112 * u * (p.big ? 1.25 : 1), sp = spotFit(env, bb, s0 * 3.1, s0 * 2.1, p, 26 * u); if (!sp) return;
  const s = s0 * sp.k, cx = sp.x + s * 1.55, cy = sp.y + s * 1.1 + Math.sin(env.ltb * 1.4) * 3 * u * mo, cA = ACC(env), cB = env.sc.fg === cA ? env.sc.sub : env.sc.fg;
  ctx.lineCap = 'round'; ctx.lineWidth = 4.2 * u * Math.max(0.7, sp.k); ctx.globalAlpha = o;
  const e1 = ein(t, 0.7, 0, E.inOutCubic), e2 = ein(t, 0.5, 0.35, E.outCubic);
  for (let k = 0; k < 3; k++) {
    const q = 1 - k * 0.17;
    for (const d of [-1, 1]) {
      ctx.strokeStyle = d < 0 ? cA : cB;
      ctx.beginPath(); ctx.ellipse(cx + d * s * 0.47, cy + s * 0.1, s * 0.5 * q, s * 0.37 * q, d * 0.42, d < 0 ? 0 : Math.PI, (d < 0 ? 0 : Math.PI) + TAU * e1); ctx.stroke();
      if (e2 > 0) { ctx.beginPath(); ctx.moveTo(cx + d * s * 0.2, cy + s * 0.42); ctx.quadraticCurveTo(cx + d * s * (0.9 + k * 0.05), cy + s * (0.75 - k * 0.1), cx + d * lerp(0.2, 1.4 + k * 0.05, e2) * s, cy + lerp(0.42, -0.15 - k * 0.14, e2 * e2) * s); ctx.stroke(); }
    }
    ctx.strokeStyle = k % 2 ? cA : cB;
    ctx.beginPath(); ctx.ellipse(cx, cy - s * 0.3, s * 0.52 * q, s * 0.42 * q, 0, Math.PI / 2, Math.PI / 2 + TAU * e1); ctx.stroke();
  }
});

/* 流水 — bundles of staggered parallel water lines flowing behind the lower edge of the lyric, each ending in a curl */
D('wzRyusui', '流水', 'Flowing Water', ['calm', 'emotional', 'editorial'], 1, 'waveform', 'back', (env, ctx, bb, p, t, o, u, mo) => {
  const { W } = env, L = 3 + p.n, xa = Math.max(-20 * u, bb.x0 - 200 * u), xb = Math.min(W + 20 * u, bb.x1 + 200 * u), len = xb - xa, sp = 26 * u * (p.big ? 1.3 : 1), sub = visC(env, env.sc.sub);
  const y0 = (p.low ? bb.y1 : bb.y0) - (L - 1) * sp / 2, lam = 150 * u, A = 15 * u, ph = env.ltb * 0.9 * (0.3 + mo) * (p.right ? -1 : 1);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (let i = 0; i < L; i++) {
    const s0 = xa + len * 0.28 * J.r(p.seed, i, 1), s1 = xb - len * 0.28 * J.r(p.seed, i, 2), e = ein(t, 0.8, i * 0.07, E.inOutCubic), xe = lerp(s0, s1, e);
    if (xe - s0 < 4) continue;
    const yy = x => y0 + i * sp + A * Math.sin(x / lam + ph + i * 0.25) + A * 0.4 * Math.sin(x / lam * 2.3 - ph * 0.7);
    ctx.globalAlpha = (i === 1 ? 0.8 : 0.55) * o; ctx.strokeStyle = i === 1 ? ACC(env) : sub; ctx.lineWidth = (i % 2 ? 2.6 : 3.8) * u;
    ctx.beginPath(); ctx.moveTo(s0, yy(s0));
    for (let x = s0 + 14 * u, g = 0; x < xe && g < 400; x += 14 * u, g++) ctx.lineTo(x, yy(x));
    const ex = xe, ey = yy(xe); ctx.lineTo(ex, ey);
    if (i % 2 === 0) { const cr = 16 * u * e; for (let a = 0; a <= 16; a++) { const an = a / 16 * 4.6, rr = cr * (1 - a / 22); ctx.lineTo(ex + Math.sin(an) * rr, ey - cr + Math.cos(an) * rr + (cr - rr) * 0.4); } }
    ctx.stroke();
  }
}, { subtle: true });

/* 雪輪 — notched snow-ring crests that bloom around the lyric and turn slowly */
D('wzYukiwa', '雪輪', 'Snow Rings', ['calm', 'emotional', 'pop'], 1, 'rings', 'back', (env, ctx, bb, p, t, o, u, mo) => {
  const { W, H } = env, n = 2 + p.n, m = MG(env), c = COL(env, p);
  for (let k = 0; k < n; k++) {
    const R = (46 + 60 * J.r(p.seed, k, 1)) * u * (p.big ? 1.3 : 1), a = (k / n + p.r) * TAU + J.rs(p.seed, k, 2) * 0.3, e = eback(t, 0.5, k * 0.1, 1.3); if (e <= 0) continue;
    const x = cl(bb.cx + Math.cos(a) * (bwOf(bb) / 2 + R * 1.05), m + R, W - m - R), y = cl(bb.cy + Math.sin(a) * (bhOf(bb) / 2 + R * 1.05), m + R, H - m - R) + Math.sin(env.ltb * 0.9 + k * 2) * 6 * u * mo;
    const rot = (k % 2 ? -1 : 1) * env.ltb * 0.16 * (0.3 + mo) + k;
    ctx.beginPath(); yukiwaPath(ctx, x, y, R * e, rot);
    ctx.globalAlpha = 0.12 * o; ctx.fillStyle = c; ctx.fill();
    ctx.globalAlpha = 0.6 * o; ctx.strokeStyle = c; ctx.lineWidth = 2.2 * u; ctx.stroke();
    ctx.globalAlpha = 0.5 * o; ctx.strokeStyle = k === 0 ? ACC(env) : c; ctx.lineWidth = 2 * u; ctx.beginPath();
    for (let i = 0; i < 6; i++) { const an = rot + i / 6 * TAU; ctx.moveTo(x + Math.cos(an) * R * 0.2 * e, y + Math.sin(an) * R * 0.2 * e); ctx.lineTo(x + Math.cos(an) * R * 0.62 * e, y + Math.sin(an) * R * 0.62 * e); }
    ctx.stroke();
    ctx.fillStyle = k === 0 ? ACC(env) : c; ctx.beginPath(); ctx.arc(x, y, R * 0.1 * e, 0, TAU); ctx.fill();
  }
});

/* 千鳥 — a flock of plump plover silhouettes flapping along an arc over the lyric */
D('wzChidori', '千鳥', 'Plovers', ['pop', 'calm', 'emotional'], 1, 'sparks', 'front', (env, ctx, bb, p, t, o, u, mo) => {
  const { W, H } = env, m = MG(env) * 0.7, n = 2 + p.n, sz = 44 * u * (p.big ? 1.25 : 1), need = sz * 2.9;
  let up = !p.low; if ((up ? bb.y0 - m : H - m - bb.y1) < need) up = !up;
  if ((up ? bb.y0 - m : H - m - bb.y1) < need) return;
  const yb = up ? bb.y0 - sz * 1.1 : bb.y1 + sz * 1.9, xa = Math.max(m + sz, bb.x0 - 60 * u), xb = Math.min(W - m - sz, bb.x1 + 60 * u), dir = p.right ? 1 : -1, c = COL(env, p);
  for (let k = 0; k < n; k++) {
    const f = wrap((k + 0.5) / n + env.ltb * 0.03 * (0.3 + mo), 1), e = eback(t, 0.4, k * 0.08) * o * cl(Math.sin(f * Math.PI) * 4); if (e <= 0.01) continue;
    const x = dir > 0 ? lerp(xa, xb, f) : lerp(xb, xa, f), y = yb - Math.sin(f * Math.PI) * sz * 0.6 * (up ? 1 : -0.5) + Math.sin(env.ltb * 2.3 + k * 1.7) * 5 * u * mo;
    const s = sz * (0.8 + 0.4 * J.r(p.seed, k, 1)) * e, fl = 1 + 0.3 * Math.sin(env.ltb * 7 * (0.4 + mo) + k * 2.1);
    ctx.save(); ctx.translate(x, y); ctx.scale(dir * s, s); ctx.rotate(-0.15 + 0.1 * Math.sin(env.ltb * 1.6 + k));
    ctx.globalAlpha = Math.min(1, e); ctx.fillStyle = k === 1 ? ACC(env) : c;
    ctx.beginPath(); ctx.arc(0, 0, 0.5, 0, TAU); ctx.fill();
    polyFill(ctx, [[0.4, -0.16], [0.92, -0.02], [0.4, 0.14]]);
    polyFill(ctx, [[-0.05, -0.3], [-0.5, -1.15 * fl], [0.32, -0.4]]);
    polyFill(ctx, [[-0.28, -0.25], [-1.2, -0.62 * fl], [-0.38, 0.12]]);
    polyFill(ctx, [[-0.36, 0.1], [-0.98, 0.42], [-0.25, 0.42]]);
    ctx.fillStyle = env.sc.bg; ctx.beginPath(); ctx.arc(0.2, -0.12, 0.08, 0, TAU); ctx.fill();
    ctx.restore();
  }
});

/* corner region that does not touch the lyric: {x, y (the corner), sx, sy (inward directions), w, h} or null */
function cornerBox(env, bb, p, S, u) {
  const { W, H } = env; let best = null;
  for (const [r, l] of [[p.right, p.low], [!p.right, p.low], [p.right, !p.low], [!p.right, !p.low]]) {
    const ax = (r ? W - bb.x1 : bb.x0) - 22 * u, ay = (l ? H - bb.y1 : bb.y0) - 22 * u, sc = Math.max(ax, ay);
    if (!best || (sc > best.sc * 1.6 && best.sc < 150 * u)) best = { sc, ax, ay, r, l };
  }
  if (!best || best.sc < 90 * u) return null;
  const byX = best.ax >= best.ay;
  return { x: best.r ? W : 0, y: best.l ? H : 0, sx: best.r ? -1 : 1, sy: best.l ? -1 : 1, w: byX ? Math.min(S, best.ax) : Math.min(S, W * 0.5), h: byX ? Math.min(S, H * 0.5) : Math.min(S, best.ay) };
}
/* 梅の枝 — an angular plum branch grows out of a corner and its five-petal blossoms open one by one */
D('wzUme', '梅の枝', 'Plum Branch', ['emotional', 'calm', 'pop'], 1, 'leaders', 'front', (env, ctx, bb, p, t, o, u, mo) => {
  const cb = cornerBox(env, bb, p, 400 * u * (p.big ? 1.25 : 1), u); if (!cb) return;
  const X = (ux, uy) => [cb.x + cb.sx * ux * cb.w, cb.y + cb.sy * uy * cb.h], k = Math.min(cb.w, cb.h) / (400 * u), br = env.sc.sub, c = ACC(env);
  const paths = [[[0, 0.1], [0.3, 0.2], [0.5, 0.42], [0.78, 0.5], [0.93, 0.74]], [[0.3, 0.2], [0.44, 0.06], [0.66, 0.1]], [[0.5, 0.42], [0.42, 0.66], [0.52, 0.88]], [[0.78, 0.5], [0.95, 0.4]]];
  ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = br; ctx.globalAlpha = 0.95 * o;
  paths.forEach((pa, pi) => {
    const e = ein(t, 0.7, pi ? 0.25 + pi * 0.1 : 0, E.inOutCubic) * (pa.length - 1); if (e <= 0) return;
    for (let i = 0; i < pa.length - 1; i++) {
      const f = cl(e - i); if (f <= 0) break;
      const a = X(pa[i][0], pa[i][1]), b = X(pa[i + 1][0], pa[i + 1][1]);
      ctx.lineWidth = Math.max(1.5, (pi ? 7 : 13) * u * Math.max(0.5, k) * (1 - i * 0.2));
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(lerp(a[0], b[0], f), lerp(a[1], b[1], f)); ctx.stroke();
    }
  });
  const fl = [[0.93, 0.74, 1], [0.66, 0.1, 0.9], [0.52, 0.88, 0.85], [0.5, 0.42, 0.75], [0.3, 0.2, 0.6], [0.95, 0.4, 0.7], [0.78, 0.5, 0.5], [0.42, 0.66, 0.45], [0.44, 0.06, 0.4]];
  fl.forEach((f, i) => {
    const e = eback(t, 0.4, 0.55 + i * 0.08) * o; if (e <= 0) return;
    const q = X(f[0], f[1]), R = 34 * u * Math.max(0.6, k) * f[2] * e, rot = i * 1.3 + Math.sin(env.ltb * 1.2 + i) * 0.12 * mo;
    ctx.globalAlpha = Math.min(1, o); ctx.fillStyle = c;
    if (f[2] < 0.55) { ctx.beginPath(); ctx.arc(q[0], q[1], R * 0.75, 0, TAU); ctx.fill(); return; }
    ctx.beginPath();
    for (let j = 0; j < 5; j++) { const an = rot + j / 5 * TAU, px = q[0] + Math.cos(an) * R * 0.62, py = q[1] + Math.sin(an) * R * 0.62; ctx.moveTo(px + R * 0.56, py); ctx.arc(px, py, R * 0.56, 0, TAU); }
    ctx.fill();
    ctx.fillStyle = env.sc.bg; ctx.beginPath();
    for (let j = 0; j < 5; j++) { const an = rot + (j + 0.5) / 5 * TAU; ctx.moveTo(q[0] + Math.cos(an) * R * 0.34 + R * 0.07, q[1] + Math.sin(an) * R * 0.34); ctx.arc(q[0] + Math.cos(an) * R * 0.34, q[1] + Math.sin(an) * R * 0.34, R * 0.07, 0, TAU); }
    ctx.moveTo(q[0] + R * 0.13, q[1]); ctx.arc(q[0], q[1], R * 0.13, 0, TAU);
    ctx.fill();
  });
});

/* 竹 — bamboo stalks grow up joint by joint in the margin beside the lyric (faint, behind it, when there is no margin); leaves sway at the joints */
D('wzTake', '若竹', 'Bamboo Stalks', ['calm', 'graphic', 'emotional'], 1, 'bars', 'back', (env, ctx, bb, p, t, o, u, mo) => {
  const { W, H } = env, g0 = 26 * u, freeR = W - bb.x1 - g0, freeL = bb.x0 - g0;
  let right = !!p.right; if ((right ? freeR : freeL) < 80 * u && (right ? freeL : freeR) >= 80 * u) right = !right;
  const free = right ? freeR : freeL, tight = free < 80 * u, al = tight ? 0.26 : 0.9;
  const n = tight ? Math.min(p.n, 2) : Math.max(1, Math.min(p.n, Math.floor((free - 20 * u) / (64 * u)))), c = COL(env, p), lc = p.accent ? env.sc.fg : ACC(env), dir = right ? -1 : 1;
  for (let k = 0; k < n; k++) {
    const x = (right ? W : 0) + dir * (38 * u + k * 64 * u), sw = (28 - k * 5) * u * (p.big ? 1.25 : 1), top = H * (0.07 + 0.13 * k + 0.05 * J.r(p.seed, k, 1)), seg = (150 + 30 * J.r(p.seed, k, 2)) * u;
    const full = H - top, hh = full * ein(t, 0.9, k * 0.12, E.outCubic), yTop = H - hh;
    ctx.globalAlpha = al * o; ctx.fillStyle = c;
    for (let j = 0, y = H + seg * 0.3 * J.r(p.seed, k, 3); j < 20 && y > yTop; j++, y -= seg) {
      const y1 = Math.max(yTop, y - seg + 5 * u); if (y - y1 > 1) ctx.fillRect(x - sw / 2, y1, sw, y - y1);
      if (y - seg > yTop) ctx.fillRect(x - sw * 0.62, y - seg - 1 * u, sw * 1.24, 5 * u);
      // leaves on every other joint, pointing into the free margin
      if (j % 2 === (k % 2) && y - seg > yTop + 10 * u && y - seg < H - 40 * u) {
        const ly = y - seg + 2 * u, le = cl((hh - (H - ly)) / (60 * u)), ll = (tight ? 90 * u : Math.min(120 * u, free - (38 + k * 64 + 4) * u)) * le;
        if (ll < 20 * u) continue;
        ctx.fillStyle = lc;
        for (let q = 0; q < 3; q++) {
          const an = (dir > 0 ? 0 : Math.PI) + dir * (-0.3 + q * 0.45) + Math.sin(env.ltb * 1.5 + k + q + j) * 0.07 * mo, ca = Math.cos(an), sa = Math.sin(an), l2 = ll * (1 - q * 0.14), wv = l2 * 0.15;
          ctx.beginPath(); ctx.moveTo(x, ly); ctx.quadraticCurveTo(x + ca * l2 * 0.5 - sa * wv, ly + sa * l2 * 0.5 + ca * wv, x + ca * l2, ly + sa * l2); ctx.quadraticCurveTo(x + ca * l2 * 0.5 + sa * wv, ly + sa * l2 * 0.5 - ca * wv, x, ly); ctx.fill();
        }
        ctx.fillStyle = c;
      }
    }
  }
});

/* 風車 — paper pinwheels on sticks that pop up beside the lyric and keep spinning */
D('wzKazaguruma', '風車', 'Pinwheels', ['pop', 'calm', 'emotional'], 0.9, 'shapes', 'front', (env, ctx, bb, p, t, o, u, mo) => {
  const s0 = 66 * u * (p.big ? 1.25 : 1), n = p.n, sp = spotFit(env, bb, n * s0 * 2.3, s0 * 3.5, p, 24 * u); if (!sp) return;
  const s = s0 * sp.k, cA = ACC(env), cB = env.sc.fg === cA ? env.sc.sub : env.sc.fg;
  for (let k = 0; k < n; k++) {
    const cx = sp.x + s * 1.15 + k * s * 2.3, cy = sp.y + s * (1.1 + (k % 2) * 0.35), e = eback(t, 0.45, k * 0.12); if (e <= 0) continue;
    ctx.globalAlpha = o; ctx.strokeStyle = env.sc.sub; ctx.lineWidth = 4 * u * Math.max(0.7, sp.k); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx, cy + s * (2.3 - (k % 2) * 0.35) * ein(t, 0.4, k * 0.12)); ctx.stroke();
    const rot = (k % 2 ? -1 : 1) * (env.ltb * 3.4 * (0.25 + mo) + (1 - ein(t, 1.2, k * 0.12, E.outCubic)) * 5) + k;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot); ctx.scale(e, e);
    for (let b = 0; b < 4; b++) {
      ctx.rotate(Math.PI / 2);
      ctx.fillStyle = (b + k) % 2 ? cA : cB; polyFill(ctx, [[0, 0], [s, 0], [s * 0.5, s * 0.5]]);
      ctx.globalAlpha = o * 0.55; polyFill(ctx, [[0, 0], [s * 0.5, s * 0.5], [0, s * 0.5]]); ctx.globalAlpha = o;
    }
    ctx.fillStyle = env.sc.bg; ctx.beginPath(); ctx.arc(0, 0, s * 0.13, 0, TAU); ctx.fill();
    ctx.fillStyle = cA; ctx.beginPath(); ctx.arc(0, 0, s * 0.07, 0, TAU); ctx.fill();
    ctx.restore();
  }
});

/* ================================================================== BACKGROUNDS */
const Umin = env => Math.min(env.W, env.H);
const bs = rng => rng.int(1, 1e9);
const A = (c, a) => J.rgba(c, Math.round(cl(a) * 1000) / 1000);
/* time since this background started (consecutive cuts sharing the same bg + seed count as one run) */
const bgRun = new WeakMap();
const bgT = env => {
  const c = env.cut; if (!c) return env.t;
  let s = bgRun.get(c);
  if (s == null) {
    s = c.start;
    const cs = (env.plan && env.plan.cuts) || [], P0 = c.bgP || {};
    for (let i = (c.index | 0) - 1; i >= 0 && i < cs.length; i--) { const q = cs[i]; if (q.bg === c.bg && (q.bgP || {}).seed === P0.seed && Math.abs(q.end - s) < 0.06) s = q.start; else break; }
    bgRun.set(c, s);
  }
  return env.t - s;
};
const fadeIn = (env, d = 0.7) => E.outCubic(cl(bgT(env) / d));
const bg = (k, d) => J.register('bg', k, Object.assign({ wa: true }, d, { draw(env, Q) { const ctx = env.ctx; ctx.save(); try { d.draw(env, Q || {}, ctx); } finally { ctx.restore(); } } }), P);

/* 七宝つなぎ — a drifting field of interlocking circles; the knots swell in a slow travelling wave */
bg('wzBgShippo', { name: '七宝つなぎ', en: 'Circle Chain Field', tags: ['calm', 'editorial', 'emotional'], w: 0.9, subtle: true,
  plan: rng => ({ seed: bs(rng), r: rng.range(0.065, 0.09), k: rng.range(0.07, 0.095), dx: rng.pick([1, -1]), acc: rng.chance(0.4) }),
  draw(env, Q, ctx) {
    const { W, H, sc } = env, t = env.t, r = Umin(env) * (Q.r || 0.08), k = Q.k || 0.08, e = fadeIn(env);
    const ox = wrap(t * r * 0.1 * (Q.dx || 1), 2 * r) - 2 * r, oy = wrap(t * r * 0.06, 2 * r) - 2 * r, ni = Math.min(90, Math.ceil(W / r) + 5), nj = Math.min(90, Math.ceil(H / r) + 5);
    ctx.globalAlpha = e; ctx.strokeStyle = A(sc.fg, k); ctx.lineWidth = Math.max(1.2, r * 0.035); ctx.beginPath();
    for (let j = 0; j < nj; j++) for (let i = 0; i < ni; i++) { if ((i + j) & 1) continue; const x = ox + i * r, y = oy + j * r; ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, TAU); }
    ctx.stroke();
    ctx.fillStyle = A(Q.acc ? sc.accent : sc.fg, k * 1.2); ctx.beginPath();
    for (let j = 0; j < nj; j++) for (let i = 0; i < ni; i++) { if ((i + j) & 1) continue; const x = ox + i * r, y = oy + j * r, d = r * (0.1 + 0.12 * (0.5 + 0.5 * Math.sin(t * 0.9 - (x + y * 0.6) / (r * 5)))) * e; ctx.moveTo(x + d, y); ctx.arc(x, y, d, 0, TAU); }
    ctx.fill();
  } });

/* 紗綾形 — linked-manji key fret set on the diagonal; the lattice slides along itself and the line weight breathes */
bg('wzBgSayagata', { name: '紗綾形', en: 'Key Fret Pattern', tags: ['editorial', 'graphic', 'calm'], w: 0.8,
  plan: rng => ({ seed: bs(rng), q: rng.range(0.015, 0.02), k: rng.range(0.06, 0.08), dir: rng.pick([1, -1]), rot: rng.pick([45, 45, 0]) }),
  draw(env, Q, ctx) {
    const { W, H, sc } = env, t = env.t, q = Umin(env) * (Q.q || 0.017), k = Q.k || 0.07, e = fadeIn(env, 0.9);
    const ax = 6 * q, ay = -4 * q, bx = 4 * q, by = 6 * q, f = wrap(t * 0.03 * (Q.dir || 1), 1), ox = f * ax, oy = f * ay;
    const rad = Math.hypot(W, H) / 2 + q * 4, N = Math.min(34, Math.ceil(rad / (q * 7.2)) + 2);
    const ra = (Q.rot == null ? 45 : Q.rot) * DEG, cr = Math.cos(ra), sr = Math.sin(ra), pad = q * 5;
    ctx.translate(W / 2, H / 2); ctx.rotate(ra);
    ctx.globalAlpha = e; ctx.strokeStyle = A(sc.fg, k); ctx.lineWidth = q * (0.3 + 0.07 * Math.sin(t * 0.7)); ctx.lineCap = 'square'; ctx.beginPath();
    for (let i = -N; i <= N; i++) for (let j = -N; j <= N; j++) {
      const cx = ox + i * ax + j * bx, cy = oy + i * ay + j * by;
      if (Math.abs(cx * cr - cy * sr) > W / 2 + pad || Math.abs(cx * sr + cy * cr) > H / 2 + pad) continue;
      // four arms: out 2, turn, 3 along (the last unit reaches the neighbour's arm)
      for (let a = 0, ux = 0, uy = -1; a < 4; a++) { const vx = -uy, vy = ux; ctx.moveTo(cx, cy); ctx.lineTo(cx + ux * 2 * q, cy + uy * 2 * q); ctx.lineTo(cx + (ux * 2 + vx * 3) * q, cy + (uy * 2 + vy * 3) * q); ux = vx; uy = vy; }
    }
    ctx.stroke();
  } });

/* 立涌 — rising-steam lines: mirrored wavy verticals whose swellings climb slowly and breathe */
bg('wzBgTatewaku', { name: '立涌', en: 'Rising Steam Lines', tags: ['calm', 'emotional', 'editorial'], w: 1, subtle: true,
  plan: rng => ({ seed: bs(rng), d: rng.range(0.1, 0.14), k: rng.range(0.09, 0.115), dots: rng.chance(0.65), dir: rng.pick([1, -1]) }),
  draw(env, Q, ctx) {
    const { W, H, sc } = env, t = env.t, d = Umin(env) * (Q.d || 0.12), k = Q.k || 0.085, e = fadeIn(env, 0.9);
    const Am = d * 0.25 * (0.82 + 0.18 * Math.sin(t * 0.6)) * e, kk = TAU / (d * 2.8), ph = t * 0.4 * (Q.dir || 1), n = Math.min(60, Math.ceil(W / d) + 2), st = Math.max(8, H / 48);
    ctx.globalAlpha = e; ctx.strokeStyle = A(sc.fg, k); ctx.lineWidth = Math.max(1.5, d * 0.03); ctx.lineJoin = 'round'; ctx.beginPath();
    for (let i = 0; i < n; i++) { const s = i % 2 ? -1 : 1, x0 = (i - 0.5) * d; for (let y = -st, g = 0; y <= H + st && g < 80; y += st, g++) { const x = x0 + s * Am * Math.sin(y * kk + ph); if (g) ctx.lineTo(x, y); else ctx.moveTo(x, y); } }
    ctx.stroke();
    if (Q.dots) {
      ctx.fillStyle = A(sc.fg, k * 0.7); ctx.beginPath();
      for (let i = 0; i < n; i++) {
        // the gap between line i and i+1 is widest where s·sin = −1
        const s = i % 2 ? -1 : 1, x = i * d, y0 = ((s > 0 ? -Math.PI / 2 : Math.PI / 2) - ph) / kk, per = TAU / kk;
        for (let y = wrap(y0, per) - per, g = 0; y < H + per && g < 30; y += per, g++) { const r = d * 0.085 * (0.8 + 0.2 * Math.sin(t * 0.9 + i + g)); ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, TAU); }
      }
      ctx.fill();
    }
  } });

/* 流水紋 — bundles of staggered parallel water lines sliding sideways at different speeds */
bg('wzBgRyusui', { name: '流水紋', en: 'Flowing Water Lines', tags: ['calm', 'emotional', 'editorial'], w: 1, subtle: true,
  plan: rng => ({ seed: bs(rng), n: rng.int(6, 9), k: rng.range(0.085, 0.11), dir: rng.pick([1, -1]), acc: rng.chance(0.4) }),
  draw(env, Q, ctx) {
    const { W, H, sc } = env, t = env.t, U = Umin(env), s = Q.seed || 1, n = Q.n || 6, k = Q.k || 0.085, e = fadeIn(env, 0.9), dy = U * 0.02;
    ctx.globalAlpha = e; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (let b = 0; b < n; b++) {
      const m = 3 + (J.h(s, b, 1) % 3), base = H * (b + 0.5) / n + J.rs(s, b, 2) * H * 0.04 - (m - 1) * dy / 2, lam = U * (0.2 + 0.14 * J.r(s, b, 3)), Am = U * (0.02 + 0.02 * J.r(s, b, 4));
      const len = W * (0.55 + 0.4 * J.r(s, b, 5)), v = W * (0.012 + 0.018 * J.r(s, b, 6)) * (Q.dir || 1), span = W + len + U * 0.3, x0 = wrap(J.r(s, b, 7) * span + t * v, span) - len - U * 0.15;
      ctx.strokeStyle = A(Q.acc && b === 1 ? sc.accent : sc.fg, k * (0.7 + 0.5 * J.r(s, b, 8))); ctx.lineWidth = Math.max(1.5, U * (0.003 + 0.002 * J.r(s, b, 9))); ctx.beginPath();
      for (let j = 0; j < m; j++) {
        const xs = x0 + len * 0.3 * J.r(s, b, j, 10), xe = x0 + len * (1 - 0.3 * J.r(s, b, j, 11)), a = Math.max(xs, -20), z = Math.min(xe * e + xs * (1 - e), W + 20);
        if (z - a < 10) continue;
        for (let x = a, g = 0; g < 140; x += 22, g++) { const xx = Math.min(x, z), y = base + j * dy + Am * Math.sin(xx / lam + b * 1.7 + t * 0.35) + Am * 0.35 * Math.sin(xx / lam * 2.1 - t * 0.2); if (g) ctx.lineTo(xx, y); else ctx.moveTo(xx, y); if (xx >= z) break; }
      }
      ctx.stroke();
    }
  } });

/* 雪輪散らし — scattered snow-ring crests, some filled and some outlined, sinking and turning very slowly */
bg('wzBgYukiwa', { name: '雪輪散らし', en: 'Scattered Snow Rings', tags: ['calm', 'emotional', 'pop'], w: 0.9,
  plan: rng => ({ seed: bs(rng), n: rng.int(10, 14), k: rng.range(0.065, 0.085), acc: rng.chance(0.5) }),
  draw(env, Q, ctx) {
    const { W, H, sc } = env, t = env.t, U = Umin(env), s = Q.seed || 1, n = Math.min(16, Q.n || 10), k = Q.k || 0.07, e = fadeIn(env, 0.9), bt = bgT(env);
    ctx.lineWidth = Math.max(1.5, U * 0.0042);
    for (let i = 0; i < n; i++) {
      const R = U * (0.06 + 0.12 * J.r(s, i, 1) * J.r(s, i, 2)) * (0.8 + 0.2 * E.outCubic(cl(bt / 0.8 - i * 0.03))), span = H + R * 2.4;
      const x = W * ((i + 0.5) / n + 0.3 * J.rs(s, i, 3)) + Math.sin(t * 0.25 + i * 1.9) * U * 0.02, xx = wrap(x, W + R * 2) - R, y = wrap(J.r(s, i, 4) * span + t * U * (0.006 + 0.01 * J.r(s, i, 5)), span) - R * 1.2;
      const rot = (i % 2 ? -1 : 1) * t * 0.06 + i, col = Q.acc && i % 4 === 1 ? sc.accent : sc.fg;
      ctx.globalAlpha = e; ctx.beginPath(); yukiwaPath(ctx, xx, y, R, rot);
      if (i % 3 === 0) { ctx.fillStyle = A(col, k * 0.8); ctx.fill(); } else { ctx.strokeStyle = A(col, k * 1.5); ctx.stroke(); }
      if (R > U * 0.085) { ctx.strokeStyle = A(col, k * 1.4); ctx.beginPath(); for (let j = 0; j < 6; j++) { const an = rot + j / 6 * TAU; ctx.moveTo(xx + Math.cos(an) * R * 0.18, y + Math.sin(an) * R * 0.18); ctx.lineTo(xx + Math.cos(an) * R * 0.6, y + Math.sin(an) * R * 0.6); } ctx.stroke(); }
    }
  } });

/* 矢絣 — columns of arrow-feather chevrons; neighbouring columns slide up and down against each other */
bg('wzBgYagasuri', { name: '矢絣', en: 'Arrow Feather Field', tags: ['graphic', 'pop', 'editorial'], w: 0.9,
  plan: rng => ({ seed: bs(rng), d: rng.range(0.085, 0.12), k: rng.range(0.045, 0.06), spd: rng.range(0.008, 0.016), acc: rng.chance(0.35) }),
  draw(env, Q, ctx) {
    const { W, H, sc } = env, t = env.t, U = Umin(env), d = U * (Q.d || 0.1), k = Q.k || 0.05, e = fadeIn(env, 0.8), ph = d * 0.85, nc = Math.min(40, Math.ceil(W / d) + 1), x00 = (W - nc * d) / 2;
    ctx.globalAlpha = e;
    for (let pass = 0; pass < 2; pass++) {
      ctx.fillStyle = A(pass && Q.acc ? sc.accent : sc.fg, pass ? k * 0.9 : k); ctx.beginPath();
      for (let c = pass; c < nc; c += 2) {
        const dir = c % 2 ? -1 : 1, x0 = x00 + c * d, xc = x0 + d / 2, sl = dir * d * 0.5, off = wrap(dir * t * U * (Q.spd || 0.012), ph * 2) + (1 - e) * dir * ph;
        for (let y = -ph * 4 + off, g = 0; y < H + ph * 2 && g < 60; y += ph * 2, g++) {
          ctx.moveTo(x0 + 1, y); ctx.lineTo(xc - 1, y + sl); ctx.lineTo(xc - 1, y + sl + ph); ctx.lineTo(x0 + 1, y + ph); ctx.closePath();
          ctx.moveTo(x0 + d - 1, y); ctx.lineTo(xc + 1, y + sl); ctx.lineTo(xc + 1, y + sl + ph); ctx.lineTo(x0 + d - 1, y + ph); ctx.closePath();
        }
      }
      ctx.fill();
    }
  } });
})();
