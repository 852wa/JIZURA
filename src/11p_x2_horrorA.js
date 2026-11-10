/* JIZURA pack: x2horrorA — 追加分2 for the ホラー set: uneasy layouts (keyhole, the room that is too big, the one wrong copy,
   a sign on one wire, the floor that is not there, a late reflection, a fogged window, an unknown voicemail, a street lamp,
   a torn note, feet under the door, closet slats, a stopped clock, the figure that is nearer after every blink, stairs down),
   things at the edge of attention (decor) and dark, slow backgrounds */
(() => {
'use strict';
const E = J.E;
const P = 'x2horrorA';
const TAGS = ['horror'];
const clamp = J.clamp, lerp = J.lerp, TAU = J.TAU, DEG = J.DEG;
const regL = (key, def) => J.register('layout', key, def, P);
const regD = (key, def) => J.register('decor', key, def, P);

/* ------------------------------------------------------------------ helpers */
const U = env => Math.min(env.W, env.H);
const isPort = env => env.H > env.W * 1.08;
const strip = t => String(t || '').replace(/\s+/g, '');
const hasLatin = t => /[A-Za-z]/.test(t);
const flat = t => (hasLatin(t) ? String(t || '').trim().replace(/\s+/g, ' ') : strip(t));
const fontsOf = (st, roles) => J.fontsOf(st, roles);
const monoF = env => (env.st.fonts.mono && env.st.fonts.mono[0]) || 'mono';
const handOf = (rng, st) => (J.FONTS && J.FONTS.klee && rng.chance(0.7) ? 'klee' : rng.pick(fontsOf(st, ['body', 'serif'])));
const tin = (env, d = 0, len = 0.4, ease = E.outCubic) => ease(clamp((env.lt - d) / Math.max(0.01, len)));
const tout = env => 1 - E.inCubic(env.pOut);
const UB = J.unionBB;
const pad2 = n => String(n).padStart(2, '0');
const wrap = (v, m) => ((v % m) + m) % m;
const isDark = c => J.lum(c) < 0.45;
const lightOf = sc => (J.lum(sc.fg) > J.lum(sc.bg) ? sc.fg : sc.bg);
const darkOf = sc => (J.lum(sc.fg) > J.lum(sc.bg) ? sc.bg : sc.fg);
const nightC = sc => J.mix(sc.bg, '#000000', isDark(sc.bg) ? 0.72 : 0.9);
/* a faint line / silhouette colour over the scheme background */
const dimC = (sc, k) => (isDark(sc.bg) ? J.mix(sc.bg, sc.fg, k) : J.mix(sc.bg, '#000000', k * 1.1));
/* the colour of light falling on the scheme background */
const glowC = sc => (isDark(sc.bg) ? lightOf(sc) : J.mix(sc.bg, '#FFFFFF', 0.85));
const onCol = (sc, fill) => {
  let best = null, bv = 0;
  for (const c of [sc.bg, sc.fg, sc.ink, sc.sub]) { if (!c || c === fill) continue; const k = J.contrast(c, fill); if (k > bv) { bv = k; best = c; } }
  return bv >= 3 ? best : (J.lum(fill) > 0.5 ? '#111111' : '#FFFFFF');
};
/* failing-light level 0..1 on a ≤24 Hz clock (mostly on, stutters now and then) */
const lamp = (t, seed, rate = 1) => {
  const st = Math.floor(t * 24), run = st >> 2;
  if (J.r(seed, run, 7) < 0.1 * rate) return J.r(seed, st, 8) < 0.5 ? 0.15 : 0.55;
  return 0.88 + 0.12 * J.r(seed, st, 9);
};
/* glyph centres of a text item (spaces left out) */
const slots = (it) => {
  const lay = J.layoutText(Object.assign({}, it, { charFns: null, charFn: null, _lay: null })), sx = it.sx || 1, sy = it.sy || 1, out = [];
  for (const g of lay) { if (g.ch === ' ' || g.ch === '　') continue; out.push({ ch: g.ch, x: it.x + g.x * sx, y: it.y + g.y * sy, w: g.w * sx, h: g.h * sy }); }
  return out;
};
const center = (env, bb) => bb || { x0: env.W * 0.35, x1: env.W * 0.65, y0: env.H * 0.4, y1: env.H * 0.6, cx: env.W / 2, cy: env.H / 2 };
const overlaps = (bb, x0, y0, x1, y1, pad = 0) => !(x1 < bb.x0 - pad || x0 > bb.x1 + pad || y1 < bb.y0 - pad || y0 > bb.y1 + pad);
const distBB = (bb, x, y) => Math.hypot(Math.max(bb.x0 - x, 0, x - bb.x1), Math.max(bb.y0 - y, 0, y - bb.y1));
/* a spot inside the frame that is as far from the lyric as a few tries allow */
const farSpot = (env, bb, s, k, mx = 0.08, my = 0.1) => {
  const { W, H } = env; let best = [W * mx, H * my], bd = -1;
  for (let i = 0; i < 9; i++) {
    const x = W * (mx + (1 - 2 * mx) * J.r(s, k, i, 1)), y = H * (my + (1 - 2 * my) * J.r(s, k, i, 2)), d = distBB(bb, x, y);
    if (d > bd) { bd = d; best = [x, y]; }
  }
  return { x: best[0], y: best[1], d: bd };
};
const linesOf = (env, raw, perL, perP) => J.splitLines(raw, isPort(env) ? perP : perL);

/* ================================================================== LAYOUTS */

/* 1. keyhole: the line sits in the round head of a keyhole cut out of the dark; the hole drifts, something walks past inside */
regL('hzKeyhole', {
  name: '鍵穴', en: 'Keyhole', tags: TAGS.concat(['graphic']), w: 0.9, busy: true, ae: 'circle', fits: n => n >= 1 && n <= 16,
  plan(rng, cut, st) {
    return { font: rng.pick(fontsOf(st, ['serif', 'display'])), sh: rng.range(0.36, 0.6), dir: rng.pick([-1, 1]), dr: rng.range(0.5, 1), pass: rng.chance(0.85) };
  },
  render(env) {
    const { W, H, sc } = env, cut = env.cut, Pm = cut.params, s = cut.seed | 0, ctx = env.ctx, lt = env.lt;
    const R = Math.min(W * 0.42, H * 0.32), cx = W / 2, cy = H / 2 - R * 0.4;
    const raw = flat(cut.text), n = J.glyphCount(raw);
    const text = J.splitLines(raw, hasLatin(raw) ? 8 : (n <= 3 ? 3 : n <= 8 ? 4 : n <= 12 ? 5 : 6));
    const o = { track: 0.04, lead: 1.15 };
    const size = Math.min(J.fitSize(text, Pm.font, R * 1.36, R * 1.12, o), R * 0.85);
    const bb = J.mainDraw(env, Object.assign({ text, font: Pm.font, size, x: cx, y: cy, color: sc.fg }, o));
    if (env.pass !== 'main') return bb;
    const dk = nightC(sc), k = tin(env, 0, 0.55) * (1 - E.inExpo(env.pOut));
    const ox = J.noise1(env.ltb * 0.45, s + 1) * R * 0.07 * Pm.dr, oy = J.noise1(env.ltb * 0.4, s + 2) * R * 0.05 * Pm.dr;
    // something passes on the other side
    if (Pm.pass) {
      const p = (lt - cut.dur * Pm.sh) / 0.9;
      if (p > 0 && p < 1) {
        const x = cx + Pm.dir * lerp(-R * 1.7, R * 1.7, p);
        env.rect(x - R * 0.55, cy - R * 1.2, R * 1.1, R * 3.4, dk, 0.4, false);
        env.rect(x - R * 0.36, cy - R * 1.2, R * 0.72, R * 3.4, dk, 0.5, false);
      }
    }
    const phi = 24, hx = cx + ox, hy = cy + oy;
    const path = (q) => {
      ctx.moveTo(hx + Math.sin(phi * DEG) * R * q, hy + Math.cos(phi * DEG) * R * q);
      ctx.arc(hx, hy, R * q, (90 - phi) * DEG, (90 + phi) * DEG, true);
      ctx.lineTo(hx - R * 0.62 * q, hy + R * 1.86 * q); ctx.lineTo(hx + R * 0.62 * q, hy + R * 1.86 * q); ctx.closePath();
    };
    ctx.save();
    ctx.fillStyle = dk; ctx.globalAlpha = 0.965; ctx.beginPath(); ctx.rect(-W, -H, W * 3, H * 3); path(k); ctx.fill('evenodd');
    if (k > 0.02) {
      ctx.globalAlpha = 0.8 * k; ctx.strokeStyle = J.mix(dk, lightOf(sc), 0.42); ctx.lineWidth = Math.max(1.5, U(env) * 0.004); ctx.beginPath(); path(k); ctx.stroke();
      ctx.globalAlpha = 0.3 * k; ctx.lineWidth = Math.max(1, U(env) * 0.002); ctx.beginPath(); path(k * 1.07); ctx.stroke();
    }
    ctx.restore();
    return bb;
  },
});

/* 2. the room that is too big: a small line pressed against one wall, the rest is an empty room with a door at the far end */
regL('hzEmptyRoom', {
  name: '広すぎる部屋', en: 'Empty Room', tags: TAGS.concat(['calm', 'editorial']), w: 1, ae: 'center', fits: n => n >= 1 && n <= 16,
  plan(rng, cut, st) {
    return { font: rng.pick(fontsOf(st, ['serif', 'body'])), side: rng.pick([-1, 1]), vy: rng.range(-1, 1), door: rng.chance(0.85), open: rng.range(0.3, 0.6) };
  },
  render(env) {
    const { W, H, sc } = env, cut = env.cut, Pm = cut.params, s = cut.seed | 0, lt = env.lt, port = isPort(env), side = Pm.side;
    const bx = W * (0.5 - side * (port ? 0.14 : 0.17)), by = H * 0.47, bw = W * (port ? 0.13 : 0.12), bh = H * (port ? 0.075 : 0.14);
    const edge = side > 0 ? W * 0.94 : W * 0.06, tw = W * (W > H * 1.3 ? 0.32 : 0.42);
    // the clear band on the side wall at the inner end of the text
    const xin = edge - side * tw, wallX = bx + side * bw, cornerX = side > 0 ? W : 0;
    const f = clamp((cornerX - xin) / (cornerX - wallX)), yTop = (by - bh) * f, yBot = H - (H - (by + bh)) * f;
    const text = linesOf(env, flat(cut.text), 6, 4), o = { track: 0.05, lead: 1.2 };
    const size = Math.min(J.fitSize(text, Pm.font, tw, Math.min(H * 0.24, (yBot - yTop) * 0.8), o), H * 0.15);
    const m = J.measure(Object.assign({ text, font: Pm.font, size }, o));
    const slack = Math.max(0, (yBot - yTop) * 0.9 - m.h) / 2, ty = (yTop + yBot) / 2 + Pm.vy * slack * 0.6;
    if (env.pass === 'main') {
      const col = dimC(sc, 0.24), lw = Math.max(1.2, U(env) * 0.0022), e = tin(env, 0, 1, E.inOutCubic), out = tout(env);
      const back = [[bx - bw, by - bh], [bx + bw, by - bh], [bx + bw, by + bh], [bx - bw, by + bh]], cor = [[0, 0], [W, 0], [W, H], [0, H]];
      env.polyPartial(back.concat([back[0]]), e, col, lw, out, false);
      for (let i = 0; i < 4; i++) env.polyPartial([back[i], cor[i]], clamp(e * 1.3 - 0.3), col, lw, out * 0.85, false);
      if (Pm.door) {
        // a door in the far wall, away from the words; it opens a little while nobody watches
        const dw = bw * 0.36, dh = bh * 1.3, dx = bx - side * bw * 0.4 - dw / 2, dy = by + bh - dh;
        const op = 0.1 + 0.5 * E.inOutSine(clamp((lt - cut.dur * Pm.open) / 1.6)), lv = lamp(env.t, s, 0.8) * e * out;
        env.line([[dx, by + bh], [dx, dy], [dx + dw, dy], [dx + dw, by + bh]], col, lw, e * out, false);
        const L = glowC(sc), sx0 = side > 0 ? dx : dx + dw * (1 - op);
        env.rect(sx0, dy + lw, dw * op, dh - lw, L, 0.8 * lv, false);
        env.poly([[sx0, by + bh], [sx0 + dw * op, by + bh], [sx0 + dw * op + side * bw * 0.5 + dw * op, by + bh + (H - by - bh) * 0.3], [sx0 + side * bw * 0.5 - dw * op, by + bh + (H - by - bh) * 0.3]], L, 0.07 * lv, false);
      }
    }
    return J.mainDraw(env, Object.assign({ text, font: Pm.font, size, x: edge - side * m.w / 2, y: ty, color: sc.fg }, o));
  },
});

/* 3. the same line again and again — and one copy is wrong */
regL('hzWrongCopy', {
  name: '一行だけ違う', en: 'Wrong Copy', tags: TAGS.concat(['glitch', 'graphic']), w: 1, ae: 'stack', fits: n => n >= 1 && n <= 16,
  plan(rng, cut, st) {
    return { font: rng.pick(fontsOf(st, ['display', 'serif'])), k: rng.int(3, 5), wr: rng(), kind: rng.pick(['mirror', 'reverse', 'drop', 'flip']), acc: rng.chance(0.55), gi: rng() };
  },
  render(env) {
    const { W, H, sc } = env, cut = env.cut, Pm = cut.params, s = cut.seed | 0, port = isPort(env);
    const raw = flat(cut.text), n = J.glyphCount(raw), unit = J.splitLines(raw, port ? 6 : 14), L = unit.split('\n').length;
    const K = Math.max(2, Math.min(Pm.k + (port && L === 1 ? 1 : 0), L === 1 ? 6 : L === 2 ? 3 : 2));
    const o = { track: 0.05, lead: 1.1 };
    const size = Math.min(J.fitSize(unit, Pm.font, W * 0.84, (H * 0.84 / K) * 0.8, o), H * 0.24);
    const m = J.measure(Object.assign({ text: unit, font: Pm.font, size }, o));
    const rowH = Math.min(H * 0.84 / K, m.h + size * 0.42), y0 = H / 2 - rowH * (K - 1) / 2;
    const wr = 1 + Math.min(K - 2, Math.floor(Pm.wr * (K - 1)));
    let kind = Pm.kind; if (n < 2 && (kind === 'reverse' || kind === 'drop')) kind = 'mirror';
    // now and then the wrong copy looks right for a frame
    const ok = J.r(s, env.step >> 1, 5) < 0.06;
    let bb = null;
    for (let r = 0; r < K; r++) {
      const it = Object.assign({ text: unit, font: Pm.font, size, x: W / 2, y: y0 + r * rowH, color: sc.fg, mi: r }, o);
      if (r === wr) {
        if (Pm.acc) it.color = J.fitContrast(sc.accent, sc.bg, 3);
        if (!ok) {
          if (kind === 'mirror') it.sx = -1;
          else if (kind === 'flip') it.rot = 180;
          else if (kind === 'reverse') it.text = unit.split('\n').map(l => [...l].reverse().join('')).join('\n');
          else {
            const a = [...unit], idx = []; a.forEach((c, i) => { if (c !== '\n' && c !== ' ') idx.push(i); });
            const gi = idx[Math.min(idx.length - 1, Math.floor(Pm.gi * idx.length))];
            a[gi] = hasLatin(a[gi]) ? '_' : '　'; it.text = a.join('');
          }
        }
        if (J.r(s, env.step >> 2, 8) < 0.22) it.x += J.rs(s, env.step >> 2, 7) * size * 0.05;
      }
      bb = UB(bb, J.mainDraw(env, it));
    }
    return bb;
  },
});

/* 4. a sign hanging from the ceiling — one of its wires has snapped, it hangs crooked and creaks */
regL('hzHangSign', {
  name: '傾いた吊り看板', en: 'Crooked Sign', tags: TAGS.concat(['graphic', 'emotional']), w: 0.9, treat: 'safe', ae: 'labels', fits: n => n >= 1 && n <= 16,
  plan(rng, cut, st) {
    return { font: rng.pick(fontsOf(st, ['display', 'serif'])), v: rng.pick(['snap', 'snap', 'two']), side: rng.pick([-1, 1]), amp: rng.range(0.7, 1.2), tilt: rng.range(5, 8.5), ph: rng.range(0, 6) };
  },
  render(env) {
    const { W, H, sc } = env, cut = env.cut, Pm = cut.params, ctx = env.ctx, lt = env.lt, side = Pm.side, snap = Pm.v === 'snap';
    const text = linesOf(env, flat(cut.text), 9, 5), o = { track: 0.06, lead: 1.15 };
    let size = Math.min(J.fitSize(text, Pm.font, W * 0.6, H * 0.3, o), H * 0.2);
    let m = J.measure(Object.assign({ text, font: Pm.font, size }, o));
    if (m.w + size * 1.3 > W * 0.74) { size *= W * 0.74 / (m.w + size * 1.3); m = J.measure(Object.assign({ text, font: Pm.font, size }, o)); }
    const pw = m.w + size * 1.3, ph = m.h + size * 0.9, C0x = W / 2, C0y = H * 0.55;
    const plate = sc.ink || sc.fg, tc = onCol(sc, plate);
    const drop = -(H * 0.95) * (1 - E.outCubic(clamp(lt / 0.55))) + H * 1.15 * E.inCubic(env.pOut);
    const tr = env.ltb, dmp = 0.45 + 0.55 * Math.exp(-Math.max(0, tr) * 0.5);
    const phi = Pm.amp * (snap ? 2.4 : 3.2) * dmp * Math.sin(tr * 1.5 + Pm.ph) * DEG;
    const a1x = side * pw * 0.32, ay = -ph / 2, Lw = C0y - ph / 2 + 12;
    const A1 = [C0x + a1x, -12], A2 = [C0x - a1x, -12];
    let th, cx, cy;
    if (snap) {
      th = (-side * Pm.tilt + phi / DEG * 1.6 + Math.sin(tr * 2.3 + Pm.ph) * 0.7 * dmp) * DEG + side * 0.5 * E.inCubic(env.pOut);
      const qx = A1[0] + Math.sin(phi) * Lw, qy = A1[1] + Math.cos(phi) * Lw;
      cx = qx - (Math.cos(th) * a1x - Math.sin(th) * ay); cy = qy - (Math.sin(th) * a1x + Math.cos(th) * ay);
    } else { th = 0; cx = C0x + Math.sin(phi) * Lw; cy = C0y + (Math.cos(phi) - 1) * Lw; }
    cy += drop;
    const wp = (lx, ly) => [cx + Math.cos(th) * lx - Math.sin(th) * ly, cy + Math.sin(th) * lx + Math.cos(th) * ly];
    if (env.pass === 'main') {
      const out = tout(env), wc = dimC(sc, 0.5), lw = Math.max(1.2, U(env) * 0.0028);
      const q1 = wp(a1x, ay), q2 = wp(-a1x, ay);
      env.line([[A1[0], A1[1]], q1], wc, lw, out, false);
      if (snap) {
        // the snapped wire: a stub swinging from the ceiling, the other end lying against the plate
        const sw = Math.sin(tr * 2.6 + 1) * 9 * DEG, sl = Math.min(H * 0.13, Lw * 0.3);
        env.line([[A2[0], A2[1]], [A2[0] + Math.sin(sw) * sl, A2[1] + Math.cos(sw) * sl]], wc, lw, out * clamp(lt / 0.3), false);
        env.line([q2, [q2[0] - side * size * 0.12, q2[1] + size * 0.5]], wc, lw, out, false);
      } else env.line([[A2[0], A2[1]], q2], wc, lw, out, false);
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(th); ctx.globalAlpha = out;
      ctx.fillStyle = J.rgba('#000000', 0.25); ctx.fillRect(-pw / 2 + size * 0.06, -ph / 2 + size * 0.08, pw, ph);
      ctx.fillStyle = plate; ctx.fillRect(-pw / 2, -ph / 2, pw, ph);
      ctx.strokeStyle = J.rgba(tc, 0.45); ctx.lineWidth = Math.max(1.5, size * 0.025); ctx.strokeRect(-pw / 2 + size * 0.14, -ph / 2 + size * 0.14, pw - size * 0.28, ph - size * 0.28);
      ctx.fillStyle = J.rgba(tc, 0.7);
      for (const sg of [1, -1]) { ctx.beginPath(); ctx.arc(sg * a1x, ay + size * 0.07, size * 0.035, 0, TAU); ctx.fill(); }
      ctx.restore();
    }
    return J.mainDraw(env, Object.assign({ text, font: Pm.font, size, x: cx, y: cy, rot: th / DEG, color: tc }, o));
  },
});

/* 5. the floor indicator: the light travels along the floors and stops where there is no floor */
regL('hzElevator', {
  name: '存在しない階', en: 'Wrong Floor', tags: TAGS.concat(['graphic', 'editorial']), w: 0.9, ae: 'center', fits: n => n >= 1 && n <= 16,
  plan(rng, cut, st) {
    return { font: rng.pick(fontsOf(st, ['display', 'serif'])), v: rng.pick(['gap', 'beyond', 'below']), n0: rng.int(5, 7), stop: rng.range(0.4, 0.55) };
  },
  render(env) {
    const { W, H, sc } = env, cut = env.cut, Pm = cut.params, s = cut.seed | 0, lt = env.lt, port = isPort(env), u = U(env), mono = monoF(env);
    const labels = []; let from, to;
    if (Pm.v === 'gap') { const g = Pm.n0 - 2; for (let i = 1; i <= Pm.n0; i++) { if (labels.length === g) labels.push(''); labels.push(String(i)); } from = 0; to = g; }
    else if (Pm.v === 'beyond') { for (let i = 1; i <= Pm.n0; i++) labels.push(String(i)); labels.push(''); from = Math.max(0, Pm.n0 - 4); to = Pm.n0; }
    else { labels.push('', 'B1'); for (let i = 1; i < Pm.n0; i++) labels.push(String(i)); from = Math.min(labels.length - 1, 4); to = 0; }
    const N = labels.length, Ts = Math.max(0.5, cut.dur * Pm.stop), arrived = lt >= Ts;
    const cur = Math.round(lerp(from, to, E.inOutSine(clamp(lt / Ts))));
    const pitch = Math.min(W * 0.84 / N, u * 0.115), r = pitch * 0.34, ry = H * (port ? 0.2 : 0.17), x0 = W / 2 - pitch * (N - 1) / 2;
    const text = linesOf(env, flat(cut.text), 10, 5), o = { track: 0.05, lead: 1.18 };
    const size = Math.min(J.fitSize(text, Pm.font, W * 0.76, H * 0.4, o), H * 0.22);
    const it = Object.assign({ text, font: Pm.font, size, x: W / 2, y: H * 0.58, color: sc.fg }, o);
    const m = J.measure(it);
    if (env.pass === 'main') {
      const out = tout(env), col = dimC(sc, 0.38), lw = Math.max(1.2, u * 0.0024), L = lightOf(sc), acc = J.fitContrast(sc.accent, sc.bg, 3);
      // the doors: one seam that parts once the car has stopped
      const gap = (m.w + size * 1.1) * E.inOutCubic(clamp((lt - Ts - 0.15) / 0.8)) * out, e0 = tin(env, 0, 0.5);
      const yA = ry + pitch * 0.9, yB = H * 0.95;
      const tY0 = it.y - m.h / 2 - size * 0.25, tY1 = it.y + m.h / 2 + size * 0.25, yE = yA + (yB - yA) * e0;
      for (const sg of [-1, 1]) {
        const x = W / 2 + sg * gap / 2;
        if (gap > m.w + size * 0.4) env.line([[x, yA], [x, yE]], col, lw, 0.8 * out, false);
        else { env.line([[x, yA], [x, Math.min(yE, tY0)]], col, lw, 0.8 * out, false); if (yE > tY1) env.line([[x, tY1], [x, yE]], col, lw, 0.8 * out, false); }
      }
      env.line([[x0 - pitch * 0.7, ry + pitch * 0.62], [x0 + pitch * (N - 0.3), ry + pitch * 0.62]], col, lw, e0 * out, false);
      for (let i = 0; i < N; i++) {
        const e = tin(env, i * 0.04, 0.3) * out, x = x0 + i * pitch, lit = i === cur;
        if (e <= 0) continue;
        if (labels[i]) {
          env.circle(x, ry, r * (0.6 + 0.4 * e), lit ? L : null, col, lw, e, false);
          env.draw({ text: labels[i], font: mono, size: r * (labels[i].length > 1 ? 0.8 : 1), x, y: ry, color: lit ? darkOf(sc) : col, alpha: e, ghost: false });
        } else if (lit) {
          // the slot that is not on the panel
          const fl = arrived ? (J.r(s, env.step, 3) < 0.14 ? 0.3 : 1) : 1;
          env.circle(x, ry, r, acc, null, 0, e * fl, false);
          env.circle(x, ry, r * 1.5, null, acc, lw, e * fl * 0.35 * (0.5 + 0.5 * Math.sin(env.ltb * 5)), false);
        }
      }
      // direction arrow: blinks while travelling, dead once stopped
      const up = to > from, ax = x0 + pitch * (N - 0.05), ar = r * 0.7, blink = arrived ? 0.25 : (env.step % 8 < 5 ? 1 : 0.2);
      env.poly(up ? [[ax, ry - ar], [ax + ar, ry + ar * 0.7], [ax - ar, ry + ar * 0.7]] : [[ax, ry + ar], [ax + ar, ry - ar * 0.7], [ax - ar, ry - ar * 0.7]], arrived ? col : L, e0 * out * blink, false);
    }
    return J.mainDraw(env, it);
  },
});

/* 6. the line over dark water: its reflection arrives late, ripples, and once moves by itself */
regL('hzReflection', {
  name: '遅れる水鏡', en: 'Late Reflection', tags: TAGS.concat(['emotional', 'calm']), w: 1, ae: 'stack', fits: n => n >= 1 && n <= 16,
  plan(rng, cut, st) {
    return { font: rng.pick(fontsOf(st, ['serif', 'display'])), lag: rng.range(0.4, 0.8), rip: rng.range(0.7, 1.3), odd: rng.chance(0.7), at: rng.range(0.45, 0.7), dir: rng.pick([-1, 1]) };
  },
  render(env) {
    const { W, H, sc } = env, cut = env.cut, Pm = cut.params, s = cut.seed | 0, lt = env.lt, ctx = env.ctx;
    const text = linesOf(env, flat(cut.text), 10, 5), o = { track: 0.06, lead: 1.12 };
    const size = Math.min(J.fitSize(text, Pm.font, W * 0.82, H * 0.3, o), H * 0.2);
    const m = J.measure(Object.assign({ text, font: Pm.font, size }, o));
    const y0 = H * 0.52, out = tout(env), gapY = size * 0.1;
    if (env.pass === 'main') {
      const e = tin(env, 0, 0.6), dk = nightC(sc);
      const g = ctx.createLinearGradient(0, y0, 0, H);
      g.addColorStop(0, J.rgba(dk, (0.18 * e * out).toFixed(3))); g.addColorStop(1, J.rgba(dk, (0.7 * e * out).toFixed(3)));
      ctx.save(); ctx.fillStyle = g; ctx.fillRect(0, y0, W, H - y0); ctx.restore();
      const col = dimC(sc, 0.35), lw = Math.max(1, U(env) * 0.002);
      env.line([[W / 2 - W * 0.5 * e, y0], [W / 2 + W * 0.5 * e, y0]], col, lw, 0.7 * out, false);
      for (let k = 0; k < 5; k++) {
        const yy = y0 + (H - y0) * (0.2 + 0.16 * k), ww = W * J.rr(0.05, 0.16, s, k, 1), xx = wrap(W * J.r(s, k, 2) + env.ltb * W * 0.012 * (k % 2 ? 1 : -1), W);
        env.line([[xx - ww / 2, yy], [xx + ww / 2, yy]], col, lw, 0.35 * e * out, false);
      }
    }
    const bb = J.mainDraw(env, Object.assign({ text, font: Pm.font, size, x: W / 2, y: y0 - m.h / 2 - gapY, color: sc.fg }, o));
    if (env.pass === 'main') {
      const k = 0.82, rh = m.h * k, NB = 9, top = y0 + gapY * 0.8, N = Math.max(1, J.glyphCount(text));
      const aR = 0.42 * out * (1 - clamp(env.pOut * 2.2)), t0 = cut.inDur * 0.5 + Pm.lag;
      // the moment the reflection moves and the words do not
      let dxAll = 0;
      if (Pm.odd) { const q = (lt - cut.dur * Pm.at) / 0.9; if (q > 0 && q < 1) dxAll = Pm.dir * size * 0.42 * Math.sin(Math.PI * q) * (J.r(s, env.step >> 1, 9) < 0.8 ? 1 : 0.6); }
      const refC = J.mix(sc.fg, sc.bg, 0.15);
      const cf = (i) => { const a = clamp((lt - t0 - (i / N) * Pm.lag * 1.6) / 0.55); return a <= 0 ? { hide: true } : { a }; };
      if (aR > 0.004) for (let i = 0; i < NB; i++) {
        const ya = top + rh * i / NB, dx = Math.sin(env.ltb * 1.7 * Pm.rip + i * 0.85) * size * 0.05 * (0.35 + i / NB);
        ctx.save(); ctx.beginPath(); ctx.rect(0, ya, W, rh / NB + 0.6); ctx.clip();
        env.draw(Object.assign({ text, font: Pm.font, size, x: W / 2 + dx + dxAll, y: top + rh / 2, sy: -k, color: refC, alpha: aR * (1 - 0.7 * i / NB), ghost: false, charFn: cf }, o));
        ctx.restore();
      }
    }
    return bb;
  },
});

/* 7. a fogged window: the line is wiped into the condensation with a finger and starts to run */
regL('hzFogWindow', {
  name: '曇り窓の指文字', en: 'Fogged Window', tags: TAGS.concat(['emotional']), w: 0.9, busy: true, treat: 'safe', ae: 'center', fits: n => n >= 1 && n <= 16,
  plan(rng, cut, st) {
    return { font: handOf(rng, st), bar: rng.range(0.22, 0.3), drip: rng.range(0.45, 0.9), tilt: rng.range(-2.5, 2.5) };
  },
  render(env) {
    const { W, H, sc } = env, cut = env.cut, Pm = cut.params, s = cut.seed | 0, lt = env.lt, ctx = env.ctx, u = U(env);
    const mg = u * 0.07, fx0 = mg, fx1 = W - mg, fy0 = mg, fy1 = H - mg, barY = fy0 + (fy1 - fy0) * Pm.bar, barH = u * 0.022;
    const dk = darkOf(sc), fogC = J.mix(dk, lightOf(sc), 0.46), inkC = J.mix(dk, '#000000', 0.6), wallC = J.mix(dk, '#000000', 0.4);
    const inA = tin(env, 0, 0.3), out = tout(env);
    if (env.pass === 'main') {
      env.rect(0, 0, W, H, wallC, inA, false);
      env.rect(fx0, fy0, fx1 - fx0, fy1 - fy0, fogC, inA, false);
      // the fog is thinner towards the frame
      ctx.save(); ctx.globalAlpha = inA;
      for (const [xa, ya, xb, yb] of [[0, fy0, 0, fy0 + u * 0.16], [0, fy1, 0, fy1 - u * 0.16], [fx0, 0, fx0 + u * 0.16, 0], [fx1, 0, fx1 - u * 0.16, 0]]) {
        const g = ctx.createLinearGradient(xa, ya, xb, yb); g.addColorStop(0, J.rgba(inkC, 0.4)); g.addColorStop(1, J.rgba(inkC, 0));
        ctx.fillStyle = g; ctx.fillRect(fx0, fy0, fx1 - fx0, fy1 - fy0);
      }
      ctx.restore();
      env.rect(fx0, barY - barH / 2, fx1 - fx0, barH, wallC, inA, false);
      env.rrect(fx0, fy0, fx1 - fx0, fy1 - fy0, 2, null, inA, false, J.mix(wallC, lightOf(sc), 0.18), Math.max(2, u * 0.006));
    }
    const text = linesOf(env, flat(cut.text), 9, 5), o = { track: 0.05, lead: 1.2 };
    const ah = fy1 - barY - barH, size = Math.min(J.fitSize(text, Pm.font, (fx1 - fx0) * 0.8, ah * 0.56, o), H * 0.2);
    const it = Object.assign({ text, font: Pm.font, size, x: W / 2, y: barY + barH / 2 + ah * 0.44, rot: Pm.tilt, color: inkC }, o);
    const bb = J.mainDraw(env, it);
    if (env.pass === 'main' && lt > cut.inDur * 0.7) {
      // water runs down from the strokes
      const sl = slots(it), lim = fy1 - u * 0.02, lw = Math.max(1.5, size * 0.035);
      for (let i = 0; i < sl.length && i < 24; i++) {
        if (J.r(s, i, 11) > Pm.drip) continue;
        const g = sl[i], x = g.x + J.rs(s, i, 12) * g.w * 0.22, yb = g.y + g.h * 0.2;
        const gr = E.outCubic(clamp((lt - cut.inDur * 0.7 - J.r(s, i, 13) * 1.4) / (2.2 + J.r(s, i, 14) * 3)));
        const Ld = Math.min(size * J.rr(0.5, 1.7, s, i, 15) * gr, lim - yb);
        if (Ld < 2) continue;
        env.line([[x, yb], [x + J.rs(s, i, 16) * lw, yb + Ld]], inkC, lw * J.rr(0.6, 1, s, i, 17), 0.85 * out, false);
        env.circle(x + J.rs(s, i, 16) * lw, yb + Ld, lw * 0.75, inkC, null, 0, 0.85 * out, false);
      }
    }
    return bb;
  },
});

/* 8. a voicemail from a number that does not exist: card with an unknown caller, a waveform with a dead stretch, the line as the message */
regL('hzVoicemail', {
  name: '非通知の留守電', en: 'Unknown Voicemail', tags: TAGS.concat(['editorial', 'glitch']), w: 0.9, treat: 'safe', ae: 'pill', fits: n => n >= 1 && n <= 16,
  plan(rng, cut, st) {
    return { font: rng.pick(fontsOf(st, ['body', 'serif', 'display'])), hh: rng.int(2, 4), mm: rng.int(0, 59), z0: rng.range(0.3, 0.55), zw: rng.range(0.12, 0.22), gl: rng.range(0.45, 0.75) };
  },
  render(env) {
    const { W, H, sc } = env, cut = env.cut, Pm = cut.params, s = cut.seed | 0, lt = env.lt, port = isPort(env), u = U(env), mono = monoF(env);
    const cw = port ? W * 0.86 : Math.min(W * 0.72, H * 1.3), ch = port ? Math.min(H * 0.62, cw * 1.2) : H * 0.74;
    const fs = clamp(u * 0.032, 12, 40), e = tin(env, 0, 0.45, E.outExpo), out = tout(env), a = e * out;
    const x0 = (W - cw) / 2, y0 = (H - ch) / 2 + (1 - e) * u * 0.05, x1 = x0 + cw;
    const plate = J.mix(sc.bg, sc.fg, 0.08), lc = J.mix(sc.bg, sc.fg, 0.32), LC = sc.fg, pd = fs * 1.5;
    const yw = y0 + fs * 6.4, yL0 = yw + fs * 3.2, yL1 = y0 + ch - fs * 1.1;
    if (env.pass === 'main') {
      const lw = Math.max(1.2, u * 0.002);
      env.rrect(x0, y0, cw, ch, u * 0.028, plate, a, false, lc, lw);
      // caller: nobody
      const ax = x0 + pd + fs * 1.25, ay = y0 + fs * 2.5;
      env.circle(ax, ay, fs * 1.25, null, lc, lw, a, false);
      env.draw({ text: '?', font: mono, size: fs * 1.3, x: ax, y: ay, color: lc, alpha: a, ghost: false });
      env.draw({ text: 'UNKNOWN', font: mono, size: fs * 1.2, align: 'left', x: ax + fs * 2.1, y: y0 + fs * 1.9, color: LC, alpha: a, track: 0.14, ghost: false });
      // the number never settles on anything but zeros, and loses them for a moment
      const gq = lt - cut.dur * Pm.gl, gl = gq > 0 && gq < 0.35; let num = '';
      for (let i = 0; i < 11; i++) {
        if (i === 3 || i === 7) num += '-';
        const live = lt < 0.25 + i * 0.07 || (gl && J.r(s, i, env.step, 2) < 0.6);
        num += live ? String(J.h(s, i, env.step) % 10) : '0';
      }
      env.draw({ text: num, font: mono, size: fs * 0.92, align: 'left', x: ax + fs * 2.1, y: y0 + fs * 3.35, color: gl ? J.fitContrast(sc.accent, plate, 3) : lc, alpha: a, track: 0.08, ghost: false });
      env.draw({ text: pad2(Pm.hh) + ':' + pad2(Pm.mm), font: mono, size: fs * 0.92, align: 'right', x: x1 - pd, y: y0 + fs * 1.9, color: lc, alpha: a, ghost: false });
      env.line([[x0 + pd, y0 + fs * 4.7], [x0 + pd + (cw - pd * 2) * e, y0 + fs * 4.7]], lc, lw, a * 0.7, false);
      // waveform with a stretch of nothing in it
      const NB = port ? 34 : 48, wx0 = x0 + pd, ww = cw - pd * 2, p = clamp(lt / Math.max(0.2, cut.dur)), bw = ww / NB;
      for (let i = 0; i < NB; i++) {
        const f = (i + 0.5) / NB, dead = f > Pm.z0 && f < Pm.z0 + Pm.zw;
        let hgt = fs * 1.25 * (dead ? 0.05 : 0.14 + 0.86 * Math.abs(J.noise1(i * 0.7, s + 3)) * (0.6 + 0.4 * J.r(s, i, 4)));
        if (f < p && f > p - 0.04 && !dead) hgt *= 1 + 0.25 * J.rs(s, i, env.step, 5);
        hgt *= tin(env, 0.1 + f * 0.3, 0.25);
        env.rect(wx0 + i * bw + bw * 0.22, yw - hgt, bw * 0.56, hgt * 2, f <= p ? LC : lc, a * (f <= p ? 0.9 : 0.7), false);
      }
      env.rect(wx0 + ww * p - lw, yw - fs * 1.5, lw * 2, fs * 3, J.fitContrast(sc.accent, plate, 3), a, false);
      env.draw({ text: '0:' + pad2(Math.floor(Math.max(0, lt)) % 60), font: mono, size: fs * 0.8, align: 'left', x: wx0, y: yw + fs * 2.1, color: lc, alpha: a, ghost: false });
      env.draw({ text: '--:--', font: mono, size: fs * 0.8, align: 'right', x: x1 - pd, y: yw + fs * 2.1, color: lc, alpha: a, ghost: false });
    }
    const text = linesOf(env, flat(cut.text), 9, 5), o = { track: 0.05, lead: 1.2 };
    const size = Math.min(J.fitSize(text, Pm.font, cw * 0.84, (yL1 - yL0) * 0.88, o), H * 0.18);
    return J.mainDraw(env, Object.assign({ text, font: Pm.font, size, x: W / 2, y: (yL0 + yL1) / 2, color: LC }, o));
  },
});

/* 9. under a street lamp: the line stands in the cone of the only light, everything else is night, and the lamp is failing */
regL('hzStreetLamp', {
  name: '街灯の下', en: 'Street Lamp', tags: TAGS.concat(['emotional', 'calm']), w: 1, busy: true, ae: 'center', fits: n => n >= 1 && n <= 16,
  plan(rng, cut, st) {
    return { font: rng.pick(fontsOf(st, ['serif', 'display'])), side: rng.pick([-1, 1]), rate: rng.range(0.4, 0.9), moths: rng.int(3, 6) };
  },
  render(env) {
    const { W, H, sc } = env, cut = env.cut, Pm = cut.params, s = cut.seed | 0, lt = env.lt, ctx = env.ctx, port = isPort(env), u = U(env), side = Pm.side;
    const wg = Math.min(W * 0.46, u * 0.64), hx = W * (0.5 + (port ? 0 : side * 0.05)), hy = H * 0.12, gy = H * 0.88, cH = gy - hy, ap = u * 0.022;
    const text = linesOf(env, flat(cut.text), 7, 5), o = { track: 0.05, lead: 1.16 };
    // the block sits at the foot of the cone: the lower it ends up, the wider it may be
    let size = Math.min(J.fitSize(text, Pm.font, wg * 0.92, cH * 0.42, o), H * 0.17), m = J.measure(Object.assign({ text, font: Pm.font, size }, o));
    for (let k = 0; k < 2; k++) {
      const f = clamp(1 - 0.07 - m.h / cH, 0.5, 0.9);
      size = Math.min(J.fitSize(text, Pm.font, Math.min(wg * 2 * f * 0.9, W * 0.84), cH * 0.42, o), H * 0.17); m = J.measure(Object.assign({ text, font: Pm.font, size }, o));
    }
    // lamp level: stutters on, fails now and then, dies on the way out
    let lv = lt < 0.4 ? (J.r(s, env.step, 3) < 0.45 ? 0.12 : 1) * clamp(lt / 0.1) : lamp(lt + (s % 97), s, Pm.rate);
    if (env.pOut > 0) lv *= (J.r(s, env.step, 4) < 0.4 ? 0.3 : 1) * (1 - E.inCubic(env.pOut));
    const L = glowC(sc), dk = nightC(sc);
    const cone = () => { ctx.moveTo(hx - ap, hy); ctx.lineTo(hx + ap, hy); ctx.lineTo(hx + wg, gy); ctx.lineTo(hx - wg, gy); ctx.closePath(); };
    if (env.pass === 'main') {
      ctx.save();
      const g = ctx.createLinearGradient(0, hy, 0, gy);
      g.addColorStop(0, J.rgba(L, (0.3 * lv).toFixed(3))); g.addColorStop(0.5, J.rgba(L, (0.1 * lv).toFixed(3))); g.addColorStop(1, J.rgba(L, (0.05 * lv).toFixed(3)));
      ctx.fillStyle = g; ctx.beginPath(); cone(); ctx.fill();
      ctx.translate(hx, gy); ctx.scale(1, 0.12);
      const g2 = ctx.createRadialGradient(0, 0, 0, 0, 0, wg);
      g2.addColorStop(0, J.rgba(L, (0.2 * lv).toFixed(3))); g2.addColorStop(1, J.rgba(L, 0));
      ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(0, 0, wg, 0, TAU); ctx.fill();
      ctx.restore();
    }
    const bb = J.mainDraw(env, Object.assign({ text, font: Pm.font, size, x: hx, y: gy - cH * 0.07 - m.h / 2, color: sc.fg }, o));
    if (env.pass !== 'main') return bb;
    ctx.save();
    ctx.fillStyle = dk; ctx.globalAlpha = 0.93; ctx.beginPath(); ctx.rect(-W, -H, W * 3, H * 3); cone(); ctx.fill('evenodd');
    ctx.globalAlpha = clamp((1 - lv) * 0.85); ctx.beginPath(); cone(); ctx.fill();
    ctx.restore();
    // the lamp itself: a pole at the edge of the light, an arm, a small head
    const pc = J.mix(dk, lightOf(sc), 0.3), lw = Math.max(2, u * 0.006), px = hx - side * wg * 0.94, e = tin(env, 0, 0.3);
    env.line([[px, gy], [px, hy - u * 0.02], [hx - side * ap, hy - u * 0.02]], pc, lw, e, false);
    env.poly([[hx - ap * 1.8, hy], [hx + ap * 1.8, hy], [hx + ap, hy - u * 0.03], [hx - ap, hy - u * 0.03]], pc, e, false);
    env.rect(hx - ap * 1.3, hy, ap * 2.6, Math.max(2, u * 0.005), L, clamp(lv) * 0.9, false);
    env.line([[0, gy], [W, gy]], pc, Math.max(1, u * 0.002), 0.5 * e, false);
    for (let k = 0; k < Pm.moths; k++) {
      const ph = J.r(s, k, 21) * TAU, rr = u * J.rr(0.02, 0.06, s, k, 22), sp = J.rr(3, 6, s, k, 23) * (k % 2 ? 1 : -1);
      const mx = hx + Math.cos(env.ltb * sp + ph) * rr * 1.3 + J.noise1(env.ltb * 2, s + k) * rr, my = hy + u * 0.05 + Math.sin(env.ltb * sp * 1.3 + ph) * rr;
      env.circle(mx, my, Math.max(1.2, u * 0.003), L, null, 0, 0.7 * clamp(lv) * e, false);
    }
    return bb;
  },
});

/* 10. a note torn in two: the pieces start joined, tear apart and lie crooked, the line split between them */
regL('hzTornNote', {
  name: '破れた書き置き', en: 'Torn Note', tags: TAGS.concat(['emotional', 'editorial']), w: 1, treat: 'safe', ae: 'labels', fits: n => n >= 1 && n <= 16,
  plan(rng, cut, st) {
    return { font: handOf(rng, st), rotA: rng.range(-4.5, -1.5), rotB: rng.range(2, 5.5), dx: rng.range(0.02, 0.045), side: rng.pick([-1, 1]), rule: rng.chance(0.6) };
  },
  render(env) {
    const { W, H, sc } = env, cut = env.cut, Pm = cut.params, s = cut.seed | 0, lt = env.lt, ctx = env.ctx, port = isPort(env);
    const raw = flat(cut.text), n = J.glyphCount(raw);
    const whole = J.splitLines(raw, port ? 5 : 8).split('\n');
    let tA, tB = '';
    if (whole.length >= 2) { const h = Math.ceil(whole.length / 2); tA = whole.slice(0, h).join('\n'); tB = whole.slice(h).join('\n'); }
    else if (hasLatin(raw) && raw.includes(' ')) { const ws = raw.split(' '), h = Math.ceil(ws.length / 2); tA = ws.slice(0, h).join(' '); tB = ws.slice(h).join(' '); }
    else if (!hasLatin(raw) && n >= 4) {
      const a = [...raw]; let h = Math.ceil(a.length / 2);
      while (h < a.length - 1 && (J.isPunct(a[h]) || J.isSmallKana(a[h]) || a[h] === 'ー')) h++;
      tA = a.slice(0, h).join(''); tB = a.slice(h).join('');
    } else tA = raw;
    const o = { track: 0.04, lead: 1.2 }, mw = W * 0.56, mh = H * (tB ? 0.21 : 0.34);
    let size = Math.min(J.fitSize(tA, Pm.font, mw, mh, o), tB ? J.fitSize(tB, Pm.font, mw, mh, o) : 1e9, H * 0.19);
    const mA = J.measure(Object.assign({ text: tA, font: Pm.font, size }, o)), mB = tB ? J.measure(Object.assign({ text: tB, font: Pm.font, size }, o)) : { w: 0, h: 0 };
    const pw = Math.max(mA.w, mB.w) + size * 1.3, hA = mA.h + size * 0.95, hB = tB ? mB.h + size * 0.95 : size * 1.1;
    const yA0 = H / 2 - (hA + hB) / 2 + hA / 2, yB0 = yA0 + hA / 2 + hB / 2;
    const q = E.inOutCubic(clamp((lt - 0.12) / 0.6)), side = Pm.side;
    const A = { x: W / 2 - side * W * Pm.dx * q, y: yA0 - H * 0.02 * q, rot: Pm.rotA * q }, B = { x: W / 2 + side * W * Pm.dx * q, y: yB0 + H * 0.03 * q, rot: Pm.rotB * q };
    const paperC = J.mix(lightOf(sc), darkOf(sc), 0.1), inkC = J.mix(darkOf(sc), '#000000', 0.25);
    if (env.pass === 'main') {
      const a = tin(env, 0, 0.2) * tout(env), NJ = 18, jag = i => J.rs(s, i, 31) * size * 0.13 + (i % 2 ? 1 : -1) * size * 0.03;
      const piece = (C, h, top) => {
        const path = (dx, dy) => {
          ctx.beginPath();
          if (top) { for (let i = 0; i <= NJ; i++) { const x = -pw / 2 + pw * i / NJ, y = -h / 2 + jag(i); if (i) ctx.lineTo(x + dx, y + dy); else ctx.moveTo(x + dx, y + dy); } ctx.lineTo(pw / 2 + dx, h / 2 + dy); ctx.lineTo(-pw / 2 + dx, h / 2 + dy); }
          else { ctx.moveTo(-pw / 2 + dx, -h / 2 + dy); ctx.lineTo(pw / 2 + dx, -h / 2 + dy); for (let i = NJ; i >= 0; i--) ctx.lineTo(-pw / 2 + pw * i / NJ + dx, h / 2 + jag(i) + dy); }
          ctx.closePath();
        };
        ctx.save(); ctx.translate(C.x, C.y); ctx.rotate(C.rot * DEG);
        ctx.globalAlpha = a * 0.28; ctx.fillStyle = '#000000'; path(size * 0.05, size * 0.07); ctx.fill();
        ctx.globalAlpha = a; ctx.fillStyle = paperC; path(0, 0); ctx.fill();
        if (Pm.rule) {
          ctx.save(); path(0, 0); ctx.clip(); ctx.strokeStyle = J.rgba(inkC, 0.14); ctx.lineWidth = Math.max(1, size * 0.012); ctx.beginPath();
          const st2 = size * 0.6; for (let y = -h / 2 + st2 * 0.7; y < h / 2 + size * 0.2; y += st2) { ctx.moveTo(-pw / 2, y); ctx.lineTo(pw / 2, y); }
          ctx.stroke(); ctx.restore();
        }
        ctx.restore();
      };
      piece(A, hA, false); piece(B, hB, true);
    }
    let bb = J.mainDraw(env, Object.assign({ text: tA, font: Pm.font, size, x: A.x, y: A.y, rot: A.rot, color: inkC, mi: 0 }, o));
    if (tB) {
      const r = B.rot * DEG, off = size * 0.06;   // nudge down past the torn edge
      bb = UB(bb, J.mainDraw(env, Object.assign({ text: tB, font: Pm.font, size, x: B.x - Math.sin(r) * off, y: B.y + Math.cos(r) * off, rot: B.rot, color: inkC, mi: 1 }, o)));
    }
    return bb;
  },
});

/* 11. the strip of light under a door — and two shadows that walk into it and stop */
regL('hzUnderDoor', {
  name: '扉の下の影', en: 'Under the Door', tags: TAGS.concat(['emotional', 'graphic']), w: 1, ae: 'center', fits: n => n >= 1 && n <= 16,
  plan(rng, cut, st) {
    return { font: rng.pick(fontsOf(st, ['serif', 'display'])), from: rng.pick([-1, 1]), at: rng.range(0.28, 0.42), knob: rng.pick([-1, 1]), fx: rng.range(-0.18, 0.18) };
  },
  render(env) {
    const { W, H, sc } = env, cut = env.cut, Pm = cut.params, s = cut.seed | 0, lt = env.lt, ctx = env.ctx, u = U(env);
    const text = linesOf(env, flat(cut.text), 9, 5), o = { track: 0.05, lead: 1.18 };
    const size = Math.min(J.fitSize(text, Pm.font, W * 0.72, H * 0.4, o), H * 0.2);
    const m = J.measure(Object.assign({ text, font: Pm.font, size }, o));
    const dw = clamp(m.w + size * 1.7, Math.min(W * 0.5, H * 0.46), W * 0.88), top = H * 0.07, gy = H * 0.855, gh = u * 0.02;
    const x0 = W / 2 - dw / 2, x1 = W / 2 + dw / 2;
    if (env.pass === 'main') {
      const out = tout(env), e = tin(env, 0, 0.8, E.inOutCubic), col = dimC(sc, 0.26), lw = Math.max(1.2, u * 0.0024), L = glowC(sc);
      env.polyPartial([[x0, gy], [x0, top], [x1, top], [x1, gy]], e, col, lw, out, false);
      env.line([[0, gy + gh], [x0, gy + gh]], col, lw, 0.6 * e * out, false); env.line([[x1, gy + gh], [W, gy + gh]], col, lw, 0.6 * e * out, false);
      // feet: they come along the gap in a few steps and stop under the words
      const fw = clamp(dw * 0.075, u * 0.045, u * 0.085), tx = W / 2 + Pm.fx * dw, sx = Pm.from > 0 ? x1 + fw * 2 : x0 - fw * 2;
      const walk = uu => { const v = clamp(uu) * 4, k = Math.floor(v); return Math.min(1, (k + E.inOutCubic(v - k)) / 4); };
      const t0 = cut.dur * Pm.at * 0.5, T = Math.max(0.8, cut.dur * Pm.at);
      const feet = [lerp(sx, tx - Pm.from * fw * 0.75, walk((lt - t0) / T)), lerp(sx, tx + Pm.from * fw * 0.75, walk((lt - t0 - T * 0.11) / T))];
      const arrived = lt > t0 + T * 1.15;
      const lv = (lt < 0.3 ? (J.r(s, env.step, 2) < 0.4 ? 0.2 : 1) : 0.9 + 0.1 * J.r(s, env.step, 3)) * clamp(lt / 0.12) * (1 - clamp(env.pOut * 3));
      // light spilling under the door onto the floor
      ctx.save();
      const g = ctx.createLinearGradient(0, gy + gh, 0, H);
      g.addColorStop(0, J.rgba(L, (0.2 * lv).toFixed(3))); g.addColorStop(1, J.rgba(L, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x0, gy + gh); ctx.lineTo(x1, gy + gh); ctx.lineTo(x1 + dw * 0.12, H); ctx.lineTo(x0 - dw * 0.12, H); ctx.closePath(); ctx.fill();
      ctx.restore();
      env.rect(x0, gy, dw, gh, L, 0.9 * lv, false);
      for (const fxp of feet) {
        const a0 = Math.max(x0, fxp - fw / 2), a1 = Math.min(x1, fxp + fw / 2);
        if (a1 - a0 < 1) continue;
        env.rect(a0, gy - 1, a1 - a0, gh + 2, sc.bg, 1, false);
        env.poly([[a0, gy + gh], [a1, gy + gh], [a1 + fw * 0.5, H], [a0 - fw * 0.5, H]], sc.bg, 0.8 * clamp(lv), false);
      }
      // the handle moves once they have stopped
      const kx = Pm.knob > 0 ? x1 - size * 0.42 : x0 + size * 0.42, ky = H * 0.5, kr = Math.max(4, u * 0.013);
      const rat = arrived && J.r(s, Math.floor(lt * 1.3), 6) < 0.55 ? Math.sin(env.ltb * 22) * 24 : 0, ka = (10 + rat) * DEG * Pm.knob;
      env.circle(kx, ky, kr, null, col, lw, e * out, false);
      env.line([[kx, ky], [kx - Pm.knob * Math.cos(ka) * kr * 3.2, ky + Math.sin(ka) * kr * 3.2]], col, lw * 1.6, e * out, false);
    }
    return J.mainDraw(env, Object.assign({ text, font: Pm.font, size, x: W / 2, y: (top + gy) / 2 - H * 0.02, color: sc.fg }, o));
  },
});

/* 12. seen from inside a closet: horizontal slats open just enough to read the line, and someone walks past outside */
regL('hzSlats', {
  name: '鎧戸の隙間', en: 'Through Slats', tags: TAGS.concat(['graphic', 'glitch']), w: 0.9, busy: true, ae: 'center', fits: n => n >= 1 && n <= 16,
  plan(rng, cut, st) {
    return { font: rng.pick(fontsOf(st, ['display'])), duty: rng.range(0.26, 0.33), at: rng.range(0.35, 0.6), dir: rng.pick([-1, 1]), pass: rng.chance(0.85) };
  },
  render(env) {
    const { W, H, sc } = env, cut = env.cut, Pm = cut.params, s = cut.seed | 0, lt = env.lt, u = U(env);
    const text = linesOf(env, flat(cut.text), 8, 4), o = { track: 0.03, lead: 1.12 };
    const size = Math.min(J.fitSize(text, Pm.font, W * 0.84, H * 0.5, o), H * 0.3);
    const bb = J.mainDraw(env, Object.assign({ text, font: Pm.font, size, x: W / 2, y: H / 2, color: sc.fg }, o));
    if (env.pass !== 'main') return bb;
    const dk = nightC(sc), slat = J.mix(sc.bg, '#000000', isDark(sc.bg) ? 0.55 : 0.84), edge = J.mix(slat, lightOf(sc), 0.22);
    const ph = clamp(size * 0.2, u * 0.028, u * 0.06), open = tin(env, 0.03, 0.5, E.inOutCubic) * (1 - E.inCubic(env.pOut));
    let px = null;
    if (Pm.pass) {
      const p = (lt - cut.dur * Pm.at) / 1.3;
      if (p > 0 && p < 1) { px = lerp(-u * 0.2, W + u * 0.2, Pm.dir > 0 ? p : 1 - p); env.rect(px - u * 0.13, 0, u * 0.26, H, dk, 0.3, false); env.rect(px - u * 0.08, 0, u * 0.16, H, dk, 0.45, false); }
    }
    const lh = Math.max(1, u * 0.0016);
    for (let y = -ph * 0.4, i = 0; y < H && i < 80; y += ph, i++) {
      // a hand on the slats now and then: one of them closes a little
      const tw = J.r(s, i, env.step >> 3, 4) < 0.04 ? 0.25 : 0;
      const d = clamp(lerp(1, Pm.duty + J.rs(s, i, 3) * 0.035 + tw, open), 0, 1);
      env.rect(0, y, W, ph * d + 0.5, slat, 1, false);
      if (d < 0.98) env.rect(0, y + ph * d - lh, W, lh, edge, 0.8, false);
    }
    return bb;
  },
});

/* 13. a clock that has stopped: the second hand keeps trying the same second; the line stands beside the dial */
regL('hzStoppedClock', {
  name: '止まった時計', en: 'Stopped Clock', tags: TAGS.concat(['editorial', 'calm']), w: 0.9, ae: 'mixed', fits: n => n >= 1 && n <= 16,
  plan(rng, cut, st) {
    return { font: rng.pick(fontsOf(st, ['serif', 'display'])), hh: rng.int(1, 11), mm: rng.int(3, 57), ss: rng.int(5, 50), stick: rng.range(0.25, 0.45), flip: rng.chance(0.5), roman: rng.chance(0.5) };
  },
  render(env) {
    const { W, H, sc } = env, cut = env.cut, Pm = cut.params, s = cut.seed | 0, lt = env.lt, port = isPort(env), u = U(env), mono = monoF(env);
    const R = port ? W * 0.3 : Math.min(H * 0.33, W * 0.2), cx = port ? W / 2 : (Pm.flip ? W * 0.94 - R : W * 0.06 + R), cy = port ? H * 0.28 : H * 0.48;
    const tw = W * 0.83 - R * 2, tcx = Pm.flip ? W * 0.06 + tw / 2 : W * 0.94 - tw / 2;
    if (env.pass === 'main') {
      const out = tout(env), e = tin(env, 0, 0.9, E.inOutCubic), col = dimC(sc, 0.34), lw = Math.max(1.2, u * 0.0026);
      env.arc(cx, cy, R, -90, -90 + 360 * e, col, lw * 1.5, out, false);
      for (let i = 0; i < 60 * e; i++) {
        const an = (i / 60) * TAU - Math.PI / 2, big = i % 5 === 0, r0 = R * (big ? 0.88 : 0.94), c = Math.cos(an), sn = Math.sin(an);
        env.line([[cx + c * r0, cy + sn * r0], [cx + c * R * 0.975, cy + sn * R * 0.975]], col, big ? lw * 1.6 : lw, out * (big ? 1 : 0.7), false);
      }
      const hand = (deg, len, w, c2, a, back = 0) => { const an = (deg - 90) * DEG; env.line([[cx - Math.cos(an) * back, cy - Math.sin(an) * back], [cx + Math.cos(an) * len, cy + Math.sin(an) * len]], c2, w, a, false); };
      const hc = dimC(sc, 0.55), h2 = tin(env, 0.25, 0.5) * out;
      hand(((Pm.hh % 12) + Pm.mm / 60) * 30, R * 0.5 * h2, lw * 3, hc, out);
      hand(Pm.mm * 6, R * 0.76 * h2, lw * 2, hc, out);
      // the second hand runs, then sticks: it tries the next second and falls back
      const Ts = Math.max(0.6, cut.dur * Pm.stick);
      let sec = Pm.ss + Math.floor(Math.min(lt, Ts)), tr = 0;
      if (lt >= Ts) { const f = (lt - Ts) % 1; if (f < 0.13) sec += 1; tr = J.rs(s, env.step, 5) * 0.7; }
      hand(sec * 6 + tr, R * 0.84 * h2, lw * 1.2, J.fitContrast(sc.accent, sc.bg, 3), out, R * 0.14 * h2);
      env.circle(cx, cy, lw * 3, hc, null, 0, out * e, false);
      const fs = clamp(u * 0.026, 11, 32);
      env.draw({ text: pad2(Pm.hh) + ':' + pad2(Pm.mm) + ':' + pad2(sec % 60), font: mono, size: fs, x: cx, y: cy + R + fs * 1.7, color: col, alpha: e * out, track: 0.12, ghost: false });
    }
    const text = J.splitLines(flat(cut.text), 5), o = { track: 0.05, lead: 1.18 };
    const size = port ? Math.min(J.fitSize(text, Pm.font, W * 0.84, H * 0.32, o), H * 0.13) : Math.min(J.fitSize(text, Pm.font, tw, H * 0.62, o), H * 0.22);
    return J.mainDraw(env, Object.assign({ text, font: Pm.font, size, x: port ? W / 2 : tcx, y: port ? H * 0.72 : H / 2, color: sc.fg }, o));
  },
});

/* 14. closer after every blink: a far figure on an empty floor; each time the light drops out it is standing nearer */
regL('hzCloser', {
  name: '近づく人影', en: 'Closer Each Blink', tags: TAGS.concat(['emotional']), w: 0.8, ae: 'center', fits: n => n >= 1 && n <= 16,
  plan(rng, cut, st) {
    return { font: rng.pick(fontsOf(st, ['serif', 'display'])), side: rng.pick([-1, 1]), k: rng.int(3, 4), vx: rng.range(0.42, 0.58) };
  },
  render(env) {
    const { W, H, sc } = env, cut = env.cut, Pm = cut.params, lt = env.lt, ctx = env.ctx, port = isPort(env), u = U(env);
    const text = linesOf(env, flat(cut.text), 10, 5), o = { track: 0.05, lead: 1.16 };
    const size = Math.min(J.fitSize(text, Pm.font, W * 0.82, H * (port ? 0.26 : 0.29), o), H * 0.19);
    const m = J.measure(Object.assign({ text, font: Pm.font, size }, o));
    const ty = Math.max(port ? H * 0.24 : H * 0.26, H * 0.07 + m.h / 2), hy = H * (port ? 0.56 : 0.6), vx = W * Pm.vx;
    const K = Pm.k, tk = k => cut.dur * (0.18 + 0.6 * k / K);
    let stage = 0, dark = 0;
    for (let k = 1; k <= K; k++) { const d = lt - tk(k); if (d >= 0) stage = k; if (d > -0.045 && d < 0.1) dark = 1; }
    if (env.pass === 'main') {
      const out = tout(env), e = tin(env, 0, 0.7), L = glowC(sc), col = dimC(sc, 0.22), lw = Math.max(1.2, u * 0.0022);
      ctx.save(); ctx.translate(vx, hy); ctx.scale(1, 0.45);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, u * 0.6);
      g.addColorStop(0, J.rgba(L, (0.24 * e * out).toFixed(3))); g.addColorStop(1, J.rgba(L, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, u * 0.6, 0, TAU); ctx.fill(); ctx.restore();
      env.line([[W / 2 - W * 0.5 * e, hy], [W / 2 + W * 0.5 * e, hy]], col, lw, out, false);
      for (const bx of [-0.25, 0.2, 0.8, 1.25]) env.polyPartial([[vx, hy], [W * bx, H]], e, col, lw, out * 0.7, false);
      // the figure: a head and a long body, nothing else
      const f = Math.pow(stage / K, 1.6), hF = lerp(H * 0.05, H * (port ? 0.3 : 0.38), f), by = lerp(hy + hF * 0.03, H * 1.03, f), x = lerp(vx, W * (0.5 + Pm.side * 0.28), f);
      const r = hF * 0.1, fc = J.mix(sc.bg, '#000000', isDark(sc.bg) ? 0.75 : 0.82), rim = dimC(sc, 0.3), top = by - hF;
      const a = clamp((lt - 0.25) / 0.5) * out;
      if (a > 0) {
        ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = fc; ctx.strokeStyle = rim; ctx.lineWidth = lw;
        ctx.beginPath(); ctx.moveTo(x - hF * 0.065, top + r * 2.1); ctx.quadraticCurveTo(x - hF * 0.16, top + r * 2.5, x - hF * 0.15, top + r * 4.4);
        ctx.lineTo(x - hF * 0.115, by); ctx.lineTo(x + hF * 0.115, by); ctx.lineTo(x + hF * 0.15, top + r * 4.4);
        ctx.quadraticCurveTo(x + hF * 0.16, top + r * 2.5, x + hF * 0.065, top + r * 2.1); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.arc(x, top + r * 1.05, r, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.restore();
      }
    }
    const bb = J.mainDraw(env, Object.assign({ text, font: Pm.font, size, x: W / 2, y: ty, color: sc.fg }, o));
    if (env.pass === 'main' && dark) env.rect(0, 0, W, H, nightC(sc), 0.86, false);
    return bb;
  },
});

/* 15. stairs going down: each line of the lyric on a lower, smaller step; below them the steps go dark — and something is climbing */
regL('hzStairs', {
  name: '下りていく階段', en: 'Stairs Down', tags: TAGS.concat(['graphic', 'emotional']), w: 1, ae: 'stack', fits: n => n >= 1 && n <= 16,
  plan(rng, cut, st) {
    return { font: rng.pick(fontsOf(st, ['display', 'serif'])), q: rng.range(0.82, 0.87), climb: rng.chance(0.85), at: rng.range(0.25, 0.4), vx: rng.range(-0.04, 0.04) };
  },
  render(env) {
    const { W, H, sc } = env, cut = env.cut, Pm = cut.params, s = cut.seed | 0, lt = env.lt, ctx = env.ctx, port = isPort(env), u = U(env);
    const N = 8, q = Pm.q, lines = J.splitLines(flat(cut.text), port ? 5 : 8).split('\n').slice(0, 5), Ln = lines.length;
    const h0 = H * 0.86 * (1 - q) / (1 - Math.pow(q, N)), cx0 = W / 2, drift = W * Pm.vx;
    const ys = [H * 0.07]; for (let i = 0; i < N; i++) ys.push(ys[i] + h0 * Math.pow(q, i));
    const hw = i => W * 0.45 * Math.pow(q, i), cxi = i => cx0 + drift * i;
    const o = { track: 0.05 };
    let base = 1e9;
    for (let i = 0; i < Ln; i++) base = Math.min(base, J.fitSize(lines[i], Pm.font, hw(i + 1) * 2 * 0.88, (ys[i + 1] - ys[i]) * 0.68, o) / Math.pow(q, i));
    base = Math.min(base, H * 0.2);
    if (env.pass === 'main') {
      const out = tout(env), col = dimC(sc, 0.36), lw = Math.max(1.2, u * 0.0024), L = glowC(sc);
      // something comes up the steps, one at a time, and stops just below the words
      if (Pm.climb) {
        const t0 = cut.dur * Pm.at, dt = Math.max(0.22, Math.min(0.5, cut.dur * 0.45 / Math.max(1, N - Ln)));
        const pos = N - 1 - Math.floor((lt - t0) / dt);
        if (lt >= t0) for (let i = Ln; i < N; i++) {
          const cur = Math.max(Ln, pos);
          const a = i === cur ? 0.2 * (0.75 + 0.25 * J.r(s, env.step, 6)) : (i > cur ? 0.05 : 0);
          if (a > 0) env.poly([[cxi(i) - hw(i), ys[i]], [cxi(i) + hw(i), ys[i]], [cxi(i + 1) + hw(i + 1), ys[i + 1]], [cxi(i + 1) - hw(i + 1), ys[i + 1]]], L, a * out, false);
        }
      }
      for (let i = 0; i <= N; i++) {
        const e = tin(env, i * 0.07, 0.4, E.outCubic), a = out * (1 - 0.62 * i / N);
        if (e <= 0) continue;
        env.line([[cxi(i) - hw(i) * e, ys[i]], [cxi(i) + hw(i) * e, ys[i]]], col, lw, a, false);
        if (i < N) for (const sg of [-1, 1]) env.polyPartial([[cxi(i) + sg * hw(i), ys[i]], [cxi(i + 1) + sg * hw(i + 1), ys[i + 1]]], tin(env, i * 0.07 + 0.2, 0.3), col, lw, a * 0.8, false);
      }
      const yd = ys[Math.min(N, Ln)], g = ctx.createLinearGradient(0, yd, 0, H), dk = nightC(sc), e = tin(env, 0, 0.6) * out;
      g.addColorStop(0, J.rgba(dk, 0)); g.addColorStop(1, J.rgba(dk, (0.78 * e).toFixed(3)));
      ctx.save(); ctx.fillStyle = g; ctx.fillRect(0, yd, W, H - yd); ctx.restore();
    }
    let bb = null;
    for (let i = 0; i < Ln; i++) {
      bb = UB(bb, J.mainDraw(env, Object.assign({ text: lines[i], font: Pm.font, size: base * Math.pow(q, i), x: cxi(i) + drift * 0.5, y: (ys[i] + ys[i + 1]) / 2, color: sc.fg, mi: i }, o)));
    }
    return bb;
  },
});

/* ================================================================== DECOR */

/* pairs of small lights far from the words: they open late, blink, and are shut again before the cut ends */
regD('hzPairEyes', {
  name: '闇の中の目', en: 'Eyes in the Dark', tags: TAGS.concat(['emotional']), w: 1, layer: 'front', subtle: true, ae: 'dots',
  draw(env, bb0, Pd) {
    if (env.pass !== 'main') return;
    const bb = center(env, bb0), { sc } = env, s = Pd.seed | 0, u = U(env), n = 1 + (Pd.n | 0);
    const col = isDark(sc.bg) ? sc.fg : sc.fg;
    for (let k = 0; k < n && k < 4; k++) {
      const sp = farSpot(env, bb, s, k, 0.07, 0.09); if (sp.d < u * 0.1) continue;
      const t0 = 0.45 + k * 0.6 + J.r(s, k, 3) * 0.5, tr = env.ltb;
      let open = E.outCubic(clamp((env.lt - t0) / 0.18)) * (1 - clamp(env.pOut * (1.6 + k * 0.5)));
      for (let b = 0; b < 4; b++) { const at = t0 + 0.7 + b * 1.25 + J.r(s, k, b, 4) * 0.9, d = Math.abs(tr - at); if (d < 0.07) open *= d / 0.07; }
      if (open <= 0.02) continue;
      const r = u * (Pd.big ? 0.011 : 0.0085) * (1 - k * 0.12), gap = r * 4.4, tilt = J.rs(s, k, 5) * 0.2;
      // the gaze shifts in small jumps
      const gx = J.rs(s, k, Math.floor(tr * 0.7), 6) * r * 0.8, gy = J.rs(s, k, Math.floor(tr * 0.7), 7) * r * 0.4;
      const ctx = env.ctx; ctx.save(); ctx.translate(sp.x + gx, sp.y + gy); ctx.rotate(tilt); ctx.fillStyle = col; ctx.globalAlpha = 0.9;
      for (const sg of [-1, 1]) { ctx.beginPath(); ctx.ellipse(sg * gap / 2, 0, r, Math.max(0.4, r * 0.82 * open), 0, 0, TAU); ctx.fill(); }
      ctx.restore();
    }
  },
});

/* a head-shaped shadow leaning in from the side edge; it pulls back the moment anything changes */
regD('hzPeeker', {
  name: '覗き込む影', en: 'Peeking Shape', tags: TAGS.concat(['emotional', 'graphic']), w: 0.8, layer: 'front', ae: 'shapes',
  draw(env, bb0, Pd) {
    if (env.pass !== 'main') return;
    const bb = center(env, bb0), { W, H, sc } = env, s = Pd.seed | 0, u = U(env), ctx = env.ctx, dir = Pd.right ? -1 : 1;
    const r = u * (Pd.big ? 0.085 : 0.065), ex = Pd.right ? W : 0;
    let y = H * (Pd.low ? 0.68 : 0.3) + J.rs(s, 1) * H * 0.06;
    const near = Pd.right ? bb.x1 > W - r * 2.4 : bb.x0 < r * 2.4;
    if (near && y > bb.y0 - r * 1.6 && y < bb.y1 + r * 1.6) y = (bb.y0 + bb.y1) / 2 > H / 2 ? Math.max(r * 1.2, bb.y0 - r * 2) : Math.min(H - r * 1.2, bb.y1 + r * 2);
    // lean in slowly, flinch back once, vanish fast
    let lean = E.inOutSine(clamp((env.lt - 0.3) / 1.4));
    const fl = env.lt - (2.2 + J.r(s, 2) * 1.5); if (fl > 0 && fl < 0.9) lean *= 0.25 + 0.75 * E.inOutSine(clamp(Math.abs(fl - 0.3) / 0.6));
    lean *= 1 - E.outCubic(clamp(env.pOut * 3));
    if (lean <= 0.01) return;
    const cx = ex + dir * (-r * 1.1 + lean * r * 1.75), cy = y + Math.sin(env.ltb * 0.8) * r * 0.05;
    const fc = isDark(sc.bg) ? J.mix(sc.bg, sc.fg, 0.13) : J.mix(sc.bg, '#000000', 0.72);
    ctx.save(); ctx.fillStyle = fc; ctx.globalAlpha = 0.95;
    ctx.beginPath(); ctx.ellipse(cx - dir * r * 1.5, cy + r * 2.3, r * 1.7, r * 1.5, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx, cy, r * 0.82, r, dir * 0.12, 0, TAU); ctx.fill();
    ctx.restore();
    const blink = Math.abs(env.ltb - 1.9 - J.r(s, 3)) < 0.07 ? 0.15 : 1;
    env.circle(cx + dir * r * 0.38, cy - r * 0.12, r * 0.075 * blink, isDark(sc.bg) ? sc.fg : sc.bg, null, 0, 0.9 * clamp(lean * 1.4 - 0.4), false);
  },
});

/* wet footprints that come towards the words one step at a time and stop short of them */
regD('hzFootprints', {
  name: '近づく足跡', en: 'Footprints', tags: TAGS.concat(['emotional']), w: 0.9, layer: 'back', subtle: true, ae: 'dots',
  draw(env, bb0, Pd) {
    if (env.pass !== 'main') return;
    const bb = center(env, bb0), { W, H, sc } = env, s = Pd.seed | 0, u = U(env), ctx = env.ctx, out = 1 - E.inCubic(env.pOut);
    if (out <= 0) return;
    const below = H - bb.y1 > bb.y0;
    const sx = W * (Pd.right ? 0.95 : 0.05), sy = below ? H * 0.95 : H * 0.05;
    const tx = clamp((bb.x0 + bb.x1) / 2 + J.rs(s, 1) * u * 0.1, W * 0.2, W * 0.8), ty = below ? Math.min(H * 0.93, bb.y1 + u * 0.1) : Math.max(H * 0.07, bb.y0 - u * 0.1);
    const D = Math.hypot(tx - sx, ty - sy), ang = Math.atan2(ty - sy, tx - sx), st = u * 0.1, N = Math.min(14, Math.max(3, Math.floor(D / st)));
    const col = dimC(sc, 0.34), fl = u * 0.042;
    for (let i = 0; i < N; i++) {
      const t0 = 0.2 + i * 0.24, a = clamp((env.lt - t0) / 0.1); if (a <= 0) break;
      const age = env.lt - t0, f = (i + 0.5) / N, sd = i % 2 ? 1 : -1;
      const px = lerp(sx, tx, f) - Math.sin(ang) * sd * fl * 0.55, py = lerp(sy, ty, f) + Math.cos(ang) * sd * fl * 0.55;
      ctx.save(); ctx.translate(px, py); ctx.rotate(ang + sd * 0.12 + J.rs(s, i, 2) * 0.1);
      ctx.fillStyle = col; ctx.globalAlpha = a * out * (0.32 + 0.5 * Math.exp(-age * 0.5));
      ctx.beginPath(); ctx.ellipse(fl * 0.2, 0, fl * 0.5, fl * 0.26, 0, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.ellipse(-fl * 0.48, 0, fl * 0.2, fl * 0.18, 0, 0, TAU); ctx.fill();
      ctx.restore();
    }
  },
});

/* a glyph of the line turns up somewhere it should not be — mirrored, faint, twitching */
regD('hzStrayGlyph', {
  name: 'はぐれた一字', en: 'Stray Glyph', tags: TAGS.concat(['glitch']), w: 0.8, layer: 'front', ae: 'shapes',
  draw(env, bb0, Pd) {
    if (env.pass !== 'main') return;
    const bb = center(env, bb0), { sc } = env, s = Pd.seed | 0, u = U(env);
    const gl = [...String(env.cut.text || '')].filter(c => !/\s/.test(c) && !J.isPunct(c)); if (!gl.length) return;
    const font = (env.st.fonts.serif && env.st.fonts.serif[0]) || (env.st.fonts.body && env.st.fonts.body[0]) || 'mincho', n = Math.min(2, 1 + ((Pd.n | 0) >> 1));
    for (let k = 0; k < n; k++) {
      const sp = farSpot(env, bb, s, k + 5, 0.1, 0.13), size = u * (Pd.big ? 0.15 : 0.11) * (1 - k * 0.2);
      if (sp.d < size * 0.9) continue;
      const t0 = 0.5 + k * 0.7, st = env.step;
      let a = clamp((env.lt - t0) / 0.08) * (1 - clamp(env.pOut * 2.5));
      if (env.lt - t0 < 0.5 && J.r(s, k, st, 1) < 0.45) a *= 0.2;       // flickers into place
      if (J.r(s, k, st >> 1, 2) < 0.07) a *= 0.3;
      if (a <= 0.01) continue;
      const tw = J.r(s, k, st >> 2, 3) < 0.18;
      env.draw({ text: gl[J.h(s, k, 4) % gl.length], font, size, x: sp.x + (tw ? J.rs(s, k, st, 5) * size * 0.08 : 0), y: sp.y, sx: -1, rot: J.rs(s, k, 6) * 14 + (k ? 180 : 0),
        color: sc.sub || sc.fg, alpha: 0.5 * a, ghost: false, plain: true });
    }
  },
});

/* long shadow fingers that creep out of a corner towards the words and stop just short of them */
regD('hzFingers', {
  name: '忍び寄る指', en: 'Creeping Fingers', tags: TAGS.concat(['emotional', 'graphic']), w: 0.8, layer: 'front', ae: 'bars',
  draw(env, bb0, Pd) {
    if (env.pass !== 'main') return;
    const bb = center(env, bb0), { W, H, sc } = env, s = Pd.seed | 0, u = U(env);
    const ox = Pd.right ? W : 0, oy = Pd.low ? H : 0, base = Math.atan2(bb.cy != null ? bb.cy - oy : H / 2 - oy, (bb.x0 + bb.x1) / 2 - ox);
    const col = isDark(sc.bg) ? J.mix(sc.bg, sc.fg, 0.15) : J.mix(sc.bg, '#000000', 0.7), nF = 4 + (Pd.big ? 1 : 0);
    const reach = Math.max(u * 0.12, distBB(bb, ox, oy) - u * 0.05);
    for (let k = 0; k < nF; k++) {
      const grow = E.outCubic(clamp((env.lt - 0.1 - k * 0.12) / (1.5 + J.r(s, k, 1) * 1.5))) * (1 - E.inCubic(clamp(env.pOut * 1.4)));
      if (grow <= 0.01) continue;
      const an0 = base + (k - (nF - 1) / 2) * 0.2 + J.rs(s, k, 2) * 0.05, Lf = Math.min(reach, u * J.rr(0.3, 0.6, s, k, 3)) * J.rr(0.72, 1, s, k, 4) * grow, w0 = u * J.rr(0.026, 0.04, s, k, 5);
      const m = 12, Lp = [], Rp = []; let x = ox, y = oy, an = an0;
      for (let i = 0; i <= m; i++) {
        const f = i / m, w = w0 * (1 - f * 0.8) * (i === m ? 0.25 : 1) * (1 + 0.18 * Math.sin(f * 9.4));    // knuckles
        Lp.push([x - Math.sin(an) * w, y + Math.cos(an) * w]); Rp.push([x + Math.sin(an) * w, y - Math.cos(an) * w]);
        an = an0 + J.noise1(f * 2.2 + env.ltb * 0.12, s + k * 7) * 0.5 * f;
        x += Math.cos(an) * Lf / m; y += Math.sin(an) * Lf / m;
        if (overlaps(bb, x, y, x, y, u * 0.03)) { Lp.push([x, y]); break; }
      }
      env.blob(Lp.concat(Rp.reverse()), col, 0.92, false);
    }
  },
});

/* handprints on the glass: pale smears pressed against the frame one after another, slowly running */
regD('hzHandprints', {
  name: '窓の手形', en: 'Handprints', tags: TAGS.concat(['emotional']), w: 0.7, layer: 'front', ae: 'blobs',
  draw(env, bb0, Pd) {
    if (env.pass !== 'main') return;
    const bb = center(env, bb0), { sc } = env, s = Pd.seed | 0, u = U(env), ctx = env.ctx, out = 1 - E.inCubic(env.pOut);
    if (out <= 0) return;
    const col = isDark(sc.bg) ? J.mix(sc.bg, sc.fg, 0.42) : J.mix(sc.bg, sc.fg, 0.3), n = 2 + (Pd.n | 0);
    for (let k = 0; k < n && k < 5; k++) {
      const sp = farSpot(env, bb, s, k + 11, 0.09, 0.12), R = u * (Pd.big ? 0.07 : 0.055) * J.rr(0.85, 1.15, s, k, 1);
      if (sp.d < R * 2.6) continue;
      const t0 = 0.25 + k * 0.5 + J.r(s, k, 2) * 0.3, pr = clamp((env.lt - t0) / 0.12); if (pr <= 0) continue;
      const age = env.lt - t0, a = out * pr * (0.2 + 0.2 * Math.exp(-age * 0.6)), run = E.outCubic(clamp(age / 4));
      ctx.save(); ctx.translate(sp.x, sp.y); ctx.rotate(J.rs(s, k, 3) * 0.6); ctx.scale(J.r(s, k, 4) < 0.5 ? -1 : 1, 1);
      const sc0 = 0.93 + 0.07 * E.outCubic(pr); ctx.scale(sc0, sc0);
      ctx.fillStyle = col; ctx.globalAlpha = a;
      ctx.beginPath(); ctx.ellipse(0, R * 0.25, R * 0.62, R * 0.7, 0, 0, TAU); ctx.fill();
      for (let f = 0; f < 4; f++) {
        const fa = (-0.42 + f * 0.28), len = R * [0.95, 1.12, 1.05, 0.82][f];
        ctx.save(); ctx.rotate(fa); ctx.beginPath(); ctx.ellipse(0, -R * 0.55 - len * 0.5, R * 0.14, len * 0.5, 0, 0, TAU); ctx.fill();
        // the smear runs down from the fingertips
        ctx.restore();
      }
      ctx.save(); ctx.rotate(-1.15); ctx.beginPath(); ctx.ellipse(0, -R * 0.8, R * 0.15, R * 0.42, 0, 0, TAU); ctx.fill(); ctx.restore();
      ctx.restore();
      for (let f = 0; f < 3; f++) {
        const x = sp.x + (f - 1) * R * 0.42 + J.rs(s, k, f, 5) * R * 0.1, Ld = R * J.rr(0.8, 2.2, s, k, f, 6) * run;
        if (Ld > 2 && !overlaps(bb, x, sp.y + R * 0.9 + Ld, x, sp.y + R * 0.9 + Ld, u * 0.02)) env.line([[x, sp.y + R * 0.9], [x, sp.y + R * 0.9 + Ld]], col, Math.max(1.2, R * 0.07), a * 0.8, false);
      }
    }
  },
});

/* a bare bulb on a cord at the top of the frame: it swings, stutters and goes out before the cut does */
regD('hzBareBulb', {
  name: '揺れる裸電球', en: 'Bare Bulb', tags: TAGS.concat(['emotional']), w: 0.9, layer: 'front', ae: 'shapes',
  draw(env, bb0, Pd) {
    if (env.pass !== 'main') return;
    const bb = center(env, bb0), { W, sc } = env, s = Pd.seed | 0, u = U(env), ctx = env.ctx;
    let x = W * (Pd.right ? 0.84 : 0.16) + J.rs(s, 1) * W * 0.04, Lc = u * (Pd.big ? 0.2 : 0.14);
    if (bb.y0 < Lc + u * 0.12 && x > bb.x0 - u * 0.1 && x < bb.x1 + u * 0.1) {
      const nx = Pd.right ? bb.x1 + u * 0.12 : bb.x0 - u * 0.12;
      if (nx > u * 0.06 && nx < W - u * 0.06) x = nx; else Lc = Math.max(u * 0.02, bb.y0 - u * 0.11);
    }
    const L = Lc * E.outCubic(clamp(env.lt / 0.5)) * (1 - E.inCubic(clamp(env.pOut * 1.2 - 0.2)));
    if (L <= 1) return;
    const ang = Math.sin(env.ltb * 1.9 + J.r(s, 2) * 6) * (5 + 8 * Math.exp(-Math.max(0, env.ltb) * 0.35)) * DEG * (0.4 + 0.6 * (env.fx.motion ?? 0.7));
    const bx = x + Math.sin(ang) * L, by = Math.cos(ang) * L, r = u * 0.018;
    let lv = env.lt < 0.75 ? (env.lt > 0.3 && J.r(s, env.step, 3) < 0.55 ? 1 : 0.08) : lamp(env.t, s, 1.3);
    if (env.pOut > 0) lv *= (J.r(s, env.step, 4) < 0.5 ? 0.15 : 1) * (1 - clamp(env.pOut * 2));
    const col = dimC(sc, 0.5), Lg = glowC(sc);
    env.line([[x, -2], [bx, by]], col, Math.max(1.2, u * 0.0022), 1, false);
    env.line([[bx - Math.sin(ang) * r * 1.5, by - Math.cos(ang) * r * 1.5], [bx, by]], col, r * 0.8, 1, false);
    const cx = bx + Math.sin(ang) * r * 0.9, cy = by + Math.cos(ang) * r * 0.9;
    if (lv > 0.02) {
      ctx.save(); const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, u * 0.12);
      g.addColorStop(0, J.rgba(Lg, (0.3 * lv).toFixed(3))); g.addColorStop(1, J.rgba(Lg, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, u * 0.12, 0, TAU); ctx.fill(); ctx.restore();
    }
    env.circle(cx, cy, r, Lg, col, Math.max(1, u * 0.002), 1, false);
    if (lv < 0.9) env.circle(cx, cy, r * 0.93, sc.bg, null, 0, clamp(1 - lv) * 0.85, false);
  },
});

/* a small door at the edge of the frame that opens by itself, a little, and is shut when the cut leaves */
regD('hzDoorAjar', {
  name: '開きかけの扉', en: 'Door Ajar', tags: TAGS.concat(['emotional', 'graphic']), w: 0.8, layer: 'front', ae: 'shapes',
  draw(env, bb0, Pd) {
    if (env.pass !== 'main') return;
    const bb = center(env, bb0), { W, H, sc } = env, s = Pd.seed | 0, u = U(env);
    let dw = u * (Pd.big ? 0.12 : 0.095), dh = dw * 2.15, right = !!Pd.right;
    const xOf = r => (r ? W - u * 0.06 - dw : u * 0.06), gy = H - u * 0.05;
    if (overlaps(bb, xOf(right), gy - dh, xOf(right) + dw, gy, u * 0.03)) { right = !right; if (overlaps(bb, xOf(right), gy - dh, xOf(right) + dw, gy, u * 0.03)) { const k = clamp((gy - bb.y1 - u * 0.04) / dh, 0, 1); if (k < 0.35) return; dw *= k; dh *= k; } }
    const x = xOf(right), y = gy - dh, out = 1 - E.inCubic(env.pOut), e = E.outCubic(clamp(env.lt / 0.5));
    const col = dimC(sc, 0.4), lw = Math.max(1.2, u * 0.0024), Lg = glowC(sc);
    env.polyPartial([[x, gy], [x, y], [x + dw, y], [x + dw, gy]], e, col, lw, out, false);
    env.line([[x - dw * 0.5, gy], [x + dw * 1.5, gy]], col, lw, 0.6 * e * out, false);
    // it opens while nobody looks, in two goes, and slams on the way out
    const op = (0.07 * E.outCubic(clamp((env.lt - 0.5) / 0.5)) + 0.24 * E.inOutSine(clamp((env.lt - 1.5 - J.r(s, 1)) / 1.8))) * (1 - E.outExpo(clamp(env.pOut * 2.5)));
    if (op <= 0.003) return;
    const hinge = right ? x + dw : x, dir = right ? -1 : 1, lv = 0.85 + 0.15 * J.r(s, env.step, 2), sw = dw * op;
    env.rect(right ? hinge - sw : hinge, y + lw, sw, dh - lw, Lg, 0.85 * lv, false);
    env.poly([[hinge, gy], [hinge + dir * sw, gy], [hinge + dir * (sw * 2.4 + dw * 0.5), gy + u * 0.045], [hinge + dir * dw * 0.2, gy + u * 0.045]], Lg, 0.14 * lv, false);
    env.circle(hinge + dir * (sw + dw * 0.1), y + dh * 0.55, Math.max(1.5, dw * 0.035), col, null, 0, out, false);
  },
});

/* a cobweb spun into a top corner, thread by thread, with one line let down from it */
regD('hzCobweb', {
  name: '隅の蜘蛛の巣', en: 'Cobweb', tags: TAGS.concat(['calm', 'graphic']), w: 0.9, layer: 'front', subtle: true, ae: 'leaders',
  draw(env, bb0, Pd) {
    if (env.pass !== 'main') return;
    const bb = center(env, bb0), { W, H, sc } = env, s = Pd.seed | 0, u = U(env), out = 1 - E.inCubic(env.pOut);
    if (out <= 0) return;
    const right = !!Pd.right, low = bb.y0 < u * 0.2 && bb.y1 < H - u * 0.2;
    const ox = right ? W : 0, oy = low ? H : 0, dx = right ? -1 : 1, dy = low ? -1 : 1;
    let R = u * (Pd.big ? 0.36 : 0.27);
    R = Math.min(R, Math.max(u * 0.1, distBB(bb, ox, oy) - u * 0.03));
    const col = dimC(sc, 0.42), lw = Math.max(1, u * 0.0016), nR = 6, sway = Math.sin(env.ltb * 0.9) * 0.012;
    const ends = [];
    for (let i = 0; i < nR; i++) {
      const an = (i / (nR - 1)) * Math.PI / 2 + (i > 0 && i < nR - 1 ? J.rs(s, i, 1) * 0.07 : 0) + sway * (i - 2.5), len = R * (i === 0 || i === nR - 1 ? 1.12 : J.rr(0.8, 1.05, s, i, 2));
      ends.push([Math.cos(an) * dx, Math.sin(an) * dy, len]);
      env.polyPartial([[ox, oy], [ox + ends[i][0] * len, oy + ends[i][1] * len]], E.outCubic(clamp((env.lt - i * 0.05) / 0.45)), col, lw, out, false);
    }
    const rings = 5;
    for (let q = 0; q < rings; q++) {
      const f = 0.24 + 0.17 * q, pts = [];
      for (let i = 0; i < nR; i++) {
        const a = ends[i], r1 = Math.min(a[2], R * f * (1 + J.rs(s, q, i, 3) * 0.05));
        pts.push([ox + a[0] * r1, oy + a[1] * r1]);
        if (i < nR - 1) { const b = ends[i + 1], r2 = Math.min(b[2], R * f), mx = (a[0] * r1 + b[0] * r2) / 2, my = (a[1] * r1 + b[1] * r2) / 2; pts.push([ox + mx * 0.9, oy + my * 0.9]); }   // the thread sags towards the corner
      }
      env.polyPartial(pts, clamp((env.lt - 0.4 - q * 0.22) / 0.5), col, lw, out * 0.85, false);
    }
    // one thread let down, with something small at the end of it
    if (!low) {
      const a = ends[2], hx = ox + a[0] * a[2] * 0.7, hy = oy + a[1] * a[2] * 0.7, tl = u * 0.16 * E.inOutSine(clamp((env.lt - 1.4) / 2.6)) * out;
      if (tl > 2 && !overlaps(bb, hx, hy, hx, hy + tl, u * 0.03)) {
        const wob = Math.sin(env.ltb * 1.4) * u * 0.004;
        env.line([[hx, hy], [hx + wob, hy + tl]], col, lw, out, false);
        env.circle(hx + wob, hy + tl, u * 0.005, col, null, 0, out, false);
      }
    }
  },
});

/* old film: hairline scratches that stay for a few frames, and dirt that jumps around the edges */
regD('hzFilmDirt', {
  name: '古いフィルムの傷', en: 'Film Dirt', tags: TAGS.concat(['glitch', 'editorial']), w: 0.9, layer: 'front', subtle: true, ae: 'slash',
  draw(env, bb0, Pd) {
    if (env.pass !== 'main') return;
    const bb = center(env, bb0), { W, H, sc } = env, s = Pd.seed | 0, u = U(env), st = env.step;
    const k = E.outCubic(clamp(env.lt / 0.3)) * (1 - E.inCubic(env.pOut)); if (k <= 0) return;
    const col = sc.fg, lw = Math.max(1, u * 0.0014), pd = u * 0.02;
    for (let i = 0; i < 2 + (Pd.n | 0); i++) {
      const run = (st + i * 5) >> 3; if (J.r(s, i, run, 1) < 0.35) continue;
      const x = W * J.r(s, i, run, 2) + J.rs(s, i, st, 3) * u * 0.003, a = 0.3 * k * (0.5 + 0.5 * J.r(s, i, st, 4));
      const y0 = H * J.r(s, i, run, 5) * 0.3, y1 = H * (0.7 + 0.3 * J.r(s, i, run, 6));
      if (x > bb.x0 - pd && x < bb.x1 + pd) {    // never across the words
        if (bb.y0 - pd > y0) env.line([[x, y0], [x, bb.y0 - pd]], col, lw, a, false);
        if (y1 > bb.y1 + pd) env.line([[x, bb.y1 + pd], [x, y1]], col, lw, a, false);
      } else env.line([[x, y0], [x, y1]], col, lw, a, false);
    }
    const n = 6 + (Pd.n | 0) * 3, q = st >> 1;
    for (let i = 0; i < n; i++) {
      const x = W * J.r(s, i, q, 7), y = H * J.r(s, i, q, 8); if (overlaps(bb, x, y, x, y, u * 0.035)) continue;
      const r = u * J.rr(0.0015, 0.006, s, i, q, 9), a = 0.55 * k;
      if (i % 3 === 0) { const an = J.r(s, i, q, 10) * TAU, l = r * 5; env.line([[x, y], [x + Math.cos(an) * l, y + Math.sin(an) * l], [x + Math.cos(an + 0.7) * l * 1.6, y + Math.sin(an + 0.7) * l * 1.6]], col, lw, a, false); }
      else env.circle(x, y, r, col, null, 0, a, false);
    }
  },
});

/* ================================================================== BACKGROUNDS */

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
/* light is hard to see on a bright scheme: push it a little there */
const glowK = sc => (isDark(sc.bg) ? 1 : 2.3);
const regB = (k, d) => J.register('bg', k, Object.assign({}, d, { draw(env, Pm) { const ctx = env.ctx; ctx.save(); try { d.draw(env, Pm || {}, ctx); } finally { ctx.restore(); } } }), P);
const vign = (env, ctx, a, r0 = 0.3) => {
  const { W, H, sc } = env, dk = nightC(sc);
  const v = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * r0, W / 2, H / 2, Math.hypot(W, H) * 0.62);
  v.addColorStop(0, J.rgba(dk, 0)); v.addColorStop(1, J.rgba(dk, a.toFixed(3)));
  ctx.globalAlpha = 1; ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
};

/* banks of fog sliding past each other at different heights and speeds */
regB('hzFogBanks', {
  name: '流れる霧', en: 'Drifting Fog', tags: TAGS.concat(['calm', 'emotional']), w: 1, subtle: true,
  plan: rng => ({ seed: rng.int(1, 1e9), n: rng.int(4, 6), sp: rng.range(0.6, 1.3), a: rng.range(0.1, 0.15) }),
  draw(env, Pm, ctx) {
    const { W, H, sc } = env, t = env.t, u = U(env), s = Pm.seed | 0, fi = E.outCubic(clamp(bgT(env) / 1));
    const fog = isDark(sc.bg) ? J.mix(sc.bg, sc.fg, 0.65) : J.mix(sc.bg, sc.fg, 0.6), a0 = (Pm.a || 0.12) * fi * (isDark(sc.bg) ? 1 : 1.5);
    for (let i = 0; i < (Pm.n || 5); i++) for (let j = 0; j < 2; j++) {
      const rx = W * J.rr(0.4, 0.75, s, i, j, 2), ry = u * J.rr(0.06, 0.15, s, i, 3), y = H * (0.1 + 0.85 * J.r(s, i, 1)) + Math.sin(t * 0.13 + i * 2) * u * 0.02;
      const v = J.rr(0.01, 0.028, s, i, 4) * (i % 2 ? -1 : 1) * (Pm.sp || 1), span = W + rx * 2, x = wrap(W * J.r(s, i, j, 5) * 2 + t * v * W + j * span / 2, span) - rx;
      ctx.save(); ctx.translate(x, y); ctx.scale(1, ry / rx);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx), br = 0.75 + 0.25 * Math.sin(t * 0.21 + i + j);
      g.addColorStop(0, J.rgba(fog, (a0 * br).toFixed(3))); g.addColorStop(0.6, J.rgba(fog, (a0 * br * 0.42).toFixed(3))); g.addColorStop(1, J.rgba(fog, 0));
      ctx.fillStyle = g; ctx.fillRect(-rx, -rx, rx * 2, rx * 2); ctx.restore();
    }
    const g2 = ctx.createLinearGradient(0, H * 0.6, 0, H);
    g2.addColorStop(0, J.rgba(fog, 0)); g2.addColorStop(1, J.rgba(fog, (a0 * 0.9).toFixed(3)));
    ctx.fillStyle = g2; ctx.fillRect(0, H * 0.6, W, H * 0.4);
    vign(env, ctx, 0.4 * fi);
  } });

/* one hanging light swinging slowly: its cone sweeps the room and the dark follows it */
regB('hzSwingLight', {
  name: '揺れる灯り', en: 'Swinging Light', tags: TAGS.concat(['emotional']), w: 0.9,
  plan: rng => ({ seed: rng.int(1, 1e9), x: rng.range(0.38, 0.62), amp: rng.range(11, 18), w: rng.range(0.55, 0.85), half: rng.range(13, 18) }),
  draw(env, Pm, ctx) {
    const { W, H, sc } = env, t = env.t, u = U(env), s = Pm.seed | 0, fi = E.outCubic(clamp(bgT(env) / 0.8));
    const th = (Pm.amp || 14) * DEG * Math.sin(t * (Pm.w || 0.7) + J.r(s, 1) * 6) * (0.35 + 0.65 * (env.fx.motion ?? 0.7));
    const px = W * (Pm.x || 0.5), py = -u * 0.04, Ll = Math.hypot(W, H) * 1.1, hw = Math.tan((Pm.half || 15) * DEG) * Ll, lv = lamp(t, s, 0.5) * fi;
    const L = glowC(sc), dk = isDark(sc.bg) ? nightC(sc) : J.mix(sc.bg, '#000000', 0.55);
    const cone = () => { ctx.moveTo(-u * 0.02, 0); ctx.lineTo(u * 0.02, 0); ctx.lineTo(hw, Ll); ctx.lineTo(-hw, Ll); ctx.closePath(); };
    ctx.save(); ctx.translate(px, py); ctx.rotate(-th);
    ctx.fillStyle = dk; ctx.globalAlpha = (isDark(sc.bg) ? 0.5 : 0.2) * fi; ctx.beginPath(); ctx.rect(-Ll * 2, -Ll, Ll * 4, Ll * 3); cone(); ctx.fill('evenodd');
    const g = ctx.createLinearGradient(0, 0, 0, Ll);
    g.addColorStop(0, J.rgba(L, (0.17 * lv).toFixed(3))); g.addColorStop(0.5, J.rgba(L, (0.06 * lv).toFixed(3))); g.addColorStop(1, J.rgba(L, 0));
    ctx.globalAlpha = 1; ctx.fillStyle = g; ctx.beginPath(); cone(); ctx.fill();
    // cord and shade
    ctx.fillStyle = dimC(sc, 0.4); ctx.globalAlpha = fi;
    ctx.beginPath(); ctx.moveTo(-u * 0.012, u * 0.075); ctx.lineTo(u * 0.012, u * 0.075); ctx.lineTo(u * 0.04, u * 0.105); ctx.lineTo(-u * 0.04, u * 0.105); ctx.closePath(); ctx.fill();
    ctx.fillRect(-u * 0.0015, 0, u * 0.003, u * 0.075);
    ctx.restore();
    const fx = px + Math.tan(th) * (H * 0.94 - py);
    ctx.save(); ctx.translate(fx, H * 0.94); ctx.scale(1, 0.14);
    const g2 = ctx.createRadialGradient(0, 0, 0, 0, 0, u * 0.5);
    g2.addColorStop(0, J.rgba(L, (0.14 * lv).toFixed(3))); g2.addColorStop(1, J.rgba(L, 0));
    ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(0, 0, u * 0.5, 0, TAU); ctx.fill(); ctx.restore();
  } });

/* a row of houses far away: their windows go dark one after another until a single one is left, and then that one too */
regB('hzFarWindows', {
  name: '消える窓明かり', en: 'Windows Going Out', tags: TAGS.concat(['calm', 'emotional']), w: 0.9, subtle: true,
  plan: rng => ({ seed: rng.int(1, 1e9), n: rng.int(6, 9), per: rng.range(20, 28), keep: rng.int(0, 8) }),
  draw(env, Pm, ctx) {
    const { W, H, sc } = env, u = U(env), s = Pm.seed | 0, t = bgT(env), fi = E.outCubic(clamp(t / 0.8)), per = Pm.per || 24, cyc = wrap(t, per), st = Math.floor(env.t * 24);
    const n = Pm.n || 7, hc = isDark(sc.bg) ? J.mix(sc.bg, sc.fg, 0.075) : J.mix(sc.bg, '#000000', 0.16), wc = isDark(sc.bg) ? J.mix(sc.fg, sc.accent, 0.2) : J.mix(sc.bg, '#FFFFFF', 0.7);
    const g = ctx.createLinearGradient(0, H * 0.55, 0, H);
    g.addColorStop(0, J.rgba(hc, 0)); g.addColorStop(1, J.rgba(hc, (0.5 * fi).toFixed(3)));
    ctx.fillStyle = g; ctx.fillRect(0, H * 0.55, W, H * 0.45);
    const keep = (Pm.keep | 0) % n;
    for (let i = 0; i < n; i++) {
      const w = (W / n) * J.rr(0.72, 1.02, s, i, 1), x = W * (i / n) + J.rs(s, i, 2) * W * 0.012, h = u * J.rr(0.11, 0.27, s, i, 3), y = H - h * fi;
      ctx.globalAlpha = 1; ctx.fillStyle = hc; ctx.fillRect(x, y, w, h + 2);
      if (J.r(s, i, 4) < 0.6) { ctx.beginPath(); ctx.moveTo(x - w * 0.04, y + 1); ctx.lineTo(x + w / 2, y - h * J.rr(0.18, 0.34, s, i, 5)); ctx.lineTo(x + w * 1.04, y + 1); ctx.closePath(); ctx.fill(); }
      const nw = 1 + (J.h(s, i, 6) % 3), ww = Math.min(w * 0.14, u * 0.022), wh = ww * 1.3;
      for (let j = 0; j < nw; j++) {
        const last = i === keep && j === 0, off = last ? per * 0.9 : per * (0.1 + 0.68 * J.r(s, i, j, 7));
        let a = clamp((cyc - J.r(s, i, j, 8) * 0.8) / 0.4);
        if (cyc > off) a = 0; else if (cyc > off - 0.4 && J.r(s, i, j, st, 9) < 0.5) a *= 0.25;
        if (last && cyc > per * 0.74 && J.r(s, st >> 1, 10) < 0.3) a *= 0.3;         // the last one hesitates
        if (a <= 0.01) continue;
        const wx = x + w * (0.18 + 0.64 * (nw === 1 ? 0.5 : j / (nw - 1))) - ww / 2, wy = y + h * J.rr(0.22, 0.55, s, i, j, 11);
        ctx.globalAlpha = 0.62 * a * fi; ctx.fillStyle = wc; ctx.fillRect(wx, wy, ww, wh);
      }
    }
    vign(env, ctx, 0.3 * fi, 0.36);
  } });

/* car lights from the street: a window-shaped patch of light slides across the wall, stretches and is gone; then nothing for a while */
regB('hzHeadlights', {
  name: '通り過ぎる光', en: 'Passing Headlights', tags: TAGS.concat(['calm', 'emotional']), w: 0.9, subtle: true,
  plan: rng => ({ seed: rng.int(1, 1e9), per: rng.range(6.5, 9.5), y: rng.range(0.34, 0.5), dir: rng.pick([-1, 1]), a: rng.range(0.1, 0.15), cols: rng.int(2, 3) }),
  draw(env, Pm, ctx) {
    const { W, H, sc } = env, u = U(env), t = bgT(env), fi = E.outCubic(clamp(t / 0.6)), per = Pm.per || 8, D = 3.3, dir = Pm.dir || 1;
    const L = glowC(sc), cols = Pm.cols || 2, yc = H * (Pm.y || 0.42);
    if (!isDark(sc.bg)) { ctx.fillStyle = J.mix(sc.bg, '#000000', 0.5); ctx.globalAlpha = 0.2 * fi; ctx.fillRect(0, 0, W, H); }
    for (let q = 0; q < 2; q++) {
      const p = (wrap(t + 0.3, per) - q * 0.42) / D; if (p <= 0 || p >= 1) continue;
      const pe = dir > 0 ? p : 1 - p, xc = lerp(-u * 0.55, W + u * 0.55, pe), sk = lerp(-0.85, 0.85, pe), wv = u * 0.46 * (0.8 + 0.45 * Math.sin(Math.PI * p)), hv = u * 0.4, gp = u * 0.014;
      ctx.fillStyle = L; ctx.globalAlpha = Math.min(0.5, Math.pow(Math.sin(Math.PI * p), 0.7) * (Pm.a || 0.12) * (q ? 0.45 : 1) * fi * glowK(sc));
      ctx.beginPath();
      for (let c = 0; c < cols; c++) for (let r = 0; r < 2; r++) {
        const lx0 = -wv / 2 + (wv / cols) * c + gp / 2, lx1 = -wv / 2 + (wv / cols) * (c + 1) - gp / 2, ly0 = -hv / 2 + (hv / 2) * r + gp / 2, ly1 = -hv / 2 + (hv / 2) * (r + 1) - gp / 2;
        ctx.moveTo(xc + lx0 + sk * ly0, yc + ly0); ctx.lineTo(xc + lx1 + sk * ly0, yc + ly0); ctx.lineTo(xc + lx1 + sk * ly1, yc + ly1); ctx.lineTo(xc + lx0 + sk * ly1, yc + ly1); ctx.closePath();
      }
      ctx.fill();
    }
    vign(env, ctx, 0.42 * fi);
  } });

/* a corridor of ceiling lights: they die one by one from the far end towards you, the dark holds, then they all come back */
regB('hzHallLights', {
  name: '消えていく照明', en: 'Lights Going Out', tags: TAGS.concat(['graphic', 'emotional']), w: 0.9,
  plan: rng => ({ seed: rng.int(1, 1e9), vx: rng.range(0.42, 0.58), n: rng.int(7, 9), per: rng.range(12, 16) }),
  draw(env, Pm, ctx) {
    const { W, H, sc } = env, u = U(env), s = Pm.seed | 0, t = bgT(env), fi = E.outCubic(clamp(t / 0.7)), per = Pm.per || 14, cyc = wrap(t, per), st = Math.floor(env.t * 24);
    const vx = W * (Pm.vx || 0.5), vy = H * 0.47, n = Pm.n || 8, L = glowC(sc), col = dimC(sc, 0.2);
    const sK = k => 1 / (1 + k * 0.62), far = sK(n);
    if (!isDark(sc.bg)) { ctx.fillStyle = J.mix(sc.bg, '#000000', 0.5); ctx.globalAlpha = 0.2 * fi; ctx.fillRect(0, 0, W, H); }
    ctx.strokeStyle = col; ctx.lineWidth = Math.max(1.2, u * 0.0024); ctx.globalAlpha = 0.8 * fi; ctx.beginPath();
    for (const [cx, cy] of [[0, 0], [W, 0], [W, H], [0, H]]) { ctx.moveTo(cx, cy); ctx.lineTo(vx + (cx - vx) * far, vy + (cy - vy) * far); }
    ctx.rect(vx - vx * far, vy - vy * far, W * far, H * far); ctx.stroke();
    const dtt = per * 0.55 / n;
    for (let k = n - 1; k >= 0; k--) {
      const z = sK(k), y = vy - (vy - H * 0.035) * z, fy = vy + (H * 0.985 - vy) * z, hw = W * 0.15 * z, hh = Math.max(1.5, u * 0.014 * z);
      const off = per * 0.14 + (n - 1 - k) * dtt;
      let on = 1;
      if (cyc > per * 0.9) on = J.r(s, k, st, 1) < 0.25 + 0.75 * (cyc - per * 0.9) / (per * 0.1) ? 1 : 0.1;
      else if (cyc > off) on = 0; else if (cyc > off - 0.45) on = J.r(s, k, st, 2) < 0.5 ? 1 : 0.15;
      ctx.globalAlpha = fi; ctx.strokeStyle = col; ctx.lineWidth = Math.max(1, u * 0.002 * Math.sqrt(z)); ctx.strokeRect(vx - hw, y - hh, hw * 2, hh * 2);
      if (on <= 0.01) continue;
      const za = Math.pow(z, 0.35) * on * fi * (isDark(sc.bg) ? 1 : 1.7);
      ctx.globalAlpha = 0.5 * za; ctx.fillStyle = L; ctx.fillRect(vx - hw, y - hh, hw * 2, hh * 2);
      for (const [yy, a, ry] of [[y + hh, 0.16, 0.5], [fy, 0.09, 0.22]]) {
        ctx.save(); ctx.translate(vx, yy); ctx.scale(1, ry);
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, hw * 1.9);
        g.addColorStop(0, J.rgba(L, (a * za).toFixed(3))); g.addColorStop(1, J.rgba(L, 0));
        ctx.globalAlpha = 1; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, hw * 1.9, 0, TAU); ctx.fill(); ctx.restore();
      }
    }
    vign(env, ctx, 0.5 * fi, 0.25);
  } });

/* power lines at dusk: sagging wires between two poles, and the small dark shapes sitting on them leave one at a time */
regB('hzWires', {
  name: 'たるんだ電線', en: 'Sagging Wires', tags: TAGS.concat(['calm', 'emotional']), w: 0.8, subtle: true,
  plan: rng => ({ seed: rng.int(1, 1e9), n: rng.int(3, 4), birds: rng.int(5, 8), per: rng.range(20, 28), x1: rng.range(0.1, 0.2), x2: rng.range(0.74, 0.86), y: rng.range(0.16, 0.26) }),
  draw(env, Pm, ctx) {
    const { W, H, sc } = env, u = U(env), s = Pm.seed | 0, tt = env.t, t = bgT(env), fi = E.outCubic(clamp(t / 0.8)), per = Pm.per || 24, cyc = wrap(t, per);
    const col = isDark(sc.bg) ? J.mix(sc.bg, sc.fg, 0.2) : J.mix(sc.bg, '#000000', 0.3), lw = Math.max(1.2, u * 0.0022);
    const g = ctx.createLinearGradient(0, H * 0.5, 0, H);
    g.addColorStop(0, J.rgba(sc.accent, 0)); g.addColorStop(1, J.rgba(sc.accent, (0.07 * fi).toFixed(3)));
    ctx.fillStyle = g; ctx.fillRect(0, H * 0.5, W, H * 0.5);
    const xa = W * (Pm.x1 || 0.15), xb = W * (Pm.x2 || 0.8), ya = H * (Pm.y || 0.2), yb = ya + H * 0.05, n = Pm.n || 3, gapW = u * 0.034;
    ctx.strokeStyle = col; ctx.fillStyle = col; ctx.globalAlpha = fi; ctx.lineCap = 'round';
    for (const [x, y, k] of [[xa, ya, 1], [xb, yb, 0.82]]) {
      ctx.lineWidth = u * 0.009 * k; ctx.beginPath(); ctx.moveTo(x, H + 4); ctx.lineTo(x, y - u * 0.04 * k); ctx.stroke();
      ctx.lineWidth = u * 0.005 * k; ctx.beginPath(); ctx.moveTo(x - u * 0.07 * k, y); ctx.lineTo(x + u * 0.07 * k, y); ctx.moveTo(x - u * 0.05 * k, y + gapW * 1.6 * k); ctx.lineTo(x + u * 0.05 * k, y + gapW * 1.6 * k); ctx.stroke();
    }
    const wires = [];
    ctx.lineWidth = lw; ctx.beginPath();
    for (let k = 0; k < n; k++) {
      const ox = (k - (n - 1) / 2) * gapW * 1.3, oy = (k % 2) * gapW * 1.6, sag = u * (0.07 + 0.025 * k) * (1 + 0.07 * Math.sin(tt * 0.5 + k * 1.7)), sw = Math.sin(tt * 0.37 + k) * u * 0.006;
      const p0 = [xa + ox, ya + oy], p1 = [xb + ox * 0.82, yb + oy * 0.82], c = [(p0[0] + p1[0]) / 2 + sw, (p0[1] + p1[1]) / 2 + sag * 2];
      wires.push([p0, c, p1]);
      ctx.moveTo(-W * 0.25, p0[1] - H * 0.02); ctx.quadraticCurveTo((p0[0] - W * 0.25) / 2, p0[1] + sag * 1.2, p0[0], p0[1]);
      ctx.quadraticCurveTo(c[0], c[1], p1[0], p1[1]);
      ctx.quadraticCurveTo((p1[0] + W * 1.3) / 2, p1[1] + sag * 1.4, W * 1.3, p1[1] + H * 0.03);
    }
    ctx.stroke();
    // the shapes on the wire: fewer every time you look
    const nb = Pm.birds || 6;
    for (let b = 0; b < nb; b++) {
      const last = b === 0, off = last ? per * 0.92 : per * (0.12 + 0.66 * J.r(s, b, 1));
      const a = clamp((cyc - J.r(s, b, 2) * 0.6) / 0.3) * (cyc > off ? 0 : 1); if (a <= 0) continue;
      const w = wires[J.h(s, b, 3) % Math.min(2, wires.length)], f = last ? 0.5 + J.rs(s, 9) * 0.1 : 0.12 + 0.76 * J.r(s, b, 4), q = 1 - f;
      const x = q * q * w[0][0] + 2 * q * f * w[1][0] + f * f * w[2][0], y = q * q * w[0][1] + 2 * q * f * w[1][1] + f * f * w[2][1], r = u * 0.009;
      ctx.globalAlpha = a * fi; ctx.beginPath(); ctx.ellipse(x, y - r * 1.05, r * 0.75, r * 1.15, 0, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(x + (b % 2 ? 1 : -1) * r * 0.3, y - r * 2.3, r * 0.5, 0, TAU); ctx.fill();
    }
    vign(env, ctx, 0.3 * fi, 0.38);
  } });
})();
