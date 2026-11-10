/* JIZURA pack: x2layA — 追加分2 layouts A: editorial / print / typographic compositions (page furniture, forms, plates) */
(() => {
'use strict';
const E = J.E;
const P = 'x2layA';
const reg = (key, def) => J.register('layout', key, def, P);

/* ------------------------------------------------------------------ helpers */
const slotsOf = t => [...String(t || '').trim().replace(/[\s　]+/g, ' ')];
const isSp = c => c === ' ' || c === '　';
const fontsOf = (st, roles) => J.fontsOf(st, roles);
const monoF = env => (env.st.fonts.mono && env.st.fonts.mono[0]) || 'mono';
const bodyF = env => (env.st.fonts.body && env.st.fonts.body[0]) || 'gothic_med';
const inE = (env, d = 0.35, delay = 0) => E.outExpo(J.clamp((env.lt - delay) / d));
const inC = (env, d = 0.35, delay = 0) => E.outCubic(J.clamp((env.lt - delay) / d));
const outK = env => 1 - E.inCubic(env.pOut);
const pad2 = n => String(n).padStart(2, '0');
const hair = env => Math.max(1, Math.min(env.W, env.H) * 0.0016);
const U = J.unionBB;
const isLatinT = t => J.isLatinText(t);
const short = (t, k) => { const a = [...String(t || '').replace(/\s+/g, ' ').trim()]; return a.length > k ? a.slice(0, k).join('') + '…' : a.join(''); };
/* J.splitLines, but never leave a line of punctuation only */
const splitL = (t, per) => {
  const ls = J.splitLines(String(t), Math.max(1, per)).split('\n');
  const out = [];
  for (const l of ls) { if (out.length && [...l].every(c => J.isPunct(c) || c === ' ')) out[out.length - 1] += l; else out.push(l); }
  return out.join('\n');
};
/* split into C runs of even length (Japanese: anywhere except before punctuation / small kana; Latin: between words) */
const evenSplit = (t, C) => {
  const s = String(t || '').trim();
  if (isLatinT(s) || C <= 1) return splitL(s, Math.ceil([...s].length / Math.max(1, C))).split('\n');
  const a = [...s.replace(/\s+/g, '')], n = a.length, out = []; let st = 0;
  for (let i = 1; i <= C; i++) {
    let c = i === C ? n : Math.round((i * n) / C);
    while (c < n && c > st && (J.isPunct(a[c]) || J.isSmallKana(a[c]) || a[c] === 'ー')) c++;
    if (c > st) out.push(a.slice(st, c).join(''));
    st = c;
  }
  return out;
};
/* split into at most C runs at natural break points; falls back to fewer runs, then to an even split */
const smartSplit = (t, C, strict) => {
  const s = String(t || '').trim(), n = [...s].length;
  if (C <= 1 || n <= 1) return [s];
  for (const c of strict ? [C] : [C, C - 1]) {
    if (c < 2) break;
    const segs = splitL(s, Math.ceil(n / c)).split('\n'), mx = Math.max(...segs.map(x => [...x].length));
    if (segs.length <= C && mx <= Math.ceil(n / c) * 1.45 + 0.5) return segs;
  }
  return evenSplit(s, C);
};
const linesOf =(t, L) => { const s = String(t || '').trim(), n = [...s].length; return L <= 1 ? s : splitL(s, Math.ceil(n / L)); };
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
/* glyph centres of a laid-out horizontal item */
const glyphPts = (it) => {
  const lay = J.layoutText(it), sx = it.sx || 1, sy = it.sy || 1, out = [];
  for (const g of lay) { if (isSp(g.ch)) continue; out.push({ ch: g.ch, x: it.x + g.x * sx, y: it.y + g.y * sy, w: g.w * sx, h: g.h * sy, li: g.li }); }
  return out;
};
/* colours */
const onCol = (sc, fill) => {
  let best = null, bv = 0;
  for (const c of [sc.bg, sc.fg, sc.ink, sc.sub]) { if (!c || c === fill) continue; const k = J.contrast(c, fill); if (k > bv) { bv = k; best = c; } }
  return bv >= 3 ? best : (J.lum(fill) > 0.45 ? '#000' : '#fff');
};
const plateCol = (sc, pref) => { for (const c of pref) if (c && J.contrast(c, sc.bg) >= 1.7) return c; return sc.fg; };
const paperOf = sc => plateCol(sc, [sc.fg, sc.ink, sc.accent]);
const accOn = (sc, fill) => (J.contrast(sc.accent, fill) >= 2 ? sc.accent : sc.accent2 && J.contrast(sc.accent2, fill) >= 2 ? sc.accent2 : onCol(sc, fill));
const accentOn = sc => accOn(sc, sc.bg);
const dimOf = sc => J.mix(sc.bg, sc.fg, 0.17);
const pickPlate = (sc, k) => plateCol(sc, k === 'accent' ? [sc.accent, sc.ink, sc.fg] : k === 'ink' ? [sc.ink, sc.accent, sc.fg] : [sc.fg, sc.ink]);
/* small drawing tools (main pass only) */
const lsz = env => J.clamp(Math.min(env.W, env.H) * 0.019, 11, 24);
const label = (env, text, x, y, o = {}) => { if ((o.alpha ?? 1) <= 0.003) return; env.draw({ text: String(text), font: o.font || monoF(env), size: o.size || lsz(env), x, y, align: o.align || 'left', track: o.track ?? 0.1, color: o.color || env.sc.sub, alpha: o.alpha ?? 1, rot: o.rot || 0, vertical: !!o.vertical, ghost: false }); };
const R = (env, x, y, w, h, c, a = 1) => { if (a > 0.003 && w > 0 && h > 0) env.rect(x, y, w, h, c, a, false); };
const Ln = (env, x0, y0, x1, y1, c, lw, a = 1) => { if (a > 0.003) env.line([[x0, y0], [x1, y1]], c, lw, a, false); };
const dashL = (env, x0, y0, x1, y1, c, lw, a, d) => {
  if (env.pass !== 'main' || a <= 0.003) return;
  const ctx = env.ctx; ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = c; ctx.lineWidth = lw; ctx.setLineDash(d);
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); ctx.restore();
};
const frame = (env, x, y, w, h, c, lw, a = 1) => {
  if (env.pass !== 'main' || a <= 0.003) return;
  const ctx = env.ctx; ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = c; ctx.lineWidth = lw; ctx.strokeRect(x, y, w, h); ctx.restore();
};
/* greeked body text: rows of bars */
const greek = (env, x, y, w, rows, pitch, c, a, seed, e = 1, th = 0.36) => {
  for (let r = 0; r < Math.min(rows, 60); r++) {
    const k = r === rows - 1 ? 0.35 + 0.3 * J.r(seed, r, 3) : 0.82 + 0.18 * J.r(seed, r, 5);
    R(env, x, y + r * pitch, w * k * e, pitch * th, c, a);
  }
};
/* barcode strip */
const barcode = (env, x, y, w, h, c, a, seed, e = 1) => {
  let px = 0; const u = w / 96;
  for (let i = 0; i < 48 && px < 96 * e; i++) { const bw = 1 + (J.h(seed, i, 41) % 3), gp = 1 + (J.h(seed, i, 43) % 2); if (px + bw > 96) break; R(env, x + px * u, y, bw * u * 0.8, h, c, a); px += bw + gp; }
};
/* run fn with the canvas rotated around a point (all passes) */
const tilted = (env, cx, cy, deg, fn) => {
  if (!deg) return fn();
  const ctx = env.ctx; ctx.save(); ctx.translate(cx, cy); ctx.rotate(deg * J.DEG); ctx.translate(-cx, -cy);
  let r; try { r = fn(); } finally { ctx.restore(); }
  return r;
};
const base = env => { const cut = env.cut; return { W: env.W, H: env.H, sc: env.sc, cut, Pm: cut.params || {}, lt: env.lt, M: Math.min(env.W, env.H), port: env.W < env.H, txt: String(cut.text || '').trim(), out: outK(env), lw: hair(env), ls: lsz(env), no: (cut.line | 0) + 1 }; };

/* ================================================================== 1 xaPullQuote — 抜き書き
   the lyric as a pull quote between rules; greeked body columns wrap around it */
reg('xaPullQuote', {
  name: '抜き書き', en: 'Pull Quote', tags: ['editorial', 'calm', 'emotional'], ae: 'gloss', w: 1.2, fits: n => n >= 1 && n <= 20,
  plan(rng, cut, st) { return { font: rng.pick(fontsOf(st, ['serif', 'display'])), side: rng.pick(['c', 'c', 'l', 'r']), rule: rng.pick(['thick', 'double', 'thinthick']), cols: rng.pick([3, 4]), acc: rng.chance(0.6) }; },
  render(env) {
    const { W, H, sc, cut, Pm, lt, M, port, txt, out, lw, ls, no } = base(env);
    const cols = port ? 2 : Pm.cols, mx = W * 0.07, my = H * 0.08, gut = W * 0.035;
    const colW = (W - mx * 2 - gut * (cols - 1)) / cols;
    const bw = port ? W - mx * 2 : W * 0.56, o = { lead: 1.25, track: 0.03 };
    const f = fitBox(txt, Pm.font, bw * 0.9, H * (port ? 0.3 : 0.4), o, 3);
    const size = Math.min(f.size, M * 0.2);
    const it = Object.assign({ text: f.text, font: Pm.font, size, color: sc.fg }, o);
    const m = J.measure(it), bh = m.h + size * 1.15;
    const bx0 = port || Pm.side === 'c' ? (W - bw) / 2 : Pm.side === 'l' ? mx : W - mx - bw, by0 = H / 2 - bh / 2, bx1 = bx0 + bw, by1 = by0 + bh;
    // body text bars, skipping the quote box
    const pitch = M * 0.032, rows = Math.floor((H - my * 2) / pitch), dim = dimOf(sc), padX = gut * 0.7;
    for (let c = 0; c < cols; c++) {
      const x = mx + c * (colW + gut);
      for (let r = 0; r < rows; r++) {
        const e = inC(env, 0.4, 0.012 * r + 0.05 * c) * out;
        if (e <= 0) continue;
        const y = my + r * pitch, k = J.r(cut.seed, c, r, 7) < 0.1 ? 0.3 + 0.4 * J.r(cut.seed, c, r, 8) : 1;
        let segs = [[x, x + colW * k]];
        if (y + pitch > by0 - pitch * 0.6 && y < by1 + pitch * 0.6) segs = [[x, Math.min(x + colW * k, bx0 - padX)], [Math.max(x, bx1 + padX), x + colW * k]];
        for (const [a, b] of segs) if (b - a > colW * 0.14) R(env, a, y, (b - a) * e, pitch * 0.36, dim, 0.9);
      }
    }
    const rc = Pm.acc ? accentOn(sc) : sc.fg, e2 = inE(env, 0.55, 0.05) * out, th = Math.max(3, size * 0.05);
    if (e2 > 0) {
      const xa = bx0, xb = bx0 + bw * e2;
      if (Pm.rule === 'thick') { R(env, xa, by0, xb - xa, th, rc); R(env, bx1 - (xb - xa), by1 - th, xb - xa, th, rc); }
      else if (Pm.rule === 'double') { for (const y of [by0, by0 + th * 0.9, by1 - th * 0.9, by1]) Ln(env, xa, y, xb, y, rc, Math.max(lw, th * 0.3)); }
      else { Ln(env, xa, by0, xb, by0, rc, lw); R(env, xa, by0 + th * 0.7, xb - xa, th, rc); R(env, bx1 - (xb - xa), by1 - th * 1.7, xb - xa, th, rc); Ln(env, bx1 - (xb - xa), by1, bx1, by1, rc, lw); }
    }
    const bb = J.mainDraw(env, Object.assign(it, { x: bx0 + bw / 2, y: H / 2 }));
    label(env, `Q.${pad2(no)}`, bx0, by0 - ls * 1.1, { alpha: inC(env, 0.3, 0.3) * out, color: rc });
    return bb;
  },
});

/* ================================================================== 2 xaReceipt — レシート
   a printed till roll: mono rows, dashed dividers, total line, zigzag tear */
reg('xaReceipt', {
  name: 'レシート', en: 'Receipt', tags: ['pop', 'editorial', 'graphic'], ae: 'labels', w: 0.8, treat: 'safe', fits: n => n >= 1 && n <= 16,
  plan(rng, cut, st) { return { font: rng.pick(fontsOf(st, ['body', 'display', 'mono'])), tilt: rng.pick([0, 0, -2, 2.5]), bar: rng.chance(0.7), rows: rng.int(2, 3) }; },
  render(env) {
    const { W, H, sc, cut, Pm, M, port, txt, out, lw, ls, no } = base(env);
    const pw = port ? W * 0.8 : Math.min(W * 0.46, H * 0.84), ph = H * 0.86, x0 = (W - pw) / 2, y0 = (H - ph) / 2;
    const paper = paperOf(sc), ink = onCol(sc, paper), faint = J.mix(paper, ink, 0.45), mono = monoF(env);
    return tilted(env, W / 2, H / 2, Pm.tilt, () => {
      const e = inE(env, 0.5), hh = ph * e, yb = y0 + hh, nT = 22, d = pw * 0.014;
      const pts = [[x0, y0], [x0 + pw, y0]];
      for (let i = 0; i <= nT * 2; i++) pts.push([x0 + pw - (pw * i) / (nT * 2), yb + (i % 2 ? d : 0)]);
      if (out > 0) env.poly(pts, paper, out, false);
      const vis = fy => J.clamp((hh - ph * fy) / (ph * 0.05)) * out, Y = fy => y0 + ph * fy, xl = x0 + pw * 0.08, xr = x0 + pw * 0.92;
      label(env, 'RECEIPT', W / 2, Y(0.065), { align: 'center', size: ls * 1.35, track: 0.5, color: ink, alpha: vis(0.065), font: mono });
      label(env, `No.${String(1000 + (J.h(cut.seed, 3) % 9000))}`, xl, Y(0.115), { color: faint, alpha: vis(0.115), size: ls * 0.9 });
      label(env, J.fmtTime ? J.fmtTime(cut.start || 0) : '00:00', xr, Y(0.115), { align: 'right', color: faint, alpha: vis(0.115), size: ls * 0.9 });
      dashL(env, xl, Y(0.15), xr, Y(0.15), ink, lw * 1.3, vis(0.15), [lw * 5, lw * 4]);
      for (let k = 0; k < Pm.rows; k++) {
        const fy = 0.195 + k * 0.045, a = vis(fy);
        R(env, xl, Y(fy) - ls * 0.2, pw * (0.26 + 0.2 * J.r(cut.seed, k, 9)), ls * 0.4, faint, a);
        label(env, `x${1 + (J.h(cut.seed, k, 5) % 3)}`, xr, Y(fy), { align: 'right', color: faint, alpha: a });
      }
      dashL(env, xl, Y(0.35), xr, Y(0.35), ink, lw * 1.3, vis(0.35), [lw * 5, lw * 4]);
      dashL(env, xl, Y(0.73), xr, Y(0.73), ink, lw * 1.3, vis(0.73), [lw * 5, lw * 4]);
      label(env, 'TOTAL', xl, Y(0.785), { color: ink, alpha: vis(0.785), size: ls * 1.3, track: 0.2 });
      label(env, `${J.glyphCount(txt)} GLYPHS`, xr, Y(0.785), { align: 'right', color: ink, alpha: vis(0.785), size: ls * 1.3 });
      if (Pm.bar) barcode(env, x0 + pw * 0.2, Y(0.85), pw * 0.6, ph * 0.075, ink, vis(0.9), cut.seed);
      else label(env, '* THANK YOU *', W / 2, Y(0.89), { align: 'center', color: ink, alpha: vis(0.9), track: 0.3 });
      const o = { lead: 1.2, track: 0.02 }, f = fitBox(txt, Pm.font, pw * 0.82, ph * 0.31, o, 4), size = Math.min(f.size, pw * 0.36);
      return J.mainDraw(env, Object.assign({ text: f.text, font: Pm.font, size, x: W / 2, y: Y(0.54), color: ink }, o));
    });
  },
});

/* ================================================================== 3 xaCatalogCard — 図書カード
   a library catalogue card: red head rule, typed call number, punched hole */
reg('xaCatalogCard', {
  name: '図書カード', en: 'Catalogue Card', tags: ['editorial', 'calm', 'emotional'], ae: 'labels', w: 0.9, treat: 'safe', fits: n => n >= 1 && n <= 16,
  plan(rng, cut, st) { return { font: rng.pick(fontsOf(st, ['serif', 'body'])), tilt: rng.pick([-2, 0, 1.5]), back: rng.chance(0.6), cls: rng.int(100, 899) }; },
  render(env) {
    const { W, H, sc, cut, Pm, M, port, txt, out, lw, ls, no } = base(env);
    const cw = port ? W * 0.88 : Math.min(W * 0.8, H * 0.8 * 1.62), ch = port ? Math.min(cw * 1.25, H * 0.62) : cw * 0.6, x0 = (W - cw) / 2, y0 = (H - ch) / 2;
    const paper = paperOf(sc), ink = onCol(sc, paper), faint = J.mix(paper, ink, 0.28), red = accOn(sc, paper), mono = monoF(env);
    return tilted(env, W / 2, H / 2, Pm.tilt, () => {
      const e = inE(env, 0.4), a = e * out, r = M * 0.012, nR = port ? 9 : 6, g = (ch * 0.69) / nR, yr = y0 + ch * (port ? 0.15 : 0.2), xm = x0 + cw * 0.17;
      if (Pm.back) env.rrect(x0 - M * 0.022 * e, y0 - M * 0.026 * e, cw, ch, r, J.mix(paper, sc.bg, 0.45), a, false);
      env.rrect(x0, y0 + (1 - e) * M * 0.03, cw, ch, r, paper, a, false);
      const e2 = inE(env, 0.6, 0.12);
      R(env, x0, yr - lw, cw * e2, lw * 2.4, red, out);
      for (let k = 1; k <= nR; k++) Ln(env, x0, yr + g * k, x0 + cw * inE(env, 0.6, 0.12 + k * 0.04), yr + g * k, faint, lw, out);
      for (const dx of [0, lw * 4]) Ln(env, xm + dx, y0, xm + dx, y0 + ch * e2, red, lw, 0.6 * out);
      const la = inC(env, 0.3, 0.3) * out;
      [String(Pm.cls) + '.' + (J.h(cut.seed, 2) % 10), isLatinT(txt) ? 'Ly' : 'Ji', pad2(no)].forEach((s, i) => label(env, s, x0 + cw * 0.085, yr + g * (i + 0.5), { align: 'center', color: ink, alpha: la, font: mono }));
      label(env, `CARD No. ${String(no).padStart(4, '0')}`, xm + cw * 0.03, y0 + ch * (port ? 0.08 : 0.11), { color: faint, alpha: la, font: mono });
      label(env, short(cut.lineText || txt, port ? 16 : 26), xm + cw * 0.03, yr + g * (nR - 0.5), { color: faint, alpha: la, font: bodyF(env), track: 0.04 });
      label(env, `${J.glyphCount(txt)} p. ; 21 cm.`, xm + cw * 0.03, yr + g * (nR + 0.5), { color: faint, alpha: la, font: mono });
      env.circle(W / 2, y0 + ch * 0.925, ch * 0.032, sc.bg, null, 1, a, false);
      const o = { lead: 1.22, track: 0.03 }, f = fitBox(txt, Pm.font, cw * 0.74, g * (nR - 2.5), o, port ? 4 : 3), size = Math.min(f.size, ch * 0.3);
      return J.mainDraw(env, Object.assign({ text: f.text, font: Pm.font, size, align: 'left', x: xm + cw * 0.03, y: yr + g * (nR - 1) / 2 + g * 0.05, color: ink }, o));
    });
  },
});

/* ================================================================== 4 xaTimetable — 時刻表
   a printed timetable: header band, time column, the lyric lines as the highlighted rows */
reg('xaTimetable', {
  name: '時刻表', en: 'Timetable', tags: ['graphic', 'editorial', 'pop'], ae: 'stack', w: 1, fits: n => n >= 1 && n <= 16,
  plan(rng, cut, st) { return { font: rng.pick(fontsOf(st, ['display', 'body'])), hl: rng.pick(['bar', 'tri', 'band']), pre: rng.int(1, 2), post: rng.int(1, 2), h0: rng.int(5, 22), m0: rng.int(0, 20) }; },
  render(env) {
    const { W, H, sc, cut, Pm, M, port, txt, out, lw, ls, no } = base(env);
    const n = [...txt].length, per = port ? 5 : 10;
    const lines = n <= per ? [txt] : smartSplit(txt, Math.min(port ? 4 : 3, Math.ceil(n / per)), port);
    const pre = Pm.pre, post = port && lines.length < 3 ? Pm.post + 1 : Pm.post, rows = pre + lines.length + post;
    const tw = W * 0.86, x0 = W * 0.07, rh = Math.min((H * 0.82) / (rows + 0.6), M * 0.24), hh = rh * 0.6, y0 = (H - rh * rows - hh) / 2;
    const c1 = tw * (port ? 0.22 : 0.19), c3 = tw * (port ? 0.11 : 0.09), mono = monoF(env), dim = dimOf(sc), acc = accentOn(sc);
    const head = pickPlate(sc, 'ink'), hon = onCol(sc, head), e0 = inE(env, 0.45) * out;
    R(env, x0, y0, tw * e0, hh, head, 1);
    const la = inC(env, 0.3, 0.2) * out;
    label(env, 'TIME', x0 + tw * 0.015, y0 + hh / 2, { color: hon, alpha: la, size: hh * 0.42 });
    label(env, `LINE ${pad2(no)}`, x0 + c1 + tw * 0.02, y0 + hh / 2, { color: hon, alpha: la, size: hh * 0.42 });
    label(env, 'PF', x0 + tw - tw * 0.015, y0 + hh / 2, { color: hon, alpha: la, size: hh * 0.42, align: 'right' });
    const lyW = tw - c1 - c3 - tw * 0.04;
    const size = Math.min(...lines.map(l => J.fitSize(l, Pm.font, lyW, rh * 0.62, { track: 0.03 })));
    let bb = null, mins = Pm.m0;
    for (let r = 0; r < rows; r++) {
      const y = y0 + hh + rh * r, cy = y + rh / 2, li = r - pre, isL = li >= 0 && li < lines.length, a = inC(env, 0.3, 0.08 + r * 0.05) * out;
      mins += 3 + (J.h(cut.seed, r, 11) % 9);
      const tm = `${pad2((Pm.h0 + Math.floor(mins / 60)) % 24)}:${pad2(mins % 60)}`;
      Ln(env, x0, y + rh, x0 + tw * inE(env, 0.5, 0.08 + r * 0.05), y + rh, sc.sub, lw, 0.6 * out);
      if (isL && Pm.hl === 'band') R(env, x0, y + lw, tw * inE(env, 0.5, 0.1 + r * 0.05), rh - lw * 2, dim, 0.7 * out);
      label(env, tm, x0 + tw * 0.015, cy, { color: isL ? sc.fg : sc.sub, alpha: a * (isL ? 1 : 0.7), size: Math.min(rh * 0.34, c1 * 0.2), font: mono, track: 0.02 });
      if (isL) {
        if (Pm.hl === 'bar') R(env, x0 - tw * 0.012, y + rh * 0.14, tw * 0.008, rh * 0.72 * inE(env, 0.4, 0.15 + r * 0.05), acc, out);
        if (Pm.hl === 'tri' && a > 0) { const s = rh * 0.13, tx = x0 + c1 - s * 1.2; env.poly([[tx, cy - s], [tx + s * 1.4, cy], [tx, cy + s]], acc, a, false); }
        bb = U(bb, J.mainDraw(env, { text: lines[li], font: Pm.font, size, align: 'left', x: x0 + c1 + tw * 0.02, y: cy, track: 0.03, color: sc.fg, mi: li }));
      } else R(env, x0 + c1 + tw * 0.02, cy - rh * 0.07, lyW * (0.3 + 0.4 * J.r(cut.seed, r, 13)) * inE(env, 0.5, 0.1 + r * 0.05), rh * 0.14, dim, out);
      const bs = Math.min(rh * 0.44, c3 * 0.7);
      env.rrect(x0 + tw - tw * 0.015 - bs, cy - bs / 2, bs, bs, bs * 0.2, null, a * (isL ? 1 : 0.5), false, isL ? acc : sc.sub, lw * 1.4);
      label(env, String(1 + (J.h(cut.seed, r, 17) % 8)), x0 + tw - tw * 0.015 - bs / 2, cy, { align: 'center', color: isL ? acc : sc.sub, alpha: a * (isL ? 1 : 0.6), size: bs * 0.6, track: 0 });
    }
    return bb;
  },
});

/* ================================================================== 5 xaThumbIndex — 爪見出し
   thumb-index tabs down the page edge; the active tab carries the lyric's initial */
reg('xaThumbIndex', {
  name: '爪見出し', en: 'Thumb Index', tags: ['editorial', 'graphic', 'pop'], ae: 'gloss', w: 1, fits: n => n >= 1 && n <= 16,
  plan(rng, cut, st) { return { font: rng.pick(fontsOf(st, ['display', 'serif'])), side: rng.pick(['r', 'r', 'l']), nT: rng.pick([6, 7, 8]), act: rng.int(0, 7), col: rng.pick(['accent', 'accent', 'ink']) }; },
  render(env) {
    const { W, H, sc, cut, Pm, M, port, txt, out, lw, ls, no } = base(env);
    const nT = Pm.nT, act = Pm.act % nT, right = Pm.side === 'r', th = (H * 0.84) / nT, tw = M * 0.1, y0 = H * 0.08;
    const set = isLatinT(txt) ? 'ABCDEFGH' : 'あかさたなはまや', dim = dimOf(sc), plate = pickPlate(sc, Pm.col), pon = onCol(sc, plate);
    const first = slotsOf(txt).find(c => !isSp(c) && !J.isPunct(c)) || '・';
    let ay = 0, aw = 0;
    for (let i = 0; i < nT; i++) {
      const e = inE(env, 0.45, 0.04 * i) * out, on = i === act, w = tw * (on ? 1.55 : 1) * e, y = y0 + th * i + th * 0.08, h = th * 0.84;
      if (e <= 0) continue;
      const x = right ? W - w : -th;
      env.rrect(x, y, w + th, h, h * 0.28, on ? plate : dim, 1, false);
      label(env, on ? first : set[i % set.length], right ? W - w / 2 - (1 - e) * tw : w / 2, y + h / 2, { align: 'center', font: on ? Pm.font : bodyF(env), size: h * (on ? 0.6 : 0.36), color: on ? pon : sc.sub, alpha: e, track: 0 });
      if (on) { ay = y + h / 2; aw = w; }
    }
    const availW = W * 0.9 - tw * 1.75, o = { lead: 1.22, track: 0.03 };
    const f = fitBox(txt, Pm.font, availW, H * (port ? 0.5 : 0.56), o, port ? 4 : 3), size = Math.min(f.size, M * 0.26);
    const it = Object.assign({ text: f.text, font: Pm.font, size, align: right ? 'left' : 'right', x: right ? W * 0.07 : W * 0.93, y: H / 2, color: sc.fg }, o);
    const m = J.measure(it);
    // header rule + running head
    const hy = Math.max(H * 0.07, H / 2 - m.h / 2 - size * 0.45), e2 = inE(env, 0.6, 0.1) * out;
    const hx0 = right ? W * 0.07 : W * 0.93 - availW;
    Ln(env, hx0, hy, hx0 + availW * e2, hy, sc.sub, lw, 0.8);
    label(env, `INDEX — ${pad2(no)}`, right ? hx0 : hx0 + availW, hy - ls * 0.9, { align: right ? 'left' : 'right', alpha: inC(env, 0.3, 0.25) * out });
    // leader from the active tab to the text block
    const tx = right ? W * 0.07 + m.w + size * 0.2 : W * 0.93 - m.w - size * 0.2, ex = right ? W - aw - M * 0.012 : aw + M * 0.012;
    if ((right ? ex - tx : tx - ex) > M * 0.03 && e2 > 0) { Ln(env, ex, ay, J.lerp(ex, tx, e2), ay, plate, lw * 1.5, 0.9); env.circle(J.lerp(ex, tx, e2), ay, lw * 3, plate, null, 1, e2, false); }
    return J.mainDraw(env, it);
  },
});

/* ================================================================== 6 xaColumns — 段組
   the lyric runs down narrow newspaper-like columns with gutters, column rules and greeked continuation */
reg('xaColumns', {
  name: '段組', en: 'Column Setting', tags: ['editorial', 'calm', 'graphic'], ae: 'vcols', w: 1, fits: n => n >= 4 && n <= 18,
  plan(rng, cut, st) { return { font: rng.pick(fontsOf(st, ['serif', 'body', 'display'])), rule: rng.chance(0.8), foot: rng.chance(0.35), num: rng.chance(0.7) }; },
  render(env) {
    const { W, H, sc, cut, Pm, M, port, txt, out, lw, ls, no } = base(env);
    const n = [...txt].length, latin = isLatinT(txt);
    let C = n <= 7 ? 2 : port ? 2 : 3;
    let segs = smartSplit(txt, C);
    while (segs.length > 3) { const t = segs.pop(); segs[segs.length - 1] += (latin ? ' ' : '') + t; }
    C = segs.length;
    const o = { lead: 1.2, track: 0.02 };
    const narrow = s => { const k = [...s].length; if (latin) return splitL(s, 7); return k <= 3 ? s : evenSplit(s, Math.ceil(k / 3)).join('\n'); };
    segs = segs.map(narrow);
    const x0 = W * 0.07, aw = W * 0.86, gut = W * (port ? 0.06 : 0.045), colW = (aw - gut * (C - 1)) / C, headY = H * 0.13, footY = H * 0.9;
    const size = Math.min(M * 0.24, ...segs.map(s => J.fitSize(s, Pm.font, colW * 0.94, H * 0.5, o)));
    const e0 = inE(env, 0.5) * out, dim = dimOf(sc), pitch = M * 0.034;
    R(env, x0, headY - M * 0.006, aw * e0, M * 0.006, sc.fg, 1);
    Ln(env, x0, headY + M * 0.007, x0 + aw * e0, headY + M * 0.007, sc.fg, lw, 1);
    label(env, `P.${pad2(no)}`, x0 + aw, headY - M * 0.006 - ls, { align: 'right', alpha: inC(env, 0.3, 0.2) * out });
    let bb = null;
    segs.forEach((s, i) => {
      const cx = x0 + i * (colW + gut), it = Object.assign({ text: s, font: Pm.font, size, align: 'left', x: cx, color: sc.fg, mi: i * 2 }, o), m = J.measure(it);
      const top = headY + M * 0.05, gy0 = Pm.foot ? top : top + m.h + pitch * 1.3, gy1 = Pm.foot ? footY - m.h - pitch * 1.3 : footY;
      it.y = Pm.foot ? footY - m.h / 2 : top + m.h / 2;
      const rows = Math.max(0, Math.floor((gy1 - gy0) / pitch));
      greek(env, cx, gy0, colW, rows, pitch, dim, 0.9 * out, J.h(cut.seed, i, 21), inE(env, 0.6, 0.15 + i * 0.1));
      if (Pm.num) label(env, pad2(i + 1), cx, headY - M * 0.006 - ls, { alpha: inC(env, 0.3, 0.15 + i * 0.08) * out, color: accentOn(sc) });
      if (Pm.rule && i > 0) Ln(env, cx - gut / 2, headY + M * 0.03, cx - gut / 2, J.lerp(headY + M * 0.03, footY, inE(env, 0.7, 0.1 + i * 0.08)), sc.sub, lw, 0.7 * out);
      bb = U(bb, J.mainDraw(env, it));
    });
    return bb;
  },
});

/* ================================================================== 7 xaInitialPlate — 白抜き頭文字
   the initial glyph knocked out of a solid plate, the rest set beside / under it */
reg('xaInitialPlate', {
  name: '白抜き頭文字', en: 'Reversed Initial', tags: ['editorial', 'graphic', 'pop'], ae: 'mixed', w: 1.2, treat: 'safe', fits: n => n >= 2 && n <= 16,
  plan(rng, cut, st) { return { font: rng.pick(fontsOf(st, ['display'])), fs: rng.pick(fontsOf(st, ['serif', 'display', 'body'])), col: rng.pick(['accent', 'ink', 'fg']), shape: rng.pick(['sq', 'sq', 'circle', 'tall']), al: rng.pick(['top', 'base', 'mid']) }; },
  render(env) {
    const { W, H, sc, cut, Pm, M, port, txt, out, lw, ls, no } = base(env);
    const arr = slotsOf(txt), init = arr[0] || '?', rest = arr.slice(1).join('').trim() || '…';
    const plate = pickPlate(sc, Pm.col), pon = onCol(sc, plate), o = { lead: 1.2, track: 0.03 };
    const kx = Pm.shape === 'tall' ? 0.74 : 1;
    let S, f, size, px, py, it;
    if (!port) {
      S = Math.min(H * 0.48, W * 0.3); const gap = S * 0.14, Sw = S * kx;
      f = fitBox(rest, Pm.fs, W * 0.88 - Sw - gap, S, o, 3); size = Math.min(f.size, S * 0.5);
      it = Object.assign({ text: f.text, font: Pm.fs, size, align: 'left', color: sc.fg, mi: 2 }, o);
      const m = J.measure(it), tot = Sw + gap + m.w;
      px = (W - tot) / 2 + Sw / 2; py = H / 2;
      it.x = px + Sw / 2 + gap; it.y = Pm.al === 'top' ? py - S / 2 + m.h / 2 : Pm.al === 'base' ? py + S / 2 - m.h / 2 : py;
    } else {
      S = Math.min(W * 0.46, H * 0.26); const gap = S * 0.16, Sw = S * kx;
      f = fitBox(rest, Pm.fs, W * 0.84, H * 0.36, o, 4); size = Math.min(f.size, S * 0.5);
      it = Object.assign({ text: f.text, font: Pm.fs, size, align: 'left', color: sc.fg, mi: 2 }, o);
      const m = J.measure(it), tot = S + gap + m.h, bx = Math.max(W * 0.08, (W - Math.max(m.w, Sw)) / 2);
      px = bx + Sw / 2; py = (H - tot) / 2 + S / 2;
      it.x = bx; it.y = py + S / 2 + gap + m.h / 2;
    }
    const e = E.outBack(J.clamp(env.lt / 0.42), 1.4), Sw = S * kx;
    if (e > 0 && out > 0) {
      if (Pm.shape === 'circle') env.circle(px, py, (S / 2) * e, plate, null, 1, out, false);
      else R(env, px - (Sw / 2) * e, py - (S / 2) * e, Sw * e, S * e, plate, out);
    }
    const gs = Math.min(S * (Pm.shape === 'circle' ? 0.6 : 0.76), J.fitSize(init, Pm.font, Sw * 0.84, S * 0.84));
    let bb = J.mainDraw(env, { text: init, font: Pm.font, size: gs, x: px, y: py, color: pon, mi: 0 });
    const e2 = inE(env, 0.6, 0.2) * out;
    if (!port && e2 > 0) { const y = Pm.al === 'base' ? py - S / 2 : py + S / 2; Ln(env, px + Sw / 2, y, px + Sw / 2 + (it.x - px - Sw / 2 + J.measure(it).w) * e2, y, plate, lw * 1.5, 1); }
    bb = U(bb, J.mainDraw(env, it));
    return bb ? U(bb, { x0: px - Sw / 2, y0: py - S / 2, x1: px + Sw / 2, y1: py + S / 2 }) : bb;
  },
});

/* ================================================================== 8 xaSplitBaseline — 段違い基線
   two halves on two baselines; one continuous rule runs in from the left edge, steps, and runs out right */
reg('xaSplitBaseline', {
  name: '段違い基線', en: 'Split Baseline', tags: ['graphic', 'editorial', 'emotional'], ae: 'mixed', w: 1.1, fits: n => n >= 2 && n <= 16,
  plan(rng, cut, st) { return { font: rng.pick(fontsOf(st, ['display', 'serif'])), dir: rng.pick([1, 1, -1]), acc: rng.chance(0.5), tick: rng.chance(0.6) }; },
  render(env) {
    const { W, H, sc, cut, Pm, M, port, txt, out, lw, ls, no } = base(env);
    const n = [...txt].length, latin = isLatinT(txt);
    let parts = splitL(txt, Math.ceil(n / 2)).split('\n');
    if (parts.length < 2) { const a = [...txt], h = Math.ceil(a.length / 2); parts = [a.slice(0, h).join(''), a.slice(h).join('')]; }
    const A = parts[0], B = parts.slice(1).join(latin ? ' ' : '');
    const aw = port ? W * 0.76 : W * 0.56, mh = port ? H * 0.2 : H * 0.3;
    const size = Math.min(J.fitSize(A, Pm.font, aw, mh, { track: 0.03 }), J.fitSize(B, Pm.font, aw, mh, { track: 0.03 }), M * 0.26);
    const dy = size * (port ? 0.95 : 0.6) * Pm.dir, yA = H / 2 - dy, yB = H / 2 + dy;
    const iA = { text: A, font: Pm.font, size, align: 'left', x: W * 0.07, y: yA, track: 0.03, color: sc.fg, mi: 0 };
    const iB = { text: B, font: Pm.font, size, align: 'right', x: W * 0.93, y: yB, track: 0.03, color: sc.fg, mi: 3 };
    const mA = J.measure(iA), mB = J.measure(iB), bA = yA + size * 0.6, bB = yB + size * 0.6;
    const xa = W * 0.07 + mA.w + size * 0.18, xb = W * 0.93 - mB.w - size * 0.18, rc = Pm.acc ? accentOn(sc) : sc.fg;
    const e = E.inOutCubic(J.clamp(env.lt / 0.7));
    if (out > 0) {
      if (env.pOut > 0) env.polyPartial([[W + 10, bB], [xb, bB], [xa, bA], [-10, bA]], out, rc, Math.max(2, size * 0.022), 1, false);
      else env.polyPartial([[-10, bA], [xa, bA], [xb, bB], [W + 10, bB]], e, rc, Math.max(2, size * 0.022), 1, false);
    }
    if (Pm.tick) {
      const a = inC(env, 0.3, 0.45) * out;
      for (let k = 0; k < 5; k++) { Ln(env, W * 0.07 + k * size * 0.5, bA, W * 0.07 + k * size * 0.5, bA + size * 0.07, rc, lw, a); Ln(env, W * 0.93 - k * size * 0.5, bB, W * 0.93 - k * size * 0.5, bB + size * 0.07, rc, lw, a); }
      label(env, `BL ${Pm.dir > 0 ? '+' : '−'}${Math.round(Math.abs(dy) * 2)}`, (xa + xb) / 2 + size * 0.12, (bA + bB) / 2 + ls * 0.9, { alpha: a });
    }
    return U(J.mainDraw(env, iA), J.mainDraw(env, iB));
  },
});

/* ================================================================== 9 xaHalfKnock — 版またぎ
   the lyric straddles the edge of a solid plate: positive off the plate, reversed on it */
reg('xaHalfKnock', {
  name: '版またぎ', en: 'Plate Straddle', tags: ['graphic', 'pop', 'editorial'], ae: 'center', w: 1.2, treat: 'safe', emph: 1.3, fits: n => n >= 1 && n <= 20,
  plan(rng, cut, st) { return { font: rng.pick(fontsOf(st, ['display'])), edge: rng.pick(['h', 'h', 'v']), side: rng.pick([0, 1]), col: rng.pick(['fg', 'accent', 'ink']) }; },
  render(env) {
    const { W, H, sc, cut, Pm, M, port, txt, out, lw, ls, no } = base(env), ctx = env.ctx;
    const mt = mainLines(txt, W, H, 10, 5), lead = 1.2, L = mt.split('\n').length;
    const size = Math.min(J.fitSize(mt, Pm.font, W * 0.84, H * 0.6, { lead, track: 0.02 }), M * 0.34);
    const plate = pickPlate(sc, Pm.col), pon = onCol(sc, plate), q = inE(env, 0.5) * (1 - E.inExpo(env.pOut));
    const horiz = Pm.edge === 'h';
    const edge = horiz ? H / 2 + (Math.floor((L - 1) / 2) - (L - 1) / 2) * size * lead + size * 0.03 : W / 2;
    // plate rectangle and its complement (big extents so entrances are not clipped)
    let pr, cr;
    if (horiz) { const y = Pm.side ? H - (H - edge) * q : edge * q; pr = Pm.side ? [-W, y, W * 3, H * 2] : [-W, -H, W * 3, H + y]; cr = Pm.side ? [-W, -H, W * 3, H + y] : [-W, y, W * 3, H * 2]; }
    else { const x = Pm.side ? W - (W - edge) * q : edge * q; pr = Pm.side ? [x, -H, W * 2, H * 3] : [-W, -H, W + x, H * 3]; cr = Pm.side ? [-W, -H, W + x, H * 3] : [x, -H, W * 2, H * 3]; }
    if (q > 0) R(env, pr[0], pr[1], pr[2], pr[3], plate, 1);
    const mk = color => ({ text: mt, font: Pm.font, size, x: W / 2, y: H / 2, lead, track: 0.02, color });
    ctx.save(); ctx.beginPath(); ctx.rect(cr[0], cr[1], cr[2], cr[3]); ctx.clip();
    let bb = J.mainDraw(env, mk(sc.fg)); ctx.restore();
    if (q > 0) { ctx.save(); ctx.beginPath(); ctx.rect(pr[0], pr[1], pr[2], pr[3]); ctx.clip(); bb = U(bb, J.mainDraw(env, mk(pon))); ctx.restore(); }
    const a = inC(env, 0.3, 0.35) * out;
    if (horiz) { const s = Pm.side ? 1 : -1; label(env, 'NEGA', W * 0.05, edge + s * ls, { color: pon, alpha: a * (q > 0.98 ? 1 : 0) }); label(env, 'POSI', W * 0.05, edge - s * ls, { alpha: a }); }
    else { const s = Pm.side ? 1 : -1; label(env, 'NEGA', edge + s * ls * 0.8, H * 0.95, { color: pon, alpha: a * (q > 0.98 ? 1 : 0), align: s > 0 ? 'left' : 'right' }); label(env, 'POSI', edge - s * ls * 0.8, H * 0.95, { alpha: a, align: s > 0 ? 'right' : 'left' }); }
    return bb;
  },
});

/* ================================================================== 10 xaFormCombs — 記入欄
   an application form: one comb cell per glyph, field labels, a ticked box */
reg('xaFormCombs', {
  name: '記入欄', en: 'Form Field', tags: ['editorial', 'graphic', 'calm'], ae: 'type', w: 0.9, fits: n => n >= 2 && n <= 16,
  plan(rng, cut, st) { return { font: rng.pick(fontsOf(st, ['body', 'serif', 'display'])), hd: rng.pick(['ink', 'accent']), full: rng.chance(0.5), chk: rng.chance(0.8) }; },
  render(env) {
    const { W, H, sc, cut, Pm, M, port, txt, out, lw, ls, no } = base(env);
    const slots = slotsOf(txt), per = port ? 5 : 8;
    const rowsA = (slots.length <= per ? [slots.join('')] : evenSplit(slots.join(''), Math.ceil(slots.length / per))).map(l => [...l]);
    const rows = rowsA.length, mxn = Math.max(...rowsA.map(r => r.length));
    const cell = Math.min((W * 0.8) / mxn, (H * 0.56) / (rows * 1.5), M * 0.26), pitch = cell * 1.5;
    const bw = cell * mxn, x0 = (W - bw) / 2, y0 = H / 2 - (rows * pitch) / 2 + cell * 0.1;
    const padF = cell * 0.4, fx0 = x0 - padF, fy0 = y0 - padF - ls * 2.2, fw = bw + padF * 2, fh = rows * pitch + padF * 1.4 + ls * 2.2 + (Pm.chk ? ls * 2.6 : 0);
    const e0 = inE(env, 0.5) * out, head = pickPlate(sc, Pm.hd), hon = onCol(sc, head), la = inC(env, 0.3, 0.25) * out;
    if (e0 > 0) env.polyPartial([[fx0, fy0], [fx0 + fw, fy0], [fx0 + fw, fy0 + fh], [fx0, fy0 + fh], [fx0, fy0]], e0, sc.sub, lw * 1.4, 0.9, false);
    R(env, fx0, fy0, fw * 0.36 * e0, ls * 1.9, head, 1);
    label(env, `FORM ${pad2(no)}-A`, fx0 + ls * 0.6, fy0 + ls * 0.95, { color: hon, alpha: la });
    label(env, `${J.glyphCount(txt)} / ${mxn * rows}`, fx0 + fw - ls * 0.6, fy0 + ls * 0.95, { align: 'right', alpha: la });
    let bb = null, gi = 0;
    rowsA.forEach((row, r) => {
      const yb = y0 + r * pitch + cell * 1.12, e = inE(env, 0.5, 0.1 + r * 0.08) * out;
      Ln(env, x0, yb, x0 + bw * e, yb, sc.fg, lw * 1.6, 1);
      for (let k = 0; k <= mxn; k++) { const end = k === 0 || k === mxn, hh = cell * (end || Pm.full ? 1.0 : 0.3) * e; Ln(env, x0 + k * cell, yb, x0 + k * cell, yb - hh, end ? sc.fg : sc.sub, end ? lw * 1.6 : lw, 1); }
      row.forEach((ch, k) => { if (!isSp(ch)) bb = U(bb, J.mainDraw(env, { text: ch, font: Pm.font, size: cell * 0.72, x: x0 + (k + 0.5) * cell, y: yb - cell * 0.52, color: sc.fg, mi: gi })); gi++; });
    });
    if (Pm.chk) {
      const cy = fy0 + fh - ls * 1.5, bs = ls * 1.2, cx = fx0 + padF;
      frame(env, cx, cy - bs / 2, bs, bs, sc.fg, lw * 1.4, la);
      const ec = E.outCubic(J.clamp((env.lt - 0.55) / 0.25)) * out;
      if (ec > 0) env.polyPartial([[cx + bs * 0.15, cy], [cx + bs * 0.42, cy + bs * 0.3], [cx + bs * 1.05, cy - bs * 0.55]], ec, accentOn(sc), lw * 3, 1, false);
      label(env, 'CONFIRMED', cx + bs * 1.5, cy, { alpha: la });
      frame(env, cx + fw * 0.5, cy - bs / 2, bs, bs, sc.sub, lw * 1.4, la);
      label(env, 'VOID', cx + fw * 0.5 + bs * 1.5, cy, { alpha: la });
    }
    return bb;
  },
});

/* ================================================================== 11 xaWaybill — 送り状
   a shipping label: heavy frame, FROM / TO cells, routing code plate, barcode */
reg('xaWaybill', {
  name: '送り状', en: 'Shipping Label', tags: ['graphic', 'pop', 'editorial'], ae: 'labels', w: 0.9, treat: 'safe', fits: n => n >= 1 && n <= 16,
  plan(rng, cut, st) { return { font: rng.pick(fontsOf(st, ['display', 'body'])), code: rng.pick(['KX', 'JZ', 'TY', 'OS', 'NR', 'HK']), num: rng.int(1, 99), tilt: rng.pick([0, 0, -1.5, 1.5]), flip: rng.chance(0.5) }; },
  render(env) {
    const { W, H, sc, cut, Pm, M, port, txt, out, lw, ls, no } = base(env);
    const cw = port ? W * 0.86 : Math.min(W * 0.8, H * 0.8 * 1.5), ch = port ? Math.min(H * 0.66, cw * 1.3) : H * 0.8, x0 = (W - cw) / 2, y0 = (H - ch) / 2;
    const paper = paperOf(sc), ink = onCol(sc, paper), faint = J.mix(paper, ink, 0.35), mono = monoF(env);
    return tilted(env, W / 2, H / 2, Pm.tilt, () => {
      const e = inE(env, 0.4), la = inC(env, 0.3, 0.22) * out, bl = Math.max(3, M * 0.006), e2 = inE(env, 0.55, 0.12);
      R(env, x0, y0, cw, ch * e, paper, out);
      const fx = x0 + bl * 2.5, fy = y0 + bl * 2.5, fw = cw - bl * 5, fh = ch - bl * 5, y1 = fy + fh * 0.24, y2 = fy + fh * 0.76;
      if (e2 > 0 && out > 0) env.polyPartial([[fx, fy], [fx + fw, fy], [fx + fw, fy + fh], [fx, fy + fh], [fx, fy]], e2, ink, bl, out, false);
      Ln(env, fx, y1, fx + fw * e2, y1, ink, bl * 0.7, out); Ln(env, fx + fw, y2, fx + fw - fw * e2, y2, ink, bl * 0.7, out);
      const xv = fx + fw * (Pm.flip ? 0.36 : 0.64);
      Ln(env, xv, fy, xv, fy + (y1 - fy) * e2, ink, bl * 0.7, out);
      const fromX = Pm.flip ? xv : fx, fromW = Pm.flip ? fx + fw - xv : xv - fx, codeX = Pm.flip ? fx : xv, codeW = fw - fromW;
      label(env, 'FROM', fromX + ls * 0.8, fy + ls * 1.3, { color: ink, alpha: la, size: ls * 0.9 });
      greek(env, fromX + ls * 0.8, fy + ls * 2.6, fromW * 0.6, 2, ls * 1.1, faint, la, cut.seed, inE(env, 0.5, 0.25));
      R(env, codeX, fy, codeW, (y1 - fy) * e2, ink, out);
      const code = `${Pm.code}-${pad2(Pm.num)}`;
      label(env, code, codeX + codeW / 2, (fy + y1) / 2, { align: 'center', color: paper, alpha: la, font: mono, size: Math.min((y1 - fy) * 0.5, J.fitSize(code, mono, codeW * 0.8, 1e6, { track: 0.06 })), track: 0.06 });
      label(env, 'TO', fx + ls * 0.8, y1 + ls * 1.3, { color: ink, alpha: la, size: ls * 0.9 });
      barcode(env, fx + ls * 0.8, y2 + (fy + fh - y2) * 0.22, fw * 0.5, (fy + fh - y2) * 0.56, ink, la, cut.seed, inE(env, 0.6, 0.3));
      label(env, `PCS 1/1`, fx + fw - ls * 0.8, y2 + (fy + fh - y2) * 0.33, { align: 'right', color: ink, alpha: la });
      label(env, `No.${String(100000 + (J.h(cut.seed, 9) % 899999))}`, fx + fw - ls * 0.8, y2 + (fy + fh - y2) * 0.68, { align: 'right', color: faint, alpha: la });
      const o = { lead: 1.2, track: 0.02 }, f = fitBox(txt, Pm.font, fw * 0.88, (y2 - y1) * 0.7, o, port ? 4 : 3), size = Math.min(f.size, M * 0.26);
      return J.mainDraw(env, Object.assign({ text: f.text, font: Pm.font, size, x: W / 2, y: (y1 + y2) / 2 + ls * 0.5, color: ink }, o));
    });
  },
});

/* ================================================================== 12 xaErrata — 正誤表
   an errata slip: the struck-out "wrong" line above, the lyric as the correction below */
reg('xaErrata', {
  name: '正誤表', en: 'Errata Slip', tags: ['editorial', 'emotional', 'calm'], ae: 'gloss', w: 0.9, fits: n => n >= 1 && n <= 20,
  plan(rng, cut, st) { return { font: rng.pick(fontsOf(st, ['serif', 'display'])), strike: rng.pick(['line', 'double', 'wave']), pg: rng.int(3, 240), ln: rng.int(1, 24) }; },
  render(env) {
    const { W, H, sc, cut, Pm, M, port, txt, out, lw, ls, no } = base(env);
    const latin = isLatinT(txt), labs = latin ? ['FOR', 'READ'] : ['誤', '正'];
    const tw = W * 0.86, x0 = W * 0.07, lc = M * (latin ? 0.15 : 0.12), hh = ls * 2.4, h1 = H * (port ? 0.2 : 0.25), h2 = H * (port ? 0.38 : 0.44), th = hh + h1 + h2, y0 = (H - th) / 2;
    const acc = accentOn(sc), pad = M * 0.035, o = { lead: 1.2, track: 0.03 }, e = inE(env, 0.6) * out, la = inC(env, 0.3, 0.2) * out;
    R(env, x0, y0 + hh - M * 0.005, tw * e, M * 0.005, sc.fg, 1);
    Ln(env, x0, y0 + hh + h1, x0 + tw * e, y0 + hh + h1, sc.sub, lw, 0.8);
    R(env, x0 + tw * (1 - e), y0 + th, tw * e, M * 0.005, sc.fg, 1);
    Ln(env, x0 + lc, y0 + hh, x0 + lc, y0 + hh + (h1 + h2) * e, sc.sub, lw, 0.8);
    label(env, latin ? 'ERRATA' : '正誤表', x0, y0 + hh * 0.42, { font: bodyF(env), size: ls * 1.25, color: sc.fg, alpha: la, track: 0.3 });
    label(env, `p.${Pm.pg}  l.${Pm.ln}`, x0 + tw, y0 + hh * 0.42, { align: 'right', alpha: la });
    const lsz2 = latin ? lc * 0.24 : lc * 0.44;
    label(env, labs[0], x0 + lc / 2, y0 + hh + h1 / 2, { align: 'center', font: bodyF(env), size: lsz2, color: sc.sub, alpha: la, track: 0.05 });
    label(env, labs[1], x0 + lc / 2, y0 + hh + h1 + h2 / 2, { align: 'center', font: bodyF(env), size: lsz2, color: acc, alpha: la, track: 0.05 });
    // the struck-out version
    const fw = fitBox(txt, Pm.font, tw - lc - pad * 2, h1 * 0.68, o, 2), wi = Object.assign({ text: fw.text, font: Pm.font, size: fw.size, align: 'left', x: x0 + lc + pad, y: y0 + hh + h1 / 2, color: sc.sub, alpha: 0.8 * la, ghost: false }, o);
    env.draw(wi);
    const gl = glyphPts(wi), rowsX = {};
    gl.forEach(g => { const r = rowsX[g.li] || (rowsX[g.li] = { a: 1e9, b: -1e9, y: g.y }); r.a = Math.min(r.a, g.x - g.w / 2); r.b = Math.max(r.b, g.x + g.w / 2); });
    const es = E.inOutCubic(J.clamp((env.lt - 0.35) / 0.4)) * out;
    if (es > 0) Object.keys(rowsX).forEach(k => {
      const r = rowsX[k], xa = r.a - fw.size * 0.1, xb = J.lerp(xa, r.b + fw.size * 0.1, es), sw = Math.max(2, fw.size * 0.045);
      if (Pm.strike === 'wave') { const pts = []; for (let x = xa; x <= xb; x += fw.size * 0.08) pts.push([x, r.y + Math.sin((x - xa) / (fw.size * 0.16)) * fw.size * 0.07]); if (pts.length > 1) env.line(pts, acc, sw, 1, false); }
      else if (Pm.strike === 'double') { Ln(env, xa, r.y - fw.size * 0.08, xb, r.y - fw.size * 0.08, acc, sw * 0.7); Ln(env, xa, r.y + fw.size * 0.08, xb, r.y + fw.size * 0.08, acc, sw * 0.7); }
      else Ln(env, xa, r.y, xb, r.y, acc, sw);
    });
    const f = fitBox(txt, Pm.font, tw - lc - pad * 2, h2 * 0.78, o, port ? 4 : 3), size = Math.min(f.size, M * 0.24);
    return J.mainDraw(env, Object.assign({ text: f.text, font: Pm.font, size, align: 'left', x: x0 + lc + pad, y: y0 + hh + h1 + h2 / 2, color: sc.fg }, o));
  },
});

/* ================================================================== 13 xaTabStops — タブ揃え
   a word-processor ruler with tab stops; each line hangs from the next stop */
reg('xaTabStops', {
  name: 'タブ揃え', en: 'Tab Stops', tags: ['editorial', 'graphic', 'calm'], ae: 'stack', w: 0.8, fits: n => n >= 2 && n <= 16,
  plan(rng, cut, st) { return { font: rng.pick(fontsOf(st, ['display', 'serif', 'body'])), dir: rng.pick([1, 1, -1]), guide: rng.chance(0.85), arrow: rng.chance(0.7) }; },
  render(env) {
    const { W, H, sc, cut, Pm, M, port, txt, out, lw, ls, no } = base(env);
    const n = [...txt].length;
    const lines = smartSplit(txt, port ? (n <= 3 ? 1 : n <= 7 ? 2 : n <= 11 ? 3 : 4) : (n <= 4 ? 1 : n <= 10 ? 2 : 3), port), L = lines.length;
    const x0 = W * 0.07, tw = W * 0.86, ry = H * 0.1, stp = W * (port ? 0.075 : 0.09), acc = accentOn(sc);
    const ind = k => stp * ((Pm.dir > 0 ? k : L - 1 - k) + (L === 1 ? 1 : 0.5));
    const areaH = H * 0.66, size = Math.min(M * 0.24, (areaH / L) * 0.78, ...lines.map((l, k) => J.fitSize(l, Pm.font, tw - ind(k), 1e6, { track: 0.03 })));
    const pitch = Math.min(size * 1.4, areaH / L), cy = H * 0.56;
    // ruler
    const e = inE(env, 0.6) * out, nt = 40;
    Ln(env, x0, ry, x0 + tw * e, ry, sc.sub, lw * 1.4, 1);
    for (let k = 0; k <= nt * e; k++) { const mj = k % 5 === 0; Ln(env, x0 + (tw * k) / nt, ry, x0 + (tw * k) / nt, ry - M * (mj ? 0.016 : 0.008), sc.sub, lw, 1); if (k % 10 === 0) label(env, String(k), x0 + (tw * k) / nt, ry - M * 0.03, { align: 'center', size: ls * 0.8, alpha: out, track: 0 }); }
    let bb = null;
    lines.forEach((l, k) => {
      const x = x0 + ind(k), y = cy + (k - (L - 1) / 2) * pitch, a = inE(env, 0.45, 0.15 + k * 0.1) * out, s = M * 0.012;
      if (a > 0) env.line([[x, ry + s * 0.4], [x, ry + s * 1.9], [x + s * 1.3, ry + s * 1.9]], acc, lw * 2.5, a, false);
      if (Pm.guide) dashL(env, x, ry + s * 2.6, x, J.lerp(ry + s * 2.6, y + size * 0.55, a), sc.sub, lw, 0.7 * out, [lw * 3, lw * 4]);
      if (Pm.arrow && x - x0 > size * 0.5 && a > 0) { const ax = J.lerp(x0, x - size * 0.14, a), h = size * 0.07; Ln(env, x0, y, ax, y, sc.sub, lw * 1.3, 0.8 * a); env.line([[ax - h, y - h], [ax, y], [ax - h, y + h]], sc.sub, lw * 1.3, 0.8 * a, false); }
      bb = U(bb, J.mainDraw(env, { text: l, font: Pm.font, size, align: 'left', x, y, track: 0.03, color: sc.fg, mi: k * 2 }));
    });
    label(env, `TAB ×${L}`, x0 + tw, ry + ls * 1.2, { align: 'right', alpha: inC(env, 0.3, 0.3) * out });
    return bb;
  },
});

/* ================================================================== 14 xaTriBand — 三段表紙
   a paperback cover in three bands: colour / title panel / colour, with cartouche and colophon mark */
reg('xaTriBand', {
  name: '三段表紙', en: 'Banded Cover', tags: ['editorial', 'pop', 'graphic'], ae: 'labels', w: 1, treat: 'safe', portrait: 1.2, fits: n => n >= 1 && n <= 16,
  plan(rng, cut, st) { return { font: rng.pick(fontsOf(st, ['serif', 'display'])), col: rng.pick(['accent', 'accent', 'ink']), k: rng.pick([0.26, 0.3, 0.33]), mark: rng.pick(['circle', 'sq', 'dia']), tilt: rng.pick([0, 0, -1.5, 1.5]) }; },
  render(env) {
    const { W, H, sc, cut, Pm, M, port, txt, out, lw, ls, no } = base(env);
    const ch = port ? Math.min(H * 0.8, W * 0.82 * 1.5) : H * 0.86, cw = port ? W * 0.82 : Math.min(ch * 0.72, W * 0.8), x0 = (W - cw) / 2, y0 = (H - ch) / 2;
    const paper = paperOf(sc), ink = onCol(sc, paper);
    let band = J.mix(paper, ink, 0.8);
    for (const c of Pm.col === 'ink' ? [sc.ink, sc.accent, sc.accent2] : [sc.accent, sc.accent2, sc.ink]) if (c && J.contrast(c, paper) >= 1.5 && J.contrast(c, sc.bg) >= 1.25) { band = c; break; }
    const bon = onCol(sc, band), bh = ch * Pm.k;
    return tilted(env, W / 2, H / 2, Pm.tilt, () => {
      const e1 = inE(env, 0.45), e2 = inE(env, 0.45, 0.07), e3 = inE(env, 0.45, 0.14), la = inC(env, 0.3, 0.3) * out;
      R(env, x0 + (cw / 2) * (1 - e2), y0 + bh - 1, cw * e2, ch - bh * 2 + 2, paper, out);
      R(env, x0, y0 - (1 - e1) * H * 0.2, cw, bh, band, out * e1);
      R(env, x0, y0 + ch - bh + (1 - e3) * H * 0.2, cw, bh, band, out * e3);
      // cartouche
      const kw = cw * 0.56, kh = bh * 0.44, ky = y0 + bh / 2;
      env.rrect(W / 2 - kw / 2, ky - kh / 2, kw, kh, kh / 2, null, la, false, bon, lw * 2);
      label(env, 'LYRIC  BOOKS', W / 2, ky, { align: 'center', color: bon, alpha: la, size: Math.min(kh * 0.36, ls * 1.3), track: 0.25 });
      // colophon mark
      const my = y0 + ch - bh / 2, r = bh * 0.22;
      if (la > 0) {
        if (Pm.mark === 'circle') { env.circle(W / 2, my, r, null, bon, lw * 2, la, false); env.circle(W / 2, my, r * 0.35, bon, null, 1, la, false); }
        else if (Pm.mark === 'sq') { frame(env, W / 2 - r, my - r, r * 2, r * 2, bon, lw * 2, la); R(env, W / 2 - r * 0.4, my - r * 0.4, r * 0.8, r * 0.8, bon, la); }
        else { env.line([[W / 2, my - r * 1.2], [W / 2 + r * 1.2, my], [W / 2, my + r * 1.2], [W / 2 - r * 1.2, my], [W / 2, my - r * 1.2]], bon, lw * 2, la, false); env.circle(W / 2, my, r * 0.3, bon, null, 1, la, false); }
      }
      label(env, `No.${pad2(no)}`, x0 + cw - ls, y0 + ch - ls * 1.2, { align: 'right', color: bon, alpha: la, size: ls * 0.9 });
      const mh = ch - bh * 2, o = { lead: 1.22, track: 0.03 }, f = fitBox(txt, Pm.font, cw * 0.84, mh * 0.62, o, 4), size = Math.min(f.size, cw * 0.3);
      const it = Object.assign({ text: f.text, font: Pm.font, size, x: W / 2, y: y0 + ch / 2 - mh * 0.05, color: ink }, o), m = J.measure(it);
      const ry = Math.min(y0 + ch - bh - mh * 0.09, it.y + m.h / 2 + mh * 0.09);
      Ln(env, W / 2 - cw * 0.12 * e3, ry, W / 2 + cw * 0.12 * e3, ry, ink, lw * 1.5, out);
      return J.mainDraw(env, it);
    });
  },
});

/* ================================================================== 15 xaAirmail — エアメール
   an airmail envelope: striped border, perforated stamp, postmark waves */
reg('xaAirmail', {
  name: 'エアメール', en: 'Airmail', tags: ['emotional', 'pop', 'calm'], ae: 'labels', w: 0.9, treat: 'safe', fits: n => n >= 1 && n <= 20,
  plan(rng, cut, st) { return { font: rng.pick(fontsOf(st, ['serif', 'body', 'display'])), stamp: rng.chance(0.85), tilt: rng.pick([-2, 0, 2]), tag: rng.chance(0.7) }; },
  render(env) {
    const { W, H, sc, cut, Pm, M, port, txt, out, lw, ls, no } = base(env), ctx = env.ctx;
    const ew = port ? W * 0.88 : Math.min(W * 0.84, H * 0.82 * 1.5), eh = port ? Math.min(H * 0.6, ew * 1.15) : ew / 1.5, x0 = (W - ew) / 2, y0 = (H - eh) / 2;
    const paper = paperOf(sc), ink = onCol(sc, paper), c1 = accOn(sc, paper);
    const c2 = sc.accent2 && sc.accent2 !== c1 && J.contrast(sc.accent2, paper) >= 1.6 ? sc.accent2 : ink;
    return tilted(env, W / 2, H / 2, Pm.tilt, () => {
      const e = inE(env, 0.45), a = e * out, b = M * 0.03, la = inC(env, 0.3, 0.3) * out;
      R(env, x0, y0 + (1 - e) * M * 0.04, ew, eh, paper, a);
      if (env.pass === 'main' && a > 0) {
        ctx.save(); ctx.globalAlpha = a; ctx.beginPath(); ctx.rect(x0, y0, ew, eh); ctx.rect(x0 + b, y0 + b, ew - b * 2, eh - b * 2); ctx.clip('evenodd');
        const p = b * 2.6, sh = (env.ltb * b * 0.5) % p;
        [c1, c2].forEach((c, k) => {
          ctx.fillStyle = c; ctx.beginPath();
          for (let x = x0 - eh - p + sh + k * p * 0.5, i = 0; x < x0 + ew + p && i < 200; x += p, i++) { ctx.moveTo(x, y0 + eh); ctx.lineTo(x + p * 0.27, y0 + eh); ctx.lineTo(x + p * 0.27 + eh, y0); ctx.lineTo(x + eh, y0); ctx.closePath(); }
          ctx.fill();
        });
        ctx.restore();
      }
      if (Pm.stamp) {
        const sw = Math.min(eh * 0.2, ew * 0.14), sh2 = sw * 1.2, sx = x0 + ew - b * 2 - sw, sy = y0 + b * 2;
        dashL(env, sx, sy, sx + sw, sy, ink, lw * 2, la, [lw * 2, lw * 3]); dashL(env, sx, sy + sh2, sx + sw, sy + sh2, ink, lw * 2, la, [lw * 2, lw * 3]);
        dashL(env, sx, sy, sx, sy + sh2, ink, lw * 2, la, [lw * 2, lw * 3]); dashL(env, sx + sw, sy, sx + sw, sy + sh2, ink, lw * 2, la, [lw * 2, lw * 3]);
        R(env, sx + sw * 0.14, sy + sw * 0.14, sw * 0.72, sh2 - sw * 0.28, c1, la * 0.85);
        label(env, pad2(no), sx + sw / 2, sy + sh2 / 2, { align: 'center', color: onCol(sc, c1), alpha: la, size: sw * 0.34, track: 0 });
        const pe = E.outCubic(J.clamp((env.lt - 0.45) / 0.3)) * out, px = sx - sw * 0.1, py = sy + sh2 * 0.62, pr = sw * 0.46;
        if (pe > 0) {
          env.circle(px, py, pr * (1.25 - 0.25 * pe), null, ink, lw * 1.5, 0.7 * pe, false); env.circle(px, py, pr * 0.66, null, ink, lw, 0.7 * pe, false);
          for (let k = 0; k < 4; k++) { const pts = []; for (let i = 0; i <= 16; i++) pts.push([px - pr * 1.2 - (i / 16) * sw * 1.5 * pe, py + (k - 1.5) * pr * 0.42 + Math.sin(i * 1.1) * pr * 0.09]); env.line(pts, ink, lw * 1.3, 0.6 * pe, false); }
        }
      }
      if (Pm.tag) { const tw = Math.min(ew * 0.26, ls * 11), th = ls * 1.9, tx = x0 + b * 2, ty = y0 + eh - b * 2 - th; R(env, tx, ty, tw * inE(env, 0.4, 0.25), th, c1, out); label(env, 'PAR AVION', tx + tw / 2, ty + th / 2, { align: 'center', color: onCol(sc, c1), alpha: la, size: Math.min(ls, tw * 0.1), track: 0.2 }); }
      const o = { lead: 1.25, track: 0.03 }, f = fitBox(txt, Pm.font, ew * 0.74, eh * 0.4, o, port ? 4 : 3), size = Math.min(f.size, M * 0.22);
      const it = Object.assign({ text: f.text, font: Pm.font, size, x: W / 2, y: y0 + eh * 0.55, color: ink }, o), m = J.measure(it);
      const uy = it.y + m.h / 2 + size * 0.22, ue = inE(env, 0.6, 0.2) * out;
      Ln(env, W / 2 - (m.w / 2) * ue, uy, W / 2 + (m.w / 2) * ue, uy, ink, lw, 0.6);
      return J.mainDraw(env, it);
    });
  },
});

/* ================================================================== 16 xaFigure — 図版
   an empty picture box (FPO placeholder) with the lyric set as its caption */
reg('xaFigure', {
  name: '図版', en: 'Figure Caption', tags: ['editorial', 'calm', 'graphic'], ae: 'gloss', w: 1, fits: n => n >= 1 && n <= 20,
  plan(rng, cut, st) { return { font: rng.pick(fontsOf(st, ['serif', 'display', 'body'])), side: rng.pick(['l', 'r']), pic: rng.pick(['x', 'scene', 'target']), top: rng.chance(0.5) }; },
  render(env) {
    const { W, H, sc, cut, Pm, M, port, txt, out, lw, ls, no } = base(env);
    const o = { lead: 1.22, track: 0.03 }, dim = dimOf(sc), acc = accentOn(sc);
    let bx, by, bw, bh, it;
    if (!port) {
      bw = W * 0.3; bh = H * 0.58; by = (H - bh) / 2; bx = Pm.side === 'l' ? W * 0.07 : W * 0.93 - bw;
      const gap = W * 0.04, aw = W * 0.86 - bw - gap, f = fitBox(txt, Pm.font, aw, bh * 0.7, o, 3), size = Math.min(f.size, M * 0.24);
      it = Object.assign({ text: f.text, font: Pm.font, size, align: 'left', x: Pm.side === 'l' ? bx + bw + gap : W * 0.07, color: sc.fg }, o);
      const m = J.measure(it); it.y = by + bh - m.h / 2 - size * 0.05; it._cx = it.x; it._cy = it.y - m.h / 2 - size * 0.45; it._w = aw;
    } else {
      bw = W * 0.86; bh = H * 0.3; bx = W * 0.07; by = Pm.top ? H * 0.1 : H * 0.6;
      const f = fitBox(txt, Pm.font, bw, H * 0.34, o, 4), size = Math.min(f.size, M * 0.24);
      it = Object.assign({ text: f.text, font: Pm.font, size, align: 'left', x: bx, color: sc.fg }, o);
      const m = J.measure(it); it.y = Pm.top ? by + bh + ls * 4 + m.h / 2 : by - ls * 2 - m.h / 2; it._cx = bx; it._cy = it.y - m.h / 2 - ls * 1.6; it._w = bw;
    }
    const e = inE(env, 0.6) * out, e2 = E.inOutCubic(J.clamp((env.lt - 0.15) / 0.6)) * out;
    R(env, bx, by, bw, bh * e, dim, 0.7);
    if (e2 > 0) {
      env.polyPartial([[bx, by], [bx + bw, by], [bx + bw, by + bh], [bx, by + bh], [bx, by]], e2, sc.sub, lw * 1.5, 1, false);
      if (Pm.pic === 'x') { Ln(env, bx, by, bx + bw * e2, by + bh * e2, sc.sub, lw, 0.9); Ln(env, bx + bw, by, bx + bw - bw * e2, by + bh * e2, sc.sub, lw, 0.9); }
      else if (Pm.pic === 'scene') { env.polyPartial([[bx, by + bh * 0.8], [bx + bw * 0.3, by + bh * 0.45], [bx + bw * 0.5, by + bh * 0.68], [bx + bw * 0.7, by + bh * 0.38], [bx + bw, by + bh * 0.75]], e2, sc.sub, lw * 1.5, 0.9, false); env.circle(bx + bw * 0.24, by + bh * 0.24, Math.min(bw, bh) * 0.08 * e2, null, sc.sub, lw * 1.5, 0.9, false); }
      else { const r = Math.min(bw, bh) * 0.22; env.circle(bx + bw / 2, by + bh / 2, r * e2, null, sc.sub, lw * 1.5, 0.9, false); Ln(env, bx + bw / 2 - r * 1.5 * e2, by + bh / 2, bx + bw / 2 + r * 1.5 * e2, by + bh / 2, sc.sub, lw, 0.9); Ln(env, bx + bw / 2, by + bh / 2 - r * 1.5 * e2, bx + bw / 2, by + bh / 2 + r * 1.5 * e2, sc.sub, lw, 0.9); }
    }
    const la = inC(env, 0.3, 0.3) * out;
    label(env, 'FPO', bx + ls * 0.7, by + bh - ls, { alpha: la * 0.8, size: ls * 0.85 });
    label(env, `${Math.round(bw)} × ${Math.round(bh)}`, bx + bw - ls * 0.7, by + bh - ls, { align: 'right', alpha: la * 0.8, size: ls * 0.85 });
    label(env, `FIG. ${pad2(no)}`, it._cx, it._cy, { alpha: la, color: acc, size: ls * 1.1 });
    Ln(env, it._cx + ls * 6.2, it._cy, it._cx + ls * 6.2 + Math.max(0, it._w - ls * 6.2) * inE(env, 0.6, 0.25), it._cy, sc.sub, lw, 0.8 * out);
    return J.mainDraw(env, it);
  },
});

/* ================================================================== 17 xaLineNumbers — 行番号
   a numbered listing: line-number gutter, vertical rule, greeked neighbours, the lyric on the live lines */
reg('xaLineNumbers', {
  name: '行番号', en: 'Line Numbers', tags: ['editorial', 'calm', 'glitch'], ae: 'type', w: 1, fits: n => n >= 1 && n <= 22,
  plan(rng, cut, st) { return { font: rng.pick(fontsOf(st, ['serif', 'body', 'display'])), hl: rng.chance(0.65), start: rng.int(1, 90), every: rng.pick([1, 1, 5]) }; },
  render(env) {
    const { W, H, sc, cut, Pm, M, port, txt, out, lw, ls, no } = base(env);
    const lead = 1.5, o = { lead, track: 0.03 }, gw = M * 0.12, tx = W * 0.07 + gw;
    const f = fitBox(txt, Pm.font, W * 0.86 - gw, H * 0.5, o, port ? 4 : 3), size = Math.min(f.size, M * 0.2), L = f.text.split('\n').length;
    const pitch = size * lead, yOf = i => H / 2 + (i - (L - 1) / 2) * pitch, dim = dimOf(sc), acc = accentOn(sc);
    const before = Math.min(3, Math.floor((yOf(0) - H * 0.08) / pitch)), after = Math.min(3, Math.floor((H * 0.92 - yOf(L - 1)) / pitch));
    const rx = tx - gw * 0.22, e = inE(env, 0.7) * out;
    Ln(env, rx, H * 0.06, rx, H * 0.06 + H * 0.88 * e, sc.sub, lw, 0.8);
    if (Pm.hl) R(env, rx, yOf(0) - pitch / 2, (W - rx) * inE(env, 0.5, 0.05), L * pitch, dim, 0.55 * out);
    const ns = Math.min(size * 0.3, gw * 0.3);
    for (let i = -before; i < L + after; i++) {
      const live = i >= 0 && i < L, num = Pm.start + before + i, a = inC(env, 0.3, 0.05 + (i + before) * 0.04) * out;
      if (live || Pm.every === 1 || num % 5 === 0) label(env, String(num).padStart(3, ' '), rx - gw * 0.14, yOf(i), { align: 'right', size: ns, color: live ? acc : sc.sub, alpha: a * (live ? 1 : 0.7), track: 0 });
      if (!live) R(env, tx, yOf(i) - size * 0.09, (W * 0.86 - gw) * (0.35 + 0.55 * J.r(cut.seed, i + 9, 31)) * inE(env, 0.6, 0.05 + (i + before) * 0.04), size * 0.18, dim, out);
    }
    return J.mainDraw(env, Object.assign({ text: f.text, font: Pm.font, size, align: 'left', x: tx, y: H / 2, color: sc.fg }, o));
  },
});

/* ================================================================== 18 xaPunchCard — パンチカード
   a punched card: clipped corner, digit field, holes punched column by column, lyric printed along the top */
reg('xaPunchCard', {
  name: 'パンチカード', en: 'Punch Card', tags: ['graphic', 'glitch', 'pop'], ae: 'labels', w: 0.7, treat: 'safe', fits: n => n >= 1 && n <= 16,
  plan(rng, cut, st) { return { font: rng.pick(fontsOf(st, ['body', 'display', 'mono'])), cols: rng.pick([28, 32, 36]), tilt: rng.pick([0, -1.5, 1.5]) }; },
  render(env) {
    const { W, H, sc, cut, Pm, M, port, txt, out, lw, ls, no } = base(env);
    const cw = port ? W * 0.9 : Math.min(W * 0.88, H * 0.82 * 1.9), ch = port ? Math.min(H * 0.7, cw * 1.35) : cw / 1.9, x0 = (W - cw) / 2, y0 = (H - ch) / 2;
    const paper = paperOf(sc), ink = onCol(sc, paper), faint = J.mix(paper, ink, 0.3);
    return tilted(env, W / 2, H / 2, Pm.tilt, () => {
      const e = inE(env, 0.45), a = e * out, c = ch * 0.09, dx = (1 - e) * W * 0.08, la = inC(env, 0.3, 0.25) * out;
      if (a > 0) env.poly([[x0 + c - dx, y0], [x0 + cw - dx, y0], [x0 + cw - dx, y0 + ch], [x0 - dx, y0 + ch], [x0 - dx, y0 + c]], paper, a, false);
      const zy = y0 + ch * (port ? 0.34 : 0.4), nR = port ? 12 : 9, nC = port ? 18 : Pm.cols, gx = x0 + cw * 0.05, gw = cw * 0.9, gy = zy + ch * 0.045, gh = y0 + ch * 0.95 - gy, cx = gw / nC, cy = gh / nR;
      Ln(env, x0 + cw * 0.05, zy, x0 + cw * 0.05 + cw * 0.9 * inE(env, 0.6, 0.15), zy, ink, lw * 1.5, out);
      label(env, `JZ ${5000 + (J.h(cut.seed, 4) % 999)}`, x0 + cw * 0.95, y0 + ls * 1.3, { align: 'right', color: faint, alpha: la, size: ls * 0.85 });
      const prog = J.clamp((env.lt - 0.2) / 0.9) * nC;
      for (let k = 0; k < nC; k++) {
        const ea = inC(env, 0.3, 0.1 + k * 0.012) * out;
        if (ea <= 0) continue;
        const h1 = J.h(cut.seed, k, 51) % nR, h2 = J.h(cut.seed, k, 53) % (nR * 3);
        for (let r = 0; r < nR; r++) {
          const hole = k < prog && (r === h1 || r === h2);
          if (hole) R(env, gx + k * cx + cx * 0.2, gy + r * cy + cy * 0.08, cx * 0.6, cy * 0.84, sc.bg, out);
          else R(env, gx + k * cx + cx * 0.36, gy + r * cy + cy * 0.34, cx * 0.28, cy * 0.32, faint, ea);
        }
      }
      const zh = zy - y0, o = { lead: 1.18, track: 0.03 }, f = fitBox(txt, Pm.font, cw * 0.84, zh * 0.74, o, port ? 4 : 2), size = Math.min(f.size, M * 0.24);
      return J.mainDraw(env, Object.assign({ text: f.text, font: Pm.font, size, x: W / 2 + c * 0.2, y: y0 + zh * 0.53, color: ink }, o));
    });
  },
});

/* ================================================================== 19 xaSpacers — 込め物
   letterspaced type with the spacing material made visible: quads between the glyphs, widths noted */
reg('xaSpacers', {
  name: '込め物', en: 'Spacing Quads', tags: ['editorial', 'graphic', 'calm'], ae: 'type', w: 1, fits: n => n >= 2 && n <= 16,
  plan(rng, cut, st) { return { font: rng.pick(fontsOf(st, ['display', 'serif'])), lab: rng.chance(0.75), style: rng.pick(['x', 'fill', 'hatch']), tr: rng.pick([0.5, 0.62, 0.75]) }; },
  render(env) {
    const { W, H, sc, cut, Pm, M, port, txt, out, lw, ls, no } = base(env);
    const n = J.glyphCount(txt), L = port ? Math.ceil(n / 4) : Math.ceil(n / 5), lead = 1.75;
    const mt = evenSplit(txt, L).join('\n'), o = { lead, track: Pm.tr };
    const size = Math.min(J.fitSize(mt, Pm.font, W * 0.76, H * 0.66, o), M * 0.26);
    const it = Object.assign({ text: mt, font: Pm.font, size, x: W / 2, y: H / 2, color: sc.fg }, o);
    const gl = glyphPts(it), dim = dimOf(sc), acc = accentOn(sc);
    let q = 0;
    for (let i = 0; i < gl.length; i++) {
      const a = gl[i], b = gl[i + 1], first = i === 0 || gl[i - 1].li !== a.li, last = !b || b.li !== a.li;
      const quads = [];
      if (first) quads.push([a.x - a.w / 2 - size * 0.42, a.x - a.w / 2 - size * 0.06]);
      quads.push(last ? [a.x + a.w / 2 + size * 0.06, a.x + a.w / 2 + size * 0.42] : [a.x + a.w / 2 + size * 0.05, b.x - b.w / 2 - size * 0.05]);
      for (const [xa, xb] of quads) {
        const e = inE(env, 0.45, 0.1 + q * 0.03) * out; q++;
        if (e <= 0 || xb - xa < size * 0.08) continue;
        const h = size * 0.9 * e, ya = a.y - h / 2, wq = xb - xa;
        if (Pm.style === 'fill') R(env, xa, ya, wq, h, dim, 1);
        else {
          frame(env, xa, ya, wq, h, sc.sub, lw, 0.9);
          if (Pm.style === 'x') { Ln(env, xa, ya, xb, ya + h, sc.sub, lw, 0.7); Ln(env, xb, ya, xa, ya + h, sc.sub, lw, 0.7); }
          else for (let k = 1; k <= 3; k++) Ln(env, xa, ya + (h * k) / 4, xb, ya + (h * k) / 4 - Math.min(h / 4, wq * 0.6), sc.sub, lw, 0.7);
        }
        if (Pm.lab) label(env, (wq / size).toFixed(2).replace(/^0/, ''), (xa + xb) / 2, a.y + size * 0.66, { align: 'center', size: Math.max(9, size * 0.12), alpha: e, track: 0, color: first && quads.length > 1 && xa < a.x && q % 2 ? sc.sub : acc });
      }
    }
    return J.mainDraw(env, it);
  },
});

/* ================================================================== 20 xaCutLine — 切り取り線
   a dashed cut line across the sheet with scissors travelling along it; lyric above, stub below */
reg('xaCutLine', {
  name: '切り取り線', en: 'Cut Line', tags: ['pop', 'graphic', 'editorial'], ae: 'center', w: 1, fits: n => n >= 1 && n <= 20,
  plan(rng, cut, st) { return { font: rng.pick(fontsOf(st, ['display', 'serif', 'body'])), pos: rng.pick(['low', 'low', 'high']), stub: rng.pick(['bar', 'form']), dir: rng.pick([1, 1, -1]) }; },
  render(env) {
    const { W, H, sc, cut, Pm, M, port, txt, out, lw, ls, no } = base(env);
    const low = Pm.pos === 'low', yl = H * (low ? (port ? 0.72 : 0.68) : (port ? 0.28 : 0.32));
    const zy0 = low ? H * 0.06 : yl, zy1 = low ? yl : H * 0.94, sy0 = low ? yl : H * 0.06, sy1 = low ? H * 0.94 : yl, scy = (sy0 + sy1) / 2, sh = sy1 - sy0;
    const o = { lead: 1.2, track: 0.03 }, f = fitBox(txt, Pm.font, W * 0.84, (zy1 - zy0) * 0.72, o, port ? 4 : 2), size = Math.min(f.size, M * 0.3);
    const e = inE(env, 0.6), u = J.clamp(env.lt / Math.max(0.6, env.cut.dur - env.cut.outDur)), d = Pm.dir;
    const sx = d > 0 ? W * (0.05 + 0.9 * u) : W * (0.95 - 0.9 * u), acc = accentOn(sc), s = M * 0.046;
    // uncut part dashed, cut part a faint hairline
    const far = d > 0 ? W + 10 : -10, near = d > 0 ? -10 : W + 10;
    dashL(env, sx, yl, J.lerp(sx, far, e), yl, sc.fg, lw * 2, out, [lw * 7, lw * 6]);
    Ln(env, near, yl, sx - d * s * 1.5, yl, sc.sub, lw, 0.45 * out * e);
    const a = e * out;
    if (a > 0) {
      const op = 0.35 + 0.3 * Math.sin(env.ltb * 13), px = sx - d * s * 0.2;
      for (const k of [-1, 1]) { env.circle(sx - d * s * 1.25, yl + k * s * 0.5, s * 0.3, null, sc.fg, lw * 2.4, a, false); env.line([[sx - d * s * 0.98, yl + k * s * 0.34], [px, yl], [sx + d * s * 0.95, yl - k * s * op]], sc.fg, lw * 2.4, a, false); }
      env.circle(px, yl, lw * 2.2, acc, null, 1, a, false);
    }
    const la = inC(env, 0.3, 0.3) * out, latin = isLatinT(txt);
    label(env, latin ? 'CUT HERE' : 'キリトリ', d > 0 ? W * 0.93 : W * 0.07, yl + (low ? -1 : 1) * ls * 1.1, { align: d > 0 ? 'right' : 'left', font: bodyF(env), alpha: la, size: ls * 0.9, track: 0.3 });
    // stub
    label(env, `No.${String(1 + (J.h(cut.seed, 5) % 9999)).padStart(4, '0')}`, W * 0.07, scy - sh * 0.2, { alpha: la, color: acc });
    if (Pm.stub === 'bar') { greek(env, W * 0.07, scy - sh * 0.02, W * 0.32, 2, ls * 1.2, dimOf(sc), la, cut.seed, inE(env, 0.5, 0.3)); barcode(env, W * 0.93 - W * 0.3, scy - sh * 0.22, W * 0.3, sh * 0.44, sc.sub, la, cut.seed, inE(env, 0.6, 0.3)); }
    else ['NAME', 'DATE', 'SIGN'].forEach((t, k) => { const x = W * 0.07 + k * W * 0.3, w = W * 0.26; label(env, t, x, scy + sh * 0.02, { alpha: la, size: ls * 0.8 }); Ln(env, x, scy + sh * 0.2, x + w * inE(env, 0.5, 0.3 + k * 0.08), scy + sh * 0.2, sc.sub, lw, out); });
    return J.mainDraw(env, Object.assign({ text: f.text, font: Pm.font, size, x: W / 2, y: (zy0 + zy1) / 2, color: sc.fg }, o));
  },
});

/* ================================================================== 21 xaChecklist — チェック欄
   a checklist: boxes down the left, the lyric lines get ticked one after another */
reg('xaChecklist', {
  name: 'チェック欄', en: 'Checklist', tags: ['pop', 'editorial', 'calm'], ae: 'stack', w: 1, fits: n => n >= 1 && n <= 16,
  plan(rng, cut, st) { return { font: rng.pick(fontsOf(st, ['body', 'display', 'serif'])), box: rng.pick(['sq', 'sq', 'circle']), pre: rng.int(0, 1), post: rng.int(1, 2) }; },
  render(env) {
    const { W, H, sc, cut, Pm, M, port, txt, out, lw, ls, no } = base(env);
    const n = [...txt].length;
    const lines = smartSplit(txt, port ? (n <= 4 ? 1 : n <= 8 ? 2 : n <= 12 ? 3 : 4) : (n <= 7 ? 1 : n <= 13 ? 2 : 3), port), L = lines.length;
    const pre = Pm.pre, post = L >= 3 ? 1 : Pm.post, rows = pre + L + post, areaH = H * 0.72;
    const size = Math.min(M * 0.22, (areaH / rows) * 0.62, ...lines.map(l => J.fitSize(l, Pm.font, W * 0.7, 1e6, { track: 0.03 })));
    const pitch = Math.min(size * 1.55, areaH / rows), bs = size * 0.62, x0 = W * 0.08, tx = x0 + bs * 1.7, yT = H * 0.53 - (rows * pitch) / 2;
    const acc = accentOn(sc), dim = dimOf(sc), la = inC(env, 0.3, 0.15) * out;
    let bb = null, done = pre;
    for (let r = 0; r < rows; r++) {
      const y = yT + (r + 0.5) * pitch, li = r - pre, live = li >= 0 && li < L, a = inC(env, 0.3, 0.05 + r * 0.06) * out, e = inE(env, 0.5, 0.05 + r * 0.06);
      Ln(env, x0, y + pitch / 2, x0 + W * 0.84 * e, y + pitch / 2, sc.sub, lw, 0.5 * out);
      const bc = live ? sc.fg : sc.sub;
      if (a > 0) { if (Pm.box === 'circle') env.circle(x0 + bs / 2, y, bs / 2, null, bc, lw * 2, a, false); else frame(env, x0, y - bs / 2, bs, bs, bc, lw * 2, a); }
      const t0 = live ? env.cut.inDur * 0.7 + li * 0.16 : 0.1, ec = r < pre + L ? E.outCubic(J.clamp((env.lt - t0) / 0.22)) * out : 0;
      if (ec > 0) env.polyPartial([[x0 + bs * 0.12, y - bs * 0.02], [x0 + bs * 0.42, y + bs * 0.3], [x0 + bs * 1.12, y - bs * 0.62]], ec, live ? acc : sc.sub, Math.max(3, bs * 0.13), 1, false);
      if (live && ec > 0.5) done++;
      if (live) bb = U(bb, J.mainDraw(env, { text: lines[li], font: Pm.font, size, align: 'left', x: tx, y, track: 0.03, color: sc.fg, mi: li * 2 }));
      else { const w = W * (0.3 + 0.3 * J.r(cut.seed, r, 61)); R(env, tx, y - size * 0.09, w * e, size * 0.18, dim, out); if (r < pre) Ln(env, tx - size * 0.1, y, tx - size * 0.1 + (w + size * 0.2) * inE(env, 0.5, 0.3), y, sc.sub, lw * 1.5, 0.8 * out); }
    }
    label(env, 'CHECK LIST', x0, yT - ls * 1.4, { alpha: la, track: 0.3 });
    label(env, `${done} / ${rows}`, x0 + W * 0.84, yT - ls * 1.4, { align: 'right', alpha: la, color: acc });
    return bb;
  },
});

/* ================================================================== 22 xaBlockquote — 引用線
   block-quotation setting: a heavy vertical bar, ragged lines, a small citation */
reg('xaBlockquote', {
  name: '引用線', en: 'Block Quote Bar', tags: ['editorial', 'emotional', 'calm'], ae: 'center', w: 1.3, fits: n => n >= 1 && n <= 22,
  plan(rng, cut, st) { return { font: rng.pick(fontsOf(st, ['serif', 'display'])), side: rng.pick(['l', 'l', 'r']), bar: rng.pick(['solid', 'solid', 'double', 'dots']), cite: rng.chance(0.7), col: rng.pick(['accent', 'accent', 'fg']) }; },
  render(env) {
    const { W, H, sc, cut, Pm, M, port, txt, out, lw, ls, no } = base(env);
    const o = { lead: 1.32, track: 0.03 }, f = fitBox(txt, Pm.font, W * 0.72, H * 0.56, o, port ? 4 : 3), size = Math.min(f.size, M * 0.24);
    const left = Pm.side === 'l', it = Object.assign({ text: f.text, font: Pm.font, size, align: left ? 'left' : 'right', color: sc.fg }, o), m = J.measure(it);
    const bwd = Math.max(6, size * 0.09), gap = size * 0.5, tot = bwd + gap + m.w, bx = left ? (W - tot) / 2 : (W + tot) / 2 - bwd;
    it.x = left ? bx + bwd + gap : bx - gap; it.y = H / 2 - (Pm.cite ? size * 0.2 : 0);
    const y0 = it.y - m.h / 2 - size * 0.18, hh = m.h + size * 0.36, e = inE(env, 0.55) * (1 - E.inExpo(env.pOut)), c = Pm.col === 'accent' ? accentOn(sc) : sc.fg;
    if (e > 0) {
      if (Pm.bar === 'dots') { const k = Math.max(3, Math.round(hh / (bwd * 2))); for (let i = 0; i < k * e; i++) R(env, bx, y0 + (hh - bwd) * (i / Math.max(1, k - 1)), bwd, bwd, c, 1); }
      else { R(env, bx, y0, bwd * (Pm.bar === 'double' ? 0.6 : 1), hh * e, c, 1); if (Pm.bar === 'double') R(env, bx + (left ? bwd * 0.9 : -bwd * 0.3 - lw), y0, Math.max(lw, bwd * 0.12), hh * e, c, 1); }
    }
    if (Pm.cite) {
      const a = inC(env, 0.35, 0.35) * out, cy = Math.min(H * 0.94, y0 + hh + size * 0.45), cx = left ? it.x + m.w : it.x - m.w;
      label(env, `LINE ${pad2(no)}`, cx, cy, { align: left ? 'right' : 'left', alpha: a });
      Ln(env, cx + (left ? -1 : 1) * ls * 5.4, cy, cx + (left ? -1 : 1) * (ls * 5.4 + size * 0.6 * inE(env, 0.5, 0.35)), cy, sc.sub, lw, 0.8 * out);
    }
    return J.mainDraw(env, it);
  },
});

/* ================================================================== 23 xaScreenplay — 台本
   screenplay page: slug line, character cue, the lyric as centred dialogue, transition */
reg('xaScreenplay', {
  name: '台本', en: 'Screenplay', tags: ['editorial', 'emotional', 'calm'], ae: 'type', w: 0.9, fits: n => n >= 1 && n <= 22,
  plan(rng, cut, st) { return { font: rng.pick(fontsOf(st, ['serif', 'body'])), scn: rng.int(1, 99), io: rng.pick(['INT.', 'EXT.']), time: rng.pick(['NIGHT', 'DAY', 'DAWN', 'DUSK']), vo: rng.pick([' (V.O.)', ' (O.S.)', '']), trans: rng.pick(['CUT TO:', 'FADE OUT.', 'DISSOLVE TO:']), guides: rng.chance(0.7) }; },
  render(env) {
    const { W, H, sc, cut, Pm, M, port, txt, out, lw, ls, no } = base(env);
    const colW = W * (port ? 0.8 : 0.6), o = { lead: 1.32, track: 0.03 }, s2 = ls * 1.15;
    const f = fitBox(txt, Pm.font, colW * 0.96, H * 0.42, o, port ? 4 : 3), size = Math.min(f.size, M * 0.2);
    const it = Object.assign({ text: f.text, font: Pm.font, size, x: W / 2, y: H * 0.55, color: sc.fg }, o), m = J.measure(it);
    const la = k => inC(env, 0.3, 0.08 * k) * out, x0 = W * 0.08, x1 = W * 0.92, hy = H * 0.11;
    label(env, `${Pm.scn}   ${Pm.io} LYRIC — ${Pm.time}`, x0, hy, { color: sc.fg, alpha: la(0), size: s2 });
    label(env, `${no}.`, x1, hy, { align: 'right', alpha: la(0), size: s2 });
    Ln(env, x0, hy + s2 * 1.1, x0 + (x1 - x0) * inE(env, 0.6), hy + s2 * 1.1, sc.sub, lw, 0.8 * out);
    label(env, `VOICE${Pm.vo}`, W / 2, it.y - m.h / 2 - s2 * 1.9, { align: 'center', color: accentOn(sc), alpha: la(2), size: s2, track: 0.3 });
    if (Pm.guides) for (const k of [-1, 1]) dashL(env, W / 2 + (k * colW) / 2, hy + s2 * 2.6, W / 2 + (k * colW) / 2, J.lerp(hy + s2 * 2.6, H * 0.86, inE(env, 0.7, 0.1)), sc.sub, lw, 0.5 * out, [lw * 3, lw * 5]);
    label(env, '(CONTINUED)', x0, H * 0.9, { alpha: la(4) * 0.8, size: s2 * 0.9 });
    label(env, Pm.trans, x1, H * 0.9, { align: 'right', color: sc.fg, alpha: la(5), size: s2 });
    return J.mainDraw(env, it);
  },
});

/* ================================================================== 24 xaTearTabs — ちぎり札
   a pinned notice with tear-off tabs along the bottom; some are already gone, the rest sway */
reg('xaTearTabs', {
  name: 'ちぎり札', en: 'Tear-off Flyer', tags: ['pop', 'emotional', 'graphic'], ae: 'labels', w: 0.8, treat: 'safe', fits: n => n >= 1 && n <= 16,
  plan(rng, cut, st) { return { font: rng.pick(fontsOf(st, ['display', 'body'])), nT: rng.pick([7, 8, 9]), g1: rng.int(0, 8), g2: rng.int(0, 8), tilt: rng.pick([-1.5, 0, 1.5]), pin: rng.chance(0.8) }; },
  render(env) {
    const { W, H, sc, cut, Pm, M, port, txt, out, lw, ls, no } = base(env), ctx = env.ctx;
    const fw = port ? W * 0.84 : Math.min(W * 0.62, H), fh = H * 0.86, x0 = (W - fw) / 2, y0 = (H - fh) / 2, tabH = fh * 0.25, bodyH = fh - tabH;
    const paper = paperOf(sc), ink = onCol(sc, paper), faint = J.mix(paper, ink, 0.4), latin = isLatinT(txt), nT = Pm.nT, tw = fw / nT;
    const tabT = short(txt.replace(/\s+/g, latin ? ' ' : ''), latin ? 12 : 6), tl = [...tabT].length;
    return tilted(env, W / 2, y0, Pm.tilt, () => {
      const e = inE(env, 0.45), a = e * out, la = inC(env, 0.3, 0.3) * out;
      R(env, x0, y0, fw, bodyH * e, paper, out);
      for (let k = 0; k < nT; k++) {
        const gone = k === Pm.g1 % nT || k === (Pm.g2 + 3) % nT, cx = x0 + (k + 0.5) * tw, ty = y0 + bodyH, ea = inE(env, 0.4, 0.2 + k * 0.03) * out;
        if (ea <= 0) continue;
        if (gone) { R(env, cx - tw * 0.46, ty - 1, tw * 0.92, tabH * 0.05 + 1, paper, ea); continue; }
        const sway = Math.sin(env.ltb * 1.4 + k * 1.9) * 1.6 * (env.fx.motion ?? 0.7);
        ctx.save(); ctx.translate(cx, ty); ctx.rotate(sway * J.DEG); ctx.translate(-cx, -ty);
        R(env, cx - tw * 0.46, ty - 1, tw * 0.92, tabH * ea + 1, paper, out);
        const fsz = Math.min(tw * 0.4, (tabH * 0.84) / Math.max(1, tl * (latin ? 0.62 : 1.06)));
        label(env, tabT, cx, ty + tabH * 0.5, { align: 'center', font: bodyF(env), size: fsz, color: ink, alpha: ea * la, track: 0.02, vertical: !latin, rot: latin ? 90 : 0 });
        ctx.restore();
      }
      dashL(env, x0, y0 + bodyH, x0 + fw, y0 + bodyH, faint, lw * 1.3, la, [lw * 4, lw * 4]);
      label(env, 'TAKE ONE', W / 2, y0 + bodyH - ls * 1.5, { align: 'center', color: faint, alpha: la, track: 0.4 });
      if (Pm.pin && a > 0) { env.circle(W / 2, y0 + fh * 0.035, M * 0.013, accOn(sc, paper), null, 1, a, false); env.circle(W / 2 - M * 0.004, y0 + fh * 0.035 - M * 0.004, M * 0.004, paper, null, 1, a * 0.7, false); }
      const o = { lead: 1.2, track: 0.02 }, f = fitBox(txt, Pm.font, fw * 0.84, bodyH * 0.62, o, port ? 4 : 3), size = Math.min(f.size, M * 0.26);
      return J.mainDraw(env, Object.assign({ text: f.text, font: Pm.font, size, x: W / 2, y: y0 + bodyH * 0.49, color: ink }, o));
    });
  },
});

/* ================================================================== 25 xaBrace — 括弧まとめ
   the lines gathered by one big drawn brace that points at a small count */
const bracePts = (x, y0, y1, d, r) => {
  const ym = (y0 + y1) / 2, top = [], N = 8;
  for (let i = 0; i <= N; i++) { const t = (i / N) * Math.PI / 2; top.push([x + (d / 2) * Math.sin(t), y0 + r * (1 - Math.cos(t))]); }
  for (let i = 0; i <= N; i++) { const t = (i / N) * Math.PI / 2; top.push([x + d / 2 + (d / 2) * (1 - Math.cos(t)), ym - r + r * Math.sin(t)]); }
  const bot = top.slice(0, -1).reverse().map(([px, py]) => [px, y0 + y1 - py]);
  return top.concat(bot);
};
reg('xaBrace', {
  name: '括弧まとめ', en: 'Gathering Brace', tags: ['editorial', 'graphic', 'pop'], ae: 'gloss', w: 1, fits: n => n >= 2 && n <= 16,
  plan(rng, cut, st) { return { font: rng.pick(fontsOf(st, ['display', 'serif'])), pos: rng.pick(['r', 'l', 'under', 'r']), col: rng.pick(['accent', 'accent', 'fg']) }; },
  render(env) {
    const { W, H, sc, cut, Pm, M, port, txt, out, lw, ls, no } = base(env);
    const n = J.glyphCount(txt), latin = isLatinT(txt), c = Pm.col === 'accent' ? accentOn(sc) : sc.fg;
    const cnt = latin ? `${txt.split(/\s+/).length} WORDS` : `${n} 字`, e = E.inOutCubic(J.clamp((env.lt - 0.12) / 0.6)) * (1 - E.inExpo(env.pOut)), la = inC(env, 0.3, 0.55) * out;
    const under = Pm.pos === 'under' && !port && n <= 9, o = { lead: 1.25, track: 0.03 };
    if (under) {
      const size = Math.min(J.fitSize(txt, Pm.font, W * 0.82, H * 0.3, o), M * 0.26), it = Object.assign({ text: txt, font: Pm.font, size, x: W / 2, y: H * 0.44, color: sc.fg }, o), m = J.measure(it);
      const by = it.y + m.h / 2 + size * 0.22, d = size * 0.36, pts = bracePts(by, W / 2 - m.w / 2, W / 2 + m.w / 2, d, d * 0.5).map(([a, b]) => [b, a]);
      if (e > 0) env.polyPartial(pts, e, c, Math.max(2.5, size * 0.028), 1, false);
      label(env, cnt, W / 2, by + d + ls * 1.9, { align: 'center', font: bodyF(env), size: ls * 2.2, color: c, alpha: la });
      label(env, `LINE ${pad2(no)}`, W / 2, by + d + ls * 4.2, { align: 'center', alpha: la });
      return J.mainDraw(env, it);
    }
    const labW = ls * (latin ? 11 : 8.5), f = fitBox(txt, Pm.font, W * 0.84 - labW - M * 0.1, H * 0.6, o, port ? 4 : 3), size = Math.min(f.size, M * 0.24);
    const right = Pm.pos !== 'l', it = Object.assign({ text: f.text, font: Pm.font, size, align: right ? 'left' : 'right', y: H / 2, color: sc.fg }, o), m = J.measure(it);
    const d = Math.min(size * 0.4, M * 0.07), gap = size * 0.3, tot = m.w + gap + d + gap * 0.6 + labW, xs = (W - tot) / 2, s = right ? 1 : -1;
    it.x = right ? xs : W - xs;
    const bx = it.x + s * (m.w + gap), pts = bracePts(bx, H / 2 - m.h / 2 - size * 0.1, H / 2 + m.h / 2 + size * 0.1, s * d, Math.min(d * 0.6, m.h * 0.2));
    if (e > 0) env.polyPartial(pts, e, c, Math.max(2.5, size * 0.028), 1, false);
    const lx = bx + s * (d + gap * 0.6);
    label(env, cnt, lx, H / 2 - ls * 1.1, { align: right ? 'left' : 'right', font: bodyF(env), size: ls * 2.1, color: c, alpha: la, track: 0.05 });
    label(env, `LINE ${pad2(no)}`, lx, H / 2 + ls * 1.3, { align: right ? 'left' : 'right', alpha: la });
    return J.mainDraw(env, it);
  },
});

/* ================================================================== 26 xaNutrition — 成分表示
   a facts panel: heavy box, the lyric as the heading, bars of different weights, rows with the line's real figures */
reg('xaNutrition', {
  name: '成分表示', en: 'Facts Label', tags: ['graphic', 'pop', 'editorial'], ae: 'labels', w: 0.8, treat: 'safe', fits: n => n >= 1 && n <= 16,
  plan(rng, cut, st) { return { font: rng.pick(fontsOf(st, ['display', 'body'])), tilt: rng.pick([0, 0, -1.5, 1.5]), inv: rng.chance(0.4) }; },
  render(env) {
    const { W, H, sc, cut, Pm, M, port, txt, out, lw, ls, no } = base(env);
    const bw = port ? W * 0.84 : Math.min(W * 0.52, H * 0.95), bh = H * 0.84, x0 = (W - bw) / 2, y0 = (H - bh) / 2, p = bw * 0.055;
    const paper = paperOf(sc), ink = Pm.inv ? onCol(sc, paper) : sc.fg, sub = Pm.inv ? J.mix(paper, ink, 0.6) : sc.sub;
    const chars = [...txt.replace(/\s+/g, '')], nK = chars.filter(J.isKanji).length, nKa = chars.filter(c => J.isHira(c) || J.isKata(c)).length, nL = chars.filter(J.isLatin).length;
    const rowsD = [['GLYPHS', chars.length], ['KANJI', nK], ['KANA', nKa], ['LATIN', nL], ['LINE No.', no], ['SECONDS', (cut.dur || 0).toFixed(1)]];
    return tilted(env, W / 2, H / 2, Pm.tilt, () => {
      const e = inE(env, 0.5), bl = Math.max(4, M * 0.007);
      if (Pm.inv) R(env, x0 + (bw / 2) * (1 - e), y0, bw * e, bh, paper, out);
      if (e > 0 && out > 0) env.polyPartial([[x0, y0], [x0 + bw, y0], [x0 + bw, y0 + bh], [x0, y0 + bh], [x0, y0]], E.inOutCubic(J.clamp(env.lt / 0.6)), ink, bl, out, false);
      const zh = bh * 0.38, yb = y0 + zh + p, xl = x0 + p, xr = x0 + bw - p, iw = bw - p * 2;
      R(env, xl, yb, iw * inE(env, 0.5, 0.1), bh * 0.022, ink, out);
      const la0 = inC(env, 0.3, 0.2) * out, rs = Math.min(ls * 1.25, bw * 0.045);
      label(env, 'Per 1 line', xl, yb + bh * 0.022 + rs * 1.2, { color: sub, alpha: la0, size: rs * 0.85, font: bodyF(env), track: 0.04 });
      const ry0 = yb + bh * 0.022 + rs * 2.2, rh = (y0 + bh - p - rs * 1.6 - ry0) / rowsD.length;
      rowsD.forEach(([k, v], i) => {
        const y = ry0 + rh * i, a = inC(env, 0.3, 0.2 + i * 0.05) * out, ee = inE(env, 0.5, 0.15 + i * 0.05);
        if (i === 1) R(env, xl, y - bh * 0.005, iw * ee, bh * 0.01, ink, out); else Ln(env, xl, y, xl + iw * ee, y, ink, lw, out);
        label(env, k, xl + (i > 0 && i < 4 ? rs : 0), y + rh / 2, { color: ink, alpha: a, size: rs, track: 0.08 });
        label(env, String(v), xr, y + rh / 2, { align: 'right', color: ink, alpha: a, size: rs * 1.15, font: bodyF(env), track: 0.02 });
      });
      R(env, xl, ry0 + rh * rowsD.length - bh * 0.005, iw * inE(env, 0.5, 0.4), bh * 0.01, ink, out);
      label(env, '* DAILY VALUE NOT ESTABLISHED', xl, y0 + bh - p - rs * 0.3, { color: sub, alpha: la0, size: rs * 0.7, track: 0.04 });
      const o = { lead: 1.15, track: 0.01 }, f = fitBox(txt, Pm.font, iw, zh * 0.82, o, 4), size = Math.min(f.size, M * 0.26);
      return J.mainDraw(env, Object.assign({ text: f.text, font: Pm.font, size, align: 'left', x: xl, y: y0 + p * 0.6 + zh / 2, color: ink }, o));
    });
  },
});

/* ================================================================== 27 xaDogEar — 折れ角
   a book page with a dog-eared corner folding over, running head and folio */
reg('xaDogEar', {
  name: '折れ角', en: 'Dog-eared Page', tags: ['emotional', 'calm', 'editorial'], ae: 'labels', w: 1, treat: 'safe', fits: n => n >= 1 && n <= 22,
  plan(rng, cut, st) { return { font: rng.pick(fontsOf(st, ['serif', 'display'])), corner: rng.pick(['tr', 'tr', 'tl', 'br']), tilt: rng.pick([-1.5, 0, 0, 1.5]), stack: rng.chance(0.6), k: rng.range(0.11, 0.17) }; },
  render(env) {
    const { W, H, sc, cut, Pm, M, port, txt, out, lw, ls, no } = base(env);
    const pw = port ? W * 0.84 : Math.min(W * 0.68, H * 1.15), ph = H * 0.84, x0 = (W - pw) / 2, y0 = (H - ph) / 2, x1 = x0 + pw, y1 = y0 + ph;
    const paper = paperOf(sc), ink = onCol(sc, paper), faint = J.mix(paper, ink, 0.45), shade = J.mix(paper, ink, 0.24);
    const mxf = Pm.corner.includes('l') ? x => x0 + x1 - x : x => x, myf = Pm.corner.includes('b') ? y => y0 + y1 - y : y => y, mp = pts => pts.map(([x, y]) => [mxf(x), myf(y)]);
    return tilted(env, W / 2, H / 2, Pm.tilt, () => {
      const e = inE(env, 0.45), a = e * out, fs = M * Pm.k * E.outCubic(J.clamp((env.lt - 0.3) / 0.45)), la = inC(env, 0.3, 0.3) * out, dy = (1 - e) * M * 0.04;
      if (a > 0) {
        if (Pm.stack) R(env, x0 + M * 0.016, y0 + M * 0.016 + dy, pw, ph, J.mix(paper, sc.bg, 0.5), a);
        env.poly(mp([[x0, y0 + dy], [x1 - fs, y0 + dy], [x1, y0 + fs + dy], [x1, y1 + dy], [x0, y1 + dy]]), paper, a, false);
        if (fs > 1) { env.poly(mp([[x1 - fs, y0], [x1 - fs, y0 + fs], [x1, y0 + fs]]), shade, a, false); env.line(mp([[x1 - fs, y0], [x1, y0 + fs]]), faint, lw, a, false); }
      }
      const hy = y0 + ph * 0.09, top = !Pm.corner.includes('b');
      label(env, short(cut.lineText || txt, port ? 14 : 22), x0 + pw * 0.08, hy - ls * 0.9, { font: bodyF(env), color: faint, alpha: la, size: ls * 0.9, track: 0.08 });
      Ln(env, x0 + pw * 0.08, hy, x0 + pw * 0.08 + pw * (top ? 0.66 : 0.84) * inE(env, 0.6, 0.15), hy, faint, lw, out);
      label(env, `— ${no} —`, W / 2, y1 - ph * 0.06, { align: 'center', color: faint, alpha: la });
      const o = { lead: 1.32, track: 0.03 }, f = fitBox(txt, Pm.font, pw * 0.8, ph * 0.56, o, 4), size = Math.min(f.size, M * 0.24);
      return J.mainDraw(env, Object.assign({ text: f.text, font: Pm.font, size, x: W / 2, y: y0 + ph * 0.51, color: ink }, o));
    });
  },
});

/* ================================================================== 28 xaRuleSpecimen — 罫線見本
   a printer's rule specimen: every line of the lyric sits between rules of a different kind, each named */
const RULES = [['thick', '4 PT'], ['double', 'DOUBLE'], ['dotted', 'DOTTED'], ['wave', 'WAVE'], ['scotch', 'SCOTCH'], ['dashed', 'DASHED']];
reg('xaRuleSpecimen', {
  name: '罫線見本', en: 'Rule Specimen', tags: ['editorial', 'graphic', 'calm'], ae: 'stack', w: 1, fits: n => n >= 1 && n <= 16,
  plan(rng, cut, st) { return { font: rng.pick(fontsOf(st, ['display', 'serif'])), o: rng.int(0, 5), lab: rng.chance(0.85), acc: rng.int(0, 5), al: rng.pick(['left', 'left', 'center']) }; },
  render(env) {
    const { W, H, sc, cut, Pm, M, port, txt, out, lw, ls, no } = base(env), ctx = env.ctx;
    const n = [...txt].length, lines = smartSplit(txt, port ? (n <= 4 ? 1 : n <= 8 ? 2 : n <= 12 ? 3 : 4) : (n <= 8 ? 1 : n <= 14 ? 2 : 3), port), L = lines.length;
    const x0 = W * 0.07, tw = W * 0.86, size = Math.min(M * 0.24, (H * 0.7) / (L * 1.75), ...lines.map(l => J.fitSize(l, Pm.font, tw, 1e6, { track: 0.03 })));
    const pitch = size * 1.75, ys = [];
    for (let k = 0; k <= L; k++) ys.push(H / 2 + (k - L / 2) * pitch);
    if (L === 1) { ys.unshift(ys[0] - pitch * 0.3); ys.push(ys[ys.length - 1] + pitch * 0.3); }
    const labW = Pm.lab ? ls * 7 : 0, t = Math.max(3, size * 0.045);
    ys.forEach((y, k) => {
      const [kind, name] = RULES[(k + Pm.o) % RULES.length], e = inE(env, 0.6, 0.06 * k) * (1 - E.inExpo(env.pOut)), c = k === Pm.acc % ys.length ? accentOn(sc) : sc.fg;
      if (e <= 0) return;
      const full = tw - labW, xa = k % 2 ? x0 + full * (1 - e) : x0, xb = k % 2 ? x0 + full : x0 + full * e;
      if (kind === 'thick') R(env, xa, y - t / 2, xb - xa, t, c, 1);
      else if (kind === 'double') { Ln(env, xa, y - t * 0.45, xb, y - t * 0.45, c, t * 0.3); Ln(env, xa, y + t * 0.45, xb, y + t * 0.45, c, t * 0.3); }
      else if (kind === 'scotch') { R(env, xa, y - t * 0.7, xb - xa, t * 0.8, c, 1); Ln(env, xa, y + t * 0.7, xb, y + t * 0.7, c, Math.max(lw, t * 0.16)); }
      else if (kind === 'dashed') dashL(env, xa, y, xb, y, c, t * 0.4, 1, [t * 2.4, t * 1.4]);
      else if (kind === 'dotted') { if (env.pass === 'main') { ctx.save(); ctx.strokeStyle = c; ctx.lineWidth = t * 0.6; ctx.lineCap = 'round'; ctx.setLineDash([0.01, t * 1.5]); ctx.beginPath(); ctx.moveTo(xa, y); ctx.lineTo(xb, y); ctx.stroke(); ctx.restore(); } }
      else { const pts = []; for (let x = xa; x <= xb; x += t * 0.8) pts.push([x, y + Math.sin((x - x0) / (t * 1.3)) * t * 0.55]); if (pts.length > 1) env.line(pts, c, t * 0.32, 1, false); }
      if (Pm.lab) label(env, name, x0 + tw, y, { align: 'right', alpha: inC(env, 0.3, 0.25 + 0.06 * k) * out, size: ls * 0.9 });
    });
    let bb = null;
    const o0 = L === 1 ? 1 : 0;
    lines.forEach((l, i) => { bb = U(bb, J.mainDraw(env, { text: l, font: Pm.font, size, align: Pm.al, x: Pm.al === 'left' ? x0 : W / 2, y: (ys[i + o0] + ys[i + o0 + 1]) / 2, track: 0.03, color: sc.fg, mi: i * 2 })); });
    return bb;
  },
});

/* ================================================================== 29 xaLetterhead — レターヘッド
   business stationery: mark and greeked address, date line, the lyric as the letter, a signature drawn at the foot */
reg('xaLetterhead', {
  name: 'レターヘッド', en: 'Letterhead', tags: ['editorial', 'calm', 'emotional'], ae: 'gloss', w: 1, fits: n => n >= 1 && n <= 22,
  plan(rng, cut, st) { return { font: rng.pick(fontsOf(st, ['serif', 'body', 'display'])), mark: rng.pick(['circle', 'sq', 'tri']), sign: rng.chance(0.85), s1: rng.int(1, 999) }; },
  render(env) {
    const { W, H, sc, cut, Pm, M, port, txt, out, lw, ls, no } = base(env);
    const x0 = W * 0.08, x1 = W * 0.92, ty = H * 0.075, ms = M * 0.075, acc = accentOn(sc), dim = dimOf(sc);
    const em = E.outBack(J.clamp(env.lt / 0.45), 1.6) * out, cx = x0 + ms / 2, cy = ty + ms / 2;
    if (em > 0) {
      if (Pm.mark === 'circle') { env.circle(cx, cy, (ms / 2) * em, acc, null, 1, 1, false); env.circle(cx + ms * 0.38, cy, (ms / 2) * em, null, sc.fg, lw * 2, 1, false); }
      else if (Pm.mark === 'sq') { R(env, cx - (ms / 2) * em, cy - (ms / 2) * em, ms * em, ms * em, acc, 1); frame(env, cx - ms * 0.2, cy - ms * 0.2, ms * em, ms * em, sc.fg, lw * 2, 1); }
      else { env.poly([[cx - (ms / 2) * em, cy + (ms / 2) * em], [cx, cy - (ms / 2) * em], [cx + (ms / 2) * em, cy + (ms / 2) * em]], acc, 1, false); env.circle(cx + ms * 0.34, cy + ms * 0.1, ms * 0.3 * em, null, sc.fg, lw * 2, 1, false); }
    }
    const e1 = inE(env, 0.55, 0.1), la = inC(env, 0.3, 0.3) * out;
    R(env, x0 + ms * 1.7, cy - ms * 0.22, W * 0.2 * e1, ms * 0.16, sc.fg, 0.9 * out); R(env, x0 + ms * 1.7, cy + ms * 0.1, W * 0.12 * e1, ms * 0.1, dim, out);
    for (let k = 0; k < 3; k++) { const w = W * (0.16 - k * 0.03) * e1; R(env, x1 - w, ty + ms * (0.12 + k * 0.3), w, ms * 0.09, dim, out); }
    const hy = ty + ms + M * 0.03;
    Ln(env, x0, hy, x0 + (x1 - x0) * inE(env, 0.7, 0.05), hy, sc.fg, lw * 1.4, out);
    label(env, `REF. ${pad2(no)}-${String(Pm.s1).padStart(3, '0')}`, x1, hy + ls * 1.4, { align: 'right', alpha: la });
    Ln(env, x0, H * 0.925, x0 + (x1 - x0) * inE(env, 0.7, 0.2), H * 0.925, sc.sub, lw, 0.7 * out);
    for (let k = 0; k < 3; k++) R(env, W / 2 - W * 0.15 + k * W * 0.105, H * 0.945, W * 0.09 * e1, ms * 0.08, dim, out);
    const o = { lead: 1.32, track: 0.03 }, top = hy + ls * 2.6, bot = H * (Pm.sign ? 0.76 : 0.88);
    const f = fitBox(txt, Pm.font, W * 0.84, (bot - top) * 0.86, o, port ? 4 : 3), size = Math.min(f.size, M * 0.22);
    if (Pm.sign) {
      const sw = M * 0.3, sx = x1 - sw, sy = H * 0.845, es = E.inOutCubic(J.clamp((env.lt - 0.5) / 0.7)), pts = [];
      const ph = (cut.seed % 628) / 100;
      for (let i = 0; i <= 96; i++) { const u = i / 96, k = 1 - u * 0.55, th = u * 34 + ph; pts.push([sx + u * sw * 0.86 + Math.cos(th) * sw * 0.04 * k, sy - (Math.sin(th) * 0.55 + Math.sin(u * 9 + ph * 2) * 0.45 + 0.3) * M * 0.036 * k]); }
      pts.push([sx + sw * 0.98, sy - M * 0.02]);
      if (es > 0 && out > 0) env.polyPartial(pts, es, acc, Math.max(2.5, M * 0.004), out, false);
      Ln(env, sx, sy + M * 0.03, sx + sw * inE(env, 0.5, 0.35), sy + M * 0.03, sc.sub, lw, out);
      label(env, 'SIGNED', sx, sy + M * 0.03 + ls * 1.1, { alpha: la, size: ls * 0.85 });
    }
    return J.mainDraw(env, Object.assign({ text: f.text, font: Pm.font, size, align: 'left', x: x0, y: (top + bot) / 2, color: sc.fg }, o));
  },
});

/* ================================================================== 30 xaSwatchFan — 色見本帳
   a colour-guide fan deck: chips swing out round a rivet, the lyric knocked out of the top chip's colour field */
reg('xaSwatchFan', {
  name: '色見本帳', en: 'Swatch Fan', tags: ['pop', 'graphic', 'editorial'], ae: 'labels', w: 0.9, treat: 'safe', fits: n => n >= 1 && n <= 16,
  plan(rng, cut, st) { return { font: rng.pick(fontsOf(st, ['display', 'body'])), nb: rng.pick([2, 3, 3]), dir: rng.pick([1, -1]), code: rng.int(100, 999), ang: rng.range(9, 13) }; },
  render(env) {
    const { W, H, sc, cut, Pm, M, port, txt, out, lw, ls, no } = base(env);
    const ch = port ? Math.min(H * 0.68, W * 0.66 * 1.75) : H * 0.82, cw = port ? W * 0.66 : Math.min(W * 0.4, ch * 0.66), d = Pm.dir;
    const cx = W / 2 + d * W * (port ? 0.05 : 0.09), x0 = cx - cw / 2, y0 = (H - ch) / 2, px = cx, py = y0 + ch - cw * 0.13, r = cw * 0.05;
    const paper = paperOf(sc), ink = onCol(sc, paper), fieldH = ch * 0.68;
    const ok = c => c && J.contrast(c, paper) >= 1.35;
    const cols = [sc.accent, sc.accent2, sc.ink, sc.sub, J.mix(paper, ink, 0.6)].filter(ok);
    const field = cols[0] || J.mix(paper, ink, 0.8), fon = onCol(sc, field);
    const e = inE(env, 0.45), a = e * out, ef = E.outBack(J.clamp((env.lt - 0.15) / 0.6), 1.2);
    const chip = (col, top) => {
      env.rrect(x0, y0 + (1 - e) * M * 0.05, cw, ch, r, paper, a, false);
      env.rrect(x0 + cw * 0.05, y0 + cw * 0.05 + (1 - e) * M * 0.05, cw * 0.9, fieldH, r * 0.5, col, a, false);
      if (top) {
        const la = inC(env, 0.3, 0.3) * out, ly = y0 + cw * 0.05 + fieldH;
        label(env, `JZ ${Pm.code} C`, x0 + cw * 0.07, ly + (py - r * 2 - ly) * 0.34, { color: ink, alpha: la, size: Math.min(ls * 1.3, cw * 0.07) });
        label(env, short(cut.lineText || txt, 14), x0 + cw * 0.07, ly + (py - r * 2 - ly) * 0.72, { font: bodyF(env), color: J.mix(paper, ink, 0.55), alpha: la, size: Math.min(ls, cw * 0.055), track: 0.04 });
      }
      env.circle(px, py, r, sc.bg, null, 1, a, false); env.circle(px, py, r * 1.5, null, J.mix(paper, ink, 0.5), lw * 1.5, a, false);
    };
    if (a > 0) for (let k = Pm.nb; k >= 1; k--) tilted(env, px, py, -d * k * Pm.ang * ef, () => chip(cols[k % Math.max(1, cols.length)] || field, false));
    if (a > 0) chip(field, true);
    const o = { lead: 1.18, track: 0.02 }, f = fitBox(txt, Pm.font, cw * 0.8, fieldH * 0.8, o, 5), size = Math.min(f.size, cw * 0.42);
    return J.mainDraw(env, Object.assign({ text: f.text, font: Pm.font, size, x: cx, y: y0 + cw * 0.05 + fieldH / 2, color: fon }, o));
  },
});

})();
