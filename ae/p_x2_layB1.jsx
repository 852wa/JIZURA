// ================================================================ pack x2layB part 1 (AE port of src/11p_x2_layB.js): shared helpers + layouts 1-15
// xbHalfDisc xbDiagSplit xbChevronChain xbTwistFrames xbDonut xbIsoStack xbPolyTrack xbShapeRow xbCompGrid xbPrimitives
// xbArcPoster xbZiggurat xbHoneycomb xbShear xbPatternPanel
//
// Techniques:
// - glyph positions are computed like the browser's layoutText (full-width glyphs = 1 em, latin estimated); every text layer is
//   anchored on the browser item's origin (axb_text), so plates / rules / labels line up with the AE text.
// - graphics are collected in a "sheet" (axb_sheet + axb_R / axb_P / axb_L / axb_O / axb_A) in the browser's draw order and
//   written as ONE shape layer (axb_flush; groups are added last-first because the first group of a shape layer is the top one).
//   Growing plates are group scales about a pivot, growing rules are Trim Paths, fades are group opacities.
// - arcs, ring segments and pie slices are ONE primitive: an ellipse path with a butt-capped stroke and Trim Paths
//   (a stroke as wide as the circle's diameter is a pie slice); rings of ticks are dashed circles revealed by Trim Paths.
// - canvas clips (lyric that changes colour inside a shape) are a second copy of the lyric with an alpha track matte
//   (a copy of the shape, same expressions).
// - canvas transforms on the lyric (shear / parallel projection) are a Transform effect on the text layer (axb_drawAff).
// - the browser draws all graphics with ghost off: axb_reg marks every layer that is not the lyric jzNoGhost.

var AXB_CY = 0.38;     // glyph centre above the baseline (em)
var AXB_OPEN = '「『（(［【〈《“‘';
var AXB_FNS = 'function cl(x){return Math.max(0,Math.min(1,x));}function oe(x){x=cl(x);return x>=1?1:1-Math.pow(2,-10*x);}' +
    'function oc(x){x=cl(x);return 1-Math.pow(1-x,3);}function ic(x){x=cl(x);return x*x*x;}function ie(x){x=cl(x);return x<=0?0:Math.pow(2,10*x-10);}' +
    'function ob(x,s){x=cl(x);var c=s+1;return 1+c*Math.pow(x-1,3)+s*Math.pow(x-1,2);}' +
    'function ioc(x){x=cl(x);return x<0.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;}function ios(x){x=cl(x);return -(Math.cos(Math.PI*x)-1)/2;}' +
    'function inE(d,dl){return oe((time-dl)/d);}function inC(d,dl){return oc((time-dl)/d);}function stg(i,st,d){return oe((time-i*st)/d);}';
var AXB_LYR = [];      // lyric layers of the build in progress
// expression header: DUR, IN, OS, OD, PO (exit progress), K (= the browser's out: 1 - inCubic(pOut)), XO (1 - inExpo(pOut)), DG,
// easings, inE(d, delay) / inC(d, delay) / stg(i, step, d) = the browser pack's inE / inC / stg
function axb_hd(ctx) {
    var c = ctx.cut, hard = c.outDur != null && c.outDur <= 0, od = hard ? 0.05 : Math.max(0.12, c.outDur || 0.15);
    return 'var DUR=' + jzN(c.dur) + ',IN=' + jzN(Math.max(0.02, c.inDur || 0.3)) + ',OS=' + jzN(hard ? c.dur : c.dur - od) + ',OD=' + jzN(od) + ',DG=Math.PI/180;' + AXB_FNS +
        'var PO=cl((time-OS)/OD),K=1-ic(PO),XO=1-ie(PO);\n';
}
function axb_iE(d, dl) { return 'inE(' + jzN(d) + ',' + jzN(dl || 0) + ')'; }
function axb_iC(d, dl) { return 'inC(' + jzN(d) + ',' + jzN(dl || 0) + ')'; }
function axb_stg(i, step, d) { return 'stg(' + jzN(i) + ',' + jzN(step == null ? 0.05 : step) + ',' + jzN(d == null ? 0.4 : d) + ')'; }

/* ---------------------------------------------------------------- small helpers (ports of the browser pack's helpers) */
// the browser's deterministic hash J.h / J.r / J.rs
function axb_h(a, b, c, d, e) {
    var h = 0x9e3779b9 ^ (a | 0);
    h = jzImul(h ^ (h >>> 16), 0x85ebca6b);
    h = (h + jzImul((b | 0) + 0x632be5ab, 0xc2b2ae35)) | 0;
    h = jzImul(h ^ (h >>> 13), 0xc2b2ae35);
    h = (h + jzImul((c | 0) + 0x5bd1e995, 0x27d4eb2f)) | 0;
    h = jzImul(h ^ (h >>> 15), 0x165667b1);
    h = (h + jzImul((d | 0) + 0x1b873593, 0x85ebca6b)) | 0;
    h = jzImul(h ^ (h >>> 16), 0x27d4eb2f);
    h = (h + jzImul((e | 0) + 0x68e31da4, 0x9e3779b1)) | 0;
    h ^= h >>> 15; h = jzImul(h, 0x2c1b3c6d); h ^= h >>> 12; h = jzImul(h, 0x297a2d39); h ^= h >>> 15;
    return h >>> 0;
}
function axb_r(a, b, c, d, e) { return axb_h(a, b, c, d, e) / 4294967296; }
function axb_rs(a, b, c, d, e) { return axb_r(a, b, c, d, e) * 2 - 1; }
function axb_isSp(c) { return c === ' ' || c === '　'; }
function axb_isSmall(c) { return !!c && 'ぁぃぅぇぉっゃゅょゎァィゥェォッャュョヮヵヶ'.indexOf(c) >= 0; }
function axb_isPunct(c) { return jzIsPunct(c) || c === 'ー'; }
function axb_closeP(c) { return axb_isPunct(c) && AXB_OPEN.indexOf(c) < 0; }
function axb_p2(n) { return jzPad(n, 2); }
function axb_mix(o, q) { var r = jzCopy(o), k; for (k in q) if (q.hasOwnProperty(k)) r[k] = q[k]; return r; }
function axb_font(ctx, key, role) { return jzP(ctx, key, null) || jzFontKeyOf(ctx.st, role); }
function axb_minOf(a) { var m = 1e18; for (var i = 0; i < a.length; i++) m = Math.min(m, a[i]); return m; }
function axb_maxOf(a) { var m = -1e18; for (var i = 0; i < a.length; i++) m = Math.max(m, a[i]); return m; }
function axb_slots(t) { return jzChars(jzTrim(String(t || '')).replace(/[\s　]+/g, ' ')); }
// glyph cells: closing punctuation rides with the glyph before it; ' ' marks a word gap
function axb_cellsOf(t) {
    var s = axb_slots(t), o = [], i;
    for (i = 0; i < s.length; i++) {
        var l = o.length ? o[o.length - 1] : null;
        if (l && !axb_isSp(l) && axb_closeP(s[i]) && jzChars(l).length < 2) o[o.length - 1] += s[i]; else o.push(s[i]);
    }
    return o;
}
// J.splitLines, but never leave a line of punctuation only ('\n' separated)
function axb_splitL(t, per) {
    var ls = String(jzSplitLines(String(t), Math.max(1, per))).split('\r'), out = [], i, j, ok;
    for (i = 0; i < ls.length; i++) {
        var cs = jzChars(ls[i]); ok = out.length > 0;
        for (j = 0; j < cs.length && ok; j++) if (!(axb_isPunct(cs[j]) || cs[j] === ' ')) ok = false;
        if (ok) out[out.length - 1] += ls[i]; else out.push(ls[i]);
    }
    return out.join('\n');
}
function axb_linesOf(t, L) { var s = jzTrim(String(t || '')), n = jzChars(s).length; return L <= 1 ? s : axb_splitL(s, Math.ceil(n / L)); }
// rows of cells: Latin lyrics break between words, anything else into even runs
function axb_rowCells(txt, RN) {
    var all = axb_cellsOf(txt), o = [], i;
    if (jzIsLatinText(txt) && jzIndexOf(all, ' ') >= 0) {
        var ls = axb_linesOf(String(txt).replace(/\s+/g, ' '), RN).split('\n');
        for (i = 0; i < ls.length; i++) o.push(axb_cellsOf(ls[i]));
        return o;
    }
    var per = Math.max(1, Math.ceil(all.length / Math.max(1, Math.min(RN, all.length))));
    for (i = 0; i < all.length; i += per) o.push(all.slice(i, i + per));
    return o;
}
function axb_padRows(rows) {
    var per = 1, flat = [], i, j;
    for (i = 0; i < rows.length; i++) per = Math.max(per, rows[i].length);
    for (i = 0; i < rows.length; i++) for (j = 0; j < per; j++) flat.push(j < rows[i].length ? rows[i][j] : ' ');
    return { per: per, rows: rows.length, flat: flat };
}
/* colours */
function axb_onCol(sc, fill) {
    var c = [sc.bg, sc.fg, sc.ink, sc.sub], best = null, bv = 0, i;
    for (i = 0; i < c.length; i++) { if (!c[i] || String(c[i]).toUpperCase() === String(fill).toUpperCase()) continue; var k = jzContrast(c[i], fill); if (k > bv) { bv = k; best = c[i]; } }
    return bv >= 3 ? best : (jzLum(fill) > 0.45 ? '#000000' : '#FFFFFF');
}
function axb_plateCol(sc, pref) { for (var i = 0; i < pref.length; i++) if (pref[i] && jzContrast(pref[i], sc.bg) >= 1.7) return pref[i]; return sc.fg; }
function axb_pickPlate(sc, k) { return axb_plateCol(sc, k === 'accent' ? [sc.accent, sc.ink, sc.fg] : k === 'accent2' ? [sc.accent2, sc.accent, sc.fg] : k === 'ink' ? [sc.ink, sc.accent, sc.fg] : [sc.fg, sc.ink]); }
function axb_accentOn(sc) { return jzContrast(sc.accent, sc.bg) >= 2 ? sc.accent : (sc.accent2 && jzContrast(sc.accent2, sc.bg) >= 2 ? sc.accent2 : sc.fg); }
function axb_dimOf(sc) { return jzMixHex(sc.bg, sc.fg, 0.17); }
function axb_same(a, b) { return String(a).toUpperCase() === String(b).toUpperCase(); }
// the values every layout starts from (the browser's base(env)); lw = hairline, ls = label size
function axb_base(ctx) {
    var c = ctx.cut, M = jzU(ctx), k = M / 1080;
    return { W: ctx.W, H: ctx.H, sc: ctx.sc, c: c, M: M, k: k, port: ctx.W < ctx.H, txt: jzTrim(String(c.text || '')), seed: c.seed | 0,
        lw: Math.max(k, M * 0.0016), ls: jzClamp(M * 0.019, 11 * k, 24 * k), no: (c.line | 0) + 1 };
}
/* geometry */
function axb_ptsBB(pts) {
    var x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, i;
    for (i = 0; i < pts.length; i++) { x0 = Math.min(x0, pts[i][0]); x1 = Math.max(x1, pts[i][0]); y0 = Math.min(y0, pts[i][1]); y1 = Math.max(y1, pts[i][1]); }
    return { x0: x0, y0: y0, x1: x1, y1: y1, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
}
function axb_xfPt(m, x, y) { return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]]; }
function axb_rotM(cx, cy, deg) { var c = Math.cos(deg * Math.PI / 180), s = Math.sin(deg * Math.PI / 180); return [c, s, -s, c, cx - c * cx + s * cy, cy - s * cx - c * cy]; }
function axb_rectPts(cx, cy, w, h, deg) {
    var m = axb_rotM(cx, cy, deg || 0), k = [[-1, -1], [1, -1], [1, 1], [-1, 1]], o = [], i;
    for (i = 0; i < 4; i++) o.push(axb_xfPt(m, cx + k[i][0] * w / 2, cy + k[i][1] * h / 2));
    return o;
}
function axb_ngon(cx, cy, rx, ry, n, deg) {
    var o = [], i;
    for (i = 0; i < n; i++) { var a = (deg + i * 360 / n) * Math.PI / 180; o.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); }
    return o;
}
// affine split (same convention as the expression aff() of the layoutsD ports): [rotation deg, skew deg, scale x %, scale y %]
function axb_aff(a, b, c, d) {
    var sx = Math.sqrt(a * a + b * b); if (sx < 1e-6) sx = 1e-6;
    var r = Math.atan2(b, a), kk = (a * c + b * d) / sx, sy = (a * d - b * c) / sx, t = Math.abs(sy) < 1e-6 ? 0 : kk / sy;
    t = Math.max(-11, Math.min(11, t));
    return [r * 180 / Math.PI, -Math.atan(t) * 180 / Math.PI, sx * 100, sy * 100];
}

/* ---------------------------------------------------------------- text geometry (like the browser's layoutText) */
function axb_adv(ch, mono) {
    var c = ch.charCodeAt(0);
    if (ch === ' ') return mono ? 0.6 : 0.3;
    if (c < 0x80) {
        if (mono) return 0.6;
        if (/[A-Z]/.test(ch)) return /[MW]/.test(ch) ? 0.9 : (ch === 'I' ? 0.32 : 0.7);
        if (/[a-z]/.test(ch)) return /[mw]/.test(ch) ? 0.88 : /[ijl]/.test(ch) ? 0.28 : /[frt]/.test(ch) ? 0.42 : 0.61;
        if (/[0-9]/.test(ch)) return 0.62;
        return /[.,:;!'|]/.test(ch) ? 0.28 : 0.42;
    }
    if (c < 0x250) return 0.56;
    if (c === 0x2014 || c === 0x2015 || c === 0x2500) return 1;
    if (c < 0x2E80 && c !== 0x2026) return 0.6;
    if (c >= 0xFF61 && c <= 0xFF9F) return 0.5;
    return 1;
}
// glyphs relative to the item origin: { ch, x, y (centre), w, h, li, sp }; .W .H .nL .LD
function axb_lay(str, size, o) {
    o = o || {};
    var tr = o.track || 0, mono = /mono/.test(String(o.font || '')), out = [], j, li, s = String(str).replace(/\r\n|\r/g, '\n');
    var lines = s.split('\n'), nL = lines.length, lead = (o.lead || 1.3) * size, maxW = 1;
    for (li = 0; li < nL; li++) {
        var a2 = jzChars(lines[li]), ws = [], w = 0;
        for (j = 0; j < a2.length; j++) { ws.push(axb_adv(a2[j], mono) * size); w += ws[j] + (j < a2.length - 1 ? tr * size : 0); }
        maxW = Math.max(maxW, w);
        var x = o.align === 'left' ? 0 : o.align === 'right' ? -w : -w / 2, y = (li - (nL - 1) / 2) * lead;
        for (j = 0; j < a2.length; j++) { out.push({ ch: a2[j], x: x + ws[j] / 2, y: y, w: ws[j], h: size, li: li, sp: axb_isSp(a2[j]) }); x += ws[j] + tr * size; }
    }
    out.W = maxW; out.H = nL * lead - (lead - size); out.nL = nL; out.LD = lead;
    return out;
}
function axb_meas(str, size, o) { var l = axb_lay(str, size, o); return { w: l.W, h: l.H }; }
function axb_fit(str, font, maxW, maxH, o) { var q = jzCopy(o || {}); q.font = font; var m = axb_meas(str, 100, q); return 100 * Math.min(maxW / Math.max(1, m.w), maxH / Math.max(1, m.h)); }
// smallest fit of several strings
function axb_fitAll(strs, font, maxW, maxH, o) { var m = 1e9; for (var i = 0; i < strs.length; i++) m = Math.min(m, axb_fit(strs[i], font, maxW, maxH, o)); return m; }
// choose the line count (1..maxL) that gives the biggest type inside a box
function axb_fitBox(text, font, bw, bh, o, maxL) {
    var t = jzTrim(String(text || '')), n = jzChars(t).length, best = null, L;
    for (L = 1; L <= Math.min(maxL || 4, Math.max(1, n)); L++) {
        var tt = axb_linesOf(t, L);
        if (tt.split('\n').length < L && best) continue;
        var s = axb_fit(tt, font, bw, bh, o);
        if (!best || s > best.size * 1.04) best = { text: tt, size: s };
    }
    return best || { text: t, size: 10 };
}
function axb_ibb(o) {
    var lay = axb_lay(o.text, o.size, o), x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9, i;
    for (i = 0; i < lay.length; i++) {
        var g = lay[i]; if (g.sp) continue;
        x0 = Math.min(x0, g.x - g.w / 2); x1 = Math.max(x1, g.x + g.w / 2); y0 = Math.min(y0, g.y - g.h / 2); y1 = Math.max(y1, g.y + g.h / 2);
    }
    if (x0 > x1) { x0 = x1 = 0; y0 = y1 = 0; }
    return { x0: o.x + x0, x1: o.x + x1, y0: o.y + y0, y1: o.y + y1, cx: o.x + (x0 + x1) / 2, cy: o.y + (y0 + y1) / 2 };
}

/* ---------------------------------------------------------------- layer builders */
// a text layer whose browser item origin (o.x, o.y) is the layer position. o: text font size x y align track lead color fill stroke strokeColor alpha rot name
function axb_text(ctx, str, o) {
    var size = o.size, tr = o.track || 0, txt = String(str).replace(/\r\n|\n/g, '\r'), nL = txt.split('\r').length, LD = size * (o.lead || 1.3);
    var L = jzText(ctx, txt, { font: o.font, size: size, color: o.color || ctx.sc.fg, x: o.x, y: o.y, align: o.align, track: tr, leading: LD,
        fill: o.fill, stroke: o.stroke, strokeColor: o.strokeColor, name: o.name, opacity: o.alpha });
    // wide tracking: After Effects also tracks after the last glyph of a line, which pushes centred / right-set lines off their axis
    var ax = tr >= 0.2 ? (o.align === 'left' ? 0 : o.align === 'right' ? tr * size : tr * size / 2) : 0;
    jzXf(L, 'ADBE Anchor Point').setValue([-ax, -AXB_CY * size + (nL - 1) / 2 * LD]);
    jzXf(L, 'ADBE Position').setValue([o.x, o.y]);
    if (o.rot) jzXf(L, 'ADBE Rotate Z').setValue(o.rot);
    return L;
}
// the lyric item: layer + the cut's motion + treatment; returns the bbox (o.L = the layer)
function axb_draw(ctx, o) {
    var L = axb_text(ctx, o.text, o);
    AXB_LYR.push(L);
    jzAnimate(ctx, L, { mi: Math.floor(o.mi || 0) });
    o.L = L;
    return axb_ibb(o);
}
// the lyric item inside a canvas transform m = [a, b, c, d, e, f] (o.x / o.y are in the untransformed space):
// the layer sits on the transformed origin and a Transform effect does the linear part about the layer's anchor
function axb_drawAff(ctx, o, m) {
    var p = axb_xfPt(m, o.x, o.y), L = axb_text(ctx, o.text, axb_mix(o, { x: p[0], y: p[1] }));
    var A = jzXf(L, 'ADBE Anchor Point').value, AF = axb_aff(m[0], m[1], m[2], m[3]), e = jzEffect(L, 'ADBE Geometry2', 'JZ Face');
    jzEP(e, 1, [A[0], A[1]]); jzEP(e, 2, [A[0], A[1]]); jzEP(e, 3, 0); jzEP(e, 4, AF[3]); jzEP(e, 5, AF[2]); jzEP(e, 6, AF[1]); jzEP(e, 7, 0); jzEP(e, 8, AF[0]);
    AXB_LYR.push(L);
    jzAnimate(ctx, L, { mi: Math.floor(o.mi || 0) });
    o.L = L;
    var b = axb_ibb(o);
    return axb_ptsBB([axb_xfPt(m, b.x0, b.y0), axb_xfPt(m, b.x1, b.y0), axb_xfPt(m, b.x1, b.y1), axb_xfPt(m, b.x0, b.y1)]);
}
// small annotation label (main pass only); o: font size align track color alpha rot op (opacity factor expression 0..1)
function axb_label(ctx, text, x, y, o) {
    o = o || {};
    if (!String(text).length) return null;
    var L = axb_text(ctx, String(text), { font: o.font || jzMonoF(ctx), size: o.size || axb_base(ctx).ls, x: x, y: y, align: o.align || 'left', track: o.track != null ? o.track : 0.1,
        color: o.color || ctx.sc.sub, alpha: o.alpha, rot: o.rot, name: o.name || ('label ' + String(text).substr(0, 20)) });
    if (o.op) jzSetExpr(jzXf(L, 'ADBE Opacity'), axb_hd(ctx) + 'value*cl(' + o.op + ')');
    return L;
}
// many labels in ONE text layer: strs[j] sits with its reference point at pts[j] (align: left edge / centre / right edge, vertical centre)
// returns { L, li: label index per AE glyph (textIndex-1) }
function axb_multi(ctx, strs, pts, o) {
    var size = o.size, LD = size * 1.2, li = [], offs = [], j, k;
    if (!strs.length) return null;
    var L = jzText(ctx, strs.join('\r'), { font: o.font || jzMonoF(ctx), size: size, color: o.color || ctx.sc.sub, x: 0, y: 0, align: o.align || 'center', track: o.track != null ? o.track : 0.1,
        leading: LD, name: o.name || 'labels', opacity: o.alpha });
    jzXf(L, 'ADBE Anchor Point').setValue([0, 0]); jzXf(L, 'ADBE Position').setValue([0, 0]);
    for (j = 0; j < strs.length; j++) {
        var cs = jzChars(strs[j]);
        for (k = 0; k < cs.length; k++) { li.push(j); offs.push([pts[j][0], pts[j][1] + AXB_CY * size - j * LD]); }
    }
    if (offs.length) jzCharOffsets(L, offs, 'JZ Place');
    return { L: L, li: li };
}
// per-label fade of an axb_multi layer: vals[j] = one number per label, a = factor expression (0..1) that may use D (the label's number)
function axb_multiOp(ctx, Mu, vals, a) {
    if (!Mu) return;
    var v = [], i;
    for (i = 0; i < Mu.li.length; i++) v.push(jzN(vals[Mu.li[i]] || 0));
    jzAnimator(Mu.L, 'JZ Label Fade', [['ADBE Text Opacity', 0]], axb_hd(ctx) + 'var V=[' + v.join(',') + '];var D=V[textIndex-1]||0;(1-cl(' + a + '))*100');
}
// alpha track matte: L shows only inside Mt (Mt is moved right above L and switched off)
function axb_matte(L, Mt) { Mt.moveBefore(L); L.trackMatteType = TrackMatteType.ALPHA; Mt.enabled = false; }

/* ---------------------------------------------------------------- sheets: shapes collected in draw order, written as one shape layer */
// spec options (o): pre (statements put in front of every expression of the group), trim / start (0..1 factor expressions),
// toff (Trim offset, degrees) / toffx (expression), op (0..1 factor), piv [x, y], sc ('[fx,fy]' about piv), pos ('[dx,dy]'),
// rot (degrees expression about piv), rv (static degrees), rs (radius factor expression of an ellipse), rsz ('[w,h]' of a rect),
// dash [dash, gap], cap, join, closed, n (name)
function axb_sheet(ctx, name) { return { ctx: ctx, name: name, g: [], lop: null, rot: null }; }
function axb_spec(S, o, q) { var s = o ? jzCopy(o) : {}, k; for (k in q) if (q.hasOwnProperty(k)) s[k] = q[k]; S.g.push(s); return s; }
function axb_R(S, x, y, w, h, col, a, o) { if (!(w > 0 && h > 0)) return null; return axb_spec(S, o, { k: 'rect', x: x, y: y, w: w, h: h, fill: col, a: a }); }
function axb_RR(S, x, y, w, h, fill, stroke, lw, a, o) { if (!(w > 0 && h > 0)) return null; return axb_spec(S, o, { k: 'rect', x: x, y: y, w: w, h: h, fill: fill, stroke: stroke, lw: lw, a: a }); }
function axb_L(S, segs, col, lw, a, o) { if (!segs.length) return null; return axb_spec(S, o, { k: 'path', segs: segs, stroke: col, lw: lw, a: a }); }
function axb_P(S, pts, col, a, o) { return axb_spec(S, o, { k: 'path', segs: [pts], closed: true, fill: col, a: a }); }
function axb_loop(S, pts, col, lw, a, o) { return axb_spec(S, o, { k: 'path', segs: [pts], closed: true, stroke: col, lw: lw, a: a }); }
function axb_O(S, cx, cy, r, fill, stroke, lw, a, o) { if (!(r > 0)) return null; return axb_spec(S, o, { k: 'ell', x: cx, y: cy, r: r, fill: fill, stroke: stroke, lw: lw, a: a }); }
// arc / ring segment / pie slice: circle of radius r, stroke lw; o.toff / o.toffx = canvas start angle + 90, o.trim = sweep / 360
function axb_A(S, cx, cy, r, col, lw, a, o) { if (!(r > 0)) return null; return axb_spec(S, o, { k: 'ell', x: cx, y: cy, r: r, stroke: col, lw: lw, a: a, arc: true }); }
// dashed stroke: add the dash properties first, then fetch them by matchName (each addProperty invalidates the earlier ones)
function axb_dash(st, d, gp) {
    var D = st.property('ADBE Vector Stroke Dashes'), p1 = null, p2 = null;
    try { D.addProperty('ADBE Vector Stroke Dash 1'); D.addProperty('ADBE Vector Stroke Gap 1'); } catch (e) {}
    try { p1 = D.property('ADBE Vector Stroke Dash 1'); p2 = D.property('ADBE Vector Stroke Gap 1'); } catch (e1) { jzWarn('dashes: ' + e1.toString()); }
    if (p1) p1.setValue(Math.max(0.01, d)); if (p2) p2.setValue(Math.max(0.01, gp));
}
// a path: an array of points, or { v, i, o } (vertices with in / out tangents)
function axb_addSeg(g, seg, closed) {
    if (!seg.v) return jzAddPath(g, seg, closed);
    var p = jzVecs(g).addProperty('ADBE Vector Shape - Group'), sh = new Shape();
    sh.vertices = seg.v; sh.inTangents = seg.i; sh.outTangents = seg.o; sh.closed = !!closed;
    p.property('ADBE Vector Shape').setValue(sh);
    return p;
}
function axb_grp(L, hd, s, idx) {
    var g = jzGrp(L, s.n || (s.k + ' ' + idx)), a = (s.a == null ? 1 : jzClamp(s.a, 0, 1)) * 100, i, st, tg, it, tm, pv = s.piv || [0, 0], h = hd + (s.pre || '');
    if (s.k === 'rect') {
        it = jzAddRect(g, Math.max(0.01, s.w), Math.max(0.01, s.h), 0, s.x + s.w / 2, s.y + s.h / 2);
        if (s.rsz) jzSetExpr(it.property('ADBE Vector Rect Size'), h + 'var q=' + s.rsz + ';[Math.max(0.01,q[0]),Math.max(0.01,q[1])]');
    } else if (s.k === 'rects') {
        for (i = 0; i < s.list.length; i++) jzAddRect(g, Math.max(0.01, s.list[i][2]), Math.max(0.01, s.list[i][3]), 0, s.list[i][0] + s.list[i][2] / 2, s.list[i][1] + s.list[i][3] / 2);
    } else if (s.k === 'ell') {
        it = jzAddEllipse(g, s.r * 2, s.r * 2, s.x, s.y);
        if (s.rs) jzSetExpr(it.property('ADBE Vector Ellipse Size'), h + 'var q=Math.max(0,' + s.rs + ')*' + jzN(s.r * 2) + ';[q,q]');
    } else for (i = 0; i < s.segs.length; i++) axb_addSeg(g, s.segs[i], !!s.closed);
    if (s.stroke) {
        st = jzAddStroke(g, s.stroke, Math.max(0.1, s.lw || 1), a);
        if (s.cap || s.join) { try { if (s.cap) st.property('ADBE Vector Stroke Line Cap').setValue(s.cap); if (s.join) st.property('ADBE Vector Stroke Line Join').setValue(s.join); } catch (e) {} }
        if (s.dash) axb_dash(st, s.dash[0], s.dash[1]);
    }
    if (s.fill) jzAddFill(g, s.fill, a);
    if (s.trim || s.start || s.toff != null || s.toffx) {
        tm = jzAddTrimPaths(g, s.trim ? h + '100*cl(' + s.trim + ')' : null, s.start ? h + '100*cl(' + s.start + ')' : null);
        if (s.toffx) jzSetExpr(tm.property('ADBE Vector Trim Offset'), h + s.toffx);
        else if (s.toff != null) tm.property('ADBE Vector Trim Offset').setValue(s.toff);
    }
    tg = jzGX(g);
    if (s.piv) { tg.property('ADBE Vector Anchor').setValue(pv); tg.property('ADBE Vector Position').setValue(pv); }
    if (s.sc) jzSetExpr(tg.property('ADBE Vector Scale'), h + 'var s=' + s.sc + ';[100*s[0],100*s[1]]');
    if (s.pos) jzSetExpr(tg.property('ADBE Vector Position'), h + 'var d=' + s.pos + ';[' + jzN(pv[0]) + '+d[0],' + jzN(pv[1]) + '+d[1]]');
    if (s.rot) jzSetExpr(tg.property('ADBE Vector Rotation'), h + s.rot);
    else if (s.rv) tg.property('ADBE Vector Rotation').setValue(s.rv);
    if (s.op) jzSetExpr(tg.property('ADBE Vector Group Opacity'), h + '100*cl(' + s.op + ')');
}
// write the sheet (S.lop = opacity factor expression for the whole layer, S.rot = [cx, cy, deg] turns the whole layer)
function axb_flush(S) {
    if (!S.g.length) return null;
    var L = jzShapeLayer(S.ctx, S.name, 0, 0), hd = axb_hd(S.ctx), i;
    for (i = S.g.length - 1; i >= 0; i--) axb_grp(L, hd, S.g[i], i + 1);
    if (S.lop) jzSetExpr(jzXf(L, 'ADBE Opacity'), hd + 'value*cl(' + S.lop + ')');
    if (S.rot) { jzXf(L, 'ADBE Anchor Point').setValue([S.rot[0], S.rot[1]]); jzXf(L, 'ADBE Position').setValue([S.rot[0], S.rot[1]]); jzXf(L, 'ADBE Rotate Z').setValue(S.rot[2]); }
    S.g = [];
    return L;
}
// a second copy of the lyric item o that shows only inside the shapes fn(S) puts on a sheet (the canvas clip of the browser)
function axb_clip(ctx, o, fn) {
    var S = axb_sheet(ctx, 'clip matte'); fn(S);
    var Mt = axb_flush(S);
    axb_draw(ctx, o);
    if (Mt) axb_matte(o.L, Mt);
    return o.L;
}
// registers a layout: lyric layers keep their ghosts, everything else is main-pass only
function axb_reg(key, def) {
    var b = def.build;
    def.build = function (ctx) {
        AXB_LYR = [];
        var bb = b(ctx), keep = {}, i;
        for (i = 0; i < AXB_LYR.length; i++) { try { keep[AXB_LYR[i].index] = 1; } catch (e) {} }
        for (i = 1; i <= ctx.comp.numLayers; i++) if (!keep[i]) jzNoGhost(ctx.comp.layer(i));
        AXB_LYR = [];
        return bb;
    };
    jzReg('layout', key, def);
}

/* ================================================================== 1 xbHalfDisc — 半円またぎ */
axb_reg('xbHalfDisc', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['display'])), side: rng.pick(['b', 'b', 't', 'l', 'r']), col: rng.pick(['accent', 'ink', 'fg']), off: rng.range(-0.1, 0.1), ring: rng.chance(0.6) }; },
    build: function (ctx) {
        var B = axb_base(ctx), W = B.W, H = B.H, sc = B.sc, M = B.M, lw = B.lw, font = axb_font(ctx, 'font', 'display');
        var lead = 1.2, fb = axb_fitBox(B.txt, font, W * 0.84, H * 0.5, { lead: lead, track: 0.02 }, 4), size = Math.min(fb.size, M * 0.32);
        var side = jzP(ctx, 'side', 'b'), off = jzP(ctx, 'off', 0), plate = axb_pickPlate(sc, jzP(ctx, 'col', 'accent')), pon = axb_onCol(sc, plate);
        var R0 = Math.max(W * 0.42, H * 0.45), horiz = side === 'b' || side === 't', sg = (side === 'b' || side === 'r') ? 1 : -1;
        var cx = horiz ? W / 2 + off * W : W / 2 + sg * R0 * 0.97, cy = horiz ? H / 2 + sg * R0 * 0.97 : H / 2 + off * H;
        var q = axb_iE(0.6, 0) + '*XO', pre = 'var q=' + q + ';', S = axb_sheet(ctx, 'half disc');
        axb_O(S, cx, cy, R0, plate, null, 0, 1, { rs: q, n: 'disc' });
        if (jzP(ctx, 'ring', true)) {
            axb_O(S, cx, cy, R0, null, sc.sub, lw * 1.5, 0.6, { pre: pre, rs: '0.6+0.5*q', op: 'K*q', n: 'ring 1' });
            axb_O(S, cx, cy, R0, null, sc.sub, lw, 0.35, { pre: pre, rs: '0.5+0.72*q', op: 'K*q', n: 'ring 2' });
        }
        axb_flush(S);
        var it = { text: fb.text, font: font, size: size, x: W / 2, y: H / 2, lead: lead, track: 0.02, color: sc.fg };
        var bb = axb_draw(ctx, it);
        // the lyric reverses on the disc
        axb_clip(ctx, axb_mix(it, { color: pon, name: 'lyric on disc' }), function (S2) { axb_O(S2, cx, cy, R0, '#FFFFFF', null, 0, 1, { rs: q }); });
        return bb;
    }
});

/* ================================================================== 2 xbDiagSplit — 斜め二色 */
axb_reg('xbDiagSplit', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['display', 'display', 'serif'])), ang: rng.pick([-34, -22, 22, 34, 58, -58]), side: rng.pick([1, -1]), col: rng.pick(['ink', 'accent', 'fg']), line: rng.chance(0.65) }; },
    build: function (ctx) {
        var B = axb_base(ctx), W = B.W, H = B.H, sc = B.sc, M = B.M, lw = B.lw, font = axb_font(ctx, 'font', 'display');
        var lead = 1.2, fb = axb_fitBox(B.txt, font, W * 0.84, H * 0.5, { lead: lead, track: 0.02 }, 4), size = Math.min(fb.size, M * 0.32);
        var plate = axb_pickPlate(sc, jzP(ctx, 'col', 'ink')), pon = axb_onCol(sc, plate), sd = jzP(ctx, 'side', 1) < 0 ? -1 : 1;
        var a = jzP(ctx, 'ang', -22) * Math.PI / 180, dx = Math.cos(a), dy = Math.sin(a), nx = -dy * sd, ny = dx * sd, L = Math.sqrt(W * W + H * H), cx = W / 2, cy = H / 2;
        var pts = [[cx - dx * L, cy - dy * L], [cx + dx * L, cy + dy * L], [cx + dx * L + nx * L * 2, cy + dy * L + ny * L * 2], [cx - dx * L + nx * L * 2, cy - dy * L + ny * L * 2]];
        // the field slides in along its normal and leaves the same way
        var mv = { pre: 'var o=(1-' + axb_iE(0.55, 0) + '*XO)*' + jzN(L * 0.8) + ';', pos: '[' + jzN(nx) + '*o,' + jzN(ny) + '*o]', n: 'field' };
        var S = axb_sheet(ctx, 'diagonal field');
        axb_P(S, pts, plate, 1, mv);
        if (jzP(ctx, 'line', true)) {
            var g = M * 0.028;
            axb_L(S, [[[cx - nx * g - dx * L, cy - ny * g - dy * L], [cx - nx * g + dx * L, cy - ny * g + dy * L]]], axb_accentOn(sc), lw * 2.5, 1,
                { pre: 'var e=' + axb_iE(0.6, 0.15) + '*K;', start: '0.5-0.5*e', trim: '0.5+0.5*e', op: 'K', n: 'cut line' });
        }
        axb_flush(S);
        var it = { text: fb.text, font: font, size: size, x: cx, y: cy, lead: lead, track: 0.02, color: sc.fg };
        var bb = axb_draw(ctx, it);
        axb_clip(ctx, axb_mix(it, { color: pon, name: 'lyric on field' }), function (S2) { axb_P(S2, pts, '#FFFFFF', 1, mv); });
        return bb;
    }
});

/* ================================================================== 3 xbChevronChain — 矢印つなぎ */
axb_reg('xbChevronChain', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['display', 'body'])), swap: rng.chance(0.5), second: rng.pick(['accent', 'fg', 'accent2']), tail: rng.chance(0.7) }; },
    build: function (ctx) {
        var B = axb_base(ctx), W = B.W, H = B.H, sc = B.sc, M = B.M, lw = B.lw, port = B.port, txt = B.txt, font = axb_font(ctx, 'font', 'display'), i, k;
        var n = jzCount(txt), rowMode = port || n > 6, K0 = port ? Math.min(4, Math.ceil(n / 4)) : (n <= 3 ? 1 : n <= 10 ? 2 : 3);
        var segs = axb_linesOf(txt, K0).split('\n'), K = segs.length, o = { track: 0.03 };
        var cA = axb_pickPlate(sc, 'ink'), cB = axb_pickPlate(sc, jzP(ctx, 'second', 'accent')), cols = jzP(ctx, 'swap', false) ? [cB, cA] : [cA, cB];
        var hh, t, ws = 0, size, gap = M * 0.014, wsI = null;
        if (rowMode) {
            hh = Math.min(H * 0.66 / K - gap, M * (K === 1 ? 0.34 : 0.26)); t = hh * 0.4; size = axb_fitAll(segs, font, W * 0.84 - 2 * t - hh * 0.15, hh * 0.6, o);
            var h2 = Math.max(size * 1.7, hh * 0.5); if (h2 < hh) { hh = h2; t = hh * 0.4; }
            wsI = [];
            for (i = 0; i < K; i++) wsI.push(Math.max(W * 0.34, axb_meas(segs[i], size, { font: font, track: 0.03 }).w + 2 * t + hh * 0.3));
        } else {
            hh = M * 0.34; t = hh * 0.42;
            for (k = 0; k < 2; k++) { ws = (W * 0.9 + (K - 1) * (t - gap)) / K; size = axb_fitAll(segs, font, ws - 2 * t - hh * 0.12, hh * 0.6, o); hh = jzClamp(size * 1.8, M * 0.13, M * 0.34); t = hh * 0.42; }
            ws = (W * 0.9 + (K - 1) * (t - gap)) / K;
        }
        var stepX = rowMode ? Math.min(W * 0.05, (W * 0.92 - axb_maxOf(wsI)) / Math.max(1, K - 1)) : 0;
        var S = axb_sheet(ctx, 'chevrons'), items = [], xe = 0, ye = H / 2, bb = null;
        for (i = 0; i < K; i++) {
            var w = rowMode ? wsI[i] : ws, x0 = rowMode ? (W - w) / 2 + (i - (K - 1) / 2) * stepX : W * 0.05 + i * (ws - t + gap);
            var yc = rowMode ? H / 2 + (i - (K - 1) / 2) * (hh + gap) : H / 2, col = cols[i % 2];
            axb_P(S, [[x0, yc - hh / 2], [x0 + w - t, yc - hh / 2], [x0 + w, yc], [x0 + w - t, yc + hh / 2], [x0, yc + hh / 2], [x0 + t, yc]], col, 1,
                { pre: 'var e=' + axb_stg(i, 0.08, 0.45) + ';', pos: '[-(1-e)*' + jzN(W * 0.45) + ',0]', op: 'K*cl(e*3)', n: 'chevron ' + (i + 1) });
            items.push({ text: segs[i], font: font, size: size, x: x0 + w / 2 + t * 0.08, y: yc, track: 0.03, color: axb_onCol(sc, col), mi: i });
            xe = x0 + w; ye = yc;
        }
        if (jzP(ctx, 'tail', true)) {
            for (k = 1; k <= 2; k++) {
                var x = xe + k * gap * 2.2;
                if (x > W * 0.99) break;
                axb_L(S, [[[x - t, ye - hh / 2], [x, ye], [x - t, ye + hh / 2]]], k === 1 ? axb_accentOn(sc) : sc.sub, lw * 3, k === 1 ? 0.9 : 0.5,
                    { pre: 'var e=' + axb_iE(0.4, 0.2 + k * 0.08) + ';', pos: '[-(1-e)*' + jzN(t) + ',0]', op: 'e*K', n: 'tail ' + k });
            }
        }
        axb_flush(S);
        for (i = 0; i < items.length; i++) bb = jzUnion(bb, axb_draw(ctx, items[i]));
        return bb;
    }
});

/* ================================================================== 4 xbTwistFrames — ねじれ枠 */
axb_reg('xbTwistFrames', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['display', 'serif'])), th: rng.range(5, 10) * rng.pick([1, -1]), n: rng.pick([5, 6, 7]), plate: rng.chance(0.35), acc: rng.int(1, 3), sq: rng.chance(0.5) }; },
    build: function (ctx) {
        var B = axb_base(ctx), W = B.W, H = B.H, sc = B.sc, M = B.M, lw = B.lw, port = B.port, font = axb_font(ctx, 'font', 'display'), k;
        var f = axb_fitBox(B.txt, font, W * (port ? 0.7 : 0.6), H * (port ? 0.34 : 0.42), { lead: 1.2, track: 0.03 }, 3), size = Math.min(f.size, M * 0.22);
        var it = { text: f.text, font: font, size: size, x: W / 2, y: H / 2, lead: 1.2, track: 0.03, color: sc.fg };
        var m = axb_meas(it.text, size, it), bw = m.w + size * 0.9, bh = m.h + size * 0.8;
        if (jzP(ctx, 'sq', false)) bh = Math.max(bh, Math.min(bw, M * 0.5));
        var d = M * 0.075, plate = axb_pickPlate(sc, 'ink'), n = jzP(ctx, 'n', 6), th = jzP(ctx, 'th', 7), ai = jzP(ctx, 'acc', 2), pl = jzP(ctx, 'plate', false);
        var S = axb_sheet(ctx, 'twisted frames');
        for (k = n; k >= 0; k--) {
            var w = bw + k * d * 2, h = bh + k * d * 2, hot = k === 0 || k === ai;
            axb_RR(S, W / 2 - w / 2, H / 2 - h / 2, w, h, k === 0 && pl ? plate : null, k === 0 ? sc.fg : k === ai ? axb_accentOn(sc) : sc.sub, k === 0 ? lw * 3 : k === ai ? lw * 2.5 : lw * 1.5,
                hot ? 1 : 0.8 - 0.5 * k / n,
                { pre: 'var e=' + axb_stg(k, 0.045, 0.6) + ',g=0.7+0.3*e;', piv: [W / 2, H / 2], rsz: '[' + jzN(w) + '*g,' + jzN(h) + '*g]',
                    rot: jzN(k * th) + '*(e+0.1*Math.sin(time*0.8+' + jzN(k * 0.5) + ')+PO*0.7)', op: 'K*cl(e*2)', n: 'frame ' + k });
        }
        axb_flush(S);
        if (pl) it.color = axb_onCol(sc, plate);
        return axb_draw(ctx, it);
    }
});

/* ================================================================== 5 xbDonut — ドーナツ図 */
// ring of ticks: N marks from the top, clockwise, revealed with e (a dashed circle; every `major`-th mark is longer)
function axb_ticks(S, cx, cy, r0, lenA, lenB, N, major, lw, col, a, e) {
    var rA = r0 + lenA / 2, rB = r0 + lenB / 2, nB = Math.max(1, Math.round(N / major));
    axb_A(S, cx, cy, rA, col, lenA, a, { dash: [lw, 2 * Math.PI * rA / N - lw], toff: 0, trim: e, op: 'K', n: 'ticks' });
    axb_A(S, cx, cy, rB, col, lenB, a, { dash: [lw, 2 * Math.PI * rB / nB - lw], toff: 0, trim: e, op: 'K', n: 'ticks major' });
}
axb_reg('xbDonut', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['display', 'serif'])), mode: rng.pick(['seg', 'gauge', 'seg']), n: rng.int(3, 5), a0: rng.range(0, 360), val: rng.range(0.55, 0.92), dir: rng.pick([1, -1]) }; },
    build: function (ctx) {
        var B = axb_base(ctx), W = B.W, H = B.H, sc = B.sc, M = B.M, lw = B.lw, ls = B.ls, font = axb_font(ctx, 'font', 'display'), i;
        var cx = W / 2, cy = H / 2, Ro = M * 0.455, th = M * 0.07, Ri = Ro - th;
        var f = axb_fitBox(B.txt, font, Ri * 1.5, Ri * 1.12, { lead: 1.2, track: 0.02 }, 4), size = Math.min(f.size, M * 0.22);
        var plate = axb_pickPlate(sc, 'ink'), acc = axb_accentOn(sc), S = axb_sheet(ctx, 'donut'), val = jzP(ctx, 'val', 0.7), gauge = jzP(ctx, 'mode', 'seg') === 'gauge';
        if (gauge) {
            var pre = 'var e=' + axb_iE(0.7, 0) + ',sw=' + jzN(360 * val) + '*e*(1-0.06*PO)+3*Math.sin(time*1.3);';
            axb_O(S, cx, cy, (Ri + Ro) / 2, null, axb_dimOf(sc), th, 1, { op: 'K*' + axb_iC(0.3, 0), n: 'track' });
            axb_A(S, cx, cy, (Ri + Ro) / 2, acc, th, 1, { pre: pre, toff: 0, trim: 'sw/360', op: 'K', n: 'value' });
            axb_O(S, cx, cy, th * 0.24, axb_onCol(sc, acc), null, 0, 1, { pre: pre + 'var a=(sw-90)*DG;', piv: [cx, cy], pos: '[Math.cos(a)*' + jzN(Ro - th / 2) + ',Math.sin(a)*' + jzN(Ro - th / 2) + ']', op: 'K*e', n: 'value end' });
        } else {
            var cols = [plate, acc, axb_pickPlate(sc, 'accent2'), sc.sub], wts = [], sum = 0, n = jzP(ctx, 'n', 4), dir = jzP(ctx, 'dir', 1) < 0 ? -1 : 1, a = jzP(ctx, 'a0', 0);
            for (i = 0; i < n; i++) { wts.push(0.5 + axb_r(B.seed, i, 21)); sum += wts[i]; }
            var pre2 = 'var e=' + axb_iE(0.7, 0) + ',rt=(time*5+(1-e)*120)*' + dir + ';';
            for (i = 0; i < n; i++) {
                var span = wts[i] / sum * 360, r0 = i === 1 ? Ri - th * 0.18 : Ri, r1 = i === 1 ? Ro + th * 0.18 : Ro;
                axb_A(S, cx, cy, (r0 + r1) / 2, cols[i % 4], r1 - r0, i % 4 === 3 ? 0.6 : 1,
                    { pre: pre2, toffx: jzN(a + 2 + 90) + '+rt', trim: jzN((span - 4) / 360) + '*' + axb_stg(i, 0.07, 0.6), op: 'K', n: 'segment ' + (i + 1) });
                a += span;
            }
        }
        axb_ticks(S, cx, cy, Ro + M * 0.014, M * 0.008, M * 0.018, 60, 5, lw * 1.5, sc.sub, 0.55, axb_iE(0.7, 0));
        axb_flush(S);
        if (gauge) {       // the percentage counts up with the gauge
            var PL = axb_label(ctx, jzPad(Math.round(val * 100), 3) + '%', cx, cy + Ri * 0.78, { align: 'center', size: ls * 1.2, op: 'K*' + axb_iC(0.3, 0.2), name: 'gauge value' });
            jzSetExpr(PL.property('ADBE Text Properties').property('ADBE Text Document'), axb_hd(ctx) + 'var v=Math.round(' + jzN(val * 100) + '*' + axb_iE(0.7, 0) + ');("00"+v).slice(-3)+"%"');
        }
        return axb_draw(ctx, { text: f.text, font: font, size: size, x: cx, y: cy, lead: 1.2, track: 0.02, color: sc.fg });
    }
});

/* ================================================================== 6 xbIsoStack — アイソメ積層 */
axb_reg('xbIsoStack', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['display'])), ang: rng.pick([13, 17, 21]), shift: rng.range(0.4, 1) * rng.pick([1, -1]), second: rng.pick(['accent', 'ink', 'fg']), deep: rng.range(0.55, 0.9) }; },
    build: function (ctx) {
        var B = axb_base(ctx), W = B.W, H = B.H, sc = B.sc, M = B.M, port = B.port, txt = B.txt, font = axb_font(ctx, 'font', 'display'), i;
        var n = jzCount(txt), lines = axb_linesOf(txt, port ? (n <= 3 ? 1 : n <= 6 ? 2 : n <= 10 ? 3 : 4) : (n <= 5 ? 1 : n <= 10 ? 2 : 3)).split('\n'), L = lines.length;
        var ang = jzP(ctx, 'ang', 17) * Math.PI / 180, c = Math.cos(ang), s = Math.sin(ang), shift = jzP(ctx, 'shift', 0.7), deep = jzP(ctx, 'deep', 0.7);
        var size = Math.min(M * 0.22, axb_fitAll(lines, font, W * 0.74 / c, M, { track: 0.03 }));
        function build(sz) {
            var h = sz * 1.42, D = sz * deep, slabs = [], all = [], j, q2;
            for (j = 0; j < L; j++) {
                var w = axb_meas(lines[j], sz, { font: font, track: 0.03 }).w + sz * 0.8, u = (j % 2 ? 1 : -1) * sz * 0.4 * shift * (L > 1 ? 1 : 0) - w / 2;
                var p = [u * c, -u * s + (j + 1) * h], q = [p[0] + w * c, p[1] - w * s], dz = [-c * D, -s * D];
                var front = [p, q, [q[0], q[1] - h], [p[0], p[1] - h]], top = [front[3], front[2], [front[2][0] + dz[0], front[2][1] + dz[1]], [front[3][0] + dz[0], front[3][1] + dz[1]]];
                var sideF = [p, front[3], top[3], [p[0] + dz[0], p[1] + dz[1]]];
                slabs.push({ p: p, w: w, front: front, top: top, side: sideF });
                for (q2 = 0; q2 < 4; q2++) { all.push(front[q2]); all.push(top[q2]); all.push(sideF[q2]); }
            }
            return { h: h, slabs: slabs, bb: axb_ptsBB(all) };
        }
        var G = build(size), k = Math.min(1, W * 0.88 / (G.bb.x1 - G.bb.x0), H * 0.8 / (G.bb.y1 - G.bb.y0));
        if (k < 1) { size *= k; G = build(size); }
        var ox = W / 2 - G.bb.cx, oy = H / 2 - G.bb.cy, cA = axb_pickPlate(sc, 'ink'), cB = axb_pickPlate(sc, jzP(ctx, 'second', 'accent')), S = axb_sheet(ctx, 'slabs'), bb = null;
        function mv(pts) { var o = [], j; for (j = 0; j < pts.length; j++) o.push([pts[j][0] + ox, pts[j][1] + oy]); return o; }
        for (i = L - 1; i >= 0; i--) {      // each slab drops into place, the lowest first
            var Sl = G.slabs[i], col = i % 2 ? cB : cA;
            var o = { pre: 'var e=' + axb_stg(L - 1 - i, 0.09, 0.5) + ';', pos: '[0,-(1-e)*' + jzN(H * 0.45) + ']', op: 'K*cl(e*4)' };
            axb_P(S, mv(Sl.side), jzMixHex(col, sc.bg, 0.68), 1, axb_mix(o, { n: 'side ' + (i + 1) }));
            axb_P(S, mv(Sl.top), jzMixHex(col, sc.bg, 0.4), 1, axb_mix(o, { n: 'top ' + (i + 1) }));
            axb_P(S, mv(Sl.front), col, 1, axb_mix(o, { n: 'front ' + (i + 1) }));
        }
        axb_flush(S);
        for (i = L - 1; i >= 0; i--) {
            var S2 = G.slabs[i];
            bb = jzUnion(bb, axb_drawAff(ctx, { text: lines[i], font: font, size: size, x: S2.w / 2, y: -G.h / 2, track: 0.03, color: axb_onCol(sc, i % 2 ? cB : cA), mi: i }, [c, -s, 0, 1, S2.p[0] + ox, S2.p[1] + oy]));
        }
        return bb;
    }
});

/* ================================================================== 7 xbPolyTrack — 多角形周回 */
axb_reg('xbPolyTrack', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['display', 'serif'])), fontS: rng.pick(jzFontsOf(st, ['body', 'mono'])), sides: rng.pick([3, 4, 6, 6]), speed: rng.range(0.012, 0.03) * rng.pick([1, -1]), flip: rng.chance(0.5), inner: rng.chance(0.6) }; },
    build: function (ctx) {
        var B = axb_base(ctx), W = B.W, H = B.H, sc = B.sc, M = B.M, lw = B.lw, txt = B.txt, font = axb_font(ctx, 'font', 'display'), fontS = axb_font(ctx, 'fontS', 'body'), i;
        var sides = jzP(ctx, 'sides', 6), pts, bw, bh, ty = H / 2;
        if (sides === 3) {
            var ry = H * 0.6, rx = W * 0.53, fl = jzP(ctx, 'flip', false) ? -1 : 1, cy = H / 2 + fl * ry * 0.25;
            pts = [[W / 2, cy - fl * ry], [W / 2 + rx * 0.866, cy + fl * ry * 0.5], [W / 2 - rx * 0.866, cy + fl * ry * 0.5]];
            if (fl < 0) pts = [pts[0], pts[2], pts[1]];
            bw = rx * 0.86; bh = ry * 0.56; ty = cy + fl * ry * 0.13;
        } else if (sides === 4) { pts = axb_ngon(W / 2, H / 2, W * 0.47, H * 0.47, 4, -90); bw = W * 0.47 * 0.98; bh = H * 0.47 * 0.84; }
        else { pts = axb_ngon(W / 2, H / 2, W * 0.47, H * 0.5, 6, 0); bw = W * 0.47 * 1.3; bh = H * 0.5 * 1.1; }
        var f = axb_fitBox(txt, font, bw, bh, { lead: 1.2, track: 0.02 }, 4), size = Math.min(f.size, M * 0.24);
        var N = pts.length, Lp = 0;
        for (i = 0; i < N; i++) { var pa = pts[i], pb = pts[(i + 1) % N]; Lp += Math.sqrt((pb[0] - pa[0]) * (pb[0] - pa[0]) + (pb[1] - pa[1]) * (pb[1] - pa[1])); }
        var gs = M * 0.036, cnt = Math.max(1, Math.min(110, Math.floor(Lp / (gs * 1.22)))), pitch = Lp / cnt, hd = axb_hd(ctx);
        if (jzP(ctx, 'inner', true)) {
            var S = axb_sheet(ctx, 'inner outline'), ccy = sides === 3 ? ty : H / 2, ip = [];
            for (i = 0; i < N; i++) ip.push([W / 2 + (pts[i][0] - W / 2) * 0.86, ccy + (pts[i][1] - ccy) * 0.86]);
            axb_loop(S, ip, sc.sub, lw * 1.5, 0.5, { op: 'K*' + axb_iE(0.8, 0) });
            axb_flush(S);
        }
        // the outline is a track of small running text: ONE text layer on the polygon path (first margin = the run)
        var unit = jzChars(txt.replace(/\s+/g, ' ') + ' ◆ '), str = '', mark = [], scl = [], any = false;
        for (i = 0; i < cnt; i++) { var ch = unit[i % unit.length], dia = ch === '◆'; str += ch === ' ' ? '　' : ch; mark.push(dia); scl.push(dia ? 0.6 : 1); if (dia) any = true; }
        var tr = pitch / gs - 1, T = jzText(ctx, str, { font: fontS, size: gs, color: sc.fg, x: 0, y: 0, align: 'left', track: tr, name: 'track text', opacity: 0.88 });
        tr = jzClamp(tr + (Lp - jzRect(T).width - tr * gs) / (cnt * gs), -0.3, 1);       // close the loop with the real advance widths
        jzTextDoc(T, function (td) { td.tracking = Math.round(tr * 1000); });
        var sh = new Shape(); sh.vertices = pts; sh.closed = true;
        jzTextOnPath(T, sh, 'var L=' + jzN(Lp) + ',d=time*' + jzN(jzP(ctx, 'speed', 0.02) * Lp) + ';((d%L)+L)%L', ctx);
        jzAnimator(T, 'JZ Track Centre', [['ADBE Text Position 3D', [0, AXB_CY * gs, 0]]], '100');
        if (any) { jzCharColors(T, axb_accentOn(sc), mark, 'JZ Track Mark'); jzCharScales(T, scl, 'JZ Track Mark Size'); }
        jzAnimator(T, 'JZ Track In', [['ADBE Text Opacity', 0]], hd + '(1-cl((time-(textIndex-1)/textTotal*0.6)/0.12))*100');
        jzSetExpr(jzXf(T, 'ADBE Opacity'), hd + 'value*K');
        return axb_draw(ctx, { text: f.text, font: font, size: size, x: W / 2, y: ty, lead: 1.2, track: 0.02, color: sc.fg });
    }
});

/* ================================================================== 8 xbShapeRow — 図形並べ */
axb_reg('xbShapeRow', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['display'])), order: rng.int(0, 3), rot: rng.range(0, 9), fill: rng.pick(['mix', 'mix', 'solid']) }; },
    build: function (ctx) {
        var B = axb_base(ctx), W = B.W, H = B.H, sc = B.sc, M = B.M, lw = B.lw, port = B.port, txt = B.txt, font = axb_font(ctx, 'font', 'display'), ri, ci;
        var n = jzCount(txt), rowsT = axb_rowCells(txt, port ? Math.ceil(n / 3) : (n <= 6 ? 1 : n <= 12 ? 2 : 3)), RN = rowsT.length, maxU = 0.4;
        function units(r) { var s = 0, j; for (j = 0; j < r.length; j++) s += axb_isSp(r[j]) ? 0.4 : 1; return s; }
        for (ri = 0; ri < RN; ri++) maxU = Math.max(maxU, units(rowsT[ri]));
        var cell = Math.min(W * 0.9 / maxU, H * 0.78 / Math.max(1, RN), M * 0.38), r = cell * 0.46;
        var cA = axb_pickPlate(sc, 'ink'), cB = axb_pickPlate(sc, 'accent'), cC = axb_pickPlate(sc, 'accent2');
        var order = jzP(ctx, 'order', 0), rotA = jzP(ctx, 'rot', 4), solid = jzP(ctx, 'fill', 'mix') === 'solid', S = axb_sheet(ctx, 'shapes'), items = [], gi = 0, bb = null;
        for (ri = 0; ri < RN; ri++) {
            var row = rowsT[ri], x = W / 2 - units(row) * cell / 2, y = H / 2 + (ri - (RN - 1) / 2) * cell;
            for (ci = 0; ci < row.length; ci++) {
                var ch = row[ci];
                if (axb_isSp(ch)) { x += cell * 0.4; continue; }
                var i = gi++, kind = (i + order) % 4, sty = solid ? i % 2 : i % 3, col = sty === 0 ? cA : sty === 1 ? (i % 2 ? cB : axb_same(cC, cA) ? cB : cC) : null;
                var cx = x + cell / 2, wob = axb_rs(B.seed, i, 33) * rotA, pts = null, gsz = cell * 0.5, gy = y;
                if (kind === 1) { pts = axb_rectPts(cx, y, r * 1.72, r * 1.72, wob); gsz = cell * 0.54; }
                else if (kind === 2) { pts = [[cx, y - r * 1.22], [cx + r * 1.16, y + r * 0.86], [cx - r * 1.16, y + r * 0.86]]; gsz = cell * 0.42; gy = y + r * 0.3; }
                else if (kind === 3) { pts = axb_ngon(cx, y, r * 1.08, r * 1.08, 4, -90); gsz = cell * 0.42; }
                var o = { pre: 'var p=ob((time-' + jzN(i * 0.035) + ')/0.32,1.5);', piv: [cx, y], sc: '[p,p]', op: 'K', n: 'shape ' + (i + 1) };
                if (col) { if (pts) axb_P(S, pts, col, 1, o); else axb_O(S, cx, y, r, col, null, 0, 1, o); }
                else if (pts) axb_loop(S, pts, sc.fg, lw * 2.5, 1, o); else axb_O(S, cx, y, r, null, sc.fg, lw * 2.5, 1, o);
                items.push({ text: ch, font: font, size: jzChars(ch).length > 1 ? gsz * 0.74 : gsz, x: cx, y: gy, color: col ? axb_onCol(sc, col) : sc.fg, mi: i });
                x += cell;
            }
        }
        axb_flush(S);
        for (ri = 0; ri < items.length; ri++) bb = jzUnion(bb, axb_draw(ctx, items[ri]));
        return bb;
    }
});

/* ================================================================== 9 xbCompGrid — 分割構成 */
axb_reg('xbCompGrid', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['display', 'serif'])), vx: rng.pick([0, 1]), hy: rng.pick([0, 1]), fills: rng.int(0, 4), fr: rng.range(0.24, 0.3), ya: rng.range(0.42, 0.66), xa: rng.range(0.5, 0.72) }; },
    build: function (ctx) {
        var B = axb_base(ctx), W = B.W, H = B.H, sc = B.sc, M = B.M, port = B.port, font = axb_font(ctx, 'font', 'display'), i;
        var vx = jzP(ctx, 'vx', 0), hy = jzP(ctx, 'hy', 0), fr = jzP(ctx, 'fr', 0.27), fx = port ? 0.2 : fr, fy = port ? fr * 0.85 : 0.22, T = M * 0.011;
        var xv = vx ? W * fx : W * (1 - fx), yh = hy ? H * fy : H * (1 - fy);
        var bx0 = vx ? xv : 0, bx1 = vx ? W : xv, by0 = hy ? yh : 0, by1 = hy ? H : yh;
        var cx0 = vx ? 0 : xv, cx1 = vx ? xv : W, ry0 = hy ? 0 : yh, ry1 = hy ? yh : H;
        var ya = jzLerp(by0, by1, jzP(ctx, 'ya', 0.5)), xa = jzLerp(bx0, bx1, jzP(ctx, 'xa', 0.6));
        var yc = [0, yh, ya, H].sort(function (p, q) { return p - q; });
        var cells = [[cx0, yc[0], cx1, yc[1]], [cx0, yc[1], cx1, yc[2]], [cx0, yc[2], cx1, yc[3]], [bx0, ry0, xa, ry1], [xa, ry0, bx1, ry1]];
        var colsAll = [axb_accentOn(sc), axb_pickPlate(sc, 'ink'), null, axb_pickPlate(sc, 'accent2'), null], fills = jzP(ctx, 'fills', 0), S = axb_sheet(ctx, 'grid');
        for (i = 0; i < 5; i++) {
            var col = colsAll[(i + fills) % 5], c = cells[i]; if (!col) continue;
            axb_R(S, c[0], c[1], c[2] - c[0], c[3] - c[1], col, 1, { piv: [c[0], c[1]], sc: '[oc((time-' + jzN(0.18 + i * 0.06) + ')/0.35),1]', op: 'K', n: 'cell ' + (i + 1) });
        }
        function g(k) { return axb_iE(0.5, k * 0.05); }
        axb_R(S, xv - T / 2, 0, T, H, sc.fg, 1, { piv: [xv, 0], sc: '[1,' + g(0) + ']', op: 'K', n: 'rule v' });
        axb_R(S, 0, yh - T / 2, W, T, sc.fg, 1, { piv: [W, yh], sc: '[' + g(1) + ',1]', op: 'K', n: 'rule h' });
        axb_R(S, cx0, ya - T / 2, cx1 - cx0, T, sc.fg, 1, { piv: [cx0, ya], sc: '[' + g(3) + ',1]', op: 'K', n: 'rule h2' });
        axb_R(S, xa - T / 2, ry0, T, ry1 - ry0, sc.fg, 1, { piv: [xa, ry0], sc: '[1,' + g(4) + ']', op: 'K', n: 'rule v2' });
        axb_flush(S);
        var tx0 = Math.max(bx0 + T, W * 0.05), tx1 = Math.min(bx1 - T, W * 0.95), ty0 = Math.max(by0 + T, H * 0.05), ty1 = Math.min(by1 - T, H * 0.95);
        var f = axb_fitBox(B.txt, font, (tx1 - tx0) * 0.86, (ty1 - ty0) * 0.78, { lead: 1.2, track: 0.02 }, 4), size = Math.min(f.size, M * 0.3);
        return axb_draw(ctx, { text: f.text, font: font, size: size, x: (tx0 + tx1) / 2, y: (ty0 + ty1) / 2, lead: 1.2, track: 0.02, color: sc.fg });
    }
});

/* ================================================================== 10 xbPrimitives — 三原形 */
axb_reg('xbPrimitives', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['display', 'body'])), flip: rng.chance(0.4), mir: rng.chance(0.5), rot: rng.range(-24, 24), bar: rng.chance(0.7), v: rng.int(0, 2) }; },
    build: function (ctx) {
        var B = axb_base(ctx), W = B.W, H = B.H, sc = B.sc, M = B.M, lw = B.lw, port = B.port, font = axb_font(ctx, 'font', 'display');
        var mir = jzP(ctx, 'mir', false), ms = mir ? -1 : 1, fs = jzP(ctx, 'flip', false) ? -1 : 1, rot = jzP(ctx, 'rot', 0), v = jzP(ctx, 'v', 0) % 3;
        var Sz = port ? M * 0.3 : Math.min(M * 0.27, W * 0.15);
        var gx = port ? W / 2 + ms * W * 0.08 : (ms > 0 ? W - W * 0.05 - Sz * 1.35 : W * 0.05 + Sz * 1.35), gy = port ? H / 2 - fs * H * 0.2 : H / 2 - fs * H * 0.1;
        var cA = axb_accentOn(sc), cB = axb_pickPlate(sc, 'ink'), cC = axb_pickPlate(sc, 'accent2');
        var e2 = axb_iE(0.6, 0.08), e3 = axb_iE(0.6, 0.16), S = axb_sheet(ctx, 'primitives');
        // circle
        axb_O(S, gx + Sz * 0.3 * ms, gy - Sz * 0.15, Sz, [cA, cB, cA][v], null, 0, 1, { rs: 'ob(time/0.5,1.4)', op: 'K', n: 'circle' });
        // square: flies in turning, then breathes a little
        var qx = gx - Sz * 0.55 * ms, qy = gy + Sz * 0.55;
        axb_R(S, qx - Sz * 0.525, qy - Sz * 0.525, Sz * 1.05, Sz * 1.05, [cB, cA, cC][v], 1,
            { pre: 'var e=' + e2 + ';', piv: [qx, qy], pos: '[(1-e)*' + jzN(-ms * W * 0.3) + ',0]', rot: jzN(rot * 0.4) + '+(1-e)*60+Math.sin(time*0.5)*2', op: 'K*cl(e*3)', n: 'square' });
        // triangle: rises from below, keeps turning
        var tx0 = gx + Sz * 0.75 * ms, ty0 = gy + Sz * 0.7;
        axb_P(S, axb_ngon(tx0, ty0, Sz * 0.62, Sz * 0.62, 3, rot - 90), [axb_same(cC, cB) ? sc.fg : cC, sc.fg, cB][v], 1,
            { pre: 'var e=' + e3 + ';', piv: [tx0, ty0], pos: '[0,(1-e)*' + jzN(H * 0.4) + ']', rot: 'time*4', op: 'K*cl(e*3)', n: 'triangle' });
        if (jzP(ctx, 'bar', true)) {
            var a = (rot * 0.6 - 35 * ms) * Math.PI / 180, Lb = Sz * 2.3;
            axb_L(S, [[[gx - Math.cos(a) * Lb, gy - Math.sin(a) * Lb], [gx + Math.cos(a) * Lb, gy + Math.sin(a) * Lb]]], sc.fg, lw * 3, 1,
                { pre: 'var e=' + axb_iE(0.7, 0.2) + ';', start: '0.5-0.5*e', trim: '0.5+0.5*e', op: 'K', n: 'bar' });
        }
        axb_O(S, gx - Sz * 0.9 * ms, gy - Sz * 0.75, Sz * 0.22, null, sc.fg, lw * 3, 1, { rs: e3, op: 'K', n: 'ring' });
        // lyric, flush on the other side, with a short accent rule beside it
        var tw = port ? W * 0.86 : W * 0.85 - Sz * 2.7, th = port ? H * 0.3 : H * 0.5;
        var tx = port ? (mir ? W * 0.93 : W * 0.07) : (mir ? W * 0.94 : W * 0.06), tyc = port ? H / 2 + fs * H * 0.24 : H / 2 + fs * H * 0.12;
        var f = axb_fitBox(B.txt, font, tw, th, { lead: 1.18, track: 0.02 }, 4), size = Math.min(f.size, M * 0.24);
        var it = { text: f.text, font: font, size: size, x: tx, y: tyc, align: mir ? 'right' : 'left', lead: 1.18, track: 0.02, color: sc.fg };
        var m = axb_meas(it.text, size, it), hb = m.h + size * 0.2;
        axb_R(S, tx - (mir ? -size * 0.22 : size * 0.22) - lw * 2, tyc - hb / 2, lw * 4, hb, cA, 1, { piv: [tx, tyc], sc: '[1,' + axb_iE(0.5, 0.1) + ']', op: 'K', n: 'lyric rule' });
        axb_flush(S);
        return axb_draw(ctx, it);
    }
});

/* ================================================================== 11 xbArcPoster — 同心弧 */
axb_reg('xbArcPoster', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['body', 'display', 'serif'])), corner: rng.int(0, 3), n: rng.pick([5, 6]), a0: rng.range(0, 360), col: rng.pick(['fg', 'fg', 'ink', 'accent']), acc: rng.int(0, 7), rule: rng.chance(0.7) }; },
    build: function (ctx) {
        var B = axb_base(ctx), W = B.W, H = B.H, sc = B.sc, M = B.M, lw = B.lw, port = B.port, font = axb_font(ctx, 'font', 'body'), k;
        var corner = jzP(ctx, 'corner', 0), right = corner % 2 === 1, low = corner >= 2;            // where the arcs live
        var cx = W * (right ? 0.74 : 0.26), cy = H * (low ? 0.7 : 0.3);
        var tw = port ? W * 0.88 : W * 0.5, th = H * (port ? 0.28 : 0.36), tx = right ? W * 0.06 : W * 0.94, ty0 = low ? H * 0.08 : H * 0.92 - th;
        // nearest point of the text zone to the arc centre
        var zx0 = right ? tx : tx - tw, px = jzClamp(cx, zx0, zx0 + tw), py = jzClamp(cy, ty0, ty0 + th);
        var dist = Math.sqrt((px - cx) * (px - cx) + (py - cy) * (py - cy)), n = jzP(ctx, 'n', 5), wMax = dist * 0.15, rMax = dist - wMax / 2 - M * 0.03;
        var col = axb_pickPlate(sc, jzP(ctx, 'col', 'fg')), acc = axb_accentOn(sc), ai = jzP(ctx, 'acc', 0), a0 = jzP(ctx, 'a0', 0), S = axb_sheet(ctx, 'arcs');
        for (k = 0; k < n; k++) {
            var r = rMax * Math.pow(1.5, k - (n - 1)), w = wMax * Math.pow(1.6, k - (n - 1)), sw = 130 + 90 * axb_r(B.seed, k, 51);
            axb_A(S, cx, cy, r, k === ai ? acc : col, w, 1, { pre: 'var e=' + axb_stg(n - 1 - k, 0.06, 0.8) + ';',
                toffx: jzN(a0 + k * 53 + 90) + '+time*' + jzN((k % 2 ? -1 : 1) * (7 - k * 0.8)) + '+(1-e)*90', trim: jzN(sw / 360) + '*e*(1-0.5*PO)', op: 'K', n: 'arc ' + (k + 1) });
        }
        axb_O(S, cx, cy, rMax * Math.pow(1.5, -(n - 1)) * 0.3, acc, null, 0, 1, { rs: axb_iE(0.5, 0), op: 'K', n: 'hub' });
        var f = axb_fitBox(B.txt, font, tw, th, { lead: 1.22, track: 0.03 }, 4), size = Math.min(f.size, M * 0.2);
        var it = { text: f.text, font: font, size: size, x: tx, y: ty0 + th / 2, align: right ? 'left' : 'right', lead: 1.22, track: 0.03, color: sc.fg };
        var rule = jzP(ctx, 'rule', true), yr = it.y - axb_meas(it.text, size, it).h / 2 - size * 0.42;
        if (rule) axb_R(S, right ? tx : tx - M * 0.16, yr - lw * 1.5, M * 0.16, lw * 3, sc.fg, 1, { piv: [tx, yr], sc: '[' + axb_iE(0.5, 0.1) + ',1]', op: 'K', n: 'rule' });
        axb_flush(S);
        if (rule) axb_label(ctx, 'No.' + axb_p2(B.no), tx + (right ? 1 : -1) * M * 0.18, yr, { align: right ? 'left' : 'right', op: 'K*' + axb_iC(0.3, 0.25) });
        return axb_draw(ctx, it);
    }
});

/* ================================================================== 12 xbZiggurat — 段ピラミッド */
axb_reg('xbZiggurat', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['display'])), inv: rng.chance(0.35), alt: rng.chance(0.6), col: rng.pick(['ink', 'fg', 'accent']) }; },
    build: function (ctx) {
        var B = axb_base(ctx), W = B.W, H = B.H, sc = B.sc, M = B.M, port = B.port, txt = B.txt, font = axb_font(ctx, 'font', 'display'), i;
        var n = jzCount(txt), lines = axb_linesOf(txt, port ? Math.min(4, Math.ceil(n / 4)) : (n <= 6 ? 1 : n <= 12 ? 2 : 3)).split('\n'), L = lines.length;
        var inv = jzP(ctx, 'inv', false), alt = jzP(ctx, 'alt', true);
        var size = Math.min(M * 0.21, H * 0.66 / (L * 1.5 + 0.85), axb_fitAll(lines, font, W * 0.74, M, { track: 0.03 }));
        function build(sz) {
            var inc = sz * 0.5, w = [], j, out = [];
            for (j = 0; j < L; j++) w.push(axb_meas(lines[j], sz, { font: font, track: 0.03 }).w + sz * 0.9);
            if (!inv) { for (j = 1; j < L; j++) w[j] = Math.max(w[j], w[j - 1] + inc * 2); } else { for (j = L - 2; j >= 0; j--) w[j] = Math.max(w[j], w[j + 1] + inc * 2); }
            var h = sz * 1.5, cap = { w: Math.max(sz * 0.7, axb_minOf(w) - inc * 2.2), h: h * 0.42, k: 'cap' }, bs = { w: axb_maxOf(w) + inc * 2, h: h * 0.28, k: 'base' };
            out.push(inv ? bs : cap);
            for (j = 0; j < L; j++) out.push({ w: w[j], h: h, k: 'line', i: j });
            out.push(inv ? cap : bs);
            return out;
        }
        var steps = build(size), mw = 0, TH = 0;
        for (i = 0; i < steps.length; i++) mw = Math.max(mw, steps[i].w);
        if (mw > W * 0.92) { size *= W * 0.92 / mw; steps = build(size); }
        for (i = 0; i < steps.length; i++) TH += steps[i].h;
        var plate = axb_pickPlate(sc, jzP(ctx, 'col', 'ink')), p2 = jzMixHex(plate, sc.bg, 0.22), acc = axb_same(axb_accentOn(sc), plate) ? sc.sub : axb_accentOn(sc);
        var y = H / 2 - TH / 2, S = axb_sheet(ctx, 'steps'), items = [], bb = null;
        for (i = 0; i < steps.length; i++) {
            var s = steps[i], ord = inv ? i : steps.length - 1 - i, col = s.k === 'cap' ? acc : (alt && s.k === 'line' && s.i % 2) ? p2 : plate;
            axb_R(S, W / 2 - s.w / 2, y, s.w, s.h + 0.6, col, 1, { piv: [W / 2, y], sc: '[' + axb_stg(ord, 0.07, 0.45) + ',1]', op: 'K', n: s.k + ' ' + (i + 1) });
            if (s.k === 'line') items.push({ text: lines[s.i], font: font, size: size, x: W / 2, y: y + s.h / 2, track: 0.03, color: axb_onCol(sc, col), mi: s.i });
            y += s.h;
        }
        axb_flush(S);
        for (i = 0; i < items.length; i++) bb = jzUnion(bb, axb_draw(ctx, items[i]));
        return bb;
    }
});

/* ================================================================== 13 xbHoneycomb — ハニカム */
axb_reg('xbHoneycomb', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['display', 'body'])), acc: rng.int(0, 30), extra: rng.chance(0.85), col: rng.pick(['ink', 'fg']) }; },
    build: function (ctx) {
        var B = axb_base(ctx), W = B.W, H = B.H, sc = B.sc, M = B.M, lw = B.lw, port = B.port, txt = B.txt, font = axb_font(ctx, 'font', 'display'), ri, c, i;
        var c0 = axb_cellsOf(txt).length, pr = axb_padRows(axb_rowCells(txt, port ? Math.ceil(c0 / 3) : (c0 <= 5 ? 1 : c0 <= 10 ? 2 : 3))), sl = pr.flat, n = sl.length, rows = pr.rows, per = pr.per;
        var wu = per + (rows > 1 ? 0.5 : 0), r = Math.min(W * 0.88 / (wu * 1.732), H * 0.8 / ((rows - 1) * 1.5 + 2), M * 0.19), cw = r * 1.732;
        var X0 = (W - wu * cw) / 2, Y0 = (H - ((rows - 1) * 1.5 + 2) * r) / 2 + r;
        function pos(a, b) { return [X0 + (b + 0.5 + (((a % 2) + 2) % 2) * 0.5) * cw, Y0 + a * 1.5 * r]; }
        var plate = axb_pickPlate(sc, jzP(ctx, 'col', 'ink')), acc = axb_same(axb_accentOn(sc), plate) ? axb_pickPlate(sc, 'fg') : axb_accentOn(sc), S = axb_sheet(ctx, 'honeycomb');
        if (jzP(ctx, 'extra', true)) {          // empty cells around the lyric
            for (ri = -1; ri <= rows; ri++) for (c = -1; c <= per; c++) {
                var idx = ri * per + c, used = ri >= 0 && ri < rows && c >= 0 && c < per && idx < n && !axb_isSp(sl[idx]);
                if (used || axb_r(B.seed, ri + 3, c + 3, 61) < 0.35) continue;
                var p = pos(ri, c);
                if (p[0] < r * 0.2 || p[0] > W - r * 0.2 || p[1] < r * 0.2 || p[1] > H - r * 0.2) continue;
                axb_loop(S, axb_ngon(p[0], p[1], r * 0.9, r * 0.9, 6, -90), sc.sub, lw * 1.5, 0.55,
                    { pre: 'var e=' + axb_iE(0.5, 0.1 + axb_r(B.seed, ri + 3, c + 3, 62) * 0.3) + ';', piv: p, sc: '[e,e]', op: 'K*e', n: 'empty cell' });
            }
        }
        var items = [], gi = 0, bb = null, ai = jzP(ctx, 'acc', 0) % Math.max(1, n);
        for (i = 0; i < n; i++) {
            if (axb_isSp(sl[i])) continue;
            var q = pos(Math.floor(i / per), i % per), col = gi === ai ? acc : plate;
            axb_P(S, axb_ngon(q[0], q[1], r * 0.93, r * 0.93, 6, -90), col, 1, { pre: 'var p=ob((time-' + jzN(gi * 0.03) + ')/0.32,1.4);', piv: q, sc: '[p,p]', op: 'K', n: 'cell ' + (gi + 1) });
            items.push({ text: sl[i], font: font, size: jzChars(sl[i]).length > 1 ? r * 0.72 : r * 1.02, x: q[0], y: q[1], color: axb_onCol(sc, col), mi: gi });
            gi++;
        }
        axb_flush(S);
        for (i = 0; i < items.length; i++) bb = jzUnion(bb, axb_draw(ctx, items[i]));
        return bb;
    }
});

/* ================================================================== 14 xbShear — 平行四辺形 */
axb_reg('xbShear', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['display'])), k: rng.pick([0.26, 0.36, -0.26, -0.36]), cols: rng.int(0, 2), stag: rng.range(0.025, 0.06) }; },
    build: function (ctx) {
        var B = axb_base(ctx), W = B.W, H = B.H, sc = B.sc, M = B.M, port = B.port, txt = B.txt, font = axb_font(ctx, 'font', 'display'), i;
        var n = jzCount(txt), lines = axb_linesOf(txt, port ? Math.min(4, Math.ceil(n / 4)) : (n <= 6 ? 1 : n <= 12 ? 2 : 3)).split('\n'), L = lines.length;
        var stag = jzP(ctx, 'stag', 0.04), k = jzP(ctx, 'k', 0.26), ci = jzP(ctx, 'cols', 0);
        var size = Math.min(M * 0.23, H * 0.66 / (L * 1.5), axb_fitAll(lines, font, W * (0.7 - (L > 1 ? stag * 2 : 0)), M, { track: 0.03 }));
        var h = size * 1.5, m = [1, 0, -k, 1, k * H / 2, 0], cs = [axb_pickPlate(sc, 'ink'), axb_accentOn(sc), axb_pickPlate(sc, 'fg')];
        function slab(x, y, w, hh) { return [axb_xfPt(m, x, y), axb_xfPt(m, x + w, y), axb_xfPt(m, x + w, y + hh), axb_xfPt(m, x, y + hh)]; }
        var S = axb_sheet(ctx, 'slabs'), items = [], bb = null;
        for (i = 0; i < L; i++) {
            var w = axb_meas(lines[i], size, { font: font, track: 0.03 }).w + size * 1.3, sd = i % 2 ? 1 : -1;
            var xc = W / 2 + (L > 1 ? sd * W * stag : 0), yc = H / 2 + (i - (L - 1) / 2) * h, col = cs[(i + ci) % 3];
            axb_P(S, slab(xc - w / 2, yc - h / 2, w, h + 0.6), col, 1, { pre: 'var e=' + axb_stg(i, 0.07, 0.5) + ';', pos: '[(1-e)*' + jzN(sd * W) + ',0]', op: 'K', n: 'slab ' + (i + 1) });
            if (L === 1) {
                var a2 = cs[(ci + 1) % 3], pe = 'var e=' + axb_stg(2, 0.07, 0.5) + ';';
                axb_P(S, slab(xc + w * 0.02, yc - h / 2 - h * 0.2, w * 0.48, h * 0.2 + 0.6), a2, 1, { pre: pe, pos: '[-(1-e)*' + jzN(W) + ',0]', op: 'K', n: 'tab top' });
                axb_P(S, slab(xc - w / 2, yc + h / 2, w * 0.36, h * 0.2), a2, 1, { pre: pe, pos: '[(1-e)*' + jzN(W) + ',0]', op: 'K', n: 'tab bottom' });
            }
            items.push({ text: lines[i], font: font, size: size, x: xc, y: yc, track: 0.03, color: axb_onCol(sc, col), mi: i });
        }
        axb_flush(S);
        for (i = 0; i < items.length; i++) bb = jzUnion(bb, axb_drawAff(ctx, items[i], m));
        return bb;
    }
});

/* ================================================================== 15 xbPatternPanel — 図形タイル */
axb_reg('xbPatternPanel', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['display', 'serif'])), kind: rng.pick(['quarter', 'half', 'tri', 'mix']), side: rng.pick([0, 1]), align: rng.pick(['c', 'c', 'e']) }; },
    build: function (ctx) {
        var B = axb_base(ctx), W = B.W, H = B.H, sc = B.sc, M = B.M, port = B.port, font = axb_font(ctx, 'font', 'display'), i, j, par;
        var side = jzP(ctx, 'side', 0), kindP = jzP(ctx, 'kind', 'mix'), s = B.seed;
        var tile = port ? W / 5 : H / 5, cols = port ? 5 : Math.max(2, Math.round(W * 0.31 / tile)), rows = port ? Math.max(2, Math.round(H * 0.3 / tile)) : 5;
        var pw = cols * tile, ph = rows * tile, px = port ? 0 : (side ? W - pw : 0), py = port ? (side ? H - ph : 0) : 0;
        var cFg = [axb_accentOn(sc), axb_pickPlate(sc, 'fg'), axb_pickPlate(sc, 'accent2')], cBg = [axb_pickPlate(sc, 'ink'), null, axb_dimOf(sc)], kinds = ['quarter', 'half', 'tri'];
        var hf = tile / 2, kq = 0.5523 * tile, kh = 0.5523 * hf;
        // a turning tile pokes out of its square: the browser clips it. Here the two checkerboard halves of the panel are
        // two layers, each matted by its own squares (edge neighbours always belong to the other half).
        for (par = 0; par < 2; par++) {
            var S = axb_sheet(ctx, 'tiles ' + (par ? 'B' : 'A')), sq = [];
            for (j = 0; j < rows; j++) for (i = 0; i < cols; i++) {
                if ((i + j) % 2 !== par) continue;
                var cx = px + (i + 0.5) * tile, cy = py + (j + 0.5) * tile, kind = kindP === 'mix' ? kinds[axb_h(s, i, j, 71) % 3] : kindP, turn = axb_h(s, i, j, 72) % 4;
                var pre = 'var e=oc((time-' + jzN((i + j) * 0.035) + ')/0.35);', rot = null;
                if (axb_r(s, i, j, 73) < 0.55) {       // this tile keeps turning a quarter at a time
                    pre += 'var u=time/' + jzN(1.4 + axb_r(s, i, j, 74) * 1.6) + '+' + jzN(axb_r(s, i, j, 75)) + ',fu=Math.floor(u);';
                    rot = '(' + turn + '+fu+ioc((u-fu)/0.3))*90';
                }
                var bg = cBg[axb_h(s, i, j, 76) % 3], fg = cFg[axb_h(s, i, j, 77) % 3], seg;
                if (bg && axb_same(fg, bg)) fg = sc.bg;
                sq.push([cx - hf, cy - hf, tile, tile]);
                if (bg) axb_R(S, cx - hf, cy - hf, tile, tile, bg, 1, { pre: pre, piv: [cx, cy], sc: '[e,e]', n: 'tile bg' });
                if (kind === 'quarter') seg = { v: [[cx - hf, cy - hf], [cx + hf, cy - hf], [cx - hf, cy + hf]], i: [[0, 0], [0, 0], [kq, 0]], o: [[0, 0], [0, kq], [0, 0]] };
                else if (kind === 'half') seg = { v: [[cx + hf, cy - hf], [cx, cy], [cx - hf, cy - hf]], i: [[0, 0], [kh, 0], [0, kh]], o: [[0, kh], [-kh, 0], [0, 0]] };
                else seg = [[cx - hf, cy - hf], [cx + hf, cy - hf], [cx - hf, cy + hf]];
                var o = { pre: pre, piv: [cx, cy], sc: '[e,e]', n: 'tile ' + kind };
                if (rot) o.rot = rot; else o.rv = turn * 90;
                axb_P(S, seg, fg, 1, o);
            }
            if (!S.g.length) continue;
            S.lop = 'K';
            var TL = axb_flush(S), Ms = axb_sheet(ctx, 'tiles matte ' + (par ? 'B' : 'A'));
            axb_spec(Ms, null, { k: 'rects', list: sq, fill: '#FFFFFF', a: 1, n: 'squares' });
            axb_matte(TL, axb_flush(Ms));
        }
        var ax0 = port ? W * 0.06 : (side ? W * 0.05 : pw + W * 0.045), ax1 = port ? W * 0.94 : (side ? W - pw - W * 0.045 : W * 0.95);
        var ay0 = port ? (side ? H * 0.06 : ph + H * 0.04) : H * 0.08, ay1 = port ? (side ? H - ph - H * 0.04 : H * 0.94) : H * 0.92;
        var f = axb_fitBox(B.txt, font, (ax1 - ax0) * 0.96, (ay1 - ay0) * 0.7, { lead: 1.2, track: 0.02 }, 4), size = Math.min(f.size, M * 0.26);
        var edge = jzP(ctx, 'align', 'c') === 'e' && !port, al = edge ? (side ? 'right' : 'left') : 'center';
        return axb_draw(ctx, { text: f.text, font: font, size: size, x: edge ? (side ? ax1 : ax0) : (ax0 + ax1) / 2, y: (ay0 + ay1) / 2, align: al, lead: 1.2, track: 0.02, color: sc.fg });
    }
});
