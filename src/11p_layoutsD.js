/* JIZURA pack: layoutsD — kinetic / faux-3D / physical / pop-graphic layouts (cube, cylinder, flags, pendulums, signs, puzzles, masks …) */
(() => {
'use strict';
const E = J.E;
const P = 'layoutsD';
const reg = (key, def) => J.register('layout', key, def, P);

/* ------------------------------------------------------------------ helpers */
const U = env => Math.min(env.W, env.H);
const isPort = env => env.H > env.W * 1.08;
const strip = t => String(t || '').replace(/\s+/g, '');
const hasLatin = t => /[A-Za-z]/.test(t);
/* text as one run: latin keeps single word spaces, Japanese drops them */
const flat = t => (hasLatin(t) ? String(t || '').trim().replace(/\s+/g, ' ') : strip(t));
/* glyph slots keeping single word gaps (latin lyrics): a ' ' slot is left empty */
const slotsOf = t => [...flat(t)];
const fontsOf = (st, roles) => J.fontsOf(st, roles);
const bodyF = env => (env.st.fonts.body && env.st.fonts.body[0]) || 'gothic_med';
const monoF = env => (env.st.fonts.mono && env.st.fonts.mono[0]) || 'mono';
const tin = (env, d = 0, len = 0.4, ease = E.outExpo) => ease(J.clamp((env.lt - d) / Math.max(0.01, len)));
const tout = env => 1 - E.inCubic(env.pOut);
const box = (x0, y0, x1, y1) => ({ x0, y0, x1, y1, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, boxes: [] });
const UB = J.unionBB;
const pad2 = n => String(n).padStart(2, '0');
const lineNo = env => pad2(Math.max(0, env.cut.line | 0) + 1);
const smallSize = env => J.clamp(U(env) * 0.024, 13, 32);
/* motion index that makes J.mainDraw start this item's entrance at local time t */
const miAt = (env, t) => Math.max(0, t) / Math.max(0.005, env.cut.stagger || 0.04);
/* chromatic ghosts on big plates only while they fly in */
const gIn = env => env.lt < 0.6 && env.pOut <= 0;
/* text printed on an object only takes holds that keep it in place */
const plateHold = env => !['still', 'jitter', 'breathe', 'glitchtick'].includes(env.cut.hold);
const romajiOf = env => { const c = strip(env.cut.text); if (hasLatin(c) || !/[ぁ-ヿ]/.test(c)) return null; const r = J.romaji(c); return r ? r.toUpperCase() : null; };
const altCopy = env => { const c = env.cut; if (c.lineText && strip(c.lineText) !== strip(c.text)) return flat(c.lineText); return romajiOf(env) || 'No.' + lineNo(env); };
const lightOf = sc => (J.lum(sc.fg) > J.lum(sc.bg) ? sc.fg : sc.bg);
const darkOf = sc => (J.lum(sc.fg) > J.lum(sc.bg) ? sc.bg : sc.fg);
const _onc = new Map();
/* best-contrast scheme colour for text on a plate of colour `fill` */
const onCol = (sc, fill) => {
  const key = fill + sc.bg + sc.fg + sc.ink + sc.accent;
  let v = _onc.get(key);
  if (v) return v;
  let best = null, bv = 0;
  for (const c of [sc.bg, sc.fg, sc.ink, sc.accent, sc.sub]) { if (!c || c === fill) continue; const k = J.contrast(c, fill); if (k > bv) { bv = k; best = c; } }
  v = bv >= 2.4 ? best : (J.lum(fill) > 0.5 ? '#111111' : '#FFFFFF');
  if (_onc.size > 300) _onc.clear();
  _onc.set(key, v); return v;
};
/* first scheme colour that stands out from the background (for plates / objects) */
const plateCol = (sc, pref) => { for (const c of pref) if (c && J.contrast(c, sc.bg) >= 1.6) return c; return sc.fg; };
/* shade a plate colour towards the scheme's light (s > 0) or dark (s < 0) end */
const shade = (sc, c, s) => (s >= 0 ? J.mix(c, lightOf(sc), Math.min(0.9, s)) : J.mix(c, darkOf(sc), Math.min(0.9, -s)));
/* palette of object colours (plates, magnets, balloons …) that read on the bg */
const objCols = sc => { const out = []; for (const c of [sc.accent, sc.fg, sc.accent2, sc.ink, sc.sub]) if (c && J.contrast(c, sc.bg) >= 1.7 && !out.includes(c)) out.push(c); return out.length ? out : [sc.fg]; };
const adv = (font, ch) => (ch === ' ' ? 0.34 : J.metrics.adv(font, ch));

/* ---- chunking: k balanced groups of words (J.chunkText / latin words), long words split at natural points ---- */
const splitWord = w => {
  const n = [...w].length;
  if (/[A-Za-z]/.test(w)) {
    if (/[^\x00-\x7F]/.test(w)) { const c = J.chunkText(w).filter(Boolean); if (c.length > 1) return c; }
    return n > 10 ? [w.slice(0, Math.ceil(w.length / 2)), w.slice(Math.ceil(w.length / 2))] : [w];
  }
  return n < 2 ? [w] : J.splitLines(w, Math.ceil(n / 2)).split('\n').filter(Boolean);
};
function chunksK(text, k) {
  const t = String(text || '').trim();
  if (!t) return [''];
  let words = [];
  if (/\s/.test(t) && hasLatin(t)) { const ws = t.split(/\s+/).filter(Boolean); ws.forEach((w, i) => words.push({ t: w, sp: i < ws.length - 1 })); }
  else words = J.chunkText(strip(t)).map(w => ({ t: w.trim(), sp: false })).filter(w => w.t);
  if (!words.length) words = [{ t, sp: false }];
  k = Math.max(1, Math.min(k, J.glyphCount(t)));
  const gl = w => J.glyphCount(w.t);
  const hard = new Set();
  const splitAt = idx => {
    const w = words[idx], parts = splitWord(w.t);
    if (parts.length < 2) { hard.add(w.t); return false; }
    words.splice(idx, 1, ...parts.map((q, i) => ({ t: q, sp: i === parts.length - 1 ? w.sp : false })));
    return true;
  };
  for (let guard = 0; words.length < k && guard < 20; guard++) {
    let bi = -1, bl = 1;
    words.forEach((w, i) => { if (!hard.has(w.t) && gl(w) > bl) { bl = gl(w); bi = i; } });
    if (bi < 0) break;
    splitAt(bi);
  }
  // contiguous partition into k groups with the most even glyph counts (small DP)
  const part = () => {
    const n = words.length, kk = Math.min(k, n), L = words.map(w => gl(w) + 0.4);
    const pre = [0]; L.forEach(l => pre.push(pre[pre.length - 1] + l));
    const tgt = pre[n] / kk;
    const dp = Array.from({ length: kk + 1 }, () => new Array(n + 1).fill(Infinity)), by = Array.from({ length: kk + 1 }, () => new Array(n + 1).fill(0));
    dp[0][0] = 0;
    for (let g = 1; g <= kk; g++) for (let i = g; i <= n; i++) for (let j = g - 1; j < i; j++) {
      const d = pre[i] - pre[j] - tgt, v = dp[g - 1][j] + d * d;
      if (v < dp[g][i]) { dp[g][i] = v; by[g][i] = j; }
    }
    const cuts = []; let i = n;
    for (let g = kk; g >= 1; g--) { cuts.unshift(i); i = by[g][i]; }
    const out = []; let prev = 0;
    for (const c of cuts) { out.push(words.slice(prev, c)); prev = c; }
    return out;
  };
  let groups = part();
  for (let it = 0; it < 3 && groups.length > 1; it++) {
    const lens = groups.map(g => g.reduce((a, w) => a + gl(w), 0)), mx = Math.max(...lens), mn = Math.min(...lens);
    if (mx <= mn * 1.7 + 1) break;
    const big = groups[lens.indexOf(mx)];
    let bw = null; for (const w of big) if (!hard.has(w.t) && gl(w) >= 4 && (!bw || gl(w) > gl(bw))) bw = w;
    if (!bw || !splitAt(words.indexOf(bw))) break;
    groups = part();
  }
  return groups.map(g => g.map((w, i) => w.t + (i < g.length - 1 && w.sp ? ' ' : '')).join('')).filter(Boolean);
}
/* rows of glyph slots (a ' ' slot is a word gap) broken at chunk boundaries */
const rowsOf = (text, maxPer) => { const t = flat(text), n = J.glyphCount(t); return (n > maxPer ? chunksK(t, Math.ceil(n / maxPer)) : [t]).map(r => [...r.trim()]); };
/* balanced display line breaks at chunk boundaries */
const brk = (text, maxPer) => { const t = flat(text), n = J.glyphCount(t); return n <= maxPer ? t : chunksK(t, Math.ceil(n / maxPer)).join('\n'); };

/* ---- affine helpers: draw the lyric through a matrix, map its bbox back to design space ---- */
const mapPt = (m, x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
const mapBB = (bb, m) => {
  if (!bb) return null;
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const [x, y] of [[bb.x0, bb.y0], [bb.x1, bb.y0], [bb.x1, bb.y1], [bb.x0, bb.y1]]) { const p = mapPt(m, x, y); x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
  return box(x0, y0, x1, y1);
};
const drawAff = (env, it, m) => { const c = env.ctx; c.save(); c.transform(m[0], m[1], m[2], m[3], m[4], m[5]); const bb = J.mainDraw(env, it); c.restore(); return mapBB(bb, m); };
const drawAffPlain = (env, it, m) => { const c = env.ctx; c.save(); c.transform(m[0], m[1], m[2], m[3], m[4], m[5]); env.draw(it); c.restore(); };
const polyPts = (m, pts) => pts.map(([x, y]) => mapPt(m, x, y));
/* rounded-rect path */
const rrPath = (ctx, x, y, w, h, r) => {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
};
/* outline of a polygon (main pass) */
const outline = (env, pts, col, lw, a = 1) => { if (pts.length > 1) env.line(pts.concat([pts[0]]), col, lw, a, false); };
/* pool of glyphs taken from the line (for decoys / fillers) */
const KANA = 'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん';
const _pool = new Map();
const poolOf = cut => {
  const key = (cut.lineText || '') + '|' + cut.text;
  let p = _pool.get(key);
  if (!p) {
    const own = [...strip((cut.lineText || '') + cut.text)].filter(c => !J.isPunct(c) && !J.isSmallKana(c) && c !== 'ー' && !J.isLatin(c));
    p = own.concat([...KANA].filter((c, i) => i % 3 === 0));
    if (_pool.size > 100) _pool.clear();
    _pool.set(key, p);
  }
  return p;
};
/* per-font glyph memo reset when font metrics are rebuilt (fonts loading late) */
const MEMO = new Map(), SENT = '\u0001layoutsD';
const memo = (key, fn) => {
  const mm = J.metrics && J.metrics.m;
  if (mm && !mm.has(SENT)) { MEMO.clear(); mm.set(SENT, 1); }
  let v = MEMO.get(key);
  if (v === undefined) { v = fn(); if (MEMO.size > 300) MEMO.clear(); MEMO.set(key, v); }
  return v;
};
/* ================================================================== 1 cube — 立方体 */
/* orthographic cube (yaw θ, pitch φ): every face is a parallelogram, so text maps onto it exactly with one affine matrix */
const cubeFaces = (cx, cy, h, th, ph) => {
  const cp = Math.cos(ph), sp = Math.sin(ph), faces = [];
  for (let f = 0; f < 4; f++) {
    const a = f * Math.PI / 2 + th, ca = Math.cos(a), sa = Math.sin(a);
    const m = [ca, -sa * sp, 0, cp, cx + h * sa, cy + h * ca * sp];
    faces.push({ f, vis: ca * cp, m, nx: sa, nz: ca });
  }
  const ct = Math.cos(th), s2 = Math.sin(th);
  faces.push({ f: 4, vis: sp, m: [ct, -s2 * sp, s2, ct * sp, cx, cy - h * cp], nx: 0, nz: 0, top: true });
  return faces;
};
reg('cube', {
  name: '立方体', tags: ['graphic', 'pop'], w: 0.8, treat: 'safe', emph: 1.2, ae: 'pill', fits: n => n >= 1 && n <= 16,
  enterBias: { cut: 1.6, blur: 1.2, pop: 1.1, slice: 0.4, wipe: 0.5, stretch: 0.5 },
  plan(rng, cut, st) {
    const n = cut.n;
    let mode = n >= 4 && rng.chance(0.45) ? 'pair' : 'single';
    if (n >= 6 && cut.dur > 2.6 && rng.chance(0.35)) mode = 'turn';
    const k = mode === 'pair' ? 2 : mode === 'turn' ? Math.min(4, Math.max(2, Math.ceil(n / 5))) : 1;
    return {
      mode, chunks: k > 1 ? chunksK(cut.text, k) : [flat(cut.text)], font: rng.pick(fontsOf(st, ['display', 'display', 'serif'])),
      pitch: rng.range(20, 30), dir: rng.pick([1, -1]), face: rng.pick(['ink', 'accent', 'ink']), top: rng.pick(['accent', 'shade']), sway: rng.range(3, 7),
    };
  },
  render(env) {
    const { W, H, sc, ctx } = env, cut = env.cut, Pm = cut.params, u = U(env), lt = env.lt;
    let chunks = Pm.chunks && Pm.chunks.length ? Pm.chunks : [flat(cut.text)];
    const mode = chunks.length < 2 ? 'single' : Pm.mode;
    const ph = Pm.pitch * J.DEG, dir = Pm.dir || 1;
    const h = Math.min(W * (mode === 'pair' ? 0.27 : 0.3), H * 0.285, u * 0.36);
    const cx = W / 2, cy = H / 2 + h * Math.sin(ph) * 0.55;
    const pc = plateCol(sc, Pm.face === 'accent' ? [sc.accent, sc.ink] : [sc.ink, sc.fg, sc.accent]);
    const tc = onCol(sc, pc);
    const topC = Pm.top === 'accent' && J.contrast(sc.accent, pc) > 1.3 ? sc.accent : shade(sc, pc, 0.22);
    const out = tout(env);
    const pop = E.outBack(J.clamp(lt / 0.4), 1.3) * (1 - 0.15 * E.inCubic(env.pOut));
    // yaw schedule
    let th, seg = 0;
    const k = chunks.length;
    const spinIn = 1 - E.outBack(J.clamp(lt / 0.8), 1.1);
    const hold = Math.sin(env.ltb * 0.7) * Pm.sway * J.DEG * (env.fx.motion ?? 0.7);
    const away = E.inCubic(env.pOut) * 70 * J.DEG * dir;
    const segT = [];
    if (mode === 'turn') {
      const T = cut.dur / k;
      for (let j = 0; j < k; j++) segT.push(j * T);
      let acc = 0;
      for (let j = 1; j < k; j++) acc += E.inOutCubic(J.clamp((lt - segT[j] + 0.25) / 0.5));
      seg = acc;
      th = -(acc * Math.PI / 2) - 20 * J.DEG - spinIn * 90 * J.DEG;
      th *= dir;
    } else if (mode === 'pair') {
      th = dir * (-45 * J.DEG) + spinIn * 100 * J.DEG * dir;
    } else th = dir * (-24 * J.DEG) + spinIn * 100 * J.DEG * dir;
    th += hold + away;
    const hs = h * pop;
    if (hs < 1 || out <= 0) return null;
    const faces = cubeFaces(cx, cy, hs, th, ph);
    // contact shadow: the (hidden) bottom face pushed down
    const bm = faces[4].m.slice(); bm[5] = cy + hs * Math.cos(ph) + hs * 0.14;
    env.poly(polyPts(bm, [[-hs * 1.04, -hs * 1.04], [hs * 1.04, -hs * 1.04], [hs * 1.04, hs * 1.04], [-hs * 1.04, hs * 1.04]]), darkOf(sc), 0.35 * out, false);
    const lw = Math.max(1.2, u * 0.0022);
    let bb = null;
    const sq = s => [[-s, -s], [s, -s], [s, s], [-s, s]];
    // which face carries which chunk
    const faceOf = mode === 'turn' ? (f => { const idx = ((dir > 0 ? f : (4 - f) % 4)); return idx < k ? idx : -1; })
      : mode === 'pair' ? (f => (dir > 0 ? (f === 0 ? 0 : f === 1 ? 1 : -1) : (f === 3 ? 0 : f === 0 ? 1 : -1))) : (f => (f === 0 ? 0 : -1));
    for (const F of faces) {
      if (F.vis <= 0.004) continue;
      const light = F.top ? 0.28 : (-0.55 * F.nx * dir + 0.55 * F.nz) * 0.35;
      const col = F.top ? topC : shade(sc, pc, light);
      const pts = polyPts(F.m, sq(hs));
      env.poly(pts, col, out, gIn(env));
      outline(env, pts, J.mix(col, darkOf(sc), 0.35), lw, out);
      if (F.vis < 0.08) continue;
      const lm = F.m.slice();
      // content in face-local px (face size 2h, unscaled): compose the pop scale into the matrix
      const s0 = hs / h; lm[0] *= s0; lm[1] *= s0; lm[2] *= s0; lm[3] *= s0;
      if (F.top) {
        const lab = 'No.' + lineNo(env);
        drawAffPlain(env, { text: lab, font: monoF(env), size: h * 0.2, x: 0, y: 0, track: 0.2, color: onCol(sc, topC), alpha: out * 0.9, ghost: false }, lm);
        continue;
      }
      const ci = faceOf(F.f);
      if (ci >= 0 && chunks[ci]) {
        const t = brk(chunks[ci], mode === 'single' ? (isPort(env) ? 4 : 5) : 4);
        const size = Math.min(J.fitSize(t, Pm.font, h * 1.64, h * 1.5, { lead: 1.12, track: 0.02 }), h * 0.9);
        const arrive = mode === 'turn' ? segT[ci] + (ci ? 0.05 : 0.12) : 0.18 + ci * 0.12;
        const r = drawAff(env, { text: t, font: Pm.font, size, x: 0, y: 0, lead: 1.12, track: 0.02, color: tc, noHold: plateHold(env), mi: miAt(env, arrive) }, lm);
        bb = UB(bb, r);
      } else if (mode === 'single' && F.f === (dir > 0 ? 1 : 3)) {
        const t = brk(altCopy(env), 6);
        const fs = Math.min(J.fitSize(t, bodyF(env), h * 1.5, h * 1.2, { lead: 1.4, track: 0.08 }), h * 0.2);
        drawAffPlain(env, { text: t, font: bodyF(env), size: fs, x: 0, y: 0, lead: 1.4, track: 0.08, color: tc, alpha: 0.75 * out * tin(env, 0.3, 0.4), ghost: false }, lm);
      } else if (mode === 'single' && F.f === (dir > 0 ? 3 : 1)) {
        drawAffPlain(env, { text: lineNo(env), font: Pm.font, size: h * 1.1, x: 0, y: 0, fill: false, stroke: Math.max(1.5, h * 0.012), strokeColor: tc, alpha: 0.5 * out, ghost: false }, lm);
      }
    }
    return bb || box(cx - hs * 1.4, cy - hs * 1.6, cx + hs * 1.4, cy + hs * 1.2);
  },
});

/* ================================================================== 2 cylinder — 円筒 */
reg('cylinder', {
  name: '円筒', tags: ['graphic', 'calm', 'emotional'], w: 0.9, ae: 'ring', fits: n => n >= 2 && n <= 16,
  enterBias: { cut: 1.4, blur: 1.3, slice: 0.3, wipe: 0.4, stretch: 0.5 },
  plan(rng, cut, st) {
    return {
      font: rng.pick(fontsOf(st, ['display', 'serif'])), fs: rng.pick(fontsOf(st, ['body', 'display'])), rings: rng.pick([2, 4, 4, 6]), band: rng.chance(0.45),
      dir: rng.pick([1, -1]), speed: rng.range(0.25, 0.45), tilt: rng.range(0.13, 0.2), sep: rng.pick([' ・ ', ' / ', ' — ']), glass: rng.chance(0.7),
    };
  },
  render(env) {
    const { W, H, sc, ctx } = env, cut = env.cut, Pm = cut.params, u = U(env), lt = env.lt;
    const port = isPort(env);
    const t0 = flat(cut.text), n = J.glyphCount(t0);
    const rowsT = n > (port ? 7 : 9) ? chunksK(t0, 2) : [t0];
    const R = Math.min(W * (port ? 0.38 : 0.3), H * 0.42), cx = W / 2, ek = Pm.tilt;
    const span = 2.1;                                                  // radians the lyric may cover on the front
    let size = H * 0.2;
    for (const r of rowsT) { let a = 0; for (const ch of r) a += adv(Pm.font, ch) * 1.04; size = Math.min(size, span * R / Math.max(1, a)); }
    size = Math.min(size, u * (rowsT.length > 1 ? 0.15 : 0.19));
    const rowGap = size * 1.45;
    const nR = rowsT.length;
    const out = tout(env), dir = Pm.dir || 1;
    const spin = -(1 - E.outCubic(J.clamp(lt / 0.8))) * 1.7 * dir + Math.sin(env.ltb * 0.8) * 0.05 * (env.fx.motion ?? 0.7) + E.inCubic(env.pOut) * 1.9 * dir;
    // secondary rings above and below
    const ss = Math.max(12, size * 0.3), unit = [...(flat(cut.lineText || cut.text) + Pm.sep)];
    const nSec = Pm.rings;
    const yMid = H / 2;
    const ringY = [];
    const blockH = nR * rowGap;
    for (let i = 0; i < nSec; i++) {
      const side = i % 2 ? 1 : -1, k = Math.floor(i / 2);
      ringY.push({ y: yMid + side * (blockH / 2 + ss * 0.9 + k * ss * 1.6), dir: (i % 2 ? 1 : -1) * dir, k });
    }
    const yTop = Math.min(yMid - blockH / 2, ...ringY.map(r => r.y - ss * 0.8)) - ek * R - size * 0.12, yBot = Math.max(yMid + blockH / 2, ...ringY.map(r => r.y + ss * 0.8)) - ek * R + size * 0.12;
    const ea = tin(env, 0, 0.6, E.outCubic) * out;
    const ell = (y, a0, a1, N = 40) => { const pts = []; for (let i = 0; i <= N; i++) { const t = a0 + (a1 - a0) * i / N; pts.push([cx + R * Math.sin(t), y + ek * R * Math.cos(t)]); } return pts; };
    // glass body
    if (Pm.glass && ea > 0) {
      const lw = Math.max(1, u * 0.0016);
      env.line(ell(yTop - ek * R * 0, -Math.PI, Math.PI, 60), sc.sub, lw, 0.45 * ea, false);
      env.line(ell(yBot, -Math.PI / 2, Math.PI / 2), sc.sub, lw, 0.45 * ea, false);
      env.line([[cx - R, yTop], [cx - R, J.lerp(yTop, yBot, ea)]], sc.sub, lw, 0.45 * ea, false);
      env.line([[cx + R, yTop], [cx + R, J.lerp(yTop, yBot, ea)]], sc.sub, lw, 0.45 * ea, false);
    }
    // wrap band behind the lyric
    const bandC = plateCol(sc, [sc.accent, sc.ink]);
    const onBand = Pm.band;
    if (onBand && ea > 0) {
      const yb0 = yMid - blockH / 2 + size * 0.02 - ek * R, yb1 = yMid + blockH / 2 - size * 0.02 - ek * R;
      const top = ell(yb0, -Math.PI / 2, Math.PI / 2, 36), bot = ell(yb1, -Math.PI / 2, Math.PI / 2, 36).reverse();
      const pts = top.concat(bot);
      if (env.pass === 'main') {
        const g = ctx.createLinearGradient(cx - R, 0, cx + R, 0);
        g.addColorStop(0, shade(sc, bandC, -0.5)); g.addColorStop(0.35, bandC); g.addColorStop(0.55, shade(sc, bandC, 0.12)); g.addColorStop(1, shade(sc, bandC, -0.55));
        ctx.save(); ctx.globalAlpha = ea; ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath();
        ctx.save(); ctx.clip(); ctx.fillStyle = g; ctx.fillRect(cx - R - 2, yb0 - 4, R * 2 + 4, yb1 - yb0 + ek * R * 2 + 8); ctx.restore(); ctx.restore();
      } else env.poly(pts, bandC, ea, gIn(env));
    }
    // secondary rings: one item each, glyphs placed round the drum (back half mirrored & dim)
    if (env.pass === 'main') {
      for (const rg of ringY) {
        const a = tin(env, 0.05 + rg.k * 0.08, 0.5, E.outCubic) * out;
        if (a <= 0.01) continue;
        const cnt = Math.min(72, Math.max(unit.length, Math.floor(J.TAU * R / (ss * 1.05))));
        const chars = []; for (let i = 0; i < cnt; i++) chars.push(unit[i % unit.length]);
        const rot0 = env.ltb * Pm.speed * rg.dir + rg.k * 0.7 + spin * 0.5;
        const it = { text: chars.join(''), font: Pm.fs, size: ss, x: 0, y: 0, color: sc.sub, ghost: false, alpha: a };
        it._lay = J.layoutText(it);
        it.charFn = (i, g) => {
          const t = rot0 + i / cnt * J.TAU, c = Math.cos(t), s = Math.sin(t);
          const x = cx + R * s, y = rg.y - ek * R + ek * R * c;
          if (Math.abs(c) < 0.06) return { hide: true };
          return { dx: x - g.x, dy: y - g.y, sx: c, rot: Math.atan2(-ek * s, 1) / J.DEG * 0.8, a: c > 0 ? 0.45 + 0.55 * c : 0.12 + 0.1 * -c };
        };
        env.draw(it);
      }
    }
    // the lyric rows on the front of the drum
    let bb = null;
    rowsT.forEach((row, ri) => {
      const y0 = yMid + (ri - (nR - 1) / 2) * rowGap;
      const chars = [...row];
      const ads = chars.map(ch => adv(Pm.font, ch) * size * 1.04);
      const tot = ads.reduce((a, b) => a + b, 0);
      let acc = -tot / 2;
      chars.forEach((ch, i) => {
        const a0 = acc + ads[i] / 2; acc += ads[i];
        if (ch === ' ') return;
        const t = a0 / R + spin + (ri % 2 ? 0.08 : -0.08) * (nR > 1 ? 1 - E.outCubic(J.clamp(lt / 0.9)) : 0);
        const c = Math.cos(t), s = Math.sin(t);
        if (c < 0.03) return;
        const x = cx + R * s, y = y0 - ek * R + ek * R * c;
        const m = [c, -ek * s, 0, 1, x, y];
        const it = { text: ch, font: Pm.font, size, x: 0, y: 0, color: onBand ? onCol(sc, bandC) : sc.fg, alpha: 0.35 + 0.65 * Math.pow(c, 0.6), mi: ri * 4 + i * 0.6, noHold: true };
        bb = UB(bb, drawAff(env, it, m));
      });
    });
    return bb || box(cx - R, yMid - blockH / 2, cx + R, yMid + blockH / 2);
  },
});

/* ================================================================== 3 flipCards — カード列 */
reg('flipCards', {
  name: 'カードめくり', tags: ['pop', 'graphic'], w: 0.8, treat: 'safe', ae: 'labels', fits: n => n >= 1 && n <= 14,
  enterBias: { cut: 3, pop: 0.8, blur: 0.5, slice: 0.2, wipe: 0.2, stretch: 0.3, assemble: 0.2 },
  plan(rng, cut, st) {
    return {
      font: rng.pick(fontsOf(st, ['display', 'serif'])), order: rng.pick(['ltr', 'ltr', 'random']), table: rng.chance(0.55), back: rng.pick(['accent', 'ink']),
      peek: rng.chance(0.6), idx: rng.chance(0.7),
    };
  },
  render(env) {
    const { W, H, sc, ctx } = env, cut = env.cut, Pm = cut.params, s = cut.seed, u = U(env), lt = env.lt;
    const port = isPort(env);
    const rowsC = rowsOf(cut.text, port ? 4 : 7);
    const cards = [];
    rowsC.forEach((row, r) => row.forEach((ch, j) => { if (ch !== ' ') cards.push({ ch, r, j, cnt: row.length }); }));
    const n = cards.length;
    if (!n) return null;
    const rowsL = rowsC.length, per = Math.max(...rowsC.map(r => r.length));
    const extra = Pm.table ? 1 : 0;
    const rows = rowsL + extra * 2, asp = 1.38, gap = 0.16;
    const k = Math.min(W * 0.86 / (per + (per - 1) * gap), H * (Pm.table ? 0.86 : 0.7) / (rows * asp + (rows - 1) * gap), u * 0.26);
    const cw = k, chh = k * asp, sx = k * (1 + gap), sy = chh + k * gap;
    const out = tout(env);
    const faceC = lightOf(sc), faceT = darkOf(sc);
    const backC = [...(Pm.back === 'accent' ? [sc.accent, sc.ink] : [sc.ink, sc.accent]), sc.accent2, sc.sub, darkOf(sc)].find(c => c && J.contrast(c, faceC) >= 1.6 && J.contrast(c, sc.bg) >= 1.25) || J.mix(faceC, darkOf(sc), 0.6);
    const backL = J.mix(backC, onCol(sc, backC), 0.35);
    const fd = J.clamp(cut.dur * 0.12, 0.22, 0.36), gapT = J.clamp(cut.dur * 0.34 / n, 0.04, 0.12);
    const rank = cards.map((c, i) => i);
    if (Pm.order === 'random') rank.sort((a, b) => J.r(s, a, 31) - J.r(s, b, 31));
    const ord = new Array(n); rank.forEach((gi, q) => { ord[gi] = q; });
    const lw = Math.max(1, k * 0.012), rr = k * 0.08;
    const drawCard = (x, y, p, ch, isFace, key, alpha, lift) => {
      // p: 0 face-down … 1 face-up; card rotates round its vertical axis
      const ang = p * Math.PI, c = Math.cos(ang), sn = Math.sin(ang);
      const w = cw * Math.max(0.02, Math.abs(c)), sc2 = 1 + 0.1 * sn * lift;
      const hL = chh * sc2 * (1 + 0.1 * sn * (c > 0 ? 1 : -1)), hR = chh * sc2 * (1 - 0.1 * sn * (c > 0 ? 1 : -1));
      const ws = w * sc2;
      const pts = [[x - ws / 2, y - hL / 2], [x + ws / 2, y - hR / 2], [x + ws / 2, y + hR / 2], [x - ws / 2, y + hL / 2]];
      const up = p >= 0.5;
      // shadow
      env.poly(pts.map(([a, b]) => [a + k * 0.05 * (1 + sn * 1.5), b + k * 0.07 * (1 + sn * 1.5)]), darkOf(sc), 0.25 * alpha, false);
      if (up) {
        env.poly(pts, faceC, alpha, gIn(env));
        outline(env, pts, J.mix(faceC, faceT, 0.25), lw, alpha);
      } else {
        env.poly(pts, backC, alpha, gIn(env));
        const ins = k * 0.09, iw = Math.max(0, ws - ins * 2 * Math.abs(c));
        if (iw > 2) {
          const ih = chh * sc2 - ins * 2;
          env.rrect(x - iw / 2, y - ih / 2, iw, ih, rr * 0.6, null, alpha, false, backL, lw);
          const d = Math.min(iw, ih) * 0.28;
          env.poly([[x, y - d * 1.2], [x + d * Math.abs(c) * 0.9, y], [x, y + d * 1.2], [x - d * Math.abs(c) * 0.9, y]], backL, alpha, false);
        }
      }
      return { up, c, sc2, hs: (hL + hR) / 2 / chh };
    };
    let bb = null;
    // decoy table rows (face-down)
    if (Pm.table) {
      const ta = tin(env, 0, 0.4, E.outCubic) * (1 - E.inCubic(J.clamp((env.pOut - 0.4) / 0.6)));
      for (const rr0 of [-1, rowsL]) {
        for (let j = 0; j < per; j++) {
          const x = W / 2 + (j - (per - 1) / 2) * sx, y = H / 2 + (rr0 - (rowsL - 1) / 2) * sy;
          let p = 0, ch = null;
          if (Pm.peek) {
            // one decoy peeks now and then (flips up, shows a random glyph, flips back)
            const T = 1.3, kk = Math.floor(env.ltb / T), f = env.ltb / T - kk;
            if (kk >= 1 && J.h(s, kk, 5) % (per * 2) === j + (rr0 < 0 ? 0 : per)) { p = f < 0.25 ? E.inOutCubic(f / 0.25) : f < 0.6 ? 1 : 1 - E.inOutCubic((f - 0.6) / 0.25); ch = J.h(s, kk, 6) % 2 ? '？' : '★'; }
          }
          const r = drawCard(x, y, p, ch, false, 0, ta * 0.8, 1);
          if (r.up && ch) env.draw({ text: ch, font: Pm.font, size: k * 0.46, x, y, sx: Math.abs(r.c) * r.sc2, sy: r.sc2, color: sc.accent === faceC ? faceT : sc.accent, alpha: ta * 0.8, ghost: false });
        }
      }
    }
    cards.forEach((cd, i) => {
      const ch = cd.ch;
      const x = W / 2 + (cd.j - (cd.cnt - 1) / 2) * sx, y = H / 2 + (cd.r - (rowsL - 1) / 2) * sy;
      const ti = 0.12 + ord[i] * gapT;
      let p = E.inOutCubic(J.clamp((lt - ti) / fd));
      const po = J.clamp(env.pOut * 1.5 - ord[i] / Math.max(1, n) * 0.5);
      if (po > 0) p = Math.min(p, 1 - E.inOutCubic(po));
      const appear = tin(env, ord[i] * 0.02, 0.25, E.outCubic) * (1 - E.inCubic(J.clamp((env.pOut - 0.55) / 0.45)));
      const r = drawCard(x, y, p, ch, true, i, appear, 1);
      if (!r.up) return;
      const m = [Math.abs(r.c) * r.sc2, 0, 0, r.sc2 * r.hs, x, y];
      if (Pm.idx && Math.abs(r.c) > 0.3) {
        const is = k * 0.15;
        drawAffPlain(env, { text: ch, font: Pm.font, size: is, x: -cw * 0.34, y: -chh * 0.36, color: sc.accent, ghost: false }, m);
        drawAffPlain(env, { text: ch, font: Pm.font, size: is, x: cw * 0.34, y: chh * 0.36, rot: 180, color: sc.accent, ghost: false }, m);
      }
      bb = UB(bb, drawAff(env, { text: ch, font: Pm.font, size: k * 0.6, x: 0, y: 0, color: faceT, noHold: plateHold(env), mi: miAt(env, ti + fd * 0.5) }, m));
    });
    const bw = per * sx, bh = rowsL * sy;
    return bb || box(W / 2 - bw / 2, H / 2 - bh / 2, W / 2 + bw / 2, H / 2 + bh / 2);
  },
});

/* ================================================================== 4 accordion — 蛇腹 */
reg('accordion', {
  name: '蛇腹', tags: ['pop', 'graphic', 'editorial'], w: 0.8, treat: 'safe', ae: 'labels', fits: n => n >= 2 && n <= 16,
  enterBias: { cut: 2, blur: 1, pop: 0.8, slice: 0.3, wipe: 0.4 },
  plan(rng, cut, st) {
    const port = cut.H > cut.W * 1.08;
    return {
      font: rng.pick(fontsOf(st, ['display', 'serif'])), fold: rng.range(26, 38), orient: port && cut.n <= 10 && rng.chance(0.7) ? 'v' : 'h',
      covers: rng.chance(0.7), plate: rng.pick(['ink', 'fg', 'accent']), breathe: rng.range(3, 7), start: rng.pick([1, -1]),
    };
  },
  render(env) {
    const { W, H, sc } = env, cut = env.cut, Pm = cut.params, u = U(env), lt = env.lt;
    const n = J.glyphCount(cut.text);
    if (!n) return null;
    const port = isPort(env);
    const vert = Pm.orient === 'v' && port && n <= 10;
    const out = tout(env);
    const open = E.outBack(J.clamp((lt - 0.02) / 0.7), 1.25);
    const mot = env.fx.motion ?? 0.7;
    let alpha = Pm.fold + (1 - open) * (86 - Pm.fold) + Math.sin(env.ltb * 2.1) * Pm.breathe * mot * J.clamp(lt / 0.8) + E.inCubic(env.pOut) * (88 - Pm.fold);
    alpha = J.clamp(alpha, 2, 88.5) * J.DEG;
    const ca = Math.cos(alpha), sa = Math.sin(alpha);
    const rowsA = rowsOf(cut.text, vert ? 10 : port ? 5 : 9);
    const rows = rowsA.length, per = Math.max(...rowsA.map(r => r.length));
    const cA = Math.cos(Pm.fold * J.DEG);
    // unfolded panel size from the rest angle
    const Pw = Math.min((vert ? H * 0.82 : W * 0.86) / (per * cA + 0.5), (vert ? W * 0.5 : H * 0.62 / rows) / 1.25, u * 0.3);
    const Ph = Pw * 1.2;
    const pc = plateCol(sc, Pm.plate === 'accent' ? [sc.accent, sc.ink] : Pm.plate === 'fg' ? [sc.fg, sc.ink] : [sc.ink, sc.fg]);
    const tc = onCol(sc, pc), lit = shade(sc, pc, 0.1), dim = shade(sc, pc, -0.32);
    const covC = plateCol(sc, [sc.accent, sc.ink, sc.fg]) === pc ? shade(sc, pc, -0.45) : plateCol(sc, [sc.accent, sc.ink, sc.fg]);
    const kap = 0.13;
    let bb = null;
    const lw = Math.max(1, u * 0.0016);
    let gi = 0;
    for (let r = 0; r < rows; r++) {
      const row = rowsA[r], cnt = row.length;
      const pw = Pw * ca, tot = cnt * pw;
      const cy = (vert ? W : H) / 2 + (r - (rows - 1) / 2) * Ph * 1.3;
      const c0 = (vert ? H : W) / 2 - tot / 2;
      const edgeH = j => Ph * (1 + kap * sa * ((j + (Pm.start > 0 ? 0 : 1)) % 2 ? -1 : 1));
      // map (along, across) → screen
      const P2 = (a, b) => (vert ? [b, a] : [a, b]);
      // shadow under the strip
      const sh = [];
      for (let j = 0; j <= cnt; j++) sh.push(P2(c0 + j * pw + Ph * 0.06, cy + edgeH(j) / 2 + Ph * 0.07));
      for (let j = cnt; j >= 0; j--) sh.push(P2(c0 + j * pw + Ph * 0.06, cy + edgeH(j) / 2 + Ph * 0.02));
      env.poly(sh, darkOf(sc), 0.3 * out, false);
      for (let j = 0; j < cnt; j++) {
        const a0 = c0 + j * pw, a1 = a0 + pw, h0 = edgeH(j), h1 = edgeH(j + 1);
        const q = J.clamp((lt - j * 0.03) / 0.2) * out;
        if (q <= 0) continue;
        const facing = h1 > h0 ? 1 : -1;               // panel turning towards / away from the light
        const col = facing > 0 ? dim : lit;
        const pts = [P2(a0, cy - h0 / 2), P2(a1, cy - h1 / 2), P2(a1, cy + h1 / 2), P2(a0, cy + h0 / 2)];
        env.poly(pts, col, q, gIn(env));
        env.line([P2(a0, cy - h0 / 2), P2(a0, cy + h0 / 2)], J.mix(col, darkOf(sc), 0.4), lw, q, false);
        const ch = row[j];
        if (ch === ' ') continue;
        const mid = P2((a0 + a1) / 2, cy);
        const hs = (h0 + h1) / 2 / Ph;
        const m = vert ? [hs, 0, 0, ca, mid[0], mid[1]] : [ca, 0, 0, hs, mid[0], mid[1]];
        const size = Math.min(Pw * 0.66, Ph * 0.62);
        bb = UB(bb, drawAff(env, { text: ch, font: Pm.font, size, x: 0, y: 0, color: tc, noHold: plateHold(env), mi: miAt(env, 0.12 + (gi++) * 0.035) }, m));
      }
      if (Pm.covers) {
        const cq = tin(env, 0, 0.3, E.outCubic) * out;
        const cw2 = Ph * 0.09, chh = Ph * 1.16;
        for (const [a, hh] of [[c0 - cw2, edgeH(0)], [c0 + tot, edgeH(cnt)]]) {
          const pts = [P2(a, cy - chh / 2 * hh / Ph), P2(a + cw2, cy - chh / 2 * hh / Ph), P2(a + cw2, cy + chh / 2 * hh / Ph), P2(a, cy + chh / 2 * hh / Ph)];
          env.poly(pts, covC, cq, gIn(env));
        }
      }
    }
    return bb;
  },
});

/* ================================================================== 5 flag — はためく旗 */
reg('flag', {
  name: 'はためく旗', tags: ['emotional', 'pop', 'graphic'], w: 0.8, treat: 'safe', ae: 'wave', fits: n => n >= 1 && n <= 16,
  enterBias: { cut: 1.6, blur: 1.2, pop: 0.6, slice: 0.3, wipe: 0.6 },
  plan(rng, cut, st) {
    return {
      font: rng.pick(fontsOf(st, ['display', 'serif'])), mode: rng.pick(['unfurl', 'unfurl', 'raise']), cloth: rng.pick(['accent', 'ink', 'accent']), trim: rng.pick(['none', 'bands', 'edge']),
      tail: rng.pick(['rect', 'rect', 'swallow']), wind: rng.range(0.7, 1.15), side: rng.pick([1, 1, -1]),
    };
  },
  render(env) {
    const { W, H, sc } = env, cut = env.cut, Pm = cut.params, u = U(env), lt = env.lt;
    const port = isPort(env);
    const side = Pm.side || 1;
    const t0 = flat(cut.text), n = J.glyphCount(t0);
    const text = brk(t0, port ? 5 : n <= 5 ? 5 : Math.max(4, Math.ceil(n / 2)));
    const Wf = W * (port ? 0.78 : 0.62), Hf = Math.min(H * (port ? 0.34 : 0.52), Wf * 0.64);
    const poleX = side > 0 ? W / 2 - Wf / 2 - W * 0.03 : W / 2 + Wf / 2 + W * 0.03;
    const out = tout(env);
    const mot = env.fx.motion ?? 0.7;
    const unf = Pm.mode === 'unfurl' ? E.outCubic(J.clamp((lt - 0.05) / 0.75)) : 1;
    const raise = Pm.mode === 'raise' ? E.outCubic(J.clamp(lt / 0.8)) : 1;
    const lower = Pm.mode === 'raise' ? E.inCubic(env.pOut) : 0;
    const furl = Pm.mode === 'unfurl' ? E.inCubic(env.pOut) : 0;
    const y0 = H / 2 - Hf / 2 - H * 0.03 + (1 - raise) * H * 0.55 + lower * H * 0.6;
    const ext = Math.max(0.001, unf * (1 - furl));
    const A = Hf * 0.1 * Pm.wind * (0.5 + 0.7 * mot) * (1 + (1 - unf) * 1.2), D = Wf * 1.3;
    const w = 2.1, om = 3.2 * Pm.wind;
    const tb = env.ltb;
    const zf = x => A * Math.pow(x, 0.85) * Math.sin(J.TAU * w * x * 0.5 - om * tb) + A * 0.35 * x * Math.sin(J.TAU * 1.3 * x - om * 0.7 * tb + 1.3);
    const N = 30;
    const col = plateCol(sc, Pm.cloth === 'ink' ? [sc.ink, sc.accent] : [sc.accent, sc.ink]);
    const tc = onCol(sc, col);
    const trimC = J.contrast(sc.fg, col) > 1.5 ? (col === sc.accent ? onCol(sc, col) : sc.accent) : sc.accent;
    // sample the cloth
    const S = [];
    let xAcc = 0;
    for (let i = 0; i <= N; i++) {
      const uu = i / N * ext;
      const z = zf(uu), dz = (zf(uu + 0.01) - zf(uu - 0.01)) / 0.02 / Wf;
      if (i > 0) xAcc += (Wf * ext / N) / Math.sqrt(1 + dz * dz);
      const hs = 1 + z / D;
      const droop = uu * uu * Hf * 0.05 - z * 0.12;
      const x = poleX + side * xAcc;
      S.push({ u: uu, x, top: y0 + droop - (hs - 1) * Hf / 2, bot: y0 + droop + Hf * hs - (hs - 1) * Hf / 2, sl: dz, hs });
    }
    // pole
    const pa = tin(env, 0, 0.3, E.outCubic) * (Pm.mode === 'raise' ? 1 - E.inCubic(J.clamp((env.pOut - 0.5) / 0.5)) : out);
    const pw = Math.max(3, u * 0.011), ptop = H / 2 - Hf / 2 - H * 0.03 - Hf * 0.3;
    env.rect(poleX - pw / 2, ptop, pw, H * 1.2, sc.sub, pa, false);
    env.circle(poleX, ptop, pw * 1.5, sc.accent, null, 0, pa, false);
    if (unf * out <= 0.001 || y0 > H * 1.2) return null;
    // cloth: one silhouette (with a swallowtail notch), trims and fold shading clipped inside it
    const sw = Pm.tail === 'swallow';
    const at0 = uu => { const f = J.clamp(uu / ext) * N, i = Math.min(N - 1, Math.floor(f)), t = f - i, a = S[i], b = S[i + 1]; return { x: J.lerp(a.x, b.x, t), top: J.lerp(a.top, b.top, t), bot: J.lerp(a.bot, b.bot, t) }; };
    const sil = S.map(q => [q.x, q.top]);
    if (sw) { const q = at0(ext * 0.86); sil.push([q.x, (q.top + q.bot) / 2]); }
    for (let i = N; i >= 0; i--) sil.push([S[i].x, S[i].bot]);
    env.poly(sil, col, out, false);
    if (env.pass === 'main') {
      const ctx = env.ctx;
      ctx.save(); ctx.beginPath(); sil.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); ctx.clip();
      const band = (v0, v1, c, a) => { const pts = S.map(q => [q.x, J.lerp(q.top, q.bot, v0)]); for (let i = N; i >= 0; i--) pts.push([S[i].x, J.lerp(S[i].top, S[i].bot, v1)]); env.poly(pts, c, a, false); };
      if (Pm.trim === 'bands') { band(0.08, 0.15, trimC, out); band(0.85, 0.92, trimC, out); }
      if (Pm.trim === 'edge') { const a = S[0], b = S[Math.min(N, 3)]; env.poly([[a.x - side * 2, a.top - 4], [b.x, b.top - 4], [b.x, b.bot + 4], [a.x - side * 2, a.bot + 4]], trimC, out, false); }
      for (let i = 0; i < N; i++) {
        const a = S[i], b = S[i + 1], v = J.clamp(-(a.sl + b.sl) / 2 * side * 0.9, -0.4, 0.2);
        if (Math.abs(v) < 0.02) continue;
        env.poly([[a.x, a.top - 4], [b.x, b.top - 4], [b.x, b.bot + 4], [a.x, a.bot + 4]], v < 0 ? darkOf(sc) : lightOf(sc), Math.abs(v) * 0.8 * out, false);
      }
      ctx.restore();
    }
    // rope rings
    env.circle(poleX + side * pw * 0.2, S[0].top + Hf * 0.04, pw * 0.9, null, sc.sub, Math.max(1, pw * 0.3), out, false);
    env.circle(poleX + side * pw * 0.2, S[0].bot - Hf * 0.04, pw * 0.9, null, sc.sub, Math.max(1, pw * 0.3), out, false);
    // lyric printed on the cloth: glyph centres in flag-local (u, v)
    const o = { track: 0.04, lead: 1.15 };
    const size = Math.min(J.fitSize(text, Pm.font, Wf * (Pm.tail === 'swallow' ? 0.66 : 0.78), Hf * (Pm.trim === 'bands' ? 0.58 : 0.68), o), Hf * 0.42);
    const lay = J.layoutText({ text, font: Pm.font, size, track: o.track, lead: o.lead });
    const uC = (Pm.tail === 'swallow' ? 0.46 : 0.52) + (Pm.trim === 'edge' ? 0.03 : 0);
    let bb = null;
    const at = uu => { const f = J.clamp(uu / ext) * N, i = Math.min(N - 1, Math.floor(f)), t = f - i, a = S[i], b = S[i + 1]; return { x: J.lerp(a.x, b.x, t), top: J.lerp(a.top, b.top, t), bot: J.lerp(a.bot, b.bot, t), sl: J.lerp(a.sl, b.sl, t), hs: J.lerp(a.hs, b.hs, t) }; };
    for (const g of lay) {
      if (g.ch === ' ' || g.ch === '　') continue;
      const uu = uC + side * g.x / Wf;
      if (uu > ext) continue;
      const q = at(uu);
      const v = 0.5 + g.y / Hf;
      const y = J.lerp(q.top, q.bot, v);
      const cs = 1 / Math.sqrt(1 + q.sl * q.sl);
      const slope = ((at(uu + 0.01).top + at(uu + 0.01).bot) - (at(uu - 0.01).top + at(uu - 0.01).bot)) / 2 / (Math.abs(at(uu + 0.01).x - at(uu - 0.01).x) + 1e-3);
      const m = [cs, slope * cs * side, 0, q.hs, q.x, y];
      bb = UB(bb, drawAff(env, { text: g.ch, font: Pm.font, size, x: 0, y: 0, color: tc, noHold: plateHold(env), mi: miAt(env, 0.1 + uu * 0.6) }, m));
    }
    return bb || box(Math.min(S[0].x, S[N].x), S[0].top, Math.max(S[0].x, S[N].x), S[0].bot);
  },
});

/* ================================================================== 6 ribbon — リボン */
reg('ribbon', {
  name: 'リボン', tags: ['pop', 'emotional', 'graphic'], w: 0.9, treat: 'safe', portrait: 0.7, ae: 'wave', fits: n => n >= 2 && n <= 16,
  enterBias: { cut: 1.8, blur: 1.2, pop: 0.8, slice: 0.3, stretch: 0.4 },
  plan(rng, cut, st) {
    return {
      font: rng.pick(fontsOf(st, ['display', 'serif'])), amp: rng.range(0.05, 0.1), freq: rng.range(0.55, 0.9), ph: rng.range(0, 6), col: rng.pick(['accent', 'accent', 'ink']),
      reveal: rng.pick(['center', 'left']), tilt: rng.range(-6, 6),
    };
  },
  render(env) {
    const { W, H, sc, ctx } = env, cut = env.cut, Pm = cut.params, u = U(env), lt = env.lt;
    const port = isPort(env);
    const t0 = flat(cut.text), n = J.glyphCount(t0);
    const rowsT = n > (port ? 6 : 10) ? chunksK(t0, n > 12 && port ? 3 : 2) : [t0];
    const nR = rowsT.length;
    const out = tout(env);
    const pc = plateCol(sc, Pm.col === 'ink' ? [sc.ink, sc.accent] : [sc.accent, sc.ink]);
    const back = shade(sc, pc, -0.42), tc = onCol(sc, pc);
    const mot = env.fx.motion ?? 0.7;
    let bb = null;
    const x0 = W * 0.09, x1 = W * 0.91, L = x1 - x0;
    // common text size so the rows match
    let size = u * 0.16;
    for (const r of rowsT) { let a = 0; for (const ch of r) a += adv(Pm.font, ch) * 1.05; size = Math.min(size, L * 0.58 / Math.max(1, a)); }
    size = Math.min(size, H * 0.62 / (nR * 2.3));
    const bw = size * 0.72;
    rowsT.forEach((row, ri) => {
      const cy = H / 2 + (ri - (nR - 1) / 2) * size * 2.35;
      const A = H * Pm.amp * (nR > 1 ? 0.55 : 1) * (1 + 0.12 * Math.sin(env.ltb * 1.1 + ri));
      const ph = Pm.ph + ri * 2.1 + env.ltb * 0.9 * mot * 0.6;
      const tl = Math.tan(Pm.tilt * J.DEG) * (ri % 2 ? -1 : 1);
      const path = x => [x, cy + A * Math.sin(J.TAU * Pm.freq * (x - x0) / L + ph) + (x - W / 2) * tl];
      // arc-length table
      const NS = 90, pts = [], acc = [0];
      for (let i = 0; i <= NS; i++) pts.push(path(x0 + L * i / NS));
      for (let i = 1; i <= NS; i++) acc.push(acc[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
      const TL = acc[NS];
      const atS = s => { s = J.clamp(s, 0, TL); let lo = 0, hi = NS; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (acc[m] <= s) lo = m; else hi = m; } const f = (s - acc[lo]) / Math.max(1e-6, acc[hi] - acc[lo]); const p = [J.lerp(pts[lo][0], pts[hi][0], f), J.lerp(pts[lo][1], pts[hi][1], f)]; const ang = Math.atan2(pts[hi][1] - pts[lo][1], pts[hi][0] - pts[lo][0]); return { p, ang }; };
      // twist: flat front in the middle, ends folded to show the back
      const tau = f => { const d = Math.abs(f - 0.5); return d < 0.33 ? 1 : Math.cos(Math.PI * (d - 0.33) / 0.17); };
      const e = E.inOutCubic(J.clamp((lt - ri * 0.12) / 0.75)) * (1 - E.inCubic(env.pOut));
      const vis = f => (Pm.reveal === 'left' ? f <= e : Math.abs(f - 0.5) <= e / 2);
      // shadow + band
      const NB = 64, seg = [];
      for (let i = 0; i <= NB; i++) {
        const f = i / NB, q = atS(f * TL), t = tau(f), nx = -Math.sin(q.ang), ny = Math.cos(q.ang);
        seg.push({ f, t, a: [q.p[0] + nx * bw * t, q.p[1] + ny * bw * t], b: [q.p[0] - nx * bw * t, q.p[1] - ny * bw * t], p: q.p, ang: q.ang });
      }
      const sh = size * 0.1, vs = seg.filter(q => vis(q.f));
      if (vs.length > 1) env.poly(vs.map(q => [q.a[0] + sh, q.a[1] + sh * 1.4]).concat(vs.slice().reverse().map(q => [q.b[0] + sh, q.b[1] + sh * 1.4])), darkOf(sc), 0.22, false);
      // runs of segments facing the same way → one polygon each; the twist shading is laid over it
      let run = [];
      const flush = () => {
        if (run.length > 1) {
          const t = run[Math.floor(run.length / 2)].t;
          env.poly(run.map(q => q.a).concat(run.slice().reverse().map(q => q.b)), t >= 0 ? pc : back, 1, gIn(env) && t >= 0);
          if (t >= 0) env.line(run.filter(q => q.t > 0.6).map(q => q.a), shade(sc, pc, 0.3), Math.max(1, size * 0.02), 0.8, false);
        }
        run = [];
      };
      for (let i = 0; i <= NB; i++) {
        const q = seg[i];
        if (!vis(q.f)) { flush(); continue; }
        if (run.length && Math.sign(run[run.length - 1].t || 1) !== Math.sign(q.t || 1)) { const last = run[run.length - 1]; flush(); run.push(last); }
        run.push(q);
      }
      flush();
      for (let i = 0; i < NB; i++) {
        const A0 = seg[i], B0 = seg[i + 1];
        if (!vis(A0.f) || !vis(B0.f)) continue;
        const t = (A0.t + B0.t) / 2;
        if (Math.abs(t) > 0.97) continue;
        env.poly([A0.a, B0.a, B0.b, A0.b], darkOf(sc), (1 - Math.abs(t)) * 0.4, false);
      }
      // notched tails
      for (const end of [0, NB]) {
        const S0 = seg[end];
        if (!vis(S0.f)) continue;
        const dirn = end === 0 ? 1 : -1;
        const ext = [-Math.cos(S0.ang) * bw * 1.3 * dirn, -Math.sin(S0.ang) * bw * 1.3 * dirn];
        const c = shade(sc, back, -0.12);
        env.poly([S0.a, [S0.a[0] + ext[0], S0.a[1] + ext[1]], [S0.p[0] + ext[0] * 0.45, S0.p[1] + ext[1] * 0.45], [S0.b[0] + ext[0], S0.b[1] + ext[1]], S0.b], c, 1, false);
      }
      // lyric along the flat middle
      const chars = [...row], ads = chars.map(ch => adv(Pm.font, ch) * size * 1.05), tot = ads.reduce((a, b) => a + b, 0);
      let s0 = TL / 2 - tot / 2;
      chars.forEach((ch, i) => {
        const sc0 = s0 + ads[i] / 2; s0 += ads[i];
        if (ch === ' ') return;
        const f = sc0 / TL;
        if (!vis(f)) return;
        const q = atS(sc0);
        bb = UB(bb, J.mainDraw(env, { text: ch, font: Pm.font, size, x: q.p[0], y: q.p[1], rot: q.ang / J.DEG, sy: tau(f), color: tc, noHold: plateHold(env), mi: miAt(env, ri * 0.12 + (Pm.reveal === 'left' ? f : Math.abs(f - 0.5) * 2) * 0.6) }));
      });
    });
    return bb;
  },
});

/* ================================================================== 7 pendulum — 振り子 */
reg('pendulum', {
  name: '振り子', tags: ['calm', 'pop', 'emotional'], w: 0.8, treat: 'safe', portrait: 1.2, ae: 'labels', fits: n => n >= 1 && n <= 16,
  enterBias: { cut: 2, drop: 1.4, pop: 1.2, blur: 0.8, slice: 0.2, wipe: 0.3, stretch: 0.3 },
  plan(rng, cut, st) {
    const n = cut.n, port = cut.H > cut.W * 1.08, spaced = /\s/.test(String(cut.text).trim());
    const opts = [];
    if (n <= (port ? 5 : 8) && !spaced) opts.push('cradle', 'cradle');
    if (n <= 12 && !spaced) opts.push('fan', port ? 'fan' : 'chunks');
    if (n >= 4) opts.push('chunks');
    const mode = rng.pick(opts.length ? opts : ['chunks']);
    return { mode, chunks: chunksK(cut.text, J.clamp(Math.ceil(n / 4), 2, 4)), font: rng.pick(fontsOf(st, ['display', 'serif'])), period: rng.range(1.05, 1.4), amp: rng.range(22, 30), phase: rng.range(0, 6), side: rng.pick([1, -1]) };
  },
  render(env) {
    const { W, H, sc, ctx } = env, cut = env.cut, Pm = cut.params, s = cut.seed, u = U(env), lt = env.lt;
    const chs = slotsOf(cut.text).filter(c => c !== ' '), n = chs.length;
    if (!n) return null;
    const out = tout(env), mot = env.fx.motion ?? 0.7;
    const port = isPort(env);
    let mode = Pm.mode;
    if (mode === 'cradle' && n > (port ? 6 : 9)) mode = 'fan';
    if (mode === 'fan' && n > 13) mode = 'chunks';
    const lw = Math.max(1, u * 0.0015);
    const pc = plateCol(sc, [sc.ink, sc.fg]), tc = onCol(sc, pc);
    const fa = tin(env, 0, 0.45, E.outCubic) * out;
    let bb = null;
    if (mode === 'cradle') {
      const r = Math.min(W * 0.84 / (n * 2.02 + 1.2), H * 0.13, u * 0.12);
      const L = Math.min(H * 0.42, r * 5.2);
      const cx = W / 2, x0 = cx - (n - 1) * r;
      const py = H / 2 - L * 0.62, by = py + L;
      // frame
      const fw = (n - 1) * r + r * 2.6, fb = by + r + H * 0.06;
      const fc = sc.sub;
      env.line([[cx - fw, fb], [cx - fw, py], [cx + fw, py], [cx + fw, fb]], fc, Math.max(2, u * 0.006), fa, false);
      env.rrect(cx - fw - r * 0.7, fb, fw * 2 + r * 1.4, r * 0.28, r * 0.1, fc, fa, false);
      const T = Pm.period, w = J.TAU / T, A = Pm.amp * J.DEG * (0.6 + 0.5 * mot);
      const t0 = 0.75, tau = env.ltb - t0;
      let sAng = tau > 0 ? -Math.cos(w * tau) : -1;
      const lift = tau > 0 ? 1 : E.inOutCubic(J.clamp((lt - 0.25) / 0.45));
      const decay = 1 - 0.25 * J.clamp(tau / 6);
      chs.forEach((ch, i) => {
        const px = x0 + i * r * 2;
        let th = 0;
        if (i === 0) th = A * decay * Math.min(0, sAng) * (tau > 0 ? 1 : lift);
        if (i === n - 1 && n > 1) th = A * decay * Math.max(0, sAng);
        if (n === 1) th = A * decay * sAng * lift;
        const drop = E.outBack(J.clamp((lt - i * 0.05) / 0.35), 1.4);
        const Lc = L * drop;
        const bx = px + Math.sin(th) * Lc, byy = py + Math.cos(th) * Lc;
        if (drop <= 0) return;
        const d = r * 0.85;
        env.line([[px - d, py], [bx, byy]], sc.sub, lw, 0.9 * out, false);
        env.line([[px + d, py], [bx, byy]], sc.sub, lw, 0.9 * out, false);
        env.circle(bx, byy, r * 0.985, pc, null, 0, out, gIn(env));
        env.circle(bx - r * 0.35, byy - r * 0.38, r * 0.2, lightOf(sc), null, 0, 0.35 * out, false);
        env.circle(bx, byy, r * 0.985, null, J.mix(pc, darkOf(sc), 0.4), lw, out, false);
        // impact sparks
        if (tau > 0 && ((i === 0 && n > 1) || i === n - 1)) {
          const ph = ((w * tau) / Math.PI) % 2, near = Math.min(Math.abs(ph - 0.5), Math.abs(ph - 1.5));
          if (near < 0.08 && ((i === 0) === (Math.abs(ph - 0.5) < 0.08)) ) {
            const k = 1 - near / 0.08, sx = px + (i === 0 ? r : -r);
            for (let q = -1; q <= 1; q++) env.line([[sx + (i === 0 ? r * 0.2 : -r * 0.2), byy + q * r * 0.5], [sx + (i === 0 ? r * 0.55 : -r * 0.55), byy + q * r * 0.9]], sc.accent, Math.max(1.5, r * 0.05), k * out, false);
          }
        }
        bb = UB(bb, J.mainDraw(env, { text: ch, font: Pm.font, size: r * 1.08, x: bx, y: byy, rot: -th / J.DEG, color: tc, noHold: plateHold(env), mi: miAt(env, 0.15 + i * 0.05) }));
      });
      return bb;
    }
    // single pivot: several pendulums of different length (a pendulum wave)
    const items = mode === 'fan' ? chs.map(c => ({ t: c })) : (Pm.chunks && Pm.chunks.length ? Pm.chunks : chunksK(cut.text, 3)).map(c => ({ t: flat(c) }));
    const k = items.length;
    const px = W / 2 + (mode === 'chunks' && !port ? 0 : 0), py = H * 0.06;
    let size, step, L0, plateW = [];
    if (mode === 'fan') {
      step = Math.min(H * 0.84 / (k + 1.2), W * 0.2);
      size = step * 0.84; L0 = step * 1.4;
    } else {
      const wMax = W * (port ? 0.8 : 0.56);
      size = Math.min(...items.map(q => J.fitSize(q.t, Pm.font, wMax, H * 0.8 / (k + 1) * 0.62, { track: 0.03 })), u * 0.14);
      step = size * 1.75; L0 = Math.max(H * 0.9 - step * k, size * 2);
      plateW = items.map(q => J.measure({ text: q.t, font: Pm.font, size, track: 0.03 }).w + size * 0.8);
    }
    const Lmax = L0 + step * (k - 1);
    const A = (mode === 'fan' ? 7 : 5) * J.DEG * (0.5 + 0.7 * mot);
    const rel = E.inOutCubic(J.clamp((lt - 0.1) / 0.6));
    env.circle(px, py, Math.max(3, u * 0.008), sc.accent, null, 0, fa, false);
    env.rect(px - u * 0.06 * fa, py - Math.max(2, u * 0.003), u * 0.12 * fa, Math.max(3, u * 0.005), sc.sub, fa, false);
    const pos = items.map((q, i) => {
      const L = L0 + step * i;
      const Ti = Pm.period * 1.6 * Math.sqrt(L / Lmax);
      const tau = Math.max(0, env.ltb - 0.2);
      const th = A * Pm.side * Math.cos(J.TAU * tau / Ti) * rel + E.inCubic(env.pOut) * 30 * J.DEG * Pm.side * (0.5 + i / k);
      const grow = E.outCubic(J.clamp((lt - i * 0.04) / 0.4));
      return { L: L * grow, th, grow };
    });
    // strings first, bobs on top so the fan never cuts through a glyph
    pos.forEach((q, i) => { if (q.grow > 0) env.line([[px, py], [px + Math.sin(q.th) * q.L, py + Math.cos(q.th) * q.L - (mode === 'fan' ? size * 0.55 : size * 0.62)]], sc.sub, lw, 0.75 * out, false); });
    items.forEach((q, i) => {
      const p = pos[i];
      if (p.grow <= 0) return;
      const bx = px + Math.sin(p.th) * p.L, byy = py + Math.cos(p.th) * p.L;
      const col = i % 2 && J.contrast(sc.accent, sc.bg) > 1.6 ? sc.accent : pc;
      if (mode === 'fan') {
        env.circle(bx, byy, size * 0.62, col, null, 0, out, gIn(env));
      } else {
        const w2 = plateW[i], h2 = size * 1.24;
        ctx.save(); ctx.translate(bx, byy); ctx.rotate(-p.th);
        env.rrect(-w2 / 2, -h2 / 2, w2, h2, h2 * 0.14, col, out, gIn(env));
        env.circle(0, -h2 / 2 + h2 * 0.12, Math.max(2, size * 0.06), sc.bg, null, 0, out, false);
        ctx.restore();
      }
      bb = UB(bb, J.mainDraw(env, { text: q.t, font: Pm.font, size: mode === 'fan' ? size * 0.78 : size, track: 0.03, x: bx, y: byy + (mode === 'fan' ? 0 : size * 0.06), rot: -p.th / J.DEG, color: onCol(sc, col), noHold: plateHold(env), mi: miAt(env, 0.12 + i * 0.05) }));
    });
    return bb;
  },
});

/* ================================================================== 8 pile — 文字の山 */
reg('pile', {
  name: '文字の山', tags: ['pop', 'emotional', 'graphic'], w: 0.8, ae: 'scatter', fits: n => n >= 1 && n <= 14,
  enterBias: { cut: 2.4, drop: 1.2, pop: 0.8, slice: 0.2, wipe: 0.2, stretch: 0.3, assemble: 0.4 },
  plan(rng, cut, st) {
    return { font: rng.pick(fontsOf(st, ['display'])), hf: rng.pick(fontsOf(st, ['body', 'display', 'serif'])), peak: rng.range(-0.12, 0.12), hgt: rng.range(0.26, 0.34), order: rng.pick(['ltr', 'random', 'random']), dust: rng.chance(0.7) };
  },
  render(env) {
    const { W, H, sc } = env, cut = env.cut, Pm = cut.params, s = cut.seed, u = U(env), lt = env.lt;
    const port = isPort(env);
    const t0 = flat(cut.text), n = J.glyphCount(t0);
    if (!n) return null;
    const rowsT = n > (port ? 5 : 8) ? chunksK(t0, port ? Math.ceil(n / 5) : 2) : [t0];
    const nR = rowsT.length;
    const out = tout(env);
    let size = Math.min(u * 0.2, H * 0.5 / (nR + 0.6));
    for (const r of rowsT) { let a = 0; for (const ch of r) a += adv(Pm.font, ch) * 1.02; size = Math.min(size, W * (port ? 0.86 : 0.74) / Math.max(1, a)); }
    let maxTot = 0; for (const r of rowsT) { let a = 0; for (const ch of r) a += adv(Pm.font, ch) * 1.02 * size; maxTot = Math.max(maxTot, a); }
    const cx = J.clamp(W * (0.5 + Pm.peak * (port ? 0.2 : 0.6)), W * 0.06 + maxTot / 2, W * 0.94 - maxTot / 2), sig = Math.max(W * 0.26, maxTot * 0.68);
    const yBase = H * 1.04;
    const Hm = yBase - (H * (0.5 + Pm.hgt * 0.25) + nR * size * 0.49);
    const rise = (1 - E.outCubic(J.clamp(lt / 0.5))) * Hm * 1.1 + E.inCubic(env.pOut) * Hm * 0.5;
    const bump = x => Math.sin(x / W * 17 + s % 7) * H * 0.006 + Math.sin(x / W * 31 + (s % 5)) * H * 0.004;
    const surf = x => yBase + rise - Hm / (1 + Math.pow((x - cx) / sig, 4)) + bump(x);
    // heap of small glyphs under the surface (one item, glyphs placed by charFn)
    const pool = poolOf(cut), NP = pool.length;
    const cell = J.clamp(u * 0.045, 16, 60);
    const heap = [];
    // the body of the mound (dim), glyphs only in the top few layers
    const mound = [];
    for (let i = 0; i <= 48; i++) { const x = -W * 0.02 + W * 1.04 * i / 48; mound.push([x, surf(x) + cell * 1.2]); }
    mound.push([W * 1.02, H + 4], [-W * 0.02, H + 4]);
    env.poly(mound, J.mix(sc.bg, sc.sub, 0.14), out, false);
    const colsN = Math.ceil(W / cell) + 2, depth = Math.max(3, Math.min(5, Math.floor(200 / colsN)));
    for (let gx = -1; gx < colsN - 1 && heap.length < 200; gx++) {
      const x = (gx + 0.5) * cell;
      const top = surf(x);
      for (let gy = 0; gy < depth && heap.length < 200; gy++) {
        const y = top + (gy + 0.5) * cell * 0.82;
        if (y > H + cell) break;
        const j = heap.length;
        heap.push({ x: x + J.rs(s, gx, gy, 3) * cell * 0.3, y: y + J.rs(s, gx, gy, 4) * cell * 0.2, r: J.rs(s, gx, gy, 5) * 70, ch: pool[J.h(s, gx, gy, 6) % NP], c: J.r(s, gx, gy, 7) < 0.14 ? 1 : 0, a: (0.35 + 0.5 * J.r(s, gx, gy, 8)) * (1 - gy / (depth + 1)) });
      }
    }
    if (env.pass === 'main' && heap.length) {
      const it = { text: heap.map(q => q.ch).join(''), font: Pm.hf, size: cell * 0.8, x: 0, y: 0, color: sc.sub, ghost: false, alpha: out };
      it._lay = J.layoutText(it);
      it.charFn = (i, g) => { const q = heap[i]; return q ? { dx: q.x - g.x, dy: q.y - g.y, rot: q.r, a: q.a, color: q.c ? sc.accent : null } : { hide: true }; };
      env.draw(it);
    }
    // lyric glyphs fall onto the heap and settle along its slope
    const fd = 0.34, gap = J.clamp(cut.dur * 0.3 / n, 0.03, 0.09);
    let bb = null, idx = 0;
    const order = [];
    for (let ri = nR - 1; ri >= 0; ri--) {                  // lower layers land first
      const chars = [...rowsT[ri]];
      const ord = chars.map((c, i) => i);
      if (Pm.order === 'random') ord.sort((a, b) => J.r(s, ri, a, 21) - J.r(s, ri, b, 21));
      ord.forEach(i => order.push([ri, i]));
    }
    const when = new Map(); order.forEach(([ri, i], q) => when.set(ri * 100 + i, 0.08 + q * gap));
    rowsT.forEach((row, ri) => {
      const layer = nR - 1 - ri;
      const chars = [...row], ads = chars.map(ch => adv(Pm.font, ch) * size * 1.02), tot = ads.reduce((a, b) => a + b, 0);
      let x = cx - tot / 2;
      chars.forEach((ch, i) => {
        const gxp = x + ads[i] / 2; x += ads[i];
        if (ch === ' ') return;
        const ys = surf(gxp);
        const slope = Math.atan2(surf(gxp + size * 0.5) - surf(gxp - size * 0.5), size);
        const tilt = slope / J.DEG * 0.7 + J.rs(s, ri, i, 9) * 6;
        const restY = ys - size * (0.47 + layer * 0.98);
        const t1 = when.get(ri * 100 + i);
        const f = (lt - t1) / fd;
        if (f < 0) return;
        let y, rot, sy = 1;
        if (f < 1) { const e = E.inQuad(f); y = J.lerp(-size * 1.2 - J.r(s, ri, i, 10) * H * 0.2, restY, e); rot = J.lerp(J.rs(s, ri, i, 11) * 50, tilt, e); }
        else {
          const tau = (f - 1) * fd;
          y = restY - size * 0.14 * Math.abs(Math.sin(tau * 16)) * Math.exp(-tau / 0.09); rot = tilt; sy = 1 - 0.16 * Math.exp(-tau / 0.05);
          if (Pm.dust && tau < 0.35 && env.pass === 'main') {
            for (let q = 0; q < 4; q++) {
              const dir = q < 2 ? -1 : 1, sp = J.rr(0.6, 1.2, s, ri, i, q);
              env.circle(gxp + dir * (size * 0.35 + tau * size * 1.6 * sp), restY + size * 0.45 - tau * size * (0.9 - tau * 2.2) * sp, size * 0.035 * (1 - tau / 0.35), sc.sub, null, 0, (1 - tau / 0.35) * out, false);
            }
          }
        }
        idx++;
        bb = UB(bb, J.mainDraw(env, { text: ch, font: Pm.font, size, x: gxp, y: y + size * 0.47 * (1 - sy), sy, rot, color: J.r(s, ri, i, 12) < 0.12 ? sc.accent : sc.fg, mi: miAt(env, t1) }));
      });
    });
    return bb;
  },
});

/* ================================================================== 9 blocks — 積み木 */
reg('blocks', {
  name: '積み木', tags: ['pop', 'graphic'], w: 0.8, treat: 'safe', ae: 'labels', fits: n => n >= 1 && n <= 14,
  enterBias: { cut: 2.5, drop: 1.4, pop: 1, blur: 0.4, slice: 0.2, wipe: 0.2, stretch: 0.3 },
  plan(rng, cut, st) {
    return { font: rng.pick(fontsOf(st, ['display'])), deco: rng.chance(0.75), tilt: rng.chance(0.5), hop: rng.chance(0.7), side: rng.pick([1, -1]), colOff: rng.int(0, 5) };
  },
  render(env) {
    const { W, H, sc, ctx } = env, cut = env.cut, Pm = cut.params, s = cut.seed, u = U(env), lt = env.lt;
    const n = J.glyphCount(cut.text);
    if (!n) return null;
    const port = isPort(env);
    const rowsB = rowsOf(cut.text, port ? 4 : n <= 6 ? 6 : Math.min(8, Math.ceil(n / 2)));
    const rows = rowsB.length, per = Math.max(...rowsB.map(r => r.length));
    const dk = 0.34, gk = 1.07;                                         // depth of the oblique side / top
    const deco = Pm.deco && (!port || n <= 3);
    const extra = deco ? 2 : 0;
    const k = Math.min(W * 0.84 / (per * gk + extra * 0.95 + dk), H * 0.7 / (rows * 1.02 + dk + 0.2), u * 0.26);
    const dx = k * dk * 0.8 * Pm.side, dy = -k * dk * 0.62;
    const floorY = H / 2 + (rows * k) / 2 + k * 0.1;
    const out = tout(env);
    const cols = objCols(sc);
    const lw = Math.max(1, k * 0.012);
    env.line([[W * 0.08, floorY], [W * 0.92, floorY]], sc.sub, Math.max(1, u * 0.002), 0.6 * tin(env, 0, 0.4) * out, false);
    const blk = [];
    // lyric blocks: bottom row first so the upper rows land on them
    let gi = 0;
    const byRow = rowsB.map(() => []);
    rowsB.forEach((row, r) => row.forEach((ch, j) => {
      if (ch === ' ') return;
      const x = W / 2 + (j - (row.length - 1) / 2) * k * gk - dx / 2;
      const b0 = { ch, x, y: floorY - (rows - r - 0.5) * k * 1.02, r, order: (rows - 1 - r) * per + j, col: cols[(gi++ + Pm.colOff) % cols.length] };
      blk.push(b0); byRow[r].push(b0);
    }));
    // blank blocks under any overhang so the upper rows always rest on something
    for (let r = 0; r < rows - 1; r++) for (const b0 of byRow[r]) {
      if (byRow[r + 1].some(q => Math.abs(q.x - b0.x) < k * 0.6)) continue;
      const f = { ch: null, shape: 3, x: b0.x, y: floorY - (rows - r - 1.5) * k * 1.02, r: r + 1, order: (rows - 2 - r) * per - 1, col: J.mix(b0.col, sc.bg, 0.35) };
      blk.push(f); byRow[r + 1].push(f);
    }
    if (deco) {
      const cntB = Math.min(per, n);
      const xl = W / 2 - (cntB - 1) / 2 * k * gk - dx / 2 - k * 1.05, xr = W / 2 + (cntB - 1) / 2 * k * gk - dx / 2 + k * 1.05;
      blk.push({ ch: null, shape: 0, x: xl, y: floorY - k * 0.5 * 0.8, sz: 0.8, order: -1, col: cols[(Pm.colOff + 2) % cols.length] });
      blk.push({ ch: null, shape: 1, x: xr, y: floorY - k * 0.5 * 0.8, sz: 0.8, order: n + 1, col: cols[(Pm.colOff + 3) % cols.length] });
      if (rows === 1) blk.push({ ch: null, shape: 2, x: xr + J.rs(s, 1) * k * 0.05, y: floorY - k * 0.8 - k * 0.3, sz: 0.6, order: n + 2, col: cols[(Pm.colOff + 1) % cols.length] });
    }
    const gap = J.clamp(cut.dur * 0.3 / (n + 2), 0.035, 0.1), fd = 0.3;
    let bb = null;
    // hop on the beat (or every 0.6 s)
    let hopI = -1, hopF = 0;
    if (Pm.hop && lt > 0.3 + (n + 2) * gap + fd) {
      if (env.beat && env.beat.len > 0.2) { hopI = J.h(s, env.beat.index, 4) % n; hopF = env.beat.since / 0.32; }
      else { const P0 = 0.65, kk = Math.floor(env.ltb / P0); hopI = J.h(s, kk, 4) % n; hopF = (env.ltb - kk * P0) / 0.32; }
    }
    const sorted = blk.slice().sort((a, b) => (b.y - a.y) || (Pm.side > 0 ? a.x - b.x : b.x - a.x));
    for (const b of sorted) {
      const kz = k * (b.sz || 1);
      const t1 = 0.06 + (b.order + 1) * gap;
      const f = (lt - t1) / fd;
      if (f < 0) continue;
      let y = b.y, sq = 1;
      if (f < 1) y = J.lerp(-kz * 2 - (H - b.y) * 0.2, b.y, E.inQuad(f));
      else { const tau = (f - 1) * fd; y = b.y - kz * 0.1 * Math.abs(Math.sin(tau * 14)) * Math.exp(-tau / 0.1); sq = 1 - 0.1 * Math.exp(-tau / 0.05); }
      const bi = blk.indexOf(b);
      if (bi === hopI && hopF < 1) y -= kz * 0.16 * Math.sin(Math.PI * J.clamp(hopF));
      y += E.inQuad(J.clamp(env.pOut * 1.4 - (b.order + 1) / (n + 3) * 0.4)) * H * 0.7;
      const rot = Pm.tilt && b.r === 0 && rows > 1 ? J.rs(s, bi, 3) * 3 : 0;
      ctx.save(); ctx.translate(b.x, y + kz / 2); ctx.rotate(rot * J.DEG); ctx.scale(1, sq); ctx.translate(0, -kz / 2);
      const hk = kz / 2, ddx = dx * (b.sz || 1), ddy = dy * (b.sz || 1);
      const top = shade(sc, b.col, 0.28), side = shade(sc, b.col, -0.3);
      env.poly([[-hk, -hk], [hk, -hk], [hk + ddx, -hk + ddy], [-hk + ddx, -hk + ddy]].map(p => Pm.side > 0 ? p : p), top, out, false);
      env.poly(Pm.side > 0 ? [[hk, -hk], [hk + ddx, -hk + ddy], [hk + ddx, hk + ddy], [hk, hk]] : [[-hk, -hk], [-hk + ddx, -hk + ddy], [-hk + ddx, hk + ddy], [-hk, hk]], side, out, false);
      env.rect(-hk, -hk, kz, kz, b.col, out, gIn(env));
      env.rrect(-hk + kz * 0.08, -hk + kz * 0.08, kz * 0.84, kz * 0.84, kz * 0.06, null, out, false, J.mix(b.col, onCol(sc, b.col), 0.35), lw * 1.5);
      if (b.ch == null) {
        const tcol = J.mix(b.col, onCol(sc, b.col), 0.8), q = kz * 0.26;
        if (b.shape === 3) { /* plain support block */ }
        else if (b.shape === 0) env.circle(0, 0, q, tcol, null, 0, out, false);
        else if (b.shape === 1) env.poly([[0, -q * 1.1], [q * 1.05, q * 0.8], [-q * 1.05, q * 0.8]], tcol, out, false);
        else env.poly([[0, -q], [q, 0], [0, q], [-q, 0]], tcol, out, false);
      }
      ctx.restore();
      if (b.ch != null) {
        const m = [Math.cos(rot * J.DEG), Math.sin(rot * J.DEG), -Math.sin(rot * J.DEG) * sq, Math.cos(rot * J.DEG) * sq, b.x, y + kz / 2];
        bb = UB(bb, drawAff(env, { text: b.ch, font: Pm.font, size: kz * 0.6, x: 0, y: -kz / 2, color: onCol(sc, b.col), noHold: plateHold(env), mi: miAt(env, t1) }, m));
      }
    }
    return bb;
  },
});

/* ================================================================== 10 balloons — 文字風船 */
reg('balloons', {
  name: '文字風船', tags: ['pop', 'emotional', 'calm'], w: 0.8, treat: false, ae: 'scatter', fits: n => n >= 1 && n <= 14,
  enterBias: { cut: 1.8, pop: 1.5, drop: 0.6, blur: 0.8, slice: 0.2, wipe: 0.2, assemble: 0.3 },
  plan(rng, cut, st) {
    return { font: rng.pick(fontsOf(st, ['display'])), tie: rng.pick(['bunch', 'bunch', 'free']), arc: rng.range(0.02, 0.06), colOff: rng.int(0, 4), mono: rng.chance(0.3) };
  },
  render(env) {
    const { W, H, sc } = env, cut = env.cut, Pm = cut.params, s = cut.seed, u = U(env), lt = env.lt;
    const port = isPort(env);
    const t0 = flat(cut.text), n = J.glyphCount(t0);
    if (!n) return null;
    const rowsT = n > (port ? 4 : 7) ? chunksK(t0, port ? Math.ceil(n / 4) : 2) : [t0];
    const nR = rowsT.length;
    const out = tout(env), mot = env.fx.motion ?? 0.7;
    let size = Math.min(u * 0.26, H * 0.56 / (nR * 1.25 + 0.3));
    for (const r of rowsT) { let a = 0; for (const ch of r) a += adv(Pm.font, ch) * 1.2; size = Math.min(size, W * 0.84 / Math.max(1, a)); }
    const cols = objCols(sc);
    const gx = W / 2, gy = H * 0.93;
    const fly = E.inCubic(env.pOut) * H * 0.9;
    const glyphs = [];
    rowsT.forEach((row, ri) => {
      const chars = [...row], ads = chars.map(ch => adv(Pm.font, ch) * size * 1.2), tot = ads.reduce((a, b) => a + b, 0);
      let x = W / 2 - tot / 2;
      const yRow = H * (nR > 1 ? 0.4 : 0.4) + (ri - (nR - 1) / 2) * size * 1.3;
      chars.forEach((ch, i) => {
        const cxp = x + ads[i] / 2; x += ads[i];
        if (ch === ' ') return;
        const q = glyphs.length;
        const ph = J.r(s, q, 1) * J.TAU;
        const u0 = tot > 0 ? (cxp - W / 2) / (tot / 2) : 0;
        const t1 = 0.05 + q * J.clamp(cut.dur * 0.3 / n, 0.03, 0.08);
        const e = J.clamp((lt - t1) / 0.45);
        const bob = Math.sin(env.ltb * 1.4 + ph) * size * 0.05 * (0.4 + mot);
        const y = yRow - Pm.arc * H * (1 - u0 * u0) + bob + (1 - E.outCubic(e)) * H * 0.35 - fly * (0.8 + 0.4 * J.r(s, q, 2));
        glyphs.push({ ch, x: cxp + Math.sin(env.ltb * 0.9 + ph) * size * 0.03, y, rot: Math.sin(env.ltb * 0.8 + ph * 1.3) * 5 * (0.4 + mot) + J.rs(s, q, 3) * 4, e, t1, col: Pm.mono ? cols[Pm.colOff % cols.length] : cols[(q + Pm.colOff) % cols.length], q });
      });
    });
    // strings (behind the balloons)
    const lw = Math.max(1, u * 0.0016);
    for (const g of glyphs) {
      if (g.e <= 0) continue;
      const bx = g.x - Math.sin(g.rot * J.DEG) * size * 0.58, by = g.y + Math.cos(g.rot * J.DEG) * size * 0.58;
      const pts = [];
      const ex = Pm.tie === 'bunch' ? gx + (g.x - gx) * 0.06 : bx + Math.sin(env.ltb * 1.1 + g.q) * size * 0.2, ey = Pm.tie === 'bunch' ? gy - fly : Math.min(H * 1.05, by + H * 0.3);
      for (let k = 0; k <= 10; k++) {
        const f = k / 10, wig = Math.sin(f * 7 + env.ltb * 2 + g.q) * size * 0.05 * f * (1 - f) * 4;
        pts.push([J.lerp(bx, ex, f) + wig, J.lerp(by, ey, f) + Math.sin(f * Math.PI) * size * 0.25]);
      }
      env.line(pts, sc.sub, lw, 0.85 * out * g.e, false);
      env.poly([[bx - size * 0.05, by + size * 0.07], [bx + size * 0.05, by + size * 0.07], [bx, by - size * 0.02]], shade(sc, g.col, -0.35), out * g.e, false);
    }
    if (Pm.tie === 'bunch') env.circle(gx, gy - fly, size * 0.05, sc.sub, null, 0, out * tin(env, 0.2, 0.3), false);
    let bb = null;
    for (const g of glyphs) {
      if (g.e <= 0) continue;
      const q = E.outBack(g.e, 2.2), sz = size * (0.3 + 0.7 * q);
      const dark = shade(sc, g.col, -0.38);
      // puffy rim, body, gloss
      env.draw({ text: g.ch, font: Pm.font, size: sz, x: g.x, y: g.y, rot: g.rot, color: dark, stroke: sz * 0.13, strokeColor: dark, strokeUnder: true, alpha: out, ghost: false });
      bb = UB(bb, J.mainDraw(env, { text: g.ch, font: Pm.font, size: sz, x: g.x, y: g.y, rot: g.rot, color: g.col, stroke: sz * 0.065, strokeColor: g.col, strokeUnder: true, plain: true, mi: miAt(env, g.t1) }));
      env.draw({ text: g.ch, font: Pm.font, size: sz, x: g.x - sz * 0.02, y: g.y - sz * 0.03, rot: g.rot, color: lightOf(sc), alpha: 0.3 * out * Math.min(1, g.e * 2), ghost: false, charFn: () => ({ clipY: [-0.75, -0.22], s: 0.93 }) });
      env.circle(g.x - sz * 0.22, g.y - sz * 0.26, sz * 0.045, lightOf(sc), null, 0, 0.7 * out * g.e, false);
    }
    return bb;
  },
});

/* ================================================================== 11 magnets — マグネット文字 */
const DECOY = 'ABCDEFGHKMNPRSTXYZ0123456789★♥♪?!';
reg('magnets', {
  name: 'マグネット', tags: ['pop', 'graphic'], w: 0.7, treat: false, busy: true, ae: 'scatter', fits: n => n >= 1 && n <= 14,
  enterBias: { cut: 2.5, pop: 1.3, drop: 0.8, slice: 0.2, wipe: 0.2, stretch: 0.3 },
  plan(rng, cut, st) {
    return { font: rng.pick(fontsOf(st, ['display'])), df: rng.pick(fontsOf(st, ['display', 'body'])), decoys: rng.int(6, 11), handle: rng.pick([1, -1]), colOff: rng.int(0, 4), tilt: rng.range(6, 12) };
  },
  render(env) {
    const { W, H, sc, ctx } = env, cut = env.cut, Pm = cut.params, s = cut.seed, u = U(env), lt = env.lt;
    const port = isPort(env);
    const chs = slotsOf(cut.text), n = chs.filter(c => c !== ' ').length;
    if (!n) return null;
    const out = tout(env);
    const ba = tin(env, 0, 0.45, E.outCubic) * out;
    // the board (fridge door)
    const mx = W * 0.04, my = H * 0.05, bw = W - mx * 2, bh = H - my * 2, rr = u * 0.03;
    const board = J.mix(sc.bg, sc.fg, J.lum(sc.bg) < 0.5 ? 0.07 : 0.06);
    env.rrect(mx, my + (1 - ba) * H * 0.04, bw, bh, rr, board, ba, false, J.mix(sc.bg, sc.fg, 0.16), Math.max(1, u * 0.002));
    if (env.pass === 'main' && ba > 0) {
      const g = ctx.createLinearGradient(mx, my, mx + bw, my + bh);
      g.addColorStop(0, J.rgba(lightOf(sc), 0.06)); g.addColorStop(0.45, J.rgba(lightOf(sc), 0)); g.addColorStop(0.5, J.rgba(lightOf(sc), 0.04)); g.addColorStop(1, J.rgba(lightOf(sc), 0));
      ctx.save(); ctx.globalAlpha = ba; ctx.fillStyle = g; ctx.beginPath(); rrPath(ctx, mx, my + (1 - ba) * H * 0.04, bw, bh, rr); ctx.fill(); ctx.restore();
    }
    const hx = Pm.handle > 0 ? mx + bw - u * 0.05 : mx + u * 0.035, hh = bh * 0.34;
    env.rrect(hx, H / 2 - hh / 2, u * 0.016, hh, u * 0.008, J.mix(board, sc.fg, 0.2), ba, false);
    // lyric layout in rows
    const per = port ? 4 : 8;
    const rowsT = n > per ? chunksK(flat(cut.text), Math.ceil(n / per)) : [flat(cut.text)];
    const nR = rowsT.length;
    let base = Math.min(u * 0.22, H * 0.56 / (nR * 1.12));
    for (const r of rowsT) { let a = 0; for (const ch of r) a += adv(Pm.font, ch) * (J.isKanji(ch) ? 1 : 0.86) * 1.1; base = Math.min(base, bw * 0.8 / Math.max(1, a)); }
    const cols = objCols(sc);
    const items = [];
    rowsT.forEach((row, ri) => {
      const chars = [...row];
      const ks = chars.map(ch => (J.isKanji(ch) ? 1 : J.isPunct(ch) ? 0.6 : J.isSmallKana(ch) ? 0.7 : 0.86));
      const ads = chars.map((ch, i) => adv(Pm.font, ch) * base * ks[i] * 1.1), tot = ads.reduce((a, b) => a + b, 0);
      let x = W / 2 - tot / 2;
      const y = H / 2 + (ri - (nR - 1) / 2) * base * 1.14;
      chars.forEach((ch, i) => {
        const cx = x + ads[i] / 2; x += ads[i];
        if (ch === ' ') return;
        const q = items.length;
        items.push({ ch, x: cx + J.rs(s, q, 1) * base * 0.04, y: y + J.rs(s, q, 2) * base * 0.08 + base * ks[i] * 0 , size: base * ks[i], rot: J.rs(s, q, 3) * Pm.tilt, col: cols[(q * 7 + Pm.colOff) % cols.length], q });
      });
    });
    // decoy magnets around the edges (never over the lyric band)
    const bandY0 = H / 2 - nR * base * 0.62, bandY1 = H / 2 + nR * base * 0.62;
    if (env.pass === 'main') {
      for (let d = 0; d < Pm.decoys; d++) {
        const ta = 0.05 + d * 0.04, e = J.clamp((lt - ta) / 0.2);
        if (e <= 0) continue;
        const top = d % 2 === 0, half = Math.ceil(Pm.decoys / 2), slot = Math.floor(d / 2);
        const sz = Math.min(base * J.rr(0.36, 0.58, s, d, 14), u * 0.09);
        const y = top ? J.lerp(my + bh * 0.08 + sz * 0.6, Math.max(my + bh * 0.1 + sz * 0.6, bandY0 - sz * 0.8), J.r(s, d, 11)) : J.lerp(Math.min(my + bh * 0.9 - sz * 0.6, bandY1 + sz * 0.8), my + bh * 0.92 - sz * 0.6, J.r(s, d, 11));
        const x = mx + bw * (0.1 + 0.8 * (slot + 0.2 + 0.6 * J.r(s, d, 12)) / half);
        const ch = DECOY[J.h(s, d, 13) % DECOY.length], rot = J.rs(s, d, 15) * 25, col = cols[(d + 2 + Pm.colOff) % cols.length];
        const k = 1 + 0.25 * (1 - E.outCubic(e));
        env.draw({ text: ch, font: Pm.df, size: sz * k, x: x + sz * 0.05, y: y + sz * 0.07, rot, color: darkOf(sc), stroke: sz * 0.08, strokeColor: darkOf(sc), strokeUnder: true, alpha: 0.28 * out * e, ghost: false });
        env.draw({ text: ch, font: Pm.df, size: sz * k, x, y, rot, color: col, stroke: sz * 0.08, strokeColor: col, strokeUnder: true, alpha: 0.85 * out * e, ghost: false });
      }
    }
    let bb = null;
    const gap = J.clamp(cut.dur * 0.32 / n, 0.04, 0.1);
    for (const m of items) {
      const t1 = 0.18 + m.q * gap;
      const f = (lt - t1) / 0.16;
      if (f < 0) continue;
      const snap = f < 1 ? 1.28 - 0.28 * E.inQuad(f) : 1 - 0.05 * Math.exp(-(f - 1) * 0.16 / 0.05) * Math.cos((f - 1) * 3);
      const lift = f < 1 ? 1 - f : 0;
      const sz = m.size * snap;
      env.draw({ text: m.ch, font: Pm.font, size: sz, x: m.x + m.size * (0.04 + lift * 0.12), y: m.y + m.size * (0.06 + lift * 0.18), rot: m.rot, color: darkOf(sc), stroke: sz * 0.08, strokeColor: darkOf(sc), strokeUnder: true, alpha: (0.3 - lift * 0.15) * out, ghost: false });
      bb = UB(bb, J.mainDraw(env, { text: m.ch, font: Pm.font, size: sz, x: m.x, y: m.y, rot: m.rot, color: m.col, stroke: sz * 0.08, strokeColor: m.col, strokeUnder: true, plain: true, mi: miAt(env, t1) }));
    }
    return bb;
  },
});

/* ================================================================== 12 tiles — 文字タイル */
const LPTS = { A: 1, B: 3, C: 3, D: 2, E: 1, F: 4, G: 2, H: 4, I: 1, J: 8, K: 5, L: 1, M: 3, N: 1, O: 1, P: 3, Q: 10, R: 1, S: 1, T: 1, U: 1, V: 4, W: 4, X: 8, Y: 4, Z: 10 };
const tilePts = ch => { const up = ch.toUpperCase(); if (LPTS[up]) return LPTS[up]; if (J.isKanji(ch)) return 3 + (J.sid(ch) % 8); if (J.isSmallKana(ch)) return 5; if (J.isPunct(ch)) return 0; if (J.isKata(ch)) return 2 + (J.sid(ch) % 2); return 1 + (J.sid(ch) % 3); };
reg('tiles', {
  name: '文字タイル', tags: ['pop', 'editorial', 'graphic'], w: 0.7, treat: 'safe', portrait: 0.7, ae: 'labels', fits: n => n >= 1 && n <= 14,
  enterBias: { cut: 3, pop: 0.8, blur: 0.4, slice: 0.2, wipe: 0.2, stretch: 0.2 },
  plan(rng, cut, st) {
    return { font: rng.pick(fontsOf(st, ['display', 'serif'])), from: rng.pick(['right', 'right', 'drop']), rack: rng.pick(['accent', 'ink', 'sub']), score: rng.chance(0.75) };
  },
  render(env) {
    const { W, H, sc } = env, cut = env.cut, Pm = cut.params, s = cut.seed, u = U(env), lt = env.lt;
    const n = J.glyphCount(cut.text);
    if (!n) return null;
    const port = isPort(env);
    const rowsT = rowsOf(cut.text, port ? 5 : 9);
    const rows = rowsT.length, per = Math.max(...rowsT.map(r => r.length));
    const k = Math.min(W * 0.84 / (per * 1.08 + 0.6), H * 0.62 / (rows * 1.75), u * 0.2);
    const out = tout(env);
    const tileC = J.mix(lightOf(sc), sc.accent, 0.1), tileT = darkOf(sc);
    const edge = J.mix(tileC, darkOf(sc), 0.3), hi = J.mix(tileC, '#FFFFFF', 0.35);
    const rackC = plateCol(sc, Pm.rack === 'accent' ? [sc.accent, sc.ink] : Pm.rack === 'sub' ? [sc.sub, sc.ink] : [sc.ink, sc.accent]);
    const gap = J.clamp(cut.dur * 0.36 / n, 0.05, 0.12), fd = 0.28;
    let bb = null, score = 0, total = 0;
    const ra = tin(env, 0, 0.4, E.outCubic) * out;
    let gi = 0;
    for (let r = 0; r < rows; r++) {
      const row = rowsT[r], cnt = row.length;
      const rowY = H / 2 + (r - (rows - 1) / 2) * k * 1.75;
      const rw = cnt * k * 1.08 + k * 0.5;
      // rack: back slot + slanted front lip + shadow
      const ry = rowY + k * 0.42;
      const rw2 = rw * (0.3 + 0.7 * ra);
      env.poly([[W / 2 - rw2 / 2 + k * 0.06, ry + k * 0.34], [W / 2 + rw2 / 2 + k * 0.06, ry + k * 0.34], [W / 2 + rw2 / 2 + k * 0.2, ry + k * 0.42], [W / 2 - rw2 / 2 + k * 0.2, ry + k * 0.42]], darkOf(sc), 0.25 * ra, false);
      env.rect(W / 2 - rw2 / 2, ry - k * 0.12, rw2, k * 0.14, shade(sc, rackC, -0.3), ra, false);
      for (let j = 0; j < cnt; j++) {
        const ch = row[j];
        if (ch === ' ') continue;
        const i = gi++, pts = tilePts(ch);
        total += pts;
        const x = W / 2 + (j - (cnt - 1) / 2) * k * 1.08, y = rowY;
        const t1 = 0.12 + i * gap;
        const f = J.clamp((lt - t1) / fd);
        if (f <= 0) continue;
        if (f >= 1) score += pts;
        const e = E.outCubic(f);
        let tx = x, ty = y, rot = 0;
        if (Pm.from === 'drop') { ty = J.lerp(y - H * 0.5, y, E.inQuad(f)); rot = (1 - f) * J.rs(s, i, 2) * 30; if (f >= 1) ty -= k * 0.06 * Math.abs(Math.sin((lt - t1 - fd) * 18)) * Math.exp(-(lt - t1 - fd) / 0.08); }
        else { tx = J.lerp(W + k, x, e); rot = (1 - e) * 10 + (f < 1 ? 0 : 0); ty = y - Math.sin(Math.PI * f) * k * 0.15; }
        // exit: slide out to the left, staggered
        const po = E.inCubic(J.clamp(env.pOut * 1.4 - j / Math.max(1, cnt) * 0.4));
        tx -= po * (x + k * 2 - (-k)) ;
        const lean = -k * 0.05;
        const ctx = env.ctx;
        ctx.save(); ctx.translate(tx, ty); ctx.rotate(rot * J.DEG);
        env.rrect(-k / 2 + k * 0.03, -k / 2 + k * 0.06 + lean, k, k, k * 0.1, edge, out, false);
        env.rrect(-k / 2, -k / 2 + lean, k, k, k * 0.1, tileC, out, gIn(env));
        env.line([[-k / 2 + k * 0.12, -k / 2 + k * 0.05 + lean], [k / 2 - k * 0.12, -k / 2 + k * 0.05 + lean]], hi, Math.max(1, k * 0.025), 0.7 * out, false);
        if (pts > 0) env.draw({ text: String(pts), font: monoF(env), size: k * 0.17, x: k * 0.35, y: k * 0.33 + lean, color: tileT, alpha: 0.85 * out, ghost: false });
        ctx.restore();
        const m = [Math.cos(rot * J.DEG), Math.sin(rot * J.DEG), -Math.sin(rot * J.DEG), Math.cos(rot * J.DEG), tx, ty + lean];
        bb = UB(bb, drawAff(env, { text: ch, font: Pm.font, size: k * 0.6, x: -k * 0.06, y: -k * 0.05, color: tileT, noHold: plateHold(env), mi: miAt(env, t1) }, m));
      }
      env.poly([[W / 2 - rw2 / 2, ry + k * 0.02], [W / 2 + rw2 / 2, ry + k * 0.02], [W / 2 + rw2 / 2 - k * 0.06, ry + k * 0.34], [W / 2 - rw2 / 2 + k * 0.06, ry + k * 0.34]], rackC, ra, gIn(env));
      env.line([[W / 2 - rw2 / 2, ry + k * 0.02], [W / 2 + rw2 / 2, ry + k * 0.02]], shade(sc, rackC, 0.3), Math.max(1, k * 0.02), ra, false);
    }
    if (Pm.score && env.pass === 'main') {
      const fs = Math.max(smallSize(env), k * 0.16);
      const lastY = H / 2 + ((rows - 1) - (rows - 1) / 2) * k * 1.75 + k * 0.42 + k * 0.34;
      const a = tin(env, 0.2, 0.3, E.outCubic) * out;
      env.draw({ text: 'SCORE', font: monoF(env), size: fs, track: 0.3, align: 'left', x: W / 2 - Math.min(per, n) * k * 0.54 - k * 0.25, y: lastY + fs * 1.6, color: sc.sub, alpha: a, ghost: false });
      env.draw({ text: String(score).padStart(3, '0'), font: monoF(env), size: fs * 1.5, track: 0.1, align: 'right', x: W / 2 + Math.min(per, n) * k * 0.54 + k * 0.25, y: lastY + fs * 1.6, color: score >= total && total > 0 ? sc.accent : sc.fg, alpha: a, ghost: false });
    }
    return bb;
  },
});

/* resample a closed polygon outline at a fixed spacing */
const resample = (pts, d, maxN = 160) => {
  const seg = []; let L = 0;
  for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length], l = Math.hypot(b[0] - a[0], b[1] - a[1]); seg.push(l); L += l; }
  const N = Math.max(4, Math.min(maxN, Math.round(L / d))), step = L / N, out = [];
  let si = 0, acc = 0;
  for (let k = 0; k < N; k++) {
    const t = k * step;
    while (si < seg.length - 1 && acc + seg[si] < t) { acc += seg[si]; si++; }
    const a = pts[si], b = pts[(si + 1) % pts.length], f = seg[si] > 0 ? (t - acc) / seg[si] : 0;
    out.push([J.lerp(a[0], b[0], f), J.lerp(a[1], b[1], f)]);
  }
  return out;
};
const rrPts = (x, y, w, h, r, nc = 5) => {
  r = Math.min(r, w / 2, h / 2);
  const out = [], C = [[x + w - r, y + r, -90], [x + w - r, y + h - r, 0], [x + r, y + h - r, 90], [x + r, y + r, 180]];
  for (const [cx, cy, a0] of C) for (let i = 0; i <= nc; i++) { const a = (a0 + 90 * i / nc) * J.DEG; out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
  return out;
};

/* ================================================================== 13 bulbs — 電球サイン */
reg('bulbs', {
  name: '電球サイン', tags: ['pop', 'emotional', 'graphic'], w: 0.8, treat: 'safe', emph: 1.3, ae: 'center', fits: n => n >= 1 && n <= 14,
  enterBias: { cut: 1.8, flicker: 1.6, pop: 1.2, blur: 0.6, slice: 0.3, wipe: 0.4 },
  plan(rng, cut, st) {
    return { font: rng.pick(fontsOf(st, ['display'])), shape: rng.pick(['board', 'board', 'arrow', 'double']), chase: rng.pick(['chase', 'chase', 'alt', 'wave']), dir: rng.pick([1, -1]), sub: rng.chance(0.6) };
  },
  render(env) {
    const { W, H, sc, ctx } = env, cut = env.cut, Pm = cut.params, s = cut.seed, u = U(env), lt = env.lt;
    const port = isPort(env);
    const text = brk(cut.text, port ? 5 : 8);
    const o = { track: 0.06, lead: 1.12 };
    const arrow = Pm.shape === 'arrow' && !port;
    const maxW = W * (arrow ? 0.62 : 0.72), maxH = H * (port ? 0.36 : 0.42);
    const m100 = J.measure(Object.assign({ text, font: Pm.font, size: 100 }, o));
    const subT = Pm.sub ? altCopy(env) : null;
    const size = Math.min(J.fitSize(text, Pm.font, maxW, maxH, o), u * 0.24, W * (arrow ? 0.8 : 0.9) / (m100.w / 100 + 1.5), H * 0.8 / (m100.h / 100 + 1.24 + (subT ? 0.3 : 0)));
    const m = J.measure(Object.assign({ text, font: Pm.font, size }, o));
    const ss = Math.max(smallSize(env), size * 0.16);
    const padX = size * 0.75, padY = size * 0.62;
    const bw = m.w + padX * 2, bh = m.h + padY * 2 + (subT ? ss * 1.8 : 0);
    const ax = arrow ? bh * 0.42 * Pm.dir : 0;
    const cx = W / 2 - ax / 2, cy = H / 2;
    const x0 = cx - bw / 2, y0 = cy - bh / 2;
    const out = tout(env);
    const q = E.outBack(J.clamp(lt / 0.35), 1.4) * (1 - 0.1 * E.inCubic(env.pOut));
    const dark = J.lum(sc.bg) < 0.4;
    const board = dark ? J.mix(sc.bg, sc.fg, 0.1) : darkOf(sc);
    const bulbC = [sc.accent, lightOf(sc), sc.accent2].find(c => c && J.contrast(c, board) >= 2) || lightOf(sc);
    const textC = [lightOf(sc), sc.fg, sc.accent].find(c => J.contrast(c, board) >= 3) || onCol(sc, board);
    // outline of the sign
    let shape;
    if (arrow) {
      const tip = Pm.dir > 0 ? [x0 + bw + bh * 0.5, cy] : [x0 - bh * 0.5, cy];
      shape = Pm.dir > 0 ? [[x0, y0], [x0 + bw, y0], [x0 + bw, y0 - bh * 0.12], tip, [x0 + bw, y0 + bh * 1.12], [x0 + bw, y0 + bh], [x0, y0 + bh]]
        : [[x0 + bw, y0], [x0, y0], [x0, y0 - bh * 0.12], tip, [x0, y0 + bh * 1.12], [x0, y0 + bh], [x0 + bw, y0 + bh]];
    } else shape = rrPts(x0, y0, bw, bh, size * 0.3);
    const sp = shape.map(([x, y]) => [cx + (x - cx) * q, cy + (y - cy) * q]);
    if (q <= 0.01 || out <= 0) return null;
    env.poly(sp.map(([x, y]) => [x + u * 0.012, y + u * 0.016]), darkOf(sc), 0.3 * out, false);
    env.poly(sp, board, out, gIn(env));
    outline(env, sp, J.mix(board, bulbC, 0.35), Math.max(1.5, u * 0.003), out);
    // bulbs round the rim (and an inner ring for 'double')
    const r = J.clamp(size * 0.075, 4, u * 0.022);
    const inset = (k) => { if (arrow) return sp.map(([x, y]) => [cx + (x - cx) * k, cy + (y - cy) * k]); const d = size * 0.3 * (1 - k); return rrPts(x0 + d, y0 + d * (bh / bw), bw - d * 2, bh - d * 2 * (bh / bw), size * 0.3 * k).map(([x, y]) => [cx + (x - cx) * q, cy + (y - cy) * q]); };
    const rings = Pm.shape === 'double' && !arrow ? [0.95, 0.86] : [arrow ? 0.93 : 0.95];
    const beatFlash = env.beat && env.beat.since < 0.12 ? 1 : 0;
    const step = Math.floor(env.ltb * 9);
    rings.forEach((k, ri) => {
      const pts = resample(inset(k), r * 3.3, 140);
      const N = pts.length;
      pts.forEach((p, i) => {
        const on0 = (i / N) < E.inOutCubic(J.clamp((lt - 0.1 - ri * 0.1) / 0.6)) && (i / N) >= E.inCubic(env.pOut);
        let lit = 0;
        if (on0) {
          const j = (i * Pm.dir + N * 4) % N;
          if (Pm.chase === 'chase') lit = ((j + (ri ? 0 : 1) - step + 300 * 3) % 3) === 0 ? 1 : 0.18;
          else if (Pm.chase === 'alt') lit = ((i + Math.floor(env.ltb * 3) + ri) % 2) ? 1 : 0.2;
          else lit = 0.2 + 0.8 * Math.pow(0.5 + 0.5 * Math.sin(i / N * J.TAU * 3 - env.ltb * 5 * Pm.dir + ri), 2);
          lit = Math.max(lit, beatFlash);
        }
        const col = ri ? (J.contrast(sc.accent2 || bulbC, board) > 2 ? (sc.accent2 || bulbC) : bulbC) : bulbC;
        if (lit > 0.5) env.circle(p[0], p[1], r * 2.1, col, null, 0, 0.16 * lit * out, false);
        env.circle(p[0], p[1], r, lit > 0 ? J.mix(J.mix(board, col, 0.3), col, lit) : J.mix(board, col, 0.22), null, 0, out, false);
        if (lit > 0.5) env.circle(p[0] - r * 0.25, p[1] - r * 0.3, r * 0.35, '#FFFFFF', null, 0, 0.7 * lit * out, false);
      });
    });
    const ty = cy - (subT ? ss * 0.9 : 0);
    const bb = J.mainDraw(env, Object.assign({ text, font: Pm.font, size: size * Math.min(1, q), x: cx, y: ty, color: textC, noHold: plateHold(env) }, o));
    if (subT) {
      const fs = ss * Math.min(1, q);
      const t = subT.length > 28 ? subT.slice(0, 27) + '…' : subT;
      const sz = Math.min(fs, J.fitSize(t, bodyF(env), bw - padX, ss * 1.2, { track: 0.18 }));
      env.draw({ text: t, font: bodyF(env), size: sz, x: cx, y: cy + m.h / 2 + padY * 0.1, track: 0.18, color: bulbC, alpha: tin(env, 0.3, 0.3) * out, ghost: false });
    }
    return bb;
  },
});

/* ================================================================== 14 ledScroll — 電光掲示板 */
const _ledTiles = new Map();
const ledTile = (kind, col, bg, T) => {
  const key = kind + col + bg + T;
  let cv = _ledTiles.get(key);
  if (!cv) {
    cv = document.createElement('canvas'); cv.width = cv.height = T;
    const x = cv.getContext('2d');
    if (kind === 'mask') { x.fillStyle = bg; x.fillRect(0, 0, T, T); x.globalCompositeOperation = 'destination-out'; x.beginPath(); x.arc(T / 2, T / 2, T * 0.37, 0, J.TAU); x.fill(); }
    else { x.fillStyle = col; x.beginPath(); x.arc(T / 2, T / 2, T * 0.33, 0, J.TAU); x.fill(); }
    if (_ledTiles.size > 40) _ledTiles.clear();
    _ledTiles.set(key, cv);
  }
  return cv;
};
reg('ledScroll', {
  name: '電光掲示板', tags: ['pop', 'graphic', 'glitch'], w: 0.8, treat: false, portrait: 1.1, ae: 'marquee', fits: n => n >= 1 && n <= 24,
  enterBias: { cut: 4, flicker: 0.8, type: 0.4, blur: 0.2, slice: 0.1, wipe: 0.2, assemble: 0.1, scramble: 0.3 },
  plan(rng, cut, st) {
    return { font: rng.pick(['dot', 'dot', ...fontsOf(st, ['display', 'body'])]), col: rng.pick(['accent', 'accent', 'fg', 'accent2']), info: rng.pick(['top', 'bottom', 'none', 'bottom']), mods: rng.int(3, 6), y: rng.pick([0.5, 0.5, 0.42, 0.58]) };
  },
  render(env) {
    const { W, H, sc, ctx } = env, cut = env.cut, Pm = cut.params, u = U(env), lt = env.lt;
    const text = flat(cut.text);
    const n = J.glyphCount(text);
    if (!n) return null;
    const out = tout(env);
    const fx0 = W * 0.03, fw = W * 0.94;
    const adv0 = J.measure({ text, font: Pm.font, size: 100, track: 0.08 }).w / 100;
    const size = J.clamp((fw - W * 0.04) * 0.9 / Math.max(0.5, adv0), u * 0.1, Math.min(u * 0.2, H * 0.2));
    const p = size / 9.5;
    const ph = size * 1.36, infoH = Pm.info === 'none' ? 0 : size * 0.56;
    const fr = size * 0.2;
    const fh = ph + infoH + fr * 2 + (infoH ? fr * 0.6 : 0);
    const fy0 = H * Pm.y - fh / 2;
    const e = E.outCubic(J.clamp(lt / 0.35));
    const frameC = J.mix(darkOf(sc), sc.sub, J.lum(sc.bg) < 0.4 ? 0.25 : 0.2), panel = J.mix(darkOf(sc), '#000000', 0.5);
    const ledC = [Pm.col === 'fg' ? lightOf(sc) : Pm.col === 'accent2' ? sc.accent2 : sc.accent, sc.accent, lightOf(sc)].find(c => c && J.contrast(c, panel) >= 3) || '#FFFFFF';
    const infoC = [sc.accent2, sc.accent, lightOf(sc)].find(c => c && c !== ledC && J.contrast(c, panel) >= 3) || lightOf(sc);
    const hw = fw / 2 * e;
    env.rrect(W / 2 - hw, fy0, hw * 2, fh, fr * 0.6, frameC, out, false);
    if (e < 0.05) return null;
    // module seams + bolts
    const mods = Pm.mods, mw = fw / mods;
    for (let i = 1; i < mods; i++) { const x = fx0 + i * mw; if (Math.abs(x - W / 2) < hw) env.rect(x - 1, fy0, 2, fh, J.mix(frameC, '#000000', 0.35), out, false); }
    for (let i = 0; i < mods; i++) for (const yy of [fy0 + fr * 0.5, fy0 + fh - fr * 0.5]) for (const xx of [fx0 + i * mw + fr * 0.6, fx0 + (i + 1) * mw - fr * 0.6]) if (Math.abs(xx - W / 2) < hw) env.circle(xx, yy, fr * 0.14, J.mix(frameC, lightOf(sc), 0.3), null, 0, out, false);
    const panels = [];
    const mainY = Pm.info === 'top' ? fy0 + fr + infoH + fr * 0.6 : fy0 + fr;
    panels.push({ x: W / 2 - hw + fr, y: mainY, w: hw * 2 - fr * 2, h: ph });
    if (infoH) panels.push({ x: W / 2 - hw + fr, y: Pm.info === 'top' ? fy0 + fr : mainY + ph + fr * 0.6, w: hw * 2 - fr * 2, h: infoH });
    const snap = (v, q) => Math.round(v / q) * q;
    const T = Math.max(3, Math.round(p * (env.scale || 1)));
    const pat = (kind, col, bg, x0, y0) => { const pt = ctx.createPattern(ledTile(kind, col, bg, T), 'repeat'); try { pt.setTransform(new DOMMatrix().translate(x0, y0).scale(p / T)); } catch (err) { return null; } return pt; };
    let bb = null;
    panels.forEach((P0, pi) => {
      if (P0.w <= 2) return;
      const gx = P0.x, gy = P0.y;
      env.rect(P0.x, P0.y, P0.w, P0.h, panel, out, false);
      if (env.pass === 'main') { const pt = pat('dot', J.mix(panel, pi ? infoC : ledC, 0.13), '', gx, gy); if (pt) { ctx.save(); ctx.globalAlpha = out; ctx.fillStyle = pt; ctx.fillRect(P0.x, P0.y, P0.w, P0.h); ctx.restore(); } }
      ctx.save(); ctx.beginPath(); ctx.rect(P0.x, P0.y, P0.w, P0.h); ctx.clip();
      if (pi === 0) {
        const m = J.measure({ text, font: Pm.font, size, track: 0.08 });
        const fits = m.w <= P0.w * 0.94;
        const cyy = P0.y + P0.h / 2;
        if (fits) {
          const tIn = J.clamp(cut.dur * 0.28, 0.35, 0.9), tOut = Math.max(0.2, cut.outDur || 0.3);
          const a = E.outCubic(J.clamp(lt / tIn)), b = E.inCubic(J.clamp((lt - (cut.dur - tOut)) / tOut));
          const x = J.lerp(P0.x + P0.w + m.w / 2, W / 2, a) - b * (W / 2 - P0.x + m.w / 2);
          bb = J.mainDraw(env, { text, font: Pm.font, size, x: snap(x, p), y: cyy, track: 0.08, color: ledC, plain: true, noHold: true });
        } else {
          const per = m.w + size * 2, v = Math.max(W * 0.35, per / Math.max(0.8, cut.dur * 0.9));
          const off = P0.x + P0.w - ((env.ltb * v) % per) - (lt < per / v ? 0 : 0);
          for (let k = 0; k < 3; k++) {
            const x = off + m.w / 2 + k * per - (lt > 0 ? 0 : 0);
            if (x - m.w / 2 > P0.x + P0.w || x + m.w / 2 < P0.x) continue;
            const r = J.mainDraw(env, { text, font: Pm.font, size, x: snap(x, p), y: cyy, track: 0.08, color: ledC, plain: true, noHold: true, mi: 0 });
            bb = bb || r;
          }
        }
      } else if (env.pass === 'main') {
        const ac = altCopy(env), info = `LINE ${lineNo(env)}  ◆  ${J.fmtTime(cut.start)}${/^No\./.test(ac) ? '' : '  ◆  ' + ac}   ◆   `;
        const fs = P0.h * 0.72, im = J.measure({ text: info, font: Pm.font, size: fs, track: 0.1 });
        const off = ((env.ltb * size * 2.2) % im.w);
        for (let k = 0; k < 4; k++) { const x = snap(P0.x - off + k * im.w, p); if (x > P0.x + P0.w) break; env.draw({ text: info, font: Pm.font, size: fs, align: 'left', x, y: P0.y + P0.h / 2, track: 0.1, color: infoC, alpha: out * tin(env, 0.2, 0.3), ghost: false }); }
      }
      ctx.restore();
      // punch the LED holes (everything between dots back to panel colour)
      if (env.pass === 'main') { const pt = pat('mask', '', panel, gx, gy); if (pt) { ctx.save(); ctx.globalAlpha = out; ctx.fillStyle = pt; ctx.fillRect(P0.x, P0.y, P0.w, P0.h); ctx.restore(); } }
    });
    return bb ? box(Math.max(panels[0].x, bb.x0), panels[0].y, Math.min(panels[0].x + panels[0].w, bb.x1), panels[0].y + panels[0].h) : box(fx0, fy0, fx0 + fw, fy0 + fh);
  },
});

/* ================================================================== 15 billboard — 看板 */
reg('billboard', {
  name: '看板', tags: ['pop', 'emotional', 'graphic'], w: 0.8, treat: 'safe', ae: 'center', fits: n => n >= 1 && n <= 16,
  enterBias: { cut: 1.6, flicker: 1.5, blur: 1, pop: 0.8, slice: 0.4, wipe: 0.6 },
  plan(rng, cut, st) {
    return { font: rng.pick(fontsOf(st, ['display', 'serif'])), face: rng.pick(['light', 'light', 'accent']), lamps: rng.int(3, 4), sweep: rng.range(8, 16), tag: rng.chance(0.7) };
  },
  render(env) {
    const { W, H, sc, ctx } = env, cut = env.cut, Pm = cut.params, s = cut.seed, u = U(env), lt = env.lt;
    const port = isPort(env);
    const text = brk(cut.text, port ? 5 : 9);
    const out = tout(env);
    const bw = W * (port ? 0.86 : 0.72), bh = Math.min(H * (port ? 0.3 : 0.42), bw * 0.5);
    const bx = W / 2 - bw / 2, by = H * (port ? 0.3 : 0.16);
    const groundY = H * 0.94;
    const rise = (1 - E.outCubic(J.clamp(lt / 0.55))) * H * 0.08 + E.inCubic(env.pOut) * H * 0.05;
    const y0 = by + rise;
    const a0 = tin(env, 0, 0.35, E.outCubic) * out;
    const steel = J.mix(darkOf(sc), sc.sub, 0.35);
    const faceC = Pm.face === 'accent' || J.lum(sc.bg) > 0.55 ? (J.lum(sc.bg) > 0.55 ? [sc.accent, sc.ink, sc.fg].find(c => J.contrast(c, sc.bg) >= 1.8) || sc.fg : plateCol(sc, [sc.accent, sc.ink])) : J.mix(lightOf(sc), sc.accent, 0.06);
    const tc = onCol(sc, faceC);
    // posts, bracing, catwalk
    const pw = bw * 0.035;
    for (const px of [bx + bw * 0.22, bx + bw * 0.78]) env.rect(px - pw / 2, y0 + bh, pw, groundY - y0 - bh, steel, a0, false);
    const lw = Math.max(1.2, u * 0.0025);
    const x1 = bx + bw * 0.22, x2 = bx + bw * 0.78, yb = y0 + bh + (groundY - y0 - bh) * 0.25, yb2 = groundY - (groundY - y0 - bh) * 0.1;
    env.line([[x1, yb], [x2, yb2]], steel, lw, a0, false); env.line([[x2, yb], [x1, yb2]], steel, lw, a0, false);
    const cwY = y0 + bh + bh * 0.1;
    env.rect(bx + bw * 0.04, cwY, bw * 0.92, bh * 0.025, steel, a0, false);
    for (let i = 0; i <= 10; i++) env.rect(bx + bw * (0.04 + 0.92 * i / 10) - lw / 2, cwY - bh * 0.07, lw, bh * 0.07, steel, a0 * 0.8, false);
    env.line([[bx + bw * 0.04, cwY - bh * 0.07], [bx + bw * 0.96, cwY - bh * 0.07]], steel, lw, a0 * 0.8, false);
    env.line([[W * 0.03, groundY], [W * 0.97, groundY]], sc.sub, lw, 0.5 * a0, false);
    // board
    env.rect(bx - bw * 0.015, y0 - bw * 0.015, bw * 1.03, bh + bw * 0.03, steel, a0, false);
    env.rect(bx, y0, bw, bh, J.mix(faceC, darkOf(sc), 0.28), a0, gIn(env));
    // lamps: flicker on one by one, cones sweep across the face
    const L = Pm.lamps;
    const lampOn = [];
    for (let i = 0; i < L; i++) {
      const t1 = 0.15 + i * 0.12;
      let on = lt > t1 + 0.25 ? 1 : lt > t1 ? (J.r(s, i, env.step, 7) < 0.55 ? 1 : 0.1) : 0;
      on *= 1 - E.inCubic(J.clamp(env.pOut * 1.6 - i * 0.12));
      lampOn.push(on);
    }
    if (env.pass === 'main') {
      ctx.save(); ctx.beginPath(); ctx.rect(bx, y0, bw, bh); ctx.clip();
      for (let i = 0; i < L; i++) {
        if (lampOn[i] <= 0.01) continue;
        const lx = bx + bw * (i + 0.5) / L, ly = y0 + bh + bh * 0.06;
        const ang = (-90 + Math.sin(env.ltb * 0.8 + i * 1.7) * Pm.sweep) * J.DEG;
        const tx = lx + Math.cos(ang) * bh * 1.25, ty = ly + Math.sin(ang) * bh * 1.25;
        const g = ctx.createRadialGradient(lx, ly, 0, lx, ly, bh * 1.2);
        g.addColorStop(0, J.rgba(faceC, 0.95 * lampOn[i])); g.addColorStop(0.6, J.rgba(faceC, 0.6 * lampOn[i])); g.addColorStop(1, J.rgba(faceC, 0));
        const spread = bw / L * 0.75;
        ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(lx - bw * 0.02, ly); ctx.lineTo(tx - spread, ty); ctx.lineTo(tx + spread, ty); ctx.lineTo(lx + bw * 0.02, ly); ctx.closePath(); ctx.fill();
      }
      const lit = lampOn.reduce((a, b) => a + b, 0) / L;
      ctx.globalAlpha = 0.55 * lit * a0; ctx.fillStyle = faceC; ctx.fillRect(bx, y0, bw, bh);
      ctx.restore();
    }
    // lamp housings
    for (let i = 0; i < L; i++) {
      const lx = bx + bw * (i + 0.5) / L, ly = y0 + bh + bh * 0.06;
      env.line([[lx, cwY], [lx, ly + bh * 0.02]], steel, lw * 1.5, a0, false);
      env.poly([[lx - bh * 0.05, ly + bh * 0.03], [lx + bh * 0.05, ly + bh * 0.03], [lx + bh * 0.035, ly - bh * 0.03], [lx - bh * 0.035, ly - bh * 0.03]], steel, a0, false);
      if (lampOn[i] > 0.5) env.circle(lx, ly - bh * 0.03, bh * 0.025, lightOf(sc), null, 0, a0, false);
    }
    const size = Math.min(J.fitSize(text, Pm.font, bw * 0.84, bh * 0.66, { track: 0.04, lead: 1.1 }), bh * 0.6);
    const bb = J.mainDraw(env, { text, font: Pm.font, size, x: W / 2, y: y0 + bh / 2 + (Pm.tag ? bh * 0.03 : 0), track: 0.04, lead: 1.1, color: tc, noHold: plateHold(env), mi: miAt(env, 0.3) });
    if (Pm.tag) {
      const fs = Math.max(smallSize(env) * 0.8, bh * 0.05);
      env.draw({ text: 'No.' + lineNo(env), font: monoF(env), size: fs, align: 'left', track: 0.2, x: bx + bw * 0.025, y: y0 + fs * 1.1, color: tc, alpha: 0.7 * a0, ghost: false });
      env.draw({ text: J.fmtTime(cut.start), font: monoF(env), size: fs, align: 'right', track: 0.2, x: bx + bw * 0.975, y: y0 + fs * 1.1, color: tc, alpha: 0.7 * a0, ghost: false });
    }
    return bb || box(bx, y0, bx + bw, y0 + bh);
  },
});

/* ================================================================== 16 crowdBubbles — 吹き出しの群れ */
const REACT = ['…', '！？', '♪', '？', '！', '…！', '♡'];
reg('crowdBubbles', {
  name: '吹き出しの群れ', tags: ['pop', 'emotional', 'editorial'], w: 0.8, busy: true, treat: 'safe', ae: 'labels', fits: n => n >= 1 && n <= 16,
  enterBias: { cut: 1.8, pop: 1.6, blur: 0.8, slice: 0.3, wipe: 0.4 },
  plan(rng, cut, st) {
    return { font: rng.pick(fontsOf(st, ['display', 'body'])), sf: rng.pick(fontsOf(st, ['body', 'display'])), big: rng.pick(['round', 'round', 'rect', 'shout']), style: rng.pick(['mixed', 'outline', 'filled']), count: rng.int(10, 16), side: rng.pick([1, -1]) };
  },
  render(env) {
    const { W, H, sc, ctx } = env, cut = env.cut, Pm = cut.params, s = cut.seed, u = U(env), lt = env.lt;
    const port = isPort(env);
    const text = brk(cut.text, port ? 5 : 8);
    const o = { track: 0.03, lead: 1.15 };
    const size = Math.min(J.fitSize(text, Pm.font, W * (port ? 0.62 : 0.46), H * (port ? 0.22 : 0.3), o), u * 0.15);
    const m = J.measure(Object.assign({ text, font: Pm.font, size }, o));
    const out = tout(env);
    const bw = m.w + size * 1.4, bh = m.h + size * 1.1;
    const cx = W / 2, cy = H / 2 - bh * 0.05;
    const bigC = [sc.accent, lightOf(sc)].find(c => J.contrast(c, sc.bg) >= 1.8) || lightOf(sc), tc = onCol(sc, bigC);
    // fragments for the crowd
    const words = [];
    for (const w of J.chunkText(flat(cut.lineText || cut.text)).concat(J.chunkText(flat(cut.text)))) for (const q of J.splitLines(w, 4).split('\n')) if (q && !words.includes(q)) words.push(q);
    const frag = i => { const r = J.h(s, i, 41) % 10; if (r < 6 && words.length) return words[J.h(s, i, 42) % words.length]; return REACT[J.h(s, i, 43) % REACT.length]; };
    // candidate slots around the big bubble
    const slots = [];
    const gxN = port ? 3 : 6, gyN = port ? 8 : 5;
    for (let gy = 0; gy < gyN; gy++) for (let gx = 0; gx < gxN; gx++) {
      const x = W * (0.1 + 0.8 * (gx + 0.5) / gxN) + J.rs(s, gx, gy, 1) * W * 0.04, y = H * (0.1 + 0.8 * (gy + 0.5) / gyN) + J.rs(s, gx, gy, 2) * H * 0.03;
      if (Math.abs(x - cx) < bw * 0.5 + W * (port ? 0.12 : 0.07) && Math.abs(y - cy) < bh * 0.5 + H * (port ? 0.04 : 0.07)) continue;
      slots.push([x, y, J.r(s, gx, gy, 3)]);
    }
    slots.sort((a, b) => a[2] - b[2]);
    const cnt = Math.min(Pm.count, slots.length);
    const ss = Math.max(smallSize(env) * 1.4, Math.min(size * 0.42, u * 0.05));
    const bubble = (x, y, w, h, kind, tailDir, fill, stroke, a, gh) => {
      const pts = kind === 'rect' ? rrPts(x - w / 2, y - h / 2, w, h, h * 0.35, 4) : (() => { const q = []; const N = kind === 'shout' ? 22 : 36; for (let i = 0; i < N; i++) { const t = i / N * J.TAU, rr = kind === 'shout' ? (i % 2 ? 0.8 : 1.12) : 1; q.push([x + Math.cos(t) * w / 2 * rr, y + Math.sin(t) * h / 2 * rr]); } return q; })();
      const tx = x + tailDir * w * 0.18, ty = y + h * 0.42;
      const tail = [[tx - w * 0.06 * tailDir, ty - h * 0.05], [tx + w * 0.02 * tailDir, ty - h * 0.05], [tx - w * 0.1 * tailDir, y + h * 0.5 + h * 0.3]];
      if (fill) { env.poly(pts, fill, a, gh); env.poly(tail, fill, a, gh); }
      if (stroke) { outline(env, pts, stroke, Math.max(1.2, u * 0.0025), a); env.line([tail[0], tail[2], tail[1]], stroke, Math.max(1.2, u * 0.0025), a, false); if (!fill) env.poly(tail, sc.bg, a, false); }
    };
    // the crowd: each bubble lives for a while, pops, and another takes its place
    if (env.pass === 'main') {
      const life = J.clamp(cut.dur * 0.7, 1.2, 3);
      const jx = W * 0.8 / gxN * 0.18, jy = H * 0.8 / gyN * 0.14;
      for (let i = 0; i < cnt; i++) {
        const t0 = 0.05 + J.r(s, i, 5) * Math.min(0.6, cut.dur * 0.25);
        const gen = Math.max(0, Math.floor((env.ltb - t0) / life));
        const tl = env.ltb - t0 - gen * life;
        if (env.ltb < t0) continue;
        const e = E.outBack(J.clamp(tl / 0.22), 2.2) * (1 - E.inCubic(J.clamp((tl - life + 0.2) / 0.2))) * out;
        if (e <= 0.01) continue;
        const sl0 = slots[i], sl = [sl0[0] + J.rs(s, i, gen, 44) * jx, sl0[1] + J.rs(s, i, gen, 45) * jy];
        const t = frag(i * 7 + gen);
        const fs = ss * J.rr(0.8, 1.15, s, i, gen);
        const tm = J.measure({ text: t, font: Pm.sf, size: fs, track: 0.04 });
        const w = (tm.w + fs * 1.4) * e, h = fs * 2 * e;
        const filled = Pm.style === 'filled' || (Pm.style === 'mixed' && J.r(s, i, 9) < 0.45);
        const fcol = filled ? J.mix(sc.bg, sc.fg, 0.14) : null;
        bubble(sl[0], sl[1], w, h, J.r(s, i, gen, 8) < 0.5 ? 'rect' : 'round', sl[0] < cx ? 1 : -1, fcol || sc.bg, filled ? null : sc.sub, 0.95, false);
        if (e > 0.5) env.draw({ text: t, font: Pm.sf, size: fs, track: 0.04, x: sl[0], y: sl[1], color: filled ? sc.fg : sc.sub, alpha: J.clamp((e - 0.5) * 2), ghost: false });
      }
    }
    // the big bubble with the lyric
    const q = E.outBack(J.clamp((lt - 0.05) / 0.3), 1.8) * (1 - 0.2 * E.inCubic(env.pOut));
    const bk = Pm.big;
    bubble(cx, cy, bw * q * (bk === 'shout' ? 1.25 : 1), bh * q * (bk === 'shout' ? 1.3 : 1), bk, Pm.side, bigC, null, out, gIn(env));
    return J.mainDraw(env, Object.assign({ text, font: Pm.font, size: size * Math.min(1, q + 0.2), x: cx, y: cy, color: tc, noHold: plateHold(env), mi: miAt(env, 0.12) }, o));
  },
});

/* ================================================================== 17 crossword — クロスワード */
reg('crossword', {
  name: 'クロスワード', tags: ['editorial', 'graphic', 'pop'], w: 0.7, treat: 'safe', portrait: 0.7, ae: 'type', fits: n => n >= 2 && n <= 16,
  enterBias: { cut: 3, type: 0.6, flicker: 0.6, blur: 0.4, slice: 0.2, wipe: 0.2, stretch: 0.2 },
  plan(rng, cut, st) {
    return { font: rng.pick(fontsOf(st, ['display', 'serif'])), dens: rng.range(0.14, 0.22), fill: rng.int(2, 3), clue: rng.chance(0.8) };
  },
  render(env) {
    const { W, H, sc } = env, cut = env.cut, Pm = cut.params, s = cut.seed, u = U(env), lt = env.lt;
    const port = isPort(env);
    const t0 = flat(cut.text);
    const chs = [...t0].filter(c => c !== ' ');
    const n = chs.length;
    if (!n) return null;
    const maxRow = port ? 7 : 12;
    const words = n > maxRow ? chunksK(t0, Math.ceil(n / maxRow)).map(w => [...w].filter(c => c !== ' ')) : [chs];
    const L = Math.max(...words.map(w => w.length));
    const C = Math.max(L + 2, port ? 7 : 9), R = words.length > 1 ? 7 : port ? 7 : 5;
    const below = Pm.clue && H > W * 0.7, clueW = Pm.clue && !below ? 0.24 : 0;
    const cell = Math.min(W * (0.88 - clueW) / C, H * (below ? 0.64 : 0.8) / R, u * 0.14);
    const gw = C * cell, gh = R * cell;
    const fsC = Math.max(smallSize(env) * 1.15, cell * 0.24);
    const gx = (W - gw - (clueW ? W * clueW : 0)) / 2, gy = (H - gh - (below ? fsC * 5 : 0)) / 2;
    const rowsW = words.length > 1 ? [1, 5] : [Math.floor(R / 2)];
    const c0 = words.map(w => Math.floor((C - w.length) / 2) - (J.h(s, w.length) % 2 && C - w.length > 2 ? 1 : 0));
    // black cells: symmetric scatter that keeps the lyric entries (and their end caps) intact
    const key = (r, c) => r * 64 + c;
    const lyr = new Map();
    words.forEach((w, wi) => w.forEach((ch, j) => lyr.set(key(rowsW[wi], c0[wi] + j), { ch, wi, j })));
    const black = new Set();
    for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
      const r2 = R - 1 - r, c2 = C - 1 - c;
      if (lyr.has(key(r, c)) || lyr.has(key(r2, c2))) continue;
      if (J.r(s, Math.min(key(r, c), key(r2, c2)), 3) < Pm.dens) { black.add(key(r, c)); black.add(key(r2, c2)); }
    }
    words.forEach((w, wi) => { const r = rowsW[wi]; if (c0[wi] > 0) black.add(key(r, c0[wi] - 1)); if (c0[wi] + w.length < C) black.add(key(r, c0[wi] + w.length)); });
    const isW = (r, c) => r >= 0 && c >= 0 && r < R && c < C && !black.has(key(r, c));
    // numbering
    const num = new Map(); let k = 1;
    for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
      if (!isW(r, c)) continue;
      const ac = !isW(r, c - 1) && isW(r, c + 1), dn = !isW(r - 1, c) && isW(r + 1, c);
      if (ac || dn) num.set(key(r, c), k++);
    }
    // pencilled crossing entries (down words through some lyric cells)
    const pool = poolOf(cut), NP = pool.length;
    const pencil = new Map();
    let fills = 0;
    words.forEach((w, wi) => w.forEach((ch, j) => {
      if (fills >= Pm.fill * words.length || J.r(s, wi, j, 5) > 0.45) return;
      const c = c0[wi] + j, r = rowsW[wi];
      let a = r, b = r; while (isW(a - 1, c)) a--; while (isW(b + 1, c)) b++;
      if (b - a < 2) return;
      fills++;
      for (let rr = a; rr <= b; rr++) if (!lyr.has(key(rr, c))) pencil.set(key(rr, c), pool[J.h(s, rr, c, 6) % NP]);
    }));
    const out = tout(env);
    const ga = tin(env, 0, 0.35, E.outCubic) * out;
    const paperC = lightOf(sc), inkC = darkOf(sc);
    const lw = Math.max(1, cell * 0.035);
    env.rect(gx - lw * 2, gy - lw * 2, gw + lw * 4, gh * ga + lw * 4, inkC, out, false);
    env.rect(gx, gy, gw, gh * ga, paperC, out, gIn(env));
    // typing progress
    const T1 = 0.25, per = J.clamp(cut.dur * 0.4 / n, 0.04, 0.11);
    const typed = Math.floor((lt - T1) / per);
    let cur = -1, gi = 0;
    const order = [];
    words.forEach((w, wi) => w.forEach((ch, j) => order.push([wi, j])));
    if (typed >= 0 && typed < n) cur = typed;
    const curWi = cur >= 0 ? order[cur][0] : -1;
    for (let r = 0; r < R; r++) {
      const ra = J.clamp((ga * R - r));
      if (ra <= 0) continue;
      for (let c = 0; c < C; c++) {
        const x = gx + c * cell, y = gy + r * cell;
        const kk = key(r, c);
        if (black.has(kk)) { env.rect(x, y, cell, cell, inkC, ra * out, false); continue; }
        const L0 = lyr.get(kk);
        if (L0 && (L0.wi === curWi || typed >= n)) env.rect(x, y, cell, cell, sc.accent, (L0.wi === curWi ? 0.2 : 0.12) * out, false);
        if (L0 && order[cur] && order[cur][0] === L0.wi && order[cur][1] === L0.j) env.rect(x, y, cell, cell, sc.accent, 0.5 * out, false);
        env.line([[x, y + cell], [x + cell, y + cell]], inkC, lw * 0.6, 0.55 * ra * out, false);
        env.line([[x + cell, y], [x + cell, y + cell]], inkC, lw * 0.6, 0.55 * ra * out, false);
        if (num.has(kk)) env.draw({ text: String(num.get(kk)), font: monoF(env), size: cell * 0.2, align: 'left', x: x + cell * 0.07, y: y + cell * 0.15, color: inkC, alpha: 0.8 * ra * out, ghost: false });
        const pc = pencil.get(kk);
        if (pc) env.draw({ text: pc, font: bodyF(env), size: cell * 0.46, x: x + cell / 2, y: y + cell * 0.56, color: J.mix(paperC, inkC, 0.38), alpha: tin(env, 0.3 + r * 0.03, 0.3) * out, ghost: false });
      }
    }
    let bb = null;
    order.forEach(([wi, j], q) => {
      const ch = words[wi][j];
      const x = gx + (c0[wi] + j + 0.5) * cell, y = gy + (rowsW[wi] + 0.56) * cell;
      bb = UB(bb, J.mainDraw(env, { text: ch, font: Pm.font, size: cell * 0.7, x, y, color: inkC, noHold: plateHold(env), mi: miAt(env, T1 + q * per) }));
    });
    if (Pm.clue) {
      const fs = fsC;
      const cxl = below ? gx : gx + gw + W * 0.035, cyl = below ? gy + gh + fs * 1.6 : gy + fs;
      const a = tin(env, 0.35, 0.4, E.outCubic) * out;
      const n1 = num.get(key(rowsW[0], c0[0])) || 1;
      const lines = [['ヨコのカギ', sc.accent, monoF(env)], [n1 + '  ' + (cut.note || romajiOf(env) || '(' + n + ')'), sc.fg, bodyF(env)], ['タテのカギ', sc.accent, monoF(env)], [(num.size > 3 ? 3 : 2) + '  ─', sc.sub, bodyF(env)]];
      lines.forEach(([t, col, f], i) => {
        const tt = t.length > 22 ? t.slice(0, 21) + '…' : t;
        const yy = below ? cyl + (i % 2) * fs * 1.7 : cyl + i * fs * 1.9 + (i >= 2 ? fs * 0.8 : 0), xx = below && i >= 2 ? cxl + gw * 0.55 : cxl;
        env.draw({ text: tt, font: f, size: fs, align: 'left', x: xx, y: yy, track: 0.08, color: col, alpha: a, ghost: false });
      });
    }
    return bb || box(gx, gy, gx + gw, gy + gh);
  },
});

/* ================================================================== 18 wordSearch — 文字探し */
reg('wordSearch', {
  name: '文字探し', tags: ['pop', 'graphic', 'editorial'], w: 0.7, treat: 'safe', ae: 'tile', fits: n => n >= 2 && n <= 14,
  enterBias: { cut: 3, flicker: 0.8, blur: 0.6, slice: 0.2, wipe: 0.2, stretch: 0.2, assemble: 0.3 },
  plan(rng, cut, st) {
    const port = cut.H > cut.W * 1.08, n = cut.n;
    const dirs = ['h', 'h'];
    if (port && n <= 14) dirs.push('v', 'v', 'v');
    if (n <= 8) dirs.push('d');
    return { font: rng.pick(fontsOf(st, ['display', 'body'])), gf: rng.pick(fontsOf(st, ['body', 'display'])), dir: rng.pick(dirs), decoys: rng.int(1, 3), pad: rng.int(1, 3) };
  },
  render(env) {
    const { W, H, sc, ctx } = env, cut = env.cut, Pm = cut.params, s = cut.seed, u = U(env), lt = env.lt;
    const chs = [...flat(cut.text)].filter(c => c !== ' '), n = chs.length;
    if (!n) return null;
    const port = isPort(env);
    let dir = Pm.dir;
    if (dir === 'v' && n > 14) dir = 'h';
    if (dir === 'd' && n > 9) dir = 'h';
    let C, R;
    if (dir === 'h') { C = n + Pm.pad * 2; R = port ? Math.max(7, Math.round(C * 1.4)) : Math.max(5, Math.round(C * 0.5)); if (port && C > 9) { C = n + 1; } }
    else if (dir === 'v') { R = n + Pm.pad * 2; C = Math.max(5, Math.round(R * (W / H) * 1.1)); }
    else { C = R = n + 2; }
    C = Math.min(C, 18); R = Math.min(R, 18, Math.max(dir === 'v' ? n + 1 : dir === 'd' ? n : 5, Math.floor(150 / C)));
    if (dir === 'v') C = Math.min(C, Math.max(5, Math.floor(150 / R)));
    const cell = Math.min(W * 0.86 / C, H * 0.8 / R, u * 0.16);
    const gx = W / 2 - C * cell / 2, gy = H / 2 - R * cell / 2;
    // lyric path
    let r0, c0, dr = 0, dc = 1;
    if (dir === 'h') { r0 = Math.floor(R / 2) + (J.h(s, 1) % 3) - 1; c0 = Math.floor((C - n) / 2); }
    else if (dir === 'v') { dr = 1; dc = 0; c0 = Math.floor(C / 2) + (J.h(s, 1) % 3) - 1; r0 = Math.floor((R - n) / 2); }
    else { dr = 1; dc = 1; r0 = Math.floor((R - n) / 2); c0 = Math.floor((C - n) / 2); }
    r0 = J.clamp(r0, 0, R - 1 - dr * (n - 1)); c0 = J.clamp(c0, 0, C - 1 - dc * (n - 1));
    const onPath = new Map(); chs.forEach((ch, i) => onPath.set((r0 + dr * i) * 64 + (c0 + dc * i), i));
    const pool = poolOf(cut), NP = pool.length;
    const out = tout(env);
    const ga = tin(env, 0, 0.4, E.outCubic) * out;
    const panelC = J.mix(sc.bg, sc.fg, J.lum(sc.bg) < 0.5 ? 0.06 : 0.05);
    env.rrect(gx - cell * 0.35, gy - cell * 0.35, C * cell + cell * 0.7, R * cell + cell * 0.7, cell * 0.3, panelC, ga, false, J.mix(sc.bg, sc.fg, 0.2), Math.max(1, u * 0.0018));
    // decoy capsules (words found earlier)
    const cap = (ra, ca, rb, cb, col, a, stroke) => {
      const x1 = gx + (ca + 0.5) * cell, y1 = gy + (ra + 0.5) * cell, x2 = gx + (cb + 0.5) * cell, y2 = gy + (rb + 0.5) * cell;
      const ang = Math.atan2(y2 - y1, x2 - x1), len = Math.hypot(x2 - x1, y2 - y1), rr = cell * 0.42;
      ctx.save(); ctx.translate(x1, y1); ctx.rotate(ang);
      env.rrect(-rr, -rr, len + rr * 2, rr * 2, rr, stroke ? null : col, a, false, stroke ? col : null, Math.max(1.5, cell * 0.06));
      ctx.restore();
    };
    for (let d = 0; d < Pm.decoys; d++) {
      const rr = J.h(s, d, 21) % R, len = 3 + J.h(s, d, 22) % 2, cc = J.h(s, d, 23) % Math.max(1, C - len);
      let clash = false; for (let q = 0; q < len; q++) if (onPath.has(rr * 64 + cc + q)) clash = true;
      if (clash) continue;
      cap(rr, cc, rr, cc + len - 1, sc.sub, 0.5 * ga, true);
    }
    // grid letters (one item; glyphs placed on cells)
    if (env.pass === 'main' && ga > 0) {
      const gs = cell * 0.56;
      if ('letterSpacing' in ctx) {
        // one fillText per row: full-width glyphs advance exactly one em, the spacing makes up the cell pitch
        ctx.save(); ctx.font = J.fontCSS(Pm.gf, gs); ctx.letterSpacing = (cell - gs).toFixed(2) + 'px'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = sc.sub;
        for (let r = 0; r < R; r++) {
          const a = J.clamp(ga * (R + 2) - r) * 0.75 * out;
          if (a <= 0.01) continue;
          let row = '';
          for (let c = 0; c < C; c++) row += onPath.has(r * 64 + c) ? '\u3000' : pool[J.h(s, r, c, 9) % NP];
          ctx.globalAlpha = a; ctx.fillText(row, gx + (cell - gs) / 2, gy + (r + 0.5) * cell);
        }
        ctx.restore();
      } else {
        const cellsTxt = [], pos = [];
        for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) { if (onPath.has(r * 64 + c)) continue; cellsTxt.push(pool[J.h(s, r, c, 9) % NP]); pos.push([gx + (c + 0.5) * cell, gy + (r + 0.5) * cell, r]); }
        const it = { text: cellsTxt.join(''), font: Pm.gf, size: gs, x: 0, y: 0, color: sc.sub, ghost: false, alpha: 0.75 * out };
        it._lay = J.layoutText(it);
        it.charFn = (i, g) => { const q = pos[i]; if (!q) return { hide: true }; const a = J.clamp(ga * (R + 2) - q[2]); return { dx: q[0] - g.x, dy: q[1] - g.y, a }; };
        env.draw(it);
      }
    }
    // the find: capsule sweeps along the lyric, glyphs light up as it passes
    const T1 = 0.35, sweep = J.clamp(cut.dur * 0.3, 0.35, 0.8);
    const f = E.inOutCubic(J.clamp((lt - T1) / sweep)) * (1 - E.inCubic(J.clamp(env.pOut * 1.3)));
    if (f > 0) {
      const endI = (n - 1) * f;
      cap(r0, c0, r0 + dr * endI, c0 + dc * endI, sc.accent, 0.3 * out, false);
      cap(r0, c0, r0 + dr * endI, c0 + dc * endI, sc.accent, out, true);
    }
    let bb = null;
    chs.forEach((ch, i) => {
      const x = gx + (c0 + dc * i + 0.5) * cell, y = gy + (r0 + dr * i + 0.5) * cell;
      const lit = J.clamp(((n > 1 ? f * (n - 1) : f) - i + 0.6) / 0.6);
      bb = UB(bb, J.mainDraw(env, { text: ch, font: Pm.font, size: cell * (0.56 + 0.08 * lit), x, y, color: lit > 0.5 ? sc.fg : sc.sub, alpha: 0.75 + 0.25 * lit, noHold: plateHold(env), mi: miAt(env, 0.1 + i * 0.02) }));
    });
    return bb || box(gx, gy, gx + C * cell, gy + R * cell);
  },
});

/* ================================================================== 19 puzzle — パズル */
/* one jigsaw edge from (x0,y0) to (x1,y1); s = ±1 knob side (0 = straight) */
const jigEdge = (ctx, x0, y0, x1, y1, s) => {
  if (!s) { ctx.lineTo(x1, y1); return; }
  const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L, nx = uy * s, ny = -ux * s;
  const P = (t, h) => [x0 + ux * t * L + nx * h * L, y0 + uy * t * L + ny * h * L];
  const a = P(0.37, 0), b1 = P(0.42, 0.1), b2 = P(0.3, 0.26), c = P(0.5, 0.27), d1 = P(0.7, 0.26), d2 = P(0.58, 0.1), e = P(0.63, 0);
  ctx.lineTo(a[0], a[1]); ctx.bezierCurveTo(b1[0], b1[1], b2[0], b2[1], c[0], c[1]); ctx.bezierCurveTo(d1[0], d1[1], d2[0], d2[1], e[0], e[1]); ctx.lineTo(x1, y1);
};
const jigPath = (ctx, x, y, w, h, t, r, b, l) => {
  ctx.moveTo(x, y); jigEdge(ctx, x, y, x + w, y, t); jigEdge(ctx, x + w, y, x + w, y + h, r); jigEdge(ctx, x + w, y + h, x, y + h, b); jigEdge(ctx, x, y + h, x, y, l); ctx.closePath();
};
reg('puzzle', {
  name: 'パズル', tags: ['pop', 'graphic', 'emotional'], w: 0.8, treat: 'safe', ae: 'center', fits: n => n >= 1 && n <= 16,
  enterBias: { cut: 3, blur: 0.5, pop: 0.4, slice: 0.2, wipe: 0.2, stretch: 0.2, assemble: 0.2 },
  plan(rng, cut, st) {
    return { font: rng.pick(fontsOf(st, ['display', 'serif'])), plate: rng.pick(['accent', 'light', 'ink']), rows: rng.pick([2, 2, 3]), last: rng.chance(0.65), spread: rng.range(0.6, 1) };
  },
  render(env) {
    const { W, H, sc, ctx } = env, cut = env.cut, Pm = cut.params, s = cut.seed, u = U(env), lt = env.lt;
    const port = isPort(env);
    const text = brk(cut.text, port ? 5 : 8);
    const o = { track: 0.04, lead: 1.12 };
    const size = Math.min(J.fitSize(text, Pm.font, W * 0.7, H * (port ? 0.3 : 0.4), o), u * 0.22);
    const m = J.measure(Object.assign({ text, font: Pm.font, size }, o));
    const bw = Math.min(W * 0.92, m.w + size * 1.3), bh = Math.min(H * 0.8, m.h + size * 1.1);
    const x0 = W / 2 - bw / 2, y0 = H / 2 - bh / 2;
    const R = Pm.rows, C = Math.max(2, Math.round(bw / bh * R));
    const pw = bw / C, phh = bh / R;
    const plate = Pm.plate === 'light' ? J.mix(lightOf(sc), sc.accent, 0.08) : plateCol(sc, Pm.plate === 'accent' ? [sc.accent, sc.ink] : [sc.ink, sc.accent]);
    const tc = onCol(sc, plate);
    const out = tout(env);
    const hS = (r, c) => (J.h(s, r, c, 1) & 1 ? 1 : -1);             // horizontal seam under row r
    const vS = (r, c) => (J.h(s, r, c, 2) & 1 ? 1 : -1);             // vertical seam right of col c
    const N = R * C;
    const ord = []; for (let i = 0; i < N; i++) ord.push(i);
    ord.sort((a, b) => J.r(s, a, 3) - J.r(s, b, 3));
    const rank = new Array(N); ord.forEach((p, k) => { rank[p] = k; });
    const fd = 0.42, span = J.clamp(cut.dur * 0.3, 0.3, 0.8);
    const tOf = p => { const k = rank[p]; if (Pm.last && k === N - 1) return 0.1 + span + 0.25; return 0.06 + (N > 1 ? k / (N - 1) : 0) * span * (Pm.last ? 0.85 : 1); };
    const edges = (r, c) => [r === 0 ? 0 : -hS(r - 1, c), c === C - 1 ? 0 : vS(r, c), r === R - 1 ? 0 : hS(r, c), c === 0 ? 0 : -vS(r, c - 1)];
    const path = (cx, r, c) => { const e = edges(r, c); jigPath(cx, x0 + c * pw, y0 + r * phh, pw, phh, e[0], e[1], e[2], e[3]); };
    const drawContent = () => {
      env.rect(x0 - pw * 0.4, y0 - phh * 0.4, bw + pw * 0.8, bh + phh * 0.8, plate, 1, false);
      return J.mainDraw(env, Object.assign({ text, font: Pm.font, size, x: W / 2, y: H / 2, color: tc, noHold: plateHold(env), mi: 0 }, o));
    };
    const settled = [], moving = [];
    for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
      const p = r * C + c, f = J.clamp((lt - tOf(p)) / fd);
      const fo = J.clamp(env.pOut * 1.5 - rank[p] / N * 0.5);
      if (f <= 0) continue;
      if (f >= 1 && fo <= 0) settled.push([r, c]);
      else moving.push([r, c, f, fo]);
    }
    let bb = null;
    const lw = Math.max(1, u * 0.0018);
    if (settled.length) {
      ctx.save(); ctx.beginPath(); for (const [r, c] of settled) path(ctx, r, c); ctx.clip();
      bb = drawContent();
      ctx.restore();
      if (env.pass === 'main') {
        ctx.save(); ctx.beginPath(); for (const [r, c] of settled) path(ctx, r, c);
        ctx.strokeStyle = J.mix(plate, darkOf(sc), 0.45); ctx.globalAlpha = 0.55 * out; ctx.lineWidth = lw; ctx.stroke(); ctx.restore();
      }
    }
    if (env.pass === 'main') {
      for (const [r, c, f, fo] of moving) {
        const p = r * C + c;
        const hx = x0 + (c + 0.5) * pw, hy = y0 + (r + 0.5) * phh;
        const ang = J.r(s, p, 4) * J.TAU, dist = Math.hypot(W, H) * 0.45 * Pm.spread * (0.6 + 0.4 * J.r(s, p, 5));
        const sx = hx + Math.cos(ang) * dist, sy = hy + Math.sin(ang) * dist * 0.7;
        const e = f < 1 ? E.outCubic(f) : 1, eo = E.inCubic(fo);
        const px = J.lerp(sx, hx, e) + (hx - W / 2) * eo * 1.4 + Math.cos(ang) * eo * dist * 0.5, py = J.lerp(sy, hy, e) + (hy - H / 2) * eo * 1.4 + Math.sin(ang) * eo * dist * 0.4;
        const rot = (J.rs(s, p, 6) * 70 * (1 - e) + J.rs(s, p, 7) * 50 * eo) * J.DEG;
        const lift = 1 + 0.08 * (1 - e) + 0.06 * eo;
        const a = (1 - eo) * out;
        if (a <= 0.01) continue;
        ctx.save(); ctx.translate(px + u * 0.012 * lift, py + u * 0.018 * lift); ctx.rotate(rot); ctx.scale(lift, lift); ctx.translate(-hx, -hy);
        ctx.globalAlpha = 0.3 * a; ctx.fillStyle = darkOf(sc); ctx.beginPath(); path(ctx, r, c); ctx.fill(); ctx.restore();
        ctx.save(); ctx.translate(px, py); ctx.rotate(rot); ctx.scale(lift, lift); ctx.translate(-hx, -hy);
        ctx.beginPath(); path(ctx, r, c); ctx.save(); ctx.clip();
        ctx.globalAlpha = a; drawContent(); ctx.globalAlpha = 1;
        ctx.restore();
        ctx.strokeStyle = J.mix(plate, darkOf(sc), 0.4); ctx.lineWidth = lw; ctx.globalAlpha = a; ctx.stroke();
        ctx.restore();
      }
    }
    // the last piece lands with a flash
    if (Pm.last && N > 1) {
      const p = ord[N - 1], tl = lt - tOf(p) - fd;
      if (tl > 0 && tl < 0.35) {
        const r = Math.floor(p / C), c = p % C;
        const k = 1 - tl / 0.35;
        ctx.save(); ctx.beginPath(); path(ctx, r, c);
        if (env.pass === 'main') { ctx.strokeStyle = onCol(sc, plate) === tc ? sc.accent : tc; ctx.lineWidth = Math.max(2, u * 0.006) * k; ctx.globalAlpha = k * out; ctx.stroke(); }
        ctx.restore();
      }
    }
    return bb || box(x0, y0, x0 + bw, y0 + bh);
  },
});

/* ================================================================== 20 shadowPlay — 影絵 */
reg('shadowPlay', {
  name: '影絵', tags: ['emotional', 'calm', 'graphic'], w: 0.9, ae: 'stack', fits: n => n >= 1 && n <= 14,
  enterBias: { cut: 1.2, blur: 1.3, drop: 1.2, pop: 0.6, slice: 0.4 },
  plan(rng, cut, st) {
    return { font: rng.pick(fontsOf(st, ['display', 'display', 'serif'])), mode: rng.pick(['floor', 'floor', 'wall']), dir: rng.pick([1, -1]), sweep: rng.range(0.7, 1), sun: rng.chance(0.8) };
  },
  render(env) {
    const { W, H, sc, ctx } = env, cut = env.cut, Pm = cut.params, u = U(env), lt = env.lt;
    const port = isPort(env);
    const out = tout(env), dark = J.lum(sc.bg) < 0.45;
    const text = brk(cut.text, port ? 5 : 9);
    const o = { track: 0.04, lead: 1.08 };
    const k = J.clamp(lt / Math.max(0.5, cut.dur), 0, 1);
    const shC = dark ? J.mix(sc.bg, '#000000', 0.55) : J.mix(darkOf(sc), sc.bg, 0.25);
    if (Pm.mode === 'floor') {
      const size = Math.min(J.fitSize(text, Pm.font, W * 0.8, H * (port ? 0.22 : 0.3), o), u * 0.22);
      const m = J.measure(Object.assign({ text, font: Pm.font, size }, o));
      const yb = H * (port ? 0.56 : 0.6), ty = yb - m.h / 2 - size * 0.04;
      // floor plane
      const fa = tin(env, 0, 0.5, E.outCubic) * out;
      const floorC = J.mix(sc.bg, sc.fg, dark ? 0.13 : 0.07);
      env.rect(0, yb, W, (H - yb) * fa + 2, floorC, fa, false);
      env.line([[W * 0.5 - W * 0.5 * fa, yb], [W * 0.5 + W * 0.5 * fa, yb]], sc.sub, Math.max(1, u * 0.002), 0.6, false);
      // the sun crosses the sky; the cast shadow sweeps like a sundial
      const phi = (J.lerp(74, 38, E.inOutSine(k)) * (0.85 + 0.15 * Pm.sweep) * Pm.dir) * J.DEG;
      if (Pm.sun) {
        const sr0 = u * 0.045, sr = sr0 * tin(env, 0.1, 0.5, E.outBack);
        const sx = W / 2 - Math.sin(phi) * W * 0.4;
        let sy = yb - sr0 * 1.6 - (yb - H * 0.1) * Math.cos(phi) * 1.1;
        if (Math.abs(sx - W / 2) < m.w / 2 + sr0 * 2.2) sy = Math.min(sy, ty - m.h / 2 - sr0 * 2.4);
        if (sr > 0) {
          env.circle(sx, sy, sr * 1.9, sc.accent, null, 0, 0.12 * out, false);
          env.circle(sx, sy, sr, sc.accent, null, 0, out, false);
          for (let i = 0; i < 10; i++) { const a = i / 10 * J.TAU + env.ltb * 0.4; env.line([[sx + Math.cos(a) * sr * 1.35, sy + Math.sin(a) * sr * 1.35], [sx + Math.cos(a) * sr * 1.75, sy + Math.sin(a) * sr * 1.75]], sc.accent, Math.max(1.5, sr * 0.1), 0.8 * out, false); }
        }
      }
      const sh = J.clamp(Math.tan(phi) * 0.75, -1.9, 1.9), d = 0.3 + 0.3 * Math.abs(Math.sin(phi));
      const mS = [1, 0, sh, -d, -sh * yb, (1 + d) * yb];
      const base = Object.assign({ text, font: Pm.font, size, x: W / 2, y: ty, mi: 0 }, o);
      if (env.pass === 'main') {
        ctx.save(); ctx.beginPath(); ctx.rect(-W, yb, W * 3, H * 2); ctx.clip();
        drawAff(env, Object.assign({}, base, { color: shC, alpha: 0.85, ghost: false, plain: true }), mS);
        // the far end of the shadow fades into the floor
        const g = ctx.createLinearGradient(0, yb, 0, yb + m.h * d * 1.15 + size * 0.1);
        g.addColorStop(0, J.rgba(floorC, 0)); g.addColorStop(0.35, J.rgba(floorC, 0)); g.addColorStop(1, J.rgba(floorC, 0.7));
        ctx.fillStyle = g; ctx.fillRect(0, yb, W, H - yb);
        ctx.restore();
      }
      return J.mainDraw(env, Object.assign({}, base, { color: sc.fg }));
    }
    // wall: a small lamp in front throws a big soft shadow on the wall behind
    const size = Math.min(J.fitSize(text, Pm.font, W * 0.6, H * (port ? 0.2 : 0.26), o), u * 0.17);
    const tx = W / 2, ty = H * 0.5;
    const lx = W / 2 + Math.sin(env.ltb * 0.45 + (Pm.dir > 0 ? 0 : 2)) * W * 0.16, ly = H * 0.86 + Math.sin(env.ltb * 1.7) * H * 0.006;
    const kS = 1.42 + 0.1 * Math.sin(env.ltb * 0.6);
    const flick = 0.92 + 0.08 * J.r(cut.seed, env.step, 3);
    const la = tin(env, 0, 0.5, E.outCubic) * out;
    if (env.pass === 'main' && la > 0) {
      const g = ctx.createRadialGradient(lx, ly, 0, lx, ly, Math.max(W, H) * 0.75);
      g.addColorStop(0, J.rgba(dark ? sc.accent : lightOf(sc), (dark ? 0.2 : 0.35) * flick * la)); g.addColorStop(0.5, J.rgba(dark ? sc.accent : lightOf(sc), (dark ? 0.07 : 0.12) * la)); g.addColorStop(1, J.rgba(sc.bg, 0));
      ctx.save(); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
    }
    const mS = [kS, 0, 0, kS, lx * (1 - kS), ly * (1 - kS)];
    const base = Object.assign({ text, font: Pm.font, size, x: tx, y: ty, mi: 0 }, o);
    if (env.pass === 'main') drawAff(env, Object.assign({}, base, { color: shC, alpha: (dark ? 0.9 : 0.55) * la, blur: size * 0.04, ghost: false, plain: true }), mS);
    // the lamp
    const fr = u * 0.02;
    env.circle(lx, ly, fr * 3.5, sc.accent, null, 0, 0.15 * la * flick, false);
    env.poly([[lx, ly - fr * 2.2 * flick], [lx + fr * 0.8, ly - fr * 0.2], [lx, ly + fr * 0.6], [lx - fr * 0.8, ly - fr * 0.2]], sc.accent, la, false);
    env.rect(lx - fr * 0.9, ly + fr * 0.6, fr * 1.8, fr * 1.6, sc.sub, la, false);
    return J.mainDraw(env, Object.assign({}, base, { color: sc.fg }));
  },
});

/* ================================================================== 21 kaleido — 万華鏡 */
reg('kaleido', {
  name: '万華鏡', tags: ['glitch', 'emotional', 'graphic'], w: 0.8, busy: true, ae: 'ring', fits: n => n >= 1 && n <= 14,
  enterBias: { cut: 1.4, zoom: 1.4, spin: 1.3, blur: 1.2, slice: 0.3, wipe: 0.3 },
  plan(rng, cut, st) {
    return { font: rng.pick(fontsOf(st, ['display', 'serif'])), N: rng.pick([6, 8, 8, 10, 12]), speed: rng.range(4, 10) * rng.pick([1, -1]), flow: rng.range(0.15, 0.3), center: rng.pick(['disc', 'disc', 'band']), tint: rng.pick(['sub', 'accent', 'mixed']) };
  },
  render(env) {
    const { W, H, sc, ctx } = env, cut = env.cut, Pm = cut.params, u = U(env), lt = env.lt;
    const t0 = flat(cut.text), n = J.glyphCount(t0);
    const unit = n > 5 ? chunksK(t0, Math.ceil(n / 4))[0] : t0;
    const cx = W / 2, cy = H / 2, N = Pm.N, al = J.TAU / N, Rr = Math.hypot(W, H) * 0.56;
    const out = tout(env), e = E.outCubic(J.clamp(lt / 0.6));
    const rot0 = (env.ltb * Pm.speed + (1 - e) * 60) * J.DEG;
    const cols = Pm.tint === 'accent' ? [sc.accent, sc.sub, sc.sub] : Pm.tint === 'mixed' ? [sc.sub, sc.accent, sc.sub, sc.accent2 || sc.sub] : [sc.sub, J.mix(sc.sub, sc.bg, 0.4)];
    if (env.pass === 'main' && e > 0) {
      const M = 4, spacing = 1 / M;
      const ph = (env.ltb * Pm.flow) % spacing;
      for (let w = 0; w < N; w++) {
        const a0 = rot0 + w * al;
        ctx.save();
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a0) * Rr, cy + Math.sin(a0) * Rr); ctx.lineTo(cx + Math.cos(a0 + al) * Rr, cy + Math.sin(a0 + al) * Rr); ctx.closePath(); ctx.clip();
        ctx.translate(cx, cy); ctx.rotate(a0 + al / 2);
        if (w % 2) ctx.scale(1, -1);
        for (let j = 0; j < M + 1; j++) {
          const f = (j * spacing + ph);                        // 0..1 radius fraction, flowing outward
          const r = Rr * (0.12 + f * 0.95);
          const sz = r * Math.tan(al / 2) * 1.2;
          const a = Math.min(1, f * 4) * (1 - f * 0.55) * out * e;
          if (a <= 0.02 || sz < 4) continue;
          env.draw({ text: unit, font: Pm.font, size: Math.min(sz, r * 0.5), x: r, y: 0, rot: 90, color: cols[(j + w) % cols.length], alpha: a * 0.5, ghost: false });
        }
        env.line([[Rr * 0.1, 0], [Rr, 0]], sc.dim, 1, 0.5 * out * e, false);
        ctx.restore();
      }
    }
    // centre: the lyric on a disc or a band
    const disc = Pm.center === 'disc' && n <= (isPort(env) ? 8 : 9);
    const text = disc ? brk(t0, n <= 4 ? 4 : Math.ceil(n / 2)) : brk(t0, isPort(env) ? 5 : 8);
    const o = { track: 0.03, lead: 1.1 };
    let size;
    if (disc) {
      const Rc = Math.min(W, H) * (n > 5 ? 0.36 : 0.3);
      size = Math.min(J.fitSize(text, Pm.font, Rc * 1.55, Rc * 1.2, o), u * 0.16);
      const q = E.outBack(J.clamp(lt / 0.4), 1.5) * (1 - 0.3 * E.inCubic(env.pOut));
      env.circle(cx, cy, Rc * q, sc.bg, null, 0, out, false);
      env.circle(cx, cy, Rc * q, null, sc.accent, Math.max(2, u * 0.004), out, false);
      env.circle(cx, cy, Rc * q * 1.06, null, sc.sub, 1, 0.6 * out, false);
    } else {
      size = Math.min(J.fitSize(text, Pm.font, W * 0.84, H * 0.26, o), u * 0.18);
      const m = J.measure(Object.assign({ text, font: Pm.font, size }, o));
      const bh = (m.h + size * 0.6) * E.outExpo(J.clamp(lt / 0.4)) * (1 - E.inCubic(env.pOut));
      env.rect(0, cy - bh / 2, W, bh, sc.bg, 1, false);
      env.line([[0, cy - bh / 2], [W, cy - bh / 2]], sc.accent, Math.max(2, u * 0.003), out, false);
      env.line([[0, cy + bh / 2], [W, cy + bh / 2]], sc.accent, Math.max(2, u * 0.003), out, false);
    }
    return J.mainDraw(env, Object.assign({ text, font: Pm.font, size, x: cx, y: cy, color: sc.fg }, o));
  },
});

/* ================================================================== 22 dominoes — ドミノ */
const PIPS = [[], [[0, 0]], [[-1, -1], [1, 1]], [[-1, -1], [0, 0], [1, 1]], [[-1, -1], [1, -1], [-1, 1], [1, 1]], [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]]];
reg('dominoes', {
  name: 'ドミノ', tags: ['pop', 'graphic'], w: 0.7, treat: 'safe', portrait: 0.7, ae: 'labels', fits: n => n >= 2 && n <= 14,
  enterBias: { cut: 3, blur: 0.5, pop: 0.6, slice: 0.2, wipe: 0.2, stretch: 0.2, drop: 0.5 },
  plan(rng, cut, st) {
    return { font: rng.pick(fontsOf(st, ['display', 'serif'])), face: rng.pick(['light', 'light', 'ink']), pips: rng.chance(0.8) };
  },
  render(env) {
    const { W, H, sc, ctx } = env, cut = env.cut, Pm = cut.params, s = cut.seed, u = U(env), lt = env.lt;
    const n = J.glyphCount(cut.text);
    if (n < 1) return null;
    const port = isPort(env);
    const rowsD = rowsOf(cut.text, port ? 5 : n <= 7 ? 7 : Math.ceil(n / 2));
    const rows = rowsD.length, per = Math.max(...rowsD.map(r => r.length));
    const asp = Pm.pips ? 1.9 : 1.45, gapK = 0.5;
    const w = Math.min(W * 0.84 / (per + (per - 1) * gapK), H * 0.72 / (rows * asp + (rows - 1) * 0.35), u * 0.2);
    const h = w * asp, g = w * gapK;
    const out = tout(env);
    const faceC = Pm.face === 'ink' ? plateCol(sc, [sc.ink, sc.fg]) : J.mix(lightOf(sc), sc.accent, 0.06);
    const tc = onCol(sc, faceC), sideC = shade(sc, faceC, -0.35), pipC = J.mix(faceC, tc, 0.7);
    const thick = w * 0.12;
    const lean = Math.asin(J.clamp((g - thick * 0.2) / h, 0, 0.95)) / J.DEG;
    const T0 = 0.1, dT = J.clamp(cut.dur * 0.3 / n, 0.04, 0.09), rise = 0.26;
    const outDur = Math.max(0.3, Math.min(cut.dur * 0.35, (cut.outDur || 0.3) + 0.25)), oStart = cut.dur - outDur;
    let bb = null, gi = 0;
    for (let r = 0; r < rows; r++) {
      const row = rowsD[r], cnt = row.length;
      const yF = H / 2 + (r - (rows - 1) / 2) * (h + w * 0.35) + h / 2;
      env.line([[W / 2 - (cnt * (w + g)) / 2 - w * 0.4, yF], [W / 2 + (cnt * (w + g)) / 2 + w * 0.4, yF]], sc.sub, Math.max(1, u * 0.0018), 0.5 * tin(env, 0, 0.3) * out, false);
      for (let j = 0; j < cnt; j++) {
        if (row[j] === ' ') continue;
        const i = gi++;
        const xc = W / 2 + (j - (cnt - 1) / 2) * (w + g);
        // stand up in a wave from the left, fall in a chain to the right at the end
        const ti = T0 + i * dT;
        const fu = J.clamp((lt - ti) / rise);
        let th = 0, pivot = 0;
        if (fu < 1) { th = -(j === 0 ? 88 : lean) * (1 - E.outBack(fu, 1.6)); pivot = -1; }
        const fo = (lt - oStart - j * 0.05) / 0.3;
        if (fo > 0) { th = (j === cnt - 1 ? 88 : lean) * E.inQuad(Math.min(1, fo)); pivot = 1; }
        const px = xc + pivot * w / 2, py = yF;
        const ca = Math.cos(th * J.DEG), sa = Math.sin(th * J.DEG);
        const M = [ca, sa, -sa, ca, px - (ca * pivot * w / 2) + 0, py - sa * pivot * w / 2];
        // tile corners in tile space (origin at the tile's bottom-centre)
        const T = (x, y) => [M[0] * x + M[2] * y + M[4], M[1] * x + M[3] * y + M[5]];
        const vis = J.clamp((lt - ti + 0.08) / 0.1) * (1 - E.inCubic(J.clamp((env.pOut - 0.7) / 0.3)));
        if (vis <= 0) continue;
        env.poly([T(-w / 2, 0), T(w / 2, 0), T(w / 2 + w * 0.1, w * 0.04), T(-w / 2 + w * 0.1, w * 0.04)], darkOf(sc), 0.25 * vis, false);
        env.poly([T(w / 2, -h + thick * 0.4), T(w / 2 + thick, -h + thick * 0.4 + thick * 0.3), T(w / 2 + thick, thick * 0.3), T(w / 2, 0)], sideC, vis, false);
        ctx.save(); ctx.transform(M[0], M[1], M[2], M[3], M[4], M[5]);
        env.rrect(-w / 2, -h, w, h, w * 0.1, faceC, vis, gIn(env));
        if (Pm.pips) {
          env.line([[-w * 0.36, -h * 0.47], [w * 0.36, -h * 0.47]], J.mix(faceC, tc, 0.45), Math.max(1, w * 0.03), vis, false);
          const pn = J.h(s, i, 11) % 7, pr = w * 0.07;
          for (const [a, b] of PIPS[pn]) env.circle(a * w * 0.22, -h * 0.235 + b * w * 0.22, pr, pipC, null, 0, vis, false);
        }
        ctx.restore();
        const cyT = Pm.pips ? -h * 0.735 : -h / 2;
        bb = UB(bb, drawAff(env, { text: row[j], font: Pm.font, size: w * 0.7, x: 0, y: cyT, color: tc, alpha: vis, noHold: plateHold(env), mi: miAt(env, ti) }, M));
      }
    }
    return bb;
  },
});

/* ================================================================== 23 burst — 爆発プレート */
reg('burst', {
  name: 'ドカン', tags: ['pop', 'graphic', 'emotional'], w: 0.8, treat: 'safe', emph: 1.6, ae: 'circle', fits: n => n >= 1 && n <= 12,
  enterBias: { cut: 1.6, pop: 1.6, zoom: 1.4, blur: 0.5, slice: 0.3, wipe: 0.3, type: 0.3 },
  plan(rng, cut, st) {
    return { font: rng.pick(fontsOf(st, ['display'])), spikes: rng.int(13, 19), sharp: rng.range(0.66, 0.78), tilt: rng.range(-9, 9), lines: rng.chance(0.75), debris: rng.chance(0.8), order: rng.pick(['accent', 'ink']) };
  },
  render(env) {
    const { W, H, sc, ctx } = env, cut = env.cut, Pm = cut.params, s = cut.seed, u = U(env), lt = env.lt;
    const port = isPort(env);
    const text = brk(cut.text, port ? 4 : 6);
    const o = { track: 0.02, lead: 1.05 };
    const rxM = W * 0.355, ryM = Math.min(H * 0.355, rxM * (port ? 1.5 : 1.1));
    const size = Math.min(J.fitSize(text, Pm.font, rxM * 1.08, ryM * 1.0, o), u * 0.24);
    const m = J.measure(Object.assign({ text, font: Pm.font, size }, o));
    const rx = Math.min(rxM, m.w / 2 / 0.54 + size * 0.15), ry = Math.min(ryM, Math.max(m.h / 2 / 0.54 + size * 0.15, rx * 0.55));
    const cx = W / 2, cy = H / 2;
    const out = tout(env);
    const q = E.outBack(J.clamp(lt / 0.3), 2.2) * (1 - 0.6 * E.inCubic(env.pOut)) * (1 + 0.015 * Math.sin(env.ltb * 7) * J.clamp(lt - 0.3));
    const rot = (Pm.tilt + (1 - E.outCubic(J.clamp(lt / 0.3))) * -25 + E.inCubic(env.pOut) * 20) * J.DEG;
    const boil = Math.floor(env.step / 3);
    const A = plateCol(sc, Pm.order === 'accent' ? [sc.accent, sc.ink] : [sc.ink, sc.accent]);
    const B = [darkOf(sc), lightOf(sc), sc.bg, sc.fg].find(c => J.contrast(c, A) >= 2.2 && c !== A) || onCol(sc, A);
    const star = (k, scale, jit) => {
      const N = Pm.spikes, pts = [];
      for (let i = 0; i < N * 2; i++) {
        const a = i / (N * 2) * J.TAU + rot;
        const rr = i % 2 ? Pm.sharp + J.rs(s, i, k, boil) * 0.04 : 1 + J.r(s, i, k, boil) * jit;
        pts.push([cx + Math.cos(a) * rx * rr * scale * q, cy + Math.sin(a) * ry * rr * scale * q]);
      }
      return pts;
    };
    // shock ring + speed lines + debris
    const ring = J.clamp(lt / 0.45);
    if (ring < 1) env.circle(cx, cy, Math.max(rx, ry) * (0.6 + ring * 1.1), null, A, Math.max(2, u * 0.012) * (1 - ring), (1 - ring) * out, false);
    if (Pm.lines && env.pass === 'main') {
      const L = 28;
      for (let i = 0; i < L; i++) {
        if (J.r(s, i, env.step, 9) < 0.3) continue;
        const a = i / L * J.TAU + J.rs(s, i, 8) * 0.08;
        const r0 = 1.25 + J.r(s, i, env.step, 10) * 0.15, r1 = r0 + 0.2 + J.r(s, i, 11) * 0.25;
        env.line([[cx + Math.cos(a) * rx * r0 * q, cy + Math.sin(a) * ry * r0 * q], [cx + Math.cos(a) * rx * r1 * q, cy + Math.sin(a) * ry * r1 * q]], sc.sub, Math.max(1.5, u * 0.004), 0.7 * out, false);
      }
    }
    if (Pm.debris && lt < 0.9) {
      for (let i = 0; i < 12; i++) {
        const a = J.r(s, i, 21) * J.TAU, sp = J.rr(0.5, 1.1, s, i, 22), f = E.outCubic(J.clamp(lt / 0.8));
        const d = (1.05 + f * 0.6 * sp), x = cx + Math.cos(a) * rx * d, y = cy + Math.sin(a) * ry * d + f * f * H * 0.05;
        const sz = u * 0.018 * (1 - f), rr = J.r(s, i, 23) * J.TAU + f * 6;
        if (sz > 0.5) env.poly([[x + Math.cos(rr) * sz, y + Math.sin(rr) * sz], [x + Math.cos(rr + 2.2) * sz, y + Math.sin(rr + 2.2) * sz], [x + Math.cos(rr + 4.1) * sz * 0.7, y + Math.sin(rr + 4.1) * sz * 0.7]], i % 2 ? A : B, out, false);
      }
    }
    if (q <= 0.01) return null;
    env.poly(star(1, 1.12, 0.22).map(([x, y]) => [x + u * 0.012, y + u * 0.016]), darkOf(sc), 0.3 * out, false);
    env.poly(star(1, 1.12, 0.22), A, out, gIn(env));
    env.poly(star(2, 0.93, 0.12), B, out, false);
    env.poly(star(3, 0.86, 0.08), A, out, false);
    return J.mainDraw(env, Object.assign({ text, font: Pm.font, size: size * Math.min(1, q), x: cx, y: cy, rot: rot / J.DEG * 0.6, color: onCol(sc, A) }, o));
  },
});

/* ================================================================== 24 fisheye — 魚眼 */
reg('fisheye', {
  name: '魚眼レンズ', tags: ['pop', 'graphic', 'glitch'], w: 0.8, portrait: 0.7, ae: 'mixed', fits: n => n >= 3 && n <= 16,
  enterBias: { cut: 1.4, blur: 1.2, pop: 1, slice: 0.4, wipe: 0.6, type: 0.8 },
  plan(rng, cut, st) {
    return { font: rng.pick(fontsOf(st, ['display', 'serif'])), mode: rng.pick(['sweep', 'sweep', 'pingpong']), glass: rng.pick(['lens', 'lens', 'grid', 'none']), amp: rng.range(0.7, 1.1) };
  },
  render(env) {
    const { W, H, sc, ctx } = env, cut = env.cut, Pm = cut.params, u = U(env), lt = env.lt;
    const port = isPort(env);
    const t0 = flat(cut.text), n = J.glyphCount(t0);
    const rowsT = n > (port ? 6 : 10) ? chunksK(t0, port ? Math.ceil(n / 6) : 2) : [t0];
    const nR = rowsT.length;
    const A = Pm.amp;
    let s0 = u * 0.16;
    for (const r of rowsT) { let a = 0; for (const ch of r) a += adv(Pm.font, ch); s0 = Math.min(s0, W * 0.84 / (a + A * 1.6)); }
    s0 = Math.min(s0, H * 0.6 / (nR * (1.4 + A * 0.5)));
    const sig = s0 * 1.25;
    const out = tout(env);
    // lens position: one pass over all rows (sweep) or back and forth on every row (pingpong)
    const T = J.clamp((lt - 0.2) / Math.max(0.4, cut.dur - 0.5));
    const lensIn = E.outCubic(J.clamp((lt - 0.1) / 0.4)) * (1 - E.inCubic(env.pOut));
    let bb = null, lensPos = null;
    rowsT.forEach((row, ri) => {
      const chars = [...row], base = chars.map(ch => adv(Pm.font, ch) * s0), tot0 = base.reduce((a, b) => a + b, 0);
      const cy = H / 2 + (ri - (nR - 1) / 2) * s0 * (1.35 + A * 0.55);
      const xL = W / 2 - tot0 / 2;
      let lx;
      if (Pm.mode === 'sweep') { const f = T * nR - ri; lx = f < 0 || f > 1 ? null : xL - sig + (tot0 + sig * 2) * E.inOutSine(f); }
      else lx = xL + tot0 * (0.5 - 0.5 * Math.cos(env.ltb * 1.6 + ri * 1.3));
      // scale each glyph by the bulge at its rest position, then re-flow the row round the centre
      let acc = 0;
      const sc0 = base.map((w, i) => { const x = xL + acc + w / 2; acc += w; return lx == null ? 1 : 1 + A * lensIn * Math.exp(-Math.pow((x - lx) / sig, 2)); });
      const widths = base.map((w, i) => w * sc0[i]), tot = widths.reduce((a, b) => a + b, 0);
      let x = W / 2 - tot / 2;
      if (lx != null) {
        // keep the lens over the bulge after re-flowing
        let acc2 = 0, best = 0, bw = 0;
        base.forEach((w, i) => { if (sc0[i] > bw) { bw = sc0[i]; best = i; } });
        widths.forEach((w, i) => { if (i < best) acc2 += w; });
        lensPos = { x: x + acc2 + widths[best] / 2, y: cy, r: s0 * (0.5 + 0.5 * bw) * 0.95, k: bw };
      }
      chars.forEach((ch, i) => {
        const w = widths[i], gx = x + w / 2; x += w;
        if (ch === ' ') return;
        const k = sc0[i];
        bb = UB(bb, J.mainDraw(env, { text: ch, font: Pm.font, size: s0 * k, x: gx, y: cy, color: k > 1.35 ? sc.accent : sc.fg, mi: ri * 3 + i * 0.5 }));
      });
      if (Pm.glass === 'grid' && lx != null && env.pass === 'main') {
        const g = s0 * 0.5, lw = Math.max(1, u * 0.0012);
        const warp = (px, py) => { const dx = px - lx, dy = py - cy, rr = Math.hypot(dx, dy), f = 1 + 0.9 * A * lensIn * Math.exp(-Math.pow(rr / (sig * 1.4), 2)); return [lx + dx * f, cy + dy * f]; };
        for (let k = -3; k <= 3; k++) { const pts = []; for (let q = -12; q <= 12; q++) pts.push(warp(lx + q * g * 0.5, cy + k * g)); env.line(pts, sc.sub, lw, 0.35 * out * lensIn, false); }
        for (let k = -6; k <= 6; k++) { const pts = []; for (let q = -6; q <= 6; q++) pts.push(warp(lx + k * g, cy + q * g * 0.5)); env.line(pts, sc.sub, lw, 0.35 * out * lensIn, false); }
      }
    });
    if (Pm.glass === 'lens' && lensPos && lensIn > 0.01) {
      const { x, y } = lensPos, R = Math.max(lensPos.r * 1.25, s0 * 1.05);
      const lw = Math.max(2, u * 0.005);
      env.circle(x, y, R, lightOf(sc), null, 0, 0.06 * lensIn, false);
      env.circle(x, y, R, null, sc.sub, lw, lensIn, false);
      env.arc(x, y, R * 0.8, 200, 250, lightOf(sc), lw * 0.8, 0.7 * lensIn, false);
      const a = 50 * J.DEG;
      env.line([[x + Math.cos(a) * R, y + Math.sin(a) * R], [x + Math.cos(a) * R * 1.75, y + Math.sin(a) * R * 1.75]], sc.sub, lw * 2.6, lensIn, false);
    }
    return bb;
  },
});

/* ================================================================== 25 wall — 壁面パース */
reg('wall', {
  name: '壁面パース', tags: ['graphic', 'editorial', 'emotional'], w: 0.8, busy: true, portrait: 0.6, ae: 'diag', fits: n => n >= 1 && n <= 16,
  enterBias: { cut: 1.6, blur: 1.2, wipe: 1, slice: 0.5, pop: 0.4 },
  plan(rng, cut, st) {
    return { font: rng.pick(fontsOf(st, ['display', 'display', 'serif'])), side: rng.pick([1, -1]), yaw: rng.range(36, 46), orbit: rng.range(8, 14), stripe: rng.chance(0.7), eye: rng.range(-0.06, 0.06), tone: rng.pick(['plate', 'plain']) };
  },
  render(env) {
    const { W, H, sc, ctx } = env, cut = env.cut, Pm = cut.params, u = U(env), lt = env.lt;
    const port = isPort(env);
    const side = Pm.side || 1;                             // +1: lyric on the right-hand wall
    const out = tout(env);
    const f = Math.max(W, H) * 1.05, D = f;
    const a0 = E.outCubic(J.clamp(lt / 0.9));
    const yaw = (Pm.yaw + (1 - a0) * Pm.orbit * 2.2 + Math.sin(env.ltb * 0.35) * Pm.orbit * 0.15 + E.inCubic(env.pOut) * Pm.orbit * 1.5) * J.DEG;
    // the lyric wall runs from the corner towards `side`, the other wall the other way
    const dL = [side * Math.sin(yaw), Math.cos(yaw)], dO = [-side * Math.cos(yaw), Math.sin(yaw)];
    const ccx = W / 2 - side * W * (port ? 0.3 : 0.22), ccy = H * (0.5 + Pm.eye);
    const P = (X, Y, Z) => [ccx + f * X / Z, ccy + f * Y / Z];
    const Ht = H * (port ? 0.26 : 0.4), Hb = H * (port ? 0.2 : 0.34);
    const LL = D * (port ? 1.5 : 1.15), LO = D * 1.2;
    const at = (d, s, Y) => [d[0] * s, Y, D + d[1] * s];
    const face = (d, L, y0, y1) => [P(...at(d, 0, y0)), P(...at(d, L, y0)), P(...at(d, L, y1)), P(...at(d, 0, y1))];
    const wa = tin(env, 0, 0.5, E.outCubic) * out;
    const plate = Pm.tone === 'plate' ? plateCol(sc, [sc.ink, sc.fg]) : J.mix(sc.bg, sc.fg, J.lum(sc.bg) < 0.5 ? 0.1 : 0.07);
    const litW = shade(sc, plate, 0.06), dimW = shade(sc, plate, -0.3);
    const tc = Pm.tone === 'plate' ? onCol(sc, plate) : sc.fg;
    // ground + horizon
    env.rect(0, ccy, W, H - ccy, J.mix(sc.bg, darkOf(sc), 0.35), 0.5 * wa, false);
    env.line([[0, ccy], [W, ccy]], sc.sub, 1, 0.25 * wa, false);
    env.poly(face(dO, LO * wa, -Ht, Hb), dimW, out, false);
    env.poly(face(dL, LL * wa, -Ht, Hb), litW, out, false);
    const lw = Math.max(1, u * 0.0016);
    env.line([P(0, -Ht, D), P(0, Hb, D)], J.mix(litW, darkOf(sc), 0.3), lw * 1.5, out, false);
    if (Pm.stripe) {
      for (const [d, L] of [[dL, LL], [dO, LO]]) env.poly(face(d, L * wa, Hb * 0.55, Hb * 0.72), sc.accent, 0.9 * out, false);
    }
    // per-glyph perspective: local x runs along the wall (dir), local y is world-vertical; numeric Jacobian
    const glyphM = (d, s, Y, flip) => {
      const p0 = P(...at(d, s, Y)), e = 1;
      const p1 = P(...at(d, s + e * (flip ? -1 : 1), Y)), p2 = P(...at(d, s, Y + e));
      return [p1[0] - p0[0], p1[1] - p0[1], p2[0] - p0[0], p2[1] - p0[1], p0[0], p0[1]];
    };
    // wall position (along d) of reading offset u: walls receding to the right read outwards, to the left read towards the corner
    const posOn = (d, L, u, tot, m0) => (d[0] >= 0 ? m0 + u : m0 + tot - u);
    // other wall: rows of the line in small type
    const oc = flat(cut.lineText || cut.text), rowsO = port ? 3 : 4, fsO = Ht * 0.12;
    if (env.pass === 'main') {
      const fo = bodyF(env), chars = [...(oc + '　・　' + oc + '　・　' + oc)].slice(0, 40);
      const ads = chars.map(ch => adv(fo, ch) * fsO * 1.1);
      let tot = 0, cnt = 0; for (const a of ads) { if (tot + a > LO * 0.86) break; tot += a; cnt++; }
      for (let r = 0; r < rowsO; r++) {
        const Y = -Ht * 0.72 + r * fsO * 1.9;
        let uu = 0;
        for (let i = 0; i < cnt; i++) {
          const ch = chars[i], a = ads[i], mid = uu + a / 2; uu += a;
          if (ch === ' ' || ch === '　') continue;
          drawAffPlain(env, { text: ch, font: fo, size: fsO, x: 0, y: 0, color: J.mix(dimW, onCol(sc, dimW), 0.55), alpha: wa * J.clamp((lt - 0.2 - r * 0.08) / 0.3), ghost: false }, glyphM(dO, posOn(dO, LO, mid, tot, LO * 0.07), Y, dO[0] < 0));
        }
      }
    }
    // the lyric along the main wall
    const t0 = flat(cut.text), n = J.glyphCount(t0);
    const lines = (n > (port ? 5 : 8) ? chunksK(t0, port ? Math.ceil(n / 5) : 2) : [t0]);
    const nl = lines.length;
    let g = (Ht + Hb * 0.5) * 0.62 / (nl * 1.15);
    for (const l of lines) { let a = 0; for (const ch of l) a += adv(Pm.font, ch) * 1.04; g = Math.min(g, LL * 0.86 / Math.max(1, a)); }
    let bb = null;
    lines.forEach((l, li) => {
      const Y = -Ht * 0.25 + (li - (nl - 1) / 2) * g * 1.15;
      const chars = [...l], ads = chars.map(ch => adv(Pm.font, ch) * g * 1.04), tot = ads.reduce((x, y) => x + y, 0);
      let uu = 0;
      chars.forEach((ch, i) => {
        const a = ads[i], mid = uu + a / 2; uu += a;
        if (ch === ' ') return;
        const sp = posOn(dL, LL, mid, tot, LL * 0.07);
        if (sp > LL * wa) return;
        bb = UB(bb, drawAff(env, { text: ch, font: Pm.font, size: g, x: 0, y: 0, color: tc, noHold: true, mi: li * 3 + i * 0.6 }, glyphM(dL, sp, Y, dL[0] < 0)));
      });
    });
    return bb;
  },
});

/* ================================================================== 26 origami — 折り紙 */
reg('origami', {
  name: '折り紙', tags: ['calm', 'pop', 'emotional'], w: 0.8, treat: 'safe', ae: 'circle', fits: n => n >= 1 && n <= 14,
  enterBias: { cut: 2.5, blur: 0.8, pop: 0.6, slice: 0.2, wipe: 0.3 },
  plan(rng, cut, st) {
    const port = cut.H > cut.W * 1.08;
    return { font: rng.pick(fontsOf(st, ['serif', 'display'])), mode: !port && cut.n > 6 && rng.chance(0.6) ? 'gate' : rng.pick(['blintz', 'blintz', 'gate']), col: rng.pick(['accent', 'accent', 'ink']), order: rng.int(0, 3) };
  },
  render(env) {
    const { W, H, sc, ctx } = env, cut = env.cut, Pm = cut.params, u = U(env), lt = env.lt;
    const port = isPort(env);
    const out = tout(env);
    const paper0 = lightOf(sc);
    const back = (Pm.col === 'ink' ? [sc.accent2, sc.accent, sc.ink] : [sc.accent, sc.accent2, sc.ink]).find(c => c && J.contrast(c, paper0) >= 1.5 && J.contrast(c, sc.bg) >= 1.3) || darkOf(sc);
    const paper = J.mix(paper0, back, 0.05), tc = onCol(sc, paper) === paper ? darkOf(sc) : (J.contrast(darkOf(sc), paper) > 3 ? darkOf(sc) : onCol(sc, paper));
    const crease = J.mix(paper, darkOf(sc), 0.22);
    const cx = W / 2, cy = H / 2;
    const fl = 0.36, st = 0.13;                                   // flap time, stagger
    const outF = J.clamp(env.pOut * 1.3);
    const flapAng = k => {
      const tin0 = 0.1 + k * st, tout0 = k * 0.12;
      let p = E.inOutCubic(J.clamp((lt - tin0) / fl)) * 166;
      if (outF > 0) p = Math.min(p, 166 * (1 - E.inOutCubic(J.clamp((outF - tout0 * 0.8) / 0.6))));
      return p * J.DEG;
    };
    const shrink = 1 - E.inCubic(J.clamp((env.pOut - 0.75) / 0.25));
    const text0 = flat(cut.text), n = J.glyphCount(text0);
    let bb = null;
    if (Pm.mode === 'gate' && !port) {
      // a wide sheet with two doors folding open from the middle
      const text = brk(text0, 9);
      const o = { track: 0.04, lead: 1.12 };
      const size = Math.min(J.fitSize(text, Pm.font, W * 0.66, H * 0.4, o), u * 0.2);
      const m = J.measure(Object.assign({ text, font: Pm.font, size }, o));
      const sw = Math.min(W * 0.86, m.w + size * 1.6) * shrink, sh = Math.min(H * 0.72, m.h + size * 1.4) * shrink;
      if (sw < 2) return null;
      const x0 = cx - sw / 2, y0 = cy - sh / 2;
      env.rect(x0 + u * 0.012, y0 + u * 0.018, sw, sh, darkOf(sc), 0.3 * out, false);
      env.rect(x0, y0, sw, sh, paper, out, gIn(env));
      env.line([[x0 + sw / 4, y0], [x0 + sw / 4, y0 + sh]], crease, 1, 0.8 * out, false);
      env.line([[x0 + sw * 3 / 4, y0], [x0 + sw * 3 / 4, y0 + sh]], crease, 1, 0.8 * out, false);
      const drawGate = under => { for (let k = 0; k < 2; k++) {
        const ph = flapAng(k), c = Math.cos(ph);
        if ((c < 0) !== under) continue;
        const hx = k ? x0 + sw * 3 / 4 : x0 + sw / 4, dir = k ? -1 : 1;      // hinge line, direction the folded flap points
        const ex = hx + dir * sw / 4 * c;
        const skew = Math.sin(ph) * sh * 0.05;
        const pts = [[hx, y0], [ex, y0 - skew], [ex, y0 + sh + skew], [hx, y0 + sh]];
        const col = c > 0 ? shade(sc, back, -0.25 * (1 - c)) : shade(sc, paper, (k ? -0.09 : 0.03) * -c - 0.35 * (1 + c));
        env.poly(pts, col, out, false);
        if (c > 0) env.line([[ex, y0 - skew], [ex, y0 + sh + skew]], shade(sc, back, 0.25), 1.5, out, false);
        else env.line([[hx, y0], [hx, y0 + sh]], crease, 1, out, false);
      } };
      drawGate(true);
      bb = J.mainDraw(env, Object.assign({ text, font: Pm.font, size: size * shrink, x: cx, y: cy, color: tc, noHold: plateHold(env), mi: miAt(env, 0.15) }, o));
      drawGate(false);
      return bb || box(x0, y0, x0 + sw, y0 + sh);
    }
    // blintz: a diamond sheet, four corners folded to the centre and opened one by one
    const S = Math.min(W * 0.84, H * 0.84, u * 0.95) * shrink;          // sheet diagonal
    if (S < 2) return null;
    const R = S / 2;
    const C = [[cx, cy - R], [cx + R, cy], [cx, cy + R], [cx - R, cy]];
    const M = C.map((p, i) => [(p[0] + C[(i + 1) % 4][0]) / 2, (p[1] + C[(i + 1) % 4][1]) / 2]);
    env.poly(C.map(([x, y]) => [x + u * 0.012, y + u * 0.018]), darkOf(sc), 0.3 * out, false);
    env.poly(C, paper, out, gIn(env));
    // creases
    for (let i = 0; i < 4; i++) env.line([M[i], M[(i + 1) % 4]], crease, 1, 0.8 * out, false);
    env.line([C[0], C[2]], crease, 1, 0.35 * out, false); env.line([C[1], C[3]], crease, 1, 0.35 * out, false);
    const text = n <= 4 ? text0 : brk(text0, n <= 9 ? Math.ceil(n / 2) : Math.ceil(n / 3));
    const o = { track: 0.02, lead: 1.08 };
    const inner = R * 0.94;                                        // side of the inner (axis-aligned) square ≈ R
    const size = Math.min(J.fitSize(text, Pm.font, inner * 0.84, inner * 0.84, o), u * 0.2);
    // flaps (hinge = inner-square edge, apex travels centre → corner); opened flaps lie under the text, closed ones over it
    const drawFlaps = under => { for (let q = 0; q < 4; q++) {
      const k = (q + Pm.order) % 4;
      const ph = flapAng(q), c = Math.cos(ph);
      if ((c < 0) !== under) continue;
      const a = M[(k + 3) % 4], b = M[k];
      const hm = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      const apex = [hm[0] + (cx - hm[0]) * c, hm[1] + (cy - hm[1]) * c];
      const lk = [0.04, -0.1, -0.05, 0.02][k];
      const col = c > 0 ? shade(sc, back, -0.3 * (1 - c)) : shade(sc, paper, lk * -c - 0.32 * (1 + c));
      env.poly([a, b, apex], col, out, false);
      if (c > -0.95) env.line([a, apex, b], c > 0 ? shade(sc, back, 0.2) : crease, 1, out, false);
      else env.line([a, b], crease, 1, out, false);
    } };
    drawFlaps(true);
    bb = J.mainDraw(env, Object.assign({ text, font: Pm.font, size: size * shrink, x: cx, y: cy, color: tc, noHold: plateHold(env), mi: miAt(env, 0.12) }, o));
    drawFlaps(false);
    return bb || box(cx - R, cy - R, cx + R, cy + R);
  },
});

/* ================================================================== 27 zipper — ジッパー */
reg('zipper', {
  name: 'ジッパー', tags: ['pop', 'graphic', 'emotional'], w: 0.7, busy: true, ae: 'center', portrait: 1.1, fits: n => n >= 1 && n <= 14,
  enterBias: { cut: 2, blur: 1, pop: 0.8, slice: 0.3, wipe: 0.5 },
  plan(rng, cut, st) {
    return { font: rng.pick(fontsOf(st, ['display', 'serif'])), cloth: rng.pick(['ink', 'accent', 'ink']), dir: rng.pick([1, -1]), stitch: rng.chance(0.8) };
  },
  render(env) {
    const { W, H, sc, ctx } = env, cut = env.cut, Pm = cut.params, u = U(env), lt = env.lt;
    const port = isPort(env);
    const t0 = flat(cut.text), n = J.glyphCount(t0);
    const vert = port && n <= 10 && !hasLatin(t0);
    const out = tout(env);
    // work in a frame where the seam runs along +X; map to the screen by swapping for the vertical zip
    const Lw = vert ? H : W, Lh = vert ? W : H;
    const S = (a, b) => (vert ? [b, a] : [a, b]);
    const x0 = Lw * 0.05, x1 = Lw * 0.95;
    const text = vert ? t0 : brk(t0, port ? 5 : 9);
    const o = { track: 0.05, lead: 1.1, vertical: vert };
    const size = Math.min(J.fitSize(text, Pm.font, vert ? Lh * 0.44 : Lw * 0.66, vert ? Lw * 0.64 : Lh * 0.36, o), u * 0.2);
    const m = J.measure(Object.assign({ text, font: Pm.font, size }, o));
    const G = (vert ? m.w : m.h) / 2 + size * 0.55;
    const tIn = J.clamp(cut.dur * 0.3, 0.45, 1), tOut = Math.max(0.3, (cut.outDur || 0.3) + 0.2);
    const cin = E.outCubic(J.clamp(lt / 0.28)), cout = E.inCubic(J.clamp((lt - (cut.dur - 0.22)) / 0.22));
    const tOut2 = tOut + 0.22;
    let sp = E.inOutCubic(J.clamp((lt - 0.22) / tIn)) * (1 - E.inOutCubic(J.clamp((lt - (cut.dur - tOut2)) / tOut)));
    const dir = Pm.dir || 1;
    const xs = dir > 0 ? J.lerp(x0, x1, sp) : J.lerp(x1, x0, sp);
    const a = dir > 0 ? x0 : xs, b = dir > 0 ? xs : x1;
    const gap = x => (x <= a || x >= b || b - a < 1) ? 0 : G * Math.pow(Math.sin(Math.PI * (x - a) / (b - a)), 0.75) * (1 + 0.02 * Math.sin(env.ltb * 2));
    const cy = Lh / 2;
    const cloth = plateCol(sc, Pm.cloth === 'accent' ? [sc.accent, sc.ink] : [sc.ink, sc.accent]);
    const tape = shade(sc, cloth, -0.25), toothC = J.mix(sc.sub, lightOf(sc), 0.4);
    // the lyric sits under the cloth
    const bb = J.mainDraw(env, Object.assign({ text, font: Pm.font, size, x: vert ? W / 2 : W / 2, y: H / 2, color: sc.fg, mi: miAt(env, 0.15) }, o));
    const N = 90, pts = [];
    for (let i = 0; i <= N; i++) { const x = J.lerp(-Lw * 0.02, Lw * 1.02, i / N); pts.push([x, gap(x)]); }
    const tw = u * 0.022, pitch = u * 0.02;
    const off = (1 - cin + cout) * Lh * 0.62;                  // halves slide in from the edges, and back out at the very end
    if (off > Lh * 0.6) return bb;
    for (const s2 of [-1, 1]) {
      const poly = [S(-Lw * 0.05, cy + s2 * (Lh * 0.6 + off))].concat(pts.map(([x, g]) => S(x, cy + s2 * (g + off)))).concat([S(Lw * 1.05, cy + s2 * (Lh * 0.6 + off))]);
      env.poly(poly, cloth, 1, false);
      env.line(pts.map(([x, g]) => S(x, cy + s2 * (g + tw * 0.5 + off))), tape, tw, 1, false);
      if (Pm.stitch) {
        const st = pts.map(([x, g]) => S(x, cy + s2 * (g + tw * 1.6 + off)));
        if (env.pass === 'main') { ctx.save(); ctx.setLineDash([u * 0.012, u * 0.01]); env.line(st, shade(sc, cloth, 0.25), Math.max(1, u * 0.0022), 0.8 * out, false); ctx.restore(); }
      }
    }
    // teeth: interlocked where closed, following each edge where open
    if (off < 1 && (env.pass === 'main' || gIn(env))) {
      for (let x = x0; x <= x1; x += pitch) {
        const g = gap(x), k = Math.round((x - x0) / pitch);
        const up = k % 2 ? -1 : 1;
        const d = (gap(x + 1) - gap(x - 1)) / 2;
        const ang = g < 0.5 ? 0 : Math.atan(up * d);
        const tl = tw * 0.7, th = pitch * 0.34;
        const yc = g < 0.5 ? cy + up * tl * 0.28 : cy + up * (g + tw * 0.15);
        const ca = Math.cos(ang), sa = Math.sin(ang);
        const q = [[-th, -tl / 2], [th, -tl / 2], [th, tl / 2], [-th, tl / 2]].map(([p, r]) => S(x + p * ca - r * sa, yc + p * sa + r * ca));
        env.poly(q, toothC, out, false);
      }
    }
    // slider + pull tab
    if (off >= 1) return bb;
    const sxp = xs, syp = cy;
    const bw = u * 0.05, bh = u * 0.035;
    env.poly([S(sxp - bw * 0.6 * dir, syp - bh), S(sxp + bw * 0.5 * dir, syp - bh * 0.7), S(sxp + bw * 0.5 * dir, syp + bh * 0.7), S(sxp - bw * 0.6 * dir, syp + bh)], toothC, out, false);
    const tabL = u * 0.075, sw = Math.sin(env.ltb * 3) * 0.15;
    const tx = sxp + dir * bw * 0.1, ty = syp + bh * 0.4;
    const tp = [[-bw * 0.28, 0], [bw * 0.28, 0], [bw * 0.34, tabL], [-bw * 0.34, tabL]].map(([p, r]) => S(tx + p * Math.cos(sw) - r * Math.sin(sw), ty + p * Math.sin(sw) + r * Math.cos(sw)));
    env.poly(tp, J.mix(toothC, darkOf(sc), 0.15), out, false);
    const hole = S(tx - Math.sin(sw) * tabL * 0.75, ty + Math.cos(sw) * tabL * 0.75);
    env.circle(hole[0], hole[1], bw * 0.12, cloth, null, 0, out, false);
    return bb;
  },
});

/* ================================================================== 28 sliceStack — スライス積層 */
reg('sliceStack', {
  name: 'スライス積層', tags: ['glitch', 'graphic', 'pop'], w: 0.9, emph: 1.2, ae: 'stack', fits: n => n >= 1 && n <= 14,
  enterBias: { cut: 2, blur: 0.8, flicker: 0.8, slice: 0.2, wipe: 0.4 },
  plan(rng, cut, st) {
    const mode = rng.pick(['blinds', 'blinds', 'stack', 'wave']);
    return { font: rng.pick(fontsOf(st, ['display'])), mode, slices: mode === 'blinds' ? rng.int(6, 9) : rng.int(6, 8), gap: rng.range(0.3, 0.55), side: rng.pick(['accent', 'accent', 'sub']), amp: rng.range(0.08, 0.16), dir: rng.pick([1, -1]), plate: rng.pick(['ink', 'accent']) };
  },
  render(env) {
    const { W, H, sc, ctx } = env, cut = env.cut, Pm = cut.params, s = cut.seed, u = U(env), lt = env.lt;
    const port = isPort(env);
    const text = brk(cut.text, port ? 5 : 8);
    const o = { track: 0.02, lead: 1.02 };
    const blinds = Pm.mode === 'blinds';
    const size = Math.min(J.fitSize(text, Pm.font, W * (blinds ? 0.74 : 0.78), H * (blinds ? 0.46 : 0.42), o), u * 0.3);
    const m = J.measure(Object.assign({ text, font: Pm.font, size }, o));
    const Sn = Pm.slices;
    const out = tout(env);
    const tbx = W / 2, tby = H / 2;
    let bb = null;
    if (blinds) {
      // venetian blind: slats carrying the lyric turn open, a ripple runs through them, they turn shut again
      const padX = size * 0.45, padY = size * 0.3;
      const bh = m.h + padY * 2, hs = bh / Sn, gp = hs * 0.08;
      const x0 = tbx - m.w / 2 - padX, w = m.w + padX * 2, yTop = tby - bh / 2;
      const pc = plateCol(sc, Pm.plate === 'accent' ? [sc.accent, sc.ink] : [sc.ink, sc.accent]);
      const tc = onCol(sc, pc), backC = shade(sc, pc, -0.45);
      const mot = env.fx.motion ?? 0.7;
      // cord + rail
      const ra = tin(env, 0, 0.3, E.outCubic) * out;
      env.rect(x0 - size * 0.08, yTop - hs * 0.55, w + size * 0.16, hs * 0.3, shade(sc, pc, -0.2), ra, false);
      for (const cxr of [x0 + w * 0.2, x0 + w * 0.8]) env.line([[cxr, yTop - hs * 0.3], [cxr, yTop + bh * ra]], sc.sub, Math.max(1, u * 0.0015), 0.6 * ra, false);
      for (let i = 0; i < Sn; i++) {
        const f = Sn > 1 ? i / (Sn - 1) : 0;
        let ph = (1 - E.outBack(J.clamp((lt - 0.05 - f * 0.25) / 0.45), 1.3)) * 90;
        ph += Math.sin(env.ltb * 2.4 - i * 0.7) * 16 * mot * J.clamp((lt - 0.6) / 0.4);
        ph -= E.inCubic(J.clamp(env.pOut * 1.3 - f * 0.3)) * 90;
        const c = Math.cos(ph * J.DEG);
        const slotY = yTop + i * hs, yc = slotY + hs / 2, hv = (hs - gp) * Math.abs(c);
        if (hv < 0.6) continue;
        const face = c > 0;
        env.rect(x0, yc - hv / 2, w, hv, face ? shade(sc, pc, -0.35 * (1 - c)) : backC, out, false);
        env.line([[x0, yc + hv / 2], [x0 + w, yc + hv / 2]], darkOf(sc), Math.max(1, hs * 0.04), 0.35 * out, false);
        if (!face || c < 0.08) continue;
        ctx.save(); ctx.beginPath(); ctx.rect(x0, yc - hv / 2, w, hv); ctx.clip();
        const by0 = tby - bh / 2 + i * hs;
        ctx.translate(0, yc); ctx.scale(1, c); ctx.translate(0, -yc + (slotY - by0));
        const r = J.mainDraw(env, Object.assign({ text, font: Pm.font, size, x: tbx, y: tby, color: tc, noHold: true, plain: true, mi: 0 }, o));
        ctx.restore();
        if (r) bb = bb || r;
      }
      return bb ? box(x0, yTop, x0 + w, yTop + bh) : null;
    }
    const hs = (m.h + size * 0.1) / Sn, gp = hs * Pm.gap;
    const totH = Sn * hs + (Sn - 1) * gp;
    const y0 = H / 2 - totH / 2;
    const sideC = Pm.side === 'accent' ? sc.accent : J.mix(sc.fg, sc.bg, 0.55);
    const dep = Math.min(gp * 0.9, size * 0.08);
    const A = size * Pm.amp * (0.5 + 0.7 * (env.fx.motion ?? 0.7));
    for (let i = 0; i < Sn; i++) {
      const f = Sn > 1 ? i / (Sn - 1) : 0.5;
      let dx;
      if (Pm.mode === 'wave') dx = A * Math.sin(f * J.TAU * 0.9 + env.ltb * 2.2 * Pm.dir);
      else dx = A * 1.4 * (f - 0.5) * 2 * Pm.dir * (0.75 + 0.25 * Math.cos(env.ltb * 1.1));
      const ei = J.clamp((lt - i * 0.025) / 0.45);
      dx += (1 - E.outExpo(ei)) * W * 0.7 * (i % 2 ? 1 : -1);
      dx += E.inCubic(J.clamp(env.pOut * 1.3 - f * 0.3)) * W * 0.8 * (i % 2 ? -1 : 1);
      const by0 = tby - (Sn * hs) / 2 + i * hs;
      const slotY = y0 + i * (hs + gp);
      const dy = slotY - by0;
      if (env.pass === 'main') {
        ctx.save(); ctx.beginPath(); ctx.rect(-W, slotY + hs - 0.5, W * 3, dep + 0.5); ctx.clip();
        ctx.translate(dx + dep * 0.5, dy + dep);
        J.mainDraw(env, Object.assign({ text, font: Pm.font, size, x: tbx, y: tby, color: sideC, ghost: false, noHold: true, mi: 0 }, o));
        ctx.restore();
      }
      ctx.save(); ctx.beginPath(); ctx.rect(-W, slotY, W * 3, hs + 0.5); ctx.clip();
      ctx.translate(dx, dy);
      const r = J.mainDraw(env, Object.assign({ text, font: Pm.font, size, x: tbx, y: tby, color: sc.fg, noHold: true, mi: 0 }, o));
      ctx.restore();
      if (r && !bb) bb = r;
    }
    const w2 = m.w / 2 + A * 1.4;
    return bb ? box(tbx - w2, y0, tbx + w2, y0 + totH) : null;
  },
});

/* ================================================================== 29 glitchGrid — グリッチ格子 */
reg('glitchGrid', {
  name: 'グリッチ格子', tags: ['glitch', 'graphic'], w: 0.8, busy: true, ae: 'tile', fits: n => n >= 1 && n <= 14,
  enterBias: { cut: 2.5, flicker: 1.5, scramble: 1.2, blur: 0.4, slice: 0.8, wipe: 0.3 },
  plan(rng, cut, st) {
    return { font: rng.pick(fontsOf(st, ['display'])), rate: rng.int(3, 6), inv: rng.range(0.1, 0.22), labels: rng.chance(0.75), gut: rng.range(0.008, 0.016) };
  },
  render(env) {
    const { W, H, sc, ctx } = env, cut = env.cut, Pm = cut.params, s = cut.seed, u = U(env), lt = env.lt;
    const port = isPort(env), sq = !port && W < H * 1.45;
    const C = port ? 3 : sq ? 3 : 4, R = port ? 5 : 3;
    const g = u * Pm.gut, mx = W * 0.04, my = H * 0.05;
    const cw = (W - mx * 2 - g * (C - 1)) / C, ch = (H - my * 2 - g * (R - 1)) / R;
    // the clean cell: a full middle row in portrait, the middle two (or three) cells otherwise
    const cr = Math.floor(R / 2);
    const cc0 = port ? 0 : C === 4 ? 1 : 0, cc1 = port ? C - 1 : C === 4 ? 2 : C - 1;
    const out = tout(env);
    const text = flat(cut.text), t2 = brk(cut.text, port ? 5 : 8);
    const cols = [sc.fg, sc.accent, sc.sub, sc.ghostA, sc.ghostB].filter(c => c && J.contrast(c, sc.bg) > 1.4);
    const lw = Math.max(1, u * 0.0015);
    const cellRect = (r, c0, c1) => [mx + c0 * (cw + g), my + r * (ch + g), (c1 - c0 + 1) * cw + (c1 - c0) * g, ch];
    for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
      if (r === cr && c >= cc0 && c <= cc1) continue;
      const id = r * C + c;
      const t1 = 0.03 + J.r(s, id, 1) * 0.35;
      const on = lt > t1 && (lt - t1 > 0.12 || J.r(s, id, env.step, 2) < 0.6) && !(env.pOut > J.r(s, id, 3) * 0.8 + 0.1);
      if (!on) continue;
      const [x, y, w, h] = cellRect(r, c, c);
      const kk = Math.floor((env.step + J.h(s, id, 4) % 7) / Pm.rate);
      const inv = J.r(s, id, kk, 5) < Pm.inv;
      const col = J.mix(cols[J.h(s, id, kk, 6) % cols.length], sc.bg, 0.25);
      const zoom = J.rr(1.4, 3.6, s, id, kk, 7);
      const fsz = Math.min(h * 0.9, w * 0.9) * zoom * 0.5;
      const ox = J.rs(s, id, kk, 8) * w * 0.5, oy = J.rs(s, id, kk, 9) * h * 0.3;
      if (inv) env.rect(x, y, w, h, col, out * 0.85, false); else env.rect(x, y, w, h, J.mix(sc.bg, sc.fg, 0.04), out, false);
      if (env.pass === 'main') {
        ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
        const fresh = (env.step + J.h(s, id, 4) % 7) % Pm.rate === 0;
        const sl = fresh ? J.rs(s, id, env.step, 10) * w * 0.12 : 0;
        env.draw({ text, font: Pm.font, size: fsz, x: x + w / 2 + ox + sl, y: y + h / 2 + oy, color: inv ? onCol(sc, col) : col, alpha: out * (inv ? 0.9 : 0.6), ghost: false });
        if (fresh) env.rect(x, y + h * J.r(s, id, env.step, 11), w, h * 0.06, inv ? onCol(sc, col) : col, 0.6 * out, false);
        ctx.restore();
        if (Pm.labels) env.draw({ text: `CH.${pad2(id + 1)}  x${zoom.toFixed(1)}`, font: monoF(env), size: Math.max(10, u * 0.013), align: 'left', x: x + u * 0.01, y: y + u * 0.016, color: inv ? onCol(sc, col) : sc.sub, alpha: 0.8 * out, ghost: false });
      }
      env.rrect(x, y, w, h, 0, null, out, false, J.mix(sc.bg, sc.fg, 0.2), lw);
    }
    // the clean cell
    const [x, y, w, h] = cellRect(cr, cc0, cc1);
    const e = E.outExpo(J.clamp(lt / 0.35));
    env.rrect(x + w / 2 - w / 2 * e, y, w * e, h, 0, null, out, false, sc.accent, Math.max(2, u * 0.003));
    const o = { track: 0.04, lead: 1.1 };
    const size = Math.min(J.fitSize(t2, Pm.font, w * 0.88, h * 0.8, o), u * 0.24);
    if (Pm.labels && env.pass === 'main') env.draw({ text: 'REC ● CLEAN', font: monoF(env), size: Math.max(10, u * 0.014), align: 'left', x: x + u * 0.012, y: y + u * 0.018, color: sc.accent, alpha: out * (env.step % 4 < 3 ? 1 : 0.3), ghost: false });
    return J.mainDraw(env, Object.assign({ text: t2, font: Pm.font, size, x: x + w / 2, y: y + h / 2, color: sc.fg }, o));
  },
});

/* ================================================================== 30 mosaicTiles — タイル画 */
let _mcv = null;
const mosaicSample = (text, font, D, lead) => memo('mos|' + text + '|' + font + '|' + D + '|' + lead, () => {
  const SS = 4, fpx = D * SS;
  const lay = J.layoutText({ text, font, size: fpx, lead });
  const cols = Math.ceil(lay.W / SS) + 2, rows = Math.ceil(lay.H / SS) + 2;
  const cw = cols * SS, chh = rows * SS;
  try { if (!_mcv) _mcv = document.createElement('canvas'); } catch (e) { return { cols, rows, lit: [] }; }
  _mcv.width = cw; _mcv.height = chh;
  const x = _mcv.getContext('2d', { willReadFrequently: true });
  x.clearRect(0, 0, cw, chh);
  x.font = J.fontCSS(font, fpx); x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#fff'; x.strokeStyle = '#fff'; x.lineWidth = SS * 0.7; x.lineJoin = 'round';
  for (const g of lay) if (g.ch !== ' ' && g.ch !== '　') { x.fillText(g.ch, cw / 2 + g.x, chh / 2 + g.y); x.strokeText(g.ch, cw / 2 + g.x, chh / 2 + g.y); }
  const id = x.getImageData(0, 0, cw, chh).data, lit = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    let a = 0;
    for (let yy = 0; yy < SS; yy++) for (let xx = 0; xx < SS; xx++) a += id[((r * SS + yy) * cw + c * SS + xx) * 4 + 3];
    if (a / (SS * SS * 255) > 0.42) lit.push(c, r);
  }
  return { cols, rows, lit };
});
reg('mosaicTiles', {
  name: 'タイル画', tags: ['pop', 'graphic', 'glitch'], w: 0.7, treat: false, ae: 'center', fits: n => n >= 1 && n <= 12,
  enterBias: { cut: 3, flicker: 0.8, blur: 0.3, slice: 0.2, wipe: 0.3, assemble: 0.2 },
  plan(rng, cut, st) {
    return { font: rng.pick(fontsOf(st, ['display'])), D: rng.int(9, 12), wave: rng.pick(['diag', 'random', 'center']), rot: rng.chance(0.4), col: rng.pick(['fg', 'accent', 'fg']), floor: rng.chance(0.75) };
  },
  render(env) {
    const { W, H, sc, ctx } = env, cut = env.cut, Pm = cut.params, s = cut.seed, u = U(env), lt = env.lt;
    const port = isPort(env);
    const text = brk(cut.text, port ? 4 : 7);
    const lead = 1.15, D = Pm.D;
    const smp = mosaicSample(text, Pm.font, D, lead);
    if (!smp.lit.length) return null;
    const p = Math.min(W * 0.88 / smp.cols, H * 0.66 / smp.rows);
    const gw = smp.cols * p, gh = smp.rows * p, gx = W / 2 - gw / 2, gy = H / 2 - gh / 2;
    const out = tout(env);
    const col = Pm.col === 'accent' && J.contrast(sc.accent, sc.bg) > 1.8 ? sc.accent : sc.fg;
    const tileW = p * 0.86, rr = p * 0.14;
    // grout floor: every cell of the panel as a faint tile
    if (Pm.floor && env.pass === 'main') {
      const fa = tin(env, 0, 0.4, E.outCubic) * out;
      ctx.save(); ctx.globalAlpha = fa; ctx.fillStyle = J.mix(sc.bg, sc.fg, 0.07); ctx.beginPath();
      const pad = 1;
      for (let r = -pad; r < smp.rows + pad; r++) for (let c = -pad; c < smp.cols + pad; c++) { const x = gx + (c + 0.5) * p, y = gy + (r + 0.5) * p; ctx.rect(x - tileW / 2, y - tileW / 2, tileW, tileW); }
      ctx.fill(); ctx.restore();
    }
    // lit tiles: a clip path of (animated) tiles, then the lyric drawn fat through it
    const L = smp.lit, NT = L.length / 2;
    const span = J.clamp(cut.dur * 0.3, 0.3, 0.8);
    const ord = (c, r) => Pm.wave === 'diag' ? (c + r) / (smp.cols + smp.rows) : Pm.wave === 'center' ? Math.hypot(c - smp.cols / 2, r - smp.rows / 2) / Math.hypot(smp.cols / 2, smp.rows / 2) : J.r(s, c, r, 3);
    ctx.save(); ctx.beginPath();
    let any = false;
    for (let k = 0; k < L.length; k += 2) {
      const c = L[k], r = L[k + 1];
      const t1 = 0.08 + ord(c, r) * span;
      let e = E.outBack(J.clamp((lt - t1) / 0.22), 1.8);
      const eo = J.clamp(env.pOut * 1.4 - J.r(s, c, r, 4) * 0.4);
      e *= 1 - E.inCubic(eo);
      if (e <= 0.02) continue;
      const x = gx + (c + 0.5) * p, y = gy + (r + 0.5) * p, hw = tileW / 2 * e;
      if (Pm.rot) {
        const a = J.rs(s, c, r, 5) * 0.2 + (1 - e) * 1.2, ca = Math.cos(a) * hw, sa = Math.sin(a) * hw;
        ctx.moveTo(x - ca + sa, y - sa - ca); ctx.lineTo(x + ca + sa, y + sa - ca); ctx.lineTo(x + ca - sa, y + sa + ca); ctx.lineTo(x - ca - sa, y - sa + ca); ctx.closePath();
      } else ctx.rect(x - hw, y - hw, hw * 2, hw * 2);
      any = true;
    }
    if (!any) ctx.rect(-10, -10, 1, 1);
    ctx.clip();
    const fsz = D * p;
    const bb = J.mainDraw(env, { text, font: Pm.font, size: fsz, x: W / 2, y: H / 2, lead, color: col, stroke: p * 1.2, strokeColor: col, strokeUnder: true, noHold: true, mi: 0 });
    // tile-to-tile colour variation + bevel highlight
    if (env.pass === 'main') {
      for (let k = 0; k < L.length; k += 2) {
        const c = L[k], r = L[k + 1], h = J.r(s, c, r, 6);
        if (h > 0.45) continue;
        const x = gx + c * p + (p - tileW) / 2, y = gy + r * p + (p - tileW) / 2;
        env.rect(x, y, tileW, tileW, h < 0.18 ? darkOf(sc) : h < 0.3 ? lightOf(sc) : sc.accent2 || sc.accent, (h < 0.18 ? 0.16 : 0.14) * out, false);
      }
    }
    ctx.restore();
    return bb ? box(gx, gy, gx + gw, gy + gh) : null;
  },
});

/* ================================================================== 31 maskReveal — 文字窓 */
/* give an item a per-glyph fill (pattern / gradient) that survives J.mainDraw resetting charFns */
const withFill = (it, fillOf) => {
  let arr = [];
  const fn = () => (it.pieceFn ? null : { color: fillOf() });
  Object.defineProperty(it, 'charFns', { get: () => arr, set: v => { arr = v; if (Array.isArray(v)) arr.unshift(fn); }, enumerable: true, configurable: true });
  return it;
};
const _tiles = new Map();
const tileCv = (key, w, h, paint) => {
  let cv = _tiles.get(key);
  if (!cv) {
    try { cv = document.createElement('canvas'); } catch (e) { return null; }
    cv.width = Math.max(2, Math.round(w)); cv.height = Math.max(2, Math.round(h));
    paint(cv.getContext('2d'), cv.width, cv.height);
    if (_tiles.size > 30) _tiles.clear();
    _tiles.set(key, cv);
  }
  return cv;
};
reg('maskReveal', {
  name: '文字窓', tags: ['graphic', 'pop', 'emotional'], w: 0.9, treat: false, emph: 1.3, ae: 'huge', fits: n => n >= 1 && n <= 12,
  enterBias: { cut: 1.4, blur: 1.2, wipe: 1.2, slice: 0.8, stretch: 0.8, pop: 0.6, assemble: 0.2 },
  plan(rng, cut, st) {
    return { font: rng.pick(fontsOf(st, ['display'])), scene: rng.pick(['stripes', 'lines', 'dots', 'shine', 'stripes']), ang: rng.range(20, 35) * rng.pick([1, -1]), speed: rng.range(0.6, 1.2), rim: rng.chance(0.65), label: rng.chance(0.6) };
  },
  render(env) {
    const { W, H, sc, ctx } = env, cut = env.cut, Pm = cut.params, u = U(env), lt = env.lt;
    const port = isPort(env);
    const text = brk(cut.text, port ? 4 : 7);
    const o = { track: 0.0, lead: 1.0 };
    const size = Math.min(J.fitSize(text, Pm.font, W * 0.88, H * (port ? 0.56 : 0.66), o), u * 0.46);
    const m = J.measure(Object.assign({ text, font: Pm.font, size }, o));
    const out = tout(env);
    const A = [sc.accent, sc.fg].find(c => J.contrast(c, sc.bg) >= 1.8) || sc.fg;
    const B = [sc.fg, lightOf(sc), sc.accent2].find(c => c && c !== A && J.contrast(c, sc.bg) >= 1.8) || A;
    const sk = env.scale || 1, tb = env.ltb * Pm.speed;
    // the scene seen through the letters, as a pattern / gradient in glyph space (it moves with time)
    const fillOf = () => {
      let pat = null;
      if (Pm.scene === 'shine') {
        const g = ctx.createLinearGradient(-size * 0.6, -size * 0.6, size * 0.6, size * 0.6), ph = ((tb * 0.45) % 1 + 1) % 1;
        const cA = sc.grad ? sc.grad[0] : A, cB = sc.grad ? sc.grad[1] : B;
        for (let k = 0; k <= 6; k++) { const f = k / 6, v = 0.5 + 0.5 * Math.cos((f - ph) * J.TAU); g.addColorStop(f, J.mix(cA, cB, v)); }
        return g;
      }
      let tile, per, m2 = new DOMMatrix();
      if (Pm.scene === 'stripes') {
        per = size * 0.26; const T = Math.max(4, Math.round(per * sk));
        tile = tileCv('st' + A + B + T, T, T, (x, w, h) => { x.fillStyle = B; x.fillRect(0, 0, w, h); x.fillStyle = A; x.fillRect(0, 0, w / 2, h); });
        m2 = m2.rotate(Pm.ang).translate((tb * size * 0.5) % per, 0).scale(per / T);
      } else if (Pm.scene === 'dots') {
        per = size * 0.2; const T = Math.max(4, Math.round(per * sk));
        tile = tileCv('dt' + A + B + T, T, T, (x, w, h) => { x.fillStyle = B; x.fillRect(0, 0, w, h); x.fillStyle = A; x.beginPath(); x.arc(w / 2, h / 2, w * 0.3, 0, J.TAU); x.fill(); });
        m2 = m2.rotate(Pm.ang).translate((tb * size * 0.3) % per, (tb * size * 0.3) % per).scale(per / T);
      } else {
        const ls = size * 0.16, unit = flat(cut.lineText || cut.text) + '　・　', f = bodyF(env);
        const uw = Math.max(ls, J.measure({ text: unit, font: f, size: ls }).w), rh = ls * 1.3;
        const Tw = Math.max(8, Math.round(uw * sk)), Th = Math.max(4, Math.round(rh * 2 * sk));
        tile = tileCv('ln' + unit + f + A + B + Tw + Th, Tw, Th, (x, w, h) => {
          x.fillStyle = B; x.fillRect(0, 0, w, h); x.fillStyle = A; x.font = J.fontCSS(f, ls * sk); x.textBaseline = 'middle'; x.textAlign = 'left';
          x.fillText(unit, 0, h * 0.25); x.fillText(unit, -w / 2, h * 0.75); x.fillText(unit, w / 2, h * 0.75);
        });
        per = uw;
        m2 = m2.translate(-((tb * size * 0.5) % uw), 0).scale(uw / Tw, (rh * 2) / Th);
      }
      if (!tile) return A;
      pat = ctx.createPattern(tile, 'repeat');
      try { pat.setTransform(m2); } catch (e) {}
      return pat;
    };
    const base = () => Object.assign({ text, font: Pm.font, size, x: W / 2, y: H / 2, color: B, mi: 0 }, o);
    const bb = J.mainDraw(env, withFill(base(), fillOf));
    if (Pm.rim) J.mainDraw(env, Object.assign(base(), { fill: false, stroke: Math.max(1.5, size * 0.012), strokeColor: A, alpha: 0.9, ghost: false }));
    if (Pm.label) {
      const ls = smallSize(env), lab = altCopy(env);
      const a = tin(env, 0.25, 0.4, E.outCubic) * out;
      env.draw({ text: lab.length > 30 ? lab.slice(0, 29) + '…' : lab, font: bodyF(env), size: ls, track: 0.2, align: 'left', x: W / 2 - m.w / 2, y: Math.min(H * 0.95, H / 2 + m.h / 2 + ls * 1.8), color: sc.sub, alpha: a, ghost: false });
    }
    return bb;
  },
});

/* ================================================================== 32 contour — 等高線 */
reg('contour', {
  name: '等高線', tags: ['calm', 'graphic', 'emotional'], w: 0.9, ae: 'huge', fits: n => n >= 1 && n <= 16,
  enterBias: { blur: 1.3, cut: 1.2, wipe: 1, slice: 0.6 },
  plan(rng, cut, st) {
    return { font: rng.pick(fontsOf(st, ['display', 'serif'])), fb: rng.pick(fontsOf(st, ['display'])), side: rng.pick([1, -1]), rings: rng.int(4, 6), speed: rng.range(0.25, 0.5), col: rng.pick(['sub', 'accent', 'sub']), place: rng.pick(['low', 'center', 'low']) };
  },
  render(env) {
    const { W, H, sc, ctx } = env, cut = env.cut, Pm = cut.params, u = U(env), lt = env.lt;
    const port = isPort(env);
    const out = tout(env);
    const t0 = strip(cut.text);
    const kan = [...t0].filter(c => J.isKanji(c));
    const big = kan.length ? kan[0] : [...t0].filter(c => !J.isPunct(c) && !J.isSmallKana(c))[0] || [...t0][0] || '';
    const bs = Math.min(H * 0.95, W * (port ? 1.05 : 0.7));
    const bx = W / 2 + Pm.side * W * (port ? 0.12 : 0.2), by = H * 0.5;
    const lineC = Pm.col === 'accent' ? sc.accent : sc.sub;
    // contour rings: a fat stroke in the line colour, then a slightly thinner one in the ground colour → one thin line per level
    const cin = tin(env, 0, 0.5, E.outCubic) * out;
    if (env.pass === 'main' && big && cin > 0.01) {
      const K = Pm.rings, gap = bs * 0.03, lw = Math.max(1.2, bs * 0.0028);
      const ph = ((env.ltb * Pm.speed) % 1 + 1) % 1;
      const grow = E.outCubic(J.clamp(lt / 0.9));
      ctx.save();
      ctx.font = J.fontCSS(Pm.fb, bs); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
      for (let k = K; k >= 1; k--) {
        const wk = 2 * gap * (k - 1 + ph) * grow + gap * 0.6;
        const a = (k === K ? 1 - ph : 1) * (1 - 0.1 * k) * cin;
        if (a <= 0.01) continue;
        ctx.globalAlpha = a * 0.8; ctx.strokeStyle = lineC; ctx.lineWidth = wk + lw; ctx.strokeText(big, bx, by);
        ctx.globalAlpha = 0.94 * cin; ctx.strokeStyle = sc.bg; ctx.lineWidth = Math.max(0.1, wk - lw); ctx.strokeText(big, bx, by);
      }
      ctx.globalAlpha = 0.94 * cin; ctx.fillStyle = sc.bg; ctx.fillText(big, bx, by);
      ctx.globalAlpha = cin; ctx.strokeStyle = lineC; ctx.lineWidth = lw * 1.6; ctx.strokeText(big, bx, by);
      ctx.restore();
    }
    // the lyric, small and solid, in the calm area beside the big character
    const text = brk(cut.text, port ? 6 : 8);
    const o = { track: 0.06, lead: 1.25 };
    const size = Math.min(J.fitSize(text, Pm.font, W * (port ? 0.8 : 0.5), H * 0.3, o), u * 0.12);
    const m = J.measure(Object.assign({ text, font: Pm.font, size }, o));
    const tx = port ? W / 2 : W / 2 - Pm.side * W * 0.2, ty = Pm.place === 'low' ? H * (port ? 0.78 : 0.7) : H / 2;
    const mx = J.clamp(tx, W * 0.06 + m.w / 2, W * 0.94 - m.w / 2);
    const bb = J.mainDraw(env, Object.assign({ text, font: Pm.font, size, x: mx, y: ty, color: sc.fg }, o));
    const la = tin(env, 0.3, 0.4, E.outCubic) * out;
    if (bb && la > 0) {
      const ls = smallSize(env) * 0.9;
      env.line([[bb.x0, bb.y0 - ls * 1.2], [bb.x0 + (bb.x1 - bb.x0) * la, bb.y0 - ls * 1.2]], lineC, Math.max(1, u * 0.0015), 0.8, false);
      env.draw({ text: `${big}  ─  No.${lineNo(env)}`, font: monoF(env), size: ls, track: 0.2, align: 'left', x: bb.x0, y: bb.y0 - ls * 2.3, color: sc.sub, alpha: la, ghost: false });
    }
    return bb;
  },
});

/* ================================================================== 33 halftoneBig — 網点巨大文字 */
let _hcv = null;
/* alpha coverage of a text block, sampled once (em = 64 px) and memoised */
const coverage = (text, font, lead, track) => memo('cov|' + text + '|' + font + '|' + lead + '|' + track, () => {
  const S = 64, lay = J.layoutText({ text, font, size: S, lead, track });
  const pad = 8, cw = Math.ceil(lay.W) + pad * 2, ch = Math.ceil(lay.H) + pad * 2;
  try { if (!_hcv) _hcv = document.createElement('canvas'); } catch (e) { return null; }
  _hcv.width = cw; _hcv.height = ch;
  const x = _hcv.getContext('2d', { willReadFrequently: true });
  x.clearRect(0, 0, cw, ch); x.font = J.fontCSS(font, S); x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#fff';
  for (const g of lay) if (g.ch !== ' ' && g.ch !== '　') x.fillText(g.ch, cw / 2 + g.x, ch / 2 + g.y);
  const d = x.getImageData(0, 0, cw, ch).data, a = new Uint8Array(cw * ch);
  for (let i = 0; i < a.length; i++) a[i] = d[i * 4 + 3];
  return { S, cw, ch, a };
});
reg('halftoneBig', {
  name: '網点巨大文字', tags: ['pop', 'graphic', 'editorial'], w: 0.9, treat: false, emph: 1.3, ae: 'huge', fits: n => n >= 1 && n <= 10,
  enterBias: { cut: 1.6, blur: 1, wipe: 1, slice: 0.6, stretch: 0.6, assemble: 0.2 },
  plan(rng, cut, st) {
    return { font: rng.pick(fontsOf(st, ['display'])), mode: rng.pick(['duo', 'duo', 'tone']), ang: rng.range(15, 40) * rng.pick([1, -1]), shape: rng.pick(['dot', 'dot', 'line']), speed: rng.range(0.4, 0.8), crop: rng.chance(0.35) };
  },
  render(env) {
    const { W, H, sc, ctx } = env, cut = env.cut, Pm = cut.params, u = U(env), lt = env.lt;
    const port = isPort(env);
    const text = brk(cut.text, port ? 4 : 5);
    const o = { track: -0.02, lead: 0.98 };
    const fitW = Pm.crop ? 1.12 : 0.9;
    const size = Math.min(J.fitSize(text, Pm.font, W * fitW, H * (port ? 0.6 : 0.8), o), u * 0.7);
    const m = J.measure(Object.assign({ text, font: Pm.font, size }, o));
    const dotC = [sc.fg, lightOf(sc)].find(c => J.contrast(c, sc.bg) >= 3) || sc.fg;
    const duoC = [sc.accent, sc.accent2].find(c => c && J.contrast(c, sc.bg) >= 1.6 && c !== dotC) || sc.sub;
    const it = () => Object.assign({ text, font: Pm.font, size, x: W / 2, y: H / 2, color: dotC, mi: 0 }, o);
    if (Pm.mode === 'duo') {
      const d = size * 0.045;
      J.mainDraw(env, Object.assign(it(), { x: W / 2 + d, y: H / 2 + d, color: duoC, ghost: false }));
    }
    const cov = coverage(text, Pm.font, o.lead, o.track);
    if (env.pass !== 'main' || !cov) return J.mainDraw(env, it());
    // dots of a rotated screen whose centre falls inside the letters; the text is drawn through them
    const pitch = Math.max(6, size * 0.068);
    const a = Pm.ang * J.DEG, ca = Math.cos(a), sa = Math.sin(a);
    const grow = E.outCubic(J.clamp(lt / 0.7)) * (1 - 0.6 * E.inCubic(env.pOut));
    const ph = env.ltb * Pm.speed;
    const k = cov.S / size, cx = W / 2, cy = H / 2;
    const R = Math.hypot(m.w, m.h) / 2 + pitch, N = Math.ceil(R / pitch);
    ctx.save(); ctx.beginPath();
    let cnt = 0;
    for (let j = -N; j <= N && cnt < 4000; j++) for (let i = -N; i <= N && cnt < 4000; i++) {
      const lx = i * pitch, ly = j * pitch;
      const x = cx + lx * ca - ly * sa, y = cy + lx * sa + ly * ca;
      const px = Math.round((x - cx) * k + cov.cw / 2), py = Math.round((y - cy) * k + cov.ch / 2);
      if (px < 0 || py < 0 || px >= cov.cw || py >= cov.ch || cov.a[py * cov.cw + px] < 60) continue;
      const f = (lx / R) * 0.5 + 0.5;
      const tone = J.clamp(0.3 + 0.7 * (0.5 + 0.5 * Math.sin((f * 1.6 - ph) * Math.PI)));
      const r = pitch * 0.66 * Math.sqrt(tone) * grow;
      if (r < 0.4) continue;
      if (Pm.shape === 'line') { const hw = pitch * 0.5, hh = r * 0.72; ctx.moveTo(x - hw * ca + hh * sa, y - hw * sa - hh * ca); ctx.lineTo(x + hw * ca + hh * sa, y + hw * sa - hh * ca); ctx.lineTo(x + hw * ca - hh * sa, y + hw * sa + hh * ca); ctx.lineTo(x - hw * ca - hh * sa, y - hw * sa + hh * ca); ctx.closePath(); }
      else { ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, J.TAU); }
      cnt++;
    }
    if (!cnt) ctx.rect(-10, -10, 1, 1);
    ctx.clip();
    const bb = J.mainDraw(env, Object.assign(it(), { stroke: pitch * 0.5, strokeColor: dotC, strokeUnder: true }));
    ctx.restore();
    return bb;
  },
});

/* ================================================================== 34 stencil — ステンシル */
reg('stencil', {
  name: 'ステンシル', tags: ['graphic', 'pop', 'editorial'], w: 0.8, treat: false, ae: 'center', fits: n => n >= 1 && n <= 14,
  enterBias: { cut: 1.8, wipe: 1.4, blur: 0.8, slice: 0.4, pop: 0.4, assemble: 0.2 },
  plan(rng, cut, st) {
    return { font: rng.pick(fontsOf(st, ['display'])), col: rng.pick(['accent', 'fg', 'accent']), drips: rng.int(1, 3), marks: rng.chance(0.75), dir: rng.pick([1, -1]), tilt: rng.range(-3, 3) };
  },
  render(env) {
    const { W, H, sc, ctx } = env, cut = env.cut, Pm = cut.params, s = cut.seed, u = U(env), lt = env.lt;
    const port = isPort(env);
    const text = brk(cut.text, port ? 4 : 7);
    const o = { track: 0.08, lead: 1.12 };
    const size = Math.min(J.fitSize(text, Pm.font, W * 0.84, H * (port ? 0.5 : 0.56), o), u * 0.32);
    const m = J.measure(Object.assign({ text, font: Pm.font, size }, o));
    const out = tout(env);
    const col = Pm.col === 'accent' && J.contrast(sc.accent, sc.bg) >= 1.8 ? sc.accent : sc.fg;
    const it = () => Object.assign({ text, font: Pm.font, size, x: W / 2, y: H / 2, rot: Pm.tilt, color: col, mi: 0 }, o);
    const x0 = W / 2 - m.w / 2, x1 = W / 2 + m.w / 2, y0 = H / 2 - m.h / 2, y1 = H / 2 + m.h / 2;
    // glyph boxes at rest (item space → design space through the tilt)
    const lay = m.lay, tr = Pm.tilt * J.DEG, ct = Math.cos(tr), st2 = Math.sin(tr);
    const boxes = [];
    for (const g of lay) if (g.ch !== ' ' && g.ch !== '　' && !J.isPunct(g.ch)) boxes.push({ lx: g.x, ly: g.y, w: g.w, h: g.h, x: W / 2 + g.x * ct - g.y * st2, y: H / 2 + g.x * st2 + g.y * ct });
    const sw = J.clamp(cut.dur * 0.3, 0.35, 0.9);
    const f = E.inOutSine(J.clamp((lt - 0.05) / sw));
    const head = Pm.dir > 0 ? J.lerp(x0 - size * 0.3, x1 + size * 0.3, f) : J.lerp(x1 + size * 0.3, x0 - size * 0.3, f);
    if (Pm.marks) {
      const a = tin(env, 0, 0.35, E.outCubic) * out, L = size * 0.18, lw = Math.max(1, u * 0.0016), p = size * 0.28;
      for (const [cx, cy] of [[x0 - p, y0 - p], [x1 + p, y0 - p], [x1 + p, y1 + p], [x0 - p, y1 + p]]) {
        env.line([[cx - L, cy], [cx + L, cy]], sc.sub, lw, a, false); env.line([[cx, cy - L], [cx, cy + L]], sc.sub, lw, a, false);
        env.circle(cx, cy, L * 0.45, null, sc.sub, lw, a, false);
      }
      env.draw({ text: `No.${lineNo(env)}  /  ${J.fmtTime(cut.start)}`, font: monoF(env), size: smallSize(env), track: 0.25, align: 'left', x: x0 - p + L * 1.4, y: y0 - p, color: sc.sub, alpha: a, ghost: false });
    }
    // clip: sprayed side of the nozzle, minus the stencil bridges (even-odd holes)
    ctx.save(); ctx.beginPath();
    if (Pm.dir > 0) ctx.rect(-W, -H, head + W, H * 3); else ctx.rect(head, -H, W * 2, H * 3);
    ctx.clip();
    ctx.beginPath(); ctx.rect(-W, -H, W * 3, H * 3);
    ctx.translate(W / 2, H / 2); ctx.rotate(tr);
    const bw = size * 0.05;
    boxes.forEach((b, i) => {
      const vx = b.lx + ((i % 3) - 1) * b.w * 0.06;
      ctx.rect(vx - bw / 2, b.ly - b.h * 0.62, bw, b.h * 1.24);
      if (i % 2) { const hy = b.ly - b.h * 0.06 - bw / 2; ctx.rect(b.lx - b.w * 0.62, hy, (vx - bw / 2) - (b.lx - b.w * 0.62), bw); ctx.rect(vx + bw / 2, hy, (b.lx + b.w * 0.62) - (vx + bw / 2), bw); }
    });
    ctx.setTransform(ctx.getTransform().rotate(-Pm.tilt).translate(-W / 2, -H / 2));
    ctx.clip('evenodd');
    const bb = J.mainDraw(env, it());
    ctx.restore();
    if (env.pass !== 'main') return bb;
    // overspray mist, drips, and the nozzle's cloud while spraying
    ctx.save(); ctx.translate(W / 2, H / 2); ctx.rotate(tr); ctx.translate(-W / 2, -H / 2);
    ctx.fillStyle = col; ctx.globalAlpha = 0.5 * out; ctx.beginPath();
    boxes.forEach((b, i) => {
      for (let k = 0; k < 22; k++) {
        const ang = J.r(s, i, k, 1) * J.TAU, rr = 0.5 + J.r(s, i, k, 2) * 0.35;
        const x = W / 2 + b.lx + Math.cos(ang) * b.w * rr * 0.62, y = H / 2 + b.ly + Math.sin(ang) * b.h * rr * 0.62;
        if ((Pm.dir > 0 && x > head) || (Pm.dir < 0 && x < head)) continue;
        const r = size * (0.004 + J.r(s, i, k, 3) * 0.008);
        ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, J.TAU);
      }
    });
    ctx.fill();
    ctx.globalAlpha = out;
    for (let d = 0; d < Pm.drips && boxes.length; d++) {
      const b = boxes[J.h(s, d, 7) % boxes.length];
      const dx = W / 2 + b.lx + J.rs(s, d, 8) * b.w * 0.3, top = H / 2 + b.ly + b.h * 0.35;
      const t1 = 0.3 + d * 0.25 + (Pm.dir > 0 ? (dx - x0) / Math.max(1, x1 - x0) : (x1 - dx) / Math.max(1, x1 - x0)) * sw;
      const L = size * J.rr(0.25, 0.55, s, d, 9) * E.outCubic(J.clamp((lt - t1) / 1.4));
      if (L <= 1) continue;
      const w0 = size * 0.035;
      ctx.beginPath(); ctx.moveTo(dx - w0 / 2, top); ctx.lineTo(dx + w0 / 2, top); ctx.lineTo(dx + w0 * 0.35, top + L); ctx.lineTo(dx - w0 * 0.35, top + L); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.arc(dx, top + L, w0 * 0.6, 0, J.TAU); ctx.fill();
    }
    ctx.restore();
    if (f > 0 && f < 1) {
      for (let k = 0; k < 24; k++) {
        const yy = J.lerp(y0, y1, J.r(s, k, env.step, 11)), xx = head + J.rs(s, k, env.step, 12) * size * 0.25;
        env.circle(xx, yy, size * (0.01 + J.r(s, k, 13) * 0.02), col, null, 0, 0.35 * out, false);
      }
    }
    return bb;
  },
});

})();
