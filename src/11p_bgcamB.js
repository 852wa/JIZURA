/* JIZURA pack: bgcamB — background graphics (gradients, wa / textile patterns, scenes, textures) + camera moves */
(() => {
'use strict';
const E = J.E;
const PK = 'bgcamB';
const reg = (g, k, d) => J.register(g, k, d, PK);
const DEG = J.DEG, TAU = J.TAU, clamp = J.clamp, lerp = J.lerp;

/* ================= shared helpers ================= */
const isDark = c => J.lum(c) < 0.45;
const layC = (sc, k) => J.mix(sc.bg, sc.fg, k);          // faint layer tone (k ≈ 0.04..0.15)
const tintC = (sc, k) => J.mix(sc.bg, sc.accent, k);     // faint accent tone
const Umin = env => Math.min(env.W, env.H);
const bs = rng => rng.int(1, 1e9);
const wrap = (v, m) => ((v % m) + m) % m;
const fract = v => v - Math.floor(v);
// colourful scheme colours that stand apart from the background (accent first, no duplicates)
const hues = sc => {
  const out = [];
  for (const c of [sc.accent, sc.accent2, sc.ghostA, sc.ghostB, sc.fg]) {
    if (!c || J.contrast(c, sc.bg) < 1.25) continue;
    const k = c.toLowerCase();
    if (!out.some(o => o.toLowerCase() === k)) out.push(c);
  }
  return out.length ? out : [sc.fg];
};
// a colour clearly lighter than a dark background (for light / glow effects)
const glowOf = sc => { const L = J.lum(sc.bg); for (const c of [sc.accent, sc.accent2, sc.ghostA, sc.ghostB, sc.fg]) if (c && J.lum(c) > L + 0.25) return c; return sc.fg; };
// light that still shows on light backgrounds: white on mid-light (yellow / pink), a tint on near-white paper
const lightOn = sc => (isDark(sc.bg) ? glowOf(sc) : J.lum(sc.bg) < 0.78 ? '#FFFFFF' : J.mix(sc.accent, '#FFFFFF', 0.2));

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
const bgReg = (k, d) => reg('bg', k, Object.assign({}, d, { draw(env, P) { const ctx = env.ctx; ctx.save(); try { d.draw(env, P || {}, ctx); } finally { ctx.restore(); } } }));

/* pre-render cache (tiles, sprites, textures) — small LRU, keyed by params + size + colour */
const CV = new Map();
const mkCv = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; };
const cached = (key, make) => {
  let c = CV.get(key);
  if (c) { CV.delete(key); CV.set(key, c); return c; }
  while (CV.size >= 40) CV.delete(CV.keys().next().value);
  c = make(); CV.set(key, c); return c;
};
const resQ = env => Math.min(2, Math.max(0.1, env.scale || 1));
// a periodic tile (period pw × ph design px) rendered at output resolution
const tileCv = (key, env, pw, ph, paint) => {
  const q = resQ(env), w = Math.max(2, Math.round(pw * q)), h = Math.max(2, Math.round(ph * q));
  return cached(`${key}|${w}x${h}`, () => { const c = mkCv(w, h), x = c.getContext('2d'); x.scale(w / pw, h / ph); paint(x, pw, ph); return c; });
};
// fill rect (x0, y0, w, h) of the current space with the tile, pattern origin shifted by (ox, oy)
const fillTile = (ctx, cv, pw, ph, x0, y0, w, h, ox = 0, oy = 0) => {
  const pat = ctx.createPattern(cv, 'repeat'); if (!pat) return;
  const m = ctx.getTransform(), kx = m.a * pw / cv.width, ky = m.d * ph / cv.height;
  ctx.save(); ctx.fillStyle = pat;
  if (!m.b && !m.c && Math.abs(kx - 1) < 0.05 && Math.abs(ky - 1) < 0.05) {
    // tile pixels map ~1:1 to device pixels: fill in device space so every repeat lands on whole pixels (no resampling seams)
    const ex = Math.round(m.e + ox * m.a), fy = Math.round(m.f + oy * m.d);
    ctx.setTransform(1, 0, 0, 1, ex, fy);
    ctx.fillRect(m.e + x0 * m.a - ex, m.f + y0 * m.d - fy, w * m.a, h * m.d);
  } else {
    const sx = pw / cv.width, sy = ph / cv.height;
    ctx.translate(ox, oy); ctx.scale(sx, sy); ctx.fillRect((x0 - ox) / sx, (y0 - oy) / sy, w / sx, h / sy);
  }
  ctx.restore();
};
// fast 2D value noise (0..1) for pre-renders and per-frame fields
const hash2 = (x, y, s) => { let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 144665)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
const noise2 = (x, y, s) => {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy, s), b = hash2(ix + 1, iy, s), c = hash2(ix, iy + 1, s), d = hash2(ix + 1, iy + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
};
const fbm2 = (x, y, s, oct = 3) => { let v = 0, a = 0.5, f = 1, n = 0; for (let i = 0; i < oct; i++) { v += noise2(x * f, y * f, s + i * 101) * a; n += a; a *= 0.5; f *= 2.03; } return v / n; };
const fbm1 = (x, s, oct = 3) => { let v = 0, a = 0.5, f = 1, n = 0; for (let i = 0; i < oct; i++) { v += J.noise1(x * f, s + i * 53) * a; n += a; a *= 0.5; f *= 2.1; } return v / n; };   // -1..1
const conic = (ctx, a, x, y) => (ctx.createConicGradient ? ctx.createConicGradient(a, x, y) : null);
const pathPoly = (ctx, pts) => { ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.closePath(); };

/* frame-size plates: expensive fills (tiled patterns, ring sets, textures) are rendered ONCE at output resolution with one
   scroll period of margin, then blitted every frame at whole device pixels — the cheapest canvas path */
const PL = new Map();
const plate = (key, env, mx, my, paint) => {
  const q = resQ(env), w = Math.ceil((env.W + mx) * q) + 2, h = Math.ceil((env.H + my) * q) + 2, k = `${key}|${w}x${h}`;
  let c = PL.get(k);
  if (c) { PL.delete(k); PL.set(k, c); return c; }
  let px = w * h; for (const v of PL.values()) px += v.width * v.height;
  const budget = Math.max(30e6, w * h * 3.2);            // ≈120 MB, but always room for the 3 plates one background may use
  while (PL.size && (PL.size >= 12 || px > budget)) { const k0 = PL.keys().next().value, v = PL.get(k0); px -= v.width * v.height; PL.delete(k0); }
  c = mkCv(w, h); const x = c.getContext('2d'); x.scale(q, q); paint(x, w / q, h / q); PL.set(k, c); return c;
};
// draw a plate so that its point (ox, oy) (design px) lands on the frame's top-left corner, snapped to device pixels
const blit = (ctx, env, cv, ox, oy) => {
  const m = ctx.getTransform(), s = m.a / resQ(env);
  ctx.save(); ctx.setTransform(1, 0, 0, 1, m.e, m.f);
  const dx = -Math.round(ox * m.a), dy = -Math.round(oy * m.a);
  if (Math.abs(s - 1) < 1e-3) ctx.drawImage(cv, dx, dy); else ctx.drawImage(cv, dx, dy, cv.width * s, cv.height * s);
  ctx.restore();
};
// soft, large-area effects (gradients, glows) are drawn into a reused low-resolution canvas and scaled up once
const LOWC = new Map();
const drawLow = (ctx, env, div, fn) => {
  const q = env.scale || 1, w = Math.max(8, Math.ceil(env.W * q / div)), h = Math.max(8, Math.ceil(env.H * q / div)), k = w + 'x' + h;
  let c = LOWC.get(k);
  if (!c) { if (LOWC.size > 3) LOWC.clear(); c = mkCv(w, h); LOWC.set(k, c); }
  const x = c.getContext('2d');
  x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over'; x.clearRect(0, 0, w, h);
  x.setTransform(w / env.W, 0, 0, h / env.H, 0, 0);
  fn(x, w / env.W);
  x.setTransform(1, 0, 0, 1, 0, 0);
  ctx.imageSmoothingEnabled = true; ctx.drawImage(c, 0, 0, env.W, env.H);
};

/* ================= GRADIENT ================= */
// one vertical curtain strip per colour: transparent top → bright lower edge
const auroraStrip = col => cached('aurS|' + col, () => {
  const c = mkCv(4, 256), x = c.getContext('2d'), g = x.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, J.rgba(col, 0)); g.addColorStop(0.5, J.rgba(col, 0.22)); g.addColorStop(0.88, J.rgba(col, 0.85)); g.addColorStop(0.94, J.rgba(col, 1)); g.addColorStop(1, J.rgba(col, 0));
  x.fillStyle = g; x.fillRect(0, 0, 4, 256); return c;
});
bgReg('auroraRibbons', { name: 'オーロラ', tags: ['emotional', 'calm'], w: 0.9,
  plan: rng => ({ seed: bs(rng), n: rng.int(2, 3), y: rng.range(0.36, 0.48), k: rng.range(0.2, 0.28), c0: rng.int(0, 3) }),
  draw(env, P, ctx) {
    const { W, H, sc } = env, s = P.seed || 1, t = env.t, dk = isDark(sc.bg), cols = hues(sc), e = fadeIn(env, 1.2);
    const N = clamp(Math.round(W / 18), 50, 120), cw = W / N, k = (P.k || 0.24) * e * (dk ? 1.25 : 0.8);
    const lite = cols.filter(c => J.lum(c) > J.lum(sc.bg) + 0.12), lc = dk ? (lite.length ? lite : [lightOn(sc)]) : [lightOn(sc), sc.accent];
    drawLow(ctx, env, 4, (x, q) => {
      x.imageSmoothingEnabled = true;
      for (let r = 0; r < (P.n || 2); r++) {
        const col = lc[((P.c0 || 0) + r) % lc.length], strip = auroraStrip(col);
        const base = H * ((P.y || 0.42) + r * 0.1 - 0.05), dir = r % 2 ? -1 : 1, ph = (s % 97) * 0.13 + r * 2.1;
        for (let i = 0; i <= N; i++) {
          const u = i / N, xx = i * cw - cw / 2;
          const y = base + H * 0.07 * Math.sin(u * TAU * 0.75 + t * 0.3 * dir + ph) + H * 0.045 * J.noise1(u * 3.5 + t * 0.22 * dir, s + r * 7);
          const h = Math.max(W, H) * (0.24 + 0.12 * J.noise1(u * 2.6 - t * 0.15, s + r * 13 + 5)) * (1 - 0.3 * r / 3) * (0.8 + 0.2 * e);
          const ray = Math.pow(0.5 + 0.5 * J.noise1(u * 34 + t * 0.9 * dir, s + r * 31), 1.4) * (0.7 + 0.3 * J.noise1(u * 13 - t * 0.4, s + r * 3));
          const a = k * (0.2 + 1.1 * ray) * J.smooth(0, 0.18, u) * J.smooth(1, 0.82, u) * (0.75 + 0.25 * J.noise1(u * 1.5 + t * 0.1, s + r));
          if (a <= 0.004) continue;
          // columns snapped to (low-res) pixels so neighbouring strips meet without seams
          const x0 = Math.round(xx * q) / q, x1 = Math.round((xx + cw) * q) / q;
          if (x1 <= x0) continue;
          x.globalAlpha = a;
          x.drawImage(strip, 0, 0, 4, 256, x0, y - h, x1 - x0, h * 1.07);
        }
      }
    });
  } });

bgReg('meshBlobs', { name: 'メッシュグラデ', tags: ['calm', 'emotional', 'pop'], w: 1, subtle: true,
  plan: rng => ({ seed: bs(rng), n: rng.int(3, 4), k: rng.range(0.2, 0.3) }),
  draw(env, P, ctx) {
    const { W, H, sc } = env, s = P.seed || 1, t = env.t, cols = hues(sc), dk = isDark(sc.bg), e = fadeIn(env, 1);
    const R0 = Math.max(W, H) * 0.5, n = P.n || 3;
    drawLow(ctx, env, 6, x => {
      for (let i = 0; i < n; i++) {
        const w1 = J.rr(0.16, 0.3, s, i, 1), w2 = J.rr(0.14, 0.26, s, i, 2);
        const cx = W * (0.5 + 0.42 * Math.sin(t * w1 + J.r(s, i, 3) * TAU)), cy = H * (0.5 + 0.4 * Math.cos(t * w2 + J.r(s, i, 4) * TAU));
        const R = R0 * J.rr(0.75, 1.1, s, i, 5) * (1 + 0.08 * Math.sin(t * 0.45 + i * 1.7));
        const c = J.mix(sc.bg, cols[i % cols.length], (P.k || 0.25) * (dk ? 1 : 0.75));
        const g = x.createRadialGradient(cx, cy, 0, cx, cy, R);
        g.addColorStop(0, J.rgba(c, 0.95 * e)); g.addColorStop(0.45, J.rgba(c, 0.5 * e)); g.addColorStop(1, J.rgba(c, 0));
        x.fillStyle = g;
        const x0 = Math.max(0, cx - R), y0 = Math.max(0, cy - R), x1 = Math.min(W, cx + R), y1 = Math.min(H, cy + R);
        if (x1 > x0 && y1 > y0) x.fillRect(x0, y0, x1 - x0, y1 - y0);
      }
    });
  } });

bgReg('duotoneSweep', { name: '二色スイープ', tags: ['calm', 'pop', 'graphic', 'emotional'], w: 0.9, subtle: true,
  plan: rng => ({ seed: bs(rng), pos: rng.pick([[0.5, 1.2], [-0.15, 1.1], [1.15, 1.1], [0.5, -0.2], [-0.1, -0.1]]), spd: rng.range(0.08, 0.14) * rng.pick([1, -1]), k: rng.range(0.14, 0.2), a0: rng.range(0, 6.28) }),
  draw(env, P, ctx) {
    const { W, H, sc } = env, cols = hues(sc), e = fadeIn(env, 0.8), k = P.k || 0.16;
    const cA = J.mix(sc.bg, cols[0], k), cB = J.mix(sc.bg, cols[1] || sc.fg, k);
    const pos = P.pos || [0.5, 1.2], cx = W * pos[0], cy = H * pos[1], a = (P.a0 || 0) + env.t * (P.spd || 0.1);
    drawLow(ctx, env, 6, x => {
      let g = conic(x, a, cx, cy);
      if (g) { g.addColorStop(0, cA); g.addColorStop(0.25, cB); g.addColorStop(0.5, cA); g.addColorStop(0.75, cB); g.addColorStop(1, cA); }
      else { g = x.createLinearGradient(0, 0, W, H); g.addColorStop(0, cA); g.addColorStop(1, cB); }
      x.globalAlpha = 0.9 * e; x.fillStyle = g; x.fillRect(0, 0, W, H);
      // soft sheen travelling around with the sweep
      const g2 = conic(x, a * 1.6 + 1, cx, cy);
      if (g2) {
        const hl = J.rgba(lightOn(sc), 0.07 * e), z = 'rgba(0,0,0,0)';
        g2.addColorStop(0, z); g2.addColorStop(0.06, hl); g2.addColorStop(0.12, z); g2.addColorStop(0.56, z); g2.addColorStop(0.62, hl); g2.addColorStop(0.68, z); g2.addColorStop(1, z);
        x.globalAlpha = 1; x.fillStyle = g2; x.fillRect(0, 0, W, H);
      }
    });
  } });

bgReg('horizonGlow', { name: '惑星の縁', tags: ['emotional', 'calm', 'editorial'], w: 0.8,
  plan: rng => ({ seed: bs(rng), cx: rng.range(0.3, 0.7), R: rng.range(1.3, 2.1), top: rng.range(0.7, 0.8), k: rng.range(0.28, 0.4) }),
  draw(env, P, ctx) {
    const { W, H, sc } = env, t = env.t, dk = isDark(sc.bg), e = fadeIn(env, 1.1), U = Umin(env);
    const R = Math.max(W, H) * (P.R || 1.6), cx = W * (P.cx || 0.5) + W * 0.03 * Math.sin(t * 0.08 + ((P.seed || 1) % 9));
    const cy = H * (P.top || 0.75) + R + (1 - e) * H * 0.25 + H * 0.008 * Math.sin(t * 0.25);
    const gc = dk ? glowOf(sc) : tintC(sc, 0.8), k = (P.k || 0.32) * (dk ? 1 : 0.55);
    ctx.fillStyle = dk ? J.mix(sc.bg, '#000000', 0.42) : J.mix(sc.bg, sc.fg, 0.05);
    ctx.globalAlpha = e; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fill();
    const breathe = 0.85 + 0.15 * Math.sin(t * 0.7), top = Math.max(0, cy - R * 1.22);
    if (top < H) {
      const g = ctx.createRadialGradient(cx, cy, R * 0.97, cx, cy, R * 1.22);
      g.addColorStop(0, J.rgba(gc, 0)); g.addColorStop(0.1, J.rgba(gc, k * 0.25 * breathe)); g.addColorStop(0.123, J.rgba(gc, k * breathe));
      g.addColorStop(0.2, J.rgba(gc, k * 0.45 * breathe)); g.addColorStop(0.5, J.rgba(gc, k * 0.12)); g.addColorStop(1, J.rgba(gc, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.rect(0, top, W, H - top); ctx.arc(cx, cy, R * 0.97, 0, TAU); ctx.fill('evenodd');
    }
    ctx.strokeStyle = J.rgba(gc, Math.min(0.8, k * 1.6)); ctx.lineWidth = Math.max(1, U * 0.0022);
    ctx.beginPath(); ctx.arc(cx, cy, R, Math.PI, TAU); ctx.stroke();
    // a bright flare sliding slowly along the limb
    const fa = -Math.PI / 2 + 0.22 * Math.sin(t * 0.12 + ((P.seed || 1) % 13)), fx = cx + Math.cos(fa) * R, fy = cy + Math.sin(fa) * R, fr = U * 0.3;
    const g2 = ctx.createRadialGradient(fx, fy, 0, fx, fy, fr);
    g2.addColorStop(0, J.rgba(dk ? gc : lightOn(sc), k * 0.9 * breathe)); g2.addColorStop(0.3, J.rgba(gc, k * 0.25)); g2.addColorStop(1, J.rgba(gc, 0));
    ctx.fillStyle = g2; ctx.fillRect(fx - fr, fy - fr, fr * 2, fr * 2);
  } });

/* ================= PATTERN ================= */
bgReg('seigaiha', { name: '青海波', tags: ['calm', 'editorial', 'graphic'], w: 0.8,
  plan: rng => ({ seed: bs(rng), R: rng.range(0.07, 0.1), rings: rng.int(3, 4), k: rng.range(0.075, 0.1), dir: rng.pick([1, -1]), acc: rng.chance(0.3) }),
  draw(env, P, ctx) {
    const { W, H, sc } = env, t = env.t, R = Umin(env) * (P.R || 0.08), rings = P.rings || 4, e = fadeIn(env, 0.7);
    const col = P.acc ? tintC(sc, (P.k || 0.09) * 1.6) : layC(sc, P.k || 0.09), fillCol = layC(sc, (P.k || 0.09) * 0.35), key = `sgh|${col}|${rings}|${R.toFixed(2)}`;
    const pl = plate(key, env, 2 * R, R, (x, w, h) => {
      const tile = tileCv(key, env, 2 * R, R, (y) => {
        const lw = R * 0.075;
        for (let j = -3; j <= 4; j++) for (let i = -1; i <= 2; i++) {
          const cx = i * 2 * R + (j & 1 ? R : 0), cy = j * R / 2;
          y.globalCompositeOperation = 'destination-out'; y.fillStyle = '#000'; y.beginPath(); y.arc(cx, cy, R, 0, TAU); y.fill();
          y.globalCompositeOperation = 'source-over';
          y.fillStyle = fillCol; y.beginPath(); y.arc(cx, cy, R / rings * 0.62, 0, TAU); y.fill();
          y.strokeStyle = col; y.lineWidth = lw; y.beginPath();
          for (let m = 0; m < rings; m++) { const r = R * (1 - m / rings) - lw * 0.6; if (r > lw) { y.moveTo(cx + r, cy); y.arc(cx, cy, r, 0, TAU); } }
          y.stroke();
        }
      });
      fillTile(x, tile, 2 * R, R, 0, 0, w, h);
    });
    ctx.globalAlpha = e;
    blit(ctx, env, pl, wrap(t * R * 0.22 * (P.dir || 1), 2 * R), wrap(R * 0.5 + Math.sin(t * 0.5) * R * 0.08 - (1 - e) * R * 0.5, R));
  } });

bgReg('asanoha', { name: '麻の葉', tags: ['calm', 'editorial', 'graphic', 'emotional'], w: 0.8,
  plan: rng => ({ seed: bs(rng), a: rng.range(0.1, 0.14), k: rng.range(0.09, 0.12), dx: rng.pick([1, -1]), sweep: rng.range(0.07, 0.12) }),
  draw(env, P, ctx) {
    const { W, H, sc } = env, t = env.t, a = Umin(env) * (P.a || 0.12), h = a * Math.sqrt(3) / 2, e = fadeIn(env, 0.8);
    const col = layC(sc, P.k || 0.09), key = `asa|${col}|${a.toFixed(2)}`;
    const pl = plate(key, env, a, 2 * h, (x, w, hh) => {
      const tile = tileCv(key, env, a, 2 * h, (y) => {
        const pt = (r, i) => [i * a + (r & 1 ? a / 2 : 0), r * h];
        y.strokeStyle = col; y.lineWidth = Math.max(0.8, a * 0.018); y.lineCap = 'round'; y.beginPath();
        const tri = (A, B, C) => {
          const gx = (A[0] + B[0] + C[0]) / 3, gy = (A[1] + B[1] + C[1]) / 3;
          y.moveTo(A[0], A[1]); y.lineTo(B[0], B[1]); y.lineTo(C[0], C[1]); y.closePath();
          for (const Q of [A, B, C]) { y.moveTo(gx, gy); y.lineTo(Q[0], Q[1]); }
        };
        for (let r = -2; r <= 3; r++) for (let i = -2; i <= 2; i++) {
          if (!(r & 1)) { tri(pt(r, i), pt(r, i + 1), pt(r + 1, i)); tri(pt(r + 1, i), pt(r + 1, i + 1), pt(r, i + 1)); }
          else { tri(pt(r, i), pt(r, i + 1), pt(r + 1, i + 1)); tri(pt(r + 1, i), pt(r + 1, i + 1), pt(r, i)); }
        }
        y.stroke();
      });
      fillTile(x, tile, a, 2 * h, 0, 0, w, hh);
    });
    const ox = wrap(t * a * 0.08 * (P.dx || 1), a), oy = wrap(t * h * 0.05 + (1 - e) * h, 2 * h);
    ctx.globalAlpha = e; blit(ctx, env, pl, ox, oy);
    // a slow diagonal band of light re-draws the pattern brighter (nested bands → soft edges)
    const D = W + H, c = (wrap(bgT(env) * (P.sweep || 0.09) + 0.4, 1.5) - 0.25) * D, bw = Umin(env) * 0.22;
    for (const [f, al] of [[1, 0.4], [0.6, 0.4], [0.3, 0.45]]) {
      ctx.save(); ctx.beginPath();
      ctx.moveTo(c - bw * f, 0); ctx.lineTo(c + bw * f, 0); ctx.lineTo(c + bw * f - H, H); ctx.lineTo(c - bw * f - H, H); ctx.closePath(); ctx.clip();
      ctx.globalAlpha = e * al; blit(ctx, env, pl, ox, oy); ctx.restore();
    }
  } });

bgReg('houndstooth', { name: '千鳥格子', tags: ['graphic', 'editorial', 'pop'], w: 0.6,
  plan: rng => ({ seed: bs(rng), c: rng.range(0.04, 0.055), k: rng.range(0.055, 0.075), dx: rng.pick([1, -1]), acc: rng.chance(0.25) }),
  draw(env, P, ctx) {
    const { W, H, sc } = env, t = env.t, c = Umin(env) * (P.c || 0.045), e = fadeIn(env, 0.6);
    const col = P.acc ? tintC(sc, (P.k || 0.065) * 1.7) : layC(sc, P.k || 0.065), key = `hnd|${col}|${c.toFixed(2)}`;
    const pl = plate(key, env, 2 * c, 2 * c, (x, w, h) => {
      const tile = tileCv(key, env, 2 * c, 2 * c, (y) => {
        y.fillStyle = col; y.beginPath();
        for (const [ox, oy] of [[0, 0], [2 * c, 0], [0, 2 * c], [2 * c, 2 * c], [-2 * c, 0], [0, -2 * c]]) {
          y.rect(ox, oy, c, c);
          for (const [bx, by] of [[ox + c, oy], [ox, oy + c]]) {
            pathPoly(y, [[bx, by], [bx + c / 2, by], [bx, by + c / 2]]);
            pathPoly(y, [[bx + c, by], [bx + c, by + c / 2], [bx + c / 2, by + c], [bx, by + c]]);
          }
        }
        y.fill();
      });
      fillTile(x, tile, 2 * c, 2 * c, 0, 0, w, h);
    });
    const d = t * c * 0.35;
    ctx.globalAlpha = e; blit(ctx, env, pl, wrap(d * (P.dx || 1), 2 * c), wrap(d * 0.6, 2 * c));
  } });

bgReg('herringbone', { name: 'ヘリンボーン', tags: ['editorial', 'calm', 'graphic'], w: 0.6,
  plan: rng => ({ seed: bs(rng), u: rng.range(0.032, 0.045), k: rng.range(0.07, 0.1), dir: rng.pick([1, -1]), rot: rng.pick([45, 45, -45]) }),
  draw(env, P, ctx) {
    const { W, H, sc } = env, t = env.t, u = Umin(env) * (P.u || 0.038), e = fadeIn(env, 0.7), k = P.k || 0.08, rot = P.rot || 45;
    const cA = layC(sc, k), cB = layC(sc, k * 0.45), key = `hrb|${cA}|${cB}|${u.toFixed(2)}`, Pd = 4 * u * Math.SQRT2;   // screen-space period of the 45° weave
    const pl = plate(key + '|' + rot, env, Pd, Pd, (x, w, h) => {
      const tile = tileCv(key, env, 4 * u, 4 * u, (y) => {
        const g = u * 0.1;
        const brick = (x0, y0, bw, bh, c) => { y.fillStyle = c; y.fillRect(x0 * u + g, y0 * u + g, bw * u - 2 * g, bh * u - 2 * g); };
        for (let kk = -8; kk <= 8; kk++) for (let m = -4; m <= 4; m++) {
          const bx = kk + 2 * m, by = kk - 2 * m;
          if (bx > 6 || bx < -3 || by > 6 || by < -3) continue;
          brick(bx, by, 2, 1, cA); brick(bx + 2, by - 1, 1, 2, cB);
        }
      });
      const D = Math.hypot(w, h) / 2 + 4 * u;
      x.translate(w / 2, h / 2); x.rotate(rot * DEG); fillTile(x, tile, 4 * u, 4 * u, -D, -D, 2 * D, 2 * D);
    });
    const sp = t * u * 0.6 * (P.dir || 1);          // travel along the zig-zag columns
    ctx.globalAlpha = e; blit(ctx, env, pl, rot > 0 ? Pd / 2 : wrap(sp, Pd), rot > 0 ? wrap(sp, Pd) : Pd / 2);
    // slow sheen band across the weave
    const L = W + H, bx = (wrap(t * 0.1, 1.6) - 0.3) * L, bw = Umin(env) * 0.35, hc = lightOn(sc);
    const gl = ctx.createLinearGradient(bx - bw, 0, bx + bw, 0);
    gl.addColorStop(0, J.rgba(hc, 0)); gl.addColorStop(0.5, J.rgba(hc, isDark(sc.bg) ? 0.035 : 0.08)); gl.addColorStop(1, J.rgba(hc, 0));
    ctx.globalAlpha = e; ctx.fillStyle = gl; ctx.save(); ctx.transform(1, 0, -0.6, 1, 0, 0); ctx.fillRect(bx - bw, 0, bw * 2, H); ctx.restore();
  } });

bgReg('argyle', { name: 'アーガイル', tags: ['pop', 'graphic', 'editorial'], w: 0.6,
  plan: rng => ({ seed: bs(rng), dw: rng.range(0.16, 0.22), asp: rng.range(1.3, 1.5), k: rng.range(0.06, 0.085), up: rng.pick([1, -1]) }),
  draw(env, P, ctx) {
    const { W, H, sc } = env, t = env.t, dw = Umin(env) * (P.dw || 0.18), dh = dw * (P.asp || 1.4), k = P.k || 0.07, e = fadeIn(env, 0.6);
    const cA = layC(sc, k), cB = tintC(sc, k * 1.6), cL = layC(sc, k * 3), kd = `arg|${cA}|${cB}|${dw.toFixed(2)}|${dh.toFixed(2)}`, kl = `argL|${cL}|${dw.toFixed(2)}|${dh.toFixed(2)}`;
    const dia = plate(kd, env, 2 * dw, 2 * dh, (x, w, h) => fillTile(x, tileCv(kd, env, 2 * dw, 2 * dh, (y) => {
      for (let j = -1; j <= 2; j++) for (let i = -1; i <= 2; i++) {
        y.fillStyle = (i + j) & 1 ? cB : cA; y.beginPath();
        const cx = i * dw, cy = j * dh;
        pathPoly(y, [[cx, cy - dh / 2], [cx + dw / 2, cy], [cx, cy + dh / 2], [cx - dw / 2, cy]]); y.fill();
      }
    }), 2 * dw, 2 * dh, 0, 0, w, h));
    const lines = plate(kl, env, dw, dh, (x, w, h) => fillTile(x, tileCv(kl, env, dw, dh, (y) => {
      const L = Math.hypot(dw, dh); y.strokeStyle = cL; y.lineWidth = Math.max(0.8, dw * 0.012); y.setLineDash([L / 12, L / 12]);
      for (const [ox, oy] of [[0, 0], [dw, 0], [0, dh], [-dw, 0], [0, -dh]]) {
        y.beginPath(); y.moveTo(ox - dw / 2, oy); y.lineTo(ox + dw / 2, oy + dh); y.stroke();
        y.beginPath(); y.moveTo(ox + dw / 2, oy); y.lineTo(ox - dw / 2, oy + dh); y.stroke();
      }
    }), dw, dh, 0, 0, w, h));
    const d = t * dh * 0.1 * (P.up || 1);
    ctx.globalAlpha = e; blit(ctx, env, dia, wrap(dw - W / 2, 2 * dw), wrap(d - (1 - e) * dh * 0.3, 2 * dh));
    ctx.globalAlpha = e * 0.9; blit(ctx, env, lines, wrap(dw / 2 - W / 2 - d * 0.6, dw), wrap(-d, dh));
  } });

bgReg('tartan', { name: 'タータン', tags: ['pop', 'calm', 'editorial'], w: 0.6,
  plan: rng => ({ seed: bs(rng), S: rng.range(0.34, 0.5), w1: rng.range(0.18, 0.28), w2: rng.range(0.08, 0.13), k: rng.range(0.085, 0.115), acc: rng.chance(0.6) }),
  draw(env, P, ctx) {
    const { W, H, sc } = env, t = env.t, S = Umin(env) * (P.S || 0.42), k = P.k || 0.1, e = fadeIn(env, 0.8);
    const cA = layC(sc, k), cB = P.acc ? tintC(sc, k * 1.5) : layC(sc, k * 0.6), cL = layC(sc, k * 1.6), cT = tintC(sc, k * 2.4);
    const w1 = P.w1 || 0.22, w2 = P.w2 || 0.1, key = `tart|${cA}|${cB}|${cL}|${cT}|${w1.toFixed(3)}|${w2.toFixed(3)}|${S.toFixed(1)}`;
    // one sett of stripes, mirrored: wide band / thin line / mid band / hairline
    const sett = [[0, w1, cA, 0.6], [w1 + 0.04, 0.012, cL, 0.9], [w1 + 0.1, w2, cB, 0.55], [0.72, 0.008, cT, 0.9], [0.84, 0.02, cL, 0.7]];
    const stripe = (x, len, span) => { for (const [p, w, c, a] of sett) { x.globalAlpha = a; x.fillStyle = c; for (let o = 0; o < len + S; o += S) { x.fillRect(o + p * S, 0, w * S, span); x.fillRect(o + S - (p + w) * S, 0, w * S, span); } } x.globalAlpha = 1; };
    const vert = plate(key + '|v', env, S, 0, (x, w, h) => stripe(x, w, h));
    const hor = plate(key + '|h', env, 0, S, (x, w, h) => { x.transform(0, 1, 1, 0, 0, 0); stripe(x, h, w); });
    ctx.globalAlpha = e; blit(ctx, env, vert, wrap(-t * S * 0.035, S), 0);
    blit(ctx, env, hor, 0, wrap(t * S * 0.025 + S * 0.37, S));
  } });

bgReg('chevron', { name: '山形', tags: ['pop', 'graphic'], w: 0.6,
  plan: rng => ({ seed: bs(rng), p: rng.range(0.13, 0.19), amp: rng.range(0.28, 0.42), k: rng.range(0.055, 0.075), dir: rng.pick([1, -1]), acc: rng.chance(0.3) }),
  draw(env, P, ctx) {
    const { W, H, sc } = env, t = env.t, p = Umin(env) * (P.p || 0.16), D = p * 0.5, A = p * (P.amp || 0.35), e = fadeIn(env, 0.6);
    const col = P.acc ? tintC(sc, (P.k || 0.065) * 1.7) : layC(sc, P.k || 0.065), key = `chev|${col}|${p.toFixed(2)}|${A.toFixed(2)}`;
    const pl = plate(key, env, p, D, (x, w, h) => fillTile(x, tileCv(key, env, p, D, (y) => {
      y.fillStyle = col; y.beginPath();
      for (let j = -2; j <= 3; j++) {
        const y0 = j * D + A / 2;
        pathPoly(y, [[-1, y0], [p / 2, y0 - A], [p + 1, y0], [p + 1, y0 + D / 2], [p / 2, y0 - A + D / 2], [-1, y0 + D / 2]]);
      }
      y.fill();
    }), p, D, 0, 0, w, h));
    ctx.globalAlpha = e;
    blit(ctx, env, pl, wrap(p / 2 - W / 2 + Math.sin(t * 0.3) * p * 0.1, p), wrap(-t * D * 0.4 * (P.dir || 1) + (1 - e) * D, D));
  } });

bgReg('isoCubes', { name: '立方体', tags: ['graphic', 'pop', 'calm'], w: 0.6,
  plan: rng => ({ seed: bs(rng), s: rng.range(0.055, 0.075), k: rng.range(0.08, 0.11), spd: rng.range(0.2, 0.35) * rng.pick([1, -1]), l0: rng.range(0, 6.28) }),
  draw(env, P, ctx) {
    const { W, H, sc } = env, t = env.t, s = Umin(env) * (P.s || 0.065), r3 = Math.sqrt(3), pw = r3 * s, ph = 3 * s, e = fadeIn(env, 0.6);
    const col = layC(sc, P.k || 0.09);
    const faces = ['top', 'left', 'right'].map((f, fi) => { const key = `iso|${f}|${col}|${s.toFixed(2)}`; return plate(key, env, pw, ph, (x, w, h) => fillTile(x, tileCv(key, env, pw, ph, (y) => {
      y.fillStyle = col; y.beginPath();
      for (let n2 = -2; n2 <= 3; n2++) for (let n1 = -3; n1 <= 3; n1++) {
        const cx = n1 * pw + n2 * pw / 2, cy = n2 * 1.5 * s;
        const T = [cx, cy - s], UR = [cx + pw / 2, cy - s / 2], LR = [cx + pw / 2, cy + s / 2], B = [cx, cy + s], LL = [cx - pw / 2, cy + s / 2], UL = [cx - pw / 2, cy - s / 2], C = [cx, cy];
        pathPoly(y, fi === 0 ? [T, UR, C, UL] : fi === 1 ? [UL, C, B, LL] : [UR, LR, B, C]);
      }
      y.fill();
    }), pw, ph, 0, 0, w, h)); });
    // the light direction turns slowly, so the three face sets trade brightness
    const L = (P.l0 || 0) + t * (P.spd || 0.25), dirs = [-Math.PI / 2, Math.PI * 5 / 6, Math.PI / 6];
    const ox = wrap(t * s * 0.25, pw), oy = wrap(t * s * 0.25 / r3 * 1.5, ph);
    faces.forEach((cv, fi) => { ctx.globalAlpha = e * (0.25 + 0.75 * (0.5 + 0.5 * Math.cos(L - dirs[fi]))); blit(ctx, env, cv, ox, oy); });
  } });

bgReg('hexGrid', { name: '六角格子', tags: ['graphic', 'glitch', 'calm'], w: 0.8,
  plan: rng => ({ seed: bs(rng), s: rng.range(0.05, 0.07), k: rng.range(0.09, 0.12), mode: rng.pick(['ring', 'ring', 'sparkle']) }),
  draw(env, P, ctx) {
    const { W, H, sc } = env, t = env.t, sd = P.seed || 1, U = Umin(env), s = U * (P.s || 0.06), r3 = Math.sqrt(3), e = fadeIn(env, 0.7);
    const cols = Math.ceil(W / (r3 * s)) + 2, rows = Math.ceil(H / (1.5 * s)) + 2, rr = s * 0.9, cx0 = W / 2, cy0 = H / 2;
    const lines = new Path2D(), lit = [new Path2D(), new Path2D(), new Path2D()], R = Math.hypot(W, H) / 2;
    const hex = (p, x, y, r) => { for (let m = 0; m < 6; m++) { const a = (m * 60 - 30) * DEG, px = x + Math.cos(a) * r, py = y + Math.sin(a) * r; if (m) p.lineTo(px, py); else p.moveTo(px, py); } p.closePath(); };
    const tw = Math.floor(t * 3);
    for (let j = -1; j < rows; j++) for (let i = -1; i < cols; i++) {
      const x = (i + (j & 1 ? 0.5 : 0)) * r3 * s, y = j * 1.5 * s, d = Math.hypot(x - cx0, y - cy0) / R;
      if (d > e * 1.2) continue;
      hex(lines, x, y, rr);
      let v;
      if (P.mode === 'sparkle') v = J.r(sd, i, j, tw) < 0.05 ? 1 - fract(t * 3) * 0.6 : 0;
      else v = Math.pow(0.5 + 0.5 * Math.cos((d * 3.2 - t * 0.55) * TAU), 6) * (0.6 + 0.4 * J.r(sd, i, j));
      if (v > 0.2) hex(lit[v > 0.75 ? 2 : v > 0.45 ? 1 : 0], x, y, rr * 0.86);
    }
    const k = P.k || 0.1;
    ctx.strokeStyle = layC(sc, k); ctx.lineWidth = Math.max(1, U * 0.0022); ctx.stroke(lines);
    [0.5, 1, 1.6].forEach((m, l) => { ctx.fillStyle = tintC(sc, k * m); ctx.fill(lit[l]); });
  } });

bgReg('triTess', { name: '三角モザイク', tags: ['graphic', 'calm', 'emotional'], w: 0.7,
  plan: rng => ({ seed: bs(rng), a: rng.range(0.1, 0.15), k: rng.range(0.07, 0.1), acc: rng.chance(0.35) }),
  draw(env, P, ctx) {
    const { W, H, sc } = env, t = env.t, sd = P.seed || 1, U = Umin(env), a = U * (P.a || 0.12), h = a * Math.sqrt(3) / 2, e = fadeIn(env, 0.8);
    const paths = [new Path2D(), new Path2D(), new Path2D(), new Path2D()], cols = Math.ceil(W / a) + 2, rows = Math.ceil(H / h) + 1;
    const sweep = (wrap(t * 0.07, 1.6) - 0.3) * (W + H);
    for (let r = 0; r < rows; r++) for (let i = -1; i < cols; i++) {
      const y0 = r * h, y1 = y0 + h, off = r & 1 ? a / 2 : 0;
      for (let up = 0; up < 2; up++) {
        const x0 = i * a + off + (up ? a / 2 : 0);
        const tri = up ? [[x0, y1], [x0 + a, y1], [x0 + a / 2, y0]] : [[x0, y0], [x0 + a, y0], [x0 + a / 2, y1]];
        const gx = x0 + a / 2, gy = up ? y0 + h * 0.66 : y0 + h * 0.33;
        let v = fbm2(gx / U * 1.6 + t * 0.12, gy / U * 1.6 - t * 0.07, sd, 2);
        v += 0.35 * Math.exp(-Math.pow((gx + gy - sweep) / (U * 0.35), 2));
        v = v * e + (J.r(sd, r, i, up) - 0.5) * 0.12;
        const lv = v > 0.78 ? 3 : v > 0.62 ? 2 : v > 0.46 ? 1 : v > 0.3 ? 0 : -1;
        if (lv < 0) continue;
        const p = paths[lv]; p.moveTo(tri[0][0], tri[0][1]); p.lineTo(tri[1][0], tri[1][1]); p.lineTo(tri[2][0], tri[2][1]); p.closePath();
      }
    }
    const k = P.k || 0.085, cf = P.acc ? tintC : layC;
    [0.35, 0.65, 1, 1.45].forEach((m, l) => { ctx.fillStyle = l === 3 && P.acc ? tintC(sc, k * m * 1.4) : cf(sc, k * m); ctx.fill(paths[l]); });
  } });

bgReg('moire', { name: 'モアレ', tags: ['glitch', 'graphic', 'calm'], w: 0.6,
  plan: rng => ({ seed: bs(rng), gap: rng.range(0.016, 0.022), k: rng.range(0.08, 0.11), amp: rng.range(0.05, 0.09) }),
  draw(env, P, ctx) {
    const { W, H, sc } = env, t = env.t, U = Umin(env), gap = U * (P.gap || 0.018), amp = U * (P.amp || 0.07), e = fadeIn(env, 0.8), s = (P.seed || 1) % 17;
    const col = layC(sc, P.k || 0.1), M = amp * 2.2;
    // one ring set, rendered once with a margin; the two interfering copies are blits of the same plate
    const pl = plate(`moi|${col}|${gap.toFixed(2)}|${M.toFixed(1)}`, env, M * 2, M * 2, (x, w, h) => {
      const cx = w / 2, cy = h / 2, Rm = Math.hypot(w, h) / 2;
      x.lineWidth = gap * 0.42; x.strokeStyle = col; x.beginPath();
      for (let r = gap; r < Rm; r += gap) { x.moveTo(cx + r, cy); x.arc(cx, cy, r, 0, TAU); }
      x.stroke();
    });
    const cs = [[amp * Math.sin(t * 0.33 + s), amp * 0.7 * Math.cos(t * 0.27 + s)], [-amp * Math.sin(t * 0.29 + s + 1), -amp * 0.7 * Math.cos(t * 0.37 + s + 2)]];
    ctx.globalAlpha = e;
    for (const [dx, dy] of cs) blit(ctx, env, pl, M - dx, M - dy);
  } });

bgReg('squareTunnel', { name: '四角トンネル', tags: ['glitch', 'graphic', 'pop'], w: 0.6,
  plan: rng => ({ seed: bs(rng), r: rng.range(1.22, 1.32), twist: rng.range(3, 7) * rng.pick([1, -1]), spd: rng.range(0.35, 0.6), k: rng.range(0.05, 0.07) }),
  draw(env, P, ctx) {
    const { W, H, sc } = env, t = env.t, U = Umin(env), r = P.r || 1.26, lr = Math.log(r), e = fadeIn(env, 0.5);
    const z = t * (P.spd || 0.45) + (1 - e) * 1.5, S0 = U * 0.08, maxS = Math.hypot(W, H) * 1.05;
    // square n has half-size S0 * r^(z - n): it grows as z advances (flying forward)
    let nLo = Math.floor(z - Math.log(maxS / S0) / lr) - 2; nLo -= ((nLo % 2) + 2) % 2;    // keep the parity of the outermost square fixed
    const nHi = Math.ceil(z - Math.log((U * 0.035) / S0) / lr);
    ctx.translate(W / 2, H / 2); ctx.beginPath();
    for (let n = nLo; n <= nHi && n - nLo < 60; n++) {
      const hs = S0 * Math.pow(r, z - n), a = ((z - n) * (P.twist || 5) + t * 4) * DEG, c = Math.cos(a) * hs, s = Math.sin(a) * hs;
      ctx.moveTo(c - s, s + c); ctx.lineTo(-c - s, -s + c); ctx.lineTo(-c + s, -s - c); ctx.lineTo(c + s, s - c); ctx.closePath();
    }
    ctx.fillStyle = layC(sc, P.k || 0.06); ctx.fill('evenodd');
  } });

bgReg('spiralArms', { name: '渦巻き', tags: ['glitch', 'pop', 'graphic'], w: 0.6,
  plan: rng => ({ seed: bs(rng), n: rng.int(3, 6), b: rng.range(0.26, 0.38), spd: rng.range(0.14, 0.24) * rng.pick([1, -1]), k: rng.range(0.055, 0.075), cy: rng.pick([0.5, 0.5, 0.56]) }),
  draw(env, P, ctx) {
    const { W, H, sc } = env, t = env.t, U = Umin(env), n = P.n || 4, b = P.b || 0.32, e = fadeIn(env, 0.7);
    const cx = W / 2, cy = H * (P.cy || 0.5), r0 = U * 0.09, Rm = Math.hypot(W, H) * 0.62, thMax = Math.log(Rm / r0) / b, w = Math.PI / n, steps = 72;
    const rot = t * (P.spd || 0.18) + (1 - e) * 1.2 * Math.sign(P.spd || 1);
    ctx.fillStyle = layC(sc, P.k || 0.065); ctx.beginPath();
    for (let k = 0; k < n; k++) {
      const base = rot + k * TAU / n;
      for (let i = 0; i <= steps; i++) { const th = thMax * i / steps, r = r0 * Math.exp(b * th) * (0.4 + 0.6 * e), a = base + th; i ? ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r) : ctx.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); }
      for (let i = steps; i >= 0; i--) { const th = thMax * i / steps, r = r0 * Math.exp(b * th) * (0.4 + 0.6 * e), a = base + th + w; ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); }
      ctx.closePath();
    }
    ctx.fill();
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, U * 0.42);
    g.addColorStop(0, J.rgba(sc.bg, 0.8)); g.addColorStop(1, J.rgba(sc.bg, 0));
    ctx.fillStyle = g; ctx.fillRect(cx - U * 0.42, cy - U * 0.42, U * 0.84, U * 0.84);
  } });

// marching squares: segment end points for each of the 16 corner cases (edges: 0 top, 1 right, 2 bottom, 3 left)
const MS = [[], [[3, 2]], [[2, 1]], [[3, 1]], [[0, 1]], [[0, 1], [3, 2]], [[0, 2]], [[3, 0]], [[3, 0]], [[0, 2]], [[3, 0], [2, 1]], [[0, 1]], [[3, 1]], [[2, 1]], [[3, 2]], []];
bgReg('topoLines', { name: '等高線', tags: ['calm', 'editorial', 'graphic'], w: 0.8,
  plan: rng => ({ seed: bs(rng), n: rng.int(10, 14), fs: rng.range(1.2, 1.7), k: rng.range(0.11, 0.15), acc: rng.chance(0.3) }),
  draw(env, P, ctx) {
    const { W, H, sc } = env, t = env.t, sd = P.seed || 1, U = Umin(env), cell = U / 24, e = fadeIn(env, 0.9);
    const nx = Math.ceil(W / cell) + 1, ny = Math.ceil(H / cell) + 1, fs = (P.fs || 1.4) / U, f = new Float32Array(nx * ny);
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const X = i * cell * fs, Y = j * cell * fs, rx = X * 0.8 - Y * 0.6, ry = X * 0.6 + Y * 0.8;
      const v = fbm2(rx + t * 0.035 + 0.35 * noise2(ry * 0.7, rx * 0.7, sd + 5), ry - t * 0.025, sd, 3);
      f[j * nx + i] = clamp((v - 0.5) * 2.1 + 0.5, -0.2, 1.2);
    }
    const n = P.n || 12, d = 1 / n, z = t * 0.06 + (1 - e) * 2, lines = new Path2D(), major = new Path2D();
    for (let m = -1; m <= n + 1; m++) {
      const L = (m + fract(z)) * d, g = m - Math.floor(z), p = ((g % 4) + 4) % 4 === 0 ? major : lines;
      for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
        const a = f[j * nx + i], b = f[j * nx + i + 1], c = f[(j + 1) * nx + i + 1], dd = f[(j + 1) * nx + i];
        const idx = (a > L ? 8 : 0) | (b > L ? 4 : 0) | (c > L ? 2 : 0) | (dd > L ? 1 : 0);
        if (idx === 0 || idx === 15) continue;
        const pt = ed => (ed === 0 ? [i + (L - a) / (b - a), j] : ed === 1 ? [i + 1, j + (L - b) / (c - b)] : ed === 2 ? [i + (L - dd) / (c - dd), j + 1] : [i, j + (L - a) / (dd - a)]);
        for (const [e0, e1] of MS[idx]) { const p0 = pt(e0), p1 = pt(e1); p.moveTo(p0[0] * cell, p0[1] * cell); p.lineTo(p1[0] * cell, p1[1] * cell); }
      }
    }
    const k = P.k || 0.13;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.globalAlpha = e;
    ctx.strokeStyle = layC(sc, k); ctx.lineWidth = Math.max(1, U * 0.0018); ctx.stroke(lines);
    ctx.strokeStyle = P.acc ? tintC(sc, k * 2.2) : layC(sc, k * 1.6); ctx.lineWidth = Math.max(1.5, U * 0.0036); ctx.stroke(major);
  } });

bgReg('ridgePlot', { name: '稜線グラフ', tags: ['editorial', 'emotional', 'calm'], w: 0.7,
  plan: rng => ({ seed: bs(rng), n: rng.int(18, 26), k: rng.range(0.15, 0.2), amp: rng.range(0.07, 0.1), mode: rng.pick(['center', 'center', 'wide']), spd: rng.range(0.18, 0.3) }),
  draw(env, P, ctx) {
    const { W, H, sc } = env, t = env.t, sd = P.seed || 1, U = Umin(env), n = P.n || 22, e = fadeIn(env, 1);
    const x0 = W * 0.06, x1 = W * 0.94, y0 = H * 0.2, y1 = H * 0.94, gap = (y1 - y0) / (n - 1), m = clamp(Math.round((x1 - x0) / (U * 0.012)), 60, 170);
    const amp = H * (P.amp || 0.085) * (W < H ? 0.6 : 1), lc = layC(sc, P.k || 0.17), fillC = J.rgba(sc.bg, sc.paper || (env.st.texture && env.st.texture.paper > 0.5) ? 0.72 : 0.9);
    ctx.lineWidth = Math.max(1, U * 0.0022); ctx.lineJoin = 'round'; ctx.strokeStyle = lc;
    for (let i = 0; i < n; i++) {
      const base = y0 + i * gap, grow = E.outCubic(clamp(e * 1.6 - i / n * 0.6)), pts = [];
      for (let j = 0; j <= m; j++) {
        const u = j / m, x = lerp(x0, x1, u);
        const env1 = P.mode === 'wide' ? 0.3 + 0.7 * Math.pow(Math.sin(Math.PI * u), 2) : 0.08 + 0.92 * Math.exp(-Math.pow((u - 0.5) / 0.16, 2));
        const v = Math.pow(0.5 + 0.5 * fbm1(u * 7 + t * (P.spd || 0.24) + i * 0.41, sd + i * 7, 3), 2.4);
        pts.push([x, base - amp * env1 * v * 2.2 * grow - H * 0.002 * J.noise1(u * 40 + i, sd)]);
      }
      ctx.fillStyle = fillC; ctx.beginPath(); ctx.moveTo(x0, base + 1);
      for (const p of pts) ctx.lineTo(p[0], p[1]);
      ctx.lineTo(x1, base + 1); ctx.closePath(); ctx.fill();
      ctx.beginPath(); pts.forEach((p, q) => (q ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.stroke();
    }
  } });

/* ================= SCENE ================= */
bgReg('starfield', { name: '星空', tags: ['emotional', 'calm'], w: 0.9,
  plan: rng => ({ seed: bs(rng), ang: rng.range(-0.3, 0.3) + (rng.chance(0.5) ? Math.PI : 0), spd: rng.range(0.8, 1.3), shoot: rng.chance(0.75) }),
  draw(env, P, ctx) {
    const { W, H, sc } = env, t = env.t, sd = P.seed || 1, U = Umin(env), dk = isDark(sc.bg), e = fadeIn(env, 0.9);
    const col = dk ? J.mix(sc.bg, sc.fg, 0.92) : J.lum(sc.bg) < 0.78 ? '#FFFFFF' : layC(sc, 0.5), area = Math.sqrt(W * H / (1920 * 1080));
    const vx = Math.cos(P.ang || 0), vy = Math.sin(P.ang || 0), spd = P.spd || 1;
    const layers = [[90, 0.0013, 0.006, 0.45], [46, 0.002, 0.018, 0.65], [18, 0.0032, 0.045, 0.85]];
    ctx.fillStyle = col;
    layers.forEach(([cnt, rad, sp, aB], l) => {
      const n = Math.round(cnt * area), v = U * sp * spd;
      for (let i = 0; i < n; i++) {
        const x = wrap(J.r(sd, l, i, 1) * W * 1.1 + t * v * vx, W * 1.1) - W * 0.05, y = wrap(J.r(sd, l, i, 2) * H * 1.1 + t * v * vy, H * 1.1) - H * 0.05;
        const r = U * rad * (0.6 + 0.8 * J.r(sd, l, i, 3)), tw = 0.5 + 0.5 * Math.sin(t * (1.1 + 2.6 * J.r(sd, l, i, 4)) + i * 1.7);
        const a = aB * (0.45 + 0.55 * tw) * e * (dk ? 1 : 0.65);
        ctx.globalAlpha = a;
        if (l < 2) ctx.fillRect(x - r, y - r, r * 2, r * 2);
        else {
          ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
          if (J.r(sd, l, i, 5) < 0.5) { ctx.globalAlpha = a * 0.5; const L = r * (4 + 3 * tw), th = Math.max(0.6, r * 0.25); ctx.fillRect(x - L, y - th / 2, L * 2, th); ctx.fillRect(x - th / 2, y - L, th, L * 2); }
        }
      }
    });
    if (P.shoot !== false) {
      const per = 3.4, idx = Math.floor(t / per), age = t - idx * per - J.r(sd, idx, 8) * 1.5;
      if (age > 0 && age < 0.75 && J.r(sd, idx, 9) < 0.85) {
        const q = age / 0.75, sx = W * J.rr(0.15, 0.7, sd, idx, 1), sy = H * J.rr(0.05, 0.35, sd, idx, 2), ang = J.rr(20, 38, sd, idx, 3) * DEG * (J.r(sd, idx, 4) < 0.5 ? 1 : -1);
        const dx = Math.cos(ang) * (ang < 0 ? -1 : 1), dy = Math.abs(Math.sin(ang)), L = U * 0.55;
        const hx = sx + dx * L * E.outQuad(q), hy = sy + dy * L * E.outQuad(q), tl = U * 0.16 * Math.sin(Math.PI * q);
        const g = ctx.createLinearGradient(hx, hy, hx - dx * tl, hy - dy * tl);
        g.addColorStop(0, J.rgba(col, 0.8 * e * (1 - q * 0.6))); g.addColorStop(1, J.rgba(col, 0));
        ctx.globalAlpha = 1; ctx.strokeStyle = g; ctx.lineWidth = Math.max(1, U * 0.002); ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx - dx * tl, hy - dy * tl); ctx.stroke();
      }
    }
  } });

bgReg('nightMoon', { name: '月夜', tags: ['emotional', 'calm', 'editorial'], w: 0.8,
  plan: rng => ({ seed: bs(rng), side: rng.pick([1, -1]), R: rng.range(0.11, 0.15), phase: rng.pick(['full', 'crescent', 'crescent']), k: rng.range(0.18, 0.26) }),
  draw(env, P, ctx) {
    const { W, H, sc } = env, t = env.t, sd = P.seed || 1, U = Umin(env), dk = isDark(sc.bg), e = fadeIn(env, 1.2), side = P.side || 1, port = H > W;
    const R = U * (P.R || 0.13), mx = W * (0.5 + side * (port ? 0.2 : 0.3)), my = H * (port ? 0.2 : 0.27) + (1 - e) * H * 0.06;
    const moonC = dk ? J.mix(sc.bg, glowOf(sc) === sc.fg ? sc.fg : J.mix(sc.fg, glowOf(sc), 0.3), P.k || 0.22) : J.mix(sc.bg, '#FFFFFF', 0.55);
    const haloC = dk ? moonC : J.mix(sc.bg, '#FFFFFF', 0.7);
    // stars (sparse, twinkling)
    const nS = Math.round(28 * Math.sqrt(W * H / (1920 * 1080)));
    ctx.fillStyle = dk ? layC(sc, 0.55) : layC(sc, 0.2);
    for (let i = 0; i < nS; i++) {
      const x = J.r(sd, i, 1) * W, y = J.r(sd, i, 2) * H * 0.62, r = U * J.rr(0.001, 0.0024, sd, i, 3);
      if (Math.hypot(x - mx, y - my) < R * 2.2) continue;
      ctx.globalAlpha = e * (0.2 + 0.4 * (0.5 + 0.5 * Math.sin(t * J.rr(0.8, 2.4, sd, i, 4) + i))); ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    ctx.globalAlpha = e;
    const br = 0.9 + 0.1 * Math.sin(t * 0.7), g = ctx.createRadialGradient(mx, my, R * 0.9, mx, my, R * 3.4);
    g.addColorStop(0, J.rgba(haloC, (dk ? 0.35 : 0.5) * br)); g.addColorStop(0.3, J.rgba(haloC, (dk ? 0.1 : 0.18) * br)); g.addColorStop(1, J.rgba(haloC, 0));
    ctx.fillStyle = g; ctx.fillRect(mx - R * 3.4, my - R * 3.4, R * 6.8, R * 6.8);
    ctx.save();
    if (P.phase === 'crescent') { ctx.beginPath(); ctx.rect(mx - R * 2, my - R * 2, R * 4, R * 4); ctx.arc(mx + side * R * 0.42, my - R * 0.22, R * 0.9, 0, TAU); ctx.clip('evenodd'); }
    ctx.fillStyle = moonC; ctx.beginPath(); ctx.arc(mx, my, R, 0, TAU); ctx.fill();
    if (P.phase !== 'crescent') {
      ctx.fillStyle = J.mix(moonC, sc.bg, 0.22); ctx.beginPath();
      for (let i = 0; i < 6; i++) { const a = J.r(sd, i, 11) * TAU, d = R * Math.sqrt(J.r(sd, i, 12)) * 0.7, cr = R * J.rr(0.08, 0.2, sd, i, 13); ctx.moveTo(mx + Math.cos(a) * d + cr, my + Math.sin(a) * d); ctx.arc(mx + Math.cos(a) * d, my + Math.sin(a) * d, cr, 0, TAU); }
      ctx.fill();
    }
    ctx.restore();
    // thin cloud streaks drifting across the moon
    const cloudC = dk ? J.mix(sc.bg, sc.fg, 0.07) : J.mix(sc.bg, sc.fg, 0.05);
    const cap = (x, y, w, h) => { ctx.moveTo(x + h / 2, y); ctx.lineTo(x + w - h / 2, y); ctx.arc(x + w - h / 2, y + h / 2, h / 2, -Math.PI / 2, Math.PI / 2); ctx.lineTo(x + h / 2, y + h); ctx.arc(x + h / 2, y + h / 2, h / 2, Math.PI / 2, Math.PI * 1.5); ctx.closePath(); };
    ctx.fillStyle = cloudC;
    for (let i = 0; i < 3; i++) {
      const w = U * J.rr(0.4, 0.7, sd, i, 21), h = U * J.rr(0.02, 0.03, sd, i, 22), L = W + w * 2;
      const x = wrap((i + J.r(sd, i, 23) * 0.5) / 3 * L + t * U * J.rr(0.025, 0.045, sd, i, 24), L) - w, y = my + R * (i - 1) * 0.8 + R * J.rr(-0.2, 0.3, sd, i, 25);
      ctx.globalAlpha = e * 0.7; ctx.beginPath();
      cap(x, y, w, h); cap(x + w * J.rr(0.15, 0.4, sd, i, 26), y - h * 0.75, w * 0.45, h * 0.9); cap(x + w * J.rr(0.35, 0.6, sd, i, 27), y + h * 0.7, w * 0.5, h * 0.8);
      ctx.fill();
    }
  } });

bgReg('skyline', { name: '街並み', tags: ['emotional', 'editorial', 'pop'], w: 0.8,
  plan: rng => ({ seed: bs(rng), k: rng.range(0.08, 0.11), dir: rng.pick([1, -1]), win: rng.range(0.22, 0.34) }),
  draw(env, P, ctx) {
    const { W, H, sc } = env, t = env.t, sd = P.seed || 1, U = Umin(env), dk = isDark(sc.bg), e = fadeIn(env, 0.9), k = P.k || 0.09;
    const Lp = Math.max(W, H) * 1.5, rise = (1 - e) * H * 0.25;
    // horizon glow behind the city
    const gc = dk ? glowOf(sc) : sc.accent, g = ctx.createLinearGradient(0, H * 0.5, 0, H);
    g.addColorStop(0, J.rgba(gc, 0)); g.addColorStop(1, J.rgba(gc, (dk ? 0.1 : 0.08) * e));
    ctx.fillStyle = g; ctx.fillRect(0, H * 0.5, W, H * 0.5);
    const winLit = dk ? J.mix(sc.bg, glowOf(sc), 0.4) : J.mix(layC(sc, k * 1.1), '#FFFFFF', 0.55);
    [[0.6, 0.12, 0.34, 0.012], [1.1, 0.06, 0.2, 0.03]].forEach(([km, h0, h1, v], l) => {
      const col = layC(sc, k * km), off = wrap(t * U * v * (P.dir || 1), Lp), body = new Path2D(), wins = new Path2D();
      let x = 0, b = 0;
      while (x < Lp && b < 80) {
        const w = U * J.rr(0.05, 0.12, sd, l, b, 1), gapW = U * J.rr(0, 0.012, sd, l, b, 2);
        const h = H * J.rr(h0, h1, sd, l, b, 3) * (W < H ? 0.75 : 1), tier = J.r(sd, l, b, 4) < 0.35, ant = J.r(sd, l, b, 5) < 0.25;
        for (const X0 of [x - off, x - off + Lp]) {
          if (X0 > W || X0 + w < 0) continue;
          const top = H - h + rise;
          body.rect(X0, top, w, h + 2);
          if (tier) body.rect(X0 + w * 0.2, top - h * 0.12, w * 0.6, h * 0.12 + 1);
          if (ant) body.rect(X0 + w * 0.5 - 1, top - h * (tier ? 0.32 : 0.2), Math.max(1.5, U * 0.002), h * 0.2);
          const cw = U * 0.022, ch = U * 0.03, nx = Math.floor((w - cw * 0.4) / cw), ny = Math.floor((h - ch) / ch);
          for (let wy = 0; wy < ny && wy < 30; wy++) for (let wx = 0; wx < nx; wx++) {
            const ph = Math.floor(t * 0.25 + J.r(sd, l, b, wx, wy) * 7);
            if (J.r(sd + ph, l * 97 + b, wx, wy) > (P.win || 0.28)) continue;
            wins.rect(X0 + (w - nx * cw) / 2 + wx * cw + cw * 0.3, top + ch * 0.7 + wy * ch, cw * 0.4, ch * 0.45);
          }
        }
        x += w + gapW; b++;
      }
      ctx.globalAlpha = 1; ctx.fillStyle = col; ctx.fill(body);
      ctx.globalAlpha = l ? 0.8 : 0.5; ctx.fillStyle = winLit; ctx.fill(wins);
    });
  } });

bgReg('sunsetSun', { name: '夕日', tags: ['emotional', 'calm', 'pop'], w: 0.8,
  plan: rng => ({ seed: bs(rng), hz: rng.range(0.7, 0.76), R: rng.range(0.12, 0.16), cx: rng.pick([rng.range(0.22, 0.34), rng.range(0.66, 0.78)]), k: rng.range(0.28, 0.36) }),
  draw(env, P, ctx) {
    const { W, H, sc } = env, t = env.t, sd = P.seed || 1, U = Umin(env), dk = isDark(sc.bg), e = fadeIn(env, 1.2), k = P.k || 0.35;
    const hz = H * (P.hz || 0.72) * (W < H ? 0.97 : 1), R = U * (P.R || 0.14), cx = W * (W < H ? 0.5 + ((P.cx || 0.3) - 0.5) * 0.6 : (P.cx || 0.3)), bt = bgT(env);
    const cy = hz - R * 0.5 + R * 0.35 * clamp(bt / 14) + (1 - e) * R * 0.9;
    const sunBase = dk ? glowOf(sc) : sc.accent, sunC = J.mix(sc.bg, sunBase, k * (dk ? 1 : 0.7));
    const sky = ctx.createLinearGradient(0, hz - H * 0.5, 0, hz);
    sky.addColorStop(0, J.rgba(sunBase, 0)); sky.addColorStop(1, J.rgba(sunBase, (dk ? 0.12 : 0.1) * e));
    ctx.fillStyle = sky; ctx.fillRect(0, hz - H * 0.5, W, H * 0.5);
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, hz); ctx.clip();
    const halo = ctx.createRadialGradient(cx, cy, R, cx, cy, R * 3);
    halo.addColorStop(0, J.rgba(sunC, 0.45 * e)); halo.addColorStop(1, J.rgba(sunC, 0));
    ctx.fillStyle = halo; ctx.fillRect(cx - R * 3, cy - R * 3, R * 6, R * 6);
    ctx.globalAlpha = e; ctx.fillStyle = sunC; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fill();
    ctx.restore();
    ctx.globalAlpha = e; ctx.fillStyle = layC(sc, 0.14); ctx.fillRect(0, hz - 0.5, W, Math.max(1, U * 0.0016));
    // water: shimmering reflection strokes under the sun + faint swell lines
    ctx.fillStyle = sunC;
    for (let j = 0; j < 18; j++) {
      const y = hz + U * 0.012 * Math.pow(j + 1, 1.3); if (y > H) break;
      const q = j / 18, hh = Math.max(1.2, U * 0.0035 * (1 + j * 0.1));
      const wv = R * (1.25 - q * 0.6) * (0.55 + 0.45 * J.noise1(t * 1.3 + j * 1.9, sd)), xo = R * 0.18 * J.noise1(t * 0.9 + j * 2.7, sd + 3);
      ctx.globalAlpha = e * 0.75 * (1 - q) * (0.6 + 0.4 * J.noise1(t * 2 + j, sd + 5));
      const split = 0.2 + 0.15 * J.noise1(t * 1.7 + j * 3.3, sd + 9);
      ctx.fillRect(cx + xo - wv, y, wv * (1 - split), hh); ctx.fillRect(cx + xo - wv + wv * (1 + split) , y, wv * (1 - split), hh);
    }
    ctx.fillStyle = layC(sc, 0.08);
    for (let j = 0; j < 7; j++) {
      const y = hz + (H - hz) * (0.12 + j * 0.13), x = wrap(t * U * 0.03 * (j % 2 ? 1 : -1) + J.r(sd, j, 31) * W, W * 1.4) - W * 0.2;
      ctx.globalAlpha = e * 0.8; ctx.fillRect(x, y, U * J.rr(0.15, 0.4, sd, j, 32), Math.max(1, U * 0.0018));
    }
  } });

bgReg('oceanWaves', { name: '海の波', tags: ['calm', 'emotional', 'editorial'], w: 0.8,
  plan: rng => ({ seed: bs(rng), n: rng.int(9, 13), hz: rng.range(0.48, 0.58), k: rng.range(0.12, 0.17), dir: rng.pick([1, -1]) }),
  draw(env, P, ctx) {
    const { W, H, sc } = env, t = env.t, sd = P.seed || 1, U = Umin(env), n = P.n || 11, hz = P.hz || 0.52, e = fadeIn(env, 0.9), dir = P.dir || 1;
    const m = clamp(Math.round(W / (U * 0.012)), 60, 200);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const q = (i + 1) / n, y0 = H * (hz + (1 - hz) * Math.pow(q, 1.55)) + (1 - e) * H * 0.15 * q;
      const A = U * (0.004 + 0.028 * Math.pow(q, 1.4)), lam = W * (0.07 + 0.3 * q), w = 0.9 + 0.5 * J.r(sd, i, 1), ph = J.r(sd, i, 2) * TAU;
      ctx.beginPath();
      for (let j = 0; j <= m; j++) {
        const x = W * j / m, u = x / lam * TAU;
        const y = y0 + A * (Math.sin(u - t * w * dir + ph) + 0.35 * Math.sin(u * 2.3 + t * w * 1.3 * dir + ph * 2) + 0.2 * J.noise1(x / U * 3 + t * 0.4, sd + i));
        j ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.globalAlpha = e; ctx.strokeStyle = layC(sc, (P.k || 0.14) * (0.45 + 0.75 * q)); ctx.lineWidth = Math.max(1, U * (0.0014 + 0.0035 * q)); ctx.stroke();
    }
  } });

bgReg('rainWindow', { name: '雨の窓', tags: ['emotional', 'calm', 'editorial'], w: 0.8,
  plan: rng => ({ seed: bs(rng), ang: rng.range(4, 13) * rng.pick([1, -1]), n: rng.int(100, 140), k: rng.range(0.15, 0.2), drops: rng.int(16, 24) }),
  draw(env, P, ctx) {
    const { W, H, sc } = env, t = env.t, sd = P.seed || 1, U = Umin(env), e = fadeIn(env, 0.6), k = P.k || 0.15, dk = isDark(sc.bg);
    const area = Math.sqrt(W * H / (1920 * 1080)), n = Math.round((P.n || 70) * area), tn = Math.tan((P.ang || 8) * DEG), span = W + H * Math.abs(tn);
    ctx.strokeStyle = layC(sc, k); ctx.lineWidth = Math.max(1, U * 0.0016); ctx.lineCap = 'round'; ctx.globalAlpha = e * 0.85; ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const v = H * J.rr(1.3, 2.1, sd, i, 1), L = H * J.rr(0.03, 0.09, sd, i, 2);
      const y = wrap(J.r(sd, i, 4) * (H + L) + t * v, H + L) - L, x = J.r(sd, i, 3) * span - (tn > 0 ? H * tn : 0) + y * tn;
      ctx.moveTo(x, y); ctx.lineTo(x + L * tn, y + L);
    }
    ctx.stroke();
    const fog = ctx.createLinearGradient(0, H * 0.62, 0, H);
    fog.addColorStop(0, J.rgba(sc.fg, 0)); fog.addColorStop(1, J.rgba(sc.fg, 0.05 * e));
    ctx.globalAlpha = 1; ctx.fillStyle = fog; ctx.fillRect(0, H * 0.62, W, H * 0.38);
    // drops on the glass: sit, grow, then slide down leaving a trail
    const dc = layC(sc, k * 1.5), hc = dk ? layC(sc, k * 3.5) : J.mix(sc.bg, '#FFFFFF', 0.7);
    for (let i = 0; i < (P.drops || 12); i++) {
      const per = J.rr(3.5, 6.5, sd, i, 11), u = wrap(t + J.r(sd, i, 12) * per, per) / per, u0 = 0.6;
      const cyc = Math.floor((t + J.r(sd, i, 12) * per) / per), x0 = J.rr(0.03, 0.97, sd, i, cyc, 13) * W, y0 = J.rr(0.04, 0.7, sd, i, cyc, 14) * H;
      let r = U * J.rr(0.008, 0.019, sd, i, 15), x = x0, y = y0, a = e * clamp(u / 0.08);
      if (u < u0) r *= 0.65 + 0.35 * u / u0;
      else {
        const q = (u - u0) / (1 - u0);
        y = y0 + E.inQuad(q) * H * 1.15; x = x0 + U * 0.006 * Math.sin(q * 18 + i);
        ctx.globalAlpha = e * 0.55 * (1 - q * 0.5); ctx.strokeStyle = dc; ctx.lineWidth = r * 0.45;
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(x0 + U * 0.004 * Math.sin(i), (y0 + y) / 2, x, y - r * 0.8); ctx.stroke();
      }
      if (y - r > H) continue;
      ctx.globalAlpha = a * 0.9; ctx.fillStyle = dc; ctx.beginPath(); ctx.ellipse(x, y, r * 0.9, r, 0, 0, TAU); ctx.fill();
      ctx.globalAlpha = a * 0.7; ctx.fillStyle = hc; ctx.beginPath(); ctx.arc(x - r * 0.3, y - r * 0.35, r * 0.28, 0, TAU); ctx.fill();
    }
  } });

const softDot = col => cached('dot|' + col, () => {
  const c = mkCv(64, 64), x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, J.rgba(col, 1)); g.addColorStop(0.45, J.rgba(col, 0.75)); g.addColorStop(1, J.rgba(col, 0));
  x.fillStyle = g; x.fillRect(0, 0, 64, 64); return c;
});
bgReg('snowLayers', { name: '雪', tags: ['calm', 'emotional'], w: 0.9,
  plan: rng => ({ seed: bs(rng), wind: rng.range(-0.45, 0.45), dens: rng.range(0.85, 1.2) }),
  draw(env, P, ctx) {
    const { W, H, sc } = env, t = env.t, sd = P.seed || 1, U = Umin(env), e = fadeIn(env, 1);
    const col = J.lum(sc.bg) < 0.88 ? J.mix(sc.bg, '#FFFFFF', 0.92) : layC(sc, 0.35), spr = softDot(col), area = Math.sqrt(W * H / (1920 * 1080)) * (P.dens || 1);
    const layers = [[70, 0.0045, 0.05, 0.012, 0.5], [36, 0.009, 0.09, 0.02, 0.6], [11, 0.02, 0.16, 0.035, 0.32]];
    layers.forEach(([cnt, sz, v, sw, aB], l) => {
      const n = Math.round(cnt * area), vy = H * v, vx = vy * (P.wind || 0);
      for (let i = 0; i < n; i++) {
        const s = U * sz * (0.7 + 0.6 * J.r(sd, l, i, 1)), f = J.rr(0.5, 1.3, sd, l, i, 2);
        const y = wrap(J.r(sd, l, i, 3) * H * 1.2 + t * vy * (0.8 + 0.4 * J.r(sd, l, i, 4)), H * 1.2) - H * 0.1;
        const x = wrap(J.r(sd, l, i, 5) * W * 1.1 + t * vx + Math.sin(t * f + i) * U * sw, W * 1.1) - W * 0.05;
        ctx.globalAlpha = aB * e * (0.6 + 0.4 * J.r(sd, l, i, 6));
        ctx.drawImage(spr, x - s, y - s, s * 2, s * 2);
      }
    });
  } });

bgReg('fireworks', { name: '花火', tags: ['pop', 'emotional'], w: 0.7,
  plan: rng => ({ seed: bs(rng), per: rng.range(0.55, 0.8), k: rng.range(0.42, 0.55) }),
  draw(env, P, ctx) {
    const { W, H, sc } = env, t = env.t, sd = P.seed || 1, U = Umin(env), dk = isDark(sc.bg), e = fadeIn(env, 0.3), cols = hues(sc);
    const per = P.per || 0.65, idx = Math.floor(t / per), launch = 0.45, life = 2, K = (P.k || 0.48) * e * (dk ? 1 : 0.6), g = U * 0.11;
    if (dk) ctx.globalCompositeOperation = 'screen';
    ctx.lineCap = 'round';
    for (let b = idx - 5; b <= idx; b++) {
      const t0 = b * per + J.r(sd, b, 1) * per * 0.5, age = t - t0;
      if (age < 0 || age > launch + life) continue;
      const ox = W * J.rr(0.1, 0.9, sd, b, 2), oy = H * J.rr(0.1, 0.48, sd, b, 3), base = cols[J.h(sd, b, 4) % cols.length], c = dk ? base : J.mix(base, sc.bg, 0.2);
      if (age < launch) {
        const q = E.outQuad(age / launch), y = lerp(H * 1.02, oy, q), y2 = lerp(H * 1.02, oy, E.outQuad(Math.max(0, age - 0.12) / launch));
        ctx.globalAlpha = K * 0.6; ctx.strokeStyle = c; ctx.lineWidth = Math.max(1, U * 0.0022);
        ctx.beginPath(); ctx.moveTo(ox + Math.sin(age * 30) * U * 0.002, y); ctx.lineTo(ox, y2); ctx.stroke();
        continue;
      }
      const a = age - launch, n0 = 28 + (J.h(sd, b, 5) % 14), n = n0 * 2, V = U * J.rr(0.7, 1.05, sd, b, 6), fade = Math.pow(1 - a / life, 1.6);
      const pos = (j, tt, sp, th) => { const d = sp * (1 - Math.exp(-2.6 * tt)) / 2.6; return [ox + Math.cos(th) * d, oy + Math.sin(th) * d + 0.5 * g * tt * tt]; };
      ctx.strokeStyle = c; ctx.lineWidth = Math.max(1, U * 0.0024); ctx.globalAlpha = K * fade; ctx.beginPath();
      const heads = [];
      for (let j = 0; j < n; j++) {
        const ring = j >= n0, th = (j % n0) / n0 * TAU + (ring ? Math.PI / n0 : 0) + J.rs(sd, b, j) * 0.1, sp = V * (ring ? 0.55 : 1) * (0.85 + 0.15 * J.r(sd, b, j, 7));
        const p1 = pos(j, a, sp, th), p0 = pos(j, Math.max(0, a - 0.16), sp, th);
        ctx.moveTo(p0[0], p0[1]); ctx.lineTo(p1[0], p1[1]); heads.push(p1);
      }
      ctx.stroke();
      ctx.fillStyle = dk ? J.mix(c, '#FFFFFF', 0.5) : c;
      for (let j = 0; j < heads.length; j++) {
        if (a > 0.9 && J.r(sd, b, j, env.step) < 0.35) continue;         // crackle at the end
        ctx.globalAlpha = K * fade; const r = U * 0.0028; ctx.fillRect(heads[j][0] - r, heads[j][1] - r, r * 2, r * 2);
      }
      if (a < 0.25) {
        const fr = U * 0.12, gg = ctx.createRadialGradient(ox, oy, 0, ox, oy, fr);
        gg.addColorStop(0, J.rgba(c, K * 0.6 * (1 - a / 0.25))); gg.addColorStop(1, J.rgba(c, 0));
        ctx.globalAlpha = 1; ctx.fillStyle = gg; ctx.fillRect(ox - fr, oy - fr, fr * 2, fr * 2);
      }
    }
  } });

bgReg('cloudLayers', { name: '雲', tags: ['calm', 'emotional', 'pop'], w: 0.8,
  plan: rng => ({ seed: bs(rng), dir: rng.pick([1, -1]), k: rng.range(0.06, 0.09) }),
  draw(env, P, ctx) {
    const { W, H, sc } = env, t = env.t, sd = P.seed || 1, U = Umin(env), e = fadeIn(env, 1), k = P.k || 0.075, dir = P.dir || 1;
    const layers = [[0.1, 0.3, 0.55, 0.012, 0.55], [0.3, 0.55, 0.8, 0.026, 0.8], [0.72, 0.98, 1.15, 0.05, 1.1]];
    layers.forEach(([ya, yb, scl, v, km], l) => {
      const cw0 = U * 0.5 * scl, Lp = W + cw0 * 2.4, path = new Path2D();
      for (let c = 0; c < 4; c++) {
        const cw = cw0 * J.rr(0.75, 1.2, sd, l, c, 1), x = wrap((c + J.r(sd, l, c, 2) * 0.6) / 4 * Lp + t * U * v * dir, Lp) - cw * 1.2;
        const y = H * J.rr(ya, yb, sd, l, c, 3) + (1 - e) * H * 0.05 * (l + 1), np = 5 + (J.h(sd, l, c) % 3);
        let rmin = 1e9;
        for (let p = 0; p < np; p++) {
          const f = (p + 0.5) / np, pr = cw / np * (0.75 + 1.05 * Math.sin(Math.PI * f)) * (0.85 + 0.3 * J.r(sd, l, c, p, 4)) * (1 + 0.04 * Math.sin(t * 0.6 + p + c));
          const px = x + cw * f + J.rs(sd, l, c, p, 5) * cw * 0.03;
          path.moveTo(px + pr, y - pr); path.arc(px, y - pr, pr, 0, TAU); rmin = Math.min(rmin, pr);
        }
        path.rect(x + cw * 0.5 / np, y - rmin, cw * (1 - 1 / np), rmin);
      }
      ctx.globalAlpha = 1; ctx.fillStyle = layC(sc, k * km); ctx.fill(path);
    });
  } });

bgReg('mountains', { name: '山並み', tags: ['calm', 'emotional', 'editorial'], w: 0.8,
  plan: rng => ({ seed: bs(rng), n: rng.int(3, 4), k: rng.range(0.07, 0.1), dir: rng.pick([1, -1]), mist: rng.chance(0.7) }),
  draw(env, P, ctx) {
    const { W, H, sc } = env, t = env.t, sd = P.seed || 1, U = Umin(env), e = fadeIn(env, 1.1), n = P.n || 3, k = P.k || 0.085;
    const m = clamp(Math.round(W / (U * 0.01)), 60, 220), port = H > W;
    for (let l = 0; l < n; l++) {
      const q = n > 1 ? l / (n - 1) : 1, base = H * ((port ? 0.68 : 0.64) + 0.14 * q) + (1 - e) * H * 0.3 * (1 - q * 0.4), A = H * (port ? 0.17 : 0.3) * (1 - 0.35 * q);
      const off = t * 0.012 * (l + 1) * (P.dir || 1) + l * 7.3, sc2 = U * (0.42 + 0.2 * (1 - q));
      ctx.beginPath(); ctx.moveTo(-2, H + 2);
      for (let j = 0; j <= m; j++) {
        const x = W * j / m, X = x / sc2 + off;
        let v = 0, amp = 1, f = 1, nrm = 0;
        for (let o = 0; o < 4; o++) { v += (1 - Math.abs(J.noise1(X * f, sd + l * 31 + o * 7))) * amp; nrm += amp; amp *= 0.48; f *= 2.2; }
        v = clamp((v / nrm - 0.4) * 1.8);
        ctx.lineTo(x, base - A * Math.pow(v, 2));
      }
      ctx.lineTo(W + 2, H + 2); ctx.closePath();
      ctx.fillStyle = layC(sc, k * (0.45 + 0.75 * q)); ctx.globalAlpha = 1; ctx.fill();
      if (P.mist !== false && l < n - 1) {
        const g = ctx.createLinearGradient(0, base - A * 0.25, 0, base + H * 0.06);
        g.addColorStop(0, J.rgba(sc.bg, 0)); g.addColorStop(1, J.rgba(sc.bg, 0.55));
        ctx.fillStyle = g; ctx.fillRect(0, base - A * 0.25, W, A * 0.25 + H * 0.06);
        ctx.fillStyle = J.rgba(sc.bg, 0.55); ctx.fillRect(0, base + H * 0.06, W, H);
      }
    }
  } });

/* ================= TEXTURE / EFFECT ================= */
bgReg('filmStrip', { name: 'フィルム', tags: ['editorial', 'emotional', 'glitch'], w: 0.7,
  plan: rng => ({ seed: bs(rng), dir: rng.pick([1, -1]), spd: rng.range(0.6, 1.2), scratch: rng.chance(0.7) }),
  draw(env, P, ctx) {
    const { W, H, sc } = env, t = env.t, sd = P.seed || 1, U = Umin(env), dk = isDark(sc.bg), e = E.outExpo(clamp(bgT(env) / 0.55)), vert = H > W;
    const b = U * 0.085, L = vert ? H : W, slide = (1 - e) * b * 1.3;
    const band = dk ? layC(sc, 0.05) : layC(sc, 0.13), hole = dk ? layC(sc, 0.17) : J.mix(sc.bg, '#FFFFFF', 0.55), edge = dk ? layC(sc, 0.12) : layC(sc, 0.22);
    const p = b * 0.62, hw = b * 0.3, hh = b * 0.38, off = wrap(t * p * (P.spd || 0.9) * (P.dir || 1), p);
    const R = (a, c, w, h) => (vert ? ctx.rect(c, a, h, w) : ctx.rect(a, c, w, h));     // a: along, c: across
    for (const side of [0, 1]) {
      const c0 = side ? (vert ? W : H) - b + slide : -slide;
      ctx.fillStyle = band; ctx.beginPath(); R(0, c0, L, b); ctx.fill();
      ctx.fillStyle = edge; ctx.beginPath(); R(0, side ? c0 : c0 + b - Math.max(1, U * 0.002), L, Math.max(1, U * 0.002)); ctx.fill();
      ctx.fillStyle = hole; ctx.beginPath();
      for (let a = off - p; a < L + p; a += p) {
        const x = a + (p - hw) / 2, y = c0 + (b - hh) / 2 + (side ? b * 0.12 : -b * 0.12), r = b * 0.06;
        if (vert) ctx.roundRect ? ctx.roundRect(y, x, hh, hw, r) : ctx.rect(y, x, hh, hw); else ctx.roundRect ? ctx.roundRect(x, y, hw, hh, r) : ctx.rect(x, y, hw, hh);
      }
      ctx.fill();
      // frame dividers every 4 perforations
      ctx.fillStyle = edge; ctx.beginPath();
      for (let a = wrap(off, p * 4) - p * 4; a < L + p; a += p * 4) R(a, c0 + b * (side ? 0.72 : 0.08), Math.max(1, U * 0.002), b * 0.2);
      ctx.fill();
    }
    if (P.scratch !== false) {        // flickering scratches + dust (change on the drawing clock)
      const st = env.step;
      ctx.fillStyle = dk ? layC(sc, 0.35) : layC(sc, 0.3);
      for (let i = 0; i < 3; i++) {
        if (J.r(sd, st, i, 1) > 0.55) continue;
        const x = J.r(sd, st >> 2, i, 2) * (vert ? H : W) + J.rs(sd, st, i, 3) * U * 0.004, w = Math.max(1, U * J.rr(0.0008, 0.002, sd, st, i, 4));
        ctx.globalAlpha = e * J.rr(0.1, 0.22, sd, st, i, 5);
        if (vert) ctx.fillRect(0, x, W, w); else ctx.fillRect(x, 0, w, H);
      }
      for (let i = 0; i < 6; i++) {
        if (J.r(sd, st, i, 6) > 0.5) continue;
        const r = U * J.rr(0.001, 0.003, sd, st, i, 7);
        ctx.globalAlpha = e * 0.25; ctx.fillRect(J.r(sd, st, i, 8) * W, J.r(sd, st, i, 9) * H, r * 2, r * 1.4);
      }
    }
  } });

// VHS speckle noise, pre-rendered once per colour / size (3 variants swapped on the drawing clock)
const vhsNoise = (col, w, h, v) => cached(`vhs|${col}|${w}x${h}|${v}`, () => {
  const c = mkCv(w, h), x = c.getContext('2d'), id = x.createImageData(w, h), d = id.data, [r, g, b] = J.hex(col);
  for (let y = 0; y < h; y++) {
    const row = 0.35 + 0.65 * hash2(3, y, v * 13 + 1);
    for (let i = 0; i < w; i++) {
      let n = hash2(i >> 1, y, v * 7 + 2); n = n * n * n;
      if (hash2(i >> 4, y, v * 5 + 3) > 0.94) n = Math.max(n, 0.55 + 0.45 * hash2(i, y, v + 9));
      const o = (y * w + i) * 4; d[o] = r; d[o + 1] = g; d[o + 2] = b; d[o + 3] = Math.round(255 * clamp(n * row));
    }
  }
  x.putImageData(id, 0, 0); return c;
});
bgReg('vhsBand', { name: 'VHSノイズ', tags: ['glitch', 'emotional'], w: 0.6,
  plan: rng => ({ seed: bs(rng), h: rng.range(0.07, 0.12), spd: rng.range(0.08, 0.16) * rng.pick([1, -1]), k: rng.range(0.22, 0.32) }),
  draw(env, P, ctx) {
    const { W, H, sc } = env, t = env.t, sd = P.seed || 1, U = Umin(env), dk = isDark(sc.bg), e = fadeIn(env, 0.3), st = env.step;
    const q = Math.min(1, env.scale || 1) * 0.5, nw = Math.max(64, Math.ceil(W * q)), nh = Math.max(32, Math.ceil(H * 0.2 * q));
    const col = dk ? sc.fg : J.mix(sc.fg, sc.bg, 0.2), k = (P.k || 0.26) * e * (dk ? 1 : 0.75), nz = vhsNoise(col, nw, nh, ((st % 3) + 3) % 3);
    const bh = H * (P.h || 0.09), y = wrap(t * H * (P.spd || 0.12) + J.r(sd, 1) * H, H * 1.3) - H * 0.15;
    ctx.imageSmoothingEnabled = false;
    // rolling band: noise, soft smear and a couple of tracking lines
    const sh = Math.min(nh, Math.ceil(bh * q)), sy = Math.floor(J.r(sd, st, 2) * Math.max(1, nh - sh));
    ctx.globalAlpha = k; ctx.drawImage(nz, 0, sy, nw, sh, J.rs(sd, st, 3) * U * 0.01, y, W, bh);
    const g = ctx.createLinearGradient(0, y - bh * 0.6, 0, y + bh * 1.4), lc = lightOn(sc);
    g.addColorStop(0, J.rgba(lc, 0)); g.addColorStop(0.4, J.rgba(lc, dk ? 0.05 : 0.1)); g.addColorStop(1, J.rgba(lc, 0));
    ctx.globalAlpha = e; ctx.fillStyle = g; ctx.fillRect(0, y - bh * 0.6, W, bh * 2);
    ctx.fillStyle = layC(sc, dk ? 0.3 : 0.2);
    for (let i = 0; i < 3; i++) {
      const ly = y + bh * J.r(sd, st >> 1, i, 4), lx = J.r(sd, st, i, 5) * W * 0.6;
      ctx.globalAlpha = e * 0.5; ctx.fillRect(lx, ly, W * J.rr(0.2, 0.6, sd, st, i, 6), Math.max(1, U * 0.0016));
    }
    // head-switching strip at the bottom: torn, horizontally displaced noise
    const hb = H * 0.028, rows = 4;
    for (let r = 0; r < rows; r++) {
      const ry = H - hb + hb * r / rows, dx = J.rs(sd, st, r, 7) * U * 0.03 + U * 0.02 * (rows - r) / rows;
      ctx.globalAlpha = k * 0.9; ctx.drawImage(nz, 0, (sy + r * 3) % Math.max(1, nh - 2), nw, 2, dx, ry, W, hb / rows + 0.5);
    }
  } });

bgReg('tornPaper', { name: '破れ紙', tags: ['editorial', 'emotional', 'pop'], w: 0.7,
  plan: rng => ({ seed: bs(rng), v: rng.pick(['tb', 'tb', 'diag', 'side']), k: rng.range(0.05, 0.08) }),
  draw(env, P, ctx) {
    const { W, H, sc } = env, t = env.t, sd = P.seed || 1, U = Umin(env), dk = isDark(sc.bg), bt = bgT(env), k = P.k || 0.065;
    let v = P.v || 'tb'; if (v === 'side' && H > W) v = 'tb';
    // [A, B, n] = edge from A to B, the sheet covers the side of the normal n
    const S = v === 'diag' ? [[[-W * 0.05, H * 0.58], [W * 0.5, H * 1.05], [-0.7, 0.7]], [[W * 0.55, -H * 0.05], [W * 1.05, H * 0.48], [0.7, -0.7]]]
      : v === 'side' ? [[[W * 0.13, -H * 0.05], [W * 0.1, H * 1.05], [-1, 0]], [[W * 0.9, -H * 0.05], [W * 0.87, H * 1.05], [1, 0]]]
        : [[[-W * 0.05, H * 0.83], [W * 1.05, H * 0.79], [0, 1]], [[-W * 0.05, H * 0.13], [W * 1.05, H * 0.17], [0, -1]]];
    const tones = dk ? [layC(sc, k), J.mix(sc.bg, sc.accent, k * 1.6)] : [J.mix(sc.bg, '#FFFFFF', 0.5), layC(sc, k)];
    S.forEach(([A, B, nrm], i) => {
      const inP = E.outCubic(clamp((bt - i * 0.12) / 0.6)), push = (1 - inP) * U * 0.35 + Math.sin(t * 0.5 + i * 2) * U * 0.004;
      const ox = nrm[0] * push, oy = nrm[1] * push, len = Math.hypot(B[0] - A[0], B[1] - A[1]), N = Math.min(260, Math.ceil(len / (U * 0.009)));
      const tx = (B[0] - A[0]) / len, ty = (B[1] - A[1]) / len, pts = [];
      for (let j = 0; j <= N; j++) {
        const u = j / N, o = U * (0.018 * J.noise1(u * 9, sd + i * 17) + 0.007 * J.noise1(u * 45, sd + i * 5) + 0.0035 * J.rs(sd, i, j));
        pts.push([A[0] + (B[0] - A[0]) * u + nrm[0] * o + ox, A[1] + (B[1] - A[1]) * u + nrm[1] * o + oy]);
      }
      const far = Math.hypot(W, H);
      const poly = pts.concat([[B[0] + nrm[0] * far + ox + tx * far * 0.2, B[1] + nrm[1] * far + oy + ty * far * 0.2], [A[0] + nrm[0] * far + ox - tx * far * 0.2, A[1] + nrm[1] * far + oy - ty * far * 0.2]]);
      const sd2 = U * 0.008;
      ctx.save(); ctx.translate(-nrm[0] * sd2 * 0.5, -nrm[1] * sd2 * 0.5 + sd2 * 0.6);
      ctx.fillStyle = `rgba(0,0,0,${dk ? 0.35 : 0.1})`; ctx.beginPath(); pathPoly(ctx, poly); ctx.fill(); ctx.restore();
      ctx.fillStyle = tones[i % 2]; ctx.beginPath(); pathPoly(ctx, poly); ctx.fill();
      // fibrous torn rim (the paper core shows lighter along the tear)
      ctx.strokeStyle = dk ? layC(sc, k * 2.4) : J.mix(tones[i % 2], '#FFFFFF', 0.75); ctx.lineWidth = Math.max(1, U * 0.004); ctx.lineJoin = 'round';
      ctx.beginPath(); pts.forEach((p, q) => (q ? ctx.lineTo(p[0] - nrm[0] * U * 0.002, p[1] - nrm[1] * U * 0.002) : ctx.moveTo(p[0], p[1]))); ctx.stroke();
    });
  } });

bgReg('godRays', { name: '光芒', tags: ['emotional', 'calm', 'editorial'], w: 0.8,
  plan: rng => ({ seed: bs(rng), x: rng.pick([rng.range(0.12, 0.35), rng.range(0.65, 0.88), 0.5]), n: rng.int(7, 11), spread: rng.range(45, 75), k: rng.range(0.11, 0.16), dust: rng.chance(0.75) }),
  draw(env, P, ctx) {
    const { W, H, sc } = env, t = env.t, sd = P.seed || 1, U = Umin(env), dk = isDark(sc.bg), e = fadeIn(env, 1);
    const rc = dk ? lightOn(sc) : J.lum(sc.bg) < 0.8 ? '#FFFFFF' : J.mix(sc.accent, sc.bg, 0.3), k = (P.k || 0.13) * e * (dk ? 1.35 : 1.4);
    const sx = W * (P.x ?? 0.5) + W * 0.04 * Math.sin(t * 0.1 + (sd % 7)), sy = -H * 0.12, L = Math.hypot(W, H) * 1.25, n = P.n || 9;
    const base = Math.atan2(H * 0.55 - sy, W * 0.5 - sx);
    drawLow(ctx, env, 4, x => {
      const paths = [new Path2D(), new Path2D(), new Path2D()];
      for (let i = 0; i < n; i++) {
        const a = base + ((P.spread || 60) * (i / (n - 1) - 0.5) + J.rs(sd, i, 1) * 4 + 3 * J.noise1(t * 0.15 + i * 1.3, sd)) * DEG;
        const w = (1.2 + 3.6 * J.r(sd, i, 2)) * DEG * (0.75 + 0.25 * J.noise1(t * 0.4 + i, sd + 7));
        const lv = 0.5 + 0.5 * J.noise1(t * 0.35 + i * 2.1, sd + 3), dim = lv > 0.66 ? 0 : lv > 0.33 ? 1 : 2;
        [0.45, 1, 1.8].forEach((f, q) => {          // nested wedges → soft falloff across the beam
          const p = paths[Math.min(2, q + dim)], ww = w * f;
          p.moveTo(sx, sy); p.lineTo(sx + Math.cos(a - ww / 2) * L, sy + Math.sin(a - ww / 2) * L); p.lineTo(sx + Math.cos(a + ww / 2) * L, sy + Math.sin(a + ww / 2) * L); p.closePath();
        });
      }
      const g = x.createRadialGradient(sx, sy, 0, sx, sy, L);
      g.addColorStop(0, J.rgba(rc, Math.min(1, k * 1.3))); g.addColorStop(0.3, J.rgba(rc, k * 0.6)); g.addColorStop(0.7, J.rgba(rc, k * 0.12)); g.addColorStop(1, J.rgba(rc, 0));
      x.fillStyle = g;
      [0.55, 0.3, 0.16].forEach((m, l) => { x.globalAlpha = m; x.fill(paths[l]); });
    });
    if (P.dust !== false) {        // dust motes drifting through the light
      ctx.fillStyle = rc;
      for (let i = 0; i < 26; i++) {
        const x = wrap(J.r(sd, i, 11) * W + t * U * J.rs(sd, i, 12) * 0.02 + Math.sin(t * 0.5 + i) * U * 0.01, W), y = wrap(J.r(sd, i, 13) * H + t * U * J.rr(-0.02, 0.01, sd, i, 14), H);
        const r = U * J.rr(0.0012, 0.003, sd, i, 15), near = clamp(1 - Math.hypot(x - sx, y - sy) / L);
        ctx.globalAlpha = e * (0.15 + 0.35 * near) * (0.5 + 0.5 * Math.sin(t * J.rr(0.8, 2, sd, i, 16) + i)); ctx.fillRect(x - r, y - r, r * 2, r * 2);
      }
    }
  } });

bgReg('vignettePulse', { name: '色の周辺光', tags: ['emotional', 'calm', 'pop'], w: 0.9, subtle: true,
  plan: rng => ({ seed: bs(rng), k: rng.range(0.3, 0.42), two: rng.chance(0.6), rate: rng.range(0.35, 0.55) }),
  draw(env, P, ctx) {
    const { W, H, sc } = env, t = env.t, U = Umin(env), dk = isDark(sc.bg), e = fadeIn(env, 0.8), cols = hues(sc);
    const pulse = env.beat ? 0.62 + 0.38 * Math.exp(-env.beat.since * 4) : 0.75 + 0.25 * Math.sin(t * TAU * (P.rate || 0.45));
    const k = (P.k || 0.35) * e * pulse * (dk ? 1 : 0.8), cA = J.mix(sc.bg, cols[0], 0.7), cB = J.mix(sc.bg, cols[1] || cols[0], 0.7), R = Math.hypot(W, H) / 2;
    drawLow(ctx, env, 6, x => {
      if (P.two !== false) {
        for (const [cx, cy, c, ph] of [[0, 0, cA, 0], [W, H, cB, 1.7]]) {
          const rr = R * (1.25 + 0.08 * Math.sin(t * 0.6 + ph)), g = x.createRadialGradient(cx, cy, 0, cx, cy, rr);
          g.addColorStop(0, J.rgba(c, k)); g.addColorStop(0.45, J.rgba(c, k * 0.35)); g.addColorStop(1, J.rgba(c, 0));
          x.fillStyle = g; x.fillRect(0, 0, W, H);
        }
      } else {
        const g = x.createRadialGradient(W / 2, H / 2, U * 0.32 * (1.08 - 0.12 * pulse), W / 2, H / 2, R * 1.05);
        g.addColorStop(0, J.rgba(cA, 0)); g.addColorStop(0.6, J.rgba(cA, k * 0.45)); g.addColorStop(1, J.rgba(cA, k * 1.1));
        x.fillStyle = g; x.fillRect(0, 0, W, H);
      }
    });
  } });

bgReg('kaleidoscope', { name: '万華鏡', tags: ['pop', 'glitch', 'emotional'], w: 0.6,
  plan: rng => ({ seed: bs(rng), n: rng.pick([6, 8, 8, 10]), m: rng.int(6, 9), k: rng.range(0.075, 0.1), spd: rng.range(0.05, 0.1) * rng.pick([1, -1]) }),
  draw(env, P, ctx) {
    const { W, H, sc } = env, t = env.t, sd = P.seed || 1, U = Umin(env), e = fadeIn(env, 0.8), n = P.n || 8, m = P.m || 7, k = P.k || 0.085;
    const cx = W / 2, cy = H / 2, R = Math.hypot(W, H) * 0.58, seg = Math.PI / n, r0 = U * 0.13, rot = t * (P.spd || 0.07);
    const fillP = new Path2D(), lineP = new Path2D();
    const put = (p, type, x, y, s, a, flip) => {
      const c = Math.cos(a), si = Math.sin(a), T = (px, py) => [x + px * c - py * flip * si, y + px * si + py * flip * c];
      if (type === 2) { p.moveTo(x + s * 0.55, y); p.arc(x, y, s * 0.55, 0, TAU); return; }
      const pts = type === 0 ? [[s, 0], [-s / 2, s * 0.8], [-s / 2, -s * 0.3]] : [[s, 0], [0, s * 0.42], [-s * 0.7, 0], [0, -s * 0.42]];
      const q = pts.map(([u, v]) => T(u, v)); p.moveTo(q[0][0], q[0][1]); for (let i = 1; i < q.length; i++) p.lineTo(q[i][0], q[i][1]); p.closePath();
    };
    for (let j = 0; j < m; j++) {
      const type = J.h(sd, j) % 3, v = 0.6 + 0.8 * J.r(sd, j, 2);
      const r = r0 + wrap(J.r(sd, j, 1) * (R - r0) + t * U * 0.05 * v, R - r0), fade = clamp((r - r0) / (U * 0.15)) * clamp((R - r) / (U * 0.2)) * e;
      if (fade <= 0.02) continue;
      const phi = seg * (0.15 + 0.7 * (0.5 + 0.5 * Math.sin(t * 0.35 * v + j * 1.9))), s = r * (0.09 + 0.1 * J.r(sd, j, 3)) * fade, own = t * J.rs(sd, j, 4) * 1.2 + j;
      const p = J.r(sd, j, 5) < 0.35 ? lineP : fillP;
      for (let q = 0; q < n; q++) {
        const b = rot + q * 2 * seg;
        put(p, type, cx + Math.cos(b + phi) * r, cy + Math.sin(b + phi) * r, s, b + phi + own, 1);
        put(p, type, cx + Math.cos(b - phi) * r, cy + Math.sin(b - phi) * r, s, b - phi - own, -1);
      }
    }
    ctx.fillStyle = layC(sc, k); ctx.fill(fillP);
    ctx.strokeStyle = tintC(sc, k * 2.4); ctx.lineWidth = Math.max(1, U * 0.0028); ctx.stroke(lineP);
    // faint polygon rings anchoring the symmetry
    ctx.strokeStyle = layC(sc, k * 0.9); ctx.lineWidth = Math.max(1, U * 0.002); ctx.globalAlpha = e; ctx.beginPath();
    for (const [rr, dir] of [[U * 0.46, -1], [U * 0.82, 1]]) for (let q = 0; q <= 2 * n; q++) { const a = -rot * dir * 1.5 + q * seg, x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr; q ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.stroke();
  } });

// marble veins: computed once per seed / size / colour at low resolution, then slowly turned
const marbleCv = (P, px, c1, c2) => cached(`marb|${P.seed}|${px}|${c1}|${c2}|${P.acc ? 1 : 0}`, () => {
  const c = mkCv(px, px), x = c.getContext('2d'), id = x.createImageData(px, px), d = id.data, sd = P.seed || 1;
  const a = P.ang || 0.7, ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(a + 1.1), sb = Math.sin(a + 1.1), fq = (P.freq || 3) * TAU, tb = P.turb || 5;
  const A = J.hex(c1), B = J.hex(c2);
  for (let j = 0; j < px; j++) for (let i = 0; i < px; i++) {
    const u = i / px, v = j / px, X = u * 3, Y = v * 3;
    const s1 = Math.sin((u * ca + v * sa) * fq + fbm2(X, Y, sd, 4) * tb), w1 = 1 - Math.abs(s1);
    const cloud = clamp((fbm2(X * 0.9 + 11, Y * 0.9, sd + 21, 2) - 0.42) * 1.6);
    let a1 = Math.pow(w1, 14) * (0.45 + 0.55 * noise2(X * 2.2 + 3, Y * 2.2, sd + 3)) + Math.pow(w1, 4) * 0.08 + cloud * 0.22, a2 = 0;
    if (P.acc) { const s2 = Math.sin((u * cb + v * sb) * fq * 1.6 + fbm2(X * 1.4 + 5, Y * 1.4, sd + 9, 3) * tb * 1.3); a2 = Math.pow(1 - Math.abs(s2), 12) * 0.5; }
    const al = a1 + a2 * (1 - a1), o = (j * px + i) * 4;
    if (al <= 0.003) { d[o + 3] = 0; continue; }
    const f = a2 * (1 - a1) / al;
    d[o] = A[0] + (B[0] - A[0]) * f; d[o + 1] = A[1] + (B[1] - A[1]) * f; d[o + 2] = A[2] + (B[2] - A[2]) * f; d[o + 3] = Math.round(255 * clamp(al));
  }
  x.putImageData(id, 0, 0); return c;
});
bgReg('marble', { name: '大理石', tags: ['calm', 'editorial', 'emotional'], w: 0.7,
  plan: rng => ({ seed: bs(rng), ang: rng.range(0, 3.14), freq: rng.range(1.4, 2.2), turb: rng.range(7, 10), k: rng.range(0.17, 0.22), acc: rng.chance(0.5), dir: rng.pick([1, -1]) }),
  draw(env, P, ctx) {
    const { W, H, sc } = env, t = env.t, e = fadeIn(env, 1), U = Umin(env), M = U * 0.12, s = (P.seed || 1) % 13;
    const c2 = J.contrast(sc.accent, sc.bg) > 1.3 ? sc.accent : sc.accent2 || sc.fg;
    // low-res vein texture → upscaled once into a frame plate with drift margin → whole-pixel blits per frame
    const key = `marbP|${P.seed}|${(P.ang || 0).toFixed(3)}|${(P.freq || 0).toFixed(3)}|${(P.turb || 0).toFixed(3)}|${P.acc ? 1 : 0}|${sc.fg}|${c2}`;
    const pl = plate(key, env, M * 2, M * 2, (x, w, h) => {
      const D = Math.max(w, h), px = clamp(Math.round(D * Math.min(0.2, resQ(env) * 0.28)), 96, 440);
      x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
      x.drawImage(marbleCv(P, px, sc.fg, c2), (w - D) / 2, (h - D) / 2, D, D);
    });
    ctx.globalAlpha = (P.k || 0.23) * e * (isDark(sc.bg) ? 1 : 0.8);
    blit(ctx, env, pl, M + M * 0.9 * Math.sin(t * 0.06 * (P.dir || 1) + s), M + M * 0.9 * Math.cos(t * 0.045 + s * 2));
  } });

bgReg('paperCut', { name: '切り絵', tags: ['pop', 'emotional', 'calm'], w: 0.7,
  plan: rng => ({ seed: bs(rng), L: rng.int(3, 4), lobes: rng.int(5, 9), k: rng.range(0.06, 0.09), acc: rng.chance(0.5), p: rng.range(2.4, 3.2) }),
  draw(env, P, ctx) {
    const { W, H, sc } = env, t = env.t, sd = P.seed || 1, U = Umin(env), dk = isDark(sc.bg), bt = bgT(env), L = P.L || 3, k = P.k || 0.075, pe = 2 / (P.p || 2.8);
    const cx = W / 2, cy = H / 2, N = 144, lobes = P.lobes || 6;
    for (let i = 0; i < L; i++) {
      const d = L > 1 ? (L - 1 - i) / (L - 1) : 0;                   // 1 = back layer (smallest opening)
      const inP = E.outCubic(clamp((bt - i * 0.1) / 0.8)), grow = 1 + (1 - inP) * 0.7;
      const rx = W * (0.41 + 0.17 * (1 - d)) * grow, ry = H * (0.38 + 0.17 * (1 - d)) * grow, ph = J.r(sd, i, 1) * TAU, sw = t * 0.25 * (i % 2 ? 1 : -1);
      const ox = Math.sin(t * 0.35 + i) * U * 0.006 * (i + 1), oy = Math.cos(t * 0.3 + i) * U * 0.004 * (i + 1);
      const path = new Path2D(); path.rect(-W, -H, W * 3, H * 3);
      for (let j = 0; j < N; j++) {
        const th = j / N * TAU, c = Math.cos(th), s = Math.sin(th);
        const wv = 1 + 0.035 * Math.sin((lobes + i) * th + ph + sw) + 0.014 * Math.sin((lobes * 2 + 3) * th - ph * 1.3 - sw * 0.7);
        const x = cx + ox + rx * Math.sign(c) * Math.pow(Math.abs(c), pe) * wv, y = cy + oy + ry * Math.sign(s) * Math.pow(Math.abs(s), pe) * wv;
        j ? path.lineTo(x, y) : path.moveTo(x, y);
      }
      path.closePath();
      const sh = U * 0.009;
      ctx.save(); ctx.translate(sh * 0.4, sh); ctx.fillStyle = `rgba(0,0,0,${dk ? 0.32 : 0.12})`; ctx.fill(path, 'evenodd'); ctx.restore();
      const hue = P.acc && i % 2 ? sc.accent : sc.fg;
      ctx.fillStyle = dk ? J.mix(sc.bg, hue, k * (0.5 + 0.7 * (i + 1) / L)) : J.mix(sc.bg, i % 2 ? hue : '#FFFFFF', (i % 2 ? k : 0.35) * (0.6 + 0.5 * (i + 1) / L));
      ctx.fill(path, 'evenodd');
    }
  } });

/* ================= CAMERA ================= */
const KM = env => clamp((env.fx.motion ?? 0.7) * 1.25, 0, 1.25);
const cuOf = env => clamp(env.lt / Math.max(0.3, env.cut.dur));
const lagOf = env => Math.max(0, (env.ltb ?? env.lt) - env.lt);
const seedOf = env => (env.cut.seed | 0);
// time since the last beat for this (time-lagged) pass; without beats a fixed period on the cut clock
const beatSince = (env, per) => {
  if (env.beat && env.beat.len > 0.15) { let s = env.beat.since - lagOf(env); if (s < 0) s += env.beat.len; return s; }
  return wrap(env.lt, per);
};

reg('cam', 'orbitDrift', { name: '周回', tags: ['calm', 'emotional', 'graphic'], w: 0.8,
  plan: rng => ({ dir: rng.pick([1, -1]), a0: rng.range(0, 6.28), sp: rng.range(1.1, 1.6) }),
  get: (env, P) => {
    const K = KM(env), d = P.dir || 1, th = (P.a0 || 0) + d * env.lt * (P.sp || 1.3), r = E.outCubic(clamp(env.lt / 0.7));
    return { x: Math.cos(th) * env.W * 0.016 * K * r, y: Math.sin(th) * env.H * 0.02 * K * r, rot: Math.sin(th) * 0.9 * K * r * d, s: 1.02 };
  } });

reg('cam', 'barrelRoll', { name: 'バレルロール', tags: ['pop', 'glitch', 'graphic'], w: 0.5, strong: true,
  plan: rng => ({ dir: rng.pick([1, -1]), a: rng.range(70, 110), d: rng.range(0.42, 0.55) }),
  get: (env, P) => {
    const K = Math.min(1, KM(env)), q = clamp(env.lt / (P.d || 0.5));
    if (q >= 1) return {};
    const r = 1 - E.outBack(q, 1.3);            // quick roll that overshoots a touch and settles level
    return { rot: (P.dir || 1) * (P.a || 90) * K * r, s: 1 - 0.12 * K * Math.sin(Math.PI * Math.min(1, q * 1.25)), blur: 9 * K * clamp(1 - q * 2.2) };
  } });

reg('cam', 'pendulumSway', { name: '振り子', tags: ['emotional', 'pop', 'calm'], w: 0.7,
  plan: rng => ({ a: rng.range(1.8, 2.6), per: rng.range(2, 3), side: rng.pick([1, -1]) }),
  get: (env, P) => {
    // the frame hangs from a pivot above the screen: rotation and sideways travel are coupled
    const K = KM(env), damp = 0.75 + 0.25 * Math.exp(-env.lt * 0.6), L = env.W * 0.62;   // sideways travel ≈ 3% of the width in any aspect
    const phi = (P.a || 2.2) * K * (P.side || 1) * Math.cos(env.lt / (P.per || 2.4) * TAU) * damp * DEG;
    return { x: -L * Math.sin(phi), y: -L * (1 - Math.cos(phi)), rot: phi / DEG, s: 1.02 };
  } });

reg('cam', 'focusIn', { name: 'ピント合わせ', tags: ['emotional', 'calm', 'editorial'], w: 0.9,
  plan: rng => ({ d: rng.range(0.5, 0.8), b: rng.range(10, 15) }),
  get: (env, P) => {
    const K = KM(env), q = E.outCubic(clamp(env.lt / (P.d || 0.65)));
    return { blur: (1 - q) * (P.b || 12) * Math.min(1, K), s: 1 + 0.03 * (1 - q) + 0.012 * K * cuOf(env) };     // lens breathing while focusing
  } });

reg('cam', 'rackFocus', { name: 'ピンぼけ', tags: ['emotional', 'calm', 'editorial'], w: 0.6,
  plan: rng => ({ b: rng.range(5, 8), at: rng.range(0.6, 0.7) }),
  get: (env, P) => {
    const K = KM(env), dur = env.cut.dur, st = Math.max(dur * (P.at || 0.65), dur - 0.9), q = E.inOutSine(clamp((env.lt - st) / Math.max(0.2, dur - st)));
    return { blur: q * (P.b || 6.5) * Math.min(1, K), s: 1.01 - 0.02 * q * K, y: env.H * 0.004 * q };
  } });

reg('cam', 'earthquake', { name: '地震', tags: ['glitch', 'pop', 'emotional'], w: 0.5, strong: true,
  plan: rng => ({ per: rng.range(0.55, 0.8), a: rng.range(0.85, 1.1) }),
  get: (env, P) => {
    // a low rumble all the time, a jolt on every beat (vertical-heavy, on the ≤24 Hz random clock)
    const K = KM(env) * (P.a || 1), hit = Math.exp(-beatSince(env, P.per || 0.65) * 7), amp = K * (0.14 + hit), sd = seedOf(env), st = env.step;
    return { x: J.rs(sd, st, 11) * env.W * 0.005 * amp, y: J.rs(sd, st, 12) * env.H * 0.014 * amp, rot: J.rs(sd, st, 13) * 0.45 * amp, s: 1.02 + 0.012 * hit * K, blur: 1.5 * hit * K };
  } });

reg('cam', 'floatNoise', { name: '浮遊', tags: ['calm', 'emotional'], w: 0.9,
  plan: rng => ({ f: rng.range(0.8, 1.2) }),
  get: (env, P) => {
    const K = KM(env), t = env.lt * (P.f || 1), sd = seedOf(env) + 7;
    return { x: J.noise1(t * 0.6, sd) * env.W * 0.02 * K, y: (J.noise1(t * 0.5 + 5, sd + 1) * 0.7 + 0.3 * Math.sin(t * 1.3)) * env.H * 0.024 * K,
      rot: J.noise1(t * 0.3 + 9, sd + 2) * 1.3 * K, s: 1.025 + 0.012 * Math.sin(t * 0.8) };
  } });

reg('cam', 'vertigo', { name: 'めまい', tags: ['emotional', 'glitch'], w: 0.6,
  plan: rng => ({ dir: rng.pick([1, -1]), a: rng.range(0.05, 0.07) }),
  get: (env, P) => {
    // a creeping dolly-in whose perspective keeps warping: stretch / shear waver grows with the zoom
    const K = KM(env), z = E.inOutSine(cuOf(env)), w = Math.sin(env.lt * 2.3), d = P.dir || 1;
    return { s: 1 + (P.a || 0.06) * K * z, sx: 1 + 0.03 * K * z * w, sy: 1 - 0.026 * K * z * w, skx: 2.2 * K * z * Math.sin(env.lt * 1.7) * d, rot: 0.8 * K * z * Math.sin(env.lt * 1.1 + 1) * d };
  } });

reg('cam', 'tiltDown', { name: 'ティルトダウン', tags: ['calm', 'editorial', 'emotional'], w: 0.8,
  plan: rng => ({ a: rng.range(0.024, 0.032) }),
  get: (env, P) => {
    // camera tilts down onto the line: it rises into frame from below and settles, easing out of a slight zoom
    const K = KM(env), q = E.outCubic(cuOf(env)), a = env.H * (P.a || 0.028) * K;
    return { y: a * (1.2 - 1.6 * q), s: 1.035 - 0.02 * q };
  } });

reg('cam', 'spiralIn', { name: '渦ズーム', tags: ['pop', 'graphic', 'emotional'], w: 0.6,
  plan: rng => ({ dir: rng.pick([1, -1]), a0: rng.range(0, 6.28), d: rng.range(0.9, 1.3) }),
  get: (env, P) => {
    const K = KM(env), d = P.dir || 1, e = E.outCubic(clamp(env.lt / (P.d || 1.1))), r = 1 - e, th = (P.a0 || 0) + d * e * TAU * 0.8;
    return { x: Math.cos(th) * env.W * 0.03 * K * r, y: Math.sin(th) * env.H * 0.035 * K * r, rot: -d * 7 * K * r, s: 1 - 0.08 * K * r + 0.015 * K * cuOf(env) };
  } });

const snapCache = new WeakMap();
const snapTime = (env, at) => {
  const c = env.cut; let v = snapCache.get(c);
  if (v != null) return v;
  v = c.dur * at;
  for (const b of (env.plan && env.plan.beats) || []) { const r = b - c.start; if (r >= c.dur * 0.38 && r <= c.dur * 0.72) { v = r; break; } }
  snapCache.set(c, v); return v;
};
reg('cam', 'snapPan', { name: 'スナップパン', tags: ['pop', 'glitch', 'graphic'], w: 0.7,
  plan: rng => ({ dir: rng.pick([1, -1]), a: rng.range(0.024, 0.032), at: rng.range(0.45, 0.6) }),
  get: (env, P) => {
    // holds one framing, then whips to the opposite framing mid-cut (on a beat when there is one) and holds again
    const K = KM(env), dur = env.cut.dur, d = P.dir || 1, A = env.W * (P.a || 0.028) * K * d, drift = env.W * 0.005 * K * d * (cuOf(env) - 0.5);
    if (dur < 1.1) return { x: A * 0.5 * (1 - 2 * cuOf(env)), s: 1.02 };
    const dt = env.lt - snapTime(env, P.at || 0.5), q = E.inOutCubic(clamp(dt / 0.16)), bell = dt > 0 && dt < 0.16 ? Math.sin(Math.PI * dt / 0.16) : 0;
    return { x: A * (1 - 2 * q) - drift, s: 1.02 + 0.015 * bell, skx: -d * 5 * K * bell, blur: 14 * K * bell };
  } });

reg('cam', 'jelly', { name: 'ぷるん', tags: ['pop', 'graphic'], w: 0.7,
  plan: rng => ({ a: rng.range(0.045, 0.065), f: rng.range(18, 24) }),
  get: (env, P) => {
    // squash-and-stretch wobble: lands squashed at the cut start, re-wobbles on beats
    const K = KM(env), t = env.lt, f = P.f || 21;
    let w = Math.exp(-t * 5) * Math.cos(t * f);
    if (env.beat && env.beat.len > 0.2 && t > 0.6) { const s = beatSince(env, 0.6); w += 0.45 * Math.exp(-s * 7) * Math.cos(s * f); }
    const A = (P.a || 0.055) * K;
    return { sx: 1 + A * w, sy: 1 - A * w * 0.9, y: env.H * 0.008 * K * w, s: 1.01 };
  } });
})();
