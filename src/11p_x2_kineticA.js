/* JIZURA pack: x2kineticA — kinetic typography (追加分2): 15 word-driven layouts, 10 motion-accent decor, 6 moving backgrounds */
(() => {
'use strict';
const E = J.E;
const P = 'x2kineticA';
const DEG = J.DEG, TAU = J.TAU, clamp = J.clamp, lerp = J.lerp;
const LAY = (key, def) => J.register('layout', key, def, P);
const DEC = (key, def) => J.register('decor', key, def, P);

/* ---------------------------------------------------------------- helpers (same word model as the kinetic set) */
const U = env => Math.min(env.W, env.H);
const isPort = env => env.H > env.W * 1.08;
const isTall = env => env.W < env.H * 1.45;            // not a wide frame: lyrics may wrap into more lines
const strip = t => String(t || '').replace(/\s+/g, '');
const hasLatin = t => /[A-Za-z]/.test(String(t || ''));
const gcount = t => [...strip(t)].length;
const fontsOf = (st, roles) => J.fontsOf(st, roles);
const tout = env => 1 - E.inCubic(env.pOut);
const em = (text, font, o) => J.measure(Object.assign({ text, font, size: 100 }, o || {})).w / 100;
const UB = (a, b) => J.unionBB(a, b);
const miAt = (env, t) => Math.max(0, t) / Math.max(0.005, env.cut.stagger || 0.04);
const rotV = (x, y, a) => { const c = Math.cos(a * DEG), s = Math.sin(a * DEG); return [x * c - y * s, x * s + y * c]; };
const sprg = (t, k = 7, f = 18) => (t <= 0 ? 1 : Math.exp(-k * t) * Math.cos(f * t));      // 1 → 0, rings through 0
const spr = (t, k = 8, f = 14) => 1 - sprg(t, k, f);                                        // 0 → 1 with overshoot
const pls = (t, k = 7, f = 16) => (t <= 0 ? 0 : Math.exp(-k * t) * Math.sin(f * t));        // a kick that rings out
const accOn = sc => (J.contrast(sc.accent, sc.bg) >= 1.7 ? sc.accent : sc.fg);
const subOn = sc => (J.contrast(sc.sub, sc.bg) >= 1.4 ? sc.sub : sc.fg);
const EB = { cut: 3, blur: 0.7, pop: 0.7, slice: 0.3, wipe: 0.3 };

const unitCache = new Map();
function splitUnit(s) {
  const t = String(s).trim();
  if (/\s/.test(t)) {
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
  while (w.length > maxU) {
    let bi = 0, bv = 1e9;
    for (let i = 0; i < w.length - 1; i++) { const v = gcount(w[i]) + gcount(w[i + 1]); if (v < bv) { bv = v; bi = i; } }
    w.splice(bi, 2, w[bi] + (lat ? ' ' : '') + w[bi + 1]);
  }
  for (let g = 0; g < 8 && w.length < minU; g++) {
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
/* word clock: onset of each unit inside the cut (locked to beats when they fall close) */
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
const curIdx = (ts, t) => { let k = -1; for (let i = 0; i < ts.length; i++) if (t >= ts[i]) k = i; return k; };
function partitions(n, L) {
  const out = [];
  const rec = (start, left, acc) => {
    if (left === 1) { out.push(acc.concat([[start, n]])); return; }
    for (let e = start + 1; e <= n - left + 1; e++) rec(e, left - 1, acc.concat([[start, e]]));
  };
  if (L >= 1 && L <= n) rec(0, L, []);
  return out;
}
/* flow units into balanced lines; pos = unit centres relative to the block centre */
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
    for (let i = a; i < b; i++) { const w = ws[i] * size; pos[i] = { x: x + w / 2, y, w, li, a, b: b - 1 }; x += w + sp * size; }
  });
  return { size, pos, L: best.L, w: Math.max(...best.lw) * size, h: (best.L * lead - (lead - 1)) * size, ws, sp, lw: best.lw.map(v => v * size), pt: best.pt };
}
/* index of the "key" word: the longest unit (r picks among ties) */
const keyOf = (units, r = 0) => { const g = units.map(gcount), m = Math.max(...g), c = []; g.forEach((v, i) => { if (v === m) c.push(i); }); return c[(r | 0) % c.length]; };
/* the cut's word units: at most mxL / mxP (portrait), and enough of them that long lyrics can wrap */
const wu = (env, mxL, mxP, mn = 2) => { const mx = isPort(env) ? mxP : mxL; return unitsOf(env.cut, mx, clamp(Math.ceil(gcount(env.cut.text) / (isTall(env) ? 4 : 6)), Math.min(mn, mx), mx)); };
const fnt = (rng, st, roles) => rng.pick(fontsOf(st, roles || ['display']));

/* ================================================================================================ LAYOUTS */

/* 1 kzShove — every new word rams the row from the right; the row gives way as a chain and re-centres */
LAY('kzShove', {
  name: '押し出し列', en: 'Shove Along', tags: ['pop', 'graphic'], w: 1.2, ae: 'marquee', fits: n => n >= 2 && n <= 18, enterBias: EB,
  plan(rng, cut, st) { return { font: fnt(rng, st), hot: rng.chance(0.65), mark: rng.chance(0.7), from: rng.pick(['side', 'side', 'diag']) }; },
  render(env) {
    const { W, H, sc } = env, c = env.cut, Pm = c.params, lt = env.lt, u = U(env), port = isPort(env);
    const units = wu(env, 5, 6), n = units.length;
    const ts = onsets(env, n, { frac: 0.45, gap: 0.36 });
    const F = flowUnits(units, Pm.font, W * 0.84, H * (port ? 0.5 : 0.44), { maxLines: isTall(env) ? 4 : 2, maxSize: H * (port ? 0.12 : 0.2), track: 0.02 });
    const k = curIdx(ts, lt); if (k < 0) return null;
    const size = F.size, fly = 0.13, accC = accOn(sc), out = tout(env), cx = W / 2, cy = H / 2;
    const offOf = (a, j) => -(F.pos[a].x - F.pos[a].w / 2 + F.pos[j].x + F.pos[j].w / 2) / 2;
    let bb = null;
    for (let i = 0; i <= k; i++) {
      const p = F.pos[i], a = p.a, j = Math.min(k, p.b);
      const hit = ts[j] + fly, oNew = offOf(a, j), oOld = j > a ? offOf(a, j - 1) : oNew;
      const d = j - i, tau = lt - hit - d * 0.03;
      let x = p.x + oNew + (oOld - oNew) * sprg(tau, 8, 15), y = p.y, sx = 1, rot = 0;
      if (i === j) {
        const f = 1 - E.inQuad(clamp((lt - ts[i]) / fly));
        x += W * 0.75 * f;
        if (Pm.from === 'diag') y -= size * 1.2 * f;
        if (tau > 0) { sx = 1 - 0.16 * Math.exp(-tau * 13); x -= p.w * (1 - sx) / 2; }
      } else rot = -3.5 * pls(tau, 8, 18) * Math.pow(0.7, d - 1);
      const col = !Pm.hot ? sc.fg : i === k ? accC : J.mix(accC, sc.fg, clamp((lt - ts[i + 1] - fly) / 0.3));
      bb = UB(bb, J.mainDraw(env, { text: units[i], font: Pm.font, size, x: cx + x, y: cy + y, sx, rot, track: 0.02, color: col, mi: miAt(env, ts[i]) }));
      if (Pm.mark && i === j && j > a && tau > 0 && tau < 0.32) {             // impact marks at the joint
        const q = tau / 0.32, e = E.outExpo(q), jx = cx + p.x - p.w / 2 + oOld - size * 0.03, lw = Math.max(2, u * 0.004);
        for (const s of [-1, 1]) for (const m of [0, 1]) {
          const y0 = cy + y + s * size * (0.5 + 0.22 * e), y1 = y0 + s * size * 0.2 * (1 - q), dx = (m ? -1 : 0.4) * size * 0.16 * (0.4 + e);
          env.line([[jx + dx * 0.5, y0], [jx + dx, y1]], accC, lw, (1 - q) * out, false);
        }
      }
    }
    return bb;
  },
});

/* 2 kzConveyor — the words ride in on belts that brake to a halt; the key word hops when the belt stops */
LAY('kzConveyor', {
  name: 'コンベア', en: 'Conveyor Belt', tags: ['pop', 'graphic', 'editorial'], w: 1, ae: 'marquee', fits: n => n >= 2 && n <= 18, enterBias: EB,
  plan(rng, cut, st) { return { font: fnt(rng, st), dir: rng.pick([1, -1]), key: rng.int(0, 5), rollers: rng.chance(0.7), alt: rng.chance(0.6) }; },
  render(env) {
    const { W, H, sc, ctx } = env, c = env.cut, Pm = c.params, lt = env.lt, u = U(env), port = isPort(env);
    const units = wu(env, 5, 6, 1), n = units.length;
    const F = flowUnits(units, Pm.font, W * 0.84, H * (port ? 0.5 : 0.42), { maxLines: isTall(env) ? 3 : 2, maxSize: H * (port ? 0.11 : 0.17), lead: 1.75, track: 0.02 });
    const size = F.size, T = clamp(c.dur * 0.34, 0.4, 0.95), key = keyOf(units, Pm.key), accC = accOn(sc), subC = subOn(sc), out = tout(env);
    const cx = W / 2, cy = H / 2 - size * 0.12, th = Math.max(3, size * 0.07), e0 = E.outExpo(clamp(lt / 0.3));
    const tHop = T + 0.16, hq = clamp((lt - tHop) / 0.36);
    let bb = null;
    for (let li = 0; li < F.L; li++) {
      const dir = (Pm.alt && li % 2 ? -1 : 1) * Pm.dir, s = dir * W * 1.15 * (1 - E.outCubic(clamp((lt - li * 0.06) / T)));
      const ly = cy + (li - (F.L - 1) / 2) * 1.75 * size, by = ly + size * 0.62;
      env.rect(dir > 0 ? W * (1 - e0) : 0, by, W * e0, th, subC, 0.85 * out, false);
      const g = size * 0.8, m0 = Math.ceil(W / g) + 1;
      for (let m = 0; m < Math.min(m0, 70); m++) {
        const x = ((m * g + s) % (m0 * g) + m0 * g) % (m0 * g) - g * 0.5;
        env.rect(x, by + th, Math.max(2, size * 0.03), size * 0.09, subC, 0.55 * out * e0, false);
      }
      if (Pm.rollers) for (const rx of [0.16, 0.84]) {
        const r = size * 0.2, x = W * rx, y = by + th + size * 0.14 + r, a = s / r;
        env.circle(x, y, r * e0, null, subC, Math.max(2, size * 0.03), 0.8 * out, false);
        for (const b of [a, a + Math.PI / 2]) env.line([[x - Math.cos(b) * r * e0, y - Math.sin(b) * r * e0], [x + Math.cos(b) * r * e0, y + Math.sin(b) * r * e0]], subC, Math.max(2, size * 0.03), 0.8 * out, false);
      }
      for (let i = 0; i < n; i++) {
        const p = F.pos[i]; if (p.li !== li) continue;
        const tau = lt - T - li * 0.06;
        let x = cx + p.x + s, y = ly, rot = -dir * 5 * pls(tau, 5.5, 13), sy = 1, col = sc.fg;
        if (i === key && n > 1) {
          y -= size * 0.5 * Math.sin(Math.PI * hq);
          if (hq >= 1) { sy = 1 - 0.2 * Math.exp(-(lt - tHop - 0.36) * 12); y += size * (1 - sy) * 0.5; }
          if (hq > 0.5) col = accC;
          const me = E.outExpo(clamp((lt - tHop - 0.34) / 0.3));
          if (me > 0) env.rect(cx + p.x - p.w / 2 * me, by, p.w * me, th, accC, out, false);
        }
        if (x < -p.w || x > W + p.w) continue;
        bb = UB(bb, J.mainDraw(env, { text: units[i], font: Pm.font, size, x, y, rot, sy, track: 0.02, color: col, mi: i }));
      }
    }
    return bb;
  },
});

/* 3 kzSwingKnock — each word swings in on a long rod like a wrecking ball; the hit sends a tilt wave down the row */
LAY('kzSwingKnock', {
  name: 'スイング打ち', en: 'Swing Knock', tags: ['pop', 'graphic'], w: 1, ae: 'wave', fits: n => n >= 2 && n <= 16, enterBias: EB,
  plan(rng, cut, st) { return { font: fnt(rng, st), R: rng.pick([0.55, 0.9, 0.9]), amp: rng.range(30, 40), rod: rng.chance(0.75), acc: rng.int(0, 5) }; },
  render(env) {
    const { W, H, sc } = env, c = env.cut, Pm = c.params, lt = env.lt, u = U(env), port = isPort(env);
    const units = wu(env, 5, 6), n = units.length;
    const ts = onsets(env, n, { frac: 0.46, gap: 0.42 });
    const F = flowUnits(units, Pm.font, W * 0.8, H * (port ? 0.46 : 0.4), { maxLines: isTall(env) ? 4 : 2, maxSize: H * (port ? 0.12 : 0.19), lead: 1.3, track: 0.02 });
    const k = curIdx(ts, lt); if (k < 0) return null;
    const size = F.size, R = H * Pm.R, fly = 0.2, cx = W / 2, cy = H / 2 + size * 0.1, accC = accOn(sc), subC = subOn(sc), out = tout(env);
    let bb = null;
    for (let i = 0; i <= k; i++) {
      const p = F.pos[i], tau = lt - ts[i];
      let ang = tau < fly ? Pm.amp * (1 - E.inQuad(tau / fly)) : -Pm.amp * 0.2 * pls(tau - fly, 5.5, 12);
      let dx = 0;
      if (i < k && F.pos[k].li === p.li) {          // knocked by the newcomer
        const d = k - i, t2 = lt - ts[k] - fly - (d - 1) * 0.05, w = pls(t2, 6, 15) * Math.pow(0.72, d - 1);
        ang += 7 * w; dx = -size * 0.08 * w;
      }
      const px = cx + p.x, py = cy + p.y - R;
      const x = px + R * Math.sin(ang * DEG) + dx, y = py + R * Math.cos(ang * DEG);
      if (Pm.rod) {
        const ra = 0.7 * (1 - clamp((tau - fly - 0.3) / 0.35)) * out, r0 = R - size * 0.58;
        if (ra > 0.01) {
          env.line([[px + dx, py], [px + r0 * Math.sin(ang * DEG) + dx, py + r0 * Math.cos(ang * DEG)]], subC, Math.max(1.5, u * 0.003), ra, false);
          env.circle(px + r0 * Math.sin(ang * DEG) + dx, py + r0 * Math.cos(ang * DEG), Math.max(3, size * 0.045), accC, null, 0, ra, false);
        }
      }
      bb = UB(bb, J.mainDraw(env, { text: units[i], font: Pm.font, size, x, y, rot: -ang, track: 0.02, color: i === Pm.acc % n ? accC : sc.fg, mi: miAt(env, ts[i]) }));
    }
    return bb;
  },
});

/* 4 kzReadLens — the whole line is there; a reading point travels word to word and the word under it swells, pushing its neighbours aside */
LAY('kzReadLens', {
  name: '読み点ズーム', en: 'Reading Lens', tags: ['editorial', 'pop', 'emotional', 'calm'], w: 1.2, ae: 'mixed', fits: n => n >= 3 && n <= 18,
  plan(rng, cut, st) { return { font: fnt(rng, st, ['display', 'serif']), mag: rng.range(1.45, 1.7), end: rng.pick(['key', 'even', 'key']), dim: rng.chance(0.6), bar: rng.chance(0.7), key: rng.int(0, 5) }; },
  render(env) {
    const { W, H, sc } = env, c = env.cut, Pm = c.params, lt = env.lt, u = U(env), port = isPort(env);
    const units = wu(env, 6, 6), n = units.length, lat = hasLatin(c.text), sp = lat ? 0.36 : 0.16, lead = 1.62;
    const ts = onsets(env, n, { frac: 0.5, gap: 0.42 });
    const F = flowUnits(units, Pm.font, W * 0.84, H * (port ? 0.5 : 0.42), { maxLines: isTall(env) ? 4 : 2, maxSize: H * (port ? 0.1 : 0.16), sp, lead });
    const M = Pm.mag; let worst = 0;
    F.pt.forEach(([a, b]) => { let lw = 0, mw = 0; for (let i = a; i < b; i++) { lw += F.ws[i] + (i > a ? sp : 0); mw = Math.max(mw, F.ws[i]); } worst = Math.max(worst, lw + (M - 1) * mw); });
    const size = Math.min(F.size, W * 0.88 / worst), key = keyOf(units, Pm.key), k = Math.max(0, curIdx(ts, lt));
    let str = E.outCubic(clamp(lt / 0.25)), f = k >= 1 ? k - 1 + E.inOutCubic(clamp((lt - ts[k]) / 0.22)) : 0;
    const rf = f, tE = Math.max(ts[n - 1] + 0.25, Math.min(ts[n - 1] + 0.6, c.dur - c.outDur - 0.35)), rel = E.inOutCubic(clamp((lt - tE) / 0.4));
    let mag = M;
    if (Pm.end === 'key') { f = lerp(f, key, rel); mag = lerp(M, 1 + (M - 1) * 0.7, rel); } else str *= 1 - rel;
    const sca = units.map((_, i) => 1 + (mag - 1) * J.smooth(0, 1, clamp(1 - Math.abs(f - i))) * str);
    const X = [], Y = [], Wd = [];
    F.pt.forEach(([a, b], li) => {
      let tot = 0; for (let i = a; i < b; i++) tot += F.ws[i] * size * sca[i] + (i > a ? sp * size : 0);
      let x = -tot / 2;
      for (let i = a; i < b; i++) { const w = F.ws[i] * size * sca[i]; X[i] = W / 2 + x + w / 2; Wd[i] = w; Y[i] = H / 2 + (li - (F.L - 1) / 2) * lead * size; x += w + sp * size; }
    });
    const accC = accOn(sc), out = tout(env);
    let bb = null;
    for (let i = 0; i < n; i++) {
      const g = clamp(1 - Math.abs(f - i)) * str;
      const it = { text: units[i], font: Pm.font, size: size * sca[i], x: X[i], y: Y[i] - (sca[i] - 1) * size * 0.3, color: g > 0.5 ? accC : sc.fg,
        alpha: Pm.dim ? lerp(0.42, 1, Math.max(clamp(rf - i + 1), rel)) : 1, mi: i };
      bb = UB(bb, J.mainDraw(env, it));
    }
    if (Pm.bar && str > 0.01) {
      const a = Math.min(n - 1, Math.floor(f)), b = Math.min(n - 1, a + 1), fr = f - a, hop = Y[a] !== Y[b] ? Math.sin(Math.PI * fr) : 0;
      const ux = lerp(X[a], X[b], fr), uw = lerp(Wd[a], Wd[b], fr) * (1 - 0.5 * hop), uy = lerp(Y[a], Y[b], fr) + size * 0.66, bh = Math.max(3, size * 0.07);
      env.rect(ux - uw / 2, uy, uw, bh, accC, str * out * clamp(lt / 0.2), false);
    }
    return bb;
  },
});

/* 5 kzGateSwing — words hinge on a spine and swing open like gates, one after another; open gates rattle */
LAY('kzGateSwing', {
  name: 'ゲート開き', en: 'Gate Swing', tags: ['graphic', 'pop', 'editorial'], w: 1, ae: 'stack', fits: n => n >= 2 && n <= 16, enterBias: EB,
  plan(rng, cut, st) { return { font: fnt(rng, st, ['display', 'serif']), mode: rng.pick(['alt', 'alt', 'left', 'right']), up: rng.pick([1, 1, -1]), acc: rng.int(0, 5), dots: rng.chance(0.75) }; },
  render(env) {
    const { W, H, sc } = env, c = env.cut, Pm = c.params, lt = env.lt, u = U(env), port = isPort(env);
    const units = wu(env, 4, 6), n = units.length;
    const ts = onsets(env, n, { frac: 0.46, gap: 0.4 });
    const ms = units.map(t => em(t, Pm.font, { track: 0.02 })), mm = Math.max(...ms), g = 0.3, lead = 1.24, alt = Pm.mode === 'alt' && n > 2 && mm <= 5.2 && !port;
    const size = Math.min((alt ? W * 0.43 : W * 0.8) / (mm + g), H * 0.72 / (n * lead), H * 0.2);
    const sideOf = i => (alt ? (i % 2 ? -1 : 1) : Pm.mode === 'right' ? -1 : 1);
    const spineX = alt ? W / 2 : W / 2 - sideOf(0) * (mm + g) * size / 2;
    const k = curIdx(ts, lt); if (k < 0) return null;
    const accC = accOn(sc), subC = subOn(sc), out = tout(env), yOf = i => H / 2 + (i - (n - 1) / 2) * lead * size;
    const e = E.outExpo(clamp((lt - ts[k]) / 0.3)), yb = lerp(yOf(Math.max(0, k - 1)), yOf(k), e) + size * 0.62, yt = yOf(0) - size * 0.62;
    env.line([[spineX, yt], [spineX, lerp(yt, yb, k === 0 ? e : 1)]], subC, Math.max(2, u * 0.004), 0.9 * out, false);
    let bb = null;
    for (let i = 0; i <= k; i++) {
      const s = sideOf(i), d = k - i;
      let rot = -90 * s * Pm.up * sprg(lt - ts[i], 5.5, 12);
      if (d > 0) rot += 3 * s * pls(lt - ts[k] - 0.08 - d * 0.03, 6, 15) * Math.pow(0.7, d - 1);
      const y = yOf(i);
      bb = UB(bb, J.mainDraw(env, { text: units[i], font: Pm.font, size, x: spineX + s * g * size, y, align: s > 0 ? 'left' : 'right', rot, track: 0.02,
        color: i === Pm.acc % n ? accC : sc.fg, mi: miAt(env, ts[i]) }));
      if (Pm.dots) env.circle(spineX, y, size * 0.075 * E.outBack(clamp((lt - ts[i]) / 0.25), 2), accC, null, 0, out, false);
    }
    return bb;
  },
});

/* 6 kzHopSteps — a staircase is built tread by tread and each word hops up from the previous step */
LAY('kzHopSteps', {
  name: '階段ホップ', en: 'Hop Steps', tags: ['pop', 'graphic'], w: 1, ae: 'diag', fits: n => n >= 2 && n <= 15, enterBias: EB,
  plan(rng, cut, st) { return { font: fnt(rng, st), dx: rng.range(0.6, 1.05), acc: rng.int(0, 5), riser: rng.chance(0.6) }; },
  render(env) {
    const { W, H, sc } = env, c = env.cut, Pm = c.params, lt = env.lt, u = U(env);
    const units = wu(env, 5, 5), n = units.length;
    const ts = onsets(env, n, { frac: 0.48, gap: 0.42 });
    const ms = units.map(t => em(t, Pm.font, { track: 0.02 })), lead = 1.34;
    let lo = 1e9, hi = -1e9; ms.forEach((m, i) => { lo = Math.min(lo, i * Pm.dx - m / 2); hi = Math.max(hi, i * Pm.dx + m / 2); });
    const size = Math.min(W * 0.82 / (hi - lo), H * 0.74 / (n * lead), H * 0.2), dir = -1;
    const xOf = i => W / 2 + (i * Pm.dx - (lo + hi) / 2) * size, yOf = i => H / 2 - dir * (i - (n - 1) / 2) * lead * size - size * 0.05;
    const k = curIdx(ts, lt); if (k < 0) return null;
    const accC = accOn(sc), subC = subOn(sc), out = tout(env), hop = 0.27, lw = Math.max(3, size * 0.06), pad = size * 0.14;
    let bb = null;
    for (let i = 0; i <= Math.min(n - 1, k + 1); i++) {
      const w = ms[i] * size, tau = lt - ts[i] - hop, dip = tau > 0 ? size * 0.07 * Math.exp(-tau * 10) * Math.cos(tau * 19) : 0;
      const te = E.outExpo(clamp((lt - (i ? ts[i] - 0.1 : 0)) / 0.24));       // the tread is laid just before the hop
      const ty = yOf(i) + size * 0.6 + dip, x0 = xOf(i) - w / 2 - pad;
      if (te > 0) {
        env.line([[x0, ty], [x0 + (w + pad * 2) * te, ty]], subC, lw, 0.9 * out, false);
        if (Pm.riser && i > 0) env.line([[x0, ty], [x0, ty + dir * (lead * size - lw) * te]], subC, Math.max(1.5, lw * 0.4), 0.6 * out, false);
      }
      if (i > k) continue;
      const q = clamp((lt - ts[i]) / hop), sx0 = i ? xOf(i - 1) : xOf(0) - size * 2.2, sy0 = i ? yOf(i - 1) : yOf(0) + dir * lead * size;
      let x = lerp(sx0, xOf(i), q), y = lerp(sy0, yOf(i), q) - size * 0.85 * Math.sin(Math.PI * q) + dip, sy = 1, sz = size * lerp(0.45, 1, E.outQuad(q));
      if (tau > 0) { sy = 1 - 0.22 * Math.exp(-tau * 12) * Math.cos(tau * 20); y += size * (1 - sy) * 0.5; }
      if (i < k) { const pq = clamp((lt - ts[i + 1]) / 0.16); sy *= 1 - 0.12 * Math.sin(Math.PI * pq); }   // pushed down as the next one takes off
      bb = UB(bb, J.mainDraw(env, { text: units[i], font: Pm.font, size: sz, x, y, sy, rot: -dir * 12 * (1 - q), alpha: clamp(q * 5), track: 0.02,
        color: i === Pm.acc % n ? accC : sc.fg, mi: miAt(env, ts[i]) }));
    }
    return bb;
  },
});

/* 7 kzFoldOut — a folded leaflet: each word unfolds out of the edge of the previous one */
LAY('kzFoldOut', {
  name: '折り出し', en: 'Fold Out', tags: ['editorial', 'graphic', 'pop', 'calm'], w: 1, ae: 'labels', fits: n => n >= 2 && n <= 16, enterBias: EB,
  plan(rng, cut, st) { return { font: fnt(rng, st, ['display', 'serif']), mode: rng.pick(['chain', 'chain', 'stack']), crease: rng.chance(0.8), acc: rng.int(0, 5) }; },
  render(env) {
    const { W, H, sc } = env, c = env.cut, Pm = c.params, lt = env.lt, u = U(env), port = isPort(env);
    const units = wu(env, 5, 6), n = units.length, lat = hasLatin(c.text);
    const ts = onsets(env, n, { frac: 0.46, gap: 0.38 });
    const stack = Pm.mode === 'stack' || (port && n <= 4), lead = 1.36, sp = lat ? 0.42 : 0.26;
    const F = flowUnits(units, Pm.font, W * 0.82, H * (stack ? 0.72 : port ? 0.5 : 0.44), { maxLines: stack ? n : isTall(env) ? 4 : 2, lineBonus: stack ? 0.01 : 1.1, maxSize: H * (port ? 0.13 : 0.2), lead, sp });
    const k = curIdx(ts, lt); if (k < 0) return null;
    const size = F.size, cx = W / 2, cy = H / 2, accC = accOn(sc), subC = subOn(sc), out = tout(env), lw = Math.max(1.5, u * 0.0025);
    let bb = null;
    for (let i = 0; i <= k; i++) {
      const p = F.pos[i], f = Math.max(0.001, spr(lt - ts[i], 8.5, 13)), vfold = i === p.a, col = i === Pm.acc % n ? accC : sc.fg;
      const it = { text: units[i], font: Pm.font, size, x: cx + p.x, y: cy + p.y, color: J.mix(subC, col, clamp(f * 1.2 - 0.2)), mi: miAt(env, ts[i]) };
      const ce = E.outExpo(clamp((lt - ts[i]) / 0.3)) * out;
      if (vfold) {
        it.sy = f; it.y = cy + p.y - size / 2 + size * f / 2; it.skew = -14 * (1 - Math.min(1, f));
        if (Pm.crease && p.li > 0) { const y = cy + p.y - lead * size / 2, hw = F.lw[p.li] / 2; env.line([[cx - hw * ce, y], [cx + hw * ce, y]], subC, lw, 0.6 * out, false); }
      } else {
        it.sx = f; it.x = cx + p.x - p.w / 2 + p.w * f / 2;
        if (Pm.crease) { const x = cx + p.x - p.w / 2 - sp * size / 2; env.line([[x, cy + p.y - size * 0.55 * ce], [x, cy + p.y + size * 0.55 * ce]], subC, lw, 0.6 * out, false); }
      }
      bb = UB(bb, J.mainDraw(env, it));
    }
    return bb;
  },
});

/* 8 kzSagLine — words slide down a taut line from the edge; the line sags and bounces under each one's weight */
LAY('kzSagLine', {
  name: 'たわむ線', en: 'Sagging Line', tags: ['calm', 'emotional', 'pop', 'graphic'], w: 1, ae: 'wave', fits: n => n >= 2 && n <= 16, enterBias: EB,
  plan(rng, cut, st) { return { font: fnt(rng, st, ['display', 'serif']), sag: rng.range(0.8, 1.2), clip: rng.chance(0.75), acc: rng.int(0, 5) }; },
  render(env) {
    const { W, H, sc } = env, c = env.cut, Pm = c.params, lt = env.lt, u = U(env), port = isPort(env);
    const units = wu(env, 5, 5), n = units.length, lat = hasLatin(c.text);
    const ts = onsets(env, n, { frac: 0.48, gap: 0.42 });
    const ropes = port ? 3 : gcount(c.text) > (isTall(env) ? 6 : 10) ? 2 : 1;
    const F = flowUnits(units, Pm.font, W * 0.78, H * (port ? 0.52 : ropes > 1 ? 0.46 : 0.24), { maxLines: ropes, maxSize: H * (port ? 0.1 : 0.17), lead: 2.5, sp: lat ? 0.5 : 0.34 });
    const size = F.size, S = size * 0.55 * Pm.sag, slide = 0.44, cx = W / 2, cy = H / 2, accC = accOn(sc), subC = subOn(sc), out = tout(env);
    const gm = Math.max(...units.map(gcount)), e0 = E.outExpo(clamp(lt / 0.4));
    let bb = null;
    for (let li = 0; li < F.L; li++) {
      const from = 1, loads = [];
      for (let i = 0; i < n; i++) {
        const p = F.pos[i]; if (p.li !== li || lt < ts[i]) continue;
        const tau = lt - ts[i], q = E.outCubic(clamp(tau / slide));
        const a = lerp(from > 0 ? W + p.w / 2 + size * 0.2 : -p.w / 2 - size * 0.2, cx + p.x, q);
        loads.push({ i, a, m: (0.55 + 0.45 * gcount(units[i]) / gm) * (1 + 0.5 * pls(tau - slide * 0.55, 4.5, 12)) });
      }
      const defl = x => { let d = 0; for (const l of loads) { const aa = clamp(l.a, 0, W); d += l.m * (x < aa ? x * (W - aa) : aa * (W - x)); } return d * 4 / (W * W) * S; };
      const yR = cy + F.pos[F.pt[li][0]].y - size * 0.78 - S * 0.5;
      const xs = [0].concat(loads.map(l => clamp(l.a, 0, W)).sort((a, b) => a - b), [W]);
      env.polyPartial(xs.map(x => [x, yR + defl(x)]), e0, subC, Math.max(2, u * 0.004), 0.9 * out, false);
      for (const l of loads) {
        const p = F.pos[l.i], ry = yR + defl(l.a), sl = (defl(l.a + 4) - defl(l.a - 4)) / 8;
        if (Pm.clip) env.rect(l.a - size * 0.04, ry - size * 0.07, size * 0.08, size * 0.24, accC, out, false);
        bb = UB(bb, J.mainDraw(env, { text: units[l.i], font: Pm.font, size, x: l.a, y: ry + size * 0.74, rot: Math.atan(sl) / DEG * 0.8,
          color: l.i === Pm.acc % n ? accC : sc.fg, mi: miAt(env, ts[l.i]) }));
      }
    }
    return bb;
  },
});

/* 9 kzSlingshot — a rubber band under the block is drawn back with each word and fires it up into its place */
LAY('kzSlingshot', {
  name: 'ゴム発射', en: 'Slingshot', tags: ['pop', 'graphic'], w: 0.9, ae: 'scatter', fits: n => n >= 2 && n <= 16, enterBias: EB,
  plan(rng, cut, st) { return { font: fnt(rng, st), deep: rng.range(0.6, 1), acc: rng.int(0, 5), posts: rng.chance(0.8), hot: rng.chance(0.5) }; },
  render(env) {
    const { W, H, sc } = env, c = env.cut, Pm = c.params, lt = env.lt, u = U(env), port = isPort(env);
    const units = wu(env, 5, 6), n = units.length;
    const ts = onsets(env, n, { frac: 0.5, gap: 0.44 });
    const F = flowUnits(units, Pm.font, W * 0.84, H * 0.5, { maxLines: isTall(env) ? 4 : 3, maxSize: H * (port ? 0.12 : 0.18) });
    const size = F.size, bx = W / 2, by = H * 0.43, band = H * 0.87, half = Math.max(F.w / 2 + size * 0.2, W * 0.24);
    const pd = 0.17, pull = size * Pm.deep, accC = accOn(sc), out = tout(env), e0 = E.outExpo(clamp(lt / 0.35));
    const k = curIdx(ts, lt);
    let ax = bx, ay = band, bb = null;
    for (let i = 0; i <= k; i++) {
      const p = F.pos[i], tau = lt - ts[i], tx = bx + p.x, ty = by + p.y, q = E.outCubic(clamp(tau / pd));
      const ry = band - size * 0.6 + pull * q;                        // seated on the band, drawn back
      const f = tau < pd ? 0 : spr(tau - pd, 9, 12), st = tau < pd ? 1 - 0.25 * q : 1 + 0.3 * Math.exp(-(tau - pd) * 9);
      bb = UB(bb, J.mainDraw(env, { text: units[i], font: Pm.font, size, x: tx, y: lerp(ry, ty, f), sy: st, alpha: clamp(tau / 0.05),
        color: (Pm.hot ? i === k : i === Pm.acc % n) ? accC : sc.fg, mi: miAt(env, ts[i]) }));
      if (i === k) { ax = tx; ay = tau < pd ? band + pull * q : band - size * 0.4 * pls(tau - pd, 8, 34); }
    }
    const x0 = bx - half * e0, x1 = bx + half * e0, lw = Math.max(2.5, u * 0.005);
    env.line([[x0, band], [clamp(ax, x0, x1), ay], [x1, band]], accC, lw, 0.95 * out, false);
    if (Pm.posts) for (const x of [x0, x1]) { env.line([[x, band - u * 0.03 * e0], [x, band + u * 0.045 * e0]], sc.fg, lw * 1.3, out, false); }
    return bb;
  },
});

/* 10 kzWedge — the line stands closed; the key word drops in and wedges the others apart */
LAY('kzWedge', {
  name: '割り込み', en: 'Wedge In', tags: ['pop', 'graphic', 'emotional'], w: 1.2, ae: 'mixed', fits: n => n >= 2 && n <= 18, emph: 1.3,
  plan(rng, cut, st) { return { font: fnt(rng, st), how: rng.pick(['drop', 'drop', 'rise', 'inflate']), key: rng.int(0, 5), marks: rng.chance(0.6) }; },
  render(env) {
    const { W, H, sc } = env, c = env.cut, Pm = c.params, lt = env.lt, u = U(env), port = isPort(env);
    const units = wu(env, 5, 6), n = units.length;
    const F = flowUnits(units, Pm.font, W * 0.84, H * (port ? 0.5 : 0.44), { maxLines: isTall(env) ? 4 : 2, maxSize: H * (port ? 0.12 : 0.2), track: 0.02 });
    // the key word: the longest one that has neighbours on its line to push aside (inner words first)
    let key = keyOf(units, Pm.key), kv = -1;
    units.forEach((t, i) => { const p = F.pos[i]; if (p.a === p.b) return; const v = gcount(t) + (i > p.a && i < p.b ? 0.5 : 0) + ((i + Pm.key) % n) * 0.01; if (v > kv) { kv = v; key = i; } });
    const size = F.size, kp = F.pos[key], tK = clamp(c.dur * 0.3, 0.3, 0.9), fall = Pm.how === 'inflate' ? 0 : 0.17, hit = tK + fall;
    const open = spr(lt - hit, 7.5, 14), kick = pls(lt - hit, 7, 16), cx = W / 2, cy = H / 2, accC = accOn(sc), out = tout(env);
    const gapPx = key < kp.b ? F.pos[key + 1].x - F.pos[key + 1].w / 2 - (kp.x + kp.w / 2) : key > kp.a ? kp.x - kp.w / 2 - (F.pos[key - 1].x + F.pos[key - 1].w / 2) : 0;
    const half = (kp.w + gapPx) / 2;
    let mn = 1e9, mx = -1e9;
    for (let i = kp.a; i <= kp.b; i++) if (i !== key) { const p = F.pos[i], x = p.x + (i < key ? half : -half); mn = Math.min(mn, x - p.w / 2); mx = Math.max(mx, x + p.w / 2); }
    const corr = mn < mx ? -(mn + mx) / 2 : 0;
    let bb = null, mi = 0;
    for (let i = 0; i < n; i++) {
      if (i === key) continue;
      const p = F.pos[i]; let x = p.x, y = p.y, rot = 0;
      if (p.li === kp.li) { const s = i < key ? 1 : -1; x += (s * half + corr) * (1 - open); rot = -s * 4 * kick; }
      else y += Math.sign(p.li - kp.li) * size * 0.1 * kick;
      bb = UB(bb, J.mainDraw(env, { text: units[i], font: Pm.font, size, x: cx + x, y: cy + y, rot, track: 0.02, color: sc.fg, mi: mi++ }));
    }
    const tau = lt - tK;
    if (tau >= 0) {
      let y = kp.y, sy = 1, sz = size;
      if (Pm.how === 'inflate') sz = size * Math.max(0.02, spr(tau, 8, 13));
      else {
        y += (Pm.how === 'rise' ? 1 : -1) * H * 0.62 * (1 - E.inQuad(clamp(tau / fall)));
        if (lt > hit) { sy = 1 - 0.2 * Math.exp(-(lt - hit) * 12) * Math.cos((lt - hit) * 18); }
      }
      bb = UB(bb, J.mainDraw(env, { text: units[key], font: Pm.font, size: sz, x: cx + kp.x, y: cy + y, sy, track: 0.02, color: accC, mi: miAt(env, tK) }));
      const t2 = lt - hit;
      if (Pm.marks && t2 > 0 && t2 < 0.35) {
        const q = t2 / 0.35, e = E.outExpo(q), lw = Math.max(2, u * 0.004);
        for (const s of [-1, 1]) for (const v of [-1, 1]) {
          const x0 = cx + kp.x + s * (kp.w / 2 + size * 0.1 * e), y0 = cy + kp.y + v * size * (0.56 + 0.2 * e);
          env.line([[x0, y0], [x0 + s * size * 0.16 * (1 - q), y0 + v * size * 0.16 * (1 - q)]], accC, lw, (1 - q) * out, false);
        }
      }
    }
    return bb;
  },
});

/* 11 kzTiltTray — a tray tips one way, then the other: the lines slide to the walls, thud, and settle in the middle when it levels */
LAY('kzTiltTray', {
  name: '傾く盤', en: 'Tilting Tray', tags: ['pop', 'graphic', 'calm'], w: 0.9, ae: 'stack', fits: n => n >= 2 && n <= 18,
  plan(rng, cut, st) { return { font: fnt(rng, st, ['display', 'serif']), th: rng.range(4, 6.5), sgn: rng.pick([1, -1]), frame: rng.pick(['tray', 'tray', 'floor']), acc: rng.int(0, 5) }; },
  render(env) {
    const { W, H, sc, ctx } = env, c = env.cut, Pm = c.params, lt = env.lt, u = U(env), port = isPort(env);
    const units = wu(env, 5, 6, 1), n = units.length;
    const F = flowUnits(units, Pm.font, W * (port ? 0.62 : 0.56), H * 0.5, { maxLines: isTall(env) ? 5 : 3, lineBonus: 1.04, maxSize: H * (port ? 0.11 : 0.17), lead: 1.3 });
    const size = F.size, TW = W * 0.84, TH = Math.max(F.h + size * 0.7, H * 0.26), T = clamp(c.dur * 0.52, 0.5, 1.6), th = Pm.th * Pm.sgn;
    const tilt = lerp(lerp(-th, th, E.inOutCubic(clamp((lt - 0.1 * T) / (0.22 * T)))), 0, lt > 0.62 * T ? spr(lt - 0.62 * T, 5, 8) : 0);
    const sAt = l => {
      const t1 = 0.16 * T + l * 0.045, d1 = 0.26 * T, t2 = 0.66 * T + l * 0.045; let s = -1;
      if (lt >= t1) { const q = (lt - t1) / d1, t3 = lt - t1 - d1; s = q < 1 ? -1 + 2 * E.inQuad(q) : 1 - 0.13 * Math.exp(-t3 * 9) * Math.abs(Math.sin(t3 * 17)); }
      if (lt >= t2) s *= sprg(lt - t2, 5.5, 9);
      return s * Pm.sgn;
    };
    const cx = W / 2, cy = H / 2, accC = accOn(sc), subC = subOn(sc), out = tout(env), e0 = E.outExpo(clamp(lt / 0.35)), lw = Math.max(2.5, u * 0.005);
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(tilt * DEG);
    const hw = TW / 2, hh = TH / 2, wall = Pm.frame === 'tray' ? TH * e0 : TH * 0.3 * e0;
    env.line([[-hw, hh - wall], [-hw, hh], [hw, hh], [hw, hh - wall]], subC, lw, 0.9 * out * e0, false);
    ctx.restore();
    let bb = null;
    for (let i = 0; i < n; i++) {
      const p = F.pos[i], R = Math.max(0, (TW - F.lw[p.li]) / 2 - size * 0.22);
      const [x, y] = rotV(sAt(p.li) * R + p.x, p.y, tilt);
      bb = UB(bb, J.mainDraw(env, { text: units[i], font: Pm.font, size, x: cx + x, y: cy + y, rot: tilt, color: n > 1 && i === Pm.acc % n ? accC : sc.fg, mi: i }));
    }
    return bb;
  },
});

/* 12 kzRelay — one word holds the stage; when the next arrives the old one shrinks away into a small running line above */
LAY('kzRelay', {
  name: '主役リレー', en: 'Lead Relay', tags: ['pop', 'editorial', 'emotional', 'graphic'], w: 1.1, ae: 'mixed', fits: n => n >= 3 && n <= 18, enterBias: EB,
  plan(rng, cut, st) { return { font: fnt(rng, st), acc: rng.chance(0.7), rule: rng.chance(0.7), al: rng.pick(['center', 'center', 'left']) }; },
  render(env) {
    const { W, H, sc } = env, c = env.cut, Pm = c.params, lt = env.lt, u = U(env), port = isPort(env);
    const units = wu(env, 5, 6), n = units.length;
    const ts = onsets(env, n, { frac: 0.5, gap: 0.46 });
    const k = curIdx(ts, lt); if (k < 0) return null;
    const capY = H * (port ? 0.33 : 0.25), bigY = H * (port ? 0.56 : 0.6), accC = accOn(sc), subC = subOn(sc), out = tout(env);
    const big = units.map(t => Math.min(J.fitSize(t, Pm.font, W * 0.84, H * 0.36, { track: 0.02 }), H * (port ? 0.24 : 0.36), W * 0.56));
    const Fc = n > 1 ? flowUnits(units.slice(0, n - 1), Pm.font, W * 0.8, H * 0.15, { maxLines: 2, maxSize: H * (port ? 0.055 : 0.1) }) : null;
    const left = Pm.al === 'left' && Fc, ox = left ? W * 0.1 + Fc.w / 2 : W / 2;
    let bb = null;
    for (let i = 0; i <= k; i++) {
      let it;
      if (i < k) {
        const q = E.outExpo(clamp((lt - ts[i + 1]) / 0.34)), p = Fc.pos[i];
        it = { text: units[i], font: Pm.font, size: Math.exp(lerp(Math.log(big[i]), Math.log(Fc.size), q)), x: lerp(left ? W * 0.1 + J.measure({ text: units[i], font: Pm.font, size: big[i], track: 0.02 }).w / 2 : W / 2, ox + p.x, q),
          y: lerp(bigY, capY + p.y, q), color: Pm.acc ? J.mix(accC, sc.fg, q) : sc.fg };
      } else {
        const q = clamp((lt - ts[i]) / 0.22), bw = J.measure({ text: units[i], font: Pm.font, size: big[i], track: 0.02 }).w;
        it = { text: units[i], font: Pm.font, size: big[i] * (i ? lerp(1.6, 1, E.outExpo(q)) : 1), x: left ? W * 0.1 + bw / 2 : W / 2, y: bigY, track: 0.02, alpha: i ? clamp(q * 4) : 1, color: Pm.acc ? accC : sc.fg };
      }
      it.mi = miAt(env, ts[i]);
      bb = UB(bb, J.mainDraw(env, it));
    }
    if (Pm.rule && Fc && k > 0) {
      const y = capY + Fc.h / 2 + Fc.size * 0.45, w = Fc.w * lerp((k - 1) / (n - 1), k / (n - 1), E.outExpo(clamp((lt - ts[k]) / 0.35)));
      env.line([[ox - Fc.w / 2, y], [ox - Fc.w / 2 + w, y]], subC, Math.max(2, u * 0.003), 0.85 * out, false);
    }
    return bb;
  },
});

/* 13 kzLineFeed — the lyric is fed out of a slot line by line in jerky steps, then the sheet glides up to the middle */
LAY('kzLineFeed', {
  name: '行送り', en: 'Line Feed', tags: ['editorial', 'graphic', 'glitch', 'pop'], w: 1, ae: 'type', fits: n => n >= 2 && n <= 16, enterBias: EB,
  plan(rng, cut, st) { return { font: fnt(rng, st, ['display', 'body', 'mono']), al: rng.pick(['left', 'left', 'center']), paper: rng.chance(0.6), acc: rng.int(0, 5), steps: rng.pick([2, 3, 3]) }; },
  render(env) {
    const { W, H, sc, ctx } = env, c = env.cut, Pm = c.params, lt = env.lt, u = U(env), port = isPort(env);
    const units = wu(env, 4, 6), n = units.length;
    const ts = onsets(env, n, { frac: 0.5, gap: 0.42 });
    const ms = units.map(t => em(t, Pm.font, { track: 0.02 })), mm = Math.max(...ms), lead = 1.3;
    const size = Math.min(W * 0.76 / mm, H * 0.6 / (n * lead), H * 0.19), bh = n * lead * size, bw = mm * size, pad = size * 0.3;
    const slotY = Math.min(H * 0.9, H / 2 + bh / 2 + size * 0.7), Yf = H / 2 - bh / 2, Yk = k => slotY - size * 0.1 - (k + 1) * lead * size;
    const k = curIdx(ts, lt);
    const stepE = q => { q = clamp(q); const m = Pm.steps, a = Math.floor(q * m); return q >= 1 ? 1 : (a + E.outExpo(q * m - a)) / m; };
    const tE = Math.max(ts[n - 1] + 0.3, Math.min(ts[n - 1] + 0.6, c.dur - c.outDur - 0.4)), ge = E.inOutCubic(clamp((lt - tE) / 0.45));
    let Y = k < 0 ? slotY : lerp(k > 0 ? Yk(k - 1) : slotY, Yk(k), stepE((lt - ts[k]) / 0.3));
    Y = lerp(Y, Yf, ge);
    const accC = accOn(sc), subC = subOn(sc), out = tout(env), e0 = E.outExpo(clamp(lt / 0.3)), sa = (1 - ge) * out, x0 = W / 2 - bw / 2;
    ctx.save();
    if (sa > 0.01) { ctx.beginPath(); ctx.rect(-W, -H, W * 3, H + slotY); ctx.clip(); }
    if (Pm.paper && k >= 0) env.rect(x0 - pad, Y - pad * 0.5, bw + pad * 2, Math.min(slotY, Y + bh + pad * 0.5) - Y + pad * 0.5, sc.dim, 0.3 * out, false);
    let bb = null;
    for (let i = 0; i <= k; i++) {
      bb = UB(bb, J.mainDraw(env, { text: units[i], font: Pm.font, size, x: Pm.al === 'left' ? x0 : W / 2, y: Y + (i + 0.5) * lead * size, align: Pm.al === 'left' ? 'left' : 'center', track: 0.02,
        color: i === Pm.acc % n ? accC : sc.fg, mi: miAt(env, ts[i]) }));
    }
    ctx.restore();
    if (sa > 0.01) {
      const sw = (bw + pad * 4.4) * e0, sh = Math.max(5, size * 0.13), busy = k >= 0 && lt - ts[k] < 0.3;
      env.rrect(W / 2 - sw / 2, slotY, sw, sh, sh / 2, subC, sa, false);
      env.circle(W / 2 + sw / 2 - sh * 1.6, slotY + sh / 2, sh * 0.28, busy && (env.step % 2) ? sc.bg : accC, null, 0, sa * e0, false);
    }
    return bb;
  },
});

/* 14 kzLob — every word is lobbed from a corner along a spinning arc and lands in its place with a little bounce */
LAY('kzLob', {
  name: '放物線', en: 'Lob', tags: ['pop', 'graphic', 'emotional'], w: 1, ae: 'scatter', fits: n => n >= 2 && n <= 16, enterBias: EB,
  plan(rng, cut, st) { return { font: fnt(rng, st), from: rng.pick(['bl', 'br', 'alt']), spin: rng.pick([180, 270, 360]), trail: rng.chance(0.8), acc: rng.int(0, 5) }; },
  render(env) {
    const { W, H, sc } = env, c = env.cut, Pm = c.params, lt = env.lt, u = U(env), port = isPort(env);
    const units = wu(env, 5, 6), n = units.length;
    const ts = onsets(env, n, { frac: 0.48, gap: 0.42 });
    const F = flowUnits(units, Pm.font, W * 0.82, H * (port ? 0.5 : 0.46), { maxLines: isTall(env) ? 4 : 3, maxSize: H * (port ? 0.12 : 0.19), lead: 1.3 });
    const k = curIdx(ts, lt); if (k < 0) return null;
    const size = F.size, d = 0.42, cx = W / 2, cy = H * 0.47, accC = accOn(sc), subC = subOn(sc), out = tout(env);
    let bb = null;
    for (let i = 0; i <= k; i++) {
      const p = F.pos[i], sd = Pm.from === 'bl' ? -1 : Pm.from === 'br' ? 1 : (i % 2 ? 1 : -1);
      const Lx = W * (sd < 0 ? 0.05 : 0.95), Ly = H * 0.98, tx = cx + p.x, ty = cy + p.y, hop = Math.max(H * 0.2, (Ly - ty) * 0.55);
      const path = q => [lerp(Lx, tx, q), lerp(Ly, ty, q) - hop * 4 * q * (1 - q)];
      const tau = lt - ts[i], q = clamp(tau / d), [x, y] = path(q), t2 = tau - d;
      if (Pm.trail) for (let j = 1; j <= 11; j++) {
        const qq = j / 12; if (qq > q) break;
        const a = 0.6 * (1 - clamp((tau - qq * d) / 0.55)) * out; if (a < 0.02) continue;
        const [dx, dy] = path(qq); env.circle(dx, dy, Math.max(2, u * 0.0045), subC, null, 0, a, false);
      }
      if (tau < 0.3) env.circle(Lx, Ly, u * (0.015 + 0.06 * E.outExpo(tau / 0.3)), null, accC, Math.max(2, u * 0.004), (1 - tau / 0.3) * out, false);
      bb = UB(bb, J.mainDraw(env, { text: units[i], font: Pm.font, size: size * lerp(0.3, 1, E.outQuad(q)), x, y: y + (t2 > 0 ? size * 0.14 * pls(t2, 9, 21) : 0),
        rot: -sd * Pm.spin * (1 - E.outCubic(q)) + (t2 > 0 ? sd * 5 * pls(t2, 8, 17) : 0), color: i === Pm.acc % n ? accC : sc.fg, mi: miAt(env, ts[i]) }));
    }
    return bb;
  },
});

/* 15 kzInchworm — the line crawls into place like an inchworm: it bunches up into an arch, then stretches forward, again and again */
LAY('kzInchworm', {
  name: '尺取り歩き', en: 'Inchworm Crawl', tags: ['pop', 'calm', 'graphic'], w: 0.9, ae: 'wave', fits: n => n >= 3 && n <= 18,
  plan(rng, cut, st) { return { font: fnt(rng, st), cyc: rng.pick([2, 3, 3]), dir: rng.pick([1, 1, -1]), acc: rng.int(0, 5), track: rng.chance(0.6) }; },
  render(env) {
    const { W, H, sc } = env, c = env.cut, Pm = c.params, lt = env.lt, u = U(env), port = isPort(env);
    const lat = hasLatin(c.text); let units = wu(env, 5, 6);
    const gm = !lat && units.length < 3 && gcount(c.text) <= 8;       // short lyric: the glyphs are the segments
    if (gm) units = [...strip(c.text)];
    const n = units.length;
    const F = flowUnits(units, Pm.font, W * 0.74, H * (port ? 0.5 : 0.4), { maxLines: gm ? 1 : isTall(env) ? 4 : 2, sp: lat ? 0.55 : gm ? 0.26 : 0.4, maxSize: H * (port ? 0.11 : 0.17), lead: 1.7 });
    const size = F.size, T = clamp(c.dur * 0.5, 0.5, 1.5), C = Pm.cyc, cmin = 0.08, cx = W / 2, cy = H / 2, accC = accOn(sc), subC = subOn(sc), out = tout(env);
    const ph = clamp(lt / T) * C, cyc = Math.min(C - 1, Math.floor(ph)), fr = lt >= T ? 1 : ph - cyc;
    const cc = fr < 0.5 ? lerp(1, cmin, E.inOutSine(fr / 0.5)) : lerp(cmin, 1, E.inOutSine((fr - 0.5) / 0.5)), pf = fr < 0.5 ? 0 : E.inOutSine((fr - 0.5) / 0.5);
    const arch = (1 - cc) / (1 - cmin);
    let bb = null;
    F.pt.forEach(([a, b], li) => {
      const dir = (li % 2 ? -1 : 1) * Pm.dir, m = b - a, gaps = [];
      let S = 0; for (let i = a; i < b - 1; i++) { const g = F.pos[i + 1].x - F.pos[i + 1].w / 2 - F.pos[i].x - F.pos[i].w / 2; gaps.push(g); S += g * (1 - cmin); }
      if (m === 1) S = size * 0.6;
      const off = -dir * S * (C - cyc - pf) * (lt >= T ? 0 : 1), xs = [];
      if (dir > 0) { xs[b - 1] = F.pos[b - 1].x + off; for (let i = b - 2; i >= a; i--) xs[i] = xs[i + 1] - F.pos[i + 1].w / 2 - gaps[i - a] * cc - F.pos[i].w / 2; }
      else { xs[a] = F.pos[a].x + off; for (let i = a + 1; i < b; i++) xs[i] = xs[i - 1] + F.pos[i - 1].w / 2 + gaps[i - 1 - a] * cc + F.pos[i].w / 2; }
      const yl = cy + F.pos[a].y;
      if (Pm.track) { const e = E.outExpo(clamp(lt / 0.4)), y = yl + size * 0.64; env.line([[cx - F.w / 2 * e - size * 0.3, y], [cx + F.w / 2 * e + size * 0.3, y]], subC, Math.max(1.5, u * 0.003), 0.7 * out, false); }
      for (let i = a; i < b; i++) {
        const s = m > 1 ? (i - a) / (m - 1) : 0.5, lift = m > 1 ? Math.sin(Math.PI * (0.12 + 0.76 * s)) : Math.sin(Math.PI * fr);
        bb = UB(bb, J.mainDraw(env, { text: units[i], font: Pm.font, size, x: cx + xs[i], y: yl - size * 0.42 * arch * lift, rot: m > 1 ? -16 * arch * Math.cos(Math.PI * s) : 0,
          color: i === Pm.acc % n ? accC : sc.fg, mi: i }));
      }
    });
    return bb;
  },
});

/* ================================================================================================ DECOR */
const getBB = (env, bb) => J.centerBB(env, bb);
const dIO = (env, d = 0.35) => E.outCubic(clamp(env.lt / d)) * (1 - E.inCubic(env.pOut));
const dClock = new WeakMap();
function wordTimes(env, nMax = 6) {      // same word clock as the kinetic layouts
  const c = env.cut;
  let v = dClock.get(c);
  if (v) return v;
  let n = Math.max(1, Math.min(nMax, (c.words || []).length || 1));
  if (n < 2 && c.dur > 1.2) n = 2;
  const dur = c.dur, last = Math.max(0, Math.min(dur * 0.5, (n - 1) * 0.38));
  v = [];
  for (let i = 0; i < n; i++) v.push(n > 1 ? last * i / (n - 1) : 0);
  const beats = (env.plan && env.plan.beats) || [];
  if (beats.length && n > 1) {
    const pick = []; let prev = 0;
    for (const b of beats) {
      const r = b - c.start;
      if (r <= 0.12) continue;
      if (r > dur * 0.72) break;
      if (r - prev >= 0.2) { pick.push(r); prev = r; }
      if (pick.length >= n - 1) break;
    }
    if (pick.length >= n - 1 && pick[n - 2] <= Math.max(last * 1.35, dur * 0.55)) v = [0].concat(pick);
  }
  dClock.set(c, v);
  return v;
}
const isVert = bb => (bb.y1 - bb.y0) > (bb.x1 - bb.x0) * 1.3;
/* reading axis of the lyric box: a(t) = point at fraction t along the reading direction, on the chosen side (s = -1 before/above, +1 after/below), d px away */
function axis(env, bb, pref) {
  const v = isVert(bb), { W, H } = env, u = Math.min(W, H);
  const roomA = v ? W - bb.x1 : bb.y0, roomB = v ? bb.x0 : H - bb.y1;       // side A = above (horizontal) / right (vertical)
  let s = pref; if ((s < 0 ? roomA : roomB) < u * 0.13 && (s < 0 ? roomB : roomA) > (s < 0 ? roomA : roomB)) s = -s;
  const room = s < 0 ? roomA : roomB;
  const at = (t, d) => (v ? [s < 0 ? bb.x1 + d : bb.x0 - d, lerp(bb.y0, bb.y1, t)] : [lerp(bb.x0, bb.x1, t), s < 0 ? bb.y0 - d : bb.y1 + d]);
  const nrm = v ? [s < 0 ? 1 : -1, 0] : [0, s < 0 ? -1 : 1], dirv = v ? [0, 1] : [1, 0];
  return { v, s, at, nrm, dirv, len: v ? bb.y1 - bb.y0 : bb.x1 - bb.x0, room };
}

/* 1 kzImpactTicks — a fan of ticks kicks out from under each word as it lands */
DEC('kzImpactTicks', { name: '着地の火花', en: 'Impact Ticks', tags: ['pop', 'graphic'], w: 1, ae: 'sparks', layer: 'front',
  draw(env, bb0, D) {
    const bb = getBB(env, bb0), { sc } = env, u = U(env), o = dIO(env, 0.1); if (o <= 0.01) return;
    const ts = wordTimes(env), n = ts.length, A = axis(env, bb, D.low ? -1 : 1), col = accOn(sc), N = 5 + (D.n | 0), lw = Math.max(2, u * 0.0065);
    const base = Math.atan2(A.nrm[1], A.nrm[0]) / DEG;
    for (let j = 0; j < n; j++) {
      const tau = env.lt - ts[j] - 0.04; if (tau < 0 || tau > 0.5) continue;
      const q = tau / 0.5, e = E.outExpo(q), [x, y] = A.at((j + 0.5) / n, u * 0.02);
      for (let m = 0; m < N; m++) {
        const a = (base + lerp(-72, 72, (m + 0.5) / N) + J.rs(D.seed, j, m) * 7) * DEG, r0 = u * (0.016 + (0.065 + 0.04 * J.r(D.seed, m, j, 2)) * e), len = u * 0.06 * (1 - q) * (0.6 + 0.6 * J.r(D.seed, m, j, 3));
        env.line([[x + Math.cos(a) * r0, y + Math.sin(a) * r0], [x + Math.cos(a) * (r0 + len), y + Math.sin(a) * (r0 + len)]], col, lw, (1 - q * q) * o, false);
      }
      const hw = u * 0.07 * e;
      env.line([[x - A.dirv[0] * hw, y - A.dirv[1] * hw], [x + A.dirv[0] * hw, y + A.dirv[1] * hw]], col, lw, (1 - q) * o, false);
    }
  } });

/* 2 kzBounceDot — a ball hops along the lyric, landing on each word on its beat and leaving a mark */
DEC('kzBounceDot', { name: '読み玉', en: 'Bouncing Ball', tags: ['pop', 'calm', 'emotional'], w: 1.1, ae: 'dots', layer: 'front',
  draw(env, bb0, D) {
    const bb = getBB(env, bb0), { sc, ctx } = env, u = U(env), o = dIO(env, 0.15); if (o <= 0.01) return;
    const ts = wordTimes(env), n = ts.length, A = axis(env, bb, D.low ? 1 : -1), col = accOn(sc), sub = subOn(sc), lt = env.lt;
    const r = u * 0.019, gap = u * 0.024, hopH = Math.min(u * 0.075, Math.max(u * 0.02, A.room - gap - r * 3));
    let k = 0; for (let j = 0; j < n; j++) if (lt >= ts[j] - Math.min(0.3, j ? (ts[j] - ts[j - 1]) * 0.8 : 0.3)) k = j;
    const hd = k ? Math.min(0.3, (ts[k] - ts[k - 1]) * 0.8) : 0.22, q = clamp((lt - (ts[k] - hd)) / hd);
    const t0 = k ? (k - 0.5) / n : 0.5 / n, t1 = (k + 0.5) / n;
    let h = k ? hopH * 4 * q * (1 - q) : hopH * 2.4 * (1 - q) * (1 - q);
    const tl = lt - ts[k], last = k === n - 1;
    if (q >= 1 && last) h = hopH * 0.45 * Math.abs(Math.sin(tl * 6.5)) * Math.exp(-tl * 1.3);
    const sq = q >= 1 ? 0.35 * Math.exp(-tl * 14) : 0;
    const [x, y] = A.at(lerp(t0, t1, k ? q : 1), gap + r + h);
    for (let j = 0; j <= k; j++) {
      const tj = lt - ts[j]; if (tj < 0) continue;
      const [mx, my] = A.at((j + 0.5) / n, gap * 0.45), hw = u * 0.016 * E.outBack(clamp(tj / 0.2), 2.5);
      env.line([[mx - A.dirv[0] * hw, my - A.dirv[1] * hw], [mx + A.dirv[0] * hw, my + A.dirv[1] * hw]], j === k ? col : sub, Math.max(2, u * 0.004), o * (j === k ? 1 : 0.6), false);
    }
    ctx.save(); ctx.translate(x - A.nrm[0] * r * sq, y - A.nrm[1] * r * sq);
    ctx.scale(A.v ? 1 - sq : 1 + sq * 0.7, A.v ? 1 + sq * 0.7 : 1 - sq);
    env.circle(0, 0, r, col, null, 0, o, false);
    ctx.restore();
  } });

/* 3 kzUnderRun — an underline shoots forward one word at a time, arrow first, overshooting each stop */
DEC('kzUnderRun', { name: '走る下線', en: 'Running Underline', tags: ['pop', 'graphic', 'editorial'], w: 1, ae: 'arrows', layer: 'front',
  draw(env, bb0, D) {
    const bb = getBB(env, bb0), { sc } = env, u = U(env), o = dIO(env, 0.25); if (o <= 0.01) return;
    const ts = wordTimes(env), n = ts.length, A = axis(env, bb, D.low ? -1 : 1), col = accOn(sc), sub = subOn(sc), lt = env.lt;
    const k = Math.max(0, curIdx(ts, lt)), f = lerp(k / n, (k + 1) / n, spr(lt - ts[k], 9, 15)), d = u * 0.035, lw = Math.max(3, u * 0.007);
    const p0 = A.at(0, d), pe = A.at(1, d), p1 = A.at(clamp(f, 0, 1.03), d), ah = u * 0.018;
    env.line([p0, pe], sub, Math.max(1.5, u * 0.002), 0.45 * o, false);
    for (let j = 1; j < n; j++) { const [x, y] = A.at(j / n, d); env.line([[x - A.nrm[0] * ah * 0.4, y - A.nrm[1] * ah * 0.4], [x + A.nrm[0] * ah * 0.4, y + A.nrm[1] * ah * 0.4]], sub, Math.max(1.5, u * 0.002), 0.6 * o, false); }
    env.line([p0, p1], col, lw, o, false);
    const tip = [p1[0] + A.dirv[0] * ah * 1.3, p1[1] + A.dirv[1] * ah * 1.3];
    env.poly([tip, [p1[0] + A.nrm[0] * ah * 0.8, p1[1] + A.nrm[1] * ah * 0.8], [p1[0] - A.nrm[0] * ah * 0.8, p1[1] - A.nrm[1] * ah * 0.8]], col, o, false);
  } });

/* 4 kzWobbleArcs — cartoon shake marks: nested arcs at both ends of the lyric jump outwards on every word */
DEC('kzWobbleArcs', { name: '揺れマーク', en: 'Wobble Marks', tags: ['pop', 'graphic', 'emotional'], w: 0.9, ae: 'rings', layer: 'front',
  draw(env, bb0, D) {
    const bb = getBB(env, bb0), { sc, W, H } = env, u = U(env), o = dIO(env, 0.2); if (o <= 0.01) return;
    const ts = wordTimes(env), k = Math.max(0, curIdx(ts, env.lt)), tau = env.lt - ts[k], col = D.accent ? accOn(sc) : subOn(sc);
    const v = isVert(bb), cx = (bb.x0 + bb.x1) / 2, cy = (bb.y0 + bb.y1) / 2, span = v ? bb.x1 - bb.x0 : bb.y1 - bb.y0, R = Math.max(u * 0.13, span * 0.85), N = 2 + Math.min(2, D.n | 0);
    for (let m = 0; m < N; m++) {
      const kick = Math.exp(-Math.max(0, tau - m * 0.04) * 6), d = u * (0.034 + 0.036 * m) + u * 0.04 * kick * (tau >= m * 0.04 ? 1 : 0);
      const half = (30 - m * 5) * (0.75 + 0.25 * kick), a = (0.4 + 0.6 * kick) * o * (1 - m * 0.18), lw = Math.max(2.5, u * (0.009 - m * 0.002));
      const wob = J.rs(D.seed, env.step, m) * 2.5 * kick;
      for (const s of [-1, 1]) {
        if (v) { const y = s < 0 ? bb.y0 - d : bb.y1 + d; if (y < H * 0.02 || y > H * 0.98) continue; env.arc(cx, y - s * R, R, 90 * s - half + wob, 90 * s + half + wob, col, lw, a, false); }
        else { const x = s < 0 ? bb.x0 - d : bb.x1 + d; if (x < W * 0.02 || x > W * 0.98) continue; env.arc(x - s * R, cy, R, (s < 0 ? 180 : 0) - half + wob, (s < 0 ? 180 : 0) + half + wob, col, lw, a, false); }
      }
    }
  } });

/* 5 kzMarchFrame — a dashed frame whose dashes march round the lyric and lurch forward with every word */
DEC('kzMarchFrame', { name: '行進する破線', en: 'Marching Frame', tags: ['graphic', 'editorial', 'glitch', 'pop'], w: 0.9, ae: 'brackets', layer: 'front',
  draw(env, bb0, D) {
    if (env.pass !== 'main') return;
    const bb = getBB(env, bb0), { sc, ctx, W, H } = env, u = U(env), o = dIO(env, 0.3); if (o <= 0.01) return;
    const ts = wordTimes(env), pad = u * 0.045, e = E.outExpo(clamp(env.lt / 0.4));
    const x0 = Math.max(W * 0.025, bb.x0 - pad * (2 - e)), y0 = Math.max(H * 0.025, bb.y0 - pad * (2 - e)), x1 = Math.min(W * 0.975, bb.x1 + pad * (2 - e)), y1 = Math.min(H * 0.975, bb.y1 + pad * (2 - e));
    const dash = u * 0.022, per = dash * 2;
    let ph = env.ltb * u * 0.02; for (const t of ts) if (env.ltb > t) ph += per * 2.5 * (1 - Math.exp(-(env.ltb - t) * 5));
    ph *= D.right ? -1 : 1;
    const r = Math.min(u * 0.02, (x1 - x0) / 2, (y1 - y0) / 2), path = () => { ctx.beginPath(); ctx.moveTo(x0 + r, y0); ctx.arcTo(x1, y0, x1, y1, r); ctx.arcTo(x1, y1, x0, y1, r); ctx.arcTo(x0, y1, x0, y0, r); ctx.arcTo(x0, y0, x1, y0, r); ctx.closePath(); };
    ctx.save();
    ctx.lineCap = 'butt'; ctx.globalAlpha = 0.8 * o; ctx.strokeStyle = subOn(sc); ctx.lineWidth = Math.max(2, u * 0.004);
    ctx.setLineDash([dash, dash]); ctx.lineDashOffset = -ph; path(); ctx.stroke();
    const L = 2 * (x1 - x0 + y1 - y0);                                         // one long accent dash runs with them
    ctx.globalAlpha = o; ctx.strokeStyle = accOn(sc); ctx.lineWidth = Math.max(3, u * 0.007);
    ctx.setLineDash([dash * 3, Math.max(1, L - dash * 3)]); ctx.lineDashOffset = -ph * 2; path(); ctx.stroke();
    ctx.restore();
  } });

/* corner placement that keeps clear of the lyric box: returns the centre of a w×h spot or null */
function cornerSpot(env, bb, w, h, D) {
  const { W, H } = env, mx = W * 0.05, my = H * 0.05;
  const cand = [[D.right, D.low], [!D.right, D.low], [D.right, !D.low], [!D.right, !D.low]];
  for (const [r, l] of cand) {
    const x = r ? W - mx - w / 2 : mx + w / 2, y = l ? H - my - h / 2 : my + h / 2;
    if (x + w / 2 < bb.x0 || x - w / 2 > bb.x1 || y + h / 2 < bb.y0 || y - h / 2 > bb.y1) return [x, y];
  }
  return null;
}

/* 6 kzMetronome — a small metronome in a corner; its arm swings across once for every word */
DEC('kzMetronome', { name: '拍の針', en: 'Metronome Arm', tags: ['editorial', 'graphic', 'calm', 'pop'], w: 0.8, ae: 'shapes', layer: 'front', subtle: true,
  draw(env, bb0, D) {
    const bb = getBB(env, bb0), { sc } = env, u = U(env), o = dIO(env, 0.3); if (o <= 0.01) return;
    const Lr = u * 0.18, sp = cornerSpot(env, bb, Lr * 1.5, Lr * 1.2, D); if (!sp) return;
    const ts = wordTimes(env), k = Math.max(0, curIdx(ts, env.lt)), A0 = 30, sub = subOn(sc), col = accOn(sc), lw = Math.max(2.5, u * 0.006);
    const tg = j => (j % 2 ? 1 : -1) * A0, tau = env.lt - ts[k];
    const ang = k === 0 ? tg(0) * E.outBack(clamp(env.lt / 0.3), 1.6) : lerp(tg(k - 1), tg(k), E.inOutCubic(clamp(tau / 0.2))) + (tau > 0.2 ? tg(k) * 0.12 * pls(tau - 0.2, 7, 22) : 0);
    const px = sp[0], py = sp[1] + Lr * 0.5, e = E.outExpo(clamp(env.lt / 0.35));
    env.arc(px, py, Lr * e, -90 - A0 - 4, -90 + A0 + 4, sub, Math.max(1.5, u * 0.0025), 0.7 * o, false);
    for (let m = -2; m <= 2; m++) { const a = (-90 + m * A0 / 2) * DEG, r0 = Lr * (m % 2 ? 0.95 : 0.9) * e; env.line([[px + Math.cos(a) * r0, py + Math.sin(a) * r0], [px + Math.cos(a) * Lr * e, py + Math.sin(a) * Lr * e]], sub, Math.max(1.5, u * 0.0025), 0.7 * o, false); }
    const a = (-90 + ang) * DEG, ex = px + Math.cos(a) * Lr * 0.9 * e, ey = py + Math.sin(a) * Lr * 0.9 * e;
    env.line([[px, py], [ex, ey]], sc.fg, lw, o, false);
    env.circle(lerp(px, ex, 0.62), lerp(py, ey, 0.62), u * 0.018 * e, col, null, 0, o, false);
    env.circle(px, py, u * 0.007, sc.fg, null, 0, o, false);
    env.line([[px - Lr * 0.3 * e, py + u * 0.012], [px + Lr * 0.3 * e, py + u * 0.012]], sub, lw, 0.8 * o, false);
  } });

/* 7 kzSpringCoils — coil springs brace the lyric against the frame edges; they stretch with it and jiggle on every word */
DEC('kzSpringCoils', { name: 'ばね支え', en: 'Spring Coils', tags: ['pop', 'graphic', 'calm'], w: 0.9, ae: 'waveform', layer: 'front',
  draw(env, bb0, D) {
    const bb = getBB(env, bb0), { sc, W, H } = env, u = U(env), o = dIO(env, 0.3); if (o <= 0.01) return;
    const ts = wordTimes(env), k = Math.max(0, curIdx(ts, env.lt)), jig = pls(env.lt - ts[k], 6, 26), sub = subOn(sc), col = accOn(sc);
    const horiz = isVert(bb);
    const gap = u * 0.03, lw = Math.max(2, u * 0.004), N = 7 + 2 * Math.min(2, D.n | 0), amp = u * 0.022, e = E.outExpo(clamp(env.lt / 0.4));
    const c = horiz ? clamp((bb.y0 + bb.y1) / 2, H * 0.08, H * 0.92) : clamp((bb.x0 + bb.x1) / 2, W * 0.08, W * 0.92);
    for (const s of [-1, 1]) {
      const wall = horiz ? (s < 0 ? W * 0.03 : W * 0.97) : (s < 0 ? H * 0.03 : H * 0.97);
      const inner0 = (horiz ? (s < 0 ? bb.x0 : bb.x1) : (s < 0 ? bb.y0 : bb.y1)) + s * gap, inner = lerp(wall, inner0, e) + s * u * 0.018 * jig * (s < 0 ? 1 : -1);
      if ((inner - wall) * -s < u * 0.04) continue;
      const pts = [], L = inner - wall, pt = (a, b) => (horiz ? [a, b] : [b, a]);
      pts.push(pt(wall, c)); pts.push(pt(wall + L * 0.06, c));
      for (let m = 0; m < N; m++) pts.push(pt(wall + L * (0.08 + 0.84 * (m + 0.5) / N), c + (m % 2 ? 1 : -1) * amp * clamp(u * 0.3 / Math.abs(L) + 0.5, 0.7, 1.5)));
      pts.push(pt(wall + L * 0.94, c)); pts.push(pt(inner, c));
      env.line(pts, sub, lw, 0.9 * o, false);
      const ph = u * 0.035;
      env.line([pt(inner, c - ph), pt(inner, c + ph)], col, lw * 1.6, o, false);
      env.line([pt(wall, c - ph * 1.3), pt(wall, c + ph * 1.3)], sub, lw * 1.6, 0.9 * o, false);
    }
  } });

/* 8 kzChevronRun — a lane of chevrons marches in the reading direction; a bright patch keeps pace with the current word */
DEC('kzChevronRun', { name: '流れる山形', en: 'Chevron Lane', tags: ['graphic', 'pop', 'glitch'], w: 0.9, ae: 'arrows', layer: 'front',
  draw(env, bb0, D) {
    const bb = getBB(env, bb0), { sc } = env, u = U(env), o = dIO(env, 0.3); if (o <= 0.01) return;
    const ts = wordTimes(env), n = ts.length, A = axis(env, bb, D.low ? -1 : 1), lt = env.ltb, k = Math.max(0, curIdx(ts, lt));
    const g = u * 0.036, M = Math.max(3, Math.min(40, Math.floor(A.len / g))), sz = u * 0.015, lw = Math.max(2, u * 0.005), d = u * 0.05;
    let ph = lt * 0.55; for (const t of ts) if (lt > t) ph += 1.2 * (1 - Math.exp(-(lt - t) * 6));
    const head = lerp(k / n, (k + 1) / n, 0.5) + (k ? -(1 / n) * sprg(lt - ts[k], 8, 12) : 0), col = accOn(sc), sub = subOn(sc);
    for (let m = 0; m < M; m++) {
      const t = ((m + (ph % 1)) / M), edge = clamp(Math.min(t, 1 - t) * 7), hot = Math.exp(-Math.pow((t - head) * n * 1.3, 2));
      const [x, y] = A.at(t, d), a = (0.3 + 0.7 * hot) * edge * o; if (a < 0.02) continue;
      const tip = [x + A.dirv[0] * sz * 0.6, y + A.dirv[1] * sz * 0.6], b0 = [x - A.dirv[0] * sz * 0.6, y - A.dirv[1] * sz * 0.6];
      env.line([[b0[0] + A.nrm[0] * sz, b0[1] + A.nrm[1] * sz], tip, [b0[0] - A.nrm[0] * sz, b0[1] - A.nrm[1] * sz]], hot > 0.5 ? col : sub, lw, a, false);
    }
  } });

/* 9 kzWhooshCurls — looping wind curls whip off the lyric each time a word arrives */
DEC('kzWhooshCurls', { name: '巻き風', en: 'Whoosh Curls', tags: ['pop', 'emotional', 'calm', 'graphic'], w: 0.9, ae: 'slash', layer: 'front',
  draw(env, bb0, D) {
    const bb = getBB(env, bb0), { sc } = env, u = U(env), o = dIO(env, 0.1); if (o <= 0.01) return;
    const ts = wordTimes(env), n = ts.length, col = D.accent ? accOn(sc) : subOn(sc), lw = Math.max(2.5, u * 0.006), lt = env.lt, life = 0.8;
    const ev = ts.map((t, j) => [t, j]);
    for (let m = 1, t = ts[n - 1] + 0.9; m <= 6 && t < env.cut.dur - 0.4; m++, t += 0.9) ev.push([t, n + m]);     // keep the air moving after the last word
    for (const [t0, j] of ev) {
      const tau = lt - t0 - 0.03; if (tau < 0 || tau > life) continue;
      const q = tau / life, side = (j + (D.low ? 1 : 0)) % 2 ? 1 : -1, A = axis(env, bb, side), late = j >= n;
      const f = late ? J.r(D.seed, j, 1) : (j + 0.5) / n, [ox, oy] = A.at(f, u * 0.035), sc0 = u * (0.032 + 0.012 * J.r(D.seed, j, 2)) * (late ? 0.8 : 1), bk = D.right ? 1 : -1;
      // prolate cycloid = a streak with one loop in it; it runs backwards against the reading direction
      const pts = [];
      for (let s = 0; s <= 40; s++) { const th = lerp(-1.4, 7.7, s / 40), a = th - 1.9 * Math.sin(th), b = 1 - 1.9 * Math.cos(th) + 0.9;
        pts.push([ox + (A.dirv[0] * a * bk + A.nrm[0] * b * 0.55) * sc0 + A.dirv[0] * bk * sc0 * 2 * q, oy + (A.dirv[1] * a * bk + A.nrm[1] * b * 0.55) * sc0 + A.dirv[1] * bk * sc0 * 2 * q]); }
      const hd = Math.round(40 * E.outCubic(clamp(q * 1.7))), tl = Math.round(40 * E.inCubic(clamp(q * 1.25 - 0.25)));
      if (hd - tl >= 1) env.line(pts.slice(tl, hd + 1), col, lw, (late ? 0.55 : 0.9) * o, false);
    }
  } });

/* 10 kzPushRods — piston rods come in from the frame edges and tap the lyric, alternating sides with the words */
DEC('kzPushRods', { name: '押しピストン', en: 'Push Rods', tags: ['graphic', 'pop', 'glitch'], w: 0.9, ae: 'bars', layer: 'front',
  draw(env, bb0, D) {
    const bb = getBB(env, bb0), { sc, W, H } = env, u = U(env), o = dIO(env, 0.3); if (o <= 0.01) return;
    const ts = wordTimes(env), lt = env.lt, sub = subOn(sc), col = accOn(sc), e = E.outExpo(clamp(lt / 0.4));
    const horiz = isVert(bb) !== !!(D.v % 2 && Math.min(bb.x0, W - bb.x1) > u * 0.16 && Math.min(bb.y0, H - bb.y1) > u * 0.16);
    const th = Math.max(4, u * 0.012), rest = u * 0.06, span = horiz ? bb.y1 - bb.y0 : bb.x1 - bb.x0, hp = clamp(span * 0.3, u * 0.03, u * 0.09);
    const c = horiz ? clamp((bb.y0 + bb.y1) / 2, H * 0.08, H * 0.92) : clamp((bb.x0 + bb.x1) / 2, W * 0.08, W * 0.92);
    for (const s of [-1, 1]) {
      let push = 0;
      ts.forEach((t, j) => { if (j && (j % 2 ? 1 : -1) !== s) return; const tau = lt - t + 0.05; if (tau > 0) push = Math.max(push, tau < 0.05 ? tau / 0.05 : Math.exp(-(tau - 0.05) * 6)); });
      const edge = horiz ? (s < 0 ? 0 : W) : (s < 0 ? 0 : H), tgt = (horiz ? (s < 0 ? bb.x0 : bb.x1) : (s < 0 ? bb.y0 : bb.y1)) + s * (u * 0.014 + rest * (1 - push));
      if ((tgt - edge) * -s < u * 0.03) continue;
      const tip = lerp(edge, tgt, e), a = Math.min(edge, tip), b = Math.abs(tip - edge);
      if (horiz) { env.rect(a, c - th / 2, b, th, sub, 0.9 * o, false); env.rect(tip - (s < 0 ? th : 0), c - hp, th, hp * 2, col, o, false); }
      else { env.rect(c - th / 2, a, th, b, sub, 0.9 * o, false); env.rect(c - hp, tip - (s < 0 ? th : 0), hp * 2, th, col, o, false); }
    }
  } });

/* ================================================================================================ BACKGROUNDS */
const Ac = (c, a) => J.rgba(c, Math.round(clamp(a) * 1000) / 1000);
const wrap = (v, m) => ((v % m) + m) % m;
const bgRun = new WeakMap();
const bgT = env => {                     // time since this background started (cuts sharing bg + seed count as one run)
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
const fadeIn = (env, d = 0.6) => E.outCubic(clamp(bgT(env) / d));
const BG = (k, d) => J.register('bg', k, Object.assign({}, d, { draw(env, Q) { const ctx = env.ctx; ctx.save(); try { d.draw(env, Q || {}, ctx); } finally { ctx.restore(); } } }), P);
const bs = rng => rng.int(1, 1e9);

/* 1 kzKickStreaks — streaks in the travel direction that surge at every cut and coast in between */
BG('kzKickStreaks', { name: '加速する筋', en: 'Kick Streaks', tags: ['pop', 'graphic', 'glitch'], w: 1, subtle: true,
  plan: rng => ({ seed: bs(rng), ang: rng.pick([0, 0, 180, -18, 162, 90]), n: rng.int(12, 18), k: rng.range(0.07, 0.1) }),
  draw(env, Q, ctx) {
    const { W, H, sc } = env, s = Q.seed || 1, u = Math.min(W, H), c = env.cut, n = Q.n || 14, k = Q.k || 0.06;
    const lt = c ? Math.max(0, env.t - c.start) : 0, idx = c ? (c.index | 0) : 0;
    const trav = env.t * 0.05 + 0.3 * (idx + 1 - Math.exp(-lt * 5)), D = Math.hypot(W, H);
    ctx.globalAlpha = fadeIn(env);
    ctx.translate(W / 2, H / 2); ctx.rotate((Q.ang || 0) * DEG);
    const speed = Math.exp(-lt * 5);                                            // streaks stretch while the kick lasts
    for (let i = 0; i < n; i++) {
      const dep = 0.5 + J.r(s, i, 1), len = D * (0.08 + 0.2 * J.r(s, i, 2)) * (1 + 0.8 * speed), th = Math.max(2, u * (0.004 + 0.02 * J.r(s, i, 3) * J.r(s, i, 6)));
      const x = wrap(J.r(s, i, 4) * (D + len) + trav * dep * D, D + len) - len - D / 2, y = (J.r(s, i, 5) - 0.5) * D;
      ctx.fillStyle = i % 6 === 2 ? Ac(sc.accent, k * 1.3) : Ac(sc.fg, k * (0.6 + 0.7 * J.r(s, i, 7)));
      ctx.fillRect(x, y - th / 2, len, th);
    }
  } });

/* 2 kzRollSquare — a huge square tumbles corner over corner along the floor */
BG('kzRollSquare', { name: '転がる四角', en: 'Rolling Square', tags: ['graphic', 'pop', 'calm'], w: 1,
  plan: rng => ({ seed: bs(rng), dir: rng.pick([1, -1]), per: rng.range(2.6, 3.6), s: rng.range(0.5, 0.66), k: rng.range(0.04, 0.055), two: rng.chance(0.6) }),
  draw(env, Q, ctx) {
    const { W, H, sc } = env, u = Math.min(W, H), k = Q.k || 0.045, dir = Q.dir || 1, fl = H * 0.9;
    ctx.globalAlpha = fadeIn(env, 0.8);
    ctx.fillStyle = Ac(sc.fg, k * 1.6); ctx.fillRect(0, fl, W, Math.max(2, u * 0.003));
    const roll = (S, per, d, ph, fillA, accent) => {
      const tt = env.t / per + ph, st = Math.floor(tt), fr = clamp((tt - st) / 0.82), a = 90 * Math.pow(fr, 2.3);
      const span = Math.ceil((W + S * 2) / S) * S, px = wrap((st + 2 + Math.floor(ph * 2)) * S, span) - S;
      ctx.save(); ctx.translate(d > 0 ? px : W - px, fl); ctx.rotate(a * d * DEG);
      ctx.fillStyle = Ac(accent ? sc.accent : sc.fg, fillA); ctx.strokeStyle = Ac(sc.fg, fillA * 2.2); ctx.lineWidth = Math.max(2, u * 0.003);
      const x0 = d > 0 ? -S : 0;
      ctx.fillRect(x0, -S, S, S); ctx.strokeRect(x0, -S, S, S);
      ctx.strokeRect(x0 + S * 0.2, -S * 0.8, S * 0.6, S * 0.6);
      ctx.restore();
    };
    if (Q.two) roll(u * 0.26, (Q.per || 3) * 0.55, -dir, ((Q.seed || 1) % 97) / 97, k * 0.9, true);
    roll(u * (Q.s || 0.58), Q.per || 3, dir, ((Q.seed || 1) % 53) / 53, k, false);
  } });

/* 3 kzBounceDiscs — a few big soft discs bounce slowly across the floor, squashing as they land */
BG('kzBounceDiscs', { name: '弾む円', en: 'Bouncing Discs', tags: ['pop', 'calm', 'emotional'], w: 1, subtle: true,
  plan: rng => ({ seed: bs(rng), n: rng.int(3, 4), k: rng.range(0.045, 0.06), dir: rng.pick([1, -1]) }),
  draw(env, Q, ctx) {
    const { W, H, sc } = env, s = Q.seed || 1, u = Math.min(W, H), k = Q.k || 0.05, n = Q.n || 3, fl = H * 0.97, t = env.t;
    ctx.globalAlpha = fadeIn(env, 0.8);
    for (let i = 0; i < n; i++) {
      const r = u * (0.1 + 0.16 * J.r(s, i, 1)), Tb = 1.7 + 1.3 * J.r(s, i, 2) + r / u * 2, f = wrap(t / Tb + J.r(s, i, 3), 1), hgt = H * (0.35 + 0.4 * J.r(s, i, 4));
      const vx = (0.03 + 0.03 * J.r(s, i, 5)) * (Q.dir || 1) * (i % 2 ? 1 : -0.7), x = wrap(J.r(s, i, 6) * (W + r * 2) + t * vx * W, W + r * 2) - r;
      const h = hgt * 4 * f * (1 - f), near = Math.exp(-Math.min(f, 1 - f) * Tb * 14), sq = 0.16 * near;
      ctx.fillStyle = Ac(sc.fg, k * 0.7 * (1 - h / hgt * 0.8));
      ctx.beginPath(); ctx.ellipse(x, fl, r * (1.1 - 0.5 * h / hgt), r * 0.07, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = i === 1 ? Ac(sc.accent, k * 1.1) : Ac(sc.fg, k);
      ctx.beginPath(); ctx.ellipse(x, fl - r * (1 - sq) - h, r * (1 + sq * 0.7), r * (1 - sq), 0, 0, TAU); ctx.fill();
    }
  } });

/* 4 kzRockHorizon — the lower half of the frame is a plane that rocks like a see-saw, with a disc rolling to the low side */
BG('kzRockHorizon', { name: '揺れる地平', en: 'Rocking Horizon', tags: ['calm', 'emotional', 'graphic', 'editorial'], w: 1, subtle: true,
  plan: rng => ({ seed: bs(rng), amp: rng.range(3.5, 6.5), per: rng.range(5, 8), y: rng.pick([0.64, 0.7, 0.74]), k: rng.range(0.045, 0.06), ball: rng.chance(0.75) }),
  draw(env, Q, ctx) {
    const { W, H, sc } = env, u = Math.min(W, H), k = Q.k || 0.05, w = TAU / (Q.per || 6), ph = ((Q.seed || 1) % 100) / 100 * TAU, t = env.t;
    const a = (Q.amp || 5) * Math.sin(t * w + ph) * DEG, D = Math.hypot(W, H);
    ctx.globalAlpha = fadeIn(env, 0.8);
    ctx.translate(W / 2, H * (Q.y || 0.66)); ctx.rotate(a);
    ctx.fillStyle = Ac(sc.fg, k); ctx.fillRect(-D, 0, D * 2, D);
    ctx.fillStyle = Ac(sc.fg, k * 2.2); ctx.fillRect(-D, 0, D * 2, Math.max(2, u * 0.003));
    ctx.fillStyle = Ac(sc.fg, k * 1.2); ctx.fillRect(-D, u * 0.03, D * 2, Math.max(1.5, u * 0.0015));
    if (Q.ball !== false) {
      const r = u * 0.055, sx = -W * 0.36 * Math.cos(t * w + ph);
      ctx.fillStyle = Ac(sc.accent, k * 1.5); ctx.beginPath(); ctx.arc(sx, -r, r, 0, TAU); ctx.fill();
      ctx.strokeStyle = Ac(sc.bg, 0.5); ctx.lineWidth = Math.max(2, u * 0.003); ctx.beginPath(); const ra = sx / r; ctx.moveTo(sx, -r); ctx.lineTo(sx + Math.cos(ra) * r, -r + Math.sin(ra) * r); ctx.stroke();
    }
    ctx.fillStyle = Ac(sc.fg, k * 1.6); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-u * 0.05, u * 0.085); ctx.lineTo(u * 0.05, u * 0.085); ctx.closePath(); ctx.fill();
  } });

/* 5 kzBigGears — huge meshing gears turn slowly at the corners */
const gearPath = (ctx, cx, cy, R, n, rot) => {
  const m = R * Math.PI / n * 0.55, st = TAU / n;
  for (let i = 0; i < n; i++) {
    const a = rot + i * st;
    [[a - st * 0.18, R + m], [a + st * 0.18, R + m], [a + st * 0.32, R - m], [a + st * 0.68, R - m]].forEach(([q, r], j) => { const x = cx + Math.cos(q) * r, y = cy + Math.sin(q) * r; if (i || j) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
  }
  ctx.closePath();
};
BG('kzBigGears', { name: '噛み合う歯車', en: 'Meshing Gears', tags: ['graphic', 'editorial', 'pop', 'glitch'], w: 0.9,
  plan: rng => ({ seed: bs(rng), flip: rng.chance(0.5), spd: rng.range(3, 6) * rng.pick([1, -1]), k: rng.range(0.035, 0.05), nA: rng.pick([16, 18, 22]), ang: rng.range(-50, -20) }),
  draw(env, Q, ctx) {
    const { W, H, sc } = env, u = Math.min(W, H), k = Q.k || 0.04, nA = Q.nA || 18, nB = Math.round(nA * 0.6), nC = Math.round(nA * 0.42);
    ctx.globalAlpha = fadeIn(env, 0.8);
    if (Q.flip) { ctx.translate(W, 0); ctx.scale(-1, 1); }
    const RA = u * 0.5, RB = RA * nB / nA, RC = RA * nC / nA, ax = W * 0.1, ay = H * 0.9, thA = env.t * (Q.spd || 4) * DEG;
    const gear = (x, y, R, n, th, fa) => {
      ctx.fillStyle = Ac(sc.fg, fa); ctx.strokeStyle = Ac(sc.fg, fa * 2.2); ctx.lineWidth = Math.max(2, u * 0.003);
      ctx.beginPath(); gearPath(ctx, x, y, R, n, th); ctx.moveTo(x + R * 0.3, y); ctx.arc(x, y, R * 0.3, 0, TAU, true); ctx.fill('evenodd'); ctx.stroke();
      ctx.beginPath(); ctx.arc(x, y, R * 0.72, 0, TAU); ctx.stroke();
      ctx.beginPath(); for (let i = 0; i < 4; i++) { const a = th + i * TAU / 4; ctx.moveTo(x + Math.cos(a) * R * 0.3, y + Math.sin(a) * R * 0.3); ctx.lineTo(x + Math.cos(a) * R * 0.72, y + Math.sin(a) * R * 0.72); } ctx.stroke();
    };
    const mesh = (x, y, R, n, th, R2, n2, phi) => [x + Math.cos(phi) * (R + R2), y + Math.sin(phi) * (R + R2), phi + Math.PI + Math.PI / n2 - (th - phi) * n / n2];
    gear(ax, ay, RA, nA, thA, k);
    const phi = (Q.ang || -35) * DEG, [bx, by, thB] = mesh(ax, ay, RA, nA, thA, RB, nB, phi);
    gear(bx, by, RB, nB, thB, k * 1.15);
    const [cx2, cy2, thC] = mesh(bx, by, RB, nB, thB, RC, nC, phi - 1.15);
    gear(cx2, cy2, RC, nC, thC, k * 0.9);
  } });

/* 6 kzSqueezeLines — a field of parallel lines carries a compression wave: they bunch up and spread out as it passes */
BG('kzSqueezeLines', { name: '疎密の波', en: 'Compression Wave', tags: ['calm', 'graphic', 'editorial', 'glitch'], w: 1, subtle: true,
  plan: rng => ({ seed: bs(rng), vert: rng.chance(0.7), n: rng.int(30, 40), per: rng.range(4.5, 7) * rng.pick([1, -1]), lam: rng.range(0.55, 0.85), k: rng.range(0.1, 0.14) }),
  draw(env, Q, ctx) {
    const { W, H, sc } = env, u = Math.min(W, H), vert = Q.vert !== false, L = vert ? W : H, n = Q.n || 36, k = Q.k || 0.12;
    const lam = L * (Q.lam || 0.7), amp = lam / TAU * 0.78, lw = Math.max(2, u * 0.0035), t = env.t / (Q.per || 5);
    ctx.globalAlpha = fadeIn(env);
    for (let i = -4; i < n + 4; i++) {
      const x0 = (i + 0.5) / n * L, x = x0 + amp * Math.sin(TAU * (x0 / lam - t));
      const dens = 1 - 0.78 * Math.cos(TAU * (x0 / lam - t));                 // local spacing: thin where bunched
      ctx.fillStyle = i % 9 === 4 ? Ac(sc.accent, k * 1.3) : Ac(sc.fg, k * (0.55 + 0.25 * dens));
      if (vert) ctx.fillRect(x - lw / 2, 0, lw, H); else ctx.fillRect(0, x - lw / 2, W, lw);
    }
  } });

})();
