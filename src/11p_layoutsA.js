/* JIZURA pack: layoutsA — 28 compositional layouts: telops, editorial typesetting, graphic devices and UI mock-ups */
(() => {
'use strict';
const E = J.E;
const P = 'layoutsA';
const reg = (key, def) => J.register('layout', key, def, P);

/* ---------------------------------------------------------------- helpers */
const U = env => Math.min(env.W, env.H);
const isPort = env => env.H > env.W * 1.08;
const strip = t => String(t || '').replace(/\s+/g, '');
const pad2 = n => String(n).padStart(2, '0');
const lineNo = env => pad2(Math.max(0, env.cut.line | 0) + 1);
const bodyF = env => (env.st.fonts.body && env.st.fonts.body[0]) || 'gothic_med';
const monoF = env => (env.st.fonts.mono && env.st.fonts.mono[0]) || 'mono';
const fontsOf = (st, roles) => J.fontsOf(st, roles);
const tin = (env, d = 0, len = 0.4, ease = E.outExpo) => ease(J.clamp((env.lt - d) / Math.max(0.01, len)));
const tout = env => 1 - E.inCubic(env.pOut);
const meas = (text, font, size, o) => J.measure(Object.assign({ text, font, size }, o || {}));
const box = (x0, y0, x1, y1) => ({ x0, y0, x1, y1, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, boxes: [] });
const smallSize = env => J.clamp(U(env) * 0.024, 14, 34);
const romajiOf = env => { if (/[A-Za-z]/.test(env.cut.text)) return null; const r = J.romaji(strip(env.cut.text)); return r ? r.toUpperCase() : null; };
const hasLatin = t => /[A-Za-z]/.test(t);
/* text as one run: latin keeps single word spaces, Japanese drops them */
const flat = t => (hasLatin(t) ? String(t || '').trim().replace(/\s+/g, ' ') : strip(t));
/* readable text colour on a plate, preferring the scheme's bg / fg */
const onCol = (sc, plate) => {
  const a = J.contrast(sc.bg, plate), b = J.contrast(sc.fg, plate);
  if (Math.max(a, b) >= 2.4) return a >= b ? sc.bg : sc.fg;
  return J.lum(plate) > 0.5 ? '#111111' : '#FFFFFF';
};
/* secondary line of copy: lineText when it differs, otherwise romaji / note */
const altCopy = env => {
  const c = env.cut;
  if (c.lineText && strip(c.lineText) !== strip(c.text)) return c.lineText;
  return c.note || romajiOf(env) || 'No.' + lineNo(env);
};
const isBad = c => J.isSmallKana(c) || J.isPunct(c) || c === 'ー' || c === ' ';

/* split text into k balanced chunks: word chunks first; long chunks are cut at the most natural boundary */
function segBounds(t) {
  const out = new Set(); let i = 0;
  try { for (const sg of (J.segments ? J.segments(t) : [t])) { i += [...sg].length; out.add(i); } } catch (e) {}
  return out;
}
function split2(word, force) {
  const chars = [...word], n = chars.length, sb = segBounds(word);
  let best = Math.max(1, Math.floor(n / 2)), bs = -1e9;
  for (let c = 1; c < n; c++) {
    const a = chars[c - 1], b = chars[c];
    if (!force && ((c === 1 && !J.isKanji(a)) || (c === n - 1 && !J.isKanji(b)))) continue;   // never leave a lone kana
    let s = -Math.abs(c - n / 2) * 0.9;
    if (a === ' ' || a === '\u3000' || (J.isPunct(a) && a !== '\u30fc')) s += 5;
    if (J.isHira(a) && !J.isHira(b) && !isBad(b)) s += 3;
    if (sb.has(c)) s += 2;
    if (isBad(b)) s -= 6;
    if (J.isKanji(a) && J.isKanji(b)) s -= 2;
    if (J.isKanji(a) && J.isHira(b)) s -= sb.has(c) ? 0.5 : 2.5;
    if (J.isHira(a) && J.isHira(b) && !sb.has(c)) s -= 2.5;
    if (s > bs) { bs = s; best = c; }
  }
  if (!force && bs < -1.5 && !hasLatin(word)) return [word];
  return [chars.slice(0, best).join('').trim(), chars.slice(best).join('').trim()].filter(Boolean);
}
function splitK(text, k, force) {
  const t = String(text || '').trim();
  if (!t) return [''];
  const latin = hasLatin(t);
  let words = latin ? t.split(/\s+/).filter(Boolean) : (J.chunkText ? J.chunkText(t) : [t]).map(w => w.trim()).filter(Boolean);
  if (!words.length) words = [t];
  k = Math.max(1, Math.min(k, J.glyphCount(t)));
  const hard = new Set();
  for (let guard = 0; words.length < k && guard < 16; guard++) {
    let bi = -1, bl = 1;
    words.forEach((w, i) => { const l = J.glyphCount(w); if (l > bl && !hard.has(w)) { bl = l; bi = i; } });
    if (bi < 0) break;
    let parts = latin ? [words[bi]] : split2(words[bi]);
    if (parts.length < 2 && force && words.length < force) parts = split2(words[bi], true);
    if (parts.length < 2) { hard.add(words[bi]); continue; }
    words.splice(bi, 1, ...parts);
  }
  if (k <= 1) return [words.join(latin ? ' ' : '')];
  if (words.length <= k) return words;
  const part = ws => {
    const lens = ws.map(w => J.glyphCount(w) + 0.5);
    const pre = [0]; lens.forEach(l => pre.push(pre[pre.length - 1] + l));
    const n = ws.length, tgt = pre[n] / k;
    let best = null, bestS = Infinity, guard = 0;
    const rec = (start, g, cuts) => {
      if (++guard > 5000) return;
      if (g === k - 1) {
        let s = 0, prev = 0;
        for (const c of [...cuts, n]) { const d = pre[c] - pre[prev] - tgt; s += d * d; prev = c; }
        if (s < bestS) { bestS = s; best = [...cuts, n]; }
        return;
      }
      for (let c = start + 1; c <= n - (k - 1 - g); c++) rec(c, g + 1, [...cuts, c]);
    };
    rec(0, 0, []);
    if (!best) return ws.map(w => [w]);
    const out = []; let prev = 0;
    for (const c of best) { out.push(ws.slice(prev, c)); prev = c; }
    return out;
  };
  let groups = part(words);
  // rebalance: split the longest word of an oversized group and re-partition
  for (let it = 0; it < 3; it++) {
    const gl = groups.map(g => g.reduce((a, w) => a + J.glyphCount(w), 0));
    const mx = Math.max(...gl), mn = Math.min(...gl);
    if (mx <= mn * 1.7 + 1) break;
    const g = groups[gl.indexOf(mx)];
    let bw = null; g.forEach(w => { if (!hard.has(w) && J.glyphCount(w) >= 3 && (!bw || J.glyphCount(w) > J.glyphCount(bw))) bw = w; });
    if (!bw) break;
    const parts = latin ? [bw] : split2(bw);
    if (parts.length < 2) { hard.add(bw); continue; }
    const wi = words.indexOf(bw); words.splice(wi, 1, ...parts);
    groups = part(words);
  }
  return groups.map(g => g.join(latin ? ' ' : ''));
}

/* single glyphs, with small kana / punctuation / ー kept on the preceding glyph */
const charUnits = text => {
  const out = [];
  for (const ch of strip(text)) { if (out.length && isBad(ch)) out[out.length - 1] += ch; else out.push(ch); }
  return out;
};

/* line breaking for display: balanced, at chunk boundaries */
const brk = (text, maxPer) => {
  const t = String(text || '').trim(), n = J.glyphCount(t);
  if (n <= maxPer) return t;
  return splitK(t, Math.ceil(n / maxPer)).join('\n');
};

/* draw several polylines progressively (e 0..1 over their total length) */
function segsPartial(env, segs, e, col, lw, a = 1, ghost = false) {
  if (e <= 0) return;
  const lens = segs.map(s => { let L = 0; for (let i = 1; i < s.length; i++) L += Math.hypot(s[i][0] - s[i - 1][0], s[i][1] - s[i - 1][1]); return L; });
  const tot = lens.reduce((x, y) => x + y, 0) || 1;
  let rem = tot * J.clamp(e);
  for (let i = 0; i < segs.length && rem > 0; i++) {
    const k = Math.min(1, rem / Math.max(1e-6, lens[i]));
    env.polyPartial(segs[i], k, col, lw, a, ghost);
    rem -= lens[i];
  }
}
/* dashed straight line (main pass only) */
function dash(env, x0, y0, x1, y1, d, g, col, lw, a = 1) {
  const L = Math.hypot(x1 - x0, y1 - y0); if (L < 1) return;
  const n = Math.min(400, Math.ceil(L / (d + g)));
  const ux = (x1 - x0) / L, uy = (y1 - y0) / L;
  for (let i = 0; i < n; i++) {
    const s = i * (d + g), t = Math.min(L, s + d);
    env.line([[x0 + ux * s, y0 + uy * s], [x0 + ux * t, y0 + uy * t]], col, lw, a, false);
  }
}
const closeLoop = pts => pts.concat([pts[0], pts[1]]);
/* one-call text row for dense secondary copy (main pass only); sp = extra px after each glyph */
function fastRow(env, text, font, size, x, y, sp, color, alpha, align = 'left') {
  if (env.pass !== 'main' || alpha <= 0.01 || !text) return;
  const ctx = env.ctx;
  if (!('letterSpacing' in ctx)) { env.draw({ text, font, size, x, y, align, track: sp / size, color, alpha, ghost: false }); return; }
  ctx.save();
  ctx.font = J.fontCSS(font, size); ctx.letterSpacing = sp.toFixed(2) + 'px';
  ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.fillStyle = color; ctx.globalAlpha = alpha;
  ctx.fillText(text, x, y);
  ctx.restore();
}
/* per-layout memo for expensive fitting searches (dropped when font metrics are reset after font loading) */
const MEMO = new Map(), SENT = '\u0001layoutsA';
function memo(key, fn) {
  const mm = J.metrics && J.metrics.m;
  if (mm && !mm.has(SENT)) { MEMO.clear(); mm.set(SENT, 1); }
  let v = MEMO.get(key);
  if (v === undefined) { v = fn(); if (MEMO.size > 400) MEMO.clear(); MEMO.set(key, v); }
  return v;
}
let _ic = null;
/* glyph ink bounds in em, relative to the centred / middle anchor drawItem uses */
const inkBox = (font, ch) => memo('ink|' + font + '|' + ch, () => {
  try { if (!_ic) _ic = document.createElement('canvas').getContext('2d'); } catch (e) { _ic = null; }
  if (!_ic || !_ic.measureText) return { l: -0.4, r: 0.4, t: -0.45, b: 0.45 };
  _ic.font = J.fontCSS(font, 100); _ic.textAlign = 'center'; _ic.textBaseline = 'middle';
  const mm = _ic.measureText(ch);
  if (!(mm.actualBoundingBoxRight > -1e6) || !(mm.actualBoundingBoxAscent > -1e6)) return { l: -0.4, r: 0.4, t: -0.45, b: 0.45 };
  return { l: -mm.actualBoundingBoxLeft / 100, r: mm.actualBoundingBoxRight / 100, t: -mm.actualBoundingBoxAscent / 100, b: mm.actualBoundingBoxDescent / 100 };
});
const rowW = (text, font, size) => { let w = 0; for (const ch of text) w += J.metrics.adv(font, ch) * size; return w; };

/* ======================================================================
   1  lowerThird — 下部テロップ
   ====================================================================== */
reg('lowerThird', {
  name: '下部テロップ', tags: ['editorial', 'calm', 'emotional'], w: 1.1, fits: n => n <= 20, portrait: 0.9,
  plan: (rng, cut, st) => ({ font: rng.pick(fontsOf(st, ['display', 'display', 'serif'])), side: rng.pick(['left', 'left', 'right']), bar: rng.pick(['line', 'tab', 'line']), label: rng.pick(['romaji', 'no', 'copy']), lift: rng.range(0, 0.04) }),
  render(env) {
    const { W, H, sc } = env, p = env.cut.params, u = U(env), port = isPort(env);
    const t0 = env.cut.text.trim(), n = J.glyphCount(t0);
    const text = port ? brk(t0, 6) : n > 13 ? brk(t0, Math.ceil(n / 2)) : t0;
    const o = { track: 0.03, lead: 1.14 };
    const size = Math.min(J.fitSize(text, p.font, W * 0.84, H * (port ? 0.24 : 0.3), o), u * (port ? 0.17 : 0.14));
    const m = meas(text, p.font, size, o);
    const left = p.side !== 'right';
    const mx = W * 0.07;
    const barY = H * ((port ? 0.8 : 0.83) - p.lift);
    const th = Math.max(3, size * 0.055);
    const cy = barY - size * 0.24 - m.h / 2;
    const x = left ? mx : W - mx;
    // accent bar from the screen edge to just past the text; retracts to the edge on exit
    const reach = mx + m.w + size * 0.45;
    const L = reach * tin(env, 0, 0.55) * (1 - E.inCubic(env.pOut));
    if (L > 1) {
      env.rect(left ? 0 : W - L, barY, L, th, sc.accent, 1, true);
      const sq = th * 2.6, ex = left ? L : W - L;
      env.rect(ex - sq / 2, barY + th / 2 - sq / 2, sq, sq, sc.accent, 1, true);
    }
    // label above the lyric
    const ls = smallSize(env);
    const la = tin(env, 0.12, 0.4, E.outCubic) * tout(env);
    if (la > 0.01) {
      const ly = cy - m.h / 2 - size * 0.22 - ls * 0.7;
      const sl = (1 - la) * ls * 2 * (left ? -1 : 1);
      const tag = pad2(Math.max(0, env.cut.line | 0) + 1);
      let copy = p.label === 'romaji' ? (romajiOf(env) || altCopy(env)) : p.label === 'no' ? 'LINE ' + tag : altCopy(env);
      if (/^No\./.test(copy)) copy = J.fmtTime(env.cut.start);
      const tm = meas(tag, monoF(env), ls, { track: 0.1 });
      let cx = x + sl;
      if (p.bar === 'tab') {
        const tw = tm.w + ls * 1.1, th2 = ls * 1.6;
        env.rect(left ? cx : cx - tw, ly - th2 / 2, tw, th2, sc.ink, la, false);
        env.draw({ text: tag, font: monoF(env), size: ls, track: 0.1, x: left ? cx + tw / 2 : cx - tw / 2, y: ly, color: onCol(sc, sc.ink), alpha: la, ghost: false });
        cx += (tw + ls * 0.7) * (left ? 1 : -1);
      } else {
        const q = ls * 0.55;
        env.rect(left ? cx : cx - q, ly - q / 2, q, q, sc.accent, la, false);
        cx += (q + ls * 0.6) * (left ? 1 : -1);
        env.draw({ text: tag, font: monoF(env), size: ls, track: 0.1, align: left ? 'left' : 'right', x: cx, y: ly, color: sc.fg, alpha: la, ghost: false });
        cx += (tm.w + ls * 0.8) * (left ? 1 : -1);
      }
      env.draw({ text: copy, font: p.label === 'copy' ? bodyF(env) : monoF(env), size: ls, track: 0.12, align: left ? 'left' : 'right', x: cx, y: ly, color: sc.sub, alpha: la, ghost: false });
    }
    const bb = J.mainDraw(env, { text, font: p.font, size, x, y: cy, align: left ? 'left' : 'right', track: 0.03, lead: 1.14, color: sc.fg });
    return bb || box(left ? x : x - m.w, cy - m.h / 2, left ? x + m.w : x, cy + m.h / 2);
  },
});

/* ======================================================================
   2  corners — 対角配置
   ====================================================================== */
reg('corners', {
  name: '対角配置', tags: ['graphic', 'editorial', 'calm'], w: 1, fits: n => n >= 2 && n <= 18,
  plan: (rng, cut, st) => ({ chunks: splitK(cut.text, 2, 2), font: rng.pick(fontsOf(st, ['display', 'serif'])), diag: rng.pick(['main', 'main', 'anti']), link: rng.pick(['elbow', 'straight', 'elbow']), ratio: rng.pick([1, 1, 0.76]) }),
  render(env) {
    const { W, H, sc } = env, p = env.cut.params, u = U(env), port = isPort(env);
    let ch = p.chunks && p.chunks.length ? p.chunks : splitK(env.cut.text, 2, 2);
    if (ch.length < 2) ch = splitK(env.cut.text, 2, 2);
    const A0 = ch[0], B0 = ch.length > 1 ? ch.slice(1).join(hasLatin(ch[0]) ? ' ' : '') : '';
    const maxPer = port ? 5 : 9;
    const A = brk(A0, maxPer), B = B0 ? brk(B0, maxPer) : '';
    const o = { track: 0.02, lead: 1.1 };
    const bw = W * (port ? 0.84 : 0.58), bh = H * (port ? 0.24 : 0.3);
    const ratio = p.ratio || 1;
    const s = Math.min(J.fitSize(A, p.font, bw, bh, o), B ? J.fitSize(B, p.font, bw, bh, o) / ratio : 1e9, u * 0.22);
    const sA = s, sB = s * ratio;
    const mA = meas(A, p.font, sA, o), mB = B ? meas(B, p.font, sB, o) : { w: 0, h: 0 };
    const mx = W * 0.075, my = H * (port ? 0.15 : 0.13);
    const aL = p.diag !== 'anti';
    const ax = aL ? mx : W - mx, ay = my + mA.h / 2;
    const bx = aL ? W - mx : mx, by = H - my - mB.h / 2;
    const Ab = box(aL ? ax : ax - mA.w, ay - mA.h / 2, aL ? ax + mA.w : ax, ay + mA.h / 2);
    const Bb = box(aL ? bx - mB.w : bx, by - mB.h / 2, aL ? bx : bx + mB.w, by + mB.h / 2);
    // connector
    const g = u * 0.028;
    let pts;
    if (p.link === 'elbow') {
      const xb = aL ? Bb.x0 + sB * 0.5 : Bb.x1 - sB * 0.5;
      const clear = aL ? xb > Ab.x1 + g * 2 : xb < Ab.x0 - g * 2;
      if (clear) pts = [[aL ? Ab.x1 + g : Ab.x0 - g, Ab.cy], [xb, Ab.cy], [xb, Bb.y0 - g]];
      else { const xm = aL ? Math.max(Ab.x0, Bb.x0) + sB * 0.5 : Math.min(Ab.x1, Bb.x1) - sB * 0.5; pts = [[xm, Ab.y1 + g], [xm, Bb.y0 - g]]; }
    } else pts = [[aL ? Ab.x1 : Ab.x0, Ab.y1 + g], [aL ? Bb.x0 : Bb.x1, Bb.y0 - g]];
    const e = tin(env, env.cut.inDur * 0.5, 0.55, E.inOutCubic) * (1 - E.inCubic(env.pOut));
    const lw = Math.max(1.5, u * 0.0022);
    if (e > 0) {
      env.polyPartial(pts, e, sc.sub, lw, 1, false);
      const a0 = pts[0];
      env.circle(a0[0], a0[1], u * 0.007, sc.bg, sc.sub, lw, Math.min(1, e * 4), false);
      if (e > 0.97) { const z = pts[pts.length - 1]; env.circle(z[0], z[1], u * 0.007, sc.accent, null, 0, 1, false); }
      // small caption on the longest segment
      let bi = 0, bl = 0;
      for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); if (l > bl) { bl = l; bi = i; } }
      const q0 = pts[bi - 1], q1 = pts[bi];
      const ls = smallSize(env) * 0.9;
      const horiz = Math.abs(q1[1] - q0[1]) < Math.abs(q1[0] - q0[0]) * 0.3;
      const mxp = (q0[0] + q1[0]) / 2, myp = (q0[1] + q1[1]) / 2;
      const ca = J.clamp((e - 0.5) * 3);
      const cap = 'No.' + lineNo(env) + '  ' + (romajiOf(env) || '');
      if (ca > 0 && bl > ls * 8) {
        if (horiz) env.draw({ text: cap.trim(), font: monoF(env), size: ls, track: 0.1, x: mxp, y: myp - ls * 1.1, color: sc.sub, alpha: ca, ghost: false });
        else env.draw({ text: cap.trim(), font: monoF(env), size: ls, track: 0.1, align: aL ? 'left' : 'right', x: mxp + (aL ? ls * 0.8 : -ls * 0.8) * (p.link === 'straight' ? -1 : 1), y: myp, color: sc.sub, alpha: ca, ghost: false });
      }
    }
    const nA = J.glyphCount(A0);
    let bb = J.mainDraw(env, { text: A, font: p.font, size: sA, x: ax, y: ay, align: aL ? 'left' : 'right', track: 0.02, lead: 1.1, color: sc.fg, mi: 0 });
    if (B) bb = J.unionBB(bb, J.mainDraw(env, { text: B, font: p.font, size: sB, x: bx, y: by, align: aL ? 'right' : 'left', track: 0.02, lead: 1.1, color: sc.fg, mi: Math.min(8, nA + 2) }));
    return bb || box(Math.min(Ab.x0, Bb.x0), Ab.y0, Math.max(Ab.x1, Bb.x1), Bb.y1);
  },
});

/* ======================================================================
   3  staircase — 階段
   ====================================================================== */
reg('staircase', {
  name: '階段', tags: ['graphic', 'pop', 'editorial'], w: 1, fits: n => n >= 2 && n <= 18,
  plan: (rng, cut, st) => {
    const port = cut.H > cut.W * 1.08, n = cut.n;
    const latin = /[A-Za-z]/.test(cut.text);
    const units = latin ? splitK(cut.text, port ? 6 : 4)
      : port ? (n <= 9 ? charUnits(cut.text) : splitK(cut.text, Math.min(6, Math.ceil(n / 2.6))))
      : (n <= 6 ? charUnits(cut.text) : splitK(cut.text, n <= 10 ? 3 : 4));
    return { units, dir: port ? 'down' : rng.pick(['down', 'down', 'up']), flip: !port && rng.chance(0.22), shrink: rng.range(0.82, 0.9), font: rng.pick(fontsOf(st, ['display', 'display', 'serif'])), tread: rng.pick(['line', 'line', 'none']), nums: rng.chance(0.55) };
  },
  render(env) {
    const { W, H, sc } = env, p = env.cut.params, u = U(env), port = isPort(env);
    const units = p.units && p.units.length ? p.units : [strip(env.cut.text)];
    const k = units.length;
    const r = k > 1 ? Math.max(p.shrink || 0.86, Math.pow(0.5, 1 / (k - 1))) : 1;
    const up = p.dir === 'up' && !port;
    const fx = up ? 1 : port ? 0.5 : 0.92;
    const L = [];
    units.forEach((t, i) => {
      const s = 100 * Math.pow(r, i), w = meas(t, p.font, s, { track: 0.02 }).w;
      let x = 0, y = 0;
      if (i > 0) { const q = L[i - 1]; x = q.x + q.w * fx + q.s * 0.14; y = q.y + (q.s + s) / 2 * 1.05 * (up ? -1 : 1); }
      L.push({ t, s, w, x, y });
    });
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (const q of L) { x0 = Math.min(x0, q.x); x1 = Math.max(x1, q.x + q.w); y0 = Math.min(y0, q.y - q.s / 2); y1 = Math.max(y1, q.y + q.s * 0.62); }
    const k2 = Math.min(W * 0.86 / (x1 - x0), H * 0.78 / (y1 - y0), u * 0.3 / 100);
    const ox = W / 2 - (x0 + x1) / 2 * k2, oy = H / 2 - (y0 + y1) / 2 * k2;
    const X = q => ox + q.x * k2, Y = q => oy + q.y * k2;
    const mirror = xx => (p.flip ? W - xx : xx);
    // tread / riser guide
    if (p.tread !== 'none' || p.nums) {
      const e = tin(env, 0, Math.max(0.5, env.cut.inDur * 1.6), E.inOutCubic) * (1 - E.inCubic(env.pOut));
      const lw = Math.max(2, 100 * k2 * 0.022);
      const pts = [];
      L.forEach((q, i) => {
        const yb = Y(q) + q.s * k2 * 0.58, gap = q.s * k2 * 0.14;
        if (i === 0) pts.push([X(q) - gap, yb]);
        if (i < k - 1) { const nx = L[i + 1], xr = X(nx) - gap / 2; pts.push([xr, yb], [xr, Y(nx) + nx.s * k2 * 0.58]); }
        else pts.push([X(q) + q.w * k2 + gap, yb]);
      });
      if (p.tread !== 'none' && e > 0) env.polyPartial(pts.map(q => [mirror(q[0]), q[1]]), e, sc.accent, lw, 1, false);
      if (p.nums && e > 0) {
        const ls = smallSize(env) * 0.85;
        L.forEach((q, i) => {
          const a = J.clamp((e * k - i) * 1.5);
          if (a <= 0) return;
          const yb = Y(q) + q.s * k2 * 0.58;
          env.draw({ text: pad2(i + 1), font: monoF(env), size: ls, align: p.flip ? 'right' : 'left', x: mirror(X(q)), y: yb + ls * 1.1, color: sc.sub, alpha: a, ghost: false });
        });
      }
    }
    let bb = null;
    L.forEach((q, i) => {
      const s = q.s * k2, xl = X(q);
      const it = { text: q.t, font: p.font, size: s, x: p.flip ? W - xl - q.w * k2 : xl, y: Y(q), align: 'left', track: 0.02, color: i === 0 ? sc.fg : sc.fg, mi: i * 2 };
      bb = J.unionBB(bb, J.mainDraw(env, it));
    });
    return bb || box(W / 2 - (x1 - x0) * k2 / 2, H / 2 - (y1 - y0) * k2 / 2, W / 2 + (x1 - x0) * k2 / 2, H / 2 + (y1 - y0) * k2 / 2);
  },
});

/* ======================================================================
   4  zigzag — ジグザグ
   ====================================================================== */
reg('zigzag', {
  name: 'ジグザグ', tags: ['pop', 'graphic'], w: 0.9, fits: n => n >= 3 && n <= 16,
  plan: (rng, cut, st) => {
    const port = cut.H > cut.W * 1.08;
    return { font: rng.pick(fontsOf(st, ['display'])), orient: port && cut.n > 5 ? 'v' : 'h', amp: rng.range(0.24, 0.34), phase: rng.pick([1, -1]), rails: rng.pick(['under', 'both', 'under', 'over']), tilt: rng.chance(0.35) };
  },
  render(env) {
    const { W, H, sc } = env, p = env.cut.params, u = U(env);
    const chars = hasLatin(env.cut.text) ? [...env.cut.text.trim().replace(/\s+/g, ' ')] : [...strip(env.cut.text)], n = chars.length;
    const v = p.orient === 'v';
    const size = Math.min((v ? H * 0.78 : W * 0.8) / n / 1.08, u * 0.2);
    const step = size * 1.08;
    const A = size * p.amp;
    const pos = i => { const s = (i % 2 ? 1 : -1) * p.phase, k = i - (n - 1) / 2; return v ? [W / 2 + s * A, H / 2 + k * step] : [W / 2 + k * step, H / 2 + s * A]; };
    // zigzag rails riding just outside the glyphs, extended to the frame margins
    const off = size * (0.52 + p.amp * 0.9);
    const e = tin(env, 0, Math.max(0.45, env.cut.inDur * 1.5), E.inOutCubic) * (1 - E.inCubic(env.pOut));
    if (e > 0) {
      const lw = Math.max(2, size * 0.03);
      const lim = v ? H * 0.04 : W * 0.04;
      const ext = Math.ceil(((v ? H : W) / 2 - n * step / 2 - lim) / step);
      const rail = sgn => {
        const pts = [];
        for (let i = -ext; i <= n - 1 + ext; i++) {
          const q = pos(i), pt = v ? [q[0] + sgn * off, q[1]] : [q[0], q[1] + sgn * off];
          const c = v ? pt[1] : pt[0];
          if (c < lim || c > (v ? H : W) - lim) continue;
          pts.push(pt);
        }
        return pts;
      };
      const sides = p.rails === 'both' ? [1, -1] : p.rails === 'over' ? [-1] : [1];
      sides.forEach((sg, k) => {
        const pts = rail(sg);
        if (pts.length < 2) return;
        env.polyPartial(pts, e, k === 0 ? sc.accent : sc.sub, lw, 1, false);
        const tip = Math.min(pts.length - 1, Math.floor(e * (pts.length - 1)));
        env.circle(pts[0][0], pts[0][1], lw * 2.2, k === 0 ? sc.accent : sc.sub, null, 0, 1, false);
        if (e > 0.98) env.circle(pts[tip][0], pts[tip][1], lw * 2.2, k === 0 ? sc.accent : sc.sub, null, 0, 1, false);
      });
    }
    let bb = null;
    chars.forEach((ch, i) => {
      const [x, y] = pos(i);
      if (ch === ' ') return;
      const rot = (p.tilt ? (i % 2 ? 1 : -1) * p.phase * 6 * (v ? -1 : 1) : 0) + (v && (J.VERT_ROTATE.includes(ch) || J.isLatin(ch)) ? 90 : 0);
      bb = J.unionBB(bb, J.mainDraw(env, { text: ch, font: p.font, size, x, y, rot, color: sc.fg, mi: i }));
    });
    return bb || (v ? box(W / 2 - A - size / 2, H / 2 - step * n / 2, W / 2 + A + size / 2, H / 2 + step * n / 2) : box(W / 2 - step * n / 2, H / 2 - A - size / 2, W / 2 + step * n / 2, H / 2 + A + size / 2));
  },
});

/* ======================================================================
   5  arcTop — 虹の弧
   ====================================================================== */
reg('arcTop', {
  name: '虹の弧', tags: ['pop', 'emotional', 'graphic'], w: 0.9, fits: n => n >= 3 && n <= 16,
  plan: (rng, cut, st) => { const port = cut.H > cut.W * 1.08; return { font: rng.pick(fontsOf(st, ['display', 'serif', 'display'])), span: port ? rng.range(150, 190) : rng.range(105, 145), guide: rng.pick(['double', 'ticks', 'double']), under: rng.pick(['copy', 'romaji', 'no']) }; },
  render(env) {
    const { W, H, sc } = env, p = env.cut.params, u = U(env);
    const chars = [...env.cut.text.trim()], n = chars.length;
    const spanDeg = Math.min(p.span, Math.max(50, n * 30));
    const half = spanDeg / 2 * J.DEG, dth = spanDeg * J.DEG / n, k = dth / 1.1;
    const wid = half < Math.PI / 2 ? 2 * Math.sin(half) : 2;
    const hollow = half >= 70 * J.DEG;
    const R = Math.min(W * 0.86 / (wid + k), H * 0.66 / (1 - Math.cos(half) + k * 1.3 + (hollow ? 0 : 0.18)), u * 0.21 / k);
    const size = R * k;
    const ls = smallSize(env);
    // vertical placement: centre the arc + caption block
    const topOff = -(R + size * 0.8);
    const endY = -R * Math.cos(half) + size * 0.55;
    const capY = hollow ? Math.max(0, -R * Math.cos(half) - R * 0.1) : endY + ls * 1.6;
    const botOff = Math.max(endY, capY + ls * 2.2);
    const cx = W / 2, cy = H / 2 - (topOff + botOff) / 2;
    const e = tin(env, 0, 0.7, E.inOutCubic) * (1 - E.inCubic(env.pOut));
    const lw = Math.max(1.2, size * 0.018);
    const a0 = -90 - spanDeg / 2 - 3, a1 = -90 + spanDeg / 2 + 3;
    if (e > 0) {
      const sp = (a1 - a0) / 2 * e;
      if (p.guide === 'double') {
        env.arc(cx, cy, R + size * 0.74, -90 - sp, -90 + sp, sc.sub, lw, 0.9, false);
        env.arc(cx, cy, R - size * 0.72, -90 - sp, -90 + sp, sc.sub, lw, 0.6, false);
      } else {
        env.arc(cx, cy, R - size * 0.72, -90 - sp, -90 + sp, sc.sub, lw, 0.8, false);
        for (let i = 0; i <= n; i++) {
          const th = (-90 + (i - n / 2) * spanDeg / n);
          if (Math.abs(th + 90) > sp + 0.01) continue;
          const c = Math.cos(th * J.DEG), s = Math.sin(th * J.DEG), r0 = R - size * 0.72, r1 = r0 - size * (i % 2 ? 0.12 : 0.22);
          env.line([[cx + c * r0, cy + s * r0], [cx + c * r1, cy + s * r1]], sc.sub, lw, 0.8, false);
        }
      }
      env.circle(cx + Math.cos((-90 - sp) * J.DEG) * (R + size * 0.74), cy + Math.sin((-90 - sp) * J.DEG) * (R + size * 0.74), size * 0.05, sc.accent, null, 0, 1, false);
      env.circle(cx + Math.cos((-90 + sp) * J.DEG) * (R + size * 0.74), cy + Math.sin((-90 + sp) * J.DEG) * (R + size * 0.74), size * 0.05, sc.accent, null, 0, 1, false);
    }
    // caption under the arc
    const ca = tin(env, 0.25, 0.4, E.outCubic) * tout(env);
    if (ca > 0.01) {
      const copy = p.under === 'romaji' ? (romajiOf(env) || altCopy(env)) : p.under === 'no' ? 'No.' + lineNo(env) + '  —  ' + J.fmtTime(env.cut.start) : altCopy(env);
      const maxW = hollow ? 2 * (R - size) * 0.8 : W * 0.7;
      const cs = Math.min(ls * 1.15, J.fitSize(copy, bodyF(env), maxW, ls * 2, { track: 0.12 }));
      env.draw({ text: copy, font: bodyF(env), size: cs, track: 0.12, x: cx, y: cy + capY, color: sc.sub, alpha: ca, ghost: false });
      const rw = Math.min(maxW * 0.5, size * 1.4) * ca;
      env.line([[cx - rw / 2, cy + capY + cs * 1.1], [cx + rw / 2, cy + capY + cs * 1.1]], sc.accent, Math.max(2, lw * 1.4), ca, false);
    }
    let bb = null;
    chars.forEach((ch, i) => {
      if (ch === ' ' || ch === '　') return;
      const th = -90 + (i - (n - 1) / 2) * spanDeg / n;
      const x = cx + Math.cos(th * J.DEG) * R, y = cy + Math.sin(th * J.DEG) * R;
      bb = J.unionBB(bb, J.mainDraw(env, { text: ch, font: p.font, size, x, y, rot: th + 90, color: sc.fg, mi: i }));
    });
    return bb || box(cx - R * wid / 2 - size / 2, cy - R - size / 2, cx + R * wid / 2 + size / 2, cy + endY);
  },
});

/* ======================================================================
   6  spiral — 螺旋
   ====================================================================== */
reg('spiral', {
  name: '螺旋', tags: ['emotional', 'graphic', 'calm'], w: 0.8, fits: n => n >= 2 && n <= 16,
  plan: (rng, cut, st) => ({ font: rng.pick(fontsOf(st, ['display', 'serif'])), dir: rng.pick([1, -1]), speed: rng.range(4, 9), guide: rng.chance(0.7), fill: cut.n <= 7 ? 'repeat' : cut.n <= 11 ? rng.pick(['repeat', 'single']) : 'single' }),
  render(env) {
    const { W, H, sc } = env, p = env.cut.params, u = U(env);
    const chars = hasLatin(env.cut.text) ? [...env.cut.text.trim().replace(/\s+/g, ' ')] : [...strip(env.cut.text)], n = chars.length;
    const seq = chars.map((c, i) => ({ c, main: true, i }));
    if (p.fill === 'repeat') {
      const reps = Math.max(1, Math.ceil(20 / (n + 1)) - 1);
      for (let r = 0; r < reps && seq.length < 40; r++) { seq.push({ c: '・', main: false }); chars.forEach(c => seq.push({ c, main: false })); }
    }
    const N = seq.length;
    const f = p.fill === 'repeat' ? 0.8 : 0.58;
    const c = Math.min(0.42, 0.92 * Math.sqrt(5.82 * f / N));
    const dth = c * 1.08, TH = N * dth;
    const R0 = u * 0.45 / (1 + c * 0.55);
    const rAt = th => R0 * (1 - f * th / TH);
    // the lyric is centred on the top (tops outward, clockwise) or the bottom (tops inward, counter-clockwise) so it reads upright
    const mid = p.dir > 0 ? -90 : 90;
    const base = mid - p.dir * Math.min((n - 1) * dth / 2 / J.DEG, 70);
    const drift = (env.ltb - env.cut.dur / 2) * p.speed * p.dir;
    // centre the glyph cloud (at rest) on screen
    let bx0 = 1e9, bx1 = -1e9, by0 = 1e9, by1 = -1e9;
    seq.forEach((q, j) => {
      const th = j * dth, r = rAt(th), sz = c * r * 0.5, ph = (base + p.dir * th / J.DEG) * J.DEG;
      const x = Math.cos(ph) * r, y = Math.sin(ph) * r;
      bx0 = Math.min(bx0, x - sz); bx1 = Math.max(bx1, x + sz); by0 = Math.min(by0, y - sz); by1 = Math.max(by1, y + sz);
    });
    const cx = W / 2 - (bx0 + bx1) / 2, cy = H / 2 - (by0 + by1) / 2;
    const rot0 = base + drift;
    const out = tout(env);
    if (p.guide) {
      const e = tin(env, 0, 0.9, E.inOutCubic) * out;
      if (e > 0) {
        const pts = [], M = 100;
        for (let k = 0; k <= M; k++) {
          const th = (k / M) * (TH - dth * 0.5), r = rAt(th) * (1 + c * 0.62);
          const ph = (rot0 + p.dir * th / J.DEG) * J.DEG;
          pts.push([cx + Math.cos(ph) * r, cy + Math.sin(ph) * r]);
        }
        env.polyPartial(pts, e, sc.sub, Math.max(1.2, u * 0.0016), 0.55, false);
      }
    }
    const dotE = E.outBack(J.clamp(env.lt / 0.35), 2) * out;
    env.circle(cx, cy, u * 0.008 * dotE, sc.accent, null, 0, 1, false);
    let bb = null;
    seq.forEach((q, j) => {
      const th = j * dth, r = rAt(th), size = c * r;
      const ph = rot0 + p.dir * th / J.DEG;
      const x = cx + Math.cos(ph * J.DEG) * r, y = cy + Math.sin(ph * J.DEG) * r;
      const rot = p.dir > 0 ? ph + 90 : ph - 90;
      if (q.c === ' ') return;
      if (q.main) bb = J.unionBB(bb, J.mainDraw(env, { text: q.c, font: p.font, size, x, y, rot, color: sc.fg, mi: q.i, noHold: true }));
      else {
        const a = J.clamp((env.lt - 0.15 - (j - n) * 0.025) / 0.25) * out * J.lerp(0.22, 0.7, r / R0);
        if (a > 0.01) env.draw({ text: q.c, font: p.font, size, x, y, rot, color: sc.sub, alpha: a, ghost: false });
      }
    });
    return bb || box(cx + bx0, cy + by0, cx + bx1, cy + by1);
  },
});

/* ======================================================================
   7  gridCells — 升目
   ====================================================================== */
reg('gridCells', {
  name: '升目', tags: ['graphic', 'editorial', 'pop'], w: 1, fits: n => n >= 2 && n <= 18, treat: 'safe',
  plan: (rng, cut, st) => ({ font: rng.pick(fontsOf(st, ['display', 'serif'])), gap: rng.pick([0, 0, 0.1, 0.16]), acc: rng.int(0, 99), fill: rng.pick(['outline', 'outline', 'ink']), nums: rng.chance(0.6) }),
  render(env) {
    const { W, H, sc } = env, p = env.cut.params, u = U(env), port = isPort(env);
    const chars = [...strip(env.cut.text)], n = chars.length;
    const maxCols = port ? (n <= 8 ? 4 : 5) : (n <= 10 ? 10 : 8);
    const rows = Math.ceil(n / Math.min(n, maxCols)), cols = Math.ceil(n / rows);
    const g = p.gap || 0;
    const cell = Math.min(W * 0.86 / (cols + (cols - 1) * g), H * 0.72 / (rows + (rows - 1) * g), u * 0.3);
    const stp = cell * (1 + g);
    const gw = cols * cell + (cols - 1) * cell * g, gh = rows * cell + (rows - 1) * cell * g;
    const x0 = W / 2 - gw / 2, y0 = H / 2 - gh / 2;
    const kan = chars.map((ch, i) => (J.isKanji(ch) ? i : -1)).filter(i => i >= 0);
    const ok = chars.map((ch, i) => (!J.isPunct(ch) && !J.isSmallKana(ch) ? i : -1)).filter(i => i >= 0);
    const ai = kan.length ? kan[p.acc % kan.length] : ok.length ? ok[p.acc % ok.length] : p.acc % n;
    const out = tout(env);
    const lw = Math.max(1.5, cell * 0.012);
    const plate = p.fill === 'ink';
    const total = rows * cols;
    for (let i = 0; i < total; i++) {
      const cx = x0 + (i % cols) * stp, cy = y0 + Math.floor(i / cols) * stp;
      const d = i * 0.03;
      const e = tin(env, d, 0.35, E.inOutCubic) * out;
      if (e <= 0) continue;
      const empty = i >= n;
      if (i === ai || (plate && !empty)) {
        const q = E.outBack(J.clamp((env.lt - d - 0.08) / 0.28), 1.6) * out;
        const col = i === ai ? sc.accent : sc.ink;
        if (q > 0) env.rect(cx + cell / 2 * (1 - q), cy + cell / 2 * (1 - q), cell * q, cell * q, col, 1, i === ai);
      }
      const loop = [[cx, cy], [cx + cell, cy], [cx + cell, cy + cell], [cx, cy + cell], [cx, cy]];
      env.polyPartial(loop, e, empty ? sc.sub : sc.fg, lw, empty ? 0.35 : 0.9, false);
      if (p.nums && !empty) {
        const ns = Math.max(10, cell * 0.1);
        env.draw({ text: pad2(i + 1), font: monoF(env), size: ns, align: 'left', x: cx + ns * 0.6, y: cy + ns * 1.1, color: i === ai ? onCol(sc, sc.accent) : plate ? onCol(sc, sc.ink) : sc.sub, alpha: J.clamp(e * 1.5 - 0.5) * 0.85, ghost: false });
      }
    }
    let bb = null;
    chars.forEach((ch, i) => {
      const cx = x0 + (i % cols) * stp + cell / 2, cy = y0 + Math.floor(i / cols) * stp + cell / 2;
      const col = i === ai ? onCol(sc, sc.accent) : plate ? onCol(sc, sc.ink) : sc.fg;
      bb = J.unionBB(bb, J.mainDraw(env, { text: ch, font: p.font, size: cell * 0.64, x: cx, y: cy + cell * 0.02, color: col, mi: i }));
    });
    return bb || box(x0, y0, x0 + gw, y0 + gh);
  },
});

/* ======================================================================
   8  dropCap — 大きな頭文字
   ====================================================================== */
reg('dropCap', {
  name: '大きな頭文字', tags: ['editorial', 'emotional', 'calm'], w: 1, enterBias: { blur: 1.4, wipe: 1.3, type: 1.2 }, fits: n => n >= 3 && n <= 24, portrait: 0.8,
  plan: (rng, cut, st) => ({ capFont: rng.pick(fontsOf(st, ['serif', 'display'])), font: rng.pick(fontsOf(st, ['serif', 'body', 'display'])), cap: rng.pick(['fill', 'accent', 'outline']), rules: rng.chance(0.65), meta: rng.chance(0.7) }),
  render(env) {
    const { W, H, sc } = env, p = env.cut.params, u = U(env), port = isPort(env);
    const arr = [...env.cut.text.trim()];
    const cap = arr[0] || '';
    const rest = arr.slice(1).join('').trim();
    const nR = J.glyphCount(rest);
    const colW = W * (port ? 0.84 : 0.66);
    const lead = 1.3, tr = 0.04;
    const capAdv = J.metrics.adv(p.capFont, cap) || 1;
    // choose line breaks + size analytically: every candidate split gets its largest fitting size
    const L = memo(['dc', rest, W, H, p.font, p.capFont, cap].join('|'), () => {
      const w1 = t => rowW(t, p.font, 1) + Math.max(0, [...t].length - 1) * tr;
      const cands = new Map();
      for (let m = 1; m <= Math.max(1, nR); m++) { const t = J.splitLines(rest, m); cands.set(t, t.split('\n').map(l => l.trim()).filter(Boolean)); }
      const nat = new Set(); let acc = 0;
      for (const c of (J.chunkText ? J.chunkText(rest) : [rest])) { acc += J.glyphCount(c); nat.add(acc); }
      let best = null, bs = -1;
      for (const lines of cands.values()) {
        let q = 1, cum = 0;
        lines.forEach((l, i) => { cum += J.glyphCount(l); if (i < lines.length - 1 && !nat.has(cum) && !hasLatin(l)) q *= 0.82; });
        if (nR >= 4 && lines.length < 2) continue;
        if (nR >= 4 && lines.some(l => J.glyphCount(l) < 2)) continue;
        if (nR <= 3 && lines.length > 1) continue;
        for (const cl of (nR <= 10 ? [2] : [3, 2])) {
          const kc = ((cl - 1) * lead + 1) / 0.86;
          const nl = Math.max(lines.length, cl);
          let sm = Math.min(u * 0.12, H * 0.62 / ((nl - 1) * lead + 1));
          lines.forEach((l, i) => { sm = Math.min(sm, i < cl ? colW / (w1(l) + capAdv * kc + 0.5) : colW / w1(l)); });
          const score = sm * q * (1 - 0.1 * Math.max(0, lines.length - cl));
          if (score > bs) { bs = score; best = { s: sm, cl, lines, capS: sm * kc, gap: sm * 0.5 }; }
        }
      }
      if (!best) best = { s: u * 0.06, cl: 2, lines: [rest], capS: u * 0.06 * 2.67, gap: u * 0.03 };
      best.wOf = t => w1(t) * best.s;
      return best;
    });
    let s;
    s = L.s;
    const capLines = L.cl, capS = L.capS, capW = capAdv * capS;
    const nl = L.lines.length;
    const besideOnly = nl <= capLines;
    let usedW = 0;
    L.lines.forEach((ln, i) => { usedW = Math.max(usedW, (i < capLines ? capW + L.gap : 0) + L.wOf(ln)); });
    usedW = Math.max(usedW, capW + L.gap + s);
    const hBlock = (Math.max(nl, capLines) - 1) * lead * s + s;
    const x0 = W / 2 - usedW / 2;
    const top = H / 2 - hBlock / 2 - (p.meta ? s * 0.3 : 0);
    const capBand = ((capLines - 1) * lead + 1) * s;
    const capCy = top + capBand / 2;
    const lineY = i => besideOnly ? capCy + (i - (nl - 1) / 2) * lead * s * (nl < capLines ? 1.15 : 1) : top + s / 2 + i * lead * s;
    const out = tout(env);
    const yT = top - s * 0.45, yB = top + hBlock + s * 0.45;
    if (p.rules) {
      const e = tin(env, 0.05, 0.6, E.inOutCubic) * out, lw = Math.max(1.5, s * 0.02);
      env.line([[x0, yT], [x0 + usedW * e, yT]], sc.fg, lw, 0.9, false);
      env.line([[x0 + usedW, yB], [x0 + usedW - usedW * e, yB]], sc.fg, lw, 0.9, false);
    }
    if (p.meta) {
      const a = tin(env, 0.3, 0.4, E.outCubic) * out, ls = smallSize(env) * 0.9;
      const yM = yB + ls * 1.3;
      env.draw({ text: 'No.' + lineNo(env), font: monoF(env), size: ls, track: 0.1, align: 'left', x: x0, y: yM, color: sc.accent, alpha: a, ghost: false });
      env.draw({ text: romajiOf(env) || altCopy(env), font: monoF(env), size: ls, track: 0.1, align: 'right', x: x0 + usedW, y: yM, color: sc.sub, alpha: a, ghost: false });
    }
    const capIt = { text: cap, font: p.capFont, size: capS, x: x0 + capW / 2, y: capCy + capS * 0.02, color: p.cap === 'accent' ? sc.accent : sc.fg, mi: 0 };
    if (p.cap === 'outline') Object.assign(capIt, { fill: false, stroke: Math.max(2, capS * 0.014) });
    let bb = J.mainDraw(env, capIt);
    L.lines.forEach((ln, i) => {
      bb = J.unionBB(bb, J.mainDraw(env, { text: ln, font: p.font, size: s, x: i < capLines ? x0 + capW + L.gap : x0, y: lineY(i), align: 'left', track: tr, color: sc.fg, mi: 2 + i * 2 }));
    });
    return bb || box(x0, top, x0 + usedW, top + hBlock);
  },
});

/* ======================================================================
   9  justified — 版面
   ====================================================================== */
reg('justified', {
  name: '版面', tags: ['editorial', 'calm', 'emotional'], w: 0.8, fits: n => n >= 2 && n <= 22, busy: true, treat: 'safe',
  plan: (rng, cut, st) => ({ font: rng.pick(fontsOf(st, ['display', 'serif'])), fillFont: rng.pick(fontsOf(st, ['body', 'serif'])), mark: rng.pick(['band', 'under', 'bracket']), pos: rng.pick([0.28, 0.5, 0.66]), dens: rng.range(0.062, 0.078) }),
  render(env) {
    const { W, H, sc } = env, p = env.cut.params, u = U(env);
    const text = env.cut.text.trim(), n = J.glyphCount(text);
    const bx0 = W * 0.08, bw = W * 0.84, by0 = H * 0.09, bh = H * 0.82;
    const rowsN = Math.max(8, Math.round(bh / (u * (p.dens || 0.07))));
    const rowH = bh / rowsN, fs = rowH * 0.6;
    // lyric: each line set to the full measure
    const capH = rowH * (n <= 5 ? 3.4 : 2.6);
    let lines = [text];
    const fitL = (l, hmax) => Math.min(hmax, J.fitSize(l, p.font, bw, hmax, { track: 0.04 }));
    if (fitL(text, capH) < rowH * 1.6 && n >= 4) lines = splitK(text, 2);
    const two = lines.length > 1;
    const s2 = two ? Math.min(...lines.map(l => fitL(l, rowH * 2.4))) : 0;
    const sizes = two ? lines.map(() => s2) : [fitL(text, capH)];
    const lyH = sizes.reduce((a, b) => a + b, 0) + (lines.length - 1) * rowH * 0.25;
    const span = Math.ceil(lyH / rowH + 0.8);
    const r0 = Math.round(p.pos * (rowsN - span));
    const out = tout(env);
    // filler: the whole line set solid, running on through the rows
    const src = [...(flat(env.cut.lineText || text) + (hasLatin(text) ? ' / ' : '。'))];
    const adv = J.metrics.adv(p.fillFont, 'あ') || 1;
    const cpr = Math.max(4, Math.floor(bw / (fs * adv * 1.06)));
    let off = 0;
    for (let r = 0; r < rowsN; r++) {
      if (r >= r0 && r < r0 + span) continue;
      let row = '';
      for (let j = 0; j < cpr; j++) row += src[(off + j) % src.length];
      off += cpr;
      const a = J.clamp((env.lt - r * 0.018) / 0.2) * out;
      if (a <= 0.01) continue;
      const sp = (bw - rowW(row, p.fillFont, fs)) / Math.max(1, cpr - 1);
      fastRow(env, row, p.fillFont, fs, bx0, by0 + (r + 0.5) * rowH, sp, sc.sub, a * 0.34);
    }
    const yc = by0 + (r0 + span / 2) * rowH;
    const mx = sizes[0];
    const plate = p.mark === 'band';
    const e = tin(env, 0.05, 0.5, E.inOutExpo) * out;
    if (plate && e > 0) env.rect(bx0 - mx * 0.2, yc - lyH / 2 - mx * 0.2, (bw + mx * 0.4) * e, lyH + mx * 0.4, sc.accent, 1, false);
    if (p.mark === 'under' && e > 0) { const lw = Math.max(3, mx * 0.05); env.rect(bx0, yc + lyH / 2 + mx * 0.2, bw * e, lw, sc.accent, 1, true); env.rect(bx0 + bw * (1 - e), yc - lyH / 2 - mx * 0.2 - lw, bw * e, lw, sc.accent, 1, true); }
    if (p.mark === 'bracket' && e > 0) {
      const aL = mx * 0.45 * e, lw = Math.max(2, mx * 0.04), yt = yc - lyH / 2 - mx * 0.16, yb = yc + lyH / 2 + mx * 0.16, g = mx * 0.14;
      env.line([[bx0 - g + aL, yt], [bx0 - g, yt], [bx0 - g, yb], [bx0 - g + aL, yb]], sc.accent, lw, 1, false);
      env.line([[bx0 + bw + g - aL, yt], [bx0 + bw + g, yt], [bx0 + bw + g, yb], [bx0 + bw + g - aL, yb]], sc.accent, lw, 1, false);
    }
    const ms = Math.max(11, rowH * 0.28), fa = tin(env, 0.1, 0.4, E.outCubic) * out;
    env.draw({ text: 'No.' + lineNo(env), font: monoF(env), size: ms, align: 'left', x: bx0, y: by0 - rowH * 0.45, color: sc.sub, alpha: fa, ghost: false });
    env.draw({ text: rowsN + ' × ' + cpr, font: monoF(env), size: ms, align: 'right', x: bx0 + bw, y: by0 + bh + rowH * 0.45, color: sc.sub, alpha: fa, ghost: false });
    let bb = null, y = yc - lyH / 2;
    const col = plate ? onCol(sc, sc.accent) : sc.fg;
    lines.forEach((ln, i) => {
      const ls = sizes[i], nG = [...ln].length;
      y += ls / 2;
      let it;
      if (two) it = { text: ln, font: p.font, size: ls, track: 0.04, align: i === 0 ? 'left' : 'right', x: i === 0 ? bx0 : bx0 + bw, y, color: col, mi: i * 3 };
      else if (nG > 1) { const w0 = meas(ln, p.font, ls).w; it = { text: ln, font: p.font, size: ls, track: (bw - w0) / (ls * (nG - 1)), align: 'left', x: bx0, y, color: col, mi: 0 }; }
      else it = { text: ln, font: p.font, size: ls, x: bx0 + bw / 2, y, color: col, mi: 0 };
      bb = J.unionBB(bb, J.mainDraw(env, it));
      y += ls / 2 + rowH * 0.25;
    });
    return bb || box(bx0, yc - lyH / 2, bx0 + bw, yc + lyH / 2);
  },
});

/* ======================================================================
   10  frameBox — 額縁
   ====================================================================== */
reg('frameBox', {
  name: '額縁', tags: ['editorial', 'calm', 'graphic'], w: 1.1, fits: n => n <= 20,
  plan: (rng, cut, st) => ({ font: rng.pick(fontsOf(st, ['display', 'serif', 'serif'])), style: rng.pick(['full', 'double', 'corners']), caps: rng.pick(['tl-br', 'top-bottom']), shape: rng.pick(['tight', 'wide']) }),
  render(env) {
    const { W, H, sc } = env, p = env.cut.params, u = U(env), port = isPort(env);
    const text = brk(env.cut.text.trim(), port ? 6 : 12);
    const o = { track: 0.04, lead: 1.2 };
    const size = Math.min(J.fitSize(text, p.font, W * (port ? 0.74 : 0.68), H * 0.36, o), u * 0.19);
    const m = meas(text, p.font, size, o);
    let fw = m.w + size * 1.6, fh = m.h + size * 1.4;
    if (p.shape === 'wide') { fw = Math.max(fw, W * (port ? 0.82 : 0.62)); fh = Math.max(fh, fw * (port ? 0.9 : 0.5)); }
    fw = Math.min(fw, W * 0.9); fh = Math.min(fh, H * 0.86);
    const x0 = W / 2 - fw / 2, y0 = H / 2 - fh / 2, x1 = x0 + fw, y1 = y0 + fh;
    const ls = smallSize(env) * 0.9, gp = ls * 0.7;
    const c1 = 'No.' + lineNo(env), c2 = romajiOf(env) || J.fmtTime(env.cut.start);
    const w1 = meas(c1, monoF(env), ls, { track: 0.12 }).w, w2 = meas(c2, monoF(env), ls, { track: 0.12 }).w;
    const tb = p.caps === 'top-bottom';
    const a1 = tb ? W / 2 - w1 / 2 : x0 + ls * 2.2, b2 = tb ? W / 2 + w2 / 2 : x1 - ls * 2.2;
    const e = tin(env, 0, 0.85, E.inOutCubic) * (1 - E.inCubic(env.pOut));
    const lw = Math.max(2, size * 0.02);
    const segsFor = (X0, Y0, X1, Y1, gaps) => gaps
      ? [[[X0, Y0], [a1 - gp, Y0]], [[a1 + w1 + gp, Y0], [X1, Y0], [X1, Y1], [b2 + gp, Y1]], [[b2 - w2 - gp, Y1], [X0, Y1], [X0, Y0]]]
      : [[[X0, Y0], [X1, Y0], [X1, Y1], [X0, Y1], [X0, Y0]]];
    if (e > 0) {
      if (p.style === 'corners') {
        const arm = Math.min(fw, fh) * 0.22 * e;
        [[x0, y0, 1, 1], [x1, y0, -1, 1], [x1, y1, -1, -1], [x0, y1, 1, -1]].forEach(([X, Y, dx, dy]) => env.line([[X + dx * arm, Y], [X, Y], [X, Y + dy * arm]], sc.fg, lw * 1.4, 1, false));
      } else {
        segsPartial(env, segsFor(x0, y0, x1, y1, true), e, sc.fg, lw, 1, false);
        if (p.style === 'double') { const d = size * 0.16; segsPartial(env, segsFor(x0 + d, y0 + d, x1 - d, y1 - d, false), J.clamp(e * 1.15 - 0.15), sc.sub, Math.max(1, lw * 0.5), 0.8, false); }
      }
      const ca = J.clamp(e * 2 - 0.6);
      if (ca > 0) {
        env.draw({ text: c1, font: monoF(env), size: ls, track: 0.12, align: 'left', x: a1, y: y0, color: sc.accent, alpha: ca, ghost: false });
        env.draw({ text: c2, font: monoF(env), size: ls, track: 0.12, align: 'right', x: b2, y: y1, color: sc.sub, alpha: ca, ghost: false });
      }
    }
    const bb = J.mainDraw(env, { text, font: p.font, size, x: W / 2, y: H / 2, track: 0.04, lead: 1.2, color: sc.fg });
    return bb || box(W / 2 - m.w / 2, H / 2 - m.h / 2, W / 2 + m.w / 2, H / 2 + m.h / 2);
  },
});

/* ======================================================================
   11  bubble — 吹き出し
   ====================================================================== */
function bubblePoly(shape, cx, cy, w, h, size, tailSide) {
  const x0 = cx - w / 2, y0 = cy - h / 2, x1 = cx + w / 2, y1 = cy + h / 2;
  const tipX = cx + tailSide * w * 0.36, tipY = y1 + size * 0.75;
  if (shape === 'ellipse') {
    const rx = w / 2, ry = h / 2, M = 56, ta = (tailSide > 0 ? 62 : 118) * J.DEG, dA = 0.16;
    const pts = [];
    for (let i = 0; i < M; i++) {
      const a = i / M * J.TAU;
      if (Math.abs(a - ta) < dA) { if (Math.abs(a - ta) < J.TAU / M / 2 + 1e-6 || (pts.tipDone !== true && a > ta)) { pts.push([tipX, tipY]); pts.tipDone = true; } continue; }
      pts.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
    }
    if (!pts.tipDone) pts.push([tipX, tipY]);
    return { pts, tip: [tipX, tipY] };
  }
  const r = Math.min(h * 0.42, size * 0.9), seg = 6, pts = [];
  const corner = (ccx, ccy, a0) => { for (let i = 0; i <= seg; i++) { const a = (a0 + 90 * i / seg) * J.DEG; pts.push([ccx + Math.cos(a) * r, ccy + Math.sin(a) * r]); } };
  corner(x1 - r, y0 + r, -90); corner(x1 - r, y1 - r, 0);
  const bw = Math.min(size * 0.55, w * 0.18), bc = cx + tailSide * w * 0.2;
  if (tailSide > 0) { pts.push([bc + bw / 2, y1], [tipX, tipY], [bc - bw / 2, y1]); }
  else { pts.push([bc + bw / 2, y1], [tipX, tipY], [bc - bw / 2, y1]); }
  corner(x0 + r, y1 - r, 90); corner(x0 + r, y0 + r, 180);
  return { pts, tip: [tipX, tipY] };
}
reg('bubble', {
  name: '吹き出し', tags: ['pop', 'emotional'], w: 0.9, enterBias: { pop: 2, drop: 1.4, spin: 0.5 }, fits: n => n <= 20, treat: 'safe',
  plan: (rng, cut, st) => ({ font: rng.pick(fontsOf(st, ['display', 'body'])), shape: rng.pick(['round', 'ellipse', 'thought', 'round']), style: rng.pick(['fill', 'outline', 'fill']), tail: rng.pick([1, -1]), off: rng.range(-0.05, 0.05), tilt: rng.range(-3, 3), burst: rng.chance(0.6) }),
  render(env) {
    const { W, H, sc, ctx } = env, p = env.cut.params, u = U(env), port = isPort(env);
    const ell = p.shape !== 'round';
    const t0 = env.cut.text.trim(), n0 = J.glyphCount(t0);
    const text = ell && n0 >= 5 && !port ? brk(t0, Math.max(3, Math.ceil(n0 / 2))) : brk(t0, port ? 6 : 10);
    const o = { track: 0.02, lead: 1.2 };
    const size = Math.min(J.fitSize(text, p.font, W * (port ? 0.62 : ell ? 0.5 : 0.6), H * 0.32, o), u * 0.15);
    const m = meas(text, p.font, size, o);
    const w = m.w * (ell ? 1.34 : 1) + size * (ell ? 1.1 : 1.2), h = m.h * (ell ? 1.3 : 1) + size * (ell ? 1.0 : 0.95);
    const cx = W / 2 + p.off * W, cy = H / 2 - size * 0.3;
    const fill = p.style === 'fill' || p.shape === 'thought';
    const plate = sc.ink;
    const tcol = fill ? onCol(sc, plate) : sc.fg;
    const q = E.outBack(J.clamp(env.lt / 0.32), 1.7) * (1 - E.inCubic(J.clamp(env.pOut * 1.2)));
    const sh = p.shape === 'thought' ? 'ellipse' : p.shape;
    const B = bubblePoly(sh, cx, cy, w, h, size, p.tail);
    const pivot = p.shape === 'thought' ? [cx, cy] : B.tip;
    ctx.save();
    ctx.translate(pivot[0], pivot[1]); ctx.rotate(p.tilt * J.DEG * (1 - q) * 3); ctx.scale(Math.max(0.001, q), Math.max(0.001, q)); ctx.translate(-pivot[0], -pivot[1]);
    if (q > 0.001) {
      if (p.shape === 'thought') {
        const M = 22, pts = [];
        for (let i = 0; i < M; i++) { const a = i / M * J.TAU, k = i % 2 ? 1.08 : 0.97; pts.push([cx + Math.cos(a) * w / 2 * k, cy + Math.sin(a) * h / 2 * k]); }
        env.blob(pts, plate, 1, false);
        const tx = cx + p.tail * w * 0.34, ty = cy + h / 2;
        [[0.45, 0.2], [0.85, 0.12], [1.15, 0.07]].forEach(([d, r]) => env.circle(tx + p.tail * size * d * 0.8, ty + size * d * 0.75, size * r * 1.4, plate, null, 0, 1, false));
      } else if (fill) env.poly(B.pts, plate, 1, false);
      else env.line(closeLoop(B.pts), sc.fg, Math.max(3, size * 0.05), 1, false);
    }
    const bb = J.mainDraw(env, { text, font: p.font, size, x: cx, y: cy + size * 0.02, track: 0.02, lead: 1.2, color: tcol });
    ctx.restore();
    // emphasis strokes at the top corner
    if (p.burst) {
      const a = J.clamp((env.lt - 0.2) / 0.2) * tout(env);
      if (a > 0) {
        const bx = cx - p.tail * (w / 2 + size * 0.05), by = cy - h / 2 - size * 0.05, L = size * 0.45 * E.outExpo(a);
        [-30, 0, 30].forEach((d, i) => { const ang = (-90 - p.tail * 45 + d * 0.9) * J.DEG, r0 = size * 0.25; env.line([[bx + Math.cos(ang) * r0, by + Math.sin(ang) * r0], [bx + Math.cos(ang) * (r0 + L * (i === 1 ? 1.2 : 0.9)), by + Math.sin(ang) * (r0 + L * (i === 1 ? 1.2 : 0.9))]], sc.accent, Math.max(3, size * 0.05), 1, false); });
      }
    }
    return bb || box(cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2);
  },
});

/* ======================================================================
   12  subtitleBar — 字幕帯
   ====================================================================== */
reg('subtitleBar', {
  name: '字幕帯', tags: ['emotional', 'calm', 'editorial'], w: 0.9, fits: n => n <= 26, busy: true, treat: 'safe', portrait: 0.7,
  plan: (rng, cut, st) => ({ font: rng.pick(fontsOf(st, ['body', 'serif'])), bigFont: rng.pick(fontsOf(st, ['display', 'serif'])), big: rng.pick(['dim', 'outline']), bar: rng.range(0.1, 0.13), tc: rng.pick(['rec', 'scene']), place: rng.pick(['bar', 'band']), drift: rng.pick([1, -1]) }),
  render(env) {
    const { W, H, sc } = env, p = env.cut.params, u = U(env), port = isPort(env);
    const text = env.cut.text.trim(), lb = env.ltb;
    const cand = [sc.bg, sc.fg, sc.ink, sc.dim];
    let barC = cand[0]; cand.forEach(c => { if (J.lum(c) < J.lum(barC)) barC = c; });
    const pic = barC === sc.bg && Math.abs(J.lum(sc.dim) - J.lum(sc.bg)) > 0.03;   // dark scheme: lift the picture area instead
    const bh = H * (port ? p.bar * 0.62 : p.bar);
    const e = tin(env, 0, 0.55, E.outExpo) * (1 - E.inCubic(env.pOut));
    const out = tout(env);
    const hh0 = bh * e;
    if (pic && hh0 > 0.5) env.rect(-2, hh0, W + 4, H - hh0 * 2, sc.dim, J.clamp(e * 1.4), false);
    // huge faint copy behind
    const bt = flat(text);
    const bs = Math.min(J.fitSize(bt, p.bigFont, W * 0.94, H * 0.6), H * 0.6);
    const ba = tin(env, 0.05, 0.6, E.outCubic) * out;
    if (ba > 0.01) {
      const bx = W / 2 + (lb / Math.max(1, env.cut.dur) - 0.5) * W * 0.03 * p.drift;
      if (p.big === 'outline') env.draw({ text: bt, font: p.bigFont, size: bs, x: bx, y: H / 2, fill: false, stroke: Math.max(1.2, bs * 0.006), strokeColor: sc.sub, alpha: 0.4 * ba, ghost: false });
      else env.draw({ text: bt, font: p.bigFont, size: bs, x: bx, y: H / 2, color: pic ? sc.bg : sc.dim, alpha: ba * (pic ? 0.7 : 1), ghost: false });
    }
    // letterbox bars
    const hh = bh * e;
    if (hh > 0.5) {
      env.rect(-2, -2, W + 4, hh + 2, barC, 1, false);
      env.rect(-2, H - hh, W + 4, hh + 2, barC, 1, false);
      env.line([[0, hh], [W, hh]], sc.sub, 1.2, 0.35, false);
      env.line([[0, H - hh], [W, H - hh]], sc.sub, 1.2, 0.35, false);
    }
    // timecode in the top bar
    const ls = Math.min(smallSize(env) * 0.9, bh * 0.3);
    const ta = J.clamp((e - 0.6) * 2.5) * out;
    if (ta > 0) {
      const y = hh / 2;
      if (p.tc === 'rec') {
        if (env.step % 2 === 0) env.circle(W * 0.05, y, ls * 0.35, sc.accent, null, 0, ta, false);
        env.draw({ text: 'REC', font: monoF(env), size: ls, track: 0.12, align: 'left', x: W * 0.05 + ls * 0.8, y, color: onCol(sc, barC), alpha: ta, ghost: false });
      } else env.draw({ text: 'SCENE ' + lineNo(env) + '  /  CUT ' + pad2((env.cut.index | 0) + 1), font: monoF(env), size: ls, track: 0.12, align: 'left', x: W * 0.05, y, color: onCol(sc, barC), alpha: ta, ghost: false });
      env.draw({ text: J.fmtTime(env.t, 24), font: monoF(env), size: ls, track: 0.08, align: 'right', x: W * 0.95, y, color: sc.sub, alpha: ta, ghost: false });
    }
    // subtitle
    const o = { track: 0.06, lead: 1.25 };
    let t2 = text, ss;
    const maxH = p.place === 'bar' ? bh * 0.62 : bh * 0.8;
    ss = Math.min(J.fitSize(t2, p.font, W * 0.84, maxH, o), u * 0.058);
    if (ss < u * 0.04 && J.glyphCount(text) > 8) { t2 = brk(text, Math.ceil(J.glyphCount(text) / 2)); ss = Math.min(J.fitSize(t2, p.font, W * 0.84, maxH * 1.5, o), u * 0.05); }
    const m = meas(t2, p.font, ss, o);
    let sy, scol;
    if (p.place === 'bar') { sy = H - bh / 2; scol = onCol(sc, barC); }
    else {
      sy = H - bh - m.h / 2 - ss * 0.9;
      const pa = J.clamp((e - 0.3) * 2) * out;
      if (pa > 0) env.rect(W / 2 - m.w / 2 - ss * 0.8, sy - m.h / 2 - ss * 0.35, m.w + ss * 1.6, m.h + ss * 0.7, barC, 0.72 * pa, false);
      scol = onCol(sc, barC);
    }
    const bb = J.mainDraw(env, { text: t2, font: p.font, size: ss, x: W / 2, y: sy, track: 0.06, lead: 1.25, color: scol });
    return bb || box(W / 2 - m.w / 2, sy - m.h / 2, W / 2 + m.w / 2, sy + m.h / 2);
  },
});

/* ======================================================================
   13  ticker — ティッカー
   ====================================================================== */
reg('ticker', {
  name: 'ティッカー', tags: ['pop', 'glitch', 'graphic'], w: 0.9, enterBias: { wipe: 1.6, slice: 1.4, type: 1.2 }, fits: n => n <= 18,
  plan: (rng, cut, st) => ({ font: rng.pick(fontsOf(st, ['display'])), tag: rng.pick(['LIVE', 'NOW', 'ON AIR', 'LIVE']), speed: rng.range(0.8, 1.3), main: rng.pick(['center', 'left', 'center']), bug: rng.chance(0.6) }),
  render(env) {
    const { W, H, sc, ctx } = env, p = env.cut.params, u = U(env), port = isPort(env);
    const text0 = env.cut.text.trim();
    const bandH = u * 0.075, bandY = H - bandH - H * (port ? 0.12 : 0.085);
    const out = 1 - E.inCubic(env.pOut);
    const eB = tin(env, 0, 0.5, E.outExpo) * out;
    const tagC = sc.accent, bandC = sc.ink === sc.accent ? sc.fg : sc.ink;
    const ts = bandH * 0.42;
    const tagW = meas(p.tag, monoF(env), ts, { track: 0.12 }).w + ts * 2.6;
    const x0 = W * 0.04;
    // band + scrolling copy
    const bw = (W - x0) * eB;
    if (bw > 1) {
      env.rect(x0, bandY, bw, bandH, bandC, 1, false);
      if (env.pass === 'main') {
        const unit = flat(env.cut.lineText || text0) + '　◆　';
        const fs = bandH * 0.46;
        const per = rowW(unit, bodyF(env), fs);
        const reps = Math.min(40, Math.ceil(W * 1.2 / Math.max(1, per)) + 2);
        const off = ((env.ltb * p.speed * u * 0.22) % per + per) % per;
        ctx.save(); ctx.beginPath(); ctx.rect(x0 + tagW, bandY, Math.max(0, bw - tagW), bandH); ctx.clip();
        fastRow(env, unit.repeat(reps), bodyF(env), fs, x0 + tagW + ts * 0.8 - off, bandY + bandH / 2, 0, onCol(sc, bandC), 1);
        ctx.restore();
      }
    }
    // tag
    const tq = E.outBack(J.clamp((env.lt - 0.08) / 0.3), 1.6) * out;
    if (tq > 0.01) {
      const th = bandH * 1.0 * tq;
      env.rect(x0, bandY + bandH / 2 - th / 2 - bandH * 0.12 * tq, tagW, th + bandH * 0.24 * tq, tagC, 1, true);
      const tc = onCol(sc, tagC);
      if (env.step % 3 !== 0) env.circle(x0 + ts * 0.95, bandY + bandH / 2, ts * 0.28 * tq, tc, null, 0, 1, false);
      env.draw({ text: p.tag, font: monoF(env), size: ts * tq, track: 0.12, align: 'left', x: x0 + ts * 1.6, y: bandY + bandH / 2, color: tc, ghost: false });
    }
    // small time box above the band's right end
    const ca = J.clamp((eB - 0.7) * 3.3);
    if (ca > 0) {
      const tt = J.fmtTime(env.t), tsz = ts * 0.9, tw = meas(tt, monoF(env), tsz, { track: 0.08 }).w + tsz * 1.4;
      env.rect(W - W * 0.04 - tw, bandY - tsz * 1.7, tw, tsz * 1.7, sc.fg, ca, false);
      env.draw({ text: tt, font: monoF(env), size: tsz, track: 0.08, x: W - W * 0.04 - tw / 2, y: bandY - tsz * 0.85, color: onCol(sc, sc.fg), alpha: ca, ghost: false });
    }
    if (p.bug) {
      const a = tin(env, 0.2, 0.4, E.outCubic) * out, bs = smallSize(env) * 0.85;
      env.draw({ text: 'CH.' + lineNo(env), font: monoF(env), size: bs, track: 0.2, align: 'right', x: W * 0.95, y: H * 0.07, color: sc.sub, alpha: a, ghost: false });
      env.rect(W * 0.95 - bs * 0.3, H * 0.07 + bs * 0.9, bs * 0.3, bs * 0.3, sc.accent, a, false);
    }
    // headline
    const left = p.main === 'left';
    const text = brk(text0, port ? 6 : 11);
    const o = { track: 0.03, lead: 1.15 };
    const avail = bandY - H * 0.1;
    const size = Math.min(J.fitSize(text, p.font, W * 0.84, avail * 0.7, o), u * 0.2);
    const m = meas(text, p.font, size, o);
    const y = left ? bandY - bandH * 0.55 - m.h / 2 - size * 0.2 : H * 0.1 + avail / 2;
    const x = left ? x0 + size * 0.1 : W / 2;
    if (left) { const le = tin(env, 0.1, 0.5) * out; env.rect(x0, y - m.h / 2 - size * 0.28, Math.max(0, size * 1.2 * le), Math.max(3, size * 0.06), sc.accent, 1, false); }
    const bb = J.mainDraw(env, { text, font: p.font, size, x, y, align: left ? 'left' : 'center', track: 0.03, lead: 1.15, color: sc.fg });
    return bb || box(left ? x : x - m.w / 2, y - m.h / 2, left ? x + m.w : x + m.w / 2, y + m.h / 2);
  },
});

/* ======================================================================
   14  splitScreen — 二分割
   ====================================================================== */
reg('splitScreen', {
  name: '二分割', tags: ['graphic', 'pop', 'editorial'], w: 0.9, emph: 1.6, enterBias: { wipe: 1.5, slice: 1.4, stretch: 1.2 }, fits: n => n <= 14, busy: true, treat: false,
  plan: (rng, cut, st) => { const port = cut.H > cut.W * 1.08; return { font: rng.pick(fontsOf(st, ['display'])), split: port ? rng.pick(['h', 'diag', 'h']) : rng.pick(['v', 'diag', 'v', 'h']), plate: rng.pick(['fg', 'accent', 'fg']), side: rng.pick([1, -1]), tilt: rng.range(12, 22) }; },
  render(env) {
    const { W, H, sc, ctx } = env, p = env.cut.params, u = U(env), port = isPort(env);
    const tOff = J.contrast(sc.fg, sc.bg) > 2 ? sc.fg : onCol(sc, sc.bg);
    let plateC = p.plate === 'accent' ? sc.accent : sc.fg;
    if (onCol(sc, plateC) === tOff || J.contrast(plateC, sc.bg) < 1.6) plateC = sc.fg;     // keep the inversion readable
    const tOn = onCol(sc, plateC);
    const e = tin(env, 0, 0.5, E.outExpo) * (1 - E.inExpo(env.pOut));
    const sd = p.side;
    // plate polygon and its complement (animated: the boundary sweeps in from the plate's outer edge)
    let plate, other;
    if (p.split === 'h') {
      const by = H / 2 + sd * (1 - e) * H * 0.55;
      plate = sd > 0 ? [[-W, by], [2 * W, by], [2 * W, 2 * H], [-W, 2 * H]] : [[-W, -H], [2 * W, -H], [2 * W, by], [-W, by]];
      other = sd > 0 ? [[-W, -H], [2 * W, -H], [2 * W, by], [-W, by]] : [[-W, by], [2 * W, by], [2 * W, 2 * H], [-W, 2 * H]];
    } else {
      const dx = p.split === 'diag' ? Math.tan(p.tilt * J.DEG) * H / 2 : 0;
      const sh = sd * (1 - e) * (W * 0.55 + Math.abs(dx));
      const ta = [W / 2 + dx + sh, -H], tb = [W / 2 - dx * 3 + sh, 2 * H];
      const bx = (y) => W / 2 + dx - (2 * dx) * (y / H) + sh;
      const top = [bx(-H), -H], bot = [bx(2 * H), 2 * H];
      plate = sd > 0 ? [top, [3 * W, -H], [3 * W, 2 * H], bot] : [[-2 * W, -H], top, bot, [-2 * W, 2 * H]];
      other = sd > 0 ? [[-2 * W, -H], top, bot, [-2 * W, 2 * H]] : [top, [3 * W, -H], [3 * W, 2 * H], bot];
    }
    const clipTo = poly => { ctx.beginPath(); poly.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); ctx.closePath(); ctx.clip(); };
    if (e > 0) env.poly(plate, plateC, 1, false);
    const text = brk(env.cut.text.trim(), port ? 5 : 10);
    const o = { track: 0.02, lead: 1.08 };
    const size = Math.min(J.fitSize(text, p.font, W * 0.86, H * (p.split === 'h' ? 0.36 : 0.42), o), u * 0.3);
    const m = meas(text, p.font, size, o);
    const cy = p.split === 'h' ? H / 2 + (m.h > size * 1.5 ? 0 : size * 0.04) : H / 2;
    const it = () => ({ text, font: p.font, size, x: W / 2, y: cy, track: 0.02, lead: 1.08 });
    // labels on each half
    const la = tin(env, 0.25, 0.4, E.outCubic) * tout(env), ls = smallSize(env) * 0.9;
    let bb;
    ctx.save(); clipTo(other);
    bb = J.mainDraw(env, Object.assign(it(), { color: tOff }));
    if (la > 0) env.draw({ text: 'No.' + lineNo(env), font: monoF(env), size: ls, track: 0.15, align: sd > 0 ? 'left' : 'right', x: sd > 0 ? W * 0.05 : W * 0.95, y: sd > 0 || p.split !== 'h' ? H * 0.07 : H * 0.93, color: sc.sub, alpha: la, ghost: false });
    ctx.restore();
    if (env.pass === 'main' && e > 0) {
      ctx.save(); clipTo(plate);
      const b2 = J.mainDraw(env, Object.assign(it(), { color: tOn }));
      bb = J.unionBB(bb, b2);
      if (la > 0) env.draw({ text: romajiOf(env) || J.fmtTime(env.cut.start), font: monoF(env), size: ls, track: 0.15, align: sd > 0 ? 'right' : 'left', x: sd > 0 ? W * 0.95 : W * 0.05, y: sd > 0 || p.split !== 'h' ? H * 0.93 : H * 0.07, color: tOn, alpha: la, ghost: false });
      ctx.restore();
    }
    return bb || box(W / 2 - m.w / 2, cy - m.h / 2, W / 2 + m.w / 2, cy + m.h / 2);
  },
});

/* ======================================================================
   15  mirror — 鏡像
   ====================================================================== */
reg('mirror', {
  name: '鏡像', tags: ['calm', 'emotional', 'graphic'], w: 1, fits: n => n <= 16,
  plan: (rng, cut, st) => ({ font: rng.pick(fontsOf(st, ['display', 'serif'])), strength: rng.range(0.34, 0.5), squash: rng.pick([1, 0.7, 0.85]), ripple: rng.chance(0.5), ticks: rng.chance(0.6) }),
  render(env) {
    const { W, H, sc, ctx } = env, p = env.cut.params, u = U(env), port = isPort(env);
    const text = brk(env.cut.text.trim(), port ? 6 : 12);
    const o = { track: 0.04, lead: 1.15 };
    const size = Math.min(J.fitSize(text, p.font, W * 0.84, H * 0.3, o), u * 0.22);
    const m = meas(text, p.font, size, o);
    const RH = m.h * p.squash + size * 0.1;
    const cy = H / 2 - RH * 0.42;
    const hz = cy + m.h / 2 + size * 0.08;
    const out = tout(env);
    // horizon
    const e = tin(env, 0, 0.7, E.inOutCubic) * out;
    if (e > 0) {
      const hw = W * 0.44 * e;
      env.line([[W / 2 - hw, hz], [W / 2 + hw, hz]], sc.sub, Math.max(1.2, u * 0.0016), 0.85, false);
      if (p.ticks) {
        for (let k = -8; k <= 8; k++) {
          const x = W / 2 + k * W * 0.05;
          if (Math.abs(x - W / 2) > hw) continue;
          env.line([[x, hz - u * 0.006], [x, hz + u * 0.006 * (k % 4 === 0 ? 2 : 1)]], sc.sub, 1.2, 0.6, false);
        }
      }
      env.circle(W / 2 - hw, hz, u * 0.005, sc.accent, null, 0, 1, false);
      env.circle(W / 2 + hw, hz, u * 0.005, sc.accent, null, 0, 1, false);
    }
    const base = { text, font: p.font, size, x: W / 2, y: cy, track: 0.04, lead: 1.15, color: sc.fg };
    // reflection: flipped copies in horizontal strips, fading with depth
    if (env.pass === 'main') {
      const K = 9;
      for (let k = 0; k < K; k++) {
        const y0 = hz + RH * k / K, y1 = hz + RH * (k + 1) / K;
        const a = p.strength * Math.pow(1 - (k + 0.5) / K, 1.5);
        const dx = p.ripple ? Math.sin(env.ltb * 2.4 + k * 0.9) * size * 0.035 * (k + 1) / K : 0;
        ctx.save(); ctx.beginPath(); ctx.rect(-W, y0, W * 3, y1 - y0 + 0.6); ctx.clip();
        ctx.translate(dx, hz); ctx.scale(1, -p.squash); ctx.translate(0, -hz);
        J.mainDraw(env, Object.assign({}, base, { alpha: a, ghost: false, mi: 0 }));
        ctx.restore();
      }
    }
    const bb = J.mainDraw(env, Object.assign({}, base, { mi: 0 }));
    return bb || box(W / 2 - m.w / 2, cy - m.h / 2, W / 2 + m.w / 2, cy + m.h / 2);
  },
});

/* ======================================================================
   16  sideways — 縦倒し
   ====================================================================== */
reg('sideways', {
  name: '縦倒し', tags: ['editorial', 'graphic', 'pop'], w: 1, emph: 1.3, enterBias: { wipe: 1.4, slice: 1.3, stretch: 1.3 }, fits: n => n >= 3 && n <= 16, portrait: 1.3,
  plan: (rng, cut, st) => ({ font: rng.pick(fontsOf(st, ['display', 'display', 'serif'])), side: rng.pick(['left', 'right']), copy: rng.pick(['stack', 'number']), rule: rng.chance(0.75) }),
  render(env) {
    const { W, H, sc, ctx } = env, p = env.cut.params, u = U(env), port = isPort(env);
    const t0 = env.cut.text.trim(), n = J.glyphCount(t0);
    const text = (port ? n > 12 : n > 6) ? brk(t0, Math.ceil(n / 2)) : t0;
    const o = { track: 0.02, lead: 1.02 };
    const L = H * 0.88, T = W * (port ? 0.4 : 0.3);
    const size = Math.min(J.fitSize(text, p.font, L, T, o), u * (port ? 0.34 : 0.3));
    const m = meas(text, p.font, size, o);
    const left = p.side === 'left';
    const mx = W * 0.05;
    const cx = left ? mx + m.h / 2 : W - mx - m.h / 2;
    const rot = left ? -90 : 90;
    const out = tout(env);
    // divider rule
    const rx = left ? cx + m.h / 2 + W * 0.035 : cx - m.h / 2 - W * 0.035;
    if (p.rule) {
      const e = tin(env, 0.05, 0.6, E.inOutCubic) * out;
      env.line([[rx, H * 0.06], [rx, H * 0.06 + H * 0.88 * e]], sc.accent, Math.max(2, u * 0.003), 1, false);
    }
    // horizontal copy block in the free area
    const ax0 = left ? rx + W * 0.04 : W * 0.07, ax1 = left ? W * 0.93 : rx - W * 0.04;
    const aw = ax1 - ax0;
    const ca = tin(env, 0.2, 0.45, E.outCubic) * out;
    if (ca > 0.01 && aw > u * 0.2) {
      const ls = smallSize(env);
      const copy = env.cut.lineText || env.cut.text;
      const cs = Math.min(u * 0.05, J.fitSize(brk(copy, Math.max(4, Math.floor(aw / (u * 0.05)))), bodyF(env), aw, H * 0.3, { lead: 1.5 }));
      const ct = brk(copy, Math.max(4, Math.floor(aw / (cs * 1.02))));
      const cm = meas(ct, bodyF(env), cs, { lead: 1.5 });
      const sl = (1 - ca) * u * 0.03;
      if (p.copy === 'number') {
        const ns = Math.min(aw * 0.5, H * 0.3);
        env.draw({ text: lineNo(env), font: p.font, size: ns, align: 'left', x: ax0 - ns * 0.04, y: H * 0.1 + ns * 0.45 + sl, fill: false, stroke: Math.max(1.5, ns * 0.012), strokeColor: sc.sub, alpha: ca, ghost: false });
      } else {
        env.draw({ text: 'No.' + lineNo(env), font: monoF(env), size: ls, track: 0.15, align: 'left', x: ax0, y: H * 0.1 + sl, color: sc.accent, alpha: ca, ghost: false });
        env.draw({ text: J.fmtTime(env.cut.start), font: monoF(env), size: ls, track: 0.15, align: 'left', x: ax0, y: H * 0.1 + ls * 1.6 + sl, color: sc.sub, alpha: ca, ghost: false });
      }
      const by = H * 0.9 - cm.h / 2;
      env.draw({ text: ct, font: bodyF(env), size: cs, lead: 1.5, align: 'left', x: ax0, y: by - sl, color: sc.fg, alpha: ca * 0.9, ghost: false });
      const rom = romajiOf(env);
      if (rom && rom !== copy) env.draw({ text: rom, font: monoF(env), size: ls * 0.85, track: 0.2, align: 'left', x: ax0, y: by - cm.h / 2 - ls * 1.4 - sl, color: sc.sub, alpha: ca, ghost: false });
    }
    ctx.save(); ctx.translate(cx, H / 2); ctx.rotate(rot * J.DEG);
    const bb = J.mainDraw(env, { text, font: p.font, size, x: 0, y: 0, track: 0.02, lead: 1.02, color: sc.fg });
    ctx.restore();
    const B = box(cx - m.h / 2, H / 2 - m.w / 2, cx + m.h / 2, H / 2 + m.w / 2);
    return bb ? B : null;
  },
});

/* ======================================================================
   17  edgeFrame — 外周
   ====================================================================== */
reg('edgeFrame', {
  name: '外周', tags: ['graphic', 'editorial', 'glitch'], w: 0.9, fits: n => n <= 16, busy: true,
  plan: (rng, cut, st) => ({ font: rng.pick(fontsOf(st, ['display', 'serif'])), edgeFont: rng.pick(['body', 'mono']), sep: rng.pick(['　／　', '　・　', '　—　']), speed: rng.range(0.6, 1.2) * rng.pick([1, -1]), corner: rng.pick(['square', 'cross']), inner: rng.chance(0.6) }),
  render(env) {
    const { W, H, sc, ctx } = env, p = env.cut.params, u = U(env), port = isPort(env);
    const d = u * 0.045, es = u * 0.024, band = es * 1.7;
    const out = tout(env);
    const ef = p.edgeFont === 'mono' ? monoF(env) : bodyF(env);
    const unit = flat(env.cut.lineText || env.cut.text) + p.sep;
    const per = Math.max(1, rowW(unit, ef, es) + [...unit].length * es * 0.08);
    const edges = [[d + band, d, W - 2 * d - 2 * band, 0], [W - d, d + band, H - 2 * d - 2 * band, 90], [W - d - band, H - d, W - 2 * d - 2 * band, 180], [d, H - d - band, H - 2 * d - 2 * band, 270]];
    if (env.pass === 'main') {
      edges.forEach(([x, y, len, ang], k) => {
        const e = tin(env, k * 0.07, 0.5, E.inOutCubic) * out;
        if (e <= 0.001) return;
        const reps = Math.min(60, Math.ceil(len / per) + 2);
        const off = ((env.ltb * p.speed * u * 0.07) % per + per) % per;
        ctx.save(); ctx.translate(x, y); ctx.rotate(ang * J.DEG);
        ctx.beginPath(); ctx.rect(0, -band / 2, len * e, band); ctx.clip();
        fastRow(env, unit.repeat(reps), ef, es, -per + off, 0, es * 0.08, sc.sub, 0.85);
        ctx.restore();
      });
    }
    // corner marks
    const cq = E.outBack(J.clamp((env.lt - 0.1) / 0.3), 2) * out;
    if (cq > 0) {
      [[d, d], [W - d, d], [W - d, H - d], [d, H - d]].forEach(([x, y]) => {
        if (p.corner === 'square') { const q = es * 0.55 * cq; env.rect(x - q / 2, y - q / 2, q, q, sc.accent, 1, false); }
        else { const q = es * 0.6 * cq, lw = Math.max(1.5, es * 0.08); env.line([[x - q, y], [x + q, y]], sc.accent, lw, 1, false); env.line([[x, y - q], [x, y + q]], sc.accent, lw, 1, false); }
      });
    }
    if (p.inner) {
      const e = tin(env, 0.15, 0.8, E.inOutCubic) * out, g = d + band * 0.95;
      env.polyPartial([[g, g], [W - g, g], [W - g, H - g], [g, H - g], [g, g]], e, sc.sub, 1.2, 0.45, false);
    }
    const text = brk(env.cut.text.trim(), port ? 6 : 11);
    const o = { track: 0.04, lead: 1.15 };
    const size = Math.min(J.fitSize(text, p.font, W * 0.72, H * 0.5, o), u * 0.22);
    const bb = J.mainDraw(env, { text, font: p.font, size, x: W / 2, y: H / 2, track: 0.04, lead: 1.15, color: sc.fg });
    return bb || J.centerBB(env, null);
  },
});

/* ======================================================================
   18  perspective — 奥行き
   ====================================================================== */
reg('perspective', {
  name: '奥行き', tags: ['graphic', 'emotional', 'glitch'], w: 0.9, emph: 1.3, enterBias: { zoom: 1.6, stretch: 1.3 }, fits: n => n <= 14,
  plan: (rng, cut, st) => ({ font: rng.pick(fontsOf(st, ['display'])), mode: rng.pick(['floor', 'side', 'floor']), copies: rng.int(4, 6), speed: rng.range(0.25, 0.45), guides: rng.chance(0.7), vx: rng.pick([1, -1]) }),
  render(env) {
    const { W, H, sc } = env, p = env.cut.params, u = U(env), port = isPort(env);
    const text = brk(env.cut.text.trim(), port ? 6 : 12);
    const o = { track: 0.03, lead: 1.1 };
    const side = p.mode === 'side';
    const size = Math.min(J.fitSize(text, p.font, W * (side ? 0.7 : 0.84), H * 0.22, o), u * 0.18);
    const m = meas(text, p.font, size, o);
    const x0 = side ? W / 2 - p.vx * W * 0.12 : W / 2, y0 = H * 0.74 - m.h / 2 + size * 0.5;
    const V = side ? [W / 2 + p.vx * W * 0.36, H * 0.12] : [W / 2, H * 0.1];
    const out = tout(env);
    const K = p.copies;
    const ph = (env.ltb * p.speed) % 1;
    const D = Math.hypot(x0 - V[0], y0 - V[1]) * (Math.abs(y0 - V[1]) / Math.max(1, Math.hypot(x0 - V[0], y0 - V[1])));
    const sy0 = side ? 1 : 0.8;
    const X = 2 * D / (m.h * sy0 * 1.35);
    const r = J.clamp((X - 1) / (X + 1), 0.45, 0.8);
    const at = z => { const k = Math.pow(r, z); return { k, x: V[0] + (x0 - V[0]) * k, y: V[1] + (y0 - V[1]) * k }; };
    // perspective rails from the front copy to the vanishing point
    if (p.guides) {
      const e = tin(env, 0, 0.8, E.inOutCubic) * out;
      if (e > 0) {
        const hw = m.w / 2 + size * 0.3, yb = y0 + m.h / 2 + size * 0.12;
        [[x0 - hw, yb], [x0 + hw, yb]].forEach(q => env.polyPartial([q, V], e, sc.sub, 1.2, 0.4, false));
        env.circle(V[0], V[1], u * 0.005, sc.accent, null, 0, e, false);
      }
    }
    // receding copies (drift slowly back into the distance)
    const ca = tin(env, 0.05, 0.4, E.outCubic) * out;
    for (let j = K; j >= 1; j--) {
      const z = j + ph;
      const q = at(z);
      const a = ca * J.clamp((z - 1) / 0.6) * J.clamp((K + 1 - z) / 1.2) * (0.8 - 0.45 * (z / (K + 1)));
      if (a <= 0.01) continue;
      const sk = side ? -p.vx * 14 * (1 - q.k) : 0;
      env.draw({ text, font: p.font, size: size * q.k, sy: side ? 1 : 0.8, skew: sk, x: q.x, y: q.y, track: 0.03, lead: 1.1, color: sc.sub, alpha: a, ghost: false });
    }
    const bb = J.mainDraw(env, { text, font: p.font, size, x: x0, y: y0, track: 0.03, lead: 1.1, color: sc.fg });
    return bb || box(x0 - m.w / 2, y0 - m.h / 2, x0 + m.w / 2, y0 + m.h / 2);
  },
});

/* ======================================================================
   19  hanko — 落款
   ====================================================================== */
function sealGlyphs(text) {
  const g = [...strip(text)].filter(c => !J.isPunct(c) && !J.isSmallKana(c));
  const kan = g.filter(c => J.isKanji(c));
  if (kan.length >= 2 || (kan.length === 1 && g.length > 4)) return kan.slice(0, 4);
  if (g.length <= 4) return g.length ? g : [...strip(text)].slice(0, 1);
  return g.slice(0, 2);
}
reg('hanko', {
  name: '落款', tags: ['calm', 'emotional', 'editorial'], w: 0.8, emph: 1.3, enterBias: { blur: 1.6, wipe: 1.3, type: 1.2 }, fits: n => n >= 1 && n <= 10, portrait: 1.2,
  plan: (rng, cut, st) => ({ font: rng.pick(fontsOf(st, ['serif'])), sealFont: rng.pick(fontsOf(st, ['serif', 'display'])), vert: cut.H > cut.W * 1.08 ? true : rng.chance(0.6), seal: rng.pick(['haku', 'shu', 'haku']), rot: rng.range(-7, 7) }),
  render(env) {
    const { W, H, sc, ctx } = env, p = env.cut.params, u = U(env), port = isPort(env);
    const text = strip(env.cut.text);
    const n = J.glyphCount(text);
    const out = tout(env);
    let size, bbox, sx, sy, S, it;
    if (p.vert) {
      const cols = n > (port ? 8 : 6) ? 2 : 1;
      const vt = cols > 1 ? brk(text, Math.ceil(n / 2)) : text;
      const per = Math.max(...vt.split('\n').map(l => J.glyphCount(l)));
      size = Math.min(H * 0.7 / Math.max(per, 2.5), u * 0.2, W * 0.3 / cols);
      S = size * (n <= 2 ? 1.35 : 1.5);
      const lead = 1.35, bw = size * (1 + (cols - 1) * lead);
      const colH = per * size;
      const x = W / 2 + S * 0.45 + (cols - 1) * size * lead / 2, top = H / 2 - colH / 2 - S * 0.25;
      it = { text: vt, font: p.font, size, x, y: top, vertical: true, align: 'left', lead, color: sc.fg };
      bbox = box(x - bw / 2, top, x + bw / 2, top + colH);
      const lastLen = J.glyphCount(vt.split('\n').pop());
      sx = x - bw / 2 - S * 0.72; sy = Math.max(top + lastLen * size, top + S * 0.5) + S * 0.1;
    } else {
      size = Math.min(J.fitSize(text, p.font, W * 0.6, H * 0.3), u * 0.17);
      S = size * 1.7;
      const m = meas(text, p.font, size);
      const x = W / 2 - S * 0.5, y = H / 2;
      it = { text, font: p.font, size, x, y, color: sc.fg };
      bbox = box(x - m.w / 2, y - m.h / 2, x + m.w / 2, y + m.h / 2);
      sx = x + m.w / 2 + S * 0.75; sy = y + size * 0.3;
    }
    const bb = J.mainDraw(env, it);
    // the seal thumps in after the lyric has landed
    const t0 = env.cut.inDur * 0.7 + 0.08, x = (env.lt - t0) / 0.2;
    if (x > 0 && out > 0) {
      const sc2 = J.lerp(1.55, 1, E.outBack(J.clamp(x), 1.4));
      const a = J.clamp(x * 3) * out;
      const shake = x > 1 && x < 1.8 ? J.rs(env.step, 91) * S * 0.015 * (1.8 - x) : 0;
      ctx.save(); ctx.translate(sx + shake, sy); ctx.rotate(p.rot * J.DEG); ctx.scale(sc2, sc2);
      const pts = [], M = 11, seed = env.cut.seed | 0;
      const jit = (i, k) => J.rs(seed, i, k, 3) * S * 0.014;
      for (let i = 0; i < M; i++) pts.push([-S / 2 + S * i / M, -S / 2 + jit(i, 1)]);
      for (let i = 0; i < M; i++) pts.push([S / 2 + jit(i, 2), -S / 2 + S * i / M]);
      for (let i = 0; i < M; i++) pts.push([S / 2 - S * i / M, S / 2 + jit(i, 3)]);
      for (let i = 0; i < M; i++) pts.push([-S / 2 + jit(i, 4), S / 2 - S * i / M]);
      const G = sealGlyphs(text), gn = G.length;
      const cols = gn >= 3 ? 2 : 1, rows = Math.ceil(gn / cols);
      const inner = S * (p.seal === 'haku' ? 0.8 : 0.72);
      const cw = inner / cols, chh = inner / rows;
      const gs = Math.min(cw, chh) * 0.92, gsx = J.clamp(cw / chh, 0.8, 1.7);
      const gcol = p.seal === 'haku' ? sc.bg : sc.accent;
      if (p.seal === 'haku') env.poly(pts, sc.accent, a, true);
      else { env.line(closeLoop(pts), sc.accent, S * 0.07, a, true); }
      G.forEach((ch, i) => {
        const col = cols - 1 - Math.floor(i / rows), row = i % rows;   // right column first, top to bottom
        const gx = -inner / 2 + cw * (col + 0.5), gy = -inner / 2 + chh * (row + 0.5);
        env.draw({ text: ch, font: p.sealFont, size: gs, sx: gs * gsx > cw ? cw / gs : gsx, x: gx, y: gy, color: gcol, alpha: a, ghost: false });
      });
      if (p.seal === 'haku') {
        for (let i = 0; i < 12; i++) env.circle(J.rs(seed, i, 5) * S * 0.46, J.rs(seed, i, 6) * S * 0.46, S * J.rr(0.004, 0.012, seed, i, 7), sc.bg, null, 0, a * 0.9, false);
      }
      ctx.restore();
    }
    return bb ? bbox : null;
  },
});

/* ======================================================================
   20  genkou — 原稿用紙
   ====================================================================== */
reg('genkou', {
  name: '原稿用紙', tags: ['calm', 'editorial', 'emotional'], w: 0.8, enterBias: { type: 2.2, blur: 1.4, assemble: 1.3 }, fits: n => n <= 22, portrait: 1.2,
  plan: (rng, cut, st) => ({ font: rng.pick(fontsOf(st, ['serif'])), lineC: rng.pick(['accent', 'sub']), indent: rng.chance(0.5), pad: rng.int(2, 4) }),
  render(env) {
    const { W, H, sc } = env, p = env.cut.params, u = U(env), port = isPort(env);
    const chars = [...strip(env.cut.text)], n = chars.length;
    const ind = p.indent ? 1 : 0;
    const maxR = port ? 14 : 10;
    const used = Math.ceil((n + ind) / maxR);
    const R = Math.max(7, Math.ceil((n + ind) / used) + (used === 1 && n + ind < maxR ? 1 : 0));
    const gapK = 0.3;
    const cell = Math.min(H * 0.78 / R, W * 0.9 / ((used + 2) * (1 + gapK)));
    const colW = cell * (1 + gapK);
    const C = Math.max(used + 2, Math.min(Math.floor(W * 0.92 / colW), used + p.pad * 2));
    const gw = C * colW - cell * gapK, gh = R * cell;
    const gx0 = W / 2 - gw / 2, gy0 = H / 2 - gh / 2;
    const cStart = Math.floor((C - used) / 2);                    // column index counted from the right
    const colX = c => gx0 + gw - cell - c * colW;                 // left edge of column c (from the right)
    const lc = p.lineC === 'accent' ? sc.accent : sc.sub;
    const out = tout(env);
    const lw = Math.max(1.5, cell * 0.02);
    for (let c = 0; c < C; c++) {
      const e = tin(env, c * 0.035, 0.45, E.inOutCubic) * out;
      if (e <= 0) continue;
      const x = colX(c), dist = Math.abs(c - (cStart + (used - 1) / 2)) / Math.max(1, C / 2);
      const a = 0.85 * (1 - dist * 0.6);
      env.line([[x, gy0], [x, gy0 + gh * e]], lc, lw, a, false);
      env.line([[x + cell, gy0], [x + cell, gy0 + gh * e]], lc, lw, a, false);
      for (let r = 0; r <= R; r++) { const y = gy0 + r * cell; if (y > gy0 + gh * e + 0.5) break; env.line([[x, y], [x + cell, y]], lc, lw, a * (r === 0 || r === R ? 1 : 0.8), false); }
    }
    const fa = tin(env, 0.3, 0.4, E.outCubic) * out;
    if (fa > 0) {
      const fs = Math.max(11, cell * 0.14);
      env.draw({ text: '(' + R + '×' + C + ')', font: monoF(env), size: fs, align: 'left', x: gx0, y: gy0 + gh + fs * 1.4, color: lc, alpha: fa * 0.8, ghost: false });
      env.draw({ text: 'No.' + lineNo(env), font: monoF(env), size: fs, align: 'right', x: gx0 + gw, y: gy0 + gh + fs * 1.4, color: lc, alpha: fa * 0.8, ghost: false });
    }
    let bb = null;
    chars.forEach((ch, i) => {
      const k = i + ind, c = cStart + Math.floor(k / R), r = k % R;
      let x = colX(c) + cell / 2, y = gy0 + (r + 0.5) * cell, rot = 0;
      if (J.isSmallKana(ch)) { x += cell * 0.1; y -= cell * 0.1; }
      if ('、。，．'.includes(ch)) { x += cell * 0.28; y -= cell * 0.28; }
      if (J.VERT_ROTATE.includes(ch) || J.isLatin(ch)) rot = 90;
      bb = J.unionBB(bb, J.mainDraw(env, { text: ch, font: p.font, size: cell * 0.8, x, y, rot, color: sc.fg, mi: i }));
    });
    return bb || box(colX(cStart + used - 1), gy0, colX(cStart) + cell, gy0 + gh);
  },
});

/* ======================================================================
   21  panels — コマ割り
   ====================================================================== */
function clipHalf(poly, nx, ny, c) {            // keep the part with nx*x + ny*y <= c
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    const da = nx * a[0] + ny * a[1] - c, db = nx * b[0] + ny * b[1] - c;
    if (da <= 0) out.push(a);
    if ((da <= 0) !== (db <= 0)) { const t = da / (da - db); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); }
  }
  return out;
}
const pathOf = (ctx, poly) => { ctx.beginPath(); poly.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); ctx.closePath(); };
reg('panels', {
  name: 'コマ割り', tags: ['pop', 'graphic', 'emotional'], w: 0.9, emph: 1.4, enterBias: { pop: 1.4, zoom: 1.3, slice: 1.2 }, fits: n => n >= 2 && n <= 18, busy: true, treat: 'safe',
  plan: (rng, cut, st) => { const k = cut.n >= 6 ? 3 : 2; return { chunks: splitK(cut.text, k, 2), font: rng.pick(fontsOf(st, ['display', 'serif'])), acc: rng.int(0, 2), fx: rng.pick(['focus', 'tone', 'focus', 'none']), slant: rng.range(5, 11), widths: [rng.range(0.8, 1.25), rng.range(0.8, 1.25), rng.range(0.8, 1.25)] }; },
  render(env) {
    const { W, H, sc, ctx } = env, p = env.cut.params, u = U(env), port = isPort(env);
    let ch = p.chunks && p.chunks.length ? p.chunks : splitK(env.cut.text, 2, 2);
    const k = ch.length;
    const m = u * 0.05, g = u * 0.028, lw = Math.max(3, u * 0.0065);
    const out = tout(env);
    // panel boundaries along the reading axis (landscape: right→left columns, portrait: top→bottom rows)
    const L = port ? H - 2 * m : W - 2 * m, cross = port ? W - 2 * m : H - 2 * m;
    const ws = ch.map((c, i) => Math.sqrt(J.glyphCount(c) + 2) * (p.widths[i % 3] || 1));
    const tot = ws.reduce((a, b) => a + b, 0);
    const sl = Math.min(Math.tan(p.slant * J.DEG) * cross / 2, L / k * 0.18);
    const bounds = [0]; let acc = 0; ws.forEach(w => { acc += w; bounds.push(acc / tot * L); });
    const polys = [];
    for (let i = 0; i < k; i++) {
      const a = bounds[i], b = bounds[i + 1];
      const sa = i === 0 ? 0 : sl * (i % 2 ? 1 : -1), sb = i === k - 1 ? 0 : sl * ((i + 1) % 2 ? 1 : -1);
      const a0 = a + (i === 0 ? 0 : g / 2), b0 = b - (i === k - 1 ? 0 : g / 2);
      // in reading-axis coordinates: (t, c) with c in [0, cross]
      const q = [[a0 + sa, 0], [b0 + sb, 0], [b0 - sb, cross], [a0 - sa, cross]];
      const poly = q.map(([t, c]) => (port ? [m + c, m + t] : [W - m - t, m + c]));
      poly.along = Math.min((b0 + sb) - (a0 + sa), (b0 - sb) - (a0 - sa));
      polys.push(poly);
    }
    const stag = Math.max(0.01, env.cut.stagger || 0.04);
    let bb = null;
    polys.forEach((poly, i) => {
      const d = 0.06 + i * 0.16, e = E.inOutCubic(J.clamp((env.lt - d) / 0.3));
      if (e <= 0) return;
      // wipe along the reading direction
      let rev = poly;
      if (e < 1) {
        const xs = poly.map(q => (port ? q[1] : -q[0])), lo = Math.min(...xs), hi = Math.max(...xs);
        rev = clipHalf(poly, port ? 0 : -1, port ? 1 : 0, lo + (hi - lo) * e);
      }
      if (rev.length < 3) return;
      const accent = i === p.acc % k;
      const cx = poly.reduce((a, q) => a + q[0], 0) / 4, cy = poly.reduce((a, q) => a + q[1], 0) / 4;
      const pw = port ? cross : poly.along, ph = port ? poly.along : cross;
      const iw = pw * 0.8, ih = ph * 0.8;
      const vert = ih > iw * 1.25 && !hasLatin(ch[i]);
      const c0 = vert ? strip(ch[i]) : ch[i], cn = J.glyphCount(c0);
      let txt = c0, size = J.fitSize(c0, p.font, Math.max(10, iw), Math.max(10, ih), { vertical: vert, lead: 1.15 });
      if (cn >= 4) { const t2 = brk(c0, Math.ceil(cn / 2)), s2 = J.fitSize(t2, p.font, Math.max(10, iw), Math.max(10, ih), { vertical: vert, lead: 1.15 }); if (s2 > size * 1.15) { txt = t2; size = s2; } }
      size = Math.min(size, u * 0.24);
      if (accent) env.poly(rev, sc.ink, out, false);
      if (env.pass === 'main' && out > 0) {
        ctx.save(); pathOf(ctx, rev); ctx.clip();
        if (accent && p.fx === 'focus') {
          const R0 = Math.hypot(pw, ph), rin = size * (vert ? 0.9 : 0.75) + Math.max(0, (vert ? J.glyphCount(txt) * size : meas(txt, p.font, size).w) * 0.35);
          for (let j = 0; j < 48; j++) {
            const ang = (j / 48 + J.r(env.cut.seed, j, 61) * 0.01) * J.TAU, r1 = rin * (1 + J.r(env.cut.seed, j, 62) * 0.5);
            env.line([[cx + Math.cos(ang) * R0, cy + Math.sin(ang) * R0], [cx + Math.cos(ang) * r1, cy + Math.sin(ang) * r1]], onCol(sc, sc.ink), 1 + J.r(env.cut.seed, j, 63) * 2.5, 0.22 * out, false);
          }
        }
        if (!accent && p.fx === 'tone' && i === (p.acc + 1) % k) {
          ctx.globalAlpha = 0.3 * out; ctx.fillStyle = J.textPattern(ctx, 'dots', sc.sub, null, u * 0.12, env.scale || 1); pathOf(ctx, rev); ctx.fill(); ctx.globalAlpha = 1;
        }
        ctx.restore();
      }
      env.line(closeLoop(rev), sc.fg, lw, out, false);
      ctx.save(); pathOf(ctx, rev); ctx.clip();
      const it = vert ? { text: txt, font: p.font, size, x: cx, y: cy, vertical: true, color: accent ? onCol(sc, sc.ink) : sc.fg, mi: (d + 0.08) / stag }
        : { text: txt, font: p.font, size, x: cx, y: cy, lead: 1.15, color: accent ? onCol(sc, sc.ink) : sc.fg, mi: (d + 0.08) / stag };
      bb = J.unionBB(bb, J.mainDraw(env, it));
      ctx.restore();
    });
    return bb || box(m, m, W - m, H - m);
  },
});

/* ======================================================================
   22  filmstrip — フィルム
   ====================================================================== */
reg('filmstrip', {
  name: 'フィルム', tags: ['emotional', 'calm', 'graphic'], w: 0.8, fits: n => n >= 1 && n <= 18, busy: true, treat: 'safe', portrait: 0.8,
  plan: (rng, cut, st) => ({ chunks: splitK(cut.text, Math.min(3, cut.n), cut.n <= 4 ? 3 : 2), font: rng.pick(fontsOf(st, ['display', 'serif'])), dir: rng.pick([1, -1]), tone: rng.pick(['ink', 'fg']), codes: rng.chance(0.75), tilt: rng.pick([0, 0, -3, 3]) }),
  render(env) {
    const { W, H, sc, ctx } = env, p = env.cut.params, u = U(env), port = isPort(env);
    let ch = p.chunks && p.chunks.length ? p.chunks.slice(0, 3) : [env.cut.text];
    const slots = ch.length === 3 ? ch : ch.length === 2 ? [ch[0], ch[1], null] : [null, ch[0], null];
    const v = port;                                          // vertical strip in portrait
    const A = v ? H : W, Bd = v ? W : H;                      // along / across
    const fw0 = Math.min(A * 0.88 / 3.2, Bd * 0.62 * 1.3);    // frame length along the strip
    const fh = fw0 / 1.3, band = fh / 0.72, gap = fw0 * 0.08, pitch = fw0 + gap;
    const stripC = p.tone === 'fg' ? sc.fg : sc.ink;
    const tcol = onCol(sc, sc.bg) === sc.bg ? sc.fg : onCol(sc, sc.bg);
    const eIn = tin(env, 0, 0.6, E.outExpo), eOut = E.inExpo(env.pOut);
    const off = (1 - eIn) * A * 0.9 * p.dir - eOut * A * 1.4 * p.dir + (env.ltb - env.cut.dur / 2) * u * 0.03 * p.dir;
    const fa = 1 - J.smooth(0.55, 1, env.pOut);
    const P2 = (a, b) => (v ? [W / 2 + b, a] : [a, H / 2 + b]);   // (along, across) → screen
    ctx.save(); ctx.translate(W / 2, H / 2); ctx.rotate(p.tilt * J.DEG); ctx.translate(-W / 2, -H / 2);
    // band
    const bandLen = A * 1.6, c0 = A / 2 + off;
    if (v) env.rect(W / 2 - band / 2, c0 - bandLen / 2, band, bandLen, stripC, fa, false);
    else env.rect(c0 - bandLen / 2, H / 2 - band / 2, bandLen, band, stripC, fa, false);
    // sprocket holes
    const hp = band * 0.11, hw = hp * 0.55, hh = hp * 0.72, hm = (band - fh) / 4;
    const nH = Math.min(120, Math.ceil(bandLen / hp));
    for (let i = 0; i < nH; i++) {
      const a = c0 - bandLen / 2 + (i + 0.5) * hp;
      if (a < -hp || a > A + hp) continue;
      [-1, 1].forEach(sd => {
        const q = P2(a, sd * (band / 2 - hm));
        if (v) env.rrect(q[0] - hh / 2, q[1] - hw / 2, hh, hw, hw * 0.25, sc.bg, fa, false);
        else env.rrect(q[0] - hw / 2, q[1] - hh / 2, hw, hh, hw * 0.25, sc.bg, fa, false);
      });
    }
    // edge codes
    if (p.codes) {
      const cs = Math.max(10, hm * 0.9), ca = J.clamp(eIn * 2 - 1) * fa;
      for (let i = -2; i <= 2; i++) {
        const a = c0 + i * pitch - pitch / 2;
        const q = P2(a, (band / 2 - hm * 2.2) * (v ? 1 : -1));
        env.draw({ text: '▸' + (12 + i + (env.cut.index | 0)) + (i % 2 ? 'A' : ''), font: monoF(env), size: cs, x: q[0], y: q[1], rot: v ? 90 : 0, color: sc.accent, alpha: ca * 0.9, ghost: false });
      }
    }
    // frames (one type size for the whole strip)
    const stag = Math.max(0.01, env.cut.stagger || 0.04);
    const fwX0 = v ? fh : fw0, fhY0 = v ? fw0 : fh;
    const fsz = Math.min(u * 0.2, ...slots.filter(Boolean).map(t => J.fitSize(brk(t, v ? 6 : 4), p.font, fwX0 * 0.8, fhY0 * 0.7, { lead: 1.1 })));
    let bb = null;
    slots.forEach((t, i) => {
      const a = c0 + (i - 1) * pitch;
      const q = P2(a, 0), fx0 = v ? q[0] - fh / 2 : q[0] - fw0 / 2, fy0 = v ? q[1] - fw0 / 2 : q[1] - fh / 2, fwX = v ? fh : fw0, fhY = v ? fw0 : fh;
      env.rrect(fx0, fy0, fwX, fhY, fh * 0.04, sc.bg, fa, false);
      ctx.save(); ctx.beginPath(); ctx.rect(fx0, fy0, fwX, fhY); ctx.clip();
      if (t) {
        const tt = brk(t, v ? 6 : 4), size = fsz;
        bb = J.unionBB(bb, J.mainDraw(env, { text: tt, font: p.font, size, x: q[0], y: q[1], lead: 1.1, color: tcol, mi: 0.15 * i / stag }));
      } else {
        const r = Math.min(fwX, fhY) * 0.3, la = J.clamp(eIn * 2 - 1) * fa;
        env.circle(q[0], q[1], r, null, sc.sub, 1.5, 0.5 * la, false);
        env.line([[q[0] - r * 1.4, q[1]], [q[0] + r * 1.4, q[1]]], sc.sub, 1.2, 0.4 * la, false);
        env.line([[q[0], q[1] - r * 1.4], [q[0], q[1] + r * 1.4]], sc.sub, 1.2, 0.4 * la, false);
        env.draw({ text: String(i === 0 ? 3 : 1), font: p.font, size: r * 1.1, x: q[0], y: q[1], color: sc.sub, alpha: 0.6 * la, ghost: false });
      }
      ctx.restore();
    });
    ctx.restore();
    return bb || box(W / 2 - (v ? fh : fw0 * 1.6) / 2, H / 2 - (v ? fw0 * 1.6 : fh) / 2, W / 2 + (v ? fh : fw0 * 1.6) / 2, H / 2 + (v ? fw0 * 1.6 : fh) / 2);
  },
});

/* ======================================================================
   23  quote — 引用
   ====================================================================== */
reg('quote', {
  name: '引用', tags: ['editorial', 'emotional', 'calm'], w: 1, emph: 1.2, enterBias: { blur: 1.4, type: 1.3, wipe: 1.2 }, fits: n => n <= 20,
  plan: (rng, cut, st) => ({ font: rng.pick(fontsOf(st, ['serif', 'display'])), markFont: rng.pick(fontsOf(st, ['serif'])), marks: /[A-Za-z]/.test(cut.text) ? 'latin' : rng.pick(['kagi', 'double', 'kagi']), markC: rng.pick(['accent', 'sub']), attrib: rng.chance(0.75) }),
  render(env) {
    const { W, H, sc } = env, p = env.cut.params, u = U(env), port = isPort(env);
    const text = brk(env.cut.text.trim(), port ? 6 : 11);
    const o = { track: 0.04, lead: 1.25 };
    const size = Math.min(J.fitSize(text, p.font, W * (port ? 0.58 : 0.62), H * 0.4, o), u * 0.16);
    const m = meas(text, p.font, size, o);
    const cy = H / 2 - (p.attrib ? size * 0.25 : 0);
    const bx0 = W / 2 - m.w / 2, bx1 = W / 2 + m.w / 2, by0 = cy - m.h / 2, by1 = cy + m.h / 2;
    const out = tout(env);
    const e = E.outExpo(J.clamp((env.lt - 0.02) / 0.5)) * (1 - E.inCubic(env.pOut));
    const mc = p.markC === 'accent' ? sc.accent : sc.sub;
    const latin = p.marks === 'latin';
    const [o1, c1] = latin ? ['\u201C', '\u201D'] : p.marks === 'double' ? ['\u300E', '\u300F'] : ['\u300C', '\u300D'];
    const ia = inkBox(p.markFont, o1), ib = inkBox(p.markFont, c1);
    const gap = size * 0.2, inkW = Math.max(0.05, ia.r - ia.l, ib.r - ib.l);
    const ms = Math.min(Math.max(size * (latin ? 3.2 : 4), m.h * 1.8), u * 0.5, (W * 0.94 - m.w - gap * 2) / (2 * inkW));
    const far = u * 0.35 * (1 - e);
    if (e > 0.001) {
      const al = J.clamp(e * 1.5);
      const ax = bx0 - gap - ia.r * ms - far, ay = by0 - size * 0.1 - ia.t * ms - far * 0.6;
      const bxx = bx1 + gap - ib.l * ms + far, byy = (latin ? by1 - size * 0.95 - ib.t * ms : by1 + size * 0.1 - ib.b * ms) + far * 0.6;
      env.draw({ text: o1, font: p.markFont, size: ms, x: ax, y: ay, color: mc, alpha: al, ghost: false });
      env.draw({ text: c1, font: p.markFont, size: ms, x: bxx, y: byy, color: mc, alpha: al, ghost: false });
    }
    if (p.attrib) {
      const a = tin(env, 0.35, 0.4, E.outCubic) * out, ls = smallSize(env);
      const at = '— ' + (romajiOf(env) || 'No.' + lineNo(env));
      const aw = Math.min(W * 0.4, meas(at, bodyF(env), ls, { track: 0.12 }).w);
      env.line([[W / 2 - aw / 2 - ls * 2, by1 + size * 0.95], [W / 2 - aw / 2 - ls * 0.8, by1 + size * 0.95]], mc, 1.5, a, false);
      env.draw({ text: at.slice(2), font: bodyF(env), size: ls, track: 0.12, x: W / 2, y: by1 + size * 0.95, color: sc.sub, alpha: a, ghost: false });
    }
    const bb = J.mainDraw(env, { text, font: p.font, size, x: W / 2, y: cy, track: 0.04, lead: 1.25, color: sc.fg });
    return bb || box(bx0, by0, bx1, by1);
  },
});

/* ======================================================================
   24  ruler — 寸法線
   ====================================================================== */
function arrowHead(env, x, y, ang, s, col, a) {
  const c = Math.cos(ang), sn = Math.sin(ang);
  env.poly([[x, y], [x - c * s + sn * s * 0.35, y - sn * s - c * s * 0.35], [x - c * s - sn * s * 0.35, y - sn * s + c * s * 0.35]], col, a, false);
}
reg('ruler', {
  name: '寸法線', tags: ['graphic', 'editorial', 'glitch'], w: 0.8, fits: n => n <= 16,
  plan: (rng, cut, st) => ({ font: rng.pick(fontsOf(st, ['display', 'serif', 'body'])), dims: rng.pick(['topRight', 'bottomLeft']), ticks: rng.chance(0.7), guides: rng.chance(0.8), unit: rng.pick(['px', 'pt', 'px']) }),
  render(env) {
    const { W, H, sc } = env, p = env.cut.params, u = U(env), port = isPort(env);
    const text = brk(env.cut.text.trim(), port ? 6 : 12);
    const o = { track: 0.04, lead: 1.15 };
    const size = Math.min(J.fitSize(text, p.font, W * 0.66, H * 0.34, o), u * 0.19);
    const m = meas(text, p.font, size, o);
    const cx = W / 2, cy = H / 2;
    const x0 = cx - m.w / 2, x1 = cx + m.w / 2, y0 = cy - m.h / 2, y1 = cy + m.h / 2;
    const out = tout(env);
    const e = tin(env, 0.08, 0.75, E.inOutCubic) * out;
    const lw = Math.max(1.2, u * 0.0016), ls = smallSize(env) * 0.9, ah = ls * 0.7;
    const top = p.dims === 'topRight';
    if (e > 0) {
      if (p.guides) {
        const gx = W * 0.47 * e, gy = H * 0.47 * e;
        dash(env, x0, cy - gy, x0, cy + gy, 8, 8, sc.sub, 1, 0.35);
        dash(env, x1, cy - gy, x1, cy + gy, 8, 8, sc.sub, 1, 0.35);
        dash(env, cx - gx, y0, cx + gx, y0, 8, 8, sc.sub, 1, 0.35);
        dash(env, cx - gx, y1, cx + gx, y1, 8, 8, sc.sub, 1, 0.35);
      }
      // horizontal dimension
      const dy = top ? y0 - size * 0.55 : y1 + size * 0.55, ext = top ? -1 : 1;
      const hx = m.w / 2 * e;
      env.line([[x0, top ? y0 - size * 0.08 : y1 + size * 0.08], [x0, dy + ext * ls * 0.6]], sc.sub, lw, 0.8, false);
      env.line([[x1, top ? y0 - size * 0.08 : y1 + size * 0.08], [x1, dy + ext * ls * 0.6]], sc.sub, lw, 0.8, false);
      env.line([[cx - hx, dy], [cx + hx, dy]], sc.sub, lw, 1, false);
      arrowHead(env, cx - hx, dy, Math.PI, ah, sc.sub, 1); arrowHead(env, cx + hx, dy, 0, ah, sc.sub, 1);
      const wv = Math.round(m.w * e);
      env.draw({ text: wv + ' ' + p.unit, font: monoF(env), size: ls, track: 0.08, x: cx, y: dy + ext * ls * 0.95, color: sc.accent, alpha: J.clamp(e * 2 - 0.3), ghost: false });
      // vertical dimension
      const dx = top ? x1 + size * 0.5 : x0 - size * 0.5, ex = top ? 1 : -1;
      const vy = m.h / 2 * e;
      env.line([[top ? x1 + size * 0.08 : x0 - size * 0.08, y0], [dx + ex * ls * 0.6, y0]], sc.sub, lw, 0.8, false);
      env.line([[top ? x1 + size * 0.08 : x0 - size * 0.08, y1], [dx + ex * ls * 0.6, y1]], sc.sub, lw, 0.8, false);
      env.line([[dx, cy - vy], [dx, cy + vy]], sc.sub, lw, 1, false);
      arrowHead(env, dx, cy - vy, -Math.PI / 2, ah, sc.sub, 1); arrowHead(env, dx, cy + vy, Math.PI / 2, ah, sc.sub, 1);
      env.draw({ text: Math.round(m.h * e) + ' ' + p.unit, font: monoF(env), size: ls, track: 0.08, x: dx + ex * ls * 1.1, y: cy, rot: top ? 90 : -90, color: sc.accent, alpha: J.clamp(e * 2 - 0.3), ghost: false });
      // glyph ticks + count
      if (p.ticks) {
        const ty = top ? y1 + size * 0.28 : y0 - size * 0.28, sg = top ? 1 : -1;
        const lay = m.lay, a = J.clamp(e * 1.6 - 0.4), li = top ? lay[lay.length - 1].li : 0;
        const gl = [...lay].filter(g => g.li === li && g.ch !== ' ');
        if (gl.length) {
          const lx0 = cx + Math.min(...gl.map(g => g.x - g.w / 2)), lx1 = cx + Math.max(...gl.map(g => g.x + g.w / 2));
          env.line([[lx0, ty], [lx0 + (lx1 - lx0) * e, ty]], sc.sub, lw, 0.7 * a, false);
          gl.forEach(g => { const gx = cx + g.x - g.w / 2; if (gx <= lx0 + (lx1 - lx0) * e + 0.5) env.line([[gx, ty], [gx, ty + sg * ls * 0.5]], sc.sub, lw, a, false); });
          env.line([[lx1, ty], [lx1, ty + sg * ls * 0.5]], sc.sub, lw, a, false);
          env.draw({ text: 'n=' + J.glyphCount(env.cut.text), font: monoF(env), size: ls, track: 0.08, align: top ? 'left' : 'right', x: top ? lx0 : lx1, y: ty + sg * ls * 1.4, color: sc.sub, alpha: a, ghost: false });
        }
      }
    }
    const bb = J.mainDraw(env, { text, font: p.font, size, x: cx, y: cy, track: 0.04, lead: 1.15, color: sc.fg });
    return bb || box(x0, y0, x1, y1);
  },
});

/* ======================================================================
   25  searchBar — 検索窓
   ====================================================================== */
function magnifier(env, x, y, r, col, lw, a) {
  env.circle(x - r * 0.15, y - r * 0.15, r * 0.62, null, col, lw, a, false);
  env.line([[x + r * 0.3, y + r * 0.3], [x + r * 0.8, y + r * 0.8]], col, lw * 1.2, a, false);
}
reg('searchBar', {
  name: '検索窓', tags: ['pop', 'graphic'], w: 0.6, enterBias: { type: 3, scramble: 1.5, cut: 1.5 }, fits: n => n <= 18, treat: 'safe', portrait: 0.8,
  plan: (rng, cut, st) => ({ font: rng.pick(fontsOf(st, ['body', 'display'])), shape: rng.pick(['pill', 'rect']), fill: rng.pick(['outline', 'filled']), sugg: rng.int(3, 4), pos: rng.pick(['center', 'upper']) }),
  render(env) {
    const { W, H, sc } = env, p = env.cut.params, u = U(env), port = isPort(env);
    const text = env.cut.text.trim();
    const bw = W * (port ? 0.9 : 0.7);
    const ts = Math.min(J.fitSize(text, p.font, bw - u * 0.22, u * 0.11, { track: 0.02 }), u * 0.095);
    const bh = ts * 2.1, r = p.shape === 'pill' ? bh / 2 : bh * 0.16;
    const by = H * (p.pos === 'upper' ? 0.28 : 0.38);
    const out = tout(env);
    const e = tin(env, 0, 0.45, E.outExpo) * out;
    const filled = p.fill === 'filled';
    const plate = sc.ink, tc = filled ? onCol(sc, plate) : sc.fg;
    const w = bw * (0.3 + 0.7 * e);
    const bx0 = W / 2 - w / 2;
    if (e > 0) {
      if (filled) env.rrect(bx0, by - bh / 2, w, bh, r, plate, e, false);
      else env.rrect(bx0, by - bh / 2, w, bh, r, null, e, false, sc.fg, Math.max(2, ts * 0.05));
      magnifier(env, bx0 + bh * 0.5, by, ts * 0.55, tc, Math.max(2, ts * 0.06), e);
      const xr = bx0 + w - bh * 0.45, q = ts * 0.2;
      env.line([[xr - q, by - q], [xr + q, by + q]], tc, Math.max(1.5, ts * 0.04), 0.6 * e, false);
      env.line([[xr - q, by + q], [xr + q, by - q]], tc, Math.max(1.5, ts * 0.04), 0.6 * e, false);
    }
    const tx = W / 2 - bw / 2 + bh * 0.95;
    const bb = J.mainDraw(env, { text, font: p.font, size: ts, x: tx, y: by, align: 'left', track: 0.02, color: tc, enter: env.cut.enter === 'cut' ? 'type' : undefined });
    // caret after typing
    const typed = env.cut.enter === 'cut' || env.cut.enter === 'type' ? env.cut.inDur + 0.05 : env.cut.inDur;
    if (env.lt > typed && out > 0.5 && env.step % 2 === 0) {
      const tw = meas(text, p.font, ts, { track: 0.02 }).w;
      env.rect(tx + tw + ts * 0.12, by - ts * 0.55, Math.max(2, ts * 0.06), ts * 1.1, sc.accent, 1, false);
    }
    // suggestions
    const rom = hasLatin(text) ? null : J.romaji(strip(text));
    const rows = [text + ' lyrics', env.cut.lineText && strip(env.cut.lineText) !== strip(text) ? env.cut.lineText : text + ' meaning', rom ? rom.toLowerCase() : text + ' mv', text + ' cover'].slice(0, p.sugg);
    const rs = ts * 0.52, rh = rs * 2.4, py = by + bh / 2 + rs * 0.8;
    const t0 = Math.max(0.3, typed);
    const pa = tin(env, t0, 0.3, E.outCubic) * out;
    if (pa > 0) {
      const ph = rows.length * rh + rs * 0.6;
      env.rrect(W / 2 - bw / 2, py, bw, ph * pa, bh * 0.16, filled ? plate : null, 0.9 * pa, false, filled ? null : sc.sub, 1.2);
      rows.forEach((rt, i) => {
        const a = J.clamp((env.lt - t0 - 0.05 - i * 0.07) / 0.2) * out;
        if (a <= 0 || (i + 1) * rh > ph * pa) return;
        const y = py + rs * 0.3 + (i + 0.5) * rh;
        magnifier(env, W / 2 - bw / 2 + bh * 0.5, y, rs * 0.7, filled ? onCol(sc, plate) : sc.sub, 1.5, a * 0.7);
        const xt = W / 2 - bw / 2 + bh * 0.95;
        const pre = rt.startsWith(text) ? text : '', rest = rt.slice(pre.length);
        const pw = pre ? meas(pre, p.font, rs, { track: 0.02 }).w : 0;
        if (pre) env.draw({ text: pre, font: p.font, size: rs, track: 0.02, align: 'left', x: xt, y, color: filled ? onCol(sc, plate) : sc.fg, alpha: a, ghost: false });
        env.draw({ text: rest, font: bodyF(env), size: rs, track: 0.02, align: 'left', x: xt + pw, y, color: filled ? onCol(sc, plate) : sc.sub, alpha: a * (filled ? 0.65 : 1), ghost: false });
      });
    }
    return bb || box(W / 2 - bw / 2, by - bh / 2, W / 2 + bw / 2, by + bh / 2);
  },
});

/* ======================================================================
   26  chat — チャット
   ====================================================================== */
reg('chat', {
  name: 'チャット', tags: ['pop', 'emotional'], w: 0.6, enterBias: { pop: 2, cut: 1.5, type: 1.3 }, fits: n => n <= 22, treat: 'safe',
  plan: (rng, cut, st) => { const nw = (J.chunkText ? J.chunkText(cut.text) : [cut.text]).length; return { msgs: cut.n <= 4 ? [cut.text.trim()] : splitK(cut.text, J.clamp(nw, 2, cut.n > 12 ? 4 : 3)), font: rng.pick(fontsOf(st, ['body', 'display'])), side0: rng.pick([1, -1]), alt: rng.chance(0.55) }; },
  render(env) {
    const { W, H, sc, ctx } = env, p = env.cut.params, u = U(env), port = isPort(env);
    const msgs = p.msgs && p.msgs.length ? p.msgs : [env.cut.text.trim()];
    const colW = W * (port ? 0.86 : W / H < 1.5 ? 0.66 : 0.52), maxW = colW * 0.8;
    const sentC = sc.accent, recvC = sc.ink !== sc.accent ? sc.ink : sc.sub;
    const list = [];
    if (msgs.length === 1) list.push({ typing: true, side: -p.side0 });
    msgs.forEach((t, i) => list.push({ t, side: p.alt ? (i % 2 ? -p.side0 : p.side0) : p.side0 }));
    const nL = list.length;
    // size so the whole stack fits
    let fs = Math.min(u * 0.088, H * 0.62 / (nL * 2.2));
    const longest = Math.max(1, ...list.map(q => (q.typing ? 1 : J.glyphCount(q.t))));
    fs = Math.max(Math.min(fs, (maxW - fs * 1.4) / (longest * 1.02)), fs * 0.62);   // prefer single-line messages
    const lines = list.map(q => (q.typing ? '' : brk(q.t, Math.max(3, Math.floor(maxW / (fs * 1.02))))));
    lines.forEach(l => { if (l) fs = Math.min(fs, J.fitSize(l, p.font, maxW - fs * 1.4, H * 0.3, { lead: 1.25 })); });
    const pad = fs * 0.62, sp = fs * 0.45;
    const dims = list.map((q, i) => { if (q.typing) return [fs * 3, fs * 1.9]; const m = meas(lines[i], p.font, fs, { lead: 1.25 }); return [m.w + pad * 2, m.h + pad * 1.45]; });
    const gap = Math.min(0.3, Math.max(0.12, env.cut.dur * 0.45 / nL));
    const tAt = i => (list[0].typing ? (i === 0 ? 0 : 0.35 + (i - 1) * gap) : i * gap);
    const stag = Math.max(0.01, env.cut.stagger || 0.04);
    const bottom = H * (port ? 0.78 : 0.8);
    const out = tout(env);
    let bb = null;
    // y of each bubble: pushed up by every later bubble that has appeared
    const lift = list.map((q, i) => { let y = 0; for (let j = i + 1; j < nL; j++) y += (dims[j][1] + sp) * E.outExpo(J.clamp((env.lt - tAt(j)) / 0.28)); return y; });
    list.forEach((q, i) => {
      const lt = env.lt - tAt(i);
      if (lt < 0) return;
      const pop = E.outBack(J.clamp(lt / 0.25), 1.6) * out;
      const [bw, bh] = dims[i];
      const right = q.side > 0;
      const x0 = right ? W / 2 + colW / 2 - bw : W / 2 - colW / 2;
      const y1 = bottom - lift[i], y0 = y1 - bh;
      const col = right ? sentC : recvC, tc = onCol(sc, col);
      const px = right ? x0 + bw : x0, py = y1;
      ctx.save(); ctx.translate(px, py); ctx.scale(Math.max(0.001, pop), Math.max(0.001, pop)); ctx.translate(-px, -py);
      env.rrect(x0, y0, bw, bh, Math.min(bh / 2, fs * 0.9), col, 1, false);
      env.poly(right ? [[x0 + bw - fs * 0.5, y1 - fs * 0.3], [x0 + bw + fs * 0.28, y1 + fs * 0.05], [x0 + bw - fs * 0.1, y1 - fs * 0.8]] : [[x0 + fs * 0.5, y1 - fs * 0.3], [x0 - fs * 0.28, y1 + fs * 0.05], [x0 + fs * 0.1, y1 - fs * 0.8]], col, 1, false);
      if (q.typing) {
        for (let k = 0; k < 3; k++) { const ph = Math.sin(env.ltb * 9 - k * 0.9) * 0.5 + 0.5; env.circle(x0 + bw / 2 + (k - 1) * fs * 0.62, y0 + bh / 2 - ph * fs * 0.12, fs * 0.16, tc, null, 0, 0.45 + ph * 0.5, false); }
      } else {
        bb = J.unionBB(bb, J.mainDraw(env, { text: lines[i], font: p.font, size: fs, lead: 1.25, x: x0 + bw / 2, y: y0 + bh / 2, color: tc, mi: tAt(i) / stag }));
      }
      ctx.restore();
      if (i === nL - 1 && pop > 0.9) {
        const ms = Math.max(11, fs * 0.36);
        env.draw({ text: (right ? 'Read ' : '') + J.fmtTime(env.cut.start).slice(0, 5), font: monoF(env), size: ms, align: right ? 'right' : 'left', x: right ? x0 + bw : x0, y: y1 + ms * 1.4, color: sc.sub, alpha: out, ghost: false });
      }
    });
    return bb || box(W / 2 - colW / 2, bottom - H * 0.3, W / 2 + colW / 2, bottom);
  },
});

/* ======================================================================
   27  notification — 通知
   ====================================================================== */
function noteIcon(env, x, y, s, col, a) {
  env.circle(x - s * 0.18, y + s * 0.2, s * 0.17, col, null, 0, a, false);
  env.rect(x - s * 0.03, y - s * 0.32, s * 0.07, s * 0.52, col, a, false);
  env.poly([[x + s * 0.04, y - s * 0.32], [x + s * 0.3, y - s * 0.18], [x + s * 0.04, y - s * 0.12]], col, a, false);
}
reg('notification', {
  name: '通知', tags: ['pop', 'emotional', 'calm'], w: 0.5, enterBias: { cut: 1.6, type: 1.3, blur: 1.2 }, fits: n => n <= 24, treat: 'safe',
  plan: (rng, cut, st) => ({ font: rng.pick(fontsOf(st, ['body', 'display'])), pos: rng.pick(['banner', 'lock', 'center']), stack: rng.chance(0.5), app: rng.pick(['MUSIC', 'LYRICS', 'MESSAGE']) }),
  render(env) {
    const { W, H, sc, ctx } = env, p = env.cut.params, u = U(env), port = isPort(env);
    const text = env.cut.text.trim();
    const cw = W * (port ? 0.9 : W / H < 1.5 ? 0.66 : 0.54), pd = cw * 0.05;
    const hs = Math.max(12, cw * 0.032);
    const plate = sc.ink, tc = onCol(sc, plate);
    let mt = text, ms = Math.min(J.fitSize(mt, p.font, cw - pd * 2, u * 0.11, { track: 0.02 }), u * 0.095);
    if (ms < u * 0.07 && J.glyphCount(text) > 5) { mt = brk(text, Math.ceil(J.glyphCount(text) / 2)); ms = Math.min(J.fitSize(mt, p.font, cw - pd * 2, u * 0.2, { track: 0.02, lead: 1.3 }), u * 0.085); }
    const mm = meas(mt, p.font, ms, { track: 0.02, lead: 1.3 });
    const headH = hs * 2.2, titleH = hs * 1.9;
    const ch = pd + headH + titleH + mm.h + pd * 1.1;
    const out = tout(env);
    // lock-screen clock
    const clockY = H * (port ? 0.2 : 0.22);
    if (p.pos === 'lock') {
      const a = tin(env, 0, 0.5, E.outCubic) * out;
      const hh = pad2(Math.floor(env.cut.start / 60) % 24 || 12), mi2 = pad2(Math.floor(env.cut.start) % 60);
      const cs = Math.min(u * 0.2, H * 0.2);
      env.draw({ text: hh + ':' + mi2, font: fontsOf(env.st, ['display'])[0], size: cs, x: W / 2, y: clockY, track: 0.02, color: sc.sub, alpha: a * 0.8, ghost: false });
      env.draw({ text: 'LINE ' + lineNo(env) + '  ·  ' + J.fmtTime(env.cut.start), font: monoF(env), size: hs, track: 0.2, x: W / 2, y: clockY - cs * 0.62, color: sc.sub, alpha: a * 0.8, ghost: false });
    }
    const target = p.pos === 'banner' ? H * 0.06 : p.pos === 'lock' ? clockY + Math.min(u * 0.2, H * 0.2) * 0.75 : H / 2 - ch / 2;
    const eIn = E.outBack(J.clamp(env.lt / 0.45), 1.1), eOut = E.inCubic(env.pOut);
    const y0 = target - (1 - eIn) * (target + ch + 30) - eOut * (target + ch + 30);
    const x0 = W / 2 - cw / 2;
    if (p.stack) {
      const sw = cw * 0.92;
      env.rrect(W / 2 - sw / 2, y0 + ch - pd * 0.4, sw, pd * 1.4, pd * 0.7, plate, 0.45, false);
    }
    env.rrect(x0, y0, cw, ch, pd * 0.9, plate, 0.96, false);
    // header: icon, app, time
    const iy = y0 + pd + headH / 2 - hs * 0.2, isz = hs * 1.7;
    env.rrect(x0 + pd, iy - isz / 2, isz, isz, isz * 0.24, sc.accent, 1, false);
    noteIcon(env, x0 + pd + isz / 2, iy, isz * 0.8, onCol(sc, sc.accent), 1);
    env.draw({ text: p.app, font: monoF(env), size: hs, track: 0.15, align: 'left', x: x0 + pd + isz + hs * 0.7, y: iy, color: tc, alpha: 0.6, ghost: false });
    env.draw({ text: 'now', font: monoF(env), size: hs, track: 0.1, align: 'right', x: x0 + cw - pd, y: iy, color: tc, alpha: 0.5, ghost: false });
    const ty = y0 + pd + headH + titleH / 2;
    env.draw({ text: romajiOf(env) || 'No.' + lineNo(env), font: bodyF(env), size: hs * 1.15, track: 0.06, align: 'left', x: x0 + pd, y: ty, color: tc, alpha: 0.9, ghost: false });
    const my = ty + titleH / 2 + mm.h / 2;
    const bb = J.mainDraw(env, { text: mt, font: p.font, size: ms, x: x0 + pd, y: my, align: 'left', track: 0.02, lead: 1.3, color: tc });
    return bb || box(x0 + pd, my - mm.h / 2, x0 + pd + mm.w, my + mm.h / 2);
  },
});

/* ======================================================================
   28  ticket — チケット
   ====================================================================== */
function ticketParts(x0, y0, w, h, px, nr, r) {
  const seg = 6, x1 = x0 + w, y1 = y0 + h;
  const arc = (cx, cy, rr, a0, a1) => { const o = []; for (let i = 0; i <= seg; i++) { const a = (a0 + (a1 - a0) * i / seg) * J.DEG; o.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]); } return o; };
  const main = [...arc(x0 + r, y0 + r, r, 180, 270), [px - nr, y0], ...arc(px, y0, nr, 180, 90), [px, y1 - nr], ...arc(px, y1, nr, 270, 180), ...arc(x0 + r, y1 - r, r, 90, 180)];
  const stub = [[px + nr, y0], ...arc(x1 - r, y0 + r, r, 270, 360), ...arc(x1 - r, y1 - r, r, 0, 90), [px + nr, y1], ...arc(px, y1, nr, 360, 270), [px, y0 + nr], ...arc(px, y0, nr, 90, 0)];
  return { main, stub };
}
reg('ticket', {
  name: 'チケット', tags: ['pop', 'graphic', 'editorial'], w: 0.6, fits: n => n <= 18, treat: 'safe', portrait: 0.6,
  plan: (rng, cut, st) => ({ font: rng.pick(fontsOf(st, ['display', 'serif'])), fill: rng.pick(['accent', 'ink', 'outline']), tilt: rng.range(-5, 5), label: rng.pick(['ADMIT ONE', 'LIVE', 'TICKET']), serial: rng.int(1, 999999) }),
  render(env) {
    const { W, H, sc, ctx } = env, p = env.cut.params, u = U(env), port = isPort(env);
    const tw = Math.min(W * (port ? 0.9 : 0.74), H * 1.9), th = Math.min(tw * (port ? 0.46 : 0.38), H * 0.5);
    const stubW = tw * 0.22, px0 = -tw / 2 + tw - stubW;
    const nr = th * 0.075, r = th * 0.05;
    const outline = p.fill === 'outline';
    const plate = p.fill === 'accent' ? sc.accent : sc.ink;
    const tc = outline ? sc.fg : onCol(sc, plate), lc = outline ? sc.sub : tc;
    const eIn = E.outBack(J.clamp(env.lt / 0.5), 1.2), eOut = E.inCubic(env.pOut);
    const cx = W / 2, cy = H / 2 + (1 - eIn) * H * 0.7;
    const rot = p.tilt * (1 - eOut * 0.5) + (1 - eIn) * 10;
    const T = ticketParts(-tw / 2, -th / 2, tw, th, px0, nr, r);
    const a = J.clamp(eIn * 3) * (1 - eOut);
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot * J.DEG);
    // stub tears away on exit
    const tear = eOut;
    ctx.save(); ctx.translate(tear * tw * 0.12, tear * th * 0.2); ctx.rotate(tear * 12 * J.DEG);
    if (outline) env.line(closeLoop(T.stub), sc.fg, Math.max(2, th * 0.012), a, false); else env.poly(T.stub, plate, a, false);
    const ls = Math.max(11, th * 0.07), sx = px0 + stubW / 2;
    env.draw({ text: p.label, font: monoF(env), size: ls, track: 0.25, x: sx - stubW * 0.22, y: 0, rot: -90, color: tc, alpha: a, ghost: false });
    env.draw({ text: 'No.' + String(p.serial).padStart(6, '0'), font: monoF(env), size: ls * 0.8, track: 0.12, x: sx + stubW * 0.02, y: 0, rot: -90, color: lc, alpha: a * 0.8, ghost: false });
    const bx = sx + stubW * 0.26, bh2 = th * 0.7;
    for (let i = 0, y = -bh2 / 2; i < 40 && y < bh2 / 2; i++) { const hgt = th * (0.006 + 0.014 * J.r(p.serial, i, 3)); env.rect(bx - stubW * 0.08, y, stubW * 0.16, hgt, tc, a * 0.85, false); y += hgt + th * (0.006 + 0.01 * J.r(p.serial, i, 4)); }
    ctx.restore();
    if (outline) env.line(closeLoop(T.main), sc.fg, Math.max(2, th * 0.012), a, false); else env.poly(T.main, plate, a, false);
    // perforation
    for (let y = -th / 2 + nr * 1.6; y < th / 2 - nr * 1.6; y += th * 0.05) env.rect(px0 - 1, y, 2.5, th * 0.025, lc, a * 0.7, false);
    // header / footer furniture
    const mx0 = -tw / 2 + th * 0.12, mx1 = px0 - th * 0.12;
    env.draw({ text: p.label + '  ·  No.' + lineNo(env), font: monoF(env), size: ls, track: 0.2, align: 'left', x: mx0, y: -th / 2 + th * 0.14, color: lc, alpha: a, ghost: false });
    env.line([[mx0, -th / 2 + th * 0.24], [mx1, -th / 2 + th * 0.24]], lc, 1.2, a * 0.6, false);
    env.line([[mx0, th / 2 - th * 0.24], [mx1, th / 2 - th * 0.24]], lc, 1.2, a * 0.6, false);
    env.draw({ text: 'GATE ' + String.fromCharCode(65 + (p.serial % 6)) + '   ROW ' + pad2(1 + p.serial % 30) + '   SEAT ' + pad2(1 + (p.serial >> 3) % 40), font: monoF(env), size: ls * 0.9, track: 0.15, align: 'left', x: mx0, y: th / 2 - th * 0.14, color: lc, alpha: a, ghost: false });
    env.draw({ text: J.fmtTime(env.cut.start), font: monoF(env), size: ls * 0.9, track: 0.1, align: 'right', x: mx1, y: th / 2 - th * 0.14, color: lc, alpha: a, ghost: false });
    // title = lyric
    const t0 = env.cut.text.trim(), n = J.glyphCount(t0);
    const text = brk(t0, port ? 6 : 9);
    const aw = mx1 - mx0, ah = th * 0.44;
    const size = Math.min(J.fitSize(text, p.font, aw, ah, { track: 0.03, lead: 1.1 }), th * 0.3);
    const bb = J.mainDraw(env, { text, font: p.font, size, x: mx0, y: 0, align: 'left', track: 0.03, lead: 1.1, color: tc });
    ctx.restore();
    return bb ? box(cx - tw / 2, cy - th / 2, cx + tw / 2, cy + th / 2) : null;
  },
});

})();
