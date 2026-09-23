// ================================================================ text treatments part 2 (AE port of the treat entries in src/11p_treattrans.js)
// treat.apply(ctx, L, P, o) runs for every MAIN lyric layer after its motion is set. P = the cut's treatP (browser plan keys).
// Tools used here (same ideas as part 1, own tr2_ helpers):
//  - effects on the lyric itself (Drop Shadows for glows / rings / flat offsets, Wave Warp, Transform) — they follow every
//    per-glyph motion exactly;
//  - text animators with Expression Selectors for per-glyph colour / size / tilt / blur / opacity;
//  - shape layers parented to the lyric (its layer space) for marks (rings, plates, brackets, grid lines);
//  - the lyric (or a filled copy) as the alpha track matte of a fill layer for multi-stop / animated fills;
//  - duplicates of the lyric (L.duplicate() keeps text, animators, effects and motion) for copies drawn with another
//    style. AE's random() / wiggle() depend on the layer, so when the motion uses them (tr2_rnd) a duplicate is only
//    shown while the glyphs rest (after the entrance, before the exit) or a duplicate-free fallback is used.
// Layers the browser draws on the main pass only (copies, paper, grid, brackets, cut line, liquid, tone) are marked
// jzNoGhost so the tinted ghost copies of the content comp leave them out; effects on the lyric itself stay in the ghosts.

// ---------------------------------------------------------------- shared helpers (tr2_)
function tr2_p(P, k, d) { return (P && P[k] != null) ? P[k] : d; }
function tr2_first(list, test, fb) { for (var i = 0; i < list.length; i++) if (list[i] && test(list[i])) return list[i]; return fb; }
function tr2_best(list, against) { var b = list[0], bv = -1; for (var i = 0; i < list.length; i++) { if (!list[i]) continue; var v = jzContrast(list[i], against); if (v > bv) { bv = v; b = list[i]; } } return b; }
function tr2_dark(c) { return jzLum(c) < 0.45; }
function tr2_accentFor(sc, col, min) {
    if (min == null) min = 1.6;
    return tr2_first([sc.accent, sc.accent2, sc.ghostA, sc.ghostB], function (c) { return jzContrast(c, col) >= min && jzContrast(c, sc.bg) >= 1.5; }, jzFitContrast(sc.accent, col, min + 0.3));
}
function tr2_textOn(box, pref, sc) { return jzContrast(pref, box) >= 3 ? pref : tr2_best([sc.bg, sc.fg, sc.ink, '#111111', '#FFFFFF'], box); }
function tr2_markCol(sc, col) { return tr2_first([sc.accent, sc.accent2, col], function (c) { return jzContrast(c, sc.bg) >= 2; }, col); }
function tr2_onPlate(sc, col) { return jzContrast(col, sc.bg) < 1.5; }
function tr2_isSp(ch) { return /^[\s　]$/.test(ch); }

function tr2_sv(L, mn) { var p = jzXf(L, mn); try { return p.valueAtTime(0, true); } catch (e) { return p.value; } }
function tr2_doc(L) { return L.property('ADBE Text Properties').property('ADBE Text Document').value; }
function tr2_alive(L, amin) {
    var td; try { td = tr2_doc(L); } catch (e) { return false; }
    if (!td || td.applyFill === false || !jzTrim(String(td.text || '')) || !(td.fontSize > 1)) return false;
    return tr2_sv(L, 'ADBE Opacity') >= (amin == null ? 0.9 : amin) * 100 - 0.01;
}
function tr2_head(ctx, L, o) { return jzHead(ctx, { mi: (o && o.mi) || 0, size: jzFontSize(L) }); }
function tr2_mi(o) { return (o && o.mi) | 0; }
function tr2_k(L) { var s = tr2_sv(L, 'ADBE Scale'); return Math.max(0.01, (Math.abs(s[0]) + Math.abs(s[1])) / 200); }
function tr2_many(ctx) { return ctx.comp.numLayers > 30; }
function tr2_budget(ctx, want) { var n = ctx.comp.numLayers; return n > 30 ? Math.min(want, 2) : (n > 16 ? Math.min(want, 3) : want); }
function tr2_arr(a) { var s = []; for (var i = 0; i < a.length; i++) s.push(a[i] == null ? 'null' : jzN(a[i])); return '[' + s.join(',') + ']'; }
// does the lyric's motion use per-layer randomness (random / wiggle)? then duplicates stray while the glyphs move
function tr2_rnd(L) {
    var re = /random|wiggle/, i, j, an, fx, mns = ['ADBE Position', 'ADBE Scale', 'ADBE Rotate Z', 'ADBE Opacity'];
    var chk = function (p) { try { return !!(p && p.expression && re.test(p.expression)); } catch (e) { return false; } };
    try {
        an = L.property('ADBE Text Properties').property('ADBE Text Animators');
        for (i = 1; i <= an.numProperties; i++) {
            var sels = an.property(i).property('ADBE Text Selectors'), pr = an.property(i).property('ADBE Text Animator Properties');
            for (j = 1; j <= sels.numProperties; j++) if (sels.property(j).matchName === 'ADBE Text Expressible Selector' && chk(sels.property(j).property('ADBE Text Expressible Amount'))) return true;
            for (j = 1; j <= pr.numProperties; j++) if (chk(pr.property(j))) return true;
        }
        fx = L.property('ADBE Effect Parade');
        for (i = 1; i <= fx.numProperties; i++) for (j = 1; j <= fx.property(i).numProperties; j++) if (chk(fx.property(i).property(j))) return true;
        for (i = 0; i < mns.length; i++) if (chk(jzXf(L, mns[i]))) return true;
    } catch (e2) { return true; }
    return false;
}
// "glyphs at rest" factor (after the entrance, before the exit) for duplicates of a randomly moving lyric
var TR2_REST = 'cl((time-DL-IN*1.02)/0.15)*(1-cl(PO*6))';
function tr2_gate(D, HD) { var tf = jzEffect(D, 'ADBE Geometry2', 'JZ At rest'); jzEX(tf, 9, HD + '100*' + TR2_REST); return tf; }

function tr2_dup(L, name, after) { var D = L.duplicate(); try { D.name = name; } catch (e) {} D.moveAfter(after || L); return D; }
function tr2_recolor(D, hex) {
    var an = D.property('ADBE Text Properties').property('ADBE Text Animators'), i, c = jzHex(hex);
    for (i = 1; i <= an.numProperties; i++) {
        var pr = an.property(i).property('ADBE Text Animator Properties'), f = pr.property('ADBE Text Fill Color'), s = pr.property('ADBE Text Stroke Color');
        if (f) f.setValue(c);
        if (s) s.setValue(c);
    }
}
// copy of L: fill `hex` (fill=false: none), stroke `stroke` px in `shex` (default hex, under the fill), shifted (dx, dy) in its own frame
function tr2_copy(L, name, after, hex, stroke, dx, dy, fill, shex) {
    var D = tr2_dup(L, name, after);
    jzTextDoc(D, function (td) {
        td.applyFill = fill !== false; if (td.applyFill) td.fillColor = jzHex(hex);
        if (stroke > 0) { td.applyStroke = true; td.strokeColor = jzHex(shex || hex); td.strokeWidth = stroke; try { td.strokeOverFill = false; } catch (e) {} }
        else td.applyStroke = false;
    });
    tr2_recolor(D, hex);
    if (dx || dy) tr2_shift(D, dx, dy);
    return D;
}
// move a layer's content by (dx, dy) layer px through its anchor point (the offset scales / rotates with the layer)
function tr2_shift(D, dx, dy) {
    var a = tr2_sv(D, 'ADBE Anchor Point');
    jzXf(D, 'ADBE Anchor Point').setValue([a[0] - (dx || 0), a[1] - (dy || 0)]);
}
// Drop Shadow on L (offset in layer px; direction from the vector)
function tr2_shadow(L, name, hex, dx, dy, soft, alpha) {
    var e = jzEffect(L, 'ADBE Drop Shadow', name);
    jzEP(e, 1, jzHex(hex)); jzEP(e, 2, Math.round(jzClamp(alpha == null ? 1 : alpha, 0, 1) * 255));
    jzEP(e, 3, (dx || dy) ? ((Math.atan2(dx, -dy) * 180 / Math.PI) + 360) % 360 : 135); jzEP(e, 4, Math.sqrt(dx * dx + dy * dy));
    if ((soft || 0) <= 250) jzEP(e, 5, soft || 0); else jzEX(e, 5, jzN(soft));
    return e;
}
// outer ring of radius r (layer px) grown from the layer's alpha: 8 stacked hard shadows at 45deg steps (octagon zonotope)
function tr2_ring(L, name, hex, r) {
    var d = Math.max(0.3, r) * 0.4142, i;
    for (i = 0; i < 8; i++) tr2_shadow(L, name + ' ' + (i + 1), hex, Math.cos(i * Math.PI / 4) * d, Math.sin(i * Math.PI / 4) * d, 0, 1);
}
// alpha track matte: F shows only inside matte M's alpha (inv: outside it); M hidden
function tr2_matte(M, F, inv) {
    F.moveAfter(M);
    var ok = false, tp = inv ? TrackMatteType.ALPHA_INVERTED : TrackMatteType.ALPHA;
    if (typeof F.setTrackMatte === 'function') { try { F.setTrackMatte(M, tp); ok = true; } catch (e) { ok = false; } }
    if (!ok) F.trackMatteType = tp;
    M.enabled = false;
}
// shape layer in L's layer space (parented, identity transform); opx: opacity expression (null = none)
function tr2_shapeOn(ctx, L, name, above, opx) {
    var S = ctx.comp.layers.addShape(); S.name = name;
    S.parent = L;
    jzXf(S, 'ADBE Anchor Point').setValue([0, 0]); jzXf(S, 'ADBE Position').setValue([0, 0]);
    jzXf(S, 'ADBE Scale').setValue([100, 100]); jzXf(S, 'ADBE Rotate Z').setValue(0);
    if (above) S.moveBefore(L); else S.moveAfter(L);
    if (opx) jzSetExpr(jzXf(S, 'ADBE Opacity'), opx);
    return S;
}
var TR2_POP = 'value*(hasParent?parent.transform.opacity/100:1)';
function tr2_far(ctx, L) { return (ctx.W + ctx.H) * 2 / tr2_k(L); }
// keep the anchor at the same relative spot of the text box while fn() changes the text document
function tr2_reanchor(L, fn) {
    var r0 = jzRect(L), a = tr2_sv(L, 'ADBE Anchor Point');
    var fx = r0.width > 0.5 ? (a[0] - r0.left) / r0.width : 0.5, fy = r0.height > 0.5 ? (a[1] - r0.top) / r0.height : 0.5;
    fn();
    var r1 = jzRect(L);
    jzXf(L, 'ADBE Anchor Point').setValue([r1.left + fx * r1.width, r1.top + fy * r1.height]);
}

// ---- text geometry in the layer's own space
function tr2_rectOf(ctx, L, str) {
    var td = tr2_doc(L), P = ctx.comp.layers.addText(str), r = null;
    try {
        td.text = str; td.applyStroke = false;
        P.property('ADBE Text Properties').property('ADBE Text Document').setValue(td);
        r = P.sourceRectAtTime(0, false);
    } catch (e) { r = null; }
    try { P.remove(); } catch (e2) {}
    if (!r || !(r.width >= 0)) { var n = jzChars(str).length; r = { left: -td.fontSize * n / 2, top: -td.fontSize * 0.88, width: td.fontSize * n, height: td.fontSize }; }
    return { left: r.left, top: r.top, width: r.width, height: r.height };
}
function tr2_adv(ch) {
    var c = ch.charCodeAt(0);
    if (ch === '　' || c >= 0x2E80 || (c >= 0xFF01 && c <= 0xFF60)) return 1;
    if (ch === ' ') return 0.3;
    if (/[MWmw@%]/.test(ch)) return 0.86;
    if (/[A-Z]/.test(ch)) return 0.66;
    if (/[a-z0-9]/.test(ch)) return 0.55;
    return 0.34;
}
// rows with every character (spaces too: ci / n like the browser's layout), glyph centres (textIndex order), line spans
// (one per row; one per column for vertical text = one glyph per row), and the glyph box
function tr2_lay(ctx, L) {
    var td = tr2_doc(L), fs = td.fontSize, lead = (td.autoLeading === false && td.leading > 0) ? td.leading : fs * 1.2;
    var trk = (td.tracking || 0) / 1000 * fs, just = td.justification;
    var LEFT = ParagraphJustification.LEFT_JUSTIFY, RIGHT = ParagraphJustification.RIGHT_JUSTIFY;
    var rowsT = String(td.text).split(/\r\n|\r|\n/), rows = [], glyphs = [], chars = [], gi = 0, vert = rowsT.length > 1, i, k;
    for (i = 0; i < rowsT.length; i++) {
        var cs = jzChars(rowsT[i]), n = cs.length, vis = 0;
        for (k = 0; k < n; k++) if (!tr2_isSp(cs[k])) vis++;
        if (vis > 1) vert = false;
        if (!vis) { gi += n; continue; }
        var r = tr2_rectOf(ctx, L, rowsT[i]), adv = [], tot = 0;
        for (k = 0; k < n; k++) { adv.push(tr2_adv(cs[k]) * fs); tot += adv[k] + (k < n - 1 ? trk : 0); }
        var kf = r.width > 1 && tot > 1 ? r.width / tot : 1; if (kf < 0.8 || kf > 1.25) kf = 1;
        var w = tot * kf, x0 = just === LEFT ? r.left : (just === RIGHT ? r.left + r.width - w : r.left + r.width / 2 - w / 2);
        var base = i * lead, cy = base - 0.38 * fs, x = x0, row = { li: i, x0: x0, x1: x0 + w, cy: cy, base: base, g: [], c: [], trk: trk * kf };
        for (k = 0; k < n; k++) {
            var gd = { ch: cs[k], i: gi + k, row: i, ci: k, n: n, cx: x + adv[k] * kf / 2, cy: cy, w: adv[k] * kf, h: fs, sp: tr2_isSp(cs[k]) };
            row.c.push(gd); chars[gd.i] = gd;
            if (!gd.sp) { glyphs.push(gd); row.g.push(gd); }
            x += (adv[k] + trk) * kf;
        }
        rows.push(row); gi += n;
    }
    var spans = [];
    if (vert && glyphs.length > 1) {
        var cx = 0; for (k = 0; k < glyphs.length; k++) { cx += glyphs[k].cx; glyphs[k].w = fs; glyphs[k].h = Math.min(fs, lead); }
        spans.push({ vert: true, a0: glyphs[0].cy - fs / 2, a1: glyphs[glyphs.length - 1].cy + fs / 2, c: cx / glyphs.length, g: glyphs.slice(0) });
    } else {
        vert = false;
        for (i = 0; i < rows.length; i++) spans.push({ vert: false, a0: rows[i].x0, a1: rows[i].x1, c: rows[i].cy, g: rows[i].g });
    }
    var bx0 = 1e9, bx1 = -1e9, by0 = 1e9, by1 = -1e9;
    for (k = 0; k < glyphs.length; k++) { var G = glyphs[k]; bx0 = Math.min(bx0, G.cx - G.w / 2); bx1 = Math.max(bx1, G.cx + G.w / 2); by0 = Math.min(by0, G.cy - fs / 2); by1 = Math.max(by1, G.cy + fs / 2); }
    if (bx0 > bx1) { var rr = jzRect(L); bx0 = rr.left; bx1 = rr.left + rr.width; by0 = rr.top; by1 = rr.top + rr.height; }
    return { fs: fs, lead: lead, rows: rows, glyphs: glyphs, chars: chars, spans: spans, vert: vert, n: gi, just: just,
        box: { x0: bx0, x1: bx1, y0: by0, y1: by1, cx: (bx0 + bx1) / 2, cy: (by0 + by1) / 2 } };
}
// the browser's text "lines" for per-line glyph order: the rows (with spaces), or the one column of vertical text
function tr2_lines(G) {
    if (!G.vert) { var o = []; for (var i = 0; i < G.rows.length; i++) o.push(G.rows[i].c); return o; }
    return [G.glyphs];
}
function tr2_isVert(L) {
    var rows = String(tr2_doc(L).text).split(/\r\n|\r|\n/), i;
    if (rows.length < 2) return false;
    for (i = 0; i < rows.length; i++) if (jzCount(rows[i]) > 1) return false;
    return true;
}
// row limits: each row owns the space half way to its neighbours; the first / last rows reach far out
function tr2_rowLim(G, i, far) { var R = G.rows; return [i === 0 ? G.box.y0 - far : (R[i - 1].cy + R[i].cy) / 2, i === R.length - 1 ? G.box.y1 + far : (R[i].cy + R[i + 1].cy) / 2]; }
function tr2_band(F, name, cx, w, y0, y1, hex, op) { if (y1 - y0 < 0.01) return null; var g = jzGrp(F, name); jzAddRect(g, w, y1 - y0, 0, cx, (y0 + y1) / 2); jzAddFill(g, hex, op); return g; }
// fill layer in L's layer space shown through L's glyphs (L becomes its matte)
function tr2_fillLayer(ctx, L, name) { var F = tr2_shapeOn(ctx, L, name, false, null); tr2_matte(L, F); return F; }
// multi-stop vertical gradient over every row's em box (stops [[0..1, hex], ...] like the browser's per-glyph gradient;
// equal offsets = hard edge), built from thin flat bands
function tr2_gradRows(F, G, stops, far) {
    var R = G.rows, s = G.fs, cx = G.box.cx, i, j, k, ns = stops.length;
    for (i = 0; i < R.length; i++) {
        var lim = tr2_rowLim(G, i, far), y0 = R[i].cy - s * 0.5, nm = 'row ' + (i + 1);
        var Y = function (p) { return jzClamp(y0 + p * s, lim[0], lim[1]); };
        tr2_band(F, nm + ' top', cx, far * 2, lim[0], Y(stops[0][0]) + 0.5, stops[0][1]);
        for (j = 0; j + 1 < ns; j++) {
            var p0 = stops[j][0], p1 = stops[j + 1][0], c0 = stops[j][1], c1 = stops[j + 1][1];
            if (p1 - p0 < 0.0005) continue;
            var m = c0 === c1 ? 1 : Math.max(2, Math.ceil((p1 - p0) * 30));
            for (k = 0; k < m; k++) tr2_band(F, nm + ' ' + (j + 1) + '.' + (k + 1), cx, far * 2, Y(p0 + (p1 - p0) * k / m), Y(p0 + (p1 - p0) * (k + 1) / m) + (k < m - 1 ? 0.5 : 0), m === 1 ? c0 : jzMixHex(c0, c1, (k + 0.5) / m));
        }
        tr2_band(F, nm + ' bottom', cx, far * 2, Y(stops[ns - 1][0]), lim[1], stops[ns - 1][1]);
    }
}
// ---- screen-tone patterns (dots / lines / hatch / stripes) as shape groups
function tr2_rep(g, n, dx, dy) {
    var r = jzVecs(g).addProperty('ADBE Vector Filter - Repeater');
    r.property('ADBE Vector Repeater Copies').setValue(Math.max(1, n));
    r.property('ADBE Vector Repeater Transform').property('ADBE Vector Repeater Position').setValue([dx, dy]);
    return r;
}
function tr2_sub(g, name) { var s = jzVecs(g).addProperty('ADBE Vector Group'); s.name = name; return s; }
function tr2_bandsShape(S, name, bx, th, sp, rot, hex) {
    var D = Math.sqrt(Math.pow(bx.x1 - bx.x0, 2) + Math.pow(bx.y1 - bx.y0, 2)), n = Math.ceil(D / sp) + 1;
    var g = jzGrp(S, name), inner = tr2_sub(g, name + ' band');
    jzAddRect(inner, D, th, 0, 0, -D / 2); jzAddFill(inner, hex); tr2_rep(inner, n, 0, sp);
    jzGX(g).property('ADBE Vector Position').setValue([(bx.x0 + bx.x1) / 2, (bx.y0 + bx.y1) / 2]);
    if (rot) jzGX(g).property('ADBE Vector Rotation').setValue(rot);
    return g;
}
function tr2_pattern(ctx, S, kind, hex, s, bx, kk) {
    var w = bx.x1 - bx.x0, h = bx.y1 - bx.y0, u = ctx.u / kk, c, nx, ny;
    if (kind === 'dots') {
        c = Math.max(3 * u, s * 0.075); nx = Math.ceil(w / c) + 1; ny = Math.ceil(h / c) + 1;
        if (nx * ny > 6000) { c *= Math.sqrt(nx * ny / 6000); nx = Math.ceil(w / c) + 1; ny = Math.ceil(h / c) + 1; }
        var g = jzGrp(S, 'dots'), row = tr2_sub(g, 'dot row');
        jzAddEllipse(row, c * 0.68, c * 0.68, bx.x0, bx.y0); jzAddFill(row, hex); tr2_rep(row, nx, c, 0);
        tr2_rep(g, ny, 0, c);
    } else if (kind === 'hatch') {
        c = Math.max(3 * u, s * 0.06);
        tr2_bandsShape(S, 'hatch a', bx, Math.max(u, c * 0.16), c / Math.SQRT2, 45, hex);
        tr2_bandsShape(S, 'hatch b', bx, Math.max(u, c * 0.16), c / Math.SQRT2, -45, hex);
    } else {
        c = Math.max(3 * u, s * 0.06);
        tr2_bandsShape(S, 'stripes', bx, c * 0.38, c / Math.SQRT2, -45, hex);
    }
}
// tracking (em) for horizontal text / extra leading for vertical text (one glyph per row)
function tr2_addTrack(td, em, vert) {
    if (vert) { var ld = (td.autoLeading === false && td.leading > 0) ? td.leading : td.fontSize * 1.2; td.autoLeading = false; td.leading = ld + em * td.fontSize; }
    else td.tracking = Math.round((td.tracking || 0) + em * 1000);
}

// ================================================================ glow / metal / colour
/* ---- neonOutline — ネオン管: bright thin outline (stroke only) + coloured bloom (two soft zero-distance shadows), rare flicker */
jzReg('treat', 'neonOutline', {
    plan: function (rng, st) { return { k: rng.range(0.024, 0.032), fl: rng.chance(0.75) }; },
    apply: function (ctx, L, P, o) {
        if (!tr2_alive(L, 0.5)) return;
        var sc = ctx.sc, col = jzTextColor(L), dk = tr2_dark(sc.bg), s = jzFontSize(L), kk = tr2_k(L);
        var cand = [sc.accent, sc.accent2, sc.ghostA, sc.ghostB];
        var gc = dk ? tr2_first(cand, function (c) { return jzLum(c) > jzLum(sc.bg) + 0.15 && jzContrast(c, col) >= 1.2; }, col)
            : tr2_first(cand, function (c) { return jzContrast(c, sc.bg) >= 1.8; }, col);
        var tube = dk ? jzMixHex(col, '#FFFFFF', 0.4) : col;
        jzTextDoc(L, function (td) {
            td.applyFill = false; td.applyStroke = true; td.strokeColor = jzHex(tube);
            td.strokeWidth = Math.max(1.4 * ctx.u / kk, s * tr2_p(P, 'k', 0.028));
        });
        tr2_recolor(L, tube);
        // tube halo (browser: shadow blur 0.07s) + wide bloom (browser: 4.5x stroke at ~20% under a 0.16s blur)
        tr2_shadow(L, 'JZ Neon glow', gc, 0, 0, s * 0.16, dk ? 1 : 0.75);
        tr2_shadow(L, 'JZ Neon bloom', gc, 0, 0, s * 0.42, dk ? 0.8 : 0.55);
        if (P.fl) jzAnimator(L, 'JZ Neon flicker', [['ADBE Text Opacity', 0]], tr2_head(ctx, L, o) +
            'var r=hh(SD*0.37+textIndex*13.1+Math.floor(time*24+1e-6)*7.7);r<0.03?78:(r<0.05?40:0)');
    }
});

/* ---- chrome — クローム: multi-stop metallic fill with a hard horizon (banded fill through the lyric) + dark keyline (stroke copy) */
jzReg('treat', 'chrome', {
    plan: function (rng, st) { return { v: rng.pick(['silver', 'silver', 'sunset']), h: rng.range(0.5, 0.56) }; },
    apply: function (ctx, L, P, o) {
        if (!tr2_alive(L)) return;
        var sc = ctx.sc, col = jzTextColor(L), light = jzLum(col) > 0.42, h = tr2_p(P, 'h', 0.53), s = jzFontSize(L);
        var acc = tr2_accentFor(sc, col, 1.3), sun = P.v === 'sunset';
        var top0 = light ? '#FFFFFF' : jzMixHex(col, '#FFFFFF', 0.55), top1 = light ? jzMixHex(col, '#000000', 0.42) : col;
        var band = jzMixHex(col, '#000000', light ? 0.62 : 0.45);
        var low0 = sun ? jzMixHex(acc, '#FFFFFF', 0.5) : jzMixHex(col, '#FFFFFF', light ? 0.75 : 0.42);
        var low1 = sun ? acc : jzMixHex(col, '#000000', light ? 0.12 : 0.25);
        var key = light ? jzMixHex(col, '#000000', 0.7) : jzMixHex(col, '#000000', 0.35);
        var G = tr2_lay(ctx, L);
        if (!G.rows.length) return;
        jzTextDoc(L, function (td) { td.applyStroke = false; });
        // keyline: a stroke-only copy on top (only when copies follow the motion exactly)
        if (!tr2_rnd(L) && !tr2_many(ctx)) { var D = tr2_copy(L, 'JZ Chrome keyline', L, key, Math.max(1.2 * ctx.u / tr2_k(L), s * 0.022), 0, 0, false); D.moveBefore(L); }
        var F = tr2_fillLayer(ctx, L, 'JZ Chrome fill');
        tr2_gradRows(F, G, [[0.08, top0], [h, top1], [h, band], [h + 0.03, band], [h + 0.03, low0], [0.94, low1]], tr2_far(ctx, L));
    }
});

/* ---- rainbow — 虹色: colours drift across the glyphs through the scheme palette (chained Fill Colour animators) */
jzReg('treat', 'rainbow', {
    plan: function (rng, st) { return { v: rng.pick(['drift', 'drift', 'steps']), sp: rng.range(0.28, 0.45), dir: rng.chance(0.5) ? 1 : -1 }; },
    apply: function (ctx, L, P, o) {
        if (!tr2_alive(L)) return;
        var sc = ctx.sc, col = jzTextColor(L), i, j;
        if (tr2_onPlate(sc, col)) return;
        var pal = [col], cand = [sc.accent, sc.accent2, sc.ghostA, sc.ghostB, sc.sub];
        for (i = 0; i < cand.length; i++) {
            var c = cand[i], ok = !!c && jzContrast(c, sc.bg) >= 1.8;
            for (j = 0; ok && j < pal.length; j++) if (jzContrast(pal[j], c) < 1.25) ok = false;
            if (ok) pal.push(c);
        }
        if (pal.length < 3) pal.push(jzFitContrast(jzMixHex(sc.accent, sc.accent2 || sc.fg, 0.5), sc.bg, 2));
        var n = pal.length, HD = tr2_head(ctx, L, o);
        var core = HD + 'var N=' + n + ',OF=' + tr2_mi(o) + ',DR=' + (P.dir === -1 ? -1 : 1) + ';' + (P.v === 'steps'
            ? 'var a=((textIndex-1+OF+Math.floor(time*2.2)*DR)%N+N)%N,f=0;'
            : 'var u=(textIndex-1+OF)*' + jzN(tr2_p(P, 'sp', 0.36)) + '-time*0.75*DR,k=((u%N)+N)%N,a=Math.floor(k),x=cl((k-a-0.3)/0.4),f=x*x*(3-2*x);');
        // animator J recolours towards pal[J % N]: J <= a fully, J = a+1 by f -> mix(pal[a], pal[a+1], f)
        for (j = 1; j <= n; j++) jzAnimator(L, 'JZ Rainbow ' + j, [['ADBE Text Fill Color', jzHex(pal[j % n])]], core + 'var J=' + j + ';J<=a?100:(J===a+1?f*100:0)');
    }
});

/* ---- glitchSplit — 色版ズレ: two tinted copies split sideways (Drop Shadows), jolting and slicing (Wave Warp) on glitch steps */
jzReg('treat', 'glitchSplit', {
    plan: function (rng, st) { return { d: rng.range(0.06, 0.08), up: rng.chance(0.3) }; },
    apply: function (ctx, L, P, o) {
        if (!tr2_alive(L)) return;
        var sc = ctx.sc, col = jzTextColor(L), s = jzFontSize(L), HD = tr2_head(ctx, L, o), i;
        var cands = [], cc = [sc.ghostA, sc.ghostB, sc.accent, sc.accent2];
        for (i = 0; i < cc.length; i++) if (cc[i] && jzContrast(cc[i], sc.bg) >= 1.4 && jzContrast(cc[i], col) >= 1.15) cands.push(cc[i]);
        var cA = cands[0] || tr2_accentFor(sc, col, 1.4), cB = tr2_first(cands, function (c) { return jzContrast(c, cA) >= 1.3; }, jzMixHex(cA, sc.bg, 0.4));
        // step clock 24 fps; hit on ~20% of the steps after half the entrance
        var H2 = HD + 'var st=Math.floor(time*24+1e-6),hit=(hh(SD*0.71+st*3.17)<0.2&&time>' + jzN((ctx.cut.inDur || 0.3) * 0.5) + ');' +
            'var d=' + jzN(s * tr2_p(P, 'd', 0.07)) + '*(hit?1.8+hh(SD*0.71+st*5.3):1),dy=' + (P.up ? 'd*0.45' : '0') + '+(hit?(hh(SD*0.71+st*9.1)*2-1)*' + jzN(s * 0.02) + ':0);';
        var mk = function (name, hex, sg) {
            var e = tr2_shadow(L, name, hex, sg * s * 0.07, 0, 0, 0.95);
            jzEX(e, 3, H2 + 'var x=' + sg + '*d,y=' + sg + '*dy;(Math.atan2(x,-y)*180/Math.PI+360)%360');
            jzEX(e, 4, H2 + 'Math.sqrt(d*d+dy*dy)');
        };
        mk('JZ Split A', cA, -1);
        mk('JZ Split B', cB, 1);
        // slice: horizontal bands shifted sideways on hit steps
        var ww = jzEffect(L, 'ADBE Wave Warp', 'JZ Split slice');
        jzEP(ww, 1, 2); jzEP(ww, 4, 0); jzEP(ww, 5, 0); jzEP(ww, 6, 1);
        jzEX(ww, 2, H2 + 'hit&&hh(SD*0.71+st*2.3)<0.7?(hh(SD*0.71+st*4.7)*2-1)*' + jzN(s * 0.16) + ':0');
        jzEX(ww, 3, H2 + jzN(s * 0.55) + '*(0.7+0.6*hh(SD*0.71+st*6.1))');
        jzEX(ww, 7, H2 + 'hh(SD*0.71+st*8.3)*360');
    }
});

/* ---- shadowStack — 多重影: separated copies in scheme colours stepping away (bg-outlined copies; hard shadows when copies can't follow) */
jzReg('treat', 'shadowStack', {
    plan: function (rng, st) { return { d: rng.range(0.04, 0.055), dir: rng.pick([[1, 1], [1, 1], [-1, 1], [1, 0.5], [0, 1]]), n: rng.pick([3, 3, 4]) }; },
    apply: function (ctx, L, P, o) {
        if (!tr2_alive(L)) return;
        var sc = ctx.sc, col = jzTextColor(L), s = jzFontSize(L), n = tr2_p(P, 'n', 3), dir = P.dir || [1, 1], d = s * tr2_p(P, 'd', 0.047), i, j, k;
        var cols = [], cand = [sc.accent, sc.accent2, sc.ghostB, sc.ghostA, sc.ink, sc.sub, sc.fg];
        for (i = 0; i < cand.length; i++) {
            var c = cand[i], ok = !!c && jzContrast(c, sc.bg) >= 1.4 && jzContrast(c, col) >= 1.12;
            for (j = 0; ok && j < cols.length; j++) if (jzContrast(cols[j], c) < 1.12) ok = false;
            if (ok) cols.push(c);
        }
        while (cols.length < n) cols.push(jzMixHex(cols.length ? cols[cols.length - 1] : tr2_accentFor(sc, col), sc.bg, 0.35));
        var sw = Math.max(1.5 * ctx.u / tr2_k(L), s * 0.028);
        jzTextDoc(L, function (td) { td.applyStroke = true; td.strokeColor = jzHex(sc.bg); td.strokeWidth = sw; try { td.strokeOverFill = false; } catch (e) {} });
        if (!tr2_rnd(L)) {
            var prev = L;
            n = tr2_budget(ctx, n);
            for (k = 1; k <= n; k++) prev = jzNoGhost(tr2_copy(L, 'JZ Stack ' + k, prev, cols[k - 1], sw, dir[0] * d * k, dir[1] * d * k, true, sc.bg));
        } else {
            for (k = 1; k <= n; k++) tr2_shadow(L, 'JZ Stack ' + k, cols[k - 1], dir[0] * d, dir[1] * d, 0, 1);
        }
    }
});

// ================================================================ cuts / fills that move
/* ---- stencilGap — ステンシル字: bridges cut through every glyph row (inverted matte of thin bands), opening in, closing out */
jzReg('treat', 'stencilGap', {
    plan: function (rng, st) { return { v: rng.pick(['one', 'one', 'two']), at: rng.range(-0.05, 0.06), g: rng.range(0.034, 0.048) }; },
    apply: function (ctx, L, P, o) {
        if (!tr2_alive(L)) return;
        var G = tr2_lay(ctx, L), s = G.fs, HD = tr2_head(ctx, L, o), far = tr2_far(ctx, L), i, k;
        if (!G.rows.length) return;
        var cuts = P.v === 'two' ? [-0.13, 0.13] : [tr2_p(P, 'at', 0)];
        var M = tr2_shapeOn(ctx, L, 'JZ Stencil gaps', true, null);
        var gx = HD + 'var g=' + jzN(tr2_p(P, 'g', 0.04) * 2 * s) + '*oc(cl((time-DL-0.04)/0.4))*(1-ic(PO));';
        for (i = 0; i < G.rows.length; i++) for (k = 0; k < cuts.length; k++) {
            var g = jzGrp(M, 'gap ' + (i + 1) + '.' + (k + 1)), r = jzAddRect(g, far * 2, 1, 0, G.box.cx, G.rows[i].cy + cuts[k] * s);
            jzAddFill(g, '#FFFFFF');
            r.property('ADBE Vector Rect Size').expression = gx + '[' + jzN(far * 2) + ',g<' + jzN(0.006 * s) + '?0:g]';
        }
        tr2_matte(M, L, true);
    }
});

/* ---- waterline — 水位: outlined glyphs fill up with liquid (filled copy = matte of animated bands), surface bobs, drains on exit */
jzReg('treat', 'waterline', {
    plan: function (rng, st) { return { lvl: rng.range(0.46, 0.58), c: rng.int(0, 1), k: rng.range(0.02, 0.026) }; },
    apply: function (ctx, L, P, o) {
        if (!tr2_alive(L, 0.5)) return;
        var sc = ctx.sc, col = jzTextColor(L), liq = P.c ? tr2_accentFor(sc, col, 1.3) : col, surf = jzMixHex(liq, '#FFFFFF', tr2_dark(liq) ? 0.35 : 0.5);
        var G = tr2_lay(ctx, L), s = G.fs, HD = tr2_head(ctx, L, o), far = tr2_far(ctx, L), rnd = tr2_rnd(L), i;
        if (!G.rows.length) return;
        var sw = Math.max(1.3 * ctx.u / tr2_k(L), s * tr2_p(P, 'k', 0.023));
        var D = tr2_dup(L, 'JZ Water matte', L);
        jzTextDoc(D, function (td) { td.applyFill = true; td.applyStroke = false; });
        jzTextDoc(L, function (td) { td.applyFill = false; td.applyStroke = true; td.strokeColor = jzHex(col); td.strokeWidth = sw; });
        tr2_recolor(L, col);
        // liquid: when copies can't follow a random motion, it rises after the entrance and is gone once the exit starts
        var F = tr2_shapeOn(ctx, L, 'JZ Water', false, rnd ? HD + '100*' + TR2_REST : null);
        tr2_matte(D, F); jzNoGhost(F);
        var LV = HD + 'function ioc(x){x=cl(x);return x<0.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;}' +
            'var q=ioc(cl((time-DL-' + (rnd ? 'IN*1.02' : '0') + '-0.05)/0.8))*(1-ic(PO));' +
            'var Lv=1.02+(' + jzN(tr2_p(P, 'lvl', 0.52)) + '-1.02)*q+Math.sin(time*2.6+' + tr2_mi(o) + ')*0.022*q;';
        for (i = 0; i < G.rows.length; i++) {
            var lim = tr2_rowLim(G, i, far), y0 = G.rows[i].cy - s * 0.5, g = jzGrp(F, 'row ' + (i + 1));
            var E = LV + 'var B=' + jzN(lim[1]) + ',y=Math.min(B,' + jzN(y0) + '+Lv*' + jzN(s) + '),y2=Math.min(B,y+' + jzN(s * 0.025) + ');';
            var rl = jzAddRect(g, 1, 1);
            rl.property('ADBE Vector Rect Size').expression = E + '[' + jzN(far * 2) + ',B-y2]';
            rl.property('ADBE Vector Rect Position').expression = E + '[' + jzN(G.box.cx) + ',(y2+B)/2]';
            jzAddFill(g, liq);
            // the lighter surface band right above the liquid
            var g2 = jzGrp(F, 'surface ' + (i + 1)), rs = jzAddRect(g2, 1, 1);
            rs.property('ADBE Vector Rect Size').expression = E + '[' + jzN(far * 2) + ',y2-y]';
            rs.property('ADBE Vector Rect Position').expression = E + '[' + jzN(G.box.cx) + ',(y+y2)/2]';
            jzAddFill(g2, surf);
        }
    }
});

/* ---- karaoke — カラオケ: a colour wipe runs through the words over the cut (hot copy through growing line rects) */
jzReg('treat', 'karaoke', {
    plan: function (rng, st) { return { sp: rng.range(0.7, 0.85), ol: rng.chance(0.55) }; },
    apply: function (ctx, L, P, o) {
        if (!tr2_alive(L, 0.9)) return;
        var sc = ctx.sc, col = jzTextColor(L), hot = tr2_accentFor(sc, col, 1.8), cut = ctx.cut, s = jzFontSize(L), k, i;
        if (tr2_onPlate(sc, col)) return;
        if (P.ol) {
            var oc = tr2_best([sc.bg, sc.ink, '#111111', '#FFFFFF'], col);
            jzTextDoc(L, function (td) { td.applyStroke = true; td.strokeColor = jzHex(oc); td.strokeWidth = Math.max(1.5 * ctx.u / tr2_k(L), s * 0.06); try { td.strokeOverFill = false; } catch (e) {} });
        }
        var G = tr2_lay(ctx, L), HD = tr2_head(ctx, L, o);
        if (!G.spans.length) return;
        var t0 = (cut.inDur || 0.3) * 0.6, T = Math.max(0.3, (cut.dur - (cut.outDur || 0) - t0) * tr2_p(P, 'sp', 0.78)), tot = 0;
        for (k = 0; k < G.spans.length; k++) tot += G.spans[k].a1 - G.spans[k].a0;
        var Q = HD + 'var q=cl((time-DL-' + jzN(t0) + ')/' + jzN(T) + ');q=-(Math.cos(Math.PI*q)-1)/2;';
        if (tr2_rnd(L) || tr2_many(ctx) || G.glyphs.length < 2) {
            // glyphs move randomly (or one-glyph items / crowded comps): per-glyph colour sweep (each glyph turns hot while the wipe passes it)
            var GS = [], GW = [], st0 = 0;
            for (k = 0; k < G.spans.length; k++) {
                var sp = G.spans[k];
                for (i = 0; i < sp.g.length; i++) { var gl = sp.g[i], a = sp.vert ? gl.cy - G.fs / 2 : gl.cx - gl.w / 2; GS[gl.i] = st0 + a - sp.a0; GW[gl.i] = Math.max(1, sp.vert ? G.fs : gl.w); }
                st0 += sp.a1 - sp.a0;
            }
            for (i = 0; i < G.n; i++) { if (GS[i] == null) GS[i] = null; if (GW[i] == null) GW[i] = null; }
            jzAnimator(L, 'JZ Karaoke', [['ADBE Text Fill Color', jzHex(hot)]], Q + 'var S=' + tr2_arr(GS) + ',W=' + tr2_arr(GW) + ';var a=S[textIndex-1];a==null?0:cl((q*' + jzN(tot) + '-a)/W[textIndex-1])*100');
            return;
        }
        var D = tr2_dup(L, 'JZ Karaoke hot', L); D.moveBefore(L); jzNoGhost(D);
        jzTextDoc(D, function (td) { td.fillColor = jzHex(hot); });
        tr2_recolor(D, hot);
        if (P.ol) { var an = D.property('ADBE Text Properties').property('ADBE Text Animators'); for (i = 1; i <= an.numProperties; i++) { var sc2 = an.property(i).property('ADBE Text Animator Properties').property('ADBE Text Stroke Color'); if (sc2) sc2.setValue(jzHex(oc)); } }
        var M = tr2_shapeOn(ctx, L, 'JZ Karaoke wipe', true, null), pad = s * 0.12, cr = s * 0.72, acc = 0;
        for (k = 0; k < G.spans.length; k++) {
            var Sp = G.spans[k], len = Sp.a1 - Sp.a0, g = jzGrp(M, 'line ' + (k + 1)), r = jzAddRect(g, 1, 1);
            jzAddFill(g, '#FFFFFF');
            var E = Q + 'var LN=' + jzN(len) + ',A0=' + jzN(Sp.a0) + ',PD=' + jzN(pad) + ';var take=Math.min(LN,Math.max(0,q*' + jzN(tot) + '-' + jzN(acc) + '));' +
                'var a0=A0-PD,a1=A0+take+(take>=LN-0.01?PD:0),w=take>0?a1-a0:0;';
            r.property('ADBE Vector Rect Size').expression = E + (Sp.vert ? '[' + jzN(cr * 2) + ',w]' : '[w,' + jzN(cr * 2) + ']');
            r.property('ADBE Vector Rect Position').expression = E + (Sp.vert ? '[' + jzN(Sp.c) + ',a0+w/2]' : '[a0+w/2,' + jzN(Sp.c) + ']');
            acc += len;
        }
        tr2_matte(M, D);
    }
});

// ================================================================ per-glyph arrangement
/* ---- sizeWave — 大小リズム: glyph sizes alternate / follow script / ramp / wave, re-spaced tightly on a shared baseline */
jzReg('treat', 'sizeWave', {
    plan: function (rng, st) { return { v: rng.pick(['alt', 'kanji', 'kanji', 'ramp', 'wave']), k: rng.range(0.64, 0.74), rev: rng.chance(0.4) }; },
    apply: function (ctx, L, P, o) {
        if (!tr2_alive(L, 0.5)) return;
        var G = tr2_lay(ctx, L), N = G.n, off = tr2_mi(o), lines = tr2_lines(G), fs = G.fs, kk = tr2_p(P, 'k', 0.69), i, j;
        if (!N || !G.glyphs.length) return;
        var isK = function (c) { return jzIsKanji(c) || jzIsKata(c) || jzIsLatin(c); }, nK = 0, nO = 0;
        for (i = 0; i < G.glyphs.length; i++) { if (isK(G.glyphs[i].ch)) nK++; else nO++; }
        var v = P.v || 'alt';
        if (v === 'kanji' && !(nK && nO)) v = 'alt';
        if ((v === 'ramp' || v === 'wave') && G.glyphs.length < 3) v = 'alt';
        var S = [], off2 = [];
        for (i = 0; i < N; i++) { S.push(1); off2.push([0, 0]); }
        for (j = 0; j < lines.length; j++) {
            var ln = lines[j], n = ln.length;
            for (i = 0; i < n; i++) {
                var g = ln[i], u = n > 1 ? i / (n - 1) : 0.5, s = 1;
                if (v === 'alt') s = (i + (G.vert ? 0 : g.row) + off) % 2 ? kk : 1.04;
                else if (v === 'kanji') s = isK(g.ch) ? 1.08 : kk + 0.04;
                else if (v === 'ramp') s = jzLerp(1.1, kk, P.rev ? 1 - u : u);
                else s = 0.87 + 0.17 * Math.sin(i * 1.25 + off);
                if (jzIsPunct(g.ch)) s = Math.min(s, 0.9);
                S[g.i] = s;
            }
            // re-space along the line so smaller glyphs close up (centred / left / right like the paragraph)
            var ext = function (g2) { return G.vert ? G.lead : g2.w; }, pos = function (g2) { return G.vert ? g2.cy : g2.cx; };
            var tr = G.vert ? 0 : G.rows[0].trk, tot = tr * (n - 1);
            for (i = 0; i < n; i++) tot += ext(ln[i]) * S[ln[i].i];
            var o0 = pos(ln[0]) - ext(ln[0]) / 2, o1 = pos(ln[n - 1]) + ext(ln[n - 1]) / 2;
            var p = G.just === ParagraphJustification.LEFT_JUSTIFY ? o0 : (G.just === ParagraphJustification.RIGHT_JUSTIFY && !G.vert ? o1 - tot : (o0 + o1) / 2 - tot / 2);
            for (i = 0; i < n; i++) {
                var gg = ln[i], w = ext(gg) * S[gg.i], dd = p + w / 2 - pos(gg);
                off2[gg.i] = G.vert ? [0, dd] : [dd, (1 - S[gg.i]) * 0.4 * fs];
                p += w + tr;
            }
        }
        jzCharScales(L, S, 'JZ Size wave');
        jzCharOffsets(L, off2, 'JZ Size wave place');
    }
});

/* ---- rotateAlt — 揺れ字: glyphs lean left / right like hand-set type */
jzReg('treat', 'rotateAlt', {
    plan: function (rng, st) { return { a: rng.range(9, 14), v: rng.pick(['alt', 'alt', 'rand']) }; },
    apply: function (ctx, L, P, o) {
        if (!tr2_alive(L, 0.5)) return;
        var gl = jzGlyphs(tr2_doc(L).text), off = tr2_mi(o), a = tr2_p(P, 'a', 11), rots = [], scs = [], i;
        for (i = 0; i < gl.length; i++) {
            if (jzIsPunct(gl[i]) || tr2_isSp(gl[i])) { rots.push(0); scs.push(1); continue; }
            var sg = (i + off) % 2 ? 1 : -1;
            rots.push(P.v === 'rand' ? sg * a * (0.45 + 0.8 * jzR(ctx.cut.seed, off + 9, 47, i)) : sg * a);
            scs.push(0.94);
        }
        jzCharRotations(L, rots, 'JZ Lean');
        jzCharScales(L, scs, 'JZ Lean size');
    }
});

/* ---- baselineShift — 段違い: alternate up / down, stairs or an arch */
jzReg('treat', 'baselineShift', {
    plan: function (rng, st) { return { v: rng.pick(['alt', 'alt', 'stairs', 'arc']), k: rng.range(0.08, 0.11), dir: rng.chance(0.5) ? 1 : -1 }; },
    apply: function (ctx, L, P, o) {
        if (!tr2_alive(L, 0.5)) return;
        var G = tr2_lay(ctx, L), lines = tr2_lines(G), off = tr2_mi(o), kk = (!G.vert && G.rows.length > 1) ? 0.7 : 1, K = tr2_p(P, 'k', 0.095), offs = [], i, j;
        for (i = 0; i < G.n; i++) offs.push([0, 0]);
        for (j = 0; j < lines.length; j++) {
            var ln = lines[j], n = ln.length;
            for (i = 0; i < n; i++) {
                var u = n > 1 ? i / (n - 1) : 0.5, v;
                if (P.v === 'stairs') v = (u - 0.5) * K * Math.min(3.2, n * 0.55) * (P.dir === -1 ? -1 : 1);
                else if (P.v === 'arc') v = (Math.sin(Math.PI * u) - 0.6) * K * 2.2;
                else v = ((i + off) % 2 ? 1 : -1) * K;
                offs[ln[i].i] = G.vert ? [v * kk * G.fs, 0] : [0, -v * kk * G.fs];
            }
        }
        jzCharOffsets(L, offs, 'JZ Baseline');
    }
});

/* ---- fauxBold — 極太: same-colour stroke thickens every stem, a little more tracking */
jzReg('treat', 'fauxBold', {
    plan: function (rng, st) { return { k: rng.range(0.035, 0.05) }; },
    apply: function (ctx, L, P, o) {
        if (!tr2_alive(L)) return;
        var col = jzTextColor(L), s = jzFontSize(L), k = tr2_p(P, 'k', 0.042), vert = tr2_isVert(L);
        tr2_reanchor(L, function () {
            jzTextDoc(L, function (td) {
                td.applyStroke = true; td.strokeColor = jzHex(col); td.strokeWidth = Math.max(ctx.u / tr2_k(L), s * k);
                try { td.strokeOverFill = false; } catch (e) {}
                tr2_addTrack(td, k, vert);
            });
        });
    }
});

// ================================================================ marks drawn with the text
/* ---- circled — 丸囲み: each glyph shrinks into its own ring (or disc) popping in one by one */
jzReg('treat', 'circled', {
    plan: function (rng, st) { return { v: rng.pick(['ring', 'ring', 'disc']), k: rng.range(0.68, 0.74) }; },
    apply: function (ctx, L, P, o) {
        if (!tr2_alive(L, 0.9)) return;
        var sc = ctx.sc, col = jzTextColor(L), disc = P.v === 'disc', k = tr2_p(P, 'k', 0.71), i;
        if (tr2_onPlate(sc, col)) return;
        var rc = disc ? tr2_first([sc.accent, sc.accent2, sc.ink, sc.fg], function (c) { return jzContrast(c, sc.bg) >= 2 && jzContrast(c, col) >= 1.3; }, sc.fg) : tr2_markCol(sc, col);
        var tc = disc ? tr2_textOn(rc, col, sc) : col;
        var G = tr2_lay(ctx, L), s = G.fs, HD = tr2_head(ctx, L, o), scs = [], pu = [];
        if (!G.glyphs.length) return;
        var Q = function (gi) { return 'var q=ob(cl((time-DL-' + gi + '*0.04)/0.26),1.6)*(1-ic(cl(PO*1.4-' + gi + '*0.03)));'; };
        var gl = jzGlyphs(tr2_doc(L).text);
        for (i = 0; i < gl.length; i++) { var p = jzIsPunct(gl[i]) || tr2_isSp(gl[i]); scs.push(p ? 1 : k); pu.push(p ? 1 : 0); }
        jzCharScales(L, scs, 'JZ Circled size');
        if (disc && tc !== col) jzAnimator(L, 'JZ Circled text', [['ADBE Text Fill Color', jzHex(tc)]], HD + Q('(textIndex-1)') + 'var PU=' + tr2_arr(pu) + ';PU[textIndex-1]?0:(q>0.55?100:0)');
        var S = tr2_shapeOn(ctx, L, 'JZ Circles', false, HD + TR2_POP), n = 0;
        for (i = 0; i < G.glyphs.length; i++) {
            var g = G.glyphs[i];
            if (jzIsPunct(g.ch)) continue;
            var grp = jzGrp(S, 'circle ' + (g.i + 1));
            if (disc) { jzAddEllipse(grp, s * 0.98, s * 0.98); jzAddFill(grp, rc); }
            else { jzAddEllipse(grp, s * 0.98 * 0.97, s * 0.98 * 0.97); jzAddStroke(grp, rc, Math.max(1.5 * ctx.u / tr2_k(L), s * 0.045)); }
            var X = jzGX(grp);
            X.property('ADBE Vector Position').setValue([g.cx, g.cy]);
            X.property('ADBE Vector Scale').expression = HD + Q(g.i) + '[100*q,100*q]';
            n++;
        }
        if (!n) S.remove();
    }
});

/* ---- bracketsQuote — かぎ括弧: 「」 corner brackets drawn on around the whole lyric (single / double) */
jzReg('treat', 'bracketsQuote', {
    plan: function (rng, st) { return { v: rng.pick(['single', 'single', 'double']), k: rng.range(0.05, 0.065) }; },
    apply: function (ctx, L, P, o) {
        if (!tr2_alive(L, 0.9)) return;
        var norm = function (t) { return String(t || '').replace(/[\s　]/g, ''); }, whole = norm(ctx.cut.text), mine = norm(tr2_doc(L).text);
        if (!mine || !whole || mine.length > whole.length) return;
        var open = whole.substr(0, mine.length) === mine, close = whole.substr(whole.length - mine.length) === mine;
        if (!open && !close) return;
        if (mine === whole) ctx.tr2Quoted = true;
        else if (jzChars(mine).length === 1) {
            var nW = jzChars(whole).length, mi = o ? o.mi : null;
            if (ctx.tr2Quoted || mi == null || mi !== Math.round(mi)) return;
            open = open && mi === 0; close = close && mi === nW - 1;
            if (!open && !close) return;
        }
        var lc = tr2_markCol(ctx.sc, jzTextColor(L)), vert = tr2_isVert(L), scl = tr2_sv(L, 'ADBE Scale'), kk = tr2_k(L);
        // leave room for the brackets
        var r0 = jzRect(L), along = vert ? r0.height * Math.abs(scl[1]) / 100 : r0.width * Math.abs(scl[0]) / 100;
        var room = jzFontSize(L) * kk * 1.1, cap = (vert ? ctx.H : ctx.W) * 0.92;
        if (along + room > cap && along < cap * 1.05) { var f = Math.max(0.72, cap / (along + room)); tr2_reanchor(L, function () { jzTextDoc(L, function (td) { td.fontSize *= f; if (td.autoLeading === false) td.leading *= f; }); }); }
        var G = tr2_lay(ctx, L), sp = G.spans, s = G.fs, HD = tr2_head(ctx, L, o);
        if (!sp.length) return;
        var L0 = sp[0], L1 = sp[sp.length - 1], lw = Math.max(1.5 * ctx.u / kk, s * tr2_p(P, 'k', 0.057)), gp = s * 0.3, arm = s * 0.36, leg = s * 0.74;
        var S = jzNoGhost(tr2_shapeOn(ctx, L, 'JZ Brackets', true, HD + TR2_POP)), n = 0;
        var draw = function (pts) { var g = jzGrp(S, 'bracket ' + (++n)); jzAddPath(g, pts, false); jzAddStroke(g, lc, lw); jzAddTrimPaths(g, HD + 'oc(cl((time-DL-IN*0.45)/0.35))*(1-ic(PO))*100'); };
        var one = function (d) {
            if (!L0.vert) {
                var xL = L0.a0 - gp - d, yT = L0.c - s * 0.52 - d, xR = L1.a1 + gp + d, yB = L1.c + s * 0.52 + d;
                if (open) draw([[xL + arm, yT], [xL, yT], [xL, yT + leg]]);
                if (close) draw([[xR - arm, yB], [xR, yB], [xR, yB - leg]]);
            } else {
                var xR2 = L0.c + s * 0.52 + d, yT2 = L0.a0 - gp - d, xL2 = L1.c - s * 0.52 - d, yB2 = L1.a1 + gp + d;
                if (open) draw([[xR2, yT2 + arm], [xR2, yT2], [xR2 - leg, yT2]]);
                if (close) draw([[xL2, yB2 - arm], [xL2, yB2], [xL2 + leg, yB2]]);
            }
        };
        one(0);
        if (P.v === 'double') one(-lw * 2.2);
    }
});

/* ---- reflection — 映り込み: a flipped, squashed copy of the last line on an imaginary floor, fading away from it */
jzReg('treat', 'reflection', {
    plan: function (rng, st) { return { k: rng.range(0.6, 0.78), a: rng.range(0.34, 0.46), gap: rng.range(0.04, 0.09) }; },
    apply: function (ctx, L, P, o) {
        if (!tr2_alive(L, 0.9)) return;
        var col = jzTextColor(L), G = tr2_lay(ctx, L), s = G.fs, k = tr2_p(P, 'k', 0.7), HD = tr2_head(ctx, L, o);
        if (!G.rows.length) return;
        var last = G.rows[G.rows.length - 1], yb = last.cy + s * 0.5, gap = s * tr2_p(P, 'gap', 0.065);
        var D = jzNoGhost(tr2_dup(L, 'JZ Reflection', L));
        jzTextDoc(D, function (td) { td.applyFill = true; td.fillColor = jzHex(col); td.applyStroke = false; });
        tr2_recolor(D, col);
        // flip about the floor: anchor on the floor line, scale y by -k, position one gap below the lyric's floor
        var A = tr2_sv(L, 'ADBE Anchor Point'), Pp = tr2_sv(L, 'ADBE Position'), Sc = tr2_sv(L, 'ADBE Scale'), rot = tr2_sv(L, 'ADBE Rotate Z') * Math.PI / 180;
        var sx = Sc[0] / 100, sy = Sc[1] / 100, vx = 0, vy = (yb - A[1]) * sy + gap * Math.abs(sy);
        jzXf(D, 'ADBE Anchor Point').setValue([A[0], yb]);
        jzXf(D, 'ADBE Position').setValue([Pp[0] + vx * Math.cos(rot) - vy * Math.sin(rot), Pp[1] + vx * Math.sin(rot) + vy * Math.cos(rot)]);
        jzXf(D, 'ADBE Scale').setValue([Sc[0], -Sc[1] * k]);
        jzXf(D, 'ADBE Opacity').setValue(tr2_sv(L, 'ADBE Opacity') * tr2_p(P, 'a', 0.4));
        // only the last line, strongest at the floor (feathered mask in the copy's own space)
        var far = tr2_far(ctx, L), m = jzMaskRect(D, G.box.cx - far, last.cy + s * 0.12, G.box.cx + far, yb + s * 0.55);
        m.property('ADBE Mask Feather').setValue([0, s * 0.76]);
        if (tr2_rnd(L)) tr2_gate(D, HD);
    }
});

/* ---- inline — インライン: a hairline in the background colour runs just inside every stroke (two stroke-only copies on top) */
jzReg('treat', 'inline', {
    plan: function (rng, st) { return { a: rng.range(0.017, 0.022), b: rng.range(0.016, 0.021), c: rng.chance(0.3) }; },
    apply: function (ctx, L, P, o) {
        if (!tr2_alive(L)) return;
        var sc = ctx.sc, col = jzTextColor(L), s = jzFontSize(L), a = tr2_p(P, 'a', 0.019), b = tr2_p(P, 'b', 0.018);
        var line = P.c ? tr2_first([sc.accent, sc.accent2], function (c) { return jzContrast(c, col) >= 2; }, sc.bg) : sc.bg;
        var D1 = tr2_copy(L, 'JZ Inline cut', L, line, s * (a + b) * 2, 0, 0, false); D1.moveBefore(L); jzNoGhost(D1);
        var D2 = tr2_copy(L, 'JZ Inline rim', L, col, s * a * 2, 0, 0, false); D2.moveBefore(D1); jzNoGhost(D2);
        if (tr2_rnd(L)) { var HD = tr2_head(ctx, L, o); tr2_gate(D1, HD); tr2_gate(D2, HD); }
    }
});

/* ---- sticker — シール縁: thick paper border (stroke under the fill / ring shadows), thin edge, soft drop shadow, slight tilt */
jzReg('treat', 'sticker', {
    plan: function (rng, st) { return { k: rng.range(0.13, 0.17), rot: rng.range(2, 4) * (rng.chance(0.5) ? 1 : -1), sh: rng.range(0.035, 0.05) }; },
    apply: function (ctx, L, P, o) {
        if (!tr2_alive(L, 0.9)) return;
        var sc = ctx.sc, col = jzTextColor(L), dk = tr2_dark(sc.bg), s = jzFontSize(L), k = tr2_p(P, 'k', 0.15);
        var paper = tr2_first([sc.ink, sc.fg, sc.sub], function (c) { return jzLum(c) > 0.78; }, '#FFFFFF');
        var key = jzContrast(col, paper) < 2.5 ? tr2_first([sc.accent, sc.accent2, sc.ghostB, sc.ghostA], function (c) { return jzContrast(c, paper) >= 2.2 && jzContrast(c, col) >= 1.8; }, '#111111') : null;
        var edge = jzMixHex(paper, '#000000', 0.16);
        if (!tr2_isVert(L) || jzCount(tr2_doc(L).text) <= 4) jzXf(L, 'ADBE Rotate Z').setValue(tr2_sv(L, 'ADBE Rotate Z') + tr2_p(P, 'rot', 3) * (tr2_mi(o) % 2 ? -0.7 : 1));
        // the paper (keyline / paper ring / edge / shadow) is drawn on the main pass only: a copy under the lyric kept out of
        // the ghosts; when copies can't follow a random motion it is grown on the lyric itself
        var H2 = L, pc = key || paper;
        if (!tr2_rnd(L)) { H2 = tr2_dup(L, 'JZ Sticker paper', L); jzNoGhost(H2); tr2_recolor(H2, pc); }
        jzTextDoc(H2, function (td) {
            if (H2 !== L) { td.applyFill = true; td.fillColor = jzHex(pc); }
            td.applyStroke = true; td.strokeColor = jzHex(pc); td.strokeWidth = key ? s * 0.07 : s * k;
            try { td.strokeOverFill = false; } catch (e) {}
        });
        if (key) tr2_ring(H2, 'JZ Sticker paper', paper, s * (k / 2 - 0.035));
        tr2_ring(H2, 'JZ Sticker edge', edge, s * 0.008);
        tr2_shadow(H2, 'JZ Sticker shadow', '#000000', s * 0.015, s * tr2_p(P, 'sh', 0.042), s * 0.1, dk ? 0.6 : 0.32);
    }
});

/* ---- gradientSweep — 光沢スイープ: a glint band sweeps down through the letters, or a tide line bobs (animated bands through the lyric) */
jzReg('treat', 'gradientSweep', {
    plan: function (rng, st) { return { v: rng.pick(['glint', 'glint', 'tide']), per: rng.range(1.5, 2.3), ph: rng.range(0, 1) }; },
    apply: function (ctx, L, P, o) {
        if (!tr2_alive(L)) return;
        var sc = ctx.sc, col = jzTextColor(L), G = tr2_lay(ctx, L), s = G.fs, far = tr2_far(ctx, L), cx = G.box.cx, i, k;
        if (!G.rows.length) return;
        var T = 'var t=time/' + jzN(tr2_p(P, 'per', 1.9)) + '+' + jzN(tr2_p(P, 'ph', 0)) + ';';
        var F = tr2_fillLayer(ctx, L, 'JZ Sweep fill');
        if (P.v === 'tide') {
            var c2 = tr2_accentFor(sc, col, 1.5), line = jzMixHex(c2, '#FFFFFF', 0.45);
            for (i = 0; i < G.rows.length; i++) {
                var lim = tr2_rowLim(G, i, far), y0 = G.rows[i].cy - s * 0.5;
                var E = T + 'var u=0.52+0.3*Math.sin(t*Math.PI*2),B=' + jzN(lim[1]) + ',y=Math.min(B,' + jzN(y0) + '+(u-0.02)*' + jzN(s) + '),y2=Math.min(B,y+' + jzN(s * 0.03) + ');';
                var gl = jzGrp(F, 'tide line ' + (i + 1)), rl = jzAddRect(gl, 1, 1); jzAddFill(gl, line);
                rl.property('ADBE Vector Rect Size').expression = E + '[' + jzN(far * 2) + ',y2-y]';
                rl.property('ADBE Vector Rect Position').expression = E + '[' + jzN(cx) + ',(y+y2)/2]';
                var gw = jzGrp(F, 'tide ' + (i + 1)), rw = jzAddRect(gw, 1, 1); jzAddFill(gw, c2);
                rw.property('ADBE Vector Rect Size').expression = E + '[' + jzN(far * 2) + ',B-y2]';
                rw.property('ADBE Vector Rect Position').expression = E + '[' + jzN(cx) + ',(y2+B)/2]';
            }
        } else {
            var hl = jzLum(col) > 0.6 ? tr2_first([sc.accent, sc.accent2, sc.ghostA, sc.ghostB], function (c) { return jzLum(c) > 0.3 && jzContrast(c, col) >= 1.3; }, jzMixHex(col, sc.bg, 0.45)) : jzMixHex(col, '#FFFFFF', 0.72);
            var w = 0.13, m = 5, U = T + 'var u=(t%1)*1.7-0.35;';
            for (i = 0; i < G.rows.length; i++) {
                var g = jzGrp(F, 'glint ' + (i + 1)), y00 = G.rows[i].cy - s * 0.5;
                // soft rise (u-w..u), flat highlight (u..u+0.35w), soft fall (..u+1.2w) — offsets relative to the band origin
                for (k = 0; k < m; k++) {
                    var sub = tr2_sub(g, 'rise ' + (k + 1)); jzAddRect(sub, far * 2, w * s / m + 0.5, 0, cx, (-w + w * (k + 0.5) / m) * s); jzAddFill(sub, jzMixHex(col, hl, (k + 0.5) / m));
                    var sub2 = tr2_sub(g, 'fall ' + (k + 1)); jzAddRect(sub2, far * 2, 0.85 * w * s / m + 0.5, 0, cx, (0.35 * w + 0.85 * w * (k + 0.5) / m) * s); jzAddFill(sub2, jzMixHex(hl, col, (k + 0.5) / m));
                }
                var sub3 = tr2_sub(g, 'flat'); jzAddRect(sub3, far * 2, 0.35 * w * s + 0.5, 0, cx, 0.175 * w * s); jzAddFill(sub3, hl);
                jzGX(g).property('ADBE Vector Position').expression = U + '[0,' + jzN(y00) + '+u*' + jzN(s) + ']';
                jzGX(g).property('ADBE Vector Group Opacity').expression = U + '(u-' + w + '>1.02||u+' + jzN(1.2 * w) + '<-0.02)?0:100';
            }
        }
        var gb = jzGrp(F, 'base'); jzAddRect(gb, far * 2, far * 2, 0, cx, G.box.cy); jzAddFill(gb, col);
    }
});

// ================================================================ spacing / grid
/* ---- kerningWide — 字間広め: letter-spaced, a size smaller (tracking; leading for vertical text) */
jzReg('treat', 'kerningWide', {
    plan: function (rng, st) { return { t: rng.range(0.32, 0.55), grow: rng.range(1.04, 1.14) }; },
    apply: function (ctx, L, P, o) {
        var txt = tr2_doc(L).text;
        if (!jzTrim(String(txt || '')) || jzCount(txt) < 2) return;
        var vert = tr2_isVert(L), Sc = tr2_sv(L, 'ADBE Scale'), kx = Math.abs(Sc[0]) / 100, ky = Math.abs(Sc[1]) / 100, t = tr2_p(P, 't', 0.43), grow = tr2_p(P, 'grow', 1.09);
        var r0 = jzRect(L), a0 = vert ? r0.height * ky : r0.width * kx;
        tr2_reanchor(L, function () {
            jzTextDoc(L, function (td) { tr2_addTrack(td, vert ? t * 0.7 : t, vert); });
            var r1 = jzRect(L), a1 = vert ? r1.height * ky : r1.width * kx, cap = (vert ? ctx.H : ctx.W) * 0.9;
            var k = Math.min(1, a0 * grow / Math.max(1, a1));
            if (a1 * k > cap && a0 <= cap) k = Math.min(k, cap / a1);
            k = Math.max(0.55, k);
            if (k < 0.999) jzTextDoc(L, function (td) { td.fontSize = td.fontSize * k; if (td.autoLeading === false) td.leading = td.leading * k; });
        });
    }
});

/* ---- monoGrid — 原稿用紙風: glyphs snap into equal square cells of a ruled grid (tint row, rules, ruby gutter, cell dividers) */
jzReg('treat', 'monoGrid', {
    plan: function (rng, st) { return { pitch: rng.range(1.18, 1.26), c: rng.chance(0.65) ? 1 : 0 }; },
    apply: function (ctx, L, P, o) {
        if (!tr2_alive(L, 0.9)) return;
        var sc = ctx.sc, col = jzTextColor(L), vert = tr2_isVert(L), pitch = tr2_p(P, 'pitch', 1.22), kk = tr2_k(L), i, j;
        var lc = P.c ? tr2_first([sc.accent, sc.accent2], function (c) { return jzContrast(c, sc.bg) >= 1.5; }, sc.sub || sc.fg) : (sc.sub || sc.fg);
        var td0 = tr2_doc(L), rowsT = String(td0.text).split(/\r\n|\r|\n/), nMax = 1, Sc = tr2_sv(L, 'ADBE Scale');
        if (vert) nMax = jzCount(td0.text); else for (i = 0; i < rowsT.length; i++) nMax = Math.max(nMax, jzChars(rowsT[i]).length);
        var r0 = jzRect(L), along0 = vert ? r0.height * Math.abs(Sc[1]) / 100 : r0.width * Math.abs(Sc[0]) / 100;
        var along1 = nMax * pitch * td0.fontSize * Math.abs(vert ? Sc[1] : Sc[0]) / 100;
        tr2_reanchor(L, function () {
            jzTextDoc(L, function (td) {
                if (along1 > along0 * 1.06) td.fontSize = td.fontSize * along0 * 1.06 / along1;
                var f = td.fontSize, cur = (td.autoLeading === false && td.leading > 0) ? td.leading : f * 1.2;
                td.autoLeading = false; td.leading = vert ? pitch * f : Math.max(cur, (pitch + 0.16) * f);
            });
        });
        var G = tr2_lay(ctx, L), s = G.fs, cell = pitch * s, lines = tr2_lines(G), offs = [], scs = [];
        var LEFT = ParagraphJustification.LEFT_JUSTIFY, RIGHT = ParagraphJustification.RIGHT_JUSTIFY;
        var tgt = function (ci, n) { return G.just === LEFT ? (ci + 0.5) * cell : (G.just === RIGHT ? -(n - ci - 0.5) * cell : (ci - (n - 1) / 2) * cell); };
        for (i = 0; i < G.n; i++) { offs.push([0, 0]); scs.push(0.86); }
        if (!vert) for (j = 0; j < lines.length; j++) for (i = 0; i < lines[j].length; i++) offs[lines[j][i].i] = [tgt(i, lines[j].length) - lines[j][i].cx, 0];
        jzCharScales(L, scs, 'JZ Grid size');
        if (!vert) jzCharOffsets(L, offs, 'JZ Grid snap');
        if (G.glyphs.length < 2 || tr2_onPlate(sc, col)) return;
        var HD = tr2_head(ctx, L, o), Q = HD + 'var q=oc(cl((time-DL)/0.45))*(1-ic(PO));';
        var tint = jzMixHex(sc.bg, lc, tr2_dark(sc.bg) ? 0.1 : 0.08), lw = Math.max(ctx.u / kk, s * 0.013), gut = cell * 0.24;
        var S = jzNoGhost(tr2_shapeOn(ctx, L, 'JZ Grid', false, Q + TR2_POP + '*(q>0.01?q:0)'));
        // one cell row per text row (vertical: one column); u = along the row, v = across it
        var runs = [];
        if (vert) { var c0v = G.glyphs[0].cy - cell / 2; runs.push({ n: G.glyphs.length, c0: c0v, cross: G.spans[0].c }); }
        else for (j = 0; j < G.rows.length; j++) { var n = G.rows[j].c.length; runs.push({ n: n, c0: tgt(0, n) - cell / 2, cross: G.rows[j].cy }); }
        var P2 = function (u, v) { return vert ? [v, u] : [u, v]; };
        for (j = 0; j < runs.length; j++) {
            var R = runs[j], len = R.n * cell, v0 = R.cross - cell / 2, v1 = R.cross + cell / 2, nm = ' ' + (j + 1);
            var gr = jzGrp(S, 'rules' + nm);
            jzAddPath(gr, [P2(R.c0, v0), P2(R.c0 + len, v0)], false); jzAddPath(gr, [P2(R.c0, v1), P2(R.c0 + len, v1)], false);
            jzAddStroke(gr, lc, lw, 85); jzAddTrimPaths(gr, Q + 'q*100');
            var gg = jzGrp(S, 'gutter' + nm), vg = vert ? v1 + gut : v0 - gut;
            jzAddPath(gg, [P2(R.c0 - cell * 0.1, vg), P2(R.c0 + len + cell * 0.1, vg)], false);
            jzAddStroke(gg, lc, lw, 55); jzAddTrimPaths(gg, Q + 'q*100');
            var gd = jzGrp(S, 'cells' + nm);
            jzAddPath(gd, [P2(R.c0, v0), P2(R.c0, v1)], false); jzAddStroke(gd, lc, lw, 85);
            var rp = tr2_rep(gd, R.n + 1, vert ? 0 : cell, vert ? cell : 0);
            rp.property('ADBE Vector Repeater Copies').expression = Q + 'Math.min(' + (R.n + 1) + ',Math.floor(' + R.n + '*q+' + jzN(0.5 / cell) + ')+1)';
        }
        // tinted rows under all rules (later groups draw below)
        for (j = 0; j < runs.length; j++) {
            var R2 = runs[j], len2 = R2.n * cell, gt = jzGrp(S, 'tint ' + (j + 1)), rt = jzAddRect(gt, 1, 1); jzAddFill(gt, tint, 90);
            rt.property('ADBE Vector Rect Size').expression = Q + 'var l=' + jzN(len2) + '*q;' + (vert ? '[' + jzN(cell) + ',l]' : '[l,' + jzN(cell) + ']');
            rt.property('ADBE Vector Rect Position').expression = Q + 'var l=' + jzN(len2) + '*q;' + (vert ? '[' + jzN(R2.cross) + ',' + jzN(R2.c0) + '+l/2]' : '[' + jzN(R2.c0) + '+l/2,' + jzN(R2.cross) + ']');
        }
    }
});

// ================================================================ offset copies
/* ---- outlineOffset — 版ズレ袋文字: hollow outline on top, solid accent fill knocked off-register behind (filled copy) */
jzReg('treat', 'outlineOffset', {
    plan: function (rng, st) { return { d: rng.range(0.055, 0.08), dir: rng.pick([[1, 1], [1, 1], [-1, 1], [1, 0.35], [0.4, 1]]), k: rng.range(0.022, 0.03) }; },
    apply: function (ctx, L, P, o) {
        if (!tr2_alive(L)) return;
        var sc = ctx.sc, col = jzTextColor(L), fc = tr2_accentFor(sc, col, 1.4), s = jzFontSize(L), dir = P.dir || [1, 1], d = s * tr2_p(P, 'd', 0.065);
        var D = jzNoGhost(tr2_copy(L, 'JZ Offset fill', L, fc, 0, dir[0] * d, dir[1] * d, true));
        jzTextDoc(L, function (td) { td.applyFill = false; td.applyStroke = true; td.strokeColor = jzHex(col); td.strokeWidth = Math.max(1.4 * ctx.u / tr2_k(L), s * tr2_p(P, 'k', 0.026)); });
        tr2_recolor(L, col);
        if (tr2_rnd(L)) tr2_gate(D, tr2_head(ctx, L, o));
    }
});

/* ---- toneShadow — トーン影: an offset shadow printed as dots / hatching / stripes (pattern through a shifted filled copy) */
jzReg('treat', 'toneShadow', {
    plan: function (rng, st) { return { v: rng.pick(['dots', 'dots', 'hatch', 'stripes']), d: rng.range(0.09, 0.12), dir: rng.pick([[1, 1], [1, 1], [-1, 1], [1, 0.6]]) }; },
    apply: function (ctx, L, P, o) {
        if (!tr2_alive(L)) return;
        var sc = ctx.sc, col = jzTextColor(L), s = jzFontSize(L), dir = P.dir || [1, 1], d = s * tr2_p(P, 'd', 0.105), kk = tr2_k(L);
        var tc = tr2_first([sc.accent, sc.accent2, sc.fg, sc.ink], function (c) { return jzContrast(c, sc.bg) >= 2.2 && jzContrast(c, col) >= 1.3; }, tr2_markCol(sc, col));
        var G = tr2_lay(ctx, L), m = s * 0.6, bx = { x0: G.box.x0 + dir[0] * d - m, x1: G.box.x1 + dir[0] * d + m, y0: G.box.y0 + dir[1] * d - m, y1: G.box.y1 + dir[1] * d + m };
        var M = tr2_copy(L, 'JZ Tone matte', L, '#FFFFFF', 0, dir[0] * d, dir[1] * d, true);
        var F = tr2_shapeOn(ctx, L, 'JZ Tone shadow', false, tr2_rnd(L) ? tr2_head(ctx, L, o) + '100*' + TR2_REST : null);
        tr2_pattern(ctx, F, P.v || 'dots', tc, s, bx, kk);
        tr2_matte(M, F); jzNoGhost(F);
    }
});

// ================================================================ per-glyph light
/* ---- fadeChars — 余韻: glyph opacity trails off along the line (tail / head / both ends) */
jzReg('treat', 'fadeChars', {
    plan: function (rng, st) { return { v: rng.pick(['tail', 'tail', 'both', 'head']), lo: rng.range(0.3, 0.4) }; },
    apply: function (ctx, L, P, o) {
        if (!tr2_alive(L, 0.9)) return;
        var G = tr2_lay(ctx, L), lines = tr2_lines(G), lo = tr2_p(P, 'lo', 0.35), amt = [], i, j, any = false;
        for (i = 0; i < G.n; i++) amt.push(0);
        for (j = 0; j < lines.length; j++) {
            var n = lines[j].length; if (n < 3) continue;
            for (i = 0; i < n; i++) {
                var u = i / (n - 1), f = P.v === 'both' ? Math.pow(Math.abs(u - 0.5) * 2, 1.4) : (P.v === 'head' ? (1 - u) * (1 - u) : u * u);
                amt[lines[j][i].i] = (1 - lo) * f * 100; any = true;
            }
        }
        if (any) jzAnimator(L, 'JZ Fade chars', [['ADBE Text Opacity', 0]], 'var a=' + tr2_arr(amt) + ';a[textIndex-1]||0');
    }
});

/* ---- cutShift — 断ち切り: every glyph sliced through, the lower (vertical: right) half slides off; optional accent cut line */
jzReg('treat', 'cutShift', {
    plan: function (rng, st) { return { at: rng.range(-0.08, 0.06), d: rng.range(0.11, 0.16) * (rng.chance(0.5) ? 1 : -1), line: rng.chance(0.6) }; },
    apply: function (ctx, L, P, o) {
        if (!tr2_alive(L)) return;
        var sc = ctx.sc, col = jzTextColor(L), lc = tr2_accentFor(sc, col, 1.6), G = tr2_lay(ctx, L), s = G.fs, vert = G.vert, at = tr2_p(P, 'at', 0), dd = s * tr2_p(P, 'd', 0.13);
        var HD = tr2_head(ctx, L, o), far = tr2_far(ctx, L), rnd = tr2_rnd(L), i;
        if (!G.rows.length) return;
        var Q = HD + 'var q=ob(cl((time-DL-' + jzN((ctx.cut.inDur || 0.3) * 0.55) + ')/0.3),2.2)*(1-ic(PO));';
        // bottom (vertical: right) halves: a copy cut by masks, slid by a Transform effect
        var D = tr2_dup(L, 'JZ Cut half', L), bx = G.box, cuts = [], mk;
        if (vert) cuts.push([bx.cx - far, bx.cx + far, G.spans[0].c + at * s]);
        else for (i = 0; i < G.rows.length; i++) { var lim = tr2_rowLim(G, i, far); cuts.push([lim[0], lim[1], G.rows[i].cy + at * s]); }
        for (i = 0; i < cuts.length; i++) {
            var c = cuts[i];
            if (vert) { jzMaskRect(D, c[2], bx.y0 - far, c[2] + far, bx.y1 + far); mk = jzMaskRect(L, c[2], bx.y0 - far, c[2] + far, bx.y1 + far); }
            else { jzMaskRect(D, bx.cx - far, c[2], bx.cx + far, c[1]); mk = jzMaskRect(L, bx.cx - far, c[2], bx.cx + far, c[1]); }
            mk.maskMode = MaskMode.SUBTRACT;
            if (rnd) jzSetExpr(mk.property('ADBE Mask Opacity'), HD + '(time>DL+IN*1.02&&PO<=0)?100:0');
        }
        var tf = jzEffect(D, 'ADBE Geometry2', 'JZ Cut slide');
        jzEP(tf, 1, [bx.cx, bx.cy]);
        jzEX(tf, 2, Q + (vert ? '[' + jzN(bx.cx) + ',' + jzN(bx.cy) + '+' + jzN(dd) + '*q]' : '[' + jzN(bx.cx) + '+' + jzN(dd) + '*q,' + jzN(bx.cy) + ']'));
        if (rnd) jzEX(tf, 9, HD + '(time>DL+IN*1.02&&PO<=0)?100:0');
        if (P.line) {
            var S = jzNoGhost(tr2_shapeOn(ctx, L, 'JZ Cut line', true, HD + TR2_POP)), lw = Math.max(1.2 * ctx.u / tr2_k(L), s * 0.012);
            for (i = 0; i < G.spans.length; i++) {
                var Sp = G.spans[i], cp = Sp.c + at * s, g = jzGrp(S, 'cut ' + (i + 1)), r = jzAddRect(g, 1, 1);
                jzAddFill(g, lc);
                var E = Q + 'var ex=' + jzN(s * 0.35) + '*q,d=' + jzN(dd) + '*q,a0=' + jzN(Sp.a0) + '-ex,a1=' + jzN(Sp.a1) + '+ex+d,l=Math.max(0,a1-a0);';
                r.property('ADBE Vector Rect Size').expression = E + (vert ? '[' + jzN(lw) + ',l]' : '[l,' + jzN(lw) + ']');
                r.property('ADBE Vector Rect Position').expression = E + (vert ? '[' + jzN(cp) + ',(a0+a1)/2]' : '[(a0+a1)/2,' + jzN(cp) + ']');
                jzGX(g).property('ADBE Vector Group Opacity').expression = Q + 'q>0.02?Math.min(1,q)*100:0';
            }
        }
    }
});

/* ---- focusPull — ぼかし送り: a band of sharpness travels through the line, the rest is soft (Blur + Opacity animator) */
jzReg('treat', 'focusPull', {
    plan: function (rng, st) { return { b: rng.range(0.035, 0.05), rev: rng.chance(0.3) }; },
    apply: function (ctx, L, P, o) {
        if (!tr2_alive(L, 0.9)) return;
        var cut = ctx.cut, N = jzGlyphs(tr2_doc(L).text).length, whole = jzCount(cut.text), mi = o ? o.mi : null, pos;
        if (N >= 3) pos = '(textIndex-1)/Math.max(1,textTotal-1)';
        else if (whole >= 3 && mi != null && mi === Math.round(mi) && mi < whole) pos = jzN(mi / (whole - 1));
        else return;
        // AE Blur = 2x the browser's CSS blur radius (the same sigma)
        var B = 2 * jzFontSize(L) * tr2_p(P, 'b', 0.042), t0 = (cut.inDur || 0.3) * 0.4, T = Math.max(0.4, cut.dur - (cut.outDur || 0) - t0);
        jzAnimator(L, 'JZ Focus pull', [['ADBE Text Blur', [B, B]], ['ADBE Text Opacity', 65]], tr2_head(ctx, L, o) +
            'var f0=cl((time-' + jzN(t0) + ')/' + jzN(T) + '),f=' + (P.rev ? '1.15-1.3*f0' : '-0.15+1.3*f0') + ';var d=cl(Math.abs(' + pos + '-f)*2.4-0.2);d<=0.02?0:d*100');
    }
});

/* ---- spotChar — 一字マーク: one character (a kanji first) set larger in an accent disc / square / diamond */
jzReg('treat', 'spotChar', {
    plan: function (rng, st) { return { v: rng.pick(['disc', 'disc', 'square', 'diamond']), k: rng.range(1.06, 1.14), r: rng.range(0, 1) }; },
    apply: function (ctx, L, P, o) {
        if (!tr2_alive(L, 0.9) || ctx.tr2Spot) return;
        var gl = jzGlyphs(tr2_doc(L).text), gs = [], i, k = tr2_p(P, 'k', 1.1), rr = tr2_p(P, 'r', 0.5);
        for (i = 0; i < gl.length; i++) if (!tr2_isSp(gl[i]) && !jzIsPunct(gl[i])) gs.push({ ch: gl[i], i: i });
        if (!gs.length) return;
        var choose = function (list) {
            var ka = [], kt = [], j;
            for (j = 0; j < list.length; j++) { if (jzIsKanji(list[j].ch)) ka.push(list[j]); else if (jzIsKata(list[j].ch)) kt.push(list[j]); }
            var pool = ka.length ? ka : (kt.length ? kt : list);
            return pool[Math.floor(rr * pool.length) % pool.length];
        };
        var T;
        if (gs.length === 1) {
            // one-glyph items: only the one holding the chosen glyph of the whole lyric
            var all = [], cs = jzChars(String(ctx.cut.text)), idx = 0;
            for (i = 0; i < cs.length; i++) { if (tr2_isSp(cs[i])) continue; if (!jzIsPunct(cs[i])) all.push({ ch: cs[i], i: idx }); idx++; }
            if (!all.length) return;
            var pick = choose(all);
            if (!o || o.mi !== pick.i || gs[0].ch !== pick.ch) return;
            T = gs[0].i;
        } else T = choose(gs).i;
        ctx.tr2Spot = true;
        var sc = ctx.sc, col = jzTextColor(L);
        if (tr2_onPlate(sc, col)) return;
        var pc = tr2_first([sc.accent, sc.accent2, sc.ink, sc.fg], function (c) { return jzContrast(c, sc.bg) >= 2 && jzContrast(c, col) >= 1.4; }, tr2_accentFor(sc, col, 1.6));
        var tc = tr2_textOn(pc, col, sc), HD = tr2_head(ctx, L, o);
        var Q = HD + 'var q=ob(cl((time-DL-' + jzN((ctx.cut.inDur || 0.3) * 0.5) + ')/0.3),1.8)*(1-ic(cl(PO*1.3)));';
        jzAnimator(L, 'JZ Spot size', [['ADBE Text Scale 3D', [k * 100, k * 100, 100]]], 'textIndex===' + (T + 1) + '?100:0');
        if (tc !== col) jzAnimator(L, 'JZ Spot text', [['ADBE Text Fill Color', jzHex(tc)]], Q + '(textIndex===' + (T + 1) + '&&q>0.5)?100:0');
        var G = tr2_lay(ctx, L), g = G.chars[T];
        if (!g) return;
        var s = G.fs * k, S = tr2_shapeOn(ctx, L, 'JZ Spot', false, HD + TR2_POP), grp = jzGrp(S, 'spot'), X = jzGX(grp);
        if (P.v === 'disc' || !P.v) { jzAddEllipse(grp, s * 1.28, s * 1.28); jzAddFill(grp, pc); }
        else { var h = s * (P.v === 'diamond' ? 0.68 : 0.6); jzAddRect(grp, h * 2, h * 2); jzAddFill(grp, pc); X.property('ADBE Vector Rotation').expression = Q + jzN(P.v === 'diamond' ? 45 : -6) + '+(1-q)*40'; }
        X.property('ADBE Vector Position').setValue([g.cx, g.cy]);
        X.property('ADBE Vector Scale').expression = Q + '[100*q,100*q]';
    }
});

/* ---- ransom — 切り貼り文字: every glyph on its own scrap of paper, tilted and resized, popping in one by one */
jzReg('treat', 'ransom', {
    plan: function (rng, st) { return { s: rng.int(1, 1e6) }; },
    apply: function (ctx, L, P, o) {
        if (!tr2_alive(L, 0.9)) return;
        var sc = ctx.sc, col = jzTextColor(L), s0 = jzHash(tr2_p(P, 's', 1), tr2_mi(o), 53), i, j, q;
        if (tr2_onPlate(sc, col)) return;
        var plates = [], cand = [sc.ink, sc.fg, sc.accent, sc.accent2, sc.sub, sc.ghostB];
        for (i = 0; i < cand.length; i++) {
            var c = cand[i], ok = !!c && jzContrast(c, sc.bg) >= 1.5;
            for (j = 0; ok && j < plates.length; j++) if (jzContrast(plates[j], c) < 1.2) ok = false;
            if (ok) plates.push(c);
        }
        if (!plates.length) plates.push(jzFitContrast(sc.accent, sc.bg, 2));
        var G = tr2_lay(ctx, L), N = G.n, fs = G.fs, HD = tr2_head(ctx, L, o), R = [], rots = [], scs = [], offs = [], tcs = [];
        var rs = function (a, b) { return jzR(s0, a, b) * 2 - 1; };
        for (i = 0; i < N; i++) {
            var pc = plates[jzHash(s0, i, 1) % plates.length], altL = [sc.bg, col, sc.fg, sc.ink, '#111111', '#FFFFFF'], alt2 = [];
            for (j = 0; j < altL.length; j++) if (altL[j] && altL[j] !== pc) alt2.push(altL[j]);
            var r = { pc: pc, tc: jzContrast(col, pc) >= 3 && jzR(s0, i, 2) < 0.5 ? col : tr2_best(alt2, pc), rot: rs(i, 3) * 8, s: 0.84 + 0.18 * jzR(s0, i, 4), dy: rs(i, 5) * 0.05,
                pad: [0.06 + 0.1 * jzR(s0, i, 6), 0.06 + 0.1 * jzR(s0, i, 7), 0.06 + 0.1 * jzR(s0, i, 8), 0.06 + 0.1 * jzR(s0, i, 9)], j: [rs(i, 10) * 0.06, rs(i, 11) * 0.06, rs(i, 12) * 0.06, rs(i, 13) * 0.06] };
            var sp = !G.chars[i] || G.chars[i].sp;
            R.push(sp ? null : r);
            rots.push(sp ? 0 : r.rot); scs.push(sp ? 1 : r.s); offs.push([0, sp ? 0 : r.dy * fs]);
        }
        var Qf = function (gi) { return 'var q=ob(cl((time-DL-' + gi + '*0.03)/0.22),1.5)*(1-ic(cl(PO*1.4-' + gi + '*0.03)));'; };
        jzCharRotations(L, rots, 'JZ Ransom tilt');
        jzCharScales(L, scs, 'JZ Ransom size');
        jzCharOffsets(L, offs, 'JZ Ransom place');
        // text colour per glyph once its scrap is up (one animator per colour)
        for (i = 0; i < N; i++) if (R[i] && R[i].tc !== col && jzIndexOf(tcs, R[i].tc) < 0) tcs.push(R[i].tc);
        for (j = 0; j < tcs.length; j++) {
            var fl = []; for (i = 0; i < N; i++) fl.push(R[i] && R[i].tc === tcs[j] ? 1 : 0);
            jzAnimator(L, 'JZ Ransom ink ' + (j + 1), [['ADBE Text Fill Color', jzHex(tcs[j])]], HD + Qf('(textIndex-1)') + 'var F=' + tr2_arr(fl) + ';(F[textIndex-1]&&q>0.5)?100:0');
        }
        var S = tr2_shapeOn(ctx, L, 'JZ Ransom scraps', false, HD + TR2_POP), S2 = fs;
        for (i = 0; i < N; i++) {
            var rr = R[i], g = G.chars[i]; if (!rr || !g) continue;
            var w = Math.max(g.w, fs * 0.55) / 2, h = fs / 2, p = rr.pad, jj = rr.j, grp = jzGrp(S, 'scrap ' + (i + 1));
            jzAddPath(grp, [[-w - p[0] * S2, -h - p[1] * S2 + jj[0] * S2], [w + p[2] * S2, -h - p[1] * S2 + jj[1] * S2], [w + p[2] * S2 + jj[2] * S2, h + p[3] * S2], [-w - p[0] * S2 + jj[3] * S2, h + p[3] * S2]], true);
            jzAddFill(grp, rr.pc);
            q = jzGX(grp);
            q.property('ADBE Vector Position').setValue([g.cx, g.cy + rr.dy * fs]);
            q.property('ADBE Vector Rotation').setValue(rr.rot);
            q.property('ADBE Vector Scale').expression = HD + Qf(i) + '[' + jzN(rr.s * 100) + '*q,' + jzN(rr.s * 100) + '*q]';
        }
    }
});
