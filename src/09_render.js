/* ============================================================
   JIZURA — frame renderer: background, chroma passes, HUD, post FX
   ============================================================ */
(() => {
'use strict';
const E = J.E;

const mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, w | 0); c.height = Math.max(1, h | 0); return c; };

J.cutAt = (plan, t) => {
  const cs = plan.cuts; let lo = 0, hi = cs.length - 1, ans = -1;
  while (lo <= hi) { const m = (lo + hi) >> 1; if (cs[m].start <= t) { ans = m; lo = m + 1; } else hi = m - 1; }
  if (ans < 0) return null;
  const c = cs[ans];
  return t < c.end ? c : null;
};

class Renderer {
  constructor() {
    this.scratch = mk(2, 2); this.small = mk(2, 2); this.tiny = mk(2, 2);
    this.grain = [];
    for (let k = 0; k < 4; k++) {
      const g = mk(256, 256), x = g.getContext('2d'), id = x.createImageData(256, 256);
      for (let i = 0; i < id.data.length; i += 4) { const v = Math.random() * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; }
      x.putImageData(id, 0, 0); this.grain.push(g);
    }
    const sl = mk(1, 4), sx = sl.getContext('2d'); sx.fillStyle = '#fff'; sx.fillRect(0, 0, 1, 4); sx.fillStyle = '#000'; sx.fillRect(0, 3, 1, 1);
    this.scan = sl;
    this.paperCache = new Map();
    this.filterOK = (() => { try { const c = mk(4, 4).getContext('2d'); c.filter = 'blur(2px)'; return c.filter === 'blur(2px)'; } catch (e) { return false; } })();
  }

  paper(W, H) {
    const key = W + 'x' + H;
    let p = this.paperCache.get(key);
    if (p) return p;
    const w = Math.round(W / 2), h = Math.round(H / 2);
    p = mk(w, h); const x = p.getContext('2d');
    x.fillStyle = '#fff'; x.fillRect(0, 0, w, h);
    const lo = mk(Math.ceil(w / 24), Math.ceil(h / 24)), lx = lo.getContext('2d'), ld = lx.createImageData(lo.width, lo.height);
    for (let i = 0; i < ld.data.length; i += 4) { const v = 225 + Math.random() * 30; ld.data[i] = v; ld.data[i + 1] = v - 2; ld.data[i + 2] = v - 6; ld.data[i + 3] = 255; }
    lx.putImageData(ld, 0, 0);
    x.imageSmoothingEnabled = true; x.globalAlpha = 0.9; x.drawImage(lo, 0, 0, w, h); x.globalAlpha = 1;
    const id = x.getImageData(0, 0, w, h);
    for (let i = 0; i < id.data.length; i += 4) { const n = (Math.random() - 0.5) * 22; id.data[i] += n; id.data[i + 1] += n; id.data[i + 2] += n; }
    x.putImageData(id, 0, 0);
    x.strokeStyle = 'rgba(120,110,100,0.18)'; x.lineWidth = 0.7;
    for (let i = 0; i < 900; i++) { const X = Math.random() * w, Y = Math.random() * h, a = Math.random() * J.TAU, L = 4 + Math.random() * 14; x.beginPath(); x.moveTo(X, Y); x.quadraticCurveTo(X + Math.cos(a + 0.5) * L / 2, Y + Math.sin(a + 0.5) * L / 2, X + Math.cos(a) * L, Y + Math.sin(a) * L); x.stroke(); }
    x.fillStyle = 'rgba(60,50,40,0.25)';
    for (let i = 0; i < 1400; i++) { x.fillRect(Math.random() * w, Math.random() * h, Math.random() * 1.6, Math.random() * 1.6); }
    this.paperCache.set(key, p);
    return p;
  }

  ensure(c, w, h) { if (c.width !== w || c.height !== h) { c.width = w; c.height = h; } return c; }

  /* main entry: draw frame at time t into ctx (canvas px = design * scale) */
  frame(ctx, plan, t, opt = {}) {
    const W = plan.W, H = plan.H, scale = opt.scale || 1;
    const cw = ctx.canvas.width, ch = ctx.canvas.height;
    const fx = plan.fx, st = plan.style, fps = plan.fps;
    // motion is quantised to 'koma' drawings per second (24fps timebase); random flicker runs on a <=24Hz clock
    const stepDur = J.stepDur(fx, fps);
    const clock = J.komaOf(fx) > 0 ? stepDur : 1 / 24;
    const tq = Math.floor(t / stepDur + 1e-6) * stepDur;
    const mainCut = J.cutAt(plan, tq);
    const sc = st.schemes[mainCut ? mainCut.scheme % st.schemes.length : 0] || st.schemes[0];
    const allowFilter = this.filterOK && !opt.fast;
    if (J.setLang) J.setLang(plan.lang || 'ja');           // faces follow the plan's lyric language
    if (J.setTypeset) J.setTypeset(plan.typeset);          // 文字整列
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; ctx.filter = 'none';
    ctx.clearRect(0, 0, cw, ch);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    // ---------- background ----------
    const key = plan.keyBg && J.KEY_BG && J.KEY_BG[plan.keyBg] ? plan.keyBg : null;   // 合成用: white-on-black, finished in keyFinish()
    if (key && !opt.transparent) { ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, W, H); }
    else if (!opt.transparent) {
      ctx.fillStyle = sc.bg; ctx.fillRect(0, 0, W, H);
      const g = ctx.createRadialGradient(W / 2, H * 0.45, 0, W / 2, H / 2, Math.hypot(W, H) * 0.6);
      const lift = J.lum(sc.bg) < 0.5 ? 'rgba(255,255,255,0.045)' : 'rgba(255,255,255,0.10)';
      g.addColorStop(0, lift); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      const paperAmt = (sc.paper ? 1 : st.texture.paper || 0) * (fx.texture ?? 0.6);
      if (paperAmt > 0.02) {
        ctx.globalCompositeOperation = J.lum(sc.bg) < 0.4 ? 'screen' : 'multiply';
        ctx.globalAlpha = J.lum(sc.bg) < 0.4 ? paperAmt * 0.06 : paperAmt * 0.85;
        if (J.lum(sc.bg) < 0.4) ctx.filter = 'invert(1)';
        ctx.drawImage(this.paper(W, H), 0, 0, W, H);
        ctx.filter = 'none'; ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      }
    }
    // ---------- camera & chroma amounts ----------
    const u = H / 1080;
    const events = plan.events;
    let spike = 0, shake = 0, beatPulse = 0;
    for (let i = 0; i < events.length; i++) {
      const ev = events[i]; if (ev.t > t) break; const dt = (t - ev.t) * 24;
      if (dt > 14) continue;
      if (ev.type === 'chroma') spike += ev.amp * Math.pow(0.55, dt);
      else if (ev.type === 'shake') shake += ev.amp * Math.pow(0.62, dt);
    }
    if (plan.beats && plan.beats.length) {
      const b = prevBeat(plan.beats, t);
      if (b != null && t - b < 0.25) beatPulse = 0.9 * Math.exp(-(t - b) * 16);
    }
    const chroma = (fx.chroma ?? 0.7) * (st.ghost ?? 1) * (1 + spike + beatPulse);
    const step = Math.floor(tq / clock + 1e-6);
    const beatInfo = plan.beats && plan.beats.length ? beatAt(plan.beats, tq) : null;
    const energy = plan.energy ? plan.energy[Math.min(plan.energy.length - 1, Math.max(0, Math.floor(t * plan.energyRate)))] : null;
    // ---------- background graphic (per line) ----------
    // 透過PNG 前景／後景 (opt.layer): 'back' = background graphic + the decorations behind the lyrics, 'front' = the rest
    const layer = opt.transparent ? opt.layer || null : null;
    if ((!opt.transparent || layer === 'back') && !key && mainCut && mainCut.bg && mainCut.bg !== 'none' && J.BG[mainCut.bg]) {
      const env = this.makeEnv(ctx, plan, mainCut, sc, { pass: 'main', t: tq, lt: tq - mainCut.start, ltb: tq - mainCut.start, step, scale, allowFilter, energy, beat: beatInfo, bgOnly: true });
      ctx.save();
      try { J.BG[mainCut.bg].draw(env, mainCut.bgP || {}); } catch (e) { console.warn('bg', mainCut.bg, e); }
      ctx.restore();
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
    }
    const shx = J.rs(step, 71) * shake * 16 * u, shy = J.rs(step, 72) * shake * 11 * u;
    // ---------- content passes ----------
    const passes = [
      { pass: 'B', lag: 1.6 / 24, off: [-3.4 * chroma * u, -1.3 * chroma * u] },
      { pass: 'A', lag: 0.8 / 24, off: [3.2 * chroma * u, 1.9 * chroma * u] },
      { pass: 'main', lag: 0, off: [0, 0] },
    ];
    const ghostOn = (fx.chroma ?? 0.7) > 0.02 && (st.ghost ?? 1) > 0.02 && !opt.noGhost;
    // モーフ (統一感): during the first moments of a morph cut its lyric is drawn by drawMorph (glyphs glide / melt)
    const MC = !opt.noTrans && !opt.glyphLog && mainCut && mainCut.morph && mainCut.index > 0 ? mainCut : null;
    const mPrev = MC ? plan.cuts[MC.index - 1] : null, mlt = MC ? tq - MC.start : 0;
    const morphOn = !!(MC && mPrev && mlt < MC.morph.dur && Math.abs(mPrev.end - MC.start) < 0.06);
    let mainBB = null, mainEnv = null;
    // camera blur (focus pulls etc.) is applied ONCE to the whole content layer — a blur filter on every
    // individual draw call is extremely slow when a layout draws many text rows
    let layerBlur = 0, LX = null;
    if (allowFilter && mainCut && J.CAMERA[mainCut.cam] && mainCut.cam !== 'push') {
      try {
        const e0 = this.makeEnv(ctx, plan, mainCut, sc, { pass: 'main', t: tq, lt: tq - mainCut.start, ltb: tq - mainCut.start, step, scale, allowFilter, energy, beat: beatInfo });
        const c0 = J.CAMERA[mainCut.cam].get(e0, mainCut.camP || {});
        if (c0 && c0.blur > 0.4) layerBlur = c0.blur;
      } catch (e) {}
      if (layerBlur) {
        const L = this.ensure(this.camLayer || (this.camLayer = mk(2, 2)), cw, ch);
        LX = L.getContext('2d'); LX.setTransform(1, 0, 0, 1, 0, 0); LX.globalAlpha = 1; LX.globalCompositeOperation = 'source-over'; LX.filter = 'none';
        LX.clearRect(0, 0, cw, ch); LX.setTransform(scale, 0, 0, scale, 0, 0);
      }
    }
    for (const P of passes) {
      if (P.pass !== 'main' && !ghostOn) continue;
      const tp = Math.max(0, tq - P.lag);
      const cut0 = P.lag ? J.cutAt(plan, tp) : mainCut;
      if (!cut0) continue;
      if (morphOn && cut0 !== mainCut) continue;
      // 中央を空ける: the cut in its band, and its companion (echo / whole line / decorations) in the other band
      for (const cut of plan.centerFree && cut0.companion ? [cut0, cut0.companion] : [cut0]) {
      const csc = st.schemes[cut.scheme % st.schemes.length] || st.schemes[0];
      const lt = tp - cut.start;
      const X = LX || ctx;
      const Z = plan.centerFree && cut.zone ? cut.zone : null;
      const env = this.makeEnv(X, plan, cut, csc, {
        pass: P.pass, passColor: P.pass === 'A' ? csc.ghostA : P.pass === 'B' ? csc.ghostB : null,
        t: tp, lt, ltb: lt + P.lag, step: Math.floor(tp / clock + 1e-6), scale, allowFilter, energy, beat: beatInfo, layer, zone: Z,
        hideText: morphOn, glyphLog: P.pass === 'main' ? opt.glyphLog || null : null,
      });
      X.save();
      // 中央を空ける: the cut (text, decorations, its camera) is drawn in its band and clipped to it
      if (Z) { X.beginPath(); X.rect(Z.x, Z.y, Z.w, Z.h); X.clip(); X.translate(Z.x, Z.y); }
      const W = env.W, H = env.H;
      // camera move for this cut (default: slow push-in)
      let cam = null;
      const CD = J.CAMERA[cut.cam] || J.CAMERA.push;
      try { cam = CD.get(env, cut.camP || {}); } catch (e) { cam = null; }
      cam = cam || {};
      const cs = cam.s ?? 1;
      X.translate(W / 2 + shx + P.off[0] + (cam.x || 0), H / 2 + shy + P.off[1] + (cam.y || 0));
      if (cam.rot) X.rotate(cam.rot * J.DEG);
      if (cam.skx) X.transform(1, 0, Math.tan(cam.skx * J.DEG), 1, 0, 0);
      X.scale(cs * (cam.sx ?? 1), cs * (cam.sy ?? 1)); X.translate(-W / 2, -H / 2);
      if (P.pass !== 'main') X.globalCompositeOperation = J.lum(csc.bg) > 0.55 ? 'multiply' : 'source-over';
      this.drawCut(env);
      X.restore();
      if (P.pass === 'main' && cut === cut0) { mainEnv = env; }
      }
    }
    if (LX) {
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      ctx.filter = `blur(${(layerBlur * scale).toFixed(1)}px)`; ctx.drawImage(LX.canvas, 0, 0); ctx.restore();
    }
    if (morphOn && layer !== 'back') {
      const L = this.morphLogs(plan, mPrev, MC, cw, ch, scale, opt);
      const k = J.clamp(mlt / MC.morph.dur), e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      this.drawMorph(ctx, L, e, allowFilter);
    }
    // ---------- cut-to-cut transition: composite the previous cut's resting frame with this one ----------
    if (!opt.noTrans && mainCut && mainCut.trans && J.TRANS[mainCut.trans] && mainCut.index > 0) {
      const lt = tq - mainCut.start, dur = mainCut.transDur || 0.35;
      const prev = plan.cuts[mainCut.index - 1];
      if (lt < dur && prev && Math.abs(prev.end - mainCut.start) < 0.06) {
        const A = this.ensure(this.transA || (this.transA = mk(2, 2)), cw, ch), B = this.ensure(this.transB || (this.transB = mk(2, 2)), cw, ch);
        const bx = B.getContext('2d'); bx.setTransform(1, 0, 0, 1, 0, 0); bx.globalCompositeOperation = 'copy'; bx.drawImage(ctx.canvas, 0, 0); bx.globalCompositeOperation = 'source-over';
        this.frame(A.getContext('2d'), plan, Math.max(prev.start, prev.end - 1e-3), Object.assign({}, opt, { noTrans: true, noPost: true, noHud: true }));
        const psc = st.schemes[prev.scheme % st.schemes.length] || st.schemes[0];
        ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
        try { J.TRANS[mainCut.trans].draw(ctx, A, B, J.clamp(lt / dur), { cw, ch, sc, scPrev: psc, st, P: mainCut.transP || {}, step, t, scale, allowFilter, seed: mainCut.seed | 0, tmp: (w, h) => this.ensure(this.transC || (this.transC = mk(2, 2)), w, h) }); }
        catch (e) { console.warn('trans', mainCut.trans, e); }
        ctx.restore();
      }
    }
    // ---------- HUD ----------
    if (plan.hud && !opt.noHud && layer !== 'back') {
      const env = this.makeEnv(ctx, plan, mainCut, sc, { pass: 'main', t: tq, lt: 0, ltb: 0, step, scale, allowFilter, energy, beat: beatInfo });
      J.drawHUD(env, plan);
    }
    ctx.restore();
    // ---------- post ----------
    if (!opt.noPost) this.post(ctx, plan, t, tq, step, sc, scale, opt, allowFilter);
    if (key && !opt.noPost) this.keyFinish(ctx, key, opt);
  }

  /* 合成用の背景: make the finished frame monochrome (white text + effects only) and put it on the key colour.
     black: as rendered (black = empty).  green: screened onto #00FF00, so black → green, white stays white and
     the soft greys (ghosts, glow, fades) turn into partial transparency when keyed — the same result as
     screen-blending the black version. */
  keyFinish(ctx, key, opt) {
    const cw = ctx.canvas.width, ch = ctx.canvas.height;
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.filter = 'none';
    if (opt.transparent) {
      // keep the alpha: desaturate through a copy
      const S = this.ensure(this.scratch, cw, ch), sx = S.getContext('2d');
      sx.setTransform(1, 0, 0, 1, 0, 0); sx.globalAlpha = 1; sx.globalCompositeOperation = 'copy';
      if (this.filterOK) { sx.filter = 'grayscale(1)'; sx.drawImage(ctx.canvas, 0, 0); sx.filter = 'none'; }
      else {
        sx.drawImage(ctx.canvas, 0, 0); sx.globalCompositeOperation = 'saturation'; sx.fillStyle = '#808080'; sx.fillRect(0, 0, cw, ch);
        sx.globalCompositeOperation = 'destination-in'; sx.drawImage(ctx.canvas, 0, 0);
      }
      sx.globalCompositeOperation = 'source-over';
      ctx.globalCompositeOperation = 'copy'; ctx.drawImage(S, 0, 0);
    } else {
      // opaque frame: the 'saturation' blend with any grey keeps luminosity and drops colour
      ctx.globalCompositeOperation = 'saturation'; ctx.fillStyle = '#808080'; ctx.fillRect(0, 0, cw, ch);
      if (key === 'green') { ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = J.KEY_BG.green; ctx.fillRect(0, 0, cw, ch); }
    }
    ctx.restore();
  }

  /* モーフ: where every glyph of the previous cut rests at its end, and where this cut's glyphs land (cached) */
  morphLogs(plan, A, B, cw, ch, scale, opt) {
    if (!this.morphCache || this.morphCache.plan !== plan) this.morphCache = { plan, map: new Map() };
    const key = A.index + ':' + B.index + ':' + cw + 'x' + ch + ':' + scale.toFixed(4), M = this.morphCache.map;
    if (M.has(key)) return M.get(key);
    const cv = this.ensure(this.morphCv || (this.morphCv = mk(2, 2)), cw, ch), x = cv.getContext('2d');
    const o2 = { scale, noPost: true, noHud: true, noTrans: true, noGhost: true, transparent: opt.transparent, fast: true };
    const la = [], lb = [];
    this.frame(x, plan, Math.max(A.start, A.end - 1e-3), Object.assign({}, o2, { glyphLog: la }));
    this.frame(x, plan, B.start + B.morph.dur + 1e-3, Object.assign({}, o2, { glyphLog: lb }));
    const r = { A: la, B: lb };
    M.set(key, r); if (M.size > 24) M.delete(M.keys().next().value);
    return r;
  }
  drawMorph(ctx, L, e, allowFilter) {
    const used = new Array(L.A.length).fill(false), pairs = [];
    for (const g of L.B) {
      let j = -1;
      for (let q = 0; q < L.A.length; q++) if (!used[q] && L.A[q].ch === g.ch) { j = q; break; }
      if (j >= 0) used[j] = true;
      pairs.push([j >= 0 ? L.A[j] : null, g]);
    }
    const det = m => Math.sqrt(Math.abs(m[0] * m[3] - m[1] * m[2])) || 1;
    const put = (g, col, alpha, blur) => {
      if (alpha <= 0.01) return;
      ctx.globalAlpha = Math.min(1, alpha);
      ctx.filter = allowFilter && blur > 0.4 ? `blur(${blur.toFixed(1)}px)` : 'none';
      ctx.font = g.font; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      if (g.fill) { ctx.fillStyle = col; ctx.fillText(g.ch, 0, 0); }
      if (g.stroke > 0) { ctx.lineJoin = 'round'; ctx.lineWidth = g.stroke; ctx.strokeStyle = g.strokeColor || col; ctx.strokeText(g.ch, 0, 0); }
    };
    ctx.save();
    // the rest of the old line melts away (drips, swells, blurs)…
    L.A.forEach((a, q) => {
      if (used[q]) return;
      ctx.setTransform(a.m[0], a.m[1], a.m[2], a.m[3], a.m[4], a.m[5]);
      ctx.translate(0, e * a.px * 0.45); ctx.scale(1 + e * 0.12, 1 + e * 0.6);
      put(a, a.color, a.a * Math.pow(1 - e, 1.4), e * a.px * 0.14 * det(a.m));
    });
    // …shared characters glide to their new place, new ones condense out of a blur
    for (const [a, b] of pairs) {
      if (a) {
        const m = a.m.map((v, i) => v + (b.m[i] - v) * e);
        ctx.setTransform(m[0], m[1], m[2], m[3], m[4], m[5]);
        const k = (a.px / b.px) + (1 - a.px / b.px) * e; ctx.scale(k, k);
        put(b, /^#[0-9a-f]{3,8}$/i.test(a.color) && /^#[0-9a-f]{3,8}$/i.test(b.color) ? J.mix(a.color, b.color, e) : (e < 0.5 ? a.color : b.color), a.a + (b.a - a.a) * e, 0);
      } else {
        const k = 1 - e;
        ctx.setTransform(b.m[0], b.m[1], b.m[2], b.m[3], b.m[4], b.m[5]);
        ctx.translate(0, -k * b.px * 0.3); ctx.scale(1 + k * 0.1, 1 + k * 0.4);
        put(b, b.color, b.a * e, k * b.px * 0.14 * det(b.m));
      }
    }
    ctx.restore();
  }
  makeEnv(ctx, plan, cut, sc, o) {
    const W = o.zone ? o.zone.w : plan.W, H = o.zone ? o.zone.h : plan.H;   // 中央を空ける: a cut lives in its side band
    const env = Object.assign({ ctx, W, H, sc, st: plan.style, fx: plan.fx, fps: plan.fps, cut, plan }, o);
    if (cut) {
      env.pIn = J.clamp(o.lt / Math.max(0.01, cut.inDur));
      env.pOut = cut.outDur > 0 ? J.clamp((o.lt - (cut.dur - cut.outDur)) / cut.outDur) : 0;
    } else { env.pIn = 1; env.pOut = 0; }
    const ghost = env.pass !== 'main';
    const colOf = (c, g) => (ghost ? (g === false ? null : env.passColor) : c);
    env.draw = it => J.drawItem(env, it);
    env.rect = (x, y, w, h, c, a = 1, g = true) => { const col = colOf(c, g); if (!col || a <= 0) return; ctx.globalAlpha = a; ctx.fillStyle = col; ctx.fillRect(x, y, w, h); ctx.globalAlpha = 1; };
    env.line = (pts, c, lw = 1, a = 1, g = true) => {
      const col = colOf(c, g); if (!col || a <= 0 || pts.length < 2) return;
      ctx.globalAlpha = a; ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.lineJoin = 'miter'; ctx.lineCap = 'butt';
      ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.stroke(); ctx.globalAlpha = 1;
    };
    env.polyPartial = (pts, e, c, lw = 1, a = 1, g = true) => {
      if (e <= 0) return;
      let L = 0; const seg = [];
      for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(d); L += d; }
      let rem = L * J.clamp(e); const out = [pts[0]];
      for (let i = 1; i < pts.length && rem > 0; i++) {
        const d = seg[i - 1];
        if (rem >= d) { out.push(pts[i]); rem -= d; }
        else { const k = rem / d; out.push([J.lerp(pts[i - 1][0], pts[i][0], k), J.lerp(pts[i - 1][1], pts[i][1], k)]); rem = 0; }
      }
      env.line(out, c, lw, a, g);
    };
    env.circle = (cx, cy, r, fill, stroke, lw = 1, a = 1, g = true) => {
      if (r <= 0 || a <= 0) return;
      const f = fill ? colOf(fill, g) : null, s = stroke ? colOf(stroke, g) : null;
      if (!f && !s) return;
      ctx.globalAlpha = a; ctx.beginPath(); ctx.arc(cx, cy, r, 0, J.TAU);
      if (f) { ctx.fillStyle = f; ctx.fill(); }
      if (s) { ctx.strokeStyle = s; ctx.lineWidth = lw; ctx.stroke(); }
      ctx.globalAlpha = 1;
    };
    env.arc = (cx, cy, r, a0, a1, c, lw = 1, a = 1, g = true) => {
      const col = colOf(c, g); if (!col || a <= 0 || r <= 0) return;
      ctx.globalAlpha = a; ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath(); ctx.arc(cx, cy, r, a0 * J.DEG, a1 * J.DEG); ctx.stroke(); ctx.globalAlpha = 1;
    };
    env.rrect = (x, y, w, h, r, fill, a = 1, g = true, stroke, lw = 1) => {
      if (a <= 0 || w <= 0 || h <= 0) return;
      const f = fill ? (ghost ? colOf(fill, g) : fill) : null, s = stroke ? colOf(stroke, g) : null;
      if (!f && !s) return;
      r = Math.min(r, w / 2, h / 2);
      ctx.globalAlpha = a; ctx.beginPath();
      ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
      if (f) { ctx.fillStyle = f; ctx.fill(); }
      if (s) { ctx.strokeStyle = s; ctx.lineWidth = lw; ctx.stroke(); }
      ctx.globalAlpha = 1;
    };
    env.poly = (pts, c, a = 1, g = true) => {
      const col = colOf(c, g); if (!col || a <= 0) return;
      ctx.globalAlpha = a; ctx.fillStyle = col; ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
    };
    env.blob = (pts, c, a = 1, g = true) => {
      const col = colOf(c, g); if (!col || a <= 0) return;
      ctx.globalAlpha = a; ctx.fillStyle = col; ctx.beginPath();
      const n = pts.length, mid = (i) => [(pts[i % n][0] + pts[(i + 1) % n][0]) / 2, (pts[i % n][1] + pts[(i + 1) % n][1]) / 2];
      const m0 = mid(0); ctx.moveTo(m0[0], m0[1]);
      for (let i = 1; i <= n; i++) { const p = pts[i % n], m = mid(i); ctx.quadraticCurveTo(p[0], p[1], m[0], m[1]); }
      ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
    };
    return env;
  }

  drawCut(env) {
    const cut = env.cut, L = J.LAYOUTS[cut.layout] || J.LAYOUTS.center;
    const decor = cut.decor || [];
    if (env.layer !== 'front') for (const d of decor) { const D = J.DECOR[d.id]; if (D && D.layer === 'back') try { D.draw(env, null, d); } catch (e) { console.warn(e); } }
    if (env.layer === 'back') return null;                // 後景だけ: the lyrics and the front decorations go to the other layer
    let bb = null;
    try { bb = L.render(env); } catch (e) { console.warn('layout', cut.layout, e); }
    for (const d of decor) { const D = J.DECOR[d.id]; if (D && D.layer === 'front') try { D.draw(env, bb, d); } catch (e) { console.warn(e); } }
    return bb;
  }

  /* 透過PNG: screen effects are written for an opaque frame (they paint the background colour, wash the whole frame,
     or redraw a shifted copy over it). In transparent mode each effect is fenced:
       - a full-frame opaque fill (background colour, black/white frame…) clears instead — it hid everything anyway
       - afterwards, alpha is limited to where content was (before the effect) plus where the effect drew the
         content again (shifted / scaled / mirrored copies of the scratch copy), so washes, flashes and strobes
         tint the lyrics and the graphics but never turn the empty background opaque                            */
  alphaGuard(ctx, S, sc) {
    const cw = ctx.canvas.width, ch = ctx.canvas.height, R = this;
    const P = this.ensure(this.guardP || (this.guardP = mk(2, 2)), cw, ch), px = P.getContext('2d');
    const M = this.ensure(this.guardM || (this.guardM = mk(2, 2)), cw, ch), mx = M.getContext('2d');
    let cleared = false, bgN = null;
    const content = img => img === S;                  // the scratch copy of the frame (temp canvases may carry an opaque background)
    const own = ['fillRect', 'drawImage'];
    return {
      begin() {
        cleared = false;
        const fs0 = ctx.fillStyle; ctx.fillStyle = sc.bg; bgN = ctx.fillStyle; ctx.fillStyle = fs0;   // the background colour, normalised
        px.setTransform(1, 0, 0, 1, 0, 0); px.globalAlpha = 1; px.globalCompositeOperation = 'copy'; px.filter = 'none'; px.drawImage(ctx.canvas, 0, 0);
        mx.setTransform(1, 0, 0, 1, 0, 0); mx.globalAlpha = 1; mx.globalCompositeOperation = 'source-over'; mx.filter = 'none'; mx.clearRect(0, 0, cw, ch);
        const proto = Object.getPrototypeOf(ctx);
        ctx.fillRect = function (x, y, w, h) {
          const T = this.getTransform(), full = this.globalCompositeOperation === 'source-over' && this.globalAlpha >= 0.999 && typeof this.fillStyle === 'string' &&
            /^#[0-9a-f]{6}$/i.test(this.fillStyle) && T.b === 0 && T.c === 0 && T.e + x * T.a <= 1 && T.f + y * T.d <= 1 && T.e + (x + w) * T.a >= cw - 1 && T.f + (y + h) * T.d >= ch - 1;
          if (full) { cleared = true; mx.clearRect(0, 0, cw, ch); return proto.clearRect.call(this, x, y, w, h); }
          if (this.globalCompositeOperation === 'source-over' && typeof this.fillStyle === 'string' && /^#[0-9a-f]{6}$/i.test(this.fillStyle) && this.globalAlpha >= 0.999 && this.fillStyle === bgN) return proto.clearRect.call(this, x, y, w, h);
          return proto.fillRect.call(this, x, y, w, h);
        };
        ctx.drawImage = function (img, ...a) {
          if (content(img)) { mx.setTransform(this.getTransform()); mx.globalAlpha = this.globalAlpha; proto.drawImage.call(mx, img, ...a); }
          return proto.drawImage.call(this, img, ...a);
        };
      },
      end() {
        for (const k of own) delete ctx[k];
        mx.setTransform(1, 0, 0, 1, 0, 0); mx.globalAlpha = 1;
        if (!cleared) { mx.globalCompositeOperation = 'source-over'; mx.drawImage(P, 0, 0); }
        ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.filter = 'none';
        ctx.globalCompositeOperation = 'destination-in'; ctx.drawImage(M, 0, 0);
        ctx.restore();
      },
    };
  }

  post(ctx, plan, t, tq, step, sc, scale, opt, allowFilter) {
    const cw = ctx.canvas.width, ch = ctx.canvas.height;
    const fx = plan.fx, st = plan.style;
    const active = plan.events.filter(ev => t >= ev.t && t < ev.t + Math.max(ev.dur, 1 / plan.fps));
    const needScratch = active.some(ev => ['slice', 'block', 'zoom', 'mosaic'].includes(ev.type) || (J.FXE[ev.type] && J.FXE[ev.type].scratch)) || (!opt.fast && (st.glow || 0) > 0);
    const S = needScratch ? this.ensure(this.scratch, cw, ch) : null;
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    const copy = () => { const sx = S.getContext('2d'); sx.globalCompositeOperation = 'copy'; sx.drawImage(ctx.canvas, 0, 0); sx.globalCompositeOperation = 'source-over'; };
    const clock24 = Math.floor(t * 24);           // glitch randomness changes at most 24 times a second at any output fps
    const guard = opt.transparent ? this.alphaGuard(ctx, S, sc) : null;   // 透過: effects must not fill the empty background
    for (const ev of active) {
      // progress clamped to 0..1 (an event shorter than one output frame is still shown for that frame — k would pass 1)
      const k0 = (t - ev.t) / Math.max(ev.dur, 1e-3), k = Number.isFinite(k0) ? J.clamp(k0, 0, 1) : 0;
      const st2 = clock24;
      const D = J.FXE[ev.type];
      if (guard) guard.begin();
      if (D && D.draw) {
        if (D.scratch) copy();
        try {
          D.draw(ctx, ev, k, { cw, ch, S, sc, st: plan.style, step: st2, t, scale, renderer: this, allowFilter, opt, transparent: !!opt.transparent, tmp: (w, h) => this.ensure(this.tiny, w, h), tmp2: (w, h) => this.ensure(this.small2 || (this.small2 = mk(2, 2)), w, h) });
        } catch (e) { console.warn('fx', ev.type, e); }
        ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none'; ctx.imageSmoothingEnabled = true;
        if (guard) guard.end();
        continue;
      }
      if (ev.type === 'slice') {
        copy();
        const n = 6 + (J.h(st2, 3) % 7);
        let y = 0;
        for (let i = 0; i < n && y < ch; i++) {
          const h = Math.max(2, ch * J.rr(0.01, 0.12, st2, i, 1));
          const dx = (J.r(st2, i, 2) < 0.55 ? J.rs(st2, i, 3) * cw * 0.06 * ev.amp : 0);
          if (dx) ctx.drawImage(S, 0, y, cw, h, dx, y, cw, h);
          y += h + ch * J.rr(0, 0.08, st2, i, 4);
        }
      } else if (ev.type === 'block') {
        copy();
        for (let i = 0; i < 9; i++) {
          const w = cw * J.rr(0.05, 0.3, st2, i, 5), h = ch * J.rr(0.01, 0.07, st2, i, 6);
          const x = J.r(st2, i, 7) * (cw - w), y = J.r(st2, i, 8) * (ch - h);
          const sx = J.clamp(x + J.rs(st2, i, 9) * cw * 0.08, 0, cw - w), sy = J.clamp(y + J.rs(st2, i, 10) * ch * 0.04, 0, ch - h);
          ctx.drawImage(S, sx, sy, w, h, x, y, w, h);
          if (J.r(st2, i, 11) < 0.35) { ctx.globalCompositeOperation = 'difference'; ctx.fillStyle = J.r(st2, i, 12) < 0.5 ? sc.ghostA : sc.ghostB; ctx.fillRect(x, y, w, h); ctx.globalCompositeOperation = 'source-over'; }
        }
      } else if (ev.type === 'invert') {
        ctx.globalCompositeOperation = 'difference'; ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, cw, ch); ctx.globalCompositeOperation = 'source-over';
      } else if (ev.type === 'flash') {
        ctx.globalAlpha = Math.pow(1 - k, 1.5) * 0.92; ctx.fillStyle = J.lum(sc.bg) < 0.5 ? sc.fg : '#ffffff'; ctx.fillRect(0, 0, cw, ch); ctx.globalAlpha = 1;
      } else if (ev.type === 'zoom') {
        copy();
        const a = ev.amp * (1 - k);
        for (let i = 1; i <= 6; i++) {
          const s = 1 + i * 0.022 * a; ctx.globalAlpha = 0.2 * (1 - i / 7) * Math.min(1, a * 1.3);
          ctx.drawImage(S, cw / 2 - cw * s / 2, ch / 2 - ch * s / 2, cw * s, ch * s);
        }
        ctx.globalAlpha = 1;
      } else if (ev.type === 'mosaic') {
        copy();
        const T = this.ensure(this.tiny, Math.max(8, Math.round(cw / 42)), Math.max(8, Math.round(ch / 42))), tx = T.getContext('2d');
        tx.imageSmoothingEnabled = true; tx.drawImage(S, 0, 0, T.width, T.height);
        ctx.imageSmoothingEnabled = false; ctx.globalAlpha = 0.85 * (1 - k); ctx.drawImage(T, 0, 0, cw, ch); ctx.globalAlpha = 1; ctx.imageSmoothingEnabled = true;
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      if (guard) guard.end();
    }
    // bloom
    const glow = (st.glow || 0.6) * 0.5 * (fx.texture ?? 0.6);
    if (!opt.fast && allowFilter && glow > 0.05 && !opt.transparent) {
      const sw = Math.round(cw / 4), sh = Math.round(ch / 4);
      const Sm = this.ensure(this.small, sw, sh), sx = Sm.getContext('2d');
      sx.filter = `blur(${Math.max(2, Math.round(sw / 160))}px)`; sx.globalCompositeOperation = 'copy'; sx.drawImage(ctx.canvas, 0, 0, sw, sh); sx.filter = 'none'; sx.globalCompositeOperation = 'source-over';
      ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = glow * 0.55; ctx.drawImage(Sm, 0, 0, cw, ch); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
    if (!opt.transparent && !plan.keyBg) {
      // scanlines
      const scan = (st.texture.scan || 0) * (fx.texture ?? 0.6);
      if (scan > 0.03) {
        const pat = ctx.createPattern(this.scan, 'repeat');
        const k = Math.max(1, Math.round(ch / 540));
        ctx.save(); ctx.scale(k, k); ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = scan * 0.28; ctx.fillStyle = pat; ctx.fillRect(0, 0, cw / k, ch / k); ctx.restore();
      }
      // grain
      const gr = (st.texture.grain || 0) * (fx.texture ?? 0.6);
      if (gr > 0.02) {
        const img = this.grain[((step % 4) + 4) % 4];
        const pat = ctx.createPattern(img, 'repeat');
        const k = Math.max(1, ch / 1080);
        const ox = J.r(step, 1) * 256, oy = J.r(step, 2) * 256;
        ctx.save(); ctx.scale(k, k); ctx.translate(-ox, -oy);
        ctx.fillStyle = pat;
        ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = gr * 0.2; ctx.fillRect(0, 0, cw / k + 256, ch / k + 256);
        ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = gr * 0.035; ctx.fillRect(0, 0, cw / k + 256, ch / k + 256);
        ctx.restore();
      }
      // vignette
      const vg = ctx.createRadialGradient(cw / 2, ch / 2, Math.min(cw, ch) * 0.35, cw / 2, ch / 2, Math.hypot(cw, ch) * 0.62);
      vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, `rgba(0,0,0,${0.28 * (fx.texture ?? 0.6)})`);
      ctx.fillStyle = vg; ctx.fillRect(0, 0, cw, ch);
    }
    ctx.restore();
  }
}
/* beat context at time t: time since the previous beat, beat length and index */
function beatAt(beats, t) {
  let lo = 0, hi = beats.length - 1, i = -1;
  while (lo <= hi) { const m = (lo + hi) >> 1; if (beats[m] <= t) { i = m; lo = m + 1; } else hi = m - 1; }
  if (i < 0) return null;
  const len = i + 1 < beats.length ? beats[i + 1] - beats[i] : (i > 0 ? beats[i] - beats[i - 1] : 0.5);
  return { since: t - beats[i], len: Math.max(0.2, len), index: i };
}
function prevBeat(beats, t) {
  let lo = 0, hi = beats.length - 1, ans = null;
  while (lo <= hi) { const m = (lo + hi) >> 1; if (beats[m] <= t) { ans = beats[m]; lo = m + 1; } else hi = m - 1; }
  return ans;
}
J.Renderer = Renderer;
})();
