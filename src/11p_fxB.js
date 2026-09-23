/* JIZURA pack: fxB — more post-processing / accent effects: lens, print, film, glitch and manga-style overlays */
(() => {
'use strict';
const E = J.E;
const PK = 'fxB';
const DEG = J.DEG, TAU = J.TAU, clamp = J.clamp;

/* ================= helpers ================= */
const isDark = c => J.lum(c) < 0.45;
const bell = k => Math.sin(Math.PI * clamp(k));
const evS = ev => J.h(Math.round(ev.t * 1000), 9127);
const ampOf = ev => clamp(ev.amp ?? 1, 0.3, 1.6);
// attack (0..a) → hold → release (b..1)
const ahr = (k, a, b, inE = E.outCubic, outE = E.inCubic) => (k < a ? inE(k / a) : k > b ? 1 - outE((k - b) / Math.max(1e-3, 1 - b)) : 1);
const hueD = (a, b) => { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; };
const lightest = list => list.filter(Boolean).reduce((a, b) => (J.lum(b) > J.lum(a) ? b : a));
const darkest = list => list.filter(Boolean).reduce((a, b) => (J.lum(b) < J.lum(a) ? b : a));
// the most colourful scheme colour (falls back to a cool blue for monochrome schemes)
const vivid = (sc, fb = '#4FB8FF') => {
  let best = null, bv = 0.18;
  for (const c of [sc.accent, sc.accent2, sc.ghostA, sc.ghostB, sc.fg]) {
    if (!c) continue; const [, s, l] = J.toHsl(c), v = s * (1 - Math.abs(l - 0.55) * 1.1);
    if (v > bv) { bv = v; best = c; }
  }
  return best || fb;
};
// two hues for a duotone: the scheme's most colourful hue + a clearly different second one
const huePair = sc => {
  const cs = [sc.accent, sc.accent2, sc.ghostA, sc.ghostB, sc.fg, sc.bg].filter(Boolean)
    .map(c => { const [h, s, l] = J.toHsl(c); return { h, v: s * (1 - Math.abs(l - 0.5) * 1.2) }; }).sort((p, q) => q.v - p.v);
  if (!cs.length || cs[0].v < 0.15) return [330, 195];
  const B = cs.find(p => p.v > 0.15 && hueD(p.h, cs[0].h) > 50);
  return [cs[0].h, B ? B.h : cs[0].h + 170];
};

// module-level offscreen buffers (created once, resized only when the output size changes)
const BUF = [];
const buf = (i, w, h) => {
  w = Math.max(1, w | 0); h = Math.max(1, h | 0);
  let c = BUF[i];
  if (!c) { c = document.createElement('canvas'); BUF[i] = c; }
  if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
  return c;
};
const cx2 = c => { const x = c.getContext('2d'); x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over'; x.filter = 'none'; x.imageSmoothingEnabled = true; return x; };
// |frame - bg| as a grey mask: ink bright on black (dark schemes) or ink dark on white (light schemes)
const greyMask = (T, S, sc, w, h, dk) => {
  const x = cx2(T);
  x.globalCompositeOperation = 'copy'; x.drawImage(S, 0, 0, w, h);
  x.globalCompositeOperation = 'difference'; x.fillStyle = sc.bg; x.fillRect(0, 0, w, h);
  x.globalCompositeOperation = 'saturation'; x.fillStyle = '#808080'; x.fillRect(0, 0, w, h);
  if (!dk) { x.globalCompositeOperation = 'difference'; x.fillStyle = '#ffffff'; x.fillRect(0, 0, w, h); }
  return T;
};
// the grey mask tinted `col` (add it with 'screen' on dark schemes, 'multiply' on light ones)
const tintMask = (T, M, col, dk) => {
  const x = cx2(T), w = T.width, h = T.height;
  x.globalCompositeOperation = 'copy'; x.drawImage(M, 0, 0);
  x.globalCompositeOperation = dk ? 'multiply' : 'screen'; x.fillStyle = col; x.fillRect(0, 0, w, h);
  return T;
};
// draw `img` scaled by s around (cx, cy)
const drawScaled = (ctx, img, s, cx, cy, cw, ch) => ctx.drawImage(img, 0, 0, img.width, img.height, cx - cx * s, cy - cy * s, cw * s, ch * s);

const fx = (k, d) => J.register('fx', k, Object.assign({}, d, {
  draw(ctx, ev, k2, I) { ctx.save(); try { d.draw(ctx, ev, clamp(k2), I); } finally { ctx.restore(); } },
}), PK);

/* ================= lens / optics ================= */
fx('radialChroma', { name: '放射色収差', tags: ['glitch', 'emotional', 'pop'], w: 0.9, dur: 4, amp: 1, mid: true, scratch: true, ae: 'chroma',
  draw(ctx, ev, k, I) {
    const { cw, ch, S, sc } = I; if (!S) return;
    const dk = isDark(sc.bg), s = evS(ev);
    const d = (0.03 + 0.016 * J.r(s, 1)) * ampOf(ev) * (0.4 + 0.6 * E.outQuad(k)) * (k > 0.8 ? 1 - (k - 0.8) * 2.5 : 1);
    const w = Math.max(2, Math.round(cw / 3)), h = Math.max(2, Math.round(ch / 3));
    const M = greyMask(buf(0, w, h), S, sc, w, h, dk), R = tintMask(buf(1, w, h), M, '#FF3020', dk), C = tintMask(buf(2, w, h), M, '#18E0FF', dk);
    const cx = cw / 2, cy = ch / 2;
    ctx.globalCompositeOperation = dk ? 'screen' : 'multiply';
    ctx.globalAlpha = 0.95; drawScaled(ctx, R, 1 + d, cx, cy, cw, ch); drawScaled(ctx, C, 1 - d * 0.7, cx, cy, cw, ch);
    ctx.globalAlpha = 0.45; drawScaled(ctx, R, 1 + d * 2.2, cx, cy, cw, ch);
  } });

fx('bloomFlash', { name: 'ブルーム', tags: ['pop', 'emotional', 'calm'], w: 1, dur: 6, amp: 1, mid: true, scratch: true, ae: 'flash',
  draw(ctx, ev, k, I) {
    const { cw, ch, S, sc } = I; if (!S) return;
    const a = clamp(ampOf(ev), 0.5, 1.3) * (k < 0.12 ? E.outCubic(k / 0.12) : Math.pow(1 - (k - 0.12) / 0.88, 1.5));
    if (a < 0.02) return;
    const dk = isDark(sc.bg);
    const w1 = Math.max(4, Math.round(cw / 6)), h1 = Math.max(4, Math.round(ch / 6)), w2 = Math.max(2, Math.round(cw / 24)), h2 = Math.max(2, Math.round(ch / 24));
    const T1 = buf(0, w1, h1), x1 = cx2(T1);
    x1.globalCompositeOperation = 'copy'; if (I.allowFilter) x1.filter = `blur(${Math.max(1, w1 / 220).toFixed(1)}px)`; x1.drawImage(S, 0, 0, w1, h1); x1.filter = 'none';
    const T2 = buf(1, w2, h2), x2 = cx2(T2);
    x2.globalCompositeOperation = 'copy'; if (I.allowFilter) x2.filter = 'blur(1.5px)'; x2.drawImage(T1, 0, 0, w2, h2); x2.filter = 'none';
    const cx = cw / 2, cy = ch / 2;
    if (dk) {
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = a; ctx.drawImage(T1, 0, 0, cw, ch);
      ctx.globalAlpha = Math.min(1, a * 1.25); drawScaled(ctx, T2, 1.05, cx, cy, cw, ch);
      ctx.globalAlpha = 1; ctx.fillStyle = J.rgba(sc.fg, (0.1 * a).toFixed(3)); ctx.fillRect(0, 0, cw, ch);
    } else {
      // light schemes: over-exposure — the bright paper blooms over the ink, everything lifts towards white
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = 0.75 * a; ctx.drawImage(T1, 0, 0, cw, ch);
      ctx.globalAlpha = 0.5 * a; drawScaled(ctx, T2, 1.04, cx, cy, cw, ch);
    }
  } });

// separable lens warp: columns then rows, piecewise-linear strips (no seams)
fx('bulge', { name: '魚眼', tags: ['pop', 'graphic', 'glitch'], w: 0.8, dur: 5, amp: 1, mid: true, scratch: true, ae: 'zoom',
  draw(ctx, ev, k, I) {
    const { cw, ch, S } = I; if (!S) return;
    const s = evS(ev), pinch = J.r(s, 1) < 0.25;
    const amt = k < 0.3 ? E.outCubic(k / 0.3) : 1 - E.inOutCubic((k - 0.3) / 0.7);
    const A = clamp((pinch ? -0.26 : 0.27) * clamp(ampOf(ev), 0.5, 1.35) * amt, -0.36, 0.38);
    if (Math.abs(A) < 0.004) return;
    const cx = cw * (0.5 + J.rs(s, 2) * 0.05), cy = ch * (0.5 + J.rs(s, 3) * 0.04);
    const g = u => u * (1 - A * (1 - u * u));
    const map = (u, c, L) => c + u * (u < 0 ? c : L - c);
    const N = 40, T = buf(0, cw, ch), x = cx2(T);
    x.clearRect(0, 0, cw, ch);
    let p = 0, ps = 0;
    for (let i = 1; i <= N; i++) {
      const u = -1 + 2 * i / N, d = i === N ? cw : Math.round(map(u, cx, cw)), sx = i === N ? cw : map(g(u), cx, cw);
      if (d > p && sx > ps) x.drawImage(S, ps, 0, sx - ps, ch, p, 0, d - p, ch);
      p = d; ps = sx;
    }
    ctx.clearRect(0, 0, cw, ch);
    p = 0; ps = 0;
    for (let i = 1; i <= N; i++) {
      const u = -1 + 2 * i / N, d = i === N ? ch : Math.round(map(u, cy, ch)), sy = i === N ? ch : map(g(u), cy, ch);
      if (d > p && sy > ps) ctx.drawImage(T, 0, ps, cw, sy - ps, 0, p, cw, d - p);
      p = d; ps = sy;
    }
  } });

/* ================= glitch ================= */
// vertical "melt": runs of columns whose window is stretched down (or up), coherent via smooth noise
fx('pixelSort', { name: 'ピクセルソート', tags: ['glitch'], w: 0.8, dur: 3, amp: 1, glitchy: true, mid: true, scratch: true, ae: 'slice',
  draw(ctx, ev, k, I) {
    const { cw, ch, S } = I; if (!S) return;
    const a = ampOf(ev), s = evS(ev), st = I.step * 19 + s, up = J.r(s, 1) < 0.3;
    const xa = cw * J.rr(0.02, 0.35, st, 1), xb = Math.min(cw, xa + cw * J.rr(0.4, 0.7, st, 2));
    let x = Math.round(xa), i = 0;
    while (x < xb && i < 200) {
      const wr = Math.max(1, Math.round(cw * J.rr(0.002, 0.009, st, i, 3)));
      const on = J.noise1(x / cw * 9, st + 5) > -0.25 && J.r(st, i, 4) < 0.85;
      if (on) {
        const n1 = J.noise1(x / cw * 7, st + 9) * 0.5 + 0.5, n2 = J.noise1(x / cw * 23, st + 13) * 0.5 + 0.5;
        const win = ch * (0.08 + 0.12 * n1), str = 1 + (0.5 + 2 * n2) * a;
        if (!up) { const y0 = ch * (0.36 + 0.12 * n2), dh = Math.min(ch - y0, win * str); ctx.drawImage(S, x, y0, wr, win, x, y0, wr, dh); }
        else { const y1 = ch * (0.64 - 0.12 * n2), dh = Math.min(y1, win * str); ctx.drawImage(S, x, y1 - win, wr, win, x, y1 - dh, wr, dh); }
      }
      x += wr; i++;
    }
  } });

const ROWS = new Map();
const rowTile = L => {
  let t = ROWS.get(L); if (t) return t;
  t = document.createElement('canvas'); t.width = 1; t.height = 2 * L;
  const x = t.getContext('2d'); x.fillStyle = '#000'; x.fillRect(0, 0, 1, L);
  ROWS.set(L, t); return t;
};
fx('interlace', { name: 'インターレース', tags: ['glitch', 'emotional'], w: 0.7, dur: 3, amp: 1, glitchy: true, mid: true, scratch: true, ae: 'slice',
  draw(ctx, ev, k, I) {
    const { cw, ch, S, sc } = I; if (!S) return;
    const a = ampOf(ev), st = I.step * 7 + evS(ev), L = Math.max(1, Math.round(ch / 200));
    const dx = (J.r(st, 1) < 0.5 ? 1 : -1) * cw * (0.012 + 0.02 * J.r(st, 2)) * a * (1 - 0.45 * k);
    ctx.fillStyle = sc.bg; ctx.fillRect(0, 0, cw, ch);
    ctx.drawImage(S, Math.round(-dx * 0.35), 0);
    const T = buf(0, cw, ch), x = cx2(T);
    x.clearRect(0, 0, cw, ch); x.drawImage(S, Math.round(dx), 0);
    x.globalCompositeOperation = 'destination-in';
    const pat = x.createPattern(rowTile(L), 'repeat');
    try { pat.setTransform(new DOMMatrix([1, 0, 0, 1, 0, (I.step % 2) * L])); } catch (e) { /* older engines: no phase */ }
    x.fillStyle = pat; x.fillRect(0, 0, cw, ch);
    ctx.drawImage(T, 0, 0);
  } });

// compression artefacts: grid-aligned blocks go flat, smear down from their top row, quantise or slip
fx('macroBlock', { name: 'ブロックノイズ', tags: ['glitch'], w: 0.8, dur: 3, amp: 1, glitchy: true, mid: true, scratch: true, ae: 'block',
  draw(ctx, ev, k, I) {
    const { cw, ch, S, sc } = I; if (!S) return;
    const a = ampOf(ev), st = I.step * 23 + evS(ev), B = Math.max(6, Math.round(Math.min(cw, ch) / 18));
    const nx = Math.ceil(cw / B), ny = Math.ceil(ch / B), T = buf(3, 3, 3), tx = cx2(T);
    tx.globalCompositeOperation = 'copy';
    const nC = 2 + (J.h(st, 1) % 3);
    for (let c = 0; c < nC; c++) {
      const gw = Math.min(nx, 3 + (J.h(st, c, 2) % 7)), gh = 1 + (J.h(st, c, 3) % 3);
      const i0 = Math.floor(J.r(st, c, 4) * (nx - gw + 1)), j0 = Math.round(ny * (0.38 + 0.24 * J.r(st, c, 5)) - gh / 2);
      for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) {
        const id = i * 16 + j;
        if (J.r(st, c, id, 6) < 0.12) continue;
        const bx = (i0 + i) * B, by = clamp(j0 + j, 0, ny - 1) * B, bw = Math.min(B, cw - bx), bh = Math.min(B, ch - by), m = J.r(st, c, id, 7);
        if (bw < 1 || bh < 1) continue;
        if (m < 0.42) {           // datamosh bleed: the block's top row smeared down 1..3 blocks
          const n = 1 + (J.h(st, c, id, 9) % 3);
          ctx.drawImage(S, bx, by, bw, 1, bx, by, bw, Math.min(ch - by, B * n));
        } else if (m < 0.7) {     // quantised to 3×3 flat cells
          tx.drawImage(S, bx, by, bw, bh, 0, 0, 3, 3);
          ctx.imageSmoothingEnabled = false; ctx.drawImage(T, 0, 0, 3, 3, bx, by, bw, bh); ctx.imageSmoothingEnabled = true;
        } else if (m < 0.9) {     // slipped: copied from a neighbouring block
          const sx = clamp(bx + (J.r(st, c, id, 10) < 0.5 ? -1 : 1) * (1 + (J.h(st, c, id, 12) % 2)) * B, 0, cw - bw);
          ctx.drawImage(S, sx, by, bw, bh, bx, by, bw, bh);
        } else {                  // flat block
          ctx.drawImage(S, Math.min(cw - 1, bx + bw / 2), Math.min(ch - 1, by + bh / 2), 1, 1, bx, by, bw, bh);
        }
        if (m >= 0.42 && J.r(st, c, id, 8) < 0.06 * a) {
          ctx.globalCompositeOperation = 'difference'; ctx.globalAlpha = 0.3;
          ctx.fillStyle = J.r(st, c, id, 11) < 0.5 ? sc.ghostA : sc.ghostB; ctx.fillRect(bx, by, bw, bh);
          ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
        }
      }
    }
  } });

/* ================= print / stylise ================= */
const DOT = new Map();
const dotTile = (c, r) => {
  const key = c + '|' + r; let t = DOT.get(key); if (t) return t;
  t = document.createElement('canvas'); t.width = t.height = c;
  const x = t.getContext('2d'); x.fillStyle = '#000'; x.beginPath();
  for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) { x.moveTo(c / 2 + i * c + r, c / 2 + j * c); x.arc(c / 2 + i * c, c / 2 + j * c, r, 0, TAU); }
  x.fill();
  if (DOT.size > 64) DOT.clear();
  DOT.set(key, t); return t;
};
fx('halftone', { name: '網点', tags: ['pop', 'graphic', 'editorial'], w: 0.9, dur: 5, amp: 1, mid: true, ae: 'mosaic',
  draw(ctx, ev, k, I) {
    const { cw, ch, sc } = I;
    const c = Math.max(5, Math.round(Math.min(cw, ch) / 44)), amt = ahr(k, 0.3, 0.72);
    const r = Math.round(c * J.lerp(0.72, 0.42, amt) * 4) / 4;
    if (r >= c * 0.71) return;
    const pat = ctx.createPattern(dotTile(c, r), 'repeat');
    try { const q = 45 * DEG; pat.setTransform(new DOMMatrix([Math.cos(q), Math.sin(q), -Math.sin(q), Math.cos(q), cw / 2, ch / 2])); } catch (e) { /* unrotated screen */ }
    ctx.globalCompositeOperation = 'destination-in'; ctx.fillStyle = pat; ctx.fillRect(0, 0, cw, ch);
    if (I.opt && I.opt.transparent) return;
    ctx.globalCompositeOperation = 'destination-over'; ctx.fillStyle = J.mix(sc.bg, sc.fg, 0.16); ctx.fillRect(0, 0, cw, ch);
  } });

fx('duotone', { name: 'ダブルトーン', tags: ['pop', 'emotional', 'graphic'], w: 0.8, dur: 4, amp: 1, mid: true, ae: 'chroma',
  draw(ctx, ev, k, I) {
    const { cw, ch, sc } = I, s = evS(ev);
    const a = clamp(ampOf(ev), 0.6, 1) * ahr(k, 0.12, 0.7);
    if (a < 0.02) return;
    let [h1, h2] = huePair(sc); if (J.r(s, 1) < 0.4) [h1, h2] = [h2, h1];
    const dark = J.hsl(h1, 0.8, 0.15), light = J.hsl(h2, 1, 0.76);
    ctx.globalAlpha = a;
    ctx.globalCompositeOperation = 'saturation'; ctx.fillStyle = '#808080'; ctx.fillRect(0, 0, cw, ch);
    ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = light; ctx.fillRect(0, 0, cw, ch);
    ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = dark; ctx.fillRect(0, 0, cw, ch);
  } });

let BAYER = null;
const bayerTile = () => {
  if (BAYER) return BAYER;
  let M = [[0]];
  while (M.length < 8) { const n = M.length, N = []; for (let y = 0; y < 2 * n; y++) { N.push([]); for (let x = 0; x < 2 * n; x++) { const v = 4 * M[y % n][x % n]; N[y].push(v + [[0, 2], [3, 1]][y < n ? 0 : 1][x < n ? 0 : 1]); } } M = N; }
  const c = document.createElement('canvas'); c.width = c.height = 8;
  const x = c.getContext('2d');
  for (let y = 0; y < 8; y++) for (let i = 0; i < 8; i++) { const g = Math.round((M[y][i] + 0.5) / 64 * 127.5); x.fillStyle = `rgb(${g},${g},${g})`; x.fillRect(i, y, 1, 1); }
  BAYER = c; return c;
};
// ordered dither → hard threshold (contrast filter) → mapped to the scheme's darkest / lightest colour
fx('ditherBit', { name: '1bitディザ', tags: ['glitch', 'graphic', 'pop'], w: 0.7, dur: 3, amp: 1, mid: true, scratch: true, ae: 'mosaic',
  draw(ctx, ev, k, I) {
    const { cw, ch, S, sc } = I; if (!S) return;
    const p = Math.max(2, Math.round(ch / 200) * (k < 0.34 ? 2 : 1)), w = Math.ceil(cw / p), h = Math.ceil(ch / p);
    const T = buf(2, w, h), x = cx2(T);
    x.globalCompositeOperation = 'copy'; x.fillStyle = x.createPattern(bayerTile(), 'repeat'); x.fillRect(0, 0, w, h);
    x.globalCompositeOperation = 'lighter'; x.globalAlpha = 0.5; x.drawImage(S, 0, 0, w, h);
    x.globalAlpha = 1; x.globalCompositeOperation = 'saturation'; x.fillStyle = '#808080'; x.fillRect(0, 0, w, h);
    const T2 = buf(3, w, h), y = cx2(T2);
    y.globalCompositeOperation = 'copy'; if (I.allowFilter) y.filter = 'contrast(60)'; y.drawImage(T, 0, 0); y.filter = 'none';
    const c0 = darkest([sc.bg, sc.fg, sc.ink]), c1 = lightest([sc.bg, sc.fg, sc.ink]);
    y.globalCompositeOperation = 'multiply'; y.fillStyle = c1; y.fillRect(0, 0, w, h);
    y.globalCompositeOperation = 'screen'; y.fillStyle = c0; y.fillRect(0, 0, w, h);
    ctx.imageSmoothingEnabled = false; ctx.drawImage(T2, 0, 0, w, h, 0, 0, w * p, h * p); ctx.imageSmoothingEnabled = true;
  } });

/* ================= frame motion ================= */
fx('rotateSnap', { name: '傾きスナップ', tags: ['pop', 'graphic', 'glitch'], w: 0.9, dur: 5, amp: 1, mid: true, scratch: true, ae: 'shake',
  draw(ctx, ev, k, I) {
    const { cw, ch, S, sc } = I; if (!S) return;
    const s = evS(ev), dir = J.r(s, 1) < 0.5 ? 1 : -1;
    // snaps in on the first frame, then a damped spring back to level
    const e = k < 0.12 ? 1 : Math.exp(-4.5 * (k - 0.12)) * Math.cos((k - 0.12) * Math.PI * 2.4);
    const th = dir * (3 + 2 * J.r(s, 2)) * clamp(ampOf(ev), 0.5, 1.3) * e * DEG;
    if (Math.abs(th) < 0.0006) return;
    const c = Math.abs(Math.cos(th)), sn = Math.abs(Math.sin(th));
    const z = Math.max((cw * c + ch * sn) / cw, (cw * sn + ch * c) / ch) * (1 + 0.025 * Math.abs(e));
    ctx.fillStyle = sc.bg; ctx.fillRect(0, 0, cw, ch);
    ctx.translate(cw / 2, ch / 2); ctx.rotate(th); ctx.scale(z, z);
    ctx.drawImage(S, -cw / 2, -ch / 2);
    if (k < 0.12) { ctx.globalAlpha = 0.35; ctx.rotate(-th * 0.45); ctx.drawImage(S, -cw / 2, -ch / 2); }
  } });

// stepped after-images of the frame ('lighten' on dark schemes / 'darken' on light ones keeps the background untouched)
fx('echoFrames', { name: '残像エコー', tags: ['emotional', 'pop', 'glitch'], w: 0.9, dur: 6, amp: 1, mid: true, scratch: true, ae: 'zoom',
  draw(ctx, ev, k, I) {
    const { cw, ch, S, sc } = I; if (!S) return;
    const s = evS(ev), dk = isDark(sc.bg), a = clamp(ampOf(ev), 0.5, 1.3);
    const ang = J.r(s, 1) < 0.65 ? (J.r(s, 2) < 0.5 ? 0 : Math.PI) : (J.r(s, 3) < 0.5 ? 0.25 : 0.75) * Math.PI + (J.r(s, 2) < 0.5 ? 0 : Math.PI);
    const d = Math.min(cw, ch) * (0.02 + 0.035 * E.outCubic(k)) * a, fade = k < 0.1 ? 1 : 1 - E.inQuad((k - 0.1) / 0.9);
    if (fade < 0.02) return;
    ctx.globalCompositeOperation = dk ? 'lighten' : 'darken';
    for (let i = 4; i >= 1; i--) { ctx.globalAlpha = fade * (0.64 - i * 0.12); ctx.drawImage(S, Math.round(Math.cos(ang) * d * i), Math.round(Math.sin(ang) * d * i)); }
  } });

// n mirrored wedges around the centre (true kaleidoscope, not an axis mirror)
fx('kaleido', { name: '万華鏡', tags: ['pop', 'graphic', 'emotional'], w: 0.6, dur: 4, amp: 1, mid: true, scratch: true, ae: 'block',
  draw(ctx, ev, k, I) {
    const { cw, ch, S } = I; if (!S) return;
    const s = evS(ev), n = J.r(s, 1) < 0.5 ? 6 : 8, th = TAU / n, R = Math.hypot(cw, ch);
    const cx = cw / 2, cy = ch / 2, rot = J.r(s, 2) * TAU + k * 0.5 * (J.r(s, 3) < 0.5 ? 1 : -1), src = J.r(s, 4) < 0.5 ? 0 : Math.PI;
    const z = 1.05 + 0.12 * k;
    ctx.globalAlpha = k > 0.75 ? 1 - (k - 0.75) / 0.25 * 0.5 : 1;
    for (let i = 0; i < n; i++) {
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot + i * th); if (i % 2) ctx.scale(1, -1);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, R, -th / 2 - 0.006, th / 2 + 0.006); ctx.closePath(); ctx.clip();
      ctx.rotate(-src); ctx.scale(z, z); ctx.drawImage(S, -cx, -cy);
      ctx.restore();
    }
  } });

/* ================= inversion / light ================= */
fx('bandInvert', { name: '帯反転', tags: ['glitch', 'graphic'], w: 0.7, dur: 3, amp: 1, glitchy: true, mid: true, ae: 'invert',
  draw(ctx, ev, k, I) {
    const { cw, ch } = I, s = evS(ev), st = I.step * 13 + s, n = 2 + (J.h(st, 1) % 4), vert = J.r(s, 2) < 0.22;
    const L = vert ? cw : ch, M = vert ? ch : cw, a = clamp(ampOf(ev), 0.6, 1.3);
    ctx.globalCompositeOperation = 'difference'; ctx.fillStyle = '#ffffff';
    for (let i = 0; i < n; i++) {
      const h = Math.max(2, L * J.rr(0.012, 0.12, st, i, 3) * a), y = Math.round(L * J.rr(0.12, 0.88, st, i, 4) - h / 2);
      const part = J.r(st, i, 5) < 0.35, x0 = part ? M * J.rr(0, 0.5, st, i, 6) : 0, w = part ? M * J.rr(0.25, 0.6, st, i, 7) : M;
      if (vert) ctx.fillRect(y, x0, h, w); else ctx.fillRect(x0, y, w, h);
    }
  } });

fx('lightRays', { name: '光芒', tags: ['emotional', 'pop', 'calm'], w: 0.9, dur: 8, amp: 1, mid: true, ae: 'flash',
  draw(ctx, ev, k, I) {
    const { cw, ch, sc } = I, s = evS(ev), dk = isDark(sc.bg);
    const a = clamp(ampOf(ev), 0.5, 1.2) * Math.pow(bell(k), 0.6) * (0.9 + 0.1 * J.r(I.step, 5));
    if (a < 0.02) return;
    const cx = cw * (0.5 + J.rs(s, 1) * 0.12), cy = ch * (0.42 + J.rs(s, 2) * 0.1), M = Math.min(cw, ch);
    const R = Math.hypot(cw, ch) * (0.4 + 0.6 * E.outCubic(k));
    const n = 12 + (J.h(s, 3) % 8), rot = J.r(s, 4) * TAU + k * 0.22 * (J.r(s, 7) < 0.5 ? 1 : -1);
    const col = dk ? J.mix(sc.fg, '#ffffff', 0.3) : J.mix(vivid(sc), '#ffffff', 0.35);
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
    g.addColorStop(0, J.rgba(col, (0.55 * a).toFixed(3))); g.addColorStop(0.3, J.rgba(col, (0.24 * a).toFixed(3))); g.addColorStop(1, J.rgba(col, 0));
    ctx.globalCompositeOperation = dk ? 'screen' : 'multiply';
    ctx.fillStyle = g; ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const an = rot + i / n * TAU + J.rs(s, i, 5) * 0.12, w = TAU / n * J.rr(0.14, 0.45, s, i, 6);
      ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(an - w / 2) * R, cy + Math.sin(an - w / 2) * R); ctx.lineTo(cx + Math.cos(an + w / 2) * R, cy + Math.sin(an + w / 2) * R); ctx.closePath();
    }
    ctx.fill();
    const g2 = ctx.createRadialGradient(cx, cy, 0, cx, cy, M * 0.3);
    g2.addColorStop(0, J.rgba(col, (0.4 * a).toFixed(3))); g2.addColorStop(1, J.rgba(col, 0));
    ctx.fillStyle = g2; ctx.fillRect(cx - M * 0.3, cy - M * 0.3, M * 0.6, M * 0.6);
  } });

fx('anamorphic', { name: 'アナモフレア', tags: ['emotional', 'pop', 'calm'], w: 0.8, dur: 7, amp: 1, mid: true, ae: 'flash',
  draw(ctx, ev, k, I) {
    const { cw, ch, sc } = I, s = evS(ev), dk = isDark(sc.bg);
    const a = clamp(ampOf(ev), 0.5, 1.2) * Math.pow(bell(k), 0.5) * (0.88 + 0.12 * J.r(I.step, 7));
    if (a < 0.02) return;
    const col = vivid(sc), M = Math.min(cw, ch), dir = J.r(s, 3) < 0.5 ? 1 : -1;
    const y = ch * (0.5 + J.rs(s, 1) * 0.1), x = cw * (0.5 + J.rs(s, 2) * 0.22) + (k - 0.5) * cw * 0.14 * dir;
    const ell = (sx, sy, stops) => {
      ctx.save(); ctx.translate(x, y); ctx.scale(sx, sy);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1); for (const [o, c] of stops) g.addColorStop(o, c);
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 1, 0, TAU); ctx.fill(); ctx.restore();
    };
    if (dk) {
      ctx.globalCompositeOperation = 'screen';
      ell(cw * 0.8, M * 0.05, [[0, J.rgba(col, (0.55 * a).toFixed(3))], [0.4, J.rgba(col, (0.18 * a).toFixed(3))], [1, J.rgba(col, 0)]]);
      ell(cw * 0.62, M * 0.0065, [[0, `rgba(255,255,255,${(0.95 * a).toFixed(3)})`], [0.5, J.rgba(J.mix(col, '#ffffff', 0.5), (0.6 * a).toFixed(3))], [1, J.rgba(col, 0)]]);
      ell(M * 0.07, M * 0.07, [[0, `rgba(255,255,255,${(0.8 * a).toFixed(3)})`], [1, 'rgba(255,255,255,0)']]);
      // lens ghosts along the line through the frame centre
      for (let j = 0; j < 3; j++) {
        const f = [0.55, 1.1, 1.7][j], gx = cw / 2 + (cw / 2 - x) * f, gy = ch / 2 + (ch / 2 - y) * f, r = M * [0.03, 0.06, 0.02][j];
        ctx.fillStyle = J.rgba(col, (0.14 * a).toFixed(3)); ctx.beginPath(); ctx.arc(gx, gy, r, 0, TAU); ctx.fill();
      }
    } else {
      const c2 = J.mix(col, '#ffffff', 0.2);
      ctx.globalCompositeOperation = 'multiply';
      ell(cw * 0.85, M * 0.06, [[0, J.rgba(c2, (0.7 * a).toFixed(3))], [0.45, J.rgba(c2, (0.25 * a).toFixed(3))], [1, J.rgba(c2, 0)]]);
      ell(cw * 0.65, M * 0.008, [[0, J.rgba(col, a.toFixed(3))], [0.6, J.rgba(col, (0.6 * a).toFixed(3))], [1, J.rgba(col, 0)]]);
      ell(M * 0.05, M * 0.05, [[0, J.rgba(col, (0.5 * a).toFixed(3))], [1, J.rgba(col, 0)]]);
    }
  } });

// double heartbeat: a coloured vignette closes in twice with a slight push
fx('heartbeat', { name: '鼓動', tags: ['emotional', 'calm'], w: 0.8, dur: 10, amp: 1, mid: true, scratch: true, ae: 'zoom',
  draw(ctx, ev, k, I) {
    const { cw, ch, S, sc } = I; if (!S) return;
    const pulse = (x, c, w) => { const u = (x - c) / w; return u < 0 || u > 1 ? 0 : u < 0.22 ? E.outCubic(u / 0.22) : 1 - E.inOutCubic((u - 0.22) / 0.78); };
    const p = Math.max(pulse(k, 0, 0.36), 0.8 * pulse(k, 0.44, 0.56)) * clamp(ampOf(ev), 0.5, 1.2);
    if (p < 0.01) return;
    const dk = isDark(sc.bg), M = Math.min(cw, ch), R = Math.hypot(cw, ch) / 2;
    drawScaled(ctx, S, 1 + 0.03 * p, cw / 2, ch / 2, cw, ch);
    const col = dk ? J.mix(vivid(sc), '#000000', 0.1) : J.mix(vivid(sc), '#000000', 0.25);
    const g = ctx.createRadialGradient(cw / 2, ch / 2, M * (0.52 - 0.2 * p), cw / 2, ch / 2, R);
    const pk = dk ? 0.55 : 0.8;
    g.addColorStop(0, J.rgba(col, 0)); g.addColorStop(0.6, J.rgba(col, (0.4 * pk * p).toFixed(3))); g.addColorStop(1, J.rgba(col, (pk * p).toFixed(3)));
    ctx.globalCompositeOperation = dk ? 'screen' : 'multiply';
    ctx.fillStyle = g; ctx.fillRect(0, 0, cw, ch);
  } });

/* ================= film / TV ================= */
let STATIC = null;
const staticTex = () => {
  if (STATIC) return STATIC;
  const n = 256, c = document.createElement('canvas'); c.width = c.height = n;
  const x = c.getContext('2d'), id = x.createImageData(n, n);
  for (let y = 0; y < n; y++) for (let i = 0; i < n; i++) { const v = Math.pow(J.r(i, y, 77), 1.3) * 255, q = (y * n + i) * 4; id.data[q] = id.data[q + 1] = id.data[q + 2] = v; id.data[q + 3] = 255; }
  x.putImageData(id, 0, 0);
  STATIC = c; return c;
};
fx('tvStatic', { name: '砂嵐', tags: ['glitch', 'emotional'], w: 0.6, dur: 5, pre: 2, amp: 1, glitchy: true, ae: 'block',
  draw(ctx, ev, k, I) {
    const { cw, ch } = I, st = I.step * 3 + evS(ev), b = 0.4;
    const cov = (k < b ? 0.5 + 0.5 * E.outQuad(k / b) : 1 - E.outQuad((k - b) / (1 - b))) * clamp(ampOf(ev), 0.7, 1.1);
    if (cov < 0.02) return;
    const N = staticTex(), sz = Math.max(1, Math.round(ch / 540));
    const pat = ctx.createPattern(N, 'repeat');
    try { pat.setTransform(new DOMMatrix([sz * 2, 0, 0, sz, -Math.floor(J.r(st, 1) * 256) * sz * 2, -Math.floor(J.r(st, 2) * 256) * sz])); } catch (e) { /* static pattern */ }
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = Math.min(1, cov); ctx.fillStyle = pat; ctx.fillRect(0, 0, cw, ch);
    ctx.globalAlpha = 0.3 * cov; ctx.fillStyle = '#000000';
    const by = (J.r(st, 3) * 1.2 - 0.1) * ch; ctx.fillRect(0, by, cw, ch * 0.16);
    ctx.fillStyle = '#ffffff'; ctx.globalAlpha = 0.5 * cov;
    for (let i = 0; i < 4; i++) ctx.fillRect(0, J.r(st, i, 4) * ch, cw, Math.max(1, ch * 0.003));
  } });

fx('dustScratches', { name: 'フィルム傷', tags: ['emotional', 'calm', 'editorial'], w: 0.8, dur: 8, amp: 1, mid: true,
  draw(ctx, ev, k, I) {
    const { cw, ch, sc } = I, s = evS(ev), st = I.step * 31 + s, dk = isDark(sc.bg);
    const a = ahr(k, 0.08, 0.7) * clamp(ampOf(ev), 0.6, 1.2);
    if (a < 0.02) return;
    const M = Math.min(cw, ch), lw = Math.max(1, M * 0.0017), LT = 'rgba(255,253,245,', DK = 'rgba(24,16,8,';
    ctx.fillStyle = (J.r(st, 1) < 0.5 ? LT : DK) + (0.06 * a * J.r(st, 2)).toFixed(3) + ')'; ctx.fillRect(0, 0, cw, ch);
    ctx.lineCap = 'round';
    const nS = 1 + (J.h(s, 3) % 3);
    for (let i = 0; i < nS; i++) {
      if (J.r(st, i, 4) < 0.18) continue;
      const x = cw * (0.1 + 0.8 * J.r(s, i, 5)) + J.rs(st, i, 6) * M * 0.012;
      const y0 = J.r(s, i, 7) < 0.5 ? -2 : ch * 0.5 * J.r(st, i, 8), y1 = J.r(s, i, 9) < 0.5 ? ch + 2 : y0 + ch * J.rr(0.3, 0.7, st, i, 10);
      ctx.strokeStyle = (dk ? LT : DK) + (0.55 * a).toFixed(3) + ')'; ctx.lineWidth = lw * J.rr(0.7, 1.7, s, i, 11);
      ctx.beginPath(); ctx.moveTo(x, y0); ctx.quadraticCurveTo(x + J.rs(st, i, 12) * M * 0.008, (y0 + y1) / 2, x + J.rs(s, i, 13) * M * 0.006, y1); ctx.stroke();
    }
    const nD = 7 + (J.h(st, 14) % 9);
    for (let i = 0; i < nD; i++) {
      const x = J.r(st, i, 15) * cw, y = J.r(st, i, 16) * ch, r = M * J.rr(0.0018, 0.007, st, i, 17);
      const c = (J.r(st, i, 18) < (dk ? 0.7 : 0.25) ? LT : DK) + (J.rr(0.45, 0.9, st, i, 19) * a).toFixed(3) + ')';
      if (J.r(st, i, 20) < 0.72) { ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(x, y, r, r * J.rr(0.45, 1, st, i, 21), J.r(st, i, 22) * TAU, 0, TAU); ctx.fill(); }
      else {
        const L = M * J.rr(0.02, 0.06, st, i, 23), an = J.r(st, i, 24) * TAU;
        ctx.strokeStyle = c; ctx.lineWidth = lw * 0.8; ctx.beginPath(); ctx.moveTo(x, y);
        ctx.bezierCurveTo(x + Math.cos(an) * L * 0.4 + J.rs(st, i, 25) * L * 0.4, y + Math.sin(an) * L * 0.4, x + Math.cos(an + 0.8) * L * 0.8, y + Math.sin(an + 0.8) * L * 0.8, x + Math.cos(an + 0.3) * L, y + Math.sin(an + 0.3) * L);
        ctx.stroke();
      }
    }
  } });

/* ================= film strip / 3D / water ================= */
const rrect = (ctx, x, y, w, h, r) => { r = Math.min(r, w / 2, h / 2); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); };
// the picture shrinks onto a strip of film with sprocket holes and the strip is pulled on by one frame
fx('filmAdvance', { name: 'フィルム送り', tags: ['emotional', 'editorial', 'calm'], w: 0.6, dur: 9, pre: 4, amp: 1, scratch: true, ae: 'slice',
  draw(ctx, ev, k, I) {
    const { cw, ch, S } = I; if (!S) return;
    const s = evS(ev), dir = J.r(s, 1) < 0.7 ? 1 : -1, env = ahr(k, 0.22, 0.78, E.inOutCubic, E.inOutCubic);
    if (env < 0.002) return;
    const z = 1 - 0.17 * env, fw = cw * z, fh = ch * z, x0 = (cw - fw) / 2, gap = Math.max(2, ch * 0.03), pitch = fh + gap;
    const off = E.inOutCubic(clamp((k - 0.2) / 0.6)) * pitch * dir, yc = (ch - fh) / 2 - off;
    ctx.fillStyle = '#0d0b09'; ctx.fillRect(0, 0, cw, ch);
    for (let j = -2; j <= 2; j++) { const y = yc + j * pitch; if (y > ch || y + fh < 0) continue; ctx.drawImage(S, x0, y, fw, fh); }
    if (x0 > 3) {
      const hp = pitch / 4, hw = x0 * 0.42, hh = hp * 0.46;
      ctx.fillStyle = `rgba(236,230,218,${(0.9 * env).toFixed(3)})`; ctx.beginPath();
      for (let y = (((yc % hp) + hp) % hp) - hp; y < ch; y += hp) {
        rrect(ctx, x0 * 0.29, y + (hp - hh) / 2, hw, hh, hw * 0.2);
        rrect(ctx, cw - x0 * 0.29 - hw, y + (hp - hh) / 2, hw, hh, hw * 0.2);
      }
      ctx.fill();
    }
  } });

// the frame swings in 3D around its vertical (or horizontal) axis: projected strips form a perspective trapezoid
fx('perspectiveTilt', { name: 'パース揺れ', tags: ['pop', 'graphic', 'emotional'], w: 0.8, dur: 8, amp: 1, mid: true, scratch: true, ae: 'shake',
  draw(ctx, ev, k, I) {
    const { cw, ch, S, sc } = I; if (!S) return;
    const s = evS(ev), cols = J.r(s, 1) < (cw >= ch ? 0.7 : 0.35), dir = J.r(s, 2) < 0.5 ? 1 : -1;
    const e = k < 0.25 ? E.outCubic(k / 0.25) : Math.cos((k - 0.25) / 0.75 * Math.PI * 1.5) * Math.exp(-2.6 * (k - 0.25) / 0.75);
    const phi = dir * (30 + 10 * J.r(s, 3)) * clamp(ampOf(ev), 0.5, 1.2) * e * DEG;
    if (Math.abs(phi) < 0.002) return;
    const L = cols ? cw : ch, Mx = cols ? ch : cw, hl = L / 2, D = 1.15 * Math.max(cw, ch), co = Math.cos(phi), si = Math.sin(phi);
    ctx.fillStyle = isDark(sc.bg) ? sc.bg : J.mix(sc.bg, sc.fg, 0.1); ctx.fillRect(0, 0, cw, ch);
    const N = 48, sw = L / N;
    let pd = null;
    for (let i = 0; i <= N; i++) {
      const u = -1 + 2 * i / N, p = D / (D + u * hl * si), d = hl + u * hl * co * p;
      if (pd) {
        const h = Mx * (pd[1] + p) / 2, x = pd[0], w = d - pd[0] + 0.7, s0 = (i - 1) * sw;
        if (cols) ctx.drawImage(S, s0, 0, sw, ch, x, (ch - h) / 2, w, h); else ctx.drawImage(S, 0, s0, cw, sw, (cw - h) / 2, x, h, w);
      }
      pd = [d, p];
    }
  } });

// water ripple: annuli around the drop point are each re-drawn slightly scaled (radial displacement)
fx('ripple', { name: '波紋', tags: ['emotional', 'calm', 'pop'], w: 0.8, dur: 10, amp: 1, mid: true, scratch: true, ae: 'zoom',
  draw(ctx, ev, k, I) {
    const { cw, ch, S, sc } = I; if (!S) return;
    const s = evS(ev), cx = cw * (0.5 + J.rs(s, 1) * 0.1), cy = ch * (0.5 + J.rs(s, 2) * 0.08), M = Math.min(cw, ch), dk = isDark(sc.bg);
    const Rmax = Math.hypot(Math.max(cx, cw - cx), Math.max(cy, ch - cy));
    const lam = M * 0.1, front = (0.05 + 0.95 * E.outQuad(k)) * Rmax * 1.05, A = M * 0.022 * clamp(ampOf(ev), 0.5, 1.3) * (1 - 0.7 * k);
    const dr = lam / 5, r0 = Math.max(0, front - 2.6 * lam);
    for (let r = r0, n = 0; r < front + dr && n < 40; r += dr, n++) {
      const rm = r + dr / 2, ph = (front - rm) / lam, env = Math.exp(-ph * 0.8) * clamp(ph * 4 + 1);
      const disp = A * Math.sin(ph * TAU) * env;
      if (Math.abs(disp) < 0.3 || rm < 2) continue;
      const m = clamp(rm / Math.max(1, rm - disp), 0.7, 1.4);
      ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r + dr + 0.6, 0, TAU); ctx.arc(cx, cy, Math.max(0, r - 0.6), 0, TAU, true); ctx.clip();
      ctx.drawImage(S, cx - cx * m, cy - cy * m, cw * m, ch * m); ctx.restore();
    }
    // crest highlights
    ctx.globalCompositeOperation = dk ? 'screen' : 'multiply'; ctx.lineWidth = Math.max(1, dr * 0.9);
    for (let j = 0; j < 3; j++) {
      const rc = front - lam * (j + 0.25); if (rc <= 2) continue;
      const al = 0.16 * Math.exp(-j * 0.9) * (1 - 0.6 * k);
      ctx.strokeStyle = dk ? `rgba(255,255,255,${al.toFixed(3)})` : J.rgba(J.mix(sc.fg, sc.bg, 0.4), al.toFixed(3));
      ctx.beginPath(); ctx.arc(cx, cy, rc, 0, TAU); ctx.stroke();
    }
  } });

/* ================= manga / graphic overlays ================= */
const inkCol = sc => (isDark(sc.bg) ? lightest([sc.fg, sc.ink, '#FFFFFF']) : darkest([sc.fg, sc.ink, '#111111']));
// 集中線: thin wedges converging on the centre, redrawn every frame like hand-drawn animation
fx('focusLines', { name: '集中線', tags: ['pop', 'graphic', 'emotional'], w: 0.9, dur: 6, amp: 1, mid: true, ae: 'zoom',
  draw(ctx, ev, k, I) {
    const { cw, ch, sc } = I, s = evS(ev), st = I.step * 5 + s, a = ahr(k, 0.1, 0.72);
    if (a < 0.02) return;
    const cx = cw / 2 + J.rs(s, 1) * cw * 0.03, cy = ch / 2 + J.rs(s, 2) * ch * 0.03, M = Math.min(cw, ch);
    const rx = cw * (0.4 + 0.06 * (1 - a)), ry = ch * (0.34 + 0.06 * (1 - a)), R = Math.hypot(cw, ch) * 0.75;
    const n = 90 + (J.h(s, 3) % 50);
    ctx.fillStyle = inkCol(sc); ctx.globalAlpha = 0.85 * a; ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const an = (i + J.r(st, i, 4) * 0.8) / n * TAU, w = M * J.rr(0.002, 0.011, st, i, 5), tip = J.rr(1.0, 1.45, st, i, 6);
      const tx = cx + Math.cos(an) * rx * tip, ty = cy + Math.sin(an) * ry * tip, nx = -Math.sin(an), ny = Math.cos(an);
      const ox = cx + Math.cos(an) * R, oy = cy + Math.sin(an) * R;
      ctx.moveTo(tx, ty); ctx.lineTo(ox + nx * w, oy + ny * w); ctx.lineTo(ox - nx * w, oy - ny * w); ctx.closePath();
    }
    ctx.fill();
  } });

// 流線: tapered streaks racing across the frame (clear of the centre band)
fx('speedLines', { name: '流線', tags: ['pop', 'graphic'], w: 0.8, dur: 6, amp: 1, mid: true,
  draw(ctx, ev, k, I) {
    const { cw, ch, sc } = I, s = evS(ev), a = ahr(k, 0.12, 0.7);
    if (a < 0.02) return;
    const vert = cw < ch ? J.r(s, 1) < 0.5 : J.r(s, 1) < 0.15, dir = J.r(s, 2) < 0.5 ? 1 : -1;
    const L = vert ? ch : cw, M = vert ? cw : ch, n = 22 + (J.h(s, 3) % 12), c1 = inkCol(sc), c2 = vivid(sc);
    for (let i = 0; i < n; i++) {
      let q = J.r(s, i, 4);
      if (Math.abs(q - 0.5) < 0.12 && J.r(s, i, 9) < 0.8) q = q < 0.5 ? 0.38 - J.r(s, i, 10) * 0.33 : 0.62 + J.r(s, i, 10) * 0.33;
      const p = q * M, len = L * J.rr(0.15, 0.55, s, i, 5), th = Math.max(1, M * J.rr(0.002, 0.008, s, i, 6)), sp = J.rr(1.3, 2.6, s, i, 7);
      const f = (J.r(s, i, 8) + k * sp) % 1, head = -len * 0.2 + f * (L + len * 1.2), tail = head - len;
      const H = dir > 0 ? head : L - head, Tl = dir > 0 ? tail : L - tail;
      ctx.globalAlpha = a * J.rr(0.4, 0.9, s, i, 11); ctx.fillStyle = J.r(s, i, 12) < 0.22 ? c2 : c1;
      ctx.beginPath();
      if (!vert) { ctx.moveTo(Tl, p); ctx.lineTo(H, p - th / 2); ctx.lineTo(H, p + th / 2); }
      else { ctx.moveTo(p, Tl); ctx.lineTo(p - th / 2, H); ctx.lineTo(p + th / 2, H); }
      ctx.closePath(); ctx.fill();
    }
  } });

// キラッ: 8-point glints popping in sequence around the lyric band
fx('starGlint', { name: 'キラッ', tags: ['pop', 'emotional'], w: 0.8, dur: 9, amp: 1, mid: true, ae: 'flash',
  draw(ctx, ev, k, I) {
    const { cw, ch, sc } = I, s = evS(ev), dk = isDark(sc.bg), M = Math.min(cw, ch), col = vivid(sc), n = 2 + (J.h(s, 1) % 3);
    const port = ch > cw;
    for (let i = 0; i < n; i++) {
      const t0 = i * 0.16 + J.r(s, i, 4) * 0.06, u = (k - t0) / 0.55;
      if (u <= 0 || u >= 1) continue;
      const g = Math.pow(Math.sin(Math.PI * u), 0.8), R = M * (0.1 + 0.07 * J.r(s, i, 5)) * g * clamp(ampOf(ev), 0.6, 1.3);
      const x = cw * (0.5 + J.rs(s, i, 2) * (port ? 0.3 : 0.34)), y = ch * (0.5 + J.rs(s, i, 3) * (port ? 0.14 : 0.1)), rot = (J.rs(s, i, 6) * 12 + u * 30) * DEG;
      if (R < 0.5) continue;
      const glow = ctx.createRadialGradient(x, y, 0, x, y, R * 0.6);
      glow.addColorStop(0, J.rgba(col, (0.55 * g).toFixed(3))); glow.addColorStop(1, J.rgba(col, 0));
      ctx.globalCompositeOperation = dk ? 'screen' : 'source-over'; ctx.fillStyle = glow; ctx.fillRect(x - R, y - R, 2 * R, 2 * R);
      ctx.beginPath();
      for (let j = 0; j < 16; j++) {
        const an = rot + j * Math.PI / 8, rr = j % 2 ? R * 0.07 : (j % 4 === 0 ? R : R * 0.42);
        if (j) ctx.lineTo(x + Math.cos(an) * rr, y + Math.sin(an) * rr); else ctx.moveTo(x + Math.cos(an) * rr, y + Math.sin(an) * rr);
      }
      ctx.closePath();
      ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = dk ? '#FFFFFF' : col; ctx.fill();
      ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(x, y, R * 0.08, 0, TAU); ctx.fill();
    }
  } });

// thin scheme-coloured bars sweeping across the frame at different speeds
fx('colorBars', { name: 'カラーバー', tags: ['pop', 'graphic', 'glitch'], w: 0.8, dur: 6, amp: 1, mid: true, ae: 'slice',
  draw(ctx, ev, k, I) {
    const { cw, ch, sc } = I, s = evS(ev), vert = J.r(s, 1) < (cw >= ch ? 0.35 : 0.15), dir = J.r(s, 2) < 0.5 ? 1 : -1;
    let cols = [sc.accent, sc.accent2, sc.ghostA, sc.ghostB, sc.fg].filter(c => c && J.contrast(c, sc.bg) > 1.35);
    if (!cols.length) cols = [inkCol(sc)];
    const L = vert ? cw : ch, M = vert ? ch : cw, n = 4 + (J.h(s, 3) % 4);
    for (let i = 0; i < n; i++) {
      const th = Math.max(2, L * J.rr(0.008, 0.045, s, i, 4)), d = J.r(s, i, 5) * 0.4, sp = J.rr(0.9, 1.5, s, i, 6);
      const u = clamp((k - d) / (1 - d) * sp);
      if (u <= 0 || u >= 1) continue;
      let pos = J.lerp(-th, L + th, u); if (dir < 0) pos = L - pos;
      const part = J.r(s, i, 7) < 0.4, m0 = part ? M * J.rr(0, 0.5, s, i, 8) : 0, mw = part ? M * J.rr(0.3, 0.6, s, i, 9) : M;
      ctx.globalAlpha = 0.92; ctx.fillStyle = cols[(i + (J.h(s, 10) % cols.length)) % cols.length];
      if (vert) ctx.fillRect(pos - th / 2, m0, th, mw); else ctx.fillRect(m0, pos - th / 2, mw, th);
    }
  } });

// three hard zoom steps (ダダダン), each with its own slight focus shift, then snap back
fx('zoomStutter', { name: 'ズーム連打', tags: ['pop', 'graphic', 'glitch'], w: 0.8, dur: 6, amp: 1, mid: true, scratch: true, ae: 'zoom',
  draw(ctx, ev, k, I) {
    const { cw, ch, S } = I; if (!S) return;
    const s = evS(ev), j = Math.min(2, Math.floor(k * 3)), a = clamp(ampOf(ev), 0.5, 1.3);
    const z = 1 + (j + 1) * (0.035 + 0.012 * J.r(s, 1)) * a;
    drawScaled(ctx, S, z, cw * (0.5 + J.rs(s, 2, j) * 0.04), ch * (0.5 + J.rs(s, 3, j) * 0.04), cw, ch);
  } });

/* ================= graphic inversions / stylise ================= */
// an inverted ring (circle or diamond) bursts out from the centre, a thinner echo ring follows
fx('negativeRing', { name: '反転リング', tags: ['graphic', 'pop', 'glitch'], w: 0.8, dur: 6, amp: 1, mid: true, ae: 'invert',
  draw(ctx, ev, k, I) {
    const { cw, ch } = I, s = evS(ev), M = Math.min(cw, ch), dia = J.r(s, 1) < 0.35;
    const cx = cw / 2 + J.rs(s, 2) * cw * 0.05, cy = ch / 2 + J.rs(s, 3) * ch * 0.05, Rm = Math.hypot(cw, ch) * (dia ? 0.75 : 0.56);
    const shape = r => { if (dia) { ctx.moveTo(cx, cy - r); ctx.lineTo(cx + r, cy); ctx.lineTo(cx, cy + r); ctx.lineTo(cx - r, cy); ctx.closePath(); } else { ctx.moveTo(cx + r, cy); ctx.arc(cx, cy, r, 0, TAU); } };
    const ring = (p, th) => {
      if (p <= 0 || p >= 1) return;
      const r = E.outCubic(p) * Rm, r0 = Math.max(0, r - th * (1 - 0.55 * p));
      ctx.beginPath(); shape(r); if (r0 > 0.5) shape(r0); ctx.fill('evenodd');
    };
    ctx.globalCompositeOperation = 'difference'; ctx.fillStyle = '#ffffff';
    const a = clamp(ampOf(ev), 0.6, 1.3);
    ring(k * 1.05 + 0.04, M * 0.16 * a); ring((k - 0.22) * 1.35, M * 0.05 * a);
  } });

// edge detection: |frame - shifted frame| → neon outlines on dark schemes, ink line drawing on light ones
const invHex = h => { const [r, g, b] = J.hex(h); return J.toHex(255 - r, 255 - g, 255 - b); };
fx('edgeDetect', { name: '輪郭抽出', tags: ['graphic', 'glitch', 'editorial'], w: 0.7, dur: 4, amp: 1, mid: true, scratch: true, ae: 'invert',
  draw(ctx, ev, k, I) {
    const { cw, ch, S, sc } = I; if (!S) return;
    const dk = isDark(sc.bg), a = ahr(k, 0.1, 0.72);
    if (a < 0.02) return;
    const w = Math.max(2, Math.round(cw / 2)), h = Math.max(2, Math.round(ch / 2)), o = Math.max(1, Math.round(h / 320));
    const T = buf(0, w, h), x = cx2(T);
    x.globalCompositeOperation = 'copy'; x.drawImage(S, 0, 0, w, h);
    x.globalCompositeOperation = 'difference'; x.drawImage(S, 0, 0, cw, ch, o, o, w, h);
    x.globalCompositeOperation = 'saturation'; x.fillStyle = '#808080'; x.fillRect(0, 0, w, h);
    const T2 = buf(1, w, h), y = cx2(T2);
    // noise floor: color-burn with a light grey = max(0, (v - 0.07) / 0.93) removes dithered-gradient steps; then gain ×4
    y.globalCompositeOperation = 'copy'; y.drawImage(T, 0, 0);
    y.globalCompositeOperation = 'color-burn'; y.fillStyle = '#EDEDED'; y.fillRect(0, 0, w, h);
    y.globalCompositeOperation = 'lighter'; y.drawImage(T2, 0, 0); y.drawImage(T2, 0, 0);
    const edge = dk ? J.mix(vivid(sc), '#ffffff', 0.45) : darkest([sc.fg, sc.ink, '#111111']);
    // colour the edge map at half resolution, then one upscale: neon lines on a darkened ground / ink lines on the paper colour
    y.globalCompositeOperation = 'multiply'; y.fillStyle = dk ? edge : invHex(edge); y.fillRect(0, 0, w, h);
    if (dk) { y.globalCompositeOperation = 'screen'; y.fillStyle = J.mix(sc.bg, '#000000', 0.6); y.fillRect(0, 0, w, h); }
    else { y.globalCompositeOperation = 'difference'; y.fillStyle = '#ffffff'; y.fillRect(0, 0, w, h); y.globalCompositeOperation = 'multiply'; y.fillStyle = sc.bg; y.fillRect(0, 0, w, h); }
    ctx.globalAlpha = a; ctx.drawImage(T2, 0, 0, w, h, 0, 0, cw, ch);
  } });

// glass shatter: cracks appear on the old frame, the new frame arrives in shards that drift apart and knit back together
fx('shatter', { name: 'ガラス割れ', tags: ['glitch', 'pop', 'emotional'], w: 0.5, dur: 8, pre: 1, amp: 1, scratch: true, ae: 'block',
  draw(ctx, ev, k, I) {
    const { cw, ch, S, sc } = I; if (!S) return;
    const s = evS(ev), M = Math.min(cw, ch), dk = isDark(sc.bg), a = clamp(ampOf(ev), 0.6, 1.3);
    const px = cw * (0.5 + J.rs(s, 1) * 0.15), py = ch * (0.5 + J.rs(s, 2) * 0.12), n = 9 + (J.h(s, 3) % 4);
    const radii = [0, M * J.rr(0.1, 0.17, s, 4), M * J.rr(0.32, 0.45, s, 5), Math.hypot(cw, ch) * 1.1];
    const ang = []; for (let i = 0; i < n; i++) ang.push((i + J.rs(s, i, 6) * 0.35) / n * TAU);
    const V = (i, j) => { if (!j) return [px, py]; const q = ang[i % n] + J.rs(s, i % n, j, 7) * 0.12, r = radii[j] * (j < 3 ? 1 + J.rs(s, i % n, j, 8) * 0.18 : 1); return [px + Math.cos(q) * r, py + Math.sin(q) * r]; };
    const b = 1 / 8, u = (k - b) / (1 - b);
    const sep = u <= 0 ? 0 : u < 0.28 ? E.outCubic(u / 0.28) : 1 - E.inOutCubic((u - 0.28) / 0.72);
    const crack = u <= 0 ? 1 : Math.max(0, 1 - u * 1.4);
    const shards = [];
    for (let i = 0; i < n; i++) for (let j = 0; j < 3; j++) {
      const pts = j ? [V(i, j), V(i + 1, j), V(i + 1, j + 1), V(i, j + 1)] : [V(i, 0), V(i, 1), V(i + 1, 1)];
      const cxm = pts.reduce((t, p) => t + p[0], 0) / pts.length, cym = pts.reduce((t, p) => t + p[1], 0) / pts.length;
      const dx = cxm - px, dy = cym - py, dl = Math.hypot(dx, dy) || 1, d = sep * M * (dk ? 0.04 : 0.028) * a * (0.5 + 0.3 * j + 0.5 * J.r(s, i, j, 9));
      shards.push({ pts, cxm, cym, ox: dx / dl * d, oy: dy / dl * d, rot: sep * J.rs(s, i, j, 10) * 4 * DEG });
    }
    if (sep > 0.002) {
      ctx.fillStyle = dk ? '#000000' : J.mix(sc.bg, '#000000', 0.55); ctx.fillRect(0, 0, cw, ch);
      for (const sh of shards) {
        ctx.save(); ctx.translate(sh.cxm + sh.ox, sh.cym + sh.oy); ctx.rotate(sh.rot); ctx.translate(-sh.cxm, -sh.cym);
        ctx.beginPath(); sh.pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); ctx.clip();
        ctx.drawImage(S, 0, 0); ctx.restore();
      }
    }
    const la = Math.max(crack, sep * 0.6);
    if (la > 0.02) {
      ctx.strokeStyle = dk ? `rgba(255,255,255,${(0.75 * la).toFixed(3)})` : J.rgba(darkest([sc.fg, sc.ink]), (0.6 * la).toFixed(3));
      ctx.lineWidth = Math.max(1, M * 0.0022); ctx.lineJoin = 'round'; ctx.beginPath();
      for (const sh of shards) { const c = Math.cos(sh.rot), si = Math.sin(sh.rot); sh.pts.forEach((p, i) => { const X = sh.cxm + sh.ox + (p[0] - sh.cxm) * c - (p[1] - sh.cym) * si, Y = sh.cym + sh.oy + (p[0] - sh.cxm) * si + (p[1] - sh.cym) * c; if (i) ctx.lineTo(X, Y); else ctx.moveTo(X, Y); }); ctx.closePath(); }
      ctx.stroke();
    }
    if (k < b * 1.5) {   // impact flash
      const f = 1 - k / (b * 1.5), g = ctx.createRadialGradient(px, py, 0, px, py, M * 0.25);
      g.addColorStop(0, `rgba(255,255,255,${(0.85 * f).toFixed(3)})`); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.globalCompositeOperation = dk ? 'screen' : 'source-over'; ctx.fillStyle = g; ctx.fillRect(px - M * 0.25, py - M * 0.25, M * 0.5, M * 0.5);
    }
  } });

// rack focus: the picture drops out of focus (peak at the cut) and snaps back
fx('defocus', { name: 'ピンぼけ', tags: ['emotional', 'calm', 'editorial'], w: 0.9, dur: 8, pre: 4, amp: 1, mid: true, scratch: true, ae: 'zoom',
  draw(ctx, ev, k, I) {
    const { cw, ch, S } = I; if (!S) return;
    const amt = (k < 0.5 ? E.inOutCubic(k / 0.5) : 1 - E.inOutCubic((k - 0.5) / 0.5)) * clamp(ampOf(ev), 0.6, 1.2);
    if (amt < 0.01) return;
    const w = Math.max(2, Math.ceil(cw / 4)), h = Math.max(2, Math.ceil(ch / 4)), T = buf(0, w, h), x = cx2(T);
    x.globalCompositeOperation = 'copy';
    if (I.allowFilter) { x.filter = `blur(${(amt * h / 55).toFixed(2)}px)`; x.drawImage(S, 0, 0, w, h); x.filter = 'none'; }
    else {
      const w2 = Math.max(2, Math.ceil(w / (1 + 3 * amt))), h2 = Math.max(2, Math.ceil(h / (1 + 3 * amt))), T2 = buf(1, w2, h2), y = cx2(T2);
      y.globalCompositeOperation = 'copy'; y.drawImage(S, 0, 0, w2, h2); x.drawImage(T2, 0, 0, w, h);
    }
    ctx.globalAlpha = Math.min(1, amt * 1.8);
    drawScaled(ctx, T, 1 + 0.025 * amt, cw / 2, ch / 2, cw, ch);
  } });

// camera shutter: white flash, the frame becomes a tilted instant photo on a dimmed backdrop, then zooms back
fx('snapshot', { name: 'シャッター', tags: ['pop', 'emotional', 'editorial'], w: 0.6, dur: 10, amp: 1, mid: true, scratch: true, ae: 'flash',
  draw(ctx, ev, k, I) {
    const { cw, ch, S, sc } = I; if (!S) return;
    const s = evS(ev), M = Math.min(cw, ch);
    const env = k < 0.16 ? E.outBack(k / 0.16, 1.4) : k > 0.8 ? 1 - E.inOutCubic((k - 0.8) / 0.2) : 1;
    if (env > 0.002) {
      const z = 1 - 0.15 * env, rot = (J.r(s, 1) < 0.5 ? -1 : 1) * (2 + 2.5 * J.r(s, 2)) * env * DEG;
      const bw = M * 0.024 * clamp(env, 0, 1), fw = cw * z, fh = ch * z, bb = bw * 3.2;
      ctx.globalAlpha = clamp(env * 1.2); ctx.fillStyle = J.mix(sc.bg, '#000000', isDark(sc.bg) ? 0.5 : 0.45); ctx.fillRect(0, 0, cw, ch);
      ctx.globalAlpha = 1;
      ctx.translate(cw / 2, ch / 2); ctx.rotate(rot);
      ctx.fillStyle = `rgba(0,0,0,${(0.3 * env).toFixed(3)})`; ctx.fillRect(-fw / 2 - bw + M * 0.012, -fh / 2 - bw + M * 0.02, fw + 2 * bw, fh + bw + bb);
      ctx.fillStyle = '#F7F5F0'; ctx.fillRect(-fw / 2 - bw, -fh / 2 - bw, fw + 2 * bw, fh + bw + bb);
      ctx.drawImage(S, -fw / 2, -fh / 2, fw, fh);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
    if (k < 0.22) { ctx.fillStyle = `rgba(255,255,255,${(0.9 * (1 - k / 0.22)).toFixed(3)})`; ctx.fillRect(0, 0, cw, ch); }
  } });

// elastic squash & stretch of the whole frame (damped spring)
fx('squash', { name: '伸縮', tags: ['pop', 'graphic'], w: 0.8, dur: 6, amp: 1, mid: true, scratch: true, ae: 'zoom',
  draw(ctx, ev, k, I) {
    const { cw, ch, S, sc } = I; if (!S) return;
    const s = evS(ev), hor = J.r(s, 1) < 0.6;
    const e = Math.cos(k * Math.PI * 2.5) * Math.exp(-1.8 * k) * (1 - Math.pow(k, 6)), a = 0.17 * clamp(ampOf(ev), 0.5, 1.3) * e;
    if (Math.abs(a) < 0.002) return;
    const sx = hor ? 1 + a : 1 - a * 0.6, sy = hor ? 1 - a * 0.6 : 1 + a;
    ctx.fillStyle = sc.bg; ctx.fillRect(0, 0, cw, ch);
    ctx.drawImage(S, cw / 2 - cw * sx / 2, ch / 2 - ch * sy / 2, cw * sx, ch * sy);
  } });

// scanner: a glowing bar sweeps the frame; what it has not reached yet is dimmed, rows just behind it jitter
fx('scanBar', { name: 'スキャン', tags: ['graphic', 'editorial', 'glitch'], w: 0.7, dur: 8, amp: 1, mid: true, scratch: true, ae: 'flash',
  draw(ctx, ev, k, I) {
    const { cw, ch, S, sc } = I; if (!S) return;
    const s = evS(ev), dk = isDark(sc.bg), down = J.r(s, 1) < 0.7, st = I.step * 3 + s;
    const bh = ch * 0.05, yy = -bh + k * (ch + 2 * bh), y = down ? yy : ch - yy;
    const y0 = down ? Math.max(0, y) : 0, y1 = down ? ch : Math.min(ch, y);
    if (y1 > y0) { ctx.fillStyle = dk ? 'rgba(0,0,0,0.6)' : J.rgba(sc.bg, 0.7); ctx.fillRect(0, y0, cw, y1 - y0); }
    const band = ch * 0.035, sy = clamp(down ? y - band : y, 0, ch - 1), sh = Math.min(band, ch - sy);
    if (sh > 1) for (let i = 0; i < 3; i++) {
      const hh = sh / 3, yy2 = sy + i * hh;
      ctx.drawImage(S, 0, yy2, cw, hh, J.rs(st, i, 2) * cw * 0.012, yy2, cw, hh);
    }
    const col = dk ? J.mix(vivid(sc), '#ffffff', 0.4) : vivid(sc);
    const g = ctx.createLinearGradient(0, y - bh, 0, y + bh);
    g.addColorStop(0, J.rgba(col, 0)); g.addColorStop(0.5, J.rgba(col, dk ? 0.5 : 0.35)); g.addColorStop(1, J.rgba(col, 0));
    ctx.globalCompositeOperation = dk ? 'screen' : 'multiply'; ctx.fillStyle = g; ctx.fillRect(0, y - bh, cw, bh * 2);
    ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = dk ? '#FFFFFF' : col; ctx.globalAlpha = 0.9;
    ctx.fillRect(0, y - Math.max(1, ch * 0.0015), cw, Math.max(2, ch * 0.003));
  } });

// the whole frame scrolls one full width (wrapping round) with motion blur — ends exactly where it started
fx('loopScroll', { name: '横ループ', tags: ['pop', 'graphic', 'glitch'], w: 0.7, dur: 6, pre: 3, amp: 1, scratch: true, ae: 'slice',
  draw(ctx, ev, k, I) {
    const { cw, ch, S, sc } = I; if (!S) return;
    const s = evS(ev), vert = cw < ch ? J.r(s, 1) < 0.6 : J.r(s, 1) < 0.2, dir = J.r(s, 2) < 0.5 ? 1 : -1;
    const L = vert ? ch : cw, q = E.inOutCubic(k), o = ((q * L * dir) % L + L) % L;
    const v = k < 0.5 ? 12 * k * k : 12 * (1 - k) * (1 - k);   // d(inOutCubic)/dk, 0..3
    const blur = L * 0.05 * v / 3;
    const wrap = (c, img, off, W, H) => { if (vert) { c.drawImage(img, 0, off - H, W, H); c.drawImage(img, 0, off, W, H); } else { c.drawImage(img, off - W, 0, W, H); c.drawImage(img, off, 0, W, H); } };
    if (blur < 2) { wrap(ctx, S, o, cw, ch); return; }
    const w = Math.max(2, Math.round(cw / 2)), h = Math.max(2, Math.round(ch / 2)), T = buf(0, w, h), x = cx2(T);
    x.globalCompositeOperation = 'copy'; x.fillStyle = sc.bg; x.fillRect(0, 0, w, h); x.globalCompositeOperation = 'source-over';
    wrap(x, S, o / 2, w, h);
    const T2 = buf(1, w, h), y = cx2(T2);
    y.globalCompositeOperation = 'copy'; y.drawImage(T, 0, 0); y.globalCompositeOperation = 'source-over';
    const n = 6;
    for (let i = 1; i < n; i++) {
      const d = (i / (n - 1) - 0.5) * blur / 2 * dir;
      y.globalAlpha = 1 / (i + 1);
      if (vert) { y.drawImage(T, 0, d); y.drawImage(T, 0, d - Math.sign(d || 1) * h); } else { y.drawImage(T, d, 0); y.drawImage(T, d - Math.sign(d || 1) * w, 0); }
    }
    ctx.drawImage(T2, 0, 0, w, h, 0, 0, cw, ch);
  } });

})();
