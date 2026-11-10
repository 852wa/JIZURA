/* JIZURA pack: x2kineticB — kinetic typography (追加分2): 9 entrances, 8 exits, 5 holds, 5 treatments, 4 cameras, 6 fx, 3 transitions
   Motion first: words and lines carry weight — they overshoot, squash, recoil, get hit and thrown. */
(() => {
'use strict';
const E = J.E;
const P = 'x2kineticB';
const DEG = J.DEG, TAU = J.TAU, PI = Math.PI, clamp = J.clamp, lerp = J.lerp;
const HIDE = Object.freeze({ hide: true });
const EN = (key, def) => J.register('enter', key, def, P);
const EX = (key, def) => J.register('exit', key, def, P);
const HO = (key, def) => J.register('hold', key, def, P);
const TREAT = (key, def) => J.register('treat', key, def, P);
const CAM = (key, def) => J.register('cam', key, def, P);

/* ---------------------------------------------------------------- helpers (same word model as the kinetic set) */
const strip = t => String(t || '').replace(/\s+/g, '');
const hasLatin = t => /[A-Za-z]/.test(String(t || ''));
const isBlank = ch => ch === ' ' || ch === '　';
const bellK = k => Math.sin(PI * clamp(k));
// damped wobble that starts at 0: 0 → out → back, t in seconds
const kick = (t, k = 9, f = 26) => (t <= 0 ? 0 : Math.exp(-k * t) * Math.sin(f * t));
// damped spring: 1 at t=0 → exactly 0 at t=1, swinging through 0 (f half-turns)
const spring1 = (t, k, f) => { t = clamp(t); return Math.exp(-k * t) * Math.cos(f * PI * t) * (1 - t * t * t); };
function bounceE(x) {
  const n1 = 7.5625, d1 = 2.75;
  if (x < 1 / d1) return n1 * x * x;
  if (x < 2 / d1) return n1 * (x -= 1.5 / d1) * x + 0.75;
  if (x < 2.5 / d1) return n1 * (x -= 2.25 / d1) * x + 0.9375;
  return n1 * (x -= 2.625 / d1) * x + 0.984375;
}
// staggered local progress for element k of n (spread = share of the time used for the stagger)
const stg = (p, k, n, spread) => clamp((p - (n > 1 ? k / (n - 1) : 0) * spread) / (1 - spread));
const glyphs = (it, fn) => { (it.charFns || (it.charFns = [])).push(fn); };
const mot = env => (env.fx.motion ?? 0.7);
const beatSince = (env, per) => (env.beat && env.beat.len > 0.15 ? env.beat.since : (((env.ltb ?? env.lt) % per) + per) % per);
const beatIdx = (env, per) => (env.beat && env.beat.len > 0.15 ? env.beat.index : Math.floor((env.ltb ?? env.lt) / per));
const sideOf = (env, it, salt) => ((J.h(env.cut.seed | 0, it.mi | 0, salt) & 1) ? 1 : -1);

/* ---- word geometry of an item: which word each glyph belongs to, word boxes at size 1 ---- */
const geoCache = new Map();
function wordsFor(env, text) {
  const lat = hasLatin(text);
  let ws = (env.cut && env.cut.words ? env.cut.words : []).map(strip).filter(Boolean);
  const flatS = strip(text), all = ws.join('');
  let off = ws.length ? all.indexOf(flatS) : -1;
  if (off < 0) {
    ws = (lat ? String(text).split(/\s+/) : (J.chunkText ? J.chunkText(String(text).replace(/\n/g, '')) : [text])).map(strip).filter(Boolean);
    off = 0;
  }
  return { ws, off };
}
function wgeo(env, it) {
  const text = String(it.text || '');
  const key = [text, it.font, it.track || 0, it.lead || 0, it.vertical ? 1 : 0, it.align || '', it.sx || 1, it.sy || 1, J.TYPESET ? 1 : 0, (env.cut && env.cut.words || []).join('\u0001')].join('\u0002');
  let G = geoCache.get(key);
  if (G) return G;
  const L1 = J.layoutText(Object.assign({}, it, { size: 1, _lay: null, _m: null }));
  const { ws, off } = wordsFor(env, text);
  const bnd = []; let acc = 0;
  ws.forEach(w => { acc += [...w].length; bnd.push(acc); });
  const map = new Array(L1.length).fill(-1), inW = new Array(L1.length).fill(0);
  let k = 0, jmin = 1e9, jmax = -1;
  for (const g of L1) {
    if (isBlank(g.ch)) continue;
    const pos = off + k; let j = bnd.findIndex(b => pos < b); if (j < 0) j = Math.max(0, bnd.length - 1);
    map[g.i] = j; jmin = Math.min(jmin, j); jmax = Math.max(jmax, j); k++;
  }
  if (jmax < 0) { jmin = 0; jmax = 0; }
  const nW = jmax - jmin + 1, sx = it.sx || 1, sy = it.sy || 1;
  const wb = []; for (let j = 0; j < nW; j++) wb.push({ x0: 1e9, x1: -1e9, y0: 1e9, y1: -1e9, n: 0 });
  for (const g of L1) {
    if (map[g.i] < 0) continue;
    const j = map[g.i] - jmin; map[g.i] = j;
    const b = wb[j], x = (g.x + g.vx) * sx, y = (g.y + g.vy) * sy;
    if (!b.n) b.li = g.li;
    inW[g.i] = b.n++;
    b.x0 = Math.min(b.x0, x - g.w * sx / 2); b.x1 = Math.max(b.x1, x + g.w * sx / 2); b.y0 = Math.min(b.y0, y - g.h * sy / 2); b.y1 = Math.max(b.y1, y + g.h * sy / 2);
  }
  wb.forEach(b => { if (!b.n) { b.x0 = b.x1 = b.y0 = b.y1 = 0; } b.cx = (b.x0 + b.x1) / 2; b.cy = (b.y0 + b.y1) / 2; });
  let X0 = 1e9, X1 = -1e9, Y0 = 1e9, Y1 = -1e9;
  wb.forEach(b => { if (!b.n) return; X0 = Math.min(X0, b.x0); X1 = Math.max(X1, b.x1); Y0 = Math.min(Y0, b.y0); Y1 = Math.max(Y1, b.y1); });
  if (X0 > X1) { X0 = X1 = Y0 = Y1 = 0; }
  G = { L1, map, inW, nW, wb, box: { x0: X0, x1: X1, y0: Y0, y1: Y1, cx: (X0 + X1) / 2, cy: (Y0 + Y1) / 2 }, vert: !!it.vertical };
  if (geoCache.size > 300) geoCache.clear();
  geoCache.set(key, G);
  return G;
}
// size ratio of the drawn glyph to the size-1 layout, and the glyph's position in item space
const kOf = (G, g, it) => { const r = G.L1[g.i]; return r && r.w > 1e-6 ? g.w / r.w : it.size; };
const gpos = (g, it) => [(g.x + g.vx) * (it.sx || 1), (g.y + g.vy) * (it.sy || 1)];
// length and start of the text along its reading axis (size-1 units)
const axis = G => (G.vert ? [G.box.y0, Math.max(1e-3, G.box.y1 - G.box.y0)] : [G.box.x0, Math.max(1e-3, G.box.x1 - G.box.x0)]);
/* move a glyph as part of a rigid body: scale (s, sx, sy) and rotate (rot, degrees) about a pivot given in size-1 units
   (default: the word's centre), then translate by (tx, ty) design px; other keys are passed through to the glyph */
const rigid = (G, g, it, b, o) => {
  const k = kOf(G, g, it), gx = (g.x + g.vx) * (it.sx || 1), gy = (g.y + g.vy) * (it.sy || 1);
  const px = (o.px != null ? o.px : b.cx) * k, py = (o.py != null ? o.py : b.cy) * k;
  const s = o.s != null ? o.s : 1;
  let rx = (gx - px) * s * (o.sx || 1), ry = (gy - py) * s * (o.sy || 1);
  if (o.rot) { const c = Math.cos(o.rot * DEG), sn = Math.sin(o.rot * DEG), x = rx; rx = x * c - ry * sn; ry = x * sn + ry * c; }
  const r = { dx: px + rx - gx + (o.tx || 0), dy: py + ry - gy + (o.ty || 0) };
  if (o.rot) r.rot = o.rot;
  if (s !== 1) r.s = s;
  if (o.sx) r.sx = o.sx;
  if (o.sy) r.sy = o.sy;
  if (o.a != null) r.a = o.a;
  if (o.skew) r.skew = o.skew;
  if (o.color) r.color = o.color;
  if (o.outline) r.outline = true;
  return r;
};

/* ================================================================================================ ENTRANCES */
const WIN = dur => clamp(dur * 0.45, 0.34, 1.0);
const WIN2 = dur => clamp(dur * 0.5, 0.45, 1.15);

/* 左右から語 — words shoot in from the left and the right in turn and overshoot; each arrival shoves the ones already down */
EN('kzSideVolley', { name: '左右から語', en: 'Side Volley', tags: ['pop', 'graphic', 'glitch'], w: 1.2, ae: 'slice', minDur: 0.5, inDur: WIN,
  apply(env, it, p, ctx) {
    const G = wgeo(env, it), n = G.nW, vert = G.vert, sp = n > 1 ? 0.6 : 0, secs = ctx.inDur * (1 - sp);
    const d0 = sideOf(env, it, 811), D = (vert ? env.H : env.W) * 0.62, fade = clamp((1 - p) * 10);
    const sgn = j => (j % 2 ? -d0 : d0);
    const q = []; for (let j = 0; j < n; j++) q.push(stg(p, j, n, sp));
    const sh = new Array(n).fill(0);
    for (let j = 0; j < n; j++) for (let j2 = j + 1; j2 < n; j2++) if (q[j2] > 0.45) sh[j] -= sgn(j2) * 0.14 * kick((q[j2] - 0.45) * secs, 10, 30);
    glyphs(it, (i, g) => {
      const j = G.map[i]; if (j < 0) return null;
      if (q[j] <= 0) return HIDE;
      const e = E.outBack(clamp(q[j] * 1.3), 1.5), fast = Math.pow(1 - clamp(q[j] * 1.7), 2);
      const a = sgn(j) * D * (1 - e) + sh[j] * it.size * fade, st = 1 + 0.7 * fast, al = clamp(q[j] * 8);
      return rigid(G, g, it, G.wb[j], vert ? { ty: a, sy: st, a: al } : { tx: a, sx: st, a: al });
    });
  } });

/* 語の車輪 — each word rolls in along the line as one rigid wheel, a full turn, rolls a touch too far and rocks back */
EN('kzWordWheel', { name: '語の車輪', en: 'Word Wheel', tags: ['pop', 'graphic'], w: 0.8, ae: 'spin', minDur: 0.55, inDur: WIN2,
  apply(env, it, p) {
    const G = wgeo(env, it), n = G.nW, vert = G.vert, sp = n > 1 ? 0.5 : 0;
    glyphs(it, (i, g) => {
      const j = G.map[i]; if (j < 0) return null;
      const q = stg(p, j, n, sp); if (q <= 0) return HIDE;
      const b = G.wb[j], k = kOf(G, g, it);
      const R = Math.max(0.45, Math.hypot(b.x1 - b.x0, b.y1 - b.y0) * 0.4);          // wheel radius in em
      const d = TAU * R * (1 - E.outBack(q, 1.1)), ang = d / R / DEG, al = clamp(q * 7);
      return rigid(G, g, it, b, vert ? { ty: d * k, rot: -ang, a: al } : { tx: d * k, rot: ang, a: al });
    });
  } });

/* 突き抜け戻り — each word swells straight through its size as a hollow outline, then snaps back solid and rings */
EN('kzPunchThrough', { name: '突き抜け戻り', en: 'Punch Through', tags: ['pop', 'graphic', 'glitch'], w: 1, ae: 'zoom', minDur: 0.5, inDur: WIN,
  apply(env, it, p) {
    const G = wgeo(env, it), n = G.nW, sp = n > 1 ? 0.55 : 0, acc = env.sc.accent, T = 0.46;
    glyphs(it, (i, g) => {
      const j = G.map[i]; if (j < 0) return null;
      const q = stg(p, j, n, sp); if (q <= 0) return HIDE;
      if (q < T) return rigid(G, g, it, G.wb[j], { s: lerp(0.15, 1.6, E.outCubic(q / T)), a: clamp(q * 12), outline: true });
      const t = (q - T) / (1 - T);
      return rigid(G, g, it, G.wb[j], { s: 1 + 0.6 * spring1(t, 4.5, 3.4), color: t < 0.2 ? acc : null });
    });
  } });

/* 塔からほどく — the words pile up as a tower in the middle, one per tick, then swing out of it into the line */
EN('kzTowerUnstack', { name: '塔からほどく', en: 'Tower Unstack', tags: ['pop', 'graphic', 'editorial'], w: 0.9, ae: 'assemble', minDur: 0.75, inDur: dur => clamp(dur * 0.52, 0.5, 1.25),
  apply(env, it, p) {
    const G = wgeo(env, it), n = G.nW, vert = G.vert, B = G.box;
    if (n < 2) {
      glyphs(it, (i) => (G.map[i] < 0 ? null : { dy: -(1 - bounceE(p)) * it.size * 1.5, a: clamp(p * 7) }));
      return;
    }
    let lh = 0; for (const b of G.wb) lh = Math.max(lh, vert ? b.x1 - b.x0 : b.y1 - b.y0);
    lh *= 1.1;
    const fit = Math.min(1, (vert ? env.W : env.H) * 0.78 / Math.max(1, n * lh * it.size)), T = 0.5;
    glyphs(it, (i, g) => {
      const j = G.map[i]; if (j < 0) return null;
      const aIn = stg(clamp(p / T), j, n, 0.72); if (aIn <= 0) return HIDE;
      const b = G.wb[j], k = kOf(G, g, it), off = (j - (n - 1) / 2) * lh * fit;
      const sx0 = vert ? B.cx - off : B.cx, sy0 = vert ? B.cy : B.cy + off;
      const e = E.outBack(E.inOutSine(stg(clamp((p - T) / (1 - T)), j, n, 0.4)), 1.25), pop = E.outBack(aIn, 2.2);
      const s = lerp(fit * lerp(0.55, 1, pop), 1, clamp(e));
      return rigid(G, g, it, b, { s, rot: 4 * e * (1 - e) * (j % 2 ? 9 : -9), tx: (sx0 - b.cx) * k * (1 - e), ty: (sy0 - b.cy) * k * (1 - e), a: clamp(aIn * 7) });
    });
  } });

/* 水切り — each word skips in from the side like a flat stone: three hops, each lower, flattening where it touches */
EN('kzSkipStone', { name: '水切り', en: 'Skipping Stone', tags: ['pop', 'emotional'], w: 0.9, ae: 'drop', minDur: 0.55, inDur: WIN2,
  apply(env, it, p) {
    const G = wgeo(env, it), n = G.nW, sp = n > 1 ? 0.5 : 0, sg = sideOf(env, it, 815);
    const D = Math.min(env.W * 0.5, it.size * 5.5), H0 = it.size * 1.05;
    glyphs(it, (i, g) => {
      const j = G.map[i]; if (j < 0) return null;
      const q = stg(p, j, n, sp); if (q <= 0) return HIDE;
      const b = G.wb[j], u = 1 - Math.pow(1 - q, 1.7), ph = u * 3, fr = ph - Math.floor(ph);
      const h = Math.abs(Math.sin(PI * ph)) * H0 * Math.pow(1 - u, 1.1);
      const touch = Math.max(0, 1 - Math.min(fr, 1 - fr) * 7) * (1 - u);
      return rigid(G, g, it, b, { py: b.y1, tx: sg * D * (1 - u), ty: -h, sy: 1 - 0.32 * touch, sx: 1 + 0.2 * touch, rot: -sg * 7 * (1 - u) * (1 - touch), a: clamp(q * 9) });
    });
  } });

/* シーソー着地 — the line is a see-saw: every word that drops onto it tips the whole line towards its side before it levels out */
EN('kzSeesaw', { name: 'シーソー着地', en: 'Seesaw Landing', tags: ['pop', 'graphic', 'emotional'], w: 1, ae: 'drop', minDur: 0.65, inDur: WIN2,
  apply(env, it, p, ctx) {
    const G = wgeo(env, it), n = G.nW, vert = G.vert, B = G.box, sp = n > 1 ? 0.45 : 0, fd = (1 - sp) * 0.34, secs = ctx.inDur;
    const half = axis(G)[1] / 2, st = [];
    let th = 0;
    for (let j = 0; j < n; j++) {
      const p0 = (n > 1 ? j / (n - 1) : 0) * sp; st.push(p0);
      const u = n > 1 ? (vert ? G.wb[j].cy - B.cy : G.wb[j].cx - B.cx) / half : 0.5 * sideOf(env, it, 817);
      th += 9 * u * kick((p - p0 - fd) * secs, 6.5, 20);
    }
    th = clamp(th, -13, 13) * clamp((1 - p) * 8);
    glyphs(it, (i, g) => {
      const j = G.map[i]; if (j < 0) return null;
      if (p <= st[j]) return HIDE;
      const q = clamp((p - st[j]) / fd), fall = (1 - q * q) * it.size * 2.4;
      return rigid(G, g, it, null, { px: B.cx, py: B.cy, rot: th, tx: vert ? fall : 0, ty: vert ? 0 : -fall, a: clamp(q * 5) });
    });
  } });

/* トランポリン — the line is a springy sheet: each word is tossed up from below and lands on it; the landing dips it, and the dent runs outward under the other letters */
EN('kzTrampoline', { name: 'トランポリン', en: 'Trampoline', tags: ['pop', 'emotional'], w: 1, ae: 'drop', minDur: 0.6, inDur: WIN2,
  apply(env, it, p, ctx) {
    const G = wgeo(env, it), n = G.nW, vert = G.vert, sp = n > 1 ? 0.5 : 0, fd = (1 - sp) * 0.4, secs = ctx.inDur;
    const A = it.size * 0.3 * clamp((1 - p) * 9), st = [], pos = [];
    for (let j = 0; j < n; j++) { st.push((n > 1 ? j / (n - 1) : 0) * sp); pos.push(vert ? G.wb[j].cy : G.wb[j].cx); }
    glyphs(it, (i, g) => {
      const j = G.map[i]; if (j < 0) return null;
      if (p <= st[j]) return HIDE;
      const q = clamp((p - st[j]) / fd), k = kOf(G, g, it), [gx, gy] = gpos(g, it), x = (vert ? gy : gx) / k;
      let w = 0;
      for (let j2 = 0; j2 < n; j2++) {
        const d = Math.abs(x - pos[j2]), t = (p - st[j2] - fd) * secs - d / 28;
        if (t > 0) w += Math.exp(-d * 0.28) * kick(t, 6, 19);
      }
      // tossed up from below the sheet, over the top, and down onto it
      const fly = q < 0.55 ? lerp(2.4, -0.75, E.outQuad(q / 0.55)) : -0.75 * (1 - Math.pow((q - 0.55) / 0.45, 2));
      const v = fly * it.size + A * w, al = clamp(q * 5), st2 = 1 + 0.22 * (q < 1 ? Math.sin(PI * q) : 0);
      return vert ? { dx: -v, sx: st2, a: al } : { dy: v, sy: st2, a: al };
    });
  } });

/* 行き過ぎ戻り — every word runs in leaning forward, cannot stop, skids past its place leaning back and backs up into it */
EN('kzOverrun', { name: '行き過ぎ戻り', en: 'Overrun', tags: ['pop', 'graphic'], w: 1.1, ae: 'stretch', minDur: 0.55, inDur: WIN2,
  apply(env, it, p) {
    const G = wgeo(env, it), n = G.nW, vert = G.vert, sp = n > 1 ? 0.48 : 0;
    const D = (vert ? env.H : env.W) * 0.55, O = it.size * 0.95, T = 0.55;
    glyphs(it, (i, g) => {
      const j = G.map[i]; if (j < 0) return null;
      const q = stg(p, j, n, sp); if (q <= 0) return HIDE;
      let a, lean, st = 1;
      if (q < T) { const t = q / T; a = lerp(D, -O, E.outQuad(t)); lean = lerp(17, -21, t * t); st = 1 + 0.4 * (1 - t) * (1 - t); }
      else { const t = (q - T) / (1 - T); a = -O * (1 - E.inOutCubic(t)); lean = -21 * (1 - t) * (1 - t) + 7 * Math.sin(PI * t) * (1 - t); }
      const al = clamp(q * 9);
      return rigid(G, g, it, G.wb[j], vert ? { ty: a, sy: st, rot: -lean * 0.3, a: al } : { tx: a, sx: st, skew: lean, a: al });
    });
  } });

/* 弓なり戻り — the line appears drawn like a bow and is let go: it whips through straight a few times and comes to rest */
EN('kzBowSnap', { name: '弓なり戻り', en: 'Bow Release', tags: ['pop', 'emotional', 'graphic'], w: 1, ae: 'stretch', minDur: 0.5, inDur: WIN,
  apply(env, it, p) {
    const G = wgeo(env, it), vert = G.vert, B = G.box, half = axis(G)[1] / 2, sg = sideOf(env, it, 823);
    const A = Math.min(it.size * 1.5, (vert ? env.W : env.H) * 0.2) * sg * spring1((p - 0.14) / 0.86, 2.1, 3.2);
    glyphs(it, (i, g) => {
      if (G.map[i] < 0) return null;
      const k = kOf(G, g, it), [gx, gy] = gpos(g, it), u = clamp(((vert ? gy / k - B.cy : gx / k - B.cx)) / half, -1, 1);
      const al = clamp((p * 1.8 - Math.abs(u) * 0.22) * 8); if (al <= 0) return HIDE;
      const d = A * (1 - u * u), sl = Math.atan(2 * u * A / (half * k)) / DEG;
      return vert ? { dx: d, rot: sl, a: al } : { dy: -d, rot: sl, a: al };
    });
  } });

/* ================================================================================================ EXITS */
const OUT = dur => clamp(dur * 0.32, 0.3, 0.75);
const OUT2 = dur => clamp(dur * 0.38, 0.36, 0.9);

/* 打ち飛ばし — the line takes a hit on one end: a flash of squash, then it sails off as one piece, tumbling end over end */
EX('kzBatAway', { name: '打ち飛ばし', en: 'Batted Away', tags: ['pop', 'graphic', 'glitch'], w: 1.1, ae: 'scatter', outDur: OUT,
  apply(env, it, p) {
    const G = wgeo(env, it), B = G.box, sg = sideOf(env, it, 831), T = 0.16, acc = env.sc.accent;
    let o;
    if (p < T) { const bl = bellK(p / T); o = { px: B.cx, py: B.cy, sx: 1 - 0.16 * bl, sy: 1 + 0.1 * bl, tx: sg * it.size * 0.14 * bl, color: p > T * 0.35 ? acc : null }; }
    else {
      const t = (p - T) / (1 - T), e = Math.pow(t, 0.85);
      o = { px: B.cx, py: B.cy, tx: sg * env.W * 1.0 * e, ty: -env.H * 0.55 * e + env.H * 0.5 * e * e, rot: sg * 230 * e, s: 1 - 0.35 * e, a: 1 - J.smooth(0.72, 1, t) };
    }
    const gone = p >= 0.999;
    glyphs(it, (i, g) => (G.map[i] < 0 ? null : gone ? HIDE : rigid(G, g, it, null, o)));
  } });

/* 引っこ抜き — the words are grabbed by one end, stretched, and snatched off sideways one by one, the last word first */
EX('kzYankOut', { name: '引っこ抜き', en: 'Yanked Out', tags: ['pop', 'graphic', 'glitch'], w: 1.1, ae: 'stretch', outDur: OUT2,
  apply(env, it, p) {
    const G = wgeo(env, it), n = G.nW, vert = G.vert, sp = n > 1 ? 0.55 : 0, d0 = sideOf(env, it, 833), D = (vert ? env.H : env.W) * 1.1;
    glyphs(it, (i, g) => {
      const j = G.map[i]; if (j < 0) return null;
      const r = n - 1 - j, q = stg(p, r, n, sp);
      if (q >= 1) return HIDE;
      if (q <= 0) return null;
      const b = G.wb[j], sg = r % 2 ? -d0 : d0, piv = vert ? { py: sg > 0 ? b.y0 : b.y1 } : { px: sg > 0 ? b.x0 : b.x1 };
      let st, a = 0, al = 1;
      if (q < 0.4) st = 1 + 0.55 * E.outCubic(q / 0.4);
      else { const t = (q - 0.4) / 0.6; st = 1.55 + 0.9 * t; a = sg * D * 1.2 * Math.pow(t, 1.7); al = 1 - J.smooth(0.7, 1, t); }
      return rigid(G, g, it, b, Object.assign(piv, vert ? { sy: st, ty: a, a: al } : { sx: st, tx: a, a: al }));
    });
  } });

/* 振って放る — the line starts to swing from a point above it, further each time, and is let go at full speed */
EX('kzSwingFling', { name: '振って放る', en: 'Swing And Fling', tags: ['pop', 'emotional', 'graphic'], w: 0.9, ae: 'drift', minDur: 0.9, outDur: dur => clamp(dur * 0.42, 0.45, 0.95),
  apply(env, it, p) {
    const G = wgeo(env, it), B = G.box, sg = sideOf(env, it, 835), L = 3.2, T = 0.66;
    let o;
    if (p < T) { const u = p / T; o = { px: B.cx, py: B.y0 - L, rot: sg * 24 * Math.pow(u, 1.3) * Math.sin(TAU * 1.5 * u) }; }
    else {
      const t = (p - T) / (1 - T), v0 = 6.5 * it.size;
      o = { px: B.cx, py: B.cy, tx: sg * (v0 * t + Math.max(0, env.W * 1.15 - v0) * t * t), ty: -it.size * 1.6 * t + (env.H * 0.45 + it.size * 1.6) * t * t,
        rot: -sg * (116 * t + 70 * t * t), a: 1 - J.smooth(0.78, 1, t) };
    }
    const gone = p >= 0.999;
    glyphs(it, (i, g) => (G.map[i] < 0 ? null : gone ? HIDE : rigid(G, g, it, null, o)));
  } });

/* 屈んで飛び込む — word after word crouches flat, springs up a little and dives straight down out of the frame */
EX('kzCrouchDive', { name: '屈んで飛び込む', en: 'Crouch Dive', tags: ['pop', 'emotional'], w: 1, ae: 'fall', outDur: OUT2,
  apply(env, it, p) {
    const G = wgeo(env, it), n = G.nW, sp = n > 1 ? 0.4 : 0;
    glyphs(it, (i, g) => {
      const j = G.map[i]; if (j < 0) return null;
      const q = stg(p, j, n, sp);
      if (q >= 1) return HIDE;
      if (q <= 0) return null;
      const b = G.wb[j];
      if (q < 0.3) { const c = E.outCubic(q / 0.3); return rigid(G, g, it, b, { py: b.y1, sy: 1 - 0.42 * c, sx: 1 + 0.31 * c }); }
      const t = (q - 0.3) / 0.7, v = 7 * it.size, acc = Math.max(17.5 * it.size, env.H * 1.2 + v);
      const sy = 0.58 + 0.8 * E.outCubic(clamp(t / 0.12));
      return rigid(G, g, it, b, { py: b.y1, ty: -v * t + acc * t * t, sy, sx: 1 / Math.sqrt(sy), a: 1 - J.smooth(0.7, 1, t) });
    });
  } });

/* 引き絞り発射 — the middle of the line is drawn back like a catapult band, trembles, and the whole line is shot away */
EX('kzSlingAway', { name: '引き絞り発射', en: 'Sling Away', tags: ['pop', 'graphic', 'emotional'], w: 1, ae: 'stretch', outDur: OUT2,
  apply(env, it, p) {
    const G = wgeo(env, it), vert = G.vert, B = G.box, half = axis(G)[1] / 2, sg = sideOf(env, it, 837), T = 0.58;
    let A, shoot = 0, st = 1, al = 1;
    if (p < T) { const c = E.inOutSine(p / T); A = it.size * 1.25 * c * (1 + 0.035 * Math.sin(p * 90) * c); }
    else {
      const t = (p - T) / (1 - T);
      A = it.size * 1.25 * lerp(1, -0.55, E.outCubic(clamp(t * 3.5)));
      shoot = (vert ? env.W : env.H) * 1.3 * Math.pow(t, 1.5); st = 1 + 0.5 * t; al = 1 - J.smooth(0.8, 1, t);
    }
    const gone = p >= 0.999;
    glyphs(it, (i, g) => {
      if (G.map[i] < 0) return null;
      if (gone) return HIDE;
      const k = kOf(G, g, it), [gx, gy] = gpos(g, it), u = clamp(((vert ? gy / k - B.cy : gx / k - B.cx)) / half, -1, 1);
      const d = sg * (A * (1 - u * u) - shoot), sl = Math.atan(-2 * u * sg * A / (half * k)) / DEG;
      return vert ? { dx: -d, rot: sl, sx: st, a: al } : { dy: d, rot: sl, sy: st, a: al };
    });
  } });

/* 打ち込み — the words are hammered into the floor like nails: three blows each, a third deeper every time, the others jumping */
EX('kzHammerDown', { name: '打ち込み', en: 'Hammered In', tags: ['pop', 'graphic', 'glitch'], w: 0.9, ae: 'fall', minDur: 0.8, outDur: dur => clamp(dur * 0.42, 0.42, 0.95),
  apply(env, it, p, ctx) {
    const G = wgeo(env, it), n = G.nW, sp = n > 1 ? 0.4 : 0, gap = (1 - sp) / 3.4, secs = ctx.outDur;
    const hit = (j, m) => (n > 1 ? j / (n - 1) : 0) * sp + m * gap + 0.02;
    const depth = [];
    let jolt = 0;
    for (let j = 0; j < n; j++) {
      let d = 0;
      for (let m = 0; m < 3; m++) { d += E.outExpo(clamp((p - hit(j, m)) / 0.07)); if (j < 12) jolt += Math.abs(kick((p - hit(j, m)) * secs, 13, 38)); }
      depth.push(d / 3);
    }
    jolt = Math.min(1.2, jolt) * it.size * 0.07;
    glyphs(it, (i, g) => {
      const j = G.map[i]; if (j < 0) return null;
      const d = depth[j];
      if (d >= 0.999) return HIDE;
      if (d <= 0) return jolt > 0.3 ? { dy: -jolt } : null;
      const b = G.wb[j], k = kOf(G, g, it), gy = gpos(g, it)[1], ty = d * (b.y1 - b.y0) * k * 1.06, floor = b.y1 * k + it.size * 0.06;
      const c1 = (floor - (gy + ty)) / Math.max(1, g.h);
      if (c1 <= -0.6) return HIDE;
      return { dy: ty, clipY: [-0.95, Math.min(0.95, c1)] };
    });
  } });

/* 激突して散る — the words rush together, crash in the middle with a flash, and ricochet off in all directions, spinning */
EX('kzCrashApart', { name: '激突して散る', en: 'Crash Apart', tags: ['pop', 'glitch', 'graphic'], w: 1, ae: 'scatter', outDur: OUT2,
  apply(env, it, p) {
    const G = wgeo(env, it), n = G.nW, B = G.box, T = 0.36, acc = env.sc.accent, sd = env.cut.seed | 0, far = Math.max(env.W, env.H) * 0.8;
    const gone = p >= 0.999;
    glyphs(it, (i, g) => {
      const j = G.map[i]; if (j < 0) return null;
      if (gone) return HIDE;
      const b = G.wb[j], k = kOf(G, g, it), hx = (B.cx - b.cx) * k * 0.8, hy = (B.cy - b.cy) * k * 0.8;
      if (p < T) { const c = E.inCubic(p / T); return rigid(G, g, it, b, { tx: hx * c, ty: hy * c, s: 1 - 0.12 * c }); }
      const t = (p - T) / (1 - T), e = E.outCubic(t), tw = j % 2 ? 1 : -1;
      const ang = n > 1 ? Math.atan2(b.cy - B.cy, b.cx - B.cx) + tw * (0.45 + 0.5 * J.r(sd, j, 3)) : TAU * J.r(sd, it.mi | 0, 5);
      return rigid(G, g, it, b, { tx: hx + Math.cos(ang) * far * e, ty: hy + Math.sin(ang) * far * e, rot: tw * 250 * e, s: 0.88 + 0.3 * bellK(t * 2.5),
        a: 1 - J.smooth(0.55, 1, t), color: t < 0.16 ? acc : null });
    });
  } });

/* 細めて発射 — the line swells a little, is pinched into one thin tall sliver, and the sliver shoots out of the frame */
EX('kzPinchShoot', { name: '細めて発射', en: 'Pinch Shoot', tags: ['graphic', 'pop', 'glitch'], w: 1, ae: 'shrink', outDur: OUT,
  apply(env, it, p) {
    const G = wgeo(env, it), vert = G.vert, B = G.box, sg = sideOf(env, it, 841), T = 0.44;
    let c, shoot = 0, lng, al = 1;
    if (p < T) { const t = p / T; c = t < 0.25 ? -0.07 * Math.sin(PI * t / 0.25) : E.inOutCubic((t - 0.25) / 0.75); lng = 1 + 0.3 * Math.max(0, c); }
    else { const t = (p - T) / (1 - T); c = 1; shoot = (vert ? env.W : env.H) * 1.3 * Math.pow(t, 1.6); lng = 1.3 + 1.7 * t; al = 1 - J.smooth(0.7, 1, t); }
    const thin = 1 - 0.93 * c, gone = p >= 0.999;
    glyphs(it, (i, g) => {
      if (G.map[i] < 0) return null;
      if (gone) return HIDE;
      const k = kOf(G, g, it), [gx, gy] = gpos(g, it);
      return vert ? { dy: (gy - B.cy * k) * (thin - 1), sy: thin, sx: lng, dx: sg * shoot, a: al } : { dx: (gx - B.cx * k) * (thin - 1), sx: thin, sy: lng, dy: -sg * shoot, a: al };
    });
  } });

/* ================================================================================================ HOLDS */

/* つぶれ波 — a bump runs along the line under the letters: the one above it is pressed flat, its neighbours stand tall */
HO('kzSquashWave', { name: 'つぶれ波', en: 'Squash Wave', tags: ['pop', 'calm', 'graphic'], w: 1, ae: 'wave',
  apply(env, it, amt) {
    const G = wgeo(env, it), vert = G.vert, M = amt * (0.4 + mot(env));
    if (M < 0.01) return;
    const t = env.ltb ?? env.lt, [start, len] = axis(G), per = 1.7, fr = (((t % per) + per) % per) / per, xw = start - 2 + fr * (len + 4);
    glyphs(it, (i, g) => {
      if (G.map[i] < 0) return null;
      const k = kOf(G, g, it), [gx, gy] = gpos(g, it), d = (vert ? gy : gx) / k - xw;
      const b0 = Math.exp(-d * d / 0.8), b1 = Math.exp(-(d - 1.5) * (d - 1.5) / 0.9) + Math.exp(-(d + 1.5) * (d + 1.5) / 0.9);
      const sy = 1 - 0.32 * M * b0 + 0.1 * M * b1;
      if (Math.abs(sy - 1) < 0.004) return null;
      return { sy, sx: 1 + 0.2 * M * b0 - 0.04 * M * b1, dy: g.h * (1 - sy) / 2 };
    });
  } });

/* 慣性ゆれ — the line shuttles to and fro; the words follow one after another like wagons and lean back against the pull */
HO('kzInertiaSway', { name: '慣性ゆれ', en: 'Inertia Sway', tags: ['calm', 'pop', 'emotional'], w: 1, ae: 'drift',
  apply(env, it, amt) {
    const G = wgeo(env, it), vert = G.vert, M = amt * (0.4 + mot(env));
    if (M < 0.01) return;
    const t = env.ltb ?? env.lt, w = TAU * 0.42, A = it.size * 0.2 * M;
    glyphs(it, (i) => {
      const j = G.map[i]; if (j < 0) return null;
      const ph = w * (t - j * 0.15), off = A * Math.sin(ph), v = Math.cos(ph);
      return vert ? { dy: off, rot: 3 * M * v } : { dx: off, skew: 6.5 * M * v };
    });
  } });

/* 飛び込み板 — the line is a springboard fixed at one end: every beat it is flicked and the free end whips up and down */
HO('kzDivingBoard', { name: '飛び込み板', en: 'Diving Board', tags: ['pop', 'graphic', 'emotional'], w: 0.9, ae: 'wave',
  apply(env, it, amt) {
    const G = wgeo(env, it), vert = G.vert, M = amt * (0.4 + mot(env)), s0 = beatSince(env, 1.15);
    const A = it.size * 0.45 * M * Math.exp(-s0 * 2.5) * Math.sin(s0 * 12.5);
    if (Math.abs(A) < 0.25) return;
    const [start, len] = axis(G), end = sideOf(env, it, 851) > 0;
    glyphs(it, (i, g) => {
      if (G.map[i] < 0) return null;
      const k = kOf(G, g, it), [gx, gy] = gpos(g, it);
      let v = clamp(((vert ? gy : gx) / k - start) / len); if (end) v = 1 - v;
      const d = A * v * v, sl = Math.atan(2 * A * v / (len * k) * (end ? -1 : 1)) / DEG;
      return vert ? { dx: -d, rot: sl } : { dy: d, rot: sl };
    });
  } });

/* 疎密パルス — a push travels down the line like along a slinky: the letters bunch up where it is and spread again behind it */
HO('kzSlinky', { name: '疎密パルス', en: 'Slinky Pulse', tags: ['pop', 'graphic', 'calm'], w: 0.9, ae: 'wave',
  apply(env, it, amt) {
    const G = wgeo(env, it), vert = G.vert, M = amt * (0.4 + mot(env)), s0 = beatSince(env, 0.95), fr = s0 / 0.5;
    if (M < 0.01 || fr > 1.5) return;
    const [start, len] = axis(G), fwd = beatIdx(env, 0.95) % 2 === 0;
    const xp = fwd ? start - 1 + fr * (len + 2) : start + len + 1 - fr * (len + 2), A = it.size * 0.3 * M * (fwd ? 1 : -1) * clamp((1.5 - fr) * 2.5);
    glyphs(it, (i, g) => {
      if (G.map[i] < 0) return null;
      const k = kOf(G, g, it), [gx, gy] = gpos(g, it), d = ((vert ? gy : gx) / k - xp) / 1.25, u = A * Math.exp(-d * d);
      if (Math.abs(u) < 0.3) return null;
      return vert ? { dy: u } : { dx: u };
    });
  } });

/* 拍で屈伸 — on every beat the words bend their knees, one a moment after the other: flat on their feet, then up tall, then still */
HO('kzBeatSquat', { name: '拍で屈伸', en: 'Beat Squat', tags: ['pop', 'graphic'], w: 1, ae: 'breathe',
  apply(env, it, amt) {
    const G = wgeo(env, it), M = amt * (0.4 + mot(env)), s0 = beatSince(env, 0.6);
    if (M < 0.01) return;
    glyphs(it, (i, g) => {
      const j = G.map[i]; if (j < 0) return null;
      const s = s0 - Math.min(j, 6) * 0.045; if (s < 0) return null;
      const v = 0.2 * M * Math.exp(-s * 4.2) * Math.cos(s * 13);
      if (Math.abs(v) < 0.003) return null;
      const b = G.wb[j];
      return rigid(G, g, it, b, { py: b.y1, sy: 1 - v, sx: 1 + v * 0.5 });
    });
  } });

/* ================================================================================================ TREATMENTS */
const ctr = (a, b) => J.contrast(a, b);
const firstOK = (list, test, fb) => { for (const c of list) if (c && test(c)) return c; return fb; };
const accentFor = (sc, col, min = 1.6) => firstOK([sc.accent, sc.accent2, sc.ghostA, sc.ghostB], c => ctr(c, col) >= min && ctr(c, sc.bg) >= 1.5, J.fitContrast(sc.accent, col, min + 0.3));
const alive = (it, amin = 0.9) => it.fill !== false && (it.alpha ?? 1) >= amin && !!it.text && it.size > 1;
const colOf = (env, it) => it.color || env.sc.fg;
const addPre = (it, f) => { const p = it.pre; it.pre = p ? (e, i) => { p(e, i); f(e, i); } : f; };
const inP = (env, it, d, len) => clamp((env.lt - (it.delay || 0) - d) / len);
const inPieces = (env, it) => {
  const c = env.cut, en = J.ENTER[it.enter || c.enter], ex = J.EXIT[it.exit || c.exit];
  if (en && en.pieces && env.lt - (it.delay || 0) < c.inDur * 1.3 + 0.05) return true;
  if (ex && ex.pieces && c.outDur > 0 && env.lt > c.dur - c.outDur - 0.3) return true;
  return false;
};
const bare = (i, extra) => Object.assign({}, i, { pre: null, post: null, echo: null, streak: null, shadow: null, extrude: null, pattern: null, patternBg: null, gradient: null,
  pieceFn: null, strokeDash: null, strokeUnder: false, wipeBar: null, cursorAt: null, bands: null, vbands: null, clip: null, clipY: null, clipFn: null, blend: null, _lay: null }, extra || {});
const masked = i => !!(i.clip || i.clipY || i.clipFn || i.bands || i.vbands);

/* 流線影 — the glyphs drag a shadow of thin speed lines behind them: their own shapes smeared backwards, seen through a comb */
TREAT('kzSpeedShadow', { name: '流線影', en: 'Speed Shadow', tags: ['pop', 'graphic', 'glitch'], w: 1,
  plan: rng => ({ d: rng.range(0.36, 0.52), n: rng.int(3, 4), gap: rng.range(0.17, 0.21) }),
  apply(env, it, P) {
    if (!alive(it)) return;
    const tc = accentFor(env.sc, colOf(env, it), 1.5), n = P.n || 3;
    addPre(it, (e, i) => {
      if (e.pass !== 'main' || (i.dash != null && i.dash < 1) || masked(i) || inPieces(e, i)) return;
      const q = E.outCubic(inP(e, it, 0.02, 0.4)) * (1 - E.inCubic(e.pOut));
      if (q < 0.02) return;
      const ctx = e.ctx, s = i.size, vert = !!i.vertical, m = i._m || J.measure(i), L = s * (P.d || 0.44) * q, th = s * 0.07, gp = s * (P.gap || 0.19);
      const ca = Math.cos((i.rot || 0) * DEG), sa = Math.sin((i.rot || 0) * DEG);
      const ex = m.w + L + s, ey = m.h + L + s;
      ctx.save();
      ctx.translate(i.x, i.y); if (i.rot) ctx.rotate(i.rot * DEG);
      ctx.beginPath();
      if (!vert) { let c = 0; for (let y = -ey + gp * 0.35; y < ey && c < 200; y += gp, c++) ctx.rect(-ex, y, ex * 2, th); }
      else { let c = 0; for (let x = -ex + gp * 0.35; x < ex && c < 200; x += gp, c++) ctx.rect(x, -ey, th, ey * 2); }
      if (i.rot) ctx.rotate(-i.rot * DEG); ctx.translate(-i.x, -i.y);
      ctx.clip();
      for (let c = n; c >= 1; c--) {
        const o = L * c / n, dx = vert ? o * sa : -o * ca, dy = vert ? -o * ca : -o * sa;
        J.drawItem(e, bare(i, { x: i.x + dx, y: i.y + dy, color: tc, stroke: 0, alpha: (i.alpha ?? 1) * (1 - 0.7 * (c - 1) / Math.max(1, n - 1)) }));
      }
      ctx.restore();
    });
  } });

/* 前コマ残し — two outline drawings of the line stay behind it, tipped back about its foot like the previous frames of a swing */
TREAT('kzOnionSkin', { name: '前コマ残し', en: 'Onion Skin', tags: ['pop', 'graphic', 'editorial'], w: 0.9,
  plan: rng => ({ r: rng.range(2.6, 3.8) * rng.pick([1, -1]), n: rng.pick([2, 2, 3]) }),
  apply(env, it, P) {
    if (!alive(it) || inPieces(env, it)) return;
    const tc = accentFor(env.sc, colOf(env, it), 1.4), r0 = P.r || 3;
    const f = (i, e) => {
      const amt = E.outBack(inP(e, it, 0.08, 0.5), 1.6) * (1 - E.inCubic(e.pOut));
      if (amt <= 0.01) { i.echo = null; return; }
      const m = i._m || J.measure(i), th = r0 * amt * (0.9 + 0.1 * Math.sin(e.ltb * 2.6)) * DEG, w = Math.min(m.w, i.size * 9), h = m.h;
      // rotate about the foot of the line (bottom corner on the side it tips from)
      i.echo = { n: P.n || 2, rot: th / DEG, dx: th * h / 2, dy: -Math.abs(th) * w / 2, a: 0.85, decay: 0.62, outline: true, color: tc };
    };
    f(it, env); addPre(it, (e, i) => f(i, e));
  } });

/* 加速組み — the glyphs grow steadily along the line on a common baseline, as if the phrase were gathering speed */
const crCache = new Map();
TREAT('kzCrescendo', { name: '加速組み', en: 'Crescendo', tags: ['pop', 'graphic', 'emotional'], w: 0.9, safe: true,
  plan: rng => ({ k: rng.range(0.34, 0.46), rev: rng.chance(0.22) }),
  apply(env, it, P) {
    if (!alive(it, 0.5)) return;
    const kk = P.k || 0.4, key = [it.text, it.font, it.track || 0, it.lead || 0, it.vertical ? 1 : 0, it.align || '', kk, P.rev ? 1 : 0, J.TYPESET ? 1 : 0].join('\u0002');
    let R = crCache.get(key);
    if (!R) {
      const L1 = J.layoutText(Object.assign({}, it, { size: 1, sx: 1, sy: 1, _lay: null, _m: null })), vert = !!it.vertical, lines = new Map();
      L1.forEach(g => { const a = lines.get(g.li) || []; a.push(g); lines.set(g.li, a); });
      const out = new Array(L1.length).fill(null);
      for (const Lg of lines.values()) {
        const m = Lg.length; if (m < 2) continue;
        const first = Lg[0], last = Lg[m - 1];
        const a0 = vert ? first.y - first.h / 2 : first.x - first.w / 2, a1 = vert ? last.y + last.h / 2 : last.x + last.w / 2, old = a1 - a0;
        const sc0 = q => { const u = q / (m - 1); return lerp(1 - kk * 0.55, 1 + kk * 0.45, P.rev ? 1 - u : u); };
        let tot = 0; Lg.forEach((g, q) => { tot += (vert ? g.h : g.w) * sc0(q); });
        const gapSum = old - Lg.reduce((s, g) => s + (vert ? g.h : g.w), 0), norm = Math.min(1, (old - gapSum) / Math.max(1e-6, tot));
        // keep the original gaps between glyphs, re-flow the scaled advances and keep the line's own alignment
        let pos = 0; const np = [];
        Lg.forEach((g, q) => {
          const adv = (vert ? g.h : g.w) * sc0(q) * norm;
          if (q > 0) { const pv = Lg[q - 1]; pos += vert ? (g.y - g.h / 2) - (pv.y + pv.h / 2) : (g.x - g.w / 2) - (pv.x + pv.w / 2); }
          np.push(pos + adv / 2); pos += adv;
        });
        const start = it.align === 'left' ? a0 : it.align === 'right' && !vert ? a1 - pos : a0 + (old - pos) / 2;
        Lg.forEach((g, q) => {
          const s = sc0(q) * norm, na = start + np[q];
          out[g.i] = vert ? { dx: 0, dy: na - g.y, s } : { dx: na - g.x, dy: (1 - s) * 0.36, s };
        });
      }
      R = { out, L1 };
      if (crCache.size > 300) crCache.clear();
      crCache.set(key, R);
    }
    const sx = it.sx || 1, sy = it.sy || 1;
    it.charFns.push((i, g) => {
      const o = R.out[i]; if (!o) return null;
      const r = R.L1[i], k = r && r.w > 1e-6 ? g.w / r.w : it.size;
      return { dx: o.dx * k * sx, dy: o.dy * k * sy, s: o.s };
    });
  } });

/* 跳ね組み — every word is set along the arc of a hop: its letters rise, tip over the top and come down again */
TREAT('kzHopArc', { name: '跳ね組み', en: 'Hop Arcs', tags: ['pop', 'emotional'], w: 0.8, safe: true,
  plan: rng => ({ h: rng.range(0.17, 0.25), tilt: rng.range(9, 14) }),
  apply(env, it, P) {
    if (!alive(it, 0.5)) return;
    const G = wgeo(env, it), vert = G.vert, hh = P.h || 0.2, tl = P.tilt || 11;
    it.charFns.push((i, g) => {
      const j = G.map[i]; if (j < 0 || J.isPunct(g.ch)) return null;
      const m = G.wb[j].n; if (m < 2) return null;
      const u = 0.12 + 0.76 * G.inW[i] / (m - 1), k = kOf(G, g, it);
      const lift = (Math.sin(PI * u) - 0.55) * hh * k * Math.min(1, 0.55 + m * 0.15), rot = -Math.cos(PI * u) * tl;
      return vert ? { dx: lift, rot: rot * 0.6 } : { dy: -lift, rot: -rot };
    });
  } });

/* 段々斜体 — the line is cut into level strips and each strip is pushed a step further forward: an italic made of stairs */
TREAT('kzStepShear', { name: '段々斜体', en: 'Stepped Lean', tags: ['graphic', 'glitch', 'pop'], w: 0.8, safe: true,
  plan: rng => ({ n: rng.pick([3, 4, 4, 5]), d: rng.range(0.05, 0.075), dir: rng.pick([1, 1, -1]) }),
  apply(env, it, P) {
    if (!alive(it, 0.5) || inPieces(env, it)) return;
    const n = P.n || 4, dir = P.dir || 1, d = P.d || 0.06;
    if (it.vertical) { it.charFns.push(() => ({ rot: 5 * dir })); return; }
    if (Math.abs(it.rot || 0) > 0.5) { it.skew = (it.skew || 0) - 9 * dir; return; }
    addPre(it, (e, i) => {
      if (masked(i) || Math.abs(i.rot || 0) > 0.5 || (i.dash != null && i.dash < 1)) return;
      const q = E.outBack(inP(e, it, 0.05, 0.4), 1.8) * (1 - E.inCubic(e.pOut));
      if (Math.abs(q) < 0.02) return;
      const lines = String(i.text).split('\n').length, lead = (i.lead || 1.3) * i.size * (i.sy || 1), bands = [];
      for (let li = 0; li < lines; li++) {
        const y0 = i.y + (li - (lines - 1) / 2) * lead - lead / 2;
        for (let b = 0; b < n; b++) bands.push([y0 + b * lead / n, y0 + (b + 1) * lead / n, dir * d * i.size * q * ((n - 1) / 2 - b)]);
      }
      i.bands = bands;
    });
  } });

/* ================================================================================================ CAMERA */
const KM = env => clamp((env.fx.motion ?? 0.7) * 1.25, 0, 1.25);
/* word clock of a cut (same rule as the kinetic set): onsets spread over the first half, locked to beats nearby */
const clockCache = new WeakMap();
function wordTimes(env, nMax = 6) {
  const c = env.cut;
  const v = clockCache.get(c);
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

/* 被弾の反動 — the cut opens as if the frame had just been struck: knocked off along one line, twisted, ringing back to rest;
   later words land lighter blows from the other side */
CAM('kzRecoil', { name: '被弾の反動', en: 'Hit Recoil', tags: ['pop', 'glitch', 'graphic'], w: 0.8, strong: true,
  plan: rng => ({ a: rng.range(0, TAU), r: rng.range(2.4, 3.5) * rng.pick([1, -1]) }),
  get(env, P) {
    const K = Math.min(1, KM(env)), lt = env.lt, ts = wordTimes(env), ca = Math.cos(P.a || 0), sa = Math.sin(P.a || 0);
    let x = 0, y = 0, rot = 0, z = 0;
    for (let i = 0; i < ts.length && i < 6; i++) {
      const d = lt - ts[i]; if (d < 0) break;
      const g = i === 0 ? 1 : 0.36, sg = i % 2 ? -1 : 1, r = Math.exp(-d * 7.5) * Math.cos(d * 19);
      x += sg * ca * g * r; y += sg * sa * g * r; rot += sg * g * Math.exp(-d * 6.5) * Math.cos(d * 15); z += g * Math.exp(-d * 9);
    }
    return { x: clamp(x, -1, 1) * env.W * 0.042 * K, y: clamp(y, -1, 1) * env.H * 0.036 * K, rot: clamp(rot, -1.2, 1.2) * (P.r || 3) * K,
      s: 1.03 + 0.045 * K * Math.min(1, z), blur: 5 * K * Math.exp(-lt * 14) };
  } });

/* ノックバック — the frame is punched away from the viewer on the first frames, springs forward past its place and settles */
CAM('kzKnockback', { name: 'ノックバック', en: 'Knockback', tags: ['pop', 'graphic', 'emotional'], w: 0.8, strong: true,
  plan: rng => ({ r: rng.range(-1.6, 1.6), z: rng.range(0.06, 0.075) }),
  get(env, P) {
    const K = Math.min(1, KM(env)), lt = env.lt, a = 0.07;
    let kb;
    if (lt < a) kb = E.outCubic(lt / a); else { const d = lt - a; kb = Math.exp(-d * 6) * Math.cos(d * 13.5); }
    const drift = 0.02 * clamp((lt - 0.6) / Math.max(0.6, env.cut.dur - 0.6));
    return { s: 1 - (P.z || 0.07) * K * kb + drift, rot: (P.r || 0) * K * kb, blur: 6 * K * Math.max(0, kb) * Math.exp(-lt * 9) };
  } });

/* 語でうなずく — the camera nods once for every word: a quick dip with a slight squeeze, and up again */
CAM('kzWordNod', { name: '語でうなずく', en: 'Word Nod', tags: ['pop', 'calm', 'editorial'], w: 0.9,
  plan: rng => ({ a: rng.range(0.018, 0.026), up: rng.chance(0.25) }),
  get(env, P) {
    const K = Math.min(1, KM(env)), lt = env.lt, ts = wordTimes(env);
    const nod = d => (d < 0 ? 0 : d < 0.08 ? E.outCubic(d / 0.08) : Math.exp(-(d - 0.08) * 8) * Math.cos((d - 0.08) * 14));
    let v = 0;
    for (let i = 0; i < ts.length && i < 6; i++) v += (i === 0 ? 0.6 : 1) * nod(lt - ts[i]);
    if (env.beat && env.beat.len > 0.2 && lt > ts[ts.length - 1] + 0.4) v += 0.55 * nod(env.beat.since);
    v = clamp(v, -1, 1.2);
    return { y: (P.up ? -1 : 1) * env.H * (P.a || 0.022) * K * v, s: 1.02 + 0.02 * K * Math.max(0, v), sy: 1 - 0.012 * K * v };
  } });

/* 横滑り停止 — the frame slides in sideways, sheared by its own speed, brakes hard and rocks back upright */
CAM('kzSkidStop', { name: '横滑り停止', en: 'Skid Stop', tags: ['pop', 'graphic', 'glitch'], w: 0.8,
  plan: rng => ({ dir: rng.pick([1, -1]), a: rng.range(0.04, 0.05) }),
  get(env, P) {
    const K = Math.min(1, KM(env)), lt = env.lt, T = 0.46, dir = P.dir || 1, rem = 1 - E.outCubic(clamp(lt / T));
    const d = lt - T * 0.8, back = d > 0 ? Math.exp(-d * 8) * Math.sin(d * 19) : 0;
    return { x: -dir * env.W * (P.a || 0.045) * K * rem, skx: dir * K * (7 * Math.pow(rem, 0.7) - 3 * back), sx: 1 + 0.04 * K * rem, s: 1.02, blur: 4 * K * rem * rem };
  } });

/* ================================================================================================ FX */
const isDark = c => J.lum(c) < 0.45;
const evS = ev => J.h(Math.round(ev.t * 1000), 6841);
const amp1 = ev => clamp(ev.amp ?? 1, 0.5, 1.3);
const pop = sc => [sc.accent, sc.accent2, sc.fg].find(c => c && J.contrast(c, sc.bg) > 1.6) || sc.fg;
const bgFill = (ctx, I) => { ctx.fillStyle = I.sc.bg; ctx.fillRect(0, 0, I.cw, I.ch); };
// 1 at q=0, swings through zero and dies out exactly at q=1
const ring = (q, turns = 1.5, k = 3.2) => Math.exp(-k * q) * Math.cos(q * TAU * turns) * (1 - q);
const FX = (key, d) => J.register('fx', key, Object.assign({}, d, {
  draw(ctx, ev, k2, I) { ctx.save(); try { d.draw(ctx, ev, clamp(Number.isFinite(k2) ? k2 : 1), I); } finally { ctx.restore(); } },
}), P);

/* 端からの一撃 — something hits the frame from one edge: spikes burst inward from the point of impact and the picture recoils */
FX('kzEdgeHit', { name: '端からの一撃', en: 'Edge Hit', tags: ['pop', 'graphic', 'glitch'], w: 1, dur: 7, amp: 1, mid: true, scratch: true, ae: 'shake',
  draw(ctx, ev, k, I) {
    const { cw, ch, S, sc } = I; if (!S) return;
    const s = evS(ev), M = Math.min(cw, ch), a = amp1(ev), side = J.h(s, 1) % 4, u = 0.3 + 0.4 * J.r(s, 2);
    const hx = side === 0 ? 0 : side === 1 ? cw : cw * u, hy = side === 2 ? 0 : side === 3 ? ch : ch * u;
    const nx = side === 0 ? 1 : side === 1 ? -1 : 0, ny = side === 2 ? 1 : side === 3 ? -1 : 0;
    const rec = (k < 0.14 ? E.outExpo(k / 0.14) : ring((k - 0.14) / 0.86)) * M * 0.035 * a;
    bgFill(ctx, I); ctx.drawImage(S, Math.round(nx * rec), Math.round(ny * rec));
    const g = k < 0.22 ? E.outExpo(k / 0.22) : 1, out = E.outCubic(clamp((k - 0.18) / 0.82)), n = 9, base = Math.atan2(ny, nx), pc = pop(sc);
    for (let i = 0; i < n; i++) {
      const an = base + ((i + 0.5) / n - 0.5) * 2.5 + J.rs(s, i, 3) * 0.08, len = M * J.rr(0.2, 0.48, s, i, 4) * a * g;
      const r0 = M * 0.03 + len * 1.1 * out, r1 = r0 + len * (1 - out), w = M * J.rr(0.012, 0.028, s, i, 5) * (1 - out);
      if (r1 - r0 < 1 || w < 0.4) continue;
      const c = Math.cos(an), sn = Math.sin(an);
      ctx.fillStyle = i % 3 === 1 ? sc.fg : pc;
      ctx.beginPath(); ctx.moveTo(hx + c * r0 - sn * w, hy + sn * r0 + c * w); ctx.lineTo(hx + c * r0 + sn * w, hy + sn * r0 - c * w); ctx.lineTo(hx + c * r1, hy + sn * r1); ctx.closePath(); ctx.fill();
    }
    const fr = M * 0.06 * a * g * (1 - out);
    if (fr > 0.5) { ctx.fillStyle = sc.fg; ctx.beginPath(); ctx.arc(hx, hy, fr, 0, TAU); ctx.fill(); }
  } });

/* 小突きスミア — the picture is knocked sideways and springs back; for those frames it drags a smear of itself behind */
FX('kzKnockSmear', { name: '小突きスミア', en: 'Knock Smear', tags: ['pop', 'glitch', 'graphic'], w: 1, dur: 7, amp: 1, mid: true, scratch: true, ae: 'shake',
  draw(ctx, ev, k, I) {
    const { cw, ch, S, sc } = I; if (!S) return;
    const s = evS(ev), vert = cw < ch ? J.r(s, 1) < 0.5 : J.r(s, 1) < 0.2, dir = J.r(s, 2) < 0.5 ? 1 : -1, L = vert ? ch : cw;
    const v = k < 0.16 ? E.outExpo(k / 0.16) : ring((k - 0.16) / 0.84, 1.5, 2.6), o = Math.round(dir * L * 0.065 * amp1(ev) * v);
    if (Math.abs(o) < 1) return;
    bgFill(ctx, I); ctx.drawImage(S, vert ? 0 : o, vert ? o : 0);
    ctx.globalCompositeOperation = isDark(sc.bg) ? 'lighten' : 'darken';
    const n = 6;
    for (let i = 1; i < n; i++) {
      const f = i / n, q = Math.round(o * (1 - f * 1.6));
      ctx.globalAlpha = 0.42 * (1 - f);
      ctx.drawImage(S, vert ? 0 : q, vert ? q : 0);
    }
  } });

/* 浮かせて叩く — the picture is lifted off the page as a card with a solid shadow, hangs for a moment, and is slapped back down */
FX('kzCardSlam', { name: '浮かせて叩く', en: 'Card Slam', tags: ['pop', 'graphic', 'editorial'], w: 0.9, dur: 10, amp: 1, mid: true, scratch: true, ae: 'zoom',
  draw(ctx, ev, k, I) {
    const { cw, ch, S, sc } = I; if (!S) return;
    const s = evS(ev), M = Math.min(cw, ch), a = amp1(ev);
    if (k >= 0.68) {
      const q = (k - 0.68) / 0.32, z = 1 + 0.035 * a * ring(q, 1.5, 3);
      if (Math.abs(z - 1) < 0.0015) return;
      bgFill(ctx, I); ctx.drawImage(S, cw / 2 - cw * z / 2, ch / 2 - ch * z / 2, cw * z, ch * z);
      return;
    }
    const lift = k < 0.28 ? E.outBack(k / 0.28, 1.8) : k < 0.56 ? 1 : 1 - E.inCubic((k - 0.56) / 0.12);
    if (lift < 0.004) return;
    const z = 1 - 0.11 * a * lift, d = M * 0.035 * a * lift, sg = J.r(s, 1) < 0.5 ? 1 : -1;
    bgFill(ctx, I);
    ctx.fillStyle = '#000'; ctx.globalAlpha = 0.28 * clamp(lift); ctx.fillRect(0, 0, cw, ch); ctx.globalAlpha = 1;
    ctx.translate(cw / 2, ch / 2); ctx.rotate(-1.6 * sg * lift * DEG);
    ctx.fillStyle = pop(sc); ctx.fillRect(-cw * z / 2 + d * sg, -ch * z / 2 + d, cw * z, ch * z);
    ctx.drawImage(S, -cw * z / 2, -ch * z / 2, cw * z, ch * z);
    ctx.strokeStyle = sc.fg; ctx.globalAlpha = 0.6 * clamp(lift); ctx.lineWidth = Math.max(1, M * 0.003); ctx.strokeRect(-cw * z / 2, -ch * z / 2, cw * z, ch * z);
  } });

/* 衝撃の弧 — a shock leaves the middle of the frame as pairs of arcs, like (( )) , thinning as they travel, while the picture bulges */
FX('kzShockArcs', { name: '衝撃の弧', en: 'Shock Arcs', tags: ['pop', 'graphic', 'emotional'], w: 1, dur: 8, amp: 1, mid: true, scratch: true, ae: 'zoom',
  draw(ctx, ev, k, I) {
    const { cw, ch, S, sc } = I, M = Math.min(cw, ch), a = amp1(ev), vert = cw < ch * 0.9, cx = cw / 2, cy = ch / 2, L = vert ? ch : cw;
    const pu = k < 0.15 ? E.outExpo(k / 0.15) : 1 - E.inOutCubic((k - 0.15) / 0.85), st = 1 + 0.035 * a * pu;
    if (S && st > 1.002) { bgFill(ctx, I); if (vert) ctx.drawImage(S, 0, cy - ch * st / 2, cw, ch * st); else ctx.drawImage(S, cx - cw * st / 2, 0, cw * st, ch); }
    ctx.strokeStyle = pop(sc); ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      const q = clamp((k - i * 0.11) / 0.7); if (q <= 0 || q >= 1) continue;
      const R = L * (0.2 + 0.28 * E.outCubic(q)), span = Math.asin(Math.min(0.95, M * 0.36 / R)), lw = M * 0.024 * (1 - q) * a * (1 - i * 0.22);
      if (lw < 0.5) continue;
      ctx.lineWidth = lw; ctx.globalAlpha = 1 - q * q;
      for (const b of vert ? [PI / 2, -PI / 2] : [0, PI]) { ctx.beginPath(); ctx.arc(cx, cy, R, b - span, b + span); ctx.stroke(); }
    }
  } });

/* 着地の土煙 — the picture lands with a thud: it drops a little, bounces, and dust rolls away along the bottom edge on both sides */
FX('kzDustLanding', { name: '着地の土煙', en: 'Dust Landing', tags: ['pop', 'emotional', 'graphic'], w: 0.9, dur: 9, amp: 1, mid: true, scratch: true, ae: 'shake',
  draw(ctx, ev, k, I) {
    const { cw, ch, S, sc } = I; if (!S) return;
    const s = evS(ev), M = Math.min(cw, ch), a = amp1(ev);
    const drop = k < 0.1 ? E.outCubic(k / 0.1) : ring((k - 0.1) / 0.9, 1.75, 3.5), o = Math.round(M * 0.028 * a * drop);
    if (o) { bgFill(ctx, I); ctx.drawImage(S, 0, o); }
    const q = clamp((k - 0.05) / 0.95);
    if (q <= 0 || q >= 1) return;
    const e = E.outCubic(q);
    ctx.fillStyle = J.mix(sc.fg, sc.bg, 0.45);
    for (const sd of [-1, 1]) for (let i = 0; i < 6; i++) {
      const u = (i + 1) / 6, r = M * (0.02 + 0.04 * J.r(s, i, sd + 2)) * (0.45 + 0.9 * e) * (1 - 0.55 * q) * a;
      const x = cw / 2 + sd * (cw * 0.06 + cw * 0.38 * u * e), y = ch - r * 0.5 - M * 0.07 * u * e * J.r(s, i, 7);
      ctx.globalAlpha = 0.9 * (1 - q) * (1 - 0.4 * u);
      ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    }
  } });

/* 押しのけバー — a bar ploughs across the frame: ahead of it the picture is squeezed up against the far edge, behind it it stands again */
FX('kzBulldoze', { name: '押しのけバー', en: 'Bulldoze', tags: ['graphic', 'pop', 'glitch'], w: 0.6, dur: 7, amp: 1, mid: true, scratch: true, ae: 'slice',
  draw(ctx, ev, k, I) {
    const { cw, ch, S, sc } = I; if (!S || k <= 0 || k >= 1) return;
    const s = evS(ev), M = Math.min(cw, ch), vert = cw < ch ? J.r(s, 1) < 0.6 : J.r(s, 1) < 0.15, rev = J.r(s, 2) < 0.5, L = vert ? ch : cw;
    const b = Math.round(L * E.inOutSine(k)), rest = L - b, bw = Math.max(3, M * 0.03 * amp1(ev) * Math.sin(PI * k));
    if (rest < 1) return;
    const at = rev ? 0 : b;                              // start of the squeezed part
    ctx.fillStyle = sc.bg;
    if (vert) { ctx.fillRect(0, at, cw, rest); ctx.drawImage(S, 0, 0, cw, ch, 0, at, cw, rest); }
    else { ctx.fillRect(at, 0, rest, ch); ctx.drawImage(S, 0, 0, cw, ch, at, 0, rest, ch); }
    const seam = rev ? rest : b;
    ctx.fillStyle = pop(sc);
    if (vert) ctx.fillRect(0, seam - bw / 2, cw, bw); else ctx.fillRect(seam - bw / 2, 0, bw, ch);
    ctx.fillStyle = sc.fg; ctx.globalAlpha = 0.8;
    const lw = Math.max(1, bw * 0.16), lead = rev ? seam - bw / 2 - lw * 2 : seam + bw / 2 + lw;
    if (vert) ctx.fillRect(0, lead, cw, lw); else ctx.fillRect(lead, 0, lw, ch);
  } });

/* ================================================================================================ TRANSITIONS */
const minD = I => Math.min(I.cw, I.ch);
const tAcc = I => { const sc = I.sc; return J.contrast(sc.accent, sc.bg) >= 1.6 ? sc.accent : sc.fg; };
const TR = (k, d) => J.register('trans', k, Object.assign({}, d, {
  draw(ctx, A, B, p, I) {
    ctx.save();
    try {
      if (!(p > 0)) ctx.drawImage(A, 0, 0);
      else if (p >= 1) ctx.drawImage(B, 0, 0);
      else d.draw(ctx, A, B, p, I, I.P || {});
    } finally { ctx.restore(); }
  } }), P);

/* 突き飛ばし — the new frame slams in from the side and overshoots; the old one is knocked clean away, tumbling as it goes */
TR('kzShoveOff', { name: '突き飛ばし', en: 'Shove Off', tags: ['pop', 'graphic', 'glitch'], w: 1, dur: 0.42,
  plan: rng => ({ dir: rng.pick([1, -1]), vert: rng.chance(0.25) }),
  draw(ctx, A, B, p, I, P) {
    const { cw, ch } = I, dir = P.dir || 1, vert = !!P.vert, L = vert ? ch : cw;
    const eB = E.outBack(p, 1.5), eA = E.outCubic(clamp(p * 1.15));
    ctx.fillStyle = I.sc.bg; ctx.fillRect(0, 0, cw, ch);
    const dA = -dir * L * 1.15 * eA;
    ctx.save();
    ctx.translate(cw / 2 + (vert ? cw * 0.1 * eA * eA : dA), ch / 2 + (vert ? dA : ch * 0.12 * eA * eA)); ctx.rotate(-dir * 14 * eA * DEG);
    ctx.drawImage(A, -cw / 2, -ch / 2);
    ctx.restore();
    const dB = Math.round(dir * L * (1 - eB));
    ctx.drawImage(B, vert ? 0 : dB, vert ? dB : 0);
    const lw = Math.max(2, minD(I) * 0.012) * (1 - p), edge = dir > 0 ? dB - lw : dB + L;
    ctx.fillStyle = tAcc(I); ctx.globalAlpha = clamp((1 - p) * 1.4);
    if (vert) ctx.fillRect(0, edge, cw, lw); else ctx.fillRect(edge, 0, lw, ch);
  } });

/* 押し潰し — the new frame comes down like a press: the old one is squeezed flat against the far edge, pushes back once, and is gone */
TR('kzCrushDown', { name: '押し潰し', en: 'Crush Down', tags: ['pop', 'graphic'], w: 0.9, dur: 0.45,
  plan: rng => ({ from: rng.pick(['top', 'top', 'left', 'right', 'bottom']) }),
  draw(ctx, A, B, p, I, P) {
    const { cw, ch } = I, from = P.from || 'top', hor = from === 'left' || from === 'right', L = hor ? cw : ch, tl = 0.62;
    let f;
    if (p < tl) { const q = p / tl; f = q * q; } else { const t = (p - tl) / (1 - tl); f = 1 - 0.075 * Math.abs(Math.sin(t * PI * 2)) * (1 - t); }
    const d = Math.round(L * f), rest = L - d, lw = Math.max(2, minD(I) * 0.007);
    ctx.fillStyle = I.sc.bg; ctx.fillRect(0, 0, cw, ch);
    if (from === 'top') { if (rest >= 1) ctx.drawImage(A, 0, 0, cw, ch, 0, d, cw, rest); ctx.drawImage(B, 0, d - ch); }
    else if (from === 'bottom') { if (rest >= 1) ctx.drawImage(A, 0, 0, cw, ch, 0, 0, cw, rest); ctx.drawImage(B, 0, rest); }
    else if (from === 'left') { if (rest >= 1) ctx.drawImage(A, 0, 0, cw, ch, d, 0, rest, ch); ctx.drawImage(B, d - cw, 0); }
    else { if (rest >= 1) ctx.drawImage(A, 0, 0, cw, ch, 0, 0, rest, ch); ctx.drawImage(B, rest, 0); }
    ctx.fillStyle = tAcc(I); ctx.globalAlpha = clamp((1 - p) * 3);
    const seam = (from === 'top' || from === 'left') ? d : rest - lw;
    if (hor) ctx.fillRect(seam, 0, lw, ch); else ctx.fillRect(0, seam, cw, lw);
  } });

/* 大回し — both frames ride on one huge wheel whose hub is far outside the picture: a turn carries the old one off and the new one in,
   a little too far, and back */
TR('kzCarousel', { name: '大回し', en: 'Carousel', tags: ['pop', 'graphic', 'emotional'], w: 0.9, dur: 0.5,
  plan: rng => ({ dir: rng.pick([1, -1]), top: rng.chance(0.3) }),
  draw(ctx, A, B, p, I, P) {
    const { cw, ch } = I, dir = P.dir || 1, R = Math.max(cw, ch) * 1.3, px = cw / 2, py = P.top ? ch / 2 - R : ch / 2 + R;
    const th = 2 * Math.atan((cw / 2) / (R - ch / 2)) * 1.05, e = E.inOutCubic(clamp(p / 0.78)) + 0.035 * Math.sin(PI * clamp((p - 0.55) / 0.45));
    ctx.fillStyle = I.sc.bg; ctx.fillRect(0, 0, cw, ch);
    const put = (C, ang) => { ctx.save(); ctx.translate(px, py); ctx.rotate(ang); ctx.translate(-px, -py); ctx.drawImage(C, 0, 0); ctx.restore(); };
    put(A, -dir * th * e);
    put(B, dir * th * (1 - e));
  } });
})();
