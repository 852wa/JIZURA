/* JIZURA pack: horror (3/3) — decorations, backgrounds, camera moves, screen effects, cut transitions and three styles */
(() => {
'use strict';
const E = J.E;
const P = 'horror';
const TAGS = ['horror'];
const reg = (g, key, def) => J.register(g, key, Object.assign({ set: 'horror' }, def), P);
const clamp = J.clamp, TAU = J.TAU, DEG = J.DEG;

/* ------------------------------------------------------------------ helpers */
const U = env => Math.min(env.W, env.H);
const isDark = c => J.lum(c) < 0.45;
const lightOf = sc => (J.lum(sc.fg) > J.lum(sc.bg) ? sc.fg : sc.bg);
const nightC = sc => J.mix(sc.bg, '#000000', isDark(sc.bg) ? 0.72 : 0.9);
const layC = (sc, k) => J.mix(sc.bg, sc.fg, k);
const center = (env, bb) => bb || { x0: env.W * 0.35, x1: env.W * 0.65, y0: env.H * 0.4, y1: env.H * 0.6, cx: env.W / 2, cy: env.H / 2 };
const inOut = (env, d = 0.35) => E.outCubic(clamp(env.lt / d)) * (1 - E.inCubic(env.pOut));
const wrap = (v, m) => ((v % m) + m) % m;
const overlaps = (bb, x0, y0, x1, y1, pad = 0) => !(x1 < bb.x0 - pad || x0 > bb.x1 + pad || y1 < bb.y0 - pad || y0 > bb.y1 + pad);
/* static noise tiles (built once, deterministic) */
const NOISE = [];
const noiseCv = (k) => {
  k = ((k % 4) + 4) % 4;
  if (NOISE[k]) return NOISE[k];
  const w = 128, h = 96, c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d'), id = x.createImageData(w, h);
  for (let i = 0; i < w * h; i++) { const v = Math.pow(J.r(i, k, 5511), 1.3) * 255; id.data[i * 4] = id.data[i * 4 + 1] = id.data[i * 4 + 2] = v; id.data[i * 4 + 3] = 255; }
  x.putImageData(id, 0, 0);
  NOISE[k] = c; return c;
};
/* time since this background started (consecutive cuts with the same bg + seed count as one run) */
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
const bgReg = (k, d) => reg('bg', k, Object.assign({}, d, { draw(env, Pm) { const ctx = env.ctx; ctx.save(); try { d.draw(env, Pm || {}, ctx); } finally { ctx.restore(); } } }));
/* failing-light level 0..1 on a ≤24 Hz clock (mostly on, stutters now and then) */
const lamp = (t, seed, rate = 1) => {
  const st = Math.floor(t * 24), run = st >> 2;
  if (J.r(seed, run, 7) < 0.1 * rate) return J.r(seed, st, 8) < 0.5 ? 0.15 : 0.55;
  return 0.88 + 0.12 * J.r(seed, st, 9);
};

/* ================================================================== DECOR */

/* claw scratches: parallel jagged gouges scraped in around the words */
reg('decor', 'hrScratches', {
  name: '引っ掻き傷', tags: TAGS.concat(['glitch']), w: 0.9, layer: 'front', ae: 'slash',
  draw(env, bb0, Pd) {
    if (env.pass !== 'main') return;
    const bb = center(env, bb0), { W, H, sc } = env, s = Pd.seed | 0, u = U(env), out = 1 - E.inCubic(env.pOut);
    const n = Pd.n || 2;
    for (let g = 0; g < n; g++) {
      const e = E.outExpo(clamp((env.lt - 0.08 - g * 0.18) / 0.16)) * out; if (e <= 0) continue;
      const corner = (g + (Pd.v | 0)) % 4, right = corner % 2 === 1, low = corner >= 2;
      const L = u * J.rr(0.28, 0.42, s, g, 1), ang = (right ? -1 : 1) * J.rr(55, 75, s, g, 2) * DEG * (low ? -1 : 1);
      let cx = right ? J.rr(W * 0.72, W * 0.9, s, g, 3) : J.rr(W * 0.1, W * 0.28, s, g, 3);
      let cy = low ? J.rr(H * 0.72, H * 0.88, s, g, 4) : J.rr(H * 0.12, H * 0.28, s, g, 4);
      if (overlaps(bb, cx - L / 2, cy - L / 2, cx + L / 2, cy + L / 2, u * 0.02)) cy = low ? Math.max(cy, bb.y1 + L * 0.6) : Math.min(cy, bb.y0 - L * 0.6);
      const dx = Math.sin(ang), dy = -Math.cos(ang), px = Math.cos(ang), py = Math.sin(ang);
      const col = (g % 2 && J.contrast(sc.accent, sc.bg) > 1.8) ? sc.accent : sc.fg;
      for (let k = 0; k < 4; k++) {
        const off = (k - 1.5) * u * 0.042, len = L * (0.75 + 0.3 * J.r(s, g, k, 5)) * e, st = J.r(s, g, k, 6) * L * 0.1;
        const x0 = cx + px * off - dx * L / 2 + dx * st, y0 = cy + py * off - dy * L / 2 + dy * st;
        const m = 10, pts = [];
        for (let i = 0; i <= m; i++) { const f = i / m, j = J.rs(s, g, k, i) * u * 0.004; pts.push([x0 + dx * len * f + px * j, y0 + dy * len * f + py * j]); }
        // tapered: thick in the middle, thin at the ends
        const lw = u * 0.011;
        for (let i = 0; i < m; i++) env.line([pts[i], pts[i + 1]], col, Math.max(1, lw * Math.sin(Math.PI * (i + 0.5) / m)), 0.85, false);
      }
    }
  },
});

/* sigil: a slow-turning ring of marks and a seven-pointed star drawn in faint lines behind the words */
reg('decor', 'hrSigil', {
  name: '魔法陣', tags: TAGS.concat(['graphic']), w: 0.7, layer: 'back', subtle: true, ae: 'rings',
  draw(env, bb0, Pd) {
    if (env.pass !== 'main') return;
    const bb = center(env, bb0), { W, H, sc } = env, s = Pd.seed | 0, u = U(env);
    const e = E.inOutSine(clamp(env.lt / 1.2)), out = 1 - E.inCubic(env.pOut); if (out <= 0) return;
    const cx = (bb.x0 + bb.x1) / 2, cy = (bb.y0 + bb.y1) / 2, R = Math.min(u * 0.46, Math.max(bb.x1 - bb.x0, bb.y1 - bb.y0) * 0.62 + u * 0.08);
    const col = isDark(sc.bg) ? layC(sc, 0.3) : layC(sc, 0.28), lw = Math.max(1.2, u * 0.0022), rot = env.ltb * 4 * (Pd.right ? -1 : 1) * DEG;
    const a = out;
    env.arc(cx, cy, R, -90, -90 + 360 * e, col, lw * 1.4, a, false);
    env.arc(cx, cy, R * 0.9, 90, 90 + 360 * e, col, lw, a, false);
    env.arc(cx, cy, R * 0.62, -90, -90 + 360 * e, col, lw, a * 0.8, false);
    // heptagram {7/3}
    const pts = [];
    for (let i = 0; i <= 7; i++) { const an = rot - Math.PI / 2 + (i * 3 % 7) / 7 * TAU; pts.push([cx + Math.cos(an) * R * 0.9, cy + Math.sin(an) * R * 0.9]); }
    env.polyPartial(pts, clamp((env.lt - 0.3) / 1.2), col, lw, a, false);
    // ring of marks between the circles
    const m = 42;
    for (let i = 0; i < m * e; i++) {
      const an = rot * -0.6 + i / m * TAU, t = J.h(s, i, 3) % 4, r0 = R * 0.915, r1 = R * 0.985, c = Math.cos(an), sn = Math.sin(an);
      if (t === 0) env.line([[cx + c * r0, cy + sn * r0], [cx + c * r1, cy + sn * r1]], col, lw, a, false);
      else if (t === 1) env.circle(cx + c * (r0 + r1) / 2, cy + sn * (r0 + r1) / 2, R * 0.012, null, col, lw, a, false);
      else if (t === 2) { const q = (r0 + r1) / 2, d = R * 0.018; env.line([[cx + c * q - sn * d, cy + sn * q + c * d], [cx + c * q + sn * d, cy + sn * q - c * d]], col, lw, a, false); }
    }
  },
});

/* the eye: a simple outline eye in a corner that opens, follows the words and blinks at the wrong moments */
reg('decor', 'hrWatchEye', {
  name: '見ている目', tags: TAGS.concat(['graphic']), w: 0.8, layer: 'front', ae: 'reticle',
  draw(env, bb0, Pd) {
    if (env.pass !== 'main') return;
    const bb = center(env, bb0), { W, H, sc } = env, s = Pd.seed | 0, u = U(env);
    const ew = u * (Pd.big ? 0.22 : 0.16), eh = ew * 0.26;
    let x = Pd.right ? W - u * 0.07 - ew / 2 : u * 0.07 + ew / 2, y = Pd.low ? H - u * 0.08 - eh : u * 0.08 + eh;
    if (overlaps(bb, x - ew / 2, y - eh, x + ew / 2, y + eh, u * 0.02)) y = Pd.low ? Math.max(y, Math.min(H - eh * 1.2, bb.y1 + eh * 1.6)) : Math.min(y, Math.max(eh * 1.2, bb.y0 - eh * 1.6));
    let open = E.outCubic(clamp((env.lt - 0.2) / 0.6)) * (1 - E.inCubic(env.pOut));
    // blinks at irregular moments
    const bt = env.ltb; for (let k = 0; k < 3; k++) { const at = 0.9 + J.r(s, k, 5) * 3 + k * 1.3, d = Math.abs(bt - at); if (d < 0.08) open *= d / 0.08; }
    if (open <= 0.01) { env.line([[x - ew / 2, y], [x + ew / 2, y]], sc.fg, Math.max(1.2, u * 0.003), 0.8 * (1 - E.inCubic(env.pOut)) * clamp(env.lt / 0.2), false); return; }
    const col = sc.fg, lw = Math.max(1.2, u * 0.003), ctx = env.ctx;
    const lid = (sgn) => { const pts = []; for (let i = 0; i <= 16; i++) { const f = i / 16, xx = x - ew / 2 + ew * f; pts.push([xx, y + sgn * Math.sin(Math.PI * f) * eh * open]); } return pts; };
    const top = lid(-1), bot = lid(1);
    // iris + pupil clipped to the eye opening, looking at the words
    const tx = (bb.x0 + bb.x1) / 2, ty = (bb.y0 + bb.y1) / 2, an = Math.atan2(ty - y, tx - x), look = Math.min(1, Math.hypot(tx - x, ty - y) / u);
    const ix = x + Math.cos(an) * ew * 0.18 * look + J.noise1(bt * 0.8, s) * ew * 0.03, iy = y + Math.sin(an) * eh * 0.3 * look;
    ctx.save(); ctx.beginPath(); top.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); for (let i = bot.length - 1; i >= 0; i--) ctx.lineTo(bot[i][0], bot[i][1]); ctx.closePath(); ctx.clip();
    env.circle(ix, iy, eh * 0.78, null, col, lw, 1, false);
    env.circle(ix, iy, eh * 0.34, isDark(sc.bg) ? sc.accent : sc.fg, null, 0, 1, false);
    ctx.restore();
    env.line(top, col, lw * 1.3, 1, false); env.line(bot, col, lw, 1, false);
    for (let k = 0; k < 5; k++) { const f = 0.2 + k * 0.15, p = top[Math.round(f * 16)]; env.line([p, [p[0] + (f - 0.5) * ew * 0.12, p[1] - eh * 0.35 * open]], col, lw * 0.8, 0.8, false); }
  },
});

/* static patches: small rectangles of TV snow flicker at the edges of the frame */
reg('decor', 'hrStaticPatch', {
  name: '砂嵐の欠片', tags: TAGS.concat(['glitch']), w: 0.8, layer: 'front', ae: 'glitchRects',
  draw(env, bb0, Pd) {
    if (env.pass !== 'main') return;
    const bb = center(env, bb0), { W, H } = env, s = Pd.seed | 0, st = env.step, u = U(env), ctx = env.ctx;
    const a0 = inOut(env, 0.2); if (a0 <= 0) return;
    const n = 3 + (Pd.n || 2) * 2;
    ctx.save(); ctx.imageSmoothingEnabled = false;
    for (let k = 0; k < n; k++) {
      if (J.r(s, k, st, 1) < 0.35) continue;
      const w = u * J.rr(0.06, 0.2, s, k, 2), h = u * J.rr(0.02, 0.07, s, k, 3);
      const edge = J.h(s, k, 4) % 4;
      let x = J.r(s, k, 5) * (W - w), y = J.r(s, k, 6) * (H - h);
      if (edge === 0) y = J.rr(0.02, 0.18, s, k, 7) * H; else if (edge === 1) y = H - h - J.rr(0.02, 0.18, s, k, 7) * H;
      else if (edge === 2) x = J.rr(0.01, 0.1, s, k, 7) * W; else x = W - w - J.rr(0.01, 0.1, s, k, 7) * W;
      x += J.rs(s, k, st >> 1, 8) * u * 0.02;
      if (overlaps(bb, x, y, x + w, y + h, u * 0.02)) continue;
      const N = noiseCv(st + k), sx = Math.floor(J.r(s, k, st, 9) * 64), sy = Math.floor(J.r(s, k, st, 10) * 48);
      ctx.globalAlpha = a0 * J.rr(0.45, 0.85, s, k, st, 11);
      ctx.drawImage(N, sx, sy, 48, 24, x, y, w, h);
    }
    ctx.restore();
  },
});

/* light shaft: a slanted beam from a high window with dust hanging in it */
reg('decor', 'hrDustBeam', {
  name: '光の筋と埃', tags: TAGS.concat(['calm', 'emotional']), w: 0.8, layer: 'back', subtle: true, ae: 'sparks',
  draw(env, bb0, Pd) {
    if (env.pass !== 'main') return;
    const { W, H, sc, ctx } = env, s = Pd.seed | 0, u = U(env);
    const a = inOut(env, 0.8); if (a <= 0) return;
    const L = lightOf(sc), right = !!Pd.right, x0 = right ? W * 0.78 : W * 0.22, w0 = W * 0.12, w1 = W * 0.34, sl = (right ? -1 : 1) * W * 0.28;
    const poly = [[x0 - w0 / 2, -2], [x0 + w0 / 2, -2], [x0 + sl + w1 / 2, H + 2], [x0 + sl - w1 / 2, H + 2]];
    const g = ctx.createLinearGradient(0, 0, 0, H);
    const k = isDark(sc.bg) ? 0.1 : 0.22;
    g.addColorStop(0, J.rgba(L, (k * a).toFixed(3))); g.addColorStop(1, J.rgba(L, 0));
    ctx.save();
    if (!isDark(sc.bg)) {
      // on light paper the room around the beam is dimmed instead
      ctx.fillStyle = J.rgba(nightC(sc), (0.12 * a).toFixed(3)); ctx.beginPath(); ctx.rect(-10, -10, W + 20, H + 20);
      poly.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); ctx.fill('evenodd');
    }
    ctx.fillStyle = g; ctx.beginPath(); poly.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); ctx.fill(); ctx.clip();
    const dustC = isDark(sc.bg) ? L : sc.sub;
    const t = env.ltb;
    for (let i = 0; i < 46; i++) {
      const fy = wrap(J.r(s, i, 1) + t * J.rr(0.004, 0.02, s, i, 2), 1), y = fy * H, f = J.r(s, i, 3);
      const cx = x0 + sl * fy, ww = w0 + (w1 - w0) * fy, x = cx + (f - 0.5) * ww + Math.sin(t * 0.7 + i) * u * 0.01;
      env.circle(x, y, u * J.rr(0.0012, 0.0035, s, i, 4), dustC, null, 0, a * (0.35 + 0.35 * Math.sin(t * 1.5 + i)) * (1 - fy * 0.6), false);
    }
    ctx.restore();
  },
});

/* drips: dark ink running down from the top edge of the frame, slowly */
reg('decor', 'hrDrips', {
  name: '垂れる墨', tags: TAGS.concat(['emotional']), w: 0.8, layer: 'front', ae: 'blobs',
  draw(env, bb0, Pd) {
    if (env.pass !== 'main') return;
    const bb = center(env, bb0), { W, H, sc } = env, s = Pd.seed | 0, u = U(env);
    const out = 1 - E.inCubic(env.pOut); if (out <= 0) return;
    const col = isDark(sc.bg) ? J.mix(sc.accent, sc.bg, 0.35) : nightC(sc);
    const band = u * 0.03 * E.outCubic(clamp(env.lt / 0.4));
    const pts = [[-4, -4], [W + 4, -4]];
    for (let i = 40; i >= 0; i--) pts.push([W * i / 40, band * (0.6 + 0.6 * J.r(s, i, 1))]);
    env.poly(pts, col, 0.9 * out, false);
    const n = 7 + (Pd.n | 0) * 3, lim = Math.max(band * 2, bb.y0 - u * 0.05);
    for (let k = 0; k < n; k++) {
      const x = W * (0.03 + 0.94 * J.r(s, k, 2)), g = E.outCubic(clamp((env.lt - J.r(s, k, 3) * 0.8) / (2.5 + J.r(s, k, 4) * 3)));
      let L = u * J.rr(0.06, 0.3, s, k, 5) * g;
      if (x > bb.x0 - u * 0.03 && x < bb.x1 + u * 0.03) L = Math.min(L, lim - band);
      if (L <= 1) continue;
      const w = u * J.rr(0.004, 0.012, s, k, 6);
      env.poly([[x - w, band * 0.5], [x + w, band * 0.5], [x + w * 0.7, band + L], [x - w * 0.7, band + L]], col, 0.9 * out, false);
      env.circle(x, band + L, w * 1.35, col, null, 0, 0.9 * out, false);
    }
  },
});

/* cracks: fine fractures creep out of a corner of the frame */
reg('decor', 'hrCracks', {
  name: 'ひび割れ', tags: TAGS.concat(['graphic', 'glitch']), w: 0.7, layer: 'front', ae: 'lineBurst',
  draw(env, bb0, Pd) {
    if (env.pass !== 'main') return;
    const bb = center(env, bb0), { W, H, sc } = env, s = Pd.seed | 0, u = U(env);
    const out = 1 - E.inCubic(env.pOut); if (out <= 0) return;
    const e = E.outCubic(clamp(env.lt / 1.6));
    const ox = Pd.right ? W : 0, oy = Pd.low ? H : 0, col = sc.fg, lw = Math.max(1, u * 0.0018);
    const base = Math.atan2(H / 2 - oy, W / 2 - ox);
    const branch = (x, y, an, len, depth, id) => {
      const pts = [[x, y]]; let cx = x, cy = y;
      const m = 7;
      for (let i = 1; i <= m; i++) { const a = an + J.rs(s, id, i, 1) * 0.5; cx += Math.cos(a) * len / m; cy += Math.sin(a) * len / m; if (overlaps(bb, cx, cy, cx, cy, u * 0.03)) break; pts.push([cx, cy]); }
      env.polyPartial(pts, clamp(e * (1 + depth * 0.2) - depth * 0.25), col, lw * (1.4 - depth * 0.35), 0.75 * out, false);
      if (depth < 2) for (let k = 0; k < 2; k++) { const j = 2 + (J.h(s, id, k, 3) % (pts.length - 1 || 1)); const p = pts[Math.min(j, pts.length - 1)]; branch(p[0], p[1], an + (k ? 0.6 : -0.6) * J.rr(0.6, 1.2, s, id, k, 4), len * 0.5, depth + 1, id * 3 + k + 1); }
    };
    for (let r = 0; r < 3; r++) branch(ox, oy, base + (r - 1) * 0.35 + J.rs(s, r, 9) * 0.15, u * J.rr(0.28, 0.42, s, r, 10), 0, r + 1);
  },
});

/* ================================================================== BACKGROUNDS */

bgReg('hrFailingLamp', {
  ae: 'vignettePulse',
  name: '切れかけの灯', tags: TAGS.concat(['emotional']), w: 0.9, subtle: true,
  plan: rng => ({ seed: rng.int(1, 1e9), x: rng.range(0.35, 0.65), rate: rng.range(0.7, 1.3) }),
  draw(env, Pm, ctx) {
    const { W, H, sc } = env, t = env.t, u = U(env), lv = lamp(t, Pm.seed | 0, Pm.rate || 1), fi = E.outCubic(clamp(bgT(env) / 0.6));
    const L = lightOf(sc), dk = nightC(sc), cx = W * (Pm.x || 0.5), cy = -u * 0.1;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.hypot(W, H) * 0.9);
    g.addColorStop(0, J.rgba(L, ((isDark(sc.bg) ? 0.16 : 0.3) * lv * fi).toFixed(3))); g.addColorStop(0.5, J.rgba(L, ((isDark(sc.bg) ? 0.04 : 0.08) * lv * fi).toFixed(3))); g.addColorStop(1, J.rgba(L, 0));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const v = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.hypot(W, H) * 0.6);
    v.addColorStop(0, J.rgba(dk, 0)); v.addColorStop(1, J.rgba(dk, ((0.75 - 0.25 * lv) * fi).toFixed(3)));
    ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
    // the tube itself
    ctx.globalAlpha = (0.25 + 0.5 * lv) * fi; ctx.fillStyle = layC(sc, isDark(sc.bg) ? 0.35 : 0.15);
    ctx.fillRect(cx - u * 0.12, u * 0.012, u * 0.24, Math.max(2, u * 0.006));
  } });

bgReg('hrCorridor', {
  ae: 'squareTunnel',
  name: '暗い廊下', tags: TAGS.concat(['graphic']), w: 0.8,
  plan: rng => ({ seed: rng.int(1, 1e9), vx: rng.range(0.44, 0.56), vy: rng.range(0.44, 0.54), spd: rng.range(0.25, 0.45), doors: rng.chance(0.75) }),
  draw(env, Pm, ctx) {
    const { W, H, sc } = env, t = bgT(env), u = U(env), fi = E.outCubic(clamp(t / 0.6));
    const vx = W * (Pm.vx || 0.5), vy = H * (Pm.vy || 0.5), bw = W * 0.08, bh = H * 0.1;
    const col = layC(sc, isDark(sc.bg) ? 0.28 : 0.22), lw = Math.max(1.2, u * 0.0026);
    // depth map: z in (0,1], 1 = at the screen edge, small = far away
    const at = (z, fx, fy) => [vx + (fx - vx) * z + (bw * (fx < vx ? -1 : 1)) * (1 - z) * 0, vy + (fy - vy) * z];
    const back = [[vx - bw, vy - bh], [vx + bw, vy - bh], [vx + bw, vy + bh], [vx - bw, vy + bh]];
    const corners = [[0, 0], [W, 0], [W, H], [0, H]];
    // the light at the far end (flickers)
    const lv = lamp(env.t, (Pm.seed | 0) + 1, 1);
    const g = ctx.createRadialGradient(vx, vy, 0, vx, vy, Math.max(bw, bh) * 3);
    g.addColorStop(0, J.rgba(lightOf(sc), ((isDark(sc.bg) ? 0.22 : 0.3) * lv * fi).toFixed(3))); g.addColorStop(1, J.rgba(lightOf(sc), 0));
    ctx.fillStyle = g; ctx.fillRect(vx - bw * 4, vy - bh * 4, bw * 8, bh * 8);
    ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.globalAlpha = fi; ctx.beginPath();
    for (let i = 0; i < 4; i++) { ctx.moveTo(corners[i][0], corners[i][1]); ctx.lineTo(back[i][0], back[i][1]); }
    ctx.rect(vx - bw, vy - bh, bw * 2, bh * 2);
    // frames sliding towards the camera
    const n = 7, sp = Pm.spd || 0.35;
    for (let k = 0; k < n; k++) {
      const f = wrap(k / n + t * sp * 0.12, 1), z = Math.pow(f, 2.2);
      const x0 = J.lerp(vx - bw, 0, z), x1 = J.lerp(vx + bw, W, z), y0 = J.lerp(vy - bh, 0, z), y1 = J.lerp(vy + bh, H, z);
      ctx.moveTo(x0, y0); ctx.lineTo(x1, y0); ctx.moveTo(x0, y1); ctx.lineTo(x1, y1);
      if (Pm.doors && k % 2 === 0) {
        // a door on each wall: two verticals between the ceiling and floor edges
        const z2 = Math.pow(wrap(f + 0.05, 1), 2.2);
        if (z2 > z) for (const side of [0, 1]) {
          const xa = side ? x1 : x0, xb = side ? J.lerp(vx + bw, W, z2) : J.lerp(vx - bw, 0, z2);
          const ya = J.lerp(y0, y1, 0.25), yb = J.lerp(J.lerp(vy - bh, 0, z2), J.lerp(vy + bh, H, z2), 0.25);
          ctx.moveTo(xa, y1); ctx.lineTo(xa, ya); ctx.lineTo(xb, yb); ctx.lineTo(xb, J.lerp(vy + bh, H, z2));
        }
      }
    }
    ctx.stroke();
    const v = ctx.createRadialGradient(vx, vy, Math.min(W, H) * 0.2, vx, vy, Math.hypot(W, H) * 0.65);
    v.addColorStop(0, J.rgba(nightC(sc), 0)); v.addColorStop(1, J.rgba(nightC(sc), (0.55 * fi).toFixed(3)));
    ctx.globalAlpha = 1; ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  } });

bgReg('hrMold', {
  ae: 'meshBlobs',
  name: '広がる染み', tags: TAGS.concat(['emotional']), w: 0.7, subtle: true,
  plan: rng => ({ seed: rng.int(1, 1e9), n: rng.int(3, 5), k: rng.range(0.08, 0.14) }),
  draw(env, Pm, ctx) {
    const { W, H, sc } = env, t = bgT(env), u = U(env), s = Pm.seed | 0, k = Pm.k || 0.1;
    const stain = isDark(sc.bg) ? J.mix(sc.bg, J.mix(sc.fg, sc.accent2 || sc.sub, 0.5), k) : J.mix(sc.bg, J.mix(sc.sub, '#000000', 0.3), k * 1.4);
    const rim = isDark(sc.bg) ? J.mix(sc.bg, sc.fg, k * 1.6) : J.mix(sc.bg, '#000000', k * 1.3);
    for (let i = 0; i < (Pm.n || 4); i++) {
      const edge = J.h(s, i, 1) % 4, f = J.r(s, i, 2);
      const cx = edge === 0 ? f * W : edge === 1 ? W : edge === 2 ? f * W : 0, cy = edge === 0 ? 0 : edge === 1 ? f * H : edge === 2 ? H : f * H;
      const R = u * J.rr(0.25, 0.5, s, i, 3) * (0.35 + 0.65 * E.outCubic(clamp(t / J.rr(8, 14, s, i, 4)))) * E.outCubic(clamp(t / 0.8));
      const m = 36, pts = [];
      for (let j = 0; j < m; j++) { const a = j / m * TAU, r = R * (0.7 + 0.45 * J.noise1(j * 0.45, s + i) + 0.04 * Math.sin(t * 0.3 + j)); pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
      env.blob(pts, stain, 0.9, false);
      ctx.save(); ctx.strokeStyle = rim; ctx.lineWidth = Math.max(1, u * 0.003); ctx.globalAlpha = 0.6; ctx.beginPath();
      pts.forEach((p, j) => (j ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); ctx.stroke(); ctx.restore();
      // speckles around the edge of the stain
      for (let j = 0; j < 14; j++) { const a = J.r(s, i, j, 5) * TAU, r = R * J.rr(1.02, 1.25, s, i, j, 6); env.circle(cx + Math.cos(a) * r, cy + Math.sin(a) * r, u * J.rr(0.002, 0.008, s, i, j, 7), stain, null, 0, 0.9, false); }
    }
  } });

bgReg('hrDeadTrees', {
  ae: 'mountains',
  name: '枯れ木の森', tags: TAGS.concat(['calm', 'emotional']), w: 0.7,
  plan: rng => ({ seed: rng.int(1, 1e9), n: rng.int(5, 8), fog: rng.range(0.1, 0.2) }),
  draw(env, Pm, ctx) {
    const { W, H, sc } = env, t = env.t, u = U(env), s = Pm.seed | 0, fi = E.outCubic(clamp(bgT(env) / 0.8));
    const layers = [[0.07, 0.75, 0.8], [0.13, 1, 1.15]];
    layers.forEach(([k, hk, sk], l) => {
      const col = isDark(sc.bg) ? layC(sc, k * 0.9) : J.mix(sc.bg, '#000000', k * 1.6);
      ctx.strokeStyle = col; ctx.lineCap = 'round'; ctx.globalAlpha = fi;
      const n = (Pm.n || 6) + l * 2;
      for (let i = 0; i < n; i++) {
        const x = W * (i + 0.5 + J.rs(s, l, i, 1) * 0.35) / n, h = H * J.rr(0.7, 1.05, s, l, i, 2) * hk, sw = Math.sin(t * 0.4 + i + l) * 0.012;
        const seg = (x0, y0, an, len, d, id) => {
          const x1 = x0 + Math.cos(an) * len, y1 = y0 + Math.sin(an) * len;
          ctx.lineWidth = Math.max(1, u * 0.02 * sk * Math.pow(0.55, d)); ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
          if (d >= 4) return;
          const nb = 2;
          for (let b = 0; b < nb; b++) seg(x1, y1, an + (b ? 1 : -1) * J.rr(0.25, 0.7, s, id, b, 3) + sw * (d + 1), len * J.rr(0.55, 0.78, s, id, b, 4), d + 1, id * 2 + b + 1);
        };
        seg(x, H + 2, -Math.PI / 2 + J.rs(s, l, i, 5) * 0.08, h * 0.42, 0, (l * 50 + i) * 64 + 1);
      }
    });
    const f = ctx.createLinearGradient(0, H * 0.45, 0, H);
    f.addColorStop(0, J.rgba(lightOf(sc), 0)); f.addColorStop(1, J.rgba(isDark(sc.bg) ? layC(sc, 0.5) : sc.bg, ((Pm.fog || 0.15) * fi).toFixed(3)));
    ctx.globalAlpha = 1; ctx.fillStyle = f; ctx.fillRect(0, H * 0.45, W, H * 0.55);
  } });

/* ================================================================== CAMERA */
const KM = env => clamp((env.fx.motion ?? 0.7) * 1.25, 0, 1.25);

reg('cam', 'hrNervous', {
  ae: 'handheld',
  name: '怯えた手持ち', tags: TAGS.concat(['glitch', 'emotional']), w: 0.9,
  plan: rng => ({ f: rng.range(0.9, 1.3), jerk: rng.range(0.6, 1) }),
  get: (env, Pm) => {
    const K = KM(env), f = Pm.f || 1, t = env.lt, sd = env.cut.seed | 0;
    let x = (J.noise1(t * f * 1.7, sd) * 0.6 + J.noise1(t * f * 5.3, sd + 1) * 0.4) * env.W * 0.009 * K;
    let y = (J.noise1(t * f * 1.4, sd + 2) * 0.6 + J.noise1(t * f * 4.7, sd + 3) * 0.4) * env.H * 0.011 * K + Math.sin(t * 2.2) * env.H * 0.004 * K;
    let rot = J.noise1(t * f * 1.1, sd + 4) * 1.2 * K;
    // a sudden flinch now and then, settling fast
    const per = 1.6, cyc = Math.floor(t / per), since = t - cyc * per - J.r(sd, cyc, 5) * per * 0.6;
    if (since > 0 && J.r(sd, cyc, 6) < 0.65 * (Pm.jerk || 0.8)) {
      const d = Math.exp(-since * 9) * K;
      x += J.rs(sd, cyc, 7) * env.W * 0.025 * d; y += J.rs(sd, cyc, 8) * env.H * 0.03 * d; rot += J.rs(sd, cyc, 9) * 3 * d;
    }
    return { x, y, rot, s: 1.03, blur: 0 };
  } });

reg('cam', 'hrDutchSnap', {
  ae: 'dutch',
  name: '不意の傾き', tags: TAGS.concat(['emotional', 'graphic']), w: 0.7, strong: true,
  plan: rng => ({ at: rng.range(0.45, 0.65), a: rng.range(3, 4.8) * rng.pick([1, -1]) }),
  get: (env, Pm) => {
    const K = KM(env), d = env.cut.dur, u = clamp(env.lt / Math.max(0.3, d));
    const q = clamp((env.lt - d * (Pm.at || 0.55)) / 0.1), e = E.outBack(q, 2.5);
    return { s: 1 + 0.045 * K * E.inOutSine(u) + 0.02 * K * e, rot: (Pm.a || 4) * Math.min(1, K) * e, y: -env.H * 0.006 * K * e };
  } });

/* ================================================================== SCREEN EFFECTS */
const evS = ev => J.h(Math.round(ev.t * 1000), 9127);
const fx = (k, d) => reg('fx', k, Object.assign({}, d, { draw(ctx, ev, k2, I) { ctx.save(); try { d.draw(ctx, ev, clamp(k2), I); } finally { ctx.restore(); } } }));

/* one frame of a zoomed, red-stained negative */
fx('hrSubliminal', {
  name: 'サブリミナル', tags: TAGS.concat(['glitch']), w: 0.6, dur: 2, amp: 1, glitchy: true, mid: true, scratch: true, ae: 'invert',
  draw(ctx, ev, k, I) {
    const { cw, ch, S, sc } = I; if (!S) return;
    if (k > 0.55) return;
    const s = evS(ev), z = 1.25 + 0.2 * J.r(s, 1), cx = cw * (0.5 + J.rs(s, 2) * 0.08), cy = ch * (0.5 + J.rs(s, 3) * 0.08);
    ctx.drawImage(S, cx - cx * z, cy - cy * z, cw * z, ch * z);
    ctx.globalCompositeOperation = 'difference'; ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, cw, ch);
    ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = J.fitContrast(sc.accent, '#ffffff', 2.5); ctx.fillRect(0, 0, cw, ch);
    ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = '#000000'; ctx.globalAlpha = 0.25; ctx.fillRect(0, 0, cw, ch);
  } });

/* the picture tears, drops to black with a signal-lost caption, and rolls back in */
fx('hrSignalLoss', {
  name: '映像の途切れ', tags: TAGS.concat(['glitch', 'editorial']), w: 0.7, dur: 9, pre: 3, amp: 1, glitchy: true, scratch: true, ae: 'blackFrame',
  draw(ctx, ev, k, I) {
    const { cw, ch, S } = I; if (!S) return;
    const s = evS(ev), st = I.step * 7 + s;
    if (k < 0.3) {
      const q = k / 0.3, n = 10;
      for (let i = 0; i < n; i++) {
        const y = Math.floor(ch * i / n), h = Math.ceil(ch / n);
        if (J.r(st, i, 1) < 0.5 * q) ctx.drawImage(S, 0, y, cw, h, J.rs(st, i, 2) * cw * 0.12 * q, y, cw, h);
      }
      ctx.globalAlpha = 0.5 * q; ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, cw, ch);
      return;
    }
    if (k < 0.78) {
      ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, cw, ch);
      const fs = Math.max(10, Math.round(Math.min(cw, ch) * 0.035));
      ctx.font = J.fontCSS('mono', fs); ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff'; ctx.globalAlpha = (I.step % 4 < 3) ? 0.85 : 0.3;
      ctx.fillText('NO SIGNAL', cw * 0.06, ch * 0.08);
      ctx.globalAlpha = 0.6; ctx.fillText('CH ' + String(3 + (s % 9)).padStart(2, '0'), cw * 0.06, ch * 0.08 + fs * 1.5);
      return;
    }
    const q = (k - 0.78) / 0.22, oy = Math.round((1 - q) * ch * 0.5);
    ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, cw, ch);
    ctx.drawImage(S, 0, oy); ctx.drawImage(S, 0, oy - ch);
    ctx.fillRect(0, oy - Math.max(3, ch * 0.03), cw, Math.max(3, ch * 0.03));
  } });

/* something tall and dark crosses the frame in a few frames */
fx('hrPassingShadow', {
  name: '横切る影', tags: TAGS.concat(['emotional']), w: 0.5, dur: 5, amp: 1, mid: true, ae: 'flash',
  draw(ctx, ev, k, I) {
    const { cw, ch } = I, s = evS(ev), dir = J.r(s, 1) < 0.5 ? 1 : -1, M = Math.min(cw, ch);
    const x = dir > 0 ? J.lerp(-cw * 0.25, cw * 1.25, k) : J.lerp(cw * 1.25, -cw * 0.25, k);
    const w = M * J.rr(0.22, 0.32, s, 2), h = ch * 1.1, top = ch * J.rr(0.05, 0.2, s, 3);
    // dark on light pictures, a pale figure on dark ones; a wider faint copy stands in for a soft edge
    const dk = isDark(I.sc.bg);
    ctx.fillStyle = dk ? J.mix(I.sc.fg, I.sc.bg, 0.35) : '#000000';
    const fig = (g, a) => {
      ctx.globalAlpha = a;
      ctx.beginPath(); ctx.ellipse(x, top + w * 0.35, w * 0.3 * g, w * 0.38 * g, 0, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x - w * 0.5 * g, h); ctx.quadraticCurveTo(x - w * 0.55 * g, top + w * 0.75, x, top + w * (0.7 - 0.05 * g)); ctx.quadraticCurveTo(x + w * 0.55 * g, top + w * 0.75, x + w * 0.5 * g, h); ctx.closePath(); ctx.fill();
    };
    fig(1.12, dk ? 0.15 : 0.3); fig(1, dk ? 0.3 : 0.65);
    ctx.filter = 'none';
  } });

/* ================================================================== TRANSITIONS */
const trReg = (k, d) => reg('trans', k, Object.assign({}, d, {
  draw(ctx, A, B, p, I) {
    ctx.save();
    try { if (!(p > 0)) ctx.drawImage(A, 0, 0); else if (p >= 1) ctx.drawImage(B, 0, 0); else d.draw(ctx, A, B, p, I, I.P || {}); }
    finally { ctx.restore(); }
  } }));

/* static cut: the old shot drowns in snow, the new one surfaces out of it */
trReg('hrStaticCut', {
  name: '砂嵐カット', tags: TAGS.concat(['glitch']), w: 0.9, dur: 0.4, ae: 'pixelate',
  plan: rng => ({ roll: rng.chance(0.6) }),
  draw(ctx, A, B, p, I, Pm) {
    const { cw, ch } = I, st = I.step, src = p < 0.5 ? A : B;
    const nz = p < 0.5 ? E.inQuad(p / 0.5) : 1 - E.outQuad((p - 0.5) / 0.5);
    const oy = Pm.roll ? Math.round(Math.sin(p * Math.PI) * ch * 0.08 * (p < 0.5 ? 1 : -1)) : 0;
    ctx.drawImage(src, 0, oy); if (oy) ctx.drawImage(src, 0, oy > 0 ? oy - ch : oy + ch);
    const N = noiseCv(st), pat = ctx.createPattern(N, 'repeat');
    const sz = Math.max(1, Math.round(ch / 400));
    try { pat.setTransform(new DOMMatrix([sz * 2, 0, 0, sz, -Math.floor(J.r(st, 1) * 128) * sz * 2, -Math.floor(J.r(st, 2) * 96) * sz])); } catch (e) { /* plain */ }
    ctx.imageSmoothingEnabled = false; ctx.globalAlpha = Math.min(1, nz * 1.15); ctx.fillStyle = pat; ctx.fillRect(0, 0, cw, ch);
    ctx.globalAlpha = 0.5 * nz; ctx.fillStyle = '#000000'; ctx.fillRect(0, J.r(st, 3) * ch, cw, ch * 0.12);
  } });

/* blink: eyelids close on the old shot and open on the new one */
trReg('hrBlink', {
  name: 'まばたき', tags: TAGS.concat(['emotional']), w: 0.8, dur: 0.45, ae: 'irisOpen',
  plan: rng => ({ half: rng.chance(0.3) }),
  draw(ctx, A, B, p, I, Pm) {
    const { cw, ch } = I, src = p < 0.5 ? A : B;
    const c = p < 0.5 ? E.inCubic(p / 0.5) : 1 - E.outCubic((p - 0.5) / 0.5);
    ctx.drawImage(src, 0, 0);
    if (c <= 0) return;
    const h = ch / 2 * c * 1.02, bow = ch * 0.18 * (1 - c * 0.6);
    ctx.fillStyle = '#000000';
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(cw, 0); ctx.lineTo(cw, h - bow); ctx.quadraticCurveTo(cw / 2, h + bow, 0, h - bow); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(0, ch); ctx.lineTo(cw, ch); ctx.lineTo(cw, ch - h + bow); ctx.quadraticCurveTo(cw / 2, ch - h - bow, 0, ch - h + bow); ctx.closePath(); ctx.fill();
    // a soft edge around the lids
    const g = ctx.createLinearGradient(0, 0, 0, ch);
    g.addColorStop(0, 'rgba(0,0,0,0.6)'); g.addColorStop(0.5, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.6)');
    ctx.globalAlpha = c; ctx.fillStyle = g; ctx.fillRect(0, 0, cw, ch);
  } });

/* ================================================================== STYLES */
const LAY = { hrFlashlight: 1.6, hrDoorGap: 1.3, hrWallScrawl: 1.2, hrCctv: 1.2, hrOuija: 0.9, hrMissing: 1, hrWrongOne: 1.5, hrRisingDark: 1.3, hrRedacted: 1, hrStaticTv: 1, hrSpiritPhoto: 1, hrWrongShadow: 1.3, center: 1.1, vcols: 1.2, pop: 0.3 };
const ENT = { hrBlinkCreep: 1.3, hrJumpScare: 0.9, hrUneasy: 1.6, hrVhold: 1.1, hrMirrorSnap: 1, hrManifest: 1.6, hrClawReveal: 1, blur: 1.2, flicker: 1.2, pop: 0.2, bounceBig: 0.1, bubbles: 0.1 };
const EXI = { hrPulledDown: 1.4, hrLookBack: 1.3, hrTurnAway: 1.2, hrShiver: 1.2, hrSwallow: 1.3, hrFlickerDie: 1.3, hrDrain: 1.2, blur: 1.1, popOut: 0.1, balloonOff: 0.1 };
const S = {
  hrRuin: {
    name: '廃墟', desc: '褪せた緑灰色・錆の赤・明朝の残響', moods: ['horror'], set: 'horror',
    schemes: [
      { bg: '#161B18', fg: '#D3DACF', sub: '#7D887E', accent: '#B0473A', accent2: '#6E8B6B', ink: '#D3DACF', dim: '#1F2621', ghostA: '#5E7A62', ghostB: '#8A3A30' },
      { bg: '#8C958A', fg: '#141814', sub: '#2E362F', accent: '#6A1A14', accent2: '#E4E8DF', ink: '#141814', dim: '#848D82', ghostA: '#3F4D41', ghostB: '#6A1A14' },
      { bg: '#0C0F0D', fg: '#A9B8A6', sub: '#5D6B5E', accent: '#C24A3A', accent2: '#A9B8A6', ink: '#A9B8A6', dim: '#161B17', ghostA: '#2F4A36', ghostB: '#5E1E18' },
    ],
    fonts: { display: ['mincho_black', 'shippori'], serif: ['mincho', 'mincho_light'], body: ['mincho_light'], mono: ['mono'] },
    texture: { grain: 1, paper: 0.15, scan: 0.1 }, ghost: 0.55,
    bias: { layout: LAY, enter: ENT, exit: EXI,
      treat: { hrEroded: 1.6, hrInkBleed: 1.2, hrDoubleExp: 1.2, hrRedact: 0.6, rainbow: 0.1, sticker: 0.1 },
      bg: { hrFailingLamp: 1.6, hrCorridor: 1.4, hrMold: 1.4, hrDeadTrees: 1.2, polka: 0.1, candy: 0.1 },
      cam: { hrNervous: 1.4, hrDutchSnap: 1.1, handheld: 1.2, bounce: 0.1, jelly: 0.1 },
      fx: { hrPassingShadow: 1.2, hrSubliminal: 1, hrSignalLoss: 0.8, dustScratches: 1.2, starGlint: 0.1 } },
    decor: { hrDustBeam: 1.6, hrCracks: 1.2, hrSigil: 0.8, hrScratches: 1, hrWatchEye: 0.6, hrDrips: 0.8, confetti: 0.05, heartsStars: 0.05 }, hud: false, glow: 0.4,
  },
  hrNightRec: {
    name: '深夜の録画', desc: '真っ黒な画面・監視映像の白と赤・砂嵐', moods: ['horror'], set: 'horror',
    schemes: [
      { bg: '#050505', fg: '#EDEDED', sub: '#8A8A8A', accent: '#E3261E', accent2: '#FFFFFF', ink: '#EDEDED', dim: '#121212', ghostA: '#6E6E6E', ghostB: '#E3261E' },
      { bg: '#0B0E0B', fg: '#D8F0D8', sub: '#6F866F', accent: '#FF3A2A', accent2: '#D8F0D8', ink: '#D8F0D8', dim: '#141A14', ghostA: '#3E6B3E', ghostB: '#FF3A2A' },
      { bg: '#DADADA', fg: '#0A0A0A', sub: '#4A4A4A', accent: '#C8140E', accent2: '#0A0A0A', ink: '#0A0A0A', dim: '#CCCCCC', ghostA: '#8A8A8A', ghostB: '#C8140E' },
    ],
    fonts: { display: ['gothic_bold', 'gothic_black'], serif: ['mincho'], body: ['gothic_med'], mono: ['mono', 'dot'] },
    texture: { grain: 1.2, paper: 0, scan: 0.7 }, ghost: 0.8,
    bias: { layout: Object.assign({}, LAY, { hrCctv: 2.2, hrStaticTv: 1.6, hrRedacted: 1.3, type: 1.2 }), enter: Object.assign({}, ENT, { hrVhold: 1.8, glitchIn: 1 }), exit: Object.assign({}, EXI, { hrFlickerDie: 1.8, glitch: 1 }),
      treat: { hrDoubleExp: 1.4, hrRedact: 1.2, glitchSplit: 1, rainbow: 0.1 },
      bg: { hrFailingLamp: 1.4, hrCorridor: 1.6, vhsBand: 1.4, noiseField: 1, polka: 0.1 },
      cam: { hrNervous: 1.8, hrDutchSnap: 1, handheld: 1.2, jelly: 0.1 },
      fx: { hrSignalLoss: 1.6, hrSubliminal: 1.3, hrPassingShadow: 1, tvStatic: 1.4, trackingNoise: 1.2, vhsRoll: 1.2, starGlint: 0.1 } },
    decor: { hrStaticPatch: 1.6, hrWatchEye: 1, hrCracks: 0.8, hrScratches: 0.8, timecodeBar: 1, hud: 1, confetti: 0.05 }, hud: true, glow: 0.5, glitchBoost: 1.2,
  },
  hrCurse: {
    name: '呪いの手紙', desc: '黄ばんだ便箋・褪せた墨・暗い赤の書き込み', moods: ['horror'], set: 'horror',
    schemes: [
      { bg: '#D8CBA4', fg: '#2A2017', sub: '#6B5B45', accent: '#7E1410', accent2: '#3F3326', ink: '#2A2017', dim: '#CDBF97', ghostA: '#9A2A20', ghostB: '#8A7A5E', paper: true },
      { bg: '#1C140E', fg: '#E3D5B0', sub: '#9A8866', accent: '#B8261C', accent2: '#E3D5B0', ink: '#E3D5B0', dim: '#271D15', ghostA: '#6E1510', ghostB: '#5A4A34', paper: true },
      { bg: '#C4B28A', fg: '#3A0D0A', sub: '#6E4A3A', accent: '#1E1812', accent2: '#7E1410', ink: '#3A0D0A', dim: '#B9A67D', ghostA: '#7E1410', ghostB: '#6E5E44', paper: true },
    ],
    fonts: { display: ['klee', 'brush', 'mincho_black'], serif: ['klee', 'mincho'], body: ['klee', 'mincho'], mono: ['mono'] },
    texture: { grain: 0.7, paper: 1, scan: 0 }, ghost: 0.4,
    bias: { layout: Object.assign({}, LAY, { hrWallScrawl: 2, hrMissing: 1.6, hrSpiritPhoto: 1.5, hrOuija: 1.3, hrCctv: 0.5, letterPaper: 1.2 }), enter: Object.assign({}, ENT, { hrClawReveal: 1.4, inkBleed: 1.4 }), exit: Object.assign({}, EXI, { hrDrain: 1.8, burn: 1 }),
      treat: { hrInkBleed: 1.8, hrEroded: 1.3, hrRedact: 0.8, sticker: 0.1, chrome: 0.1 },
      bg: { hrMold: 1.8, hrFailingLamp: 1, tornPaper: 1, polka: 0.1 },
      cam: { hrNervous: 1, hrDutchSnap: 1.2, driftDiag: 1 },
      fx: { hrSubliminal: 1.2, hrPassingShadow: 1, filmBurn: 1, dustScratches: 1.4, starGlint: 0.1 } },
    decor: { hrDrips: 1.6, hrScratches: 1.2, hrSigil: 1.2, hrCracks: 0.8, crossOut: 1, scribbleCircle: 0.8, confetti: 0.05 }, hud: false, glow: 0.3,
  },
};
for (const [k, v] of Object.entries(S)) {
  if (J.STYLES[k]) continue;
  J.STYLES[k] = v;
  if (!J.STYLE_ORDER.includes(k)) J.STYLE_ORDER.push(k);
}
})();
