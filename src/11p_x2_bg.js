/* JIZURA pack: x2bg — 40 quiet moving backgrounds (geometric fields, line fields, dot fields, soft shapes, rules & screens) */
(() => {
'use strict';
const E = J.E;
const P = 'x2bg';
const DEG = J.DEG, TAU = J.TAU, clamp = J.clamp, lerp = J.lerp;

/* ================= shared helpers ================= */
const isDark = c => J.lum(c) < 0.45;
const Umin = env => Math.min(env.W, env.H);
const bs = rng => rng.int(1, 1e9);
const wrap = (v, m) => ((v % m) + m) % m;
const A = (c, a) => J.rgba(c, Math.round(clamp(a) * 1000) / 1000);
const LW = (env, k) => Math.max(1.5, Umin(env) * k);
// a light that still shows on the scheme background (white on mid tones, accent tint on near-white paper)
const lightOf = sc => { const L = J.lum(sc.bg); return L < 0.45 ? sc.fg : L < 0.78 ? '#FFFFFF' : J.mix(sc.accent, '#FFFFFF', 0.25); };

// time since this background started (consecutive cuts that share the same bg + seed count as one run)
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
const fadeIn = (env, d = 0.6) => E.outCubic(clamp(bgT(env) / d));
const bg = (k, d) => J.register('bg', k, Object.assign({}, d, { draw(env, Q) { const ctx = env.ctx; ctx.save(); try { d.draw(env, Q || {}, ctx); } finally { ctx.restore(); } } }), P);
const polyPath = (ctx, cx, cy, R, n, rot) => {
  for (let i = 0; i < n; i++) { const a = rot + i / n * TAU, x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
  ctx.closePath();
};
const dot = (ctx, x, y, r) => { ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, TAU); };
const stadium = (ctx, x, y, w, h) => { const r = h / 2; ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.arc(x + w - r, y + r, r, -Math.PI / 2, Math.PI / 2); ctx.lineTo(x + r, y + h); ctx.arc(x + r, y + r, r, Math.PI / 2, Math.PI * 1.5); ctx.closePath(); };

/* ================= GEOMETRIC FIELDS ================= */
bg('xpDriftBars', { name: '漂う帯', en: 'Drifting Bars', tags: ['calm', 'graphic', 'editorial'], w: 1.1, subtle: true,
  plan: rng => ({ seed: bs(rng), n: rng.int(5, 7), vert: rng.chance(0.7), k: rng.range(0.045, 0.06) }),
  draw(env, Q, ctx) {
    const { W, H, sc } = env, s = Q.seed || 1, t = env.t, vert = Q.vert !== false, L = vert ? W : H, n = Q.n || 6, k = Q.k || 0.04;
    ctx.globalAlpha = fadeIn(env);
    for (let i = 0; i < n; i++) {
      const w = L * (0.07 + 0.2 * J.r(s, i, 1)), v = (0.012 + 0.028 * J.r(s, i, 2)) * (J.r(s, i, 3) < 0.5 ? -1 : 1), x = wrap(J.r(s, i, 4) * (L + w) + t * v * L, L + w) - w;
      ctx.fillStyle = i === 1 ? A(sc.accent, k * 1.1) : A(sc.fg, k * (0.6 + 0.8 * J.r(s, i, 5)));
      if (vert) ctx.fillRect(x, 0, w, H); else ctx.fillRect(0, x, W, w);
    }
  } });

bg('xpBigPolygon', { name: '回る多角形', en: 'Turning Polygon', tags: ['graphic', 'calm', 'pop'], w: 1,
  plan: rng => ({ seed: bs(rng), sides: rng.pick([3, 5, 6, 8]), cx: rng.pick([0.26, 0.74, 0.5]), cy: rng.pick([0.42, 0.58]), spd: rng.range(1.5, 3.2) * rng.pick([1, -1]), k: rng.range(0.04, 0.055) }),
  draw(env, Q, ctx) {
    const { W, H, sc } = env, U = Umin(env), e = fadeIn(env, 0.8), n = Q.sides || 5, k = Q.k || 0.045;
    const cx = W * (Q.cx || 0.5), cy = H * (Q.cy || 0.5), R = U * 0.8 * (0.86 + 0.14 * e), rot = env.t * (Q.spd || 2) * DEG + ((Q.seed || 1) % 60) * DEG;
    ctx.globalAlpha = e;
    ctx.fillStyle = A(sc.fg, k); ctx.beginPath(); polyPath(ctx, cx, cy, R, n, rot); ctx.fill();
    ctx.fillStyle = A(sc.fg, k * 0.8); ctx.beginPath(); polyPath(ctx, cx, cy, R * 0.58, n, -rot * 1.4); ctx.fill();
    ctx.strokeStyle = A(sc.fg, k * 2.2); ctx.lineWidth = LW(env, 0.003); ctx.beginPath(); polyPath(ctx, cx, cy, R * 1.24, n, rot * 0.6); ctx.stroke();
  } });

bg('xpShiftRows', { name: 'ずれる段', en: 'Shifting Rows', tags: ['graphic', 'pop', 'editorial'], w: 0.9,
  plan: rng => ({ seed: bs(rng), ar: rng.range(2.2, 3.4), spd: rng.range(0.05, 0.1), k: rng.range(0.035, 0.05) }),
  draw(env, Q, ctx) {
    const { W, H, sc } = env, s = Q.seed || 1, U = Umin(env), rh = U * 0.105, bw = rh * (Q.ar || 2.6), rows = Math.min(24, Math.ceil(H / rh));
    ctx.globalAlpha = fadeIn(env); ctx.fillStyle = A(sc.fg, Q.k || 0.04); ctx.beginPath();
    for (let j = 0; j < rows; j++) {
      const off = wrap(env.t * bw * (Q.spd || 0.07) * (j % 2 ? -1 : 1) * (0.5 + J.r(s, j)) + J.r(s, j, 2) * bw * 2, bw * 2);
      for (let x = off - bw * 2, c = 0; x < W && c < 14; x += bw * 2, c++) ctx.rect(x, j * rh, bw, rh);
    }
    ctx.fill();
  } });

bg('xpNestTri', { name: 'ねじれ三角', en: 'Twisted Triangles', tags: ['graphic', 'calm', 'glitch'], w: 0.8,
  plan: rng => ({ seed: bs(rng), sides: rng.pick([3, 3, 5]), cy: rng.pick([0.5, 0.56]), k: rng.range(0.085, 0.11) }),
  draw(env, Q, ctx) {
    const { W, H, sc } = env, U = Umin(env), t = env.t, e = fadeIn(env, 0.8), n = Q.sides || 3, cx = W / 2, cy = H * (Q.cy || 0.5);
    ctx.globalAlpha = e; ctx.strokeStyle = A(sc.fg, Q.k || 0.1); ctx.lineWidth = LW(env, 0.005); ctx.lineJoin = 'round'; ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const R = U * (0.14 + i * 0.17) * (1 + 0.05 * Math.sin(t * 0.5 - i * 0.6)) * (0.7 + 0.3 * e);
      polyPath(ctx, cx, cy, R, n, -Math.PI / 2 + Math.sin(t * 0.22 - i * 0.38) * 28 * DEG);
    }
    ctx.stroke();
  } });

bg('xpCornerArcs', { name: '角の扇', en: 'Corner Fans', tags: ['graphic', 'calm', 'pop'], w: 0.9,
  plan: rng => ({ seed: bs(rng), diag: rng.chance(0.5), k: rng.range(0.045, 0.06) }),
  draw(env, Q, ctx) {
    const { W, H, sc } = env, U = Umin(env), t = env.t, e = fadeIn(env, 0.8), k = Q.k || 0.05;
    const cs = Q.diag ? [[0, 0], [W, H]] : [[W, 0], [0, H]];
    ctx.globalAlpha = e;
    for (let c = 0; c < 2; c++) for (let i = 0; i < 5; i++) {
      const r = U * (0.2 + 0.19 * i) * (1 + 0.07 * Math.sin(t * 0.5 - i * 0.7 + c * 2.2)) * (0.6 + 0.4 * e);
      ctx.strokeStyle = A(c && i === 1 ? sc.accent : sc.fg, k * (1 - i * 0.14)); ctx.lineWidth = U * 0.085 * (1 - i * 0.1);
      ctx.beginPath(); ctx.arc(cs[c][0], cs[c][1], r, 0, TAU); ctx.stroke();
    }
  } });

bg('xpPanels', { name: '動く仕切り', en: 'Sliding Panels', tags: ['editorial', 'graphic', 'calm'], w: 1, subtle: true,
  plan: rng => ({ seed: bs(rng), flip: rng.chance(0.5), flipY: rng.chance(0.5), k: rng.range(0.03, 0.042) }),
  draw(env, Q, ctx) {
    const { W, H, sc } = env, t = env.t, s = (Q.seed || 1) % 9, k = Q.k || 0.035;
    if (Q.flip) { ctx.translate(W, 0); ctx.scale(-1, 1); }
    if (Q.flipY) { ctx.translate(0, H); ctx.scale(1, -1); }
    const x1 = W * (0.36 + 0.07 * Math.sin(t * 0.21 + s)), y1 = H * (0.42 + 0.09 * Math.sin(t * 0.17 + s * 2)), x2 = x1 + (W - x1) * (0.5 + 0.18 * Math.sin(t * 0.13 + s * 3));
    ctx.globalAlpha = fadeIn(env);
    ctx.fillStyle = A(sc.fg, k); ctx.fillRect(x1, 0, W - x1, y1);
    ctx.fillStyle = A(sc.accent, k * 1.3); ctx.fillRect(x1, y1, x2 - x1, H - y1);
    ctx.fillStyle = A(sc.fg, k * 2); ctx.fillRect(x2, y1, W - x2, H - y1);
    const lw = LW(env, 0.003); ctx.fillStyle = A(sc.fg, 0.13);
    ctx.fillRect(x1 - lw / 2, 0, lw, H); ctx.fillRect(x1, y1 - lw / 2, W - x1, lw); ctx.fillRect(x2 - lw / 2, y1, lw, H - y1);
  } });

bg('xpPlusField', { name: '回る十字', en: 'Turning Crosses', tags: ['graphic', 'pop', 'editorial'], w: 0.9, subtle: true,
  plan: rng => ({ seed: bs(rng), sp: rng.range(0.11, 0.14), k: rng.range(0.1, 0.13) }),
  draw(env, Q, ctx) {
    const { W, H, sc } = env, U = Umin(env), t = env.t, sp = U * (Q.sp || 0.12), arm = sp * 0.17;
    const nx = Math.min(30, Math.ceil(W / sp) + 1), ny = Math.min(30, Math.ceil(H / sp) + 1), ox = (W - (nx - 1) * sp) / 2, oy = (H - (ny - 1) * sp) / 2;
    ctx.globalAlpha = fadeIn(env); ctx.strokeStyle = A(sc.fg, Q.k || 0.11); ctx.lineWidth = LW(env, 0.0035); ctx.beginPath();
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const x = ox + i * sp, y = oy + j * sp, a = E.inOutCubic(0.5 + 0.5 * Math.sin(t * 0.7 - i * 0.42 - j * 0.3)) * Math.PI / 2, c = Math.cos(a) * arm, d = Math.sin(a) * arm;
      ctx.moveTo(x - c, y - d); ctx.lineTo(x + c, y + d); ctx.moveTo(x + d, y - c); ctx.lineTo(x - d, y + c);
    }
    ctx.stroke();
  } });

bg('xpFoldPlanes', { name: '折り重なる面', en: 'Folded Planes', tags: ['calm', 'emotional', 'editorial'], w: 1.1, subtle: true,
  plan: rng => ({ seed: bs(rng), k: rng.range(0.035, 0.05) }),
  draw(env, Q, ctx) {
    const { W, H, sc } = env, s = Q.seed || 1, t = env.t, k = Q.k || 0.04;
    ctx.globalAlpha = fadeIn(env, 0.8); ctx.lineWidth = LW(env, 0.002); ctx.lineJoin = 'round';
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      for (let j = 0; j < 3; j++) {
        const a = TAU * (J.r(s, i, j) * 0.25 + j / 3 + i * 0.13), rd = 0.5 + 0.4 * J.r(s, i, j, 2);
        const x = W * (0.5 + Math.cos(a) * rd + 0.14 * J.noise1(t * 0.07 + j * 3.1, s + i * 7 + j)), y = H * (0.5 + Math.sin(a) * rd + 0.14 * J.noise1(t * 0.06 + j * 5.3, s + i * 11 + j + 40));
        if (j) ctx.lineTo(x, y); else ctx.moveTo(x, y);
      }
      ctx.closePath();
      ctx.fillStyle = A(i === 2 ? sc.accent : sc.fg, k); ctx.fill();
      ctx.strokeStyle = A(sc.fg, k * 1.6); ctx.stroke();
    }
  } });

/* ================= LINE FIELDS ================= */
bg('xpFlowLines', { name: '流れる線', en: 'Flow Lines', tags: ['calm', 'emotional', 'editorial'], w: 1.2, subtle: true,
  plan: rng => ({ seed: bs(rng), n: rng.int(16, 24), horiz: rng.chance(0.35), k: rng.range(0.13, 0.16) }),
  draw(env, Q, ctx) {
    const { W, H, sc } = env, s = Q.seed || 1, t = env.t, hz = !!Q.horiz, L = hz ? W : H, X = hz ? H : W, n = Q.n || 20, amp = X * 0.075, ST = 26;
    ctx.globalAlpha = fadeIn(env); ctx.strokeStyle = A(sc.fg, Q.k || 0.11); ctx.lineWidth = LW(env, 0.0022); ctx.lineJoin = 'round'; ctx.beginPath();
    for (let i = -1; i <= n; i++) {
      const base = (i + 0.5) / n * X;
      for (let q = 0; q <= ST; q++) {
        const u = q / ST, v = base + amp * (J.noise1(u * 2.2 + t * 0.12 + i * 0.09, s) + 0.5 * J.noise1(u * 5 - t * 0.2 + i * 0.05, s + 9)), a = u * L;
        if (q) ctx.lineTo(hz ? a : v, hz ? v : a); else ctx.moveTo(hz ? a : v, hz ? v : a);
      }
    }
    ctx.stroke();
  } });

bg('xpHorizonLines', { name: '遠近の横線', en: 'Depth Rules', tags: ['calm', 'graphic', 'emotional'], w: 0.9,
  plan: rng => ({ seed: bs(rng), cy: rng.pick([0.5, 0.42, 0.6]), spd: rng.range(0.035, 0.06), k: rng.range(0.085, 0.11) }),
  draw(env, Q, ctx) {
    const { W, H, sc } = env, U = Umin(env), t = env.t, e = fadeIn(env), n = 9, k = Q.k || 0.09;
    const y0 = H * ((Q.cy || 0.5) + 0.04 * Math.sin(t * 0.19));
    ctx.globalAlpha = e;
    for (let i = 0; i < n; i++) {
      const p = wrap(i / n + t * (Q.spd || 0.045), 1), d = H * 0.66 * Math.pow(p, 2.3), lw = Math.max(1.5, U * 0.011 * p);
      ctx.fillStyle = A(sc.fg, k * Math.min(1, p * 4) * (1 - J.smooth(0.8, 1, p)));
      ctx.fillRect(0, y0 + d - lw / 2, W, lw); ctx.fillRect(0, y0 - d - lw / 2, W, lw);
    }
    ctx.fillStyle = A(sc.accent, 0.22); ctx.fillRect(W * 0.5 * (1 - e), y0 - 1, W * e, 2);
  } });

bg('xpDialTicks', { name: '目盛りの輪', en: 'Dial Ticks', tags: ['editorial', 'graphic', 'glitch'], w: 0.9, subtle: true,
  plan: rng => ({ seed: bs(rng), cx: rng.pick([0.5, 0.5, 0.18, 0.82]), cy: rng.pick([0.5, 0.5, 0.62]), spd: rng.range(1.5, 3) * rng.pick([1, -1]), k: rng.range(0.17, 0.21) }),
  draw(env, Q, ctx) {
    const { W, H, sc } = env, U = Umin(env), e = fadeIn(env, 0.8), cx = W * (Q.cx || 0.5), cy = H * (Q.cy || 0.5), NS = [48, 72, 120, 180], RS = [0.3, 0.47, 0.7, 1.02], SP = [1, -0.6, 0.35, -0.2];
    ctx.globalAlpha = e; ctx.strokeStyle = A(sc.fg, Q.k || 0.12); ctx.lineWidth = LW(env, 0.0034); ctx.beginPath();
    for (let r = 0; r < 4; r++) {
      const N = NS[r], R = U * RS[r] * (0.85 + 0.15 * e), rot = env.t * (Q.spd || 2) * SP[r] * DEG;
      for (let i = 0; i < N; i++) {
        const a = rot + i / N * TAU, c = Math.cos(a), d = Math.sin(a), len = U * (i % 6 ? 0.016 : 0.04);
        ctx.moveTo(cx + c * R, cy + d * R); ctx.lineTo(cx + c * (R + len), cy + d * (R + len));
      }
    }
    ctx.stroke();
  } });

bg('xpSineWeave', { name: '編む波線', en: 'Woven Waves', tags: ['calm', 'pop', 'emotional'], w: 0.9,
  plan: rng => ({ seed: bs(rng), k: rng.range(0.12, 0.15), spd: rng.range(0.25, 0.45) }),
  draw(env, Q, ctx) {
    const { W, H, sc } = env, s = Q.seed || 1, t = env.t, nb = H > W ? 5 : 3, amp = H / nb * 0.3, ST = 44;
    ctx.globalAlpha = fadeIn(env); ctx.strokeStyle = A(sc.fg, Q.k || 0.1); ctx.lineWidth = LW(env, 0.0035); ctx.lineJoin = 'round'; ctx.beginPath();
    for (let b = 0; b < nb; b++) {
      const cy = H * (b + 0.5) / nb, kx = TAU * (1.3 + 1.2 * J.r(s, b)), ph = J.r(s, b, 2) * TAU + t * (Q.spd || 0.3) * (b % 2 ? -1 : 1);
      for (let sg = -1; sg <= 1; sg += 2) for (let q = 0; q <= ST; q++) {
        const u = q / ST, y = cy + sg * amp * Math.sin(u * kx + ph) * (0.75 + 0.25 * Math.sin(u * 3.1 + t * 0.2 + b));
        if (q) ctx.lineTo(u * W, y); else ctx.moveTo(0, y);
      }
    }
    ctx.stroke();
  } });

bg('xpLissajous', { name: 'リサージュ', en: 'Lissajous Curve', tags: ['calm', 'graphic', 'editorial'], w: 0.9, subtle: true,
  plan: rng => ({ seed: bs(rng), ab: rng.pick([[3, 2], [5, 4], [3, 4], [5, 3], [2, 1]]), spd: rng.range(0.08, 0.14), k: rng.range(0.14, 0.17) }),
  draw(env, Q, ctx) {
    const { W, H, sc } = env, e = fadeIn(env, 1), ab = Q.ab || [3, 2], N = 260, k = Q.k || 0.12, cx = W / 2, cy = H / 2, rx = W * 0.46, ry = H * 0.44;
    ctx.globalAlpha = e; ctx.lineWidth = LW(env, 0.0026); ctx.lineJoin = 'round';
    for (let c = 0; c < 2; c++) {
      const dl = env.t * (Q.spd || 0.1) - c * 0.35 + ((Q.seed || 1) % 6);
      ctx.strokeStyle = A(sc.fg, k * (c ? 0.45 : 1)); ctx.beginPath();
      for (let i = 0; i <= N * e; i++) { const th = i / N * TAU, x = cx + rx * Math.sin(ab[0] * th + dl), y = cy + ry * Math.sin(ab[1] * th); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
      ctx.stroke();
    }
  } });

bg('xpPendulums', { name: '振り子の糸', en: 'Pendulum Strings', tags: ['calm', 'emotional', 'editorial'], w: 0.8,
  plan: rng => ({ seed: bs(rng), k: rng.range(0.15, 0.19), amp: rng.range(5, 9) }),
  draw(env, Q, ctx) {
    const { W, H, sc } = env, s = Q.seed || 1, U = Umin(env), t = env.t, e = fadeIn(env, 0.9), n = Math.min(18, Math.round(W / (U * 0.14))), k = Q.k || 0.11, pts = [];
    ctx.globalAlpha = e; ctx.strokeStyle = A(sc.fg, k); ctx.lineWidth = LW(env, 0.002); ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const x = W * (i + 0.5 + 0.3 * J.rs(s, i, 1)) / n, L = H * (0.28 + 0.55 * J.r(s, i, 2)) * e, a = (Q.amp || 7) * DEG * Math.sin(t * 0.9 / Math.sqrt(0.3 + L / H) + J.r(s, i, 3) * TAU);
      const ex = x + Math.sin(a) * L, ey = Math.cos(a) * L;
      ctx.moveTo(x, 0); ctx.lineTo(ex, ey); pts.push(ex, ey, U * (0.008 + 0.01 * J.r(s, i, 4)));
    }
    ctx.stroke();
    ctx.fillStyle = A(sc.fg, k * 1.3); ctx.beginPath(); for (let i = 0; i < pts.length; i += 3) dot(ctx, pts[i], pts[i + 1], pts[i + 2]); ctx.fill();
  } });

bg('xpOrbits', { name: '軌道', en: 'Orbits', tags: ['calm', 'emotional', 'graphic'], w: 1, subtle: true,
  plan: rng => ({ seed: bs(rng), tilt: rng.range(-28, 28), cx: rng.pick([0.5, 0.36, 0.64]), spd: rng.range(0.25, 0.4), k: rng.range(0.15, 0.19) }),
  draw(env, Q, ctx) {
    const { W, H, sc } = env, s = Q.seed || 1, U = Umin(env), e = fadeIn(env, 0.9), k = Q.k || 0.11, big = Math.max(W, H);
    ctx.globalAlpha = e; ctx.translate(W * (Q.cx || 0.5), H * 0.5); ctx.rotate((Q.tilt || 0) * DEG + (H > W ? 90 * DEG : 0));
    ctx.strokeStyle = A(sc.fg, k); ctx.lineWidth = LW(env, 0.002); ctx.beginPath();
    const pl = [];
    for (let i = 0; i < 5; i++) {
      const rx = big * (0.16 + 0.13 * i) * (0.8 + 0.2 * e), ry = rx * 0.36, a = env.t * (Q.spd || 0.3) / (0.6 + i * 0.5) * (i % 2 ? -1 : 1) + J.r(s, i) * TAU;
      ctx.moveTo(rx, 0); ctx.ellipse(0, 0, rx, ry, 0, 0, TAU);
      pl.push(Math.cos(a) * rx, Math.sin(a) * ry, U * (0.009 + 0.008 * J.r(s, i, 2)));
    }
    ctx.stroke();
    ctx.fillStyle = A(sc.fg, k * 0.6); ctx.beginPath(); dot(ctx, 0, 0, U * 0.035); ctx.fill();
    ctx.fillStyle = A(sc.accent, 0.45); ctx.beginPath(); for (let i = 0; i < pl.length; i += 3) dot(ctx, pl[i], pl[i + 1], pl[i + 2]); ctx.fill();
  } });

bg('xpMarchDash', { name: '流れる破線', en: 'Marching Dashes', tags: ['graphic', 'pop', 'glitch'], w: 0.9,
  plan: rng => ({ seed: bs(rng), n: rng.int(9, 13), spd: rng.range(0.03, 0.06), k: rng.range(0.1, 0.13) }),
  draw(env, Q, ctx) {
    const { W, H, sc } = env, s = Q.seed || 1, U = Umin(env), n = Q.n || 11, k = Q.k || 0.08;
    ctx.globalAlpha = fadeIn(env); ctx.lineWidth = LW(env, 0.005);
    for (let i = 0; i < n; i++) {
      const y = H * (i + 0.5) / n, d = U * (0.04 + 0.24 * J.r(s, i)), g = d * (0.5 + J.r(s, i, 2));
      ctx.setLineDash([d, g]); ctx.lineDashOffset = -env.t * U * (Q.spd || 0.04) * (i % 2 ? -1 : 1) * (0.5 + 1.5 * J.r(s, i, 3)) + J.r(s, i, 4) * (d + g);
      ctx.strokeStyle = A(i === (s % n) ? sc.accent : sc.fg, k * (0.7 + 0.7 * J.r(s, i, 5)));
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
  } });

bg('xpDepthGrid', { name: '迫る方眼', en: 'Zooming Grid', tags: ['glitch', 'graphic', 'editorial'], w: 0.8,
  plan: rng => ({ seed: bs(rng), spd: rng.range(0.035, 0.06), k: rng.range(0.1, 0.13) }),
  draw(env, Q, ctx) {
    const { W, H, sc } = env, U = Umin(env), base = U * 0.1, cx = W / 2, cy = H / 2, e = fadeIn(env);
    for (let l = 0; l < 3; l++) {
      const p = wrap(env.t * (Q.spd || 0.045) + l / 3, 1), cell = base * Math.pow(2, p), lw = Math.max(1.2, U * 0.0016 * (1 + p)), nx = Math.min(16, Math.ceil(cx / cell)), ny = Math.min(16, Math.ceil(cy / cell));
      ctx.globalAlpha = e; ctx.fillStyle = A(sc.fg, (Q.k || 0.11) * Math.sin(Math.PI * p)); ctx.beginPath();
      for (let i = -nx; i <= nx; i++) ctx.rect(cx + (i + 0.5) * cell - lw / 2, 0, lw, H);
      for (let j = -ny; j <= ny; j++) ctx.rect(0, cy + (j + 0.5) * cell - lw / 2, W, lw);
      ctx.fill();
    }
  } });

bg('xpStringArt', { name: '糸の曲線', en: 'String Curves', tags: ['calm', 'graphic', 'editorial'], w: 0.9, subtle: true,
  plan: rng => ({ seed: bs(rng), diag: rng.chance(0.5), spd: rng.range(0.04, 0.07), k: rng.range(0.1, 0.13) }),
  draw(env, Q, ctx) {
    const { W, H, sc } = env, e = fadeIn(env, 0.9), N = 22, fr = wrap(env.t * (Q.spd || 0.05), 1);
    const cs = Q.diag ? [[0, 0, 1, 1], [W, H, -1, -1]] : [[W, 0, -1, 1], [0, H, 1, -1]];
    ctx.globalAlpha = e; ctx.strokeStyle = A(sc.fg, Q.k || 0.11); ctx.lineWidth = LW(env, 0.0018); ctx.beginPath();
    for (let c = 0; c < 2; c++) {
      const [x0, y0, dx, dy] = cs[c], Lx = W * 0.85 * e, Ly = H * 0.85 * e;
      for (let i = 0; i < N; i++) { const u = (i + (c ? 1 - fr : fr)) / N; ctx.moveTo(x0, y0 + dy * Ly * (1 - u)); ctx.lineTo(x0 + dx * Lx * u, y0); }
    }
    ctx.stroke();
  } });

/* ================= DOT / PARTICLE FIELDS ================= */
bg('xpDotSheet', { name: '波打つ点の面', en: 'Waving Dot Sheet', tags: ['calm', 'emotional', 'graphic'], w: 1.1,
  plan: rng => ({ seed: bs(rng), top: rng.chance(0.3), k: rng.range(0.16, 0.2) }),
  draw(env, Q, ctx) {
    const { W, H, sc } = env, U = Umin(env), t = env.t, cols = 26, rows = 12;
    if (Q.top) { ctx.translate(0, H); ctx.scale(1, -1); }
    ctx.globalAlpha = fadeIn(env); ctx.fillStyle = A(sc.fg, Q.k || 0.18); ctx.beginPath();
    for (let j = 0; j < rows; j++) {
      const f = j / (rows - 1), near = 1 - f, yb = H * (0.4 + 0.58 * Math.pow(near, 1.7)), sz = 0.4 + 0.6 * near;
      for (let i = 0; i < cols; i++) {
        const h = Math.sin(i * 0.45 + t * 0.9 + j * 0.2) * Math.cos(j * 0.6 - t * 0.5);
        dot(ctx, W * (-0.06 + 1.12 * i / (cols - 1)) + U * 0.02 * j, yb - h * U * 0.04 * sz, U * 0.0065 * sz * (1 + 0.45 * h));
      }
    }
    ctx.fill();
  } });

bg('xpWindStreaks', { name: '風の筋', en: 'Wind Streaks', tags: ['emotional', 'calm', 'pop'], w: 1, subtle: true,
  plan: rng => ({ seed: bs(rng), ang: rng.range(-10, 10), dir: rng.pick([1, -1]), spd: rng.range(0.05, 0.09), k: rng.range(0.17, 0.21) }),
  draw(env, Q, ctx) {
    const { W, H, sc } = env, s = Q.seed || 1, U = Umin(env), t = env.t, D = Math.hypot(W, H), k = Q.k || 0.11;
    ctx.globalAlpha = fadeIn(env); ctx.translate(W / 2, H / 2); ctx.rotate((Q.ang || 0) * DEG); ctx.lineCap = 'round';
    for (let b = 0; b < 3; b++) {
      const d = (b + 1) / 3;
      ctx.strokeStyle = A(sc.fg, k * (0.45 + 0.55 * d)); ctx.lineWidth = Math.max(1.2, U * 0.0018 * (1 + d * 1.4)); ctx.beginPath();
      for (let i = 0; i < 14; i++) {
        const len = U * (0.05 + 0.16 * d) * (0.6 + 0.8 * J.r(s, b, i, 1)), x = wrap(J.r(s, b, i, 2) * (D + len) + (Q.dir || 1) * t * D * (Q.spd || 0.07) * (0.4 + d), D + len) - D / 2 - len;
        const y = (J.r(s, b, i, 3) - 0.5) * D + U * 0.012 * Math.sin(t * 0.8 + i);
        ctx.moveTo(x, y); ctx.lineTo(x + len, y);
      }
      ctx.stroke();
    }
  } });

bg('xpPlexus', { name: '点と線の網', en: 'Node Network', tags: ['glitch', 'editorial', 'calm'], w: 0.9,
  plan: rng => ({ seed: bs(rng), n: rng.int(20, 26), k: rng.range(0.2, 0.25) }),
  draw(env, Q, ctx) {
    const { W, H, sc } = env, s = Q.seed || 1, U = Umin(env), t = env.t, n = Math.min(28, Q.n || 24), D = Math.max(W, H) * 0.24, k = Q.k || 0.13, xs = [], ys = [];
    for (let i = 0; i < n; i++) {
      xs.push(W * (J.r(s, i, 1) * 1.1 - 0.05) + U * 0.07 * Math.sin(t * (0.15 + 0.2 * J.r(s, i, 3)) + J.r(s, i, 4) * TAU));
      ys.push(H * (J.r(s, i, 2) * 1.1 - 0.05) + U * 0.07 * Math.cos(t * (0.13 + 0.2 * J.r(s, i, 5)) + J.r(s, i, 6) * TAU));
    }
    ctx.globalAlpha = fadeIn(env); ctx.lineWidth = LW(env, 0.0018);
    for (let b = 0; b < 3; b++) {
      ctx.strokeStyle = A(sc.fg, k * (b + 1) / 3); ctx.beginPath();
      for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
        const d = Math.hypot(xs[i] - xs[j], ys[i] - ys[j]); if (d >= D) continue;
        if (Math.min(2, Math.floor((1 - d / D) * 3)) === b) { ctx.moveTo(xs[i], ys[i]); ctx.lineTo(xs[j], ys[j]); }
      }
      ctx.stroke();
    }
    ctx.fillStyle = A(sc.fg, k * 1.5); ctx.beginPath(); for (let i = 0; i < n; i++) dot(ctx, xs[i], ys[i], U * 0.005); ctx.fill();
  } });

bg('xpPhyllo', { name: '螺旋の点', en: 'Seed Spiral', tags: ['calm', 'pop', 'graphic'], w: 0.9,
  plan: rng => ({ seed: bs(rng), cx: rng.pick([0.5, 0.5, 0.2, 0.8]), cy: rng.pick([0.5, 0.5, 0.7]), spd: rng.range(1.2, 2.4) * rng.pick([1, -1]), k: rng.range(0.13, 0.16) }),
  draw(env, Q, ctx) {
    const { W, H, sc } = env, U = Umin(env), t = env.t, e = fadeIn(env, 0.9), N = 380, cx = W * (Q.cx || 0.5), cy = H * (Q.cy || 0.5);
    const c = Math.hypot(W, H) * 0.72 / Math.sqrt(N), rot = t * (Q.spd || 1.6) * DEG, GA = 137.508 * DEG;
    ctx.globalAlpha = e; ctx.fillStyle = A(sc.fg, Q.k || 0.14); ctx.beginPath();
    for (let i = 1; i < N * e; i++) {
      const q = Math.sqrt(i), r = c * q, a = i * GA + rot, x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
      if (x < -20 || y < -20 || x > W + 20 || y > H + 20) continue;
      dot(ctx, x, y, U * 0.0095 * (0.75 + 0.45 * Math.sin(t * 0.8 - q * 0.6)));
    }
    ctx.fill();
  } });

bg('xpBlinkCells', { name: '明滅タイル', en: 'Blinking Cells', tags: ['glitch', 'graphic', 'pop'], w: 0.9,
  plan: rng => ({ seed: bs(rng), cell: rng.range(0.085, 0.11), k: rng.range(0.08, 0.1) }),
  draw(env, Q, ctx) {
    const { W, H, sc } = env, s = Q.seed || 1, U = Umin(env), t = env.t, cell = U * (Q.cell || 0.095), gap = cell * 0.06, k = Q.k || 0.09;
    const nx = Math.min(28, Math.ceil(W / cell)), ny = Math.min(28, Math.ceil(H / cell)), ox = (W - nx * cell) / 2, oy = (H - ny * cell) / 2, B = [[], [], []];
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const v = J.noise1(t * 0.45 + J.r(s, i, j) * 60, (s + i * 31 + j * 17) % 9973) - 0.3;
      if (v > 0) B[Math.min(2, Math.floor(v * 6))].push(ox + i * cell + gap, oy + j * cell + gap);
    }
    ctx.globalAlpha = fadeIn(env);
    for (let b = 0; b < 3; b++) {
      const L = B[b]; if (!L.length) continue;
      ctx.fillStyle = A(sc.fg, k * (b + 1) / 3); ctx.beginPath();
      for (let i = 0; i < L.length; i += 2) ctx.rect(L[i], L[i + 1], cell - gap * 2, cell - gap * 2);
      ctx.fill();
    }
  } });

bg('xpDriftMarks', { name: '漂う記号', en: 'Drifting Marks', tags: ['pop', 'graphic', 'editorial'], w: 1, subtle: true,
  plan: rng => ({ seed: bs(rng), n: rng.int(14, 20), k: rng.range(0.16, 0.2) }),
  draw(env, Q, ctx) {
    const { W, H, sc } = env, s = Q.seed || 1, U = Umin(env), t = env.t, n = Math.min(24, Q.n || 16), M = U * 0.1;
    ctx.globalAlpha = fadeIn(env); ctx.strokeStyle = A(sc.fg, Q.k || 0.13); ctx.lineWidth = LW(env, 0.003); ctx.lineJoin = 'round'; ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const r = U * (0.018 + 0.03 * J.r(s, i, 1)), x = wrap(J.r(s, i, 2) * (W + M * 2) + t * U * 0.02 * J.rs(s, i, 3), W + M * 2) - M, y = wrap(J.r(s, i, 4) * (H + M * 2) + t * U * 0.014 * J.rs(s, i, 5), H + M * 2) - M;
      const a = t * 0.3 * J.rs(s, i, 6) + J.r(s, i, 7) * TAU, ty = J.h(s, i, 8) % 4;
      if (ty === 0) dot(ctx, x, y, r);
      else if (ty === 1) { const c = Math.cos(a) * r, d = Math.sin(a) * r; ctx.moveTo(x - c, y - d); ctx.lineTo(x + c, y + d); ctx.moveTo(x + d, y - c); ctx.lineTo(x - d, y + c); }
      else polyPath(ctx, x, y, r * 1.15, ty === 2 ? 3 : 4, a);
    }
    ctx.stroke();
  } });

bg('xpRingDots', { name: '巡る点の輪', en: 'Circling Dots', tags: ['calm', 'graphic', 'pop'], w: 0.9, subtle: true,
  plan: rng => ({ seed: bs(rng), spd: rng.range(5, 9) * rng.pick([1, -1]), cy: rng.pick([0.5, 0.5, 0.6]), k: rng.range(0.14, 0.17) }),
  draw(env, Q, ctx) {
    const { W, H, sc } = env, U = Umin(env), e = fadeIn(env, 0.9), cx = W / 2, cy = H * (Q.cy || 0.5), rings = Math.min(9, Math.ceil(Math.hypot(W, H) / 2 / (U * 0.135)));
    ctx.globalAlpha = e; ctx.fillStyle = A(sc.fg, Q.k || 0.15); ctx.beginPath();
    for (let r = 0; r < rings; r++) {
      const R = U * (0.16 + 0.135 * r) * (0.8 + 0.2 * e), N = 8 + r * 8, rot = env.t * (Q.spd || 6) * DEG / (1 + r * 0.6) * (r % 2 ? -1 : 1);
      for (let i = 0; i < N; i++) { const a = rot + i / N * TAU; dot(ctx, cx + Math.cos(a) * R, cy + Math.sin(a) * R, U * (i % 4 ? 0.0055 : 0.01)); }
    }
    ctx.fill();
  } });

/* ================= BIG SOFT SHAPES ================= */
bg('xpTwinDiscs', { name: '重なる円', en: 'Overlapping Discs', tags: ['calm', 'emotional', 'pop'], w: 1.2, subtle: true,
  plan: rng => ({ seed: bs(rng), k: rng.range(0.04, 0.055), ph: rng.range(0, 6) }),
  draw(env, Q, ctx) {
    const { W, H, sc } = env, U = Umin(env), t = env.t, e = fadeIn(env, 0.9), k = Q.k || 0.045, ph = Q.ph || 0, R = U * 0.56 * (0.8 + 0.2 * e), v = H > W;
    const a = 0.2 + 0.07 * Math.sin(t * 0.21 + ph), b = 0.09 * Math.cos(t * 0.17 + ph);
    ctx.globalAlpha = e;
    ctx.fillStyle = A(sc.fg, k); ctx.beginPath(); dot(ctx, W * (0.5 - (v ? b : a)), H * (0.5 - (v ? a : b)), R); ctx.fill();
    ctx.fillStyle = A(sc.accent, k * 1.3); ctx.beginPath(); dot(ctx, W * (0.5 + (v ? b : a)), H * (0.5 + (v ? a : b)), R * 0.9); ctx.fill();
  } });

bg('xpLeanVignette', { name: '傾く周辺の影', en: 'Leaning Vignette', tags: ['emotional', 'calm', 'editorial'], w: 1.1, subtle: true,
  plan: rng => ({ seed: bs(rng), spd: rng.range(0.18, 0.3) * rng.pick([1, -1]), k: rng.range(0.8, 1.1) }),
  draw(env, Q, ctx) {
    const { W, H, sc } = env, U = Umin(env), e = fadeIn(env, 0.9), a = env.t * (Q.spd || 0.22) + ((Q.seed || 1) % 6), dk = isDark(sc.bg);
    const cx = W * (0.5 + 0.24 * Math.cos(a)), cy = H * (0.5 + 0.24 * Math.sin(a)), R = Math.hypot(W, H) * 0.86, k = (Q.k || 1) * e * (dk ? 0.5 : 0.16);
    const g = ctx.createRadialGradient(cx, cy, U * 0.3, cx, cy, R);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.55, `rgba(0,0,0,${(k * 0.4).toFixed(3)})`); g.addColorStop(1, `rgba(0,0,0,${k.toFixed(3)})`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const g2 = ctx.createRadialGradient(cx, cy, 0, cx, cy, U * 0.6);
    g2.addColorStop(0, A(lightOf(sc), 0.07 * e)); g2.addColorStop(1, A(lightOf(sc), 0));
    ctx.fillStyle = g2; ctx.fillRect(cx - U * 0.6, cy - U * 0.6, U * 1.2, U * 1.2);
  } });

bg('xpCapsules', { name: '滑るカプセル', en: 'Sliding Capsules', tags: ['pop', 'graphic', 'calm'], w: 1,
  plan: rng => ({ seed: bs(rng), ang: rng.pick([-32, -20, 20, 32]), spd: rng.range(0.02, 0.035), k: rng.range(0.04, 0.055) }),
  draw(env, Q, ctx) {
    const { W, H, sc } = env, s = Q.seed || 1, U = Umin(env), k = Q.k || 0.045, D = Math.hypot(W, H), hh = U * 0.17, gapY = U * 0.27, Lp = U * 1.7, nl = Math.min(6, Math.ceil(D / 2 / gapY));
    ctx.globalAlpha = fadeIn(env); ctx.translate(W / 2, H / 2); ctx.rotate((Q.ang || 20) * DEG); ctx.lineWidth = LW(env, 0.003);
    for (let j = -nl; j <= nl; j++) {
      const len = U * (0.55 + 0.75 * J.r(s, j + 9)), off = wrap(env.t * U * (Q.spd || 0.025) * (j % 2 ? 1 : -1) * (0.5 + 1.5 * J.r(s, j + 9, 2)) + J.r(s, j + 9, 3) * Lp, Lp);
      ctx.beginPath();
      for (let x = -D / 2 - Lp + off, c = 0; x < D / 2 && c < 5; x += Lp, c++) stadium(ctx, x, j * gapY - hh / 2, len, hh);
      if (j % 2) { ctx.strokeStyle = A(sc.fg, k * 2); ctx.stroke(); } else { ctx.fillStyle = A(j === 0 ? sc.accent : sc.fg, k * (j === 0 ? 1.3 : 1)); ctx.fill(); }
    }
  } });

bg('xpSlitLight', { name: 'ブラインドの光', en: 'Blind Light', tags: ['emotional', 'calm', 'editorial'], w: 1.1, subtle: true,
  plan: rng => ({ seed: bs(rng), sk: rng.pick([-0.5, -0.35, 0.35, 0.5]), n: rng.int(5, 7), k: rng.range(0.07, 0.095) }),
  draw(env, Q, ctx) {
    const { W, H, sc } = env, U = Umin(env), t = env.t, ph = (Q.seed || 1) % 7, e = fadeIn(env, 1), n = Q.n || 6, lc = lightOf(sc), k = (Q.k || 0.08) * e;
    const sh = U * 0.062, gp = U * 0.04, wd = U * 0.95, tot = n * sh + (n - 1) * gp;
    ctx.translate(W * (0.5 + 0.2 * Math.sin(t * 0.14 + ph)), H * (0.5 + 0.1 * Math.sin(t * 0.11 + ph * 2))); ctx.transform(1, 0, Q.sk || -0.4, 1, 0, 0);
    const g = ctx.createLinearGradient(-wd / 2, 0, wd / 2, 0);
    g.addColorStop(0, A(lc, 0)); g.addColorStop(0.22, A(lc, k)); g.addColorStop(0.7, A(lc, k * 0.8)); g.addColorStop(1, A(lc, 0));
    ctx.fillStyle = g; ctx.beginPath();
    for (let i = 0; i < n; i++) { const o = sh * (0.75 + 0.25 * Math.sin(t * 0.3 + i * 0.5)); ctx.rect(-wd / 2, -tot / 2 + i * (sh + gp) + (sh - o) / 2, wd, o); }
    ctx.fill();
  } });

bg('xpPosterGrad', { name: '階段グラデ', en: 'Stepped Gradient', tags: ['calm', 'graphic', 'pop'], w: 1.1, subtle: true,
  plan: rng => ({ seed: bs(rng), ang: rng.pick([0, 30, 60, 90, 120, 150, 180, 210, 270, 330]), acc: rng.chance(0.5), n: rng.int(5, 7), k: rng.range(0.018, 0.025) }),
  draw(env, Q, ctx) {
    const { W, H, sc } = env, t = env.t, L = Math.hypot(W, H), n = Q.n || 6, ph = (Q.seed || 1) % 5;
    ctx.globalAlpha = fadeIn(env); ctx.translate(W / 2, H / 2); ctx.rotate(((Q.ang || 0) + 9 * Math.sin(t * 0.13 + ph)) * DEG);
    ctx.fillStyle = A(Q.acc ? sc.accent : sc.fg, Q.k || 0.02);
    for (let i = 1; i <= n; i++) { const x = -L / 2 + L * (i / (n + 1) + 0.035 * Math.sin(t * 0.3 + i * 1.1 + ph)); ctx.fillRect(x, -L / 2, L / 2 - x + 2, L); }
  } });

bg('xpBigRing', { name: '大きな輪', en: 'Great Ring', tags: ['calm', 'graphic', 'emotional'], w: 1,
  plan: rng => ({ seed: bs(rng), cx: rng.pick([0.3, 0.7, 0.5]), cy: rng.pick([0.4, 0.6, 0.5]), k: rng.range(0.05, 0.065) }),
  draw(env, Q, ctx) {
    const { W, H, sc } = env, U = Umin(env), t = env.t, ph = (Q.seed || 1) % 7, e = fadeIn(env, 1), k = Q.k || 0.055;
    const cx = W * ((Q.cx || 0.5) + 0.05 * Math.sin(t * 0.16 + ph)), cy = H * ((Q.cy || 0.5) + 0.05 * Math.cos(t * 0.13 + ph)), R = U * 0.6 * (0.8 + 0.2 * e);
    ctx.globalAlpha = e;
    ctx.strokeStyle = A(sc.fg, k); ctx.lineWidth = U * (0.11 + 0.035 * Math.sin(t * 0.4)); ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke();
    const R2 = R * 1.32, a = t * 0.22 + ph;
    ctx.strokeStyle = A(sc.fg, k * 2); ctx.lineWidth = LW(env, 0.002); ctx.setLineDash([U * 0.012, U * 0.018]); ctx.lineDashOffset = -t * U * 0.01;
    ctx.beginPath(); ctx.arc(cx, cy, R2, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = A(sc.accent, 0.4); ctx.beginPath(); dot(ctx, cx + Math.cos(a) * R2, cy + Math.sin(a) * R2, U * 0.012); ctx.fill();
  } });

bg('xpCurtain', { name: 'カーテンのひだ', en: 'Curtain Folds', tags: ['emotional', 'calm', 'editorial'], w: 1, subtle: true,
  plan: rng => ({ seed: bs(rng), n: rng.int(7, 11), k: rng.range(0.07, 0.09) }),
  draw(env, Q, ctx) {
    const { W, H, sc } = env, t = env.t, n = Q.n || 9, ph = (Q.seed || 1) % 9, k = (Q.k || 0.08) * fadeIn(env), g = ctx.createLinearGradient(0, 0, W, 0);
    let prev = 0;
    for (let i = 0; i <= n; i++) {
      const p = clamp((i + 0.3 * Math.sin(t * 0.45 + i * 1.3 + ph)) / n);
      if (i) g.addColorStop(clamp((prev + p) / 2), A(sc.fg, 0));
      g.addColorStop(Math.max(prev, p), A(sc.fg, k * (0.6 + 0.4 * Math.sin(i * 2.1 + ph)))); prev = Math.max(prev, p);
    }
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const g2 = ctx.createLinearGradient(0, 0, 0, H); g2.addColorStop(0, A(sc.bg, 0.6)); g2.addColorStop(0.35, A(sc.bg, 0));
    ctx.fillStyle = g2; ctx.fillRect(0, 0, W, H * 0.36);
  } });

/* ================= RULES & TYPE-LIKE TEXTURE ================= */
bg('xpRuler', { name: '定規の目盛り', en: 'Ruler Scales', tags: ['editorial', 'graphic', 'calm'], w: 1, subtle: true,
  plan: rng => ({ seed: bs(rng), top: rng.chance(0.4), right: rng.chance(0.5), k: rng.range(0.24, 0.3) }),
  draw(env, Q, ctx) {
    const { W, H, sc } = env, U = Umin(env), t = env.t, e = fadeIn(env), sp = U * 0.016, per = sp * 10, off = wrap(t * U * 0.02, per);
    const y0 = H * (Q.top ? 0.085 : 0.915), dy = Q.top ? 1 : -1, x0 = W * (Q.right ? 0.945 : 0.055), dx = Q.right ? -1 : 1;
    ctx.globalAlpha = e; ctx.strokeStyle = A(sc.fg, Q.k || 0.16); ctx.lineWidth = LW(env, 0.0018); ctx.beginPath();
    const tick = i => U * (i % 10 === 0 ? 0.042 : i % 5 === 0 ? 0.028 : 0.015);
    for (let i = 0, x = off - per; x < W && i < 260; i++, x += sp) { ctx.moveTo(x, y0); ctx.lineTo(x, y0 + dy * tick(i) * e); }
    for (let i = 0, y = -off; y < H && i < 260; i++, y += sp) { ctx.moveTo(x0, y); ctx.lineTo(x0 + dx * tick(i) * e, y); }
    ctx.moveTo(0, y0); ctx.lineTo(W, y0); ctx.moveTo(x0, 0); ctx.lineTo(x0, H);
    ctx.stroke();
    const px = W * (0.5 + 0.3 * Math.sin(t * 0.3)), ps = U * 0.014;
    ctx.fillStyle = A(sc.accent, 0.5); ctx.beginPath(); ctx.moveTo(px, y0 - dy * ps * 0.3); ctx.lineTo(px - ps, y0 - dy * ps * 1.9); ctx.lineTo(px + ps, y0 - dy * ps * 1.9); ctx.closePath(); ctx.fill();
  } });

bg('xpGreekText', { name: 'ダミー組版', en: 'Greeked Text', tags: ['editorial', 'calm', 'graphic'], w: 0.9, subtle: true,
  plan: rng => ({ seed: bs(rng), spd: rng.range(0.01, 0.018), k: rng.range(0.055, 0.07) }),
  draw(env, Q, ctx) {
    const { W, H, sc } = env, s = Q.seed || 1, U = Umin(env), lh = U * 0.037, bh = U * 0.012, cols = W > H ? 3 : 2, gut = W * 0.04, cw = (W * 0.86 - gut * (cols - 1)) / cols;
    const sc0 = env.t * U * (Q.spd || 0.013), r0 = Math.floor(sc0 / lh), oy = -(sc0 - r0 * lh), rows = Math.min(70, Math.ceil(H / lh) + 1);
    ctx.globalAlpha = fadeIn(env); ctx.fillStyle = A(sc.fg, Q.k || 0.06); ctx.beginPath();
    for (let c = 0; c < cols; c++) for (let j = 0; j < rows; j++) {
      const id = r0 + j + c * 11, m = wrap(id, 7); if (m === 6) continue;
      const len = m === 5 ? 0.25 + 0.5 * J.r(s, id, c) : 0.86 + 0.14 * J.r(s, id, c), ind = m === 0 ? cw * 0.06 : 0;
      ctx.rect(W * 0.07 + c * (cw + gut) + ind, oy + j * lh, cw * len - ind, bh);
    }
    ctx.fill();
  } });

const SEG = [0x3f, 0x06, 0x5b, 0x4f, 0x66, 0x6d, 0x7d, 0x07, 0x7f, 0x6f];      // bits: a b c d e f g
const segPath = (ctx, x, y, w, h, i) => {
  const th = w * 0.17, g = th * 0.14, hl = w - th, vl = h / 2 - th / 2, q = th / 2;
  const hz = (sx, sy) => { ctx.moveTo(sx + g, sy); ctx.lineTo(sx + q + g, sy - q); ctx.lineTo(sx + hl - q - g, sy - q); ctx.lineTo(sx + hl - g, sy); ctx.lineTo(sx + hl - q - g, sy + q); ctx.lineTo(sx + q + g, sy + q); ctx.closePath(); };
  const vt = (sx, sy) => { ctx.moveTo(sx, sy + g); ctx.lineTo(sx + q, sy + q + g); ctx.lineTo(sx + q, sy + vl - q - g); ctx.lineTo(sx, sy + vl - g); ctx.lineTo(sx - q, sy + vl - q - g); ctx.lineTo(sx - q, sy + q + g); ctx.closePath(); };
  const L = x + q, R = x + w - q, T = y + q, M = y + h / 2, B = y + h - q;
  if (i === 0) hz(L, T); else if (i === 1) vt(R, T); else if (i === 2) vt(R, M); else if (i === 3) hz(L, B); else if (i === 4) vt(L, M); else if (i === 5) vt(L, T); else hz(L, M);
};
bg('xpSevenSeg', { name: '巨大7セグ', en: 'Giant Segments', tags: ['glitch', 'graphic', 'editorial'], w: 0.7,
  plan: rng => ({ seed: bs(rng), rate: rng.range(0.6, 1.1), k: rng.range(0.07, 0.09) }),
  draw(env, Q, ctx) {
    const { W, H, sc } = env, s = Q.seed || 1, tt = env.t * (Q.rate || 0.8), n0 = Math.floor(tt), m = J.smooth(0, 0.22, tt - n0), nd = W > H * 1.2 ? 3 : 2, k = Q.k || 0.08;
    const gap = 0.24, dw = Math.min(W * 0.84 / (nd + (nd - 1) * gap), H * 0.66 / 1.85), dh = dw * 1.85, x0 = (W - dw * (nd + (nd - 1) * gap)) / 2, y0 = (H - dh) / 2;
    ctx.globalAlpha = fadeIn(env); ctx.translate(W / 2, H / 2); ctx.transform(1, 0, -0.07, 1, 0, 0); ctx.translate(-W / 2, -H / 2);
    const cur = (s % 500) + n0, prv = cur - 1, B = [[], [], []];
    for (let d = 0; d < nd; d++) {
      const p10 = Math.pow(10, nd - 1 - d), a = SEG[Math.floor(cur / p10) % 10], b = SEG[Math.floor(prv / p10) % 10];
      for (let i = 0; i < 7; i++) { const on = a >> i & 1, was = b >> i & 1; B[on && was ? 2 : !on && !was ? 0 : 1].push(d, i, on); }
    }
    for (let q = 0; q < 3; q++) {
      const L = B[q]; if (!L.length) continue;
      for (let z = 0; z < 2; z++) {      // mixed bucket: rising and falling segments use opposite fades
        ctx.beginPath(); let any = false;
        for (let j = 0; j < L.length; j += 3) { if (q === 1 && L[j + 2] !== z) continue; if (q !== 1 && z) continue; segPath(ctx, x0 + L[j] * dw * (1 + gap), y0, dw, dh, L[j + 1]); any = true; }
        if (!any) continue;
        const v = q === 2 ? 1 : q === 0 ? 0 : z ? m : 1 - m;
        ctx.fillStyle = A(sc.fg, k * (0.22 + 0.78 * v)); ctx.fill();
      }
    }
  } });

bg('xpCropMarks', { name: '見当マーク', en: 'Register Marks', tags: ['editorial', 'graphic', 'pop'], w: 0.9, subtle: true,
  plan: rng => ({ seed: bs(rng), sp: rng.range(0.32, 0.4), k: rng.range(0.19, 0.23) }),
  draw(env, Q, ctx) {
    const { W, H, sc } = env, U = Umin(env), t = env.t, e = fadeIn(env), sp = U * (Q.sp || 0.36), r = U * 0.02, arm = U * 0.038 * e;
    const ox = wrap(t * U * 0.012, sp) - sp / 2, oy = wrap(t * U * 0.007, sp) - sp / 2;
    ctx.globalAlpha = e; ctx.strokeStyle = A(sc.fg, Q.k || 0.14); ctx.lineWidth = LW(env, 0.002); ctx.beginPath();
    for (let y = oy, j = 0; y < H + sp && j < 12; y += sp, j++) for (let x = ox, i = 0; x < W + sp && i < 12; x += sp, i++) {
      const a = t * 0.25 * ((i + j) % 2 ? 1 : -1), c = Math.cos(a) * arm, d = Math.sin(a) * arm;
      dot(ctx, x, y, r); ctx.moveTo(x - c, y - d); ctx.lineTo(x + c, y + d); ctx.moveTo(x + d, y - c); ctx.lineTo(x - d, y + c);
    }
    const m = U * 0.05, l = U * 0.05 * e;
    for (const [cx, cy, sx, sy] of [[m, m, 1, 1], [W - m, m, -1, 1], [m, H - m, 1, -1], [W - m, H - m, -1, -1]]) { ctx.moveTo(cx, cy - sy * l * 0.2); ctx.lineTo(cx, cy - sy * l * -1); ctx.moveTo(cx - sx * l * 0.2, cy); ctx.lineTo(cx + sx * l, cy); }
    ctx.stroke();
  } });

/* ================= SCREEN-LIKE FIELDS ================= */
bg('xpScanner', { name: 'スキャナーの光', en: 'Scanner Beam', tags: ['glitch', 'editorial', 'calm'], w: 1, subtle: true,
  plan: rng => ({ seed: bs(rng), spd: rng.range(0.35, 0.55), k: rng.range(0.1, 0.13) }),
  draw(env, Q, ctx) {
    const { W, H, sc } = env, U = Umin(env), e = fadeIn(env), hz = H > W, L = hz ? H : W, X = hz ? W : H, lc = lightOf(sc), k = (Q.k || 0.11) * e;
    const x = L * (0.5 - 0.56 * Math.cos(env.t * (Q.spd || 0.45) + ((Q.seed || 1) % 6))), bw = U * 0.11;
    if (hz) { ctx.transform(0, 1, 1, 0, 0, 0); }
    ctx.fillStyle = A(sc.fg, 0.035 * e); ctx.fillRect(0, 0, Math.max(0, x), X);
    const g = ctx.createLinearGradient(x - bw, 0, x + bw, 0);
    g.addColorStop(0, A(lc, 0)); g.addColorStop(0.5, A(lc, k)); g.addColorStop(1, A(lc, 0));
    ctx.fillStyle = g; ctx.fillRect(x - bw, 0, bw * 2, X);
    ctx.fillStyle = A(lc, k * 2.2); ctx.fillRect(x - LW(env, 0.0015) / 2, 0, LW(env, 0.0015), X);
  } });

bg('xpStepBlocks', { name: '階段ブロック', en: 'Stair Blocks', tags: ['pop', 'graphic', 'glitch'], w: 0.9,
  plan: rng => ({ seed: bs(rng), per: rng.int(5, 8), spd: rng.range(0.45, 0.7), k: rng.range(0.04, 0.055) }),
  draw(env, Q, ctx) {
    const { W, H, sc } = env, U = Umin(env), cell = U * 0.11, per = Q.per || 6, k = Q.k || 0.045, e = fadeIn(env, 0.8);
    const fr = env.t * (Q.spd || 0.55), fl = Math.floor(fr), sh = wrap((fl + E.inOutCubic(clamp((fr - fl) * 2.2))) * cell, cell * per), n = Math.min(40, Math.ceil(W / cell) + per + 1);
    ctx.globalAlpha = e;
    ctx.fillStyle = A(sc.fg, k); ctx.beginPath();
    for (let i = 0; i < n; i++) { const h = cell * 0.6 * (1 + i % per) * e; ctx.rect(i * cell + sh - cell * per, H - h, cell + 0.5, h); }
    ctx.fill();
    ctx.fillStyle = A(sc.accent, k * 1.1); ctx.beginPath();
    for (let i = 0; i < n; i++) { const h = cell * 0.6 * (1 + (per - 1 - i % per)) * e; ctx.rect(i * cell - sh, 0, cell + 0.5, h); }
    ctx.fill();
  } });

bg('xpRadar', { name: 'レーダー', en: 'Radar Sweep', tags: ['glitch', 'graphic', 'editorial'], w: 0.8,
  plan: rng => ({ seed: bs(rng), cx: rng.pick([0.5, 0.5, 0.25, 0.75]), cy: rng.pick([0.5, 0.56]), spd: rng.range(0.45, 0.7) * rng.pick([1, -1]), k: rng.range(0.09, 0.11) }),
  draw(env, Q, ctx) {
    const { W, H, sc } = env, s = Q.seed || 1, U = Umin(env), e = fadeIn(env, 0.8), cx = W * (Q.cx || 0.5), cy = H * (Q.cy || 0.5), R = Math.hypot(W, H), k = Q.k || 0.08;
    const sp = Q.spd || 0.55, dir = sp < 0 ? -1 : 1, ang = env.t * sp, NS = 18, da = 4.5 * DEG;
    ctx.globalAlpha = e;
    for (let i = 0; i < NS; i++) {
      const a0 = ang - dir * i * da, a1 = ang - dir * (i + 1.04) * da;
      ctx.fillStyle = A(sc.fg, k * Math.pow(1 - i / NS, 1.6)); ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a0) * R, cy + Math.sin(a0) * R); ctx.lineTo(cx + Math.cos(a1) * R, cy + Math.sin(a1) * R); ctx.closePath(); ctx.fill();
    }
    ctx.strokeStyle = A(sc.fg, k * 1.3); ctx.lineWidth = LW(env, 0.0018); ctx.beginPath();
    for (let i = 1; i <= 5; i++) dot(ctx, cx, cy, U * 0.2 * i * (0.8 + 0.2 * e));
    ctx.moveTo(0, cy); ctx.lineTo(W, cy); ctx.moveTo(cx, 0); ctx.lineTo(cx, H); ctx.stroke();
    for (let i = 0; i < 6; i++) {
      const a = J.r(s, i, 1) * TAU, r = U * (0.15 + 0.6 * J.r(s, i, 2)), age = wrap(dir * (ang - a), TAU) / TAU;
      ctx.fillStyle = A(sc.accent, 0.5 * Math.pow(1 - age, 3)); ctx.beginPath(); dot(ctx, cx + Math.cos(a) * r, cy + Math.sin(a) * r, U * 0.009); ctx.fill();
    }
  } });

bg('xpLoadBars', { name: '進む横棒', en: 'Progress Bars', tags: ['glitch', 'pop', 'editorial'], w: 0.8,
  plan: rng => ({ seed: bs(rng), n: rng.int(6, 8), k: rng.range(0.07, 0.09) }),
  draw(env, Q, ctx) {
    const { W, H, sc } = env, s = Q.seed || 1, U = Umin(env), n = Q.n || 7, k = Q.k || 0.08, bh = U * 0.02, e = fadeIn(env);
    ctx.lineWidth = LW(env, 0.0018);
    for (let i = 0; i < n; i++) {
      const w = W * (0.3 + 0.55 * J.r(s, i, 1)), x = J.r(s, i, 2) < 0.5 ? W * 0.06 : W * 0.94 - w, y = H * (i + 0.5 + 0.25 * J.rs(s, i, 3)) / n - bh / 2;
      const p = wrap(env.t * (0.05 + 0.07 * J.r(s, i, 4)) + J.r(s, i, 5), 1), pe = E.inOutCubic(clamp(p / 0.82));
      ctx.globalAlpha = e * J.smooth(0, 0.04, p) * (1 - J.smooth(0.9, 1, p));
      ctx.strokeStyle = A(sc.fg, k * 1.5); ctx.strokeRect(x, y, w, bh);
      ctx.fillStyle = A(i === (s % n) ? sc.accent : sc.fg, i === (s % n) ? k * 2.4 : k); ctx.fillRect(x, y, w * pe, bh);
      ctx.fillStyle = A(sc.fg, k * 1.5); ctx.fillRect(x, y + bh * 1.8, w * 0.12, bh * 0.3);
    }
  } });
})();
