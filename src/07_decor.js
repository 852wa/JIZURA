/* ============================================================
   JIZURA — decor (graphic elements around / behind the lyric) + HUD
   ============================================================ */
(() => {
'use strict';
const E = J.E;
const center = (env, bb) => bb || { x0: env.W * 0.35, x1: env.W * 0.65, y0: env.H * 0.4, y1: env.H * 0.6, cx: env.W / 2, cy: env.H / 2 };
const monoF = env => (env.st.fonts.mono && env.st.fonts.mono[0]) || 'mono';
const inOut = env => E.outCubic(J.clamp(env.lt / 0.3)) * (1 - E.inCubic(env.pOut));

J.DECOR = {
  /* ---------------- back layer ---------------- */
  grid: {
    name: 'グリッド', layer: 'back',
    draw(env, bb, P) {
      const { W, H, sc } = env, g = H / (P.n || 8), a = 0.12 * inOut(env);
      if (a <= 0) return;
      const pts = [];
      for (let x = (W / 2) % g; x < W; x += g) env.line([[x, 0], [x, H]], sc.sub, 1, a, false);
      for (let y = (H / 2) % g; y < H; y += g) env.line([[0, y], [W, y]], sc.sub, 1, a, false);
    },
  },
  stripes: {
    name: 'ストライプ', layer: 'back',
    draw(env, bb, P) {
      const { W, H, sc, ctx } = env, e = inOut(env);
      if (e <= 0) return;
      ctx.save(); ctx.translate(P.corner ? W * 0.85 : W * 0.15, P.corner ? H * 0.15 : H * 0.85); ctx.rotate(-35 * J.DEG);
      const w = H * 0.04;
      for (let i = -6; i <= 6; i++) env.rect(i * w * 2 - w / 2 + (env.ltb * 40) % (w * 2), -H * 0.18 * e, w, H * 0.36 * e, P.accent ? sc.accent : sc.dim, 0.9, false);
      ctx.restore();
    },
  },
  blobs: {
    name: 'インクの染み', layer: 'back',
    draw(env, bb, P) {
      const { W, H, sc, ctx } = env, s = P.seed;
      const e = E.outBack(J.clamp(env.lt / 0.35), 1.2) * (1 - E.inCubic(env.pOut));
      if (e <= 0) return;
      for (let k = 0; k < (P.n || 2); k++) {
        const cx = J.rr(W * 0.12, W * 0.88, s, k, 1), cy = J.rr(H * 0.15, H * 0.85, s, k, 2), R = J.rr(H * 0.06, H * 0.16, s, k, 3) * e;
        const m = 14, pts = [];
        for (let i = 0; i < m; i++) {
          const a = i / m * J.TAU, r = R * (0.72 + 0.5 * J.r(s, k, i, 4) + 0.08 * Math.sin(env.ltb * 3 + i));
          pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
        }
        env.blob(pts, k % 2 ? sc.accent : (sc.accent2 || sc.accent), 0.95, true);
      }
    },
  },
  bars: {
    name: '荒い帯', layer: 'back',
    draw(env, bb, P) {
      const { W, H, sc } = env, s = P.seed, n = P.n || 3;
      for (let k = 0; k < n; k++) {
        const e = E.outExpo(J.clamp((env.lt - k * 0.05) / 0.3)) * (1 - E.inExpo(env.pOut));
        if (e <= 0) continue;
        const y = H * (J.r(s, k, 11) < 0.5 ? J.rr(0.1, 0.27, s, k, 1) : J.rr(0.73, 0.9, s, k, 1)), h = H * J.rr(0.03, 0.08, s, k, 2), fromL = J.r(s, k, 3) < 0.5;
        const w = W * J.rr(0.35, 0.75, s, k, 4) * e;
        const x0 = fromL ? -10 : W + 10 - w;
        const pts = [];
        const m = 10;
        for (let i = 0; i <= m; i++) pts.push([x0 + w * i / m, y - h / 2 + J.rs(s, k, i, 5) * h * 0.08]);
        pts.push([x0 + w + J.rs(s, k, 6) * h * 0.4, y + h * 0.1]);
        for (let i = m; i >= 0; i--) pts.push([x0 + w * i / m, y + h / 2 + J.rs(s, k, i, 7) * h * 0.08]);
        env.poly(pts, k === 0 ? sc.accent : sc.ink, 0.92, true);
      }
    },
  },
  shapes: {
    name: '図形', layer: 'back',
    draw(env, bb, P) {
      const { W, H, sc, ctx } = env, s = P.seed, n = P.n || 5;
      for (let k = 0; k < n; k++) {
        const q = E.outBack(J.clamp((env.lt - J.r(s, k, 9) * 0.3) / 0.25), 1.8) * (1 - E.inCubic(env.pOut));
        if (q <= 0) continue;
        const type = ['circle', 'square', 'tri', 'halftone', 'halftone', 'ring', 'ring'][Math.floor(J.r(s, k, 1) * 7)];
        const top = J.r(s, k, 4) < 0.5;
        const x = J.rr(W * 0.05, W * 0.95, s, k, 2) + env.ltb * J.rs(s, k, 3) * 30, y = (top ? J.rr(H * 0.06, H * 0.24, s, k, 10) : J.rr(H * 0.76, H * 0.94, s, k, 10)) + env.ltb * J.rs(s, k, 5) * 20;
        const r = J.rr(H * 0.018, H * 0.06, s, k, 6) * q, rot = (J.r(s, k, 7) * 360 + env.ltb * J.rs(s, k, 8) * 60) * J.DEG;
        const col = [sc.accent, sc.accent2 || sc.fg, sc.ink, sc.fg][k % 4];
        ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
        if (type === 'circle') env.circle(0, 0, r, col, null, 0, 1, true);
        else if (type === 'ring') env.circle(0, 0, r, null, col, Math.max(2, r * 0.12), 1, true);
        else if (type === 'square') env.rect(-r, -r, r * 2, r * 2, col, 1, true);
        else if (type === 'tri') env.poly([[0, -r], [r * 0.9, r * 0.6], [-r * 0.9, r * 0.6]], col, 1, true);
        else if (type === 'cross') { env.rect(-r, -r * 0.18, r * 2, r * 0.36, col, 1, true); env.rect(-r * 0.18, -r, r * 0.36, r * 2, col, 1, true); }
        else { const d = r / 3.2; for (let i = -3; i <= 3; i++) for (let j = -3; j <= 3; j++) { const rr = d * 0.45 * (1 - (Math.abs(i) + Math.abs(j)) / 8); if (rr > 0.5) env.circle(i * d, j * d, rr, col, null, 0, 1, true); } }
        ctx.restore();
      }
    },
  },
  counter: {
    name: '大きな数字', layer: 'back',
    draw(env, bb, P) {
      const { W, H, sc } = env;
      const a = inOut(env); if (a <= 0) return;
      const num = P.mode === 'count' ? String(Math.floor(J.lerp(P.from, P.to, E.outCubic(J.clamp(env.lt / (env.cut.dur * 0.8)))))) : String((env.cut.index | 0) + 1).padStart(2, '0');
      env.draw({ text: num, font: env.st.fonts.display[0], size: H * 0.5, x: P.right ? W * 0.86 : W * 0.14, y: H * (P.low ? 0.72 : 0.3), color: P.accent ? sc.accent : sc.dim, alpha: a * (P.accent ? 0.9 : 1), ghost: false });
    },
  },

  /* ---------------- front layer ---------------- */
  brackets: {
    name: '枠マーク', layer: 'front',
    draw(env, bb, P) {
      bb = center(env, bb); const { sc } = env;
      const e = E.outExpo(J.clamp(env.lt / 0.35)) * (1 - E.inCubic(env.pOut)); if (e <= 0) return;
      const pad = 18 + (bb.y1 - bb.y0) * 0.12;
      const x0 = bb.x0 - pad, x1 = bb.x1 + pad, y0 = bb.y0 - pad, y1 = bb.y1 + pad;
      const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
      const X0 = J.lerp(cx, x0, e), X1 = J.lerp(cx, x1, e), Y0 = J.lerp(cy, y0, e), Y1 = J.lerp(cy, y1, e);
      const L = Math.min(x1 - x0, y1 - y0) * 0.16 + 8, c = P.accent ? sc.accent : sc.fg, w = 2.2;
      env.line([[X0, Y0 + L], [X0, Y0], [X0 + L, Y0]], c, w, 1);
      env.line([[X1 - L, Y0], [X1, Y0], [X1, Y0 + L]], c, w, 1);
      env.line([[X0, Y1 - L], [X0, Y1], [X0 + L, Y1]], c, w, 1);
      env.line([[X1 - L, Y1], [X1, Y1], [X1, Y1 - L]], c, w, 1);
    },
  },
  rings: {
    name: '座標の円', layer: 'front',
    draw(env, bb, P) {
      bb = center(env, bb); const { W, H, sc } = env, s = P.seed;
      const e = E.outExpo(J.clamp(env.lt / 0.5)) * (1 - E.inCubic(env.pOut)); if (e <= 0) return;
      const cx = (bb.x0 + bb.x1) / 2, cy = (bb.y0 + bb.y1) / 2;
      const R0 = Math.max(bb.x1 - bb.x0, bb.y1 - bb.y0) * 0.55 + H * 0.05;
      for (let k = 0; k < (P.n || 2); k++) {
        const R = R0 * (1 + k * 0.28 + J.r(s, k, 1) * 0.1), a0 = J.r(s, k, 2) * 360 + env.ltb * (k % 2 ? -14 : 10);
        env.arc(cx, cy, R, a0, a0 + 360 * e * (0.55 + 0.45 * J.r(s, k, 3)), sc.fg, 1.2, 0.7, false);
        const pa = (a0 + 40) * J.DEG, px = cx + Math.cos(pa) * R, py = cy + Math.sin(pa) * R;
        env.circle(px, py, 4, sc.accent, null, 0, 1, false);
        env.draw({ text: `X${Math.round(px)} Y${Math.round(py)}`, font: monoF(env), size: J.clamp(H * 0.015, 10, 18), align: 'left', x: px + 10, y: py - 12, color: sc.sub, alpha: e, ghost: false });
      }
    },
  },
  dots: {
    name: 'ドットの輪', layer: 'front',
    draw(env, bb, P) {
      bb = center(env, bb); const { H, sc } = env;
      const e = inOut(env); if (e <= 0) return;
      const cx = (bb.x0 + bb.x1) / 2, cy = (bb.y0 + bb.y1) / 2, R = Math.max(bb.x1 - bb.x0, bb.y1 - bb.y0) * 0.62 + H * 0.04;
      const m = 36;
      for (let i = 0; i < m * e; i++) { const a = (i / m * 360 + env.ltb * 20) * J.DEG; env.circle(cx + Math.cos(a) * R, cy + Math.sin(a) * R, i % 6 === 0 ? 4 : 2.2, i % 6 === 0 ? sc.accent : sc.fg, null, 0, 0.85, false); }
    },
  },
  arrows: {
    name: '矢印', layer: 'front',
    draw(env, bb, P) {
      bb = center(env, bb); const { W, H, sc } = env;
      const e = E.outExpo(J.clamp(env.lt / 0.4)) * (1 - E.inCubic(env.pOut)); if (e <= 0) return;
      const cy = (bb.y0 + bb.y1) / 2, s = J.clamp(H * 0.03, 14, 40), gap = s * 0.9;
      for (const side of [-1, 1]) {
        const xEdge = side < 0 ? bb.x0 - s * 1.2 : bb.x1 + s * 1.2;
        for (let i = 0; i < 3; i++) {
          const on = (env.step + i) % 3 !== 0;
          const x = xEdge + side * (i * gap + (1 - e) * W * 0.2);
          const d = -side;                                   // chevrons point toward text
          env.line([[x - d * s * 0.35, cy - s * 0.5], [x + d * s * 0.35, cy], [x - d * s * 0.35, cy + s * 0.5]], i === 0 ? sc.accent : sc.fg, Math.max(2, s * 0.14), on ? 1 : 0.3, false);
        }
      }
      if (P.big) {
        const x = P.right ? W * 0.9 : W * 0.1, y = H * (P.low ? 0.82 : 0.2), L = H * 0.1 * e;
        const dx = P.right ? -1 : 1, dy = P.low ? -1 : 1;
        env.line([[x, y], [x + dx * L, y + dy * L]], sc.fg, Math.max(3, H * 0.008), 1, true);
        env.line([[x + dx * L * 0.45, y + dy * L], [x + dx * L, y + dy * L], [x + dx * L, y + dy * L * 0.55]], sc.fg, Math.max(3, H * 0.008), 1, true);
      }
    },
  },
  slash: {
    name: 'スラッシュ', layer: 'front',
    draw(env, bb, P) {
      const { W, H, sc } = env, s = P.seed;
      for (let k = 0; k < (P.n || 1); k++) {
        const e = E.outExpo(J.clamp((env.lt - k * 0.06) / 0.35)); if (e <= 0) continue;
        const ang = J.rr(-70, -20, s, k, 1) * J.DEG, cx = J.rr(W * 0.3, W * 0.7, s, k, 2), cy = J.rr(H * 0.3, H * 0.7, s, k, 3), L = Math.hypot(W, H);
        const x0 = cx - Math.cos(ang) * L / 2, y0 = cy - Math.sin(ang) * L / 2;
        const t0 = env.pOut > 0 ? E.inCubic(env.pOut) : 0;
        env.line([[x0 + Math.cos(ang) * L * t0, y0 + Math.sin(ang) * L * t0], [x0 + Math.cos(ang) * L * e, y0 + Math.sin(ang) * L * e]], k ? sc.accent : sc.fg, k ? 2 : 1.4, 0.9, true);
      }
    },
  },
  sparks: {
    name: 'スパーク', layer: 'front',
    draw(env, bb, P) {
      const { W, H, sc } = env, s = P.seed;
      for (let k = 0; k < (P.n || 6); k++) {
        const q = E.outBack(J.clamp((env.lt - J.r(s, k, 1) * 0.4) / 0.2), 2) * (1 - E.inCubic(env.pOut)); if (q <= 0) continue;
        const x = J.rr(W * 0.05, W * 0.95, s, k, 2), y = J.rr(H * 0.08, H * 0.92, s, k, 3), r = J.rr(H * 0.015, H * 0.04, s, k, 4) * q;
        const rot = env.ltb * J.rs(s, k, 5) * 3 + J.r(s, k, 6) * 3, arms = J.r(s, k, 7) < 0.5 ? 3 : 4;
        for (let a = 0; a < arms; a++) { const an = rot + a * Math.PI / arms; env.line([[x - Math.cos(an) * r, y - Math.sin(an) * r], [x + Math.cos(an) * r, y + Math.sin(an) * r]], k % 3 === 0 ? sc.accent : sc.fg, Math.max(1.5, r * 0.14), 1, true); }
      }
    },
  },
  leaders: {
    name: '引き出し線', layer: 'front',
    draw(env, bb, P) {
      bb = center(env, bb); const { W, H, sc } = env, s = P.seed;
      const e = E.outExpo(J.clamp((env.lt - 0.1) / 0.45)) * (1 - E.inCubic(env.pOut)); if (e <= 0) return;
      const labels = [J.romaji(env.cut.text.replace(/\s+/g, '')) || env.cut.lineText, 'No.' + String((env.cut.line | 0) + 1).padStart(2, '0') + ' / ' + J.fmtTime(env.cut.start), env.cut.note || '─'];
      const fs = J.clamp(H * 0.018, 11, 20);
      const anchors = [[bb.x1, bb.y0], [bb.x0, bb.y1], [bb.x1, bb.y1]];
      for (let k = 0; k < 2; k++) {
        const [ax, ay] = anchors[k];
        const tx = J.clamp(ax + (k === 1 ? -1 : 1) * W * J.rr(0.06, 0.14, s, k, 1), W * 0.06, W * 0.94), ty = J.clamp(ay + (k === 0 ? -1 : 1) * H * J.rr(0.08, 0.16, s, k, 2), H * 0.08, H * 0.92);
        env.polyPartial([[ax, ay], [tx, ty], [tx + (k === 1 ? -1 : 1) * W * 0.05, ty]], e, sc.sub, 1.2, 1, false);
        env.circle(ax, ay, 3.5, sc.accent, null, 0, e, false);
        env.draw({ text: labels[k], font: k === 0 ? env.st.fonts.body[0] : monoF(env), size: fs, align: k === 1 ? 'right' : 'left', x: tx + (k === 1 ? -1 : 1) * W * 0.055, y: ty - fs * 0.9, track: 0.06, color: sc.fg, alpha: e, ghost: false });
      }
    },
  },
  waveform: {
    name: '波形', layer: 'front',
    draw(env, bb, P) {
      const { W, H, sc } = env; const e = inOut(env); if (e <= 0) return;
      const y = H * (P.low ? 0.86 : 0.14), n = 120, pts = [];
      const en = env.energy != null ? env.energy : 0.5;
      for (let i = 0; i <= n; i++) {
        const u = i / n, x = J.lerp(W * 0.18, W * 0.82, u);
        const env2 = Math.sin(u * Math.PI);
        const amp = H * 0.035 * env2 * (0.35 + en) * (0.5 + 0.5 * J.noise1(u * 18 + env.t * 9, P.seed));
        pts.push([x, y + (i % 2 ? amp : -amp)]);
      }
      env.polyPartial(pts, e, sc.fg, 1.4, 0.9, false);
    },
  },
  barcode: {
    name: 'バーコード', layer: 'front',
    draw(env, bb, P) {
      const { W, H, sc } = env, s = P.seed; const e = inOut(env); if (e <= 0) return;
      const x0 = P.right ? W * 0.84 : W * 0.06, y0 = P.low ? H * 0.84 : H * 0.07, h = H * 0.05;
      let x = x0;
      for (let i = 0; i < 34; i++) { const w = 1 + Math.floor(J.r(s, i, 1) * 3.2); if (J.r(s, i, 2) < 0.62) env.rect(x, y0, w * e, h, sc.fg, 0.9, false); x += w + 1.5; }
      env.draw({ text: String(J.h(s, 5) % 1e9).padStart(9, '0'), font: monoF(env), size: J.clamp(H * 0.014, 9, 16), align: 'left', x: x0, y: y0 + h + 12, color: sc.fg, alpha: e * 0.9, ghost: false, track: 0.2 });
    },
  },
};
J.DECOR_ORDER = ['brackets', 'rings', 'dots', 'arrows', 'slash', 'sparks', 'leaders', 'waveform', 'barcode', 'grid', 'stripes', 'blobs', 'bars', 'shapes', 'counter'];

/* global HUD overlay (frame, title, timecode, rec, counter) */
J.drawHUD = (env, plan) => {
  const { W, H, sc, ctx } = env;
  const m = Math.round(H * 0.045), L = H * 0.035, c = sc.sub, fs = J.clamp(H * 0.016, 10, 18), mono = monoF(env);
  const lw = 1.4;
  env.line([[m, m + L], [m, m], [m + L, m]], c, lw, 0.9, false);
  env.line([[W - m - L, m], [W - m, m], [W - m, m + L]], c, lw, 0.9, false);
  env.line([[m, H - m - L], [m, H - m], [m + L, H - m]], c, lw, 0.9, false);
  env.line([[W - m - L, H - m], [W - m, H - m], [W - m, H - m - L]], c, lw, 0.9, false);
  const title = (plan.title || 'UNTITLED') + (plan.artist ? ' / ' + plan.artist : '');
  env.draw({ text: title, font: env.st.fonts.body[0], size: fs, align: 'left', x: m + L * 0.6, y: m + L * 0.9, color: c, track: 0.12, ghost: false });
  const rec = env.step % 4 < 2;
  if (rec) env.circle(W - m - L * 2.6, m + L * 0.9, fs * 0.32, sc.accent, null, 0, 1, false);
  env.draw({ text: 'REC', font: mono, size: fs, align: 'left', x: W - m - L * 2.2, y: m + L * 0.9, color: c, ghost: false, track: 0.1 });
  env.draw({ text: J.fmtTime(env.t, plan.fps), font: mono, size: fs, align: 'left', x: m + L * 0.6, y: H - m - L * 0.9, color: c, ghost: false, track: 0.1 });
  const li = env.cut ? (env.cut.line | 0) + 1 : 0;
  env.draw({ text: `LYRIC ${String(li).padStart(2, '0')}/${String(plan.lines.length).padStart(2, '0')}`, font: mono, size: fs, align: 'right', x: W - m - L * 0.6, y: H - m - L * 0.9, color: c, ghost: false, track: 0.1 });
  const u = plan.duration > 0 ? J.clamp(env.t / plan.duration) : 0;
  env.line([[W * 0.3, H - m - L * 0.9], [W * 0.7, H - m - L * 0.9]], c, 1, 0.35, false);
  env.line([[W * 0.3, H - m - L * 0.9], [J.lerp(W * 0.3, W * 0.7, u), H - m - L * 0.9]], sc.accent, 2, 0.9, false);
};
})();
