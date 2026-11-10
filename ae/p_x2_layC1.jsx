// ================================================================ pack x2layC part 1 (AE port of src/11p_x2_layC.js, entries 1-15)
// xcBrowser, xcPlayer, xcLoading, xcMapPin, xcSignpost, xcVending, xcFolder, xcScoreboard, xcWeather, xcBattery, xcPopups,
// xcIncoming, xcGauge, xcSheet, xcChipCard  (+ the helpers shared with part 2)
//
// How these are built (the lyric inside everyday objects, screens and interfaces):
// - a "kit" (axc_kit) is ONE shape layer whose anchor == position (layer space == comp space). The browser's drawing calls
//   (rect / rounded rect / circle / line / polygon / arc) become shape groups of that layer, added in reverse so the paint
//   order is the browser's. The browser's pose() (the whole object sliding / scaling / swinging in) is the layer transform.
// - every small animation (bars filling, lines drawing, lamps blinking, needles, counters) is an expression on a group
//   transform, a Trim Paths or a text source, written against the cut-local time like the browser's lt.
// - labels are small text layers parented to the kit; the lyric is a normal text layer parented to the kit, so the cut's
//   enter / hold / exit expressions stay untouched and the text can be retyped.
// - everything except the lyric is main-pass only in the browser (ghost: false): axc_reg marks those layers jzNoGhost.
// - seeded details use a port of the browser's J.h / J.r hash, so the same plan gives the same details.

// expression helpers appended after jzTH(ctx): the browser pack's inE / inC / inB, smoothstep, in-out cubic, value noise,
// fractional part and the 12 fps step counter
var AXC_FX = 'function inE(d,dl){return oe((time-(dl||0))/d);}' +
    'function inC(d,dl){return oc((time-(dl||0))/d);}' +
    'function inB(d,dl,s){var q=cl((time-(dl||0))/d);return q<=0?0:(q>=1?1:ob(q,s||1.4));}' +
    'function sm(a,b,x){var q=cl((x-a)/(b-a));return q*q*(3-2*q);}' +
    'function ioc(x){x=cl(x);return x<0.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;}' +
    'function n1(x,s){var i=Math.floor(x),f=x-i,w=f*f*(3-2*f),a=hh(i*1.31+s*0.017)*2-1,b=hh((i+1)*1.31+s*0.017)*2-1;return a+(b-a)*w;}' +
    'function fr(x){return x-Math.floor(x);}' +
    'var ST=Math.floor(time*12+0.001);\n';
var AXC_LYR = [];

/* ---------------------------------------------------------------- seeded numbers (the browser's J.h / J.r / J.rs) */
function axc_h(a, b, c, d, e) {
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
function axc_r01(a, b, c, d, e) { return axc_h(a, b, c, d, e) / 4294967296; }
function axc_rs(a, b, c, d, e) { return axc_r01(a, b, c, d, e) * 2 - 1; }

/* ---------------------------------------------------------------- colours (same rules as the browser pack) */
function axc_on(sc, fill) {
    var c = [sc.bg, sc.fg, sc.ink, sc.sub], best = null, bv = 0, i, k;
    for (i = 0; i < c.length; i++) { if (!c[i] || c[i] === fill) continue; k = jzContrast(c[i], fill); if (k > bv) { bv = k; best = c[i]; } }
    return bv >= 3 ? best : (jzLum(fill) > 0.45 ? '#000000' : '#FFFFFF');
}
function axc_plateCol(sc, pref) { for (var i = 0; i < pref.length; i++) if (pref[i] && jzContrast(pref[i], sc.bg) >= 1.7) return pref[i]; return sc.fg; }
function axc_paper(sc) { return axc_plateCol(sc, [sc.fg, sc.ink, sc.accent]); }
function axc_acc(sc, fill) { return jzContrast(sc.accent, fill) >= 2 ? sc.accent : (sc.accent2 && jzContrast(sc.accent2, fill) >= 2 ? sc.accent2 : axc_on(sc, fill)); }
function axc_acc2(sc, fill) { return sc.accent2 && jzContrast(sc.accent2, fill) >= 2 ? sc.accent2 : axc_acc(sc, fill); }
function axc_dim(sc) { return jzMixHex(sc.bg, sc.fg, 0.17); }
function axc_pick(sc, k) { return axc_plateCol(sc, k === 'accent' ? [sc.accent, sc.ink, sc.fg] : (k === 'ink' ? [sc.ink, sc.accent, sc.fg] : [sc.fg, sc.ink])); }

/* ---------------------------------------------------------------- small helpers */
function axc_mot(ctx) { return ctx.fx && ctx.fx.motion != null ? ctx.fx.motion : 0.7; }
function axc_base(ctx) {
    var c = ctx.cut, W = ctx.W, H = ctx.H, M = Math.min(W, H);
    return { W: W, H: H, sc: ctx.sc, c: c, M: M, port: W < H, txt: jzTrim(String(c.text || '')) || ' ', lw: Math.max(1, M * 0.0016),
        ls: jzClamp(M * 0.019, 11 * ctx.u, 24 * ctx.u), no: (c.line | 0) + 1, seed: c.seed || 0, dur: Math.max(0.1, c.dur || 1) };
}
function axc_font(ctx) { return jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'display')); }
function axc_cut(t, k) { var a = jzChars(jzTrim(String(t || '').replace(/\s+/g, ' '))); return a.length > k ? a.slice(0, k).join('') + '\u2026' : a.join(''); }
function axc_mmss(t) { t = Math.max(0, t); return Math.floor(t / 60) + ':' + jzPad(Math.floor(t % 60), 2); }
function axc_boxIn(W, H, ar, fw, fh) { var w = Math.min(W * fw, H * fh * ar); return [w, w / ar]; }
function axc_q(s) { return '"' + String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/[\r\n]+/g, ' ') + '"'; }
function axc_inE(d, dl) { return 'inE(' + jzN(d) + ',' + jzN(dl || 0) + ')'; }
function axc_inC(d, dl) { return 'inC(' + jzN(d) + ',' + jzN(dl || 0) + ')'; }
function axc_inB(d, dl, s) { return 'inB(' + jzN(d) + ',' + jzN(dl || 0) + ',' + jzN(s || 1.4) + ')'; }
// parent without converting the child's values: every kit layer has anchor == position (layer space == comp space)
function axc_parent(L, P) { try { L.setParentWithJump(P); } catch (e) { try { L.parent = P; } catch (e2) { jzWarn('parent: ' + e2.toString()); } } }

/* ---------------------------------------------------------------- text: line breaking and fitting */
// advance width in em (the browser measures real fonts; this only picks the line count — sizes come from AE's own measure)
function axc_adv(ch) {
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
function axc_meas(str, track, lead) {
    var ls = String(str).split(/\r\n|\r|\n/), w = 0.01, i, j;
    for (i = 0; i < ls.length; i++) { var a = jzChars(ls[i]), lw = 0; for (j = 0; j < a.length; j++) lw += axc_adv(a[j]) + (track || 0); if (lw > w) w = lw; }
    return { w: w, h: 1 + (ls.length - 1) * (lead || 1.2) };
}
// J.splitLines, but never leave a line of punctuation only
function axc_splitL(t, per) {
    var ls = jzSplitLines(String(t), Math.max(1, per)).split('\r'), out = [], i, j;
    for (i = 0; i < ls.length; i++) {
        var cs = jzChars(ls[i]), all = true;
        for (j = 0; j < cs.length; j++) if (!(jzIsPunct(cs[j]) || cs[j] === '\u30FC' || cs[j] === ' ')) { all = false; break; }
        if (out.length && all) out[out.length - 1] += ls[i]; else out.push(ls[i]);
    }
    return out.join('\r');
}
function axc_linesOf(t, L) { var s = jzTrim(String(t || '')), n = jzChars(s).length; return L <= 1 ? s : axc_splitL(s, Math.ceil(n / L)); }
function axc_toLines(t, L) { var a = axc_linesOf(t, L).split('\r'), o = [], i; for (i = 0; i < a.length; i++) if (jzTrim(a[i]).length) o.push(a[i]); return o.length ? o : [jzTrim(String(t || '')) || ' ']; }
// the line count (1..maxL) that gives the biggest type inside a box
function axc_fitBox(text, bw, bh, track, lead, maxL) {
    var t = jzTrim(String(text || '')), n = jzChars(t).length, best = null, L;
    for (L = 1; L <= Math.min(maxL || 4, Math.max(1, n)); L++) {
        var tt = axc_linesOf(t, L);
        if (tt.split('\r').length < L && best) continue;
        var m = axc_meas(tt, track, lead), s = Math.min(bw / m.w, bh / m.h);
        if (!best || s > best.size * 1.04) best = { text: tt, size: s };
    }
    return best || { text: t || ' ', size: 10 };
}
// width of one line at size 100 (measured by After Effects on a throw-away layer)
function axc_measW(ctx, str, font, track) {
    var p = jzText(ctx, str, { font: font, size: 100, color: '#FFFFFF', x: -9999, y: -9999, track: track || 0 }), w = Math.max(1, jzRect(p).width);
    try { p.remove(); } catch (e) {}
    return w;
}
function axc_textOf(L) { try { return String(L.property('ADBE Text Properties').property('ADBE Text Document').value.text); } catch (e) { return ''; } }
// the lyric fitted into a box centred on (x, y) (ex.align 'left': x is the left edge); not animated yet — see axc_lyric
function axc_fitText(ctx, text, font, x, y, bw, bh, color, o, maxL, cap, ex) {
    o = o || {}; ex = ex || {};
    bw = Math.max(10, bw); bh = Math.max(10, bh);
    var lead = o.lead || 1.2, track = o.track == null ? 0.02 : o.track, f = axc_fitBox(text, bw, bh, track, lead, maxL || 3);
    var nl = f.text.split('\r').length, hEm = 1 + (nl - 1) * lead;
    var L = jzText(ctx, f.text, { font: font, size: 100, color: color, x: x, y: y, track: track, align: ex.align, leading: nl > 1 ? 100 * lead : null, rot: ex.rot, name: jzFlat(text) });
    var r = jzRect(L), size = Math.max(4, Math.min(bw / Math.max(1, r.width) * 100, bh / hEm, cap || 1e9));
    jzTextDoc(L, function (td) { td.fontSize = size; if (nl > 1) { try { td.autoLeading = false; td.leading = size * lead; } catch (e) {} } });
    jzAnchor(L, ex.align);
    return L;
}
// make a text layer the lyric: ride on a kit (optional), take the cut's enter / hold / exit and treatment
function axc_lyric(ctx, g, L, mi) {
    if (g) axc_parent(L, g.S);
    AXC_LYR.push(L);
    jzAnimate(ctx, L, { mi: mi || 0 });
    return jzBB(L);
}
function axc_fitMain(ctx, g, text, font, x, y, bw, bh, color, o, maxL, cap, ex) {
    return axc_lyric(ctx, g, axc_fitText(ctx, text, font, x, y, bw, bh, color, o, maxL, cap, ex), ex && ex.mi);
}

/* ---------------------------------------------------------------- the drawing kit
   o: { cx, cy   pivot of the pose (default: comp centre)
        a        expression (0..1) for the layer's alpha, default 'K' (follows the cut's exit)
        X        expression code put after the header (shared variables)
        pose     { dx, dy, s, sx, sy, rot } expressions — the browser's pose()
        rotv, sxv static rotation (deg) / horizontal scale factor, parent: another kit }
   shape calls take a static alpha k and an optional animation object:
        { org:[x,y] | from:'l'|'r'|'t'|'b'   origin of the group (scale / rotation centre)
          s, sx, sy, rot, dx, dy, a           expressions (factors, degrees, px, 0..1)
          rotv static rotation, trim / trim0 / sweep expressions 0..1, rE radius expression, swE stroke width expression, X code } */
function axc_kit(ctx, name, o) {
    o = o || {};
    var cx = o.cx == null ? ctx.W / 2 : o.cx, cy = o.cy == null ? ctx.H / 2 : o.cy, p = o.pose || {};
    var S = jzShapeLayer(ctx, name, cx, cy);
    jzXf(S, 'ADBE Anchor Point').setValue([cx, cy]);
    var g = { ctx: ctx, S: S, H: jzTH(ctx) + AXC_FX + (o.X || ''), a: o.a || 'K', ops: [], cx: cx, cy: cy };
    if (o.rotv) jzXf(S, 'ADBE Rotate Z').setValue(o.rotv);
    if (o.sxv) jzXf(S, 'ADBE Scale').setValue([100 * o.sxv, 100]);
    if (p.dx || p.dy) jzSetExpr(jzXf(S, 'ADBE Position'), g.H + '[value[0]+(' + (p.dx || '0') + '),value[1]+(' + (p.dy || '0') + ')]');
    if (p.s || p.sx || p.sy) jzSetExpr(jzXf(S, 'ADBE Scale'), g.H + 'var s=' + (p.s || '1') + ';[value[0]*s*(' + (p.sx || '1') + '),value[1]*s*(' + (p.sy || '1') + ')]');
    if (p.rot) jzSetExpr(jzXf(S, 'ADBE Rotate Z'), g.H + 'value+(' + p.rot + ')');
    jzSetExpr(jzXf(S, 'ADBE Opacity'), g.H + '100*cl(' + g.a + ')');
    if (o.parent) axc_parent(S, o.parent.S);
    g.r = function (x, y, w, h, c, k, an) { axc_rect(g, x, y, w, h, 0, c, null, 0, k, an); };
    g.rr = function (x, y, w, h, rad, c, k, an) { axc_rect(g, x, y, w, h, rad, c, null, 0, k, an); };
    g.rs = function (x, y, w, h, rad, c, lw, k, an) { axc_rect(g, x, y, w, h, rad, null, c, lw, k, an); };
    g.c = function (x, y, r, c, k, an) { axc_ell(g, [[x, y, r]], c, null, 0, k, an); };
    g.cs = function (x, y, r, c, lw, k, an) { axc_ell(g, [[x, y, r]], null, c, lw, k, an); };
    g.mc = function (list, c, k, an) { if (list.length) axc_ell(g, list, c, null, 0, k, an); };
    g.l = function (x0, y0, x1, y1, c, lw, k, an) { axc_path(g, [[[x0, y0], [x1, y1]]], false, null, c, lw, k, an); };
    g.pl = function (pts, c, lw, k, an) { axc_path(g, [pts], false, null, c, lw, k, an); };
    g.ml = function (list, c, lw, k, an) { if (list.length) axc_path(g, list, false, null, c, lw, k, an); };
    g.p = function (pts, c, k, an) { axc_path(g, [pts], true, c, null, 0, k, an); };
    g.arc = function (x, y, r, a0, a1, c, lw, k, an) {
        k = k == null ? 1 : Math.min(1, k);
        if (k <= 0.003 || r <= 0 || a1 <= a0) return;
        g.ops.push({ t: 'ell', list: [[x, y, r]], org: [x, y], stroke: c, sw: lw, k: k, o: an, rot: a0 + 90, trim: Math.min(100, (a1 - a0) / 3.6) });
    };
    g.t = function (text, x, y, lo) { return axc_label(g, text, x, y, lo); };
    g.done = function () { axc_flush(g); return g; };
    return g;
}
function axc_rect(g, x, y, w, h, rad, fill, stroke, sw, k, an) {
    k = k == null ? 1 : Math.min(1, k);
    if (k <= 0.003 || !(w > 0) || !(h > 0)) return;
    var f = an && an.from, org = an && an.org ? an.org : (f === 'l' ? [x, y + h / 2] : (f === 'r' ? [x + w, y + h / 2] : (f === 't' ? [x + w / 2, y] : (f === 'b' ? [x + w / 2, y + h] : [x + w / 2, y + h / 2]))));
    g.ops.push({ t: 'rect', x: x, y: y, w: w, h: h, rad: rad, org: org, fill: fill, stroke: stroke, sw: sw, k: k, o: an });
}
function axc_ell(g, list, fill, stroke, sw, k, an) {
    k = k == null ? 1 : Math.min(1, k);
    if (k <= 0.003) return;
    g.ops.push({ t: 'ell', list: list, org: an && an.org ? an.org : [list[0][0], list[0][1]], fill: fill, stroke: stroke, sw: sw, k: k, o: an });
}
function axc_path(g, list, closed, fill, stroke, sw, k, an) {
    k = k == null ? 1 : Math.min(1, k);
    if (k <= 0.003) return;
    g.ops.push({ t: 'path', list: list, closed: closed, org: an && an.org ? an.org : [0, 0], fill: fill, stroke: stroke, sw: sw, k: k, o: an });
}
function axc_flush(g) {
    for (var i = g.ops.length - 1; i >= 0; i--) {
        try { axc_emit(g, g.ops[i], i); } catch (e) { jzWarn('x2layC shape: ' + e.toString()); }
    }
    g.ops = [];
}
// one drawing call -> one shape group (each item is fully set up before its next sibling is added)
function axc_emit(g, q, idx) {
    var o = q.o || {}, H = g.H + (o.X || ''), gr = jzGrp(g.S, q.t + ' ' + (idx + 1)), ox = q.org[0], oy = q.org[1], i, j, it;
    if (q.t === 'rect') {
        jzAddRect(gr, Math.max(0.5, q.w), Math.max(0.5, q.h), Math.max(0, Math.min(q.rad || 0, q.w / 2, q.h / 2)), q.x + q.w / 2 - ox, q.y + q.h / 2 - oy);
    } else if (q.t === 'ell') {
        for (i = 0; i < q.list.length; i++) {
            it = jzAddEllipse(gr, Math.max(0.5, q.list[i][2] * 2), Math.max(0.5, q.list[i][2] * 2), q.list[i][0] - ox, q.list[i][1] - oy);
            if (o.rE && i === 0) jzSetExpr(it.property('ADBE Vector Ellipse Size'), H + 'var r=Math.max(0.25,' + o.rE + ');[2*r,2*r]');
        }
    } else {
        for (i = 0; i < q.list.length; i++) {
            var pts = [];
            for (j = 0; j < q.list[i].length; j++) pts.push([q.list[i][j][0] - ox, q.list[i][j][1] - oy]);
            jzAddPath(gr, pts, q.closed);
        }
    }
    if (q.stroke) { it = jzAddStroke(gr, q.stroke, Math.max(0.3, q.sw || 1)); if (o.swE) jzSetExpr(it.property('ADBE Vector Stroke Width'), H + 'Math.max(0.1,' + o.swE + ')'); }
    if (q.fill) jzAddFill(gr, q.fill);
    if (q.trim != null || o.trim || o.trim0 || o.sweep) {
        it = jzVecs(gr).addProperty('ADBE Vector Filter - Trim');
        var base = q.trim == null ? 100 : q.trim;
        if (o.sweep || o.trim) jzSetExpr(it.property('ADBE Vector Trim End'), H + jzN(base) + '*cl(' + (o.sweep || o.trim) + ')');
        else it.property('ADBE Vector Trim End').setValue(base);
        if (o.trim0) jzSetExpr(it.property('ADBE Vector Trim Start'), H + '100*cl(' + o.trim0 + ')');
    }
    var tg = jzGX(gr), rv = (q.rot || 0) + (o.rotv || 0);
    tg.property('ADBE Vector Position').setValue([ox, oy]);
    if (o.dx || o.dy) jzSetExpr(tg.property('ADBE Vector Position'), H + '[' + jzN(ox) + '+(' + (o.dx || '0') + '),' + jzN(oy) + '+(' + (o.dy || '0') + ')]');
    if (o.s || o.sx || o.sy) jzSetExpr(tg.property('ADBE Vector Scale'), H + 'var s=' + (o.s || '1') + ';[100*s*(' + (o.sx || '1') + '),100*s*(' + (o.sy || '1') + ')]');
    if (rv) tg.property('ADBE Vector Rotation').setValue(rv);
    if (o.rot) jzSetExpr(tg.property('ADBE Vector Rotation'), H + jzN(rv) + '+(' + o.rot + ')');
    if (q.k < 0.999) tg.property('ADBE Vector Group Opacity').setValue(q.k * 100);
    if (o.a) jzSetExpr(tg.property('ADBE Vector Group Opacity'), H + jzN(q.k * 100) + '*cl(' + o.a + ')');
}
// small text (labels, read-outs); lo: { color, size, align, track, font, alpha, a (expr), src (text expression), X, leading, rot }
function axc_label(g, text, x, y, lo) {
    lo = lo || {};
    text = String(text);
    var al = lo.alpha == null ? 1 : Math.min(1, lo.alpha), ctx = g.ctx;
    if (!text.length || al <= 0.003) return null;
    var L = jzText(ctx, text, { font: lo.font || jzMonoF(ctx), size: Math.max(2, lo.size || jzClamp(Math.min(ctx.W, ctx.H) * 0.019, 11 * ctx.u, 24 * ctx.u)), color: lo.color || ctx.sc.sub,
        x: x, y: y, align: lo.align || 'left', track: lo.track == null ? 0.1 : lo.track, rot: lo.rot, leading: lo.leading });
    axc_parent(L, g.S);
    jzSetExpr(jzXf(L, 'ADBE Opacity'), g.H + (lo.X || '') + jzN(al * 100) + '*cl(' + g.a + ')' + (lo.a ? '*cl(' + lo.a + ')' : ''));
    if (lo.src) { try { L.property('ADBE Text Properties').property('ADBE Text Document').expression = g.H + (lo.X || '') + lo.src; } catch (e) { jzWarn('x2layC label: ' + e.toString()); } }
    return L;
}
// greeked text: rows of bars (e = expression 0..1 for the width)
function axc_greek(g, x, y, w, rows, pitch, c, seed, e, th, k0) {
    for (var r = 0; r < Math.min(rows, 40); r++) {
        var k = r === rows - 1 && rows > 1 ? 0.35 + 0.3 * axc_r01(seed, r, 3) : 0.8 + 0.2 * axc_r01(seed, r, 5);
        g.r(x, y + r * pitch, w * k, pitch * (th || 0.36), c, k0 == null ? 1 : k0, e ? { from: 'l', sx: e } : null);
    }
}
// register: every layer of the build except the lyric is main-pass only (the browser draws them with ghost off)
function axc_reg(key, def) {
    var b = def.build;
    def.build = function (ctx) {
        AXC_LYR = [];
        var bb = b(ctx), keep = {}, i;
        for (i = 0; i < AXC_LYR.length; i++) { try { keep[AXC_LYR[i].index] = 1; } catch (e) {} }
        for (i = 1; i <= ctx.comp.numLayers; i++) if (!keep[i]) jzNoGhost(ctx.comp.layer(i));
        AXC_LYR = [];
        return bb;
    };
    jzReg('layout', key, def);
}

/* ================================================================== 1 xcBrowser — ブラウザ窓 */
axc_reg('xcBrowser', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['display', 'body'])), tabs: rng.int(2, 3), page: rng.pick(['hero', 'article', 'hero']), ctl: rng.pick(['mac', 'win']) }; },
    build: function (ctx) {
        var b = axc_base(ctx), W = b.W, H = b.H, sc = b.sc, c = b.c, M = b.M, port = b.port, txt = b.txt, lw = b.lw, ls = b.ls, i, s;
        var font = axc_font(ctx), ww = W * (port ? 0.9 : 0.84), wh = H * (port ? 0.62 : 0.8), x0 = (W - ww) / 2, y0 = (H - wh) / 2;
        var win = axc_paper(sc), ink = axc_on(sc, win), chrome = jzMixHex(win, ink, 0.16), faint = jzMixHex(win, ink, 0.2), ac = axc_acc(sc, win);
        var r = M * 0.018, th = M * 0.058, uh = M * 0.064;
        var g = axc_kit(ctx, 'browser', { a: 'inC(0.2)*K', pose: { s: '0.94+0.06*inE(0.45)', dy: '(1-inE(0.45))*' + jzN(M * 0.03) } });
        g.rr(x0 + M * 0.014, y0 + M * 0.018, ww, wh, r, sc.dim, 0.6);
        g.rr(x0, y0, ww, wh, r, chrome);
        g.rr(x0, y0 + th, ww, wh - th, r, win); g.r(x0, y0 + th, ww, r, win);
        var mac = jzP(ctx, 'ctl', 'mac') === 'mac', tw = Math.min(ww * 0.26, M * 0.3), tx0 = x0 + (mac ? M * 0.15 : M * 0.02), tabs = jzP(ctx, 'tabs', 2);
        for (i = 0; i < tabs; i++) {
            var tx = tx0 + i * (tw + M * 0.008), te = axc_inE(0.35, 0.08 + i * 0.07);
            if (tx + tw > x0 + ww - (mac ? 0 : M * 0.16)) break;
            if (i === 0) {
                g.rr(tx, y0 + th * 0.2, tw, th, r * 0.7, win, 1, { from: 'l', sx: te });
                g.t(axc_cut(c.lineText || txt, 7), tx + tw * 0.1, y0 + th * 0.62, { font: jzBodyF(ctx), color: ink, size: ls * 0.95, track: 0.02, a: 'inC(0.3,0.25)' });
            } else g.r(tx + tw * 0.1, y0 + th * 0.52, tw * 0.5, th * 0.14, faint, 1, { from: 'l', sx: te });
        }
        if (mac) {
            var dots = [ac, axc_acc2(sc, chrome), jzMixHex(chrome, ink, 0.4)];
            for (i = 0; i < 3; i++) g.c(x0 + M * 0.035 + i * M * 0.032, y0 + th * 0.52, M * 0.01, dots[i]);
        } else {
            var qx = x0 + ww - M * 0.03, qy = y0 + th * 0.5, u = M * 0.008;
            g.ml([[[qx - u, qy - u], [qx + u, qy + u]], [[qx - u, qy + u], [qx + u, qy - u]], [[qx - M * 0.09 - u, qy + u], [qx - M * 0.09 + u, qy + u]]], ink, lw * 1.6);
            g.rs(qx - M * 0.045 - u, qy - u, u * 2, u * 2, 0, ink, lw * 1.4);
        }
        // address bar: the URL is typed, the page loading bar runs
        var uy = y0 + th + uh / 2, ux = x0 + ww * 0.13, uw = ww * 0.74;
        g.rr(ux, uy - uh * 0.3, uw, uh * 0.6, uh * 0.3, chrome);
        for (s = 0; s < 2; s++) { var ax = x0 + ww * (0.035 + s * 0.045), d = (s ? 1 : -1) * M * 0.007; g.pl([[ax - d, uy - M * 0.009], [ax + d, uy], [ax - d, uy + M * 0.009]], ink, lw * 1.6, s ? 0.4 : 1); }
        var url = 'https://lyrics/line-' + jzPad(b.no, 2);
        g.t(url, ux + uh * 0.35, uy, { color: ink, size: ls * 0.95, track: 0.04, src: 'var s=' + axc_q(url) + ',n=Math.floor(cl((time-0.1)/0.5)*s.length);s.substr(0,n)+(n<s.length?"|":"")' });
        g.c(x0 + ww - ww * 0.06, uy, M * 0.012, faint);
        g.r(x0, y0 + th + uh - lw * 1.5, ww, lw * 3, ac, 1, { from: 'l', sx: 'oc(time/0.9)', a: '1-sm(1,1.3,time)' });
        g.l(x0, y0 + th + uh, x0 + ww, y0 + th + uh, faint, lw);
        // page
        var py = y0 + th + uh, ph = wh - th - uh, article = jzP(ctx, 'page', 'hero') === 'article' && !port, ge = 'inE(0.5,0.2)', bb;
        if (article) {
            var ix = x0 + ww * 0.68, iy = py + ph * 0.1, iw = ww * 0.27, ih = ph * 0.8;
            g.rr(ix, iy, iw, ih, r * 0.6, faint, 1, { from: 't', sy: ge });
            g.c(ix + iw * 0.7, iy + ih * 0.22, iw * 0.09, win, 0.8, { a: ge });
            g.p([[ix, iy + ih], [ix + iw * 0.4, iy + ih * 0.5], [ix + iw * 0.62, iy + ih * 0.74], [ix + iw * 0.8, iy + ih * 0.6], [ix + iw, iy + ih * 0.8], [ix + iw, iy + ih]], jzMixHex(win, ink, 0.34), 1, { org: [ix, iy], sy: ge });
            g.r(x0 + ww * 0.05, py + ph * 0.1, ww * 0.1, ph * 0.035, ac, 1, { from: 'l', sx: ge });
            axc_greek(g, x0 + ww * 0.05, py + ph * 0.76, ww * 0.56, 3, ph * 0.055, faint, b.seed, ge);
            g.done();
            return axc_fitMain(ctx, g, txt, font, x0 + ww * 0.05, py + ph * 0.44, ww * 0.58, ph * 0.5, ink, null, 3, ph * 0.3, { align: 'left' });
        }
        g.r(x0 + ww * 0.05, py + ph * 0.07, M * 0.03, M * 0.03, ac);
        for (i = 0; i < 3; i++) g.r(x0 + ww * 0.95 - (i + 1) * ww * 0.09, py + ph * 0.07 + M * 0.01, ww * 0.06, M * 0.01, faint, 1, { from: 'l', sx: ge });
        for (i = 0; i < 2; i++) { var bw = ww * (i ? 0.3 : 0.44); g.r(W / 2 - bw / 2, py + ph * (0.75 + i * 0.045), bw, ph * 0.016, faint, 1, { sx: ge }); }
        g.rr(W / 2 - ww * 0.09, py + ph * 0.86, ww * 0.18, ph * 0.075, ph * 0.04, ac, 1, { sx: ge });
        g.done();
        bb = axc_fitMain(ctx, g, txt, font, W / 2, py + ph * 0.44, ww * 0.86, ph * 0.5, ink, null, port ? 4 : 2, ph * 0.34);
        return bb;
    }
});

/* ================================================================== 2 xcPlayer — 再生画面 */
axc_reg('xcPlayer', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['display', 'body', 'serif'])), art: rng.pick(['disc', 'sun', 'bars']), card: rng.chance(0.6), flip: rng.chance(0.3), at: rng.range(0.15, 0.5) }; },
    build: function (ctx) {
        var b = axc_base(ctx), W = b.W, H = b.H, sc = b.sc, M = b.M, txt = b.txt, lw = b.lw, ls = b.ls, i, s, port = W < H * 1.2;
        var font = axc_font(ctx), card = !!jzP(ctx, 'card', true), flip = !!jzP(ctx, 'flip', false), art = jzP(ctx, 'art', 'disc'), at = jzP(ctx, 'at', 0.3);
        var cw = W * 0.86, ch = H * (W < H ? 0.76 : (port ? 0.8 : 0.62)), x0 = (W - cw) / 2, y0 = (H - ch) / 2;
        var win = card ? axc_paper(sc) : sc.bg, ink = card ? axc_on(sc, win) : sc.fg, faint = jzMixHex(win, ink, 0.22), ac = axc_acc(sc, win), pd = M * 0.045;
        var total = Math.max(b.dur / Math.max(0.2, 1 - at), b.dur + 1), t0 = total * at * 0.6;
        var g = axc_kit(ctx, 'player', { a: 'inC(0.2)*K', X: 'var pe=inE(0.5,0.15),pp=cl((' + jzN(t0) + '+time)/' + jzN(total) + ');' });
        if (card) g.rr(x0, y0, cw, ch, M * 0.03, win, 1, { dy: '(1-inE(0.45))*' + jzN(M * 0.04) });
        var asz = port ? Math.min(cw * 0.66, ch * 0.4) : Math.min(ch - pd * 2, cw * 0.36);
        var ax = port ? W / 2 - asz / 2 : (flip ? x0 + cw - pd - asz : x0 + pd), ay = port ? y0 + pd : y0 + (ch - asz) / 2;
        var rx0 = port ? x0 + pd : (flip ? x0 + pd : ax + asz + pd), rx1 = port ? x0 + cw - pd : (flip ? ax - pd : x0 + cw - pd), rw = rx1 - rx0;
        // progress bar that really runs + times
        var py = port ? y0 + ch * 0.76 : y0 + ch * 0.66;
        g.rr(rx0, py - lw * 2, rw, lw * 4, lw * 2, faint, 1, { from: 'l', sx: 'pe' });
        g.rr(rx0, py - lw * 2, rw, lw * 4, lw * 2, ac, 1, { from: 'l', sx: 'pp*pe' });
        g.c(rx0, py, M * 0.011, ink, 1, { dx: jzN(rw) + '*pp*pe' });
        g.t(axc_mmss(t0), rx0, py + ls * 1.5, { color: ink, alpha: 0.8, a: 'inC(0.3,0.3)', size: ls * 0.9, src: 'var t=Math.max(0,' + jzN(t0) + '+time);Math.floor(t/60)+":"+("0"+Math.floor(t%60)).slice(-2)' });
        g.t(axc_mmss(total), rx1, py + ls * 1.5, { color: ink, alpha: 0.8, a: 'inC(0.3,0.3)', align: 'right', size: ls * 0.9 });
        // transport (pause while playing, play once the cut is leaving)
        var cy = port ? y0 + ch * 0.89 : y0 + ch * 0.85, cx = (rx0 + rx1) / 2, u = M * 0.022, be = 'inB(0.4,0.25)', pc = axc_on(sc, ink);
        g.c(cx, cy, u * 2, ink, 1, { s: be });
        g.p([[cx - u * 0.5, cy - u * 0.8], [cx + u * 0.9, cy], [cx - u * 0.5, cy + u * 0.8]], pc, 1, { a: be + '*(PO>0?1:0)' });
        g.r(cx - u * 0.6, cy - u * 0.75, u * 0.42, u * 1.5, pc, 1, { a: be + '*(PO>0?0:1)' });
        g.r(cx + u * 0.18, cy - u * 0.75, u * 0.42, u * 1.5, pc, 1, { a: be + '*(PO>0?0:1)' });
        for (s = -1; s <= 1; s += 2) {
            var bx = cx + s * Math.min(rw * 0.3, u * 6);
            g.p([[bx - s * u * 0.9, cy - u * 0.7], [bx + s * u * 0.2, cy], [bx - s * u * 0.9, cy + u * 0.7]], ink, 1, { a: be });
            g.r(bx + s * u * 0.35 - u * 0.13, cy - u * 0.7, u * 0.26, u * 1.4, ink, 1, { a: be });
        }
        var ny = port ? ay + asz + pd * 0.75 : y0 + pd + ls * 0.4;
        g.t('\u266A', rx0, ny, { color: ac, a: 'inC(0.3,0.3)', font: jzBodyF(ctx), size: ls * 1.2 });
        g.r(rx0 + ls * 1.6, ny - ls * 0.18, Math.min(rw * 0.3, M * 0.2), ls * 0.36, faint, 1, { from: 'l', sx: 'pe' });
        g.done();
        // cover art
        var acx = ax + asz / 2, acy = ay + asz / 2, hs = asz / 2, dk = jzMixHex(ac, axc_on(sc, ac), 0.75);
        var gc = axc_kit(ctx, 'player cover', { cx: acx, cy: acy, a: 'inC(0.2)*K', pose: { s: 'inB(0.5,0.05,1.2)' } });
        gc.rr(acx - hs, acy - hs, hs * 2, hs * 2, asz * 0.05, ac);
        if (art === 'disc') {
            for (i = 0; i < 4; i++) gc.cs(acx, acy, hs * (0.82 - i * 0.16), dk, lw * 1.5, 0.8);
            gc.c(acx, acy, hs * 0.2, dk); gc.c(acx, acy, hs * 0.05, ac);
            gc.l(acx + hs * 0.26, acy, acx + hs * 0.8, acy, dk, lw * 2, 0.7, { org: [acx, acy], rot: 'time*1.6*57.2958' });
        } else if (art === 'sun') {
            gc.c(acx, acy - hs * 0.08, hs * 0.5, dk);
            for (i = 0; i < 5; i++) gc.r(acx - hs * 0.6, acy + hs * (0.02 + i * 0.105), hs * 1.2, hs * (0.028 + i * 0.012), ac);
            gc.r(acx - hs * 0.8, acy + hs * 0.62, hs * 1.6, hs * 0.03, dk);
        } else {
            for (i = 0; i < 9; i++) gc.r(acx - hs * 0.72 + i * hs * 0.165, acy + hs * 0.7 - hs * 1.4, hs * 0.1, hs * 1.4, dk, 1, { from: 'b', sy: 'Math.max(0,(0.3+1.1*n1(time*2.2+' + jzN(i * 3.1) + ',SD+' + (i * 37) + '))/1.4)' });
        }
        gc.done();
        if (port) return axc_fitMain(ctx, null, txt, font, W / 2, (ay + asz + pd * 1.2 + py - pd * 0.5) / 2, rw, py - pd * 0.5 - (ay + asz + pd * 1.2), ink, null, 3, asz * 0.4);
        var ty0 = y0 + pd + ls * 1.6, ty1 = py - pd * 0.6;
        return axc_fitMain(ctx, null, txt, font, rx0, (ty0 + ty1) / 2, rw, ty1 - ty0, ink, null, 3, ch * 0.3, { align: 'left' });
    }
});

/* ================================================================== 3 xcLoading — 読み込み中 */
axc_reg('xcLoading', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['body', 'display'])), bar: rng.pick(['bar', 'blocks', 'ring']), bw: rng.pick([0, 1]), end: rng.pick([0.87, 0.99, 1, 1]) }; },
    build: function (ctx) {
        var b = axc_base(ctx), W = b.W, H = b.H, sc = b.sc, M = b.M, port = b.port, txt = b.txt, lw = b.lw, ls = b.ls, i;
        var font = axc_font(ctx), bar = jzP(ctx, 'bar', 'bar'), dw = W * (port ? 0.88 : 0.62), dh = port ? H * 0.44 : H * 0.66, x0 = (W - dw) / 2, y0 = (H - dh) / 2;
        var win = axc_paper(sc), ink = axc_on(sc, win), tb = jzP(ctx, 'bw', 0) ? ink : axc_acc(sc, win), ton = axc_on(sc, tb), faint = jzMixHex(win, ink, 0.22), ac = axc_acc(sc, win);
        var th = M * 0.062, sh = M * 0.016;
        var g = axc_kit(ctx, 'loading dialog', { a: 'inC(0.15)*K', X: 'var p=ioc(time/' + jzN(Math.max(0.5, b.dur * 0.8)) + ')*' + jzN(jzP(ctx, 'end', 1)) + ';', pose: { s: '0.8+0.2*inB(0.4,0,1.3)' } });
        g.r(x0 + sh, y0 + sh, dw, dh, sc.dim, 0.8);
        g.r(x0, y0, dw, dh, win); g.rs(x0, y0, dw, dh, 0, ink, lw * 2);
        g.r(x0, y0, dw, th, tb);
        g.t('NOW LOADING', x0 + th * 0.4, y0 + th / 2, { color: ton, size: ls, track: 0.25 });
        var qx = x0 + dw - th * 0.5, qy = y0 + th / 2, u = th * 0.16;
        g.ml([[[qx - u, qy - u], [qx + u, qy + u]], [[qx - u, qy + u], [qx + u, qy - u]]], ton, lw * 2);
        var bh = dh - th, px = x0 + dw * 0.08, pw = dw * 0.84, py = y0 + th + bh * 0.68, phh = bh * 0.1;
        if (bar === 'bar') { g.rs(px, py, pw, phh, 0, ink, lw * 1.6); g.r(px + lw * 3, py + lw * 3, pw - lw * 6, phh - lw * 6, ac, 1, { from: 'l', sx: 'p' }); }
        else if (bar === 'blocks') {
            var nb = port ? 12 : 18, cw = pw / nb;
            g.rs(px, py, pw, phh, 0, ink, lw * 1.6);
            for (i = 0; i < nb; i++) g.r(px + i * cw + lw * 3, py + lw * 3, cw - lw * 4, phh - lw * 6, ac, 1, { a: '(' + i + '<Math.floor(p*' + nb + '+0.001))?1:0' });
        } else {
            var rr = phh * 0.62, rcx = px + rr + lw * 2, rcy = py + phh / 2;
            g.cs(rcx, rcy, rr, faint, lw * 5);
            g.arc(rcx, rcy, rr, -90, 270, ac, lw * 5, 1, { sweep: 'p' });
            g.arc(rcx, rcy, rr * 0.5, 0, 100, ink, lw * 2, 1, { rot: 'time*300' });
            axc_greek(g, rcx + rr * 1.8, rcy - phh * 0.24, pw * 0.4, 2, phh * 0.44, faint, b.seed, 'inE(0.4,0.2)', 0.36, 1);
        }
        g.t('100%', px + pw, py - ls * 0.9, { color: ink, align: 'right', size: ls * 1.1, src: 'Math.round(p*100)+"%"' });
        g.t('PLEASE WAIT...', px, py - ls * 0.9, { color: ink, size: ls * 0.9, alpha: 0.75, src: 'p>=1?"DONE":"PLEASE WAIT"+"...".substr(0,ST%4)' });
        var bw2 = Math.min(dw * 0.26, M * 0.24), bh2 = bh * 0.11;
        g.rs(x0 + dw * 0.92 - bw2, y0 + dh - bh2 - bh * 0.05, bw2, bh2, bh2 * 0.15, ink, lw * 1.6);
        g.t('CANCEL', x0 + dw * 0.92 - bw2 / 2, y0 + dh - bh2 / 2 - bh * 0.05, { color: ink, align: 'center', size: ls * 0.95, src: 'p>=1?"OK":"CANCEL"' });
        g.done();
        return axc_fitMain(ctx, g, txt, font, W / 2, y0 + th + bh * 0.3, dw * 0.86, bh * 0.44, ink, null, 3, bh * 0.3);
    }
});

/* ================================================================== 4 xcMapPin — 地図ピン */
axc_reg('xcMapPin', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['display', 'body'])), px: rng.pick([0.26, 0.5, 0.74]), tone: rng.pick(['paper', 'accent', 'paper']), la: rng.int(10, 59), lo: rng.int(100, 159) }; },
    build: function (ctx) {
        var b = axc_base(ctx), W = b.W, H = b.H, sc = b.sc, M = b.M, port = b.port, txt = b.txt, lw = b.lw, ls = b.ls, seed = b.seed, i;
        var font = axc_font(ctx), road = axc_dim(sc), Ppx = jzP(ctx, 'px', 0.5);
        var pr = M * 0.042, px = W * (port ? 0.5 + (Ppx - 0.5) * 0.7 : Ppx), py = H * (port ? 0.8 : 0.88), pc = axc_acc(sc, sc.bg), hy = py - pr * 2.5;
        // the street map draws itself
        var g0 = axc_kit(ctx, 'map', { a: 'K' });
        g0.rr(W * (0.08 + 0.5 * axc_r01(seed, 1)), H * (0.1 + 0.3 * axc_r01(seed, 2)), W * 0.26, H * 0.24, M * 0.03, jzMixHex(sc.bg, sc.accent, 0.13), 1, { a: 'inC(0.5,0.1)' });
        for (i = 0; i < 7; i++) {
            var hz = i % 2 === 0, k = (Math.floor(i / 2) + 0.2 + 0.6 * axc_r01(seed, i, 9)) / 4, rw = M * (i < 2 ? 0.03 : 0.014), sl = axc_rs(seed, i, 4) * 0.08, tr = { trim: axc_inE(0.7, i * 0.05) };
            if (hz) g0.l(0, H * (k + sl), W, H * (k - sl), road, rw, 1, tr); else g0.l(W * (k + sl), H, W * (k - sl), 0, road, rw, 1, tr);
        }
        g0.l(0, H * 0.2, W, H * (0.9 - 0.4 * axc_r01(seed, 7)), road, M * 0.02, 1, { trim: 'inE(0.9,0.1)' });
        for (i = 0; i < 2; i++) g0.cs(px, py, pr, pc, lw * 2, 0.7, { X: 'var k=fr(time*0.6+' + jzN(i * 0.5) + ');', rE: jzN(pr) + '*(0.3+k*1.6)', a: '(time>0.4?1:0)*(1-k)' });
        g0.done();
        // the pin drops
        var gp = axc_kit(ctx, 'map pin', { cx: px, cy: py, X: 'var pe=cl((time-0.05)/0.4);', a: 'cl(pe*4)*K', pose: { dy: '-(pe>=1?0:(1-ob(pe,1.6))*' + jzN(H * 0.5) + ')' } });
        gp.p([[px - pr * 0.82, hy + pr * 0.58], [px + pr * 0.82, hy + pr * 0.58], [px, py]], pc); gp.c(px, hy, pr, pc); gp.c(px, hy, pr * 0.4, sc.bg);
        gp.done();
        // the callout opens out of the pin
        var cw = W * (port ? 0.88 : 0.7), chh = H * (port ? 0.36 : 0.48), cx = W / 2 + (px - W / 2) * 0.3, by = py - pr * 4.6, cy0 = by - chh;
        var win = jzP(ctx, 'tone', 'paper') === 'accent' ? axc_pick(sc, 'accent') : axc_paper(sc), ink = axc_on(sc, win), faint = jzMixHex(win, ink, 0.3);
        var g = axc_kit(ctx, 'map callout', { cx: px, cy: by + pr * 0.9, a: 'cl((time-0.22)/0.12)*K', pose: { s: 'Math.max(0.01,inB(0.42,0.22,1.25))' } });
        g.rr(cx - cw / 2, cy0, cw, chh, M * 0.03, win);
        g.p([[px - pr * 0.9, by - 1], [px + pr * 0.9, by - 1], [px, by + pr * 0.95]], win);
        var fy = cy0 + chh * 0.87;
        g.l(cx - cw * 0.44, cy0 + chh * 0.76, cx + cw * 0.44, cy0 + chh * 0.76, faint, lw);
        g.t('N 35.' + jzP(ctx, 'la', 40) + '\u00B0  E 139.' + jzP(ctx, 'lo', 120) + '\u00B0', cx - cw * 0.44, fy, { color: ink, size: ls * 0.95, alpha: 0.8 });
        g.t((1 + axc_r01(seed, 5) * 8).toFixed(1) + ' km', cx + cw * 0.44, fy, { color: ink, size: ls * 0.95, align: 'right', alpha: 0.8 });
        g.done();
        return axc_fitMain(ctx, g, txt, font, cx, cy0 + chh * 0.4, cw * 0.86, chh * 0.58, ink, null, 3, chh * 0.4);
    }
});

/* ================================================================== 5 xcSignpost — 道しるべ */
axc_reg('xcSignpost', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['display', 'body'])), first: rng.int(0, 1), c: rng.int(0, 2), tilt: rng.chance(0.5) }; },
    build: function (ctx) {
        var b = axc_base(ctx), W = b.W, H = b.H, sc = b.sc, M = b.M, port = b.port, txt = b.txt, lw = b.lw, i, j, bb = null;
        var font = axc_font(ctx), n = jzCount(txt), L = port ? (n <= 3 ? 1 : (n <= 7 ? 2 : (n <= 12 ? 3 : 4))) : (n <= 5 ? 1 : (n <= 10 ? 2 : 3));
        var lines = axc_toLines(txt, L), k = lines.length, ws = [];
        var bh = Math.min(M * (port ? 0.23 : 0.25), (H * 0.7) / k / 1.16), gap = bh * 0.16, maxT = W * (port ? 0.52 : 0.5), size = bh * 0.62;
        for (i = 0; i < k; i++) { ws.push(axc_measW(ctx, lines[i], font, 0.03)); size = Math.min(size, maxT / ws[i] * 100); }
        var tot = k * bh + (k - 1) * gap, sy0 = H * 0.45 - tot / 2, off = W * (port ? 0.025 : 0.06), tl = bh * 0.42;
        var plates = [axc_paper(sc), axc_pick(sc, 'accent'), axc_pick(sc, 'ink')], pw = M * 0.022, pole = jzMixHex(sc.bg, sc.fg, 0.45);
        var first = jzP(ctx, 'first', 0), pc = jzP(ctx, 'c', 0), tilt = !!jzP(ctx, 'tilt', false);
        var g0 = axc_kit(ctx, 'signpost pole', { a: 'K', X: 'var pe=inE(0.5);' });
        g0.r(W / 2 - pw / 2, sy0 - bh * 0.25, pw, H * 0.97 - sy0 + bh * 0.25, pole, 1, { from: 'b', sy: 'pe' });
        g0.c(W / 2, sy0 - bh * 0.25, pw * 0.9, pole, 1, { s: 'pe' });
        g0.l(W / 2 - M * 0.16, H * 0.97, W / 2 + M * 0.16, H * 0.97, pole, lw * 3, 1, { org: [W / 2, H * 0.97], sx: 'pe' });
        g0.done();
        for (i = 0; i < k; i++) {
            var dir = (i + first) % 2 ? 1 : -1, plate = plates[(i + pc) % 3], ink = axc_on(sc, plate), tw = ws[i] * size / 100, bw = tw + bh * 0.7;
            var cx = W / 2 + dir * off, yc = sy0 + i * (bh + gap) + bh / 2, xa = cx - bw / 2, xb = cx + bw / 2, d = 0.06 + i * 0.09, ins = bh * 0.09, pts, q;
            var g = axc_kit(ctx, 'sign ' + (i + 1), { cx: W / 2, cy: yc, a: 'cl((time-' + jzN(d) + ')/0.15)*K', X: 'var e=inE(0.5,' + jzN(d) + ');',
                pose: { dx: jzN(-dir * W * 0.3) + '*(1-e)', rot: tilt ? jzN(dir) + '*(1.2+(1-e)*6)' : null } });
            if (dir > 0) {
                pts = [[xa, yc - bh / 2], [xb, yc - bh / 2], [xb + tl, yc], [xb, yc + bh / 2], [xa, yc + bh / 2]];
                q = [[xa + ins, yc - bh / 2 + ins], [xb - ins * 0.4, yc - bh / 2 + ins], [xb + tl - ins * 1.4, yc], [xb - ins * 0.4, yc + bh / 2 - ins], [xa + ins, yc + bh / 2 - ins], [xa + ins, yc - bh / 2 + ins]];
            } else {
                pts = [[xb, yc - bh / 2], [xa, yc - bh / 2], [xa - tl, yc], [xa, yc + bh / 2], [xb, yc + bh / 2]];
                q = [[xb - ins, yc - bh / 2 + ins], [xa + ins * 0.4, yc - bh / 2 + ins], [xa - tl + ins * 1.4, yc], [xa + ins * 0.4, yc + bh / 2 - ins], [xb - ins, yc + bh / 2 - ins], [xb - ins, yc - bh / 2 + ins]];
            }
            g.p(pts, plate);
            g.pl(q, ink, lw * 1.5, 0.5);
            for (j = -1; j <= 1; j += 2) g.c(W / 2, yc + j * 0.3 * bh, bh * 0.028, ink, 0.55);
            g.done();
            var T = jzText(ctx, lines[i], { font: font, size: Math.max(4, size), color: ink, x: cx, y: yc, track: 0.03 });
            bb = jzUnion(bb, axc_lyric(ctx, g, T, i));
        }
        return bb;
    }
});

/* ================================================================== 6 xcVending — 自販機 */
axc_reg('xcVending', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['display', 'body'])), c: rng.pick(['paper', 'accent', 'ink']), nb: rng.int(5, 8), round: rng.chance(0.5), price: rng.pick([100, 120, 150]) }; },
    build: function (ctx) {
        var b = axc_base(ctx), W = b.W, H = b.H, sc = b.sc, M = b.M, port = b.port, txt = b.txt, lw = b.lw, ls = b.ls, seed = b.seed, i;
        var font = axc_font(ctx), bw = W * (port ? 0.86 : 0.8), bh = H * (port ? 0.74 : 0.86), x0 = (W - bw) / 2, y0 = (H - bh) / 2;
        var body = axc_pick(sc, jzP(ctx, 'c', 'paper')), on = axc_on(sc, body), mid = jzMixHex(body, on, 0.28), dk = jzMixHex(body, on, 0.8), ac = axc_acc(sc, body);
        var m = M * 0.035, wh = bh * (port ? 0.52 : 0.56), nb = port ? Math.min(5, jzP(ctx, 'nb', 6)) : jzP(ctx, 'nb', 6), round = !!jzP(ctx, 'round', true), price = jzP(ctx, 'price', 120);
        var g = axc_kit(ctx, 'vending machine', { a: 'inC(0.2)*K', pose: { dy: '(1-inE(0.5))*' + jzN(H * 0.08) } });
        g.rr(x0, y0, bw, bh, M * 0.025, body);
        g.r(x0 + m, y0 + m, bw - m * 2, wh, dk);
        g.r(x0 + m + lw * 3, y0 + m + lw * 3, bw - m * 2 - lw * 6, wh - lw * 6, sc.bg, 1, { a: 'cl((time-0.2)/0.25)*((time<0.55&&ST%2)?0.6:1)' });
        // priced buttons lighting in turn
        var ry = y0 + m + wh + bh * 0.035, rh = bh * (port ? 0.15 : 0.16), cw = (bw - m * 2) / nb, hot = 'Math.floor(time*2.2+' + (Math.abs(seed) % 7) + ')%' + nb;
        for (i = 0; i < nb; i++) {
            var cx = x0 + m + cw * (i + 0.5), be = axc_inB(0.3, 0.2 + i * 0.04), br = Math.min(cw * 0.3, rh * 0.22), j, cols = [dk, ac];
            g.rr(cx - cw * 0.36, ry, cw * 0.72, rh * 0.36, rh * 0.05, mid, 1, { a: be });
            g.t(String(price + (axc_h(seed, i, 3) % 4) * 10), cx, ry + rh * 0.18, { color: on, align: 'center', size: Math.min(ls, cw * 0.22), track: 0.02, a: be });
            for (j = 0; j < 2; j++) {
                var an = { s: be, a: j ? '(' + hot + '==' + i + ')?1:0' : null };
                if (round) g.c(cx, ry + rh * 0.72, br, cols[j], 1, an); else g.rr(cx - br * 1.2, ry + rh * 0.72 - br * 0.7, br * 2.4, br * 1.4, br * 0.3, cols[j], 1, an);
            }
        }
        // tray + coin slot
        var ty = ry + rh + bh * 0.03, th = y0 + bh - m - ty;
        g.rr(x0 + m, ty, bw * 0.56, th, th * 0.12, dk); g.r(x0 + m + bw * 0.03, ty + th * 0.22, bw * 0.5, th * 0.5, jzMixHex(dk, body, 0.25));
        g.t('PUSH', x0 + m + bw * 0.28, ty + th * 0.47, { color: body, align: 'center', size: Math.min(ls, th * 0.3), track: 0.4, alpha: 0.9 });
        var sx = x0 + bw - m - bw * 0.1;
        g.rr(sx - bw * 0.02, ty + th * 0.08, bw * 0.014, th * 0.5, bw * 0.005, dk); g.c(sx - bw * 0.1, ty + th * 0.33, Math.min(th * 0.24, bw * 0.03), mid); g.rr(sx - bw * 0.16, ty + th * 0.72, bw * 0.2, th * 0.2, th * 0.05, mid);
        g.done();
        return axc_fitMain(ctx, g, txt, font, W / 2, y0 + m + wh / 2, (bw - m * 2) * 0.88, wh * 0.78, sc.fg, null, port ? 4 : 3, wh * 0.5);
    }
});

/* ================================================================== 7 xcFolder — フォルダ */
axc_reg('xcFolder', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['display', 'body'])), c: rng.pick(['accent', 'ink', 'paper']), right: rng.chance(0.4), sheets: rng.int(1, 3), tilt: rng.pick([0, -2, 2]) }; },
    build: function (ctx) {
        var b = axc_base(ctx), W = b.W, H = b.H, sc = b.sc, M = b.M, port = b.port, txt = b.txt, lw = b.lw, ls = b.ls, i;
        var font = axc_font(ctx), dm = axc_boxIn(W, H, port ? 1.05 : 1.55, 0.86, 0.68), fw = dm[0], fh = dm[1], x0 = (W - fw) / 2, y0 = (H - fh) / 2 + fh * 0.07;
        var front = axc_pick(sc, jzP(ctx, 'c', 'accent')), ink = axc_on(sc, front), back = jzMixHex(front, ink, 0.3), paper = jzMixHex(ink, front, 0.12), pfaint = jzMixHex(paper, front, 0.5);
        var th = fh * 0.1, tw = fw * 0.36, r = M * 0.02, right = !!jzP(ctx, 'right', false), sheets = jzP(ctx, 'sheets', 2), A = 'inC(0.2)*K';
        var gb = axc_kit(ctx, 'folder back', { a: A, pose: { dy: '(1-inE(0.5))*' + jzN(H * 0.06), rot: jzN(jzP(ctx, 'tilt', 0)) + '*inE(0.5)' } });
        var ta = right ? x0 + fw - tw : x0, sgn = right ? -1 : 1, tA = right ? x0 + fw : x0;
        gb.p([[tA, y0 + r], [tA, y0 - th], [tA + sgn * (tw - th * 0.7), y0 - th], [tA + sgn * tw, y0], [tA + sgn * tw, y0 + r]], back);
        gb.rr(x0, y0, fw, fh, r, back);
        gb.t('FILE_' + jzPad(b.no, 2), ta + tw * 0.45, y0 - th * 0.45, { color: axc_on(sc, back), align: 'center', size: Math.min(ls, th * 0.42) });
        gb.done();
        // sheets slide up out of the folder
        for (i = sheets - 1; i >= 0; i--) {
            var sw = fw * (0.8 - i * 0.05), sx = x0 + fw * 0.08 + i * fw * 0.05, rise = fh * (0.09 + i * 0.05);
            var gs = axc_kit(ctx, 'folder sheet ' + (i + 1), { cx: sx + sw / 2, cy: y0 + fh * 0.4, parent: gb, a: A, X: 'var se=inE(0.55,' + jzN(0.18 + i * 0.1) + ');',
                pose: { rot: jzN((i % 2 ? 1 : -1) * (1.5 + i)) + '*se', dy: jzN(-rise) + '*se' } });
            gs.r(sx, y0 + fh * 0.03, sw, fh * 0.5, i ? jzMixHex(paper, front, 0.25) : paper);
            axc_greek(gs, sx + sw * 0.07, y0 + fh * 0.065, sw * 0.6, 2, fh * 0.035, pfaint, b.seed + i, 'se');
            gs.done();
        }
        var fy = y0 + fh * 0.15, gf = axc_kit(ctx, 'folder front', { parent: gb, a: A });
        gf.rr(x0, fy, fw, fh - (fy - y0), r, front);
        gf.l(x0 + fw * 0.05, fy + fh * 0.07, x0 + fw * 0.95, fy + fh * 0.07, ink, lw, 0.3);
        gf.done();
        return axc_fitMain(ctx, gf, txt, font, W / 2, fy + (fh - (fy - y0)) * 0.54, fw * 0.84, (fh - (fy - y0)) * 0.66, ink, null, 3, fh * 0.36);
    }
});

/* ================================================================== 8 xcScoreboard — 得点板 */
axc_reg('xcScoreboard', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['display', 'body'])), c: rng.pick(['ink', 'ink', 'paper']), s1: rng.int(0, 9), s2: rng.int(0, 9), legs: rng.chance(0.6) }; },
    build: function (ctx) {
        var b = axc_base(ctx), W = b.W, H = b.H, sc = b.sc, M = b.M, port = b.port, txt = b.txt, lw = b.lw, ls = b.ls, i;
        var font = axc_font(ctx), legs = !!jzP(ctx, 'legs', true), bw = W * 0.88, bh = H * (port ? 0.62 : 0.7), x0 = (W - bw) / 2, y0 = (H - bh) / 2 - (legs ? H * 0.03 : 0);
        var board = axc_pick(sc, jzP(ctx, 'c', 'ink')), on = axc_on(sc, board), rec = jzMixHex(board, on, 0.14), ac = axc_acc(sc, board), mono = jzMonoF(ctx);
        var g = axc_kit(ctx, 'scoreboard', { a: 'inC(0.2)*K', pose: { dy: '-(1-inE(0.5))*' + jzN(H * 0.07) } });
        if (legs) for (i = 0; i < 2; i++) g.r(x0 + bw * (i ? 0.78 : 0.22) - M * 0.012, y0 + bh, M * 0.024, H - y0 - bh, jzMixHex(sc.bg, sc.fg, 0.4));
        g.r(x0, y0, bw, bh, board); g.rs(x0 + M * 0.012, y0 + M * 0.012, bw - M * 0.024, bh - M * 0.024, 0, on, lw * 1.5, 0.5);
        var score = function (x, y, w, h, lab, v) {
            g.t(lab, x + w / 2, y + h * 0.1, { color: on, align: 'center', size: Math.min(ls * 1.1, h * 0.12), track: 0.3 });
            g.r(x, y + h * 0.22, w, h * 0.78, rec);
            g.t(String(v), x + w / 2, y + h * 0.62, { color: ac, align: 'center', size: Math.min(h * 0.6, w * 0.9), track: 0, font: mono, src: 'String(Math.round(' + jzN(v) + '*oc((time-0.2)/0.8)))' });
        };
        // innings row filling in
        var nI = port ? 7 : 9, iy = y0 + bh * (port ? 0.8 : 0.76), ih = bh * (port ? 0.13 : 0.17), ix = x0 + bw * 0.05, iw = (bw * 0.9) / nI;
        for (i = 0; i < nI; i++) {
            g.rs(ix + i * iw, iy, iw, ih, 0, on, lw, 0.5);
            g.t(String(i + 1), ix + i * iw + iw * 0.14, iy + ih * 0.2, { color: on, size: Math.min(ls * 0.7, ih * 0.22), alpha: 0.6 });
            g.t(String(axc_h(b.seed, i, 8) % 4), ix + (i + 0.5) * iw, iy + ih * 0.58, { color: on, align: 'center', size: ih * 0.5, track: 0, a: 'time>' + jzN(0.35 + i * 0.16) + '?1:0' });
        }
        if (port) {
            score(x0 + bw * 0.06, y0 + bh * 0.05, bw * 0.4, bh * 0.2, 'HOME', jzP(ctx, 's1', 3)); score(x0 + bw * 0.54, y0 + bh * 0.05, bw * 0.4, bh * 0.2, 'GUEST', jzP(ctx, 's2', 2));
            g.done();
            return axc_fitMain(ctx, g, txt, font, W / 2, y0 + bh * 0.535, bw * 0.86, bh * 0.4, on, null, 4, bh * 0.2);
        }
        score(x0 + bw * 0.05, y0 + bh * 0.1, bw * 0.14, bh * 0.56, 'HOME', jzP(ctx, 's1', 3)); score(x0 + bw * 0.81, y0 + bh * 0.1, bw * 0.14, bh * 0.56, 'GUEST', jzP(ctx, 's2', 2));
        g.done();
        return axc_fitMain(ctx, g, txt, font, W / 2, y0 + bh * 0.4, bw * 0.5, bh * 0.52, on, null, 3, bh * 0.34);
    }
});

/* ================================================================== 9 xcWeather — 天気予報 */
// sky icon into kit g; ao = extra alpha expression (or null); anim = the big icon (rays turn, cloud drifts, rain falls)
function axc_sky(g, type, x, y, u, c1, c2, back, ao, anim) {
    var i, an;
    if (type === 'sun') {
        g.c(x, y, u * 0.5, c1, 1, { a: ao });
        var rays = [];
        for (i = 0; i < 8; i++) { var a = i * Math.PI / 4; rays.push([[x + Math.cos(a) * u * 0.68, y + Math.sin(a) * u * 0.68], [x + Math.cos(a) * u * 0.98, y + Math.sin(a) * u * 0.98]]); }
        g.ml(rays, c1, u * 0.09, 1, { org: [x, y], a: ao, rot: anim ? 'time*0.5*57.2958' : null });
        return;
    }
    if (type === 'moon') {
        g.c(x, y, u * 0.72, c1, 1, { a: ao }); g.c(x + u * 0.34, y - u * 0.2, u * 0.62, back, 1, { a: ao });
        for (i = 0; i < 3; i++) g.c(x + u * (0.5 + 0.3 * axc_rs(i, 5)), y + u * (0.5 * axc_rs(i, 7)), u * 0.05, c2, 1, { a: ao, s: anim ? '1+(ST+' + i + ')%2' : null });
        return;
    }
    var dx = anim ? 'Math.sin(time*0.8)*' + jzN(u * 0.06) : null;
    if (type === 'cloudsun') g.c(x + u * 0.4, y - u * 0.36, u * 0.36, c1, 1, { a: ao });
    g.mc([[x - u * 0.38, y + u * 0.12, u * 0.36], [x + u * 0.05, y - u * 0.12, u * 0.48], [x + u * 0.48, y + u * 0.16, u * 0.32]], c2, 1, { a: ao, dx: dx });
    g.r(x - u * 0.38, y + u * 0.12, u * 0.86, u * 0.36, c2, 1, { a: ao, dx: dx });
    if (type === 'rain') for (i = 0; i < 4; i++) {
        var rx = x - u * 0.45 + i * u * 0.3, k0 = (i * 0.27) % 1;
        if (anim) g.l(rx, y + u * 0.6, rx - u * 0.08, y + u * 0.8, c1, u * 0.07, 1, { X: 'var k=fr(time*1.3+' + jzN(i * 0.27) + ');', dy: 'k*' + jzN(u * 0.45), a: '(1-k)' + (ao ? '*cl(' + ao + ')' : '') });
        else g.l(rx, y + u * (0.6 + k0 * 0.45), rx - u * 0.08, y + u * (0.8 + k0 * 0.45), c1, u * 0.07, 1 - k0, { a: ao });
    }
}
axc_reg('xcWeather', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['body', 'display', 'serif'])), sky: rng.pick(['sun', 'moon', 'rain', 'cloudsun']), t: rng.int(-3, 34), c: rng.pick(['paper', 'paper', 'ink']), flip: rng.chance(0.3) }; },
    build: function (ctx) {
        var b = axc_base(ctx), W = b.W, H = b.H, sc = b.sc, M = b.M, txt = b.txt, lw = b.lw, ls = b.ls, seed = b.seed, port = W < H * 1.2;
        var font = axc_font(ctx), sky = jzP(ctx, 'sky', 'sun'), tv = jzP(ctx, 't', 20), flip = !!jzP(ctx, 'flip', false);
        var cw = W * (port ? 0.86 : 0.84), ch = H * (W < H ? 0.72 : (port ? 0.8 : 0.74)), x0 = (W - cw) / 2, y0 = (H - ch) / 2;
        var win = axc_pick(sc, jzP(ctx, 'c', 'paper')), ink = axc_on(sc, win), faint = jzMixHex(win, ink, 0.25), ac = axc_acc(sc, win), cl = jzMixHex(win, ink, 0.45), mono = jzMonoF(ctx);
        var latin = jzIsLatinText(txt), days = latin ? ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] : ['\u6708', '\u706B', '\u6C34', '\u6728', '\u91D1', '\u571F', '\u65E5'];
        var d0 = axc_h(seed, 6) % 7, kinds = ['sun', 'cloud', 'rain', 'cloudsun'], A = 'inC(0.2)*K';
        var g = axc_kit(ctx, 'weather card', { a: A, pose: { s: '0.92+0.08*inE(0.45)' } });
        g.rr(x0, y0, cw, ch, M * 0.05, win);
        var week = function (wx, wy, ww, wh, nd) {
            g.l(wx, wy, wx + ww, wy, faint, lw, 1, { trim: 'inE(0.5,0.2)' });
            for (var i = 0; i < nd; i++) {
                var cx = wx + (ww / nd) * (i + 0.5), a = axc_inC(0.3, 0.3 + i * 0.06);
                g.t(days[(d0 + i) % 7], cx, wy + wh * 0.2, { color: ink, align: 'center', size: Math.min(ls, wh * 0.16), font: latin ? mono : jzBodyF(ctx), track: 0.05, alpha: 0.8, a: a });
                axc_sky(g, kinds[axc_h(seed, i, 2) % 4], cx, wy + wh * 0.5, Math.min(wh * 0.16, ww / nd * 0.26), ac, cl, win, a, false);
                g.t((tv - 2 + (axc_h(seed, i, 4) % 6)) + '\u00B0', cx, wy + wh * 0.84, { color: ink, align: 'center', size: Math.min(ls, wh * 0.16), alpha: 0.8, a: a });
            }
        };
        var ix, iy, iu, bx, by, bbw, bbh, maxL, cap;
        if (port) {
            ix = x0 + cw * 0.24; iy = y0 + ch * 0.14; iu = ch * 0.085;
            g.t(tv + '\u00B0', x0 + cw * 0.9, y0 + ch * 0.13, { color: ink, align: 'right', size: ch * 0.11, track: 0, font: mono });
            week(x0 + cw * 0.06, y0 + ch * 0.74, cw * 0.88, ch * 0.22, 5);
            bx = W / 2; by = y0 + ch * 0.49; bbw = cw * 0.86; bbh = ch * 0.4; maxL = 4; cap = ch * 0.2;
        } else {
            var lx = flip ? x0 + cw * 0.7 : x0, lw2 = cw * 0.3, rx = flip ? x0 + cw * 0.06 : x0 + cw * 0.32, rw = cw * 0.62;
            ix = lx + lw2 / 2; iy = y0 + ch * 0.3; iu = ch * 0.15;
            g.t(tv + '\u00B0', lx + lw2 / 2 + ch * 0.02, y0 + ch * 0.66, { color: ink, align: 'center', size: ch * 0.2, track: 0, font: mono });
            g.t('H ' + (tv + 3) + '\u00B0  L ' + (tv - 5) + '\u00B0', lx + lw2 / 2, y0 + ch * 0.85, { color: ink, align: 'center', size: ls, alpha: 0.7 });
            week(rx, y0 + ch * 0.68, rw, ch * 0.27, 5);
            bx = rx + rw / 2; by = y0 + ch * 0.36; bbw = rw; bbh = ch * 0.5; maxL = 3; cap = ch * 0.32;
        }
        g.done();
        // the big animated sky icon pops in
        var gi = axc_kit(ctx, 'weather icon', { cx: ix, cy: iy, parent: g, a: A + '*cl((time-0.1)/0.15)', pose: { s: 'inB(0.5,0.1,1.3)' } });
        axc_sky(gi, sky, ix, iy, iu, ac, cl, win, null, true);
        gi.done();
        return axc_fitMain(ctx, g, txt, font, bx, by, bbw, bbh, ink, null, maxL, cap);
    }
});

/* ================================================================== 10 xcBattery — 電池残量 */
axc_reg('xcBattery', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['display', 'body'])), cells: rng.pick([4, 5, 1, 8]), level: rng.pick([0.25, 0.5, 0.75, 1, 1]), bolt: rng.chance(0.6) }; },
    build: function (ctx) {
        var b = axc_base(ctx), W = b.W, H = b.H, sc = b.sc, M = b.M, port = b.port, txt = b.txt, ls = b.ls, k;
        var font = axc_font(ctx), level = jzP(ctx, 'level', 1), nc = Math.max(1, jzP(ctx, 'cells', 4)), bolt = !!jzP(ctx, 'bolt', true);
        var bw = W * (port ? 0.72 : 0.76), bh = H * (port ? 0.66 : 0.6), nub = M * 0.035, x0 = (W - bw) / 2 - (port ? 0 : nub / 2), y0 = (H - bh) / 2 + (port ? nub / 2 : 0) - H * 0.02;
        var st2 = M * 0.014, ac = axc_acc(sc, sc.bg), low = level <= 0.25, fc = low ? axc_acc2(sc, sc.bg) : ac, r = M * 0.04;
        var pd = st2 * 2.2, ix = x0 + pd, iy = y0 + pd, iw = bw - pd * 2, ih = bh - pd * 2, gp = nc > 1 ? st2 * 0.9 : 0;
        var litN = Math.max(1, Math.round(level * nc)), lng = port ? ih : iw, cl = (lng - gp * (nc - 1)) / nc;
        var g = axc_kit(ctx, 'battery', { a: 'inC(0.2)*K' });
        // cells charge one by one
        for (k = 0; k < (nc > 1 ? litN : 1); k++) {
            var ce = nc > 1 ? axc_inE(0.3, 0.2 + k * 0.13) : 'inE(0.9,0.2)*' + jzN(level);
            var blink = nc > 1 && k === litN - 1 && level < 1 ? '(time>0.6?(ST%4<2?1:0.35):1)' : null;
            if (port) g.rr(ix, iy + ih - k * (cl + gp) - cl, iw, cl, r * 0.4, fc, 0.3, { from: 'b', sy: ce, a: blink });
            else g.rr(ix + k * (cl + gp), iy, cl, ih, r * 0.4, fc, 0.3, { from: 'l', sx: ce, a: blink });
        }
        g.rs(x0, y0, bw, bh, r, sc.fg, st2, 1, { a: 'inE(0.5)' });
        if (port) g.rr(W / 2 - bw * 0.16, y0 - nub - st2 * 0.2, bw * 0.32, nub, nub * 0.3, sc.fg, 1, { a: 'inE(0.5)' });
        else g.rr(x0 + bw + st2 * 0.2, y0 + bh * 0.33, nub, bh * 0.34, nub * 0.3, sc.fg, 1, { a: 'inE(0.5)' });
        var ly = y0 + bh + ls * 2.2;
        g.t(Math.round(level * 100) + '%', x0 + bw, ly, { color: sc.fg, align: 'right', size: ls * 1.5, track: 0.05, src: 'Math.round(' + jzN(level * 100) + '*oc((time-0.2)/' + jzN(0.3 + 0.13 * litN) + '))+"%"' });
        g.t(low ? 'LOW BATTERY' : (bolt ? 'CHARGING' : 'BATTERY'), x0, ly, { color: low ? fc : sc.sub, size: ls, track: 0.25, a: low ? '(ST%4<1)?0.3:1' : null });
        if (bolt && !low) {
            var bx = x0 + bw - ls * 5.2, u = ls * 0.9;
            g.p([[bx + u * 0.2, ly - u], [bx - u * 0.5, ly + u * 0.15], [bx - u * 0.02, ly + u * 0.15], [bx - u * 0.25, ly + u], [bx + u * 0.5, ly - u * 0.2], [bx + u * 0.02, ly - u * 0.2]], ac);
        }
        g.done();
        return axc_fitMain(ctx, null, txt, font, x0 + bw / 2, y0 + bh / 2, iw * 0.9, ih * 0.8, sc.fg, null, port ? 5 : 3, (port ? iw : ih) * 0.5);
    }
});

/* ================================================================== 11 xcPopups — 重なる窓 */
axc_reg('xcPopups', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['body', 'display'])), k: rng.int(3, 6), dir: rng.pick([[1, 1], [-1, 1], [1, -1], [-1, -1]]), icon: rng.pick(['warn', 'info', 'stop']) }; },
    build: function (ctx) {
        var b = axc_base(ctx), W = b.W, H = b.H, sc = b.sc, M = b.M, port = b.port, txt = b.txt, lw = b.lw, ls = b.ls, i, bb = null;
        var font = axc_font(ctx), k = jzClamp(jzP(ctx, 'k', 4), 1, 8), dir = jzP(ctx, 'dir', [1, 1]), icon = jzP(ctx, 'icon', 'warn');
        var dw = W * (port ? 0.74 : 0.56), dh = H * (port ? 0.3 : 0.52), stx = M * 0.042 * dir[0], sty = M * 0.036 * dir[1];
        var win = axc_paper(sc), ink = axc_on(sc, win), ac = axc_acc(sc, win), tb0 = jzMixHex(win, ink, 0.55), faint = jzMixHex(win, ink, 0.22), th = M * 0.05;
        for (i = 0; i < k; i++) {
            var top = i === k - 1, d = i * 0.085, cx = W / 2 + (i - (k - 1) / 2) * stx, cy = H / 2 + (i - (k - 1) / 2) * sty, x0 = cx - dw / 2, y0 = cy - dh / 2;
            var g = axc_kit(ctx, 'popup ' + (i + 1), { cx: cx, cy: cy, a: 'cl((time-' + jzN(d) + ')/0.08)*K', pose: { s: '0.7+0.3*' + axc_inB(0.3, d, 1.5) } });
            g.r(x0, y0, dw, dh, win); g.r(x0, y0, dw, th, top ? ac : tb0); g.rs(x0, y0, dw, dh, 0, ink, lw * 2);
            var on = axc_on(sc, top ? ac : tb0), qx = x0 + dw - th * 0.5, u = th * 0.17;
            g.ml([[[qx - u, y0 + th / 2 - u], [qx + u, y0 + th / 2 + u]], [[qx - u, y0 + th / 2 + u], [qx + u, y0 + th / 2 - u]]], on, lw * 2);
            g.t(top ? 'ERROR' : 'ERROR (' + (i + 1) + ')', x0 + th * 0.4, y0 + th / 2, { color: on, size: ls * 0.95, track: 0.2 });
            if (!top) { axc_greek(g, x0 + dw * 0.08, y0 + th + dh * 0.1, dw * 0.5, 2, dh * 0.07, faint, b.seed + i, null, 0.36, 1); g.done(); continue; }
            var bh = dh - th, ix = x0 + dw * 0.1, iy = y0 + th + bh * 0.82, ir = Math.min(bh * 0.085, M * 0.03);
            if (icon === 'warn') g.p([[ix, iy - ir * 1.1], [ix + ir * 1.2, iy + ir * 0.9], [ix - ir * 1.2, iy + ir * 0.9]], ac); else if (icon === 'stop') g.rr(ix - ir, iy - ir, ir * 2, ir * 2, ir * 0.5, ac); else g.c(ix, iy, ir, ac);
            g.t(icon === 'info' ? 'i' : '!', ix, iy + (icon === 'warn' ? ir * 0.25 : 0), { color: axc_on(sc, ac), align: 'center', size: ir * 1.2, track: 0 });
            var bw2 = Math.min(dw * 0.24, M * 0.22), bh2 = bh * 0.14;
            g.r(x0 + dw * 0.93 - bw2, iy - bh2 / 2, bw2, bh2, ink); g.t('OK', x0 + dw * 0.93 - bw2 / 2, iy, { color: win, align: 'center', size: Math.min(ls, bh2 * 0.5) });
            g.rs(x0 + dw * 0.9 - bw2 * 2, iy - bh2 / 2, bw2 * 0.9, bh2, 0, ink, lw * 1.5);
            g.done();
            bb = axc_fitMain(ctx, g, txt, font, cx, y0 + th + bh * 0.36, dw * 0.86, bh * 0.56, ink, null, 3, bh * 0.36, { mi: Math.floor(d / Math.max(0.005, b.c.stagger || 0.04)) });
        }
        return bb;
    }
});

/* ================================================================== 12 xcIncoming — 着信画面 */
axc_reg('xcIncoming', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['display', 'body', 'serif'])), flip: rng.chance(0.35), ring: rng.pick([2, 3]), who: rng.pick(['person', 'heart', 'q']) }; },
    build: function (ctx) {
        var b = axc_base(ctx), W = b.W, H = b.H, sc = b.sc, M = b.M, port = b.port, txt = b.txt, lw = b.lw, ls = b.ls, i;
        var font = axc_font(ctx), flip = !!jzP(ctx, 'flip', false), ring = jzP(ctx, 'ring', 2), who = jzP(ctx, 'who', 'person');
        var ac = axc_acc(sc, sc.bg), ac2 = axc_acc2(sc, sc.bg), plate = axc_paper(sc), pin = axc_on(sc, plate);
        var ar = M * (port ? 0.12 : 0.13), ax = port ? W / 2 : W * (flip ? 0.79 : 0.21), ay = port ? H * 0.2 : H * 0.44, A = 'inC(0.2)*K';
        var g = axc_kit(ctx, 'incoming call', { a: A, X: 'var ae=inB(0.45,0,1.4);' });
        // ringing avatar
        for (i = 0; i < ring; i++) g.cs(ax, ay, ar, ac, lw * 2.5, 0.8, { X: 'var k=fr(time*0.7+' + jzN(i / ring) + ');', rE: jzN(ar) + '*(1+k*0.75)', a: '(1-k)*cl(time/0.3)' });
        g.c(ax, ay, ar, plate, 1, { s: 'ae' });
        var sh = { a: 'ae>0.5?1:0' };
        if (who === 'person') { g.c(ax, ay - ar * 0.2, ar * 0.3, pin, 0.85, sh); g.rr(ax - ar * 0.52, ay + ar * 0.24, ar * 1.04, ar * 0.56, ar * 0.3, pin, 0.85, sh); }
        else if (who === 'heart') { var u = ar * 0.3; g.mc([[ax - u * 0.62, ay - u * 0.3, u * 0.75], [ax + u * 0.62, ay - u * 0.3, u * 0.75]], ac, 1, sh); g.p([[ax - u * 1.3, ay + u * 0.08], [ax + u * 1.3, ay + u * 0.08], [ax, ay + u * 1.5]], ac, 1, sh); }
        else g.t('?', ax, ay, { color: pin, align: 'center', size: ar * 1.1, track: 0, font: jzBodyF(ctx), a: 'ae>0.5?1:0' });
        var tx = port ? W / 2 : W * (flip ? 0.35 : 0.65), tw = port ? W * 0.86 : W * 0.52, ty = port ? H * 0.5 : H * 0.42, thh = port ? H * 0.28 : H * 0.36;
        g.t('INCOMING CALL', tx, ty - thh / 2 - ls * 2, { color: ac, align: 'center', size: ls * 1.1, track: 0.3, a: 'inC(0.3,0.2)', src: '"INCOMING CALL"+"...".substr(0,ST%4)' });
        var br = M * 0.058, by = port ? H * 0.84 : H * 0.8, bdx = port ? W * 0.24 : Math.min(tw * 0.3, M * 0.24), chev = [];
        for (i = 0; i < 3; i++) g.pl([[tx - br * 0.5 + i * br * 0.4, by - br * 0.22], [tx - br * 0.3 + i * br * 0.4, by], [tx - br * 0.5 + i * br * 0.4, by + br * 0.22]], sc.sub, lw * 2, 1, { a: '((ST+' + i + ')%3==0?1:0.35)*cl((time-0.4)/0.2)' });
        g.t(axc_mmss(b.c.start || 0), tx, ty + thh / 2 + ls * 1.6, { color: sc.sub, align: 'center', size: ls, a: 'inC(0.3,0.3)' });
        g.done();
        // decline / accept buttons (accept wobbles and rings)
        for (i = 0; i < 2; i++) {
            var s = i ? 1 : -1, col = i ? ac : ac2, on = axc_on(sc, col), bx = tx + s * bdx;
            var gb = axc_kit(ctx, i ? 'accept' : 'decline', { cx: bx, cy: by, a: A, pose: { s: axc_inB(0.4, 0.25 + i * 0.08, 1.6) + (i ? '*(1+0.05*Math.sin(time*9))' : ''), rot: i ? 'Math.sin(time*18)*5*sm(0.2,0,fr(time*0.9)-0.5)' : null } });
            gb.c(bx, by, br, col);
            if (i) { gb.arc(bx, by - br * 0.3, br * 0.52, 35, 145, on, br * 0.24); gb.mc([[bx - br * 0.44, by, br * 0.15], [bx + br * 0.44, by, br * 0.15]], on); }
            else gb.ml([[[bx - br * 0.32, by - br * 0.32], [bx + br * 0.32, by + br * 0.32]], [[bx - br * 0.32, by + br * 0.32], [bx + br * 0.32, by - br * 0.32]]], on, br * 0.16);
            gb.done();
        }
        return axc_fitMain(ctx, null, txt, font, tx, ty, tw, thh, sc.fg, null, port ? 4 : 3, M * 0.24);
    }
});

/* ================================================================== 13 xcGauge — 速度計 */
axc_reg('xcGauge', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['display', 'body'])), v: rng.range(0.55, 0.98), unit: rng.pick(['km/h', 'rpm', 'bpm']), max: rng.pick([180, 240, 320]), seg: rng.chance(0.4) }; },
    build: function (ctx) {
        var b = axc_base(ctx), W = b.W, H = b.H, sc = b.sc, M = b.M, txt = b.txt, lw = b.lw, ls = b.ls, i;
        var font = axc_font(ctx), pv = jzP(ctx, 'v', 0.8), mx = jzP(ctx, 'max', 240);
        var cx = W / 2, cy = H * 0.5, Rr = M * 0.39, A0 = 135, SW = 270, ac = axc_acc(sc, sc.bg), ac2 = axc_acc2(sc, sc.bg), faint = axc_dim(sc), th = M * 0.03;
        var X = 'var e=inE(0.6),wi=cl((time-0.1)/0.75),v=cl(' + jzN(pv) + '*(wi>=1?1:ob(wi,1.2))+(wi>=1?n1(time*3,SD)*0.025*' + jzN(axc_mot(ctx)) + ':0));';
        var g = axc_kit(ctx, 'gauge', { a: 'K', X: X });
        g.arc(cx, cy, Rr, A0, A0 + SW, faint, th, 1, { sweep: 'e' });
        g.arc(cx, cy, Rr + th * 0.95, A0 + SW * 0.8, A0 + SW, ac2, th * 0.25, 1, { sweep: '(e-0.8)/0.2' });
        // ticks appear as the ring winds up
        var nT = 36;
        for (i = 0; i <= nT; i++) {
            var a = (A0 + SW * i / nT) * Math.PI / 180, major = i % 4 === 0, r0 = Rr + th * 0.75, r1 = r0 + th * (major ? 0.9 : 0.45);
            g.l(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0, cx + Math.cos(a) * r1, cy + Math.sin(a) * r1, i / nT >= 0.8 ? ac2 : sc.sub, lw * (major ? 2.5 : 1.3), major ? 1 : 0.7, { a: 'e>=' + jzN(i / nT) + '?1:0' });
        }
        if (jzP(ctx, 'seg', false)) { var ns = 27; for (i = 0; i < ns; i++) g.arc(cx, cy, Rr, A0 + SW * i / ns + 0.8, A0 + SW * (i + 1) / ns - 0.8, i / ns >= 0.8 ? ac2 : ac, th, 1, { a: i + '<Math.round(v*' + ns + ')?1:0' }); }
        else g.arc(cx, cy, Rr, A0, A0 + SW, ac, th, 1, { sweep: 'v' });
        // marker riding the arc
        var mr = Rr - th * 0.75;
        g.p([[cx + mr + th * 0.2, cy], [cx + mr - th * 0.9, cy + th * 0.5], [cx + mr - th * 0.9, cy - th * 0.5]], sc.fg, 1, { org: [cx, cy], rot: A0 + '+' + SW + '*v', a: 'time>0.1?1:0' });
        g.t('000', cx, cy + Rr * 0.74, { color: sc.fg, align: 'center', size: Rr * 0.17, track: 0.08, a: 'inC(0.3,0.2)', src: '("00"+Math.round(v*' + jzN(mx) + ')).slice(-3)' });
        g.t(jzP(ctx, 'unit', 'km/h'), cx, cy + Rr * 0.93, { color: sc.sub, align: 'center', size: ls, track: 0.2, a: 'inC(0.3,0.2)' });
        g.t('0', cx - Rr * 0.52, cy + Rr * 0.62, { color: sc.sub, align: 'center', size: ls, a: 'inC(0.3,0.2)' });
        g.t(String(mx), cx + Rr * 0.52, cy + Rr * 0.62, { color: ac2, align: 'center', size: ls, a: 'inC(0.3,0.2)' });
        g.done();
        return axc_fitMain(ctx, null, txt, font, cx, cy - Rr * 0.08, Rr * 1.42, Rr * 0.86, sc.fg, null, 3, Rr * 0.5);
    }
});

/* ================================================================== 14 xcSheet — 表計算 */
axc_reg('xcSheet', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['body', 'display'])), sh: rng.int(0, 1), sv: rng.int(0, 1), fill: rng.chance(0.4), data: rng.range(0.2, 0.45) }; },
    build: function (ctx) {
        var b = axc_base(ctx), W = b.W, H = b.H, sc = b.sc, M = b.M, port = b.port, txt = b.txt, lw = b.lw, ls = b.ls, seed = b.seed, c, r, nums = 0;
        var font = axc_font(ctx), sv = jzP(ctx, 'sv', 0), data = jzP(ctx, 'data', 0.3);
        var hw = M * 0.06, hh = M * 0.048, fbh = M * 0.075, nC = port ? 4 : 6, nR = port ? 11 : 7, cw = (W - hw) / nC, rh = (H - fbh - hh) / nR, gy = fbh + hh;
        var grid = axc_dim(sc), head = jzMixHex(sc.bg, sc.fg, 0.09), ac = axc_acc(sc, sc.bg), mono = jzMonoF(ctx);
        var c0 = port ? 0 : 1, c1 = port ? nC - 1 : 4, r0 = port ? 3 + sv : 1 + sv, r1 = port ? r0 + 4 : r0 + 3;
        var g = axc_kit(ctx, 'spreadsheet', { a: 'inC(0.25)*K' });
        g.r(0, fbh, W, hh, head); g.r(0, gy, hw, H - gy, head);
        g.r(hw + c0 * cw, fbh, (c1 - c0 + 1) * cw, hh, ac, 0.3); g.r(0, gy + r0 * rh, hw, (r1 - r0 + 1) * rh, ac, 0.3);
        for (c = 0; c <= nC; c++) {
            var x = hw + c * cw;
            g.l(x, fbh, x, H, grid, lw, 1, { trim: axc_inE(0.6, c * 0.03) });
            if (c < nC) g.t(String.fromCharCode(65 + c), x + cw / 2, fbh + hh / 2, { align: 'center', color: sc.sub, size: ls });
        }
        var rows = [];
        for (r = 0; r <= nR; r++) { var y = gy + r * rh; g.l(0, y, W, y, grid, lw, 1, { trim: axc_inE(0.6, r * 0.03) }); if (r < nR) rows.push(String(r + 1)); }
        g.t(rows.join('\r'), hw / 2, gy + nR * rh / 2, { align: 'center', color: sc.sub, size: ls * 0.9, track: 0, leading: rh });       // row numbers: one text layer
        for (c = 0; c < nC; c++) for (r = 0; r < nR; r++) {
            if (c >= c0 && c <= c1 && r >= r0 && r <= r1) continue;
            if (axc_r01(seed, c, r, 5) > data) continue;
            var a = axc_inC(0.3, 0.15 + (c + r) * 0.03), num = axc_r01(seed, c, r, 6) < 0.5;
            if (num && nums < 14) { nums++; g.t(String(axc_h(seed, c, r, 8) % 9000 + 100), hw + (c + 0.92) * cw, gy + (r + 0.5) * rh, { align: 'right', color: sc.sub, size: Math.min(ls, rh * 0.3), alpha: 0.8, a: a, track: 0.02 }); }
            else g.r(hw + (c + 0.08) * cw, gy + (r + 0.5) * rh - rh * 0.07, cw * (0.3 + 0.5 * axc_r01(seed, c, r, 7)), rh * 0.14, grid, 1, { from: 'l', sx: a });
        }
        // formula bar: the lyric is typed after "="
        g.l(0, fbh, W, fbh, grid, lw * 1.5);
        g.rs(M * 0.015, fbh * 0.2, M * 0.1, fbh * 0.6, 0, grid, lw * 1.5);
        g.t(String.fromCharCode(65 + c0) + (r0 + 1), M * 0.065, fbh / 2, { align: 'center', color: sc.fg, size: ls });
        g.t('fx', M * 0.145, fbh / 2, { color: sc.sub, size: ls * 1.1, track: 0 });
        var ft = axc_cut(txt, port ? 12 : 30);
        g.t('=' + ft, M * 0.2, fbh / 2, { color: sc.fg, size: ls * 1.15, font: jzBodyF(ctx), track: 0.04, src: 'var s=' + axc_q(ft) + ';"="+s.substr(0,Math.floor(cl((time-0.1)/0.5)*s.length))' });
        // the selected (merged) cell
        var sx = hw + c0 * cw, sy = gy + r0 * rh, sw = (c1 - c0 + 1) * cw, shh = (r1 - r0 + 1) * rh, bl = M * 0.006, ins = port ? bl : 0, he = { s: 'inB(0.3,0.55,1.6)' };
        g.r(sx + lw, sy + lw, sw - lw * 2, shh - lw * 2, jzP(ctx, 'fill', false) ? jzMixHex(sc.bg, sc.accent, 0.14) : sc.bg);
        g.pl([[sx + ins, sy], [sx + sw - ins, sy], [sx + sw - ins, sy + shh], [sx + ins, sy + shh], [sx + ins, sy - bl / 2]], ac, bl, 1, { trim: 'inE(0.6,0.1)' });
        g.r(sx + sw - ins - bl * 2, sy + shh - bl * 2, bl * 4, bl * 4, ac, 1, he); g.rs(sx + sw - ins - bl * 2, sy + shh - bl * 2, bl * 4, bl * 4, 0, sc.bg, lw * 1.5, 1, he);
        g.done();
        return axc_fitMain(ctx, null, txt, font, sx + sw / 2, sy + shh / 2, Math.min(sw * 0.88, W * 0.86), shh * 0.8, sc.fg, null, port ? 4 : 3, shh * 0.5);
    }
});

/* ================================================================== 15 xcChipCard — ICカード */
axc_reg('xcChipCard', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['display', 'body'])), c: rng.pick(['accent', 'ink', 'paper']), tilt: rng.pick([-4, 0, 3, 0]), band: rng.chance(0.5), last: rng.int(1000, 9999) }; },
    build: function (ctx) {
        var b = axc_base(ctx), W = b.W, H = b.H, sc = b.sc, M = b.M, port = b.port, txt = b.txt, lw = b.lw, ls = b.ls, seed = b.seed, i, k;
        var font = axc_font(ctx), dm = port ? axc_boxIn(W, H, 0.66, 0.82, 0.8) : axc_boxIn(W, H, 1.586, 0.84, 0.8), cw = dm[0], ch = dm[1], x0 = (W - cw) / 2, y0 = (H - ch) / 2, m = Math.min(cw, ch);
        var card = axc_pick(sc, jzP(ctx, 'c', 'accent')), ink = axc_on(sc, card), ac = axc_acc(sc, card), faint = jzMixHex(card, ink, 0.18);
        // the card flips in
        var g = axc_kit(ctx, 'chip card', { a: 'inC(0.15)*K', X: 'var e=inB(0.5,0,1.2);', rotv: jzP(ctx, 'tilt', 0), pose: { sx: 'Math.max(0.02,e)', dy: '(1-cl(e))*' + jzN(M * 0.03) } });
        g.rr(x0 + M * 0.012, y0 + M * 0.016, cw, ch, m * 0.06, sc.dim, 0.6);
        g.rr(x0, y0, cw, ch, m * 0.06, card);
        if (jzP(ctx, 'band', false)) g.r(x0, y0 + ch * (port ? 0.26 : 0.3), cw, ch * (port ? 0.48 : 0.44), faint, 1, { from: 'l', sx: 'inE(0.6,0.15)' });
        var cs = m * 0.17, cxp = x0 + cw * 0.08, cyp = y0 + ch * (port ? 0.08 : 0.1), chh = cs * 0.76, cl = jzMixHex(ac, axc_on(sc, ac), 0.6);
        g.rr(cxp, cyp, cs, chh, cs * 0.14, ac);
        g.ml([[[cxp + cs * 0.34, cyp], [cxp + cs * 0.34, cyp + chh]], [[cxp + cs * 0.66, cyp], [cxp + cs * 0.66, cyp + chh]], [[cxp, cyp + chh * 0.5], [cxp + cs * 0.34, cyp + chh * 0.5]], [[cxp + cs * 0.66, cyp + chh * 0.5], [cxp + cs, cyp + chh * 0.5]]], cl, lw * 1.3);
        for (i = 0; i < 3; i++) g.arc(cxp + cs * 1.25, cyp + chh / 2, cs * (0.16 + i * 0.13), -42, 42, ink, lw * 2.4, 1, { a: '(ST+' + (3 - i) + ')%4<3?0.9:0.3' });
        g.t('VALID ' + jzPad(1 + axc_h(seed, 3) % 12, 2) + '/' + (26 + axc_h(seed, 4) % 5), x0 + cw * 0.92, cyp + chh / 2, { color: ink, align: 'right', size: ls * 0.95, alpha: 0.8 });
        var ny = y0 + ch * (port ? 0.86 : 0.83), nx = x0 + cw * 0.08, nw = cw * (port ? 0.84 : 0.6), dr = Math.min(nw * 0.016, m * 0.014);
        for (k = 0; k < 12; k++) g.c(nx + (Math.floor(k / 4) * 0.26 + (k % 4) * 0.05) * nw + dr, ny, dr, ink, 1, { a: 'time>=' + jzN(0.25 + k * 0.03) + '?1:0' });
        g.t(String(jzP(ctx, 'last', 1234)), nx + nw * 0.78, ny, { color: ink, size: dr * 3.4, track: 0.14, a: '(time-0.6)/0.15' });
        var lr = m * 0.055, lx = x0 + cw * 0.92 - lr * 1.6;
        if (!port) { g.c(lx, ny - lr * 0.1, lr, ac, 0.9); g.c(lx + lr * 1.1, ny - lr * 0.1, lr, ink, 0.55); }
        g.done();
        return axc_fitMain(ctx, g, txt, font, W / 2, y0 + ch * (port ? 0.5 : 0.52), cw * 0.84, ch * (port ? 0.42 : 0.36), ink, null, port ? 4 : 2, ch * (port ? 0.2 : 0.3));
    }
});
