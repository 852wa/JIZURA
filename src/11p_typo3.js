/* JIZURA pack: typo (part 3) — typographic decor (colophon, running head, glyph bodies, text rules, type scale, big quote marks),
   text treatments (hollow key glyph, head / foot rules, large head glyph, glyph indices) and two type-driven transitions */
(() => {
'use strict';
const E = J.E;
const P = 'typo';
const SET = 'typo';
const reg = (g, key, def) => J.register(g, key, Object.assign({ set: SET }, def), P);
const clamp = J.clamp, lerp = J.lerp, DEG = J.DEG;

/* ------------------------------------------------------------------ shared helpers */
const U = env => Math.min(env.W, env.H) / 1080;
const MG = env => Math.round(Math.min(env.W, env.H) * 0.05);
const monoF = env => (env.st.fonts.mono && env.st.fonts.mono[0]) || 'mono';
const bodyF = env => (env.st.fonts.body && env.st.fonts.body[0]) || 'gothic_med';
const outE = env => 1 - E.inCubic(env.pOut);
const inE = (env, d = 0.4, delay = 0) => E.outExpo(clamp((env.lt - delay) / d));
const pad2 = n => String(n).padStart(2, '0');
const FS = env => Math.max(11, 16 * U(env));
const isSp = c => c === ' ' || c === '　';
const accentOf = sc => (J.contrast(sc.accent, sc.bg) >= 1.8 ? sc.accent : sc.fg);
const bw = bb => bb.x1 - bb.x0, bh = bb => bb.y1 - bb.y0;
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
/* a screen corner (inside the margin) clear of the lyric; ok=false when none is free */
function cornerSpot(env, bb, w, h, P) {
  const { W, H } = env, m = MG(env);
  const sx0 = P.right ? 1 : -1, sy0 = P.low ? 1 : -1;
  for (const [sx, sy] of [[sx0, sy0], [-sx0, sy0], [sx0, -sy0], [-sx0, -sy0]]) {
    const X = sx > 0 ? W - m - w : m, Y = sy > 0 ? H - m - h : m;
    if (!hitBB(X, Y, X + w, Y + h, bb, 14 * U(env))) return { x: X, y: Y, ok: true, sx, sy };
  }
  return { x: m, y: m, ok: false, sx: -1, sy: -1 };
}
const label = (env, text, x, y, o = {}) => env.draw({ text: String(text), font: o.font || monoF(env), size: o.size || FS(env), x, y, align: o.align || 'left', track: o.track ?? 0.12, color: o.color || env.sc.sub, alpha: o.alpha ?? 1, ghost: false });
const textW = (text, font, size, track = 0.12) => J.measure({ text, font, size, track }).w;
const keyChar = (text) => {
  const arr = [...String(text || '')];
  const k = arr.find(c => J.isKanji(c)) || arr.find(c => !isSp(c) && !J.isPunct(c) && !J.isSmallKana(c)) || arr.find(c => !isSp(c));
  return k || null;
};
/* glyph edge positions of the lyric (x for horizontal lines of text), from the bbox glyph boxes or evenly spread */
const glyphEdges = (env, bb) => {
  const out = [];
  if (bb.boxes && bb.boxes.length && bb.cx != null && bb.boxes.length <= 40) {
    for (const b of bb.boxes) { const x0 = bb.cx + b.x - b.w / 2, x1 = bb.cx + b.x + b.w / 2; if (x0 > bb.x0 - 4 && x1 < bb.x1 + 4) out.push(x0, x1); }
  }
  if (out.length < 2) {
    const n = Math.max(1, Math.min(16, J.glyphCount(String(env.cut.text || ''))));
    for (let i = 0; i <= n; i++) out.push(lerp(bb.x0, bb.x1, i / n));
  }
  out.sort((a, b) => a - b);
  const ded = []; for (const x of out) if (!ded.length || x - ded[ded.length - 1] > 3) ded.push(x);
  return ded.slice(0, 34);
};

/* ================================================================== DECOR */

/* 奥付 — a small colophon block (line, time, glyph count, reading) typed into a free corner, with a hairline */
reg('decor', 'tyColophon', {
  name: '奥付', tags: ['editorial', 'calm', 'graphic'], ae: 'leaders', w: 1, layer: 'front',
  draw(env, bb0, Pd) {
    if (env.pass !== 'main') return;
    const bb = getBB(env, bb0), { sc } = env, cut = env.cut, u = U(env);
    const o = outE(env); if (o <= 0.003 || env.lt < 0) return;
    const fs = FS(env) * 1.1, lead = fs * 1.7;
    const txt = String(cut.text || '').trim(), raw = txt.replace(/\s+/g, '');
    const rj = J.romaji(raw); const rom = rj && /[ぁ-ヿ]/.test(raw) ? rj.toUpperCase() : null;
    const lt = String(cut.lineText || txt).replace(/\s+/g, ' ').trim();
    const lines = [
      [lt.length > 18 ? [...lt].slice(0, 17).join('') + '…' : lt, bodyF(env), sc.fg],
      [`No.${pad2((cut.line | 0) + 1)}  ${J.fmtTime(cut.start)} – ${J.fmtTime(cut.end)}`, monoF(env), sc.sub],
      [`${J.glyphCount(txt)} CHARS${rom ? '  /  ' + (rom.length > 16 ? rom.slice(0, 15) + '…' : rom) : ''}`, monoF(env), sc.sub],
    ];
    let w = 0; for (const [t, f] of lines) w = Math.max(w, textW(t, f, fs));
    const h = lead * lines.length;
    const sp = cornerSpot(env, bb, w + fs * 1.4, h, Object.assign({}, Pd, { low: Pd.low !== false }));
    if (!sp.ok) return;
    const x = sp.x + fs * 1.4, e = inE(env, 0.6) * o;
    env.line([[sp.x, sp.y], [sp.x, sp.y + h * e]], accentOf(sc), Math.max(1.5, 2 * u), o, false);
    lines.forEach(([t, f, c], i) => {
      const arr = [...t], k = Math.floor(arr.length * clamp((env.lt - 0.1 - i * 0.14) / 0.45));
      if (k > 0) label(env, arr.slice(0, k).join(''), x, sp.y + lead * (i + 0.5), { font: f, size: fs, color: c, alpha: o * (i ? 0.85 : 1) });
    });
  },
});

/* 柱とノンブル — a running head (line number + lyric line + hairline) at the top and a folio number at the bottom */
reg('decor', 'tyRunningHead', {
  name: '柱とノンブル', tags: ['editorial', 'calm'], ae: 'timecodeBar', w: 1, layer: 'front',
  draw(env, bb0, Pd) {
    if (env.pass !== 'main') return;
    const bb = getBB(env, bb0), { W, H, sc } = env, cut = env.cut, u = U(env), m = MG(env);
    const o = outE(env); if (o <= 0.003 || env.lt < 0) return;
    const fs = FS(env) * 0.9, e = inE(env, 0.7) * o, lw = Math.max(1, u);
    const yH = m + fs * 0.6;
    if (!hitBB(0, yH - fs, W, yH + fs, bb, 8 * u)) {
      const head = `${pad2((cut.line | 0) + 1)}　${String(cut.lineText || cut.text || '').replace(/\s+/g, ' ').trim()}`;
      const hs = [...head].slice(0, 30).join('');
      const tw = textW(hs, bodyF(env), fs, 0.2);
      const right = !!Pd.right;
      const x0 = right ? W - m - tw : m;
      label(env, hs, x0, yH, { font: bodyF(env), size: fs, color: sc.sub, alpha: e, track: 0.2 });
      const a0 = right ? x0 - fs : x0 + tw + fs, a1 = right ? m : W - m;
      if ((a1 - a0) * (right ? -1 : 1) > 20) env.line([[a0, yH], [lerp(a0, a1, e), yH]], sc.sub, lw, 0.6 * o, false);
    }
    const yF = H - m - fs * 0.2;
    const folio = String((cut.index | 0) + 1).padStart(3, '0');
    const fw = textW(folio, monoF(env), fs * 1.3, 0.2);
    const xF = Pd.right ? m + fw / 2 : W - m - fw / 2;
    if (!hitBB(xF - fw, yF - fs * 1.2, xF + fw, yF + fs, bb, 8 * u)) {
      const a = E.outCubic(clamp((env.lt - 0.2) / 0.4)) * o;
      label(env, folio, xF, yF, { size: fs * 1.3, align: 'center', color: sc.fg, alpha: a, track: 0.2 });
      env.line([[xF - fw * 0.9, yF - fs * 1.1], [xF + fw * 0.9, yF - fs * 1.1]], accentOf(sc), Math.max(1.5, 2 * u), a, false);
    }
  },
});

/* 字割り線 — hairlines at every glyph body edge run from the lyric out to the frame edges, like a type specimen */
reg('decor', 'tyGlyphBody', {
  name: '字割り線', tags: ['editorial', 'graphic', 'calm'], ae: 'guides', w: 0.9, layer: 'front',
  draw(env, bb0, Pd) {
    if (env.pass !== 'main') return;
    const bb = getBB(env, bb0), { W, H, sc } = env, u = U(env), m = MG(env) * 0.6;
    const o = outE(env); if (o <= 0.003 || env.lt < 0) return;
    if (bh(bb) > bw(bb) * 1.3) return;        // vertical lyrics: nothing to divide horizontally
    const xs = glyphEdges(env, bb), gap = 10 * u + bh(bb) * 0.06, lw = Math.max(1, 0.9 * u);
    const col = sc.sub, a = 0.45 * o;
    xs.forEach((x, i) => {
      const e = E.outExpo(clamp((env.lt - i * 0.015) / 0.7));
      if (e <= 0) return;
      const t0 = bb.y0 - gap, t1 = t0 - (t0 - m) * e, b0 = bb.y1 + gap, b1 = b0 + (H - m - b0) * e;
      if (t0 > m) env.line([[x, t0], [x, t1]], col, lw, a, false);
      if (b0 < H - m) env.line([[x, b0], [x, b1]], col, lw, a, false);
    });
    // body top / bottom lines out to the side margins
    const e = inE(env, 0.8, 0.1) * o, ac = accentOf(sc);
    for (const y of [bb.y0, bb.y1]) {
      env.line([[bb.x0 - gap, y], [bb.x0 - gap - (bb.x0 - gap - m) * e, y]], col, lw, a, false);
      env.line([[bb.x1 + gap, y], [bb.x1 + gap + (W - m - bb.x1 - gap) * e, y]], col, lw, a, false);
    }
    const fs = FS(env) * 0.75;
    if (bb.y0 - gap > m + fs * 2) label(env, `${pad2(J.glyphCount(String(env.cut.text || '')))} / W${Math.round(bw(bb) / u)}`, xs[0] + 4 * u, bb.y0 - gap - fs * 0.8, { size: fs, color: ac, alpha: e });
  },
});

/* 文字罫 — a rule made of tiny repeated lyric text runs along the top and bottom edges, drifting in opposite directions */
reg('decor', 'tyTextRule', {
  name: '文字罫', tags: ['editorial', 'graphic', 'calm'], ae: 'verticalStrip', w: 1, layer: 'front', subtle: true,
  draw(env, bb0, Pd) {
    if (env.pass !== 'main') return;
    const bb = getBB(env, bb0), { W, H, sc, ctx } = env, cut = env.cut, u = U(env), m = MG(env);
    const o = outE(env); if (o <= 0.003 || env.lt < 0) return;
    const fs = FS(env) * 0.72, font = (Pd.v | 0) % 2 ? monoF(env) : bodyF(env);
    const unit = String(cut.lineText || cut.text || '').replace(/\s+/g, ' ').trim() + '　／　';
    const per = textW(unit, font, fs, 0.18);
    if (per < 4) return;
    const rows = Pd.n >= 2 ? [m * 0.75, H - m * 0.75] : [Pd.low ? H - m * 0.75 : m * 0.75];
    rows.forEach((y, k) => {
      if (hitBB(0, y - fs, W, y + fs, bb, 6 * u)) return;
      const e = E.outExpo(clamp((env.lt - k * 0.1) / 0.8));
      const dir = k % 2 ? 1 : -1;
      const off = ((env.ltb * 26 * u * dir) % per + per) % per;
      const L = (W - m * 1.2) * e, x0 = (W - L) / 2;
      ctx.save(); ctx.beginPath(); ctx.rect(x0, y - fs, L, fs * 2); ctx.clip();
      env.draw({ text: unit.repeat(Math.min(30, Math.ceil(W * 1.2 / per) + 2)), font, size: fs, align: 'left', track: 0.18, x: x0 - per + off, y, color: sc.sub, alpha: 0.8 * o, ghost: false });
      ctx.restore();
      const ry = y + (k || Pd.low ? -1 : 1) * fs * 1.05;
      env.line([[x0, ry], [x0 + L, ry]], sc.sub, Math.max(1, 0.8 * u), 0.5 * o, false);
    });
  },
});

/* 級数見本 — the key glyph of the lyric set at five falling sizes on one baseline, each with its size, in a free corner */
reg('decor', 'tyTypeScale', {
  name: '級数見本', tags: ['editorial', 'graphic'], ae: 'indexNum', w: 0.8, layer: 'front',
  draw(env, bb0, Pd) {
    if (env.pass !== 'main') return;
    const bb = getBB(env, bb0), { sc } = env, u = U(env);
    const o = outE(env); if (o <= 0.003 || env.lt < 0) return;
    const ch = keyChar(env.cut.text); if (!ch) return;
    const S0 = Math.min(env.W, env.H) * 0.085, ks = [1, 0.72, 0.52, 0.37, 0.26];
    const font = (Pd.v | 0) % 2 ? (env.st.fonts.serif && env.st.fonts.serif[0]) || 'mincho' : env.st.fonts.display[0];
    const gapK = 0.18;
    let w = 0; ks.forEach(k => { w += S0 * k * (1 + gapK); });
    const fs = FS(env) * 0.7, h = S0 + fs * 2.2;
    const sp = cornerSpot(env, bb, w, h, Pd);
    if (!sp.ok) return;
    const yb = sp.y + S0 * 0.95;
    let x = sp.x;
    ks.forEach((k, i) => {
      const s = S0 * k, a = E.outCubic(clamp((env.lt - 0.1 - i * 0.07) / 0.3)) * o;
      if (a > 0) {
        env.draw({ text: ch, font, size: s, x: x + s / 2, y: yb - s * 0.46, color: i ? sc.sub : sc.fg, alpha: a, ghost: false });
        label(env, String(Math.round(s / u * 0.75)), x + s / 2, yb + fs * 1.1, { size: fs, align: 'center', alpha: a * 0.9, track: 0.05 });
      }
      x += s * (1 + gapK);
    });
    const e = inE(env, 0.6) * o;
    env.line([[sp.x, yb + fs * 0.25], [sp.x + (x - sp.x) * e, yb + fs * 0.25]], accentOf(sc), Math.max(1, u), 0.8 * o, false);
  },
});

/* 大きな約物 — huge dim 「 」 (or 『 』 / “ ”) glyphs set behind the lyric at its opposite corners */
reg('decor', 'tyBigPunct', {
  name: '大きな約物', tags: ['editorial', 'emotional', 'graphic'], ae: 'bracketsJP', w: 0.9, layer: 'front',
  draw(env, bb0, Pd) {
    if (env.pass !== 'main') return;
    const bb = getBB(env, bb0), { W, H, sc } = env;
    const o = outE(env); if (o <= 0.003 || env.lt < 0) return;
    const pairs = [['「', '」'], ['『', '』'], ['“', '”']];
    const [a0, a1] = pairs[(Pd.v | 0) % 3];
    const quote = (Pd.v | 0) % 3 === 2;
    const S = clamp(bh(bb) * (quote ? 1.6 : 2.1), Math.min(W, H) * 0.22, Math.min(W, H) * 0.55), gap = S * 0.04;
    const e = E.outCubic(clamp(env.lt / 0.7)), sl = (1 - e) * S * 0.25;
    const font = (env.st.fonts.serif && env.st.fonts.serif[0]) || 'mincho';
    const col = Pd.accent ? J.mix(sc.bg, sc.accent, 0.42) : J.mix(sc.bg, sc.fg, 0.2);
    // ink boxes: 「 sits in the upper right of its em box, 」 in the lower left, quotes high in the middle
    let xl, yt, xr, yb;
    if (!quote) { xl = bb.x0 - gap - 0.2 * S; yt = bb.y0 - gap + 0.4 * S; xr = bb.x1 + gap + 0.2 * S; yb = bb.y1 + gap - 0.4 * S; }
    else { xl = bb.x0 - gap - 0.22 * S; yt = bb.y0 + 0.42 * S; xr = bb.x1 + gap + 0.22 * S; yb = bb.y1 + 0.12 * S; }
    env.draw({ text: a0, font, size: S, x: xl - sl, y: yt - sl, color: col, alpha: e * o, ghost: false });
    env.draw({ text: a1, font, size: S, x: xr + sl, y: yb + sl, color: col, alpha: e * o, ghost: false });
  },
});

/* ================================================================== TREATMENTS */
const alive = (it, amin = 0.9) => it.fill !== false && (it.alpha ?? 1) >= amin && !!it.text && it.size > 1;
const addPost = (it, f) => { const p = it.post; it.post = p ? (e, i, b) => { p(e, i, b); f(e, i, b); } : f; };
const nonSp = it => [...String(it.text || '')].filter(c => !/\s/.test(c)).length;
/* per text line extents in item space (static layout) */
const lineSpans = (it) => {
  const lay = J.layoutText(it), sx = it.sx || 1, sy = it.sy || 1, map = new Map();
  for (const g of lay) {
    if (isSp(g.ch)) continue;
    if (it.charFn) { const c = it.charFn(g.i, g, lay.N); if (c && (c.hide || (c.a != null && c.a < 0.05))) continue; }
    const a0 = it.vertical ? (g.y - g.h / 2) * sy : (g.x - g.w / 2) * sx, a1 = it.vertical ? (g.y + g.h / 2) * sy : (g.x + g.w / 2) * sx;
    const L = map.get(g.li);
    if (!L) map.set(g.li, { li: g.li, a0, a1, c: it.vertical ? g.x * sx : g.y * sy });
    else { L.a0 = Math.min(L.a0, a0); L.a1 = Math.max(L.a1, a1); }
  }
  return [...map.values()];
};
const itemSpace = (env, it, fn) => {
  const ctx = env.ctx; ctx.save();
  if (it.clip) { ctx.beginPath(); ctx.rect(it.clip[0], -env.H, it.clip[1] - it.clip[0], env.H * 3); ctx.clip(); }
  if (it.clipY) { ctx.beginPath(); ctx.rect(-env.W, it.clipY[0], env.W * 3, it.clipY[1] - it.clipY[0]); ctx.clip(); }
  ctx.translate(it.x, it.y); if (it.rot) ctx.rotate(it.rot * DEG); if (it.skew) ctx.transform(1, 0, Math.tan(it.skew * DEG), 1, 0, 0);
  try { fn(); } finally { ctx.restore(); }
};

/* 一字抜き — the key glyph is set hollow (outline only) among solid glyphs, or the reverse */
reg('treat', 'tyHollowKey', {
  name: '一字抜き', tags: ['graphic', 'editorial', 'pop'], ae: 'spotChar', w: 0.9, safe: true,
  plan: rng => ({ rev: rng.chance(0.35) }),
  apply(env, it, Pt) {
    if (!alive(it, 0.5)) return;
    const lay = J.layoutText(it), plain = lay.filter(g => !isSp(g.ch));
    if (!plain.length) return;
    let ki = -1;
    if (plain.length === 1) {
      const kc = keyChar(env.cut.text);
      if (plain[0].ch !== kc) return;
      if (!Pt.rev) it.charFns.push(() => ({ outline: true }));
      return;
    }
    const kc = keyChar(it.text); const g = plain.find(q => q.ch === kc); ki = g ? g.i : plain[0].i;
    it.charFns.push((i) => ((i === ki) !== !!Pt.rev ? { outline: true } : null));
  },
});

/* 天地罫 — a heavy rule above and a hairline below every line (right / left of a vertical column) */
reg('treat', 'tyHeadRules', {
  name: '天地罫', tags: ['editorial', 'graphic', 'calm'], ae: 'underline', w: 0.8,
  plan: rng => ({ k: rng.range(0.06, 0.09), acc: rng.chance(0.5) }),
  apply(env, it, Pt) {
    if (!alive(it) || nonSp(it) < 2) return;
    const sc = env.sc, col = Pt.acc ? accentOf(sc) : (it.color || sc.fg);
    addPost(it, (e, i) => itemSpace(e, i, () => {
      const s = i.size, a = i.alpha ?? 1, o = E.inCubic(e.pOut), V = !!i.vertical, cross = s * (V ? (i.sx || 1) : (i.sy || 1));
      lineSpans(i).forEach((L, k) => {
        const q = E.outExpo(clamp((e.lt - (i.delay || 0) - 0.05 - k * 0.08) / 0.5));
        if (q <= 0 || o >= 1) return;
        const pad = s * 0.12, a0 = L.a0 - pad, a1 = L.a1 + pad, len = a1 - a0;
        const p0 = a0 + len * o, p1 = a0 + len * q;
        if (p1 - p0 < 1) return;
        const thick = Math.max(3, s * Pt.k), thin = Math.max(1, s * 0.018);
        const top = L.c + (V ? 1 : -1) * cross * 0.66, bot = L.c + (V ? -1 : 1) * cross * 0.66;
        const pt = (u, d) => (V ? [d, u] : [u, d]);
        e.line([pt(p0, top), pt(p1, top)], col, thick, a, false);
        e.line([pt(a1 - (p1 - a0), bot), pt(a1 - (p0 - a0), bot)], col, thin, a, false);
      });
    }));
  },
});

/* 頭字強調 — the first glyph of the line is set larger (baseline kept) in the accent colour, the rest make room */
reg('treat', 'tyHeadBig', {
  name: '頭字強調', tags: ['editorial', 'pop', 'emotional'], ae: 'sizeWave', w: 0.9,
  plan: rng => ({ k: rng.range(1.35, 1.6), acc: rng.chance(0.7) }),
  apply(env, it, Pt) {
    if (!alive(it) || nonSp(it) < 2) return;
    const lay = J.layoutText(it), g0 = lay.find(g => !isSp(g.ch) && !J.isPunct(g.ch));
    if (!g0) return;
    const k = Pt.k, V = !!it.vertical, sx = it.sx || 1, sy = it.sy || 1;
    const ac = Pt.acc && J.contrast(env.sc.accent, env.sc.bg) >= 1.8 ? env.sc.accent : null;
    const extra = (k - 1) * (V ? g0.h * sy : g0.w * sx);
    const center = it.align !== 'left' && it.align !== 'right';
    it.charFns.push((i, g) => {
      if (g.li !== g0.li) return null;
      const sh = center ? -extra / 2 : it.align === 'right' ? -extra : 0;
      if (i === g0.i) {
        const o = { s: k };
        if (V) { o.dy = sh + extra / 2; o.dx = 0; } else { o.dx = sh + extra / 2; o.dy = -(k - 1) * g.h * sy * 0.36; }
        if (ac) o.color = ac;
        return o;
      }
      if (g.ci < g0.ci) return V ? { dy: sh } : { dx: sh };
      return V ? { dy: sh + extra } : { dx: sh + extra };
    });
  },
});

/* 字番号 — a tiny superscript index number beside every glyph */
reg('treat', 'tyIndexSup', {
  name: '字番号', tags: ['editorial', 'graphic'], ae: 'emphasisDots', w: 0.7,
  plan: rng => ({ acc: rng.chance(0.6) }),
  apply(env, it, Pt) {
    if (!alive(it)) return;
    const sc = env.sc, col = Pt.acc ? accentOf(sc) : sc.sub;
    const single = nonSp(it) === 1, base = single ? Math.round(+it.mi || 0) : 0;
    addPost(it, (e, i) => {
      if (e.pass !== 'main') return;
      itemSpace(e, i, () => {
        const lay = J.layoutText(i), sx = i.sx || 1, sy = i.sy || 1, a = (i.alpha ?? 1) * clamp((e.lt - (i.delay || 0) - 0.15) / 0.3) * (1 - E.inCubic(e.pOut));
        if (a <= 0.01) return;
        const fs = Math.max(10, i.size * 0.26), mono = monoF(e);
        let n = base;
        for (const g of lay) {
          if (isSp(g.ch)) continue;
          n++;
          if (n > 40) break;
          const c = i.charFn ? i.charFn(g.i, g, lay.N) : null;
          if (c && c.hide) continue;
          const s = c && c.s != null ? c.s : 1;
          const x = g.x * sx + (c ? c.dx || 0 : 0), y = g.y * sy + (c ? c.dy || 0 : 0);
          const ox = i.vertical ? g.w * sx * 0.55 * s : g.w * sx * 0.52 * s, oy = i.vertical ? -g.h * sy * 0.3 * s : -g.h * sy * 0.42 * s;
          e.draw({ text: String(n), font: mono, size: fs, x: x + ox, y: y + oy, align: 'left', color: col, alpha: a * (c && c.a != null ? c.a : 1), ghost: false });
        }
      });
    });
  },
});

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

/* 罫線ワイプ — the frame is ruled into text lines; each line is "typed" across from the left, a cursor bar leading it */
trReg('tyRuleWipe', {
  name: '罫線ワイプ', tags: ['editorial', 'graphic', 'calm'], ae: 'blinds', w: 0.9, dur: 0.45,
  plan: rng => ({ n: rng.int(7, 12), rtl: rng.chance(0.25) }),
  draw(ctx, A, B, p, I, Pt) {
    const { cw, ch } = I, n = Pt.n || 9, bh = ch / n, ac = tAcc(I), lw = Math.max(1, Math.min(cw, ch) * 0.0015);
    ctx.drawImage(A, 0, 0);
    const st = 0.5 / n;
    for (let i = 0; i < n; i++) {
      const q = E.inOutCubic(clamp((p - i * st) / (1 - (n - 1) * st)));
      const y0 = Math.round(i * bh), y1 = Math.round((i + 1) * bh), x = cw * q;
      if (q > 0) { if (Pt.rtl) part(ctx, B, cw - x, y0, x, y1 - y0); else part(ctx, B, 0, y0, x, y1 - y0); }
      if (q > 0 && q < 1) {
        ctx.globalAlpha = 1; ctx.fillStyle = ac;
        const cwid = Math.max(3, bh * 0.14), xc = Pt.rtl ? cw - x - cwid : x;
        ctx.fillRect(xc, y0 + bh * 0.2, cwid, bh * 0.6);
      }
    }
    // ruled lines between the bands, fading in and out
    ctx.globalAlpha = 0.6 * bell(p); ctx.fillStyle = ac;
    for (let i = 1; i < n; i++) ctx.fillRect(0, Math.round(i * bh) - lw / 2, cw, lw);
    ctx.globalAlpha = 1;
  } });

/* 升目送り — a manuscript grid; the new cut fills in cell by cell in vertical reading order (columns right to left) */
trReg('tyGridCells', {
  name: '升目送り', tags: ['editorial', 'graphic'], ae: 'checker', w: 0.8, dur: 0.5,
  plan: rng => ({ rows: rng.int(4, 6), tate: rng.chance(0.7) }),
  draw(ctx, A, B, p, I, Pt) {
    const { cw, ch } = I, rows = Pt.rows || 5, cell = ch / rows, cols = Math.ceil(cw / cell), ox = (cw - cols * cell) / 2;
    const N = rows * cols, ac = tAcc(I), lw = Math.max(1, Math.min(cw, ch) * 0.0016);
    ctx.drawImage(A, 0, 0);
    const k = E.inOutCubic(clamp(p / 0.92)) * N;
    for (let j = 0; j < N; j++) {
      let c, r;
      if (Pt.tate) { c = cols - 1 - Math.floor(j / rows); r = j % rows; } else { r = Math.floor(j / cols); c = j % cols; }
      const x = ox + c * cell, y = r * cell;
      if (j < Math.floor(k)) part(ctx, B, x, y, cell + 1, cell + 1);
      else if (j === Math.floor(k)) { const f = k - j; ctx.save(); ctx.globalAlpha = f; part(ctx, B, x, y, cell + 1, cell + 1); ctx.restore(); ctx.globalAlpha = 1; ctx.strokeStyle = ac; ctx.lineWidth = lw * 3; ctx.strokeRect(x + lw * 1.5, y + lw * 1.5, cell - lw * 3, cell - lw * 3); }
    }
    ctx.globalAlpha = 0.5 * bell(p); ctx.fillStyle = ac;
    for (let c = 0; c <= cols; c++) ctx.fillRect(Math.round(ox + c * cell) - lw / 2, 0, lw, ch);
    for (let r = 1; r < rows; r++) ctx.fillRect(0, Math.round(r * cell) - lw / 2, cw, lw);
    ctx.globalAlpha = 1;
  } });

})();
