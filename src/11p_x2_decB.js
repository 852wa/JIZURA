/* JIZURA pack: x2decB — 30 decor parts: rule-driven particles, shapes that build, faint back-layer patterns, beat / energy accents */
(() => {
'use strict';
const E = J.E;
const P = 'x2decB';
const DEG = J.DEG, TAU = J.TAU, cl = J.clamp, lerp = J.lerp, R = J.r, RR = J.rr, RS = J.rs;

/* ============================================================ helpers */
const U = env => Math.min(env.W, env.H) / 1080;                     // 1 at a 1080 short side
const MG = env => Math.min(env.W, env.H) * 0.05;                    // safe margin
const vis = (env, c, min = 1.6) => (c && J.contrast(c, env.sc.bg) >= min ? c : env.sc.fg);
const ACC = env => vis(env, env.sc.accent);
const ACC2 = env => vis(env, env.sc.accent2 || env.sc.accent);
const SUB = env => vis(env, env.sc.sub, 1.4);
const COL = (env, p) => (p.accent ? ACC(env) : env.sc.fg);
/* faint colour for back-layer patterns: the scheme's dim when it is visible but still quiet */
const DIM = env => { const d = env.sc.dim, c = d ? J.contrast(d, env.sc.bg) : 0; return c >= 1.3 && c <= 2.4 ? d : J.mix(env.sc.bg, env.sc.fg, 0.2); };
/* a little stronger: thin line patterns on the back layer */
const LN = env => J.mix(env.sc.bg, env.sc.fg, 0.36);
const ein = (t, d = 0.4, delay = 0, ease = E.outExpo) => ease(cl((t - delay) / d));
const mod = (a, n) => ((a % n) + n) % n;
const tri = x => 1 - Math.abs(2 * mod(x, 1) - 1);                    // 0 → 1 → 0 over one unit
const bw = bb => bb.x1 - bb.x0, bh = bb => bb.y1 - bb.y0;
const hit = (x0, y0, x1, y1, bb, pad = 0) => !(x1 < bb.x0 - pad || x0 > bb.x1 + pad || y1 < bb.y0 - pad || y0 > bb.y1 + pad);
const SP = env => 0.45 + 0.8 * env.fx.motion;                       // speed factor of continuous motion
/* 0 inside the lyric box, 1 once `pad` away from it */
const keepOut = (x, y, bb, pad) => cl(Math.hypot(Math.max(bb.x0 - x, 0, x - bb.x1), Math.max(bb.y0 - y, 0, y - bb.y1)) / pad);
/* beat clock: the real beat when there is one, a 0.5 s clock otherwise */
const BT = (env, t) => (env.beat ? { idx: env.beat.index | 0, since: Math.max(0, env.beat.since) } : { idx: Math.floor(t / 0.5), since: mod(t, 0.5) });
const EN = (env, t, s) => (env.energy != null ? cl(env.energy) : cl(0.42 + 0.3 * J.noise1(env.t * 1.7, s) + 0.3 * Math.exp(-BT(env, t).since * 6)));

/* lyric bbox: keep the last real one per cut so nothing jumps while the text is hidden or flying out */
const BBC = new WeakMap();
function getBB(env, bb) {
  if (env.pOut > 0 && env.cut && BBC.has(env.cut)) return BBC.get(env.cut);
  if (bb && isFinite(bb.x0 + bb.x1 + bb.y0 + bb.y1) && bb.x1 > bb.x0 && bb.y1 > bb.y0) {
    const b = { x0: Math.max(bb.x0, 0), x1: Math.min(bb.x1, env.W), y0: Math.max(bb.y0, 0), y1: Math.min(bb.y1, env.H) };
    if (b.x1 <= b.x0) { b.x0 = bb.x0; b.x1 = bb.x1; }
    if (b.y1 <= b.y0) { b.y0 = bb.y0; b.y1 = bb.y1; }
    if (env.cut) BBC.set(env.cut, b);
    return b;
  }
  const c = env.cut && BBC.get(env.cut);
  if (c) return c;
  const d = J.centerBB(env, null);
  return { x0: d.x0, x1: d.x1, y0: d.y0, y1: d.y1 };
}
const PAD = (bb, u, k = 1) => (24 * u + Math.min(bw(bb), bh(bb)) * 0.14) * k;
function frame(env, bb, pad) {
  const m = MG(env) * 0.35;
  const x0 = Math.max(m, bb.x0 - pad), y0 = Math.max(m, bb.y0 - pad), x1 = Math.min(env.W - m, bb.x1 + pad), y1 = Math.min(env.H - m, bb.y1 + pad);
  return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
}
/* a free w×h box in a screen corner (or at the middle of an edge) that does not touch the lyric; null when there is none */
function spot(env, bb, w, h, p, gap) {
  const { W, H } = env, m = MG(env) * 0.8, sx = p.right ? 1 : -1, sy = p.low ? 1 : -1, c = [];
  const X = a => (a > 0 ? W - m - w : a < 0 ? m : (W - w) / 2), Y = b => (b > 0 ? H - m - h : b < 0 ? m : (H - h) / 2);
  for (const [a, b] of [[sx, sy], [-sx, sy], [sx, -sy], [-sx, -sy], [0, sy], [0, -sy], [sx, 0], [-sx, 0]]) c.push([X(a), Y(b)]);
  for (const [x, y] of c) if (x >= 0 && y >= 0 && !hit(x, y, x + w, y + h, bb, gap)) return { x, y, w, h, cx: x + w / 2, cy: y + h / 2 };
  return null;
}
/* a free horizontal band of height h just below / above the lyric (else along the bottom / top margin); null when there is none */
function band(env, bb, h, low, gap, edgeOK = true) {
  const { H } = env, m = MG(env) * 0.5;
  const dn = bb.y1 + gap + h <= H - m, up = bb.y0 - gap - h >= m;
  if (low ? dn : up) return low ? { y: bb.y1 + gap, h, s: 1 } : { y: bb.y0 - gap - h, h, s: -1 };
  if (low ? up : dn) return low ? { y: bb.y0 - gap - h, h, s: -1 } : { y: bb.y1 + gap, h, s: 1 };
  if (!edgeOK) return null;
  const m2 = MG(env);
  for (const s of low ? [1, -1] : [-1, 1]) { const y = s > 0 ? H - m2 - h : m2; if (y + h < bb.y0 - gap * 0.5 || y > bb.y1 + gap * 0.5) return { y, h, s }; }
  return null;
}

/* ---- drawing (main pass only: the wrapper below returns early in ghost passes) ---- */
function stroke(env, pts, c, lw, a = 1, close, cap) {
  if (a <= 0.003 || !pts || pts.length < 2 || !(lw > 0)) return;
  const ctx = env.ctx;
  ctx.globalAlpha = Math.min(1, a); ctx.strokeStyle = c; ctx.lineWidth = lw; ctx.lineCap = cap || 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  if (close) ctx.closePath();
  ctx.stroke(); ctx.globalAlpha = 1;
}
function seg(env, x0, y0, x1, y1, c, lw, a = 1, cap) {
  if (a <= 0.003 || !(lw > 0)) return;
  const ctx = env.ctx;
  ctx.globalAlpha = Math.min(1, a); ctx.strokeStyle = c; ctx.lineWidth = lw; ctx.lineCap = cap || 'round';
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); ctx.globalAlpha = 1;
}
function fillPoly(env, pts, c, a = 1) {
  if (a <= 0.003 || pts.length < 3) return;
  const ctx = env.ctx; ctx.globalAlpha = Math.min(1, a); ctx.fillStyle = c; ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
}
function box(env, x, y, w, h, c, a = 1) {
  if (a <= 0.003 || w <= 0 || h <= 0) return;
  const ctx = env.ctx; ctx.globalAlpha = Math.min(1, a); ctx.fillStyle = c; ctx.fillRect(x, y, w, h); ctx.globalAlpha = 1;
}
/* square of half-size r centred on (x, y), rotated */
function sq(env, x, y, r, rot, c, a = 1, lw) {
  if (a <= 0.003 || r <= 0.05) return;
  const ctx = env.ctx; ctx.save(); ctx.translate(x, y); if (rot) ctx.rotate(rot);
  ctx.globalAlpha = Math.min(1, a);
  if (lw) { ctx.strokeStyle = c; ctx.lineWidth = lw; ctx.strokeRect(-r, -r, r * 2, r * 2); } else { ctx.fillStyle = c; ctx.fillRect(-r, -r, r * 2, r * 2); }
  ctx.restore();
}
function dot(env, x, y, r, c, a = 1) {
  if (a <= 0.003 || r <= 0.05) return;
  const ctx = env.ctx; ctx.globalAlpha = Math.min(1, a); ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
}
function ring(env, x, y, r, c, lw, a = 1, a0 = 0, a1 = TAU) {
  if (a <= 0.003 || r <= 0.05 || !(lw > 0)) return;
  const ctx = env.ctx; ctx.globalAlpha = Math.min(1, a); ctx.strokeStyle = c; ctx.lineWidth = lw; ctx.lineCap = 'butt'; ctx.beginPath(); ctx.arc(x, y, r, a0, a1); ctx.stroke(); ctx.globalAlpha = 1;
}

/* registration: main-pass graphics; front parts wait until the entrance has mostly settled so the lyric box is stable */
function D(key, name, en, tags, w, ae, layer, fn, extra) {
  J.register('decor', key, Object.assign({
    name, en, tags, w, ae, layer,
    draw(env, bb0, p) {
      if (env.pass !== 'main') return;
      const front = layer === 'front';
      const t = env.lt - (front ? cl(((env.cut && env.cut.inDur) || 0) * 0.6, 0, 0.35) : 0);
      if (!(t > 0)) return;
      const o = 1 - E.inCubic(env.pOut || 0); if (o <= 0.003) return;
      const q = Object.assign({ n: 1, v: 0, r: 0.5, seed: 1 }, p); q.n = cl(q.n | 0, 1, 3); q.v = q.v | 0;
      const ctx = env.ctx; ctx.save();
      fn(env, front ? getBB(env, bb0) : null, q, t, o, U(env));
      ctx.restore(); ctx.globalAlpha = 1;
    },
  }, extra || {}), P);
}

/* ============================================================ particles that follow a rule */

/* 積もる粒 — small squares fall one by one and pile up on the top edge of the lyric */
D('xmSettle', '積もる粒', 'Settling Grains', ['pop', 'emotional', 'calm'], 1, 'dots', 'front', (env, bb, p, t, o, u) => {
  const { W, H, sc } = env, s = p.seed, sz = (p.big ? 17 : 13) * u, gap = 8 * u;
  const top = bb.y0 - gap > sz * 5;                                  // room for a pile above the lyric, else pile on the floor
  const xa = top ? bb.x0 : 0, xw = top ? bw(bb) : W, base = top ? bb.y0 - gap : H;
  const nb = cl(Math.round(xw / (sz * 1.2)), 3, 64), N = Math.min(22 + p.n * 10, nb * 4), lev = new Uint8Array(nb);
  const span = cl(((env.cut && env.cut.dur) || 2) * 0.32, 0.5, 2), cols = [sc.fg, ACC(env), ACC2(env)], out = 1 - o;
  for (let i = 0; i < N; i++) {
    const b = Math.min(nb - 1, Math.floor(R(s, i, 1) * nb)), L = lev[b]++;
    const q = cl((t - R(s, i, 3) * span) / 0.6); if (q <= 0) continue;
    const x = xa + (b + 0.5 + RS(s, i, 2) * 0.16) * (xw / nb), yr = base - (L + 0.5) * sz;
    const b2 = cl((t - R(s, i, 3) * span - 0.6) / 0.22);
    const y = lerp(Math.min(-sz * 2, yr - H * 0.3), yr, E.inQuad(q)) - Math.sin(Math.PI * b2) * sz * 0.4 - out * H * 0.07 * R(s, i, 6);
    const a = (top ? 1 : keepOut(x, y, bb, sz * 2.5)) * o * 0.92;
    sq(env, x + out * RS(s, i, 5) * W * 0.1, y, sz * 0.43, (1 - q) * RS(s, i, 4) * 5 + out * RS(s, i, 7) * 2, cols[i % 5 === 0 ? 1 : i % 7 === 0 ? 2 : 0], a);
  }
});

/* よける群れ — a stream of short dashes crosses the screen and parts around the lyric like water round a stone */
D('xmSwarm', 'よける群れ', 'Parting Swarm', ['graphic', 'emotional', 'calm', 'glitch'], 1.2, 'sparks', 'front', (env, bb, p, t, o, u) => {
  const { W, H, sc } = env, s = p.seed, M = 34 + p.n * 14, dir = p.right ? 1 : -1, gap = 26 * u;
  const cx = (bb.x0 + bb.x1) / 2, cy = (bb.y0 + bb.y1) / 2, a = bw(bb) / 2 * 1.35 + gap * 2, B = (bh(bb) / 2 + gap) / 0.72;
  const m = 40 * u, span = W + 2 * m, e = ein(t, 0.5, 0, E.outCubic), sp = SP(env), acc = ACC(env);
  const pos = (i, tt) => {
    const x = mod(R(s, i, 1) * span + dir * tt * W * RR(0.1, 0.2, s, i, 2) * sp, span) - m, d = H * RR(0.03, 0.97, s, i, 3) - cy;
    const k = (x - cx) / a, hy = B * Math.exp(-k * k * k * k);
    return [x, cy + (d >= 0 ? 1 : -1) * Math.sqrt(d * d + hy * hy)];
  };
  for (let i = 0; i < M; i++) {
    const q = pos(i, t), q0 = pos(i, t - 0.1 * e);
    if (Math.abs(q[0] - q0[0]) > W * 0.5 || q[1] < -20 || q[1] > H + 20) continue;
    seg(env, q0[0], q0[1], q[0], q[1], i % 6 === 0 ? acc : sc.fg, (i % 6 === 0 ? 5.5 : 3.6) * u, 0.8 * e * o);
  }
});

/* 跳ねる玉 — balls hop along the top of the lyric (or a floor line under it), squashing and leaving a mark where they land */
D('xmBounce', '跳ねる玉', 'Bouncing Balls', ['pop', 'graphic'], 1, 'dots', 'front', (env, bb, p, t, o, u) => {
  const { H, sc } = env, gap = 10 * u, r = (p.big ? 22 : 16) * u, m = MG(env) * 0.4;
  const up = bb.y0 - gap - 2 * r - m, dn = H - m - bb.y1 - gap - 2 * r;
  let top = !p.low; if ((top ? up : dn) < 44 * u) top = !top;
  const room = top ? up : dn; if (room < 16 * u) return;
  const hh = Math.min(130 * u, room), yB = top ? bb.y0 - gap : bb.y1 + gap + hh + 2 * r;
  const xa = bb.x0 + r, xb = Math.max(xa + 1, bb.x1 - r), hops = cl(Math.round((xb - xa) / (150 * u)), 2, 9), Th = 0.5 / (0.6 + 0.6 * env.fx.motion);
  const e = ein(t, 0.45, 0, E.outCubic), X = q => lerp(xa, xb, tri(q / (2 * hops))), ctx = env.ctx;
  if (!top) seg(env, lerp((xa + xb) / 2, xa - r, e), yB, lerp((xa + xb) / 2, xb + r, e), yB, SUB(env), 1.6 * u, 0.8 * o, 'butt');
  for (let k = 0; k < p.n; k++) {
    const ph = t / Th + k * (0.37 + 2 * hops / p.n), j = Math.floor(ph), f = ph - j, c = Math.min(f, 1 - f);
    const s2 = 1 - 0.34 * Math.exp(-c * 20), x = X(ph), y = yB - r * s2 - hh * 4 * f * (1 - f) - (1 - e) * hh;
    const xl = X(j), col = k === 0 ? COL(env, p) : k === 1 ? ACC(env) : sc.fg;
    seg(env, xl - r * (0.5 + 1.5 * f), yB, xl + r * (0.5 + 1.5 * f), yB, col, 2 * u, (1 - f) * 0.7 * e * o, 'butt');
    ctx.globalAlpha = cl(e * 1.5) * o; ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(x, y, r * o / s2, r * o * s2, 0, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
  }
});

/* 導火線 — a fuse beside the lyric burns down over the cut: a spitting spark eats the line and leaves ash dots */
D('xmFuse', '導火線', 'Burning Fuse', ['pop', 'glitch', 'emotional'], 0.9, 'sparks', 'front', (env, bb, p, t, o, u) => {
  const { W, H, sc } = env, s = p.seed, gap = 24 * u, m = MG(env) * 0.5, vert = bh(bb) > bw(bb) * 1.25;
  let A, B, nx = 0, ny = 0;
  if (!vert) {
    let low = p.low; if (low ? bb.y1 + gap > H - m : bb.y0 - gap < m) low = !low;
    const y = low ? bb.y1 + gap : bb.y0 - gap; A = [bb.x0, y]; B = [bb.x1, y]; ny = low ? 1 : -1;
  } else {
    let rt = p.low; if (rt ? bb.x1 + gap > W - m : bb.x0 - gap < m) rt = !rt;
    const x = rt ? bb.x1 + gap : bb.x0 - gap; A = [x, bb.y0]; B = [x, bb.y1]; nx = rt ? 1 : -1;
  }
  if (!p.right) { const q = A; A = B; B = q; }
  const L = Math.hypot(B[0] - A[0], B[1] - A[1]), n = cl(Math.round(L / (12 * u)), 8, 120);
  const pt = q => { const w = Math.sin(q * L / (40 * u)) * 5 * u; return [lerp(A[0], B[0], q) + nx * w, lerp(A[1], B[1], q) + ny * w]; };
  const e = ein(t, 0.4, 0, E.outCubic), dur = (env.cut && env.cut.dur) || 2;
  const q = cl((t - 0.3) / Math.max(0.6, dur - ((env.cut && env.cut.outDur) || 0) - 1)) * 0.93, acc = ACC(env);
  const pts = [];
  for (let i = 0; i <= n; i++) { const v = lerp(q, Math.max(q, e), i / n); pts.push(pt(v)); }
  stroke(env, pts, sc.fg, 3.2 * u, o);
  for (let i = 0, k = Math.floor(q * n); i < k; i += 2) { const a = pt(i / n); dot(env, a[0], a[1], 2 * u, SUB(env), 0.5 * o); }
  if (e > 0.98) ring(env, pt(1)[0], pt(1)[1], 5 * u, sc.fg, 2 * u, o);
  if (e <= q) return;
  const h = pt(q);
  for (let i = 0; i < 7; i++) {
    const an = R(s, env.step, i, 1) * TAU, l = RR(13, 38, s, env.step, i, 2) * u * o;
    seg(env, h[0] + Math.cos(an) * 5 * u, h[1] + Math.sin(an) * 5 * u, h[0] + Math.cos(an) * l, h[1] + Math.sin(an) * l, i % 3 ? acc : sc.fg, 2.6 * u, o);
  }
  for (let i = 0; i < 6; i++) {
    const ph = t * 1.8 + i / 6, a = ph - Math.floor(ph), an = Math.atan2(ny, nx) + RS(s, i, Math.floor(ph), 3) * 1.2;
    dot(env, h[0] + Math.cos(an) * a * 60 * u, h[1] + Math.sin(an) * a * 60 * u, 3 * u * (1 - a * 0.5), acc, (1 - a) * o);
  }
  dot(env, h[0], h[1], 6.5 * u * o, acc, 1);
});

/* 吸いつく粒 — scattered dust is pulled in and sticks along an invisible frame round the lyric, then creeps along it */
D('xmMagnet', '吸いつく粒', 'Magnet Dust', ['graphic', 'glitch', 'emotional'], 1, 'dots', 'front', (env, bb, p, t, o, u) => {
  const { W, H, sc } = env, s = p.seed, f = frame(env, bb, PAD(bb, u)), N = 34 + p.n * 14, Lp = 2 * (f.w + f.h), mn = Math.min(W, H);
  const per = d => { d = mod(d, Lp); if (d < f.w) return [f.x0 + d, f.y0, 0, -1]; d -= f.w; if (d < f.h) return [f.x1, f.y0 + d, 1, 0]; d -= f.h; if (d < f.w) return [f.x1 - d, f.y1, 0, 1]; d -= f.w; return [f.x0, f.y1 - d, -1, 0]; };
  const out = E.inCubic(env.pOut || 0), acc = ACC(env), dr = t * 12 * u * SP(env) * (p.right ? 1 : -1);
  for (let i = 0; i < N; i++) {
    const a = per((i + R(s, i, 1) * 0.6) / N * Lp + dr), q = E.outCubic(cl((t - R(s, i, 2) * 0.45) / 0.6));
    const k = (1 - q) + out * 1.2, dist = RR(0.16, 0.5, s, i, 3) * mn * k, tg = RS(s, i, 4) * dist * 0.5, wob = Math.sin(t * 3 + i * 1.7) * 2.5 * u * q;
    const x = a[0] + a[2] * (dist + wob) - a[3] * tg, y = a[1] + a[3] * (dist + wob) + a[2] * tg, al = cl(q * 3) * (1 - out), big = i % 5 === 0;
    if (k > 0.02) seg(env, x, y, x + a[2] * dist * 0.22 - a[3] * tg * 0.22, y + a[3] * dist * 0.22 + a[2] * tg * 0.22, sc.fg, 1.2 * u, 0.4 * al);
    dot(env, x, y, (big ? 5.5 : 3.4) * u, big ? acc : sc.fg, al * 0.95);
  }
});

/* 振り子の波 — a row of pendulums of graded length swings in and out of phase, forming travelling wave patterns */
D('xmPendulum', '振り子の波', 'Pendulum Wave', ['calm', 'graphic', 'emotional'], 1, 'dots', 'front', (env, bb, p, t, o, u) => {
  const { W, H, sc } = env, gap = 16 * u, rb = 8.5 * u, m = MG(env) * 0.5;
  const dn = H - m - bb.y1 - gap - rb * 2, up = bb.y0 - gap - rb * 2 - m;
  let low = p.low; if ((low ? dn : up) < 64 * u) low = !low;
  const room = low ? dn : up; if (room < 40 * u) return;
  const Lmax = Math.min((p.big ? 200 : 150) * u, room), py = low ? bb.y1 + gap : bb.y0 - gap - rb * 2 - Lmax;
  const cx = (bb.x0 + bb.x1) / 2, wid = Math.min(Math.max(bw(bb), 280 * u), W - m * 4), xa = cl(cx - wid / 2, m * 2, W - m * 2 - wid), xb = xa + wid;
  const N = cl(Math.round(wid / (46 * u)), 5, 17), k0 = 8, Tc = 16 / SP(env), e = ein(t, 0.5, 0, E.outCubic), acc = ACC(env);
  seg(env, lerp((xa + xb) / 2, xa, e), py, lerp((xa + xb) / 2, xb, e), py, sc.fg, 2.2 * u, o, 'butt');
  for (let i = 0; i < N; i++) {
    const x = lerp(xa, xb, (i + 0.5) / N), fq = k0 + i * 8 / N, L = Lmax * Math.pow(k0 / fq, 2) * e * o;
    const an = 24 * DEG * Math.cos(TAU * fq * t / Tc), bx = x + Math.sin(an) * L, by = py + Math.cos(an) * L;
    seg(env, x, py, bx, by, SUB(env), 1.6 * u, 0.85 * o);
    dot(env, bx, by, rb * cl(e * 1.4), i % 4 === 0 ? acc : sc.fg, o);
  }
});

/* 粒の噴水 — particles jet up from the bottom edge in arcs and fall back, born and dying in a loop */
D('xmFountain', '粒の噴水', 'Particle Fountain', ['pop', 'emotional'], 0.9, 'sparks', 'front', (env, bb, p, t, o, u) => {
  const { W, H, sc } = env, s = p.seed, M = 36 + p.n * 12, Tl = 1.25 / SP(env), Tf = Tl * 0.94, acc = ACC(env), a2 = ACC2(env);
  const ems = p.corner ? [0.12, 0.88] : [p.right ? 0.86 : 0.14];
  for (let k = 0; k < ems.length; k++) for (let i = 0; i < M; i++) {
    const ph = t / Tl + (i + R(s, i, k, 9)) / M, j = Math.floor(ph), a = (ph - j) * Tl;
    if (t - a < 0 || a > Tf) continue;
    const h = H * RR(0.22, 0.5, s, i, j, k + 1), v = 4 * h / Tf, g = 2 * v / Tf;
    const x = W * ems[k] + RS(s, i, j, k + 4) * Math.min(W, H) * 0.11 * a, y = H + 6 * u - v * a + g * a * a / 2;
    const al = keepOut(x, y, bb, 40 * u) * o * cl(a * 8);
    dot(env, x, y, RR(5.5, 10, s, i, k + 7) * u * (1 - 0.45 * a / Tf), i % 3 === 0 ? acc : i % 5 === 0 ? a2 : sc.fg, al);
  }
});

/* ドミノ倒し — a row of upright bars topples in a chain along the lyric, then stands back up from the far end */
D('xmDominoes', 'ドミノ倒し', 'Dominoes', ['pop', 'graphic', 'editorial'], 1, 'bars', 'front', (env, bb, p, t, o, u) => {
  const { W, H, sc } = env, gap = 14 * u, h = (p.big ? 68 : 52) * u, w = 8.5 * u, m = MG(env) * 0.4, ctx = env.ctx;
  const dn = H - m - bb.y1 - gap - h, up = bb.y0 - gap - h - m;
  let low = p.low; if ((low ? dn : up) < 0) low = !low; if ((low ? dn : up) < 0) return;
  const yb = low ? bb.y1 + gap + h : bb.y0 - gap, dir = p.right ? 1 : -1;
  let xa = bb.x0 + w, xb = bb.x1 - w; if (xb - xa < 220 * u) { const c = cl((xa + xb) / 2, m + 110 * u, W - m - 110 * u); xa = c - 110 * u; xb = c + 110 * u; }
  const lenAll = xb - xa - h * 0.9, N = cl(Math.ceil(lenAll / (h * 0.66)) + 1, 4, 40), pitch = lenAll / (N - 1);
  const thMax = Math.min(Math.acos(cl(w / pitch, 0, 1)) * 0.985, 86 * DEG), rate = 15 * SP(env), Tf = (N + 3) / rate, T = 2 * Tf + 1.3;
  const tc = t > 0.5 ? mod(t - 0.5, T) : -1, wf = tc * rate, wr = (tc - Tf - 0.7) * rate;
  seg(env, lerp((xa + xb) / 2, xa, ein(t, 0.4)), yb, lerp((xa + xb) / 2, xb, ein(t, 0.4)), yb, SUB(env), 1.4 * u, 0.7 * o, 'butt');
  for (let i = 0; i < N; i++) {
    const he = h * ein(t, 0.3, i * 0.012, E.outBack) * o; if (he <= 0.5) continue;
    const an = tc < 0 ? 0 : (i === N - 1 ? 90 * DEG : thMax) * E.inQuad(cl((wf - i) / 2.2)) * (1 - J.smooth(0, 2.2, wr - (N - 1 - i)));
    const x = dir > 0 ? xa + i * pitch : xb - i * pitch;
    ctx.save(); ctx.translate(x + dir * w / 2, yb); ctx.rotate(dir * an);
    ctx.globalAlpha = o; ctx.fillStyle = i === 0 ? ACC(env) : sc.fg; ctx.fillRect(dir > 0 ? -w : 0, -he, w, he);
    ctx.restore();
  }
});

/* ピンポン — a two-paddle rally in the free band beside the lyric: the ball zigzags, the paddles track it */
D('xmPong', 'ピンポン', 'Pong Rally', ['pop', 'glitch', 'graphic'], 0.6, 'dots', 'front', (env, bb, p, t, o, u) => {
  const { W, sc } = env, m = MG(env), hB = (p.big ? 210 : 160) * u, bd = band(env, bb, hB, p.low, 20 * u, false); if (!bd) return;
  const e = ein(t, 0.45), xa = m * 1.2, xb = W - m * 1.2, pw = 13 * u, ph = 66 * u, bs = 11 * u, sp = SP(env), acc = ACC(env);
  const y0 = bd.y + bs, y1 = bd.y + bd.h - bs, mid = (y0 + y1) / 2;
  const ball = tt => { const k = tri(tt * sp / 2.3 + p.r); return [lerp(xa + pw + bs, xb - pw - bs, k), lerp(y0, y1, tri(tt * sp / 1.37 + p.r * 3)), k]; };
  const b = ball(t), yl = cl(lerp(b[1], mid, b[2] * 0.85), y0 + ph / 2 - bs, y1 - ph / 2 + bs), yr = cl(lerp(mid, b[1], 0.15 + b[2] * 0.85), y0 + ph / 2 - bs, y1 - ph / 2 + bs);
  const off = (1 - e) * 120 * u + (1 - o) * 120 * u;
  box(env, xa - off, yl - ph / 2, pw, ph, b[2] < 0.05 ? acc : sc.fg, o);
  box(env, xb - pw + off, yr - ph / 2, pw, ph, b[2] > 0.95 ? acc : sc.fg, o);
  for (let y = bd.y + 4 * u; y < bd.y + bd.h - 8 * u; y += 22 * u) box(env, W / 2 - 2 * u, y, 4 * u, 11 * u * e, SUB(env), 0.55 * o);
  for (let k = 4; k >= 0; k--) { const q = ball(t - k * 0.035); sq(env, q[0], q[1], bs * (1 - k * 0.12), 0, k ? sc.fg : COL(env, p), (k ? 0.4 - k * 0.08 : 1) * cl(e * 1.2) * o); }
});

/* ベルト運搬 — a conveyor belt beside the lyric carries simple shapes along and drops them off the end */
D('xmConveyor', 'ベルト運搬', 'Conveyor Belt', ['pop', 'graphic'], 0.7, 'shapes', 'front', (env, bb, p, t, o, u) => {
  const { W, sc } = env, s = p.seed, m = MG(env), bd = band(env, bb, 140 * u, p.low, 14 * u); if (!bd) return;
  const ctx = env.ctx, e = ein(t, 0.45, 0, E.outCubic), dir = p.right ? 1 : -1, sz = 17 * u, v = 90 * u * SP(env), spc = 120 * u;
  let xa = Math.max(m, bb.x0 - 30 * u), xb = Math.min(W - m, bb.x1 + 30 * u);
  if (xb - xa < 340 * u) { const c = cl((xa + xb) / 2, m + 170 * u, W - m - 170 * u); xa = c - 170 * u; xb = c + 170 * u; }
  xb -= 50 * u * (dir > 0 ? 1 : 0); xa += 50 * u * (dir > 0 ? 0 : 1);
  const len = xb - xa, yT = bd.y + 58 * u, bt = 16 * u, cx = (xa + xb) / 2, X0 = lerp(cx, xa, e), X1 = lerp(cx, xb, e);
  ctx.globalAlpha = o; ctx.strokeStyle = sc.fg; ctx.lineWidth = 2.6 * u; ctx.lineCap = 'butt';
  ctx.beginPath(); ctx.moveTo(X0, yT); ctx.lineTo(X1, yT); ctx.arc(X1, yT + bt / 2, bt / 2, -90 * DEG, 90 * DEG); ctx.lineTo(X0, yT + bt); ctx.arc(X0, yT + bt / 2, bt / 2, 90 * DEG, 270 * DEG); ctx.stroke();
  ctx.setLineDash([5 * u, 15 * u]); ctx.lineDashOffset = -dir * t * v; ctx.lineWidth = 3 * u; ctx.strokeStyle = SUB(env);
  ctx.beginPath(); ctx.moveTo(X0, yT + bt / 2); ctx.lineTo(X1, yT + bt / 2); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
  const cnt = Math.ceil(len / spc) + 1, loop = cnt * spc, cols = [sc.fg, ACC(env), ACC2(env)];
  for (let i = 0; i < cnt; i++) {
    const raw = i * spc + t * v, d = mod(raw, loop), id = i + Math.floor(raw / loop) * cnt, over = d - len;
    let x = (dir > 0 ? xa : xb) + dir * Math.min(d, len), y = yT - sz - 2 * u, rot = 0, a = cl(d / (26 * u)), sc2 = E.outBack(cl(d / (30 * u))) * ein(t, 0.3, 0.1 + (i % 5) * 0.05, E.outBack);
    if (over > 0) { const tt = over / v; x += dir * over * 0.75; y += Math.min(tt * tt * 900 * u, 60 * u); rot = dir * tt * 5; a = 1 - cl(over / (spc * 0.55)); }
    const ty = Math.floor(R(s, id, 1) * 3), c = cols[Math.floor(R(s, id, 2) * 3)], r = sz * sc2;
    if (ty === 0) dot(env, x, y, r, c, a * o * e);
    else if (ty === 1) sq(env, x, y, r * 0.9, rot, c, a * o * e);
    else { const q = []; for (let k = 0; k < 3; k++) { const an = rot - 90 * DEG + k * TAU / 3; q.push([x + Math.cos(an) * r * 1.2, y + r * 0.2 + Math.sin(an) * r * 1.2]); } fillPoly(env, q, c, a * o * e); }
  }
});

/* ============================================================ shapes that build */

/* 階段ブロック — blocks drop into a screen corner and build a staircase; a dot keeps hopping up the steps */
D('xmStairs', '階段ブロック', 'Step Blocks', ['pop', 'graphic'], 1, 'bars', 'front', (env, bb, p, t, o, u) => {
  const { W, H, sc } = env, b = (p.big ? 56 : 44) * u, S = 4 + p.n, g = 3 * u, sx = p.right ? -1 : 1, sy = p.low ? -1 : 1;
  const X0 = p.right ? W : 0, Y0 = p.low ? H : 0, out = 1 - o, acc = ACC(env);
  const cellX = j => (sx > 0 ? X0 + j * b : X0 - (j + 1) * b), cellY = i => (sy > 0 ? Y0 + i * b : Y0 - (i + 1) * b);
  let idx = 0;
  for (let i = 0; i < S; i++) for (let j = 0; j < S - i; j++, idx++) {
    const q = cl((t - idx * 0.022) / 0.34); if (q <= 0) continue;
    const x = cellX(j), y = cellY(i) + sy * (1 - E.outCubic(q)) * b * 3 - sy * out * b * (S + 1);
    if (hit(x, y, x + b, y + b, bb, 8 * u)) continue;
    box(env, x + g / 2, y + g / 2, b - g, b - g, i === S - 1 - j ? acc : sc.fg, cl(q * 2) * (i === S - 1 - j ? 1 : 0.86));
  }
  const ph = (t - 0.5 - S * S * 0.018) / (0.34 / SP(env)); if (ph < 0) return;
  const jj = Math.floor(ph) % (S + 1), f = ph - Math.floor(ph), r = 9.5 * u; if (jj >= S - 1) return;
  const ja = S - 1 - jj, jb = ja - 1, top = j => Y0 + sy * ((S - j) * b + r + 2 * u), cxs = j => X0 + sx * (j + 0.5) * b;
  const x = lerp(cxs(ja), cxs(jb), f), y = lerp(top(ja), top(jb), f) + sy * 4 * f * (1 - f) * b * 0.7;
  if (keepOut(x, y, bb, 10 * u) > 0.5) dot(env, x, y, r, sc.fg, o);
});

/* 積む立方体 — isometric cubes drop in one after another and stack into a small pile in a free corner */
D('xmIsoCubes', '積む立方体', 'Iso Cubes', ['graphic', 'pop', 'editorial'], 1, 'shapes', 'front', (env, bb, p, t, o, u) => {
  const { sc } = env, s = p.seed, a = (p.big ? 46 : 36) * u, sp = spot(env, bb, a * 5.4, a * 6.2, p, 14 * u); if (!sp) return;
  const ox = sp.cx, oy = sp.y + a * 3.6, kx = a * 0.866, acc = ACC(env);
  const cL = J.mix(sc.fg, sc.bg, 0.55), cR = J.mix(sc.fg, sc.bg, 0.28);
  for (let x = 0; x < 3; x++) for (let y = 0; y < 3; y++) {
    const hgt = x + y === 0 ? 3 : cl(3 - x - y + Math.floor(R(s, x, y, 1) * 2.3), 0, 3);
    for (let z = 0; z < hgt; z++) {
      const q = cl((t - (z + (x + y) * 0.3) * 0.2) / 0.36); if (q <= 0) continue;
      const cx = ox + (x - y) * kx, cy = oy + (x + y) * a / 2 - z * a - a - (1 - E.outCubic(q)) * a * 2.5 - (1 - o) * a * 1.5, al = cl(q * 2.5) * o;
      fillPoly(env, [[cx - kx, cy], [cx, cy + a / 2], [cx, cy + a * 1.5], [cx - kx, cy + a]], cL, al);
      fillPoly(env, [[cx + kx, cy], [cx, cy + a / 2], [cx, cy + a * 1.5], [cx + kx, cy + a]], cR, al);
      fillPoly(env, [[cx, cy - a / 2], [cx + kx, cy], [cx, cy + a / 2], [cx - kx, cy]], z === hgt - 1 && R(s, x, y, 2) < 0.3 ? acc : sc.fg, al);
    }
  }
});

/* スライドパズル — a 3×3 tile puzzle in a free corner; one tile at a time slides into the empty cell */
D('xmSlide', 'スライドパズル', 'Sliding Tiles', ['graphic', 'pop', 'glitch'], 0.8, 'shapes', 'front', (env, bb, p, t, o, u) => {
  const { sc } = env, s = p.seed, ts = (p.big ? 60 : 46) * u, g = 7 * u, wd = ts * 3 + g * 2, sp = spot(env, bb, wd, wd, p, 16 * u); if (!sp) return;
  const grid = [0, 1, 2, 3, 4, 5, 6, 7, -1], stepT = 0.48 / SP(env), ph = Math.max(0, (t - 0.55) / stepT), m = Math.min(Math.floor(ph), 400);
  let hole = 8, prev = -1, mvFrom = -1;
  const next = q => { const c = [], hx = hole % 3, hy = (hole / 3) | 0; if (hx > 0) c.push(hole - 1); if (hx < 2) c.push(hole + 1); if (hy > 0) c.push(hole - 3); if (hy < 2) c.push(hole + 3); const d = c.filter(k => k !== prev); return d[J.h(s, q, 7) % d.length]; };
  for (let q = 0; q <= m; q++) { const k = next(q); if (q === m) { mvFrom = k; break; } grid[hole] = grid[k]; grid[k] = -1; prev = hole; hole = k; }
  const f = t < 0.55 ? 0 : E.inOutCubic(cl((ph - m) / 0.62)), acc = ACC(env);
  for (let c = 0; c < 9; c++) {
    const id = grid[c]; if (id < 0) continue;
    const dst = c === mvFrom ? hole : c, e = ein(t, 0.3, id * 0.035, E.outBack) * o;
    const x = sp.x + lerp(c % 3, dst % 3, c === mvFrom ? f : 0) * (ts + g) + ts / 2, y = sp.y + lerp((c / 3) | 0, (dst / 3) | 0, c === mvFrom ? f : 0) * (ts + g) + ts / 2;
    env.rrect(x - ts / 2 * e, y - ts / 2 * e, ts * e, ts * e, 7 * u, id === 0 ? acc : sc.fg, id === 0 ? 1 : 0.6 + 0.3 * (id % 2), false);
  }
});

/* 歯車 — two meshed gears in a free corner turn against each other at their tooth ratio */
D('xmGears', '歯車', 'Gears', ['graphic', 'editorial', 'pop'], 0.9, 'rings', 'front', (env, bb, p, t, o, u) => {
  const { sc } = env, k = p.big ? 1.9 : 1.5, R1 = 56 * u * k, N1 = 12, N2 = 7, R2 = R1 * N2 / N1, md = 9 * u * k, phi = -28 * DEG;
  const w = R1 + (R1 + R2) * Math.cos(phi) + R2 + md * 2 + 8 * u, h = R1 * 2 + md * 2 + 26 * u * k, sp = spot(env, bb, w, h, p, 14 * u); if (!sp) return;
  const fl = p.right ? -1 : 1, c1x = fl > 0 ? sp.x + md + 4 * u + R1 : sp.x + w - md - 4 * u - R1, c1y = sp.y + h - md - 4 * u - R1;
  const c2x = c1x + fl * (R1 + R2) * Math.cos(phi), c2y = c1y + (R1 + R2) * Math.sin(phi), ph2 = fl > 0 ? phi : Math.PI - phi;
  const e = ein(t, 0.5, 0, E.outBack) * o, e2 = ein(t, 0.5, 0.12, E.outBack) * o, w0 = t * 0.75 * SP(env) + (1 - ein(t, 0.9, 0, E.outCubic)) * 3, ctx = env.ctx;
  const gear = (cx, cy, Rp, N, th, sc1) => {
    const ro = (Rp + md * 0.5) * sc1, ri = (Rp - md * 0.6) * sc1, Pt = TAU / N; ctx.beginPath();
    for (let i = 0; i < N; i++) for (const [fr, rr] of [[0.2, ri], [0.31, ro], [0.69, ro], [0.8, ri]]) { const a = th + (i + fr) * Pt; ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); }
    ctx.closePath();
  };
  const th1 = ph2 + w0, th2 = ph2 + Math.PI - 0.5 * TAU / N2 - w0 * N1 / N2;
  if (e > 0.01) {
    ctx.globalAlpha = cl(e); ctx.strokeStyle = sc.fg; ctx.lineWidth = 2.4 * u; ctx.lineJoin = 'round'; gear(c1x, c1y, R1, N1, th1, e); ctx.stroke();
    for (let i = 0; i < 3; i++) { const a = th1 + i * TAU / 3; seg(env, c1x + Math.cos(a) * R1 * 0.2 * e, c1y + Math.sin(a) * R1 * 0.2 * e, c1x + Math.cos(a) * (R1 - md) * e, c1y + Math.sin(a) * (R1 - md) * e, sc.fg, 2 * u, cl(e), 'butt'); }
    ring(env, c1x, c1y, R1 * 0.2 * e, sc.fg, 2.4 * u, cl(e));
  }
  if (e2 > 0.01) {
    ctx.globalAlpha = cl(e2); ctx.fillStyle = COL(env, p.accent ? { accent: false } : { accent: true }); gear(c2x, c2y, R2, N2, th2, e2); ctx.fill(); ctx.globalAlpha = 1;
    dot(env, c2x, c2y, R2 * 0.26 * e2, sc.bg, cl(e2));
  }
});

/* 並べ替え棒 — a row of shuffled bars sorts itself: neighbours light up and swap places until the heights are in order */
D('xmSortBars', '並べ替え棒', 'Sorting Bars', ['graphic', 'editorial', 'glitch'], 0.9, 'bars', 'front', (env, bb, p, t, o, u) => {
  const { sc } = env, s = p.seed, N = 8 + p.n * 2, k = p.big ? 1.9 : 1.5, bwid = 9 * u * k, pit = 15 * u * k, hm = 84 * u * k;
  const sp = spot(env, bb, N * pit, hm + 8 * u, p, 14 * u); if (!sp) return;
  const arr = []; for (let i = 0; i < N; i++) arr.push(i);
  for (let i = N - 1; i > 0; i--) { const j = J.h(s, i, 3) % (i + 1), q = arr[i]; arr[i] = arr[j]; arr[j] = q; }
  const sw = [], c = arr.slice();
  for (let a = 0; a < N; a++) for (let b = 0; b < N - 1 - a; b++) if (c[b] > c[b + 1]) { const q = c[b]; c[b] = c[b + 1]; c[b + 1] = q; sw.push(b); }
  const stepT = cl((((env.cut && env.cut.dur) || 3) - 1.3) / Math.max(1, sw.length), 0.05, 0.2), ph = Math.max(0, (t - 0.5) / stepT), m = Math.min(Math.floor(ph), sw.length);
  for (let i = 0; i < m; i++) { const b = sw[i], q = arr[b]; arr[b] = arr[b + 1]; arr[b + 1] = q; }
  const cur = m < sw.length && t > 0.5 ? sw[m] : -1, f = E.inOutCubic(cl((ph - m) / 0.8)), acc = ACC(env), yb = sp.y + sp.h - 3 * u;
  const done = cur < 0 && t > 0.5 ? (ph - sw.length) * stepT * 14 : -9;
  seg(env, sp.x, yb + 3 * u, sp.x + N * pit * ein(t, 0.4), yb + 3 * u, SUB(env), 1.4 * u, 0.8 * o, 'butt');
  for (let i = 0; i < N; i++) {
    const h = hm * (arr[i] + 1) / N * ein(t, 0.35, i * 0.02, E.outBack) * o, dx = i === cur ? f : i === cur + 1 && cur >= 0 ? -f : 0;
    const lit = i === cur || (cur >= 0 && i === cur + 1) || Math.abs(done - i) < 1;
    box(env, sp.x + (i + dx) * pit + (pit - bwid) / 2, yb - h, bwid, h, lit ? acc : sc.fg, lit ? 1 : 0.85);
  }
});

/* 分割パイ — a segmented donut assembles wedge by wedge in a free corner; one wedge sits apart and kicks out on the beat */
D('xmPie', '分割パイ', 'Exploded Pie', ['pop', 'editorial', 'graphic'], 0.9, 'shapes', 'front', (env, bb, p, t, o, u) => {
  const { sc } = env, s = p.seed, Rd = (p.big ? 124 : 96) * u, sp = spot(env, bb, Rd * 2 + 50 * u, Rd * 2 + 50 * u, p, 14 * u); if (!sp) return;
  const K = 3 + p.n, fr = []; let sum = 0;
  for (let i = 0; i < K; i++) { fr.push(RR(0.6, 1.7, s, i, 1)); sum += fr[i]; }
  const ctx = env.ctx, pulse = Math.exp(-BT(env, t).since * 7), cols = [ACC(env), env.sc.fg, SUB(env), sc.fg, ACC2(env), SUB(env)];
  let a0 = t * 9 * DEG * SP(env) * (p.right ? 1 : -1) + p.r * TAU;
  for (let i = 0; i < K; i++) {
    const a1 = a0 + fr[i] / sum * TAU, e = ein(t, 0.36, i * 0.07, E.outBack) * o, am = (a0 + a1) / 2, off = (i === 0 ? 12 + 14 * pulse : 0) * u;
    if (e > 0.01) {
      const cx = sp.cx + Math.cos(am) * off, cy = sp.cy + Math.sin(am) * off, gp = 1.6 * DEG;
      ctx.globalAlpha = cl(e) * (i === 0 ? 1 : i % 2 ? 0.88 : 0.7); ctx.fillStyle = cols[i % cols.length];
      ctx.beginPath(); ctx.arc(cx, cy, Rd * e, a0 + gp, a1 - gp); ctx.arc(cx, cy, Rd * 0.44 * e, a1 - gp * 2, a0 + gp * 2, true); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
    }
    a0 = a1;
  }
});

/* 散布図 — a small chart in a free corner: axes draw on, data points pop in one by one, then a trend line runs through them */
D('xmScatter', '散布図', 'Scatter Plot', ['editorial', 'graphic', 'calm'], 0.9, 'dots', 'front', (env, bb, p, t, o, u) => {
  const { sc } = env, s = p.seed, w = (p.big ? 330 : 260) * u, h = w * 0.72, sp = spot(env, bb, w, h, p, 14 * u); if (!sp) return;
  const x0 = sp.x + 10 * u, y0 = sp.y + h - 10 * u, pw = w - 18 * u, phh = h - 18 * u, M = 10 + p.n * 5, up = p.v % 2 === 0, e = ein(t, 0.45, 0, E.outCubic);
  const fy = x => (up ? 0.14 + 0.7 * x : 0.86 - 0.7 * x);
  env.polyPartial([[x0, y0 - phh], [x0, y0], [x0 + pw, y0]], e, sc.fg, 2.6 * u, o, false);
  for (let i = 1; i <= 4; i++) { seg(env, x0 + pw * i / 4.4, y0, x0 + pw * i / 4.4, y0 + 5 * u * e, sc.fg, 1.4 * u, o * e, 'butt'); seg(env, x0, y0 - phh * i / 4.4, x0 - 5 * u * e, y0 - phh * i / 4.4, sc.fg, 1.4 * u, o * e, 'butt'); }
  for (let i = 0; i < M; i++) {
    const x = 0.06 + 0.88 * R(s, i, 1), y = cl(fy(x) + RS(s, i, 2) * 0.15, 0.04, 0.97), q = ein(t, 0.26, 0.3 + i * 0.05, E.outBack);
    dot(env, x0 + x * pw, y0 - y * phh, 5.5 * u * q * o, i % 6 === 2 ? ACC2(env) : sc.fg, 0.95);
  }
  const l = ein(t, 0.5, 0.45 + M * 0.05, E.inOutCubic);
  if (l > 0) seg(env, x0 + 0.03 * pw, y0 - fy(0.03) * phh, x0 + lerp(0.03, 0.97, l) * pw, y0 - fy(lerp(0.03, 0.97, l)) * phh, ACC(env), 3.2 * u, o);
});

/* ============================================================ accents that react */

/* 拍ステップ — a step-sequencer row beside the lyric: the lit square advances one step on every beat */
D('xmBeatSteps', '拍ステップ', 'Beat Steps', ['pop', 'graphic', 'glitch'], 1.1, 'dots', 'front', (env, bb, p, t, o, u) => {
  const { W, sc } = env, K = 8, s2 = (p.big ? 40 : 30) * u, g = s2 * 0.55, wid = K * s2 + (K - 1) * g, m = MG(env);
  const bd = band(env, bb, s2 * 1.7, p.low, 18 * u); if (!bd) return;
  const cx = cl((bb.x0 + bb.x1) / 2, m + wid / 2, W - m - wid / 2), yc = bd.y + bd.h / 2, b = BT(env, t), idx = mod(b.idx, K), pulse = Math.exp(-b.since * 7), acc = ACC(env);
  for (let i = 0; i < K; i++) {
    const e = ein(t, 0.3, i * 0.03, E.outBack) * o, x = cx - wid / 2 + i * (s2 + g) + s2 / 2; if (e <= 0.01) continue;
    if (i === idx) sq(env, x, yc, s2 / 2 * (1 + 0.4 * pulse) * e, 0, acc, 1);
    else if (i < idx) sq(env, x, yc, s2 * 0.4 * e, 0, sc.fg, 0.6);
    else sq(env, x, yc, s2 * 0.4 * e, 0, sc.fg, 0.8, 2.2 * u);
    if (i % 4 === 0) seg(env, x - s2 / 2, yc + bd.s * s2 * 0.82, x + s2 / 2, yc + bd.s * s2 * 0.82, SUB(env), 1.6 * u, 0.8 * cl(e), 'butt');
  }
});

/* 針メーター — an analogue dial in a free corner; the needle follows the loudness of the music */
D('xmGauge', '針メーター', 'Needle Gauge', ['graphic', 'editorial', 'glitch'], 0.9, 'rings', 'front', (env, bb, p, t, o, u) => {
  const { sc } = env, Rd = (p.big ? 140 : 108) * u, sp = spot(env, bb, Rd * 2 + 24 * u, Rd + 30 * u, p, 14 * u); if (!sp) return;
  const cx = sp.cx, cy = sp.y + sp.h - 14 * u, e = ein(t, 0.5, 0, E.outCubic), acc = ACC(env), al = o;
  ring(env, cx, cy, Rd, sc.fg, 2.6 * u, al, Math.PI, Math.PI + Math.PI * e);
  if (e > 0.72) ring(env, cx, cy, Rd - 7 * u, acc, 6 * u, al, Math.PI * 1.72, Math.PI + Math.PI * e);
  for (let i = 0; i <= 10; i++) {
    if (i / 10 > e) break;
    const a = Math.PI * (1 + i / 10), l = (i % 5 === 0 ? 22 : 12) * u;
    seg(env, cx + Math.cos(a) * (Rd - 3 * u), cy + Math.sin(a) * (Rd - 3 * u), cx + Math.cos(a) * (Rd - 3 * u - l), cy + Math.sin(a) * (Rd - 3 * u - l), i >= 8 ? acc : sc.fg, (i % 5 === 0 ? 2.4 : 1.5) * u, al, 'butt');
  }
  const v = lerp(1 - Math.abs(1 - cl(t / 0.5) * 2), EN(env, t, p.seed), cl((t - 0.45) / 0.25)), a = Math.PI * (1 + cl(v, 0.02, 0.98));
  seg(env, cx - Math.cos(a) * 10 * u, cy - Math.sin(a) * 10 * u, cx + Math.cos(a) * Rd * 0.84 * o, cy + Math.sin(a) * Rd * 0.84 * o, v > 0.75 ? acc : sc.fg, 4 * u, al * cl(t / 0.15));
  dot(env, cx, cy, 8 * u * e, sc.fg, al);
});

/* 斜線の影 — an offset drop shadow of the lyric block made only of diagonal hatching that sweeps on and creeps */
D('xmHatch', '斜線の影', 'Hatch Shadow', ['editorial', 'graphic', 'pop'], 1.2, 'stripes', 'front', (env, bb, p, t, o, u) => {
  const { W, H } = env, f = frame(env, bb, PAD(bb, u, 0.8)), d = (18 + p.n * 11) * u, dx = p.right ? d : -d, dy = p.low ? d : -d, ctx = env.ctx;
  const e = ein(t, 0.55, 0, E.inOutCubic), sp = 11 * u, x0 = f.x0 + dx, y0 = f.y0 + dy, cnt = Math.ceil((f.w + f.h) / sp) + 1, off = mod(t * 9 * u * SP(env), sp);
  ctx.beginPath(); ctx.rect(x0, y0, f.w, f.h); ctx.clip();
  ctx.beginPath(); ctx.rect(-10, -10, W + 20, H + 20); ctx.rect(f.x0, f.y0, f.w, f.h); ctx.clip('evenodd');
  ctx.globalAlpha = 0.9 * o; ctx.strokeStyle = COL(env, p); ctx.lineWidth = 2.2 * u; ctx.lineCap = 'butt'; ctx.beginPath();
  const lim = cnt * e;
  for (let k = 0; k < lim && k < 600; k++) { const kk = p.right ? k : cnt - 1 - k, xs = x0 + kk * sp + off; ctx.moveTo(xs, y0); ctx.lineTo(xs - f.h, y0 + f.h); }
  ctx.stroke(); ctx.globalAlpha = 1;
});

/* ============================================================ back-layer patterns (kept faint) */

/* 増える角 — a large faint polygon behind the lyric keeps gaining and losing a corner: triangle → square → … → octagon */
D('xmPolyGrow', '増える角', 'Growing Polygon', ['graphic', 'calm', 'editorial'], 1, 'shapes', 'back', (env, bb, p, t, o, u) => {
  const { W, H } = env, m = Math.min(W, H), c = LN(env), dir = p.right ? 1 : -1;
  const cx = p.corner ? W * (p.right ? 0.8 : 0.2) : W * 0.5, cy = p.corner ? H * (p.low ? 0.74 : 0.26) : H * 0.5;
  const R0 = m * (p.corner ? 0.25 : 0.4) * (p.big ? 1.12 : 1) * ein(t, 0.5, 0, E.outCubic);
  const ph = t / (0.95 / SP(env)), k = Math.floor(ph), f = E.inOutCubic(cl((ph - k) / 0.5));
  const sq2 = n => 3 + (mod(n + p.v, 10) < 5 ? mod(n + p.v, 10) : 10 - mod(n + p.v, 10)), ne = lerp(sq2(k), sq2(k + 1), f);
  const poly = (rad, rot) => { const q = [], mm = Math.ceil(ne - 1e-6); for (let i = 0; i < mm; i++) { const a = rot + i * TAU / ne; q.push([cx + Math.cos(a) * rad, cy + Math.sin(a) * rad]); } return q; };
  const A = poly(R0, -90 * DEG + dir * t * 6 * DEG), B = poly(R0 * 0.62, -90 * DEG - dir * t * 9 * DEG);
  stroke(env, A, c, 4.5 * u, 0.9 * o, true); stroke(env, B, c, 2.4 * u, 0.8 * o, true);
  for (const q of A) dot(env, q[0], q[1], 9 * u, c, o);
}, { subtle: true });

/* 三角タイル — a triangle lattice spreads from a screen corner; cells fill in, breathe and empty again */
D('xmTriLattice', '三角タイル', 'Triangle Lattice', ['graphic', 'pop', 'glitch'], 1, 'grid', 'back', (env, bb, p, t, o, u) => {
  const { W, H } = env, s = p.seed, m = Math.min(W, H), sd = m * 0.088 * (p.big ? 1.2 : 1), hT = sd * 0.866, c = DIM(env), acc = ACC(env);
  const ox = p.right ? W : 0, oy = p.low ? H : 0, sx = p.right ? -1 : 1, sy = p.low ? -1 : 1, reach = m * (0.5 + 0.06 * p.n), rows = Math.ceil(reach / hT), cols = Math.ceil(reach / (sd / 2));
  for (let r = 0; r < rows; r++) for (let q = -1; q < cols; q++) {
    const upT = (q + r) % 2 === 0, gx = (q + 1) * sd / 2, gy = (r + 0.5) * hT, dd = Math.hypot(gx, gy) / reach, fall = cl((1 - dd) * 1.6); if (fall <= 0) continue;
    const e = ein(t, 0.36, dd * 0.5 + R(s, r, q, 1) * 0.22, E.outCubic); if (e <= 0) continue;
    const ya = (upT ? r + 1 : r) * hT, yb = (upT ? r : r + 1) * hT, pts = [[q * sd / 2, ya], [(q + 2) * sd / 2, ya], [gx, yb]], cy2 = (ya * 2 + yb) / 3;
    const P2 = pts.map(v => [ox + sx * (gx + (v[0] - gx) * e * 0.9), oy + sy * (cy2 + (v[1] - cy2) * e * 0.9)]);
    const h = R(s, r, q, 2), tg = 0.5 + 0.5 * Math.sin(t * 0.9 * SP(env) + R(s, r, q, 3) * TAU);
    if (h < 0.05) fillPoly(env, P2, acc, fall * e * o * 0.3 * tg);
    else if (h < 0.48) fillPoly(env, P2, c, fall * e * o * (0.25 + 0.7 * tg));
    else stroke(env, P2, c, 1.6 * u, fall * e * o * 0.8, true);
  }
});

/* 点灯ドット — a dot-matrix panel behind the lyric; a diagonal wave of larger, brighter dots keeps rolling through it */
D('xmDotWave', '点灯ドット', 'Dot Matrix Wave', ['graphic', 'glitch', 'pop', 'calm'], 1.1, 'grid', 'back', (env, bb, p, t, o, u) => {
  const { W, H } = env, m = Math.min(W, H), d = m * 0.042, strip = p.v >= 3, ctx = env.ctx, dir = p.right ? 1 : -1;
  const cols = Math.min(64, Math.floor(W * 0.92 / d)), rows = Math.min(26, Math.max(3, Math.round(H * (strip ? 0.2 : 0.52) / d)));
  const cy = strip ? H * (p.low ? 0.82 : 0.18) : H * 0.5, x0 = W / 2 - (cols - 1) * d / 2, y0 = cy - (rows - 1) * d / 2, sp = SP(env);
  const lit = [];
  ctx.globalAlpha = 0.95 * o; ctx.fillStyle = DIM(env); ctx.beginPath();
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const nx = (i - (cols - 1) / 2) / cols, ny = (j - (rows - 1) / 2) / rows, e = cl(t * 2.6 - Math.hypot(nx, ny) * 2.2); if (e <= 0) continue;
    const wv = Math.pow(0.5 + 0.5 * Math.sin(i * 0.33 * dir + j * 0.52 - t * 2.6 * sp), 3), r = d * (0.085 + 0.2 * wv) * e, x = x0 + i * d, y = y0 + j * d;
    ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, TAU);
    if (wv > 0.7) lit.push(x, y, r * 0.62);
  }
  ctx.fill();
  ctx.globalAlpha = 0.3 * o; ctx.fillStyle = COL(env, p); ctx.beginPath();
  for (let k = 0; k < lit.length; k += 3) { ctx.moveTo(lit[k] + lit[k + 2], lit[k + 1]); ctx.arc(lit[k], lit[k + 1], lit[k + 2], 0, TAU); }
  ctx.fill(); ctx.globalAlpha = 1;
});

/* 等高線 — nested wobbly closed curves like a contour map draw themselves behind the lyric and drift slowly */
D('xmContour', '等高線', 'Contour Lines', ['calm', 'editorial', 'emotional'], 1.1, 'rings', 'back', (env, bb, p, t, o, u) => {
  const { W, H } = env, s = p.seed, m = Math.min(W, H), c = LN(env), ax = W > H ? 1.4 : 1, ay = H > W ? 1.4 : 1, sp = SP(env), M = 60;
  for (let hI = 0; hI < (p.n >= 2 ? 2 : 1); hI++) {
    const cx = W * (hI ? RR(0.12, 0.88, s, hI, 1) : RR(0.38, 0.62, s, 0, 1)), cy = H * (hI ? RR(0.15, 0.85, s, hI, 2) : RR(0.4, 0.6, s, 0, 2)), Rm = m * (hI ? 0.24 : 0.5), K = hI ? 4 : (p.big ? 7 : 6);
    const f1 = R(s, hI, 3) * TAU, f2 = R(s, hI, 4) * TAU, f3 = R(s, hI, 5) * TAU;
    for (let k = 0; k < K; k++) {
      const e = ein(t, 0.8, (K - 1 - k) * 0.06 + hI * 0.2, E.inOutCubic); if (e <= 0) continue;
      const rad = Rm * (k + 0.6) / K, pts = [], cnt = Math.ceil(M * e), wk = 0.5 + 0.5 * k / K;
      for (let i = 0; i <= cnt && i <= M; i++) {
        const th = i / M * TAU + f1, wob = 0.17 * Math.sin(2 * th + f1 + k * 0.25 + t * 0.12 * sp) + 0.1 * Math.sin(3 * th + f2 - k * 0.2 - t * 0.09 * sp) + 0.05 * Math.sin(5 * th + f3 + k * 0.3);
        pts.push([cx + Math.cos(th) * rad * (1 + wob * wk) * ax, cy + Math.sin(th) * rad * (1 + wob * wk) * ay]);
      }
      stroke(env, pts, c, (k % 3 === 0 ? 3.4 : 2) * u, 0.9 * o);
    }
  }
}, { subtle: true });

/* モアレ — two sets of fine concentric rings slide over each other; the interference bands swing round */
D('xmMoire', 'モアレ', 'Moire Rings', ['graphic', 'glitch', 'calm'], 0.6, 'rings', 'back', (env, bb, p, t, o, u) => {
  const { W, H } = env, m = Math.min(W, H), c = LN(env), K = 12 + p.n * 2, spc = m * 0.03, ctx = env.ctx;
  const cx = p.corner ? W * (p.right ? 0.78 : 0.22) : W * 0.5, cy = p.corner ? H * (p.low ? 0.72 : 0.28) : H * 0.5;
  const an = t * 0.4 * SP(env) * (p.right ? 1 : -1) + p.r * TAU, d = spc * 1.5 * ein(t, 0.8, 0, E.outCubic);
  ctx.strokeStyle = c; ctx.lineWidth = 2.4 * u;
  for (let q = 0; q < 2; q++) {
    const x = cx + Math.cos(an) * d * (q ? 1 : -1), y = cy + Math.sin(an) * d * (q ? 1 : -1);
    for (let k = 0; k < K; k++) {
      const e = ein(t, 0.5, k * 0.025, E.outCubic); if (e <= 0) continue;
      ctx.globalAlpha = 0.8 * o * e * (1 - 0.5 * k / K); ctx.beginPath(); ctx.arc(x, y, spc * (k + 1) * (0.6 + 0.4 * e), 0, TAU); ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
}, { subtle: true });

/* 円弧タイル — a patch of quarter-arc tiles grows from a corner; tiles keep turning a quarter so the paths re-route */
D('xmTruchet', '円弧タイル', 'Truchet Tiles', ['graphic', 'pop', 'editorial'], 0.9, 'grid', 'back', (env, bb, p, t, o, u) => {
  const { W, H } = env, s = p.seed, m = Math.min(W, H), c = m * 0.092 * (p.big ? 1.2 : 1), col = LN(env), ctx = env.ctx;
  const ox = p.right ? W : 0, oy = p.low ? H : 0, sx = p.right ? -1 : 1, sy = p.low ? -1 : 1, reach = m * (0.5 + 0.05 * p.n), nn = Math.ceil(reach / c), T = 2.8 / SP(env);
  ctx.strokeStyle = col; ctx.lineWidth = 3.6 * u; ctx.lineCap = 'butt';
  for (let j = 0; j < nn; j++) for (let i = 0; i < nn; i++) {
    const gx = (i + 0.5) * c, gy = (j + 0.5) * c, dd = Math.hypot(gx, gy) / reach, fall = cl((1 - dd) * 1.7); if (fall <= 0) continue;
    const e = ein(t, 0.4, dd * 0.55 + R(s, i, j, 1) * 0.2, E.outBack); if (e <= 0.01) continue;
    const ph = (t + R(s, i, j, 2) * T) / T, fl = Math.floor(ph), turn = (J.h(s, i, j, 3) & 1) + fl - 1 + E.inOutCubic(cl((ph - fl) * T / 0.4));
    ctx.save(); ctx.translate(ox + sx * gx, oy + sy * gy); ctx.rotate(turn * 90 * DEG); ctx.scale(e, e);
    ctx.globalAlpha = fall * o * 0.9; ctx.beginPath();
    ctx.arc(-c / 2, -c / 2, c / 2, 0, 90 * DEG); ctx.moveTo(0, c / 2); ctx.arc(c / 2, c / 2, c / 2, 180 * DEG, 270 * DEG);
    ctx.stroke(); ctx.restore();
  }
  ctx.globalAlpha = 1;
});

/* スピログラフ — a faint spirograph curve is traced by a moving pen behind the lyric, then turns slowly */
D('xmSpiro', 'スピログラフ', 'Spirograph', ['calm', 'graphic', 'emotional'], 0.9, 'rings', 'back', (env, bb, p, t, o, u) => {
  const { W, H } = env, m = Math.min(W, H), [a, b, d] = [[5, 3, 2.2], [7, 3, 2.4], [8, 5, 3.6], [7, 2, 1.6], [9, 4, 3], [10, 3, 2.4]][mod(p.v, 6)];
  const cx = p.corner ? W * (p.right ? 0.78 : 0.22) : W * 0.5, cy = p.corner ? H * (p.low ? 0.72 : 0.28) : H * 0.5;
  const S = m * (p.corner ? 0.25 : 0.4) * (p.big ? 1.1 : 1) / (a - b + d), n = 64 * b, q = E.inOutCubic(cl(t / 1.9)), cnt = Math.ceil(n * q);
  const rot = t * 4 * DEG * SP(env) * (p.right ? 1 : -1) + p.r * TAU, cr = Math.cos(rot), sr = Math.sin(rot), pts = [];
  for (let i = 0; i <= cnt; i++) {
    const th = Math.min(i, n * q) / n * TAU * b, x = (a - b) * Math.cos(th) + d * Math.cos((a - b) / b * th), y = (a - b) * Math.sin(th) - d * Math.sin((a - b) / b * th);
    pts.push([cx + (x * cr - y * sr) * S, cy + (x * sr + y * cr) * S]);
  }
  stroke(env, pts, LN(env), 2.6 * u, 0.95 * o);
  if (q < 1 && pts.length) dot(env, pts[pts.length - 1][0], pts[pts.length - 1][1], 7 * u, SUB(env), 0.7 * o);
}, { subtle: true });

/* 絞り羽根 — a camera-iris of straight blades behind the lyric opens on entry, breathes with the beat and closes on exit */
D('xmIris', '絞り羽根', 'Iris Blades', ['graphic', 'emotional', 'editorial'], 1, 'rings', 'back', (env, bb, p, t, o, u) => {
  const { W, H } = env, m = Math.min(W, H), c = LN(env), N = 5 + p.n;
  const cx = p.corner ? W * (p.right ? 0.78 : 0.22) : W * 0.5, cy = p.corner ? H * (p.low ? 0.7 : 0.3) : H * 0.5, Rd = m * (p.corner ? 0.27 : 0.42) * (p.big ? 1.08 : 1);
  const e = ein(t, 0.6, 0, E.outCubic), pulse = Math.exp(-BT(env, t).since * 5) * (env.beat ? 1 : 0.4);
  const open = cl(e * (0.4 + 0.08 * Math.sin(t * 0.8) + 0.1 * pulse) * (0.15 + 0.85 * o), 0.02, 0.9), r = Rd * open;
  const rot = (t * 8 * SP(env) + (1 - e) * 70) * DEG * (p.right ? 1 : -1), I = [];
  for (let k = 0; k < N; k++) { const a = rot + k * TAU / N; I.push([Math.cos(a) * r, Math.sin(a) * r]); }
  ring(env, cx, cy, Rd, c, 4 * u, 0.9 * o * e); ring(env, cx, cy, Rd * 1.05, c, 1.8 * u, 0.7 * o * e);
  for (let k = 0; k < N; k++) {
    const a = I[k], b = I[(k + 1) % N], L = Math.hypot(a[0] - b[0], a[1] - b[1]) || 1, dx = (a[0] - b[0]) / L, dy = (a[1] - b[1]) / L;
    const pd = a[0] * dx + a[1] * dy, sN = -pd + Math.sqrt(Math.max(0, pd * pd - (r * r - Rd * Rd)));
    seg(env, cx + b[0], cy + b[1], cx + a[0] + dx * sN, cy + a[1] + dy * sN, c, 3 * u, 0.9 * o * e, 'butt');
  }
}, { subtle: true });

/* 渦巻く四角 — squares nested corner-to-edge inside each other form a whirl whose twist slowly tightens and relaxes */
D('xmWhirl', '渦巻く四角', 'Whirl Squares', ['graphic', 'calm', 'glitch'], 0.9, 'shapes', 'back', (env, bb, p, t, o, u) => {
  const { W, H } = env, m = Math.min(W, H), c = LN(env), K = 11 + p.n * 2;
  const cx = p.corner ? W * (p.right ? 0.8 : 0.2) : W * 0.5, cy = p.corner ? H * (p.low ? 0.72 : 0.28) : H * 0.5;
  const dl = (8 + 5 * Math.sin(t * 0.5 * SP(env) + p.r * TAU)) * DEG * (p.right ? 1 : -1), k2 = 1 / (Math.cos(Math.abs(dl)) + Math.sin(Math.abs(dl)));
  let hf = m * (p.corner ? 0.22 : 0.37) * (p.big ? 1.1 : 1) * Math.SQRT2;
  for (let k = 0; k < K; k++, hf *= k2) {
    const e = ein(t, 0.45, k * 0.035, E.outCubic); if (e <= 0) continue;
    const rot = 45 * DEG + k * dl + t * 3 * DEG, pts = [];
    for (let i = 0; i < 4; i++) pts.push([cx + Math.cos(rot + i * TAU / 4) * hf * (0.85 + 0.15 * e), cy + Math.sin(rot + i * TAU / 4) * hf * (0.85 + 0.15 * e)]);
    stroke(env, pts, c, (k % 4 === 0 ? 3 : 2) * u, 0.9 * o * e, true);
  }
}, { subtle: true });

/* 重なる波 — three flat layers of filled waves rise from the bottom (or hang from the top) edge and roll at different speeds */
D('xmWaves', '重なる波', 'Layered Waves', ['calm', 'emotional', 'pop'], 1, 'waveform', 'back', (env, bb, p, t, o, u) => {
  const { W, H } = env, c = DIM(env), sy = p.low ? 1 : -1, edge = p.low ? H + 4 : -4, sp = SP(env), n = 48;
  for (let k = 0; k < 3; k++) {
    const e = ein(t, 0.6, k * 0.08, E.outCubic) * o, yb = H * (p.low ? 0.8 + 0.055 * k : 0.2 - 0.055 * k) + sy * (1 - e) * H * 0.26;
    const wl = W / (1.25 + 0.55 * k + 0.2 * p.n), amp = H * 0.02 * (1 + 0.25 * k), ph = t * (0.9 + 0.5 * k) * sp * (k % 2 ? -1 : 1) * (p.right ? 1 : -1) + k * 1.7 + p.r * 6, pts = [[0, edge]];
    for (let i = 0; i <= n; i++) { const x = W * i / n; pts.push([x, yb + Math.sin(x / wl * TAU + ph) * amp + Math.sin(x / wl * TAU * 0.47 - ph * 0.6) * amp * 0.5]); }
    pts.push([W, edge]);
    fillPoly(env, pts, c, 0.5);
  }
}, { subtle: true });
})();
