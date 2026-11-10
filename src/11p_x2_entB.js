/* JIZURA pack: x2entB — 30 mask / band entrances (clip windows in unusual shapes and orders, slices sliding into register, plates and bars, outline-first reveals) */
(() => {
'use strict';
const E = J.E;
const P = 'x2entB';
const DEG = J.DEG, TAU = J.TAU, PI = Math.PI;
const clamp = J.clamp, lerp = J.lerp;
const reg = (key, def) => J.register('enter', key, def, P);

/* ---------------- easing ---------------- */
const oCubic = x => 1 - Math.pow(1 - clamp(x), 3);
const oQuart = x => 1 - Math.pow(1 - clamp(x), 4);
const oQuint = x => 1 - Math.pow(1 - clamp(x), 5);
const ioCubic = x => { x = clamp(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const sstep = (a, b, x) => J.smooth(a, b, x);
// damped spring: 1 at t=0 → exactly 0 at t=1 (swings through 0)
const spring = (t, k, f) => { t = clamp(t); return Math.exp(-k * t) * Math.cos(f * PI * t) * (1 - t * t * t); };
const bounce = x => {
  x = clamp(x); const n1 = 7.5625, d1 = 2.75;
  if (x < 1 / d1) return n1 * x * x;
  if (x < 2 / d1) return n1 * (x -= 1.5 / d1) * x + 0.75;
  if (x < 2.5 / d1) return n1 * (x -= 2.25 / d1) * x + 0.9375;
  return n1 * (x -= 2.625 / d1) * x + 0.984375;
};
// k = 0..1 order fraction, spread = share of the entrance used for staggering
const stg = (p, k, spread) => clamp((p - spread * k) / (1 - spread));

/* ---------------- item helpers ---------------- */
const isHex = c => typeof c === 'string' && c[0] === '#' && (c.length === 7 || c.length === 4);
const pick = (...cs) => cs.find(isHex) || '#ffffff';
const colOf = it => (isHex(it.color) ? it.color : '#ffffff');
const dirOf = (env, salt) => (J.r(env.cut.seed | 0, salt, 5) < 0.5 ? -1 : 1);
// helper graphics (bars, plates, frames) only go on real lyric items, not on faded / outline copies
const glyphN = t => [...String(t || '').replace(/\s/g, '')].length;
// (a single glyph of a layout that sets every glyph separately gets none either: too much clutter)
const isMain = (it, env) => (it.alpha ?? 1) >= 0.85 && it.fill !== false && !(glyphN(it.text) <= 1 && glyphN(env.cut.text) > 2);
// accent that differs from the item's own colour
const hotOf = (env, it) => (it.color === env.sc.accent ? pick(env.sc.accent2, env.sc.fg) : pick(env.sc.accent, env.sc.fg));

function addPre(it, fn) { const prev = it.pre; it.pre = prev ? (env, x) => { prev(env, x); fn(env, x); } : fn; }
function addPost(it, fn) { const prev = it.post; it.post = prev ? (env, x, bb) => { prev(env, x, bb); fn(env, x, bb); } : fn; }
/* draw an extra copy of the item (all passes) with the same glyph functions */
const STRIP = { pieceFn: null, streak: null, echo: null, pre: null, post: null, clipFn: null, bands: null, vbands: null, wipeBar: null, cursorAt: null };
function copyDraw(env, x, extra) {
  const fns = x.charFns || [];
  return J.drawItem(env, Object.assign({}, x, STRIP, { charFn: fns.length ? J.combineChar(fns) : null }, extra || {}));
}
const OUTLINE = (it, k) => ({ fill: false, stroke: Math.max(1.2, it.size * (k || 0.024)), strokeColor: colOf(it), strokeUnder: false, shadow: null, extrude: null, pattern: null, gradient: null });

/* ---------------- geometry (item-local space: origin at it.x/it.y, before rotation) ---------------- */
function box(it) {
  const m = J.measure(it);
  const x0 = it.vertical ? -m.w / 2 : it.align === 'left' ? 0 : it.align === 'right' ? -m.w : -m.w / 2;
  const y0 = it.vertical && it.align === 'left' ? 0 : -m.h / 2;
  return { x0, y0, x1: x0 + m.w, y1: y0 + m.h, w: m.w, h: m.h, cx: x0 + m.w / 2, cy: y0 + m.h / 2 };
}
function toLocal(ctx, it) {
  ctx.translate(it.x, it.y);
  if (it.rot) ctx.rotate(it.rot * DEG);
  if (it.skew) ctx.transform(1, 0, Math.tan(it.skew * DEG), 1, 0, 0);
}
/* clip path built in item-local coords: fn(ctx, box, item, env). An empty path hides the item. */
function clipLocal(it, fn) {
  it.clipFn = (ctx, env, x) => { const b = box(x); ctx.save(); toLocal(ctx, x); ctx.rect(0, 0, 0, 0); fn(ctx, b, x, env); ctx.restore(); };
}
/* graphics after / before the item, in item-local coords: fn(env, box, item, itemAlpha) */
function hookLocal(add, it, fn) {
  add(it, (env, x) => {
    const A = clamp(x.alpha ?? 1); if (A <= 0.01) return;
    const b = box(x), ctx = env.ctx; ctx.save(); toLocal(ctx, x);
    try { fn(env, b, x, A); } finally { ctx.restore(); ctx.globalAlpha = 1; }
  });
}
const postLocal = (it, fn) => hookLocal(addPost, it, fn);
const preLocal = (it, fn) => hookLocal(addPre, it, fn);
/* (u, v) frame of the padded box: u runs along the reading direction, v across it */
function uv(it, b, m) {
  const vert = !!it.vertical; m = m == null ? it.size * 0.2 : m;
  const U0 = (vert ? b.y0 : b.x0) - m, U1 = (vert ? b.y1 : b.x1) + m, V0 = (vert ? b.x0 : b.y0) - m, V1 = (vert ? b.x1 : b.y1) + m;
  return { vert, U0, U1, V0, V1, L: U1 - U0, T: V1 - V0, uc: (U0 + U1) / 2, vc: (V0 + V1) / 2, big: it.size * 40 + (U1 - U0) + (V1 - V0) };
}
const P2 = (g, u, v) => (g.vert ? [v, u] : [u, v]);
const rectUV = (ctx, g, u0, v0, u1, v1) => { if (u1 <= u0 || v1 <= v0) return; if (g.vert) ctx.rect(v0, u0, v1 - v0, u1 - u0); else ctx.rect(u0, v0, u1 - u0, v1 - v0); };
const polyUV = (ctx, g, pts) => { pts.forEach((q, i) => { const [x, y] = P2(g, q[0], q[1]); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }); ctx.closePath(); };
const eRect = (env, g, u0, v0, u1, v1, col, a) => { if (u1 <= u0 || v1 <= v0 || a <= 0.004) return; if (g.vert) env.rect(v0, u0, v1 - v0, u1 - u0, col, a, false); else env.rect(u0, v0, u1 - u0, v1 - v0, col, a, false); };
const eLine = (env, g, pts, col, lw, a) => { if (a > 0.004) env.line(pts.map(q => P2(g, q[0], q[1])), col, lw, a, false); };
const ePoly = (env, g, pts, col, a) => { if (a > 0.004) env.poly(pts.map(q => P2(g, q[0], q[1])), col, a, false); };
const lineW = it => Math.max(2, it.size * 0.03);

/* The item is replaced by several clipped copies of itself (slices), each with its own offset.
   list: [{ clip(ctx, g, b, ov), du, dv (offset along / across the reading direction), rot (deg, about the box centre),
            a (alpha factor), fixed (true: the window stays at rest and the content moves under it) }] */
function parts(it, list) {
  it.clipFn = (ctx) => { ctx.rect(0, 0, 0, 0); };
  addPost(it, (env, x) => {
    const ctx = env.ctx, b = box(x), g = uv(x, b), ov = 1.2 / (env.scale || 1), A = x.alpha ?? 1;
    const r0 = (x.rot || 0) * DEG, c0 = Math.cos(r0), s0 = Math.sin(r0);
    for (const s of list) {
      const a = s.a == null ? 1 : s.a; if (a <= 0.004) continue;
      const o = Object.assign({}, x);
      if (s.du || s.dv) { const [dx, dy] = P2(g, s.du || 0, s.dv || 0); o.x += c0 * dx - s0 * dy; o.y += s0 * dx + c0 * dy; }
      if (s.rot) {
        const r1 = r0 + s.rot * DEG, c1 = Math.cos(r1), s1 = Math.sin(r1);
        o.x += (c0 - c1) * b.cx - (s0 - s1) * b.cy; o.y += (s0 - s1) * b.cx + (c0 - c1) * b.cy; o.rot = (x.rot || 0) + s.rot;
      }
      ctx.save(); ctx.beginPath(); ctx.save(); toLocal(ctx, s.fixed ? x : o); ctx.rect(0, 0, 0, 0); s.clip(ctx, g, b, ov); ctx.restore(); ctx.clip();
      copyDraw(env, o, a < 1 ? { alpha: A * a } : null);
      ctx.restore();
    }
  });
}

/* =====================================================================
   A. WINDOWS — clip shapes
   ===================================================================== */

/* 角から円 — a circle grows out of one corner of the line until it has swallowed the whole of it */
reg('xfCornerBloom', {
  name: '角から円', en: 'Corner Bloom', tags: ['pop', 'graphic', 'emotional'], w: 1, ae: 'wipe',
  inDur: dur => clamp(dur * 0.4, 0.16, 0.7),
  apply(env, it, p) {
    const size = it.size, e = ioCubic(p), c = J.h(env.cut.seed | 0, 301) & 3;
    const geo = b => { const m = size * 0.25; return { x: c & 1 ? b.x1 + m : b.x0 - m, y: c & 2 ? b.y0 - m : b.y1 + m, r: (Math.hypot(b.w + m * 2, b.h + m * 2) + 2) * e }; };
    clipLocal(it, (ctx, b) => { const G = geo(b); if (G.r <= 0.01) return; ctx.moveTo(G.x + G.r, G.y); ctx.arc(G.x, G.y, G.r, 0, TAU); });
    if (!isMain(it, env)) return;
    postLocal(it, (env2, b, x, A) => {
      const G = geo(b), a = A * (1 - sstep(0.5, 0.92, p)); if (a <= 0.01 || G.r < 1) return;
      const a0 = c & 1 ? (c & 2 ? 90 : 180) : (c & 2 ? 0 : 270), col = hotOf(env2, x);
      env2.arc(G.x, G.y, G.r, a0, a0 + 90, col, lineW(x), a, false);
      env2.arc(G.x, G.y, G.r * 0.82, a0, a0 + 90, col, lineW(x) * 0.5, a * 0.5, false);
    });
  },
});

/* 山形ワイプ — the leading edge is an arrow head: the middle of the line is uncovered first, two outline chevrons run ahead */
reg('xfChevron', {
  name: '山形ワイプ', en: 'Chevron Wipe', tags: ['graphic', 'pop', 'editorial'], w: 1.2, ae: 'wipe',
  apply(env, it, p) {
    const size = it.size, dir = dirOf(env, 302), e = ioCubic(p), k = 0.6;
    const geo = b => { const g = uv(it, b), hv = g.T / 2; return { g, hv, tip: (g.L + k * hv + 1) * e, u: s => (dir > 0 ? g.U0 + s : g.U1 - s) }; };
    clipLocal(it, (ctx, b) => {
      const G = geo(b), g = G.g; if (e <= 0) return;
      polyUV(ctx, g, [[G.u(-g.big), g.V0], [G.u(G.tip - k * G.hv), g.V0], [G.u(G.tip), g.vc], [G.u(G.tip - k * G.hv), g.V1], [G.u(-g.big), g.V1]]);
    });
    if (!isMain(it, env)) return;
    postLocal(it, (env2, b, x, A) => {
      const G = geo(b), g = G.g, fade = A * clamp(p * 8) * (1 - sstep(0.72, 0.96, p)), col = hotOf(env2, x);
      for (let j = 0; j < 2; j++) {
        const o = G.tip + size * (0.16 + 0.3 * j);
        eLine(env2, g, [[G.u(o - k * G.hv), g.V0], [G.u(o), g.vc], [G.u(o - k * G.hv), g.V1]], col, lineW(x) * (j ? 0.6 : 1.2), fade * (j ? 0.5 : 1));
      }
    });
  },
});

/* 噛み合わせ — two saw-toothed jaws close on the line from above and below and mesh along a zigzag */
reg('xfJaws', {
  name: '噛み合わせ', en: 'Jaws', tags: ['graphic', 'pop', 'glitch'], w: 0.9, ae: 'wipe',
  apply(env, it, p) {
    const size = it.size, e = ioCubic(p / 0.94), snap = sstep(0.8, 1, p);
    const geo = b => {
      const g = uv(it, b, size * 0.06), nT = Math.max(2, Math.min(40, Math.round(g.L / (size * 0.62)))), tw = g.L / nT, am = Math.min(g.T * 0.2, size * 0.26);
      const D = (g.T / 2 + am * 0.5) * (1 - e), z = [];
      for (let j = 0; j <= nT * 2; j++) z.push([g.U0 + j * tw / 2, g.vc + (j % 2 ? am : -am)]);
      z[0][0] -= g.big; z[z.length - 1][0] += g.big;
      return { g, D, z };
    };
    clipLocal(it, (ctx, b) => {
      const G = geo(b), g = G.g; if (p <= 0) return;
      polyUV(ctx, g, [[g.U0 - g.big, g.V0 - g.big], [g.U1 + g.big, g.V0 - g.big]].concat(G.z.slice().reverse().map(q => [q[0], q[1] - G.D + 0.4])));
      polyUV(ctx, g, G.z.map(q => [q[0], q[1] + G.D - 0.4]).concat([[g.U1 + g.big, g.V1 + g.big], [g.U0 - g.big, g.V1 + g.big]]));
    });
    if (!isMain(it, env)) return;
    postLocal(it, (env2, b, x, A) => {
      const G = geo(b), g = G.g, a = A * clamp(p * 6) * (1 - snap), col = hotOf(env2, x);
      const z = G.z.slice(); z[0] = [g.U0, z[0][1]]; z[z.length - 1] = [g.U1, z[z.length - 1][1]];
      eLine(env2, g, z.map(q => [q[0], q[1] - G.D]), col, lineW(x), a);
      eLine(env2, g, z.map(q => [q[0], q[1] + G.D]), col, lineW(x), a);
    });
  },
});

/* 斜めルーバー — slanted slats drift along the line while they open one after another, like a louvre turned by a cord */
reg('xfSlantLouver', {
  name: '斜めルーバー', en: 'Slant Louvre', tags: ['graphic', 'editorial', 'calm'], w: 1, ae: 'wipe',
  inDur: dur => clamp(dur * 0.42, 0.18, 0.75),
  apply(env, it, p) {
    const size = it.size, dir = dirOf(env, 304), k = 0.75 * dirOf(env, 305);
    clipLocal(it, (ctx, b) => {
      const g = uv(it, b), ak = Math.abs(k) * g.T / 2, lo = g.U0 - ak, hi = g.U1 + ak;
      const pitch = Math.max(size * 0.46, (hi - lo) / 70), drift = (1 - oCubic(p)) * pitch * 2.5 * dir;
      const j0 = Math.floor((lo - drift) / pitch) - 1, j1 = Math.ceil((hi - drift) / pitch) + 1;
      for (let j = j0; j <= j1; j++) {
        const c = j * pitch + drift, f = clamp((c - lo) / Math.max(1, hi - lo));
        const d = ioCubic(stg(p, dir > 0 ? 1 - f : f, 0.45)); if (d <= 0) continue;
        const hw = pitch * 0.5 * d + 0.5;
        polyUV(ctx, g, [[c - hw - k * g.T / 2, g.V0], [c + hw - k * g.T / 2, g.V0], [c + hw + k * g.T / 2, g.V1], [c - hw + k * g.T / 2, g.V1]]);
      }
    });
  },
});

/* 穴がつながる — a handful of round holes open at scattered points and grow until they merge into the whole line */
reg('xfHolesMerge', {
  name: '穴がつながる', en: 'Merging Holes', tags: ['pop', 'emotional', 'graphic'], w: 1, ae: 'wipe',
  inDur: dur => clamp(dur * 0.42, 0.18, 0.75),
  apply(env, it, p) {
    const size = it.size, seed = it.seed | 0;
    const holes = b => {
      const g = uv(it, b), n = clamp(Math.round(g.L / (size * 1.2)), 2, 7), cw = g.L / n, out = [];
      for (let k = 0; k < n; k++) {
        const ju = J.rs(seed, k, 311) * cw * 0.28, jv = J.rs(seed, k, 312) * g.T * 0.28;
        const q = stg(p, J.r(seed, k, 313), 0.4), [x, y] = P2(g, g.U0 + (k + 0.5) * cw + ju, g.vc + jv);
        out.push({ x, y, q, r: (Math.hypot(cw / 2 + Math.abs(ju), g.T / 2 + Math.abs(jv)) * 1.03 + 1) * ioCubic(q) });
      }
      return out;
    };
    clipLocal(it, (ctx, b) => { for (const h of holes(b)) if (h.r > 0.01) { ctx.moveTo(h.x + h.r, h.y); ctx.arc(h.x, h.y, h.r, 0, TAU); } });
    if (!isMain(it, env)) return;
    postLocal(it, (env2, b, x, A) => {
      const col = hotOf(env2, x);
      for (const h of holes(b)) if (h.q > 0) env2.circle(h.x, h.y, h.r, null, col, lineW(x) * 0.8, A * (1 - sstep(0.25, 0.8, h.q)), false);
    });
  },
});

/* 放射びらき — eight wedges fan out from the middle of the line, turning slightly as they widen into a full disc */
reg('xfSunburst', {
  name: '放射びらき', en: 'Sunburst', tags: ['pop', 'graphic', 'emotional'], w: 0.9, ae: 'wipe',
  apply(env, it, p) {
    const n = 8, dir = dirOf(env, 321), a0 = J.r(env.cut.seed | 0, 322) * TAU + (1 - oCubic(p)) * 0.8 * dir, ha = (PI / n) * ioCubic(p) * 1.03;
    const R = g => Math.hypot(g.L, g.T) / 2 + 2;
    clipLocal(it, (ctx, b) => {
      if (ha <= 0) return;
      const g = uv(it, b), r = R(g) / Math.cos(Math.min(ha, PI / n));
      for (let k = 0; k < n; k++) {
        const a = a0 + k * TAU / n;
        polyUV(ctx, g, [[g.uc, g.vc], [g.uc + Math.cos(a - ha) * r, g.vc + Math.sin(a - ha) * r], [g.uc + Math.cos(a + ha) * r, g.vc + Math.sin(a + ha) * r]]);
      }
    });
    if (!isMain(it, env)) return;
    postLocal(it, (env2, b, x, A) => {
      const g = uv(x, b), a = A * clamp(p * 10) * (1 - sstep(0.15, 0.6, p)), r = R(g) * oCubic(p * 2.2), col = hotOf(env2, x);
      for (let k = 0; k < n; k++) { const an = a0 + k * TAU / n; eLine(env2, g, [[g.uc, g.vc], [g.uc + Math.cos(an) * r, g.vc + Math.sin(an) * r]], col, lineW(x) * 0.6, a); }
    });
  },
});

/* 三連窓 — the line sits behind three panes; the middle one opens first, then the outer two, each framed while it grows */
reg('xfTriptych', {
  name: '三連窓', en: 'Triple Windows', tags: ['editorial', 'graphic', 'calm'], w: 1.1, ae: 'wipe',
  inDur: dur => clamp(dur * 0.42, 0.18, 0.75),
  apply(env, it, p) {
    const ORD = [1, 0, 2];
    const panes = b => {
      const g = uv(it, b), w = g.L / 3, out = [];
      for (let k = 0; k < 3; k++) {
        const q = stg(p, ORD[k] / 2, 0.45), e = oQuart(q), c = g.U0 + (k + 0.5) * w;
        out.push({ q, u0: c - (w / 2 + 0.5) * e, u1: c + (w / 2 + 0.5) * e, v0: g.vc - g.T / 2 * e, v1: g.vc + g.T / 2 * e });
      }
      return { g, out };
    };
    clipLocal(it, (ctx, b) => { const G = panes(b); for (const w of G.out) rectUV(ctx, G.g, w.u0, w.v0, w.u1, w.v1); });
    if (!isMain(it, env)) return;
    postLocal(it, (env2, b, x, A) => {
      const G = panes(b), col = hotOf(env2, x);
      for (const w of G.out) {
        if (w.q <= 0) continue;
        eLine(env2, G.g, [[w.u0, w.v0], [w.u1, w.v0], [w.u1, w.v1], [w.u0, w.v1], [w.u0, w.v0], [w.u1, w.v0]], col, lineW(x) * 0.8, A * (1 - sstep(0.55, 1, w.q)));
      }
    });
  },
});

/* 覗き窓 — a framed window travels along the line showing a glimpse of it, then stretches back and opens everything */
reg('xfRovingWindow', {
  name: '覗き窓', en: 'Roving Window', tags: ['editorial', 'emotional', 'graphic'], w: 1, ae: 'wipe', minDur: 0.6,
  inDur: dur => clamp(dur * 0.5, 0.3, 0.95),
  apply(env, it, p) {
    const size = it.size, dir = dirOf(env, 331);
    const win = b => {
      const g = uv(it, b), w0 = Math.min(clamp(g.L * 0.28, size * 0.9, size * 2.6), g.L * 0.6);
      const t1 = ioCubic(p / 0.5), t2 = ioCubic((p - 0.5) / 0.5);
      let a = p < 0.5 ? lerp(-w0, g.L - w0, t1) : lerp(g.L - w0, 0, t2), z = p < 0.5 ? a + w0 : g.L;
      a = Math.max(0, a); z = Math.min(g.L, z);
      return { g, u0: dir > 0 ? g.U0 + a : g.U1 - z, u1: dir > 0 ? g.U0 + z : g.U1 - a };
    };
    clipLocal(it, (ctx, b) => { const G = win(b); rectUV(ctx, G.g, G.u0, G.g.V0, G.u1, G.g.V1); });
    if (!isMain(it, env)) return;
    postLocal(it, (env2, b, x, A) => {
      const G = win(b), g = G.g, a = A * (1 - sstep(0.78, 1, p)); if (G.u1 - G.u0 < 1) return;
      eLine(env2, g, [[G.u0, g.V0], [G.u1, g.V0], [G.u1, g.V1], [G.u0, g.V1], [G.u0, g.V0], [G.u1, g.V0]], hotOf(env2, x), lineW(x), a);
    });
  },
});

/* 階段ワイプ — the line is uncovered column by column, each a little later, so the boundary is a moving staircase */
reg('xfStaircase', {
  name: '階段ワイプ', en: 'Staircase', tags: ['graphic', 'pop', 'editorial'], w: 1, ae: 'wipe',
  apply(env, it, p) {
    const size = it.size, rev = dirOf(env, 341) < 0, up = dirOf(env, 342) < 0, s = 0.75;
    const cols = b => {
      const g = uv(it, b), N = clamp(Math.round(g.L / (size * 0.62)), 4, 14), w = g.L / N, out = [];
      for (let k = 0; k < N; k++) out.push({ u0: g.U0 + k * w, u1: g.U0 + (k + 1) * w, f: ioCubic(clamp(p * (1 + s) - s * (rev ? N - 1 - k : k) / (N - 1))) });
      return { g, out };
    };
    clipLocal(it, (ctx, b) => {
      const G = cols(b), g = G.g;
      for (const c of G.out) if (c.f > 0) { if (up) rectUV(ctx, g, c.u0, g.V1 - g.T * c.f, c.u1 + 0.6, g.V1 + g.big); else rectUV(ctx, g, c.u0, g.V0 - g.big, c.u1 + 0.6, g.V0 + g.T * c.f); }
    });
    if (!isMain(it, env)) return;
    postLocal(it, (env2, b, x, A) => {
      const G = cols(b), g = G.g, t = lineW(x), col = hotOf(env2, x);
      for (const c of G.out) {
        if (c.f <= 0 || c.f >= 1) continue;
        const v = up ? g.V1 - g.T * c.f : g.V0 + g.T * c.f;
        eRect(env2, g, c.u0, v - t / 2, c.u1, v + t / 2, col, A * Math.min(1, c.f * 6, (1 - c.f) * 6));
      }
    });
  },
});

/* 四分割リレー — the four quarters of the line are wiped one after another, the wipe turning a corner each time */
reg('xfQuadRelay', {
  name: '四分割リレー', en: 'Quad Relay', tags: ['graphic', 'editorial', 'glitch'], w: 0.9, ae: 'wipe', minDur: 0.5,
  inDur: dur => clamp(dur * 0.45, 0.22, 0.8),
  apply(env, it, p) {
    const flip = dirOf(env, 351) < 0;
    const quads = b => {
      const g0 = uv(it, b), g = flip ? Object.assign({}, g0, { V0: g0.V1, V1: g0.V0 }) : g0, out = [];
      const e = k => ioCubic(clamp((p - k * 0.22) / 0.34));
      const U = [g.U0, g.uc, g.U1], V = [g.V0, g.vc, g.V1];
      // [u-from, u-to, v-from, v-to] of the full quarter and the axis the wipe runs along
      out.push({ e: e(0), r: [U[0], lerp(U[0], U[1], e(0)), V[0], V[1]], bar: 'u' });
      out.push({ e: e(1), r: [U[1], U[2], V[0], lerp(V[0], V[1], e(1))], bar: 'v' });
      out.push({ e: e(2), r: [U[2], lerp(U[2], U[1], e(2)), V[2], V[1]], bar: 'u' });
      out.push({ e: e(3), r: [U[1], U[0], V[2], lerp(V[2], V[1], e(3))], bar: 'v' });
      return { g: g0, out };
    };
    const norm = r => [Math.min(r[0], r[1]), Math.max(r[0], r[1]), Math.min(r[2], r[3]), Math.max(r[2], r[3])];
    clipLocal(it, (ctx, b) => {
      const G = quads(b);
      for (const q of G.out) { if (q.e <= 0) continue; const r = norm(q.r); rectUV(ctx, G.g, r[0] - 0.4, r[2] - 0.4, r[1] + 0.4, r[3] + 0.4); }
    });
    if (!isMain(it, env)) return;
    postLocal(it, (env2, b, x, A) => {
      const G = quads(b), t = lineW(x) * 1.3, col = hotOf(env2, x);
      for (const q of G.out) {
        if (q.e <= 0 || q.e >= 1) continue;
        const r = norm(q.r);
        if (q.bar === 'u') eRect(env2, G.g, q.r[1] - t / 2, r[2], q.r[1] + t / 2, r[3], col, A);
        else eRect(env2, G.g, r[0], q.r[3] - t / 2, r[1], q.r[3] + t / 2, col, A);
      }
    });
  },
});

/* ワイパー — an arm pivoting below the line sweeps across like a windscreen wiper and leaves the lyric behind it */
reg('xfWiper', {
  name: 'ワイパー', en: 'Wiper', tags: ['pop', 'graphic', 'editorial'], w: 1, ae: 'wipe',
  inDur: dur => clamp(dur * 0.42, 0.18, 0.75),
  apply(env, it, p) {
    const size = it.size, dir = dirOf(env, 361), e = ioCubic(p / 0.94);
    const geo = b => {
      const g = uv(it, b), d = g.T * 0.55 + size * 0.5, pv = g.V1 + d;
      const aL = Math.atan2(-d, -g.L / 2) - 0.03, aR = Math.atan2(-d, g.L / 2) + 0.03;        // aL < aR, both pointing "up"
      const A0 = dir > 0 ? aL : aR, A1 = dir > 0 ? aR : aL;
      return { g, pv, A0, a: lerp(A0, A1, e), R: Math.hypot(g.L / 2, g.T + d) * 1.04 };
    };
    clipLocal(it, (ctx, b) => {
      const G = geo(b), g = G.g; if (e <= 0) return;
      const n = Math.max(2, Math.ceil(Math.abs(G.a - G.A0) / 0.05)), pts = [[g.uc, G.pv]];
      for (let k = 0; k <= n; k++) { const a = lerp(G.A0, G.a, k / n); pts.push([g.uc + Math.cos(a) * G.R * 1.02, G.pv + Math.sin(a) * G.R * 1.02]); }
      polyUV(ctx, g, pts);
    });
    if (!isMain(it, env)) return;
    postLocal(it, (env2, b, x, A) => {
      const G = geo(b), g = G.g, a = A * clamp(p * 10) * (1 - sstep(0.82, 0.98, p)), col = hotOf(env2, x);
      eLine(env2, g, [[g.uc, G.pv], [g.uc + Math.cos(G.a) * G.R, G.pv + Math.sin(G.a) * G.R]], col, lineW(x) * 1.6, a);
      const [cx, cy] = P2(g, g.uc, G.pv);
      env2.circle(cx, cy, lineW(x) * 2.2, col, null, 1, a, false);
    });
  },
});

/* 渦巻き窓 — a thin spiral slit winds outwards from the middle of the line, then thickens until its turns touch */
reg('xfSpiral', {
  name: '渦巻き窓', en: 'Spiral Slit', tags: ['pop', 'emotional', 'graphic'], w: 0.8, ae: 'wipe', minDur: 0.5,
  inDur: dur => clamp(dur * 0.5, 0.25, 0.9),
  apply(env, it, p) {
    const dir = dirOf(env, 371), th0 = J.r(env.cut.seed | 0, 372) * TAU, turns = 3;
    const eL = oCubic(p / 0.7), eW = ioCubic((p - 0.3) / 0.7);
    const geo = b => {
      const g = uv(it, b), kx = clamp(g.L / g.T, 1, 3.2), Rm = Math.hypot(g.L / 2 / kx, g.T / 2) + 1, pitch = Rm / turns;
      return { g, kx, pitch, tm: TAU * turns * eL, hw: pitch * lerp(0.15, 1.02, eW) };
    };
    const at = (G, th, r) => [G.g.uc + Math.cos(th0 + dir * th) * r * G.kx, G.g.vc + Math.sin(th0 + dir * th) * r];
    clipLocal(it, (ctx, b) => {
      const G = geo(b); if (G.tm <= 0.02) return;
      const n = Math.max(3, Math.ceil(G.tm / 0.17)), o = [], i = [];
      for (let k = 0; k <= n; k++) { const th = G.tm * k / n, r = G.pitch * th / TAU; o.push(at(G, th, r + G.hw)); i.push(at(G, th, Math.max(0, r - G.hw))); }
      polyUV(ctx, G.g, o.concat(i.reverse()));
    });
    if (!isMain(it, env)) return;
    postLocal(it, (env2, b, x, A) => {
      const G = geo(b), a = A * (1 - sstep(0.35, 0.8, p)); if (a <= 0.01 || G.tm <= 0.05) return;
      const n = Math.max(3, Math.ceil(G.tm / 0.17)), pts = [];
      for (let k = 0; k <= n; k++) { const th = G.tm * k / n; pts.push(at(G, th, G.pitch * th / TAU)); }
      eLine(env2, G.g, pts, hotOf(env2, x), lineW(x) * 0.7, a);
    });
  },
});

/* 十字びらき — a cross-shaped window: a slit along the line and a column across it widen together, the four corners close last */
reg('xfCrossOpen', {
  name: '十字びらき', en: 'Cross Open', tags: ['graphic', 'editorial', 'pop'], w: 1, ae: 'wipe',
  apply(env, it, p) {
    const e1 = ioCubic(p), e2 = ioCubic(p * 1.15 - 0.15);
    const geo = b => { const g = uv(it, b); return { g, hu: (g.L / 2 + 0.5) * e2, hv: (g.T / 2 + 0.5) * e1 }; };
    clipLocal(it, (ctx, b) => {
      const G = geo(b), g = G.g;
      rectUV(ctx, g, g.U0 - 1, g.vc - G.hv, g.U1 + 1, g.vc + G.hv);
      rectUV(ctx, g, g.uc - G.hu, g.V0 - 1, g.uc + G.hu, g.V1 + 1);
    });
    if (!isMain(it, env)) return;
    postLocal(it, (env2, b, x, A) => {
      const G = geo(b), g = G.g, a = A * clamp(p * 8) * (1 - sstep(0.7, 0.95, p)), t = lineW(x), col = hotOf(env2, x), arm = it.size * 0.22;
      for (const su of [-1, 1]) for (const sv of [-1, 1]) {
        const u = g.uc + su * G.hu, v = g.vc + sv * G.hv;
        eRect(env2, g, Math.min(u, u + su * arm), v - t / 2, Math.max(u, u + su * arm), v + t / 2, col, a);
        eRect(env2, g, u - t / 2, Math.min(v, v + sv * arm), u + t / 2, Math.max(v, v + sv * arm), col, a);
      }
    });
  },
});

/* 閉じる穴 — the line is revealed from its outer edge inwards: an oval blind spot over it shrinks to a point and is gone */
reg('xfClosingHole', {
  name: '閉じる穴', en: 'Closing Hole', tags: ['emotional', 'calm', 'graphic'], w: 0.9, ae: 'wipe',
  inDur: dur => clamp(dur * 0.42, 0.18, 0.75),
  apply(env, it, p) {
    const size = it.size, e = 0.5 * oCubic(p) + 0.5 * ioCubic(p);
    const geo = b => ({ rx: (b.w / 2 * 1.42 + 2) * (1 - e), ry: (b.h / 2 * 1.42 + 2) * (1 - e) });
    clipLocal(it, (ctx, b) => {
      const G = geo(b), big = size * 40 + b.w + b.h; if (p <= 0) return;
      ctx.rect(b.cx - big, b.cy - big, big * 2, big * 2);
      if (G.rx > 0.3 && G.ry > 0.3) { ctx.moveTo(b.cx + G.rx, b.cy); ctx.ellipse(b.cx, b.cy, G.rx, G.ry, 0, 0, TAU, true); }
    });
    if (!isMain(it, env)) return;
    postLocal(it, (env2, b, x, A) => {
      const G = geo(b), a = A * clamp(p * 3.5) * (1 - sstep(0.75, 1, p)); if (env2.pass !== 'main' || a <= 0.01 || G.rx < 1 || G.ry < 1) return;
      const ctx = env2.ctx; ctx.save();
      ctx.globalAlpha = a; ctx.strokeStyle = hotOf(env2, x); ctx.lineWidth = lineW(x) * 0.8;
      ctx.beginPath(); ctx.ellipse(b.cx, b.cy, G.rx, G.ry, 0, 0, TAU); ctx.stroke();
      ctx.restore();
    });
  },
});

/* 織り目 — stripes along the line and stripes across it run in from alternate sides, weave a plaid, then thicken until it is solid */
reg('xfWeave', {
  name: '織り目', en: 'Weave', tags: ['graphic', 'editorial', 'pop'], w: 0.9, ae: 'wipe', minDur: 0.5,
  inDur: dur => clamp(dur * 0.48, 0.24, 0.85),
  apply(env, it, p) {
    const size = it.size, x1 = ioCubic(p / 0.55), x2 = ioCubic((p - 0.1) / 0.55), d = lerp(0.42, 1, ioCubic((p - 0.5) / 0.5));
    clipLocal(it, (ctx, b) => {
      const g = uv(it, b);
      const nH = clamp(Math.round(g.T / (size * 0.34)), 3, 12), ph = g.T / nH, nV = clamp(Math.round(g.L / (size * 0.34)), 3, 44), pw = g.L / nV;
      if (x1 > 0) for (let j = 0; j < nH; j++) {
        const c = g.V0 + (j + 0.5) * ph, hw = ph * d / 2 + 0.4;
        if (j % 2) rectUV(ctx, g, g.U1 - g.L * x1, c - hw, g.U1 + 1, c + hw); else rectUV(ctx, g, g.U0 - 1, c - hw, g.U0 + g.L * x1, c + hw);
      }
      if (x2 > 0) for (let k = 0; k < nV; k++) {
        const c = g.U0 + (k + 0.5) * pw, hw = pw * d / 2 + 0.4;
        if (k % 2) rectUV(ctx, g, c - hw, g.V1 - g.T * x2, c + hw, g.V1 + 1); else rectUV(ctx, g, c - hw, g.V0 - 1, c + hw, g.V0 + g.T * x2);
      }
    });
  },
});

/* すれ違いワイプ — the upper half is wiped from one end, the lower half from the other; the two bars pass each other mid-line */
reg('xfPassingWipes', {
  name: 'すれ違いワイプ', en: 'Passing Wipes', tags: ['graphic', 'editorial', 'pop'], w: 1.1, ae: 'wipe',
  apply(env, it, p) {
    const dir = dirOf(env, 381), e = ioCubic(p);
    const geo = b => { const g = uv(it, b); return { g, a: dir > 0 ? g.U0 + g.L * e : g.U1 - g.L * e, z: dir > 0 ? g.U1 - g.L * e : g.U0 + g.L * e }; };
    clipLocal(it, (ctx, b) => {
      const G = geo(b), g = G.g; if (e <= 0) return;
      rectUV(ctx, g, dir > 0 ? g.U0 - g.big : G.a, g.V0 - g.big, dir > 0 ? G.a : g.U1 + g.big, g.vc + 0.4);
      rectUV(ctx, g, dir > 0 ? G.z : g.U0 - g.big, g.vc, dir > 0 ? g.U1 + g.big : G.z, g.V1 + g.big);
    });
    if (!isMain(it, env)) return;
    postLocal(it, (env2, b, x, A) => {
      const G = geo(b), g = G.g, t = Math.max(4, it.size * 0.07) / 2, col = hotOf(env2, x), a = A * clamp(p * 12);
      eRect(env2, g, G.a - t, g.V0, G.a + t, g.vc, col, a);
      eRect(env2, g, G.z - t, g.vc, G.z + t, g.V1, col, a);
    });
  },
});

/* 印字ヘッド — a print head shuttles back and forth, laying the line down one thin row at a time from the top */
reg('xfPrintHead', {
  name: '印字ヘッド', en: 'Print Head', tags: ['graphic', 'glitch', 'editorial'], w: 0.9, ae: 'wipe', minDur: 0.55,
  inDur: dur => clamp(dur * 0.5, 0.28, 0.95),
  apply(env, it, p) {
    const size = it.size, first = dirOf(env, 391);
    const rows = b => {
      const g = uv(it, b), N = clamp(Math.round(g.T / (size * 0.36)), 3, 8), h = g.T / N, out = [];
      for (let k = 0; k < N; k++) {
        const q = clamp(p * N - k), e = E.inOutSine(q), d = (k % 2 ? -1 : 1) * first;
        out.push({ q, v0: g.V0 + k * h, v1: g.V0 + (k + 1) * h, edge: d > 0 ? g.U0 + g.L * e : g.U1 - g.L * e, d });
      }
      return { g, out };
    };
    clipLocal(it, (ctx, b) => {
      const G = rows(b), g = G.g;
      for (const r of G.out) if (r.q > 0) rectUV(ctx, g, r.d > 0 ? g.U0 - 1 : r.edge, r.v0 - 0.4, r.d > 0 ? r.edge : g.U1 + 1, r.v1 + 0.4);
    });
    if (!isMain(it, env)) return;
    postLocal(it, (env2, b, x, A) => {
      const G = rows(b), hw = size * 0.11, col = hotOf(env2, x);
      for (const r of G.out) if (r.q > 0 && r.q < 1) eRect(env2, G.g, r.edge - hw, r.v0 - size * 0.04, r.edge + hw, r.v1 + size * 0.04, col, A);
    });
  },
});

/* =====================================================================
   B. SLICES — pieces of the line slide into register
   ===================================================================== */

/* 二版合わせ — the line is split into two fields of hairline rows; one slides in from each side and they interleave */
reg('xfTwoFields', {
  name: '二版合わせ', en: 'Two Fields', tags: ['glitch', 'graphic', 'editorial'], w: 1, ae: 'slice',
  inDur: dur => clamp(dur * 0.42, 0.18, 0.75),
  apply(env, it, p) {
    const size = it.size, dir = dirOf(env, 401), b0 = box(it), g0 = uv(it, b0), D = size * 1.4 + g0.L * 0.18;
    const field = f => (ctx, g, b, ov) => {
      const hr = Math.max(size * 0.075, 3, g.T / 120), n = Math.ceil(g.T / hr);
      for (let k = f; k < n; k += 2) rectUV(ctx, g, g.U0 - g.big, g.V0 + k * hr - (k < 2 ? g.big : 0), g.U1 + g.big, g.V0 + (k + 1) * hr + ov * 0.5 + (k >= n - 2 ? g.big : 0));
    };
    parts(it, [
      { fixed: true, clip: field(0), du: -dir * D * (1 - oQuart(p / 0.66)), a: clamp(p * 6) },
      { fixed: true, clip: field(1), du: dir * D * (1 - oQuart((p - 0.3) / 0.7)), a: clamp((p - 0.3) * 6) },
    ]);
  },
});

/* 三段ずれ — cut into three tiers that arrive one after another from the same side and spring back and forth into line */
reg('xfThreeTier', {
  name: '三段ずれ', en: 'Three-Tier Slip', tags: ['pop', 'graphic', 'glitch'], w: 1.1, ae: 'slice',
  inDur: dur => clamp(dur * 0.45, 0.2, 0.8),
  apply(env, it, p) {
    const size = it.size, dir = dirOf(env, 411), D = size * 1.7, list = [];
    for (let k = 0; k < 3; k++) {
      const q = stg(p, k / 2, 0.3);
      list.push({
        clip: (ctx, g, b, ov) => rectUV(ctx, g, g.U0 - g.big, k ? g.V0 + k * g.T / 3 : g.V0 - g.big, g.U1 + g.big, k < 2 ? g.V0 + (k + 1) * g.T / 3 + ov : g.V1 + g.big),
        du: dir * D * spring(q, 3.4, 2.5), a: clamp(q * 5),
      });
    }
    parts(it, list);
  },
});

/* 帯の並べ替え — the line is cut into vertical strips standing in the wrong order; they hop over each other into place */
reg('xfStripSort', {
  name: '帯の並べ替え', en: 'Strip Sort', tags: ['pop', 'graphic', 'glitch'], w: 0.9, ae: 'slice', minDur: 0.5,
  inDur: dur => clamp(dur * 0.5, 0.25, 0.9),
  apply(env, it, p) {
    const size = it.size, seed = env.cut.seed | 0, g0 = uv(it, box(it)), N = clamp(Math.round(g0.L / (size * 0.95)), 3, 7), w = g0.L / N;
    // slot[k] = where strip k stands at the start (a rotation plus a swap: never the right order)
    const sh = 1 + (J.h(seed, 421) % (N - 1)), slot = []; for (let k = 0; k < N; k++) slot.push((k + sh) % N);
    const sw = J.h(seed, 422) % (N - 1); [slot[sw], slot[sw + 1]] = [slot[sw + 1], slot[sw]];
    const list = [];
    for (let k = 0; k < N; k++) {
      const q = stg(p, k / (N - 1), 0.4), e = ioCubic(q);
      list.push({
        clip: (ctx, g, b, ov) => rectUV(ctx, g, g.U0 + k * w - (k ? 0 : g.big), g.V0 - g.big, g.U0 + (k + 1) * w + (k < N - 1 ? ov : g.big), g.V1 + g.big),
        du: (slot[k] - k) * w * (1 - e), dv: -Math.sin(PI * q) * size * 0.5 * (k % 2 ? 1 : -1), a: clamp(p * 7),
      });
    }
    parts(it, list);
  },
});

/* イコライザ — columns of the line shoot up from behind a floor line to different beats, overshoot and settle */
reg('xfEqualizer', {
  name: 'イコライザ', en: 'Equalizer', tags: ['pop', 'graphic', 'glitch'], w: 1, ae: 'slice',
  inDur: dur => clamp(dur * 0.45, 0.2, 0.8),
  apply(env, it, p) {
    const size = it.size, seed = env.cut.seed | 0, g0 = uv(it, box(it)), N = clamp(Math.round(g0.L / (size * 0.5)), 4, 14), w = g0.L / N, list = [];
    for (let k = 0; k < N; k++) {
      const q = stg(p, J.r(seed, k, 431), 0.5);
      list.push({
        fixed: true, a: q > 0 ? 1 : 0,
        clip: (ctx, g, b, ov) => rectUV(ctx, g, g.U0 + k * w - (k ? 0 : g.big), g.V0 - g.big, g.U0 + (k + 1) * w + (k < N - 1 ? ov : g.big), g.V1),
        dv: (g0.T + size * 0.1) * (1 - E.outBack(q, 1.5)),
      });
    }
    parts(it, list);
    if (!isMain(it, env)) return;
    postLocal(it, (env2, b, x, A) => {
      const g = uv(x, b), t = lineW(x), hl = g.L / 2 * oQuart(p / 0.2), a = A * (1 - sstep(0.8, 1, p));
      eRect(env2, g, g.uc - hl, g.V1 - t / 2, g.uc + hl, g.V1 + t / 2, hotOf(env2, x), a);
    });
  },
});

/* 斜め帯合わせ — the line is cut into slanted strips that slide along their own slant, alternately down and up, into register */
reg('xfDiagStrips', {
  name: '斜め帯合わせ', en: 'Diagonal Strips', tags: ['graphic', 'pop', 'editorial'], w: 1, ae: 'slice',
  inDur: dur => clamp(dur * 0.45, 0.2, 0.8),
  apply(env, it, p) {
    const size = it.size, k = 0.6 * dirOf(env, 441), g0 = uv(it, box(it)), ak = Math.abs(k) * g0.T / 2;
    const lo = g0.U0 - ak, hi = g0.U1 + ak, N = clamp(Math.round((hi - lo) / (size * 1.15)), 3, 7), sw = (hi - lo) / N;
    const nrm = Math.hypot(k, 1), D = g0.T + size * 1.4, list = [];
    for (let j = 0; j < N; j++) {
      const q = stg(p, j / (N - 1), 0.42), e = oQuint(q), sg = j % 2 ? 1 : -1;
      list.push({
        clip: (ctx, g, b, ov) => {
          const a = j ? lo + j * sw : lo - g.big, z = j < N - 1 ? lo + (j + 1) * sw + ov : hi + g.big, Y = g.big;
          polyUV(ctx, g, [[a - k * Y, g.vc - Y], [z - k * Y, g.vc - Y], [z + k * Y, g.vc + Y], [a + k * Y, g.vc + Y]]);
        },
        du: sg * k / nrm * D * (1 - e), dv: sg / nrm * D * (1 - e), a: clamp(q * 4),
      });
    }
    parts(it, list);
  },
});

/* ダイヤル合わせ — the line is cut into concentric rings turned out of place; they rotate back like a combination lock, inner ring first */
reg('xfRingDial', {
  name: 'ダイヤル合わせ', en: 'Ring Dial', tags: ['graphic', 'glitch', 'pop'], w: 0.8, ae: 'spin', minDur: 0.5,
  inDur: dur => clamp(dur * 0.5, 0.25, 0.9),
  apply(env, it, p) {
    const size = it.size, n = 4, dir = dirOf(env, 451), b0 = box(it), Rm = Math.hypot(b0.w, b0.h) / 2 + size * 0.15, list = [];
    for (let j = 0; j < n; j++) {
      const q = stg(p, j / (n - 1), 0.4);
      list.push({
        fixed: true, rot: dir * (j % 2 ? -1 : 1) * (52 - 9 * j) * (1 - oQuint(q)), a: clamp(q * 4),
        clip: (ctx, g, b, ov) => {
          const r1 = j < n - 1 ? Rm * (j + 1) / n + ov : g.big, r0 = Rm * j / n;
          ctx.moveTo(b.cx + r1, b.cy); ctx.arc(b.cx, b.cy, r1, 0, TAU);
          if (j) { ctx.moveTo(b.cx + r0, b.cy); ctx.arc(b.cx, b.cy, r0, 0, TAU, true); }
        },
      });
    }
    parts(it, list);
    if (!isMain(it, env)) return;
    postLocal(it, (env2, b, x, A) => {
      const a = A * 0.5 * clamp(p * 8) * (1 - sstep(0.6, 0.95, p)); if (a <= 0.01) return;
      for (let j = 1; j < n; j++) env2.circle(b.cx, b.cy, Rm * j / n, null, hotOf(env2, x), lineW(x) * 0.5, a, false);
    });
  },
});

/* 積み帯 — the line is built like a wall: the lowest strip drops in and bounces, then the next lands on top of it, and so on */
reg('xfStackStrips', {
  name: '積み帯', en: 'Stacked Strips', tags: ['pop', 'graphic'], w: 0.9, ae: 'drop', minDur: 0.5,
  inDur: dur => clamp(dur * 0.5, 0.25, 0.9),
  apply(env, it, p) {
    const size = it.size, N = 4, g0 = uv(it, box(it)), h = g0.T / N, list = [];
    for (let k = 0; k < N; k++) {
      const q = stg(p, (N - 1 - k) / (N - 1), 0.5);
      list.push({
        clip: (ctx, g, b, ov) => rectUV(ctx, g, g.U0 - g.big, k ? g.V0 + k * h : g.V0 - g.big, g.U1 + g.big, k < N - 1 ? g.V0 + (k + 1) * h + ov : g.V1 + g.big),
        dv: -(g0.T + size * 0.9) * (1 - bounce(q)), a: clamp(q * 8),
      });
    }
    parts(it, list);
  },
});

/* =====================================================================
   C. PLATES & BARS
   ===================================================================== */

/* 下線が掃く — an underline is drawn, lifts through the line uncovering what it has passed, and retracts as an overline */
reg('xfUnderSweep', {
  name: '下線が掃く', en: 'Underline Sweep', tags: ['editorial', 'calm', 'graphic', 'emotional'], w: 1.2, ae: 'wipe', minDur: 0.5,
  inDur: dur => clamp(dur * 0.45, 0.22, 0.8),
  apply(env, it, p) {
    const dir = dirOf(env, 501), grow = oQuart(p / 0.2), lift = ioCubic((p - 0.12) / 0.7), away = E.inCubic(clamp((p - 0.82) / 0.18));
    const main = isMain(it, env), lf = main ? lift : ioCubic(p);
    const barV = g => lerp(g.V1, g.V0, lf);
    clipLocal(it, (ctx, b) => { const g = uv(it, b); if (lf > 0) rectUV(ctx, g, g.U0 - g.big, barV(g), g.U1 + g.big, g.V1 + g.big); });
    if (!main) return;
    postLocal(it, (env2, b, x, A) => {
      const g = uv(x, b), t = Math.max(3, x.size * 0.055), v = barV(g);
      const s0 = g.L * away, s1 = g.L * grow; if (s1 - s0 < 0.5) return;
      eRect(env2, g, dir > 0 ? g.U0 + s0 : g.U1 - s1, v - t / 2, dir > 0 ? g.U0 + s1 : g.U1 - s0, v + t / 2, hotOf(env2, x), A);
    });
  },
});

/* テープ剥がし — three strips of tape are slapped over the line, then peeled away one by one to show what is under them */
reg('xfTapeOff', {
  name: 'テープ剥がし', en: 'Tape Off', tags: ['pop', 'graphic', 'editorial'], w: 0.9, ae: 'wipe', minDur: 0.6,
  inDur: dur => clamp(dur * 0.55, 0.3, 1.0),
  apply(env, it, p) {
    const size = it.size, seed = env.cut.seed | 0, first = dirOf(env, 511), main = isMain(it, env);
    const tapes = b => {
      const g = uv(it, b, size * 0.14), ex = size * 0.07, out = [];
      for (let k = 0; k < 3; k++) {
        const d = (k % 2 ? -1 : 1) * first, lay = oQuart(clamp((p - k * 0.05) / 0.18)), off = ioCubic(clamp((p - 0.3 - k * 0.13) / 0.42));
        // s = distance from the end the tape was laid from; the tape covers [s0, s1]
        const s0 = (g.L + ex * 2) * off, s1 = (g.L + ex * 2) * lay;
        out.push({ d, lay, off, s0, s1, v0: g.V0 + k * g.T / 3, v1: g.V0 + (k + 1) * g.T / 3, tilt: J.rs(seed, k, 512) * ex * 0.7, u: s => (d > 0 ? g.U0 - ex + s : g.U1 + ex - s) });
      }
      return { g, ex, out };
    };
    clipLocal(it, (ctx, b) => {
      const G = tapes(b), g = G.g;
      for (const t of G.out) {
        const lay = main ? t.lay : ioCubic(p); if (lay <= 0) continue;
        const e = lay >= 1 ? g.big : (g.L + G.ex * 2) * lay - 2;
        rectUV(ctx, g, Math.min(t.u(-g.big), t.u(e)), t.v0 - (t.v0 === g.V0 ? g.big : 0.4), Math.max(t.u(-g.big), t.u(e)), t.v1 + (t.v1 >= g.V1 - 0.01 ? g.big : 0.4));
      }
    });
    if (!main) return;
    postLocal(it, (env2, b, x, A) => {
      const G = tapes(b), g = G.g, cols = [hotOf(env2, x), pick(env2.sc.accent2, env2.sc.sub, env2.sc.fg), hotOf(env2, x)];
      for (let k = 0; k < 3; k++) {
        const t = G.out[k]; if (t.s1 - t.s0 < 0.5) continue;
        const tv = s => t.tilt * (s / (g.L / 2 + G.ex) - 1);
        ePoly(env2, g, [[t.u(t.s0), t.v0 - G.ex + tv(t.s0)], [t.u(t.s1), t.v0 - G.ex + tv(t.s1)], [t.u(t.s1), t.v1 + G.ex + tv(t.s1)], [t.u(t.s0), t.v1 + G.ex + tv(t.s0)]], cols[k], A);
      }
    });
  },
});

/* スキャナ — a light bar passes down the line leaving only a hairline outline, then comes back up and fills it in */
reg('xfScanner', {
  name: 'スキャナ', en: 'Scanner', tags: ['glitch', 'editorial', 'calm', 'graphic'], w: 1, ae: 'wipe', minDur: 0.7,
  inDur: dur => clamp(dur * 0.55, 0.32, 1.0),
  apply(env, it, p) {
    const size = it.size, down = ioCubic(p / 0.46), up = ioCubic((p - 0.52) / 0.48), main = isMain(it, env);
    const barV = g => (p < 0.5 ? lerp(g.V0, g.V1, down) : lerp(g.V1, g.V0, up));
    clipLocal(it, (ctx, b) => { const g = uv(it, b); if (!main) { rectUV(ctx, g, g.U0 - g.big, g.V0 - g.big, g.U1 + g.big, lerp(g.V0, g.V1, ioCubic(p))); return; } if (up > 0) rectUV(ctx, g, g.U0 - g.big, barV(g), g.U1 + g.big, g.V1 + g.big); });
    if (!main) return;
    addPre(it, (env2, x) => {
      const ctx = env2.ctx, b = box(x), g = uv(x, b);
      ctx.save(); ctx.beginPath(); ctx.save(); toLocal(ctx, x); ctx.rect(0, 0, 0, 0); rectUV(ctx, g, g.U0 - g.big, g.V0 - g.big, g.U1 + g.big, barV(g)); ctx.restore(); ctx.clip();
      copyDraw(env2, x, Object.assign(OUTLINE(x, 0.02), { alpha: (x.alpha ?? 1) * 0.8 }));
      ctx.restore();
    });
    postLocal(it, (env2, b, x, A) => {
      const g = uv(x, b), v = barV(g), t = lineW(x), a = A * clamp(p * 14) * (1 - sstep(0.9, 1, p)), col = hotOf(env2, x), tail = size * 0.22 * (p < 0.5 ? -1 : 1);
      eRect(env2, g, g.U0 - size * 0.2, v - t / 2, g.U1 + size * 0.2, v + t / 2, col, a);
      eRect(env2, g, g.U0 - size * 0.2, Math.min(v, v + tail), g.U1 + size * 0.2, Math.max(v, v + tail), col, a * 0.18);
    });
  },
});

/* 巻き上げシャッター — a slatted shutter rattles down over the line, then rolls up and uncovers it from the bottom */
reg('xfRollerShutter', {
  name: '巻き上げ', en: 'Roller Shutter', tags: ['graphic', 'pop', 'editorial'], w: 0.9, ae: 'wipe', minDur: 0.6,
  inDur: dur => clamp(dur * 0.55, 0.3, 1.0),
  apply(env, it, p) {
    const size = it.size, main = isMain(it, env), drop = oCubic(p / 0.2), rise = ioCubic((p - 0.3) / 0.7);
    const edge = g => (p < 0.3 ? lerp(g.V0, g.V1, drop) : lerp(g.V1, g.V0, rise));
    clipLocal(it, (ctx, b) => {
      const g = uv(it, b);
      if (!main) { rectUV(ctx, g, g.U0 - g.big, lerp(g.V1, g.V0, ioCubic(p)), g.U1 + g.big, g.V1 + g.big); return; }
      if (p < 0.3) rectUV(ctx, g, g.U0, g.V0, g.U1, edge(g) - 2); else rectUV(ctx, g, g.U0 - g.big, g.V0 - g.big, g.U1 + g.big, g.V1 + g.big);
    });
    if (!main) return;
    postLocal(it, (env2, b, x, A) => {
      const g = uv(x, b), v = edge(g), m = size * 0.1; if (v - g.V0 < 0.5) return;
      const col = hotOf(env2, x), bg = pick(env2.sc.bg), pitch = Math.max(size * 0.2, g.T / 14), t = Math.max(1.5, size * 0.018);
      eRect(env2, g, g.U0 - m, g.V0 - 1, g.U1 + m, v, col, A);
      for (let j = 1; j < 16; j++) { const y = v - j * pitch; if (y <= g.V0) break; eRect(env2, g, g.U0 - m, y - t / 2, g.U1 + m, y + t / 2, bg, A * 0.4); }
      eRect(env2, g, g.U0 - m * 1.6, v - Math.min(v - g.V0, size * 0.09), g.U1 + m * 1.6, v, pick(env2.sc.fg), A);
    });
  },
});

/* =====================================================================
   D. OUTLINE FIRST
   ===================================================================== */

/* 輪郭が先行 — two wipes chase each other along the line: the first leaves only outlines, the second fills them in */
reg('xfOutlineLead', {
  name: '輪郭が先行', en: 'Outline Leads', tags: ['editorial', 'graphic', 'calm', 'emotional'], w: 1.1, ae: 'wipe', minDur: 0.5,
  inDur: dur => clamp(dur * 0.48, 0.24, 0.85),
  apply(env, it, p) {
    const dir = dirOf(env, 601), main = isMain(it, env), e1 = ioCubic(p / 0.7), e2 = main ? ioCubic((p - 0.3) / 0.7) : ioCubic(p);
    const span = (g, a, z) => [dir > 0 ? g.U0 + a : g.U1 - z, dir > 0 ? g.U0 + z : g.U1 - a];
    clipLocal(it, (ctx, b) => { const g = uv(it, b); if (e2 <= 0) return; const s = span(g, -g.big, g.L * e2); rectUV(ctx, g, s[0], g.V0 - g.big, s[1], g.V1 + g.big); });
    if (!main) return;
    addPre(it, (env2, x) => {
      if (e1 <= 0 || e2 >= 1) return;
      const ctx = env2.ctx, b = box(x), g = uv(x, b), s = span(g, g.L * e2 - 0.5, e1 >= 1 ? g.big : g.L * e1);
      ctx.save(); ctx.beginPath(); ctx.save(); toLocal(ctx, x); ctx.rect(0, 0, 0, 0); rectUV(ctx, g, s[0], g.V0 - g.big, s[1], g.V1 + g.big); ctx.restore(); ctx.clip();
      copyDraw(env2, x, OUTLINE(x));
      ctx.restore();
    });
    postLocal(it, (env2, b, x, A) => {
      const g = uv(x, b), t = Math.max(3, x.size * 0.05) / 2, col = hotOf(env2, x);
      if (e1 > 0 && e1 < 1) { const u = dir > 0 ? g.U0 + g.L * e1 : g.U1 - g.L * e1; eRect(env2, g, u - t * 0.5, g.V0, u + t * 0.5, g.V1, col, A * 0.7); }
      if (e2 > 0 && e2 < 1) { const u = dir > 0 ? g.U0 + g.L * e2 : g.U1 - g.L * e2; eRect(env2, g, u - t, g.V0, u + t, g.V1, col, A); }
    });
  },
});

/* なぞって流す — the outlines are traced on first, then a slanted flood of colour runs through and fills them */
reg('xfTraceFlood', {
  name: 'なぞって流す', en: 'Trace and Flood', tags: ['emotional', 'calm', 'editorial', 'pop'], w: 0.9, ae: 'wipe', minDur: 0.8,
  inDur: dur => clamp(dur * 0.55, 0.35, 1.05),
  apply(env, it, p) {
    const size = it.size, dir = dirOf(env, 611), k = 0.5;
    if (!isMain(it, env)) { it.dash = E.outQuad(p); if (it.fill !== false) it.fillAlpha = (it.fillAlpha ?? 1) * sstep(0.5, 1, p); return; }
    const d = E.outQuad(clamp(p / 0.58)), fl = ioCubic((p - 0.46) / 0.54), oa = 1 - sstep(0.84, 1, p);
    const geo = b => { const g = uv(it, b), hv = g.T / 2; return { g, hv, s: -k * hv + (g.L + 2 * k * hv + 1) * fl, u: s => (dir > 0 ? g.U0 + s : g.U1 - s) }; };
    clipLocal(it, (ctx, b) => {
      const G = geo(b), g = G.g; if (fl <= 0) return;
      polyUV(ctx, g, [[G.u(-g.big), g.V0], [G.u(G.s + k * G.hv), g.V0], [G.u(G.s - k * G.hv), g.V1], [G.u(-g.big), g.V1]]);
    });
    addPre(it, (env2, x) => { if (oa > 0.01) copyDraw(env2, x, Object.assign(OUTLINE(x, 0.022), { dash: d < 1 ? d : null, alpha: (x.alpha ?? 1) * oa })); });
    postLocal(it, (env2, b, x, A) => {
      if (fl <= 0 || fl >= 1) return;
      const G = geo(b), g = G.g, w = size * 0.09;
      ePoly(env2, g, [[G.u(G.s + k * G.hv), g.V0], [G.u(G.s + k * G.hv + w), g.V0], [G.u(G.s - k * G.hv + w), g.V1], [G.u(G.s - k * G.hv), g.V1]], hotOf(env2, x), A * Math.min(1, fl * 8, (1 - fl) * 8));
    });
  },
});
})();
