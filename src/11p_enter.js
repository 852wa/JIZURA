/* JIZURA pack: enter — 40 extra entrances (glyph masks, flips, squash & stretch, graphic wipes, glitch, neon, stamps) */
(() => {
'use strict';
const E = J.E;
const P = 'enter';
const DEG = J.DEG, TAU = J.TAU, PI = Math.PI;
const clamp = J.clamp, lerp = J.lerp;
const HIDE = Object.freeze({ hide: true });

/* ---------------- easing ---------------- */
const oQuart = x => 1 - Math.pow(1 - clamp(x), 4);
const oQuint = x => 1 - Math.pow(1 - clamp(x), 5);
const ioQuart = x => { x = clamp(x); return x < 0.5 ? 8 * x * x * x * x : 1 - Math.pow(-2 * x + 2, 4) / 2; };
const oBack = (x, s) => E.outBack(clamp(x), s);

/* ---------------- stagger ---------------- */
// k = 0..1 order fraction of a glyph, spread = share of the entrance used for staggering
const stg = (p, k, spread) => clamp((p - spread * k) / (1 - spread));
const ordLR = (i, n) => (n > 1 ? i / (n - 1) : 0);
const ordC = (i, n) => (n > 1 ? Math.abs(i - (n - 1) / 2) / ((n - 1) / 2) : 0);

const isHex = c => typeof c === 'string' && c[0] === '#' && (c.length === 7 || c.length === 4);
const colOf = it => (isHex(it.color) ? it.color : '#ffffff');
const pick = (...cs) => cs.find(isHex) || '#ffffff';
const dirOf = (env, salt) => (J.r(env.cut.seed | 0, salt, 5) < 0.5 ? -1 : 1);
const glyphN = it => [...String(it.text || '').replace(/\s/g, '')].length;

/* ---------------- per-glyph functions ----------------
   J.combineChar only merges dx/dy/rot/s/a/sx/sy/ch/color. When a hold (jitter, wave…) or a treatment
   adds its own charFn during the entrance, the extended fields (clipX/clipY/skew/blur/outline) would be
   dropped, so every item we touch re-merges its glyph functions right before drawing. */
function mergeChar(fns) {
  if (fns.length === 1) return fns[0];
  return (i, g, n) => {
    let o = null;
    for (let k = 0; k < fns.length; k++) {
      const r = fns[k](i, g, n); if (!r) continue;
      if (r.hide) return r;
      if (!o) o = { dx: 0, dy: 0, rot: 0, s: 1, a: 1 };
      o.dx += r.dx || 0; o.dy += r.dy || 0; o.rot += r.rot || 0;
      if (r.s != null) o.s *= r.s;
      if (r.a != null) o.a *= r.a;
      if (r.sx) o.sx = (o.sx || 1) * r.sx;
      if (r.sy) o.sy = (o.sy || 1) * r.sy;
      if (r.ch) o.ch = r.ch;
      if (r.color) o.color = r.color;
      if (r.skew) o.skew = (o.skew || 0) + r.skew;
      if (r.blur) o.blur = (o.blur || 0) + r.blur;
      if (r.outline) o.outline = true;
      if (r.clipX) o.clipX = o.clipX ? [Math.max(o.clipX[0], r.clipX[0]), Math.min(o.clipX[1], r.clipX[1])] : r.clipX;
      if (r.clipY) o.clipY = o.clipY ? [Math.max(o.clipY[0], r.clipY[0]), Math.min(o.clipY[1], r.clipY[1])] : r.clipY;
    }
    return o;
  };
}
function addPre(it, fn) {
  const prev = it.pre;
  it.pre = prev ? (env, x) => { prev(env, x); fn(env, x); } : fn;
}
function addPost(it, fn) {
  const prev = it.post;
  it.post = prev ? (env, x, bb) => { prev(env, x, bb); fn(env, x, bb); } : fn;
}
function glyphs(it, fn) {
  if (!it.charFns) it.charFns = [];
  it.charFns.push(fn);
  if (!it._enterFix) {
    it._enterFix = true;
    addPre(it, (env, x) => { if (x.charFns && x.charFns.length > 1) x.charFn = mergeChar(x.charFns); });
  }
  return fn;
}

/* ---------------- geometry (item-local space: origin at it.x/it.y, before rotation) ---------------- */
function box(it) {
  const m = J.measure(it);
  const x0 = it.vertical ? -m.w / 2 : it.align === 'left' ? 0 : it.align === 'right' ? -m.w : -m.w / 2;
  const y0 = it.vertical && it.align === 'left' ? 0 : -m.h / 2;
  return { x0, y0, x1: x0 + m.w, y1: y0 + m.h, w: m.w, h: m.h, cx: x0 + m.w / 2, cy: y0 + m.h / 2, lay: m.lay };
}
function toLocal(ctx, it) {
  ctx.translate(it.x, it.y);
  if (it.rot) ctx.rotate(it.rot * DEG);
  if (it.skew) ctx.transform(1, 0, Math.tan(it.skew * DEG), 1, 0, 0);
}
/* clip path built in item-local coords: fn(ctx, box, item, env) */
function clipLocal(it, fn) {
  it.clipFn = (ctx, env, x) => { const b = box(x); ctx.save(); toLocal(ctx, x); fn(ctx, b, x, env); ctx.restore(); };
}
/* graphics drawn after the item, in item-local coords: fn(env, box, item, itemAlpha) */
function postLocal(it, fn) {
  addPost(it, (env, x) => {
    const A = clamp(x.alpha ?? 1); if (A <= 0.01) return;
    const b = box(x), ctx = env.ctx; ctx.save(); toLocal(ctx, x);
    try { fn(env, b, x, A); } finally { ctx.restore(); ctx.globalAlpha = 1; }
  });
}
/* design-space AABB of the local box (rotation aware) */
function dRange(it, b) {
  const r = (it.rot || 0) * DEG, c = Math.cos(r), s = Math.sin(r);
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  for (const [u, v] of [[b.x0, b.y0], [b.x1, b.y0], [b.x0, b.y1], [b.x1, b.y1]]) {
    const X = it.x + c * u - s * v, Y = it.y + s * u + c * v;
    x0 = Math.min(x0, X); x1 = Math.max(x1, X); y0 = Math.min(y0, Y); y1 = Math.max(y1, Y);
  }
  return { x0, x1, y0, y1 };
}
/* scale the item about its own box centre (layouts anchor some items at the left / top) */
function scaleAbout(it, k, b) {
  if (k === 1) return;
  b = b || box(it);
  it.size *= k;
  const cx = b.cx * (k - 1), cy = b.cy * (k - 1);
  if (cx || cy) { const r = (it.rot || 0) * DEG, c = Math.cos(r), s = Math.sin(r); it.x -= c * cx - s * cy; it.y -= s * cx + c * cy; }
}
/* change tracking but keep the box centred where it rests */
function setTrack(it, tr) {
  const b0 = box(it);
  it.track = tr;
  const b1 = box(it);
  const cx = b1.cx - b0.cx, cy = b1.cy - b0.cy;
  if (cx || cy) { const r = (it.rot || 0) * DEG, c = Math.cos(r), s = Math.sin(r); it.x -= c * cx - s * cy; it.y -= s * cx + c * cy; }
}
/* horizontal glitch bands over the item (design space) */
function hBands(it, n, dxFn) {
  const R = dRange(it, box(it)), pad = it.size * 0.3, y0 = R.y0 - pad, h = R.y1 - R.y0 + pad * 2;
  const cuts = [0];
  for (let i = 1; i < n; i++) cuts.push(J.r(it.seed | 0, n, i, 3));
  cuts.push(1); cuts.sort((a, b) => a - b);
  const out = [];
  for (let i = 0; i < cuts.length - 1; i++) out.push([y0 + cuts[i] * h, y0 + cuts[i + 1] * h, dxFn(i)]);
  return out;
}
/* per-glyph mask that stays at the glyph's resting box while the glyph is moved by (fx, fy) glyph-boxes */
function masked(g, fx, fy, isx, isy) {
  const o = { dx: fx * g.w * isx, dy: fy * g.h * isy };
  if (g.r90) { o.a = clamp(1 - Math.max(Math.abs(fx), Math.abs(fy)) * 1.4); return o; }
  o.clipX = [-2 - fx, 2 - fx]; o.clipY = [-0.66 - fy, 0.66 - fy];
  if (fx) o.clipX = [-0.62 - fx, 0.62 - fx];
  if (!fy) o.clipY = [-2, 2];
  return o;
}
const glyphPos = (g, isx, isy) => [(g.x + g.vx) * isx, (g.y + g.vy) * isy];

const SIGNS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#*+=/\\<>◇◆□△○';

/* ================================================================ */
const DEFS = {

  /* ---------- glyph masks ---------- */
  riseMask: {
    name: '下から出現', nameEn: 'Rise up', tags: ['editorial', 'graphic', 'calm', 'emotional'], w: 1.4,
    apply(env, it, p) {
      const isx = it.sx || 1, isy = it.sy || 1;
      glyphs(it, (i, g, n) => {
        const q = stg(p, ordLR(i, n), 0.45);
        if (q <= 0) return HIDE; if (q >= 1) return null;
        return masked(g, 0, 1.15 * (1 - oQuint(q)), isx, isy);
      });
    },
  },

  dropMask: {
    name: '上から出現', nameEn: 'Drop in', tags: ['editorial', 'graphic', 'pop'], w: 1.2,
    apply(env, it, p) {
      const isx = it.sx || 1, isy = it.sy || 1;
      glyphs(it, (i, g, n) => {
        const q = stg(p, ordLR(i, n), 0.45);
        if (q <= 0) return HIDE; if (q >= 1) return null;
        return masked(g, 0, -1.15 * (1 - oBack(q, 1.35)), isx, isy);
      });
    },
  },

  /* ---------- slides ---------- */
  slideL: {
    name: '左からスライド', nameEn: 'Slide from left', tags: ['editorial', 'calm', 'pop'], w: 1,
    apply(env, it, p) {
      const size = it.size;
      glyphs(it, (i, g, n) => {
        const q = stg(p, ordLR(i, n), 0.5);
        if (q <= 0) return HIDE; if (q >= 1) return null;
        const e = oQuint(q);
        return { dx: -(1 - e) * size * 0.85, a: Math.pow(clamp(q * 1.6), 1.6) };
      });
    },
  },

  slideR: {
    // each glyph slides in from the right inside its own box
    name: '右からスライド', nameEn: 'Slide from right', tags: ['editorial', 'graphic', 'pop'], w: 1,
    apply(env, it, p) {
      const isx = it.sx || 1, isy = it.sy || 1;
      glyphs(it, (i, g, n) => {
        const q = stg(p, ordLR(i, n), 0.45);
        if (q <= 0) return HIDE; if (q >= 1) return null;
        return masked(g, 1.2 * (1 - oQuint(q)), 0, isx, isy);
      });
    },
  },

  slideWhole: {
    name: '全体スライド', nameEn: 'Whole slide', tags: ['pop', 'graphic'], w: 0.9,
    apply(env, it, p) {
      const dir = dirOf(env, 11), e = oBack(p, 1.7);
      const D = it.size * (glyphN(it) <= 1 ? 1.3 : 3.2) * (0.7 + 0.6 * env.fx.motion);
      if (it.vertical) it.y += dir * D * (1 - e); else it.x += dir * D * (1 - e);
      it.alpha = (it.alpha ?? 1) * clamp(p * 4);
    },
  },

  /* ---------- flips & folds ---------- */
  flipX: {
    // card flip around the vertical axis: an accent tile turns over to reveal each glyph
    name: '縦軸フリップ', nameEn: 'Card flip', tags: ['pop', 'graphic', 'editorial'], w: 1,
    apply(env, it, p) {
      const col = colOf(it), bg = pick(env.sc.bg), back = it.color === env.sc.accent ? pick(env.sc.accent2, env.sc.fg) : pick(env.sc.accent, env.sc.fg);
      glyphs(it, (i, g, n) => {
        const q = stg(p, ordLR(i, n), 0.45);
        if (q <= 0) return HIDE; if (q >= 1) return null;
        const pop = oBack(q / 0.22, 1.6), th = (1 - oBack((q - 0.22) / 0.78, 1.25)) * 180 * DEG, c = Math.cos(th), sh = Math.abs(Math.sin(th));
        if (c < 0) return { ch: '■', sx: Math.max(0.04, -c), s: 1.02 * pop, color: J.mix(back, bg, sh * 0.35), a: clamp(q * 8) };
        return { sx: Math.max(0.04, c), color: J.mix(col, bg, Math.min(0.5, sh * 0.5)) };
      });
    },
  },

  flipY: {
    // three-quarter tumble around the horizontal axis (shows the mirrored back once)
    name: '横軸フリップ', nameEn: 'Tumble flip', tags: ['pop', 'graphic'], w: 0.9,
    apply(env, it, p) {
      const col = colOf(it), bg = pick(env.sc.bg);
      glyphs(it, (i, g, n) => {
        const q = stg(p, ordC(i, n), 0.4);
        if (q <= 0) return HIDE; if (q >= 1) return null;
        const th = (1 - oQuart(q)) * 270 * DEG;
        let c = Math.cos(th); if (Math.abs(c) < 0.04) c = c < 0 ? -0.04 : 0.04;
        return { sy: c, a: clamp(q * 3), color: J.mix(col, bg, Math.min(0.75, Math.abs(Math.sin(th)) * 0.6 + (c < 0 ? 0.2 : 0))) };
      });
    },
  },

  domino: {
    name: 'ドミノ', nameEn: 'Domino', tags: ['pop'], w: 0.7, minDur: 0.5,
    inDur: dur => clamp(dur * 0.42, 0.15, 0.75),
    apply(env, it, p) {
      const isx = it.sx || 1, isy = it.sy || 1;
      glyphs(it, (i, g, n) => {
        const q = stg(p, ordLR(i, n), 0.55);
        if (q <= 0) return HIDE; if (q >= 1) return null;
        const th = (1 - oBack(q, 1.5)) * 90 * DEG;           // lying on its right side → upright, pivot = bottom-right corner
        const hw = g.w * isx / 2, hh = g.h * isy / 2, vx = -hw, vy = -hh;
        const c = Math.cos(th), s = Math.sin(th);
        return { dx: c * vx - s * vy - vx, dy: s * vx + c * vy - vy, rot: th / DEG, a: clamp(q * 4) };
      });
    },
  },

  fold: {
    // accordion: glyphs unfold alternately from their top and bottom edge
    name: '折り開き', nameEn: 'Accordion open', tags: ['graphic', 'editorial'], w: 0.9,
    apply(env, it, p) {
      const isy = it.sy || 1, col = colOf(it), bg = pick(env.sc.bg);
      glyphs(it, (i, g, n) => {
        const q = stg(p, ordLR(i, n), 0.5);
        if (q <= 0) return HIDE; if (q >= 1) return null;
        const sy = Math.max(0.02, oBack(q, 1.6));
        const dy = (i % 2 ? 1 : -1) * (1 - sy) * g.h * isy / 2;
        return { sy, dy, a: clamp(q * 4), color: J.mix(col, bg, clamp(1 - sy) * 0.6) };
      });
    },
  },

  unroll: {
    name: '巻き開き', nameEn: 'Unroll', tags: ['calm', 'editorial', 'emotional'], w: 0.9,
    apply(env, it, p) {
      const vert = !!it.vertical, isx = it.sx || 1, isy = it.sy || 1, size = it.size;
      const q = (i, n) => stg(p, ordLR(i, n), 0.5);
      glyphs(it, (i, g, n) => {
        const u = q(i, n);
        if (u <= 0) return HIDE; if (u >= 1) return null;
        const e = E.outCubic(u), k = lerp(0.3, 1, e), r = lerp(-0.62, 0.62, e);
        return vert ? { sy: k, dy: -(1 - k) * g.h * isy / 2, clipY: [-2, r], clipX: [-2, 2] }
                    : { sx: k, dx: -(1 - k) * g.w * isx / 2, clipX: [-2, r], clipY: [-2, 2] };
      });
      postLocal(it, (env2, b, x, A) => {
        const lay = J.layoutText(x), n = lay.N, t = Math.max(1.5, size * 0.028);
        for (const g of lay) {
          if (g.ch === ' ' || g.ch === '　') continue;
          const u = q(g.i, n); if (u <= 0 || u >= 1) continue;
          const e = E.outCubic(u), k = lerp(0.3, 1, e), r = lerp(-0.62, 0.62, e), a = Math.pow(1 - e, 0.6) * A;
          const [gx, gy] = glyphPos(g, isx, isy);
          if (vert) { const y = gy - (1 - k) * g.h * isy / 2 + r * g.h * isy * k; env2.rect(gx - g.w * isx * 0.56, y - t / 2, g.w * isx * 1.12, t, env2.sc.accent, a, false); }
          else { const X = gx - (1 - k) * g.w * isx / 2 + r * g.w * isx * k; env2.rect(X - t / 2, gy - g.h * isy * 0.56, t, g.h * isy * 1.12, env2.sc.accent, a, false); }
        }
      });
    },
  },

  /* ---------- line work ---------- */
  strokeDraw: {
    name: '線画から塗り', nameEn: 'Line to fill', tags: ['calm', 'emotional', 'editorial'], w: 1, minDur: 0.8,
    inDur: dur => clamp(dur * 0.5, 0.2, 0.95),
    apply(env, it, p) {
      it.dash = E.outQuad(clamp(p / 0.86));
      it.fillAlpha = (it.fillAlpha ?? 1) * J.smooth(0.42, 0.9, p);
      if (!(it.stroke > 0)) it.stroke = Math.max(0.6, it.size * 0.032 * (1 - J.smooth(0.55, 0.86, p)));
    },
  },

  outlineFill: {
    name: '輪郭→塗り', nameEn: 'Outline to fill', tags: ['graphic', 'pop', 'editorial'], w: 1, minDur: 0.7,
    inDur: dur => clamp(dur * 0.5, 0.2, 0.9),
    apply(env, it, p) {
      const sw = it.stroke > 0 ? it.stroke : Math.max(1.2, it.size * 0.028);
      const hasFill = it.fill !== false;
      const q = (i, n) => stg(p, ordLR(i, n), 0.4);
      const fnOut = (i, g, n) => {
        const u = q(i, n);
        if (u <= 0 || (hasFill && u >= 0.9)) return HIDE;
        const e = oQuint(u / 0.35);
        return { outline: true, s: lerp(1.3, 1, e), a: clamp(u * 5) * (1 - J.smooth(0.68, 0.9, u)) };
      };
      if (!hasFill) {
        glyphs(it, (i, g, n) => { const u = q(i, n); if (u <= 0) return HIDE; if (u >= 1) return null; return { s: lerp(1.3, 1, oQuint(u / 0.35)), a: clamp(u * 5) }; });
        return;
      }
      const main = glyphs(it, (i, g, n) => {
        const u = q(i, n);
        if (u <= 0.3) return HIDE; if (u >= 1) return null;
        if (g.r90) return { a: clamp((u - 0.3) / 0.55) };
        const f = ioQuart((u - 0.3) / 0.55);
        if (f >= 1) return null;
        return { clipY: [lerp(0.66, -0.68, f), 0.72], clipX: [-2, 2] };
      });
      addPre(it, (env2, x) => {
        const others = (x.charFns || []).filter(f => f !== main);
        const c = Object.assign({}, x, { charFn: others.length ? mergeChar(others.concat([fnOut])) : fnOut, stroke: sw, strokeColor: x.strokeColor || x.color,
          shadow: null, extrude: null, dash: null, pattern: null, gradient: null, pieceFn: null, blur: 0 });
        J.drawItem(env2, c);
      });
    },
  },

  splitJoin: {
    // top and bottom halves of every glyph slide in from opposite sides, each inside the glyph's own box
    name: '上下合体', nameEn: 'Split join', tags: ['graphic', 'editorial'], w: 0.9,
    apply(env, it, p) {
      const vert = !!it.vertical, isx = it.sx || 1, isy = it.sy || 1, dir = dirOf(env, 13);
      const q = (i, n) => stg(p, ordLR(i, n), 0.4);
      const half = (g, u, sgn) => {
        const f = sgn * dir * 1.1 * (1 - oQuint(u));
        if (g.r90) return { a: clamp(u * 2) };
        return vert ? { dy: f * g.h * isy, clipY: [-0.62 - f, 0.62 - f], clipX: sgn < 0 ? [0, 2] : [-2, 0.004] }
                    : { dx: f * g.w * isx, clipX: [-0.62 - f, 0.62 - f], clipY: sgn < 0 ? [-2, 0.004] : [0, 2] };
      };
      glyphs(it, (i, g, n) => { const u = q(i, n); if (u <= 0) return HIDE; if (u >= 1) return null; return half(g, u, -1); });
      const fnB = (i, g, n) => { const u = q(i, n); if (u <= 0 || u >= 1 || g.r90) return HIDE; return half(g, u, 1); };
      addPre(it, (env2, x) => { J.drawItem(env2, Object.assign({}, x, { charFn: fnB, shadow: null, pieceFn: null })); });
    },
  },

  /* ---------- graphic masks ---------- */
  vSlice: {
    name: '縦スライス', nameEn: 'Vertical slice', tags: ['graphic', 'glitch'], w: 1,
    apply(env, it, p) {
      const b = box(it), R = dRange(it, b), size = it.size;
      const pad = size * 0.3, X0 = R.x0 - pad, X1 = R.x1 + pad;
      const n = clamp(Math.round((X1 - X0) / (size * 0.55)), 4, 8);
      const w = (X1 - X0) / n, dist = (R.y1 - R.y0) * 0.9 + size * 1.4;
      it.vbands = [];
      for (let k = 0; k < n; k++) {
        const e = oQuint(stg(p, ordC(k, n), 0.5));
        it.vbands.push([X0 + k * w, X0 + (k + 1) * w + 0.6, (k % 2 ? 1 : -1) * dist * (1 - e)]);
      }
      it.alpha = (it.alpha ?? 1) * clamp(p * 3);
    },
  },

  shutter: {
    name: 'シャッター', nameEn: 'Shutter', tags: ['graphic', 'editorial'], w: 1,
    apply(env, it, p) {
      const vert = !!it.vertical, size = it.size;
      const grow = oQuint(p / 0.32), open = ioQuart((p - 0.18) / 0.82);
      const m = size * 0.2;
      clipLocal(it, (ctx, b) => {
        if (open <= 0) { ctx.rect(0, 0, 0, 0); return; }
        if (vert) { const hw = (b.w / 2 + m) * open; ctx.rect(b.cx - hw, b.y0 - m, hw * 2, b.h + m * 2); }
        else { const hh = (b.h / 2 + m) * open; ctx.rect(b.x0 - m, b.cy - hh, b.w + m * 2, hh * 2); }
      });
      postLocal(it, (env2, b, x, A) => {
        const a = (1 - J.smooth(0.6, 0.9, p)) * A; if (a <= 0) return;
        const t = Math.max(2, size * 0.03), col = env2.sc.accent;
        if (vert) {
          const L = (b.h + m * 2) * grow, y = b.cy - L / 2, hw = (b.w / 2 + m) * open;
          env2.rect(b.cx - hw - t / 2, y, t, L, col, a, false);
          if (open > 0) env2.rect(b.cx + hw - t / 2, y, t, L, col, a, false);
        } else {
          const L = (b.w + m * 2) * grow, x = b.cx - L / 2, hh = (b.h / 2 + m) * open;
          env2.rect(x, b.cy - hh - t / 2, L, t, col, a, false);
          if (open > 0) env2.rect(x, b.cy + hh - t / 2, L, t, col, a, false);
        }
      });
    },
  },

  iris: {
    name: 'アイリス', nameEn: 'Iris', tags: ['pop', 'emotional', 'graphic'], w: 0.8,
    apply(env, it, p) {
      const e = oQuart(p);
      scaleAbout(it, lerp(1.14, 1, e));
      const radius = b => (Math.hypot(b.w, b.h) / 2 + it.size * 0.25) * e;
      clipLocal(it, (ctx, b) => { const r = Math.max(0.01, radius(b)); ctx.moveTo(b.cx + r, b.cy); ctx.arc(b.cx, b.cy, r, 0, TAU); });
      postLocal(it, (env2, b, x, A) => {
        const a = (1 - J.smooth(0.3, 0.8, p)) * A; if (a <= 0) return;
        env2.circle(b.cx, b.cy, radius(b), null, env2.sc.accent, Math.max(2, it.size * 0.03), a, false);
      });
    },
  },

  diagWipe: {
    // a slanted accent block sweeps in, covers the line, then retracts and leaves the text behind it
    name: '斜めワイプ', nameEn: 'Diagonal wipe', tags: ['graphic', 'editorial', 'pop'], w: 1,
    apply(env, it, p) {
      const vert = !!it.vertical, size = it.size, dir = dirOf(env, 17), k = 0.5;
      const eL = oQuart(p / 0.5), eT = E.inOutCubic((p - 0.18) / 0.74);
      // (u, v): u along the reading direction, v across it
      const geo = b => {
        const U0 = vert ? b.y0 : b.x0, U1 = vert ? b.y1 : b.x1, V0 = vert ? b.x0 : b.y0, V1 = vert ? b.x1 : b.y1;
        const m = size * 0.16, hv = (V1 - V0) / 2 + m, half = (U1 - U0) / 2 + m + k * hv;
        return { uc: (U0 + U1) / 2, vc: (V0 + V1) / 2, hv, L: lerp(-half, half, eL), T: lerp(-half, half, eT), big: (U1 - U0) + size * 4 };
      };
      const pt = (G, du, dv) => { const u = G.uc + dir * du, v = G.vc + dv; return vert ? [v, u] : [u, v]; };
      const para = (G, a0, a1) => [pt(G, a0 - k * G.hv, -G.hv), pt(G, a1 - k * G.hv, -G.hv), pt(G, a1 + k * G.hv, G.hv), pt(G, a0 + k * G.hv, G.hv)];
      clipLocal(it, (ctx, b) => {
        const G = geo(b);
        para(G, -G.big, G.T).forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); ctx.closePath();
      });
      postLocal(it, (env2, b, x, A) => {
        const G = geo(b); if (G.L - G.T < 0.5) return;
        env2.poly(para(G, G.T, G.L), env2.sc.accent, A, false);
      });
    },
  },

  blinds: {
    name: 'ブラインド', nameEn: 'Blinds', tags: ['graphic', 'editorial'], w: 0.8,
    apply(env, it, p) {
      const vert = !!it.vertical, size = it.size;
      clipLocal(it, (ctx, b) => {
        const m = size * 0.2;
        const V0 = (vert ? b.x0 : b.y0) - m, V1 = (vert ? b.x1 : b.y1) + m, U0 = (vert ? b.y0 : b.x0) - m, U1 = (vert ? b.y1 : b.x1) + m;
        const pitch = Math.max(size * 0.2, (V1 - V0) / 40), N = Math.max(1, Math.ceil((V1 - V0) / pitch));
        let any = false;
        for (let k = 0; k < N; k++) {
          const e = oQuart(stg(p, ordLR(vert ? N - 1 - k : k, N), 0.55)); if (e <= 0) continue;
          const c = V0 + (k + 0.5) * pitch, hw = pitch * 0.5 * e + 0.4;
          if (vert) ctx.rect(c - hw, U0, hw * 2, U1 - U0); else ctx.rect(U0, c - hw, U1 - U0, hw * 2);
          any = true;
        }
        if (!any) ctx.rect(0, 0, 0, 0);
      });
    },
  },

  checker: {
    name: '市松', nameEn: 'Checker', tags: ['graphic', 'glitch', 'pop'], w: 0.7,
    apply(env, it, p) {
      const size = it.size, seed = env.cut.seed | 0;
      const tiles = (b, fn) => {
        const m = size * 0.15, W = b.w + m * 2, H = b.h + m * 2;
        let cell = size * 0.34;
        while ((W / cell) * (H / cell) > 320) cell *= 1.25;
        const nx = Math.ceil(W / cell), ny = Math.ceil(H / cell), ox = b.cx - nx * cell / 2, oy = b.cy - ny * cell / 2;
        for (let iy = 0; iy < ny; iy++) for (let ix = 0; ix < nx; ix++) {
          const d = ((ix + iy) & 1) * 0.25 + ordLR(ix, nx) * 0.3 + J.r(seed, ix, iy, 7) * 0.08;
          const u = clamp((p - d) / 0.22);
          if (u > 0) fn(ox + (ix + 0.5) * cell, oy + (iy + 0.5) * cell, cell, u);
        }
      };
      clipLocal(it, (ctx, b) => {
        let any = false;
        tiles(b, (cx, cy, cell, u) => { const hs = cell * 0.5 * oQuart(u) + 0.5; ctx.rect(cx - hs, cy - hs, hs * 2, hs * 2); any = true; });
        if (!any) ctx.rect(0, 0, 0, 0);
      });
      postLocal(it, (env2, b, x, A) => {
        tiles(b, (cx, cy, cell, u) => {
          if (u >= 0.75) return;
          const hs = cell * 0.5 * (1 - E.inCubic(u / 0.75)) * Math.min(1, u * 6);
          if (hs > 0.5) env2.rect(cx - hs, cy - hs, hs * 2, hs * 2, env2.sc.accent, 0.9 * A, false);
        });
      });
    },
  },

  randomOrder: {
    name: 'ランダム順', nameEn: 'Random order', tags: ['pop', 'glitch'], w: 1,
    apply(env, it, p) {
      const seed = it.seed | 0, fl = it.color === env.sc.accent ? pick(env.sc.accent2, env.sc.fg) : pick(env.sc.accent, env.sc.fg);
      glyphs(it, (i, g, n) => {
        const d = J.r(seed, i, 61) * 0.62;
        const u = clamp((p - d) / 0.38);
        if (u <= 0) return HIDE; if (u >= 1) return null;
        const o = { s: lerp(1.45, 1, oQuint(u)), a: clamp(u * 6) };
        if (u < 0.42) o.color = fl;
        return o;
      });
    },
  },

  /* ---------- squash & stretch ---------- */
  bounceBig: {
    name: '大ジャンプ', nameEn: 'Big jump', tags: ['pop'], w: 0.7, minDur: 0.7,
    inDur: dur => clamp(dur * 0.5, 0.2, 0.95),
    apply(env, it, p) {
      const isy = it.sy || 1, seed = it.seed | 0;
      glyphs(it, (i, g, n) => {
        const q = stg(p, ordLR(i, n), 0.35);
        if (q <= 0) return HIDE; if (q >= 1) return null;
        let y, rot = 0;
        if (q < 0.5) { const s = q / 0.5; y = 7.666 * s * s - 9.266 * s + 1.6; rot = J.rs(seed, i, 21) * 28 * Math.sin(PI * s); }
        else if (q < 0.76) { const s = (q - 0.5) / 0.26; y = -0.24 * 4 * s * (1 - s); }
        else if (q < 0.9) { const s = (q - 0.76) / 0.14; y = -0.06 * 4 * s * (1 - s); }
        else y = 0;
        const imp = Math.exp(-Math.pow((q - 0.5) / 0.035, 2)) + 0.6 * Math.exp(-Math.pow((q - 0.76) / 0.03, 2));
        const sy = 1 - 0.3 * imp, sx = 1 + 0.24 * imp, h = g.h * isy;
        return { dy: y * h + (1 - sy) * h / 2, sy, sx, rot, a: clamp(q * 7) };
      });
    },
  },

  squashDrop: {
    name: '潰れて着地', nameEn: 'Squash landing', tags: ['pop'], w: 0.8, minDur: 0.5,
    inDur: dur => clamp(dur * 0.42, 0.15, 0.75),
    apply(env, it, p) {
      const isy = it.sy || 1;
      glyphs(it, (i, g, n) => {
        const q = stg(p, ordLR(i, n), 0.4);
        if (q <= 0) return HIDE; if (q >= 1) return null;
        const h = g.h * isy, tA = 0.22;
        let dy = 0, sy;
        if (q < tA) { const t = q / tA; dy = -(1 - t * t) * h * 1.7; sy = 1 + 0.4 * t; }
        else { const t = (q - tA) / (1 - tA); sy = 1 - 0.58 * Math.exp(-3 * t) * Math.cos(t * 6.2) * (1 - t); }
        const sx = 1 / Math.pow(sy, 0.8);
        return { dy: dy + (1 - sy) * h / 2, sy, sx, a: clamp(q * 10) };
      });
    },
  },

  rubber: {
    name: 'ゴム伸び', nameEn: 'Rubber stretch', tags: ['pop'], w: 0.8, minDur: 0.45,
    inDur: dur => clamp(dur * 0.42, 0.15, 0.75),
    apply(env, it, p) {
      glyphs(it, (i, g, n) => {
        const q = stg(p, ordLR(i, n), 0.4);
        if (q <= 0) return HIDE; if (q >= 1) return null;
        const f = Math.pow(1 - q, 2) * Math.cos(q * 3.5 * PI);
        const sx = Math.max(0.03, 1 - f);
        return { sx, sy: clamp(1 + (1 - sx) * 0.45, 0.72, 1.45), a: clamp(q * 6) };
      });
    },
  },

  /* ---------- digital ---------- */
  glitchIn: {
    name: 'グリッチ出現', nameEn: 'Glitch in', tags: ['glitch'], w: 1.2,
    apply(env, it, p) {
      const seed = it.seed | 0, step = env.step, size = it.size, sc = env.sc;
      const cols = [sc.accent, sc.ghostA, sc.ghostB, sc.accent2].filter(isHex);
      glyphs(it, (i, g, n) => {
        const settle = 0.38 + 0.52 * J.r(seed, i, 71);
        if (p >= settle) return null;
        const u = p / settle;
        if (J.r(seed, i, step, 72) > 0.25 * clamp(p * 12) + 0.75 * u) return HIDE;
        const k = 1 - u;
        const o = { dx: J.rs(seed, i, step, 73) * size * 0.5 * k, dy: J.rs(seed, i, step, 74) * size * 0.14 * k };
        if (cols.length && J.r(seed, i, step, 75) < 0.55) o.color = cols[J.h(seed, i, step, 76) % cols.length];
        if (J.r(seed, i, step, 77) < 0.35) o.sx = lerp(0.55, 1.9, J.r(seed, i, step, 78));
        return o;
      });
      const k = Math.pow(1 - p, 1.2);
      if (p < 0.85 && J.r(seed, step, 79) < 0.6) it.bands = hBands(it, 5, b => (J.r(seed, step, b, 80) < 0.7 ? J.rs(seed, step, b, 81) * size * 0.6 * k : 0));
    },
  },

  echoIn: {
    // concentric accent outlines of every glyph collapse onto it while the glyph fades in
    name: '残像集束', nameEn: 'Echo converge', tags: ['graphic', 'emotional', 'pop'], w: 1,
    apply(env, it, p) {
      const col = pick(env.sc.accent, env.sc.fg);
      const qf = (i, n) => stg(p, ordLR(i, n), 0.35);
      glyphs(it, (i, g, n) => {
        const q = qf(i, n);
        if (q <= 0) return HIDE; if (q >= 1) return null;
        return { a: clamp(q * 2.2), s: lerp(0.88, 1, oQuart(q)) };
      });
      addPre(it, (env2, x) => {
        for (let m = 3; m >= 1; m--) {
          const fn = (i, g, n) => {
            const q = qf(i, n); if (q <= 0 || q >= 1) return HIDE;
            const k = 1 - oQuart(q);
            return { outline: true, s: 1 + m * 0.3 * k, a: (0.95 - m * 0.2) * Math.min(1, k * 1.8) * clamp(q * 6) };
          };
          J.drawItem(env2, Object.assign({}, x, { charFn: fn, fill: false, stroke: Math.max(1.4, x.size * 0.02), strokeColor: col, color: col,
            shadow: null, extrude: null, pattern: null, gradient: null, dash: null, pieceFn: null, blur: 0 }));
        }
      });
    },
  },

  /* ---------- motion ---------- */
  whip: {
    name: 'ホイップ', nameEn: 'Whip', tags: ['pop', 'graphic'], w: 1,
    inDur: dur => clamp(dur * 0.3, 0.12, 0.45),
    apply(env, it, p) {
      const dir = dirOf(env, 19), b = box(it);
      const D = Math.max(it.size * 4.5, b.w * 0.9);
      const e = E.outExpo(p);
      it.x += dir * D * (1 - e);
      const lean = dir * 34 * Math.pow(1 - e, 0.7), follow = -dir * 14 * Math.sin(PI * clamp((p - 0.3) / 0.7)) * (1 - J.smooth(0.6, 1, p));
      it.skew = (it.skew || 0) + lean + follow;
      it.streak = { n: 6, dx: dir * it.size * 0.42 * (1 - e), dy: 0, a: 0.5 * (1 - e) };
      it.alpha = (it.alpha ?? 1) * clamp(p * 8);
    },
  },

  skewIn: {
    name: 'スキュー', nameEn: 'Skew', tags: ['editorial', 'graphic'], w: 0.9,
    apply(env, it, p) {
      const dir = dirOf(env, 23), isy = it.sy || 1, size = it.size;
      glyphs(it, (i, g, n) => {
        const q = stg(p, ordLR(i, n), 0.45);
        if (q <= 0) return HIDE; if (q >= 1) return null;
        const sk = clamp(dir * 60 * (1 - oBack(q, 1.6)), -66, 66);
        return { skew: sk, dx: -Math.tan(sk * DEG) * g.h * isy / 2 + dir * (1 - oQuint(q)) * size * 0.7, a: clamp(q * 3) };
      });
    },
  },

  trackIn: {
    name: '字間収束', nameEn: 'Track in', tags: ['calm', 'editorial', 'emotional'], w: 1.2,
    apply(env, it, p) {
      const e = oQuint(p);
      if (glyphN(it) <= 1) it.x = env.W / 2 + (it.x - env.W / 2) * (1 + 0.9 * (1 - e));
      else setTrack(it, (it.track || 0) + 1.6 * (1 - e));
      it.alpha = (it.alpha ?? 1) * E.outCubic(clamp(p * 1.7));
    },
  },

  trackOut: {
    name: '字間拡張', nameEn: 'Track out', tags: ['calm', 'editorial', 'pop'], w: 1,
    apply(env, it, p) {
      const e = oQuint(p);
      if (glyphN(it) <= 1) { it.x = lerp(env.W / 2, it.x, e); it.y = lerp(env.H / 2, it.y, e); }
      else setTrack(it, (it.track || 0) - 0.72 * (1 - e));
      it.alpha = (it.alpha ?? 1) * clamp(p * 2.5);
      glyphs(it, () => ({ a: lerp(0.55, 1, e) }));
    },
  },

  /* ---------- soft ---------- */
  blurStagger: {
    name: 'ブラー段差', nameEn: 'Staggered blur', tags: ['calm', 'emotional'], w: 1.2,
    apply(env, it, p) {
      const size = it.size, bl = Math.min(42, size * 0.14);
      glyphs(it, (i, g, n) => {
        const q = stg(p, ordLR(i, n), 0.55);
        if (q <= 0) return HIDE; if (q >= 1) return null;
        const e = E.outCubic(q);
        return { blur: bl * (1 - e), a: Math.pow(e, 0.6), s: lerp(1.35, 1, e), dy: -(1 - e) * size * 0.16 };
      });
    },
  },

  fadeStagger: {
    name: '字ごとフェード', nameEn: 'Per-glyph fade', tags: ['calm', 'emotional'], w: 1.2,
    inDur: dur => clamp(dur * 0.45, 0.15, 0.85),
    apply(env, it, p) {
      const size = it.size;
      glyphs(it, (i, g, n) => {
        const q = stg(p, ordLR(i, n), 0.62);
        if (q <= 0) return HIDE; if (q >= 1) return null;
        return { a: E.inOutSine(q), dy: (1 - E.outCubic(q)) * size * 0.07 };
      });
    },
  },

  waveIn: {
    name: '波立ち', nameEn: 'Wave rise', tags: ['pop', 'emotional'], w: 0.9, minDur: 0.5,
    inDur: dur => clamp(dur * 0.45, 0.15, 0.85),
    apply(env, it, p) {
      const size = it.size, damp = Math.pow(1 - p, 1.6);
      glyphs(it, (i, g, n) => {
        const a = clamp(p * 2.4 - ordLR(i, n) * 1.3);
        if (a <= 0) return HIDE;
        const ph = p * 3.6 * PI - i * 0.8;
        return { dy: -Math.sin(ph) * size * 0.66 * damp, rot: Math.cos(ph) * 13 * damp, a };
      });
    },
  },

  spiralIn: {
    name: '螺旋集合', nameEn: 'Spiral assemble', tags: ['pop', 'emotional'], w: 0.7, minDur: 0.5,
    inDur: dur => clamp(dur * 0.42, 0.15, 0.75),
    apply(env, it, p) {
      const b = box(it), isx = it.sx || 1, isy = it.sy || 1, size = it.size, dir = dirOf(env, 29), seed = env.cut.seed | 0;
      glyphs(it, (i, g, n) => {
        const q = stg(p, ordLR(i, n), 0.15);
        if (q <= 0) return HIDE; if (q >= 1) return null;
        const e = E.outCubic(q), k = 1 - e;
        const [gx, gy] = glyphPos(g, isx, isy), px = gx - b.cx, py = gy - b.cy;
        const ang = dir * k * 200 * DEG, c = Math.cos(ang), s = Math.sin(ang), r = 1 + 0.7 * k;
        const th = J.r(seed, i, 31) * TAU + ang, orb = size * 1.0 * k;
        const nx = (c * px - s * py) * r + Math.cos(th) * orb, ny = (s * px + c * py) * r + Math.sin(th) * orb;
        return { dx: nx - px, dy: ny - py, rot: dir * k * 320, s: lerp(0.45, 1, e), a: clamp(q * 5) };
      });
    },
  },

  zoomOut: {
    name: '巨大→等倍', nameEn: 'Giant to normal', tags: ['pop', 'graphic', 'glitch'], w: 1,
    apply(env, it, p) {
      const e = E.outExpo(p);
      const dip = 0.035 * Math.sin(PI * clamp((p - 0.22) / 0.58));
      scaleAbout(it, 1 + 3.4 * (1 - e) - dip);
      it.alpha = (it.alpha ?? 1) * clamp(p * 6);
    },
  },

  /* ---------- reveal devices ---------- */
  resolve: {
    name: '解読', nameEn: 'Decode', tags: ['glitch', 'editorial'], w: 0.9, minDur: 0.6,
    inDur: (dur, n) => clamp(0.2 + n * 0.045, 0.3, Math.max(0.3, Math.min(0.95, dur * 0.55))),
    apply(env, it, p) {
      const seed = it.seed | 0, step = env.step, sc = env.sc, isx = it.sx || 1, isy = it.sy || 1;
      const lay = J.layoutText(it), N = lay.N;
      const f = p * (N + 1.8), front = Math.floor(f);
      const hi = pick(sc.accent, sc.fg), dim = pick(sc.sub, sc.fg);
      if (p < 0.03) { glyphs(it, () => HIDE); return; }
      glyphs(it, (i) => {
        if (i < front) return f - i - 1 < 0.6 ? { color: hi } : null;
        if (i === front) return HIDE;
        if (i <= front + 4) return { ch: SIGNS[J.h(seed, i, step, 51) % SIGNS.length], a: 0.5, color: dim };
        return HIDE;
      });
      if (front < N) {
        const g = lay[front];
        postLocal(it, (env2, b, x, A) => {
          const [gx, gy] = glyphPos(g, isx, isy), w = g.w * isx * 0.9, h = g.h * isy * 0.98;
          env2.rect(gx - w / 2, gy - h / 2, w, h, sc.accent, A, false);
        });
      }
    },
  },

  magnet: {
    name: '磁石', nameEn: 'Magnet', tags: ['pop', 'graphic'], w: 0.8, minDur: 0.6,
    inDur: dur => clamp(dur * 0.48, 0.2, 0.85),
    apply(env, it, p) {
      const seed = it.seed | 0, size = it.size;
      glyphs(it, (i, g, n) => {
        const d = n > 1 ? J.r(seed, i, 81) * 0.3 : 0;
        const u = clamp((p - d) / 0.7);
        if (u <= 0) return HIDE; if (u >= 1) return null;
        const ang = J.r(seed, i, 82) * TAU, dist = size * (1.3 + 1.5 * J.r(seed, i, 83)), rot0 = J.rs(seed, i, 84) * 55;
        let f, a;
        if (u < 0.36) { f = 1 - 0.16 * E.outCubic(u / 0.36); a = 0.5 * clamp(u * 8); }
        else if (u < 0.6) { const t = (u - 0.36) / 0.24; f = 0.84 * (1 - E.inCubic(t)); a = lerp(0.5, 1, clamp(t * 3)); }
        else { const t = (u - 0.6) / 0.4; f = -0.1 * Math.sin(t * TAU) * (1 - t); a = 1; }
        const s = 1 + 0.14 * Math.exp(-Math.pow((u - 0.6) / 0.05, 2));
        return { dx: Math.cos(ang) * dist * f, dy: Math.sin(ang) * dist * f, rot: rot0 * f, s, a };
      });
    },
  },

  inkBleed: {
    name: 'にじみ', nameEn: 'Ink bleed', tags: ['calm', 'emotional'], w: 1,
    inDur: dur => clamp(dur * 0.45, 0.15, 0.8),
    apply(env, it, p) {
      const seed = it.seed | 0, size = it.size, bl = Math.min(36, size * 0.16);
      glyphs(it, (i, g, n) => {
        const d = n > 1 ? J.r(seed, i, 91) * 0.45 : 0;
        const u = clamp((p - d) / 0.55);
        if (u <= 0) return HIDE; if (u >= 1) return null;
        const e = E.outCubic(u);
        return { s: lerp(0.5, 1, oBack(u, 1.1)), blur: bl * Math.pow(1 - e, 1.3), a: clamp(u * 3.2) };
      });
      const h = 1 - J.smooth(0.2, 0.88, p);
      if (!it.shadow && h > 0.02) it.shadow = { color: J.rgba(colOf(it), 0.55 * h), blur: size * 0.3 * h, dx: 0, dy: 0 };
    },
  },

  neonOn: {
    name: 'ネオン点灯', nameEn: 'Neon on', tags: ['glitch', 'emotional', 'pop'], w: 0.8, minDur: 0.6,
    inDur: dur => clamp(dur * 0.5, 0.2, 0.9),
    apply(env, it, p) {
      const seed = it.seed | 0, step = env.step;
      glyphs(it, (i) => {
        const ig = 0.3 + 0.45 * J.r(seed, i, 101);
        if (p >= ig + 0.12) return null;
        if (p < ig - 0.22) return { a: 0.1 * clamp(p * 8) };
        const on = J.r(seed, i, step, 102) < 0.25 + 0.75 * clamp((p - ig + 0.22) / 0.34);
        return on ? null : { a: 0.1 };
      });
      const glow = J.smooth(0.1, 0.4, p) * (1 - J.smooth(0.62, 0.92, p));
      const gc = J.lum(colOf(it)) > 0.35 ? colOf(it) : pick(env.sc.accent, colOf(it));
      if (glow > 0.01 && !it.shadow) it.shadow = { color: J.rgba(gc, 0.95), blur: Math.min(80, it.size * 0.32) * glow, dx: 0, dy: 0 };
    },
  },

  cursorSweep: {
    name: 'カーソル掃引', nameEn: 'Cursor sweep', tags: ['editorial', 'graphic'], w: 1,
    inDur: dur => clamp(dur * 0.4, 0.14, 0.7),
    apply(env, it, p) {
      const vert = !!it.vertical, size = it.size, isx = it.sx || 1, isy = it.sy || 1;
      const b0 = box(it), bw = size * 0.28 * (vert ? isy : isx);
      const U0 = (vert ? b0.y0 : b0.x0) - bw, U1 = (vert ? b0.y1 : b0.x1) + bw * 1.5;
      const pos = lerp(U0, U1, E.outQuad(clamp(p / 0.85)));
      glyphs(it, (i, g) => {
        const [gx, gy] = glyphPos(g, isx, isy);
        const gu = vert ? gy : gx, hs = (vert ? g.h * isy : g.w * isx) / 2;
        const u = clamp((pos - bw / 2 - (gu - hs)) / (hs * 2 + size * 0.2));
        if (u <= 0) return HIDE; if (u >= 1) return null;
        const e = oQuint(u), o = { a: clamp(u * 3), s: lerp(0.7, 1, e) };
        if (vert) o.dy = (1 - e) * size * 0.3; else o.dx = (1 - e) * size * 0.3;
        return o;
      });
      postLocal(it, (env2, b, x, A) => {
        const t = bw * (1 - J.smooth(0.78, 0.94, p)); if (t < 0.5) return;
        const m = size * 0.15;
        if (vert) env2.rect(b.x0 - m, pos - t / 2, b.w + m * 2, t, env2.sc.accent, A, false);
        else env2.rect(pos - t / 2, b.y0 - m, t, b.h + m * 2, env2.sc.accent, A, false);
      });
    },
  },

  stamp: {
    name: 'スタンプ', nameEn: 'Stamp', tags: ['pop', 'graphic'], w: 0.9,
    inDur: dur => clamp(dur * 0.4, 0.14, 0.7),
    apply(env, it, p) {
      const tI = 0.42, dir = dirOf(env, 37), b = box(it), size = it.size;
      if (p < tI) {
        const t = E.inQuad(p / tI);
        scaleAbout(it, lerp(2.3, 1, t), b);
        it.rot = (it.rot || 0) + dir * -22 * (1 - t);
        it.alpha = (it.alpha ?? 1) * clamp(p / tI * 3);
      } else {
        const t = (p - tI) / (1 - tI), dec = Math.pow(1 - t, 2);
        it.x += J.rs(env.cut.seed | 0, env.step, 1) * size * 0.05 * dec;
        it.y += J.rs(env.cut.seed | 0, env.step, 2) * size * 0.03 * dec;
        scaleAbout(it, 1 - 0.05 * Math.exp(-t * 9) * (1 - t), b);
        const lt = clamp(t / 0.7);
        if (lt < 1) postLocal(it, (env2, bb, x, A) => {
          const m = size * 0.28, rx = bb.w / 2 + m, ry = bb.h / 2 + m, e = oQuart(lt), a = (1 - lt) * A;
          const L = size * 0.42, lw = Math.max(2, size * 0.05);
          const N = glyphN(x) <= 1 ? 6 : 12;
          for (let k = 0; k < N; k++) {
            const an = (k / N) * TAU + 0.26, c = Math.cos(an), s = Math.sin(an), r0 = 1 + 0.08 * e;
            const x0 = bb.cx + c * rx * r0 + c * L * 0.6 * e, y0 = bb.cy + s * ry * r0 + s * L * 0.6 * e;
            env2.line([[x0, y0], [x0 + c * L * (1 - e * 0.6), y0 + s * L * (1 - e * 0.6)]], env2.sc.accent, lw, a, false);
          }
        });
      }
    },
  },
};

for (const k of Object.keys(DEFS)) J.register('enter', k, DEFS[k], P);
})();
