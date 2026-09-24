/* JIZURA pack: looks — text treatments, background graphics, camera moves and post / transition effects */
(() => {
'use strict';
const E = J.E;
const PK = 'looks';
const reg = (g, k, d) => J.register(g, k, d, PK);
const DEG = J.DEG, TAU = J.TAU, clamp = J.clamp;

/* ================= colour helpers ================= */
const ctr = (a, b) => J.contrast(a, b);
const isDark = c => J.lum(c) < 0.45;
const firstOK = (list, test, fb) => { for (const c of list) if (c && test(c)) return c; return fb; };
const best = (list, against) => { let b = list[0], bv = -1; for (const c of list) { if (!c) continue; const v = ctr(c, against); if (v > bv) { bv = v; b = c; } } return b; };
// an accent that differs from colour `col` and still reads on the scheme background
const accentFor = (sc, col, min = 1.6) => firstOK([sc.accent, sc.accent2, sc.ghostA, sc.ghostB], c => ctr(c, col) >= min && ctr(c, sc.bg) >= 1.5, J.fitContrast(sc.accent, col, min + 0.3));
// text colour for glyphs sitting on `box`: keep `pref` when it reads, else the best scheme colour
const textOn = (box, pref, sc) => (ctr(pref, box) >= 3 ? pref : best([sc.bg, sc.fg, sc.ink, '#111111', '#FFFFFF'], box));
// a colour that stands out from the scheme background (for marks drawn next to the text)
const markCol = (sc, col) => firstOK([sc.accent, sc.accent2, col], c => ctr(c, sc.bg) >= 2, col);

/* ================= item helpers (treatments) ================= */
const alive = (it, amin = 0.9) => it.fill !== false && (it.alpha ?? 1) >= amin && !!it.text && it.size > 1;
const colOf = (env, it) => it.color || env.sc.fg;
const addPre = (it, f) => { const p = it.pre; it.pre = p ? (e, i) => { p(e, i); f(e, i); } : f; };
const addPost = (it, f) => { const p = it.post; it.post = p ? (e, i, b) => { p(e, i, b); f(e, i, b); } : f; };
// size-dependent fields: set now and refresh right before drawing (after enter / hold / exit changed the size)
const sized = (it, env, f) => { f(it, env); addPre(it, (e, i) => f(i, e)); };
const inP = (env, it, d, len) => clamp((env.lt - (it.delay || 0) - d) / len);
const glyphN = t => [...String(t || '')].filter(c => c.trim()).length;
// true while a piece-based entrance / exit is moving (gradient / no-fill would disable its pieces)
const inPieces = (env, it) => {
  const c = env.cut, en = J.ENTER[it.enter || c.enter], ex = J.EXIT[it.exit || c.exit];
  if (en && en.pieces && env.lt - (it.delay || 0) < c.inDur * 1.3 + 0.05) return true;
  if (ex && ex.pieces && c.outDur > 0 && env.lt > c.dur - c.outDur - 0.3) return true;
  return false;
};
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
    if (g.ch === ' ' || g.ch === '　') continue;
    if (it.charFn) { const c = it.charFn(g.i, g, lay.N); if (c && (c.hide || (c.a != null && c.a < 0.05))) continue; }
    const a0 = it.vertical ? (g.y - g.h / 2) * sy : (g.x - g.w / 2) * sx, a1 = it.vertical ? (g.y + g.h / 2) * sy : (g.x + g.w / 2) * sx;
    const L = map.get(g.li);
    if (!L) map.set(g.li, { li: g.li, a0, a1, c: it.vertical ? g.x * sx : g.y * sy });
    else { L.a0 = Math.min(L.a0, a0); L.a1 = Math.max(L.a1, a1); }
  }
  return [...map.values()];
};
// visible glyphs in item space, following the per-glyph motion (dx/dy/scale/rotation) of enter / hold / exit
const glyphList = (it) => {
  const lay = J.layoutText(it), sx = it.sx || 1, sy = it.sy || 1, out = [];
  for (const g of lay) {
    if (g.ch === ' ' || g.ch === '　') continue;
    const c = it.charFn ? it.charFn(g.i, g, lay.N) : null;
    if (c && c.hide) continue;
    out.push({ g, x: g.x * sx + ((c && c.dx) || 0), y: g.y * sy + ((c && c.dy) || 0), w: g.w * sx, h: g.h * sy,
      s: c && c.s != null ? c.s : 1, rot: (c && c.rot) || 0, a: c && c.a != null ? c.a : 1 });
  }
  return out;
};
// fraction (0..1) of each glyph centre along its line — used to flip the colour of glyphs a marker has reached
const lineFracs = (it) => {
  const lay = J.layoutText(it), ext = new Map(), fr = [];
  for (const g of lay) {
    const p = it.vertical ? g.y : g.x, h = (it.vertical ? g.h : g.w) / 2;
    const e = ext.get(g.li) || { a: 1e9, b: -1e9 }; e.a = Math.min(e.a, p - h); e.b = Math.max(e.b, p + h); ext.set(g.li, e);
  }
  for (const g of lay) { const e = ext.get(g.li), p = it.vertical ? g.y : g.x; fr[g.i] = (p - e.a) / Math.max(1, e.b - e.a); }
  return fr;
};

/* ================= TREATMENTS ================= */
reg('treat', 'outline', { name: '袋文字', tags: ['graphic', 'pop', 'glitch', 'emotional'], w: 1.2,
  plan: rng => ({ k: rng.range(0.022, 0.038) }),
  apply(env, it, P) {
    if (!alive(it, 0.5) || inPieces(env, it)) return;
    it.strokeColor = colOf(env, it); it.fill = false;
    sized(it, env, i => { i.stroke = Math.max(1.4, i.size * (P.k || 0.03)); });
  } });

reg('treat', 'outlineFill', { name: '縁取り', tags: ['pop', 'graphic'], w: 1,
  plan: rng => ({ k: rng.range(0.075, 0.12), c: rng.int(0, 2) }),
  apply(env, it, P) {
    if (!alive(it)) return;
    const sc = env.sc, col = colOf(env, it);
    it.strokeColor = P.c === 2 ? firstOK([sc.accent2, sc.accent], c => ctr(c, col) >= 1.8, accentFor(sc, col, 1.8)) : accentFor(sc, col, 1.8);
    it.strokeUnder = true;
    sized(it, env, i => { i.stroke = Math.max(2, i.size * (P.k || 0.09)); });
  } });

reg('treat', 'doubleOutline', { name: '二重縁', tags: ['pop', 'graphic'], w: 0.7,
  plan: rng => ({ a: rng.range(0.07, 0.09), b: rng.range(0.08, 0.11) }),
  apply(env, it, P) {
    if (!alive(it)) return;
    const sc = env.sc, col = colOf(env, it);
    const ring = accentFor(sc, col, 1.6);
    const gap = ctr(sc.bg, col) >= 1.5 && ctr(sc.bg, ring) >= 1.3 ? sc.bg : best([sc.ink, sc.fg, '#000000', '#FFFFFF'], ring);
    it.strokeColor = gap; it.strokeUnder = true;
    sized(it, env, i => { i.stroke = Math.max(2, i.size * P.a); });
    addPre(it, (e, i) => {                       // outer ring: thick stroke-only copy under the item
      const c = Object.assign({}, i, { pre: null, post: null, echo: null, streak: null, shadow: null, extrude: null, pattern: null, gradient: null,
        fill: false, strokeUnder: false, strokeDash: null, stroke: Math.max(4, i.size * (P.a + P.b)), strokeColor: ring, wipeBar: null, cursorAt: null });
      withFx(e, i, () => J.drawItem(e, c), false);
    });
  } });

reg('treat', 'extrude', { name: '立体', tags: ['pop', 'graphic'], w: 0.9,
  plan: rng => ({ d: rng.range(0.09, 0.13), dir: rng.pick([[1, 1], [1, 1], [-1, 1], [1, 0.55]]), c: rng.int(0, 1) }),
  apply(env, it, P) {
    if (!alive(it)) return;
    const sc = env.sc, col = colOf(env, it), N = glyphN(it.text);
    const base = P.c ? firstOK([sc.ink, sc.accent2], c => ctr(c, col) >= 1.6 && ctr(c, sc.bg) >= 1.4, accentFor(sc, col, 1.6)) : accentFor(sc, col, 1.6);
    const ec = J.mix(base, '#000000', isDark(sc.bg) ? 0.3 : 0.2);
    sized(it, env, i => { const L = i.size * P.d; i.extrude = { n: clamp(Math.round(L / 2.5), 4, N > 10 ? 12 : 22), dx: P.dir[0] * L, dy: P.dir[1] * L, color: ec }; });
  } });

reg('treat', 'longShadow', { name: '長い影', tags: ['pop', 'graphic'], w: 0.6,
  plan: rng => ({ L: rng.range(0.35, 0.65), ang: rng.pick([45, 45, 35, 60, 135]) }),
  apply(env, it, P) {
    if (!alive(it)) return;
    const sc = env.sc, col = colOf(env, it), N = glyphN(it.text);
    const sh = isDark(sc.bg) ? J.mix(sc.bg, accentFor(sc, col, 1.5), 0.5) : J.mix(sc.bg, sc.fg, 0.28);
    const ca = Math.cos(P.ang * DEG), sa = Math.sin(P.ang * DEG);
    sized(it, env, i => { const L = i.size * P.L; i.extrude = { n: clamp(Math.round(L / Math.max(2, i.size * 0.018)), 10, N > 10 ? 14 : 24), dx: ca * L, dy: sa * L, color: sh, fade: true, a: 0.9 }; });
  } });

reg('treat', 'hardShadow', { name: 'ずらし影', tags: ['pop', 'graphic', 'glitch'], w: 1,
  plan: rng => ({ d: rng.range(0.05, 0.085), dir: rng.pick([[1, 1], [1, 1], [-1, 1], [1, -1], [0.45, 1]]) }),
  apply(env, it, P) {
    if (!alive(it)) return;
    const sh = accentFor(env.sc, colOf(env, it), 1.6);
    sized(it, env, i => { const L = i.size * P.d; i.extrude = { n: 1, dx: P.dir[0] * L, dy: P.dir[1] * L, color: sh }; });
  } });

reg('treat', 'softShadow', { name: 'ぼかし影', tags: ['calm', 'emotional', 'editorial'], w: 0.8, safe: true,
  plan: rng => ({ b: rng.range(0.08, 0.14), dy: rng.range(0.03, 0.07) }),
  apply(env, it, P) {
    if (!alive(it)) return;
    const sc = env.sc;
    const c = isDark(sc.bg) ? J.rgba(J.mix(sc.bg, sc.accent, 0.45), 0.75) : J.rgba(J.mix(sc.fg, '#000000', 0.5), 0.36);
    sized(it, env, i => { i.shadow = { color: c, blur: i.size * P.b, dx: i.size * 0.02, dy: i.size * P.dy }; });
  } });

/* soft halo: the item is drawn small into a reusable offscreen canvas, blurred there and scaled back up
   (cost does not grow with the blur radius, unlike canvas shadows / filters on the full frame) */
const HALO = {};
const haloCv = (k, w, h) => {
  let c = HALO[k];
  if (!c) { c = HALO[k] = document.createElement('canvas'); c.width = c.height = 64; }
  if (c.width < w || c.height < h) { c.width = Math.max(c.width, w); c.height = Math.max(c.height, h); }
  return c;
};
const halo = (e, i, col, b, dk) => {
  const m = J.measure(i), s = i.size, hw0 = m.w / 2, hh0 = m.h / 2;
  let cx = i.x, cy = i.y;
  if (i.vertical) { if (i.align === 'left') cy += hh0; }
  else if (i.align === 'left') cx += hw0; else if (i.align === 'right') cx -= hw0;
  let hw = hw0, hh = hh0;
  if (i.rot) { const r = Math.hypot(hw0, hh0), a = i.rot * DEG, dx = cx - i.x, dy = cy - i.y; cx = i.x + dx * Math.cos(a) - dy * Math.sin(a); cy = i.y + dx * Math.sin(a) + dy * Math.cos(a); hw = hh = r; }
  const pad = s * b * 2.2 + s * 0.1, x0 = cx - hw - pad, y0 = cy - hh - pad, Wd = (hw + pad) * 2, Hd = (hh + pad) * 2;
  const q = Math.min((e.scale || 1) * 0.25, 900 / Math.max(Wd, Hd)), wp = Math.max(2, Math.ceil(Wd * q)), hp = Math.max(2, Math.ceil(Hd * q));
  const A = haloCv('a', wp, hp), B = haloCv('b', wp, hp), ax = A.getContext('2d'), bx = B.getContext('2d');
  ax.setTransform(1, 0, 0, 1, 0, 0); ax.clearRect(0, 0, wp + 2, hp + 2); ax.setTransform(q, 0, 0, q, -x0 * q, -y0 * q);
  const c = Object.assign({}, i, { pre: null, post: null, echo: null, streak: null, shadow: null, extrude: null, pattern: null, gradient: null, pieceFn: null, dash: null, strokeDash: null,
    blur: 0, blend: null, alpha: 1, fill: true, color: col, strokeColor: col, stroke: s * 0.07, strokeUnder: false, _lay: null });
  J.drawItem({ ctx: ax, pass: 'main', scale: q, allowFilter: false }, c);
  bx.setTransform(1, 0, 0, 1, 0, 0); bx.clearRect(0, 0, wp + 2, hp + 2);
  bx.filter = `blur(${Math.max(1, s * b * q * 0.9).toFixed(1)}px)`; bx.drawImage(A, 0, 0, wp, hp, 0, 0, wp, hp); bx.filter = 'none';
  const ctx = e.ctx;
  ctx.save(); ctx.globalAlpha = (i.alpha ?? 1) * (dk ? 1 : 0.75); if (dk) ctx.globalCompositeOperation = 'screen';
  ctx.drawImage(B, 0, 0, wp, hp, x0, y0, Wd, Hd); if (dk) ctx.drawImage(B, 0, 0, wp, hp, x0, y0, Wd, Hd);
  ctx.restore();
};
reg('treat', 'glow', { name: '発光', tags: ['emotional', 'calm', 'glitch'], w: 0.9, safe: true,
  plan: rng => ({ b: rng.range(0.16, 0.26), self: rng.chance(0.5) }),
  apply(env, it, P) {
    if (!alive(it)) return;
    const sc = env.sc, col = colOf(env, it), dk = isDark(sc.bg);
    const gc = dk ? firstOK(P.self ? [col, sc.accent, sc.accent2] : [sc.accent, sc.accent2, col], c => J.lum(c) > J.lum(sc.bg) + 0.2, col)
      : firstOK([sc.accent, sc.accent2, sc.ghostA, sc.ghostB], c => ctr(c, sc.bg) >= 2 && J.lum(c) > 0.08 && ctr(c, col) >= 1.4, col);
    const small = i => i.size < Math.min(env.W, env.H) * 0.09;   // small items: a plain canvas shadow is cheap and enough
    sized(it, env, (i, e) => { i.shadow = e.allowFilter && !small(i) ? null : { color: J.rgba(gc, 0.95), blur: i.size * P.b * 0.6, dx: 0, dy: 0 }; });
    addPre(it, (e, i) => { if (e.pass === 'main' && e.allowFilter && !small(i)) withFx(e, i, () => halo(e, i, gc, P.b * (0.9 + 0.1 * Math.sin(e.ltb * 3.2)), dk), false); });
  } });

reg('treat', 'marker', { name: 'マーカー', tags: ['pop', 'graphic', 'editorial'], w: 1,
  plan: rng => ({ v: rng.pick(['box', 'box', 'skew', 'half']), c: rng.int(0, 1) }),
  apply(env, it, P) {
    if (!alive(it, 0.9)) return;
    const sc = env.sc, col = colOf(env, it), half = P.v === 'half';
    const box = half ? J.fitContrast(firstOK([sc.accent, sc.accent2], c => ctr(c, col) >= 2, sc.accent), col, 2.2)
      : firstOK(P.c ? [sc.accent2, sc.accent, sc.ink, sc.fg] : [sc.accent, sc.accent2, sc.ink, sc.fg], c => ctr(c, sc.bg) >= 2.2, sc.fg);
    const tc = half ? col : textOn(box, col, sc);
    const prog = (e, li) => [E.inCubic(e.pOut), E.outExpo(inP(e, it, li * 0.07, 0.32))];
    if (tc !== col) {
      const fr = lineFracs(it);
      it.charFns.push((gi, g) => { const [o, q] = prog(env, g.li); const f = fr[gi] ?? 0.5; return f >= o && f <= q ? { color: tc } : null; });
    }
    addPre(it, (e, i) => withFx(e, i, () => {
      const s = i.size, sx = i.sx || 1, sy = i.sy || 1, a = i.alpha ?? 1;
      for (const L of lineSpans(i)) {
        const [o, q] = prog(e, L.li);
        if (q <= 0 || o >= 1) continue;
        const pad = s * 0.14, a0 = L.a0 - pad, len = L.a1 + pad - a0, p0 = a0 + len * o, p1 = a0 + len * q;
        if (p1 - p0 < 1) continue;
        const th = s * (i.vertical ? sx : sy) * (half ? 0.52 : 1.08);
        const c0 = half ? L.c + s * (i.vertical ? sx : sy) * 0.02 : L.c - th / 2;
        if (!i.vertical) {
          if (P.v === 'skew') { const k = th * 0.22; e.poly([[p0 + k, c0], [p1 + k, c0], [p1 - k, c0 + th], [p0 - k, c0 + th]], box, a, true); }
          else e.rect(p0, c0, p1 - p0, th, box, half ? a * 0.92 : a, true);
        } else {
          if (P.v === 'skew') { const k = th * 0.22; e.poly([[c0, p0 - k], [c0 + th, p0 + k], [c0 + th, p1 + k], [c0, p1 - k]], box, a, true); }
          else e.rect(c0, p0, th, p1 - p0, box, half ? a * 0.92 : a, true);
        }
      }
    }));
  } });

reg('treat', 'underline', { name: '下線', tags: ['editorial', 'calm', 'graphic'], w: 0.8,
  plan: rng => ({ v: rng.pick(['bar', 'bar', 'double', 'wave']), k: rng.range(0.05, 0.075) }),
  apply(env, it, P) {
    if (!alive(it, 0.9) || glyphN(it.text) < 2) return;
    const lc = markCol(env.sc, colOf(env, it));
    addPost(it, (e, i) => withFx(e, i, () => {
      const s = i.size, a = i.alpha ?? 1, o = E.inCubic(e.pOut), cross = s * (i.vertical ? (i.sx || 1) : (i.sy || 1));
      lineSpans(i).forEach((L, k) => {
        const q = E.outExpo(inP(e, i, 0.08 + k * 0.08, 0.45));
        if (q <= 0 || o >= 1) return;
        const a0 = L.a0 - s * 0.04, len = L.a1 + s * 0.04 - a0, p0 = a0 + len * o, p1 = a0 + len * q;
        if (p1 - p0 < 1) return;
        const off = L.c + cross * 0.6, th = Math.max(2, s * P.k);
        const pt = (u, d) => (i.vertical ? [off + d, u] : [u, off + d]);
        if (P.v === 'wave') {
          const pts = [], wl = s * 0.32, m = Math.min(160, Math.ceil((p1 - p0) / (wl / 8)) + 1);
          for (let j = 0; j < m; j++) { const u = p0 + (p1 - p0) * j / (m - 1); pts.push(pt(u, Math.sin((u - a0) / wl * TAU) * th * 0.7)); }
          e.line(pts, lc, th * 0.75, a, false);
        } else if (P.v === 'double') {
          e.line([pt(p0, -th * 0.55), pt(p1, -th * 0.55)], lc, th * 0.42, a, false);
          e.line([pt(p0, th * 0.55), pt(p1, th * 0.55)], lc, th * 0.42, a, false);
        } else e.line([pt(p0, 0), pt(p1, 0)], lc, th, a, false);
      });
    }));
  } });

reg('treat', 'strike', { name: '取り消し線', tags: ['glitch', 'editorial', 'emotional'], w: 0.5,
  plan: rng => ({ v: rng.pick(['one', 'one', 'two']), ang: rng.range(-4, 4), k: rng.range(0.06, 0.085) }),
  apply(env, it, P) {
    if (!alive(it, 0.9)) return;
    const sc = env.sc, lc = accentFor(sc, colOf(env, it), 1.8);
    addPost(it, (e, i) => withFx(e, i, () => {
      const s = i.size, a = i.alpha ?? 1, o = E.inCubic(e.pOut), ctx = e.ctx;
      lineSpans(i).forEach((L, k) => {
        const q = E.outExpo(inP(e, i, e.cut.inDur * 0.7 + k * 0.1, 0.3));
        if (q <= 0 || o >= 1) return;
        const a0 = L.a0 - s * 0.08, len = L.a1 + s * 0.08 - a0, p0 = a0 + len * o, p1 = a0 + len * q;
        if (p1 - p0 < 1) return;
        const th = Math.max(2, s * P.k), mid = (L.a0 + L.a1) / 2;
        ctx.save();
        if (i.vertical) { ctx.translate(L.c, mid); ctx.rotate(P.ang * DEG); } else { ctx.translate(mid, L.c + s * 0.02); ctx.rotate(P.ang * DEG); }
        const pt = (u, d) => (i.vertical ? [d, u - mid] : [u - mid, d]);
        if (P.v === 'two') { e.line([pt(p0, -th * 0.8), pt(p1, -th * 0.8)], lc, th * 0.6, a, true); e.line([pt(p0, th * 0.8), pt(p1, th * 0.8)], lc, th * 0.6, a, true); }
        else e.line([pt(p0, 0), pt(p1, 0)], lc, th, a, true);
        ctx.restore();
      });
    }));
  } });

reg('treat', 'boxed', { name: '箱組', tags: ['graphic', 'editorial', 'pop'], w: 0.7,
  plan: rng => ({ v: rng.pick(['solid', 'solid', 'alt', 'frame']) }),
  apply(env, it, P) {
    if (!alive(it, 0.9)) return;
    const sc = env.sc, col = colOf(env, it), frame = P.v === 'frame', off = it.mi | 0;
    const boxA = firstOK([sc.ink, sc.fg, sc.accent], c => ctr(c, sc.bg) >= 2.2, sc.fg);
    const boxB = P.v === 'alt' ? firstOK([sc.accent, sc.accent2], c => ctr(c, boxA) >= 1.5 && ctr(c, sc.bg) >= 1.8, boxA) : boxA;
    const tcA = frame ? col : textOn(boxA, sc.bg, sc), tcB = frame ? col : textOn(boxB, sc.bg, sc);
    const qOf = (e, gi) => E.outBack(clamp((e.lt - (it.delay || 0) - gi * 0.035) / 0.24), 1.7) * (1 - E.inCubic(clamp(e.pOut * 1.4 - gi * 0.03)));
    const alt = gi => P.v === 'alt' && (gi + off) % 2 === 1;
    if (!frame) it.charFns.push(gi => (qOf(env, gi) > 0.55 ? { color: alt(gi) ? tcB : tcA } : null));
    addPre(it, (e, i) => withFx(e, i, () => {
      const s = i.size, sx = i.sx || 1, sy = i.sy || 1, a = i.alpha ?? 1, ctx = e.ctx;
      for (const G of glyphList(i)) {
        const q = qOf(e, G.g.i);
        if (q <= 0.01) continue;
        const w = i.vertical ? s * sx * 1.02 : Math.max(G.w * 0.94, s * sx * 0.42), h = i.vertical ? Math.max(G.h * 0.94, s * sy * 0.42) : s * sy * 1.02;
        const c = alt(G.g.i) ? boxB : boxA;
        ctx.save(); ctx.translate(G.x, G.y); if (G.rot) ctx.rotate(G.rot * DEG); ctx.scale(G.s * q, G.s * q);
        if (frame) e.rrect(-w / 2, -h / 2, w, h, 0, null, a * G.a, true, c, Math.max(1.5, s * 0.035));
        else e.rect(-w / 2, -h / 2, w, h, c, a * G.a, true);
        ctx.restore();
      }
    }));
  } });

const twoTone = (sc, col) => firstOK([sc.accent, sc.accent2, sc.ghostA, sc.ghostB], c => ctr(c, col) >= 1.5 && ctr(c, sc.bg) >= 2, J.mix(col, sc.bg, 0.45));
reg('treat', 'gradientV', { name: '縦グラデ', tags: ['emotional', 'pop'], w: 0.9,
  plan: rng => ({ up: rng.chance(0.4), g: rng.chance(0.5) }),
  apply(env, it, P) {
    if (!alive(it) || inPieces(env, it)) return;
    const sc = env.sc, col = colOf(env, it);
    const g = P.g && sc.grad && sc.grad.every(c => ctr(c, sc.bg) >= 1.6) ? sc.grad.slice() : [col, twoTone(sc, col)];
    if (P.up) g.reverse();
    it.gradient = g;
  } });

reg('treat', 'splitColor', { name: '上下二色', tags: ['pop', 'graphic'], w: 0.8,
  plan: rng => ({ sp: rng.range(0.5, 0.57), top: rng.chance(0.35) }),
  apply(env, it, P) {
    if (!alive(it) || inPieces(env, it)) return;
    const sc = env.sc, col = colOf(env, it), c2 = twoTone(sc, col);
    const a = P.top ? c2 : col, b = P.top ? col : c2;
    it.gradient = [[0, a], [P.sp, a], [P.sp, b], [1, b]];
  } });

const patternTreat = (kind, alt) => function (env, it, P) {
  if (!alive(it)) return;
  const sc = env.sc, col = colOf(env, it);
  it.pattern = P.v === 'lines' && alt ? alt : kind; it.patternColor = col;
  if (P.v === 'duo') it.patternBg = accentFor(sc, col, 1.6);
  else { it.patternBg = J.mix(col, sc.bg, 0.62); it.strokeColor = col; sized(it, env, i => { i.stroke = Math.max(1.2, i.size * 0.018); }); }
};
reg('treat', 'halftone', { name: '網点', tags: ['pop', 'graphic'], w: 0.7, plan: rng => ({ v: rng.pick(['tone', 'tone', 'duo']) }), apply: patternTreat('dots') });
reg('treat', 'stripes', { name: 'ストライプ', tags: ['pop', 'graphic'], w: 0.6, plan: rng => ({ v: rng.pick(['tone', 'duo', 'lines']) }), apply: patternTreat('stripes', 'lines') });
reg('treat', 'hatch', { name: '斜線', tags: ['graphic', 'editorial', 'glitch'], w: 0.5, plan: rng => ({ v: rng.pick(['tone', 'tone', 'duo']) }), apply: patternTreat('hatch') });

reg('treat', 'dotted', { name: '点線輪郭', tags: ['calm', 'editorial', 'graphic'], w: 0.5,
  plan: rng => ({ k: rng.range(0.03, 0.04), spd: rng.pick([0, 1, 1]) }),
  apply(env, it, P) {
    if (!alive(it, 0.5) || inPieces(env, it)) return;
    it.strokeColor = colOf(env, it); it.fill = false;
    sized(it, env, (i, e) => {
      const s = i.size, a = s * 0.05, g = s * 0.036, per = a + g;
      i.stroke = Math.max(1.6, s * P.k);
      const off = P.spd ? ((e.ltb * s * 0.22) % per + per) % per : 0;
      i.strokeDash = off < a ? [a - off, g, off, 0] : [0, g - (off - a), a, off - a];
    });
  } });

reg('treat', 'alternate', { name: '交互色', tags: ['pop', 'graphic'], w: 0.8,
  plan: rng => ({ v: rng.pick(['alt', 'alt', 'kanji']) }),
  apply(env, it, P) {
    if (!alive(it)) return;
    const sc = env.sc, col = colOf(env, it), c2 = accentFor(sc, col, 1.6);
    const chars = [...it.text].filter(c => c.trim());
    const isK = c => J.isKanji(c) || J.isKata(c);
    const mixed = chars.some(isK) && chars.some(c => !isK(c));
    if (P.v === 'kanji' && (mixed || chars.length === 1)) it.charFns.push((gi, g) => (isK(g.ch) ? { color: c2 } : null));
    else { const off = it.mi | 0; it.charFns.push((gi) => ((gi + off) % 2 ? { color: c2 } : null)); }
  } });

reg('treat', 'italic', { name: '斜体', tags: ['editorial', 'pop', 'emotional'], w: 0.8, safe: true,
  plan: rng => ({ a: rng.range(10, 15) }),
  apply(env, it, P) {
    if (!it.text) return;
    if (it.vertical) { const r = P.a * 0.65; it.charFns.push(() => ({ rot: r })); }
    else it.skew = (it.skew || 0) - P.a;
  } });

reg('treat', 'wide', { name: '平体', tags: ['graphic', 'pop'], w: 0.7, safe: true,
  apply(env, it) {
    if (!it.text) return;
    if (!it.vertical) {            // keep lines that fitted the frame inside it
      const w0 = J.measure(it).w, lim = env.W * 0.9;
      it.sx = (it.sx || 1) * 1.1;
      if (w0 <= lim && w0 * 1.1 > lim) it.size *= lim / (w0 * 1.1);
    }
    it.sy = (it.sy || 1) * 0.84;
  } });

reg('treat', 'tall', { name: '長体', tags: ['editorial', 'calm', 'graphic', 'emotional'], w: 0.7, safe: true,
  apply(env, it) {
    if (!it.text) return;
    it.sx = (it.sx || 1) * 0.8;
    if (it.vertical) it.sy = (it.sy || 1) * 1.02;
    else { it.sy = (it.sy || 1) * 1.05; it.size *= 1.05; }
  } });

reg('treat', 'echoOutline', { name: '輪郭の残響', tags: ['glitch', 'emotional', 'graphic'], w: 0.7,
  plan: rng => ({ v: rng.pick(['diag', 'diag', 'zoom', 'rise', 'side']), n: rng.int(3, 4), d: rng.range(0.045, 0.07) }),
  apply(env, it, P) {
    if (!alive(it)) return;
    const c = accentFor(env.sc, colOf(env, it), 1.4);
    sized(it, env, (i, e) => {
      const amt = E.outCubic(inP(e, i, 0.05, 0.45)) * (1 - E.inCubic(e.pOut)) * (0.85 + 0.15 * Math.sin(e.ltb * 3.4));
      if (amt <= 0.01) { i.echo = null; return; }
      const d = i.size * P.d * amt, o = { n: P.n, a: 0.8, decay: 0.72, outline: true, color: c };
      if (P.v === 'zoom') o.scale = 1 + 0.035 * amt;
      else if (P.v === 'rise') o.dy = -d * 1.2;
      else if (P.v === 'side') o.dx = d * 1.3;
      else { o.dx = d; o.dy = d; }
      i.echo = o;
    });
  } });

reg('treat', 'emphasisDots', { name: '傍点', tags: ['editorial', 'emotional', 'calm'], w: 0.8,
  plan: rng => ({ v: rng.pick(['dot', 'dot', 'sesame', 'ring']) }),
  apply(env, it, P) {
    if (!alive(it, 0.9)) return;
    const dc = markCol(env.sc, colOf(env, it));
    addPost(it, (e, i) => withFx(e, i, () => {
      if (e.pass !== 'main') return;
      const s = i.size, sx = i.sx || 1, sy = i.sy || 1, a = i.alpha ?? 1, o = 1 - E.inCubic(e.pOut), ctx = e.ctx;
      for (const G of glyphList(i)) {
        if (J.isPunct(G.g.ch)) continue;
        const q = E.outBack(inP(e, i, e.cut.inDur * 0.45 + G.g.i * 0.04, 0.22), 2.2) * o;
        if (q <= 0.01) continue;
        const r = s * 0.07 * G.s * q * Math.min(sx, sy);
        const x = i.vertical ? G.x + s * sx * 0.64 * G.s : G.x, y = i.vertical ? G.y : G.y - s * sy * 0.64 * G.s;
        if (P.v === 'ring') e.circle(x, y, r * 0.85, null, dc, Math.max(1, r * 0.42), a * G.a, false);
        else if (P.v === 'sesame') { ctx.save(); ctx.globalAlpha = a * G.a; ctx.fillStyle = dc; ctx.beginPath(); ctx.ellipse(x, y, r * 1.25, r * 0.6, -40 * DEG, 0, TAU); ctx.fill(); ctx.restore(); }
        else e.circle(x, y, r, dc, null, 0, a * G.a, false);
      }
    }));
  } });

/* ================= BACKGROUNDS ================= */
const layC = (sc, k) => J.mix(sc.bg, sc.fg, k);        // faint layer tone, k ≈ 0.05..0.15
const tintC = (sc, k) => J.mix(sc.bg, sc.accent, k);   // faint accent tone
const Umin = env => Math.min(env.W, env.H);
const bs = rng => rng.int(1, 1e9);
// time since this background started (runs of consecutive cuts with the same bg count as one)
const bgRun = new WeakMap();
const bgT = env => {
  const c = env.cut; if (!c) return env.t;
  let s = bgRun.get(c);
  if (s == null) {
    s = c.start;
    const cs = (env.plan && env.plan.cuts) || [], P0 = c.bgP || {};
    for (let i = (c.index | 0) - 1; i >= 0 && i < cs.length; i--) {
      const p = cs[i];
      if (p.bg === c.bg && (p.bgP || {}).seed === P0.seed && Math.abs(p.end - s) < 0.06) s = p.start; else break;
    }
    bgRun.set(c, s);
  }
  return env.t - s;
};
const wrap = (v, m) => ((v % m) + m) % m;
const bgReg = (k, d) => reg('bg', k, Object.assign({}, d, { draw(env, P) { const ctx = env.ctx; ctx.save(); try { d.draw(env, P || {}, ctx); } finally { ctx.restore(); } } }));

bgReg('sunburst', { name: '放射', tags: ['pop', 'graphic'], w: 0.8,
  plan: rng => ({ seed: bs(rng), n: rng.pick([12, 16, 20, 24]), cx: rng.pick([0.5, 0.5, 0.3, 0.7]), cy: rng.pick([0.5, 0.5, 0.62, 1.05]), spd: rng.range(3, 7) * rng.pick([1, -1]), k: rng.range(0.07, 0.1) }),
  draw(env, P, ctx) {
    const { W, H, sc } = env, cx = W * (P.cx ?? 0.5), cy = H * (P.cy ?? 0.5), n = P.n || 16;
    const e = E.outCubic(clamp(bgT(env) / 0.5)), R = Math.hypot(W, H) * 1.1 * (0.25 + 0.75 * e);
    const rot = (env.t * (P.spd || 4) + (1 - e) * 25) * DEG, w = TAU / n * 0.5;
    ctx.fillStyle = layC(sc, P.k || 0.08); ctx.beginPath();
    for (let i = 0; i < n; i++) { const a0 = rot + i / n * TAU; ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a0) * R, cy + Math.sin(a0) * R); ctx.lineTo(cx + Math.cos(a0 + w) * R, cy + Math.sin(a0 + w) * R); ctx.closePath(); }
    ctx.fill();
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Umin(env) * 0.55);
    g.addColorStop(0, J.rgba(sc.bg, 0.85)); g.addColorStop(1, J.rgba(sc.bg, 0));
    const rr = Umin(env) * 0.55; ctx.fillStyle = g; ctx.fillRect(cx - rr, cy - rr, rr * 2, rr * 2);
  } });

bgReg('concentric', { name: '同心円', tags: ['calm', 'graphic', 'emotional'], w: 0.9,
  plan: rng => ({ seed: bs(rng), gap: rng.range(0.07, 0.11), spd: rng.range(0.15, 0.35) * rng.pick([1, 1, -1]), k: rng.range(0.08, 0.12), cy: rng.pick([0.5, 0.5, 0.58]) }),
  draw(env, P, ctx) {
    const { W, H, sc } = env, cx = W / 2, cy = H * (P.cy || 0.5), gap = Umin(env) * (P.gap || 0.09);
    const ph = wrap(env.t * (P.spd || 0.2), 1);
    const pulse = env.beat ? Math.exp(-env.beat.since * 5) : 0.5 + 0.5 * Math.sin(env.t * TAU * 0.5);
    const Rm = Math.hypot(W, H) * 0.6, e = E.outCubic(clamp(bgT(env) / 0.6));
    ctx.lineWidth = gap * (0.14 + 0.1 * pulse); ctx.strokeStyle = layC(sc, (P.k || 0.1) * (0.8 + 0.4 * pulse)); ctx.beginPath();
    for (let r = ph * gap; r < Rm * e; r += gap) { if (r < 2) continue; ctx.moveTo(cx + r, cy); ctx.arc(cx, cy, r, 0, TAU); }
    ctx.stroke();
  } });

// halftone field is pre-rendered once per line / size / colour (drawing ~2000 dots every frame is too slow) and scrolled by < 1 cell
const htCache = new Map();
bgReg('halftoneFade', { name: '網点グラデ', tags: ['pop', 'graphic', 'editorial'], w: 1,
  plan: rng => ({ seed: bs(rng), dir: rng.pick([0, 45, 90, 135, 180, 225, 270, 315]), cell: rng.range(0.032, 0.045), k: rng.range(0.12, 0.17) }),
  draw(env, P, ctx) {
    const { W, H, sc } = env, cell = Umin(env) * (P.cell || 0.032), col = layC(sc, P.k || 0.14), q = Math.min(1, env.scale || 1);
    const key = [P.seed, W, H, q.toFixed(3), col, P.dir, P.cell].join('|');
    let cv = htCache.get(key);
    if (!cv) {
      if (htCache.size > 2) htCache.clear();
      const Wc = W + cell * 2, Hc = H + cell * 2;
      cv = document.createElement('canvas'); cv.width = Math.ceil(Wc * q); cv.height = Math.ceil(Hc * q);
      const x = cv.getContext('2d'), ang = (P.dir || 0) * DEG, dx = Math.cos(ang), dy = Math.sin(ang);
      const ext = Math.abs(dx) * W / 2 + Math.abs(dy) * H / 2;
      x.scale(q, q); x.fillStyle = col; x.beginPath();
      let row = 0;
      for (let y = 0; y < Hc + cell; y += cell * 0.866, row++) {
        for (let px = (row & 1) * cell / 2; px < Wc + cell; px += cell) {
          const u = ((px - cell - W / 2) * dx + (y - cell - H / 2) * dy) / ext, r = cell * 0.52 * J.smooth(-0.8, 1, u);
          if (r < cell * 0.06) continue;
          x.moveTo(px + r, y); x.arc(px, y, r, 0, TAU);
        }
      }
      x.fill();
      htCache.set(key, cv);
    }
    ctx.globalAlpha = E.outCubic(clamp(bgT(env) / 0.5));
    ctx.drawImage(cv, -cell * 2 + wrap(env.t * cell * 0.35, cell), -cell, W + cell * 2, H + cell * 2);
  } });

bgReg('bigStripes', { name: '大きな斜線', tags: ['graphic', 'pop'], w: 0.9,
  plan: rng => ({ seed: bs(rng), ang: rng.pick([30, 45, -30, -45, 60]), w: rng.range(0.06, 0.11), spd: rng.range(0.03, 0.08) * rng.pick([1, -1]), fill: rng.pick([0.5, 0.5, 0.3]), k: rng.range(0.05, 0.08) }),
  draw(env, P, ctx) {
    const { W, H, sc } = env, R = Math.hypot(W, H) / 2 + 10, per = Umin(env) * (P.w || 0.08) * 2;
    const e = E.outExpo(clamp(bgT(env) / 0.5)), off = wrap(env.t * Umin(env) * (P.spd || 0.05), per);
    ctx.translate(W / 2, H / 2); ctx.rotate((P.ang || 45) * DEG);
    ctx.fillStyle = layC(sc, P.k || 0.06); ctx.beginPath();
    for (let x = -R - per + off; x < R; x += per) ctx.rect(x, -R, per * (P.fill || 0.5) * e, 2 * R);
    ctx.fill();
  } });

const splitCol = (sc, P) => (P.c === 'tint' ? tintC(sc, (P.k || 0.08) * 1.8) : layC(sc, P.k || 0.08));
bgReg('splitV', { name: '左右二色', tags: ['graphic', 'editorial', 'pop'], w: 1,
  plan: rng => ({ seed: bs(rng), side: rng.pick([1, -1]), pos: rng.range(0.4, 0.6), c: rng.pick(['lay', 'lay', 'tint']), k: rng.range(0.08, 0.12) }),
  draw(env, P, ctx) {
    const { W, H, sc } = env, e = E.outExpo(clamp(bgT(env) / 0.5)), x = W * ((P.pos || 0.5) + 0.012 * Math.sin(env.t * 0.6));
    const right = (P.side || 1) > 0, edge = right ? J.lerp(W, x, e) : J.lerp(0, x, e);
    ctx.fillStyle = splitCol(sc, P);
    if (right) ctx.fillRect(edge, 0, W - edge + 1, H); else ctx.fillRect(-1, 0, edge + 1, H);
    ctx.globalAlpha = 0.6 * e; ctx.fillStyle = tintC(sc, 0.45); ctx.fillRect(edge - 1, 0, 2, H);
  } });

bgReg('splitH', { name: '上下二色', tags: ['graphic', 'editorial', 'calm'], w: 0.9,
  plan: rng => ({ seed: bs(rng), side: rng.pick([1, -1]), pos: rng.range(0.42, 0.6), c: rng.pick(['lay', 'lay', 'tint']), k: rng.range(0.08, 0.12) }),
  draw(env, P, ctx) {
    const { W, H, sc } = env, e = E.outExpo(clamp(bgT(env) / 0.5)), y = H * ((P.pos || 0.5) + 0.012 * Math.sin(env.t * 0.5));
    const low = (P.side || 1) > 0, edge = low ? J.lerp(H, y, e) : J.lerp(0, y, e);
    ctx.fillStyle = splitCol(sc, P);
    if (low) ctx.fillRect(0, edge, W, H - edge + 1); else ctx.fillRect(0, -1, W, edge + 1);
    ctx.globalAlpha = 0.6 * e; ctx.fillStyle = tintC(sc, 0.45); ctx.fillRect(0, edge - 1, W, 2);
  } });

bgReg('splitDiag', { name: '斜め二色', tags: ['graphic', 'pop'], w: 1,
  plan: rng => ({ seed: bs(rng), side: rng.pick([1, -1]), pos: rng.range(0.42, 0.58), ang: rng.range(14, 30) * rng.pick([1, -1]), c: rng.pick(['lay', 'lay', 'tint']), k: rng.range(0.08, 0.12) }),
  draw(env, P, ctx) {
    const { W, H, sc } = env, e = E.outExpo(clamp(bgT(env) / 0.5)), side = (P.side || 1) > 0 ? 1 : -1;
    const tn = Math.tan((P.ang || 20) * DEG), cx = W * (P.pos || 0.5) + (1 - e) * W * 0.9 * side + W * 0.01 * Math.sin(env.t * 0.5);
    const xt = cx - tn * H / 2, xb = cx + tn * H / 2, X = side > 0 ? W + 10 : -10;
    ctx.fillStyle = splitCol(sc, P); ctx.beginPath(); ctx.moveTo(xt, -1); ctx.lineTo(X, -1); ctx.lineTo(X, H + 1); ctx.lineTo(xb, H + 1); ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 0.6 * e; ctx.strokeStyle = tintC(sc, 0.45); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(xt, -1); ctx.lineTo(xb, H + 1); ctx.stroke();
  } });

bgReg('gradientSweep', { name: 'グラデ', tags: ['calm', 'emotional', 'pop'], w: 1, subtle: true,
  plan: rng => ({ seed: bs(rng), spd: rng.range(0.25, 0.5), k: rng.range(0.16, 0.26), c: rng.pick(['accent', 'accent', 'accent2', 'fg']), a0: rng.range(0, 6.28) }),
  draw(env, P, ctx) {
    const { W, H, sc } = env, ang = (P.a0 || 0) + env.t * 0.12, dx = Math.cos(ang), dy = Math.sin(ang), L = Math.hypot(W, H) / 2;
    const tint = J.mix(sc.bg, sc[P.c] || sc.accent, P.k || 0.2), p = 0.5 + 0.32 * Math.sin(env.t * (P.spd || 0.35));
    const g = ctx.createLinearGradient(W / 2 - dx * L, H / 2 - dy * L, W / 2 + dx * L, H / 2 + dy * L);
    g.addColorStop(0, J.rgba(tint, 0)); g.addColorStop(p, J.rgba(tint, 1)); g.addColorStop(1, J.rgba(tint, 0));
    ctx.globalAlpha = E.outCubic(clamp(bgT(env) / 0.6)); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  } });

bgReg('spotlight', { name: 'スポットライト', tags: ['emotional', 'calm', 'editorial'], w: 0.9, subtle: true,
  plan: rng => ({ seed: bs(rng), beam: rng.chance(0.6), k: rng.range(0.1, 0.16) }),
  draw(env, P, ctx) {
    const { W, H, sc } = env, t = env.t, s = P.seed || 1, U = Umin(env), dk = isDark(sc.bg);
    const cx = W * (0.5 + 0.2 * Math.sin(t * 0.31 + (s % 7))), cy = H * (0.52 + 0.08 * Math.sin(t * 0.23 + (s % 5))), R = U * 0.62;
    const e = E.outCubic(clamp(bgT(env) / 0.6)), lc = dk ? sc.fg : '#FFFFFF', k = (P.k || 0.12) * e;
    const g1 = ctx.createRadialGradient(cx, cy, R * 0.3, cx, cy, R * 1.7);
    g1.addColorStop(0, 'rgba(0,0,0,0)'); g1.addColorStop(1, `rgba(0,0,0,${((dk ? 0.35 : 0.14) * e).toFixed(3)})`);
    ctx.fillStyle = g1; ctx.fillRect(0, 0, W, H);
    const g2 = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
    g2.addColorStop(0, J.rgba(lc, k)); g2.addColorStop(0.6, J.rgba(lc, k * 0.5)); g2.addColorStop(1, J.rgba(lc, 0));
    ctx.fillStyle = g2; ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
    if (P.beam) {
      const tx = cx + (W / 2 - cx) * 0.5, g3 = ctx.createLinearGradient(0, 0, 0, cy);
      g3.addColorStop(0, J.rgba(lc, k * 0.7)); g3.addColorStop(1, J.rgba(lc, 0));
      ctx.fillStyle = g3; ctx.beginPath(); ctx.moveTo(tx - U * 0.04, -2); ctx.lineTo(tx + U * 0.04, -2); ctx.lineTo(cx + R * 0.75, cy); ctx.lineTo(cx - R * 0.75, cy); ctx.closePath(); ctx.fill();
    }
  } });

bgReg('tvBars', { name: 'テレビの帯', tags: ['glitch', 'graphic', 'emotional'], w: 0.6,
  plan: rng => ({ seed: bs(rng), n: rng.int(4, 7), spd: rng.range(0.05, 0.14), k: rng.range(0.06, 0.09) }),
  draw(env, P, ctx) {
    const { W, H, sc } = env, s = P.seed || 1, k = P.k || 0.07;
    for (let i = 0; i < (P.n || 5); i++) {
      const h = H * J.rr(0.02, 0.15, s, i, 1), v = H * (P.spd || 0.08) * (0.5 + J.r(s, i, 2));
      const y = wrap(env.t * v + J.r(s, i, 3) * H * 1.4, H * 1.4) - H * 0.2;
      ctx.fillStyle = i % 3 === 0 ? tintC(sc, k * 1.7) : layC(sc, k * (0.6 + 0.8 * J.r(s, i, 4)));
      ctx.fillRect(0, y, W, h);
      if (J.r(s, i, 5) < 0.5) { ctx.fillStyle = layC(sc, k * 1.4); ctx.fillRect(0, y - H * 0.012, W, Math.max(1.5, H * 0.002)); }
    }
  } });

bgReg('checker', { name: '市松', tags: ['graphic', 'pop'], w: 0.7,
  plan: rng => ({ seed: bs(rng), n: rng.int(5, 8), k: rng.range(0.04, 0.065), spd: rng.range(0.1, 0.25), rot: rng.pick([0, 0, 45]) }),
  draw(env, P, ctx) {
    const { W, H, sc } = env, cell = Umin(env) / (P.n || 6) * (P.rot ? 1.2 : 1), R = Math.hypot(W, H) / 2 + cell * 2;
    const off = wrap(env.t * cell * (P.spd || 0.15), cell * 2), n = Math.ceil(R / cell) + 2, e = E.outCubic(clamp(bgT(env) / 0.4));
    ctx.translate(W / 2, H / 2); ctx.rotate((P.rot || 0) * DEG);
    ctx.globalAlpha = e; ctx.fillStyle = layC(sc, P.k || 0.05); ctx.beginPath();
    for (let j = -n; j <= n; j++) for (let i = -n; i <= n; i++) if ((i + j) & 1) ctx.rect(i * cell + off - cell, j * cell + off - cell, cell, cell);
    ctx.fill();
  } });

bgReg('bigChar', { name: '巨大文字', tags: ['editorial', 'emotional', 'graphic', 'calm'], w: 1, subtle: true,
  plan: rng => ({ seed: bs(rng), side: rng.pick([-1, 1]), font: rng.pick(['display', 'serif']), outline: rng.chance(0.3), k: rng.range(0.07, 0.1) }),
  draw(env, P) {
    const { W, H, sc } = env, txt = String(env.cut.lineText || env.cut.text || '').replace(/\s+/g, '');
    const arr = [...txt], ch = arr.find(c => !J.isPunct(c)) || arr[0];
    if (!ch) return;
    const font = J.fontsOf(env.st, [P.font || 'display'])[0], side = P.side || 1;
    const e = E.outCubic(clamp(bgT(env) / 0.7)), size = Math.max(W, H) * 0.6 * (1.06 - 0.06 * e + 0.015 * Math.sin(env.t * 0.3));
    const it = { text: ch, font, size, x: W / 2 + side * W * 0.2 + Math.sin(env.t * 0.2) * W * 0.01, y: H * 0.53, rot: side * 4, color: layC(sc, P.k || 0.08), alpha: e, ghost: false };
    if (P.outline) Object.assign(it, { fill: false, stroke: Math.max(2, size * 0.006), strokeColor: layC(sc, (P.k || 0.08) * 2.4) });
    env.draw(it);
  } });

bgReg('speedLines', { name: '集中線', tags: ['pop', 'emotional', 'graphic'], w: 0.7,
  plan: rng => ({ seed: bs(rng), n: rng.int(90, 140), k: rng.range(0.2, 0.28), clear: rng.range(0.3, 0.36) }),
  draw(env, P, ctx) {
    const { W, H, sc } = env, s = P.seed || 1, st = env.step, n = P.n || 100, cx = W / 2, cy = H / 2;
    const e = E.outCubic(clamp(bgT(env) / 0.3)), rx = W * (P.clear || 0.38) * (1 + (1 - e) * 0.6), ry = H * (P.clear || 0.38) * 1.05 * (1 + (1 - e) * 0.6), R = Math.hypot(W, H) * 0.6;
    ctx.fillStyle = layC(sc, P.k || 0.16); ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const a = (i + J.r(s, i, st, 1) * 0.8) / n * TAU, f = 1 + J.r(s, i, st, 2) * 0.5, w = TAU / n * (0.15 + 0.45 * J.r(s, i, st, 3));
      ctx.moveTo(cx + Math.cos(a) * rx * f, cy + Math.sin(a) * ry * f);
      ctx.lineTo(cx + Math.cos(a - w / 2) * R, cy + Math.sin(a - w / 2) * R); ctx.lineTo(cx + Math.cos(a + w / 2) * R, cy + Math.sin(a + w / 2) * R); ctx.closePath();
    }
    ctx.fill();
  } });

bgReg('scanBars', { name: '走査線の帯', tags: ['calm', 'glitch', 'editorial'], w: 0.9, subtle: true,
  plan: rng => ({ seed: bs(rng), n: rng.int(2, 3), spd: rng.range(0.06, 0.12), k: rng.range(0.05, 0.08) }),
  draw(env, P, ctx) {
    const { W, H, sc } = env, s = P.seed || 1, k = P.k || 0.06;
    for (let i = 0; i < (P.n || 2); i++) {
      const h = H * (0.12 + 0.12 * J.r(s, i, 1)), y = wrap(env.t * H * (P.spd || 0.08) * (0.8 + 0.4 * J.r(s, i, 2)) + J.r(s, i, 3) * H * 1.5, H * 1.5) - H * 0.3;
      const g = ctx.createLinearGradient(0, y, 0, y + h);
      g.addColorStop(0, J.rgba(sc.fg, 0)); g.addColorStop(0.85, J.rgba(sc.fg, k)); g.addColorStop(1, J.rgba(sc.fg, 0));
      ctx.fillStyle = g; ctx.fillRect(0, y, W, h);
      ctx.fillStyle = J.rgba(sc.fg, k * 1.6); ctx.fillRect(0, y + h * 0.86, W, Math.max(1.5, H * 0.0018));
    }
  } });

bgReg('dotGrid', { name: 'ドット格子', tags: ['calm', 'editorial', 'graphic'], w: 1, subtle: true,
  plan: rng => ({ seed: bs(rng), sp: rng.range(0.045, 0.065), k: rng.range(0.22, 0.3), plus: rng.chance(0.4) }),
  draw(env, P, ctx) {
    const { W, H, sc } = env, s = P.seed || 1, U = Umin(env), sp = U * (P.sp || 0.055), r = Math.max(1.5, U * 0.0036);
    const mx = env.t * 0.15, my = env.t * 0.08, ox = wrap(mx * sp, sp), oy = wrap(my * sp, sp), bx = Math.floor(mx), by = Math.floor(my);
    const e = E.outCubic(clamp(bgT(env) / 0.5)), tw = Math.floor(env.t * 2);
    ctx.globalAlpha = e; ctx.fillStyle = layC(sc, P.k || 0.2); ctx.beginPath();
    const acc = [];
    for (let j = -1, y = oy - sp; y < H + sp; y += sp, j++) for (let i = -1, x = ox - sp; x < W + sp; x += sp, i++) {
      const id = J.h(s, i - bx, j - by);
      if (P.plus && (i - bx) % 4 === 0 && (j - by) % 4 === 0) { ctx.rect(x - r * 3, y - r * 0.5, r * 6, r); ctx.rect(x - r * 0.5, y - r * 3, r, r * 6); continue; }
      ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, TAU);
      if (J.r(id, tw) < 0.012) acc.push([x, y]);
    }
    ctx.fill();
    if (acc.length) { ctx.fillStyle = tintC(sc, 0.55); ctx.beginPath(); for (const [x, y] of acc) { ctx.moveTo(x + r * 2, y); ctx.arc(x, y, r * 2, 0, TAU); } ctx.fill(); }
  } });

bgReg('retroGrid', { name: 'レトロ格子', tags: ['pop', 'glitch', 'graphic'], w: 0.6,
  plan: rng => ({ seed: bs(rng), hz: rng.range(0.56, 0.64), spd: rng.range(0.4, 0.8), sun: rng.chance(0.4), k: rng.range(0.38, 0.5) }),
  draw(env, P, ctx) {
    const { W, H, sc } = env, yh = H * (P.hz || 0.6), col = tintC(sc, P.k || 0.35), e = E.outCubic(clamp(bgT(env) / 0.6));
    if (P.sun) {
      const R = Math.min(W, H) * 0.2, sy = yh - R * 0.35;
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, yh); ctx.clip();
      ctx.fillStyle = tintC(sc, (P.k || 0.35) * 0.45); ctx.beginPath(); ctx.arc(W / 2, sy, R * e, 0, TAU); ctx.fill();
      ctx.fillStyle = sc.bg; for (let i = 0; i < 5; i++) { const yy = sy + R * (0.1 + i * 0.18), hh = R * 0.03 * (1 + i * 0.6); ctx.fillRect(W / 2 - R, yy, R * 2, hh); }
      ctx.restore();
    }
    const g = ctx.createLinearGradient(0, yh, 0, H);
    g.addColorStop(0, J.rgba(col, 0)); g.addColorStop(0.3, J.rgba(col, 0.55 * e)); g.addColorStop(1, J.rgba(col, e));
    ctx.strokeStyle = g; ctx.lineWidth = Math.max(1.5, Umin(env) * 0.0025); ctx.beginPath();
    const nV = 12, spB = W * 0.18;
    for (let i = -nV; i <= nV; i++) { ctx.moveTo(W / 2 + i * spB * 0.06, yh); ctx.lineTo(W / 2 + i * spB * 1.6, H + H * 0.3); }
    const ph = wrap(env.t * (P.spd || 0.6), 1);
    for (let j = 0; j < 26; j++) {
      const z = j + 1 - ph; if (z <= 0.2) continue;
      const y = yh + (H - yh) * 0.9 / z;
      if (y > H + 2 || y - yh < 1.5) continue;
      ctx.moveTo(0, y); ctx.lineTo(W, y);
    }
    ctx.stroke();
    const gh = ctx.createLinearGradient(0, yh - H * 0.1, 0, yh);
    gh.addColorStop(0, J.rgba(col, 0)); gh.addColorStop(1, J.rgba(col, 0.35 * e));
    ctx.fillStyle = gh; ctx.fillRect(0, yh - H * 0.1, W, H * 0.1);
    ctx.fillStyle = J.rgba(col, 0.8 * e); ctx.fillRect(0, yh - 1, W, 2);
  } });

bgReg('bokehBg', { name: 'ボケ玉', tags: ['emotional', 'calm', 'pop'], w: 1,
  plan: rng => ({ seed: bs(rng), n: rng.int(12, 20), k: rng.range(0.18, 0.28) }),
  draw(env, P, ctx) {
    const { W, H, sc } = env, s = P.seed || 1, U = Umin(env), t = env.t, dk = isDark(sc.bg);
    const cols = [sc.accent, sc.accent2, sc.fg, sc.ghostA, sc.ghostB], e = E.outCubic(clamp(bgT(env) / 0.8));
    if (dk) ctx.globalCompositeOperation = 'screen';
    for (let i = 0; i < (P.n || 12); i++) {
      const r = U * J.rr(0.035, 0.13, s, i, 1), vx = J.rs(s, i, 2) * U * 0.03, vy = -U * J.rr(0.01, 0.04, s, i, 3);
      const x = wrap(J.r(s, i, 4) * W + t * vx, W + 2 * r) - r + Math.sin(t * 0.4 + i) * U * 0.015;
      const y = wrap(J.r(s, i, 5) * H + t * vy, H + 2 * r) - r;
      const c = cols[i % cols.length], a = (P.k || 0.2) * e * (0.5 + 0.5 * J.r(s, i, 6)) * (0.75 + 0.25 * Math.sin(t * (0.6 + J.r(s, i, 7)) + i)) * (dk ? 1 : 0.7);
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, J.rgba(c, a * 0.7)); g.addColorStop(0.8, J.rgba(c, a)); g.addColorStop(0.92, J.rgba(c, a * 0.5)); g.addColorStop(1, J.rgba(c, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    }
  } });

bgReg('particlesBg', { name: '舞い上がる粒', tags: ['emotional', 'calm', 'pop'], w: 1,
  plan: rng => ({ seed: bs(rng), n: rng.int(60, 100), k: rng.range(0.45, 0.65), sq: rng.chance(0.4) }),
  draw(env, P, ctx) {
    const { W, H, sc } = env, s = P.seed || 1, U = Umin(env), t = env.t;
    const n = Math.min(140, Math.round((P.n || 60) * Math.sqrt(W * H / (1920 * 1080)))), e = E.outCubic(clamp(bgT(env) / 0.6));
    for (let i = 0; i < n; i++) {
      const v = H * J.rr(0.04, 0.14, s, i, 1), y = H + 10 - wrap(t * v + J.r(s, i, 2) * H * 1.2, H * 1.2);
      const x = J.r(s, i, 3) * W + Math.sin(t * J.rr(0.4, 1.2, s, i, 4) + i) * U * 0.02, sz = U * J.rr(0.0025, 0.008, s, i, 5);
      const a = (P.k || 0.45) * e * clamp(y / (H * 0.3)) * (0.55 + 0.45 * J.r(s, i, 6));
      if (a <= 0.01) continue;
      ctx.globalAlpha = a; ctx.fillStyle = J.r(s, i, 7) < 0.22 ? sc.accent : layC(sc, 0.6);
      if (P.sq) ctx.fillRect(x - sz, y - sz, sz * 2, sz * 2); else { ctx.beginPath(); ctx.arc(x, y, sz, 0, TAU); ctx.fill(); }
    }
  } });

bgReg('ripples', { name: '波紋', tags: ['calm', 'emotional', 'graphic'], w: 0.9,
  plan: rng => ({ seed: bs(rng), centre: rng.chance(0.4), life: rng.range(1.6, 2.4), k: rng.range(0.24, 0.34) }),
  draw(env, P, ctx) {
    const { W, H, sc } = env, s = P.seed || 1, U = Umin(env), life = P.life || 1.8, rings = [];
    if (env.beat && env.beat.len > 0.2) {
      const per = env.beat.len, stp = per < 0.4 ? 2 : 1;
      let b0 = env.beat.index, since = env.beat.since;
      if (stp === 2 && b0 % 2) { since += per; b0 -= 1; }
      for (let j = 0; j < 8; j++) { const age = since + j * per * stp; if (age > life) break; rings.push([b0 - j * stp, age]); }
    } else {
      const per = 0.7, idx = Math.floor(env.t / per);
      for (let j = 0; j < 4; j++) { const age = env.t - (idx - j) * per; if (age > life) break; rings.push([idx - j, age]); }
    }
    for (const [idx, age] of rings) {
      const q = clamp(age / life), r = U * (0.05 + 0.75 * E.outCubic(q)), a = (P.k || 0.2) * Math.pow(1 - q, 1.4);
      const x = P.centre ? W / 2 : W * J.rr(0.15, 0.85, s, idx, 1), y = P.centre ? H / 2 : H * J.rr(0.2, 0.8, s, idx, 2);
      ctx.strokeStyle = J.rgba(sc.fg, a); ctx.lineWidth = U * (0.008 * (1 - q) + 0.002);
      ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
      ctx.strokeStyle = J.rgba(sc.fg, a * 0.5); ctx.lineWidth = U * 0.0015; ctx.beginPath(); ctx.arc(x, y, r * 0.8, 0, TAU); ctx.stroke();
    }
  } });

bgReg('polka', { name: '水玉', tags: ['pop', 'graphic'], w: 0.7,
  plan: rng => ({ seed: bs(rng), sp: rng.range(0.11, 0.16), r: rng.range(0.2, 0.3), k: rng.range(0.06, 0.09), acc: rng.chance(0.3) }),
  draw(env, P, ctx) {
    const { W, H, sc } = env, sp = Umin(env) * (P.sp || 0.13), r = sp * (P.r || 0.25), rh = sp * 0.866;
    const ox = wrap(env.t * sp * 0.25, sp), oy = wrap(env.t * sp * 0.15, rh * 2), e = E.outBack(clamp(bgT(env) / 0.45), 1.5);
    ctx.fillStyle = P.acc ? tintC(sc, (P.k || 0.07) * 1.8) : layC(sc, P.k || 0.07); ctx.beginPath();
    let j = 0;
    for (let y = oy - rh * 2; y < H + rh; y += rh, j++) for (let x = ox - sp * 2 + (j & 1) * sp / 2; x < W + sp; x += sp) { ctx.moveTo(x + r * e, y); ctx.arc(x, y, r * e, 0, TAU); }
    ctx.fill();
  } });

bgReg('eqBars', { name: '背景イコライザー', tags: ['pop', 'glitch', 'graphic'], w: 0.6,
  plan: rng => ({ seed: bs(rng), n: rng.pick([24, 32, 40]), mode: rng.pick(['bottom', 'bottom', 'mirror', 'center']), seg: rng.chance(0.4), k: rng.range(0.09, 0.14) }),
  draw(env, P, ctx) {
    const { W, H, sc } = env, s = P.seed || 1, n = P.n || 32, bw = W / n, t = env.t;
    const en = env.energy != null ? env.energy : 0.45 + 0.2 * J.noise1(t * 2, s);
    const bt = env.beat ? Math.exp(-env.beat.since * 6) : Math.exp(-wrap(t * 2, 1) * 4);
    const e = E.outCubic(clamp(bgT(env) / 0.4)), mode = P.mode || 'bottom', segH = bw * 0.45;
    const main = layC(sc, P.k || 0.11), cap = tintC(sc, 0.4);
    const bar = (x, y0, h, dir) => {           // dir: 1 grows down from y0, -1 grows up
      if (h < 1) return;
      if (P.seg) { for (let y = 0; y + segH * 0.7 <= h; y += segH) ctx.rect(x, dir > 0 ? y0 + y : y0 - y - segH * 0.7, bw * 0.62, segH * 0.7); }
      else ctx.rect(x, dir > 0 ? y0 : y0 - h, bw * 0.62, h);
    };
    ctx.fillStyle = main; ctx.beginPath();
    const tops = [];
    for (let i = 0; i < n; i++) {
      const sh = 0.55 + 0.45 * Math.sin(Math.PI * (i + 0.5) / n), nz = 0.5 + 0.5 * J.noise1(t * 4 + i * 1.7, s + i);
      const lvl = clamp(sh * (0.25 + 0.75 * en) * (0.55 + 0.45 * nz) + bt * 0.18 * nz) * e, h = H * 0.32 * lvl, x = i * bw + bw * 0.19;
      if (mode === 'center') { bar(x, H / 2, h * 0.7, -1); bar(x, H / 2, h * 0.7, 1); }
      else { bar(x, H, h, -1); tops.push([x, H - h]); if (mode === 'mirror') bar(x, 0, h * 0.7, 1); }
    }
    ctx.fill();
    if (tops.length) { ctx.fillStyle = cap; ctx.beginPath(); for (const [x, y] of tops) ctx.rect(x, y - bw * 0.3, bw * 0.62, Math.max(2, bw * 0.12)); ctx.fill(); }
  } });

bgReg('borderFrame', { name: '太枠', tags: ['graphic', 'pop', 'editorial'], w: 0.7,
  plan: rng => ({ seed: bs(rng), th: rng.range(0.012, 0.022), m: rng.range(0.03, 0.05), acc: rng.chance(0.6), dbl: rng.chance(0.4) }),
  draw(env, P) {
    const { W, H, sc } = env, U = Umin(env), m = U * (P.m || 0.04), th = U * (P.th || 0.016), e = E.inOutCubic(clamp(bgT(env) / 0.6));
    if (e <= 0) return;
    const col = firstOK(P.acc ? [sc.accent, sc.ink, sc.fg] : [sc.ink, sc.fg], c => ctr(c, sc.bg) >= 1.6, sc.fg);
    const x0 = m + th / 2, y0 = m + th / 2, x1 = W - m - th / 2, y1 = H - m - th / 2;
    env.polyPartial([[x0 - th / 2, y0], [x1, y0], [x1, y1 + th / 2]], e, col, th, 1, false);
    env.polyPartial([[x1 + th / 2, y1], [x0, y1], [x0, y0 - th / 2]], e, col, th, 1, false);
    if (P.dbl) {
      const m2 = m + th * 2.4, lw = Math.max(1, th * 0.18);
      env.polyPartial([[m2, m2], [W - m2, m2], [W - m2, H - m2], [m2, H - m2], [m2, m2]], e, col, lw, 0.45, false);
    }
  } });

bgReg('letterbox', { name: 'シネスコ帯', tags: ['emotional', 'editorial', 'calm'], w: 0.6,
  plan: rng => ({ seed: bs(rng), k: rng.range(0.085, 0.11), line: rng.chance(0.6) }),
  draw(env, P, ctx) {
    const { W, H, sc } = env, e = E.outExpo(clamp(bgT(env) / 0.55));
    const bh = (W >= H ? H * (P.k || 0.1) : H * 0.05) * e;
    if (bh < 0.5) return;
    ctx.fillStyle = isDark(sc.bg) ? J.mix(sc.bg, '#000000', 0.85) : J.mix(sc.fg, '#000000', 0.3);
    ctx.fillRect(0, -1, W, bh + 1); ctx.fillRect(0, H - bh, W, bh + 1);
    ctx.fillStyle = isDark(sc.bg) ? layC(sc, 0.3) : tintC(sc, 0.6);
    if (P.line || isDark(sc.bg)) { ctx.fillRect(0, bh, W, Math.max(1.2, H * 0.0015)); ctx.fillRect(0, H - bh - Math.max(1.2, H * 0.0015), W, Math.max(1.2, H * 0.0015)); }
  } });

bgReg('noiseField', { name: 'ノイズの揺らぎ', tags: ['glitch', 'emotional'], w: 0.6,
  plan: rng => ({ seed: bs(rng), n: rng.int(14, 22), k: rng.range(0.05, 0.085), th: rng.range(0.56, 0.66) }),
  draw(env, P, ctx) {
    const { W, H, sc } = env, s = P.seed || 1, cell = Umin(env) / (P.n || 18), t = env.t, st = env.step;
    const cols = Math.ceil(W / cell), rows = Math.ceil(H / cell), th = P.th || 0.6, k = P.k || 0.07;
    const paths = [new Path2D(), new Path2D(), new Path2D()], acc = new Path2D();
    const e = clamp(bgT(env) / 0.3);
    for (let j = 0; j < rows; j++) {
      const shift = J.r(s, j, st, 7) < 0.05 ? Math.round(J.rs(s, j, st, 8) * 4) * cell : 0;
      for (let i = 0; i < cols; i++) {
        let v = 0.5 + 0.5 * (J.noise1(i * 0.23 + t * 0.7, s + j * 31) * 0.6 + J.noise1(j * 0.29 - t * 0.5, s + i * 17 + 999) * 0.4);
        v += (J.r(s, i, j, st) - 0.5) * 0.12;
        if (v < th + (1 - e) * 0.4) continue;
        const lv = v > th + 0.2 ? 2 : v > th + 0.1 ? 1 : 0;
        (J.r(s, i, j, st >> 1) < 0.01 ? acc : paths[lv]).rect(i * cell + shift, j * cell, cell - 1, cell - 1);
      }
    }
    [0.6, 1, 1.6].forEach((m, l) => { ctx.fillStyle = layC(sc, k * m); ctx.fill(paths[l]); });
    ctx.fillStyle = tintC(sc, 0.3); ctx.fill(acc);
  } });

/* ================= CAMERA ================= */
const KM = env => clamp((env.fx.motion ?? 0.7) * 1.25, 0, 1.25);
const cuOf = env => clamp(env.lt / Math.max(0.3, env.cut.dur));
const panP = u => u * 0.6 + E.inOutSine(u) * 0.4;
const lagOf = env => Math.max(0, (env.ltb ?? env.lt) - env.lt);

reg('cam', 'pullOut', { name: '引き', tags: ['calm', 'emotional', 'editorial'], w: 1,
  plan: rng => ({ a: rng.range(0.06, 0.09) }),
  get: (env, P) => ({ s: 1 + (P.a || 0.07) * KM(env) * (1 - E.outCubic(cuOf(env))) }) });

reg('cam', 'panL', { name: '左パン', tags: ['calm', 'editorial', 'emotional', 'graphic'], w: 0.9,
  plan: rng => ({ a: rng.range(0.018, 0.028) }),
  get: (env, P) => ({ x: (panP(cuOf(env)) - 0.5) * 2 * env.W * (P.a || 0.022) * KM(env), s: 1.02 }) });

reg('cam', 'panR', { name: '右パン', tags: ['calm', 'editorial', 'emotional', 'graphic'], w: 0.9,
  plan: rng => ({ a: rng.range(0.018, 0.028) }),
  get: (env, P) => ({ x: -(panP(cuOf(env)) - 0.5) * 2 * env.W * (P.a || 0.022) * KM(env), s: 1.02 }) });

reg('cam', 'tiltUp', { name: 'ティルト', tags: ['calm', 'emotional', 'editorial'], w: 0.8,
  plan: rng => ({ a: rng.range(0.02, 0.03) }),
  get: (env, P) => ({ y: (panP(cuOf(env)) - 0.5) * 2 * env.H * (P.a || 0.025) * KM(env), s: 1.02 }) });

reg('cam', 'dutch', { name: 'ダッチ', tags: ['emotional', 'glitch', 'graphic'], w: 0.8,
  plan: rng => ({ dir: rng.pick([1, -1]), a: rng.range(2.5, 4.5) }),
  get: (env, P) => { const K = KM(env); return { rot: (P.dir || 1) * Math.min(5, (P.a || 3.5) * K) * E.inOutSine(clamp(env.lt / Math.max(0.3, env.cut.dur * 0.8))), s: 1 + 0.03 * K * cuOf(env) }; } });

reg('cam', 'handheld', { name: '手持ち', tags: ['emotional', 'calm', 'editorial'], w: 1,
  plan: rng => ({ f: rng.range(0.8, 1.3) }),
  get: (env, P) => {
    const K = KM(env), f = P.f || 1, t = env.lt, sd = env.cut.seed | 0;
    return { x: (J.noise1(t * f * 1.1, sd) * 0.7 + J.noise1(t * f * 2.9, sd + 1) * 0.3) * env.W * 0.007 * K,
      y: (J.noise1(t * f * 0.9, sd + 2) * 0.7 + J.noise1(t * f * 3.3, sd + 3) * 0.3) * env.H * 0.009 * K,
      rot: J.noise1(t * f * 0.8, sd + 4) * 0.7 * K, s: 1.012 };
  } });

reg('cam', 'beatPunch', { name: '拍でズーム', tags: ['pop', 'glitch', 'graphic'], w: 0.9,
  plan: rng => ({ a: rng.range(0.03, 0.045) }),
  get: (env, P) => {
    let since, len = 0.5;
    if (env.beat) { len = env.beat.len; since = env.beat.since - lagOf(env); if (since < 0) since += len; }
    else since = wrap(env.lt, 0.5);
    const k = Math.exp(-since * 9);
    return { s: 1 + (P.a || 0.035) * KM(env) * k, y: -env.H * 0.004 * KM(env) * k };
  } });

reg('cam', 'whipIn', { name: 'ホイップイン', tags: ['pop', 'glitch', 'graphic'], w: 0.7, strong: true,
  plan: rng => ({ dir: rng.pick(['L', 'R', 'L', 'R', 'U', 'D']), d: rng.range(0.16, 0.24) }),
  get: (env, P) => {
    const K = KM(env), r = 1 - E.outExpo(clamp(env.lt / 0.3)), d = (P.d || 0.2) * K * r;
    if (r <= 0.001) return {};
    const sg = P.dir === 'L' || P.dir === 'U' ? -1 : 1, hor = P.dir === 'L' || P.dir === 'R';
    return { x: hor ? sg * env.W * d : 0, y: hor ? 0 : sg * env.H * d * 0.7, skx: hor ? sg * 9 * r * K : 0, s: 1 + 0.04 * r, blur: 22 * K * r };
  } });

reg('cam', 'crashZoom', { name: 'クラッシュズーム', tags: ['pop', 'glitch', 'emotional'], w: 0.6, strong: true,
  plan: rng => ({ at: rng.range(0.6, 0.75), a: rng.range(0.08, 0.11) }),
  get: (env, P) => {
    const K = KM(env), dur = env.cut.dur, tc = dur < 0.8 ? dur * 0.5 : Math.max(dur * (P.at || 0.65), dur - 0.6), dt = env.lt - tc;
    if (dt < 0) return { s: 1 - 0.008 * K * clamp((env.lt - tc + 0.25) / 0.25) };
    const q = E.outExpo(clamp(dt / 0.1)), sd = env.cut.seed | 0, sh = Math.exp(-dt * 6) * q;
    return { s: 1 + Math.min(0.12, (P.a || 0.1) * K) * q, blur: 12 * K * Math.max(0, 1 - Math.abs(dt - 0.05) / 0.08),
      x: J.rs(sd, env.step, 1) * env.W * 0.004 * sh * K, y: J.rs(sd, env.step, 2) * env.H * 0.004 * sh * K };
  } });

reg('cam', 'bounce', { name: 'バウンス', tags: ['pop', 'graphic'], w: 0.9,
  plan: rng => ({ a: rng.range(0.045, 0.065) }),
  get: (env, P) => { const K = KM(env), t = env.lt, d = Math.exp(-t * 5.5); return { s: 1 - (P.a || 0.07) * K * d * Math.cos(t * 16), y: -env.H * 0.012 * K * d * Math.sin(t * 16) }; } });

reg('cam', 'roll', { name: 'ロール', tags: ['emotional', 'calm', 'glitch'], w: 0.8,
  plan: rng => ({ dir: rng.pick([1, -1]), a: rng.range(2.5, 4) }),
  get: (env, P) => ({ rot: (P.dir || 1) * (cuOf(env) - 0.5) * (P.a || 3) * KM(env), s: 1.025 }) });

reg('cam', 'driftDiag', { name: '斜めドリフト', tags: ['calm', 'emotional', 'editorial', 'graphic'], w: 1,
  plan: rng => ({ dx: rng.pick([1, -1]), dy: rng.pick([1, -1]) }),
  get: (env, P) => { const K = KM(env), u = E.inOutSine(cuOf(env)) * 0.5 + cuOf(env) * 0.5; return { x: (u - 0.5) * env.W * 0.035 * K * (P.dx || 1), y: (u - 0.5) * env.H * 0.03 * K * (P.dy || 1), s: 1.02 + 0.025 * K * u }; } });

reg('cam', 'shakeHard', { name: '強い揺れ', tags: ['glitch', 'pop', 'emotional'], w: 0.6, strong: true,
  get: (env) => {
    const K = KM(env), amp = Math.exp(-env.lt * 4.5) * K;
    if (amp < 0.01) return {};
    const sd = env.cut.seed | 0, st = env.step;
    return { x: J.rs(sd, st, 1) * env.W * 0.022 * amp, y: J.rs(sd, st, 2) * env.H * 0.02 * amp, rot: J.rs(sd, st, 3) * 1.6 * amp, s: 1 + 0.03 * amp, blur: 2.5 * amp };
  } });

reg('cam', 'dollyIn', { name: 'ドリー', tags: ['emotional', 'calm', 'editorial'], w: 1,
  plan: rng => ({ a: rng.range(0.08, 0.11) }),
  get: (env, P) => { const K = KM(env), q = E.inCubic(cuOf(env)); return { s: 1 + Math.min(0.14, (P.a || 0.1) * K) * q, y: -env.H * 0.008 * K * q }; } });

const stepCache = new WeakMap();
const stepTimes = (env, n) => {
  const c = env.cut; let ts = stepCache.get(c);
  if (ts && ts.n === n) return ts.v;
  const beats = (env.plan && env.plan.beats) || [], v = [];
  if (beats.length) {
    for (const b of beats) {
      if (b <= c.start + 0.2 || b >= c.end - 0.15) continue;
      const r = b - c.start;
      if (!v.length || r - v[v.length - 1] >= 0.3) v.push(r);
      if (v.length >= n) break;
    }
  }
  if (!v.length) for (let i = 0; i < n; i++) v.push(c.dur * (i + 1) / (n + 1));
  stepCache.set(c, { n, v });
  return v;
};
reg('cam', 'stepZoom', { name: '段階ズーム', tags: ['pop', 'graphic', 'glitch'], w: 0.8,
  plan: rng => ({ n: rng.int(2, 3), a: rng.range(0.035, 0.045) }),
  get: (env, P) => {
    const K = KM(env), a = (P.a || 0.04) * K;
    let s = 1, blur = 0;
    for (const ti of stepTimes(env, P.n || 2)) {
      const d = env.lt - ti; if (d < 0) continue;
      s += a * E.outExpo(clamp(d / 0.07)); blur += 5 * K * (1 - clamp(d / 0.06));
    }
    return { s: Math.min(1.15, s), blur };
  } });

/* ================= POST / TRANSITION EFFECTS (device px) ================= */
const bell = k => Math.sin(Math.PI * clamp(k));
const evS = ev => J.h(Math.round(ev.t * 1000), 7331);
const ampOf = ev => clamp(ev.amp ?? 1, 0.3, 1.6);
// 0 → 1 (fully covered at the boundary b) → 0
const cover = (k, b, inE = E.inCubic, outE = E.outCubic) => (k < b ? inE(k / b) : 1 - outE((k - b) / Math.max(0.01, 1 - b)));
const inkOf = sc => firstOK([sc.ink, sc.fg], c => ctr(c, sc.bg) >= 1.6, sc.fg);
const fxReg = (k, d) => reg('fx', k, Object.assign({}, d, { draw(ctx, ev, k2, I) { ctx.save(); try { d.draw(ctx, ev, k2, I); } finally { ctx.restore(); } } }));

fxReg('panelWipe', { name: 'パネルワイプ', tags: ['pop', 'graphic'], w: 1, dur: 5, pre: 2, amp: 1,
  draw(ctx, ev, k, I) {
    const { cw, ch, sc } = I, s = evS(ev), b = 0.4, dir = J.r(s, 1) < 0.5 ? 1 : -1, vert = J.r(s, 2) < 0.28;
    const L = vert ? ch : cw, M = vert ? cw : ch, sl = M * 0.3;
    let a0, a1;
    if (k < b) { a0 = 0; a1 = E.outCubic(k / b); } else { a0 = E.inCubic((k - b) / (1 - b)); a1 = 1; }
    const pt = (X, Y) => { const x = dir > 0 ? X : L - X; return vert ? [Y, x] : [x, Y]; };
    const band = (u0, u1, col) => {
      if (u1 - u0 <= 0.0005) return;
      const X0 = u0 * (L + sl), X1 = u1 * (L + sl);
      const q = [pt(X0, 0), pt(X1, 0), pt(X1 - sl, M), pt(X0 - sl, M)];
      ctx.fillStyle = col; ctx.beginPath(); q.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); ctx.fill();
    };
    const second = best([sc.ink, sc.fg, sc.bg], sc.accent);
    if (k < b) band(a1, Math.min(1, a1 + 0.06), second); else band(Math.max(0, a0 - 0.06), a0, second);
    band(a0, a1, sc.accent);
  } });

fxReg('irisTrans', { name: 'アイリス', tags: ['pop', 'editorial'], w: 0.7, dur: 8, pre: 4, amp: 1,
  draw(ctx, ev, k, I) {
    const { cw, ch, sc } = I, s = evS(ev), c = cover(k, 0.5);
    const cx = cw / 2 + J.rs(s, 1) * cw * 0.08, cy = ch / 2 + J.rs(s, 2) * ch * 0.06;
    const R = Math.hypot(Math.max(cx, cw - cx), Math.max(cy, ch - cy)), r = R * (1 - c);
    ctx.fillStyle = isDark(sc.bg) ? '#000000' : (isDark(sc.ink) ? sc.ink : '#111111');
    ctx.beginPath(); ctx.rect(0, 0, cw, ch); if (r > 0.5) { ctx.moveTo(cx + r, cy); ctx.arc(cx, cy, r, 0, TAU); } ctx.fill('evenodd');
    if (r > 1 && c > 0.02) { ctx.strokeStyle = sc.accent; ctx.lineWidth = Math.max(2, ch * 0.008); ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke(); }
  } });

fxReg('doors', { name: '扉', tags: ['graphic', 'pop'], w: 0.7, dur: 8, pre: 4, amp: 1,
  draw(ctx, ev, k, I) {
    const { cw, ch, sc } = I, s = evS(ev), c = cover(k, 0.5, E.inQuad, E.outCubic), vert = J.r(s, 3) < 0.3;
    if (c <= 0.001) return;
    const L = vert ? ch : cw, half = L / 2 * c + 1, lw = Math.max(2, Math.min(cw, ch) * 0.008), col = inkOf(sc);
    const R = (a, b, w, h) => (vert ? ctx.fillRect(b, a, h, w) : ctx.fillRect(a, b, w, h));
    const M = vert ? cw : ch;
    ctx.fillStyle = col; R(0, 0, half, M); R(L - half, 0, half, M);
    ctx.fillStyle = sc.accent; R(half - lw, 0, lw, M); R(L - half, 0, lw, M);
    ctx.globalAlpha = 0.35; R(half - lw * 4, 0, lw * 0.5, M); R(L - half + lw * 3.5, 0, lw * 0.5, M);
  } });

fxReg('blindsTrans', { name: 'ブラインド', tags: ['graphic', 'editorial'], w: 0.7, dur: 6, pre: 3, amp: 1,
  draw(ctx, ev, k, I) {
    const { cw, ch, sc } = I, s = evS(ev), c = cover(k, 0.5), n = 7 + (J.h(s, 4) % 6), vert = J.r(s, 5) < 0.35;
    if (c <= 0.001) return;
    const L = vert ? cw : ch, M = vert ? ch : cw, slat = L / n;
    ctx.fillStyle = J.r(s, 6) < 0.5 ? sc.accent : inkOf(sc); ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const ci = clamp(c * 1.35 - (i / n) * 0.35), h = slat * ci + (ci >= 1 ? 1 : 0);
      if (h <= 0.2) continue;
      if (vert) ctx.rect(i * slat, 0, h, M); else ctx.rect(0, i * slat, M, h);
    }
    ctx.fill();
  } });

fxReg('rgbSplit', { name: 'RGB分離', tags: ['glitch', 'emotional'], w: 1, dur: 4, amp: 1, glitchy: true, mid: true, scratch: true,
  draw(ctx, ev, k, I) {
    const { cw, ch, S, sc } = I; if (!S) return;
    const a = ampOf(ev), dk = isDark(sc.bg), st = I.step + evS(ev);
    const d = Math.max(2, cw * (0.006 + 0.01 * J.r(st, 5)) * a * (1 - 0.6 * k)), dy = J.rs(st, 6) * ch * 0.004 * a;
    // ink mask: |frame - bg| isolates the text, so the tinted copies only add colour fringes (the background keeps its colour)
    const hw = Math.max(2, Math.round(cw / 2)), hh = Math.max(2, Math.round(ch / 2));
    const tint = (T, c) => {
      const x = T.getContext('2d'); x.save(); x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; x.globalCompositeOperation = 'copy'; x.drawImage(S, 0, 0, hw, hh);
      x.globalCompositeOperation = 'difference'; x.fillStyle = sc.bg; x.fillRect(0, 0, hw, hh);
      if (dk) { x.globalCompositeOperation = 'multiply'; x.fillStyle = c; x.fillRect(0, 0, hw, hh); }
      else { x.fillStyle = '#ffffff'; x.fillRect(0, 0, hw, hh); x.globalCompositeOperation = 'screen'; x.fillStyle = c; x.fillRect(0, 0, hw, hh); }
      x.restore(); return T;
    };
    const T1 = tint(I.tmp(hw, hh), '#FF2A2A'), T2 = tint(I.tmp2(hw, hh), '#1EE6FF');
    ctx.globalCompositeOperation = dk ? 'screen' : 'multiply'; ctx.globalAlpha = 0.9;
    ctx.drawImage(T1, 0, 0, hw, hh, -d, -dy, cw, ch); ctx.drawImage(T2, 0, 0, hw, hh, d, dy, cw, ch);
  } });

fxReg('smear', { name: '横スミア', tags: ['glitch'], w: 0.8, dur: 3, amp: 1, glitchy: true, mid: true, scratch: true,
  draw(ctx, ev, k, I) {
    const { cw, ch, S } = I; if (!S) return;
    const a = ampOf(ev), st = I.step * 13 + evS(ev), n = 7 + (J.h(st, 2) % 6), sw = Math.max(1, Math.round(cw * 0.003));
    ctx.globalAlpha = 0.92;
    for (let i = 0; i < n; i++) {
      const h = Math.max(2, Math.round(ch * J.rr(0.008, 0.06, st, i, 2))), y = Math.round(clamp(ch * (0.22 + 0.56 * J.r(st, i, 1)), 0, ch - h));
      const sx = Math.round(cw * J.rr(0.25, 0.75, st, i, 3)), len = cw * J.rr(0.12, 0.45, st, i, 4) * a, dir = J.r(st, i, 5) < 0.5 ? 1 : -1;
      ctx.drawImage(S, sx, y, sw, h, dir > 0 ? sx : sx - len, y, len, h);
    }
  } });

fxReg('vhsRoll', { name: 'VHSロール', tags: ['glitch', 'emotional'], w: 0.8, dur: 6, amp: 1, glitchy: true, mid: true, scratch: true,
  draw(ctx, ev, k, I) {
    const { cw, ch, S } = I; if (!S) return;
    const a = ampOf(ev), st = I.step * 7 + evS(ev), oy = Math.round(ch * 0.2 * a * bell(k)), dx = Math.round(J.rs(st, 1) * cw * 0.004 * a);
    if (oy < 1) return;
    ctx.drawImage(S, dx, oy); ctx.drawImage(S, dx, oy - ch);
    for (let i = 0; i < 5; i++) {
      const h = Math.max(2, Math.round(ch * 0.008)), yy = oy + i * h * 1.6, src = yy - oy;
      if (yy + h > ch || src < 0) break;
      ctx.drawImage(S, 0, src, cw, h, J.rs(st, i, 2) * cw * 0.03 * a, yy, cw, h);
    }
    const bh = Math.max(3, ch * 0.028);
    ctx.fillStyle = 'rgba(0,0,0,0.78)'; ctx.fillRect(0, oy - bh, cw, bh);
    ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.fillRect(0, oy - bh - Math.max(1, ch * 0.003), cw, Math.max(1, ch * 0.003));
  } });

// streaky noise texture for tracking noise (built once, deterministic)
let NOISE = null;
const noiseTex = () => {
  if (NOISE) return NOISE;
  const w = 256, h = 64, c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d'), id = x.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    const run = 1 + (J.h(y, 3) % 7);
    for (let i = 0; i < w; i++) { const v = Math.pow(J.r(y, Math.floor(i / run), 11), 2.2) * 255, p = (y * w + i) * 4; id.data[p] = id.data[p + 1] = id.data[p + 2] = v; id.data[p + 3] = 255; }
  }
  x.putImageData(id, 0, 0);
  NOISE = c; return c;
};
fxReg('trackingNoise', { name: 'トラッキングノイズ', tags: ['glitch', 'emotional'], w: 0.8, dur: 4, amp: 1, glitchy: true, mid: true, scratch: true,
  draw(ctx, ev, k, I) {
    const { cw, ch, S, sc } = I; if (!S) return;
    const a = ampOf(ev), s = evS(ev), st = I.step * 5 + s, N = noiseTex(), dk = isDark(sc.bg);
    const band = (yc, bh, rows) => {
      const y0 = clamp(Math.round(yc - bh / 2), 0, ch - 2), hh = Math.min(ch - y0, Math.round(bh));
      for (let i = 0; i < rows; i++) {
        const y = y0 + Math.floor(i * hh / rows), h = Math.max(1, Math.floor(hh / rows));
        ctx.drawImage(S, 0, y, cw, h, J.rs(st, i, 9) * cw * 0.035 * a, y, cw, h);
      }
      ctx.globalCompositeOperation = dk ? 'screen' : 'multiply'; ctx.globalAlpha = 0.75;
      const nx = J.r(st, 3) * N.width * 0.5;
      ctx.drawImage(N, nx, (J.h(st, 4) % 32), N.width * 0.5, 32, 0, y0, cw, hh);
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
      ctx.fillStyle = dk ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.7)';
      for (let j = 0; j < 7; j++) ctx.fillRect(J.r(st, j, 5) * cw, y0 + J.r(st, j, 6) * hh, cw * J.rr(0.05, 0.4, st, j, 7), Math.max(1, ch * 0.0025));
    };
    band(ch * (0.25 + 0.5 * J.r(s, 1)) + (k - 0.5) * ch * 0.12, ch * (0.05 + 0.06 * J.r(s, 2)) * a, 6);
    band(ch * (0.1 + 0.8 * J.r(s, 8)) - k * ch * 0.08, ch * 0.018 * a, 2);
  } });

fxReg('mirrorFlash', { name: 'ミラー', tags: ['glitch', 'graphic'], w: 0.6, dur: 2, amp: 1, glitchy: true, mid: true, scratch: true,
  draw(ctx, ev, k, I) {
    const { cw, ch, S } = I; if (!S) return;
    const m = J.h(evS(ev), 9) % 4, hw = Math.floor(cw / 2), hh = Math.floor(ch / 2);
    if (m === 0) { ctx.setTransform(-1, 0, 0, 1, cw, 0); ctx.drawImage(S, 0, 0, hw, ch, 0, 0, hw, ch); }
    else if (m === 1) { ctx.setTransform(-1, 0, 0, 1, cw, 0); ctx.drawImage(S, cw - hw, 0, hw, ch, cw - hw, 0, hw, ch); }
    else if (m === 2) { ctx.setTransform(1, 0, 0, -1, 0, ch); ctx.drawImage(S, 0, 0, cw, hh, 0, 0, cw, hh); }
    else {
      ctx.setTransform(-1, 0, 0, 1, cw, 0); ctx.drawImage(S, 0, 0, hw, hh, 0, 0, hw, hh);
      ctx.setTransform(1, 0, 0, -1, 0, ch); ctx.drawImage(S, 0, 0, cw, hh, 0, 0, cw, hh);
      ctx.setTransform(-1, 0, 0, -1, cw, ch); ctx.drawImage(S, 0, 0, hw, hh, 0, 0, hw, hh);
    }
  } });

fxReg('strobe', { name: 'ストロボ', tags: ['glitch', 'pop'], w: 0.5, dur: 4, amp: 1, mid: true,
  draw(ctx, ev, k, I) {
    if (Math.floor(k * 4) % 2) return;
    ctx.globalCompositeOperation = 'difference'; ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, I.cw, I.ch);
  } });

fxReg('posterize', { name: 'ポスタリゼ', tags: ['glitch', 'pop', 'graphic'], w: 0.7, dur: 3, amp: 1, mid: true, scratch: true,
  draw(ctx, ev, k, I) {
    const { S } = I; if (!S) return;
    const a = ampOf(ev) * Math.pow(1 - k, 1.2);
    if (a < 0.02) return;
    if (I.allowFilter) { ctx.filter = `contrast(${(1 + 1.8 * a).toFixed(2)}) saturate(${(1 + 2.6 * a).toFixed(2)})`; ctx.drawImage(S, 0, 0); ctx.filter = 'none'; }
    else { ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = Math.min(1, a); ctx.drawImage(S, 0, 0); }
  } });

fxReg('hueShift', { name: '色相シフト', tags: ['glitch', 'pop', 'emotional'], w: 0.7, dur: 3, amp: 1, mid: true, scratch: true,
  draw(ctx, ev, k, I) {
    const { cw, ch, S, sc } = I; if (!S) return;
    const kk = Number.isFinite(k) ? clamp(k, 0, 1) : 1;                 // progress past the end (short event at low fps) → NaN alpha before
    const s = evS(ev), a = Math.pow(1 - kk, 0.8) * Math.min(1, ampOf(ev)), deg = Math.round(90 + 180 * J.r(s, 3)), dk = isDark(sc.bg);
    if (!(a > 0.002)) return;
    if (I.allowFilter) { ctx.globalAlpha = a; ctx.filter = `hue-rotate(${deg}deg) saturate(1.6)`; ctx.drawImage(S, 0, 0); ctx.filter = 'none'; }
    ctx.globalAlpha = 0.5 * a; ctx.globalCompositeOperation = dk ? 'multiply' : 'screen';
    ctx.fillStyle = J.r(s, 4) < 0.5 ? sc.ghostA : sc.ghostB; ctx.fillRect(0, 0, cw, ch);
  } });

fxReg('tileShift', { name: 'タイルずらし', tags: ['glitch', 'graphic'], w: 0.8, dur: 3, amp: 1, glitchy: true, mid: true, scratch: true,
  draw(ctx, ev, k, I) {
    const { cw, ch, S, sc } = I; if (!S) return;
    const a = ampOf(ev), s0 = I.step * 11 + evS(ev), gx = 3 + (J.h(s0, 1) % 4), gy = 2 + (J.h(s0, 2) % 3);
    ctx.fillStyle = sc.bg; ctx.fillRect(0, 0, cw, ch);
    for (let j = 0; j < gy; j++) for (let i = 0; i < gx; i++) {
      const x0 = Math.round(i * cw / gx), x1 = Math.round((i + 1) * cw / gx), y0 = Math.round(j * ch / gy), y1 = Math.round((j + 1) * ch / gy), tw = x1 - x0, th = y1 - y0;
      const moved = J.r(s0, i, j, 3) < 0.6, dx = moved ? J.rs(s0, i, j, 4) * tw * 0.2 * a : 0, dy = moved ? J.rs(s0, i, j, 5) * th * 0.15 * a : 0;
      let si = i, sj = j;
      if (J.r(s0, i, j, 6) < 0.12) { si = J.h(s0, i, j, 7) % gx; sj = J.h(s0, i, j, 8) % gy; }
      const sx0 = Math.round(si * cw / gx), sy0 = Math.round(sj * ch / gy);
      ctx.drawImage(S, sx0, sy0, Math.min(tw, cw - sx0), Math.min(th, ch - sy0), x0 + dx, y0 + dy, tw, th);
    }
  } });

fxReg('filmBurn', { name: 'フィルム焼け', tags: ['emotional', 'calm', 'editorial'], w: 0.7, dur: 7, pre: 2, amp: 1, mid: true,
  draw(ctx, ev, k, I) {
    const { cw, ch, sc } = I, s = evS(ev), b = 2 / 7;
    let a = (k < b ? E.outCubic(k / b) : 1 - E.inOutCubic((k - b) / (1 - b))) * clamp(ampOf(ev), 0.5, 1.2) * (0.85 + 0.15 * J.r(I.step, 3));
    if (a <= 0.01) return;
    const cn = J.h(s, 5) % 4, cx = cn & 1 ? cw * 1.02 : -cw * 0.02, cy = cn & 2 ? ch * (0.7 + 0.3 * J.r(s, 6)) : ch * 0.3 * J.r(s, 6);
    const R = Math.hypot(cw, ch) * (0.55 + 0.5 * k);
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
    g.addColorStop(0, `rgba(255,244,214,${(0.95 * a).toFixed(3)})`); g.addColorStop(0.3, `rgba(255,170,70,${(0.75 * a).toFixed(3)})`);
    g.addColorStop(0.62, `rgba(255,80,20,${(0.32 * a).toFixed(3)})`); g.addColorStop(1, 'rgba(255,60,0,0)');
    if (!isDark(sc.bg)) {
      const g2 = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
      g2.addColorStop(0, `rgba(255,120,40,${(0.45 * a).toFixed(3)})`); g2.addColorStop(1, 'rgba(255,120,40,0)');
      ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = g2; ctx.fillRect(0, 0, cw, ch);
    }
    ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = g; ctx.fillRect(0, 0, cw, ch);
  } });

fxReg('whipBlur', { name: 'ホイップブラー', tags: ['pop', 'graphic', 'emotional'], w: 1, dur: 5, pre: 2, amp: 1, scratch: true,
  draw(ctx, ev, k, I) {
    const { cw, ch, S, sc } = I; if (!S) return;
    const amt = cover(k, 0.4), d = cw * 0.045 * ampOf(ev) * amt, vert = J.r(evS(ev), 2) < 0.25;
    if (d < 1) return;
    const hw = Math.max(2, Math.round(cw / 2)), hh = Math.max(2, Math.round(ch / 2)), T = I.tmp2(hw, hh), x = T.getContext('2d');
    x.save(); x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1; x.fillStyle = sc.bg; x.fillRect(0, 0, hw, hh);
    const n = 11;
    for (let i = 0; i < n; i++) { const o = (i / (n - 1) - 0.5) * d; x.globalAlpha = 1 / (i + 1); x.drawImage(S, vert ? 0 : o, vert ? o : 0, hw, hh); }
    x.restore();
    ctx.drawImage(T, 0, 0, hw, hh, 0, 0, cw, ch);
  } });

const koma = (col) => ({ tags: col === '#000000' ? ['editorial', 'emotional', 'glitch'] : ['emotional', 'pop'], dur: 2, pre: 1, amp: 1, mid: false,
  draw(ctx, ev, k, I) {
    const one = J.r(evS(ev), 9) < 0.5;
    if (one && k >= 0.5) return;
    ctx.fillStyle = col; ctx.fillRect(0, 0, I.cw, I.ch);
  } });
fxReg('blackFrame', Object.assign(koma('#000000'), { name: '黒コマ', w: 0.6 }));
fxReg('whiteFrame', Object.assign(koma('#ffffff'), { name: '白コマ', w: 0.5 }));

fxReg('gridRepeat', { name: '画面分割', tags: ['pop', 'graphic', 'glitch'], w: 0.7, dur: 3, amp: 1, mid: true, scratch: true,
  draw(ctx, ev, k, I) {
    const { cw, ch, S, sc } = I; if (!S) return;
    const f = J.r(evS(ev), 1) < 0.5, n = (k < 0.6) === f ? 2 : 3, tw = cw / n, th = ch / n, g = Math.max(2, Math.round(ch * 0.006));
    ctx.fillStyle = sc.bg; ctx.fillRect(0, 0, cw, ch);
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) ctx.drawImage(S, 0, 0, cw, ch, i * tw, j * th, tw, th);
    ctx.fillStyle = sc.bg;
    for (let i = 1; i < n; i++) { ctx.fillRect(i * tw - g / 2, 0, g, ch); ctx.fillRect(0, i * th - g / 2, cw, g); }
  } });

fxReg('waveWarp', { name: '波ゆがみ', tags: ['emotional', 'glitch'], w: 0.7, dur: 5, amp: 1, mid: true, scratch: true,
  draw(ctx, ev, k, I) {
    const { cw, ch, S } = I; if (!S) return;
    const s = evS(ev), A = cw * 0.034 * ampOf(ev) * bell(k);
    if (A < 0.5) return;
    const n = 54, h = ch / n, fr = 2 + J.r(s, 1) * 2, ph = k * 8 + J.r(s, 2) * 6;
    for (let i = 0; i < n; i++) {
      const y = Math.floor(i * h), hh = Math.min(ch - y, Math.ceil(h) + 1);
      ctx.drawImage(S, 0, y, cw, hh, Math.sin(i / n * TAU * fr + ph) * A, y, cw, hh);
    }
  } });

fxReg('pixelDrift', { name: 'ピクセルずれ', tags: ['glitch'], w: 0.8, dur: 3, amp: 1, glitchy: true, mid: true, scratch: true,
  draw(ctx, ev, k, I) {
    const { cw, ch, S } = I; if (!S) return;
    const a = ampOf(ev), s0 = I.step * 7 + evS(ev), m = 16 + (J.h(s0, 1) % 14);
    for (let i = 0; i < m; i++) {
      const h = Math.max(1, Math.round(ch * J.rr(0.003, 0.022, s0, i, 2))), y = Math.round(clamp(ch * (0.2 + 0.6 * J.r(s0, i, 1)), 0, ch - h));
      const len = Math.round(cw * J.rr(0.05, 0.3, s0, i, 4)), x0 = Math.round(J.r(s0, i, 3) * (cw - len)), dx = J.rs(s0, i, 5) * cw * 0.07 * a;
      if (J.r(s0, i, 6) < 0.35) ctx.drawImage(S, x0, y, 1, h, dx > 0 ? x0 : x0 - len, y, len, h);
      else ctx.drawImage(S, x0, y, len, h, x0 + dx, y, len, h);
    }
  } });

fxReg('zoomPunch', { name: 'ズームパンチ', tags: ['pop', 'graphic', 'glitch'], w: 1, dur: 4, amp: 1, mid: true, scratch: true,
  draw(ctx, ev, k, I) {
    const { cw, ch, S } = I; if (!S) return;
    const amt = k < 0.25 ? E.outExpo(k / 0.25) : 1 - E.inOutCubic((k - 0.25) / 0.75);
    const z = 1 + (0.06 + 0.04 * J.r(evS(ev), 1)) * clamp(ampOf(ev), 0.5, 1.3) * amt;
    if (z <= 1.001) return;
    ctx.drawImage(S, cw / 2 - cw * z / 2, ch / 2 - ch * z / 2, cw * z, ch * z);
  } });

fxReg('lightSweep', { name: '光の筋', tags: ['pop', 'emotional', 'calm'], w: 0.9, dur: 7, amp: 1, mid: true,
  draw(ctx, ev, k, I) {
    const { cw, ch, sc } = I, s = evS(ev), dk = isDark(sc.bg);
    const ang = (20 + 20 * J.r(s, 1)) * DEG * (J.r(s, 2) < 0.5 ? 1 : -1), p = E.inOutCubic(k), dir = J.r(s, 3) < 0.5 ? 1 : -1;
    const xc = dir > 0 ? J.lerp(-0.3, 1.3, p) * cw : J.lerp(1.3, -0.3, p) * cw, bw = cw * 0.11, HH = Math.hypot(cw, ch);
    const a = Math.min(1, ampOf(ev)) * Math.pow(bell(k), 0.5);
    const col = dk ? sc.fg : J.mix(sc.accent, '#ffffff', 0.35);
    ctx.globalCompositeOperation = dk ? 'screen' : 'multiply';
    ctx.translate(xc, ch / 2); ctx.rotate(ang);
    const strip = (x, w, al) => {
      const g = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
      g.addColorStop(0, J.rgba(col, 0)); g.addColorStop(0.5, J.rgba(col, al)); g.addColorStop(1, J.rgba(col, 0));
      ctx.fillStyle = g; ctx.fillRect(x - w / 2, -HH, w, HH * 2);
    };
    strip(0, bw, 0.6 * a); strip(-bw * 0.95 * dir, bw * 0.25, 0.45 * a);
  } });

fxReg('crtOff', { name: 'ブラウン管オフ', tags: ['glitch', 'emotional'], w: 0.3, dur: 8, pre: 4, amp: 1, scratch: true,
  draw(ctx, ev, k, I) {
    const { cw, ch, S } = I; if (!S) return;
    let sy, sx, br;
    if (k < 0.5) { const q = k / 0.5; sy = Math.max(0.004, 1 - E.inCubic(Math.min(1, q * 1.15))); sx = q > 0.8 ? Math.max(0.01, 1 - E.inCubic((q - 0.8) / 0.2) * 0.99) : 1; br = E.inQuad(q); }
    else { const q = (k - 0.5) / 0.5; sy = Math.max(0.004, E.outExpo(clamp(q * 1.4 - 0.15))); sx = q < 0.15 ? Math.max(0.01, E.outCubic(q / 0.15)) : 1; br = 1 - E.outCubic(q); }
    const w = cw * sx, h = Math.max(1, ch * sy), x = cw / 2 - w / 2, y = ch / 2 - h / 2;
    ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, cw, ch);
    ctx.drawImage(S, x, y, w, h);
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = `rgba(255,255,255,${(br * 0.85).toFixed(3)})`; ctx.fillRect(x, y, w, h);
    const gh = ch * 0.05 * br + 1, g = ctx.createLinearGradient(0, ch / 2 - gh, 0, ch / 2 + gh);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, `rgba(255,255,255,${(0.6 * br).toFixed(3)})`); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(x - w * 0.05, ch / 2 - gh, w * 1.1, gh * 2);
  } });

fxReg('splitSlide', { name: '上下スライド', tags: ['graphic', 'pop', 'glitch'], w: 0.9, dur: 6, pre: 2, amp: 1, mid: true, scratch: true,
  draw(ctx, ev, k, I) {
    const { cw, ch, S, sc } = I; if (!S) return;
    const s = evS(ev), amt = cover(k, 1 / 3, E.outCubic, E.inOutCubic), vert = J.r(s, 1) < 0.3, sp = 0.5 + J.rs(s, 2) * 0.08;
    if (amt <= 0.002) return;
    const lw = Math.max(2, Math.round(Math.min(cw, ch) * 0.004));
    ctx.fillStyle = sc.bg; ctx.fillRect(0, 0, cw, ch);
    if (!vert) {
      const d = cw * 0.09 * ampOf(ev) * amt, ys = Math.round(ch * sp);
      ctx.drawImage(S, 0, 0, cw, ys, -d, 0, cw, ys); ctx.drawImage(S, 0, ys, cw, ch - ys, d, ys, cw, ch - ys);
      ctx.globalAlpha = amt; ctx.fillStyle = sc.accent; ctx.fillRect(0, ys - lw / 2, cw, lw);
    } else {
      const d = ch * 0.1 * ampOf(ev) * amt, xs = Math.round(cw * sp);
      ctx.drawImage(S, 0, 0, xs, ch, 0, -d, xs, ch); ctx.drawImage(S, xs, 0, cw - xs, ch, xs, d, cw - xs, ch);
      ctx.globalAlpha = amt; ctx.fillStyle = sc.accent; ctx.fillRect(xs - lw / 2, 0, lw, ch);
    }
  } });
})();
