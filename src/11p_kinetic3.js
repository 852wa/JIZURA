/* JIZURA pack: kinetic (3) — word-timed cameras, transitions, treatments and decor */
(() => {
'use strict';
const E = J.E;
const P = 'kinetic';
const DEG = J.DEG, TAU = J.TAU, clamp = J.clamp, lerp = J.lerp;
const reg = (g, key, def) => J.register(g, key, Object.assign(def, { set: 'kinetic' }), P);

/* ---------------------------------------------------------------- helpers */
const strip = t => String(t || '').replace(/\s+/g, '');
const isBlank = ch => ch === ' ' || ch === '　';
const bellK = k => Math.sin(Math.PI * clamp(k));
const KM = env => clamp((env.fx.motion ?? 0.7) * 1.25, 0, 1.25);
const addPre = (it, f) => { const p = it.pre; it.pre = p ? (e, i) => { p(e, i); f(e, i); } : f; };

/* word clock of a cut (same rule as the kinetic layouts): onsets spread over the first half, locked to beats nearby */
const clockCache = new WeakMap();
function wordTimes(env, nMax = 6) {
  const c = env.cut;
  let v = clockCache.get(c);
  if (v && v.nMax === nMax) return v.t;
  let n = Math.max(1, Math.min(nMax, (c.words || []).length || 1));
  if (n < 2 && c.dur > 1.2) n = 2;
  const dur = c.dur, last = Math.max(0, Math.min(dur * 0.5, (n - 1) * 0.38));
  let t = [];
  for (let i = 0; i < n; i++) t.push(n > 1 ? last * i / (n - 1) : 0);
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
    if (pick.length >= n - 1 && pick[n - 2] <= Math.max(last * 1.35, dur * 0.55)) t = [0].concat(pick);
  }
  clockCache.set(c, { nMax, t });
  return t;
}
const curIdx = (ts, t) => { let k = -1; for (let i = 0; i < ts.length; i++) if (t >= ts[i]) k = i; return k; };

/* ================================================================ CAMERA */
reg('cam', 'knReadPan', {
  // the frame steps along with the reading: one snap per word, then it settles back to centre
  name: '読み追い', tags: ['pop', 'graphic', 'editorial'], w: 0.8, ae: 'snapPan',
  plan: rng => ({ a: rng.range(0.026, 0.036) }),
  get(env, P) {
    const ts = wordTimes(env), n = ts.length, K = KM(env), A = env.W * (P.a || 0.03) * K, lt = env.lt;
    if (n < 2) return { s: 1.03, x: A * (1 - 2 * E.inOutSine(clamp(lt / Math.max(0.4, env.cut.dur)))) * 0.5 };
    const pos = k => A * (1 - 2 * k / (n - 1));
    const k = Math.max(0, curIdx(ts, lt)), e = k > 0 ? E.outBack(clamp((lt - ts[k]) / 0.2), 1.8) : 1;
    let x = k > 0 ? lerp(pos(k - 1), pos(k), e) : pos(0);
    const tb = ts[n - 1] + 0.55, rb = E.inOutCubic(clamp((lt - tb) / 0.5));
    x *= 1 - rb;
    const whip = k > 0 ? bellK(clamp((lt - ts[k]) / 0.14)) : 0;
    return { x, s: 1.035, skx: -Math.sign(A) * 2.5 * whip * K, blur: 3 * whip * K };
  } });

reg('cam', 'knTiltKick', {
  // every new word kicks the frame into a lean, alternating sides, and the last one sets it level
  name: '語で傾く', tags: ['pop', 'graphic', 'emotional'], w: 0.8, ae: 'dutch',
  plan: rng => ({ dir: rng.pick([1, -1]), a: rng.range(2.4, 3.4) }),
  get(env, P) {
    const ts = wordTimes(env), n = ts.length, K = Math.min(1, KM(env)), lt = env.lt, A = (P.a || 3) * K * (P.dir || 1);
    const ang = k => (k >= n - 1 ? 0 : (k % 2 ? -A : A));
    const k = Math.max(0, curIdx(ts, lt)), d = lt - ts[k];
    const from = k > 0 ? ang(k - 1) : 0, to = ang(k);
    const sp = Math.exp(-d * 7) * Math.cos(d * 17);
    const r = to + (from - to) * sp;
    return { rot: clamp(r, -5, 5), s: 1.03 + 0.012 * Math.abs(r) / 3 };
  } });

reg('cam', 'knCardFlip', {
  // the frame flips over like a card to show the cut, and pinches on each new word
  name: 'カード返し', tags: ['pop', 'graphic'], w: 0.7, ae: 'barrelRoll', strong: true,
  plan: rng => ({ vert: rng.chance(0.3), dir: rng.pick([1, -1]) }),
  get(env, P) {
    const ts = wordTimes(env), lt = env.lt, K = Math.min(1, KM(env)), d = P.dir || 1;
    const q = clamp(lt / 0.42), th = 90 * (1 - E.outBack(q, 1.7));
    let f = Math.max(0.04, Math.abs(Math.cos(th * DEG)));
    for (let i = 1; i < ts.length; i++) { const dd = lt - ts[i]; if (dd > 0 && dd < 0.24) f *= 1 - 0.1 * K * bellK(dd / 0.24); }
    const sk = 7 * Math.sin(th * DEG) * d * K;
    return P.vert ? { sy: f, s: 1.01, y: -env.H * 0.02 * Math.sin(th * DEG) } : { sx: f, s: 1.01, skx: sk * 0.4, x: env.W * 0.02 * Math.sin(th * DEG) * d };
  } });

reg('cam', 'knShearKick', {
  // a sideways shear kick on every word (or beat) that springs back upright
  name: 'シアーキック', tags: ['pop', 'glitch', 'graphic'], w: 0.8, ae: 'jelly',
  plan: rng => ({ a: rng.range(5, 8) }),
  get(env, P) {
    const ts = wordTimes(env), lt = env.lt, K = Math.min(1.1, KM(env));
    let since, idx;
    if (env.beat && env.beat.len > 0.2 && lt > ts[ts.length - 1] + 0.3) { since = env.beat.since; idx = env.beat.index; }
    else { idx = Math.max(0, curIdx(ts, lt)); since = lt - ts[idx]; }
    const w = Math.exp(-since * 8) * Math.cos(since * 22), sg = idx % 2 ? 1 : -1;
    return { skx: (P.a || 6.5) * K * w * sg, x: env.W * 0.006 * K * w * sg, s: 1.02 };
  } });

reg('cam', 'knJumpCut', {
  // hard reframes on every word (tighter, wider, off-centre) with no in-betweens, then back to centre
  name: 'ジャンプカット', tags: ['pop', 'glitch', 'editorial'], w: 0.7, ae: 'stepZoom',
  plan: rng => ({ s0: rng.int(0, 99) }),
  get(env, P) {
    const ts = wordTimes(env), n = ts.length, lt = env.lt, K = Math.min(1, KM(env));
    const k = Math.max(0, curIdx(ts, lt));
    if (lt > ts[n - 1] + 0.5 || n < 2) return { s: 1.02 };
    const sd = (env.cut.seed | 0) + (P.s0 | 0);
    const S = [1.0, 1.12, 1.05, 1.14, 1.08, 1.13][(k + (sd % 3)) % 6], sg = k % 2 ? 1 : -1;
    return { s: 1 + (S - 1) * K, x: sg * (0.5 + 0.5 * J.r(sd, k, 1)) * env.W * 0.04 * K * (k ? 1 : 0), y: J.rs(sd, k, 2) * env.H * 0.035 * K };
  } });

reg('cam', 'knRushIn', {
  // the whole frame rushes up from far away, overshoots a touch and locks
  name: '奥から突進', tags: ['pop', 'graphic', 'emotional'], w: 0.7, ae: 'crashZoom', strong: true,
  plan: rng => ({ z: rng.range(0.66, 0.76), r: rng.range(-4, 4) }),
  get(env, P) {
    const K = Math.min(1, KM(env)), q = clamp(env.lt / 0.34);
    if (q >= 1) return { s: 1 + 0.01 * clamp((env.lt - 0.34) / Math.max(0.3, env.cut.dur)) };
    const e = E.outBack(q, 1.9), s = lerp(1 - (1 - (P.z || 0.7)) * K, 1, e);
    return { s, rot: (P.r || 0) * (1 - E.outCubic(q)) * K, blur: 9 * K * (1 - E.outCubic(q)) };
  } });

/* ================================================================ TRANSITIONS */
const minD = I => Math.min(I.cw, I.ch);
const tAcc = I => { const sc = I.sc; return J.contrast(sc.accent, sc.bg) >= 1.6 ? sc.accent : sc.fg; };
const trReg = (k, d) => reg('trans', k, Object.assign({}, d, {
  draw(ctx, A, B, p, I) {
    ctx.save();
    try {
      if (!(p > 0)) ctx.drawImage(A, 0, 0);
      else if (p >= 1) ctx.drawImage(B, 0, 0);
      else d.draw(ctx, A, B, p, I, I.P || {});
    } finally { ctx.restore(); }
  } }));

trReg('knCornerSwing', {
  // the old frame swings away round a corner, the new one swings in behind it — a quarter turn to the next line
  name: 'コーナースイング', tags: ['pop', 'graphic'], w: 0.8, ae: 'spinOut', dur: 0.42,
  plan: rng => ({ c: rng.int(0, 3) }),
  draw(ctx, A, B, p, I, P) {
    const { cw, ch } = I, c = P.c | 0;
    const px = c === 1 || c === 2 ? cw : 0, py = c >= 2 ? 0 : ch, sg = (c === 0 || c === 2) ? 1 : -1;
    const e = E.inOutCubic(p);
    ctx.fillStyle = I.sc.bg; ctx.fillRect(0, 0, cw, ch);
    const put = (C, ang, dark) => {
      ctx.save(); ctx.translate(px, py); ctx.rotate(ang * DEG); ctx.translate(-px, -py);
      ctx.drawImage(C, 0, 0);
      ctx.restore();
    };
    put(B, -90 * sg * (1 - e), 0.35 * (1 - e));
    put(A, 90 * sg * e, 0.25 * e);
    // a thin accent edge along the swinging seam
    const lw = Math.max(2, minD(I) * 0.006);
    ctx.save(); ctx.translate(px, py); ctx.rotate(90 * sg * e * DEG);
    ctx.globalAlpha = bellK(p); ctx.fillStyle = tAcc(I);
    if (c === 0 || c === 3) ctx.fillRect(-lw, -(py ? ch : 0) * 1, lw, ch * 2); else ctx.fillRect(0, -(py ? ch : 0), lw, ch * 2);
    ctx.restore();
  } });

trReg('knStutterCut', {
  // rhythm cut: old and new frames trade places in hard cuts before the new one holds
  name: '刻みカット', tags: ['pop', 'glitch', 'graphic'], w: 0.7, ae: 'flashCross', dur: 0.36,
  plan: rng => ({ z: rng.range(1.05, 1.1), o: rng.range(0.02, 0.035) * rng.pick([1, -1]) }),
  draw(ctx, A, B, p, I, P) {
    const { cw, ch } = I, z = P.z || 1.07, o = (P.o || 0.03) * cw;
    const seq = [[A, 1, 0], [B, z, o], [A, 1 / z, -o * 0.6], [B, z * 1.03, -o], [B, 1, 0]];
    const cuts = [0.18, 0.36, 0.52, 0.7];
    let k = 0; while (k < cuts.length && p >= cuts[k]) k++;
    const [C, s, dx] = seq[k];
    ctx.fillStyle = (C === A ? (I.scPrev || I.sc) : I.sc).bg; ctx.fillRect(0, 0, cw, ch);
    ctx.drawImage(C, cw / 2 - cw * s / 2 + dx, ch / 2 - ch * s / 2, cw * s, ch * s);
    // a one-frame accent bar on each cut
    const since = k > 0 ? p - cuts[k - 1] : 1;
    if (since < 0.06) { const h = Math.max(3, ch * 0.012); ctx.globalAlpha = 0.9; ctx.fillStyle = tAcc(I); ctx.fillRect(0, (k % 2 ? 0.3 : 0.68) * ch, cw, h); ctx.globalAlpha = 1; }
  } });

trReg('knStripSlam', {
  // the new frame drops in as tall strips, one after another, each landing with a small bounce
  name: '短冊スラム', tags: ['pop', 'graphic'], w: 0.8, ae: 'sliceShift', dur: 0.45,
  plan: rng => ({ n: rng.int(3, 5), rev: rng.chance(0.5), up: rng.chance(0.25) }),
  draw(ctx, A, B, p, I, P) {
    const { cw, ch } = I, n = P.n || 4;
    ctx.drawImage(A, 0, 0);
    ctx.fillStyle = '#000000'; ctx.globalAlpha = 0.3 * p; ctx.fillRect(0, 0, cw, ch); ctx.globalAlpha = 1;
    for (let i = 0; i < n; i++) {
      const k = P.rev ? n - 1 - i : i, d = k / n * 0.45, q = clamp((p - d) / 0.55);
      if (q <= 0) continue;
      // gravity drop, then a bounce that dies out
      const tl = 0.62;
      let y;
      if (q < tl) { const f = q / tl; y = -ch * (1 - f * f); }
      else { const t = (q - tl) / (1 - tl); y = -ch * 0.06 * Math.abs(Math.sin(t * Math.PI * 2)) * (1 - t); }
      if (P.up) y = -y;
      const x0 = Math.round(i * cw / n), x1 = Math.round((i + 1) * cw / n);
      ctx.drawImage(B, x0, 0, x1 - x0, ch, x0, Math.round(y), x1 - x0, ch);
      if (q < 1) { ctx.fillStyle = tAcc(I); ctx.globalAlpha = 0.8 * (1 - q); ctx.fillRect(x0, P.up ? Math.round(y) - 3 : Math.round(y) + ch - 3, x1 - x0, Math.max(3, ch * 0.008)); ctx.globalAlpha = 1; }
    }
  } });

/* ================================================================ TREATMENTS */
const alive = (it, amin = 0.9) => it.fill !== false && (it.alpha ?? 1) >= amin && !!it.text && it.size > 1;
// word of every glyph (cut's word chunks, else chunks of the item's own text)
const tmCache = new Map();
function treatGeo(env, it) {
  const text = String(it.text || '');
  const key = [text, it.font, it.track || 0, it.lead || 0, it.vertical ? 1 : 0, it.align || '', J.TYPESET ? 1 : 0, (env.cut.words || []).join('\u0001')].join('\u0002');
  let G = tmCache.get(key);
  if (G) return G;
  const L1 = J.layoutText(Object.assign({}, it, { size: 1, sx: 1, sy: 1, _lay: null, _m: null }));
  let ws = (env.cut.words || []).map(strip).filter(Boolean), off = ws.length ? ws.join('').indexOf(strip(text)) : -1;
  if (off < 0) { ws = (/[A-Za-z]/.test(text) ? text.split(/\s+/) : (J.chunkText ? J.chunkText(text.replace(/\n/g, '')) : [text])).map(strip).filter(Boolean); off = 0; }
  const bnd = []; let acc = 0; ws.forEach(w => { acc += [...w].length; bnd.push(acc); });
  const map = new Array(L1.length).fill(-1); let k = 0, jmin = 1e9;
  for (const g of L1) { if (isBlank(g.ch)) continue; let j = bnd.findIndex(b => off + k < b); if (j < 0) j = bnd.length - 1; map[g.i] = j; jmin = Math.min(jmin, j); k++; }
  for (let i = 0; i < map.length; i++) if (map[i] >= 0) map[i] -= jmin;
  const nW = Math.max(0, ...map) + 1;
  G = { L1, map, nW };
  if (tmCache.size > 300) tmCache.clear();
  tmCache.set(key, G);
  return G;
}

reg('treat', 'knWordScale', {
  // one key word is set big, the rest small — the line re-flows around the contrast
  name: '大小語', tags: ['pop', 'graphic', 'editorial'], w: 0.9, ae: 'sizeWave', safe: true,
  plan: rng => ({ big: rng.range(1.28, 1.42), small: rng.range(0.78, 0.86), pick: rng.pick(['long', 'long', 'last', 'first']) }),
  apply(env, it, P) {
    if (!alive(it)) return;
    const G = treatGeo(env, it);
    if (G.nW < 2) return;
    const key = [it.text, it.font, it.track || 0, P.big, P.small, P.pick, G.nW].join('|');
    let R = it._knws && it._knws.key === key ? it._knws : null;
    if (!R) {
      // choose the key word
      const cnt = new Array(G.nW).fill(0), kan = new Array(G.nW).fill(0);
      G.L1.forEach(g => { const j = G.map[g.i]; if (j >= 0) { cnt[j]++; if (J.isKanji(g.ch)) kan[j]++; } });
      let kw = P.pick === 'last' ? G.nW - 1 : P.pick === 'first' ? 0 : cnt.reduce((b, v, j) => (v + kan[j] * 0.5 > cnt[b] + kan[b] * 0.5 ? j : b), 0);
      // key word big, the rest small; the whole set scaled so the line never grows longer
      let tb = 0, ts2 = 0;
      G.L1.forEach(g => { const j = G.map[g.i]; if (j < 0) return; const a = it.vertical ? g.h : g.w; if (j === kw) tb += a; else ts2 += a; });
      const norm = Math.min(1, (tb + ts2) / Math.max(1e-6, tb * P.big + ts2 * P.small));
      const f = j => (j === kw ? P.big : P.small) * norm;
      // new advances along each line, keeping the line's own alignment
      const vert = !!it.vertical, lines = new Map();
      G.L1.forEach(g => { const L = lines.get(g.li) || []; L.push(g); lines.set(g.li, L); });
      const out = new Array(G.L1.length).fill(null);
      for (const L of lines.values()) {
        const a0 = vert ? L[0].y - L[0].h / 2 : L[0].x - L[0].w / 2, last = L[L.length - 1], a1 = vert ? last.y + last.h / 2 : last.x + last.w / 2;
        let pos = 0; const np = [];
        L.forEach(g => { const j = G.map[g.i], k = j >= 0 ? f(j) : P.small, adv = (vert ? g.h : g.w) * k; np.push(pos + adv / 2); pos += adv + (it.track || 0); });
        const len = pos - (it.track || 0), old = a1 - a0;
        const start = it.align === 'left' ? a0 : it.align === 'right' ? a1 - len : a0 + (old - len) / 2;
        L.forEach((g, q) => {
          const j = G.map[g.i], k = j >= 0 ? f(j) : P.small, na = start + np[q], oa = vert ? g.y : g.x;
          out[g.i] = vert ? { dx: 0, dy: na - oa, s: k } : { dx: na - oa, dy: (1 - k) * 0.36, s: k };
        });
      }
      R = it._knws = { key, out };
    }
    const sx = it.sx || 1, sy = it.sy || 1, L1 = G.L1;
    it.charFns.push((i, g) => {
      const o = R.out[i]; if (!o) return null;
      const r = L1[i], k = r && r.w > 1e-6 ? g.w / r.w : it.size;
      return { dx: o.dx * k * sx, dy: o.dy * k * sy, s: o.s };
    });
  } });

reg('treat', 'knWordPlate', {
  // every other word is knocked out of a solid plate that follows the word as it moves
  name: '語ごと反転', tags: ['pop', 'graphic', 'glitch'], w: 0.8, ae: 'boxed',
  plan: rng => ({ first: rng.chance(0.5), pad: rng.range(0.08, 0.14), tilt: rng.chance(0.4) ? rng.range(1.5, 3) : 0 }),
  apply(env, it, P) {
    if (!alive(it)) return;
    const G = treatGeo(env, it);
    if (G.nW < 2) return;
    const sc = env.sc, plate = J.contrast(sc.ink, sc.bg) >= 2 ? sc.ink : sc.fg;
    let tc = null, bv = 0;
    for (const c of [sc.bg, sc.fg, sc.ink, sc.accent]) { if (!c || c === plate) continue; const k = J.contrast(c, plate); if (k > bv) { bv = k; tc = c; } }
    if (bv < 2.6) tc = J.lum(plate) > 0.5 ? '#111111' : '#FFFFFF';
    const on = j => (j % 2 === 0) === !!P.first;
    it.charFns.push((i) => { const j = G.map[i]; return j >= 0 && on(j) ? { color: tc } : null; });
    addPre(it, (e, x) => {
      const lay = J.layoutText(x), sx = x.sx || 1, sy = x.sy || 1, boxes = new Map();
      for (const g of lay) {
        const j = G.map[g.i]; if (j < 0 || !on(j)) continue;
        const c = x.charFn ? x.charFn(g.i, g, lay.N) : null;
        if (c && c.hide) continue;
        const s = c && c.s != null ? c.s : 1, a = c && c.a != null ? c.a : 1;
        const gx = (g.x + g.vx) * sx + ((c && c.dx) || 0), gy = (g.y + g.vy) * sy + ((c && c.dy) || 0), hw = g.w * sx * s / 2, hh = g.h * sy * s / 2;
        const key = j * 100 + g.li;
        const B = boxes.get(key) || { x0: 1e9, y0: 1e9, x1: -1e9, y1: -1e9, a: 1 };
        B.x0 = Math.min(B.x0, gx - hw); B.x1 = Math.max(B.x1, gx + hw); B.y0 = Math.min(B.y0, gy - hh); B.y1 = Math.max(B.y1, gy + hh); B.a = Math.min(B.a, a);
        boxes.set(key, B);
      }
      if (!boxes.size) return;
      const ctx = e.ctx, pd = x.size * P.pad, A = (x.alpha ?? 1);
      ctx.save(); ctx.translate(x.x, x.y); if (x.rot) ctx.rotate(x.rot * DEG); if (x.skew) ctx.transform(1, 0, Math.tan(x.skew * DEG), 1, 0, 0);
      let q = 0;
      for (const B of boxes.values()) {
        const t = P.tilt ? (q++ % 2 ? P.tilt : -P.tilt) : 0;
        ctx.save(); ctx.translate((B.x0 + B.x1) / 2, (B.y0 + B.y1) / 2); if (t) ctx.rotate(t * DEG);
        const w = B.x1 - B.x0 + pd * 2, h = B.y1 - B.y0 + pd * 1.4;
        e.rect(-w / 2, -h / 2, w, h, plate, A * B.a, true);
        ctx.restore();
      }
      ctx.restore();
    });
  } });

/* ================================================================ DECOR */
const getBB = (env, bb) => J.centerBB(env, bb);

reg('decor', 'knSpeedTrail', {
  // speed lines stream off the back of the lyric and follow it wherever it moves
  name: '追従スピード線', tags: ['pop', 'graphic', 'glitch'], w: 0.8, ae: 'slash', layer: 'front',
  draw(env, bb0, P) {
    if (env.pass !== 'main') return;
    const bb = getBB(env, bb0), { W, H, sc } = env, u = Math.min(W, H);
    const o = E.outCubic(clamp(env.lt / 0.3)) * (1 - E.inCubic(env.pOut));
    if (o <= 0.01) return;
    const vert = (bb.y1 - bb.y0) > (bb.x1 - bb.x0) * 1.3;
    // trailing side: the one with more room (P.right breaks ties)
    const roomA = vert ? bb.y0 : bb.x0, roomB = vert ? H - bb.y1 : W - bb.x1;
    const side = Math.abs(roomA - roomB) < u * 0.05 ? (P.right ? 1 : -1) : (roomB > roomA ? 1 : -1);
    const N = 8 + (P.n | 0) * 3, t = env.ltb;
    const col = J.contrast(sc.sub, sc.bg) >= 1.4 ? sc.sub : sc.fg;
    const span = vert ? bb.x1 - bb.x0 : bb.y1 - bb.y0, len = vert ? bb.y1 - bb.y0 : bb.x1 - bb.x0;
    for (let i = 0; i < N; i++) {
      const r = k => J.r(P.seed, i, k);
      const f = (i + 0.5) / N, lw = Math.max(1.5, u * (0.003 + r(1) * 0.006));
      const L = u * (0.18 + r(2) * 0.3) * o;
      // start a little inside the text's trailing edge so the streaks read even when there is no room
      const tight = Math.max(roomA, roomB) < u * 0.14;
      const st = tight ? len * (0.2 + r(3) * 0.3) : -u * (0.015 + 0.02 * r(3));
      const ph = ((t * (1.3 + r(4) * 1.5) + r(5)) % 1), s0 = st * -1 + ph * L * 0.6, s1 = s0 + L * (0.35 + 0.65 * (1 - ph));
      const a = (0.35 + 0.35 * r(6)) * o * (1 - ph * 0.5);
      // no room at the back: the streaks run in two bands just outside the text's long edges instead
      const c = tight ? (i % 2 ? (vert ? bb.x1 : bb.y1) + span * (0.05 + 0.3 * f) : (vert ? bb.x0 : bb.y0) - span * (0.05 + 0.3 * f))
        : lerp(vert ? bb.x0 : bb.y0, vert ? bb.x1 : bb.y1, 0.08 + 0.84 * f) + (r(7) - 0.5) * span * 0.04;
      const e0 = side < 0 ? (vert ? bb.y0 : bb.x0) : (vert ? bb.y1 : bb.x1);
      const p0 = e0 + side * s0, p1 = e0 + side * s1;
      env.line(vert ? [[c, p0], [c, p1]] : [[p0, c], [p1, c]], col, lw, a, false);
    }
  } });

reg('decor', 'knWordTicks', {
  // a small segmented bar that fills one segment per word as the words arrive, with a running count
  name: '語カウンター', tags: ['graphic', 'editorial', 'pop'], w: 0.8, ae: 'counter', layer: 'front', subtle: true,
  draw(env, bb0, P) {
    const bb = getBB(env, bb0), { W, H, sc } = env, u = Math.min(W, H);
    const o = E.outCubic(clamp(env.lt / 0.35)) * (1 - E.inCubic(env.pOut));
    if (o <= 0.01) return;
    const ts = wordTimes(env), n = ts.length, k = curIdx(ts, env.lt);
    const segW = u * 0.06, segH = Math.max(4, u * 0.011), g = u * 0.014, tot = n * segW + (n - 1) * g;
    const below = bb.y1 + u * 0.08 < H * 0.93;
    const y = below ? bb.y1 + u * 0.06 : bb.y0 - u * 0.06;
    const cx = clamp((bb.x0 + bb.x1) / 2, tot / 2 + W * 0.06, W * 0.94 - tot / 2);
    const x0 = cx - tot / 2, acc = J.contrast(sc.accent, sc.bg) >= 1.6 ? sc.accent : sc.fg;
    for (let i = 0; i < n; i++) {
      const x = x0 + i * (segW + g), on = i <= k;
      const f = on ? E.outExpo(clamp((env.lt - ts[i]) / 0.18)) : 0;
      env.rect(x, y - segH / 2, segW, segH, sc.sub, 0.35 * o, false);
      if (f > 0) env.rect(x, y - segH / 2 - (i === k ? segH * 0.6 * (1 - f) : 0), segW * f, segH * (i === k ? 1 + 1.2 * (1 - f) : 1), acc, o, false);
    }
    const fs = J.clamp(u * 0.028, 14, 32), mono = (env.st.fonts.mono && env.st.fonts.mono[0]) || 'mono';
    env.draw({ text: String(Math.max(1, k + 1)).padStart(2, '0') + ' / ' + String(n).padStart(2, '0'), font: mono, size: fs, align: 'left', x: x0 + tot + u * 0.02, y, color: sc.sub, alpha: o, ghost: false, plain: true });
  } });

})();
