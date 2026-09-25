/* JIZURA pack: kinetic (1) — kinetic typography layouts: word-timed stacks, turns, swaps, dives and flows */
(() => {
'use strict';
const E = J.E;
const P = 'kinetic';
const DEG = J.DEG, TAU = J.TAU, clamp = J.clamp, lerp = J.lerp;
const reg = (key, def) => J.register('layout', key, Object.assign(def, { set: 'kinetic' }), P);

/* ---------------------------------------------------------------- helpers */
const U = env => Math.min(env.W, env.H);
const isPort = env => env.H > env.W * 1.08;
const strip = t => String(t || '').replace(/\s+/g, '');
const hasLatin = t => /[A-Za-z]/.test(String(t || ''));
const flat = t => (hasLatin(t) ? String(t || '').trim().replace(/\s+/g, ' ') : strip(t));
const gcount = t => [...strip(t)].length;
const fontsOf = (st, roles) => J.fontsOf(st, roles);
const bodyF = env => (env.st.fonts.body && env.st.fonts.body[0]) || 'gothic_med';
const monoF = env => (env.st.fonts.mono && env.st.fonts.mono[0]) || 'mono';
const tout = env => 1 - E.inCubic(env.pOut);
const meas = (text, font, size, o) => J.measure(Object.assign({ text, font, size }, o || {}));
const em = (text, font, o) => meas(text, font, 100, o).w / 100;
const box = (x0, y0, x1, y1) => ({ x0, y0, x1, y1, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, boxes: [] });
const UB = (a, b) => J.unionBB(a, b);
/* motion index that makes J.mainDraw start this item's entrance at local time t */
const miAt = (env, t) => Math.max(0, t) / Math.max(0.005, env.cut.stagger || 0.04);
const rotV = (x, y, a) => { const c = Math.cos(a * DEG), s = Math.sin(a * DEG); return [x * c - y * s, x * s + y * c]; };
// damped spring 1 → 0 (overshoots through 0), t in seconds
const sprg = (t, k = 7, f = 18) => (t <= 0 ? 1 : Math.exp(-k * t) * Math.cos(f * t));
const bellK = k => Math.sin(Math.PI * clamp(k));
/* text colour that reads on a plate colour */
const onCol = (sc, fill) => {
  let best = null, bv = 0;
  for (const c of [sc.bg, sc.fg, sc.ink, sc.accent, sc.sub]) { if (!c || c === fill) continue; const k = J.contrast(c, fill); if (k > bv) { bv = k; best = c; } }
  return bv >= 2.6 ? best : (J.lum(fill) > 0.5 ? '#111111' : '#FFFFFF');
};
// accent that reads on the background (else fg)
const accOn = (sc) => (J.contrast(sc.accent, sc.bg) >= 1.7 ? sc.accent : sc.fg);

/* ---- word units: the cut's word chunks, merged / split to a usable count ---- */
const unitCache = new Map();
function splitUnit(s) {
  const t = String(s).trim();
  if (/\s/.test(t)) {                                   // latin phrase: at the space nearest the middle
    const mid = t.length / 2; let bi = -1, bd = 1e9;
    for (let i = 0; i < t.length; i++) if (t[i] === ' ' && Math.abs(i - mid) < bd) { bd = Math.abs(i - mid); bi = i; }
    return [t.slice(0, bi).trim(), t.slice(bi + 1).trim()];
  }
  const n = [...t].length;
  const parts = J.splitLines(t, Math.ceil(n / 2)).split('\n');
  return parts.length >= 2 ? [parts[0], parts.slice(1).join('')] : [t];
}
function unitsOf(cut, maxU = 6, minU = 1) {
  const text = String(cut.text || '');
  const key = text + '\u0002' + (cut.words || []).join('\u0001') + '\u0002' + maxU + ':' + minU;
  let w = unitCache.get(key);
  if (w) return w;
  const lat = hasLatin(text);
  w = (cut.words && cut.words.length ? cut.words : (J.chunkText ? J.chunkText(text) : text.split(/\s+/))).map(s => String(s).trim()).filter(Boolean);
  if (strip(w.join('')) !== strip(text)) w = J.chunkText ? J.chunkText(text).map(s => String(s).trim()).filter(Boolean) : [text.trim()];
  if (!w.length) w = [text.trim() || '…'];
  while (w.length > maxU) {                             // merge the shortest neighbouring pair
    let bi = 0, bv = 1e9;
    for (let i = 0; i < w.length - 1; i++) { const v = gcount(w[i]) + gcount(w[i + 1]); if (v < bv) { bv = v; bi = i; } }
    w.splice(bi, 2, w[bi] + (lat ? ' ' : '') + w[bi + 1]);
  }
  for (let g = 0; g < 8 && w.length < minU; g++) {      // split the longest splittable unit
    let bi = -1, bv = 1;
    w.forEach((s, i) => { const n = gcount(s), ok = /\s/.test(s) || (!hasLatin(s) && n >= 2); if (ok && n > bv) { bv = n; bi = i; } });
    if (bi < 0) break;
    const parts = splitUnit(w[bi]);
    if (parts.length < 2 || !parts[0] || !parts[1]) break;
    w.splice(bi, 1, parts[0], parts[1]);
  }
  if (unitCache.size > 400) unitCache.clear();
  unitCache.set(key, w);
  return w;
}

/* ---- word clock: onset time of each unit inside the cut (locked to beats when they fall close) ---- */
const clockCache = new WeakMap();
function onsets(env, n, o = {}) {
  const c = env.cut;
  let m = clockCache.get(c);
  if (!m) { m = new Map(); clockCache.set(c, m); }
  const frac = o.frac || 0.5, gap = o.gap || 0.38, t0 = o.t0 || 0;
  const key = n + ':' + frac + ':' + gap + ':' + t0;
  let v = m.get(key);
  if (v) return v;
  const dur = c.dur, last = Math.max(0, Math.min(dur * frac, (n - 1) * gap));
  v = [];
  for (let i = 0; i < n; i++) v.push(t0 + (n > 1 ? last * i / (n - 1) : 0));
  const beats = (env.plan && env.plan.beats) || [];
  if (beats.length && n > 1) {
    const pick = []; let prev = t0;
    for (const b of beats) {
      const r = b - c.start;
      if (r <= t0 + 0.12) continue;
      if (r > dur * 0.72) break;
      if (r - prev >= 0.2) { pick.push(r); prev = r; }
      if (pick.length >= n - 1) break;
    }
    if (pick.length >= n - 1 && pick[n - 2] <= Math.max(last * 1.35, dur * 0.55)) v = [t0].concat(pick);
  }
  m.set(key, v);
  return v;
}
// index of the latest unit whose onset has passed (-1 before the first)
const curIdx = (ts, t) => { let k = -1; for (let i = 0; i < ts.length; i++) if (t >= ts[i]) k = i; return k; };

/* ---- flow units into balanced lines that fit a box; positions are unit centres relative to the box centre ---- */
function partitions(n, L) {
  const out = [];
  const rec = (start, left, acc) => {
    if (left === 1) { out.push(acc.concat([[start, n]])); return; }
    for (let e = start + 1; e <= n - left + 1; e++) rec(e, left - 1, acc.concat([[start, e]]));
  };
  if (L >= 1 && L <= n) rec(0, L, []);
  return out;
}
function flowUnits(units, font, maxW, maxH, o = {}) {
  const lat = units.some(hasLatin), sp = o.sp != null ? o.sp : (lat ? 0.32 : 0.08), lead = o.lead || 1.22, track = o.track || 0;
  const ws = units.map(t => em(t, font, { track }));
  const n = units.length;
  let best = null;
  for (let L = 1; L <= Math.min(n, o.maxLines || 4); L++) {
    let bp = null, bw = 1e9;
    for (const pt of partitions(n, L).slice(0, 80)) {
      const lw = pt.map(([a, b]) => { let w = 0; for (let i = a; i < b; i++) w += ws[i] + (i > a ? sp : 0); return w; });
      const mw = Math.max(...lw);
      if (mw < bw) { bw = mw; bp = { pt, lw }; }
    }
    if (!bp) continue;
    const size = Math.min(maxW / bw, maxH / (L * lead - (lead - 1)), o.maxSize || 1e9);
    if (!best || size > best.size * (o.lineBonus || 1.1)) best = { size, L, pt: bp.pt, lw: bp.lw };
  }
  const size = best.size, pos = new Array(n);
  best.pt.forEach(([a, b], li) => {
    const y = (li - (best.L - 1) / 2) * lead * size;
    let x = -best.lw[li] * size / 2;
    for (let i = a; i < b; i++) { const w = ws[i] * size; pos[i] = { x: x + w / 2, y, w, li }; x += w + sp * size; }
  });
  return { size, pos, L: best.L, w: Math.max(...best.lw) * size, h: (best.L * lead - (lead - 1)) * size, ws };
}

/* ---------------------------------------------------------------- layouts */

/* ================================================================== 1 knSlamStack — 積み上げ */
reg('knSlamStack', {
  name: '積み上げ', tags: ['pop', 'graphic'], w: 1.1, ae: 'justified', fits: n => n >= 2 && n <= 18,
  enterBias: { cut: 3, blur: 0.7, pop: 0.8, slice: 0.3, wipe: 0.4 },
  plan(rng, cut, st) {
    return { font: rng.pick(fontsOf(st, ['display'])), align: rng.pick(['center', 'center', 'left', 'right']), from: rng.pick(['scale', 'scale', 'drop', 'side']),
      acc: rng.int(0, 5), tilt: rng.chance(0.35) ? rng.range(2, 4) * rng.pick([1, -1]) : 0, rule: rng.chance(0.55) };
  },
  render(env) {
    const { W, H, sc } = env, c = env.cut, Pm = c.params, lt = env.lt, u = U(env);
    const units = unitsOf(c, isPort(env) ? 6 : 5, 2), n = units.length;
    const ts = onsets(env, n, { frac: 0.42, gap: 0.32 });
    const ms = units.map(t => em(t, Pm.font, { track: 0.02 }));
    const maxW = W * (Pm.tilt ? 0.8 : 0.86), Hb = H * (isPort(env) ? 0.66 : 0.8), cap = Math.min(H * 0.34, W * 0.44), gap = 0.08;
    const lay = k => {
      let w = maxW, sizes = [];
      for (let q = 0; q < 5; q++) {
        sizes = ms.slice(0, k).map(m => Math.min(w / m, cap));
        const lo = Math.min(...sizes) * 2.2;                // keep the size contrast readable
        sizes = sizes.map(s => Math.min(s, lo));
        const S = sizes.reduce((a, b) => a + b, 0) + gap * sizes[0] * (k - 1);
        if (S <= Hb) break;
        w *= Hb / S;
      }
      const g = gap * sizes[0], tot = sizes.reduce((a, b) => a + b, 0) + g * (k - 1);
      let y = -tot / 2; const ys = [];
      sizes.forEach(s => { ys.push(y + s / 2); y += s + g; });
      const sw = Math.max(...sizes.map((s, i) => s * ms[i]));
      return { sizes, ys, sw };
    };
    const k = curIdx(ts, lt) + 1;
    if (k <= 0) return null;
    const A = lay(k), B = k > 1 ? lay(k - 1) : A;
    const e = E.outExpo(clamp((lt - ts[k - 1]) / 0.34));
    const sw = lerp(B.sw, A.sw, e), cx = W / 2, cy = H / 2;
    const al = Pm.align, out = tout(env);
    let bb = null;
    for (let i = 0; i < k; i++) {
      const fresh = i === k - 1;
      let size = fresh ? A.sizes[i] : lerp(B.sizes[i], A.sizes[i], e);
      let y = fresh ? A.ys[i] : lerp(B.ys[i], A.ys[i], e);
      let x = al === 'left' ? -sw / 2 : al === 'right' ? sw / 2 : 0, rot = 0, alpha = 1;
      const q = (lt - ts[i]) / 0.24;
      if (q < 1) {
        const f = 1 - E.outExpo(clamp(q));
        if (Pm.from === 'scale') { size *= 1 + 1.6 * f; alpha = clamp(q * 5); rot = f * 8 * (i % 2 ? 1 : -1); }
        else if (Pm.from === 'drop') { y -= H * 0.7 * Math.pow(1 - clamp(q), 2); }
        else { x += (i % 2 ? 1 : -1) * W * 0.9 * f; }
      }
      // impact: the rest of the stack takes a knock when a new line lands
      const land = lt - ts[k - 1] - 0.12;
      if (!fresh && k > 1 && land > 0) y += A.sizes[k - 1] * 0.07 * sprg(land, 9, 26) * (land < 0.6 ? 1 : 0);
      let px = cx + x, py = cy + y;
      if (Pm.tilt) { const r = rotV(x, y, Pm.tilt); px = cx + r[0]; py = cy + r[1]; rot += Pm.tilt; }
      const it = { text: units[i], font: Pm.font, size, x: px, y: py, align: al === 'left' ? 'left' : al === 'right' ? 'right' : 'center', track: 0.02,
        rot, alpha, color: n > 1 && i === Pm.acc % n ? accOn(sc) : sc.fg, mi: miAt(env, ts[i]) };
      const r = J.mainDraw(env, it);
      bb = UB(bb, r);
      if (Pm.rule && r && !Pm.tilt && i < k - 1) {
        const lw = Math.max(1.5, u * 0.003), gy = py + size * 0.5 + (A.sizes[0] * gap) * 0.5;
        const w0 = al === 'left' ? cx - sw / 2 : al === 'right' ? cx + sw / 2 - sw : cx - sw / 2;
        const re = E.outExpo(clamp((lt - ts[i + 1] - 0.05) / 0.35)) * out;
        if (re > 0) env.line([[w0, gy], [w0 + sw * re, gy]], sc.sub, lw, 0.8, false);
      }
    }
    return bb;
  },
}, P);

/* ================================================================== 2 knQuarterTurn — 直角ターン */
reg('knQuarterTurn', {
  name: '直角ターン', tags: ['pop', 'graphic', 'editorial'], w: 0.9, ae: 'sideways', portrait: 0.9, fits: n => n >= 2 && n <= 16,
  enterBias: { cut: 3, pop: 0.8, blur: 0.8, slice: 0.2, wipe: 0.3 },
  plan(rng, cut, st) {
    return { font: rng.pick(fontsOf(st, ['display', 'serif'])), sgn: rng.pick([1, -1]), end: 'all', acc: rng.int(0, 3), joint: rng.chance(0.6) };
  },
  render(env) {
    const { W, H, sc } = env, c = env.cut, Pm = c.params, lt = env.lt, u = U(env);
    const units = unitsOf(c, 4, 2), n = units.length;
    const ts = onsets(env, n, { frac: 0.46, gap: 0.5 });
    // chain in em units: word i runs along direction a_i, turning 90° at each joint (staircase: turns alternate)
    const L = units.map(t => em(t, Pm.font, { track: 0.03 }));
    const lastAdv = units.map(t => { const ch = [...t.trim()].pop() || '字'; return J.metrics.adv(Pm.font, ch); });
    const ch = [];
    let sx0 = 0, sy0 = 0, a = 0;
    for (let i = 0; i < n; i++) {
      if (i > 0) {
        const pd = rotV(1, 0, a), na = a + 90 * Pm.sgn * (i % 2 ? 1 : -1), nd = rotV(1, 0, na);
        const pe = ch[i - 1];
        sx0 = pe.ex - pd[0] * lastAdv[i - 1] * 0.5 + nd[0] * 0.62; sy0 = pe.ey - pd[1] * lastAdv[i - 1] * 0.5 + nd[1] * 0.62;
        a = na;
      }
      const d = rotV(1, 0, a);
      ch.push({ a, cx: sx0 + d[0] * L[i] / 2, cy: sy0 + d[1] * L[i] / 2, ex: sx0 + d[0] * L[i], ey: sy0 + d[1] * L[i] });
    }
    // camera per word: rotate so that the word reads level, centre it, zoom to fit
    const zW = i => Math.min(W * 0.76 / L[i], H * 0.3, W * 0.42);
    const cams = ch.map((g, i) => ({ r: -g.a, x: g.cx, y: g.cy, z: zW(i) }));
    // overview: everything at once, first word level
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    ch.forEach((g, i) => { const hw = L[i] / 2, hh = 0.55, v = Math.abs(g.a % 180) > 45; const w2 = v ? hh : hw, h2 = v ? hw : hh; x0 = Math.min(x0, g.cx - w2); x1 = Math.max(x1, g.cx + w2); y0 = Math.min(y0, g.cy - h2); y1 = Math.max(y1, g.cy + h2); });
    const ov = { r: 0, x: (x0 + x1) / 2, y: (y0 + y1) / 2, z: Math.min(W * 0.84 / (x1 - x0), H * 0.78 / (y1 - y0), H * 0.3) };
    const k = curIdx(ts, lt);
    if (k < 0) return null;
    const tOv = Math.min(ts[n - 1] + 0.62, Math.max(ts[n - 1] + 0.3, c.dur - c.outDur - 0.55)), useOv = Pm.end !== 'last';
    let A = cams[Math.max(0, k - 1)], B = cams[k], e = k > 0 ? E.inOutCubic(clamp((lt - ts[k]) / 0.36)) : 1;
    if (useOv && lt >= tOv) { A = cams[n - 1]; B = ov; e = E.inOutCubic(clamp((lt - tOv) / 0.5)); }
    const dip = 1 - 0.22 * bellK(e) * (A === B ? 0 : 1);
    const cam = { r: lerp(A.r, B.r, e), x: lerp(A.x, B.x, e), y: lerp(A.y, B.y, e), z: Math.exp(lerp(Math.log(A.z), Math.log(B.z), e)) * dip };
    let bb = null;
    const out = tout(env);
    for (let i = 0; i <= k; i++) {
      const g = ch[i];
      const [dx, dy] = rotV(g.cx - cam.x, g.cy - cam.y, cam.r);
      const q = clamp((lt - ts[i]) / 0.22), pop = i === 0 ? 1 : lerp(0.3, 1, E.outBack(q, 2.2));
      const it = { text: units[i], font: Pm.font, size: cam.z * pop, x: W / 2 + dx * cam.z, y: H / 2 + dy * cam.z, rot: g.a + cam.r, track: 0.03,
        color: i === Pm.acc % n ? accOn(sc) : sc.fg, mi: miAt(env, ts[i]), alpha: i === 0 ? 1 : clamp(q * 4) };
      bb = UB(bb, J.mainDraw(env, it));
      // joint marks: a small accent square where the line turns
      if (Pm.joint && i > 0) {
        const pg = ch[i - 1], pd = rotV(1, 0, pg.a);
        const jx = pg.ex + pd[0] * 0.35, jy = pg.ey + pd[1] * 0.35;
        const [ex, ey] = rotV(jx - cam.x, jy - cam.y, cam.r);
        const s = cam.z * 0.16 * E.outBack(clamp(q * 1.3), 2) * out;
        if (s > 0.5) { const ctx = env.ctx; ctx.save(); ctx.translate(W / 2 + ex * cam.z, H / 2 + ey * cam.z); ctx.rotate((cam.r + 45) * DEG); env.rect(-s / 2, -s / 2, s, s, sc.accent, 1, false); ctx.restore(); }
      }
    }
    if (bb && u) return bb;
    return box(W * 0.3, H * 0.4, W * 0.7, H * 0.6);
  },
}, P);

/* ================================================================== 3 knSwapCenter — 入れ替わり */
reg('knSwapCenter', {
  name: '入れ替わり', tags: ['pop', 'graphic', 'glitch'], w: 1, ae: 'slotMachine', fits: n => n >= 2 && n <= 18,
  enterBias: { cut: 3, pop: 0.7, blur: 0.8, slice: 0.3, wipe: 0.3 },
  plan(rng, cut, st) {
    return { font: rng.pick(fontsOf(st, ['display'])), fontL: rng.pick(fontsOf(st, ['display', 'serif'])), mode: rng.pick(['roll', 'punch', 'slide', 'roll']), ticks: rng.chance(0.7), acc: rng.chance(0.5) };
  },
  render(env) {
    const { W, H, sc } = env, c = env.cut, Pm = c.params, lt = env.lt, u = U(env), port = isPort(env);
    const units = unitsOf(c, 6, 2), n = units.length;
    const ts = onsets(env, n, { frac: 0.4, gap: 0.36 });
    const big = units.map(t => Math.min(J.fitSize(t, Pm.font, W * 0.8, H * 0.4, { track: 0.02 }), H * 0.34, W * 0.6));
    const F = flowUnits(units, Pm.fontL, W * 0.84, H * (port ? 0.46 : 0.34), { maxSize: H * (port ? 0.13 : 0.2), track: 0.03 });
    let tR = ts[n - 1] + 0.5;
    const lim = c.dur - c.outDur - 0.4;
    if (tR > lim) tR = Math.max(ts[n - 1] + 0.18, lim);
    const k = curIdx(ts, lt);
    if (k < 0) return null;
    const cx = W / 2, cy = H / 2, out = tout(env);
    let bb = null;
    const accC = accOn(sc);
    if (lt < tR) {
      const e = k > 0 ? E.outExpo(clamp((lt - ts[k]) / 0.26)) : 1;
      const draw = (i, q, old) => {
        const s0 = big[i]; let x = cx, y = cy, size = s0, sy = 1, alpha = 1;
        if (Pm.mode === 'roll') { const d = s0 * 1.05 * (old ? -q : (1 - q)); y += d; sy = old ? 1 - q : q; }
        else if (Pm.mode === 'punch') { size = s0 * (old ? lerp(1, 0.45, q) : lerp(1.9, 1, q)); alpha = old ? 1 - q : clamp(q * 3); }
        else { x += (old ? -q : 1 - E.outBack(q, 1.3)) * W * 0.7; alpha = old ? 1 - q * q : 1; }
        if (sy < 0.02 || alpha < 0.01) return;
        const it = { text: units[i], font: Pm.font, size, x, y, sy, track: 0.02, alpha, color: Pm.acc && i % 2 ? accC : sc.fg, mi: miAt(env, ts[i]), noHold: old };
        bb = UB(bb, J.mainDraw(env, it));
      };
      if (k > 0 && e < 1) draw(k - 1, e, true);
      draw(k, e, false);
      if (Pm.ticks && n > 1) {
        const tw = u * 0.035, th = Math.max(3, u * 0.006), gx = tw * 1.5, y = Math.min(H * 0.9, cy + big[k] * 0.5 + u * 0.08);
        for (let i = 0; i < n; i++) {
          const x = cx + (i - (n - 1) / 2) * gx - tw / 2, on = i <= k;
          env.rect(x, y, tw, th, on ? accC : sc.sub, (on ? 1 : 0.4) * out * clamp(lt / 0.2), false);
        }
      }
      return bb;
    }
    // resolve: every word flies to its place in the full line
    for (let i = 0; i < n; i++) {
      const last = i === n - 1, q = E.outExpo(clamp((lt - tR - (last ? 0 : 0.05 + i * 0.035)) / 0.42));
      const p = F.pos[i], size = last ? lerp(big[i], F.size, q) : F.size * lerp(0.3, 1, q);
      const it = { text: units[i], font: last ? (q > 0.5 ? Pm.fontL : Pm.font) : Pm.fontL, size, x: lerp(cx, cx + p.x, q), y: lerp(cy, cy + p.y, q), track: last ? lerp(0.02, 0.03, q) : 0.03,
        alpha: last ? 1 : clamp(q * 2.5), color: Pm.acc && i % 2 ? accC : sc.fg, mi: last ? miAt(env, ts[i]) : miAt(env, tR) };
      bb = UB(bb, J.mainDraw(env, it));
    }
    return bb;
  },
}, P);

/* ================================================================== 4 knZoomDive — 文字へ潜る */
reg('knZoomDive', {
  name: '文字へ潜る', tags: ['pop', 'emotional', 'graphic'], w: 0.9, ae: 'zoomRepeat', fits: n => n >= 2 && n <= 16,
  enterBias: { cut: 3, blur: 0.8, pop: 0.5, slice: 0.2, wipe: 0.2 },
  plan(rng, cut, st) {
    return { font: rng.pick(fontsOf(st, ['display', 'serif'])), cap: rng.chance(0.75), acc: rng.chance(0.5) };
  },
  render(env) {
    const { W, H, sc } = env, c = env.cut, Pm = c.params, lt = env.lt, u = U(env);
    const units = unitsOf(c, 5, 2), n = units.length;
    const ts = onsets(env, n, { frac: 0.5, gap: 0.55 });
    const k = curIdx(ts, lt);
    if (k < 0) return null;
    const size = i => Math.min(J.fitSize(units[i], Pm.font, W * 0.78, H * 0.4, { track: 0.02 }), H * 0.34, W * 0.6);
    // focus glyph: the first kanji (else the middle glyph), as an offset from the word centre in em
    const focus = i => {
      const lay = J.layoutText({ text: units[i], font: Pm.font, size: 1, track: 0.02 });
      const gs = lay.filter(g => g.ch.trim());
      const g = gs.find(q => J.isKanji(q.ch)) || gs[Math.floor(gs.length / 2)] || { x: 0, y: 0 };
      return [g.x, g.y];
    };
    const cx = W / 2, cy = H / 2, accC = accOn(sc);
    let bb = null;
    const T = 0.42;
    // the previous word blows up around its focus glyph: the camera dives through the letter
    if (k > 0) {
      const e = clamp((lt - ts[k]) / T);
      if (e < 1) {
        const i = k - 1, s0 = size(i), [fx, fy] = focus(i);
        const px = lerp(cx + fx * s0, cx, E.inOutCubic(e)), py = lerp(cy + fy * s0, cy, E.inOutCubic(e));
        const s = Math.exp(Math.pow(e, 1.6) * Math.log(36));
        const it = { text: units[i], font: Pm.font, size: s0 * s, x: px - fx * s0 * s, y: py - fy * s0 * s, track: 0.02, alpha: 1 - J.smooth(0.55, 1, e), color: Pm.acc && i % 2 ? accC : sc.fg, mi: miAt(env, ts[i]), noHold: true };
        J.mainDraw(env, it);
      }
    }
    const s1 = size(k), q = k > 0 ? E.outExpo(clamp((lt - ts[k] - T * 0.35) / 0.45)) : 1;
    if (q > 0.001) {
      const it = { text: units[k], font: Pm.font, size: s1 * lerp(0.03, 1, q), x: cx, y: cy, track: 0.02, alpha: clamp(q * 3), color: Pm.acc && k % 2 ? accC : sc.fg, mi: miAt(env, ts[k]) };
      bb = J.mainDraw(env, it);
    }
    // the whole line as a caption once the last word has settled
    if (Pm.cap && n > 1 && k === n - 1 && bb) {
      const a = E.outCubic(clamp((lt - ts[k] - 0.55) / 0.35)) * tout(env);
      if (a > 0.01) {
        const t = flat(c.text), fs = Math.min(J.clamp(u * 0.034, 14, 40), J.fitSize(t, bodyF(env), W * 0.8, H * 0.1, { track: 0.18 }));
        env.draw({ text: t, font: bodyF(env), size: fs, track: 0.18, x: cx, y: Math.min(H * 0.92, bb.y1 + fs * 1.6), color: sc.sub, alpha: a, ghost: false });
        const lw = Math.max(1, u * 0.002), w = J.measure({ text: t, font: bodyF(env), size: fs, track: 0.18 }).w * a;
        env.line([[cx - w / 2, Math.min(H * 0.92, bb.y1 + fs * 1.6) - fs * 1.1], [cx + w / 2, Math.min(H * 0.92, bb.y1 + fs * 1.6) - fs * 1.1]], sc.sub, lw, 0.6, false);
      }
    }
    return bb || box(W * 0.3, H * 0.4, W * 0.7, H * 0.6);
  },
}, P);

/* ================================================================== 5 knFlowSnap — 流れて整列 */
reg('knFlowSnap', {
  name: '流れて整列', tags: ['graphic', 'pop', 'editorial'], w: 0.9, ae: 'gridCells', fits: n => n >= 3 && n <= 16,
  enterBias: { cut: 3, blur: 0.6, pop: 0.6, slice: 0.2, wipe: 0.2 },
  plan(rng, cut, st) {
    return { font: rng.pick(fontsOf(st, ['display', 'body'])), amp: rng.range(0.1, 0.16), lam: rng.range(0.45, 0.7), grid: rng.pick(['cells', 'cells', 'rules']), acc: rng.int(0, 15) };
  },
  render(env) {
    const { W, H, sc } = env, c = env.cut, Pm = c.params, lt = env.lt, u = U(env), port = isPort(env);
    const lat = hasLatin(c.text), t0 = flat(c.text), chars = [...t0], n = chars.length;
    // final arrangement: a glyph grid (Japanese) or balanced lines (latin)
    let ft, trk;
    if (lat) { ft = J.splitLines(t0, port ? 10 : 18); trk = 0.02; }
    else {
      const m = [...t0].length, c0 = Math.max(2, Math.min(port ? 4 : 6, Math.ceil(Math.sqrt(m * (port ? 0.7 : 1.6))))), cols = Math.ceil(m / Math.ceil(m / c0));
      const rows = []; for (let i = 0; i < m; i += cols) rows.push(chars.slice(i, i + cols).join(''));
      ft = rows.join('\n'); trk = 0.3;
    }
    const lead = lat ? 1.25 : 1.3;
    const fsz = Math.min(J.fitSize(ft, Pm.font, W * 0.8, H * (port ? 0.5 : 0.62), { track: trk, lead }), H * 0.2);
    const lay = J.layoutText({ text: ft, font: Pm.font, size: fsz, track: trk, lead, align: lat ? 'center' : 'left' });
    const mm = { w: lay.W, h: lay.H }, ox = W / 2 - (lat ? 0 : mm.w / 2), oy = H / 2;
    const gl = lay.filter(g => g.ch !== '\n');
    // snap time: about 40% into the cut
    const tS = clamp(c.dur * 0.42, 0.45, 1.5);
    const advs = gl.map((g, i) => J.metrics.adv(Pm.font, g.ch) * 1.08 + (i > 0 && g.li !== gl[i - 1].li ? 0.35 : 0)), totA = advs.reduce((a, b) => a + b, 0);
    const fs = Math.min(H * 0.15, W * 0.95 / Math.max(4, totA)), offs = [];
    advs.reduce((a, b, i) => { offs[i] = (a + b / 2) * fs; return a + b; }, 0);
    // the train rushes in from the right edge, brakes towards the centre, then snaps
    const Xs = W / 2 - totA * fs / 2, X0 = W + fs * 0.8;
    const A = Math.min(H * Pm.amp, W * 0.16), lam = W * Pm.lam * (port ? 1.7 : 1);
    const flowAt = (i, t) => {
      const x = lerp(X0, Xs, E.outCubic(clamp(t / tS))) + (offs[i] || 0), y = cy0(x, t);
      const sl = (cy0(x + 2, t) - cy0(x - 2, t)) / 4;
      return [x, y, Math.atan(sl) / DEG];
    };
    function cy0(x, t) { return H / 2 + A * Math.sin(x / lam * TAU + t * 3.2); }
    const tf = Math.min(lt, tS);
    let bb = null;
    const out = tout(env), accC = accOn(sc);
    gl.forEach((g, i) => {
      if (g.ch === ' ' || g.ch === '　') return;
      const [fx, fy, fr] = flowAt(i, tf);
      const q = E.outExpo(clamp((lt - tS - i * 0.018) / 0.3));
      const x = lerp(fx, ox + g.x, q), y = lerp(fy, oy + g.y, q), rot = fr * (1 - q), size = lerp(fs, fsz * (g.fs || 1), q);
      if (x > W + size && q <= 0) return;
      const it = { text: g.ch, font: Pm.font, size, x, y, rot, color: !lat && i === Pm.acc % n ? accC : sc.fg, mi: i * 0.3 };
      bb = UB(bb, J.mainDraw(env, it));
    });
    // grid lines draw in with the snap
    const ge = E.outExpo(clamp((lt - tS - 0.08) / 0.5)) * out;
    if (ge > 0.01) {
      const lw = Math.max(1, u * 0.0016);
      if (!lat && Pm.grid === 'cells') {
        const cell = fsz * (1 + trk), rows = ft.split('\n').length, cols = Math.max(...ft.split('\n').map(r => [...r].length));
        const gx0 = ox - fsz * trk / 2, gy0 = oy - mm.h / 2 - (cell - fsz) / 2 - (fsz * lead - cell) / 2;
        const rh = fsz * lead;
        for (let r = 0; r <= rows; r++) { const y = gy0 + r * rh; env.line([[gx0, y], [gx0 + cols * cell * ge, y]], sc.sub, lw, 0.55, false); }
        for (let q2 = 0; q2 <= cols; q2++) { const x = gx0 + q2 * cell; env.line([[x, gy0], [x, gy0 + rows * rh * ge]], sc.sub, lw, 0.55, false); }
      } else {
        const lines = ft.split('\n'), rh = fsz * lead;
        lines.forEach((ln, li) => {
          const w = J.measure({ text: ln, font: Pm.font, size: fsz, track: trk }).w, y = oy + (li - (lines.length - 1) / 2) * rh + fsz * 0.62;
          const x0 = lat ? W / 2 - w / 2 : ox;
          env.line([[x0, y], [x0 + w * ge, y]], sc.sub, lw * 1.5, 0.7, false);
        });
      }
    }
    // the path the line flowed along, fading after the snap
    const pa = (1 - clamp((lt - tS) / 0.25)) * clamp(lt / 0.15) * 0.35;
    if (pa > 0.01) {
      const pts = []; for (let x = -20; x <= W + 20; x += W / 48) pts.push([x, cy0(x, tf)]);
      env.line(pts, sc.sub, Math.max(1, u * 0.0015), pa, false);
    }
    return bb;
  },
}, P);

/* ================================================================== 6 knSeesaw — シーソー */
reg('knSeesaw', {
  name: 'シーソー', tags: ['pop', 'graphic'], w: 0.8, ae: 'bounceLine', portrait: 0.4, fits: n => n >= 2 && n <= 14,
  enterBias: { cut: 3, pop: 0.6, blur: 0.5, slice: 0.2, wipe: 0.2 },
  plan(rng, cut, st) {
    return { font: rng.pick(fontsOf(st, ['display'])), order: rng.pick(['lr', 'lr', 'out']), acc: rng.chance(0.5), fulc: rng.pick(['tri', 'tri', 'round']) };
  },
  render(env) {
    const { W, H, sc, ctx } = env, c = env.cut, Pm = c.params, lt = env.lt, u = U(env), port = isPort(env);
    const units = unitsOf(c, 6, 2), n = units.length;
    const F = flowUnits(units, Pm.font, W * 0.78, H * 0.2, { maxLines: 1, maxSize: H * 0.17, track: 0.03, sp: hasLatin(c.text) ? 0.4 : 0.22 });
    const size = F.size, th = Math.max(4, size * 0.1), half = F.w / 2 + size * 0.6;
    const px = W / 2, py = H * (port ? 0.55 : 0.6);
    // landing order: left to right, or from the middle outwards
    const ord = units.map((_, i) => i);
    if (Pm.order === 'out') ord.sort((a, b) => Math.abs(F.pos[a].x) - Math.abs(F.pos[b].x));
    const ts0 = onsets(env, n, { frac: 0.45, gap: 0.4 }), fall = 0.24;
    const tl = new Array(n); ord.forEach((i, r) => { tl[i] = ts0[r] + fall; });
    const mass = units.map(t => gcount(t));
    const M = mass.reduce((a, b) => a + b, 0);
    // plank angle: each landing pulls it towards the torque of what has landed; balanced when all are on
    const targ = [0];
    let tq = 0;
    ord.forEach((i, r) => { tq += mass[i] * F.pos[i].x; targ.push(r === n - 1 ? 0 : clamp(tq / (M * half) * 30, -11, 11)); });
    let th0 = 0;
    for (let r = 0; r < n; r++) {
      const t0 = ts0[r] + fall; if (lt < t0) break;
      th0 = targ[r + 1] + (targ[r] - targ[r + 1]) * sprg(lt - t0, 3.6, 10);
    }
    const ang = th0;
    const e = E.outExpo(clamp(lt / 0.35)), out = tout(env);
    const plateC = sc.sub, accC = accOn(sc);
    // fulcrum + plank
    const fh = size * 0.62;
    if (Pm.fulc === 'tri') env.poly([[px, py + th / 2], [px - fh * 0.62 * e, py + th / 2 + fh * e], [px + fh * 0.62 * e, py + th / 2 + fh * e]], accC, out, false);
    else env.circle(px, py + th / 2 + fh * 0.45, fh * 0.45 * e, accC, null, 0, out, false);
    ctx.save(); ctx.translate(px, py); ctx.rotate(ang * DEG);
    env.rect(-half * e, -th / 2, half * 2 * e, th, plateC, 0.9 * out, false);
    ctx.restore();
    let bb = null;
    const cr = Math.cos(ang * DEG), sr = Math.sin(ang * DEG);
    for (let i = 0; i < n; i++) {
      const t0 = tl[i] - fall;
      if (lt < t0) continue;
      const p = F.pos[i], v = -th / 2 - size * 0.54;
      let x = px + p.x * cr - v * sr, y = py + p.x * sr + v * cr, rot = ang, sy = 1, sx = 1;
      const d = lt - tl[i];
      if (d < 0) { const k = -d / fall; y -= H * 0.55 * k * k; rot = ang * (1 - k); }
      else { const q = Math.exp(-d * 11) * 0.22; sy = 1 - q; sx = 1 + q * 0.6; x += sr * size * q * 0.5; y += cr * size * q * 0.5; }
      const it = { text: units[i], font: Pm.font, size, x, y, rot, sx, sy, track: 0.03, color: Pm.acc && mass[i] === Math.max(...mass) ? accC : sc.fg, mi: miAt(env, t0) };
      bb = UB(bb, J.mainDraw(env, it));
    }
    return bb;
  },
}, P);

/* ================================================================== 7 knTypeSlam — タイプ→スラム */
reg('knTypeSlam', {
  name: 'タイプ→スラム', tags: ['pop', 'graphic', 'editorial'], w: 1, ae: 'type', fits: n => n >= 2 && n <= 24,
  enterBias: { cut: 3, blur: 0.5, pop: 0.5, slice: 0.2, wipe: 0.3 },
  plan(rng, cut, st) {
    return { font: rng.pick(fontsOf(st, ['display'])), key: rng.pick(['long', 'long', 'last']), side: rng.pick(['below', 'below', 'above']), burst: rng.chance(0.7) };
  },
  render(env) {
    const { W, H, sc, ctx } = env, c = env.cut, Pm = c.params, lt = env.lt, u = U(env), port = isPort(env);
    const t0 = flat(c.text);
    const units = unitsOf(c, 6, 1);
    let ki = units.length - 1;
    if (Pm.key === 'long') { let bv = -1; units.forEach((t, i) => { const v = gcount(t) + (/[一-鿿]/.test(t) ? 0.5 : 0); if (v > bv) { bv = v; ki = i; } }); }
    const key = units[ki];
    const tf = monoF(env);
    const ts = Math.min(J.fitSize(t0, tf, W * 0.86, H * 0.08, { track: 0.06 }), u * 0.065);
    const tm = J.measure({ text: t0, font: tf, size: ts, track: 0.06 });
    const ks = Math.min(J.fitSize(key, Pm.font, W * 0.84, H * (port ? 0.3 : 0.44), { track: 0.01 }), H * 0.34, W * 0.5);
    const above = Pm.side === 'above';
    const ky = H / 2 + (above ? ts * 1.2 : -ts * 1.2), ty = above ? ky - ks * 0.62 - ts * 1.5 : ky + ks * 0.62 + ts * 1.5;
    const nG = [...t0].length;
    const tType = clamp(nG * 0.045, 0.25, Math.min(1.1, c.dur * 0.4)), tS = tType + 0.14;
    const x0 = W / 2 - tm.w / 2;
    // typed line: revealed glyph by glyph (clip), cursor riding at the end
    const k = Math.floor(clamp(lt / tType) * nG + 1e-6);
    const pre = [...t0].slice(0, k).join('');
    const wk = k >= nG ? tm.w + ts : J.measure({ text: pre, font: tf, size: ts, track: 0.06 }).w + (k > 0 ? ts * 0.06 : 0);
    const imp = lt - tS - 0.1;
    const shake = imp > 0 ? Math.exp(-imp * 10) * ts * 0.35 : 0;
    const itT = { text: t0, font: tf, size: ts, x: x0 + J.rs(c.seed, env.step, 3) * shake, y: ty + J.rs(c.seed, env.step, 4) * shake, align: 'left', track: 0.06, color: sc.fg, mi: 0 };
    if (k < nG) itT.clip = [x0 - ts, x0 + wk];
    let bb = J.mainDraw(env, itT);
    const out = tout(env), accC = accOn(sc);
    if (k < nG || env.step % 2 === 0) { if (lt < tS + 0.6) env.rect(x0 + wk + ts * 0.1, ty - ts * 0.5, ts * 0.55, ts, accC, out, false); }
    // key word slams in
    if (lt >= tS) {
      const q = clamp((lt - tS) / 0.16), f = 1 - E.inQuad(q);
      const land = lt - tS - 0.16;
      const sq = land > 0 ? Math.exp(-land * 12) * 0.12 : 0;
      const it = { text: key, font: Pm.font, size: ks * (1 + 2.4 * f), x: W / 2, y: ky, sx: 1 + sq * 0.5, sy: 1 - sq, track: 0.01, alpha: clamp(q * 4), color: sc.fg, mi: miAt(env, tS) };
      bb = UB(bb, J.mainDraw(env, it));
      if (Pm.burst && land > 0 && land < 0.5) {
        const a = 1 - land / 0.5, R0 = ks * 0.9, lw = Math.max(2, u * 0.004);
        const mK = J.measure({ text: key, font: Pm.font, size: ks, track: 0.01 });
        for (let j = 0; j < 10; j++) {
          const an = (j / 10) * TAU + J.r(c.seed, j, 5) * 0.4, r0 = Math.max(mK.w, mK.h) * 0.55 + R0 * 0.15 + land * u * 0.25, r1 = r0 + u * 0.05 * a;
          const sx = 1, syy = mK.h / Math.max(mK.w, mK.h) + 0.35;
          env.line([[W / 2 + Math.cos(an) * r0 * sx, ky + Math.sin(an) * r0 * syy], [W / 2 + Math.cos(an) * r1 * sx, ky + Math.sin(an) * r1 * syy]], accC, lw, a * out, false);
        }
      }
      // mark the key word inside the typed line
      const idx = t0.indexOf(key.trim());
      if (idx >= 0 && land > 0) {
        const a0 = J.measure({ text: t0.slice(0, idx) || ' ', font: tf, size: ts, track: 0.06 }).w * (idx ? 1 : 0) + (idx ? ts * 0.06 : 0);
        const kw = J.measure({ text: key.trim(), font: tf, size: ts, track: 0.06 }).w;
        const e2 = E.outExpo(clamp(land / 0.3)) * out;
        env.rect(x0 + a0, ty + ts * 0.62, kw * e2, Math.max(2, ts * 0.12), accC, 1, false);
      }
    }
    return bb;
  },
}, P);

/* ================================================================== 8 knRhythmCuts — 語のカット割り */
const SHOTS = ['huge', 'vert', 'small', 'crop', 'band', 'tilt'];
reg('knRhythmCuts', {
  name: '語のカット割り', tags: ['pop', 'graphic', 'glitch'], w: 0.9, ae: 'panels', fits: n => n >= 2 && n <= 18,
  enterBias: { cut: 3.5, pop: 0.4, blur: 0.4, slice: 0.2, wipe: 0.2 },
  plan(rng, cut, st) {
    const sh = SHOTS.slice(); for (let i = sh.length - 1; i > 0; i--) { const j = rng.int(0, i); const t = sh[i]; sh[i] = sh[j]; sh[j] = t; }
    return { font: rng.pick(fontsOf(st, ['display'])), fontB: rng.pick(fontsOf(st, ['display', 'serif'])), shots: sh, side: rng.pick([1, -1]), fin: rng.pick(['center', 'center', 'left']) };
  },
  render(env) {
    const { W, H, sc, ctx } = env, c = env.cut, Pm = c.params, lt = env.lt, u = U(env), port = isPort(env);
    const units = unitsOf(c, 5, 2), n = units.length;
    const ts = onsets(env, n, { frac: 0.5, gap: 0.46 });
    let tF = Math.min(ts[n - 1] + 0.55, c.dur - c.outDur - 0.45);
    tF = Math.max(tF, ts[n - 1] + 0.28);
    const k = curIdx(ts, lt);
    if (k < 0) return null;
    const out = tout(env), accC = accOn(sc);
    if (lt < tF) {
      const t = units[k], shot = (Pm.shots || SHOTS)[k % 6], dt = lt - ts[k];
      const punch = 1 + 0.1 * Math.exp(-dt * 14);
      const it = { text: t, font: Pm.font, x: W / 2, y: H / 2, color: sc.fg, track: 0.02, mi: miAt(env, ts[k]) };
      const vtxt = hasLatin(t) ? t : strip(t);
      if (shot === 'huge') it.size = Math.min(J.fitSize(t, Pm.font, W * 0.82, H * 0.6, { track: 0.02 }), H * 0.54);
      else if (shot === 'vert' && !hasLatin(t)) {
        Object.assign(it, { text: vtxt, vertical: true, x: W / 2 + Pm.side * W * (port ? 0.18 : 0.22) });
        it.size = Math.min(J.fitSize(vtxt, Pm.font, W * 0.4, H * 0.8, { vertical: true, track: 0.02 }), W * (port ? 0.34 : 0.26));
      } else if (shot === 'small' || shot === 'vert') {
        it.size = Math.min(J.fitSize(t, Pm.fontB, W * 0.4, H * 0.12, { track: 0.12 }), H * 0.1); it.font = Pm.fontB; it.track = 0.12;
        const m = J.measure(it), pw = m.w / 2 + it.size * 0.8, ph = m.h / 2 + it.size * 0.6, L = it.size * 0.6, lw = Math.max(2, u * 0.003);
        const e = E.outExpo(clamp(dt / 0.2));
        [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([a, b]) => { const cx = W / 2 + a * pw * (1.3 - 0.3 * e), cy = H / 2 + b * ph * (1.3 - 0.3 * e); env.line([[cx - a * L, cy], [cx, cy], [cx, cy - b * L]], accC, lw, out, false); });
      } else if (shot === 'crop') {
        it.size = Math.min(J.fitSize(t, Pm.font, W * 1.02, H * 0.7, { track: 0.0 }), H * 0.66); it.align = 'left'; it.track = 0;
        const m = J.measure(it); it.x = W * 0.97 - m.w; it.y = H / 2 + H * 0.04;
      } else if (shot === 'band') {
        it.size = Math.min(J.fitSize(t, Pm.font, W * 0.8, H * 0.24, { track: 0.06 }), H * 0.22); it.track = 0.06;
        const bh = it.size * 1.55, e = E.outExpo(clamp(dt / 0.18));
        env.rect(0, H / 2 - bh / 2 * e, W, bh * e, sc.ink, out, false);
        it.color = onCol(sc, sc.ink); it.plain = true;
      } else {
        it.size = Math.min(J.fitSize(t, Pm.font, W * 0.72, H * 0.4, { track: 0.02 }), H * 0.34); it.rot = -8 * Pm.side; it.color = accC;
      }
      it.size *= punch;
      return J.mainDraw(env, it);
    }
    // final shot: the whole line, clean
    const F = flowUnits(units, Pm.fontB, W * 0.84, H * (port ? 0.42 : 0.34), { maxSize: H * 0.16, track: 0.04 });
    const left = Pm.fin === 'left', ox = left ? W * 0.08 + F.w / 2 : W / 2;
    const dt = lt - tF, punch = 1 + 0.06 * Math.exp(-dt * 14);
    let bb = null;
    units.forEach((t, i) => {
      const p = F.pos[i];
      bb = UB(bb, J.mainDraw(env, { text: t, font: Pm.fontB, size: F.size * punch, x: ox + p.x * punch, y: H / 2 + p.y * punch, track: 0.04, color: sc.fg, mi: miAt(env, tF + i * 0.03) }));
    });
    if (bb) {
      const e = E.outExpo(clamp(dt / 0.35)) * out, lw = Math.max(2, u * 0.004);
      env.rect(left ? W * 0.08 : W / 2 - F.w / 2, bb.y1 + F.size * 0.25, F.w * e, lw, accC, 1, false);
    }
    return bb;
  },
}, P);

/* ================================================================== 9 knPathRide — ループ軌道 */
const pathCache = new Map();
function loopPath(W, H, xT, yL, R, side) {
  const key = [W, H, xT | 0, yL | 0, R | 0, side].join(':');
  let P0 = pathCache.get(key);
  if (P0) return P0;
  const pts = [[-W * 0.9, yL], [xT, yL]];
  const N = 72;
  // a full loop tangent to the line at (xT, yL): up and back over the top (side 1) or under it (side -1)
  for (let i = 1; i <= N; i++) { const a = i / N * TAU; pts.push([xT + Math.sin(a) * R, yL - side * (1 - Math.cos(a)) * R]); }
  pts.push([W * 2.2, yL]);
  const L = [0];
  for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  P0 = { pts, L, tot: L[L.length - 1], sT: L[1], sL: L[1] + 0 };
  if (pathCache.size > 60) pathCache.clear();
  pathCache.set(key, P0);
  return P0;
}
function pathAt(P0, s) {
  const { pts, L } = P0;
  s = clamp(s, 0, P0.tot - 0.01);
  let lo = 0, hi = L.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (L[m] <= s) lo = m; else hi = m; }
  const a = pts[lo], b = pts[hi], k = (s - L[lo]) / Math.max(1e-6, L[hi] - L[lo]);
  return [lerp(a[0], b[0], k), lerp(a[1], b[1], k), Math.atan2(b[1] - a[1], b[0] - a[0]) / DEG];
}
reg('knPathRide', {
  name: 'ループ軌道', tags: ['pop', 'graphic'], w: 0.8, ae: 'wave', portrait: 0.4, fits: n => n >= 2 && n <= 14,
  enterBias: { cut: 3, blur: 0.6, pop: 0.3, slice: 0.2, wipe: 0.2 },
  plan(rng, cut, st) {
    return { font: rng.pick(fontsOf(st, ['display'])), side: rng.pick([1, 1, -1]), rail: rng.pick(['dash', 'line', 'dots']), acc: rng.chance(0.5) };
  },
  render(env) {
    const { W, H, sc } = env, c = env.cut, Pm = c.params, lt = env.lt, u = U(env), port = isPort(env);
    const t0 = flat(c.text), chars = [...t0];
    const size = Math.min(J.fitSize(t0, Pm.font, W * (port ? 0.86 : 0.72), H * 0.2, { track: 0.04 }), H * 0.17);
    const adv = chars.map(ch => J.metrics.adv(Pm.font, ch) * size * 1.04), Lt = adv.reduce((a, b) => a + b, 0);
    const offs = []; adv.reduce((a, b, i) => { offs[i] = a + b / 2; return a + b; }, 0);
    const R = clamp(Lt / TAU * 1.15, size * 1.5, Math.min(H * 0.28, W * 0.3)), side = Pm.side;
    const yL = H / 2 + side * R * (port ? 0.5 : 0.6);
    const xT = Math.max(W * 0.06 + R * 0.2, W / 2 - Lt / 2 - size * 0.4);
    const P0 = loopPath(W, H, xT, yL, R, side);
    const sEnd = P0.sT + TAU * R + (W / 2 + Lt / 2 - xT), sStart = P0.sT - (xT + W * 0.05);
    const T = clamp(c.dur * 0.55, 0.7, 1.8);
    const q = clamp(lt / T);
    let sHead = lerp(sStart, sEnd, 1 - Math.pow(1 - q, 2.6));
    sHead += E.inCubic(env.pOut) * W * 1.3;
    const out = tout(env), accC = accOn(sc);
    // the rail
    const ra = E.outCubic(clamp(lt / 0.3)) * out * (1 - 0.6 * J.smooth(T, T + 0.5, lt));
    if (ra > 0.01) {
      const lw = Math.max(1.2, u * 0.0022), pts = P0.pts.filter(p => p[0] > -W * 0.1 && p[0] < W * 1.1);
      if (Pm.rail === 'dots') { for (let i = 0; i < pts.length; i += 3) env.circle(pts[i][0], pts[i][1], lw * 1.3, sc.sub, null, 0, ra * 0.7, false); }
      else {
        const ctx = env.ctx; if (Pm.rail === 'dash') ctx.setLineDash([lw * 5, lw * 4]);
        env.line(pts, sc.sub, lw, ra * 0.85, false); ctx.setLineDash([]);
      }
    }
    let bb = null;
    chars.forEach((ch, i) => {
      if (ch === ' ') return;
      const sg = sHead - (Lt - offs[i]);
      const [x, y, a] = pathAt(P0, sg);
      if (x < -size || x > W + size) return;
      const it = { text: ch, font: Pm.font, size, x, y: y - side * 0, rot: a, color: Pm.acc && i === chars.length - 1 ? accC : sc.fg, mi: i * 0.2 };
      bb = UB(bb, J.mainDraw(env, it));
    });
    return bb || box(W * 0.3, H * 0.4, W * 0.7, H * 0.6);
  },
}, P);

/* ================================================================== 10 knGearWords — 歯車 */
reg('knGearWords', {
  name: '歯車', tags: ['pop', 'graphic'], w: 0.7, ae: 'circleWords', treat: 'safe', fits: n => n >= 2 && n <= 16,
  enterBias: { cut: 3, pop: 0.5, blur: 0.4, slice: 0.1, wipe: 0.1 },
  plan(rng, cut, st) {
    return { font: rng.pick(fontsOf(st, ['display'])), dir: rng.pick([1, -1]), fillMode: rng.pick(['alt', 'alt', 'ink', 'ring']) };
  },
  render(env) {
    const { W, H, sc } = env, c = env.cut, Pm = c.params, lt = env.lt, u = U(env), port = isPort(env);
    const units = unitsOf(c, port ? 4 : 5, Math.min(port ? 4 : 5, Math.max(2, Math.ceil(gcount(c.text) / 4)))), n = units.length;
    const ts = onsets(env, n, { frac: 0.45, gap: 0.42 });
    const txt = units.map(t => (!hasLatin(t) && gcount(t) > 3 ? J.splitLines(strip(t), Math.ceil(gcount(t) / 2)) : t));
    const rs0 = txt.map(t => { const m = meas(t, Pm.font, 1, { track: 0.02, lead: 1.05 }); return Math.hypot(m.w, m.h) / 2 * 1.12 + 0.18; });
    const med = rs0.slice().sort((a, b) => a - b)[Math.floor(n / 2)];
    const rs = rs0.map(r => clamp(r, med * 0.75, med * 1.3)), tk = rs0.map((r, i) => Math.min(1, rs[i] / r));
    // gears touch along a row (landscape) or a zigzag column (portrait)
    const gap = 0.1;
    let tot = rs.reduce((a, b) => a + b * 2, 0) + gap * (n - 1);
    const mr = Math.max(...rs);
    const k = port ? Math.min(H * 0.84 / tot, W * 0.62 / (mr * 2)) : Math.min(W * 0.9 / tot, H * 0.6 / (mr * 2), H * 0.22 / 0.7);
    const cs = [];
    let acc = -tot / 2;
    rs.forEach((r, i) => { acc += r; const z = port ? (i % 2 ? 1 : -1) * mr * 0.32 : (i % 2 ? 1 : -1) * mr * 0.12; cs.push(port ? [W / 2 + z * k, H / 2 + acc * k] : [W / 2 + acc * k, H / 2 + z * k]); acc += r + gap; });
    const out = tout(env);
    let bb = null;
    for (let i = 0; i < n; i++) {
      if (lt < ts[i]) continue;
      // every arrival turns the whole train one full turn (neighbours counter-rotate, the new gear rolls in)
      let ang = 0;
      for (let j = i; j < n; j++) { if (lt >= ts[j]) ang += 360 * (1 - E.inOutCubic(clamp((lt - ts[j]) / 0.62))) * (j === i ? 1 : rs[j] / rs[i] * 0.35); }
      ang *= (i % 2 ? -1 : 1) * Pm.dir;
      const pop = E.outBack(clamp((lt - ts[i]) / 0.3), 1.8), r = rs[i] * k * pop * out;
      const [cx, cy] = cs[i];
      const fill = Pm.fillMode === 'ink' ? sc.ink : Pm.fillMode === 'ring' ? null : (i % 2 ? sc.accent : sc.ink);
      const rimC = fill || accOn(sc);
      if (r > 1) {
        const nt = Math.max(10, Math.round(TAU * rs[i] * 6)), th = r * 0.12, pts = [];
        for (let t = 0; t < nt; t++) {
          const a0 = (t / nt * 360 + ang) * DEG, w = TAU / nt;
          pts.push([cx + Math.cos(a0 - w * 0.25) * r, cy + Math.sin(a0 - w * 0.25) * r], [cx + Math.cos(a0 - w * 0.15) * (r + th), cy + Math.sin(a0 - w * 0.15) * (r + th)],
            [cx + Math.cos(a0 + w * 0.15) * (r + th), cy + Math.sin(a0 + w * 0.15) * (r + th)], [cx + Math.cos(a0 + w * 0.25) * r, cy + Math.sin(a0 + w * 0.25) * r]);
        }
        env.poly(pts, rimC, 1, false);
        if (fill) env.circle(cx, cy, r * 0.96, fill, null, 0, 1, false);
        else env.circle(cx, cy, r * 0.93, sc.bg, null, 0, 1, false);
        env.circle(cx, cy, r * 0.86, null, fill ? onCol(sc, fill) : rimC, Math.max(1, r * 0.02), 0.35, false);
      }
      const tc = fill ? onCol(sc, fill) : sc.fg;
      const it = { text: txt[i], font: Pm.font, size: k * pop * tk[i], x: cx, y: cy, rot: ang, lead: 1.05, track: 0.02, color: tc, mi: miAt(env, ts[i]) };
      bb = UB(bb, J.mainDraw(env, it));
    }
    return bb;
  },
}, P);

/* ================================================================== 11 knCollide — 正面衝突 */
reg('knCollide', {
  name: '正面衝突', tags: ['pop', 'graphic', 'glitch'], w: 0.9, ae: 'splitHalves', fits: n => n >= 2 && n <= 16,
  enterBias: { cut: 3.5, pop: 0.3, blur: 0.4, slice: 0.2, wipe: 0.2 },
  plan(rng, cut, st) {
    return { font: rng.pick(fontsOf(st, ['display'])), acc: rng.pick(['A', 'B', 'none']), spark: rng.chance(0.8), at: rng.range(0.28, 0.36) };
  },
  render(env) {
    const { W, H, sc } = env, c = env.cut, Pm = c.params, lt = env.lt, u = U(env), port = isPort(env);
    const all = unitsOf(c, 8, 2), lat = hasLatin(c.text);
    // two halves by glyph count
    let best = 1, bd = 1e9, tot = all.reduce((a, t) => a + gcount(t), 0), acc = 0;
    for (let i = 1; i < all.length; i++) { acc += gcount(all[i - 1]); const d = Math.abs(acc - tot / 2); if (d < bd) { bd = d; best = i; } }
    const A = all.slice(0, best).join(lat ? ' ' : ''), B = all.slice(best).join(lat ? ' ' : '');
    const tC = clamp(c.dur * Pm.at * 0.65, 0.25, 0.55), d = lt - tC;
    const accC = accOn(sc), out = tout(env);
    let size, pa, pb, axis;
    if (!port) {
      const g = lat ? 0.35 : 0.14, full = A + (lat ? ' ' : '') + B;
      size = Math.min(J.fitSize(full, Pm.font, W * 0.86, H * 0.3, { track: 0.02 }), H * 0.24);
      const wa = em(A, Pm.font, { track: 0.02 }) * size, wb = em(B, Pm.font, { track: 0.02 }) * size, x0 = W / 2 - (wa + wb + g * size) / 2;
      pa = [x0 + wa / 2, H / 2]; pb = [x0 + wa + g * size + wb / 2, H / 2]; axis = 0;
    } else {
      size = Math.min(J.fitSize(A, Pm.font, W * 0.86, H * 0.2, { track: 0.02 }), J.fitSize(B, Pm.font, W * 0.86, H * 0.2, { track: 0.02 }), W * 0.3);
      pa = [W / 2, H / 2 - size * 0.62]; pb = [W / 2, H / 2 + size * 0.62]; axis = 1;
    }
    // each half starts just outside the frame and accelerates into the other
    const D = axis ? Math.max(pa[1], H - pb[1]) + size * 0.7 : Math.max(pa[0] + em(A, Pm.font, { track: 0.02 }) * size / 2, W - pb[0] + em(B, Pm.font, { track: 0.02 }) * size / 2) + size * 0.2;
    let offA, sqA = 1;
    if (d < 0) { const q = clamp(lt / tC); offA = -D * (1 - Math.pow(q, 1.6)); }
    else { offA = -size * 0.28 * Math.exp(-d * 6) * Math.sin(d * 15); sqA = 1 - 0.22 * Math.exp(-d * 14); }
    const jit = d > 0 ? Math.exp(-d * 9) * size * 0.05 : 0;
    const mk = (t, p, sgn, col) => {
      const o = offA * sgn;
      const it = { text: t, font: Pm.font, size, x: p[0] + (axis ? 0 : o) + J.rs(c.seed, env.step, sgn, 1) * jit, y: p[1] + (axis ? o : 0) + J.rs(c.seed, env.step, sgn, 2) * jit, track: 0.02, color: col, mi: 0 };
      if (axis) it.sy = sqA; else it.sx = sqA;
      return J.mainDraw(env, it);
    };
    let bb = mk(A, pa, 1, Pm.acc === 'A' ? accC : sc.fg);
    bb = UB(bb, mk(B, pb, -1, Pm.acc === 'B' ? accC : sc.fg));
    // speed lines behind both halves while they fly; sparks at the contact point
    const lw = Math.max(1.5, u * 0.0028);
    if (d < 0 && lt > 0.02) {
      const q = clamp(lt / tC), a = 0.7 * q * out;
      for (let j = 0; j < 5; j++) {
        const f = (j - 2) / 2.2 * size * 0.42, len = size * (1.2 + J.r(c.seed, j, 7) * 1.6);
        if (!axis) {
          const xa = pa[0] + offA - em(A, Pm.font) * size / 2 - size * 0.2, xb = pb[0] - offA + em(B, Pm.font) * size / 2 + size * 0.2;
          env.line([[xa - len, pa[1] + f], [xa, pa[1] + f]], sc.sub, lw, a, false); env.line([[xb, pb[1] - f], [xb + len, pb[1] - f]], sc.sub, lw, a, false);
        } else {
          const ya = pa[1] + offA - size * 0.7, yb = pb[1] - offA + size * 0.7;
          env.line([[pa[0] + f * 1.6, ya - len], [pa[0] + f * 1.6, ya]], sc.sub, lw, a, false); env.line([[pb[0] - f * 1.6, yb], [pb[0] - f * 1.6, yb + len]], sc.sub, lw, a, false);
        }
      }
    }
    if (Pm.spark && d > 0 && d < 0.45) {
      const a = (1 - d / 0.45) * out, cx = axis ? W / 2 : (pa[0] + em(A, Pm.font) * size / 2 + pb[0] - em(B, Pm.font) * size / 2) / 2, cy = axis ? H / 2 : H / 2;
      for (let j = 0; j < 12; j++) {
        const an = (j / 12 + J.r(c.seed, j, 9) * 0.05) * TAU, r0 = size * (0.25 + d * 2.2), r1 = r0 + size * 0.5 * a;
        env.line([[cx + Math.cos(an) * r0, cy + Math.sin(an) * r0], [cx + Math.cos(an) * r1, cy + Math.sin(an) * r1]], accC, lw * 1.4, a, false);
      }
    }
    return bb;
  },
}, P);

/* ================================================================== 12 knTumble — 箱転がし */
reg('knTumble', {
  name: '箱転がし', tags: ['pop', 'graphic'], w: 0.8, ae: 'dominoes', fits: n => n >= 2 && n <= 16,
  enterBias: { cut: 3.5, pop: 0.3, blur: 0.4, slice: 0.1, wipe: 0.1 },
  plan(rng, cut, st) {
    return { font: rng.pick(fontsOf(st, ['display'])), box: rng.pick(['plate', 'frame', 'none']), acc: rng.int(0, 5), floor: rng.chance(0.7) };
  },
  render(env) {
    const { W, H, sc, ctx } = env, c = env.cut, Pm = c.params, lt = env.lt, u = U(env), port = isPort(env);
    const units = unitsOf(c, 5, 2), n = units.length;
    const F = flowUnits(units, Pm.font, W * 0.82, H * (port ? 0.4 : 0.3), { maxSize: H * 0.2, track: 0.02, sp: hasLatin(c.text) ? 0.5 : 0.3, lead: 1.6 });
    const size = F.size, pad = size * 0.14, h = size + pad * 2;
    const ts = onsets(env, n, { frac: 0.42, gap: 0.36 });
    const T = 0.5, out = tout(env), accC = accOn(sc);
    let bb = null;
    const lw = Math.max(1.5, u * 0.0025);
    for (let i = 0; i < n; i++) {
      const p = F.pos[i], w = p.w + pad * 2, base = H / 2 + p.y + h / 2, xF = W / 2 + p.x - w / 2;
      if (Pm.floor && (i === 0 || F.pos[i - 1].li !== p.li)) {
        const row = F.pos.filter(q => q.li === p.li), x0 = W / 2 + row[0].x - row[0].w / 2 - pad * 3, x1 = W / 2 + row[row.length - 1].x + row[row.length - 1].w / 2 + pad * 3;
        const e = E.outExpo(clamp(lt / 0.4)) * out;
        env.line([[x1 - (x1 - x0) * e, base + lw], [x1, base + lw]], sc.sub, lw, 0.8, false);
      }
      if (lt < ts[i]) continue;
      // rolls in from the right over its bottom-left edge: quarter turns, footprint alternating w / h
      const m = Math.min(3, Math.max(1, Math.ceil((W - xF) / (2 * (w + h))))), steps = 4 * m;
      const Tm = T * (0.7 + 0.3 * m), q = clamp((lt - ts[i]) / Tm) * steps, j = Math.min(steps - 1, Math.floor(q)), f = q >= steps ? 1 : q - j;
      let xL = xF + m * 2 * (w + h);
      for (let s2 = 0; s2 < j; s2++) xL -= s2 % 2 ? w : h;
      const fw = j % 2 ? h : w, fh = j % 2 ? w : h, ph = -90 * E.inOutSine(f);
      const [dx, dy] = rotV(fw / 2, -fh / 2, ph);
      const cx = xL + dx, cy = base + dy, rot = -90 * j + ph;
      const done = q >= steps, land = done ? lt - ts[i] - Tm : -1;
      const sq = land >= 0 ? Math.exp(-land * 14) * 0.1 : 0;
      if (Pm.box !== 'none') {
        ctx.save(); ctx.translate(cx, cy + sq * h * 0.5); ctx.rotate(rot * DEG); ctx.scale(1 + sq * 0.5, 1 - sq);
        if (Pm.box === 'plate') env.rect(-w / 2, -h / 2, w, h, i === Pm.acc % n ? accC : sc.ink, out, false);
        else env.rrect(-w / 2, -h / 2, w, h, 2, null, out, false, sc.fg, lw);
        ctx.restore();
      }
      const plate = Pm.box === 'plate';
      const it = { text: units[i], font: Pm.font, size, x: cx, y: cy + sq * h * 0.5, rot, sx: 1 + sq * 0.5, sy: 1 - sq, track: 0.02,
        color: plate ? onCol(sc, i === Pm.acc % n ? accC : sc.ink) : (i === Pm.acc % n ? accC : sc.fg), plain: plate, mi: miAt(env, ts[i]), noHold: !done };
      bb = UB(bb, J.mainDraw(env, it));
    }
    return bb;
  },
}, P);

/* ================================================================== 13 knReflow — 縦から横へ */
reg('knReflow', {
  name: '縦から横へ', tags: ['editorial', 'graphic', 'emotional'], w: 0.9, ae: 'halfVertical', fits: n => n >= 2 && n <= 16,
  enterBias: { cut: 2.5, blur: 1, pop: 0.4, slice: 0.2, wipe: 0.3 },
  plan(rng, cut, st) {
    const port = cut.H > cut.W * 1.08, lat = /[A-Za-z]/.test(cut.text);
    return { font: rng.pick(fontsOf(st, ['serif', 'display'])), dir: !lat && port && rng.chance(0.5) ? 'h2v' : 'v2h', swirl: rng.pick([1, -1]), at: rng.range(0.36, 0.46) };
  },
  render(env) {
    const { W, H, sc } = env, c = env.cut, Pm = c.params, lt = env.lt, u = U(env), port = isPort(env);
    const lat = hasLatin(c.text), t0 = lat ? flat(c.text) : strip(c.text), chars = [...t0], n = chars.length;
    const vCols = n <= (port ? 7 : 5) ? 1 : n <= 12 ? 2 : 3, per = Math.ceil(n / vCols);
    const vt = []; for (let i = 0; i < n; i += per) vt.push(chars.slice(i, i + per).join(''));
    const vtext = vt.join('\n'), htext = J.splitLines(t0, lat ? (port ? 13 : 20) : (port ? 7 : 14));
    const sv = Math.min(J.fitSize(vtext, Pm.font, W * 0.5, H * 0.8, { vertical: true, lead: 1.3, track: 0.04 }), W * 0.3);
    const sh = Math.min(J.fitSize(htext, Pm.font, W * 0.84, H * 0.4, { lead: 1.25, track: 0.04 }), H * 0.24);
    const LV = J.layoutText({ text: vtext, font: Pm.font, size: sv, vertical: true, lead: 1.3, track: 0.04 }).filter(g => g.ch.trim());
    const LH = J.layoutText({ text: htext, font: Pm.font, size: sh, lead: 1.25, track: 0.04 }).filter(g => g.ch.trim());
    const A = Pm.dir === 'h2v' ? LH : LV, B = Pm.dir === 'h2v' ? LV : LH, sA = Pm.dir === 'h2v' ? sh : sv, sB = Pm.dir === 'h2v' ? sv : sh;
    const tR = clamp(c.dur * Pm.at, 0.5, 1.5), m = Math.min(A.length, B.length);
    let bb = null;
    for (let i = 0; i < m; i++) {
      const a = A[i], b = B[i];
      const q = E.inOutCubic(clamp((lt - tR - i * Math.min(0.05, 0.5 / m)) / 0.5));
      const ax = W / 2 + a.x + a.vx, ay = H / 2 + a.y + a.vy, bx = W / 2 + b.x + b.vx, by = H / 2 + b.y + b.vy;
      // along an arc that bulges sideways: the glyphs swirl from one setting to the other
      const mx = (ax + bx) / 2, my = (ay + by) / 2, dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1, k = Pm.swirl * 0.35 * (i % 2 ? 1 : 0.6);
      const cx = mx - dy / L * L * k, cy = my + dx / L * L * k;
      const x = (1 - q) * (1 - q) * ax + 2 * (1 - q) * q * cx + q * q * bx, y = (1 - q) * (1 - q) * ay + 2 * (1 - q) * q * cy + q * q * by;
      const r0 = a.r90 ? 90 : 0, r1 = b.r90 ? 90 : 0;
      const it = { text: a.ch, font: Pm.font, size: lerp(sA * (a.fs || 1), sB * (b.fs || 1), q), x, y, rot: lerp(r0, r1, q) + Pm.swirl * 180 * bellK(q) * 0.25, color: sc.fg, mi: i * 0.4 };
      bb = UB(bb, J.mainDraw(env, it));
    }
    return bb;
  },
}, P);

/* ================================================================== 14 knPadGrid — パッド */
reg('knPadGrid', {
  name: 'パッド', tags: ['pop', 'graphic', 'glitch'], w: 0.8, ae: 'gridCells', fits: n => n >= 2 && n <= 18,
  enterBias: { cut: 3, pop: 0.8, blur: 0.4, slice: 0.2, wipe: 0.2 },
  plan(rng, cut, st) {
    return { font: rng.pick(fontsOf(st, ['display'])), round: rng.chance(0.5), flash: rng.pick(['accent', 'accent', 'ink']), beat: rng.chance(0.7) };
  },
  render(env) {
    const { W, H, sc } = env, c = env.cut, Pm = c.params, lt = env.lt, u = U(env), port = isPort(env);
    const units = unitsOf(c, 6, Math.min(6, Math.max(2, Math.ceil(gcount(c.text) / 4)))), n = units.length;
    const cols = port ? (n <= 3 ? 1 : 2) : (n <= 3 ? n : n === 4 ? 2 : 3), rows = Math.ceil(n / cols);
    const gw = W * (port ? 0.84 : 0.86), gh = H * (port ? 0.62 : 0.72), g = u * 0.02;
    const cw = (gw - g * (cols - 1)) / cols, chh = Math.min((gh - g * (rows - 1)) / rows, cw * (port ? 0.8 : 0.75));
    const x0 = W / 2 - gw / 2, y0 = H / 2 - (chh * rows + g * (rows - 1)) / 2;
    const ts = onsets(env, n, { frac: 0.45, gap: 0.34 });
    const out = tout(env), flashC = Pm.flash === 'ink' ? sc.ink : accOn(sc), lw = Math.max(1.5, u * 0.003);
    let bb = null;
    const sizes = units.map(t => Math.min(J.fitSize(t, Pm.font, cw * 0.8, chh * 0.62, { track: 0.02 }), chh * 0.5));
    const sz = Math.min(...sizes) * 1.25;
    for (let i = 0; i < cols * rows; i++) {
      const r = Math.floor(i / cols), q = i % cols;
      const x = x0 + q * (cw + g), y = y0 + r * (chh + g);
      const e = E.outBack(clamp((lt - i * 0.04) / 0.3), 1.4) * out;
      if (e <= 0.01) continue;
      const ix = x + cw / 2 * (1 - e), iy = y + chh / 2 * (1 - e);
      env.rrect(ix, iy, cw * e, chh * e, Pm.round ? chh * 0.12 : 0, null, 1, false, sc.sub, lw);
      if (i >= n || lt < ts[i]) continue;
      // hit: the pad flashes full, then decays to a faint glow; beats re-trigger one pad at a time
      let fl = Math.exp(-(lt - ts[i]) * 6);
      if (Pm.beat && env.beat && lt > ts[n - 1] + 0.4 && env.beat.index % n === i) fl = Math.max(fl, 0.55 * Math.exp(-env.beat.since * 7));
      const pf = 0.1 + 0.9 * fl;
      env.rrect(x + lw, y + lw, cw - lw * 2, chh - lw * 2, Pm.round ? chh * 0.12 : 0, flashC, pf * out, false);
      const tc = pf > 0.5 ? onCol(sc, flashC) : sc.fg;
      const it = { text: units[i], font: Pm.font, size: Math.min(sizes[i], sz) * (1 + 0.12 * Math.exp(-(lt - ts[i]) * 12)), x: x + cw / 2, y: y + chh / 2, track: 0.02, color: tc, mi: miAt(env, ts[i]) };
      bb = UB(bb, J.mainDraw(env, it));
    }
    return bb;
  },
}, P);

})();
