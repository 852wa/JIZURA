/* JIZURA pack: x2layC — 追加分2 layouts C: the lyric inside everyday objects, screens and interfaces drawn with simple shapes */
(() => {
'use strict';
const E = J.E;
const P = 'x2layC';
const reg = (key, def) => J.register('layout', key, def, P);

/* ------------------------------------------------------------------ helpers */
const isSp = c => c === ' ' || c === '　';
const fontsOf = (st, roles) => J.fontsOf(st, roles);
const monoF = env => (env.st.fonts.mono && env.st.fonts.mono[0]) || 'mono';
const bodyF = env => (env.st.fonts.body && env.st.fonts.body[0]) || 'gothic_med';
const inE = (env, d = 0.35, delay = 0) => E.outExpo(J.clamp((env.lt - delay) / d));
const inC = (env, d = 0.35, delay = 0) => E.outCubic(J.clamp((env.lt - delay) / d));
const inB = (env, d = 0.4, delay = 0, s = 1.4) => { const k = J.clamp((env.lt - delay) / d); return k <= 0 ? 0 : k >= 1 ? 1 : E.outBack(k, s); };
const outK = env => 1 - E.inCubic(env.pOut);
const pad2 = n => String(n).padStart(2, '0');
const mmss = t => `${Math.floor(Math.max(0, t) / 60)}:${pad2(Math.floor(Math.max(0, t) % 60))}`;
const hair = env => Math.max(1, Math.min(env.W, env.H) * 0.0016);
const isLatinT = t => J.isLatinText(t);
const short = (t, k) => { const a = [...String(t || '').replace(/\s+/g, ' ').trim()]; return a.length > k ? a.slice(0, k).join('') + '…' : a.join(''); };
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
/* the lyric, fitted into a box centred on (x, y) (align:'left' → x is the left edge) */
const fitMain = (env, text, font, x, y, bw, bh, color, o, maxL = 3, cap = 1e9, extra) => {
  const oo = Object.assign({ lead: 1.2, track: 0.02 }, o || {});
  const f = fitBox(text, font, bw, bh, oo, maxL);
  return J.mainDraw(env, Object.assign({ text: f.text, font, size: Math.min(f.size, cap), x, y, color }, oo, extra || {}));
};
/* split into about L lines (array) */
const toLines = (t, L) => linesOf(t, L).split('\n').filter(s => s.trim().length);
/* colours */
const onCol = (sc, fill) => {
  let best = null, bv = 0;
  for (const c of [sc.bg, sc.fg, sc.ink, sc.sub]) { if (!c || c === fill) continue; const k = J.contrast(c, fill); if (k > bv) { bv = k; best = c; } }
  return bv >= 3 ? best : (J.lum(fill) > 0.45 ? '#000' : '#fff');
};
const plateCol = (sc, pref) => { for (const c of pref) if (c && J.contrast(c, sc.bg) >= 1.7) return c; return sc.fg; };
const paperOf = sc => plateCol(sc, [sc.fg, sc.ink, sc.accent]);
const accOn = (sc, fill) => (J.contrast(sc.accent, fill) >= 2 ? sc.accent : sc.accent2 && J.contrast(sc.accent2, fill) >= 2 ? sc.accent2 : onCol(sc, fill));
const acc2On = (sc, fill) => (sc.accent2 && J.contrast(sc.accent2, fill) >= 2 ? sc.accent2 : accOn(sc, fill));
const dimOf = sc => J.mix(sc.bg, sc.fg, 0.17);
const pickPlate = (sc, k) => plateCol(sc, k === 'accent' ? [sc.accent, sc.ink, sc.fg] : k === 'ink' ? [sc.ink, sc.accent, sc.fg] : [sc.fg, sc.ink]);
/* small drawing tools (main pass only) */
const lsz = env => J.clamp(Math.min(env.W, env.H) * 0.019, 11, 24);
const label = (env, text, x, y, o = {}) => { if ((o.alpha ?? 1) <= 0.003) return; env.draw({ text: String(text), font: o.font || monoF(env), size: o.size || lsz(env), x, y, align: o.align || 'left', track: o.track ?? 0.1, color: o.color || env.sc.sub, alpha: o.alpha ?? 1, rot: o.rot || 0, vertical: !!o.vertical, ghost: false }); };
const R = (env, x, y, w, h, c, a = 1) => { if (a > 0.003 && w > 0 && h > 0) env.rect(x, y, w, h, c, a, false); };
const Ln = (env, x0, y0, x1, y1, c, lw, a = 1) => { if (a > 0.003) env.line([[x0, y0], [x1, y1]], c, lw, a, false); };
/* shape set with a baked-in alpha (secondary graphics: main pass only) */
const G = (env, a) => ({
  a,
  r: (x, y, w, h, c, k = 1) => R(env, x, y, w, h, c, a * k),
  rr: (x, y, w, h, rad, c, k = 1) => env.rrect(x, y, w, h, rad, c, a * k, false),
  rs: (x, y, w, h, rad, c, lw, k = 1) => env.rrect(x, y, w, h, rad, null, a * k, false, c, lw),
  c: (x, y, r, c, k = 1) => env.circle(x, y, r, c, null, 1, a * k, false),
  cs: (x, y, r, c, lw, k = 1) => env.circle(x, y, r, null, c, lw, a * k, false),
  l: (x0, y0, x1, y1, c, lw, k = 1) => Ln(env, x0, y0, x1, y1, c, lw, a * k),
  pl: (pts, c, lw, k = 1) => { if (a * k > 0.003) env.line(pts, c, lw, a * k, false); },
  p: (pts, c, k = 1) => { if (a * k > 0.003) env.poly(pts, c, a * k, false); },
  arc: (x, y, r, a0, a1, c, lw, k = 1) => { if (a * k > 0.003 && a1 > a0) env.arc(x, y, r, a0, a1, c, lw, a * k, false); },
  t: (text, x, y, o = {}) => label(env, text, x, y, Object.assign({}, o, { alpha: a * (o.alpha ?? 1) })),
});
/* greeked text: rows of bars */
const greek = (g, x, y, w, rows, pitch, c, seed, e = 1, th = 0.36, k0 = 1) => {
  for (let r = 0; r < Math.min(rows, 40); r++) {
    const k = r === rows - 1 && rows > 1 ? 0.35 + 0.3 * J.r(seed, r, 3) : 0.8 + 0.2 * J.r(seed, r, 5);
    g.r(x, y + r * pitch, w * k * e, pitch * th, c, k0);
  }
};
/* run fn with the canvas moved / scaled / rotated around a point (all passes); identity at rest */
const pose = (env, cx, cy, t, fn) => {
  const ctx = env.ctx; ctx.save();
  ctx.translate(cx + (t.dx || 0), cy + (t.dy || 0));
  if (t.rot) ctx.rotate(t.rot * J.DEG);
  if (t.s != null || t.sx != null || t.sy != null) { const kx = (t.s ?? 1) * (t.sx ?? 1), ky = (t.s ?? 1) * (t.sy ?? 1); ctx.scale(Math.abs(kx) < 0.001 ? 0.001 : kx, Math.abs(ky) < 0.001 ? 0.001 : ky); }
  ctx.translate(-cx, -cy);
  let r; try { r = fn(); } finally { ctx.restore(); }
  return r;
};
/* largest w × h of aspect ar inside W*fw × H*fh */
const boxIn = (W, H, ar, fw, fh) => { const w = Math.min(W * fw, H * fh * ar); return [w, w / ar]; };
const base = env => { const cut = env.cut; return { W: env.W, H: env.H, sc: env.sc, cut, Pm: cut.params || {}, lt: env.lt, M: Math.min(env.W, env.H), port: env.W < env.H, txt: String(cut.text || '').trim(), out: outK(env), lw: hair(env), ls: lsz(env), no: (cut.line | 0) + 1 }; };
const FIT = n => n >= 1 && n <= 16;
/* rows of at most maxPer glyphs (Latin: whole words where possible) */
const chunkRows = (t, maxPer) => {
  const s = String(t || '').trim().replace(/[\s　]+/g, ' ');
  if (isLatinT(s) && s.includes(' ')) {
    const out = []; let cur = [];
    for (const w of s.split(' ')) {
      let a = [...w];
      while (a.length > maxPer) { if (cur.length) { out.push(cur); cur = []; } out.push(a.slice(0, maxPer)); a = a.slice(maxPer); }
      if (cur.length && cur.length + 1 + a.length > maxPer) { out.push(cur); cur = []; }
      cur = cur.length ? cur.concat([' '], a) : a;
    }
    if (cur.length) out.push(cur);
    return out;
  }
  const a = [...s.replace(/ /g, '')], n = a.length, rows = Math.max(1, Math.ceil(n / maxPer)), out = []; let st = 0;
  for (let i = 1; i <= rows; i++) {
    let c = i === rows ? n : Math.round((i * n) / rows);
    if (c < n && c > st && (J.isPunct(a[c]) || J.isSmallKana(a[c]) || a[c] === 'ー')) c++;
    if (c > st) out.push(a.slice(st, c));
    st = c;
  }
  return out;
};

/* ================================================================== 1 xcBrowser — ブラウザ窓
   a browser window: tab strip, address bar being typed, page loading bar; the lyric is the page headline */
reg('xcBrowser', {
  name: 'ブラウザ窓', en: 'Browser Window', tags: ['pop', 'graphic', 'editorial'], ae: 'labels', w: 1.1, treat: 'safe', fits: FIT,
  plan(rng, cut, st) { return { font: rng.pick(fontsOf(st, ['display', 'body'])), tabs: rng.int(2, 3), page: rng.pick(['hero', 'article', 'hero']), ctl: rng.pick(['mac', 'win']) }; },
  render(env) {
    const { W, H, sc, cut, Pm, lt, M, port, txt, out, lw, ls, no } = base(env);
    const ww = W * (port ? 0.9 : 0.84), wh = H * (port ? 0.62 : 0.8), x0 = (W - ww) / 2, y0 = (H - wh) / 2;
    const win = paperOf(sc), ink = onCol(sc, win), chrome = J.mix(win, ink, 0.16), faint = J.mix(win, ink, 0.2), ac = accOn(sc, win);
    const e = inE(env, 0.45), g = G(env, inC(env, 0.2) * out), r = M * 0.018, th = M * 0.058, uh = M * 0.064;
    return pose(env, W / 2, H / 2, { s: 0.94 + 0.06 * e, dy: (1 - e) * M * 0.03 }, () => {
      g.rr(x0 + M * 0.014, y0 + M * 0.018, ww, wh, r, sc.dim, 0.6);
      g.rr(x0, y0, ww, wh, r, chrome);
      g.rr(x0, y0 + th, ww, wh - th, r, win); g.r(x0, y0 + th, ww, r, win);
      const mac = Pm.ctl === 'mac', tw = Math.min(ww * 0.26, M * 0.3), tx0 = x0 + (mac ? M * 0.15 : M * 0.02);
      for (let i = 0; i < Pm.tabs; i++) {
        const tx = tx0 + i * (tw + M * 0.008), te = inE(env, 0.35, 0.08 + i * 0.07);
        if (tx + tw > x0 + ww - (mac ? 0 : M * 0.16)) break;
        if (i === 0) { g.rr(tx, y0 + th * 0.2, tw * te, th, r * 0.7, win); g.t(short(cut.lineText || txt, 7), tx + tw * 0.1, y0 + th * 0.62, { font: bodyF(env), color: ink, size: ls * 0.95, track: 0.02, alpha: inC(env, 0.3, 0.25) }); }
        else g.r(tx + tw * 0.1, y0 + th * 0.52, tw * 0.5 * te, th * 0.14, faint, 1.6);
      }
      if (mac) [ac, acc2On(sc, chrome), J.mix(chrome, ink, 0.4)].forEach((c, i) => g.c(x0 + M * 0.035 + i * M * 0.032, y0 + th * 0.52, M * 0.01, c));
      else { const cx = x0 + ww - M * 0.03, cy = y0 + th * 0.5, u = M * 0.008; g.l(cx - u, cy - u, cx + u, cy + u, ink, lw * 1.6); g.l(cx - u, cy + u, cx + u, cy - u, ink, lw * 1.6); g.rs(cx - M * 0.045 - u, cy - u, u * 2, u * 2, 0, ink, lw * 1.4); g.l(cx - M * 0.09 - u, cy + u, cx - M * 0.09 + u, cy + u, ink, lw * 1.6); }
      // address bar
      const uy = y0 + th + uh / 2, ux = x0 + ww * 0.13, uw = ww * 0.74;
      g.rr(ux, uy - uh * 0.3, uw, uh * 0.6, uh * 0.3, chrome);
      for (const s of [0, 1]) { const ax = x0 + ww * (0.035 + s * 0.045), d = (s ? 1 : -1) * M * 0.007; g.pl([[ax - d, uy - M * 0.009], [ax + d, uy], [ax - d, uy + M * 0.009]], ink, lw * 1.6, s ? 0.4 : 1); }
      const url = `https://lyrics/line-${pad2(no)}`, nu = Math.floor(J.clamp((lt - 0.1) / 0.5) * url.length);
      g.t(url.slice(0, nu) + (nu < url.length ? '|' : ''), ux + uh * 0.35, uy, { color: ink, size: ls * 0.95, track: 0.04 });
      g.c(x0 + ww - ww * 0.06, uy, M * 0.012, faint, 1.6);
      const pl = J.clamp(lt / 0.9);
      g.r(x0, y0 + th + uh - lw * 1.5, ww * E.outCubic(pl), lw * 3, ac, 1 - J.smooth(1.0, 1.3, lt));
      g.l(x0, y0 + th + uh, x0 + ww, y0 + th + uh, faint, lw);
      // page
      const py = y0 + th + uh, ph = wh - th - uh, article = Pm.page === 'article' && !port, ge = inE(env, 0.5, 0.2);
      if (article) {
        const ix = x0 + ww * 0.68, iy = py + ph * 0.1, iw = ww * 0.27, ih = ph * 0.8;
        g.rr(ix, iy, iw, ih * ge, r * 0.6, faint); g.c(ix + iw * 0.7, iy + ih * 0.22 * ge, iw * 0.09, win, 0.8);
        g.p([[ix, iy + ih * ge], [ix + iw * 0.4, iy + ih * 0.5 * ge], [ix + iw * 0.62, iy + ih * 0.74 * ge], [ix + iw * 0.8, iy + ih * 0.6 * ge], [ix + iw, iy + ih * 0.8 * ge], [ix + iw, iy + ih * ge]], J.mix(win, ink, 0.34));
        g.r(x0 + ww * 0.05, py + ph * 0.1, ww * 0.1 * ge, ph * 0.035, ac);
        greek(g, x0 + ww * 0.05, py + ph * 0.76, ww * 0.56, 3, ph * 0.055, faint, cut.seed, ge);
        return fitMain(env, txt, Pm.font, x0 + ww * 0.05, py + ph * 0.44, ww * 0.58, ph * 0.5, ink, null, 3, ph * 0.3, { align: 'left' });
      }
      g.r(x0 + ww * 0.05, py + ph * 0.07, M * 0.03, M * 0.03, ac);
      for (let i = 0; i < 3; i++) g.r(x0 + ww * 0.95 - (i + 1) * ww * 0.09, py + ph * 0.07 + M * 0.01, ww * 0.06 * ge, M * 0.01, faint, 1.5);
      for (let i = 0; i < 2; i++) { const bw = ww * (i ? 0.3 : 0.44) * ge; g.r(W / 2 - bw / 2, py + ph * (0.75 + i * 0.045), bw, ph * 0.016, faint, 1.5); }
      g.rr(W / 2 - ww * 0.09 * ge, py + ph * 0.86, ww * 0.18 * ge, ph * 0.075, ph * 0.04, ac);
      return fitMain(env, txt, Pm.font, W / 2, py + ph * 0.44, ww * 0.86, ph * 0.5, ink, null, port ? 4 : 2, ph * 0.34);
    });
  },
});

/* ================================================================== 2 xcPlayer — 再生画面
   a music player: cover art, the lyric as the track title, a progress bar that really runs, transport buttons */
reg('xcPlayer', {
  name: '再生画面', en: 'Music Player', tags: ['pop', 'calm', 'emotional'], ae: 'gloss', w: 1.2, treat: 'safe', fits: FIT,
  plan(rng, cut, st) { return { font: rng.pick(fontsOf(st, ['display', 'body', 'serif'])), art: rng.pick(['disc', 'sun', 'bars']), card: rng.chance(0.6), flip: rng.chance(0.3), at: rng.range(0.15, 0.5) }; },
  render(env) {
    const { W, H, sc, cut, Pm, lt, M, txt, out, lw, ls } = base(env), port = W < H * 1.2;
    const cw = W * 0.86, ch = H * (W < H ? 0.76 : port ? 0.8 : 0.62), x0 = (W - cw) / 2, y0 = (H - ch) / 2;
    const win = Pm.card ? paperOf(sc) : sc.bg, ink = Pm.card ? onCol(sc, win) : sc.fg, faint = J.mix(win, ink, 0.22), ac = accOn(sc, win);
    const e = inE(env, 0.45), g = G(env, inC(env, 0.2) * out), pd = M * 0.045;
    if (Pm.card) g.rr(x0, y0 + (1 - e) * M * 0.04, cw, ch, M * 0.03, win);
    const as = port ? Math.min(cw * 0.66, ch * 0.4) : Math.min(ch - pd * 2, cw * 0.36);
    const ax = port ? W / 2 - as / 2 : (Pm.flip ? x0 + cw - pd - as : x0 + pd), ay = port ? y0 + pd : y0 + (ch - as) / 2;
    const rx0 = port ? x0 + pd : (Pm.flip ? x0 + pd : ax + as + pd), rx1 = port ? x0 + cw - pd : (Pm.flip ? ax - pd : x0 + cw - pd), rw = rx1 - rx0;
    // cover art
    const ae = inB(env, 0.5, 0.05, 1.2), acx = ax + as / 2, acy = ay + as / 2, hs = as * ae / 2, dk = J.mix(ac, onCol(sc, ac), 0.75);
    if (ae > 0) {
      g.rr(acx - hs, acy - hs, hs * 2, hs * 2, as * 0.05, ac);
      if (Pm.art === 'disc') { for (let i = 0; i < 4; i++) g.cs(acx, acy, hs * (0.82 - i * 0.16), dk, lw * 1.5, 0.8); g.c(acx, acy, hs * 0.2, dk); g.c(acx, acy, hs * 0.05, ac); const ra = env.ltb * 1.6; g.l(acx + Math.cos(ra) * hs * 0.26, acy + Math.sin(ra) * hs * 0.26, acx + Math.cos(ra) * hs * 0.8, acy + Math.sin(ra) * hs * 0.8, dk, lw * 2, 0.7); }
      else if (Pm.art === 'sun') { g.c(acx, acy - hs * 0.08, hs * 0.5, dk); for (let i = 0; i < 5; i++) g.r(acx - hs * 0.6, acy + hs * (0.02 + i * 0.105), hs * 1.2, hs * (0.028 + i * 0.012), ac); g.r(acx - hs * 0.8, acy + hs * 0.62, hs * 1.6, hs * 0.03, dk); }
      else for (let i = 0; i < 9; i++) { const bh = hs * (0.3 + 1.1 * J.noise1(env.ltb * 2.2 + i * 3.1, cut.seed + i)); g.r(acx - hs * 0.72 + i * hs * 0.165, acy + hs * 0.7 - bh, hs * 0.1, bh, dk); }
    }
    // progress
    const py = port ? y0 + ch * 0.76 : y0 + ch * 0.66, total = Math.max(cut.dur / Math.max(0.2, 1 - Pm.at) , cut.dur + 1), t0 = total * Pm.at * 0.6, p = J.clamp((t0 + lt) / total), pe = inE(env, 0.5, 0.15);
    g.rr(rx0, py - lw * 2, rw * pe, lw * 4, lw * 2, faint, 1.6);
    g.rr(rx0, py - lw * 2, rw * p * pe, lw * 4, lw * 2, ac); g.c(rx0 + rw * p * pe, py, M * 0.011, ink);
    const la = inC(env, 0.3, 0.3);
    g.t(mmss(t0 + lt), rx0, py + ls * 1.5, { color: ink, alpha: la * 0.8, size: ls * 0.9 }); g.t(mmss(total), rx1, py + ls * 1.5, { color: ink, alpha: la * 0.8, align: 'right', size: ls * 0.9 });
    // transport
    const cy = port ? y0 + ch * 0.89 : y0 + ch * 0.85, cx = (rx0 + rx1) / 2, u = M * 0.022, be = inB(env, 0.4, 0.25);
    g.c(cx, cy, u * 2 * be, ink); const pc = onCol(sc, ink);
    if (env.pOut > 0) g.p([[cx - u * 0.5, cy - u * 0.8], [cx + u * 0.9, cy], [cx - u * 0.5, cy + u * 0.8]], pc, be);
    else { g.r(cx - u * 0.6, cy - u * 0.75, u * 0.42, u * 1.5, pc, be); g.r(cx + u * 0.18, cy - u * 0.75, u * 0.42, u * 1.5, pc, be); }
    for (const s of [-1, 1]) { const bx = cx + s * Math.min(rw * 0.3, u * 6); g.p([[bx - s * u * 0.9, cy - u * 0.7], [bx + s * u * 0.2, cy], [bx - s * u * 0.9, cy + u * 0.7]], ink, be); g.r(bx + s * u * 0.35 - u * 0.13, cy - u * 0.7, u * 0.26, u * 1.4, ink, be); }
    g.t('♪', rx0, port ? ay + as + pd * 0.75 : y0 + pd + ls * 0.4, { color: ac, alpha: la, font: bodyF(env), size: ls * 1.2 });
    g.r(rx0 + ls * 1.6, (port ? ay + as + pd * 0.75 : y0 + pd + ls * 0.4) - ls * 0.18, Math.min(rw * 0.3, M * 0.2) * pe, ls * 0.36, faint, 1.6);
    if (port) return fitMain(env, txt, Pm.font, W / 2, (ay + as + pd * 1.2 + py - pd * 0.5) / 2, rw, py - pd * 0.5 - (ay + as + pd * 1.2), ink, null, 3, as * 0.4);
    const ty0 = y0 + pd + ls * 1.6, ty1 = py - pd * 0.6;
    return fitMain(env, txt, Pm.font, rx0, (ty0 + ty1) / 2, rw, ty1 - ty0, ink, null, 3, ch * 0.3, { align: 'left' });
  },
});

/* ================================================================== 3 xcLoading — 読み込み中
   a system dialog: title bar, the lyric as the message, a progress bar that fills during the cut, a button */
reg('xcLoading', {
  name: '読み込み中', en: 'Loading Dialog', tags: ['pop', 'glitch', 'graphic'], ae: 'labels', w: 1, treat: 'safe', fits: FIT,
  plan(rng, cut, st) { return { font: rng.pick(fontsOf(st, ['body', 'display'])), bar: rng.pick(['bar', 'blocks', 'ring']), bw: rng.pick([0, 1]), end: rng.pick([0.87, 0.99, 1, 1]) }; },
  render(env) {
    const { W, H, sc, cut, Pm, lt, M, port, txt, out, lw, ls } = base(env);
    const dw = W * (port ? 0.88 : 0.62), dh = port ? H * 0.44 : H * 0.66, x0 = (W - dw) / 2, y0 = (H - dh) / 2;
    const win = paperOf(sc), ink = onCol(sc, win), tb = Pm.bw ? ink : accOn(sc, win), ton = onCol(sc, tb), faint = J.mix(win, ink, 0.22), ac = accOn(sc, win);
    const e = inB(env, 0.4, 0, 1.3), g = G(env, inC(env, 0.15) * out), th = M * 0.062, sh = M * 0.016;
    return pose(env, W / 2, H / 2, { s: 0.8 + 0.2 * e }, () => {
      g.r(x0 + sh, y0 + sh, dw, dh, sc.dim, 0.8);
      g.r(x0, y0, dw, dh, win); g.rs(x0, y0, dw, dh, 0, ink, lw * 2);
      g.r(x0, y0, dw, th, tb);
      g.t('NOW LOADING', x0 + th * 0.4, y0 + th / 2, { color: ton, size: ls, track: 0.25 });
      const bx = x0 + dw - th * 0.5, by = y0 + th / 2, u = th * 0.16; g.l(bx - u, by - u, bx + u, by + u, ton, lw * 2); g.l(bx - u, by + u, bx + u, by - u, ton, lw * 2);
      const bh = dh - th, p = E.inOutCubic(J.clamp(lt / Math.max(0.5, cut.dur * 0.8))) * Pm.end, pct = `${Math.round(p * 100)}%`;
      const px = x0 + dw * 0.08, pw = dw * 0.84, py = y0 + th + bh * 0.68, phh = bh * 0.1;
      if (Pm.bar === 'bar') { g.rs(px, py, pw, phh, 0, ink, lw * 1.6); g.r(px + lw * 3, py + lw * 3, (pw - lw * 6) * p, phh - lw * 6, ac); }
      else if (Pm.bar === 'blocks') { const nb = port ? 12 : 18, cw = pw / nb; g.rs(px, py, pw, phh, 0, ink, lw * 1.6); for (let i = 0; i < Math.floor(p * nb + 0.001); i++) g.r(px + i * cw + lw * 3, py + lw * 3, cw - lw * 4, phh - lw * 6, ac); }
      else { const rr = phh * 0.62, cx = px + rr + lw * 2, cy = py + phh / 2; g.cs(cx, cy, rr, faint, lw * 5); g.arc(cx, cy, rr, -90, -90 + 360 * p, ac, lw * 5); const sa = env.ltb * 300; g.arc(cx, cy, rr * 0.5, sa, sa + 100, ink, lw * 2); greek(g, cx + rr * 1.8, cy - phh * 0.24, pw * 0.4, 2, phh * 0.44, faint, cut.seed, inE(env, 0.4, 0.2), 0.36, 1.5); }
      g.t(pct, px + pw, py - ls * 0.9, { color: ink, align: 'right', size: ls * 1.1 });
      g.t(p >= 1 ? 'DONE' : 'PLEASE WAIT' + '.'.repeat(env.step % 4), px, py - ls * 0.9, { color: ink, size: ls * 0.9, alpha: 0.75 });
      const bw2 = Math.min(dw * 0.26, M * 0.24), bh2 = bh * 0.11;
      g.rs(x0 + dw * 0.92 - bw2, y0 + dh - bh2 - bh * 0.05, bw2, bh2, bh2 * 0.15, ink, lw * 1.6);
      g.t(p >= 1 ? 'OK' : 'CANCEL', x0 + dw * 0.92 - bw2 / 2, y0 + dh - bh2 / 2 - bh * 0.05, { color: ink, align: 'center', size: ls * 0.95 });
      return fitMain(env, txt, Pm.font, W / 2, y0 + th + bh * 0.3, dw * 0.86, bh * 0.44, ink, null, 3, bh * 0.3);
    });
  },
});

/* ================================================================== 4 xcMapPin — 地図ピン
   a street map draws itself, a pin drops, and the lyric opens in the pin's callout */
reg('xcMapPin', {
  name: '地図ピン', en: 'Map Pin', tags: ['pop', 'graphic', 'calm'], ae: 'labels', w: 1, treat: 'safe', fits: FIT,
  plan(rng, cut, st) { return { font: rng.pick(fontsOf(st, ['display', 'body'])), px: rng.pick([0.26, 0.5, 0.74]), tone: rng.pick(['paper', 'accent', 'paper']), la: rng.int(10, 59), lo: rng.int(100, 159) }; },
  render(env) {
    const { W, H, sc, cut, Pm, lt, M, port, txt, out, lw, ls } = base(env);
    const seed = cut.seed, road = dimOf(sc), g0 = G(env, out);
    // map
    g0.rr(W * (0.08 + 0.5 * J.r(seed, 1)), H * (0.1 + 0.3 * J.r(seed, 2)), W * 0.26, H * 0.24, M * 0.03, J.mix(sc.bg, sc.accent, 0.13), inC(env, 0.5, 0.1));
    for (let i = 0; i < 7; i++) {
      const re = inE(env, 0.7, i * 0.05), hz = i % 2 === 0, k = (Math.floor(i / 2) + 0.2 + 0.6 * J.r(seed, i, 9)) / 4, rw = M * (i < 2 ? 0.03 : 0.014), sl = J.rs(seed, i, 4) * 0.08;
      if (hz) g0.l(0, H * (k + sl), W * re, H * (k - sl), road, rw); else g0.l(W * (k + sl), H, W * (k - sl), H * (1 - re), road, rw);
    }
    g0.l(0, H * 0.2, W * inE(env, 0.9, 0.1), H * (0.9 - 0.4 * J.r(seed, 7)), road, M * 0.02);
    // pin
    const pr = M * 0.042, px = W * (port ? 0.5 + (Pm.px - 0.5) * 0.7 : Pm.px), py = H * (port ? 0.8 : 0.88);
    const pe = J.clamp((lt - 0.05) / 0.4), drop = pe >= 1 ? 0 : (1 - E.outBack(pe, 1.6)) * H * 0.5, pa = J.clamp(pe * 4) * out, gp = G(env, pa);
    const pc = accOn(sc, sc.bg), hy = py - pr * 2.5 - drop;
    for (let i = 0; i < 2; i++) { const k = ((env.ltb * 0.6 + i * 0.5) % 1 + 1) % 1; if (lt > 0.4) g0.cs(px, py, pr * (0.3 + k * 1.6), pc, lw * 2, (1 - k) * 0.7); }
    gp.p([[px - pr * 0.82, hy + pr * 0.58], [px + pr * 0.82, hy + pr * 0.58], [px, py - drop]], pc); gp.c(px, hy, pr, pc); gp.c(px, hy, pr * 0.4, sc.bg);
    // callout
    const cw = W * (port ? 0.88 : 0.7), chh = H * (port ? 0.36 : 0.48), cx = W / 2 + (px - W / 2) * 0.3, by = py - pr * 4.6, cy0 = by - chh;
    const win = Pm.tone === 'accent' ? pickPlate(sc, 'accent') : paperOf(sc), ink = onCol(sc, win), faint = J.mix(win, ink, 0.3);
    const ce = inB(env, 0.42, 0.22, 1.25), g = G(env, J.clamp((lt - 0.22) / 0.12) * out);
    return pose(env, px, by + pr * 0.9, { s: Math.max(0.01, ce) }, () => {
      g.rr(cx - cw / 2, cy0, cw, chh, M * 0.03, win);
      g.p([[px - pr * 0.9, by - 1], [px + pr * 0.9, by - 1], [px, by + pr * 0.95]], win);
      const fy = cy0 + chh * 0.87;
      g.l(cx - cw * 0.44, cy0 + chh * 0.76, cx + cw * 0.44, cy0 + chh * 0.76, faint, lw);
      g.t(`N 35.${Pm.la}°  E 139.${Pm.lo}°`, cx - cw * 0.44, fy, { color: ink, size: ls * 0.95, alpha: 0.8 });
      g.t(`${(1 + J.r(seed, 5) * 8).toFixed(1)} km`, cx + cw * 0.44, fy, { color: ink, size: ls * 0.95, align: 'right', alpha: 0.8 });
      return fitMain(env, txt, Pm.font, cx, cy0 + chh * 0.4, cw * 0.86, chh * 0.58, ink, null, 3, chh * 0.4);
    });
  },
});

/* ================================================================== 5 xcSignpost — 道しるべ
   a signpost: every line of the lyric on its own arrow board, pointing left and right in turn */
reg('xcSignpost', {
  name: '道しるべ', en: 'Signpost', tags: ['pop', 'graphic', 'emotional'], ae: 'stack', w: 1.1, treat: 'safe', fits: FIT,
  plan(rng, cut, st) { return { font: rng.pick(fontsOf(st, ['display', 'body'])), first: rng.int(0, 1), c: rng.int(0, 2), tilt: rng.chance(0.5) }; },
  render(env) {
    const { W, H, sc, cut, Pm, lt, M, port, txt, out, lw, ls } = base(env);
    const n = J.glyphCount(txt), L = port ? (n <= 3 ? 1 : n <= 7 ? 2 : n <= 12 ? 3 : 4) : (n <= 5 ? 1 : n <= 10 ? 2 : 3);
    const lines = toLines(txt, L), k = lines.length, o = { track: 0.03 };
    const bh = Math.min(M * (port ? 0.23 : 0.25), (H * 0.7) / k / 1.16), gap = bh * 0.16, maxT = W * (port ? 0.52 : 0.5);
    const size = Math.min(...lines.map(s => J.fitSize(s, Pm.font, maxT, bh * 0.62, o)));
    const tot = k * bh + (k - 1) * gap, sy0 = H * 0.45 - tot / 2, off = W * (port ? 0.025 : 0.06), tl = bh * 0.42;
    const plates = [paperOf(sc), pickPlate(sc, 'accent'), pickPlate(sc, 'ink')];
    const pw = M * 0.022, pe = inE(env, 0.5), g0 = G(env, out), pole = J.mix(sc.bg, sc.fg, 0.45);
    g0.r(W / 2 - pw / 2, H * 0.97 - (H * 0.97 - sy0 + bh * 0.25) * pe, pw, (H * 0.97 - sy0 + bh * 0.25) * pe, pole);
    g0.c(W / 2, sy0 - bh * 0.25, pw * 0.9 * pe, pole);
    g0.l(W / 2 - M * 0.16 * pe, H * 0.97, W / 2 + M * 0.16 * pe, H * 0.97, pole, lw * 3);
    let bb = null;
    lines.forEach((s, i) => {
      const dir = (i + Pm.first) % 2 ? 1 : -1, plate = plates[(i + Pm.c) % 3], ink = onCol(sc, plate);
      const tw = J.measure(Object.assign({ text: s, font: Pm.font, size }, o)).w, bw = tw + bh * 0.7;
      const cx = W / 2 + dir * off, yc = sy0 + i * (bh + gap) + bh / 2, xa = cx - bw / 2, xb = cx + bw / 2;
      const e = inE(env, 0.5, 0.06 + i * 0.09), g = G(env, J.clamp((lt - 0.06 - i * 0.09) / 0.15) * out);
      const b = pose(env, W / 2, yc, { dx: -dir * (1 - e) * W * 0.3, rot: Pm.tilt ? dir * (1.2 + (1 - e) * 6) : 0 }, () => {
        const pts = dir > 0 ? [[xa, yc - bh / 2], [xb, yc - bh / 2], [xb + tl, yc], [xb, yc + bh / 2], [xa, yc + bh / 2]] : [[xb, yc - bh / 2], [xa, yc - bh / 2], [xa - tl, yc], [xa, yc + bh / 2], [xb, yc + bh / 2]];
        g.p(pts, plate);
        const ins = bh * 0.09, q = dir > 0 ? [[xa + ins, yc - bh / 2 + ins], [xb - ins * 0.4, yc - bh / 2 + ins], [xb + tl - ins * 1.4, yc], [xb - ins * 0.4, yc + bh / 2 - ins], [xa + ins, yc + bh / 2 - ins], [xa + ins, yc - bh / 2 + ins]] : [[xb - ins, yc - bh / 2 + ins], [xa + ins * 0.4, yc - bh / 2 + ins], [xa - tl + ins * 1.4, yc], [xa + ins * 0.4, yc + bh / 2 - ins], [xb - ins, yc + bh / 2 - ins], [xb - ins, yc - bh / 2 + ins]];
        g.pl(q, ink, lw * 1.5, 0.5);
        for (const dy of [-0.3, 0.3]) g.c(W / 2, yc + dy * bh, bh * 0.028, ink, 0.55);
        return J.mainDraw(env, Object.assign({ text: s, font: Pm.font, size, x: cx, y: yc, color: ink, mi: i }, o));
      });
      bb = J.unionBB(bb, b);
    });
    return bb;
  },
});

/* ================================================================== 6 xcVending — 自販機
   a vending machine: the lyric in the lit display window, a row of priced buttons lighting in turn, coin slot and tray */
reg('xcVending', {
  name: '自販機', en: 'Vending Machine', tags: ['pop', 'graphic'], ae: 'labels', w: 0.8, fits: FIT,
  plan(rng, cut, st) { return { font: rng.pick(fontsOf(st, ['display', 'body'])), c: rng.pick(['paper', 'accent', 'ink']), nb: rng.int(5, 8), round: rng.chance(0.5), price: rng.pick([100, 120, 150]) }; },
  render(env) {
    const { W, H, sc, cut, Pm, lt, M, port, txt, out, lw, ls } = base(env);
    const bw = W * (port ? 0.86 : 0.8), bh = H * (port ? 0.74 : 0.86), x0 = (W - bw) / 2, y0 = (H - bh) / 2;
    const body = pickPlate(sc, Pm.c), on = onCol(sc, body), mid = J.mix(body, on, 0.28), dk = J.mix(body, on, 0.8), ac = accOn(sc, body);
    const e = inE(env, 0.5), g = G(env, inC(env, 0.2) * out), m = M * 0.035, wh = bh * (port ? 0.52 : 0.56), nb = port ? Math.min(5, Pm.nb) : Pm.nb;
    return pose(env, W / 2, H / 2, { dy: (1 - e) * H * 0.08 }, () => {
      g.rr(x0, y0, bw, bh, M * 0.025, body);
      const lit = J.clamp((lt - 0.2) / 0.25) * (lt < 0.55 && env.step % 2 ? 0.6 : 1);
      g.r(x0 + m, y0 + m, bw - m * 2, wh, dk); g.r(x0 + m + lw * 3, y0 + m + lw * 3, bw - m * 2 - lw * 6, wh - lw * 6, sc.bg, lit);
      // button row
      const ry = y0 + m + wh + bh * 0.035, rh = bh * (port ? 0.15 : 0.16), cw = (bw - m * 2) / nb, hot = Math.floor(env.ltb * 2.2 + (cut.seed % 7)) % nb;
      for (let i = 0; i < nb; i++) {
        const cx = x0 + m + cw * (i + 0.5), be = inB(env, 0.3, 0.2 + i * 0.04);
        g.rr(cx - cw * 0.36, ry, cw * 0.72, rh * 0.36, rh * 0.05, mid, be);
        g.t(String(Pm.price + (J.h(cut.seed, i, 3) % 4) * 10), cx, ry + rh * 0.18, { color: on, align: 'center', size: Math.min(ls, cw * 0.22), track: 0.02, alpha: be });
        const lc = i === hot ? ac : dk, br = Math.min(cw * 0.3, rh * 0.22) * be;
        if (Pm.round) g.c(cx, ry + rh * 0.72, br, lc); else g.rr(cx - br * 1.2, ry + rh * 0.72 - br * 0.7, br * 2.4, br * 1.4, br * 0.3, lc);
      }
      // tray + coin slot
      const ty = ry + rh + bh * 0.03, th = y0 + bh - m - ty;
      g.rr(x0 + m, ty, bw * 0.56, th, th * 0.12, dk); g.r(x0 + m + bw * 0.03, ty + th * 0.22, bw * 0.5, th * 0.5, J.mix(dk, body, 0.25));
      g.t('PUSH', x0 + m + bw * 0.28, ty + th * 0.47, { color: body, align: 'center', size: Math.min(ls, th * 0.3), track: 0.4, alpha: 0.9 });
      const sx = x0 + bw - m - bw * 0.1;
      g.rr(sx - bw * 0.02, ty + th * 0.08, bw * 0.014, th * 0.5, bw * 0.005, dk); g.c(sx - bw * 0.1, ty + th * 0.33, Math.min(th * 0.24, bw * 0.03), mid); g.rr(sx - bw * 0.16, ty + th * 0.72, bw * 0.2, th * 0.2, th * 0.05, mid);
      return fitMain(env, txt, Pm.font, W / 2, y0 + m + wh / 2, (bw - m * 2) * 0.88, wh * 0.78, sc.fg, null, port ? 4 : 3, wh * 0.5);
    });
  },
});

/* ================================================================== 7 xcFolder — フォルダ
   a file folder with a tab; sheets slide up out of it and the lyric is written on the front */
reg('xcFolder', {
  name: 'フォルダ', en: 'File Folder', tags: ['pop', 'graphic', 'editorial'], ae: 'labels', w: 1, treat: 'safe', fits: FIT,
  plan(rng, cut, st) { return { font: rng.pick(fontsOf(st, ['display', 'body'])), c: rng.pick(['accent', 'ink', 'paper']), right: rng.chance(0.4), sheets: rng.int(1, 3), tilt: rng.pick([0, -2, 2]) }; },
  render(env) {
    const { W, H, sc, cut, Pm, lt, M, port, txt, out, lw, ls, no } = base(env);
    const [fw, fh] = boxIn(W, H, port ? 1.05 : 1.55, 0.86, 0.68), x0 = (W - fw) / 2, y0 = (H - fh) / 2 + fh * 0.07;
    const front = pickPlate(sc, Pm.c), ink = onCol(sc, front), back = J.mix(front, ink, 0.3), paper = J.mix(ink, front, 0.12), pfaint = J.mix(paper, front, 0.5);
    const e = inE(env, 0.5), g = G(env, inC(env, 0.2) * out), th = fh * 0.1, tw = fw * 0.36, r = M * 0.02;
    return pose(env, W / 2, H / 2, { dy: (1 - e) * H * 0.06, rot: Pm.tilt * e }, () => {
      const ta = Pm.right ? x0 + fw - tw : x0, sgn = Pm.right ? -1 : 1, tA = Pm.right ? x0 + fw : x0;
      g.p([[tA, y0 + r], [tA, y0 - th], [tA + sgn * (tw - th * 0.7), y0 - th], [tA + sgn * tw, y0], [tA + sgn * tw, y0 + r]], back);
      g.rr(x0, y0, fw, fh, r, back);
      g.t(`FILE_${pad2(no)}`, ta + tw * 0.45, y0 - th * 0.45, { color: onCol(sc, back), align: 'center', size: Math.min(ls, th * 0.42) });
      for (let i = Pm.sheets - 1; i >= 0; i--) {
        const se = inE(env, 0.55, 0.18 + i * 0.1), sw = fw * (0.8 - i * 0.05), sx = x0 + fw * 0.08 + i * fw * 0.05, rise = fh * (0.09 + i * 0.05) * se;
        pose(env, sx + sw / 2, y0 + fh * 0.4, { rot: (i % 2 ? 1 : -1) * (1.5 + i) * se }, () => {
          g.r(sx, y0 - rise + fh * 0.03, sw, fh * 0.5, i ? J.mix(paper, front, 0.25) : paper);
          greek(g, sx + sw * 0.07, y0 - rise + fh * 0.065, sw * 0.6, 2, fh * 0.035, pfaint, cut.seed + i, se);
        });
      }
      const fy = y0 + fh * 0.15;
      g.rr(x0, fy, fw, fh - (fy - y0), r, front);
      g.l(x0 + fw * 0.05, fy + fh * 0.07, x0 + fw * 0.95, fy + fh * 0.07, ink, lw, 0.3);
      return fitMain(env, txt, Pm.font, W / 2, fy + (fh - (fy - y0)) * 0.54, fw * 0.84, (fh - (fy - y0)) * 0.66, ink, null, 3, fh * 0.36);
    });
  },
});

/* ================================================================== 8 xcScoreboard — 得点板
   a stadium scoreboard: two scores counting up either side of the lyric, an innings row filling in */
reg('xcScoreboard', {
  name: '得点板', en: 'Scoreboard', tags: ['pop', 'graphic'], ae: 'labels', w: 0.8, treat: 'safe', fits: FIT,
  plan(rng, cut, st) { return { font: rng.pick(fontsOf(st, ['display', 'body'])), c: rng.pick(['ink', 'ink', 'paper']), s1: rng.int(0, 9), s2: rng.int(0, 9), legs: rng.chance(0.6) }; },
  render(env) {
    const { W, H, sc, cut, Pm, lt, M, port, txt, out, lw, ls } = base(env);
    const bw = W * 0.88, bh = H * (port ? 0.62 : 0.7), x0 = (W - bw) / 2, y0 = (H - bh) / 2 - (Pm.legs ? H * 0.03 : 0);
    const board = pickPlate(sc, Pm.c), on = onCol(sc, board), rec = J.mix(board, on, 0.14), ac = accOn(sc, board), mono = monoF(env);
    const e = inE(env, 0.5), g = G(env, inC(env, 0.2) * out);
    return pose(env, W / 2, H / 2, { dy: -(1 - e) * H * 0.07 }, () => {
      if (Pm.legs) for (const fx of [0.22, 0.78]) g.r(x0 + bw * fx - M * 0.012, y0 + bh, M * 0.024, H - y0 - bh, J.mix(sc.bg, sc.fg, 0.4));
      g.r(x0, y0, bw, bh, board); g.rs(x0 + M * 0.012, y0 + M * 0.012, bw - M * 0.024, bh - M * 0.024, 0, on, lw * 1.5, 0.5);
      const cnt = v => String(Math.round(v * E.outCubic(J.clamp((lt - 0.2) / 0.8))));
      const score = (x, y, w, h, lab, v) => {
        g.t(lab, x + w / 2, y + h * 0.1, { color: on, align: 'center', size: Math.min(ls * 1.1, h * 0.12), track: 0.3 });
        g.r(x, y + h * 0.22, w, h * 0.78, rec);
        g.t(cnt(v), x + w / 2, y + h * 0.62, { color: ac, align: 'center', size: Math.min(h * 0.6, w * 0.9), track: 0, font: mono });
      };
      const nI = port ? 7 : 9, iy = y0 + bh * (port ? 0.8 : 0.76), ih = bh * (port ? 0.13 : 0.17), ix = x0 + bw * 0.05, iw = (bw * 0.9) / nI;
      for (let i = 0; i < nI; i++) {
        g.rs(ix + i * iw, iy, iw, ih, 0, on, lw, 0.5);
        g.t(String(i + 1), ix + i * iw + iw * 0.14, iy + ih * 0.2, { color: on, size: Math.min(ls * 0.7, ih * 0.22), alpha: 0.6 });
        if (lt > 0.35 + i * 0.16) g.t(String(J.h(cut.seed, i, 8) % 4), ix + (i + 0.5) * iw, iy + ih * 0.58, { color: on, align: 'center', size: ih * 0.5, track: 0 });
      }
      if (port) {
        score(x0 + bw * 0.06, y0 + bh * 0.05, bw * 0.4, bh * 0.2, 'HOME', Pm.s1); score(x0 + bw * 0.54, y0 + bh * 0.05, bw * 0.4, bh * 0.2, 'GUEST', Pm.s2);
        return fitMain(env, txt, Pm.font, W / 2, y0 + bh * 0.535, bw * 0.86, bh * 0.4, on, null, 4, bh * 0.2);
      }
      score(x0 + bw * 0.05, y0 + bh * 0.1, bw * 0.14, bh * 0.56, 'HOME', Pm.s1); score(x0 + bw * 0.81, y0 + bh * 0.1, bw * 0.14, bh * 0.56, 'GUEST', Pm.s2);
      return fitMain(env, txt, Pm.font, W / 2, y0 + bh * 0.4, bw * 0.5, bh * 0.52, on, null, 3, bh * 0.34);
    });
  },
});

/* ================================================================== 9 xcWeather — 天気予報
   a weather widget: animated sky icon and temperature, the lyric as today's forecast, a small week row */
const skyIcon = (env, g, type, x, y, u, c1, c2, back) => {
  if (type === 'sun') { g.c(x, y, u * 0.5, c1); for (let i = 0; i < 8; i++) { const a = env.ltb * 0.5 + i * J.TAU / 8; g.l(x + Math.cos(a) * u * 0.68, y + Math.sin(a) * u * 0.68, x + Math.cos(a) * u * 0.98, y + Math.sin(a) * u * 0.98, c1, u * 0.09); } return; }
  if (type === 'moon') { g.c(x, y, u * 0.72, c1); g.c(x + u * 0.34, y - u * 0.2, u * 0.62, back); for (let i = 0; i < 3; i++) g.c(x + u * (0.5 + 0.3 * J.rs(i, 5)), y + u * (0.5 * J.rs(i, 7)), u * 0.05 * (1 + (env.step + i) % 2), c2); return; }
  const dx = Math.sin(env.ltb * 0.8) * u * 0.06;
  if (type === 'cloudsun') g.c(x + u * 0.4, y - u * 0.36, u * 0.36, c1);
  g.c(x - u * 0.38 + dx, y + u * 0.12, u * 0.36, c2); g.c(x + u * 0.05 + dx, y - u * 0.12, u * 0.48, c2); g.c(x + u * 0.48 + dx, y + u * 0.16, u * 0.32, c2); g.r(x - u * 0.38 + dx, y + u * 0.12, u * 0.86, u * 0.36, c2);
  if (type === 'rain') for (let i = 0; i < 4; i++) { const k = ((env.ltb * 1.3 + i * 0.27) % 1 + 1) % 1, rx = x - u * 0.45 + i * u * 0.3, ry = y + u * (0.6 + k * 0.45); g.l(rx, ry, rx - u * 0.08, ry + u * 0.2, c1, u * 0.07, 1 - k); }
};
reg('xcWeather', {
  name: '天気予報', en: 'Weather Widget', tags: ['calm', 'pop', 'emotional'], ae: 'gloss', w: 1, treat: 'safe', fits: FIT,
  plan(rng, cut, st) { return { font: rng.pick(fontsOf(st, ['body', 'display', 'serif'])), sky: rng.pick(['sun', 'moon', 'rain', 'cloudsun']), t: rng.int(-3, 34), c: rng.pick(['paper', 'paper', 'ink']), flip: rng.chance(0.3) }; },
  render(env) {
    const { W, H, sc, cut, Pm, lt, M, txt, out, lw, ls } = base(env), port = W < H * 1.2;
    const cw = W * (port ? 0.86 : 0.84), ch = H * (W < H ? 0.72 : port ? 0.8 : 0.74), x0 = (W - cw) / 2, y0 = (H - ch) / 2;
    const win = pickPlate(sc, Pm.c), ink = onCol(sc, win), faint = J.mix(win, ink, 0.25), ac = accOn(sc, win), cl = J.mix(win, ink, 0.45);
    const e = inE(env, 0.45), g = G(env, inC(env, 0.2) * out), mono = monoF(env);
    return pose(env, W / 2, H / 2, { s: 0.92 + 0.08 * e }, () => {
      g.rr(x0, y0, cw, ch, M * 0.05, win);
      const ie = inB(env, 0.5, 0.1, 1.3), gi = G(env, g.a * J.clamp((lt - 0.1) / 0.15));
      const days = isLatinT(txt) ? ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] : ['月', '火', '水', '木', '金', '土', '日'], d0 = J.h(cut.seed, 6) % 7, kinds = ['sun', 'cloud', 'rain', 'cloudsun'];
      const week = (wx, wy, ww, wh, nd) => {
        g.l(wx, wy, wx + ww * inE(env, 0.5, 0.2), wy, faint, lw);
        for (let i = 0; i < nd; i++) {
          const cx = wx + (ww / nd) * (i + 0.5), a = inC(env, 0.3, 0.3 + i * 0.06), g2 = G(env, g.a * a);
          g2.t(days[(d0 + i) % 7], cx, wy + wh * 0.2, { color: ink, align: 'center', size: Math.min(ls, wh * 0.16), font: isLatinT(txt) ? mono : bodyF(env), track: 0.05, alpha: 0.8 });
          skyIcon(env, g2, kinds[J.h(cut.seed, i, 2) % 4], cx, wy + wh * 0.5, Math.min(wh * 0.16, ww / nd * 0.26), ac, cl, win);
          g2.t(`${Pm.t - 2 + (J.h(cut.seed, i, 4) % 6)}°`, cx, wy + wh * 0.84, { color: ink, align: 'center', size: Math.min(ls, wh * 0.16), alpha: 0.8 });
        }
      };
      if (port) {
        const u = ch * 0.085;
        pose(env, x0 + cw * 0.24, y0 + ch * 0.14, { s: ie }, () => skyIcon(env, gi, Pm.sky, x0 + cw * 0.24, y0 + ch * 0.14, u, ac, cl, win));
        g.t(`${Pm.t}°`, x0 + cw * 0.9, y0 + ch * 0.13, { color: ink, align: 'right', size: ch * 0.11, track: 0, font: mono });
        week(x0 + cw * 0.06, y0 + ch * 0.74, cw * 0.88, ch * 0.22, 5);
        return fitMain(env, txt, Pm.font, W / 2, y0 + ch * 0.49, cw * 0.86, ch * 0.4, ink, null, 4, ch * 0.2);
      }
      const lx = Pm.flip ? x0 + cw * 0.7 : x0, lw2 = cw * 0.3, rx = Pm.flip ? x0 + cw * 0.06 : x0 + cw * 0.32, rw = cw * 0.62, u = ch * 0.15;
      pose(env, lx + lw2 / 2, y0 + ch * 0.3, { s: ie }, () => skyIcon(env, gi, Pm.sky, lx + lw2 / 2, y0 + ch * 0.3, u, ac, cl, win));
      g.t(`${Pm.t}°`, lx + lw2 / 2 + ch * 0.02, y0 + ch * 0.66, { color: ink, align: 'center', size: ch * 0.2, track: 0, font: mono });
      g.t(`H ${Pm.t + 3}°  L ${Pm.t - 5}°`, lx + lw2 / 2, y0 + ch * 0.85, { color: ink, align: 'center', size: ls, alpha: 0.7 });
      week(rx, y0 + ch * 0.68, rw, ch * 0.27, 5);
      return fitMain(env, txt, Pm.font, rx + rw / 2, y0 + ch * 0.36, rw, ch * 0.5, ink, null, 3, ch * 0.32);
    });
  },
});

/* ================================================================== 10 xcBattery — 電池残量
   a big battery outline charging cell by cell behind the lyric (upright in portrait) */
reg('xcBattery', {
  name: '電池残量', en: 'Battery Level', tags: ['pop', 'graphic', 'glitch'], ae: 'pill', w: 1, fits: FIT,
  plan(rng, cut, st) { return { font: rng.pick(fontsOf(st, ['display', 'body'])), cells: rng.pick([4, 5, 1, 8]), level: rng.pick([0.25, 0.5, 0.75, 1, 1]), bolt: rng.chance(0.6) }; },
  render(env) {
    const { W, H, sc, cut, Pm, lt, M, port, txt, out, lw, ls } = base(env);
    const bw = W * (port ? 0.72 : 0.76), bh = H * (port ? 0.66 : 0.6), nub = M * 0.035, x0 = (W - bw) / 2 - (port ? 0 : nub / 2), y0 = (H - bh) / 2 + (port ? nub / 2 : 0) - H * 0.02;
    const st2 = M * 0.014, ac = accOn(sc, sc.bg), low = Pm.level <= 0.25, fc = low ? acc2On(sc, sc.bg) : ac;
    const e = inE(env, 0.5), g = G(env, inC(env, 0.2) * out), r = M * 0.04;
    const pd = st2 * 2.2, ix = x0 + pd, iy = y0 + pd, iw = bw - pd * 2, ih = bh - pd * 2, nc = Pm.cells, gp = nc > 1 ? st2 * 0.9 : 0;
    const litN = Math.max(1, Math.round(Pm.level * nc)), long = port ? ih : iw, cl = (long - gp * (nc - 1)) / nc;
    for (let k = 0; k < (nc > 1 ? litN : 1); k++) {
      const ce = nc > 1 ? inE(env, 0.3, 0.2 + k * 0.13) : inE(env, 0.9, 0.2) * Pm.level;
      const blink = nc > 1 && k === litN - 1 && Pm.level < 1 && lt > 0.6 ? (env.step % 4 < 2 ? 1 : 0.35) : 1;
      if (port) { const hh = cl * ce; g.rr(ix, iy + ih - k * (cl + gp) - hh, iw, hh, r * 0.4, fc, 0.3 * blink); }
      else g.rr(ix + k * (cl + gp), iy, cl * ce, ih, r * 0.4, fc, 0.3 * blink);
    }
    g.rs(x0, y0, bw, bh, r, sc.fg, st2, e);
    if (port) g.rr(W / 2 - bw * 0.16, y0 - nub - st2 * 0.2, bw * 0.32, nub, nub * 0.3, sc.fg, e); else g.rr(x0 + bw + st2 * 0.2, y0 + bh * 0.33, nub, bh * 0.34, nub * 0.3, sc.fg, e);
    const pct = Math.round(Pm.level * 100 * E.outCubic(J.clamp((lt - 0.2) / (0.3 + 0.13 * litN)))), ly = y0 + bh + ls * 2.2;
    g.t(`${pct}%`, x0 + bw, ly, { color: sc.fg, align: 'right', size: ls * 1.5, track: 0.05 });
    g.t(low ? 'LOW BATTERY' : Pm.bolt ? 'CHARGING' : 'BATTERY', x0, ly, { color: low ? fc : sc.sub, size: ls, track: 0.25, alpha: low && env.step % 4 < 1 ? 0.3 : 1 });
    if (Pm.bolt && !low) { const bx = x0 + bw - ls * 5.2, u = ls * 0.9; g.p([[bx + u * 0.2, ly - u], [bx - u * 0.5, ly + u * 0.15], [bx - u * 0.02, ly + u * 0.15], [bx - u * 0.25, ly + u], [bx + u * 0.5, ly - u * 0.2], [bx + u * 0.02, ly - u * 0.2]], ac); }
    return fitMain(env, txt, Pm.font, x0 + bw / 2, y0 + bh / 2, iw * 0.9, ih * 0.8, sc.fg, null, port ? 5 : 3, (port ? iw : ih) * 0.5);
  },
});

/* ================================================================== 11 xcPopups — 重なる窓
   error pop-ups cascade across the screen one after another; the last one on top carries the lyric */
reg('xcPopups', {
  name: '重なる窓', en: 'Popup Cascade', tags: ['glitch', 'pop', 'graphic'], ae: 'stack', w: 1, treat: 'safe', fits: FIT,
  plan(rng, cut, st) { return { font: rng.pick(fontsOf(st, ['body', 'display'])), k: rng.int(3, 6), dir: rng.pick([[1, 1], [-1, 1], [1, -1], [-1, -1]]), icon: rng.pick(['warn', 'info', 'stop']) }; },
  render(env) {
    const { W, H, sc, cut, Pm, lt, M, port, txt, out, lw, ls } = base(env);
    const k = Pm.k, dw = W * (port ? 0.74 : 0.56), dh = H * (port ? 0.3 : 0.52), stx = M * 0.042 * Pm.dir[0], sty = M * 0.036 * Pm.dir[1];
    const win = paperOf(sc), ink = onCol(sc, win), ac = accOn(sc, win), tb0 = J.mix(win, ink, 0.55), faint = J.mix(win, ink, 0.22), th = M * 0.05;
    let bb = null;
    for (let i = 0; i < k; i++) {
      const top = i === k - 1, d = i * 0.085, e = inB(env, 0.3, d, 1.5), a = J.clamp((lt - d) / 0.08) * out;
      if (a <= 0) continue;
      const cx = W / 2 + (i - (k - 1) / 2) * stx, cy = H / 2 + (i - (k - 1) / 2) * sty, x0 = cx - dw / 2, y0 = cy - dh / 2, g = G(env, a);
      const b = pose(env, cx, cy, { s: 0.7 + 0.3 * e }, () => {
        g.r(x0, y0, dw, dh, win); g.r(x0, y0, dw, th, top ? ac : tb0); g.rs(x0, y0, dw, dh, 0, ink, lw * 2);
        const on = onCol(sc, top ? ac : tb0), bx = x0 + dw - th * 0.5, u = th * 0.17;
        g.l(bx - u, y0 + th / 2 - u, bx + u, y0 + th / 2 + u, on, lw * 2); g.l(bx - u, y0 + th / 2 + u, bx + u, y0 + th / 2 - u, on, lw * 2);
        g.t(top ? 'ERROR' : `ERROR (${i + 1})`, x0 + th * 0.4, y0 + th / 2, { color: on, size: ls * 0.95, track: 0.2 });
        if (!top) { greek(g, x0 + dw * 0.08, y0 + th + dh * 0.1, dw * 0.5, 2, dh * 0.07, faint, cut.seed + i, 1, 0.36, 1.5); return null; }
        const bh = dh - th, ix = x0 + dw * 0.1, iy = y0 + th + bh * 0.82, ir = Math.min(bh * 0.085, M * 0.03);
        if (Pm.icon === 'warn') g.p([[ix, iy - ir * 1.1], [ix + ir * 1.2, iy + ir * 0.9], [ix - ir * 1.2, iy + ir * 0.9]], ac); else if (Pm.icon === 'stop') g.rr(ix - ir, iy - ir, ir * 2, ir * 2, ir * 0.5, ac); else g.c(ix, iy, ir, ac);
        g.t(Pm.icon === 'info' ? 'i' : '!', ix, iy + (Pm.icon === 'warn' ? ir * 0.25 : 0), { color: onCol(sc, ac), align: 'center', size: ir * 1.2, track: 0 });
        const bw2 = Math.min(dw * 0.24, M * 0.22), bh2 = bh * 0.14;
        g.r(x0 + dw * 0.93 - bw2, iy - bh2 / 2, bw2, bh2, ink); g.t('OK', x0 + dw * 0.93 - bw2 / 2, iy, { color: win, align: 'center', size: Math.min(ls, bh2 * 0.5) });
        g.rs(x0 + dw * 0.9 - bw2 * 2, iy - bh2 / 2, bw2 * 0.9, bh2, 0, ink, lw * 1.5);
        return fitMain(env, txt, Pm.font, cx, y0 + th + bh * 0.36, dw * 0.86, bh * 0.56, ink, null, 3, bh * 0.36);
      });
      bb = J.unionBB(bb, b);
    }
    return bb;
  },
});

/* ================================================================== 12 xcIncoming — 着信画面
   an incoming call: ringing avatar with ripples, the lyric as the caller's name, decline / accept buttons */
reg('xcIncoming', {
  name: '着信画面', en: 'Incoming Call', tags: ['emotional', 'pop', 'calm'], ae: 'gloss', w: 1.1, fits: FIT,
  plan(rng, cut, st) { return { font: rng.pick(fontsOf(st, ['display', 'body', 'serif'])), flip: rng.chance(0.35), ring: rng.pick([2, 3]), who: rng.pick(['person', 'heart', 'q']) }; },
  render(env) {
    const { W, H, sc, cut, Pm, lt, M, port, txt, out, lw, ls } = base(env);
    const ac = accOn(sc, sc.bg), ac2 = acc2On(sc, sc.bg), plate = paperOf(sc), pin = onCol(sc, plate);
    const ar = M * (port ? 0.12 : 0.13), ax = port ? W / 2 : W * (Pm.flip ? 0.79 : 0.21), ay = port ? H * 0.2 : H * 0.44;
    const g = G(env, inC(env, 0.2) * out), ae = inB(env, 0.45, 0, 1.4);
    for (let i = 0; i < Pm.ring; i++) { const k = ((env.ltb * 0.7 + i / Pm.ring) % 1 + 1) % 1; g.cs(ax, ay, ar * (1 + k * 0.75), ac, lw * 2.5, (1 - k) * 0.8 * J.clamp(lt / 0.3)); }
    g.c(ax, ay, ar * ae, plate);
    if (ae > 0.5) {
      if (Pm.who === 'person') { g.c(ax, ay - ar * 0.2, ar * 0.3, pin, 0.85); g.rr(ax - ar * 0.52, ay + ar * 0.24, ar * 1.04, ar * 0.56, ar * 0.3, pin, 0.85); }
      else if (Pm.who === 'heart') { const u = ar * 0.3; g.c(ax - u * 0.62, ay - u * 0.3, u * 0.75, ac); g.c(ax + u * 0.62, ay - u * 0.3, u * 0.75, ac); g.p([[ax - u * 1.3, ay + u * 0.08], [ax + u * 1.3, ay + u * 0.08], [ax, ay + u * 1.5]], ac); }
      else g.t('?', ax, ay, { color: pin, align: 'center', size: ar * 1.1, track: 0, font: bodyF(env) });
    }
    const tx = port ? W / 2 : W * (Pm.flip ? 0.35 : 0.65), tw = port ? W * 0.86 : W * 0.52, ty = port ? H * 0.5 : H * 0.42, thh = port ? H * 0.28 : H * 0.36;
    g.t('INCOMING CALL' + '.'.repeat(env.step % 4 >> 0 > 2 ? 3 : env.step % 4), tx, ty - thh / 2 - ls * 2, { color: ac, align: 'center', size: ls * 1.1, track: 0.3, alpha: inC(env, 0.3, 0.2) });
    // buttons
    const br = M * 0.058, by = port ? H * 0.84 : H * 0.8, bdx = port ? W * 0.24 : Math.min(tw * 0.3, M * 0.24);
    [[-1, ac2, 0], [1, ac, 1]].forEach(([s, c, ok]) => {
      const be = inB(env, 0.4, 0.25 + ok * 0.08, 1.6), bx = tx + s * bdx, wob = ok ? 1 + 0.05 * Math.sin(env.ltb * 9) : 1, on = onCol(sc, c);
      if (be <= 0) return;
      pose(env, bx, by, { s: be * wob, rot: ok ? Math.sin(env.ltb * 18) * 5 * J.smooth(0.2, 0, ((env.ltb * 0.9) % 1 + 1) % 1 - 0.5) : 0 }, () => {
        g.c(bx, by, br, c);
        if (ok) { g.arc(bx, by - br * 0.3, br * 0.52, 35, 145, on, br * 0.24); g.c(bx - br * 0.44, by, br * 0.15, on); g.c(bx + br * 0.44, by, br * 0.15, on); }
        else { g.l(bx - br * 0.32, by - br * 0.32, bx + br * 0.32, by + br * 0.32, on, br * 0.16); g.l(bx - br * 0.32, by + br * 0.32, bx + br * 0.32, by - br * 0.32, on, br * 0.16); }
      });
    });
    for (let i = 0; i < 3; i++) { const k = (env.step + i) % 3 === 0 ? 1 : 0.35; g.pl([[tx - br * 0.5 + i * br * 0.4, by - br * 0.22], [tx - br * 0.3 + i * br * 0.4, by], [tx - br * 0.5 + i * br * 0.4, by + br * 0.22]], sc.sub, lw * 2, k * J.clamp((lt - 0.4) / 0.2)); }
    g.t(mmss(cut.start || 0), tx, ty + thh / 2 + ls * 1.6, { color: sc.sub, align: 'center', size: ls, alpha: inC(env, 0.3, 0.3) });
    return fitMain(env, txt, Pm.font, tx, ty, tw, thh, sc.fg, null, port ? 4 : 3, M * 0.24);
  },
});

/* ================================================================== 13 xcGauge — 速度計
   a ring gauge winds up around the lyric: ticks, red zone, a marker riding the arc, digital read-out in the gap */
reg('xcGauge', {
  name: '速度計', en: 'Speed Gauge', tags: ['graphic', 'pop', 'glitch'], ae: 'circle', w: 1, emph: 1.3, fits: n => n >= 1 && n <= 14,
  plan(rng, cut, st) { return { font: rng.pick(fontsOf(st, ['display', 'body'])), v: rng.range(0.55, 0.98), unit: rng.pick(['km/h', 'rpm', 'bpm']), max: rng.pick([180, 240, 320]), seg: rng.chance(0.4) }; },
  render(env) {
    const { W, H, sc, cut, Pm, lt, M, port, txt, out, lw, ls } = base(env);
    const cx = W / 2, cy = H * 0.5, Rr = M * 0.39, A0 = 135, SW = 270, ac = accOn(sc, sc.bg), ac2 = acc2On(sc, sc.bg), faint = dimOf(sc);
    const e = inE(env, 0.6), g = G(env, out), th = M * 0.03;
    const wind = J.clamp((lt - 0.1) / 0.75), v = J.clamp(Pm.v * (wind >= 1 ? 1 : E.outBack(wind, 1.2)) + (wind >= 1 ? J.noise1(env.ltb * 3, cut.seed) * 0.025 * env.fx.motion : 0), 0, 1);
    g.arc(cx, cy, Rr, A0, A0 + SW * e, faint, th);
    g.arc(cx, cy, Rr + th * 0.95, A0 + SW * 0.8, A0 + SW * Math.max(0.8, e), ac2, th * 0.25);
    const nT = 36;
    for (let i = 0; i <= nT; i++) {
      if (i / nT > e) break;
      const a = (A0 + SW * i / nT) * J.DEG, major = i % 4 === 0, r0 = Rr + th * 0.75, r1 = r0 + th * (major ? 0.9 : 0.45);
      g.l(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0, cx + Math.cos(a) * r1, cy + Math.sin(a) * r1, i / nT >= 0.8 ? ac2 : sc.sub, lw * (major ? 2.5 : 1.3), major ? 1 : 0.7);
    }
    if (Pm.seg) { const ns = 27; for (let i = 0; i < Math.round(v * ns); i++) g.arc(cx, cy, Rr, A0 + SW * i / ns + 0.8, A0 + SW * (i + 1) / ns - 0.8, i / ns >= 0.8 ? ac2 : ac, th); }
    else g.arc(cx, cy, Rr, A0, A0 + SW * v, ac, th);
    const ma = (A0 + SW * v) * J.DEG, mr = Rr - th * 0.75, ux = Math.cos(ma), uy = Math.sin(ma);
    if (lt > 0.1) g.p([[cx + ux * (mr + th * 0.2), cy + uy * (mr + th * 0.2)], [cx + ux * (mr - th * 0.9) - uy * th * 0.5, cy + uy * (mr - th * 0.9) + ux * th * 0.5], [cx + ux * (mr - th * 0.9) + uy * th * 0.5, cy + uy * (mr - th * 0.9) - ux * th * 0.5]], sc.fg);
    const la = inC(env, 0.3, 0.2);
    g.t(String(Math.round(v * Pm.max)).padStart(3, '0'), cx, cy + Rr * 0.74, { color: sc.fg, align: 'center', size: Rr * 0.17, track: 0.08, alpha: la });
    g.t(Pm.unit, cx, cy + Rr * 0.93, { color: sc.sub, align: 'center', size: ls, track: 0.2, alpha: la });
    g.t('0', cx - Rr * 0.52, cy + Rr * 0.62, { color: sc.sub, align: 'center', size: ls, alpha: la }); g.t(String(Pm.max), cx + Rr * 0.52, cy + Rr * 0.62, { color: ac2, align: 'center', size: ls, alpha: la });
    return fitMain(env, txt, Pm.font, cx, cy - Rr * 0.08, Rr * 1.42, Rr * 0.86, sc.fg, null, 3, Rr * 0.5);
  },
});

/* ================================================================== 14 xcSheet — 表計算
   a spreadsheet fills the screen; the lyric sits in the selected (merged) cell, echoed in the formula bar */
reg('xcSheet', {
  name: '表計算', en: 'Spreadsheet Cell', tags: ['graphic', 'editorial', 'glitch'], ae: 'type', w: 0.9, busy: true, fits: FIT,
  plan(rng, cut, st) { return { font: rng.pick(fontsOf(st, ['body', 'display'])), sh: rng.int(0, 1), sv: rng.int(0, 1), fill: rng.chance(0.4), data: rng.range(0.2, 0.45) }; },
  render(env) {
    const { W, H, sc, cut, Pm, lt, M, port, txt, out, lw, ls } = base(env);
    const hw = M * 0.06, hh = M * 0.048, fbh = M * 0.075, nC = port ? 4 : 6, nR = port ? 11 : 7, cw = (W - hw) / nC, rh = (H - fbh - hh) / nR, gy = fbh + hh;
    const grid = dimOf(sc), head = J.mix(sc.bg, sc.fg, 0.09), ac = accOn(sc, sc.bg), g = G(env, inC(env, 0.25) * out), mono = monoF(env), e = inE(env, 0.6);
    const c0 = port ? 0 : 1, c1 = port ? nC - 1 : 4, r0 = port ? 3 + Pm.sv : 1 + Pm.sv, r1 = port ? r0 + 4 : r0 + 3;
    g.r(0, fbh, W, hh, head); g.r(0, gy, hw, H - gy, head);
    g.r(hw + c0 * cw, fbh, (c1 - c0 + 1) * cw, hh, ac, 0.3); g.r(0, gy + r0 * rh, hw, (r1 - r0 + 1) * rh, ac, 0.3);
    for (let c = 0; c <= nC; c++) { const x = hw + c * cw; g.l(x, fbh, x, fbh + (H - fbh) * inE(env, 0.6, c * 0.03), grid, lw); if (c < nC) g.t(String.fromCharCode(65 + c), x + cw / 2, fbh + hh / 2, { align: 'center', color: sc.sub, size: ls }); }
    for (let r = 0; r <= nR; r++) { const y = gy + r * rh; g.l(0, y, W * inE(env, 0.6, r * 0.03), y, grid, lw); if (r < nR) g.t(String(r + 1), hw / 2, y + rh / 2, { align: 'center', color: sc.sub, size: ls * 0.9, track: 0 }); }
    for (let c = 0; c < nC; c++) for (let r = 0; r < nR; r++) {
      if (c >= c0 && c <= c1 && r >= r0 && r <= r1) continue;
      if (J.r(cut.seed, c, r, 5) > Pm.data) continue;
      const a = inC(env, 0.3, 0.15 + (c + r) * 0.03), num = J.r(cut.seed, c, r, 6) < 0.5;
      if (num) g.t(String(J.h(cut.seed, c, r, 8) % 9000 + 100), hw + (c + 0.92) * cw, gy + (r + 0.5) * rh, { align: 'right', color: sc.sub, size: Math.min(ls, rh * 0.3), alpha: a * 0.8, track: 0.02 });
      else g.r(hw + (c + 0.08) * cw, gy + (r + 0.5) * rh - rh * 0.07, cw * (0.3 + 0.5 * J.r(cut.seed, c, r, 7)) * a, rh * 0.14, grid, 1.5);
    }
    // formula bar
    g.l(0, fbh, W, fbh, grid, lw * 1.5);
    g.rs(M * 0.015, fbh * 0.2, M * 0.1, fbh * 0.6, 0, grid, lw * 1.5); g.t(`${String.fromCharCode(65 + c0)}${r0 + 1}`, M * 0.065, fbh / 2, { align: 'center', color: sc.fg, size: ls });
    g.t('fx', M * 0.145, fbh / 2, { color: sc.sub, size: ls * 1.1, track: 0 });
    const ft = [...short(txt.replace(/\s+/g, ' '), port ? 12 : 30)], nf = Math.floor(J.clamp((lt - 0.1) / 0.5) * ft.length);
    g.t('=' + ft.slice(0, nf).join(''), M * 0.2, fbh / 2, { color: sc.fg, size: ls * 1.15, font: bodyF(env), track: 0.04 });
    // selection
    const sx = hw + c0 * cw, sy = gy + r0 * rh, sw = (c1 - c0 + 1) * cw, shh = (r1 - r0 + 1) * rh, bl = M * 0.006, ins = port ? bl : 0;
    g.r(sx + lw, sy + lw, sw - lw * 2, shh - lw * 2, Pm.fill ? J.mix(sc.bg, sc.accent, 0.14) : sc.bg);
    if (out > 0) env.polyPartial([[sx + ins, sy], [sx + sw - ins, sy], [sx + sw - ins, sy + shh], [sx + ins, sy + shh], [sx + ins, sy - bl / 2]], inE(env, 0.6, 0.1), ac, bl, out, false);
    const he = inB(env, 0.3, 0.55, 1.6); g.r(sx + sw - ins - bl * 2 * he, sy + shh - bl * 2 * he, bl * 4 * he, bl * 4 * he, ac); g.rs(sx + sw - ins - bl * 2 * he, sy + shh - bl * 2 * he, bl * 4 * he, bl * 4 * he, 0, sc.bg, lw * 1.5);
    return fitMain(env, txt, Pm.font, sx + sw / 2, sy + shh / 2, Math.min(sw * 0.88, W * 0.86), shh * 0.8, sc.fg, null, port ? 4 : 3, shh * 0.5);
  },
});

/* ================================================================== 15 xcChipCard — ICカード
   a plastic chip card flips in: gold chip, contactless waves, dotted number; the lyric where the name is embossed */
reg('xcChipCard', {
  name: 'ICカード', en: 'Chip Card', tags: ['pop', 'graphic', 'calm'], ae: 'pill', w: 0.9, treat: 'safe', fits: FIT,
  plan(rng, cut, st) { return { font: rng.pick(fontsOf(st, ['display', 'body'])), c: rng.pick(['accent', 'ink', 'paper']), tilt: rng.pick([-4, 0, 3, 0]), band: rng.chance(0.5), last: rng.int(1000, 9999) }; },
  render(env) {
    const { W, H, sc, cut, Pm, lt, M, port, txt, out, lw, ls } = base(env);
    const [cw, ch] = port ? boxIn(W, H, 0.66, 0.82, 0.8) : boxIn(W, H, 1.586, 0.84, 0.8), x0 = (W - cw) / 2, y0 = (H - ch) / 2, m = Math.min(cw, ch);
    const card = pickPlate(sc, Pm.c), ink = onCol(sc, card), ac = accOn(sc, card), faint = J.mix(card, ink, 0.18);
    const e = inB(env, 0.5, 0, 1.2), g = G(env, inC(env, 0.15) * out);
    return pose(env, W / 2, H / 2, { sx: Math.max(0.02, e), rot: Pm.tilt, dy: (1 - J.clamp(e)) * M * 0.03 }, () => {
      g.rr(x0 + M * 0.012, y0 + M * 0.016, cw, ch, m * 0.06, sc.dim, 0.6);
      g.rr(x0, y0, cw, ch, m * 0.06, card);
      if (Pm.band) g.r(x0, y0 + ch * (port ? 0.26 : 0.3), cw * inE(env, 0.6, 0.15), ch * (port ? 0.48 : 0.44), faint);
      const cs = m * 0.17, cxp = x0 + cw * 0.08, cyp = y0 + ch * (port ? 0.08 : 0.1), chh = cs * 0.76;
      g.rr(cxp, cyp, cs, chh, cs * 0.14, ac);
      const cl = J.mix(ac, onCol(sc, ac), 0.6);
      g.l(cxp + cs * 0.34, cyp, cxp + cs * 0.34, cyp + chh, cl, lw * 1.3); g.l(cxp + cs * 0.66, cyp, cxp + cs * 0.66, cyp + chh, cl, lw * 1.3); g.l(cxp, cyp + chh * 0.5, cxp + cs * 0.34, cyp + chh * 0.5, cl, lw * 1.3); g.l(cxp + cs * 0.66, cyp + chh * 0.5, cxp + cs, cyp + chh * 0.5, cl, lw * 1.3);
      for (let i = 0; i < 3; i++) g.arc(cxp + cs * 1.25, cyp + chh / 2, cs * (0.16 + i * 0.13), -42, 42, ink, lw * 2.4, (env.step + 3 - i) % 4 < 3 ? 0.9 : 0.3);
      g.t(`VALID ${pad2(1 + J.h(cut.seed, 3) % 12)}/${26 + J.h(cut.seed, 4) % 5}`, x0 + cw * 0.92, cyp + chh / 2, { color: ink, align: 'right', size: ls * 0.95, alpha: 0.8 });
      const ny = y0 + ch * (port ? 0.86 : 0.83), nx = x0 + cw * 0.08, nw = cw * (port ? 0.84 : 0.6), dr = Math.min(nw * 0.016, m * 0.014);
      for (let k = 0; k < 12; k++) { if (lt < 0.25 + k * 0.03) break; g.c(nx + (Math.floor(k / 4) * 0.26 + (k % 4) * 0.05) * nw + dr, ny, dr, ink); }
      g.t(String(Pm.last), nx + nw * 0.78, ny, { color: ink, size: dr * 3.4, track: 0.14, alpha: J.clamp((lt - 0.6) / 0.15) });
      const lr = m * 0.055, lx = x0 + cw * 0.92 - lr * 1.6;
      if (!port) { g.c(lx, ny - lr * 0.1, lr, ac, 0.9); g.c(lx + lr * 1.1, ny - lr * 0.1, lr, ink, 0.55); }
      return fitMain(env, txt, Pm.font, W / 2, y0 + ch * (port ? 0.5 : 0.52), cw * 0.84, ch * (port ? 0.42 : 0.36), ink, null, port ? 4 : 2, ch * (port ? 0.2 : 0.3));
    });
  },
});

/* ================================================================== 16 xcPaperCup — 紙コップ
   a take-away cup with lid and rising steam; the lyric is written on the sleeve */
reg('xcPaperCup', {
  name: '紙コップ', en: 'Paper Cup', tags: ['calm', 'pop', 'emotional'], ae: 'labels', w: 0.8, treat: 'safe', fits: n => n >= 1 && n <= 14,
  plan(rng, cut, st) { return { font: rng.pick(fontsOf(st, ['body', 'display', 'serif'])), c: rng.pick(['accent', 'ink']), steam: rng.int(2, 3), ring: rng.chance(0.5) }; },
  render(env) {
    const { W, H, sc, cut, Pm, lt, M, port, txt, out, lw, ls } = base(env);
    const chh = H * (port ? 0.56 : 0.7), tw = Math.min(W * 0.8, chh * (port ? 1.1 : 1.02)), bwd = tw * 0.74, cx = W / 2, y0 = H * (port ? 0.26 : 0.2), y1 = y0 + chh;
    const paper = paperOf(sc), pin = onCol(sc, paper); let sl = pickPlate(sc, Pm.c); if (J.contrast(sl, paper) < 1.5) sl = J.mix(paper, pin, 0.85);
    const ink = onCol(sc, sl), lid = J.mix(paper, pin, 0.2);
    const e = inE(env, 0.5), g = G(env, inC(env, 0.2) * out), wAt = f => tw + (bwd - tw) * f;
    return pose(env, cx, y1, { dy: (1 - e) * H * 0.07, sy: 0.9 + 0.1 * e }, () => {
      // steam
      for (let i = 0; i < Pm.steam; i++) {
        const sx = cx + (i - (Pm.steam - 1) / 2) * tw * 0.2, pts = [], se = inE(env, 0.8, 0.3 + i * 0.1);
        for (let k = 0; k <= 12; k++) { const f = k / 12; pts.push([sx + Math.sin(f * 5 - env.ltb * 2.2 + i * 1.7) * tw * 0.025 * (0.3 + f), y0 - chh * 0.1 - f * chh * 0.2 * se]); }
        g.pl(pts, sc.sub, lw * 3, 0.6 * se);
      }
      g.p([[cx - tw / 2, y0], [cx + tw / 2, y0], [cx + bwd / 2, y1], [cx - bwd / 2, y1]], paper);
      const f0 = 0.2, f1 = 0.82, ys0 = y0 + chh * f0, ys1 = y0 + chh * f1, w0 = wAt(f0) * 1.03, w1 = wAt(f1) * 1.03, se2 = inE(env, 0.5, 0.12);
      g.p([[cx - w0 / 2, ys0], [cx - w0 / 2 + w0 * se2, ys0], [cx - w1 / 2 + w1 * se2, ys1], [cx - w1 / 2, ys1]], sl);
      if (Pm.ring) for (const f of [0.06, 0.94]) { const yy = ys0 + (ys1 - ys0) * f, ww = (w0 + (w1 - w0) * f) * se2; g.l(cx - ww / 2, yy, cx + ww / 2, yy, ink, lw * 1.5, 0.5); }
      g.rr(cx - tw * 0.54, y0 - chh * 0.055, tw * 1.08, chh * 0.075, chh * 0.025, lid); g.rr(cx - tw * 0.45, y0 - chh * 0.095, tw * 0.9, chh * 0.055, chh * 0.02, lid);
      g.rr(cx + tw * 0.2, y0 - chh * 0.082, tw * 0.1, chh * 0.018, chh * 0.009, pin, 0.6);
      return fitMain(env, txt, Pm.font, cx, (ys0 + ys1) / 2, w1 * 0.84, (ys1 - ys0) * (Pm.ring ? 0.72 : 0.8), ink, null, 4, chh * 0.3);
    });
  },
});

/* ================================================================== 17 xcTshirt — Tシャツ
   a T-shirt drops in swinging; the lyric is the chest print */
reg('xcTshirt', {
  name: 'Tシャツ', en: 'T-Shirt Print', tags: ['pop', 'graphic'], ae: 'labels', w: 0.8, treat: 'safe', fits: FIT,
  plan(rng, cut, st) { return { font: rng.pick(fontsOf(st, ['display', 'body'])), c: rng.pick(['paper', 'ink', 'accent']), neck: rng.pick(['round', 'v']), stripe: rng.chance(0.5), hang: rng.chance(0.5) }; },
  render(env) {
    const { W, H, sc, cut, Pm, lt, M, port, txt, out, lw, ls } = base(env);
    const [sw, sh] = boxIn(W, H, 1.18, 0.92, 0.8), cx = W / 2, y0 = (H - sh) / 2 + (Pm.hang ? sh * 0.03 : 0);
    const shirt = pickPlate(sc, Pm.c), ink = onCol(sc, shirt), ac = accOn(sc, shirt), rib = J.mix(shirt, ink, 0.25);
    const k = J.clamp(lt / 0.9), e = inE(env, 0.45), swing = Math.sin(k * 9) * (1 - k) * (1 - k) * 9, g = G(env, inC(env, 0.15) * out);
    const X = f => cx + f * sw, Y = f => y0 + f * sh;
    return pose(env, cx, y0 - sh * 0.08, { rot: swing, dy: -(1 - e) * H * 0.2 }, () => {
      if (Pm.hang) { const hc = J.mix(sc.bg, sc.fg, 0.5); g.arc(cx, Y(-0.07), sh * 0.025, 180, 450, hc, lw * 3); g.l(cx, Y(-0.045), cx, Y(-0.01), hc, lw * 3); g.pl([[X(-0.3), Y(0.09)], [cx, Y(-0.01)], [X(0.3), Y(0.09)]], hc, lw * 3); }
      const neck = []; if (Pm.neck === 'round') for (let q = 0; q <= 10; q++) { const a = Math.PI * (1 - q / 10); neck.push([cx + Math.cos(a) * sw * 0.13, Y(0) + Math.sin(a) * sw * 0.085]); } else neck.push([X(-0.13), Y(0)], [cx, Y(0.15)], [X(0.13), Y(0)]);
      g.p(neck.concat([[X(0.5), Y(0.2)], [X(0.42), Y(0.4)], [X(0.31), Y(0.31)], [X(0.31), Y(1)], [X(-0.31), Y(1)], [X(-0.31), Y(0.31)], [X(-0.42), Y(0.4)], [X(-0.5), Y(0.2)]]), shirt);
      g.pl(neck.map(([px, py]) => [px, py + sh * 0.014]), rib, sh * 0.028);
      if (Pm.stripe) for (const s of [-1, 1]) g.pl([[X(s * 0.455), Y(0.24)], [X(s * 0.385), Y(0.345)]], ac, sh * 0.03);
      g.r(X(-0.31) + sw * 0.03, Y(0.93), sw * 0.07, sh * 0.03, ac, inC(env, 0.3, 0.4));
      return fitMain(env, txt, Pm.font, cx, Y(0.6), sw * 0.53, sh * 0.5, ink, null, 4, sh * 0.3);
    });
  },
});

/* ================================================================== 18 xcHandheld — 携帯ゲーム機
   a handheld console (sideways in landscape, upright in portrait): the lyric on its screen, pad and buttons being pressed */
reg('xcHandheld', {
  name: '携帯ゲーム機', en: 'Handheld Console', tags: ['pop', 'glitch', 'graphic'], ae: 'labels', w: 0.8, fits: FIT,
  plan(rng, cut, st) { return { font: rng.chance(0.5) ? 'dot' : rng.pick(fontsOf(st, ['display', 'body'])), c: rng.pick(['paper', 'accent', 'ink']), lines: rng.chance(0.5) }; },
  render(env) {
    const { W, H, sc, cut, Pm, lt, M, port, txt, out, lw, ls } = base(env);
    const bw = W * (port ? 0.86 : 0.9), bh = H * (port ? 0.8 : 0.76), x0 = (W - bw) / 2, y0 = (H - bh) / 2, m = Math.min(bw, bh);
    const body = pickPlate(sc, Pm.c), on = onCol(sc, body), dk = J.mix(body, on, 0.78), mid = J.mix(body, on, 0.3), ac = accOn(sc, body);
    const e = inE(env, 0.5), g = G(env, inC(env, 0.2) * out), hot = (env.step >> 1) % 4;
    const sw = port ? bw * 0.84 : bw * 0.5, shh = port ? bh * 0.44 : bh * 0.72, sx = W / 2 - sw / 2, sy = port ? y0 + bh * 0.07 : H / 2 - shh / 2;
    return pose(env, W / 2, H / 2, { dy: (1 - e) * H * 0.06, s: 0.95 + 0.05 * e }, () => {
      g.rr(x0, y0, bw, bh, m * (port ? 0.08 : 0.16), body);
      g.rr(sx - m * 0.03, sy - m * 0.03, sw + m * 0.06, shh + m * 0.06, m * 0.03, dk);
      const on2 = J.clamp((lt - 0.15) / 0.2) * (lt < 0.5 && env.step % 2 ? 0.5 : 1);
      g.r(sx, sy, sw, shh, sc.bg, on2);
      if (Pm.lines) for (let i = 1; i < 14; i++) g.l(sx, sy + shh * i / 14, sx + sw, sy + shh * i / 14, sc.fg, lw, 0.06 * on2);
      const dx = port ? x0 + bw * 0.25 : x0 + bw * 0.125, dy = port ? y0 + bh * 0.74 : H / 2, al = m * (port ? 0.26 : 0.3), aw = al * 0.34;
      g.rr(dx - al / 2, dy - aw / 2, al, aw, aw * 0.2, dk); g.rr(dx - aw / 2, dy - al / 2, aw, al, aw * 0.2, dk);
      const dirs = [[1, 0], [0, 1], [-1, 0], [0, -1]][hot]; g.c(dx + dirs[0] * al * 0.33, dy + dirs[1] * al * 0.33, aw * 0.26, ac, J.clamp((lt - 0.4) / 0.1));
      const br = m * (port ? 0.065 : 0.075), ax = port ? x0 + bw * 0.82 : x0 + bw * 0.915, ay = port ? y0 + bh * 0.7 : H / 2 - br * 0.9, bx = port ? x0 + bw * 0.64 : x0 + bw * 0.815, by = port ? y0 + bh * 0.76 : H / 2 + br * 0.9;
      g.c(ax, ay, br * inB(env, 0.3, 0.2), hot === 1 ? ac : dk); g.c(bx, by, br * inB(env, 0.3, 0.27), hot === 3 ? ac : dk);
      g.t('A', ax, ay, { color: body, align: 'center', size: br * 0.8, track: 0 }); g.t('B', bx, by, { color: body, align: 'center', size: br * 0.8, track: 0 });
      const py = port ? y0 + bh * 0.9 : y0 + bh * 0.9, px = port ? W / 2 : x0 + bw * 0.125;
      for (const s of [-1, 1]) pose(env, px + s * m * 0.07, py, { rot: -25 }, () => g.rr(px + s * m * 0.07 - m * 0.045, py - m * 0.012, m * 0.09, m * 0.024, m * 0.012, mid));
      const spx = port ? x0 + bw * 0.8 : x0 + bw * 0.865, spy = port ? y0 + bh * 0.9 : y0 + bh * 0.84;
      for (let i = 0; i < 4; i++) pose(env, spx, spy, { rot: -25 }, () => g.rr(spx - m * 0.05 + i * m * 0.03, spy - m * 0.04, m * 0.012, m * 0.08, m * 0.006, mid));
      g.c(sx - m * 0.012, sy + shh + m * 0.05, m * 0.008, ac, env.step % 6 < 5 ? 1 : 0.3);
      return fitMain(env, txt, Pm.font, W / 2, sy + shh / 2, sw * 0.88, shh * 0.8, sc.fg, null, port ? 4 : 3, shh * 0.46);
    });
  },
});

/* ================================================================== 19 xcBlackboard — 黒板
   a classroom board with frame, chalk tray, chalks and eraser; a chalk underline is drawn under the lyric */
reg('xcBlackboard', {
  name: '黒板', en: 'Chalkboard', tags: ['emotional', 'calm', 'pop'], ae: 'center', w: 1, treat: 'safe', fits: FIT,
  plan(rng, cut, st) { return { font: rng.pick(fontsOf(st, ['serif', 'body', 'display'])), ul: rng.pick(['wave', 'double', 'circle']), doodle: rng.pick(['star', 'arrow', 'none']), tilt: rng.pick([0, 0, -1.5]) }; },
  render(env) {
    const { W, H, sc, cut, Pm, lt, M, port, txt, out, lw, ls, no } = base(env);
    const bw = W * 0.86, bh = H * (port ? 0.56 : 0.7), x0 = (W - bw) / 2, y0 = (H - bh) / 2 - H * 0.025;
    const board = pickPlate(sc, 'ink'), ink = onCol(sc, board), ac = accOn(sc, board), ac2 = acc2On(sc, board), wood = J.mix(sc.bg, sc.fg, 0.5), fr = M * 0.014;
    const e = inE(env, 0.5), g = G(env, inC(env, 0.2) * out), o = { lead: 1.25, track: 0.03 };
    return pose(env, W / 2, H / 2, { dy: (1 - e) * H * 0.05, rot: Pm.tilt }, () => {
      g.r(x0, y0, bw, bh, board); g.rs(x0 - fr / 2, y0 - fr / 2, bw + fr, bh + fr, 0, wood, fr);
      g.r(x0 - fr, y0 + bh + fr * 0.9, bw + fr * 2, fr * 1.2, wood);
      const ty = y0 + bh + fr * 0.9;
      [[0.1, ink, 0.07], [0.19, ac, 0.05], [0.26, ac2, 0.04]].forEach(([fx, c, wl], i) => g.rr(x0 + bw * fx, ty - fr * 0.7, bw * wl * inE(env, 0.4, 0.2 + i * 0.06), fr * 0.7, fr * 0.2, c));
      g.r(x0 + bw * 0.8, ty - fr * 1.9, bw * 0.11, fr * 1.9, wood); g.r(x0 + bw * 0.8, ty - fr * 0.8, bw * 0.11, fr * 0.8, J.mix(wood, ink, 0.5));
      g.t(`No.${pad2(no)}`, x0 + bw * 0.04, y0 + bh * 0.09, { color: ink, size: ls * 1.2, alpha: 0.7 * inC(env, 0.3, 0.25) });
      const f = fitBox(txt, Pm.font, bw * 0.8, bh * 0.52, o, port ? 4 : 3), size = Math.min(f.size, bh * 0.3), it = Object.assign({ text: f.text, font: Pm.font, size, x: W / 2, y: y0 + bh * 0.47, color: ink }, o);
      const m = J.measure(it), ue = inC(env, 0.5, 0.35), uy = it.y + m.h / 2 + size * 0.2, ux = W / 2 - m.w / 2, cw2 = Math.max(3, size * 0.045);
      if (out > 0 && ue > 0) {
        const wav = (yy, amp, sd) => { const pts = []; for (let k = 0; k <= 24; k++) pts.push([ux + m.w * k / 24, yy + (Pm.ul === 'wave' ? Math.sin(k * 0.9) * amp : 0) + J.rs(cut.seed, k, sd) * cw2 * 0.4]); return pts; };
        if (Pm.ul === 'circle') { const pts = []; for (let k = 0; k <= 40; k++) { const a = -1.9 + (k / 40) * J.TAU * 1.06; pts.push([W / 2 + Math.cos(a) * (m.w / 2 + size * 0.45) * (1 + 0.02 * J.rs(cut.seed, k, 2)), it.y + Math.sin(a) * (m.h / 2 + size * 0.3)]); } env.polyPartial(pts, ue, ac, cw2, out * 0.9, false); }
        else { env.polyPartial(wav(uy, size * 0.05, 1), ue, ac, cw2, out * 0.9, false); if (Pm.ul === 'double') env.polyPartial(wav(uy + cw2 * 2.4, 0, 3), inC(env, 0.5, 0.55), ac, cw2 * 0.7, out * 0.9, false); }
      }
      const de = inC(env, 0.5, 0.5), qx = x0 + bw * 0.9, qy = y0 + bh * 0.87, u = bh * 0.05;
      if (out > 0 && de > 0 && Pm.doodle === 'star') { const pts = []; for (let k = 0; k <= 5; k++) { const a = -Math.PI / 2 + k * J.TAU * 2 / 5; pts.push([qx + Math.cos(a) * u, qy + Math.sin(a) * u]); } env.polyPartial(pts, de, ac2, cw2 * 0.7, out * 0.9, false); }
      else if (out > 0 && de > 0 && Pm.doodle === 'arrow') env.polyPartial([[qx - u * 2.4, qy + u * 0.4], [qx - u, qy - u * 0.3], [qx + u * 0.6, qy], [qx + u * 0.1, qy - u * 0.6], [qx + u * 0.6, qy], [qx, qy + u * 0.55]], de, ac2, cw2 * 0.7, out * 0.9, false);
      return J.mainDraw(env, it);
    });
  },
});

/* ================================================================== 20 xcTruck — トラック
   a delivery truck drives in with the lyric painted on its cargo box; wheels keep turning, the road slides by */
reg('xcTruck', {
  name: 'トラック', en: 'Delivery Truck', tags: ['pop', 'graphic'], ae: 'marquee', w: 0.8, treat: 'safe', fits: FIT,
  plan(rng, cut, st) { return { font: rng.pick(fontsOf(st, ['display', 'body'])), dir: rng.pick([1, 1, -1]), band: rng.chance(0.6), c: rng.pick(['paper', 'paper', 'ink']) }; },
  render(env) {
    const { W, H, sc, cut, Pm, lt, M, port, txt, out, lw, ls } = base(env);
    const dir = Pm.dir, cw = W * (port ? 0.66 : 0.6), chh = port ? W * 0.52 : H * 0.52, cabW = W * (port ? 0.2 : 0.15), cabH = chh * 0.66, r = M * (port ? 0.062 : 0.075), gap = W * 0.012;
    const total = cw + gap + cabW, xl = (W - total) / 2, yt = port ? H / 2 - (chh + r * 1.9) / 2 : H * 0.14, yb = yt + chh, gy = yb + r * 1.9;
    const box = pickPlate(sc, Pm.c), ink = onCol(sc, box), cab = pickPlate(sc, 'accent'), dk = J.mix(sc.bg, sc.fg, 0.55), ac = accOn(sc, box), road = J.mix(sc.bg, sc.fg, 0.3);
    const k = J.clamp(lt / 0.8), e = E.outExpo(k), g = G(env, J.clamp(lt / 0.1) * out), g0 = G(env, inC(env, 0.3) * out);
    const mx = (x, w = 0) => (dir > 0 ? x : W - x - w), roll = (env.ltb * 3.2 + (1 - e) * 12) * dir;
    g0.l(0, gy, W, gy, road, lw * 2);
    for (let i = 0; i < 9; i++) { const dxp = (((i / 9 - env.ltb * 0.35 * dir - (1 - e) * 2 * dir) % 1) + 1) % 1; g0.r(dxp * W * 1.1 - W * 0.05, gy + r * 0.35, W * 0.045, lw * 3, road); }
    return pose(env, W / 2, gy, { dx: -dir * (1 - e) * W * 1.05, dy: Math.sin(env.ltb * 11) * M * 0.0015 * env.fx.motion, rot: -dir * (1 - k) * (1 - k) * 2.5 * Math.sin(k * 14) }, () => {
      for (let i = 0; i < 3; i++) if ((env.step + i) % 3) g.r(mx(xl - W * (0.05 + 0.02 * i), W * 0.04), yt + chh * (0.25 + i * 0.25), W * 0.04, lw * 2.5, sc.sub, 0.7);
      g.r(mx(xl + cw * 0.04, total - cw * 0.06), yb, total - cw * 0.06, r * 0.5, dk);
      g.rr(mx(xl, cw), yt, cw, chh, M * 0.012, box);
      if (Pm.band) g.r(mx(xl, cw), yb - chh * 0.1, cw, chh * 0.05, ac);
      const cx0 = xl + cw + gap, cy0 = yb - cabH;
      g.rr(mx(cx0, cabW), cy0, cabW, cabH, M * 0.02, cab);
      g.rr(mx(cx0 + cabW * 0.36, cabW * 0.52), cy0 + cabH * 0.12, cabW * 0.52, cabH * 0.38, M * 0.01, sc.bg);
      g.r(mx(cx0 + cabW * 0.9, cabW * 0.14), yb - cabH * 0.12, cabW * 0.14, cabH * 0.1, dk); g.c(mx(cx0 + cabW * 0.93), yb - cabH * 0.26, cabH * 0.045, onCol(sc, cab));
      for (const wx of [xl + cw * 0.2, xl + cw * 0.38, cx0 + cabW * 0.5]) {
        const x = mx(wx), y = gy - r;
        g.c(x, y, r, dk); g.c(x, y, r * 0.5, sc.bg); g.c(x, y, r * 0.16, dk);
        for (let s = 0; s < 3; s++) { const a = roll + s * J.TAU / 3; g.l(x, y, x + Math.cos(a) * r * 0.48, y + Math.sin(a) * r * 0.48, dk, lw * 3); }
      }
      return fitMain(env, txt, Pm.font, mx(xl + cw / 2), yt + chh * (Pm.band ? 0.44 : 0.5), cw * 0.86, chh * (Pm.band ? 0.66 : 0.76), ink, null, port ? 4 : 3, chh * 0.42);
    });
  },
});

/* ================================================================== 21 xcPlate — ナンバー
   a vehicle number plate swings down on one bolt and settles: EU band, US slogan or two-row style */
reg('xcPlate', {
  name: 'ナンバー', en: 'Number Plate', tags: ['graphic', 'pop'], ae: 'pill', w: 0.9, treat: 'safe', fits: n => n >= 1 && n <= 14,
  plan(rng, cut, st) { return { font: rng.pick(fontsOf(st, ['display', 'body'])), style: rng.pick(['eu', 'us', 'two']), c: rng.pick(['paper', 'paper', 'accent', 'ink']), side: rng.pick([-1, 1]) }; },
  render(env) {
    const { W, H, sc, cut, Pm, lt, M, port, txt, out, lw, ls, no } = base(env);
    const [pw, ph] = boxIn(W, H, port ? 1.3 : 2.15, 0.88, 0.7), x0 = (W - pw) / 2, y0 = (H - ph) / 2, r = ph * 0.07;
    const plate = pickPlate(sc, Pm.c), ink = onCol(sc, plate), ac = accOn(sc, plate), bolt = J.mix(plate, ink, 0.45);
    const k = J.clamp(lt / 0.75), sw = k >= 1 ? 0 : Math.cos(k * 10) * (1 - k) * (1 - k) * 16 * Pm.side, g = G(env, J.clamp(lt / 0.12) * out);
    const bxs = [x0 + pw * 0.14, x0 + pw * 0.86], byb = y0 + ph * 0.1, pv = Pm.side < 0 ? bxs[0] : bxs[1];
    return pose(env, pv, byb, { rot: sw, dy: -(1 - E.outExpo(J.clamp(lt / 0.3))) * H * 0.12 }, () => {
      g.rr(x0, y0, pw, ph, r, plate); g.rs(x0 + ph * 0.035, y0 + ph * 0.035, pw - ph * 0.07, ph - ph * 0.07, r * 0.7, ink, Math.max(lw * 2, ph * 0.012));
      const two = Pm.style === 'two', us = Pm.style === 'us', eu = Pm.style === 'eu';
      if (!eu) for (const bx of bxs) { g.c(bx, byb, ph * 0.028, bolt); g.l(bx - ph * 0.016, byb, bx + ph * 0.016, byb, plate, lw * 1.5); }
      let bx0 = x0 + pw * 0.06, bx1 = x0 + pw * 0.94, by0 = y0 + ph * 0.1, by1 = y0 + ph * 0.9;
      if (eu) {
        const bwd = pw * (port ? 0.13 : 0.09), on = onCol(sc, ac);
        g.rr(x0 + ph * 0.07, y0 + ph * 0.07, bwd, ph * 0.86, r * 0.5, ac);
        for (let i = 0; i < 10; i++) { const a = i * J.TAU / 10 + env.ltb * 0.3; g.c(x0 + ph * 0.07 + bwd / 2 + Math.cos(a) * bwd * 0.26, y0 + ph * 0.32 + Math.sin(a) * bwd * 0.26, bwd * 0.035, on); }
        g.t('JZ', x0 + ph * 0.07 + bwd / 2, y0 + ph * 0.74, { color: on, align: 'center', size: bwd * 0.36, track: 0.05 });
        bx0 = x0 + ph * 0.07 + bwd + pw * 0.03;
      } else if (us) {
        g.t(short((cut.lineText || txt).toUpperCase(), port ? 10 : 18), W / 2, y0 + ph * 0.13, { color: ac, align: 'center', size: ph * 0.07, font: bodyF(env), track: 0.2 });
        g.t(`· LINE ${pad2(no)} ·`, W / 2, y0 + ph * 0.88, { color: ink, align: 'center', size: ph * 0.055, track: 0.3, alpha: 0.8 });
        g.rr(x0 + pw * 0.9 - ph * 0.05, y0 + ph * 0.8, ph * 0.1, ph * 0.1, ph * 0.02, ac, inB(env, 0.3, 0.5));
        by0 = y0 + ph * 0.2; by1 = y0 + ph * 0.8;
      } else {
        g.t(`${short(cut.lineText || txt, 4)}  ${300 + J.h(cut.seed, 3) % 500}`, W / 2, y0 + ph * 0.17, { color: ink, align: 'center', size: ph * 0.1, font: bodyF(env), track: 0.1 });
        g.t(pad2(no), x0 + pw * 0.1, y0 + ph * 0.6, { color: ink, align: 'center', size: ph * 0.11, track: 0 });
        g.c(x0 + pw * 0.9, y0 + ph * 0.6, ph * 0.02, ink);
        bx0 = x0 + pw * 0.16; bx1 = x0 + pw * 0.86; by0 = y0 + ph * 0.28;
      }
      return fitMain(env, txt, Pm.font, (bx0 + bx1) / 2, (by0 + by1) / 2, (bx1 - bx0) * 0.94, (by1 - by0) * 0.86, ink, { lead: 1.12, track: 0.04 }, port ? 3 : 2, ph * 0.6);
    });
  },
});

/* ================================================================== 22 xcDropdown — プルダウン
   a select box drops its menu open; the highlight slides down to the row that holds the lyric and a pointer clicks it */
reg('xcDropdown', {
  name: 'プルダウン', en: 'Dropdown Menu', tags: ['pop', 'graphic', 'editorial'], ae: 'stack', w: 1, treat: 'safe', fits: FIT,
  plan(rng, cut, st) { return { font: rng.pick(fontsOf(st, ['body', 'display'])), rows: rng.int(3, 4), hi: rng.int(0, 3), check: rng.chance(0.5) }; },
  render(env) {
    const { W, H, sc, cut, Pm, lt, M, port, txt, out, lw, ls } = base(env);
    const mw = W * (port ? 0.88 : 0.72), x0 = (W - mw) / 2, nr = Pm.rows, hi = Math.min(Pm.hi, nr - 1), u = M * 0.082, sbh = M * 0.095, gap = M * 0.016;
    const hh = Math.min(H * (port ? 0.3 : 0.42), H * 0.84 - sbh - gap - (nr - 1) * u), toth = sbh + gap + (nr - 1) * u + hh, y0 = (H - toth) / 2;
    const win = paperOf(sc), ink = onCol(sc, win), faint = J.mix(win, ink, 0.22), ac = accOn(sc, win), on = onCol(sc, ac);
    const g = G(env, inC(env, 0.2) * out), e = inE(env, 0.32, 0.04), my = y0 + sbh + gap, mh = toth - sbh - gap;
    g.rr(x0, y0, mw, sbh, M * 0.014, win); g.rs(x0, y0, mw, sbh, M * 0.014, ac, lw * 3);
    g.t(short(cut.lineText || txt, port ? 12 : 26), x0 + sbh * 0.4, y0 + sbh / 2, { color: ink, font: bodyF(env), size: sbh * 0.34, track: 0.04, alpha: 0.75 });
    const cx = x0 + mw - sbh * 0.5, cu = sbh * 0.13, fl = e > 0.5 ? -1 : 1; g.pl([[cx - cu, y0 + sbh / 2 - cu * 0.5 * fl], [cx, y0 + sbh / 2 + cu * 0.5 * fl], [cx + cu, y0 + sbh / 2 - cu * 0.5 * fl]], ink, lw * 3);
    g.rr(x0 + M * 0.01, my + M * 0.012, mw, mh * e, M * 0.014, sc.dim, 0.6);
    g.rr(x0, my, mw, mh * e, M * 0.014, win);
    // highlight slides from the first row to the target row
    const rowY = i => my + i * u + (i > hi ? hh - u : 0), sl = E.outCubic(J.clamp((lt - 0.22) / 0.25)), hy = rowY(hi), hhh = hh;
    for (let i = 0; i < nr; i++) {
      const ry = rowY(i), rh = i === hi ? hh : u;
      if (ry + rh > my + mh * e + 1) break;
      if (i === hi) continue;
      g.r(x0 + mw * 0.08, ry + rh / 2 - u * 0.1, mw * (0.22 + 0.3 * J.r(cut.seed, i, 4)), u * 0.2, faint, 1.6);
      if (i < nr - 1 && i + 1 !== hi) g.l(x0 + mw * 0.03, ry + rh, x0 + mw * 0.97, ry + rh, faint, lw);
    }
    if (hy + M * 0.03 < my + mh * e) {
      g.rr(x0 + M * 0.008, hy + M * 0.006, (mw - M * 0.016) * (0.3 + 0.7 * sl), Math.min(hhh, my + mh * e - hy) - M * 0.012, M * 0.01, ac, sl);
      if (Pm.check && sl >= 1) { const kx = x0 + mw * 0.045, ky = hy + hhh / 2, ku = M * 0.014; g.pl([[kx - ku, ky], [kx - ku * 0.2, ky + ku * 0.8], [kx + ku * 1.1, ky - ku * 0.9]], on, lw * 3.5); }
    }
    // pointer
    const pe = inE(env, 0.6, 0.35), pk = J.clamp((lt - 0.95) / 0.12), click = pk > 0 && pk < 1 ? 0.85 : 1, pu = M * 0.07 * click;
    const px = x0 + mw * 0.9 + (1 - pe) * W * 0.12, py = rowY(hi) + hh * 0.7 + (1 - pe) * H * 0.2;
    const arrow = s => [[0, 0], [0, 1], [0.27, 0.77], [0.45, 1.17], [0.6, 1.1], [0.42, 0.71], [0.72, 0.71]].map(([a, b]) => [px + a * pu * s - (s - 1) * pu * 0.12, py + b * pu * s - (s - 1) * pu * 0.2]);
    if (lt > 0.35) { g.p(arrow(1.28), win); g.p(arrow(1), ink); }
    return fitMain(env, txt, Pm.font, W / 2 - mw * 0.02, rowY(hi) + hh / 2, mw * 0.74, hh * 0.76, J.mix(ink, on, sl), null, port ? 4 : 3, hh * 0.5);
  },
});

/* ================================================================== 23 xcSelect — 範囲選択
   the lyric gets selected like text on a phone: the highlight sweeps line by line between two handles, a copy / share bar pops up */
reg('xcSelect', {
  name: '範囲選択', en: 'Text Selection', tags: ['calm', 'emotional', 'editorial', 'pop'], ae: 'center', w: 1.3, fits: n => n >= 1 && n <= 18,
  plan(rng, cut, st) { return { font: rng.pick(fontsOf(st, ['body', 'serif', 'display'])), ui: rng.pick(['mobile', 'mobile', 'desktop']), align: rng.pick(['center', 'center', 'left']) }; },
  render(env) {
    const { W, H, sc, cut, Pm, lt, M, port, txt, out, lw, ls } = base(env);
    const o = { lead: 1.34, track: 0.03 }, mob = Pm.ui === 'mobile', f = fitBox(txt, Pm.font, W * 0.8, H * (port ? 0.4 : 0.46), o, port ? 4 : 3), size = Math.min(f.size, M * 0.22);
    const lines = f.text.split('\n'), L = lines.length, ws = lines.map(s => J.measure({ text: s, font: Pm.font, size, track: o.track }).w), mwid = Math.max(...ws);
    const cy = H * (mob ? 0.55 : 0.45), pitch = size * o.lead, left = Pm.align === 'left', xl = W / 2 - mwid / 2, ac = accOn(sc, sc.bg), g = G(env, out);
    const lx0 = i => (left ? xl : W / 2 - ws[i] / 2), ly = i => cy + (i - (L - 1) / 2) * pitch, pdx = size * 0.08;
    const sp = inC(env, 0.3 + 0.18 * L, 0.2) * L; let ex = lx0(0) - pdx, ey = ly(0);
    for (let i = 0; i < L; i++) {
      const k = J.clamp(sp - i); if (k <= 0) break;
      g.r(lx0(i) - pdx, ly(i) - pitch / 2, (ws[i] + pdx * 2) * k, pitch, ac, 0.36);
      ex = lx0(i) - pdx + (ws[i] + pdx * 2) * k; ey = ly(i);
    }
    const it = Object.assign({ text: f.text, font: Pm.font, size, x: left ? xl : W / 2, y: cy, color: sc.fg, align: left ? 'left' : 'center' }, o);
    const bb = J.mainDraw(env, it);
    const ha = J.clamp((lt - 0.15) / 0.1), hr = size * 0.1, hw = Math.max(lw * 2, size * 0.035);
    if (mob) {
      const sx = lx0(0) - pdx, sy = ly(0);
      g.r(sx - hw / 2, sy - pitch / 2, hw, pitch + hr, ac, ha); g.c(sx, sy + pitch / 2 + hr * 1.5, hr, ac, ha);
      g.r(ex - hw / 2, ey - pitch / 2, hw, pitch + hr, ac, ha); g.c(ex, ey + pitch / 2 + hr * 1.5, hr, ac, ha);
      const bar = paperOf(sc), bin = onCol(sc, bar), be = inB(env, 0.35, 0.5 + 0.12 * L, 1.5), bw = Math.min(W * 0.8, M * 0.62), bh = M * 0.08, by = ly(0) - pitch / 2 - bh - M * 0.035, gb = G(env, J.clamp((lt - 0.5 - 0.12 * L) / 0.1) * out);
      if (be > 0) pose(env, W / 2, by + bh, { s: be }, () => {
        gb.rr(W / 2 - bw / 2, by, bw, bh, bh * 0.25, bar); gb.p([[W / 2 - bh * 0.22, by + bh - 1], [W / 2 + bh * 0.22, by + bh - 1], [W / 2, by + bh * 1.26]], bar);
        const labs = isLatinT(txt) ? ['Copy', 'Share', 'Search'] : ['コピー', '共有', '検索'];
        labs.forEach((s, i) => { gb.t(s, W / 2 + (i - 1) * bw / 3, by + bh / 2, { color: bin, align: 'center', font: bodyF(env), size: bh * 0.36, track: 0.04 }); if (i) gb.l(W / 2 + (i - 1.5) * bw / 3, by + bh * 0.25, W / 2 + (i - 1.5) * bw / 3, by + bh * 0.75, bin, lw, 0.35); });
      });
    } else {
      if (env.step % 4 < 3 || sp < L) { g.r(ex - hw / 2, ey - pitch * 0.46, hw, pitch * 0.92, sc.fg, ha); g.r(ex - hw * 2, ey - pitch * 0.46, hw * 4, hw * 0.8, sc.fg, ha); g.r(ex - hw * 2, ey + pitch * 0.46 - hw * 0.8, hw * 4, hw * 0.8, sc.fg, ha); }
      const menu = paperOf(sc), min = onCol(sc, menu), me = inB(env, 0.3, 0.55 + 0.12 * L, 1.4), mw2 = M * 0.34, rh = M * 0.058, mh = rh * 3 + M * 0.016, mx = Math.min(Math.max(ex + M * 0.02, W * 0.08), W * 0.94 - mw2), my = Math.min(ly(L - 1) + pitch / 2 + M * 0.03, H * 0.95 - mh);
      const gm = G(env, J.clamp((lt - 0.55 - 0.12 * L) / 0.1) * out);
      if (me > 0) pose(env, mx, my, { s: me }, () => {
        gm.r(mx + M * 0.008, my + M * 0.01, mw2, mh, sc.dim, 0.7); gm.r(mx, my, mw2, mh, menu); gm.rs(mx, my, mw2, mh, 0, min, lw * 1.5);
        const hot = Math.min(2, Math.floor(Math.max(0, lt - 0.8 - 0.12 * L) / 0.35)), labs = isLatinT(txt) ? ['Copy', 'Cut', 'Search…'] : ['コピー', '切り取り', '検索…'], keys = ['Ctrl+C', 'Ctrl+X', ''];
        labs.forEach((s, i) => { const ry = my + M * 0.008 + i * rh; if (i === hot) gm.r(mx + lw * 2, ry, mw2 - lw * 4, rh, accOn(sc, menu)); const c = i === hot ? onCol(sc, accOn(sc, menu)) : min; gm.t(s, mx + rh * 0.5, ry + rh / 2, { color: c, font: bodyF(env), size: rh * 0.44, track: 0.04 }); gm.t(keys[i], mx + mw2 - rh * 0.4, ry + rh / 2, { color: c, align: 'right', size: rh * 0.34, alpha: 0.7 }); });
      });
    }
    return bb;
  },
});

/* ================================================================== 24 xcRadio — ラジオ
   a transistor radio: the tuner needle slides along the dial and settles, knobs turn, the lyric shows in the window */
reg('xcRadio', {
  name: 'ラジオ', en: 'Transistor Radio', tags: ['calm', 'emotional', 'pop'], ae: 'labels', w: 0.9, fits: FIT,
  plan(rng, cut, st) { return { font: rng.pick(fontsOf(st, ['body', 'serif', 'display'])), c: rng.pick(['paper', 'accent', 'ink']), f: rng.range(0.2, 0.85), ant: rng.pick([-1, 1]), flip: rng.chance(0.4) }; },
  render(env) {
    const { W, H, sc, cut, Pm, lt, M, port, txt, out, lw, ls } = base(env);
    const bw = W * 0.88, bh = H * (port ? 0.66 : 0.72), x0 = (W - bw) / 2, y0 = (H - bh) / 2 + H * 0.035, m = Math.min(bw, bh);
    const body = pickPlate(sc, Pm.c), on = onCol(sc, body), dk = J.mix(body, on, 0.8), mid = J.mix(body, on, 0.3), ac = accOn(sc, dk);
    const e = inE(env, 0.5), g = G(env, inC(env, 0.2) * out);
    const fl = Pm.flip && !port, spw = bw * 0.27, rx0 = port ? x0 + bw * 0.06 : (fl ? x0 + bw * 0.04 : x0 + bw * 0.3), rw = port ? bw * 0.88 : bw * 0.66;
    const ty = y0 + bh * (port ? 0.06 : 0.09), thh = bh * (port ? 0.09 : 0.15), wy = ty + thh + bh * 0.04, wh = port ? bh * 0.42 : bh * 0.5;
    return pose(env, W / 2, H / 2, { dy: (1 - e) * H * 0.06 }, () => {
      const ae = inE(env, 0.6, 0.25), axp = x0 + bw * (Pm.ant > 0 ? 0.88 : 0.12);
      g.l(axp, y0 + 2, axp + Pm.ant * bw * 0.06 * ae, y0 - H * 0.085 * ae, mid, lw * 3); g.c(axp + Pm.ant * bw * 0.06 * ae, y0 - H * 0.085 * ae, lw * 4, mid);
      g.rr(x0, y0, bw, bh, m * 0.06, body);
      // tuner
      g.rr(rx0, ty, rw, thh, thh * 0.12, dk);
      const don = onCol(sc, dk);
      for (let i = 0; i <= 32; i++) { const x = rx0 + rw * (0.04 + 0.92 * i / 32), mj = i % 4 === 0; g.l(x, ty + thh * (mj ? 0.42 : 0.56), x, ty + thh * 0.8, don, lw * (mj ? 1.6 : 1), mj ? 0.9 : 0.5); if (mj && (!port || i % 8 === 0)) g.t(String(76 + i), x, ty + thh * 0.24, { color: don, align: 'center', size: Math.min(ls * 0.85, thh * 0.24), track: 0, alpha: 0.8 }); }
      const tk = J.clamp((lt - 0.15) / 0.9), nf = J.lerp(0.02, Pm.f, E.inOutCubic(tk)) + (tk < 1 ? Math.sin(tk * 30) * 0.03 * (1 - tk) : J.noise1(env.ltb * 1.5, cut.seed) * 0.004), nx = rx0 + rw * (0.04 + 0.92 * J.clamp(nf));
      g.r(nx - lw * 1.5, ty + thh * 0.06, lw * 3, thh * 0.88, ac);
      // window
      g.rr(rx0, wy, rw, wh, m * 0.02, dk); g.r(rx0 + lw * 4, wy + lw * 4, rw - lw * 8, wh - lw * 8, sc.bg, J.clamp((lt - 0.15) / 0.2));
      // speaker + knobs
      const scx = port ? x0 + bw * 0.27 : (fl ? x0 + bw * 0.84 : x0 + bw * 0.16), scy = port ? y0 + bh * 0.8 : y0 + bh * 0.5, sr = port ? Math.min(bh * 0.14, bw * 0.2) : Math.min(spw * 0.42, bh * 0.36), nd = 9, dp = sr * 2 / nd;
      for (let i = 0; i < nd; i++) for (let j = 0; j < nd; j++) { const dx = (i - (nd - 1) / 2) * dp, dy = (j - (nd - 1) / 2) * dp, d = Math.hypot(dx, dy); if (d > sr) continue; if (lt < 0.15 + d / sr * 0.25) continue; g.c(scx + dx, scy + dy, dp * 0.26 * (1 + (env.energy || 0) * 0.3), dk); }
      const ky = port ? y0 + bh * 0.8 : wy + wh + (y0 + bh - wy - wh) / 2, kr = port ? bh * 0.055 : Math.min((y0 + bh - wy - wh) * 0.3, bh * 0.07);
      [[port ? x0 + bw * 0.62 : rx0 + rw * 0.72, nf * 5, 'TUNE'], [port ? x0 + bw * 0.84 : rx0 + rw * 0.92, 0.8 + Math.sin(env.ltb * 0.7) * 0.2, 'VOL']].forEach(([kx, a, lab], i) => {
        g.c(kx, ky, kr * inB(env, 0.3, 0.2 + i * 0.08), dk); g.l(kx, ky, kx + Math.cos(a) * kr * 0.85, ky + Math.sin(a) * kr * 0.85, don, lw * 2.5);
        g.t(lab, kx - kr * 1.4, ky, { color: on, align: 'right', size: Math.min(ls * 0.85, kr * 0.5), alpha: 0.75 });
      });
      if (!port) { const sx = rx0 + rw * 0.02, swd = rw * 0.16; g.rr(sx, ky - kr * 0.42, swd, kr * 0.84, kr * 0.42, mid); g.rr(sx + (env.pOut > 0 ? 0 : swd * 0.5), ky - kr * 0.42, swd * 0.5, kr * 0.84, kr * 0.42, dk); g.t('AM  FM', sx + swd + kr * 0.4, ky, { color: on, size: Math.min(ls * 0.85, kr * 0.5), alpha: 0.75 }); }
      return fitMain(env, txt, Pm.font, rx0 + rw / 2, wy + wh / 2, rw * 0.88, wh * 0.76, sc.fg, null, port ? 4 : 3, wh * 0.5);
    });
  },
});

/* ================================================================== 25 xcFloppy — フロッピー
   a 3.5-inch floppy disk slides in, its metal shutter snaps across, and the lyric is on the paper label */
reg('xcFloppy', {
  name: 'フロッピー', en: 'Floppy Disk', tags: ['pop', 'graphic', 'glitch'], ae: 'labels', w: 0.8, treat: 'safe', fits: FIT,
  plan(rng, cut, st) { return { font: rng.pick(fontsOf(st, ['body', 'display'])), c: rng.pick(['ink', 'accent', 'ink']), tilt: rng.pick([0, -3, 3, 0]), from: rng.pick([-1, 1]), ruled: rng.chance(0.6) }; },
  render(env) {
    const { W, H, sc, cut, Pm, lt, M, port, txt, out, lw, ls, no } = base(env);
    const s = Math.min(W * 0.86, H * 0.84), x0 = (W - s) / 2, y0 = (H - s) / 2, cc = s * 0.07;
    const body = pickPlate(sc, Pm.c), on = onCol(sc, body), dk = J.mix(body, on, 0.22), metal = J.mix(body, on, 0.62), lab = J.mix(on, body, 0.06), ink = onCol(sc, lab), ac = accOn(sc, lab), faint = J.mix(lab, ink, 0.2);
    const e = inE(env, 0.5), g = G(env, J.clamp(lt / 0.12) * out);
    return pose(env, W / 2, H / 2, { dx: Pm.from * (1 - e) * W * 0.7, rot: Pm.tilt + Pm.from * (1 - e) * 8 }, () => {
      g.p([[x0, y0], [x0 + s - cc, y0], [x0 + s, y0 + cc], [x0 + s, y0 + s], [x0, y0 + s]], body);
      const sh = E.inOutCubic(J.clamp((lt - 0.4) / 0.3)), shx = x0 + s * (0.2 + 0.1 * sh), shw = s * 0.5, shh = s * 0.3;
      g.r(x0 + s * 0.18, y0, s * 0.64, shh * 1.02, dk);
      g.r(shx, y0, shw, shh, metal); g.r(shx + shw * 0.62, y0 + shh * 0.14, shw * 0.2, shh * 0.7, sh < 1 ? body : dk);
      g.r(x0 + s * 0.04, y0 + s * 0.9, s * 0.045, s * 0.055, dk); g.r(x0 + s * 0.915, y0 + s * 0.9, s * 0.045, s * 0.055, sc.bg, 0.9);
      const lx = x0 + s * 0.1, ly0 = y0 + s * 0.4, lw2 = s * 0.8, lh = s * 0.6;
      g.rr(lx, ly0, lw2, lh, s * 0.015, lab); g.r(lx, ly0, lw2, lh * 0.12, ac);
      g.t(`DISK ${pad2(no)}`, lx + lw2 * 0.04, ly0 + lh * 0.06, { color: onCol(sc, ac), size: lh * 0.05, track: 0.2 }); g.t('1.44MB', lx + lw2 * 0.96, ly0 + lh * 0.06, { color: onCol(sc, ac), align: 'right', size: lh * 0.05 });
      if (Pm.ruled) for (let i = 1; i <= 4; i++) g.l(lx + lw2 * 0.04, ly0 + lh * (0.12 + i * 0.2), lx + lw2 * (0.04 + 0.92 * inE(env, 0.5, 0.2 + i * 0.05)), ly0 + lh * (0.12 + i * 0.2), faint, lw);
      return fitMain(env, txt, Pm.font, W / 2, ly0 + lh * 0.55, lw2 * 0.88, lh * 0.72, ink, null, 3, lh * 0.42);
    });
  },
});

/* ================================================================== 26 xcMegaphone — 拡声器
   a megaphone in the corner shouts the lyric: sound arcs pulse out of it towards the big text */
reg('xcMegaphone', {
  name: '拡声器', en: 'Megaphone', tags: ['pop', 'graphic', 'emotional'], ae: 'center', w: 1.2, emph: 1.5, fits: FIT,
  plan(rng, cut, st) { return { font: rng.pick(fontsOf(st, ['display', 'display', 'body'])), side: rng.pick([-1, 1]), rot: rng.pick([0, -3, -5]), arcs: rng.int(3, 4), marks: rng.chance(0.6) }; },
  render(env) {
    const { W, H, sc, cut, Pm, lt, M, port, txt, out, lw, ls } = base(env);
    const sd = Pm.side, u = M * 0.135, mx = W / 2 - sd * W * (port ? 0.3 : 0.37), my = H * (port ? 0.82 : 0.8), ang = sd > 0 ? -32 : -148, ca = Math.cos(ang * J.DEG), sa = Math.sin(ang * J.DEG);
    const cone = paperOf(sc), ac = accOn(sc, sc.bg), dk = J.mix(sc.bg, sc.fg, 0.5), e = inB(env, 0.4, 0, 1.6), g = G(env, J.clamp(lt / 0.1) * out);
    const shake = Math.sin(env.ltb * 26) * 2.2 * env.fx.motion * (env.beat ? Math.max(0, 1 - env.beat.since * 4) : (env.step % 6 < 2 ? 1 : 0.2));
    if (e > 0) pose(env, mx, my, { rot: (sd > 0 ? -32 : 32) + shake, s: e, sx: sd }, () => {
      g.r(mx - u * 0.32, my + u * 0.1, u * 0.2, u * 0.62, dk); g.rr(mx - u * 0.84, my - u * 0.27, u * 0.4, u * 0.54, u * 0.08, ac);
      g.p([[mx - u * 0.5, my - u * 0.22], [mx + u * 0.72, my - u * 0.62], [mx + u * 0.72, my + u * 0.62], [mx - u * 0.5, my + u * 0.22]], cone);
      g.rr(mx + u * 0.68, my - u * 0.72, u * 0.16, u * 1.44, u * 0.06, ac);
    });
    const ox = mx + ca * u * 0.95, oy = my + sa * u * 0.95;
    for (let i = 0; i < Pm.arcs; i++) { const k = ((env.ltb * 0.9 + i / Pm.arcs) % 1 + 1) % 1; g.arc(ox, oy, u * (0.5 + k * 1.9), ang - 30, ang + 30, ac, u * 0.09 * (1 - k * 0.5), Math.sin(k * Math.PI) * J.clamp((lt - 0.2) / 0.2)); }
    const tcx = W / 2 + sd * W * (port ? 0 : 0.045), tcy = H * (port ? 0.4 : 0.37), tw = W * (port ? 0.86 : 0.78), thh = H * (port ? 0.46 : W < H * 1.5 ? 0.4 : 0.46);
    const o = { lead: 1.16, track: 0.02 }, f = fitBox(txt, Pm.font, tw, thh, o, port ? 4 : 3), size = Math.min(f.size, M * 0.34), it = Object.assign({ text: f.text, font: Pm.font, size, x: tcx, y: tcy, color: sc.fg, rot: Pm.rot * sd }, o);
    if (Pm.marks) { const m = J.measure(it), qx = tcx + sd * (m.w / 2 + size * 0.12), qy = tcy - m.h / 2 - size * 0.02; for (let i = 0; i < 3; i++) { const a = (-90 + sd * (10 + i * 28)) * J.DEG, ke = inE(env, 0.3, 0.3 + i * 0.05), r0 = size * 0.1, r1 = size * (0.1 + 0.22 * ke); if (Math.abs(qx + Math.cos(a) * r1 - W / 2) < W * 0.48 && qy + Math.sin(a) * r1 > H * 0.03) g.l(qx + Math.cos(a) * r0, qy + Math.sin(a) * r0, qx + Math.cos(a) * r1, qy + Math.sin(a) * r1, ac, Math.max(lw * 3, size * 0.035)); } }
    return J.mainDraw(env, it);
  },
});

/* ================================================================== 27 xcBunting — ガーランド
   party bunting: every glyph on its own pennant, hung along sagging strings and swaying */
reg('xcBunting', {
  name: 'ガーランド', en: 'Party Bunting', tags: ['pop', 'emotional', 'graphic'], ae: 'labels', w: 0.9, treat: 'safe', fits: n => n >= 2 && n <= 16,
  plan(rng, cut, st) { return { font: rng.pick(fontsOf(st, ['display', 'body'])), shape: rng.pick(['tri', 'tri', 'tail', 'sq']), c: rng.int(0, 2), mono: rng.chance(0.25) }; },
  render(env) {
    const { W, H, sc, cut, Pm, lt, M, port, txt, out, lw, ls } = base(env);
    const n = J.glyphCount(txt), maxPer = port ? 5 : 8, rows = Math.max(1, Math.ceil(n / maxPer));
    let lines = toLines(txt, rows).map(s => [...s.trim()]);
    if (lines.some(a => a.length > maxPer + 1)) lines = chunkRows(txt, maxPer);
    const R2 = lines.length, maxC = Math.max(...lines.map(a => a.length));
    const rowH = (H * 0.84) / R2, pitch = Math.min((W * 0.88) / (maxC + 0.4), rowH * 0.8 / 1.55, M * 0.3), fw = pitch * 0.88, tri = Pm.shape === 'tri', fh = pitch * (tri ? 1.25 : 1.12), sag = pitch * 0.3;
    const plates = [paperOf(sc), pickPlate(sc, 'accent'), pickPlate(sc, 'ink')], strc = J.mix(sc.bg, sc.fg, 0.55), g0 = G(env, out);
    let bb = null, gi = 0;
    lines.forEach((chs, r) => {
      const c = chs.length, half = (c * pitch) / 2 + pitch * 0.45, yT = H * 0.08 + r * rowH + (rowH - (sag + fh)) / 2;
      const ys = x => yT + sag * (1 - Math.pow((x - W / 2) / half, 2));
      const pts = []; for (let k = 0; k <= 24; k++) { const x = W / 2 - half + (2 * half * k) / 24; pts.push([x, ys(x)]); }
      if (out > 0) env.polyPartial(pts, inE(env, 0.5, r * 0.08), strc, lw * 2.5, out, false);
      chs.forEach((ch, i) => {
        if (isSp(ch)) return;
        const x = W / 2 + (i - (c - 1) / 2) * pitch, ya = ys(x), d = 0.1 + r * 0.08 + i * 0.035, fe = inB(env, 0.4, d, 1.6), plate = plates[Pm.mono ? Pm.c : (gi + Pm.c) % 3], ink = onCol(sc, plate), g = G(env, J.clamp((lt - d) / 0.08) * out), my = gi++;
        const slope = Math.atan2(ys(x + 1) - ys(x - 1), 2) / J.DEG;
        const b = pose(env, x, ya, { rot: slope * 0.6 + Math.sin(env.ltb * 1.7 + i * 0.8 + r) * 3.5 * env.fx.motion, sy: Math.max(0.02, fe) }, () => {
          if (tri) g.p([[x - fw / 2, ya], [x + fw / 2, ya], [x, ya + fh]], plate);
          else if (Pm.shape === 'tail') g.p([[x - fw / 2, ya], [x + fw / 2, ya], [x + fw / 2, ya + fh], [x, ya + fh * 0.8], [x - fw / 2, ya + fh]], plate);
          else g.r(x - fw / 2, ya, fw, fh * 0.92, plate);
          return J.mainDraw(env, { text: ch, font: Pm.font, size: fw * (tri ? 0.5 : 0.66), x, y: ya + fh * (tri ? 0.31 : 0.42), color: ink, mi: my });
        });
        bb = J.unionBB(bb, b);
      });
    });
    return bb;
  },
});

/* ================================================================== 28 xcDrawers — 引き出し
   a filing cabinet: drawers slide shut one by one, each line of the lyric in a drawer's label holder */
reg('xcDrawers', {
  name: '引き出し', en: 'Filing Drawers', tags: ['editorial', 'calm', 'graphic'], ae: 'stack', w: 0.9, treat: 'safe', fits: FIT,
  plan(rng, cut, st) { return { font: rng.pick(fontsOf(st, ['body', 'serif', 'display'])), c: rng.pick(['ink', 'accent', 'paper']), handle: rng.pick(['bar', 'cup']), pull: rng.int(0, 2) }; },
  render(env) {
    const { W, H, sc, cut, Pm, lt, M, port, txt, out, lw, ls, no } = base(env);
    const n = J.glyphCount(txt), L = port ? (n <= 3 ? 1 : n <= 8 ? 2 : n <= 12 ? 3 : 4) : (n <= 6 ? 1 : n <= 11 ? 2 : 3);
    const lines = toLines(txt, L), k = lines.length, T = Math.max(3, k), first = Math.floor((T - k) / 2), o = { track: 0.03 };
    const cw = W * (port ? 0.86 : 0.72), ch = H * 0.86, x0 = (W - cw) / 2, y0 = (H - ch) / 2, pd = M * 0.022, dh = (ch - pd * (T + 1)) / T, dwd = cw - pd * 2;
    const body = pickPlate(sc, Pm.c), on = onCol(sc, body), front = J.mix(body, on, 0.1), metal = J.mix(body, on, 0.55), lab = J.mix(on, body, 0.05), ink = onCol(sc, lab), faint = J.mix(lab, ink, 0.25);
    const size = Math.min(...lines.map(s => J.fitSize(s, Pm.font, dwd * 0.78, dh * 0.5, o)), dh * 0.5);
    const g0 = G(env, inC(env, 0.2) * out);
    g0.rr(x0, y0, cw, ch, M * 0.015, body);
    let bb = null;
    for (let i = 0; i < T; i++) {
      const li = i - first, has = li >= 0 && li < k, d = 0.08 + i * 0.09, e = inE(env, 0.45, d), g = G(env, J.clamp((lt - d) / 0.1) * out), dy0 = y0 + pd + i * (dh + pd), cx = W / 2, cy = dy0 + dh / 2;
      const pulled = has && (li === Pm.pull % k), sc2 = 1 + (1 - e) * 0.12 + (pulled ? 0.025 : 0);
      const b = pose(env, cx, cy, { s: sc2 }, () => {
        if (pulled || e < 1) g.r(x0 + pd + M * 0.006, dy0 + M * 0.01, dwd, dh, sc.dim, 0.7);
        g.r(x0 + pd, dy0, dwd, dh, front); g.rs(x0 + pd, dy0, dwd, dh, 0, on, lw, 0.35);
        const tw = has ? J.measure(Object.assign({ text: lines[li], font: Pm.font, size }, o)).w : dwd * 0.2, hw = Math.max(tw + size * 1.1, dwd * 0.24), hh = Math.max(size * 1.5, dh * 0.3), hy = dy0 + dh * 0.42 - hh / 2;
        g.r(cx - hw / 2, hy, hw, hh, lab); g.rs(cx - hw / 2, hy, hw, hh, 0, metal, Math.max(lw * 2, dh * 0.02));
        const ky = dy0 + dh * 0.86, kw = Math.min(dwd * 0.16, dh * 0.9);
        if (Pm.handle === 'bar') g.rr(cx - kw / 2, ky - dh * 0.03, kw, dh * 0.06, dh * 0.03, metal); else g.arc(cx, ky - dh * 0.05, kw * 0.3, 10, 170, metal, dh * 0.05);
        if (!has) { g.r(cx - hw * 0.3, hy + hh / 2 - hh * 0.08, hw * 0.6, hh * 0.16, faint, 1.5); return null; }
        return J.mainDraw(env, Object.assign({ text: lines[li], font: Pm.font, size, x: cx, y: hy + hh / 2, color: ink, mi: li }, o));
      });
      bb = J.unionBB(bb, b);
    }
    return bb;
  },
});

/* ================================================================== 29 xcPoll — アンケート
   a poll card: the lyric is the question, the option bars fill and their percentages count up, the winner lights */
reg('xcPoll', {
  name: 'アンケート', en: 'Poll Card', tags: ['pop', 'editorial', 'graphic'], ae: 'gloss', w: 1, treat: 'safe', fits: FIT,
  plan(rng, cut, st) { return { font: rng.pick(fontsOf(st, ['body', 'display'])), n: rng.int(2, 3), card: rng.chance(0.65), p: [rng.range(0.2, 1), rng.range(0.2, 1), rng.range(0.2, 1)], votes: rng.int(120, 9800) }; },
  render(env) {
    const { W, H, sc, cut, Pm, lt, M, port, txt, out, lw, ls } = base(env);
    const cw = W * 0.86, ch = H * (port ? 0.76 : 0.84), x0 = (W - cw) / 2, y0 = (H - ch) / 2;
    const win = Pm.card ? paperOf(sc) : sc.bg, ink = Pm.card ? onCol(sc, win) : sc.fg, faint = J.mix(win, ink, 0.14), ac = accOn(sc, win), mid = J.mix(win, ink, 0.4);
    const e = inE(env, 0.45), g = G(env, inC(env, 0.2) * out), no = Pm.n, ps = Pm.p.slice(0, no), tot = ps.reduce((a, b) => a + b, 0), win2 = ps.indexOf(Math.max(...ps));
    if (Pm.card) g.rr(x0, y0 + (1 - e) * M * 0.04, cw, ch, M * 0.035, win);
    const oy0 = y0 + ch * (port ? 0.48 : 0.5), oh = (ch * (port ? 0.4 : 0.38)) / no, bx = x0 + cw * 0.07, bw = cw * 0.86, bh = Math.min(oh * 0.7, M * 0.11);
    for (let i = 0; i < no; i++) {
      const by = oy0 + i * oh, d = 0.3 + i * 0.1, fe = E.outCubic(J.clamp((lt - d) / 0.7)), pct = ps[i] / tot, isW = i === win2, fc = isW ? ac : mid, be = inE(env, 0.4, 0.15 + i * 0.07);
      g.rr(bx, by, bw * be, bh, bh * 0.22, faint);
      g.rr(bx, by, Math.max(bh * 0.44, bw * pct * fe) * (be > 0 ? 1 : 0), bh, bh * 0.22, fc, J.clamp((lt - d) / 0.1));
      const on = pct * fe * bw > bw * 0.3 ? onCol(sc, fc) : ink;
      g.r(bx + bh * 0.4, by + bh / 2 - bh * 0.09, bw * (0.12 + 0.1 * J.r(cut.seed, i, 3)) * be, bh * 0.18, on, 0.85);
      g.t(`${Math.round(pct * fe * 100)}%`, bx + bw - bh * 0.35, by + bh / 2, { color: ink, align: 'right', size: bh * 0.36, track: 0.02, alpha: J.clamp((lt - d) / 0.15) });
      if (isW && fe >= 1) { const kx = bx + bw * pct - bh * 0.5, ku = bh * 0.15, kc = onCol(sc, fc); if (pct > 0.34) g.pl([[kx - ku, by + bh / 2], [kx - ku * 0.2, by + bh / 2 + ku * 0.8], [kx + ku * 1.1, by + bh / 2 - ku * 0.9]], kc, lw * 3); }
    }
    g.t(`${Math.round(Pm.votes * E.outCubic(J.clamp((lt - 0.3) / 0.9))).toLocaleString('en-US')} VOTES`, bx, y0 + ch * 0.94, { color: ink, size: ls, alpha: 0.7 * inC(env, 0.3, 0.3) });
    g.t(`${1 + J.h(cut.seed, 2) % 23}H LEFT`, bx + bw, y0 + ch * 0.94, { color: ink, align: 'right', size: ls, alpha: 0.7 * inC(env, 0.3, 0.3) });
    g.t('Q.', bx, y0 + ch * 0.075, { color: ac, size: ls * 1.5, track: 0, alpha: inC(env, 0.3, 0.2) });
    return fitMain(env, txt, Pm.font, W / 2, y0 + ch * (port ? 0.27 : 0.28), bw, ch * (port ? 0.3 : 0.32), ink, null, port ? 4 : 2, ch * 0.2);
  },
});

/* ================================================================== 30 xcAwning — 店先テント
   a shop front: the striped awning rolls out and the lyric is lettered on the window underneath */
reg('xcAwning', {
  name: '店先テント', en: 'Shop Awning', tags: ['pop', 'calm', 'emotional'], ae: 'center', w: 1, fits: FIT,
  plan(rng, cut, st) { return { font: rng.pick(fontsOf(st, ['display', 'serif', 'body'])), ns: rng.pick([7, 9, 11]), sign: rng.pick(['OPEN', 'OPEN', 'CLOSED']), glass: rng.chance(0.6), c: rng.int(0, 1) }; },
  render(env) {
    const { W, H, sc, cut, Pm, lt, M, port, txt, out, lw, ls } = base(env);
    const sw = W * (port ? 0.9 : 0.84), x0 = (W - sw) / 2, y0 = H * (port ? 0.12 : 0.08), ah = H * (port ? 0.1 : 0.17), ns = port ? Math.min(7, Pm.ns) : Pm.ns;
    const a = pickPlate(sc, 'accent'), b = paperOf(sc), cols = Pm.c ? [a, J.contrast(a, b) < 1.4 ? J.mix(b, onCol(sc, b), 0.8) : b] : [J.contrast(a, b) < 1.4 ? J.mix(b, onCol(sc, b), 0.8) : b, a];
    const wood = J.mix(sc.bg, sc.fg, 0.5), g = G(env, inC(env, 0.2) * out), ae = inE(env, 0.6, 0.05);
    // window
    const wx = x0 + sw * 0.04, ww = sw * 0.92, wy = y0 + ah * 0.55, wb = H * (port ? 0.88 : 0.92), wh = wb - wy, fr = M * 0.012, we = inE(env, 0.5);
    g.rs(wx, wy, ww, wh * we, 0, wood, fr); g.r(wx - fr * 1.5, wy + wh * we, ww + fr * 3, fr * 1.6, wood);
    if (Pm.glass) for (let i = 0; i < 2; i++) { const gx = wx + ww * (0.06 + i * 0.035), gy = wy + ah * 0.75 + wh * 0.05; g.l(gx + wh * 0.1, gy, gx, gy + wh * 0.1, sc.sub, lw * 2, 0.5 * inC(env, 0.4, 0.4)); }
    const fy = wy + wh * 0.9, la = inC(env, 0.3, 0.45);
    g.l(wx + ww * 0.04, wy + wh * 0.82, wx + ww * (0.04 + 0.92 * inE(env, 0.5, 0.3)), wy + wh * 0.82, sc.sub, lw, 0.6);
    const tg = accOn(sc, sc.bg), tw2 = Math.min(ww * 0.2, M * 0.2), th2 = wh * 0.085;
    g.rr(wx + ww * 0.04, fy - th2 / 2, tw2, th2, th2 * 0.2, tg, la); g.t(Pm.sign, wx + ww * 0.04 + tw2 / 2, fy, { color: onCol(sc, tg), align: 'center', size: Math.min(th2 * 0.5, tw2 * 0.16), track: 0.2, alpha: la });
    g.t(`${10 + J.h(cut.seed, 2) % 3}:00 - ${19 + J.h(cut.seed, 3) % 4}:00`, wx + ww * 0.96, fy, { color: sc.sub, align: 'right', size: ls, alpha: la });
    // awning
    const tw = sw * 0.9, st = sw / ns, hh = ah * ae;
    for (let i = 0; i < ns; i++) {
      const c = cols[i % 2], xt0 = x0 + (sw - tw) / 2 + (tw / ns) * i, xt1 = xt0 + tw / ns, xb0 = x0 + st * i, xb1 = xb0 + st;
      g.p([[xt0, y0], [xt1 + 0.5, y0], [xb1 + 0.5, y0 + hh], [xb0, y0 + hh]], c); g.c((xb0 + xb1) / 2, y0 + hh - 0.5, st / 2 * Math.min(1, ae * 1.5), c);
    }
    g.r(x0 + (sw - tw) / 2 - fr, y0 - fr * 1.2, tw + fr * 2, fr * 1.4, wood);
    const ty0 = y0 + ah + st / 2 + wh * 0.02, ty1 = wy + wh * 0.8;
    return fitMain(env, txt, Pm.font, W / 2, (ty0 + ty1) / 2, ww * 0.86, (ty1 - ty0) * 0.86, sc.fg, null, port ? 4 : 3, wh * 0.36);
  },
});

})();
