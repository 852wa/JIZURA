/* JIZURA pack: treattrans — text treatments (neon, chrome, karaoke, reflection, ransom…) + cut-to-cut transitions (カット間のつなぎ) */
(() => {
'use strict';
const E = J.E;
const PK = 'treattrans';
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
const glyphN = t => [...String(t || '')].filter(c => c.trim()).length;
const isSp = ch => ch === ' ' || ch === '　';
// true while a piece-based entrance / exit is moving (gradient / no-fill / copies would fight its pieces)
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
    out.push({ g, x: g.x * sx + g.vx * sx + ((c && c.dx) || 0), y: g.y * sy + g.vy * sy + ((c && c.dy) || 0), w: g.w * sx, h: g.h * sy,
      s: c && c.s != null ? c.s : 1, rot: (c && c.rot) || 0, a: c && c.a != null ? c.a : 1 });
  }
  return out;
};
// a plain copy of an item for extra passes (shadows, rims…): no hooks, no effects of its own
const bare = (i, extra) => Object.assign({}, i, { pre: null, post: null, echo: null, streak: null, shadow: null, extrude: null, pattern: null, patternBg: null, gradient: null,
  pieceFn: null, strokeDash: null, strokeUnder: false, wipeBar: null, cursorAt: null, bands: null, vbands: null, clip: null, clipY: null, clipFn: null, blend: null, _lay: null }, extra || {});
// is the item mid "dash" draw-on (stroke tracing) — copies built from fills would give it away
const tracing = i => i.dash != null && i.dash < 1;

/* ================= TREATMENTS ================= */

/* ---- neon tube: bright thin outline + coloured bloom, no fill, rare flicker ---- */
reg('treat', 'neonOutline', { name: 'ネオン管', tags: ['glitch', 'emotional', 'pop'], w: 0.8,
  plan: rng => ({ k: rng.range(0.024, 0.032), fl: rng.chance(0.75) }),
  apply(env, it, P) {
    if (!alive(it, 0.5) || inPieces(env, it)) return;
    const sc = env.sc, col = colOf(env, it), dk = isDark(sc.bg);
    const gc = dk ? firstOK([sc.accent, sc.accent2, sc.ghostA, sc.ghostB], c => J.lum(c) > J.lum(sc.bg) + 0.15 && ctr(c, col) >= 1.2, col)
      : firstOK([sc.accent, sc.accent2, sc.ghostA, sc.ghostB], c => ctr(c, sc.bg) >= 1.8, col);
    const tube = dk ? J.mix(col, '#FFFFFF', 0.4) : col;
    it.fill = false; it.strokeColor = tube;
    sized(it, env, i => {
      i.stroke = Math.max(1.4, i.size * P.k);
      i.shadow = { color: J.rgba(gc, dk ? 1 : 0.7), blur: i.size * 0.07, dx: 0, dy: 0 };
    });
    addPre(it, (e, i) => {                       // wide soft bloom under the tube (main pass only)
      if (e.pass !== 'main' || tracing(i)) return;
      const s = i.size;
      const c = bare(i, { fill: false, stroke: s * P.k * 4.5, strokeColor: gc, alpha: (i.alpha ?? 1) * (dk ? 0.22 : 0.16), shadow: { color: J.rgba(gc, 0.9), blur: s * 0.16, dx: 0, dy: 0 } });
      withFx(e, i, () => J.drawItem(e, c), false);
    });
    if (P.fl) {
      const s0 = J.h(env.cut.seed, (it.mi | 0) + 3, 41);
      it.charFns.push(gi => { const r = J.r(s0, gi, env.step); return r < 0.03 ? { a: 0.22 } : r < 0.05 ? { a: 0.6 } : null; });
    }
  } });

/* ---- chrome: multi-stop metallic fill with a hard horizon + keyline ---- */
reg('treat', 'chrome', { name: 'クローム', tags: ['pop', 'graphic'], w: 0.7,
  plan: rng => ({ v: rng.pick(['silver', 'silver', 'sunset']), h: rng.range(0.5, 0.56) }),
  apply(env, it, P) {
    if (!alive(it) || inPieces(env, it)) return;
    const sc = env.sc, col = colOf(env, it), light = J.lum(col) > 0.42, h = P.h;
    const acc = accentFor(sc, col, 1.3);
    const top0 = light ? '#FFFFFF' : J.mix(col, '#FFFFFF', 0.55);
    const top1 = light ? J.mix(col, '#000000', 0.42) : col;
    const band = J.mix(col, '#000000', light ? 0.62 : 0.45);
    const low0 = P.v === 'sunset' ? J.mix(acc, '#FFFFFF', 0.5) : J.mix(col, '#FFFFFF', light ? 0.75 : 0.42);
    const low1 = P.v === 'sunset' ? acc : J.mix(col, '#000000', light ? 0.12 : 0.25);
    it.gradient = [[0.08, top0], [h, top1], [h, band], [h + 0.03, band], [h + 0.03, low0], [0.94, low1]];
    it.strokeColor = light ? J.mix(col, '#000000', 0.7) : J.mix(col, '#000000', 0.35);
    sized(it, env, i => { i.stroke = Math.max(1.2, i.size * 0.022); });
  } });

/* ---- rainbow: colours drift across the glyphs through the scheme palette ---- */
reg('treat', 'rainbow', { name: '虹色', tags: ['pop', 'emotional'], w: 0.7,
  plan: rng => ({ v: rng.pick(['drift', 'drift', 'steps']), sp: rng.range(0.28, 0.45), dir: rng.chance(0.5) ? 1 : -1 }),
  apply(env, it, P) {
    if (!alive(it)) return;
    const sc = env.sc, col = colOf(env, it);
    if (onPlate(sc, col)) return;
    const pal = [col];
    for (const c of [sc.accent, sc.accent2, sc.ghostA, sc.ghostB, sc.sub]) if (c && ctr(c, sc.bg) >= 1.8 && pal.every(p => ctr(p, c) >= 1.25)) pal.push(c);
    if (pal.length < 3) pal.push(J.fitContrast(J.mix(sc.accent, sc.accent2 || sc.fg, 0.5), sc.bg, 2));
    const L = pal.length, off = it.mi | 0;
    it.charFns.push(gi => {
      if (P.v === 'steps') { const k = ((gi + off + Math.floor(env.ltb * 2.2) * P.dir) % L + L) % L; return { color: pal[k] }; }
      const u = (gi + off) * P.sp - env.ltb * 0.75 * P.dir, k = ((u % L) + L) % L, a = Math.floor(k), f = J.smooth(0.3, 0.7, k - a);
      return { color: J.mix(pal[a], pal[(a + 1) % L], f) };
    });
  } });

/* ---- colour-plate misregistration: two tinted copies split sideways, jolting on glitch steps ---- */
reg('treat', 'glitchSplit', { name: '色版ズレ', tags: ['glitch', 'pop'], w: 0.8,
  plan: rng => ({ d: rng.range(0.06, 0.08), up: rng.chance(0.3) }),
  apply(env, it, P) {
    if (!alive(it) || inPieces(env, it)) return;
    const sc = env.sc, col = colOf(env, it), dk = isDark(sc.bg);
    const cands = [sc.ghostA, sc.ghostB, sc.accent, sc.accent2].filter(c => c && ctr(c, sc.bg) >= 1.4 && ctr(c, col) >= 1.15);
    const cA = cands[0] || accentFor(sc, col, 1.4), cB = cands.find(c => ctr(c, cA) >= 1.3) || J.mix(cA, sc.bg, 0.4);
    const s0 = J.h(env.cut.seed, (it.mi | 0) + 5, 43);
    addPre(it, (e, i) => {
      const r = J.r(s0, e.step), hit = r < 0.2 && e.lt > e.cut.inDur * 0.5;
      if (hit && !i.bands && !i.vbands && e.pass === 'main') {
        const s = i.size;
        i.bands = J.itemBands(e, i, 4, k => (J.r(s0, e.step, k, 7) < 0.55 ? J.rs(s0, e.step, k, 8) * s * 0.16 : 0));
      }
      if (e.pass !== 'main' || tracing(i)) return;
      const s = i.size, d = s * P.d * (hit ? 1.8 + J.r(s0, e.step, 2) : 1), dy = (P.up ? d * 0.45 : 0) + (hit ? J.rs(s0, e.step, 3) * s * 0.02 : 0);
      const cp = (c, k) => bare(i, { x: i.x + d * k, y: i.y + dy * k, color: c, strokeColor: c, stroke: 0, blend: dk ? 'screen' : 'multiply', alpha: (i.alpha ?? 1) * 0.95 });
      withFx(e, i, () => { J.drawItem(e, cp(cA, -1)); J.drawItem(e, cp(cB, 1)); }, false);
    });
  } });

/* ---- stacked shadows: 3 separated copies in different scheme colours ---- */
reg('treat', 'shadowStack', { name: '多重影', tags: ['pop', 'graphic'], w: 0.8,
  plan: rng => ({ d: rng.range(0.04, 0.055), dir: rng.pick([[1, 1], [1, 1], [-1, 1], [1, 0.5], [0, 1]]), n: rng.pick([3, 3, 4]) }),
  apply(env, it, P) {
    if (!alive(it) || inPieces(env, it)) return;
    const sc = env.sc, col = colOf(env, it);
    const cols = [];
    for (const c of [sc.accent, sc.accent2, sc.ghostB, sc.ghostA, sc.ink, sc.sub, sc.fg]) if (c && ctr(c, sc.bg) >= 1.4 && ctr(c, col) >= 1.12 && cols.every(p => ctr(p, c) >= 1.12)) cols.push(c);
    while (cols.length < P.n) cols.push(J.mix(cols.length ? cols[cols.length - 1] : accentFor(sc, col), sc.bg, 0.35));
    it.strokeColor = sc.bg; it.strokeUnder = true;
    sized(it, env, i => { i.stroke = Math.max(1.5, i.size * 0.028); });
    addPre(it, (e, i) => {
      if (e.pass !== 'main' || tracing(i)) return;
      const s = i.size, d = s * P.d;
      withFx(e, i, () => {
        for (let k = P.n; k >= 1; k--) {
          J.drawItem(e, bare(i, { x: i.x + P.dir[0] * d * k, y: i.y + P.dir[1] * d * k, color: cols[k - 1], stroke: Math.max(1.5, s * 0.028), strokeColor: sc.bg, strokeUnder: true }));
        }
      }, false);
    });
  } });

/* ---- stencil: bridges cut through every glyph (per-glyph clips, so the chromatic ghosts get them too); they open during the entrance ---- */
reg('treat', 'stencilGap', { name: 'ステンシル字', tags: ['graphic', 'editorial', 'glitch'], w: 0.6,
  plan: rng => ({ v: rng.pick(['one', 'one', 'two']), at: rng.range(-0.05, 0.06), g: rng.range(0.034, 0.048) }),
  apply(env, it, P) {
    if (!alive(it) || inPieces(env, it)) return;
    const g = P.g * E.outCubic(inP(env, it, 0.04, 0.4)) * (1 - E.inCubic(env.pOut));
    if (g < 0.003) return;
    const cuts = P.v === 'two' ? [-0.13, 0.13] : [P.at], vert = false;
    const parts = [];
    let lo = -0.8;
    for (const c of cuts) { parts.push([lo, c - g]); lo = c + g; }
    parts.push([lo, 0.8]);
    const fns = parts.map(pr => () => (vert ? { clipX: pr } : { clipY: pr }));
    it.charFns.push(fns[0]);
    addPre(it, (e, i) => {
      if (tracing(i)) return;
      const rest = i.charFns.filter(f => f !== fns[0]);
      withFx(e, i, () => { for (let k = 1; k < fns.length; k++) J.drawItem(e, bare(i, { charFn: J.combineChar(rest.concat([fns[k]])) })); }, false);
    });
  } });

/* ---- water level: outlined glyphs fill up with colour, the surface bobs, drains on exit ---- */
reg('treat', 'waterline', { name: '水位', tags: ['emotional', 'pop', 'calm'], w: 0.6,
  plan: rng => ({ lvl: rng.range(0.46, 0.58), c: rng.int(0, 1), k: rng.range(0.02, 0.026) }),
  apply(env, it, P) {
    if (!alive(it, 0.5) || inPieces(env, it)) return;
    const sc = env.sc, col = colOf(env, it), liq = P.c ? accentFor(sc, col, 1.3) : col;
    const q = E.inOutCubic(inP(env, it, 0.05, 0.8)) * (1 - E.inCubic(env.pOut));
    const L = J.lerp(1.02, P.lvl, q) + Math.sin(env.ltb * 2.6 + (it.mi | 0)) * 0.022 * q;
    const surf = J.mix(liq, '#FFFFFF', isDark(liq) ? 0.35 : 0.5);
    it.gradient = [[0, TR], [clamp(L - 0.001), TR], [clamp(L), surf], [clamp(L + 0.025), surf], [clamp(L + 0.025), liq], [1, liq]];
    it.strokeColor = col;
    sized(it, env, (i, e) => { i.stroke = Math.max(1.3, i.size * P.k); if (e.pass !== 'main') i.fill = false; });
  } });

/* ---- karaoke: a colour wipe runs through the words over the length of the cut ---- */
reg('treat', 'karaoke', { name: 'カラオケ', tags: ['emotional', 'pop', 'editorial'], w: 0.9,
  plan: rng => ({ sp: rng.range(0.7, 0.85), ol: rng.chance(0.55) }),
  apply(env, it, P) {
    if (!alive(it, 0.9)) return;
    const sc = env.sc, col = colOf(env, it), hot = accentFor(sc, col, 1.8), cut = env.cut;
    if (onPlate(sc, col)) return;
    if (P.ol) {
      const oc = best([sc.bg, sc.ink, '#111111', '#FFFFFF'], col);
      it.strokeColor = oc; it.strokeUnder = true;
      sized(it, env, i => { i.stroke = Math.max(1.5, i.size * 0.06); });
    }
    addPost(it, (e, i) => {
      if (e.pass !== 'main' || tracing(i)) return;
      const t0 = cut.inDur * 0.6, T = Math.max(0.3, (cut.dur - cut.outDur - t0) * P.sp);
      const q = E.inOutSine(clamp((e.lt - (i.delay || 0) - t0) / T));
      if (q <= 0) return;
      const spans = lineSpans(i); if (!spans.length) return;
      const s = i.size, sx = i.sx || 1, sy = i.sy || 1, pad = s * 0.12;
      const tot = spans.reduce((a, L) => a + (L.a1 - L.a0), 0);
      let rem = q * tot;
      const c = bare(i, { x: 0, y: 0, rot: 0, skew: 0, color: hot, blur: 0, strokeUnder: i.strokeUnder });
      withFx(e, i, () => {
        const ctx = e.ctx;
        ctx.save(); ctx.beginPath();
        for (const L of spans) {
          if (rem <= 0) break;
          const len = L.a1 - L.a0, take = Math.min(len, rem); rem -= take;
          const a0 = L.a0 - pad, a1 = L.a0 + take + (take >= len - 0.01 ? pad : 0), cr = s * (i.vertical ? sx : sy) * 0.72;
          if (i.vertical) ctx.rect(L.c - cr, a0, cr * 2, a1 - a0); else ctx.rect(a0, L.c - cr, a1 - a0, cr * 2);
        }
        ctx.clip();
        J.drawItem(e, c);
        ctx.restore();
      });
    });
  } });

/* ---- size rhythm: glyph sizes alternate / follow script / ramp away, re-spaced tightly on a shared baseline ---- */
reg('treat', 'sizeWave', { name: '大小リズム', tags: ['pop', 'graphic', 'editorial'], w: 0.7,
  plan: rng => ({ v: rng.pick(['alt', 'kanji', 'kanji', 'ramp', 'wave']), k: rng.range(0.64, 0.74), rev: rng.chance(0.4) }),
  apply(env, it, P) {
    if (!alive(it, 0.5)) return;
    const lay = J.layoutText(it), N = lay.N, off = it.mi | 0;
    if (!N) return;
    const chars = lay.map(g => g.ch).filter(c => c.trim());
    const isK = c => J.isKanji(c) || J.isKata(c) || J.isLatin(c);
    let v = P.v;
    if (v === 'kanji' && !(chars.some(isK) && chars.some(c => !isK(c)))) v = 'alt';
    if ((v === 'ramp' || v === 'wave') && chars.length < 3) v = 'alt';
    const S = new Array(N).fill(1);
    for (const g of lay) {
      const u = g.n > 1 ? g.ci / (g.n - 1) : 0.5;
      let s = 1;
      if (v === 'alt') s = (g.ci + g.li + off) % 2 ? P.k : 1.04;
      else if (v === 'kanji') s = isK(g.ch) ? 1.08 : P.k + 0.04;
      else if (v === 'ramp') s = J.lerp(1.1, P.k, P.rev ? 1 - u : u);
      else s = 0.87 + 0.17 * Math.sin(g.ci * 1.25 + off);
      if (J.isPunct(g.ch)) s = Math.min(s, 0.9);
      S[g.i] = s;
    }
    // re-space along each line so smaller glyphs close up (offsets stored in em units)
    const F = new Array(N).fill(0), size0 = it.size, tr = (it.track || 0) * size0, vert = !!it.vertical;
    const byLine = new Map();
    for (const g of lay) { if (!byLine.has(g.li)) byLine.set(g.li, []); byLine.get(g.li).push(g); }
    for (const gs of byLine.values()) {
      const ext = g => (vert ? g.h : g.w), pos = g => (vert ? g.y : g.x);
      const tot = gs.reduce((a, g) => a + ext(g) * S[g.i], 0) + tr * (gs.length - 1);
      const old0 = pos(gs[0]) - ext(gs[0]) / 2, old1 = pos(gs[gs.length - 1]) + ext(gs[gs.length - 1]) / 2;
      let p = it.align === 'left' ? old0 : it.align === 'right' && !vert ? old1 - tot : (old0 + old1) / 2 - tot / 2;
      for (const g of gs) { const w = ext(g) * S[g.i]; F[g.i] = (p + w / 2 - pos(g)) / size0; p += w + tr; }
    }
    it.charFns.push((gi, g) => {
      const s = S[gi]; if (s == null) return null;
      if (vert) return { s, dy: F[gi] * g.w * (it.sy || 1) };
      return { s, dx: F[gi] * g.h * (it.sx || 1), dy: (1 - s) * 0.4 * g.h * (it.sy || 1) };
    });
  } });

/* ---- alternating tilt: glyphs lean left / right like hand-set type ---- */
reg('treat', 'rotateAlt', { name: '揺れ字', tags: ['pop', 'emotional'], w: 0.7, safe: true,
  plan: rng => ({ a: rng.range(9, 14), v: rng.pick(['alt', 'alt', 'rand']) }),
  apply(env, it, P) {
    if (!alive(it, 0.5)) return;
    const off = it.mi | 0, s0 = J.h(env.cut.seed, off + 9, 47);
    it.charFns.push((gi, g) => {
      if (J.isPunct(g.ch)) return null;
      const sg = (gi + off) % 2 ? 1 : -1, r = P.v === 'rand' ? sg * P.a * J.rr(0.45, 1.25, s0, gi) : sg * P.a;
      return { rot: r, s: 0.94 };
    });
  } });

/* ---- baseline shift: alternate up/down, stairs or an arch ---- */
reg('treat', 'baselineShift', { name: '段違い', tags: ['pop', 'graphic'], w: 0.7, safe: true,
  plan: rng => ({ v: rng.pick(['alt', 'alt', 'stairs', 'arc']), k: rng.range(0.08, 0.11), dir: rng.chance(0.5) ? 1 : -1 }),
  apply(env, it, P) {
    if (!alive(it, 0.5)) return;
    const off = it.mi | 0, vert = !!it.vertical, kk = String(it.text).includes('\n') ? 0.7 : 1;
    it.charFns.push((gi, g) => {
      const u = g.n > 1 ? g.ci / (g.n - 1) : 0.5;
      let o;
      if (P.v === 'stairs') o = (u - 0.5) * P.k * Math.min(3.2, g.n * 0.55) * P.dir;
      else if (P.v === 'arc') o = (Math.sin(Math.PI * u) - 0.6) * P.k * 2.2;
      else o = ((g.ci + off) % 2 ? 1 : -1) * P.k;
      return vert ? { dx: o * kk * g.w * (it.sx || 1) } : { dy: -o * kk * g.h * (it.sy || 1) };
    });
  } });

/* ---- faux bold: same-colour stroke thickens every stem ---- */
reg('treat', 'fauxBold', { name: '極太', tags: ['graphic', 'pop', 'editorial'], w: 0.5, safe: true,
  plan: rng => ({ k: rng.range(0.035, 0.05) }),
  apply(env, it, P) {
    if (!alive(it)) return;
    it.strokeColor = colOf(env, it); it.track = (it.track || 0) + P.k;
    sized(it, env, (i, e) => { i.stroke = inPieces(e, i) ? 0 : Math.max(1, i.size * P.k); });
  } });

/* ---- circled glyphs: each character sits in its own ring (or solid disc) ---- */
reg('treat', 'circled', { name: '丸囲み', tags: ['pop', 'graphic', 'editorial'], w: 0.6,
  plan: rng => ({ v: rng.pick(['ring', 'ring', 'disc']), k: rng.range(0.68, 0.74) }),
  apply(env, it, P) {
    if (!alive(it, 0.9)) return;
    const sc = env.sc, col = colOf(env, it), disc = P.v === 'disc';
    if (onPlate(sc, col)) return;
    const rc = disc ? firstOK([sc.accent, sc.accent2, sc.ink, sc.fg], c => ctr(c, sc.bg) >= 2 && ctr(c, col) >= 1.3, sc.fg) : markCol(sc, col);
    const tc = disc ? textOn(rc, col, sc) : col;
    const qOf = (e, gi) => E.outBack(clamp((e.lt - (it.delay || 0) - gi * 0.04) / 0.26), 1.6) * (1 - E.inCubic(clamp(e.pOut * 1.4 - gi * 0.03)));
    it.charFns.push((gi, g) => (J.isPunct(g.ch) ? null : disc && tc !== col && qOf(env, gi) > 0.55 ? { s: P.k, color: tc } : { s: P.k }));
    addPre(it, (e, i) => withFx(e, i, () => {
      const s = i.size, a = i.alpha ?? 1, m = Math.min(i.sx || 1, i.sy || 1);
      for (const G of glyphList(i)) {
        if (J.isPunct(G.g.ch)) continue;
        const q = qOf(e, G.g.i); if (q <= 0.01) continue;
        const r = s * 0.49 * m * (G.s / P.k) * q;
        if (disc) e.circle(G.x, G.y, r, rc, null, 0, a * G.a, true);
        else e.circle(G.x, G.y, r * 0.97, null, rc, Math.max(1.5, s * 0.045), a * G.a, true);
      }
    }));
  } });

/* ---- 「」 corner quotes drawn around the whole lyric ---- */
const QUOTED = new WeakMap();
reg('treat', 'bracketsQuote', { name: 'かぎ括弧', tags: ['editorial', 'emotional', 'calm'], w: 0.6,
  plan: rng => ({ v: rng.pick(['single', 'single', 'double']), k: rng.range(0.05, 0.065) }),
  apply(env, it, P) {
    if (!alive(it, 0.9)) return;
    const norm = t => String(t || '').replace(/[\s\u3000]/g, ''), whole = norm(env.cut.text), mine = norm(it.text);
    if (!mine || !whole) return;
    let open = whole.startsWith(mine), close = whole.endsWith(mine);
    if (!open && !close) return;
    if (mine === whole) QUOTED.set(env, true);
    else if ([...mine].length === 1) {
      // one-glyph items (mixed, scatter…): only the first / last glyph by motion index — and none once the whole lyric got its pair
      const n = [...whole].length, mi = it.mi;
      if (QUOTED.get(env) || mi == null || mi !== Math.round(mi)) return;
      open = open && mi === 0; close = close && mi === n - 1;
      if (!open && !close) return;
    }
    const sc = env.sc, lc = markCol(sc, colOf(env, it));
    // leave room for the brackets
    const m = J.measure(it), along = it.vertical ? m.h : m.w, room = it.size * 1.1, cap = (it.vertical ? env.H : env.W) * 0.92;
    if (along + room > cap && along < cap * 1.05) it.size *= Math.max(0.72, cap / (along + room));
    addPost(it, (e, i) => withFx(e, i, () => {
      const spans = lineSpans(i); if (!spans.length) return;
      const s = i.size * Math.min(i.sx || 1, i.sy || 1), a = i.alpha ?? 1;
      const q = E.outCubic(inP(e, i, e.cut.inDur * 0.45, 0.35)) * (1 - E.inCubic(e.pOut));
      if (q <= 0.01) return;
      const L0 = spans[0], L1 = spans[spans.length - 1], lw = Math.max(1.5, s * P.k), g = s * 0.3, arm = s * 0.36, leg = s * 0.74;
      const draw = (pts) => e.polyPartial(pts, q, lc, lw, a, false);
      const one = (d) => {
        if (!i.vertical) {
          const xL = L0.a0 - g - d, yT = L0.c - s * 0.52 - d, xR = L1.a1 + g + d, yB = L1.c + s * 0.52 + d;
          if (open) draw([[xL + arm, yT], [xL, yT], [xL, yT + leg]]);
          if (close) draw([[xR - arm, yB], [xR, yB], [xR, yB - leg]]);
        } else {
          const xR = L0.c + s * 0.52 + d, yT = L0.a0 - g - d, xL = L1.c - s * 0.52 - d, yB = L1.a1 + g + d;
          if (open) draw([[xR, yT + arm], [xR, yT], [xR - leg, yT]]);
          if (close) draw([[xL, yB - arm], [xL, yB], [xL + leg, yB]]);
        }
      };
      one(0);
      if (P.v === 'double') one(-lw * 2.2);
    }));
  } });

/* ---- reflection: a flipped, fading copy of the last line on an imaginary floor ---- */
reg('treat', 'reflection', { name: '映り込み', tags: ['emotional', 'calm', 'editorial'], w: 0.6,
  plan: rng => ({ k: rng.range(0.6, 0.78), a: rng.range(0.34, 0.46), gap: rng.range(0.04, 0.09) }),
  apply(env, it, P) {
    if (!alive(it, 0.9)) return;
    const col = colOf(env, it);
    addPre(it, (e, i) => {
      if (e.pass !== 'main' || tracing(i) || inPieces(e, i)) return;
      const m = J.measure(i), s = i.size, sy = i.sy || 1, k = P.k;
      const yb = i.vertical && i.align === 'left' ? m.h : m.h / 2, gap = s * sy * P.gap;
      const cf = i.charFn;
      const c = bare(i, { x: 0, y: yb + gap + yb * k, rot: 0, skew: 0, sy: -sy * k, blur: 0,
        gradient: [[0, TR], [0.42, J.rgba(col, 0.12)], [1, J.rgba(col, 1)]], alpha: (i.alpha ?? 1) * P.a,
        charFn: cf ? (gi, g, n) => { const r = cf(gi, g, n); return r ? Object.assign({}, r, { dy: -(r.dy || 0) * k, rot: -(r.rot || 0), color: null }) : r; } : null });
      withFx(e, i, () => {
        const ctx = e.ctx;
        ctx.save(); ctx.beginPath(); ctx.rect(-e.W * 3, yb + gap * 0.5, e.W * 6, gap * 0.5 + s * sy * k * 1.05); ctx.clip();
        J.drawItem(e, c);
        ctx.restore();
      });
    });
  } });

/* ---- inline (インライン): a hairline in the background colour runs just inside every stroke, like display type ---- */
reg('treat', 'inline', { name: 'インライン', tags: ['editorial', 'pop', 'graphic'], w: 0.6,
  plan: rng => ({ a: rng.range(0.017, 0.022), b: rng.range(0.016, 0.021), c: rng.chance(0.3) }),
  apply(env, it, P) {
    if (!alive(it) || inPieces(env, it)) return;
    const sc = env.sc, col = colOf(env, it);
    const line = P.c ? firstOK([sc.accent, sc.accent2], c => ctr(c, col) >= 2, sc.bg) : sc.bg;
    addPost(it, (e, i) => {
      if (e.pass !== 'main' || tracing(i) || inPieces(e, i)) return;
      const s = i.size;
      const cut = bare(i, { fill: false, stroke: s * (P.a + P.b) * 2, strokeColor: line });
      const rim = bare(i, { fill: false, stroke: s * P.a * 2, strokeColor: col });
      withFx(e, i, () => { J.drawItem(e, cut); J.drawItem(e, rim); }, false);
    });
  } });

/* ---- die-cut sticker: thick white paper border (+ keyline for light text), soft drop shadow, slightly tilted ---- */
reg('treat', 'sticker', { name: 'シール縁', tags: ['pop', 'graphic'], w: 0.8,
  plan: rng => ({ k: rng.range(0.13, 0.17), rot: rng.range(2, 4) * (rng.chance(0.5) ? 1 : -1), sh: rng.range(0.035, 0.05) }),
  apply(env, it, P) {
    if (!alive(it, 0.9)) return;
    const sc = env.sc, col = colOf(env, it), dk = isDark(sc.bg);
    const paper = firstOK([sc.ink, sc.fg, sc.sub], c => J.lum(c) > 0.78, '#FFFFFF');
    const key = ctr(col, paper) < 2.5 ? firstOK([sc.accent, sc.accent2, sc.ghostB, sc.ghostA], c => ctr(c, paper) >= 2.2 && ctr(c, col) >= 1.8, '#111111') : null;
    const edge = J.mix(paper, '#000000', 0.16);
    if (!it.vertical || glyphN(it.text) <= 4) it.rot = (it.rot || 0) + P.rot * (((it.mi | 0) % 2) ? -0.7 : 1);
    addPre(it, (e, i) => {
      if (e.pass !== 'main' || inPieces(e, i)) return;
      const s = i.size;
      const rim = bare(i, { fill: false, stroke: s * (P.k + 0.016), strokeColor: edge, shadow: { color: `rgba(0,0,0,${dk ? 0.6 : 0.32})`, blur: s * 0.05, dx: s * 0.015, dy: s * P.sh } });
      const pap = bare(i, { fill: false, stroke: s * P.k, strokeColor: paper });
      withFx(e, i, () => {
        J.drawItem(e, rim); J.drawItem(e, pap);
        if (key) J.drawItem(e, bare(i, { fill: false, stroke: s * 0.07, strokeColor: key }));
      }, false);
    });
  } });

/* ---- glint sweep / tide: an animated gradient runs through the letters ---- */
reg('treat', 'gradientSweep', { name: '光沢スイープ', tags: ['pop', 'emotional'], w: 0.7,
  plan: rng => ({ v: rng.pick(['glint', 'glint', 'tide']), per: rng.range(1.5, 2.3), ph: rng.range(0, 1) }),
  apply(env, it, P) {
    if (!alive(it) || inPieces(env, it)) return;
    const sc = env.sc, col = colOf(env, it);
    const t = env.ltb / P.per + P.ph;
    if (P.v === 'tide') {
      const c2 = accentFor(sc, col, 1.5), u = 0.52 + 0.3 * Math.sin(t * TAU), line = J.mix(c2, '#FFFFFF', 0.45);
      it.gradient = [[0, col], [u - 0.02, col], [u - 0.02, line], [u + 0.01, line], [u + 0.01, c2], [1, c2]];
      return;
    }
    const hl = J.lum(col) > 0.6 ? firstOK([sc.accent, sc.accent2, sc.ghostA, sc.ghostB], c => J.lum(c) > 0.3 && ctr(c, col) >= 1.3, J.mix(col, sc.bg, 0.45)) : J.mix(col, '#FFFFFF', 0.72);
    const u = (t % 1) * 1.7 - 0.35, w = 0.13;
    it.gradient = [[0, col], [clamp(u - w), col], [clamp(u), hl], [clamp(u + w * 0.35), hl], [clamp(u + w * 1.2), col], [1, col]];
  } });

/* ---- wide tracking: letter-spaced, a size smaller (editorial caption look) ---- */
reg('treat', 'kerningWide', { name: '字間広め', tags: ['editorial', 'calm', 'emotional'], w: 0.6, safe: true,
  plan: rng => ({ t: rng.range(0.32, 0.55), grow: rng.range(1.04, 1.14) }),
  apply(env, it, P) {
    if (!it.text || glyphN(it.text) < 2) return;
    const m0 = J.measure(it), a0 = it.vertical ? m0.h : m0.w;
    it.track = (it.track || 0) + (it.vertical ? P.t * 0.7 : P.t);
    const m1 = J.measure(it), a1 = it.vertical ? m1.h : m1.w, cap = (it.vertical ? env.H : env.W) * 0.9;
    let k = Math.min(1, a0 * P.grow / Math.max(1, a1));
    if (a1 * k > cap && a0 <= cap) k = Math.min(k, cap / a1);
    it.size *= Math.max(0.55, k);
  } });

/* ---- manuscript paper (原稿用紙): glyphs snap into equal square cells of a ruled grid ---- */
reg('treat', 'monoGrid', { name: '原稿用紙風', tags: ['editorial', 'calm', 'emotional'], w: 0.5,
  plan: rng => ({ pitch: rng.range(1.18, 1.26), c: rng.chance(0.65) ? 1 : 0 }),
  apply(env, it, P) {
    if (!alive(it, 0.9)) return;
    const sc = env.sc, col = colOf(env, it), vert = !!it.vertical;
    const lc = P.c ? firstOK([sc.accent, sc.accent2], c => ctr(c, sc.bg) >= 1.5, sc.sub) : sc.sub;
    const lines = String(it.text).split('\n'), nMax = Math.max(1, ...lines.map(l => [...l].length));
    const m0 = J.measure(it), along0 = vert ? m0.h : m0.w, along1 = nMax * P.pitch * it.size * (vert ? (it.sy || 1) : (it.sx || 1));
    if (along1 > along0 * 1.06) it.size *= along0 * 1.06 / along1;
    it.lead = Math.max(it.lead || 1.3, P.pitch + 0.16);
    const tgt = (g, sz) => {
      const p = P.pitch * sz;
      if (it.align === 'left') return (g.ci + 0.5) * p;
      if (it.align === 'right' && !vert) return -(g.n - g.ci - 0.5) * p;
      return (g.ci - (g.n - 1) / 2) * p;
    };
    it.charFns.push((gi, g) => (vert ? { dy: (tgt(g, g.w) - g.y) * (it.sy || 1), s: 0.86 } : { dx: (tgt(g, g.h) - g.x) * (it.sx || 1), s: 0.86 }));
    if (glyphN(it.text) < 2 || onPlate(sc, col)) return;             // one-glyph items (scatter…) / text on a plate: just the snapping
    const tint = J.mix(sc.bg, lc, isDark(sc.bg) ? 0.1 : 0.08);
    addPre(it, (e, i) => withFx(e, i, () => {
      const q = E.outCubic(inP(e, i, 0, 0.45)) * (1 - E.inCubic(e.pOut));
      if (q <= 0.01) return;
      const lay = J.layoutText(i), s = i.size, sx = i.sx || 1, sy = i.sy || 1, a = (i.alpha ?? 1) * q, ctx = e.ctx, main = e.pass === 'main';
      const cell = P.pitch * s, lw = Math.max(1, s * 0.013), gut = cell * 0.24;
      const rows = new Map();
      for (const g of lay) if (!rows.has(g.li)) rows.set(g.li, g);
      // rect in item space: (u0..u1 along the line, v0..v1 across it)
      const R = (u0, u1, v0, v1) => (vert ? [v0 * sx, u0 * sy, (v1 - v0) * sx, (u1 - u0) * sy] : [u0 * sx, v0 * sy, (u1 - u0) * sx, (v1 - v0) * sy]);
      const L = (u0, u1, v) => (vert ? [[v * sx, u0 * sy], [v * sx, u1 * sy]] : [[u0 * sx, v * sy], [u1 * sx, v * sy]]);
      for (const g of rows.values()) {
        const n = g.n; if (!n) continue;
        const c0 = tgt({ ci: 0, n }, s) - cell / 2, len = n * cell * q, cross = vert ? g.x : g.y;
        const v0 = cross - cell / 2, v1 = cross + cell / 2;
        if (main) { const r = R(c0, c0 + len, v0, v1); ctx.globalAlpha = a * 0.9; ctx.fillStyle = tint; ctx.fillRect(r[0], r[1], r[2], r[3]); ctx.globalAlpha = 1; }
        e.line(L(c0, c0 + len, v0), lc, lw, a * 0.85, false);
        e.line(L(c0, c0 + len, v1), lc, lw, a * 0.85, false);
        // ruby gutter: a second rule beside the row (above horizontal rows, right of vertical columns)
        e.line(L(c0 - cell * 0.1, c0 + len + cell * 0.1, vert ? v1 + gut : v0 - gut), lc, lw, a * 0.55, false);
        for (let k = 0; k <= n; k++) { const p = c0 + k * cell; if (p - c0 > len + 0.5) break; e.line(vert ? [[v0 * sx, p * sy], [v1 * sx, p * sy]] : [[p * sx, v0 * sy], [p * sx, v1 * sy]], lc, lw, a * 0.85, false); }
      }
    }));
  } });

/* ---- misregistered print: hollow outline on top, solid colour fill knocked off-register ---- */
reg('treat', 'outlineOffset', { name: '版ズレ袋文字', tags: ['pop', 'graphic', 'editorial'], w: 0.8,
  plan: rng => ({ d: rng.range(0.055, 0.08), dir: rng.pick([[1, 1], [1, 1], [-1, 1], [1, 0.35], [0.4, 1]]), k: rng.range(0.022, 0.03) }),
  apply(env, it, P) {
    if (!alive(it) || inPieces(env, it)) return;
    const sc = env.sc, col = colOf(env, it), fc = accentFor(sc, col, 1.4);
    it.fill = false; it.strokeColor = col;
    sized(it, env, i => { i.stroke = Math.max(1.4, i.size * P.k); });
    addPre(it, (e, i) => {
      if (e.pass !== 'main' || tracing(i)) return;
      const d = i.size * P.d;
      withFx(e, i, () => J.drawItem(e, bare(i, { fill: true, stroke: 0, color: fc, x: i.x + P.dir[0] * d, y: i.y + P.dir[1] * d })), false);
    });
  } });

/* ---- screen-tone shadow: an offset shadow printed as dots / hatching (manga tone) ---- */
reg('treat', 'toneShadow', { name: 'トーン影', tags: ['pop', 'graphic', 'editorial'], w: 0.7,
  plan: rng => ({ v: rng.pick(['dots', 'dots', 'hatch', 'stripes']), d: rng.range(0.09, 0.12), dir: rng.pick([[1, 1], [1, 1], [-1, 1], [1, 0.6]]) }),
  apply(env, it, P) {
    if (!alive(it)) return;
    const sc = env.sc, col = colOf(env, it);
    const tc = firstOK([sc.accent, sc.accent2, sc.fg, sc.ink], c => ctr(c, sc.bg) >= 2.2 && ctr(c, col) >= 1.3, markCol(sc, col));
    addPre(it, (e, i) => {
      if (e.pass !== 'main' || tracing(i) || inPieces(e, i)) return;
      const d = i.size * P.d;
      withFx(e, i, () => J.drawItem(e, bare(i, { x: i.x + P.dir[0] * d, y: i.y + P.dir[1] * d, color: tc, stroke: 0, pattern: P.v, patternColor: tc, patternBg: null })), false);
    });
  } });

/* ---- fade: glyph opacity trails off along the line (or toward both ends) ---- */
reg('treat', 'fadeChars', { name: '余韻', tags: ['emotional', 'calm'], w: 0.5, safe: true,
  plan: rng => ({ v: rng.pick(['tail', 'tail', 'both', 'head']), lo: rng.range(0.3, 0.4) }),
  apply(env, it, P) {
    if (!alive(it, 0.9)) return;
    it.charFns.push((gi, g) => {
      if (g.n < 3) return null;
      const u = g.ci / (g.n - 1);
      const f = P.v === 'both' ? Math.pow(Math.abs(u - 0.5) * 2, 1.4) : P.v === 'head' ? E.inQuad(1 - u) : E.inQuad(u);
      return { a: 1 - (1 - P.lo) * f };
    });
  } });

/* ---- cut & shift: every glyph is sliced through, the lower (vertical: right) half slides off ---- */
reg('treat', 'cutShift', { name: '断ち切り', tags: ['graphic', 'glitch', 'pop'], w: 0.7,
  plan: rng => ({ at: rng.range(-0.08, 0.06), d: rng.range(0.11, 0.16) * (rng.chance(0.5) ? 1 : -1), line: rng.chance(0.6) }),
  apply(env, it, P) {
    if (!alive(it) || inPieces(env, it)) return;
    const sc = env.sc, vert = !!it.vertical, lc = accentFor(sc, colOf(env, it), 1.6);
    const topFn = () => (vert ? { clipX: [-0.75, P.at] } : { clipY: [-0.75, P.at] });
    it.charFns.push(topFn);
    const amt = e => E.outBack(inP(e, it, e.cut.inDur * 0.55, 0.3), 2.2) * (1 - E.inCubic(e.pOut));
    addPre(it, (e, i) => {
      if (tracing(i)) return;
      const q = amt(e), s = i.size, d = s * P.d * q;
      const botFn = (gi, g) => (vert ? { clipX: [P.at, 0.75], dy: d } : { clipY: [P.at, 0.75], dx: d });
      const c = bare(i, { charFn: J.combineChar(i.charFns.filter(f => f !== topFn).concat([botFn])) });
      withFx(e, i, () => J.drawItem(e, c), false);
      if (P.line && e.pass === 'main' && q > 0.02) {
        withFx(e, i, () => {
          const lw = Math.max(1.2, s * 0.012), ex = s * 0.35 * q;
          for (const L of lineSpans(i)) {
            const cp = L.c + P.at * s * (vert ? (i.sx || 1) : (i.sy || 1));
            if (vert) e.line([[cp, L.a0 - ex], [cp, L.a1 + ex + d]], lc, lw, (i.alpha ?? 1) * Math.min(1, q), false);
            else e.line([[L.a0 - ex, cp], [L.a1 + ex + d, cp]], lc, lw, (i.alpha ?? 1) * Math.min(1, q), false);
          }
        });
      }
    });
  } });

/* ---- rack focus: a band of sharpness travels through the line, the rest is soft ---- */
reg('treat', 'focusPull', { name: 'ぼかし送り', tags: ['emotional', 'calm', 'editorial'], w: 0.6,
  plan: rng => ({ b: rng.range(0.035, 0.05), rev: rng.chance(0.3) }),
  apply(env, it, P) {
    if (!alive(it, 0.9)) return;
    const cut = env.cut, lay = J.layoutText(it), N = lay.N, whole = glyphN(cut.text), mi = it.mi;
    // position of each glyph along the lyric (0..1): within the item, or — for one-glyph items — by motion index
    let pos;
    if (N >= 3) pos = gi => gi / (N - 1);
    else if (whole >= 3 && mi != null && mi === Math.round(mi) && mi < whole) pos = () => mi / (whole - 1);
    else return;
    const f0 = clamp((env.lt - cut.inDur * 0.4) / Math.max(0.4, cut.dur - cut.outDur - cut.inDur * 0.4));
    const f = J.lerp(-0.15, 1.15, P.rev ? 1 - f0 : f0);
    it.charFns.push((gi, g) => {
      const d = clamp(Math.abs(pos(gi) - f) * 2.4 - 0.2);
      if (d <= 0.02) return null;
      return { blur: Math.min(g.w, g.h) * P.b * d, a: 1 - 0.35 * d };
    });
  } });

const SPOT = new WeakMap();
/* ---- spotlight glyph: one character (a kanji) is set in an accent disc / square / diamond ---- */
reg('treat', 'spotChar', { name: '一字マーク', tags: ['pop', 'graphic', 'editorial', 'emotional'], w: 0.7,
  plan: rng => ({ v: rng.pick(['disc', 'disc', 'square', 'diamond']), k: rng.range(1.06, 1.14), r: rng.range(0, 1) }),
  apply(env, it, P) {
    if (!alive(it, 0.9)) return;
    if (SPOT.get(env)) return;                                       // one spotlight per lyric
    const lay = J.layoutText(it), gs = lay.filter(g => !isSp(g.ch) && !J.isPunct(g.ch));
    if (!gs.length) return;
    const choose = list => { const k = list.filter(g => J.isKanji(g.ch)), t = list.filter(g => J.isKata(g.ch)), pool = k.length ? k : t.length ? t : list; return pool[Math.floor(P.r * pool.length) % pool.length]; };
    let T;
    if (gs.length === 1) {
      // one-glyph items (mixed / scatter layouts): only the item that holds the chosen glyph of the whole lyric
      const all = [...String(env.cut.text)].filter(c => !isSp(c)).map((ch, i) => ({ ch, i })).filter(g => !J.isPunct(g.ch));
      if (!all.length) return;
      const pick = choose(all);
      if (it.mi !== pick.i || gs[0].ch !== pick.ch) return;
      T = gs[0].i;
    } else T = choose(gs).i;
    SPOT.set(env, true);
    const sc = env.sc, col = colOf(env, it);
    if (onPlate(sc, col)) return;
    const pc = firstOK([sc.accent, sc.accent2, sc.ink, sc.fg], c => ctr(c, sc.bg) >= 2 && ctr(c, col) >= 1.4, accentFor(sc, col, 1.6));
    const tc = textOn(pc, col, sc);
    const qOf = e => E.outBack(inP(e, it, e.cut.inDur * 0.5, 0.3), 1.8) * (1 - E.inCubic(clamp(e.pOut * 1.3)));
    it.charFns.push(gi => (gi !== T ? null : qOf(env) > 0.5 && tc !== col ? { s: P.k, color: tc } : { s: P.k }));
    addPre(it, (e, i) => withFx(e, i, () => {
      const G = glyphList(i).find(x => x.g.i === T); if (!G) return;
      const q = qOf(e); if (q <= 0.01) return;
      const s = i.size * Math.min(i.sx || 1, i.sy || 1) * (G.s / P.k) * P.k, a = (i.alpha ?? 1) * G.a, ctx = e.ctx;
      if (P.v === 'disc') { e.circle(G.x, G.y, s * 0.64 * q, pc, null, 0, a, true); return; }
      ctx.save(); ctx.translate(G.x, G.y); ctx.rotate(((P.v === 'diamond' ? 45 : -6) + G.rot + (1 - q) * 40) * DEG);
      const h = s * (P.v === 'diamond' ? 0.68 : 0.6) * q;
      e.rect(-h, -h, h * 2, h * 2, pc, a, true);
      ctx.restore();
    }));
  } });

/* ---- ransom note (切り抜き文字): every glyph on its own scrap of paper, tilted and resized ---- */
reg('treat', 'ransom', { name: '切り貼り文字', tags: ['pop', 'glitch', 'graphic'], w: 0.6,
  plan: rng => ({ s: rng.int(1, 1e6) }),
  apply(env, it, P) {
    if (!alive(it, 0.9)) return;
    const sc = env.sc, col = colOf(env, it), s0 = J.h(P.s, it.mi | 0, 53);
    if (onPlate(sc, col)) return;
    const plates = [];
    for (const c of [sc.ink, sc.fg, sc.accent, sc.accent2, sc.sub, sc.ghostB]) if (c && ctr(c, sc.bg) >= 1.5 && plates.every(p => ctr(p, c) >= 1.2)) plates.push(c);
    if (!plates.length) plates.push(J.fitContrast(sc.accent, sc.bg, 2));
    const lay = J.layoutText(it), N = lay.N;
    const R = [];
    for (let k = 0; k < N; k++) {
      const pc = plates[J.h(s0, k, 1) % plates.length];
      const alt = best([sc.bg, col, sc.fg, sc.ink, '#111111', '#FFFFFF'].filter(c => c !== pc), pc);
      R.push({ pc, tc: ctr(col, pc) >= 3 && J.r(s0, k, 2) < 0.5 ? col : alt, rot: J.rs(s0, k, 3) * 8, s: J.rr(0.84, 1.02, s0, k, 4), dy: J.rs(s0, k, 5) * 0.05,
        pad: [J.rr(0.06, 0.16, s0, k, 6), J.rr(0.06, 0.16, s0, k, 7), J.rr(0.06, 0.16, s0, k, 8), J.rr(0.06, 0.16, s0, k, 9)], j: [0, 1, 2, 3].map(q => J.rs(s0, k, 10 + q) * 0.06) });
    }
    const qOf = (e, gi) => E.outBack(clamp((e.lt - (it.delay || 0) - gi * 0.03) / 0.22), 1.5) * (1 - E.inCubic(clamp(e.pOut * 1.4 - gi * 0.03)));
    it.charFns.push((gi, g) => { const r = R[gi]; if (!r || isSp(g.ch)) return null; return { rot: r.rot, s: r.s, dy: r.dy * g.h, color: qOf(env, gi) > 0.5 ? r.tc : null }; });
    addPre(it, (e, i) => withFx(e, i, () => {
      const ctx = e.ctx, a = i.alpha ?? 1;
      for (const G of glyphList(i)) {
        const r = R[G.g.i]; if (!r) continue;
        const q = qOf(e, G.g.i); if (q <= 0.01) continue;
        const w = Math.max(G.w, i.size * 0.55 * (i.sx || 1)) / 2, h = i.size * (i.sy || 1) / 2, p = r.pad, jj = r.j, S = i.size;
        ctx.save(); ctx.translate(G.x, G.y); ctx.rotate(G.rot * DEG); ctx.scale(G.s * q, G.s * q);
        e.poly([[-w - p[0] * S, -h - p[1] * S + jj[0] * S], [w + p[2] * S, -h - p[1] * S + jj[1] * S], [w + p[2] * S + jj[2] * S, h + p[3] * S], [-w - p[0] * S + jj[3] * S, h + p[3] * S]], r.pc, a * G.a, true);
        ctx.restore();
      }
    }));
  } });


/* ================= CUT-TO-CUT TRANSITIONS (カット間のつなぎ) =================
   draw(ctx, A, B, p, I): A = previous cut's resting frame, B = this cut's frame, both device-pixel canvases.
   The wrapper guarantees p<=0 → exactly A and p>=1 → exactly B, and a clean ctx state afterwards. */
const bell = k => Math.sin(Math.PI * clamp(k));
const ioQuart = k => (k < 0.5 ? 8 * k * k * k * k : 1 - 8 * Math.pow(1 - k, 4));
const minD = I => Math.min(I.cw, I.ch);
const lwOf = (I, k = 0.006) => Math.max(2, minD(I) * k);
// an accent that reads against both backgrounds
const tAcc = (I, second) => {
  const sc = I.sc, pb = (I.scPrev || sc).bg;
  const list = second ? [sc.accent2, sc.accent, sc.fg] : [sc.accent, sc.accent2, sc.fg];
  return firstOK(list, c => ctr(c, sc.bg) >= 1.8 && ctr(c, pb) >= 1.4, sc.fg);
};
// copy the sub-rectangle (x, y, w, h) of canvas C to the same place (+dx, dy), clamped to the canvas
const part = (ctx, C, x, y, w, h, dx = 0, dy = 0) => {
  let x0 = Math.max(0, Math.floor(x)), y0 = Math.max(0, Math.floor(y));
  const x1 = Math.min(C.width, Math.ceil(x + w)), y1 = Math.min(C.height, Math.ceil(y + h));
  if (x1 - x0 < 1 || y1 - y0 < 1) return;
  ctx.drawImage(C, x0, y0, x1 - x0, y1 - y0, x0 + dx, y0 + dy, x1 - x0, y1 - y0);
};
const scaled = (ctx, C, cw, ch, s, cx = cw / 2, cy = ch / 2) => ctx.drawImage(C, cx - cx * s, cy - cy * s, cw * s, ch * s);
const trReg = (k, d) => reg('trans', k, Object.assign({}, d, {
  draw(ctx, A, B, p, I) {
    ctx.save();
    try {
      if (!(p > 0)) ctx.drawImage(A, 0, 0);
      else if (p >= 1) ctx.drawImage(B, 0, 0);
      else d.draw(ctx, A, B, p, I, I.P || {});
    } finally { ctx.restore(); }
  } }));
const dirPick = (rng, list = ['L', 'R', 'U', 'D'], w) => (w ? rng.wpick(list.map((k, i) => [k, w[i]])) : rng.pick(list));

/* ---- straight wipe with a bright leading edge ---- */
trReg('wipe', { name: 'エッジワイプ', tags: ['graphic', 'editorial', 'pop'], w: 1.2, dur: 0.35,
  plan: rng => ({ dir: dirPick(rng, ['L', 'R', 'U', 'D'], [3, 2, 1.4, 0.8]) }),
  draw(ctx, A, B, p, I, P) {
    const { cw, ch } = I, e = E.inOutCubic(p), lw = lwOf(I, 0.007), ac = tAcc(I);
    ctx.drawImage(A, 0, 0);
    let bar;
    if (P.dir === 'R') { const x = cw * e; part(ctx, B, 0, 0, x, ch); bar = [x - lw / 2, 0, lw, ch, -1]; }
    else if (P.dir === 'U') { const y = ch * (1 - e); part(ctx, B, 0, y, cw, ch - y); bar = [0, y - lw / 2, cw, lw, 1]; }
    else if (P.dir === 'D') { const y = ch * e; part(ctx, B, 0, 0, cw, y); bar = [0, y - lw / 2, cw, lw, -1]; }
    else { const x = cw * (1 - e); part(ctx, B, x, 0, cw - x, ch); bar = [x - lw / 2, 0, lw, ch, 1]; }
    const a = Math.pow(bell(p), 0.6);
    ctx.globalAlpha = a; ctx.fillStyle = ac; ctx.fillRect(bar[0], bar[1], bar[2], bar[3]);
    // a thin trailing hairline on the B side
    const off = lw * 3.2 * bar[4];
    ctx.globalAlpha = a * 0.5;
    if (bar[2] === lw) ctx.fillRect(bar[0] + off, 0, Math.max(1, lw * 0.35), ch); else ctx.fillRect(0, bar[1] + off, cw, Math.max(1, lw * 0.35));
  } });

/* ---- slanted wipe: an accent band runs ahead of the new cut ---- */
trReg('diagonalWipe', { name: '斜め帯ワイプ', tags: ['pop', 'graphic'], w: 1, dur: 0.35,
  plan: rng => ({ k: rng.range(0.3, 0.55) * (rng.chance(0.5) ? 1 : -1), rev: rng.chance(0.4) }),
  draw(ctx, A, B, p, I, P) {
    const { cw, ch } = I, e = E.inOutCubic(p), sl = P.k * ch, band = minD(I) * 0.07 * bell(p);
    const span = cw + Math.abs(sl) + band * 2 + 4;
    let X = -Math.abs(sl) / 2 - band - 2 + span * e;                  // the boundary (B side = left of it)
    const poly = (x0, x1) => { ctx.beginPath(); ctx.moveTo(x0 - sl / 2, 0); ctx.lineTo(x1 - sl / 2, 0); ctx.lineTo(x1 + sl / 2, ch); ctx.lineTo(x0 + sl / 2, ch); ctx.closePath(); };
    ctx.drawImage(A, 0, 0);
    if (P.rev) { ctx.translate(cw, 0); ctx.scale(-1, 1); }            // mirrored geometry (the images are drawn un-mirrored below)
    ctx.save(); poly(-cw * 2, X); ctx.clip();
    if (P.rev) { ctx.translate(cw, 0); ctx.scale(-1, 1); }
    ctx.drawImage(B, 0, 0); ctx.restore();
    if (band > 0.5) {
      ctx.fillStyle = tAcc(I); poly(X, X + band); ctx.fill();
      ctx.fillStyle = tAcc(I, true); ctx.globalAlpha = 0.85; poly(X + band * 1.35, X + band * 1.6); ctx.fill();
    }
  } });

/* ---- clock wipe: a radial sweep from 12 o'clock ---- */
trReg('clockWipe', { name: 'クロックワイプ', tags: ['graphic', 'pop', 'editorial'], w: 0.7, dur: 0.45,
  plan: rng => ({ dir: rng.chance(0.7) ? 1 : -1, a0: rng.pick([-90, -90, 0, 180]) }),
  draw(ctx, A, B, p, I, P) {
    const { cw, ch } = I, e = E.inOutCubic(p), cx = cw / 2, cy = ch / 2, R = Math.hypot(cw, ch) / 2 + 4;
    const a0 = P.a0 * DEG, a1 = a0 + e * TAU * P.dir;
    ctx.drawImage(A, 0, 0);
    ctx.save(); ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, R, a0, a1, P.dir < 0); ctx.closePath(); ctx.clip(); ctx.drawImage(B, 0, 0); ctx.restore();
    const a = Math.pow(bell(p), 0.5), lw = lwOf(I, 0.006);
    ctx.globalAlpha = a; ctx.strokeStyle = tAcc(I); ctx.lineWidth = lw; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a1) * R, cy + Math.sin(a1) * R); ctx.stroke();
    ctx.fillStyle = tAcc(I); ctx.beginPath(); ctx.arc(cx, cy, lw * 2.2, 0, TAU); ctx.fill();
  } });

/* ---- iris: a circle opens on the new cut, rimmed with two accent rings ---- */
trReg('irisOpen', { name: 'アイリスイン', tags: ['emotional', 'pop', 'editorial'], w: 0.8, dur: 0.4,
  plan: rng => ({ x: 0.5 + rng.range(-0.12, 0.12), y: 0.5 + rng.range(-0.1, 0.1) }),
  draw(ctx, A, B, p, I, P) {
    const { cw, ch } = I, cx = cw * P.x, cy = ch * P.y, e = E.inOutCubic(p);
    const R = Math.hypot(Math.max(cx, cw - cx), Math.max(cy, ch - cy)) + 4, r = R * e;
    ctx.drawImage(A, 0, 0);
    if (r > 0.5) { ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.clip(); ctx.drawImage(B, 0, 0); ctx.restore(); }
    const a = Math.pow(bell(p), 0.6), lw = lwOf(I, 0.009);
    ctx.globalAlpha = a; ctx.strokeStyle = tAcc(I); ctx.lineWidth = lw;
    ctx.beginPath(); ctx.arc(cx, cy, r + lw / 2, 0, TAU); ctx.stroke();
    ctx.globalAlpha = a * 0.6; ctx.strokeStyle = tAcc(I, true); ctx.lineWidth = lw * 0.4;
    ctx.beginPath(); ctx.arc(cx, cy, r * 1.06 + lw * 2.5, 0, TAU); ctx.stroke();
  } });

/* ---- push: the new cut shoves the old one out ---- */
trReg('pushSlide', { name: 'プッシュ', tags: ['graphic', 'pop', 'editorial'], w: 1, dur: 0.35,
  plan: rng => ({ dir: dirPick(rng, ['L', 'R', 'U', 'D'], [3, 1.6, 1.4, 0.6]) }),
  draw(ctx, A, B, p, I, P) {
    const { cw, ch } = I, e = E.inOutCubic(p), h = P.dir === 'L' || P.dir === 'R';
    const L = h ? cw : ch, sg = P.dir === 'L' || P.dir === 'U' ? -1 : 1, off = Math.round(e * L) * sg;
    if (h) { ctx.drawImage(A, off, 0); ctx.drawImage(B, off - sg * cw, 0); } else { ctx.drawImage(A, 0, off); ctx.drawImage(B, 0, off - sg * ch); }
    const lw = lwOf(I, 0.005), q = h ? (sg < 0 ? cw + off : off) : (sg < 0 ? ch + off : off);
    ctx.globalAlpha = Math.pow(bell(p), 0.6); ctx.fillStyle = tAcc(I);
    if (h) ctx.fillRect(q - lw / 2, 0, lw, ch); else ctx.fillRect(0, q - lw / 2, cw, lw);
  } });

/* ---- cover: the new cut slides in over the old one, which dims and drifts back ---- */
trReg('cover', { name: 'カバー', tags: ['editorial', 'graphic', 'calm'], w: 0.9, dur: 0.35,
  plan: rng => ({ dir: dirPick(rng, ['L', 'R', 'U', 'D'], [2, 2, 1.5, 1]) }),
  draw(ctx, A, B, p, I, P) {
    const { cw, ch } = I, e = E.inOutCubic(p), h = P.dir === 'L' || P.dir === 'R', sg = P.dir === 'L' || P.dir === 'U' ? -1 : 1;
    const L = h ? cw : ch, bo = Math.round((1 - e) * L) * -sg, ao = Math.round(e * L * 0.18) * sg;
    if (h) ctx.drawImage(A, ao, 0); else ctx.drawImage(A, 0, ao);
    ctx.fillStyle = '#000000'; ctx.globalAlpha = 0.45 * e; ctx.fillRect(0, 0, cw, ch); ctx.globalAlpha = 1;
    // soft shadow ahead of the incoming edge
    const sw = minD(I) * 0.06, edge = (h ? (sg > 0 ? cw + bo : bo) : (sg > 0 ? ch + bo : bo));
    const g = h ? ctx.createLinearGradient(edge, 0, edge + sg * sw, 0) : ctx.createLinearGradient(0, edge, 0, edge + sg * sw);
    g.addColorStop(0, 'rgba(0,0,0,0.45)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.globalAlpha = bell(p);
    if (h) ctx.fillRect(sg > 0 ? edge : edge - sw, 0, sw, ch); else ctx.fillRect(0, sg > 0 ? edge : edge - sw, cw, sw);
    ctx.globalAlpha = 1;
    if (h) ctx.drawImage(B, bo, 0); else ctx.drawImage(B, 0, bo);
  } });

/* ---- uncover: the old cut slides away and uncovers the new one waiting underneath ---- */
trReg('uncover', { name: 'アンカバー', tags: ['editorial', 'calm', 'emotional'], w: 0.8, dur: 0.35,
  plan: rng => ({ dir: dirPick(rng, ['L', 'R', 'U', 'D'], [2, 2, 1.6, 1]) }),
  draw(ctx, A, B, p, I, P) {
    const { cw, ch } = I, e = E.inOutCubic(p), h = P.dir === 'L' || P.dir === 'R', sg = P.dir === 'L' || P.dir === 'U' ? -1 : 1;
    const s = 1.05 - 0.05 * E.outCubic(p);
    ctx.fillStyle = I.sc.bg; ctx.fillRect(0, 0, cw, ch);
    scaled(ctx, B, cw, ch, s);
    ctx.fillStyle = '#000000'; ctx.globalAlpha = 0.4 * (1 - e); ctx.fillRect(0, 0, cw, ch); ctx.globalAlpha = 1;
    const L = h ? cw : ch, ao = Math.round(e * L) * sg, edge = h ? (sg > 0 ? ao : cw + ao) : (sg > 0 ? ao : ch + ao), sw = minD(I) * 0.07;
    const g = h ? ctx.createLinearGradient(edge, 0, edge - sg * sw, 0) : ctx.createLinearGradient(0, edge, 0, edge - sg * sw);
    g.addColorStop(0, 'rgba(0,0,0,0.5)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.globalAlpha = bell(p);
    if (h) ctx.fillRect(sg > 0 ? edge - sw : edge, 0, sw, ch); else ctx.fillRect(0, sg > 0 ? edge - sw : edge, cw, sw);
    ctx.globalAlpha = 1;
    if (h) ctx.drawImage(A, ao, 0); else ctx.drawImage(A, 0, ao);
  } });

/* ---- zoom through: the old cut rushes past the camera while the new one settles in ---- */
trReg('zoomThrough', { name: 'ズームスルー', tags: ['pop', 'emotional', 'glitch'], w: 1, dur: 0.35,
  plan: rng => ({ z: rng.range(1.5, 2.2) }),
  draw(ctx, A, B, p, I, P) {
    const { cw, ch } = I, sa = 1 + (P.z - 1) * Math.pow(p, 1.4), aa = 1 - E.inCubic(clamp(p * 1.12)), sb = 0.86 + 0.14 * E.outCubic(p);
    ctx.fillStyle = I.sc.bg; ctx.fillRect(0, 0, cw, ch);
    scaled(ctx, B, cw, ch, sb);
    if (aa > 0.003) {
      ctx.globalAlpha = aa; scaled(ctx, A, cw, ch, sa);
      if (I.allowFilter && p > 0.08 && aa > 0.15) { ctx.globalAlpha = aa * 0.35; scaled(ctx, A, cw, ch, sa * (1 + 0.08 * p)); }
    }
  } });

/* ---- doors: the old cut splits down the middle and swings open ---- */
trReg('doorsOpen', { name: '観音開き', tags: ['graphic', 'pop', 'emotional'], w: 0.7, dur: 0.4,
  plan: rng => ({ vert: rng.chance(0.3) }),
  draw(ctx, A, B, p, I, P) {
    const { cw, ch } = I, e = E.inOutCubic(p), lw = lwOf(I, 0.005), ac = tAcc(I);
    const sb = 0.93 + 0.07 * E.outCubic(p);
    ctx.fillStyle = I.sc.bg; ctx.fillRect(0, 0, cw, ch);
    scaled(ctx, B, cw, ch, sb);
    ctx.fillStyle = '#000000'; ctx.globalAlpha = 0.35 * (1 - e); ctx.fillRect(0, 0, cw, ch); ctx.globalAlpha = 1;
    const a = Math.pow(bell(p), 0.5);
    if (!P.vert) {
      const hw = Math.floor(cw / 2), off = Math.round(e * (cw - hw + lw * 2));
      part(ctx, A, 0, 0, hw, ch, -off, 0); part(ctx, A, hw, 0, cw - hw, ch, off, 0);
      ctx.globalAlpha = a; ctx.fillStyle = ac; ctx.fillRect(hw - off - lw, 0, lw, ch); ctx.fillRect(hw + off, 0, lw, ch);
    } else {
      const hh = Math.floor(ch / 2), off = Math.round(e * (ch - hh + lw * 2));
      part(ctx, A, 0, 0, cw, hh, 0, -off); part(ctx, A, 0, hh, cw, ch - hh, 0, off);
      ctx.globalAlpha = a; ctx.fillStyle = ac; ctx.fillRect(0, hh - off - lw, cw, lw); ctx.fillRect(0, hh + off, cw, lw);
    }
  } });

/* ---- blinds: slats flip over one after another ---- */
trReg('blinds', { name: 'ブラインド転換', tags: ['graphic', 'editorial', 'calm'], w: 0.7, dur: 0.4,
  plan: rng => ({ n: rng.int(7, 12), vert: rng.chance(0.35), rev: rng.chance(0.4) }),
  draw(ctx, A, B, p, I, P) {
    const { cw, ch } = I, n = P.n, L = P.vert ? cw : ch, lw = Math.max(1, lwOf(I, 0.003)), ac = tAcc(I);
    ctx.drawImage(A, 0, 0);
    ctx.fillStyle = ac;
    for (let i = 0; i < n; i++) {
      const k = P.rev ? n - 1 - i : i;
      const q = E.inOutCubic(clamp(p * 1.55 - k / n * 0.55)), a0 = Math.round(i * L / n), a1 = Math.round((i + 1) * L / n);
      if (q <= 0) continue;
      const len = q >= 1 ? a1 - a0 : (a1 - a0) * q;
      if (P.vert) part(ctx, B, a0, 0, len, ch); else part(ctx, B, 0, a0, cw, len);
      if (q < 1) { ctx.globalAlpha = 1 - q; if (P.vert) ctx.fillRect(a0 + len, 0, lw, ch); else ctx.fillRect(0, a0 + len, cw, lw); ctx.globalAlpha = 1; }
    }
  } });

/* ---- checker: squares open in two chequered waves ---- */
trReg('checker', { name: '市松転換', tags: ['pop', 'graphic'], w: 0.6, dur: 0.45,
  plan: rng => ({ n: rng.int(4, 6), rev: rng.chance(0.5) }),
  draw(ctx, A, B, p, I, P) {
    const { cw, ch } = I, cell = minD(I) / P.n, cols = Math.ceil(cw / cell), rows = Math.ceil(ch / cell);
    ctx.drawImage(A, 0, 0);
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const d = ((i + j) % 2) * 0.32 + 0.18 * ((P.rev ? cols - 1 - i : i) + j) / Math.max(1, cols + rows - 2);
      const t = clamp((p - d) / 0.5);
      if (t <= 0) continue;
      const x0 = Math.round(i * cw / cols), x1 = Math.round((i + 1) * cw / cols), y0 = Math.round(j * ch / rows), y1 = Math.round((j + 1) * ch / rows);
      if (t >= 1) { part(ctx, B, x0, y0, x1 - x0, y1 - y0); continue; }
      const q = E.outCubic(t);
      if (q > 0.97) { part(ctx, B, x0, y0, x1 - x0, y1 - y0); continue; }
      const w = (x1 - x0) * q, h = (y1 - y0) * q;
      part(ctx, B, (x0 + x1) / 2 - w / 2, (y0 + y1) / 2 - h / 2, w, h);
    }
  } });

/* ---- block dissolve: random blocks flip to the new cut, each with a short accent flash ---- */
trReg('blockDissolve', { name: 'ブロック崩し', tags: ['glitch', 'graphic'], w: 0.8, dur: 0.4,
  plan: rng => ({ n: rng.int(7, 11), side: rng.pick([0, 0, 1, 2]) }),
  draw(ctx, A, B, p, I, P) {
    const { cw, ch } = I, cell = minD(I) / P.n, cols = Math.ceil(cw / cell), rows = Math.ceil(ch / cell), s0 = I.seed | 0, ac = tAcc(I);
    ctx.drawImage(A, 0, 0);
    ctx.fillStyle = ac;
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const bias = P.side === 1 ? i / Math.max(1, cols - 1) : P.side === 2 ? j / Math.max(1, rows - 1) : 0.5;
      const r = 0.02 + 0.84 * (P.side ? 0.55 * J.r(s0, i, j, 5) + 0.45 * bias : J.r(s0, i, j, 5));
      if (p < r) continue;
      const x0 = Math.round(i * cw / cols), x1 = Math.round((i + 1) * cw / cols), y0 = Math.round(j * ch / rows), y1 = Math.round((j + 1) * ch / rows);
      part(ctx, B, x0, y0, x1 - x0, y1 - y0);
      const f = 1 - (p - r) / 0.1;
      if (f > 0) { ctx.globalAlpha = f * 0.75; ctx.fillRect(x0, y0, x1 - x0, y1 - y0); ctx.globalAlpha = 1; }
    }
  } });

/* ---- whip pan: both frames rush sideways, smeared by motion blur ---- */
trReg('whipPan', { name: 'ホイップパン', tags: ['pop', 'emotional', 'glitch'], w: 1, dur: 0.3,
  plan: rng => ({ dir: rng.chance(0.65) ? -1 : 1, vert: rng.chance(0.2) }),
  draw(ctx, A, B, p, I, P) {
    const { cw, ch } = I, e = ioQuart(p), L = P.vert ? ch : cw, off = e * L * P.dir;
    const blur = L * 0.13 * Math.pow(bell(p), 2);
    const put = (x2, C, o, k) => { if (P.vert) x2.drawImage(C, 0, (o) * k, cw * k, ch * k); else x2.drawImage(C, (o) * k, 0, cw * k, ch * k); };
    if (blur < 3) { ctx.fillStyle = I.sc.bg; ctx.fillRect(0, 0, cw, ch); put(ctx, A, off, 1); put(ctx, B, off - L * P.dir, 1); return; }
    const k = 1 / 3, w = Math.max(2, Math.round(cw * k)), h = Math.max(2, Math.round(ch * k)), T = I.tmp(w, h), x = T.getContext('2d');
    x.save(); x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1; x.filter = 'none';
    x.fillStyle = I.sc.bg; x.fillRect(0, 0, w, h);
    const n = I.allowFilter ? 12 : 6;                                   // fewer taps in the fast preview
    for (let i = 0; i < n; i++) { const o = (i / (n - 1) - 0.5) * blur; x.globalAlpha = 1 / (i + 1); put(x, A, off + o, k); put(x, B, off - L * P.dir + o, k); }
    x.restore();
    ctx.imageSmoothingEnabled = true; ctx.drawImage(T, 0, 0, w, h, 0, 0, cw, ch);
  } });

/* ---- spin out: the old cut spins away into the distance, revealing the new one ---- */
trReg('spinOut', { name: '回転アウト', tags: ['pop', 'glitch'], w: 0.6, dur: 0.45,
  plan: rng => ({ rot: rng.range(100, 200) * (rng.chance(0.5) ? 1 : -1) }),
  draw(ctx, A, B, p, I, P) {
    const { cw, ch } = I, e = E.inCubic(p), s = 1 - e, sb = 1.08 - 0.08 * E.outCubic(p);
    ctx.fillStyle = I.sc.bg; ctx.fillRect(0, 0, cw, ch);
    scaled(ctx, B, cw, ch, sb);
    ctx.fillStyle = '#000000'; ctx.globalAlpha = 0.4 * (1 - E.outCubic(p)); ctx.fillRect(0, 0, cw, ch); ctx.globalAlpha = 1;
    if (s < 0.004) return;
    ctx.translate(cw / 2, ch / 2); ctx.rotate(P.rot * e * DEG); ctx.scale(s, s);
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(-cw / 2 + minD(I) * 0.02, -ch / 2 + minD(I) * 0.03, cw, ch);
    ctx.drawImage(A, -cw / 2, -ch / 2);
    const lw = lwOf(I, 0.008) / s;
    ctx.globalAlpha = Math.min(1, p * 6); ctx.strokeStyle = tAcc(I); ctx.lineWidth = lw; ctx.strokeRect(-cw / 2 + lw / 2, -ch / 2 + lw / 2, cw - lw, ch - lw);
  } });

/* ---- ink blob: an organic splash spreads from a point, rimmed in accent ink ---- */
const blobPath = (ctx, cx, cy, r, s0, ph, n = 56) => {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = i / n * TAU;
    const w = 1 + 0.13 * Math.sin(a * 3 + J.r(s0, 1) * 6 + ph) + 0.08 * Math.sin(a * 5 + J.r(s0, 2) * 6 - ph * 1.3) + 0.05 * Math.sin(a * 9 + J.r(s0, 3) * 6 + ph * 0.7);
    pts.push([cx + Math.cos(a) * r * w, cy + Math.sin(a) * r * w]);
  }
  ctx.beginPath();
  const mid = i => [(pts[i % n][0] + pts[(i + 1) % n][0]) / 2, (pts[i % n][1] + pts[(i + 1) % n][1]) / 2];
  const m0 = mid(0); ctx.moveTo(m0[0], m0[1]);
  for (let i = 1; i <= n; i++) { const q = pts[i % n], m = mid(i); ctx.quadraticCurveTo(q[0], q[1], m[0], m[1]); }
  ctx.closePath();
};
trReg('inkBlob', { name: 'インク', tags: ['emotional', 'calm', 'pop'], w: 0.7, dur: 0.5,
  plan: rng => ({ x: rng.pick([0.5, 0.5, 0.15, 0.85]) + rng.range(-0.08, 0.08), y: rng.pick([0.5, 0.25, 0.8]) + rng.range(-0.06, 0.06) }),
  draw(ctx, A, B, p, I, P) {
    const { cw, ch } = I, cx = cw * P.x, cy = ch * P.y, s0 = I.seed | 0;
    const R = Math.hypot(Math.max(cx, cw - cx), Math.max(cy, ch - cy)) * 1.36, e = E.inOutSine(p), r = R * e, ph = p * 2.4;
    ctx.drawImage(A, 0, 0);
    const rimA = 1 - J.smooth(0.75, 0.98, p), rim = minD(I) * 0.035 * (0.4 + e);
    if (rimA > 0.01) {
      ctx.globalAlpha = rimA; ctx.fillStyle = tAcc(I);
      blobPath(ctx, cx, cy, r + rim, s0, ph); ctx.fill();
      for (let k = 0; k < 6; k++) {                                     // droplets ahead of the splash
        const a = J.r(s0, k, 7) * TAU, d = r * (1.12 + 0.3 * J.r(s0, k, 8)) + rim, rr = minD(I) * (0.008 + 0.02 * J.r(s0, k, 9)) * clamp(p * 4);
        ctx.beginPath(); ctx.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, rr, 0, TAU); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    if (r > 0.5) { ctx.save(); blobPath(ctx, cx, cy, r, s0, ph); ctx.clip(); ctx.drawImage(B, 0, 0); ctx.restore(); }
  } });

/* ---- shatter: the old cut breaks into tiles that tumble down ---- */
trReg('shatterTiles', { name: 'タイル崩落', tags: ['glitch', 'pop', 'emotional'], w: 0.6, dur: 0.5,
  plan: rng => ({ n: rng.int(6, 9), x: rng.range(0.3, 0.7), y: rng.range(0.3, 0.6) }),
  draw(ctx, A, B, p, I, P) {
    const { cw, ch } = I, cell = Math.max(cw, ch) / P.n, cols = Math.ceil(cw / cell), rows = Math.ceil(ch / cell), s0 = I.seed | 0;
    ctx.drawImage(B, 0, 0);
    ctx.fillStyle = '#000000'; ctx.globalAlpha = 0.3 * (1 - E.outCubic(p)); ctx.fillRect(0, 0, cw, ch); ctx.globalAlpha = 1;
    const cx = cw * P.x, cy = ch * P.y, D = Math.hypot(cw, ch);
    const moving = [];
    ctx.save(); ctx.beginPath(); let any = false;
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const x0 = Math.round(i * cw / cols), x1 = Math.round((i + 1) * cw / cols), y0 = Math.round(j * ch / rows), y1 = Math.round((j + 1) * ch / rows);
      const d = 0.5 * Math.hypot((x0 + x1) / 2 - cx, (y0 + y1) / 2 - cy) / D * 1.4 + 0.08 * J.r(s0, i, j, 3);
      const t = clamp((p - Math.min(0.55, d)) / 0.45);
      if (t <= 0) { ctx.rect(x0, y0, x1 - x0, y1 - y0); any = true; } else moving.push({ x0, y0, x1, y1, t, i, j });
    }
    if (any) { ctx.clip(); ctx.drawImage(A, 0, 0); }
    ctx.restore();
    const lw = Math.max(1, lwOf(I, 0.002));
    for (const m of moving) {
      const { x0, y0, x1, y1, t, i, j } = m, w = x1 - x0, h = y1 - y0, a = 1 - J.smooth(0.7, 1, t);
      if (a <= 0.003) continue;
      const dx = J.rs(s0, i, j, 4) * cw * 0.12 * t, dy = (t * t * 1.25 - J.r(s0, i, j, 6) * 0.08 * t) * ch, rot = J.rs(s0, i, j, 5) * 70 * t, s = 1 - 0.25 * t;
      ctx.save(); ctx.globalAlpha = a; ctx.translate(x0 + w / 2 + dx, y0 + h / 2 + dy); ctx.rotate(rot * DEG); ctx.scale(s, s);
      ctx.drawImage(A, x0, y0, w, h, -w / 2, -h / 2, w, h);
      ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = lw; ctx.strokeRect(-w / 2, -h / 2, w, h);
      ctx.restore();
    }
  } });

/* ---- slice shift: horizontal strips slide in alternate directions, trading the old cut for the new ---- */
trReg('sliceShift', { name: '短冊ずらし', tags: ['glitch', 'graphic', 'pop'], w: 0.8, dur: 0.35,
  plan: rng => ({ n: rng.int(5, 9), vert: rng.chance(0.25) }),
  draw(ctx, A, B, p, I, P) {
    const { cw, ch } = I, n = P.n, L = P.vert ? cw : ch, M = P.vert ? ch : cw, lw = Math.max(1, lwOf(I, 0.003)), ac = tAcc(I);
    for (let i = 0; i < n; i++) {
      const a0 = Math.round(i * L / n), a1 = Math.round((i + 1) * L / n), sg = i % 2 ? 1 : -1;
      const t = E.inOutCubic(clamp((p - (i / Math.max(1, n - 1)) * 0.3) / 0.7)), o = Math.round(t * M) * sg;
      if (P.vert) { part(ctx, A, a0, 0, a1 - a0, ch, 0, o); part(ctx, B, a0, 0, a1 - a0, ch, 0, o - sg * ch); }
      else { part(ctx, A, 0, a0, cw, a1 - a0, o, 0); part(ctx, B, 0, a0, cw, a1 - a0, o - sg * cw, 0); }
    }
    ctx.globalAlpha = Math.pow(bell(p), 0.7) * 0.9; ctx.fillStyle = ac;
    for (let i = 1; i < n; i++) { const a = Math.round(i * L / n); if (P.vert) ctx.fillRect(a - lw / 2, 0, lw, ch); else ctx.fillRect(0, a - lw / 2, cw, lw); }
  } });

/* ---- cube turn: faux-3D rotation — the old cut turns away as the next face comes round ---- */
trReg('cubeTurn', { name: 'キューブ', tags: ['graphic', 'pop'], w: 0.6, dur: 0.45,
  plan: rng => ({ dir: rng.chance(0.6) ? 1 : -1 }),
  draw(ctx, A, B, p, I, P) {
    const { cw, ch } = I, phi = E.inOutCubic(p) * Math.PI / 2, D = 3.4, f = D - 1, cs = Math.cos(phi), sn = Math.sin(phi);
    const back = J.mix(J.mix((I.scPrev || I.sc).bg, I.sc.bg, p), '#000000', 0.55);
    ctx.fillStyle = back; ctx.fillRect(0, 0, cw, ch);
    // rotate (x, z) of the cube's vertical edges, project to screen x and half-height
    const prj = (x, z) => { const xr = (x * cs - z * sn) * P.dir, zr = x * sn + z * cs, k = f / (D - zr); return [cw / 2 + xr * k * cw / 2, k * ch / 2]; };
    const face = (C, e0, e1, shade) => {
      const N = I.allowFilter ? 28 : 14, q0 = prj(e0[0], e0[1]), q1 = prj(e1[0], e1[1]);
      if ((q1[0] - q0[0]) * P.dir <= 0.5) return;
      let prev = q0;
      for (let k = 1; k <= N; k++) {
        const u = k / N, q = prj(J.lerp(e0[0], e1[0], u), J.lerp(e0[1], e1[1], u));
        const xa = Math.min(prev[0], q[0]), xb = Math.max(prev[0], q[0]), hh = (prev[1] + q[1]) / 2;
        const su = P.dir > 0 ? (k - 1) / N : 1 - k / N;
        ctx.drawImage(C, su * cw, 0, cw / N, ch, Math.floor(xa), ch / 2 - hh, Math.ceil(xb) - Math.floor(xa) + 1, hh * 2);
        prev = q;
      }
      if (shade > 0.005) {
        ctx.fillStyle = '#000000'; ctx.globalAlpha = shade;
        ctx.beginPath(); ctx.moveTo(q0[0], ch / 2 - q0[1]); ctx.lineTo(q1[0], ch / 2 - q1[1]); ctx.lineTo(q1[0], ch / 2 + q1[1]); ctx.lineTo(q0[0], ch / 2 + q0[1]); ctx.closePath(); ctx.fill();
        ctx.globalAlpha = 1;
      }
    };
    // A = front face (edges (-1,1)→(1,1)); B = side face (edges (1,1)→(1,-1)) — mirrored for dir < 0
    face(A, [-1, 1], [1, 1], 0.55 * (1 - cs));
    face(B, [1, 1], [1, -1], 0.55 * (1 - sn));
  } });

/* ---- flash cross: a quick flash of light carries the cut over ---- */
trReg('flashCross', { name: 'フラッシュ転換', tags: ['emotional', 'pop', 'calm'], w: 0.9, dur: 0.3,
  plan: rng => ({ c: rng.chance(0.3) ? 'accent' : 'white' }),
  draw(ctx, A, B, p, I, P) {
    const { cw, ch } = I, pb = (I.scPrev || I.sc).bg, light = J.lum(pb) > 0.62 && J.lum(I.sc.bg) > 0.62;
    const fl = P.c === 'accent' || light ? tAcc(I) : '#FFFFFF';
    const x = J.smooth(0.3, 0.62, p);
    ctx.drawImage(A, 0, 0);
    if (x > 0) { ctx.globalAlpha = x; ctx.drawImage(B, 0, 0); ctx.globalAlpha = 1; }
    const a = p < 0.45 ? E.inQuad(p / 0.45) : 1 - E.outCubic((p - 0.45) / 0.55);
    if (a > 0.003) { ctx.globalAlpha = a * 0.92; ctx.fillStyle = fl; ctx.fillRect(0, 0, cw, ch); }
  } });

/* ---- pixelate: the old cut breaks down into big pixels, the new one resolves out of them ---- */
trReg('pixelate', { name: 'モザイク転換', tags: ['glitch', 'pop'], w: 0.6, dur: 0.4,
  plan: rng => ({ k: rng.range(11, 17) }),
  draw(ctx, A, B, p, I, P) {
    const { cw, ch } = I, maxB = minD(I) / P.k;
    const pix = (C, t, alpha) => {
      const bs = 1 + (maxB - 1) * t;
      if (alpha <= 0.003) return;
      ctx.globalAlpha = alpha;
      if (bs < 1.6) { ctx.drawImage(C, 0, 0); ctx.globalAlpha = 1; return; }
      const w = Math.max(1, Math.ceil(cw / bs)), h = Math.max(1, Math.ceil(ch / bs)), T = I.tmp(w, h), x = T.getContext('2d');
      x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; x.globalCompositeOperation = 'copy'; x.imageSmoothingEnabled = true;
      x.drawImage(C, 0, 0, w, h); x.globalCompositeOperation = 'source-over';
      ctx.imageSmoothingEnabled = false; ctx.drawImage(T, 0, 0, w, h, 0, 0, w * bs, h * bs); ctx.imageSmoothingEnabled = true;
      ctx.globalAlpha = 1;
    };
    const ta = E.inCubic(clamp(p / 0.55)), tb = E.inCubic(clamp((1 - p) / 0.55)), x = J.smooth(0.4, 0.6, p);
    pix(A, ta, 1);
    pix(B, tb, x);
  } });

})();
