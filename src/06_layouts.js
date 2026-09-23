/* ============================================================
   JIZURA — layouts (how a chunk of lyric is composed on screen)
   plan(rng, cut, st)  -> params stored in the cut (also exported to AE)
   render(env)         -> draws; returns bbox of the main text for decor
   ============================================================ */
(() => {
'use strict';
const E = J.E;

/* ---------- main-item pipeline: enter / hold / exit + draw ---------- */
J.mainDraw = (env, it) => {
  const cut = env.cut;
  it.seed = it.seed != null ? it.seed : J.h(cut.seed, (it.mi | 0) + 1, 7);
  it.charFns = []; it.pieceFns = [];
  const stagger = cut.stagger || 0;
  it.delay = (it.mi | 0) * stagger;
  const ctx = { dur: cut.dur, inDur: cut.inDur, outDur: cut.outDur };
  const lt0 = env.lt;
  const ltI = lt0 - it.delay;
  const pIn = J.clamp(ltI / Math.max(0.01, cut.inDur));
  const outStart = cut.dur - cut.outDur;
  const pOut = cut.outDur > 0 ? J.clamp((lt0 - outStart) / cut.outDur) : 0;
  const en = J.ENTER[it.enter || cut.enter] || J.ENTER.cut;
  const ex = J.EXIT[it.exit || cut.exit] || J.EXIT.cut;
  const ho = J.HOLD[it.hold || cut.hold] || J.HOLD.still;
  // text treatment (outline, extrude, marker...) — layouts that paint their own plates opt out with it.plain
  if (cut.treat && !it.plain && J.TREAT && J.TREAT[cut.treat]) { try { J.TREAT[cut.treat].apply(env, it, cut.treatP || {}); } catch (e) { console.warn('treat', cut.treat, e); } }
  if (ltI < 0 && en === J.ENTER.cut) return null;
  if (en !== J.ENTER.cut && (pIn < 1 || en.pieces)) { env.lt = ltI; en.apply(env, it, pIn, ctx); env.lt = lt0; }
  if (ltI < 0 && !en.pieces) return null;
  const amt = J.clamp((ltI - cut.inDur * 0.85) / 0.25) * (1 - pOut);
  if (amt > 0 && !it.noHold) ho.apply(env, it, amt, ctx);
  if (pOut > 0 && ex !== J.EXIT.cut) ex.apply(env, it, pOut, ctx);
  it.charFn = J.combineChar(it.charFns);
  it.pieceFn = J.combinePiece(it.pieceFns);
  return J.drawFx(env, it);
};

/* draw an item honouring bands / clip / streak / echo / wipe-bar / cursor / treatment hooks */
J.drawFx = (env, it) => {
  const ctx = env.ctx;
  let bb = null;
  const draw = () => {
    if (it.streak && it.streak.a > 0.01) {
      for (let k = it.streak.n; k >= 1; k--) {
        const c = Object.assign({}, it, { x: it.x + it.streak.dx * k, y: it.y + (it.streak.dy || 0) * k, alpha: (it.alpha ?? 1) * it.streak.a * (1 - k / (it.streak.n + 1)), pieceFn: null, streak: null, echo: null, pre: null, post: null, shadow: null, extrude: null });
        J.drawItem(env, c);
      }
    }
    if (it.echo && it.echo.n > 0) {            // stepped copies behind the item (outline or tinted)
      const E0 = it.echo;
      for (let k = E0.n; k >= 1; k--) {
        const c = Object.assign({}, it, { x: it.x + (E0.dx || 0) * k, y: it.y + (E0.dy || 0) * k, size: it.size * Math.pow(E0.scale || 1, k), rot: (it.rot || 0) + (E0.rot || 0) * k,
          alpha: (it.alpha ?? 1) * (E0.a ?? 0.5) * Math.pow(E0.decay ?? 0.7, k - 1), pieceFn: null, streak: null, echo: null, pre: null, post: null, shadow: null, extrude: null, pattern: null, gradient: null,
          color: E0.color || it.color, _lay: null, _m: null });
        if (E0.outline) Object.assign(c, { fill: false, stroke: Math.max(1, it.size * 0.012), strokeColor: E0.color || it.color });
        J.drawItem(env, c);
      }
    }
    const r = J.drawItem(env, it); if (r) bb = r;
  };
  if (it.pre) { try { it.pre(env, it); } catch (e) { console.warn(e); } }
  if (it.clip) { ctx.save(); ctx.beginPath(); ctx.rect(it.clip[0], -env.H, it.clip[1] - it.clip[0], env.H * 3); ctx.clip(); }
  if (it.clipY) { ctx.save(); ctx.beginPath(); ctx.rect(-env.W, it.clipY[0], env.W * 3, it.clipY[1] - it.clipY[0]); ctx.clip(); }
  if (it.clipFn) { ctx.save(); ctx.beginPath(); it.clipFn(ctx, env, it); ctx.clip(); }
  if (it.vbands) {
    for (const [x0, x1, dy] of it.vbands) {
      ctx.save(); ctx.beginPath(); ctx.rect(x0, -env.H * 2, x1 - x0, env.H * 5); ctx.clip(); ctx.translate(0, dy); draw(); ctx.restore();
    }
  } else if (it.bands) {
    for (const [y0, y1, dx] of it.bands) {
      ctx.save(); ctx.beginPath(); ctx.rect(-env.W * 2, y0, env.W * 5, y1 - y0); ctx.clip(); ctx.translate(dx, 0); draw(); ctx.restore();
    }
    // outside of the band range
    const lo = it.bands[0][0], hi = it.bands[it.bands.length - 1][1];
    ctx.save(); ctx.beginPath(); ctx.rect(-env.W * 2, -env.H * 3, env.W * 5, lo + env.H * 3); ctx.rect(-env.W * 2, hi, env.W * 5, env.H * 4); ctx.clip(); draw(); ctx.restore();
  } else draw();
  if (it.clipFn) ctx.restore();
  if (it.clipY) ctx.restore();
  if (it.clip) ctx.restore();
  if (it.post) { try { it.post(env, it, bb); } catch (e) { console.warn(e); } }
  if (it.wipeBar) env.rect(it.wipeBar.x - Math.max(4, it.size * 0.035), it.y - it.wipeBar.h / 2, Math.max(8, it.size * 0.07), it.wipeBar.h, env.sc.accent, 1, false);
  if (it.cursorAt != null && it.cursorAt >= 0) {
    const m = it._m || J.measure(it);
    const blink = it.cursorAt >= m.lay.N ? (env.step % 2 === 0) : true;
    if (blink) {
      let x;
      if (bb && bb.boxes.length) { const last = bb.boxes[bb.boxes.length - 1]; x = it.x + last.x + last.w / 2 + it.size * 0.08; }
      else x = it.align === 'left' ? it.x : it.x - m.w / 2;
      env.rect(x, it.y - it.size * 0.45, it.size * 0.5, it.size * 0.9, env.sc.accent, 1);
    }
  }
  return bb;
};

const unionBB = (a, b) => !a ? b : !b ? a : { x0: Math.min(a.x0, b.x0), y0: Math.min(a.y0, b.y0), x1: Math.max(a.x1, b.x1), y1: Math.max(a.y1, b.y1), boxes: [], cx: (Math.min(a.x0, b.x0) + Math.max(a.x1, b.x1)) / 2, cy: (Math.min(a.y0, b.y0) + Math.max(a.y1, b.y1)) / 2 };

/* split long text into balanced lines, preferring script boundaries */
J.splitLines = (text, maxPer) => {
  const arr = [...text];
  if (arr.length <= maxPer) return text;
  const nLines = Math.ceil(arr.length / maxPer);
  const per = arr.length / nLines;
  const out = []; let start = 0;
  for (let l = 1; l < nLines; l++) {
    let target = Math.round(per * l), best = target, bestScore = -1;
    for (let k = Math.max(start + 1, target - 3); k <= Math.min(arr.length - 1, target + 3); k++) {
      const a = arr[k - 1], b = arr[k];
      let s = 3 - Math.abs(k - target);
      if (J.isHira(a) && !J.isHira(b)) s += 3;
      if (J.isPunct(a) || a === ' ' || a === '　') s += 5;
      if (J.isSmallKana(b) || 'ーっ、。'.includes(b)) s -= 6;
      if (s > bestScore) { bestScore = s; best = k; }
    }
    out.push(arr.slice(start, best).join('').trim()); start = best;
  }
  out.push(arr.slice(start).join('').trim());
  return out.join('\n');
};

const glyphCount = t => [...t.replace(/\s/g, '')].length;
const fontsOf = (st, roles) => { const f = roles.flatMap(r => st.fonts[r] || []).filter(k => J.FONTS[k]); return f.length ? f : (st.fonts.display || ['gothic_black']); };
J.glyphCount = glyphCount; J.fontsOf = fontsOf; J.unionBB = unionBB;
J.centerBB = (env, bb) => bb || { x0: env.W * 0.35, x1: env.W * 0.65, y0: env.H * 0.4, y1: env.H * 0.6, cx: env.W / 2, cy: env.H / 2, boxes: [] };

J.LAYOUTS = {
  /* ------------------------------------------------ */
  center: {
    name: '中央', fits: n => true,
    plan: (rng, cut, st) => ({ font: rng.pick(fontsOf(st, rng.chance(0.7) ? ['display'] : ['serif'])), sx: rng.pick([1, 1, 1, 1.25, 1.45, 0.78]), track: rng.range(0.02, 0.14), sub: rng.chance(0.45), under: rng.chance(0.3), accent: rng.chance(0.18), ox: rng.range(-0.05, 0.05), oy: rng.range(-0.06, 0.06) }),
    render(env) {
      const { W, H, sc } = env, P = env.cut.params, text = J.splitLines(env.cut.text, W < H ? 5 : 11);
      const size = Math.min(J.fitSize(text, P.font, W * 0.84, H * 0.5, { sx: P.sx, track: P.track, lead: 1.2 }), H * 0.33);
      const bb = J.mainDraw(env, { text, font: P.font, size, x: W / 2 + P.ox * W, y: H / 2 + P.oy * H, sx: P.sx, track: P.track, lead: 1.2, color: P.accent ? sc.accent : sc.fg });
      if (bb && P.sub && env.cut.lineText !== env.cut.text) {
        env.draw({ text: env.cut.lineText, font: env.st.fonts.body[0], size: J.clamp(H * 0.026, 16, 34), x: W / 2 + P.ox * W, y: bb.y1 + H * 0.07, track: 0.22, color: sc.sub, alpha: E.outCubic(env.pIn), ghost: false });
      }
      if (bb && P.under) {
        const e = E.outExpo(env.pIn * 1.2 - 0.2), o = E.inCubic(env.pOut);
        if (e > 0 && o < 1) env.line([[J.lerp(bb.x0, bb.x1, o), bb.y1 + size * 0.14], [J.lerp(bb.x0, bb.x1, e), bb.y1 + size * 0.14]], sc.accent, Math.max(2, size * 0.03), 1);
      }
      return bb;
    },
  },

  /* ------------------------------------------------ */
  mixed: {
    name: '大小ミックス', fits: n => n >= 2 && n <= 16,
    plan: (rng, cut, st) => ({ fontBig: rng.pick(fontsOf(st, ['display', 'serif'])), fontSmall: rng.pick(fontsOf(st, ['serif', 'body'])), mode: rng.pick(['line', 'stair', 'line', 'wave']), rotAmp: rng.range(2, 10), smallK: rng.range(0.42, 0.6), accentIdx: rng.int(0, 20) }),
    render(env) {
      const { W, H, sc } = env, P = env.cut.params;
      const chars = [...env.cut.text.replace(/\s+/g, '')];
      const n = chars.length;
      const rows = n > 9 ? 2 : 1;
      const perRow = Math.ceil(n / rows);
      const items = chars.map((ch, i) => {
        let k = J.isKanji(ch) ? 1 : J.isKata(ch) ? 0.88 : J.isLatin(ch) ? 0.8 : J.isPunct(ch) ? 0.42 : P.smallK + J.r(env.cut.seed, i, 3) * 0.14;
        if (J.isSmallKana(ch)) k *= 0.8;
        const font = (J.isKanji(ch) || J.isKata(ch)) ? P.fontBig : (J.r(env.cut.seed, i, 4) < 0.55 ? P.fontSmall : P.fontBig);
        return { ch, k, font, w: J.metrics.adv(font, ch) * k * 0.96 };
      });
      let bbAll = null;
      for (let r = 0; r < rows; r++) {
        const row = items.slice(r * perRow, (r + 1) * perRow);
        const sumW = row.reduce((s, c) => s + c.w, 0);
        const base = Math.min(W * 0.86 / sumW, H * (rows > 1 ? 0.3 : 0.4));
        let x = W / 2 - sumW * base / 2;
        const baseline = H / 2 + base * 0.38 + (r - (rows - 1) / 2) * base * 1.05;
        row.forEach((c, j) => {
          const i = r * perRow + j;
          const size = c.k * base;
          let y = baseline - size / 2 + J.rs(env.cut.seed, i, 5) * base * 0.06;
          if (P.mode === 'stair') y += (j - (row.length - 1) / 2) * base * 0.12;
          if (P.mode === 'wave') y += Math.sin(j * 1.1) * base * 0.1;
          const it = { text: c.ch, font: c.font, size, x: x + c.w * base / 2, y, rot: J.rs(env.cut.seed, i, 6) * P.rotAmp, color: (i === P.accentIdx % n && !J.isKanji(c.ch)) ? sc.accent : sc.fg, mi: i };
          bbAll = unionBB(bbAll, J.mainDraw(env, it));
          x += c.w * base;
        });
      }
      return bbAll;
    },
  },

  /* ------------------------------------------------ */
  vcols: {
    name: '縦書き', fits: n => n <= 18,
    plan: (rng, cut, st) => {
      const n = glyphCount(cut.text);
      const variant = n <= 5 ? rng.pick(['repeat', 'repeat', 'split']) : n <= 9 ? rng.pick(['split', 'repeat']) : 'split';
      return { variant, cols: n <= 4 ? rng.pick([3, 5, 5]) : 3, font: rng.pick(fontsOf(st, ['serif', 'serif', 'display'])), side: rng.pick(['same', 'outline', 'dim']), perCol: rng.int(3, 6) };
    },
    render(env) {
      const { W, H, sc } = env, P = env.cut.params, text = env.cut.text.replace(/\s+/g, '');
      const n = glyphCount(text);
      if (P.variant === 'repeat' && n <= 9) {
        const cols = P.cols;
        const size = Math.min(H * 0.8 / (n * 1.04), W * 0.86 / (cols * 1.75));
        let bb = null; const mid = (cols - 1) / 2;
        for (let i = 0; i < cols; i++) {
          const side = i !== Math.round(mid);
          const it = { text, font: P.font, size, x: W / 2 + (i - mid) * size * 1.75, y: H / 2, vertical: true, track: 0.04, color: sc.fg, mi: Math.abs(i - mid) * 2 };
          if (side && P.side === 'outline') { it.fill = false; it.stroke = Math.max(1.2, size * 0.012); }
          if (side && P.side === 'dim') it.alpha = 0.38;
          const r = J.mainDraw(env, it); if (!side) bb = r;
        }
        return bb;
      }
      const per = Math.max(2, Math.min(P.perCol + 1, Math.ceil(n / Math.ceil(n / 7))));
      const colsArr = []; const arr = [...text];
      for (let i = 0; i < arr.length; i += per) colsArr.push(arr.slice(i, i + per).join(''));
      const t2 = colsArr.join('\n');
      const size = Math.min(H * 0.78 / (per * 1.03), W * 0.8 / (colsArr.length * 1.4));
      const colH = per * size * 1.03;
      return J.mainDraw(env, { text: t2, font: P.font, size, x: W / 2, y: H / 2 - colH / 2, vertical: true, lead: 1.4, align: 'left', track: 0.03, color: sc.fg });
    },
  },

  /* ------------------------------------------------ */
  marquee: {
    name: '流れる帯', fits: n => n <= 12,
    plan: (rng, cut, st) => ({ rows: rng.pick([2, 4, 4, 2]), rowStyle: rng.pick(['outline', 'dim', 'box']), speed: rng.range(0.5, 1.2), font: rng.pick(fontsOf(st, ['display'])), sx: rng.pick([1.25, 1.45, 1.6]) }),
    render(env) {
      const { W, H, sc } = env, P = env.cut.params, text = env.cut.text;
      const size = Math.min(J.fitSize(text, P.font, W * 0.84, H * 0.3, { sx: P.sx, track: 0.05 }), H * 0.3);
      const rs = size * 0.42, lb = env.ltb;
      const unit = text + '　';
      const period = J.measure({ text: unit, font: P.font, size: rs, sx: P.sx, track: 0.05 }).w + rs * 0.05;
      const reps = Math.ceil((W * 2.4) / period) + 1;
      const ys = P.rows === 2 ? [-1, 1] : [-2, -1, 1, 2];
      ys.forEach((k, r) => {
        const y = H / 2 + Math.sign(k) * (size * 0.5 + rs * 0.95) + (Math.abs(k) - 1) * Math.sign(k) * rs * 1.25;
        const a = J.clamp((lb - Math.abs(k) * 0.05) / 0.12);
        if (a <= 0) return;
        const dir = r % 2 ? 1 : -1;
        const off = ((lb * P.speed * W * 0.22 * dir + r * period * 0.37) % period + period) % period - period / 2;
        const row = { text: unit.repeat(reps), font: P.font, size: rs, sx: P.sx, track: 0.05, x: W / 2 + off, y, ghost: false, alpha: a };
        if (P.rowStyle === 'outline') Object.assign(row, { fill: false, stroke: Math.max(1.2, rs * 0.02), strokeColor: sc.fg, alpha: a * 0.9 });
        else if (P.rowStyle === 'dim') Object.assign(row, { color: sc.sub, alpha: a * 0.35 });
        else { env.rect(-10, y - rs * 0.62, W + 20, rs * 1.24, sc.ink, a, false); Object.assign(row, { color: sc.bg }); }
        env.draw(row);
      });
      return J.mainDraw(env, { text, font: P.font, size, x: W / 2, y: H / 2, sx: P.sx, track: 0.05, color: sc.fg });
    },
  },

  /* ------------------------------------------------ */
  tile: {
    name: '敷き詰め', fits: n => n <= 12,
    plan: (rng, cut, st) => ({ unit: rng.pick(['chunk', 'line', 'chunk']), knock: rng.pick(['stroke', 'box']), flicker: rng.chance(0.6), font: rng.pick(fontsOf(st, ['display'])), tileFont: rng.pick(fontsOf(st, ['serif', 'body', 'display'])), rowsN: rng.pick([12, 14, 16, 18]) }),
    render(env) {
      const { W, H, sc } = env, P = env.cut.params, text = env.cut.text, lb = env.ltb;
      const unitText = (P.unit === 'line' ? env.cut.lineText : text) + '　';
      const rowH = H / P.rowsN, ts = rowH * 0.72;
      const period = J.measure({ text: unitText, font: P.tileFont, size: ts, track: 0.02 }).w;
      const reps = Math.ceil(W * 1.6 / period) + 2;
      for (let r = 0; r <= P.rowsN; r++) {
        const ap = J.r(env.cut.seed, r, 91) * env.cut.inDur * 1.6;
        if (lb < ap) continue;
        if (P.flicker && J.r(env.cut.seed, env.step, r, 92) < 0.16) continue;
        const dir = r % 2 ? 1 : -1;
        const off = (((r % 2) * period * 0.5 + lb * 26 * dir) % period + period) % period;
        env.draw({ text: unitText.repeat(reps), font: P.tileFont, size: ts, track: 0.02, align: 'left', x: -period + off - period * 0.5, y: (r + 0.5) * rowH, color: sc.sub, alpha: 0.42 * J.clamp((lb - ap) / 0.1), ghost: false });
      }
      const mt = W < H ? J.splitLines(text, 5) : text;
      const size = Math.min(J.fitSize(mt, P.font, W * 0.8, H * 0.34, { track: 0.04, lead: 1.15 }), H * 0.3);
      const it = { text: mt, font: P.font, size, x: W / 2, y: H / 2, track: 0.04, lead: 1.15, color: sc.fg };
      if (P.knock === 'box') {
        const m = J.measure(it); const e = E.outExpo(env.pIn * 1.4);
        env.rect(W / 2 - (m.w / 2 + size * 0.35) * e, H / 2 - m.h / 2 - size * 0.28, (m.w + size * 0.7) * e, m.h + size * 0.56, sc.bg, 1, false);
      } else {
        J.mainDraw(env, Object.assign({}, it, { fill: false, stroke: size * 0.16, strokeColor: sc.bg, ghost: false }));
      }
      return J.mainDraw(env, it);
    },
  },

  /* ------------------------------------------------ */
  scatter: {
    name: '散らし', fits: n => n >= 2 && n <= 14,
    plan: (rng, cut, st) => ({ font: rng.pick(fontsOf(st, ['display'])), fontB: rng.pick(fontsOf(st, ['serif', 'display'])), extras: rng.chance(0.65) }),
    render(env) {
      const { W, H, sc } = env, P = env.cut.params, s = env.cut.seed;
      const chars = [...env.cut.text.replace(/\s+/g, '')], n = chars.length;
      if (P.extras) {
        for (let k = 0; k < 9; k++) {
          const ap = J.r(s, k, 81) * env.cut.dur * 0.5;
          if (env.ltb < ap) continue;
          const top = J.r(s, k, 82) < 0.5;
          env.draw({ text: env.cut.text, font: env.st.fonts.body[0], size: J.rr(H * 0.022, H * 0.045, s, k, 83), x: J.rr(W * 0.08, W * 0.92, s, k, 84), y: top ? J.rr(H * 0.08, H * 0.26, s, k, 85) : J.rr(H * 0.74, H * 0.92, s, k, 85), rot: J.rs(s, k, 86) * 18, color: sc.sub, alpha: 0.75, ghost: false });
        }
      }
      const base = Math.min(H * 0.3, W * 0.9 / n * 1.15);
      let bb = null;
      chars.forEach((ch, i) => {
        const x = W * (0.1 + 0.8 * (i + 0.5) / n) + J.rs(s, i, 71) * W * 0.035;
        const y = H / 2 + J.rs(s, i, 72) * H * 0.18;
        const k = 0.62 + J.r(s, i, 73) * 0.85 * (J.isKanji(ch) ? 1 : 0.7);
        bb = unionBB(bb, J.mainDraw(env, { text: ch, font: i % 3 === 1 ? P.fontB : P.font, size: base * k, x, y, rot: J.rs(s, i, 74) * 24, color: J.r(s, i, 75) < 0.15 ? sc.accent : sc.fg, mi: i }));
      });
      return bb;
    },
  },

  /* ------------------------------------------------ */
  ring: {
    name: '円環', fits: n => n >= 2 && n <= 16,
    plan: (rng, cut, st) => ({ orient: rng.pick(['tangent', 'tangent', 'upright']), center: rng.pick(['word', 'disc', 'word', 'none']), speed: rng.range(4, 12) * rng.pick([1, -1]), R: rng.range(0.28, 0.35), font: rng.pick(fontsOf(st, ['display', 'serif'])), fontC: rng.pick(fontsOf(st, ['display', 'serif'])) }),
    render(env) {
      const { W, H, sc } = env, P = env.cut.params, text = env.cut.text.replace(/\s+/g, '');
      const R = Math.min(H * P.R, W * 0.4), cx = W / 2, cy = H / 2, lb = env.ltb;
      const n = glyphCount(text);
      const unit = [...(text + '・')];
      const sizeRing = Math.min(H * 0.07, J.TAU * R / ((n + 1) * 1.25));
      const cnt = Math.max(unit.length, Math.min(44, Math.floor(J.TAU * R / (sizeRing * 1.2))));
      env.circle(cx, cy, R * 0.86, null, sc.sub, 1.2, 0.55, false);
      env.circle(cx, cy, R * 1.15, null, sc.sub, 1.2, 0.35, false);
      let bb = null;
      if (P.center === 'disc') {
        const e = E.outBack(J.clamp(env.lt / (env.cut.inDur * 0.9)), 1.6) * (1 - E.inCubic(env.pOut));
        env.circle(cx, cy, R * 0.72 * e, sc.accent, null, 0, 1, true);
        const size = J.fitSize(text, P.fontC, R * 1.15, R * 0.8);
        bb = J.mainDraw(env, { text, font: P.fontC, size: Math.min(size, H * 0.2), x: cx, y: cy, color: sc.bg, mi: 0 });
      } else if (P.center === 'word') {
        const size = J.fitSize(text, P.fontC, R * 1.3, R * 0.85);
        bb = J.mainDraw(env, { text, font: P.fontC, size: Math.min(size, H * 0.22), x: cx, y: cy, color: sc.fg, mi: 0 });
      }
      for (let i = 0; i < cnt; i++) {
        const ch = unit[i % unit.length];
        const ang = i / cnt * 360 + lb * P.speed - 90;
        const r = ang * J.DEG;
        const it = { text: ch, font: P.font, size: sizeRing, x: cx + Math.cos(r) * R, y: cy + Math.sin(r) * R, rot: P.orient === 'tangent' ? ang + 90 : 0, color: ch === '・' ? sc.accent : sc.fg, mi: i * 0.25, noHold: true };
        const b = J.mainDraw(env, it);
        if (!bb) bb = unionBB(bb, b);
      }
      return bb || { x0: cx - R, x1: cx + R, y0: cy - R, y1: cy + R, cx, cy, boxes: [] };
    },
  },

  /* ------------------------------------------------ */
  wave: {
    name: '波の軌跡', fits: n => n >= 2 && n <= 16,
    plan: (rng, cut, st) => ({ amp: rng.range(0.08, 0.17), freq: rng.range(0.8, 1.6), trail: rng.pick([5, 7, 9]), font: rng.pick(fontsOf(st, ['display'])), travel: rng.range(0.25, 0.5) * rng.pick([1, -1]) }),
    render(env) {
      const { W, H, sc } = env, P = env.cut.params, text = env.cut.text.replace(/\s+/g, '');
      const chars = [...text], n = chars.length;
      const size = Math.min(H * 0.2, W * 0.72 / n);
      const du = size * 1.05 / W, lb = env.ltb, u0 = 0.5 - (env.lt / env.cut.dur - 0.5) * P.travel;
      const path = u => [W * u, H / 2 + H * P.amp * Math.sin(J.TAU * P.freq * u + lb * 1.3)];
      const angAt = u => { const a = path(u - 0.002), b = path(u + 0.002); return Math.atan2(b[1] - a[1], b[0] - a[0]) / J.DEG; };
      let bb = null;
      for (let k = P.trail; k >= 1; k--) {
        chars.forEach((ch, i) => {
          const u = u0 + (i - (n - 1) / 2) * du + k * du * 0.2 * Math.sign(P.travel);
          const [x, y] = path(u);
          env.draw({ text: ch, font: P.font, size: size * (1 - k * 0.035), x, y, rot: angAt(u), color: sc.sub, alpha: 0.5 * (1 - k / (P.trail + 1)) * E.outCubic(env.pIn), ghost: false });
        });
      }
      chars.forEach((ch, i) => {
        const u = u0 + (i - (n - 1) / 2) * du; const [x, y] = path(u);
        bb = unionBB(bb, J.mainDraw(env, { text: ch, font: P.font, size, x, y, rot: angAt(u), color: sc.fg, mi: i * 0.5 }));
      });
      return bb;
    },
  },

  /* ------------------------------------------------ */
  huge: {
    name: '画面突き抜け', fits: n => n <= 8,
    plan: (rng, cut, st) => ({ font: rng.pick(fontsOf(st, ['display'])), grad: !!st.useGrad && rng.chance(0.75), dir: rng.pick([1, -1]), label: rng.chance(0.8) }),
    render(env) {
      const { W, H, sc } = env, P = env.cut.params, text0 = env.cut.text.replace(/\s+/g, '');
      const n = glyphCount(text0);
      const text = n >= 5 ? J.splitLines(text0, Math.ceil(n / 2)) : text0;
      const lines = text.split('\n').length;
      const size = lines > 1 ? Math.min(H * 0.56, W * 1.2 / (Math.ceil(n / 2) * 0.98)) : Math.min(H * 0.98, W * 1.3 / (n * 0.96));
      const u = env.lt / env.cut.dur;
      const bb = J.mainDraw(env, { text, font: P.font, size, x: W / 2 + (0.5 - u) * W * 0.16 * P.dir, y: H / 2 + H * 0.02, lead: 0.98, track: -0.02, color: sc.fg, gradient: P.grad && sc.grad ? sc.grad : null });
      if (P.label) {
        const ls = J.clamp(H * 0.028, 16, 30);
        const a = E.outCubic(J.clamp((env.lt - env.cut.inDur * 0.5) / 0.2)) * (1 - env.pOut);
        const lt = J.measure({ text: env.cut.text, font: env.st.fonts.body[0], size: ls, track: 0.12 });
        env.rect(W * 0.05, H * 0.86 - ls, lt.w + ls * 1.4, ls * 2, sc.ink, a, false);
        env.draw({ text: env.cut.text, font: env.st.fonts.body[0], size: ls, track: 0.12, align: 'left', x: W * 0.05 + ls * 0.7, y: H * 0.86, color: sc.bg, alpha: a, ghost: false });
      }
      return bb;
    },
  },

  /* ------------------------------------------------ */
  labels: {
    name: 'ラベル貼り', fits: n => n >= 1 && n <= 16,
    plan: (rng, cut, st) => ({ variant: rng.pick(['radial', 'rows', 'scatter']), unit: glyphCount(cut.text) <= 6 ? 'char' : rng.pick(['char', 'word']), center: rng.pick(['orb', 'word', 'none']), font: rng.pick(fontsOf(st, ['display', 'body'])), fontC: rng.pick(fontsOf(st, ['display'])) }),
    render(env) {
      const { W, H, sc } = env, P = env.cut.params, s = env.cut.seed, lb = env.ltb;
      const text = env.cut.text.replace(/\s+/g, '');
      let units = P.unit === 'char' ? [...text].filter(c => !J.isPunct(c)) : (env.cut.words && env.cut.words.length ? env.cut.words : [text]);
      if (!units.length) units = [text];
      const out = 1 - E.inCubic(env.pOut);
      const drawLabel = (u, x, y, rot, fs, q, i) => {
        if (q <= 0) return;
        const m = J.measure({ text: u, font: P.font, size: fs, track: 0.04 });
        const w = m.w + fs * 0.7, h = fs * 1.36;
        const ctx = env.ctx; ctx.save(); ctx.translate(x, y); ctx.rotate(rot * J.DEG); ctx.scale(q, q);
        env.rect(-w / 2, -h / 2, w, h, sc.ink, 1);
        env.draw({ text: u, font: P.font, size: fs, track: 0.04, x: 0, y: 0, color: sc.bg, ghost: false });
        ctx.restore();
      };
      let bb = null;
      if (P.variant === 'radial') {
        const m = Math.max(units.length, 10), R = Math.min(H * 0.3, W * 0.36), fs = Math.min(H * 0.062, W * 0.052);
        if (P.center === 'orb') { const e = E.outBack(J.clamp(env.lt / 0.35), 1.4) * out; env.circle(W / 2, H / 2, R * 0.52 * e, sc.accent, null, 0, 1, true); }
        for (let i = 0; i < m; i++) {
          const ang = i / m * 360 + lb * 7 - 90;
          const q = E.outBack(J.clamp((env.lt - i * 0.025) / 0.22), 2) * out;
          drawLabel(units[i % units.length], W / 2 + Math.cos(ang * J.DEG) * R, H / 2 + Math.sin(ang * J.DEG) * R, ang, fs, q, i);
        }
        if (P.center === 'word') bb = J.mainDraw(env, { text, font: P.fontC, size: Math.min(J.fitSize(text, P.fontC, R * 1.1, R * 0.7), H * 0.18), x: W / 2, y: H / 2, color: sc.fg });
        return bb || { x0: W / 2 - R, x1: W / 2 + R, y0: H / 2 - R, y1: H / 2 + R, cx: W / 2, cy: H / 2, boxes: [] };
      }
      if (P.variant === 'rows') {
        const k = units.length, fs = Math.min(H * 0.1, H * 0.7 / (k * 1.5));
        units.forEach((u, i) => {
          const q = E.outBack(J.clamp((env.lt - i * 0.05) / 0.22), 2) * out;
          drawLabel(u, W / 2 + J.rs(s, i, 5) * W * 0.12, H / 2 + (i - (k - 1) / 2) * fs * 1.55, J.rs(s, i, 6) * 4, fs, q, i);
        });
        return { x0: W * 0.3, x1: W * 0.7, y0: H / 2 - k * fs * 0.8, y1: H / 2 + k * fs * 0.8, cx: W / 2, cy: H / 2, boxes: [] };
      }
      const fs = H * 0.085;
      units.forEach((u, i) => {
        const q = E.outBack(J.clamp((env.lt - i * 0.05) / 0.22), 2) * out;
        drawLabel(u, W * (0.15 + 0.7 * ((i + 0.5) / units.length)) + J.rs(s, i, 7) * W * 0.04, H / 2 + J.rs(s, i, 8) * H * 0.25, J.rs(s, i, 9) * 22, fs * (0.8 + J.r(s, i, 10) * 0.5), q, i);
      });
      return { x0: W * 0.15, x1: W * 0.85, y0: H * 0.3, y1: H * 0.7, cx: W / 2, cy: H / 2, boxes: [] };
    },
  },

  /* ------------------------------------------------ */
  condensed: {
    name: '縦長圧縮', fits: n => n <= 10,
    plan: (rng, cut, st) => { const n = glyphCount(cut.text); return { count: n <= 4 ? rng.pick([3, 2, 1]) : n <= 7 ? rng.pick([2, 1]) : 1, sx: rng.range(0.42, 0.58), sy: rng.range(1.1, 1.3), font: rng.pick(fontsOf(st, ['display', 'body'])) }; },
    render(env) {
      const { W, H, sc } = env, P = env.cut.params, text = env.cut.text.replace(/\s+/g, '');
      const slot = W * 0.92 / P.count;
      const size = Math.min(J.fitSize(text, P.font, slot * 0.94, H * 0.8, { sx: P.sx, sy: P.sy, track: 0.04 }), H * 0.62);
      let bb = null; const order = [1, 0, 2, 3];
      for (let i = 0; i < P.count; i++) {
        const r = J.mainDraw(env, { text, font: P.font, size, sx: P.sx, sy: P.sy, track: 0.04, x: W / 2 + (i - (P.count - 1) / 2) * slot, y: H / 2, color: sc.fg, mi: P.count > 1 ? order[i] * 2 : 0 });
        bb = unionBB(bb, r);
      }
      return bb;
    },
  },

  /* ------------------------------------------------ */
  gloss: {
    name: '注釈', fits: n => n <= 12,
    plan: (rng, cut, st) => ({ font: rng.pick(fontsOf(st, ['serif', 'display'])), side: rng.pick(['right', 'left']), bgText: rng.chance(0.6), vertNote: rng.chance(0.45) }),
    render(env) {
      const { W, H, sc } = env, P = env.cut.params, text = env.cut.text, lb = env.ltb;
      if (P.bgText) {
        for (let r = 0; r < 3; r++) {
          const bs = H * 0.3;
          env.draw({ text: (text.replace(/\s+/g, '') + '').repeat(6), font: P.font, size: bs, x: W / 2 + ((lb * 20 * (r % 2 ? 1 : -1)) % (bs * 2)), y: H * (0.18 + r * 0.32), color: sc.dim, alpha: 1, ghost: false });
        }
      }
      const right = P.side === 'right';
      const size = Math.min(J.fitSize(text, P.font, W * 0.5, H * 0.3, { track: 0.03 }), H * 0.24);
      const bb = J.mainDraw(env, { text, font: P.font, size, x: right ? W * 0.4 : W * 0.6, y: H * 0.54, track: 0.03, color: sc.fg });
      if (!bb) return bb;
      const e = E.outExpo(J.clamp((env.lt - env.cut.inDur * 0.4) / 0.45)) * (1 - E.inCubic(env.pOut));
      if (e <= 0) return bb;
      const ax = right ? bb.x1 + size * 0.1 : bb.x0 - size * 0.1, ay = bb.y0 + size * 0.2;
      const nx = right ? Math.min(W * 0.9, bb.x1 + W * 0.1) : Math.max(W * 0.1, bb.x0 - W * 0.1), ny = Math.max(H * 0.12, bb.y0 - H * 0.12);
      const mx = J.lerp(ax, nx, 0.45);
      const pts = [[ax, ay], [mx, ay], [nx, ny]];
      env.polyPartial(pts, e, sc.sub, 1.3, 1, false);
      env.circle(ax, ay, 4, sc.accent, null, 0, e, false);
      const note = env.cut.note || J.romaji(text.replace(/\s+/g, '')) || env.cut.lineText;
      const ns = J.clamp(H * 0.024, 14, 26), body = env.st.fonts.body[0], serif = env.st.fonts.serif[0];
      const al = right ? 'left' : 'right';
      env.draw({ text: '【' + text.replace(/\s+/g, '') + '】', font: serif, size: ns * 1.2, align: al, x: nx, y: ny - ns * 1.2, color: sc.fg, alpha: e, ghost: false });
      if (P.vertNote) env.draw({ text: env.cut.lineText, font: serif, size: ns, vertical: true, align: 'left', x: nx + (right ? ns : -ns), y: ny + ns * 0.8, color: sc.sub, alpha: e, ghost: false });
      else env.draw({ text: note, font: body, size: ns, align: al, x: nx, y: ny + ns * 0.4, track: 0.08, color: sc.sub, alpha: e, ghost: false });
      env.draw({ text: 'No.' + String((env.cut.line | 0) + 1).padStart(2, '0'), font: env.st.fonts.mono[0] || 'mono', size: ns * 0.8, align: al, x: nx, y: ny + ns * 2, color: sc.accent, alpha: e, ghost: false });
      return bb;
    },
  },

  /* ------------------------------------------------ */
  type: {
    name: 'タイプ', fits: n => n <= 28,
    plan: (rng, cut, st) => ({ font: rng.pick(fontsOf(st, ['body', 'serif', 'mono'])), align: rng.pick(['left', 'center']), prompt: rng.chance(0.6) }),
    render(env) {
      const { W, H, sc } = env, P = env.cut.params;
      const text = J.splitLines(env.cut.text, 14);
      const size = Math.min(H * 0.11, J.fitSize(text, P.font, W * 0.74, H * 0.36, { track: 0.06, lead: 1.35 }));
      const left = P.align === 'left';
      const x = left ? W * 0.13 : W / 2;
      if (P.prompt) env.draw({ text: '>', font: env.st.fonts.mono[0] || 'mono', size: size * 0.8, x: (left ? x : x - J.measure({ text, font: P.font, size, track: 0.06 }).w / 2) - size * 0.9, y: H / 2 - (text.split('\n').length - 1) * size * 0.67, color: sc.accent, ghost: false });
      const bb = J.mainDraw(env, { text, font: P.font, size, x, y: H / 2, align: left ? 'left' : 'center', track: 0.06, lead: 1.35, color: sc.fg, enter: env.cut.enter === 'cut' ? 'type' : undefined });
      const ms = J.clamp(H * 0.02, 12, 20);
      env.draw({ text: `LINE ${String((env.cut.line | 0) + 1).padStart(2, '0')} ─ ${J.fmtTime(env.t)}`, font: env.st.fonts.mono[0] || 'mono', size: ms, align: 'left', x: W * 0.13, y: H * 0.8, color: sc.sub, alpha: 0.8, ghost: false });
      return bb;
    },
  },

  /* ------------------------------------------------ */
  diag: {
    name: '斜め帯', fits: n => n <= 14,
    plan: (rng, cut, st) => ({ ang: rng.range(10, 22) * rng.pick([1, -1]), band: rng.pick(['accent', 'ink']), second: rng.chance(0.7), font: rng.pick(fontsOf(st, ['display'])) }),
    render(env) {
      const { W, H, sc } = env, P = env.cut.params, text = env.cut.text, lb = env.ltb, ctx = env.ctx;
      const bandCol = P.band === 'accent' ? sc.accent : sc.ink;
      const txtCol = J.lum(bandCol) > 0.5 ? (J.lum(sc.bg) < 0.5 ? sc.bg : '#111111') : (J.lum(sc.fg) > 0.5 ? sc.fg : '#FFFFFF');
      const size = Math.min(J.fitSize(text, P.font, W * 0.72, H * 0.24, { track: 0.05 }), H * 0.2);
      const bh = size * 1.6;
      const e = E.outExpo(J.clamp(env.lt / (env.cut.inDur * 0.8))) * (1 - E.inExpo(env.pOut));
      ctx.save(); ctx.translate(W / 2, H / 2); ctx.rotate(-P.ang * J.DEG);
      env.rect(-W * 1.2, -bh / 2 * e, W * 2.4, bh * e, bandCol, 1);
      if (P.second) {
        const y2 = bh * 0.95, h2 = bh * 0.32;
        env.rect(-W * 1.2, y2 - h2 / 2, W * 2.4 * e, h2, sc.fg, 0.9, false);
        const unit = env.cut.lineText + '　／　';
        const period = J.measure({ text: unit, font: env.st.fonts.body[0], size: h2 * 0.55, track: 0.1 }).w;
        env.draw({ text: unit.repeat(Math.ceil(W * 3 / period)), font: env.st.fonts.body[0], size: h2 * 0.55, track: 0.1, x: -((lb * 120) % period), y: y2, color: sc.bg, ghost: false, alpha: e });
      }
      ctx.restore();
      return J.mainDraw(env, { text, font: P.font, size, x: W / 2, y: H / 2, rot: -P.ang, track: 0.05, color: txtCol });
    },
  },

  /* ------------------------------------------------ */
  circle: {
    name: '円窓', fits: n => n <= 10,
    plan: (rng, cut, st) => ({ variant: rng.pick(['disc', 'eclipse', 'ring']), vertical: glyphCount(cut.text) <= 4 && rng.chance(0.5), font: rng.pick(fontsOf(st, ['display', 'serif'])), off: rng.range(-0.12, 0.12) }),
    render(env) {
      const { W, H, sc } = env, P = env.cut.params, text = env.cut.text.replace(/\s+/g, ''), ctx = env.ctx;
      const cx = W / 2 + P.off * W, cy = H / 2;
      const out = 1 - E.inCubic(env.pOut);
      if (P.variant === 'eclipse') {
        const size = Math.min(J.fitSize(text, P.font, W * 0.82, H * 0.46, { track: 0.02 }), H * 0.36);
        const bb = J.mainDraw(env, { text: J.splitLines(text, 6), font: P.font, size, x: W / 2, y: H / 2, lead: 1.05, color: sc.fg });
        const R = H * 0.19, u = env.lt / env.cut.dur;
        const ex = W / 2 + J.lerp(-0.08, 0.08, u) * W, ey = H / 2 + H * 0.12;
        if (env.pass === 'main') {
          ctx.save(); ctx.shadowColor = J.rgba(sc.fg, 0.9); ctx.shadowBlur = 38 * env.scale;
          env.circle(ex, ey, R * 1.01 * out, null, sc.fg, 3, 0.9, false); ctx.restore();
          env.circle(ex, ey, R * out, J.mix(sc.bg, '#000000', 0.35), null, 0, 1, false);
        }
        return bb;
      }
      const R = Math.min(H * 0.3, W * 0.4);
      const e = E.outBack(J.clamp(env.lt / (env.cut.inDur * 0.9)), 1.5) * out;
      if (P.variant === 'disc') env.circle(cx, cy, R * e, sc.accent, null, 0, 1, true);
      else env.arc(cx, cy, R, -90, -90 + 360 * E.outExpo(J.clamp(env.lt / (env.cut.inDur * 1.3))) * out, sc.fg, 3, 1);
      const size = P.vertical ? Math.min(J.fitSize(text, P.font, R * 1.1, R * 1.35, { vertical: true }), R * 0.9) : Math.min(J.fitSize(text, P.font, R * 1.45, R * 0.9), R * 0.8);
      return J.mainDraw(env, { text, font: P.font, size, x: cx, y: cy, vertical: P.vertical, color: P.variant === 'disc' ? sc.bg : sc.fg });
    },
  },

  /* ------------------------------------------------ */
  stack: {
    name: '残像スタック', fits: n => n <= 12,
    plan: (rng, cut, st) => ({ copies: rng.pick([3, 4, 5]), dir: rng.pick([1, -1]), style: rng.pick(['fade', 'outline', 'fade']), font: rng.pick(fontsOf(st, ['display', 'serif'])), gap: rng.range(0.82, 1.02), xs: rng.range(-0.04, 0.04) }),
    render(env) {
      const { W, H, sc } = env, P = env.cut.params, text = env.cut.text;
      const size = Math.min(J.fitSize(text, P.font, W * 0.8, H * 0.22, { track: 0.03 }), H * 0.19);
      const step = size * P.gap, n = P.copies;
      const y0 = H / 2 - P.dir * (n - 1) * step / 2;
      let bb = null;
      for (let k = n - 1; k >= 0; k--) {
        const it = { text, font: P.font, size, x: W / 2 + P.xs * W * k, y: y0 + P.dir * k * step, track: 0.03, color: sc.fg, mi: k * 1.2 };
        if (k > 0) { if (P.style === 'outline') Object.assign(it, { fill: false, stroke: Math.max(1.2, size * 0.014), alpha: 0.85 }); else it.alpha = 0.6 * Math.pow(0.58, k - 1); }
        const r = J.mainDraw(env, it); if (k === 0) bb = r;
      }
      return bb;
    },
  },

  /* ------------------------------------------------ */
  pill: {
    name: 'カプセル', fits: n => n <= 14,
    plan: (rng, cut, st) => ({ grad: !!st.useGrad || rng.chance(0.35), font: rng.pick(fontsOf(st, ['display', 'body'])), smalls: rng.chance(0.75) }),
    render(env) {
      const { W, H, sc } = env, P = env.cut.params, text = env.cut.text, ctx = env.ctx;
      const size = Math.min(J.fitSize(text, P.font, W * 0.62, H * 0.2, { track: 0.04 }), H * 0.17);
      const m = J.measure({ text, font: P.font, size, track: 0.04 });
      const w = m.w + size * 1.3, h = size * 1.6;
      const e = E.outExpo(J.clamp(env.lt / (env.cut.inDur * 0.9))) * (1 - E.inExpo(env.pOut));
      const fillC = P.grad && sc.grad ? sc.grad : [sc.accent, sc.accent];
      const ww = Math.max(h, w * e);
      if (env.pass === 'main') {
        const g = ctx.createLinearGradient(W / 2 - ww / 2, 0, W / 2 + ww / 2, 0); g.addColorStop(0, fillC[0]); g.addColorStop(1, fillC[1]);
        env.rrect(W / 2 - ww / 2, H / 2 - h / 2, ww, h, h / 2, g, 1, true);
      } else env.rrect(W / 2 - ww / 2, H / 2 - h / 2, ww, h, h / 2, sc.accent, 1, true);
      const tc = J.lum(fillC[0]) > 0.55 ? '#111111' : '#FFFFFF';
      ctx.save(); ctx.beginPath(); ctx.rect(W / 2 - ww / 2, 0, ww, H); ctx.clip();
      const bb = J.mainDraw(env, { text, font: P.font, size, x: W / 2, y: H / 2, track: 0.04, color: tc });
      ctx.restore();
      if (P.smalls) {
        const labs = [J.romaji(text.replace(/\s+/g, '')) || 'LYRIC', 'No.' + String((env.cut.line | 0) + 1).padStart(2, '0'), J.fmtTime(env.cut.start)];
        const fs = J.clamp(H * 0.022, 13, 24);
        labs.forEach((l, i) => {
          const q = E.outBack(J.clamp((env.lt - 0.15 - i * 0.06) / 0.25), 2) * (1 - env.pOut);
          if (q <= 0) return;
          const mm = J.measure({ text: l, font: env.st.fonts.body[0], size: fs, track: 0.1 });
          const px = W / 2 + (i === 0 ? -w * 0.3 : i === 1 ? w * 0.42 : w * 0.1), py = H / 2 + (i === 1 ? -h * 0.95 : h * 0.95);
          env.rrect(px - (mm.w / 2 + fs * 0.8) * q, py - fs * 0.85, (mm.w + fs * 1.6) * q, fs * 1.7, fs * 0.85, null, 1, false, sc.fg, 1.3);
          env.draw({ text: l, font: env.st.fonts.body[0], size: fs, track: 0.1, x: px, y: py, color: sc.fg, alpha: q, ghost: false });
        });
      }
      return bb;
    },
  },

  /* ------------------------------------------------ special: title card */
  title: {
    name: 'タイトル', special: true, fits: () => false,
    plan: (rng, cut, st) => ({ font: rng.pick(fontsOf(st, ['display', 'serif'])) }),
    render(env) {
      const { W, H, sc } = env, P = env.cut.params;
      const size = Math.min(J.fitSize(env.cut.text, P.font, W * 0.7, H * 0.2, { track: 0.08 }), H * 0.16);
      const bb = J.mainDraw(env, { text: env.cut.text, font: P.font, size, x: W / 2, y: H / 2, track: 0.08, color: sc.fg });
      if (env.cut.note) env.draw({ text: env.cut.note, font: env.st.fonts.body[0], size: J.clamp(H * 0.03, 16, 32), x: W / 2, y: H / 2 + size * 0.95, track: 0.3, color: sc.sub, alpha: E.outCubic(J.clamp((env.lt - 0.3) / 0.4)) * (1 - env.pOut), ghost: false });
      return bb;
    },
  },

  /* ------------------------------------------------ special: interlude */
  interlude: {
    name: '間奏', special: true, fits: () => false,
    plan: (rng) => ({ variant: rng.pick(['counter', 'rings']) }),
    render(env) {
      const { W, H, sc } = env, P = env.cut.params, lb = env.ltb;
      const fs = J.clamp(H * 0.022, 12, 22);
      if (P.variant === 'counter') {
        const remain = Math.max(0, env.cut.dur - env.lt);
        env.draw({ text: remain.toFixed(1), font: env.st.fonts.display[0], size: H * 0.36, x: W / 2, y: H / 2, color: sc.fg, alpha: 0.9 });
      }
      for (let k = 0; k < 3; k++) env.circle(W / 2, H / 2, H * (0.2 + k * 0.1) * (1 + 0.04 * Math.sin(lb * 2 + k)), null, sc.sub, 1.2, 0.5, false);
      env.draw({ text: env.cut.text || '— interlude —', font: env.st.fonts.body[0], size: fs, x: W / 2, y: H * 0.82, track: 0.4, color: sc.sub, ghost: false });
      return { x0: W * 0.35, x1: W * 0.65, y0: H * 0.3, y1: H * 0.7, cx: W / 2, cy: H / 2, boxes: [] };
    },
  },
};
J.LAYOUT_ORDER = ['center', 'mixed', 'vcols', 'marquee', 'tile', 'scatter', 'ring', 'wave', 'huge', 'labels', 'condensed', 'gloss', 'type', 'diag', 'circle', 'stack', 'pill'];
J.ENTER_ORDER = ['cut', 'assemble', 'slice', 'type', 'pop', 'drop', 'stretch', 'wipe', 'blur', 'spin', 'flicker', 'scramble', 'zoom'];
J.HOLD_ORDER = ['still', 'jitter', 'drift', 'breathe', 'wave', 'glitchtick'];
J.EXIT_ORDER = ['cut', 'explode', 'fall', 'drift', 'slice', 'wipe', 'shrink', 'blur', 'stretch', 'scatter', 'glitch'];
})();
