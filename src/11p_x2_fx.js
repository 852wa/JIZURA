/* JIZURA pack: x2fx — 追加分2: 45 short screen accents (displacement, copies, light, colour, texture, framing) */
(() => {
'use strict';
const E = J.E;
const P = 'x2fx';
const DEG = J.DEG, TAU = J.TAU, clamp = J.clamp, lerp = J.lerp;

/* ================= helpers ================= */
const isDark = c => J.lum(c) < 0.45;
const bell = k => Math.sin(Math.PI * clamp(k));
const evS = ev => J.h(Math.round(ev.t * 1000), 5519);
const ampOf = ev => clamp(ev.amp ?? 1, 0.3, 1.6);
const amp1 = ev => clamp(ev.amp ?? 1, 0.5, 1.3);
// attack (0..a) → hold → release (b..1)
const ahr = (k, a, b, inE = E.outCubic, outE = E.inCubic) => (k < a ? inE(k / a) : k > b ? 1 - outE((k - b) / Math.max(1e-3, 1 - b)) : 1);
// fast attack to 1 at a, smooth release to 0 at k=1
const punch = (k, a = 0.25) => (k < a ? E.outExpo(k / a) : 1 - E.inOutCubic((k - a) / (1 - a)));
// attack to 1 at a, then a damped swing through zero that dies out exactly at k=1
const spring = (k, a = 0.2) => { if (k < a) return E.outCubic(k / a); const q = (k - a) / (1 - a); return Math.exp(-2.2 * q) * Math.cos(q * TAU * 1.25) * (1 - q); };
const bounceOut = x => { const n = 7.5625, d = 2.75; if (x < 1 / d) return n * x * x; if (x < 2 / d) return n * (x -= 1.5 / d) * x + 0.75; if (x < 2.5 / d) return n * (x -= 2.25 / d) * x + 0.9375; return n * (x -= 2.625 / d) * x + 0.984375; };
// an accent that is visible on the background
const pop = sc => [sc.accent, sc.accent2, sc.fg].find(c => c && J.contrast(c, sc.bg) > 1.6) || sc.fg;
const tints = sc => { const l = [sc.accent, sc.accent2, sc.ghostA, sc.ghostB].filter(c => c && J.contrast(c, sc.bg) > 1.3); return l.length ? l : [sc.fg]; };
// the colour used to darken a frame (lids, dimming)
const shade = sc => (isDark(sc.bg) ? '#000000' : (isDark(sc.ink) ? sc.ink : (isDark(sc.fg) ? sc.fg : '#111111')));
const bgFill = (ctx, I) => { ctx.fillStyle = I.sc.bg; ctx.fillRect(0, 0, I.cw, I.ch); };
const cx2 = c => { const x = c.getContext('2d'); x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over'; x.filter = 'none'; x.imageSmoothingEnabled = true; return x; };
// the frame's ink (|frame - bg|, greyed and boosted) in one colour: on black for dark schemes ('lighten' / 'screen' it),
// on white for light schemes ('darken' / 'multiply' it)
const inkMask = (T, S, sc, col, dk) => {
  const w = T.width, h = T.height, x = cx2(T);
  x.globalCompositeOperation = 'copy'; x.drawImage(S, 0, 0, w, h);
  x.globalCompositeOperation = 'difference'; x.fillStyle = sc.bg; x.fillRect(0, 0, w, h);
  x.globalCompositeOperation = 'saturation'; x.fillStyle = '#808080'; x.fillRect(0, 0, w, h);
  x.globalCompositeOperation = 'multiply'; x.drawImage(T, 0, 0);                      // squared: faint background texture drops out
  x.globalCompositeOperation = 'color-dodge'; x.fillStyle = '#a8a8a8'; x.fillRect(0, 0, w, h);
  if (dk) { x.globalCompositeOperation = 'multiply'; x.fillStyle = col; x.fillRect(0, 0, w, h); }
  else { x.globalCompositeOperation = 'difference'; x.fillStyle = '#ffffff'; x.fillRect(0, 0, w, h); x.globalCompositeOperation = 'screen'; x.fillStyle = col; x.fillRect(0, 0, w, h); }
  x.globalCompositeOperation = 'source-over';
  return T;
};
const half = n => Math.max(2, Math.round(n / 2));
const drawScaled = (ctx, img, s, cx, cy, cw, ch) => ctx.drawImage(img, 0, 0, img.width, img.height, cx - cx * s, cy - cy * s, cw * s, ch * s);

const fx = (k, d) => J.register('fx', k, Object.assign({}, d, {
  draw(ctx, ev, k2, I) { ctx.save(); try { d.draw(ctx, ev, clamp(Number.isFinite(k2) ? k2 : 1), I); } finally { ctx.restore(); } },
}), P);

/* ================= displacement ================= */
// the whole frame leans into a parallelogram and springs back
fx('xrShearSnap', { name: 'シアー戻し', en: 'Shear Snap', tags: ['pop', 'graphic', 'glitch'], w: 1.1, dur: 7, amp: 1, mid: true, scratch: true, ae: 'shake',
  draw(ctx, ev, k, I) {
    const { cw, ch, S } = I; if (!S) return;
    const s = evS(ev), sk = (J.r(s, 1) < 0.5 ? 1 : -1) * 0.24 * amp1(ev) * spring(k, 0.2);
    if (Math.abs(sk) < 0.0015) return;
    bgFill(ctx, I);
    if (J.r(s, 2) < 0.75) ctx.setTransform(1, 0, sk, 1, -sk * ch / 2, 0); else ctx.setTransform(1, sk * 0.55, 0, 1, 0, -sk * 0.55 * cw / 2);
    ctx.drawImage(S, 0, 0);
  } });

// columns fall one after another like piano keys and rise back
fx('xrColumnDrop', { name: '列落ち', en: 'Column Drop', tags: ['pop', 'graphic', 'glitch'], w: 0.9, dur: 8, amp: 1, mid: true, scratch: true, ae: 'slice',
  draw(ctx, ev, k, I) {
    const { cw, ch, S } = I; if (!S) return;
    const s = evS(ev), n = 10 + (J.h(s, 1) % 8), rev = J.r(s, 2) < 0.5, a = amp1(ev), up = J.r(s, 4) < 0.3 ? -1 : 1;
    bgFill(ctx, I);
    for (let i = 0; i < n; i++) {
      const x0 = Math.round(i * cw / n), x1 = Math.round((i + 1) * cw / n);
      const u = clamp((k - (rev ? n - 1 - i : i) / (n - 1) * 0.42) / 0.58);
      const e = u < 0.38 ? E.inQuad(u / 0.38) : 1 - E.inOutCubic((u - 0.38) / 0.62);
      const dy = Math.round(up * ch * (0.09 + 0.15 * J.r(s, i, 3)) * a * e);
      ctx.drawImage(S, x0, 0, x1 - x0, ch, x0, dy, x1 - x0, ch);
    }
  } });

// the four quadrants travel one full lap around the centre, a quarter turn per beat
fx('xrQuadCycle', { name: '四分割めぐり', en: 'Quadrant Lap', tags: ['pop', 'graphic'], w: 0.6, dur: 8, amp: 1, mid: true, scratch: true, ae: 'block',
  draw(ctx, ev, k, I) {
    const { cw, ch, S } = I; if (!S || k >= 1) return;
    const s = evS(ev), cwD = J.r(s, 1) < 0.5 ? 1 : 3, f = k * 4, j = Math.min(3, Math.floor(f)), fr = E.inOutCubic(clamp(f - j));
    const SL = [[0, 0], [1, 0], [1, 1], [0, 1]], hw = cw / 2, hh = ch / 2, sh = 1 - 0.08 * amp1(ev) * bell(k);
    bgFill(ctx, I);
    for (let q = 0; q < 4; q++) {
      const A = SL[(q + j * cwD) % 4], B = SL[(q + (j + 1) * cwD) % 4];
      const px = lerp(A[0], B[0], fr) * hw, py = lerp(A[1], B[1], fr) * hh;
      ctx.drawImage(S, SL[q][0] * hw, SL[q][1] * hh, hw, hh, px + hw * (1 - sh) / 2, py + hh * (1 - sh) / 2, hw * sh, hh * sh);
    }
  } });

// split-flap board: tiles turn over to their coloured back and round again in a diagonal wave
fx('xrFlipTiles', { name: 'パネル返し', en: 'Flip Tiles', tags: ['pop', 'graphic'], w: 0.7, dur: 9, amp: 1, mid: true, scratch: true, ae: 'block',
  draw(ctx, ev, k, I) {
    const { cw, ch, S, sc } = I; if (!S) return;
    const s = evS(ev), m = Math.min(cw, ch), gx = Math.max(3, Math.round(cw / (m / 3.2))), gy = Math.max(3, Math.round(ch / (m / 3.2)));
    const rev = J.r(s, 1) < 0.5, back = pop(sc), back2 = J.mix(back, sc.bg, 0.35), part = 0.55 + 0.35 * clamp(ampOf(ev) - 0.3);
    for (let j = 0; j < gy; j++) for (let i = 0; i < gx; i++) {
      if (J.r(s, i, j, 2) > part) continue;
      const x0 = Math.round(i * cw / gx), x1 = Math.round((i + 1) * cw / gx), y0 = Math.round(j * ch / gy), y1 = Math.round((j + 1) * ch / gy), tw = x1 - x0, th = y1 - y0;
      const u = clamp((k - ((rev ? gx - 1 - i : i) + j) / (gx + gy - 2) * 0.45) / 0.55);
      if (u <= 0 || u >= 1) continue;
      const c = Math.cos(TAU * E.inOutCubic(u)), w = tw * Math.abs(c), xx = x0 + (tw - w) / 2;
      ctx.fillStyle = sc.bg; ctx.fillRect(x0, y0, tw, th);
      if (w < 0.5) continue;
      if (c >= 0) ctx.drawImage(S, x0, y0, tw, th, xx, y0, w, th);
      else { ctx.fillStyle = (i + j) % 2 ? back : back2; ctx.fillRect(xx, y0, w, th); }
    }
  } });

// rows squeezed towards the centre line: the frame gets a waist (or a belly) and springs back
fx('xrWaist', { name: 'くびれ', en: 'Waist Pinch', tags: ['pop', 'graphic', 'emotional'], w: 0.9, dur: 6, amp: 1, mid: true, scratch: true, ae: 'zoom',
  draw(ctx, ev, k, I) {
    const { cw, ch, S } = I; if (!S) return;
    const s = evS(ev), A = (J.r(s, 1) < 0.35 ? -0.2 : 0.3) * amp1(ev) * punch(k, 0.28), N = 54, yc = 0.5 + J.rs(s, 2) * 0.06;
    if (Math.abs(A) < 0.003) return;
    bgFill(ctx, I);
    for (let i = 0; i < N; i++) {
      const y0 = Math.floor(i * ch / N), y1 = Math.floor((i + 1) * ch / N), v = ((y0 + y1) / 2 / ch - yc) * 2;
      const w = cw * (1 - A * Math.exp(-(v * v) / 0.16));
      ctx.drawImage(S, 0, y0, cw, y1 - y0, (cw - w) / 2, y0, w, y1 - y0);
    }
  } });

// horizontal sync flagging: the top (or bottom) of the picture bends sideways and wraps round
fx('xrSyncBend', { name: '同期曲がり', en: 'Sync Bend', tags: ['glitch', 'emotional'], w: 0.8, dur: 5, amp: 1, glitchy: true, mid: true, scratch: true, ae: 'slice',
  draw(ctx, ev, k, I) {
    const { cw, ch, S, sc } = I; if (!S) return;
    const s = evS(ev), st = I.step * 7 + s, top = J.r(s, 1) < 0.7, dir = J.r(s, 2) < 0.5 ? 1 : -1;
    const zone = ch * 0.78, N = 44, A = dir * cw * 0.34 * amp1(ev) * bell(k);
    if (Math.abs(A) < 1) return;
    for (let i = 0; i < N; i++) {
      const a0 = Math.floor(i * zone / N), a1 = Math.floor((i + 1) * zone / N), h = a1 - a0, y = top ? a0 : ch - a1;
      const v = 1 - (i + 0.5) / N;
      let dx = A * Math.pow(v, 1.7) + J.rs(st, i, 3) * cw * 0.006 * v * bell(k); dx = ((dx % cw) + cw) % cw;
      ctx.fillStyle = sc.bg; ctx.fillRect(0, y, cw, h);
      ctx.drawImage(S, 0, y, cw, h, dx, y, cw, h); ctx.drawImage(S, 0, y, cw, h, dx - cw, y, cw, h);
    }
  } });

// vertical pleats: neighbouring strips are squeezed and stretched in turn, like bellows breathing once
fx('xrAccordion', { name: '蛇腹', en: 'Bellows', tags: ['pop', 'graphic'], w: 0.8, dur: 8, amp: 1, mid: true, scratch: true, ae: 'slice',
  draw(ctx, ev, k, I) {
    const { cw, ch, S } = I; if (!S) return;
    const s = evS(ev), n = 2 * (4 + (J.h(s, 1) % 3)), w0 = cw / n, q = 0.62 * amp1(ev) * Math.sin(k * TAU) * (1 - 0.35 * k) * (J.r(s, 2) < 0.5 ? 1 : -1);
    if (Math.abs(q) < 0.004) return;
    let x = 0;
    for (let i = 0; i < n; i++) {
      const wd = w0 * (1 + (i % 2 ? -q : q));
      ctx.drawImage(S, i * w0, 0, w0, ch, x, 0, wd + 0.6, ch);
      if ((i % 2 ? -q : q) < 0) { ctx.fillStyle = `rgba(0,0,0,${(0.42 * Math.abs(q)).toFixed(3)})`; ctx.fillRect(x, 0, wd + 0.6, ch); }
      x += wd;
    }
  } });

// the frame is tossed up, falls and bounces on the bottom edge
fx('xrDropBounce', { name: '着地バウンド', en: 'Drop Bounce', tags: ['pop', 'graphic'], w: 1, dur: 9, amp: 1, mid: true, scratch: true, ae: 'shake',
  draw(ctx, ev, k, I) {
    const { cw, ch, S } = I; if (!S) return;
    const lift = k < 0.16 ? E.outCubic(k / 0.16) : 1 - bounceOut((k - 0.16) / 0.84);
    const o = -Math.round(ch * 0.2 * amp1(ev) * lift);
    if (!o) return;
    bgFill(ctx, I);
    ctx.drawImage(S, 0, o); ctx.drawImage(S, 0, o + ch);
  } });

// three concentric discs of the picture turn against each other and settle
fx('xrDiscTurn', { name: '円盤まわし', en: 'Disc Turn', tags: ['pop', 'graphic', 'glitch'], w: 0.8, dur: 8, amp: 1, mid: true, scratch: true, ae: 'shake',
  draw(ctx, ev, k, I) {
    const { cw, ch, S, sc } = I; if (!S) return;
    const s = evS(ev), m = Math.min(cw, ch) / 2, cx = cw / 2, cy = ch / 2, e = spring(k, 0.22), dir = J.r(s, 1) < 0.5 ? 1 : -1;
    if (Math.abs(e) < 0.004) return;
    const R = [0.97, 0.66, 0.36], T = [1, -1.7, 2.6], lw = Math.max(1, m * 0.006);
    for (let i = 0; i < 3; i++) {
      const r = R[i] * m;
      ctx.save();
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.clip();
      ctx.fillStyle = sc.bg; ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
      ctx.translate(cx, cy); ctx.rotate(T[i] * dir * 15 * DEG * amp1(ev) * e); ctx.drawImage(S, -cx, -cy);
      ctx.restore();
      ctx.globalAlpha = clamp(Math.abs(e) * 1.5) * 0.7; ctx.strokeStyle = pop(sc); ctx.lineWidth = lw;
      ctx.beginPath(); ctx.arc(cx, cy, r - lw / 2, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1;
    }
  } });

// a bump of vertical stretch runs across the columns
fx('xrStretchWave', { name: '伸び波', en: 'Stretch Wave', tags: ['pop', 'emotional', 'graphic'], w: 0.9, dur: 8, amp: 1, mid: true, scratch: true, ae: 'zoom',
  draw(ctx, ev, k, I) {
    const { cw, ch, S } = I; if (!S) return;
    const s = evS(ev), N = 80, dir = J.r(s, 1) < 0.5, x0 = cw * (dir ? lerp(-0.3, 1.3, k) : lerp(1.3, -0.3, k)), sig = cw * 0.1, a = 0.85 * amp1(ev);
    for (let i = 0; i < N; i++) {
      const xa = Math.floor(i * cw / N), xb = Math.floor((i + 1) * cw / N), d = ((xa + xb) / 2 - x0) / sig, sy = 1 + a * Math.exp(-d * d);
      if (sy < 1.004) continue;
      ctx.drawImage(S, xa, 0, xb - xa, ch, xa, ch / 2 * (1 - sy), xb - xa, ch * sy);
    }
  } });

// the frame is cut along a diagonal; the two halves slide apart along the cut and back
fx('xrDiagSlice', { name: '斜め裂き', en: 'Diagonal Cut', tags: ['graphic', 'pop', 'glitch'], w: 0.9, dur: 6, amp: 1, mid: true, scratch: true, ae: 'slice',
  draw(ctx, ev, k, I) {
    const { cw, ch, S, sc } = I; if (!S) return;
    const s = evS(ev), e = punch(k, 0.3), th = (J.r(s, 1) < 0.5 ? 1 : -1) * (18 + 20 * J.r(s, 2)) * DEG, D = Math.hypot(cw, ch);
    const d = Math.min(cw, ch) * 0.13 * amp1(ev) * e, cx = cw / 2, cy = ch / 2;
    if (d < 0.5) return;
    bgFill(ctx, I);
    for (let hf = 0; hf < 2; hf++) {
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(th);
      ctx.beginPath(); ctx.rect(-D, hf ? 0 : -D, 2 * D, D); ctx.clip();
      ctx.translate(hf ? -d : d, 0); ctx.rotate(-th); ctx.drawImage(S, -cx, -cy);
      ctx.restore();
    }
    const lw = Math.max(1.5, Math.min(cw, ch) * 0.004);
    ctx.translate(cx, cy); ctx.rotate(th); ctx.globalAlpha = clamp(e * 1.4); ctx.fillStyle = pop(sc); ctx.fillRect(-D, -lw / 2, 2 * D, lw);
  } });

// horizontal bands each jump to their own magnification (parallax layers) and fall back
fx('xrBandZoom', { name: '段ズーム', en: 'Band Zoom', tags: ['pop', 'graphic', 'glitch'], w: 0.9, dur: 6, amp: 1, mid: true, scratch: true, ae: 'zoom',
  draw(ctx, ev, k, I) {
    const { cw, ch, S } = I; if (!S) return;
    const s = evS(ev), nb = 4 + (J.h(s, 1) % 3), e = punch(k, 0.22) * amp1(ev);
    if (e < 0.004) return;
    for (let b = 0; b < nb; b++) {
      const y0 = Math.round(b * ch / nb), y1 = Math.round((b + 1) * ch / nb), z = 1 + e * (0.03 + 0.2 * J.r(s, b, 2));
      ctx.save(); ctx.beginPath(); ctx.rect(0, y0, cw, y1 - y0); ctx.clip();
      drawScaled(ctx, S, z, cw * (0.5 + J.rs(s, b, 3) * 0.12), (y0 + y1) / 2, cw, ch);
      ctx.restore();
    }
  } });

// the picture twists like a ribbon: rows turn over (mirrored for a moment) one after another
fx('xrRibbonTwist', { name: 'ねじれ', en: 'Ribbon Twist', tags: ['pop', 'emotional', 'graphic'], w: 0.7, dur: 10, amp: 1, mid: true, scratch: true, ae: 'slice',
  draw(ctx, ev, k, I) {
    const { cw, ch, S, sc } = I; if (!S) return;
    const s = evS(ev), N = 40, down = J.r(s, 1) < 0.5;
    for (let i = 0; i < N; i++) {
      const y0 = Math.floor(i * ch / N), h = Math.floor((i + 1) * ch / N) - y0;
      const u = clamp((k - 0.5 * (down ? i / N : 1 - i / N)) / 0.5);
      if (u <= 0 || u >= 1) continue;
      const c = Math.cos(TAU * E.inOutCubic(u)), w = cw * Math.abs(c), x = (cw - w) / 2;
      ctx.fillStyle = sc.bg; ctx.fillRect(0, y0, cw, h);
      if (w < 1) continue;
      if (c < 0) { ctx.setTransform(-1, 0, 0, 1, cw, 0); ctx.drawImage(S, 0, y0, cw, h, x, y0, w, h); ctx.setTransform(1, 0, 0, 1, 0, 0); }
      else ctx.drawImage(S, 0, y0, cw, h, x, y0, w, h);
      ctx.fillStyle = `rgba(0,0,0,${((1 - Math.abs(c)) * 0.22).toFixed(3)})`; ctx.fillRect(x, y0, w, h);
    }
  } });

// slot machine: wide reels spin one full turn in alternate directions and stop one by one
fx('xrSlotReel', { name: 'リール回転', en: 'Slot Reels', tags: ['pop', 'graphic'], w: 0.7, dur: 10, pre: 3, amp: 1, mid: true, scratch: true, ae: 'slice',
  draw(ctx, ev, k, I) {
    const { cw, ch, S, sc } = I; if (!S || k >= 1) return;
    const s = evS(ev), n = (cw >= ch ? 3 : 2) + (J.h(s, 1) % 2), lag = 0.14, a = amp1(ev);
    bgFill(ctx, I);
    for (let i = 0; i < n; i++) {
      const x0 = Math.round(i * cw / n), w = Math.round((i + 1) * cw / n) - x0, u = clamp((k - i * lag) / (1 - (n - 1) * lag));
      const dir = (i + (J.h(s, 2) % 2)) % 2 ? -1 : 1, sp = bell(u) * ch * 0.035 * a;
      for (let c = 2; c >= 0; c--) {
        const o = ((dir * (E.inOutCubic(u) * ch + (c ? (c === 1 ? sp : -sp) : 0))) % ch + ch) % ch;
        ctx.globalAlpha = c ? 0.4 : 1;
        if (c && sp < 1) continue;
        ctx.drawImage(S, x0, 0, w, ch, x0, o, w, ch); ctx.drawImage(S, x0, 0, w, ch, x0, o - ch, w, ch);
      }
    }
    ctx.globalAlpha = 0.5 * bell(k); ctx.fillStyle = sc.fg;
    const lw = Math.max(1, Math.round(Math.min(cw, ch) * 0.003));
    for (let i = 1; i < n; i++) ctx.fillRect(Math.round(i * cw / n) - lw / 2, 0, lw, ch);
  } });

// the quadrants are pushed apart from the centre, leaving a cross-shaped gap
fx('xrCrossSplit', { name: '十字割り', en: 'Cross Split', tags: ['graphic', 'pop', 'editorial'], w: 1, dur: 6, amp: 1, mid: true, scratch: true, ae: 'block',
  draw(ctx, ev, k, I) {
    const { cw, ch, S, sc } = I; if (!S) return;
    const s = evS(ev), e = punch(k, 0.25), g = Math.min(cw, ch) * 0.04 * amp1(ev) * e;
    if (g < 0.5) return;
    const xs = Math.round(cw * (0.5 + J.rs(s, 1) * 0.1)), ys = Math.round(ch * (0.5 + J.rs(s, 2) * 0.06));
    bgFill(ctx, I);
    ctx.drawImage(S, 0, 0, xs, ys, -g, -g, xs, ys); ctx.drawImage(S, xs, 0, cw - xs, ys, xs + g, -g, cw - xs, ys);
    ctx.drawImage(S, 0, ys, xs, ch - ys, -g, ys + g, xs, ch - ys); ctx.drawImage(S, xs, ys, cw - xs, ch - ys, xs + g, ys + g, cw - xs, ch - ys);
    const lw = Math.max(1, Math.min(cw, ch) * 0.003);
    ctx.globalAlpha = clamp(e * 1.3); ctx.fillStyle = pop(sc); ctx.fillRect(xs - lw / 2, 0, lw, ch); ctx.fillRect(0, ys - lw / 2, cw, lw);
  } });

/* ================= copies ================= */
// the ink throws a solid coloured extrusion along a diagonal, then pulls it back in
fx('xrLongShadow', { name: 'ロングシャドウ', en: 'Long Shadow', tags: ['pop', 'graphic'], w: 1, dur: 7, amp: 1, mid: true, scratch: true, ae: 'chroma',
  draw(ctx, ev, k, I) {
    const { cw, ch, S, sc } = I; if (!S) return;
    const s = evS(ev), dk = isDark(sc.bg), e = ahr(k, 0.3, 0.6, E.outCubic, E.inOutCubic), L = Math.min(cw, ch) * 0.085 * amp1(ev) * e;
    if (L < 1) return;
    const hw = half(cw), hh = half(ch), T = inkMask(I.tmp(hw, hh), S, sc, J.r(s, 1) < 0.6 ? sc.accent : (sc.accent2 || sc.accent), dk);
    const ang = (J.r(s, 2) < 0.5 ? 45 : 135) * DEG, n = Math.max(2, Math.min(18, Math.ceil(L / Math.max(1, cw / 700))));
    ctx.globalCompositeOperation = dk ? 'lighten' : 'darken';
    for (let i = n; i >= 1; i--) ctx.drawImage(T, 0, 0, hw, hh, Math.cos(ang) * L * i / n, Math.sin(ang) * L * i / n, cw, ch);
    ctx.globalCompositeOperation = dk ? 'lighten' : 'darken'; ctx.drawImage(S, 0, 0);
  } });

// a waterline rises from the bottom edge: below it the picture is reflected, squashed and rippling
fx('xrWaterMirror', { name: '水鏡', en: 'Water Mirror', tags: ['emotional', 'calm'], w: 0.8, dur: 12, amp: 1, mid: true, scratch: true, ae: 'slice',
  draw(ctx, ev, k, I) {
    const { cw, ch, S, sc } = I; if (!S) return;
    const lift = ahr(k, 0.3, 0.68, E.outCubic, E.inCubic), depth = ch * 0.34 * clamp(ampOf(ev), 0.8, 1.1) * lift;
    if (depth < 2) return;
    const y0 = Math.round(ch - depth), N = 22, hs = depth / N, sh = hs * 1.55;
    ctx.fillStyle = sc.bg; ctx.fillRect(0, y0, cw, ch - y0);
    for (let j = 0; j < N; j++) {
      const sy = y0 - (j + 1) * sh; if (sy < 0) break;
      const dx = Math.sin(j * 0.85 + k * 16) * cw * 0.0035 * (1 + j * 0.22);
      ctx.setTransform(1, 0, 0, -1, dx, y0 + (j + 1) * hs); ctx.drawImage(S, 0, sy, cw, sh, 0, 0, cw, hs + 0.6);
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const g = ctx.createLinearGradient(0, y0, 0, ch);
    g.addColorStop(0, J.rgba(sc.bg, 0.3)); g.addColorStop(1, J.rgba(sc.bg, 0.8));
    ctx.fillStyle = g; ctx.fillRect(0, y0, cw, ch - y0);
    ctx.globalAlpha = 0.7 * lift; ctx.fillStyle = pop(sc); ctx.fillRect(0, y0 - 1, cw, Math.max(1, ch * 0.003));
  } });

// pendulum after-images: copies swing out to both sides around a pivot far below the frame
fx('xrSwingEcho', { name: '振り子残像', en: 'Swing Echo', tags: ['pop', 'emotional', 'graphic'], w: 0.9, dur: 7, amp: 1, mid: true, scratch: true, ae: 'shake',
  draw(ctx, ev, k, I) {
    const { cw, ch, S, sc } = I; if (!S) return;
    const s = evS(ev), e = punch(k, 0.3), th = 3.4 * DEG * amp1(ev) * e, up = J.r(s, 1) < 0.3;
    if (th < 0.0006) return;
    const px = cw / 2, py = up ? -ch * 0.9 : ch * 1.9;
    ctx.globalCompositeOperation = isDark(sc.bg) ? 'lighten' : 'darken';
    for (let i = 3; i >= 1; i--) for (const sg of [-1, 1]) {
      ctx.globalAlpha = clamp(e * 2) * (0.62 - i * 0.14);
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.translate(px, py); ctx.rotate(sg * th * i); ctx.drawImage(S, -px, -py);
    }
  } });

// the middle band of the picture is stamped again and again above and below, then folds back
fx('xrBandRepeat', { name: '帯リピート', en: 'Band Repeat', tags: ['graphic', 'pop', 'editorial'], w: 1, dur: 7, amp: 1, mid: true, scratch: true, ae: 'slice',
  draw(ctx, ev, k, I) {
    const { cw, ch, S, sc } = I; if (!S) return;
    const e = punch(k, 0.3), bh = Math.round(ch * 0.26), y0 = Math.round(ch / 2 - bh / 2), sp = bh * 0.92 * clamp(amp1(ev), 0.7, 1.1) * e;
    if (sp < 1) return;
    ctx.globalCompositeOperation = isDark(sc.bg) ? 'lighten' : 'darken';
    for (let i = 3; i >= 1; i--) for (const sg of [-1, 1]) {
      ctx.globalAlpha = clamp(e * 2.5) * (0.7 - i * 0.16);
      ctx.drawImage(S, 0, y0, cw, bh, 0, y0 + sg * sp * i, cw, bh);
    }
  } });

// picture in picture in picture: the frame recedes into nested, framed copies of itself
fx('xrNested', { name: '入れ子', en: 'Nested Frames', tags: ['graphic', 'pop', 'editorial'], w: 0.8, dur: 8, amp: 1, mid: true, scratch: true, ae: 'zoom',
  draw(ctx, ev, k, I) {
    const { cw, ch, S, sc } = I; if (!S) return;
    const s = evS(ev), e = punch(k, 0.3), f = 1 - 0.27 * amp1(ev) * e;
    if (f > 0.997) return;
    const cx = cw * (0.5 + J.rs(s, 1) * 0.08), cy = ch * (0.5 + J.rs(s, 2) * 0.06), lw = Math.max(1, Math.min(cw, ch) * 0.004);
    ctx.strokeStyle = pop(sc); ctx.lineWidth = lw;
    let z = 1;
    for (let i = 1; i <= 4; i++) {
      z *= f; const x = cx - cx * z, y = cy - cy * z;
      ctx.globalAlpha = 1; ctx.drawImage(S, 0, 0, cw, ch, x, y, cw * z, ch * z);
      ctx.globalAlpha = clamp(e * 1.5) * 0.85; ctx.strokeRect(x, y, cw * z, ch * z);
    }
  } });

// contact strip: a row of small framed copies of the frame pops up along one edge and drops away
fx('xrThumbRow', { name: 'サムネ列', en: 'Thumb Row', tags: ['pop', 'editorial', 'graphic'], w: 0.7, dur: 12, amp: 1, mid: true, scratch: true, ae: 'block',
  draw(ctx, ev, k, I) {
    const { cw, ch, S, sc } = I; if (!S) return;
    const s = evS(ev), n = cw >= ch ? 5 : 4, a = clamp(amp1(ev), 0.8, 1.15), tw = cw * 0.86 / n * 0.86 * a, th = tw * ch / cw, gap = (cw - n * tw) / (n + 1);
    const top = J.r(s, 1) < 0.35, yb = top ? ch * 0.045 : ch * 0.955 - th, rev = J.r(s, 2) < 0.5, lw = Math.max(1, Math.min(cw, ch) * 0.004);
    for (let i = 0; i < n; i++) {
      const o = (rev ? n - 1 - i : i) * 0.06;
      const z = E.outBack(clamp((k - o) / 0.22), 1.6) * (1 - E.inCubic(clamp((k - 0.66 - o * 0.5) / 0.2)));
      if (z < 0.02) continue;
      const w = tw * z, h = th * z, x = gap + i * (tw + gap) + (tw - w) / 2, y = yb + (th - h) / 2;
      ctx.fillStyle = sc.bg; ctx.fillRect(x, y, w, h);
      ctx.drawImage(S, 0, 0, cw, ch, x, y, w, h);
      ctx.strokeStyle = i % 2 ? sc.fg : pop(sc); ctx.lineWidth = lw; ctx.strokeRect(x, y, w, h);
    }
  } });

// a round magnifier glides across the frame
fx('xrLoupe', { name: '虫めがね', en: 'Loupe Pass', tags: ['pop', 'editorial', 'calm'], w: 0.8, dur: 12, amp: 1, mid: true, scratch: true, ae: 'zoom',
  draw(ctx, ev, k, I) {
    const { cw, ch, S, sc } = I; if (!S) return;
    const s = evS(ev), m = Math.min(cw, ch), r = m * 0.21 * Math.sqrt(amp1(ev)) * ahr(k, 0.22, 0.75, x => E.outBack(x, 1.4), E.inCubic);
    if (!(r >= 1)) return;
    const dir = J.r(s, 1) < 0.5, p = E.inOutSine(k), x = cw * (dir ? lerp(0.26, 0.74, p) : lerp(0.74, 0.26, p)), y = ch * (0.5 + J.rs(s, 2) * 0.05) - Math.sin(p * Math.PI) * ch * 0.03, z = 1.6;
    ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.clip();
    ctx.fillStyle = sc.bg; ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
    ctx.drawImage(S, 0, 0, cw, ch, x - x * z, y - y * z, cw * z, ch * z);
    ctx.restore();
    const lw = Math.max(1.5, m * 0.007);
    ctx.strokeStyle = sc.fg; ctx.lineWidth = lw; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
    ctx.strokeStyle = pop(sc); ctx.lineWidth = lw * 0.6; ctx.globalAlpha = 0.8; if (r > lw * 3) { ctx.beginPath(); ctx.arc(x, y, r - lw * 1.6, -2.4, -1.5); ctx.stroke(); }
  } });

/* ================= light ================= */
// accent bars slam in from two opposite edges with a glow and retract
fx('xrEdgeBars', { name: '端フラッシュ', en: 'Edge Bars', tags: ['pop', 'graphic', 'editorial'], w: 1.1, dur: 6, amp: 1, mid: true, ae: 'flash',
  draw(ctx, ev, k, I) {
    const { cw, ch, sc } = I, s = evS(ev), vert = J.r(s, 1) < (cw >= ch ? 0.3 : 0.55), L = vert ? cw : ch, M = vert ? ch : cw;
    const e = k < 0.14 ? E.outExpo(k / 0.14) : Math.pow(1 - (k - 0.14) / 0.86, 1.6), th = L * 0.06 * amp1(ev) * e, col = pop(sc);
    if (th < 0.5) return;
    const R = (a, w) => (vert ? ctx.fillRect(a, 0, w, M) : ctx.fillRect(0, a, M, w));
    const gl = L * 0.2 * e;
    for (const sd of [0, 1]) {
      const g = vert ? ctx.createLinearGradient(sd ? cw : 0, 0, sd ? cw - gl : gl, 0) : ctx.createLinearGradient(0, sd ? ch : 0, 0, sd ? ch - gl : gl);
      g.addColorStop(0, J.rgba(col, 0.5 * e)); g.addColorStop(1, J.rgba(col, 0));
      ctx.globalCompositeOperation = isDark(sc.bg) ? 'screen' : 'multiply'; ctx.fillStyle = g; R(sd ? L - gl : 0, gl);
      ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = col; R(sd ? L - th : 0, th);
      ctx.fillStyle = sc.fg; ctx.globalAlpha = e; R(sd ? L - th * 1.45 : th * 1.3, th * 0.15); ctx.globalAlpha = 1;
    }
  } });

// everything goes dim except a round pool of light that travels across the frame
fx('xrSpotlight', { name: 'スポット', en: 'Spotlight Pass', tags: ['emotional', 'calm', 'editorial'], w: 0.9, dur: 12, amp: 1, mid: true, ae: 'flash',
  draw(ctx, ev, k, I) {
    const { cw, ch, sc } = I, s = evS(ev), a = ahr(k, 0.2, 0.72) * clamp(ampOf(ev), 0.6, 1.1);
    if (a < 0.01) return;
    const r = Math.min(cw, ch) * 0.3, dir = J.r(s, 1) < 0.5, p = E.inOutSine(k);
    const x = cw * (dir ? lerp(0.2, 0.8, p) : lerp(0.8, 0.2, p)), y = ch * (0.5 + J.rs(s, 2) * 0.06), col = shade(sc);
    const g = ctx.createRadialGradient(x, y, r * 0.7, x, y, r * 1.3);
    g.addColorStop(0, J.rgba(col, 0)); g.addColorStop(1, J.rgba(col, (isDark(sc.bg) ? 0.8 : 0.6) * a));
    ctx.fillStyle = g; ctx.fillRect(0, 0, cw, ch);
  } });

// three hard flashes, each in a different scheme colour
fx('xrColorStrobe', { name: '色ストロボ', en: 'Color Strobe', tags: ['pop', 'glitch', 'graphic'], w: 0.7, dur: 6, amp: 1, mid: true, ae: 'flash',
  draw(ctx, ev, k, I) {
    const { cw, ch, sc } = I, s = evS(ev), cols = tints(sc), seg = Math.min(2, Math.floor(k * 3)), fr = k * 3 - seg;
    const a = clamp(ampOf(ev), 0.5, 1) * (1 - 0.55 * fr) * (1 - k * k * k), col = cols[(seg + (J.h(s, 1) % cols.length)) % cols.length];
    if (a < 0.01) return;
    ctx.globalAlpha = 0.95 * a; ctx.globalCompositeOperation = isDark(sc.bg) ? 'multiply' : 'screen'; ctx.fillStyle = col; ctx.fillRect(0, 0, cw, ch);
    ctx.globalAlpha = 0.22 * a; ctx.globalCompositeOperation = 'source-over'; ctx.fillRect(0, 0, cw, ch);
  } });

// the exposure sags, then recovers slightly too bright before settling
fx('xrExposureDip', { name: '露出落ち', en: 'Exposure Dip', tags: ['emotional', 'calm', 'editorial'], w: 1, dur: 9, pre: 3, amp: 1, mid: true, ae: 'flash',
  draw(ctx, ev, k, I) {
    const { cw, ch, sc } = I, a = clamp(ampOf(ev), 0.6, 1.1), dk = isDark(sc.bg);
    const d = k < 0.28 ? E.outCubic(k / 0.28) : 1 - E.inOutCubic(clamp((k - 0.28) / 0.34)), o = k > 0.55 ? bell((k - 0.55) / 0.45) : 0;
    if (d > 0.005) { ctx.fillStyle = J.rgba(shade(sc), (dk ? 0.86 : 0.7) * a * d); ctx.fillRect(0, 0, cw, ch); }
    if (o > 0.005) {
      if (dk) { ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = J.rgba(sc.fg, 0.13 * a * o); }
      else ctx.fillStyle = `rgba(255,255,255,${(0.4 * a * o).toFixed(3)})`;
      ctx.fillRect(0, 0, cw, ch);
    }
  } });

// cells of a coarse grid light up one after another in a diagonal run
fx('xrTileLights', { name: 'タイル点灯', en: 'Tile Lights', tags: ['pop', 'graphic'], w: 0.9, dur: 8, amp: 1, mid: true, ae: 'flash',
  draw(ctx, ev, k, I) {
    const { cw, ch, sc } = I, s = evS(ev), m = Math.min(cw, ch), gx = Math.max(3, Math.round(cw / (m / 4.5))), gy = Math.max(3, Math.round(ch / (m / 4.5)));
    const dk = isDark(sc.bg), a = clamp(ampOf(ev), 0.6, 1.2), cols = tints(sc), rev = J.r(s, 1) < 0.5, gp = Math.max(1, Math.round(m * 0.004));
    ctx.globalCompositeOperation = dk ? 'screen' : 'multiply';
    for (let j = 0; j < gy; j++) for (let i = 0; i < gx; i++) {
      if (J.r(s, i, j, 2) > 0.62) continue;
      const u = clamp((k - ((rev ? gx - 1 - i : i) + j) / (gx + gy - 2) * 0.62) / 0.38);
      if (u <= 0 || u >= 1) continue;
      const x0 = Math.round(i * cw / gx), x1 = Math.round((i + 1) * cw / gx), y0 = Math.round(j * ch / gy), y1 = Math.round((j + 1) * ch / gy);
      ctx.globalAlpha = Math.min(1, (u < 0.2 ? 1 : 1 - E.outQuad((u - 0.2) / 0.8)) * 0.62 * a);
      ctx.fillStyle = cols[J.h(s, i, j, 3) % cols.length]; ctx.fillRect(x0 + gp, y0 + gp, x1 - x0 - 2 * gp, y1 - y0 - 2 * gp);
    }
  } });

// two hairlines sweep in from the edges, lock on a point with a reticle flash and let go
fx('xrCrosshair', { name: '照準ロック', en: 'Target Lock', tags: ['graphic', 'editorial', 'glitch'], w: 0.8, dur: 10, amp: 1, mid: true, ae: 'flash',
  draw(ctx, ev, k, I) {
    const { cw, ch, sc } = I, s = evS(ev), m = Math.min(cw, ch), a = clamp(ampOf(ev), 0.7, 1.3), col = pop(sc);
    const tx = Math.round(cw * (0.5 + J.rs(s, 1) * 0.16)), ty = Math.round(ch * (0.5 + J.rs(s, 2) * 0.12)), lw = Math.max(1, Math.round(m * 0.004 * a));
    const p = E.outExpo(clamp(k / 0.42)), fade = k > 0.62 ? 1 - E.inQuad((k - 0.62) / 0.38) : 1;
    const x = lerp(J.r(s, 3) < 0.5 ? 0 : cw, tx, p), y = lerp(J.r(s, 4) < 0.5 ? 0 : ch, ty, p);
    ctx.globalAlpha = fade * clamp(k * 12); ctx.fillStyle = col;
    ctx.fillRect(x - lw / 2, 0, lw, ch); ctx.fillRect(0, y - lw / 2, cw, lw);
    if (k > 0.38) {
      const q = (k - 0.38) / 0.62, r = m * 0.045 * a * (1 + 1.6 * E.outCubic(q)), t = r * 0.45;
      ctx.globalAlpha = 1 - E.inQuad(q); ctx.strokeStyle = sc.fg; ctx.lineWidth = lw * 1.5; ctx.beginPath();
      for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { ctx.moveTo(tx + sx * r, ty + sy * (r - t)); ctx.lineTo(tx + sx * r, ty + sy * r); ctx.lineTo(tx + sx * (r - t), ty + sy * r); }
      ctx.stroke();
      if (q < 0.25) { ctx.globalCompositeOperation = 'difference'; ctx.globalAlpha = 1; ctx.fillStyle = '#ffffff'; ctx.fillRect(tx - r, ty - r, 2 * r, 2 * r); }
    }
  } });

// lamp on its way out: irregular dimming steps
fx('xrLampFlicker', { name: '明滅', en: 'Lamp Flicker', tags: ['emotional', 'glitch', 'calm'], w: 0.8, dur: 8, amp: 1, glitchy: true, mid: true, ae: 'flash',
  draw(ctx, ev, k, I) {
    const { cw, ch, sc } = I, s = evS(ev), v = J.r(I.step, s, 1);
    const lvl = k < 0.12 ? 0.8 : v < 0.3 ? 0.78 : v < 0.55 ? 0.42 : v < 0.75 ? 0.14 : 0;
    const a = Math.min(0.88, lvl * clamp(ampOf(ev), 0.6, 1.15) * Math.pow(1 - k, 0.6));
    if (a < 0.01) return;
    ctx.fillStyle = J.rgba(shade(sc), a); ctx.fillRect(0, 0, cw, ch);
  } });

// exposure warning: moving diagonal stripes cut through the ink only
fx('xrZebra', { name: 'ゼブラ', en: 'Zebra Stripes', tags: ['graphic', 'editorial', 'glitch'], w: 0.7, dur: 8, amp: 1, mid: true, ae: 'invert',
  draw(ctx, ev, k, I) {
    const { cw, ch, sc } = I, s = evS(ev), e = ahr(k, 0.22, 0.7), D = Math.hypot(cw, ch) / 2 + 2, p = Math.max(6, Math.min(cw, ch) / 26);
    const duty = 0.5 * e * clamp(ampOf(ev), 0.7, 1.1);
    if (duty < 0.02) return;
    ctx.globalCompositeOperation = isDark(sc.bg) ? 'multiply' : 'screen'; ctx.fillStyle = sc.bg;
    ctx.translate(cw / 2, ch / 2); ctx.rotate((J.r(s, 1) < 0.5 ? 45 : -45) * DEG);
    const o = (k * 3 * p) % p;
    ctx.beginPath();
    for (let x = -D + o - p, i = 0; x < D && i < 400; x += p, i++) ctx.rect(x, -D, p * duty, 2 * D);
    ctx.fill();
  } });

/* ================= colour ================= */
// the ink splits into two scheme-tinted copies: one stretched tall, one stretched wide
fx('xrCrossFringe', { name: '十字色ズレ', en: 'Cross Fringe', tags: ['glitch', 'emotional', 'pop'], w: 1, dur: 5, amp: 1, glitchy: true, mid: true, scratch: true, ae: 'chroma',
  draw(ctx, ev, k, I) {
    const { cw, ch, S, sc } = I; if (!S) return;
    const dk = isDark(sc.bg), d = 0.1 * amp1(ev) * punch(k, 0.2);
    if (d < 0.002) return;
    const hw = half(cw), hh = half(ch), s = evS(ev), sw = J.r(s, 1) < 0.5;
    const T1 = inkMask(I.tmp(hw, hh), S, sc, sw ? sc.ghostB : sc.ghostA, dk), T2 = inkMask(I.tmp2(hw, hh), S, sc, sw ? sc.ghostA : sc.ghostB, dk);
    ctx.globalCompositeOperation = dk ? 'screen' : 'multiply'; ctx.globalAlpha = 0.95;
    ctx.drawImage(T1, 0, 0, hw, hh, 0, -ch * d * 1.6 / 2, cw, ch * (1 + d * 1.6));
    ctx.drawImage(T2, 0, 0, hw, hh, -cw * d / 2, 0, cw * (1 + d), ch);
  } });

// negative squares swell out of a chequered grid, swap phase and shrink away
fx('xrCheckerInvert', { name: 'チェック反転', en: 'Checker Invert', tags: ['graphic', 'pop', 'glitch'], w: 0.6, dur: 8, amp: 1, mid: true, ae: 'invert',
  draw(ctx, ev, k, I) {
    const { cw, ch } = I, s = evS(ev), c = Math.min(cw, ch) / (4 + (J.h(s, 1) % 2)), nx = Math.ceil(cw / c / 2) * 2 + 1, ny = Math.ceil(ch / c / 2) * 2 + 1;
    const e = (k < 0.5 ? ahr(k * 2, 0.5, 0.82) : ahr((k - 0.5) * 2, 0.18, 0.5)) * Math.min(1, ampOf(ev)), ph = k < 0.5 ? 0 : 1, sd = c * e;
    if (sd < 0.5) return;
    const ox = (cw - nx * c) / 2, oy = (ch - ny * c) / 2;
    ctx.globalCompositeOperation = 'difference'; ctx.fillStyle = '#ffffff'; ctx.beginPath();
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) if ((i + j + ph) % 2 === 0) ctx.rect(ox + i * c + (c - sd) / 2, oy + j * c + (c - sd) / 2, sd, sd);
    ctx.fill();
  } });

// resolution collapses along one axis only: the picture turns into flat bars and resolves again
fx('xrStripeMosaic', { name: '縞モザイク', en: 'Stripe Mosaic', tags: ['glitch', 'graphic', 'pop'], w: 0.8, dur: 6, amp: 1, glitchy: true, mid: true, scratch: true, ae: 'mosaic',
  draw(ctx, ev, k, I) {
    const { cw, ch, S } = I; if (!S) return;
    const s = evS(ev), e = punch(k, 0.3), rows = J.r(s, 1) < 0.3, L = rows ? ch : cw;
    const n = Math.max(6, Math.round(lerp(L / 3, L / (40 + 50 * clamp(ampOf(ev) - 0.3)), E.outCubic(e))));
    if (e < 0.02) return;
    const w = rows ? half(cw) : n, h = rows ? n : half(ch), T = I.tmp(w, h), x = cx2(T);
    x.globalCompositeOperation = 'copy'; x.drawImage(S, 0, 0, w, h); x.globalCompositeOperation = 'source-over';
    ctx.imageSmoothingEnabled = false; ctx.globalAlpha = clamp(e * 3);
    ctx.drawImage(T, 0, 0, w, h, 0, 0, cw, ch);
  } });

// four quadrants, four scheme tints, trading places every two frames
fx('xrFourTints', { name: '四色パネル', en: 'Four Tints', tags: ['pop', 'graphic'], w: 0.8, dur: 8, amp: 1, mid: true, ae: 'chroma',
  draw(ctx, ev, k, I) {
    const { cw, ch, sc } = I, s = evS(ev), a = ahr(k, 0.12, 0.7) * Math.min(1, ampOf(ev)), rot = Math.floor(k * 4) + (J.h(s, 1) % 4);
    if (a < 0.01) return;
    const base = tints(sc), cols = [0, 1, 2, 3].map(i => (i < base.length ? base[i] : J.mix(base[i % base.length], sc.fg, 0.5)));
    const xs = Math.round(cw / 2), ys = Math.round(ch / 2), Q = [[0, 0, xs, ys], [xs, 0, cw - xs, ys], [xs, ys, cw - xs, ch - ys], [0, ys, xs, ch - ys]];
    for (let q = 0; q < 4; q++) {
      ctx.fillStyle = cols[(q + rot) % 4];
      ctx.globalCompositeOperation = isDark(sc.bg) ? 'multiply' : 'screen'; ctx.globalAlpha = 0.95 * a; ctx.fillRect(...Q[q]);
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 0.2 * a; ctx.fillRect(...Q[q]);
    }
  } });

// a clock hand sweeps round and leaves the picture negative behind it; a second sweep puts it right
fx('xrClockInvert', { name: '時計反転', en: 'Clock Invert', tags: ['graphic', 'pop', 'editorial'], w: 0.8, dur: 10, pre: 5, amp: 1, mid: true, ae: 'invert',
  draw(ctx, ev, k, I) {
    const { cw, ch, sc } = I, s = evS(ev), cx = cw / 2, cy = ch / 2, R = Math.hypot(cw, ch), a0 = -Math.PI / 2 + (J.h(s, 1) % 4) * Math.PI / 2, ccw = J.r(s, 2) < 0.5;
    const b = k < 0.5 ? 0 : E.inOutCubic((k - 0.5) * 2), f = k < 0.5 ? E.inOutCubic(k * 2) : 1;
    if (f - b < 0.002) return;
    const sg = ccw ? -1 : 1, A = a0 + sg * TAU * b, B = a0 + sg * TAU * f;
    ctx.globalCompositeOperation = 'difference'; ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, R, A, B, ccw); ctx.closePath(); ctx.fill();
    ctx.globalCompositeOperation = 'source-over'; ctx.strokeStyle = pop(sc); ctx.lineWidth = Math.max(1.5, Math.min(cw, ch) * 0.005);
    const h = k < 0.5 ? B : A;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(h) * R, cy + Math.sin(h) * R); ctx.stroke();
  } });

/* ================= texture ================= */
// fine scan lines burst open into thick bars that cut through the picture while scrolling
fx('xrScanBurst', { name: '走査線バースト', en: 'Scanline Burst', tags: ['glitch', 'graphic', 'emotional'], w: 0.9, dur: 6, amp: 1, glitchy: true, mid: true, ae: 'slice',
  draw(ctx, ev, k, I) {
    const { cw, ch, sc } = I, s = evS(ev), a = Math.pow(1 - k, 0.9) * Math.min(1, ampOf(ev));
    if (a < 0.01) return;
    const p = lerp(Math.max(4, ch / 150), ch / 8, E.inQuad(k)), th = p * 0.5 * (0.35 + 0.65 * a), o = ((k * ch * 0.35 * (J.r(s, 1) < 0.5 ? 1 : -1)) % p + p) % p;
    ctx.globalAlpha = Math.min(1, a * 1.6); ctx.fillStyle = sc.bg; ctx.beginPath();
    for (let y = o - p, i = 0; y < ch && i < 600; y += p, i++) ctx.rect(0, y, cw, th);
    ctx.fill();
    ctx.globalAlpha = 0.5 * a; ctx.fillStyle = pop(sc); ctx.beginPath();
    const hl = Math.max(1, ch * 0.0015);
    if (p > ch / 40) for (let y = o - p, i = 0; y < ch && i < 80; y += p, i++) ctx.rect(0, y + th, cw, hl);
    ctx.fill();
  } });

// a ring of printed dots rolls out from one corner across the frame
fx('xrDotWave', { name: 'ドット波', en: 'Dot Wave', tags: ['pop', 'graphic'], w: 0.9, dur: 9, amp: 1, mid: true, ae: 'mosaic',
  draw(ctx, ev, k, I) {
    const { cw, ch, sc } = I, s = evS(ev), m = Math.min(cw, ch), p = m / 19, cn = J.h(s, 1) % 4, ox = cn & 1 ? cw : 0, oy = cn & 2 ? ch : 0;
    const D = Math.hypot(cw, ch), band = D * 0.2, R = lerp(-band, D + band, E.outQuad(k)), rm = p * 0.47 * clamp(ampOf(ev), 0.7, 1.05);
    ctx.fillStyle = pop(sc); ctx.beginPath();
    const nx = Math.ceil(cw / p) + 1, ny = Math.ceil(ch / p) + 1;
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const x = (i + (j % 2) * 0.5) * p, y = j * p, d = Math.abs(Math.hypot(x - ox, y - oy) - R) / band;
      if (d >= 1) continue;
      const r = rm * Math.cos(d * Math.PI / 2);
      if (r < 0.4) continue;
      ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, TAU);
    }
    ctx.fill();
  } });

// signal dropout: grid-aligned rectangles of the picture go missing, fewer every frame
fx('xrDropout', { name: '欠落', en: 'Dropout', tags: ['glitch'], w: 0.9, dur: 5, amp: 1, glitchy: true, mid: true, ae: 'block',
  draw(ctx, ev, k, I) {
    const { cw, ch, sc } = I, s = evS(ev), st = I.step * 29 + s, B = Math.max(4, Math.round(Math.min(cw, ch) / 10));
    const n = Math.round((4 + (J.h(s, 1) % 4)) * amp1(ev) * (1 - k)), nx = Math.ceil(cw / B), ny = Math.ceil(ch / B), lw = Math.max(1, Math.round(B * 0.05));
    for (let i = 0; i < n; i++) {
      const gw = 1 + (J.h(st, i, 2) % 4), gh = 1 + (J.h(st, i, 3) % 2);
      const x = (J.h(st, i, 4) % Math.max(1, nx - gw + 1)) * B, y = Math.round(ny * (0.2 + 0.6 * J.r(st, i, 5)) - gh / 2) * B;
      ctx.fillStyle = sc.bg; ctx.fillRect(x, y, gw * B, gh * B);
      ctx.fillStyle = J.r(st, i, 6) < 0.5 ? sc.ghostA : sc.ghostB; ctx.globalAlpha = 0.8;
      if (J.r(st, i, 7) < 0.5) ctx.fillRect(x, y, lw, gh * B); else ctx.fillRect(x, y + gh * B - lw, gw * B, lw);
      ctx.globalAlpha = 1;
    }
  } });

// a crease travels through the tape: a squeezed, side-slipped band with a bright fold line
fx('xrTapeCrease', { name: 'テープ折れ', en: 'Tape Crease', tags: ['glitch', 'emotional'], w: 0.9, dur: 8, amp: 1, glitchy: true, mid: true, scratch: true, ae: 'slice',
  draw(ctx, ev, k, I) {
    const { cw, ch, S, sc } = I; if (!S) return;
    const s = evS(ev), amt = Math.pow(bell(k), 0.6), a = amp1(ev), up = J.r(s, 1) < 0.5, dir = J.r(s, 2) < 0.5 ? 1 : -1;
    const y0 = ch * (up ? lerp(0.8, 0.2, k) : lerp(0.2, 0.8, k)), hb = ch * 0.05 * a * amt;
    if (hb < 1) return;
    const M = 12, sq = 1.8;
    ctx.fillStyle = sc.bg; ctx.fillRect(0, y0 - hb, cw, 2 * hb);
    for (let j = 0; j < M; j++) {
      const v = j / M, tri = 1 - Math.abs(2 * (v + 0.5 / M) - 1);
      ctx.drawImage(S, 0, y0 - sq * hb + 2 * sq * hb * v, cw, 2 * sq * hb / M, dir * cw * 0.04 * a * amt * tri, y0 - hb + 2 * hb * v, cw, 2 * hb / M + 0.6);
    }
    const lw = Math.max(1, ch * 0.003);
    ctx.fillStyle = isDark(sc.bg) ? `rgba(255,255,255,${(0.6 * amt).toFixed(3)})` : J.rgba(shade(sc), 0.45 * amt); ctx.fillRect(0, y0 - lw / 2, cw, lw);
    ctx.fillStyle = `rgba(0,0,0,${(0.3 * amt).toFixed(3)})`; ctx.fillRect(0, y0 + lw / 2, cw, hb * 0.5);
  } });

// two sets of concentric rings drift apart and interfere
fx('xrMoire', { name: 'モアレ', en: 'Moire Rings', tags: ['graphic', 'emotional', 'calm'], w: 0.7, dur: 10, amp: 1, mid: true,
  draw(ctx, ev, k, I) {
    const { cw, ch, sc } = I, s = evS(ev), m = Math.min(cw, ch), g = m / 24, e = ahr(k, 0.25, 0.6, E.outCubic, E.inOutCubic);
    const al = 0.2 * e * clamp(ampOf(ev), 0.6, 1.1);
    if (al < 0.01) return;
    const R = Math.hypot(cw, ch) * 0.56, n = Math.min(60, Math.ceil(R / g)), ang = J.r(s, 1) * TAU + k * 0.9, sep = m * (0.03 + 0.1 * k);
    ctx.strokeStyle = J.rgba(sc.fg, al); ctx.lineWidth = g * 0.32;
    for (const sg of [-1, 1]) {
      const cx = cw / 2 + Math.cos(ang) * sep * sg, cy = ch / 2 + Math.sin(ang) * sep * sg;
      ctx.beginPath();
      for (let i = 1; i <= n; i++) { ctx.moveTo(cx + i * g, cy); ctx.arc(cx, cy, i * g, 0, TAU); }
      ctx.stroke();
    }
  } });

// stray pixels: small grid-snapped squares in scheme colours pop all over the frame
fx('xrPixelSparks', { name: '画素はじけ', en: 'Pixel Sparks', tags: ['pop', 'glitch'], w: 0.9, dur: 6, amp: 1, mid: true, ae: 'block',
  draw(ctx, ev, k, I) {
    const { cw, ch, sc } = I, s = evS(ev), st = I.step * 17 + s, q = Math.max(2, Math.round(Math.min(cw, ch) * 0.016));
    const n = Math.round(54 * amp1(ev) * Math.pow(bell(k), 0.7)), cols = tints(sc).concat([sc.fg]);
    for (let i = 0; i < n; i++) {
      const z = q * (1 + (J.h(st, i, 1) % 3)), x = Math.floor(J.r(st, i, 2) * cw / q) * q, y = Math.floor(J.r(st, i, 3) * ch / q) * q;
      ctx.fillStyle = cols[J.h(st, i, 4) % cols.length];
      if (J.r(st, i, 5) < 0.3) ctx.fillRect(x, y, z * (2 + (J.h(st, i, 6) % 4)), q); else ctx.fillRect(x, y, z, z);
    }
  } });

/* ================= framing ================= */
// cinema bars snap shut to a wide frame with a little overshoot, then open again
fx('xrLetterSnap', { name: '帯スナップ', en: 'Letterbox Snap', tags: ['editorial', 'emotional', 'graphic'], w: 1.1, dur: 10, pre: 3, amp: 1, mid: true,
  draw(ctx, ev, k, I) {
    const { cw, ch, sc } = I, e = k < 0.22 ? E.outBack(k / 0.22, 2.2) : k > 0.7 ? 1 - E.inCubic((k - 0.7) / 0.3) : 1;
    const hb = ch * (cw >= ch ? 0.125 : 0.075) * clamp(ampOf(ev), 0.7, 1.2) * e;
    if (hb < 0.5) return;
    const dkst = [sc.ink, sc.fg, sc.bg].reduce((p, c) => (J.lum(c) < J.lum(p) ? c : p));
    const col = J.contrast(dkst, sc.bg) > 1.25 ? dkst : J.mix(sc.bg, sc.fg, 0.2), lw = Math.max(1, ch * 0.003);
    ctx.fillStyle = col; ctx.fillRect(0, 0, cw, hb); ctx.fillRect(0, ch - hb, cw, hb);
    ctx.fillStyle = pop(sc); ctx.globalAlpha = clamp(e); ctx.fillRect(0, hb, cw, lw); ctx.fillRect(0, ch - hb - lw, cw, lw);
  } });

// eyelids: the frame closes to a slit like a blinking eye and opens again
fx('xrBlink', { name: 'まばたき', en: 'Eye Blink', tags: ['emotional', 'calm', 'editorial'], w: 0.9, dur: 9, pre: 4, amp: 1,
  draw(ctx, ev, k, I) {
    const { cw, ch, sc } = I, b = 4 / 9, c = k < b ? E.inQuad(k / b) : 1 - E.outQuad((k - b) / (1 - b));
    if (c < 0.003) return;
    const rx = cw * 0.8 * Math.pow(1 - c, 0.22), ry = ch * 0.86 * (1 - c), cx = cw / 2, cy = ch / 2;
    ctx.fillStyle = J.lum(sc.bg) < 0.08 ? J.mix(sc.bg, sc.fg, 0.1) : shade(sc);
    ctx.beginPath(); ctx.rect(0, 0, cw, ch);
    if (ry > 0.5) { ctx.moveTo(cx + rx, cy); ctx.ellipse(cx, cy, rx, ry, 0, 0, TAU); }
    ctx.fill('evenodd');
    if (ry > 1) { ctx.globalAlpha = clamp(c * 2); ctx.strokeStyle = pop(sc); ctx.lineWidth = Math.max(1.5, ch * 0.005); ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, TAU); ctx.stroke(); }
  } });

// a thick coloured border punches in while the picture steps back inside it
fx('xrBorderPunch', { name: '枠パンチ', en: 'Border Punch', tags: ['pop', 'graphic', 'editorial'], w: 1.2, dur: 7, amp: 1, mid: true, scratch: true, ae: 'zoom',
  draw(ctx, ev, k, I) {
    const { cw, ch, S, sc } = I; if (!S) return;
    const e = k < 0.2 ? E.outBack(k / 0.2, 2) : 1 - E.inOutCubic((k - 0.2) / 0.8), a = amp1(ev), t = Math.min(cw, ch) * 0.055 * a * e;
    if (t < 0.5) return;
    const z = 1 - 0.07 * a * e;
    bgFill(ctx, I); drawScaled(ctx, S, z, cw / 2, ch / 2, cw, ch);
    ctx.fillStyle = pop(sc);
    ctx.fillRect(0, 0, cw, t); ctx.fillRect(0, ch - t, cw, t); ctx.fillRect(0, t, t, ch - 2 * t); ctx.fillRect(cw - t, t, t, ch - 2 * t);
    const lw = Math.max(1, Math.min(cw, ch) * 0.003), o = t * 1.35;
    ctx.globalAlpha = clamp(e); ctx.strokeStyle = sc.fg; ctx.lineWidth = lw; ctx.strokeRect(o, o, cw - 2 * o, ch - 2 * o);
  } });

// one corner of the picture is dog-eared: the flap folds over, shows its back and flattens again
fx('xrCornerFold', { name: '角折れ', en: 'Corner Fold', tags: ['editorial', 'pop', 'calm'], w: 0.8, dur: 10, amp: 1, mid: true,
  draw(ctx, ev, k, I) {
    const { cw, ch, sc } = I, s = evS(ev), cn = J.h(s, 1) % 4, f = Math.min(cw, ch) * 0.4 * amp1(ev) * ahr(k, 0.3, 0.62, E.outCubic, E.inOutCubic);
    if (f < 1) return;
    ctx.setTransform(cn & 1 ? -1 : 1, 0, 0, cn & 2 ? -1 : 1, cn & 1 ? cw : 0, cn & 2 ? ch : 0);
    const tri = (x0, y0, x1, y1, x2, y2) => { ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.lineTo(x2, y2); ctx.closePath(); ctx.fill(); };
    const sh = ctx.createLinearGradient(f / 2, f / 2, f * 0.68, f * 0.68);
    sh.addColorStop(0, 'rgba(0,0,0,0.34)'); sh.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = sh; tri(f * 1.25, 0, 0, f * 1.25, f * 1.25, f * 1.25);          // shadow the flap casts on the page
    ctx.fillStyle = pop(sc); tri(0, 0, f, 0, 0, f);                                 // what is under the lifted corner
    ctx.fillStyle = J.mix(sc.bg, sc.fg, isDark(sc.bg) ? 0.24 : 0.1); tri(f, 0, 0, f, f, f);   // the back of the flap
    const g = ctx.createLinearGradient(f / 2, f / 2, f, f);
    g.addColorStop(0, 'rgba(0,0,0,0.28)'); g.addColorStop(0.5, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(255,255,255,0.1)');
    ctx.fillStyle = g; tri(f, 0, 0, f, f, f);
    ctx.strokeStyle = sc.fg; ctx.globalAlpha = 0.6; ctx.lineWidth = Math.max(1, Math.min(cw, ch) * 0.003);
    ctx.beginPath(); ctx.moveTo(f, 0); ctx.lineTo(0, f); ctx.stroke();
  } });
})();
