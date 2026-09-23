/* JIZURA pack: layoutsC — 34 layouts themed on print, editorial design and Japanese paper objects */
(() => {
'use strict';
const E = J.E;
const P = 'layoutsC';
const reg = (key, def) => J.register('layout', key, def, P);

/* ---------------------------------------------------------------- helpers */
const U = env => Math.min(env.W, env.H);
const isPort = env => env.H > env.W * 1.08;
const portOf = cut => cut.H > cut.W * 1.08;
const strip = t => String(t || '').replace(/\s+/g, '');
const pad2 = n => String(n).padStart(2, '0');
const pad3 = n => String(n).padStart(3, '0');
const lineN = env => Math.max(0, env.cut.line | 0) + 1;
const lineNo = env => pad2(lineN(env));
const bodyF = env => (env.st.fonts.body && env.st.fonts.body[0]) || 'gothic_med';
const monoF = env => (env.st.fonts.mono && env.st.fonts.mono[0]) || 'mono';
const serifF = env => (env.st.fonts.serif && env.st.fonts.serif[0]) || 'mincho';
const fontsOf = (st, roles) => J.fontsOf(st, roles);
const tin = (env, d = 0, len = 0.4, ease = E.outExpo) => ease(J.clamp((env.lt - d) / Math.max(0.01, len)));
const tout = env => 1 - E.inCubic(env.pOut);
const meas = (text, font, size, o) => J.measure(Object.assign({ text, font, size }, o || {}));
const box = (x0, y0, x1, y1) => ({ x0, y0, x1, y1, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, boxes: [] });
const smallSize = env => J.clamp(U(env) * 0.024, 14, 34);
const hasLatin = t => /[A-Za-z]/.test(t);
const flat = t => (hasLatin(t) ? String(t || '').trim().replace(/\s+/g, ' ') : strip(t));
/* vertical-setting copy: Japanese drops spaces, latin keeps single word gaps */
const vtext = t => (hasLatin(t) ? flat(t) : strip(t));
const romaOfText = t => { if (hasLatin(t) || !t) return null; const r = J.romaji(strip(t)); return r ? r.toUpperCase() : null; };
const romajiOf = env => romaOfText(env.cut.text);
const altCopy = env => {
  const c = env.cut;
  if (c.lineText && strip(c.lineText) !== strip(c.text)) return flat(c.lineText);
  return c.note || romajiOf(env) || 'No.' + lineNo(env);
};
/* real secondary copy only (null when the cut is the whole line and has no reading) */
const deckCopy = env => {
  const c = env.cut;
  if (c.lineText && strip(c.lineText) !== strip(c.text)) return flat(c.lineText);
  return c.note || romajiOf(env) || null;
};
const metaLine = env => 'No.' + lineNo(env) + '  ／  ' + J.fmtTime(env.cut.start) + '  ／  ' + J.glyphCount(env.cut.text) + (hasLatin(env.cut.text) ? ' CHARS' : '字');
const isBad = c => J.isSmallKana(c) || J.isPunct(c) || c === 'ー' || c === ' ';
const KNUM = '〇一二三四五六七八九';
const kanjiNum = n => {
  n = Math.max(0, n | 0);
  if (n < 10) return KNUM[n];
  if (n < 20) return '十' + (n % 10 ? KNUM[n % 10] : '');
  if (n < 100) return KNUM[Math.floor(n / 10)] + '十' + (n % 10 ? KNUM[n % 10] : '');
  return String(n);
};
/* un-lagged local time / exit progress: clip windows use these so the ghost passes are masked exactly like the main pass */
const ltU = env => env.ltb;
const pOutU = env => { const c = env.cut; return c.outDur > 0 ? J.clamp((env.ltb - (c.dur - c.outDur)) / c.outDur) : 0; };
/* chromatic ghosts on big plates only while they fly in */
const gIn = env => env.lt < 0.6 && env.pOut <= 0;
/* text that sits on its own plate only takes holds that keep it in place */
const plateHold = env => !['still', 'jitter', 'breathe', 'glitchtick'].includes(env.cut.hold);
/* motion index that makes J.mainDraw start this item's entrance at local time t */
const miAt = (env, t) => Math.max(0, t) / Math.max(0.005, env.cut.stagger || 0.04);

/* ---- colour: only scheme colours ---- */
const PAL = sc => [sc.bg, sc.fg, sc.ink, sc.sub, sc.accent, sc.accent2, sc.dim].filter(Boolean);
const lightest = sc => PAL(sc).reduce((a, c) => (J.lum(c) > J.lum(a) ? c : a));
const darkest = sc => PAL(sc).reduce((a, c) => (J.lum(c) < J.lum(a) ? c : a));
const _onc = new Map();
const onCol = (sc, fill) => {
  const key = fill + sc.bg + sc.fg + sc.ink + sc.accent + sc.sub;
  let v = _onc.get(key);
  if (v) return v;
  let best = null, bv = 0;
  for (const c of [sc.bg, sc.fg, sc.ink, sc.accent, sc.sub]) { if (!c || c === fill) continue; const k = J.contrast(c, fill); if (k > bv) { bv = k; best = c; } }
  v = bv >= 2.4 ? best : (J.lum(fill) > 0.5 ? '#111111' : '#FFFFFF');
  if (_onc.size > 300) _onc.clear();
  _onc.set(key, v); return v;
};
/* first colour that reads against `against` (default: the background) */
const plateCol = (sc, pref, against, min = 1.6) => {
  const bgc = against || sc.bg;
  for (const c of pref) if (c && J.contrast(c, bgc) >= min) return c;
  return J.contrast(sc.fg, bgc) >= J.contrast(sc.bg, bgc) ? sc.fg : sc.bg;
};
/* light "paper" object: fill, edge needed?, text colour, accent that reads on it */
const card = sc => {
  const fill = lightest(sc);
  const edge = J.contrast(fill, sc.bg) < 1.4;
  const text = onCol(sc, fill);
  const acc = plateCol(sc, [sc.accent, sc.accent2, sc.ink], fill, 2);
  const faint = J.mix(fill, text, 0.22);
  return { fill, edge, text, acc, faint, line: J.mix(fill, text, 0.35) };
};
/* soft offset shadow under a paper object (main pass only) */
const shadowR = (env, x, y, w, h, r, a = 1, d) => {
  if (env.pass !== 'main' || a <= 0.01) return;
  const k = d != null ? d : U(env) * 0.012;
  env.rrect(x + k * 0.6, y + k, w, h, r, J.rgba(darkest(env.sc), J.lum(env.sc.bg) > 0.5 ? 0.22 : 0.5), a, false);
};
/* a paper plate: shadow + fill + optional hairline edge */
const paper = (env, x, y, w, h, r, fill, a = 1, edge = false, ghost = false) => {
  if (a <= 0.01 || w <= 0 || h <= 0) return;
  shadowR(env, x, y, w, h, r, a);
  env.rrect(x, y, w, h, r, fill, a, ghost, edge ? J.mix(env.sc.fg, fill, 0.35) : null, Math.max(1, U(env) * 0.0016));
};

/* ---- text splitting (balanced chunks at natural boundaries) ---- */
function segBounds(t) {
  const out = new Set(); let i = 0;
  try { for (const sg of (J.segments ? J.segments(t) : [t])) { i += [...sg].length; out.add(i); } } catch (e) { /* ignore */ }
  return out;
}
function split2(word, force) {
  const chars = [...word], n = chars.length, sb = segBounds(word);
  let best = Math.max(1, Math.floor(n / 2)), bs = -1e9;
  for (let c = 1; c < n; c++) {
    const a = chars[c - 1], b = chars[c];
    if (!force && ((c === 1 && !J.isKanji(a)) || (c === n - 1 && !J.isKanji(b)))) continue;
    let s = -Math.abs(c - n / 2) * 0.9;
    if (a === ' ' || a === '　' || (J.isPunct(a) && a !== 'ー')) s += 5;
    if (J.isHira(a) && !J.isHira(b) && !isBad(b)) s += 3;
    if (sb.has(c)) s += 2;
    if (isBad(b)) s -= 6;
    if (J.isKanji(a) && J.isKanji(b)) s -= 2;
    if (J.isKanji(a) && J.isHira(b)) s -= sb.has(c) ? 0.5 : 2.5;
    if (J.isHira(a) && J.isHira(b) && !sb.has(c)) s -= 2.5;
    if (s > bs) { bs = s; best = c; }
  }
  if (!force && bs < -1.5 && !hasLatin(word)) return [word];
  return [chars.slice(0, best).join('').trim(), chars.slice(best).join('').trim()].filter(Boolean);
}
function splitK(text, k, force) {
  const t = String(text || '').trim();
  if (!t) return [''];
  const latin = hasLatin(t);
  let words = latin ? t.split(/\s+/).filter(Boolean) : (J.chunkText ? J.chunkText(t) : [t]).map(w => w.trim()).filter(Boolean);
  if (!words.length) words = [t];
  k = Math.max(1, Math.min(k, J.glyphCount(t)));
  const hard = new Set();
  for (let guard = 0; words.length < k && guard < 16; guard++) {
    let bi = -1, bl = 1;
    words.forEach((w, i) => { const l = J.glyphCount(w); if (l > bl && !hard.has(w)) { bl = l; bi = i; } });
    if (bi < 0) break;
    let parts = latin ? [words[bi]] : split2(words[bi]);
    if (parts.length < 2 && force && words.length < force && !latin) parts = split2(words[bi], true);
    if (parts.length < 2) { hard.add(words[bi]); continue; }
    words.splice(bi, 1, ...parts);
  }
  if (k <= 1) return [words.join(latin ? ' ' : '')];
  if (words.length <= k) return words;
  const part = ws => {
    const lens = ws.map(w => J.glyphCount(w) + 0.5);
    const pre = [0]; lens.forEach(l => pre.push(pre[pre.length - 1] + l));
    const n = ws.length, tgt = pre[n] / k;
    let best = null, bestS = Infinity, guard = 0;
    const rec = (start, g, cuts) => {
      if (++guard > 5000) return;
      if (g === k - 1) {
        let s = 0, prev = 0;
        for (const c of [...cuts, n]) { const d = pre[c] - pre[prev] - tgt; s += d * d; prev = c; }
        if (s < bestS) { bestS = s; best = [...cuts, n]; }
        return;
      }
      for (let c = start + 1; c <= n - (k - 1 - g); c++) rec(c, g + 1, [...cuts, c]);
    };
    rec(0, 0, []);
    if (!best) return ws.map(w => [w]);
    const out = []; let prev = 0;
    for (const c of best) { out.push(ws.slice(prev, c)); prev = c; }
    return out;
  };
  let groups = part(words);
  for (let it = 0; it < 3; it++) {
    const gl = groups.map(g => g.reduce((a, w) => a + J.glyphCount(w), 0));
    const mx = Math.max(...gl), mn = Math.min(...gl);
    if (mx <= mn * 1.7 + 1) break;
    const g = groups[gl.indexOf(mx)];
    let bw = null; g.forEach(w => { if (!hard.has(w) && J.glyphCount(w) >= 3 && (!bw || J.glyphCount(w) > J.glyphCount(bw))) bw = w; });
    if (!bw) break;
    const parts = latin ? [bw] : split2(bw);
    if (parts.length < 2) { hard.add(bw); continue; }
    const wi = words.indexOf(bw); words.splice(wi, 1, ...parts);
    groups = part(words);
  }
  return groups.map(g => g.join(latin ? ' ' : ''));
}
/* single glyphs, with small kana / punctuation / ー kept on the preceding glyph */
const charUnits = text => {
  const out = [];
  for (const ch of strip(text)) { if (out.length && isBad(ch)) out[out.length - 1] += ch; else out.push(ch); }
  return out;
};
const brk = (text, maxPer) => {
  const t = String(text || '').trim(), n = J.glyphCount(t);
  if (n <= maxPer) return t;
  return splitK(t, Math.ceil(n / maxPer)).join('\n');
};
/* per-layout memo (dropped when font metrics are reset after font loading) */
const MEMO = new Map(), SENT = '\u0001layoutsC';
function memo(key, fn) {
  const mm = J.metrics && J.metrics.m;
  if (mm && !mm.has(SENT)) { MEMO.clear(); mm.set(SENT, 1); }
  let v = MEMO.get(key);
  if (v === undefined) { v = fn(); if (MEMO.size > 600) MEMO.clear(); MEMO.set(key, v); }
  return v;
}
/* best line break + size for a text block that must fit aw × ah */
function fitBlock(text, font, aw, ah, o = {}, maxLines = 4) {
  const t = String(text || '').trim();
  const key = ['fb', t, font, aw | 0, ah | 0, o.lead || 0, o.track || 0, o.vertical ? 1 : 0, o.sx || 1, maxLines].join('|');
  return memo(key, () => {
    const n = Math.max(1, J.glyphCount(t));
    let best = null; const seen = new Set();
    for (let L = 1; L <= Math.min(maxLines, n); L++) {
      const s = L === 1 ? t : brk(t, Math.ceil(n / L));
      if (seen.has(s)) continue; seen.add(s);
      const lines = s.split('\n').length;
      if (lines > maxLines) continue;
      const size = J.fitSize(s, font, aw, ah, o);
      const lone = lines > 1 && n > 2 && s.split('\n').some(l => J.glyphCount(l) < 2);
      const score = size * (1 - 0.06 * (lines - 1)) * (lone ? 0.8 : 1);
      if (!best || score > best.score) best = { text: s, size, lines, score };
    }
    return best || { text: t, size: J.fitSize(t, font, aw, ah, o), lines: 1, score: 0 };
  });
}
const rowW = (text, font, size) => { let w = 0; for (const ch of text) w += J.metrics.adv(font, ch) * size; return w; };
/* one-call text row for dense secondary copy (main pass only); sp = extra px after each glyph */
function fastRow(env, text, font, size, x, y, sp, color, alpha, align = 'left') {
  if (env.pass !== 'main' || alpha <= 0.01 || !text) return;
  const ctx = env.ctx;
  if (!('letterSpacing' in ctx)) { env.draw({ text, font, size, x, y, align, track: sp / size, color, alpha, ghost: false }); return; }
  ctx.save();
  ctx.font = J.fontCSS(font, size); ctx.letterSpacing = sp.toFixed(2) + 'px';
  ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.fillStyle = color; ctx.globalAlpha = alpha;
  ctx.fillText(text, x, y);
  ctx.restore();
}
/* justified rows of real body copy (main pass only) */
function bodyRows(env, src, font, fs, x, y, w, rows, lh, color, alpha, seed, reveal = 1) {
  if (env.pass !== 'main' || alpha <= 0.01 || rows <= 0 || w < fs * 2) return;
  const chars = [...src]; if (!chars.length) return;
  const adv = J.metrics.adv(font, 'あ') || 1;
  const cpr = Math.max(2, Math.floor(w / (fs * adv * 1.04)));
  let off = (seed | 0) % chars.length;
  for (let r = 0; r < rows && r < 80; r++) {
    const vis = J.clamp(reveal * rows * 1.2 - r);
    if (vis <= 0) break;
    const last = r === rows - 1 || J.r(seed, r, 5) < 0.14;
    const m = last ? Math.max(2, Math.floor(cpr * J.rr(0.3, 0.8, seed, r, 6))) : cpr;
    let row = ''; for (let j = 0; j < m; j++) row += chars[(off + j) % chars.length];
    off += m;
    const sp = last ? fs * 0.04 : (w - rowW(row, font, fs)) / Math.max(1, m - 1);
    fastRow(env, row, font, fs, x, y + r * lh, sp, color, alpha * vis);
  }
}
/* vertical columns of real body copy, right → left (main pass only) */
function vbody(env, src, font, fs, xR, y, h, cols, pitch, color, alpha, seed, reveal = 1) {
  if (env.pass !== 'main' || alpha <= 0.01 || cols <= 0) return;
  const chars = [...strip(src)].filter(c => !J.isLatin(c)); if (!chars.length) return;
  const per = Math.max(2, Math.floor(h / (fs * 1.02)));
  cols = Math.min(cols, Math.max(1, Math.floor(260 / per)));
  let off = (seed | 0) % chars.length;
  for (let c = 0; c < cols; c++) {
    const vis = J.clamp(reveal * cols * 1.2 - c); if (vis <= 0) break;
    const last = c === cols - 1 || J.r(seed, c, 5) < 0.14;
    const m = last ? Math.max(2, Math.floor(per * J.rr(0.3, 0.8, seed, c, 6))) : per;
    let t = ''; for (let j = 0; j < m; j++) t += chars[(off + j) % chars.length];
    off += m;
    env.draw({ text: t, font, size: fs, vertical: true, align: 'left', x: xR - (c + 0.5) * pitch, y: y + fs * 0.5 - fs * 0.5, color, alpha: alpha * vis, ghost: false });
  }
}
/* greeked copy: dashed lines that read as rows / columns of small glyphs (horizontal, or vertical right→left) */
function greek(env, x, y, w, h, lh, col, a, seed, vertical = false, reveal = 1) {
  if (env.pass !== 'main' || a <= 0.01) return;
  const ctx = env.ctx; ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = col;
  const g = lh / 1.45;                        // glyph size
  ctx.lineWidth = Math.max(1, g * 0.72); ctx.setLineDash([g * 0.78, g * 0.24]);
  const n = Math.min(160, Math.floor((vertical ? w : h) / lh));
  const span = vertical ? h : w;
  ctx.beginPath();
  for (let r = 0; r < n; r++) {
    if (r >= n * reveal * 1.1) break;
    const endP = J.r(seed, r, 3) < 0.12;
    const ind = r === 0 || J.r(seed, r - 1, 3) < 0.12 ? g * 1.02 : 0;
    const len = (endP ? span * J.rr(0.2, 0.75, seed, r, 4) : span) - ind;
    if (len <= g) continue;
    if (vertical) { const xx = x + w - (r + 0.5) * lh; ctx.moveTo(xx, y + ind); ctx.lineTo(xx, y + ind + len); }
    else { const yy = y + (r + 0.5) * lh; ctx.moveTo(x + ind, yy); ctx.lineTo(x + ind + len, yy); }
  }
  ctx.stroke(); ctx.setLineDash([]); ctx.restore();
}
/* halftone "photo": dot screen whose dot size follows a simple silhouette (main pass only) */
function halftone(env, x, y, w, h, col, bgc, a, seed, kind = 0) {
  if (env.pass !== 'main' || a <= 0.01 || w < 4 || h < 4) return;
  const ctx = env.ctx;
  ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = bgc; ctx.fillRect(x, y, w, h);
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  const d = Math.max(4, Math.min(w, h) / 22);
  const cols = Math.min(60, Math.ceil(w / d)), rows = Math.min(60, Math.ceil(h / d));
  const hx = 0.35 + 0.3 * J.r(seed, 1), hy = 0.36;
  ctx.fillStyle = col; ctx.beginPath();
  for (let j = 0; j <= rows; j++) for (let i = 0; i <= cols; i++) {
    const px = (i + (j % 2) * 0.5) / cols, py = j / rows;
    let v;
    if (kind === 0) {                       // head + shoulders
      const dh = Math.hypot((px - hx) * w / h, py - hy) / 0.2;
      const ds = Math.hypot((px - hx) * w / h * 0.55, (py - 1.05) / 0.9) / 0.36;
      v = Math.max(0, 1 - Math.min(dh, ds) * 0.85) * 0.9 + 0.12 * (1 - py);
    } else {                                // horizon / landscape
      v = py > 0.62 ? 0.75 - (py - 0.62) : 0.18 + 0.5 * Math.max(0, 1 - Math.hypot(px - hx, py - 0.4) / 0.18);
    }
    const r = d * 0.5 * Math.sqrt(J.clamp(v));
    if (r < 0.4) continue;
    const cx = x + px * w, cy = y + py * h;
    ctx.moveTo(cx + r, cy); ctx.arc(cx, cy, r, 0, J.TAU);
  }
  ctx.fill(); ctx.restore();
}
/* draw several polylines progressively */
function segsPartial(env, segs, e, col, lw, a = 1, ghost = false) {
  if (e <= 0) return;
  const lens = segs.map(s => { let L = 0; for (let i = 1; i < s.length; i++) L += Math.hypot(s[i][0] - s[i - 1][0], s[i][1] - s[i - 1][1]); return L; });
  const tot = lens.reduce((x, y) => x + y, 0) || 1;
  let rem = tot * J.clamp(e);
  for (let i = 0; i < segs.length && rem > 0; i++) {
    const k = Math.min(1, rem / Math.max(1e-6, lens[i]));
    env.polyPartial(segs[i], k, col, lw, a, ghost);
    rem -= lens[i];
  }
}
const closeLoop = pts => pts.concat([pts[0], pts[1]]);
/* hand-drawn ellipse (pen): points with slight wobble and overshoot */
function penEllipse(cx, cy, rx, ry, seed, turns = 1.12, a0 = -2.2) {
  const pts = [], M = 40;
  for (let i = 0; i <= M; i++) {
    const u = i / M, a = a0 + u * J.TAU * turns, k = 1 + J.rs(seed, i >> 2, 7) * 0.05 + u * 0.06;
    pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
  }
  return pts;
}
/* rounded-rect path */
const rrPath = (ctx, x, y, w, h, r) => {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
};
/* glyph centres of a laid-out item (design space, no rotation) */
const glyphPts = it => {
  const lay = J.layoutText(it), sx = it.sx || 1, sy = it.sy || 1, out = [];
  for (const g of lay) { if (g.ch === ' ' || g.ch === '　') continue; out.push({ ch: g.ch, x: it.x + (g.x + g.vx) * sx, y: it.y + (g.y + g.vy) * sy, w: g.w * sx, h: g.h * sy, li: g.li, i: out.length }); }
  return out;
};
/* anchor offset of an item with align left/right: glyph x in layoutText is already relative, so pts work for all aligns */
/* text placed along a circle (one item, main pass only) */
function arcText(env, text, font, size, cx, cy, R, midDeg, color, alpha, track = 0.1, inward = false) {
  if (!text || alpha <= 0.01) return;
  const it = { text, font, size, x: 0, y: 0, track, ghost: false, color, alpha };
  const lay = J.layoutText(it); it._lay = lay;
  const total = lay.W;
  it.charFn = (i, g) => {
    const s = (g.x + total / 2) - total / 2;              // arc length from the middle
    const ang = midDeg * J.DEG + (inward ? -s : s) / R;
    const x = cx + Math.cos(ang) * R, y = cy + Math.sin(ang) * R;
    return { dx: x - g.x, dy: y - g.y, rot: ang / J.DEG + (inward ? -90 : 90) };
  };
  env.draw(it);
}
/* dotted leader (main pass only) */
function leader(env, x0, x1, y, col, a, step, r) {
  if (env.pass !== 'main' || a <= 0.01 || x1 - x0 < step) return;
  const ctx = env.ctx; ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = col; ctx.beginPath();
  const n = Math.min(200, Math.floor((x1 - x0) / step));
  for (let i = 0; i <= n; i++) { const x = x0 + (x1 - x0) * (n ? i / n : 0); ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, J.TAU); }
  ctx.fill(); ctx.restore();
}
function leaderV(env, x, y0, y1, col, a, step, r) {
  if (env.pass !== 'main' || a <= 0.01 || y1 - y0 < step) return;
  const ctx = env.ctx; ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = col; ctx.beginPath();
  const n = Math.min(200, Math.floor((y1 - y0) / step));
  for (let i = 0; i <= n; i++) { const y = y0 + (y1 - y0) * (n ? i / n : 0); ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, J.TAU); }
  ctx.fill(); ctx.restore();
}
/* diagonal hazard / clapper stripes inside a rect (main pass only) */
function stripes(env, x, y, w, h, c1, c2, sw, ang = 45, a = 1, off = 0) {
  if (env.pass !== 'main' || a <= 0.01 || w <= 0 || h <= 0) return;
  const ctx = env.ctx; ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.globalAlpha = a;
  if (c1) { ctx.fillStyle = c1; ctx.fillRect(x, y, w, h); }
  ctx.fillStyle = c2;
  const t = Math.tan(ang * J.DEG), n = Math.min(160, Math.ceil((w + h * Math.abs(t)) / (sw * 2)) + 2);
  const o = ((off % (sw * 2)) + sw * 2) % (sw * 2);
  ctx.beginPath();
  for (let i = -1; i < n; i++) {
    const x0 = x - h * Math.abs(t) + i * sw * 2 + o;
    ctx.moveTo(x0, y + h); ctx.lineTo(x0 + sw, y + h); ctx.lineTo(x0 + sw + h * t, y); ctx.lineTo(x0 + h * t, y); ctx.closePath();
  }
  ctx.fill(); ctx.restore();
}
/* crop marks (トンボ) around a trim box */
function tombo(env, x0, y0, x1, y1, g, L, col, lw, a) {
  if (a <= 0.01) return;
  [[x0, y0, -1, -1], [x1, y0, 1, -1], [x0, y1, -1, 1], [x1, y1, 1, 1]].forEach(([x, y, dx, dy]) => {
    env.line([[x + dx * g, y], [x + dx * (g + L), y]], col, lw, a, false);
    env.line([[x + dx * g * 1.8, y + dy * g * 0.8], [x + dx * (g + L), y + dy * g * 0.8]], col, lw, a, false);
    env.line([[x, y + dy * g], [x, y + dy * (g + L)]], col, lw, a, false);
    env.line([[x + dx * g * 0.8, y + dy * g * 1.8], [x + dx * g * 0.8, y + dy * (g + L)]], col, lw, a, false);
  });
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  [[cx, y0 - g - L / 2, 0], [cx, y1 + g + L / 2, 0], [x0 - g - L / 2, cy, 1], [x1 + g + L / 2, cy, 1]].forEach(([x, y, v]) => {
    if (v) { env.line([[x - L / 2, y], [x + L / 2, y]], col, lw, a, false); env.line([[x, y - L * 0.9], [x, y + L * 0.9]], col, lw, a, false); }
    else { env.line([[x - L * 0.9, y], [x + L * 0.9, y]], col, lw, a, false); env.line([[x, y - L / 2], [x, y + L / 2]], col, lw, a, false); }
  });
}

/* ======================================================================
   1  magazine — 見開き
   ====================================================================== */
reg('magazine', {
  name: '見開き', tags: ['editorial', 'calm', 'emotional'], w: 0.9, ae: 'gloss', treat: 'safe', fits: n => n <= 18,
  enterBias: { blur: 1.3, wipe: 1.3, type: 1.2, cut: 1.2 },
  plan: (rng, cut, st) => ({
    font: rng.pick(fontsOf(st, ['display', 'serif', 'serif'])), qf: rng.pick(fontsOf(st, ['serif'])),
    variant: rng.pick(['headline', 'vertical', 'plate']), folio: 2 * rng.int(6, 90),
    kicker: rng.pick(['FEATURE', 'ESSAY', 'INTERVIEW', 'COLUMN', 'STORY']), seed: rng.int(1, 9999), img: rng.pick(['sun', 'bars', 'arc']),
  }),
  render(env) {
    const { W, H, sc, ctx } = env, p = env.cut.params, u = U(env), port = isPort(env);
    const C = card(sc);
    let pw, ph;
    if (!port) { ph = Math.min(H * 0.84, W * 0.44 / 0.72); pw = ph * 0.72; }
    else { pw = W * 0.88; ph = Math.min(H * 0.445, pw * 1.02); }
    const cx = W / 2, cy = H / 2;
    const vert = p.variant === 'vertical' && !hasLatin(env.cut.text);
    // page A carries the lyric: left page (right page for vertical setting), top page in portrait
    const A = port ? { x: cx - pw / 2, y: cy - ph } : vert ? { x: cx, y: cy - ph / 2 } : { x: cx - pw, y: cy - ph / 2 };
    const sideB = port ? 1 : vert ? -1 : 1;                 // direction from the gutter towards page B
    const out = 1 - J.clamp((env.pOut - 0.72) / 0.28);
    const aA = tin(env, 0, 0.28, E.outCubic) * out;
    const uf = E.inOutCubic(J.clamp((env.lt - 0.06) / 0.5));
    const fold = E.inOutCubic(env.pOut);
    const q = uf * (1 - 2 * fold);                          // page B width factor (negative = folded over page A)
    const ls = J.clamp(pw * 0.03, 11, 26), mx = pw * 0.1, my = ph * 0.075;
    const lw = Math.max(1, u * 0.0014);
    // --- pages
    if (aA > 0.01) {
      const sAx = port ? pw : pw * (1 + Math.max(0, q));
      const sx0 = port ? A.x : (sideB > 0 ? A.x : A.x - pw * Math.max(0, q));
      const sh0 = port ? ph * (1 + Math.max(0, q)) : ph;
      shadowR(env, sx0, A.y, sAx, sh0, 0, aA, u * 0.016);
      env.rect(A.x, A.y, pw, ph, C.fill, aA, false);
      if (C.edge) env.line([[A.x, A.y], [A.x + pw, A.y], [A.x + pw, A.y + ph], [A.x, A.y + ph], [A.x, A.y]], C.line, lw, aA * 0.7, false);
    }
    // --- page B (unfolds from the gutter)
    const gx = port ? cx : cx, gy = cy;
    if (q > 0.002 && aA > 0.01) {
      ctx.save();
      if (port) { ctx.translate(A.x, gy); ctx.scale(1, q); }
      else { ctx.translate(gx, A.y); ctx.scale(q * sideB, 1); }
      const bw = pw, bh = ph;               // local page B: x 0..bw (away from gutter), y 0..bh
      env.rect(0, 0, bw, bh, C.fill, aA, false);
      if (C.edge) env.line([[0, 0], [bw, 0], [bw, bh], [0, bh]], C.line, lw, aA * 0.7, false);
      if (!port && sideB < 0) { ctx.scale(-1, 1); ctx.translate(-bw, 0); }    // un-mirror content on the left page
      const ca = aA * J.clamp((q - 0.3) / 0.5);
      if (ca > 0.01) {
        const bx = mx, by = my, iw = bw - mx * 2, ih = bh - my * 2;
        const imgH = ih * (p.variant === 'plate' ? 0.3 : 0.46);
        const imgC = plateCol(sc, [p.img === 'sun' ? darkest(sc) : sc.accent, sc.ink, sc.fg], C.fill, 1.8);
        const iy = p.variant === 'plate' ? by + ih - imgH : by;
        env.rect(bx, iy, iw, imgH, imgC, ca, false);
        const oc = plateCol(sc, [sc.accent, sc.accent2, C.fill], imgC, 1.6);
        if (p.img === 'sun') env.circle(bx + iw * 0.62, iy + imgH * 0.52, Math.min(iw, imgH) * 0.3, oc, null, 0, ca, false);
        else if (p.img === 'bars') for (let i = 0; i < 5; i++) env.rect(bx + iw * (0.12 + i * 0.16), iy + imgH * (0.25 + 0.5 * J.r(p.seed, i, 9)), iw * 0.08, imgH * 0.75 * (1 - 0.5 * J.r(p.seed, i, 9)), oc, ca, false);
        else env.arc(bx + iw * 0.5, iy + imgH * 1.02, imgH * 0.7, 180, 360, oc, Math.max(3, imgH * 0.09), ca, false);
        const fs = J.clamp(pw * 0.022, 9, 20), lh = fs * 1.75;
        const src = flat(env.cut.lineText || env.cut.text) + (hasLatin(env.cut.text) ? '. ' : '。');
        const colW = (iw - fs * 1.5) / 2;
        const ty = p.variant === 'plate' ? by + ls * 2 : iy + imgH + fs * 2;
        const tAvail = p.variant === 'plate' ? ih - imgH - ls * 3 : ih - imgH - fs * 2;
        const qc = deckCopy(env);
        if (p.variant === 'plate' && qc) {
          const qt = '「' + qc + '」';
          const qb = fitBlock(qt, p.qf, iw, tAvail * 0.42, { lead: 1.3 }, 3);
          const qs = Math.min(qb.size, pw * 0.07);
          env.draw({ text: qb.text, font: p.qf, size: qs, lead: 1.3, align: 'left', x: bx, y: ty + qs * qb.lines * 0.65, color: C.acc, alpha: ca, ghost: false });
          const r0 = ty + qs * (qb.lines * 1.3 + 0.8);
          const rows = Math.max(0, Math.floor((by + ih - imgH - fs - r0) / lh));
          bodyRows(env, src, bodyF(env), fs, bx, r0, colW, rows, lh, C.text, ca * 0.55, p.seed, uf);
          bodyRows(env, src, bodyF(env), fs, bx + colW + fs * 1.5, r0, colW, rows, lh, C.text, ca * 0.55, p.seed + 77, uf);
        } else {
          const rows = Math.max(0, Math.floor((p.variant === 'plate' ? ih - imgH - fs * 2 : tAvail) / lh));
          bodyRows(env, src, bodyF(env), fs, bx, ty, colW, rows, lh, C.text, ca * 0.55, p.seed, uf);
          bodyRows(env, src, bodyF(env), fs, bx + colW + fs * 1.5, ty, colW, rows, lh, C.text, ca * 0.55, p.seed + 77, uf);
        }
        env.draw({ text: pad3(p.folio + 1), font: monoF(env), size: ls * 0.85, align: 'right', x: bw - mx * 0.5, y: bh - my * 0.45, color: C.text, alpha: ca * 0.8, ghost: false });
      }
      // shading while the page turns
      if (q < 0.98) env.rect(0, 0, bw, bh, darkest(sc), aA * (1 - q) * 0.35, false);
      ctx.restore();
    }
    // gutter shade
    if (env.pass === 'main' && aA > 0.01) {
      const gw = pw * 0.07;
      ctx.save(); ctx.globalAlpha = aA * 0.5;
      const g = port ? ctx.createLinearGradient(0, gy - gw, 0, gy + gw) : ctx.createLinearGradient(gx - gw, 0, gx + gw, 0);
      g.addColorStop(0, J.rgba(C.text, 0)); g.addColorStop(0.5, J.rgba(C.text, 0.28)); g.addColorStop(1, J.rgba(C.text, 0));
      ctx.fillStyle = g;
      if (port) ctx.fillRect(A.x, gy - gw, pw, gw * 2); else ctx.fillRect(gx - gw, A.y, gw * 2, ph);
      ctx.restore();
    }
    // --- page A content
    const drawA = () => {
    const fa = tin(env, 0.12, 0.4, E.outCubic) * out;
    const ax = A.x + mx, ay = A.y + my, aw = pw - mx * 2, ah = ph - my * 2;
    let bb = null;
    const t0 = env.cut.text.trim();
    if (p.variant === 'plate') {
      const plate = plateCol(sc, [darkest(sc), sc.accent, sc.ink], C.fill, 2.2);
      const pe = E.inOutCubic(J.clamp(env.lt / 0.45)) * out;
      if (pe > 0) env.rect(A.x, A.y + ph * (1 - pe), pw, ph * pe, plate, aA, false);
      const tc = onCol(sc, plate);
      const big = strip(t0)[0] || '';
      env.draw({ text: big, font: p.font, size: ph * 0.7, x: A.x + pw * 0.62, y: A.y + ph * 0.36, color: tc, alpha: 0.07 * pe, ghost: false });
      env.draw({ text: p.kicker + '  —  No.' + lineNo(env), font: monoF(env), size: ls, track: 0.2, align: 'left', x: ax, y: ay + ls * 0.5, color: tc, alpha: fa, ghost: false });
      const fb = fitBlock(t0, p.font, aw, ah * 0.5, { lead: 1.12, track: 0.02 }, 4);
      const size = Math.min(fb.size, u * 0.15);
      const m = meas(fb.text, p.font, size, { lead: 1.12, track: 0.02 });
      bb = J.mainDraw(env, { text: fb.text, font: p.font, size, x: ax, y: A.y + ph - my - ls * 2 - m.h / 2, align: 'left', lead: 1.12, track: 0.02, color: tc, noHold: plateHold(env) });
      env.draw({ text: pad3(p.folio), font: monoF(env), size: ls * 0.85, align: 'left', x: A.x + mx * 0.5, y: A.y + ph - my * 0.45, color: tc, alpha: fa * 0.8, ghost: false });
      return bb || box(ax, A.y + ph * 0.5, ax + aw, A.y + ph - my);
    }
    if (vert) {
      const fb = fitBlock(strip(t0), p.font, aw * (port ? 0.6 : 0.55), ah * 0.86, { vertical: true, lead: 1.25, track: 0.04 }, 3);
      const size = Math.min(fb.size, u * 0.15);
      const m = meas(fb.text, p.font, size, { vertical: true, lead: 1.25, track: 0.04 });
      const x = ax + aw - m.w / 2, top = ay + ls * 2.2;
      bb = J.mainDraw(env, { text: fb.text, font: p.font, size, x, y: top, vertical: true, align: 'left', lead: 1.25, track: 0.04, color: C.text, noHold: plateHold(env) });
      env.draw({ text: p.kicker, font: monoF(env), size: ls, track: 0.2, align: 'right', x: ax + aw, y: ay + ls * 0.5, color: C.acc, alpha: fa, ghost: false });
      const gw2 = aw - m.w - size * 0.8, gh = ah * 0.55;
      const vfs = J.clamp(pw * 0.024, 9, 20);
      if (gw2 > ls * 3) vbody(env, env.cut.lineText || t0, bodyF(env), vfs, ax + gw2, ay + ah - gh, gh, Math.floor(gw2 / (vfs * 1.7)), vfs * 1.7, C.text, fa * 0.55, p.seed, fa);
      env.line([[ax, ay + ah - gh - ls], [ax + (gw2) * fa, ay + ah - gh - ls]], C.acc, Math.max(2, lw * 2), fa, false);
      env.draw({ text: pad3(p.folio), font: monoF(env), size: ls * 0.85, align: 'right', x: A.x + pw - mx * 0.5, y: A.y + ph - my * 0.45, color: C.text, alpha: fa * 0.8, ghost: false });
      return bb || box(x - m.w / 2, top, x + m.w / 2, top + m.h);
    }
    // headline
    env.rect(ax, ay + ls * 0.1, ls * 0.8, ls * 0.8, C.acc, fa, false);
    env.draw({ text: p.kicker + '  No.' + lineNo(env), font: monoF(env), size: ls, track: 0.2, align: 'left', x: ax + ls * 1.4, y: ay + ls * 0.5, color: C.text, alpha: fa, ghost: false });
    const fb = fitBlock(t0, p.font, aw, ah * 0.52, { lead: 1.1, track: 0.01 }, 4);
    const size = Math.min(fb.size, u * 0.15);
    const m = meas(fb.text, p.font, size, { lead: 1.1, track: 0.01 });
    const hy = ay + ls * 2.4 + m.h / 2;
    bb = J.mainDraw(env, { text: fb.text, font: p.font, size, x: ax, y: hy, align: 'left', lead: 1.1, track: 0.01, color: C.text, noHold: plateHold(env) });
    const ry = hy + m.h / 2 + size * 0.35;
    const re = tin(env, 0.15, 0.6, E.inOutCubic) * out;
    env.line([[ax, ry], [ax + aw * re, ry]], C.text, Math.max(2, lw * 2), 0.9 * aA, false);
    const deck = deckCopy(env) || metaLine(env);
    const ds = J.clamp(pw * 0.034, 11, 30);
    const dper = Math.max(4, Math.floor(aw / (ds * 1.05)));
    const dt = J.splitLines(deck, dper).split('\n').slice(0, 3).join('\n');
    env.draw({ text: dt, font: serifF(env), size: ds, lead: 1.55, align: 'left', x: ax, y: ry + ds * 1.2 + (dt.split('\n').length - 1) * ds * 0.78, color: C.text, alpha: fa * 0.75, ghost: false });
    env.draw({ text: pad3(p.folio) + '   ' + (romajiOf(env) || 'JIZURA').slice(0, 18), font: monoF(env), size: ls * 0.85, track: 0.1, align: 'left', x: A.x + mx * 0.5, y: A.y + ph - my * 0.45, color: C.text, alpha: fa * 0.8, ghost: false });
    return bb || box(ax, hy - m.h / 2, ax + m.w, hy + m.h / 2);
    };
    const res = drawA();
    // exit: page B folds over page A (blank back of the page), then the closed book fades
    if (q < -0.002 && aA > 0.01) {
      const k = -q;
      ctx.save();
      if (port) { ctx.translate(A.x, gy); ctx.scale(1, -k); }
      else { ctx.translate(gx, A.y); ctx.scale(-k * sideB, 1); }
      env.rect(0, 0, pw, ph, C.fill, aA, false);
      if (C.edge) env.line([[0, 0], [pw, 0], [pw, ph], [0, ph]], C.line, lw, aA * 0.7, false);
      env.rect(0, 0, pw, ph, darkest(sc), aA * (1 - k) * 0.3, false);
      ctx.restore();
    }
    return res;
  },
});

/* ======================================================================
   2  headlineDeck — 見出しとリード
   ====================================================================== */
reg('headlineDeck', {
  name: '見出しとリード', tags: ['editorial', 'graphic', 'calm'], w: 1.1, ae: 'center', fits: n => n <= 22,
  enterBias: { wipe: 1.4, slice: 1.2, stretch: 1.2 },
  plan: (rng, cut, st) => ({
    font: rng.pick(fontsOf(st, ['display', 'display', 'serif'])), variant: portOf(cut) ? rng.pick(['top', 'bottom']) : rng.pick(['top', 'bottom', 'split']),
    kicker: rng.pick(['特集', 'FEATURE', 'COVER STORY', 'ESSAY', '連載', 'REPORT']), mark: rng.pick(['none', 'bar', 'none', 'dot']), dbl: rng.chance(0.5),
  }),
  render(env) {
    const { W, H, sc } = env, p = env.cut.params, u = U(env), port = isPort(env);
    const out = tout(env);
    const mx = W * (port ? 0.08 : 0.075), aw = W - mx * 2;
    const split = p.variant === 'split' && !port;
    const hw = split ? aw * 0.6 : aw;
    const t0 = env.cut.text.trim();
    const fb = fitBlock(t0, p.font, hw, H * (split ? 0.62 : 0.46), { lead: 1.02, track: -0.01 }, port ? 5 : 3);
    const size = Math.min(fb.size, u * (port ? 0.27 : 0.24));
    const m = meas(fb.text, p.font, size, { lead: 1.02, track: -0.01 });
    const ls = smallSize(env) * 1.1, ds = J.clamp(u * 0.032, 16, 44);
    const dc = deckCopy(env);
    const dw = split ? aw * 0.32 : Math.min(aw, port ? aw : aw * 0.62);
    const dper = Math.max(5, Math.floor(dw / (ds * (hasLatin(dc || '') ? 0.55 : 1.02))));
    const dlines = dc ? J.splitLines(dc, dper).split('\n').slice(0, 4) : [metaLine(env)];
    const dfont = dc ? serifF(env) : monoF(env), dsz = dc ? ds : ls;
    const deckH = dlines.length * ds * 1.6;
    const kickH = ls * 2.2;
    const lw = Math.max(2, u * 0.003);
    let top, hy, ry, dy;
    if (split) {
      top = H / 2 - m.h / 2; hy = H / 2; ry = null; dy = H / 2 - deckH / 2;
    } else if (p.variant === 'bottom') {
      const tot = deckH + ls * 1.6 + m.h + kickH;
      top = Math.max(H * 0.08, H * 0.9 - tot);
      dy = top; ry = top + deckH + ls * 0.6; hy = ry + ls + kickH + m.h / 2;
    } else {
      const tot = kickH + m.h + size * 0.3 + ls + deckH;
      top = Math.max(H * 0.07, (H - tot) / 2 - H * 0.03);
      hy = top + kickH + m.h / 2; ry = hy + m.h / 2 + size * 0.22; dy = ry + ls * 1.2;
    }
    // kicker
    const ka = tin(env, 0.05, 0.4) * out;
    const ky = hy - m.h / 2 - ls * 1.1;
    const kt = p.kicker + '  ' + lineNo(env);
    const km = meas(kt, monoF(env), ls, { track: 0.2 });
    if (ka > 0.01) {
      env.rect(mx, ky - ls * 0.8, (km.w + ls * 1.2) * ka, ls * 1.6, sc.accent, out, false);
      env.draw({ text: kt, font: monoF(env), size: ls, track: 0.2, align: 'left', x: mx + ls * 0.6, y: ky, color: onCol(sc, sc.accent), alpha: J.clamp(ka * 2 - 1), ghost: false });
    }
    // headline
    const hx = mx;
    const bb = J.mainDraw(env, { text: fb.text, font: p.font, size, x: hx, y: hy, align: 'left', lead: 1.02, track: -0.01, color: sc.fg });
    if (p.mark !== 'none' && bb) {
      const nL = fb.text.split('\n').length, lastW = rowW(fb.text.split('\n')[nL - 1], p.font, size);
      const e = tin(env, env.cut.inDur * 0.8, 0.45, E.inOutCubic) * out;
      const ly = hy + (nL - 1) / 2 * size * 1.02;
      if (p.mark === 'bar' && e > 0) env.rect(hx, ly + size * 0.5, lastW * e, Math.max(4, size * 0.07), sc.accent, 1, false);
      if (p.mark === 'dot' && e > 0) env.circle(hx + lastW + size * 0.25, ly + size * 0.3, size * 0.09 * E.outBack(e, 2), sc.accent, null, 0, 1, false);
    }
    // rules
    const re = tin(env, 0.1, 0.7, E.inOutCubic) * out;
    if (split) {
      const vx = mx + aw * 0.64;
      env.line([[vx, H / 2 - Math.max(m.h, deckH) / 2 * re], [vx, H / 2 + Math.max(m.h, deckH) / 2 * re]], sc.fg, lw * 0.6, 0.8, false);
      if (p.dbl) env.line([[mx, H * 0.1], [mx + aw * re, H * 0.1]], sc.fg, lw, 1, false);
    } else {
      env.line([[mx, ry], [mx + aw * re, ry]], sc.fg, lw, 1, false);
      if (p.dbl) env.line([[mx, ry + lw * 2.5], [mx + aw * re, ry + lw * 2.5]], sc.fg, lw * 0.4, 0.8, false);
    }
    // deck
    const dx = split ? mx + aw * 0.68 : mx;
    dlines.forEach((l, i) => {
      const a = tin(env, env.cut.inDur * 0.6 + 0.08 * i, 0.4, E.outCubic) * out;
      if (a <= 0.01) return;
      env.draw({ text: l, font: dfont, size: dsz, track: dc ? 0 : 0.12, align: 'left', x: dx, y: dy + ds * 0.8 + i * ds * 1.6 + (1 - a) * ds * 0.5, color: i === 0 && dc ? sc.fg : sc.sub, alpha: a, ghost: false });
    });
    const by = split ? dy + deckH + ls * 1.5 : (p.variant === 'bottom' ? top - ls * 1.4 : dy + deckH + ls * 0.8);
    const ba = tin(env, env.cut.inDur + 0.15, 0.4, E.outCubic) * out;
    if (dc && by < H * 0.95 && by > H * 0.04) env.draw({ text: '— ' + J.fmtTime(env.cut.start) + '  /  ' + (romajiOf(env) || 'No.' + lineNo(env)).slice(0, 22), font: monoF(env), size: ls * 0.85, track: 0.12, align: split ? 'left' : 'right', x: split ? dx : mx + aw, y: by, color: sc.sub, alpha: ba, ghost: false });
    return bb || box(hx, hy - m.h / 2, hx + m.w, hy + m.h / 2);
  },
});

/* ======================================================================
   3  contents — 目次
   ====================================================================== */
reg('contents', {
  name: '目次', tags: ['editorial', 'calm'], w: 0.9, ae: 'stack', fits: n => n >= 2 && n <= 20,
  enterBias: { wipe: 1.5, type: 1.3, slice: 1.2 },
  plan: (rng, cut, st) => {
    const n = cut.n, port = portOf(cut);
    const k = n <= 4 ? 1 : n <= 9 ? 2 : n <= 14 ? 3 : 4;
    return {
      font: rng.pick(fontsOf(st, ['display', 'serif'])), chunks: splitK(cut.text, k, k),
      variant: port || hasLatin(cut.text) ? 'rows' : rng.pick(['rows', 'rows', 'tate']),
      page0: rng.int(3, 40), step: rng.int(6, 22), mark: rng.pick(['bar', 'tri', 'dot']), ctx: rng.chance(0.75),
    };
  },
  render(env) {
    const { W, H, sc } = env, p = env.cut.params, u = U(env), port = isPort(env);
    let chunks = (p.chunks && p.chunks.length ? p.chunks : [env.cut.text.trim()]).filter(Boolean);
    const k = chunks.length, out = tout(env);
    const ls = smallSize(env), lw = Math.max(1.2, u * 0.0016);
    const cur = Math.min(k - 1, Math.floor(J.clamp(env.lt / Math.max(0.3, env.cut.dur * 0.92)) * k));
    const pages = chunks.map((c, i) => pad3(p.page0 + i * p.step));
    const ctxRows = p.ctx ? [['序', '000'], ['終', pad3(p.page0 + k * p.step + 14)]] : null;
    let bb = null;
    if (p.variant === 'tate') {
      // vertical table of contents: columns right → left, leaders run down to the page numbers
      const cols = k + (ctxRows ? 2 : 0);
      const colW = Math.min(W * 0.86 / (cols + 1.0), u * 0.22);
      const hTop = H * 0.14, hBot = H * 0.86;
      const x0 = W / 2 + (cols + 1.2) * colW / 2;
      const size = Math.min(colW * 0.7, ...chunks.map(c => (hBot - hTop) * 0.62 / Math.max(1, J.glyphCount(c)) / 1.03));
      // title column
      const ta = tin(env, 0, 0.4, E.outCubic) * out;
      env.draw({ text: '目次', font: serifF(env), size: colW * 0.5, vertical: true, align: 'left', track: 0.6, x: x0 - colW * 0.45, y: hTop, color: sc.fg, alpha: ta, ghost: false });
      const le = tin(env, 0.05, 0.6, E.inOutCubic) * out;
      env.line([[x0 - colW * 1.05, hTop], [x0 - colW * 1.05, hTop + (hBot - hTop) * le]], sc.fg, lw, 1, false);
      let ci = 0;
      const colX = c => x0 - colW * 1.2 - (c + 0.5) * colW;
      const drawCtx = (lab, pg, c, d) => {
        const a = tin(env, d, 0.4, E.outCubic) * out * 0.5;
        env.draw({ text: lab, font: serifF(env), size: size * 0.6, vertical: true, align: 'left', x: colX(c), y: hTop, color: sc.sub, alpha: a, ghost: false });
        leaderV(env, colX(c), hTop + size * 1.2, hBot - ls * 3.5, sc.sub, a, ls * 0.6, Math.max(1, ls * 0.07));
        env.draw({ text: pg, font: monoF(env), size: ls * 0.9, vertical: true, align: 'left', x: colX(c), y: hBot - ls * 2.7, color: sc.sub, alpha: a, ghost: false });
      };
      if (ctxRows) { drawCtx(ctxRows[0][0], ctxRows[0][1], ci++, 0.05); }
      chunks.forEach((c, i) => {
        const x = colX(ci++);
        const txt = strip(c);
        const isCur = i === cur;
        const it = { text: txt, font: p.font, size, x, y: hTop, vertical: true, align: 'left', track: 0.03, color: sc.fg, mi: i * 3 };
        const r = J.mainDraw(env, it);
        bb = J.unionBB(bb, r);
        const endY = hTop + J.glyphCount(txt) * size * 1.03;
        const a = tin(env, 0.15 + i * 0.1, 0.5, E.outCubic) * out;
        const ly = endY + size * 0.4, py = hBot - ls * 2.7;
        leaderV(env, x, ly, J.lerp(ly, py - ls * 0.9, a), isCur ? sc.accent : sc.sub, a, ls * 0.6, Math.max(1.2, ls * 0.08));
        env.draw({ text: pages[i], font: monoF(env), size: ls, vertical: true, align: 'left', x, y: py, color: isCur ? sc.accent : sc.fg, alpha: a, ghost: false });
        if (isCur) {
          const ma = J.clamp(a * 2 - 0.5);
          env.rect(x - colW * 0.5, hTop - ls * 1.6, colW, ls * 0.35, sc.accent, ma, false);
        }
      });
      if (ctxRows) drawCtx(ctxRows[1][0], ctxRows[1][1], ci++, 0.1 + k * 0.1);
      return bb || box(colX(cols - 1) - colW / 2, hTop, x0, hBot);
    }
    // horizontal rows
    const nRows = k + (ctxRows ? 2 : 0);
    const bw = W * (port ? 0.84 : 0.66), bx = (W - bw) / 2;
    const numW = ls * 3.4, pgW = ls * 5;
    const tw = bw - numW - pgW - ls * 2;
    const cxH = ls * 2.6;
    const rowH0 = Math.min((H * 0.66 - (ctxRows ? cxH * 2 : 0)) / k, u * 0.26);
    const size = Math.min(rowH0 * 0.64, ...chunks.map(c => J.fitSize(c, p.font, tw * 0.92, rowH0 * 0.7, { track: 0.03 })));
    const rowH = Math.max(size * 1.62, ls * 2.4);
    const blockH = k * rowH + (ctxRows ? cxH * 2 : 0);
    const y0 = H / 2 - blockH / 2 + ls * 1.8;
    // header
    const ha = tin(env, 0, 0.4, E.outCubic) * out;
    const hy = y0 - ls * 2.8;
    env.draw({ text: '目次', font: serifF(env), size: ls * 2.1, track: 0.5, align: 'left', x: bx, y: hy - ls * 0.2, color: sc.fg, alpha: ha, ghost: false });
    env.draw({ text: 'CONTENTS', font: monoF(env), size: ls * 0.85, track: 0.3, align: 'right', x: bx + bw, y: hy, color: sc.sub, alpha: ha, ghost: false });
    const le = tin(env, 0.05, 0.6, E.inOutCubic) * out;
    env.line([[bx, hy + ls * 1.4], [bx + bw * le, hy + ls * 1.4]], sc.fg, lw * 1.6, 1, false);
    env.line([[bx + bw, y0 + blockH + ls * 0.2], [bx + bw - bw * le, y0 + blockH + ls * 0.2]], sc.fg, lw, 0.7, false);
    const off0 = ctxRows ? cxH : 0;
    const rowY = i => y0 + off0 + (i + 0.5) * rowH;
    const drawCtx = (lab, pg, y, d) => {
      const a = tin(env, d, 0.4, E.outCubic) * out * 0.45;
      env.draw({ text: lab + '章', font: serifF(env), size: ls * 1.1, align: 'left', x: bx + numW, y, color: sc.sub, alpha: a, ghost: false });
      leader(env, bx + numW + ls * 3.4, bx + bw - pgW, y + ls * 0.3, sc.sub, a, ls * 0.55, Math.max(1, ls * 0.07));
      env.draw({ text: pg, font: monoF(env), size: ls, align: 'right', x: bx + bw, y, color: sc.sub, alpha: a, ghost: false });
    };
    if (ctxRows) drawCtx(ctxRows[0][0], ctxRows[0][1], y0 + cxH * 0.5, 0.05);
    chunks.forEach((c, i) => {
      const y = rowY(i);
      const isCur = i === cur;
      const a = tin(env, 0.1 + i * 0.1, 0.5, E.outCubic) * out;
      env.draw({ text: pad2(i + 1), font: monoF(env), size: ls * 1.2, align: 'left', x: bx, y, color: isCur ? sc.accent : sc.sub, alpha: a, ghost: false });
      const r = J.mainDraw(env, { text: c, font: p.font, size, x: bx + numW, y, align: 'left', track: 0.03, color: sc.fg, mi: i * 3 });
      bb = J.unionBB(bb, r);
      const tx1 = bx + numW + meas(c, p.font, size, { track: 0.03 }).w + ls * 0.8;
      const lx1 = bx + bw - pgW;
      leader(env, tx1, J.lerp(tx1, lx1, a), y + size * 0.3, isCur ? sc.accent : sc.sub, a, ls * 0.55, Math.max(1.2, ls * 0.08));
      env.draw({ text: pages[i], font: monoF(env), size: ls * 1.4, align: 'right', x: bx + bw, y, color: isCur ? sc.accent : sc.fg, alpha: a, ghost: false });
      if (isCur) {
        const ma = J.clamp(a * 2 - 0.4);
        if (p.mark === 'bar') env.rect(bx - ls * 1.1, y - size * 0.45, ls * 0.35, size * 0.9, sc.accent, ma, false);
        else if (p.mark === 'tri') env.poly([[bx - ls * 1.3, y - ls * 0.5], [bx - ls * 0.4, y], [bx - ls * 1.3, y + ls * 0.5]], sc.accent, ma, false);
        else env.circle(bx - ls * 0.9, y, ls * 0.3, sc.accent, null, 0, ma, false);
      }
    });
    if (ctxRows) drawCtx(ctxRows[1][0], ctxRows[1][1], y0 + off0 + k * rowH + cxH * 0.5, 0.1 + k * 0.1);
    return bb || box(bx, y0, bx + bw, y0 + blockH);
  },
});

/* ======================================================================
   4  footnote — 脚注
   ====================================================================== */
reg('footnote', {
  name: '脚注', tags: ['editorial', 'calm', 'emotional'], w: 0.9, ae: 'gloss', fits: n => n >= 2 && n <= 22,
  enterBias: { blur: 1.3, type: 1.3, wipe: 1.2 },
  plan: (rng, cut, st) => {
    const n = cut.n;
    const k = n <= 3 ? 1 : n <= 8 ? 2 : 3;
    return { font: rng.pick(fontsOf(st, ['serif', 'display', 'serif'])), chunks: splitK(cut.text, k), marks: rng.pick(['num', 'kome', 'star']), align: rng.pick(['left', 'center', 'left']), top: rng.chance(0.5) };
  },
  render(env) {
    const { W, H, sc } = env, p = env.cut.params, u = U(env), port = isPort(env);
    const out = tout(env);
    const chunks = (p.chunks && p.chunks.length ? p.chunks : [env.cut.text.trim()]).filter(Boolean);
    const k = chunks.length;
    const latin = hasLatin(env.cut.text);
    const t0 = chunks.join(latin ? ' ' : '');
    const mx = W * 0.09, aw = W - mx * 2;
    const ls = smallSize(env);
    const notesH = k * ls * 1.95 + ls * 2.2;
    const areaTop = H * 0.12, areaBot = H - notesH - H * 0.1;
    const fb = fitBlock(t0, p.font, aw * (port ? 0.95 : 0.88), (areaBot - areaTop) * 0.8, { lead: 1.25, track: 0.03 }, port ? 5 : 3);
    const size = Math.min(fb.size, u * 0.17);
    const left = p.align === 'left';
    const it = { text: fb.text, font: p.font, size, x: left ? mx : W / 2, y: (areaTop + areaBot) / 2, align: left ? 'left' : 'center', lead: 1.25, track: 0.03, color: sc.fg };
    const bb = J.mainDraw(env, it);
    // glyph positions at rest → superscript marks after each chunk
    const gl = glyphPts(it);
    const markOf = i => p.marks === 'num' ? String(i + 1) : p.marks === 'kome' ? '※' + (i + 1) : '*' + (i + 1);
    let acc = 0;
    const ms = Math.max(ls * 1.05, size * 0.3);
    chunks.forEach((c, i) => {
      acc += J.glyphCount(c);
      const g = gl[Math.min(gl.length - 1, acc - 1)];
      if (!g) return;
      const t = env.cut.inDur * 0.7 + 0.12 + i * 0.14;
      const e = E.outBack(J.clamp((env.lt - t) / 0.25), 2.2) * out;
      if (e <= 0.01) return;
      env.draw({ text: markOf(i), font: monoF(env), size: ms * e, align: 'left', x: g.x + g.w * 0.5, y: g.y - size * 0.42, color: sc.accent, ghost: false });
    });
    // footnote rule + notes
    const ny = H - notesH - H * 0.04 + ls;
    const re = tin(env, env.cut.inDur * 0.6, 0.5, E.inOutCubic) * out;
    const rw = Math.min(aw * 0.32, u * 0.5);
    env.line([[mx, ny], [mx + rw * re, ny]], sc.fg, Math.max(1.2, u * 0.0018), 0.9, false);
    const nfs = ls * 1.15;
    chunks.forEach((c, i) => {
      const a = tin(env, env.cut.inDur * 0.7 + 0.2 + i * 0.12, 0.4, E.outCubic) * out;
      if (a <= 0.01) return;
      const y = ny + ls * 1.5 + i * ls * 1.95;
      const rom = romaOfText(c);
      const note = flat(c) + '　' + (rom ? rom : J.fmtTime(env.cut.start + env.cut.dur * i / k)) + (i === k - 1 && env.cut.lineText && strip(env.cut.lineText) !== strip(env.cut.text) ? '　／　' + flat(env.cut.lineText).slice(0, 24) : '');
      env.draw({ text: markOf(i), font: monoF(env), size: nfs, align: 'left', x: mx + (1 - a) * ls, y, color: sc.accent, alpha: a, ghost: false });
      env.draw({ text: note, font: bodyF(env), size: nfs, track: 0.05, align: 'left', x: mx + ls * 2.4 + (1 - a) * ls, y, color: sc.sub, alpha: a, ghost: false });
    });
    // folio
    const fa = tin(env, 0.2, 0.4, E.outCubic) * out;
    env.draw({ text: '— ' + pad3(lineN(env) * 7 + 3) + ' —', font: monoF(env), size: ls * 0.8, track: 0.2, x: W / 2, y: H - H * 0.045, color: sc.sub, alpha: fa * 0.7, ghost: false });
    if (p.top) {
      env.draw({ text: 'NOTES  ' + lineNo(env), font: monoF(env), size: ls * 0.8, track: 0.3, align: 'right', x: W - mx, y: H * 0.06, color: sc.sub, alpha: fa * 0.7, ghost: false });
      env.line([[W - mx, H * 0.06 + ls], [W - mx - rw * re, H * 0.06 + ls]], sc.sub, 1, 0.6, false);
    }
    return bb;
  },
});

/* ======================================================================
   5  proofread — 校正刷り
   ====================================================================== */
const PROOF_NOTES = { circle: 'ママ', wave: '強調', box: '太字', dots: 'イキ' };
reg('proofread', {
  name: '校正刷り', tags: ['editorial', 'graphic', 'calm'], w: 0.8, ae: 'gloss', fits: n => n >= 2 && n <= 20,
  enterBias: { type: 1.4, blur: 1.2, cut: 1.2 },
  plan: (rng, cut, st) => {
    const all = ['circle', 'wave', 'box', 'dots'];
    const first = rng.pick(['circle', 'circle', 'box']);
    const rest = all.filter(m => m !== first);
    const marks = [first, rng.pick(rest)];
    return { font: rng.pick(fontsOf(st, ['serif', 'serif', 'display'])), pen: rng.chance(0.6) ? 'klee' : rng.pick(fontsOf(st, ['body'])), marks, stamp: rng.chance(0.65), tombo: rng.chance(0.8), g1: rng.int(0, 99), g2: rng.int(0, 99), rot: rng.range(-8, 8) };
  },
  render(env) {
    const { W, H, sc, ctx } = env, p = env.cut.params, u = U(env), port = isPort(env);
    const out = 1 - E.outCubic(J.clamp(env.pOut * 1.15));   // pen marks leave with the text
    const t0 = env.cut.text.trim();
    const aw = W * (port ? 0.7 : 0.62), ah = H * (port ? 0.34 : 0.4);
    const fb = fitBlock(t0, p.font, aw, ah, { lead: 1.45, track: 0.06 }, port ? 5 : 3);
    const size = Math.min(fb.size, u * 0.14);
    const cx = W / 2 - (port ? 0 : W * 0.06), cy = H / 2 + (port ? H * 0.02 : 0);
    const it = { text: fb.text, font: p.font, size, x: cx, y: cy, lead: 1.45, track: 0.06, color: sc.fg };
    const m = meas(fb.text, p.font, size, { lead: 1.45, track: 0.06 });
    const lw = Math.max(1, u * 0.0014);
    // crop marks around the trim box
    const pad = size * 0.75;
    const x0 = cx - m.w / 2 - pad, x1 = cx + m.w / 2 + pad, y0 = cy - m.h / 2 - pad, y1 = cy + m.h / 2 + pad;
    if (p.tombo) {
      const te = tin(env, 0, 0.5, E.outCubic) * out;
      tombo(env, x0, y0, x1, y1, size * 0.18, size * 0.55 * te, sc.sub, lw, 0.8 * te);
    }
    const bb = J.mainDraw(env, it);
    // red-pen marks
    const pen = plateCol(sc, [sc.accent, sc.accent2, sc.fg]);
    const gl = glyphPts(it);
    if (!gl.length) return bb;
    const pw = Math.max(2, size * 0.035);
    const ns = Math.max(ls0(env) * 1.5, size * 0.42);
    const t1 = env.cut.inDur * 0.8 + 0.1;
    const nChunks = env.cut.words && env.cut.words.length ? env.cut.words : [t0];
    const used = new Set();
    const pickGlyph = (seed, pred) => {
      const cand = gl.filter(g => pred(g.ch) && !used.has(g.i));
      const list = cand.length ? cand : gl.filter(g => !used.has(g.i));
      const g = list.length ? list[seed % list.length] : gl[0];
      used.add(g.i); return g;
    };
    const noteSide = port ? 'top' : 'right';
    const marks = gl.length <= 4 ? p.marks.slice(0, 1) : p.marks;
    marks.forEach((mk, mi) => {
      const e = J.clamp((env.lt - t1 - mi * 0.35) / 0.45);
      if (e <= 0) return;
      const a = out;
      const seed = mi ? p.g2 : p.g1;
      let anchor;
      if (mk === 'circle') {
        const g = pickGlyph(seed, c => J.isKanji(c) || J.isKata(c));
        const pts = penEllipse(g.x, g.y, g.w * 0.72, g.h * 0.66, seed);
        env.polyPartial(pts, E.outCubic(J.clamp(e * 1.6)), pen, pw, a, false);
        anchor = [g.x + g.w * 0.5, g.y - g.h * 0.55];
      } else if (mk === 'box' || mk === 'wave' || mk === 'dots') {
        // a run of glyphs on one line (the first word chunk that fits)
        const g0 = pickGlyph(seed, c => !J.isPunct(c));
        const want = Math.max(2, Math.min(4, J.glyphCount(nChunks[0] || '')));
        const run = [g0];
        for (const g of gl) { if (run.length >= want) break; if (g.i > run[run.length - 1].i && g.li === g0.li && !used.has(g.i) && g.i === run[run.length - 1].i + 1) run.push(g); }
        run.forEach(g => used.add(g.i));
        const rx0 = Math.min(...run.map(g => g.x - g.w / 2)), rx1 = Math.max(...run.map(g => g.x + g.w / 2));
        const ry = g0.y;
        if (mk === 'box') {
          const q = size * 0.14;
          env.polyPartial([[rx0 - q, ry - size * 0.62], [rx1 + q, ry - size * 0.6], [rx1 + q * 0.8, ry + size * 0.6], [rx0 - q * 1.1, ry + size * 0.62], [rx0 - q, ry - size * 0.7]], E.outCubic(J.clamp(e * 1.5)), pen, pw, a, false);
          anchor = [rx1 + q, ry - size * 0.6];
        } else if (mk === 'wave') {
          const pts = []; const M = 30, yy = ry + size * 0.66;
          for (let i = 0; i <= M; i++) { const xx = J.lerp(rx0, rx1, i / M); pts.push([xx, yy + Math.sin(i / M * (rx1 - rx0) / (size * 0.18)) * size * 0.06]); }
          env.polyPartial(pts, E.inOutCubic(J.clamp(e * 1.5)), pen, pw, a, false);
          anchor = [rx1, yy];
        } else {
          const n2 = run.length;
          run.forEach((g, j) => { const d = J.clamp(e * 1.6 * n2 - j); if (d > 0) env.circle(g.x, ry + size * 0.7, pw * 1.2 * d, pen, null, 0, a, false); });
          anchor = [rx1, ry + size * 0.7];
        }
      }
      // leader to the margin + handwritten note
      const note = PROOF_NOTES[mk] || 'ママ';
      const le = E.outCubic(J.clamp(e * 1.4 - 0.4));
      if (le <= 0 || !anchor) return;
      let nx, ny;
      if (noteSide === 'right') { nx = Math.min(W * 0.93 - ns * 2.2, x1 + size * 0.7 + mi * ns * 0.4); ny = y0 + (mi ? m.h * 0.7 : m.h * 0.15); }
      else { nx = J.clamp(anchor[0] + (mi ? ns * 2 : -ns * 2), W * 0.1, W * 0.85); ny = y0 - size * 0.9 - mi * ns * 1.6; }
      const mxp = noteSide === 'right' ? [J.lerp(anchor[0], nx, 0.5), anchor[1] - size * 0.25] : [anchor[0], J.lerp(anchor[1], ny, 0.5)];
      const pts = [anchor, mxp, [nx - ns * 0.2, ny]];
      env.polyPartial(pts, le, pen, pw * 0.7, a, false);
      const na = J.clamp((le - 0.6) / 0.4);
      if (na > 0) env.draw({ text: note, font: p.pen, size: ns, align: 'left', x: nx, y: ny, rot: -4, color: pen, alpha: na * a, ghost: false });
    });
    // 校了 stamp
    if (p.stamp) {
      const ts = env.cut.inDur + 0.55 + marks.length * 0.25;
      const x = (env.lt - ts) / 0.18;
      if (x > 0) {
        const S = Math.max(ls0(env) * 4.2, size * 1.05);
        const sx = port ? W * 0.78 : Math.min(W * 0.9 - S * 0.6, x1 + S * 0.5), sy = port ? Math.min(H * 0.88, y1 + S * 0.9) : y1 - S * 0.1;
        const k2 = J.lerp(1.5, 1, E.outBack(J.clamp(x), 1.4)), a = J.clamp(x * 3) * out;
        ctx.save(); ctx.translate(sx, sy); ctx.rotate(p.rot * J.DEG); ctx.scale(k2, k2);
        const w2 = S * 1.25, h2 = S * 0.72;
        env.rrect(-w2 / 2, -h2 / 2, w2, h2, S * 0.08, null, a * 0.9, false, pen, Math.max(2, S * 0.05));
        env.rrect(-w2 / 2 + S * 0.07, -h2 / 2 + S * 0.07, w2 - S * 0.14, h2 - S * 0.14, S * 0.05, null, a * 0.9, false, pen, Math.max(1, S * 0.02));
        env.draw({ text: '校了', font: serifF(env), size: S * 0.36, track: 0.2, x: 0, y: -S * 0.06, color: pen, alpha: a * 0.9, ghost: false });
        env.draw({ text: J.fmtTime(env.cut.start), font: monoF(env), size: S * 0.12, x: 0, y: S * 0.2, color: pen, alpha: a * 0.9, ghost: false });
        ctx.restore();
      }
    }
    return bb;
  },
});
function ls0(env) { return smallSize(env); }

/* ======================================================================
   6  numbered — 番号付き
   ====================================================================== */
reg('numbered', {
  name: '番号付き', tags: ['graphic', 'editorial', 'pop'], w: 1, ae: 'mixed', fits: n => n >= 2 && n <= 18,
  enterBias: { slice: 1.3, wipe: 1.3, drop: 1.2 },
  plan: (rng, cut, st) => {
    const n = cut.n, port = portOf(cut);
    const k = n <= 3 ? Math.min(3, n) : n <= 7 ? 2 : n <= 12 ? 3 : 4;
    const chunks = n <= 3 ? charUnits(cut.text).slice(0, 3) : splitK(cut.text, k, k);
    return {
      font: rng.pick(fontsOf(st, ['display', 'serif'])), numFont: rng.pick(fontsOf(st, ['display'])), chunks,
      variant: port ? rng.pick(['rows', 'rows', 'behind']) : rng.pick(['cols', 'rows', 'behind']), num: rng.pick(['outline', 'accent', 'dim']),
      label: rng.pick(['STEP', 'PART', 'No.', 'SCENE']),
    };
  },
  render(env) {
    const { W, H, sc, ctx } = env, p = env.cut.params, u = U(env), port = isPort(env);
    const chunks = (p.chunks && p.chunks.length ? p.chunks : [env.cut.text.trim()]).filter(Boolean);
    const k = chunks.length, out = tout(env), ls = smallSize(env);
    const lw = Math.max(1.2, u * 0.0018);
    const numItem = (i, size, x, y, align, big) => {
      const it = { text: pad2(i + 1), font: p.numFont, size, x, y, align, track: -0.02, ghost: false };
      if (p.num === 'outline' || big) Object.assign(it, { fill: false, stroke: Math.max(1.5, size * (big ? 0.008 : 0.012)), strokeColor: p.num === 'accent' ? sc.accent : sc.fg, color: sc.fg, alpha: big ? 0.55 : 1 });
      else if (p.num === 'accent') it.color = sc.accent;
      else { it.color = sc.sub; it.alpha = 0.45; }
      return it;
    };
    // numerals rise inside a mask, one after another; they sink on exit
    const drawNum = (it, i, clipBox) => {
      const e = tin(env, 0.04 + i * 0.1, 0.55, E.outExpo);
      const o = E.inCubic(env.pOut);
      if (e <= 0 || o >= 1) return;
      ctx.save(); ctx.beginPath(); ctx.rect(clipBox[0], clipBox[1], clipBox[2], clipBox[3]); ctx.clip();
      env.draw(Object.assign({}, it, { y: it.y + (1 - e) * it.size * 1.1 + o * it.size * 1.1 }));
      ctx.restore();
    };
    const lab = (i, x, y, align, a) => env.draw({ text: p.label === 'No.' ? 'No.' : p.label, font: monoF(env), size: ls * 0.85, track: 0.3, align, x, y, color: i === 0 ? sc.accent : sc.sub, alpha: a, ghost: false });
    let bb = null;
    if (p.variant === 'cols' && !port && k <= 3) {
      const cw = W * 0.86 / k, x0 = W * 0.07;
      const csize = Math.min(...chunks.map(c => J.fitSize(c, p.font, cw * 0.86, H * 0.3, { track: 0.02 })), u * 0.2);
      const nsz = Math.min(cw * 0.42, Math.max(csize * 1.5, u * 0.14), H * 0.3);
      const top = H / 2 - (nsz * 1.05 + csize * 1.4) / 2 + ls;
      chunks.forEach((c, i) => {
        const x = x0 + i * cw;
        const re = tin(env, 0.1 + i * 0.08, 0.6, E.inOutCubic) * out;
        if (i > 0) env.line([[x, H / 2 - H * 0.28 * re], [x, H / 2 + H * 0.28 * re]], sc.sub, lw, 0.7, false);
        const xl = x + cw * 0.07;
        lab(i, xl, top - ls * 0.9, 'left', tin(env, 0.1 + i * 0.1, 0.4, E.outCubic) * out);
        drawNum(numItem(i, nsz, xl, top + nsz * 0.5, 'left'), i, [x, top, cw, nsz * 1.02]);
        env.line([[xl, top + nsz * 1.05], [xl + cw * 0.82 * re, top + nsz * 1.05]], sc.fg, lw * 1.4, 1, false);
        bb = J.unionBB(bb, J.mainDraw(env, { text: c, font: p.font, size: csize, x: xl, y: top + nsz * 1.05 + csize * 0.85, align: 'left', track: 0.02, color: sc.fg, mi: i * 3 }));
      });
      return bb;
    }
    if (p.variant === 'behind') {
      // giant hairline numerals sit behind each chunk; chunks step diagonally
      const bw = W * (port ? 0.8 : 0.66);
      const rowH = H * (port ? 0.66 : 0.72) / k;
      const csize = Math.min(...chunks.map(c => J.fitSize(c, p.font, bw * 0.8, rowH * 0.62, { track: 0.02 })), u * 0.2);
      chunks.forEach((c, i) => {
        const y = H / 2 + (i - (k - 1) / 2) * rowH;
        const sh = k > 1 ? (i / (k - 1) - 0.5) * bw * 0.2 : 0;
        const cm = meas(c, p.font, csize, { track: 0.02 });
        const x = W / 2 + sh - cm.w / 2;
        const nsz = Math.min(rowH * 1.02, u * 0.5);
        const nw = meas('00', p.numFont, nsz).w;
        const nx = J.clamp(x + Math.min(cm.w, nw) * 0.3, W * 0.04 + nw / 2, W * 0.96 - nw / 2);
        drawNum(numItem(i, nsz, nx, y, 'center', true), i, [0, y - rowH * 0.75, W, rowH * 1.5]);
        bb = J.unionBB(bb, J.mainDraw(env, { text: c, font: p.font, size: csize, x, y, align: 'left', track: 0.02, color: sc.fg, mi: i * 3 }));
      });
      return bb;
    }
    // rows: numeral left, chunk right, hairlines between
    const bw = W * (port ? 0.86 : 0.7), bx = (W - bw) / 2;
    const rowH = Math.min(H * (port ? 0.62 : 0.72) / k, u * (port ? 0.3 : 0.34));
    const nsz = rowH * (port ? 0.56 : 0.72);
    const nW = meas('00', p.numFont, nsz).w + nsz * 0.3;
    const csize = Math.min(...chunks.map(c => J.fitSize(c, p.font, (bw - nW) * 0.96, rowH * 0.6, { track: 0.02 })), u * 0.2);
    const y0 = H / 2 - k * rowH / 2;
    chunks.forEach((c, i) => {
      const y = y0 + (i + 0.5) * rowH;
      const re = tin(env, 0.06 + i * 0.08, 0.6, E.inOutCubic) * out;
      env.line([[bx, y0 + (i + 1) * rowH], [bx + bw * re, y0 + (i + 1) * rowH]], sc.sub, lw, 0.8, false);
      if (i === 0) env.line([[bx + bw, y0], [bx + bw - bw * re, y0]], sc.fg, lw * 1.6, 1, false);
      if (i === 0) lab(0, bx + bw, y0 - ls * 0.9, 'right', tin(env, 0.1, 0.4, E.outCubic) * out);
      drawNum(numItem(i, nsz, bx, y + nsz * 0.02, 'left'), i, [bx - 2, y - rowH / 2 + 2, nW, rowH - 4]);
      bb = J.unionBB(bb, J.mainDraw(env, { text: c, font: p.font, size: csize, x: bx + nW, y, align: 'left', track: 0.02, color: sc.fg, mi: i * 3 }));
    });
    return bb;
  },
});

/* ======================================================================
   7  poster — ポスター
   ====================================================================== */
reg('poster', {
  name: 'ポスター', tags: ['graphic', 'pop', 'editorial'], w: 1, ae: 'huge', emph: 1.3, fits: n => n <= 16,
  enterBias: { slice: 1.4, stretch: 1.3, wipe: 1.2 },
  plan: (rng, cut, st) => {
    const n = cut.n, port = portOf(cut);
    const L = n <= 3 ? 1 : Math.min(4, Math.ceil(n / (port ? 3.2 : 4.6)));
    return {
      font: rng.pick(fontsOf(st, ['display'])), lines: splitK(cut.text, L, L), variant: rng.pick(['stack', 'stack', 'block', 'tate']),
      dot: rng.chance(0.55), head: rng.pick(['LYRIC', 'SIDE A', 'VOL.', 'LIVE', 'TOUR']), ang: rng.pick([0, 0, -90]),
    };
  },
  render(env) {
    const { W, H, sc } = env, p = env.cut.params, u = U(env), port = isPort(env);
    const out = tout(env), ls = smallSize(env);
    const mx = W * 0.07, my = H * 0.07, aw = W - mx * 2;
    const lines = (p.lines && p.lines.length ? p.lines : [env.cut.text.trim()]).filter(Boolean);
    const latin = hasLatin(env.cut.text);
    const credH = ls * 4.2, topH = ls * 2;
    const y0 = my + topH + ls * 0.6, y1 = H - my - credH - ls * 0.8;
    const avH = y1 - y0;
    const block = p.variant === 'block';
    const tate = p.variant === 'tate' && !latin;
    const plate = block ? plateCol(sc, [sc.accent, sc.ink]) : null;
    const tc = block ? onCol(sc, plate) : sc.fg;
    const lw = Math.max(1.2, u * 0.0016);
    // colour block (wipes down from the top)
    if (block) {
      const e = tin(env, 0, 0.5, E.inOutExpo) * (1 - E.inCubic(env.pOut));
      env.rect(0, 0, W, (y1 + ls * 0.4) * e, plate, 1, gIn(env));
    }
    // header row
    const ha = tin(env, 0.1, 0.4, E.outCubic) * out;
    env.draw({ text: p.head + '  ' + lineNo(env), font: monoF(env), size: ls, track: 0.3, align: 'left', x: mx, y: my + ls * 0.5, color: tc, alpha: ha, ghost: false });
    env.draw({ text: J.fmtTime(env.cut.start), font: monoF(env), size: ls, track: 0.2, align: 'right', x: mx + aw, y: my + ls * 0.5, color: tc, alpha: ha, ghost: false });
    const re = tin(env, 0.05, 0.6, E.inOutCubic) * out;
    env.line([[mx, my + ls * 1.5], [mx + aw * re, my + ls * 1.5]], tc, lw, 0.8, false);
    // accent dot behind the type (tate posters get one in the free area left of the columns)
    if (tate) {
      if (!block) {
        const t = strip(env.cut.text), n = J.glyphCount(t), per = port ? 6 : 5, kc = Math.ceil(n / per);
        const mxG = Math.min(per, Math.ceil(n / kc)), sz = Math.min(avH / (mxG * 0.98), aw * 0.8 / (kc * 1.14));
        const free = aw - kc * sz * 1.14;
        const r = Math.min(avH * 0.36, free * 0.42);
        const q = E.outBack(J.clamp((env.lt - 0.05) / 0.45), 1.3) * (1 - E.inCubic(env.pOut));
        if (r > u * 0.06) env.circle(mx + free * 0.48, y0 + avH / 2, r * q, sc.accent, null, 0, 1, gIn(env));
      }
    } else if (p.dot && !block) {
      const r = Math.min(aw, avH) * (port ? 0.34 : 0.3);
      const q = E.outBack(J.clamp((env.lt - 0.05) / 0.45), 1.3) * (1 - E.inCubic(env.pOut));
      env.circle(mx + aw - r * 0.9, y0 + r * 0.95, r * q, sc.accent, null, 0, 1, gIn(env));
    }
    let bb = null;
    if (tate) {
      // tall columns filling the height, right → left, one size
      const t = strip(env.cut.text), n = J.glyphCount(t);
      const per = port ? 6 : 5;
      const cols = memo('pt|' + t + per, () => splitK(t, Math.ceil(n / per), Math.ceil(n / per)).map(strip));
      const mxG = Math.max(...cols.map(c => J.glyphCount(c)));
      const gap = 0.14;
      const sz = Math.min(avH / (mxG * 0.98), aw * 0.8 / (cols.length * (1 + gap)));
      let x = mx + aw - sz / 2;
      cols.forEach((c, i) => {
        bb = J.unionBB(bb, J.mainDraw(env, { text: c, font: p.font, size: sz, x, y: y0 + (avH - mxG * sz * 0.98) / 2, vertical: true, align: 'left', track: -0.02, color: tc, mi: i * 3 }));
        x -= sz * (1 + gap);
      });
    } else {
      const w1 = lines.map(l => meas(l, p.font, 100, { track: -0.02 }).w / 100);
      let sz = w1.map(w => aw / Math.max(0.5, w));
      const tot = sz.reduce((a, b) => a + b * 0.98, 0);
      const f = Math.min(1, avH / tot);
      sz = sz.map(v => v * f);
      const th = sz.reduce((a, b) => a + b * 0.98, 0);
      let y = y0 + (avH - th) * (block ? 1 : 0.5);
      lines.forEach((l, i) => {
        y += sz[i] * 0.49;
        bb = J.unionBB(bb, J.mainDraw(env, { text: l, font: p.font, size: sz[i], x: mx, y, align: 'left', track: -0.02, color: tc, mi: i * 3 }));
        y += sz[i] * 0.49;
      });
    }
    // credits block
    const cy = H - my - credH;
    const lw2 = Math.max(4, u * 0.008);
    env.rect(mx, cy, aw * re, lw2, sc.fg, 1, false);
    const cols3 = [['DATE', J.fmtTime(env.cut.start)], ['No.', lineNo(env) + ' / ' + pad2(J.glyphCount(env.cut.text))], ['WORDS', deckCopy(env) || romajiOf(env) || flat(env.cut.text)]];
    const cw3 = aw / 3;
    cols3.forEach(([k2, v], i) => {
      const a = tin(env, 0.2 + i * 0.08, 0.4, E.outCubic) * out;
      if (a <= 0.01) return;
      const x = mx + i * cw3;
      env.draw({ text: k2, font: monoF(env), size: ls * 0.8, track: 0.3, align: 'left', x, y: cy + lw2 + ls * 0.9, color: sc.sub, alpha: a, ghost: false });
      const maxC = Math.max(3, Math.floor(cw3 * 0.9 / (ls * (hasLatin(v) ? 0.62 : 1.05))));
      const vv = [...v].length > maxC ? [...v].slice(0, maxC - 1).join('') + '…' : v;
      env.draw({ text: vv, font: bodyF(env), size: ls * 1.05, align: 'left', x, y: cy + lw2 + ls * 2.4, color: sc.fg, alpha: a, ghost: false });
      if (i > 0) env.line([[x - ls * 0.5, cy + lw2 + ls * 0.4], [x - ls * 0.5, cy + credH - ls * 0.3]], sc.sub, lw, 0.6 * a, false);
    });
    return bb || box(mx, y0, mx + aw, y1);
  },
});

/* ======================================================================
   8  swissGrid — スイスグリッド
   ====================================================================== */
reg('swissGrid', {
  name: 'スイスグリッド', tags: ['graphic', 'editorial', 'calm'], w: 1, ae: 'mixed', fits: n => n <= 18,
  enterBias: { wipe: 1.4, slice: 1.3, cut: 1.2 },
  plan: (rng, cut, st) => {
    const n = cut.n;
    const k = n <= 4 ? 1 : n <= 9 ? 2 : 3;
    return { font: rng.pick(fontsOf(st, ['display'])), chunks: splitK(cut.text, k, k), variant: rng.pick(['a', 'b']), shape: rng.pick(['circle', 'square', 'circle', 'bar']), label: rng.chance(0.7) };
  },
  render(env) {
    const { W, H, sc } = env, p = env.cut.params, u = U(env), port = isPort(env);
    const out = tout(env), ls = smallSize(env);
    const cols = port ? 4 : 6, rows = port ? 8 : 6;
    const m = u * 0.07;
    const gx0 = m * 1.35, gx1 = W - m, gy0 = m, gy1 = H - m;
    const cw = (gx1 - gx0) / cols, rh = (gy1 - gy0) / rows;
    const X = c => gx0 + c * cw, Y = r => gy0 + r * rh;
    // grid
    const lw = Math.max(1, u * 0.0012);
    for (let c = 0; c <= cols; c++) { const e = tin(env, c * 0.035, 0.55, E.inOutCubic) * out; if (e > 0) env.line([[X(c), gy0], [X(c), gy0 + (gy1 - gy0) * e]], sc.sub, lw, 0.38, false); }
    for (let r = 0; r <= rows; r++) { const e = tin(env, 0.05 + r * 0.035, 0.55, E.inOutCubic) * out; if (e > 0) env.line([[gx0, Y(r)], [gx0 + (gx1 - gx0) * e, Y(r)]], sc.sub, lw, 0.38, false); }
    const na = tin(env, 0.2, 0.4, E.outCubic) * out;
    for (let c = 0; c < cols; c++) env.draw({ text: pad2(c + 1), font: monoF(env), size: ls * 0.7, align: 'left', x: X(c) + ls * 0.3, y: gy0 - ls * 0.6, color: sc.sub, alpha: na * 0.8, ghost: false });
    const chunks = (p.chunks && p.chunks.length ? p.chunks : [env.cut.text.trim()]).filter(Boolean);
    const k = chunks.length;
    // placements (column, row, span columns, height in rows)
    const half = Math.ceil(cols / 2);
    let pl;
    if (k === 1) pl = [{ c: 0, r: port ? 2 : 1, span: cols, hr: port ? 2.4 : 2.6 }];
    else if (p.variant === 'a') pl = [{ c: 0, r: 1, span: cols, hr: port ? 2 : 2.2 }, { c: port ? 1 : half, r: rows - (k > 2 ? 3 : 2), span: cols - (port ? 1 : half), hr: 1 }, { c: port ? 1 : half, r: rows - 2 + (port ? 0.2 : 0.1), span: cols - (port ? 1 : half), hr: 1 }];
    else pl = [0, 1, 2].map(i => { const c = Math.round(i * cols / (k + (port ? 1.5 : 0.8))); return { c, r: (port ? 1 : 0.6) + i * (rows - 1.6) / k, span: cols - c, hr: port ? 1.6 : 1.4 }; });
    const sizes = chunks.map((ch, i) => { const q = pl[i]; return Math.min(J.fitSize(ch, p.font, q.span * cw - cw * 0.12, q.hr * rh * 0.9, { track: -0.01 }), u * 0.28); });
    if (k > 1 && p.variant === 'a') for (let i = 1; i < k; i++) sizes[i] = Math.min(sizes[i], sizes[0] * 0.6, Math.min(...sizes.slice(1)));
    const boxes = [];
    let bb = null;
    chunks.forEach((ch, i) => {
      const q = pl[i], sz = sizes[i];
      const x = X(q.c) + cw * 0.06, y = Y(q.r) + sz * 0.56;
      const w = meas(ch, p.font, sz, { track: -0.01 }).w;
      boxes.push([x, Y(q.r), x + w, Y(q.r) + sz * 1.12]);
      // rule on top of the chunk (hangs from the row line)
      const e = tin(env, 0.12 + i * 0.1, 0.5, E.inOutCubic) * out;
      env.rect(X(q.c), Y(q.r) - Math.max(3, u * 0.005), Math.min(q.span * cw, w + cw * 0.12) * e, Math.max(3, u * 0.005), sc.fg, 1, false);
      bb = J.unionBB(bb, J.mainDraw(env, { text: ch, font: p.font, size: sz, x, y, align: 'left', track: -0.01, color: sc.fg, mi: i * 3 }));
    });
    // accent shape in the first free module block
    const cands = [[cols - 2, rows - 2, 2], [0, rows - 2, 2], [cols - 2, 0, 2], [cols - 1, rows - 1, 1], [0, rows - 1, 1], [cols - 1, 0, 1]];
    const free = cands.find(([c, r, s2]) => !boxes.some(b => b[0] < X(c + s2) && b[2] > X(c) && b[1] < Y(r + s2) && b[3] > Y(r)));
    if (free) {
      const [c, r, s2] = free;
      const q = E.outBack(J.clamp((env.lt - 0.25) / 0.45), 1.2) * (1 - E.inCubic(env.pOut));
      const bw2 = s2 * cw, bh2 = s2 * rh, cxs = X(c) + bw2 / 2, cys = Y(r) + bh2 / 2, R = Math.min(bw2, bh2) * 0.46;
      if (q > 0) {
        if (p.shape === 'circle') env.circle(cxs, cys, R * q, sc.accent, null, 0, 1, gIn(env));
        else if (p.shape === 'square') env.rect(cxs - R * q, cys - R * q, R * 2 * q, R * 2 * q, sc.accent, 1, gIn(env));
        else env.rect(X(c) + cw * 0.06, cys - rh * 0.12, (bw2 - cw * 0.12) * q, rh * 0.24, sc.accent, 1, gIn(env));
      }
    }
    if (p.label) {
      const a = tin(env, 0.3, 0.4, E.outCubic) * out;
      env.draw({ text: 'JIZURA  ／  No.' + lineNo(env) + '  ／  ' + J.fmtTime(env.cut.start), font: monoF(env), size: ls * 0.8, track: 0.25, x: m * 0.62, y: (gy0 + gy1) / 2, rot: -90, color: sc.sub, alpha: a, ghost: false });
    }
    return bb;
  },
});

/* ======================================================================
   9  dictionary — 辞書
   ====================================================================== */
reg('dictionary', {
  name: '辞書', tags: ['editorial', 'calm', 'emotional'], w: 0.9, ae: 'gloss', fits: n => n >= 1 && n <= 16,
  enterBias: { blur: 1.3, type: 1.3, wipe: 1.2 },
  plan: (rng, cut, st) => ({
    font: rng.pick(fontsOf(st, ['serif', 'display'])), variant: rng.pick(['entry', 'page', 'page']), pos: rng.pick(['名', '連語', '感', '形動', '副']),
    page: rng.int(120, 1480), tabY: rng.range(0.2, 0.75), mark: rng.pick(['◆', '▼', '■']), seed: rng.int(1, 9999),
  }),
  render(env) {
    const { W, H, sc } = env, p = env.cut.params, u = U(env), port = isPort(env);
    const out = tout(env), ls = smallSize(env);
    const t0 = env.cut.text.trim();
    const page = p.variant === 'page';
    const mx = W * (port ? 0.08 : 0.1), aw = W - mx * 2 - (port ? W * 0.04 : W * 0.03);
    const lw = Math.max(1, u * 0.0014);
    // headword
    const fb = fitBlock(t0, p.font, aw * (port ? 0.84 : 0.72), H * (port ? 0.26 : 0.3), { track: 0.02, lead: 1.1 }, port ? 3 : 2);
    const size = Math.min(fb.size, u * 0.17);
    const m = meas(fb.text, p.font, size, { track: 0.02, lead: 1.1 });
    const hx = mx + size * 0.62;
    const hy = H * (page ? 0.44 : 0.4);
    // context entries above/below (page variant) — faint body rows
    const fs = J.clamp(u * 0.02, 11, 24), lh = fs * 1.8;
    const src = flat(env.cut.lineText || t0) + (hasLatin(t0) ? ' — ' : '。');
    const ca = tin(env, 0, 0.5, E.outCubic) * out;
    const top = hy - m.h / 2 - size * 0.55 - ls * 1.6;
    const defs = [deckCopy(env) || ('歌詞 第' + kanjiNum(lineN(env)) + '行。'), J.fmtTime(env.cut.start) + ' ─ ' + J.fmtTime(env.cut.end) + '　' + J.glyphCount(t0) + (hasLatin(t0) ? ' chars' : '字')];
    const dfs = J.clamp(u * 0.028, 14, 36);
    const defTop = hy + m.h / 2 + size * 0.45;
    const defBot = defTop + defs.length * dfs * 1.7 + dfs;
    if (page) {
      const rowsA = Math.max(0, Math.floor((top - H * 0.1) / lh));
      bodyRows(env, src, bodyF(env), fs, mx, top - rowsA * lh, aw, rowsA, lh, sc.sub, ca * 0.4, p.seed, ca);
      const rowsB = Math.max(0, Math.floor((H * 0.9 - defBot) / lh));
      bodyRows(env, src, bodyF(env), fs, mx, defBot + lh * 0.5, aw, rowsB, lh, sc.sub, ca * 0.4, p.seed + 31, ca);
      // highlighter sweep behind the headword
      const he = tin(env, env.cut.inDur * 0.6, 0.5, E.inOutCubic) * (1 - E.outCubic(J.clamp(env.pOut * 1.15)));
      if (he > 0) {
        const nL = fb.text.split('\n');
        nL.forEach((l, i) => {
          const w = meas(l, p.font, size, { track: 0.02 }).w;
          const ly = hy + (i - (nL.length - 1) / 2) * size * 1.1;
          env.rect(hx - size * 0.1, ly - size * 0.05, (w + size * 0.2) * J.clamp(he * nL.length - i), size * 0.5, sc.accent, 0.45, false);
        });
      }
    }
    // guide header
    const ga = tin(env, 0.1, 0.4, E.outCubic) * out;
    env.draw({ text: pad3(p.page % 1000), font: monoF(env), size: ls, align: 'left', x: mx, y: H * 0.055, color: sc.sub, alpha: ga, ghost: false });
    env.draw({ text: (strip(t0)[0] || '') + '  ─  ' + (romajiOf(env) || flat(t0)).slice(0, 14), font: serifF(env), size: ls, align: 'right', x: mx + aw, y: H * 0.055, color: sc.sub, alpha: ga, ghost: false });
    env.line([[mx, H * 0.055 + ls * 0.9], [mx + aw * ga, H * 0.055 + ls * 0.9]], sc.sub, lw, 0.6, false);
    // entry furniture: mark, brackets, part of speech
    const fa = tin(env, 0.05, 0.35, E.outCubic) * out;
    env.draw({ text: p.mark, font: bodyF(env), size: size * 0.32, x: mx, y: hy - m.h / 2 + size * 0.5, color: sc.accent, alpha: fa, ghost: false });
    const rom = romajiOf(env);
    if (rom) env.draw({ text: rom.toLowerCase(), font: serifF(env), size: ls * 1.2, track: 0.15, align: 'left', x: hx, y: hy - m.h / 2 - ls * 1.2, color: sc.sub, alpha: fa, ghost: false });
    const bb = J.mainDraw(env, { text: fb.text, font: p.font, size, x: hx, y: hy, align: 'left', track: 0.02, lead: 1.1, color: sc.fg });
    const lastL = fb.text.split('\n').pop();
    const lastW = meas(lastL, p.font, size, { track: 0.02 }).w;
    const ly = hy + (fb.text.split('\n').length - 1) / 2 * size * 1.1;
    const pa = tin(env, env.cut.inDur * 0.7, 0.35, E.outBack) * out;
    if (pa > 0.01) {
      const pw = ls * (p.pos.length * 1.25 + 0.9), px = Math.min(hx + lastW + size * 0.3, W - mx - pw);
      const pyy = ly + (hx + lastW + size * 0.3 > W - mx - pw ? size * 0.75 : 0);
      env.rrect(px, pyy - ls * 0.85, pw, ls * 1.7, ls * 0.3, null, J.clamp(pa), false, sc.fg, lw * 1.4);
      env.draw({ text: p.pos, font: serifF(env), size: ls * 1.1, x: px + pw / 2, y: pyy, color: sc.fg, alpha: J.clamp(pa), ghost: false });
    }
    // definitions
    defs.forEach((d, i) => {
      const a = tin(env, env.cut.inDur * 0.8 + 0.1 + i * 0.12, 0.4, E.outCubic) * out;
      if (a <= 0.01) return;
      const y = defTop + dfs * 0.8 + i * dfs * 1.7;
      env.circle(hx + dfs * 0.45, y, dfs * 0.48, sc.fg, null, 0, a, false);
      env.draw({ text: String(i + 1), font: monoF(env), size: dfs * 0.62, x: hx + dfs * 0.45, y, color: sc.bg, alpha: a, ghost: false });
      const maxC = Math.max(4, Math.floor((aw - dfs * 2) / (dfs * (hasLatin(d) ? 0.55 : 1.02))));
      const dd = [...d].length > maxC ? [...d].slice(0, maxC - 1).join('') + '…' : d;
      env.draw({ text: dd, font: serifF(env), size: dfs, align: 'left', x: hx + dfs * 1.4 + (1 - a) * dfs, y, color: sc.fg, alpha: a, ghost: false });
    });
    // thumb index tab on the page edge
    const tq = tin(env, 0.15, 0.5, E.outExpo) * out;
    if (tq > 0.01) {
      const tw = u * 0.075, th = u * 0.16, ty = H * 0.1 + (H * 0.8 - th) * p.tabY;
      const tabC = plateCol(sc, [sc.ink, sc.fg]);
      env.line([[W - tw * 1.05, H * 0.04], [W - tw * 1.05, H * 0.96]], sc.sub, lw, 0.35 * tq, false);
      env.rect(W - tw * tq, ty, tw + 2, th, tabC, 1, false);
      env.draw({ text: strip(t0)[0] || '', font: p.font, size: tw * 0.62, x: W - tw * tq + tw * 0.5, y: ty + th / 2, color: onCol(sc, tabC), ghost: false });
    }
    return bb;
  },
});

/* ======================================================================
   10  ema — 絵馬
   ====================================================================== */
const slotsOf = t => [...String(t || '').trim().replace(/[\s　]+/g, ' ')];
/* pentagon plaque (house shape) centred on (0, 0) of width w, height h */
const emaPts = (w, h) => { const r = h * 0.26; return [[-w / 2, -h / 2 + r], [0, -h / 2], [w / 2, -h / 2 + r], [w / 2, h / 2], [-w / 2, h / 2]]; };
reg('ema', {
  name: '絵馬', tags: ['emotional', 'calm', 'pop'], w: 0.7, ae: 'labels', treat: 'safe', fits: n => n >= 1 && n <= 16,
  enterBias: { blur: 1.3, cut: 1.3, type: 1.3, slice: 0.5, stretch: 0.5 },
  plan: (rng, cut, st) => ({
    font: rng.chance(0.55) ? rng.pick(['klee', 'brush']) : rng.pick(fontsOf(st, ['serif', 'display'])), vert: !hasLatin(cut.text) && rng.chance(0.5),
    emblem: rng.pick(['sun', 'wave', 'mount', 'knot']), swing: rng.range(12, 20) * rng.pick([1, -1]),
    back: Array.from({ length: 7 }, () => [rng.range(-1, 1), rng.range(-8, 8), rng.range(0.8, 1.05), rng.int(0, 99)]),
  }),
  render(env) {
    const { W, H, sc, ctx } = env, p = env.cut.params, u = U(env), port = isPort(env);
    const out = tout(env), ls = smallSize(env);
    const C = card(sc);
    const wood = J.mix(C.fill, plateCol(sc, [sc.accent, sc.accent2, sc.sub], C.fill, 1.3), 0.16);
    const woodD = J.mix(wood, darkest(sc), 0.35);
    const ink = onCol(sc, wood);
    const cord = plateCol(sc, [sc.accent, sc.accent2, sc.fg], wood, 1.6);
    const hw = port ? W * 0.8 : Math.min(W * 0.52, H * 0.9), hh = hw * 0.7;
    const cordL = H * (port ? 0.06 : 0.08);
    const rackY = port ? H / 2 - cordL - hh * 0.55 : H * 0.13;
    const re = tin(env, 0, 0.45, E.outCubic) * out;
    // rack: a beam with pegs
    env.rect(W * 0.04, rackY - u * 0.012, W * 0.92 * re, u * 0.024, woodD, 1, false);
    // plaques hanging behind
    const nb = port ? 4 : 7;
    const bw = port ? W * 0.22 : Math.min(W * 0.12, H * 0.22), bh = bw * 0.72;
    for (let i = 0; i < nb; i++) {
      const b = p.back[i % p.back.length];
      const x = W * (0.08 + 0.84 * (i + 0.5) / nb) + b[0] * bw * 0.12;
      const t1 = 0.02 + i * 0.03;
      const e = E.outBack(J.clamp((env.lt - t1) / 0.4), 1.2);
      if (e <= 0) continue;
      const sw = b[1] + Math.sin(env.ltb * 1.1 + i) * 1.2;
      const k2 = b[2];
      ctx.save(); ctx.translate(x, rackY); ctx.rotate(sw * J.DEG); ctx.translate(0, bh * 0.55 * k2 + bh * 0.2);
      const a = J.clamp(e * 2) * out * 0.8;
      env.line([[-bw * 0.08, -bh * 0.55 * k2 - bh * 0.2 + 2], [0, -bh * 0.3 * k2], [bw * 0.08, -bh * 0.55 * k2 - bh * 0.2 + 2]], cord, Math.max(1.5, u * 0.002), a, false);
      const pts = emaPts(bw * k2, bh * k2);
      env.poly(pts, J.mix(wood, sc.bg, 0.35), a, false);
      env.line(closeLoop(pts), woodD, Math.max(1, u * 0.0016), a, false);
      greek(env, -bw * k2 * 0.34, -bh * k2 * 0.05, bw * k2 * 0.68, bh * k2 * 0.4, bh * k2 * 0.13, ink, a * 0.35, b[3]);
      ctx.restore();
    }
    // the hero plaque swings in on its cord and settles
    const t0 = env.cut.text.trim();
    const hx = W / 2;
    const td = Math.max(0, env.lt - 0.08);
    const drop = (1 - E.outBack(J.clamp(td / 0.45), 1.3)) * -H * 0.5;
    const ang = p.swing * Math.exp(-td * 2.6) * Math.cos(td * 6) * J.clamp(td / 0.1) + Math.sin(env.ltb * 0.9) * 0.8 + E.inCubic(env.pOut) * p.swing;
    const ha = J.clamp(env.lt / 0.12) * (1 - J.clamp((env.pOut - 0.5) / 0.5));
    if (ha <= 0.01) return null;
    ctx.save(); ctx.translate(hx, rackY + drop); ctx.rotate(ang * J.DEG);
    env.line([[0, 0], [-hw * 0.06, cordL], [0, cordL + hh * 0.1], [hw * 0.06, cordL], [0, 0]], cord, Math.max(2, u * 0.003), ha, false);
    ctx.translate(0, cordL + hh * 0.5);
    const pts = emaPts(hw, hh);
    if (env.pass === 'main') { ctx.save(); ctx.translate(u * 0.01, u * 0.014); env.poly(pts, J.rgba(darkest(sc), J.lum(sc.bg) > 0.5 ? 0.22 : 0.5), ha, false); ctx.restore(); }
    env.poly(pts, wood, ha, false);
    // roof band + wood grain + cord hole
    const r = hh * 0.26;
    env.line([[-hw / 2, -hh / 2 + r], [0, -hh / 2], [hw / 2, -hh / 2 + r]], woodD, Math.max(4, hh * 0.05), ha, false);
    if (env.pass === 'main') {
      ctx.save(); ctx.globalAlpha = ha * 0.12; ctx.strokeStyle = woodD; ctx.lineWidth = Math.max(1, u * 0.0015); ctx.beginPath();
      for (let i = 0; i < 7; i++) { const y = -hh / 2 + r + (hh - r) * (i + 0.5) / 7; ctx.moveTo(-hw / 2 + 4, y); ctx.bezierCurveTo(-hw * 0.2, y + hh * 0.02 * Math.sin(i), hw * 0.2, y - hh * 0.02, hw / 2 - 4, y + hh * 0.01); }
      ctx.stroke(); ctx.restore();
    }
    env.circle(0, -hh / 2 + hh * 0.1, hh * 0.035, sc.bg, woodD, 1.5, ha, false);
    // printed emblem in the roof area
    const ey = -hh / 2 + r * 1.05, es = hh * 0.1;
    const emb = plateCol(sc, [sc.accent, sc.accent2, ink], wood, 1.8);
    if (p.emblem === 'sun') env.circle(-hw * 0.3, ey, es, emb, null, 0, ha, false);
    else if (p.emblem === 'wave') { for (let j = 0; j < 2; j++) { const pp = []; for (let i = 0; i <= 12; i++) pp.push([-hw * 0.38 + hw * 0.16 * i / 12, ey + j * es * 0.7 + Math.sin(i / 12 * J.TAU) * es * 0.25]); env.line(pp, emb, Math.max(2, es * 0.18), ha, false); } }
    else if (p.emblem === 'mount') env.poly([[-hw * 0.4, ey + es * 0.7], [-hw * 0.3, ey - es * 0.8], [-hw * 0.2, ey + es * 0.7]], emb, ha, false);
    else { env.circle(-hw * 0.32, ey, es * 0.6, null, emb, Math.max(2, es * 0.2), ha, false); env.circle(-hw * 0.26, ey, es * 0.6, null, emb, Math.max(2, es * 0.2), ha, false); }
    env.draw({ text: '奉納', font: serifF(env), size: es * 1.1, track: 0.3, x: hw * 0.3, y: ey, color: ink, alpha: ha * 0.8, ghost: false });
    // the wish (lyric), handwritten
    const ax = -hw * 0.42, aw = hw * 0.84, ay = -hh / 2 + r * 1.6, ah = hh / 2 - ay - hh * 0.14;
    let bb;
    if (p.vert) {
      const fb = fitBlock(vtext(t0), p.font, aw, ah, { vertical: true, lead: 1.3, track: 0.04 }, 3);
      const size = Math.min(fb.size, hh * 0.34);
      const mm = meas(fb.text, p.font, size, { vertical: true, lead: 1.3, track: 0.04 });
      bb = J.mainDraw(env, { text: fb.text, font: p.font, size, x: 0, y: ay + (ah - mm.h) / 2, vertical: true, align: 'left', lead: 1.3, track: 0.04, rot: 1.5, color: ink, noHold: true, plain: true, mi: miAt(env, 0.35) });
    } else {
      const fb = fitBlock(t0, p.font, aw, ah, { lead: 1.2, track: 0.02 }, 3);
      const size = Math.min(fb.size, hh * 0.3);
      bb = J.mainDraw(env, { text: fb.text, font: p.font, size, x: 0, y: ay + ah / 2, lead: 1.2, track: 0.02, rot: -1.5, color: ink, noHold: true, plain: true, mi: miAt(env, 0.35) });
    }
    env.draw({ text: 'No.' + lineNo(env) + '  ' + J.fmtTime(env.cut.start), font: monoF(env), size: ls * 0.8, track: 0.15, align: 'right', x: hw * 0.44, y: hh * 0.42, color: ink, alpha: ha * 0.6, ghost: false });
    ctx.restore();
    return bb ? box(hx - hw / 2, rackY + cordL, hx + hw / 2, rackY + cordL + hh) : null;
  },
});

/* ======================================================================
   11  ransom — 切り抜き文字
   ====================================================================== */
reg('ransom', {
  name: '切り抜き文字', tags: ['pop', 'glitch', 'graphic'], w: 0.8, ae: 'labels', treat: false, fits: n => n >= 1 && n <= 16,
  enterBias: { cut: 2, pop: 1.5, drop: 1.3, blur: 0.4, wipe: 0.4, slice: 0.5 },
  plan: (rng, cut, st) => {
    const fonts = [...new Set(fontsOf(st, ['display', 'serif', 'body']).concat(fontsOf(st, ['mono']), ['mincho_black', 'gothic_black', 'pop', 'dot', 'brush'].filter(f => J.FONTS[f] && rng.chance(0.35))))];
    const units = slotsOf(cut.text);
    return {
      fonts, look: units.map(() => [rng.int(0, fonts.length - 1), rng.int(0, 5), rng.range(-9, 9), rng.range(0.84, 1.16), rng.range(-0.1, 0.1), rng.int(0, 999)]),
      tilt: rng.range(-3, 3), shadow: rng.chance(0.7),
    };
  },
  render(env) {
    const { W, H, sc, ctx } = env, p = env.cut.params, u = U(env), port = isPort(env);
    const units = slotsOf(env.cut.text);
    const n = units.length;
    if (!n) return null;
    const out = 1 - E.outCubic(J.clamp(env.pOut * 1.1));
    let perRow = port ? Math.min(n, n <= 4 ? 4 : Math.ceil(n / Math.ceil(n / 4))) : Math.min(n, n <= 8 ? 8 : Math.ceil(n / 2));
    // rows of slot indices; latin lyrics break between words
    const rowsA = [];
    if (hasLatin(env.cut.text)) {
      let cur = [], len = 0, i0 = 0;
      const words = [];
      for (let i = 0; i <= n; i++) { if (i === n || units[i] === ' ') { if (i > i0) words.push([i0, i]); i0 = i + 1; } }
      const target = Math.max(perRow, ...words.map(w => w[1] - w[0]));
      for (const [a0, a1] of words) {
        const wl = a1 - a0;
        if (cur.length && len + 1 + wl > target) { rowsA.push(cur); cur = []; len = 0; }
        if (cur.length) { cur.push(-1); len++; }
        for (let i = a0; i < a1; i++) cur.push(i);
        len += wl;
      }
      if (cur.length) rowsA.push(cur);
    } else for (let i = 0; i < n; i += perRow) rowsA.push(Array.from({ length: Math.min(perRow, n - i) }, (_, j) => i + j));
    perRow = Math.max(...rowsA.map(r => r.length));
    const rowsN = rowsA.length;
    const base = Math.min(W * 0.84 / (perRow * 1.18), H * 0.64 / (rowsN * 1.35), u * 0.26);
    const place = new Map();
    rowsA.forEach((r, ri) => r.forEach((idx, j) => { if (idx >= 0) place.set(idx, [ri, j, r.length]); }));
    const C = card(sc);
    const pal = [
      [plateCol(sc, [sc.ink, sc.fg]), null], [C.fill, null], [plateCol(sc, [sc.accent, sc.ink]), null], [plateCol(sc, [sc.accent2, sc.sub, sc.accent]), null],
      [darkest(sc), null], [C.fill, 'line'],
    ];
    let bb = null;
    const fonts = p.fonts && p.fonts.length ? p.fonts : ['gothic_black'];
    for (let i = 0; i < n; i++) {
      const ch = units[i]; if (ch === ' ') continue;
      const lk = (p.look && p.look[i]) || [0, 0, 0, 1, 0, i];
      const pl = place.get(i); if (!pl) continue;
      const [row, j, cnt] = pl;
      const sz = base * lk[3];
      const x = W / 2 + (j - (cnt - 1) / 2) * base * 1.18 + J.rs(lk[5], 1) * base * 0.05;
      const y = H / 2 + (row - (rowsN - 1) / 2) * base * 1.35 + lk[4] * base;
      const font = fonts[lk[0] % fonts.length];
      let [fill, mode] = pal[lk[1] % pal.length];
      if (J.contrast(fill, sc.bg) < 1.25 && mode !== 'line') mode = 'edge';
      const tc = onCol(sc, fill);
      const rot = lk[2] + p.tilt;
      const t0 = 0.03 + i * J.clamp(0.4 / n, 0.025, 0.07);
      const q = J.clamp((env.lt - t0) / 0.16);
      if (q <= 0) continue;
      const k = J.lerp(1.5, 1, E.outCubic(q)) * (1 - E.inCubic(env.pOut) * 0.25);
      const a = J.clamp(q * 2.5) * out;
      const adv = Math.max(0.55, J.metrics.adv(font, ch));
      const w = sz * (adv + 0.26 + 0.14 * J.r(lk[5], 11)), h = sz * (1.2 + 0.18 * J.r(lk[5], 12));
      // torn scrap polygon
      const pts = [], M = 4;
      for (let s2 = 0; s2 < 4; s2++) for (let m = 0; m < M; m++) {
        const f = m / M, jit = J.rs(lk[5], s2, m) * sz * 0.045;
        if (s2 === 0) pts.push([-w / 2 + w * f, -h / 2 + jit]);
        else if (s2 === 1) pts.push([w / 2 + jit, -h / 2 + h * f]);
        else if (s2 === 2) pts.push([w / 2 - w * f, h / 2 + jit]);
        else pts.push([-w / 2 + jit, h / 2 - h * f]);
      }
      ctx.save(); ctx.translate(x, y); ctx.rotate(rot * J.DEG); ctx.scale(k, k);
      if (p.shadow && env.pass === 'main') { ctx.save(); ctx.translate(sz * 0.05, sz * 0.07); env.poly(pts, J.rgba(darkest(sc), 0.45), a, false); ctx.restore(); }
      if (mode === 'line') { env.poly(pts, sc.bg, a, false); env.line(closeLoop(pts), sc.fg, Math.max(1.5, sz * 0.02), a, false); }
      else { env.poly(pts, fill, a, false); if (mode === 'edge') env.line(closeLoop(pts), J.mix(sc.fg, fill, 0.4), Math.max(1, sz * 0.012), a, false); }
      const r = J.mainDraw(env, { text: ch, font, size: sz, x: 0, y: sz * 0.02, color: mode === 'line' ? sc.fg : tc, plain: true, noHold: plateHold(env), mi: miAt(env, t0) });
      ctx.restore();
      if (r) bb = J.unionBB(bb, box(x - w / 2, y - h / 2, x + w / 2, y + h / 2));
    }
    return bb;
  },
});

/* ======================================================================
   12  newspaper — 新聞
   ====================================================================== */
reg('newspaper', {
  name: '新聞', tags: ['editorial', 'graphic', 'pop'], w: 0.8, ae: 'tile', busy: true, treat: 'safe', emph: 1.3, fits: n => n >= 1 && n <= 16,
  enterBias: { cut: 1.4, zoom: 1.3, slice: 1.2 },
  plan: (rng, cut, st) => ({
    font: rng.pick(fontsOf(st, ['display', 'serif'])), variant: hasLatin(cut.text) ? 'yoko' : rng.pick(['yoko', 'tate', 'tate']),
    spin: rng.chance(0.45), rev: rng.chance(0.6), seed: rng.int(1, 9999), mast: rng.pick(['字面新聞', '歌詞新報', '夜更新聞']), issue: rng.int(1000, 29999),
  }),
  render(env) {
    const { W, H, sc, ctx } = env, p = env.cut.params, u = U(env), port = isPort(env);
    const C = card(sc);
    const ls = smallSize(env);
    // page geometry (newsprint sheet with margins)
    const pw = W * (port ? 0.92 : 0.9), ph = H * (port ? 0.9 : 0.9);
    const cx = W / 2, cy = H / 2;
    // entrance: classic spinning newspaper, or a slide up
    let rot = 0, k = 1, dy = 0;
    const e = J.clamp(env.lt / 0.6);
    if (p.spin) { const q = E.outCubic(e); rot = (1 - q) * 720; k = Math.max(0.001, q); }
    else dy = (1 - E.outExpo(J.clamp(env.lt / 0.45))) * H * 0.9;
    const o = E.inCubic(env.pOut);
    dy += o * H * 0.08; const a = 1 - o;
    if (a <= 0.01) return null;
    ctx.save(); ctx.translate(cx, cy + dy); if (rot) ctx.rotate(rot * J.DEG); ctx.scale(k, k); ctx.translate(-pw / 2, -ph / 2);
    shadowR(env, 0, 0, pw, ph, 0, a, u * 0.02);
    env.rect(0, 0, pw, ph, C.fill, a, false);
    if (C.edge) env.line([[0, 0], [pw, 0], [pw, ph], [0, ph], [0, 0]], C.line, 1, a * 0.8, false);
    const m = pw * 0.035, tx = C.text, lw = Math.max(1, u * 0.0013);
    const inner = [m, m, pw - m * 2, ph - m * 2];
    const hl = plateCol(sc, [sc.accent], C.fill, 2) === sc.accent ? sc.accent : tx;
    // masthead (題字) — top right, vertical, in a plate
    const mw = Math.min(pw * 0.13, ph * 0.12), mh = Math.min(ph * 0.34, mw * 2.6);
    const mX = pw - m - mw, mY = m;
    env.rect(mX, mY, mw, mh, hl, a, false);
    env.draw({ text: p.mast, font: p.font, size: Math.min(mw * 0.62, mh * 0.9 / p.mast.length), vertical: true, x: mX + mw / 2, y: mY + mh / 2, track: 0.05, color: onCol(sc, hl), alpha: a, ghost: false });
    env.draw({ text: '第' + p.issue + '号', font: bodyF(env), size: ls * 0.7, x: mX + mw / 2, y: mY + mh + ls * 0.8, color: tx, alpha: a * 0.8, ghost: false });
    env.draw({ text: J.fmtTime(env.cut.start), font: monoF(env), size: ls * 0.7, x: mX + mw / 2, y: mY + mh + ls * 1.8, color: tx, alpha: a * 0.8, ghost: false });
    // tiers (段) of greeked vertical copy
    const bodyX0 = m, bodyX1 = mX - m * 0.6;
    const fs = J.clamp(u * 0.012, 7, 15), lh = fs * 1.45;
    const t0 = env.cut.text.trim();
    let bb = null;
    const reveal = tin(env, 0.2, 0.9, E.linear || E.lin);
    const tier = (x0, y0, x1, y1, seed) => { greek(env, x0, y0 + fs * 0.4, x1 - x0, y1 - y0 - fs * 0.8, lh, tx, a * 0.42, seed, true, reveal); };
    const photo = (x0, y0, w, h, kind) => { halftone(env, x0, y0, w, h, tx, J.mix(C.fill, tx, 0.12), a * reveal, p.seed, kind); env.line([[x0, y0 + h + fs * 0.6], [x0 + w * 0.7, y0 + h + fs * 0.6]], tx, fs * 0.5, a * 0.35, false); };
    const rule = (x0, y, x1) => env.line([[x0, y], [x1, y]], tx, lw, a * 0.7, false);
    if (p.variant === 'tate') {
      // big vertical headline on the right, next to the masthead
      const hw = pw * (port ? 0.34 : 0.26), hh = ph - m * 2;
      const hX1 = mX - m * 0.8, hX0 = hX1 - hw;
      const fb = fitBlock(strip(t0), p.font, hw * 0.92, hh * 0.94, { vertical: true, lead: 1.1, track: -0.02 }, 2);
      const size = fb.size;
      const mm = meas(fb.text, p.font, size, { vertical: true, lead: 1.1, track: -0.02 });
      const rev = p.rev;
      if (rev) env.rect(hX1 - mm.w - size * 0.3, m, mm.w + size * 0.3, mm.h + size * 0.4, tx, a, false);
      bb = J.mainDraw(env, { text: fb.text, font: p.font, size, x: hX1 - size * 0.15 - mm.w / 2, y: m + size * 0.2, vertical: true, align: 'left', lead: 1.1, track: -0.02, color: rev ? C.fill : tx, noHold: plateHold(env), mi: miAt(env, p.spin ? 0.45 : 0.3) });
      const bx1 = hX1 - mm.w - size * 0.5;
      // sub headline (lineText) in a smaller vertical column
      const sub = deckCopy(env);
      if (sub) env.draw({ text: [...strip(sub)].slice(0, 14).join(''), font: p.font, size: Math.min(size * 0.3, (ph - m * 2) / 15), vertical: true, align: 'left', x: bx1 - size * 0.2, y: m + size * 0.2, color: tx, alpha: a, ghost: false });
      const gx1 = bx1 - (sub ? size * 0.5 : 0);
      const tiers = port ? 5 : 4, th2 = (ph - m * 2) / tiers;
      for (let i = 0; i < tiers; i++) {
        const y0 = m + i * th2;
        if (i > 0) rule(m, y0, gx1);
        if (i === 1 && !port) { const iw = (gx1 - m) * 0.42; photo(m, y0 + fs, iw, th2 * 2 - fs * 3, 0); tier(m + iw + fs, y0, gx1, y0 + th2, p.seed + i); continue; }
        if (i === 2 && !port) { tier(m + (gx1 - m) * 0.42 + fs, y0, gx1, y0 + th2, p.seed + i); continue; }
        tier(m, y0, gx1, y0 + th2, p.seed + i);
      }
      rule(bodyX1 + m * 0.3, m + mh + ls * 2.6, pw - m);
      tier(mX, m + mh + ls * 2.8, pw - m, ph - m, p.seed + 9);
    } else {
      // horizontal banner headline across the top
      const hbw = bodyX1 - m, hbh = ph * (port ? 0.3 : 0.32);
      const fb = fitBlock(t0, p.font, hbw * 0.94, hbh * 0.84, { lead: 1.05, track: -0.02 }, port ? 3 : 2);
      const size = fb.size;
      const rev = p.rev;
      if (rev) env.rect(m, m, hbw, hbh, tx, a, false);
      bb = J.mainDraw(env, { text: fb.text, font: p.font, size, x: m + hbw / 2, y: m + hbh / 2, lead: 1.05, track: -0.02, color: rev ? C.fill : tx, noHold: plateHold(env), mi: miAt(env, p.spin ? 0.45 : 0.3) });
      const yb = m + hbh + fs;
      rule(m, yb, bodyX1);
      const tiers = port ? 5 : 3, th2 = (ph - m - yb) / tiers;
      for (let i = 0; i < tiers; i++) {
        const y0 = yb + i * th2;
        if (i > 0) rule(m, y0, pw - m);
        const x1 = i === 0 ? bodyX1 : pw - m;
        if (i === 1) { const iw = (x1 - m) * (port ? 0.5 : 0.3); photo(x1 - iw, y0 + fs, iw, th2 - fs * 3, 1); tier(m, y0, x1 - iw - fs, y0 + th2, p.seed + i); continue; }
        tier(m, y0, x1, y0 + th2, p.seed + i);
      }
      tier(mX, m + mh + ls * 2.8, pw - m, yb, p.seed + 9);
    }
    ctx.restore();
    const pb = box(cx - pw / 2, cy - ph / 2 + dy, cx + pw / 2, cy + ph / 2 + dy);
    return bb ? pb : null;
  },
});

/* ======================================================================
   13  vinyl — レコード
   ====================================================================== */
function disc(env, cx, cy, R, ang, labC, a, txt, seed, big = false) {
  const { sc, ctx } = env;
  const vin = J.lum(sc.bg) < 0.3 ? J.mix(darkest(sc), lightest(sc), 0.1) : darkest(sc);
  env.circle(cx, cy, R, vin, null, 0, a, false);
  if (env.pass === 'main') {
    // grooves + light sheen (sheen stays put while the disc turns)
    ctx.save(); ctx.globalAlpha = a;
    ctx.strokeStyle = J.rgba(lightest(sc), 0.1); ctx.lineWidth = Math.max(1, R * 0.004);
    ctx.beginPath();
    for (let i = 0; i < 16; i++) { const r = R * (0.42 + 0.55 * i / 15); ctx.moveTo(cx + r, cy); ctx.arc(cx, cy, r, 0, J.TAU); }
    ctx.stroke();
    const g = ctx.createConicGradient ? ctx.createConicGradient(-0.6, cx, cy) : null;
    if (g) {
      g.addColorStop(0, J.rgba(lightest(sc), 0)); g.addColorStop(0.08, J.rgba(lightest(sc), 0.16)); g.addColorStop(0.16, J.rgba(lightest(sc), 0));
      g.addColorStop(0.5, J.rgba(lightest(sc), 0)); g.addColorStop(0.58, J.rgba(lightest(sc), 0.12)); g.addColorStop(0.66, J.rgba(lightest(sc), 0)); g.addColorStop(1, J.rgba(lightest(sc), 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R * 0.98, 0, J.TAU); ctx.arc(cx, cy, R * 0.4, 0, J.TAU, true); ctx.fill();
    }
    ctx.restore();
  }
  const LR = R * (big ? 0.5 : 0.36);
  env.circle(cx, cy, LR, labC, null, 0, a, false);
  const lc = onCol(sc, labC);
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(ang * J.DEG);
  if (txt) arcText(env, txt, monoF(env), R * 0.034, 0, 0, LR * 0.84, -90, lc, a * 0.9, 0.25);
  env.arc(0, 0, LR * 0.7, 20, 160, lc, Math.max(1, R * 0.004), a * 0.6, false);
  ctx.restore();
  env.circle(cx, cy, R * 0.022, sc.bg, null, 0, a, false);
}
reg('vinyl', {
  name: 'レコード', tags: ['emotional', 'pop', 'calm'], w: 0.8, ae: 'ring', treat: 'safe', fits: n => n <= 16,
  enterBias: { blur: 1.3, zoom: 1.2, spin: 0.4 },
  plan: (rng, cut, st) => ({
    font: rng.pick(fontsOf(st, ['display', 'serif'])), variant: cut.n <= 6 ? rng.pick(['sleeve', 'label']) : 'sleeve', side: rng.pick(['A', 'B']), rpm: rng.pick(['33⅓', '45']),
    sleeve: rng.pick(['ink', 'accent', 'card']), cat: rng.int(100, 9999), arm: rng.chance(0.7),
  }),
  render(env) {
    const { W, H, sc, ctx } = env, p = env.cut.params, u = U(env), port = isPort(env);
    const out = tout(env), ls = smallSize(env);
    const t0 = env.cut.text.trim();
    const labC = plateCol(sc, [sc.accent, sc.accent2, sc.fg], darkest(sc), 1.5);
    const arc = 'SIDE ' + p.side + '  ·  ' + p.rpm + ' RPM  ·  No.' + lineNo(env) + '  ·  ';
    if (p.variant === 'label') {
      const R = Math.min(H * 0.44, W * 0.44);
      const cx = W / 2, cy = H / 2;
      const a = tin(env, 0, 0.3, E.outCubic) * (1 - J.clamp((env.pOut - 0.6) / 0.4));
      const T = Math.max(0.5, env.cut.inDur + 0.35);
      const ang = 540 * (1 - E.outCubic(J.clamp(env.lt / T))) - 300 * E.inCubic(env.pOut);
      const k = J.lerp(0.9, 1, E.outCubic(J.clamp(env.lt / 0.4)));
      ctx.save(); ctx.translate(cx, cy); ctx.scale(k, k); ctx.translate(-cx, -cy);
      disc(env, cx, cy, R, ang, labC, a, arc.repeat(2), p.cat, true);
      // tone arm swings in
      if (p.arm) {
        const q = tin(env, 0.2, 0.7, E.inOutCubic) * out;
        const px = cx + R * 1.02, py = cy - R * 0.92, L = R * 1.05, th = (-58 + q * 30) * J.DEG + Math.PI / 2;
        const ex = px + Math.cos(th) * L, ey = py + Math.sin(th) * L;
        env.line([[px, py], [ex, ey]], sc.sub, Math.max(3, R * 0.02), a, false);
        env.rect(ex - R * 0.035, ey - R * 0.035, R * 0.07, R * 0.07, sc.fg, a, false);
        env.circle(px, py, R * 0.06, sc.sub, null, 0, a, false);
      }
      const lab = R * 0.5;
      const fb = fitBlock(t0, p.font, lab * 1.3, lab * 0.8, { lead: 1.1 }, 2);
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(ang * J.DEG);
      const bb0 = J.mainDraw(env, { text: fb.text, font: p.font, size: Math.min(fb.size, lab * 0.55), x: 0, y: 0, lead: 1.1, color: onCol(sc, labC), noHold: true, plain: true });
      ctx.restore(); ctx.restore();
      return bb0 ? box(cx - lab, cy - lab, cx + lab, cy + lab) : null;
    }
    // sleeve + disc sliding out
    const S = port ? Math.min(W * 0.74, H * 0.4) : Math.min(H * 0.74, W * 0.42);
    const sx = port ? W / 2 : W / 2 - S * 0.28, sy = port ? H / 2 - S * 0.28 : H / 2;
    const ein = E.outExpo(J.clamp(env.lt / 0.45));
    const slide = E.inOutCubic(J.clamp((env.lt - 0.25) / 0.7)) * (1 - E.inOutCubic(env.pOut));
    const a = J.clamp(ein * 2) * (1 - J.clamp((env.pOut - 0.5) / 0.5));
    const off = (1 - ein) * S * 0.25;
    const R = S * 0.47;
    const dcx = port ? sx : sx + slide * S * 0.56, dcy = port ? sy + slide * S * 0.56 : sy;
    disc(env, dcx + (port ? 0 : off), dcy + (port ? off : 0), R, env.ltb * 120, labC, a, arc.repeat(2), p.cat);
    const slC = p.sleeve === 'card' ? card(sc).fill : plateCol(sc, p.sleeve === 'accent' ? [sc.accent, sc.ink] : [sc.ink, sc.fg]);
    const tc = onCol(sc, slC);
    const x0 = sx - S / 2 + (port ? 0 : off), y0 = sy - S / 2 + (port ? off : 0);
    shadowR(env, x0, y0, S, S, 0, a, u * 0.015);
    env.rect(x0, y0, S, S, slC, a, false);
    if (J.contrast(slC, sc.bg) < 1.4) env.line([[x0, y0], [x0 + S, y0], [x0 + S, y0 + S], [x0, y0 + S], [x0, y0]], J.mix(sc.fg, slC, 0.4), 1.5, a, false);
    const m = S * 0.07;
    const fa = tin(env, 0.15, 0.4, E.outCubic) * out;
    env.draw({ text: 'JZR-' + p.cat, font: monoF(env), size: ls * 0.9, track: 0.2, align: 'right', x: x0 + S - m, y: y0 + m + ls * 0.3, color: tc, alpha: fa, ghost: false });
    env.draw({ text: 'SIDE ' + p.side, font: monoF(env), size: ls * 0.9, track: 0.2, align: 'left', x: x0 + m, y: y0 + m + ls * 0.3, color: tc, alpha: fa, ghost: false });
    env.line([[x0 + m, y0 + m + ls * 1.3], [x0 + m + (S - m * 2) * fa, y0 + m + ls * 1.3]], tc, Math.max(1, u * 0.0015), 0.8, false);
    const fb = fitBlock(t0, p.font, S - m * 2, S * 0.52, { lead: 1.05, track: 0.01 }, 4);
    const size = Math.min(fb.size, S * 0.3);
    const mm = meas(fb.text, p.font, size, { lead: 1.05, track: 0.01 });
    const bb = J.mainDraw(env, { text: fb.text, font: p.font, size, x: x0 + m, y: y0 + S - m - ls * 1.6 - mm.h / 2, align: 'left', lead: 1.05, track: 0.01, color: tc, noHold: plateHold(env), mi: miAt(env, 0.22) });
    env.draw({ text: (romajiOf(env) || J.fmtTime(env.cut.start)).slice(0, 26), font: monoF(env), size: ls * 0.8, track: 0.15, align: 'left', x: x0 + m, y: y0 + S - m, color: tc, alpha: fa * 0.8, ghost: false });
    return bb || box(x0, y0, x0 + S, y0 + S);
  },
});

/* ======================================================================
   14  cassette — カセット
   ====================================================================== */
reg('cassette', {
  name: 'カセット', tags: ['emotional', 'pop', 'calm'], w: 0.8, ae: 'pill', treat: 'safe', portrait: 0.7, fits: n => n <= 16,
  enterBias: { type: 1.6, wipe: 1.3, cut: 1.2 },
  plan: (rng, cut, st) => ({
    font: rng.chance(0.55) ? 'klee' : rng.pick(fontsOf(st, ['body', 'display'])), shell: rng.pick(['ink', 'accent', 'clear']), band: rng.pick(['accent', 'ink', 'stripe']),
    side: rng.pick(['A', 'B']), tilt: rng.range(-4, 4), len: rng.pick(['C-46', 'C-60', 'C-90']),
  }),
  render(env) {
    const { W, H, sc, ctx } = env, p = env.cut.params, u = U(env), port = isPort(env);
    const out = tout(env), ls = smallSize(env);
    const cw = port ? W * 0.92 : Math.min(W * 0.66, H * 0.8 * 1.58), ch = cw / 1.58;
    const ein = E.outCubic(J.clamp(env.lt / 0.5)), eo = E.inCubic(env.pOut);
    const a = J.clamp(ein * 2) * (1 - eo);
    if (a <= 0.01) return null;
    const cx = W / 2, cy = H / 2 + (1 - ein) * H * 0.6 + eo * H * 0.15;
    const rot = p.tilt * (1 - eo) + (1 - ein) * 12;
    const clear = p.shell === 'clear';
    const shellC = clear ? sc.bg : plateCol(sc, p.shell === 'accent' ? [sc.accent, sc.ink] : [sc.ink, sc.fg]);
    const lineC = clear ? sc.fg : J.mix(shellC, onCol(sc, shellC), 0.3);
    const C = card(sc);
    const labF = J.contrast(C.fill, shellC) > 1.3 ? C.fill : plateCol(sc, [sc.bg, sc.fg], shellC, 1.5);
    const labT = onCol(sc, labF);
    const bandC = p.band === 'ink' ? plateCol(sc, [sc.ink, sc.fg], labF, 2) : plateCol(sc, [sc.accent, sc.accent2, sc.ink], labF, 1.6);
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot * J.DEG);
    const x0 = -cw / 2, y0 = -ch / 2, r = ch * 0.05;
    shadowR(env, x0, y0, cw, ch, r, a, u * 0.015);
    env.rrect(x0, y0, cw, ch, r, shellC, a, false, clear ? sc.fg : null, Math.max(2, u * 0.003));
    // screws
    [[x0 + ch * 0.07, y0 + ch * 0.07], [x0 + cw - ch * 0.07, y0 + ch * 0.07], [x0 + ch * 0.07, y0 + ch - ch * 0.07], [x0 + cw - ch * 0.07, y0 + ch - ch * 0.07], [0, y0 + ch * 0.9]].forEach(([sx2, sy2]) => env.circle(sx2, sy2, ch * 0.022, null, lineC, Math.max(1, u * 0.0015), a, false));
    // label
    const lx = x0 + cw * 0.06, ly = y0 + ch * 0.08, lw2 = cw * 0.88, lh2 = ch * 0.62;
    env.rrect(lx, ly, lw2, lh2, ch * 0.02, labF, a, false);
    if (p.band === 'stripe') { env.rect(lx, ly + lh2 * 0.62, lw2, lh2 * 0.06, plateCol(sc, [sc.accent], labF, 1.4), a, false); env.rect(lx, ly + lh2 * 0.7, lw2, lh2 * 0.06, plateCol(sc, [sc.accent2, sc.ink], labF, 1.4), a, false); }
    else env.rect(lx, ly + lh2 * 0.62, lw2, lh2 * 0.12, bandC, a, false);
    // side letter box
    const sb = lh2 * 0.3;
    env.rect(lx + lw2 * 0.03, ly + lh2 * 0.08, sb, sb, labT, a, false);
    env.draw({ text: p.side, font: 'gothic_black', size: sb * 0.78, x: lx + lw2 * 0.03 + sb / 2, y: ly + lh2 * 0.08 + sb / 2, color: labF, alpha: a, ghost: false });
    env.draw({ text: p.len + '  ·  NR  ·  No.' + lineNo(env), font: monoF(env), size: ls * 0.75, track: 0.2, align: 'right', x: lx + lw2 * 0.97, y: ly + lh2 * 0.9, color: labT, alpha: a * 0.8, ghost: false });
    // writing lines
    const tx0 = lx + lw2 * 0.06 + sb, tw = lw2 * 0.9 - sb;
    const rl = ly + lh2 * 0.5;
    env.line([[tx0, rl], [tx0 + tw, rl]], labT, Math.max(1, u * 0.0012), a * 0.35, false);
    // window + reels
    const wy0 = y0 + ch * 0.44;
    env.rrect(-cw * 0.3, wy0, cw * 0.6, ch * 0.24, ch * 0.12, J.mix(shellC, darkest(sc), 0.35), a, false);
    const rr = ch * 0.1, rxs = [-cw * 0.19, cw * 0.19], ry = wy0 + ch * 0.12;
    const spin = env.ltb * 200 * (1 + eo * 3);
    rxs.forEach((rx, i) => {
      env.circle(rx, ry, rr * (i ? 0.75 : 1.05), J.mix(darkest(sc), shellC, 0.2), null, 0, a, false);
      env.circle(rx, ry, rr * 0.5, labF, null, 0, a, false);
      for (let k = 0; k < 6; k++) { const an = (spin + k * 60) * J.DEG; env.line([[rx + Math.cos(an) * rr * 0.2, ry + Math.sin(an) * rr * 0.2], [rx + Math.cos(an) * rr * 0.46, ry + Math.sin(an) * rr * 0.46]], labT, Math.max(2, rr * 0.08), a, false); }
    });
    // lyric handwritten on the top line
    const t0 = env.cut.text.trim();
    const fb = fitBlock(t0, p.font, tw, lh2 * 0.46, { lead: 1.05 }, 2);
    const size = Math.min(fb.size, lh2 * 0.32);
    const mm = meas(fb.text, p.font, size, { lead: 1.05 });
    const bb = J.mainDraw(env, { text: fb.text, font: p.font, size, x: tx0 + size * 0.1, y: rl - mm.h / 2 - size * 0.08, align: 'left', lead: 1.05, rot: -1.2, color: labT, noHold: plateHold(env), mi: miAt(env, 0.28) });
    ctx.restore();
    return bb ? box(cx - cw / 2, cy - ch / 2, cx + cw / 2, cy + ch / 2) : null;
  },
});

/* ======================================================================
   15  bookSpine — 背表紙
   ====================================================================== */
reg('bookSpine', {
  name: '背表紙', tags: ['calm', 'editorial', 'emotional'], w: 0.8, ae: 'vcols', treat: 'safe', fits: n => n >= 1 && n <= 14, portrait: 1.1,
  enterBias: { wipe: 1.3, blur: 1.2, cut: 1.2 },
  plan: (rng, cut, st) => {
    const port = portOf(cut);
    const nb = port ? rng.int(5, 7) : rng.int(8, 12);
    return {
      font: rng.pick(fontsOf(st, ['serif', 'display'])), variant: hasLatin(cut.text) ? 'pile' : rng.pick(['shelf', 'shelf', 'pile']),
      books: Array.from({ length: nb }, () => [rng.range(0.5, 1), rng.range(0.62, 0.92), rng.int(0, 5), rng.int(0, 3)]), hero: rng.pick(['accent', 'ink']), vol: rng.int(1, 24),
    };
  },
  render(env) {
    const { W, H, sc, ctx } = env, p = env.cut.params, u = U(env), port = isPort(env);
    const out = tout(env), ls = smallSize(env);
    const t0 = env.cut.text.trim();
    const heroC = plateCol(sc, p.hero === 'accent' ? [sc.accent, sc.ink] : [sc.ink, sc.accent]);
    const htc = onCol(sc, heroC);
    const pal = [J.mix(sc.bg, sc.fg, 0.18), J.mix(sc.bg, sc.sub, 0.45), J.mix(sc.bg, sc.accent, 0.35), sc.dim, J.mix(sc.bg, sc.fg, 0.32), J.mix(sc.bg, sc.accent2 || sc.sub, 0.3)];
    const eo = E.inCubic(env.pOut);
    let bb = null;
    if (p.variant === 'pile') {
      // books lying flat, spines facing us; the hero sits mid-pile
      const bw = port ? W * 0.84 : Math.min(W * 0.62, H * 1.1);
      const fb = fitBlock(t0, p.font, bw * 0.78, H * 0.16, { track: 0.04 }, 1);
      const size = Math.min(fb.size, u * 0.12);
      const hh = size * 1.7;
      const nb = Math.min(6, p.books.length);
      const hi = Math.floor(nb / 2);
      const hs = p.books.slice(0, nb).map((b, i) => (i === hi ? hh : H * 0.045 + b[0] * H * 0.05));
      const total = hs.reduce((q, h) => q + h, 0);
      let y = H / 2 + total / 2 + H * 0.03;
      const floor = y;
      env.line([[W * 0.08, floor], [W * 0.92, floor]], sc.sub, Math.max(2, u * 0.003), tin(env, 0, 0.4) * out, false);
      for (let i = 0; i < nb; i++) {
        const b = p.books[i], h = hs[i];
        const w = i === hi ? bw : bw * (0.72 + 0.26 * b[1]);
        const xo = J.rs(b[2], i, 3) * bw * 0.05;
        const t = 0.04 + i * 0.09;
        const e = E.outCubic(J.clamp((env.lt - t) / 0.3));
        y -= h;
        if (e <= 0) continue;
        const yy = y - (1 - e) * H * 0.6 - eo * (nb - i) * H * 0.02;
        const col = i === hi ? heroC : pal[b[2] % pal.length];
        const a = J.clamp(e * 3) * (1 - eo);
        env.rect(W / 2 - w / 2 + xo, yy, w, h - 2, col, a, false);
        const bc = i === hi ? htc : J.mix(col, sc.fg, 0.35);
        env.rect(W / 2 - w / 2 + xo + w * 0.06, yy, Math.max(2, w * 0.008), h - 2, bc, a * 0.7, false);
        env.rect(W / 2 + w / 2 + xo - w * 0.07, yy, Math.max(2, w * 0.008), h - 2, bc, a * 0.7, false);
        if (i === hi) {
          env.draw({ text: pad2(p.vol), font: monoF(env), size: h * 0.24, x: W / 2 + w / 2 + xo - w * 0.035, y: yy + h / 2, rot: -90, color: htc, alpha: a, ghost: false });
          bb = J.mainDraw(env, { text: fb.text, font: p.font, size, x: W / 2 + xo - w * 0.02, y: yy + h / 2, track: 0.04, color: htc, noHold: plateHold(env), mi: miAt(env, 0.1 + hi * 0.09 + 0.2) });
        } else if (h > H * 0.05) env.rect(W / 2 - w * 0.22 + xo, yy + h * 0.42, w * 0.3 * b[1], h * 0.16, J.mix(col, sc.fg, 0.3), a * 0.7, false);
      }
      return bb;
    }
    // shelf of standing books
    const n = J.glyphCount(t0);
    const cols = n > (port ? 12 : 10) ? 2 : 1;
    const vt = cols > 1 ? brk(strip(t0), Math.ceil(n / 2)) : strip(t0);
    const per = Math.max(...vt.split('\n').map(l => J.glyphCount(l)));
    const shelfY = H * (port ? 0.84 : 0.88);
    const maxH = H * (port ? 0.7 : 0.78);
    const size = Math.min((maxH * 0.76) / (Math.max(per, 3) * 1.02 + 1.9), u * (cols > 1 ? 0.09 : port ? 0.14 : 0.115));
    const hw = size * (cols > 1 ? 2.9 : 1.75), hh = Math.min(maxH, (per * size * 1.02 + size * 1.9) / 0.76);
    const nb = p.books.length;
    const hi = Math.floor(nb / 2);
    const ws = p.books.map((b, i) => (i === hi ? hw : size * (0.9 + 0.8 * b[0])));
    const tot = ws.reduce((q, w) => q + w, 0) + nb * 2;
    let x = W / 2 - tot / 2;
    const shA = tin(env, 0, 0.4) * out;
    env.rect(W * 0.03, shelfY, W * 0.94 * shA, Math.max(4, u * 0.008), sc.sub, 1, false);
    for (let i = 0; i < nb; i++) {
      const b = p.books[i], w = ws[i];
      const h = i === hi ? hh : Math.min(maxH, hh * (0.7 + 0.3 * b[1]));
      const t = 0.03 + Math.abs(i - hi) * 0.05;
      const e = E.outExpo(J.clamp((env.lt - t) / 0.4));
      const bx = x; x += w + 2;
      if (e <= 0 || bx + w < 0 || bx > W) continue;
      const lift = i === hi ? E.inOutCubic(J.clamp((env.lt - 0.35) / 0.4)) * size * 0.6 * (1 - eo) : 0;
      const yy = shelfY - h * e - lift + eo * h * 1.05;
      const a = (1 - eo * 0.4);
      ctx.save(); ctx.beginPath(); ctx.rect(-W, -H, W * 3, shelfY + H - 1); ctx.clip();
      const col = i === hi ? heroC : pal[b[2] % pal.length];
      env.rect(bx, yy, w, h, col, a, false);
      const bc = i === hi ? htc : J.mix(col, sc.fg, 0.3);
      const bandH = Math.max(2, h * 0.012);
      [0.06, 0.08, 0.92, 0.94].forEach(f => env.rect(bx, yy + h * f, w, bandH, bc, a * 0.75, false));
      if (i === hi) {
        env.rect(bx + w * 0.2, yy + h * 0.11, w * 0.6, size * 0.8, htc, a, false);
        env.draw({ text: kanjiNum(p.vol), font: serifF(env), size: size * 0.46, x: bx + w / 2, y: yy + h * 0.11 + size * 0.4, color: heroC, alpha: a, ghost: false });
        env.circle(bx + w / 2, yy + h * 0.87 - size * 0.3, size * 0.26, null, htc, Math.max(1.5, size * 0.04), a, false);
        bb = J.mainDraw(env, { text: vt, font: p.font, size, x: bx + w / 2, y: yy + h * 0.11 + size * 1.2, vertical: true, align: 'left', lead: 1.24, track: 0.02, color: htc, noHold: plateHold(env), mi: miAt(env, 0.3) });
      } else {
        const tl = h * (0.25 + 0.3 * b[1]);
        if (b[3] > 0) env.rect(bx + w * 0.38, yy + h * 0.16, w * 0.24, tl, bc, a * 0.55, false);
        if (b[3] === 2) env.circle(bx + w / 2, yy + h * 0.84, w * 0.14, bc, null, 0, a * 0.55, false);
      }
      ctx.restore();
    }
    return bb;
  },
});

/* ======================================================================
   16  polaroid — ポラロイド
   ====================================================================== */
reg('polaroid', {
  name: 'ポラロイド', tags: ['emotional', 'calm', 'pop'], w: 0.9, ae: 'labels', treat: 'safe', fits: n => n >= 1 && n <= 16,
  enterBias: { blur: 1.6, cut: 1.2, drop: 1.2, slice: 0.5 },
  plan: (rng, cut, st) => {
    const n = cut.n;
    const k = n <= 5 ? 1 : n <= 10 ? 2 : 3;
    return {
      font: rng.pick(fontsOf(st, ['display', 'serif'])), pen: rng.chance(0.6) ? 'klee' : rng.pick(fontsOf(st, ['body'])), chunks: splitK(cut.text, k, k),
      tilts: [rng.range(-7, 7), rng.range(-7, 7), rng.range(-7, 7)], img: rng.pick(['dark', 'accent', 'dusk']), tape: rng.chance(0.5),
    };
  },
  render(env) {
    const { W, H, sc, ctx } = env, p = env.cut.params, u = U(env), port = isPort(env);
    const chunks = (p.chunks && p.chunks.length ? p.chunks : [env.cut.text.trim()]).filter(Boolean);
    const k = chunks.length;
    const C = card(sc);
    const eo = E.inCubic(env.pOut);
    // frame size and positions
    let fw;
    if (port) fw = Math.min(W * (k === 1 ? 0.78 : 0.62), H * 0.78 / (k === 1 ? 1.2 : 1 + (k - 1) * 0.72) / 1.2);
    else fw = Math.min(H * 0.8 / 1.2, W * 0.86 / (k === 1 ? 1 : k * 0.92));
    const fh = fw * 1.2, iw = fw * 0.88;
    const pos = i => {
      if (k === 1) return [W / 2, H / 2];
      if (port) return [W / 2 + (i % 2 ? 1 : -1) * W * 0.07, H / 2 + (i - (k - 1) / 2) * fh * 0.72];
      return [W / 2 + (i - (k - 1) / 2) * fw * 0.92, H / 2 + (i % 2 ? 1 : -1) * H * 0.025];
    };
    const imgC = p.img === 'accent' ? plateCol(sc, [sc.accent, sc.ink], C.fill, 1.8) : p.img === 'dusk' ? J.mix(darkest(sc), sc.accent, 0.35) : darkest(sc);
    const tc = onCol(sc, imgC);
    let bb = null;
    chunks.forEach((ch, i) => {
      const [x, y] = pos(i);
      const t = 0.02 + i * 0.16;
      const e = E.outCubic(J.clamp((env.lt - t) / 0.4));
      if (e <= 0) return;
      const rot = p.tilts[i % 3] * (k === 1 ? 0.6 : 1) + (1 - e) * 14;
      const yy = y - (1 - e) * H * 0.15 + eo * H * 0.1 * (i + 1);
      const a = J.clamp(e * 2.5) * (1 - eo);
      ctx.save(); ctx.translate(x, yy); ctx.rotate(rot * J.DEG);
      shadowR(env, -fw / 2, -fh / 2, fw, fh, fw * 0.01, a, u * 0.014);
      env.rect(-fw / 2, -fh / 2, fw, fh, C.fill, a, false);
      if (C.edge) env.line([[-fw / 2, -fh / 2], [fw / 2, -fh / 2], [fw / 2, fh / 2], [-fw / 2, fh / 2], [-fw / 2, -fh / 2]], C.line, 1.2, a, false);
      const ix = -iw / 2, iy = -fh / 2 + fw * 0.06;
      // developing: the picture fades from milky grey to its colours
      const dev = E.inOutCubic(J.clamp((env.lt - t - 0.1) / 0.9));
      env.rect(ix, iy, iw, iw, J.mix(J.mix(C.fill, sc.sub, 0.35), imgC, dev), a, false);
      // soft light leak: two translucent discs (cheap, no gradient fill)
      env.circle(ix + iw * 0.72, iy + iw * 0.26, iw * 0.3, J.rgba(lightest(sc), 0.07 * dev), null, 0, a, false);
      env.circle(ix + iw * 0.72, iy + iw * 0.26, iw * 0.16, J.rgba(lightest(sc), 0.08 * dev), null, 0, a, false);
      if (p.tape) env.rect(-fw * 0.16, -fh / 2 - fw * 0.05, fw * 0.32, fw * 0.1, J.rgba(lightest(sc), 0.55), a, false);
      const fb = fitBlock(ch, p.font, iw * 0.84, iw * 0.7, { lead: 1.1 }, 3);
      const r = J.mainDraw(env, { text: fb.text, font: p.font, size: Math.min(fb.size, iw * 0.34), x: 0, y: iy + iw / 2, lead: 1.1, color: tc, alpha: 0.25 + 0.75 * dev, noHold: plateHold(env), mi: miAt(env, t + 0.15) });
      // handwritten caption in the thick bottom border
      const capA = J.clamp((env.lt - t - 0.5) / 0.4) * a;
      const cap = i === k - 1 ? (romajiOf(env) || J.fmtTime(env.cut.start)) : ('No.' + lineNo(env) + '-' + (i + 1));
      if (capA > 0.01) env.draw({ text: cap.slice(0, 20), font: p.pen, size: Math.min(fw * 0.07, (fw * 0.84) / Math.max(6, cap.length * 0.62)), x: 0, y: iy + iw + (fh / 2 - iy - iw) * 0.5, rot: -2, color: C.text, alpha: capA * 0.85, ghost: false });
      ctx.restore();
      if (r) bb = J.unionBB(bb, box(x - fw / 2, yy - fh / 2, x + fw / 2, yy + fh / 2));
    });
    return bb;
  },
});

/* ======================================================================
   17  stampSheet — 切手シート
   ====================================================================== */
function perfRect(env, x, y, w, h, hole, col, a) {
  // punch holes along the four edges (drawn as dots of the sheet margin colour)
  if (env.pass !== 'main' || a <= 0.01) return;
  const ctx = env.ctx; ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = col; ctx.beginPath();
  const nx = Math.max(2, Math.round(w / (hole * 3.2))), ny = Math.max(2, Math.round(h / (hole * 3.2)));
  for (let i = 0; i <= nx; i++) { const xx = x + w * i / nx; ctx.moveTo(xx + hole, y); ctx.arc(xx, y, hole, 0, J.TAU); ctx.moveTo(xx + hole, y + h); ctx.arc(xx, y + h, hole, 0, J.TAU); }
  for (let j = 1; j < ny; j++) { const yy = y + h * j / ny; ctx.moveTo(x + hole, yy); ctx.arc(x, yy, hole, 0, J.TAU); ctx.moveTo(x + w + hole, yy); ctx.arc(x + w, yy, hole, 0, J.TAU); }
  ctx.fill(); ctx.restore();
}
reg('stampSheet', {
  name: '切手シート', tags: ['pop', 'graphic', 'calm'], w: 0.7, ae: 'tile', treat: 'safe', fits: n => n >= 1 && n <= 12,
  enterBias: { pop: 1.4, cut: 1.3, blur: 1.1 },
  plan: (rng, cut, st) => {
    const port = portOf(cut);
    const cols = port ? 3 : 5, rows = port ? 5 : 3;
    return { font: rng.pick(fontsOf(st, ['display', 'serif'])), cols, rows, hc: port ? rng.int(0, 1) : 1, hr: port ? 1 : rng.int(0, 1), val: rng.pick([63, 84, 94, 110, 120, 140]), motif: rng.pick(['circle', 'wave', 'char']), tear: rng.chance(0.6) };
  },
  render(env) {
    const { W, H, sc, ctx } = env, p = env.cut.params, u = U(env);
    const out = tout(env), ls = smallSize(env);
    const cols = p.cols, rows = p.rows;
    const C = card(sc);
    const cell = Math.min(W * 0.86 / (cols + 0.4), H * 0.84 / (rows + 0.6));
    const sw = cols * cell, sh = rows * cell;
    const sx = W / 2 - sw / 2, sy = H / 2 - sh / 2 + cell * 0.1;
    const m = cell * 0.2;
    const sa = tin(env, 0, 0.35, E.outCubic) * (1 - J.clamp((env.pOut - 0.5) / 0.5));
    if (sa <= 0.01) return null;
    // sheet (selvage)
    shadowR(env, sx - m, sy - m * 1.8, sw + m * 2, sh + m * 2.8, 0, sa, u * 0.012);
    env.rect(sx - m, sy - m * 1.8, sw + m * 2, sh + m * 2.8, C.fill, sa, false);
    if (C.edge) env.line([[sx - m, sy - m * 1.8], [sx + sw + m, sy - m * 1.8], [sx + sw + m, sy + sh + m], [sx - m, sy + sh + m], [sx - m, sy - m * 1.8]], C.line, 1.2, sa, false);
    env.draw({ text: 'JIZURA POST  ·  ' + p.val + ' × ' + (cols * rows - 3) + '  ·  No.' + lineNo(env), font: monoF(env), size: Math.min(ls * 0.8, m * 0.7), track: 0.2, align: 'left', x: sx, y: sy - m * 0.9, color: C.text, alpha: sa * 0.7, ghost: false });
    const port2 = rows > cols;
    const spc = port2 ? 2 : 3, spr = port2 ? 3 : 2;
    const hc = Math.min(p.hc, cols - spc), hr = Math.min(p.hr, rows - spr);
    const tones = [plateCol(sc, [sc.accent], C.fill, 1.3), J.mix(C.fill, C.text, 0.18), plateCol(sc, [sc.accent2, sc.sub], C.fill, 1.3), J.mix(C.fill, sc.accent, 0.45)];
    const t0 = env.cut.text.trim();
    const first = strip(t0)[0] || '';
    const hole = cell * 0.035;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const hero = c >= hc && c < hc + spc && r >= hr && r < hr + spr;
      if (hero) continue;
      const e = E.outBack(J.clamp((env.lt - 0.05 - (c + r) * 0.03) / 0.3), 1.5) * out;
      if (e <= 0.01) continue;
      const x = sx + c * cell, y = sy + r * cell, pad = cell * 0.1;
      const tone = tones[(c + r * 2) % tones.length], tt = onCol(sc, tone);
      const q = (cell - pad * 2) * e;
      const ox = x + cell / 2 - q / 2, oy = y + cell / 2 - q / 2;
      env.rect(ox, oy, q, q, tone, 1, false);
      if (e > 0.6) {
        const cxm = x + cell / 2, cym = y + cell / 2;
        if (p.motif === 'circle') env.circle(cxm, cym + q * 0.08, q * 0.24, null, tt, Math.max(1.5, q * 0.03), 0.6, false);
        else if (p.motif === 'wave') { const pts = []; for (let i = 0; i <= 16; i++) pts.push([ox + q * 0.15 + q * 0.7 * i / 16, cym + q * 0.1 + Math.sin(i / 16 * J.TAU * 1.5) * q * 0.08]); env.line(pts, tt, Math.max(1.5, q * 0.03), 0.6, false); }
        else env.draw({ text: first, font: p.font, size: q * 0.45, x: cxm, y: cym + q * 0.08, color: tt, alpha: 0.5, ghost: false });
        env.draw({ text: String(p.val), font: monoF(env), size: q * 0.16, align: 'left', x: ox + q * 0.08, y: oy + q * 0.13, color: tt, alpha: 0.9, ghost: false });
      }
    }
    // perforations between all stamps
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) perfRect(env, sx + c * cell, sy + r * cell, cell, cell, hole, sc.bg === C.fill ? J.mix(C.fill, C.text, 0.2) : sc.bg, sa * 0.9);
    // the hero stamp (3×2 / 2×3) — lifts and tears away on exit
    const hx = sx + hc * cell, hy = sy + hr * cell, hw = cell * spc, hh = cell * spr, hs = Math.min(hw, hh);
    const he = E.outBack(J.clamp((env.lt - 0.12) / 0.35), 1.3);
    const tear = p.tear ? E.inCubic(env.pOut) : 0;
    const ha = J.clamp(he * 2) * (p.tear ? 1 - J.clamp((env.pOut - 0.6) / 0.4) : out);
    ctx.save(); ctx.translate(hx + hw / 2 + tear * cell * 0.4, hy + hh / 2 - tear * cell * 0.8); ctx.rotate((tear * 14 + (1 - he) * -6) * J.DEG); ctx.scale(0.9 + 0.1 * he + tear * 0.06, 0.9 + 0.1 * he + tear * 0.06);
    if (tear > 0) shadowR(env, -hw / 2, -hh / 2, hw, hh, 0, ha, u * 0.02 * (1 + tear * 2));
    env.rect(-hw / 2, -hh / 2, hw, hh, C.fill, ha, false);
    perfRect(env, -hw / 2, -hh / 2, hw, hh, hole * 1.2, sc.bg === C.fill ? J.mix(C.fill, C.text, 0.2) : sc.bg, ha);
    const ip = hs * 0.07;
    const heroC = plateCol(sc, [sc.accent, sc.ink], C.fill, 1.8);
    env.rect(-hw / 2 + ip, -hh / 2 + ip, hw - ip * 2, hh - ip * 2, heroC, ha, false);
    const htc = onCol(sc, heroC);
    env.draw({ text: String(p.val), font: monoF(env), size: hs * 0.1, align: 'left', x: -hw / 2 + ip * 1.8, y: -hh / 2 + ip * 2.4, color: htc, alpha: ha, ghost: false });
    env.draw({ text: 'LYRIC  ' + lineNo(env), font: monoF(env), size: hs * 0.045, track: 0.3, align: 'right', x: hw / 2 - ip * 1.8, y: hh / 2 - ip * 1.9, color: htc, alpha: ha * 0.8, ghost: false });
    const fb = fitBlock(t0, p.font, hw * 0.76, hh * 0.56, { lead: 1.08 }, 3);
    const bb = J.mainDraw(env, { text: fb.text, font: p.font, size: Math.min(fb.size, hs * 0.34), x: 0, y: hs * 0.03, lead: 1.08, color: htc, noHold: plateHold(env), mi: miAt(env, 0.15) });
    ctx.restore();
    return bb ? box(hx, hy, hx + hw, hy + hh) : null;
  },
});

/* ======================================================================
   18  postcard — はがき
   ====================================================================== */
reg('postcard', {
  name: 'はがき', tags: ['emotional', 'calm', 'editorial'], w: 0.8, ae: 'vcols', treat: 'safe', fits: n => n >= 1 && n <= 18,
  enterBias: { blur: 1.3, type: 1.3, wipe: 1.2 },
  plan: (rng, cut, st) => ({
    font: rng.chance(0.4) ? 'klee' : rng.pick(fontsOf(st, ['serif', 'display'])), tilt: rng.range(-5, 5), val: rng.pick([63, 85, 110]),
    zip: Array.from({ length: 7 }, () => rng.int(0, 9)).join(''), mark: rng.range(-18, 18), stamp: rng.pick(['circle', 'mount', 'wave']),
  }),
  render(env) {
    const { W, H, sc, ctx } = env, p = env.cut.params, u = U(env), port = isPort(env);
    const out = tout(env), ls = smallSize(env);
    const C = card(sc);
    const vertCard = port;
    const cw = vertCard ? Math.min(W * 0.8, H * 0.8 / 1.48) : Math.min(W * 0.66, H * 0.84 * 1.48);
    const ch = vertCard ? cw * 1.48 : cw / 1.48;
    const ein = E.outCubic(J.clamp(env.lt / 0.55)), eo = E.inCubic(env.pOut);
    const a = J.clamp(ein * 2) * (1 - eo);
    if (a <= 0.01) return null;
    const cx = W / 2 - (1 - ein) * W * 0.4 + eo * W * 0.3, cy = H / 2 + (1 - ein) * H * 0.05;
    const rot = p.tilt + (1 - ein) * -18 + eo * 10;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot * J.DEG);
    const x0 = -cw / 2, y0 = -ch / 2;
    shadowR(env, x0, y0, cw, ch, cw * 0.012, a, u * 0.016);
    env.rrect(x0, y0, cw, ch, cw * 0.012, C.fill, a, false, C.edge ? C.line : null, 1.2);
    const red = plateCol(sc, [sc.accent, sc.accent2, C.text], C.fill, 1.8);
    const m = Math.min(cw, ch) * 0.07;
    // stamp (top-left) with perforated edge
    const stw = Math.min(cw, ch) * 0.2, sth = stw * 1.2;
    const stx = x0 + m, sty = y0 + m;
    const stC = plateCol(sc, [sc.accent2, sc.accent, sc.ink], C.fill, 1.5);
    env.rect(stx, sty, stw, sth, stC, a, false);
    perfRect(env, stx, sty, stw, sth, stw * 0.035, C.fill, a);
    const stt = onCol(sc, stC);
    if (p.stamp === 'circle') env.circle(stx + stw / 2, sty + sth * 0.56, stw * 0.26, stt, null, 0, a * 0.8, false);
    else if (p.stamp === 'mount') env.poly([[stx + stw * 0.12, sty + sth * 0.78], [stx + stw * 0.5, sty + sth * 0.3], [stx + stw * 0.88, sty + sth * 0.78]], stt, a * 0.8, false);
    else { const pts = []; for (let i = 0; i <= 12; i++) pts.push([stx + stw * (0.12 + 0.76 * i / 12), sty + sth * 0.6 + Math.sin(i / 12 * J.TAU) * sth * 0.08]); env.line(pts, stt, Math.max(2, stw * 0.05), a, false); }
    env.draw({ text: String(p.val), font: monoF(env), size: stw * 0.2, align: 'left', x: stx + stw * 0.1, y: sty + sth * 0.14, color: stt, alpha: a, ghost: false });
    // postal code boxes (top-right)
    const bs = Math.min(cw, ch) * 0.062, gap = bs * 0.22;
    const zx1 = x0 + cw - m;
    const zy = y0 + m * 0.9;
    const za = tin(env, 0.25, 0.4, E.outCubic) * out;
    for (let i = 0; i < 7; i++) {
      const bx = zx1 - (7 - i) * (bs + gap) - (i < 3 ? gap * 1.5 : 0);
      env.rrect(bx, zy, bs, bs * 1.25, bs * 0.08, null, za, false, red, Math.max(1.2, bs * 0.06));
      if (i === 3) env.line([[bx - gap * 2.2, zy + bs * 0.62], [bx - gap * 0.6, zy + bs * 0.62]], red, Math.max(1.2, bs * 0.06), za, false);
      env.draw({ text: p.zip[i], font: p.font, size: bs * 0.8, x: bx + bs / 2, y: zy + bs * 0.66, color: C.text, alpha: za * 0.9, ghost: false });
    }
    env.draw({ text: vertCard ? '郵便はがき' : 'POST CARD', font: vertCard ? serifF(env) : monoF(env), size: ls * (vertCard ? 1.2 : 0.9), track: 0.5, x: vertCard ? 0 : x0 + cw * 0.46, y: vertCard ? y0 + m + sth + ls * 0.9 : y0 + m * 0.75, color: C.text, alpha: a * 0.75, ghost: false });
    // address lines + lyric
    const t0 = env.cut.text.trim();
    let bb;
    const la = tin(env, 0.2, 0.5, E.outCubic) * out;
    if (vertCard && !hasLatin(t0)) {
      const top = y0 + m + sth + ls * 2.4, bot = y0 + ch - m * 1.4;
      const fb = fitBlock(strip(t0), p.font, cw * 0.5, (bot - top) * 0.84, { vertical: true, lead: 1.3, track: 0.06 }, 2);
      const size = Math.min(fb.size, cw * 0.2);
      const mm = meas(fb.text, p.font, size, { vertical: true, lead: 1.3, track: 0.06 });
      const lx = x0 + cw * 0.62;
      for (let i = 0; i < 4; i++) { const xx = x0 + cw * (0.84 - i * 0.2); leaderV(env, xx, top, bot, C.text, la * 0.3, ls * 0.45, Math.max(1, ls * 0.05)); }
      const ty = top + Math.max(0, (bot - top) - mm.h - size * 1.3) * 0.3;
      bb = J.mainDraw(env, { text: fb.text, font: p.font, size, x: lx, y: ty, vertical: true, align: 'left', lead: 1.3, track: 0.06, color: C.text, noHold: plateHold(env), mi: miAt(env, 0.3) });
      const lastLen = J.glyphCount(fb.text.split('\n').pop());
      env.draw({ text: '様', font: p.font, size: size * 0.7, x: lx - (fb.lines - 1) * size * 0.65, y: ty + lastLen * size * 1.06 + size * 0.75, color: C.text, alpha: la, ghost: false });
    } else {
      const top = y0 + m + sth + ls * 1.8, bot = y0 + ch - m;
      const lines = 4, lh = (bot - top) / lines;
      for (let i = 1; i <= lines; i++) leader(env, x0 + m, x0 + cw - m, top + lh * i, C.text, la * 0.3, ls * 0.45, Math.max(1, ls * 0.05));
      const fb = fitBlock(t0, p.font, cw - m * 2.4, lh * 2.4, { lead: 1.2, track: 0.02 }, 2);
      const size = Math.min(fb.size, lh * 1.05);
      const nL = fb.text.split('\n').length;
      bb = J.mainDraw(env, { text: fb.text, font: p.font, size, x: x0 + m * 1.2, y: top + lh * (nL > 1 ? 2.5 : 2.0) - size * 0.3, align: 'left', lead: lh / size, track: 0.02, color: C.text, noHold: plateHold(env), mi: miAt(env, 0.3) });
    }
    // postmark thumps onto the stamp
    const pt = (env.lt - env.cut.inDur - 0.2) / 0.18;
    if (pt > 0) {
      const q = J.lerp(1.4, 1, E.outBack(J.clamp(pt), 1.3)), pa = J.clamp(pt * 3) * out * 0.85;
      const R = stw * 0.62;
      ctx.save(); ctx.translate(stx + stw * 0.95, sty + sth * 0.62); ctx.rotate(p.mark * J.DEG); ctx.scale(q, q);
      env.circle(0, 0, R, null, C.text, Math.max(1.5, R * 0.05), pa, false);
      env.circle(0, 0, R * 0.8, null, C.text, Math.max(1, R * 0.025), pa, false);
      env.draw({ text: J.fmtTime(env.cut.start), font: monoF(env), size: R * 0.26, x: 0, y: 0, color: C.text, alpha: pa, ghost: false });
      env.line([[-R * 0.8, -R * 0.36], [R * 0.8, -R * 0.36]], C.text, Math.max(1, R * 0.025), pa, false);
      env.line([[-R * 0.8, R * 0.36], [R * 0.8, R * 0.36]], C.text, Math.max(1, R * 0.025), pa, false);
      for (let k2 = 0; k2 < 3; k2++) { const pts = []; for (let i = 0; i <= 20; i++) pts.push([R * 1.15 + i * R * 0.1, (k2 - 1) * R * 0.32 + Math.sin(i * 0.9) * R * 0.08]); env.line(pts, C.text, Math.max(1.5, R * 0.04), pa, false); }
      ctx.restore();
    }
    ctx.restore();
    return bb ? box(cx - cw / 2, cy - ch / 2, cx + cw / 2, cy + ch / 2) : null;
  },
});

/* ======================================================================
   19  letterPaper — 便箋
   ====================================================================== */
reg('letterPaper', {
  name: '便箋', tags: ['emotional', 'calm'], w: 0.9, ae: 'vcols', treat: 'safe', fits: n => n >= 1 && n <= 22, portrait: 1.1,
  enterBias: { type: 1.8, wipe: 1.5, blur: 1.3, slice: 0.4, stretch: 0.4 },
  plan: (rng, cut, st) => ({
    font: rng.chance(0.5) ? 'klee' : rng.pick(fontsOf(st, ['serif'])), variant: hasLatin(cut.text) ? 'yoko' : rng.pick(['tate', 'tate', 'yoko']),
    rule: rng.pick(['accent', 'accent', 'accent', 'sub']), sign: rng.chance(0.7),
  }),
  render(env) {
    const { W, H, sc, ctx } = env, p = env.cut.params, u = U(env), port = isPort(env);
    const C = card(sc), out = tout(env), ls = smallSize(env);
    const tate = p.variant === 'tate';
    // sheet: tate letters are wide (folded in three vertically), yoko are tall
    let pw, ph;
    if (tate) { pw = port ? W * 0.88 : Math.min(W * 0.8, H * 0.86 * 1.45); ph = port ? Math.min(H * 0.74, pw * 1.5) : pw / 1.45; }
    else { ph = port ? Math.min(H * 0.8, W * 0.9 * 1.35) : H * 0.86; pw = port ? ph / 1.35 : Math.min(W * 0.8, ph * 1.1); }
    const x0 = W / 2 - pw / 2, y0 = H / 2 - ph / 2 + (port ? (1 - E.outCubic(J.clamp(env.lt / 0.45))) * H * 0.25 + E.inCubic(env.pOut) * H * 0.05 : 0);
    const ruleC = p.rule === 'accent' ? plateCol(sc, [sc.accent, sc.accent2], C.fill, 1.6) : J.mix(C.fill, C.text, 0.4);
    const lw = Math.max(1.5, u * 0.002);
    const fadeOut = 1 - J.clamp((env.pOut - 0.55) / 0.45);
    // unfold: the middle third is there first, the outer thirds swing open (portrait: the sheet slides up instead)
    const uf = port ? 1 : E.inOutCubic(J.clamp((ltU(env) - 0.05) / 0.45));
    const fold = port ? 0 : E.inOutCubic(J.clamp(pOutU(env) / 0.7));
    const k = uf * (1 - fold);
    const a0 = tin(env, 0, 0.2, E.outCubic) * fadeOut;
    if (a0 <= 0.01) return null;
    const third = port ? ph / 3 : tate ? pw / 3 : ph / 3;
    // panel rects (in sheet order); tate → columns, yoko → rows
    const vis = [[x0 + third * (tate ? 1 - k : 0), y0 + (tate ? 0 : third * (1 - k))], [tate ? third * (1 + 2 * k) : pw, tate ? ph : third * (1 + 2 * k)]];
    shadowR(env, vis[0][0], vis[0][1], vis[1][0], vis[1][1], 0, a0, u * 0.014);
    env.rect(vis[0][0], vis[0][1], vis[1][0], vis[1][1], C.fill, a0, false);
    if (C.edge) env.line([[vis[0][0], vis[0][1]], [vis[0][0] + vis[1][0], vis[0][1]], [vis[0][0] + vis[1][0], vis[0][1] + vis[1][1]], [vis[0][0], vis[0][1] + vis[1][1]], [vis[0][0], vis[0][1]]], C.line, 1.2, a0, false);
    ctx.save(); ctx.beginPath(); ctx.rect(vis[0][0], vis[0][1], vis[1][0], vis[1][1]); ctx.clip();
    const t0 = env.cut.text.trim();
    let bb = null;
    const mT = ph * 0.1, mS = pw * 0.06;
    if (tate) {
      const top = y0 + mT, bot = y0 + ph - mT;
      // double border rules top & bottom, vertical line rules
      env.rect(x0 + mS, top - lw * 4, pw - mS * 2, lw * 2.5, ruleC, a0, false);
      env.rect(x0 + mS, bot + lw * 1.5, pw - mS * 2, lw * 2.5, ruleC, a0, false);
      const fb = fitBlock(strip(t0), p.font, port ? pw * 0.6 : third * 0.9, (bot - top) * 0.92, { vertical: true, lead: 1.55, track: 0.08 }, 3);
      const size = Math.min(fb.size, u * (port ? 0.17 : 0.13));
      const pitch = size * 1.55;
      const nl = fb.text.split('\n').length;
      const base = W / 2 - nl / 2 * pitch;                // left edge of the lyric block sits on a rule
      const iMin = Math.ceil((x0 + mS - base) / pitch), iMax = Math.floor((x0 + pw - mS - base) / pitch);
      for (let i = iMin; i <= iMax; i++) env.line([[base + i * pitch, top], [base + i * pitch, bot]], ruleC, lw, a0 * 0.75, false);
      bb = J.mainDraw(env, { text: fb.text, font: p.font, size, x: W / 2, y: top + size * 0.35, vertical: true, align: 'left', lead: 1.55, track: 0.08, color: C.text, noHold: plateHold(env) });
      const a2 = J.clamp((k - 0.6) / 0.4) * out;
      const ctxT = deckCopy(env);
      const cs = size * 0.62;
      if (ctxT && a2 > 0.01 && base + (nl + 1.5) * pitch < x0 + pw - mS) {
        env.draw({ text: [...strip(ctxT)].slice(0, Math.floor((bot - top) / (cs * 1.1))).join(''), font: p.font, size: cs, vertical: true, align: 'left', track: 0.08, x: base + (nl + 1.5) * pitch, y: top + cs * 0.4, color: C.text, alpha: a2 * 0.5, ghost: false });
      }
      if (p.sign && a2 > 0.01 && base - 1.5 * pitch > x0 + mS) env.draw({ text: 'No.' + lineNo(env), font: p.font, size: ls, vertical: true, align: 'left', x: base - 1.5 * pitch, y: bot - ls * 5, color: C.text, alpha: a2 * 0.7, ghost: false });
    } else {
      const left = x0 + pw * 0.1, right = x0 + pw * 0.9;
      const top = y0 + ph * 0.1, bot = y0 + ph * 0.92;
      const fb = fitBlock(t0, p.font, right - left, (bot - top) * 0.46, { lead: 1.7, track: 0.04 }, port ? 3 : 2);
      const size = Math.min(fb.size, u * 0.15);
      const pitch = size * 1.7;
      const nRow = Math.max(3, Math.floor((bot - top) / pitch));
      for (let i = 0; i <= nRow; i++) env.line([[left - pw * 0.03, top + i * pitch], [right + pw * 0.03, top + i * pitch]], ruleC, lw, a0 * 0.75, false);
      env.line([[left - pw * 0.03, top - lw * 5], [right + pw * 0.03, top - lw * 5]], ruleC, lw * 2.5, a0, false);
      const nl = fb.text.split('\n').length;
      const r0 = Math.max(0, Math.floor(nRow / 2 - nl / 2));
      bb = J.mainDraw(env, { text: fb.text, font: p.font, size, x: left, y: top + (r0 + nl / 2) * pitch - size * 0.12, align: 'left', lead: 1.7, track: 0.04, color: C.text, noHold: plateHold(env) });
      const a2 = J.clamp((k - 0.6) / 0.4) * out;
      const ctxT = deckCopy(env);
      if (ctxT && a2 > 0.01 && r0 > 0) env.draw({ text: ctxT, font: p.font, size: size * 0.6, align: 'left', x: left, y: top + (r0 - 0.5) * pitch - size * 0.1, color: C.text, alpha: a2 * 0.45, ghost: false });
      if (p.sign && a2 > 0.01) env.draw({ text: '— No.' + lineNo(env), font: p.font, size: ls, align: 'right', x: right, y: top + (nRow - 0.5) * pitch - ls * 0.2, color: C.text, alpha: a2 * 0.7, ghost: false });
    }
    ctx.restore();
    // creases + shading on the swinging thirds
    const shade = (1 - k) * 0.35;
    [0, 2].forEach(i => {
      const cx2 = tate ? (i === 0 ? x0 + third * (1 - k) : x0 + third * 2) : x0, cy2 = tate ? y0 : (i === 0 ? y0 + third * (1 - k) : y0 + third * 2);
      if (shade > 0.01) env.rect(cx2, cy2, tate ? third * k : pw, tate ? ph : third * k, darkest(sc), a0 * shade, false);
    });
    const cr = J.mix(C.fill, C.text, 0.12);
    if (tate) { env.line([[x0 + third, y0], [x0 + third, y0 + ph]], cr, lw, a0 * 0.8, false); env.line([[x0 + third * 2, y0], [x0 + third * 2, y0 + ph]], cr, lw, a0 * 0.8 * k, false); }
    else { env.line([[x0, y0 + third], [x0 + pw, y0 + third]], cr, lw, a0 * 0.8 * k, false); env.line([[x0, y0 + third * 2], [x0 + pw, y0 + third * 2]], cr, lw, a0 * 0.8 * k, false); }
    return bb;
  },
});

/* ======================================================================
   20  calendar — カレンダー
   ====================================================================== */
const WD_J = '日月火水木金土', WD_E = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const MON_E = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
const ROKUYO = ['大安', '赤口', '先勝', '友引', '先負', '仏滅'];
reg('calendar', {
  name: 'カレンダー', tags: ['pop', 'editorial', 'calm'], w: 0.7, ae: 'center', treat: 'safe', fits: n => n >= 1 && n <= 16,
  enterBias: { pop: 1.3, cut: 1.3, zoom: 1.2 },
  plan: (rng, cut, st) => ({
    font: rng.pick(fontsOf(st, ['display', 'serif'])), variant: rng.pick(['month', 'himekuri']), month: rng.int(0, 11), off: rng.int(0, 6), day: rng.int(3, 27), days: rng.pick([30, 31]),
  }),
  render(env) {
    const { W, H, sc, ctx } = env, p = env.cut.params, u = U(env), port = isPort(env);
    const out = tout(env), ls = smallSize(env);
    const C = card(sc);
    const t0 = env.cut.text.trim();
    const day = ((p.day + (env.cut.line | 0)) % p.days) + 1;
    const wd = (p.off + day - 1) % 7;
    const red = plateCol(sc, [sc.accent, sc.accent2], C.fill, 2.2), blue = plateCol(sc, [sc.accent2, sc.accent], C.fill, 2.2);
    const dayCol = w => (w === 0 ? red : w === 6 ? blue : C.text);
    if (p.variant === 'himekuri') {
      // tear-off day pad: the lyric takes the place of the big date
      const pw = port ? W * 0.84 : Math.min(W * 0.6, H * 0.86 * 0.95), ph = port ? Math.min(H * 0.7, pw * 1.3) : H * 0.84;
      const x0 = W / 2 - pw / 2, y0 = H / 2 - ph / 2 + ph * 0.03;
      const a = tin(env, 0, 0.3, E.outCubic);
      const bindH = ph * 0.08;
      const bindC = [darkest(sc), sc.ink, sc.accent, sc.sub].find(c => J.contrast(c, sc.bg) >= 1.5 && J.contrast(c, C.fill) >= 1.8) || sc.sub;
      // pages underneath
      for (let i = 3; i >= 1; i--) env.rect(x0 + i * 2, y0 + bindH, pw, ph - bindH + i * u * 0.006, J.mix(C.fill, C.text, 0.08 * i), a, false);
      shadowR(env, x0, y0, pw, ph, 0, a, u * 0.012);
      env.rect(x0, y0 + bindH, pw, ph - bindH, C.fill, a, false);
      // next page (revealed as this one tears away)
      const tear = E.inCubic(env.pOut);
      env.draw({ text: String(day % p.days + 1), font: p.font, size: ph * 0.3, x: W / 2, y: y0 + ph * 0.55, color: dayCol((wd + 1) % 7), alpha: a * 0.18, ghost: false });
      ctx.save();
      const hx = x0 + pw * (p.day % 2 ? 0.1 : 0.9), hy = y0 + bindH;
      ctx.translate(hx, hy); ctx.rotate((p.day % 2 ? 1 : -1) * tear * 28 * J.DEG); ctx.translate(-hx, -hy + tear * tear * ph * 0.6);
      const pa = a * (1 - J.clamp((env.pOut - 0.7) / 0.3));
      env.rect(x0, y0 + bindH, pw, ph - bindH, C.fill, pa, false);
      if (C.edge) env.line([[x0, y0 + bindH], [x0 + pw, y0 + bindH], [x0 + pw, y0 + ph], [x0, y0 + ph], [x0, y0 + bindH]], C.line, 1.2, pa, false);
      const fa = tin(env, 0.1, 0.4, E.outCubic) * pa;
      const m = pw * 0.07;
      env.draw({ text: String(p.month + 1), font: p.font, size: ph * 0.1, align: 'left', x: x0 + m, y: y0 + bindH + ph * 0.09, color: C.text, alpha: fa, ghost: false });
      env.draw({ text: MON_E[p.month], font: monoF(env), size: ls * 0.9, track: 0.3, align: 'left', x: x0 + m + ph * 0.1 * 0.9, y: y0 + bindH + ph * 0.1, color: C.text, alpha: fa * 0.8, ghost: false });
      env.rrect(x0 + pw - m - ls * 3.2, y0 + bindH + ph * 0.06, ls * 3.2, ls * 1.6, ls * 0.2, null, fa, false, red, Math.max(1.5, ls * 0.08));
      env.draw({ text: ROKUYO[(day + p.month) % 6], font: serifF(env), size: ls * 1.05, x: x0 + pw - m - ls * 1.6, y: y0 + bindH + ph * 0.06 + ls * 0.8, color: red, alpha: fa, ghost: false });
      const dcol0 = dayCol(wd), dcol = J.contrast(dcol0, C.fill) >= 3 ? dcol0 : C.text;
      const fb = fitBlock(t0, p.font, pw - m * 2, ph * 0.46, { lead: 1.08, track: 0.02 }, 3);
      const size = Math.min(fb.size, u * 0.24);
      const bb = J.mainDraw(env, { text: fb.text, font: p.font, size, x: W / 2, y: y0 + bindH + ph * 0.47, lead: 1.08, track: 0.02, color: dcol === C.text ? C.text : dcol, noHold: plateHold(env) });
      env.line([[x0 + m, y0 + ph * 0.8], [x0 + pw - m, y0 + ph * 0.8]], C.text, Math.max(1, u * 0.0015), fa * 0.5, false);
      env.draw({ text: WD_J[wd] + '曜日', font: serifF(env), size: ls * 1.5, align: 'left', x: x0 + m, y: y0 + ph * 0.88, color: dcol, alpha: fa, ghost: false });
      env.draw({ text: day + '  ' + WD_E[wd], font: monoF(env), size: ls * 1.1, track: 0.2, align: 'right', x: x0 + pw - m, y: y0 + ph * 0.88, color: dcol, alpha: fa, ghost: false });
      ctx.restore();
      // binding with rings
      env.rect(x0 - pw * 0.02, y0, pw * 1.04, bindH, bindC, a, false);
      [0.3, 0.7].forEach(f => env.circle(x0 + pw * f, y0 + bindH * 0.5, bindH * 0.22, sc.bg, null, 0, a, false));
      return bb;
    }
    // month grid; today's cell zooms into the lyric panel
    const cols = 7, rows = 5;
    const gw = port ? W * 0.9 : Math.min(W * 0.84, H * 1.5), cell = gw / cols, gh = cell * rows * (port ? 1 : 0.72);
    const rh = gh / rows;
    const hdrH = ls * 2.2;
    const gx = W / 2 - gw / 2, gy = H / 2 - (gh + hdrH + ls * 3) / 2 + ls * 3 + hdrH;
    const ga = tin(env, 0, 0.3, E.outCubic) * out;
    env.draw({ text: String(p.month + 1), font: p.font, size: ls * 2.6, align: 'left', x: gx, y: gy - hdrH - ls * 1.7, color: sc.fg, alpha: ga, ghost: false });
    env.draw({ text: MON_E[p.month], font: monoF(env), size: ls, track: 0.4, align: 'left', x: gx + ls * 2.6, y: gy - hdrH - ls * 1.3, color: sc.sub, alpha: ga, ghost: false });
    const gridC = sc.sub;
    for (let c = 0; c < 7; c++) env.draw({ text: WD_E[c], font: monoF(env), size: ls * 0.8, track: 0.2, x: gx + (c + 0.5) * cell, y: gy - hdrH * 0.45, color: c === 0 ? sc.accent : c === 6 ? (J.contrast(sc.accent2, sc.bg) > 1.6 ? sc.accent2 : sc.sub) : sc.sub, alpha: ga, ghost: false });
    const zoom = E.inOutCubic(J.clamp((env.lt - 0.12) / 0.35));
    const dim = 1 - zoom * 0.55;
    for (let r = 0; r <= rows; r++) { const e = tin(env, r * 0.03, 0.4, E.inOutCubic) * out; env.line([[gx, gy + r * rh], [gx + gw * e, gy + r * rh]], gridC, 1, 0.45 * dim, false); }
    let tcx = 0, tcy = 0;
    for (let d = 1; d <= p.days; d++) {
      const idx = p.off + d - 1, c = idx % 7, r = Math.floor(idx / 7) % rows;
      const x = gx + c * cell, y = gy + r * rh;
      if (d === day) { tcx = x; tcy = y; }
      const a = J.clamp((env.lt - 0.02 - idx * 0.006) / 0.15) * out * dim;
      if (a <= 0.01 || d === day) continue;
      env.draw({ text: String(d), font: monoF(env), size: Math.min(rh * 0.28, cell * 0.24), align: 'left', x: x + cell * 0.08, y: y + rh * 0.22, color: c === 0 ? sc.accent : sc.fg, alpha: a * 0.8, ghost: false });
    }
    // today's cell → big panel
    const PW = port ? W * 0.84 : Math.min(W * 0.7, gw * 0.9), PH = port ? H * 0.34 : H * 0.5;
    const X1 = W / 2 - PW / 2, Y1 = gy + gh / 2 - PH / 2;
    const bx = J.lerp(tcx, X1, zoom), by = J.lerp(tcy, Y1, zoom), bw = J.lerp(cell, PW, zoom), bh = J.lerp(rh, PH, zoom);
    const plate = plateCol(sc, [sc.accent, sc.ink]);
    const pa = J.clamp(env.lt / 0.12) * out;
    shadowR(env, bx, by, bw, bh, 0, pa * zoom, u * 0.015);
    env.rect(bx, by, bw, bh, plate, pa, false);
    const tc = onCol(sc, plate);
    const k = bw / PW;
    env.draw({ text: String(day), font: monoF(env), size: Math.max(rh * 0.28, PH * 0.12 * k), align: 'left', x: bx + bw * 0.04, y: by + bh * 0.13, color: tc, alpha: pa, ghost: false });
    env.draw({ text: WD_E[wd], font: monoF(env), size: Math.max(6, PH * 0.06 * k), track: 0.3, align: 'right', x: bx + bw * 0.96, y: by + bh * 0.12, color: tc, alpha: pa * zoom, ghost: false });
    const fb = fitBlock(t0, p.font, PW * 0.88, PH * 0.62, { lead: 1.08, track: 0.02 }, 3);
    ctx.save(); ctx.translate(bx, by); ctx.scale(Math.max(0.01, k), Math.max(0.01, bh / PH));
    const bb = J.mainDraw(env, { text: fb.text, font: p.font, size: Math.min(fb.size, u * 0.2), x: PW / 2, y: PH * 0.57, lead: 1.08, track: 0.02, color: tc, noHold: plateHold(env), mi: miAt(env, 0.2) });
    ctx.restore();
    return bb ? box(X1, Y1, X1 + PW, Y1 + PH) : null;
  },
});

/* ======================================================================
   21  chochin — 提灯
   ====================================================================== */
function lantern(env, cx, top, lw, lh, bodyC, a, glow, flick) {
  const { sc, ctx } = env;
  const capH = lh * 0.07, capC = plateCol(sc, [darkest(sc), sc.ink], bodyC, 1.6);
  const hw = t => lw / 2 * (0.62 + 0.38 * Math.sin(Math.PI * t));
  const y0 = top + capH, y1 = top + lh - capH, bh = y1 - y0;
  if (glow && env.pass === 'main' && a > 0.01) {
    const g = ctx.createRadialGradient(cx, top + lh / 2, 0, cx, top + lh / 2, lw * 1.3);
    g.addColorStop(0, J.rgba(bodyC, 0.35 * flick)); g.addColorStop(1, J.rgba(bodyC, 0));
    ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = g; ctx.fillRect(cx - lw * 1.4, top - lw * 0.4, lw * 2.8, lh + lw * 0.8); ctx.restore();
  }
  const pts = [];
  const M = 24;
  for (let i = 0; i <= M; i++) { const t = i / M; pts.push([cx + hw(t), y0 + bh * t]); }
  for (let i = M; i >= 0; i--) { const t = i / M; pts.push([cx - hw(t), y0 + bh * t]); }
  env.poly(pts, bodyC, a, false);
  // ribs (bamboo hoops)
  if (env.pass === 'main') {
    ctx.save(); ctx.globalAlpha = a * 0.22; ctx.strokeStyle = onCol(sc, bodyC); ctx.lineWidth = Math.max(1, lw * 0.006);
    ctx.beginPath();
    const R = 13;
    for (let k = 1; k < R; k++) { const t = k / R, y = y0 + bh * t, w2 = hw(t); ctx.moveTo(cx - w2, y); ctx.quadraticCurveTo(cx, y + bh * 0.035, cx + w2, y); }
    ctx.stroke(); ctx.restore();
  }
  env.rrect(cx - lw * 0.33, top, lw * 0.66, capH * 1.05, capH * 0.2, capC, a, false);
  env.rrect(cx - lw * 0.33, y1 - capH * 0.05, lw * 0.66, capH * 1.05, capH * 0.2, capC, a, false);
  return { y0, y1, bh, hw };
}
reg('chochin', {
  name: '提灯', tags: ['emotional', 'calm', 'pop'], w: 0.7, ae: 'circle', treat: 'safe', fits: n => n >= 1 && n <= 12, portrait: 1.1,
  enterBias: { blur: 1.4, flicker: 1.4, cut: 1.2, slice: 0.4 },
  plan: (rng, cut, st) => {
    const n = cut.n;
    const variant = n <= 6 && !hasLatin(cut.text) ? rng.pick(['single', 'single', 'row']) : 'row';
    const units = variant === 'row' ? (hasLatin(cut.text) ? splitK(cut.text, 6) : n <= 6 ? charUnits(cut.text) : splitK(cut.text, Math.min(6, Math.ceil(n / 2)), Math.min(6, Math.ceil(n / 2)))) : [hasLatin(cut.text) ? flat(cut.text) : strip(cut.text)];
    return { font: rng.pick(fontsOf(st, ['display', 'serif'])), variant, units, body: rng.pick(['accent', 'accent', 'paper']), ph: rng.range(0, 6) };
  },
  render(env) {
    const { W, H, sc, ctx } = env, p = env.cut.params, u = U(env), port = isPort(env);
    const out = tout(env);
    const C = card(sc);
    const paperB = p.body === 'paper' && J.contrast(C.fill, sc.bg) >= 1.5;
    const bodyC = paperB ? C.fill : plateCol(sc, [sc.accent, sc.ink], sc.bg, 1.3);
    const tc = paperB ? plateCol(sc, [sc.accent, darkest(sc)], C.fill, 2.2) : onCol(sc, bodyC);
    const units = (p.units && p.units.length ? p.units : [strip(env.cut.text)]).filter(Boolean);
    const flick = 0.8 + 0.2 * J.noise1(env.ltb * 3, env.cut.seed);
    const ein = E.outCubic(J.clamp(env.lt / 0.5)), a = J.clamp(ein * 2) * (1 - J.clamp((env.pOut - 0.4) / 0.6));
    if (a <= 0.01) return null;
    let bb = null;
    if (p.variant === 'single') {
      const t = units[0];
      const n = J.glyphCount(t);
      const lw = port ? W * 0.56 : Math.min(W * 0.34, H * 0.56), lh = Math.min(lw * 1.45, H * 0.8);
      const top = H / 2 - lh / 2 + H * 0.03 - (1 - ein) * H * 0.3;
      const sw = Math.sin(env.ltb * 1.3 + p.ph) * 2.2 + (1 - ein) * 6;
      env.line([[W / 2, -5], [W / 2, top]], sc.sub, Math.max(2, u * 0.003), a, false);
      ctx.save(); ctx.translate(W / 2, top); ctx.rotate(sw * J.DEG); ctx.translate(-W / 2, -top);
      const L = lantern(env, W / 2, top, lw, lh, bodyC, a, true, flick);
      const cols = n > 5 ? 2 : 1;
      const vt = cols > 1 ? brk(t, Math.ceil(n / 2)) : t;
      const per = Math.max(...vt.split('\n').map(l => J.glyphCount(l)));
      const size = Math.min(L.bh * 0.8 / per, lw * (cols > 1 ? 0.3 : 0.46));
      const r = J.mainDraw(env, { text: vt, font: p.font, size, x: W / 2, y: L.y0 + L.bh / 2 - per * size * 0.5, vertical: true, align: 'left', lead: 1.15, color: tc, noHold: plateHold(env), mi: miAt(env, 0.2) });
      ctx.restore();
      if (r) bb = box(W / 2 - lw / 2, top, W / 2 + lw / 2, top + lh);
      return bb;
    }
    // a string of festival lanterns
    const k = units.length;
    const rowsN = port && k > 3 ? 2 : 1, per = Math.ceil(k / rowsN);
    const sp = W * 0.88 / per;
    const lw = Math.min(sp * 0.78, H * (rowsN > 1 ? 0.2 : 0.3)), lh = lw * 1.4;
    for (let r = 0; r < rowsN; r++) {
      const cnt = Math.min(per, k - r * per);
      const wireY = rowsN > 1 ? H * (r ? 0.55 : 0.14) : H * 0.22;
      const x0 = W / 2 - (cnt - 1) / 2 * sp;
      const sag = H * 0.05;
      const wy = x => wireY + sag * (1 - Math.pow((x - W / 2) / (W * 0.5), 2));
      const we = tin(env, 0, 0.5, E.inOutCubic) * out;
      const pts = []; for (let i = 0; i <= 30; i++) { const x = J.lerp(-10, W + 10, i / 30); pts.push([x, wy(x)]); }
      env.polyPartial(pts, we, sc.sub, Math.max(1.5, u * 0.0025), 0.8, false);
      for (let j = 0; j < cnt; j++) {
        const i = r * per + j, t = units[i];
        const x = x0 + j * sp, ty = wy(x) + lw * 0.1;
        const t1 = 0.08 + i * 0.07;
        const e = E.outBack(J.clamp((env.lt - t1) / 0.35), 1.4);
        if (e <= 0) continue;
        const sw = Math.sin(env.ltb * 1.6 + i * 1.1 + p.ph) * 3 + (1 - e) * 10 * (i % 2 ? 1 : -1);
        ctx.save(); ctx.translate(x, ty); ctx.rotate(sw * J.DEG); ctx.scale(e, e); ctx.translate(-x, -ty);
        env.line([[x, ty - lw * 0.1], [x, ty]], sc.sub, Math.max(1.5, u * 0.002), a, false);
        const L = lantern(env, x, ty, lw, lh, bodyC, a, true, flick * (0.85 + 0.15 * J.noise1(env.ltb * 4 + i, 3)));
        const n = J.glyphCount(t), lat = hasLatin(t);
        const size = lat ? Math.min(J.fitSize(t, p.font, lw * 0.8, L.bh * 0.5), lw * 0.4) : Math.min(L.bh * 0.78 / Math.max(1, n), lw * 0.5);
        const rr = J.mainDraw(env, lat ? { text: t, font: p.font, size, x, y: L.y0 + L.bh / 2, color: tc, noHold: plateHold(env), mi: miAt(env, t1 + 0.12) }
          : { text: strip(t), font: p.font, size, x, y: L.y0 + L.bh / 2 - n * size * 0.5, vertical: true, align: 'left', color: tc, noHold: plateHold(env), mi: miAt(env, t1 + 0.12) });
        ctx.restore();
        if (rr) bb = J.unionBB(bb, box(x - lw / 2, ty, x + lw / 2, ty + lh));
      }
    }
    return bb;
  },
});

/* ======================================================================
   22  routeMap — 路線図
   ====================================================================== */
reg('routeMap', {
  name: '路線図', tags: ['graphic', 'pop', 'editorial'], w: 0.8, ae: 'labels', fits: n => n >= 2 && n <= 18,
  enterBias: { wipe: 1.4, pop: 1.3, type: 1.2 },
  plan: (rng, cut, st) => {
    const n = cut.n;
    const k = n <= 6 ? 2 : n <= 10 ? 3 : 4;
    return {
      font: rng.pick(fontsOf(st, ['display', 'body'])), chunks: n <= 3 ? charUnits(cut.text) : splitK(cut.text, k),
      shape: rng.pick(['straight', 'bend', 'straight']), letter: rng.pick(['Z', 'J', 'M', 'K', 'S']), num0: rng.int(1, 14),
    };
  },
  render(env) {
    const { W, H, sc } = env, p = env.cut.params, u = U(env), port = isPort(env);
    const out = tout(env), ls = smallSize(env);
    const chunks = (p.chunks && p.chunks.length ? p.chunks : [env.cut.text.trim()]).filter(Boolean);
    const k = chunks.length;
    const lineC = plateCol(sc, [sc.accent, sc.accent2, sc.fg]);
    const lw = Math.max(8, u * 0.024);
    const bend = !port && p.shape === 'bend' && k >= 2;
    let pts;
    if (port) pts = [[W * 0.22, H * 0.07], [W * 0.22, H * 0.93]];
    else if (bend) pts = [[W * 0.04, H * 0.36], [W * 0.42, H * 0.36], [W * 0.58, H * 0.64], [W * 0.96, H * 0.64]];
    else pts = [[W * 0.04, H * 0.54], [W * 0.96, H * 0.54]];
    const segL = []; let tot = 0;
    for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); segL.push(d); tot += d; }
    const at = f => { let d = f * tot; for (let i = 0; i < segL.length; i++) { if (d <= segL[i] || i === segL.length - 1) { const q = J.clamp(d / segL[i]); return [J.lerp(pts[i][0], pts[i + 1][0], q), J.lerp(pts[i][1], pts[i + 1][1], q)]; } d -= segL[i]; } return pts[pts.length - 1]; };
    // stations: position, path fraction, label side, label width budget
    const st = [];
    const spread = (a0, a1, m, i) => (m > 1 ? J.lerp(a0, a1, i / (m - 1)) : (a0 + a1) / 2);
    if (port) chunks.forEach((c, i) => { const y = spread(H * 0.15, H * 0.85, k, i); st.push({ x: pts[0][0], y, f: (y - pts[0][1]) / tot, side: 1, maxW: W * 0.66 }); });
    else if (bend) {
      const cu = Math.ceil(k / 2), cl = k - cu;
      chunks.forEach((c, i) => {
        const up = i < cu, j = up ? i : i - cu, m = up ? cu : cl;
        const x = up ? spread(W * 0.09, W * 0.38, m, j) : spread(W * 0.63, W * 0.92, m, j);
        const f = up ? (x - pts[0][0]) / tot : (segL[0] + segL[1] + x - pts[2][0]) / tot;
        st.push({ x, y: up ? pts[0][1] : pts[2][1], f, side: up ? -1 : 1, maxW: m > 1 ? W * 0.29 * 0.84 : W * 0.34 });
      });
    } else {
      const alt = k >= 3, gap = W * 0.76 / Math.max(1, k - 1);
      chunks.forEach((c, i) => { const x = spread(W * 0.12, W * 0.88, k, i); st.push({ x, y: pts[0][1], f: (x - pts[0][0]) / tot, side: alt && i % 2 ? 1 : -1, maxW: Math.min(W * 0.42, (alt ? gap * 2 : gap) * 0.88) }); });
    }
    const maxH = port ? Math.min(H * 0.7 / k * 0.45, H * 0.1) : H * 0.13;
    const size = Math.min(...chunks.map((c, i) => J.fitSize(c, p.font, st[i].maxW, maxH, { track: 0.02 })), u * (port ? 0.15 : 0.13));
    const le = tin(env, 0, 0.6, E.inOutCubic) * (1 - E.inCubic(env.pOut));
    env.polyPartial(pts, le, lineC, lw, 1, false);
    const prog = J.clamp((env.lt - 0.3) / Math.max(0.4, env.cut.dur * 0.7));
    const cur = Math.min(k - 1, Math.floor(prog * k));
    // train (a capsule running on the line between stations)
    if (le > 0.9) {
      const f1 = st[cur].f, f0 = cur > 0 ? st[cur - 1].f : Math.max(0, f1 - 0.08);
      const f = J.lerp(f0, f1, E.inOutCubic(J.clamp(prog * k - cur)));
      const [tx, ty] = at(f);
      const tw = lw * (port ? 1.3 : 2.6), th = lw * (port ? 2.6 : 1.3);
      env.rrect(tx - tw / 2, ty - th / 2, tw, th, Math.min(tw, th) * 0.45, sc.fg, out, false, sc.bg, Math.max(2, lw * 0.18));
    }
    let bb = null;
    const bs = ls * 0.9;
    chunks.forEach((c, i) => {
      const S = st[i];
      const ta = J.clamp((le * 1.05 - S.f) * 6);
      if (ta <= 0) return;
      const isCur = i === cur;
      const r = lw * (isCur ? 1.05 : 0.8);
      if (isCur) { if (port) env.rrect(S.x - r * 1.05, S.y - r * 1.5, r * 2.1, r * 3, r, sc.bg, 1, false, sc.fg, Math.max(3, lw * 0.35)); else env.rrect(S.x - r * 1.5, S.y - r * 1.05, r * 3, r * 2.1, r, sc.bg, 1, false, sc.fg, Math.max(3, lw * 0.35)); }
      else env.circle(S.x, S.y, r * ta, sc.bg, sc.fg, Math.max(3, lw * 0.32), 1, false);
      const code = p.letter + pad2(p.num0 + i);
      const rom = romaOfText(c);
      if (port) {
        const lx = S.x + lw * 1.8;
        env.rrect(S.x - lw * 1.4 - bs * 2.8, S.y - bs * 0.9, bs * 2.8, bs * 1.8, bs * 0.3, null, ta * out, false, lineC, Math.max(2, bs * 0.12));
        env.draw({ text: code, font: monoF(env), size: bs * 0.8, x: S.x - lw * 1.4 - bs * 1.4, y: S.y, color: sc.fg, alpha: ta * out, ghost: false });
        bb = J.unionBB(bb, J.mainDraw(env, { text: c, font: p.font, size, x: lx, y: S.y - (rom ? ls * 0.4 : 0), align: 'left', track: 0.02, color: sc.fg, mi: miAt(env, 0.1 + i * 0.12) }));
        if (rom) env.draw({ text: rom, font: monoF(env), size: ls * 0.8, track: 0.15, align: 'left', x: lx, y: S.y + size * 0.55, color: sc.sub, alpha: ta * out, ghost: false });
      } else {
        const d = S.side;
        const w = meas(c, p.font, size, { track: 0.02 }).w;
        const lx = J.clamp(S.x, W * 0.04 + w / 2, W * 0.96 - w / 2);
        const by = S.y + d * (lw * 1.25) + (d < 0 ? -bs * 1.8 : 0);
        env.rrect(S.x - bs * 1.4, by, bs * 2.8, bs * 1.8, bs * 0.3, null, ta * out, false, lineC, Math.max(2, bs * 0.12));
        env.draw({ text: code, font: monoF(env), size: bs * 0.8, x: S.x, y: by + bs * 0.9, color: sc.fg, alpha: ta * out, ghost: false });
        const ny = S.y + d * (lw * 1.25 + bs * 2.2 + size * 0.5 + (d < 0 && rom ? ls * 1.2 : 0));
        bb = J.unionBB(bb, J.mainDraw(env, { text: c, font: p.font, size, x: lx, y: ny, track: 0.02, color: sc.fg, mi: miAt(env, 0.1 + i * 0.12) }));
        if (rom) env.draw({ text: rom, font: monoF(env), size: ls * 0.75, track: 0.15, x: lx, y: d < 0 ? ny + size * 0.5 + ls * 0.7 : ny + size * 0.5 + ls * 0.9, color: sc.sub, alpha: ta * out, ghost: false });
      }
    });
    // line badge at the start of the line
    const ba = tin(env, 0.05, 0.4, E.outBack) * out;
    if (ba > 0.01) {
      const R = lw * 1.7;
      const cx2 = port ? pts[0][0] : pts[0][0] + R * 0.2, cy2 = port ? pts[0][1] + R * 0.1 : pts[0][1] + (st[0].side < 0 ? 1 : -1) * R * 2;
      env.circle(cx2, cy2, R * ba, sc.bg, lineC, Math.max(3, lw * 0.5), 1, false);
      env.draw({ text: p.letter, font: 'gothic_black', size: R * 1.1 * ba, x: cx2, y: cy2, color: sc.fg, ghost: false });
    }
    return bb;
  },
});

/* ======================================================================
   23  stationSign — 駅名標
   ====================================================================== */
reg('stationSign', {
  name: '駅名標', tags: ['graphic', 'pop', 'editorial'], w: 0.8, ae: 'center', treat: 'safe', portrait: 0.6, fits: n => n >= 1 && n <= 12,
  enterBias: { cut: 1.4, wipe: 1.3, slice: 1.2 },
  plan: (rng, cut, st) => ({ font: rng.pick(fontsOf(st, ['display', 'body'])), letter: rng.pick(['JZ', 'LY', 'KT', 'SN']), num: rng.int(1, 36), band: rng.pick(['accent', 'accent2', 'ink']), posts: rng.chance(0.7) }),
  render(env) {
    const { W, H, sc, ctx } = env, p = env.cut.params, u = U(env), port = isPort(env);
    const out = tout(env), ls = smallSize(env);
    const C = card(sc);
    const t0 = env.cut.text.trim();
    const bw = port ? W * 0.92 : Math.min(W * 0.86, H * 2.2), bh = port ? bw * 0.62 : bw * 0.36;
    const e = E.outCubic(J.clamp(env.lt / 0.45)), eo = E.inCubic(env.pOut);
    const a = J.clamp(e * 2) * (1 - eo);
    if (a <= 0.01) return null;
    const x0 = W / 2 - bw / 2, y0 = H / 2 - bh / 2 - (port ? H * 0.04 : H * 0.03) - (1 - e) * H * 0.2 + eo * H * 0.05;
    const boardC = J.contrast(C.fill, sc.bg) >= 1.4 ? C.fill : plateCol(sc, [sc.ink, sc.fg]);
    const txC = onCol(sc, boardC);
    const bandC = plateCol(sc, p.band === 'accent2' ? [sc.accent2, sc.accent] : p.band === 'ink' ? [sc.ink, sc.accent] : [sc.accent, sc.accent2], boardC, 1.4);
    // posts
    if (p.posts) { const pw = bw * 0.018; [0.12, 0.88].forEach(f => env.rect(x0 + bw * f - pw / 2, y0 + bh, pw, H - y0 - bh + 10, sc.sub, a, false)); }
    shadowR(env, x0, y0, bw, bh, bh * 0.04, a, u * 0.012);
    env.rrect(x0, y0, bw, bh, bh * 0.04, boardC, a, false, null, 1.5);
    // prev / next from the rest of the line
    const L = flat(env.cut.lineText || ''), T = flat(t0);
    const idx = L.indexOf(T);
    const cutS = (s2, n2, fromEnd) => { const arr = [...s2.trim()]; return (fromEnd ? arr.slice(-n2) : arr.slice(0, n2)).join(''); };
    const prev = idx > 0 ? cutS(L.slice(0, idx), 6, true) : '';
    const next = idx >= 0 && idx + T.length < L.length ? cutS(L.slice(idx + T.length), 6, false) : '';
    // band with arrow
    const bandY = y0 + bh * (port ? 0.66 : 0.64), bandH = bh * (port ? 0.075 : 0.1);
    const be = tin(env, 0.15, 0.5, E.inOutCubic) * out;
    env.rect(x0, bandY, bw * be, bandH, bandC, a, false);
    const cx = W / 2;
    const bxW = bw * 0.28;
    if (be > 0.5) {
      env.rect(cx - bxW / 2, bandY - bandH * 0.25, bxW, bandH * 1.5, bandC, a, false);
      env.poly([[x0 + bw * 0.97, bandY - bandH * 0.4], [x0 + bw, bandY + bandH / 2], [x0 + bw * 0.97, bandY + bandH * 1.4]], bandC, a * J.clamp((be - 0.5) * 2), false);
    }
    // station name (lyric)
    const bs = bh * (port ? 0.16 : 0.2);
    const fb = fitBlock(t0, p.font, bw - (bw * 0.06 + bs * 1.4) * 2, bh * (port ? 0.42 : 0.4), { track: 0.12, lead: 1.05 }, port ? 2 : 1);
    const size = Math.min(fb.size, bh * 0.36);
    const ny = y0 + bh * (port ? 0.3 : 0.3);
    const bb = J.mainDraw(env, { text: fb.text, font: p.font, size, x: cx, y: ny, track: 0.12, lead: 1.05, color: txC, noHold: plateHold(env), mi: miAt(env, 0.15) });
    const fa = tin(env, 0.25, 0.4, E.outCubic) * out;
    const rom = romajiOf(env);
    const sub2 = rom ? rom.charAt(0) + rom.slice(1).toLowerCase() : ('No.' + lineNo(env));
    env.draw({ text: sub2, font: bodyF(env), size: ls * (port ? 1.1 : 1.2), track: 0.1, x: cx, y: bandY - bandH * 0.25 - ls * 1.3, color: txC, alpha: fa, ghost: false });
    // number badge
    const bx2 = x0 + bw * 0.06, by2 = ny - bs / 2;
    env.rrect(bx2, by2, bs, bs * 1.1, bs * 0.12, boardC, fa, false, bandC, Math.max(2, bs * 0.08));
    env.rect(bx2, by2, bs, bs * 0.34, bandC, fa, false);
    env.draw({ text: p.letter, font: monoF(env), size: bs * 0.24, x: bx2 + bs / 2, y: by2 + bs * 0.17, color: onCol(sc, bandC), alpha: fa, ghost: false });
    env.draw({ text: pad2(p.num), font: 'gothic_black', size: bs * 0.5, x: bx2 + bs / 2, y: by2 + bs * 0.72, color: txC, alpha: fa, ghost: false });
    // prev / next (neighbouring words of the line, or the neighbouring station codes)
    const py = bandY + bandH + (bh - (bandY - y0) - bandH) * 0.5;
    const pv = prev || ('← ' + p.letter + pad2(Math.max(0, p.num - 1))), nx = next || (p.letter + pad2(p.num + 1) + ' →');
    const pf = prev ? p.font : monoF(env), nf = next ? p.font : monoF(env);
    env.draw({ text: pv, font: pf, size: ls * 1.25, align: 'left', x: x0 + bw * 0.04, y: py, color: txC, alpha: fa * (prev ? 1 : 0.7), ghost: false });
    env.draw({ text: nx, font: nf, size: ls * 1.25, align: 'right', x: x0 + bw * 0.96, y: py, color: txC, alpha: fa * (next ? 1 : 0.7), ghost: false });
    void ctx;
    return bb ? box(x0, y0, x0 + bw, y0 + bh) : null;
  },
});

/* ======================================================================
   24  noren — 暖簾
   ====================================================================== */
reg('noren', {
  name: '暖簾', tags: ['calm', 'emotional', 'graphic'], w: 0.8, ae: 'vcols', treat: 'safe', fits: n => n >= 1 && n <= 12, portrait: 1.1,
  enterBias: { wipe: 1.5, blur: 1.3, cut: 1.2, slice: 0.4 },
  plan: (rng, cut, st) => {
    const n = cut.n;
    const units = n <= 4 ? charUnits(cut.text) : splitK(cut.text, Math.min(4, Math.ceil(n / 3)), Math.min(4, Math.ceil(n / 3)));
    return { font: rng.pick(fontsOf(st, ['display', 'serif'])), units, cloth: rng.pick(['ink', 'accent', 'ink']), mon: rng.chance(0.35), ph: rng.range(0, 6), wind: rng.pick([1, -1]) };
  },
  render(env) {
    const { W, H, sc, ctx } = env, p = env.cut.params, u = U(env), port = isPort(env);
    let units = (p.units && p.units.length ? p.units : [vtext(env.cut.text)]).filter(Boolean).map(vtext);
    if (units.length === 1) units = ['', units[0], ''];          // a single glyph hangs on the middle panel
    const k = units.length;
    const clothC = plateCol(sc, p.cloth === 'accent' ? [sc.accent, sc.ink] : [sc.ink, sc.accent]);
    const tc = onCol(sc, clothC);
    const nw = port ? W * 0.88 : Math.min(W * 0.74, H * 1.3), nh = port ? H * 0.56 : H * 0.7;
    const rodY = H * (port ? 0.18 : 0.12);
    const x0 = W / 2 - nw / 2, gap = nw * 0.012;
    const pw = (nw - gap * (k - 1)) / k;
    const rodE = tin(env, 0, 0.4, E.outCubic);
    const fadeO = 1 - J.clamp((env.pOut - 0.55) / 0.45);
    const lw = Math.max(4, u * 0.012);
    env.rrect(x0 - nw * 0.06, rodY - lw / 2, (nw * 1.12) * rodE, lw, lw / 2, sc.sub, fadeO, false);
    const part = E.inOutCubic(env.pOut);
    let bb = null;
    const maxG = Math.max(...units.map(t => J.glyphCount(t)));
    const hem = nh * 0.08;
    const size = Math.min((nh - hem * 1.6) * 0.84 / Math.max(maxG, 1.6), pw * 0.66);
    for (let i = 0; i < k; i++) {
      const t1 = 0.04 + i * 0.06;
      const drop = E.outCubic(J.clamp((env.lt - t1) / 0.45));
      if (drop <= 0) continue;
      const px = x0 + i * (pw + gap);
      const side = (i + 0.5) / k - 0.5;
      const sway = Math.sin(env.ltb * 1.2 + i * 0.8 + p.ph) * 1.1 * p.wind + part * Math.sign(side || 0.001) * 26 * (0.4 + Math.abs(side) * 1.4);
      const hh = nh * drop;
      ctx.save(); ctx.translate(px + pw / 2, rodY); ctx.rotate(sway * J.DEG);
      ctx.beginPath(); ctx.rect(-pw / 2 - 2, -lw, pw + 4, hh + lw); ctx.save(); ctx.clip();
      env.rect(-pw / 2, -lw * 0.2, pw, nh, clothC, fadeO, false);
      if (env.pass === 'main') {
        // hem loop at the top + faint vertical weave shading
        env.rect(-pw / 2, -lw * 0.2, pw, hem, J.mix(clothC, darkest(sc), 0.25), fadeO, false);
        const g = ctx.createLinearGradient(-pw / 2, 0, pw / 2, 0);
        g.addColorStop(0, J.rgba(darkest(sc), 0.18)); g.addColorStop(0.5, J.rgba(darkest(sc), 0)); g.addColorStop(1, J.rgba(darkest(sc), 0.12));
        ctx.globalAlpha = fadeO; ctx.fillStyle = g; ctx.fillRect(-pw / 2, hem, pw, nh - hem); ctx.globalAlpha = 1;
      }
      if (p.mon && i === Math.floor(k / 2) - (k % 2 ? 0 : 1) && k > 1) {
        // janome crest (蛇の目): solid disc, cloth ring, solid core
        const mx0 = k % 2 ? 0 : pw / 2 + gap / 2, my0 = hem + pw * 0.2, mr = pw * 0.1;
        env.circle(mx0, my0, mr, tc, null, 0, fadeO, false);
        env.circle(mx0, my0, mr * 0.62, clothC, null, 0, fadeO, false);
        env.circle(mx0, my0, mr * 0.3, tc, null, 0, fadeO, false);
      }
      const t = units[i] || '';
      if (t) {
        const g2 = J.glyphCount(t);
        const r = J.mainDraw(env, { text: t, font: p.font, size, x: 0, y: hem + (nh - hem) * 0.5 - g2 * size * 0.52 + (p.mon ? pw * 0.12 : 0), vertical: true, align: 'left', track: 0.04, color: tc, noHold: plateHold(env), mi: miAt(env, t1 + 0.15) });
        if (r) bb = J.unionBB(bb, box(px, rodY, px + pw, rodY + nh));
      }
      ctx.restore(); ctx.restore();
    }
    return bb;
  },
});

/* ======================================================================
   25  tanzaku — 短冊
   ====================================================================== */
reg('tanzaku', {
  name: '短冊', tags: ['emotional', 'calm', 'pop'], w: 0.7, ae: 'vcols', treat: 'safe', fits: n => n >= 1 && n <= 16, portrait: 1.2,
  enterBias: { blur: 1.3, drop: 1.3, cut: 1.2, slice: 0.4, stretch: 0.4 },
  plan: (rng, cut, st) => {
    const n = cut.n;
    const k = n <= 6 ? 1 : n <= 11 ? 2 : 3;
    return { font: rng.chance(0.4) ? 'brush' : rng.pick(fontsOf(st, ['serif', 'display'])), chunks: hasLatin(cut.text) ? splitK(cut.text, k) : splitK(strip(cut.text), k, k), extra: rng.int(2, 3), cols: [rng.int(0, 4), rng.int(0, 4), rng.int(0, 4), rng.int(0, 4), rng.int(0, 4), rng.int(0, 4)], ph: rng.range(0, 6), dir: rng.pick([1, -1]) };
  },
  render(env) {
    const { W, H, sc, ctx } = env, p = env.cut.params, u = U(env), port = isPort(env);
    const out = tout(env);
    const C = card(sc);
    const chunks = (p.chunks && p.chunks.length ? p.chunks : [vtext(env.cut.text)]).filter(Boolean).map(vtext);
    const k = chunks.length;
    const pal = [plateCol(sc, [sc.accent, sc.ink]), C.fill, plateCol(sc, [sc.accent2, sc.sub, sc.accent]), J.mix(sc.bg, sc.accent, 0.55), plateCol(sc, [sc.ink, sc.fg])];
    // bamboo branch across the top
    const by = x => H * 0.1 + (x / W) * H * 0.06 * p.dir + Math.sin(x / W * 3) * H * 0.012;
    const be = tin(env, 0, 0.5, E.inOutCubic) * out;
    const bpts = []; for (let i = 0; i <= 24; i++) { const x = J.lerp(-20, W + 20, i / 24); bpts.push([x, by(x)]); }
    const stemC = J.mix(plateCol(sc, [sc.accent2, sc.sub]), sc.sub, 0.3);
    env.polyPartial(bpts, be, stemC, Math.max(5, u * 0.01), 1, false);
    for (let i = 1; i < 8; i++) { const nx = W * i / 8; if (nx / W < be) env.line([[nx, by(nx) - u * 0.009], [nx, by(nx) + u * 0.009]], J.mix(stemC, darkest(sc), 0.4), Math.max(3, u * 0.005), out, false); }
    // leaves
    for (let i = 0; i < 9; i++) {
      const lx = W * (0.05 + i * 0.115), la = J.clamp(be * 9 - i) * out;
      if (la <= 0) continue;
      const ang = (i % 2 ? 1 : -1) * 35 + Math.sin(env.ltb * 1.4 + i) * 6, L = u * 0.07, wdt = u * 0.018;
      const ly = by(lx), ca = Math.cos(ang * J.DEG), sa = Math.sin(ang * J.DEG);
      const pts = [[lx, ly], [lx + ca * L * 0.5 - sa * wdt, ly + sa * L * 0.5 + ca * wdt], [lx + ca * L, ly + sa * L], [lx + ca * L * 0.5 + sa * wdt, ly + sa * L * 0.5 - ca * wdt]];
      env.blob(pts, stemC, la * 0.85, false);
    }
    // strips: lyric strips + blank decoration strips
    const nS = k + (port ? 1 : p.extra);
    const hero = [];
    const order = [];
    for (let i = 0; i < nS; i++) order.push(i);
    // lyric strips go to the middle slots
    const mid = Math.floor((nS - k) / 2);
    const maxG = Math.max(...chunks.map(c => J.glyphCount(c)));
    const sw = Math.min(W * (port ? 0.9 : 0.62) / (nS * 1.3), u * (port ? 0.2 : 0.16)), shMax = H * (port ? 0.7 : 0.72);
    const size = Math.min(sw * 0.64, (shMax - sw * 0.4) / (Math.max(maxG, 2.5) * 1.08 + 1.6));
    let bb = null;
    for (let i = 0; i < nS; i++) {
      const isL = i >= mid && i < mid + k;
      const t = isL ? chunks[i - mid] : '';
      const x = W / 2 + (i - (nS - 1) / 2) * sw * 1.3 * (port ? 1 : 1.1);
      const top = by(x) + u * 0.012;
      const sh = isL ? Math.max(sw * 2.6, J.glyphCount(t) * size * 1.08 + size * 1.6) : sw * (2.4 + (i % 3) * 0.5);
      const string = u * (0.03 + (i % 3) * 0.022);
      const t1 = 0.05 + Math.abs(i - (nS - 1) / 2) * 0.07;
      const e = J.clamp((env.lt - t1) / 0.5);
      if (e <= 0) continue;
      const drop = (1 - E.outBack(e, 1.6)) * H * 0.25;
      const sway = Math.sin(env.ltb * 1.3 + i * 0.9 + p.ph) * 2.5 + E.inCubic(env.pOut) * (i % 2 ? 1 : -1) * 20;
      const a = J.clamp(e * 3) * (1 - J.clamp((env.pOut - 0.4) / 0.6));
      ctx.save(); ctx.translate(x, top); ctx.rotate(sway * J.DEG); ctx.translate(0, -drop);
      env.line([[0, 0], [0, string]], sc.sub, Math.max(1, u * 0.0016), a, false);
      const col = isL ? pal[p.cols[i % 6] % 3 === 1 ? 1 : p.cols[i % 6] % 3 === 2 ? 2 : 0] : pal[(p.cols[i % 6] + 3) % 5];
      shadowR(env, -sw / 2, string, sw, sh, 0, a, u * 0.008);
      env.rect(-sw / 2, string, sw, sh, col, a, false);
      if (J.contrast(col, sc.bg) < 1.3) env.line([[-sw / 2, string], [sw / 2, string], [sw / 2, string + sh], [-sw / 2, string + sh], [-sw / 2, string]], J.mix(sc.fg, col, 0.5), 1.2, a, false);
      env.circle(0, string + sw * 0.18, sw * 0.05, sc.bg, null, 0, a, false);
      if (isL) {
        const r = J.mainDraw(env, { text: t, font: p.font, size, x: 0, y: string + size * 0.9, vertical: true, align: 'left', track: 0.06, color: onCol(sc, col), noHold: plateHold(env), mi: miAt(env, t1 + 0.25) });
        if (r) hero.push(1);
        bb = J.unionBB(bb, box(x - sw / 2, top + string, x + sw / 2, top + string + sh));
      }
      ctx.restore();
    }
    return bb;
  },
});

/* ======================================================================
   26  omikuji — おみくじ
   ====================================================================== */
const KUJI = ['大吉', '吉', '中吉', '小吉', '末吉', '大吉'];
const KUJI_CAT = ['願望', '待人', '失物', '旅行', '商売', '学問', '恋愛', '健康'];
reg('omikuji', {
  name: 'おみくじ', tags: ['emotional', 'calm', 'editorial'], w: 0.7, ae: 'vcols', treat: 'safe', fits: n => n >= 1 && n <= 16, portrait: 1.1,
  enterBias: { wipe: 1.5, blur: 1.3, type: 1.2 },
  plan: (rng, cut, st) => ({ font: rng.chance(0.4) ? 'brush' : rng.pick(fontsOf(st, ['serif'])), rank: rng.pick(KUJI), cats: KUJI_CAT.slice().sort(() => rng() - 0.5).slice(0, 4) }),
  render(env) {
    const { W, H, sc, ctx } = env, p = env.cut.params, u = U(env), port = isPort(env);
    const out = tout(env), ls = smallSize(env);
    const C = card(sc);
    const red = plateCol(sc, [sc.accent, sc.accent2, C.text], C.fill, 1.7);
    const t0 = vtext(env.cut.text);
    const sw = port ? W * 0.84 : Math.min(W * 0.88, H * 1.7), sh = port ? Math.min(H * 0.82, sw * 1.7) : Math.min(H * 0.66, sw * 0.46);
    const x0 = W / 2 - sw / 2, y0 = H / 2 - sh / 2;
    // unfold: landscape opens right → left, portrait top → bottom
    const op = E.inOutCubic(J.clamp((ltU(env) - 0.03) / 0.55)) * (1 - E.inOutCubic(J.clamp((pOutU(env) - 0.1) / 0.8)));
    const a = tin(env, 0, 0.2, E.outCubic) * (1 - J.clamp((env.pOut - 0.75) / 0.25));
    if (a <= 0.01) return null;
    const vis = Math.max(0.12, op);
    const cx0 = port ? x0 : x0 + sw * (1 - vis), cy0 = y0, cw = port ? sw : sw * vis, ch = port ? sh * vis : sh;
    shadowR(env, cx0, cy0, cw, ch, 0, a, u * 0.012);
    env.rect(cx0, cy0, cw, ch, C.fill, a, false);
    if (C.edge) env.line([[cx0, cy0], [cx0 + cw, cy0], [cx0 + cw, cy0 + ch], [cx0, cy0 + ch], [cx0, cy0]], C.line, 1.2, a, false);
    ctx.save(); ctx.beginPath(); ctx.rect(cx0, cy0, cw, ch); ctx.clip();
    const m = Math.min(sw, sh) * 0.05;
    const lw = Math.max(1.5, u * 0.002);
    env.line([[x0 + m, y0 + m], [x0 + sw - m, y0 + m], [x0 + sw - m, y0 + sh - m], [x0 + m, y0 + sh - m], [x0 + m, y0 + m]], red, lw * 1.8, a, false);
    env.line([[x0 + m * 1.35, y0 + m * 1.35], [x0 + sw - m * 1.35, y0 + m * 1.35], [x0 + sw - m * 1.35, y0 + sh - m * 1.35], [x0 + m * 1.35, y0 + sh - m * 1.35], [x0 + m * 1.35, y0 + m * 1.35]], red, lw * 0.7, a, false);
    const ix0 = x0 + m * 2, iy0 = y0 + m * 2, iw = sw - m * 4, ih = sh - m * 4;
    const no = '第' + kanjiNum(lineN(env)) + '番';
    let bb;
    if (!port) {
      // columns right → left: number, rank, the poem (lyric), fortunes grid
      const colW = ih * 0.14;
      const hx = ix0 + iw - colW * 0.6;
      env.draw({ text: no, font: serifF(env), size: Math.min(colW * 0.6, ih * 0.8 / no.length), vertical: true, align: 'left', x: hx, y: iy0 + ih * 0.06, color: C.text, alpha: a, ghost: false });
      const rw = colW * 1.2, rx = hx - colW * 0.5 - rw - m * 0.4;
      env.rect(rx, iy0 + ih * 0.04, rw, ih * 0.92, red, a, false);
      const rt = p.rank;
      env.draw({ text: rt, font: serifF(env), size: Math.min(rw * 0.7, ih * 0.8 / rt.length), vertical: true, x: rx + rw / 2, y: iy0 + ih / 2, track: 0.2, color: onCol(sc, red), alpha: a, ghost: false });
      const px1 = rx - m, catW = iw * 0.3;
      const pw = px1 - (ix0 + catW) - m;
      const fb = fitBlock(t0, p.font, pw, ih * 0.9, { vertical: true, lead: 1.35, track: 0.06 }, 3);
      const size = Math.min(fb.size, ih * 0.3);
      const mm = meas(fb.text, p.font, size, { vertical: true, lead: 1.35, track: 0.06 });
      bb = J.mainDraw(env, { text: fb.text, font: p.font, size, x: px1 - pw / 2, y: iy0 + (ih - mm.h) / 2, vertical: true, align: 'left', lead: 1.35, track: 0.06, color: C.text, noHold: plateHold(env), mi: miAt(env, 0.22) });
      // fortunes: 2 × 2 cells
      env.line([[ix0 + catW + m * 0.5, iy0], [ix0 + catW + m * 0.5, iy0 + ih]], red, lw, a, false);
      p.cats.forEach((c, i) => {
        const cx = ix0 + catW - (i % 2 + 0.5) * catW / 2, cy = iy0 + (Math.floor(i / 2)) * ih / 2;
        env.draw({ text: c, font: serifF(env), size: ls * 1.05, vertical: true, align: 'left', x: cx + catW * 0.12, y: cy + ls * 0.8, color: red, alpha: a, ghost: false });
        greek(env, cx - catW * 0.24, cy + ls * 0.8, catW * 0.28, ih / 2 - ls * 2, ls * 0.9, C.text, a * 0.35, i + 7, true);
        if (i % 2 === 0) env.line([[ix0, cy + ih / 2], [ix0 + catW, cy + ih / 2]], red, lw * 0.6, a * (i === 0 ? 1 : 0), false);
      });
    } else {
      // tall slip: header band, rank, poem, fortunes band
      const hh = ih * 0.1;
      env.draw({ text: no, font: serifF(env), size: hh * 0.5, track: 0.3, x: W / 2, y: iy0 + hh * 0.45, color: C.text, alpha: a, ghost: false });
      const rw = iw * 0.4, rh = hh * 1.2;
      env.rect(W / 2 - rw / 2, iy0 + hh, rw, rh, red, a, false);
      env.draw({ text: p.rank, font: serifF(env), size: rh * 0.62, track: 0.3, x: W / 2, y: iy0 + hh + rh / 2, color: onCol(sc, red), alpha: a, ghost: false });
      const catH = ih * 0.2;
      const pt = iy0 + hh + rh + m, pb = iy0 + ih - catH - m;
      const fb = fitBlock(t0, p.font, iw * 0.84, pb - pt, { vertical: true, lead: 1.35, track: 0.06 }, 3);
      const size = Math.min(fb.size, iw * 0.3);
      const mm = meas(fb.text, p.font, size, { vertical: true, lead: 1.35, track: 0.06 });
      bb = J.mainDraw(env, { text: fb.text, font: p.font, size, x: W / 2, y: pt + (pb - pt - mm.h) / 2, vertical: true, align: 'left', lead: 1.35, track: 0.06, color: C.text, noHold: plateHold(env), mi: miAt(env, 0.25) });
      env.line([[ix0, pb + m * 0.5], [ix0 + iw, pb + m * 0.5]], red, lw, a, false);
      p.cats.forEach((c, i) => {
        const cw2 = iw / 4, cx = ix0 + iw - (i + 0.5) * cw2;
        env.draw({ text: c, font: serifF(env), size: ls, vertical: true, align: 'left', x: cx + cw2 * 0.22, y: pb + m, color: red, alpha: a, ghost: false });
        greek(env, cx - cw2 * 0.4, pb + m, cw2 * 0.5, catH - m, ls * 0.8, C.text, a * 0.35, i + 7, true);
      });
    }
    ctx.restore();
    // creases
    const cr = J.mix(C.fill, C.text, 0.12);
    for (let i = 1; i < 4; i++) {
      if (port) { const y = y0 + sh * i / 4; if (y < cy0 + ch) env.line([[x0, y], [x0 + sw, y]], cr, 1, a * 0.8, false); }
      else { const x = x0 + sw * i / 4; if (x > cx0) env.line([[x, y0], [x, y0 + sh]], cr, 1, a * 0.8, false); }
    }
    return bb;
  },
});

/* ======================================================================
   27  kakejiku — 掛け軸
   ====================================================================== */
reg('kakejiku', {
  name: '掛け軸', tags: ['calm', 'emotional', 'editorial'], w: 0.7, ae: 'vcols', treat: 'safe', fits: n => n >= 1 && n <= 14, portrait: 1.3,
  enterBias: { blur: 1.4, wipe: 1.3, cut: 1.2, slice: 0.4, stretch: 0.4 },
  plan: (rng, cut, st) => ({ font: rng.chance(0.5) ? 'brush' : rng.pick(fontsOf(st, ['serif'])), variant: portOf(cut) ? 'kake' : rng.pick(['kake', 'kake', 'yoko']), mount: rng.pick(['accent', 'ink', 'sub']), seal: rng.chance(0.7) }),
  render(env) {
    const { W, H, sc, ctx } = env, p = env.cut.params, u = U(env), port = isPort(env);
    const out = tout(env);
    const C = card(sc);
    const t0 = vtext(env.cut.text);
    const mountC = J.mix(plateCol(sc, p.mount === 'accent' ? [sc.accent, sc.ink] : p.mount === 'ink' ? [sc.ink, sc.accent] : [sc.sub, sc.ink]), darkest(sc), 0.3);
    const goldC = J.mix(plateCol(sc, [sc.accent, sc.accent2, sc.sub], mountC, 1.5), mountC, 0.25);
    const rodC = J.mix(darkest(sc), sc.sub, 0.35);
    const seal = plateCol(sc, [sc.accent, sc.accent2], C.fill, 1.6);
    const open = E.inOutCubic(J.clamp((ltU(env) - 0.08) / 0.7)) * (1 - E.inOutCubic(J.clamp(pOutU(env) / 0.85)));
    const a = tin(env, 0, 0.2, E.outCubic) * (1 - J.clamp((env.pOut - 0.8) / 0.2));
    if (a <= 0.01) return null;
    let bb = null;
    if (p.variant === 'yoko' && !port) {
      // horizontal scroll unrolling right → left
      const sw = W * 0.86, sh = Math.min(H * 0.56, sw * 0.4);
      const x1 = W / 2 + sw / 2, y0 = H / 2 - sh / 2;
      const xr = x1 - sw * open;
      const rodW = sh * 0.07;
      ctx.save(); ctx.beginPath(); ctx.rect(xr, y0 - sh, x1 - xr + rodW, sh * 3); ctx.clip();
      env.rect(x1 - sw, y0, sw, sh, mountC, a, false);
      const px0 = x1 - sw + sw * 0.08, pw = sw * 0.84, py0 = y0 + sh * 0.12, ph2 = sh * 0.76;
      env.rect(px0 - sh * 0.02, py0 - sh * 0.02, pw + sh * 0.04, ph2 + sh * 0.04, goldC, a, false);
      env.rect(px0, py0, pw, ph2, C.fill, a, false);
      const fb = fitBlock(t0, p.font, pw * 0.8, ph2 * 0.86, { vertical: true, lead: 1.4, track: 0.06 }, 4);
      const size = Math.min(fb.size, ph2 * 0.4);
      const mm = meas(fb.text, p.font, size, { vertical: true, lead: 1.4, track: 0.06 });
      bb = J.mainDraw(env, { text: fb.text, font: p.font, size, x: px0 + pw / 2 + mm.w * 0.1, y: py0 + (ph2 - mm.h) / 2, vertical: true, align: 'left', lead: 1.4, track: 0.06, color: C.text, noHold: plateHold(env), mi: miAt(env, 0.25) });
      if (p.seal) env.rect(px0 + pw / 2 - mm.w * 0.5 - size * 0.7, py0 + (ph2 + mm.h) / 2 - size * 0.55, size * 0.45, size * 0.45, seal, a * J.clamp((env.lt - 0.6) * 4), false);
      ctx.restore();
      // rollers
      env.rrect(x1, y0 - rodW * 0.8, rodW, sh + rodW * 1.6, rodW * 0.4, rodC, a, false);
      env.rrect(xr - rodW, y0 - rodW * 1.4, rodW * 1.3, sh + rodW * 2.8, rodW * 0.5, rodC, a, false);
      return bb;
    }
    // hanging scroll unrolling downwards
    const sw = port ? W * 0.6 : Math.min(W * 0.32, H * 0.42), sh = H * (port ? 0.8 : 0.86);
    const cx = W / 2, y0 = H / 2 - sh / 2 + H * 0.03;
    const rodH = sw * 0.06;
    // cord + hook
    env.line([[cx - sw * 0.28, y0], [cx, y0 - H * 0.06], [cx + sw * 0.28, y0]], sc.sub, Math.max(1.5, u * 0.0025), a, false);
    env.circle(cx, y0 - H * 0.06, u * 0.006, sc.fg, null, 0, a, false);
    const yb = y0 + sh * Math.max(0.03, open);
    ctx.save(); ctx.beginPath(); ctx.rect(cx - sw, y0 - 2, sw * 2, yb - y0 + 2); ctx.clip();
    env.rect(cx - sw / 2, y0, sw, sh, mountC, a, false);
    // 一文字 strips + paper
    const pt = y0 + sh * 0.2, pb = y0 + sh * 0.84, pw = sw * 0.78;
    env.rect(cx - pw / 2 - sw * 0.02, pt - sh * 0.03, pw + sw * 0.04, pb - pt + sh * 0.06, goldC, a, false);
    env.rect(cx - pw / 2, pt, pw, pb - pt, C.fill, a, false);
    const fb = fitBlock(t0, p.font, pw * 0.82, (pb - pt) * 0.86, { vertical: true, lead: 1.35, track: 0.08 }, 2);
    const size = Math.min(fb.size, pw * 0.5);
    const mm = meas(fb.text, p.font, size, { vertical: true, lead: 1.35, track: 0.08 });
    const ty = pt + ((pb - pt) - mm.h) * 0.4;
    bb = J.mainDraw(env, { text: fb.text, font: p.font, size, x: cx, y: ty, vertical: true, align: 'left', lead: 1.35, track: 0.08, color: C.text, noHold: plateHold(env), mi: miAt(env, 0.2) });
    if (p.seal) {
      // seal below-left of the last column, like a signature stamp
      const ss = Math.min(Math.max(size * 0.42, pw * 0.1), pw * 0.16);
      const sxx = Math.max(cx - pw / 2 + ss * 0.3, cx - mm.w / 2 - ss * 1.1), syy = Math.min(pb - ss * 1.3, ty + mm.h - ss * 0.6);
      const sa = a * J.clamp((env.lt - 0.7) * 4);
      env.rect(sxx, syy, ss, ss, seal, sa, false);
      env.rect(sxx + ss * 0.18, syy + ss * 0.18, ss * 0.64, ss * 0.64, J.mix(seal, C.fill, 0.35), sa * 0.5, false);
    }
    ctx.restore();
    // top rod and bottom roller with knobs
    env.rrect(cx - sw * 0.53, y0 - rodH * 0.5, sw * 1.06, rodH, rodH * 0.4, rodC, a, false);
    env.rrect(cx - sw * 0.55, yb - rodH * 0.3, sw * 1.1, rodH * 1.3, rodH * 0.5, rodC, a, false);
    env.rrect(cx - sw * 0.62, yb - rodH * 0.45, sw * 0.08, rodH * 1.6, rodH * 0.3, goldC, a, false);
    env.rrect(cx + sw * 0.54, yb - rodH * 0.45, sw * 0.08, rodH * 1.6, rodH * 0.3, goldC, a, false);
    return bb ? box(cx - sw / 2, y0, cx + sw / 2, y0 + sh) : null;
  },
});

/* ======================================================================
   28  shoji — 障子
   ====================================================================== */
function shojiPanel(env, x, y, w, h, paperC, woodC, a, cols, rows, glow) {
  const { ctx } = env;
  const fw = Math.max(4, w * 0.045), bw = Math.max(2, w * 0.012);
  if (paperC) { env.rect(x, y, w, h, paperC, a, false); if (glow != null && glow < 1) env.rect(x, y, w, h, env.sc.bg, a * (1 - glow) * 0.6, false); }
  // frame
  env.rect(x, y, w, fw, woodC, a, false); env.rect(x, y + h - fw * 1.6, w, fw * 1.6, woodC, a, false);
  env.rect(x, y, fw, h, woodC, a, false); env.rect(x + w - fw, y, fw, h, woodC, a, false);
  // kumiko lattice
  if (env.pass !== 'main' || a <= 0.01) return;
  ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = woodC;
  for (let c = 1; c < cols; c++) ctx.fillRect(x + fw + (w - fw * 2) * c / cols - bw / 2, y, bw, h);
  for (let r = 1; r < rows; r++) ctx.fillRect(x, y + fw + (h - fw * 2.6) * r / rows - bw / 2, w, bw);
  ctx.restore();
}
reg('shoji', {
  name: '障子', tags: ['calm', 'emotional', 'graphic'], w: 0.7, ae: 'center', busy: true, treat: 'safe', fits: n => n >= 1 && n <= 16,
  enterBias: { blur: 1.6, cut: 1.2, wipe: 0.6, slice: 0.4 },
  plan: (rng, cut, st) => ({ font: rng.pick(fontsOf(st, ['serif', 'display'])), variant: rng.pick(['shadow', 'open', 'shadow']), rows: rng.int(4, 6), cols: rng.int(2, 3) }),
  render(env) {
    const { W, H, sc, ctx } = env, p = env.cut.params, u = U(env), port = isPort(env);
    const C = card(sc);
    const paperC = J.lum(sc.bg) < 0.5 ? J.mix(C.fill, sc.accent, 0.08) : J.mix(C.fill, sc.dim, 0.2);
    const woodC = J.mix(darkest(sc), plateCol(sc, [sc.accent, sc.sub]), 0.35);
    const nP = port ? 2 : 4;
    const pw = W / nP, ph = H;
    const t0 = env.cut.text.trim();
    const glow = 0.92 + 0.08 * J.noise1(env.ltb * 0.8, env.cut.seed);
    let bb = null;
    if (p.variant === 'shadow') {
      // the lyric is a silhouette behind the paper; the lattice sits in front of it
      const a = tin(env, 0, 0.3, E.outCubic) * (1 - J.clamp((env.pOut - 0.5) / 0.5));
      if (a <= 0.01) return null;
      env.rect(0, 0, W, H, paperC, a * glow, false);
      if (env.pass === 'main') {
        const g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.hypot(W, H) * 0.6);
        g.addColorStop(0, J.rgba(lightest(sc), 0.25)); g.addColorStop(1, J.rgba(darkest(sc), 0.25));
        ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
      }
      const fb = fitBlock(t0, p.font, W * 0.8, H * 0.5, { lead: 1.15, track: 0.04 }, port ? 4 : 2);
      const size = Math.min(fb.size, u * 0.26);
      const near = E.outCubic(J.clamp(env.lt / 0.9));
      const shade = J.mix(paperC, darkest(sc), 0.86);
      bb = J.mainDraw(env, { text: fb.text, font: p.font, size, x: W / 2 + (1 - near) * W * 0.03, y: H / 2, lead: 1.15, track: 0.04, color: shade, blur: env.allowFilter ? J.lerp(size * 0.08, size * 0.012, near) : 0, sx: J.lerp(1.06, 1, near), sy: J.lerp(1.06, 1, near) });
      for (let i = 0; i < nP; i++) shojiPanel(env, i * pw, 0, pw, ph, null, woodC, a, p.cols, p.rows);
      return bb;
    }
    // panels slide open to reveal the lyric; they close again on exit
    const fb = fitBlock(t0, p.font, W * (port ? 0.6 : 0.5), H * 0.46, { lead: 1.15, track: 0.04 }, port ? 4 : 3);
    const size = Math.min(fb.size, u * 0.24);
    const mm = meas(fb.text, p.font, size, { lead: 1.15, track: 0.04 });
    bb = J.mainDraw(env, { text: fb.text, font: p.font, size, x: W / 2, y: H / 2, lead: 1.15, track: 0.04, color: sc.fg, mi: miAt(env, 0.12) });
    const gapW = Math.min(W * (port ? 0.76 : 0.9), mm.w + size * 1.4);
    const op = E.inOutCubic(J.clamp((env.lt - 0.05) / 0.55)) * (1 - E.inOutCubic(env.pOut));
    const half = nP / 2;
    for (let i = 0; i < nP; i++) {
      const left = i < half;
      const dx = (left ? -1 : 1) * (gapW / 2) * op;
      shojiPanel(env, i * pw + dx, 0, pw, ph, paperC, woodC, 1, p.cols, p.rows, glow);
    }
    return bb;
  },
});

/* ======================================================================
   29  clapper — カチンコ
   ====================================================================== */
reg('clapper', {
  name: 'カチンコ', tags: ['pop', 'graphic', 'editorial'], w: 0.6, ae: 'labels', treat: 'safe', fits: n => n >= 1 && n <= 16,
  enterBias: { cut: 1.8, pop: 1.2, blur: 0.5 },
  plan: (rng, cut, st) => ({ font: rng.chance(0.5) ? 'klee' : rng.pick(fontsOf(st, ['display', 'body'])), tilt: rng.range(-6, 6), roll: 'A' + rng.int(1, 9), take: rng.int(1, 12) }),
  render(env) {
    const { W, H, sc, ctx } = env, p = env.cut.params, u = U(env), port = isPort(env);
    const out = tout(env), ls = smallSize(env);
    const bw = port ? W * 0.88 : Math.min(W * 0.56, H * 0.74 * 1.3), bh = bw * 0.62;
    const slate = plateCol(sc, [darkest(sc), sc.ink, sc.fg], sc.bg, 1.4);
    const chalk = onCol(sc, slate);
    const e = E.outCubic(J.clamp(env.lt / 0.4)), eo = E.inCubic(env.pOut);
    const a = J.clamp(e * 2) * (1 - eo);
    if (a <= 0.01) return null;
    const cx = W / 2, cy = H / 2 + bh * 0.1 + (1 - e) * H * 0.5 + eo * H * 0.2;
    // clap: stick opens then snaps shut at tc
    const tcl = 0.42;
    const openA = env.lt < tcl ? -28 * E.outCubic(J.clamp(env.lt / 0.25)) * (1 - E.inQuad(J.clamp((env.lt - 0.28) / (tcl - 0.28)))) : 0;
    const shake = env.lt > tcl && env.lt < tcl + 0.15 ? J.rs(env.step, 7) * u * 0.006 * (1 - (env.lt - tcl) / 0.15) : 0;
    ctx.save(); ctx.translate(cx + shake, cy + shake * 0.6); ctx.rotate(p.tilt * J.DEG);
    const x0 = -bw / 2, y0 = -bh / 2;
    shadowR(env, x0, y0 - bh * 0.3, bw, bh * 1.3, bh * 0.03, a, u * 0.016);
    env.rrect(x0, y0, bw, bh, bh * 0.03, slate, a, false, J.contrast(slate, sc.bg) < 1.5 ? sc.fg : null, 2);
    // sticks
    const sh = bh * 0.14;
    const stickC1 = slate, stickC2 = chalk;
    const drawStick = (yy) => {
      if (env.pass !== 'main') return;
      stripes(env, x0, yy, bw, sh, stickC1, stickC2, bw * 0.055, -35, a);
      ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = chalk; ctx.lineWidth = 1.5; ctx.strokeRect(x0, yy, bw, sh); ctx.restore();
    };
    drawStick(y0 - sh - bh * 0.01);
    ctx.save(); ctx.translate(x0, y0 - sh - bh * 0.01); ctx.rotate(openA * J.DEG); ctx.translate(-x0, -(y0 - sh - bh * 0.01));
    drawStick(y0 - sh * 2 - bh * 0.02);
    ctx.restore();
    env.circle(x0 + sh * 0.5, y0 - sh * 1.05, sh * 0.22, chalk, null, 0, a, false);
    // grid & fields
    const lw = Math.max(1.5, u * 0.0022);
    const r1 = y0 + bh * 0.5, r2 = y0 + bh * 0.76;
    env.line([[x0, r1], [x0 + bw, r1]], chalk, lw, a * 0.8, false);
    env.line([[x0, r2], [x0 + bw, r2]], chalk, lw, a * 0.8, false);
    [1 / 3, 2 / 3].forEach(f => env.line([[x0 + bw * f, r1], [x0 + bw * f, y0 + bh]], chalk, lw, a * 0.8, false));
    const lab = (t, x, y) => env.draw({ text: t, font: monoF(env), size: ls * 0.72, track: 0.2, align: 'left', x, y, color: chalk, alpha: a * 0.75, ghost: false });
    const val = (t, x, y, s2) => env.draw({ text: t, font: p.font, size: s2, align: 'left', x, y, color: chalk, alpha: a * J.clamp((env.lt - 0.2) * 4), ghost: false });
    const pad = bw * 0.025;
    lab('PROD.', x0 + pad, y0 + pad + ls * 0.4);
    const rowH = r2 - r1;
    [['SCENE', lineNo(env)], ['TAKE', String(p.take)], ['ROLL', p.roll]].forEach(([k2, v], i) => { lab(k2, x0 + bw * i / 3 + pad, r1 + ls * 0.6); val(v, x0 + bw * i / 3 + pad, r1 + rowH * 0.62, rowH * 0.46); });
    [['DATE', J.fmtTime(env.cut.start)], ['DIR.', 'JIZURA'], ['CAM.', 'A']].forEach(([k2, v], i) => { lab(k2, x0 + bw * i / 3 + pad, r2 + ls * 0.6); val(v, x0 + bw * i / 3 + pad + ls * 3.2, r2 + (y0 + bh - r2) * 0.55, Math.min((y0 + bh - r2) * 0.42, ls * 1.3)); });
    const fb = fitBlock(env.cut.text.trim(), p.font, bw - pad * 2, (r1 - y0) - ls * 1.6, { lead: 1.08 }, 2);
    const size = Math.min(fb.size, bh * 0.3);
    const bb = J.mainDraw(env, { text: fb.text, font: p.font, size, x: x0 + pad * 1.4, y: y0 + ls * 1.2 + ((r1 - y0) - ls * 1.2) / 2, align: 'left', lead: 1.08, color: chalk, noHold: plateHold(env), mi: miAt(env, 0.25) });
    ctx.restore();
    return bb ? box(cx - bw / 2, cy - bh / 2, cx + bw / 2, cy + bh / 2) : null;
  },
});

/* ======================================================================
   30  warningLabel — 警告ラベル
   ====================================================================== */
const WARN = [['WARNING', '警告'], ['CAUTION', '注意'], ['DANGER', '危険'], ['NOTICE', 'お知らせ']];
function warnTri(env, cx, cy, s, fill, mark, a, flash) {
  const pts = [[cx, cy - s * 0.52], [cx + s * 0.58, cy + s * 0.46], [cx - s * 0.58, cy + s * 0.46]];
  env.poly(pts, fill, a, false);
  env.line(closeLoop(pts), fill, Math.max(2, s * 0.1), a, false);
  const ma = a * flash;
  env.rrect(cx - s * 0.055, cy - s * 0.24, s * 0.11, s * 0.42, s * 0.05, mark, ma, false);
  env.circle(cx, cy + s * 0.3, s * 0.065, mark, null, 0, ma, false);
}
reg('warningLabel', {
  name: '警告ラベル', tags: ['graphic', 'glitch', 'pop'], w: 0.7, ae: 'pill', treat: 'safe', fits: n => n >= 1 && n <= 16,
  enterBias: { cut: 1.5, flicker: 1.5, pop: 1.3, blur: 0.5 },
  plan: (rng, cut, st) => ({ font: rng.pick(fontsOf(st, ['display'])), variant: rng.pick(['header', 'stripe', 'side']), word: rng.int(0, 3), tilt: rng.range(-3, 3) }),
  render(env) {
    const { W, H, sc, ctx } = env, p = env.cut.params, u = U(env), port = isPort(env);
    const out = tout(env), ls = smallSize(env);
    const C = card(sc);
    const lw0 = port ? W * 0.9 : Math.min(W * 0.78, H * 1.55), lh0 = lw0 * (port ? 0.78 : 0.5);
    const q = E.outBack(J.clamp(env.lt / 0.32), 1.5), eo = E.inCubic(env.pOut);
    const a = J.clamp(q * 3) * (1 - eo);
    if (a <= 0.01) return null;
    const warnC = plateCol(sc, [sc.accent, sc.accent2, sc.ink], C.fill, 1.6);
    const inkC = plateCol(sc, [darkest(sc), sc.ink, sc.fg], C.fill, 3);           // text & dark stripes on the label body
    const hazard = plateCol(sc, [sc.accent, sc.accent2, C.fill], inkC, 1.8);
    const [we, wj] = WARN[p.word % WARN.length];
    const flash = env.lt < 0.9 ? (Math.floor(env.lt / 0.12) % 2 ? 0.25 : 1) : 1;
    ctx.save(); ctx.translate(W / 2, H / 2); ctx.rotate((p.tilt + (1 - q) * 4) * J.DEG); ctx.scale(0.85 + 0.15 * q, 0.85 + 0.15 * q);
    const x0 = -lw0 / 2, y0 = -lh0 / 2;
    shadowR(env, x0, y0, lw0, lh0, lh0 * 0.04, a, u * 0.014);
    env.rrect(x0, y0, lw0, lh0, lh0 * 0.04, C.fill, a, false, inkC, Math.max(3, u * 0.004));
    let ax0 = x0, ay0 = y0, aw = lw0, ah = lh0;
    if (p.variant === 'header') {
      const hh = lh0 * 0.26;
      const he = tin(env, 0.06, 0.35, E.outCubic);
      env.rrect(x0, y0, lw0, hh, lh0 * 0.04, warnC, a, false);
      env.rect(x0, y0 + hh * 0.5, lw0, hh * 0.5, warnC, a, false);
      warnTri(env, x0 + hh * 0.75, y0 + hh * 0.52, hh * 0.72, onCol(sc, warnC), warnC, a * he, flash);
      const ht = we + '  ' + wj, hs = Math.min(hh * 0.46, J.fitSize(ht, 'gothic_black', lw0 - hh * 1.8, hh, { track: 0.12 }));
      env.draw({ text: ht, font: 'gothic_black', size: hs, track: 0.12, align: 'left', x: x0 + hh * 1.45, y: y0 + hh * 0.52, color: onCol(sc, warnC), alpha: a * he, ghost: false });
      ay0 = y0 + hh; ah = lh0 - hh;
    } else if (p.variant === 'stripe') {
      const sb = lh0 * 0.11;
      const off = env.ltb * sb * 1.2;
      stripes(env, x0 + 2, y0 + 2, lw0 - 4, sb, inkC, hazard, sb * 0.7, 45, a, off);
      stripes(env, x0 + 2, y0 + lh0 - sb - 2, lw0 - 4, sb, inkC, hazard, sb * 0.7, 45, a, -off);
      warnTri(env, x0 + lw0 / 2, y0 + sb + lh0 * 0.16, lh0 * 0.2, warnC, onCol(sc, warnC), a, flash);
      env.draw({ text: wj + '　' + we, font: 'gothic_black', size: lh0 * 0.06, track: 0.2, x: x0 + lw0 / 2, y: y0 + sb + lh0 * 0.33, color: inkC, alpha: a, ghost: false });
      ay0 = y0 + sb + lh0 * 0.38; ah = lh0 - sb * 2 - lh0 * 0.38;
    } else {
      const sw2 = lw0 * (port ? 0.3 : 0.26);
      env.rrect(x0, y0, sw2, lh0, lh0 * 0.04, warnC, a, false);
      env.rect(x0 + sw2 * 0.5, y0, sw2 * 0.5, lh0, warnC, a, false);
      warnTri(env, x0 + sw2 / 2, y0 + lh0 * 0.42, sw2 * 0.68, onCol(sc, warnC), warnC, a, flash);
      env.draw({ text: we, font: 'gothic_black', size: sw2 * 0.14, track: 0.1, x: x0 + sw2 / 2, y: y0 + lh0 * 0.78, color: onCol(sc, warnC), alpha: a, ghost: false });
      ax0 = x0 + sw2; aw = lw0 - sw2;
    }
    const fb = fitBlock(env.cut.text.trim(), p.font, aw * 0.86, ah * 0.66, { lead: 1.08, track: 0.02 }, port ? 3 : 2);
    const size = Math.min(fb.size, u * 0.2);
    const bb = J.mainDraw(env, { text: fb.text, font: p.font, size, x: ax0 + aw / 2, y: ay0 + ah / 2 - (p.variant === 'stripe' ? 0 : ah * 0.04), lead: 1.08, track: 0.02, color: inkC, noHold: plateHold(env), mi: miAt(env, 0.12) });
    if (p.variant !== 'stripe') env.draw({ text: 'No.' + lineNo(env) + '  —  ' + J.fmtTime(env.cut.start), font: monoF(env), size: ls * 0.8, track: 0.2, align: 'right', x: ax0 + aw - ls, y: ay0 + ah - ls * 0.9, color: inkC, alpha: a * 0.6 * out, ghost: false });
    ctx.restore();
    return bb ? box(W / 2 - lw0 / 2, H / 2 - lh0 / 2, W / 2 + lw0 / 2, H / 2 + lh0 / 2) : null;
  },
});

/* ======================================================================
   31  priceTag — 値札
   ====================================================================== */
const yen = v => '¥' + String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
reg('priceTag', {
  name: '値札', tags: ['pop', 'graphic'], w: 0.6, ae: 'pill', treat: 'safe', fits: n => n >= 1 && n <= 14,
  enterBias: { pop: 1.5, cut: 1.3, drop: 1.2, slice: 0.5 },
  plan: (rng, cut, st) => {
    const price = rng.pick([980, 1280, 1980, 2480, 3300, 4980, 580, 12800]);
    return { font: rng.pick(fontsOf(st, ['display', 'body'])), variant: rng.pick(['hang', 'hang', 'shelf']), price, was: Math.round(price * rng.range(1.25, 1.6) / 10) * 10, col: rng.pick(['card', 'accent']), swing: rng.range(10, 18) * rng.pick([1, -1]) };
  },
  render(env) {
    const { W, H, sc, ctx } = env, p = env.cut.params, u = U(env), port = isPort(env);
    const out = tout(env), ls = smallSize(env);
    const C = card(sc);
    const t0 = env.cut.text.trim();
    const e = J.clamp(env.lt / 0.45), eo = E.inCubic(env.pOut);
    const a = J.clamp(e * 3) * (1 - eo);
    if (a <= 0.01) return null;
    const tagC = p.col === 'accent' ? plateCol(sc, [sc.accent, sc.ink]) : C.fill;
    const tc = onCol(sc, tagC);
    const red = plateCol(sc, [sc.accent, sc.accent2, tc], tagC, 1.8);
    if (p.variant === 'shelf') {
      // supermarket shelf label
      const bw = port ? W * 0.9 : Math.min(W * 0.8, H * 1.8), bh = bw * (port ? 0.5 : 0.34);
      const x0 = W / 2 - bw / 2, y0 = H / 2 - bh / 2 + (1 - E.outBack(e, 1.3)) * H * 0.3 + eo * H * 0.1;
      shadowR(env, x0, y0, bw, bh, bh * 0.03, a, u * 0.012);
      env.rrect(x0, y0, bw, bh, bh * 0.03, tagC, a, false, J.contrast(tagC, sc.bg) < 1.4 ? J.mix(sc.fg, tagC, 0.4) : null, 1.5);
      const hdr = bh * 0.2;
      env.rect(x0, y0, bw, hdr, red, a, false);
      env.draw({ text: 'お買い得  ·  No.' + lineNo(env), font: bodyF(env), size: hdr * 0.5, track: 0.2, align: 'left', x: x0 + bw * 0.03, y: y0 + hdr / 2, color: onCol(sc, red), alpha: a, ghost: false });
      const nameW = bw * (port ? 0.9 : 0.62);
      const nTop = y0 + hdr, nBot = y0 + bh * (port ? 0.62 : 0.8);
      const fb = fitBlock(t0, p.font, nameW * 0.92, (nBot - nTop) * 0.86, { lead: 1.05 }, 2);
      const size = Math.min(fb.size, bh * 0.3);
      const bb = J.mainDraw(env, { text: fb.text, font: p.font, size, x: x0 + bw * 0.04, y: (nTop + nBot) / 2, align: 'left', lead: 1.05, color: tc, noHold: plateHold(env), mi: miAt(env, 0.2) });
      const pa = tin(env, 0.3, 0.35, E.outBack) * out;
      const px = x0 + bw * 0.96, py = port ? y0 + bh * 0.76 : y0 + hdr + (bh - hdr) * 0.44;
      const ps = Math.min((bh - hdr) * (port ? 0.26 : 0.3), size * 0.8);
      env.draw({ text: yen(p.price), font: 'gothic_black', size: ps * J.clamp(pa), align: 'right', x: px, y: py, color: red, alpha: J.clamp(pa), ghost: false });
      env.draw({ text: '税込', font: bodyF(env), size: ls * 0.9, align: 'right', x: px, y: py + ps * 0.62, color: tc, alpha: J.clamp(pa) * 0.8, ghost: false });
      // barcode
      const bx = x0 + bw * 0.04, byy = y0 + bh * 0.88;
      for (let i = 0, x = bx; i < 36 && x < bx + bw * 0.22; i++) { const w2 = bw * (0.002 + 0.004 * J.r(p.price, i, 3)); env.rect(x, byy - bh * 0.06, w2, bh * 0.09, tc, a * 0.8, false); x += w2 + bw * (0.002 + 0.003 * J.r(p.price, i, 4)); }
      return bb ? box(x0, y0, x0 + bw, y0 + bh) : null;
    }
    // hanging swing tag
    const tw = port ? W * 0.62 : Math.min(W * 0.34, H * 0.46), th = tw * 1.45;
    const hx = W / 2 + (port ? 0 : W * 0.04), hy = H * 0.08;
    const cord = H * (port ? 0.12 : 0.1);
    const t = Math.max(0, env.lt);
    const swing = p.swing * Math.exp(-t * 2.2) * Math.cos(t * 5.2) * (1 - eo) + Math.sin(env.ltb * 1.1) * 1.2 + eo * p.swing * 1.5;
    const drop = (1 - E.outBack(e, 1.4)) * -H * 0.4;
    env.circle(hx, hy, u * 0.008, sc.sub, null, 0, a, false);
    ctx.save(); ctx.translate(hx, hy + drop); ctx.rotate(swing * J.DEG);
    // string loop
    env.line([[0, 0], [-tw * 0.1, cord], [0, cord + tw * 0.12], [tw * 0.1, cord], [0, 0]], sc.sub, Math.max(1.5, u * 0.002), a, false);
    const top = cord + tw * 0.05;
    const ch = tw * 0.22;
    const pts = [[-tw / 2 + ch, top], [tw / 2 - ch, top], [tw / 2, top + ch], [tw / 2, top + th], [-tw / 2, top + th], [-tw / 2, top + ch]];
    if (env.pass === 'main') { ctx.save(); ctx.translate(u * 0.008, u * 0.012); env.poly(pts, J.rgba(darkest(sc), J.lum(sc.bg) > 0.5 ? 0.22 : 0.5), a, false); ctx.restore(); }
    env.poly(pts, tagC, a, false);
    if (J.contrast(tagC, sc.bg) < 1.4) env.line(closeLoop(pts), J.mix(sc.fg, tagC, 0.4), 1.5, a, false);
    env.circle(0, top + tw * 0.13, tw * 0.045, sc.bg, J.mix(tagC, tc, 0.3), Math.max(1.5, tw * 0.012), a, false);
    const m = tw * 0.1;
    const fb = fitBlock(t0, p.font, tw - m * 2, th * 0.4, { lead: 1.08 }, 3);
    const size = Math.min(fb.size, tw * 0.3);
    const bb = J.mainDraw(env, { text: fb.text, font: p.font, size, x: 0, y: top + th * 0.36, lead: 1.08, color: tc, noHold: true, plain: true, mi: miAt(env, 0.2) });
    env.line([[-tw / 2 + m, top + th * 0.62], [tw / 2 - m, top + th * 0.62]], tc, Math.max(1, u * 0.0015), a * 0.5, false);
    const pa = tin(env, 0.35, 0.35, E.outBack) * out;
    const was = yen(p.was), now = yen(p.price);
    const ws = tw * 0.1;
    env.draw({ text: was, font: monoF(env), size: ws, x: 0, y: top + th * 0.71, color: tc, alpha: J.clamp(pa) * 0.6, ghost: false });
    const wm = meas(was, monoF(env), ws).w;
    env.line([[-wm / 2 - ws * 0.2, top + th * 0.71], [-wm / 2 - ws * 0.2 + (wm + ws * 0.4) * J.clamp(pa), top + th * 0.71]], red, Math.max(2, ws * 0.12), 1, false);
    env.draw({ text: now, font: 'gothic_black', size: tw * 0.17 * J.clamp(pa), x: 0, y: top + th * 0.86, color: red, alpha: J.clamp(pa), ghost: false });
    ctx.restore();
    return bb ? box(hx - tw / 2, hy + cord, hx + tw / 2, hy + cord + th) : null;
  },
});

/* ======================================================================
   32  nameTag — 名札
   ====================================================================== */
reg('nameTag', {
  name: '名札', tags: ['pop', 'emotional'], w: 0.6, ae: 'pill', treat: 'safe', fits: n => n >= 1 && n <= 14,
  enterBias: { cut: 1.4, type: 1.3, pop: 1.2, slice: 0.5 },
  plan: (rng, cut, st) => ({ font: rng.chance(0.6) ? 'klee' : rng.pick(fontsOf(st, ['display', 'body'])), variant: rng.pick(['hello', 'hello', 'school']), tilt: rng.range(-6, 6), grade: rng.int(1, 6), cls: rng.int(1, 4) }),
  render(env) {
    const { W, H, sc, ctx } = env, p = env.cut.params, u = U(env), port = isPort(env);
    const out = tout(env), ls = smallSize(env);
    const C = card(sc);
    const t0 = env.cut.text.trim();
    const e = J.clamp(env.lt / 0.5), eo = E.inCubic(env.pOut);
    const a = J.clamp(e * 3) * (1 - J.clamp((env.pOut - 0.5) / 0.5));
    if (a <= 0.01) return null;
    const bandC = plateCol(sc, [sc.accent, sc.accent2, sc.ink], C.fill, 1.6);
    const bw = port ? W * 0.86 : Math.min(W * 0.62, H * 1.2), bh = bw * (p.variant === 'hello' ? 0.66 : 0.56);
    const q = E.outBack(e, 1.6);
    const rot = p.tilt * q + (1 - q) * -25 + eo * 18;
    const cx = W / 2 + eo * W * 0.1, cy = H / 2 + (1 - q) * -H * 0.35 + eo * H * 0.5;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot * J.DEG);
    const x0 = -bw / 2, y0 = -bh / 2, r = bh * 0.08;
    shadowR(env, x0, y0, bw, bh, r, a, u * 0.014);
    let bb;
    if (p.variant === 'hello') {
      env.rrect(x0, y0, bw, bh, r, bandC, a, false);
      const hh = bh * 0.3;
      env.rect(x0 + bw * 0.035, y0 + hh, bw * 0.93, bh * 0.58, C.fill, a, false);
      const hc = onCol(sc, bandC);
      env.draw({ text: 'HELLO', font: 'gothic_black', size: hh * 0.52, track: 0.08, x: 0, y: y0 + hh * 0.4, color: hc, alpha: a, ghost: false });
      env.draw({ text: 'my name is', font: bodyF(env), size: hh * 0.2, track: 0.15, x: 0, y: y0 + hh * 0.82, color: hc, alpha: a, ghost: false });
      const fb = fitBlock(t0, p.font, bw * 0.84, bh * 0.46, { lead: 1.05 }, 2);
      const size = Math.min(fb.size, bh * 0.36);
      bb = J.mainDraw(env, { text: fb.text, font: p.font, size, x: 0, y: y0 + hh + bh * 0.29, lead: 1.05, rot: -2, color: C.text, noHold: plateHold(env), mi: miAt(env, 0.3) });
    } else {
      // school name badge: safety pin, class fields, なまえ
      env.rrect(x0, y0, bw, bh, r, C.fill, a, false, bandC, Math.max(4, bw * 0.014));
      const pinY = y0 - bh * 0.06;
      env.line([[x0 + bw * 0.2, pinY], [x0 + bw * 0.8, pinY]], sc.sub, Math.max(3, u * 0.004), a, false);
      env.circle(x0 + bw * 0.8, pinY, u * 0.008, sc.sub, null, 0, a, false);
      const fy = y0 + bh * 0.2;
      env.draw({ text: p.grade + ' ねん　' + p.cls + ' くみ', font: p.font, size: bh * 0.1, align: 'left', x: x0 + bw * 0.08, y: fy, color: C.text, alpha: a, ghost: false });
      env.line([[x0 + bw * 0.06, fy + bh * 0.09], [x0 + bw * 0.94, fy + bh * 0.09]], bandC, Math.max(2, u * 0.003), a, false);
      env.draw({ text: 'なまえ', font: bodyF(env), size: bh * 0.07, align: 'left', x: x0 + bw * 0.08, y: fy + bh * 0.19, color: bandC, alpha: a, ghost: false });
      env.circle(x0 + bw * 0.88, y0 + bh * 0.2, bh * 0.08, bandC, null, 0, a, false);
      const fb = fitBlock(t0, p.font, bw * 0.84, bh * 0.44, { lead: 1.05 }, 2);
      const size = Math.min(fb.size, bh * 0.34);
      bb = J.mainDraw(env, { text: fb.text, font: p.font, size, x: 0, y: y0 + bh * 0.66, lead: 1.05, color: C.text, noHold: plateHold(env), mi: miAt(env, 0.3) });
    }
    ctx.restore();
    return bb ? box(cx - bw / 2, cy - bh / 2, cx + bw / 2, cy + bh / 2) : null;
  },
});

/* ======================================================================
   33  stickyNotes — 付箋
   ====================================================================== */
reg('stickyNotes', {
  name: '付箋', tags: ['pop', 'emotional', 'calm'], w: 0.8, ae: 'labels', treat: 'safe', fits: n => n >= 1 && n <= 18,
  enterBias: { cut: 1.5, pop: 1.4, type: 1.2, slice: 0.5, stretch: 0.5 },
  plan: (rng, cut, st) => {
    const n = cut.n;
    const k = n <= 4 ? 1 : n <= 9 ? 2 : n <= 14 ? 3 : 4;
    return { font: rng.chance(0.6) ? 'klee' : rng.pick(fontsOf(st, ['display', 'body'])), chunks: splitK(cut.text, k, k), layout: rng.pick(['scatter', 'cascade']), rots: [0, 1, 2, 3].map(() => rng.range(-7, 7)), offs: [0, 1, 2, 3].map(() => rng.range(-1, 1)), cols: [0, 1, 2, 3].map(() => rng.int(0, 3)), pin: rng.pick(['glue', 'tape']) };
  },
  render(env) {
    const { W, H, sc, ctx } = env, p = env.cut.params, u = U(env), port = isPort(env);
    const C = card(sc);
    const chunks = (p.chunks && p.chunks.length ? p.chunks : [env.cut.text.trim()]).filter(Boolean);
    const k = chunks.length;
    const acc = plateCol(sc, [sc.accent, sc.ink]);
    const col2 = sc.accent2 && J.lum(sc.accent2) > 0.3 && J.contrast(sc.accent2, sc.bg) > 1.3 ? sc.accent2 : J.mix(C.fill, acc, 0.2);
    const pal = [acc, J.mix(C.fill, acc, 0.45), col2, C.fill];
    // note size and slots
    let ns, pos;
    if (k === 1) { ns = Math.min(W, H) * 0.62; pos = [[W / 2, H / 2]]; }
    else if (p.layout === 'cascade' || port) {
      const dx = port ? 0.14 : 0.88, dy = port ? 0.86 : 0.3;
      ns = Math.min(W * 0.86 / (1 + (k - 1) * dx), H * 0.84 / (1 + (k - 1) * dy), Math.min(W, H) * 0.62);
      pos = chunks.map((c, i) => [W / 2 + (i - (k - 1) / 2) * ns * dx, H / 2 + (i - (k - 1) / 2) * ns * dy]);
    } else {
      ns = Math.min(W * 0.84 / (k * 1.02), H * 0.62);
      pos = chunks.map((c, i) => [W / 2 + (i - (k - 1) / 2) * ns * 1.02, H / 2 + p.offs[i % 4] * H * 0.06]);
    }
    let bb = null;
    chunks.forEach((c, i) => {
      const [x, y] = pos[i];
      const t1 = 0.03 + i * 0.13;
      const e = J.clamp((env.lt - t1) / 0.22);
      if (e <= 0) return;
      const sq = J.lerp(1.18, 1, E.outCubic(e));
      // exit: peel off from the top edge and fall
      const peel = E.inCubic(J.clamp(env.pOut * 1.3 - i * 0.1));
      const a = J.clamp(e * 3) * (1 - J.clamp((peel - 0.6) / 0.4));
      if (a <= 0.01) return;
      const col = pal[p.cols[i % 4] % pal.length];
      const tc = onCol(sc, col);
      const rot = p.rots[i % 4] + peel * 25 * (i % 2 ? 1 : -1);
      ctx.save(); ctx.translate(x, y - ns / 2 + peel * H * 0.3); ctx.rotate(rot * J.DEG); ctx.scale(sq, sq * (1 - peel * 0.3)); ctx.translate(0, ns / 2);
      const hs = ns / 2;
      // curled-corner shadow + note
      if (env.pass === 'main') { ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = J.rgba(darkest(sc), J.lum(sc.bg) > 0.5 ? 0.22 : 0.55); ctx.beginPath(); ctx.moveTo(-hs + ns * 0.02, -hs + ns * 0.04); ctx.lineTo(hs + ns * 0.025, -hs + ns * 0.04); ctx.lineTo(hs + ns * 0.02, hs - ns * 0.02); ctx.quadraticCurveTo(hs - ns * 0.1, hs + ns * 0.05, -hs + ns * 0.04, hs + ns * 0.03); ctx.closePath(); ctx.fill(); ctx.restore(); }
      env.poly([[-hs, -hs], [hs, -hs], [hs, hs - ns * 0.06], [hs - ns * 0.1, hs], [-hs, hs]], col, a, false);
      env.poly([[hs, hs - ns * 0.06], [hs - ns * 0.1, hs], [hs - ns * 0.085, hs - ns * 0.075]], J.mix(col, darkest(sc), 0.25), a, false);
      if (J.contrast(col, sc.bg) < 1.3) env.line([[-hs, -hs], [hs, -hs], [hs, hs - ns * 0.06], [hs - ns * 0.1, hs], [-hs, hs], [-hs, -hs]], J.mix(sc.fg, col, 0.4), 1.2, a, false);
      if (p.pin === 'glue') env.rect(-hs, -hs, ns, ns * 0.1, J.mix(col, darkest(sc), 0.08), a, false);
      else env.rect(-ns * 0.18, -hs - ns * 0.05, ns * 0.36, ns * 0.11, J.rgba(lightest(sc), 0.55), a, false);
      const fb = fitBlock(c, p.font, ns * 0.8, ns * 0.64, { lead: 1.12 }, 3);
      const r = J.mainDraw(env, { text: fb.text, font: p.font, size: Math.min(fb.size, ns * 0.36), x: 0, y: ns * 0.04, lead: 1.12, rot: -1.5, color: tc, noHold: plateHold(env), mi: miAt(env, t1 + 0.08) });
      ctx.restore();
      if (r) bb = J.unionBB(bb, box(x - hs, y - hs, x + hs, y + hs));
    });
    return bb;
  },
});

/* ======================================================================
   34  karuta — かるた札
   ====================================================================== */
reg('karuta', {
  name: 'かるた札', tags: ['pop', 'emotional', 'editorial'], w: 0.6, ae: 'vcols', treat: 'safe', fits: n => n >= 1 && n <= 16,
  enterBias: { cut: 1.6, pop: 1.2, blur: 0.6, slice: 0.5 },
  plan: (rng, cut, st) => ({ font: rng.pick(fontsOf(st, ['serif', 'display'])), variant: portOf(cut) ? rng.pick(['single', 'pair']) : rng.pick(['pair', 'pair', 'single']), from: rng.pick([1, -1]), tilt: rng.range(-4, 4), art: rng.pick(['sun', 'wave', 'mount']) }),
  render(env) {
    const { W, H, sc, ctx } = env, p = env.cut.params, u = U(env), port = isPort(env);
    const out = tout(env), ls = smallSize(env);
    const C = card(sc);
    const t0 = vtext(env.cut.text);
    const first = [...t0][0] || '';
    const frameC = [sc.accent, sc.accent2, sc.ink, C.text].find(c => J.contrast(c, C.fill) >= 1.3 && J.contrast(c, sc.bg) >= 1.3) || C.text;
    const red = plateCol(sc, [sc.accent, sc.accent2, C.text], C.fill, 1.7);
    const pair = p.variant === 'pair';
    const ch = port ? Math.min(H * (pair ? 0.42 : 0.72), W * (pair ? 0.56 : 0.8) / 0.72) : Math.min(H * 0.8, pair ? W * 0.9 / 2.2 / 0.72 : H);
    const cw = ch * 0.72;
    const eo = E.inCubic(env.pOut);
    const slap = (i) => {
      const t1 = i * 0.12;
      const e = J.clamp((env.lt - t1) / 0.28);
      const q = E.outCubic(e);
      const bump = e >= 1 ? Math.exp(-(env.lt - t1 - 0.28) * 14) * Math.sin((env.lt - t1 - 0.28) * 40) * 0.02 : 0;
      return { e, q, bump, t1 };
    };
    // impact lines when a card lands
    const impact = (x, y, w, h, t1) => {
      const k = (env.lt - t1 - 0.26) / 0.25;
      if (k <= 0 || k >= 1) return;
      for (let j = 0; j < 10; j++) {
        const ang = j / 10 * J.TAU + 0.3, r0 = Math.hypot(w, h) * (0.55 + k * 0.1), r1 = r0 + u * 0.05 * (1 - k);
        env.line([[x + Math.cos(ang) * r0 * (w / Math.hypot(w, h)) * 1.4, y + Math.sin(ang) * r0 * (h / Math.hypot(w, h)) * 1.4], [x + Math.cos(ang) * r1 * (w / Math.hypot(w, h)) * 1.4, y + Math.sin(ang) * r1 * (h / Math.hypot(w, h)) * 1.4]], sc.sub, Math.max(2, u * 0.003), 1 - k, false);
      }
    };
    const cardAt = (i, cx, cy, draw) => {
      const S = slap(i);
      if (S.e <= 0) return null;
      const dx = (1 - S.q) * W * 0.7 * p.from, rot = (1 - S.q) * 35 * p.from + p.tilt * (i ? -0.6 : 1);
      const a = J.clamp(S.e * 3) * (1 - eo);
      impact(cx, cy, cw, ch, S.t1);
      ctx.save(); ctx.translate(cx + dx, cy + eo * H * 0.15); ctx.rotate(rot * J.DEG); ctx.scale(1 + S.bump, 1 - S.bump);
      shadowR(env, -cw / 2, -ch / 2, cw, ch, cw * 0.05, a, u * 0.014);
      env.rrect(-cw / 2, -ch / 2, cw, ch, cw * 0.05, frameC, a, false);
      env.rrect(-cw / 2 + cw * 0.06, -ch / 2 + cw * 0.06, cw * 0.88, ch - cw * 0.12, cw * 0.03, C.fill, a, false);
      const r = draw(a, S);
      ctx.restore();
      return r;
    };
    let bb = null;
    const tori = (a) => {
      // grab card: big first glyph in a circle at the top-right, a simple picture
      const R = cw * 0.2;
      const ccx = cw * 0.2, ccy = -ch / 2 + cw * 0.3;
      env.circle(ccx, ccy, R, C.fill, red, Math.max(3, cw * 0.02), a, false);
      env.draw({ text: first, font: p.font, size: R * 1.3, x: ccx, y: ccy, color: red, alpha: a, ghost: false });
      const ay = ch * 0.12, aw = cw * 0.66;
      const artC = plateCol(sc, [sc.accent2, sc.accent, sc.sub], C.fill, 1.3);
      if (p.art === 'sun') { env.circle(0, ay, aw * 0.26, artC, null, 0, a * 0.9, false); env.rect(-aw / 2, ay + aw * 0.2, aw, aw * 0.05, C.text, a * 0.6, false); }
      else if (p.art === 'wave') { for (let j = 0; j < 3; j++) { const pts = []; for (let i = 0; i <= 20; i++) pts.push([-aw / 2 + aw * i / 20, ay + j * aw * 0.14 + Math.sin(i / 20 * J.TAU * 1.5) * aw * 0.05]); env.line(pts, artC, Math.max(3, aw * 0.03), a * 0.9, false); } }
      else env.poly([[-aw / 2, ay + aw * 0.3], [-aw * 0.1, ay - aw * 0.25], [aw * 0.1, ay + aw * 0.02], [aw * 0.25, ay - aw * 0.12], [aw / 2, ay + aw * 0.3]], artC, a * 0.9, false);
      return null;
    };
    const verse = (a, S, big) => {
      const iw = cw * 0.72, ih = big ? ch - cw * 0.72 : ch * 0.8;
      const fb = fitBlock(t0, p.font, iw, ih, { vertical: true, lead: 1.3, track: 0.05 }, 3);
      const size = Math.min(fb.size, cw * 0.3);
      const mm = meas(fb.text, p.font, size, { vertical: true, lead: 1.3, track: 0.05 });
      const y = big ? -ch / 2 + cw * 0.58 + (ih - mm.h) * 0.3 : -mm.h / 2;
      return J.mainDraw(env, { text: fb.text, font: p.font, size, x: 0, y, vertical: true, align: 'left', lead: 1.3, track: 0.05, color: C.text, noHold: plateHold(env), mi: miAt(env, S.t1 + 0.2) });
    };
    if (pair) {
      const gap = cw * 0.18;
      const ax = port ? W / 2 : W / 2 + (cw + gap) / 2, ay = port ? H / 2 - (ch + gap) / 2 : H / 2;
      const bx = port ? W / 2 : W / 2 - (cw + gap) / 2, by = port ? H / 2 + (ch + gap) / 2 : H / 2;
      // 読み札 (the verse) + 取り札 (the first glyph)
      const r = cardAt(0, ax, ay, (a, S) => { env.draw({ text: '読', font: serifF(env), size: cw * 0.1, x: cw * 0.34, y: -ch / 2 + cw * 0.16, color: red, alpha: a, ghost: false }); return verse(a, S, false); });
      if (r) bb = box(ax - cw / 2, ay - ch / 2, ax + cw / 2, ay + ch / 2);
      cardAt(1, bx, by, (a) => tori(a));
      return bb;
    }
    const r = cardAt(0, W / 2, H / 2, (a, S) => {
      const R = cw * 0.2, ccx = cw * 0.2, ccy = -ch / 2 + cw * 0.3;
      env.circle(ccx, ccy, R, C.fill, red, Math.max(3, cw * 0.02), a, false);
      env.draw({ text: first, font: p.font, size: R * 1.3, x: ccx, y: ccy, color: red, alpha: a, ghost: false });
      return verse(a, S, true);
    });
    return r ? box(W / 2 - cw / 2, H / 2 - ch / 2, W / 2 + cw / 2, H / 2 + ch / 2) : null;
  },
});

})();
