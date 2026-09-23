// ================================================================ text treatments part 1 (AE port of the treat entries in src/11p_looks.js)
// treat.apply(ctx, L, P, o) runs for every MAIN lyric layer after its motion is set. P = the cut's treatP (same keys as the
// browser plan). Work on the layer itself (text document, animators, effects) or duplicate it (L.duplicate() copies the
// motion) for shadows / extrusions — put duplicates behind with dup.moveAfter(L).
// Part 1 prefers effects on the lyric itself (stacked Drop Shadows for extrusion / long shadow / ring / glow) and the lyric as
// a track matte for fills: AE's random() / wiggle() depend on the layer, so a duplicate's glyphs would not follow a random
// enter / exit. Marks (marker, lines, boxes, dots) are shape layers parented to the lyric (its layer space).

/* ---- outline — 袋文字: hollow letters (stroke only) */
jzReg('treat', 'outline', {
    plan: function (rng, st) { return { k: rng.range(0.022, 0.038) }; },
    apply: function (ctx, L, P, o) {
        var col = jzTextColor(L);
        jzTextDoc(L, function (td) {
            td.applyFill = false; td.applyStroke = true; td.strokeColor = jzHex(col);
            td.strokeWidth = Math.max(1.4 * ctx.u, td.fontSize * (P.k || 0.03));
        });
    }
});

// ---------------------------------------------------------------- shared helpers (tr1_)
// colour choices: same rules as the browser pack (accentFor / textOn / markCol / twoTone)
function tr1_first(list, test, fb) { for (var i = 0; i < list.length; i++) if (list[i] && test(list[i])) return list[i]; return fb; }
function tr1_best(list, against) { var b = list[0], bv = -1; for (var i = 0; i < list.length; i++) { if (!list[i]) continue; var v = jzContrast(list[i], against); if (v > bv) { bv = v; b = list[i]; } } return b; }
function tr1_dark(c) { return jzLum(c) < 0.45; }
function tr1_accentFor(sc, col, min) {
    if (min == null) min = 1.6;
    return tr1_first([sc.accent, sc.accent2, sc.ghostA, sc.ghostB], function (c) { return jzContrast(c, col) >= min && jzContrast(c, sc.bg) >= 1.5; }, jzFitContrast(sc.accent, col, min + 0.3));
}
function tr1_textOn(box, pref, sc) { return jzContrast(pref, box) >= 3 ? pref : tr1_best([sc.bg, sc.fg, sc.ink, '#111111', '#FFFFFF'], box); }
function tr1_markCol(sc, col) { return tr1_first([sc.accent, sc.accent2, col], function (c) { return jzContrast(c, sc.bg) >= 2; }, col); }
function tr1_twoTone(sc, col) { return tr1_first([sc.accent, sc.accent2, sc.ghostA, sc.ghostB], function (c) { return jzContrast(c, col) >= 1.5 && jzContrast(c, sc.bg) >= 2; }, jzMixHex(col, sc.bg, 0.45)); }

// static (pre-expression) value of a transform property
function tr1_sv(L, mn) { var p = jzXf(L, mn); try { return p.valueAtTime(0, true); } catch (e) { return p.value; } }
function tr1_doc(L) { return L.property('ADBE Text Properties').property('ADBE Text Document').value; }
// the browser's alive(): filled, opaque enough, has text
function tr1_alive(L, amin) {
    var td; try { td = tr1_doc(L); } catch (e) { return false; }
    if (!td || td.applyFill === false || !jzTrim(String(td.text || '')) || !(td.fontSize > 1)) return false;
    return tr1_sv(L, 'ADBE Opacity') >= (amin == null ? 0.9 : amin) * 100 - 0.01;
}
// expression header of this lyric layer's motion (IN, DL, OS, OD, DUR, SD, SZ, P, PO, AMT + easing fns)
function tr1_head(ctx, L, o) { return jzHead(ctx, { mi: (o && o.mi) || 0, size: jzFontSize(L) }); }
// fewer copies when the content comp already holds many layers (layouts with one layer per glyph)
function tr1_budget(ctx, want) { var n = ctx.comp.numLayers; return n > 30 ? Math.min(want, 2) : (n > 16 ? Math.min(want, 4) : want); }
// duplicate of the lyric (keeps text, animators, effects and motion expressions); placed right under `after`
function tr1_dup(L, name, after) { var D = L.duplicate(); try { D.name = name; } catch (e) {} D.moveAfter(after || L); return D; }
// set every Fill / Stroke Colour animator of a copy to one colour (layout accents must not tint shadows / outlines)
function tr1_recolor(D, hex) {
    var an = D.property('ADBE Text Properties').property('ADBE Text Animators'), i, c = jzHex(hex);
    for (i = 1; i <= an.numProperties; i++) {
        var pr = an.property(i).property('ADBE Text Animator Properties'), f = pr.property('ADBE Text Fill Color'), s = pr.property('ADBE Text Stroke Color');
        if (f) f.setValue(c);
        if (s) s.setValue(c);
    }
}
// copy of L drawn in one colour (fill, optional stroke) and shifted by (dx, dy) comp px in the layer's own frame
function tr1_copy(L, name, after, hex, stroke, dx, dy, fill) {
    var D = tr1_dup(L, name, after);
    jzTextDoc(D, function (td) {
        td.applyFill = fill !== false; if (td.applyFill) td.fillColor = jzHex(hex);
        if (stroke > 0) { td.applyStroke = true; td.strokeColor = jzHex(hex); td.strokeWidth = stroke; try { td.strokeOverFill = false; } catch (e) {} }
        else td.applyStroke = false;
    });
    tr1_recolor(D, hex);
    if (dx || dy) {  // shift through the anchor point: the offset scales / rotates with the layer like the browser's per-glyph offset
        var a = tr1_sv(D, 'ADBE Anchor Point'), s = tr1_sv(D, 'ADBE Scale'), sx = Math.abs(s[0]) / 100 || 1, sy = Math.abs(s[1]) / 100 || 1;
        jzXf(D, 'ADBE Anchor Point').setValue([a[0] - (dx || 0) / sx, a[1] - (dy || 0) / sy]);
    }
    return D;
}
// Drop Shadow on L (layer px; direction from an offset vector). Stacked shadows see the previous ones: that is how the
// extrusion / long shadow / outer ring are grown from the lyric's own pixels (they follow every per-glyph motion exactly).
function tr1_shadow(L, name, hex, dx, dy, soft, alpha) {
    var e = jzEffect(L, 'ADBE Drop Shadow', name);
    jzEP(e, 1, jzHex(hex)); jzEP(e, 2, Math.round(jzClamp(alpha == null ? 1 : alpha, 0, 1) * 255));
    jzEP(e, 3, (dx || dy) ? ((Math.atan2(dx, -dy) * 180 / Math.PI) + 360) % 360 : 135); jzEP(e, 4, Math.sqrt(dx * dx + dy * dy));
    if ((soft || 0) <= 250) jzEP(e, 5, soft || 0); else jzEX(e, 5, jzN(soft));     // big radii (4K) through an expression: no range error
    return e;
}
// offsets of a solid sweep of length len (layer px) built from stacked shadows: each stage copies everything so far,
// so the offsets grow geometrically (factor 1 + g) from a first step d
function tr1_sweep(len, d, g) {
    var out = [], cov = 0, o;
    d = Math.max(0.5, d);
    while (cov < len - 0.01 && out.length < 16) { o = cov < d * 2 ? d : cov * g; o = Math.min(o, len - cov); out.push({ o: o, t0: cov, t1: cov + o }); cov += o; }
    return out;
}
// average layer scale (layer px -> comp px)
function tr1_k(L) { var s = tr1_sv(L, 'ADBE Scale'); return Math.max(0.01, (Math.abs(s[0]) + Math.abs(s[1])) / 200); }
// does the lyric's motion use per-layer randomness? (AE's random() / wiggle() depend on the layer, so a DUPLICATE of the
// layer would move its glyphs differently — duplicates are only used when this is false, or hidden while glyphs move)
function tr1_rnd(L) {
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
// alpha track matte: `F` shows only inside matte M's alpha (M hidden). AE 23+ links the matte by identity (setTrackMatte), so
// layers a layout later moves between them cannot break it; older AE (and the preview) use the layer directly above.
function tr1_matte(M, F) {
    F.moveAfter(M);
    var ok = false;
    if (typeof F.setTrackMatte === 'function') { try { F.setTrackMatte(M, TrackMatteType.ALPHA); ok = true; } catch (e) { ok = false; } }
    if (!ok) F.trackMatteType = TrackMatteType.ALPHA;
    M.enabled = false;
}
// fill layer in L's layer space shown through the glyphs of L (L = the matte): gradient rows / split colours / patterns.
// Flat far-reaching areas keep glyphs that fly far from their place (enter / exit) filled.
function tr1_fillLayer(ctx, L, name) { var F = tr1_shapeOn(ctx, L, name, false, false); tr1_matte(L, F); return F; }
function tr1_far(ctx, L) { return (ctx.W + ctx.H) * 2 / tr1_k(L); }

// ---- text geometry in the layer's own space (the space of sourceRectAtTime / effect points / parented shapes)
function tr1_rectOf(ctx, L, str) {
    var td = tr1_doc(L), P = ctx.comp.layers.addText(str), r = null;
    try {
        td.text = str; td.applyStroke = false;
        P.property('ADBE Text Properties').property('ADBE Text Document').setValue(td);
        r = P.sourceRectAtTime(0, false);
    } catch (e) { r = null; }
    try { P.remove(); } catch (e2) {}
    if (!r || !(r.width >= 0)) { var n = jzChars(str).length; r = { left: -td.fontSize * n / 2, top: -td.fontSize * 0.88, width: td.fontSize * n, height: td.fontSize }; }
    return { left: r.left, top: r.top, width: r.width, height: r.height };
}
function tr1_adv(ch) {       // rough advance (em) for spreading glyph centres along a measured line
    var c = ch.charCodeAt(0);
    if (ch === '　' || c >= 0x2E80 || (c >= 0xFF01 && c <= 0xFF60)) return 1;
    if (ch === ' ') return 0.3;
    if (/[MWmw@%]/.test(ch)) return 0.86;
    if (/[A-Z]/.test(ch)) return 0.66;
    if (/[a-z0-9]/.test(ch)) return 0.55;
    return 0.34;
}
// rows (text lines) with their measured extent, glyph centres (textIndex order), and the browser's "line spans":
// one span per row for horizontal text, one per column for vertical text (one glyph per row)
function tr1_lay(ctx, L) {
    var td = tr1_doc(L), fs = td.fontSize, lead = (td.autoLeading === false && td.leading > 0) ? td.leading : fs * 1.2;
    var trk = (td.tracking || 0) / 1000 * fs, just = td.justification;
    var LEFT = ParagraphJustification.LEFT_JUSTIFY, RIGHT = ParagraphJustification.RIGHT_JUSTIFY;
    var rowsT = String(td.text).split(/\r\n|\r|\n/), rows = [], glyphs = [], gi = 0, vert = rowsT.length > 1, i, k;
    for (i = 0; i < rowsT.length; i++) {
        var cs = jzChars(rowsT[i]), n = cs.length, vis = 0;
        for (k = 0; k < n; k++) if (!/[\s　]/.test(cs[k])) vis++;
        if (vis > 1) vert = false;
        if (!vis) { gi += n; continue; }
        var r = tr1_rectOf(ctx, L, rowsT[i]), adv = [], tot = 0;
        for (k = 0; k < n; k++) { adv.push(tr1_adv(cs[k]) * fs); tot += adv[k] + (k < n - 1 ? trk : 0); }
        var kf = r.width > 1 && tot > 1 ? r.width / tot : 1; if (kf < 0.8 || kf > 1.25) kf = 1;
        var w = tot * kf, x0 = just === LEFT ? r.left : (just === RIGHT ? r.left + r.width - w : r.left + r.width / 2 - w / 2);
        var base = i * lead, cy = base - 0.38 * fs, x = x0, row = { li: i, x0: x0, x1: x0 + w, cy: cy, base: base, g: [] };
        for (k = 0; k < n; k++) {
            var gd = { ch: cs[k], i: gi + k, row: i, cx: x + adv[k] * kf / 2, cy: cy, w: adv[k] * kf, h: fs };
            if (!/[\s　]/.test(cs[k])) { glyphs.push(gd); row.g.push(gd); }
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
    return { fs: fs, lead: lead, rows: rows, glyphs: glyphs, spans: spans, vert: vert, n: gi, box: { x0: bx0, x1: bx1, y0: by0, y1: by1, cx: (bx0 + bx1) / 2, cy: (by0 + by1) / 2 } };
}
function tr1_isVert(L) {
    var rows = String(tr1_doc(L).text).split(/\r\n|\r|\n/), i;
    if (rows.length < 2) return false;
    for (i = 0; i < rows.length; i++) if (jzCount(rows[i]) > 1) return false;
    return true;
}
// shape layer living in L's layer space (parented, identity transform): follows the lyric's layer motion and opacity.
// fade: expression header (tr1_head) = also fade out with the exit (the browser draws marks with the item's alpha); false = no opacity link
function tr1_shapeOn(ctx, L, name, above, fade) {
    var S = ctx.comp.layers.addShape(); S.name = name;
    S.parent = L;
    jzXf(S, 'ADBE Anchor Point').setValue([0, 0]); jzXf(S, 'ADBE Position').setValue([0, 0]);
    jzXf(S, 'ADBE Scale').setValue([100, 100]); jzXf(S, 'ADBE Rotate Z').setValue(0);
    if (above) S.moveBefore(L); else S.moveAfter(L);
    if (fade !== false) jzSetExpr(jzXf(S, 'ADBE Opacity'), (fade || '') + 'value*(hasParent?parent.transform.opacity/100:1)' + (fade ? '*(1-iq(PO))' : ''));
    return S;
}
function tr1_arr(a) { var s = []; for (var i = 0; i < a.length; i++) s.push(a[i] == null ? 'null' : jzN(a[i])); return '[' + s.join(',') + ']'; }

// ================================================================ outlines / extrusions / shadows
/* ---- outlineFill — 縁取り: a thick accent stroke under the fill */
jzReg('treat', 'outlineFill', {
    plan: function (rng, st) { return { k: rng.range(0.075, 0.12), c: rng.int(0, 2) }; },
    apply: function (ctx, L, P, o) {
        if (!tr1_alive(L)) return;
        var sc = ctx.sc, col = jzTextColor(L);
        var sk = P.c === 2 ? tr1_first([sc.accent2, sc.accent], function (c) { return jzContrast(c, col) >= 1.8; }, tr1_accentFor(sc, col, 1.8)) : tr1_accentFor(sc, col, 1.8);
        jzTextDoc(L, function (td) {
            td.applyStroke = true; td.strokeColor = jzHex(sk);
            td.strokeWidth = Math.max(2 * ctx.u, td.fontSize * (P.k || 0.09));
            try { td.strokeOverFill = false; } catch (e) {}
        });
    }
});

/* ---- doubleOutline — 二重縁: gap-coloured stroke under the fill + an outer accent ring (eight stacked hard shadows = dilation) */
jzReg('treat', 'doubleOutline', {
    plan: function (rng, st) { return { a: rng.range(0.07, 0.09), b: rng.range(0.08, 0.11) }; },
    apply: function (ctx, L, P, o) {
        if (!tr1_alive(L)) return;
        var sc = ctx.sc, col = jzTextColor(L), s = jzFontSize(L), a = P.a || 0.08, b = P.b || 0.095, i;
        var ring = tr1_accentFor(sc, col, 1.6);
        var gap = jzContrast(sc.bg, col) >= 1.5 && jzContrast(sc.bg, ring) >= 1.3 ? sc.bg : tr1_best([sc.ink, sc.fg, '#000000', '#FFFFFF'], ring);
        jzTextDoc(L, function (td) {
            td.applyStroke = true; td.strokeColor = jzHex(gap); td.strokeWidth = Math.max(2 * ctx.u / tr1_k(L), s * a);
            try { td.strokeOverFill = false; } catch (e) {}
        });
        // ring: the browser strokes a copy s*(a+b) wide, i.e. s*b/2 beyond the gap stroke; 8 shadows at 45deg steps grow an octagon of that radius
        var r = Math.max(2 * ctx.u / tr1_k(L), s * b / 2) * 0.4142;
        for (i = 0; i < 8; i++) tr1_shadow(L, 'JZ Ring ' + (i + 1), ring, Math.cos(i * Math.PI / 4) * r, Math.sin(i * Math.PI / 4) * r, 0, 1);
    }
});

/* ---- extrude — 立体: solid extrusion grown from the lyric's own alpha (stacked hard shadows with doubling offsets) */
jzReg('treat', 'extrude', {
    plan: function (rng, st) { return { d: rng.range(0.09, 0.13), dir: rng.pick([[1, 1], [1, 1], [-1, 1], [1, 0.55]]), c: rng.int(0, 1) }; },
    apply: function (ctx, L, P, o) {
        if (!tr1_alive(L)) return;
        var sc = ctx.sc, col = jzTextColor(L), s = jzFontSize(L), dir = P.dir || [1, 1], i;
        var base = P.c ? tr1_first([sc.ink, sc.accent2], function (c) { return jzContrast(c, col) >= 1.6 && jzContrast(c, sc.bg) >= 1.4; }, tr1_accentFor(sc, col, 1.6)) : tr1_accentFor(sc, col, 1.6);
        var ec = jzMixHex(base, '#000000', tr1_dark(sc.bg) ? 0.3 : 0.2);
        var ln = Math.sqrt(dir[0] * dir[0] + dir[1] * dir[1]) || 1, len = s * (P.d || 0.11) * ln, ux = dir[0] / ln, uy = dir[1] / ln;
        var st = tr1_sweep(len, 1.5 * ctx.u / tr1_k(L), 1);
        for (i = 0; i < st.length; i++) tr1_shadow(L, 'JZ Extrude ' + (i + 1), ec, ux * st[i].o, uy * st[i].o, 0, 1);
    }
});

/* ---- longShadow — 長い影: a long flat shadow fading out along its angle (stacked shadows, farther stages fainter) */
jzReg('treat', 'longShadow', {
    plan: function (rng, st) { return { L: rng.range(0.35, 0.65), ang: rng.pick([45, 45, 35, 60, 135]) }; },
    apply: function (ctx, L, P, o) {
        if (!tr1_alive(L)) return;
        var sc = ctx.sc, col = jzTextColor(L), s = jzFontSize(L), i;
        var sh = tr1_dark(sc.bg) ? jzMixHex(sc.bg, tr1_accentFor(sc, col, 1.5), 0.5) : jzMixHex(sc.bg, sc.fg, 0.28);
        var len = s * (P.L || 0.5), an = (P.ang == null ? 45 : P.ang) * Math.PI / 180, ux = Math.cos(an), uy = Math.sin(an);
        // each stage adds the pixels of its band mostly from the text itself, so its opacity ~ the browser's copy alpha there
        var A = function (t) { return 0.72 * (1 - 0.85 * jzClamp(t / len, 0, 1)); };
        var st = tr1_sweep(len, 1.5 * ctx.u / tr1_k(L), 0.35);
        for (i = 0; i < st.length; i++) {
            var al = A((st[i].t0 + st[i].t1) / 2);
            tr1_shadow(L, 'JZ Long Shadow ' + (i + 1), sh, ux * st[i].o, uy * st[i].o, 0, al);
        }
    }
});

/* ---- hardShadow — ずらし影: one flat accent shadow offset behind (hard Drop Shadow) */
jzReg('treat', 'hardShadow', {
    plan: function (rng, st) { return { d: rng.range(0.05, 0.085), dir: rng.pick([[1, 1], [1, 1], [-1, 1], [1, -1], [0.45, 1]]) }; },
    apply: function (ctx, L, P, o) {
        if (!tr1_alive(L)) return;
        var sh = tr1_accentFor(ctx.sc, jzTextColor(L), 1.6), s = jzFontSize(L), dir = P.dir || [1, 1], d = s * (P.d || 0.065);
        tr1_shadow(L, 'JZ Hard Shadow', sh, dir[0] * d, dir[1] * d, 0, 1);
    }
});

/* ---- softShadow — ぼかし影: soft Drop Shadow on the lyric layer */
jzReg('treat', 'softShadow', {
    plan: function (rng, st) { return { b: rng.range(0.08, 0.14), dy: rng.range(0.03, 0.07) }; },
    apply: function (ctx, L, P, o) {
        if (!tr1_alive(L)) return;
        var sc = ctx.sc, s = jzFontSize(L), dk = tr1_dark(sc.bg);
        var c = dk ? jzMixHex(sc.bg, sc.accent, 0.45) : jzMixHex(sc.fg, '#000000', 0.5), al = dk ? 0.75 : 0.36;
        tr1_shadow(L, 'JZ Soft Shadow', c, s * 0.02, s * (P.dy || 0.05), s * (P.b || 0.11) * 2, al);
    }
});

/* ---- glow — 発光: coloured halo behind the lyric (two soft zero-distance shadows, breathing radius) */
jzReg('treat', 'glow', {
    plan: function (rng, st) { return { b: rng.range(0.16, 0.26), self: rng.chance(0.5) }; },
    apply: function (ctx, L, P, o) {
        if (!tr1_alive(L)) return;
        var sc = ctx.sc, col = jzTextColor(L), dk = tr1_dark(sc.bg), s = jzFontSize(L), b = P.b || 0.21;
        var gc = dk ? tr1_first(P.self ? [col, sc.accent, sc.accent2] : [sc.accent, sc.accent2, col], function (c) { return jzLum(c) > jzLum(sc.bg) + 0.2; }, col)
            : tr1_first([sc.accent, sc.accent2, sc.ghostA, sc.ghostB], function (c) { return jzContrast(c, sc.bg) >= 2 && jzLum(c) > 0.08 && jzContrast(c, col) >= 1.4; }, col);
        // dark schemes: a tight bright core + a wide halo (the browser screens its halo twice); light schemes: one soft halo at 75%
        var pulse = '*(0.9+0.1*Math.sin(time*3.2))', e;
        if (dk) { e = tr1_shadow(L, 'JZ Glow core', gc, 0, 0, s * b * 1.4, 1); jzEX(e, 5, jzN(s * b * 1.4) + pulse); }
        e = tr1_shadow(L, 'JZ Glow halo', gc, 0, 0, s * b * (dk ? 3.2 : 3.6), dk ? 0.9 : 0.6); jzEX(e, 5, jzN(s * b * (dk ? 3.2 : 3.6)) + pulse);
    }
});

// ================================================================ marks drawn with the text (bars / lines / boxes / dots) — shape layers parented to the lyric
/* ---- marker — マーカー: highlighter bar sweeping in behind each line (box / skewed / lower half), glyphs it covers flip colour */
jzReg('treat', 'marker', {
    plan: function (rng, st) { return { v: rng.pick(['box', 'box', 'skew', 'half']), c: rng.int(0, 1) }; },
    apply: function (ctx, L, P, o) {
        if (!tr1_alive(L, 0.9)) return;
        var sc = ctx.sc, col = jzTextColor(L), half = P.v === 'half', i, k;
        var box = half ? jzFitContrast(tr1_first([sc.accent, sc.accent2], function (c) { return jzContrast(c, col) >= 2; }, sc.accent), col, 2.2)
            : tr1_first(P.c ? [sc.accent2, sc.accent, sc.ink, sc.fg] : [sc.accent, sc.accent2, sc.ink, sc.fg], function (c) { return jzContrast(c, sc.bg) >= 2.2; }, sc.fg);
        var tc = half ? col : tr1_textOn(box, col, sc);
        var G = tr1_lay(ctx, L), s = G.fs, HD = tr1_head(ctx, L, o);
        if (!G.spans.length) return;
        // progress of span k: in = oe over 0.32 s (staggered 0.07 s per line), out = ic(PO) from the start of the line
        var prog = function (k) { return 'var q=oe(cl((time-DL-' + jzN(k * 0.07) + ')/0.32)),o=ic(PO);'; };
        if (tc !== col) {       // glyphs inside the covered part of their line take the text-on-box colour
            var fr = [], li = [];
            for (k = 0; k < G.n; k++) { fr.push(null); li.push(0); }
            for (k = 0; k < G.spans.length; k++) {
                var sp = G.spans[k], len = Math.max(1, sp.a1 - sp.a0);
                for (i = 0; i < sp.g.length; i++) { var g = sp.g[i]; fr[g.i] = ((sp.vert ? g.cy : g.cx) - sp.a0) / len; li[g.i] = k; }
            }
            jzAnimator(L, 'JZ Marker Text', [['ADBE Text Fill Color', jzHex(tc)]], HD + 'var FR=' + tr1_arr(fr) + ',LI=' + tr1_arr(li) + ';var f=FR[textIndex-1],l=LI[textIndex-1]||0;' +
                'var q=oe(cl((time-DL-l*0.07)/0.32)),o=ic(PO);(f==null)?0:((f>=o&&f<=q)?100:0)');
        }
        var S = tr1_shapeOn(ctx, L, 'JZ Marker', false, HD);
        for (k = 0; k < G.spans.length; k++) {
            var Sp = G.spans[k], pad = s * 0.14, a0 = Sp.a0 - pad, ln = Sp.a1 + pad - a0, th = s * (half ? 0.52 : 1.08);
            var c0 = half ? Sp.c + s * 0.02 + th / 2 : Sp.c;
            var g2 = jzGrp(S, 'bar ' + (k + 1)), r = jzAddRect(g2, Sp.vert ? th : ln, Sp.vert ? ln : th);
            jzAddFill(g2, box, half ? 92 : 100);
            var X = jzGX(g2);
            X.property('ADBE Vector Position').setValue(Sp.vert ? [c0, 0] : [0, c0]);
            if (P.v === 'skew') { X.property('ADBE Vector Skew').setValue(23.7); if (Sp.vert) X.property('ADBE Vector Skew Axis').setValue(90); }
            var H2 = HD + prog(k) + 'var A0=' + jzN(a0) + ',LN=' + jzN(ln) + ',TH=' + jzN(th) + ';var w=LN*Math.max(0,q-o);';
            r.property('ADBE Vector Rect Size').expression = H2 + (Sp.vert ? '[TH,w]' : '[w,TH]');
            r.property('ADBE Vector Rect Position').expression = H2 + 'var m=A0+LN*(o+Math.max(q,o))/2;' + (Sp.vert ? '[0,m]' : '[m,0]');
        }
    }
});

/* ---- underline — 下線: line drawn under each line (bar / double / wave), retracts from the start on exit */
jzReg('treat', 'underline', {
    plan: function (rng, st) { return { v: rng.pick(['bar', 'bar', 'double', 'wave']), k: rng.range(0.05, 0.075) }; },
    apply: function (ctx, L, P, o) {
        if (!tr1_alive(L, 0.9) || jzCount(tr1_doc(L).text) < 2) return;
        var lc = tr1_markCol(ctx.sc, jzTextColor(L)), G = tr1_lay(ctx, L), s = G.fs, HD = tr1_head(ctx, L, o), k, j;
        if (!G.spans.length) return;
        var S = jzNoGhost(tr1_shapeOn(ctx, L, 'JZ Underline', true, HD));          // ghost off in the browser (marker / strike / boxes are ghosted)
        for (k = 0; k < G.spans.length; k++) {
            var Sp = G.spans[k], a0 = Sp.a0 - s * 0.04, a1 = Sp.a1 + s * 0.04, off = Sp.c + s * 0.6, th = Math.max(2 * ctx.u, s * (P.k || 0.06));
            var pt = (function (vert, off0) { return function (u, d) { return vert ? [off0 + d, u] : [u, off0 + d]; }; })(Sp.vert, off);
            var g = jzGrp(S, 'line ' + (k + 1)), w = th;
            if (P.v === 'wave') {
                var pts = [], wl = s * 0.32, m = Math.min(160, Math.ceil((a1 - a0) / (wl / 8)) + 1);
                for (j = 0; j < m; j++) { var u = a0 + (a1 - a0) * j / (m - 1); pts.push(pt(u, Math.sin((u - a0) / wl * Math.PI * 2) * th * 0.7)); }
                jzAddPath(g, pts, false); w = th * 0.75;
            } else if (P.v === 'double') {
                jzAddPath(g, [pt(a0, -th * 0.55), pt(a1, -th * 0.55)], false); jzAddPath(g, [pt(a0, th * 0.55), pt(a1, th * 0.55)], false); w = th * 0.42;
            } else jzAddPath(g, [pt(a0, 0), pt(a1, 0)], false);
            jzAddStroke(g, lc, w);
            var H2 = HD + 'var q=oe(cl((time-DL-' + jzN(0.08 + k * 0.08) + ')/0.45)),o=ic(PO);';
            jzAddTrimPaths(g, H2 + 'Math.max(q,o)*100', H2 + 'o*100');
        }
    }
});

/* ---- strike — 取り消し線: a slightly tilted line struck through each line after the entrance */
jzReg('treat', 'strike', {
    plan: function (rng, st) { return { v: rng.pick(['one', 'one', 'two']), ang: rng.range(-4, 4), k: rng.range(0.06, 0.085) }; },
    apply: function (ctx, L, P, o) {
        if (!tr1_alive(L, 0.9)) return;
        var lc = tr1_accentFor(ctx.sc, jzTextColor(L), 1.8), G = tr1_lay(ctx, L), s = G.fs, HD = tr1_head(ctx, L, o), k;
        if (!G.spans.length) return;
        var S = tr1_shapeOn(ctx, L, 'JZ Strike', true, HD), an = (P.ang || 0) * Math.PI / 180, ca = Math.cos(an), sa = Math.sin(an);
        for (k = 0; k < G.spans.length; k++) {
            var Sp = G.spans[k], a0 = Sp.a0 - s * 0.08, a1 = Sp.a1 + s * 0.08, th = Math.max(2 * ctx.u, s * (P.k || 0.07)), mid = (Sp.a0 + Sp.a1) / 2;
            var cx = Sp.vert ? Sp.c : mid, cy = Sp.vert ? mid : Sp.c + s * 0.02;
            // point u along the line, d across it, rotated by ang about the line's middle
            var pt = (function (vert, cx0, cy0, mid0) { return function (u, d) { var x = vert ? d : u - mid0, y = vert ? u - mid0 : d; return [cx0 + x * ca - y * sa, cy0 + x * sa + y * ca]; }; })(Sp.vert, cx, cy, mid);
            var g = jzGrp(S, 'strike ' + (k + 1));
            if (P.v === 'two') { jzAddPath(g, [pt(a0, -th * 0.8), pt(a1, -th * 0.8)], false); jzAddPath(g, [pt(a0, th * 0.8), pt(a1, th * 0.8)], false); jzAddStroke(g, lc, th * 0.6); }
            else { jzAddPath(g, [pt(a0, 0), pt(a1, 0)], false); jzAddStroke(g, lc, th); }
            var H2 = HD + 'var q=oe(cl((time-DL-IN*0.7-' + jzN(k * 0.1) + ')/0.3)),o=ic(PO);';
            jzAddTrimPaths(g, H2 + 'Math.max(q,o)*100', H2 + 'o*100');
        }
    }
});

/* ---- boxed — 箱組: one box per glyph pops in behind it (solid / alternating / frame); glyphs on solid boxes flip colour */
jzReg('treat', 'boxed', {
    plan: function (rng, st) { return { v: rng.pick(['solid', 'solid', 'alt', 'frame']) }; },
    apply: function (ctx, L, P, o) {
        if (!tr1_alive(L, 0.9)) return;
        var sc = ctx.sc, col = jzTextColor(L), frame = P.v === 'frame', off = (o && o.mi) | 0, k;
        var boxA = tr1_first([sc.ink, sc.fg, sc.accent], function (c) { return jzContrast(c, sc.bg) >= 2.2; }, sc.fg);
        var boxB = P.v === 'alt' ? tr1_first([sc.accent, sc.accent2], function (c) { return jzContrast(c, boxA) >= 1.5 && jzContrast(c, sc.bg) >= 1.8; }, boxA) : boxA;
        var tcA = frame ? col : tr1_textOn(boxA, sc.bg, sc), tcB = frame ? col : tr1_textOn(boxB, sc.bg, sc);
        var G = tr1_lay(ctx, L), s = G.fs, HD = tr1_head(ctx, L, o);
        if (!G.glyphs.length) return;
        var Q = function (gi) { return 'var q=ob(cl((time-DL-' + gi + '*0.035)/0.24),1.7)*(1-ic(cl(PO*1.4-' + gi + '*0.03)));'; };
        var alt = function (gi) { return P.v === 'alt' && (gi + off) % 2 === 1; };
        if (!frame) {
            jzAnimator(L, 'JZ Boxed Text', [['ADBE Text Fill Color', jzHex(tcA)]], HD + Q('(textIndex-1)') + 'q>0.55?100:0');
            if (P.v === 'alt' && tcB !== tcA) jzAnimator(L, 'JZ Boxed Text B', [['ADBE Text Fill Color', jzHex(tcB)]], HD + Q('(textIndex-1)') + '(q>0.55&&(textIndex-1+' + off + ')%2===1)?100:0');
        }
        var S = tr1_shapeOn(ctx, L, 'JZ Boxes', false, HD);
        for (k = 0; k < G.glyphs.length; k++) {
            var gl = G.glyphs[k], w = G.vert ? s * 1.02 : Math.max(gl.w * 0.94, s * 0.42), h = G.vert ? Math.max(gl.h * 0.94, s * 0.42) : s * 1.02;
            var g = jzGrp(S, 'box ' + (gl.i + 1)), c = alt(gl.i) ? boxB : boxA;
            jzAddRect(g, w, h);
            if (frame) jzAddStroke(g, c, Math.max(1.5 * ctx.u, s * 0.035)); else jzAddFill(g, c);
            var X = jzGX(g);
            X.property('ADBE Vector Position').setValue([gl.cx, gl.cy]);
            X.property('ADBE Vector Scale').expression = HD + Q(gl.i) + '[100*q,100*q]';
        }
    }
});

// ================================================================ fills (gradient / two colours / patterns)
// one row band (layer px, y0..y1) of a fill layer: a flat rect in one colour
function tr1_band(F, name, cx, w, y0, y1, hex) { if (y1 - y0 < 0.01) return; var g = jzGrp(F, name); jzAddRect(g, w, y1 - y0, 0, cx, (y0 + y1) / 2); jzAddFill(g, hex); }
// row limits: each row owns the space up to half way to its neighbours; the first / last rows reach far out
function tr1_rowLim(G, i, far) { var R = G.rows; return [i === 0 ? G.box.y0 - far : (R[i - 1].cy + R[i].cy) / 2, i === R.length - 1 ? G.box.y1 + far : (R[i].cy + R[i + 1].cy) / 2]; }
function tr1_ramp(L, x, y0, c0, y1, c1) {
    var e = jzEffect(L, 'ADBE Ramp', 'JZ Gradient');
    jzEP(e, 1, [x, y0]); jzEP(e, 2, jzHex(c0)); jzEP(e, 3, [x, y1]); jzEP(e, 4, jzHex(c1)); jzEP(e, 5, 1);
    return e;
}
/* ---- gradientV — 縦グラデ: vertical gradient over each glyph row (one row: Gradient Ramp on the lyric; several rows: banded fill layer through the lyric) */
jzReg('treat', 'gradientV', {
    plan: function (rng, st) { return { up: rng.chance(0.4), g: rng.chance(0.5) }; },
    apply: function (ctx, L, P, o) {
        if (!tr1_alive(L)) return;
        var sc = ctx.sc, col = jzTextColor(L), i, k;
        var g = P.g && sc.grad && sc.grad.length > 1 && jzContrast(sc.grad[0], sc.bg) >= 1.6 && jzContrast(sc.grad[1], sc.bg) >= 1.6 ? [sc.grad[0], sc.grad[1]] : [col, tr1_twoTone(sc, col)];
        if (P.up) g = [g[1], g[0]];
        var G = tr1_lay(ctx, L), s = G.fs, R = G.rows;
        if (!R.length) return;
        if (R.length === 1) { tr1_ramp(L, G.box.cx, R[0].cy - s * 0.5, g[0], R[0].cy + s * 0.5, g[1]); return; }
        var far = tr1_far(ctx, L), F = tr1_fillLayer(ctx, L, 'JZ Gradient fill'), nb = 12, bh = s / nb;
        for (i = 0; i < R.length; i++) {
            var lim = tr1_rowLim(G, i, far), y0 = R[i].cy - s * 0.5, y1 = R[i].cy + s * 0.5;
            tr1_band(F, 'row ' + (i + 1) + ' top', G.box.cx, far * 2, lim[0], Math.max(lim[0], y0), g[0]);
            for (k = 0; k < nb; k++) tr1_band(F, 'row ' + (i + 1) + ' ' + (k + 1), G.box.cx, far * 2, Math.max(lim[0], y0 + k * bh), Math.min(lim[1], y0 + (k + 1) * bh + 0.5), jzMixHex(g[0], g[1], (k + 0.5) / nb));
            tr1_band(F, 'row ' + (i + 1) + ' bottom', G.box.cx, far * 2, Math.min(lim[1], y1), lim[1], g[1]);
        }
        var gb = jzEffect(F, 'ADBE Gaussian Blur 2', 'JZ Gradient smooth'); jzEP(gb, 1, bh * 1.6 * tr1_k(L)); jzEP(gb, 2, 3); jzEP(gb, 3, 1);
    }
});

/* ---- splitColor — 上下二色: hard two-colour split across every glyph row (one row: hard Gradient Ramp; several rows: fill layer through the lyric) */
jzReg('treat', 'splitColor', {
    plan: function (rng, st) { return { sp: rng.range(0.5, 0.57), top: rng.chance(0.35) }; },
    apply: function (ctx, L, P, o) {
        if (!tr1_alive(L)) return;
        var sc = ctx.sc, col = jzTextColor(L), c2 = tr1_twoTone(sc, col), a = P.top ? c2 : col, b = P.top ? col : c2, i;
        var G = tr1_lay(ctx, L), s = G.fs, R = G.rows, sp = P.sp == null ? 0.53 : P.sp, hw = 0.5 / tr1_k(L);
        if (!R.length) return;
        if (R.length === 1) { var y = R[0].cy - s * 0.5 + s * sp; tr1_ramp(L, G.box.cx, y - hw, a, y + hw, b); return; }
        var far = tr1_far(ctx, L), F = tr1_fillLayer(ctx, L, 'JZ Split fill');
        for (i = 0; i < R.length; i++) {
            var lim = tr1_rowLim(G, i, far), ys = jzClamp(R[i].cy - s * 0.5 + s * sp, lim[0], lim[1]);
            tr1_band(F, 'row ' + (i + 1) + ' upper', G.box.cx, far * 2, lim[0], ys, a);
            tr1_band(F, 'row ' + (i + 1) + ' lower', G.box.cx, far * 2, ys, lim[1], b);
        }
    }
});

// ---- fill patterns: shape layer in the lyric's layer space, shown through the lyric's glyphs (the lyric is its alpha track matte)
function tr1_rep(g, n, dx, dy) {
    var r = jzVecs(g).addProperty('ADBE Vector Filter - Repeater');
    r.property('ADBE Vector Repeater Copies').setValue(Math.max(1, n));
    r.property('ADBE Vector Repeater Transform').property('ADBE Vector Repeater Position').setValue([dx, dy]);
    return r;
}
function tr1_sub(g, name) { var s = jzVecs(g).addProperty('ADBE Vector Group'); s.name = name; return s; }
// parallel bands (thickness th, spacing sp) covering the box, rotated by rot degrees about its centre
function tr1_bandsShape(S, name, bx, th, sp, rot, hex) {
    var D = Math.sqrt(Math.pow(bx.x1 - bx.x0, 2) + Math.pow(bx.y1 - bx.y0, 2)), n = Math.ceil(D / sp) + 1;
    var g = jzGrp(S, name), inner = tr1_sub(g, name + ' band');
    jzAddRect(inner, D, th, 0, 0, -D / 2); jzAddFill(inner, hex); tr1_rep(inner, n, 0, sp);
    jzGX(g).property('ADBE Vector Position').setValue([(bx.x0 + bx.x1) / 2, (bx.y0 + bx.y1) / 2]);
    if (rot) jzGX(g).property('ADBE Vector Rotation').setValue(rot);
    return g;
}
function tr1_patternShape(ctx, S, kind, hex, s, bx) {
    var w = bx.x1 - bx.x0, h = bx.y1 - bx.y0, c, nx, ny;
    if (kind === 'dots') {
        c = Math.max(3 * ctx.u, s * 0.075); nx = Math.ceil(w / c) + 1; ny = Math.ceil(h / c) + 1;
        if (nx * ny > 6000) { c *= Math.sqrt(nx * ny / 6000); nx = Math.ceil(w / c) + 1; ny = Math.ceil(h / c) + 1; }
        var g = jzGrp(S, 'dots'), row = tr1_sub(g, 'dot row');
        jzAddEllipse(row, c * 0.68, c * 0.68, bx.x0, bx.y0); jzAddFill(row, hex); tr1_rep(row, nx, c, 0);
        tr1_rep(g, ny, 0, c);
    } else if (kind === 'lines') {
        c = Math.max(3 * ctx.u, s * 0.06);
        tr1_bandsShape(S, 'lines', bx, c * 0.45, c, 0, hex);
    } else if (kind === 'hatch') {
        c = Math.max(3 * ctx.u, s * 0.06);
        tr1_bandsShape(S, 'hatch a', bx, Math.max(ctx.u, c * 0.16), c / Math.SQRT2, 45, hex);
        tr1_bandsShape(S, 'hatch b', bx, Math.max(ctx.u, c * 0.16), c / Math.SQRT2, -45, hex);
    } else {                                                            // 'stripes': diagonal "/" bands
        c = Math.max(3 * ctx.u, s * 0.06);
        tr1_bandsShape(S, 'stripes', bx, c * 0.38, c / Math.SQRT2, -45, hex);
    }
}
function tr1_pattern(ctx, L, P, kind, alt) {
    if (!tr1_alive(L)) return;
    var sc = ctx.sc, col = jzTextColor(L), pk = P.v === 'lines' && alt ? alt : kind, duo = P.v === 'duo';
    var bgc = duo ? tr1_accentFor(sc, col, 1.6) : jzMixHex(col, sc.bg, 0.62);
    var G = tr1_lay(ctx, L), s = G.fs, m = s * 0.6, bx = { x0: G.box.x0 - m, x1: G.box.x1 + m, y0: G.box.y0 - m, y1: G.box.y1 + m }, far = tr1_far(ctx, L);
    // 'tone': outline in the text colour on top — a stroke-only copy, only when the motion has no per-layer randomness
    // (a duplicate would move its glyphs differently); otherwise the glyphs stay tint + pattern without the thin outline
    if (!duo && !tr1_rnd(L)) { var D = tr1_copy(L, 'JZ Pattern outline', L, col, Math.max(1.2 * ctx.u / tr1_k(L), s * 0.018), 0, 0, false); D.moveBefore(L); }
    // pattern + base colour, seen through the lyric's glyphs (first groups draw on top)
    var F = tr1_fillLayer(ctx, L, 'JZ Pattern ' + pk);
    tr1_patternShape(ctx, F, pk, col, s, bx);
    var g = jzGrp(F, 'base'); jzAddRect(g, far * 2, far * 2, 0, G.box.cx, G.box.cy); jzAddFill(g, bgc);
}
/* ---- halftone — 網点 / stripes — ストライプ / hatch — 斜線: pattern-filled glyphs (tint + outline, or on an accent) */
jzReg('treat', 'halftone', { plan: function (rng, st) { return { v: rng.pick(['tone', 'tone', 'duo']) }; }, apply: function (ctx, L, P, o) { tr1_pattern(ctx, L, P, 'dots'); } });
jzReg('treat', 'stripes', { plan: function (rng, st) { return { v: rng.pick(['tone', 'duo', 'lines']) }; }, apply: function (ctx, L, P, o) { tr1_pattern(ctx, L, P, 'stripes', 'lines'); } });
jzReg('treat', 'hatch', { plan: function (rng, st) { return { v: rng.pick(['tone', 'tone', 'duo']) }; }, apply: function (ctx, L, P, o) { tr1_pattern(ctx, L, P, 'hatch'); } });

/* ---- dotted — 点線輪郭: outline-only letters broken into dashes (diagonal bands as the lyric's track matte; they crawl when spd) */
jzReg('treat', 'dotted', {
    plan: function (rng, st) { return { k: rng.range(0.03, 0.04), spd: rng.pick([0, 1, 1]) }; },
    apply: function (ctx, L, P, o) {
        if (!tr1_alive(L, 0.5)) return;
        var col = jzTextColor(L), G = tr1_lay(ctx, L), s = G.fs, m = s * 1.5;
        jzTextDoc(L, function (td) {
            td.applyFill = false; td.applyStroke = true; td.strokeColor = jzHex(col);
            td.strokeWidth = Math.max(1.6 * ctx.u, s * (P.k || 0.035));
        });
        // dashes: diagonal bands (dash 0.05, gap 0.036 of the size along horizontal / vertical strokes) used as the lyric's alpha matte
        var bx = { x0: G.box.x0 - m, x1: G.box.x1 + m, y0: G.box.y0 - m, y1: G.box.y1 + m }, per = Math.max(3 * ctx.u, s * 0.086) / Math.SQRT2;
        var S = tr1_shapeOn(ctx, L, 'JZ Dash matte', true, false), g = tr1_bandsShape(S, 'dashes', bx, per * 0.58, per, -45, '#FFFFFF');
        if (P.spd) jzGX(g.property('ADBE Vectors Group').property(1)).property('ADBE Vector Position').expression = 'var C=' + jzN(per) + ',V=' + jzN(s * 0.22 / Math.SQRT2) + ';var X=((time*V)%C+C)%C;[value[0],value[1]+X]';
        tr1_matte(S, L);
    }
});

/* ---- alternate — 交互色: every other glyph (or the kanji / katakana of a mixed line) in the accent colour */
jzReg('treat', 'alternate', {
    plan: function (rng, st) { return { v: rng.pick(['alt', 'alt', 'kanji']) }; },
    apply: function (ctx, L, P, o) {
        if (!tr1_alive(L)) return;
        var sc = ctx.sc, col = jzTextColor(L), c2 = tr1_accentFor(sc, col, 1.6), gl = jzGlyphs(tr1_doc(L).text), off = (o && o.mi) | 0, nK = 0, nO = 0, i, flags = [];
        var isK = function (c) { return jzIsKanji(c) || jzIsKata(c); };
        for (i = 0; i < gl.length; i++) { if (/[\s　]/.test(gl[i])) continue; if (isK(gl[i])) nK++; else nO++; }
        var byK = P.v === 'kanji' && ((nK > 0 && nO > 0) || nK + nO === 1);
        for (i = 0; i < gl.length; i++) flags.push(byK ? isK(gl[i]) : (i + off) % 2 === 1);
        jzCharColors(L, c2, flags, 'JZ Alternate');
    }
});

// ================================================================ shape of the letters
/* ---- italic — 斜体: the whole block slanted (Transform effect skew about the text centre); vertical text tilts each glyph */
jzReg('treat', 'italic', {
    plan: function (rng, st) { return { a: rng.range(10, 15) }; },
    apply: function (ctx, L, P, o) {
        var a = P.a == null ? 12 : P.a;
        if (!jzTrim(String(tr1_doc(L).text || ''))) return;
        if (tr1_isVert(L)) { jzAnimator(L, 'JZ Italic', [['ADBE Text Rotation', a * 0.65]], '100'); return; }
        var bx = tr1_lay(ctx, L).box, c = [bx.cx, bx.cy], tf = jzEffect(L, 'ADBE Geometry2', 'JZ Italic');
        jzEP(tf, 1, c); jzEP(tf, 2, c); jzEP(tf, 6, a); jzEP(tf, 7, 0);
    }
});

/* ---- wide — 平体 / tall — 長体: the block squashed / stretched (layer scale; the motion expressions multiply it) */
function tr1_rescale(L, fx, fy) { var s = tr1_sv(L, 'ADBE Scale'); jzXf(L, 'ADBE Scale').setValue([s[0] * fx, s[1] * fy]); }
jzReg('treat', 'wide', {
    plan: function (rng, st) { return {}; },
    apply: function (ctx, L, P, o) {
        if (!jzTrim(String(tr1_doc(L).text || ''))) return;
        var fx = 1, fy = 0.84;
        if (!tr1_isVert(L)) {           // keep lines that fitted the frame inside it
            var bx = tr1_lay(ctx, L).box, w0 = (bx.x1 - bx.x0) * Math.abs(tr1_sv(L, 'ADBE Scale')[0]) / 100, lim = ctx.W * 0.9;
            fx = 1.1;
            if (w0 <= lim && w0 * 1.1 > lim) { var k = lim / (w0 * 1.1); fx *= k; fy *= k; }
        }
        tr1_rescale(L, fx, fy);
    }
});
jzReg('treat', 'tall', {
    plan: function (rng, st) { return {}; },
    apply: function (ctx, L, P, o) {
        if (!jzTrim(String(tr1_doc(L).text || ''))) return;
        if (tr1_isVert(L)) tr1_rescale(L, 0.8, 1.02);
        else tr1_rescale(L, 0.8 * 1.05, 1.05 * 1.05);
    }
});

/* ---- echoOutline — 輪郭の残響: outline copies stepping away behind the lyric (diagonal / zoom / rise / side), breathing */
jzReg('treat', 'echoOutline', {
    plan: function (rng, st) { return { v: rng.pick(['diag', 'diag', 'zoom', 'rise', 'side']), n: rng.int(3, 4), d: rng.range(0.045, 0.07) }; },
    apply: function (ctx, L, P, o) {
        if (!tr1_alive(L)) return;
        var c = tr1_accentFor(ctx.sc, jzTextColor(L), 1.4), s = jzFontSize(L), HD = tr1_head(ctx, L, o), bx = tr1_lay(ctx, L).box, k;
        var n = tr1_budget(ctx, P.n || 3), d = s * (P.d || 0.055), dx = 0, dy = 0, zoom = P.v === 'zoom';
        if (P.v === 'rise') dy = -d * 1.2; else if (P.v === 'side') dx = d * 1.3; else if (!zoom) { dx = d; dy = d; }
        var ctr = [bx.cx, bx.cy], prev = L, op = tr1_sv(L, 'ADBE Opacity');
        // copies are duplicates: if the motion uses per-layer randomness their glyphs would stray while moving, so the
        // echo then opens after the entrance and folds away at the start of the exit
        var rnd = tr1_rnd(L), t0 = rnd ? 'IN*1.05' : '0.05';
        var A = HD + 'var A=oc(cl((time-DL-' + t0 + ')/0.45))*(1-ic(PO))*(0.85+0.15*Math.sin(time*3.4))' + (rnd ? '*(1-cl(PO*4))' : '') + ';';
        for (k = 1; k <= n; k++) {
            var D = tr1_copy(L, 'JZ Echo ' + k, prev, c, Math.max(ctx.u, s * 0.012), 0, 0, false);
            jzXf(D, 'ADBE Opacity').setValue(op * 0.8 * Math.pow(0.72, k - 1));
            var tf = jzEffect(D, 'ADBE Geometry2', 'JZ Echo Step');
            jzEP(tf, 1, ctr);
            jzEX(tf, 2, A + '[' + jzN(ctr[0]) + '+' + jzN(dx * k) + '*A,' + jzN(ctr[1]) + '+' + jzN(dy * k) + '*A]');
            if (zoom) jzEX(tf, 4, A + '100*Math.pow(1+0.035*A,' + k + ')');
            jzEX(tf, 9, A + '(A>0.01?100:0)');
            prev = D;
        }
    }
});

/* ---- emphasisDots — 傍点: a dot (sesame / ring) above every glyph (right of it in vertical text), popping in one by one */
jzReg('treat', 'emphasisDots', {
    plan: function (rng, st) { return { v: rng.pick(['dot', 'dot', 'sesame', 'ring']) }; },
    apply: function (ctx, L, P, o) {
        if (!tr1_alive(L, 0.9)) return;
        var dc = tr1_markCol(ctx.sc, jzTextColor(L)), G = tr1_lay(ctx, L), s = G.fs, HD = tr1_head(ctx, L, o), r = s * 0.07, k, n = 0;
        var S = jzNoGhost(tr1_shapeOn(ctx, L, 'JZ Emphasis Dots', true, HD));      // drawn on the main pass only in the browser
        for (k = 0; k < G.glyphs.length; k++) {
            var gl = G.glyphs[k];
            if (jzIsPunct(gl.ch) || gl.ch === 'ー') continue;
            var g = jzGrp(S, 'dot ' + (gl.i + 1)), X = jzGX(g);
            if (P.v === 'ring') { jzAddEllipse(g, r * 1.7, r * 1.7); jzAddStroke(g, dc, Math.max(ctx.u, r * 0.42)); }
            else if (P.v === 'sesame') { jzAddEllipse(g, r * 2.5, r * 1.2); jzAddFill(g, dc); X.property('ADBE Vector Rotation').setValue(-40); }
            else { jzAddEllipse(g, r * 2, r * 2); jzAddFill(g, dc); }
            X.property('ADBE Vector Position').setValue(G.vert ? [gl.cx + s * 0.64, gl.cy] : [gl.cx, gl.cy - s * 0.64]);
            X.property('ADBE Vector Scale').expression = HD + 'var q=ob(cl((time-DL-IN*0.45-' + jzN(gl.i * 0.04) + ')/0.22),2.2)*(1-ic(PO));[100*q,100*q]';
            n++;
        }
        if (!n) S.remove();
    }
});
