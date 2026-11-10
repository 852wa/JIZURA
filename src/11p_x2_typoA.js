/* JIZURA pack: x2typoA — 文字PV系 追加分2: 15 typographic layouts (split-line notes, hook setting, detail crop, alignment
   specimen, closing tracking, axis setting, slash divide, sunk baseline, funnel, enlarged detail, stretched glyph, point
   symmetry, page canon, metric lines, reading path), 10 quiet typographic decor parts and 6 type-only backgrounds */
(() => {
'use strict';
const E = J.E;
const P = 'x2typoA';
const clamp = J.clamp, lerp = J.lerp;
const regL = (key, def) => J.register('layout', key, def, P);
const regD = (key, def) => J.register('decor', key, def, P);

/* ------------------------------------------------------------------ helpers */
const clean = t => String(t || '').replace(/\s+/g, '');
const slotsOf = t => [...String(t || '').trim().replace(/[\s　]+/g, ' ')];
const isSp = c => c === ' ' || c === '　';
const fontsOf = (st, roles) => J.fontsOf(st, roles);
const monoF = env => (env.st.fonts.mono && env.st.fonts.mono[0]) || 'mono';
const bodyF = env => (env.st.fonts.body && env.st.fonts.body[0]) || 'gothic_med';
const serifF = env => (env.st.fonts.serif && env.st.fonts.serif[0]) || 'mincho';
const outK = env => 1 - E.inCubic(env.pOut);
const pad2 = n => String(n).padStart(2, '0');
const hair = env => Math.max(1, Math.min(env.W, env.H) * 0.0014);
const UB = J.unionBB;
const isLatinT = t => /[A-Za-z]/.test(t) && !/[぀-ヿ㐀-鿿＀-￯]/.test(t);
const labelSize = env => clamp(Math.min(env.W, env.H) * 0.018, 11, 22);
const accentOn = sc => (J.contrast(sc.accent, sc.bg) >= 1.8 ? sc.accent : sc.fg);
const label = (env, text, x, y, o = {}) => env.draw({ text: String(text), font: o.font || monoF(env), size: o.size || labelSize(env), x, y, align: o.align || 'left', track: o.track ?? 0.12, color: o.color || env.sc.sub, alpha: o.alpha ?? 1, rot: o.rot || 0, ghost: false });
const tw = (text, font, size, track = 0.12) => J.measure({ text: String(text), font, size, track }).w;
/* J.splitLines, but never leave a line of punctuation only */
const splitL = (t, per) => {
  const ls = J.splitLines(t, Math.max(1, per)).split('\n'), out = [];
  for (const l of ls) { if (out.length && [...l].every(c => J.isPunct(c) || c === ' ')) out[out.length - 1] += l; else out.push(l); }
  return out.join('\n');
};
const mainLines = (text, W, H, perL = 11, perP = 5) => {
  const t = String(text || '').trim(), n = J.glyphCount(t), per = W < H ? perP : perL;
  if (n <= per) return t;
  return splitL(t, Math.ceil(n / Math.ceil(n / per)));
};
/* glyph centres of a laid-out text item (design space, before rotation) */
const glyphPts = it => {
  const lay = J.layoutText(it), sx = it.sx || 1, sy = it.sy || 1, out = [];
  for (const g of lay) { if (isSp(g.ch)) continue; out.push({ ch: g.ch, x: it.x + g.x * sx, y: it.y + g.y * sy, w: g.w * sx, h: g.h * sy, li: g.li, i: out.length }); }
  return out;
};
const okKey = c => c && !isSp(c) && !J.isPunct(c) && !J.isSmallKana(c);
/* index of the "key" glyph: first kanji of the longest kanji run, else a plain glyph (first / nearest the middle) */
const keyIndex = (arr, mode) => {
  if (mode === 'mid') {
    const mid = Math.floor((arr.length - 1) / 2);
    for (let d = 0; d < arr.length; d++) { if (okKey(arr[mid + d])) return mid + d; if (okKey(arr[mid - d])) return mid - d; }
  }
  let best = -1, bl = 0;
  for (let i = 0; i < arr.length; i++) {
    if (!J.isKanji(arr[i])) continue;
    let j = i; while (j < arr.length && J.isKanji(arr[j])) j++;
    if (j - i > bl) { bl = j - i; best = i; }
    i = j;
  }
  if (best >= 0) return best;
  for (let i = 0; i < arr.length; i++) if (okKey(arr[i])) return i;
  return 0;
};
/* word-like units of the cut text (latin: words with their leading space; Japanese: chunks with particles glued on) */
const glue = u => {
  const out = [];
  for (const w of u) {
    const a = [...w.trim()], c0 = a[0];
    if (out.length && (J.isPunct(c0) || J.isSmallKana(c0) || c0 === 'ー' || (a.length === 1 && 'はがをにでとのへもてだねよ'.includes(c0)))) out[out.length - 1] += w; else out.push(w);
  }
  return out;
};
const unitsOf = (cut, want = 2) => {
  const txt = String(cut.text || '').trim();
  if (isLatinT(txt)) return txt.split(/\s+/).filter(Boolean).map((w, i) => (i ? ' ' : '') + w);
  const a = glue((cut.words || []).map(String).filter(w => w.trim()));
  if (a.length >= want) return a;
  const b = glue((J.segments(txt) || []).filter(w => w.trim()));
  if (b.length >= want) return b;
  const c = charUnits(txt);
  return c.length >= Math.max(a.length, b.length) ? c : (b.length > a.length ? b : a);
};
/* group units into lines at cumulative glyph fractions fr (last = 1) */
const groupFr = (units, fr) => {
  const lens = units.map(u => J.glyphCount(u)), tot = lens.reduce((a, b) => a + b, 0), out = [];
  let cur = '', acc = 0;
  units.forEach((u, i) => {
    cur += u; acc += lens[i];
    if (out.length < fr.length - 1 && i < units.length - 1 && acc >= tot * fr[out.length] - lens[i + 1] * 0.5) { out.push(cur.trim()); cur = ''; }
  });
  if (cur.trim()) out.push(cur.trim());
  return out;
};
const evenFr = L => Array.from({ length: L }, (_, i) => (i + 1) / L);
/* glyph units that never start with punctuation / small kana (for breaking anywhere) */
const charUnits = txt => {
  const out = [];
  for (const c of [...clean(txt)]) { if (out.length && (J.isPunct(c) || J.isSmallKana(c) || c === 'ー')) out[out.length - 1] += c; else out.push(c); }
  return out;
};
const rectPts = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]];
const dashLine = (env, a, b, col, lw, alpha, on, off) => {
  if (env.pass !== 'main' || alpha <= 0) return;
  const ctx = env.ctx; ctx.save(); ctx.setLineDash([on, off]); env.line([a, b], col, lw, alpha, false); ctx.restore();
};

/* ================================================================== LAYOUTS */

/* 1 割り書き — the head of the line set large, the rest as a two-line note inside the big line's height (warichu) */
regL('tzWarichu', {
  name: '割り書き', en: 'Split-line Note', tags: ['editorial', 'graphic', 'emotional'], ae: 'mixed', w: 1, portrait: 0.5, fits: n => n >= 3 && n <= 16,
  plan(rng, cut, st) {
    return { font: rng.pick(fontsOf(st, ['display', 'serif'])), fs: rng.pick(fontsOf(st, ['serif', 'body', 'display'])), lead: rng.chance(0.3), mark: rng.pick(['paren', 'paren', 'rule', 'none']), acc: rng.chance(0.4), ratio: rng.range(0.38, 0.5) };
  },
  render(env) {
    const { W, H, sc } = env, cut = env.cut, Pm = cut.params, lt = env.lt, M = Math.min(W, H);
    const units = unitsOf(cut), tot = units.reduce((a, u) => a + J.glyphCount(u), 0);
    const parts = groupFr(units, [Pm.lead ? 1 - Pm.ratio : Pm.ratio, 1]);
    if (parts.length < 2) { const t = String(cut.text).trim(); return J.mainDraw(env, { text: t, font: Pm.font, size: Math.min(J.fitSize(t, Pm.font, W * 0.8, H * 0.5), M * 0.3), x: W / 2, y: H / 2, color: sc.fg }); }
    const big = Pm.lead ? parts[1] : parts[0], small = Pm.lead ? parts[0] : parts[1];
    const nS = J.glyphCount(small);
    let st2 = small;
    if (isLatinT(small)) { const ws = small.split(/\s+/); if (ws.length >= 2) st2 = groupFr(ws.map((w, i) => (i ? ' ' : '') + w), [0.5, 1]).join('\n'); }
    else if (nS >= 2) st2 = splitL(small, Math.ceil(nS / 2));
    const two = st2.indexOf('\n') >= 0, kS = two ? 0.44 : 0.5, oS = { lead: 1.14, track: 0.04 };
    const wb = J.measure({ text: big, font: Pm.font, size: 100, track: 0.02 }).w;
    const ms = J.measure(Object.assign({ text: st2, font: Pm.fs, size: 100 * kS }, oS));
    const gap = 16, padB = Pm.mark === 'paren' ? 12 : 0;
    const total = wb + gap + ms.w + padB * 2;
    const S = Math.min(M * 0.32, W * 0.86 / total * 100, H * 0.5), k = S / 100;
    const x0 = W / 2 - total * k / 2, cy = H / 2;
    const xBig = Pm.lead ? x0 + (ms.w + padB * 2 + gap) * k : x0;
    const xS = Pm.lead ? x0 + padB * k : x0 + (wb + gap + padB) * k;
    const out = outK(env), lw = hair(env), ls = labelSize(env);
    let bb = J.mainDraw(env, { text: big, font: Pm.font, size: S, align: 'left', x: xBig, y: cy, track: 0.02, color: sc.fg, mi: Pm.lead ? 3 : 0 });
    bb = UB(bb, J.mainDraw(env, Object.assign({ text: st2, font: Pm.fs, size: S * kS, align: 'left', x: xS, y: two ? cy + S * 0.01 : cy + S * 0.2, color: Pm.acc ? accentOn(sc) : sc.fg, mi: Pm.lead ? 0 : 3 }, oS)));
    const e = E.outExpo(clamp((lt - 0.18) / 0.6)) * out;
    if (e > 0) {
      const xa = xS - padB * 0.55 * k, xb = xS + ms.w * k + padB * 0.55 * k, t = S * 0.07, hh = S * 0.47 * e;
      if (Pm.mark === 'paren') {
        env.line([[xa + t, cy - hh], [xa, cy - hh], [xa, cy + hh], [xa + t, cy + hh]], sc.sub, lw, 0.85, false);
        env.line([[xb - t, cy - hh], [xb, cy - hh], [xb, cy + hh], [xb - t, cy + hh]], sc.sub, lw, 0.85, false);
      } else if (Pm.mark === 'rule') {
        const y = cy + S * 0.62;
        env.line([[x0, y], [lerp(x0, x0 + total * k, e), y]], sc.sub, lw, 0.7, false);
        const xm = Pm.lead ? xBig - gap * k / 2 : xS - gap * k / 2;
        env.line([[xm, y], [xm, y - S * 0.12 * e]], sc.sub, lw, 0.7, false);
      }
      const nB = tot - nS;
      label(env, Pm.lead ? `${pad2(nS)} : ${pad2(nB)}` : `${pad2(nB)} : ${pad2(nS)}`, xS, cy + S * 0.62 + ls * 1.2, { alpha: e * 0.9, size: ls * 0.85 });
    }
    return bb;
  },
});

/* 2 鉤組 — the line runs horizontally, turns at one glyph and continues vertically (or the other way round) */
regL('tzHook', {
  name: '鉤組', en: 'Hook Setting', tags: ['graphic', 'editorial', 'calm'], ae: 'vcols', w: 1, fits: n => n >= 3 && n <= 13,
  plan(rng, cut, st) {
    return { font: rng.pick(fontsOf(st, ['display', 'serif'])), mode: rng.pick(['kanji', 'mid', 'mid']), flip: rng.chance(0.4), key: rng.pick(['accent', 'accent', 'fg']), ext: rng.chance(0.75) };
  },
  render(env) {
    const { W, H, sc } = env, cut = env.cut, Pm = cut.params, lt = env.lt, M = Math.min(W, H);
    const arr = slotsOf(cut.text), n = arr.length;
    if (n < 2) return J.mainDraw(env, { text: arr.join(''), font: Pm.font, size: M * 0.3, x: W / 2, y: H / 2, color: sc.fg });
    if (isLatinT(cut.text)) {
      const ws = unitsOf(cut), tr = 0.04, flip = !!Pm.flip, port = W < H;
      const parts = groupFr(ws, [(W >= H) !== flip ? 0.62 : 0.4, 1]);
      if (parts.length < 2) { const t = parts[0] || ''; return J.mainDraw(env, { text: t, font: Pm.font, size: Math.min(J.fitSize(t, Pm.font, W * 0.8, H * 0.5, { track: tr }), M * 0.24), x: W / 2, y: H / 2, track: tr, color: sc.fg }); }
      const hT = flip ? parts[1] : parts[0], vT = flip ? parts[0] : parts[1];      // horizontal arm / turned arm
      const wH = J.measure({ text: hT, font: Pm.font, size: 100, track: tr }).w, wV = J.measure({ text: vT, font: Pm.font, size: 100, track: tr }).w, g = 34;
      const totW = wH + g + 100, totH = Math.max(100, wV);
      const size = Math.min(W * 0.84 / totW * 100, H * 0.82 / totH * 100, M * 0.2), k = size / 100;
      const left = W / 2 - totW * k / 2, top = H / 2 - totH * k / 2;
      // not flipped: the line runs right, then turns down.  flipped: it runs down, then turns right at the foot
      const vx = flip ? left + size / 2 : left + totW * k - size / 2, vy = top + wV * k / 2;
      const hy = flip ? top + wV * k - size / 2 : top + size / 2, hx = flip ? left + size + g * k : left;
      const out = outK(env), lw = hair(env), e = E.outExpo(clamp((lt - 0.12) / 0.7)) * out;
      const cx = flip ? vx : vx, cy = hy;       // the corner
      if (e > 0 && Pm.ext) {
        if (!flip) { env.line([[vx + size * 0.6, cy], [lerp(vx + size * 0.6, W * 0.96, e), cy]], sc.sub, lw, 0.32, false); env.line([[vx - size * 0.62, top - size * 0.1], [vx - size * 0.62, top - size * 0.1 + (wV * k + size * 0.2) * e]], sc.sub, lw, 0.6, false); }
        else { env.line([[vx, top + wV * k + size * 0.15], [vx, lerp(top + wV * k + size * 0.15, H * 0.96, e)]], sc.sub, lw, 0.32, false); env.line([[hx, hy - size * 0.66], [hx + wH * k * e, hy - size * 0.66]], sc.sub, lw, 0.6, false); }
      }
      if (e > 0) label(env, '90°', flip ? vx + size * 0.7 : vx - size * 0.75, flip ? top + labelSize(env) * 0.6 : top + wV * k - labelSize(env) * 0.3, { alpha: e * 0.9, size: labelSize(env) * 0.85, align: flip ? 'left' : 'right' });
      const kc = Pm.key === 'accent' ? accentOn(sc) : sc.fg;
      const bH = J.mainDraw(env, { text: hT, font: Pm.font, size, track: tr, align: 'left', x: hx, y: hy, color: sc.fg, mi: flip ? 3 : 0 });
      J.mainDraw(env, { text: vT, font: Pm.font, size, track: tr, x: vx, y: vy, rot: 90, color: flip ? sc.fg : kc, mi: flip ? 0 : 3 });
      return UB(bH, { x0: vx - size / 2, x1: vx + size / 2, y0: top, y1: top + wV * k, cx: vx, cy: vy, boxes: [] });
    }
    let ki = keyIndex(arr, Pm.mode);
    // the turning glyph must have text on both sides; balance the two arms against the frame
    const want = clamp(Math.round((n - 1) * (W >= H ? (Pm.flip ? 0.3 : 0.62) : (Pm.flip ? 0.6 : 0.34))), 1, Math.max(1, n - 2));
    if (ki < 1 || ki > n - 2 || Math.abs(ki - want) > Math.max(1, n * 0.25)) {
      ki = -1;
      for (let d = 0; d < n && ki < 0; d++) for (const c of [want + d, want - d]) if (ki < 0 && c >= 1 && c <= n - 2 && okKey(arr[c])) ki = c;
      if (ki < 0) ki = Math.min(n - 1, Math.max(1, want));
    }
    const tr = 0.06;
    const A = arr.slice(0, ki).join('').trim(), K = arr[ki], B = arr.slice(ki + 1).join('').trim();
    const vA = A.replace(/\s+/g, '　'), vB = B.replace(/\s+/g, '　');
    const wOf = s => (s ? J.measure({ text: s, font: Pm.font, size: 100, track: tr }).w : 0);
    const hOf = s => (s ? J.measure({ text: s, font: Pm.font, size: 100, track: tr, vertical: true }).h : 0);
    const kw = Math.max(60, wOf(K)), g = 100 * tr + 6;
    const flip = !!Pm.flip;
    const armW = flip ? wOf(B) : wOf(A), armH = flip ? hOf(vA) : hOf(vB);
    const totW = kw + (armW ? armW + g : 0), totH = 100 + (armH ? armH + g : 0);
    const size = Math.min(W * 0.84 / totW * 100, H * 0.84 / totH * 100, M * 0.22), k = size / 100;
    const left = W / 2 - totW * k / 2, top = H / 2 - totH * k / 2;
    const kx = flip ? left + kw * k / 2 : left + totW * k - kw * k / 2;
    const ky = flip ? top + totH * k - size / 2 : top + size / 2;
    const out = outK(env), lw = hair(env), base = { font: Pm.font, size, track: tr, color: sc.fg };
    const e = E.outExpo(clamp((lt - 0.12) / 0.7)) * out, hb = size * 0.58;
    if (e > 0) {
      if (Pm.ext) {     // where the line would have gone on
        if (!flip) { env.line([[kx + hb, ky], [lerp(kx + hb, W * 0.96, e), ky]], sc.sub, lw, 0.32, false); env.line([[kx, ky - hb], [kx, lerp(ky - hb, H * 0.04, e)]], sc.sub, lw, 0.32, false); }
        else { env.line([[kx - hb, ky], [lerp(kx - hb, W * 0.04, e), ky]], sc.sub, lw, 0.32, false); env.line([[kx, ky + hb], [kx, lerp(ky + hb, H * 0.96, e)]], sc.sub, lw, 0.32, false); }
      }
      env.polyPartial(rectPts(kx - hb, ky - hb, kx + hb, ky + hb), e, sc.sub, lw, 0.8, false);
      label(env, `${pad2(ki + 1)} ⁄ 90°`, flip ? kx - hb : kx + hb, flip ? ky + hb + labelSize(env) : ky - hb - labelSize(env), { alpha: e * 0.9, size: labelSize(env) * 0.85, align: flip ? 'left' : 'right' });
    }
    let bb = null;
    if (!flip) {
      if (A) bb = UB(bb, J.mainDraw(env, Object.assign({}, base, { text: A, align: 'right', x: kx - kw * k / 2 - g * k, y: ky, mi: 0 })));
      bb = UB(bb, J.mainDraw(env, Object.assign({}, base, { text: K, x: kx, y: ky, color: Pm.key === 'accent' ? accentOn(sc) : sc.fg, mi: 2 })));
      if (vB) bb = UB(bb, J.mainDraw(env, Object.assign({}, base, { text: vB, vertical: true, x: kx, y: ky + size / 2 + g * k + armH * k / 2, mi: 4 })));
    } else {
      if (vA) bb = UB(bb, J.mainDraw(env, Object.assign({}, base, { text: vA, vertical: true, x: kx, y: top + armH * k / 2, mi: 0 })));
      bb = UB(bb, J.mainDraw(env, Object.assign({}, base, { text: K, x: kx, y: ky, color: Pm.key === 'accent' ? accentOn(sc) : sc.fg, mi: 2 })));
      if (B) bb = UB(bb, J.mainDraw(env, Object.assign({}, base, { text: B, align: 'left', x: kx + kw * k / 2 + g * k, y: ky, mi: 4 })));
    }
    return bb;
  },
});

/* 3 部分拡大 — one key glyph blown up solid and cut by the frame; the line is set small in the space it leaves */
regL('tzDetail', {
  name: '部分拡大', en: 'Detail Crop', tags: ['graphic', 'editorial', 'pop'], ae: 'huge', w: 1.1, emph: 1.3, fits: n => n >= 1 && n <= 16,
  plan(rng, cut, st) {
    return { font: rng.pick(fontsOf(st, ['display', 'serif'])), fm: rng.pick(fontsOf(st, ['serif', 'body', 'display'])), side: rng.pick(['a', 'b']), style: rng.pick(['solid', 'solid', 'accent', 'outline']), drift: rng.pick([1, -1]) };
  },
  render(env) {
    const { W, H, sc } = env, cut = env.cut, Pm = cut.params, lt = env.lt, M = Math.min(W, H);
    const port = W < H, txt = String(cut.text).trim(), arr = [...clean(txt)];
    const K = arr[keyIndex(arr, 'kanji')] || '・';
    const a = Pm.side === 'a', e = E.outExpo(clamp(lt / 0.8)), og = E.inCubic(env.pOut);
    const u = clamp(lt / Math.max(0.5, cut.dur)) * (env.fx.motion ?? 0.7);
    let G, gx, gy, it;
    const o = { lead: 1.24, track: 0.04 };
    if (!port) {
      G = Math.min(H * 1.3, W * 0.72);
      gx = a ? W * 0.47 - G / 2 : W * 0.53 + G / 2; gy = H * 0.5 + Pm.drift * G * 0.02 * (u - 0.5);
      gx += (a ? -1 : 1) * ((1 - e) + og) * G * 0.14;
      const mt = mainLines(txt, W, H, 6, 6);
      const size = Math.min(J.fitSize(mt, Pm.fm, W * 0.38, H * 0.56, o), M * 0.125);
      it = Object.assign({ text: mt, font: Pm.fm, size, align: 'left', x: a ? W * 0.55 : W * 0.07, y: H / 2, color: sc.fg }, o);
    } else {
      G = Math.min(W * 1.2, H * 0.6);
      gy = a ? H * 0.5 - G / 2 : H * 0.5 + G / 2; gx = W * 0.5 + Pm.drift * G * 0.02 * (u - 0.5) - Pm.drift * W * 0.06;
      gy += (a ? -1 : 1) * ((1 - e) + og) * G * 0.14;
      const mt = mainLines(txt, W, H, 6, 6);
      const size = Math.min(J.fitSize(mt, Pm.fm, W * 0.84, H * 0.3, o), W * 0.15);
      it = Object.assign({ text: mt, font: Pm.fm, size, align: 'left', x: W * 0.08, y: a ? H * 0.74 : H * 0.26, color: sc.fg }, o);
    }
    const gi = { text: K, font: Pm.font, size: G, x: gx, y: gy, ghost: false, alpha: clamp(e * 1.4) * (1 - og), color: Pm.style === 'accent' ? accentOn(sc) : sc.fg };
    if (Pm.style === 'outline') Object.assign(gi, { fill: false, stroke: Math.max(2, G * 0.009), strokeColor: sc.fg });
    env.draw(gi);
    const bb = J.mainDraw(env, it);
    const m = J.measure(it), la = E.outCubic(clamp((lt - 0.3) / 0.35)) * outK(env), ls = labelSize(env);
    if (la > 0) {
      const ty = it.y - m.h / 2 - ls * 1.7;
      label(env, `×${(G / it.size).toFixed(1)}`, it.x, ty, { alpha: la, color: accentOn(sc) });
      const xa = it.x + ls * 4.2;
      env.line([[xa, ty], [xa + Math.max(ls * 2, Math.min(m.w - ls * 4.2, W * 0.3)) * E.outExpo(clamp((lt - 0.3) / 0.6)), ty]], sc.sub, hair(env), 0.7 * la, false);
      label(env, 'U+' + K.codePointAt(0).toString(16).toUpperCase().padStart(4, '0'), it.x, it.y + m.h / 2 + ls * 1.5, { alpha: la * 0.8, size: ls * 0.85 });
    }
    return bb;
  },
});

/* 4 揃え見本 — the line set three times between two margin rules: flush left, centred, flush right; one row is filled */
regL('tzAlignSpec', {
  name: '揃え見本', en: 'Alignment Specimen', tags: ['editorial', 'graphic', 'calm'], ae: 'stack', w: 0.9, fits: n => n >= 1 && n <= 10,
  plan(rng, cut, st) {
    return { font: rng.pick(fontsOf(st, ['display', 'serif'])), row: rng.int(0, 2), other: rng.pick(['outline', 'outline', 'dim']), acc: rng.chance(0.4) };
  },
  render(env) {
    const { W, H, sc } = env, cut = env.cut, Pm = cut.params, lt = env.lt, M = Math.min(W, H);
    const port = W < H, txt = String(cut.text).trim().replace(/\s+/g, ' ');
    const Wb = port ? W * 0.86 : W * 0.72, leadK = 1.75, tr = 0.03;
    const size = Math.min(J.fitSize(txt, Pm.font, Wb * 0.64, 1e6, { track: tr }), M * 0.15, H * 0.62 / (3 * leadK));
    const x0 = W / 2 - Wb / 2, x1 = W / 2 + Wb / 2, out = outK(env), lw = hair(env), ls = labelSize(env) * 0.85;
    const names = ['FLUSH LEFT', 'CENTERED', 'FLUSH RIGHT'];
    const e0 = E.outExpo(clamp(lt / 0.7)) * out;
    if (e0 > 0) {
      const hh = (size * leadK + size * 0.95) * e0;
      env.line([[x0, H / 2 - hh], [x0, H / 2 + hh]], sc.sub, lw, 0.8, false);
      env.line([[x1, H / 2 - hh], [x1, H / 2 + hh]], sc.sub, lw, 0.8, false);
    }
    let bb = null;
    for (let i = 0; i < 3; i++) {
      const y = H / 2 + (i - 1) * size * leadK, e = E.outExpo(clamp((lt - 0.08 - i * 0.1) / 0.6)) * out;
      const it = { text: txt, font: Pm.font, size, track: tr, y, align: ['left', 'center', 'right'][i], x: i === 0 ? x0 + size * 0.1 : i === 1 ? W / 2 : x1 - size * 0.1 };
      if (i === Pm.row) bb = J.mainDraw(env, Object.assign(it, { color: Pm.acc ? accentOn(sc) : sc.fg, mi: 0 }));
      else if (e > 0) {
        if (Pm.other === 'outline') env.draw(Object.assign(it, { fill: false, stroke: Math.max(1.2, size * 0.012), strokeColor: sc.sub, color: sc.sub, dash: clamp((lt - 0.1 - i * 0.1) / 0.7), alpha: 0.85 * out, ghost: false }));
        else env.draw(Object.assign(it, { color: J.mix(sc.bg, sc.fg, 0.22), alpha: e, ghost: false }));
      }
      if (e > 0) {
        const yb = y + size * 0.64;
        const fromR = i === 2;
        env.line([[fromR ? x1 : x0, yb], [fromR ? lerp(x1, x0, e) : lerp(x0, x1, e), yb]], sc.sub, lw, 0.4, false);
        label(env, `${pad2(i + 1)} ${names[i]}`, i === 0 ? x1 - ls * 0.5 : x0 + ls * 0.5, yb - ls * 0.95, { alpha: e * (i === Pm.row ? 1 : 0.7), size: ls, align: i === 0 ? 'right' : 'left', color: i === Pm.row ? accentOn(sc) : sc.sub });
      }
    }
    return bb;
  },
});

/* 5 詰まる字間 — the glyphs start spread across the frame and the tracking closes (or opens) while a readout counts */
regL('tzTrackClose', {
  name: '詰まる字間', en: 'Closing Tracking', tags: ['editorial', 'calm', 'emotional', 'graphic'], ae: 'center', w: 1, fits: n => n >= 2 && n <= 14,
  plan(rng, cut, st) {
    return { font: rng.pick(fontsOf(st, ['display', 'serif', 'body'])), mode: rng.pick(['close', 'close', 'open']), ticks: rng.chance(0.8), jp: rng.chance(0.5) };
  },
  render(env) {
    const { W, H, sc } = env, cut = env.cut, Pm = cut.params, lt = env.lt, M = Math.min(W, H);
    const port = W < H, txt = String(cut.text).trim();
    const lines = mainLines(txt, W, H, 14, 6).split('\n'), L = lines.length, leadK = 1.6;
    let size = Math.min(M * 0.19, H * 0.68 / (L * leadK));
    for (const l of lines) size = Math.min(size, J.fitSize(l, Pm.font, W * 0.66, 1e6, { track: 0.02 }));
    const T = clamp(cut.dur * 0.55, 0.5, 1.6), q = E.inOutCubic(clamp((lt - 0.1) / T));
    const u = Pm.mode === 'open' ? 1 - q : q;        // 0 = spread, 1 = tight
    const span = W * 0.88 - size, out = outK(env), lw = hair(env), ls = labelSize(env);
    let bb = null, gi = 0, val = 0;
    lines.forEach((ln, li) => {
      const y = H / 2 + (li - (L - 1) / 2) * size * leadK - (L > 1 ? 0 : size * 0.05);
      const gl = [...J.layoutText({ text: ln, font: Pm.font, size, track: 0.02, align: 'center' })].filter(g => !isSp(g.ch));
      const m = gl.length; if (!m) return;
      const xs = gl.map((g, j) => W / 2 + lerp(m > 1 ? (j / (m - 1) - 0.5) * span : 0, g.x, u));
      gl.forEach((g, j) => { bb = UB(bb, J.mainDraw(env, { text: g.ch, font: Pm.font, size, x: xs[j], y, color: sc.fg, mi: gi++ })); });
      const e = E.outExpo(clamp((lt - 0.05 - li * 0.08) / 0.6)) * out;
      if (e <= 0) return;
      const xa = xs[0] - size * 0.5, xb = xs[m - 1] + size * 0.5, yb = y + size * 0.68, c = size * 0.09;
      env.line([[lerp((xa + xb) / 2, xa, e), yb], [lerp((xa + xb) / 2, xb, e), yb]], sc.sub, lw, 0.6, false);
      if (Pm.ticks) xs.forEach(x => env.line([[x, yb], [x, yb + c * e]], sc.sub, lw, 0.7, false));
      // chevrons pointing the way the tracking moves
      const d = Pm.mode === 'open' ? -1 : 1, xl = xa - size * 0.28, xr = xb + size * 0.28, ac = accentOn(sc);
      if (xl > W * 0.03) env.line([[xl - c * d, y - c], [xl, y], [xl - c * d, y + c]], ac, lw * 1.4, e, false);
      if (xr < W * 0.97) env.line([[xr + c * d, y - c], [xr, y], [xr + c * d, y + c]], ac, lw * 1.4, e, false);
      if (li === 0 && m > 1) val = Math.round(((xs[m - 1] - xs[0]) - (gl[m - 1].x - gl[0].x)) / (m - 1) / size * 1000);
    });
    const la = E.outCubic(clamp((lt - 0.1) / 0.3)) * out;
    if (la > 0) {
      const y = H / 2 + ((L - 1) / 2) * size * leadK + size * 0.68 + ls * 1.7;
      const latin = isLatinT(txt) || !Pm.jp;
      label(env, `${latin ? 'TRACKING' : '字送り'}  +${String(Math.max(0, val)).padStart(3, '0')}`, W / 2, y, { alpha: la, align: 'center', font: latin ? monoF(env) : bodyF(env), size: ls * 0.9 });
    }
    return bb;
  },
});

/* 6 軸組 — the lines alternate flush right / flush left against one vertical hairline axis */
regL('tzAxis', {
  name: '軸組', en: 'Axis Setting', tags: ['editorial', 'graphic', 'calm', 'emotional'], ae: 'mixed', w: 1.1, fits: n => n >= 2 && n <= 16,
  plan(rng, cut, st) {
    return { font: rng.pick(fontsOf(st, ['display', 'serif'])), first: rng.chance(0.5), axis: rng.pick(['sub', 'sub', 'accent']), idx: rng.chance(0.7), acc: rng.int(0, 5) };
  },
  render(env) {
    const { W, H, sc } = env, cut = env.cut, Pm = cut.params, lt = env.lt, M = Math.min(W, H);
    const txt = String(cut.text).trim(), n = J.glyphCount(txt);
    const Lw = W < H ? (n <= 3 ? 2 : n <= 7 ? 3 : n <= 11 ? 4 : 5) : (n <= 4 ? 2 : n <= 9 ? 3 : 4);
    const units = unitsOf(cut, Lw);
    let L = Math.min(Lw, units.length);
    const lines = groupFr(units, evenFr(L));
    L = lines.length;
    const leadK = 1.3, tr = 0.03, gap = 20;
    const onLeft = i => (i % 2 === 0) === !!Pm.first;      // true: flush right, ending at the axis
    const ws = lines.map(l => J.measure({ text: l, font: Pm.font, size: 100, track: tr }).w);
    let mL = 0, mR = 0; ws.forEach((w, i) => { if (onLeft(i)) mL = Math.max(mL, w); else mR = Math.max(mR, w); });
    const size = Math.min(W * 0.86 / (mL + mR + gap * 2) * 100, H * 0.8 / (L * leadK), M * 0.2), k = size / 100;
    const ax = W / 2 + (mL - mR) * k / 2, out = outK(env), lw = hair(env), ls = labelSize(env) * 0.85;
    const e = E.outExpo(clamp(lt / 0.7)) * out, hh = (L * size * leadK / 2 + size * 0.35);
    const aCol = Pm.axis === 'accent' ? accentOn(sc) : sc.sub;
    if (e > 0) env.line([[ax, H / 2 - hh * e], [ax, H / 2 + hh * e]], aCol, Pm.axis === 'accent' ? lw * 1.6 : lw, 0.85, false);
    let bb = null;
    lines.forEach((l, i) => {
      const y = H / 2 + (i - (L - 1) / 2) * size * leadK, left = onLeft(i);
      bb = UB(bb, J.mainDraw(env, { text: l, font: Pm.font, size, track: tr, align: left ? 'right' : 'left', x: ax + (left ? -1 : 1) * gap * k, y, color: L > 2 && i === Pm.acc % L ? accentOn(sc) : sc.fg, mi: i * 3 }));
      const a = E.outCubic(clamp((lt - 0.15 - i * 0.08) / 0.3)) * out;
      if (a > 0) {
        const d = left ? 1 : -1;      // the empty side
        env.line([[ax, y], [ax - d * size * 0.12 * a, y]], aCol, lw, 0.85, false);
        if (Pm.idx) label(env, pad2(i + 1), ax + d * gap * k * 0.8, y, { alpha: a * 0.85, size: ls, align: left ? 'left' : 'right' });
      }
    });
    return bb;
  },
});

/* 7 斜線区切り — word groups stepping down the frame, parted by long thin slashes */
regL('tzSlash', {
  name: '斜線区切り', en: 'Slash Divide', tags: ['graphic', 'editorial', 'pop'], ae: 'diag', w: 1, fits: n => n >= 2 && n <= 16,
  plan(rng, cut, st) {
    return { font: rng.pick(fontsOf(st, ['display', 'serif'])), step: rng.chance(0.7), tall: rng.chance(0.6), acc: rng.int(0, 3), num: rng.chance(0.7) };
  },
  render(env) {
    const { W, H, sc } = env, cut = env.cut, Pm = cut.params, lt = env.lt, M = Math.min(W, H);
    const port = W < H, txt = String(cut.text).trim(), n = J.glyphCount(txt);
    const Gw = n <= 4 ? 2 : n <= 10 ? 3 : 4;
    const units = unitsOf(cut, Gw);
    let G = Math.min(Gw, units.length);
    const gs = groupFr(units, evenFr(G));
    G = gs.length;
    const tr = 0.03, out = outK(env), lw = hair(env), ls = labelSize(env) * 0.85, ac = accentOn(sc);
    const ws = gs.map(g => J.measure({ text: g, font: Pm.font, size: 100, track: tr }).w);
    let bb = null;
    if (!port) {
      const gap = Pm.step ? 90 : 64, stepK = Pm.step ? 0.5 : 0;
      const sum = ws.reduce((a, b) => a + b, 0) + (G - 1) * gap;
      const size = Math.min(W * 0.86 / sum * 100, H * 0.72 / (1 + (G - 1) * stepK), M * 0.24), k = size / 100;
      const Hs = Pm.tall ? H * 0.84 : size * (2 + (G - 1) * stepK), tan = Math.tan(16 * J.DEG);
      let x = W / 2 - sum * k / 2;
      gs.forEach((g, i) => {
        const y = H / 2 + (i - (G - 1) / 2) * size * stepK;
        bb = UB(bb, J.mainDraw(env, { text: g, font: Pm.font, size, track: tr, align: 'left', x, y, color: sc.fg, mi: i * 3 }));
        x += ws[i] * k;
        if (i < G - 1) {
          const xs = x + gap * k / 2, ym = H / 2 + (i + 0.5 - (G - 1) / 2) * size * stepK;
          const e = E.outExpo(clamp((lt - 0.1 - i * 0.1) / 0.6)) * out;
          if (e > 0) {
            const hh = Hs / 2 * e, isA = i === Pm.acc % Math.max(1, G - 1);
            env.line([[xs + hh * tan, ym - hh], [xs - hh * tan, ym + hh]], isA ? ac : sc.sub, isA ? lw * 1.6 : lw, 0.9, false);
            if (Pm.num) label(env, pad2(i + 1), xs + Hs / 2 * tan + ls * 0.7, ym - Hs / 2 + ls * 0.8, { alpha: e * 0.85, size: ls });
          }
          x += gap * k;
        }
      });
    } else {
      const pitchK = 1.75;
      let size = Math.min(H * 0.76 / (G * pitchK), M * 0.24);
      ws.forEach(w => { size = Math.min(size, W * 0.8 / w * 100); });
      const sl = W * 0.44 * Math.tan(5 * J.DEG);
      gs.forEach((g, i) => {
        const y = H / 2 + (i - (G - 1) / 2) * size * pitchK;
        const al = Pm.step ? (i % 2 ? 'right' : 'left') : 'center';
        bb = UB(bb, J.mainDraw(env, { text: g, font: Pm.font, size, track: tr, align: al, x: al === 'left' ? W * 0.1 : al === 'right' ? W * 0.9 : W / 2, y, color: sc.fg, mi: i * 3 }));
        if (i < G - 1) {
          const ym = y + size * pitchK / 2, e = E.outExpo(clamp((lt - 0.1 - i * 0.1) / 0.6)) * out;
          if (e > 0) {
            const isA = i === Pm.acc % Math.max(1, G - 1), d = i % 2 ? -1 : 1;
            env.line([[W / 2 - W * 0.44 * e, ym + sl * e * d], [W / 2 + W * 0.44 * e, ym - sl * e * d]], isA ? ac : sc.sub, isA ? lw * 1.6 : lw, 0.9, false);
            if (Pm.num) label(env, pad2(i + 1), d > 0 ? W * 0.94 : W * 0.06, ym - sl - ls * 0.9, { alpha: e * 0.85, size: ls, align: d > 0 ? 'right' : 'left' });
          }
        }
      });
    }
    return bb;
  },
});

/* 8 沈む基線 — the big line is cut by a horizon hairline (sunk below it, or hanging from it); the whole line is repeated small */
regL('tzHorizon', {
  name: '沈む基線', en: 'Sunk Baseline', tags: ['emotional', 'calm', 'editorial', 'graphic'], ae: 'center', w: 1, fits: n => n >= 1 && n <= 15,
  plan(rng, cut, st) {
    return { font: rng.pick(fontsOf(st, ['display', 'serif'])), mode: rng.pick(['sink', 'sink', 'hang']), crop: rng.range(0.16, 0.24), cap: rng.chance(0.85), line: rng.pick(['accent', 'sub', 'fg']) };
  },
  render(env) {
    const { W, H, sc, ctx } = env, cut = env.cut, Pm = cut.params, lt = env.lt, M = Math.min(W, H);
    const txt = String(cut.text).trim();
    const mt = mainLines(txt, W, H, 8, 5), L = mt.split('\n').length, lead = 1.5, o = { lead, track: 0.03 };
    const size = Math.min(J.fitSize(mt, Pm.font, W * 0.84, H * 0.64, o), M * 0.27);
    const sink = Pm.mode !== 'hang', c = sink ? Pm.crop : Pm.crop * 0.7;
    const u = clamp(lt / Math.max(0.6, cut.dur)) * (env.fx.motion ?? 0.7);
    const dy = (sink ? 1 : -1) * size * 0.03 * u;
    const ys = [], hz = [];
    for (let li = 0; li < L; li++) { const yc = H / 2 + (li - (L - 1) / 2) * size * lead; ys.push(yc); hz.push(sink ? yc + size * (0.5 - c) : yc - size * (0.5 - c)); }
    ctx.save(); ctx.beginPath();
    ys.forEach((yc, li) => {
      const a = yc - size * lead / 2, b = yc + size * lead / 2;
      if (sink) { const t = li ? a : -H; ctx.rect(-W, t, W * 3, hz[li] - t); }
      else { const bt = li < L - 1 ? b : H * 2; ctx.rect(-W, hz[li], W * 3, bt - hz[li]); }
    });
    ctx.clip();
    const it = Object.assign({ text: mt, font: Pm.font, size, x: W / 2, y: H / 2 + dy, color: sc.fg }, o);
    const bb = J.mainDraw(env, it);
    ctx.restore();
    const out = outK(env), lw = hair(env), ls = labelSize(env);
    const col = Pm.line === 'accent' ? accentOn(sc) : Pm.line === 'fg' ? sc.fg : sc.sub;
    hz.forEach((y, li) => {
      const e = E.outExpo(clamp((lt - li * 0.08) / 0.7)) * out;
      if (e > 0) env.line([[W / 2 - W * 0.46 * e, y], [W / 2 + W * 0.46 * e, y]], li === 0 || Pm.line !== 'accent' ? col : sc.sub, Math.max(1.2, lw * 1.3), 0.9, false);
    });
    const la = E.outCubic(clamp((lt - 0.3) / 0.35)) * out;
    if (la > 0) {
      const mw = J.measure(it).w, xa = Math.max(W * 0.06, W / 2 - mw / 2), xb = Math.min(W * 0.94, W / 2 + mw / 2);
      const y = sink ? hz[L - 1] + ls * 1.5 : hz[0] - ls * 1.4;
      const cap = txt.replace(/\s+/g, ' ');
      if (Pm.cap) label(env, cap, xa, y, { alpha: la, font: bodyF(env), size: Math.min(ls * 1.05, (xb - xa) * 0.7 / Math.max(1, [...cap].length)), track: 0.2, color: sc.fg });
      label(env, `${sink ? '−' : '+'}${Math.round(c * 100)}%`, xb, y, { alpha: la * 0.85, size: ls * 0.85, align: 'right' });
    }
    return bb;
  },
});

/* 9 逆三角組 — centred lines that shorten (or lengthen) step by step, with two converging hairlines and an end mark */
regL('tzFunnel', {
  name: '逆三角組', en: 'Funnel Setting', tags: ['editorial', 'calm', 'graphic', 'emotional'], ae: 'stack', w: 1, fits: n => n >= 3 && n <= 16,
  plan(rng, cut, st) {
    return { font: rng.pick(fontsOf(st, ['serif', 'display', 'body'])), dir: rng.pick(['down', 'down', 'up']), sides: rng.chance(0.8), mark: rng.pick(['sq', 'sq', 'none']) };
  },
  render(env) {
    const { W, H, sc } = env, cut = env.cut, Pm = cut.params, lt = env.lt, M = Math.min(W, H);
    const txt = String(cut.text).trim(), n = J.glyphCount(txt), down = Pm.dir !== 'up';
    const L0 = n <= 5 ? 2 : n <= 11 ? 3 : 4;
    const frOf = L => { const w = Array.from({ length: L }, (_, i) => (down ? L - i : i + 1) + 0.4), s = w.reduce((a, b) => a + b, 0); let acc = 0; return w.map(v => (acc += v) / s); };
    const mono = ls => ls.every((l, i) => !i || (down ? J.glyphCount(l) <= J.glyphCount(ls[i - 1]) : J.glyphCount(l) >= J.glyphCount(ls[i - 1])));
    let units = unitsOf(cut, L0), lines = groupFr(units, frOf(Math.min(L0, units.length)));
    if (!isLatinT(txt) && (lines.length < 2 || !mono(lines))) { units = charUnits(txt); lines = groupFr(units, frOf(Math.min(L0, units.length))); }
    const L = lines.length, leadK = 1.5, tr = 0.1;
    let size = Math.min(H * 0.74 / (L * leadK), M * 0.2);
    for (const l of lines) size = Math.min(size, J.fitSize(l, Pm.font, W * 0.8, 1e6, { track: tr }));
    const ws = lines.map(l => J.measure({ text: l, font: Pm.font, size, track: tr }).w);
    const yOf = i => H / 2 + (i - (L - 1) / 2) * size * leadK;
    let bb = null;
    lines.forEach((l, i) => { bb = UB(bb, J.mainDraw(env, { text: l, font: Pm.font, size, track: tr, x: W / 2, y: yOf(i), color: sc.fg, mi: i * 3 })); });
    const out = outK(env), lw = hair(env), ls = labelSize(env) * 0.85;
    const e = E.outExpo(clamp((lt - 0.12) / 0.8)) * out;
    if (e > 0) {
      const y0 = yOf(0) - size * 0.62, y1 = yOf(L - 1) + size * 0.62, pad = size * 0.3;
      if (Pm.sides && L > 1) {
        let h0 = ws[0] / 2 + pad, h1 = ws[L - 1] / 2 + pad, extra = 0;
        for (let i = 1; i < L - 1; i++) { const t = (yOf(i) - y0) / (y1 - y0); extra = Math.max(extra, ws[i] / 2 + pad - lerp(h0, h1, t)); }
        h0 += extra; h1 += extra;
        const lim = W * 0.47; h0 = Math.min(h0, lim); h1 = Math.min(h1, lim);
        for (const d of [-1, 1]) env.line([[W / 2 + d * h0, y0], [W / 2 + d * lerp(h0, h1, e), lerp(y0, y1, e)]], sc.sub, lw, 0.6, false);
      }
      const ym = down ? y1 + size * 0.16 : y0 - size * 0.16, q = Math.max(4, size * 0.085);
      if (Pm.mark === 'sq') env.rect(W / 2 - q / 2, ym - q / 2, q, q, accentOn(sc), e, false);
      label(env, lines.map(l => J.glyphCount(l)).join(' · '), W / 2, ym + (down ? 1 : -1) * (q + ls * 1.1), { alpha: e * 0.85, size: ls, align: 'center' });
    }
    return bb;
  },
});

/* 10 拡大図 — a small box on one glyph of the line is projected by two hairlines to a large frame holding the glyph enlarged */
regL('tzZoomBox', {
  name: '拡大図', en: 'Enlarged Detail', tags: ['editorial', 'graphic', 'calm'], ae: 'gloss', w: 0.9, fits: n => n >= 2 && n <= 16,
  plan(rng, cut, st) {
    return { font: rng.pick(fontsOf(st, ['serif', 'display'])), flip: rng.chance(0.4), big: rng.pick(['outline', 'outline', 'fill']), mode: rng.pick(['kanji', 'kanji', 'mid']), cross: rng.chance(0.7) };
  },
  render(env) {
    const { W, H, sc } = env, cut = env.cut, Pm = cut.params, lt = env.lt, M = Math.min(W, H);
    const port = W < H, txt = String(cut.text).trim(), o = { lead: 1.3, track: 0.04 };
    const mt = mainLines(txt, W, H, 7, 6);
    let it, B, bx, by;
    if (!port) {
      const size = Math.min(J.fitSize(mt, Pm.font, W * 0.36, H * 0.5, o), M * 0.115);
      B = Math.min(H * 0.62, W * 0.36);
      it = Object.assign({ text: mt, font: Pm.font, size, align: 'left', x: Pm.flip ? W * 0.56 : W * 0.08, y: H / 2, color: sc.fg }, o);
      bx = Pm.flip ? W * 0.08 + B / 2 : W * 0.92 - B / 2; by = H / 2;
    } else {
      const size = Math.min(J.fitSize(mt, Pm.font, W * 0.84, H * 0.22, o), W * 0.135);
      B = Math.min(W * 0.68, H * 0.4);
      it = Object.assign({ text: mt, font: Pm.font, size, align: 'left', x: W * 0.08, y: Pm.flip ? H * 0.8 : H * 0.2, color: sc.fg }, o);
      bx = W / 2; by = Pm.flip ? H * 0.38 : H * 0.62;
    }
    const gp = glyphPts(it);
    const bb = J.mainDraw(env, it);
    if (!gp.length) return bb;
    const g = gp[Math.min(gp.length - 1, keyIndex(gp.map(p => p.ch), Pm.mode))];
    const out = outK(env), lw = hair(env), ls = labelSize(env) * 0.85, ac = accentOn(sc);
    const hb = it.size * 0.57, HB = B / 2;
    const e1 = E.outExpo(clamp((lt - 0.2) / 0.45)) * out, e2 = E.outCubic(clamp((lt - 0.35) / 0.5)) * out, e3 = E.outExpo(clamp((lt - 0.5) / 0.6)) * out;
    if (e1 > 0) env.polyPartial(rectPts(g.x - hb, g.y - hb, g.x + hb, g.y + hb), e1, ac, Math.max(1.2, lw * 1.3), 1, false);
    if (e2 > 0) {
      const horiz = Math.abs(bx - g.x) > Math.abs(by - g.y), d = horiz ? Math.sign(bx - g.x) : Math.sign(by - g.y);
      const pairs = horiz
        ? [[[g.x + d * hb, g.y - hb], [bx - d * HB, by - HB]], [[g.x + d * hb, g.y + hb], [bx - d * HB, by + HB]]]
        : [[[g.x - hb, g.y + d * hb], [bx - HB, by - d * HB]], [[g.x + hb, g.y + d * hb], [bx + HB, by - d * HB]]];
      for (const [a, b] of pairs) env.line([a, [lerp(a[0], b[0], e2), lerp(a[1], b[1], e2)]], sc.sub, lw, 0.55, false);
    }
    if (e3 > 0) {
      env.polyPartial(rectPts(bx - HB, by - HB, bx + HB, by + HB), e3, sc.sub, lw, 0.9, false);
      if (Pm.cross) { dashLine(env, [bx - HB * e3, by], [bx + HB * e3, by], sc.sub, lw, 0.35, B * 0.012, B * 0.012); dashLine(env, [bx, by - HB * e3], [bx, by + HB * e3], sc.sub, lw, 0.35, B * 0.012, B * 0.012); }
      const gi = { text: g.ch, font: Pm.font, size: B * 0.84, x: bx, y: by, ghost: false };
      if (Pm.big === 'outline') Object.assign(gi, { fill: false, stroke: Math.max(1.5, B * 0.007), strokeColor: sc.fg, color: sc.fg, dash: clamp((lt - 0.55) / 0.8), alpha: out });
      else Object.assign(gi, { color: J.mix(sc.bg, sc.fg, 0.3), alpha: e3 });
      env.draw(gi);
      label(env, `×${(B * 0.84 / it.size).toFixed(1)}`, bx - HB, by + HB + ls * 1.2, { alpha: e3, size: ls, color: ac });
      label(env, 'U+' + g.ch.codePointAt(0).toString(16).toUpperCase().padStart(4, '0'), bx + HB, by + HB + ls * 1.2, { alpha: e3 * 0.85, size: ls, align: 'right' });
    }
    return bb;
  },
});

/* 11 平体一字 — one glyph of the line is stretched sideways until the line fills the measure; a dimension line gives the width */
regL('tzWideOne', {
  name: '平体一字', en: 'Stretched Glyph', tags: ['graphic', 'pop', 'emotional', 'editorial'], ae: 'condensed', w: 0.8, fits: n => n >= 2 && n <= 14,
  plan(rng, cut, st) {
    return { font: rng.pick(fontsOf(st, ['display', 'serif'])), mode: rng.pick(['kanji', 'mid', 'last']), acc: rng.chance(0.5), dim: rng.chance(0.8) };
  },
  render(env) {
    const { W, H, sc } = env, cut = env.cut, Pm = cut.params, lt = env.lt, M = Math.min(W, H);
    const port = W < H, txt = String(cut.text).trim().replace(/\s+/g, ' ');
    const lines = (port ? mainLines(txt, W, H, 99, 5) : txt).split('\n'), L = lines.length;
    // which glyph: a long-vowel mark when there is one, else the key glyph
    const flat = []; lines.forEach((l, li) => [...l].forEach((ch, ci) => { if (!isSp(ch)) flat.push({ ch, li, ci }); }));
    if (!flat.length) return null;
    let fi = flat.findIndex((f, i) => i > 0 && (f.ch === 'ー' || f.ch === '〜' || f.ch === '～'));
    if (fi < 0 && isLatinT(txt)) fi = flat.findIndex((f, i) => i > 0 && 'oOaeuQ0'.includes(f.ch));
    if (fi < 0) fi = Pm.mode === 'last' ? (() => { for (let i = flat.length - 1; i >= 0; i--) if (okKey(flat[i].ch)) return i; return 0; })() : keyIndex(flat.map(f => f.ch), Pm.mode);
    const K = flat[fi], tr = 0.03, Wb = W * 0.86, leadK = 1.32;
    const size = Math.min(M * 0.2, H * 0.72 / (L * leadK), ...lines.map(l => J.fitSize(l, Pm.font, Wb * 0.7, 1e6, { track: tr })));
    const wOf = s => (s ? J.measure({ text: s, font: Pm.font, size, track: tr }).w : 0);
    const la = [...lines[K.li]], before = la.slice(0, K.ci).join(''), after = la.slice(K.ci + 1).join('');
    const bT = before.replace(/\s+$/, ''), aT = after.replace(/^\s+/, '');
    const sp = size * 0.3, g = size * tr;
    const wB = wOf(bT) + (bT ? (bT.length < before.length ? sp : g) : 0), wA = wOf(aT) + (aT ? (aT.length < after.length ? sp : g) : 0), kw = wOf(K.ch);
    const sxT = clamp((Wb - wB - wA) / kw, 1, 4);
    const e = E.outExpo(clamp((lt - 0.12) / 0.8)), sx = lerp(1, sxT, e);
    let blockW = wB + kw * sxT + wA; lines.forEach((l, li) => { if (li !== K.li) blockW = Math.max(blockW, wOf(l)); });
    const xL = W / 2 - blockW / 2, out = outK(env), lw = hair(env), ls = labelSize(env) * 0.85;
    let bb = null;
    lines.forEach((l, li) => {
      const y = H / 2 + (li - (L - 1) / 2) * size * leadK, base = { font: Pm.font, size, track: tr, align: 'left', y, color: sc.fg };
      if (li !== K.li) { bb = UB(bb, J.mainDraw(env, Object.assign({}, base, { text: l, x: xL, mi: li * 4 }))); return; }
      if (bT) bb = UB(bb, J.mainDraw(env, Object.assign({}, base, { text: bT, x: xL, mi: li * 4 })));
      const kx = xL + wB + kw * sx / 2;
      bb = UB(bb, J.mainDraw(env, Object.assign({}, base, { text: K.ch, align: 'center', x: kx, sx, color: Pm.acc ? accentOn(sc) : sc.fg, mi: li * 4 + 1 })));
      if (aT) bb = UB(bb, J.mainDraw(env, Object.assign({}, base, { text: aT, x: xL + wB + kw * sx + (wA - wOf(aT)), mi: li * 4 + 2 })));
      const a = E.outCubic(clamp((lt - 0.2) / 0.3)) * out;
      if (Pm.dim && a > 0) {
        const yd = y + size * 0.64, xa = kx - kw * sx / 2, xb = kx + kw * sx / 2, t = size * 0.07;
        env.line([[xa, yd], [xb, yd]], sc.sub, lw, 0.8 * a, false);
        env.line([[xa, yd - t], [xa, yd + t]], sc.sub, lw, 0.8 * a, false); env.line([[xb, yd - t], [xb, yd + t]], sc.sub, lw, 0.8 * a, false);
        const latin = isLatinT(txt);
        if (li === L - 1 || size * (leadK - 1) > ls * 2.4) label(env, `${latin ? 'WIDTH' : '平体'} ${Math.round(sx * 100)}%`, (xa + xb) / 2, yd + ls * 1.1, { alpha: a, size: ls, align: 'center', font: latin ? monoF(env) : bodyF(env) });
      }
    });
    return bb;
  },
});

/* 12 点対称 — the line and a second setting of it turned 180° face each other across a centre hairline */
regL('tzPointSym', {
  name: '点対称', en: 'Point Symmetry', tags: ['graphic', 'editorial', 'emotional'], ae: 'stack', w: 0.9, fits: n => n >= 1 && n <= 16,
  plan(rng, cut, st) {
    return { font: rng.pick(fontsOf(st, ['display', 'serif'])), top: rng.chance(0.75), al: rng.pick(['edge', 'edge', 'center']), copy: rng.pick(['outline', 'outline', 'dim']), mark: rng.chance(0.8) };
  },
  render(env) {
    const { W, H, sc } = env, cut = env.cut, Pm = cut.params, lt = env.lt, M = Math.min(W, H);
    const txt = String(cut.text).trim();
    const mt = mainLines(txt, W, H, 9, 5), o = { lead: 1.2, track: 0.03 };
    const size = Math.min(J.fitSize(mt, Pm.font, W * 0.8, H * 0.33, o), M * 0.17);
    const m = J.measure(Object.assign({ text: mt, font: Pm.font, size }, o)), gapY = size * 0.34;
    const s = Pm.top ? -1 : 1;
    const cx = Pm.al === 'edge' ? (Pm.top ? W * 0.08 + m.w / 2 : W * 0.92 - m.w / 2) : W / 2, cy = H / 2 + s * (gapY + m.h / 2);
    const out = outK(env), lw = hair(env), ls = labelSize(env) * 0.85;
    const e = E.outExpo(clamp(lt / 0.8)) * out;
    if (e > 0) {
      env.line([[W / 2 - W * 0.46 * e, H / 2], [W / 2 + W * 0.46 * e, H / 2]], sc.sub, lw, 0.7, false);
      if (Pm.mark) {
        const r = Math.max(4, size * 0.07);
        env.circle(W / 2, H / 2, r * e, sc.bg, accentOn(sc), Math.max(1.2, lw * 1.3), 1, false);
        label(env, '180°', Pm.top ? W * 0.94 : W * 0.06, H / 2 + s * ls * 1.1, { alpha: e * 0.9, size: ls, align: Pm.top ? 'right' : 'left' });
      }
    }
    const a = E.outCubic(clamp((lt - 0.15) / 0.5)) * out;
    if (a > 0) {
      const ci = Object.assign({ text: mt, font: Pm.font, size, x: W - cx, y: H - cy, rot: 180, ghost: false }, o);
      if (Pm.copy === 'outline') Object.assign(ci, { fill: false, stroke: Math.max(1.2, size * 0.012), strokeColor: sc.sub, color: sc.sub, dash: clamp((lt - 0.15) / 0.8), alpha: 0.9 * out });
      else Object.assign(ci, { color: J.mix(sc.bg, sc.fg, 0.24), alpha: a });
      env.draw(ci);
    }
    return J.mainDraw(env, Object.assign({ text: mt, font: Pm.font, size, x: cx, y: cy, color: sc.fg }, o));
  },
});

/* 13 割り出し — the frame as a page: ninths ticked on the edges, diagonals, and the classic text block they give; the line sits in it */
regL('tzCanon', {
  name: '割り出し', en: 'Page Canon', tags: ['editorial', 'calm', 'graphic'], ae: 'gloss', w: 0.9, fits: n => n >= 1 && n <= 18,
  plan(rng, cut, st) {
    return { font: rng.pick(fontsOf(st, ['serif', 'display', 'body'])), flip: rng.chance(0.5), low: rng.chance(0.35), block: rng.pick(['sub', 'sub', 'accent']), ticks: rng.chance(0.8) };
  },
  render(env) {
    const { W, H, sc } = env, cut = env.cut, Pm = cut.params, lt = env.lt, M = Math.min(W, H);
    const txt = String(cut.text).trim();
    const px = W * 0.045, py = H * 0.055, pw = W - px * 2, ph = H - py * 2;
    const fx = v => px + pw * (Pm.flip ? 1 - v : v), fy = v => py + ph * v;
    const tx0 = Math.min(fx(1 / 9), fx(7 / 9)), tx1 = Math.max(fx(1 / 9), fx(7 / 9)), ty0 = fy(1 / 9), ty1 = fy(7 / 9);
    const Tw = tx1 - tx0, Th = ty1 - ty0;
    const mt = mainLines(txt, W, H, 9, 5), o = { lead: 1.26, track: 0.03 };
    const size = Math.min(J.fitSize(mt, Pm.font, Tw * 0.9, Th * 0.7, o), M * 0.165);
    const m = J.measure(Object.assign({ text: mt, font: Pm.font, size }, o)), ins = Math.min(Tw, Th) * 0.06;
    const it = Object.assign({ text: mt, font: Pm.font, size, align: 'left', x: tx0 + ins, y: Pm.low ? ty1 - ins - m.h / 2 : ty0 + ins + m.h / 2, color: sc.fg }, o);
    const out = outK(env), lw = hair(env), ls = labelSize(env) * 0.8;
    const e1 = E.outExpo(clamp(lt / 0.8)) * out, e2 = E.outCubic(clamp((lt - 0.15) / 0.6)) * out, e3 = E.outExpo(clamp((lt - 0.3) / 0.7)) * out;
    if (e1 > 0) env.polyPartial(rectPts(px, py, px + pw, py + ph), e1, sc.sub, lw, 0.5, false);
    if (e2 > 0) {       // diagonals, drawn only outside the text block
      const seg = (a, b) => env.line([[fx(a[0]), fy(a[1])], [lerp(fx(a[0]), fx(b[0]), e2), lerp(fy(a[1]), fy(b[1]), e2)]], sc.sub, lw, 0.4, false);
      seg([0, 0], [1 / 9, 1 / 9]); seg([1, 1], [7 / 9, 7 / 9]); seg([1, 0], [7 / 9, 2 / 9]); seg([0, 1], [2 / 9, 7 / 9]);
      if (Pm.ticks) {
        const t = M * 0.012;
        for (let i = 1; i < 9; i++) {
          env.line([[px + pw * i / 9, py], [px + pw * i / 9, py + t * e2]], sc.sub, lw, 0.7, false);
          env.line([[px, py + ph * i / 9], [px + t * e2, py + ph * i / 9]], sc.sub, lw, 0.7, false);
        }
      }
    }
    if (e3 > 0) {
      env.polyPartial(rectPts(tx0, ty0, tx1, ty1), e3, Pm.block === 'accent' ? accentOn(sc) : sc.sub, lw, 0.85, false);
      label(env, '1/9', (fx(0) + fx(1 / 9)) / 2, ty0 + ls, { alpha: e3 * 0.85, size: ls, align: 'center' });
      label(env, '2/9', (fx(7 / 9) + fx(1)) / 2, ty1 - ls, { alpha: e3 * 0.85, size: ls, align: 'center' });
      label(env, `6/9 × 6/9   No.${pad2((cut.line | 0) + 1)}`, tx0, ty1 + ls * 1.3, { alpha: e3 * 0.85, size: ls });
    }
    return J.mainDraw(env, it);
  },
});

/* 14 字面線 — each line of type runs through its own metric lines (body top, centre, baseline, body bottom), drawn to the frame edges and named */
regL('tzMetric', {
  name: '字面線', en: 'Metric Lines', tags: ['editorial', 'graphic', 'calm'], ae: 'type', w: 0.9, fits: n => n >= 1 && n <= 16,
  plan(rng, cut, st) {
    return { font: rng.pick(fontsOf(st, ['serif', 'display'])), em: rng.chance(0.8), base: rng.pick(['accent', 'accent', 'fg']), right: rng.chance(0.3) };
  },
  render(env) {
    const { W, H, sc } = env, cut = env.cut, Pm = cut.params, lt = env.lt, M = Math.min(W, H);
    const txt = String(cut.text).trim();
    const mt = mainLines(txt, W, H, 8, 4), L = mt.split('\n').length, lead = 1.56, o = { lead, track: 0.04 };
    const size = Math.min(J.fitSize(mt, Pm.font, W * 0.72, H * 0.78, o), M * 0.26);
    const it = Object.assign({ text: mt, font: Pm.font, size, align: Pm.right ? 'right' : 'left', x: Pm.right ? W * 0.86 : W * 0.14, y: H / 2, color: sc.fg }, o);
    const out = outK(env), lw = hair(env), ls = labelSize(env) * 0.75, bc = Pm.base === 'accent' ? accentOn(sc) : sc.fg;
    const xa = W * 0.03, xb = W * 0.97;
    for (let li = 0; li < L; li++) {
      const yc = H / 2 + (li - (L - 1) / 2) * size * lead;
      const rows = [[yc - size * 0.5, sc.sub, 0.5, 'TOP'], [yc, sc.sub, 0.3, 'CTR'], [yc + size * 0.38, bc, 0.85, 'BASE'], [yc + size * 0.5, sc.sub, 0.5, 'BTM']];
      rows.forEach(([y, col, al, name], j) => {
        const e = E.outExpo(clamp((lt - li * 0.08 - j * 0.05) / 0.7)) * out;
        if (e <= 0) return;
        const from = (li + j) % 2 ? xb : xa, to = lerp(from, from === xa ? xb : xa, e);
        if (j === 1) dashLine(env, [from, y], [to, y], col, lw, al, size * 0.05, size * 0.05); else env.line([[from, y], [to, y]], col, j === 2 ? Math.max(1.2, lw * 1.3) : lw, al, false);
        if (li === 0 || L <= 2) {
          const leftSide = Pm.right ? j % 2 === 1 : j % 2 === 0;
          label(env, name, leftSide ? xa + ls * 0.3 : xb - ls * 0.3, y - ls * 0.85, { alpha: e * 0.85, size: ls, align: leftSide ? 'left' : 'right', color: j === 2 ? bc : sc.sub });
        }
      });
    }
    const bb = J.mainDraw(env, it);
    if (Pm.em) {
      const gp = glyphPts(it), g = Pm.right ? gp.filter(p => p.li === 0).pop() : gp[0], e = E.outExpo(clamp((lt - 0.3) / 0.6)) * out;
      if (g && e > 0) {
        const hw = Math.max(g.w, size * 0.9) / 2, yt = g.y - size * 0.5 - size * 0.2 * e, ybm = g.y + size * 0.5 + size * 0.2 * e;
        env.line([[g.x - hw, yt], [g.x - hw, ybm]], sc.sub, lw, 0.6 * e, false);
        env.line([[g.x + hw, yt], [g.x + hw, ybm]], sc.sub, lw, 0.6 * e, false);
        if (yt - ls > H * 0.04) label(env, `EM ${Math.round(size / (M / 1080))}`, g.x, yt - ls * 0.9, { alpha: e * 0.9, size: ls, align: 'center' });
      }
    }
    return bb;
  },
});

/* 15 順路 — the glyphs stand loosely apart, numbered, and a hairline walks from one to the next in reading order */
regL('tzPath', {
  name: '順路', en: 'Reading Path', tags: ['graphic', 'editorial', 'pop'], ae: 'scatter', w: 0.55, fits: n => n >= 2 && n <= 12,
  plan(rng, cut, st) {
    return { font: rng.pick(fontsOf(st, ['display', 'serif'])), seed: rng.int(1, 1e6), num: rng.chance(0.85), end: rng.chance(0.7), line: rng.pick(['sub', 'sub', 'accent']) };
  },
  render(env) {
    const { W, H, sc } = env, cut = env.cut, Pm = cut.params, lt = env.lt, M = Math.min(W, H);
    const port = W < H, txt = String(cut.text).trim();
    let units = isLatinT(txt) ? txt.split(/\s+/).filter(Boolean) : charUnits(txt);
    if (units.length > 12) units = groupFr(units, evenFr(12));
    const n = units.length; if (!n) return null;
    const cols = port ? Math.min(n, n <= 4 ? 2 : 3) : Math.min(n, n <= 6 ? n : Math.ceil(n / 2)), rows = Math.ceil(n / cols);
    const aw = W * 0.86, ah = Math.min(H * 0.78, rows === 1 ? M * 0.5 : 1e9), cw = aw / cols, ch = ah / rows;
    let size = Math.min(ch * 0.58, M * 0.24);
    for (const u of units) size = Math.min(size, cw * 0.62 / Math.max(0.2, J.measure({ text: u, font: Pm.font, size: 1 }).w));
    const s = Pm.seed || 1, pts = units.map((u, i) => {
      const c = i % cols, r = Math.floor(i / cols), lastRow = r === rows - 1, inRow = lastRow ? n - r * cols : cols;
      const x0 = W / 2 - inRow * cw / 2;
      return [x0 + (c + 0.5) * cw + J.rs(s, i, 1) * cw * 0.1, H / 2 - ah / 2 + (r + 0.5) * ch + J.rs(s, i, 2) * ch * 0.19];
    });
    const out = outK(env), lw = hair(env), ls = Math.min(labelSize(env) * 0.85, size * 0.3), lc = Pm.line === 'accent' ? accentOn(sc) : sc.sub;
    const half = units.map(u => ({ w: J.measure({ text: u, font: Pm.font, size }).w / 2 + size * 0.14, h: size * 0.62 }));
    // hairline from glyph to glyph, stopping short of the glyph bodies
    for (let i = 0; i < n - 1; i++) {
      const e = E.outCubic(clamp((lt - 0.2 - i * 0.07) / 0.35)) * out;
      if (e <= 0) continue;
      const [ax, ay] = pts[i], [bx, by] = pts[i + 1], dx = bx - ax, dy = by - ay, d = Math.hypot(dx, dy) || 1;
      const cutT = (hw, hh) => Math.min(Math.abs(dx) > 1e-6 ? hw / Math.abs(dx) : 1e9, Math.abs(dy) > 1e-6 ? hh / Math.abs(dy) : 1e9);
      const t0 = cutT(half[i].w, half[i].h), t1 = 1 - cutT(half[i + 1].w, half[i + 1].h);
      if (t1 - t0 < 0.04) continue;
      const te = lerp(t0, t1, e);
      env.line([[ax + dx * t0, ay + dy * t0], [ax + dx * te, ay + dy * te]], lc, lw, 0.75, false);
    }
    let bb = null;
    units.forEach((u, i) => {
      const [x, y] = pts[i];
      bb = UB(bb, J.mainDraw(env, { text: u, font: Pm.font, size, x, y, color: sc.fg, mi: i }));
      const a = E.outCubic(clamp((lt - 0.1 - i * 0.07) / 0.3)) * out;
      if (Pm.num && a > 0) label(env, pad2(i + 1), x - half[i].w + size * 0.1, y - size * 0.62 - ls * 0.2, { alpha: a * 0.9, size: ls, color: i === 0 ? accentOn(sc) : sc.sub, align: 'right' });
    });
    if (Pm.end) {
      const a = E.outBack(clamp((lt - 0.25 - n * 0.07) / 0.3), 2) * out, q = Math.max(4, size * 0.09), [x, y] = pts[n - 1];
      if (a > 0) env.rect(x + half[n - 1].w + q * 0.4, y + size * 0.36 - q * a, q * a, q * a, accentOn(sc), 1, false);
    }
    return bb;
  },
});

/* ================================================================== DECOR */
const Uq = env => Math.min(env.W, env.H) / 1080;
const MG = env => Math.round(Math.min(env.W, env.H) * 0.05);
const FS = env => Math.max(11, 16 * Uq(env));
const bwOf = bb => bb.x1 - bb.x0, bhOf = bb => bb.y1 - bb.y0;
const hitBB = (x0, y0, x1, y1, bb, pad = 0) => !(x1 < bb.x0 - pad || x0 > bb.x1 + pad || y1 < bb.y0 - pad || y0 > bb.y1 + pad);
/* remember the last real bbox of a cut so decor does not jump while the lyric is hidden */
const BBC = new WeakMap();
const getBB = (env, bb) => {
  if (bb && isFinite(bb.x0 + bb.x1 + bb.y0 + bb.y1) && bb.x1 > bb.x0 && bb.y1 > bb.y0) {
    const b = { x0: Math.max(bb.x0, -env.W * 0.1), x1: Math.min(bb.x1, env.W * 1.1), y0: Math.max(bb.y0, -env.H * 0.1), y1: Math.min(bb.y1, env.H * 1.1), boxes: bb.boxes || [], cx: bb.cx, cy: bb.cy };
    if (env.cut) BBC.set(env.cut, b);
    return b;
  }
  const c = env.cut && BBC.get(env.cut);
  return c || Object.assign({ boxes: [] }, J.centerBB(env, null));
};
/* glyph cells of the lyric in reading order: the real glyph boxes when the layout gave them, else an even grid over the bbox */
const glyphCells = (env, bb) => {
  const out = [], vert = bhOf(bb) > bwOf(bb) * 1.2;
  if (bb.boxes && bb.boxes.length && bb.boxes.length <= 40 && bb.cx != null) {
    for (const b of bb.boxes) { const x = bb.cx + b.x, y = bb.cy + b.y; if (x > bb.x0 - 4 && x < bb.x1 + 4 && y > bb.y0 - 4 && y < bb.y1 + 4) out.push({ x, y, w: b.w, h: b.h }); }
    if (out.length) { out.vert = vert && out.length > 1 && Math.abs(out[1].y - out[0].y) > Math.abs(out[1].x - out[0].x); return out; }
  }
  const n = clamp(J.glyphCount(String((env.cut && env.cut.text) || '')), 1, 30), w = bwOf(bb), h = bhOf(bb);
  let best = 1, bv = 1e9;
  for (let r = 1; r <= Math.min(6, n); r++) { const a = vert ? w / r : w / Math.ceil(n / r), b = vert ? h / Math.ceil(n / r) : h / r, v = Math.abs(Math.log(a / b)); if (v < bv - 1e-6) { bv = v; best = r; } }
  const per = Math.ceil(n / best);
  for (let i = 0; i < n; i++) {
    const a = Math.floor(i / per), b = i % per;
    if (!vert) out.push({ x: bb.x0 + (b + 0.5) * w / per, y: bb.y0 + (a + 0.5) * h / best, w: w / per, h: h / best });
    else out.push({ x: bb.x1 - (a + 0.5) * w / best, y: bb.y0 + (b + 0.5) * h / per, w: w / best, h: h / per });
  }
  out.vert = vert;
  return out;
};
const decor = (key, def, fn) => regD(key, Object.assign(def, {
  draw(env, bb0, Pd) {
    if (env.pass !== 'main' || env.lt < 0) return;
    const o = outK(env); if (o <= 0.003) return;
    fn(env, getBB(env, bb0), Pd || {}, o, Uq(env));
  },
}));

/* 注記号 — a small reference mark at the lyric's shoulder and the matching footnote line in the margin */
decor('tzNoteMark', { name: '注記号', en: 'Note Mark', tags: ['editorial', 'calm', 'emotional'], ae: 'leaders', w: 1, layer: 'front' }, (env, bb, Pd, o, u) => {
  const { W, H, sc } = env, cut = env.cut, m = MG(env), fs = FS(env), lt = env.lt;
  const mk = ['※', '＊', '†'][(Pd.v | 0) % 3], num = String(clamp(Pd.n | 0, 1, 3)), ac = accentOn(sc);
  const ms = fs * 1.9, a = E.outBack(clamp((lt - 0.15) / 0.35), 1.6) * o;
  let x = bb.x1 + ms * 0.55, y = bb.y0 + ms * 0.15;
  if (x + ms * 1.2 > W - m * 0.5) { x = bb.x1 - ms * 0.6; y = bb.y0 - ms * 0.75; }
  if (y > m * 0.5 && a > 0) {
    label(env, mk, x, y, { font: bodyF(env), size: ms * (0.6 + 0.4 * clamp(a)), color: ac, alpha: clamp(a), align: 'center', track: 0 });
    label(env, num, x + ms * 0.62, y - ms * 0.22, { size: ms * 0.55, color: ac, alpha: clamp(a), align: 'left', track: 0 });
  }
  const note = `${num}  ${J.fmtTime(cut.start)} — L${pad2((cut.line | 0) + 1)} / ${pad2(J.glyphCount(String(cut.text || '')))}`;
  const nw = tw(note, monoF(env), fs * 0.9) + fs * 1.4, right = !!Pd.right;
  for (const yF of (Pd.low === false ? [m + fs * 1.4, H - m - fs * 0.5] : [H - m - fs * 0.5, m + fs * 1.4])) {
    const x0 = right ? W - m - nw : m;
    if (hitBB(x0, yF - fs * 2, x0 + nw, yF + fs, bb, 10 * u)) continue;
    const e = E.outExpo(clamp((lt - 0.25) / 0.6)) * o;
    if (e <= 0) return;
    env.line([[x0, yF - fs * 1.25], [x0 + Math.min(nw, W * 0.16) * e, yF - fs * 1.25]], sc.sub, Math.max(1, u), 0.7 * o, false);
    label(env, mk, x0 + fs * 0.45, yF, { font: bodyF(env), size: fs * 0.95, color: ac, alpha: e, align: 'center', track: 0 });
    const arr = [...note], k = Math.floor(arr.length * clamp((lt - 0.3) / 0.5));
    if (k > 0) label(env, arr.slice(0, k).join(''), x0 + fs * 1.2, yF, { size: fs * 0.9, alpha: o * 0.9 });
    return;
  }
});

/* 進行罫 — a hairline as long as the lyric; a heavier rule grows along it with the cut's time, a small numeral riding its head */
decor('tzProgRule', { name: '進行罫', en: 'Progress Rule', tags: ['editorial', 'calm', 'graphic', 'emotional'], ae: 'bars', w: 1.1, layer: 'front' }, (env, bb, Pd, o, u) => {
  const { W, H, sc } = env, cut = env.cut, m = MG(env), fs = FS(env), lt = env.lt;
  const horiz = bwOf(bb) >= bhOf(bb) * 0.8, gap = 16 * u + (horiz ? bhOf(bb) : bwOf(bb)) * 0.07;
  const e = E.outExpo(clamp(lt / 0.6)), q = clamp(lt / Math.max(0.3, cut.dur - (cut.outDur || 0) * 0.5));
  const lw = Math.max(1, u), col = Pd.accent ? accentOn(sc) : sc.fg;
  let a0, a1, c, side;
  if (horiz) {
    const mid = (bb.x0 + bb.x1) / 2, half = Math.max(bwOf(bb), W * 0.24) / 2;
    a0 = Math.max(m, mid - half); a1 = Math.min(W - m, mid + half);
    side = Pd.low === false ? -1 : 1; c = side > 0 ? bb.y1 + gap : bb.y0 - gap;
    if (c > H - m - fs * 2 || c < m + fs * 2) { side = -side; c = side > 0 ? bb.y1 + gap : bb.y0 - gap; }
    if (c > H - m * 0.6 || c < m * 0.6) return;
  } else {
    const mid = (bb.y0 + bb.y1) / 2, half = Math.max(bhOf(bb), H * 0.24) / 2;
    a0 = Math.max(m, mid - half); a1 = Math.min(H - m, mid + half);
    side = Pd.right === false ? -1 : 1; c = side > 0 ? bb.x1 + gap : bb.x0 - gap;
    if (c > W - m - fs * 3 || c < m + fs * 3) { side = -side; c = side > 0 ? bb.x1 + gap : bb.x0 - gap; }
    if (c > W - m * 0.6 || c < m * 0.6) return;
  }
  const pt = (a, b) => (horiz ? [a, b] : [b, a]);
  const aE = lerp(a0, a1, e), aQ = lerp(a0, a1, q * e), t = 5 * u;
  env.line([pt(a0, c), pt(aE, c)], sc.sub, lw, 0.45 * o, false);
  env.line([pt(a0, c - t), pt(a0, c + t)], sc.sub, lw, 0.8 * o, false);
  if (e > 0.98) env.line([pt(a1, c - t), pt(a1, c + t)], sc.sub, lw, 0.8 * o, false);
  if (aQ - a0 > 1) env.line([pt(a0, c), pt(aQ, c)], col, Math.max(2, 3 * u), o, false);
  const la = E.outCubic(clamp((lt - 0.15) / 0.3)) * o;
  if (la > 0) {
    const txt = (Pd.v | 0) % 2 ? J.fmtTime(cut.start + lt) : pad2(Math.round(q * 100));
    if (horiz) label(env, txt, clamp(aQ, a0 + fs, a1 - fs), c + side * fs * 1.25, { size: fs, alpha: la, align: 'center', color: sc.fg });
    else label(env, txt, c + side * fs * 0.9, clamp(aQ, a0 + fs, a1 - fs), { size: fs, alpha: la, align: side > 0 ? 'left' : 'right', color: sc.fg });
  }
});

/* 字送り記号 — under (or beside) the lyric: a short rule per glyph, a caret in every gap and the spacing values in small numerals */
decor('tzTrackMarks', { name: '字送り記号', en: 'Tracking Marks', tags: ['editorial', 'graphic', 'calm'], ae: 'brackets', w: 0.9, layer: 'front' }, (env, bb, Pd, o, u) => {
  const { W, H, sc } = env, m = MG(env), fs = FS(env) * 0.88, lt = env.lt;
  let cells = glyphCells(env, bb);
  const vert = !!cells.vert;
  // one line (or column) of glyphs only: the last one
  if (!vert) { const yl = Math.max(...cells.map(c => c.y)); cells = cells.filter(c => Math.abs(c.y - yl) < c.h * 0.5).sort((a, b) => a.x - b.x); }
  else { const xl = Math.max(...cells.map(c => c.x)); cells = cells.filter(c => Math.abs(c.x - xl) < c.w * 0.5).sort((a, b) => a.y - b.y); }
  const n = cells.length; if (!n) return;
  const sz = vert ? cells[0].w : cells[0].h, gap = 12 * u + sz * 0.1, lw = Math.max(1, u), ac = accentOn(sc);
  let side = vert ? 1 : (Pd.low === false ? -1 : 1);
  let c = vert ? bb.x1 + gap : (side > 0 ? bb.y1 + gap : bb.y0 - gap);
  if (!vert && (c > H - m - fs * 2.4 || c < m + fs * 2.4)) { side = -side; c = side > 0 ? bb.y1 + gap : bb.y0 - gap; }
  if (vert && c > W - m - fs * 3) { side = -1; c = bb.x0 - gap; }
  if ((vert ? W : H) - c < m * 0.6 || c < m * 0.6) return;
  const pt = (a, b) => (vert ? [b, a] : [a, b]);
  const lo = g => (vert ? g.y - g.h / 2 : g.x - g.w / 2), hi = g => (vert ? g.y + g.h / 2 : g.x + g.w / 2);
  const t = 4 * u;
  cells.forEach((g, i) => {
    const e = E.outExpo(clamp((lt - 0.08 - i * 0.03) / 0.45)) * o;
    if (e <= 0) return;
    const a0 = lo(g) + sz * 0.06, a1 = hi(g) - sz * 0.06, mid = (a0 + a1) / 2;
    env.line([pt(lerp(mid, a0, e), c), pt(lerp(mid, a1, e), c)], sc.sub, lw, 0.85, false);
    if (i < n - 1) {
      const gm = (hi(g) + lo(cells[i + 1])) / 2;
      env.line([pt(gm - t, c + side * t * 1.5), pt(gm, c), pt(gm + t, c + side * t * 1.5)], ac, lw, e, false);
      if (n <= 9) {
        const v = Math.round((lo(cells[i + 1]) - hi(g)) / sz * 1000);
        if (!vert) label(env, (v >= 0 ? '+' : '−') + Math.abs(v), gm, c + side * (t * 1.5 + fs), { size: fs, alpha: e * 0.9, align: 'center', track: 0.02 });
        else label(env, (v >= 0 ? '+' : '−') + Math.abs(v), c + side * (t * 1.5 + fs * 0.5), gm, { size: fs, alpha: e * 0.9, align: side > 0 ? 'left' : 'right', track: 0.02 });
      }
    }
  });
  if (n > 9 || n === 1) {
    const e = E.outCubic(clamp((lt - 0.3) / 0.3)) * o, span = Math.round((hi(cells[n - 1]) - lo(cells[0])) / u);
    if (e > 0) { if (!vert) label(env, `W ${span}`, lo(cells[0]), c + side * fs * 1.5, { size: fs, alpha: e * 0.9 }); else label(env, `H ${span}`, c + side * fs * 0.8, lo(cells[0]) + fs, { size: fs, alpha: e * 0.9, align: side > 0 ? 'left' : 'right' }); }
  }
});

/* 縦キャプション — a figure caption in a mono face, turned 90° and typed along the side of the lyric beside a hairline */
decor('tzSideCaption', { name: '縦キャプション', en: 'Side Caption', tags: ['editorial', 'graphic', 'calm'], ae: 'leaders', w: 1, layer: 'front' }, (env, bb, Pd, o, u) => {
  const { W, H, sc } = env, cut = env.cut, m = MG(env), fs = FS(env), lt = env.lt;
  const gap = 18 * u + Math.min(bwOf(bb), bhOf(bb)) * 0.05;
  let side = Pd.right ? 1 : -1, x = 0, ok = false;
  for (let k = 0; k < 2 && !ok; k++) { x = side > 0 ? bb.x1 + gap + fs : bb.x0 - gap - fs; ok = x > m * 0.7 && x < W - m * 0.7; if (!ok) side = -side; }
  if (!ok) return;
  let cap = `FIG.${pad2((cut.index | 0) + 1)} — ${J.fmtTime(cut.start)} — ${pad2(J.glyphCount(String(cut.text || '')))} GLYPHS`;
  if (tw(cap, monoF(env), fs, 0.16) > H - m * 2) cap = `FIG.${pad2((cut.index | 0) + 1)} — ${J.fmtTime(cut.start)}`;
  const L = tw(cap, monoF(env), fs, 0.16), y0 = Math.max(m, bb.y0), y1 = Math.min(H - m, bb.y1), cy = clamp((y0 + y1) / 2, m + L / 2, H - m - L / 2);
  const e = E.outExpo(clamp(lt / 0.6)) * o, xr = x - side * fs * 0.95;
  if (e > 0) {
    const ya = Math.min(y0, cy - L / 2), yb = Math.max(y1, cy + L / 2);
    env.line([[xr, side > 0 ? ya : yb], [xr, side > 0 ? lerp(ya, yb, e) : lerp(yb, ya, e)]], sc.sub, Math.max(1, u), 0.7, false);
    const t = 5 * u; env.line([[xr, side > 0 ? ya : yb], [xr + side * t * 2, side > 0 ? ya : yb]], accentOn(sc), Math.max(1.5, 2 * u), e, false);
  }
  const arr = [...cap], k = Math.floor(arr.length * clamp((lt - 0.12) / 0.6));
  if (k > 0) {
    const part = arr.slice(0, k).join(''), pw = tw(part, monoF(env), fs, 0.16);
    // typed from the start of the line: keep the start fixed while the string grows
    const yc = side > 0 ? cy - L / 2 + pw / 2 : cy + L / 2 - pw / 2;
    label(env, part, x, yc, { size: fs, alpha: o * 0.9, align: 'center', rot: side > 0 ? 90 : -90, track: 0.16 });
  }
});

/* 行頭記号 — a pilcrow (or section sign) set before the head of the lyric and a small end mark closing it */
decor('tzHeadEnd', { name: '行頭記号', en: 'Pilcrow & End Mark', tags: ['editorial', 'calm', 'emotional', 'graphic'], ae: 'brackets', w: 1, layer: 'front' }, (env, bb, Pd, o, u) => {
  const { W, H, sc } = env, m = MG(env), lt = env.lt;
  const cells = glyphCells(env, bb), g0 = cells[0], g1 = cells[cells.length - 1];
  const hh = g0 ? Math.min(g0.h, g0.w * 1.4) : bhOf(bb);
  const S = clamp(hh * 0.5, 30 * u, 96 * u), gap = 10 * u + S * 0.18, ac = accentOn(sc);
  const mk = ['¶', '§', '¶'][(Pd.v | 0) % 3];
  const a = E.outCubic(clamp(lt / 0.45)) * o, sl = (1 - E.outExpo(clamp(lt / 0.5))) * S * 0.5;
  let x = bb.x0 - gap - S * 0.3, y = (g0 ? g0.y - g0.h / 2 : bb.y0) + S * 0.5;
  if (x - S * 0.4 < m * 0.6) { x = bb.x0 + S * 0.3; y = bb.y0 - gap - S * 0.45; }
  if (y - S * 0.5 > m * 0.4 && a > 0) env.draw({ text: mk, font: serifF(env), size: S, x: x - sl, y, color: Pd.accent ? ac : sc.sub, alpha: a, ghost: false });
  const q = clamp(hh * 0.13, 8 * u, 22 * u), p = E.outBack(clamp((lt - 0.3) / 0.35), 2) * o;
  let ex = bb.x1 + gap * 0.8, ey = (g1 ? g1.y + g1.h / 2 : bb.y1) - q - hh * 0.1;
  if (ex + q > W - m * 0.6) { ex = bb.x1 - q; ey = bb.y1 + gap * 0.8; }
  if (ey + q < H - m * 0.4 && p > 0) {
    const s = q * clamp(p, 0, 1.2), cx = ex + q / 2, cy = ey + q / 2;
    if ((Pd.v | 0) % 2) env.line(rectPts(cx - s / 2, cy - s / 2, cx + s / 2, cy + s / 2), sc.fg, Math.max(1.5, 2 * u), o, false);
    else env.rect(cx - s / 2, cy - s / 2, s, s, Pd.accent ? sc.fg : ac, o, false);
  }
});

/* 番号列 — a strip of small running numerals in the margin, stepping on by one at every cut; the current one is underlined */
decor('tzNumStrip', { name: '番号列', en: 'Number Strip', tags: ['editorial', 'graphic', 'calm', 'pop'], ae: 'counter', w: 1, layer: 'front', subtle: true }, (env, bb, Pd, o, u) => {
  const { W, H, sc } = env, cut = env.cut, m = MG(env), fs = FS(env), lt = env.lt;
  const vert = (Pd.v | 0) % 3 === 2 && W > H;
  const pitch = vert ? fs * 2.3 : fs * 3.5, L = vert ? H : W;
  const k = Math.max(1, Math.min(5, Math.floor((L * 0.5 - m) / pitch - 0.5)));
  let c = 0, ok = false;
  for (const lowSide of (vert ? [!!Pd.right, !Pd.right] : [Pd.low !== false, Pd.low === false])) {
    c = vert ? (lowSide ? W - m - fs * 1.3 : m + fs * 1.3) : (lowSide ? H - m - fs * 0.5 : m + fs * 0.5);
    ok = vert ? !hitBB(c - fs * 1.6, H / 2 - (k + 1) * pitch, c + fs * 1.6, H / 2 + (k + 1) * pitch, bb, 8 * u) : !hitBB(W / 2 - (k + 1) * pitch, c - fs * 1.4, W / 2 + (k + 1) * pitch, c + fs * 1.4, bb, 8 * u);
    if (ok) break;
  }
  if (!ok) return;
  const idx = (cut.index | 0) + 1, slide = (1 - E.outExpo(clamp(lt / 0.55))) * pitch, a0 = E.outCubic(clamp(lt / 0.3)) * o;
  for (let j = -k - 1; j <= k + 1; j++) {
    const num = idx + j; if (num < 1) continue;
    const d = j * pitch + slide, f = clamp(1 - Math.abs(d) / ((k + 0.6) * pitch));
    if (f <= 0) continue;
    const cur = j === 0, al = (cur ? 1 : 0.55 * f) * a0;
    const t = String(num).padStart(3, '0');
    if (vert) label(env, t, c, H / 2 + d, { size: fs * (cur ? 1.05 : 0.9), alpha: al, align: 'center', color: cur ? sc.fg : sc.sub });
    else label(env, t, W / 2 + d, c, { size: fs * (cur ? 1.05 : 0.9), alpha: al, align: 'center', color: cur ? sc.fg : sc.sub });
  }
  const e = E.outExpo(clamp((lt - 0.2) / 0.5)) * o, lw = Math.max(1.5, 2 * u), ac = accentOn(sc);
  if (e > 0) {
    if (vert) { const x = c + (c > W / 2 ? -1 : 1) * fs * 1.5; env.line([[x, H / 2 - fs * 0.8 * e], [x, H / 2 + fs * 0.8 * e]], ac, lw, 1, false); }
    else { const y = c + (c > H / 2 ? -1 : 1) * fs * 1.0; env.line([[W / 2 - fs * 1.2 * e, y], [W / 2 + fs * 1.2 * e, y]], ac, lw, 1, false); }
  }
});

/* リーダー罫 — a dot leader runs from the end of the lyric out to the margin and ends in a small page numeral */
decor('tzDotLeader', { name: 'リーダー罫', en: 'Dot Leader', tags: ['editorial', 'calm', 'emotional'], ae: 'leaders', w: 1, layer: 'front' }, (env, bb, Pd, o, u) => {
  const { W, H, sc } = env, cut = env.cut, m = MG(env), fs = FS(env), lt = env.lt;
  const cells = glyphCells(env, bb), g1 = cells[cells.length - 1], g0 = cells[0];
  const num = (Pd.v | 0) % 2 ? `p.${(cut.index | 0) + 1}` : pad2((cut.line | 0) + 1), ns = fs * 1.25, nw = tw(num, monoF(env), ns, 0.08);
  const gap = 14 * u + Math.min(bwOf(bb), bhOf(bb)) * 0.06;
  let dir = 0, xa = 0, xb = 0, y = 0;
  const tryR = () => { const a = bb.x1 + gap, b = W - m - nw - fs * 0.7; if (b - a > W * 0.07) { dir = 1; xa = a; xb = b; y = g1 ? g1.y + g1.h * 0.3 : bb.y1 - bhOf(bb) * 0.2; } };
  const tryL = () => { const a = bb.x0 - gap, b = m + nw + fs * 0.7; if (a - b > W * 0.07) { dir = -1; xa = a; xb = b; y = g0 ? g0.y + g0.h * 0.3 : bb.y0 + bhOf(bb) * 0.8; } };
  if (Pd.right === false) { tryL(); if (!dir) tryR(); } else { tryR(); if (!dir) tryL(); }
  if (!dir) return;
  y = clamp(y, m, H - m);
  const pitch = Math.max(fs * 0.8, Math.abs(xb - xa) / 90), cnt = Math.max(1, Math.floor(Math.abs(xb - xa) / pitch)), r = Math.max(1.3 * u, fs * 0.08);
  const e = E.outCubic(clamp((lt - 0.1) / 0.8)), vis = Math.floor(cnt * e);
  const ctx = env.ctx; ctx.save(); ctx.globalAlpha = 0.8 * o; ctx.fillStyle = sc.sub; ctx.beginPath();
  for (let i = 0; i <= vis; i++) ctx.rect(xa + dir * i * pitch - r, y - r, r * 2, r * 2);
  ctx.fill(); ctx.restore();
  const a = E.outCubic(clamp((lt - 0.75) / 0.3)) * o;
  if (a > 0) label(env, num, dir > 0 ? W - m : m, y - ns * 0.12, { size: ns, alpha: a, align: dir > 0 ? 'right' : 'left', color: sc.fg, track: 0.08 });
});

/* 仮想ボディ — the body of every glyph drawn as a hairline box around it, with small ticks at the middle of each side */
decor('tzEmBox', { name: '仮想ボディ', en: 'Em Squares', tags: ['editorial', 'graphic', 'calm'], ae: 'grid', w: 0.9, layer: 'front' }, (env, bb, Pd, o, u) => {
  const { sc } = env, lt = env.lt, cells = glyphCells(env, bb).slice(0, 34), lw = Math.max(1, u), fs = FS(env) * 0.8;
  const pad = 1.02 + ((Pd.v | 0) % 2) * 0.05;
  cells.forEach((g, i) => {
    const e = E.outExpo(clamp((lt - 0.1 - i * 0.035) / 0.6));
    if (e <= 0) return;
    const hw = g.w * pad / 2, hh = g.h * pad / 2, t = Math.max(4 * u, Math.min(hw, hh) * 0.09) * e;
    env.polyPartial(rectPts(g.x - hw, g.y - hh, g.x + hw, g.y + hh), e, sc.sub, lw, 0.6 * o, false);
    env.line([[g.x, g.y - hh], [g.x, g.y - hh - t]], sc.sub, lw, 0.8 * o, false);
    env.line([[g.x, g.y + hh], [g.x, g.y + hh + t]], sc.sub, lw, 0.8 * o, false);
    env.line([[g.x - hw, g.y], [g.x - hw + t * 0.6, g.y]], sc.sub, lw, 0.8 * o, false);
    env.line([[g.x + hw, g.y], [g.x + hw - t * 0.6, g.y]], sc.sub, lw, 0.8 * o, false);
  });
  const g = cells[0];
  if (g) {
    const hh = g.h * pad / 2, a = E.outCubic(clamp((lt - 0.35) / 0.3)) * o;
    if (a > 0 && g.y - hh - fs * 2.2 > 0) label(env, `EM ${Math.round(Math.max(g.w, g.h) / u)}`, g.x - g.w * pad / 2, g.y - hh - fs * 1.3, { size: fs, alpha: a * 0.9, color: Pd.accent ? accentOn(sc) : sc.sub });
  }
});

/* 四隅の数字 — small live numerals in the frame corners (line, running time, glyph count, cut), each on a short hairline */
decor('tzCornerNums', { name: '四隅の数字', en: 'Corner Numerals', tags: ['editorial', 'graphic', 'calm', 'glitch'], ae: 'counter', w: 1, layer: 'front', subtle: true }, (env, bb, Pd, o, u) => {
  const { W, H, sc } = env, cut = env.cut, m = MG(env), fs = FS(env), lt = env.lt;
  const items = [
    [0, 0, `L.${pad2((cut.line | 0) + 1)}`], [1, 0, J.fmtTime(cut.start + Math.min(lt, cut.dur))],
    [0, 1, `${pad2(J.glyphCount(String(cut.text || '')))} CH`], [1, 1, String((cut.index | 0) + 1).padStart(3, '0')],
  ];
  const two = (Pd.n | 0) <= 1, lw = Math.max(1, u), ac = accentOn(sc);
  items.forEach(([r, b, t], i) => {
    if (two && (Pd.right ? r === b : r !== b)) return;
    const x = r ? W - m : m, y = b ? H - m - fs * 0.5 : m + fs * 0.5, w = tw(t, monoF(env), fs) + fs;
    if (hitBB(r ? x - w : x, y - fs * 1.6, r ? x : x + w, y + fs * 1.6, bb, 8 * u)) return;
    const e = E.outExpo(clamp((lt - i * 0.07) / 0.5)) * o;
    if (e <= 0) return;
    const yl = y + (b ? -1 : 1) * fs * 1.05, d = r ? -1 : 1;
    env.line([[x, yl], [x + d * fs * 2.6 * e, yl]], i === 0 ? ac : sc.sub, i === 0 ? Math.max(1.5, 2 * u) : lw, 0.9, false);
    const arr = [...t], k = i === 1 ? arr.length : Math.ceil(arr.length * clamp((lt - 0.1 - i * 0.07) / 0.35));
    if (k > 0) label(env, arr.slice(0, k).join(''), x, y, { size: fs, alpha: e * 0.95, align: r ? 'right' : 'left', color: i === 1 ? sc.fg : sc.sub });
  });
});

/* 読み位置 — a small caret steps from glyph to glyph under the lyric as the cut plays, with the position in numerals */
decor('tzReadCaret', { name: '読み位置', en: 'Reading Caret', tags: ['editorial', 'pop', 'graphic', 'emotional'], ae: 'arrows', w: 1, layer: 'front' }, (env, bb, Pd, o, u) => {
  const { W, H, sc } = env, cut = env.cut, m = MG(env), fs = FS(env) * 0.88, lt = env.lt;
  const cells = glyphCells(env, bb), n = cells.length; if (!n) return;
  const vert = !!cells.vert, ac = accentOn(sc);
  const f = clamp((lt - 0.1) / Math.max(0.3, cut.dur * 0.86 - 0.1)) * n, i = Math.min(n - 1, Math.floor(f)), k = E.outCubic(clamp((f - i) * 3.5));
  const g = cells[i], p = cells[Math.max(0, i - 1)];
  const t = clamp((vert ? g.w : g.h) * 0.1, 7 * u, 14 * u), gap = 8 * u + t;
  const a = E.outBack(clamp(lt / 0.35), 1.8) * o;
  if (a <= 0) return;
  // the caret jumps between lines / columns instead of sliding through the lyric
  const far = vert ? Math.abs(g.x - p.x) > g.w * 0.5 : Math.abs(g.y - p.y) > g.h * 0.5;
  const kk = far ? 1 : k;
  if (!vert) {
    const x = lerp(p.x, g.x, kk), y = lerp(p.y + p.h / 2, g.y + g.h / 2, kk) + gap;
    if (y + t * 2 > H - m * 0.4) return;
    env.poly([[x, y], [x - t, y + t * 1.7], [x + t, y + t * 1.7]], ac, clamp(a), false);
    const row = cells.filter(c => Math.abs(c.y - g.y) < g.h * 0.5), x0 = Math.min(...row.map(c => c.x - c.w / 2)), x1 = Math.max(...row.map(c => c.x + c.w / 2));
    env.line([[x0, y - t * 0.35], [lerp(x0, x1, E.outExpo(clamp(lt / 0.6))), y - t * 0.35]], sc.sub, Math.max(1, u), 0.5 * o, false);
    if (y + t * 1.7 + fs * 1.6 < H - m * 0.4) label(env, `${pad2(i + 1)}/${pad2(n)}`, x, y + t * 1.7 + fs * 0.95, { size: fs, alpha: clamp(a) * 0.9, align: 'center', track: 0.04 });
  } else {
    const side = g.x + g.w / 2 + gap + t * 2 + fs * 3 < W - m * 0.4 ? 1 : -1;
    const y = lerp(p.y, g.y, kk), x = lerp(p.x, g.x, kk) + side * (g.w / 2 + gap);
    env.poly([[x, y], [x + side * t * 1.7, y - t], [x + side * t * 1.7, y + t]], ac, clamp(a), false);
    label(env, `${pad2(i + 1)}/${pad2(n)}`, x + side * (t * 1.7 + fs * 0.5), y, { size: fs, alpha: clamp(a) * 0.9, align: side > 0 ? 'left' : 'right', track: 0.04 });
  }
});

/* ================================================================== BACKGROUNDS */
const wrap = (v, md) => ((v % md) + md) % md;
const inkA = (c, a) => J.rgba(c, Math.round(clamp(a) * 1000) / 1000);
/* time since this background started (consecutive cuts sharing the same bg + seed count as one run) */
const bgRun = new WeakMap();
const bgT = env => {
  const c = env.cut; if (!c) return env.t;
  let s = bgRun.get(c);
  if (s == null) {
    s = c.start;
    const cs = (env.plan && env.plan.cuts) || [], P0 = c.bgP || {};
    for (let i = (c.index | 0) - 1; i >= 0 && i < cs.length; i--) { const p = cs[i]; if (p.bg === c.bg && (p.bgP || {}).seed === P0.seed && Math.abs(p.end - s) < 0.06) s = p.start; else break; }
    bgRun.set(c, s);
  }
  return env.t - s;
};
const regB = (key, d) => J.register('bg', key, Object.assign({}, d, { draw(env, Q) { const ctx = env.ctx; ctx.save(); try { d.draw(env, Q || {}, ctx); } finally { ctx.restore(); } } }), P);
const bs = rng => rng.int(1, 1e9);

/* 基線グリッド — a faint baseline grid across the frame, every few lines a little stronger and numbered, drifting very slowly */
regB('tzBgBaseGrid', { name: '基線グリッド', en: 'Baseline Grid', tags: ['editorial', 'calm', 'graphic'], w: 1.1, subtle: true,
  plan: rng => ({ seed: bs(rng), rows: rng.int(22, 30), every: rng.pick([4, 4, 5]), drift: rng.range(5, 10) * rng.pick([1, -1]), k: rng.range(0.1, 0.135), nums: rng.chance(0.8), right: rng.chance(0.3) }),
  draw(env, Q, ctx) {
    const { W, H, sc } = env, M = Math.min(W, H), e = E.outCubic(clamp(bgT(env) / 0.8));
    const rows = Q.rows || 26, every = Q.every || 4, k = (Q.k || 0.12) * e, g = Math.max(W, H) / rows;
    const scroll = env.t * (Q.drift || 6) * M / 1080, k0 = Math.ceil(-scroll / g), k1 = Math.floor((H - scroll) / g);
    const mx = Q.right ? W * 0.92 : W * 0.08, fs = Math.max(9, M * 0.013);
    ctx.lineWidth = Math.max(1, M * 0.0014);
    for (const strong of [false, true]) {
      ctx.strokeStyle = inkA(sc.fg, strong ? k * 1.8 : k); ctx.beginPath();
      for (let i = k0; i <= k1 && i - k0 < 80; i++) { if ((wrap(i, every) === 0) !== strong) continue; const y = i * g + scroll; ctx.moveTo(0, y); ctx.lineTo(W * e, y); }
      ctx.stroke();
    }
    ctx.strokeStyle = inkA(sc.accent, k * 2.4); ctx.beginPath(); ctx.moveTo(mx, 0); ctx.lineTo(mx, H * e); ctx.stroke();
    if (Q.nums !== false) {
      ctx.font = J.fontCSS(monoF(env), fs); ctx.textBaseline = 'middle'; ctx.textAlign = Q.right ? 'left' : 'right'; ctx.fillStyle = inkA(sc.fg, k * 2.6);
      for (let i = k0; i <= k1 && i - k0 < 80; i++) { if (wrap(i, every)) continue; ctx.fillText(pad2(wrap(-i, 100)), mx + (Q.right ? 1 : -1) * fs * 0.7, i * g + scroll - fs * 0.9); }
    }
  } });

/* 数字の野 — a field of small two-digit numerals in a mono face; single cells tick over now and then, one row reads a little clearer */
regB('tzBgNumField', { name: '数字の野', en: 'Numeral Field', tags: ['editorial', 'graphic', 'glitch', 'calm'], w: 1, subtle: true,
  plan: rng => ({ seed: bs(rng), fs: rng.range(0.016, 0.021), k: rng.range(0.075, 0.1), rate: rng.range(0.2, 0.5), band: rng.chance(0.7) }),
  draw(env, Q, ctx) {
    const { W, H, sc } = env, M = Math.min(W, H), s = Q.seed || 1, e = E.outCubic(clamp(bgT(env) / 0.8)), t = env.t;
    const fs = M * (Q.fs || 0.018), rh = fs * 2.5, k = (Q.k || 0.085) * e;
    ctx.font = J.fontCSS(monoF(env), fs); ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    const cw = Math.max(fs * 1.2, ctx.measureText('00  ').width);
    const cols = Math.min(64, Math.ceil(W / cw) + 1), rows = Math.min(60, Math.ceil(H / rh) + 1), rate = Q.rate || 0.3;
    const hot = Q.band !== false ? Math.floor(t * 0.4 + J.r(s, 7) * rows) % rows : -1;
    for (let j = 0; j < rows; j++) {
      let str = '';
      for (let i = 0; i < cols; i++) {
        const ph = Math.floor(t * rate * (0.2 + 1.8 * J.r(s, i, j, 9)) + J.r(s, i, j, 3) * 10);
        const v = J.h(s, i, j, ph) % 100;
        str += (v < 10 ? '0' : '') + v + '  ';
      }
      ctx.fillStyle = inkA(sc.fg, j === hot ? k * 2.1 : k * (0.75 + 0.5 * J.r(s, j, 5)));
      ctx.fillText(str, fs * 0.6 - (j % 2) * cw * 0.5, (j + 0.5) * rh);
    }
  } });

/* 段組ガイド — the column guides of a page layout: pale columns and gutters, head and foot lines, small column numbers; one column lights faintly in turn */
regB('tzBgColumns', { name: '段組ガイド', en: 'Column Guides', tags: ['editorial', 'calm', 'graphic'], w: 1, subtle: true,
  plan: rng => ({ seed: bs(rng), cols: rng.pick([4, 6, 6, 8]), k: rng.range(0.035, 0.05), step: rng.range(1.8, 2.8), nums: rng.chance(0.75), fill: rng.chance(0.7) }),
  draw(env, Q, ctx) {
    const { W, H, sc } = env, M = Math.min(W, H), e = E.outCubic(clamp(bgT(env) / 0.9)), k = Q.k || 0.042;
    const n = W < H ? Math.max(3, Math.round((Q.cols || 6) / 2)) : (Q.cols || 6);
    const mx = W * 0.05, gut = M * 0.016, cw = (W - mx * 2 - (n - 1) * gut) / n, y0 = H * 0.045, y1 = H * 0.955, fs = Math.max(9, M * 0.011);
    const f = env.t / (Q.step || 2.2), act = Math.floor(f) % n, pulse = Math.sin(Math.PI * (f % 1));
    ctx.lineWidth = Math.max(1, M * 0.001);
    for (let i = 0; i < n; i++) {
      const x = mx + i * (cw + gut);
      const a = (Q.fill !== false && i % 2 === 0 ? k * 0.55 : 0) + (i === act ? k * 0.9 * pulse : 0);
      if (a > 0) { ctx.fillStyle = inkA(sc.fg, a * e); ctx.fillRect(x, y0, cw, (y1 - y0) * e); }
    }
    ctx.strokeStyle = inkA(sc.fg, k * 2.2 * e); ctx.beginPath();
    for (let i = 0; i < n; i++) { const x = mx + i * (cw + gut); ctx.moveTo(x, y0); ctx.lineTo(x, y0 + (y1 - y0) * e); ctx.moveTo(x + cw, y0); ctx.lineTo(x + cw, y0 + (y1 - y0) * e); }
    ctx.stroke();
    ctx.strokeStyle = inkA(sc.accent, k * 2.6 * e); ctx.beginPath();
    ctx.moveTo(0, y0); ctx.lineTo(W * e, y0); ctx.moveTo(W, y1); ctx.lineTo(W - W * e, y1); ctx.stroke();
    if (Q.nums !== false) {
      ctx.font = J.fontCSS(monoF(env), fs); ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.fillStyle = inkA(sc.fg, k * 4 * e);
      for (let i = 0; i < n; i++) ctx.fillText(pad2(i + 1), mx + i * (cw + gut) + fs * 0.4, y0 + fs * 1.1);
    }
  } });

/* 淡い大数字 — the line number (or the running second) as two huge pale digits cut by the frame edge; they roll in when the number changes */
regB('tzBgBigDigits', { name: '淡い大数字', en: 'Pale Counter', tags: ['editorial', 'graphic', 'calm', 'emotional'], w: 1, subtle: true,
  plan: rng => ({ seed: bs(rng), side: rng.pick([-1, 1]), font: rng.pick(['display', 'mono', 'serif']), outline: rng.chance(0.6), k: rng.range(0.055, 0.08), what: rng.pick(['line', 'line', 'sec']), low: rng.chance(0.6) }),
  draw(env, Q) {
    const { W, H, sc } = env, cut = env.cut || {}, k = Q.k || 0.065, side = Q.side || 1;
    const sec = Q.what === 'sec', tb = bgT(env);
    const txt = sec ? pad2(Math.floor(env.t) % 100) : pad2(((cut.line | 0) + 1) % 100);
    const font = Q.font === 'mono' ? monoF(env) : J.fontsOf(env.st, [Q.font || 'display'])[0];
    const size = Math.max(W, H) * 0.6;
    const e0 = E.outCubic(clamp(tb / 0.7)), roll = sec ? 1 - E.outExpo(clamp((env.t % 1) / 0.4)) : 1 - E.outExpo(clamp(tb / 0.8));
    const it = { text: txt, font, size, x: W / 2 + side * W * 0.2, y: H * (Q.low !== false ? 0.62 : 0.4) + roll * size * (sec ? 0.05 : 0.16), color: sc.fg, alpha: k * e0, ghost: false, plain: true };
    if (Q.outline !== false) Object.assign(it, { fill: false, stroke: Math.max(2, size * 0.004), strokeColor: sc.fg, alpha: Math.min(0.24, k * 2.4) * e0 });
    env.draw(it);
  } });

/* 字の地紋 — the glyphs of the current lyric line, small and widely spaced, tiled over the whole frame; alternate rows drift opposite ways */
regB('tzBgGlyphField', { name: '字の地紋', en: 'Glyph Field', tags: ['editorial', 'emotional', 'calm', 'graphic'], w: 1, subtle: true,
  plan: rng => ({ seed: bs(rng), fs: rng.range(0.03, 0.042), k: rng.range(0.06, 0.085), v: rng.range(8, 16), font: rng.pick(['body', 'serif', 'body']) }),
  draw(env, Q, ctx) {
    const { W, H, sc } = env, M = Math.min(W, H), cut = env.cut || {}, e = E.outCubic(clamp(bgT(env) / 0.9));
    const arr = [...clean(cut.lineText || cut.text || '')].filter(c => !J.isPunct(c)).slice(0, 24);
    if (!arr.length) return;
    const fs = M * (Q.fs || 0.036), rowH = fs * 2.3, font = J.fontsOf(env.st, [Q.font || 'body'])[0];
    ctx.font = J.fontCSS(font, fs); ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    const unit = arr.join('　') + '　', per = Math.max(fs, ctx.measureText(unit).width);
    const str = unit.repeat(Math.min(40, Math.ceil(W / per) + 2)), rows = Math.min(48, Math.ceil(H / rowH) + 1), v = (Q.v || 12) * M / 1080;
    ctx.fillStyle = inkA(sc.fg, (Q.k || 0.07) * e);
    for (let j = 0; j < rows; j++) {
      const off = wrap(env.t * v * (j % 2 ? 1 : -1) + j * fs * 1.37 + J.r(Q.seed || 1, j) * per, per);
      ctx.fillText(str, off - per, (j + 0.5) * rowH);
    }
  } });

/* 罫線の呼吸 — a few typographic rules (hairline, double, thick-and-thin, dotted) reach in from the edges and slowly lengthen and shorten */
regB('tzBgRules', { name: '罫線の呼吸', en: 'Breathing Rules', tags: ['editorial', 'calm', 'emotional', 'graphic'], w: 1, subtle: true,
  plan: rng => ({ seed: bs(rng), n: rng.int(6, 9), k: rng.range(0.12, 0.16) }),
  draw(env, Q, ctx) {
    const { W, H, sc } = env, M = Math.min(W, H), s = Q.seed || 1, n = Q.n || 7, e = E.outExpo(clamp(bgT(env) / 1.1)), k = Q.k || 0.1, u = M / 1080;
    const lw = Math.max(1, u * 1.5);
    for (let i = 0; i < n; i++) {
      const y = H * (0.07 + 0.86 * (i + 0.5) / n) + J.rs(s, i, 1) * H * 0.025, kind = J.h(s, i, 2) % 4, fromL = J.r(s, i, 3) < 0.5;
      const len = W * (0.22 + 0.62 * (0.5 + 0.5 * Math.sin(env.t * (0.12 + 0.2 * J.r(s, i, 4)) + J.r(s, i, 5) * J.TAU))) * e;
      const xa = fromL ? 0 : W, xb = fromL ? len : W - len;
      ctx.strokeStyle = inkA(i === (s % n) ? sc.accent : sc.fg, k); ctx.setLineDash([]);
      const seg = (dy, w) => { ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(xa, y + dy); ctx.lineTo(xb, y + dy); ctx.stroke(); };
      if (kind === 0) seg(0, lw);
      else if (kind === 1) { seg(-3 * u, lw); seg(3 * u, lw); }
      else if (kind === 2) { seg(-3.5 * u, lw * 3.2); seg(3.5 * u, lw); }
      else { ctx.setLineDash([lw * 1.6, lw * 4.5]); seg(0, lw * 1.6); ctx.setLineDash([]); }
      ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(xb, y - 7 * u); ctx.lineTo(xb, y + 7 * u); ctx.stroke();
    }
  } });

})();
