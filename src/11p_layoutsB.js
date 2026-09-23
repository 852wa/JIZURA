/* JIZURA pack: layoutsB — kinetic / typographic layouts (rain, hanging, orbit, tunnel, word cloud, mechanical reveals …) */
(() => {
'use strict';
const E = J.E;
const P = 'layoutsB';

/* ------------------------------------------------------------------ helpers */
const clean = t => String(t || '').replace(/\s+/g, '');
/* glyph slots keeping single word gaps (latin lyrics): a ' ' slot is left empty */
const slotsOf = t => [...String(t || '').trim().replace(/[\s\u3000]+/g, ' ')];
/* reading in capitals — only for kana text (latin would just be echoed back) */
const romaOf = t => { const c = clean(t); if (!/[\u3041-\u30ff]/.test(c)) return null; const r = J.romaji(c); return r ? r.toUpperCase() : null; };
/* J.splitLines, but never leave a line of punctuation only */
const splitL = (t, per) => {
  const ls = J.splitLines(t, per).split('\n');
  const out = [];
  for (const l of ls) { if (out.length && [...l].every(c => J.isPunct(c) || c === ' ')) out[out.length - 1] += l; else out.push(l); }
  return out.join('\n');
};
const fontsOf = (st, roles) => J.fontsOf(st, roles);
const monoF = env => (env.st.fonts.mono && env.st.fonts.mono[0]) || 'mono';
const inE = (env, d = 0.35, delay = 0) => E.outExpo(J.clamp((env.lt - delay) / d));
const outK = env => 1 - E.inCubic(env.pOut);
/* chromatic ghosts on big plates only while they fly in (never trailing into the next cut) */
const gIn = env => env.lt < 0.6 && env.pOut <= 0;
/* text that sits in its own key / cell / plate only takes holds that keep it in place */
const plateHold = env => !['still', 'jitter', 'breathe', 'glitchtick'].includes(env.cut.hold);
const bbRect = (x0, y0, x1, y1) => ({ x0, y0, x1, y1, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, boxes: [] });
const U = J.unionBB;
/* motion index that makes J.mainDraw start this item's entrance at local time t */
const miAt = (env, t) => Math.max(0, t) / Math.max(0.005, env.cut.stagger || 0.04);
/* best-contrast scheme colour for text sitting on a plate of colour `fill` */
const _onc = new Map();
const onCol = (sc, fill) => {
  const key = fill + sc.bg + sc.fg + sc.ink + sc.accent;
  let v = _onc.get(key);
  if (v) return v;
  let best = null, bv = 0;
  for (const c of [sc.bg, sc.fg, sc.ink, sc.accent, sc.sub]) { if (!c || c === fill) continue; const k = J.contrast(c, fill); if (k > bv) { bv = k; best = c; } }
  v = bv >= 2.4 ? best : (J.lum(fill) > 0.5 ? '#111111' : '#FFFFFF');
  if (_onc.size > 200) _onc.clear();
  _onc.set(key, v); return v;
};
/* a colour from the scheme that reads against the background (for plates / bars) */
const plateCol = (sc, pref) => {
  for (const c of pref) if (c && J.contrast(c, sc.bg) >= 1.6) return c;
  return sc.fg;
};
/* glyph centres of a laid-out text item (design space, before rotation) */
const glyphPts = (it) => {
  const lay = J.layoutText(it), sx = it.sx || 1, sy = it.sy || 1, out = [];
  for (const g of lay) { if (g.ch === ' ' || g.ch === '　') continue; out.push({ ch: g.ch, x: it.x + g.x * sx, y: it.y + g.y * sy, w: g.w * sx, h: g.h * sy, li: g.li, ci: g.ci, i: out.length }); }
  return out;
};
/* draw a string of glyphs each placed by fn(i) -> {x, y, rot, s, a, color} | null  (one item, main pass only) */
const pathText = (env, chars, font, size, fn, extra) => {
  if (!chars.length || size < 1) return;
  const it = Object.assign({ text: chars.join(''), font, size, x: 0, y: 0, ghost: false }, extra || {});
  it._lay = J.layoutText(it);
  it.charFn = (i, g) => { const r = fn(i, g); if (!r) return { hide: true }; return { dx: r.x - g.x, dy: r.y - g.y, rot: r.rot || 0, s: r.s ?? 1, a: r.a ?? 1, color: r.color }; };
  env.draw(it);
};
/* main-text lines for a width budget: portrait → short lines */
const mainLines = (text, W, H, perL = 11, perP = 5) => {
  const t = String(text || '').trim(), n = J.glyphCount(t);
  const per = W < H ? perP : perL;
  if (n <= per) return t;
  return splitL(t, Math.ceil(n / Math.ceil(n / per)));
};
const KATA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const _pool = new Map();
const poolOf = (cut) => {
  const key = cut.lineText + '|' + cut.text;
  let p = _pool.get(key);
  if (!p) {
    const own = [...clean((cut.lineText || '') + cut.text)].filter(c => !J.isLatin(c) && !J.isPunct(c) && c !== '・');
    p = own.concat([...KATA].filter((c, i) => i % 2 === 0));
    if (_pool.size > 100) _pool.clear();
    _pool.set(key, p);
  }
  return p;
};
/* rounded-rect path on ctx (no draw) */
const rrPath = (ctx, x, y, w, h, r) => {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
};

/* ================================================================== 1 rain — 文字の雨 */
J.register('layout', 'rain', {
  name: '文字の雨', nameEn: 'Character rain', tags: ['glitch', 'graphic', 'emotional'], w: 0.9, busy: true, fits: n => n >= 1 && n <= 16,
  enterBias: { cut: 2.4, flicker: 1.4, scramble: 1.4, blur: 1.1, type: 0.3, wipe: 0.4, slice: 0.4, stretch: 0.5, assemble: 0.5 },
  plan(rng, cut, st) {
    const port = cut.H > cut.W;
    const monos = (st.fonts.mono || []).filter(k => k === 'dot');
    return {
      font: rng.pick(fontsOf(st, ['display', 'serif'])),
      rf: monos.length && rng.chance(0.5) ? 'dot' : rng.pick(fontsOf(st, ['body'])),
      orient: cut.n <= 7 && rng.chance(port ? 0.6 : 0.3) ? 'v' : 'h',
      density: rng.range(0.5, 0.72), speed: rng.range(0.85, 1.25), tint: rng.pick(['sub', 'sub', 'accent']),
      order: rng.pick(['ltr', 'random', 'random']),
    };
  },
  render(env) {
    const { W, H, sc } = env, cut = env.cut, Pm = cut.params, s = cut.seed, M = Math.min(W, H), lt = env.lt;
    const vert = Pm.orient === 'v';
    const mt = vert ? clean(cut.text) : mainLines(cut.text, W, H, 11, 6);
    const base = { text: mt, font: Pm.font, x: W / 2, y: H / 2, track: 0.1, lead: 1.25, vertical: vert };
    base.size = Math.min(J.fitSize(mt, Pm.font, W * (vert ? 0.5 : 0.84), H * (vert ? 0.8 : 0.5), base), vert ? H * 0.15 : H * 0.24);
    const gl = glyphPts(base), n = gl.length;
    const lb = J.itemBox(base);
    const kx0 = lb.x0 - base.size * 0.3, kx1 = lb.x1 + base.size * 0.3, ky0 = lb.y0 - base.size * 0.3, ky1 = lb.y1 + base.size * 0.3;
    // --- background streams: stationary glyph grid, a bright head sweeps down each active column
    const pool = poolOf(cut), NP = pool.length;
    const cell = J.clamp(M * 0.036, 16, 64), cols = Math.floor(W / cell), rows = Math.ceil(H / cell);
    const ox = (W - cols * cell) / 2;
    const bgA = E.outCubic(J.clamp(env.ltb / 0.35)) * outK(env);
    const rs = cell * 0.72, trk = (cell - rs) / rs;
    const tail = Pm.tint === 'accent' ? sc.accent : sc.sub;
    if (bgA > 0.01) {
      for (let c = 0; c < cols; c++) {
        if (J.r(s, c, 1) > Pm.density) continue;
        const v = J.rr(8, 16, s, c, 2) * Pm.speed, Ls = J.rr(6, 15, s, c, 3), per = rows + Ls + J.rr(2, rows * 0.8, s, c, 4);
        const hy = ((env.ltb * v + J.r(s, c, 5) * per) % per) - 1;
        const r0 = Math.max(0, Math.ceil(hy - Ls)), r1 = Math.min(rows - 1, Math.floor(hy));
        if (r1 < r0) continue;
        const x = ox + (c + 0.5) * cell, chs = [];
        for (let r = r0; r <= r1; r++) chs.push(pool[J.h(s, c, r, Math.floor((env.step + (J.h(s, r, c) & 15)) / 14)) % NP]);
        const inK = x > kx0 && x < kx1;
        env.draw({ text: chs.join(''), font: Pm.rf, size: rs, track: trk, vertical: true, align: 'left', x, y: r0 * cell + cell * 0.5 - rs * 0.5, color: sc.sub, ghost: false, alpha: bgA,
          charFn: (i) => {
            const r = r0 + i, d = hy - r;
            let a = d < 1 ? 1 : 0.1 + Math.pow(1 - d / Ls, 1.4) * 0.6;
            const cy = (r + 0.5) * cell;
            if (inK && cy > ky0 && cy < ky1) a *= 0.22;
            return d < 1 ? { a, color: sc.fg } : { a };
          } });
      }
    }
    // --- lyric: each glyph is delivered by its own falling stream and locks in place
    const span = J.clamp(cut.dur * 0.2, 0.1, 0.5), fd = J.clamp(cut.dur * 0.1, 0.14, 0.26);
    const rank = gl.map((g, i) => i);
    if (Pm.order === 'random') rank.sort((a, b) => J.r(s, a, 31) - J.r(s, b, 31));
    const pos = new Array(n); rank.forEach((gi, k) => { pos[gi] = k; });
    let bb = null;
    const trailN = 8, ts = J.clamp(base.size * 0.32, cell * 0.8, cell * 1.5), tsp = ts * 1.12;
    gl.forEach((g, i) => {
      const k = vert ? n - 1 - i : pos[i];
      const ta = 0.05 + fd + (n > 1 ? k / (n - 1) : 0) * span;
      const u = (lt - (ta - fd)) / fd;
      if (u > 0 && u < 2) {
        const e = E.inQuad(Math.min(1, u));
        const yh = J.lerp(-tsp * 2, g.y, e);
        const fade = u < 1 ? 1 : 1 - (u - 1);
        const chs = [];
        for (let j = trailN - 1; j >= 0; j--) chs.push(pool[J.h(s, i, j, env.step >> 1) % NP]);
        const hs = u < 1 ? J.lerp(ts, base.size, Math.pow(u, 3)) : base.size;
        env.draw({ text: chs.join(''), font: Pm.rf, size: ts, track: 0.12, vertical: true, align: 'left', x: g.x, y: yh - hs * 0.5 - trailN * tsp, color: tail, ghost: false, alpha: fade * outK(env),
          charFn: (j) => ({ a: Math.pow((j + 1) / trailN, 1.6) * 0.95 }) });
        if (u < 1) env.draw({ text: g.ch, font: Pm.font, size: hs, x: g.x, y: yh, vertical: vert, color: sc.fg, ghost: false, alpha: 0.6 + 0.4 * u });
      }
      const fl = J.clamp((lt - ta) / 0.45);
      const it = { text: g.ch, font: Pm.font, size: base.size, x: g.x, y: g.y, vertical: vert, color: fl < 1 ? J.mix(sc.accent, sc.fg, E.outCubic(fl)) : sc.fg, mi: miAt(env, ta) };
      bb = U(bb, J.mainDraw(env, it));
    });
    return bb;
  },
}, P);

/* ================================================================== 2 hanging — 吊り下げ */
J.register('layout', 'hanging', {
  name: '吊り下げ', nameEn: 'Hanging', tags: ['pop', 'calm', 'emotional'], w: 0.9, treat: 'safe', portrait: 0.8, fits: n => n >= 2 && n <= 12,
  enterBias: { drop: 1.8, pop: 1.3, cut: 1.5, slice: 0.3, wipe: 0.3, stretch: 0.4 },
  plan(rng, cut, st) {
    return {
      font: rng.pick(fontsOf(st, ['display', 'serif'])), shape: rng.pick(['arc', 'wave', 'random', 'stair']), dir: rng.pick([1, -1]),
      tag: rng.chance(0.35), rail: rng.chance(0.6), amp: rng.range(0.06, 0.11), kick: rng.range(0.16, 0.26), ph: rng.range(0, 6),
    };
  },
  render(env) {
    const { W, H, sc, ctx } = env, cut = env.cut, Pm = cut.params, s = cut.seed, M = Math.min(W, H), lt = env.lt;
    const chars = slotsOf(cut.text), n = chars.length;
    if (!n) return null;
    const rowsN = W < H && n > 5 ? 2 : 1, per = Math.ceil(n / rowsN);
    const sp = W * (rowsN > 1 ? 0.84 / (per + 0.5) : 0.88 / per);
    const size = Math.min(sp * (Pm.tag ? 0.76 : 0.84), M * 0.19);
    const tagW = size * 1.12, tagH = size * 1.36;
    const csize = Pm.tag ? size * 0.8 : size;
    const railY = Pm.rail ? H * 0.075 : -2;
    const out = outK(env), inA = inE(env, 0.45);
    if (Pm.rail) {
      env.line([[W * 0.5 - W * 0.52 * inA, railY], [W * 0.5 + W * 0.52 * inA, railY]], sc.sub, Math.max(1.2, M * 0.0022), 0.8 * out, false);
    }
    const gap = J.clamp(cut.dur * 0.35 / n, 0.03, 0.08);
    let bb = null;
    const strokeW = Math.max(1, M * 0.0016);
    const items = [];
    for (let i = 0; i < n; i++) {
      if (chars[i] === ' ') continue;
      const row = Math.floor(i / per), j = i - row * per, cnt = Math.min(per, n - row * per);
      const u = cnt > 1 ? j / (cnt - 1) : 0.5;
      const amp = rowsN > 1 ? 0.45 : 1;
      let dev;
      if (Pm.shape === 'arc') dev = (Math.sin(Math.PI * u) - 0.55) * H * 0.13 * Pm.dir;
      else if (Pm.shape === 'wave') dev = Math.sin(u * J.TAU * 1.1 + Pm.ph) * H * 0.08;
      else if (Pm.shape === 'stair') dev = (u - 0.5) * H * 0.2 * Pm.dir;
      else dev = J.rs(s, i, 3) * H * 0.08;
      dev = Math.max(-H * 0.14, Math.min(H * 0.14, dev * amp));
      const ax = W / 2 + (j - (cnt - 1) / 2) * sp + (rowsN > 1 ? (row ? 0.25 : -0.25) * sp : 0);
      const cy = rowsN > 1 ? (row ? H * 0.64 : H * 0.4) + dev * 0.5 : H * 0.52 + dev;
      const attach = Pm.tag ? tagH * 0.5 - tagH * 0.1 : size * 0.56;
      const L = Math.max(H * 0.06, cy - attach - railY);
      const T = 1.5 * Math.sqrt(L / (H * 0.45)), w = J.TAU / T;
      const ta = 0.12 + i * gap;
      const tau = lt - ta;
      const ampK = rowsN > 1 && row === 1 ? 0.5 : 1;
      const dk = sp / L / J.DEG;                                   // degrees per 'one char spacing' of sideways travel
      let th = Pm.amp * dk * ampK * Math.sin(w * env.ltb + J.r(s, i, 5) * 6);
      if (tau > 0) th += Pm.kick * dk * ampK * (J.r(s, i, 6) < 0.5 ? 1 : -1) * Math.exp(-tau / 0.7) * Math.sin(w * tau * 1.3);
      const bounce = tau > 0 ? 1 + 0.05 * Math.exp(-tau / 0.18) * Math.cos(tau * 30) : 1;
      const r = th * J.DEG;
      const grow = E.outCubic(J.clamp((lt - (ta - 0.3)) / 0.3));
      const Ls = L * bounce * grow;
      const ex = ax + Math.sin(r) * Ls, ey = railY + Math.cos(r) * Ls;
      if (grow > 0) {
        env.line([[ax, railY], [ex, ey]], sc.sub, strokeW, 0.9 * out, false);
        if (Pm.rail) env.circle(ax, railY, Math.max(2.5, M * 0.004), sc.fg, null, 0, out, false);
      }
      const ccx = ax + Math.sin(r) * (Ls + attach), ccy = railY + Math.cos(r) * (Ls + attach);
      items.push({ i, ccx, ccy, th, ta, tau });
    }
    for (const q of items) {
      if (q.tau < 0) continue;
      if (Pm.tag) {
        const pc = q.i % 2 ? plateCol(sc, [sc.accent, sc.ink]) : plateCol(sc, [sc.ink, sc.fg]);
        const e = E.outBack(J.clamp(q.tau / 0.18), 1.4) * out;
        if (e > 0) {
          ctx.save(); ctx.translate(q.ccx, q.ccy); ctx.rotate(-q.th * J.DEG); ctx.scale(e, e);
          env.rrect(-tagW / 2, -tagH / 2, tagW, tagH, tagW * 0.12, pc, 1, gIn(env));
          env.circle(0, -tagH / 2 + tagH * 0.1, Math.max(2, size * 0.055), sc.bg, null, 0, 1, false);
          ctx.restore();
        }
        bb = U(bb, J.mainDraw(env, { text: chars[q.i], font: Pm.font, size: csize, x: q.ccx + Math.sin(q.th * J.DEG) * tagH * 0.06, y: q.ccy + Math.cos(q.th * J.DEG) * tagH * 0.06, rot: -q.th, color: onCol(sc, pc), plain: true, noHold: plateHold(env), mi: miAt(env, q.ta) }));
      } else {
        bb = U(bb, J.mainDraw(env, { text: chars[q.i], font: Pm.font, size: csize, x: q.ccx, y: q.ccy, rot: -q.th, color: sc.fg, mi: miAt(env, q.ta) }));
      }
    }
    return bb;
  },
}, P);

/* ================================================================== 3 orbit — 周回 */
J.register('layout', 'orbit', {
  name: '周回', nameEn: 'Orbit', tags: ['calm', 'graphic', 'emotional'], w: 1, fits: n => n >= 1 && n <= 14,
  plan(rng, cut, st) {
    return {
      font: rng.pick(fontsOf(st, ['display', 'serif'])), fo: rng.pick(fontsOf(st, ['body', 'serif', 'display'])),
      variant: rng.pick(['ring', 'ring', 'atom', 'wide']), tilt: rng.range(5, 13) * rng.pick([1, -1]),
      speed: rng.range(22, 40) * rng.pick([1, -1]), unit: rng.pick(['line', 'self', 'line']),
    };
  },
  render(env) {
    const { W, H, sc, ctx } = env, cut = env.cut, Pm = cut.params, s = cut.seed, M = Math.min(W, H);
    const mt = mainLines(cut.text, W, H, 10, 5);
    const port = W < H;
    const size = Math.min(J.fitSize(mt, Pm.font, W * (port ? 0.64 : 0.54), H * 0.3, { track: 0.04, lead: 1.15 }), H * 0.19);
    const mm = J.measure({ text: mt, font: Pm.font, size, track: 0.04, lead: 1.15 });
    const cx = W / 2, cy = H / 2;
    const e = inE(env, 0.7), out = outK(env);
    const txt = clean(cut.text), line = clean(cut.lineText || '');
    const rom = romaOf(txt);
    const units = [];
    units.push(Pm.unit === 'line' && line && line !== txt && [...line].length <= 40 ? line + '·' : txt + '·');
    units.push(rom ? rom + ' · ' : (cut.words && cut.words.length > 1 ? cut.words.join('·') + '·' : txt + ' · '));
    const nR = Pm.variant === 'atom' ? 2 : 1;
    const rings = [];
    for (let k = 0; k < nR; k++) {
      const wide = Pm.variant === 'wide';
      const rx0 = J.clamp(Math.max(mm.w / 2 + size * (wide ? 1.4 : 1.05), M * (wide ? 0.44 : 0.36)), M * 0.2, W * 0.47);
      const ry0 = Math.min(rx0 * 0.62, Math.max(rx0 * (Pm.variant === 'atom' ? 0.36 : wide ? 0.2 : 0.27), mm.h / 2 + size * (k ? 0.75 : 0.5)));
      const grow = (0.7 + 0.3 * e) * (1 + 0.25 * env.pOut), rx = rx0 * grow, ry = ry0 * grow;
      const tilt = (Pm.variant === 'atom' ? (k ? -1 : 1) * (Math.abs(Pm.tilt) * 0.6 + 8) : Pm.tilt) * J.DEG;
      const os = J.clamp(M * (wide ? 0.05 : 0.042), 14, 64) * (k ? 0.82 : 1);
      const unit = [...units[k]];
      const perim = Math.PI * (3 * (rx + ry) - Math.sqrt((3 * rx + ry) * (rx + 3 * ry)));
      const cnt = Math.max(Math.min(unit.length, 44), Math.min(44, Math.floor(perim / (os * 1.7))));
      rings.push({ rx, ry, tilt, os, unit, cnt, sp: Pm.speed * (k ? -0.8 : 1), font: k ? monoF(env) : Pm.fo });
    }
    const drawRing = (R, front) => {
      const cT = Math.cos(R.tilt), sT = Math.sin(R.tilt);
      const a0 = env.ltb * R.sp * J.DEG + J.r(s, 9) * J.TAU;
      const chars = [];
      for (let j = 0; j < R.cnt; j++) chars.push(R.unit[j % R.unit.length]);
      pathText(env, chars, R.font, R.os, (j) => {
        const a = a0 + j / R.cnt * J.TAU, z = Math.sin(a);
        if ((z >= 0) !== front) return null;
        const lx = Math.cos(a) * R.rx, ly = z * R.ry;
        const d = (z + 1) / 2;
        const ch = chars[j];
        const sep = ch === '·';
        return { x: cx + lx * cT - ly * sT, y: cy + lx * sT + ly * cT, s: 0.55 + 0.62 * d, a: (0.18 + 0.82 * Math.pow(d, 1.3)) * e * out, color: sep ? sc.accent : d > 0.5 ? sc.fg : sc.sub };
      });
    };
    const ellipse = (R, front) => {
      const pts = [], cT = Math.cos(R.tilt), sT = Math.sin(R.tilt);
      for (let j = 0; j <= 40; j++) { const a = front ? j / 40 * Math.PI : Math.PI + j / 40 * Math.PI; const lx = Math.cos(a) * R.rx * 1.0, ly = Math.sin(a) * R.ry; pts.push([cx + lx * cT - ly * sT, cy + lx * sT + ly * cT]); }
      return pts;
    };
    const lw = Math.max(1, M * 0.0016);
    for (const R of rings) { env.line(ellipse(R, false), sc.sub, lw, 0.4 * e * out, false); drawRing(R, false); }
    const bb = J.mainDraw(env, { text: mt, font: Pm.font, size, x: cx, y: cy, track: 0.04, lead: 1.15, color: sc.fg });
    const wb = bb || bbRect(cx - mm.w / 2, cy - mm.h / 2, cx + mm.w / 2, cy + mm.h / 2);
    for (const R of rings) {
      if (env.pass === 'main') {
        ctx.save(); ctx.beginPath(); ctx.rect(-W, -H, W * 3, H * 3); ctx.rect(wb.x0 - size * 0.12, wb.y0 - size * 0.1, wb.x1 - wb.x0 + size * 0.24, wb.y1 - wb.y0 + size * 0.2); ctx.clip('evenodd');
        env.line(ellipse(R, true), sc.sub, lw, 0.65 * e * out, false);
        ctx.restore();
      }
      drawRing(R, true);
    }
    return bb;
  },
}, P);

/* ================================================================== 4 tunnel — トンネル */
J.register('layout', 'tunnel', {
  name: 'トンネル', nameEn: 'Tunnel', tags: ['glitch', 'graphic', 'emotional'], w: 0.9, emph: 1.3, busy: true, fits: n => n >= 1 && n <= 14,
  plan(rng, cut, st) {
    return {
      font: rng.pick(fontsOf(st, ['display', 'body'])), fontC: rng.pick(fontsOf(st, ['display', 'serif'])),
      q: rng.range(1.42, 1.62), speed: rng.range(0.22, 0.42) * rng.pick([1, 1, -1]), style: rng.pick(['outline', 'fill', 'alt']),
      unit: rng.pick(['line', 'text', 'line']), persp: rng.chance(0.65),
    };
  },
  render(env) {
    const { W, H, sc } = env, cut = env.cut, Pm = cut.params, s = cut.seed, M = Math.min(W, H);
    const cx = W / 2, cy = H / 2;
    const mt = mainLines(cut.text, W, H, 10, 5);
    const size = Math.min(J.fitSize(mt, Pm.fontC, W * (W < H ? 0.44 : 0.5), H * 0.26, { track: 0.05, lead: 1.15 }), H * 0.16);
    const mm = J.measure({ text: mt, font: Pm.fontC, size, track: 0.05, lead: 1.15 });
    const hw = mm.w / 2 + size * 0.55, hh = mm.h / 2 + size * 0.5;
    // frame proportions: the screen's in landscape; in portrait halfway towards the text block (else the frames never show)
    const ra = W < H ? Math.min(0.95, Math.sqrt((hw / hh) * (W / H))) : W / H;
    const A = W / 2, B = A / ra;
    const s0 = Math.max(hw / A, hh / B, 0.12);
    const q = Pm.q, Lmax = Math.log(Math.max(W * 0.66 / A, H * 0.66 / B) / s0) / Math.log(q);
    const e = inE(env, 0.6), out = outK(env);
    const phase0 = env.ltb * Pm.speed + (1 - e) * 1.2 * Math.sign(Pm.speed || 1);
    const ph = ((phase0 % 1) + 1) % 1;
    const unit = [...((Pm.unit === 'line' && cut.lineText && clean(cut.lineText) !== clean(cut.text) ? cut.lineText : cut.text).replace(/\s+/g, ' ').trim() + '　')];
    const NU = unit.length;
    const lw = Math.max(1, M * 0.0015);
    // perspective rails from the screen corners to the innermost frame
    if (Pm.persp) {
      const a0 = s0 * A, b0 = s0 * B;
      for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) env.line([[cx + sx * W * 0.75, cy + sy * H * 0.75], [cx + sx * a0, cy + sy * b0]], sc.sub, lw, 0.28 * e * out, false);
    }
    const K = Math.ceil(Lmax) + 1;
    for (let k = K; k >= 0; k--) {
      const L = k + ph - 1;
      if (L < 0 || L > Lmax + 0.2) continue;
      const sc1 = s0 * Math.pow(q, L);
      const a = sc1 * A, b = sc1 * B;
      const f = Math.min(sc1 * Math.min(A, B) * 0.15, M * 0.11);
      if (f < 3) continue;
      const alpha = J.smooth(0, 0.9, L) * (0.3 + 0.7 * J.clamp(L / Lmax * 1.4)) * e * out;
      if (alpha < 0.02) continue;
      const outline = Pm.style === 'outline' || (Pm.style === 'alt' && (k + Math.floor(phase0)) % 2 === 0);
      const col = (k + Math.floor(phase0)) % 3 === 0 ? sc.accent : sc.fg;
      const inset = f * 0.62;
      let gi = (k * 7 + Math.floor(phase0) * 3) % NU;
      const edge = (len) => {       // glyphs that fit into len
        const out2 = []; let acc = 0;
        for (let t = 0; t < 80; t++) { const ch = unit[(gi + t) % NU]; const ad = J.metrics.adv(Pm.font, ch) * f * 1.06; if (acc + ad > len) { gi += t; break; } acc += ad; out2.push(ch); }
        return out2.join('');
      };
      const common = { font: Pm.font, size: f, track: 0.06, ghost: false, alpha, color: col };
      if (outline) Object.assign(common, { fill: false, stroke: Math.max(1, f * 0.035), strokeColor: col });
      const hl = 2 * a - inset * 2.4, vl = 2 * b - inset * 2.4;
      env.draw(Object.assign({ text: edge(hl), x: cx, y: cy - b + inset }, common));
      env.draw(Object.assign({ text: edge(vl), x: cx + a - inset, y: cy, rot: 90 }, common));
      env.draw(Object.assign({ text: edge(hl), x: cx, y: cy + b - inset, rot: 180 }, common));
      env.draw(Object.assign({ text: edge(vl), x: cx - a + inset, y: cy, rot: -90 }, common));
      env.rect(cx - a, cy - b, a * 2, lw, sc.sub, alpha * 0.5, false);
      env.rect(cx - a, cy + b - lw, a * 2, lw, sc.sub, alpha * 0.5, false);
    }
    return J.mainDraw(env, { text: mt, font: Pm.fontC, size, x: cx, y: cy, track: 0.05, lead: 1.15, color: sc.fg });
  },
}, P);

/* ================================================================== 5 wordCloud — ワードクラウド */
const _cloud = new Map();
J.register('layout', 'wordCloud', {
  name: 'ワードクラウド', nameEn: 'Word cloud', tags: ['pop', 'editorial', 'graphic'], w: 0.9, busy: true, fits: n => n >= 1 && n <= 14,
  plan(rng, cut, st) {
    const pool = fontsOf(st, ['display', 'serif', 'body']);
    return {
      font: rng.pick(fontsOf(st, ['display'])), fonts: [rng.pick(pool), rng.pick(pool), rng.pick(fontsOf(st, ['body', 'serif']))],
      vert: rng.pick([0, 0.3, 0.5]), accentN: rng.int(1, 3), outlineK: rng.pick([0, 0.2, 0.35]), wide: rng.range(1.2, 1.7),
    };
  },
  render(env) {
    const { W, H, sc } = env, cut = env.cut, Pm = cut.params, s = cut.seed, M = Math.min(W, H);
    const mt = mainLines(cut.text, W, H, 9, 5);
    const size = Math.min(J.fitSize(mt, Pm.font, W * (W < H ? 0.7 : 0.52), H * 0.24, { track: 0.03, lead: 1.1 }), H * 0.18);
    const key = s + '|' + W + 'x' + H + '|' + cut.text;
    let lay = _cloud.get(key);
    if (!lay) { lay = buildCloud(env, mt, size); if (_cloud.size > 60) _cloud.clear(); _cloud.set(key, lay); }
    const out = outK(env);
    lay.forEach((w, k) => {
      const q = J.clamp((env.lt - w.delay) / 0.32);
      if (q <= 0) return;
      const sq = E.outBack(q, 1.7) * (1 - 0.25 * E.inCubic(env.pOut));
      const dx = J.noise1(env.ltb * 0.35 + k * 3.1, s) * M * 0.004, dy = J.noise1(env.ltb * 0.3 + k * 5.7, s + 1) * M * 0.004;
      const it = { text: w.text, font: w.font, size: w.size * sq, x: w.x + dx, y: w.y + dy, vertical: w.vertical, track: 0.02, color: w.col === 'a' ? sc.accent : w.col === 'f' ? sc.fg : sc.sub, alpha: Math.min(1, q * 2.5) * out * w.a, ghost: false };
      if (w.outline) Object.assign(it, { fill: false, stroke: Math.max(1, w.size * 0.03), strokeColor: it.color });
      env.draw(it);
    });
    return J.mainDraw(env, { text: mt, font: Pm.font, size, x: W / 2, y: H / 2, track: 0.03, lead: 1.1, color: sc.fg });
  },
}, P);
function buildCloud(env, mt, size) {
  const { W, H } = env, cut = env.cut, Pm = cut.params, s = cut.seed, M = Math.min(W, H);
  const txt = clean(cut.text);
  const pool = [];
  const add = w => { w = String(w || '').trim(); if (w && J.glyphCount(w) <= 14 && !pool.includes(w) && ![...w].every(c => J.isPunct(c))) pool.push(w); };
  (J.chunkText(cut.lineText || cut.text) || []).forEach(add);
  (cut.words || []).forEach(add);
  (J.segments(cut.lineText || cut.text) || []).forEach(g => { g = g.trim(); if (J.glyphCount(g) >= 2 || [...g].some(c => J.isKanji(c))) add(g); });
  const rom = romaOf(txt); if (rom) add(rom);
  if (cut.note) add(cut.note);
  add(txt);
  [...txt].filter(c => J.isKanji(c)).forEach(add);
  if (J.glyphCount(cut.lineText || '') <= 14) add(cut.lineText);
  if (!pool.length) pool.push(txt || '·');
  const mm = J.measure({ text: mt, font: Pm.font, size, track: 0.03, lead: 1.1 });
  const boxes = [[W / 2 - mm.w / 2 - size * 0.25, H / 2 - mm.h / 2 - size * 0.18, W / 2 + mm.w / 2 + size * 0.25, H / 2 + mm.h / 2 + size * 0.18]];
  const out = [];
  const port = W < H;
  const stretchX = port ? 0.75 : Pm.wide, stretchY = port ? 1.3 : 1;
  const maxR = Math.hypot(W, H) * 0.55;
  let acc = 0;
  for (let k = 0; k < 70 && out.length < 44; k++) {
    const word = pool[k % pool.length];
    const latin = /[A-Za-z]/.test(word);
    const vertical = !latin && J.glyphCount(word) <= 6 && J.r(s, k, 3) < Pm.vert;
    const tier = Math.pow(0.95, out.length);
    let fs = Math.max(M * 0.018, Math.min(W * 0.4 / Math.max(1.5, J.glyphCount(word)), size * 0.6, M * 0.125 * tier * (0.65 + 0.7 * J.r(s, k, 4))));
    const font = Pm.fonts[k % Pm.fonts.length];
    const it = { text: word, font, size: fs, track: 0.02, vertical };
    let m = J.measure(it);
    const maxW = W * 0.9, maxH = H * 0.9;
    if (m.w > maxW || m.h > maxH) { const f = Math.min(maxW / m.w, maxH / m.h); fs *= f; it.size = fs; m = J.measure(it); }
    const pad = fs * 0.12;
    const w2 = m.w / 2 + pad, h2 = m.h / 2 + pad;
    const a0 = J.r(s, k, 5) * J.TAU;
    let placed = null;
    for (let t = 0; t < 520; t++) {
      const ang = a0 + t * 0.42, rad = (t / 520) * maxR;
      const x = W / 2 + Math.cos(ang) * rad * stretchX, y = H / 2 + Math.sin(ang) * rad * stretchY * 0.8;
      if (x - w2 < W * 0.035 || x + w2 > W * 0.965 || y - h2 < H * 0.045 || y + h2 > H * 0.955) continue;
      let hit = false;
      for (const b of boxes) if (x - w2 < b[2] && x + w2 > b[0] && y - h2 < b[3] && y + h2 > b[1]) { hit = true; break; }
      if (!hit) { placed = [x, y]; break; }
    }
    if (!placed) { acc++; if (acc > 16) break; continue; }
    boxes.push([placed[0] - w2, placed[1] - h2, placed[0] + w2, placed[1] + h2]);
    const d = Math.hypot((placed[0] - W / 2) / W, (placed[1] - H / 2) / H);
    const idx = out.length;
    out.push({ text: word, font, size: fs, x: placed[0], y: placed[1], vertical, delay: 0.06 + d * 0.9 + idx * 0.012,
      col: [4, 9, 15].indexOf(idx) >= 0 && [4, 9, 15].indexOf(idx) < Pm.accentN ? 'a' : (idx % 2 ? 's' : 'f'), a: idx % 2 ? 0.8 : 0.5 + 0.2 * tier, outline: J.r(s, k, 7) < Pm.outlineK });
  }
  return out;
}

/* ================================================================== 6 bounceLine — 跳ねる */
J.register('layout', 'bounceLine', {
  name: '跳ねる', nameEn: 'Bouncing', tags: ['pop'], w: 1, fits: n => n >= 2 && n <= 16,
  enterBias: { drop: 1.8, pop: 1.5, cut: 1.2, slice: 0.4, stretch: 0.5 },
  plan(rng, cut, st) {
    return {
      font: rng.pick(fontsOf(st, ['display'])), mode: rng.pick(['wave', 'wave', 'beat', 'hop']), hop: rng.range(0.38, 0.6),
      tempo: rng.range(0.42, 0.6), shadow: rng.chance(0.7), line: rng.pick(['line', 'line', 'dots', 'none']), tilt: rng.chance(0.5),
    };
  },
  render(env) {
    const { W, H, sc, ctx } = env, cut = env.cut, Pm = cut.params, s = cut.seed, M = Math.min(W, H), lt = env.lt;
    const n0 = J.glyphCount(cut.text);
    const mt = mainLines(cut.text, W, H, 11, 6);
    const nL = mt.split('\n').length;
    const base = { text: mt, font: Pm.font, x: W / 2, y: H / 2 + (nL > 1 ? 0 : H * 0.03), track: 0.1, lead: 2.0 };
    base.size = Math.min(J.fitSize(mt, Pm.font, W * 0.84, H * (nL > 1 ? 0.52 : 0.3), base), H * 0.2);
    const size = base.size;
    const gl = glyphPts(base), n = gl.length;
    const out = outK(env), inA = inE(env, 0.5);
    const hopH = size * Pm.hop, hd = J.clamp(Pm.tempo * 0.62, 0.22, 0.34), sq = 0.13;
    // hop profile: τ = time since take-off
    const prof = (tau) => {
      if (tau < -0.07 || tau > hd + sq) return { h: 0, sx: 1, sy: 1 };
      if (tau < 0) { const k = Math.sin(Math.PI * (tau + 0.07) / 0.07); return { h: 0, sx: 1 + 0.08 * k, sy: 1 - 0.1 * k }; }
      if (tau < hd) { const u = tau / hd; return { h: 4 * u * (1 - u), sx: 0.94, sy: 1.08 }; }
      const k = Math.sin(Math.PI * (tau - hd) / sq); return { h: 0, sx: 1 + 0.2 * k, sy: 1 - 0.24 * k };
    };
    const start = 0.25;
    let bb = null;
    const lines = {};
    gl.forEach((g, i) => {
      let tau = -1;
      const t = lt - start;
      if (t > -0.1) {
        if (Pm.mode === 'wave') {
          const gap = Math.min(0.09, 0.9 / n), P = Math.max(Pm.tempo * 2.2, n * gap + hd + 0.35);
          const tt = t - i * gap; tau = tt < -0.1 ? -1 : ((tt + 0.07) % P) - 0.07;
        } else if (Pm.mode === 'beat') {
          if (env.beat && env.beat.len > 0.2) { tau = env.beat.index % n === i ? env.beat.since : -1; }
          else { const k = Math.floor(t / Pm.tempo); tau = ((k % n) + n) % n === i ? t - k * Pm.tempo : -1; }
        } else {
          const P = J.rr(0.9, 1.7, s, i, 7), ph = J.r(s, i, 8) * P;
          tau = ((t + ph) % P) - 0.07;
          if (t + ph < P - 0.07) tau = -1;
        }
      }
      const pr = prof(tau);
      const yb = g.y + size * 0.5;
      const lk = g.li;
      if (!lines[lk]) lines[lk] = { x0: g.x - g.w / 2, x1: g.x + g.w / 2, y: yb };
      lines[lk].x0 = Math.min(lines[lk].x0, g.x - g.w / 2); lines[lk].x1 = Math.max(lines[lk].x1, g.x + g.w / 2);
      if (Pm.shadow) {
        const k = 1 - pr.h * 0.55;
        ctx.save(); ctx.translate(g.x, yb + size * 0.06); ctx.scale(1, 0.2);
        env.circle(0, 0, size * 0.34 * k * pr.sx, sc.sub, null, 0, 0.28 * k * out * inA, false);
        ctx.restore();
      }
      const it = { text: g.ch, font: Pm.font, size, x: g.x, y: yb - size * 0.5 * pr.sy - pr.h * hopH, sx: pr.sx, sy: pr.sy,
        rot: Pm.tilt && pr.h > 0 ? Math.sin(tau / hd * Math.PI * 2) * 7 * (i % 2 ? 1 : -1) : 0,
        color: Pm.mode === 'beat' && pr.h > 0 ? sc.accent : sc.fg, mi: i };
      bb = U(bb, J.mainDraw(env, it));
    });
    const lw = Math.max(1.5, M * 0.0022);
    for (const k of Object.keys(lines)) {
      const L = lines[k], pad = size * 0.35, x0 = L.x0 - pad, x1 = L.x1 + pad, y = L.y + size * 0.1;
      if (Pm.line === 'line') env.line([[x0, y], [J.lerp(x0, x1, inA), y]], sc.sub, lw, 0.7 * out, false);
      else if (Pm.line === 'dots') { const m = Math.max(4, Math.round((x1 - x0) / (size * 0.25))); for (let j = 0; j <= m; j++) if (j / m <= inA) env.circle(J.lerp(x0, x1, j / m), y, lw * 1.2, sc.sub, null, 0, 0.8 * out, false); }
    }
    return bb;
  },
}, P);

/* ================================================================== 7 elastic — ゴム */
J.register('layout', 'elastic', {
  name: 'ゴム', nameEn: 'Rubber band', tags: ['pop', 'graphic'], w: 0.9, portrait: 0.85, fits: n => n >= 2 && n <= 12,
  enterBias: { cut: 1.6, stretch: 0.3, pop: 1.2 },
  plan(rng, cut, st) {
    const port = cut.H > cut.W;
    return {
      font: rng.pick(fontsOf(st, ['display', 'serif'])), orient: port ? (cut.n <= 5 ? rng.pick(['v', 'v', 'h']) : 'v') : rng.pick(['h', 'h', 'diag']),
      ang: rng.range(6, 12) * rng.pick([1, -1]), every: rng.range(1.1, 1.6), amp: rng.range(0.3, 0.45), anchor: rng.pick(['dot', 'ring', 'pin']),
    };
  },
  render(env) {
    const { W, H, sc, ctx } = env, cut = env.cut, Pm = cut.params, s = cut.seed, M = Math.min(W, H), lt = env.lt;
    const vert = Pm.orient === 'v';
    const txt = vert ? clean(cut.text) : String(cut.text).trim();
    const ang = Pm.orient === 'diag' ? Pm.ang : 0;
    const base = { text: txt, font: Pm.font, x: 0, y: 0, track: 0.08, vertical: vert };
    const avail = vert ? H * 0.58 : (W < H ? W * 0.7 : W * 0.62);
    base.size = Math.min(J.fitSize(txt, Pm.font, vert ? W * 0.3 : avail, vert ? avail : H * 0.22, base), H * 0.2);
    const size = base.size;
    const gl = glyphPts(base), n = gl.length;
    if (!n) return null;
    const along = g => (vert ? g.y : g.x);
    const a0 = along(gl[0]) - (vert ? gl[0].h : gl[0].w) / 2, a1 = along(gl[n - 1]) + (vert ? gl[n - 1].h : gl[n - 1].w) / 2;
    const gap = size * 0.85;
    const half = (a1 - a0) / 2 + gap;
    // spring: anchors fly out from the centre and overshoot
    const te = lt - 0.02;
    const spr = te <= 0 ? 0 : 1 - Math.exp(-te / 0.1) * Math.cos(te * 15);
    const k = Math.max(0.04, spr) * (1 + 0.6 * E.inCubic(env.pOut));
    // pluck: standing wave across the band
    let tau = -1, ampK = 1;
    if (env.beat && env.beat.len > 0.2 && lt > 0.5) { tau = env.beat.since; ampK = env.beat.index % 2 ? 0.55 : 1; }
    else if (lt > 0.45) { tau = (lt - 0.45) % Pm.every; }
    const A = size * Pm.amp * ampK * (lt < 0.45 ? 0 : 1);
    const wv = (u) => (tau < 0 ? 0 : A * Math.sin(Math.PI * u) * Math.cos(tau * 22) * Math.exp(-tau / 0.42));
    const cx = W / 2, cy = H / 2, cr = Math.cos(ang * J.DEG), sr = Math.sin(ang * J.DEG);
    const P2 = (a, d) => (vert ? [cx + d, cy + a] : [cx + a * cr - d * sr, cy + a * sr + d * cr]);   // along / across → screen
    const aA = -half * k, aB = half * k;
    const uOf = a => (a - aA) / Math.max(1, aB - aA);
    const out = outK(env), inA = inE(env, 0.3);
    // band segments (anchor → text end)
    const lw = Math.max(1.5, size * 0.03);
    const seg = (from, to) => { const pts = []; for (let j = 0; j <= 12; j++) { const a = J.lerp(from, to, j / 12); pts.push(P2(a, wv(uOf(a)))); } return pts; };
    const tA = a0 * k - size * 0.12, tB = a1 * k + size * 0.12;
    env.line(seg(aA, tA), sc.sub, lw, 0.9 * out * inA, false);
    env.line(seg(tB, aB), sc.sub, lw, 0.9 * out * inA, false);
    let bb = null;
    gl.forEach((g, i) => {
      const a = along(g) * k, u = uOf(a);
      const d = wv(u), slope = (wv(u + 0.01) - wv(u - 0.01)) / (0.02 * Math.max(1, aB - aA));
      const [x, y] = P2(a, d);
      const st = J.clamp(k, 0.15, 1.6);
      const it = { text: g.ch, font: Pm.font, size, x, y, vertical: vert, sx: vert ? 1 / Math.sqrt(st) : st, sy: vert ? st : 1 / Math.sqrt(st),
        rot: (vert ? -Math.atan(slope) : Math.atan(slope)) / J.DEG + ang, color: sc.fg, mi: i * 0.5 };
      bb = U(bb, J.mainDraw(env, it));
    });
    // anchors
    const R = Math.max(5, size * 0.1);
    for (const a of [aA, aB]) {
      const [x, y] = P2(a, 0);
      const q = E.outBack(J.clamp(lt / 0.2), 2) * out;
      if (q <= 0) continue;
      if (Pm.anchor === 'dot') env.circle(x, y, R * q, sc.accent, null, 0, 1, true);
      else if (Pm.anchor === 'ring') { env.circle(x, y, R * 1.3 * q, null, sc.accent, lw * 1.3, 1, true); env.circle(x, y, R * 0.45 * q, sc.fg, null, 0, 1, false); }
      else { const [px, py] = P2(a, -R * 3.2); env.line([[px, py], [x, y]], sc.fg, lw, q, false); env.circle(px, py, R * 0.9 * q, sc.accent, null, 0, 1, true); env.circle(x, y, R * 0.4 * q, sc.fg, null, 0, 1, false); }
    }
    return bb;
  },
}, P);

/* ================================================================== 8 crossBands — 交差帯 */
J.register('layout', 'crossBands', {
  name: '交差帯', nameEn: 'Crossing bands', tags: ['graphic', 'pop', 'glitch'], w: 1, treat: 'safe', busy: true, fits: n => n >= 1 && n <= 14,
  plan(rng, cut, st) {
    return {
      font: rng.pick(fontsOf(st, ['display'])), fb: rng.pick(fontsOf(st, ['body', 'display'])), ang: rng.range(13, 22),
      plate: rng.pick(['box', 'double', 'shadow']), speed: rng.range(0.7, 1.2), swap: rng.chance(0.5), sep: rng.pick(['/', '·', ' ', '×']),
    };
  },
  render(env) {
    const { W, H, sc, ctx } = env, cut = env.cut, Pm = cut.params, M = Math.min(W, H), lt = env.lt;
    const port = W < H;
    const ang = (port ? Pm.ang + 16 : Pm.ang);
    const bh = M * (port ? 0.12 : 0.105);
    const cols = [plateCol(sc, [sc.ink, sc.fg]), plateCol(sc, [sc.accent, sc.accent2, sc.sub])];
    if (Pm.swap) cols.reverse();
    const len = Math.hypot(W, H) * 1.15;
    const unit = (cut.lineText || cut.text).replace(/\s+/g, ' ').trim() + ' ' + Pm.sep + ' ';
    const fsz = bh * 0.46;
    const per = J.measure({ text: unit, font: Pm.fb, size: fsz, track: 0.08 }).w;
    const reps = Math.min(40, Math.ceil(len * 1.2 / Math.max(1, per)) + 2);
    const outE = E.inCubic(env.pOut);
    [0, 1].forEach(b => {
      const e = E.outExpo(J.clamp((lt - b * 0.08) / 0.5)) * (1 - outE);
      if (e <= 0) return;
      const a = (b ? -ang : ang) * J.DEG, dir = b ? -1 : 1;
      ctx.save(); ctx.translate(W / 2, H / 2); ctx.rotate(a);
      const L = len * e, x0 = dir > 0 ? -len / 2 : len / 2 - L;
      env.rect(x0, -bh / 2, L, bh, cols[b], 1, lt < 0.6);
      ctx.beginPath(); ctx.rect(x0, -bh / 2, L, bh); ctx.save(); ctx.clip();
      const off = ((env.ltb * Pm.speed * M * 0.12 * dir) % per + per) % per;
      env.draw({ text: unit.repeat(reps), font: Pm.fb, size: fsz, track: 0.08, align: 'left', x: -len * 0.6 - per + off, y: 0, color: onCol(sc, cols[b]), ghost: false });
      ctx.restore();
      ctx.restore();
    });
    // lyric plate at the crossing
    const mt = mainLines(cut.text, W, H, 9, 5);
    const size = Math.min(J.fitSize(mt, Pm.font, W * (port ? 0.66 : 0.5), H * 0.24, { track: 0.04, lead: 1.12 }), H * 0.17);
    const mm = J.measure({ text: mt, font: Pm.font, size, track: 0.04, lead: 1.12 });
    const pw = mm.w + size * 0.9, ph = mm.h + size * 0.7;
    const q = E.outBack(J.clamp((lt - 0.1) / 0.28), 1.6) * (1 - outE);
    if (q > 0) {
      const lw = Math.max(2, size * 0.035);
      ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(q, q);
      if (Pm.plate === 'shadow') { const o = size * 0.12; env.rect(-pw / 2 + o, -ph / 2 + o, pw, ph, cols[1], 1, false); }
      env.rect(-pw / 2, -ph / 2, pw, ph, sc.bg, 1, false);
      env.rrect(-pw / 2, -ph / 2, pw, ph, 0, null, 1, false, sc.fg, lw);
      if (Pm.plate === 'double') { const o = lw * 2.6; env.rrect(-pw / 2 + o, -ph / 2 + o, pw - o * 2, ph - o * 2, 0, null, 1, false, sc.fg, lw * 0.5); }
      ctx.restore();
    }
    return J.mainDraw(env, { text: mt, font: Pm.font, size, x: W / 2, y: H / 2, track: 0.04, lead: 1.12, color: sc.fg });
  },
}, P);

/* ================================================================== 9 stickerBomb — ステッカー */
const stickerPath = (ctx, shape, w, h, grow, seed) => {
  const x = -w / 2 - grow, y = -h / 2 - grow, W2 = w + grow * 2, H2 = h + grow * 2;
  ctx.beginPath();
  if (shape === 'circle') ctx.arc(0, 0, Math.max(W2, H2) / 2, 0, J.TAU);
  else if (shape === 'burst') {
    const R = Math.max(W2, H2) / 2 * 1.08, m = 16;
    for (let i = 0; i < m * 2; i++) { const a = i / (m * 2) * J.TAU, r = i % 2 ? R * 0.84 : R; i ? ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r) : ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
    ctx.closePath();
  } else rrPath(ctx, x, y, W2, H2, shape === 'pill' ? H2 / 2 : Math.min(W2, H2) * 0.2);
};
J.register('layout', 'stickerBomb', {
  name: 'ステッカー', nameEn: 'Sticker', tags: ['pop', 'graphic'], w: 0.9, treat: 'safe', fits: n => n >= 1 && n <= 12,
  enterBias: { cut: 2, pop: 1.2, slice: 0.4, wipe: 0.5, assemble: 0.4 },
  plan(rng, cut, st) {
    const n = cut.n;
    return {
      font: rng.pick(fontsOf(st, ['display'])), fs: rng.pick(fontsOf(st, ['body', 'display'])),
      main: n <= 3 ? rng.pick(['circle', 'burst', 'rrect']) : n <= 5 ? rng.pick(['rrect', 'burst', 'pill']) : rng.pick(['rrect', 'pill']),
      cnt: rng.int(4, 6), rot: rng.range(-5, 5), spin: rng.range(0, 6),
    };
  },
  render(env) {
    const { W, H, sc, ctx } = env, cut = env.cut, Pm = cut.params, s = cut.seed, M = Math.min(W, H), lt = env.lt;
    const port = W < H;
    const mt = mainLines(cut.text, W, H, 8, 5);
    const size = Math.min(J.fitSize(mt, Pm.font, W * (port ? 0.64 : 0.5), H * 0.26, { track: 0.03, lead: 1.1 }), H * (Pm.main === 'circle' || Pm.main === 'burst' ? 0.15 : 0.19));
    const mm = J.measure({ text: mt, font: Pm.font, size, track: 0.03, lead: 1.1 });
    const pw = mm.w + size * 0.8, ph = mm.h + size * 0.6;
    const dark = J.lum(sc.bg) < 0.45;
    const border = dark ? sc.fg : sc.bg;
    const bw = Math.max(4, size * 0.09);
    const out = 1 - E.inCubic(env.pOut), grow = 1 + 0.08 * E.outCubic(env.pOut);
    const slap = (t0) => { const q = J.clamp((lt - t0) / 0.16); if (q <= 0) return null; return { s: 1 + 0.3 * Math.pow(1 - q, 2) - 0.06 * Math.sin(Math.PI * q) * (q < 1 ? 1 : 0), a: Math.min(1, q * 3), r: (1 - E.outCubic(q)) * 14 }; };
    const drawSticker = (x, y, rot, sh, w, h, fill, q, seed) => {
      ctx.save(); ctx.translate(x, y); ctx.rotate((rot + q.r) * J.DEG); ctx.scale(q.s * grow, q.s * grow);
      if (env.pass === 'main') {
        if (!dark) { ctx.save(); ctx.translate(bw * 0.5, bw * 0.7); stickerPath(ctx, sh, w, h, bw, seed); ctx.globalAlpha = 0.22 * q.a * out; ctx.fillStyle = sc.fg; ctx.fill(); ctx.restore(); }
        stickerPath(ctx, sh, w, h, bw, seed); ctx.globalAlpha = q.a * out; ctx.fillStyle = border; ctx.fill();
        stickerPath(ctx, sh, w, h, 0, seed); ctx.fillStyle = fill; ctx.fill(); ctx.globalAlpha = 1;
      } else if (env.passColor && gIn(env)) { stickerPath(ctx, sh, w, h, bw, seed); ctx.globalAlpha = q.a; ctx.fillStyle = env.passColor; ctx.fill(); ctx.globalAlpha = 1; }
      ctx.restore();
    };
    // secondary stickers
    const txt = clean(cut.text);
    const pool = [];
    const add = w => { w = String(w || '').trim(); if (w && w !== txt && J.glyphCount(w) <= 12 && !pool.includes(w)) pool.push(w); };
    (cut.words || []).forEach(add);
    const rom = romaOf(txt); if (rom) add(rom);
    J.chunkText(cut.lineText || '').forEach(add);
    add('No.' + String((cut.line | 0) + 1).padStart(2, '0'));
    add('♡'); add('!!');
    const fills = [sc.accent, sc.ink, sc.accent2, sc.fg].map(c => plateCol(sc, [c]));
    const mainFill = plateCol(sc, [sc.ink, sc.accent]);
    const shapes = ['circle', 'rrect', 'burst', 'pill'];
    const cnt = Pm.cnt;
    const hw = pw / 2, hh = ph / 2;
    const items = [];
    for (let k = 0; k < cnt; k++) {
      const word = pool[k % pool.length];
      const glyphs = J.glyphCount(word);
      const sh = glyphs <= 2 ? (J.r(s, k, 2) < 0.5 ? 'circle' : 'burst') : J.r(s, k, 2) < 0.5 ? 'pill' : 'rrect';
      const fsz = J.clamp(M * J.rr(0.042, 0.06, s, k, 3), 12, 80);
      const m = J.measure({ text: word, font: Pm.fs, size: fsz, track: 0.06 });
      let w = m.w + fsz * 1.0, h = fsz * 1.7;
      if (sh === 'circle' || sh === 'burst') { w = h = Math.max(m.w, fsz) + fsz * 1.2; }
      const a = (k / cnt) * J.TAU + J.rs(s, k, 4) * 0.35 + Pm.spin;
      let x = W / 2 + Math.cos(a) * (hw + w * 0.32), y = H / 2 + Math.sin(a) * (hh + h * 0.4);
      x = J.clamp(x, W * 0.05 + w / 2, W * 0.95 - w / 2); y = J.clamp(y, H * 0.06 + h / 2, H * 0.94 - h / 2);
      items.push({ word, sh, fsz, w, h, x, y, rot: J.rs(s, k, 5) * 18, fill: fills[k % fills.length] === mainFill ? fills[(k + 1) % fills.length] : fills[k % fills.length], t0: 0.14 + k * 0.07 });
    }
    for (const it of items) {
      const q = slap(it.t0); if (!q) continue;
      drawSticker(it.x, it.y, it.rot, it.sh, it.w, it.h, it.fill, q, s);
      ctx.save(); ctx.translate(it.x, it.y); ctx.rotate((it.rot + q.r) * J.DEG); ctx.scale(q.s * grow, q.s * grow);
      env.draw({ text: it.word, font: Pm.fs, size: it.fsz, track: 0.06, x: 0, y: 0, color: onCol(sc, it.fill), alpha: q.a * out, ghost: false });
      ctx.restore();
    }
    // main sticker last (on top)
    const q = slap(0.02);
    if (!q) return null;
    const sh = Pm.main;
    let w = pw, h = ph;
    if (sh === 'circle' || sh === 'burst') w = h = Math.max(pw, ph) * 1.02;
    drawSticker(W / 2, H / 2, Pm.rot, sh, w, h, mainFill, q, s);
    ctx.save(); ctx.translate(W / 2, H / 2); ctx.rotate((Pm.rot + q.r) * J.DEG); ctx.scale(q.s, q.s);
    const lb = J.mainDraw(env, { text: mt, font: Pm.font, size, x: 0, y: 0, track: 0.03, lead: 1.1, color: onCol(sc, mainFill), noHold: plateHold(env) });
    ctx.restore();
    return lb ? bbRect(W / 2 - w / 2, H / 2 - h / 2, W / 2 + w / 2, H / 2 + h / 2) : null;
  },
}, P);

/* ================================================================== 10 neon — ネオン */
J.register('layout', 'neon', {
  name: 'ネオン', nameEn: 'Neon', tags: ['calm', 'emotional'], w: 1, treat: false, fits: n => n >= 1 && n <= 14,
  enterBias: { flicker: 2.6, blur: 1.4, cut: 1.3, assemble: 0.3, slice: 0.5, scramble: 0.6 },
  plan(rng, cut, st) {
    return {
      font: rng.pick(fontsOf(st, ['display', 'body'])), tube: rng.pick(['accent', 'accent', 'accent2', 'fg']),
      frame: rng.pick(['box', 'under', 'bracket', 'none']), flick: rng.chance(0.75), sub: rng.chance(0.5),
    };
  },
  render(env) {
    const { W, H, sc, ctx } = env, cut = env.cut, Pm = cut.params, s = cut.seed, M = Math.min(W, H), lt = env.lt;
    const mt = mainLines(cut.text, W, H, 9, 5);
    const base = { text: mt, font: Pm.font, x: W / 2, y: H / 2, track: 0.08, lead: 1.25 };
    base.size = Math.min(J.fitSize(mt, Pm.font, W * 0.72, H * 0.34, base), H * 0.19);
    const size = base.size;
    const dark = J.lum(sc.bg) < 0.45;
    const cand = Pm.tube === 'accent2' ? [sc.accent2, sc.accent, sc.fg] : Pm.tube === 'fg' ? [sc.fg, sc.accent] : [sc.accent, sc.accent2, sc.fg];
    let tube = cand.find(c => c && J.contrast(c, sc.bg) >= 2.2) || sc.fg;
    const core = dark ? J.mix(tube, '#FFFFFF', 0.72) : J.mix(tube, '#FFFFFF', 0.35);
    const EN = J.ENTER[cut.enter], EX = J.EXIT[cut.exit];
    const solid = (EN && EN.pieces && env.pIn < 1) || (EX && EX.pieces && env.pOut > 0);
    const gl = glyphPts(base);
    const tw = Math.max(1.5, size * (dark ? 0.05 : 0.06)), cw = Math.max(1, size * 0.018);
    const glow = { color: J.rgba(tube, dark ? 0.95 : 0.55), blur: Math.min(60, size * (dark ? 0.24 : 0.14)) };
    let bb = null;
    // ignition + occasional flicker (on the ≤24 Hz step clock)
    const on = (i, t0) => {
      const t = lt - t0;
      if (t < 0) return 0;
      if (t < 0.32) return J.r(s, i, env.step, 3) < 0.25 + t * 2 ? 1 : 0.12;
      if (Pm.flick && J.r(s, i, Math.floor(env.step / 2), 4) < 0.007) return 0.2;
      return 1;
    };
    gl.forEach((g, i) => {
      const t0 = 0.04 + J.r(s, i, 5) * 0.28;
      const k = on(i, t0);
      if (k <= 0) return;
      const common = { text: g.ch, font: Pm.font, size, x: g.x, y: g.y, mi: i * 0.4 };
      if (solid) { bb = U(bb, J.mainDraw(env, Object.assign(common, { color: tube, shadow: glow, alpha: k }))); return; }
      const r = J.mainDraw(env, Object.assign({}, common, { fill: false, stroke: tw, strokeColor: tube, color: tube, shadow: k > 0.5 ? glow : null, alpha: k }));
      J.mainDraw(env, Object.assign({}, common, { fill: false, stroke: cw, strokeColor: core, color: core, alpha: k > 0.5 ? 1 : 0.3, ghost: false }));
      bb = U(bb, r);
    });
    // neon frame
    const fb = bb || bbRect(W / 2 - 10, H / 2 - 10, W / 2 + 10, H / 2 + 10);
    const fk = on(99, 0.22) * (1 - E.inCubic(env.pOut));
    if (Pm.frame !== 'none' && fk > 0 && bb) {
      const px = size * 0.55, py = size * 0.42;
      const x0 = fb.x0 - px, x1 = fb.x1 + px, y0 = fb.y0 - py, y1 = fb.y1 + py;
      const lw = Math.max(1.5, size * 0.035);
      const path = [];
      if (Pm.frame === 'under') path.push([[x0 + px * 0.5, y1], [x1 - px * 0.5, y1]]);
      else if (Pm.frame === 'bracket') { const c = size * 0.5; path.push([[x0, y0 + c], [x0, y0], [x0 + c, y0]], [[x1 - c, y0], [x1, y0], [x1, y0 + c]], [[x1, y1 - c], [x1, y1], [x1 - c, y1]], [[x0 + c, y1], [x0, y1], [x0, y1 - c]]); }
      if (env.pass === 'main') {
        ctx.save(); ctx.shadowColor = glow.color; ctx.shadowBlur = glow.blur * 0.8 * env.scale; ctx.lineCap = 'round';
        if (Pm.frame === 'box') env.rrect(x0, y0, x1 - x0, y1 - y0, size * 0.3, null, fk, false, tube, lw);
        else path.forEach(p => env.line(p, tube, lw, fk, false));
        ctx.restore();
        if (Pm.frame === 'box') env.rrect(x0, y0, x1 - x0, y1 - y0, size * 0.3, null, fk, false, core, lw * 0.35);
        else path.forEach(p => env.line(p, core, lw * 0.35, fk, false));
      } else {
        if (Pm.frame === 'box') env.rrect(x0, y0, x1 - x0, y1 - y0, size * 0.3, null, fk, true, tube, lw);
        else path.forEach(p => env.line(p, tube, lw, fk, true));
      }
      if (Pm.sub && env.pass === 'main') {
        const rom = romaOf(cut.text);
        const st = rom || (cut.lineText !== cut.text ? cut.lineText : null);
        if (st) {
          const fs = J.clamp(size * 0.2, 12, 34);
          const c2 = [sc.accent2, sc.fg, sc.sub].find(c => c && c !== tube && J.contrast(c, sc.bg) >= 2) || sc.sub;
          ctx.save(); ctx.shadowColor = J.rgba(c2, 0.9); ctx.shadowBlur = fs * 0.6 * env.scale;
          env.draw({ text: st, font: monoF(env), size: fs, track: 0.3, x: (x0 + x1) / 2, y: y1 + fs * 1.6, color: c2, alpha: fk * on(98, 0.4), ghost: false });
          ctx.restore();
        }
      }
    }
    return bb;
  },
}, P);

/* rows of equal cells for per-glyph layouts: returns [{i, ch, x, y}] and the cell size */
const cellRows = (chs, W, H, maxPerRow, cellAsp, maxK, gapK = 0.14, stagger = false) => {
  const n = chs.length, rows = Math.ceil(n / maxPerRow), per = Math.ceil(n / rows);
  const wk = per + (per - 1) * gapK + (stagger && rows > 1 ? 0.5 : 0);
  const hk = rows * cellAsp + (rows - 1) * gapK * 1.6;
  const k = Math.min(W * 0.86 / wk, H * 0.7 / hk, maxK);
  const out = [];
  for (let i = 0; i < n; i++) {
    const r = Math.floor(i / per), j = i - r * per, cnt = Math.min(per, n - r * per);
    const x = W / 2 + (j - (cnt - 1) / 2) * k * (1 + gapK) + (stagger && rows > 1 ? (r % 2 ? 0.25 : -0.25) * k : 0);
    const y = H / 2 + (r - (rows - 1) / 2) * k * (cellAsp + gapK * 1.6);
    out.push({ i, ch: chs[i], x, y, r, j });
  }
  return { cells: out, k, rows };
};

/* ================================================================== 11 keycaps — キーキャップ */
J.register('layout', 'keycaps', {
  name: 'キーキャップ', nameEn: 'Keycaps', tags: ['pop', 'graphic'], w: 0.6, treat: 'safe', fits: n => n >= 1 && n <= 10,
  enterBias: { cut: 2.5, pop: 1.2, blur: 0.6, slice: 0.3, wipe: 0.3, stretch: 0.3, assemble: 0.3 },
  plan(rng, cut, st) {
    return {
      font: rng.pick(fontsOf(st, ['display', 'body'])), style: rng.pick(['light', 'light', 'dark']), stagger: rng.chance(0.6),
      accent: rng.int(0, 20), legend: rng.chance(0.7), plate: rng.chance(0.45),
    };
  },
  render(env) {
    const { W, H, sc, ctx } = env, cut = env.cut, Pm = cut.params, s = cut.seed, M = Math.min(W, H), lt = env.lt;
    const chs = slotsOf(cut.text), n = chs.length;
    if (!n) return null;
    const port = W < H;
    const { cells, k, rows } = cellRows(chs, W, H, port ? 4 : (n > 8 ? 5 : 10), 1.06, M * 0.26, 0.16, Pm.stagger);
    const lightC = J.lum(sc.fg) > J.lum(sc.bg) ? sc.fg : sc.bg, darkC = lightC === sc.fg ? sc.bg : sc.fg;
    const d = k * 0.15, rr = k * 0.16;
    const out = outK(env);
    const gap = J.clamp(cut.dur * 0.38 / n, 0.05, 0.13);
    const acc = n > 2 ? Pm.accent % n : -1;
    let bb = null;
    if (Pm.plate) {
      const e = inE(env, 0.35) * out;
      let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
      for (const c of cells) { x0 = Math.min(x0, c.x - k / 2); x1 = Math.max(x1, c.x + k / 2); y0 = Math.min(y0, c.y - k / 2); y1 = Math.max(y1, c.y + k / 2 + d); }
      const p = k * 0.22;
      env.rrect(x0 - p, y0 - p, x1 - x0 + p * 2, (y1 - y0 + p * 2) * e, rr * 1.4, J.mix(sc.bg, darkC === sc.bg ? lightC : darkC, 0.1), 1, false, sc.sub, 1);
    }
    for (const c of cells) {
      if (c.ch === ' ') continue;
      const ti = 0.14 + c.i * gap;
      const q = E.outBack(J.clamp((lt - c.i * 0.025) / 0.2), 1.6);
      if (q <= 0 || out <= 0) continue;
      const gh = gIn(env);
      // press: first when typed, then an occasional re-press
      let pr = 0;
      const press = (t) => (t < 0 ? 0 : t < 0.05 ? t / 0.05 : t < 0.09 ? 1 : t < 0.22 ? 1 - (t - 0.09) / 0.13 : 0);
      pr = press(lt - ti);
      const re = lt - (0.14 + n * gap + 0.3);
      if (re > 0) {
        if (env.beat && env.beat.len > 0.2) { if (J.h(s, env.beat.index, 3) % n === c.i) pr = Math.max(pr, press(env.beat.since)); }
        else { const P0 = 0.55, kk = Math.floor(re / P0); if (J.h(s, kk, 3) % n === c.i) pr = Math.max(pr, press(re - kk * P0)); }
      }
      const isA = c.i === acc;
      let top, side, leg;
      if (isA) { top = plateCol(sc, [sc.accent, sc.ink]); side = J.mix(top, darkC, 0.4); leg = onCol(sc, top); }
      else if (Pm.style === 'light') { top = lightC; side = J.mix(lightC, darkC, 0.32); leg = darkC; }
      else { top = J.mix(darkC, lightC, 0.16); side = J.mix(darkC, lightC, 0.06); leg = lightC; }
      ctx.save(); ctx.translate(c.x, c.y); ctx.scale(q, q);
      const dy = pr * d * 0.75;
      env.rrect(-k / 2, -k / 2 + d * 0.35, k, k + d * 0.65, rr, side, out, gh);
      const ins = k * 0.09;
      env.rrect(-k / 2 + ins * 0.5, -k / 2 + dy, k - ins, k - ins * 0.9, rr * 0.85, J.mix(top, side, 0.35), out, false);
      env.rrect(-k / 2 + ins, -k / 2 + dy + ins * 0.35, k - ins * 2, k - ins * 2.1, rr * 0.7, top, out, false, Pm.style === 'dark' && !isA ? sc.sub : null, 1);
      if (Pm.legend && lt > ti) {
        const rom = J.romaji(c.ch);
        if (rom) env.draw({ text: rom.toUpperCase(), font: monoF(env), size: k * 0.13, align: 'left', x: -k / 2 + ins * 1.9, y: -k / 2 + dy + ins * 1.7, color: leg, alpha: 0.7 * out, ghost: false });
      }
      ctx.restore();
      const it = { text: c.ch, font: Pm.font, size: k * 0.52, x: c.x, y: c.y - k * 0.03 + dy * q, color: leg, noHold: plateHold(env), mi: miAt(env, ti) };
      if (q < 1) { it.size *= q; it.x = c.x; it.y = c.y + (it.y - c.y) * q; }
      bb = U(bb, J.mainDraw(env, it));
    }
    return bb;
  },
}, P);

/* ================================================================== 12 bubbles — 泡 */
J.register('layout', 'bubbles', {
  name: '泡', nameEn: 'Bubbles', tags: ['pop', 'calm'], w: 0.8, treat: 'safe', fits: n => n >= 1 && n <= 12,
  enterBias: { pop: 1.6, cut: 1.5, blur: 1.2, slice: 0.3, wipe: 0.3, stretch: 0.3 },
  plan(rng, cut, st) {
    return { font: rng.pick(fontsOf(st, ['display', 'body'])), style: rng.pick(['soap', 'soap', 'solid', 'mixed']), rise: rng.range(0.018, 0.035), wob: rng.range(0.6, 1.2), motes: rng.chance(0.75) };
  },
  render(env) {
    const { W, H, sc, ctx } = env, cut = env.cut, Pm = cut.params, s = cut.seed, M = Math.min(W, H), lt = env.lt;
    const chs = slotsOf(cut.text), n = chs.length;
    if (!n) return null;
    const port = W < H;
    const { cells, k } = cellRows(chs, W, H, port ? 4 : 7, 1.1, M * 0.3, 0.12, true);
    const out = outK(env), popK = 1 + 0.35 * E.outCubic(env.pOut);
    const lift = -H * Pm.rise * env.ltb;
    // background motes rising
    if (Pm.motes) {
      for (let m = 0; m < 14; m++) {
        const sp = J.rr(0.05, 0.12, s, m, 1) * H, per = H * 1.2 / sp;
        const t = (env.ltb + J.r(s, m, 2) * per) % per;
        const y = H * 1.08 - t * sp, x = J.rr(0.04, 0.96, s, m, 3) * W + Math.sin(env.ltb * 1.7 + m) * M * 0.012;
        const r = J.rr(0.006, 0.02, s, m, 4) * M;
        env.circle(x, y, r, null, sc.sub, Math.max(1, r * 0.12), 0.45 * out * inE(env, 0.5), false);
      }
    }
    let bb = null;
    for (const c of cells) {
      if (c.ch === ' ') continue;
      const kind = J.isKanji(c.ch) ? 1 : J.isSmallKana(c.ch) || J.isPunct(c.ch) ? 0.7 : 0.86;
      const R = k * 0.5 * kind * (0.94 + 0.12 * J.r(s, c.i, 5));
      const t0 = 0.04 + c.i * 0.05 + J.r(s, c.i, 6) * 0.08;
      const q0 = J.clamp((lt - t0) / 0.3);
      if (q0 <= 0) continue;
      const q = E.outBack(q0, 2.2);
      const ph = J.r(s, c.i, 7) * J.TAU;
      const x = c.x + Math.sin(env.ltb * 1.6 * Pm.wob + ph) * R * 0.1 + J.rs(s, c.i, 8) * k * 0.1;
      const y = c.y + lift * (0.7 + 0.6 * J.r(s, c.i, 9)) + Math.cos(env.ltb * 1.2 + ph) * R * 0.06 + J.rs(s, c.i, 10) * k * 0.14;
      const solid = Pm.style === 'solid' || (Pm.style === 'mixed' && J.r(s, c.i, 11) < 0.4);
      const Rr = R * q * popK;
      let tc = sc.fg;
      if (solid) {
        const f = c.i % 3 === 1 ? plateCol(sc, [sc.accent, sc.ink]) : plateCol(sc, [sc.ink, sc.accent]);
        env.circle(x, y, Rr, f, null, 0, out, gIn(env));
        tc = onCol(sc, f);
      } else {
        env.circle(x, y, Rr, sc.fg, null, 0, 0.07 * out, false);
        env.circle(x, y, Rr, null, sc.fg, Math.max(1.2, R * 0.035), 0.85 * out, gIn(env));
        env.arc(x, y, Rr * 0.78, 200, 245, sc.fg, Math.max(1.5, R * 0.07), 0.9 * out, false);
        env.circle(x + Rr * 0.52, y - Rr * 0.52, Math.max(1.5, R * 0.05), sc.fg, null, 0, 0.9 * out, false);
      }
      bb = U(bb, J.mainDraw(env, { text: c.ch, font: Pm.font, size: R * 1.05 * Math.min(1, q), x, y, color: tc, noHold: plateHold(env), mi: miAt(env, t0) }));
    }
    return bb;
  },
}, P);

/* ================================================================== 13 slotMachine — スロット */
J.register('layout', 'slotMachine', {
  name: 'スロット', nameEn: 'Slot machine', tags: ['pop', 'glitch'], w: 0.6, treat: 'safe', fits: n => n >= 1 && n <= 10,
  enterBias: { cut: 3, flicker: 0.6, blur: 0.5, slice: 0.2, wipe: 0.2, assemble: 0.2, type: 0.2 },
  plan(rng, cut, st) {
    return { font: rng.pick(fontsOf(st, ['display'])), style: rng.pick(['cabinet', 'window', 'cabinet']), v: rng.range(13, 18), line: rng.chance(0.7) };
  },
  render(env) {
    const { W, H, sc, ctx } = env, cut = env.cut, Pm = cut.params, s = cut.seed, M = Math.min(W, H), lt = env.lt;
    const chs = slotsOf(cut.text), n = chs.length;
    if (!n) return null;
    const port = W < H;
    const { cells, k } = cellRows(chs, W, H, port ? 5 : 10, 1.34, M * 0.24, 0.1);
    const w = k, h = k * 1.34, step = k * 0.92, gsz = k * 0.7;
    const pool = poolOf(cut), NP = pool.length;
    const out = outK(env), inA = inE(env, 0.25);
    const gap = J.clamp(cut.dur * 0.3 / n, 0.08, 0.2);
    const t1 = J.clamp(cut.dur * 0.16, 0.2, 0.45);
    const cab = Pm.style === 'cabinet';
    const panel = plateCol(sc, [sc.ink, sc.fg]);
    const winC = cab ? onCol(sc, panel) === sc.bg ? sc.bg : J.mix(sc.bg, sc.fg, 0.06) : sc.bg;
    const glyC = J.contrast(sc.fg, winC) > 2.5 ? sc.fg : onCol(sc, winC);
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (const c of cells) { x0 = Math.min(x0, c.x - w / 2); x1 = Math.max(x1, c.x + w / 2); y0 = Math.min(y0, c.y - h / 2); y1 = Math.max(y1, c.y + h / 2); }
    if (cab) { const p = k * 0.22; env.rrect(x0 - p, y0 - p, x1 - x0 + p * 2, y1 - y0 + p * 2, p * 1.2, panel, out * inA, gIn(env)); }
    let bb = null;
    for (const c of cells) {
      if (c.ch === ' ') continue;
      const ts = t1 + c.i * gap;
      const tau = ts - lt;
      const FIN = 1000;
      let p = tau > 0 ? FIN - Pm.v * tau : FIN + 0.22 * Math.sin(-tau * 30) * Math.exp(tau / 0.08);
      const wx = c.x - w / 2, wy = c.y - h / 2;
      env.rect(wx, wy, w, h * inA, winC, out, false);
      ctx.save(); ctx.beginPath(); ctx.rect(wx, wy, w, h); ctx.clip();
      const fast = tau > 0.05;
      const j0 = Math.floor(p) - 1, j1 = Math.ceil(p) + 1;
      for (let j = j0; j <= j1; j++) {
        const y = c.y + (j - p) * step;
        if (j === FIN && tau <= 0) continue;
        const ch = j === FIN ? c.ch : pool[J.h(s, c.i, j) % NP];
        if (fast) {                   // cheap motion blur: the same (cached) glyph smeared along the reel
          for (const o of [-0.16, 0.16]) env.draw({ text: ch, font: Pm.font, size: gsz, x: c.x, y: y + o * step, color: glyC, alpha: 0.22 * out, ghost: false });
          env.draw({ text: ch, font: Pm.font, size: gsz, x: c.x, y, color: glyC, alpha: 0.5 * out, ghost: false });
        } else env.draw({ text: ch, font: Pm.font, size: gsz, x: c.x, y, color: glyC, alpha: 0.9 * out, ghost: false });
      }
      if (tau <= 0) bb = U(bb, J.mainDraw(env, { text: c.ch, font: Pm.font, size: gsz, x: c.x, y: c.y + (FIN - p) * step, color: glyC, noHold: plateHold(env), mi: miAt(env, ts) }));
      ctx.restore();
      if (env.pass === 'main') {       // cylinder shading
        const g = ctx.createLinearGradient(0, wy, 0, wy + h);
        g.addColorStop(0, J.rgba(winC, 0.95)); g.addColorStop(0.3, J.rgba(winC, 0)); g.addColorStop(0.7, J.rgba(winC, 0)); g.addColorStop(1, J.rgba(winC, 0.95));
        ctx.save(); ctx.globalAlpha = out; ctx.fillStyle = g; ctx.fillRect(wx, wy, w, h); ctx.restore();
      }
      env.rrect(wx, wy, w, h, k * 0.06, null, out * inA, false, cab ? J.mix(panel, winC, 0.5) : sc.fg, Math.max(1.5, k * 0.02));
    }
    if (Pm.line) {
      const rowsY = [...new Set(cells.map(c => c.y))];
      for (const y of rowsY) {
        const tri = k * 0.1, xa = x0 - k * 0.12, xb = x1 + k * 0.12;
        env.line([[xa, y], [J.lerp(xa, xb, inA), y]], sc.accent, Math.max(1.2, k * 0.012), 0.7 * out, false);
        env.poly([[xa - tri * 1.6, y - tri], [xa, y], [xa - tri * 1.6, y + tri]], sc.accent, out * inA, false);
        env.poly([[xb + tri * 1.6, y - tri], [xb, y], [xb + tri * 1.6, y + tri]], sc.accent, out * inA, false);
      }
    }
    return bb || bbRect(x0, y0, x1, y1);
  },
}, P);

/* ================================================================== 14 flipBoard — パタパタ */
J.register('layout', 'flipBoard', {
  name: 'パタパタ', nameEn: 'Flap board', tags: ['graphic', 'editorial'], w: 0.7, treat: 'safe', fits: n => n >= 1 && n <= 12,
  enterBias: { cut: 3, flicker: 0.5, blur: 0.4, slice: 0.2, wipe: 0.3, assemble: 0.2, type: 0.3 },
  plan(rng, cut, st) {
    return { font: rng.pick(fontsOf(st, ['display', 'body'])), header: rng.chance(0.65), flips: rng.int(3, 5), style: rng.pick(['ink', 'ink', 'fg']) };
  },
  render(env) {
    const { W, H, sc, ctx } = env, cut = env.cut, Pm = cut.params, s = cut.seed, M = Math.min(W, H), lt = env.lt;
    const chs = [...String(cut.text).trim()].filter(c => c !== '　'), n = chs.length;
    if (!n) return null;
    const port = W < H;
    const { cells, k, rows } = cellRows(chs, W, H, port ? 5 : 12, 1.32, M * 0.24, 0.08);
    const w = k, h = k * 1.32, gsz = k * 0.78;
    const panel = plateCol(sc, Pm.style === 'fg' ? [sc.fg, sc.ink] : [sc.ink, sc.fg]);
    const flap = J.mix(panel, sc.bg, 0.08), gc = onCol(sc, panel);
    const pool = poolOf(cut), NP = pool.length;
    const fd = 0.065, t0 = 0.06;
    const out = outK(env), inA = inE(env, 0.2);
    const lw = Math.max(1.5, k * 0.018);
    let bb = null;
    let x0 = 1e9, x1 = -1e9, y0 = 1e9;
    for (const c of cells) {
      x0 = Math.min(x0, c.x - w / 2); x1 = Math.max(x1, c.x + w / 2); y0 = Math.min(y0, c.y - h / 2);
      const q = E.outCubic(J.clamp((lt - c.i * 0.02) / 0.18)) * out;
      if (q <= 0) continue;
      const wx = c.x - w / 2, wy = c.y - h / 2;
      env.rrect(wx, wy, w, h, k * 0.07, panel, q, gIn(env));
      const F = Pm.flips + c.i % 3 + Math.floor(c.i * 0.7);
      const settle = t0 + F * fd;
      const space = c.ch === ' ';
      const chAt = (m) => (m <= 0 ? '' : m >= F ? c.ch : pool[J.h(s, c.i, m) % NP]);
      const u = (lt - t0) / fd;
      const g = { font: Pm.font, size: gsz, x: c.x, y: c.y, color: gc, ghost: false, alpha: q };
      const half = (ch, top, sy) => { if (!ch || ch === ' ' || sy <= 0.01) return; env.draw(Object.assign({}, g, { text: ch, charFn: () => ({ clipY: top ? [-0.75, 0] : [0, 0.75], sy }) })); };
      if (lt >= settle) {
        if (!space) bb = U(bb, J.mainDraw(env, { text: c.ch, font: Pm.font, size: gsz, x: c.x, y: c.y, color: gc, alpha: q, noHold: plateHold(env), mi: miAt(env, settle) }));
      } else if (u > 0) {
        const m = Math.floor(u), f = u - m;
        const A = chAt(m), B = chAt(m + 1);
        half(B, true, 1); half(A, false, 1);
        // the falling flap
        const sy = Math.round(Math.abs(Math.cos(f * Math.PI)) * 6) / 6;     // quantised so the squashed glyphs stay cached
        ctx.save();
        if (f < 0.5) { env.rect(wx, c.y - h / 2 * sy, w, h / 2 * sy, flap, q, false); half(A, true, sy); env.rect(wx, c.y - h / 2 * sy, w, h / 2 * sy, sc.bg, q * f * 0.5, false); }
        else { env.rect(wx, c.y, w, h / 2 * sy, flap, q, false); half(B, false, sy); env.rect(wx, c.y, w, h / 2 * sy, sc.bg, q * (1 - f) * 0.5, false); }
        ctx.restore();
      }
      env.rect(wx, c.y - lw / 2, w, lw, sc.bg, q, false);
      env.rect(wx - lw * 0.6, c.y - h * 0.07, lw * 1.2, h * 0.14, J.mix(panel, sc.bg, 0.5), q, false);
      env.rect(wx + w - lw * 0.6, c.y - h * 0.07, lw * 1.2, h * 0.14, J.mix(panel, sc.bg, 0.5), q, false);
    }
    if (Pm.header) {
      const fs = J.clamp(k * 0.2, 12, 30);
      const lab = `LINE ${String((cut.line | 0) + 1).padStart(2, '0')}`, tm = J.fmtTime(cut.start);
      const a = inA * out;
      env.draw({ text: lab, font: monoF(env), size: fs, track: 0.2, align: 'left', x: x0, y: y0 - fs * 1.4, color: sc.sub, alpha: a, ghost: false });
      env.draw({ text: tm, font: monoF(env), size: fs, track: 0.2, align: 'right', x: x1, y: y0 - fs * 1.4, color: sc.accent, alpha: a, ghost: false });
    }
    return bb;
  },
}, P);

/* ================================================================== 15 credits — エンドロール */
J.register('layout', 'credits', {
  name: 'エンドロール', nameEn: 'End credits', tags: ['calm', 'editorial', 'emotional'], w: 1, fits: n => n >= 1 && n <= 16,
  plan(rng, cut, st) {
    return { font: rng.pick(fontsOf(st, ['serif', 'display'])), fc: rng.pick(fontsOf(st, ['serif', 'body'])), variant: rng.pick(['center', 'center', 'side', 'single']), speed: rng.range(0.035, 0.06), off: rng.range(0, 10) };
  },
  render(env) {
    const { W, H, sc } = env, cut = env.cut, Pm = cut.params, s = cut.seed, M = Math.min(W, H);
    const port = W < H;
    const variant = port && Pm.variant === 'side' ? 'center' : Pm.variant;
    const side = variant === 'side';
    const mt = mainLines(cut.text, W, H, side ? 6 : 10, 5);
    const size = Math.min(J.fitSize(mt, Pm.font, side ? W * 0.44 : W * 0.72, H * 0.26, { track: 0.06, lead: 1.2 }), H * 0.16);
    const mx = side ? W * 0.3 : W / 2;
    // credit rows
    const txt = clean(cut.text), rom = romaOf(txt);
    const vals = [], seen = new Set();
    const add = (r, v) => { v = String(v || '').trim(); if (v && !seen.has(v)) { seen.add(v); vals.push([r, v]); } };
    const line = cut.lineText || cut.text;
    add('LYRIC', line);
    J.chunkText(line).forEach((c, i) => add(i === 0 ? 'WORD' : '', c));
    (J.segments(line) || []).forEach(g => { if (J.glyphCount(g) >= 2) add('', g); });
    if (rom) add('READING', rom);
    if (cut.note) add('NOTE', cut.note);
    add('LINE', String((cut.line | 0) + 1).padStart(2, '0'));
    add('TIME', J.fmtTime(cut.start));
    const fs = J.clamp(M * 0.026, 14, 36), rowH = fs * 2.3, block = vals.length * rowH + rowH * 2;
    const scroll = (env.ltb + Pm.off) * Pm.speed * H;
    const a0 = inE(env, 0.6) * outK(env);
    const cx = side ? W * 0.74 : W / 2;
    const bandH = side ? 0 : size * mt.split('\n').length * 1.25 / 2 + fs * 2.2;
    const lw = Math.max(1, M * 0.0012);
    for (let y = H * 1.05 - (scroll % block) - block * Math.ceil(H * 1.1 / block), rep = 0; y < H * 1.05 && rep < 12; y += block, rep++) {
      vals.forEach(([r, v], i) => {
        const yy = y + i * rowH;
        if (yy < -rowH || yy > H + rowH) return;
        const edge = J.smooth(H * 0.02, H * 0.14, yy) * J.smooth(H * 0.98, H * 0.86, yy);
        const band = side ? 1 : J.smooth(bandH, bandH + fs * 2, Math.abs(yy - H / 2));
        const a = a0 * edge * band;
        if (a < 0.01) return;
        if (variant === 'single') {
          if (r) env.draw({ text: r, font: monoF(env), size: fs * 0.62, track: 0.3, x: cx, y: yy - fs * 0.95, color: sc.sub, alpha: a * 0.8, ghost: false });
          env.draw({ text: v, font: Pm.fc, size: fs, track: 0.12, x: cx, y: yy, color: sc.fg, alpha: a * 0.85, ghost: false });
        } else {
          const g = fs * 0.9;
          if (r) env.draw({ text: r, font: /[A-Z]/.test(r) ? monoF(env) : Pm.fc, size: fs * 0.72, track: 0.25, align: 'right', x: cx - g, y: yy, color: sc.sub, alpha: a * 0.85, ghost: false });
          env.draw({ text: v, font: Pm.fc, size: fs, track: 0.1, align: 'left', x: cx + g, y: yy, color: sc.fg, alpha: a * 0.85, ghost: false });
        }
      });
    }
    if (side) env.line([[W * 0.52, H * 0.2], [W * 0.52, H * 0.2 + H * 0.6 * inE(env, 0.8)]], sc.sub, lw, 0.5 * outK(env), false);
    return J.mainDraw(env, { text: mt, font: Pm.font, size, x: mx, y: H / 2, track: 0.06, lead: 1.2, color: sc.fg });
  },
}, P);

/* ================================================================== 16 zoomRepeat — 連続拡大 */
J.register('layout', 'zoomRepeat', {
  name: '連続拡大', nameEn: 'Continuous zoom', tags: ['glitch', 'emotional', 'graphic'], w: 0.9, emph: 1.5, busy: true, fits: n => n >= 1 && n <= 12,
  plan(rng, cut, st) {
    return {
      font: rng.pick(fontsOf(st, ['display', 'serif'])), dir: rng.pick([1, 1, -1]), style: rng.pick(['alt', 'alt', 'outline', 'fill']),
      twist: rng.chance(0.35) ? rng.range(3, 7) * rng.pick([1, -1]) : 0, q: rng.range(1.38, 1.6), speed: rng.range(0.35, 0.6),
    };
  },
  render(env) {
    const { W, H, sc } = env, cut = env.cut, Pm = cut.params, M = Math.min(W, H);
    const mt = mainLines(cut.text, W, H, 9, 5);
    const size = Math.min(J.fitSize(mt, Pm.font, W * 0.64, H * 0.3, { track: 0.03, lead: 1.1 }), H * 0.2);
    const mm = J.measure({ text: mt, font: Pm.font, size, track: 0.03, lead: 1.1 });
    const q = Pm.q, Lmax = Math.log(Math.max(W / mm.w, H / mm.h) * 2.6) / Math.log(q);
    const e = inE(env, 0.5), out = outK(env);
    const ph0 = env.ltb * Pm.speed * Pm.dir + (1 - e) * 1.5 * Pm.dir;
    const ph = ((ph0 % 1) + 1) % 1, base = Math.floor(ph0);
    const K = Math.min(9, Math.ceil(Lmax) + 1);
    for (let k = K; k >= 0; k--) {
      const L = k + ph;
      if (L < 0.3 || L > Lmax) continue;
      const fs = size * Math.pow(q, L);
      const a = J.smooth(0.3, 0.95, L) * (1 - J.smooth(Lmax * 0.35, Lmax, L)) * e * out * 0.7;
      if (a < 0.02) continue;
      const idx = k - base;
      const outline = Pm.style === 'outline' || (Pm.style === 'alt' && ((idx % 2) + 2) % 2 === 0);
      const it = { text: mt, font: Pm.font, size: fs, x: W / 2, y: H / 2, track: 0.03, lead: 1.1, rot: Pm.twist * L, ghost: false };
      if (outline) Object.assign(it, { fill: false, stroke: Math.max(1.2, fs * 0.01), strokeColor: sc.sub, alpha: a * 0.75 });
      else Object.assign(it, { color: J.mix(sc.bg, sc.sub, 0.16), alpha: a });
      env.draw(it);
    }
    J.mainDraw(env, { text: mt, font: Pm.font, size, x: W / 2, y: H / 2, track: 0.03, lead: 1.1, fill: false, stroke: size * 0.2, strokeColor: sc.bg, ghost: false, plain: true });
    return J.mainDraw(env, { text: mt, font: Pm.font, size, x: W / 2, y: H / 2, track: 0.03, lead: 1.1, color: sc.fg });
  },
}, P);

/* ================================================================== 17 splitHalves — 上下割り */
J.register('layout', 'splitHalves', {
  name: '上下割り', nameEn: 'Split halves', tags: ['graphic', 'glitch', 'editorial'], w: 1, emph: 1.2, fits: n => n >= 1 && n <= 14,
  enterBias: { cut: 1.8, slice: 0.3, wipe: 0.6 },
  plan(rng, cut, st) {
    return { font: rng.pick(fontsOf(st, ['display', 'serif'])), variant: rng.pick(['slide', 'slide', 'shear', 'duo']), dir: rng.pick([1, -1]), line: rng.pick(['full', 'short']), gap: rng.pick([0.07, 0.1, 0.13]) };
  },
  render(env) {
    const { W, H, sc, ctx } = env, cut = env.cut, Pm = cut.params, M = Math.min(W, H), lt = env.lt;
    const mt = mainLines(cut.text, W, H, 11, 5);
    const lines = mt.split('\n');
    const size = Math.min(J.fitSize(mt, Pm.font, W * 0.84, H * 0.5, { track: 0.04, lead: 1.3 }), H * 0.24);
    const lead = size * 1.3 + (Pm.gap * size);
    const D = W * 0.32;
    const e = E.outExpo(J.clamp((lt - 0.04) / 0.7));
    const ex = E.inExpo(env.pOut);
    const lw = Math.max(1.5, size * 0.016);
    let bb = null;
    lines.forEach((ln, li) => {
      const y = H / 2 + (li - (lines.length - 1) / 2) * lead;
      const m = J.measure({ text: ln, font: Pm.font, size, track: 0.04 });
      const dirL = Pm.dir * (li % 2 ? -1 : 1);
      let off = D * (1 - e) + (Pm.variant === 'shear' ? size * 0.14 * e * (1 + 0.25 * Math.sin(env.ltb * 1.7)) : 0) + W * 0.4 * ex;
      const g = Pm.gap * size / 2;
      [0, 1].forEach(h => {
        const dx = (h ? -1 : 1) * off * dirL;
        ctx.save(); ctx.beginPath();
        if (h === 0) ctx.rect(-W, y - size * 2 - g, W * 3, size * 2); else ctx.rect(-W, y + g, W * 3, size * 2);
        ctx.clip();
        const it = { text: ln, font: Pm.font, size, x: W / 2 + dx, y: y + (h ? g : -g), track: 0.04, color: sc.fg, mi: li * 2 + h };
        if (Pm.variant === 'duo' && h) Object.assign(it, { color: sc.accent });
        const r = J.mainDraw(env, it);
        ctx.restore();
        if (r) bb = U(bb, r);
      });
      // the cut line
      const le = E.outExpo(J.clamp((lt - 0.1) / 0.6)) * (1 - E.inCubic(env.pOut));
      if (le > 0) {
        const half = Pm.line === 'full' ? W * 0.5 : m.w / 2 + size * 0.7;
        env.line([[W / 2 - half * le, y], [W / 2 + half * le, y]], sc.accent, lw, 1, true);
        if (Pm.line === 'short') { env.circle(W / 2 - half * le, y, lw * 1.6, sc.accent, null, 0, 1, false); env.circle(W / 2 + half * le, y, lw * 1.6, sc.accent, null, 0, 1, false); }
      }
    });
    return bb;
  },
}, P);

/* ================================================================== 18 columnsBig — 大小縦組 */
J.register('layout', 'columnsBig', {
  name: '大小縦組', nameEn: 'Mixed-size vertical', tags: ['editorial', 'calm', 'emotional'], w: 1, portrait: 1.4, fits: n => n >= 1 && n <= 10,
  plan(rng, cut, st) {
    return { font: rng.pick(fontsOf(st, ['display', 'serif'])), fs: rng.pick(fontsOf(st, ['serif', 'body'])), side: rng.pick(['left', 'left', 'right']), rule: rng.chance(0.7), mark: rng.pick(['bar', 'dot', 'none']), off: rng.range(-0.05, 0.05) };
  },
  render(env) {
    const { W, H, sc } = env, cut = env.cut, Pm = cut.params, M = Math.min(W, H), lt = env.lt;
    const port = W < H;
    const txt = String(cut.text).trim().replace(/[\s\u3000]+/g, ' '), n = J.glyphCount(txt);
    const size = Math.min(J.fitSize(txt, Pm.font, port ? W * 0.44 : W * 0.3, H * 0.84, { vertical: true, track: 0.02 }), H * 0.42);
    const colH = J.measure({ text: txt, font: Pm.font, size, vertical: true, track: 0.02 }).h;
    const left = Pm.side === 'left';           // annotation columns on the left (read after the big column)
    const hx = W * (port ? (left ? 0.62 : 0.38) : (left ? 0.58 : 0.4)) + Pm.off * W;
    const top = H / 2 - colH / 2;
    const bb = J.mainDraw(env, { text: txt, font: Pm.font, size, x: hx, y: H / 2, vertical: true, track: 0.02, color: sc.fg });
    const fs = J.clamp(M * 0.031, 14, 44);
    const perCol = Math.max(4, Math.floor(colH * 0.92 / (fs * 1.08)));
    const line = String(cut.lineText || cut.text).replace(/\s+/g, '');
    const lineT = splitL(line, perCol);
    const rom = romaOf(txt);
    const sub2 = rom ? rom : cut.note ? String(cut.note) : `No.${String((cut.line | 0) + 1).padStart(2, '0')} ${J.fmtTime(cut.start)}`;
    const sgn = left ? -1 : 1;
    const gap = size * 0.5 + fs * 1.9;
    const x1 = hx + sgn * gap;
    const nL = lineT.split('\n').length;
    const x2 = x1 + sgn * (nL * fs * 1.7 + fs * 0.6);
    const reveal = (t0, cnt) => { const k = Math.floor(J.clamp((lt - t0) / 0.7) * (cnt + 0.99)); return (i) => (i >= k ? { hide: true } : null); };
    const out = outK(env);
    const c1 = J.glyphCount(lineT);
    // column block: multi-line vertical text grows right→left from its first column
    env.draw({ text: lineT, font: Pm.fs, size: fs, vertical: true, align: 'left', lead: 1.7, track: 0.06, x: x1 + sgn * (nL - 1) * fs * 0.85, y: top, color: sc.fg, alpha: 0.9 * out, ghost: false, charFn: reveal(0.18, c1) });
    env.draw({ text: sub2, font: rom ? monoF(env) : Pm.fs, size: fs * 0.72, vertical: true, align: 'left', track: 0.18, x: x2, y: top, color: sc.sub, alpha: 0.9 * out, ghost: false, charFn: reveal(0.35, J.glyphCount(sub2) + 2) });
    const lw = Math.max(1, M * 0.0014);
    if (Pm.rule) {
      const rx = hx + sgn * (size * 0.5 + fs * 0.85);
      env.line([[rx, top], [rx, top + colH * E.outCubic(J.clamp((lt - 0.1) / 0.6))]], sc.sub, lw, 0.7 * out, false);
    }
    if (Pm.mark !== 'none') {
      const q = E.outBack(J.clamp((lt - 0.15) / 0.3), 2) * out;
      if (Pm.mark === 'bar') env.rect(hx - size * 0.5, top - size * 0.28, size * q, Math.max(3, size * 0.06), sc.accent, 1, true);
      else env.circle(hx + (size * 0.5 + fs * 0.85) * sgn, top - fs * 0.9, fs * 0.28 * q, sc.accent, null, 0, 1, true);
    }
    return bb;
  },
}, P);

/* ================================================================== 19 circleWords — 同心円 */
J.register('layout', 'circleWords', {
  name: '同心円', nameEn: 'Concentric circles', tags: ['graphic', 'calm', 'editorial'], w: 1, fits: n => n >= 1 && n <= 14,
  plan(rng, cut, st) {
    return { font: rng.pick(fontsOf(st, ['display', 'serif'])), fr: rng.pick(fontsOf(st, ['body', 'serif'])), rings: rng.pick([2, 3, 3]), speed: rng.range(7, 13), dir: rng.pick([1, -1]), ticks: rng.chance(0.6), guides: rng.chance(0.7) };
  },
  render(env) {
    const { W, H, sc } = env, cut = env.cut, Pm = cut.params, s = cut.seed, M = Math.min(W, H), lt = env.lt;
    const cx = W / 2, cy = H / 2;
    const Rmax = Math.min(W, H) * 0.46;
    const gapR = M * 0.072;
    const R0 = Rmax - gapR * (Pm.rings - 1);
    const txt = String(cut.text).trim().replace(/[\s\u3000]+/g, ' '), n = J.glyphCount(txt);
    const mt = n <= 4 ? txt : splitL(txt, Math.ceil(n / Math.ceil(n / 5)));
    const size = Math.min(J.fitSize(mt, Pm.font, R0 * 1.45, R0 * 1.05, { track: 0.03, lead: 1.1 }), R0 * 0.55);
    const rom = romaOf(txt);
    const units = [
      String(cut.lineText || cut.text).replace(/\s+/g, ' ').trim() + '　✦　',
      (rom || (cut.words || []).join(' / ') || txt) + '  —  ',
      clean(txt) + '·',
    ];
    const out = outK(env);
    const lw = Math.max(1, M * 0.0014);
    for (let k = 0; k < Pm.rings; k++) {
      const e = E.outExpo(J.clamp((lt - k * 0.08) / 0.7));
      if (e <= 0) continue;
      const R = (R0 + k * gapR) * (0.9 + 0.1 * e);
      const f = J.clamp(gapR * 0.46 * (k === 1 ? 0.8 : 1), 10, 52);
      const font = k === 1 && rom ? monoF(env) : Pm.fr;
      const unit = [...units[k % units.length]];
      let uAdv = 0; for (const ch of unit) uAdv += J.metrics.adv(font, ch) * f * 1.08;
      const reps = Math.max(1, Math.min(12, Math.round(J.TAU * R / Math.max(1, uAdv))));
      const chars = []; for (let r = 0; r < reps; r++) chars.push(...unit);
      if (chars.length > 160) chars.length = 160;
      const tot = chars.reduce((a, ch) => a + J.metrics.adv(font, ch) * f * 1.08, 0);
      const kk = J.TAU * R / Math.max(1, tot);
      const a0 = (env.ltb * Pm.speed * (k % 2 ? -1 : 1) * Pm.dir + J.r(s, k, 3) * 360) * J.DEG;
      let acc = 0;
      const pos = chars.map(ch => { const ad = J.metrics.adv(font, ch) * f * 1.08 * kk; const a = a0 + (acc + ad / 2) / R; acc += ad; return a; });
      const col = k === 0 ? sc.fg : sc.sub;
      pathText(env, chars, font, f, (i) => { const a = pos[i]; return { x: cx + Math.sin(a) * R, y: cy - Math.cos(a) * R, rot: a / J.DEG, a: 0.9 * e * out, color: chars[i] === '✦' ? sc.accent : col }; });
      if (Pm.guides) env.circle(cx, cy, R + gapR * 0.5, null, sc.sub, lw, 0.35 * e * out, false);
      if (k === 0 && Pm.guides) env.circle(cx, cy, R - gapR * 0.5, null, sc.sub, lw, 0.35 * e * out, false);
    }
    if (Pm.ticks) {
      const Rt = R0 + (Pm.rings - 1) * gapR + gapR * 0.5;
      const e = inE(env, 0.9) * out, m = 72;
      for (let i = 0; i < m; i++) {
        if (i / m > e) break;
        const a = (i / m * 360 - env.ltb * Pm.speed * 0.5 * Pm.dir) * J.DEG, L = i % 6 === 0 ? gapR * 0.3 : gapR * 0.14;
        env.line([[cx + Math.sin(a) * Rt, cy - Math.cos(a) * Rt], [cx + Math.sin(a) * (Rt + L), cy - Math.cos(a) * (Rt + L)]], i % 18 === 0 ? sc.accent : sc.sub, lw, 0.6, false);
      }
    }
    return J.mainDraw(env, { text: mt, font: Pm.font, size, x: cx, y: cy, track: 0.03, lead: 1.1, color: sc.fg });
  },
}, P);

/* ================================================================== 20 dotMatrix — ドット表示 */
const _dm = new Map(), _dmGrid = new Map();
let _dmCv = null;
/* the unlit LED grid: one cached dot tile per colour/shape, laid down as a pattern aligned to the grid */
const dotTile = (col, shape) => {
  const key = col + '|' + shape;
  let t = _dmGrid.get(key);
  if (t) return t;
  const T = 64, cv = document.createElement('canvas'); cv.width = cv.height = T;
  const x = cv.getContext('2d'); x.fillStyle = col; x.beginPath();
  const rr = T * (shape === 'round' ? 0.38 : 0.4);
  if (shape === 'round') x.arc(T / 2, T / 2, rr, 0, J.TAU); else x.rect(T / 2 - rr, T / 2 - rr, rr * 2, rr * 2);
  x.fill();
  if (_dmGrid.size > 24) _dmGrid.clear();
  t = { cv, T }; _dmGrid.set(key, t);
  return t;
};
const dotSample = (mt, font, D, lead) => {
  const key = mt + '|' + font + '|' + D + '|' + lead;
  let r = _dm.get(key);
  if (r) return r;
  const SS = 4, fpx = D * SS * 0.94;
  const lay = J.layoutText({ text: mt, font, size: fpx, lead });
  const cols = Math.ceil(lay.W / SS) + 2, rows = Math.ceil(lay.H / SS) + 2;
  const cw = cols * SS, ch = rows * SS;
  if (!_dmCv) _dmCv = document.createElement('canvas');
  const cv = _dmCv; cv.width = cw; cv.height = ch;
  const x = cv.getContext('2d', { willReadFrequently: true });
  x.clearRect(0, 0, cw, ch);
  x.font = J.fontCSS(font, fpx); x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#fff';
  for (const g of lay) { if (g.ch !== ' ' && g.ch !== '　') x.fillText(g.ch, cw / 2 + g.x, ch / 2 + g.y); }
  const id = x.getImageData(0, 0, cw, ch).data;
  const lit = [];
  for (let r0 = 0; r0 < rows; r0++) for (let c0 = 0; c0 < cols; c0++) {
    let a = 0;
    for (let yy = 0; yy < SS; yy++) for (let xx = 0; xx < SS; xx++) a += id[((r0 * SS + yy) * cw + c0 * SS + xx) * 4 + 3];
    if (a / (SS * SS * 255) > 0.38) lit.push(c0, r0);
  }
  r = { cols, rows, lit, fscale: 0.94 * D, D };
  if (_dm.size > 40) _dm.clear();
  _dm.set(key, r);
  return r;
};
J.register('layout', 'dotMatrix', {
  name: 'ドット表示', nameEn: 'Dot matrix', tags: ['graphic', 'glitch', 'pop'], w: 0.7, treat: false, fits: n => n >= 1 && n <= 12,
  enterBias: { cut: 2.5, flicker: 1.6, scramble: 0.2, assemble: 0.2, type: 1.2 },
  plan(rng, cut, st) {
    return { font: rng.pick(['dot', 'gothic_black', 'dot']), reveal: rng.pick(['sweep', 'sweep', 'scroll', 'random']), panel: rng.chance(0.7), col: rng.pick(['accent', 'accent', 'fg']), shape: rng.pick(['round', 'round', 'square']) };
  },
  render(env) {
    const { W, H, sc, ctx } = env, cut = env.cut, Pm = cut.params, s = cut.seed, M = Math.min(W, H), lt = env.lt;
    const mt = mainLines(cut.text, W, H, 8, 4);
    const lines = mt.split('\n'), maxL = Math.max(...lines.map(l => J.glyphCount(l) || 1));
    const D = J.clamp(Math.floor(W * 0.86 / (maxL * M * 0.011)), 10, 16);
    const lead = 1.3;
    const smp = dotSample(mt, Pm.font, D, lead);
    const p = Math.min(W * 0.88 / smp.cols, H * 0.62 / smp.rows);
    const gw = smp.cols * p, gh = smp.rows * p, gx = W / 2 - gw / 2, gy = H / 2 - gh / 2;
    const dark = J.lum(sc.bg) < 0.45;
    const panel = Pm.panel ? (dark ? J.mix(sc.bg, sc.fg, 0.05) : (J.lum(sc.fg) < J.lum(sc.ink) ? sc.fg : sc.ink)) : sc.bg;
    const litC = [Pm.col === 'accent' ? sc.accent : sc.fg, sc.accent, sc.fg, sc.accent2, sc.bg].find(c => c && J.contrast(c, panel) >= 2.5) || onCol(sc, panel);
    const offC = J.mix(panel, litC, 0.13);
    const out = outK(env), inA = inE(env, 0.3);
    const rr = p * (Pm.shape === 'round' ? 0.38 : 0.4);
    const dot = (x, y) => { if (Pm.shape === 'round') { ctx.moveTo(x + rr, y); ctx.arc(x, y, rr, 0, J.TAU); } else ctx.rect(x - rr, y - rr, rr * 2, rr * 2); };
    if (env.pass !== 'main') return null;          // the LED panel carries no chromatic ghosts (and it keeps the clip cheap)
    if (out > 0) {
      if (Pm.panel) { const pd = p * 1.2; env.rrect(gx - pd, gy - pd, gw + pd * 2, gh + pd * 2, p * 1.2, panel, inA * out, false, J.mix(panel, litC, 0.3), Math.max(1, p * 0.12)); }
      const tile = dotTile(offC, Pm.shape), fr = J.clamp(lt / 0.3);
      if (fr > 0) {
        const pat = ctx.createPattern(tile.cv, 'repeat');
        let ok = true;
        try { pat.setTransform(new DOMMatrix().translate(gx, gy).scale(p / tile.T)); } catch (e) { ok = false; }
        if (ok) { ctx.save(); ctx.globalAlpha = inA * out; ctx.fillStyle = pat; ctx.fillRect(gx, gy, gw * fr, gh); ctx.restore(); }
      }
    }
    // lit dots: the lyric drawn through a stencil of its own sampled dot pattern
    const T = J.clamp(cut.dur * 0.3, 0.25, 0.7), t0 = 0.12;
    const u = J.clamp((lt - t0) / T);
    let shift = 0;
    if (Pm.reveal === 'scroll') shift = Math.round((1 - E.outCubic(u)) * smp.cols);
    const front = Pm.reveal === 'sweep' ? u * (smp.cols + 4) - 2 : 1e9;
    const L = smp.lit;
    ctx.save(); ctx.beginPath();
    let any = false;
    for (let k = 0; k < L.length; k += 2) {
      const c = L[k] + shift, r = L[k + 1];
      if (c >= smp.cols || c > front) continue;
      if (Pm.reveal === 'random' && J.r(s, L[k], r, 7) > u * 1.05) continue;
      dot(gx + (c + 0.5) * p, gy + (r + 0.5) * p); any = true;
    }
    if (!any) ctx.rect(-10, -10, 1, 1);
    ctx.clip();
    const fsz = smp.fscale * p;
    const bb = J.mainDraw(env, { text: mt, font: Pm.font, size: fsz, x: W / 2 + shift * p, y: H / 2, lead, color: litC, stroke: p * 0.9, strokeColor: litC, strokeUnder: true, noHold: true, ghost: false, mi: miAt(env, t0) });
    ctx.restore();
    // bright scan column at the sweep front
    if (Pm.reveal === 'sweep' && u > 0 && u < 1) {
      const fc = Math.floor(front);
      ctx.save(); ctx.globalAlpha = 0.9 * out; ctx.fillStyle = sc.fg; ctx.beginPath();
      for (let k = 0; k < L.length; k += 2) if (L[k] === fc) dot(gx + (L[k] + 0.5) * p, gy + (L[k + 1] + 0.5) * p);
      ctx.fill(); ctx.restore();
    }
    return bb ? bbRect(gx, gy, gx + gw, gy + gh) : null;
  },
}, P);

/* ================================================================== 21 depthStack — 奥行き重ね */
J.register('layout', 'depthStack', {
  name: '奥行き重ね', nameEn: 'Depth stack', tags: ['graphic', 'emotional', 'glitch'], w: 1, emph: 1.3, fits: n => n >= 1 && n <= 12,
  plan(rng, cut, st) {
    const a = rng.pick([-150, -120, -60, -30, 30, 60, 120, 150, -90, 90]) + rng.range(-12, 12);
    return { font: rng.pick(fontsOf(st, ['display', 'serif'])), ang: a, copies: rng.int(5, 8), dist: rng.range(0.42, 0.62), style: rng.pick(['outline', 'outline', 'dim', 'lines']), sway: rng.chance(0.7) };
  },
  render(env) {
    const { W, H, sc } = env, cut = env.cut, Pm = cut.params, M = Math.min(W, H), lt = env.lt;
    const mt = mainLines(cut.text, W, H, 9, 5);
    const size = Math.min(J.fitSize(mt, Pm.font, W * 0.66, H * 0.3, { track: 0.03, lead: 1.1 }), H * 0.2);
    const a = Pm.ang * J.DEG, dx = Math.cos(a), dy = Math.sin(a);
    const cx = W / 2 - dx * M * 0.05, cy = H / 2 - dy * M * 0.05;
    let vx = cx + dx * M * Pm.dist, vy = cy + dy * M * Pm.dist;
    if (Pm.sway) { vx += Math.sin(env.ltb * 0.7) * M * 0.05; vy += Math.cos(env.ltb * 0.55) * M * 0.035; }
    const N = Pm.copies, e = E.outCubic(J.clamp(lt / 0.7)), out = 1 - E.inCubic(env.pOut);
    const depth = e * out;
    const mm = J.measure({ text: mt, font: Pm.font, size, track: 0.03, lead: 1.1 });
    if (Pm.style === 'lines' && depth > 0.01) {
      const sN = 1 / (1 + N * 0.26 * depth);
      for (const [ox, oy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
        const x0 = cx + ox * mm.w / 2, y0 = cy + oy * mm.h / 2;
        const x1 = J.lerp(cx, vx, 1 - sN) + ox * mm.w / 2 * sN, y1 = J.lerp(cy, vy, 1 - sN) + oy * mm.h / 2 * sN;
        env.line([[x0, y0], [x1, y1]], sc.sub, Math.max(1, M * 0.0013), 0.5 * out, false);
      }
    }
    for (let k = N; k >= 1; k--) {
      const s1 = 1 / (1 + k * 0.26 * depth);
      if (depth <= 0.001) break;
      const x = J.lerp(cx, vx, 1 - s1), y = J.lerp(cy, vy, 1 - s1);
      const f = k / N;
      const it = { text: mt, font: Pm.font, size: size * s1, x, y, track: 0.03, lead: 1.1, ghost: false };
      if (Pm.style === 'dim') Object.assign(it, { color: J.mix(sc.bg, sc.sub, 0.55 - 0.4 * f), alpha: out });
      else Object.assign(it, { fill: false, stroke: Math.max(1, size * s1 * 0.014), strokeColor: k === 1 ? sc.accent : sc.sub, alpha: (0.85 - 0.6 * f) * out });
      env.draw(it);
    }
    return J.mainDraw(env, { text: mt, font: Pm.font, size, x: cx, y: cy, track: 0.03, lead: 1.1, color: sc.fg });
  },
}, P);

/* ================================================================== 22 typeSpecimen — 書体見本 */
const SPEC_FONTS = ['gothic_black', 'mincho', 'round', 'dot', 'brush', 'pop', 'dela', 'tokumin', 'zenkaku', 'gothic_light', 'mincho_black', 'sansui', 'mincho_light'];
J.register('layout', 'typeSpecimen', {
  name: '書体見本', nameEn: 'Type specimen', tags: ['editorial', 'graphic'], w: 0.8, fits: n => n >= 1 && n <= 8,
  plan(rng, cut, st) {
    const main = rng.pick(fontsOf(st, ['display', 'serif']));
    const pool = SPEC_FONTS.filter(k => k !== main && J.FONTS[k]);
    for (let i = pool.length - 1; i > 0; i--) { const j = rng.int(0, i); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    const port = cut.H > cut.W;
    return { main, fonts: pool.slice(0, 6), grid: port ? 'list' : rng.pick(['g2', 'g3', 'list']), num: rng.int(1, 30) };
  },
  render(env) {
    const { W, H, sc, ctx } = env, cut = env.cut, Pm = cut.params, M = Math.min(W, H), lt = env.lt;
    const txt = String(cut.text).trim();
    const out = outK(env);
    const lw = Math.max(1, M * 0.0014);
    const cap = J.clamp(M * 0.017, 11, 24);
    const mono = monoF(env);
    const cells = [];                 // {x, y, w, h, font, main}
    const mx = W * 0.07, my = H * 0.1, gw = W - mx * 2, gh = H - my * 2;
    if (Pm.grid === 'g2') {
      const g = M * 0.02, cw = (gw - g) / 2, ch = (gh - g) / 2;
      for (let i = 0; i < 4; i++) cells.push({ x: mx + (i % 2) * (cw + g), y: my + Math.floor(i / 2) * (ch + g), w: cw, h: ch, font: i === 0 ? Pm.main : Pm.fonts[i - 1], main: i === 0 });
    } else if (Pm.grid === 'g3') {
      const g = M * 0.018, cw = (gw - g * 2) / 3, ch = (gh - g * 2) / 3;
      cells.push({ x: mx, y: my, w: cw * 2 + g, h: ch * 2 + g, font: Pm.main, main: true });
      const rest = [[2, 0], [2, 1], [0, 2], [1, 2], [2, 2]];
      rest.forEach(([c, r], i) => cells.push({ x: mx + c * (cw + g), y: my + r * (ch + g), w: cw, h: ch, font: Pm.fonts[i], main: false }));
    } else {
      const rowsN = W < H ? 5 : 4;
      const hs = [2.2]; for (let i = 1; i < rowsN; i++) hs.push(1);
      const tot = hs.reduce((a2, b) => a2 + b, 0);
      let y = my;
      hs.forEach((hh, i) => { const h = gh * hh / tot; cells.push({ x: mx, y, w: gw, h, font: i === 0 ? Pm.main : Pm.fonts[i - 1], main: i === 0 }); y += h; });
    }
    let bb = null;
    cells.forEach((c, i) => {
      const d = 0.06 + i * 0.07;
      const e = E.outCubic(J.clamp((lt - d) / 0.4)) * out;
      if (e <= 0) return;
      // rule on top of each cell + caption
      env.line([[c.x, c.y], [c.x + c.w * E.outExpo(J.clamp((lt - d) / 0.5)), c.y]], c.main ? sc.accent : sc.sub, c.main ? lw * 3 : lw, (c.main ? 1 : 0.6) * out, false);
      const F = J.FONTS[c.font] || {};
      const label = `${String(Pm.num + i).padStart(2, '0')}  ${(F.label || c.font).toUpperCase()}  ${F.weight || ''}`;
      env.draw({ text: label, font: mono, size: cap, align: 'left', track: 0.08, x: c.x, y: c.y + cap * 1.1, color: c.main ? sc.accent : sc.sub, alpha: e, ghost: false });
      const list = Pm.grid === 'list';
      const tw = list ? c.w * (c.main ? 1 : 0.8) : c.w * 0.9, th = c.h - cap * (list ? 1.8 : 2.8);
      const fsz = Math.min(J.fitSize(txt, c.font, tw, th * (list ? 0.78 : 0.7), { track: 0.02 }), c.main ? H * 0.3 : H * 0.14);
      const it = { text: txt, font: c.font, size: fsz, track: 0.02, x: list ? c.x : c.x + c.w / 2, y: c.y + cap * (list ? 1.8 : 2.2) + th / 2, align: list ? 'left' : 'center', color: sc.fg };
      if (list && !c.main) { it.x = c.x + c.w * 0.2; it.y = c.y + c.h / 2 + cap * 0.3; }
      if (c.main) bb = J.mainDraw(env, it);
      else env.draw(Object.assign(it, { color: sc.sub, alpha: e * 0.9, y: it.y + (1 - e) * cap * 1.5, ghost: false }));
    });
    return bb;
  },
}, P);

/* ================================================================== 23 kanjiFocus — 一字強調 */
J.register('layout', 'kanjiFocus', {
  name: '一字強調', nameEn: 'Single-character focus', tags: ['emotional', 'editorial', 'calm'], w: 1, emph: 1.6, fits: n => n >= 2 && n <= 16,
  plan(rng, cut, st) {
    return { font: rng.pick(fontsOf(st, ['display', 'serif'])), fs: rng.pick(fontsOf(st, ['serif', 'display', 'body'])), mode: rng.pick(['dim', 'outline', 'tint']), pos: rng.pick(['center', 'side', 'side']), low: rng.chance(0.45), dots: rng.chance(0.7), dir: rng.pick([1, -1]) };
  },
  render(env) {
    const { W, H, sc } = env, cut = env.cut, Pm = cut.params, M = Math.min(W, H), lt = env.lt;
    const port = W < H;
    const raw = String(cut.text).trim();
    const chs = [...raw];
    let fi = chs.findIndex(c => J.isKanji(c));
    if (fi < 0) fi = chs.findIndex(c => c.trim() && !J.isPunct(c) && !J.isSmallKana(c));
    if (fi < 0) fi = 0;
    const fch = chs[fi];
    // the huge background glyph
    const big = port ? W * 1.05 : H * 1.02;
    const side = !port && Pm.pos === 'side';
    const bx = side ? W / 2 + Pm.dir * W * 0.2 : W / 2, by = H / 2;
    const u = J.clamp(lt / Math.max(0.5, cut.dur));
    const e = E.outCubic(J.clamp(lt / 0.8)), out = outK(env);
    const sz = big * (1.08 - 0.08 * E.outCubic(u)) * (1 + 0.04 * E.inCubic(env.pOut));
    const bi = { text: fch, font: Pm.font, size: sz, x: bx, y: by, ghost: false, alpha: e * out };
    if (Pm.mode === 'dim') bi.color = J.mix(sc.bg, sc.fg, 0.13);
    else if (Pm.mode === 'tint') bi.color = J.mix(sc.bg, sc.accent, 0.22);
    else Object.assign(bi, { fill: false, stroke: Math.max(1.2, sz * 0.004), strokeColor: sc.sub, alpha: e * out * 0.7 });
    env.draw(bi);
    // the full lyric, small, over it
    const mt = mainLines(raw, W, H, 16, 8);
    const base = { text: mt, font: Pm.fs, x: side ? W / 2 - Pm.dir * W * 0.12 : W / 2, y: Pm.low ? H * 0.74 : H / 2, track: 0.14, lead: 1.5 };
    base.size = Math.min(J.fitSize(mt, Pm.fs, side ? W * 0.44 : W * 0.7, H * 0.2, base), M * 0.075);
    const gl = glyphPts(base);
    let bb = null;
    let k = 0;
    gl.forEach((g, i) => {
      const isF = i === fi - [...raw.slice(0, fi)].filter(c => c === ' ' || c === '　').length;
      bb = U(bb, J.mainDraw(env, { text: g.ch, font: Pm.fs, size: base.size, x: g.x, y: g.y, color: isF ? sc.accent : sc.fg, mi: i * 0.6 }));
      if (isF && Pm.dots) {
        const q = E.outBack(J.clamp((lt - 0.35) / 0.25), 2) * out;
        env.circle(g.x, g.y - base.size * 0.78, base.size * 0.075 * q, sc.accent, null, 0, 1, true);
      }
      k++;
    });
    if (bb) {
      const le = E.outExpo(J.clamp((lt - 0.2) / 0.6)) * out;
      const y = bb.y1 + base.size * 0.7, x0 = bb.x0, x1 = bb.x1;
      env.line([[x0, y], [J.lerp(x0, x1, le), y]], sc.sub, Math.max(1, M * 0.0013), 0.6, false);
    }
    return bb;
  },
}, P);

/* ================================================================== 24 halfVertical — 縦横混植 */
J.register('layout', 'halfVertical', {
  name: '縦横混植', nameEn: 'Mixed vertical-horizontal', tags: ['editorial', 'graphic'], w: 1, fits: n => n >= 3 && n <= 14,
  plan(rng, cut, st) {
    return { font: rng.pick(fontsOf(st, ['display', 'serif'])), shape: rng.pick(['rowCol', 'rowCol', 'colRow']), guide: rng.pick(['bracket', 'tick', 'bracket']) };
  },
  render(env) {
    const { W, H, sc } = env, cut = env.cut, Pm = cut.params, M = Math.min(W, H), lt = env.lt;
    const txt = String(cut.text).trim().replace(/[\s\u3000]+/g, ' '), arr = [...txt], n = arr.length;
    const rowCol = Pm.shape === 'rowCol', port = W < H;
    // the arm that runs along the long side of the frame gets more glyphs; break at a natural boundary near that point
    const tgt = n * (port ? (rowCol ? 0.38 : 0.62) : (rowCol ? 0.6 : 0.4));
    const segB = new Set(); let acc = 0;
    for (const g of (J.segments(txt) || [])) { acc += [...g].length; segB.add(acc); }
    let cutAt = Math.max(1, Math.round(tgt)), bs = -1e9;
    for (let k = 1; k < n; k++) {
      const pa = arr[k - 1], pb = arr[k];
      let sc0 = -Math.abs(k - tgt) * 1.2;
      if (segB.has(k)) sc0 += 2;
      if (pa === ' ' || pb === ' ') sc0 += 3;
      if (J.isSmallKana(pb) || J.isPunct(pb) || pb === 'ー') sc0 -= 8;
      if (J.isSmallKana(pa)) sc0 -= 3;
      if (J.isHira(pa) && !J.isHira(pb)) sc0 += 1.5;
      if (sc0 > bs) { bs = sc0; cutAt = k; }
    }
    const A = arr.slice(0, cutAt).join('').trim() || arr[0], B = arr.slice(cutAt).join('').trim() || '';
    const tr = 0.06;
    const mA = J.measure({ text: A, font: Pm.font, size: 100, track: tr, vertical: !rowCol });
    const mB = J.measure({ text: B, font: Pm.font, size: 100, track: tr, vertical: rowCol });
    // extent in 'size' units
    const wU = rowCol ? mA.w / 100 : 1.25 + mB.w / 100;
    const hU = rowCol ? 1.25 + mB.h / 100 : mA.h / 100;
    const size = Math.min(W * 0.82 / wU, H * 0.8 / hU, M * 0.26);
    const x0 = W / 2 - wU * size / 2, y0 = H / 2 - hU * size / 2;
    let bb = null;
    const out = outK(env);
    let corner;
    if (rowCol) {
      const itA = { text: A, font: Pm.font, size, x: x0, y: y0 + size / 2, align: 'left', track: tr, color: sc.fg, mi: 0 };
      const gA = glyphPts(itA), last = gA[gA.length - 1] || { x: x0 + size / 2 };
      bb = U(bb, J.mainDraw(env, itA));
      if (B) bb = U(bb, J.mainDraw(env, { text: B, font: Pm.font, size, x: last.x, y: y0 + size * 1.25, vertical: true, align: 'left', track: tr, color: sc.fg, mi: 3 }));
      corner = [last.x, y0 + size / 2];
    } else {
      const itA = { text: A, font: Pm.font, size, x: x0 + size / 2, y: y0, vertical: true, align: 'left', track: tr, color: sc.fg, mi: 0 };
      const gA = glyphPts(itA), last = gA[gA.length - 1] || { y: y0 + size / 2 };
      bb = U(bb, J.mainDraw(env, itA));
      if (B) bb = U(bb, J.mainDraw(env, { text: B, font: Pm.font, size, x: x0 + size * 1.25, y: last.y, align: 'left', track: tr, color: sc.fg, mi: 3 }));
      corner = [x0 + size / 2, last.y];
    }
    // thin guide hugging the outside of the corner
    const g = size * 0.42, lw = Math.max(1.2, M * 0.0016);
    const le = E.outCubic(J.clamp((lt - 0.15) / 0.7)) * out;
    if (Pm.guide === 'bracket' && le > 0) {
      const pts = rowCol
        ? [[x0 - g * 0.3, y0 - g * 0.55], [corner[0] + size / 2 + g * 0.55, y0 - g * 0.55], [corner[0] + size / 2 + g * 0.55, y0 + hU * size + g * 0.3]]
        : [[x0 - g * 0.55, y0 - g * 0.3], [x0 - g * 0.55, corner[1] + size / 2 + g * 0.55], [x0 + wU * size + g * 0.3, corner[1] + size / 2 + g * 0.55]];
      env.polyPartial(pts, le, sc.sub, lw, 0.8, false);
    }
    const q = E.outBack(J.clamp((lt - 0.3) / 0.25), 2) * out;
    if (q > 0) {
      const cs = size * 0.12;
      const px = rowCol ? corner[0] + size / 2 + g * 0.55 : x0 - g * 0.55, py = rowCol ? y0 - g * 0.55 : corner[1] + size / 2 + g * 0.55;
      env.rect(px - cs / 2 * q, py - cs / 2 * q, cs * q, cs * q, sc.accent, 1, true);
    }
    return bb;
  },
}, P);

/* ================================================================== 25 curtain — 幕 */
J.register('layout', 'curtain', {
  name: '幕', nameEn: 'Curtain', tags: ['emotional', 'pop', 'graphic'], w: 0.9, emph: 1.4, fits: n => n >= 1 && n <= 16,
  plan(rng, cut, st) {
    return { font: rng.pick(fontsOf(st, ['display', 'serif'])), variant: rng.pick(['side', 'side', 'shutter', 'rise']), col: rng.pick(['velvet', 'velvet', 'accent', 'ink']), drape: rng.chance(0.7), pleats: rng.chance(0.75) };
  },
  render(env) {
    const { W, H, sc, ctx } = env, cut = env.cut, Pm = cut.params, M = Math.min(W, H), lt = env.lt;
    const mt = mainLines(cut.text, W, H, 10, 5);
    const size = Math.min(J.fitSize(mt, Pm.font, W * (Pm.drape && Pm.variant === 'side' ? 0.7 : 0.8), H * (Pm.variant === 'shutter' ? 0.34 : 0.44), { track: 0.05, lead: 1.15 }), H * 0.2);
    const t0 = 0.02, T = J.clamp(cut.dur * 0.16, 0.22, 0.48);
    const bb = J.mainDraw(env, { text: mt, font: Pm.font, size, x: W / 2, y: H / 2, track: 0.05, lead: 1.15, color: sc.fg, mi: miAt(env, t0 + T * 0.25) });
    const open = E.inOutCubic(J.clamp((lt - t0) / T)) * (1 - E.inOutCubic(env.pOut));
    const dark = J.lum(sc.bg) < 0.45;
    const panel = Pm.col === 'velvet' ? J.mix(sc.bg, sc.accent, dark ? 0.38 : 0.6) : plateCol(sc, Pm.col === 'accent' ? [sc.accent, sc.ink] : [sc.ink, sc.accent]);
    const shade = J.mix(panel, sc.bg, 0.22), lite = J.mix(panel, onCol(sc, panel), 0.12);
    const moving = false;              // big moving panels: no chromatic ghosts
    const lw = Math.max(1, M * 0.002);
    const pleat = (x0, x1, y0, y1, k) => {       // vertical folds, compressing with the panel width
      if (!Pm.pleats || env.pass !== 'main') return;
      const m = 7, w = x1 - x0;
      if (w < 4) return;
      for (let i = 1; i < m; i++) { const x = x0 + w * i / m; env.rect(x - lw * 1.5, y0, lw * 3, y1 - y0, i % 2 ? shade : lite, 0.55 * k, false); }
    };
    if (Pm.variant === 'side') {
      const rest = Pm.drape ? W * 0.075 : -W * 0.02;
      const xl = J.lerp(W / 2, rest, open), xr = J.lerp(W / 2, W - rest, open);
      const bulge = Math.sin(Math.PI * J.clamp(open)) * W * 0.02;
      const L = [[-5, -5], [xl, -5], [xl + bulge, H * 0.5], [xl, H + 5], [-5, H + 5]];
      const R = [[W + 5, -5], [xr, -5], [xr - bulge, H * 0.5], [xr, H + 5], [W + 5, H + 5]];
      env.poly(L, panel, 1, moving); env.poly(R, panel, 1, moving);
      pleat(0, xl, 0, H, 1); pleat(xr, W, 0, H, 1);
      if (Pm.drape && open > 0.5) {         // tie-backs
        const q = J.clamp((open - 0.5) * 2);
        env.rect(xl - W * 0.012, H * 0.62, W * 0.012 + 2, H * 0.018, sc.accent === panel ? sc.fg : sc.accent, q, false);
        env.rect(xr - 2, H * 0.62, W * 0.012 + 2, H * 0.018, sc.accent === panel ? sc.fg : sc.accent, q, false);
      }
    } else if (Pm.variant === 'shutter') {
      const rest = Pm.drape ? H * 0.12 : -H * 0.02;
      const yt = J.lerp(H / 2, rest, open), yb = J.lerp(H / 2, H - rest, open);
      env.rect(-5, -5, W + 10, yt + 5, panel, 1, moving);
      env.rect(-5, yb, W + 10, H - yb + 5, panel, 1, moving);
      if (Pm.drape && open > 0.9) {
        const fs = J.clamp(H * 0.018, 11, 22), a = J.clamp((open - 0.9) * 10);
        env.draw({ text: `${String((cut.line | 0) + 1).padStart(2, '0')} / ${J.fmtTime(cut.start)}`, font: monoF(env), size: fs, track: 0.3, align: 'left', x: W * 0.05, y: yt / 2, color: onCol(sc, panel), alpha: a, ghost: false });
      }
    } else {
      // theatre curtain rising, leaving a scalloped valance
      const rest = Pm.drape ? H * 0.1 : -H * 0.05;
      const yb = J.lerp(H + 5, rest, open);
      const m = 9, sw = W / m, dip = Math.min(H * 0.035, Math.max(0, yb) * 0.5);
      const pts = [[-5, -5], [W + 5, -5], [W + 5, yb]];
      for (let i = m; i >= 0; i--) { pts.push([i * sw, yb]); if (i > 0) pts.push([i * sw - sw / 2, yb + dip]); }
      env.blob ? env.poly(pts, panel, 1, moving) : null;
      pleat(0, W, 0, Math.max(0, yb), 1);
    }
    return bb;
  },
}, P);

/* ================================================================== 26 equalizer — イコライザー */
J.register('layout', 'equalizer', {
  name: 'イコライザー', nameEn: 'Equalizer', tags: ['pop', 'graphic', 'glitch'], w: 0.8, portrait: 0.9, fits: n => n >= 1 && n <= 12,
  enterBias: { cut: 1.5, pop: 1.3, drop: 1.2, slice: 0.4, wipe: 0.5 },
  plan(rng, cut, st) {
    return { font: rng.pick(fontsOf(st, ['display'])), style: rng.pick(['bars', 'blocks', 'blocks', 'mirror']), thin: rng.pick([0, 2, 3]), peaks: rng.chance(0.7), col: rng.pick(['accent', 'accent', 'duo', 'fg']), tempo: rng.range(0.42, 0.55) };
  },
  render(env) {
    const { W, H, sc } = env, cut = env.cut, Pm = cut.params, s = cut.seed, M = Math.min(W, H), lt = env.lt;
    const chs = slotsOf(cut.text), n = chs.length;
    if (!n) return null;
    const port = W < H;
    const rows = port && n > 6 ? 2 : 1, per = Math.ceil(n / rows);
    const sw = W * 0.86 / per;
    const size = Math.min(sw * 0.78, H * (rows > 1 ? 0.1 : 0.14));
    const bw = Math.min(sw * 0.6, size * 1.15);
    const e = inE(env, 0.45), out = outK(env);
    const colA = plateCol(sc, [sc.accent, sc.fg]), colB = plateCol(sc, [sc.accent2, sc.sub, sc.fg]);
    // level of band x (continuous index) at time t
    const level = (x, t) => {
      let v = 0.5 + 0.5 * J.noise1(t * 3.1 + x * 0.83, s);
      v = 0.25 + 0.6 * v;
      let pulse;
      if (env.beat && env.beat.len > 0.2) pulse = Math.exp(-env.beat.since * 7) * (0.4 + 0.6 * J.r(s, env.beat.index, Math.round(x * 3)));
      else { const k = Math.floor(t / Pm.tempo), ph = t - k * Pm.tempo; pulse = Math.exp(-ph * 7) * (0.3 + 0.7 * J.r(s, k, Math.round(x * 3))); }
      v = v * 0.75 + pulse * 0.45;
      if (env.energy != null) v = v * (0.45 + 0.75 * env.energy);
      return J.clamp(v, 0.06, 1);
    };
    const lw = Math.max(1, M * 0.0016);
    let bb = null;
    for (let r = 0; r < rows; r++) {
      const cnt = Math.min(per, n - r * per);
      const yb = rows > 1 ? (r ? H * 0.84 : H * 0.47) : H * 0.74;
      const hmax = (rows > 1 ? H * 0.26 : H * 0.44) - size * 0.4;
      const x0 = W / 2 - cnt * sw / 2;
      env.line([[x0 - sw * 0.2, yb], [x0 - sw * 0.2 + (cnt * sw + sw * 0.4) * e, yb]], sc.sub, lw, 0.7 * out, false);
      const drawBar = (x, w, h, col, a) => {
        if (h <= 0.5) return;
        if (Pm.style === 'blocks') {
          const seg = Math.max(4, sw * 0.14), gap = seg * 0.28, m = Math.floor(h / seg);
          for (let k = 0; k < m; k++) env.rect(x - w / 2, yb - (k + 1) * seg + gap / 2, w, seg - gap, k > hmax / seg * 0.72 ? colB : col, a, false);
        } else env.rect(x - w / 2, yb - h, w, h, col, a, false);
        if (Pm.style === 'mirror') env.rect(x - w / 2, yb + lw * 2, w, h * 0.35, col, a * 0.22, false);
      };
      // thin spectrum bars between the lettered ones
      if (Pm.thin) for (let j = 0; j <= cnt; j++) for (let q = 1; q <= Pm.thin; q++) {
        if (j === cnt && q > 0) break;
        const xi = j + q / (Pm.thin + 1);
        const x = x0 + xi * sw;
        drawBar(x, sw * 0.06, hmax * 0.8 * level(xi + r * 7 + 0.5, env.ltb) * e * out, sc.sub, 0.55);
      }
      for (let j = 0; j < cnt; j++) {
        const i = r * per + j;
        if (chs[i] === ' ') continue;
        const x = x0 + (j + 0.5) * sw;
        const lv = level(j + 0.5 + r * 7, env.ltb);
        const h = hmax * lv * e * out;
        const col = Pm.col === 'duo' ? (j % 2 ? colB : colA) : Pm.col === 'fg' ? sc.fg : colA;
        drawBar(x, bw, h, col, Pm.col === 'fg' ? 0.35 : 0.9);
        if (Pm.peaks) {
          let pk = 0;
          for (let k = 0; k < 6; k++) { const tau = k * 0.1; pk = Math.max(pk, level(j + 0.5 + r * 7, env.ltb - tau) - tau * 0.55); }
          const ph = hmax * pk * e * out;
          env.rect(x - bw / 2, yb - ph - Math.max(3, sw * 0.05) - sw * 0.04, bw, Math.max(3, sw * 0.05), sc.fg, 0.9 * out * e, false);
        }
        bb = U(bb, J.mainDraw(env, { text: chs[i], font: Pm.font, size, x, y: yb - h - size * 0.62 - (Pm.peaks ? sw * 0.1 : 0), color: sc.fg, mi: i }));
      }
    }
    return bb;
  },
}, P);

/* ================================================================== 27 tape — テープ */
const tapePath = (ctx, L, h, seed, k) => {       // strip from x=0..L with torn ends
  const m = 7, tooth = h * 0.09;
  ctx.beginPath(); ctx.moveTo(0, -h / 2);
  ctx.lineTo(L, -h / 2);
  for (let i = 1; i <= m; i++) ctx.lineTo(L + (i % 2 ? tooth : -tooth * 0.3) * (0.6 + 0.8 * J.r(seed, k, i, 1)), -h / 2 + h * i / m);
  ctx.lineTo(0, h / 2);
  for (let i = m - 1; i >= 1; i--) ctx.lineTo((i % 2 ? -tooth : tooth * 0.3) * (0.6 + 0.8 * J.r(seed, k, i, 2)), -h / 2 + h * i / m);
  ctx.closePath();
};
J.register('layout', 'tape', {
  name: 'テープ', nameEn: 'Tape', tags: ['pop', 'editorial', 'graphic'], w: 1, treat: 'safe', fits: n => n >= 1 && n <= 16,
  plan(rng, cut, st) {
    const n = cut.n, port = cut.H > cut.W;
    return {
      font: rng.pick(fontsOf(st, ['display', 'body'])), fs: rng.pick(fontsOf(st, ['body', 'serif'])),
      variant: n > 9 || (port && n > 5) ? rng.pick(['stack', 'stack', 'single']) : rng.pick(['single', 'cross', 'stack']),
      ang: rng.range(4, 11) * rng.pick([1, -1]), col: rng.pick(['accent', 'ink', 'accent']), piece: rng.chance(0.75), lines: rng.chance(0.6),
    };
  },
  render(env) {
    const { W, H, sc, ctx } = env, cut = env.cut, Pm = cut.params, s = cut.seed, M = Math.min(W, H), lt = env.lt;
    const port = W < H, out = outK(env);
    const dark = J.lum(sc.bg) < 0.45;
    const tapeC = plateCol(sc, Pm.col === 'accent' ? [sc.accent, sc.ink] : [sc.ink, sc.accent]);
    const tapeC2 = Pm.col === 'accent' ? plateCol(sc, [sc.ink, sc.fg]) : plateCol(sc, [sc.accent, sc.fg]);
    const txtC = onCol(sc, tapeC);
    const strip = (x, y, ang, L, h, col, k, t0, dur, content) => {
      const u = E.outCubic(J.clamp((lt - t0) / dur));
      if (u <= 0) return null;
      const vis = L * u;
      ctx.save(); ctx.translate(x, y); ctx.rotate(ang * J.DEG); ctx.translate(-L / 2, 0);
      if (env.pass === 'main') {
        ctx.save(); ctx.beginPath(); ctx.rect(-h, -h, vis + h * (u >= 1 ? 2 : 0), h * 2); ctx.clip();
        tapePath(ctx, L, h, s, k);
        ctx.globalAlpha = 0.9 * out; ctx.fillStyle = col; ctx.fill();
        if (Pm.lines) { ctx.globalAlpha = 0.07 * out; ctx.fillStyle = onCol(sc, col); for (let j = 1; j < 6; j++) ctx.fillRect(0, -h / 2 + h * j / 6, L, Math.max(1, h * 0.012)); }
        ctx.globalAlpha = 0.12 * out; ctx.fillStyle = dark ? '#000000' : '#FFFFFF'; ctx.fillRect(0, -h / 2, L, h * 0.08); ctx.fillRect(0, h / 2 - h * 0.08, L, h * 0.08);
        ctx.restore();
      }
      let r = null;
      if (content) {
        ctx.save(); ctx.beginPath(); ctx.rect(-h, -h * 2, vis + h * (u >= 1 ? 2 : 0), h * 4); ctx.clip();
        r = content(L / 2, 0);
        ctx.restore();
      }
      ctx.restore();
      return r;
    };
    let bb = null;
    const txt = String(cut.text).trim();
    if (Pm.variant === 'stack') {
      let parts = (cut.words && cut.words.length > 1 ? cut.words : [txt]).map(p => p.trim()).filter(Boolean);
      if (parts.length > 4) { const k = Math.ceil(parts.length / 4); const q = []; for (let i = 0; i < parts.length; i += k) q.push(parts.slice(i, i + k).join('')); parts = q; }
      if (parts.length === 1 && J.glyphCount(txt) > (port ? 5 : 9)) parts = J.splitLines(txt, Math.ceil(J.glyphCount(txt) / 2)).split('\n');
      const np = parts.length;
      const longest = parts.reduce((a, p) => Math.max(a, J.measure({ text: p, font: Pm.font, size: 100, track: 0.05 }).w / 100), 1);
      const size = Math.min(W * 0.72 / longest, H * 0.62 / (np * 1.75), M * 0.17);
      const h = size * 1.5;
      parts.forEach((p, i) => {
        const m = J.measure({ text: p, font: Pm.font, size, track: 0.05 });
        const L = m.w + size * 1.2;
        const y = H / 2 + (i - (np - 1) / 2) * h * 1.12;
        const x = W / 2 + J.rs(s, i, 3) * W * 0.05;
        const ang = (i % 2 ? -1 : 1) * Math.abs(Pm.ang) * 0.45 + J.rs(s, i, 4) * 1.5;
        const r = strip(x, y, ang, L, h, i % 3 === 1 ? tapeC2 : tapeC, i, 0.03 + i * 0.12, 0.3, (cx2, cy2) => J.mainDraw(env, { text: p, font: Pm.font, size, x: cx2, y: cy2, track: 0.05, color: onCol(sc, i % 3 === 1 ? tapeC2 : tapeC), noHold: plateHold(env), mi: miAt(env, 0.05 + i * 0.12) }));
        if (r) bb = U(bb, bbRect(x - L / 2, y - h / 2, x + L / 2, y + h / 2));
      });
      return bb;
    }
    const mt = mainLines(txt, W, H, 11, 6);
    const size = Math.min(J.fitSize(mt, Pm.font, W * 0.7, H * 0.3, { track: 0.05, lead: 1.15 }), H * 0.17);
    const mm = J.measure({ text: mt, font: Pm.font, size, track: 0.05, lead: 1.15 });
    const L = mm.w + size * 1.6, h = mm.h + size * 0.75;
    if (Pm.variant === 'cross') {
      const unit = String(cut.lineText || cut.text).replace(/\s+/g, ' ').trim();
      const fs = h * 0.26;
      const L2 = Math.min(Math.hypot(W, H) * 0.9, J.measure({ text: unit, font: Pm.fs, size: fs, track: 0.1 }).w * 1.3 + fs * 6);
      strip(W / 2 + L * 0.15, H / 2 + h * 0.1, -Pm.ang * 2.4, L2, h * 0.5, tapeC2, 9, 0.0, 0.4, (cx2, cy2) => env.draw({ text: unit, font: Pm.fs, size: fs, track: 0.1, x: cx2, y: cy2, color: onCol(sc, tapeC2), alpha: out, ghost: false }));
    }
    const r = strip(W / 2, H / 2, Pm.ang, L, h, tapeC, 0, 0.06, 0.34, (cx2, cy2) => J.mainDraw(env, { text: mt, font: Pm.font, size, x: cx2, y: cy2, track: 0.05, lead: 1.15, color: txtC, noHold: plateHold(env), mi: miAt(env, 0.1) }));
    if (Pm.piece) {
      const ph = h * 0.42, pl = ph * 2.6;
      const ex = W / 2 + Math.cos(Pm.ang * J.DEG) * L * 0.5, ey = H / 2 + Math.sin(Pm.ang * J.DEG) * L * 0.5;
      const rom = romaOf(txt);
      const lab = rom ? rom.slice(0, 12) : 'No.' + String((cut.line | 0) + 1).padStart(2, '0');
      strip(ex - ph * 0.3, ey - ph * 0.4, Pm.ang - 38 * Math.sign(Pm.ang || 1), pl, ph, tapeC2, 5, 0.32, 0.18, (cx2, cy2) => env.draw({ text: lab, font: monoF(env), size: Math.min(ph * 0.34, pl * 0.7 / Math.max(3, lab.length) * 1.6), track: 0.12, x: cx2, y: cy2, color: onCol(sc, tapeC2), alpha: out, ghost: false }));
    }
    return r ? bbRect(W / 2 - L / 2, H / 2 - h / 2, W / 2 + L / 2, H / 2 + h / 2) : null;
  },
}, P);

})();
