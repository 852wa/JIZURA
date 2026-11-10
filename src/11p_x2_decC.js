/* JIZURA pack: x2decC — 30 typographic / infographic / interface decor parts: small text, numbers and widgets around the lyric */
(() => {
'use strict';
const E = J.E;
const P = 'x2decC';
const DEG = J.DEG, TAU = J.TAU, cl = J.clamp, lerp = J.lerp;

/* ============================================================ helpers */
const U = env => Math.min(env.W, env.H) / 1080;                     // 1 at a 1080 short side
const MG = env => Math.min(env.W, env.H) * 0.05;                    // safe margin
const FS = env => Math.max(12, 17 * U(env));                        // small text size
const monoF = env => (env.st.fonts.mono && env.st.fonts.mono[0]) || 'mono';
const bodyF = env => (env.st.fonts.body && env.st.fonts.body[0]) || 'gothic_med';
const vis = (env, c, min = 1.6) => (c && J.contrast(c, env.sc.bg) >= min ? c : env.sc.fg);
const ACC = env => vis(env, env.sc.accent);
const ACC2 = env => vis(env, env.sc.accent2 || env.sc.accent);
const SUB = env => vis(env, env.sc.sub, 1.8);
const onC = (env, c) => (J.contrast(env.sc.bg, c) >= 3 ? env.sc.bg : J.lum(c) > 0.5 ? '#000000' : '#ffffff');
const ein = (t, d = 0.4, delay = 0, ease = E.outExpo) => ease(cl((t - delay) / d));
const bw = bb => bb.x1 - bb.x0, bh = bb => bb.y1 - bb.y0;
const hit = (x0, y0, x1, y1, bb, pad = 0) => !(x1 < bb.x0 - pad || x0 > bb.x1 + pad || y1 < bb.y0 - pad || y0 > bb.y1 + pad);
const pad2 = (n, k = 2) => String(Math.max(0, Math.floor(n))).padStart(k, '0');
const chars = s => [...String(s == null ? '' : s)];
const glyphs = s => chars(s).filter(c => c.trim());
const clip = (s, n) => { const a = chars(String(s || '').replace(/\s+/g, ' ').trim()); return a.length > n ? a.slice(0, Math.max(1, n - 1)).join('') + '…' : a.join(''); };
const cutText = env => String((env.cut && env.cut.text) || '').replace(/\s+/g, ' ').trim();
const lineText = env => String((env.cut && (env.cut.lineText || env.cut.text)) || '').replace(/\s+/g, ' ').trim();
const hasCJK = s => /[぀-ヿ㐀-鿿]/.test(s);
/* 飾りの数字・時刻を出さない: decorative numbers / times may be switched off */
const noNo = env => !!(env.fx && env.fx.hideNo);
const noTime = env => !!(env.fx && env.fx.hideTime);

/* lyric bbox: keep the last real one per cut so nothing jumps while the text is hidden or flying out */
const BBC = new WeakMap();
function getBB(env, bb) {
  if (env.pOut > 0 && env.cut && BBC.has(env.cut)) return BBC.get(env.cut);
  if (bb && isFinite(bb.x0 + bb.x1 + bb.y0 + bb.y1) && bb.x1 > bb.x0 && bb.y1 > bb.y0) {
    const b = { x0: Math.max(bb.x0, 0), x1: Math.min(bb.x1, env.W), y0: Math.max(bb.y0, 0), y1: Math.min(bb.y1, env.H) };
    if (b.x1 <= b.x0) { b.x0 = bb.x0; b.x1 = bb.x1; }
    if (b.y1 <= b.y0) { b.y0 = bb.y0; b.y1 = bb.y1; }
    if (env.cut) BBC.set(env.cut, b);
    return b;
  }
  const c = env.cut && BBC.get(env.cut);
  if (c) return c;
  const d = J.centerBB(env, null);
  return { x0: d.x0, x1: d.x1, y0: d.y0, y1: d.y1 };
}
/* a free w×h box near the lyric or in a screen corner → {x, y, ok} (top-left) */
function spot(env, bb, w, h, p, gap) {
  const { W, H } = env, m = MG(env) * 0.8, sx = p.right ? 1 : -1, sy = p.low ? 1 : -1;
  const ord = [[sx, sy], [-sx, sy], [sx, -sy], [-sx, -sy]], near = [], cor = [];
  for (const [a, b] of ord) {
    near.push([a > 0 ? bb.x1 - w : bb.x0, b > 0 ? bb.y1 + gap : bb.y0 - gap - h]);
    near.push([a > 0 ? bb.x1 + gap : bb.x0 - gap - w, (bb.y0 + bb.y1) / 2 - h / 2]);
    cor.push([a > 0 ? W - m - w : m, b > 0 ? H - m - h : m]);
  }
  const all = p.corner ? cor.concat(near) : near.concat(cor);
  for (const [x, y] of all) {
    if (x < m - 1 || y < m - 1 || x + w > W - m + 1 || y + h > H - m + 1) continue;
    if (!hit(x, y, x + w, y + h, bb, gap * 0.4)) return { x, y, ok: true };
  }
  return { x: cl(cor[0][0], 0, Math.max(0, W - w)), y: cl(cor[0][1], 0, Math.max(0, H - h)), ok: false };
}
/* a w×h block centred in the free band under (or over) the lyric; falls back to spot() */
function band(env, bb, w, h, p, gap) {
  const { W, H } = env, m = MG(env) * 0.8;
  for (const below of (p.low ? [true, false] : [false, true])) {
    const y = below ? bb.y1 + gap : bb.y0 - gap - h;
    if (y < m || y + h > H - m || w > W - 2 * m) continue;
    return { x: cl((bb.x0 + bb.x1) / 2 - w / 2, m, W - m - w), y, ok: true, below };
  }
  return spot(env, bb, w, h, p, gap);
}

/* ---- drawing (main pass only: the wrapper returns early in ghost passes) ---- */
function segs(env, list, c, lw, a = 1, cap) {
  if (a <= 0.003 || !list.length || !(lw > 0)) return;
  const ctx = env.ctx; ctx.save();
  ctx.globalAlpha = Math.min(1, a); ctx.strokeStyle = c; ctx.lineWidth = lw; ctx.lineCap = cap || 'butt';
  ctx.beginPath();
  for (const s of list) { ctx.moveTo(s[0], s[1]); ctx.lineTo(s[2], s[3]); }
  ctx.stroke(); ctx.restore();
}
function stroke(env, pts, c, lw, a = 1, o) {
  if (a <= 0.003 || !pts || pts.length < 2 || !(lw > 0)) return;
  const ctx = env.ctx; ctx.save();
  ctx.globalAlpha = Math.min(1, a); ctx.strokeStyle = c; ctx.lineWidth = lw;
  ctx.lineCap = (o && o.cap) || 'round'; ctx.lineJoin = (o && o.join) || 'round';
  if (o && o.dash) ctx.setLineDash(o.dash);
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  if (o && o.close) ctx.closePath();
  ctx.stroke(); ctx.restore();
}
/* first fraction e of a polyline */
function part(pts, e) {
  if (e >= 1) return pts; if (e <= 0) return [];
  let L = 0; const ls = [];
  for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); ls.push(d); L += d; }
  let rem = L * e; const out = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const d = ls[i - 1];
    if (rem >= d) { out.push(pts[i]); rem -= d; continue; }
    const k = d > 0 ? rem / d : 0; out.push([lerp(pts[i - 1][0], pts[i][0], k), lerp(pts[i - 1][1], pts[i][1], k)]); break;
  }
  return out;
}
function fillPoly(env, pts, c, a = 1) {
  if (a <= 0.003 || pts.length < 3) return;
  const ctx = env.ctx; ctx.save(); ctx.globalAlpha = Math.min(1, a); ctx.fillStyle = c; ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath(); ctx.fill(); ctx.restore();
}
function box(env, x, y, w, h, c, a = 1) {
  if (a <= 0.003 || w <= 0 || h <= 0) return;
  const ctx = env.ctx; ctx.save(); ctx.globalAlpha = Math.min(1, a); ctx.fillStyle = c; ctx.fillRect(x, y, w, h); ctx.restore();
}
function rrPath(ctx, x, y, w, h, r) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r); ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r); ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r); ctx.closePath();
}
/* rounded rect: fill and / or stroke */
function rr(env, x, y, w, h, r, fill, a = 1, strokeC, lw) {
  if (a <= 0.003 || w <= 0.2 || h <= 0.2) return;
  const ctx = env.ctx; ctx.save(); ctx.globalAlpha = Math.min(1, a); ctx.beginPath(); rrPath(ctx, x, y, w, h, r);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (strokeC && lw > 0) { ctx.strokeStyle = strokeC; ctx.lineWidth = lw; ctx.stroke(); }
  ctx.restore();
}
function dot(env, x, y, r, c, a = 1) {
  if (a <= 0.003 || r <= 0.05) return;
  const ctx = env.ctx; ctx.save(); ctx.globalAlpha = Math.min(1, a); ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); ctx.restore();
}
function ring(env, x, y, r, c, lw, a = 1, a0 = 0, a1 = TAU) {
  if (a <= 0.003 || r <= 0.05 || a1 <= a0) return;
  const ctx = env.ctx; ctx.save(); ctx.globalAlpha = Math.min(1, a); ctx.strokeStyle = c; ctx.lineWidth = lw; ctx.beginPath(); ctx.arc(x, y, r, a0, a1); ctx.stroke(); ctx.restore();
}
/* small secondary text (never ghosted). o: {a, c, al, f, tr, num, time} — num / time texts obey the hide switches */
function T(env, text, x, y, size, o) {
  o = o || {};
  const a = o.a == null ? 1 : o.a;
  if (a <= 0.003 || text === '' || text == null) return;
  if ((o.num && noNo(env)) || (o.time && noTime(env))) return;
  env.draw({ text: String(text), font: o.f || monoF(env), size, x, y, align: o.al || 'left', track: o.tr == null ? 0.06 : o.tr, color: o.c || SUB(env), alpha: Math.min(1, a), ghost: false, plain: true });
}
const tw = (env, text, size, f, tr = 0.06) => (text === '' ? 0 : J.measure({ text: String(text), font: f || monoF(env), size, track: tr }).w);

/* registration: main-pass only, small text + thin widgets */
function D(key, name, en, tags, w, ae, fn, layer) {
  J.register('decor', key, {
    name, en, tags, w, ae, layer: layer || 'front',
    draw(env, bb0, p) {
      if (env.pass !== 'main') return;
      const t = env.lt - 0.04;
      if (!(t > 0)) return;
      const o = 1 - E.inCubic(env.pOut || 0); if (o <= 0.003) return;
      const q = Object.assign({ n: 1, v: 0, r: 0.5, seed: 1 }, p); q.n = cl(q.n | 0, 1, 3); q.v = q.v | 0;
      fn(env, getBB(env, bb0), q, t, o, U(env));
    },
  }, P);
}

/* ============================================================ typed / text lines */

/* 入力行 — a shell prompt that types the cut as a command, answers, and leaves a blinking block cursor */
D('xnPrompt', '入力行', 'Prompt Line', ['glitch', 'graphic', 'editorial'], 1.1, 'leaders', (env, bb, p, t, o, u) => {
  const fs = FS(env), mf = monoF(env), bf = bodyF(env), pre = ['$ say', '> print', '>>> sing', '# echo'][p.v % 4];
  const body = '"' + clip(cutText(env), 14) + '"', wp = tw(env, pre, fs, mf) + fs * 0.6, wb = tw(env, body, fs, bf);
  const w = wp + wb + fs * 0.9, lh = fs * 1.55, h = lh * 3;
  const sp = spot(env, bb, w, h, p, 22 * u), A = o * (sp.ok ? 1 : 0.3), e0 = ein(t, 0.25);
  const cp = chars(pre), cb = chars(body), nT = cp.length + cb.length, dT = Math.min(0.75, nT * 0.045);
  const k = Math.floor(nT * cl((t - 0.12) / dT) + 1e-6), kb = Math.max(0, k - cp.length);
  const y1 = sp.y + lh * 0.5, sb = cb.slice(0, kb).join('');
  T(env, cp.slice(0, k).join(''), sp.x, y1, fs, { c: ACC(env), a: A * e0 });
  T(env, sb, sp.x + wp, y1, fs, { f: bf, c: env.sc.fg, a: A * 0.9 });
  const done = t > 0.12 + dT + 0.18, blink = Math.floor(env.lt * 2.6) % 2 === 0;
  if (!done) box(env, sp.x + (kb > 0 ? wp + tw(env, sb, fs, bf) : tw(env, cp.slice(0, k).join(''), fs, mf)) + fs * 0.15, y1 - fs * 0.55, fs * 0.55, fs * 1.1, env.sc.fg, A * 0.85 * e0);
  else {
    const n = glyphs(cutText(env)).length, e2 = ein(t, 0.25, 0.12 + dT + 0.18);
    T(env, noNo(env) ? '[ok]' : `[ok] ${n} glyph${n === 1 ? '' : 's'} out`, sp.x, y1 + lh, fs * 0.92, { a: A * e2 });
    T(env, pre.split(' ')[0], sp.x, y1 + lh * 2, fs, { c: ACC(env), a: A * e2 });
    if (blink) box(env, sp.x + tw(env, pre.split(' ')[0], fs, mf) + fs * 0.5, y1 + lh * 2 - fs * 0.55, fs * 0.55, fs * 1.1, env.sc.fg, A * 0.85 * e2);
  }
});

/* 小さな段落 — the lyric line repeated as a tiny set paragraph with a pilcrow and a side rule, revealed line by line */
D('xnMicroPara', '小さな段落', 'Micro Paragraph', ['editorial', 'calm', 'emotional'], 1.1, 'leaders', (env, bb, p, t, o, u) => {
  const src = glyphs(lineText(env)).length ? lineText(env) : 'lyric'; const cj = hasCJK(src);
  const fs = FS(env) * 0.82, f = bodyF(env), per = cj ? 12 : 24, nL = 3 + p.n, lh = fs * 1.6;
  const unit = chars(src + (cj ? '／' : ' / ')); const lines = [];
  for (let i = 0; i < nL; i++) { let s = ''; for (let j = 0; j < per; j++) s += unit[(i * per + j) % unit.length]; lines.push(s.trim()); }
  let w = 0; for (const s of lines) w = Math.max(w, tw(env, s, fs, f, 0.04));
  const ind = fs * 1.5, W2 = w + ind, h = nL * lh;
  const sp = spot(env, bb, W2, h, p, 24 * u), A = o * (sp.ok ? 1 : 0.3), rt = !!p.right;
  const rx = rt ? sp.x + W2 : sp.x;
  segs(env, [[rx, sp.y, rx, sp.y + h * ein(t, 0.5)]], p.accent ? ACC(env) : SUB(env), Math.max(1, 1.5 * u), A * 0.9);
  T(env, '¶', rt ? sp.x + W2 - ind * 0.45 : sp.x + ind * 0.45, sp.y + lh * 0.5, fs * 1.15, { c: ACC(env), a: A * ein(t, 0.3, 0.1), al: 'center', f });
  for (let i = 0; i < nL; i++) {
    const e = ein(t, 0.4, 0.08 + i * 0.07, E.outCubic); if (e <= 0) continue;
    T(env, lines[i], rt ? sp.x + w + (1 - e) * -10 * u : sp.x + ind + (1 - e) * 10 * u, sp.y + lh * (i + 0.5), fs, { f, tr: 0.04, a: A * e * (i === 0 ? 0.95 : 0.6), c: i === 0 ? env.sc.fg : SUB(env), al: rt ? 'right' : 'left' });
  }
});

/* 脚注 — a reference mark beside the lyric and its footnote (short rule + note line) at the foot of the screen */
D('xnFootnote', '脚注', 'Footnote', ['editorial', 'calm', 'emotional'], 1.2, 'leaders', (env, bb, p, t, o, u) => {
  const { W, H } = env, m = MG(env), fs = FS(env), mk = ['*', '†', '※', '‡'][p.v % 4], f = bodyF(env), ac = ACC(env);
  // the mark: just outside the lyric's top-right corner
  const ms = fs * 1.7, e0 = ein(t, 0.35, 0.1, x => E.outBack(x, 1.8));
  let mx = bb.x1 + ms * 0.55, my = bb.y0 + ms * 0.1;
  if (mx > W - m * 0.5) { mx = cl((bb.x0 + bb.x1) / 2, m, W - m); my = bb.y0 - ms * 0.7; }
  if (my > m * 0.4 && e0 > 0) { const ctx = env.ctx; ctx.save(); ctx.translate(mx, my); ctx.scale(e0, e0); T(env, mk, 0, 0, ms, { f, c: ac, a: o, al: 'center', tr: 0 }); ctx.restore(); }
  // the note
  const rj = J.romaji(cutText(env).replace(/[、。！？!?,.・「」]/g, ' ').replace(/\s+/g, ' ').trim());
  const lt2 = lineText(env), note = env.cut.note ? String(env.cut.note) : (lt2 && lt2 !== cutText(env) ? lt2 : rj ? rj : lt2);
  const txt = clip(note, hasCJK(note) ? 26 : 44), nw = tw(env, txt, fs * 0.9, f, 0.05) + fs * 1.4, h = fs * 2.3;
  let below = !(H - bb.y1 < h + m + 16 * u);
  if (!below && bb.y0 < h + m + 16 * u) below = H - bb.y1 > bb.y0;
  const y0 = below ? H - m - h : m, A = o * (hit(0, y0, W, y0 + h, bb, 4 * u) && (bb.x0 < m + nw && bb.x1 > m) ? 0.3 : 1);
  const x0 = p.right ? W - m - nw : m, e1 = ein(t, 0.45, 0.25);
  segs(env, [[x0, y0, x0 + Math.min(nw, 150 * u) * e1, y0]], SUB(env), Math.max(1, u), A * 0.8);
  T(env, mk, x0, y0 + fs * 1.25, fs * 1.05, { f, c: ac, a: A * e1, tr: 0 });
  const cs = chars(txt), k = Math.ceil(cs.length * cl((t - 0.35) / Math.min(0.7, cs.length * 0.03)));
  T(env, cs.slice(0, k).join(''), x0 + fs * 1.3, y0 + fs * 1.3, fs * 0.9, { f, tr: 0.05, a: A * 0.85 });
});

/* 差分表示 — a two-line diff: the old wording struck out, the new one added on a tinted row */
D('xnDiff', '差分表示', 'Diff Lines', ['glitch', 'editorial', 'graphic'], 0.9, 'leaders', (env, bb, p, t, o, u) => {
  const fs = FS(env), mf = monoF(env), bf = bodyF(env), lh = fs * 1.7, ac = ACC(env);
  const g = chars(cutText(env)), neu = clip(cutText(env), 14), old = g.length > 2 ? clip(g.slice(0, Math.max(1, g.length - 1 - (p.v % 2))).join(''), 12) + (hasCJK(neu) ? '？' : '?') : '……';
  const ln = (env.cut.line | 0) + 1, gut = noNo(env) ? 0 : fs * 2.1, sg = fs * 1.2;
  const w = gut + sg + Math.max(tw(env, neu, fs, bf), tw(env, old, fs, bf)) + fs * 0.8, h = lh * 2 + fs * 1.3;
  const sp = spot(env, bb, w, h, p, 22 * u), A = o * (sp.ok ? 1 : 0.3);
  T(env, '@@ lyric.txt @@', sp.x, sp.y + fs * 0.5, fs * 0.72, { a: A * 0.7 * ein(t, 0.3) });
  const y1 = sp.y + fs * 1.3 + lh * 0.5, y2 = y1 + lh, e1 = ein(t, 0.35, 0.08), e2 = ein(t, 0.4, 0.32);
  T(env, pad2(ln), sp.x, y1, fs * 0.8, { num: 1, a: A * 0.6 * e1 }); T(env, pad2(ln + 1), sp.x, y2, fs * 0.8, { num: 1, a: A * 0.6 * e2 });
  T(env, '-', sp.x + gut, y1, fs, { a: A * e1 }); T(env, old, sp.x + gut + sg, y1, fs, { f: bf, a: A * 0.75 * e1 });
  const ow = tw(env, old, fs, bf);
  segs(env, [[sp.x + gut + sg - 3 * u, y1, sp.x + gut + sg - 3 * u + (ow + 6 * u) * ein(t, 0.3, 0.45, E.inOutCubic), y1]], SUB(env), Math.max(1, 1.4 * u), A);
  box(env, sp.x + gut - fs * 0.3, y2 - lh * 0.46, (w - gut + fs * 0.3) * e2, lh * 0.92, ac, A * 0.16);
  T(env, '+', sp.x + gut, y2, fs, { c: ac, a: A * e2 });
  const cs = chars(neu), k = Math.ceil(cs.length * cl((t - 0.4) / Math.min(0.5, cs.length * 0.04)));
  T(env, cs.slice(0, k).join(''), sp.x + gut + sg, y2, fs, { f: bf, c: env.sc.fg, a: A * 0.95 });
});

/* 音節分け — the cut respelled glyph by glyph (kana → romaji) as spaced syllable chips joined by mid dots */
function syllables(s) {
  const a = chars(s), out = [];
  for (let i = 0; i < a.length && out.length < 12; i++) {
    const c = a[i];
    if (!c.trim() || (J.isPunct && J.isPunct(c))) continue;
    let tok = c, kana = false;
    if (J.isHira(c) || J.isKata(c)) {
      let grp = c;
      while (i + 1 < a.length && (/[ゃゅょャュョーぁぃぅぇぉァィゥェォ]/.test(a[i + 1]) || (/[っッ]/.test(grp) && grp.length === 1 && (J.isHira(a[i + 1]) || J.isKata(a[i + 1]))))) grp += a[++i];
      const r = J.romaji(grp); if (r) { tok = r; kana = true; } else tok = grp;
    } else if (J.isLatin && J.isLatin(c)) {
      let wd = c; while (i + 1 < a.length && a[i + 1].trim() && J.isLatin(a[i + 1]) && wd.length < 10) wd += a[++i];
      tok = wd.toLowerCase(); kana = true;
    }
    out.push([tok, kana]);
  }
  return out;
}
D('xnSyllables', '音節分け', 'Syllable Split', ['editorial', 'calm', 'pop'], 1, 'leaders', (env, bb, p, t, o, u) => {
  const toks = syllables(cutText(env)); if (!toks.length) return;
  const { W } = env, m = MG(env), mf = monoF(env), bf = bodyF(env);
  let fs = FS(env) * 1.05, gap, ws, tot;
  for (let it = 0; it < 4; it++) {
    gap = fs * 1.1; ws = toks.map(([s, k]) => tw(env, s, fs, k ? mf : bf, 0.04)); tot = ws.reduce((a, b) => a + b, 0) + gap * (toks.length - 1);
    if (tot <= W - m * 2.4) break; fs *= 0.8;
  }
  const h = fs * 2.2, sp = band(env, bb, tot, h, p, 20 * u + bh(bb) * 0.06), A = o * (sp.ok ? 1 : 0.3), y = sp.y + h * 0.42;
  let x = sp.x;
  for (let i = 0; i < toks.length; i++) {
    const e = ein(t, 0.3, 0.08 + i * 0.055, E.outCubic);
    T(env, toks[i][0], x + ws[i] / 2, y + (1 - e) * fs * 0.5, fs, { f: toks[i][1] ? mf : bf, tr: 0.04, al: 'center', a: A * e, c: toks[i][1] ? SUB(env) : env.sc.fg });
    if (i < toks.length - 1) dot(env, x + ws[i] + gap / 2, y, 1.8 * u * e, p.accent ? ACC(env) : SUB(env), A * 0.9);
    x += ws[i] + gap;
  }
  const e2 = ein(t, 0.5, 0.25), yb = sp.y + h * 0.92, c = ACC(env);
  stroke(env, part([[sp.x, yb - 5 * u], [sp.x, yb], [sp.x + tot, yb], [sp.x + tot, yb - 5 * u]], e2), c, Math.max(1, 1.2 * u), A * 0.8, { cap: 'butt', join: 'miter' });
});

/* ============================================================ readouts */

/* 字種の内訳 — a stacked proportion bar of the cut's kanji / kana / latin glyphs with counted labels */
D('xnGlyphStats', '字種の内訳', 'Glyph Breakdown', ['editorial', 'graphic', 'calm'], 1, 'bars', (env, bb, p, t, o, u) => {
  const g = glyphs(cutText(env)).filter(c => !(J.isPunct && J.isPunct(c))); if (!g.length) return;
  const cnt = [0, 0, 0, 0];
  for (const c of g) cnt[J.isKanji(c) ? 0 : (J.isHira(c) || J.isKata(c)) ? 1 : (J.isLatin && J.isLatin(c)) ? 2 : 3]++;
  const names = ['漢字', 'かな', 'ABC', '他'], pal = [env.sc.fg, ACC(env), ACC2(env), SUB(env)]; let ci = 0;
  const fs = FS(env) * 0.9, bf = bodyF(env), w = cl(bw(bb) * 0.6, 220 * u, 340 * u), barH = Math.max(6, 9 * u), h = fs * 1.5 + barH + fs * 1.9;
  const sp = spot(env, bb, w, h, p, 22 * u), A = o * (sp.ok ? 1 : 0.3), e = ein(t, 0.55, 0.05);
  T(env, 'GLYPHS', sp.x, sp.y + fs * 0.5, fs * 0.8, { a: A * ein(t, 0.3), tr: 0.14 });
  T(env, pad2(Math.round(g.length * e)), sp.x + w, sp.y + fs * 0.5, fs, { al: 'right', c: env.sc.fg, a: A, num: 1 });
  const by = sp.y + fs * 1.5; let x = sp.x, lx = sp.x;
  box(env, sp.x, by, w * e, barH, SUB(env), A * 0.18);
  for (let i = 0; i < 4; i++) {
    if (!cnt[i]) continue;
    const sw = w * cnt[i] / g.length, e2 = ein(t, 0.45, 0.15 + i * 0.1, E.outCubic);
    const col = pal[ci++ % 4];
    box(env, x + 1, by, Math.max(0, sw * e2 - 2), barH, col, A);
    box(env, lx, by + barH + fs * 0.75, fs * 0.55, fs * 0.55, col, A * e2);
    const lab = noNo(env) ? names[i] : `${names[i]} ${Math.round(cnt[i] * e2)}`;
    T(env, lab, lx + fs * 0.85, by + barH + fs * 1.03, fs * 0.82, { f: bf, a: A * e2 * 0.9 });
    lx += fs * 0.85 + tw(env, lab, fs * 0.82, bf) + fs * 0.9; x += sw;
  }
});

/* 隅の座標 — coordinates of the bounding-box corners: small crosses with x / y readouts that roll to their values */
D('xnBoxCoords', '隅の座標', 'Corner Coordinates', ['graphic', 'glitch', 'editorial'], 1, 'brackets', (env, bb, p, t, o, u) => {
  const { W, H } = env, m = MG(env) * 0.5, fs = FS(env) * 0.8, pd = 12 * u, c = p.accent ? ACC(env) : env.sc.fg, k = 6 * u;
  const all = [[bb.x0, bb.y0, -1, -1, 'TL'], [bb.x1, bb.y1, 1, 1, 'BR'], [bb.x1, bb.y0, 1, -1, 'TR'], [bb.x0, bb.y1, -1, 1, 'BL']];
  const list = p.big ? all : p.v % 2 ? all.slice(2) : all.slice(0, 2);
  list.forEach(([x, y, sx, sy, nm], i) => {
    const e = ein(t, 0.45, i * 0.08), px = cl(x + sx * pd * (2 - e), m, W - m), py = cl(y + sy * pd * (2 - e), m, H - m);
    segs(env, [[px - k, py, px + k, py], [px, py - k, px, py + k]], c, Math.max(1, 1.3 * u), o * e);
    const txt = noNo(env) ? nm : `${nm} ${pad2(x * e, 4)},${pad2(y * e, 4)}`, wt = tw(env, txt, fs);
    let ty = py + sy * (k + fs * 0.9); if (ty < m + fs * 0.5 || ty > H - m - fs * 0.5) ty = py - sy * (k + fs * 0.9);
    const tx = sx < 0 ? cl(px - k, m, W - m - wt) : cl(px + k - wt, m, W - m - wt);
    if (!hit(tx, ty - fs * 0.6, tx + wt, ty + fs * 0.6, bb, 0)) T(env, txt, tx, ty, fs, { a: o * e * 0.9, num: noNo(env) ? 0 : 1 });
  });
});

/* 残り時間 — a countdown of the time left in the cut over a rule that shortens toward zero */
D('xnRemain', '残り時間', 'Time Remaining', ['glitch', 'graphic', 'emotional'], 0.9, 'counter', (env, bb, p, t, o, u) => {
  if (noTime(env)) return;
  const fs = FS(env), dur = Math.max(0.2, env.cut.dur || 1), rem = Math.max(0, dur - env.lt), fr = cl(rem / dur);
  const w = 230 * u, h = fs * 3.6, sp = spot(env, bb, w, h, p, 22 * u), A = o * (sp.ok ? 1 : 0.3), e = ein(t, 0.45);
  const hot = fr < 0.22, c = hot ? ACC(env) : env.sc.fg;
  T(env, 'REMAIN', sp.x, sp.y + fs * 0.45, fs * 0.72, { a: A * e * 0.8, tr: 0.16 });
  T(env, '-' + J.fmtTime(rem), sp.x + w, sp.y + fs * 1.6 + (1 - e) * fs * 0.4, fs * 1.45, { al: 'right', c, a: A * e, time: 1, tr: 0.04 });
  const y = sp.y + h - fs * 0.5, n = Math.min(12, Math.ceil(dur)), tk = [];
  for (let i = 0; i <= n; i++) { const x = sp.x + w - w * Math.min(1, i / dur); tk.push([x, y - 4 * u, x, y + 4 * u]); }
  segs(env, tk, SUB(env), Math.max(1, u), A * 0.6 * e);
  segs(env, [[sp.x, y, sp.x + w * e, y]], SUB(env), Math.max(1, u), A * 0.35);
  segs(env, [[sp.x + w - w * fr * e, y, sp.x + w, y]], c, Math.max(2, 3 * u), A);
  dot(env, sp.x + w - w * fr * e, y, 4 * u, c, A);
});

/* 文字ゲージ — an ASCII progress gauge [####----] with a spinner glyph and percent, set character by character */
D('xnAsciiGauge', '文字ゲージ', 'ASCII Gauge', ['glitch', 'graphic', 'pop'], 1, 'bars', (env, bb, p, t, o, u) => {
  const fs = FS(env) * 1.05, N = 12 + 4 * (p.n - 1), cw = fs * 0.66, dur = Math.max(0.3, env.cut.dur || 1);
  const pr = cl((env.lt - 0.2) / Math.max(0.2, dur * 0.88 - 0.2)), k = Math.floor(pr * N + 1e-6);
  const w = cw * (N + 2) + fs * 3.4, h = fs * 2.9, sp = band(env, bb, w, h, p, 22 * u), A = o * (sp.ok ? 1 : 0.3);
  const y = sp.y + fs * 2.1, fillC = ['#', '=', '|', '■'][p.v % 4], ac = ACC(env);
  const spin = pr >= 1 ? '✓' : '|/-\\'[Math.floor(env.ltb * 9) % 4];
  T(env, spin, sp.x + cw * 0.5, sp.y + fs * 0.6, fs * 0.85, { al: 'center', c: ac, a: A * ein(t, 0.3) });
  T(env, pr >= 1 ? 'done' : 'rendering', sp.x + cw * 1.4, sp.y + fs * 0.6, fs * 0.8, { a: A * ein(t, 0.3), tr: 0.1 });
  for (let i = 0; i < N + 2; i++) {
    const e = ein(t, 0.2, i * 0.018, E.outCubic); if (e <= 0) continue;
    const ch = i === 0 ? '[' : i === N + 1 ? ']' : i - 1 < k ? fillC : '-', on = i > 0 && i <= N && i - 1 < k;
    const hop = on && i - 1 === k - 1 && pr < 1 ? fs * 0.3 * Math.exp(-((pr * N) % 1) * 5) : 0;
    T(env, ch, sp.x + cw * (i + 0.5), y - hop, fs, { al: 'center', tr: 0, c: on ? ac : i === 0 || i === N + 1 ? env.sc.fg : SUB(env), a: A * e * (on || i === 0 || i === N + 1 ? 1 : 0.6) });
  }
  T(env, pad2(pr * 100, 3) + '%', sp.x + w, y, fs, { al: 'right', c: env.sc.fg, a: A * ein(t, 0.3, 0.2), num: 1 });
});

/* パンくず — a breadcrumb path (song › line › cut › word) whose levels slide in one after another */
D('xnBreadcrumb', 'パンくず', 'Breadcrumb', ['editorial', 'graphic', 'pop'], 1, 'arrows', (env, bb, p, t, o, u) => {
  const fs = FS(env) * 0.95, mf = monoF(env), bf = bodyF(env), nn = noNo(env);
  const items = [[['song', 'lyrics', 'home', 'track'][p.v % 4], mf], [nn ? 'verse' : 'line ' + pad2((env.cut.line | 0) + 1), mf], [nn ? 'cut' : 'cut ' + pad2((env.cut.index | 0) + 1), mf], [clip(cutText(env), 7), bf]];
  const gap = fs * 1.5, ws = items.map(([s, f]) => tw(env, s, fs, f)), tot = ws.reduce((a, b) => a + b, 0) + gap * (items.length - 1), h = fs * 1.6;
  const sp = band(env, bb, tot, h, p, 22 * u + bh(bb) * 0.05), A = o * (sp.ok ? 1 : 0.3), y = sp.y + h / 2;
  let x = sp.x;
  items.forEach(([s, f], i) => {
    const e = ein(t, 0.35, i * 0.13), last = i === items.length - 1;
    T(env, s, x - (1 - e) * 14 * u, y, fs, { f, a: A * e * (last ? 1 : 0.8), c: last ? env.sc.fg : SUB(env) });
    if (last) segs(env, [[x, y + fs * 0.75, x + ws[i] * ein(t, 0.4, 0.55), y + fs * 0.75]], ACC(env), Math.max(1.5, 2 * u), A);
    else { const cx = x + ws[i] + gap / 2, k = fs * 0.24; stroke(env, [[cx - k * 0.6, y - k], [cx + k * 0.6, y], [cx - k * 0.6, y + k]], ACC(env), Math.max(1, 1.4 * u), A * e); }
    x += ws[i] + gap;
  });
});

/* 版数タグ — version / file-name style pills (v1.03, take 02, draft) that pop open in a row */
D('xnVersionTags', '版数タグ', 'Version Tags', ['pop', 'graphic', 'editorial'], 1, 'shapes', (env, bb, p, t, o, u) => {
  const fs = FS(env) * 0.9, nn = noNo(env), ln = (env.cut.line | 0) + 1, ix = (env.cut.index | 0) + 1, ac = ACC(env);
  const word = ['draft', 'final', 'beta', 'wip', 'stable', 'demo'][p.v % 6];
  const tags = nn ? ['lyric.txt', word, 'text'].slice(0, 1 + p.n) : [`v${1 + (ln % 3)}.${pad2(ix)}`, word, `take ${pad2(ln)}`].slice(0, 1 + p.n);
  const ph = fs * 1.9, px = fs * 0.8, gap = fs * 0.55, ws = tags.map(s => tw(env, s, fs) + px * 2), tot = ws.reduce((a, b) => a + b, 0) + gap * (tags.length - 1);
  const sp = spot(env, bb, tot, ph, p, 20 * u), A = o * (sp.ok ? 1 : 0.3);
  let x = sp.x;
  tags.forEach((s, i) => {
    const e = ein(t, 0.4, 0.05 + i * 0.12, z => E.outBack(z, 1.4)), w = ws[i] * cl(e, 0, 1.06), fill = i === (p.accent ? 0 : 1) % tags.length;
    rr(env, x, sp.y, w, ph, p.big ? 4 * u : ph / 2, fill ? ac : null, A * cl(e * 2), fill ? null : SUB(env), Math.max(1, 1.2 * u));
    T(env, s, x + ws[i] / 2, sp.y + ph / 2, fs, { al: 'center', c: fill ? onC(env, ac) : env.sc.fg, a: A * ein(t, 0.25, 0.2 + i * 0.12), num: nn ? 0 : (i !== 1 ? 1 : 0) });
    x += ws[i] + gap;
  });
});

/* ヒント吹き出し — a small filled tooltip with a pointer aimed at the lyric, naming the font or the reading */
D('xnTooltip', 'ヒント吹き出し', 'Tooltip', ['pop', 'graphic', 'editorial'], 0.9, 'leaders', (env, bb, p, t, o, u) => {
  const { W, H } = env, m = MG(env), fs = FS(env) * 0.9, bf = bodyF(env);
  const rj = J.romaji(cutText(env).replace(/[、。！？!?,.・「」]/g, ' ').replace(/\s+/g, ' ').trim()), cj = hasCJK(cutText(env));
  const txt = p.v % 3 === 0 ? String((env.st.fonts.display && env.st.fonts.display[0]) || 'display').replace(/_/g, ' ') : p.v % 3 === 1 ? (cj ? 'クリックして編集' : 'click to edit') : (rj ? clip(rj, 22) : cj ? 'テキストレイヤー' : 'text layer');
  const w = tw(env, txt, fs, bf) + fs * 1.6, h = fs * 2, tip = 9 * u, gap = 10 * u + bh(bb) * 0.04;
  let below = !!p.low; if (below ? bb.y1 + gap + tip + h > H - m : bb.y0 - gap - tip - h < m) below = !below;
  const ok = below ? bb.y1 + gap + tip + h <= H - m * 0.6 : bb.y0 - gap - tip - h >= m * 0.6, A = o * (ok ? 1 : 0.3);
  const ax = cl(lerp(bb.x0, bb.x1, p.right ? 0.72 : 0.28), m + 20 * u, W - m - 20 * u), ay = below ? bb.y1 + gap : bb.y0 - gap;
  const e = ein(t, 0.35, 0.3, z => E.outBack(z, 1.7)); if (e <= 0) return;
  const bob = Math.sin(env.ltb * 2.2) * 2 * u * env.fx.motion, s = below ? 1 : -1, x0 = cl(ax - w / 2, m, W - m - w);
  const ctx = env.ctx, c = env.sc.fg;
  ctx.save(); ctx.translate(ax, ay + bob); ctx.scale(e, e); ctx.translate(-ax, -ay);
  fillPoly(env, [[ax, ay], [ax - tip * 0.8, ay + s * (tip + 1)], [ax + tip * 0.8, ay + s * (tip + 1)]], c, A);
  rr(env, x0, below ? ay + tip : ay - tip - h, w, h, 5 * u, c, A);
  T(env, txt, x0 + w / 2, (below ? ay + tip : ay - tip - h) + h / 2, fs, { f: bf, al: 'center', c: onC(env, c), a: A });
  ctx.restore();
});

/* ============================================================ charts */

/* スパークライン — a tiny trend line that draws on, with its low / high marked and the latest value at the head */
D('xnSparkline', 'スパークライン', 'Sparkline', ['editorial', 'graphic', 'calm'], 1.1, 'waveform', (env, bb, p, t, o, u) => {
  const fs = FS(env) * 0.85, w = 190 * u + 40 * u * p.n, gh = 46 * u, h = gh + fs * 1.6, n = 18;
  const sp = spot(env, bb, w + fs * 3.2, h, p, 22 * u), A = o * (sp.ok ? 1 : 0.3), ac = ACC(env);
  const vals = []; let lo = 0, hi = 0;
  for (let i = 0; i < n; i++) { const v = 0.5 + 0.42 * J.noise1(i * 0.55, p.seed) + (i / n - 0.5) * 0.35 * (p.right ? 1 : -1) + J.rs(p.seed, i, 3) * 0.07; vals.push(v); if (v < vals[lo]) lo = i; if (v > vals[hi]) hi = i; }
  const mn = vals[lo], mx = vals[hi], Y = v => sp.y + fs * 1.4 + gh * (1 - (v - mn) / Math.max(0.001, mx - mn)), X = i => sp.x + w * i / (n - 1);
  const pts = vals.map((v, i) => [X(i), Y(v)]), e = ein(t, 0.8, 0.1, E.inOutCubic), head = part(pts, e);
  T(env, ['TREND', 'PULSE', 'MOOD', 'TEMPO'][p.v % 4], sp.x, sp.y + fs * 0.5, fs * 0.82, { a: A * ein(t, 0.3), tr: 0.14 });
  stroke(env, [[sp.x, sp.y + fs * 1.4 + gh], [sp.x + w * ein(t, 0.4), sp.y + fs * 1.4 + gh]], SUB(env), Math.max(1, u), A * 0.5, { dash: [2 * u, 4 * u], cap: 'butt' });
  stroke(env, head, env.sc.fg, Math.max(1.4, 2 * u), A);
  if (e > lo / (n - 1)) ring(env, X(lo), Y(mn), 3.5 * u, SUB(env), Math.max(1, 1.2 * u), A);
  if (e > hi / (n - 1)) ring(env, X(hi), Y(mx), 3.5 * u, ac, Math.max(1, 1.2 * u), A);
  if (head.length) {
    const q = head[head.length - 1], cur = 0.12 + 0.8 * cl(1 - (q[1] - sp.y - fs * 1.4) / gh);
    dot(env, q[0], q[1], 4 * u, ac, A);
    T(env, (cur * 100).toFixed(1), sp.x + w + fs * 0.5, cl(q[1], sp.y + fs * 1.4, sp.y + fs * 1.4 + gh), fs, { c: env.sc.fg, a: A * ein(t, 0.3, 0.2), num: 1 });
  }
});

/* 母音グラフ — horizontal bars counting the vowels (A I U E O) sung in the lyric line; glyph counts when there are none */
D('xnVowels', '母音グラフ', 'Vowel Chart', ['editorial', 'graphic', 'pop'], 0.9, 'bars', (env, bb, p, t, o, u) => {
  const g = glyphs(lineText(env).toLowerCase()).filter(c => !(J.isPunct && J.isPunct(c))); if (!g.length) return;
  const cv = { a: 0, i: 0, u: 0, e: 0, o: 0 }; let tot = 0;
  for (const c of g) {
    const r = (J.isHira(c) || J.isKata(c)) ? J.romaji(c) : /[a-z]/.test(c) ? c : null;
    if (r) for (const ch of r) if (cv[ch] != null) { cv[ch]++; tot++; }
  }
  let rows, vow = tot >= 2;
  if (vow) rows = ['a', 'i', 'u', 'e', 'o'].map(v => [v.toUpperCase(), cv[v]]);
  else { const map = new Map(); g.forEach(c => map.set(c, (map.get(c) || 0) + 1)); rows = [...map.entries()].sort((x, y) => y[1] - x[1]).slice(0, 3 + p.n); }
  const mx = Math.max(1, ...rows.map(r => r[1])), top = rows.findIndex(r => r[1] === mx);
  const fs = FS(env), f = vow ? monoF(env) : bodyF(env), rh = fs * 1.45, barW = 150 * u, w = fs * 1.6 + barW + fs * 1.8, h = rows.length * rh;
  const sp = spot(env, bb, w, h, p, 22 * u), A = o * (sp.ok ? 1 : 0.3), x0 = sp.x + fs * 1.6;
  segs(env, [[x0 - 4 * u, sp.y, x0 - 4 * u, sp.y + h * ein(t, 0.4)]], SUB(env), Math.max(1, u), A * 0.7);
  rows.forEach(([c, n], i) => {
    const e = ein(t, 0.5, 0.1 + i * 0.07), y = sp.y + rh * (i + 0.5), bwd = Math.max(2 * u, barW * (n / mx)) * e;
    T(env, c, sp.x + fs * 0.6, y, fs, { f, al: 'center', c: env.sc.fg, a: A * cl(e * 2) * 0.9, tr: 0 });
    box(env, x0, y - rh * 0.26, bwd, rh * 0.52, i === top ? ACC(env) : SUB(env), A * (i === top ? 1 : 0.55));
    T(env, String(Math.round(n * e)), x0 + bwd + fs * 0.4, y, fs * 0.85, { a: A * e, num: 1 });
  });
});

/* 凡例 — a chart legend: line / dash / dot samples keyed to pieces of the cut */
D('xnLegend', '凡例', 'Chart Legend', ['editorial', 'graphic', 'calm'], 1, 'leaders', (env, bb, p, t, o, u) => {
  const txt = cutText(env), g = glyphs(txt); if (!g.length) return;
  let labs;
  const wds = txt.split(' ').filter(Boolean);
  if (wds.length >= 2) { const k = Math.min(3, wds.length), per = Math.ceil(wds.length / k); labs = []; for (let i = 0; i < wds.length; i += per) labs.push(wds.slice(i, i + per).join(' ')); }
  else { const k = Math.min(3, g.length), per = Math.ceil(g.length / k); labs = []; for (let i = 0; i < g.length; i += per) labs.push(g.slice(i, i + per).join('')); }
  labs = labs.slice(0, 3).map(s => clip(s, 9));
  const fs = FS(env) * 0.95, bf = bodyF(env), rh = fs * 1.7, sw = 34 * u, pd = p.big ? fs * 0.8 : 0;
  const w = sw + fs * 0.7 + Math.max(...labs.map(s => tw(env, s, fs, bf))) + pd * 2, h = labs.length * rh + pd * 2;
  const sp = spot(env, bb, w, h, p, 22 * u), A = o * (sp.ok ? 1 : 0.3), cols = [env.sc.fg, ACC(env), ACC2(env)];
  if (p.big) rr(env, sp.x, sp.y, w, h, 3 * u, null, A * 0.6 * ein(t, 0.3), SUB(env), Math.max(1, u));
  labs.forEach((s, i) => {
    const e = ein(t, 0.45, 0.08 + i * 0.12), y = sp.y + pd + rh * (i + 0.5), x = sp.x + pd, k = (i + p.v) % 3;
    if (k === 0) segs(env, [[x, y, x + sw * e, y]], cols[i], Math.max(2, 2.6 * u), A);
    else if (k === 1) stroke(env, [[x, y], [x + sw * e, y]], cols[i], Math.max(2, 2.6 * u), A, { dash: [6 * u, 4 * u], cap: 'butt' });
    else { segs(env, [[x, y, x + sw * e, y]], cols[i], Math.max(1, 1.2 * u), A); dot(env, x + sw * 0.5 * e, y, 4.5 * u * e, cols[i], A); }
    T(env, s, x + sw + fs * 0.7 + (1 - e) * 8 * u, y, fs, { f: bf, a: A * e * 0.9 });
  });
});

/* グラフ軸 — x / y chart axes drawn round the lyric: ticks per glyph, arrow heads and axis titles */
D('xnAxes', 'グラフ軸', 'Chart Axes', ['editorial', 'graphic', 'calm'], 1, 'grid', (env, bb, p, t, o, u) => {
  const { W, H } = env, m = MG(env) * 0.5, fs = FS(env) * 0.78, pd = 18 * u + Math.min(bw(bb), bh(bb)) * 0.1, c = p.accent ? ACC(env) : env.sc.fg, lw = Math.max(1, 1.4 * u);
  const ox = Math.max(m, bb.x0 - pd), oy = Math.min(H - m - fs * 1.7, bb.y1 + pd), xe = Math.min(W - m, bb.x1 + pd * 1.7), ye = Math.max(m, bb.y0 - pd * 1.7);
  if (oy < bb.y1 + 4 * u || ox > bb.x0 - 4 * u) return;
  const e1 = ein(t, 0.5, 0, E.inOutCubic), e2 = ein(t, 0.5, 0.12, E.inOutCubic), ah = 6 * u;
  const xx = lerp(ox, xe, e1), yy = lerp(oy, ye, e2);
  segs(env, [[ox, oy, xx, oy], [ox, oy, ox, yy]], c, lw, o);
  stroke(env, [[xx - ah, oy - ah * 0.7], [xx, oy], [xx - ah, oy + ah * 0.7]], c, lw, o * cl(e1 * 3));
  stroke(env, [[ox - ah * 0.7, yy + ah], [ox, yy], [ox + ah * 0.7, yy + ah]], c, lw, o * cl(e2 * 3));
  const n = Math.max(1, Math.min(glyphs(cutText(env)).length, 12, Math.floor(bw(bb) / (fs * 1.5)))), tk = [];
  for (let i = 0; i < n; i++) {
    const x = bb.x0 + bw(bb) * (i + 0.5) / n; if (x > xx) break;
    tk.push([x, oy, x, oy + 6 * u]);
    if (n <= 8 || i % 2 === 0) T(env, String(i + 1), x, oy + 6 * u + fs * 0.8, fs, { al: 'center', a: o * ein(t, 0.3, 0.25 + i * 0.03) * 0.85, num: 1 });
  }
  for (let i = 0; i < 3; i++) { const y = lerp(bb.y1, bb.y0, i / 2); if (y >= yy) tk.push([ox, y, ox - 6 * u, y]); }
  segs(env, tk, c, lw, o * 0.9);
  const cj = hasCJK(cutText(env)), bf = bodyF(env), e3 = ein(t, 0.35, 0.45), tx = cj ? ['とき', 'ことば'] : ['time', 'words'], ty = cj ? ['想い', '声'] : ['feeling', 'voice'];
  if (xe - bb.x1 > 10 * u) T(env, tx[p.v % 2], xe, oy - fs * 0.9, fs, { f: bf, al: 'right', a: o * e3 * 0.9 });
  if (bb.y0 - ye > fs * 1.7) T(env, ty[p.v % 2], ox + 9 * u, ye + fs * 0.6, fs, { f: bf, a: o * e3 * 0.9 });
}, 'front');

/* ============================================================ meters / media */

/* レベルメーター — stereo L / R segment meters with a dB scale and peak-hold ticks, following the audio level */
D('xnLevelMeter', 'レベルメーター', 'Level Meter', ['graphic', 'glitch', 'pop'], 1, 'waveform', (env, bb, p, t, o, u) => {
  const fs = FS(env) * 0.8, N = 16, sw = 12 * u, sg = 4 * u, shh = 12 * u, rg = 8 * u, lab = fs * 1.4;
  const w = lab + N * (sw + sg), h = shh * 2 + rg + fs * 1.6, sp = spot(env, bb, w, h, p, 22 * u), A = o * (sp.ok ? 1 : 0.3);
  const e = ein(t, 0.45), ac = ACC(env), x0 = sp.x + lab;
  const lvl = (ch, tt) => cl((env.energy != null && tt === env.ltb ? env.energy * (ch ? 0.92 : 1) + J.rs(p.seed, ch, env.step) * 0.04 : 0.52 + 0.36 * J.noise1(tt * 3.1 + ch * 7.3, p.seed + ch) + 0.1 * Math.sin(tt * 9 + ch)) * e);
  for (let ch = 0; ch < 2; ch++) {
    const y = sp.y + ch * (shh + rg), L = lvl(ch, env.ltb), k = Math.round(L * N);
    let pk = L; for (let j = 1; j <= 6; j++) pk = Math.max(pk, lvl(ch, env.ltb - j * 0.07) - j * 0.02);
    const pi = Math.min(N - 1, Math.round(pk * N));
    T(env, ch ? 'R' : 'L', sp.x, y + shh / 2, fs, { a: A * e, c: env.sc.fg });
    const nShow = Math.ceil(N * e);
    for (let i = 0; i < nShow; i++) {
      const on = i < k, hotc = i >= N * 0.75;
      box(env, x0 + i * (sw + sg), y, sw, shh, on ? (hotc ? ac : env.sc.fg) : SUB(env), A * (on ? 1 : 0.22));
    }
    if (pi >= k) box(env, x0 + pi * (sw + sg), y, sw, shh, pi >= N * 0.75 ? ac : env.sc.fg, A * 0.9);
  }
  const ys = sp.y + shh * 2 + rg + fs * 0.95;
  [['-24', 0.2], ['-12', 0.5], ['-6', 0.75], ['0', 1]].forEach(([s, f]) => T(env, s, x0 + (N * (sw + sg) - sg) * f, ys, fs * 0.85, { al: f === 1 ? 'right' : 'center', a: A * e * 0.8, num: 1 }));
  if (noNo(env)) T(env, 'dB', x0, ys, fs * 0.85, { a: A * e * 0.8 });
});

/* タイムライン — an editor's mini timeline: tracks of clips, the current clip lit, a playhead crossing it */
D('xnTimeline', 'タイムライン', 'Timeline Tracks', ['graphic', 'glitch', 'editorial'], 1, 'bars', (env, bb, p, t, o, u) => {
  const fs = FS(env) * 0.72, nT = 2 + (p.n > 1 ? 1 : 0), th = 15 * u, tg = 6 * u, lab = fs * 2, w = 340 * u, ruler = 13 * u;
  const h = ruler + nT * (th + tg), sp = spot(env, bb, w + lab, h, p, 22 * u), A = o * (sp.ok ? 1 : 0.3), x0 = sp.x + lab, ac = ACC(env);
  const e = ein(t, 0.5), tk = [];
  for (let i = 0; i <= 30; i++) { const x = x0 + w * i / 30; if (x > x0 + w * e) break; tk.push([x, sp.y + ruler - 3 * u, x, sp.y + ruler - (i % 5 ? 6 : 10) * u]); }
  segs(env, tk, SUB(env), Math.max(1, u), A * 0.6);
  let c0 = 0.3, c1 = 0.7;
  for (let k = 0; k < nT; k++) {
    const y = sp.y + ruler + k * (th + tg);
    T(env, ['V1', 'A1', 'A2'][k], sp.x, y + th / 2, fs, { a: A * e * 0.8, num: 1 });
    let x = J.r(p.seed, k, 1) * 0.08, i = 0;
    while (x < 0.98 && i < 6) {
      const len = Math.min(1 - x, 0.14 + J.r(p.seed, k, i, 2) * 0.26), cur = k === 0 && i === 1, ee = ein(t, 0.45, 0.05 + i * 0.05 + k * 0.04), off = (1 - ee) * 40 * u;
      if (cur) { c0 = x; c1 = x + len; }
      rr(env, x0 + x * w + off, y, Math.max(2, len * w - 3 * u), th, 2.5 * u, cur ? ac : (k ? SUB(env) : env.sc.fg), A * ee * (cur ? 0.95 : k ? 0.3 : 0.38));
      x += len + 0.012; i++;
    }
  }
  const pr = cl(env.lt / Math.max(0.2, env.cut.dur || 1)), px = x0 + w * lerp(c0, c1, pr) * e, c = env.sc.fg;
  segs(env, [[px, sp.y + ruler - 2 * u, px, sp.y + h - tg]], c, Math.max(1.2, 1.6 * u), A);
  fillPoly(env, [[px - 5 * u, sp.y], [px + 5 * u, sp.y], [px + 5 * u, sp.y + 5 * u], [px, sp.y + ruler - 2 * u], [px - 5 * u, sp.y + 5 * u]], c, A * e);
});

/* 曲順リスト — a playlist: skeleton rows, the current row carrying the lyric line and bouncing now-playing bars */
D('xnTrackList', '曲順リスト', 'Track List', ['pop', 'graphic', 'editorial'], 1, 'leaders', (env, bb, p, t, o, u) => {
  const fs = FS(env) * 0.9, bf = bodyF(env), rows = 3 + (p.n > 2 ? 1 : 0), rh = fs * 1.9, w = 290 * u, h = rows * rh, cur = 1;
  const sp = spot(env, bb, w, h, p, 22 * u), A = o * (sp.ok ? 1 : 0.3), ac = ACC(env), base = (env.cut.line | 0) + 1, nx = fs * 1.9;
  for (let i = 0; i < rows; i++) {
    const e = ein(t, 0.4, i * 0.08), y = sp.y + rh * (i + 0.5), dx = (1 - e) * 18 * u, is = i === cur;
    if (i > 0) segs(env, [[sp.x, sp.y + rh * i, sp.x + w * e, sp.y + rh * i]], SUB(env), Math.max(1, 0.8 * u), A * 0.3);
    if (is) {
      const b = []; for (let k = 0; k < 3; k++) { const hh = fs * (0.25 + 0.6 * Math.abs(Math.sin(env.ltb * (5 + k * 1.7) + k * 2))) * e; b.push([sp.x + k * 5 * u + 1.5 * u, y + fs * 0.45, sp.x + k * 5 * u + 1.5 * u, y + fs * 0.45 - hh]); }
      segs(env, b, ac, 3 * u, A);
      T(env, clip(lineText(env), hasCJK(lineText(env)) ? 11 : 20), sp.x + nx + dx, y, fs, { f: bf, c: env.sc.fg, a: A * e * 0.95, tr: 0.04 });
    } else {
      T(env, pad2(Math.max(1, base - cur + i)), sp.x + dx, y, fs * 0.85, { a: A * e * 0.7, num: 1 });
      rr(env, sp.x + nx + dx, y - fs * 0.22, w * (0.25 + 0.3 * J.r(p.seed, i, 5)) * e, fs * 0.44, fs * 0.22, SUB(env), A * 0.32);
    }
    T(env, `${2 + (J.h(p.seed, i, 7) % 3)}:${pad2(J.h(p.seed, i, 8) % 60)}`, sp.x + w, y, fs * 0.82, { al: 'right', a: A * e * (is ? 0.9 : 0.55), time: 1 });
  }
});

/* 星評価 — a five-star rating whose stars fill one by one (half stars included) with its score */
const STAR = (() => { const a = []; for (let i = 0; i < 10; i++) { const an = -90 * DEG + i * TAU / 10, r = i % 2 ? 0.42 : 1; a.push([Math.cos(an) * r, Math.sin(an) * r]); } return a; })();
D('xnStars', '星評価', 'Star Rating', ['pop', 'emotional', 'editorial'], 0.8, 'shapes', (env, bb, p, t, o, u) => {
  const R = 13 * u + 3 * u * p.n, gap = R * 2.35, fs = FS(env), rating = 3.5 + (J.h(p.seed, 3) % 4) * 0.5;
  const nn = noNo(env), w = gap * 4 + R * 2 + (nn ? 0 : fs * 2.4), h = R * 2.1;
  const sp = spot(env, bb, w, h, p, 20 * u), A = o * (sp.ok ? 1 : 0.3), ac = ACC(env), ctx = env.ctx;
  for (let i = 0; i < 5; i++) {
    const cx = sp.x + R + i * gap, cy = sp.y + h / 2 + R * 0.06, e = ein(t, 0.35, i * 0.06, z => E.outBack(z, 1.6)); if (e <= 0) continue;
    const ft = 0.45 + i * 0.16, f = cl(rating - i) * cl((t - ft) / 0.12), pop = 1 + 0.35 * Math.sin(Math.PI * cl((t - ft) / 0.3));
    const pts = STAR.map(([x, y]) => [cx + x * R * e * pop, cy + y * R * e * pop]);
    if (f > 0) { ctx.save(); ctx.beginPath(); ctx.rect(cx - R * 1.5, cy - R * 1.5, R * 1.5 + (f >= 1 ? R * 1.5 : 0), R * 3); ctx.clip(); fillPoly(env, pts, ac, A); ctx.restore(); }
    stroke(env, pts, f > 0 ? ac : SUB(env), Math.max(1.2, 1.6 * u), A, { close: true, join: 'round' });
  }
  T(env, (rating * cl((t - 0.4) / 0.55)).toFixed(1), sp.x + w, sp.y + h / 2, fs * 1.15, { al: 'right', c: env.sc.fg, a: A * ein(t, 0.3, 0.3), num: 1 });
});

/* 電池残量 — phone status icons: signal bars lighting up, a clock, a battery that drains over the cut */
D('xnBattery', '電池残量', 'Status Icons', ['pop', 'graphic', 'glitch'], 0.7, 'bars', (env, bb, p, t, o, u) => {
  const fs = FS(env) * 0.9, hh = fs * 1.05, nn = noNo(env), nt = noTime(env);
  const sigW = 26 * u, batW = 34 * u, pcW = nn ? 0 : fs * 2.5, tmW = nt ? 0 : fs * 3.2, g = fs * 0.7, w = sigW + g + tmW + (tmW ? g : 0) + pcW + batW + 4 * u;
  const sp = spot(env, bb, w, hh, Object.assign({}, p, { corner: true }), 20 * u), A = o * (sp.ok ? 1 : 0.3), c = env.sc.fg, cy = sp.y + hh / 2;
  let x = sp.x;
  for (let i = 0; i < 4; i++) { const e = ein(t, 0.25, 0.1 + i * 0.12, E.outCubic), bhh = hh * (0.3 + 0.23 * i); box(env, x + i * 7 * u, sp.y + hh - bhh * (0.4 + 0.6 * e), 4.5 * u, bhh * (0.4 + 0.6 * e), c, A * (0.25 + 0.75 * e)); }
  x += sigW + g;
  if (tmW) { const mm = (J.h(p.seed, 2) % 60), hr = 1 + (J.h(p.seed, 1) % 12); T(env, `${hr}:${pad2((mm + Math.floor(env.lt / 2)) % 60)}`, x, cy, fs, { c, a: A * ein(t, 0.3, 0.1), time: 1 }); x += tmW + g; }
  const lvl = cl(1 - 0.85 * cl(env.lt / Math.max(0.3, env.cut.dur || 1))) * ein(t, 0.5, 0.15), low = lvl < 0.3;
  T(env, Math.round(lvl * 100) + '%', x + pcW - fs * 0.4, cy, fs * 0.9, { al: 'right', c, a: A * ein(t, 0.3, 0.15), num: 1 }); x += pcW;
  rr(env, x, sp.y + hh * 0.08, batW, hh * 0.84, 3 * u, null, A * ein(t, 0.3), c, Math.max(1, 1.3 * u));
  box(env, x + batW + 1.5 * u, cy - hh * 0.16, 2.5 * u, hh * 0.32, c, A * ein(t, 0.3));
  const blink = low && Math.floor(env.lt * 4) % 2 === 0 ? 0.45 : 1;
  rr(env, x + 3 * u, sp.y + hh * 0.08 + 3 * u, Math.max(0, (batW - 6 * u) * lvl), hh * 0.84 - 6 * u, 1.5 * u, low ? ACC(env) : c, A * blink);
});

/* ============================================================ widgets */

/* スライダー — labelled range sliders whose knobs glide to their values, with a readout each */
const SL_LABS = [['TEMPO', 'PITCH', 'REVERB'], ['GAIN', 'PAN', 'ECHO'], ['WARMTH', 'BLUR', 'GRAIN'], ['想い', '距離', '温度'], ['きもち', 'ことば', 'おと']];
D('xnSliders', 'スライダー', 'Sliders', ['pop', 'graphic', 'editorial'], 1, 'bars', (env, bb, p, t, o, u) => {
  const fs = FS(env) * 0.85, bf = bodyF(env), n = Math.min(3, 1 + p.n), labs = SL_LABS[p.v % (hasCJK(cutText(env)) ? 5 : 3)], rh = fs * 2.1, tr = 150 * u, nn = noNo(env);
  const lw0 = Math.max(...labs.slice(0, n).map(s => tw(env, s, fs, bf, 0.1))) + fs * 0.9, w = lw0 + tr + (nn ? 8 * u : fs * 2.2), h = n * rh;
  const sp = spot(env, bb, w, h, p, 22 * u), A = o * (sp.ok ? 1 : 0.3), ac = ACC(env);
  for (let i = 0; i < n; i++) {
    const e = ein(t, 0.4, i * 0.08), y = sp.y + rh * (i + 0.5), x0 = sp.x + lw0, tgt = 0.2 + 0.7 * J.r(p.seed, i, 4);
    const v = tgt * ein(t, 0.6, 0.3 + i * 0.18, z => E.outBack(z, 1.3)) + 0.03 * Math.sin(env.ltb * 1.7 + i * 2) * env.fx.motion * cl(t - 1), kx = x0 + tr * cl(v) * e;
    T(env, labs[i], sp.x, y, fs, { f: bf, tr: 0.1, a: A * e * 0.9 });
    segs(env, [[x0, y, x0 + tr * e, y]], SUB(env), Math.max(2, 3 * u), A * 0.4, 'round');
    segs(env, [[x0, y, kx, y]], ac, Math.max(2, 3 * u), A, 'round');
    dot(env, kx, y, 7 * u * e, env.sc.fg, A); dot(env, kx, y, 3 * u * e, env.sc.bg, A);
    T(env, pad2(cl(v) * 100), sp.x + w, y, fs, { al: 'right', c: env.sc.fg, a: A * e, num: 1 });
  }
});

/* プルダウン — a select box that drops open, runs its highlight down the options, picks one and closes */
const DD_OPTS = [['Verse', 'Chorus', 'Bridge'], ['Soft', 'Normal', 'Loud'], ['Slow', 'Mid', 'Fast'], ['きのう', 'きょう', 'あした'], ['ひとり', 'ふたり', 'みんな']];
D('xnDropdown', 'プルダウン', 'Dropdown', ['pop', 'graphic'], 0.8, 'shapes', (env, bb, p, t, o, u) => {
  const fs = FS(env) * 0.92, bf = bodyF(env), opts = DD_OPTS[p.v % (hasCJK(cutText(env)) ? 5 : 3)], rh = fs * 1.9, sel = 1 + (J.h(p.seed, 2) % 2);
  const w = Math.max(...opts.map(s => tw(env, s, fs, bf))) + fs * 3.4, h = rh * 4 + 6 * u;
  const sp = spot(env, bb, w, h, p, 22 * u), A = o * (sp.ok ? 1 : 0.3), ac = ACC(env), c = env.sc.fg, lw = Math.max(1, 1.3 * u);
  const dur = Math.max(0.6, env.cut.dur || 1), tc = Math.min(1.45, dur * 0.62), open = ein(t, 0.3, 0.3) * (1 - ein(t, 0.25, tc, E.inOutCubic)), closed = t > tc + 0.1;
  const e = ein(t, 0.35);
  rr(env, sp.x, sp.y, w * e, rh, 5 * u, null, A, closed ? ac : c, lw);
  T(env, opts[closed ? sel : 0], sp.x + fs * 0.8, sp.y + rh / 2, fs, { f: bf, c, a: A * ein(t, 0.3, 0.1) });
  const kx = sp.x + w - fs * 1.1, ky = sp.y + rh / 2, k = fs * 0.28, fl = 1 - 2 * open;
  stroke(env, [[kx - k, ky - k * 0.5 * fl], [kx, ky + k * 0.5 * fl], [kx + k, ky - k * 0.5 * fl]], closed ? ac : c, lw * 1.2, A * e);
  if (open > 0.01) {
    const ly = sp.y + rh + 6 * u, lh = rh * 3 * open, ctx = env.ctx;
    ctx.save(); ctx.beginPath(); ctx.rect(sp.x - 2, ly - 1, w + 4, lh + 2); ctx.clip();
    rr(env, sp.x, ly, w, rh * 3, 5 * u, null, A, SUB(env), lw);
    const hl = lerp(0, sel, ein(t, 0.45, 0.6, E.inOutCubic));
    rr(env, sp.x + 3 * u, ly + rh * hl + 3 * u, w - 6 * u, rh - 6 * u, 3 * u, ac, A * 0.9);
    opts.forEach((s, i) => T(env, s, sp.x + fs * 0.8, ly + rh * (i + 0.5), fs, { f: bf, c: Math.abs(hl - i) < 0.5 ? onC(env, ac) : SUB(env), a: A }));
    ctx.restore();
  }
});

/* ページ送り — pagination: ‹ 1 2 3 4 5 › with the active box sliding onto the current line's page */
D('xnPager', 'ページ送り', 'Pager', ['pop', 'graphic', 'editorial'], 1, 'dots', (env, bb, p, t, o, u) => {
  const fs = FS(env) * 0.95, c = fs * 1.9, g = fs * 0.35, n = 5, ln = env.cut.line | 0, base = Math.floor(ln / n) * n, act = ln % n, nn = noNo(env);
  const w = (n + 2) * c + (n + 1) * g, sp = band(env, bb, w, c, p, 24 * u + bh(bb) * 0.05), A = o * (sp.ok ? 1 : 0.3), ac = ACC(env), lw = Math.max(1, 1.3 * u);
  const cx = i => sp.x + (i + 1) * (c + g) + c / 2, cy = sp.y + c / 2, k = fs * 0.3;
  const eA = ein(t, 0.3), eB = ein(t, 0.3, 0.1);
  stroke(env, [[sp.x + c / 2 + k * 0.5, cy - k], [sp.x + c / 2 - k * 0.5, cy], [sp.x + c / 2 + k * 0.5, cy + k]], SUB(env), lw * 1.2, A * eA);
  stroke(env, [[sp.x + w - c / 2 - k * 0.5, cy - k], [sp.x + w - c / 2 + k * 0.5, cy], [sp.x + w - c / 2 - k * 0.5, cy + k]], env.sc.fg, lw * 1.2, A * eB);
  const from = act === 0 ? 0 : act - 1, pos = lerp(from, act, ein(t, 0.4, 0.4, z => E.outBack(z, 1.5))), hx = lerp(cx(from), cx(act), ein(t, 0.4, 0.4, z => E.outBack(z, 1.5)));
  rr(env, hx - c / 2, sp.y, c, c, p.big ? c / 2 : 4 * u, ac, A * ein(t, 0.3, 0.15));
  for (let i = 0; i < n; i++) {
    const e = ein(t, 0.3, 0.04 * i, E.outCubic), on = Math.abs(pos - i) < 0.5;
    if (!on) rr(env, cx(i) - c / 2, sp.y, c, c, p.big ? c / 2 : 4 * u, null, A * e * 0.5, SUB(env), lw);
    if (nn) dot(env, cx(i), cy, 3 * u * e, on ? onC(env, ac) : SUB(env), A);
    else T(env, String(base + i + 1), cx(i), cy, fs, { al: 'center', tr: 0, c: on ? onC(env, ac) : SUB(env), a: A * e, num: 1 });
  }
});

/* 検索窓 — a search field: magnifier, the cut typed in with a caret, then a hit count below */
D('xnSearch', '検索窓', 'Search Field', ['pop', 'graphic', 'editorial'], 1, 'shapes', (env, bb, p, t, o, u) => {
  const fs = FS(env), bf = bodyF(env), q = clip(cutText(env), 12), cj = hasCJK(q), hgt = fs * 2.3;
  const w = cl(tw(env, q, fs, bf) + fs * 4.2, 230 * u, 420 * u), h = hgt + fs * 1.7;
  const sp = spot(env, bb, w, h, p, 22 * u), A = o * (sp.ok ? 1 : 0.3), c = env.sc.fg, lw = Math.max(1, 1.4 * u), e = ein(t, 0.4);
  rr(env, sp.x + w * (1 - e) / 2, sp.y, w * e, hgt, p.big ? 5 * u : hgt / 2, null, A, c, lw);
  const mx = sp.x + fs * 1.3, my = sp.y + hgt / 2, mr = fs * 0.36;
  ring(env, mx, my - mr * 0.2, mr * e, SUB(env), lw * 1.2, A); segs(env, [[mx + mr * 0.7, my + mr * 0.5, mx + mr * 1.35, my + mr * 1.15]], SUB(env), lw * 1.4, A * e, 'round');
  const cs = chars(q), dT = Math.min(0.7, cs.length * 0.07), k = Math.floor(cs.length * cl((t - 0.3) / dT) + 1e-6), s = cs.slice(0, k).join(''), tx = sp.x + fs * 2.4;
  T(env, s, tx, my, fs, { f: bf, c, a: A * 0.9 });
  const done = t > 0.3 + dT + 0.15;
  if (!done || Math.floor(env.lt * 2.4) % 2 === 0) segs(env, [[tx + tw(env, s, fs, bf) + 3 * u, my - fs * 0.6, tx + tw(env, s, fs, bf) + 3 * u, my + fs * 0.6]], ACC(env), Math.max(1.5, 2 * u), A * cl((t - 0.2) * 5));
  if (done) {
    const e2 = ein(t, 0.3, 0.3 + dT + 0.15), n = 100 + J.h(p.seed, 9) % 9000, ns = n.toLocaleString('en-US');
    T(env, noNo(env) ? (cj ? '検索結果' : 'results') : (cj ? `約 ${ns} 件` : `${ns} results`), sp.x + fs * 1.0, sp.y + hgt + fs * 1.0, fs * 0.8, { f: bf, a: A * e2 * 0.85 });
  }
});

/* キーの列 — keycaps spelling the cut's reading, pressed one after another, ending on Enter */
D('xnKeycaps', 'キーの列', 'Keycaps', ['pop', 'graphic', 'glitch'], 0.9, 'shapes', (env, bb, p, t, o, u) => {
  const rj = syllables(cutText(env)).filter(q => q[1]).map(q => q[0]).join('');
  let ks = chars(rj.toUpperCase()).filter(c => /[A-Z]/.test(c)).slice(0, 8); if (!ks.length) ks = chars('LYRIC');
  const fs = FS(env) * 0.9, k = fs * 2, g = fs * 0.35, n = ks.length, ew = k * 1.8, w = n * (k + g) + ew, h = k + 5 * u;
  const sp = band(env, bb, w, h, p, 22 * u + bh(bb) * 0.05), A = o * (sp.ok ? 1 : 0.3), ac = ACC(env), c = env.sc.fg, lw = Math.max(1, 1.3 * u);
  for (let i = 0; i <= n; i++) {
    const e = ein(t, 0.3, i * 0.035, z => E.outBack(z, 1.5)); if (e <= 0) continue;
    const tp = 0.4 + i * 0.13, dt = t - tp, pr = dt > 0 ? Math.exp(-dt * 9) : 0, kw = i === n ? ew : k, x = sp.x + i * (k + g), y = sp.y + pr * 4 * u + (1 - e) * 8 * u, ent = i === n;
    rr(env, x, sp.y + 5 * u, kw, k, 5 * u, null, A * e * 0.6, SUB(env), lw);
    rr(env, x, y, kw, k, 5 * u, env.sc.bg, A * e); rr(env, x, y, kw, k, 5 * u, ac, A * e * pr * 0.9, ent && dt > 0 ? ac : c, lw);
    if (ent) stroke(env, [[x + kw * 0.7, y + k * 0.3], [x + kw * 0.7, y + k * 0.58], [x + kw * 0.3, y + k * 0.58], [x + kw * 0.42, y + k * 0.45], [x + kw * 0.3, y + k * 0.58], [x + kw * 0.42, y + k * 0.71]], pr > 0.5 ? onC(env, ac) : c, lw * 1.2, A * e);
    else T(env, ks[i], x + kw / 2, y + k / 2, fs, { al: 'center', tr: 0, c: pr > 0.5 ? onC(env, ac) : c, a: A * e });
  }
});

/* 入力中 — a chat "typing" bubble: three dots rolling in a wave, with a small status caption */
D('xnTyping', '入力中', 'Typing Dots', ['pop', 'emotional', 'calm'], 0.8, 'dots', (env, bb, p, t, o, u) => {
  const fs = FS(env) * 0.8, bf = bodyF(env), R = 5 * u + 1.5 * u * p.n, bwid = R * 11, bht = R * 5.4, cj = hasCJK(cutText(env));
  const h = bht + fs * 1.7, sp = spot(env, bb, bwid + R, h, p, 22 * u), A = o * (sp.ok ? 1 : 0.3), rt = !!p.right;
  const e = ein(t, 0.4, 0.05, z => E.outBack(z, 1.5)); if (e <= 0) return;
  const x0 = sp.x + (rt ? 0 : R), ax = rt ? x0 + bwid : x0, ay = sp.y + bht, ctx = env.ctx, fillC = p.accent ? ACC(env) : env.sc.fg;
  ctx.save(); ctx.translate(ax, ay); ctx.scale(e, e); ctx.translate(-ax, -ay);
  rr(env, x0, sp.y, bwid, bht, bht / 2, fillC, A * (p.accent ? 0.95 : 0.14), p.accent ? null : SUB(env), Math.max(1, 1.2 * u));
  dot(env, ax + (rt ? 1 : -1) * R * 0.3, ay - R * 0.2, R * 0.8, fillC, A * (p.accent ? 0.95 : 0.3));
  for (let i = 0; i < 3; i++) {
    const ph = (env.ltb * 1.5 - i * 0.16) % 1, b = ph < 0.4 ? Math.sin(ph / 0.4 * Math.PI) : 0;
    dot(env, x0 + bwid / 2 + (i - 1) * R * 2.6, sp.y + bht / 2 - b * R * 1.3, R * (0.85 + 0.15 * b), p.accent ? onC(env, fillC) : env.sc.fg, A * (0.55 + 0.45 * b));
  }
  ctx.restore();
  T(env, cj ? '入力中…' : 'typing…', rt ? x0 + bwid - R : x0 + R, sp.y + bht + fs * 1.0, fs, { f: bf, al: rt ? 'right' : 'left', a: A * ein(t, 0.3, 0.3) * 0.85 });
});

/* ============================================================ calendar / clock / ticker */

/* カレンダー — a mini month grid whose days fill in row by row; the cut's day gets circled */
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
D('xnCalendar', 'カレンダー', 'Mini Calendar', ['pop', 'editorial', 'emotional'], 0.8, 'grid', (env, bb, p, t, o, u) => {
  if (noNo(env)) return;
  const fs = FS(env) * 0.72, cw = fs * 1.75, chh = fs * 1.5, mo = J.h(p.seed, 1) % 12, off = J.h(p.seed, 2) % 7, days = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][mo];
  const rowsN = Math.ceil((off + days) / 7), w = cw * 7, h = fs * 1.9 + chh * (rowsN + 1);
  const sp = spot(env, bb, w, h, p, 22 * u), A = o * (sp.ok ? 1 : 0.3), ac = ACC(env), today = 1 + ((env.cut.line | 0) * 7 + (env.cut.index | 0) * 3 + J.h(p.seed, 3)) % days;
  const e0 = ein(t, 0.4);
  T(env, MONTHS[mo], sp.x + cw * 0.15, sp.y + fs * 0.6, fs * 1.25, { c: env.sc.fg, a: A * e0, tr: 0.14 });
  segs(env, [[sp.x, sp.y + fs * 1.55, sp.x + w * e0, sp.y + fs * 1.55]], SUB(env), Math.max(1, u), A * 0.7);
  const y0 = sp.y + fs * 1.9;
  'SMTWTFS'.split('').forEach((d, i) => T(env, d, sp.x + cw * (i + 0.5), y0 + chh * 0.5, fs * 0.85, { al: 'center', tr: 0, a: A * ein(t, 0.3, 0.05 + i * 0.02) * (i === 0 ? 1 : 0.7), c: i === 0 ? ac : SUB(env) }));
  for (let d = 1; d <= days; d++) {
    const k = off + d - 1, col = k % 7, row = Math.floor(k / 7), e = ein(t, 0.3, 0.12 + row * 0.07 + col * 0.012, E.outCubic); if (e <= 0) continue;
    const x = sp.x + cw * (col + 0.5), y = y0 + chh * (row + 1.5), is = d === today;
    if (is) { const ce = ein(t, 0.4, 0.65, E.inOutCubic); ring(env, x, y, chh * 0.62, ac, Math.max(1.2, 1.6 * u), A, -Math.PI / 2, -Math.PI / 2 + TAU * ce); }
    T(env, String(d), x, y + (1 - e) * 4 * u, fs, { al: 'center', tr: 0, c: is ? env.sc.fg : SUB(env), a: A * e * (is ? 1 : col === 0 ? 0.85 : 0.7), num: 1 });
  }
});

/* 時計 — an analogue clock face: ticks draw on, the hands sweep to a time, the second hand ticks */
D('xnClock', '時計', 'Clock Face', ['calm', 'emotional', 'editorial'], 0.9, 'rings', (env, bb, p, t, o, u) => {
  if (noTime(env)) return;
  const fs = FS(env) * 0.85, R = 38 * u + 9 * u * p.n, w = R * 2.1, h = R * 2.1 + fs * 1.7;
  const sp = spot(env, bb, w, h, p, 22 * u), A = o * (sp.ok ? 1 : 0.3), cx = sp.x + w / 2, cy = sp.y + R * 1.05, c = env.sc.fg, ac = ACC(env), lw = Math.max(1, 1.4 * u);
  const e = ein(t, 0.55, 0, E.inOutCubic);
  ring(env, cx, cy, R, c, lw, A, -Math.PI / 2, -Math.PI / 2 + TAU * e);
  const tk = [], tk2 = [];
  for (let i = 0; i < 60; i++) {
    if (i / 60 > e) break; if (i % 5 && !p.big) continue;
    const a = -Math.PI / 2 + i / 60 * TAU, r0 = R * (i % 15 === 0 ? 0.8 : i % 5 === 0 ? 0.86 : 0.93);
    (i % 5 ? tk2 : tk).push([cx + Math.cos(a) * r0, cy + Math.sin(a) * r0, cx + Math.cos(a) * R * 0.96, cy + Math.sin(a) * R * 0.96]);
  }
  segs(env, tk, c, lw, A * 0.9); segs(env, tk2, SUB(env), Math.max(1, u), A * 0.5);
  const hr = 1 + J.h(p.seed, 1) % 12, mm = (J.h(p.seed, 2) % 12) * 5, sw2 = ein(t, 0.9, 0.2, z => E.outBack(z, 1.1));
  const aM = -Math.PI / 2 + (mm / 60) * TAU * sw2, aH = -Math.PI / 2 + ((hr % 12 + mm / 60) / 12) * TAU * sw2;
  segs(env, [[cx, cy, cx + Math.cos(aH) * R * 0.48, cy + Math.sin(aH) * R * 0.48]], c, Math.max(2.4, 3.6 * u), A * e, 'round');
  segs(env, [[cx, cy, cx + Math.cos(aM) * R * 0.74, cy + Math.sin(aM) * R * 0.74]], c, Math.max(1.6, 2.4 * u), A * e, 'round');
  const s0 = Math.floor(env.ltb), fr = env.ltb - s0, aS = -Math.PI / 2 + (s0 + E.outBack(cl(fr / 0.2), 2.2)) / 60 * TAU;
  segs(env, [[cx - Math.cos(aS) * R * 0.16, cy - Math.sin(aS) * R * 0.16, cx + Math.cos(aS) * R * 0.84, cy + Math.sin(aS) * R * 0.84]], ac, Math.max(1, 1.3 * u), A * e);
  dot(env, cx, cy, 3.5 * u, ac, A * e);
  T(env, `${pad2(hr)}:${pad2(mm)}`, cx, sp.y + R * 2.1 + fs * 0.95, fs, { al: 'center', a: A * ein(t, 0.3, 0.5) * 0.9, time: 1, tr: 0.12 });
});

/* ティッカー — a ticker tape along a screen edge: the lyric line scrolling between rules with up / down marks and deltas */
D('xnTicker', 'ティッカー', 'Ticker Tape', ['graphic', 'glitch', 'pop', 'editorial'], 1.1, 'bars', (env, bb, p, t, o, u) => {
  const { W, H } = env, fs = FS(env), bf = bodyF(env), bhh = fs * 2.4, nn = noNo(env), src = clip(lineText(env) || 'lyric', 30);
  let top = !p.low; if ((top ? bb.y0 : H - bb.y1) < bhh + 14 * u) top = !top;
  const A = o * ((top ? bb.y0 : H - bb.y1) < bhh + 4 * u ? 0.3 : 1), e = ein(t, 0.45), y0 = top ? -bhh * (1 - e) : H - bhh * e, cy = y0 + bhh / 2;
  box(env, 0, y0, W, bhh, env.sc.fg, A * 0.07);
  const ry = top ? y0 + bhh : y0, ex = W * ein(t, 0.6, 0.05, E.inOutCubic);
  segs(env, [p.right ? [W - ex, ry, W, ry] : [0, ry, ex, ry]], p.accent ? ACC(env) : env.sc.fg, Math.max(1.2, 1.6 * u), A * 0.9);
  const wl = tw(env, src, fs, bf, 0.05), g = fs * 1.1, tri = fs * 0.5, wd = nn ? 0 : fs * 3.2, per = wl + g + tri + (wd ? fs * 0.5 + wd : 0) + g * 1.6;
  const dir = p.right ? 1 : -1, sc0 = env.ltb * (50 + 60 * env.fx.motion) * u, k0 = Math.floor(sc0 / per), offx = sc0 - k0 * per;
  const cnt = Math.min(40, Math.ceil(W / per) + 2);
  for (let j = -1; j < cnt; j++) {
    const x = dir > 0 ? j * per + offx : W - (j * per + offx) - per, id = dir > 0 ? j - k0 : j - k0;
    if (x > W || x + per < 0) continue;
    const up = J.r(p.seed, id, 1) < 0.6, c = up ? ACC(env) : SUB(env), txx = x + wl + g, s = up ? -1 : 1;
    T(env, src, x, cy, fs, { f: bf, tr: 0.05, c: env.sc.fg, a: A * e * 0.8 });
    fillPoly(env, [[txx, cy - s * tri * 0.45], [txx + tri, cy - s * tri * 0.45], [txx + tri / 2, cy + s * tri * 0.45]], c, A * e);
    if (wd) T(env, (up ? '+' : '-') + (0.1 + J.r(p.seed, id, 2) * 4.8).toFixed(2), txx + tri + fs * 0.5, cy, fs * 0.88, { c, a: A * e, num: 1 });
  }
});
})();
