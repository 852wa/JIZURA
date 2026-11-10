/* JIZURA pack: x2treat — 40 text treatments (fills, outlines, depth, plates & marks, per-glyph alternation, print looks) */
(() => {
'use strict';
const E = J.E;
const P = 'x2treat';
const reg = (k, d) => J.register('treat', k, d, P);
const DEG = J.DEG, TAU = J.TAU, clamp = J.clamp;

/* ================= colour helpers ================= */
const ctr = (a, b) => J.contrast(a, b);
const isDark = c => J.lum(c) < 0.45;
const firstOK = (list, test, fb) => { for (const c of list) if (c && test(c)) return c; return fb; };
const best = (list, against) => { let b = list[0], bv = -1; for (const c of list) { if (!c) continue; const v = ctr(c, against); if (v > bv) { bv = v; b = c; } } return b; };
// an accent that differs from colour `col` and still reads on the scheme background
const accentFor = (sc, col, min = 1.6) => firstOK([sc.accent, sc.accent2, sc.ghostA, sc.ghostB], c => ctr(c, col) >= min && ctr(c, sc.bg) >= 1.5, J.fitContrast(sc.accent, col, min + 0.3));
// second fill colour for two-tone glyphs
const twoTone = (sc, col) => firstOK([sc.accent, sc.accent2, sc.ghostA, sc.ghostB], c => ctr(c, col) >= 1.5 && ctr(c, sc.bg) >= 2, J.mix(col, sc.bg, 0.45));
// text colour for glyphs sitting on `box`
const textOn = (box, pref, sc) => (ctr(pref, box) >= 3 ? pref : best([sc.bg, sc.fg, sc.ink, '#111111', '#FFFFFF'], box));
// a colour that stands out from the scheme background (for marks drawn next to the text)
const markCol = (sc, col) => firstOK([sc.accent, sc.accent2, col], c => ctr(c, sc.bg) >= 2, col);
// a quiet shadow tone on the scheme background
const shadeCol = (sc, col) => (isDark(sc.bg) ? J.mix(sc.bg, accentFor(sc, col, 1.5), 0.5) : J.mix(sc.bg, sc.fg, 0.32));
const TR = 'rgba(0,0,0,0)';
// text coloured like the background sits on a layout's own plate: colour marks / recolouring would vanish into it
const onPlate = (sc, col) => ctr(col, sc.bg) < 1.5;

/* ================= item helpers ================= */
const alive = (it, amin = 0.9) => it.fill !== false && (it.alpha ?? 1) >= amin && !!it.text && it.size > 1;
const colOf = (env, it) => it.color || env.sc.fg;
const addPre = (it, f) => { const p = it.pre; it.pre = p ? (e, i) => { p(e, i); f(e, i); } : f; };
const addPost = (it, f) => { const p = it.post; it.post = p ? (e, i, b) => { p(e, i, b); f(e, i, b); } : f; };
// size-dependent fields: set now and refresh right before drawing (after enter / hold / exit changed the size)
const sized = (it, env, f) => { f(it, env); addPre(it, (e, i) => f(i, e)); };
const inP = (env, it, d, len) => clamp((env.lt - (it.delay || 0) - d) / len);
const outK = e => 1 - E.inCubic(e.pOut);
const isSp = ch => ch === ' ' || ch === '　';
const glyphN = t => [...String(t || '')].filter(c => c.trim()).length;
// a whole line / block (not one glyph of a scattered lyric): marks drawn around the item make sense
const lineLike = (env, it) => glyphN(it.text) >= 2 || glyphN(env.cut.text) <= 1;
// running glyph index for alternation: within the item, or by motion index for one-glyph items
const altIx = (it) => { const one = glyphN(it.text) < 2, off = it.mi | 0; return (gi, g) => (one ? off : g.ci + g.li); };
// true while a piece-based entrance / exit is moving (gradient / no-fill / copies would fight its pieces)
const inPieces = (env, it) => {
  const c = env.cut, en = J.ENTER[it.enter || c.enter], ex = J.EXIT[it.exit || c.exit];
  if (en && en.pieces && env.lt - (it.delay || 0) < c.inDur * 1.3 + 0.05) return true;
  if (ex && ex.pieces && c.outDur > 0 && env.lt > c.dur - c.outDur - 0.3) return true;
  return false;
};
// seconds a plate has to wait for a piece-based entrance to land (0 for ordinary entrances)
const pieceLag = (env, it) => { const c = env.cut, en = J.ENTER[it.enter || c.enter]; return en && en.pieces ? c.inDur * 1.3 + 0.05 : 0; };
// is the item mid "dash" draw-on (stroke tracing) — copies built from fills would give it away
const tracing = i => i.dash != null && i.dash < 1;
/* run fn() under the same clip / bands / blur as J.drawFx applies to the text; local=true also moves into item space */
const withFx = (env, it, fn, local = true) => {
  const ctx = env.ctx, W = env.W, H = env.H;
  ctx.save();
  if (it.blur > 0.4 && env.allowFilter) ctx.filter = `blur(${(it.blur * env.scale).toFixed(1)}px)`;
  if (it.clip) { ctx.beginPath(); ctx.rect(it.clip[0], -H, it.clip[1] - it.clip[0], H * 3); ctx.clip(); }
  if (it.clipY) { ctx.beginPath(); ctx.rect(-W, it.clipY[0], W * 3, it.clipY[1] - it.clipY[0]); ctx.clip(); }
  if (it.clipFn) { ctx.beginPath(); it.clipFn(ctx, env, it); ctx.clip(); }
  const run = () => {
    if (!local) { fn(); return; }
    ctx.save(); ctx.translate(it.x, it.y);
    if (it.rot) ctx.rotate(it.rot * DEG);
    if (it.skew) ctx.transform(1, 0, Math.tan(it.skew * DEG), 1, 0, 0);
    fn(); ctx.restore();
  };
  try {
    if (it.vbands && it.vbands.length) {
      for (const [x0, x1, dy] of it.vbands) { ctx.save(); ctx.beginPath(); ctx.rect(x0, -H * 2, x1 - x0, H * 5); ctx.clip(); ctx.translate(0, dy); run(); ctx.restore(); }
    } else if (it.bands && it.bands.length) {
      for (const [y0, y1, dx] of it.bands) { ctx.save(); ctx.beginPath(); ctx.rect(-W * 2, y0, W * 5, y1 - y0); ctx.clip(); ctx.translate(dx, 0); run(); ctx.restore(); }
      const lo = it.bands[0][0], hi = it.bands[it.bands.length - 1][1];
      ctx.save(); ctx.beginPath(); ctx.rect(-W * 2, -H * 3, W * 5, lo + H * 3); ctx.rect(-W * 2, hi, W * 5, H * 4); ctx.clip(); run(); ctx.restore();
    } else run();
  } finally { ctx.restore(); }
};
// per text line (vertical: per column) extents in item space from the static layout; glyphs hidden by charFn are left out
const lineSpans = (it) => {
  const lay = J.layoutText(it), sx = it.sx || 1, sy = it.sy || 1, map = new Map();
  for (const g of lay) {
    if (isSp(g.ch)) continue;
    if (it.charFn) { const c = it.charFn(g.i, g, lay.N); if (c && (c.hide || (c.a != null && c.a < 0.05))) continue; }
    const a0 = it.vertical ? (g.y - g.h / 2) * sy : (g.x - g.w / 2) * sx, a1 = it.vertical ? (g.y + g.h / 2) * sy : (g.x + g.w / 2) * sx;
    const L = map.get(g.li);
    if (!L) map.set(g.li, { li: g.li, a0, a1, c: it.vertical ? g.x * sx : g.y * sy, n: 1 });
    else { L.a0 = Math.min(L.a0, a0); L.a1 = Math.max(L.a1, a1); L.n++; }
  }
  return [...map.values()].sort((a, b) => a.li - b.li);
};
// visible glyphs in item space, following the per-glyph motion (dx/dy/scale/rotation) of enter / hold / exit
const glyphList = (it) => {
  const lay = J.layoutText(it), sx = it.sx || 1, sy = it.sy || 1, out = [];
  for (const g of lay) {
    if (isSp(g.ch)) continue;
    const c = it.charFn ? it.charFn(g.i, g, lay.N) : null;
    if (c && c.hide) continue;
    out.push({ g, x: g.x * sx + g.vx * sx + ((c && c.dx) || 0), y: g.y * sy + g.vy * sy + ((c && c.dy) || 0), y0: g.y * sy + g.vy * sy, w: g.w * sx, h: g.h * sy,
      s: c && c.s != null ? c.s : 1, rot: (c && c.rot) || 0, a: c && c.a != null ? c.a : 1 });
  }
  return out;
};
// a plain copy of an item for extra passes (shadows, rims…): no hooks, no effects of its own
const bare = (i, extra) => Object.assign({}, i, { pre: null, post: null, echo: null, streak: null, shadow: null, extrude: null, pattern: null, patternBg: null, gradient: null,
  pieceFn: null, strokeDash: null, strokeUnder: false, wipeBar: null, cursorAt: null, bands: null, vbands: null, clip: null, clipY: null, clipFn: null, blend: null, _lay: null }, extra || {});
// box of the laid-out text in item space (centre + half extents)
const itemBox = (i) => {
  const m = J.measure(i); let cx = 0, cy = 0;
  if (i.vertical) { if (i.align === 'left') cy = m.h / 2; }
  else if (i.align === 'left') cx = m.w / 2; else if (i.align === 'right') cx = -m.w / 2;
  return { cx, cy, hw: m.w / 2, hh: m.h / 2 };
};
// an item-space offset turned into design space (item rotation)
const rotOff = (i, dx, dy) => { if (!i.rot) return [dx, dy]; const a = i.rot * DEG, c = Math.cos(a), s = Math.sin(a); return [dx * c - dy * s, dx * s + dy * c]; };
// (u along the line, v across it) → item-space point
const uv = (V, u, v) => (V ? [v, u] : [u, v]);

/* ================================================================
   FILLS
   ================================================================ */

/* 横流し色 — the colour runs from the text colour to an accent glyph by glyph along the line (or peaks in the middle) */
reg('xoRampAcross', { name: '横流し色', en: 'Colour Ramp', tags: ['pop', 'emotional', 'graphic'], w: 1, ae: 'gradientV',
  plan: rng => ({ v: rng.pick(['ramp', 'ramp', 'mid']), rev: rng.chance(0.4) }),
  apply(env, it, Pt) {
    if (!alive(it)) return;
    const sc = env.sc, col = colOf(env, it);
    if (onPlate(sc, col)) return;
    const c2 = twoTone(sc, col), n = glyphN(it.text), whole = glyphN(env.cut.text), mi = it.mi;
    let uOf;
    if (n >= 2) uOf = g => (g.n > 1 ? g.ci / (g.n - 1) : 0.5);
    else if (whole >= 2 && mi != null && mi === Math.round(mi) && mi < whole) { const u = mi / (whole - 1); uOf = () => u; }
    else return;
    it.charFns.push((gi, g) => {
      let u = uOf(g); if (Pt.rev) u = 1 - u;
      const f = Pt.v === 'mid' ? 1 - Math.abs(u * 2 - 1) : u;
      return f <= 0.01 ? null : { color: J.mix(col, c2, f) };
    });
  } });

/* 中帯色 — a belt of accent colour runs through the waist of every glyph, set off by two hairline gaps */
reg('xoBeltBand', { name: '中帯色', en: 'Belt Band', tags: ['pop', 'graphic'], w: 0.9, ae: 'splitColor',
  plan: rng => ({ at: rng.range(0.36, 0.43), h: rng.range(0.2, 0.26) }),
  apply(env, it, Pt) {
    if (!alive(it) || inPieces(env, it)) return;
    const sc = env.sc, col = colOf(env, it), c2 = twoTone(sc, col), a = Pt.at, b = Pt.at + Pt.h, g = onPlate(sc, col) ? 0 : 0.02, gc = sc.bg;
    it.gradient = [[0, col], [a, col], [a, gc], [a + g, gc], [a + g, c2], [b - g, c2], [b - g, gc], [b, gc], [b, col], [1, col]];
  } });

/* 折り目 — every glyph is split down the middle: one half in a shaded tone (like folded paper) or an accent */
reg('xoFoldHalf', { name: '折り目', en: 'Folded Halves', tags: ['graphic', 'pop', 'editorial'], w: 0.9, ae: 'splitColor',
  plan: rng => ({ v: rng.pick(['tone', 'tone', 'acc']), at: rng.range(-0.04, 0.04) }),
  apply(env, it, Pt) {
    if (!alive(it) || inPieces(env, it)) return;
    const sc = env.sc, col = colOf(env, it);
    let c2 = Pt.v === 'acc' ? twoTone(sc, col) : (J.lum(col) < 0.5 ? J.mix(col, '#FFFFFF', 0.42) : J.mix(col, '#000000', 0.36));
    if (ctr(c2, sc.bg) < 1.6 || ctr(c2, col) < 1.25) c2 = J.mix(col, sc.bg, 0.5);
    const fnA = () => ({ clipX: [-0.8, Pt.at] });
    it.charFns.push(fnA);
    addPre(it, (e, i) => {                       // the full glyph in the second colour lies under the clipped half
      if (tracing(i)) return;
      const rest = i.charFns.filter(f => f !== fnA);
      withFx(e, i, () => J.drawItem(e, bare(i, { color: c2, strokeColor: c2, charFn: J.combineChar(rest) })), false);
    });
  } });

/* 斜め二色 — one slanted edge crosses the whole lyric; everything past it is printed in the second colour */
reg('xoDiagSplit', { name: '斜め二色', en: 'Diagonal Split', tags: ['graphic', 'pop', 'glitch'], w: 1, ae: 'splitColor',
  plan: rng => ({ ang: rng.pick([24, 32, 40, 148, 156]), at: rng.range(-0.12, 0.12) }),
  apply(env, it, Pt) {
    if (!alive(it)) return;
    const sc = env.sc, col = colOf(env, it);
    if (onPlate(sc, col)) return;
    const c2 = twoTone(sc, col);
    addPost(it, (e, i) => {
      if (e.pass !== 'main' || tracing(i) || inPieces(e, i)) return;
      const q = E.outCubic(inP(e, i, e.cut.inDur * 0.3, 0.5)) * outK(e);
      if (q <= 0.01) return;
      const B = itemBox(i), R = Math.hypot(B.hw, B.hh) + i.size, a = Pt.ang * DEG, nx = Math.cos(a), ny = Math.sin(a);
      const off = R * (1 - q) + Pt.at * (i.vertical ? B.hh : B.hw) * 2;
      withFx(e, i, () => {
        const ctx = e.ctx, px = B.cx + nx * off, py = B.cy + ny * off, tx = -ny, ty = nx, Lg = R * 4;
        ctx.save(); ctx.beginPath();
        ctx.moveTo(px + tx * Lg, py + ty * Lg); ctx.lineTo(px - tx * Lg, py - ty * Lg);
        ctx.lineTo(px - tx * Lg + nx * Lg, py - ty * Lg + ny * Lg); ctx.lineTo(px + tx * Lg + nx * Lg, py + ty * Lg + ny * Lg);
        ctx.closePath(); ctx.clip();
        J.drawItem(e, bare(i, { x: 0, y: 0, rot: 0, skew: 0, blur: 0, color: c2, strokeColor: c2 }));
        ctx.restore();
      });
    });
  } });

/* 方眼塗り — graph-paper fill: a fine grid in the text colour over a pale tone, held by a keyline */
reg('xoGraphFill', { name: '方眼塗り', en: 'Graph Fill', tags: ['graphic', 'editorial', 'pop'], w: 0.6, ae: 'hatch',
  plan: rng => ({ v: rng.pick(['tone', 'tone', 'duo']) }),
  apply(env, it, Pt) {
    if (!alive(it)) return;
    const sc = env.sc, col = colOf(env, it);
    it.pattern = 'grid'; it.patternColor = col;
    it.patternBg = Pt.v === 'duo' ? accentFor(sc, col, 1.6) : J.mix(col, sc.bg, 0.7);
    it.strokeColor = col;
    sized(it, env, i => { i.stroke = Math.max(1.3, i.size * 0.022); });
  } });

/* 裾ぼかし — the glyphs dissolve toward their feet (or their heads) into nothing */
reg('xoFadeHem', { name: '裾ぼかし', en: 'Faded Hem', tags: ['emotional', 'calm', 'editorial'], w: 0.8, safe: true, ae: 'gradientV',
  plan: rng => ({ up: rng.chance(0.3), k: rng.range(0.34, 0.46), lo: rng.range(0.06, 0.14) }),
  apply(env, it, Pt) {
    if (!alive(it) || inPieces(env, it)) return;
    const col = colOf(env, it), end = J.rgba(col, Pt.lo);
    it.gradient = Pt.up ? [[0.08, end], [1 - Pt.k, col], [1, col]] : [[0, col], [Pt.k, col], [0.92, end]];
    // the chromatic ghost passes are solid: keep them to the part that stays opaque
    if (env.pass !== 'main') { const cl = Pt.up ? [0.5 - Pt.k, 0.8] : [-0.8, Pt.k - 0.5]; it.charFns.push(() => ({ clipY: cl })); }
  } });

/* 半分網点 — the top of every glyph is solid ink, the lower part is screened into dots */
reg('xoHalfScreen', { name: '半分網点', en: 'Half Screen', tags: ['pop', 'graphic', 'editorial'], w: 0.8, ae: 'halftone',
  plan: rng => ({ at: rng.range(-0.02, 0.09), pat: rng.pick(['dots', 'dots', 'lines']) }),
  apply(env, it, Pt) {
    if (!alive(it) || inPieces(env, it)) return;
    const col = colOf(env, it);
    const fnA = () => ({ clipY: [-0.8, Pt.at] });
    it.charFns.push(fnA);
    addPre(it, (e, i) => {
      if (e.pass !== 'main' || tracing(i)) return;
      const rest = i.charFns.filter(f => f !== fnA), s = i.size;
      withFx(e, i, () => J.drawItem(e, bare(i, { pattern: Pt.pat, patternColor: col, patternBg: null, stroke: Math.max(1.2, s * 0.016), strokeColor: col, charFn: J.combineChar(rest) })), false);
    });
  } });

/* ボーダー柄 — broad horizontal bands of two colours, like a striped shirt */
reg('xoBorderBands', { name: 'ボーダー柄', en: 'Border Stripes', tags: ['pop', 'graphic'], w: 0.7, ae: 'stripes',
  plan: rng => ({ n: rng.pick([5, 5, 6, 7]), first: rng.chance(0.5) }),
  apply(env, it, Pt) {
    if (!alive(it) || inPieces(env, it)) return;
    const sc = env.sc, col = colOf(env, it), c2 = twoTone(sc, col), g = [], n = Pt.n, lo = 0.07, span = 0.86;
    for (let k = 0; k < n; k++) { const c = (k % 2 === 0) === !!Pt.first ? col : c2; g.push([clamp(lo + span * k / n), c], [clamp(lo + span * (k + 1) / n), c]); }
    it.gradient = g;
  } });

/* ================================================================
   OUTLINES
   ================================================================ */

/* 等高線 — hollow glyphs drawn as three concentric contour lines */
reg('xoContour', { name: '等高線', en: 'Contour Lines', tags: ['graphic', 'editorial', 'calm', 'glitch'], w: 0.7, ae: 'doubleOutline',
  plan: rng => ({ u: rng.range(0.016, 0.02), c: rng.chance(0.4) }),
  apply(env, it, Pt) {
    if (!alive(it, 0.5) || inPieces(env, it)) return;
    const sc = env.sc, col = colOf(env, it), outer = Pt.c ? accentFor(sc, col, 1.4) : col;
    const unit = i => Math.max(1.3, i.size * Pt.u);
    it.fill = false; it.strokeColor = col;
    sized(it, env, i => { i.stroke = unit(i) * 1.15; });
    addPre(it, (e, i) => {
      if (e.pass !== 'main' || tracing(i)) return;
      const u = unit(i), cp = (w, c) => bare(i, { fill: false, stroke: u * w, strokeColor: c });
      const small = i.size < Math.min(e.W, e.H) * 0.085;          // small type: two lines only, or it clogs
      withFx(e, i, () => { if (!small) { J.drawItem(e, cp(9, outer)); J.drawItem(e, cp(7, sc.bg)); } J.drawItem(e, cp(5, small ? outer : col)); J.drawItem(e, cp(3, sc.bg)); }, false);
    });
  } });

/* 切り取り線 — solid glyphs with a dashed coupon line running around them at a distance */
reg('xoCutLine', { name: '切り取り線', en: 'Cut Line', tags: ['pop', 'graphic', 'editorial'], w: 0.8, ae: 'dotted',
  plan: rng => ({ d: rng.range(0.15, 0.19), c: rng.int(0, 1) }),
  apply(env, it, Pt) {
    if (!alive(it)) return;
    const sc = env.sc, col = colOf(env, it);
    if (onPlate(sc, col)) return;
    const rc = Pt.c ? markCol(sc, col) : accentFor(sc, col, 1.3);
    addPre(it, (e, i) => {
      if (e.pass !== 'main' || tracing(i) || inPieces(e, i)) return;
      const s = i.size, q = E.outCubic(inP(e, i, 0.05, 0.4)) * outK(e);
      if (q <= 0.02) return;
      const d = s * Pt.d * (0.55 + 0.45 * q), lw = Math.max(1.6, s * 0.022);
      withFx(e, i, () => {
        J.drawItem(e, bare(i, { fill: false, stroke: d + lw * 2, strokeColor: rc, strokeDash: [s * 0.085, s * 0.065], alpha: (i.alpha ?? 1) * q }));
        J.drawItem(e, bare(i, { fill: false, stroke: d, strokeColor: sc.bg }));
      }, false);
    });
  } });

/* 交互袋 — solid and hollow glyphs take turns (or: kana hollow, kanji solid) */
reg('xoAltHollow', { name: '交互袋', en: 'Alternating Hollow', tags: ['graphic', 'pop', 'editorial'], w: 1, safe: true, ae: 'outline',
  plan: rng => ({ v: rng.pick(['alt', 'alt', 'kana']), first: rng.chance(0.5) }),
  apply(env, it, Pt) {
    if (!alive(it, 0.5) || inPieces(env, it)) return;
    const chars = [...it.text].filter(c => c.trim());
    const isK = c => J.isKanji(c) || J.isKata(c) || J.isLatin(c);
    it.strokeColor = colOf(env, it);
    sized(it, env, i => { i.stroke = Math.max(1.3, i.size * 0.024); });
    if (Pt.v === 'kana' && chars.some(isK) && chars.some(c => !isK(c) && !J.isPunct(c))) it.charFns.push((gi, g) => (isK(g.ch) || J.isPunct(g.ch) ? null : { outline: true }));
    else { const ix = altIx(it), o = Pt.first ? 0 : 1; it.charFns.push((gi, g) => ((ix(gi, g) + o) % 2 ? { outline: true } : null)); }
  } });

/* 二重線字 — no fill at all: two hairline outlines in two colours, knocked apart */
reg('xoTwinOutline', { name: '二重線字', en: 'Twin Outline', tags: ['graphic', 'glitch', 'editorial'], w: 0.7, ae: 'outline',
  plan: rng => ({ d: rng.range(0.045, 0.065), dir: rng.pick([[1, 1], [1, 1], [-1, 1], [1, 0], [0.5, -1]]), k: rng.range(0.024, 0.03) }),
  apply(env, it, Pt) {
    if (!alive(it, 0.5) || inPieces(env, it)) return;
    const sc = env.sc, col = colOf(env, it), c2 = accentFor(sc, col, 1.3);
    it.fill = false; it.strokeColor = col;
    sized(it, env, i => { i.stroke = Math.max(1.5, i.size * Pt.k); });
    addPre(it, (e, i) => {
      if (e.pass !== 'main' || tracing(i)) return;
      const d = i.size * Pt.d * E.outCubic(inP(e, i, 0.02, 0.4)) * outK(e), o = rotOff(i, Pt.dir[0] * d, Pt.dir[1] * d);
      withFx(e, i, () => J.drawItem(e, bare(i, { fill: false, x: i.x + o[0], y: i.y + o[1], stroke: Math.max(1.5, i.size * Pt.k), strokeColor: c2 })), false);
    });
  } });

/* 塊抜き — a fat rounded rim fuses the line into one blob of text colour; the glyphs are knocked out of it */
reg('xoBlobKnock', { name: '塊抜き', en: 'Blob Knockout', tags: ['pop', 'graphic'], w: 0.8, ae: 'sticker',
  plan: rng => ({ k: rng.range(0.26, 0.34) }),
  apply(env, it, Pt) {
    if (!alive(it, 0.9) || inPieces(env, it)) return;
    const sc = env.sc, col = colOf(env, it);
    if (onPlate(sc, col)) return;
    const tc = textOn(col, sc.bg, sc), lag = pieceLag(env, it);
    const grow = lag ? E.outCubic(inP(env, it, lag, 0.22)) : 1;         // after a piece entrance the rim swells in
    const fnC = () => (tracing(it) || grow < 0.5 ? null : { color: tc });
    it.charFns.push(fnC);
    addPre(it, (e, i) => {
      if (tracing(i) || grow <= 0.01) return;
      const rest = i.charFns.filter(f => f !== fnC), s = i.size;
      withFx(e, i, () => J.drawItem(e, bare(i, { fill: false, stroke: s * Pt.k * grow, strokeColor: col, charFn: J.combineChar(rest) })), false);
    });
  } });

/* ================================================================
   DEPTH
   ================================================================ */

/* 浮き彫り — a light edge on one side and a dark edge on the other make the glyphs stand out like a relief */
reg('xoEmboss', { name: '浮き彫り', en: 'Emboss', tags: ['calm', 'editorial', 'graphic', 'emotional'], w: 0.8, ae: 'hardShadow',
  plan: rng => ({ d: rng.range(0.028, 0.038), flip: rng.chance(0.25) }),
  apply(env, it, Pt) {
    if (!alive(it)) return;
    const sc = env.sc, col = colOf(env, it);
    let hi = J.mix(col, '#FFFFFF', 0.7), lo = J.mix(col, '#000000', 0.62);
    if (ctr(hi, col) < 1.3) hi = accentFor(sc, col, 1.3);
    if (ctr(lo, col) < 1.3) lo = accentFor(sc, col, 1.3);
    if (ctr(lo, sc.bg) < 1.15) lo = J.mix(sc.bg, sc.fg, 0.35);
    if (ctr(hi, sc.bg) < 1.15) hi = J.mix(sc.bg, sc.fg, 0.3);
    addPre(it, (e, i) => {
      if (e.pass !== 'main' || tracing(i) || inPieces(e, i)) return;
      const d = i.size * Pt.d * (Pt.flip ? -1 : 1), a = rotOff(i, -d, -d), b = rotOff(i, d, d);
      withFx(e, i, () => {
        J.drawItem(e, bare(i, { x: i.x + b[0], y: i.y + b[1], color: lo, strokeColor: lo }));
        J.drawItem(e, bare(i, { x: i.x + a[0], y: i.y + a[1], color: hi, strokeColor: hi }));
      }, false);
    });
  } });

/* 縞立体 — the extruded side is built from three bands of alternating colour */
reg('xoBandExtrude', { name: '縞立体', en: 'Banded Extrude', tags: ['pop', 'graphic'], w: 0.8, ae: 'extrude',
  plan: rng => ({ d: rng.range(0.15, 0.2), dir: rng.pick([[1, 1], [1, 1], [-1, 1], [1, 0.5]]) }),
  apply(env, it, Pt) {
    if (!alive(it)) return;
    const sc = env.sc, col = colOf(env, it), N = glyphN(it.text);
    const A = accentFor(sc, col, 1.6);
    const B = firstOK([sc.accent2, sc.ink, sc.ghostB, sc.fg, sc.sub], c => ctr(c, A) >= 1.4 && ctr(c, col) >= 1.3 && ctr(c, sc.bg) >= 1.3, J.mix(A, isDark(A) ? '#FFFFFF' : '#000000', 0.45));
    const seg = i => { const L = i.size * Pt.d / 3; return { n: clamp(Math.round(L / 2.5), 2, N > 10 ? 4 : 7), dx: Pt.dir[0] * L, dy: Pt.dir[1] * L }; };
    sized(it, env, i => { i.extrude = Object.assign(seg(i), { color: A }); });
    addPre(it, (e, i) => {
      if (e.pass !== 'main' || tracing(i) || inPieces(e, i)) return;
      const S = seg(i);
      withFx(e, i, () => {
        for (let k = 2; k >= 1; k--) {
          const c = k === 1 ? B : A, o = rotOff(i, S.dx * k, S.dy * k);
          J.drawItem(e, bare(i, { x: i.x + o[0], y: i.y + o[1], color: c, stroke: 0, extrude: Object.assign({}, S, { color: c }) }));
        }
      }, false);
    });
  } });

/* 床影 — the glyphs stand on a floor and throw a slanted, fading shadow toward the viewer */
reg('xoFloorShadow', { name: '床影', en: 'Floor Shadow', tags: ['emotional', 'calm', 'editorial', 'graphic'], w: 0.7, ae: 'longShadow',
  plan: rng => ({ k: rng.range(0.42, 0.56), sk: rng.range(0.55, 0.9) * (rng.chance(0.5) ? 1 : -1), a: rng.range(0.7, 0.9) }),
  apply(env, it, Pt) {
    if (!alive(it, 0.9)) return;
    const sc = env.sc, col = colOf(env, it), sh = shadeCol(sc, col);
    addPre(it, (e, i) => {
      if (e.pass !== 'main' || tracing(i) || inPieces(e, i)) return;
      const q = E.outCubic(inP(e, i, 0.04, 0.45)) * outK(e);
      if (q <= 0.01) return;
      const m = J.measure(i), s = i.size, sy = i.sy || 1, k = Pt.k * q;
      const yb = (i.vertical && i.align === 'left' ? m.h : m.h / 2) - s * sy * 0.075, cf = i.charFn;
      const c = bare(i, { x: 0, y: 0, rot: 0, skew: 0, blur: 0, stroke: 0, alpha: (i.alpha ?? 1) * Pt.a * q,
        gradient: [[0.05, J.rgba(sh, 0)], [0.45, J.rgba(sh, 0.4)], [1, J.rgba(sh, 1)]],
        charFn: cf ? (gi, g, n) => { const r = cf(gi, g, n); return r ? Object.assign({}, r, { color: null }) : r; } : null });
      withFx(e, i, () => {
        const ctx = e.ctx;
        ctx.save(); ctx.beginPath(); ctx.rect(-e.W * 3, yb, e.W * 6, s * sy * Math.max(0.05, k) * 1.05); ctx.clip();
        ctx.translate(0, yb); ctx.transform(1, 0, Pt.sk, 1, 0, 0); ctx.scale(1, -Math.max(0.02, k)); ctx.translate(0, -yb);
        J.drawItem(e, c);
        ctx.restore();
      });
    });
  } });

/* 接地影 — a small oval contact shadow under every glyph; it shrinks when the glyph leaves the ground */
reg('xoGroundDots', { name: '接地影', en: 'Ground Shadows', tags: ['pop', 'calm', 'emotional'], w: 0.8, ae: 'softShadow',
  plan: rng => ({ w: rng.range(0.4, 0.48), h: rng.range(0.05, 0.065) }),
  apply(env, it, Pt) {
    if (!alive(it, 0.9)) return;
    const sc = env.sc, col = colOf(env, it), sh = shadeCol(sc, col);
    addPre(it, (e, i) => {
      if (e.pass !== 'main') return;
      const q = E.outCubic(inP(e, i, 0.02, 0.3)) * outK(e);
      if (q <= 0.01) return;
      withFx(e, i, () => {
        const ctx = e.ctx, s = i.size, sx = i.sx || 1, sy = i.sy || 1, a = (i.alpha ?? 1) * q, Gs = glyphList(i);
        ctx.fillStyle = sh;
        for (let k = 0; k < Gs.length; k++) {
          const G = Gs[k];
          if (J.isPunct(G.g.ch)) continue;
          if (i.vertical) { const nx = Gs[k + 1]; if (nx && nx.g.li === G.g.li) continue; }       // a column stands on its last glyph
          const lift = clamp(Math.max(0, G.y0 - G.y) / (s * sy * 0.9)), f = (1 - 0.55 * lift) * (0.5 + 0.5 * Math.min(1, Math.abs(G.s)));
          const rx = Math.max(G.w, s * sx * 0.5) * Pt.w * f, ry = s * Math.min(sx, sy) * Pt.h * f;
          ctx.globalAlpha = a * G.a * (0.85 - 0.45 * lift);
          ctx.beginPath(); ctx.ellipse(G.x, G.y0 + G.h * 0.5 + ry * 0.9, rx, ry, 0, 0, TAU); ctx.fill();
        }
        ctx.globalAlpha = 1;
      });
    });
  } });

/* 白抜き立体 — sign-painter block: the face is left in the paper colour with a keyline, the solid side carries the colour */
reg('xoHollowBlock', { name: '白抜き立体', en: 'Hollow Block', tags: ['pop', 'graphic', 'editorial'], w: 0.9, ae: 'extrude',
  plan: rng => ({ d: rng.range(0.09, 0.13), dir: rng.pick([[1, 1], [1, 1], [-1, 1], [1, 0.5]]), k: rng.range(0.026, 0.034) }),
  apply(env, it, Pt) {
    if (!alive(it) || inPieces(env, it)) return;
    const sc = env.sc, col = colOf(env, it), N = glyphN(it.text);
    if (onPlate(sc, col)) return;
    it.gradient = [sc.bg, sc.bg]; it.strokeColor = col;
    sized(it, env, i => {
      const L = i.size * Pt.d;
      i.stroke = Math.max(1.5, i.size * Pt.k);
      i.extrude = { n: clamp(Math.round(L / 2.5), 4, N > 10 ? 10 : 18), dx: Pt.dir[0] * L, dy: Pt.dir[1] * L, color: col };
    });
  } });

/* 拡大写し — a pale blown-up copy of the lyric swells out behind it */
reg('xoBlowUp', { name: '拡大写し', en: 'Blow-Up Ghost', tags: ['emotional', 'graphic', 'glitch'], w: 0.5, safe: true, ae: 'echoOutline',
  plan: rng => ({ k: rng.range(1.24, 1.4), a: rng.range(0.1, 0.15) }),
  apply(env, it, Pt) {
    if (!alive(it, 0.9)) return;
    addPre(it, (e, i) => {
      if (e.pass !== 'main' || tracing(i) || inPieces(e, i)) return;
      if (i.size > Math.min(e.W, e.H) * 0.5) return;
      const q = E.outCubic(inP(e, i, 0, 0.7)) * outK(e);
      if (q <= 0.02) return;
      const k = 1 + (Pt.k - 1) * q * (1 + 0.04 * Math.sin(e.ltb * 1.7)), B = itemBox(i), o = rotOff(i, -B.cx * (k - 1), -B.cy * (k - 1));
      withFx(e, i, () => J.drawItem(e, bare(i, { x: i.x + o[0], y: i.y + o[1], size: i.size * k, stroke: 0, alpha: (i.alpha ?? 1) * Pt.a * q })), false);
    });
  } });

/* ================================================================
   PLATES & MARKS
   ================================================================ */

/* 頭バー — a heading marker in front of the lyric: a solid bar, a pointer triangle or a small square */
reg('xoLeadBar', { name: '頭バー', en: 'Lead Bar', tags: ['editorial', 'graphic', 'pop'], w: 1, ae: 'underline',
  plan: rng => ({ v: rng.pick(['bar', 'bar', 'tri', 'sq']), k: rng.range(0.1, 0.15) }),
  apply(env, it, Pt) {
    if (!alive(it, 0.9) || !lineLike(env, it)) return;
    const lc = markCol(env.sc, colOf(env, it));
    addPre(it, (e, i) => withFx(e, i, () => {
      const spans = lineSpans(i); if (!spans.length) return;
      const q = E.outExpo(inP(e, i, 0.04, 0.4)) * outK(e);
      if (q <= 0.01) return;
      const V = !!i.vertical, s = i.size, a = i.alpha ?? 1, cross = s * (V ? (i.sx || 1) : (i.sy || 1));
      let a0 = 1e9, c0 = 1e9, c1 = -1e9;
      for (const L of spans) { a0 = Math.min(a0, L.a0); c0 = Math.min(c0, L.c); c1 = Math.max(c1, L.c); }
      const p = a0 - s * 0.2, cm = (c0 + c1) / 2, half = ((c1 - c0) + cross * 0.96) / 2 * q;
      if (Pt.v === 'tri') { const t = cross * 0.4 * q; e.poly([uv(V, p - t * 0.95, cm - t), uv(V, p, cm), uv(V, p - t * 0.95, cm + t)], lc, a, true); }
      else if (Pt.v === 'sq') { const t = cross * 0.17 * q; e.poly([uv(V, p - t * 2, cm - t), uv(V, p, cm - t), uv(V, p, cm + t), uv(V, p - t * 2, cm + t)], lc, a, true); }
      else { const bw = s * Pt.k; e.poly([uv(V, p - bw, cm - half), uv(V, p, cm - half), uv(V, p, cm + half), uv(V, p - bw, cm + half)], lc, a, true); }
    }));
  } });

/* 寸法線 — a thin dimension line under each line, closed by ticks, dots or arrow heads; it opens from the middle */
reg('xoDimLine', { name: '寸法線', en: 'Dimension Line', tags: ['editorial', 'graphic', 'calm'], w: 0.9, ae: 'underline',
  plan: rng => ({ v: rng.pick(['tick', 'tick', 'dot', 'arrow']) }),
  apply(env, it, Pt) {
    if (!alive(it, 0.9) || glyphN(it.text) < 2) return;
    const lc = markCol(env.sc, colOf(env, it));
    addPost(it, (e, i) => {
      if (e.pass !== 'main') return;
      withFx(e, i, () => {
        const V = !!i.vertical, s = i.size, cross = s * (V ? (i.sx || 1) : (i.sy || 1)), lw = Math.max(1.5, s * 0.022), ctx = e.ctx;
        lineSpans(i).forEach((L, k) => {
          const q = E.outExpo(inP(e, i, 0.1 + k * 0.08, 0.5)), a = (i.alpha ?? 1) * outK(e);
          if (q <= 0.01 || a <= 0.01) return;
          const mid = (L.a0 + L.a1) / 2, half = (L.a1 - L.a0) / 2 * q, off = L.c + cross * 0.64, u0 = mid - half, u1 = mid + half;
          e.line([uv(V, u0, off), uv(V, u1, off)], lc, lw, a, false);
          const t = s * 0.1;
          for (const [u, d] of [[u0, -1], [u1, 1]]) {
            if (Pt.v === 'dot') e.circle(...uv(V, u, off), s * 0.045, lc, null, 0, a, false);
            else if (Pt.v === 'arrow') {
              ctx.globalAlpha = a; ctx.fillStyle = lc; ctx.beginPath();
              const A = uv(V, u + d * t * 0.5, off), B = uv(V, u - d * t * 0.9, off - t * 0.55), C = uv(V, u - d * t * 0.9, off + t * 0.55);
              ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.lineTo(C[0], C[1]); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
            } else e.line([uv(V, u, off - t), uv(V, u, off + t)], lc, lw, a, false);
          }
        });
      });
    });
  } });

/* トンボ — printer's crop marks sit off the four corners of the lyric block */
reg('xoCropMarks', { name: 'トンボ', en: 'Crop Marks', tags: ['editorial', 'graphic', 'glitch'], w: 0.6, ae: 'bracketsQuote',
  plan: rng => ({ len: rng.range(0.24, 0.32), reg: rng.chance(0.6) }),
  apply(env, it, Pt) {
    if (!alive(it, 0.9) || !lineLike(env, it)) return;
    const sc = env.sc, lc = firstOK([sc.sub, sc.fg, colOf(env, it)], c => ctr(c, sc.bg) >= 2.2, colOf(env, it));
    addPost(it, (e, i) => {
      if (e.pass !== 'main') return;
      const q = E.outCubic(inP(e, i, e.cut.inDur * 0.4, 0.4)), a = (i.alpha ?? 1) * q * outK(e);
      if (a <= 0.01) return;
      withFx(e, i, () => {
        const B = itemBox(i), s = i.size * Math.min(i.sx || 1, i.sy || 1), pad = s * 0.12, gap = s * (0.1 + 0.25 * (1 - q)), len = s * Pt.len, lw = Math.max(1.2, s * 0.013);
        const x0 = B.cx - B.hw - pad, x1 = B.cx + B.hw + pad, y0 = B.cy - B.hh - pad, y1 = B.cy + B.hh + pad;
        for (const [x, y, dx, dy] of [[x0, y0, -1, -1], [x1, y0, 1, -1], [x1, y1, 1, 1], [x0, y1, -1, 1]]) {
          e.line([[x + dx * gap, y], [x + dx * (gap + len), y]], lc, lw, a, false);
          e.line([[x, y + dy * gap], [x, y + dy * (gap + len)]], lc, lw, a, false);
        }
        if (Pt.reg) {                               // registration target beside the block
          const r = s * 0.085, V = !!i.vertical, tx = V ? B.cx : x0 - gap - len * 0.5, ty = V ? y0 - gap - len * 0.5 : B.cy;
          e.circle(tx, ty, r, null, lc, lw, a, false);
          e.line([[tx - r * 1.7, ty], [tx + r * 1.7, ty]], lc, lw, a, false); e.line([[tx, ty - r * 1.7], [tx, ty + r * 1.7]], lc, lw, a, false);
        }
      });
    });
  } });

/* 区切り点 — the glyphs are spaced out and a small mark sits in every gap: a dot, a slash or a hairline rule */
reg('xoSeparators', { name: '区切り点', en: 'Separators', tags: ['editorial', 'calm', 'graphic', 'emotional'], w: 0.7, ae: 'kerningWide',
  plan: rng => ({ v: rng.pick(['dot', 'dot', 'slash', 'rule']), t: rng.range(0.26, 0.34) }),
  apply(env, it, Pt) {
    if (!alive(it, 0.9) || glyphN(it.text) < 2) return;
    const V = !!it.vertical, lc = markCol(env.sc, colOf(env, it));
    const m0 = J.measure(it), a0 = V ? m0.h : m0.w;
    it.track = (it.track || 0) + Pt.t;
    const m1 = J.measure(it), a1 = V ? m1.h : m1.w;
    it.size *= Math.max(0.6, Math.min(1, a0 * 1.05 / Math.max(1, a1)));
    addPost(it, (e, i) => {
      if (e.pass !== 'main') return;
      withFx(e, i, () => {
        const Gs = glyphList(i), s = i.size, cross = s * (V ? (i.sx || 1) : (i.sy || 1)), o = outK(e), lw = Math.max(1.3, s * 0.02);
        for (let k = 0; k + 1 < Gs.length && k < 60; k++) {
          const A = Gs[k], B = Gs[k + 1];
          if (A.g.li !== B.g.li || B.g.ci !== A.g.ci + 1 || J.isPunct(A.g.ch) || J.isPunct(B.g.ch)) continue;
          const q = E.outBack(inP(e, i, e.cut.inDur * 0.4 + k * 0.03, 0.24), 1.8) * o, a = (i.alpha ?? 1) * Math.min(A.a, B.a) * Math.min(1, q);
          if (q <= 0.01 || a <= 0.01) continue;
          const x = V ? (A.x + B.x) / 2 : (A.x + A.w / 2 + B.x - B.w / 2) / 2, y = V ? (A.y + A.h / 2 + B.y - B.h / 2) / 2 : (A.y + B.y) / 2;
          if (Pt.v === 'dot') e.circle(x, y, s * 0.05 * q, lc, null, 0, a, false);
          else if (Pt.v === 'slash') { const h = cross * 0.34 * q, w = cross * 0.09 * q; e.line(V ? [[x - h, y + w], [x + h, y - w]] : [[x - w, y + h], [x + w, y - h]], lc, lw * 1.2, a, false); }
          else { const h = cross * 0.46 * q; e.line(V ? [[x - h, y], [x + h, y]] : [[x, y - h], [x, y + h]], lc, lw * 0.8, a, false); }
        }
      });
    });
  } });

/* 字ごと下線 — every glyph gets its own short underscore, like the blanks of a form */
reg('xoGlyphUnders', { name: '字ごと下線', en: 'Glyph Underscores', tags: ['editorial', 'pop', 'graphic', 'calm'], w: 0.8, ae: 'underline',
  plan: rng => ({ k: rng.range(0.045, 0.06), w: rng.range(0.74, 0.84) }),
  apply(env, it, Pt) {
    if (!alive(it, 0.9)) return;
    const lc = markCol(env.sc, colOf(env, it));
    addPost(it, (e, i) => {
      if (e.pass !== 'main') return;
      withFx(e, i, () => {
        const ctx = e.ctx, V = !!i.vertical, s = i.size, sx = i.sx || 1, sy = i.sy || 1, o = outK(e), th = Math.max(2, s * Pt.k);
        ctx.fillStyle = lc;
        for (const G of glyphList(i)) {
          if (J.isPunct(G.g.ch)) continue;
          const q = E.outExpo(inP(e, i, 0.06 + G.g.i * 0.035, 0.3)) * o;
          if (q <= 0.01) continue;
          ctx.save(); ctx.translate(G.x, G.y); if (G.rot) ctx.rotate(G.rot * DEG);
          ctx.globalAlpha = (i.alpha ?? 1) * G.a;
          if (V) { const len = Math.max(G.h, s * sy * 0.45) * Pt.w * G.s * q; ctx.fillRect(s * sx * 0.6 * G.s - th / 2, -len / 2, th, len); }
          else { const len = Math.max(G.w, s * sx * 0.45) * Pt.w * G.s * q; ctx.fillRect(-len / 2, s * sy * 0.6 * G.s - th / 2, len, th); }
          ctx.restore();
        }
      });
    });
  } });

/* ずらし枠 — a hairline frame draws itself around the lyric; a flat tint plate sits behind it, knocked off-register */
reg('xoOffsetFrame', { name: 'ずらし枠', en: 'Offset Frame', tags: ['graphic', 'editorial', 'pop'], w: 0.9, ae: 'boxed',
  plan: rng => ({ d: rng.range(0.1, 0.15), dir: rng.pick([[1, 1], [1, 1], [-1, 1], [1, -1]]), c: rng.int(0, 1) }),
  apply(env, it, Pt) {
    if (!alive(it, 0.9) || !lineLike(env, it)) return;
    const sc = env.sc, col = colOf(env, it);
    if (onPlate(sc, col)) return;
    const base = Pt.c ? (sc.accent2 || sc.accent) : sc.accent;
    let tone = J.mix(sc.bg, base, 0.34);
    if (ctr(col, tone) < 3) tone = J.mix(sc.bg, base, 0.16);
    const lc = ctr(col, sc.bg) >= 2 ? col : markCol(sc, col);
    addPre(it, (e, i) => {
      if (e.pass !== 'main') return;
      const q = E.outExpo(inP(e, i, 0, 0.5)), q2 = E.inOutCubic(inP(e, i, 0.08, 0.6)), o = outK(e);
      if (o <= 0.01 || q <= 0.005) return;
      withFx(e, i, () => {
        const ctx = e.ctx, B = itemBox(i), s = i.size * Math.min(i.sx || 1, i.sy || 1), pad = s * 0.2, d = s * Pt.d, a = (i.alpha ?? 1) * o;
        const x0 = B.cx - B.hw - pad, y0 = B.cy - B.hh - pad, w = (B.hw + pad) * 2, h = (B.hh + pad) * 2;
        ctx.globalAlpha = a; ctx.fillStyle = tone;
        if (i.vertical) ctx.fillRect(x0 + d * Pt.dir[0], y0 + d * Pt.dir[1], w, h * q); else ctx.fillRect(x0 + d * Pt.dir[0], y0 + d * Pt.dir[1], w * q, h);
        ctx.globalAlpha = 1;
        e.polyPartial([[x0, y0], [x0 + w, y0], [x0 + w, y0 + h], [x0, y0 + h], [x0, y0], [x0 + w * 0.02, y0]], q2, lc, Math.max(1.5, s * 0.022), a, false);
      });
    });
  } });

/* 字の角印 — viewfinder ticks hug two opposite corners of every glyph */
reg('xoGlyphCorners', { name: '字の角印', en: 'Glyph Corners', tags: ['graphic', 'editorial', 'glitch'], w: 0.6, ae: 'boxed',
  plan: rng => ({ t: rng.range(0.15, 0.2), flip: rng.chance(0.5) }),
  apply(env, it, Pt) {
    if (!alive(it, 0.9)) return;
    const lc = markCol(env.sc, colOf(env, it));
    addPost(it, (e, i) => {
      if (e.pass !== 'main') return;
      withFx(e, i, () => {
        const ctx = e.ctx, s = i.size, sx = i.sx || 1, sy = i.sy || 1, o = outK(e), lw = Math.max(1.3, s * 0.02), t = s * Pt.t, f = Pt.flip ? -1 : 1;
        for (const G of glyphList(i)) {
          if (J.isPunct(G.g.ch)) continue;
          const q = E.outCubic(inP(e, i, 0.05 + G.g.i * 0.04, 0.3));
          if (q <= 0.01 || o <= 0.01) continue;
          const hw = (i.vertical ? s * sx : Math.max(G.w, s * sx * 0.5)) * 0.5, hh = (i.vertical ? Math.max(G.h, s * sy * 0.5) : s * sy) * 0.5, k = 1 + (1 - q) * 0.45;
          ctx.save(); ctx.translate(G.x, G.y); if (G.rot) ctx.rotate(G.rot * DEG); ctx.scale(G.s * k, G.s * k);
          const a = (i.alpha ?? 1) * G.a * q * o;
          e.line([[-hw * f, -hh + t], [-hw * f, -hh], [(-hw + t) * f, -hh]], lc, lw, a, false);
          e.line([[hw * f, hh - t], [hw * f, hh], [(hw - t) * f, hh]], lc, lw, a, false);
          ctx.restore();
        }
      });
    });
  } });

/* 目盛り — a ruler lies under each line: a hairline with short ticks, every fifth one longer */
reg('xoRuler', { name: '目盛り', en: 'Ruler Ticks', tags: ['editorial', 'graphic', 'glitch', 'calm'], w: 0.7, ae: 'underline',
  plan: rng => ({ p: rng.range(0.09, 0.12), up: rng.chance(0.3) }),
  apply(env, it, Pt) {
    if (!alive(it, 0.9) || glyphN(it.text) < 2) return;
    const lc = markCol(env.sc, colOf(env, it));
    addPost(it, (e, i) => {
      if (e.pass !== 'main') return;
      withFx(e, i, () => {
        const ctx = e.ctx, V = !!i.vertical, s = i.size, cross = s * (V ? (i.sx || 1) : (i.sy || 1)), a = (i.alpha ?? 1) * outK(e);
        if (a <= 0.01) return;
        const sgn = Pt.up ? -1 : 1;
        ctx.strokeStyle = lc; ctx.lineWidth = Math.max(1.2, s * 0.014); ctx.lineCap = 'butt'; ctx.globalAlpha = a;
        lineSpans(i).forEach((L, k) => {
          const q = E.outCubic(inP(e, i, 0.08 + k * 0.08, 0.6));
          if (q <= 0.01) return;
          const pitch = Math.max(4, s * Pt.p), u0 = L.a0 - s * 0.05, len = L.a1 + s * 0.05 - u0, m = Math.min(160, Math.floor(len / pitch)), off = L.c + sgn * cross * 0.62;
          const step = len / Math.max(1, m), shown = Math.floor(m * q);
          ctx.beginPath();
          let A = uv(V, u0, off), B = uv(V, u0 + step * shown, off);
          ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]);
          for (let j = 0; j <= shown; j++) {
            const u = u0 + step * j, h = s * (j % 5 === 0 ? 0.13 : 0.065);
            A = uv(V, u, off); B = uv(V, u, off + sgn * h);
            ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]);
          }
          ctx.stroke();
        });
        ctx.globalAlpha = 1;
      });
    });
  } });

/* 貫き線 — a thin line threads through the line of text and runs on past both ends; the glyphs sit in front of it */
reg('xoThread', { name: '貫き線', en: 'Thread Line', tags: ['editorial', 'calm', 'emotional', 'graphic'], w: 0.7, ae: 'strike',
  plan: rng => ({ ext: rng.range(0.4, 0.7), k: rng.range(0.022, 0.03), dots: rng.chance(0.6) }),
  apply(env, it, Pt) {
    if (!alive(it, 0.9) || !lineLike(env, it)) return;
    const sc = env.sc, col = colOf(env, it);
    if (onPlate(sc, col)) return;
    const lc = markCol(sc, col);
    it.strokeColor = sc.bg; it.strokeUnder = true;
    sized(it, env, (i, e) => { i.stroke = inPieces(e, i) ? 0 : Math.max(2, i.size * 0.1); });
    addPre(it, (e, i) => {
      if (e.pass !== 'main') return;
      withFx(e, i, () => {
        const V = !!i.vertical, s = i.size, a = (i.alpha ?? 1), o = E.inCubic(e.pOut), lw = Math.max(1.5, s * Pt.k);
        lineSpans(i).forEach((L, k) => {
          const q = E.outExpo(inP(e, i, k * 0.08, 0.55));
          if (q <= 0.005 || o >= 1) return;
          const u0 = L.a0 - s * Pt.ext, len = L.a1 + s * Pt.ext - u0, p0 = u0 + len * o, p1 = u0 + len * q, c = L.c + (V ? 0 : s * 0.02);
          if (p1 - p0 < 1) return;
          e.line([uv(V, p0, c), uv(V, p1, c)], lc, lw, a, false);
          if (Pt.dots) { e.circle(...uv(V, p0, c), lw * 1.9, lc, null, 0, a, false); e.circle(...uv(V, p1, c), lw * 1.9, lc, null, 0, a, false); }
        });
      });
    });
  } });

/* 払い下線 — a tapered brush-pen swoosh under each line: fat where it lands, a fine tail where it lifts */
reg('xoSwoosh', { name: '払い下線', en: 'Swoosh Underline', tags: ['pop', 'emotional', 'editorial'], w: 0.9, ae: 'underline',
  plan: rng => ({ k: rng.range(0.11, 0.15), bow: rng.range(0.05, 0.1), rev: rng.chance(0.25) }),
  apply(env, it, Pt) {
    if (!alive(it, 0.9) || glyphN(it.text) < 2) return;
    const lc = markCol(env.sc, colOf(env, it));
    addPost(it, (e, i) => {
      if (e.pass !== 'main') return;
      withFx(e, i, () => {
        const V = !!i.vertical, s = i.size, cross = s * (V ? (i.sx || 1) : (i.sy || 1)), a = (i.alpha ?? 1) * outK(e);
        if (a <= 0.01) return;
        lineSpans(i).forEach((L, k) => {
          const q = E.outCubic(inP(e, i, 0.1 + k * 0.1, 0.45));
          if (q <= 0.01) return;
          const u0 = L.a0 - s * 0.08, len = L.a1 + s * 0.14 - u0, off = L.c + cross * 0.66, M = 22, top = [], bot = [];
          for (let j = 0; j <= M; j++) {
            const t = j / M * q, tt = Pt.rev ? 1 - t : t;
            const th = s * Pt.k * (0.08 + 0.92 * Math.pow(1 - t, 0.8)) * Math.sqrt(Math.min(1, t / 0.05 + 0.15));
            const v = off + s * Pt.bow * (1 - Math.sin(t * Math.PI * 0.85)) - s * Pt.bow * 0.5;
            top.push(uv(V, u0 + len * tt, v - th / 2)); bot.push(uv(V, u0 + len * tt, v + th / 2));
          }
          e.poly(top.concat(bot.reverse()), lc, a, false);
        });
      });
    });
  } });

/* 貼り紙 — the lyric sits on a slip of paper held by two strips of tape */
reg('xoTapedNote', { name: '貼り紙', en: 'Taped Note', tags: ['pop', 'editorial', 'emotional'], w: 0.7, ae: 'boxed',
  plan: rng => ({ tilt: rng.range(1, 2.4) * (rng.chance(0.5) ? 1 : -1), c: rng.int(0, 1), one: rng.chance(0.3) }),
  apply(env, it, Pt) {
    if (!alive(it, 0.9) || !lineLike(env, it)) return;
    const sc = env.sc, col = colOf(env, it);
    if (onPlate(sc, col)) return;
    let paper = J.mix(sc.bg, sc.fg, 0.16);
    if (ctr(col, paper) < 2.6) paper = J.mix(sc.bg, sc.fg, 0.08);
    const tape = J.mix(Pt.c ? (sc.accent2 || sc.accent) : sc.accent, sc.bg, 0.25);
    addPre(it, (e, i) => {
      if (e.pass !== 'main') return;
      const q = E.outBack(inP(e, i, 0, 0.36), 1.3), o = outK(e);
      if (q <= 0.01 || o <= 0.01) return;
      withFx(e, i, () => {
        const ctx = e.ctx, B = itemBox(i), s = i.size * Math.min(i.sx || 1, i.sy || 1), pad = s * 0.24, a = (i.alpha ?? 1) * o * Math.min(1, q * 1.4);
        const hw = B.hw + pad, hh = B.hh + pad * 0.8;
        ctx.save(); ctx.translate(B.cx, B.cy); ctx.rotate(Pt.tilt * DEG * (1 + (1 - q) * 3)); ctx.scale(0.9 + 0.1 * q, 0.9 + 0.1 * q);
        ctx.globalAlpha = a; ctx.fillStyle = paper; ctx.fillRect(-hw, -hh, hw * 2, hh * 2);
        const tw = Math.min(s * 0.62, hw * 0.9), th = s * 0.19, tq = E.outCubic(inP(e, i, 0.18, 0.25));
        ctx.globalAlpha = a * 0.82 * tq; ctx.fillStyle = tape;
        const strips = Pt.one ? [[0, -hh, -3]] : [[-hw, -hh, -40], [hw, -hh, 40]];
        for (const [x, y, r] of strips) { ctx.save(); ctx.translate(x, y); ctx.rotate(r * DEG); ctx.fillRect(-tw / 2, -th / 2, tw, th); ctx.restore(); }
        ctx.restore(); ctx.globalAlpha = 1;
      });
    });
  } });

/* 蛍光ペン — two overlapping round-ended passes of a translucent highlighter, pulled by hand at slightly different angles */
reg('xoHiliter', { name: '蛍光ペン', en: 'Highlighter', tags: ['pop', 'editorial', 'emotional'], w: 0.8, ae: 'marker',
  plan: rng => ({ c: rng.int(0, 1), tilt: rng.range(-0.035, 0.035), k: rng.range(0.46, 0.56) }),
  apply(env, it, Pt) {
    if (!alive(it, 0.9) || !lineLike(env, it)) return;
    const sc = env.sc, col = colOf(env, it);
    if (onPlate(sc, col)) return;
    const hc = J.fitContrast(firstOK(Pt.c ? [sc.accent2, sc.accent] : [sc.accent, sc.accent2], c => ctr(c, col) >= 2, sc.accent), col, 2.4), dk = isDark(sc.bg);
    addPre(it, (e, i) => {
      if (e.pass !== 'main') return;
      withFx(e, i, () => {
        const ctx = e.ctx, V = !!i.vertical, s = i.size, cross = s * (V ? (i.sx || 1) : (i.sy || 1)), a = (i.alpha ?? 1) * outK(e);
        if (a <= 0.01) return;
        ctx.strokeStyle = hc; ctx.lineCap = 'round';
        lineSpans(i).forEach((L, k) => {
          const len = L.a1 - L.a0, stroke = (d, u0, u1, v0, v1, w) => {
            const q = E.outCubic(inP(e, i, d + k * 0.1, 0.3));
            if (q <= 0.01) return;
            const A = uv(V, u0, v0), B = uv(V, u0 + (u1 - u0) * q, v0 + (v1 - v0) * q);
            ctx.globalAlpha = a * (dk ? 0.8 : 0.62); ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.stroke();
          };
          const w1 = cross * Pt.k, w2 = cross * Pt.k * 0.8, t = len * Pt.tilt;
          stroke(0.06, L.a0 + w1 * 0.2, L.a1 + s * 0.06, L.c - cross * 0.06 + t, L.c - cross * 0.06 - t, w1);
          stroke(0.22, L.a1 - w2 * 0.1, L.a0 + len * 0.12, L.c + cross * 0.26 - t * 0.6, L.c + cross * 0.3 + t * 0.6, w2);
        });
        ctx.globalAlpha = 1; ctx.lineCap = 'butt';
      });
    });
  } });

/* 強調線 — three short ticks burst from the top corner of the lyric, like a comic "!" accent */
reg('xoAccentTicks', { name: '強調線', en: 'Accent Ticks', tags: ['pop', 'emotional', 'graphic'], w: 0.8, ae: 'emphasisDots',
  plan: rng => ({ left: rng.chance(0.35), n: rng.pick([3, 3, 2]), k: rng.range(0.42, 0.56) }),
  apply(env, it, Pt) {
    if (!alive(it, 0.9) || !lineLike(env, it)) return;
    const lc = markCol(env.sc, colOf(env, it));
    addPost(it, (e, i) => {
      if (e.pass !== 'main') return;
      const q = E.outBack(inP(e, i, e.cut.inDur * 0.6, 0.28), 2.2), o = outK(e);
      if (q <= 0.01 || o <= 0.01) return;
      withFx(e, i, () => {
        const ctx = e.ctx, B = itemBox(i), s = i.size * Math.min(i.sx || 1, i.sy || 1), sg = Pt.left ? -1 : 1;
        const ox = B.cx + sg * (B.hw + s * 0.02), oy = B.cy - B.hh + s * 0.04, n = Pt.n, pulse = 1 + 0.07 * Math.sin(e.ltb * 5);
        ctx.strokeStyle = lc; ctx.lineCap = 'round'; ctx.lineWidth = Math.max(2.5, s * 0.065); ctx.globalAlpha = (i.alpha ?? 1) * o * Math.min(1, q);
        ctx.beginPath();
        for (let k = 0; k < n; k++) {
          const ang = (n === 2 ? [-62, -28] : [-76, -45, -14])[k] * DEG, r0 = s * 0.22, r1 = r0 + s * Pt.k * (k === 1 || n === 2 ? 1 : 0.7) * q * pulse;
          ctx.moveTo(ox + sg * Math.cos(ang) * r0, oy + Math.sin(ang) * r0); ctx.lineTo(ox + sg * Math.cos(ang) * r1, oy + Math.sin(ang) * r1);
        }
        ctx.stroke(); ctx.globalAlpha = 1; ctx.lineCap = 'butt';
      });
    });
  } });

/* ================================================================
   PER-GLYPH ALTERNATION
   ================================================================ */

/* 太細交互 — heavy and light glyphs take turns: every other one is fattened, the rest are pared down */
reg('xoAltWeight', { name: '太細交互', en: 'Alternating Weight', tags: ['graphic', 'editorial', 'pop'], w: 0.8, ae: 'fauxBold',
  plan: rng => ({ k: rng.range(0.9, 1.15), first: rng.chance(0.5) }),
  apply(env, it, Pt) {
    if (!alive(it)) return;
    const sc = env.sc, col = colOf(env, it), ix = altIx(it), o = Pt.first ? 0 : 1, plate = onPlate(sc, col);
    const heavy = (gi, g) => (ix(gi, g) + o) % 2 === 0;
    const onlyHeavy = (gi, g) => (heavy(gi, g) && !J.isPunct(g.ch) ? null : { hide: true });
    const onlyLight = (gi, g) => (!heavy(gi, g) && !J.isPunct(g.ch) ? null : { hide: true });
    // how much to add / pare depends on the face: black faces are pared, hairline faces are only fattened
    const f = String(it.font || ''), black = /black|dela|reggae|potta|pop|brush|rampart/.test(f), fine = /light|^mincho$|mincho_bold|klee|tokumin|shippori|mono|kiwi|sansui|med/.test(f);
    const kB = (black ? 0.026 : fine ? 0.062 : 0.045) * Pt.k, kT = (black ? 0.046 : fine ? 0 : 0.022) * Pt.k;
    addPre(it, (e, i) => {
      if (tracing(i) || inPieces(e, i)) return;
      withFx(e, i, () => J.drawItem(e, bare(i, { fill: false, stroke: i.size * kB, strokeColor: col, charFn: J.combineChar(i.charFns.concat([onlyHeavy])) })), false);
    });
    if (!plate && kT > 0) addPost(it, (e, i) => {
      if (e.pass !== 'main' || tracing(i) || inPieces(e, i)) return;
      withFx(e, i, () => J.drawItem(e, bare(i, { fill: false, stroke: i.size * kT, strokeColor: sc.bg, charFn: J.combineChar(i.charFns.concat([onlyLight])) })), false);
    });
  } });

/* 長平交互 — condensed-tall and flat-wide glyphs alternate */
reg('xoTallWide', { name: '長平交互', en: 'Tall & Wide', tags: ['pop', 'graphic', 'editorial'], w: 0.8, safe: true, ae: 'sizeWave',
  plan: rng => ({ k: rng.range(0.76, 0.82), first: rng.chance(0.5) }),
  apply(env, it, Pt) {
    if (!alive(it, 0.5)) return;
    const ix = altIx(it), o = Pt.first ? 0 : 1, k = Pt.k, K = 1.13;
    it.charFns.push((gi, g) => {
      if (J.isPunct(g.ch)) return null;
      const tall = (ix(gi, g) + o) % 2 === 0;
      return tall ? { sx: k, sy: K } : { sx: K, sy: k };
    });
  } });

/* 柄違い — the glyphs cycle through three fills: solid ink, screened dots and ruled lines */
reg('xoMixedFills', { name: '柄違い', en: 'Mixed Fills', tags: ['pop', 'graphic'], w: 0.7, ae: 'halftone',
  plan: rng => ({ a: rng.pick(['dots', 'dots', 'grid']), b: rng.pick(['lines', 'stripes', 'hatch']), o: rng.int(0, 2) }),
  apply(env, it, Pt) {
    if (!alive(it)) return;
    const sc = env.sc, col = colOf(env, it), ix = altIx(it), tone = J.mix(col, sc.bg, 0.72);
    const only = m => (gi, g) => ((ix(gi, g) + Pt.o) % 3 === m && !J.isPunct(g.ch) ? null : { hide: true });
    const fA = only(1), fB = only(2);
    addPost(it, (e, i) => {
      if (e.pass !== 'main' || tracing(i) || inPieces(e, i)) return;
      const st = Math.max(1.2, i.size * 0.02);
      withFx(e, i, () => {
        J.drawItem(e, bare(i, { pattern: Pt.a, patternColor: col, patternBg: tone, stroke: st, strokeColor: col, charFn: J.combineChar(i.charFns.concat([fA])) }));
        J.drawItem(e, bare(i, { pattern: Pt.b, patternColor: col, patternBg: tone, stroke: st, strokeColor: col, charFn: J.combineChar(i.charFns.concat([fB])) }));
      }, false);
    });
  } });

/* 字間漸増 — the gaps between glyphs grow step by step along the line (the line keeps its length) */
reg('xoTrackRamp', { name: '字間漸増', en: 'Tracking Ramp', tags: ['editorial', 'emotional', 'calm', 'graphic'], w: 0.7, safe: true, ae: 'kerningWide',
  plan: rng => ({ t: rng.range(0.3, 0.44), rev: rng.chance(0.35) }),
  apply(env, it, Pt) {
    if (!it.text || it.size <= 1) return;
    const lay = J.layoutText(it), V = !!it.vertical, size0 = it.size, byLine = new Map();
    for (const g of lay) { if (!byLine.has(g.li)) byLine.set(g.li, []); byLine.get(g.li).push(g); }
    let ok = false;
    for (const gs of byLine.values()) if (gs.length >= 3) ok = true;
    if (!ok) return;
    const sh = 1 / (1 + Pt.t), F = [];
    const ext = g => (V ? g.h : g.w), pos = g => (V ? g.y : g.x);
    for (const gs of byLine.values()) {
      const n = gs.length, old0 = pos(gs[0]) - ext(gs[0]) / 2, old1 = pos(gs[n - 1]) + ext(gs[n - 1]) / 2, len = old1 - old0, T = Pt.t * len;
      const Wsum = Math.max(1, (n - 1) * (n - 2) / 2);
      let cum = 0;
      for (let k = 0; k < n; k++) {
        const g = gs[k], xp = pos(g) + cum;
        let x2;
        if (it.align === 'left') x2 = old0 + (xp - old0) * sh;
        else if (it.align === 'right' && !V) x2 = old1 + (xp - (old1 + T)) * sh;
        else { const c = (old0 + old1) / 2; x2 = c + (xp - (c + T / 2)) * sh; }
        F[g.i] = (x2 - pos(g)) / size0;
        if (k < n - 1) cum += n >= 3 ? T * (Pt.rev ? n - 2 - k : k) / Wsum : T;
      }
    }
    it.charFns.push((gi, g) => {
      const f = F[gi]; if (f == null) return null;
      return V ? { s: sh, dy: f * g.w / (g.fs || 1) * (it.sy || 1) } : { s: sh, dx: f * g.h / (g.fs || 1) * (it.sx || 1) };
    });
  } });

/* ================================================================
   PRINT LOOKS
   ================================================================ */

/* 二度刷り — the sheet went through the press twice: a faint second impression sits slightly off and askew */
reg('xoDoublePrint', { name: '二度刷り', en: 'Double Print', tags: ['glitch', 'editorial', 'emotional', 'graphic'], w: 0.7, safe: true, ae: 'glitchSplit',
  plan: rng => ({ d: rng.range(0.05, 0.075), r: rng.range(0.7, 1.5) * (rng.chance(0.5) ? 1 : -1), a: rng.range(0.34, 0.44), up: rng.chance(0.5) }),
  apply(env, it, Pt) {
    if (!alive(it, 0.9)) return;
    addPre(it, (e, i) => {
      if (e.pass !== 'main' || tracing(i) || inPieces(e, i)) return;
      const q = E.outCubic(inP(e, i, 0.02, 0.35)) * outK(e);
      if (q <= 0.02) return;
      const m = J.measure(i), along = Math.max(m.w, m.h), d = i.size * Pt.d * q, o = rotOff(i, d, d * (Pt.up ? -0.45 : 0.45));
      withFx(e, i, () => J.drawItem(e, bare(i, { x: i.x + o[0], y: i.y + o[1], rot: (i.rot || 0) + Pt.r * q * Math.min(1, 700 / Math.max(1, along)), alpha: (i.alpha ?? 1) * Pt.a })), false);
    });
  } });

/* 半抜き — a solid bar of the text colour covers the lower half of each line; where the glyphs cross it they flip to the paper colour */
reg('xoHalfKnock', { name: '半抜き', en: 'Half Knockout', tags: ['graphic', 'pop', 'editorial'], w: 1, ae: 'marker',
  plan: rng => ({ at: rng.range(-0.04, 0.1), top: rng.chance(0.25) }),
  apply(env, it, Pt) {
    if (!alive(it, 0.9)) return;
    const sc = env.sc, col = colOf(env, it);
    if (onPlate(sc, col)) return;
    const tc = textOn(col, sc.bg, sc), lag = pieceLag(env, it);
    const rects = (e, i) => {
      const out = [], V = !!i.vertical, s = i.size, cross = s * (V ? (i.sx || 1) : (i.sy || 1)), o = E.inCubic(e.pOut);
      for (const L of lineSpans(i)) {
        const q = E.outExpo(inP(e, i, 0.03 + lag + L.li * 0.07, 0.4));
        if (q <= 0 || o >= 1) continue;
        const pad = s * 0.16, a0 = L.a0 - pad, len = L.a1 + pad - a0, p0 = a0 + len * o, p1 = a0 + len * q;
        if (p1 - p0 < 1) continue;
        let v0 = L.c + cross * Pt.at, v1 = L.c + cross * 0.62;
        if (Pt.top) { v0 = L.c - cross * 0.62; v1 = L.c - cross * Pt.at; }              // top half (vertical columns: left half) instead
        out.push(V ? [v0, p0, v1 - v0, p1 - p0] : [p0, v0, p1 - p0, v1 - v0]);
      }
      return out;
    };
    addPre(it, (e, i) => {
      if (e.pass !== 'main' || tracing(i) || inPieces(e, i)) return;
      withFx(e, i, () => { for (const r of rects(e, i)) e.rect(r[0], r[1], r[2], r[3], col, i.alpha ?? 1, false); });
    });
    addPost(it, (e, i) => {
      if (e.pass !== 'main' || tracing(i) || inPieces(e, i)) return;
      const R = rects(e, i); if (!R.length) return;
      withFx(e, i, () => {
        const ctx = e.ctx;
        ctx.save(); ctx.beginPath(); for (const r of R) ctx.rect(r[0], r[1], r[2], r[3]); ctx.clip();
        J.drawItem(e, bare(i, { x: 0, y: 0, rot: 0, skew: 0, blur: 0, color: tc, strokeColor: tc }));
        ctx.restore();
      });
    });
  } });

/* 頭切り — the tops of the glyphs are trimmed off along a hairline, as if the sheet had been cut there */
reg('xoTopCrop', { name: '頭切り', en: 'Cropped Top', tags: ['graphic', 'editorial', 'glitch'], w: 0.6, ae: 'cutShift',
  plan: rng => ({ k: rng.range(0.19, 0.24), foot: rng.chance(0.3) }),
  apply(env, it, Pt) {
    if (!alive(it) || inPieces(env, it)) return;
    const V = !!it.vertical, lc = markCol(env.sc, colOf(env, it));
    const g = Pt.k * E.outCubic(inP(env, it, env.cut.inDur * 0.5, 0.35)) * outK(env);
    if (g < 0.004) return;
    const side = Pt.foot !== V ? 1 : -1;                      // +1: bottom (vertical: right) edge is trimmed
    const cl = side > 0 ? [-0.8, 0.5 - g] : [-0.5 + g, 0.8];
    it.charFns.push(() => (V ? { clipX: cl } : { clipY: cl }));
    if (lineLike(env, it)) addPost(it, (e, i) => {
      if (e.pass !== 'main' || tracing(i)) return;
      withFx(e, i, () => {
        const s = i.size, cross = s * (V ? (i.sx || 1) : (i.sy || 1)), lw = Math.max(1.4, s * 0.018), a = (i.alpha ?? 1) * Math.min(1, g / Pt.k * 1.5);
        lineSpans(i).forEach((L, k) => {
          const q = E.outExpo(inP(e, i, e.cut.inDur * 0.5 + k * 0.06, 0.4));
          if (q <= 0.01) return;
          const u0 = L.a0 - s * 0.3, len = L.a1 + s * 0.3 - u0, v = L.c + side * (0.5 - g) * cross;
          e.line([uv(V, u0, v), uv(V, u0 + len * q, v)], lc, lw, a, false);
        });
      });
    });
  } });

/* 重ね詰め — poster kerning: the glyphs are set so tight that each one overlaps the last, cut apart by a paper-coloured edge */
reg('xoOverlapKern', { name: '重ね詰め', en: 'Overlap Kerning', tags: ['graphic', 'pop', 'editorial'], w: 0.8, ae: 'outlineFill',
  plan: rng => ({ t: rng.range(0.13, 0.17), k: rng.range(0.05, 0.065) }),
  apply(env, it, Pt) {
    if (!alive(it) || glyphN(it.text) < 2) return;
    const sc = env.sc, col = colOf(env, it);
    if (onPlate(sc, col)) return;
    const V = !!it.vertical, latin = /[A-Za-z0-9]/.test(it.text);
    const m0 = J.measure(it), a0 = V ? m0.h : m0.w;
    it.track = (it.track || 0) - Pt.t * (latin ? 0.4 : V ? 0.8 : 1);
    const m1 = J.measure(it), a1 = V ? m1.h : m1.w;
    it.size *= clamp(a0 / Math.max(1, a1), 1, 1.16);
    it.strokeColor = sc.bg; it.strokeUnder = true;
    sized(it, env, (i, e) => { i.stroke = inPieces(e, i) ? 0 : Math.max(2, i.size * Pt.k); });
  } });
})();
