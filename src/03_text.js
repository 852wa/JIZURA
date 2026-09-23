/* ============================================================
   JIZURA — text items: layout + drawing (whole glyphs or pieces)
   ============================================================ */
(() => {
'use strict';

J.PID = Object.freeze({ dx: 0, dy: 0, rot: 0, s: 1, st: 1, sdir: 0, a: 1 });
J.PT = (dx = 0, dy = 0, rot = 0, s = 1, st = 1, sdir = 0, a = 1) => ({ dx, dy, rot, s, st, sdir, a });

/* layout: glyph centres relative to the item origin, in unscaled item space */
J.layoutText = (it) => {
  const text = String(it.text ?? '');
  const size = it.size, track = it.track || 0, sx = it.sx || 1, sy = it.sy || 1;
  const lines = text.split('\n');
  const out = [];
  const vertical = !!it.vertical;
  const lead = (it.lead || 1.3) * size;
  let gi = 0;
  if (!vertical) {
    const widths = lines.map(line => {
      let w = 0; const arr = [...line];
      arr.forEach((ch, i) => { w += J.metrics.adv(it.font, ch) * size + (i < arr.length - 1 ? track * size : 0); });
      return w;
    });
    const maxW = Math.max(1, ...widths);
    lines.forEach((line, li) => {
      const arr = [...line];
      let x = it.align === 'left' ? 0 : it.align === 'right' ? -widths[li] : -widths[li] / 2;
      const y = (li - (lines.length - 1) / 2) * lead;
      arr.forEach((ch, ci) => {
        const a = J.metrics.adv(it.font, ch) * size;
        out.push({ ch, i: gi++, li, ci, n: arr.length, x: x + a / 2, y, w: a, h: size, r90: false, vx: 0, vy: 0 });
        x += a + track * size;
      });
    });
    out.W = maxW; out.H = lines.length * lead - (lead - size);
  } else {
    const heights = lines.map(line => [...line].reduce((h, ch) => h + vAdv(it.font, ch, size) + track * size, 0) - track * size);
    const maxH = Math.max(1, ...heights);
    lines.forEach((line, li) => {
      const arr = [...line];
      let y = it.align === 'left' ? 0 : -heights[li] / 2;         // 'left' == top-aligned for vertical
      const x = -(li - (lines.length - 1) / 2) * lead;
      arr.forEach((ch, ci) => {
        const a = vAdv(it.font, ch, size);
        const r90 = J.VERT_ROTATE.includes(ch) || /[A-Za-z0-9]/.test(ch);
        let vx = 0, vy = 0;
        if (J.isSmallKana(ch)) { vx = 0.11 * size; vy = -0.11 * size; }
        if ('、。，．'.includes(ch)) { vx = 0.3 * size; vy = -0.3 * size; }
        out.push({ ch, i: gi++, li, ci, n: arr.length, x, y: y + a / 2, w: size, h: a, r90, vx, vy });
        y += a + track * size;
      });
    });
    out.W = lines.length * lead - (lead - size); out.H = maxH;
  }
  out.N = gi;
  return out;
};
function vAdv(font, ch, size) { return /[A-Za-z0-9]/.test(ch) ? J.metrics.adv(font, ch) * size : size; }

/* draw one text item. env = {ctx, pass, passColor, scale}. Returns design-space bbox + glyph boxes. */
J.drawItem = (env, it) => {
  const ctx = env.ctx;
  const ghostPass = env.pass !== 'main';
  if (ghostPass && it.ghost === false) return null;
  if (!it.text || it.size <= 0.5) return null;
  const lay = it._lay || J.layoutText(it);
  const size = it.size, sx = it.sx || 1, sy = it.sy || 1;
  const baseAlpha = (it.alpha ?? 1) * (ghostPass ? (it.ghostAlpha ?? 1) : 1);
  if (baseAlpha <= 0.002) return null;
  const col = ghostPass ? env.passColor : (it.color || '#fff');
  const sCol = ghostPass ? env.passColor : (it.strokeColor || it.color || '#fff');
  const fill = it.fill !== false;
  ctx.save();
  ctx.translate(it.x, it.y);
  if (it.rot) ctx.rotate(it.rot * J.DEG);
  if (it.skew) ctx.transform(1, 0, Math.tan(it.skew * J.DEG), 1, 0, 0);
  if (it.blend) ctx.globalCompositeOperation = it.blend;
  if (it.blur > 0.4 && env.allowFilter) ctx.filter = `blur(${(it.blur * env.scale).toFixed(1)}px)`;
  ctx.font = J.fontCSS(it.font, size);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  let grad = null;
  if (!ghostPass && it.gradient && fill) {
    // gradient coordinates live in each glyph's local space (the fill happens after the per-glyph translate)
    grad = ctx.createLinearGradient(0, -size * 0.5, 0, size * 0.5);
    if (it.gradient.length === 2) { grad.addColorStop(0, it.gradient[0]); grad.addColorStop(1, it.gradient[1]); }
    else it.gradient.forEach(([o, c]) => grad.addColorStop(o, c));      // [[offset, colour], ...] for hard splits
  }
  if (!ghostPass && it.pattern && fill && !grad) grad = J.textPattern(ctx, it.pattern, it.patternColor || it.color || '#fff', it.patternBg, size, env.scale || 1);
  const fillA = it.fillAlpha ?? 1;
  const shadow = !ghostPass && it.shadow;
  if (shadow) {
    const k = env.scale || 1;
    ctx.shadowColor = shadow.color || 'rgba(0,0,0,0.6)'; ctx.shadowBlur = (shadow.blur || 0) * k;
    ctx.shadowOffsetX = (shadow.dx || 0) * k; ctx.shadowOffsetY = (shadow.dy || 0) * k;
  }
  const ext = !ghostPass && it.extrude && it.extrude.n > 0 ? it.extrude : null;
  const dash = it.dash != null && it.dash < 1 ? it.dash : null;
  const boxes = [];
  const pxScale = size * Math.max(sx, sy) * (env.scale || 1);
  for (const g of lay) {
    if (g.ch === ' ' || g.ch === '　') continue;
    const c = it.charFn ? it.charFn(g.i, g, lay.N) : null;
    if (c && c.hide) continue;
    const a = baseAlpha * (c && c.a != null ? c.a : 1);
    if (a <= 0.002) continue;
    const ch = (c && c.ch) || g.ch;
    const cs = c && c.s != null ? c.s : 1;
    const gx = g.x * sx + g.vx * sx + (c ? c.dx || 0 : 0);
    const gy = g.y * sy + g.vy * sy + (c ? c.dy || 0 : 0);
    const crot = (c ? c.rot || 0 : 0) + (g.r90 ? 90 : 0);
    const csx = sx * cs * (c && c.sx ? c.sx : 1), csy = sy * cs * (c && c.sy ? c.sy : 1);
    const gcol = (!ghostPass && c && c.color) || col;
    boxes.push({ x: gx, y: gy, w: g.w * sx * cs, h: g.h * sy * cs });
    // ---- piece mode ----
    if (it.pieceFn && fill && !(c && c.ch) && !it.gradient && dash == null && !(c && (c.clipY || c.clipX || c.outline))) {
      if (drawPieces(env, it, g, ch, gx, gy, crot, csx, csy, gcol, a, pxScale * cs)) continue;
    }
    ctx.save();
    ctx.translate(gx, gy);
    if (crot) ctx.rotate(crot * J.DEG);
    if (c && c.skew) ctx.transform(1, 0, Math.tan(c.skew * J.DEG), 1, 0, 0);
    if (csx !== 1 || csy !== 1) ctx.scale(csx, csy);
    if (c && (c.clipY || c.clipX)) {           // per-glyph mask, in fractions of the glyph box (centre = 0)
      const cy = c.clipY || [-0.7, 0.7], cx = c.clipX || [-0.7, 0.7];
      ctx.beginPath(); ctx.rect(cx[0] * g.w, cy[0] * g.h, (cx[1] - cx[0]) * g.w, (cy[1] - cy[0]) * g.h); ctx.clip();
    }
    if (c && c.blur > 0.4 && env.allowFilter) ctx.filter = `blur(${(c.blur * env.scale).toFixed(1)}px)`;
    ctx.globalAlpha = a;
    const outlineOnly = c && c.outline;
    if (ext && !outlineOnly) {
      ctx.fillStyle = ext.color || '#000';
      const ea = ext.a ?? 1;
      for (let k = ext.n; k >= 1; k--) { ctx.globalAlpha = a * ea * (ext.fade ? 1 - (k - 1) / ext.n * 0.85 : 1); ctx.fillText(ch, ext.dx * k / ext.n / csx, ext.dy * k / ext.n / csy); }
      ctx.globalAlpha = a;
    }
    if (fill && !outlineOnly && fillA > 0.002 && dash == null) { ctx.globalAlpha = a * fillA; ctx.fillStyle = grad || gcol; ctx.fillText(ch, 0, 0); ctx.globalAlpha = a; }
    if (it.stroke > 0 || outlineOnly || dash != null) {
      if (shadow && fill) { ctx.shadowColor = 'rgba(0,0,0,0)'; }
      ctx.lineJoin = 'round'; ctx.miterLimit = 2;
      ctx.lineWidth = (it.stroke > 0 ? it.stroke : Math.max(1, size * 0.02)) / Math.sqrt(Math.abs(csx * csy));
      ctx.strokeStyle = (!ghostPass && c && c.color) || sCol;
      if (dash != null) { const L = size * 3.2; ctx.setLineDash([Math.max(0.01, L * dash), L]); ctx.lineDashOffset = 0; }
      else if (it.strokeDash) ctx.setLineDash(it.strokeDash);
      ctx.strokeText(ch, 0, 0);
      ctx.setLineDash([]);
      if (fill && !outlineOnly && (it.strokeUnder || (dash != null && fillA > 0.002))) { ctx.globalAlpha = a * (dash != null ? fillA : 1); ctx.fillStyle = grad || gcol; ctx.fillText(ch, 0, 0); }
    }
    ctx.restore();
  }
  ctx.restore();
  // bbox in design space (rotation ignored except translate)
  if (!boxes.length) return null;
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const b of boxes) { x0 = Math.min(x0, b.x - b.w / 2); x1 = Math.max(x1, b.x + b.w / 2); y0 = Math.min(y0, b.y - b.h / 2); y1 = Math.max(y1, b.y + b.h / 2); }
  return { x0: it.x + x0, y0: it.y + y0, x1: it.x + x1, y1: it.y + y1, boxes, cx: it.x, cy: it.y };
};

/* returns true if pieces were drawn (i.e. not at rest) */
function drawPieces(env, it, g, ch, gx, gy, crot, sx, sy, col, alpha, px) {
  const glyph = J.glyphs.get(it.font, ch, px);
  const list = it.shatter ? fragList(glyph, it.seed || 1) : glyph.pieces;
  if (!list.length) return false;
  const size = it.size;
  const res = glyph.res;
  const pts = new Array(list.length);
  let moving = false;
  const cr = Math.cos(crot * J.DEG), sr = Math.sin(crot * J.DEG);
  for (let j = 0; j < list.length; j++) {
    const p = list[j];
    const ex = p.cx * size * sx, ey = p.cy * size * sy;          // piece centre offset (em->px, scaled)
    const ox = gx + ex * cr - ey * sr, oy = gy + ex * sr + ey * cr;
    const t = it.pieceFn(g.i, j, p, ox, oy, g);
    pts[j] = t;
    if (t !== J.PID && t !== null) moving = true;
    if (t === null) moving = true;
    pts[j] = { t, ox, oy };
  }
  if (!moving) return false;
  const ctx = env.ctx;
  for (let j = 0; j < list.length; j++) {
    const { t, ox, oy } = pts[j];
    if (!t || t.a <= 0.003) continue;
    const p = list[j];
    const spr = J.glyphs.sprite(p.src || p, col);
    ctx.save();
    ctx.translate(ox + t.dx, oy + t.dy);
    if (t.st !== 1) { const d = t.sdir * J.DEG; ctx.rotate(d); ctx.scale(t.st, 1 / Math.sqrt(t.st)); ctx.rotate(-d); }
    ctx.rotate((crot + t.rot) * J.DEG);
    const k = size / res * t.s;
    ctx.scale(sx * k, sy * k);
    ctx.globalAlpha = alpha * t.a;
    if (p.poly) {
      // fragment: clip to polygon (coords in em around fragment centre) then draw parent sprite
      const src = p.src;
      ctx.beginPath();
      p.poly.forEach((q, qi) => { const X = (q[0] - p.fx) * res, Y = (q[1] - p.fy) * res; qi ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); });
      ctx.closePath(); ctx.clip();
      ctx.drawImage(spr, -p.fx * res - src.w * res / 2, -p.fy * res - src.h * res / 2);
    } else {
      ctx.drawImage(spr, -spr.width / 2, -spr.height / 2);
    }
    ctx.restore();
  }
  return true;
}

function fragList(glyph, seed) {
  if (glyph.frags) return glyph.frags;
  const out = [];
  for (const p of glyph.pieces) {
    const fr = J.fragments(p, seed);
    if (fr.length <= 1) { out.push(p); continue; }
    for (const f of fr) out.push({ src: p, poly: f.poly, fx: f.cx, fy: f.cy, cx: p.cx + f.cx, cy: p.cy + f.cy, w: p.w, h: p.h, area: p.area / fr.length, id: p.id * 8 + out.length });
  }
  glyph.frags = out;
  return out;
}

/* fill patterns for text: 'dots' | 'stripes' | 'hatch' | 'grid' | 'lines' — cell size follows the text size */
const patCache = new Map();
J.textPattern = (ctx, kind, color, bg, size, scale) => {
  const cell = Math.max(3, Math.round(size * (kind === 'dots' ? 0.075 : 0.06))), px = Math.max(2, Math.round(cell * scale));
  const key = kind + color + (bg || '') + px;
  let cv = patCache.get(key);
  if (!cv) {
    cv = document.createElement('canvas'); cv.width = cv.height = px;
    const x = cv.getContext('2d');
    if (bg) { x.fillStyle = bg; x.fillRect(0, 0, px, px); }
    x.fillStyle = color; x.strokeStyle = color;
    if (kind === 'dots') { x.beginPath(); x.arc(px / 2, px / 2, px * 0.34, 0, J.TAU); x.fill(); }
    else if (kind === 'stripes') { x.lineWidth = px * 0.38; x.beginPath(); x.moveTo(-px, px * 2); x.lineTo(px * 2, -px); x.moveTo(-px, px); x.lineTo(px, -px); x.moveTo(0, px * 2); x.lineTo(px * 2, 0); x.stroke(); }
    else if (kind === 'hatch') { x.lineWidth = Math.max(1, px * 0.16); x.beginPath(); x.moveTo(0, 0); x.lineTo(px, px); x.moveTo(px, 0); x.lineTo(0, px); x.stroke(); }
    else if (kind === 'grid') { x.fillRect(0, 0, px, Math.max(1, px * 0.18)); x.fillRect(0, 0, Math.max(1, px * 0.18), px); }
    else { x.fillRect(0, 0, px, Math.max(1, px * 0.45)); }                          // 'lines'
    if (patCache.size > 80) patCache.clear();
    patCache.set(key, cv);
  }
  const pat = ctx.createPattern(cv, 'repeat');
  try { if (pat.setTransform && scale !== 1) pat.setTransform(new DOMMatrix().scale(1 / scale)); } catch (e) {}
  return pat;
};

/* measure an item's laid-out size in design px (after sx/sy) */
J.measure = (it) => { const l = J.layoutText(it); return { w: l.W * (it.sx || 1), h: l.H * (it.sy || 1), lay: l }; };

/* size that makes text fit a box */
J.fitSize = (text, font, maxW, maxH, opt = {}) => {
  const probe = Object.assign({ text, font, size: 100, track: 0 }, opt);
  const m = J.measure(probe);
  const k = Math.min(maxW / Math.max(1, m.w), maxH / Math.max(1, m.h));
  return 100 * k;
};
})();
