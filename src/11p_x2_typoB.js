/* JIZURA pack: x2typoB — 追加分2 / 文字PV系: typesetting motions (carets, rules, ticks, index numbers, point sizes) —
   9 enter, 8 exit, 5 hold, 5 treat, 4 cam, 6 fx, 3 trans */
(() => {
'use strict';
const E = J.E;
const P = 'x2typoB';
const reg = (g, key, def) => J.register(g, key, def, P);
const HIDE = Object.freeze({ hide: true });
const clamp = J.clamp, lerp = J.lerp, DEG = J.DEG;
const ioc = E.inOutCubic;

/* ------------------------------------------------------------------ helpers */
const isSp = c => c === ' ' || c === '　';
const isHex = c => typeof c === 'string' && c[0] === '#' && (c.length === 7 || c.length === 4);
const layOf = it => (it._m || (it._m = J.measure(it))).lay;
const plainOf = it => layOf(it).filter(g => !isSp(g.ch));
const motionK = env => clamp((env.fx && env.fx.motion != null ? env.fx.motion : 0.7) / 0.7, 0, 1.6);
const cutN = env => Math.max(1, J.glyphCount(String(env.cut && env.cut.text || '')));
const soloOf = (env, it) => plainOf(it).length <= 1 && cutN(env) > 1;
const accentOf = env => { const sc = env.sc; return J.contrast(sc.accent, sc.bg) >= 1.8 ? sc.accent : sc.fg; };
const subOf = env => { const sc = env.sc; return J.contrast(sc.sub, sc.bg) >= 1.5 ? sc.sub : sc.fg; };
const U = env => Math.min(env.W, env.H) / 1080;
const MG = env => Math.round(Math.min(env.W, env.H) * 0.05);
const monoF = env => (env.st.fonts.mono && env.st.fonts.mono[0]) || 'mono';
const pad2 = n => String(n).padStart(2, '0');
const lineNo = env => ((env.cut && env.cut.line) | 0) + 1;
function addPost(it, fn) { const prev = it.post; it.post = prev ? (env, x, bb) => { prev(env, x, bb); fn(env, x, bb); } : fn; }
function addPre(it, fn) { const prev = it.pre; it.pre = prev ? (env, x) => { prev(env, x); fn(env, x); } : fn; }
/* (along the reading axis, across it) → [x, y] */
const pt = (V, a, c) => (V ? [c, a] : [a, c]);
const crossK = it => it.size * (it.vertical ? (it.sx || 1) : (it.sy || 1));
const gA = (it, g) => (it.vertical ? g.y * (it.sy || 1) : g.x * (it.sx || 1));          // glyph centre along the axis
const gC = (it, g) => (it.vertical ? g.x * (it.sx || 1) : g.y * (it.sy || 1));          // glyph centre across the axis
const gLen = (it, g) => (it.vertical ? g.h * (it.sy || 1) : g.w * (it.sx || 1));        // glyph advance along the axis
/* the side under a horizontal line (left of a vertical column) / over it, k em away from the line centre */
const under = (it, L, k) => L.c + (it.vertical ? -1 : 1) * crossK(it) * k;
const over = (it, L, k) => L.c - (it.vertical ? -1 : 1) * crossK(it) * k;
/* reading order 0..1 of every glyph (spaces skipped); single-glyph items use their mi within the cut */
function orders(env, it) {
  const lay = layOf(it), out = new Array(lay.N).fill(0);
  const idx = []; for (const g of lay) if (!isSp(g.ch)) idx.push(g.i);
  const n = idx.length;
  if (n <= 1) { const N = cutN(env); const o = N > 1 ? clamp((+it.mi || 0) / (N - 1)) : 0; idx.forEach(i => { out[i] = o; }); return out; }
  idx.forEach((i, k) => { out[i] = k / (n - 1); });
  return out;
}
/* per text line (vertical: per column): extents along the reading axis + cross position, item-local (sx/sy applied) */
function spansOf(it, lay, skipHidden) {
  const sx = it.sx || 1, sy = it.sy || 1, map = new Map();
  for (const g of lay) {
    if (isSp(g.ch)) continue;
    if (skipHidden && it.charFn) { const c = it.charFn(g.i, g, lay.N); if (c && (c.hide || (c.a != null && c.a < 0.05))) continue; }
    const a0 = it.vertical ? (g.y - g.h / 2) * sy : (g.x - g.w / 2) * sx, a1 = it.vertical ? (g.y + g.h / 2) * sy : (g.x + g.w / 2) * sx;
    const L = map.get(g.li);
    if (!L) map.set(g.li, { li: g.li, a0, a1, c: it.vertical ? g.x * sx : g.y * sy });
    else { L.a0 = Math.min(L.a0, a0); L.a1 = Math.max(L.a1, a1); }
  }
  return [...map.values()].sort((a, b) => a.li - b.li);
}
const lineInfo = it => spansOf(it, layOf(it), false);
const lineSpans = it => spansOf(it, J.layoutText(it), true);          // for treatments: the lines as they are drawn right now
/* run fn in item-local space (translate + rotation), main pass only */
const inItem = (env, it, fn) => {
  if (env.pass !== 'main') return;
  const ctx = env.ctx; ctx.save(); ctx.translate(it.x, it.y); if (it.rot) ctx.rotate(it.rot * DEG);
  try { fn(); } finally { ctx.restore(); }
};
/* the same, honouring the item's clip windows and skew (treatments) */
const itemSpace = (env, it, fn) => {
  if (env.pass !== 'main') return;
  const ctx = env.ctx; ctx.save();
  if (it.clip) { ctx.beginPath(); ctx.rect(it.clip[0], -env.H, it.clip[1] - it.clip[0], env.H * 3); ctx.clip(); }
  if (it.clipY) { ctx.beginPath(); ctx.rect(-env.W, it.clipY[0], env.W * 3, it.clipY[1] - it.clipY[0]); ctx.clip(); }
  ctx.translate(it.x, it.y); if (it.rot) ctx.rotate(it.rot * DEG); if (it.skew) ctx.transform(1, 0, Math.tan(it.skew * DEG), 1, 0, 0);
  try { fn(); } finally { ctx.restore(); }
};
/* item box in design space (unrotated) */
const boxOf = it => { it._m = J.measure(it); return J.itemBox(it); };
const resized = it => { it._m = null; it._lay = null; };
/* exits with hard cuts: the chromatic ghost passes run on lagged time and would be left standing alone after the cut —
   give them the main pass's progress */
const sync = (env, p, cx) => (env.pass === 'main' ? p : clamp(p + Math.max(0, (env.ltb ?? env.lt) - env.lt) / Math.max(0.01, (cx && cx.outDur) || 0.3)));
const label = (env, text, x, y, size, color, alpha, align) => env.draw({ text: String(text), font: monoF(env), size, x, y, align: align || 'left', color, alpha, track: 0.04, ghost: false, plain: true });

/* ================================================================== ENTRANCES */

/* 植字キャレット — a hairline caret sets the glyphs one by one; the newest glyph sits in its body box as an outline for a moment */
reg('enter', 'tzCaretSet', {
  name: '植字キャレット', en: 'Caret Compose', tags: ['editorial', 'calm', 'graphic'], ae: 'type', w: 1.1, minDur: 0.9,
  inDur: (dur, n) => clamp(0.075 * n + 0.3, 0.4, Math.min(1.4, dur * 0.55)),
  apply(env, it, p) {
    const plain = plainOf(it), nn = plain.length;
    if (!nn) return;
    if (soloOf(env, it)) {
      const o = orders(env, it);
      it.charFns.push(i => { const q = (p - o[i] * 0.6) / 0.4; return q <= 0 ? HIDE : q < 0.45 ? { outline: true } : null; });
      return;
    }
    const V = !!it.vertical, ac = accentOf(env);
    const k = clamp(p) * (nn + 1.2), shown = Math.min(nn, Math.floor(k));
    const rank = new Map(plain.map((g, j) => [g.i, j]));
    it.charFns.push(i => {
      const r = rank.get(i); if (r == null) return null;
      if (r >= shown) return HIDE;
      return r === shown - 1 && k < r + 1.6 ? { outline: true } : null;
    });
    addPost(it, (e, i) => inItem(e, i, () => {
      const g = shown > 0 ? plain[shown - 1] : plain[0], s = shown > 0 ? 1 : -1, a = i.alpha ?? 1;
      const ca = gA(i, g) + s * (gLen(i, g) / 2 + i.size * 0.07), c = gC(i, g), hh = crossK(i) * 0.56;
      e.line([pt(V, ca, c - hh), pt(V, ca, c + hh)], ac, Math.max(2, i.size * 0.03), a, false);
      if (shown > 0 && k < shown + 0.6) {
        const ha = gLen(i, g) / 2, hc = crossK(i) * 0.5, m = gA(i, g);
        e.line([pt(V, m - ha, c - hc), pt(V, m + ha, c - hc), pt(V, m + ha, c + hc), pt(V, m - ha, c + hc), pt(V, m - ha, c - hc)], ac, Math.max(1, i.size * 0.012), a * 0.7, false);
      }
    }));
  },
});

/* 罫上スライド — a hairline shoots out under the line, the text slides along it and stops dead on a tick mark */
reg('enter', 'tzRuleSlide', {
  name: '罫上スライド', en: 'Slide To Tick', tags: ['editorial', 'graphic', 'pop'], ae: 'stretch', w: 1.2,
  apply(env, it, p) {
    const V = !!it.vertical, lines = lineInfo(it), solo = soloOf(env, it);
    const dir = (J.h(env.cut.seed | 0, 61) & 1) ? 1 : -1;
    const dist = Math.min((V ? env.H : env.W) * 0.3, it.size * 4);
    const e = E.outExpo(clamp(p / 0.72)), off = -dir * dist * (1 - e);
    it.charFns.push(() => (V ? { dy: off } : { dx: off }));
    it.alpha = (it.alpha ?? 1) * clamp(p * 7);
    if (solo || !lines.length) return;
    const qb = E.outExpo(clamp(p / 0.3)), qr = E.inCubic(clamp((p - 0.76) / 0.24)), ac = accentOf(env);
    addPost(it, (en, i) => inItem(en, i, () => {
      const lw = Math.max(1.5, i.size * 0.022), pad = i.size * 0.14;
      for (const L of lines.slice(0, 6)) {
        const tick = dir > 0 ? L.a1 + pad : L.a0 - pad, far = tick - dir * ((L.a1 - L.a0) + pad * 2 + dist * 0.6);
        const a = lerp(far, tick, qr), b = lerp(far, tick, qb), c = under(i, L, 0.6);
        if (Math.abs(b - a) > 1) en.line([pt(V, a, c), pt(V, b, c)], ac, lw, 1, false);
        if (qb > 0.9 && qr < 1) { const th = crossK(i) * 0.16 * (1 - qr); en.line([pt(V, tick, c - th), pt(V, tick, c + th)], ac, lw * 1.4, 1, false); }
      }
    }));
  },
});

/* 計数から組む — every slot first holds a small running figure; the figures lock to the glyphs from the line head on */
reg('enter', 'tzCountSet', {
  name: '計数から組む', en: 'Figures To Type', tags: ['editorial', 'glitch', 'graphic'], ae: 'scramble', w: 0.9, minDur: 0.8,
  inDur: (dur, n) => clamp(0.05 * n + 0.4, 0.45, Math.min(1.2, dur * 0.5)),
  apply(env, it, p) {
    const ord = orders(env, it), sub = subOf(env), ac = accentOf(env), seed = it.seed | 0, tick = env.step >> 1;
    it.charFns.push((i, g) => {
      const o = ord[i], t0 = o * 0.2, tl = 0.38 + o * 0.52;
      if (p < t0) return HIDE;
      if (p < tl) {
        if (J.isPunct(g.ch) || J.isSmallKana(g.ch)) return HIDE;
        return { ch: String((J.h(seed, i, 3) + tick) % 10), s: 0.5, color: sub, a: clamp((p - t0) / 0.06) };
      }
      return p < tl + 0.07 ? { color: ac } : null;
    });
  },
});

/* 詰め組み — the line appears loosely spaced; one gap after another closes up from the line head until it is set solid */
reg('enter', 'tzCloseUp', {
  name: '詰め組み', en: 'Close Up', tags: ['editorial', 'calm', 'graphic'], ae: 'stretch', w: 1.1,
  apply(env, it, p) {
    const V = !!it.vertical, plain = plainOf(it);
    it.alpha = (it.alpha ?? 1) * clamp(p * 8);
    if (plain.length <= 1) {
      if (cutN(env) <= 1) return;
      const e = E.outExpo(clamp((p - 0.2) / 0.6)), c = V ? env.H / 2 : env.W / 2;
      if (V) it.y = c + (it.y - c) * (1 + 0.3 * (1 - e)); else it.x = c + (it.x - c) * (1 + 0.3 * (1 - e));
      return;
    }
    const byLine = new Map();
    for (const g of plain) { const a = byLine.get(g.li); if (a) a.push(g); else byLine.set(g.li, [g]); }
    const info = new Map(), al = it.align;
    for (const gs of byLine.values()) {
      const n = gs.length; if (n < 2) continue;
      const ext = gA(it, gs[n - 1]) - gA(it, gs[0]) + gLen(it, gs[0]);
      const gap = clamp(((V ? env.H : env.W) * 0.92 - ext) / (n - 1), it.size * 0.22, it.size * 0.55);
      const cum = [0]; let tot = 0;
      for (let j = 1; j < n; j++) { tot += gap * (1 - E.outExpo(clamp((p - (0.12 + (j - 1) / (n - 1) * 0.58)) / 0.26))); cum.push(tot); }
      const base = V ? (al === 'left' ? 0 : -tot / 2) : al === 'left' ? 0 : al === 'right' ? -tot : -tot / 2;
      gs.forEach((g, k) => info.set(g.i, base + cum[k]));
    }
    it.charFns.push(i => { const d = info.get(i); return d ? (V ? { dy: d } : { dx: d }) : null; });
  },
});

/* 細字から太字 — the line starts as a hairline-weight skeleton and gains weight until it reaches its real face */
reg('enter', 'tzWeightUp', {
  name: '細字から太字', en: 'Light To Bold', tags: ['calm', 'emotional', 'editorial'], ae: 'blur', w: 0.9,
  apply(env, it, p) {
    const e = E.outCubic(clamp((p - 0.06) / 0.94));
    if (it.fill === false || it.stroke > 0) {             // already outlined: draw the outline on, then let the fill follow
      it.dash = Math.min(0.999, p / 0.75);
      if (it.fill !== false) it.fillAlpha = (it.fillAlpha ?? 1) * clamp((p - 0.45) / 0.5);
      return;
    }
    if (env.pass !== 'main') { it.alpha = (it.alpha ?? 1) * e * e; return; }
    it.stroke = it.size * 0.1 * (1 - e); it.strokeColor = env.sc.bg; it.strokeUnder = false;
    it.alpha = (it.alpha ?? 1) * clamp(p * 6);
  },
});

/* 基線合わせ — the glyphs stand at uneven heights; an alignment guide passes along the line and each one snaps to the baseline */
reg('enter', 'tzBaseAlign', {
  name: '基線合わせ', en: 'Baseline Align', tags: ['editorial', 'graphic', 'pop'], ae: 'drop', w: 1.1,
  apply(env, it, p) {
    const V = !!it.vertical, lines = lineInfo(it), seed = it.seed | 0, solo = soloOf(env, it), ord = orders(env, it);
    const s = E.inOutCubic(clamp((p - 0.14) / 0.66)) * 1.14;
    const Lm = new Map(lines.map(L => [L.li, L]));
    it.alpha = (it.alpha ?? 1) * clamp(p * 8);
    it.charFns.push((i, g) => {
      const L = Lm.get(g.li); if (!L) return null;
      const f = solo ? ord[i] : (L.a1 - L.a0 > 1 ? (gA(it, g) - L.a0) / (L.a1 - L.a0) : 0);
      const u = clamp((s - f) / 0.12); if (u >= 1) return null;
      const off = ((J.h(seed, i, 5) & 1) ? 1 : -1) * lerp(0.16, 0.4, J.r(seed, i, 6)) * crossK(it) * (1 - E.outExpo(u));
      return V ? { dx: off } : { dy: off };
    });
    if (solo) return;
    const ac = accentOf(env), ga = clamp(p / 0.1) * (1 - clamp((p - 0.84) / 0.16));
    addPost(it, (e, i) => inItem(e, i, () => {
      const lw = Math.max(1.5, i.size * 0.02), pad = i.size * 0.12;
      for (const L of lines.slice(0, 6)) {
        const pos = Math.min(L.a1 + pad, L.a0 + (L.a1 - L.a0) * (s - 0.04)), c = under(i, L, 0.56), hh = crossK(i) * 0.8;
        if (pos > L.a0 - pad + 1) e.line([pt(V, L.a0 - pad, c), pt(V, pos, c)], ac, lw, ga, false);
        e.line([pt(V, pos, L.c - hh), pt(V, pos, L.c + hh)], ac, lw, ga * (s < 1.14 ? 1 : 0.5), false);
      }
    }));
  },
});

/* 級数上げ — the line is set small first and steps up through point sizes (hard cuts) to its size; a size note counts along */
reg('enter', 'tzPointSize', {
  name: '級数上げ', en: 'Point Size Up', tags: ['editorial', 'graphic', 'pop'], ae: 'zoom', w: 1, minDur: 0.7,
  inDur: dur => clamp(dur * 0.34, 0.32, 0.6),
  apply(env, it, p) {
    const solo = soloOf(env, it), b = boxOf(it);
    const S = [0.34, 0.52, 0.76, 1], k = Math.min(3, Math.floor(clamp(p) * 4)), s = S[k], size0 = it.size;
    it.size = size0 * s; resized(it);
    if (it.stroke > 0) it.stroke *= Math.max(0.5, s);
    it.alpha = (it.alpha ?? 1) * clamp(p * 10);
    if (solo || it.rot) return;
    const sub = subOf(env), a = 1 - clamp((p - 0.86) / 0.14), txt = Math.max(1, Math.round(size0 * s / U(env) / 4)) + 'Q';
    addPost(it, (e, i) => {
      if (e.pass !== 'main') return;
      const fs = Math.max(11, 16 * U(e)), x = b.x0, y = Math.max(MG(e) + fs * 0.6, b.y0 - fs * 1.1), al = a * (i.alpha ?? 1);
      label(e, txt, x, y, fs, sub, al, 'left');
      e.line([[x, y + fs * 0.78], [x + b.w * s, y + fs * 0.78]], sub, Math.max(1, 1.5 * U(e)), al, false);
    });
  },
});

/* 番号が導く — a small line number appears first, a hairline runs out of it over the line and the glyphs cut on as it passes */
reg('enter', 'tzIndexLead', {
  name: '番号が導く', en: 'Index Leads', tags: ['editorial', 'graphic', 'calm'], ae: 'wipe', w: 1,
  apply(env, it, p) {
    const V = !!it.vertical, lines = lineInfo(it), solo = soloOf(env, it), ord = orders(env, it), ac = accentOf(env), sub = subOf(env);
    const nL = Math.max(1, lines.length), st = Math.min(0.06, 0.3 / nL), span = 0.62 - (nL - 1) * st;
    const qs = lines.map((L, k) => E.inOutCubic(clamp((p - 0.14 - k * st) / span)));
    it.charFns.push((i, g) => {
      if (solo) return p < 0.15 + ord[i] * 0.6 ? HIDE : null;
      const k = lines.findIndex(L => L.li === g.li); if (k < 0) return null;
      const L = lines[k], q = qs[k]; if (q >= 1) return null;
      const d = lerp(L.a0, L.a1, q) - gA(it, g);
      if (d < 0) return HIDE;
      return d < it.size * 0.6 ? { color: ac } : null;
    });
    if (solo || !lines.length) return;
    const qr = E.inCubic(clamp((p - 0.8) / 0.2)), na = (p > 0.03 ? 1 : 0) * (1 - clamp((p - 0.82) / 0.18)), txt = pad2(lineNo(env) % 100);
    addPost(it, (e, i) => inItem(e, i, () => {
      const lw = Math.max(1.5, i.size * 0.02), fs = Math.max(12, i.size * 0.2), a = i.alpha ?? 1;
      lines.slice(0, 6).forEach((L, k) => {
        const h0 = lerp(L.a0, L.a1, qr), h1 = lerp(L.a0, L.a1, qs[k]), c = over(i, L, 0.62);
        if (h1 - h0 > 1) e.line([pt(V, h0, c), pt(V, h1, c)], ac, lw, a, false);
      });
      const L0 = lines[0];
      if (na > 0.01) {
        if (V) label(e, txt, L0.c, L0.a0 - fs * 0.9, fs, sub, na * a, 'center');
        else label(e, txt, L0.a0, over(i, L0, 0.62) - fs * 0.8, fs, sub, na * a, 'left');
      }
    }));
  },
});

/* テキスト枠 — a DTP text frame is drawn (hairline, with handles), the text flows into it, then the frame is deselected */
reg('enter', 'tzTextFrame', {
  name: 'テキスト枠', en: 'Text Frame', tags: ['editorial', 'graphic', 'pop'], ae: 'type', w: 1, minDur: 0.8,
  apply(env, it, p) {
    const V = !!it.vertical, lines = lineInfo(it), ord = orders(env, it), solo = soloOf(env, it), ac = accentOf(env);
    if (!lines.length) return;
    if (solo) { it.charFns.push(i => { const q = (p - ord[i] * 0.55) / 0.45; return q <= 0 ? HIDE : q < 0.5 ? { outline: true } : null; }); return; }
    it.charFns.push(i => (p < 0.3 + ord[i] * 0.42 ? HIDE : null));
    let a0 = 1e9, a1 = -1e9, c0 = 1e9, c1 = -1e9; const ck = crossK(it) * 0.5;
    for (const L of lines) { a0 = Math.min(a0, L.a0); a1 = Math.max(a1, L.a1); c0 = Math.min(c0, L.c - ck); c1 = Math.max(c1, L.c + ck); }
    const qd = E.inOutCubic(clamp(p / 0.38)), qr = E.inCubic(clamp((p - 0.8) / 0.2));
    addPost(it, (e, i) => inItem(e, i, () => {
      const pad = i.size * 0.16, lw = Math.max(1.5, i.size * 0.018);
      const A0 = a0 - pad, A1 = a1 + pad, C0 = c0 - pad, C1 = c1 + pad;
      const pts = [pt(V, A0, C0), pt(V, A1, C0), pt(V, A1, C1), pt(V, A0, C1), pt(V, A0, C0)];
      if (qr <= 0) e.polyPartial(pts, qd, ac, lw, 1, false); else e.polyPartial(pts.slice().reverse(), 1 - qr, ac, lw, 1, false);
      if (p > 0.36 && p < 0.8) {
        const hs = Math.max(4, i.size * 0.05), am = (A0 + A1) / 2, cm = (C0 + C1) / 2;
        for (const [a, c] of [[A0, C0], [am, C0], [A1, C0], [A1, cm], [A1, C1], [am, C1], [A0, C1], [A0, cm]]) { const q = pt(V, a, c); e.rect(q[0] - hs / 2, q[1] - hs / 2, hs, hs, ac, 1, false); }
      }
    }));
  },
});

/* ================================================================== EXITS */

/* 縦罫に畳む — the line is condensed and set solid onto its centre until it is one upright hairline, which then shortens away */
reg('exit', 'tzCondense', {
  name: '縦罫に畳む', en: 'Condense To Rule', tags: ['editorial', 'graphic', 'calm'], ae: 'shrink', w: 1,
  apply(env, it, p, cx) {
    p = sync(env, p, cx);
    const V = !!it.vertical, lines = lineInfo(it), Lm = new Map(lines.map(L => [L.li, L])), ac = accentOf(env);
    const e = E.inOutCubic(clamp(p / 0.55));
    it.charFns.push((i, g) => {
      if (p >= 0.55) return HIDE;
      const L = Lm.get(g.li); if (!L) return null;
      const d = ((L.a0 + L.a1) / 2 - gA(it, g)) * e, k = Math.max(0.04, 1 - 0.96 * e);
      return V ? { dy: d, sy: k } : { dx: d, sx: k };
    });
    const ra = clamp((p - 0.28) / 0.2), sh = 1 - E.inCubic(clamp((p - 0.6) / 0.4));
    addPost(it, (en, i) => inItem(en, i, () => {
      const lw = Math.max(2, i.size * 0.028);
      for (const L of lines.slice(0, 6)) {
        const mid = (L.a0 + L.a1) / 2, hh = crossK(i) * 0.58 * sh;
        if (hh > 0.5) en.line([pt(V, mid, L.c - hh), pt(V, mid, L.c + hh)], ac, lw, ra, false);
      }
    }));
  },
});

/* 校正で削る — a proofreader's slash is struck through each glyph in turn; the glyph is taken out, then its slash */
reg('exit', 'tzProofDelete', {
  name: '校正で削る', en: 'Proof Delete', tags: ['editorial', 'graphic', 'emotional'], ae: 'scatter', w: 1, minDur: 0.8,
  outDur: (dur, n) => clamp(0.04 * n + 0.35, 0.4, Math.min(0.9, dur * 0.4)),
  apply(env, it, p, cx) {
    p = sync(env, p, cx);
    const ord = orders(env, it), plain = plainOf(it), sx = it.sx || 1, sy = it.sy || 1, ac = accentOf(env);
    it.charFns.push(i => (p >= ord[i] * 0.5 + 0.16 ? HIDE : null));
    addPost(it, (e, i) => inItem(e, i, () => {
      const lw = Math.max(2, i.size * 0.035);
      for (const g of plain.slice(0, 40)) {
        const t = ord[g.i] * 0.5; if (p <= t || p >= t + 0.42) continue;
        const d = clamp((p - t) / 0.09), r = clamp((p - t - 0.32) / 0.1);
        const cx = g.x * sx, cy = g.y * sy, hw = g.w * sx * 0.5, hh = g.h * sy * 0.56;
        e.line([[cx - hw + 2 * hw * r, cy + hh - 2 * hh * r], [cx - hw + 2 * hw * d, cy + hh - 2 * hh * d]], ac, lw, 1, false);
      }
    }));
  },
});

/* 半分ずつ断つ — a hairline runs through the middle of the line; alternate half-glyphs are cut away, then the rest, then the rule */
reg('exit', 'tzHalfCut', {
  name: '半分ずつ断つ', en: 'Cut By Halves', tags: ['graphic', 'editorial', 'glitch'], ae: 'slice', w: 1,
  apply(env, it, p, cx) {
    p = sync(env, p, cx);
    const V = !!it.vertical, lines = lineInfo(it), plain = plainOf(it), solo = soloOf(env, it), ac = accentOf(env);
    const rank = new Map(plain.map((g, j) => [g.i, solo ? Math.round(+it.mi || 0) : j]));
    it.charFns.push(i => {
      if (p < 0.26) return null;
      if (p >= 0.54) return HIDE;
      const top = ((rank.get(i) || 0) & 1) === 0;
      return V ? { clipX: top ? [0, 0.7] : [-0.7, 0] } : { clipY: top ? [0, 0.7] : [-0.7, 0] };
    });
    if (solo) return;
    const qb = E.outExpo(clamp(p / 0.24)), sh = 1 - E.inCubic(clamp((p - 0.56) / 0.44));
    addPost(it, (e, i) => inItem(e, i, () => {
      const lw = Math.max(1.5, i.size * 0.022), pad = i.size * 0.14;
      for (const L of lines.slice(0, 6)) {
        const a0 = L.a0 - pad, a1 = L.a1 + pad, mid = (a0 + a1) / 2;
        const a = p < 0.56 ? a0 : mid - (mid - a0) * sh, b = p < 0.56 ? lerp(a0, a1, qb) : mid + (a1 - mid) * sh;
        if (b - a > 1) e.line([pt(V, a, L.c), pt(V, b, L.c)], ac, lw, 1, false);
      }
    }));
  },
});

/* 選択して削除 — the line is swept by a selection highlight, deleted in one cut, and a caret blinks once where it began */
reg('exit', 'tzSelectDelete', {
  name: '選択して削除', en: 'Select & Delete', tags: ['editorial', 'pop', 'glitch'], ae: 'wipe', w: 1,
  apply(env, it, p, cx) {
    p = sync(env, p, cx);
    const V = !!it.vertical, lines = lineInfo(it), nL = Math.max(1, lines.length), solo = soloOf(env, it), ac = accentOf(env);
    const q = E.inOutCubic(clamp(p / 0.5)), gone = p >= 0.62;
    if (gone) it.charFns.push(() => HIDE);
    addPre(it, (e, i) => inItem(e, i, () => {
      if (gone) return;
      lines.slice(0, 8).forEach((L, k) => {
        const u = clamp(q * nL - k); if (u <= 0) return;
        const pad = i.size * 0.08, a = L.a0 - pad, b = lerp(a, L.a1 + pad, u), hh = crossK(i) * 0.6;
        if (V) e.rect(L.c - hh, a, hh * 2, b - a, ac, 0.42, false); else e.rect(a, L.c - hh, b - a, hh * 2, ac, 0.42, false);
      });
    }));
    if (solo || !lines.length) return;
    addPost(it, (e, i) => inItem(e, i, () => {
      if (!gone || p >= 0.96 || (p >= 0.76 && p < 0.86)) return;
      const L = lines[0], a = L.a0 - i.size * 0.08, hh = crossK(i) * 0.56;
      e.line([pt(V, a, L.c - hh), pt(V, a, L.c + hh)], ac, Math.max(2, i.size * 0.03), 1, false);
    }));
  },
});

/* あふれ送り — the line is pushed a step at a time past a margin rule and is lost there, like overset text leaving its frame */
reg('exit', 'tzOverset', {
  name: 'あふれ送り', en: 'Overset', tags: ['editorial', 'graphic', 'pop'], ae: 'wipe', w: 1,
  apply(env, it, p, cx) {
    p = sync(env, p, cx);
    const solo = soloOf(env, it), b = boxOf(it), V = !!it.vertical, pad = it.size * 0.1, ac = accentOf(env);
    if (solo) {                                            // one glyph per item: the glyphs are pushed off one at a time, last first
      const o = orders(env, it)[plainOf(it)[0].i], q = clamp((p - (1 - o) * 0.6) / 0.3);
      if (q >= 1) { it.alpha = 0; return; }
      const d = it.size * 0.45 * (q <= 0 ? 0 : q < 0.5 ? 0.5 : 1);
      if (V) it.y += d; else it.x += d;
      return;
    }
    const steps = clamp(J.glyphCount(String(it.text || '')), 2, 7);
    const k = clamp(p / 0.9) * steps, st = Math.min(steps, Math.floor(k)), f = k - st;
    const step = Math.min(1, (st + E.outExpo(clamp(f * 2.4))) / steps), dist = (V ? b.h : b.w) + it.size * 0.2;
    if (V) { it.clipY = [b.y0 - pad, b.y1 + pad]; it.y += dist * step; } else { it.clip = [b.x0 - pad, b.x1 + pad]; it.x += dist * step; }
    if (p >= 0.9) it.alpha = 0;
    const qa = E.outExpo(clamp(p / 0.12)), qr = E.inCubic(clamp((p - 0.88) / 0.12));
    addPost(it, (e, i) => {
      if (e.pass !== 'main') return;
      const s = i.size, lw = Math.max(1.5, s * 0.022), ex = s * 0.15, hs = Math.max(6, s * 0.16);
      if (!V) {
        const x = b.x1 + pad, y0 = b.y0 - ex, y1 = b.y1 + ex;
        if (qa > qr) e.line([[x, lerp(y0, y1, qr)], [x, lerp(y0, y1, qa)]], ac, lw, 1, false);
        if (p > 0.1 && p < 0.9) { const cy = y1 + hs * 0.8; e.line([[x - hs / 2, cy - hs / 2], [x + hs / 2, cy - hs / 2], [x + hs / 2, cy + hs / 2], [x - hs / 2, cy + hs / 2], [x - hs / 2, cy - hs / 2]], ac, lw, 1, false); e.line([[x - hs * 0.28, cy], [x + hs * 0.28, cy]], ac, lw, 1, false); e.line([[x, cy - hs * 0.28], [x, cy + hs * 0.28]], ac, lw, 1, false); }
      } else {
        const y = b.y1 + pad, x0 = b.x0 - ex, x1 = b.x1 + ex;
        if (qa > qr) e.line([[lerp(x1, x0, qr), y], [lerp(x1, x0, qa), y]], ac, lw, 1, false);
        if (p > 0.1 && p < 0.9) { const cx = x0 - hs * 0.8; e.line([[cx - hs / 2, y - hs / 2], [cx + hs / 2, y - hs / 2], [cx + hs / 2, y + hs / 2], [cx - hs / 2, y + hs / 2], [cx - hs / 2, y - hs / 2]], ac, lw, 1, false); e.line([[cx - hs * 0.28, y], [cx + hs * 0.28, y]], ac, lw, 1, false); e.line([[cx, y - hs * 0.28], [cx, y + hs * 0.28]], ac, lw, 1, false); }
      }
    });
  },
});

/* 罫が閉じる — a hairline above and one below the line close in on each other, taking the text between them; the one rule left retracts */
reg('exit', 'tzRulesClose', {
  name: '罫が閉じる', en: 'Rules Close', tags: ['editorial', 'calm', 'graphic'], ae: 'wipe', w: 1.1,
  apply(env, it, p, cx) {
    p = sync(env, p, cx);
    const solo = soloOf(env, it), b = boxOf(it), V = !!it.vertical, pad = it.size * 0.14, ac = accentOf(env);
    const e = E.inOutCubic(clamp((p - 0.16) / 0.5));
    const lo = V ? lerp(b.x0 - pad, b.cx, e) : lerp(b.y0 - pad, b.cy, e), hi = V ? lerp(b.x1 + pad, b.cx, e) : lerp(b.y1 + pad, b.cy, e);
    if (V) it.clip = [lo, hi]; else it.clipY = [lo, hi];
    if (e >= 1) it.alpha = 0;
    if (solo) return;
    const half = ((V ? b.h : b.w) / 2 + pad) * E.outExpo(clamp(p / 0.2)) * (1 - E.inCubic(clamp((p - 0.7) / 0.3)));
    addPost(it, (en, i) => {
      if (en.pass !== 'main' || half < 0.5) return;
      const lw = Math.max(1.5, i.size * 0.022);
      for (const c of (e >= 1 ? [lo] : [lo, hi])) {
        if (V) en.line([[c, b.cy - half], [c, b.cy + half]], ac, lw, 1, false); else en.line([[b.cx - half, c], [b.cx + half, c]], ac, lw, 1, false);
      }
    });
  },
});

/* 脚注になる — the line shrinks to note size at its own starting corner, a short separator rule is drawn over it, then both are cut */
reg('exit', 'tzToFootnote', {
  name: '脚注になる', en: 'To Footnote', tags: ['editorial', 'calm', 'emotional'], ae: 'shrink', w: 0.9, minDur: 0.9,
  outDur: dur => clamp(dur * 0.36, 0.4, 0.75),
  apply(env, it, p, cx) {
    p = sync(env, p, cx);
    const solo = soloOf(env, it), b = boxOf(it), V = !!it.vertical, sub = subOf(env), al = it.align, size0 = it.size;
    const e = E.inOutCubic(clamp(p / 0.45)), s = lerp(1, 0.3, e);
    if (!V) { it.x += al === 'left' ? 0 : al === 'right' ? -b.w * (1 - s) : -b.w * (1 - s) / 2; it.y += b.h * (1 - s) / 2; }
    else { it.x += b.w * (1 - s) / 2; it.y += al === 'left' ? 0 : -b.h * (1 - s) / 2; }
    it.size = size0 * s; resized(it);
    if (it.stroke > 0) it.stroke *= Math.max(0.4, s);
    if (isHex(it.color)) it.color = J.mix(it.color, sub, e * 0.7);
    if (p >= 0.8) it.alpha = 0;
    if (solo || it.rot) return;
    const qd = E.outExpo(clamp((p - 0.25) / 0.3)), qr = E.inCubic(clamp((p - 0.8) / 0.2));
    addPost(it, (en) => {
      if (en.pass !== 'main' || qd <= qr) return;
      const lw = Math.max(1.5, size0 * 0.02), g = size0 * 0.12;
      if (!V) { const y = b.y1 - b.h * 0.3 - g, len = Math.min(b.w * 0.5, size0 * 2.4); en.line([[b.x0 + len * qr, y], [b.x0 + len * qd, y]], sub, lw, 1, false); }
      else { const x = b.x1 - b.w * 0.3 - g, len = Math.min(b.h * 0.5, size0 * 2.4); en.line([[x, b.y0 + len * qr], [x, b.y0 + len * qd]], sub, lw, 1, false); }
    });
  },
});

/* 字枠に還る — each glyph in turn is replaced by its empty hairline body box; the boxes are then taken away in the same order */
reg('exit', 'tzToTofu', {
  name: '字枠に還る', en: 'Back To Boxes', tags: ['graphic', 'editorial', 'glitch'], ae: 'scatter', w: 0.9,
  apply(env, it, p, cx) {
    p = sync(env, p, cx);
    const ord = orders(env, it), plain = plainOf(it), sx = it.sx || 1, sy = it.sy || 1;
    const col = isHex(it.color) ? it.color : env.sc.fg;
    it.charFns.push(i => (p >= ord[i] * 0.45 + 0.05 ? HIDE : null));
    addPost(it, (e, i) => inItem(e, i, () => {
      const lw = Math.max(1.5, i.size * 0.022);
      for (const g of plain.slice(0, 40)) {
        const t = ord[g.i] * 0.45; if (p < t || p >= t + 0.42) continue;
        const u = (p - t) / 0.42, k = u > 0.8 ? 1 - E.inCubic((u - 0.8) / 0.2) * 0.6 : 1;
        const cx = g.x * sx, cy = g.y * sy, hw = g.w * sx * 0.42 * k, hh = g.h * sy * 0.42 * k;
        e.line([[cx - hw, cy - hh], [cx + hw, cy - hh], [cx + hw, cy + hh], [cx - hw, cy + hh], [cx - hw, cy - hh]], col, lw, 1, false);
      }
    }));
  },
});

/* ================================================================== HOLDS */

/* 末尾キャレット — a hairline caret blinks after the last glyph, as if the line were still being written */
reg('hold', 'tzCaretBlink', {
  name: '末尾キャレット', en: 'End Caret', tags: ['calm', 'editorial', 'emotional'], ae: 'still', w: 1,
  apply(env, it, amt) {
    const plain = plainOf(it); if (!plain.length) return;
    const mk = clamp(motionK(env) * 2), N = cutN(env);
    if (amt * mk < 0.05) return;
    if (plain.length <= 1 && N > 1 && Math.round(+it.mi || 0) !== N - 1) return;
    if ((env.lt % 1.06) >= 0.6) return;
    const g = plain[plain.length - 1], V = !!it.vertical, ac = accentOf(env);
    addPost(it, (e, i) => inItem(e, i, () => {
      const a = gA(i, g) + gLen(i, g) / 2 + i.size * 0.09, c = gC(i, g), hh = crossK(i) * 0.54;
      e.line([pt(V, a, c - hh), pt(V, a, c + hh)], ac, Math.max(2, i.size * 0.03), amt * mk * (i.alpha ?? 1), false);
    }));
  },
});

/* 伸びる下線 — a hairline underline grows slowly under the line for as long as the cut rests, a small tick at its head */
reg('hold', 'tzUnderGrow', {
  name: '伸びる下線', en: 'Growing Underline', tags: ['calm', 'editorial', 'emotional'], ae: 'still', w: 1,
  apply(env, it, amt, cx) {
    const lines = lineInfo(it); if (!lines.length) return;
    const mk = clamp(motionK(env) * 2), al = amt * mk; if (al < 0.03) return;
    const L = lines[lines.length - 1], V = !!it.vertical, solo = soloOf(env, it), ac = accentOf(env);
    const span = Math.max(0.8, (cx.dur || 2) - (cx.inDur || 0) - (cx.outDur || 0));
    const g = clamp((env.lt - (cx.inDur || 0) * 0.85) / span), e = 0.1 + 0.9 * (1 - Math.pow(1 - g, 1.5));
    addPost(it, (en, i) => inItem(en, i, () => {
      const lw = Math.max(1.5, i.size * 0.02), b = lerp(L.a0, L.a1, e), c = under(i, L, 0.6), a = al * (i.alpha ?? 1);
      en.line([pt(V, L.a0, c), pt(V, b, c)], ac, lw, a, false);
      if (!solo) { const th = crossK(i) * 0.09; en.line([pt(V, b, c - th), pt(V, b, c + th)], ac, lw, a, false); }
    }));
  },
});

/* 数える番号 — a small tabular number over the end of the line counts up quietly (on the beat when there is one) */
reg('hold', 'tzIndexCount', {
  name: '数える番号', en: 'Running Index', tags: ['editorial', 'graphic', 'calm'], ae: 'still', w: 0.8,
  apply(env, it, amt, cx) {
    const lines = lineInfo(it); if (!lines.length) return;
    const mk = clamp(motionK(env) * 2), al = amt * mk; if (al < 0.03) return;
    if (plainOf(it).length <= 1 && cutN(env) > 1 && Math.round(+it.mi || 0) !== 0) return;
    const per = env.beat ? Math.max(0.3, env.beat.len) : 0.5;
    const txt = pad2((1 + Math.floor(Math.max(0, env.lt - (cx.inDur || 0)) / per)) % 100);
    const V = !!it.vertical, sub = subOf(env), L = lines[0];
    addPost(it, (e, i) => inItem(e, i, () => {
      const fs = Math.max(14 * U(e), i.size * 0.24), a = al * (i.alpha ?? 1);
      if (V) label(e, txt, L.c, L.a1 + fs * 0.9, fs, sub, a, 'center');
      else {
        let y = over(i, L, 0.5) - fs * 0.8;
        if (!i.rot) y = Math.max(y, MG(e) + fs * 0.5 - i.y);
        label(e, txt, L.a1, y, fs, sub, a, 'right');
      }
    }));
  },
});

/* 字詰めの手直し — now and then one gap in the line is kerned a hair wider or tighter (a tick marks it), then put back */
reg('hold', 'tzKernNudge', {
  name: '字詰めの手直し', en: 'Kerning Nudge', tags: ['calm', 'editorial', 'graphic'], ae: 'breathe', w: 0.9,
  apply(env, it, amt) {
    const plain = plainOf(it), lines = lineInfo(it); if (plain.length < 3 || !lines.length) return;
    const seed = it.seed | 0, V = !!it.vertical, ac = accentOf(env);
    const per = env.beat ? Math.max(0.9, env.beat.len * 2) : 1.3, t = env.ltb / per, cyc = Math.floor(t), f = t - cyc;
    const L = lines[J.h(seed, cyc, 70) % lines.length], gs = plain.filter(g => g.li === L.li), n = gs.length;
    if (n < 3) return;
    const j = 1 + J.h(seed, cyc, 71) % (n - 1), sg = (J.h(seed, cyc, 72) & 1) ? 1 : -1;
    const prof = E.outExpo(clamp((f - 0.12) / 0.1)) * (1 - E.inOutCubic(clamp((f - 0.68) / 0.2)));
    const d = sg * it.size * 0.09 * amt * Math.min(1.3, motionK(env)) * prof;
    if (Math.abs(d) < 0.2) return;
    const idx = new Map(gs.map((g, k) => [g.i, k]));
    it.charFns.push(i => { const k = idx.get(i); if (k == null) return null; const o = k >= j ? d / 2 : -d / 2; return V ? { dy: o } : { dx: o }; });
    addPost(it, (e, i) => inItem(e, i, () => {
      const ga = (gA(i, gs[j - 1]) + gLen(i, gs[j - 1]) / 2 + gA(i, gs[j]) - gLen(i, gs[j]) / 2) / 2;
      e.line([pt(V, ga, under(i, L, 0.56)), pt(V, ga, under(i, L, 0.74))], ac, Math.max(1.5, i.size * 0.02), clamp(prof * amt) * (i.alpha ?? 1), false);
    }));
  },
});

/* 行き違う罫 — a short hairline over the line and one under it travel slowly in opposite directions */
reg('hold', 'tzCounterRules', {
  name: '行き違う罫', en: 'Passing Rules', tags: ['calm', 'editorial', 'graphic'], ae: 'drift', w: 0.9,
  apply(env, it, amt) {
    const lines = lineInfo(it); if (!lines.length || soloOf(env, it)) return;
    const mk = Math.min(1.3, motionK(env)); if (amt * mk < 0.03) return;
    const V = !!it.vertical, ac = accentOf(env), u = 0.5 - 0.5 * Math.cos(env.lt * 1.4 * mk + ((it.seed | 0) % 7));
    addPost(it, (e, i) => inItem(e, i, () => {
      const lw = Math.max(1.5, i.size * 0.02), a = Math.min(1, amt * mk * 1.5) * (i.alpha ?? 1);
      for (const L of lines.slice(0, 4)) {
        const len = L.a1 - L.a0, seg = len * 0.3, p1 = L.a0 + (len - seg) * u, p2 = L.a0 + (len - seg) * (1 - u);
        e.line([pt(V, p1, over(i, L, 0.64)), pt(V, p1 + seg, over(i, L, 0.64))], ac, lw, a, false);
        e.line([pt(V, p2, under(i, L, 0.64)), pt(V, p2 + seg, under(i, L, 0.64))], ac, lw, a, false);
      }
    }));
  },
});

/* ================================================================== TREATMENTS */
const alive = (it, amin = 0.9) => it.fill !== false && (it.alpha ?? 1) >= amin && !!it.text && it.size > 1;
const nonSp = it => [...String(it.text || '')].filter(c => !/\s/.test(c)).length;
const qIn = (e, i, d = 0.05, dur = 0.5) => E.outExpo(clamp((e.lt - (i.delay || 0) - d) / dur));

/* 行番号 — a small tabular line number is set before the line, divided from it by a hairline */
reg('treat', 'tzLineNo', {
  name: '行番号', en: 'Line Number', tags: ['editorial', 'graphic', 'calm'], ae: 'underline', w: 0.8,
  plan: rng => ({ acc: rng.chance(0.5) }),
  apply(env, it, Pt) {
    if (!alive(it) || nonSp(it) < 2) return;
    const col = Pt.acc ? accentOf(env) : subOf(env), txt = pad2(lineNo(env) % 100);
    addPost(it, (e, i) => itemSpace(e, i, () => {
      const Ls = lineSpans(i); if (!Ls.length) return;
      const L = Ls[0], q = qIn(e, i, 0.1, 0.45), a = (i.alpha ?? 1) * clamp(q * 1.5) * (1 - E.inCubic(e.pOut));
      if (a <= 0.01) return;
      const s = i.size, sy = i.sy || 1, fs = Math.max(12, s * 0.24), gap = s * 0.16, lw = Math.max(1, s * 0.014), mg = MG(e) * 0.8, nw = fs * 1.35;
      if (i.vertical) {
        const y = L.a0 - fs * 0.95; if (!i.rot && i.y + y < mg + fs * 0.5) return;
        label(e, txt, L.c, y, fs, col, a, 'center');
        e.line([[L.c - fs * 0.6 * q, L.a0 - fs * 0.3], [L.c + fs * 0.6 * q, L.a0 - fs * 0.3]], col, lw, a, false);
      } else if (!i.rot && (i.x + L.a0) - mg >= nw + gap * 2) {
        label(e, txt, L.a0 - gap * 2, L.c + s * sy * 0.36 - fs * 0.36, fs, col, a, 'right');
        const hh = s * sy * 0.42 * q; e.line([[L.a0 - gap, L.c - hh], [L.a0 - gap, L.c + hh]], col, lw, a, false);
      } else {
        const y = L.c - s * sy * 0.5 - fs * 0.85; if (!i.rot && i.y + y < mg + fs * 0.5) return;
        label(e, txt, L.a0 + fs * 0.05, y, fs, col, a, 'left');
        e.line([[L.a0, y + fs * 0.62], [L.a0 + nw * q, y + fs * 0.62]], col, lw, a, false);
      }
    }));
  },
});

/* 注番号 — one small superscript reference mark (a number or an asterisk) after the last glyph of the line */
reg('treat', 'tzSuperNote', {
  name: '注番号', en: 'Note Mark', tags: ['editorial', 'calm', 'emotional'], ae: 'emphasisDots', w: 0.8, safe: true,
  plan: rng => ({ star: rng.chance(0.35), acc: rng.chance(0.7) }),
  apply(env, it, Pt) {
    if (!alive(it) || nonSp(it) < 2) return;
    const col = Pt.acc ? accentOf(env) : (isHex(it.color) ? it.color : env.sc.fg), txt = Pt.star ? '＊' : String((lineNo(env) - 1) % 9 + 1);
    addPost(it, (e, i) => itemSpace(e, i, () => {
      const Ls = lineSpans(i); if (!Ls.length) return;
      const L = Ls[Ls.length - 1], q = qIn(e, i, 0.2, 0.4), a = (i.alpha ?? 1) * clamp(q * 2) * (1 - E.inCubic(e.pOut));
      if (a <= 0.01) return;
      const s = i.size, fs = Math.max(12, s * 0.3), mg = MG(e) * 0.6, rise = (1 - q) * fs * 0.3;
      if (i.vertical) {
        const x = L.c + s * (i.sx || 1) * 0.5 + fs * 0.5; if (!i.rot && i.x + x + fs * 0.5 > e.W - mg) return;
        label(e, txt, x, L.a1 - fs * 0.4 + rise, fs, col, a, 'center');
      } else {
        const x = L.a1 + fs * 0.12, yT = L.c - s * (i.sy || 1) * 0.36;
        if (i.rot || i.x + x + fs * 0.75 <= e.W - mg) label(e, txt, x, yT + rise, fs, col, a, 'left');
        else { const y = L.c - s * (i.sy || 1) * 0.5 - fs * 0.7; if (i.y + y < mg + fs * 0.5) return; label(e, txt, L.a1, y + rise, fs, col, a, 'right'); }
      }
    }));
  },
});

/* 字面ガイド — type-design guide lines behind the text: body top and bottom (and a dashed centre line), running past both ends */
reg('treat', 'tzTypeGuides', {
  name: '字面ガイド', en: 'Type Guides', tags: ['editorial', 'graphic', 'calm'], ae: 'underline', w: 0.8,
  plan: rng => ({ mid: rng.chance(0.6), ext: rng.range(0.3, 0.55), acc: rng.chance(0.3) }),
  apply(env, it, Pt) {
    if (!alive(it) || nonSp(it) < 2) return;
    const col = Pt.acc ? accentOf(env) : subOf(env);
    addPre(it, (e, i) => itemSpace(e, i, () => {
      const Ls = lineSpans(i); if (!Ls.length) return;
      const s = i.size, V = !!i.vertical, ck = crossK(i), lw = Math.max(1.5, s * 0.015), ext = s * (Pt.ext || 0.4), a = i.alpha ?? 1, o = E.inCubic(e.pOut);
      Ls.slice(0, 6).forEach((L, k) => {
        const q = qIn(e, i, 0.02 + k * 0.06, 0.55), a0 = L.a0 - ext, a1 = L.a1 + ext, mid = (a0 + a1) / 2, half = (a1 - a0) / 2 * q * (1 - o);
        if (half < 1) return;
        for (const c of [-0.56, 0.56]) e.line([pt(V, mid - half, L.c + ck * c), pt(V, mid + half, L.c + ck * c)], col, lw, 0.8 * a, false);
        if (Pt.mid) { e.ctx.save(); e.ctx.setLineDash([s * 0.07, s * 0.07]); e.line([pt(V, mid - half, L.c), pt(V, mid + half, L.c)], col, lw, 0.42 * a, false); e.ctx.restore(); }
        if (q > 0.6 && o < 0.4) for (const x of [L.a0, L.a1]) e.line([pt(V, x, L.c - ck * 0.56 - s * 0.1), pt(V, x, L.c - ck * 0.56)], col, lw, 0.8 * a, false);
      });
    }));
  },
});

/* 目次リーダー — like a contents entry: dot leaders run on from the end of the line to a small tabular number
   (set on a row of their own under the line when there is no room beside it) */
reg('treat', 'tzTocLeader', {
  name: '目次リーダー', en: 'Contents Leader', tags: ['editorial', 'graphic', 'calm'], ae: 'emphasisDots', w: 0.7,
  plan: rng => ({ acc: rng.chance(0.5) }),
  apply(env, it, Pt) {
    if (!alive(it) || nonSp(it) < 3) return;
    const col = Pt.acc ? accentOf(env) : subOf(env), txt = pad2(lineNo(env) % 100);
    addPost(it, (e, i) => itemSpace(e, i, () => {
      const Ls = lineSpans(i); if (!Ls.length) return;
      const L = Ls[Ls.length - 1], q = qIn(e, i, 0.15, 0.6) * (1 - E.inCubic(e.pOut)), a = i.alpha ?? 1;
      if (q <= 0.01 || a <= 0.01) return;
      const s = i.size, V = !!i.vertical, ck = crossK(i), fs = Math.max(12, s * 0.26), mg = MG(e) * 0.9, pitch = s * 0.2, r = Math.max(1.2, s * 0.024), nw = fs * 1.4;
      const room = i.rot ? 0 : V ? (e.H - mg) - (i.y + L.a1 + s * 0.2) - nw : (e.W - mg) - (i.x + L.a1 + s * 0.2) - nw - s * 0.1;
      let start, len, c, nc;
      if (room >= s * 0.8) { start = L.a1 + s * 0.2; len = Math.min(room, s * 1.8); c = V ? L.c : L.c + ck * 0.3; nc = V ? L.c : L.c + ck * 0.36 - fs * 0.36; }
      else { start = L.a0; len = (L.a1 - L.a0) - nw - s * 0.08; c = under(i, L, 0.7); nc = c + (V ? 0 : -fs * 0.06); }
      if (len < s * 0.5) return;
      const cnt = Math.min(40, Math.floor(len / pitch)), shown = Math.ceil(cnt * clamp(q * 1.4));
      for (let k = 0; k < shown; k++) { const d = pt(V, start + pitch * (k + 0.5), c); e.circle(d[0], d[1], r, col, null, 1, a, false); }
      const na = a * clamp(q * 3 - 2); if (na <= 0.01) return;
      if (V) label(e, txt, nc, start + cnt * pitch + fs * 0.7, fs, col, na, 'center');
      else label(e, txt, start + cnt * pitch + s * 0.08, nc, fs, col, na, 'left');
    }));
  },
});

/* かな小組み — hiragana are set a size smaller than kanji / katakana on the same baseline and closed up (no change for text without both) */
reg('treat', 'tzKanaSmall', {
  name: 'かな小組み', en: 'Small Kana', tags: ['editorial', 'emotional', 'calm'], ae: 'sizeWave', w: 1, safe: true,
  plan: rng => ({ k: rng.range(0.76, 0.84) }),
  apply(env, it, Pt) {
    if (!alive(it, 0.5)) return;
    const lay = J.layoutText(it), plain = lay.filter(g => !isSp(g.ch)); if (!plain.length) return;
    const ref = [...(plain.length <= 1 ? String(env.cut.text || '') : String(it.text))];
    const big = ch => J.isKanji(ch) || J.isKata(ch) || /[A-Za-z0-9]/.test(ch), small = ch => J.isHira(ch);
    if (!ref.some(big) || !ref.some(small)) return;
    const k = Pt.k || 0.8, V = !!it.vertical, sy = it.sy || 1, al = it.align, sh = new Map(), byLine = new Map();
    for (const g of plain) { const a = byLine.get(g.li); if (a) a.push(g); else byLine.set(g.li, [g]); }
    for (const gs of byLine.values()) {
      let cum = 0; const tmp = [];
      for (const g of gs) { if (J.isHira(g.ch)) { const free = (1 - k) * gLen(it, g); tmp.push([g.i, -(cum + free / 2)]); cum += free; } else tmp.push([g.i, -cum]); }
      const base = V ? (al === 'left' ? 0 : cum / 2) : al === 'left' ? 0 : al === 'right' ? cum : cum / 2;
      for (const [i, d] of tmp) sh.set(i, d + base);
    }
    it.charFns.push((i, g) => {
      const d = sh.get(i); if (d == null) return null;
      if (J.isHira(g.ch)) return V ? { s: k, dy: d } : { s: k, dx: d, dy: (1 - k) * g.h * sy * 0.36 };
      return d ? (V ? { dy: d } : { dx: d }) : null;
    });
  },
});

/* ================================================================== CAMERA */
const KM = env => clamp((env.fx.motion ?? 0.7) * 1.25, 0, 1.25);
const cuOf = env => clamp(env.lt / Math.max(0.3, env.cut.dur));

/* タブ送り — the frame sits a few tab stops off and is moved to centre one exact stop at a time, then stays put */
reg('cam', 'tzTabStep', {
  name: 'タブ送り', en: 'Tab Step', tags: ['editorial', 'graphic', 'pop'], w: 0.9, ae: 'snapPan',
  plan: rng => ({ ax: rng.chance(0.7) ? 0 : 1, dir: rng.pick([1, -1]), n: rng.int(2, 3), a: rng.range(0.014, 0.02) }),
  get(env, Q) {
    const K = KM(env), n = Q.n || 2, dur = env.cut.dur, gap = Math.min(0.6, Math.max(0.2, dur * 0.6 / n));
    let done = 0; for (let k = 0; k < n; k++) done += ioc(clamp((env.lt - 0.18 - k * gap) / 0.16));
    const d = -(Q.dir || 1) * (Q.a || 0.016) * (n - done) * K;
    return Q.ax ? { y: d * env.H, s: 1.02 } : { x: d * env.W, s: 1.02 };
  } });

/* 斜体から正体 — the frame starts slanted like an italic and is set upright in one clean move, then leans back by a hair */
reg('cam', 'tzItalicSet', {
  name: '斜体から正体', en: 'Italic To Roman', tags: ['editorial', 'pop', 'emotional'], w: 0.9, ae: 'dutch',
  plan: rng => ({ dir: rng.pick([1, 1, -1]), a: rng.range(5.5, 8) }),
  get(env, Q) {
    const K = KM(env), d = Q.dir || 1, e = E.outExpo(clamp(env.lt / Math.min(0.55, Math.max(0.25, env.cut.dur * 0.4))));
    return { skx: -d * (Q.a || 6.5) * K * (1 - e) + d * 0.9 * K * cuOf(env) * e, s: 1.02 };
  } });

/* 行長合わせ — only the width of the frame changes: it starts a little wide (or narrow) and closes slowly to true measure */
reg('cam', 'tzMeasureZoom', {
  name: '行長合わせ', en: 'Measure Set', tags: ['calm', 'editorial', 'emotional'], w: 1, ae: 'push',
  plan: rng => ({ wide: rng.chance(0.65), a: rng.range(0.045, 0.06) }),
  get(env, Q) {
    const K = KM(env), u = E.inOutSine(cuOf(env)), a = (Q.a || 0.05) * K * (1 - u);
    return { sx: Q.wide === false ? 1 - a * 0.7 : 1 + a, sy: 1, s: 1.015 };
  } });

/* 方眼ステップ — the frame is moved like a plotter head: one small exact step at a time around a square, x and y never together */
reg('cam', 'tzGridStep', {
  name: '方眼ステップ', en: 'Grid Step', tags: ['graphic', 'editorial', 'glitch'], w: 0.8, ae: 'snapPan',
  plan: rng => ({ per: rng.range(0.45, 0.6), a: rng.range(0.01, 0.014), cw: rng.pick([1, -1]), s0: rng.int(0, 3) }),
  get(env, Q) {
    const K = KM(env), C = [[-1, -1], [1, -1], [1, 1], [-1, 1]], dir = Q.cw || 1, s0 = Q.s0 | 0;
    const per = env.beat && env.beat.len > 0.25 ? env.beat.len : (Q.per || 0.5), k = Math.floor(env.lt / per), e = ioc(clamp((env.lt - k * per) / 0.14));
    const at = i => C[(((s0 + dir * i) % 4) + 4) % 4], A = at(Math.max(0, k - 1)), B = at(k), a = (Q.a || 0.012) * K;
    return { x: lerp(A[0], B[0], e) * env.W * a, y: lerp(A[1], B[1], e) * env.H * a * 0.9, s: 1.03 };
  } });

/* ================================================================== SCREEN ACCENTS */
const isDark = c => J.lum(c) < 0.45;
const evS = ev => J.h(Math.round(ev.t * 1000), 7717);
const amp1 = ev => clamp(ev.amp ?? 1, 0.5, 1.3);
const popC = sc => [sc.accent, sc.accent2, sc.fg].find(c => c && J.contrast(c, sc.bg) > 1.8) || sc.fg;
const hairPx = I => Math.max(1, Math.round(Math.min(I.cw, I.ch) * 0.0024));
const cx2 = c => { const x = c.getContext('2d'); x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over'; x.filter = 'none'; return x; };
const fx = (k, d) => reg('fx', k, Object.assign({}, d, {
  draw(ctx, ev, k2, I) { ctx.save(); try { d.draw(ctx, ev, clamp(Number.isFinite(k2) ? k2 : 1), I); } finally { ctx.restore(); } },
}));

/* 罫線フラッシュ — two or three hairlines (one heavier) shoot across the whole frame and retract from their tails */
fx('tzRuleFlash', { name: '罫線フラッシュ', en: 'Rule Flash', tags: ['editorial', 'graphic', 'calm'], w: 1.1, dur: 6, amp: 1, mid: true, ae: 'flash',
  draw(ctx, ev, k, I) {
    const { cw, ch, sc } = I, s = evS(ev), n = 2 + (J.h(s, 1) % 2), w = hairPx(I), vert = J.r(s, 2) < 0.2, L = vert ? cw : ch, M = vert ? ch : cw;
    ctx.fillStyle = popC(sc); ctx.globalAlpha = clamp(amp1(ev));
    for (let i = 0; i < n; i++) {
      const pos = Math.round(L * (1 + ((J.h(s, 3) % 3) + i * 4) % 11) / 12), u = clamp(k * 1.25 - i * 0.1);
      const head = E.outExpo(clamp(u / 0.45)), tail = E.inCubic(clamp((u - 0.5) / 0.5)), len = M * (head - tail);
      if (len < 1) continue;
      const x0 = ((i + (s & 1)) & 1) ? M - M * head : M * tail, th = i === 0 ? w * 3 : w;
      if (vert) ctx.fillRect(pos - th / 2, x0, th, len); else ctx.fillRect(x0, pos - th / 2, len, th);
    }
  } });

/* 字抜き帯 — for a frame or two one band of the picture is knocked out: a plate in the text colour, the type in the background colour */
fx('tzKnockBand', { name: '字抜き帯', en: 'Knockout Band', tags: ['graphic', 'editorial', 'pop'], w: 0.9, dur: 3, amp: 1, mid: true, scratch: true, ae: 'invert',
  draw(ctx, ev, k, I) {
    const { cw, ch, S, sc } = I; if (!S) return;
    const s = evS(ev), dk = isDark(sc.bg);
    const bh = Math.max(4, Math.round(ch * (0.14 + 0.1 * J.r(s, 1)) * amp1(ev) * (k < 0.55 ? 1 : 0.34)));
    const y0 = Math.round(clamp(ch * (0.5 + 0.14 * J.rs(s, 2)) - bh / 2, 0, ch - bh));
    const T = I.tmp(cw, bh), x = cx2(T);
    x.globalCompositeOperation = 'copy'; x.drawImage(S, 0, y0, cw, bh, 0, 0, cw, bh);
    x.globalCompositeOperation = 'difference'; x.fillStyle = sc.bg; x.fillRect(0, 0, cw, bh);
    x.globalCompositeOperation = 'saturation'; x.fillStyle = '#808080'; x.fillRect(0, 0, cw, bh);
    x.globalCompositeOperation = 'multiply'; x.drawImage(T, 0, 0);
    x.globalCompositeOperation = 'color-dodge'; x.fillStyle = '#d0d0d0'; x.fillRect(0, 0, cw, bh);          // ink = white on black
    if (dk) { x.globalCompositeOperation = 'difference'; x.fillStyle = '#ffffff'; x.fillRect(0, 0, cw, bh); }
    x.globalCompositeOperation = 'source-over';
    ctx.fillStyle = sc.fg; ctx.fillRect(0, y0, cw, bh);
    ctx.globalCompositeOperation = dk ? 'multiply' : 'screen'; ctx.drawImage(T, 0, y0);
    ctx.globalCompositeOperation = dk ? 'lighten' : 'darken'; ctx.fillStyle = sc.bg; ctx.fillRect(0, y0, cw, bh);
  } });

/* 段ずらし — the frame is ruled into text columns; alternate columns step a line up / down (two exact steps) and are set back */
fx('tzColumnShift', { name: '段ずらし', en: 'Column Shift', tags: ['graphic', 'editorial', 'glitch'], w: 0.9, dur: 8, amp: 1, mid: true, scratch: true, ae: 'slice',
  draw(ctx, ev, k, I) {
    const { cw, ch, S, sc } = I; if (!S) return;
    const s = evS(ev), n = 4 + (J.h(s, 1) % 3), sg = (s & 1) ? 1 : -1, d = ch * 0.04 * amp1(ev);
    const lvl = k < 0.18 ? 0.5 : k < 0.5 ? 1 : 1 - ioc((k - 0.5) / 0.5);
    if (lvl < 0.004) return;
    ctx.fillStyle = sc.bg; ctx.fillRect(0, 0, cw, ch);
    for (let i = 0; i < n; i++) {
      const x0 = Math.round(i * cw / n), x1 = Math.round((i + 1) * cw / n);
      ctx.drawImage(S, x0, 0, x1 - x0, ch, x0, Math.round(((i & 1) ? 1 : -1) * sg * d * lvl), x1 - x0, ch);
    }
    const w = hairPx(I); ctx.globalAlpha = 0.7 * Math.min(1, lvl * 2); ctx.fillStyle = popC(sc);
    for (let i = 1; i < n; i++) ctx.fillRect(Math.round(i * cw / n) - w / 2, 0, w, ch);
  } });

/* トンボ点滅 — printer's crop marks in the four corners and register marks on the edge centres blink on twice */
fx('tzRegTicks', { name: 'トンボ点滅', en: 'Register Marks', tags: ['editorial', 'graphic', 'glitch'], w: 0.9, dur: 6, amp: 1, mid: true, ae: 'flash',
  draw(ctx, ev, k, I) {
    if (!(k < 0.3 || (k >= 0.45 && k < 0.82))) return;
    const { cw, ch, sc } = I, m = Math.min(cw, ch), w = hairPx(I), ins = m * 0.07, len = m * 0.04, gap = m * 0.012;
    ctx.fillStyle = ctx.strokeStyle = popC(sc); ctx.lineWidth = w; ctx.globalAlpha = clamp(amp1(ev));
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
      const x = sx < 0 ? ins : cw - ins, y = sy < 0 ? ins : ch - ins;
      ctx.fillRect(sx < 0 ? x - gap - len : x + gap, y - w / 2, len, w);
      ctx.fillRect(x - w / 2, sy < 0 ? y - gap - len : y + gap, w, len);
    }
    const r = len * 0.32, c = ins * 0.55;
    for (const [x, y] of [[cw / 2, c], [cw / 2, ch - c], [c, ch / 2], [cw - c, ch / 2]]) {
      ctx.fillRect(x - len * 0.6, y - w / 2, len * 1.2, w); ctx.fillRect(x - w / 2, y - len * 0.6, w, len * 1.2);
      ctx.beginPath(); ctx.arc(x, y, r, 0, J.TAU); ctx.stroke();
    }
  } });

/* 方眼フラッシュ — a hairline baseline grid with column rules draws itself over the frame, line after line, and fades */
fx('tzGridFlash', { name: '方眼フラッシュ', en: 'Grid Flash', tags: ['editorial', 'graphic', 'calm'], w: 0.9, dur: 8, amp: 1, mid: true, ae: 'flash',
  draw(ctx, ev, k, I) {
    const { cw, ch, sc } = I, s = evS(ev), w = hairPx(I), rows = cw > ch ? 12 : 18, cols = cw > ch ? 6 : 4, rev = (s & 1) === 1;
    ctx.fillStyle = popC(sc); ctx.globalAlpha = 0.5 * clamp(amp1(ev)) * (k < 0.65 ? 1 : 1 - E.inCubic((k - 0.65) / 0.35));
    for (let r = 1; r < rows; r++) {
      const len = cw * E.outExpo(clamp((k - r / rows * 0.3) / 0.3)); if (len < 1) continue;
      ctx.fillRect(rev ? cw - len : 0, Math.round(r * ch / rows) - w / 2, len, w);
    }
    for (let c = 1; c < cols; c++) {
      const len = ch * E.outExpo(clamp((k - 0.12 - c / cols * 0.2) / 0.3)); if (len < 1) continue;
      ctx.fillRect(Math.round(c * cw / cols) - w / 2, 0, w, len);
    }
  } });

/* コマ位置送り — the whole frame is re-registered: three small exact hard steps around a square, back to true on the fourth */
fx('tzFrameStep', { name: 'コマ位置送り', en: 'Frame Step', tags: ['graphic', 'glitch', 'editorial'], w: 0.9, dur: 8, amp: 1, mid: true, scratch: true, ae: 'shake',
  draw(ctx, ev, k, I) {
    const { cw, ch, S, sc } = I; if (!S) return;
    const s = evS(ev), a = Math.min(cw, ch) * 0.024 * amp1(ev), i = Math.min(3, Math.floor(k * 4));
    if (i >= 3) return;
    const path = [[1, 0], [1, 1], [0, 1]], sx = (s & 1) ? 1 : -1, sy = (s & 2) ? 1 : -1, q = (s & 4) ? [path[i][1], path[i][0]] : path[i];
    ctx.fillStyle = sc.bg; ctx.fillRect(0, 0, cw, ch);
    ctx.drawImage(S, Math.round(q[0] * sx * a), Math.round(q[1] * sy * a));
  } });

/* ================================================================== TRANSITIONS */
const bell = k => Math.sin(Math.PI * clamp(k));
const part = (ctx, C, x, y, w, h) => {
  const x0 = Math.max(0, Math.floor(x)), y0 = Math.max(0, Math.floor(y));
  const x1 = Math.min(C.width, Math.ceil(x + w)), y1 = Math.min(C.height, Math.ceil(y + h));
  if (x1 - x0 < 1 || y1 - y0 < 1) return;
  ctx.drawImage(C, x0, y0, x1 - x0, y1 - y0, x0, y0, x1 - x0, y1 - y0);
};
const tAcc = I => {
  const sc = I.sc, pb = (I.scPrev || sc).bg;
  for (const c of [sc.accent, sc.accent2, sc.fg]) if (c && J.contrast(c, sc.bg) >= 1.8 && J.contrast(c, pb) >= 1.4) return c;
  return sc.fg;
};
const trReg = (k, d) => reg('trans', k, Object.assign({}, d, {
  draw(ctx, A, B, p, I) {
    ctx.save();
    try {
      if (!(p > 0)) ctx.drawImage(A, 0, 0);
      else if (p >= 1) ctx.drawImage(B, 0, 0);
      else d.draw(ctx, A, B, p, I, I.P || {});
    } finally { ctx.restore(); }
  } }));

/* 罫割り — a hairline is drawn across the frame, splits in two, and the new cut is uncovered between the parting rules */
trReg('tzRuleSplit', {
  name: '罫割り', en: 'Rule Split', tags: ['editorial', 'calm', 'graphic'], ae: 'doorsOpen', w: 1, dur: 0.5,
  plan: rng => ({ vert: rng.chance(0.3), at: rng.range(0.42, 0.58) }),
  draw(ctx, A, B, p, I, Pt) {
    const { cw, ch } = I, V = !!Pt.vert, L = V ? cw : ch, M = V ? ch : cw, c = Math.round(L * (Pt.at || 0.5)), ac = tAcc(I), lw = Math.max(2, Math.round(Math.min(cw, ch) * 0.003));
    ctx.drawImage(A, 0, 0);
    const q1 = E.inOutCubic(clamp(p / 0.3)), q2 = E.inOutCubic(clamp((p - 0.24) / 0.76));
    const lo = lerp(c, 0, q2), hi = lerp(c, L, q2);
    if (hi - lo >= 1) { if (V) part(ctx, B, lo, 0, hi - lo, ch); else part(ctx, B, 0, lo, cw, hi - lo); }
    ctx.fillStyle = ac; ctx.globalAlpha = 1 - clamp((q2 - 0.85) / 0.15);
    const half = M / 2 * q1;
    for (const y of (q2 > 0 ? [lo, hi] : [c])) { if (V) ctx.fillRect(y - lw / 2, M / 2 - half, lw, half * 2); else ctx.fillRect(M / 2 - half, y - lw / 2, half * 2, lw); }
  } });

/* 段ごと差し替え — the frame is set in text columns; column after column is replaced in a hard cut, a hairline dropping down each one */
trReg('tzColumnReplace', {
  name: '段ごと差し替え', en: 'Column Replace', tags: ['editorial', 'graphic', 'pop'], ae: 'blinds', w: 0.9, dur: 0.5,
  plan: rng => ({ n: rng.int(4, 7), rtl: rng.chance(0.4) }),
  draw(ctx, A, B, p, I, Pt) {
    const { cw, ch } = I, n = Pt.n || 5, ac = tAcc(I), lw = Math.max(2, Math.round(Math.min(cw, ch) * 0.0028));
    ctx.drawImage(A, 0, 0);
    for (let i = 0; i < n; i++) {
      const j = Pt.rtl ? n - 1 - i : i, u = clamp((p - i / n * 0.78) / 0.22); if (u <= 0) continue;
      const x0 = Math.round(j * cw / n), x1 = Math.round((j + 1) * cw / n);
      part(ctx, B, x0, 0, x1 - x0, ch);
      if (u < 1) { ctx.fillStyle = ac; ctx.fillRect(x0, Math.round(ch * E.outCubic(u)) - lw / 2, x1 - x0, lw); ctx.fillRect(x0, 0, lw, ch); ctx.fillRect(x1 - lw, 0, lw, ch); }
    }
    ctx.globalAlpha = 0.5 * bell(p); ctx.fillStyle = ac;
    for (let i = 1; i < n; i++) ctx.fillRect(Math.round(i * cw / n) - lw / 4, 0, lw / 2, ch);
  } });

/* 基線に畳む — the old cut is folded flat onto a baseline hairline from above and below; the new cut unfolds from the same line */
trReg('tzBaselineFold', {
  name: '基線に畳む', en: 'Baseline Fold', tags: ['editorial', 'graphic', 'emotional'], ae: 'cubeTurn', w: 0.9, dur: 0.5,
  plan: rng => ({ at: rng.range(0.5, 0.66) }),
  draw(ctx, A, B, p, I, Pt) {
    const { cw, ch, sc } = I, yb = Math.round(ch * (Pt.at || 0.58)), ac = tAcc(I), lw = Math.max(2, Math.round(Math.min(cw, ch) * 0.003));
    const first = p < 0.5, sy = Math.max(0.002, first ? 1 - E.inCubic(p / 0.5) : E.outCubic((p - 0.5) / 0.5));
    ctx.fillStyle = J.mix((I.scPrev || sc).bg, sc.bg, clamp(p)); ctx.fillRect(0, 0, cw, ch);
    ctx.save(); ctx.setTransform(1, 0, 0, sy, 0, yb * (1 - sy)); ctx.drawImage(first ? A : B, 0, 0); ctx.restore();
    ctx.globalAlpha = clamp(p / 0.2) * (1 - clamp((p - 0.8) / 0.2)); ctx.fillStyle = ac; ctx.fillRect(0, yb - lw / 2, cw, lw);
  } });

})();
