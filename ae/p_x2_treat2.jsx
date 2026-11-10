// ================================================================ 追加分2 text treatments, part 2 (AE port of src/11p_x2_treat.js: plates & marks, per-glyph alternation, print looks)
// Uses the axo_ helpers of ae/p_x2_treat1.jsx. Marks are shape layers parented to the lyric (its layer space): they follow
// the lyric's layer motion and opacity, not the per-glyph motion of an entrance / exit. Expression variables come from the
// lyric's motion header (IN, DL, PO, easing functions): q = the mark's own entrance, (1-ic(PO)) = fade with the exit.

// ================================================================ PLATES & MARKS
/* ---- xoLeadBar — 頭バー: a heading marker in front of the lyric: a solid bar, a pointer triangle or a small square */
jzReg('treat', 'xoLeadBar', {
    plan: function (rng, st) { return { v: rng.pick(['bar', 'bar', 'tri', 'sq']), k: rng.range(0.1, 0.15) }; },
    apply: function (ctx, L, P, o) {
        if (!axo_alive(L, 0.9) || !axo_lineLike(ctx, L)) return;
        var lc = axo_markCol(ctx.sc, jzTextColor(L)), G = axo_lay(ctx, L), sp = G.spans, s = G.fs, HD = axo_head(ctx, L, o), i;
        if (!sp.length) return;
        var V = sp[0].vert, a0 = 1e9, c0 = 1e9, c1 = -1e9, t;
        for (i = 0; i < sp.length; i++) { a0 = Math.min(a0, sp[i].a0); c0 = Math.min(c0, sp[i].c); c1 = Math.max(c1, sp[i].c); }
        var p = a0 - s * 0.2, cm = (c0 + c1) / 2, half = ((c1 - c0) + s * 0.96) / 2, bar = P.v !== 'tri' && P.v !== 'sq';
        var S = axo_shapeOn(ctx, L, 'JZ Lead bar', false, HD + AXO_POP), g = jzGrp(S, 'mark');
        if (P.v === 'tri') { t = s * 0.4; jzAddPath(g, [axo_uv(V, p - t * 0.95, cm - t), axo_uv(V, p, cm), axo_uv(V, p - t * 0.95, cm + t)], true); }
        else if (P.v === 'sq') { t = s * 0.17; jzAddPath(g, [axo_uv(V, p - t * 2, cm - t), axo_uv(V, p, cm - t), axo_uv(V, p, cm + t), axo_uv(V, p - t * 2, cm + t)], true); }
        else { var bw = s * axo_p(P, 'k', 0.125); jzAddPath(g, [axo_uv(V, p - bw, cm - half), axo_uv(V, p, cm - half), axo_uv(V, p, cm + half), axo_uv(V, p - bw, cm + half)], true); }
        jzAddFill(g, lc);
        var X = jzGX(g);
        X.property('ADBE Vector Anchor').setValue(axo_uv(V, p, cm)); X.property('ADBE Vector Position').setValue(axo_uv(V, p, cm));
        X.property('ADBE Vector Scale').expression = HD + 'var q=oe(cl((time-DL-0.04)/0.4))*' + AXO_OUT + ';' + (bar ? (V ? '[100*q,100]' : '[100,100*q]') : '[100*q,100*q]');
    }
});

/* ---- xoDimLine — 寸法線: a thin dimension line under each line, closed by ticks, dots or arrow heads; it opens from the middle */
jzReg('treat', 'xoDimLine', {
    plan: function (rng, st) { return { v: rng.pick(['tick', 'tick', 'dot', 'arrow']) }; },
    apply: function (ctx, L, P, o) {
        if (!axo_alive(L, 0.9) || jzCount(axo_doc(L).text) < 2) return;
        var lc = axo_markCol(ctx.sc, jzTextColor(L)), G = axo_lay(ctx, L), s = G.fs, HD = axo_head(ctx, L, o), k, e;
        if (!G.spans.length) return;
        var lw = Math.max(1.5 * ctx.u / axo_k(L), s * 0.022), t = s * 0.1;
        var S = jzNoGhost(axo_shapeOn(ctx, L, 'JZ Dimension line', true, HD + AXO_POP + '*' + AXO_OUT));
        for (k = 0; k < G.spans.length; k++) {
            var Sp = G.spans[k], V = Sp.vert, mid = (Sp.a0 + Sp.a1) / 2, half = (Sp.a1 - Sp.a0) / 2, off = Sp.c + s * 0.64;
            var Q = HD + 'var q=oe(cl((time-DL-' + jzN(0.1 + k * 0.08) + ')/0.5));';
            var g = jzGrp(S, 'line ' + (k + 1));
            jzAddPath(g, [axo_uv(V, mid - half, off), axo_uv(V, mid + half, off)], false);
            jzAddStroke(g, lc, lw);
            jzAddTrimPaths(g, Q + '50+50*q', Q + '50-50*q');
            for (e = 0; e < 2; e++) {
                var d = e ? 1 : -1, g2 = jzGrp(S, 'end ' + (k + 1) + (e ? 'b' : 'a'));
                if (P.v === 'dot') { jzAddEllipse(g2, s * 0.09, s * 0.09); jzAddFill(g2, lc); }
                else if (P.v === 'arrow') { jzAddPath(g2, [axo_uv(V, d * t * 0.5, 0), axo_uv(V, -d * t * 0.9, -t * 0.55), axo_uv(V, -d * t * 0.9, t * 0.55)], true); jzAddFill(g2, lc); }
                else { jzAddPath(g2, [axo_uv(V, 0, -t), axo_uv(V, 0, t)], false); jzAddStroke(g2, lc, lw); }
                var X = jzGX(g2), al = jzN(mid) + '+' + jzN(d * half) + '*q';
                X.property('ADBE Vector Position').expression = Q + (V ? '[' + jzN(off) + ',' + al + ']' : '[' + al + ',' + jzN(off) + ']');
                X.property('ADBE Vector Group Opacity').expression = Q + '(q>0.01?100:0)';
            }
        }
    }
});

/* ---- xoCropMarks — トンボ: printer's crop marks off the four corners of the lyric block (+ a registration target) */
jzReg('treat', 'xoCropMarks', {
    plan: function (rng, st) { return { len: rng.range(0.24, 0.32), reg: rng.chance(0.6) }; },
    apply: function (ctx, L, P, o) {
        if (!axo_alive(L, 0.9) || !axo_lineLike(ctx, L)) return;
        var sc = ctx.sc, col = jzTextColor(L), lc = axo_first([sc.sub, sc.fg, col], function (c) { return jzContrast(c, sc.bg) >= 2.2; }, col);
        var G = axo_lay(ctx, L), B = G.box, s = G.fs, HD = axo_head(ctx, L, o), pad = s * 0.12, gap = s * 0.1, len = s * axo_p(P, 'len', 0.28), lw = Math.max(1.2 * ctx.u / axo_k(L), s * 0.013), i;
        var x0 = B.x0 - pad, x1 = B.x1 + pad, y0 = B.y0 - pad, y1 = B.y1 + pad;
        var Q = HD + 'var q=oc(cl((time-DL-IN*0.4)/0.4));';
        var S = jzNoGhost(axo_shapeOn(ctx, L, 'JZ Crop marks', true, Q + AXO_POP + '*q*' + AXO_OUT));
        var cs = [[x0, y0, -1, -1], [x1, y0, 1, -1], [x1, y1, 1, 1], [x0, y1, -1, 1]], GG = s * 0.25;
        for (i = 0; i < 4; i++) {
            var x = cs[i][0], y = cs[i][1], dx = cs[i][2], dy = cs[i][3];
            var gh = jzGrp(S, 'mark ' + (i + 1) + 'h');
            jzAddPath(gh, [[x + dx * gap, y], [x + dx * (gap + len), y]], false); jzAddStroke(gh, lc, lw);
            jzGX(gh).property('ADBE Vector Position').expression = Q + '[' + jzN(dx * GG) + '*(1-q),0]';
            var gv = jzGrp(S, 'mark ' + (i + 1) + 'v');
            jzAddPath(gv, [[x, y + dy * gap], [x, y + dy * (gap + len)]], false); jzAddStroke(gv, lc, lw);
            jzGX(gv).property('ADBE Vector Position').expression = Q + '[0,' + jzN(dy * GG) + '*(1-q)]';
        }
        if (P.reg) {                                    // registration target beside the block
            var r = s * 0.085, tx = G.vert ? B.cx : x0 - gap - len * 0.5, ty = G.vert ? y0 - gap - len * 0.5 : B.cy, gr = jzGrp(S, 'register');
            jzAddEllipse(gr, r * 2, r * 2, tx, ty);
            jzAddPath(gr, [[tx - r * 1.7, ty], [tx + r * 1.7, ty]], false); jzAddPath(gr, [[tx, ty - r * 1.7], [tx, ty + r * 1.7]], false);
            jzAddStroke(gr, lc, lw);
        }
    }
});

/* ---- xoSeparators — 区切り点: the glyphs are spaced out and a small mark sits in every gap: a dot, a slash or a hairline rule */
jzReg('treat', 'xoSeparators', {
    plan: function (rng, st) { return { v: rng.pick(['dot', 'dot', 'slash', 'rule']), t: rng.range(0.26, 0.34) }; },
    apply: function (ctx, L, P, o) {
        if (!axo_alive(L, 0.9) || jzCount(axo_doc(L).text) < 2) return;
        var lc = axo_markCol(ctx.sc, jzTextColor(L)), vert = axo_isVert(L), Sc = axo_sv(L, 'ADBE Scale'), kx = Math.abs(Sc[0]) / 100, ky = Math.abs(Sc[1]) / 100;
        var r0 = jzRect(L), a0 = vert ? r0.height * ky : r0.width * kx, tk = axo_p(P, 't', 0.3);
        axo_reanchor(L, function () {
            jzTextDoc(L, function (td) { axo_addTrack(td, tk, vert); });
            var r1 = jzRect(L), a1 = vert ? r1.height * ky : r1.width * kx, k = Math.max(0.6, Math.min(1, a0 * 1.05 / Math.max(1, a1)));
            if (k < 0.999) jzTextDoc(L, function (td) { td.fontSize = td.fontSize * k; if (td.autoLeading === false) td.leading = td.leading * k; });
        });
        var G = axo_lay(ctx, L), s = G.fs, V = G.vert, HD = axo_head(ctx, L, o), lw = Math.max(1.3 * ctx.u / axo_k(L), s * 0.02), lines = axo_lines(G), i, j, n = 0, gk = 0;
        var S = jzNoGhost(axo_shapeOn(ctx, L, 'JZ Separators', true, HD + AXO_POP));
        for (j = 0; j < lines.length; j++) {
            var ln = lines[j];
            for (i = 0; i < ln.length; i++) {
                var A = ln[i], B = ln[i + 1];
                if (A.sp) continue;
                gk++;
                if (!B || B.sp || jzIsPunct(A.ch) || jzIsPunct(B.ch) || n >= 60) continue;
                var x = V ? (A.cx + B.cx) / 2 : (A.cx + A.w / 2 + B.cx - B.w / 2) / 2, y = V ? (A.cy + A.h / 2 + B.cy - B.h / 2) / 2 : (A.cy + B.cy) / 2;
                var g = jzGrp(S, 'mark ' + (++n)), h;
                if (P.v === 'slash') { h = s * 0.34; var w = s * 0.09; jzAddPath(g, V ? [[-h, w], [h, -w]] : [[-w, h], [w, -h]], false); jzAddStroke(g, lc, lw * 1.2); }
                else if (P.v === 'rule') { h = s * 0.46; jzAddPath(g, V ? [[-h, 0], [h, 0]] : [[0, -h], [0, h]], false); jzAddStroke(g, lc, lw * 0.8); }
                else { jzAddEllipse(g, s * 0.1, s * 0.1); jzAddFill(g, lc); }
                var X = jzGX(g);
                X.property('ADBE Vector Position').setValue([x, y]);
                X.property('ADBE Vector Scale').expression = HD + 'var q=Math.max(0,ob(cl((time-DL-IN*0.4-' + jzN((gk - 1) * 0.03) + ')/0.24),1.8))*' + AXO_OUT + ';[100*q,100*q]';
            }
        }
        if (!n) S.remove();
    }
});

/* ---- xoGlyphUnders — 字ごと下線: every glyph gets its own short underscore, like the blanks of a form */
jzReg('treat', 'xoGlyphUnders', {
    plan: function (rng, st) { return { k: rng.range(0.045, 0.06), w: rng.range(0.74, 0.84) }; },
    apply: function (ctx, L, P, o) {
        if (!axo_alive(L, 0.9)) return;
        var lc = axo_markCol(ctx.sc, jzTextColor(L)), G = axo_lay(ctx, L), s = G.fs, V = G.vert, HD = axo_head(ctx, L, o), k, n = 0;
        var th = Math.max(2 * ctx.u / axo_k(L), s * axo_p(P, 'k', 0.052)), wk = axo_p(P, 'w', 0.79);
        var S = jzNoGhost(axo_shapeOn(ctx, L, 'JZ Glyph underscores', true, HD + AXO_POP));
        for (k = 0; k < G.glyphs.length; k++) {
            var gl = G.glyphs[k];
            if (jzIsPunct(gl.ch)) continue;
            var len = Math.max(V ? gl.h : gl.w, s * 0.45) * wk, g = jzGrp(S, 'under ' + (gl.i + 1));
            jzAddRect(g, V ? th : len, V ? len : th); jzAddFill(g, lc);
            var X = jzGX(g);
            X.property('ADBE Vector Position').setValue(V ? [gl.cx + s * 0.6, gl.cy] : [gl.cx, gl.cy + s * 0.6]);
            X.property('ADBE Vector Scale').expression = HD + 'var q=oe(cl((time-DL-' + jzN(0.06 + gl.i * 0.035) + ')/0.3))*' + AXO_OUT + ';' + (V ? '[100,100*q]' : '[100*q,100]');
            n++;
        }
        if (!n) S.remove();
    }
});

/* ---- xoOffsetFrame — ずらし枠: a hairline frame draws itself around the lyric; a flat tint plate sits behind it, knocked off-register */
jzReg('treat', 'xoOffsetFrame', {
    plan: function (rng, st) { return { d: rng.range(0.1, 0.15), dir: rng.pick([[1, 1], [1, 1], [-1, 1], [1, -1]]), c: rng.int(0, 1) }; },
    apply: function (ctx, L, P, o) {
        if (!axo_alive(L, 0.9) || !axo_lineLike(ctx, L)) return;
        var sc = ctx.sc, col = jzTextColor(L);
        if (axo_onPlate(sc, col)) return;
        var base = P.c ? (sc.accent2 || sc.accent) : sc.accent, tone = jzMixHex(sc.bg, base, 0.34);
        if (jzContrast(col, tone) < 3) tone = jzMixHex(sc.bg, base, 0.16);
        var lc = jzContrast(col, sc.bg) >= 2 ? col : axo_markCol(sc, col), dir = P.dir || [1, 1];
        var G = axo_lay(ctx, L), B = G.box, s = G.fs, V = G.vert, HD = axo_head(ctx, L, o), pad = s * 0.2, d = s * axo_p(P, 'd', 0.125);
        var x0 = B.x0 - pad, y0 = B.y0 - pad, w = B.x1 - B.x0 + pad * 2, h = B.y1 - B.y0 + pad * 2;
        var S = jzNoGhost(axo_shapeOn(ctx, L, 'JZ Offset frame', false, HD + AXO_POP + '*' + AXO_OUT));
        var gf = jzGrp(S, 'frame');
        jzAddPath(gf, [[x0, y0], [x0 + w, y0], [x0 + w, y0 + h], [x0, y0 + h], [x0, y0], [x0 + w * 0.02, y0]], false);
        jzAddStroke(gf, lc, Math.max(1.5 * ctx.u / axo_k(L), s * 0.022));
        jzAddTrimPaths(gf, HD + 'var x=cl((time-DL-0.08)/0.6);(x<0.5?4*x*x*x:1-Math.pow(2-2*x,3)/2)*100');
        // (the rect is configured before the fill is added — adding the fill invalidates r in AE)
        var gp = jzGrp(S, 'plate'), r = jzAddRect(gp, 1, 1), px = x0 + d * dir[0], py = y0 + d * dir[1];
        var Q = HD + 'var q=oe(cl((time-DL)/0.5)),w=' + jzN(w) + ',h=' + jzN(h) + ';';
        r.property('ADBE Vector Rect Size').expression = Q + (V ? '[w,h*q]' : '[w*q,h]');
        r.property('ADBE Vector Rect Position').expression = Q + (V ? '[' + jzN(px) + '+w/2,' + jzN(py) + '+h*q/2]' : '[' + jzN(px) + '+w*q/2,' + jzN(py) + '+h/2]');
        jzAddFill(gp, tone);
    }
});

/* ---- xoGlyphCorners — 字の角印: viewfinder ticks hug two opposite corners of every glyph */
jzReg('treat', 'xoGlyphCorners', {
    plan: function (rng, st) { return { t: rng.range(0.15, 0.2), flip: rng.chance(0.5) }; },
    apply: function (ctx, L, P, o) {
        if (!axo_alive(L, 0.9)) return;
        var lc = axo_markCol(ctx.sc, jzTextColor(L)), G = axo_lay(ctx, L), s = G.fs, V = G.vert, HD = axo_head(ctx, L, o), k, n = 0;
        var lw = Math.max(1.3 * ctx.u / axo_k(L), s * 0.02), t = s * axo_p(P, 't', 0.175), f = P.flip ? -1 : 1;
        var S = jzNoGhost(axo_shapeOn(ctx, L, 'JZ Glyph corners', true, HD + AXO_POP + '*' + AXO_OUT));
        for (k = 0; k < G.glyphs.length; k++) {
            var gl = G.glyphs[k];
            if (jzIsPunct(gl.ch)) continue;
            var hw = (V ? s : Math.max(gl.w, s * 0.5)) * 0.5, hh = (V ? Math.max(gl.h, s * 0.5) : s) * 0.5, g = jzGrp(S, 'corners ' + (gl.i + 1));
            jzAddPath(g, [[-hw * f, -hh + t], [-hw * f, -hh], [(-hw + t) * f, -hh]], false);
            jzAddPath(g, [[hw * f, hh - t], [hw * f, hh], [(hw - t) * f, hh]], false);
            jzAddStroke(g, lc, lw);
            var X = jzGX(g), Q = HD + 'var q=oc(cl((time-DL-' + jzN(0.05 + gl.i * 0.04) + ')/0.3));';
            X.property('ADBE Vector Position').setValue([gl.cx, gl.cy]);
            X.property('ADBE Vector Scale').expression = Q + 'var k=1+(1-q)*0.45;[100*k,100*k]';
            X.property('ADBE Vector Group Opacity').expression = Q + '100*q';
            n++;
        }
        if (!n) S.remove();
    }
});

/* ---- xoRuler — 目盛り: a ruler under each line: a hairline with short ticks, every fifth one longer (ticks appear one by one) */
jzReg('treat', 'xoRuler', {
    plan: function (rng, st) { return { p: rng.range(0.09, 0.12), up: rng.chance(0.3) }; },
    apply: function (ctx, L, P, o) {
        if (!axo_alive(L, 0.9) || jzCount(axo_doc(L).text) < 2) return;
        var lc = axo_markCol(ctx.sc, jzTextColor(L)), G = axo_lay(ctx, L), s = G.fs, HD = axo_head(ctx, L, o), kk = axo_k(L), k;
        if (!G.spans.length) return;
        var lw = Math.max(1.2 * ctx.u / kk, s * 0.014), sgn = P.up ? -1 : 1;
        var S = jzNoGhost(axo_shapeOn(ctx, L, 'JZ Ruler', true, HD + AXO_POP + '*' + AXO_OUT));
        for (k = 0; k < G.spans.length; k++) {
            var Sp = G.spans[k], V = Sp.vert, pitch = Math.max(4 * ctx.u / kk, s * axo_p(P, 'p', 0.105)), u0 = Sp.a0 - s * 0.05, len = Sp.a1 + s * 0.05 - u0;
            var m = Math.max(1, Math.min(160, Math.floor(len / pitch))), step = len / m, off = Sp.c + sgn * s * 0.62;
            var Q = HD + 'var q=oc(cl((time-DL-' + jzN(0.08 + k * 0.08) + ')/0.6)),n=Math.floor(' + m + '*q);';
            var g = jzGrp(S, 'rule ' + (k + 1));
            jzAddPath(g, [axo_uv(V, u0, off), axo_uv(V, u0 + len, off)], false); jzAddStroke(g, lc, lw);
            jzAddTrimPaths(g, Q + 'n/' + m + '*100');
            var st2 = axo_uv(V, step, 0), g2 = jzGrp(S, 'ticks ' + (k + 1));
            jzAddPath(g2, [axo_uv(V, u0, off), axo_uv(V, u0, off + sgn * s * 0.065)], false); jzAddStroke(g2, lc, lw);
            axo_rep(g2, m + 1, st2[0], st2[1]).property('ADBE Vector Repeater Copies').expression = Q + '(q>0.01?n+1:0)';
            var g3 = jzGrp(S, 'fifths ' + (k + 1));
            jzAddPath(g3, [axo_uv(V, u0, off), axo_uv(V, u0, off + sgn * s * 0.13)], false); jzAddStroke(g3, lc, lw);
            axo_rep(g3, Math.floor(m / 5) + 1, st2[0] * 5, st2[1] * 5).property('ADBE Vector Repeater Copies').expression = Q + '(q>0.01?Math.floor(n/5)+1:0)';
        }
    }
});

/* ---- xoThread — 貫き線: a thin line threads through each line of text and runs on past both ends; the glyphs sit in front of it */
jzReg('treat', 'xoThread', {
    plan: function (rng, st) { return { ext: rng.range(0.4, 0.7), k: rng.range(0.022, 0.03), dots: rng.chance(0.6) }; },
    apply: function (ctx, L, P, o) {
        if (!axo_alive(L, 0.9) || !axo_lineLike(ctx, L)) return;
        var sc = ctx.sc, col = jzTextColor(L);
        if (axo_onPlate(sc, col)) return;
        var lc = axo_markCol(sc, col), G = axo_lay(ctx, L), s = G.fs, HD = axo_head(ctx, L, o), kk = axo_k(L), k, e;
        if (!G.spans.length) return;
        // a paper-coloured stroke under the fills keeps the line off the glyphs
        jzTextDoc(L, function (td) { td.applyStroke = true; td.strokeColor = jzHex(sc.bg); td.strokeWidth = Math.max(2 * ctx.u / kk, s * 0.1); try { td.strokeOverFill = false; } catch (e1) {} });
        axo_fillsOver(L);
        var lw = Math.max(1.5 * ctx.u / kk, s * axo_p(P, 'k', 0.026)), ext = s * axo_p(P, 'ext', 0.55);
        var S = jzNoGhost(axo_shapeOn(ctx, L, 'JZ Thread', false, HD + AXO_POP));
        for (k = 0; k < G.spans.length; k++) {
            var Sp = G.spans[k], V = Sp.vert, u0 = Sp.a0 - ext, len = Sp.a1 + ext - u0, c = Sp.c + (V ? 0 : s * 0.02);
            var Q = HD + 'var q=oe(cl((time-DL-' + jzN(k * 0.08) + ')/0.55)),o=ic(PO),p1=Math.max(q,o);';
            if (P.dots) for (e = 0; e < 2; e++) {
                var gd = jzGrp(S, 'end ' + (k + 1) + (e ? 'b' : 'a'));
                jzAddEllipse(gd, lw * 3.8, lw * 3.8); jzAddFill(gd, lc);
                var X = jzGX(gd), al = jzN(u0) + '+' + jzN(len) + '*' + (e ? 'p1' : 'o');
                X.property('ADBE Vector Position').expression = Q + (V ? '[' + jzN(c) + ',' + al + ']' : '[' + al + ',' + jzN(c) + ']');
                X.property('ADBE Vector Group Opacity').expression = Q + '((q>0.005&&o<1&&' + jzN(len) + '*(p1-o)>=1)?100:0)';
            }
            var g = jzGrp(S, 'thread ' + (k + 1));
            jzAddPath(g, [axo_uv(V, u0, c), axo_uv(V, u0 + len, c)], false); jzAddStroke(g, lc, lw);
            jzAddTrimPaths(g, Q + 'p1*100', Q + 'o*100');
        }
    }
});

/* ---- xoSwoosh — 払い下線: a tapered brush-pen swoosh under each line: fat where it lands, a fine tail where it lifts */
jzReg('treat', 'xoSwoosh', {
    plan: function (rng, st) { return { k: rng.range(0.11, 0.15), bow: rng.range(0.05, 0.1), rev: rng.chance(0.25) }; },
    apply: function (ctx, L, P, o) {
        if (!axo_alive(L, 0.9) || jzCount(axo_doc(L).text) < 2) return;
        var lc = axo_markCol(ctx.sc, jzTextColor(L)), G = axo_lay(ctx, L), s = G.fs, HD = axo_head(ctx, L, o), k, j, M = 22;
        if (!G.spans.length) return;
        var kw = axo_p(P, 'k', 0.13), bow = axo_p(P, 'bow', 0.075);
        var S = jzNoGhost(axo_shapeOn(ctx, L, 'JZ Swoosh', true, HD + AXO_POP + '*' + AXO_OUT));
        for (k = 0; k < G.spans.length; k++) {
            var Sp = G.spans[k], V = Sp.vert, u0 = Sp.a0 - s * 0.08, len = Sp.a1 + s * 0.14 - u0, off = Sp.c + s * 0.66, top = [], bot = [];
            for (j = 0; j <= M; j++) {
                var t = j / M, tt = P.rev ? 1 - t : t;
                var th = s * kw * (0.08 + 0.92 * Math.pow(1 - t, 0.8)) * Math.sqrt(Math.min(1, t / 0.05 + 0.15));
                var v = off + s * bow * (1 - Math.sin(t * Math.PI * 0.85)) - s * bow * 0.5;
                top.push(axo_uv(V, u0 + len * tt, v - th / 2)); bot.push(axo_uv(V, u0 + len * tt, v + th / 2));
            }
            bot.reverse();
            var g = jzGrp(S, 'swoosh ' + (k + 1));
            jzAddPath(g, top.concat(bot), true); jzAddFill(g, lc);
            // the stroke is pulled out from where the brush lands
            var X = jzGX(g), pv = axo_uv(V, P.rev ? u0 + len : u0, off), Q = HD + 'var q=oc(cl((time-DL-' + jzN(0.1 + k * 0.1) + ')/0.45));';
            X.property('ADBE Vector Anchor').setValue(pv); X.property('ADBE Vector Position').setValue(pv);
            X.property('ADBE Vector Scale').expression = Q + (V ? '[100,100*q]' : '[100*q,100]');
            X.property('ADBE Vector Group Opacity').expression = Q + '(q>0.01?100:0)';
        }
    }
});

/* ---- xoTapedNote — 貼り紙: the lyric sits on a slip of paper held by two strips of tape */
jzReg('treat', 'xoTapedNote', {
    plan: function (rng, st) { return { tilt: rng.range(1, 2.4) * (rng.chance(0.5) ? 1 : -1), c: rng.int(0, 1), one: rng.chance(0.3) }; },
    apply: function (ctx, L, P, o) {
        if (!axo_alive(L, 0.9) || !axo_lineLike(ctx, L)) return;
        var sc = ctx.sc, col = jzTextColor(L), i;
        if (axo_onPlate(sc, col)) return;
        var paper = jzMixHex(sc.bg, sc.fg, 0.16);
        if (jzContrast(col, paper) < 2.6) paper = jzMixHex(sc.bg, sc.fg, 0.08);
        var tape = jzMixHex(P.c ? (sc.accent2 || sc.accent) : sc.accent, sc.bg, 0.25);
        var G = axo_lay(ctx, L), B = G.box, s = G.fs, HD = axo_head(ctx, L, o), pad = s * 0.24, hw = (B.x1 - B.x0) / 2 + pad, hh = (B.y1 - B.y0) / 2 + pad * 0.8;
        var tw = Math.min(s * 0.62, hw * 0.9), th = s * 0.19, Q = HD + 'var q=ob(cl((time-DL)/0.36),1.3);';
        var S = jzNoGhost(axo_shapeOn(ctx, L, 'JZ Taped note', false, Q + AXO_POP + '*' + AXO_OUT + '*Math.max(0,Math.min(1,q*1.4))'));
        var g = jzGrp(S, 'note'), strips = P.one ? [[0, -hh, -3]] : [[-hw, -hh, -40], [hw, -hh, 40]];
        for (i = 0; i < strips.length; i++) {
            var sg = axo_sub(g, 'tape ' + (i + 1));
            jzAddRect(sg, tw, th); jzAddFill(sg, tape, 82);
            var XS = jzGX(sg);
            XS.property('ADBE Vector Position').setValue([strips[i][0], strips[i][1]]); XS.property('ADBE Vector Rotation').setValue(strips[i][2]);
            XS.property('ADBE Vector Group Opacity').expression = HD + '100*oc(cl((time-DL-0.18)/0.25))';
        }
        var pg = axo_sub(g, 'paper');
        jzAddRect(pg, hw * 2, hh * 2); jzAddFill(pg, paper);
        var X = jzGX(g);
        X.property('ADBE Vector Position').setValue([B.cx, B.cy]);
        X.property('ADBE Vector Rotation').expression = Q + jzN(axo_p(P, 'tilt', 1.7)) + '*(1+(1-q)*3)';
        X.property('ADBE Vector Scale').expression = Q + '[90+10*q,90+10*q]';
    }
});

/* ---- xoHiliter — 蛍光ペン: two overlapping round-ended passes of a translucent highlighter, pulled at slightly different angles */
jzReg('treat', 'xoHiliter', {
    plan: function (rng, st) { return { c: rng.int(0, 1), tilt: rng.range(-0.035, 0.035), k: rng.range(0.46, 0.56) }; },
    apply: function (ctx, L, P, o) {
        if (!axo_alive(L, 0.9) || !axo_lineLike(ctx, L)) return;
        var sc = ctx.sc, col = jzTextColor(L);
        if (axo_onPlate(sc, col)) return;
        var hc = jzFitContrast(axo_first(P.c ? [sc.accent2, sc.accent] : [sc.accent, sc.accent2], function (c) { return jzContrast(c, col) >= 2; }, sc.accent), col, 2.4), dk = axo_dark(sc.bg);
        var G = axo_lay(ctx, L), s = G.fs, HD = axo_head(ctx, L, o), k;
        if (!G.spans.length) return;
        var S = jzNoGhost(axo_shapeOn(ctx, L, 'JZ Highlighter', false, HD + AXO_POP + '*' + AXO_OUT));
        var pass = function (nm, V, d, u0, u1, v0, v1, w) {
            var g = jzGrp(S, nm);
            jzAddPath(g, [axo_uv(V, u0, v0), axo_uv(V, u1, v1)], false);
            var st2 = jzAddStroke(g, hc, w, dk ? 80 : 62);
            try { st2.property('ADBE Vector Stroke Line Cap').setValue(2); } catch (e) {}
            jzAddTrimPaths(g, HD + 'oc(cl((time-DL-' + jzN(d) + ')/0.3))*100');
        };
        for (k = 0; k < G.spans.length; k++) {
            var Sp = G.spans[k], len = Sp.a1 - Sp.a0, w1 = s * axo_p(P, 'k', 0.5), w2 = w1 * 0.8, t = len * axo_p(P, 'tilt', 0);
            pass('pass ' + (k + 1) + 'b', Sp.vert, 0.22 + k * 0.1, Sp.a1 - w2 * 0.1, Sp.a0 + len * 0.12, Sp.c + s * 0.26 - t * 0.6, Sp.c + s * 0.3 + t * 0.6, w2);
            pass('pass ' + (k + 1) + 'a', Sp.vert, 0.06 + k * 0.1, Sp.a0 + w1 * 0.2, Sp.a1 + s * 0.06, Sp.c - s * 0.06 + t, Sp.c - s * 0.06 - t, w1);
        }
    }
});

/* ---- xoAccentTicks — 強調線: three short ticks burst from the top corner of the lyric, like a comic "!" accent */
jzReg('treat', 'xoAccentTicks', {
    plan: function (rng, st) { return { left: rng.chance(0.35), n: rng.pick([3, 3, 2]), k: rng.range(0.42, 0.56) }; },
    apply: function (ctx, L, P, o) {
        if (!axo_alive(L, 0.9) || !axo_lineLike(ctx, L)) return;
        var lc = axo_markCol(ctx.sc, jzTextColor(L)), G = axo_lay(ctx, L), B = G.box, s = G.fs, HD = axo_head(ctx, L, o), sg = P.left ? -1 : 1, n = P.n === 2 ? 2 : 3, k;
        var ox = B.cx + sg * ((B.x1 - B.x0) / 2 + s * 0.02), oy = B.y0 + s * 0.04, angs = n === 2 ? [-62, -28] : [-76, -45, -14];
        var Q = HD + 'var q=ob(cl((time-DL-IN*0.6)/0.28),2.2);';
        var S = jzNoGhost(axo_shapeOn(ctx, L, 'JZ Accent ticks', true, Q + AXO_POP + '*' + AXO_OUT + '*Math.max(0,Math.min(1,q))'));
        var g = jzGrp(S, 'ticks');
        for (k = 0; k < n; k++) {
            // drawn 1.25x long, shown through Trim Paths: room for the overshoot and the pulse
            var a = angs[k] * Math.PI / 180, r0 = s * 0.22, r1 = r0 + s * axo_p(P, 'k', 0.49) * (k === 1 || n === 2 ? 1 : 0.7) * 1.25;
            jzAddPath(g, [[ox + sg * Math.cos(a) * r0, oy + Math.sin(a) * r0], [ox + sg * Math.cos(a) * r1, oy + Math.sin(a) * r1]], false);
        }
        var st2 = jzAddStroke(g, lc, Math.max(2.5 * ctx.u / axo_k(L), s * 0.065));
        try { st2.property('ADBE Vector Stroke Line Cap').setValue(2); } catch (e) {}
        jzAddTrimPaths(g, Q + 'Math.max(0,Math.min(100,q*(1+0.07*Math.sin(time*5))*80))');
    }
});

// ================================================================ PER-GLYPH ALTERNATION
/* ---- xoAltWeight — 太細交互: heavy and light glyphs take turns: every other one is fattened (stroke in the text colour),
        the rest are pared down (a thin paper-coloured stroke over the fill) */
jzReg('treat', 'xoAltWeight', {
    plan: function (rng, st) { return { k: rng.range(0.9, 1.15), first: rng.chance(0.5) }; },
    apply: function (ctx, L, P, o) {
        if (!axo_alive(L)) return;
        var sc = ctx.sc, col = jzTextColor(L), G = axo_lay(ctx, L), s = G.fs, ix = axo_ix(G, o), oo = P.first ? 0 : 1, plate = axo_onPlate(sc, col), i;
        // how much to add / pare depends on the face: black faces are pared, hairline faces are only fattened
        var f = String((o && o.font) || ''), black = /black|dela|reggae|potta|pop|brush|rampart/.test(f), fine = /light|^mincho$|mincho_bold|klee|tokumin|shippori|mono|kiwi|sansui|med/.test(f);
        var kv = axo_p(P, 'k', 1), kB = (black ? 0.026 : fine ? 0.062 : 0.045) * kv, kT = (black ? 0.046 : fine ? 0 : 0.022) * kv;
        var lt = [], pu = [], nL = 0, nP = 0;
        for (i = 0; i < G.n; i++) {
            var c = G.chars[i], isP = !!c && !c.sp && jzIsPunct(c.ch), isL = !!c && !c.sp && !isP && (ix[i] + oo) % 2 !== 0;
            lt.push(isL ? 1 : 0); pu.push(isP ? 1 : 0); if (isL) nL++; if (isP) nP++;
        }
        jzTextDoc(L, function (td) { td.applyStroke = true; td.strokeColor = jzHex(col); td.strokeWidth = s * kB; try { td.strokeOverFill = true; } catch (e) {} });
        if (nL) {
            if (!plate && kT > 0) jzAnimator(L, 'JZ Light glyphs', [['ADBE Text Stroke Color', jzHex(sc.bg)], ['ADBE Text Stroke Width', s * kT]], 'var a=' + axo_arr(lt) + ';(a[textIndex-1]||0)*100');
            else jzAnimator(L, 'JZ Light glyphs', [['ADBE Text Stroke Opacity', 0]], 'var a=' + axo_arr(lt) + ';(a[textIndex-1]||0)*100');
        }
        if (nP) jzAnimator(L, 'JZ Plain punctuation', [['ADBE Text Stroke Opacity', 0]], 'var a=' + axo_arr(pu) + ';(a[textIndex-1]||0)*100');
    }
});

/* ---- xoTallWide — 長平交互: condensed-tall and flat-wide glyphs alternate */
jzReg('treat', 'xoTallWide', {
    plan: function (rng, st) { return { k: rng.range(0.76, 0.82), first: rng.chance(0.5) }; },
    apply: function (ctx, L, P, o) {
        if (!axo_alive(L, 0.5)) return;
        var G = axo_lay(ctx, L), ix = axo_ix(G, o), oo = P.first ? 0 : 1, k = axo_p(P, 'k', 0.79), K = 1.13, ax = [], ay = [], i;
        for (i = 0; i < G.n; i++) {
            var c = G.chars[i];
            if (!c || c.sp || jzIsPunct(c.ch)) { ax.push(1); ay.push(1); continue; }
            var tall = (ix[i] + oo) % 2 === 0;
            ax.push(tall ? k : K); ay.push(tall ? K : k);
        }
        jzAnimator(L, 'JZ Tall and wide', [['ADBE Text Scale 3D', [300, 300, 100]]], 'var ax=' + axo_arr(ax) + ',ay=' + axo_arr(ay) + ';var i=textIndex-1,x=ax[i],y=ay[i];x=x==null?1:x;y=y==null?1:y;[(x-1)/2*100,(y-1)/2*100,0]');
    }
});

/* ---- xoMixedFills — 柄違い: the glyphs cycle through three fills: solid ink, screened dots (or a grid) and ruled lines (stripes / hatch) */
jzReg('treat', 'xoMixedFills', {
    plan: function (rng, st) { return { a: rng.pick(['dots', 'dots', 'grid']), b: rng.pick(['lines', 'stripes', 'hatch']), o: rng.int(0, 2) }; },
    apply: function (ctx, L, P, o) {
        if (!axo_alive(L)) return;
        var sc = ctx.sc, col = jzTextColor(L), tone = jzMixHex(col, sc.bg, 0.72), G = axo_lay(ctx, L), s = G.fs, kk = axo_k(L), ix = axo_ix(G, o), far = axo_far(ctx, L), i, j;
        var md = [], need = [0, 0, 0], po = axo_p(P, 'o', 0);
        for (i = 0; i < G.n; i++) {
            var c = G.chars[i], m = (!c || c.sp || jzIsPunct(c.ch)) ? 0 : (ix[i] + po) % 3;
            md.push(m); need[m]++;
        }
        if (!need[1] && !need[2]) return;
        var rnd = axo_rnd(L), HD = axo_head(ctx, L, o), kinds = [null, P.a || 'dots', P.b || 'lines'], bx = axo_padBox(G, s * 0.6);
        // each pattern lies over the solid lyric, seen through a copy that keeps only its glyphs (the copy is the matte)
        for (j = 1; j <= 2; j++) {
            if (!need[j]) continue;
            var hide = [];
            for (i = 0; i < G.n; i++) hide.push(md[i] === j ? 0 : 1);
            var M = axo_copy(L, 'JZ Mixed fill matte ' + j, L, '#FFFFFF', 0, true);
            M.moveBefore(L);
            jzAnimator(M, 'JZ Only these glyphs', [['ADBE Text Opacity', 0]], 'var a=' + axo_arr(hide) + ';(a[textIndex-1]||0)*100');
            var F = jzNoGhost(axo_shapeOn(ctx, L, 'JZ Mixed fill ' + kinds[j], true, rnd ? HD + '100*' + AXO_REST : null));
            axo_pattern(ctx, F, kinds[j], col, s, bx, kk);
            axo_box(F, 'tone', G.box.cx - far, G.box.cx + far, G.box.cy - far, G.box.cy + far, tone);
            axo_matte(M, F);
        }
        // keyline: the lyric's own stroke stays visible around the patterned glyphs
        jzTextDoc(L, function (td) { td.applyStroke = true; td.strokeColor = jzHex(col); td.strokeWidth = Math.max(1.2 * ctx.u / kk, s * 0.02); try { td.strokeOverFill = false; } catch (e) {} });
    }
});

/* ---- xoTrackRamp — 字間漸増: the gaps between glyphs grow step by step along the line (the line keeps its length) */
jzReg('treat', 'xoTrackRamp', {
    plan: function (rng, st) { return { t: rng.range(0.3, 0.44), rev: rng.chance(0.35) }; },
    apply: function (ctx, L, P, o) {
        var td0 = axo_doc(L);
        if (!jzTrim(String(td0.text || '')) || !(td0.fontSize > 1)) return;
        var G = axo_lay(ctx, L), V = G.vert, lines = axo_lines(G), tk = axo_p(P, 't', 0.37), sh = 1 / (1 + tk), offs = [], scs = [], ok = false, i, j, k;
        for (j = 0; j < lines.length; j++) if (lines[j].length >= 3) ok = true;
        if (!ok) return;
        for (i = 0; i < G.n; i++) { offs.push([0, 0]); scs.push(sh); }
        var LEFT = ParagraphJustification.LEFT_JUSTIFY, RIGHT = ParagraphJustification.RIGHT_JUSTIFY;
        var ext = function (g) { return V ? g.h : g.w; }, pos = function (g) { return V ? g.cy : g.cx; };
        for (j = 0; j < lines.length; j++) {
            var gs = lines[j], n = gs.length;
            if (!n) continue;
            var old0 = pos(gs[0]) - ext(gs[0]) / 2, old1 = pos(gs[n - 1]) + ext(gs[n - 1]) / 2, len = old1 - old0, T = tk * len, Ws = Math.max(1, (n - 1) * (n - 2) / 2), cum = 0;
            for (k = 0; k < n; k++) {
                var g = gs[k], xp = pos(g) + cum, x2;
                if (G.just === LEFT && !V) x2 = old0 + (xp - old0) * sh;
                else if (G.just === RIGHT && !V) x2 = old1 + (xp - (old1 + T)) * sh;
                else { var cc = (old0 + old1) / 2; x2 = cc + (xp - (cc + T / 2)) * sh; }
                offs[g.i] = V ? [0, x2 - pos(g)] : [x2 - pos(g), 0];
                if (k < n - 1) cum += n >= 3 ? T * (P.rev ? n - 2 - k : k) / Ws : T;
            }
        }
        jzCharScales(L, scs, 'JZ Track ramp size');
        jzCharOffsets(L, offs, 'JZ Track ramp');
    }
});

// ================================================================ PRINT LOOKS
/* ---- xoDoublePrint — 二度刷り: a faint second impression sits slightly off and askew behind the lyric */
jzReg('treat', 'xoDoublePrint', {
    plan: function (rng, st) { return { d: rng.range(0.05, 0.075), r: rng.range(0.7, 1.5) * (rng.chance(0.5) ? 1 : -1), a: rng.range(0.34, 0.44), up: rng.chance(0.5) }; },
    apply: function (ctx, L, P, o) {
        if (!axo_alive(L, 0.9)) return;
        var G = axo_lay(ctx, L), bx = G.box, s = G.fs, HD = axo_head(ctx, L, o), Sc = axo_sv(L, 'ADBE Scale');
        var along = Math.max((bx.x1 - bx.x0) * Math.abs(Sc[0]) / 100, (bx.y1 - bx.y0) * Math.abs(Sc[1]) / 100) / Math.max(0.01, ctx.u);
        var d = s * axo_p(P, 'd', 0.06), d2 = d * (P.up ? -0.45 : 0.45), r = axo_p(P, 'r', 1) * Math.min(1, 700 / Math.max(1, along));
        var D = jzNoGhost(axo_dup(L, 'JZ Second print', L));
        jzXf(D, 'ADBE Opacity').setValue(axo_sv(L, 'ADBE Opacity') * axo_p(P, 'a', 0.39));
        var Q = HD + 'var q=oc(cl((time-DL-0.02)/0.35))*' + AXO_OUT + (axo_rnd(L) ? '*' + AXO_REST : '') + ';';
        var tf = jzEffect(D, 'ADBE Geometry2', 'JZ Second print');
        jzEP(tf, 1, [bx.cx, bx.cy]);
        jzEX(tf, 2, Q + '[' + jzN(bx.cx) + '+' + jzN(d) + '*q,' + jzN(bx.cy) + '+' + jzN(d2) + '*q]');
        jzEX(tf, 8, Q + jzN(r) + '*q');
        jzEX(tf, 9, Q + '(q>0.02?100:0)');
    }
});

/* ---- xoHalfKnock — 半抜き: a solid bar of the text colour covers the lower half of each line; where the glyphs cross it they flip to the paper colour */
function axo_knockBars(S, G, P, HD, hex) {
    var s = G.fs, at = axo_p(P, 'at', 0.03), k;
    for (k = 0; k < G.spans.length; k++) {
        var Sp = G.spans[k], pad = s * 0.16, a0 = Sp.a0 - pad, len = Sp.a1 + pad - a0, v0 = Sp.c + s * at, v1 = Sp.c + s * 0.62;
        if (P.top) { v0 = Sp.c - s * 0.62; v1 = Sp.c - s * at; }                  // top half (vertical columns: left half) instead
        // (the rect is configured before the fill is added — adding the fill invalidates r in AE)
        var g = jzGrp(S, 'bar ' + (k + 1)), r = jzAddRect(g, 1, 1);
        var E = HD + 'var q=oe(cl((time-DL-' + jzN(0.03 + k * 0.07) + ')/0.4)),o=ic(PO);var p0=' + jzN(a0) + '+' + jzN(len) + '*o,p1=' + jzN(a0) + '+' + jzN(len) + '*Math.max(q,o),l=p1-p0;if(l<1)l=0;';
        r.property('ADBE Vector Rect Size').expression = E + (Sp.vert ? '[' + jzN(v1 - v0) + ',l]' : '[l,' + jzN(v1 - v0) + ']');
        r.property('ADBE Vector Rect Position').expression = E + (Sp.vert ? '[' + jzN((v0 + v1) / 2) + ',(p0+p1)/2]' : '[(p0+p1)/2,' + jzN((v0 + v1) / 2) + ']');
        jzAddFill(g, hex);
    }
}
jzReg('treat', 'xoHalfKnock', {
    plan: function (rng, st) { return { at: rng.range(-0.04, 0.1), top: rng.chance(0.25) }; },
    apply: function (ctx, L, P, o) {
        if (!axo_alive(L, 0.9)) return;
        var sc = ctx.sc, col = jzTextColor(L);
        if (axo_onPlate(sc, col)) return;
        var tc = axo_textOn(col, sc.bg, sc), G = axo_lay(ctx, L), HD = axo_head(ctx, L, o), far = axo_far(ctx, L);
        if (!G.spans.length) return;
        // the bars behind the lyric, and the same bars in the knock-out colour inside its glyphs (fill layer through the lyric)
        var S = jzNoGhost(axo_shapeOn(ctx, L, 'JZ Half knockout bar', false, HD + AXO_POP));
        axo_knockBars(S, G, P, HD, col);
        var F = axo_fillLayer(ctx, L, 'JZ Half knockout fill');
        axo_knockBars(F, G, P, HD, tc);
        axo_box(F, 'base', G.box.cx - far, G.box.cx + far, G.box.cy - far, G.box.cy + far, col);
    }
});

/* ---- xoTopCrop — 頭切り: the tops (or feet) of the glyphs are trimmed off along a hairline, as if the sheet had been cut there */
jzReg('treat', 'xoTopCrop', {
    plan: function (rng, st) { return { k: rng.range(0.19, 0.24), foot: rng.chance(0.3) }; },
    apply: function (ctx, L, P, o) {
        if (!axo_alive(L)) return;
        var lc = axo_markCol(ctx.sc, jzTextColor(L)), G = axo_lay(ctx, L), s = G.fs, V = G.vert, HD = axo_head(ctx, L, o), far = axo_far(ctx, L), kc = axo_p(P, 'k', 0.215), i, mk;
        if (!G.rows.length) return;
        var side = (!!P.foot !== V) ? 1 : -1;                                   // +1: bottom (vertical: right) edge is trimmed
        var Q = HD + 'var g=oc(cl((time-DL-IN*0.5)/0.35))*' + AXO_OUT + ';', bx = G.box, cuts = [];
        // subtract masks in the lyric's own space; their expansion pulls the cut edge back while the trim opens / closes
        if (V) { var cv = G.spans.length ? G.spans[0].c : bx.cx; cuts.push(side > 0 ? [cv + (0.5 - kc) * s, bx.y0 - far, bx.cx + far, bx.y1 + far] : [bx.cx - far, bx.y0 - far, cv - (0.5 - kc) * s, bx.y1 + far]); }
        else for (i = 0; i < G.rows.length; i++) {
            var lim = axo_rowLim(G, i, far), cy = G.rows[i].cy;
            cuts.push(side > 0 ? [bx.cx - far, cy + (0.5 - kc) * s, bx.cx + far, lim[1]] : [bx.cx - far, lim[0], bx.cx + far, cy - (0.5 - kc) * s]);
        }
        for (i = 0; i < cuts.length; i++) {
            mk = jzMaskRect(L, cuts[i][0], cuts[i][1], cuts[i][2], cuts[i][3]);
            mk.maskMode = MaskMode.SUBTRACT;
            jzSetExpr(mk.property('ADBE Mask Offset'), Q + '-(1-g)*' + jzN(kc * s));
        }
        if (!axo_lineLike(ctx, L) || !G.spans.length) return;
        var S = jzNoGhost(axo_shapeOn(ctx, L, 'JZ Crop line', true, Q + AXO_POP + '*Math.min(1,g*1.5)')), lw = Math.max(1.4 * ctx.u / axo_k(L), s * 0.018);
        for (i = 0; i < G.spans.length; i++) {
            var Sp = G.spans[i], u0 = Sp.a0 - s * 0.3, len = Sp.a1 + s * 0.3 - u0, v = Sp.c + side * (0.5 - kc) * s, gl = jzGrp(S, 'cut ' + (i + 1));
            jzAddPath(gl, [axo_uv(V, u0, v), axo_uv(V, u0 + len, v)], false); jzAddStroke(gl, lc, lw);
            jzAddTrimPaths(gl, HD + 'oe(cl((time-DL-IN*0.5-' + jzN(i * 0.06) + ')/0.4))*100');
            var sf = jzN(side * kc * s) + '*(1-g)';
            jzGX(gl).property('ADBE Vector Position').expression = Q + (V ? '[' + sf + ',0]' : '[0,' + sf + ']');
        }
    }
});

/* ---- xoOverlapKern — 重ね詰め: poster kerning: the glyphs are set so tight that each one overlaps the last, cut apart by a paper-coloured edge */
jzReg('treat', 'xoOverlapKern', {
    plan: function (rng, st) { return { t: rng.range(0.13, 0.17), k: rng.range(0.05, 0.065) }; },
    apply: function (ctx, L, P, o) {
        var txt = String(axo_doc(L).text || '');
        if (!axo_alive(L) || jzCount(txt) < 2) return;
        var sc = ctx.sc, col = jzTextColor(L);
        if (axo_onPlate(sc, col)) return;
        var vert = axo_isVert(L), latin = /[A-Za-z0-9]/.test(txt), Sc = axo_sv(L, 'ADBE Scale'), kx = Math.abs(Sc[0]) / 100, ky = Math.abs(Sc[1]) / 100, kk = axo_k(L);
        var r0 = jzRect(L), a0 = vert ? r0.height * ky : r0.width * kx, tk = -axo_p(P, 't', 0.15) * (latin ? 0.4 : vert ? 0.8 : 1);
        axo_reanchor(L, function () {
            jzTextDoc(L, function (td) { axo_addTrack(td, tk, vert); });
            var r1 = jzRect(L), a1 = vert ? r1.height * ky : r1.width * kx, k = jzClamp(a0 / Math.max(1, a1), 1, 1.16);
            // each glyph's paper-coloured stroke lies over the glyph before it (After Effects draws character by character)
            jzTextDoc(L, function (td) {
                if (k > 1.001) { td.fontSize = td.fontSize * k; if (td.autoLeading === false) td.leading = td.leading * k; }
                td.applyStroke = true; td.strokeColor = jzHex(sc.bg); td.strokeWidth = Math.max(2 * ctx.u / kk, td.fontSize * axo_p(P, 'k', 0.057));
                try { td.strokeOverFill = false; } catch (e) {}
            });
        });
    }
});
