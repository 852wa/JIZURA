// ================================================================ pack x2waA part 1 (AE port of src/11p_x2_waA.js — 追加分2 和風)
// The helpers shared by both parts (prefix awza_) + the 15 layouts:
// wzByobu, wzNobori, wzSenjafuda, wzAndon, wzShikishi, wzFurin, wzBanzuke, wzTenugui, wzChikkan, wzShogi, wzNoshi,
// wzGenjiGumo, wzTorii, wzUchiwa, wzSudare.   Part 2 (p_x2_waA2.jsx) holds the 10 decor parts and the 6 backgrounds.
//
// How these are built (traditional objects and patterns drawn with flat shapes):
// - a "kit" (awza_kit) is ONE shape layer whose anchor == position, so layer space == comp space. The browser's drawing
//   calls (rect / circle / line / polygon) are queued and become shape groups, emitted in reverse so the paint order is
//   the browser's. g.sub() … g.end() nests calls in a group with its own transform (a flag unrolling, a bird, a blossom).
//   The browser's pose() (an object sliding / scaling / swinging as a whole) is the layer transform.
// - every small animation is an expression on a group transform, a Trim Paths, an ellipse size or a path (createPath),
//   written against the cut-local time like the browser's lt. Canvas clipping becomes a layer mask (static or createPath).
// - repeating patterns (七宝, 矢絣, 紗綾形, 豆絞り, slats …) are one motif + Repeaters.
// - the lyric stays text: horizontal blocks are one text layer, vertical setting is one text layer per column
//   (one glyph per line). A lyric on a posed object is parented to its kit, so the cut's enter / hold / exit stay untouched.
// - everything except the lyric is main-pass only in the browser (ghost: false): awza_reg marks those layers jzNoGhost.
// - seeded details use a port of the browser's J.h / J.r hash, so the same plan gives the same details.

var AWZA_D = Math.PI / 180, AWZA_TAU = Math.PI * 2, AWZA_R2D = 180 / Math.PI;
var AWZA_LYR = [];
// expression helpers appended after jzTH(ctx): the browser pack's inE / inC / inB, in-out cubic, wrap and value noise
var AWZA_FX = 'function inE(d,dl){return oe((time-(dl||0))/d);}' +
    'function inC(d,dl){return oc((time-(dl||0))/d);}' +
    'function inB(d,dl,s){var q=cl((time-(dl||0))/d);return q<=0?0:(q>=1?1:ob(q,s||1.4));}' +
    'function ioc(x){x=cl(x);return x<0.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;}' +
    'function wr(v,m){return ((v%m)+m)%m;}' +
    'function n1(x,s){var i=Math.floor(x),f=x-i,w=f*f*(3-2*f),a=hh(i*1.31+s*0.017)*2-1,b=hh((i+1)*1.31+s*0.017)*2-1;return a+(b-a)*w;}\n';

/* ---------------------------------------------------------------- seeded numbers (the browser's J.h / J.r / J.rs) */
function awza_h(a, b, c, d, e) {
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
function awza_r01(a, b, c, d, e) { return awza_h(a, b, c, d, e) / 4294967296; }
function awza_rs(a, b, c, d, e) { return awza_r01(a, b, c, d, e) * 2 - 1; }

/* ---------------------------------------------------------------- colours (same rules as the browser pack) */
function awza_on(sc, fill) {
    var c = [sc.bg, sc.fg, sc.ink, sc.sub], best = null, bv = 0, i, k;
    for (i = 0; i < c.length; i++) { if (!c[i] || c[i] === fill) continue; k = jzContrast(c[i], fill); if (k > bv) { bv = k; best = c[i]; } }
    return bv >= 3 ? best : (jzLum(fill) > 0.45 ? '#000000' : '#FFFFFF');
}
function awza_plate(sc, pref, against, min) {
    var b = against || sc.bg, i; if (min == null) min = 1.6;
    for (i = 0; i < pref.length; i++) if (pref[i] && jzContrast(pref[i], b) >= min) return pref[i];
    return jzContrast(sc.fg, b) >= jzContrast(sc.bg, b) ? sc.fg : sc.bg;
}
function awza_without(list, c) { var o = [], i; for (i = 0; i < list.length; i++) if (list[i] !== c) o.push(list[i]); return o; }
// light "paper": fill, text colour, an accent that reads on it, faint line colours
function awza_card(sc) {
    var fill = jzLightest(sc), text = awza_on(sc, fill);
    return { fill: fill, text: text, acc: awza_plate(sc, [sc.accent, sc.accent2, sc.ink], fill, 2), faint: jzMixHex(fill, text, 0.2), line: jzMixHex(fill, text, 0.4) };
}
function awza_wood(sc) { var w = jzMixHex(jzDarkest(sc), awza_plate(sc, [sc.accent, sc.sub]), 0.35); return jzContrast(w, sc.bg) >= 1.35 ? w : jzMixHex(w, sc.fg, 0.4); }

/* ---------------------------------------------------------------- small helpers */
function awza_mot(ctx) { return ctx.fx && ctx.fx.motion != null ? ctx.fx.motion : 0.6; }
function awza_H(ctx) { return jzTH(ctx) + AWZA_FX + 'var MO=' + jzN(awza_mot(ctx)) + ';\n'; }
function awza_base(ctx) {
    var c = ctx.cut, W = ctx.W, H = ctx.H, M = Math.min(W, H);
    return { W: W, H: H, sc: ctx.sc, c: c, M: M, port: H > W * 1.08, txt: jzTrim(String(c.text || '')) || ' ', lw: Math.max(1, M * 0.0016),
        no: (c.line | 0) + 1, mo: awza_mot(ctx), seed: c.seed || 0, font: jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'display')) };
}
function awza_fontPick(rng, st, heavy) { return rng.chance(heavy ? 0.25 : 0.4) ? 'brush' : rng.pick(jzFontsOf(st, heavy ? ['display'] : ['serif', 'display'])); }
function awza_mif(ctx, t) { return Math.max(0, t) / Math.max(0.005, ctx.cut.stagger || 0.04); }      // browser miAt (a fraction)
function awza_mi(ctx, t, add) { return Math.floor(awza_mif(ctx, t) + (add || 0) + 1e-6); }
function awza_lerp(a, b, t) { return a + (b - a) * t; }
function awza_inE(d, dl) { return 'inE(' + jzN(d) + ',' + jzN(dl || 0) + ')'; }
function awza_inC(d, dl) { return 'inC(' + jzN(d) + ',' + jzN(dl || 0) + ')'; }
function awza_inB(d, dl, s) { return 'inB(' + jzN(d) + ',' + jzN(dl || 0) + ',' + jzN(s || 1.4) + ')'; }
function awza_kanjiNum(n) {
    var K = '〇一二三四五六七八九';
    n = Math.max(0, n | 0);
    if (n < 10) return K.charAt(n);
    if (n < 20) return '十' + (n % 10 ? K.charAt(n % 10) : '');
    if (n < 100) return K.charAt(Math.floor(n / 10)) + '十' + (n % 10 ? K.charAt(n % 10) : '');
    return String(n);
}
function awza_box(x0, y0, x1, y1) { return { x0: x0, y0: y0, x1: x1, y1: y1, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 }; }
// parent without converting the child's values: every kit layer has anchor == position (layer space == comp space)
function awza_parent(L, P) { try { L.setParentWithJump(P); } catch (e) { try { L.parent = P; } catch (e2) { jzWarn('parent: ' + e2.toString()); } } }
// point lists (angles in degrees, 0 = right, clockwise on screen)
function awza_arc(cx, cy, rx, ry, a0, a1, n) { var o = [], i, a; n = n || 20; for (i = 0; i <= n; i++) { a = (a0 + (a1 - a0) * i / n) * AWZA_D; o.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); } return o; }
function awza_quad(a, b, c, n) { var o = [], i, t, k; n = n || 12; for (i = 0; i <= n; i++) { t = i / n; k = 1 - t; o.push([k * k * a[0] + 2 * k * t * b[0] + t * t * c[0], k * k * a[1] + 2 * k * t * b[1] + t * t * c[1]]); } return o; }
function awza_cubic(a, b, c, d, n) {
    var o = [], i, t, k; n = n || 14;
    for (i = 0; i <= n; i++) { t = i / n; k = 1 - t; o.push([k * k * k * a[0] + 3 * k * k * t * b[0] + 3 * k * t * t * c[0] + t * t * t * d[0], k * k * k * a[1] + 3 * k * k * t * b[1] + 3 * k * t * t * c[1] + t * t * t * d[1]]); }
    return o;
}
function awza_shift(pts, dx, dy) { var o = [], i; for (i = 0; i < pts.length; i++) o.push([pts[i][0] + dx, pts[i][1] + dy]); return o; }
function awza_ptsExpr(pts) { var s = [], i; for (i = 0; i < pts.length; i++) s.push('[' + jzN(pts[i][0]) + ',' + jzN(pts[i][1]) + ']'); return '[' + s.join(',') + ']'; }
// 雪輪: a ring with six small notches, around (0, 0)
function awza_yukiwa(R) {
    var N = 84, o = [], i, th, u, d, r, seg = AWZA_TAU / 6;
    for (i = 0; i < N; i++) {
        th = i / N * AWZA_TAU; u = (th / seg) % 1; d = Math.min(u, 1 - u) * seg; r = R * (1 - 0.17 * Math.exp(-(d / 0.075) * (d / 0.075)));
        o.push([Math.cos(th) * r, Math.sin(th) * r]);
    }
    return o;
}
function awza_ellShape(cx, cy, rx, ry) {
    var kx = 0.5523 * rx, ky = 0.5523 * ry, sh = new Shape();
    sh.vertices = [[cx, cy - ry], [cx + rx, cy], [cx, cy + ry], [cx - rx, cy]];
    sh.inTangents = [[-kx, 0], [0, -ky], [kx, 0], [0, ky]];
    sh.outTangents = [[kx, 0], [0, ky], [-kx, 0], [0, -ky]];
    sh.closed = true; return sh;
}

/* ---------------------------------------------------------------- text: line breaking and fitting */
// advance width in em (the browser measures real fonts; this only picks the line count — sizes come from AE's own measure)
function awza_adv(ch) {
    var c = ch.charCodeAt(0);
    if (ch === ' ') return 0.34;
    if (c < 0x80) {
        if (/[A-Z]/.test(ch)) return /[MW]/.test(ch) ? 0.9 : (ch === 'I' ? 0.32 : 0.7);
        if (/[a-z]/.test(ch)) return /[mw]/.test(ch) ? 0.88 : (/[ijl]/.test(ch) ? 0.28 : (/[frt]/.test(ch) ? 0.42 : 0.61));
        if (/[0-9]/.test(ch)) return 0.62;
        return /[.,:;!'|]/.test(ch) ? 0.28 : 0.42;
    }
    if (c < 0x250) return 0.56;
    if (c >= 0xFF61 && c <= 0xFF9F) return 0.5;
    return 1;
}
function awza_meas(str, track, lead) {
    var ls = String(str).split(/\r\n|\r|\n/), w = 0.01, i, j;
    for (i = 0; i < ls.length; i++) { var a = jzChars(ls[i]), lw = 0; for (j = 0; j < a.length; j++) lw += awza_adv(a[j]) + (track || 0); if (lw > w) w = lw; }
    return { w: w, h: 1 + (ls.length - 1) * (lead || 1.2) };
}
// J.splitLines, but never leave a line of punctuation only
function awza_splitL(t, per) {
    var ls = jzSplitLines(String(t), Math.max(1, per)).split('\r'), out = [], i, j;
    for (i = 0; i < ls.length; i++) {
        var cs = jzChars(ls[i]), all = true;
        for (j = 0; j < cs.length; j++) if (!(jzIsPunct(cs[j]) || cs[j] === 'ー' || cs[j] === ' ')) { all = false; break; }
        if (out.length && all) out[out.length - 1] += ls[i]; else out.push(ls[i]);
    }
    return out.join('\r');
}
function awza_linesOf(t, L) { var s = jzTrim(String(t || '')), n = jzChars(s).length; return L <= 1 ? s : awza_splitL(s, Math.ceil(n / L)); }
function awza_toLines(t, L) { var a = awza_linesOf(t, L).split('\r'), o = [], i; for (i = 0; i < a.length; i++) if (jzTrim(a[i]).length) o.push(a[i]); return o.length ? o : [jzTrim(String(t || '')) || ' ']; }
// the line count (1..maxL) that gives the biggest type inside a box (horizontal setting)
function awza_fitBox(text, bw, bh, track, lead, maxL) {
    var t = jzTrim(String(text || '')), n = jzChars(t).length, best = null, L;
    for (L = 1; L <= Math.min(maxL || 4, Math.max(1, n)); L++) {
        var tt = awza_linesOf(t, L);
        if (tt.split('\r').length < L && best) continue;
        var m = awza_meas(tt, track, lead), s = Math.min(bw / m.w, bh / m.h);
        if (!best || s > best.size * 1.04) best = { text: tt, size: s };
    }
    return best || { text: t || ' ', size: 10 };
}
// make a text layer the lyric: ride on a kit (optional), take the cut's enter / hold / exit and treatment
function awza_lyric(ctx, g, L, mi, noHold) {
    if (g) awza_parent(L, g.S);
    AWZA_LYR.push(L);
    jzAnimate(ctx, L, { mi: mi || 0, noHold: !!noHold });
    return jzBB(L);
}
// the lyric fitted into a box centred on (x, y): the browser's fitMain (o: { lead, track })
function awza_fitMain(ctx, g, text, font, x, y, bw, bh, color, o, maxL, cap, mi, noHold) {
    o = o || {};
    bw = Math.max(10, bw); bh = Math.max(10, bh);
    var lead = o.lead || 1.2, track = o.track == null ? 0.02 : o.track, f = awza_fitBox(text, bw, bh, track, lead, maxL || 3);
    var nl = f.text.split('\r').length, hEm = 1 + (nl - 1) * lead;
    var L = jzText(ctx, f.text, { font: font, size: 100, color: color, x: x, y: y, track: track, leading: nl > 1 ? 100 * lead : null, name: jzFlat(text) });
    var r = jzRect(L), size = Math.max(4, Math.min(bw / Math.max(1, r.width) * 100, bh / hEm, cap || 1e9));
    jzTextDoc(L, function (td) { td.fontSize = size; if (nl > 1) { try { td.autoLeading = false; td.leading = size * lead; } catch (e) {} } });
    jzAnchor(L);
    return awza_lyric(ctx, g, L, mi, noHold);
}
/* vertical setting: one text layer per column (one glyph per line), columns right -> left.
   Browser VO = { vertical, lead 1.35 (column pitch), track 0.06 (between glyphs) } */
function awza_vH(n, track) { return Math.max(1, n) * (1 + track) - track; }                 // column height in em
function awza_vFit(str, bw, bh, track) { return Math.min(bw, bh / awza_vH(jzCount(str), track)); }   // the browser's fitSize for one column
// columns (1..maxC) chosen for the biggest type: { cols, size }
function awza_fitV(text, bw, bh, maxC, track, lead) {
    var t = jzFlat(text), n = jzChars(t).length, best = null, C, i;
    track = track == null ? 0.06 : track; lead = lead || 1.35;
    for (C = 1; C <= Math.min(maxC || 2, Math.max(1, n)); C++) {
        var cs = awza_toLines(t, C), per = 1;
        if (cs.length < C && best) continue;
        for (i = 0; i < cs.length; i++) per = Math.max(per, jzCount(cs[i]));
        var s = Math.min(bw / (1 + (cs.length - 1) * lead), bh / awza_vH(per, track));
        if (!best || s > best.size * 1.04) best = { cols: cs, size: s };
    }
    return best || { cols: [t || ' '], size: 10 };
}
// one column as a text layer (not animated yet); returns the layer, anchored at its centre
function awza_col(ctx, str, font, size, color, x, y, track) {
    var v = jzVertical(str) || ' ';
    return jzText(ctx, v, { font: font, size: Math.max(2, size), color: color, x: x, y: y, leading: Math.max(2, size) * (1 + (track == null ? 0.06 : track)), name: jzStrip(str) });
}
// shrink a column that came out larger than its box (AE's own measure), keep it centred on its position
function awza_colFit(L, maxW, maxH) {
    var s = jzSize(L), k = Math.min(1, maxW / Math.max(1, s[0]), maxH / Math.max(1, s[1]));
    if (k < 0.985) { jzTextDoc(L, function (td) { var fs = td.fontSize * k; td.fontSize = Math.max(1, fs); try { td.autoLeading = false; td.leading = td.leading * k; } catch (e) {} }); jzAnchor(L); }
    return L;
}
// columns as lyric layers; the block is centred on (x, y), columns hang from the block's top. Returns the bbox.
function awza_drawV(ctx, g, cols, font, size, x, y, color, mi, noHold, track, lead, maxH) {
    var nc = cols.length, Ls = [], hs = [], mh = 0, i, bb = null;
    track = track == null ? 0.06 : track; lead = lead || 1.35;
    for (i = 0; i < nc; i++) {
        var L = awza_col(ctx, cols[i], font, size, color, x + ((nc - 1) / 2 - i) * size * lead, y, track);
        awza_colFit(L, size * 1.3, maxH || 1e9);
        var h = jzSize(L)[1]; Ls.push(L); hs.push(h); mh = Math.max(mh, h);
    }
    for (i = 0; i < nc; i++) {
        var p = jzXf(Ls[i], 'ADBE Position').value;
        jzXf(Ls[i], 'ADBE Position').setValue([p[0], y - mh / 2 + hs[i] / 2]);
        bb = jzUnion(bb, awza_lyric(ctx, g, Ls[i], mi, noHold));
    }
    return bb;
}
// the browser's fitMainV: columns chosen for the biggest type, centred on (x, y)
function awza_fitMainV(ctx, g, text, font, x, y, bw, bh, color, maxC, cap, mi, noHold) {
    var f = awza_fitV(text, bw, bh, maxC || 2);
    return awza_drawV(ctx, g, f.cols, font, Math.min(f.size, cap || 1e9), x, y, color, mi, noHold, 0.06, 1.35, bh);
}

/* ---------------------------------------------------------------- the drawing kit
   o: { cx, cy   pivot of the pose (default: comp centre)
        H        expression header (default: awza_H — jzTH + helpers), X: code put after it (shared variables)
        a        expression (0..1) for the layer's alpha, default 'K' (follows the cut's exit)
        pose     { dx, dy, s, rot } expressions — the browser's pose();  rotv static rotation (deg) }
   shape calls take a static alpha k and an optional animation object:
        { org:[x,y] | from:'l'|'r'|'t'|'b'   origin of the group (scale / rotation centre)
          s, sx, sy, rot, dx, dy, a           expressions (factors, degrees, px, 0..1);  rotv static rotation (deg)
          trim / trim0   expressions 0..1 (Trim Paths end / start)
          shape / shapes expression code that fills `var p` (points relative to org) -> createPath
          rE  ellipse radius expression, swE stroke width expression, cap (2 round, 3 square)
          rep [[copies, dx, dy, offset], …] Repeaters, X code put in front of every expression of the call
          (the X of a g.sub() is also seen by the calls nested in it) } */
function awza_kit(ctx, name, o) {
    o = o || {};
    var cx = o.cx == null ? ctx.W / 2 : o.cx, cy = o.cy == null ? ctx.H / 2 : o.cy, p = o.pose || {};
    var S = jzShapeLayer(ctx, name, cx, cy);
    jzXf(S, 'ADBE Anchor Point').setValue([cx, cy]);
    var g = { ctx: ctx, S: S, H: (o.H || awza_H(ctx)) + (o.X || ''), a: o.a || 'K', root: [], stack: [], cx: cx, cy: cy };
    g.cur = g.root;
    if (o.rotv) jzXf(S, 'ADBE Rotate Z').setValue(o.rotv);
    if (p.dx || p.dy) jzSetExpr(jzXf(S, 'ADBE Position'), g.H + '[value[0]+(' + (p.dx || '0') + '),value[1]+(' + (p.dy || '0') + ')]');
    if (p.s) jzSetExpr(jzXf(S, 'ADBE Scale'), g.H + 'var s=' + p.s + ';[value[0]*s,value[1]*s]');
    if (p.rot) jzSetExpr(jzXf(S, 'ADBE Rotate Z'), g.H + 'value+(' + p.rot + ')');
    jzSetExpr(jzXf(S, 'ADBE Opacity'), g.H + '100*cl(' + g.a + ')');
    g.r = function (x, y, w, h, c, k, an) { awza_op(g, { t: 'rect', list: [[x, y, w, h]], rad: 0, fill: c, k: k, o: an }); };
    g.rr = function (x, y, w, h, rad, c, k, an) { awza_op(g, { t: 'rect', list: [[x, y, w, h]], rad: rad, fill: c, k: k, o: an }); };
    g.rs = function (x, y, w, h, rad, c, lw, k, an) { awza_op(g, { t: 'rect', list: [[x, y, w, h]], rad: rad, stroke: c, sw: lw, k: k, o: an }); };
    g.mr = function (list, c, k, an) { if (list.length) awza_op(g, { t: 'rect', list: list, rad: 0, fill: c, k: k, o: an }); };
    g.c = function (x, y, r, c, k, an) { awza_op(g, { t: 'ell', list: [[x, y, r, r]], fill: c, k: k, o: an }); };
    g.cs = function (x, y, r, c, lw, k, an) { awza_op(g, { t: 'ell', list: [[x, y, r, r]], stroke: c, sw: lw, k: k, o: an }); };
    g.e = function (x, y, rx, ry, c, k, an) { awza_op(g, { t: 'ell', list: [[x, y, rx, ry]], fill: c, k: k, o: an }); };
    g.es = function (x, y, rx, ry, c, lw, k, an) { awza_op(g, { t: 'ell', list: [[x, y, rx, ry]], stroke: c, sw: lw, k: k, o: an }); };
    g.mc = function (list, c, k, an) { var q = [], i; for (i = 0; i < list.length; i++) q.push([list[i][0], list[i][1], list[i][2], list[i][2]]); if (q.length) awza_op(g, { t: 'ell', list: q, fill: c, k: k, o: an }); };
    g.l = function (x0, y0, x1, y1, c, lw, k, an) { awza_op(g, { t: 'path', list: [[[x0, y0], [x1, y1]]], closed: false, stroke: c, sw: lw, k: k, o: an }); };
    g.pl = function (pts, c, lw, k, an) { awza_op(g, { t: 'path', list: [pts], closed: false, stroke: c, sw: lw, k: k, o: an }); };
    g.ml = function (list, c, lw, k, an) { if (list.length) awza_op(g, { t: 'path', list: list, closed: false, stroke: c, sw: lw, k: k, o: an }); };
    g.p = function (pts, c, k, an) { awza_op(g, { t: 'path', list: [pts], closed: true, fill: c, k: k, o: an }); };
    g.mp = function (list, c, k, an) { if (list.length) awza_op(g, { t: 'path', list: list, closed: true, fill: c, k: k, o: an }); };
    g.ps = function (pts, c, lw, k, an) { awza_op(g, { t: 'path', list: [pts], closed: true, stroke: c, sw: lw, k: k, o: an }); };
    g.sub = function (an) { var q = { t: 'sub', ch: [], o: an || {}, k: an && an.k != null ? an.k : 1, org: an && an.org ? an.org : [0, 0] }; g.cur.push(q); g.stack.push(g.cur); g.cur = q.ch; };
    g.end = function () { if (g.stack.length) g.cur = g.stack.pop(); };
    g.t = function (text, x, y, lo) { return awza_label(g, text, x, y, lo); };
    g.done = function () { awza_flush(g); return g; };
    return g;
}
function awza_op(g, q) {
    var k = q.k == null ? 1 : Math.min(1, q.k), o = q.o || {}, f = o.from, a, i, ok = [];
    if (!(k > 0.003)) return;
    q.k = k; q.o = o;
    if (q.t === 'rect') {
        for (i = 0; i < q.list.length; i++) if (q.list[i][2] > 0 && q.list[i][3] > 0) ok.push(q.list[i]);
        if (!ok.length) return;
        q.list = ok; a = ok[0];
        q.org = o.org ? o.org : (f === 'l' ? [a[0], a[1] + a[3] / 2] : (f === 'r' ? [a[0] + a[2], a[1] + a[3] / 2] : (f === 't' ? [a[0] + a[2] / 2, a[1]] : (f === 'b' ? [a[0] + a[2] / 2, a[1] + a[3]] : [a[0] + a[2] / 2, a[1] + a[3] / 2]))));
    } else if (q.t === 'ell') {
        for (i = 0; i < q.list.length; i++) if (q.list[i][2] > 0 && q.list[i][3] > 0) ok.push(q.list[i]);
        if (!ok.length) return;
        q.list = ok; q.org = o.org ? o.org : [ok[0][0], ok[0][1]];
    } else {
        for (i = 0; i < q.list.length; i++) if (q.list[i] && q.list[i].length > (q.closed ? 2 : 1)) ok.push(q.list[i]);
        if (!ok.length) return;
        q.list = ok; q.org = o.org ? o.org : [0, 0];
    }
    g.cur.push(q);
}
function awza_flush(g) {
    for (var i = g.root.length - 1; i >= 0; i--) {
        try { awza_emit(g, null, g.root[i], i, 0, 0, ''); } catch (e) { jzWarn('x2waA shape: ' + e.toString()); }
    }
    g.root = []; g.cur = g.root; g.stack = [];
}
// one drawing call -> one shape group (each item is fully set up before its next sibling is added)
function awza_emit(g, par, q, idx, bx, by, hx) {
    var o = q.o || {}, H = g.H + hx + (o.X || ''), ox = q.org[0], oy = q.org[1], i, j, it, a, gr;
    if (par) { gr = jzVecs(par).addProperty('ADBE Vector Group'); try { gr.name = q.t + ' ' + (idx + 1); } catch (e0) {} }
    else gr = jzGrp(g.S, q.t + ' ' + (idx + 1));
    if (q.t === 'sub') {
        for (i = q.ch.length - 1; i >= 0; i--) awza_emit(g, gr, q.ch[i], i, ox, oy, hx + (o.X || ''));
    } else if (q.t === 'rect') {
        for (i = 0; i < q.list.length; i++) { a = q.list[i]; jzAddRect(gr, Math.max(0.5, a[2]), Math.max(0.5, a[3]), Math.max(0, Math.min(q.rad || 0, a[2] / 2, a[3] / 2)), a[0] + a[2] / 2 - ox, a[1] + a[3] / 2 - oy); }
    } else if (q.t === 'ell') {
        for (i = 0; i < q.list.length; i++) {
            a = q.list[i];
            it = jzAddEllipse(gr, Math.max(0.5, a[2] * 2), Math.max(0.5, a[3] * 2), a[0] - ox, a[1] - oy);
            if (o.rE) jzSetExpr(it.property('ADBE Vector Ellipse Size'), H + 'var r=Math.max(0.25,' + o.rE + ');[2*r,2*r]');
        }
    } else {
        for (i = 0; i < q.list.length; i++) {
            var pts = [], sx = o.shapes ? o.shapes[i] : (i === 0 ? o.shape : null);
            for (j = 0; j < q.list[i].length; j++) pts.push([q.list[i][j][0] - ox, q.list[i][j][1] - oy]);
            it = jzAddPath(gr, pts, q.closed);
            if (sx) jzSetExpr(it.property('ADBE Vector Shape'), H + sx + ';createPath(p,[],[],' + (q.closed ? 'true' : 'false') + ')');
        }
    }
    if (q.stroke) {
        it = jzAddStroke(gr, q.stroke, Math.max(0.3, q.sw || 1));
        if (o.cap) { try { it.property('ADBE Vector Stroke Line Cap').setValue(o.cap); it.property('ADBE Vector Stroke Line Join').setValue(o.cap === 2 ? 2 : 1); } catch (e1) {} }
        if (o.swE) jzSetExpr(it.property('ADBE Vector Stroke Width'), H + 'Math.max(0.1,' + o.swE + ')');
    }
    if (q.fill) jzAddFill(gr, q.fill);
    if (o.trim || o.trim0) {
        it = jzVecs(gr).addProperty('ADBE Vector Filter - Trim');
        if (o.trim) jzSetExpr(it.property('ADBE Vector Trim End'), H + '100*cl(' + o.trim + ')');
        if (o.trim0) jzSetExpr(it.property('ADBE Vector Trim Start'), H + '100*cl(' + o.trim0 + ')');
    }
    if (o.rep) {
        for (i = 0; i < o.rep.length; i++) {
            var V = jzVecs(gr), ix = V.addProperty('ADBE Vector Filter - Repeater').propertyIndex;
            V.property(ix).property('ADBE Vector Repeater Copies').setValue(Math.max(1, Math.round(o.rep[i][0])));
            if (o.rep[i][3]) V.property(ix).property('ADBE Vector Repeater Offset').setValue(o.rep[i][3]);
            V.property(ix).property('ADBE Vector Repeater Transform').property('ADBE Vector Repeater Position').setValue([o.rep[i][1], o.rep[i][2]]);
        }
    }
    var tg = jzGX(gr), rv = o.rotv || 0, px = ox - bx, py = oy - by;
    tg.property('ADBE Vector Position').setValue([px, py]);
    if (o.dx || o.dy) jzSetExpr(tg.property('ADBE Vector Position'), H + '[' + jzN(px) + '+(' + (o.dx || '0') + '),' + jzN(py) + '+(' + (o.dy || '0') + ')]');
    if (o.s || o.sx || o.sy) jzSetExpr(tg.property('ADBE Vector Scale'), H + 'var s=' + (o.s || '1') + ';[100*s*(' + (o.sx || '1') + '),100*s*(' + (o.sy || '1') + ')]');
    if (rv) tg.property('ADBE Vector Rotation').setValue(rv);
    if (o.rot) jzSetExpr(tg.property('ADBE Vector Rotation'), H + jzN(rv) + '+(' + o.rot + ')');
    if (q.k < 0.999) tg.property('ADBE Vector Group Opacity').setValue(q.k * 100);
    if (o.a) jzSetExpr(tg.property('ADBE Vector Group Opacity'), H + jzN(q.k * 100) + '*cl(' + o.a + ')');
}
// small text riding on the kit; lo: { color, size, align, track, font, alpha, a (expr) }
function awza_label(g, text, x, y, lo) {
    lo = lo || {};
    text = String(text);
    var al = lo.alpha == null ? 1 : Math.min(1, lo.alpha), ctx = g.ctx;
    if (!text.length || al <= 0.003) return null;
    var L = jzText(ctx, text, { font: lo.font || jzSerifF(ctx), size: Math.max(2, lo.size || 20), color: lo.color || ctx.sc.sub, x: x, y: y, align: lo.align || 'center', track: lo.track == null ? 0.08 : lo.track });
    awza_parent(L, g.S);
    jzSetExpr(jzXf(L, 'ADBE Opacity'), g.H + jzN(al * 100) + '*cl(' + g.a + ')' + (lo.a ? '*cl(' + lo.a + ')' : ''));
    return L;
}
// layer mask in layer (== comp) coordinates: static points, or an expression that fills `var p` (optionally `ti` / `to` tangents)
function awza_mask(g, pts, ex) {
    var m = g.S.property('ADBE Mask Parade').addProperty('ADBE Mask Atom'), sh = new Shape();
    sh.vertices = pts; sh.closed = true;
    m.property('ADBE Mask Shape').setValue(sh);
    if (ex) jzSetExpr(m.property('ADBE Mask Shape'), g.H + ex);
    return m;
}
function awza_maskEll(g, cx, cy, rx, ry) {
    var m = g.S.property('ADBE Mask Parade').addProperty('ADBE Mask Atom');
    m.property('ADBE Mask Shape').setValue(awza_ellShape(cx, cy, rx, ry));
    return m;
}
// register a layout: every layer of the build except the lyric is main-pass only (the browser draws them with ghost off)
function awza_reg(key, def) {
    var b = def.build;
    def.build = function (ctx) {
        AWZA_LYR = [];
        var bb = b(ctx), keep = {}, i;
        for (i = 0; i < AWZA_LYR.length; i++) { try { keep[AWZA_LYR[i].index] = 1; } catch (e) {} }
        for (i = 1; i <= ctx.comp.numLayers; i++) if (!keep[i]) jzNoGhost(ctx.comp.layer(i));
        AWZA_LYR = [];
        return bb || awza_box(ctx.W * 0.35, ctx.H * 0.4, ctx.W * 0.65, ctx.H * 0.6);
    };
    jzReg('layout', key, def);
}

/* ================================================================== 1 wzByobu — 屏風
   a zigzag folding screen that unfolds from the middle; the line runs across all panels.
   AE: every panel (fill + rim) is a createPath expression on the browser's fold formula. */
awza_reg('wzByobu', {
    plan: function (rng, cut, st) { return { font: awza_fontPick(rng, st), n: rng.pick([4, 6, 6]), look: rng.pick(['gold', 'plain', 'hills']), sun: rng.chance(0.5) }; },
    build: function (ctx) {
        var b = awza_base(ctx), W = b.W, H = b.H, sc = b.sc, M = b.M, port = b.port, lw = b.lw, i, j;
        var n = port ? 4 : jzP(ctx, 'n', 6), sw = W * (port ? 0.92 : 0.86), sh = port ? H * 0.44 : H * 0.6, cx = W / 2, cy = H / 2;
        var C = awza_card(sc), look = jzP(ctx, 'look', 'plain'), gold = look === 'gold';
        var fill = gold ? jzMixHex(awza_plate(sc, [sc.accent, sc.accent2, sc.fg], sc.bg, 1.3), C.fill, 0.35) : C.fill;
        var ink = awza_on(sc, fill), shade = jzMixHex(fill, ink, 0.13), rim = jzMixHex(fill, ink, 0.82), faint = jzMixHex(fill, ink, 0.17);
        var F = M * 0.02, rw = M * 0.007, X = [], T = [], B = [];
        for (j = 0; j <= n; j++) { var kk = (j % 2 ? 1 : -1) * F; X.push(cx - sw / 2 + sw * j / n); T.push(cy - sh / 2 - kk); B.push(cy + sh / 2 + kk); }
        var XX = 'var op=ioc(time/0.55)*(1-ioc(PO/0.9)),ww=' + jzN(sw) + '*(0.1+0.9*op),fo=' + jzN(F) + '*(3.2-2.2*op);' +
            'function PX(j){return ' + jzN(cx) + '-ww/2+ww*j/' + n + ';}' +
            'function PT(j){return ' + jzN(cy - sh / 2) + '-((j%2)?1:-1)*fo;}function PB(j){return ' + jzN(cy + sh / 2) + '+((j%2)?1:-1)*fo;}' +
            'function PN(i){return [[PX(i),PT(i)],[PX(i+1),PT(i+1)],[PX(i+1),PB(i+1)],[PX(i),PB(i)]];}\n';
        var g = awza_kit(ctx, 'byobu', { a: 'inC(0.15)*(1-cl((PO-0.75)/0.25))', X: XX });
        function panel(i) { return [[X[i], T[i]], [X[i + 1], T[i + 1]], [X[i + 1], B[i + 1]], [X[i], B[i]]]; }
        for (i = 0; i < n; i++) g.p(panel(i), i % 2 ? shade : fill, 1, { shape: 'var p=PN(' + i + ')' });
        // paper decoration: laid out at rest, squeezed sideways with the screen
        var lines = [], hills = [], ins = rw * 0.5;
        for (i = 0; i < n; i++) {
            if (gold) {
                for (j = 1; j <= 2; j++) lines.push([[X[i] + ins, awza_lerp(T[i], B[i], j / 3)], [X[i + 1] - ins, awza_lerp(T[i + 1], B[i + 1], j / 3)]]);
                lines.push([[(X[i] + X[i + 1]) / 2, (T[i] + T[i + 1]) / 2], [(X[i] + X[i + 1]) / 2, (B[i] + B[i + 1]) / 2]]);
            }
            if (look === 'hills') {
                var h0 = B[i] - sh * (0.08 + 0.2 * awza_r01(b.seed, i, 7)), h1 = B[i + 1] - sh * (0.08 + 0.2 * awza_r01(b.seed, i + 1, 7)), hm = Math.min(h0, h1) - sh * 0.07 * awza_r01(b.seed, i, 9);
                hills.push([[X[i] + ins, h0], [(X[i] + X[i + 1]) / 2, hm], [X[i + 1] - ins, h1], [X[i + 1] - ins, B[i + 1]], [X[i] + ins, B[i]]]);
            }
        }
        g.sub({ org: [cx, cy], sx: '0.1+0.9*op' });
        g.ml(lines, faint, lw * 1.5);
        g.mp(hills, faint);
        g.end();
        if (jzP(ctx, 'sun', false) && !gold) g.c(awza_lerp(X[0], X[n], 0.82), cy - sh * 0.33, sh * 0.065, C.acc, 0.85, { s: 'op', dx: jzN(sw * 0.32 * 0.9) + '*(op-1)' });
        for (i = 0; i < n; i++) g.ps(panel(i), rim, rw, 1, { shape: 'var p=PN(' + i + ')' });
        g.done();
        return awza_fitMain(ctx, null, b.txt, b.font, cx, cy, sw * 0.84, sh * 0.5, ink, null, port ? 3 : 2, sh * 0.4, awza_mi(ctx, 0.3));
    }
});

/* ================================================================== 2 wzNobori — のぼり旗
   tall banner flags on poles; one column of the line per flag, the cloth edge flutters (createPath) */
awza_reg('wzNobori', {
    plan: function (rng, cut, st) { return { font: awza_fontPick(rng, st, true), multi: rng.chance(0.7), col: rng.pick(['accent', 'ink', 'paper']), sway: rng.range(0.7, 1.3), band: rng.chance(0.6) }; },
    build: function (ctx) {
        var b = awza_base(ctx), W = b.W, H = b.H, sc = b.sc, M = b.M, port = b.port, k, s;
        var t0 = jzFlat(b.txt), n = jzCount(t0), multi = !!jzP(ctx, 'multi', true);
        var want = port ? (n > 10 && multi ? 2 : 1) : (!multi ? 1 : (n <= 3 ? 1 : (n <= 9 ? 2 : 3)));
        var parts = want === 1 ? [t0] : awza_toLines(t0, want), nb = parts.length, ltr = jzHasLatin(t0);
        var bh = H * 0.78, y0 = H * 0.1, gap = M * 0.07, tk = M * 0.012;
        var bw = nb === 1 ? Math.min(W * 0.44, bh * 0.36) : Math.min((W * 0.86 - gap * (nb - 1)) / nb, bh * 0.27);
        var tot = nb * bw + (nb - 1) * gap, C = awza_card(sc), col = jzP(ctx, 'col', 'accent'), sway = jzP(ctx, 'sway', 1);
        var pap = jzContrast(C.fill, sc.bg) >= 1.3 ? C.fill : awza_plate(sc, [sc.fg, sc.ink, sc.sub], sc.bg, 1.3);
        var cA = col === 'paper' ? pap : awza_plate(sc, col === 'accent' ? [sc.accent, sc.ink, sc.fg] : [sc.ink, sc.accent, sc.fg]);
        var cB = col === 'paper' ? awza_plate(sc, awza_without([sc.accent, sc.ink, sc.fg], pap)) : (pap === cA ? awza_plate(sc, awza_without([sc.accent, sc.ink, sc.sub], cA)) : pap), pole = awza_wood(sc);
        var g = awza_kit(ctx, 'nobori', { a: 'inC(0.15)*K' }), bb = null, todo = [];
        for (k = 0; k < nb; k++) {
            var i = ltr ? k : nb - 1 - k, xl = (W - tot) / 2 + i * (bw + gap) + tk, xr = xl + bw - tk, E = awza_inE(0.55, k * 0.09), fill = k % 2 ? cB : cA, on = awza_on(sc, fill);
            var pts = [[xl, y0]], loops = [], tabs = [];
            for (s = 0; s <= 10; s++) pts.push([xr, y0 + bh * s / 10]);
            pts.push([xl, y0 + bh]);
            g.r(xl - tk * 2.2, y0 - M * 0.045, tk, H, pole, 1, { dy: '(1-' + awza_inE(0.45, k * 0.07) + ')*' + jzN(H * 0.99 - (y0 - M * 0.045)) });
            g.r(xl - tk * 2.2, y0 - tk * 1.6, bw + tk * 1.2, tk * 0.8, pole, 1, { from: 'l', sx: E });
            g.c(xl - tk * 1.7, y0 - M * 0.045, tk * 1.1, pole, 1, { s: E });
            g.sub({ org: [xl, y0], sy: E });
            g.p(pts, fill, 1, { shape: 'var p=[[' + jzN(xl) + ',' + jzN(y0) + ']];for(var s=0;s<=10;s++)p.push([' + jzN(xr) + '+Math.sin(time*' + jzN(1.7 * sway) + '+s*0.75+' + jzN(k * 1.3) + ')*' + jzN(bw * 0.035) + '*MO*(s/10),' + jzN(y0) + '+' + jzN(bh) + '*s/10]);p.push([' + jzN(xl) + ',' + jzN(y0 + bh) + '])' });
            for (s = 0; s < 6; s++) loops.push([xl - tk * 2.6, y0 + bh * (s + 0.5) / 6 - tk * 0.9, tk * 2.8, tk * 1.8]);
            g.mr(loops, fill);
            if (jzP(ctx, 'band', false)) { g.r(xl, y0 + bh * 0.045, bw - tk * 1.6, bh * 0.012, on, 0.85); g.r(xl, y0 + bh * 0.925, bw - tk * 1.6, bh * 0.03, on, 0.85); }
            g.end();
            for (s = 0; s < 3; s++) tabs.push([xl + (bw - tk) * (s + 0.5) / 3 - tk * 0.9, y0 - tk * 2.2, tk * 1.8, tk * 2.6]);
            g.sub({ org: [xl, y0], sx: E }); g.mr(tabs, fill); g.end();
            todo.push([parts[k], (xl + xr) / 2 - tk * 0.3, on, (nb === 1 || jzCount(parts[k]) > 6) ? 2 : 1, awza_mi(ctx, 0.18 + k * 0.1, k)]);
        }
        g.done();
        for (k = 0; k < todo.length; k++) bb = jzUnion(bb, awza_fitMainV(ctx, null, todo[k][0], b.font, todo[k][1], y0 + bh * 0.49, bw * 0.66, bh * 0.76, todo[k][2], todo[k][3], bw * 0.6, todo[k][4]));
        return bb;
    }
});

/* ================================================================== 3 wzSenjafuda — 千社札
   votive name stickers: tall double-framed slips slapped on one after another (one kit per slip) */
awza_reg('wzSenjafuda', {
    plan: function (rng, cut, st) { return { font: awza_fontPick(rng, st, true), inv: rng.chance(0.5), tilt: [rng.range(-4, 4), rng.range(-4, 4), rng.range(-4, 4)], dy: [rng.range(-1, 1), rng.range(-1, 1), rng.range(-1, 1)], head: rng.chance(0.7) }; },
    build: function (ctx) {
        var b = awza_base(ctx), W = b.W, H = b.H, sc = b.sc, M = b.M, port = b.port, j;
        var t0 = jzFlat(b.txt), n = jzCount(t0), want = n <= 3 ? 1 : (n <= 8 ? 2 : (port ? 2 : 3));
        var parts = awza_toLines(t0, want), k = parts.length, ltr = jzHasLatin(t0);
        var sh = H * (port ? 0.6 : 0.74), gap = M * 0.03, sw = Math.min(sh * 0.36, (W * 0.86 - gap * (k - 1)) / k), tot = k * sw + (k - 1) * gap;
        var C = awza_card(sc), tilt = jzP(ctx, 'tilt', [0, 0, 0]), dys = jzP(ctx, 'dy', [0, 0, 0]), bb = null;
        for (j = 0; j < k; j++) {
            var i = ltr ? j : k - 1 - j, cx = (W - tot) / 2 + i * (sw + gap) + sw / 2, cy = H / 2 + (dys[j % 3] || 0) * H * 0.025;
            var inv = jzP(ctx, 'inv', false) && j % 2 === 1, fill = inv ? C.text : C.fill, ink = inv ? C.fill : C.text, acc = awza_plate(sc, [sc.accent, sc.accent2], fill, 1.8);
            var x0 = cx - sw / 2, y0 = cy - sh / 2, bd = sw * 0.05, hd = jzP(ctx, 'head', true) ? sw * 0.5 : 0;
            var g = awza_kit(ctx, 'senjafuda ' + (j + 1), { cx: cx, cy: cy, rotv: tilt[j % 3] || 0, X: 'var e=' + awza_inB(0.38, j * 0.14, 1.6) + ';', a: 'cl(e*2.5)*K', pose: { s: '1.35-0.35*e' } });
            g.r(x0 + M * 0.008, y0 + M * 0.01, sw, sh, jzDarkest(sc), 0.3);
            g.r(x0, y0, sw, sh, fill);
            g.rs(x0 + bd, y0 + bd, sw - bd * 2, sh - bd * 2, 0, ink, bd * 0.7);
            g.rs(x0 + bd * 2.1, y0 + bd * 2.1, sw - bd * 4.2, sh - bd * 4.2, 0, ink, Math.max(1, bd * 0.16));
            if (hd) g.r(x0 + bd * 2.1, y0 + bd * 2.1, sw - bd * 4.2, hd, j === 0 ? acc : ink);
            g.done();
            if (hd) g.t(j === 0 ? awza_kanjiNum(b.no) : '・', cx, y0 + bd * 2.1 + hd / 2, { size: hd * 0.52, color: awza_on(sc, j === 0 ? acc : ink), track: 0 });
            var ty = y0 + bd * 2.1 + hd, th = sh - bd * 4.2 - hd;
            bb = jzUnion(bb, awza_fitMainV(ctx, g, parts[j], b.font, cx, ty + th / 2, sw * 0.6, th * 0.88, ink, 1, sw * 0.62, awza_mi(ctx, j * 0.14 + 0.08, j), true));
        }
        return bb;
    }
});

/* ================================================================== 4 wzAndon — 行灯
   a box lamp with paper sides that flickers on; the line is written on the lit paper.
   AE: the halo is a blurred ellipse, the lit paper a second sheet whose opacity is the flickering light. */
awza_reg('wzAndon', {
    plan: function (rng, cut, st) { return { font: awza_fontPick(rng, st), kind: rng.pick(['floor', 'floor', 'hang']), bars: rng.int(5, 8) }; },
    build: function (ctx) {
        var b = awza_base(ctx), W = b.W, H = b.H, sc = b.sc, M = b.M, port = b.port, i, s;
        var kind = jzP(ctx, 'kind', 'floor'), ww = port ? W * 0.72 : Math.min(W * 0.62, H * 1.15), hh = H * (port ? 0.46 : 0.5), cx = W / 2, cy = H * (kind === 'hang' ? 0.53 : 0.47), x0 = cx - ww / 2, y0 = cy - hh / 2;
        var C = awza_card(sc), wood = awza_wood(sc), ink = awza_on(sc, C.fill), fw = M * 0.016;
        var LIT = 'var kq=cl(time/0.6),lit=oc(kq)*((kq<0.75&&hh(Math.floor(time*12)*1.7+SD)<0.3)?0.45:1)*(0.94+0.06*n1(time*3,SD))*(1-ic(PO)),ga=inC(0.2)*(1-cl((PO-0.6)/0.4));';
        var R = Math.max(ww, hh) * 0.95;
        var glow = awza_kit(ctx, 'andon glow', { cx: cx, cy: cy, X: LIT, a: 'ga*lit*0.9' });
        glow.e(cx, cy, R * 0.62, R * 0.62, C.acc, 0.3); glow.done();
        var bl = jzEffect(glow.S, 'ADBE Gaussian Blur 2', 'JZ Lamp Glow'); jzEP(bl, 1, R * 0.4); jzEP(bl, 3, 0);
        var g = awza_kit(ctx, 'andon', { cx: cx, cy: cy, X: LIT + 'var e=inE(0.45);', a: 'ga', pose: { s: '0.95+0.05*e', dy: '(1-e)*' + jzN(M * 0.025) } });
        awza_parent(glow.S, g.S);
        g.r(x0, y0, ww, hh, jzMixHex(C.fill, sc.bg, 0.55));
        g.r(x0, y0, ww, hh, C.fill, 1, { a: 'lit' });
        // frame, rails with short lattice bars
        var rl = hh * 0.1, nbar = jzP(ctx, 'bars', 6) * (port ? 1 : 2), bars = [];
        g.mr([[x0, y0 + rl - fw * 0.25, ww, fw * 0.5], [x0, y0 + hh - rl - fw * 0.25, ww, fw * 0.5]], wood);
        for (i = 1; i < nbar; i++) { var xx = x0 + ww * i / nbar - fw * 0.2; bars.push([xx, y0, fw * 0.4, rl]); bars.push([xx, y0 + hh - rl, fw * 0.4, rl]); }
        g.mr(bars, wood);
        g.mr([[x0 - fw, y0 - fw, fw, hh + fw * 2], [x0 + ww, y0 - fw, fw, hh + fw * 2], [x0 - fw * 2.6, y0 - fw * 2.4, ww + fw * 5.2, fw * 1.8], [x0 - fw * 2, y0 + hh + fw * 0.4, ww + fw * 4, fw * 1.6]], wood);
        if (kind === 'hang') {
            g.pl([[x0 + ww * 0.12, y0 - fw * 2.4], [cx, y0 - fw * 2.4 - hh * 0.2], [x0 + ww * 0.88, y0 - fw * 2.4]], wood, fw * 0.45);
            g.l(cx, y0 - fw * 2.4 - hh * 0.2, cx, -M * 0.05, wood, fw * 0.3);
        } else {
            var legs = [];
            for (s = -1; s <= 1; s += 2) { var lx = cx + s * ww * 0.4; legs.push([[lx - fw * 0.8, y0 + hh + fw * 2], [lx + fw * 0.8, y0 + hh + fw * 2], [lx + s * fw * 1.6 + fw * 0.7, y0 + hh + hh * 0.2], [lx + s * fw * 1.6 - fw * 0.7, y0 + hh + hh * 0.2]]); }
            g.mp(legs, wood);
        }
        g.done();
        return awza_fitMain(ctx, g, b.txt, b.font, cx, cy, ww * 0.86, hh * 0.6, ink, null, port ? 4 : 2, hh * 0.42, awza_mi(ctx, 0.25));
    }
});

/* ================================================================== 5 wzShikishi — 色紙
   a square poem card; the columns are "scatter-written" at staggered heights */
awza_reg('wzShikishi', {
    plan: function (rng, cut, st) { return { font: awza_fontPick(rng, st), flow: rng.pick(['down', 'up', 'wave']), tilt: rng.range(-2, 2), deco: rng.pick(['flecks', 'band', 'flecks']), seal: rng.chance(0.75) }; },
    build: function (ctx) {
        var b = awza_base(ctx), W = b.W, H = b.H, sc = b.sc, M = b.M, i;
        var S = Math.min(W * 0.88, H * 0.84), cx = W / 2, cy = H / 2, x0 = cx - S / 2, y0 = cy - S / 2, C = awza_card(sc);
        var t0 = jzFlat(b.txt), n = jzCount(t0), L = n <= 3 ? 1 : (n <= 6 ? 2 : (n <= 11 ? 3 : 4)), cols = awza_toLines(t0, L), k = cols.length;
        var size = S * (k === 1 ? 0.27 : 0.2);
        for (i = 0; i < k; i++) size = Math.min(size, awza_vFit(cols[i], S * 0.72 / k * 0.82, S * 0.6, 0.06));
        var flow = jzP(ctx, 'flow', 'down'), offs = flow === 'down' ? [0, 0.5, 1, 0.55] : (flow === 'up' ? [1, 0.5, 0, 0.45] : (flow === 'wave' ? [0.1, 1, 0.3, 0.8] : [0, 0.5, 1, 0.5]));
        var pitch = Math.min(S * 0.74 / k, size * 1.55), tilt = jzP(ctx, 'tilt', 0);
        var g = awza_kit(ctx, 'shikishi', { cx: cx, cy: cy, X: 'var e=inE(0.5);', a: 'inC(0.2)*K', pose: { rot: '-5+(' + jzN(tilt) + '+5)*e', dy: '(1-e)*' + jzN(M * 0.05), s: '0.94+0.06*e' } });
        g.r(x0 + M * 0.01, y0 + M * 0.014, S, S, jzDarkest(sc), 0.32);
        g.r(x0, y0, S, S, C.fill);
        if (jzP(ctx, 'deco', 'flecks') === 'band') g.p([[x0, y0 + S * 0.62], [x0 + S, y0 + S * 0.38], [x0 + S, y0 + S * 0.58], [x0, y0 + S * 0.82]], C.acc, 0.13, { a: 'e' });
        var fl = [];
        for (i = 0; i < 16; i++) {
            var q = awza_r01(b.seed, i, 1), fx = i % 2 ? x0 + S * (0.06 + 0.4 * q * q) : x0 + S * (0.94 - 0.4 * q * q), fy = i % 2 ? y0 + S * (0.05 + 0.3 * awza_r01(b.seed, i, 2)) : y0 + S * (0.95 - 0.3 * awza_r01(b.seed, i, 2)), fs = S * (0.006 + 0.012 * awza_r01(b.seed, i, 3));
            fl.push([fx - fs / 2, fy - fs / 2, fs, fs]);
        }
        g.mr(fl.slice(0, 8), C.acc, 0.55, { a: awza_inC(0.3, 0.27) });
        g.mr(fl.slice(8), C.acc, 0.55, { a: awza_inC(0.3, 0.43) });
        g.rs(x0 + S * 0.022, y0 + S * 0.022, S * 0.956, S * 0.956, 0, C.acc, Math.max(1.5, S * 0.004), 0.8);
        var bb = null, lastX = cx, lastB = cy;
        for (i = 0; i < k; i++) {
            var x = cx + ((k - 1) / 2 - i) * pitch, CL = awza_colFit(awza_col(ctx, cols[i], b.font, size, C.text, x, cy, 0.06), size * 1.3, S * 0.7), mh = jzSize(CL)[1];
            var top = k === 1 ? cy - mh / 2 : y0 + S * 0.12 + offs[i % 4] * Math.max(0, S * 0.7 - mh) * 0.75;
            jzXf(CL, 'ADBE Position').setValue([x, top + mh / 2]);
            bb = jzUnion(bb, awza_lyric(ctx, g, CL, i * 3));
            lastX = x; lastB = top + mh;
        }
        if (jzP(ctx, 'seal', true)) {
            var ss = Math.min(S * 0.07, size * 0.6), sx = Math.max(x0 + S * 0.07, lastX - pitch * 0.5 - ss * 1.2), sy = Math.min(y0 + S * 0.9 - ss, lastB - ss);
            g.r(sx, sy, ss, ss, C.acc, 1, { a: '(time-0.6)*5' });
            g.rs(sx + ss * 0.2, sy + ss * 0.2, ss * 0.6, ss * 0.6, 0, C.fill, ss * 0.08, 0.8, { a: '(time-0.6)*5' });
        }
        g.done();
        return bb;
    }
});

/* ================================================================== 6 wzFurin — 風鈴
   wind chimes: a glass bell with the line on the paper strip that swings below it (bell and strip are two kits) */
awza_reg('wzFurin', {
    plan: function (rng, cut, st) { return { font: awza_fontPick(rng, st), multi: rng.chance(0.7), pat: rng.pick(['dots', 'wave', 'ring']), ph: rng.range(0, 6), amp: rng.range(3.5, 6) }; },
    build: function (ctx) {
        var b = awza_base(ctx), W = b.W, H = b.H, sc = b.sc, M = b.M, port = b.port, lw = b.lw, k, d, q;
        var t0 = jzFlat(b.txt), n = jzCount(t0), multi = !!jzP(ctx, 'multi', true), want = port ? 1 : (!multi ? 1 : (n <= 3 ? 1 : (n <= 9 ? 2 : 3)));
        var parts = want === 1 ? [t0] : awza_toLines(t0, want), nb = parts.length, ltr = jzHasLatin(t0), C = awza_card(sc);
        var r = M * 0.055, gap = M * 0.1, shh = H * 0.6, pat = jzP(ctx, 'pat', 'dots');
        var bwMax = nb === 1 ? Math.min(W * 0.44, shh * 0.42) : Math.min((W * 0.84 - gap * (nb - 1)) / nb, shh * 0.3);
        var tot = nb * bwMax + (nb - 1) * gap, glass = awza_plate(sc, [sc.accent, sc.accent2, sc.fg]), line = awza_plate(sc, [sc.fg, sc.sub]);
        var rail = awza_kit(ctx, 'furin strings', { a: 'inC(0.25)*K' }), bb = null, geo = [];
        if (!port) rail.r(0, H * 0.03, W, M * 0.014, awza_wood(sc));
        for (k = 0; k < nb; k++) {
            var i = ltr ? k : nb - 1 - k, cx = (W - tot) / 2 + i * (bwMax + gap) + bwMax / 2, yb = H * (port ? 0.07 : 0.1) + (k % 2) * H * 0.035;
            rail.l(cx, -M * 0.02, cx, yb, line, lw * 1.5);
            geo.push([cx, yb]);
        }
        rail.done();
        for (k = 0; k < nb; k++) {
            var cx2 = geo[k][0], yb2 = geo[k][1], E = awza_inE(0.5, k * 0.1);
            var f = awza_fitV(parts[k], bwMax * 0.74, shh * 0.84, (nb === 1 || jzCount(parts[k]) > 6) ? 2 : 1), size = Math.min(f.size, bwMax * 0.6), nc = f.cols.length;
            var sw = Math.min(bwMax, size * (1.5 + (nc - 1) * 1.35)), ph = jzP(ctx, 'ph', 0) + k * 1.9, by = yb2 + r * 2.05, sy = by + r * 1.3;
            var TH = 'var th=(Math.sin(time*1.35+' + jzN(ph) + ')*' + jzN(jzP(ctx, 'amp', 4)) + '*MO+13*Math.exp(-time*1.4)*Math.cos(time*5.2+' + jzN(ph) + '))*(0.4+0.6*MO);';
            // bell (sways a little), then the clapper cord + strip (sway more)
            var bell = awza_kit(ctx, 'furin bell ' + (k + 1), { cx: cx2, cy: yb2, X: TH, a: 'inC(0.25)*K', pose: { rot: 'th*0.25', s: '0.6+0.4*' + E } });
            var pts = awza_arc(cx2, yb2 + r, r, r, 180, 360, 16).concat([[cx2 + r * 1.08, by], [cx2 - r * 1.08, by]]);
            bell.p(pts, glass, 0.3); bell.ps(pts, glass, lw * 2.4);
            if (pat === 'dots') { var dots = []; for (d = -1; d <= 1; d++) dots.push([cx2 + d * r * 0.5, yb2 + r * 1.25, r * 0.11]); bell.mc(dots, glass); }
            else if (pat === 'wave') { var wv = []; for (q = 0; q < 13; q++) wv.push([cx2 - r * 0.85 + q * r * 0.142, yb2 + r * 1.3 + Math.sin(q * 1.05) * r * 0.13]); bell.pl(wv, glass, lw * 2.4); }
            else bell.cs(cx2, yb2 + r * 1.05, r * 0.36, glass, lw * 2.4);
            bell.done();
            var strip = awza_kit(ctx, 'furin strip ' + (k + 1), { cx: cx2, cy: by, X: TH, a: 'inC(0.25)*K', pose: { rot: 'th' } });
            strip.l(cx2, by - r * 0.6, cx2, sy, line, lw * 1.5); strip.c(cx2, by + r * 0.35, r * 0.13, line);
            strip.sub({ org: [cx2, sy], sy: E });
            strip.r(cx2 - sw / 2, sy, sw, shh, C.fill);
            if (jzContrast(C.fill, sc.bg) < 1.35) strip.rs(cx2 - sw / 2, sy, sw, shh, 0, C.line, lw * 1.5);
            strip.r(cx2 - sw / 2, sy + shh * 0.03, sw, shh * 0.012, C.acc, 0.8); strip.r(cx2 - sw / 2, sy + shh * 0.955, sw, shh * 0.012, C.acc, 0.8);
            strip.end();
            strip.done();
            bb = jzUnion(bb, awza_drawV(ctx, strip, f.cols, b.font, size, cx2, sy + shh * 0.5, C.text, awza_mi(ctx, 0.2 + k * 0.1, k), true, 0.06, 1.35, shh * 0.84));
        }
        return bb;
    }
});

/* ================================================================== 7 wzBanzuke — 番付表
   a ranking sheet: columns shrink from right to left like a sumo banzuke, small print fills the rest */
awza_reg('wzBanzuke', {
    plan: function (rng, cut, st) { return { font: awza_fontPick(rng, st, true), ratio: rng.range(0.7, 0.82), tiers: rng.int(2, 3), stamp: rng.chance(0.5) }; },
    build: function (ctx) {
        var b = awza_base(ctx), W = b.W, H = b.H, sc = b.sc, M = b.M, port = b.port, lw = b.lw, i, tr, q;
        var pw = W * (port ? 0.9 : 0.8), ph = H * (port ? 0.7 : 0.84), cx = W / 2, cy = H / 2, x0 = cx - pw / 2, y0 = cy - ph / 2, C = awza_card(sc);
        var t0 = jzFlat(b.txt), n = jzCount(t0), L = n <= 2 ? 1 : (n <= 5 ? 2 : (n <= 9 ? 3 : 4)), cols = awza_toLines(t0, L), k = cols.length, T = k + Math.max(2, 6 - k);
        var ws = [], sum = 0, ratio = jzP(ctx, 'ratio', 0.76);
        for (i = 0; i < T; i++) { var w = Math.pow(ratio, i); ws.push(w); sum += w; }
        var hd = ph * 0.11, bd = M * 0.014, ux = pw - bd * 4, by0 = y0 + bd * 2 + hd, bh = ph - bd * 4 - hd;
        var g = awza_kit(ctx, 'banzuke', { cx: cx, cy: cy, a: 'inC(0.2)*K', pose: { dy: '-(1-inE(0.45))*' + jzN(M * 0.05) } });
        g.r(x0 + M * 0.01, y0 + M * 0.012, pw, ph, jzDarkest(sc), 0.3);
        g.r(x0, y0, pw, ph, C.fill);
        g.rs(x0 + bd, y0 + bd, pw - bd * 2, ph - bd * 2, 0, C.text, bd * 0.35);
        g.r(x0 + bd * 2, by0 - lw * 1.5, ux, lw * 3, C.text, 1, { from: 'l', sx: awza_inE(0.5, 0.1) });
        g.t('第' + awza_kanjiNum(b.no) + '番', cx, y0 + bd * 1.6 + hd / 2, { size: hd * 0.5, color: C.text, track: 0.5, font: b.font });
        var bb = null, xr = x0 + pw - bd * 2;
        for (i = 0; i < T; i++) {
            var cw = ux * ws[i] / sum, xc = xr - cw / 2, EI = awza_inE(0.45, 0.1 + i * 0.05), top = by0 + bh * 0.04;
            if (i > 0) g.r(xr - lw, by0, lw * 2, bh, C.line, 1, { from: 't', sy: EI });
            if (i < k) {
                var size = Math.min(awza_vFit(cols[i], cw * 0.76, bh * 0.9, 0.04), cw * 0.8);
                var CL = awza_colFit(awza_col(ctx, cols[i], b.font, size, i === 0 ? C.acc : C.text, xc, cy, 0.04), cw * 0.9, bh * 0.9), mh = jzSize(CL)[1];
                jzXf(CL, 'ADBE Position').setValue([xc, top + mh / 2]);
                bb = jzUnion(bb, awza_lyric(ctx, g, CL, i * 3, true));
                top += mh + bh * 0.05;
            }
            // small print: tiers of thin vertical bars
            var rest = by0 + bh * 0.97 - top, tiers = i < k ? 1 : jzP(ctx, 'tiers', 2), nbar = Math.max(2, Math.round(cw / (M * 0.02)));
            if (rest > bh * 0.1) for (tr = 0; tr < tiers; tr++) {
                var ty = top + rest * tr / tiers, th = rest / tiers * 0.86, bars = [];
                if (tr > 0) g.r(xr - cw + lw * 2, ty - rest / tiers * 0.07, cw - lw * 4, lw * 1.4, C.line, 1, { from: 'l', sx: EI });
                for (q = 0; q < nbar; q++) bars.push([xr - cw * (q + 0.5) / nbar - cw / nbar * 0.2, ty, cw / nbar * 0.4, th * (0.55 + 0.45 * awza_r01(b.seed, i, tr, q))]);
                g.mr(bars, C.faint, 1, { org: [xc, ty], sy: EI });
            }
            xr -= cw;
        }
        if (jzP(ctx, 'stamp', false)) {
            var ss = hd * 0.6;
            g.cs(x0 + bd * 3 + ss, y0 + bd * 1.6 + hd / 2, ss * 0.5, C.acc, lw * 2.5, 1, { a: '(time-0.5)*5' });
            g.c(x0 + bd * 3 + ss, y0 + bd * 1.6 + hd / 2, ss * 0.22, C.acc, 1, { a: '(time-0.5)*5' });
        }
        g.done();
        return bb;
    }
});

/* ================================================================== 8 wzTenugui — 手ぬぐい
   a long patterned cotton cloth that unrolls; a plain panel in the middle carries the line.
   AE: the cloth layer is uncovered by a mask that follows the roll; 豆絞り dots are Repeaters. */
awza_reg('wzTenugui', {
    plan: function (rng, cut, st) { return { font: awza_fontPick(rng, st), pat: rng.pick(['mame', 'shima', 'uroko']), col: rng.pick(['ink', 'accent', 'paper']), tilt: rng.range(-2.5, 2.5), rev: rng.chance(0.5) }; },
    build: function (ctx) {
        var b = awza_base(ctx), W = b.W, H = b.H, sc = b.sc, M = b.M, port = b.port, lw = b.lw, s, q, c;
        var cw = W * (port ? 0.92 : 0.88), ch = H * (port ? 0.36 : 0.46), cx = W / 2, cy = H / 2, x0 = cx - cw / 2, y0 = cy - ch / 2, C = awza_card(sc);
        var col = jzP(ctx, 'col', 'ink'), pat = jzP(ctx, 'pat', 'mame'), rev = !!jzP(ctx, 'rev', false), tilt = jzP(ctx, 'tilt', 0);
        var fill = col === 'paper' ? C.fill : awza_plate(sc, col === 'accent' ? [sc.accent, sc.ink, sc.fg] : [sc.ink, sc.accent, sc.fg]);
        var on = awza_on(sc, fill), pc = col === 'paper' ? C.acc : on, zone = cw * 0.17, px0 = x0 + zone, pw = cw - zone * 2;
        var XX = 'var e=ioc(time/0.6),vw=' + jzN(cw) + '*e,vx0=' + (rev ? jzN(x0 + cw) + '-vw' : jzN(x0)) + ';';
        var g = awza_kit(ctx, 'tenugui', { cx: cx, cy: cy, rotv: tilt, X: XX, a: 'inC(0.15)*K' });
        awza_mask(g, [[x0, y0], [x0 + cw + M * 0.008, y0], [x0 + cw + M * 0.008, y0 + ch + M * 0.012], [x0, y0 + ch + M * 0.012]],
            'var p=[[vx0,' + jzN(y0) + '],[vx0+vw+' + jzN(M * 0.008) + ',' + jzN(y0) + '],[vx0+vw+' + jzN(M * 0.008) + ',' + jzN(y0 + ch + M * 0.012) + '],[vx0,' + jzN(y0 + ch + M * 0.012) + ']];createPath(p,[],[],true)');
        g.r(x0 + M * 0.008, y0 + M * 0.012, cw, ch, jzDarkest(sc), 0.28);
        g.r(x0, y0, cw, ch, fill);
        if (pat === 'mame') {
            var d = ch * 0.085, rr = d * 0.2, rows = Math.min(40, Math.ceil((ch - d * 0.6) / d)), re = Math.ceil(rows / 2), ro = Math.floor(rows / 2);
            g.c(x0 + d * 0.6, y0 + d * 0.6, rr, pc, 0.5, { rep: [[Math.min(120, Math.ceil((cw - d * 0.6) / d)), d, 0], [re, 0, d * 2]] });
            if (ro > 0) g.c(x0 + d * 1.1, y0 + d * 1.6, rr, pc, 0.5, { rep: [[Math.min(120, Math.ceil((cw - d * 1.1) / d)), d, 0], [ro, 0, d * 2]] });
            g.r(px0 - d * 0.3, y0 + ch * 0.13, pw + d * 0.6, ch * 0.74, fill);
            g.rs(px0, y0 + ch * 0.13, pw, ch * 0.74, 0, pc, lw * 2, 0.6, { a: awza_inC(0.3, 0.35) });
        } else {
            if (pat === 'shima') {
                var st = [];
                for (s = 0; s < 2; s++) for (q = 0; q < 5; q++) st.push([(s ? x0 + cw - zone : x0) + zone * (0.12 + q * 0.17), y0, zone * (q % 2 ? 0.035 : 0.09), ch]);
                g.mr(st, pc, 0.75);
            } else {
                var dd = ch / 8, hw = dd * 0.58, tri = [];
                for (s = 0; s < 2; s++) for (c = 0; c < 4; c++) {
                    var dir = s ? -1 : 1, tx = (s ? x0 + cw : x0) + dir * (c * hw + hw * 0.2), ty = y0 + (c % 2 ? dd / 2 : 0) - dd / 2;
                    tri.push([[tx, ty], [tx + dir * hw, ty + dd / 2], [tx, ty + dd]]);
                }
                g.mp(tri, pc, 0.75, { rep: [[9, 0, dd]] });
            }
            for (s = 0; s < 2; s++) g.r(s ? px0 + pw : px0 - lw * 3, y0, lw * 3, ch, pc, 0.7, { a: awza_inC(0.2, (rev ? !s : s) ? 0.45 : 0.1) });
        }
        g.done();
        // frayed ends + the roll (not masked)
        var g2 = awza_kit(ctx, 'tenugui ends', { cx: cx, cy: cy, rotv: tilt, X: XX, a: 'inC(0.15)*K' }), fl = [], fr = [];
        for (q = 0; q < 26; q++) { var fy = y0 + ch * (q + 0.5) / 26, fw = M * (0.006 + 0.008 * awza_r01(b.seed, q)); fl.push([x0 - fw, fy, fw, lw * 1.6]); fr.push([x0 + cw, fy, fw, lw * 1.6]); }
        g2.mr(fl, fill, 1, rev ? { a: 'e*8-7' } : null);
        g2.mr(fr, fill, 1, rev ? null : { a: 'e*8-7' });
        g2.rr(x0 - ch * 0.035, y0 - ch * 0.03, ch * 0.07, ch * 1.06, ch * 0.03, jzMixHex(fill, on, 0.25), 1, { dx: rev ? jzN(cw) + '-vw' : 'vw', a: 'e<0.995?1:0' });
        g2.done();
        return awza_fitMain(ctx, g, b.txt, b.font, cx, cy, pw * 0.9, ch * (port ? 0.7 : 0.58), on, null, port ? 4 : 2, ch * 0.42, awza_mi(ctx, 0.3));
    }
});

/* ================================================================== 9 wzChikkan — 竹簡
   bamboo slips tied with cords; each column of the line sits on its own slip, unrolled right to left */
awza_reg('wzChikkan', {
    plan: function (rng, cut, st) { return { font: awza_fontPick(rng, st), extra: rng.int(1, 2), roll: rng.chance(0.6), cord: rng.pick(['accent', 'ink']) }; },
    build: function (ctx) {
        var b = awza_base(ctx), W = b.W, H = b.H, sc = b.sc, M = b.M, port = b.port, lw = b.lw, q, i, fi;
        var t0 = jzFlat(b.txt), n = jzCount(t0), cols = [t0], k = 1, sh = H * (port ? 0.66 : 0.74), cx = W / 2, cy = H / 2, y0 = cy - sh / 2, C = awza_card(sc);
        var ex = jzP(ctx, 'extra', 1), size = 10;
        for (q = 1; q <= Math.min(port ? 3 : 5, Math.max(1, n)); q++) {
            var cs = awza_toLines(t0, q), s = Math.min(sh * 0.2, W * 0.86 / (cs.length + 2) / 1.64);
            for (i = 0; i < cs.length; i++) s = Math.min(s, awza_vFit(cs[i], s * 1.2, sh * 0.76, 0.06));
            if (s > size * 1.04) { size = s; cols = cs; k = cs.length; }
        }
        var sw = size * 1.5, gp = size * 0.14;
        while (ex > 0 && (k + ex * 2) * (sw + gp) > W * 0.92) ex--;
        var T = k + ex * 2, bam = jzMixHex(C.fill, awza_plate(sc, [sc.sub, sc.accent], C.fill, 1.2), 0.22), ink = awza_on(sc, bam), node = jzMixHex(bam, ink, 0.3);
        var cord = jzP(ctx, 'cord', 'ink') === 'accent' ? awza_plate(sc, [sc.accent, sc.accent2], bam, 1.6) : jzMixHex(bam, ink, 0.75);
        var g = awza_kit(ctx, 'chikkan', { a: 'inC(0.15)*K' }), bb = null, xl = 1e9, todo = [], F = [0.055, 0.945];
        for (q = 0; q < T; q++) {
            var x = cx + ((T - 1) / 2 - q) * (sw + gp), E = awza_inE(0.42, q * 0.055), tone = jzMixHex(bam, ink, 0.07 * awza_r01(b.seed, q, 5)), nodes = [], nodes2 = [];
            g.sub({ X: 'var e=' + E + ';', dx: '(1-e)*' + jzN(size * 1.4), a: 'e*3' });
            g.r(x - sw / 2 + M * 0.004, y0 + M * 0.008, sw, sh, jzDarkest(sc), 0.25);
            g.r(x - sw / 2, y0, sw, sh, tone);
            var fs = [0.1 + 0.06 * awza_r01(b.seed, q, 1), 0.62 + 0.2 * awza_r01(b.seed, q, 2)];
            for (fi = 0; fi < 2; fi++) { nodes.push([x - sw / 2, y0 + sh * fs[fi], sw, lw * 1.6]); nodes2.push([x - sw / 2, y0 + sh * fs[fi] + lw * 4, sw, lw]); }
            g.mr(nodes, node); g.mr(nodes2, node, 0.6);
            for (fi = 0; fi < 2; fi++) {
                g.r(x - sw / 2 - gp, y0 + sh * F[fi] - lw * 2, sw + gp * 2, lw * 4, cord);
                g.ml([[[x - sw * 0.16, y0 + sh * F[fi] - sw * 0.14], [x + sw * 0.16, y0 + sh * F[fi] + sw * 0.14]], [[x + sw * 0.16, y0 + sh * F[fi] - sw * 0.14], [x - sw * 0.16, y0 + sh * F[fi] + sw * 0.14]]], cord, lw * 2.5);
            }
            g.end();
            xl = Math.min(xl, x - sw / 2);
            var ci = q - ex;
            if (ci >= 0 && ci < k) todo.push([cols[ci], x, awza_mi(ctx, 0.12 + q * 0.055, ci)]);
        }
        if (jzP(ctx, 'roll', true) && xl - sw * 0.9 > W * 0.02) {
            g.sub({ a: awza_inC(0.3, T * 0.055) });
            g.rr(xl - gp - sw * 0.8, y0 - sh * 0.012, sw * 0.8, sh * 1.024, sw * 0.3, jzMixHex(bam, ink, 0.14));
            g.mr([[xl - gp - sw * 0.8, y0 + sh * F[0] - lw * 2, sw * 0.8, lw * 4], [xl - gp - sw * 0.8, y0 + sh * F[1] - lw * 2, sw * 0.8, lw * 4]], cord);
            g.end();
        }
        g.done();
        for (i = 0; i < todo.length; i++) {
            var CL = awza_colFit(awza_col(ctx, todo[i][0], b.font, size, ink, todo[i][1], cy, 0.06), sw * 0.9, sh * 0.8);
            bb = jzUnion(bb, awza_lyric(ctx, null, CL, todo[i][2], true));
        }
        return bb;
    }
});

/* ================================================================== 10 wzShogi — 将棋の駒
   every glyph is a five-sided shogi piece slapped onto the board grid (one kit + one text layer per piece) */
awza_reg('wzShogi', {
    plan: function (rng, cut, st) { return { font: awza_fontPick(rng, st, true), red: rng.int(0, 11), hasRed: rng.chance(0.6), stars: rng.chance(0.7) }; },
    build: function (ctx) {
        var b = awza_base(ctx), W = b.W, H = b.H, sc = b.sc, M = b.M, port = b.port, lw = b.lw, i, j, r, q;
        var t0 = jzFlat(b.txt), cells = jzChars(t0).length, rows = port ? Math.ceil(cells / (cells <= 9 ? 3 : 4)) : (cells <= 7 ? 1 : 2), ls = awza_toLines(t0, rows), lines = [], maxc = 1, cnt = 0;
        for (i = 0; i < ls.length; i++) { var a = jzChars(ls[i]); lines.push(a); maxc = Math.max(maxc, a.length); for (j = 0; j < a.length; j++) if (a[j] !== ' ') cnt++; }
        var R = lines.length, gc = maxc + 1, gr = R + 1, c = Math.min(W * 0.9 / gc, H * 0.8 / gr, M * 0.3), bx = W / 2 - gc * c / 2, by = H / 2 - gr * c / 2, C = awza_card(sc);
        var board = jzMixHex(C.fill, awza_plate(sc, [sc.accent, sc.sub], C.fill, 1.2), 0.3), bl = jzMixHex(board, awza_on(sc, board), 0.55), ink = C.text;
        var g = awza_kit(ctx, 'shogi board', { a: 'inC(0.2)*K' });
        g.r(bx - c * 0.12 + M * 0.008, by - c * 0.12 + M * 0.012, gc * c + c * 0.24, gr * c + c * 0.24, jzDarkest(sc), 0.3, { a: 'inE(0.4)' });
        g.r(bx - c * 0.12, by - c * 0.12, gc * c + c * 0.24, gr * c + c * 0.24, board);
        for (i = 0; i <= gc; i++) g.r(bx + i * c - lw, by, lw * 2, gr * c, bl, 1, { from: 't', sy: awza_inE(0.45, i * 0.02) });
        for (j = 0; j <= gr; j++) g.r(bx, by + j * c - lw, gc * c, lw * 2, bl, 1, { from: 'l', sx: awza_inE(0.45, j * 0.03) });
        if (jzP(ctx, 'stars', true)) g.mc([[bx + c, by + c, c * 0.035], [bx + (gc - 1) * c, by + (gr - 1) * c, c * 0.035]], bl);
        g.done();
        var bb = null, idx = 0, redI = jzP(ctx, 'hasRed', false) && cnt > 1 ? jzP(ctx, 'red', 0) % cnt : -1;
        for (r = 0; r < R; r++) {
            var l = lines[r], off = Math.floor((gc - l.length) / 2) + ((gc - l.length) % 2 ? 0.5 : 0);
            for (q = 0; q < l.length; q++) {
                if (l[q] === ' ') continue;
                var x = bx + (off + q + 0.5) * c, y = by + (r + 1) * c, d = 0.05 + idx * 0.055, ii = idx++, w2 = c * 0.39, h2 = c * 0.44;
                var pk = awza_kit(ctx, 'shogi piece ' + (ii + 1), { cx: x, cy: y, rotv: awza_rs(b.seed, ii, 4) * 3, X: 'var e=' + awza_inB(0.32, d, 1.8) + ';', a: 'cl(e*3)*K', pose: { s: '1.7-0.7*e' } });
                var pts = [[x, y - h2], [x + w2 * 0.74, y - h2 * 0.58], [x + w2, y + h2], [x - w2, y + h2], [x - w2 * 0.74, y - h2 * 0.58]];
                pk.p(awza_shift(pts, c * 0.03, c * 0.045), jzDarkest(sc), 0.35);
                pk.p(pts, C.fill); pk.ps(pts, jzMixHex(C.fill, ink, 0.45), lw * 2);
                pk.done();
                var TL = jzText(ctx, l[q], { font: b.font, size: c * 0.5, color: ii === redI ? C.acc : ink, x: x, y: y + c * 0.06 });
                bb = jzUnion(bb, awza_lyric(ctx, pk, TL, awza_mi(ctx, d + 0.04, ii * 0.5), true));
            }
        }
        return bb || awza_box(bx, by, bx + gc * c, by + gr * c);
    }
});

/* ================================================================== 11 wzNoshi — のし紙
   gift wrapping paper: a red-and-white cord runs across and ties itself into a bow above the line */
awza_reg('wzNoshi', {
    plan: function (rng, cut, st) { return { font: awza_fontPick(rng, st), knot: rng.pick(['cho', 'cho', 'kiri']), emblem: rng.chance(0.75), strands: rng.int(3, 5) }; },
    build: function (ctx) {
        var b = awza_base(ctx), W = b.W, H = b.H, sc = b.sc, M = b.M, port = b.port, s, d;
        var pw = W * (port ? 0.9 : 0.84), ph = H * (port ? 0.56 : 0.76), cx = W / 2, cy = H / 2, x0 = cx - pw / 2, y0 = cy - ph / 2, C = awza_card(sc);
        var cA = C.acc, cB = awza_plate(sc, awza_without([sc.accent2, sc.sub, sc.ink], cA), C.fill, 1.5), ky = y0 + ph * 0.3, ns = jzP(ctx, 'strands', 4), sp = ph * 0.011;
        var E1 = 'ioc((time-0.1)/0.45)';
        var g = awza_kit(ctx, 'noshi', { cx: cx, cy: cy, X: 'var e=inE(0.45),e2=' + awza_inB(0.5, 0.42, 1.5) + ';', a: 'inC(0.2)*K', pose: { s: '0.95+0.05*e', dy: '(1-e)*' + jzN(M * 0.03) } });
        g.r(x0 + M * 0.01, y0 + M * 0.014, pw, ph, jzDarkest(sc), 0.3);
        g.r(x0, y0, pw, ph, C.fill);
        var sl = [], sr = [];
        for (s = 0; s < ns; s++) { var yy = ky + (s - (ns - 1) / 2) * sp * 2; sl.push([x0, yy - sp * 0.5, pw / 2, sp]); sr.push([cx, yy - sp * 0.5, pw / 2, sp]); }
        g.mr(sl, cB, 1, { org: [x0, ky], sx: E1 });
        g.mr(sr, cA, 1, { org: [x0 + pw, ky], sx: E1 });
        // the knot (laid out at full size, scaled in with a small overshoot)
        var u = ph * 0.2, rc = { cap: 2 };
        g.sub({ org: [cx, ky], s: 'Math.max(0,e2)', a: 'e2*3' });
        for (s = 0; s < 3; s++) {
            var q = 1 - s * 0.16;
            if (jzP(ctx, 'knot', 'cho') === 'kiri') {
                for (d = -1; d <= 1; d += 2) g.pl(awza_quad([cx, ky], [cx + d * u * 0.5 * q, ky - u * 0.2], [cx + d * u * (0.75 + s * 0.12), ky - u * (1.0 - s * 0.1)]), d < 0 ? cA : cB, sp, 1, rc);
                g.es(cx, ky, u * 0.42 * q, u * 0.3 * q, s % 2 ? cA : cB, sp);
            } else {
                for (d = -1; d <= 1; d += 2) {
                    var lp = awza_cubic([cx, ky], [cx + d * u * 0.5 * q, ky - u * 1.25 * q], [cx + d * u * 1.75 * q, ky - u * 0.75 * q], [cx + d * u * 1.3 * q, ky - u * 0.05]);
                    lp = lp.concat(awza_cubic([cx + d * u * 1.3 * q, ky - u * 0.05], [cx + d * u * 0.95 * q, ky + u * 0.3 * q], [cx + d * u * 0.4, ky + u * 0.12], [cx, ky]).slice(1));
                    g.pl(lp, d < 0 ? cA : cB, sp, 1, rc);
                    g.pl(awza_quad([cx, ky], [cx + d * u * 0.25, ky + u * 0.6], [cx + d * u * (0.75 + s * 0.14), ky + u * (0.95 - s * 0.05)]), d < 0 ? cB : cA, sp, 1, rc);
                }
            }
        }
        g.r(cx - u * 0.11, ky - u * 0.2, u * 0.22, u * 0.4, cA);
        g.end();
        if (jzP(ctx, 'emblem', true)) {
            var eh = ph * 0.17, ew = eh * 0.34, ex = x0 + pw * (port ? 0.88 : 0.91), ey = y0 + ph * 0.14;
            g.sub({ org: [ex, ey], s: awza_inB(0.4, 0.5, 1.4) });
            g.p([[ex - ew / 2, ey - eh * 0.36], [ex, ey - eh / 2], [ex + ew / 2, ey - eh * 0.36], [ex + ew * 0.3, ey + eh / 2], [ex - ew * 0.3, ey + eh / 2]], cA);
            g.r(ex - ew * 0.09, ey - eh * 0.4, ew * 0.18, eh * 0.86, cB === cA ? C.fill : cB);
            g.end();
        }
        g.done();
        return awza_fitMain(ctx, g, b.txt, b.font, cx, y0 + ph * 0.69, pw * 0.84, ph * 0.42, C.text, null, port ? 3 : 2, ph * 0.3, awza_mi(ctx, 0.3));
    }
});

/* ================================================================== 12 wzGenjiGumo — 源氏雲
   stepped cloud bands with round ends slide in from both sides; the line sits in the gap between them */
awza_reg('wzGenjiGumo', {
    plan: function (rng, cut, st) { return { font: awza_fontPick(rng, st), col: rng.pick(['accent', 'fg', 'accent']), side: rng.pick(['diag', 'anti', 'both']), dust: rng.chance(0.7), seed: rng.int(1, 1e6) }; },
    build: function (ctx) {
        var b = awza_base(ctx), W = b.W, H = b.H, sc = b.sc, M = b.M, port = b.port, top, r, d;
        var gapH = H * (port ? 0.36 : 0.4), bhh = M * 0.07, sd = jzP(ctx, 'seed', 1), side = jzP(ctx, 'side', 'diag');
        var c1 = jzP(ctx, 'col', 'accent') === 'fg' ? jzMixHex(sc.bg, sc.fg, 0.2) : jzMixHex(sc.bg, awza_plate(sc, [sc.accent, sc.accent2, sc.fg], sc.bg, 1.3), 0.72), c2 = jzMixHex(c1, sc.bg, 0.4);
        var dust = jzMixHex(c1, sc.fg, 0.35), g = awza_kit(ctx, 'genji clouds', { a: '1' }), ext = W * 0.06;
        for (top = 1; top >= 0; top--) {
            var rows = Math.min(14, Math.ceil((H - gapH) / 2 / bhh) + 1);
            for (r = 0; r < rows; r++) {
                // r = 0 is the row next to the gap (short); rows near the screen edge are long
                var f = r / Math.max(1, rows - 1), fromL = side === 'both' ? awza_r01(sd, top, r, 1) < 0.5 : ((side === 'diag') === !!top);
                var len = W * jzClamp(0.16 + 0.75 * Math.pow(f, 0.8) + 0.22 * awza_rs(sd, top, r, 2), 0.1, 1.05);
                var y = top ? H / 2 - gapH / 2 - (r + 1) * bhh : H / 2 + gapH / 2 + r * bhh, col = (r + top) % 3 === 2 ? c2 : c1, sg = fromL ? 1 : -1;
                var XX = 'var e=' + awza_inE(0.7, 0.03 * (rows - r)) + '*K,ll=' + jzN(len) + '*e+Math.sin(time*0.5+' + jzN(r * 1.3 + top * 2) + ')*' + jzN(W * 0.012) + '*MO*e;';
                g.sub({ X: XX, dx: jzN(sg) + '*(ll-' + jzN(len) + ')', a: 'll>2?1:0' });
                g.rr(fromL ? -bhh - ext : W - len, y, len + bhh + ext, bhh + 1, bhh / 2, col);
                if (jzP(ctx, 'dust', false) && r < 4) {
                    var ds = [];
                    for (d = 0; d < 3; d++) { var dx = (fromL ? len : W - len) + sg * bhh * (0.4 + 1.6 * awza_r01(sd, r, d, top)), dz = M * (0.004 + 0.006 * awza_r01(sd, d, r, 9)); ds.push([dx, y + bhh * awza_r01(sd, d, r, 5), dz, dz]); }
                    g.mr(ds, dust, 0.8, { a: 'e' });
                }
                g.end();
            }
        }
        g.done();
        return awza_fitMain(ctx, null, b.txt, b.font, W / 2, H / 2, W * 0.84, gapH * 0.72, sc.fg, null, port ? 4 : 2, gapH * 0.5, 0);
    }
});

/* ================================================================== 13 wzTorii — 鳥居
   a shrine gate is raised (pillars, tie beam, curved top beam); the line stands between its pillars or beside it */
awza_reg('wzTorii', {
    plan: function (rng, cut, st) { return { font: awza_fontPick(rng, st), pos: rng.pick(['in', 'in', 'side']), sun: rng.chance(0.5), flip: rng.chance(0.5) }; },
    build: function (ctx) {
        var b = awza_base(ctx), W = b.W, H = b.H, sc = b.sc, port = b.port, lw = b.lw, s, i;
        var side = jzP(ctx, 'pos', 'in') === 'side', flip = !!jzP(ctx, 'flip', false), gw, gh, cx, y1;
        if (!side) { gw = port ? W * 0.9 : Math.min(W * 0.68, H * 1.2); gh = port ? H * 0.6 : H * 0.84; cx = W / 2; y1 = H / 2 + gh / 2; }
        else if (port) { gw = W * 0.62; gh = H * 0.36; cx = W / 2; y1 = H * 0.46; }
        else { gw = Math.min(W * 0.36, H * 0.7); gh = H * 0.66; cx = flip ? W * 0.76 : W * 0.24; y1 = H / 2 + gh / 2; }
        var y0 = y1 - gh, red = awza_plate(sc, [sc.accent, sc.accent2, sc.fg], sc.bg, 1.5), cap = jzMixHex(jzDarkest(sc), red, 0.15);
        if (jzContrast(cap, sc.bg) < 1.4) cap = jzMixHex(red, sc.fg, 0.45);
        var pwd = gw * 0.058, E1 = 'inE(0.5)', E2 = awza_inE(0.45, 0.18);
        var g = awza_kit(ctx, 'torii', { X: 'var e3=' + awza_inB(0.45, 0.3, 1.3) + ';', a: 'inC(0.15)*K' });
        if (jzP(ctx, 'sun', false)) g.c(cx, y0 + gh * 0.42, gw * 0.3, sc.dim, 0.8, { s: 'inE(0.7)' });
        g.r(cx - gw * 0.62, y1, gw * 1.24, lw * 2, sc.sub, 0.7, { sx: E1 });
        for (s = -1; s <= 1; s += 2) {
            var xb = cx + s * gw * 0.36, xt = cx + s * gw * 0.335, top = y0 + gh * 0.09;
            g.p([[xb - pwd / 2, y1], [xb + pwd / 2, y1], [xt + pwd * 0.44, top], [xt - pwd * 0.44, top]], red, 1, { org: [xb, y1], sy: E1 });
            g.r(xb - pwd * 0.75, y1 - gh * 0.045, pwd * 1.5, gh * 0.045, cap, 1, { from: 'b', sy: E1 });
        }
        var ny = y0 + gh * 0.25, nh = gh * 0.05, th1 = gh * 0.04, th2 = gh * 0.05;
        g.r(cx - gw * 0.43, ny, gw * 0.86, nh, red, 1, { sx: E2 });
        function curve(hw, yy, up) { var o = []; for (i = 0; i <= 12; i++) { var u = i / 12 * 2 - 1; o.push([cx + u * hw, yy - up * u * u]); } return o; }
        var topE = curve(gw * 0.5, y0 + gh * 0.035, gh * 0.035), botE = curve(gw * 0.485, y0 + gh * 0.035 + th1, gh * 0.03).reverse();
        var top2 = curve(gw * 0.47, y0 + gh * 0.035 + th1, gh * 0.03), bot2 = curve(gw * 0.455, y0 + gh * 0.035 + th1 + th2, gh * 0.026).reverse();
        var ty = y0 + gh * 0.035 + th1 + th2 * 0.8;
        g.sub({ dy: '-(1-e3)*' + jzN(gh * 0.22), a: 'e3*3' });
        g.p(top2.concat(bot2), red); g.p(topE.concat(botE), cap);
        g.r(cx - gw * 0.035, ty, gw * 0.07, ny - ty, cap);
        g.rs(cx - gw * 0.035, ty, gw * 0.07, ny - ty, 0, red, lw * 2);
        g.end();
        g.done();
        var mi = awza_mi(ctx, 0.2);
        if (!side) { var tb = ny + nh + gh * 0.04; return awza_fitMain(ctx, null, b.txt, b.font, cx, (tb + y1 - gh * 0.07) / 2, gw * 0.6, (y1 - gh * 0.07 - tb) * 0.9, sc.fg, null, port ? 4 : 3, gh * 0.3, mi); }
        if (port) return awza_fitMain(ctx, null, b.txt, b.font, W / 2, H * 0.71, W * 0.86, H * 0.34, sc.fg, null, 4, H * 0.14, mi);
        return awza_fitMain(ctx, null, b.txt, b.font, flip ? W * 0.33 : W * 0.67, H / 2, W * 0.52, H * 0.6, sc.fg, null, 3, H * 0.26, mi);
    }
});

/* ================================================================== 14 wzUchiwa — 団扇
   a round paper fan swings in on its handle and keeps fanning gently; the line is printed on its face.
   AE: three kits (face / pattern clipped by an ellipse mask / rim) — the pattern and rim ride on the face kit. */
awza_reg('wzUchiwa', {
    plan: function (rng, cut, st) { return { font: awza_fontPick(rng, st), pat: rng.pick(['nami', 'maru', 'plain']), col: rng.pick(['paper', 'paper', 'accent']), dir: rng.pick([-1, 1]), ribs: rng.int(13, 19) }; },
    build: function (ctx) {
        var b = awza_base(ctx), W = b.W, H = b.H, sc = b.sc, M = b.M, port = b.port, lw = b.lw, i, q;
        var ry = port ? Math.min(W * 0.36, H * 0.26) : H * 0.36, rx = Math.min(ry * 1.3, W * 0.45), cx = W / 2, fy = H / 2 - ry * 0.24, C = awza_card(sc);
        var fill = jzP(ctx, 'col', 'paper') === 'accent' ? awza_plate(sc, [sc.accent, sc.ink, sc.fg]) : C.fill, ink = awza_on(sc, fill), acc = awza_plate(sc, awza_without([sc.accent, sc.accent2, sc.ink], fill), fill, 1.6);
        var wood = awza_wood(sc), pvx = cx, pvy = fy + ry * 0.98, dir = jzP(ctx, 'dir', 1), pat = jzP(ctx, 'pat', 'plain'), py = pvy + ry * 0.55, A = 'inC(0.2)*K';
        var g = awza_kit(ctx, 'uchiwa', { cx: pvx, cy: py, X: 'var e=' + awza_inB(0.6, 0, 1.2) + ';', a: A,
            pose: { rot: jzN(dir) + '*(1-e)*55+Math.sin(time*2.1)*2.4*MO*cl(time-0.4)+' + jzN(dir) + '*ic(PO)*30' } });
        g.r(pvx - ry * 0.045, pvy - ry * 0.1, ry * 0.09, ry * 0.72, wood);
        g.e(cx + M * 0.008, fy + M * 0.012, rx, ry, jzDarkest(sc), 0.28);
        g.e(cx, fy, rx, ry, fill);
        g.done();
        var g2 = awza_kit(ctx, 'uchiwa pattern', { cx: pvx, cy: py, a: A });
        awza_maskEll(g2, cx, fy, rx, ry);
        if (pat === 'nami') {
            for (q = 0; q < 2; q++) {
                var wp = [[cx - rx, fy + ry]];
                for (i = 0; i <= 40; i++) wp.push([cx - rx + rx * 2 * i / 40, fy + ry * (0.56 + q * 0.16) + Math.sin(i * 0.5 + q * 2) * ry * 0.05]);
                wp.push([cx + rx, fy + ry]);
                g2.p(wp, acc, q ? 0.55 : 0.3, { shape: 'var p=[[' + jzN(cx - rx) + ',' + jzN(fy + ry) + ']];for(var i=0;i<=40;i++)p.push([' + jzN(cx - rx) + '+' + jzN(rx * 2) + '*i/40,' + jzN(fy + ry * (0.56 + q * 0.16)) + '+Math.sin(i*0.5+' + jzN(q * 2) + '+time*0.8*MO)*' + jzN(ry * 0.05) + ']);p.push([' + jzN(cx + rx) + ',' + jzN(fy + ry) + '])' });
            }
        } else if (pat === 'maru') g2.c(cx + rx * 0.5 * dir, fy - ry * 0.45, ry * 0.42, acc, 0.3);
        var nr = jzP(ctx, 'ribs', 15), ribs = [], ribs2 = [];
        for (i = 0; i < nr; i++) { var th = (-78 + 156 * i / (nr - 1)) * AWZA_D; ribs.push([[pvx, pvy], [pvx + Math.sin(th) * rx * 2.2, pvy - Math.cos(th) * ry * 2.2]]); ribs2.push([[pvx, pvy], [pvx + Math.sin(th) * rx * 0.3, pvy - Math.cos(th) * ry * 0.3]]); }
        g2.ml(ribs, jzMixHex(fill, ink, 0.25), lw * 1.2, 0.5);
        g2.e(pvx, pvy, rx * 0.26, ry * 0.2, sc.bg);
        g2.ml(ribs2, wood, lw * 1.6);
        g2.done();
        var g3 = awza_kit(ctx, 'uchiwa rim', { cx: pvx, cy: py, a: A });
        g3.es(cx, fy, rx, ry, jzMixHex(fill, ink, 0.5), lw * 2.5);
        g3.r(pvx - ry * 0.045, pvy - ry * 0.02, ry * 0.09, ry * 0.1, wood);
        g3.done();
        awza_parent(g2.S, g.S); awza_parent(g3.S, g.S);
        return awza_fitMain(ctx, g, b.txt, b.font, cx, fy - ry * 0.1, rx * 1.36, ry * 0.86, ink, null, 3, ry * 0.56, awza_mi(ctx, 0.25), true);
    }
});

/* ================================================================== 15 wzSudare — すだれ
   a bamboo blind covers the screen, rolls up to uncover the line and comes down again at the end.
   AE: the lyric lies under the blind layers; each blind (slats = one Repeater) is cut off at the roll by a mask. */
awza_reg('wzSudare', {
    plan: function (rng, cut, st) { return { font: awza_fontPick(rng, st), kind: rng.pick(['one', 'one', 'two']), lift: rng.range(0.24, 0.32), tassel: rng.chance(0.8) }; },
    build: function (ctx) {
        var b = awza_base(ctx), W = b.W, H = b.H, sc = b.sc, M = b.M, port = b.port, lw = b.lw, i, fi;
        var two = jzP(ctx, 'kind', 'one') === 'two', lift = H * jzP(ctx, 'lift', 0.28), top = H * 0.045, pitch = M * 0.02;
        var yEnd = lift + (two ? H * 0.05 : 0) + pitch * 4.5;
        var bb = awza_fitMain(ctx, null, b.txt, b.font, W / 2, (yEnd + H * 0.95) / 2, W * 0.84, (H * 0.95 - yEnd) * 0.74, sc.fg, null, port ? 4 : 2, M * 0.3, awza_mi(ctx, 0.35));
        var slat = jzMixHex(sc.bg, awza_plate(sc, [sc.sub, sc.fg], sc.bg, 1.3), 0.6), back = jzMixHex(sc.bg, slat, 0.45), thr = jzMixHex(slat, jzDarkest(sc), 0.45), acc = awza_plate(sc, [sc.accent, sc.accent2, sc.fg]);
        var OP = 'var op=ioc((time-0.08)/0.75)*(1-ioc(PO));', A = 'cl(time/0.1)*(1-cl((PO-0.92)/0.08))', ybC = H * 0.985, rhR = pitch * 3.6;
        var blinds = two ? [[W * 0.015, W * 0.475, 0], [W * 0.51, W * 0.475, H * 0.05]] : [[W * 0.015, W * 0.97, 0]], TF = [0.08, 0.36, 0.64, 0.92], SF = [0.22, 0.78];
        for (i = 0; i < blinds.length; i++) {
            var x = blinds[i][0], w = blinds[i][1], ybR = lift + blinds[i][2], YB = 'var yb=' + jzN(ybC) + '+' + jzN(ybR - ybC) + '*op;';
            var g = awza_kit(ctx, 'sudare ' + (i + 1), { X: OP + YB, a: A }), th = [];
            awza_mask(g, [[x - 2, top - 2], [x + w + 2, top - 2], [x + w + 2, ybC], [x - 2, ybC]],
                'var p=[[' + jzN(x - 2) + ',' + jzN(top - 2) + '],[' + jzN(x + w + 2) + ',' + jzN(top - 2) + '],[' + jzN(x + w + 2) + ',yb],[' + jzN(x - 2) + ',yb]];createPath(p,[],[],true)');
            g.r(x, top, w, ybC - top, back);
            g.r(x, top + pitch * 0.2, w, pitch * 0.6, slat, 1, { rep: [[Math.min(120, Math.floor((ybC - top) / pitch)), 0, pitch]] });
            for (fi = 0; fi < 4; fi++) th.push([x + w * TF[fi] - lw, top, lw * 2, ybC - top]);
            g.mr(th, thr);
            g.done();
        }
        var g2 = awza_kit(ctx, 'sudare rolls', { X: OP, a: A });
        for (i = 0; i < blinds.length; i++) {
            var x2 = blinds[i][0], w2 = blinds[i][1], ybR2 = lift + blinds[i][2], DY = jzN(ybC - ybR2) + '*(1-op)', tyR = ybR2 + rhR * 0.6;
            g2.rr(x2 - pitch * 0.3, ybR2 - rhR * 0.4, w2 + pitch * 0.6, rhR, rhR / 2, jzMixHex(slat, jzDarkest(sc), 0.25), 1, { org: [x2 + w2 / 2, ybR2], dy: DY, sy: '(1.4+2.2*op)/3.6' });
            g2.r(x2 - pitch * 0.2, top - pitch * 1.3, w2 + pitch * 0.4, pitch * 1.6, acc);
            if (jzP(ctx, 'tassel', true)) for (fi = 0; fi < 2; fi++) {
                var tx = x2 + w2 * SF[fi], hR = tyR - top + pitch, TYD = '(' + DY + '-' + jzN(pitch * 0.6 * 2.2) + '*(1-op))';
                g2.r(tx - lw * 1.5, top, lw * 3, hR, acc, 1, { from: 't', sy: '(' + jzN(hR) + '+' + TYD + ')/' + jzN(hR) });
                g2.sub({ dy: TYD });
                g2.c(tx, tyR + pitch * 1.4, pitch * 0.55, acc);
                g2.r(tx - pitch * 0.42, tyR + pitch * 1.7, pitch * 0.84, pitch * 2.2, acc, 1, { from: 't', sy: '0.4+0.6*op' });
                g2.end();
            }
        }
        g2.done();
        return bb;
    }
});
