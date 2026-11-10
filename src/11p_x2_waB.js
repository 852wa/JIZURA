/* JIZURA pack: x2waB — 追加分2 和風: 9 entrances, 8 exits, 5 holds, 5 treatments, 3 camera moves, 6 screen accents and
   3 transitions built on traditional Japanese objects and gestures (襖, 掛け軸, 御簾, 判子, 提灯, 紙吹雪, 花火, 折り紙, 青海波,
   障子, 墨, 花びら, 霞, 風呂敷, 折り鶴, 煙玉, 灯籠, 風鈴, 鹿威し, 神輿, 短冊, 落款, 金箔, 帯, 便箋, 屏風, 拍子木, 定式幕, 巻物, 回り舞台).
   Every def carries wa: true. Flat shapes in the scheme colours only; deterministic (it.seed / cut seed / event time).
   Graphics of enter / exit recipes live in item-local space (origin at it.x / it.y, before rotation). */
(() => {
'use strict';
const E = J.E;
const P = 'x2waB';
const DEG = J.DEG, TAU = J.TAU, PI = Math.PI;
const clamp = J.clamp, lerp = J.lerp;
const BIG = 9000;
const HIDE = Object.freeze({ hide: true });
const reg = (g, k, d) => J.register(g, k, Object.assign({ wa: true }, d), P);

/* ---------------- easing ---------------- */
const oCubic = x => 1 - Math.pow(1 - clamp(x), 3);
const ioCubic = x => { x = clamp(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const oBack = (x, s = 1.7) => { x = clamp(x); return x <= 0 ? 0 : x >= 1 ? 1 : E.outBack(x, s); };
const sstep = (a, b, x) => J.smooth(a, b, x);
const bell = k => Math.sin(PI * clamp(k));
const frac = x => x - Math.floor(x);
// k = 0..1 order fraction, spread = share of the motion used for staggering
const stg = (p, k, spread) => clamp((p - spread * k) / (1 - spread));

/* ---------------- colours (scheme colours only) ---------------- */
const isHex = c => typeof c === 'string' && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(c);
const ctr = (a, b) => J.contrast(a, b);
const isDark = c => J.lum(c) < 0.45;
const firstOK = (list, test, fb) => { for (const c of list) if (isHex(c) && test(c)) return c; return fb; };
const colOf = it => (isHex(it.color) ? it.color : '#ffffff');
const mixC = (a, b, t) => (isHex(a) && isHex(b) ? J.mix(a, b, clamp(t)) : (t < 0.5 ? a : b));
// an accent that differs from the item's own colour
const hotOf = (env, it) => { const sc = env.sc; return it.color === sc.accent ? firstOK([sc.accent2, sc.fg], () => true, '#ffffff') : firstOK([sc.accent, sc.fg], () => true, '#ffffff'); };
// vermilion-seal / cloth colour: an accent that reads on the background and is not the text colour
const sealOf = (sc, col) => firstOK([sc.accent, sc.accent2], c => c !== col && ctr(c, sc.bg) >= 1.5, firstOK([sc.accent, sc.accent2, sc.fg], c => c !== col, sc.fg));
// paper tone: a step away from the background
const paperOf = sc => J.mix(sc.bg, sc.fg, isDark(sc.bg) ? 0.16 : 0.1);
// quiet line colour for secondary graphics
const quietOf = (sc, col) => firstOK([sc.sub], c => ctr(c, sc.bg) >= 1.4, J.mix(sc.bg, col, 0.5));
const inkOf = sc => firstOK([sc.ink, sc.fg], c => ctr(c, sc.bg) >= 1.6, sc.fg);
const popOf = sc => firstOK([sc.accent, sc.accent2, sc.fg], c => ctr(c, sc.bg) > 1.6, sc.fg);
const shadeOf = sc => (isDark(sc.bg) ? '#000000' : (isDark(sc.ink) ? sc.ink : (isDark(sc.fg) ? sc.fg : '#111111')));
const lightOf = sc => (isDark(sc.bg) ? sc.fg : '#ffffff');

/* ---------------- item helpers ---------------- */
const isSp = ch => ch === ' ' || ch === '　';
const glyphN = t => [...String(t || '').replace(/\s/g, '')].length;
const cutN = env => Math.max(1, glyphN(env.cut && env.cut.text));
// helper graphics only go on real lyric items (not faded / outline copies, not one glyph of a lyric set glyph by glyph)
const solid = it => (it.alpha ?? 1) >= 0.85 && it.fill !== false;
const isMain = (it, env) => solid(it) && !(glyphN(it.text) <= 1 && cutN(env) > 2);
const dirOf = (env, salt) => (J.r(env.cut.seed | 0, salt, 5) < 0.5 ? -1 : 1);
const cphase = (env, m = 97) => (((env.cut && env.cut.seed) | 0) % m) / m;       // 0..1, the same for every item of a cut
const motionK = env => clamp((env.fx && env.fx.motion != null ? env.fx.motion : 0.7) / 0.7, 0, 1.6);
// running index of a glyph: within the item, or the item's motion index when every glyph is its own item
const seqOf = (env, it) => { const single = glyphN(it.text) <= 1 && cutN(env) > 1, mi = Math.round(+it.mi || 0); return i => (single ? mi : i); };
const gp = (g, x) => [(g.x + g.vx) * (x.sx || 1), (g.y + g.vy) * (x.sy || 1)];

function addPre(it, fn) { const prev = it.pre; it.pre = prev ? (env, x) => { prev(env, x); fn(env, x); } : fn; }
function addPost(it, fn) { const prev = it.post; it.post = prev ? (env, x, bb) => { prev(env, x, bb); fn(env, x, bb); } : fn; }
const STRIP = { pieceFn: null, streak: null, echo: null, pre: null, post: null, clipFn: null, clip: null, clipY: null, bands: null, vbands: null, wipeBar: null, cursorAt: null };
function copyDraw(env, x, extra) {
  const fns = x.charFns || [];
  return J.drawItem(env, Object.assign({}, x, STRIP, { charFn: fns.length ? J.combineChar(fns) : null }, extra || {}));
}

/* ---------------- geometry (item-local space) ---------------- */
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
/* graphics after / before the item, in item-local coords: fn(env, box, item, itemAlpha). keep: also run when the item is invisible */
function hookLocal(add, it, fn, keep) {
  add(it, (env, x) => {
    const A = clamp(x.alpha ?? 1); if (!keep && A <= 0.01) return;
    const b = box(x), ctx = env.ctx; ctx.save(); toLocal(ctx, x);
    try { fn(env, b, x, A); } finally { ctx.restore(); ctx.globalAlpha = 1; }
  });
}
const postLocal = (it, fn, keep) => hookLocal(addPost, it, fn, keep);
const preLocal = (it, fn, keep) => hookLocal(addPre, it, fn, keep);
/* (u, v) frame of the padded box: u runs along the reading direction, v across it */
function uv(it, b, m) {
  const vert = !!it.vertical; m = m == null ? it.size * 0.2 : m;
  const U0 = (vert ? b.y0 : b.x0) - m, U1 = (vert ? b.y1 : b.x1) + m, V0 = (vert ? b.x0 : b.y0) - m, V1 = (vert ? b.x1 : b.y1) + m;
  return { vert, U0, U1, V0, V1, L: U1 - U0, T: V1 - V0, uc: (U0 + U1) / 2, vc: (V0 + V1) / 2 };
}
const P2 = (g, u, v) => (g.vert ? [v, u] : [u, v]);
const rectUV = (ctx, g, u0, v0, u1, v1) => { if (u1 <= u0 || v1 <= v0) return; if (g.vert) ctx.rect(v0, u0, v1 - v0, u1 - u0); else ctx.rect(u0, v0, u1 - u0, v1 - v0); };
const eRect = (env, g, u0, v0, u1, v1, col, a) => { if (u1 <= u0 || v1 <= v0 || a <= 0.004) return; if (g.vert) env.rect(v0, u0, v1 - v0, u1 - u0, col, a, false); else env.rect(u0, v0, u1 - u0, v1 - v0, col, a, false); };
const rot2 = (x, y, r) => { const c = Math.cos(r), s = Math.sin(r); return [x * c - y * s, x * s + y * c]; };
/* scale / rotate the item about the centre of its box (not about its anchor) */
function scaleAbout(it, k, b) {
  const [dx, dy] = rot2(b.cx * (1 - k), b.cy * (1 - k), (it.rot || 0) * DEG);
  it.x += dx; it.y += dy; it.size *= k; it._m = null;
}
function rotAbout(it, deg, b) {
  if (!deg) return;
  const r0 = (it.rot || 0) * DEG, [ax, ay] = rot2(b.cx, b.cy, r0), [bx, by] = rot2(b.cx, b.cy, r0 + deg * DEG);
  it.x += ax - bx; it.y += ay - by; it.rot = (it.rot || 0) + deg;
}
const lineW = it => Math.max(2, it.size * 0.03);

/* =====================================================================
   ENTER
   ===================================================================== */

/* 襖びらき — two sliding paper doors (frame, stile, round pull) stand closed over the line, then slide apart into the sides */
reg('enter', 'wzFusuma', {
  name: '襖びらき', en: 'Sliding Doors', tags: ['calm', 'editorial', 'emotional', 'graphic'], w: 1.1, ae: 'wipe',
  inDur: dur => clamp(dur * 0.45, 0.25, 0.85),
  apply(env, it, p) {
    const size = it.size, show = oCubic(p / 0.2), e = ioCubic((p - 0.16) / 0.72), fade = 1 - sstep(0.8, 1, p);
    const geo = (x, b) => { const g = uv(x, b, size * 0.28); return { g, h: g.L / 2 * e }; };
    clipLocal(it, (ctx, b, x) => { const { g, h } = geo(x, b); rectUV(ctx, g, g.uc - h, g.V0 - size * 2, g.uc + h, g.V1 + size * 2); });
    if (!isMain(it, env)) return;
    postLocal(it, (env2, b, x, A) => {
      const { g, h } = geo(x, b), sc = env2.sc, col = colOf(x), paper = paperOf(sc), acc = hotOf(env2, x);
      const a = A * fade * clamp(show * 1.5); if (a <= 0.01) return;
      const vh = g.T / 2 * show, v0 = g.vc - vh, v1 = g.vc + vh, lw = lineW(x);
      for (const sd of [-1, 1]) {
        const uIn = g.uc + sd * h, uOut = sd < 0 ? g.U0 : g.U1, u0 = Math.min(uIn, uOut), u1 = Math.max(uIn, uOut);
        if (u1 - u0 < 0.5) continue;
        eRect(env2, g, u0, v0, u1, v1, paper, a);
        eRect(env2, g, u0, v0, u1, v0 + lw, col, a); eRect(env2, g, u0, v1 - lw, u1, v1, col, a);          // rails
        eRect(env2, g, sd < 0 ? u1 - lw : u0, v0, sd < 0 ? u1 : u0 + lw, v1, col, a);                       // meeting stile
        const um = (u0 + u1) / 2; eRect(env2, g, um - lw * 0.3, v0, um + lw * 0.3, v1, col, a * 0.55);      // second leaf
        if (u1 - u0 > size * 0.7) { const [hx, hy] = P2(g, uIn - sd * size * 0.36, g.vc); env2.circle(hx, hy, size * 0.085 * show, null, acc, lw * 0.75, a, false); }
      }
    });
  } });

/* 掛け軸 — a hanging scroll: the top bar appears, then the weighted rod rolls down and lets the text out line by line */
reg('enter', 'wzKakejiku', {
  name: '掛け軸', en: 'Hanging Scroll', tags: ['calm', 'editorial', 'emotional'], w: 1, ae: 'wipe',
  inDur: dur => clamp(dur * 0.48, 0.25, 0.9),
  apply(env, it, p) {
    const size = it.size, top = oCubic(p / 0.2), e = ioCubic((p - 0.12) / 0.72), fade = 1 - sstep(0.84, 1, p), m = size * 0.3;
    const yOf = b => lerp(b.y0 - m, b.y1 + m, e);
    clipLocal(it, (ctx, b) => { if (e > 0) ctx.rect(b.x0 - size * 3, b.y0 - size * 3, b.w + size * 6, yOf(b) - (b.y0 - size * 3)); });
    if (!isMain(it, env)) return;
    postLocal(it, (env2, b, x, A) => {
      const a = A * fade; if (a <= 0.01) return;
      const col = colOf(x), acc = hotOf(env2, x), cx = b.cx, hw = (b.w / 2 + m) * top, y0 = b.y0 - m, y = yOf(b), lw = lineW(x), rod = Math.max(4, size * 0.085);
      env2.rect(cx - hw, y0 - lw, hw * 2, lw, col, a, false);                                             // top bar
      env2.line([[cx - size * 0.32 * top, y0 - lw], [cx, y0 - lw - size * 0.26 * top], [cx + size * 0.32 * top, y0 - lw]], col, lw * 0.5, a * 0.8, false);   // cord
      if (y - y0 > 1) { env2.rect(cx - hw, y0, lw * 0.4, y - y0, col, a * 0.45, false); env2.rect(cx + hw - lw * 0.4, y0, lw * 0.4, y - y0, col, a * 0.45, false); }
      env2.rrect(cx - hw - rod * 0.4, y - rod / 2, hw * 2 + rod * 0.8, rod, rod / 2, col, a * clamp(top * 2), false);   // roller
      env2.rect(cx - hw - rod * 1.3, y - rod * 0.72, rod * 0.9, rod * 1.44, acc, a * top, false);
      env2.rect(cx + hw + rod * 0.4, y - rod * 0.72, rod * 0.9, rod * 1.44, acc, a * top, false);
    });
  } });

/* 御簾上げ — the text is first seen through the slats of a bamboo blind, which is then drawn up: the slats bunch at the top */
reg('enter', 'wzMisu', {
  name: '御簾上げ', en: 'Blind Lifts', tags: ['calm', 'emotional', 'editorial'], w: 1, ae: 'wipe',
  inDur: dur => clamp(dur * 0.5, 0.3, 0.9),
  apply(env, it, p) {
    const size = it.size, show = clamp(p / 0.16), e = ioCubic((p - 0.14) / 0.66), fade = 1 - sstep(0.8, 1, p), m = size * 0.22;
    const main = isMain(it, env);
    it.alpha = (it.alpha ?? 1) * show;
    const geo = b => {
      const y0 = b.y0 - m, y1 = b.y1 + m, N = Math.round(clamp((y1 - y0) / (size * 0.14), 6, 40)), pitch = (y1 - y0) / N, th = pitch * 0.5, bp = th * 0.4;
      const yb = lerp(y1, y0, e), ys = [];
      for (let i = 0; i < N; i++) ys.push(Math.min(y0 + (i + 0.5) * pitch, yb - (N - 1 - i) * bp - th / 2));
      return { y0, y1, N, th, yb, ys };
    };
    clipLocal(it, (ctx, b) => {
      const G = geo(b), xa = b.x0 - size * 3, w = b.w + size * 6;
      ctx.rect(xa, G.yb, w, G.y1 + size * 3 - G.yb);
      for (let i = 0; i < G.N - 1; i++) { const a0 = G.ys[i] + G.th / 2, a1 = G.ys[i + 1] - G.th / 2; if (a1 - a0 > 0.3) ctx.rect(xa, a0, w, a1 - a0); }
      const t0 = G.ys[0] - G.th / 2; if (t0 > G.y0 - size * 3) ctx.rect(xa, G.y0 - size * 3, w, t0 - (G.y0 - size * 3));
    });
    if (!main) return;
    postLocal(it, (env2, b, x, A) => {
      const a = A * fade; if (a <= 0.01) return;
      const G = geo(b), sc = env2.sc, col = colOf(x), slat = quietOf(sc, col), acc = hotOf(env2, x), x0 = b.x0 - m, w = b.w + m * 2;
      for (let i = 0; i < G.N; i++) env2.rect(x0, G.ys[i] - G.th / 2, w, G.th, slat, a * 0.9, false);
      const top = G.ys[0] - G.th, cw = Math.max(2, size * 0.035);
      for (const f of (w > size * 2.4 ? [0.2, 0.8] : [0.5])) {
        const cx = x0 + w * f;
        env2.rect(cx - cw / 2, top, cw, G.yb - top, acc, a, false);
        env2.rect(cx - cw * 1.4, G.yb, cw * 2.8, size * 0.14, acc, a, false);                             // tassel
      }
    });
  } });

/* 判子 — pressed like a seal: the line lands white-on-vermilion, then the block lifts off in uneven patches and leaves the text */
reg('enter', 'wzHanko', {
  name: '判子', en: 'Seal Press', tags: ['graphic', 'pop', 'editorial'], w: 0.7, ae: 'pop',
  inDur: dur => clamp(dur * 0.45, 0.25, 0.8),
  apply(env, it, p) {
    const size = it.size, sc = env.sc, main = isMain(it, env), seed = it.seed | 0, tI = 0.26, dir = dirOf(env, 11);
    const down = E.inQuad(clamp(p / tI)), t = clamp((p - tI) / (1 - tI)), own = colOf(it);
    scaleAbout(it, p < tI ? lerp(1.2, 1, down) : 1 - 0.035 * Math.exp(-t * 10) * (1 - t), box(it));
    rotAbout(it, dir * -5 * (1 - down), box(it));
    it.alpha = (it.alpha ?? 1) * clamp(p / 0.1);
    if (!main) return;
    const seal = sealOf(sc, own), knock = ctr(sc.bg, seal) >= 1.6 ? sc.bg : (isDark(seal) ? '#ffffff' : '#000000');
    const lift = sstep(0.4, 0.96, p);
    if (isHex(it.color)) it.color = J.mix(knock, own, sstep(0.45, 0.85, p));
    preLocal(it, (env2, b, x, A) => {
      const m = size * 0.2, x0 = b.x0 - m, y0 = b.y0 - m, w = b.w + m * 2, h = b.h + m * 2;
      const cols = Math.round(clamp(w / (size * 0.4), 2, 16)), rows = Math.round(clamp(h / (size * 0.4), 2, 7)), cw = w / cols, chh = h / rows;
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
        const r1 = J.r(seed, i, j, 201), a = (0.84 + 0.16 * J.r(seed, i, j, 202)) * (1 - sstep(r1 * 0.68, r1 * 0.68 + 0.3, lift));
        if (a <= 0.01) continue;
        const ex = size * 0.045, ix0 = i === 0 ? J.r(seed, j, 203) * ex : 0, ix1 = i === cols - 1 ? J.r(seed, j, 204) * ex : 0;
        const iy0 = j === 0 ? J.r(seed, i, 205) * ex : 0, iy1 = j === rows - 1 ? J.r(seed, i, 206) * ex : 0;
        env2.rect(x0 + i * cw + ix0, y0 + j * chh + iy0, cw - ix0 - ix1 + 0.6, chh - iy0 - iy1 + 0.6, seal, A * a, false);
      }
    });
  } });

/* 提灯ともし — paper lanterns light up one after another along the line; each glyph glows warm inside its lantern, which then fades */
reg('enter', 'wzChochin', {
  name: '提灯ともし', en: 'Lanterns Light', tags: ['emotional', 'calm', 'pop'], w: 1, ae: 'flicker',
  inDur: (dur, n) => clamp(dur * 0.5, 0.3, 1.0),
  apply(env, it, p) {
    const size = it.size, seed = it.seed | 0, own = colOf(it), warm = hotOf(env, it), step = env.step, hex = isHex(it.color);
    const qf = (i, n) => stg(p, n > 1 ? i / (n - 1) : 0, 0.6);
    it.charFns.push((i, g, n) => {
      const q = qf(i, n); if (q <= 0) return HIDE; if (q >= 1) return null;
      const fl = q < 0.45 ? 0.55 + 0.45 * J.r(seed, i, step, 211) : 1, o = { a: clamp(q * 3.5) * fl };
      if (hex) o.color = J.mix(warm, own, sstep(0.45, 1, q));
      return o;
    });
    if (!isMain(it, env)) return;
    preLocal(it, (env2, b, x, A) => {
      if (env2.pass !== 'main') return;
      const ctx = env2.ctx, lay = J.layoutText(x), n = lay.N, lw = Math.max(1.5, size * 0.018);
      for (const g of lay) {
        if (isSp(g.ch)) continue;
        const q = qf(g.i, n); if (q <= 0 || q >= 1) continue;
        const L = clamp(q * 4) * (1 - sstep(0.5, 1, q)); if (L <= 0.01) continue;
        const [gx, gy] = gp(g, x), rx = Math.max(g.w * (x.sx || 1), size * 0.6) * 0.6, ry = Math.max(g.h * (x.sy || 1), size * 0.6) * 0.7, cap = size * 0.07;
        ctx.beginPath(); ctx.ellipse(gx, gy, rx, ry, 0, 0, TAU);
        ctx.globalAlpha = A * L * 0.2; ctx.fillStyle = warm; ctx.fill();
        ctx.globalAlpha = A * L * 0.9; ctx.strokeStyle = warm; ctx.lineWidth = lw; ctx.stroke();
        ctx.beginPath();
        for (const k of [-0.5, 0, 0.5]) { const hw = rx * Math.sqrt(1 - k * k); ctx.moveTo(gx - hw, gy + k * ry); ctx.lineTo(gx + hw, gy + k * ry); }
        ctx.globalAlpha = A * L * 0.45; ctx.stroke();
        ctx.globalAlpha = A * L * 0.9; ctx.fillStyle = warm;
        ctx.fillRect(gx - rx * 0.42, gy - ry - cap, rx * 0.84, cap); ctx.fillRect(gx - rx * 0.42, gy + ry, rx * 0.84, cap);
      }
      ctx.globalAlpha = 1;
    });
  } });

/* 紙吹雪 — paper confetti flutters down and settles where each glyph belongs; the glyph surfaces as its flakes land */
reg('enter', 'wzKamifubuki', {
  name: '紙吹雪', en: 'Paper Confetti', tags: ['pop', 'emotional'], w: 0.9, ae: 'drop',
  inDur: dur => clamp(dur * 0.55, 0.35, 1.0),
  apply(env, it, p) {
    const size = it.size, seed = it.seed | 0, sc = env.sc;
    const qf = i => stg(p, J.r(seed, i, 221), 0.36);
    it.charFns.push((i) => {
      const q = qf(i); if (q <= 0.5) return HIDE; if (q >= 1) return null;
      return { a: sstep(0.5, 0.85, q), s: lerp(0.82, 1, oCubic((q - 0.5) / 0.5)) };
    });
    if (!solid(it)) return;
    postLocal(it, (env2, b, x, A) => {
      const lay = J.layoutText(x), n = Math.max(1, lay.N), K = Math.round(clamp(90 / n, 2, 5)), cols = [hotOf(env2, x), sc.accent2 || sc.accent, colOf(x), quietOf(sc, colOf(x))];
      for (const g of lay) {
        if (isSp(g.ch)) continue;
        const q = qf(g.i); if (q <= 0 || q >= 1) continue;
        const [gx, gy] = gp(g, x), out = 1 - sstep(0.68, 1, q);
        for (let k = 0; k < K; k++) {
          const r1 = J.r(seed, g.i, k, 222), tf = clamp(q / 0.62 * (0.78 + 0.22 * r1)), ef = 1 - Math.pow(1 - tf, 1.5), ph = J.r(seed, g.i, k, 223) * TAU;
          const tx = gx + J.rs(seed, g.i, k, 224) * g.w * (x.sx || 1) * 0.32, ty = gy + J.rs(seed, g.i, k, 225) * g.h * (x.sy || 1) * 0.32;
          const px = tx + (1 - ef) * J.rs(seed, g.i, k, 226) * size * 1.5 + Math.sin(tf * 9 + ph) * size * 0.24 * (1 - tf);
          const py = ty - (1 - ef) * size * (1.5 + 1.7 * J.r(seed, g.i, k, 227));
          const a = A * clamp(tf * 5) * out; if (a <= 0.01) continue;
          const rot = ph + tf * 8, fl = Math.cos(tf * 11 + ph), hw = size * 0.075 * (0.25 + 0.75 * Math.abs(fl)), hh = size * 0.048, c = Math.cos(rot), s = Math.sin(rot);
          env2.poly([[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]].map(([u, v]) => [px + u * c - v * s, py + u * s + v * c]), cols[(g.i + k) % 4], a, false);
        }
      }
    });
  } });

/* 打ち上げ花火 — a spark climbs to each glyph's place and bursts into a ring of streaks; the glyph pops out of the burst */
reg('enter', 'wzHanabi', {
  name: '打ち上げ花火', en: 'Fireworks', tags: ['pop', 'emotional', 'graphic'], w: 0.8, ae: 'pop', minDur: 0.7,
  inDur: dur => clamp(dur * 0.55, 0.4, 1.0),
  apply(env, it, p) {
    const size = it.size, seed = it.seed | 0, sc = env.sc, tB = 0.32;
    const qf = (i, n) => stg(p, (n > 1 ? i / (n - 1) : 0) * 0.65 + J.r(seed, i, 231) * 0.35, 0.42);
    it.charFns.push((i, g, n) => {
      const q = qf(i, n); if (q <= tB) return HIDE; if (q >= 1) return null;
      const u = (q - tB) / (1 - tB);
      return { s: lerp(0.3, 1, oBack(u / 0.6, 1.9)), a: clamp(u * 4) };
    });
    if (!solid(it)) return;
    postLocal(it, (env2, b, x, A) => {
      const lay = J.layoutText(x), n = lay.N, R = n > 12 ? 8 : 12, c1 = hotOf(env2, x), c2 = firstOK([sc.accent2], c => c !== c1, colOf(x));
      for (const g of lay) {
        if (isSp(g.ch)) continue;
        const q = qf(g.i, n); if (q <= 0 || q >= 1) continue;
        const [gx, gy] = gp(g, x), col = g.i % 2 ? c2 : c1;
        if (q < tB) {
          const t = q / tB, e = oCubic(t), y = gy + size * 1.5 * (1 - e), a = A * clamp(t * 6);
          env2.line([[gx, y], [gx, y + size * 0.4 * (1 - t) + 2]], col, Math.max(1.5, size * 0.022), a * 0.8, false);
          env2.circle(gx, y, size * 0.035, col, null, 1, a, false);
        } else {
          const u = (q - tB) / (1 - tB), a = A * (1 - sstep(0.4, 1, u)); if (a <= 0.01) continue;
          const r0 = size * (0.2 + 0.72 * E.outExpo(u)), len = size * 0.24 * (1 - u) + 1, droop = size * 0.16 * u * u, o = J.r(seed, g.i, 232) * TAU;
          for (let k = 0; k < R; k++) {
            const an = o + k / R * TAU, c = Math.cos(an), s = Math.sin(an), rr = r0 * (k % 2 ? 0.72 : 1);
            env2.line([[gx + c * rr, gy + s * rr + droop], [gx + c * (rr + len), gy + s * (rr + len) + droop]], k % 2 ? c2 : c1, Math.max(1.5, size * 0.024), a, false);
          }
        }
      }
    });
  } });

/* 折り紙 — every glyph sits on a folded paper square: a quarter shows first, the right half swings out, then the lower half folds down */
reg('enter', 'wzOrigami', {
  name: '折り紙ひらき', en: 'Origami Unfold', tags: ['graphic', 'pop', 'editorial'], w: 0.9, ae: 'slice',
  inDur: dur => clamp(dur * 0.5, 0.3, 0.95),
  apply(env, it, p) {
    const size = it.size, sc = env.sc, F = 0.78;
    const qf = (i, n) => stg(p, n > 1 ? i / (n - 1) : 0, 0.5);
    // stage values of one glyph: pop scale, right edge and lower edge of the opened paper (fractions of the half square)
    const st = q => ({ s: lerp(0.4, 1, oBack(q / 0.2, 1.6)), x1: ioCubic((q - 0.2) / 0.38), y1: ioCubic((q - 0.58) / 0.42) });
    it.charFns.push((i, g, n) => {
      const q = qf(i, n); if (q <= 0) return HIDE; if (q >= 1) return null;
      const S = st(q);
      return { s: S.s, a: clamp(q * 8), clipX: [-F, F * S.x1], clipY: [-F, F * S.y1] };
    });
    if (!isMain(it, env)) return;
    const papers = [hotOf(env, it), firstOK([sc.accent2], () => true, sc.accent), quietOf(sc, colOf(it))];
    preLocal(it, (env2, b, x, A) => {
      const lay = J.layoutText(x), n = lay.N, col = colOf(x), lw = Math.max(1, size * 0.012);
      for (const g of lay) {
        if (isSp(g.ch)) continue;
        const q = qf(g.i, n); if (q <= 0 || q >= 1) continue;
        const S = st(q), [gx, gy] = gp(g, x), hs = Math.max(g.w * (x.sx || 1), g.h * (x.sy || 1)) * 0.56 * S.s, a = A * clamp(q * 8) * (1 - sstep(0.8, 1, q));
        if (a <= 0.01) continue;
        const X1 = hs * S.x1, Y1 = hs * S.y1, pc = papers[g.i % 3];
        env2.rect(gx - hs, gy - hs, hs + X1, hs + Y1, pc, a * 0.3, false);
        if (S.x1 > 0 && S.x1 < 1) env2.rect(gx, gy - hs, X1, hs, col, a * 0.22 * (1 - S.x1), false);          // the flap still swinging
        if (S.y1 > 0 && S.y1 < 1) env2.rect(gx - hs, gy, hs * 2, Y1, col, a * 0.22 * (1 - S.y1), false);
        if (S.x1 > 0) env2.rect(gx - lw / 2, gy - hs, lw, hs + Y1, col, a * 0.5, false);                       // creases
        if (S.y1 > 0) env2.rect(gx - hs, gy - lw / 2, hs + X1, lw, col, a * 0.5, false);
      }
    });
  } });

/* 青海波 — the reveal rises from below as rows of overlapping wave scales, each drawn with its double arc */
reg('enter', 'wzSeigaiha', {
  name: '青海波', en: 'Wave Scales', tags: ['calm', 'graphic', 'emotional'], w: 1, ae: 'wipe',
  inDur: dur => clamp(dur * 0.5, 0.3, 0.95),
  apply(env, it, p) {
    const size = it.size;
    const each = (b, fn) => {
      const m = size * 0.25, x0 = b.x0 - m, x1 = b.x1 + m, y0 = b.y0 - m, y1 = b.y1 + m;
      const r = Math.max(size * 0.36, Math.sqrt((x1 - x0) * (y1 - y0) / 140)), dx = r * 1.5, dy = r * 0.62;
      const rows = Math.ceil((y1 - y0) / dy) + 2, cols = Math.ceil((x1 - x0) / dx) + 2;
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
        const q = stg(p, (j / Math.max(1, rows - 1)) * 0.75 + (i / Math.max(1, cols - 1)) * 0.25, 0.62);
        if (q > 0) fn(x0 + (i - 0.5 + (j % 2 ? 0.5 : 0)) * dx, y1 + r * 0.4 - j * dy, r * 1.32 * oCubic(q), q);
      }
    };
    clipLocal(it, (ctx, b) => each(b, (cx, cy, R) => { ctx.moveTo(cx + R, cy); ctx.arc(cx, cy, R, 0, TAU); }));
    if (!isMain(it, env)) return;
    postLocal(it, (env2, b, x, A) => {
      const col = hotOf(env2, x), lw = Math.max(1.5, size * 0.022);
      each(b, (cx, cy, R, q) => {
        if (q >= 1) return;
        const a = A * (1 - q) * 0.9;
        env2.arc(cx, cy, R, 180, 360, col, lw, a, false);
        env2.arc(cx, cy, R * 0.62, 180, 360, col, lw * 0.7, a * 0.7, false);
      });
    });
  } });

/* =====================================================================
   EXIT
   ===================================================================== */

/* 障子の影 — a shoji screen slides across; behind its paper the line lingers as a soft shadow until the light goes out */
reg('exit', 'wzShojiKage', {
  name: '障子の影', en: 'Shoji Silhouette', tags: ['calm', 'emotional', 'editorial'], w: 1, ae: 'wipe', minDur: 0.8,
  outDur: dur => clamp(dur * 0.48, 0.45, 1.0),
  apply(env, it, p) {
    const size = it.size, dir = dirOf(env, 21), main = isMain(it, env), e = ioCubic(p / (main ? 0.5 : 0.92)), sil = 1 - sstep(0.42, 0.8, p), pa = 1 - sstep(0.74, 1, p), A0 = it.alpha ?? 1;
    const edge = g => (dir > 0 ? lerp(g.U0, g.U1, e) : lerp(g.U1, g.U0, e));
    if (e >= 1) it.alpha = 0;
    else clipLocal(it, (ctx, b, x) => { const g = uv(x, b, size * 0.25), eu = edge(g); if (dir > 0) rectUV(ctx, g, eu, g.V0 - BIG, g.U1 + BIG, g.V1 + BIG); else rectUV(ctx, g, g.U0 - BIG, g.V0 - BIG, eu, g.V1 + BIG); });
    if (!main) return;
    addPost(it, (env2, x) => {
      if (env2.pass !== 'main' || pa <= 0.01) return;
      const ctx = env2.ctx, b = box(x), g = uv(x, b, size * 0.25), eu = edge(g), c0 = dir > 0 ? g.U0 : eu, c1 = dir > 0 ? eu : g.U1;
      if (c1 - c0 < 0.5) return;
      const sc = env2.sc, col = colOf(x), paper = paperOf(sc), lw = Math.max(1.5, size * 0.02);
      ctx.save(); toLocal(ctx, x); eRect(env2, g, c0, g.V0, c1, g.V1, paper, A0 * pa * 0.97); ctx.restore();
      if (sil > 0.01) {                                                                                   // the text as a shadow on the paper
        ctx.save(); ctx.beginPath(); ctx.save(); toLocal(ctx, x); rectUV(ctx, g, c0, g.V0, c1, g.V1); ctx.restore(); ctx.clip();
        copyDraw(env2, x, { color: J.mix(paper, isDark(sc.bg) ? '#000000' : col, 0.6), alpha: A0 * sil * pa * 0.75, blur: env2.allowFilter ? size * 0.03 : 0, shadow: null, extrude: null, gradient: null, pattern: null, stroke: 0 });
        ctx.restore();
      }
      ctx.save(); toLocal(ctx, x);
      const a = A0 * pa * 0.85, nv = Math.max(2, Math.round(g.T / (size * 0.5))), cu = size * 0.78;
      for (let k = 1; k < nv; k++) { const v = g.V0 + g.T * k / nv; eRect(env2, g, c0, v - lw * 0.35, c1, v + lw * 0.35, col, a * 0.7); }
      for (let j = 1; j < 60; j++) { const u = eu - dir * j * cu; if (u <= c0 || u >= c1) break; eRect(env2, g, u - lw * 0.35, g.V0, u + lw * 0.35, g.V1, col, a * 0.7); }
      eRect(env2, g, c0, g.V0, c1, g.V0 + lw, col, a); eRect(env2, g, c0, g.V1 - lw, c1, g.V1, col, a);
      eRect(env2, g, Math.max(c0, Math.min(c1 - lw * 1.6, dir > 0 ? eu - lw * 1.6 : eu)), g.V0, Math.min(c1, dir > 0 ? eu : eu + lw * 1.6), g.V1, col, a);
      ctx.restore(); ctx.globalAlpha = 1;
    });
  } });

/* 墨にじみ — each glyph bleeds into the paper: it swells into an irregular ink blot that thins out to nothing */
reg('exit', 'wzSumiNijimi', {
  name: '墨にじみ', en: 'Ink Bleeds Away', tags: ['calm', 'emotional'], w: 1, ae: 'blur',
  outDur: dur => clamp(dur * 0.48, 0.4, 1.0),
  apply(env, it, p) {
    const size = it.size, seed = it.seed | 0, col = colOf(it), idx = seqOf(env, it);
    const qf = i => stg(p, J.r(seed, idx(i), 31), 0.45);
    it.charFns.push((i) => { const q = qf(i); if (q <= 0) return null; if (q >= 1) return HIDE; return { a: 1 - sstep(0.05, 0.5, q), s: 1 + 0.12 * q }; });
    if (!solid(it)) return;
    postLocal(it, (env2, b, x, A) => {
      const lay = J.layoutText(x);
      for (const g of lay) {
        if (isSp(g.ch)) continue;
        const q = qf(g.i); if (q <= 0 || q >= 1) continue;
        const [gx, gy] = gp(g, x), R = Math.max(g.w * (x.sx || 1), g.h * (x.sy || 1)) * lerp(0.2, 0.72, oCubic(q));
        const a = A * Math.min(1, q * 3.2) * Math.pow(1 - q, 1.3) * 0.9; if (a <= 0.01) continue;
        const pts = [];
        for (let k = 0; k < 10; k++) { const an = k / 10 * TAU, rr = R * (0.76 + 0.34 * J.r(seed, g.i, k, 32) + 0.12 * q * J.rs(seed, g.i, k, 33)); pts.push([gx + Math.cos(an) * rr, gy + Math.sin(an) * rr]); }
        env2.blob(pts, col, a, false);
        for (let k = 0; k < 3; k++) { const an = J.r(seed, g.i, k, 34) * TAU, d = R * (1.05 + 0.5 * J.r(seed, g.i, k, 35)); env2.circle(gx + Math.cos(an) * d, gy + Math.sin(an) * d, R * (0.07 + 0.09 * J.r(seed, g.i, k, 36)), col, null, 1, a * 0.8, false); }
      }
    });
  } });

/* 花びらに散る — the glyphs thin out while petals lift off them and ride the wind away */
const PETAL = [[0, -1], [0.58, -0.3], [0.4, 0.75], [0, 0.5], [-0.4, 0.75], [-0.58, -0.3]];
reg('exit', 'wzHanaChiru', {
  name: '花びらに散る', en: 'Scatter as Petals', tags: ['emotional', 'calm', 'pop'], w: 1, ae: 'drift', minDur: 0.8,
  outDur: dur => clamp(dur * 0.52, 0.45, 1.1),
  apply(env, it, p) {
    const size = it.size, seed = it.seed | 0, sc = env.sc, dir = dirOf(env, 41), idx = seqOf(env, it), N = glyphN(it.text) <= 1 ? cutN(env) : 0;
    const qf = (i, n) => { const m = N || n, o = m > 1 ? idx(i) / (m - 1) : 0; return stg(p, clamp(dir > 0 ? 1 - o : o), 0.45); };
    it.charFns.push((i, g, n) => {
      const q = qf(i, n); if (q <= 0) return null; if (q >= 1) return HIDE;
      return { a: 1 - sstep(0.05, 0.5, q), s: 1 - 0.25 * q, dx: dir * size * 0.3 * q * q, dy: -size * 0.08 * q };
    });
    if (!solid(it)) return;
    postLocal(it, (env2, b, x, A) => {
      const lay = J.layoutText(x), n = lay.N, K = Math.round(clamp(90 / Math.max(1, n), 2, 6)), c1 = hotOf(env2, x), c2 = mixC(c1, sc.fg, 0.35), W = env2.W;
      for (const g of lay) {
        if (isSp(g.ch)) continue;
        const q = qf(g.i, n); if (q <= 0) continue;
        const [gx, gy] = gp(g, x);
        for (let k = 0; k < K; k++) {
          const r1 = J.r(seed, g.i, k, 42), t = clamp(q * 1.28 - 0.28 * J.r(seed, g.i, k, 43)); if (t <= 0 || t >= 1) continue;
          const a = A * sstep(0, 0.12, t) * (1 - sstep(0.55, 1, t)); if (a <= 0.01) continue;
          const ph = J.r(seed, g.i, k, 44) * TAU;
          const px = gx + J.rs(seed, g.i, k, 45) * g.w * (x.sx || 1) * 0.3 + dir * (size * 2 + W * 0.1) * Math.pow(t, 1.4) * (0.55 + 0.8 * r1) + Math.sin(t * 7 + ph) * size * 0.18;
          const py = gy + J.rs(seed, g.i, k, 46) * g.h * (x.sy || 1) * 0.3 - size * 0.55 * Math.sin(t * PI * 0.9) * r1 + size * 0.9 * t * t * (0.4 + J.r(seed, g.i, k, 47));
          const rot = ph + t * 6 * (r1 < 0.5 ? -1 : 1), fl = 0.3 + 0.7 * Math.abs(Math.cos(t * 9 + ph)), s = size * 0.12 * (0.7 + 0.6 * J.r(seed, g.i, k, 48)), c = Math.cos(rot), sn = Math.sin(rot);
          env2.poly(PETAL.map(([u, v]) => [px + (u * fl * c - v * sn) * s, py + (u * fl * sn + v * c) * s]), k % 2 ? c2 : c1, a, false);
        }
      }
    });
  } });

/* 霞に隠れる — bands of mist with rounded heads drift in from alternating sides, row by row, until nothing of the line is left */
reg('exit', 'wzKasumi', {
  name: '霞に隠れる', en: 'Veiled by Mist', tags: ['calm', 'emotional', 'editorial'], w: 1.1, ae: 'wipe',
  outDur: dur => clamp(dur * 0.5, 0.42, 1.0),
  apply(env, it, p) {
    const size = it.size, seed = env.cut.seed | 0, m = size * 0.3;
    // rows across the box: [y0, y1, side (+1 = from the left), head x]
    const rowsOf = b => {
      const Y0 = b.y0 - m, Y1 = b.y1 + m, R = Math.round(clamp((Y1 - Y0) / (size * 0.36), 4, 18)), h = (Y1 - Y0) / R, r = h / 2, X0 = b.x0 - m, X1 = b.x1 + m, out = [];
      for (let j = 0; j < R; j++) {
        const sd = (j + (seed & 1)) % 2 ? 1 : -1, e = ioCubic(stg(p, frac(j * 0.618 + J.r(seed, 51)), 0.42));
        out.push({ y0: Y0 + j * h, y1: Y0 + (j + 1) * h, r, sd, e, hx: sd > 0 ? lerp(X0 - r * 2, X1 + 1, e) : lerp(X1 + r * 2, X0 - 1, e), first: j === 0, last: j === R - 1 });
      }
      return out;
    };
    clipLocal(it, (ctx, b, x, env2) => {
      const ov = 0.6 / (env2.scale || 1);
      for (const L of rowsOf(b)) {
        const yT = L.first ? -BIG : L.y0 - ov, yB = L.last ? BIG : L.y1 + ov, yc = (L.y0 + L.y1) / 2;
        if (L.e <= 0) { ctx.rect(-BIG, yT, BIG * 2, yB - yT); continue; }
        if (L.e >= 1) continue;
        if (L.sd > 0) { ctx.moveTo(L.hx, yT); ctx.lineTo(BIG, yT); ctx.lineTo(BIG, yB); ctx.lineTo(L.hx, yB); ctx.lineTo(L.hx, L.y1); ctx.arc(L.hx, yc, L.r, PI / 2, -PI / 2, true); ctx.closePath(); }
        else { ctx.moveTo(-BIG, yT); ctx.lineTo(L.hx, yT); ctx.lineTo(L.hx, L.y0); ctx.arc(L.hx, yc, L.r, -PI / 2, PI / 2, true); ctx.lineTo(L.hx, yB); ctx.lineTo(-BIG, yB); ctx.closePath(); }
      }
    });
    if (!isMain(it, env)) return;
    postLocal(it, (env2, b, x, A) => {
      const lc = quietOf(env2.sc, colOf(x)), lw = Math.max(2, size * 0.026), tail = size * 2.6;
      for (const L of rowsOf(b)) {
        if (L.e <= 0 || L.e >= 1) continue;
        const a = A * sstep(0, 0.12, L.e) * (1 - sstep(0.82, 1, L.e)), yc = (L.y0 + L.y1) / 2, rr = L.r - lw / 2;
        if (L.sd > 0) env2.arc(L.hx, yc, rr, -90, 90, lc, lw, a, false); else env2.arc(L.hx, yc, rr, 90, 270, lc, lw, a, false);
        env2.line([[L.hx, yc - rr], [L.hx - L.sd * tail, yc - rr]], lc, lw, a, false);
        env2.line([[L.hx, yc + rr], [L.hx - L.sd * tail * 0.6, yc + rr]], lc, lw, a, false);
      }
    }, true);
  } });

/* 風呂敷 — four corners of a wrapping cloth fold in over the line one after another; the tied bundle is lifted away */
reg('exit', 'wzFuroshiki', {
  name: '風呂敷包み', en: 'Wrapping Cloth', tags: ['pop', 'graphic', 'editorial'], w: 0.8, ae: 'shrink', minDur: 0.8,
  outDur: dur => clamp(dur * 0.5, 0.45, 1.0),
  apply(env, it, p) {
    const size = it.size, A0 = it.alpha ?? 1, tW = 0.64, dir = dirOf(env, 61);
    if (!isMain(it, env)) { it.alpha = A0 * (1 - sstep(0.25, tW, p)); if (p >= tW) it.alpha = 0; return; }
    const sc = env.sc, cloth = sealOf(sc, colOf(it)), cloth2 = J.mix(cloth, sc.bg, 0.24), seam = J.mix(cloth, shadeOf(sc), 0.35);
    const fold = k => ioCubic(stg(clamp(p / tW), k / 3, 0.5)), wrap = clamp((p - tW) / (1 - tW)), s = 1 - E.inCubic(wrap);
    if (p >= tW) it.alpha = 0;
    addPost(it, (env2, x) => {
      if (env2.pass !== 'main' || s <= 0.003) return;
      const ctx = env2.ctx, b = box(x), mg = size * 0.28, hw = b.w / 2 + mg, hh = b.h / 2 + mg, lw = Math.max(1.5, size * 0.02);
      ctx.save(); toLocal(ctx, x);
      ctx.translate(b.cx, b.cy - size * 0.7 * Math.sin(wrap * PI / 2)); ctx.rotate(dir * 0.3 * wrap); ctx.scale(s, s);
      const flaps = [[[-hw, -hh], [-hw, hh], [-hw, 0]], [[hw, -hh], [hw, hh], [hw, 0]], [[-hw, -hh], [hw, -hh], [0, -hh]], [[-hw, hh], [hw, hh], [0, hh]]];
      flaps.forEach(([p0, p1, mid], k) => {
        const f = fold(k); if (f <= 0.002) return;
        const ap = [mid[0] * (1 - f), mid[1] * (1 - f)];
        env2.poly([p0, p1, ap], k % 2 ? cloth2 : cloth, A0, false);
        env2.line([p0, ap, p1], seam, lw, A0 * 0.8, false);
      });
      if (wrap > 0) {                                                                                     // the knot
        const kk = Math.min(1, wrap * 4), e = size * 0.34 * kk;
        env2.poly([[0, -hh * 0.1], [-e * 1.3, -hh * 0.1 - e], [-e * 0.3, -hh * 0.1 - e * 0.2]], cloth2, A0, false);
        env2.poly([[0, -hh * 0.1], [e * 1.3, -hh * 0.1 - e], [e * 0.3, -hh * 0.1 - e * 0.2]], cloth2, A0, false);
        env2.circle(0, -hh * 0.1, e * 0.3, seam, null, 1, A0, false);
      }
      ctx.restore(); ctx.globalAlpha = 1;
    });
  } });

/* 折り鶴 — each glyph folds itself into a small paper crane that flaps off up and away */
function crane(env, cx, cy, S, dir, flap, rot, c1, c2, a) {
  const c = Math.cos(rot), s = Math.sin(rot), T = pts => pts.map(([u, v]) => { u *= dir * S; v *= S; return [cx + u * c - v * s, cy + u * s + v * c]; });
  const f = 0.25 + 0.75 * flap;
  env.poly(T([[-0.12, 0], [0.2, 0], [-0.02, -0.72 * f]]), c2, a, false);                                  // far wing
  env.poly(T([[-0.2, 0], [-0.72, -0.3], [-0.3, 0.1]]), c1, a, false);                                    // tail
  env.poly(T([[0.2, 0.02], [0.62, -0.4], [0.3, 0.12]]), c1, a, false);                                   // neck
  env.poly(T([[0.62, -0.4], [0.8, -0.28], [0.58, -0.3]]), c1, a, false);                                 // beak
  env.poly(T([[-0.34, 0], [0.34, 0], [0, 0.26]]), c1, a, false);                                         // body
  env.poly(T([[-0.2, 0.02], [0.14, 0.02], [0.1, -0.62 * f + 0.06]]), c1, a, false);                      // near wing
}
reg('exit', 'wzOrizuru', {
  name: '折り鶴', en: 'Paper Cranes', tags: ['emotional', 'pop', 'calm'], w: 0.7, ae: 'scatter', minDur: 0.9,
  outDur: dur => clamp(dur * 0.55, 0.5, 1.2),
  apply(env, it, p) {
    const size = it.size, dir = dirOf(env, 71), idx = seqOf(env, it), N = glyphN(it.text) <= 1 ? cutN(env) : 0;
    const qf = (i, n) => { const m = N || n; return stg(p, m > 1 ? clamp(idx(i) / (m - 1)) : 0, 0.42); };
    it.charFns.push((i, g, n) => {
      const q = qf(i, n); if (q <= 0) return null; if (q >= 0.3) return HIDE;
      return { s: lerp(1, 0.3, oCubic(q / 0.3)), a: 1 - sstep(0.1, 0.3, q) };
    });
    if (!solid(it)) return;
    postLocal(it, (env2, b, x, A) => {
      const lay = J.layoutText(x), n = lay.N, every = Math.max(1, Math.ceil(n / 16)), c1 = colOf(x), c2 = mixC(c1, hotOf(env2, x), 0.55);
      for (const g of lay) {
        if (isSp(g.ch) || g.i % every) continue;
        const q = qf(g.i, n); if (q <= 0.06 || q >= 1) continue;
        const k1 = sstep(0.06, 0.3, q), t = clamp((q - 0.22) / 0.78), a = A * k1 * (1 - sstep(0.7, 1, t)); if (a <= 0.01) continue;
        const [gx, gy] = gp(g, x), r1 = J.r(it.seed | 0, g.i, 72);
        const px = gx + dir * (size * 0.6 + env2.W * 0.3) * Math.pow(t, 1.8) * (0.7 + 0.6 * r1), py = gy - (size * 0.5 + env2.H * 0.2) * Math.pow(t, 1.4) + Math.sin(t * 10 + g.i) * size * 0.07;
        crane(env2, px, py, size * 0.56 * k1 * (1 - 0.3 * t), dir, 0.5 + 0.5 * Math.sin(q * 40 + g.i * 1.7), -dir * 0.22 * t, c1, c2, a);
      }
    });
  } });

/* 煙玉 — ドロン: a puff of round smoke bursts over the line, the text is gone behind it, and the smoke drifts up and thins out */
reg('exit', 'wzDoron', {
  name: '煙玉', en: 'Smoke Bomb', tags: ['pop', 'graphic'], w: 0.7, ae: 'explode',
  outDur: dur => clamp(dur * 0.45, 0.4, 0.9),
  apply(env, it, p) {
    const size = it.size, seed = it.seed | 0, A0 = it.alpha ?? 1, tH = 0.2;
    if (!solid(it)) { it.alpha = A0 * (1 - sstep(0, tH, p)); if (p >= tH) it.alpha = 0; return; }
    const grow = E.outExpo(clamp(p / 0.3)), dis = clamp((p - 0.3) / 0.7), col = colOf(it), sc = env.sc;
    if (p < tH) scaleAbout(it, 1 - 0.08 * E.inQuad(p / tH), box(it)); else it.alpha = 0;
    const smoke = J.mix(sc.bg, col, 0.2);
    addPost(it, (env2, x) => {
      if (env2.pass !== 'main') return;
      const b = box(x), tall = b.h > b.w, len = Math.max(b.w, b.h), th = Math.min(b.w, b.h), n = Math.round(clamp(len / (size * 0.7) + 2, 4, 14)), lw = Math.max(1.5, size * 0.022), a = A0 * (1 - sstep(0.4, 1, dis));
      if (a <= 0.01) return;
      const ctx = env2.ctx; ctx.save(); toLocal(ctx, x);
      const puffs = [], R0 = Math.max(size * 0.62, th * 0.62);
      for (let k = 0; k < n; k++) {
        const r = R0 * (0.8 + 0.45 * J.r(seed, k, 81)) * grow * (1 - E.inCubic(dis));
        if (r < 0.5) continue;
        const al = -size * 0.15 + (k + 0.5) / n * (len + size * 0.3) + J.rs(seed, k, 82) * size * (0.15 + 0.5 * dis), cr = J.rs(seed, k, 83) * th * 0.2;
        const up = size * 0.7 * dis * (0.4 + J.r(seed, k, 84));
        puffs.push(tall ? [b.cx + cr, b.y0 + al - up, r] : [b.x0 + al, b.cy + cr - up, r]);
      }
      for (const [px, py, r] of puffs) env2.circle(px, py, r + lw, col, null, 1, a, false);                // one outline round the whole cloud
      for (const [px, py, r] of puffs) env2.circle(px, py, r, smoke, null, 1, a, false);
      for (const [px, py, r] of puffs) env2.arc(px - r * 0.1, py + r * 0.05, r * 0.55, 200, 320, col, lw * 0.7, a * 0.6, false);
      ctx.restore(); ctx.globalAlpha = 1;
    });
  } });

/* 灯籠流し — the glyphs are set afloat one by one: they glow, bob on short ripples and drift off downstream, growing small */
reg('exit', 'wzToro', {
  name: '灯籠流し', en: 'Floating Lanterns', tags: ['emotional', 'calm'], w: 0.9, ae: 'drift', minDur: 0.9,
  outDur: dur => clamp(dur * 0.55, 0.5, 1.2),
  apply(env, it, p) {
    const size = it.size, dir = dirOf(env, 91), own = colOf(it), warm = hotOf(env, it), hex = isHex(it.color), idx = seqOf(env, it), N = glyphN(it.text) <= 1 ? cutN(env) : 0, W = env.W;
    const qf = (i, n) => { const m = N || n, o = m > 1 ? clamp(idx(i) / (m - 1)) : 0; return stg(p, dir > 0 ? 1 - o : o, 0.4); };
    const mv = (q, i) => ({ dx: dir * (size * 0.8 + W * 0.12) * Math.pow(q, 1.5), dy: -size * 0.35 * q + Math.sin(q * 9 + i) * size * 0.045 * Math.min(1, q * 4), s: 1 - 0.5 * q });
    it.charFns.push((i, g, n) => {
      const q = qf(i, n); if (q <= 0) return null; if (q >= 1) return HIDE;
      const M = mv(q, i), o = { dx: M.dx, dy: M.dy, s: M.s, a: 1 - sstep(0.45, 1, q) };
      if (hex) o.color = J.mix(own, warm, 0.7 * Math.sin(q * PI));
      return o;
    });
    if (!solid(it)) return;
    postLocal(it, (env2, b, x, A) => {
      const lay = J.layoutText(x), n = lay.N, lc = quietOf(env2.sc, own), lw = Math.max(1.5, size * 0.018);
      for (const g of lay) {
        if (isSp(g.ch)) continue;
        const q = qf(g.i, n); if (q <= 0 || q >= 1) continue;
        const M = mv(q, g.i), [gx, gy] = gp(g, x), a = A * Math.min(1, q * 5) * (1 - sstep(0.5, 1, q)) * 0.8; if (a <= 0.01) continue;
        const cx = gx + M.dx, y = gy + M.dy + g.h * (x.sy || 1) * M.s * 0.6, w = g.w * (x.sx || 1) * (0.5 + 0.7 * q);
        env2.line([[cx - w / 2, y], [cx + w / 2, y]], lc, lw, a, false);
        env2.line([[cx - w * 0.3 - dir * size * 0.1, y + size * 0.08], [cx + w * 0.3 - dir * size * 0.1, y + size * 0.08]], lc, lw, a * 0.6, false);
      }
    });
  } });

/* =====================================================================
   HOLD
   ===================================================================== */

/* 風鈴 — now and then a breeze passes along the line: each glyph swings from a point above it and rings down at its own pace */
reg('hold', 'wzFurin', {
  name: '風鈴', en: 'Wind Chime', tags: ['calm', 'emotional'], w: 0.9, ae: 'wave',
  apply(env, it, amt) {
    const k = amt * motionK(env); if (k < 0.01) return;
    const t = env.ltb, seed = it.seed | 0, T = 2.3, ph = (0.75 + 0.2 * cphase(env)) * T, L = it.size * 0.85, idx = seqOf(env, it);
    it.charFns.push((i) => {
      const j = idx(i), tt = frac((t + ph - j * 0.08) / T) * T, w = 7.5 + 3 * J.r(seed, j, 301);
      const th = 10 * k * Math.exp(-1.2 * tt) * Math.sin(tt * w) * Math.min(1, tt * 8) * (1 - sstep(0.8, 1, tt / T)) * (0.7 + 0.6 * J.r(seed, j, 302)) * DEG;
      return { rot: th / DEG, dx: -L * Math.sin(th), dy: L * (Math.cos(th) - 1) };
    });
  } });

/* 鹿威し — the line slowly tips as if filling with water, drops back with a knock, rocks once and starts again */
reg('hold', 'wzShishiodoshi', {
  name: '鹿威し', en: 'Bamboo Tipper', tags: ['calm', 'editorial', 'graphic'], w: 0.7, ae: 'drift',
  apply(env, it, amt) {
    const k = amt * motionK(env); if (k < 0.01) return;
    const T = 3.4, u = frac(env.ltb / T + cphase(env)), dir = dirOf(env, 311);
    let a;
    if (u < 0.7) a = E.inQuad(u / 0.7);
    else if (u < 0.76) a = lerp(1, -0.45, E.inCubic((u - 0.7) / 0.06));
    else { const v = (u - 0.76) / 0.24; a = -0.45 * Math.exp(-5 * v) * Math.cos(v * TAU * 1.5) * (1 - v); }
    rotAbout(it, dir * 2.4 * k * a, box(it));
  } });

/* 神輿 — わっしょい: two quick shoulder bounces and a rest, leaning left then right, in time with the beat when there is one */
reg('hold', 'wzMikoshi', {
  name: '神輿', en: 'Festival Bounce', tags: ['pop', 'graphic'], w: 0.8, ae: 'jitter',
  apply(env, it, amt) {
    const k = amt * motionK(env); if (k < 0.01) return;
    let u;
    if (env.beat && env.beat.len > 0.2) {
      const lag = Math.max(0, (env.ltb ?? env.lt) - env.lt); let s = env.beat.since - lag, i = env.beat.index | 0;
      if (s < 0) { s += env.beat.len; i -= 1; }
      u = clamp((((i % 2) + 2) % 2 + s / env.beat.len) / 2);
    } else u = frac(env.ltb / 1.1 + cphase(env));
    const h1 = u < 0.3 ? Math.sin(PI * u / 0.3) : 0, h2 = u > 0.34 && u < 0.64 ? Math.sin(PI * (u - 0.34) / 0.3) : 0;
    it.y -= it.size * 0.08 * k * (h1 + h2 * 0.8);
    rotAbout(it, 1.3 * k * (h1 - h2), box(it));
  } });

/* 短冊 — paper strips turning in a light breeze: a slow twist travels along the line, each glyph narrowing and opening again */
reg('hold', 'wzTanzaku', {
  name: '短冊ゆれ', en: 'Paper Strip Twist', tags: ['calm', 'emotional', 'editorial'], w: 0.9, ae: 'wave',
  apply(env, it, amt) {
    const k = amt * motionK(env); if (k < 0.01) return;
    const t = env.ltb, ph = cphase(env) * TAU, size = it.size, idx = seqOf(env, it), kk = Math.min(1.2, k);
    it.charFns.push((i, g) => {
      const f = t * 1.9 - idx(i) * 0.6 + ph, tw = Math.pow(Math.max(0, Math.sin(f)), 2), n = 1 - 0.34 * kk * tw;
      const o = { rot: 2.2 * k * Math.sin(f + 0.9), dy: -size * 0.015 * k * tw };
      if (g.r90) o.sy = n; else o.sx = n;
      return o;
    });
  } });

/* 墨の濃淡 — a slow wave of ink density: glyph after glyph pales to a thin wash and comes back to full black */
reg('hold', 'wzNotan', {
  name: '墨の濃淡', en: 'Ink Wash Wave', tags: ['calm', 'emotional', 'editorial'], w: 0.7, ae: 'breathe',
  apply(env, it, amt) {
    const k = amt * motionK(env); if (k < 0.01) return;
    const t = env.ltb, ph = cphase(env) * TAU, idx = seqOf(env, it), kk = Math.min(1, k);
    it.charFns.push((i) => {
      const w = 0.5 + 0.5 * Math.sin(t * 1.3 - idx(i) * 0.7 + ph), d = w * w;
      return { a: 1 - 0.45 * kk * d, s: 1 - 0.02 * k * d };
    });
  } });

/* =====================================================================
   TREAT
   ===================================================================== */
const alive = (it, amin = 0.9) => it.fill !== false && (it.alpha ?? 1) >= amin && !!it.text && it.size > 1;
const lineLike = (env, it) => glyphN(it.text) >= 2 || cutN(env) <= 1;
const onPlate = (sc, col) => ctr(col, sc.bg) < 1.5;
const inP = (env, it, d, len) => clamp((env.lt - (it.delay || 0) - d) / len);
const markOf = (sc, col) => firstOK([sc.accent, sc.accent2], c => ctr(c, sc.bg) >= 1.8, col);
// true while a piece-based entrance / exit is moving (pattern fills would fight its sprites)
const inPieces = (env, it) => {
  const c = env.cut, en = J.ENTER[it.enter || c.enter], ex = J.EXIT[it.exit || c.exit];
  if (en && en.pieces && env.lt - (it.delay || 0) < c.inDur * 1.3 + 0.05) return true;
  if (ex && ex.pieces && c.outDur > 0 && env.lt > c.dur - c.outDur - 0.3) return true;
  return false;
};
// per line (vertical: per column) extents in item space: a0..a1 along the reading direction, c = centre across it
const spans = x => {
  const lay = J.layoutText(x), sx = x.sx || 1, sy = x.sy || 1, v = !!x.vertical, m = new Map();
  for (const g of lay) {
    if (isSp(g.ch)) continue;
    const a0 = v ? (g.y - g.h / 2) * sy : (g.x - g.w / 2) * sx, a1 = v ? (g.y + g.h / 2) * sy : (g.x + g.w / 2) * sx;
    const L = m.get(g.li);
    if (!L) m.set(g.li, { li: g.li, a0, a1, c: v ? g.x * sx : (g.y - (1 - (g.fs || 1)) * x.size * 0.36) * sy });
    else { L.a0 = Math.min(L.a0, a0); L.a1 = Math.max(L.a1, a1); }
  }
  return [...m.values()].sort((a, b) => a.li - b.li);
};

/* cached fill tiles (256 px, seamless) and the patterns made from them */
const TILE = 256, TILES = new Map(), PATS = new Map();
function tileOf(key, make) {
  let c = TILES.get(key);
  if (!c) {
    if (TILES.size > 24) { TILES.clear(); PATS.clear(); }
    c = document.createElement('canvas'); c.width = c.height = TILE;
    make(c.getContext('2d')); TILES.set(key, c);
  }
  return c;
}
function patOf(ctx, key, cv, k, v, turn) {
  const kq = Math.pow(1.06, Math.round(Math.log(Math.max(1e-3, k)) / Math.log(1.06))), pk = key + '|' + kq.toFixed(4) + '|' + v + (turn ? 't' : '');
  let p = PATS.get(pk);
  if (!p) {
    if (PATS.size > 200) PATS.clear();
    p = ctx.createPattern(cv, 'repeat');
    try { let M = new DOMMatrix().translate(v * 67 * kq, v * 41 * kq); if (turn) M = M.rotate(90); p.setTransform(M.scale(kq)); } catch (e) {}
    PATS.set(pk, p);
  }
  return p;
}
// draw fn(dx, dy) at the nine wrapped positions so shapes crossing the tile edge stay seamless
const wrap9 = fn => { for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) fn(a * TILE, b * TILE); };

/* 落款 — a small vermilion seal set beside the end of the line, as on a finished piece of calligraphy */
reg('treat', 'wzRakkan', {
  name: '落款', en: 'Artist Seal', tags: ['editorial', 'calm', 'emotional'], w: 0.8,
  plan: rng => ({ v: rng.int(0, 2), r: rng.range(-5, 5), k: rng.range(0.36, 0.44) }),
  apply(env, it, Q) {
    if (!alive(it) || !lineLike(env, it)) return;
    const sc = env.sc, col = colOf(it); if (onPlate(sc, col)) return;
    const seal = sealOf(sc, col), knock = ctr(sc.bg, seal) >= 1.6 ? sc.bg : (isDark(seal) ? '#ffffff' : '#000000');
    it.size *= 0.94;
    const wait = (env.cut.inDur || 0.3) * 0.75;
    addPost(it, (e, x) => {
      const A = clamp(x.alpha ?? 1) * (1 - E.inCubic(e.pOut)), q = inP(e, x, wait, 0.26); if (A <= 0.01 || q <= 0) return;
      const b = box(x), s = x.size * (Q.k || 0.4), vert = !!x.vertical, ctx = e.ctx;
      const cx = vert ? b.x0 - s * 0.72 : b.x1 + s * 0.72, cy = b.y1 - s * 0.5, pop = lerp(1.45, 1, oCubic(q)), a = A * clamp(q * 3);
      ctx.save(); toLocal(ctx, x); ctx.translate(cx, cy); ctx.rotate((Q.r || 0) * DEG); ctx.scale(pop, pop);
      e.rrect(-s / 2, -s / 2, s, s, s * 0.1, seal, a, false);
      const i = s * 0.3, lw = s * 0.085, R = (x0, y0, w, h) => e.rect(x0, y0, w, h, knock, a, false);
      if ((Q.v | 0) === 1) { for (const y of [-i, 0, i]) R(-i, y - lw / 2, i * 2, lw); R(-lw / 2, -i, lw, i * 2); }                 // 王
      else {
        R(-i, -i, i * 2, lw); R(-i, i - lw, i * 2, lw); R(-i, -i, lw, i * 2); R(i - lw, -i, lw, i * 2);
        if ((Q.v | 0) === 0) { R(-i, -lw / 2, i * 2, lw); R(-lw / 2, -i, lw, i * 2); }                                           // 田
        else R(-i * 0.42, -i * 0.42, i * 0.84, i * 0.84);                                                                        // 回
      }
      ctx.restore(); ctx.globalAlpha = 1;
    });
  } });

/* 金箔 — flecks of gold leaf scattered through the body of the glyphs */
reg('treat', 'wzKinpaku', {
  name: '金箔ちらし', en: 'Gold Leaf Flecks', tags: ['emotional', 'editorial', 'pop'], w: 0.7,
  plan: rng => ({ d: rng.range(0.4, 1), s: rng.int(1, 9999) }),
  apply(env, it, Q) {
    if (!alive(it) || it.gradient || it.pattern || !isHex(it.color) || inPieces(env, it)) return;
    const sc = env.sc, col = it.color, gold = firstOK([sc.accent, sc.accent2], c => ctr(c, col) >= 1.35, J.mix(col, sc.bg, 0.5)), gold2 = J.mix(gold, col, 0.45);
    const seed = Q.s | 0, cnt = Math.round(20 + 18 * (Q.d ?? 0.7)), key = 'kin|' + col + gold + seed + '|' + cnt;
    const cv = tileOf(key, c => {
      c.fillStyle = col; c.fillRect(0, 0, TILE, TILE);
      for (let i = 0; i < cnt; i++) {
        const cx = J.r(seed, i, 401) * TILE, cy = J.r(seed, i, 402) * TILE, R = 5 + 15 * Math.pow(J.r(seed, i, 403), 1.6), a0 = J.r(seed, i, 404) * TAU;
        c.fillStyle = J.r(seed, i, 405) < 0.7 ? gold : gold2;
        wrap9((ox, oy) => {
          c.beginPath();
          for (let k = 0; k < 4; k++) { const an = a0 + k * TAU / 4 + J.rs(seed, i, k, 406) * 0.5, rr = R * (0.55 + 0.6 * J.r(seed, i, k, 407)); const X = cx + ox + Math.cos(an) * rr, Y = cy + oy + Math.sin(an) * rr; if (k) c.lineTo(X, Y); else c.moveTo(X, Y); }
          c.closePath(); c.fill();
        });
      }
    });
    const ctx = env.ctx;
    it.charFns.push((i) => ({ color: patOf(ctx, key, cv, it.size * 1.5 / TILE, i % 4, false) }));
  } });

/* 墨のかすれ — a dry brush: thin streaks along the stroke direction where the bristles ran out of ink */
reg('treat', 'wzKasure', {
  name: '墨のかすれ', en: 'Dry Brush', tags: ['emotional', 'calm', 'editorial'], w: 0.8,
  plan: rng => ({ d: rng.range(0.55, 1), s: rng.int(1, 9999) }),
  apply(env, it, Q) {
    if (!alive(it) || it.gradient || it.pattern || !isHex(it.color) || inPieces(env, it)) return;
    const col = it.color, seed = Q.s | 0, cnt = Math.round(52 + 40 * (Q.d ?? 0.8)), key = 'kas|' + col + seed + '|' + cnt;
    const cv = tileOf(key, c => {
      c.fillStyle = col; c.fillRect(0, 0, TILE, TILE);
      c.globalCompositeOperation = 'destination-out'; c.fillStyle = '#000000';
      for (let i = 0; i < cnt; i++) {
        // streaks gather in a few bands across the tile, like the dry part of one brush pass
        const band = (i % 8 + J.r(seed, i % 8, 411)) * TILE / 8, y = band + J.rs(seed, i, 412) * 14, h = 3 + 8 * Math.pow(J.r(seed, i, 413), 2), x = J.r(seed, i, 414) * TILE, len = 40 + 150 * J.r(seed, i, 415);
        wrap9((ox, oy) => { c.beginPath(); c.moveTo(x + ox, y + oy); c.lineTo(x + ox + len * 0.5, y + oy - h / 2); c.lineTo(x + ox + len, y + oy); c.lineTo(x + ox + len * 0.5, y + oy + h / 2); c.closePath(); c.fill(); });
      }
      c.globalCompositeOperation = 'source-over';
    });
    const ctx = env.ctx, vert = !!it.vertical;
    it.charFns.push((i, g) => ({ color: patOf(ctx, key, cv, it.size * 1.5 / TILE, i % 4, vert !== !!g.r90) }));
  } });

/* 和柄の帯 — a narrow band of a traditional repeat (市松 / 鱗 / 青海波 / 菱) laid along the foot of the line */
reg('treat', 'wzObi', {
  name: '和柄の帯', en: 'Pattern Sash', tags: ['graphic', 'pop', 'editorial'], w: 0.9,
  plan: rng => ({ v: rng.int(0, 3), h: rng.range(0.2, 0.26) }),
  apply(env, it, Q) {
    if (!alive(it) || !lineLike(env, it)) return;
    const sc = env.sc, col = colOf(it); if (onPlate(sc, col)) return;
    const mc = markOf(sc, col), vert = !!it.vertical, v = Q.v | 0;
    if (vert) it.x -= it.size * 0.14; else it.y -= it.size * 0.14;
    addPre(it, (e, x) => {
      if (e.pass !== 'main') return;
      const A = clamp(x.alpha ?? 1) * (1 - E.inCubic(e.pOut)), q = oCubic(inP(e, x, 0.05, 0.5)); if (A <= 0.01 || q <= 0.005) return;
      const b = box(x), S = x.size, hb = S * (Q.h || 0.22), ctx = e.ctx;
      const U0 = (vert ? b.y0 : b.x0) - S * 0.08, U1 = (vert ? b.y1 : b.x1) + S * 0.08, V0 = (vert ? b.x1 : b.y1) + S * 0.14, L = U1 - U0;
      ctx.save(); toLocal(ctx, x); if (vert) ctx.transform(0, 1, 1, 0, 0, 0);
      ctx.beginPath(); ctx.rect(U0, V0 - 2, L * q, hb + 4); ctx.clip();
      ctx.globalAlpha = A; ctx.fillStyle = mc; ctx.strokeStyle = mc; ctx.beginPath();
      if (v === 0) {                                                                                       // 市松
        const c = hb / 2, n = Math.min(600, Math.ceil(L / c));
        for (let i = 0; i < n; i++) ctx.rect(U0 + i * c, V0 + (i % 2 ? c : 0), c + 0.4, c);
        ctx.fill();
      } else if (v === 1) {                                                                                // 鱗
        const n = Math.min(400, Math.ceil(L / hb));
        for (let i = 0; i < n; i++) { ctx.moveTo(U0 + i * hb, V0 + hb); ctx.lineTo(U0 + (i + 0.5) * hb, V0); ctx.lineTo(U0 + (i + 1) * hb, V0 + hb); ctx.closePath(); }
        ctx.fill();
      } else if (v === 2) {                                                                                // 青海波
        const n = Math.min(300, Math.ceil(L / (hb * 2)) + 1);
        ctx.lineWidth = Math.max(1, hb * 0.1);
        for (let i = 0; i < n; i++) for (const rr of [1, 0.66, 0.33]) { const cx = U0 + (i + 0.5) * hb * 2; ctx.moveTo(cx - hb * rr, V0 + hb); ctx.arc(cx, V0 + hb, hb * rr, PI, TAU); }
        ctx.stroke();
      } else {                                                                                             // 菱
        const w = hb * 1.3, n = Math.min(400, Math.ceil(L / w));
        ctx.rect(U0, V0, L, hb * 0.1); ctx.rect(U0, V0 + hb * 0.9, L, hb * 0.1);
        for (let i = 0; i < n; i++) { const cx = U0 + (i + 0.5) * w, cy = V0 + hb / 2; ctx.moveTo(cx - w * 0.38, cy); ctx.lineTo(cx, cy - hb * 0.27); ctx.lineTo(cx + w * 0.38, cy); ctx.lineTo(cx, cy + hb * 0.27); ctx.closePath(); }
        ctx.fill();
      }
      ctx.restore(); ctx.globalAlpha = 1;
    });
  } });

/* 便箋 — letter paper: a ruled line for every line of text (between the columns of vertical text), one more left empty, and a coloured head rule */
reg('treat', 'wzBinsen', {
  name: '便箋の罫', en: 'Letter Paper Rules', tags: ['editorial', 'calm', 'emotional'], w: 0.8,
  plan: rng => ({ n: rng.pick([1, 1, 2]), d: rng.chance(0.5) }),
  apply(env, it, Q) {
    if (!alive(it) || !lineLike(env, it)) return;
    const sc = env.sc, col = colOf(it); if (onPlate(sc, col)) return;
    const rule = quietOf(sc, col), head = markOf(sc, col), vert = !!it.vertical, sg = vert ? -1 : 1, extra = Q.n || 1;
    const lead0 = (it.lead || 1.3) * it.size * (vert ? (it.sx || 1) : (it.sy || 1));
    if (vert) it.x += lead0 * 0.25 * extra; else it.y -= lead0 * 0.25 * extra;
    addPre(it, (e, x) => {
      const A = clamp(x.alpha ?? 1) * (1 - E.inCubic(e.pOut)); if (A <= 0.01) return;
      const Ls = spans(x); if (!Ls.length) return;
      const b = box(x), S = x.size, lead = (x.lead || 1.3) * S * (vert ? (x.sx || 1) : (x.sy || 1)), lw = Math.max(1.5, S * 0.014), ctx = e.ctx;
      const U0 = (vert ? b.y0 : b.x0) - S * 0.3, U1 = (vert ? b.y1 : b.x1) + S * 0.3;
      const R = (u0, v0, u1, v1, c, a) => { if (u1 - u0 > 0.3 && a > 0.004) { if (vert) e.rect(v0, u0, v1 - v0, u1 - u0, c, a, false); else e.rect(u0, v0, u1 - u0, v1 - v0, c, a, false); } };
      ctx.save(); toLocal(ctx, x);
      const vs = Ls.map(L => L.c + sg * lead / 2), last = vs[vs.length - 1];
      for (let j = 1; j <= extra; j++) vs.push(last + sg * lead * j);
      vs.forEach((v, j) => { const q = oCubic(inP(e, x, 0.04 * (j + 1), 0.45)); R(U0, v - lw / 2, lerp(U0, U1, q), v + lw / 2, rule, A * 0.75); });
      const hv = Ls[0].c - sg * lead / 2, q = oCubic(inP(e, x, 0, 0.45));
      R(U0, hv - lw, lerp(U0, U1, q), hv + lw, head, A);
      if (Q.d) R(U0, hv - sg * lw * 4 - lw / 2, lerp(U0, U1, q), hv - sg * lw * 4 + lw / 2, head, A * 0.8);
      ctx.restore(); ctx.globalAlpha = 1;
    });
  } });

/* =====================================================================
   CAMERA
   ===================================================================== */
const KM = env => clamp((env.fx.motion ?? 0.7) * 1.25, 0, 1.25);

/* 掛け軸を眺める — starts close on the upper part, lets the eye travel down the scroll while stepping back to the whole picture */
reg('cam', 'wzKakejikuView', {
  name: '掛け軸を眺める', en: 'Scroll Viewing', tags: ['calm', 'emotional', 'editorial'], w: 1, ae: 'pullOut',
  plan: rng => ({ a: rng.range(0.06, 0.085), y: rng.range(0.026, 0.036) }),
  get(env, Q) {
    const K = KM(env), e = E.inOutSine(clamp(env.lt / Math.max(0.6, env.cut.dur * 0.72)));
    return { s: 1 + (Q.a || 0.07) * K * (1 - e), y: env.H * (Q.y || 0.03) * K * Math.cos(e * PI) * (1 - e) };
  } });

/* 屏風 — the view walks past a folding screen: it pans in three or four steps, and each panel faces a slightly different way */
reg('cam', 'wzByobuPan', {
  name: '屏風送り', en: 'Folding Screen Pan', tags: ['editorial', 'graphic', 'calm'], w: 0.8, ae: 'panL',
  plan: rng => ({ dir: rng.pick([1, -1]), n: rng.pick([3, 3, 4]), a: rng.range(0.024, 0.032) }),
  get(env, Q) {
    const K = KM(env), n = Q.n || 3, u = clamp(env.lt / Math.max(0.5, env.cut.dur)) * n, i = Math.min(n - 1, Math.floor(u)), f = ioCubic(clamp((u - i) / 0.55));
    const pos = (i + f) / n * 2 - 1, faceAt = j => (j < 0 || j >= n - 1 ? 0 : (j % 2 ? 1 : -1));     // the last panel faces the viewer
    const face = lerp(faceAt(i - 1), faceAt(i), f);
    return { x: (Q.dir || 1) * pos * env.W * (Q.a || 0.028) * K, skx: face * 1.1 * K, sx: 1 - 0.014 * K * bell(f), s: 1.03 };
  } });

/* お辞儀 — the frame makes a small bow at the top of the cut: it dips and shortens, holds for a breath and straightens up */
reg('cam', 'wzOjigi', {
  name: 'お辞儀', en: 'Small Bow', tags: ['calm', 'editorial', 'pop'], w: 0.8, ae: 'bounce',
  plan: rng => ({ a: rng.range(0.026, 0.036), h: rng.range(0.16, 0.26) }),
  get(env, Q) {
    const K = KM(env), T = clamp(env.cut.dur * 0.6, 0.5, 1.25), u = env.lt / T, h = Q.h || 0.2;
    const b = ioCubic(u / 0.3) * (1 - ioCubic((u - 0.3 - h) / (0.7 - h)));
    return { y: env.H * (Q.a || 0.03) * K * b, sy: 1 - 0.04 * K * b, s: 1 + 0.008 * K * b };
  } });

/* =====================================================================
   FX (device pixels)
   ===================================================================== */
const evS = ev => J.h(Math.round(ev.t * 1000), 6143);
const ampOf = ev => clamp(ev.amp ?? 1, 0.3, 1.6);
const amp1 = ev => clamp(ev.amp ?? 1, 0.5, 1.3);
const ahr = (k, a, b) => (k < a ? oCubic(k / a) : k > b ? 1 - E.inCubic((k - b) / Math.max(1e-3, 1 - b)) : 1);
const fxReg = (k, d) => reg('fx', k, Object.assign({}, d, {
  draw(ctx, ev, k2, I) { ctx.save(); try { d.draw(ctx, ev, clamp(Number.isFinite(k2) ? k2 : 1), I); } finally { ctx.restore(); } } }));

/* 拍子木 — two wooden clappers fly in and strike: a sharp crack of rays at the meeting point, and they spring apart */
fxReg('wzHyoshigi', { name: '拍子木', en: 'Wooden Clappers', tags: ['pop', 'graphic', 'editorial'], w: 1, dur: 7, amp: 1, mid: true, ae: 'flash',
  draw(ctx, ev, k, I) {
    const { cw, ch, sc } = I, s = evS(ev), mn = Math.min(cw, ch), tS = 0.3, L = mn * 0.5, th = mn * 0.065;
    const cx = cw / 2 + J.rs(s, 1) * cw * 0.14, cy = ch / 2 + J.rs(s, 2) * ch * 0.1, tilt = (J.r(s, 3) < 0.5 ? 1 : -1) * (10 + 14 * J.r(s, 4)) * DEG;
    const col = inkOf(sc), band = popOf(sc), u = clamp((k - tS) / (1 - tS));
    const d = k < tS ? lerp(mn * 0.8, th / 2, E.inCubic(k / tS)) : th / 2 + mn * 0.1 * oCubic(u), al = k < tS ? clamp(k / tS * 4) : 1 - E.inQuad(u);
    if (k >= tS) { const f = (1 - oCubic(u / 0.5)) * amp1(ev); if (f > 0.01) { ctx.globalAlpha = 0.2 * f; ctx.fillStyle = band; ctx.fillRect(0, 0, cw, ch); } }
    ctx.translate(cx, cy); ctx.rotate(tilt);
    for (const sd of [-1, 1]) {
      ctx.globalAlpha = al; ctx.fillStyle = col; ctx.fillRect(sd * d - th / 2, -L / 2, th, L);
      ctx.fillStyle = band; ctx.fillRect(sd * d - th / 2, -L / 2 + L * 0.1, th, L * 0.045);
    }
    if (k >= tS) {
      const f = 1 - sstep(0.1, 0.75, u); if (f <= 0.01) return;
      ctx.globalAlpha = f; ctx.strokeStyle = band; ctx.lineWidth = Math.max(2, mn * 0.009); ctx.lineCap = 'butt'; ctx.beginPath();
      for (let i = 0; i < 12; i++) {
        const an = i / 12 * TAU + 0.26, c = Math.cos(an), sn = Math.sin(an), r0 = mn * (0.09 + 0.26 * E.outExpo(u)) * (i % 2 ? 0.8 : 1), len = mn * 0.11 * (1 - u) * amp1(ev);
        ctx.moveTo(c * r0, sn * r0 * 1.6); ctx.lineTo(c * (r0 + len), sn * (r0 + len) * 1.6);
      }
      ctx.stroke();
    }
  } });

/* 障子の影 — the shadow of a shoji lattice slides slantwise across the picture, as if a lamp were carried past outside */
fxReg('wzShojiPass', { name: '障子の影', en: 'Lattice Shadow', tags: ['calm', 'emotional', 'editorial'], w: 0.9, dur: 14, amp: 1, mid: true,
  draw(ctx, ev, k, I) {
    const { cw, ch, sc } = I, s = evS(ev), mn = Math.min(cw, ch), dir = J.r(s, 1) < 0.5 ? 1 : -1, a = 0.3 * ahr(k, 0.25, 0.7) * clamp(ampOf(ev), 0.6, 1.1);
    if (a < 0.01) return;
    const cu = mn * 0.21, cv = mn * 0.15, lw = Math.max(2, mn * 0.012), sk = 0.32 * dir, sh = dir * lerp(-cw * 0.14, cw * 0.14, k);
    ctx.transform(1, 0, sk, 1, -sk * ch / 2 + sh, 0);
    ctx.fillStyle = shadeOf(sc);
    for (const [w, al] of [[2.6, 0.35], [1, 1]]) {
      ctx.globalAlpha = a * al; ctx.beginPath();
      for (let x = -cw * 0.5, i = 0; x < cw * 1.5 && i < 80; x += cu, i++) { const t = (i % 3 === 0 ? 2.2 : 1) * lw * w; ctx.rect(x - t / 2, -10, t, ch + 20); }
      for (let y = cv * 0.5, i = 0; y < ch && i < 60; y += cv, i++) ctx.rect(-cw, y - lw * w / 2, cw * 3, lw * w);
      ctx.fill();
    }
  } });

/* 墨しぶき — a loaded brush is flicked at the screen: a blot lands near one edge and throws a fan of drops across it */
fxReg('wzSumiShibuki', { name: '墨しぶき', en: 'Ink Splash', tags: ['graphic', 'emotional', 'pop'], w: 0.9, dur: 8, amp: 1, mid: true, ae: 'flash',
  draw(ctx, ev, k, I) {
    const { cw, ch, sc } = I, s = evS(ev), mn = Math.min(cw, ch), a0 = amp1(ev), g = E.outExpo(clamp(k / 0.3)), al = 1 - E.inQuad(clamp((k - 0.42) / 0.58));
    if (al <= 0.01) return;
    const left = J.r(s, 1) < 0.5, ox = cw * (left ? 0.1 + 0.1 * J.r(s, 2) : 0.9 - 0.1 * J.r(s, 2)), oy = ch * (0.2 + 0.6 * J.r(s, 3)), base = Math.atan2(ch / 2 - oy, cw / 2 - ox);
    ctx.fillStyle = inkOf(sc); ctx.globalAlpha = al;
    ctx.beginPath();
    for (let i = 0; i < 7; i++) { const an = J.r(s, i, 4) * TAU, d = mn * 0.035 * J.r(s, i, 5) * g, r = mn * (0.03 + 0.035 * J.r(s, i, 6)) * g * a0; ctx.moveTo(ox + Math.cos(an) * d + r, oy + Math.sin(an) * d); ctx.arc(ox + Math.cos(an) * d, oy + Math.sin(an) * d, r, 0, TAU); }
    ctx.fill();
    for (let i = 0; i < 34; i++) {
      const r1 = J.r(s, i, 7), an = base + J.rs(s, i, 8) * 0.95, d = mn * (0.09 + 0.85 * r1 * r1) * g * a0, r = mn * 0.02 * (1 - r1 * 0.8) * (0.4 + 0.6 * J.r(s, i, 9)) * a0;
      ctx.beginPath(); ctx.ellipse(ox + Math.cos(an) * d, oy + Math.sin(an) * d, r * (1.4 + 2.2 * r1), r, an, 0, TAU); ctx.fill();
    }
  } });

/* 紙の折り目 — for a moment the picture is a sheet folded in thirds and across: panels shade alternately and the creases catch the light */
fxReg('wzOrime', { name: '紙の折り目', en: 'Paper Creases', tags: ['editorial', 'calm', 'graphic'], w: 0.8, dur: 9, amp: 1, mid: true,
  draw(ctx, ev, k, I) {
    const { cw, ch, sc } = I, e = ahr(k, 0.14, 0.55) * clamp(ampOf(ev), 0.6, 1.1); if (e < 0.01) return;
    const mn = Math.min(cw, ch), nx = cw >= ch ? 3 : 2, ny = cw >= ch ? 2 : 3, dk = shadeOf(sc), lt = lightOf(sc), wB = mn * 0.2, lw = Math.max(1, mn * 0.003);
    for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) if ((i + j) % 2) { ctx.globalAlpha = 0.09 * e; ctx.fillStyle = dk; ctx.fillRect(cw * i / nx, ch * j / ny, cw / nx, ch / ny); }
    ctx.globalAlpha = 1;
    const crease = (vert, pos, flip) => {
      const g = c => { const G = vert ? ctx.createLinearGradient(pos, 0, pos + c * wB, 0) : ctx.createLinearGradient(0, pos, 0, pos + c * wB); return G; };
      for (const sd of [-1, 1]) {
        const G = g(sd), c = sd * flip > 0 ? dk : lt, a = (sd * flip > 0 ? 0.3 : 0.2) * e;
        G.addColorStop(0, J.rgba(c, a)); G.addColorStop(1, J.rgba(c, 0)); ctx.fillStyle = G;
        if (vert) ctx.fillRect(sd > 0 ? pos : pos - wB, 0, wB, ch); else ctx.fillRect(0, sd > 0 ? pos : pos - wB, cw, wB);
      }
      ctx.fillStyle = J.rgba(dk, 0.45 * e); if (vert) ctx.fillRect(pos - lw / 2, 0, lw, ch); else ctx.fillRect(0, pos - lw / 2, cw, lw);
    };
    for (let i = 1; i < nx; i++) crease(true, cw * i / nx, i % 2 ? 1 : -1);
    for (let j = 1; j < ny; j++) crease(false, ch * j / ny, j % 2 ? -1 : 1);
  } });

/* 花吹雪 — one gust carries a flurry of petals slantwise across the whole picture */
fxReg('wzHanafubuki', { name: '花吹雪', en: 'Petal Gust', tags: ['emotional', 'pop', 'calm'], w: 0.9, dur: 14, amp: 1, mid: true,
  draw(ctx, ev, k, I) {
    const { cw, ch, sc } = I, s = evS(ev), mn = Math.min(cw, ch), dir = J.r(s, 1) < 0.5 ? 1 : -1, N = Math.round(34 + 16 * clamp(ampOf(ev), 0.5, 1.3));
    const c1 = popOf(sc), cols = [c1, firstOK([sc.accent2], c => ctr(c, sc.bg) > 1.4, c1), J.mix(c1, lightOf(sc), 0.45)];
    for (let i = 0; i < N; i++) {
      const kk = clamp(k * 1.4 - 0.4 * J.r(s, i, 2)); if (kk <= 0 || kk >= 1) continue;
      const a = sstep(0, 0.1, kk) * (1 - sstep(0.85, 1, kk)) * 0.92, ph = J.r(s, i, 3) * TAU, y0 = ch * (-0.25 + 1.05 * J.r(s, i, 4));
      const x = (dir > 0 ? -0.08 : 1.08) * cw + dir * cw * 1.16 * kk, y = y0 + ch * 0.36 * kk + Math.sin(kk * 9 + ph) * mn * 0.035, sp = mn * (0.016 + 0.022 * J.r(s, i, 5));
      ctx.save(); ctx.translate(x, y); ctx.rotate(ph + kk * 8 * (i % 2 ? 1 : -1)); ctx.scale(0.3 + 0.7 * Math.abs(Math.cos(kk * 12 + ph)), 1);
      ctx.globalAlpha = a; ctx.fillStyle = cols[i % 3];
      ctx.beginPath(); ctx.moveTo(0, -sp); ctx.quadraticCurveTo(sp * 0.95, -sp * 0.1, sp * 0.22, sp); ctx.lineTo(0, sp * 0.72); ctx.lineTo(-sp * 0.22, sp); ctx.quadraticCurveTo(-sp * 0.95, -sp * 0.1, 0, -sp); ctx.fill();
      ctx.restore();
    }
  } });

/* 定式幕 — the striped stage curtain is run across the picture and straight off again (closed exactly at the cut) */
fxReg('wzMaku', { name: '定式幕', en: 'Stage Curtain', tags: ['pop', 'graphic', 'editorial'], w: 0.7, dur: 10, pre: 5, amp: 1,
  draw(ctx, ev, k, I) {
    const { cw, ch, sc } = I, s = evS(ev), b = 0.5, dir = J.r(s, 1) < 0.5 ? 1 : -1, sw = Math.max(8, cw / 13);
    const c1 = inkOf(sc), c2 = popOf(sc), c3 = firstOK([sc.accent2, sc.sub, sc.fg], c => c !== c1 && c !== c2 && ctr(c, sc.bg) > 1.3, J.mix(c1, c2, 0.5)), cols = [c1, c2, c3];
    const x0 = k < b ? 0 : cw * ioCubic((k - b) / (1 - b)), x1 = k < b ? cw * ioCubic(k / b) : cw;
    if (x1 - x0 < 0.5) return;
    if (dir < 0) { ctx.translate(cw, 0); ctx.scale(-1, 1); }
    ctx.beginPath(); ctx.rect(x0, 0, x1 - x0, ch); ctx.clip();
    const an = k < b ? x1 : x0 + cw;                                                                        // the cloth travels with its leading edge
    for (let i = 0, x = an - sw; x > x0 - sw && i < 40; i++, x -= sw) {
      ctx.globalAlpha = 1; ctx.fillStyle = cols[i % 3]; ctx.fillRect(x, 0, sw + 0.6, ch);
      ctx.globalAlpha = 0.16; ctx.fillStyle = '#000000'; ctx.fillRect(x, 0, sw * 0.14, ch);                 // fold shade
    }
    ctx.globalAlpha = 1; ctx.fillStyle = c1; ctx.fillRect(x0, 0, x1 - x0, Math.max(3, ch * 0.03));          // the rail
    ctx.globalAlpha = 0.3; ctx.fillStyle = '#000000'; ctx.fillRect(k < b ? x1 - sw * 0.2 : x0, 0, sw * 0.2, ch);
  } });

/* =====================================================================
   TRANS (device pixels; p = 0 is exactly A, p = 1 exactly B)
   ===================================================================== */
const trReg = (k, d) => reg('trans', k, Object.assign({}, d, {
  draw(ctx, A, B, p, I) {
    ctx.save();
    try {
      if (!(p > 0)) ctx.drawImage(A, 0, 0);
      else if (p >= 1) ctx.drawImage(B, 0, 0);
      else d.draw(ctx, A, B, p, I, I.P || {});
    } finally { ctx.restore(); }
  } }));

/* 襖渡し — two sliding doors close over the old cut, meet, and open again on the new one */
trReg('wzFusumaPass', { name: '襖渡し', en: 'Sliding Door Handover', tags: ['calm', 'editorial', 'graphic', 'emotional'], w: 1, dur: 0.55, ae: 'doorsOpen',
  plan: rng => ({ n: rng.pick([1, 2]), k: rng.chance(0.6) }),
  draw(ctx, A, B, p, I, Q) {
    const { cw, ch, sc } = I, mn = Math.min(cw, ch), c = p < 0.44 ? ioCubic(p / 0.44) : p < 0.56 ? 1 : 1 - ioCubic((p - 0.56) / 0.44);
    ctx.drawImage(p < 0.5 ? A : B, 0, 0);
    if (c <= 0.001) return;
    const paper = paperOf(sc), frame = inkOf(sc), acc = popOf(sc), lw = Math.max(2, mn * 0.012), pw = cw / 2, half = pw * c;
    for (const sd of [-1, 1]) {
      const x0 = sd < 0 ? half - pw : cw - half;
      ctx.globalAlpha = 1; ctx.fillStyle = paper; ctx.fillRect(x0, 0, pw + 0.5, ch);
      if (Q.k) {                                                                                           // a drift of mist painted on the paper
        ctx.globalAlpha = 0.16; ctx.fillStyle = acc;
        for (const [fy, f0, f1] of [[0.24, 0.1, 0.7], [0.3, 0.35, 0.95], [0.72, 0.05, 0.55]]) {
          const y = ch * fy, h = ch * 0.035, xa = x0 + pw * (sd < 0 ? f0 : 1 - f1), w = pw * (f1 - f0);
          ctx.beginPath(); ctx.moveTo(xa + h / 2, y); ctx.lineTo(xa + w - h / 2, y); ctx.arc(xa + w - h / 2, y + h / 2, h / 2, -PI / 2, PI / 2); ctx.lineTo(xa + h / 2, y + h); ctx.arc(xa + h / 2, y + h / 2, h / 2, PI / 2, PI * 1.5); ctx.fill();
        }
      }
      ctx.globalAlpha = 1; ctx.fillStyle = frame;
      ctx.fillRect(x0, 0, pw, lw * 2.2); ctx.fillRect(x0, ch - lw * 2.2, pw, lw * 2.2);
      ctx.fillRect(x0, 0, lw * 1.6, ch); ctx.fillRect(x0 + pw - lw * 1.6, 0, lw * 1.6, ch);
      if ((Q.n || 1) > 1) ctx.fillRect(x0 + pw / 2 - lw * 0.6, 0, lw * 1.2, ch);
      const hx = sd < 0 ? x0 + pw - mn * 0.075 : x0 + mn * 0.075, r = mn * 0.024;
      ctx.beginPath(); ctx.arc(hx, ch / 2, r, 0, TAU); ctx.fill();
      ctx.strokeStyle = acc; ctx.lineWidth = lw * 0.7; ctx.beginPath(); ctx.arc(hx, ch / 2, r, 0, TAU); ctx.stroke();
    }
  } });

/* 巻物送り — a scroll roller travels across the picture, winding the old cut onto itself and leaving the new one flat behind it */
trReg('wzMakimonoRoll', { name: '巻物送り', en: 'Scroll Roll', tags: ['calm', 'editorial', 'emotional'], w: 0.9, dur: 0.55, ae: 'wipe',
  plan: rng => ({ dir: rng.pick([1, -1]) }),
  draw(ctx, A, B, p, I, Q) {
    const { cw, ch, sc } = I, mn = Math.min(cw, ch), dir = Q.dir || 1, d = Math.max(12, mn * 0.09), e = ioCubic(p);
    const X = dir > 0 ? lerp(-d, cw + d, e) : lerp(cw + d, -d, e), xa = X - d / 2, xb = X + d / 2;
    ctx.drawImage(A, 0, 0);
    ctx.save(); ctx.beginPath(); if (dir > 0) ctx.rect(0, 0, Math.max(0, xa), ch); else ctx.rect(xb, 0, Math.max(0, cw - xb), ch); ctx.clip(); ctx.drawImage(B, 0, 0); ctx.restore();
    // cast shadow on the freshly laid side
    const sw = d * 1.3, G0 = dir > 0 ? ctx.createLinearGradient(xa, 0, xa - sw, 0) : ctx.createLinearGradient(xb, 0, xb + sw, 0);
    G0.addColorStop(0, 'rgba(0,0,0,0.32)'); G0.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = G0; ctx.fillRect(dir > 0 ? xa - sw : xb, 0, sw, ch);
    // the roll: the next strip of the old cut wrapped round it
    ctx.fillStyle = paperOf(sc); ctx.fillRect(xa, 0, d, ch);
    const sx0 = dir > 0 ? xb : xa - d * 1.6, s0 = clamp(sx0, 0, cw - 1), s1 = clamp(sx0 + d * 1.6, 1, cw);
    if (s1 - s0 > 1) { ctx.globalAlpha = 0.85; ctx.drawImage(A, s0, 0, s1 - s0, ch, xa, 0, d, ch); ctx.globalAlpha = 1; }
    const G = ctx.createLinearGradient(xa, 0, xb, 0);
    G.addColorStop(0, 'rgba(0,0,0,0.62)'); G.addColorStop(0.3, 'rgba(0,0,0,0.08)'); G.addColorStop(0.55, 'rgba(0,0,0,0.12)'); G.addColorStop(1, 'rgba(0,0,0,0.66)');
    ctx.fillStyle = G; ctx.fillRect(xa, 0, d, ch);
    const capH = Math.max(4, ch * 0.035);
    ctx.fillStyle = inkOf(sc); ctx.fillRect(xa - d * 0.12, 0, d * 1.24, capH); ctx.fillRect(xa - d * 0.12, ch - capH, d * 1.24, capH);
    ctx.fillStyle = popOf(sc); ctx.fillRect(xa - d * 0.12, capH, d * 1.24, capH * 0.22); ctx.fillRect(xa - d * 0.12, ch - capH * 1.22, d * 1.24, capH * 0.22);
  } });

/* 回り舞台 — the revolving stage: both cuts stand on one great turntable below the frame; the old one swings out as the new one swings in */
trReg('wzMawariButai', { name: '回り舞台', en: 'Revolving Stage', tags: ['graphic', 'pop', 'editorial'], w: 0.8, dur: 0.6, ae: 'spinOut',
  plan: rng => ({ dir: rng.pick([1, -1]) }),
  draw(ctx, A, B, p, I, Q) {
    const { cw, ch, sc } = I, dir = Q.dir || 1, e = ioCubic(p), R = Math.max(cw, ch) * 1.9, px = cw / 2, py = ch / 2 + R;
    const al = 2 * Math.atan((cw / 2) / (R - ch / 2)) * 1.32;
    ctx.fillStyle = J.mix(J.mix((I.scPrev || sc).bg, sc.bg, p), '#000000', 0.55); ctx.fillRect(0, 0, cw, ch);
    const put = (C, ang, dimA) => {
      ctx.save(); ctx.translate(px, py); ctx.rotate(ang); ctx.translate(-px, -py);
      ctx.drawImage(C, 0, 0);
      if (dimA > 0.003) { ctx.globalAlpha = dimA; ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, cw, ch); }
      ctx.restore();
    };
    put(A, -dir * al * e, 0.4 * e);
    put(B, dir * al * (1 - e), 0.4 * (1 - e));
    // the seam of the turntable between the two sets
    ctx.save(); ctx.translate(px, py); ctx.rotate(dir * al * (0.5 - e)); ctx.fillStyle = inkOf(sc); ctx.globalAlpha = bell(p);
    const lw = Math.max(2, Math.min(cw, ch) * 0.008); ctx.fillRect(-lw / 2, -R - ch, lw, ch * 2); ctx.restore();
  } });

})();
