/* ============================================================
   JIZURA — motion recipes: entrances / holds / exits
   Each recipe mutates a text item: it.size/sx/alpha/blur/clip/bands,
   and pushes per-glyph (charFns) or per-piece (pieceFns) functions.
   ============================================================ */
(() => {
'use strict';
const E = J.E;

const SCRAMBLE_POOL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%&*+-=/\\<>?.,:;_~^';

/* bands helper: horizontal slices covering the item's vertical extent */
J.itemBands = (env, it, n, dxFn) => {
  const m = it._m || (it._m = J.measure(it));
  const h = Math.max(m.h, it.size) * 1.25 + 20, y0 = it.y - h / 2;
  const cuts = [0];
  for (let i = 1; i < n; i++) cuts.push(J.r(it.seed | 0, n, i, 3));
  cuts.push(1); cuts.sort((a, b) => a - b);
  const out = [];
  for (let i = 0; i < cuts.length - 1; i++) out.push([y0 + cuts[i] * h, y0 + cuts[i + 1] * h, dxFn(i, cuts.length - 1)]);
  return out;
};

/* vertical slices covering the item's horizontal extent: [[x0, x1, dy], ...] */
J.itemVBands = (env, it, n, dyFn) => {
  const m = it._m || (it._m = J.measure(it));
  const w = Math.max(m.w, it.size) * 1.1 + 20;
  const x0 = it.align === 'left' ? it.x - 10 : it.align === 'right' ? it.x - w + 10 : it.x - w / 2;
  const out = [];
  for (let i = 0; i < n; i++) out.push([x0 + i * w / n, x0 + (i + 1) * w / n + 0.5, dyFn(i, n)]);
  return out;
};
/* the item's bounding box in design space (before rotation) */
J.itemBox = (it) => {
  const m = it._m || (it._m = J.measure(it));
  const x0 = it.vertical ? it.x - m.w / 2 : it.align === 'left' ? it.x : it.align === 'right' ? it.x - m.w : it.x - m.w / 2;
  const y0 = it.vertical && it.align === 'left' ? it.y : it.y - m.h / 2;
  return { x0, y0, x1: x0 + m.w, y1: y0 + m.h, w: m.w, h: m.h, cx: x0 + m.w / 2, cy: y0 + m.h / 2 };
};

/* ---------------- ENTRANCES ---------------- */
J.ENTER = {
  cut: { name: 'カット', nameEn: 'Cut', apply() {} },

  assemble: {
    name: '分解→集合', nameEn: 'Assemble from pieces', pieces: true,
    apply(env, it, p, ctx) {
      const dur = ctx.inDur, lt = env.lt - (it.delay || 0);
      const spread = it.size * 3.2 * (0.6 + env.fx.motion * 0.7), seed = it.seed | 0;
      it.pieceFns.push((ci, pj, pc, ox, oy) => {
        const d = J.r(seed, ci, pj, 1) * dur * 0.45;
        const x = (lt - d) / (dur * 0.62);
        if (x < 0) return null;
        const e = E.outExpo(x), k = 1 - e;
        if (k <= 0.0005) return J.PID;
        const ang = J.r(seed, ci, pj, 2) * J.TAU;
        const dist = spread * (0.35 + 0.65 * J.r(seed, ci, pj, 3));
        const sp = (e - E.outExpo(x - 1 / (env.fps * dur * 0.62))) * dist;
        return J.PT(Math.cos(ang) * dist * k, Math.sin(ang) * dist * k, J.rs(seed, ci, pj, 4) * 190 * k,
          1 + (J.lerp(0.4, 2.1, J.r(seed, ci, pj, 5)) - 1) * k, 1 + Math.min(2.0, sp * 0.02), ang / J.DEG, 1);
      });
    },
  },

  slice: {
    name: 'スライス', nameEn: 'Slice',
    apply(env, it, p) {
      const W = env.W;
      it.bands = J.itemBands(env, it, 7, (i) => (1 - E.outExpo(p * 1.2 - 0.05 * i)) * (i % 2 ? 1 : -1) * W * 0.9);
    },
  },

  type: {
    name: 'タイプ', nameEn: 'Type', cursor: true,
    apply(env, it, p, ctx) {
      const n = (it._m || (it._m = J.measure(it))).lay.N;
      const k = Math.floor(p * (n + 0.999));
      it.charFns.push((i) => (i >= k ? { hide: true } : null));
      it.cursorAt = p < 1 ? k : -1;
    },
  },

  pop: {
    name: 'ポップ', nameEn: 'Pop',
    apply(env, it, p) {
      const seed = it.seed | 0;
      it.charFns.push((i, g, n) => {
        const d = n > 1 ? (i / (n - 1)) * 0.45 : 0;
        const q = J.clamp((p - d) / 0.55);
        if (q <= 0) return { hide: true };
        return { s: E.outBack(q, 2.6), rot: (1 - E.outCubic(q)) * J.rs(seed, i, 9) * 28 };
      });
    },
  },

  drop: {
    name: '落下', nameEn: 'Drop',
    apply(env, it, p) {
      const size = it.size, seed = it.seed | 0;
      it.charFns.push((i, g, n) => {
        const d = n > 1 ? (J.r(seed, i, 4) * 0.5) : 0;
        const q = J.clamp((p - d) / 0.5);
        if (q <= 0) return { hide: true };
        const b = bounce(q);
        return { dy: -(1 - b) * size * 2.4, sy: 1 + (1 - q) * 0.5, sx: 1 - (1 - q) * 0.2 };
      });
    },
  },

  stretch: {
    name: '伸縮', nameEn: 'Stretch',
    apply(env, it, p) {
      const e = E.outExpo(p);
      it.sx = (it.sx || 1) * J.lerp(4.2, 1, e);
      it.streak = { n: 4, dx: it.size * 0.55 * (1 - e), a: 0.3 * (1 - e) };
    },
  },

  wipe: {
    name: 'ワイプ', nameEn: 'Wipe', bar: true,
    apply(env, it, p) {
      const e = E.inOutExpo(p);
      const m = it._m || (it._m = J.measure(it));
      const x0 = it.x - m.w / 2 - it.size * 0.2, x1 = it.x + m.w / 2 + it.size * 0.2;
      const dir = (it.seed | 0) % 2 ? 1 : -1;
      const edge = dir > 0 ? J.lerp(x0, x1, e) : J.lerp(x1, x0, e);
      it.clip = dir > 0 ? [x0 - 4000, edge] : [edge, x1 + 4000];
      it.wipeBar = p < 1 ? { x: edge, h: m.h * 1.3 + it.size * 0.2 } : null;
    },
  },

  blur: {
    name: 'ブラー', nameEn: 'Blur',
    apply(env, it, p) {
      const e = E.outCubic(p);
      it.blur = (it.blur || 0) + (1 - e) * 26;
      it.alpha = (it.alpha ?? 1) * Math.pow(e, 0.7);
      it.size *= 1 + 0.18 * (1 - e);
      it.spacing = (1 - e);
      const tr = it.track || 0; it.track = tr + (1 - e) * 0.5;
    },
  },

  spin: {
    name: '回転', nameEn: 'Spin',
    apply(env, it, p) {
      const seed = it.seed | 0;
      it.charFns.push((i, g, n) => {
        const d = n > 1 ? (i / (n - 1)) * 0.4 : 0;
        const q = J.clamp((p - d) / 0.6);
        if (q <= 0) return { hide: true };
        const e = E.outExpo(q);
        return { rot: (1 - e) * (J.r(seed, i) > 0.5 ? 1 : -1) * 200, s: J.lerp(0.15, 1, e), a: Math.min(1, q * 3) };
      });
    },
  },

  flicker: {
    name: '点滅', nameEn: 'Blink',
    apply(env, it, p) {
      const seed = it.seed | 0, step = env.step;
      it.charFns.push((i) => (p >= 1 ? null : (J.r(seed, step, i) < p * 1.25 ? null : { hide: true })));
    },
  },

  scramble: {
    name: 'スクランブル', nameEn: 'Scramble',
    apply(env, it, p) {
      const seed = it.seed | 0, step = env.step;
      it.charFns.push((i, g, n) => {
        const settle = 0.25 + 0.75 * (n > 1 ? i / (n - 1) : 1);
        if (p >= settle) return null;
        if (p < settle * 0.25 && J.r(seed, i, step, 2) < 0.5) return { hide: true };
        const ch = SCRAMBLE_POOL[Math.floor(J.r(seed, i, step) * SCRAMBLE_POOL.length)];
        return { ch, a: 0.85 };
      });
    },
  },

  zoom: {
    name: 'ズーム', nameEn: 'Zoom',
    apply(env, it, p) {
      const e = E.outExpo(p);
      it.size *= J.lerp(1.7, 1, e);
      it.blur = (it.blur || 0) + (1 - e) * 14;
      it.alpha = (it.alpha ?? 1) * Math.min(1, p * 4);
    },
  },
};
function bounce(x) {
  const n1 = 7.5625, d1 = 2.75;
  if (x < 1 / d1) return n1 * x * x;
  if (x < 2 / d1) return n1 * (x -= 1.5 / d1) * x + 0.75;
  if (x < 2.5 / d1) return n1 * (x -= 2.25 / d1) * x + 0.9375;
  return n1 * (x -= 2.625 / d1) * x + 0.984375;
}

/* ---------------- HOLDS (whole cut; amplitude eased in) ---------------- */
J.HOLD = {
  still: { name: '静止', nameEn: 'Still', apply() {} },
  jitter: {
    name: 'ジッター', nameEn: 'Jitter',
    apply(env, it, amt) {
      const seed = it.seed | 0, step = env.step, a = it.size * 0.025 * amt * env.fx.motion;
      if (a < 0.2) return;
      it.charFns.push((i) => ({ dx: J.rs(seed, step, i, 1) * a, dy: J.rs(seed, step, i, 2) * a, rot: J.rs(seed, step, i, 3) * 4 * amt }));
    },
  },
  drift: {
    name: 'ドリフト', nameEn: 'Drift',
    apply(env, it, amt, ctx) {
      const u = env.lt / Math.max(0.3, ctx.dur);
      const dir = (it.seed | 0) % 2 ? 1 : -1;
      it.x += dir * (u - 0.5) * env.W * 0.035 * env.fx.motion;
      it.size *= 1 + 0.05 * u * env.fx.motion;
    },
  },
  breathe: {
    name: '呼吸', nameEn: 'Breath',
    apply(env, it, amt) {
      it.size *= 1 + 0.035 * Math.sin(env.lt * J.TAU * 0.9) * amt;
      it.track = (it.track || 0) + 0.03 * Math.sin(env.lt * J.TAU * 0.6) * amt;
    },
  },
  wave: {
    name: 'ウェーブ', nameEn: 'Wave',
    apply(env, it, amt) {
      const size = it.size, t = env.lt;
      it.charFns.push((i) => ({ dy: Math.sin(t * 7 + i * 0.75) * size * 0.07 * amt, rot: Math.cos(t * 7 + i * 0.75) * 5 * amt }));
    },
  },
  glitchtick: {
    name: 'グリッチ', nameEn: 'Glitch',
    apply(env, it, amt) {
      const seed = it.seed | 0, step = env.step;
      if (J.r(seed, step, 77) < 0.22 * env.fx.glitch * amt + 0.02) {
        it.bands = J.itemBands(env, it, 6, (i) => (J.r(seed, step, i, 5) < 0.6 ? J.rs(seed, step, i, 6) * it.size * 0.35 : 0));
      }
    },
  },
};

/* ---------------- EXITS ---------------- */
J.EXIT = {
  cut: { name: 'カット', nameEn: 'Cut', apply() {} },

  explode: {
    name: '爆散', nameEn: 'Burst', pieces: true, shatter: true,
    apply(env, it, p, ctx) {
      const seed = it.seed | 0, dur = ctx.outDur, lt = env.lt - (ctx.dur - ctx.outDur);
      const spread = Math.max(env.W, env.H) * 0.9 * (0.5 + env.fx.motion * 0.6);
      it.shatter = true;
      it.pieceFns.push((ci, pj, pc, ox, oy) => {
        const d = J.r(seed, ci, pj, 11) * dur * 0.3;
        const x = (lt - d) / (dur * 0.7);
        if (x <= 0) return J.PID;
        if (x >= 1) return null;
        const e = E.inCubic(x);
        const ang = Math.atan2(oy + 0.01, ox + 0.01) + J.rs(seed, ci, pj, 12) * 1.1;
        const dist = spread * (0.35 + 0.65 * J.r(seed, ci, pj, 13));
        const sp = (e - E.inCubic(x - 1 / (env.fps * dur * 0.7))) * dist;
        return J.PT(Math.cos(ang) * dist * e, Math.sin(ang) * dist * e, J.rs(seed, ci, pj, 14) * 260 * e, 1 + J.rs(seed, ci, pj, 15) * 0.6 * e,
          1 + Math.min(2.4, sp * 0.012), ang / J.DEG, 1 - x * x * x);
      });
    },
  },

  fall: {
    name: '崩落', nameEn: 'Collapse', pieces: true, shatter: true,
    apply(env, it, p, ctx) {
      const seed = it.seed | 0, lt = env.lt - (ctx.dur - ctx.outDur), g = env.H * 5.5;
      it.shatter = true;
      it.charFns.push(() => null);
      it.pieceFns.push((ci, pj) => {
        const x = lt - J.r(seed, ci, pj, 21) * ctx.outDur * 0.4;
        if (x <= 0) {
          const tr = lt > -0.25 ? 1 : 0;           // tremble just before collapse
          return tr ? J.PT(J.rs(seed, env.step, ci, pj) * it.size * 0.012, 0) : J.PID;
        }
        const v = g * x;
        return J.PT(J.rs(seed, ci, pj, 22) * env.W * 0.03 * x, 0.5 * g * x * x, J.rs(seed, ci, pj, 23) * 200 * x, 1, 1 + Math.min(2.2, v * 0.0012), 90, 1);
      });
    },
  },

  drift: {
    name: '霧散', nameEn: 'Dissipate', pieces: true, shatter: true,
    apply(env, it, p, ctx) {
      const seed = it.seed | 0, dur = ctx.outDur, lt = env.lt - (ctx.dur - ctx.outDur), dist0 = it.size * 1.6;
      it.shatter = true;
      it.pieceFns.push((ci, pj) => {
        const x = (lt - J.r(seed, ci, pj, 31) * dur * 0.3) / (dur * 0.7);
        if (x <= 0) return J.PID;
        if (x >= 1) return null;
        const e = E.inQuad(x), ang = J.r(seed, ci, pj, 32) * J.TAU, dd = dist0 * (0.3 + 0.7 * J.r(seed, ci, pj, 33));
        return J.PT(Math.cos(ang) * dd * e, Math.sin(ang) * dd * e - it.size * 0.3 * e, J.rs(seed, ci, pj, 34) * 80 * e, 1 - 0.35 * e, 1 + e * 0.8, ang / J.DEG, 1 - e * e);
      });
    },
  },

  slice: {
    name: 'スライス退場', nameEn: 'Slice Out',
    apply(env, it, p) {
      const e = E.inExpo(p);
      it.bands = J.itemBands(env, it, 7, (i) => e * (i % 2 ? -1 : 1) * env.W * 1.1 * (0.6 + 0.4 * J.r(it.seed | 0, i, 41)));
    },
  },

  wipe: {
    name: 'ワイプ退場', nameEn: 'Wipe Out', bar: true,
    apply(env, it, p) {
      const e = E.inOutExpo(p);
      const m = it._m || (it._m = J.measure(it));
      const x0 = it.x - m.w / 2 - it.size * 0.2, x1 = it.x + m.w / 2 + it.size * 0.2;
      const edge = J.lerp(x0, x1, e);
      it.clip = [edge, x1 + 4000];
      it.wipeBar = p > 0 && p < 1 ? { x: edge, h: m.h * 1.3 + it.size * 0.2 } : null;
    },
  },

  shrink: {
    name: '収縮', nameEn: 'Contract',
    apply(env, it, p) {
      const e = E.inCubic(p);
      it.size *= 1 - e * 0.96;
      it.alpha = (it.alpha ?? 1) * (1 - e * e);
      it.track = (it.track || 0) - e * 0.2;
    },
  },

  blur: {
    name: 'ブラー退場', nameEn: 'Blur Out',
    apply(env, it, p) {
      const e = E.inQuad(p);
      it.blur = (it.blur || 0) + e * 30;
      it.alpha = (it.alpha ?? 1) * (1 - e);
      it.size *= 1 + e * 0.2;
    },
  },

  stretch: {
    name: '伸縮退場', nameEn: 'Stretch Out',
    apply(env, it, p) {
      const e = E.inExpo(p);
      it.sx = (it.sx || 1) * J.lerp(1, 6, e);
      it.sy = (it.sy || 1) * J.lerp(1, 0.6, e);
      it.alpha = (it.alpha ?? 1) * (1 - J.smooth(0.7, 1, p));
      it.streak = { n: 3, dx: -it.size * 0.8 * e, a: 0.25 * e };
    },
  },

  scatter: {
    name: '飛散', nameEn: 'Scatter',
    apply(env, it, p) {
      const seed = it.seed | 0, W = env.W;
      it.charFns.push((i, g, n) => {
        const d = J.r(seed, i, 51) * 0.35;
        const q = J.clamp((p - d) / 0.65); if (q <= 0) return null;
        const e = E.inCubic(q), ang = J.r(seed, i, 52) * J.TAU;
        return { dx: Math.cos(ang) * W * 0.7 * e, dy: Math.sin(ang) * W * 0.45 * e, rot: J.rs(seed, i, 53) * 540 * e, s: 1 + e * 0.8, a: 1 - q * q };
      });
    },
  },

  glitch: {
    name: 'グリッチ退場', nameEn: 'Glitch Out',
    apply(env, it, p) {
      const seed = it.seed | 0, step = env.step;
      const amp = it.size * (0.3 + p * 2.2);
      it.bands = J.itemBands(env, it, 9, (i) => (J.r(seed, step, i, 61) < 0.75 ? J.rs(seed, step, i, 62) * amp : 0));
      if (p > 0.55) it.alpha = (it.alpha ?? 1) * (J.r(seed, step, 63) < 0.5 ? 0.15 : 1) * (1 - J.smooth(0.8, 1, p));
    },
  },
};

/* combine glyph / piece functions */
J.combineChar = (fns) => {
  if (!fns.length) return null;
  if (fns.length === 1) return fns[0];
  return (i, g, n) => {
    let o = null;
    for (const f of fns) {
      const r = f(i, g, n); if (!r) continue;
      if (r.hide) return r;
      if (!o) o = { dx: 0, dy: 0, rot: 0, s: 1, a: 1 };
      o.dx += r.dx || 0; o.dy += r.dy || 0; o.rot += r.rot || 0;
      if (r.s != null) o.s *= r.s; if (r.a != null) o.a *= r.a;
      if (r.sx) o.sx = (o.sx || 1) * r.sx; if (r.sy) o.sy = (o.sy || 1) * r.sy;
      if (r.ch) o.ch = r.ch; if (r.color) o.color = r.color;
      if (r.skew) o.skew = (o.skew || 0) + r.skew;
      if (r.blur) o.blur = (o.blur || 0) + r.blur;
      if (r.outline) o.outline = true;
      if (r.clipX) o.clipX = o.clipX ? [Math.max(o.clipX[0], r.clipX[0]), Math.min(o.clipX[1], r.clipX[1])] : r.clipX;
      if (r.clipY) o.clipY = o.clipY ? [Math.max(o.clipY[0], r.clipY[0]), Math.min(o.clipY[1], r.clipY[1])] : r.clipY;
    }
    return o;
  };
};
J.combinePiece = (fns) => {
  if (!fns.length) return null;
  if (fns.length === 1) return fns[0];
  return (ci, pj, pc, ox, oy, g) => {
    let o = null;
    for (const f of fns) {
      const r = f(ci, pj, pc, ox, oy, g);
      if (r === null) return null;
      if (r === J.PID) continue;
      if (!o) o = J.PT();
      o.dx += r.dx; o.dy += r.dy; o.rot += r.rot; o.s *= r.s; o.a *= r.a;
      if (r.st > o.st) { o.st = r.st; o.sdir = r.sdir; }
    }
    return o || J.PID;
  };
};
})();
