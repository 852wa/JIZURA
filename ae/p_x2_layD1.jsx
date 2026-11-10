// ================================================================ pack x2layD part 1 (AE port of src/11p_x2_layD.js, entries 1-15)
// xdHelix, xdConstellation, xdBrick, xdMirrorAxis, xdUpSide, xdPivotFan, xdDrum, xdSlowSpread, xdBentRoad, xdStaff, xdOverlap,
// xdCyclic, xdKaraoke, xdPassing, xdChecker  (+ the helpers shared with part 2)
//
// Techniques used here:
// - fixed-cell layouts: ONE text layer per glyph cell (em-box centred on its cell, the cut's enter / hold / exit with the
//   browser's per-glyph stagger). Built-in motion of a glyph is a text animator with an Expression Selector on that layer
//   ("JZ Ride" position, "JZ Zoom" scale, "JZ Turn" rotation), so the layer transform stays free for the cut's motion.
// - natural-advance layouts (slow spread, overlap chain, wind sway, skyline, trace): ONE text block typeset by After Effects;
//   per-glyph motion is an animator whose selector expression looks the glyph up by textIndex.
// - copies of the line (outline / dim / pattern) are plain text layers kept out of the ghosts; 'lines' / 'stripes' / 'dots'
//   pattern fills are Venetian Blinds on the copy.
// - "glyph layers" (axd_G): one text layer, one cell per line, every glyph placed by a position animator expression — used for
//   rows of moving copies (cyclic shift, column echo).
// - helper graphics: shape layers (groups with trim / transform expressions, createPath for travelling waves), all jzNoGhost.

var AXD_CY = 0.38;     // em-box centre above the baseline (em)
var AXD_FX = 'function iocu(x){x=cl(x);return x<0.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;}function ios(x){x=cl(x);return -(Math.cos(Math.PI*x)-1)/2;}' +
    'function fr(x){return x-Math.floor(x);}function lp(a,b,t){return a+(b-a)*t;}var DG=Math.PI/180,TAU=Math.PI*2;\n';
var AXD_LITE = 'function cl(x){return Math.max(0,Math.min(1,x));}function fr(x){return x-Math.floor(x);}\n';
var AXD_LYR = [];

/* ---------------------------------------------------------------- registry wrapper + small helpers */
function axd_H(ctx) { return jzTH(ctx) + AXD_FX; }
function axd_anim(ctx, L, o) { AXD_LYR.push(L); return jzAnimate(ctx, L, o || {}); }
// the browser draws every helper graphic / copy of these layouts with ghost off: everything that is not a lyric layer is jzNoGhost
function axd_reg(key, def) {
    var b = def.build;
    def.build = function (ctx) {
        AXD_LYR = [];
        var bb = b(ctx), keep = {}, i;
        for (i = 0; i < AXD_LYR.length; i++) { try { keep[AXD_LYR[i].index] = 1; } catch (e) {} }
        for (i = 1; i <= ctx.comp.numLayers; i++) if (!keep[i]) jzNoGhost(ctx.comp.layer(i));
        AXD_LYR = [];
        return bb;
    };
    jzReg('layout', key, def);
}
function axd_base(ctx) {
    var c = ctx.cut, M = jzU(ctx);
    return { W: ctx.W, H: ctx.H, sc: ctx.sc, c: c, M: M, port: jzPortrait(ctx), txt: jzTrim(String(c.text || '')), lw: Math.max(1, M * 0.0016), seed: (c.seed | 0), HD: axd_H(ctx),
        dur: Math.max(0.05, c.dur || 1), inD: c.inDur || 0.3, outD: c.outDur || 0 };
}
function axd_acc(sc) { return jzContrast(sc.accent, sc.bg) >= 2 ? sc.accent : (sc.accent2 && jzContrast(sc.accent2, sc.bg) >= 2 ? sc.accent2 : sc.fg); }
function axd_sub(sc) { return jzContrast(sc.sub, sc.bg) >= 1.6 ? sc.sub : jzMixHex(sc.bg, sc.fg, 0.6); }
function axd_dim(sc) { return jzMixHex(sc.bg, sc.fg, 0.17); }
function axd_lsz(ctx) { return jzClamp(jzU(ctx) * 0.019, 11 * ctx.u, 24 * ctx.u); }
function axd_bb(x0, y0, x1, y1) { return { x0: x0, y0: y0, x1: x1, y1: y1, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 }; }
function axd_bbc(bb, x, y, hw, hh) { return jzUnion(bb, axd_bb(x - hw, y - hh, x + hw, y + hh)); }
function axd_miOf(i, n) { return n <= 10 ? i : Math.round(i * 10 / n); }
function axd_sqz(c) { return jzChars(c).length > 1 ? 0.68 : 1; }
// expression snippets: the browser's inE / inC (expo / cubic ease-in of a helper from `dl` over `d` seconds)
function axd_ie(d, dl) { return 'oe((time-' + jzN(dl || 0) + ')/' + jzN(d) + ')'; }
function axd_ic(d, dl) { return 'oc((time-' + jzN(dl || 0) + ')/' + jzN(d) + ')'; }

/* ---------------------------------------------------------------- text: cells, rows, estimates (port of the pack's helpers) */
function axd_isSp(c) { return c === ' ' || c === '　'; }
function axd_isPunct(ch) { return jzIsPunct(ch) || ch === 'ー'; }
function axd_closeP(ch) { return axd_isPunct(ch) && '「『（(［【〈《“‘'.indexOf(ch) < 0; }
// glyph cells: closing punctuation rides with the glyph before it; ' ' marks a word gap (Latin lyrics only)
function axd_cells(t) {
    var s = jzTrim(String(t || '')).replace(/[\s　]+/g, ' ');
    if (!(jzIsLatinText(s) && s.indexOf(' ') >= 0)) s = s.replace(/ /g, '');
    var o = [], cs = jzChars(s), i, l;
    for (i = 0; i < cs.length; i++) {
        l = o.length ? o[o.length - 1] : null;
        if (l && !axd_isSp(l) && axd_closeP(cs[i]) && jzChars(l).length < 2) o[o.length - 1] = l + cs[i]; else o.push(cs[i]);
    }
    return o;
}
function axd_cnt(cells) { var n = 0; for (var i = 0; i < cells.length; i++) if (!axd_isSp(cells[i])) n++; return n; }
function axd_glyphs(t) { var c = axd_cells(t), o = []; for (var i = 0; i < c.length; i++) if (!axd_isSp(c[i])) o.push(c[i]); return o; }
function axd_chunkBal(a, R) {
    var o = [], n = a.length, at = 0, r, k;
    R = Math.max(1, Math.min(R, n));
    for (r = 0; r < R; r++) { k = Math.ceil((n - at) / (R - r)); o.push(a.slice(at, at + k)); at += k; }
    return o;
}
// jzSplitLines, but never leave a line of punctuation only
function axd_splitL(t, per) {
    var ls = jzSplitLines(String(t), Math.max(1, per)).split('\r'), out = [], i, j, cs, all;
    for (i = 0; i < ls.length; i++) {
        cs = jzChars(ls[i]); all = true;
        for (j = 0; j < cs.length; j++) if (!(axd_isPunct(cs[j]) || cs[j] === ' ')) { all = false; break; }
        if (out.length && all) out[out.length - 1] += ls[i]; else out.push(ls[i]);
    }
    return out.join('\r');
}
function axd_linesOf(t, L) { var s = jzTrim(String(t || '')), n = jzChars(s).length; return L <= 1 ? s : axd_splitL(s, Math.ceil(n / L)); }
// rows of cells: Latin lyrics break between words, anything else into even runs
function axd_rowCells(txt, RN) {
    var all = axd_cells(txt), i, has = false, o = [];
    if (RN <= 1) return [all];
    for (i = 0; i < all.length; i++) if (all[i] === ' ') has = true;
    if (has) {
        var ls = axd_linesOf(jzTrim(String(txt)).replace(/\s+/g, ' '), RN).split('\r');
        for (i = 0; i < ls.length; i++) { var r = axd_cells(ls[i]); if (r.length) o.push(r); }
        return o.length ? o : [all];
    }
    return axd_chunkBal(all, RN);
}
// advance width in em (the browser measures the real font; full-width glyphs are exactly 1 em)
function axd_adv(ch) {
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
function axd_advOf(c, o) {
    if (axd_isSp(c)) return o.spw != null ? o.spw : (o.mono ? o.mono * 0.5 : 0.34);
    if (o.mono) return o.mono;
    var cs = jzChars(c), s = 0;
    for (var i = 0; i < cs.length; i++) s += axd_adv(cs[i]);
    return s;
}
function axd_rowW(row, o) { var s = 0; for (var i = 0; i < row.length; i++) s += axd_advOf(row[i], o); return s + (o.track || 0) * Math.max(0, row.length - 1); }
// per-glyph row setting. o: track (em), lead, maxR, cap (px), mono (em cell, 0 = natural advance), spw (space width em)
// -> { g: [{t, i, r, j, ex, ey, a}], size, R, ws, n, lead, rows }  (ex / ey in em from the block centre)
function axd_layRows(txt, bw, bh, o) {
    var lead = o.lead != null ? o.lead : 1.2, maxR = o.maxR || 1, tr = o.track || 0, best = null, R, rows, ws, i, mx, size;
    for (R = 1; R <= maxR; R++) {
        rows = axd_rowCells(txt, R);
        if (best && rows.length <= best.rows.length) continue;
        ws = []; mx = 0.3;
        for (i = 0; i < rows.length; i++) { ws.push(Math.max(0.3, axd_rowW(rows[i], o))); mx = Math.max(mx, ws[i]); }
        size = Math.min(bw / mx, bh / (rows.length * lead - (lead - 1)), o.cap || 1e9);
        if (!best || size > best.size * 1.04) best = { rows: rows, ws: ws, size: size };
    }
    var g = [], RR = best.rows.length, gi = 0, r, j, x, a, c;
    for (r = 0; r < RR; r++) {
        x = -best.ws[r] / 2;
        for (j = 0; j < best.rows[r].length; j++) {
            c = best.rows[r][j]; a = axd_advOf(c, o);
            if (!axd_isSp(c)) g.push({ t: c, i: gi++, r: r, j: j, ex: x + a / 2, ey: (r - (RR - 1) / 2) * lead, a: a });
            x += a + tr;
        }
    }
    return { g: g, size: best.size, R: RR, ws: best.ws, n: gi, lead: lead, rows: best.rows };
}
function axd_rowsStr(rows) { var o = []; for (var i = 0; i < rows.length; i++) o.push(rows[i].join('')); return o.join('\r'); }
// per character of a block built from rows of cells (textIndex order: spaces count, line breaks do not):
// gi = glyph (cell) index or -1 for a space, row, col = cell index in its row
function axd_charMap(rows) {
    var gi = [], rw = [], co = [], g = 0, r, j, k, cs;
    for (r = 0; r < rows.length; r++) for (j = 0; j < rows[r].length; j++) {
        if (axd_isSp(rows[r][j])) { gi.push(-1); rw.push(r); co.push(j); continue; }
        cs = jzChars(rows[r][j]);
        for (k = 0; k < cs.length; k++) { gi.push(g); rw.push(r); co.push(j); }
        g++;
    }
    return { gi: gi, row: rw, col: co, n: g };
}
function axd_estW(line, track) { var a = jzChars(line), w = 0; for (var i = 0; i < a.length; i++) w += axd_adv(a[i]); return Math.max(0.01, w + (track || 0) * Math.max(0, a.length - 1)); }
function axd_fitEst(str, bw, bh, track, lead) {
    var ls = String(str).split('\r'), w = 0.01;
    for (var i = 0; i < ls.length; i++) w = Math.max(w, axd_estW(ls[i], track));
    return Math.min(bw / w, bh / ((ls.length - 1) * (lead || 1.2) + 1));
}
// choose the line count (1..maxL) that gives the biggest type inside a box (estimate; the block is then fitted for real)
function axd_fitBox(txt, bw, bh, lead, track, maxL) {
    var t = jzTrim(String(txt || '')), n = jzChars(t).length, best = null, L, tt, s;
    for (L = 1; L <= Math.min(maxL, Math.max(1, n)); L++) {
        tt = axd_linesOf(t, L);
        if (tt.split('\r').length < L && best) continue;
        s = axd_fitEst(tt, bw, bh, track, lead);
        if (!best || s > best.size * 1.04) best = { text: tt, size: s };
    }
    return best || { text: t, size: 10 };
}

/* ---------------------------------------------------------------- text layers */
// a text block centred at (x, y) (or left / right aligned). o: font size color x y track lead align fill stroke strokeColor
// strokeOver name opacity + fitW / fitH / cap: refit the size to the measured width (height counted in em lines, as the browser)
function axd_T(ctx, str, o) {
    var nl = String(str).split('\r').length, lead = o.lead || 1.2, size = Math.max(1, o.size || 100);
    var L = jzText(ctx, str, { font: o.font, size: size, color: o.color || ctx.sc.fg, x: o.x || 0, y: o.y || 0, track: o.track || 0, leading: nl > 1 ? size * lead : null,
        fill: o.fill, stroke: o.stroke, strokeColor: o.strokeColor, strokeOver: o.strokeOver, align: o.align, name: o.name, opacity: o.opacity });
    if (o.fitW) {
        var r = jzRect(L), s = Math.max(1, Math.min(size * o.fitW / Math.max(1, r.width), (o.fitH || 1e9) / ((nl - 1) * lead + 1), o.cap || 1e9));
        if (Math.abs(s - size) > 0.01) {
            jzTextDoc(L, function (td) { td.fontSize = s; if (nl > 1) { try { td.autoLeading = false; td.leading = s * lead; } catch (e) {} } });
            jzAnchor(L, o.align);
        }
    }
    return L;
}
// { w, h, size } of a block made with axd_T (w measured, h in em lines like the browser's J.measure)
function axd_m(L, str, lead) { var nl = String(str).split('\r').length, fs = jzFontSize(L); return { w: jzRect(L).width, h: ((nl - 1) * (lead || 1.2) + 1) * fs, size: fs, nl: nl }; }
// one glyph cell as a lyric layer, em-box centred on (x, y). o: font size x y color sx rot mi stroke strokeColor
function axd_put(ctx, t, o) {
    var L = jzText(ctx, t, { font: o.font, size: o.size, color: o.color || ctx.sc.fg, x: o.x, y: o.y, sx: o.sx && o.sx !== 1 ? o.sx : 0, rot: o.rot || 0 });
    jzXf(L, 'ADBE Anchor Point').setValue([0, -AXD_CY * o.size]);
    return axd_anim(ctx, L, { mi: o.mi || 0 });
}
// lines of the lyric as separate lyric layers at one size (widest line fitted to maxW); em-centred anchors. -> { Ls, size, ws }
function axd_lines(ctx, lines, o) {
    var Ls = [], ws = [], mx = 1, i, est = Math.max(1, o.est);
    for (i = 0; i < lines.length; i++) {
        Ls.push(jzText(ctx, lines[i], { font: o.font, size: est, color: o.colors ? o.colors[i] : (o.color || ctx.sc.fg), x: 0, y: 0, track: o.track || 0, stroke: o.stroke, strokeColor: o.strokeColor }));
        ws.push(jzRect(Ls[i]).width); mx = Math.max(mx, ws[i]);
    }
    var s = Math.max(1, Math.min(est * o.maxW / mx, o.cap || 1e9));
    for (i = 0; i < Ls.length; i++) {
        if (Math.abs(s - est) > 0.01) { axd_setSize(Ls[i], s); ws[i] = jzRect(Ls[i]).width; }
        jzXf(Ls[i], 'ADBE Anchor Point').setValue([0, -AXD_CY * s]);
    }
    return { Ls: Ls, size: s, ws: ws };
}
function axd_setSize(L, s) { jzTextDoc(L, function (td) { td.fontSize = s; }); }
// secondary copy of the line in one of the browser's copy styles; k scales its alpha
function axd_copy(ctx, str, o, kind, k) {
    var sc = ctx.sc, size = o.size, a = 0.75, pat = null;
    var q = { font: o.font, size: size, x: o.x, y: o.y, track: o.track, lead: o.lead, align: o.align, name: 'copy ' + kind };
    if (kind === 'dim') { q.color = jzMixHex(sc.bg, sc.fg, 0.3); a = 0.9; }
    else if (kind === 'lines') { q.color = sc.fg; pat = 'lines'; }
    else if (kind === 'dots') { q.color = sc.fg; a = 0.8; pat = 'dots'; }
    else if (kind === 'stripes') { q.color = axd_acc(sc); a = 0.85; pat = 'stripes'; }
    else { q.fill = false; q.stroke = Math.max(1.5, size * 0.016); q.strokeColor = sc.fg; }
    q.opacity = a * (k == null ? 1 : k);
    var L = axd_T(ctx, str, q);
    if (pat) axd_pattern(L, pat, size);
    return L;
}
// pattern fills of the browser's copies: Venetian Blinds (lines = horizontal bands, stripes = diagonal bands, dots = two crossed sets)
function axd_pattern(L, kind, size) {
    var cell = Math.max(3, size * (kind === 'dots' ? 0.075 : 0.06)), vb;
    if (kind === 'stripes') { vb = jzEffect(L, 'ADBE Venetian Blinds', 'JZ Stripes'); jzEP(vb, 1, 55); jzEP(vb, 2, 45); jzEP(vb, 3, cell * 0.71); jzEP(vb, 4, 0); }
    else if (kind === 'dots') {
        vb = jzEffect(L, 'ADBE Venetian Blinds', 'JZ Dots H'); jzEP(vb, 1, 38); jzEP(vb, 2, 90); jzEP(vb, 3, cell); jzEP(vb, 4, 0);
        vb = jzEffect(L, 'ADBE Venetian Blinds', 'JZ Dots V'); jzEP(vb, 1, 38); jzEP(vb, 2, 0); jzEP(vb, 3, cell); jzEP(vb, 4, 0);
    } else { vb = jzEffect(L, 'ADBE Venetian Blinds', 'JZ Lines'); jzEP(vb, 1, 55); jzEP(vb, 2, 90); jzEP(vb, 3, cell); jzEP(vb, 4, 0); }
}
// move a layer's anchor to the comp point (px, py) without moving the picture (no rotation on the layer yet)
function axd_pivot(L, px, py) {
    var a = jzXf(L, 'ADBE Anchor Point').value, p = jzXf(L, 'ADBE Position').value, s = jzXf(L, 'ADBE Scale').value;
    jzXf(L, 'ADBE Anchor Point').setValue([a[0] + (px - p[0]) * 100 / (s[0] || 100), a[1] + (py - p[1]) * 100 / (s[1] || 100)]);
    jzXf(L, 'ADBE Position').setValue([px, py]);
}
function axd_opx(L, ex) { jzSetExpr(jzXf(L, 'ADBE Opacity'), ex); }
// small mono label (helper text, not the lyric)
function axd_lbl(ctx, text, x, y, o) {
    o = o || {};
    return jzText(ctx, String(text), { font: o.font || jzMonoF(ctx), size: o.size || axd_lsz(ctx), color: o.color || ctx.sc.sub, x: x, y: y, align: o.align, track: o.track != null ? o.track : 0.08, opacity: o.opacity, name: o.name || 'label' });
}
function axd_moreAlign(L, v) { try { L.property('ADBE Text Properties').property('ADBE Text More Options').property('ADBE Text Anchor Point Align').setValue(v); } catch (e) {} }

/* ---- per-glyph motion: animators with an Expression Selector (pre = expression head, body sets the named variables) */
function axd_ride(L, name, pre, body, KB) {      // dx, dy in px
    return jzAnimator(L, name, [['ADBE Text Position 3D', [KB, KB, 0]]], pre + 'var dx=0,dy=0;' + body + ';[dx/' + jzN(KB) + '*100,dy/' + jzN(KB) + '*100,0]');
}
function axd_zoom(L, name, pre, body) {          // sx, sy factors 0..3
    return jzAnimator(L, name, [['ADBE Text Scale 3D', [300, 300, 100]]], pre + 'var sx=1,sy=1;' + body + ';[Math.max(-100,Math.min(100,(sx-1)*50)),Math.max(-100,Math.min(100,(sy-1)*50)),0]');
}
function axd_turn(L, name, pre, body) {          // r in degrees
    return jzAnimator(L, name, [['ADBE Text Rotation', 360]], pre + 'var r=0;' + body + ';Math.max(-100,Math.min(100,r/3.6))');
}
function axd_show(L, name, pre, body) {          // a = opacity 0..1
    return jzAnimator(L, name, [['ADBE Text Opacity', 0]], pre + 'var a=1;' + body + ';(1-Math.max(0,Math.min(1,a)))*100');
}

/* ---- glyph layers: ONE text layer, one cell per line; anchor = position = (0, 0) keeps layer space == comp space */
function axd_G(ctx, cells, o) {
    var map = [], i, k, n;
    for (i = 0; i < cells.length; i++) { n = jzChars(cells[i]).length; for (k = 0; k < n; k++) map.push(i); }
    var L = jzText(ctx, cells.join('\r'), { font: o.font, size: o.size, color: o.color || ctx.sc.fg, x: 0, y: 0, track: 0, leading: o.size, fill: o.fill, stroke: o.stroke,
        strokeColor: o.strokeColor, name: o.name || 'glyphs', opacity: o.opacity });
    jzXf(L, 'ADBE Anchor Point').setValue([0, 0]); jzXf(L, 'ADBE Position').setValue([0, 0]);
    return { L: L, fs: o.size, LD: o.size, n: cells.length, map: map };
}
// body sets x, y (glyph centre, comp px) and optionally s (uniform scale) / a (opacity) for cell i; which = letters of 'psa'
function axd_GX(ctx, G, name, head, body, which) {
    var KB = Math.max(ctx.W, ctx.H) * 3 + G.n * G.LD;
    var pre = head + 'var i=' + jzArrExpr(G.map) + '[textIndex-1]||0,x=0,y=0,s=1,a=1;' + body + ';';
    if (which.indexOf('p') >= 0) jzAnimator(G.L, name + ' Place', [['ADBE Text Position 3D', [KB, KB, 0]]], pre + '[x/' + jzN(KB) + '*100,(y+' + jzN(AXD_CY * G.fs) + '-i*' + jzN(G.LD) + ')/' + jzN(KB) + '*100,0]');
    if (which.indexOf('s') >= 0) jzAnimator(G.L, name + ' Size', [['ADBE Text Scale 3D', [300, 300, 100]]], pre + 'var q=Math.max(-100,Math.min(100,(s-1)*50));[q,q,0]');
    if (which.indexOf('a') >= 0) jzAnimator(G.L, name + ' Show', [['ADBE Text Opacity', 0]], pre + '(1-Math.max(0,Math.min(1,a)))*100');
}

/* ---------------------------------------------------------------- shape groups */
function axd_S(ctx, name, x, y) { return jzShapeLayer(ctx, name, x || 0, y || 0); }
function axd_fadeK(ctx, S) { jzSetExpr(jzXf(S, 'ADBE Opacity'), jzTH(ctx) + 'value*K'); return S; }
function axd_dash(st, d, gp, offExpr) {
    var D = st.property('ADBE Vector Stroke Dashes'), p1 = null, p2 = null, p3 = null;
    try { D.addProperty('ADBE Vector Stroke Dash 1'); D.addProperty('ADBE Vector Stroke Gap 1'); if (offExpr) D.addProperty('ADBE Vector Stroke Offset'); } catch (e) {}
    try { p1 = D.property('ADBE Vector Stroke Dash 1'); p2 = D.property('ADBE Vector Stroke Gap 1'); if (offExpr) p3 = D.property('ADBE Vector Stroke Offset'); } catch (e1) { jzWarn('dashes: ' + e1.toString()); }
    if (p1) p1.setValue(d); if (p2) p2.setValue(gp);
    if (p3 && offExpr) jzSetExpr(p3, offExpr);
}
// one finished group of a shape layer (finish each group before the next: older group references go stale in AE).
//  sh: { paths: [pts, ...], closed } | { ell: [w, h] } | { rect: [w, h], round }
//  st: { fill, stroke, w, a (0..1), cap, join, dash: [dash, gap, offsetExpr] }
//  x : { p: [x, y], r: deg } static group transform; expressions: pos sc rot op (percent) trim trim0 trimOff path size
function axd_g(S, name, sh, st, x) {
    x = x || {}; st = st || {};
    var g = jzGrp(S, name), i, p;
    if (sh.paths) {
        for (i = 0; i < sh.paths.length; i++) { p = jzAddPath(g, sh.paths[i], !!sh.closed); if (x.path && i === 0) jzSetExpr(p.property('ADBE Vector Shape'), x.path); }
    } else if (sh.ell) { p = jzAddEllipse(g, sh.ell[0], sh.ell[1]); if (x.size) jzSetExpr(p.property('ADBE Vector Ellipse Size'), x.size); }
    else if (sh.rect) { p = jzAddRect(g, Math.max(0.5, sh.rect[0]), Math.max(0.5, sh.rect[1]), sh.round || 0); if (x.size) jzSetExpr(p.property('ADBE Vector Rect Size'), x.size); }
    if (st.fill) jzAddFill(g, st.fill);
    if (st.stroke) {
        var s = jzAddStroke(g, st.stroke, st.w || 2);
        if (st.cap) { try { s.property('ADBE Vector Stroke Line Cap').setValue(st.cap); } catch (e) {} }
        if (st.join) { try { s.property('ADBE Vector Stroke Line Join').setValue(st.join); } catch (e2) {} }
        if (st.dash) axd_dash(s, st.dash[0], st.dash[1], st.dash[2]);
    }
    if (x.trim || x.trim0 || x.trimOff) { var t = jzAddTrimPaths(g, x.trim, x.trim0); if (x.trimOff) jzSetExpr(t.property('ADBE Vector Trim Offset'), x.trimOff); }
    var tg = jzGX(g);
    if (x.p) tg.property('ADBE Vector Position').setValue(x.p);
    if (x.r) tg.property('ADBE Vector Rotation').setValue(x.r);
    if (st.a != null) tg.property('ADBE Vector Group Opacity').setValue(st.a * 100);
    if (x.pos) jzSetExpr(tg.property('ADBE Vector Position'), x.pos);
    if (x.sc) jzSetExpr(tg.property('ADBE Vector Scale'), x.sc);
    if (x.rot) jzSetExpr(tg.property('ADBE Vector Rotation'), x.rot);
    if (x.op) jzSetExpr(tg.property('ADBE Vector Group Opacity'), x.op);
}
// a line that grows from its middle: trim start / end for progress expression e (0..1)
function axd_mid(HD, e) { return { trim: HD + '50+50*' + e, trim0: HD + '50-50*' + e }; }

/* ================================================================== 1 xdHelix — 二重らせん
   one glyph layer per cell riding the near strand (position + depth scale animators); far strand = createPath, rungs and
   far dots = groups with scale / position expressions. Glyphs are not re-sorted by depth (layer order is fixed). */
axd_reg('xdHelix', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['display', 'serif'])), turns: rng.range(0.9, 1.5), speed: rng.range(16, 30) * rng.pick([1, -1]), rungs: rng.chance(0.75), dot: rng.pick(['dot', 'ring']) }; },
    build: function (ctx) {
        var b = axd_base(ctx), W = b.W, H = b.H, sc = b.sc, M = b.M, port = b.port, lw = b.lw, HD = b.HD;
        var sl = axd_cells(b.txt), N = sl.length, n = axd_cnt(sl), KK = 1.08, s, gi = 0, bb = null;
        if (!N) return null;
        var font = jzFontOf(ctx, 'font', 'display'), ring = jzP(ctx, 'dot', 'dot') === 'ring', acc = axd_acc(sc);
        var size = port ? Math.min(H * 0.8 / (N * KK), W * 0.24) : Math.min(W * 0.84 / (N * KK), M * 0.2);
        var amp = port ? Math.min(size * 0.7, W * 0.44 - size * 0.62) : size * 0.62, cx = W / 2, cy = H / 2;
        var HX = HD + 'var hn=' + N + ',htr=' + jzN(jzP(ctx, 'turns', 1.2)) + ',ham=' + jzN(amp) + ',ph0=time*' + jzN(jzP(ctx, 'speed', 22)) + '*DG;function hp(s){return (hn>1?s/(hn-1):0.5)*htr*TAU+ph0;}';
        var S = axd_fadeK(ctx, axd_S(ctx, 'helix'));
        axd_g(S, 'far strand', { paths: [[[cx - 10, cy], [cx + 10, cy]]] }, { stroke: sc.sub, w: lw * 1.2, a: 0.45 }, {
            path: HX + 'var p=[];for(var k=0;k<=48;k++){var s=-0.4+(hn-0.2)*k/48,o=Math.sin(hp(s))*ham,a=(s-(hn-1)/2)*' + jzN(size * KK) + ';p.push(' +
                (port ? '[' + jzN(cx) + '-o,' + jzN(cy) + '+a]' : '[' + jzN(cx) + '+a,' + jzN(cy) + '-o]') + ');}createPath(p,[],[],false)',
            trim: HD + 'oe(time/0.8)*100' });
        for (s = 0; s < N; s++) {
            var a = (s - (N - 1) / 2) * size * KK, bx = port ? cx : cx + a, by = port ? cy + a : cy, e = 'oe((time-' + jzN(s * 0.03) + ')/0.4)';
            if (jzP(ctx, 'rungs', true)) axd_g(S, 'rung ' + s, { paths: [port ? [[-amp, 0], [amp, 0]] : [[0, -amp], [0, amp]]] }, { stroke: sc.sub, w: lw }, {
                p: [bx, by], sc: HX + 'var o=Math.sin(hp(' + s + '))*100;' + (port ? '[o,100]' : '[100,o]'), op: HD + '28*' + e });
            var d0 = size * 0.15 * (ring ? 1.2 : 1);
            axd_g(S, 'dot ' + s, { ell: [d0, d0] }, ring ? { stroke: acc, w: lw * 1.5, a: 0.9 } : { fill: acc, a: 0.9 }, {
                size: HX + 'var d=' + jzN(d0) + '*(1-0.4*Math.cos(hp(' + s + ')))*' + e + ';[d,d]',
                pos: HX + 'var o=Math.sin(hp(' + s + '))*ham;' + (port ? '[' + jzN(bx) + '-o,' + jzN(by) + ']' : '[' + jzN(bx) + ',' + jzN(by) + '-o]') });
        }
        for (s = 0; s < N; s++) {
            if (axd_isSp(sl[s])) continue;
            var a2 = (s - (N - 1) / 2) * size * KK, gx = port ? cx : cx + a2, gy = port ? cy + a2 : cy;
            var L = axd_put(ctx, sl[s], { font: font, size: size, sx: axd_sqz(sl[s]), x: gx, y: gy, mi: axd_miOf(gi++, n) });
            axd_ride(L, 'JZ Ride', HX, 'var o=Math.sin(hp(' + s + '))*ham;' + (port ? 'dx=o' : 'dy=o'), Math.max(W, H));
            axd_zoom(L, 'JZ Depth', HX, 'sx=sy=1+0.16*Math.cos(hp(' + s + '))');
            bb = port ? axd_bbc(bb, gx, gy, amp + size / 2, size / 2) : axd_bbc(bb, gx, gy, size / 2, amp + size / 2);
        }
        return bb;
    }
});

/* ================================================================== 2 xdConstellation — 星座つなぎ
   the sky (links, end dots, background stars) is one shape layer turning about the comp centre; every glyph layer follows the
   same turn with a position animator and stays upright. */
axd_reg('xdConstellation', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['serif', 'display', 'body'])), jit: rng.range(0.18, 0.28), star: rng.pick(['dot', 'cross']), extra: rng.int(6, 11), turn: rng.range(0.5, 1.1) * rng.pick([1, -1]) }; },
    build: function (ctx) {
        var b = axd_base(ctx), W = b.W, H = b.H, sc = b.sc, M = b.M, port = b.port, lw = b.lw, HD = b.HD, seed = b.seed, i, k;
        var L = axd_layRows(b.txt, W * 0.74, H * 0.56, { mono: 1, track: 0.42, lead: 1.8, maxR: port ? 5 : 3, cap: M * 0.19 }), size = L.size;
        if (!L.n) return null;
        var font = jzFontOf(ctx, 'font', 'serif'), jit = jzP(ctx, 'jit', 0.22), turn = jzP(ctx, 'turn', 0.8), acc = axd_acc(sc), pt = [];
        for (i = 0; i < L.g.length; i++) {
            var g = L.g[i];
            pt.push({ g: g, k: 0.8 + 0.4 * jzR(seed, g.i, 3), x: (g.ex + (jzR(seed, g.i, 1) * 2 - 1) * jit) * size, y: (g.ey + (jzR(seed, g.i, 2) * 2 - 1) * jit * 1.5) * size });
        }
        var ROT = '(time-DUR/2)*' + jzN(turn);
        var S = axd_fadeK(ctx, axd_S(ctx, 'sky', W / 2, H / 2));
        jzSetExpr(jzXf(S, 'ADBE Rotate Z'), jzTH(ctx) + 'value+' + ROT);
        for (k = 0; k < jzP(ctx, 'extra', 8); k++) {
            var x0 = (jzR(seed, k, 11) - 0.5) * W * 0.88, y0 = (jzR(seed, k, 12) - 0.5) * H * 0.84, r = lw * (1.4 + 1.6 * jzR(seed, k, 13)), near = false;
            for (i = 0; i < pt.length; i++) if (Math.sqrt((pt[i].x - x0) * (pt[i].x - x0) + (pt[i].y - y0) * (pt[i].y - y0)) < size * 0.6) near = true;
            if (near) continue;
            var tw = HD + '(0.3+0.3*Math.sin(time*2.2+' + jzN(k * 1.7) + '))*oc((time-' + jzN(k * 0.04) + ')/0.5)*100';
            if (jzP(ctx, 'star', 'dot') === 'cross') axd_g(S, 'star ' + k, { paths: [[[-r * 2.4, 0], [r * 2.4, 0]], [[0, -r * 2.4], [0, r * 2.4]]] }, { stroke: sc.sub, w: lw }, { p: [x0, y0], op: tw });
            else axd_g(S, 'star ' + k, { ell: [r * 2, r * 2] }, { fill: sc.sub }, { p: [x0, y0], op: tw });
        }
        for (i = 0; i < pt.length - 1; i++) {
            var A = pt[i], B = pt[i + 1], d = Math.sqrt((B.x - A.x) * (B.x - A.x) + (B.y - A.y) * (B.y - A.y)), ra = size * A.k * 0.6, rb = size * B.k * 0.6;
            if (d < ra + rb + size * 0.08) continue;
            var ux = (B.x - A.x) / d, uy = (B.y - A.y) / d, e = 'oe((time-' + jzN(i * 0.07) + ')/0.45)';
            var p0 = [A.x + ux * ra, A.y + uy * ra], p1 = [B.x - ux * rb, B.y - uy * rb];
            axd_g(S, 'link ' + i, { paths: [[p0, p1]] }, { stroke: sc.sub, w: lw * 1.2, a: A.g.r === B.g.r ? 0.7 : 0.3 }, { trim: HD + e + '*100' });
            axd_g(S, 'node a ' + i, { ell: [lw * 4, lw * 4] }, { fill: acc }, { p: p0, op: HD + e + '*100' });
            axd_g(S, 'node b ' + i, { ell: [lw * 4, lw * 4] }, { fill: acc }, { op: HD + e + '*100',
                pos: HD + 'var e=' + e + ';[' + jzN(p0[0]) + '+' + jzN(p1[0] - p0[0]) + '*e,' + jzN(p0[1]) + '+' + jzN(p1[1] - p0[1]) + '*e]' });
        }
        var bb = null;
        for (i = 0; i < pt.length; i++) {
            var p = pt[i], T = axd_put(ctx, p.g.t, { font: font, size: size * p.k, sx: axd_sqz(p.g.t), x: W / 2 + p.x, y: H / 2 + p.y, mi: axd_miOf(p.g.i, L.n) });
            axd_ride(T, 'JZ Sky Turn', HD, 'var a=' + ROT + '*DG,c=Math.cos(a),s=Math.sin(a),x=' + jzN(p.x) + ',y=' + jzN(p.y) + ';dx=x*c-y*s-x;dy=x*s+y*c-y', Math.max(W, H));
            bb = axd_bbc(bb, W / 2 + p.x, H / 2 + p.y, size * p.k / 2, size * p.k / 2);
        }
        return bb;
    }
});

/* ================================================================== 3 xdBrick — レンガ積み */
axd_reg('xdBrick', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['display'])), style: rng.pick(['line', 'line', 'fill']), acc: rng.chance(0.65), off: rng.pick([0, 1]) }; },
    build: function (ctx) {
        var b = axd_base(ctx), W = b.W, H = b.H, sc = b.sc, M = b.M, port = b.port, lw = b.lw, HD = b.HD, best = null, R, r, j, i;
        for (R = 1; R <= (port ? 6 : 3); R++) {
            var rows0 = axd_rowCells(b.txt, R); if (best && rows0.length <= best.rows.length) continue;
            var per0 = 1; for (i = 0; i < rows0.length; i++) per0 = Math.max(per0, rows0[i].length);
            var s0 = Math.min(W * 0.86 / ((per0 + 0.5) * 1.22), H * 0.74 / (rows0.length * 1.3), M * 0.26);
            if (!best || s0 > best.s * 1.04) best = { rows: rows0, per: per0, s: s0 };
        }
        var rows = best.rows, per = best.per, s = best.s, bw = s * 1.22, bh = s * 1.3, ww = (per + 0.5) * bw, left = W / 2 - ww / 2, top, n = jzCount(b.txt);
        R = rows.length; top = H / 2 - R * bh / 2;
        if (!n) return null;
        var col = axd_sub(sc), gap = Math.max(lw * 2, s * 0.035), off = jzP(ctx, 'off', 0), font = jzFontOf(ctx, 'font', 'display');
        function x0r(q) { return left + ((q + off) % 2) * bw / 2; }
        var S = axd_fadeK(ctx, axd_S(ctx, 'bricks'));
        if (jzP(ctx, 'style', 'line') === 'line') {
            for (r = 0; r <= R; r++) axd_g(S, 'course ' + r, { paths: [[[left, top + r * bh], [left + ww, top + r * bh]]] }, { stroke: col, w: lw * 1.4, a: 0.8 }, { trim: HD + axd_ie(0.5, r * 0.05) + '*100' });
            for (r = 0; r < R; r++) {
                var xs = [left, left + ww];
                for (j = 0; j <= per; j++) xs.push(x0r(r) + j * bw);
                for (j = 0; j < xs.length; j++) axd_g(S, 'joint ' + r + '.' + j, { paths: [[[xs[j], top + r * bh], [xs[j], top + r * bh + bh]]] }, { stroke: col, w: lw * 1.4, a: 0.8 }, { trim: HD + axd_ie(0.35, 0.12 + r * 0.05 + j * 0.02) + '*100' });
            }
        } else {
            for (r = 0; r < R; r++) {
                var xa = x0r(r), cells = [];
                if (xa > left + 1) cells.push([left, xa]);
                for (j = 0; j < per; j++) cells.push([xa + j * bw, xa + (j + 1) * bw]);
                if (xa + per * bw < left + ww - 1) cells.push([xa + per * bw, left + ww]);
                for (j = 0; j < cells.length; j++) axd_g(S, 'brick ' + r + '.' + j, { rect: [cells[j][1] - cells[j][0] - gap, bh - gap] }, { fill: axd_dim(sc) }, {
                    p: [(cells[j][0] + cells[j][1]) / 2, top + (r + 0.5) * bh], sc: HD + '[100,100*ob(cl((time-' + jzN(r * 0.05 + j * 0.025) + ')/0.35),1.4)]' });
            }
        }
        if (jzP(ctx, 'acc', true)) {
            var ar = jzHash(b.seed, 5) % R, onL = (ar + off) % 2 === 1, ax = (onL ? left : left + ww - bw / 2) + gap / 2;
            var SA = axd_fadeK(ctx, axd_S(ctx, 'half brick', ax + (bw / 2 - gap) / 2, top + ar * bh + gap / 2)), ga = jzGrp(SA, 'half');
            jzAddRect(ga, Math.max(1, bw / 2 - gap), bh - gap, 0, 0, (bh - gap) / 2); jzAddFill(ga, axd_acc(sc));
            jzSetExpr(jzXf(SA, 'ADBE Scale'), HD + '[value[0],value[1]*ob(cl((time-0.3)/0.35),1.6)]');
        }
        var bb = null, gi = 0;
        for (r = 0; r < R; r++) for (j = 0; j < rows[r].length; j++) {
            var c = rows[r][j]; if (axd_isSp(c)) continue;
            var x = x0r(r) + (j + 0.5) * bw, y = top + (r + 0.5) * bh;
            axd_put(ctx, c, { font: font, size: s, sx: axd_sqz(c), x: x, y: y, mi: axd_miOf(gi++, n) });
            bb = axd_bbc(bb, x, y, s / 2, s / 2);
        }
        return bb;
    }
});

/* ================================================================== 4 xdMirrorAxis — 鏡合わせ
   the mirrored copy is the same text with its anchor on the axis and a negative X scale that unfolds. Portrait: the vertical
   setting is one text layer per column (one glyph per line). */
axd_reg('xdMirrorAxis', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['display', 'serif'])), side: rng.pick([-1, -1, 1]), copy: rng.pick(['outline', 'dim', 'lines']), ticks: rng.chance(0.6) }; },
    build: function (ctx) {
        var b = axd_base(ctx), W = b.W, H = b.H, sc = b.sc, M = b.M, port = b.port, lw = b.lw, HD = b.HD, i, k;
        if (!b.txt) return null;
        var font = jzFontOf(ctx, 'font', 'display'), side = jzP(ctx, 'side', -1) < 0 ? -1 : 1, kind = jzP(ctx, 'copy', 'outline'), acc = axd_acc(sc), bb = null, mains = [];
        var S = axd_fadeK(ctx, axd_S(ctx, 'axis')), LH = H * 0.4;
        axd_g(S, 'axis', { paths: [[[W / 2, H / 2 - LH], [W / 2, H / 2 + LH]]] }, { stroke: acc, w: lw * 2 }, axd_mid(HD, axd_ie(0.6, 0)));
        if (jzP(ctx, 'ticks', true)) for (k = -6; k <= 6; k++) {
            if (!k) { axd_g(S, 'tick 0', { paths: [[[W / 2 - M * 0.012, H / 2], [W / 2 + M * 0.012, H / 2]]] }, { stroke: acc, w: lw, a: 0.7 }, {}); continue; }
            axd_g(S, 'tick ' + k, { paths: [[[W / 2 - M * 0.012, H / 2 + k * H * 0.06], [W / 2 + M * 0.012, H / 2 + k * H * 0.06]]] }, { stroke: acc, w: lw }, { op: HD + '(' + jzN(Math.abs(k) * 0.06) + '<0.4*' + axd_ie(0.6, 0) + '?70:0)' });
        }
        function pair(str, o) {
            var C = axd_copy(ctx, str, o, kind, 1);
            axd_pivot(C, W / 2, o.y);
            jzSetExpr(jzXf(C, 'ADBE Scale'), HD + 'var kf=' + axd_ie(0.7, 0.12) + ';[-value[0]*kf,value[1]]');
            axd_opx(C, HD + 'value*' + axd_ie(0.7, 0.12) + '*K');
            mains.push([str, o]);
        }
        if (port) {
            var n = jzCount(b.txt), cols = axd_linesOf(b.txt, n > 8 ? 2 : 1).split('\r'), nc, mx = 1, cs = [];
            for (i = 0; i < cols.length; i++) { var q = jzStrip(cols[i]); if (q) { cs.push(q); mx = Math.max(mx, jzChars(q).length); } }
            nc = Math.max(1, cs.length);
            var size = Math.min(W * 0.36 / (nc * 1.15 - 0.15), H * 0.8 / (mx * 1.02), M * 0.28), gap = Math.max(size * 0.14, M * 0.022);
            var bw = (nc * 1.15 - 0.15) * size, cx = W / 2 + side * (gap + bw / 2);
            for (i = 0; i < cs.length; i++) pair(jzVertical(cs[i]), { font: font, size: size, x: cx + ((nc - 1) / 2 - i) * 1.15 * size, y: H / 2, lead: 1.02, mi: i * 2 });
        } else {
            var fb = axd_fitBox(b.txt, W * 0.4, H * 0.62, 1.2, 0.02, 4);
            // measure first (hidden layer removed again) so the copy and the lyric share one size
            var tmp = axd_T(ctx, fb.text, { font: font, size: fb.size, x: 0, y: 0, track: 0.02, lead: 1.2, fitW: W * 0.4, fitH: H * 0.62, cap: M * 0.3 }), sz = jzFontSize(tmp);
            try { tmp.remove(); } catch (e) {}
            pair(fb.text, { font: font, size: sz, x: W / 2 + side * Math.max(sz * 0.14, M * 0.022), y: H / 2, align: side < 0 ? 'right' : 'left', lead: 1.2, track: 0.02, mi: 0 });
        }
        for (i = 0; i < mains.length; i++) {
            var o2 = mains[i][1], Lm = axd_T(ctx, mains[i][0], o2);
            axd_anim(ctx, Lm, { mi: o2.mi });
            var w = jzRect(Lm).width, m = axd_m(Lm, mains[i][0], o2.lead), x0 = o2.align === 'right' ? o2.x - w : (o2.align === 'left' ? o2.x : o2.x - w / 2);
            bb = jzUnion(bb, axd_bb(x0, o2.y - m.h / 2, x0 + w, o2.y + m.h / 2));
        }
        return bb;
    }
});

/* ================================================================== 5 xdUpSide — 縦横交互 */
axd_reg('xdUpSide', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['display'])), mode: rng.pick(['alt', 'alt', 'pairs']), sgn: rng.pick([1, -1]), marks: rng.chance(0.7), swap: rng.chance(0.55) }; },
    build: function (ctx) {
        var b = axd_base(ctx), W = b.W, H = b.H, sc = b.sc, M = b.M, port = b.port, lw = b.lw, HD = b.HD, i;
        var L = axd_layRows(b.txt, W * 0.84, H * 0.62, { mono: 1.12, lead: 1.3, maxR: port ? 4 : 2, cap: M * 0.26 }), size = L.size;
        if (!L.n) return null;
        var font = jzFontOf(ctx, 'font', 'display'), sgn = jzP(ctx, 'sgn', 1) < 0 ? -1 : 1, swap = jzP(ctx, 'swap', false) && b.dur > 1.8, acc = axd_acc(sc), bb = null;
        var TW = 'iocu((time-DUR*0.5)/0.45)', S = jzP(ctx, 'marks', true) ? axd_fadeK(ctx, axd_S(ctx, 'marks')) : null;
        for (i = 0; i < L.g.length; i++) {
            var g = L.g[i], sd = jzP(ctx, 'mode', 'alt') === 'alt' ? g.i % 2 === 1 : (g.i >> 1) % 2 === 1, x = W / 2 + g.ex * size, y = H / 2 + g.ey * size;
            if (S) {
                var e = 'oe((time-' + jzN(g.i * 0.04) + ')/0.35)', d = size * 0.6, h = size * 0.26, F = sd ? '(1-' + TW + ')' : TW;
                if (swap || !sd) axd_g(S, 'foot ' + g.i, { paths: [[[x - h, y + d], [x + h, y + d]]] }, { stroke: acc, w: lw * 2 }, { op: HD + e + '*100' + (swap ? '*(1-' + F + ')' : '') });
                if (swap || sd) axd_g(S, 'side ' + g.i, { paths: [[[x - sgn * d, y - h], [x - sgn * d, y + h]]] }, { stroke: acc, w: lw * 2 }, { op: HD + e + '*100' + (swap ? '*' + F : '') });
            }
            var T = axd_put(ctx, g.t, { font: font, size: size, sx: axd_sqz(g.t), x: x, y: y, rot: sd ? 90 * sgn : 0, mi: axd_miOf(g.i, L.n) });
            if (swap) axd_turn(T, 'JZ Swap', HD, 'r=' + jzN(90 * sgn * (sd ? -1 : 1)) + '*' + TW);
            bb = axd_bbc(bb, x, y, size / 2, size / 2);
        }
        return bb;
    }
});

/* ================================================================== 6 xdPivotFan — 回転コピー */
axd_reg('xdPivotFan', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['display', 'serif'])), dir: rng.pick(['up', 'down', 'both']), K: rng.int(4, 6), step: rng.range(6.5, 10), pv: rng.pick(['l', 'l', 'r']), style: rng.pick(['outline', 'outline', 'dim']) }; },
    build: function (ctx) {
        var b = axd_base(ctx), W = b.W, H = b.H, sc = b.sc, M = b.M, port = b.port, lw = b.lw, HD = b.HD, k;
        if (!b.txt) return null;
        var font = jzFontOf(ctx, 'font', 'display'), dir = jzP(ctx, 'dir', 'up'), KN = jzP(ctx, 'K', 5), sp = jzP(ctx, 'pv', 'l') === 'l' ? -1 : 1, acc = axd_acc(sc);
        var fb = axd_fitBox(b.txt, W * (port ? 0.76 : 0.6), H * 0.26, 1.15, 0.02, port ? 3 : 2);
        var y = H / 2 + (dir === 'up' ? 1 : (dir === 'down' ? -1 : 0)) * H * (port ? 0.1 : 0.15);
        var Lm = axd_T(ctx, fb.text, { font: font, size: fb.size, x: W / 2, y: y, lead: 1.15, track: 0.02, fitW: W * (port ? 0.76 : 0.6), fitH: H * 0.26, cap: M * 0.2 });
        var m = axd_m(Lm, fb.text, 1.15), size = m.size, px = W / 2 + sp * (m.w / 2 + size * 0.2), py = y, x = W / 2 - sp * size * 0.1;
        jzXf(Lm, 'ADBE Position').setValue([x, y]);
        var AEX = 'var fa=' + jzN(jzP(ctx, 'step', 8)) + '*(0.15+0.85*oe(time/0.8))+time*0.45;', cmax = 0, cmin = 0;
        for (k = KN; k >= 1; k--) {
            var up = dir === 'up' ? 1 : (dir === 'down' ? -1 : (k % 2 ? 1 : -1)), mag = dir === 'both' ? Math.ceil(k / 2) : k, coef = up * mag * sp;
            cmax = Math.max(cmax, coef); cmin = Math.min(cmin, coef);
            var C = axd_copy(ctx, fb.text, { font: font, size: size, x: x, y: y, lead: 1.15, track: 0.02 }, jzP(ctx, 'style', 'outline'), Math.max(0, 0.85 - 0.11 * mag));
            axd_pivot(C, px, py);
            jzSetExpr(jzXf(C, 'ADBE Rotate Z'), HD + AEX + 'value+' + jzN(coef) + '*fa');
            jzFade(ctx, C, 0.05 * mag, 0.4);
        }
        var S = axd_fadeK(ctx, axd_S(ctx, 'pivot'));
        axd_g(S, 'arc', { ell: [size * 1.1, size * 1.1] }, { stroke: acc, w: lw * 1.5, a: 0.8 }, { p: [px, py],
            trim: HD + AEX + 'Math.min(100,' + jzN(cmax - cmin) + '*fa/3.6)', trimOff: HD + AEX + jzN((sp < 0 ? 0 : 180) + 90) + '+' + jzN(cmin) + '*fa' });
        axd_g(S, 'pin', { ell: [size * 0.1, size * 0.1] }, { fill: acc }, { p: [px, py], sc: HD + 'var e=' + axd_ie(0.3, 0) + '*100;[e,e]' });
        Lm.moveToBeginning();
        axd_anim(ctx, Lm, { mi: 0 });
        return axd_bb(x - m.w / 2, y - m.h / 2, x + m.w / 2, y + m.h / 2);
    }
});

/* ================================================================== 7 xdDrum — 回転ドラム
   copies: position / vertical scale / opacity follow the drum angle; the lyric rides the face with a position animator (its
   own squash, cos of at most 9.5 degrees, is left out). */
axd_reg('xdDrum', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['display', 'serif'])), dir: rng.pick([1, -1]), style: rng.pick(['outline', 'dim', 'outline']), rails: rng.chance(0.75) }; },
    build: function (ctx) {
        var b = axd_base(ctx), W = b.W, H = b.H, sc = b.sc, M = b.M, port = b.port, lw = b.lw, HD = b.HD, k, s;
        if (!b.txt) return null;
        var font = jzFontOf(ctx, 'font', 'display'), KN = port ? 3 : 2, D = 27, maxP = H * (KN === 2 ? 0.215 : 0.185), acc = axd_acc(sc);
        var fb = axd_fitBox(b.txt, W * 0.76, maxP * 0.72, 1.1, 0.03, port ? 2 : 1);
        var Lm = axd_T(ctx, fb.text, { font: font, size: fb.size, x: W / 2, y: H / 2, lead: 1.1, track: 0.03, fitW: W * 0.76, fitH: maxP * 0.72, cap: M * 0.2 });
        var m = axd_m(Lm, fb.text, 1.1), size = m.size, pitch = Math.min(maxP, m.h + size * 0.38), Rd = pitch / Math.sin(D * Math.PI / 180), hw = m.w / 2 + size * 0.45;
        var DR = 'var dr=(time/Math.max(0.5,DUR)-0.5)*' + jzN(D * 0.7 * (jzP(ctx, 'dir', 1) < 0 ? -1 : 1)) + ';';
        var S = axd_fadeK(ctx, axd_S(ctx, 'drum'));
        if (jzP(ctx, 'rails', true)) {
            for (s = -1; s <= 1; s += 2) axd_g(S, 'rail ' + s, { paths: [[[W / 2 + s * hw, H / 2 - Rd * 0.99], [W / 2 + s * hw, H / 2 + Rd * 0.99]]] }, { stroke: sc.sub, w: lw * 1.2, a: 0.6 }, axd_mid(HD, axd_ie(0.6, 0)));
            for (k = -8; k <= 8; k++) axd_g(S, 'tick ' + k, { paths: [[[W / 2 - hw - size * 0.12, 0], [W / 2 - hw, 0]], [[W / 2 + hw, 0], [W / 2 + hw + size * 0.12, 0]]] }, { stroke: sc.sub, w: lw * 1.2 }, {
                pos: HD + DR + 'var th=(' + jzN(k * D / 2) + '+dr)*DG;[0,' + jzN(H / 2) + '+' + jzN(Rd) + '*Math.sin(th)*' + axd_ie(0.6, 0) + ']',
                op: HD + DR + 'var th=(' + jzN(k * D / 2) + '+dr)*DG;Math.abs(th)>1.5?0:70*Math.cos(th)' });
        }
        for (s = -1; s <= 1; s += 2) axd_g(S, 'face ' + s, { paths: [[[W / 2 - hw, s * pitch / 2], [W / 2 + hw, s * pitch / 2]]] }, { stroke: acc, w: lw * 1.5 }, {
            pos: HD + DR + '[0,' + jzN(H / 2) + '+' + jzN(Rd) + '*Math.sin(dr*DG)]', trim: HD + '50+50*' + axd_ie(0.5, 0.1), trim0: HD + '50-50*' + axd_ie(0.5, 0.1) });
        for (k = -KN; k <= KN; k++) {
            if (!k) continue;
            var C = axd_copy(ctx, fb.text, { font: font, size: size, x: W / 2, y: H / 2, lead: 1.1, track: 0.03 }, jzP(ctx, 'style', 'outline'), 1), TH = DR + 'var th=(' + jzN(k * D) + '+dr)*DG;';
            jzSetExpr(jzXf(C, 'ADBE Position'), HD + TH + '[value[0],' + jzN(H / 2) + '+' + jzN(Rd) + '*Math.sin(th)]');
            jzSetExpr(jzXf(C, 'ADBE Scale'), HD + TH + '[value[0],value[1]*Math.max(0.02,Math.cos(th))]');
            axd_opx(C, HD + TH + 'Math.abs(th)>1.5?0:value*Math.pow(Math.max(0,Math.cos(th)),1.2)*' + axd_ic(0.4, Math.abs(k) * 0.07) + '*K');
        }
        Lm.moveToBeginning();
        axd_anim(ctx, Lm, { mi: 0 });
        axd_ride(Lm, 'JZ Drum Roll', HD, DR + 'dy=' + jzN(Rd) + '*Math.sin(dr*DG)', Math.max(W, H));
        return axd_bb(W / 2 - m.w / 2, H / 2 - m.h / 2, W / 2 + m.w / 2, H / 2 + m.h / 2);
    }
});

/* ================================================================== 8 xdSlowSpread — じわ開き
   one text block; the spread is a Tracking animator driven over the whole cut (the browser scales the glyph positions about
   the centre — the same thing for full-width glyphs). Dots / arrows follow from the estimated glyph positions. */
axd_reg('xdSlowSpread', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['display', 'serif', 'serif'])), mode: rng.pick(['open', 'open', 'close']), dots: rng.chance(0.6), arrows: rng.chance(0.7) }; },
    build: function (ctx) {
        var b = axd_base(ctx), W = b.W, H = b.H, sc = b.sc, M = b.M, port = b.port, lw = b.lw, HD = b.HD, i, r, s;
        var L = axd_layRows(b.txt, W * 0.5, H * 0.6, { track: 0.03, lead: 1.4, maxR: port ? 4 : 2, cap: M * 0.19 });
        if (!L.n) return null;
        var str = axd_rowsStr(L.rows), font = jzFontOf(ctx, 'font', 'display'), close = jzP(ctx, 'mode', 'open') === 'close', acc = axd_acc(sc);
        var Lm = axd_T(ctx, str, { font: font, size: L.size, x: W / 2, y: H / 2, lead: 1.4, track: 0.03, fitW: W * 0.5, fitH: H * 0.6, cap: M * 0.19 });
        var m = axd_m(Lm, str, 1.4), size = m.size, wEst = 0.3, maxLen = 1;
        for (r = 0; r < L.ws.length; r++) { wEst = Math.max(wEst, L.ws[r]); maxLen = Math.max(maxLen, L.rows[r].length); }
        var kx = m.w / (wEst * size), wmax = m.w, fmax = jzClamp((W * 0.87 - size) / Math.max(1, wmax - size), 1.15, 2.3);
        var FX = 'var u=cl(time/' + jzN(Math.max(0.6, b.dur - b.outD * 0.4)) + '),k0=0.35*oc(u)+0.65*u,sk=' + (close ? '1-k0' : 'k0') + ',f=1+' + jzN(fmax - 1) + '*sk;';
        var pitchPx = maxLen > 1 ? Math.max(0, wmax - size) / (maxLen - 1) : 0;
        axd_anim(ctx, Lm, { mi: 0 });
        if (pitchPx > 0) jzAnimator(Lm, 'JZ Spread', [['ADBE Text Tracking Amount', (fmax - 1) * pitchPx / size * 1000]], HD + FX + 'sk*100');
        if (jzP(ctx, 'dots', true)) {
            var SD0 = axd_S(ctx, 'spread dots'), prev = null, nd = 0;
            for (i = 0; i < L.g.length; i++) {
                var g = L.g[i];
                if (prev && prev.r === g.r) {
                    axd_g(SD0, 'dot ' + i, { ell: [Math.max(lw * 3.2, size * 0.044), Math.max(lw * 3.2, size * 0.044)] }, { fill: sc.sub }, {
                        pos: HD + FX + '[' + jzN(W / 2) + '+' + jzN((prev.ex + g.ex) / 2 * size * kx) + '*f,' + jzN(H / 2 + g.ey * size) + ']' });
                    nd++;
                }
                prev = g;
            }
            axd_opx(SD0, HD + FX + 'value*cl(sk*1.6-0.15)*K');
            SD0.moveToEnd();
        }
        if (jzP(ctx, 'arrows', true)) {
            var SA = axd_S(ctx, 'spread arrows'), a = size * 0.11, d = close ? -1 : 1;
            for (r = 0; r < L.R; r++) for (s = -1; s <= 1; s += 2) axd_g(SA, 'arrow ' + r + (s < 0 ? ' l' : ' r'), { paths: [[[-s * a * d, -a], [0, 0], [-s * a * d, a]]] }, { stroke: acc, w: lw * 2 }, {
                pos: HD + FX + '[' + jzN(W / 2) + '+' + jzN(s) + '*(' + jzN((L.ws[r] * kx * size - size) / 2) + '*f+' + jzN(size * 0.84) + '),' + jzN(H / 2 + (r - (L.R - 1) / 2) * L.lead * size) + ']' });
            axd_opx(SA, HD + 'value*' + axd_ie(0.4, 0) + '*K');
            SA.moveToEnd();
        }
        return axd_bb(W / 2 - wmax * fmax / 2, H / 2 - m.h / 2, W / 2 + wmax * fmax / 2, H / 2 + m.h / 2);
    }
});

/* ================================================================== 9 xdBentRoad — 曲がり道 */
axd_reg('xdBentRoad', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['display'])), road: rng.pick(['dim', 'dim', 'accent']), arrow: rng.chance(0.75) }; },
    build: function (ctx) {
        var b = axd_base(ctx), W = b.W, H = b.H, sc = b.sc, M = b.M, port = b.port, HD = b.HD, s;
        var sl = axd_cells(b.txt), N = sl.length, n = axd_cnt(sl), h1, h2, v;
        if (!N) return null;
        if (port) { h1 = jzClamp(Math.round(N * 0.2), 1, 3); h2 = N >= 5 ? jzClamp(Math.round(N * 0.2), 1, 3) : 0; v = N - h1 - h2; }
        else { v = jzClamp(Math.round(N * 0.22), 1, 4); h1 = Math.ceil((N - v) / 2); h2 = N - v - h1; }
        if (h1 < 1) h1 = 1;
        if (v < 0) v = 0;
        var cols = Math.max(1, h1 + h2), rowsN = v + 1, cell = Math.min(W * 0.86 / cols, H * 0.8 / rowsN, M * 0.25), size = cell * 0.82;
        var ox = W / 2 - (cols - 1) * cell / 2, oy = H / 2 - (rowsN - 1) * cell / 2, acc = axd_acc(sc), font = jzFontOf(ctx, 'font', 'display');
        function at(q) { return q < h1 ? [q, 0] : (q < h1 + v ? [h1 - 1, q - h1 + 1] : [h1 + (q - h1 - v), v]); }
        function XY(c) { return [ox + c[0] * cell, oy + c[1] * cell]; }
        var pts = [[ox - cell / 2, oy], XY([h1 - 1, 0]), XY([h1 - 1, v])];
        if (h2 > 0) pts.push([ox + (cols - 1) * cell + cell / 2, oy + v * cell]); else pts[2] = [pts[2][0], pts[2][1] + cell / 2];
        var S = axd_fadeK(ctx, axd_S(ctx, 'road'));
        axd_g(S, 'road', { paths: [pts] }, { stroke: jzP(ctx, 'road', 'dim') === 'accent' ? jzMixHex(sc.bg, acc, 0.32) : axd_dim(sc), w: cell * 0.96 }, { trim: HD + 'iocu(time/0.6)*100' });
        if (jzP(ctx, 'arrow', true)) {
            var end = pts[pts.length - 1], hz = h2 > 0, a = cell * 0.2, gp = cell * 0.12;
            axd_g(S, 'arrow', { paths: [hz ? [[0, -a], [a * 1.1, 0], [0, a]] : [[-a, 0], [0, a * 1.1], [a, 0]]], closed: true }, { fill: acc }, {
                p: hz ? [end[0] + gp, end[1]] : [end[0], end[1] + gp], sc: HD + 'var q=ob(cl((time-0.45)/0.3),1.6)*100;[q,q]' });
            axd_g(S, 'start', { ell: [cell * 0.1, cell * 0.1] }, { fill: acc }, { p: [pts[0][0] - cell * 0.14, pts[0][1]], sc: HD + 'var e=' + axd_ie(0.3, 0) + '*100;[e,e]' });
        }
        var bb = null, gi = 0;
        for (s = 0; s < N; s++) {
            if (axd_isSp(sl[s])) continue;
            var p = XY(at(s));
            axd_put(ctx, sl[s], { font: font, size: size, sx: axd_sqz(sl[s]), x: p[0], y: p[1], mi: axd_miOf(gi++, n) });
            bb = axd_bbc(bb, p[0], p[1], size / 2, size / 2);
        }
        return bb;
    }
});

/* ================================================================== 10 xdStaff — 五線譜 */
axd_reg('xdStaff', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['display', 'serif'])), play: rng.chance(0.75), stems: rng.chance(0.65), sig: rng.chance(0.6), ph: rng.range(0, 6) }; },
    build: function (ctx) {
        var b = axd_base(ctx), W = b.W, H = b.H, sc = b.sc, M = b.M, port = b.port, lw = b.lw, HD = b.HD, r, k, j;
        var sl = axd_cells(b.txt), N = sl.length, n = axd_cnt(sl);
        if (!N) return null;
        var R = port ? jzClamp(Math.ceil(N / 4.5), 1, 4) : (N > 9 ? 2 : 1), per = Math.ceil(N / R), sig = jzP(ctx, 'sig', true), sg = sig ? 1.5 : 0.7;
        var size = Math.min(W * 0.86 / (per * 1.2 + sg), H * 0.8 / (R * 3.5), M * 0.2), g = size / 2.5, pitch = size * 1.2;
        var sw = per * pitch + sg * size, left = W / 2 - sw / 2, rowH = size * 3.5, acc = axd_acc(sc), col = axd_sub(sc), font = jzFontOf(ctx, 'font', 'display'), ph = jzP(ctx, 'ph', 0);
        var S = axd_fadeK(ctx, axd_S(ctx, 'staff')), bb = null, gi = 0, notes = [];
        for (r = 0; r < R; r++) {
            var cy = H / 2 + (r - (R - 1) / 2) * rowH, e = axd_ie(0.6, r * 0.08), ls = [];
            for (k = 0; k < 5; k++) ls.push([[left, cy + (k - 2) * g], [left + sw, cy + (k - 2) * g]]);
            axd_g(S, 'lines ' + r, { paths: ls }, { stroke: col, w: lw * 1.2, a: 0.55 }, { trim: HD + e + '*100' });
            axd_g(S, 'bar ' + r, { paths: [[[left, cy - 2 * g], [left, cy + 2 * g]]] }, { stroke: col, w: lw * 1.5 }, { op: HD + '80*' + e });
            axd_g(S, 'end ' + r, { paths: [[[left + sw, cy - 2 * g], [left + sw, cy + 2 * g]]] }, { stroke: col, w: lw * (r === R - 1 ? 4 : 1.5) }, { op: HD + '(' + e + '>0.98?80:0)' });
            if (r === R - 1) axd_g(S, 'end thin', { paths: [[[left + sw - g * 0.45, cy - 2 * g], [left + sw - g * 0.45, cy + 2 * g]]] }, { stroke: col, w: lw * 1.2 }, { op: HD + '(' + e + '>0.98?80:0)' });
            for (j = 0; j < per; j++) {
                var s = r * per + j; if (s >= N) break;
                var c = sl[s]; if (axd_isSp(c)) continue;
                var lv = jzClamp(Math.round(2.6 * Math.sin(s * 1.25 + ph) + (jzR(b.seed, s, 4) * 2 - 1)), -3, 3);
                var x = left + (sg - 0.1) * size + (j + 0.5) * pitch, y = cy - lv * g * 0.5;
                if (jzP(ctx, 'stems', true)) {
                    var up = lv <= 0, sx = x + (up ? 1 : -1) * size * 0.5;
                    axd_g(S, 'stem ' + s, { paths: [[[sx, y], [sx, y + (up ? -1 : 1) * size * 0.95]]] }, { stroke: sc.fg, w: lw * 1.6, a: 0.7 }, { trim: HD + 'oe((time-' + jzN(s * 0.04) + ')/0.35)*100' });
                }
                notes.push([c, x, y, gi++]);
            }
        }
        if (jzP(ctx, 'play', true)) {
            var PL = 'var u=cl(time/Math.max(0.5,DUR))*' + R + ',r=Math.min(' + (R - 1) + ',Math.floor(u)),f=u-r;';
            axd_g(S, 'playhead', { paths: [[[0, -3.2 * g], [0, 3.2 * g]], [[-g * 0.4, -3.9 * g], [g * 0.4, -3.9 * g], [0, -3.2 * g]]], closed: true }, { fill: acc, stroke: acc, w: lw * 2 }, {
                pos: HD + PL + '[' + jzN(left) + '+' + jzN(sw) + '*cl(f),' + jzN(H / 2) + '+(r-' + jzN((R - 1) / 2) + ')*' + jzN(rowH) + ']', op: HD + '90*' + axd_ic(0.3, 0) });
        }
        if (sig) {
            var cy0 = H / 2 - (R - 1) / 2 * rowH;
            jzFade(ctx, axd_lbl(ctx, n, left + size * 0.5, cy0 - g, { size: g * 1.9, color: col, track: 0 }), 0.15, 0.4);
            jzFade(ctx, axd_lbl(ctx, 4, left + size * 0.5, cy0 + g, { size: g * 1.9, color: col, track: 0 }), 0.15, 0.4);
        }
        for (k = 0; k < notes.length; k++) {
            axd_put(ctx, notes[k][0], { font: font, size: size, sx: axd_sqz(notes[k][0]), x: notes[k][1], y: notes[k][2], mi: axd_miOf(notes[k][3], n) });
            bb = axd_bbc(bb, notes[k][1], notes[k][2], size / 2, size / 2);
        }
        return bb;
    }
});

/* ================================================================== 11 xdOverlap — 重なり連鎖
   one text block with negative tracking; the background-coloured edge is the text stroke under the fill (per character, so
   every glyph cuts into the one before it). Colours by glyph = fill-colour animators; breathing = a Tracking animator.
   The browser's reversed stacking order ('rev') cannot be done inside one text layer: later glyphs are always on top. */
axd_reg('xdOverlap', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['display'])), ov: rng.range(0.22, 0.32), cols: rng.pick(['alt', 'alt', 'mono', 'tri']), breathe: rng.chance(0.75), order: rng.pick(['fwd', 'fwd', 'rev']) }; },
    build: function (ctx) {
        var b = axd_base(ctx), W = b.W, H = b.H, sc = b.sc, M = b.M, port = b.port, HD = b.HD, i;
        var ov = jzP(ctx, 'ov', 0.27), L = axd_layRows(b.txt, W * 0.82, H * 0.6, { track: -ov, spw: 0.6, lead: 1.0, maxR: port ? 4 : 2, cap: M * 0.36 });
        if (!L.n) return null;
        var str = axd_rowsStr(L.rows), acc = axd_acc(sc), cols = jzP(ctx, 'cols', 'alt');
        var Lm = axd_T(ctx, str, { font: jzFontOf(ctx, 'font', 'display'), size: L.size, x: W / 2, y: H / 2, lead: 1.0, track: -ov, fitW: W * 0.82, fitH: H * 0.6, cap: M * 0.36 });
        var m = axd_m(Lm, str, 1.0), size = m.size;
        jzTextDoc(Lm, function (td) { td.applyStroke = true; td.strokeColor = jzHex(sc.bg); td.strokeWidth = size * 0.075; try { td.strokeOverFill = false; } catch (e) {} });
        jzAnchor(Lm);
        axd_anim(ctx, Lm, { mi: 0 });
        var cm = axd_charMap(L.rows), f1 = [], f2 = [];
        for (i = 0; i < cm.gi.length; i++) { f1.push(cm.gi[i] >= 0 && (cols === 'alt' ? cm.gi[i] % 2 === 1 : cm.gi[i] % 3 === 1)); f2.push(cm.gi[i] >= 0 && cm.gi[i] % 3 === 2); }
        if (cols !== 'mono' && acc !== sc.fg) jzCharColors(Lm, acc, f1, 'JZ Chain Colour');
        if (cols === 'tri') jzCharColors(Lm, axd_sub(sc), f2, 'JZ Chain Colour 2');
        if (jzP(ctx, 'breathe', true)) jzAnimator(Lm, 'JZ Breathe', [['ADBE Text Tracking Amount', 45 * (1 - ov)]], HD + 'Math.sin(time*1.1)*100');
        return axd_bb(W / 2 - m.w / 2, H / 2 - m.h / 2, W / 2 + m.w / 2, H / 2 + m.h / 2);
    }
});

/* ================================================================== 12 xdCyclic — 巡回ずらし
   every shifted row is one glyph layer whose position animator computes the cyclic column; a glyph that wraps fades out at
   one end and in at the other (the browser cross-fades two instances of it). */
axd_reg('xdCyclic', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['display', 'body'])), style: rng.pick(['dim', 'outline', 'dim']), move: rng.chance(0.75), per: rng.range(1.0, 1.6), dir: rng.pick([1, -1]), marks: rng.chance(0.7) }; },
    build: function (ctx) {
        var b = axd_base(ctx), W = b.W, H = b.H, sc = b.sc, M = b.M, port = b.port, lw = b.lw, HD = b.HD, r, s;
        var sl = axd_cells(b.txt), N = sl.length, n = axd_cnt(sl);
        if (!N) return null;
        var R = N >= 5 ? 5 : 3, cw, chh;
        if (!port) { cw = Math.min(W * 0.86 / N, M * 0.22); chh = cw * 1.2; if (R * chh > H * 0.8) { chh = H * 0.8 / R; cw = chh / 1.2; } }
        else { chh = Math.min(H * 0.82 / N, M * 0.22); cw = chh * 1.16; if (R * cw > W * 0.86) { cw = W * 0.86 / R; chh = cw / 1.16; } }
        var size = Math.min(cw, chh) * 0.84, mid = (R - 1) / 2, font = jzFontOf(ctx, 'font', 'display'), dir = jzP(ctx, 'dir', 1) < 0 ? -1 : 1, kind = jzP(ctx, 'style', 'dim');
        function XY(a, k) { return port ? [W / 2 - k * cw, H / 2 + (a - (N - 1) / 2) * chh] : [W / 2 + (a - (N - 1) / 2) * cw, H / 2 + k * chh]; }
        var cells = [], slot = [];
        for (s = 0; s < N; s++) if (!axd_isSp(sl[s])) { cells.push(sl[s]); slot.push(s); }
        var CX = 'var u=Math.max(0,time-0.6)/' + jzN(jzP(ctx, 'per', 1.3)) + ',cs=' + (jzP(ctx, 'move', true) ? 'Math.floor(u)+iocu(cl(fr(u)*2.6-1.6))' : '0') + ';';
        for (r = 0; r < R; r++) {
            var k = r - mid; if (!k) continue;
            var al = (0.62 - 0.17 * (Math.abs(k) - 1)) * (kind === 'dim' ? 0.9 : 0.75);
            var G = axd_G(ctx, cells, kind === 'dim' ? { font: font, size: size, color: jzMixHex(sc.bg, sc.fg, 0.3), opacity: al, name: 'shift row ' + k } :
                { font: font, size: size, fill: false, stroke: Math.max(1.5, size * 0.016), strokeColor: sc.fg, opacity: al, name: 'shift row ' + k });
            var P0 = XY(0, k), body = CX + 'var sl=' + jzArrExpr(slot) + '[i],o=' + jzN(k * dir) + '*(1+cs),nn=' + N + ',col=((sl+o)%nn+nn)%nn,ov=cl(col-(nn-1)),q;' +
                'if(ov<0.5){q=col-ov*0.6;a=1-ov;}else{q=-0.4+ov*0.4;a=ov;}' +
                (port ? 'x=' + jzN(P0[0]) + ';y=' + jzN(P0[1]) + '+q*' + jzN(chh) : 'x=' + jzN(P0[0]) + '+q*' + jzN(cw) + ';y=' + jzN(P0[1]));
            axd_GX(ctx, G, 'JZ Shift', HD, body, 'pa');
            jzFade(ctx, G.L, 0.08 * Math.abs(k), 0.4);
        }
        if (jzP(ctx, 'marks', true)) {
            var S = axd_fadeK(ctx, axd_S(ctx, 'row marks')), a0 = XY(-0.62, 0), a1 = XY(N - 0.38, 0), acc = axd_acc(sc);
            for (s = -1; s <= 1; s += 2) axd_g(S, 'mark ' + s, { paths: [port ? [[W / 2 + s * cw * 0.52, a0[1]], [W / 2 + s * cw * 0.52, a1[1]]] : [[a0[0], H / 2 + s * chh * 0.5], [a1[0], H / 2 + s * chh * 0.5]]] },
                { stroke: acc, w: lw * 1.6 }, { trim: HD + axd_ie(0.5, 0) + '*100' });
        }
        var bb = null, gi = 0;
        for (s = 0; s < N; s++) {
            if (axd_isSp(sl[s])) continue;
            var p = XY(s, 0);
            axd_put(ctx, sl[s], { font: font, size: size, sx: port ? 1 : axd_sqz(sl[s]), x: p[0], y: p[1], mi: axd_miOf(gi++, n) });
            bb = axd_bbc(bb, p[0], p[1], size / 2, size / 2);
        }
        return bb;
    }
});

/* ================================================================== 13 xdKaraoke — カラオケ送り
   one lyric layer per line in the sung colour; the "unsung" animator (fill off + outline colour, or the dim colour) is taken
   off glyph by glyph, with the glyph under the cursor blended — the browser wipes with a hard vertical edge instead. Sung
   glyphs of the outline variant keep a stroke in their own colour (slightly bolder). */
axd_reg('xdKaraoke', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['display', 'display', 'serif'])), un: rng.pick(['outline', 'dim', 'outline']), bar: rng.chance(0.6), clock: rng.chance(0.6), col: rng.pick(['accent', 'accent', 'fg']) }; },
    build: function (ctx) {
        var b = axd_base(ctx), W = b.W, H = b.H, sc = b.sc, M = b.M, port = b.port, lw = b.lw, HD = b.HD, i;
        if (!b.txt) return null;
        var fb = axd_fitBox(b.txt, W * 0.84, H * 0.5, 1.3, 0.03, port ? 4 : 2), lines = fb.text.split('\r'), LN = lines.length;
        var acc = axd_acc(sc), dim = jzP(ctx, 'un', 'outline') === 'dim', sung = jzP(ctx, 'col', 'accent') === 'accent' && acc !== sc.fg ? acc : sc.fg, unCol = dim ? jzMixHex(sc.bg, sc.fg, 0.34) : sc.fg;
        var R = axd_lines(ctx, lines, { font: jzFontOf(ctx, 'font', 'display'), est: fb.size, maxW: W * 0.84, cap: Math.min(M * 0.3, H * 0.5 / ((LN - 1) * 1.3 + 1)), track: 0.03, color: sung }), size = R.size;
        var cnt = [], total = 0, ys = [], at = 0, bb = null, t0 = b.inD * 0.6;
        for (i = 0; i < LN; i++) { cnt.push(Math.max(1, jzCount(lines[i]))); total += cnt[i]; ys.push(H / 2 + (i - (LN - 1) / 2) * size * 1.3); }
        var PX = 'var kp=cl((time-' + jzN(t0) + ')/' + jzN(Math.max(0.3, b.dur - t0 - b.outD - 0.12)) + ')*' + total + ';';
        for (i = 0; i < LN; i++) {
            var T = R.Ls[i];
            jzXf(T, 'ADBE Position').setValue([W / 2, ys[i]]);
            if (!dim) jzTextDoc(T, function (td) { td.applyStroke = true; td.strokeColor = jzHex(sung); td.strokeWidth = Math.max(1.5, size * 0.022); try { td.strokeOverFill = false; } catch (e) {} });
            axd_anim(ctx, T, { mi: i * 2 });
            jzAnimator(T, 'JZ Unsung', dim ? [['ADBE Text Fill Color', jzHex(unCol)]] : [['ADBE Text Fill Opacity', 0], ['ADBE Text Stroke Color', jzHex(unCol)]],
                HD + PX + 'var pl=cl((kp-' + at + ')/' + cnt[i] + ');(1-cl(pl*textTotal-(textIndex-1)))*100');
            at += cnt[i];
            bb = axd_bbc(bb, W / 2, ys[i], R.ws[i] / 2, size / 2);
        }
        if (jzP(ctx, 'bar', true)) {
            var S = axd_fadeK(ctx, axd_S(ctx, 'cursor'));
            axd_g(S, 'bar', { rect: [lw * 3, size * 1.2] }, { fill: acc }, {
                pos: HD + PX + 'var ws=' + jzArrExpr(R.ws) + ',cn=' + jzArrExpr(cnt) + ',ys=' + jzArrExpr(ys) + ',at=0,x=-9999,y=0;for(var i=0;i<ws.length;i++){var pl=cl((kp-at)/cn[i]);at+=cn[i];' +
                    'if(pl>0&&pl<1){x=' + jzN(W / 2) + '-ws[i]/2-' + jzN(size * 0.05) + '+(ws[i]+' + jzN(size * 0.1) + ')*pl;y=ys[i];}}[x,y]' });
        }
        if (jzP(ctx, 'clock', true)) {
            var C = axd_lbl(ctx, '0:00.0 / 0:00.0', W / 2, H / 2 + (LN / 2) * size * 1.3 + axd_lsz(ctx) * 1.6, { color: axd_sub(sc), name: 'clock' });
            try {
                C.property('ADBE Text Properties').property('ADBE Text Document').expression = 'function f(t){var s=Math.floor(t%60);return Math.floor(t/60)+":"+(s<10?"0":"")+s+"."+Math.floor(t*10%10);}' +
                    'var d=' + jzN(b.dur) + ';f(Math.min(time,d))+" / "+f(d)';
            } catch (e2) {}
            jzFade(ctx, C, 0.1, 0.4);
        }
        return bb;
    }
});

/* ================================================================== 14 xdPassing — すれ違い */
axd_reg('xdPassing', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['display', 'serif'])), travel: rng.range(0.08, 0.12), rails: rng.chance(0.75), dir: rng.pick([1, -1]), acc: rng.chance(0.35) }; },
    build: function (ctx) {
        var b = axd_base(ctx), W = b.W, H = b.H, sc = b.sc, M = b.M, port = b.port, lw = b.lw, HD = b.HD, i, k;
        if (!b.txt) return null;
        var n = jzCount(b.txt), T = jzP(ctx, 'travel', 0.1) * W, lines = null, est = 0, acc = axd_acc(sc), dir = jzP(ctx, 'dir', 1) < 0 ? -1 : 1;
        for (k = 2; k <= (port && n > 6 ? 4 : 2); k++) {
            var ls = axd_linesOf(b.txt, k).split('\r'), s = Math.min(M * 0.25, H * 0.7 / (ls.length * 1.5));
            for (i = 0; i < ls.length; i++) s = Math.min(s, axd_fitEst(ls[i], W * 0.9 - T, H * 0.3, 0.03, 1.2));
            if (!lines || s > est * 1.04) { lines = ls; est = s; }
        }
        var Rn = lines.length, cols = [];
        for (i = 0; i < Rn; i++) cols.push(jzP(ctx, 'acc', false) && i === 1 ? acc : sc.fg);
        var R = axd_lines(ctx, lines, { font: jzFontOf(ctx, 'font', 'display'), est: est, maxW: W * 0.9 - T, cap: Math.min(M * 0.25, H * 0.3, H * 0.7 / (Rn * 1.5)), track: 0.03, colors: cols }), size = R.size, pitch = size * 1.5;
        var S = jzP(ctx, 'rails', true) ? axd_S(ctx, 'rails') : null, bb = null, x0 = W * 0.05, x1 = W * 0.95, a = size * 0.07;
        for (i = 0; i < Rn; i++) {
            var sg = (i % 2 ? -1 : 1) * dir, y = H / 2 + (i - (Rn - 1) / 2) * pitch, ry = y + size * 0.68;
            if (S) {
                axd_g(S, 'rail ' + i, { paths: [sg > 0 ? [[x0, ry], [x1, ry]] : [[x1, ry], [x0, ry]]] }, { stroke: axd_sub(sc), w: lw * 1.2, a: 0.6 }, { trim: HD + axd_ie(0.6, 0) + '*100' });
                for (k = 0; k < 4; k++) {
                    var CH = 'var q=fr(' + jzN(k / 4) + '+' + jzN(sg * 0.09) + '*time);';
                    axd_g(S, 'chevron ' + i + '.' + k, { paths: [[[-sg * a, -a], [0, 0], [-sg * a, a]]] }, { stroke: acc, w: lw * 1.6 }, {
                        pos: HD + CH + '[' + jzN(x0) + '+q*' + jzN(x1 - x0) + ',' + jzN(ry) + ']', op: HD + CH + 'Math.sin(Math.PI*q)*' + axd_ie(0.6, 0) + '*100' });
                }
            }
            jzXf(R.Ls[i], 'ADBE Position').setValue([W / 2, y]);
            axd_anim(ctx, R.Ls[i], { mi: i * 3 });
            axd_ride(R.Ls[i], 'JZ Pass', HD, 'dx=' + jzN(sg * T) + '*(cl(time/Math.max(0.5,DUR))-0.5)', Math.max(W, H));
            bb = axd_bbc(bb, W / 2, y, R.ws[i] / 2 + T / 2, size / 2);
        }
        if (S) { axd_fadeK(ctx, S); S.moveToEnd(); }
        return bb;
    }
});

/* ================================================================== 15 xdChecker — チェッカー
   the blinking square is one extra square (accent) that jumps to a random dark square every 0.55 s. */
axd_reg('xdChecker', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['display'])), sq: rng.pick(['solid', 'solid', 'outline', 'dot']), col: rng.pick(['fg', 'accent', 'dim']), start: rng.pick([0, 0, 1]), blink: rng.chance(0.65) }; },
    build: function (ctx) {
        var b = axd_base(ctx), W = b.W, H = b.H, sc = b.sc, M = b.M, lw = b.lw, HD = b.HD, C, R, r, c, k;
        var gl = axd_glyphs(b.txt), n = gl.length, best = null, start = jzP(ctx, 'start', 0), kind = jzP(ctx, 'sq', 'solid'), cm = jzP(ctx, 'col', 'fg');
        if (!n) return null;
        for (C = 2; C <= 9; C++) for (R = 1; R <= 9; R++) {
            var cap = start === 0 ? Math.ceil(C * R / 2) : Math.floor(C * R / 2); if (cap < n) continue;
            var cl0 = Math.min(W * 0.86 / C, H * 0.8 / R, M * 0.3), score = cl0 * (1 - 0.07 * (cap - n)) * (R === 1 ? 0.8 : 1);
            if (!best || score > best.score) best = { C: C, R: R, cell: cl0, score: score };
        }
        if (!best) return null;
        C = best.C; R = best.R;
        var cell = best.cell, ox = W / 2 - C * cell / 2, oy = H / 2 - R * cell / 2, size = cell * 0.8, font = jzFontOf(ctx, 'font', 'display');
        var pc = cm === 'accent' ? axd_acc(sc) : (cm === 'dim' ? jzMixHex(sc.bg, sc.fg, 0.3) : sc.fg), acc = cm === 'accent' ? sc.fg : axd_acc(sc);
        var sq = [], put = [], gi = 0, bb = null, h = cell * 0.46;
        for (r = 0; r < R; r++) for (c = 0; c < C; c++) {
            var x = ox + (c + 0.5) * cell, y = oy + (r + 0.5) * cell;
            if ((r + c) % 2 === start) { if (gi < n) { put.push([gl[gi], x, y, gi]); gi++; } }
            else sq.push([x, y, r + c]);
        }
        function shape() { return kind === 'dot' ? { ell: [h * 1.72, h * 1.72] } : { rect: [h * 2, h * 2] }; }
        var S = axd_S(ctx, 'squares');
        for (k = 0; k < sq.length; k++) axd_g(S, 'sq ' + k, shape(), kind === 'outline' ? { stroke: pc, w: lw * 2 } : { fill: pc }, {
            p: [sq[k][0], sq[k][1]], sc: HD + 'var e=ob(cl((time-' + jzN(sq[k][2] * 0.035) + ')/0.32),1.5)*K*100;[e,e]' });
        if (jzP(ctx, 'blink', true) && sq.length) {
            var pos = [];
            for (k = 0; k < sq.length; k++) pos.push([sq[k][0], sq[k][1]]);
            var SH = axd_S(ctx, 'hot square');
            axd_g(SH, 'hot', shape(), kind === 'outline' ? { fill: acc, stroke: acc, w: lw * 2 } : { fill: acc }, {
                pos: 'var a=' + jzArrExpr(pos) + ';seedRandom(' + ((b.seed % 9973) + 7) + '+Math.floor(time/0.55),true);a[Math.min(a.length-1,Math.floor(random(a.length)))]',
                sc: HD + '[K*100,K*100]' });
            axd_opx(SH, 'time>0.6?value:0');
        }
        for (k = 0; k < put.length; k++) {
            axd_put(ctx, put[k][0], { font: font, size: size, sx: axd_sqz(put[k][0]), x: put[k][1], y: put[k][2], mi: axd_miOf(put[k][3], n) });
            bb = axd_bbc(bb, put[k][1], put[k][2], size / 2, size / 2);
        }
        return bb;
    }
});
