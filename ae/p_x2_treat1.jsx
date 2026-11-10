// ================================================================ 追加分2 text treatments, part 1 (AE port of src/11p_x2_treat.js: fills, outlines, depth)
// treat.apply(ctx, L, P, o) runs for every MAIN lyric layer after its motion is set. P = the cut's treatP (browser plan keys).
// Same tools as ae/p_treat1.jsx / ae/p_treat2.jsx (own axo_ helpers, part 2 uses them too):
//  - the text document / text animators / effects of the lyric itself (they follow every per-glyph motion exactly);
//  - the lyric as the alpha track matte of a fill layer (bands, split colours, patterns) in its own layer space;
//  - shape layers parented to the lyric for marks;
//  - duplicates of the lyric for copies drawn in another style. AE's random() / wiggle() depend on the layer, so when
//    the motion uses them (axo_rnd) a duplicate is only shown while the glyphs rest (AXO_REST).
// Layers the browser draws on the main pass only are marked jzNoGhost.

// ---------------------------------------------------------------- shared helpers (axo_)
function axo_p(P, k, d) { return (P && P[k] != null) ? P[k] : d; }
function axo_first(list, test, fb) { for (var i = 0; i < list.length; i++) if (list[i] && test(list[i])) return list[i]; return fb; }
function axo_best(list, against) { var b = list[0], bv = -1; for (var i = 0; i < list.length; i++) { if (!list[i]) continue; var v = jzContrast(list[i], against); if (v > bv) { bv = v; b = list[i]; } } return b; }
function axo_dark(c) { return jzLum(c) < 0.45; }
function axo_accentFor(sc, col, min) {
    if (min == null) min = 1.6;
    return axo_first([sc.accent, sc.accent2, sc.ghostA, sc.ghostB], function (c) { return jzContrast(c, col) >= min && jzContrast(c, sc.bg) >= 1.5; }, jzFitContrast(sc.accent, col, min + 0.3));
}
function axo_twoTone(sc, col) { return axo_first([sc.accent, sc.accent2, sc.ghostA, sc.ghostB], function (c) { return jzContrast(c, col) >= 1.5 && jzContrast(c, sc.bg) >= 2; }, jzMixHex(col, sc.bg, 0.45)); }
function axo_textOn(box, pref, sc) { return jzContrast(pref, box) >= 3 ? pref : axo_best([sc.bg, sc.fg, sc.ink, '#111111', '#FFFFFF'], box); }
function axo_markCol(sc, col) { return axo_first([sc.accent, sc.accent2, col], function (c) { return jzContrast(c, sc.bg) >= 2; }, col); }
function axo_shadeCol(sc, col) { return axo_dark(sc.bg) ? jzMixHex(sc.bg, axo_accentFor(sc, col, 1.5), 0.5) : jzMixHex(sc.bg, sc.fg, 0.32); }
function axo_onPlate(sc, col) { return jzContrast(col, sc.bg) < 1.5; }
function axo_isSp(ch) { return /^[\s　]$/.test(ch); }

function axo_sv(L, mn) { var p = jzXf(L, mn); try { return p.valueAtTime(0, true); } catch (e) { return p.value; } }
function axo_doc(L) { return L.property('ADBE Text Properties').property('ADBE Text Document').value; }
function axo_alive(L, amin) {
    var td; try { td = axo_doc(L); } catch (e) { return false; }
    if (!td || td.applyFill === false || !jzTrim(String(td.text || '')) || !(td.fontSize > 1)) return false;
    return axo_sv(L, 'ADBE Opacity') >= (amin == null ? 0.9 : amin) * 100 - 0.01;
}
// a whole line / block (not one glyph of a scattered lyric): marks drawn around the layer make sense
function axo_lineLike(ctx, L) { return jzCount(axo_doc(L).text) >= 2 || jzCount(ctx.cut.text) <= 1; }
function axo_head(ctx, L, o) { return jzHead(ctx, { mi: (o && o.mi) || 0, size: jzFontSize(L) }); }
function axo_mi(o) { return (o && o.mi) | 0; }
function axo_k(L) { var s = axo_sv(L, 'ADBE Scale'); return Math.max(0.01, (Math.abs(s[0]) + Math.abs(s[1])) / 200); }
function axo_arr(a) { var s = []; for (var i = 0; i < a.length; i++) s.push(a[i] == null ? 'null' : jzN(a[i])); return '[' + s.join(',') + ']'; }
// does the lyric's motion use per-layer randomness (random / wiggle)? then duplicates stray while the glyphs move
function axo_rnd(L) {
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
var AXO_REST = 'cl((time-DL-IN*1.02)/0.15)*(1-cl(PO*6))';
// opacity of a parented mark: follows the lyric layer's own opacity
var AXO_POP = 'value*(hasParent?parent.transform.opacity/100:1)';
var AXO_OUT = '(1-ic(PO))';
function axo_gate(D, HD) { var tf = jzEffect(D, 'ADBE Geometry2', 'JZ At rest'); jzEX(tf, 9, HD + '100*' + AXO_REST); return tf; }

function axo_dup(L, name, after) { var D = L.duplicate(); try { D.name = name; } catch (e) {} D.moveAfter(after || L); return D; }
// set the Fill (and, with stroke, Stroke) Colour animators of a layer to one colour
function axo_recolor(D, hex, fillOnly) {
    var an = D.property('ADBE Text Properties').property('ADBE Text Animators'), i, c = jzHex(hex);
    for (i = 1; i <= an.numProperties; i++) {
        var pr = an.property(i).property('ADBE Text Animator Properties'), f = pr.property('ADBE Text Fill Color'), s = pr.property('ADBE Text Stroke Color');
        if (f) { try { f.setValue(c); } catch (e1) {} }
        if (s && !fillOnly) { try { s.setValue(c); } catch (e2) {} }
    }
}
// copy of L: fill `hex` (fill=false: none), stroke `stroke` px in the same colour (under the fill)
function axo_copy(L, name, after, hex, stroke, fill) {
    var D = axo_dup(L, name, after);
    jzTextDoc(D, function (td) {
        td.applyFill = fill !== false; if (td.applyFill) td.fillColor = jzHex(hex);
        if (stroke > 0) { td.applyStroke = true; td.strokeColor = jzHex(hex); td.strokeWidth = stroke; try { td.strokeOverFill = false; } catch (e) {} }
        else td.applyStroke = false;
    });
    axo_recolor(D, hex);
    return D;
}
// Drop Shadow on L (offset in layer px; direction from the vector). Stacked shadows see the previous ones.
function axo_shadow(L, name, hex, dx, dy, soft, alpha) {
    var e = jzEffect(L, 'ADBE Drop Shadow', name);
    jzEP(e, 1, jzHex(hex)); jzEP(e, 2, Math.round(jzClamp(alpha == null ? 1 : alpha, 0, 1) * 255));
    jzEP(e, 3, (dx || dy) ? ((Math.atan2(dx, -dy) * 180 / Math.PI) + 360) % 360 : 135); jzEP(e, 4, Math.sqrt(dx * dx + dy * dy));
    if ((soft || 0) <= 250) jzEP(e, 5, soft || 0); else jzEX(e, 5, jzN(soft));
    return e;
}
// offsets of a solid sweep of length len built from stacked shadows (each stage copies everything so far)
function axo_sweep(len, d, g) {
    var out = [], cov = 0, o;
    d = Math.max(0.5, d);
    while (cov < len - 0.01 && out.length < 16) { o = cov < d * 2 ? d : cov * g; o = Math.min(o, len - cov); out.push(o); cov += o; }
    return out;
}
// solid extrusion of the layer's own alpha along (vx, vy) layer px
function axo_extrude(ctx, L, name, hex, vx, vy) {
    var len = Math.sqrt(vx * vx + vy * vy), i;
    if (len < 0.01) return;
    var st = axo_sweep(len, 1.5 * ctx.u / axo_k(L), 1);
    for (i = 0; i < st.length; i++) axo_shadow(L, name + ' ' + (i + 1), hex, vx / len * st[i], vy / len * st[i], 0, 1);
}
// alpha track matte: F shows only inside matte M's alpha; M hidden
function axo_matte(M, F) {
    F.moveAfter(M);
    var ok = false;
    if (typeof F.setTrackMatte === 'function') { try { F.setTrackMatte(M, TrackMatteType.ALPHA); ok = true; } catch (e) { ok = false; } }
    if (!ok) F.trackMatteType = TrackMatteType.ALPHA;
    M.enabled = false;
}
// shape layer in L's layer space (parented, identity transform); opx: opacity expression (null = none)
function axo_shapeOn(ctx, L, name, above, opx) {
    var S = ctx.comp.layers.addShape(); S.name = name;
    S.parent = L;
    jzXf(S, 'ADBE Anchor Point').setValue([0, 0]); jzXf(S, 'ADBE Position').setValue([0, 0]);
    jzXf(S, 'ADBE Scale').setValue([100, 100]); jzXf(S, 'ADBE Rotate Z').setValue(0);
    if (above) S.moveBefore(L); else S.moveAfter(L);
    if (opx) jzSetExpr(jzXf(S, 'ADBE Opacity'), opx);
    return S;
}
function axo_far(ctx, L) { return (ctx.W + ctx.H) * 2 / axo_k(L); }
// keep the anchor at the same relative spot of the text box while fn() changes the text document
function axo_reanchor(L, fn) {
    var r0 = jzRect(L), a = axo_sv(L, 'ADBE Anchor Point');
    var fx = r0.width > 0.5 ? (a[0] - r0.left) / r0.width : 0.5, fy = r0.height > 0.5 ? (a[1] - r0.top) / r0.height : 0.5;
    fn();
    var r1 = jzRect(L);
    jzXf(L, 'ADBE Anchor Point').setValue([r1.left + fx * r1.width, r1.top + fy * r1.height]);
}
// "All Fills Over All Strokes": a wide stroke under the fill never bites into the neighbouring glyphs
function axo_fillsOver(L) { try { L.property('ADBE Text Properties').property('ADBE Text More Options').property('ADBE Text Render Order').setValue(2); } catch (e) {} }

// ---- text geometry in the layer's own space
function axo_rectOf(ctx, L, str) {
    var td = axo_doc(L), T = ctx.comp.layers.addText(str), r = null;
    try {
        td.text = str; td.applyStroke = false;
        T.property('ADBE Text Properties').property('ADBE Text Document').setValue(td);
        r = T.sourceRectAtTime(0, false);
    } catch (e) { r = null; }
    try { T.remove(); } catch (e2) {}
    if (!r || !(r.width >= 0)) { var n = jzChars(str).length; r = { left: -td.fontSize * n / 2, top: -td.fontSize * 0.88, width: td.fontSize * n, height: td.fontSize }; }
    return { left: r.left, top: r.top, width: r.width, height: r.height };
}
function axo_adv(ch) {
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
function axo_lay(ctx, L) {
    var td = axo_doc(L), fs = td.fontSize, lead = (td.autoLeading === false && td.leading > 0) ? td.leading : fs * 1.2;
    var trk = (td.tracking || 0) / 1000 * fs, just = td.justification;
    var LEFT = ParagraphJustification.LEFT_JUSTIFY, RIGHT = ParagraphJustification.RIGHT_JUSTIFY;
    var rowsT = String(td.text).split(/\r\n|\r|\n/), rows = [], glyphs = [], chars = [], gi = 0, vert = rowsT.length > 1, i, k;
    for (i = 0; i < rowsT.length; i++) {
        var cs = jzChars(rowsT[i]), n = cs.length, vis = 0;
        for (k = 0; k < n; k++) if (!axo_isSp(cs[k])) vis++;
        if (vis > 1) vert = false;
        if (!vis) { gi += n; continue; }
        var r = axo_rectOf(ctx, L, rowsT[i]), adv = [], tot = 0;
        for (k = 0; k < n; k++) { adv.push(axo_adv(cs[k]) * fs); tot += adv[k] + (k < n - 1 ? trk : 0); }
        var kf = r.width > 1 && tot > 1 ? r.width / tot : 1; if (kf < 0.8 || kf > 1.25) kf = 1;
        var w = tot * kf, x0 = just === LEFT ? r.left : (just === RIGHT ? r.left + r.width - w : r.left + r.width / 2 - w / 2);
        var base = i * lead, cy = base - 0.38 * fs, x = x0, row = { li: i, x0: x0, x1: x0 + w, cy: cy, base: base, g: [], c: [], trk: trk * kf };
        for (k = 0; k < n; k++) {
            var gd = { ch: cs[k], i: gi + k, row: i, ci: k, n: n, cx: x + adv[k] * kf / 2, cy: cy, w: adv[k] * kf, h: fs, sp: axo_isSp(cs[k]) };
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
function axo_lines(G) {
    if (!G.vert) { var o = []; for (var i = 0; i < G.rows.length; i++) o.push(G.rows[i].c); return o; }
    return [G.glyphs];
}
function axo_isVert(L) {
    var rows = String(axo_doc(L).text).split(/\r\n|\r|\n/), i;
    if (rows.length < 2) return false;
    for (i = 0; i < rows.length; i++) if (jzCount(rows[i]) > 1) return false;
    return true;
}
// running glyph index for alternation, per textIndex: position in the line + line number, or the motion index for one-glyph layers
function axo_ix(G, o) {
    var out = [], off = axo_mi(o), i, k;
    for (i = 0; i < G.n; i++) out.push(off);
    if (G.glyphs.length < 2) return out;
    if (G.vert) { for (k = 0; k < G.glyphs.length; k++) out[G.glyphs[k].i] = k; }
    else for (i = 0; i < G.n; i++) if (G.chars[i]) out[i] = G.chars[i].ci + G.chars[i].row;
    return out;
}
// (u along the line, v across it) -> layer point
function axo_uv(V, u, v) { return V ? [v, u] : [u, v]; }
// row limits: each row owns the space half way to its neighbours; the first / last rows reach far out
function axo_rowLim(G, i, far) { var R = G.rows; return [i === 0 ? G.box.y0 - far : (R[i - 1].cy + R[i].cy) / 2, i === R.length - 1 ? G.box.y1 + far : (R[i].cy + R[i + 1].cy) / 2]; }
// flat rect x0..x1 / y0..y1 as one shape group
function axo_box(F, name, x0, x1, y0, y1, hex, op) {
    if (y1 - y0 < 0.01 || x1 - x0 < 0.01) return null;
    var g = jzGrp(F, name); jzAddRect(g, x1 - x0, y1 - y0, 0, (x0 + x1) / 2, (y0 + y1) / 2); jzAddFill(g, hex, op); return g;
}
function axo_band(F, name, cx, w, y0, y1, hex, op) { return axo_box(F, name, cx - w / 2, cx + w / 2, y0, y1, hex, op); }
// fill layer in L's layer space shown through L's glyphs (L becomes its matte)
function axo_fillLayer(ctx, L, name) { var F = axo_shapeOn(ctx, L, name, false, null); axo_matte(L, F); return F; }
// multi-stop vertical gradient over every row's em box: stops [[0..1, hex, alpha?], ...] like the browser's per-glyph
// gradient (equal offsets = hard edge), built from thin flat bands
function axo_gradRows(F, G, stops, far) {
    var R = G.rows, s = G.fs, cx = G.box.cx, i, j, k, ns = stops.length;
    var al = function (st) { return st[2] == null ? 1 : st[2]; };
    for (i = 0; i < R.length; i++) {
        var lim = axo_rowLim(G, i, far), y0 = R[i].cy - s * 0.5, nm = 'row ' + (i + 1);
        var Y = function (p) { return jzClamp(y0 + p * s, lim[0], lim[1]); };
        axo_band(F, nm + ' top', cx, far * 2, lim[0], Y(stops[0][0]) + 0.5, stops[0][1], al(stops[0]) * 100);
        for (j = 0; j + 1 < ns; j++) {
            var p0 = stops[j][0], p1 = stops[j + 1][0], c0 = stops[j][1], c1 = stops[j + 1][1], a0 = al(stops[j]), a1 = al(stops[j + 1]);
            if (p1 - p0 < 0.0005) continue;
            var m = (c0 === c1 && a0 === a1) ? 1 : Math.max(2, Math.ceil((p1 - p0) * 30));
            for (k = 0; k < m; k++) {
                var f = (k + 0.5) / m;
                axo_band(F, nm + ' ' + (j + 1) + '.' + (k + 1), cx, far * 2, Y(p0 + (p1 - p0) * k / m), Y(p0 + (p1 - p0) * (k + 1) / m) + (k < m - 1 && a0 === 1 && a1 === 1 ? 0.5 : 0),
                    m === 1 ? c0 : jzMixHex(c0, c1, f), (m === 1 ? a0 : a0 + (a1 - a0) * f) * 100);
            }
        }
        axo_band(F, nm + ' bottom', cx, far * 2, Y(stops[ns - 1][0]), lim[1], stops[ns - 1][1], al(stops[ns - 1]) * 100);
    }
}
// ---- screen-tone patterns (dots / lines / grid / hatch / stripes) as shape groups; cell sizes as in the browser
function axo_rep(g, n, dx, dy) {
    var r = jzVecs(g).addProperty('ADBE Vector Filter - Repeater');
    r.property('ADBE Vector Repeater Copies').setValue(Math.max(1, n));
    r.property('ADBE Vector Repeater Transform').property('ADBE Vector Repeater Position').setValue([dx, dy]);
    return r;
}
function axo_sub(g, name) { var s = jzVecs(g).addProperty('ADBE Vector Group'); s.name = name; return s; }
function axo_bandsShape(S, name, bx, th, sp, rot, hex) {
    var D = Math.sqrt(Math.pow(bx.x1 - bx.x0, 2) + Math.pow(bx.y1 - bx.y0, 2)), n = Math.ceil(D / sp) + 1;
    var g = jzGrp(S, name), inner = axo_sub(g, name + ' band');
    jzAddRect(inner, D, th, 0, 0, -D / 2); jzAddFill(inner, hex); axo_rep(inner, n, 0, sp);
    jzGX(g).property('ADBE Vector Position').setValue([(bx.x0 + bx.x1) / 2, (bx.y0 + bx.y1) / 2]);
    if (rot) jzGX(g).property('ADBE Vector Rotation').setValue(rot);
    return g;
}
function axo_pattern(ctx, S, kind, hex, s, bx, kk) {
    var w = bx.x1 - bx.x0, h = bx.y1 - bx.y0, u = ctx.u / kk, c, nx, ny;
    if (kind === 'dots') {
        c = Math.max(3 * u, s * 0.075); nx = Math.ceil(w / c) + 1; ny = Math.ceil(h / c) + 1;
        if (nx * ny > 6000) { c *= Math.sqrt(nx * ny / 6000); nx = Math.ceil(w / c) + 1; ny = Math.ceil(h / c) + 1; }
        var g = jzGrp(S, 'dots'), row = axo_sub(g, 'dot row');
        jzAddEllipse(row, c * 0.68, c * 0.68, bx.x0, bx.y0); jzAddFill(row, hex); axo_rep(row, nx, c, 0);
        axo_rep(g, ny, 0, c);
        return;
    }
    c = Math.max(3 * u, s * 0.06);
    if (kind === 'lines') axo_bandsShape(S, 'lines', bx, c * 0.45, c, 0, hex);
    else if (kind === 'grid') {
        axo_bandsShape(S, 'grid rows', bx, Math.max(u, c * 0.18), c, 0, hex);
        axo_bandsShape(S, 'grid columns', bx, Math.max(u, c * 0.18), c, 90, hex);
    } else if (kind === 'hatch') {
        axo_bandsShape(S, 'hatch a', bx, Math.max(u, c * 0.16), c / Math.SQRT2, 45, hex);
        axo_bandsShape(S, 'hatch b', bx, Math.max(u, c * 0.16), c / Math.SQRT2, -45, hex);
    } else axo_bandsShape(S, 'stripes', bx, c * 0.38, c / Math.SQRT2, -45, hex);
}
function axo_padBox(G, m) { return { x0: G.box.x0 - m, x1: G.box.x1 + m, y0: G.box.y0 - m, y1: G.box.y1 + m }; }
// tracking (em) for horizontal text / extra leading for vertical text (one glyph per row)
function axo_addTrack(td, em, vert) {
    if (vert) { var ld = (td.autoLeading === false && td.leading > 0) ? td.leading : td.fontSize * 1.2; td.autoLeading = false; td.leading = Math.max(td.fontSize * 0.5, ld + em * td.fontSize); }
    else td.tracking = Math.round(jzClamp((td.tracking || 0) + em * 1000, -1000, 1000));
}
// stroke-only copy on top of the lyric (keyline over a matte fill); hidden while a random motion moves the glyphs
function axo_keyline(ctx, L, o, name, hex, w) {
    var D = axo_copy(L, name, L, hex, w, false);
    D.moveBefore(L);
    if (axo_rnd(L)) axo_gate(D, axo_head(ctx, L, o));
    return D;
}

// ================================================================ FILLS
/* ---- xoRampAcross — 横流し色: the colour runs from the text colour to an accent glyph by glyph along the line (or peaks in the middle) */
jzReg('treat', 'xoRampAcross', {
    plan: function (rng, st) { return { v: rng.pick(['ramp', 'ramp', 'mid']), rev: rng.chance(0.4) }; },
    apply: function (ctx, L, P, o) {
        if (!axo_alive(L)) return;
        var sc = ctx.sc, col = jzTextColor(L);
        if (axo_onPlate(sc, col)) return;
        var c2 = axo_twoTone(sc, col), G = axo_lay(ctx, L), whole = jzCount(ctx.cut.text), mi = o ? o.mi : null, amt = [], i, j;
        var F = function (u) { if (P.rev) u = 1 - u; return P.v === 'mid' ? 1 - Math.abs(u * 2 - 1) : u; };
        for (i = 0; i < G.n; i++) amt.push(0);
        if (G.glyphs.length >= 2) {
            var lines = axo_lines(G);
            for (j = 0; j < lines.length; j++) { var n = lines[j].length; for (i = 0; i < n; i++) amt[lines[j][i].i] = F(n > 1 ? i / (n - 1) : 0.5) * 100; }
        } else if (whole >= 2 && mi != null && mi === Math.round(mi) && mi < whole) {
            var f = F(mi / (whole - 1)) * 100;
            for (i = 0; i < G.n; i++) amt[i] = f;
        } else return;
        jzAnimator(L, 'JZ Colour ramp', [['ADBE Text Fill Color', jzHex(c2)]], 'var a=' + axo_arr(amt) + ';a[textIndex-1]||0');
    }
});

/* ---- xoBeltBand — 中帯色: a belt of accent colour through the waist of every glyph row, set off by two hairline gaps */
jzReg('treat', 'xoBeltBand', {
    plan: function (rng, st) { return { at: rng.range(0.36, 0.43), h: rng.range(0.2, 0.26) }; },
    apply: function (ctx, L, P, o) {
        if (!axo_alive(L)) return;
        var sc = ctx.sc, col = jzTextColor(L), c2 = axo_twoTone(sc, col), a = axo_p(P, 'at', 0.4), b = a + axo_p(P, 'h', 0.23), g = axo_onPlate(sc, col) ? 0 : 0.02, gc = sc.bg;
        var G = axo_lay(ctx, L);
        if (!G.rows.length) return;
        var F = axo_fillLayer(ctx, L, 'JZ Belt fill');
        axo_gradRows(F, G, [[0, col], [a, col], [a, gc], [a + g, gc], [a + g, c2], [b - g, c2], [b - g, gc], [b, gc], [b, col], [1, col]], axo_far(ctx, L));
    }
});

/* ---- xoFoldHalf — 折り目: every glyph split down the middle, one half in a shaded tone (folded paper) or an accent */
jzReg('treat', 'xoFoldHalf', {
    plan: function (rng, st) { return { v: rng.pick(['tone', 'tone', 'acc']), at: rng.range(-0.04, 0.04) }; },
    apply: function (ctx, L, P, o) {
        if (!axo_alive(L)) return;
        var sc = ctx.sc, col = jzTextColor(L), at = axo_p(P, 'at', 0), i, k;
        var c2 = P.v === 'acc' ? axo_twoTone(sc, col) : (jzLum(col) < 0.5 ? jzMixHex(col, '#FFFFFF', 0.42) : jzMixHex(col, '#000000', 0.36));
        if (jzContrast(c2, sc.bg) < 1.6 || jzContrast(c2, col) < 1.25) c2 = jzMixHex(col, sc.bg, 0.5);
        var G = axo_lay(ctx, L), far = axo_far(ctx, L);
        if (!G.rows.length) return;
        // second colour from each glyph's fold line to half way to the next glyph (first groups draw on top), text colour under all
        var F = axo_fillLayer(ctx, L, 'JZ Fold fill');
        for (i = 0; i < G.rows.length; i++) {
            var lim = axo_rowLim(G, i, far), gs = G.rows[i].g;
            for (k = 0; k < gs.length; k++) {
                var x0 = gs[k].cx + at * gs[k].w, x1 = k < gs.length - 1 ? (gs[k].cx + gs[k].w / 2 + gs[k + 1].cx - gs[k + 1].w / 2) / 2 : G.box.cx + far;
                axo_box(F, 'half ' + (gs[k].i + 1), x0, Math.max(x0 + 0.5, x1), lim[0], lim[1], c2);
            }
        }
        axo_box(F, 'base', G.box.cx - far, G.box.cx + far, G.box.cy - far, G.box.cy + far, col);
    }
});

/* ---- xoDiagSplit — 斜め二色: one slanted edge crosses the whole lyric; everything past it is in the second colour (the edge slides in) */
jzReg('treat', 'xoDiagSplit', {
    plan: function (rng, st) { return { ang: rng.pick([24, 32, 40, 148, 156]), at: rng.range(-0.12, 0.12) }; },
    apply: function (ctx, L, P, o) {
        if (!axo_alive(L)) return;
        var sc = ctx.sc, col = jzTextColor(L);
        if (axo_onPlate(sc, col)) return;
        var c2 = axo_twoTone(sc, col), G = axo_lay(ctx, L), bx = G.box, s = G.fs, hw = (bx.x1 - bx.x0) / 2, hh = (bx.y1 - bx.y0) / 2;
        var ang = axo_p(P, 'ang', 32), a = ang * Math.PI / 180, nx = Math.cos(a), ny = Math.sin(a), R = Math.sqrt(hw * hw + hh * hh) + s, far = axo_far(ctx, L);
        var HD = axo_head(ctx, L, o), F = axo_fillLayer(ctx, L, 'JZ Diagonal fill');
        // half plane past the edge: a far rect whose local x axis is the edge normal
        var g = jzGrp(F, 'second colour');
        jzAddRect(g, far, far * 2, 0, far / 2, 0); jzAddFill(g, c2);
        var X = jzGX(g);
        X.property('ADBE Vector Rotation').setValue(ang);
        X.property('ADBE Vector Position').expression = HD + 'var q=oc(cl((time-DL-IN*0.3)/0.5))*' + AXO_OUT + ';var off=' + jzN(R) + '*(1-q)+' + jzN(axo_p(P, 'at', 0) * (G.vert ? hh : hw) * 2) + ';' +
            '[' + jzN(bx.cx) + '+' + jzN(nx) + '*off,' + jzN(bx.cy) + '+' + jzN(ny) + '*off]';
        axo_box(F, 'base', bx.cx - far, bx.cx + far, bx.cy - far, bx.cy + far, col);
    }
});

/* ---- xoGraphFill — 方眼塗り: graph-paper fill, a fine grid in the text colour over a pale tone, held by a keyline */
jzReg('treat', 'xoGraphFill', {
    plan: function (rng, st) { return { v: rng.pick(['tone', 'tone', 'duo']) }; },
    apply: function (ctx, L, P, o) {
        if (!axo_alive(L)) return;
        var sc = ctx.sc, col = jzTextColor(L), bgc = P.v === 'duo' ? axo_accentFor(sc, col, 1.6) : jzMixHex(col, sc.bg, 0.7);
        var G = axo_lay(ctx, L), s = G.fs, kk = axo_k(L), far = axo_far(ctx, L);
        axo_keyline(ctx, L, o, 'JZ Graph keyline', col, Math.max(1.3 * ctx.u / kk, s * 0.022));
        var F = axo_fillLayer(ctx, L, 'JZ Graph fill');
        axo_pattern(ctx, F, 'grid', col, s, axo_padBox(G, s * 0.6), kk);
        axo_box(F, 'base', G.box.cx - far, G.box.cx + far, G.box.cy - far, G.box.cy + far, bgc);
    }
});

/* ---- xoFadeHem — 裾ぼかし: the glyphs dissolve toward their feet (or their heads) */
jzReg('treat', 'xoFadeHem', {
    plan: function (rng, st) { return { up: rng.chance(0.3), k: rng.range(0.34, 0.46), lo: rng.range(0.06, 0.14) }; },
    apply: function (ctx, L, P, o) {
        if (!axo_alive(L)) return;
        var col = jzTextColor(L), k = axo_p(P, 'k', 0.4), lo = axo_p(P, 'lo', 0.1), G = axo_lay(ctx, L);
        if (!G.rows.length) return;
        var F = axo_fillLayer(ctx, L, 'JZ Faded hem fill');
        axo_gradRows(F, G, P.up ? [[0.08, col, lo], [1 - k, col, 1], [1, col, 1]] : [[0, col, 1], [k, col, 1], [0.92, col, lo]], axo_far(ctx, L));
    }
});

/* ---- xoHalfScreen — 半分網点: the top of every glyph is solid ink, the lower part is screened into dots / lines */
jzReg('treat', 'xoHalfScreen', {
    plan: function (rng, st) { return { at: rng.range(-0.02, 0.09), pat: rng.pick(['dots', 'dots', 'lines']) }; },
    apply: function (ctx, L, P, o) {
        if (!axo_alive(L)) return;
        var col = jzTextColor(L), G = axo_lay(ctx, L), s = G.fs, kk = axo_k(L), far = axo_far(ctx, L), at = axo_p(P, 'at', 0.03), i;
        if (!G.rows.length) return;
        jzNoGhost(axo_keyline(ctx, L, o, 'JZ Screen keyline', col, Math.max(1.2 * ctx.u / kk, s * 0.016)));
        var F = axo_fillLayer(ctx, L, 'JZ Half screen fill');
        for (i = 0; i < G.rows.length; i++) { var lim = axo_rowLim(G, i, far); axo_band(F, 'solid ' + (i + 1), G.box.cx, far * 2, lim[0], jzClamp(G.rows[i].cy + at * s, lim[0], lim[1]), col); }
        axo_pattern(ctx, F, P.pat === 'lines' ? 'lines' : 'dots', col, s, axo_padBox(G, s * 0.6), kk);
    }
});

/* ---- xoBorderBands — ボーダー柄: broad horizontal bands of two colours, like a striped shirt */
jzReg('treat', 'xoBorderBands', {
    plan: function (rng, st) { return { n: rng.pick([5, 5, 6, 7]), first: rng.chance(0.5) }; },
    apply: function (ctx, L, P, o) {
        if (!axo_alive(L)) return;
        var sc = ctx.sc, col = jzTextColor(L), c2 = axo_twoTone(sc, col), n = axo_p(P, 'n', 5), stops = [], k;
        for (k = 0; k < n; k++) { var c = ((k % 2 === 0) === !!P.first) ? col : c2; stops.push([jzClamp(0.07 + 0.86 * k / n, 0, 1), c]); stops.push([jzClamp(0.07 + 0.86 * (k + 1) / n, 0, 1), c]); }
        var G = axo_lay(ctx, L);
        if (!G.rows.length) return;
        var F = axo_fillLayer(ctx, L, 'JZ Border fill');
        axo_gradRows(F, G, stops, axo_far(ctx, L));
    }
});

// ================================================================ OUTLINES
/* ---- xoContour — 等高線: hollow glyphs drawn as three concentric contour lines (stroke-only copies, wide to narrow) */
jzReg('treat', 'xoContour', {
    plan: function (rng, st) { return { u: rng.range(0.016, 0.02), c: rng.chance(0.4) }; },
    apply: function (ctx, L, P, o) {
        if (!axo_alive(L, 0.5)) return;
        var sc = ctx.sc, col = jzTextColor(L), outer = P.c ? axo_accentFor(sc, col, 1.4) : col, s = jzFontSize(L), kk = axo_k(L), i;
        var u = Math.max(1.3 * ctx.u / kk, s * axo_p(P, 'u', 0.018));
        // small type (or one layer per glyph): two lines only, or it clogs
        var small = s * kk < jzU(ctx) * 0.085 || ctx.comp.numLayers > 30;
        var list = small ? [[3, sc.bg], [5, outer]] : [[3, sc.bg], [5, col], [7, sc.bg], [9, outer]];
        var rnd = axo_rnd(L), HD = axo_head(ctx, L, o), prev = L;
        for (i = 0; i < list.length; i++) {
            var D = jzNoGhost(axo_copy(L, 'JZ Contour ' + list[i][0], prev, list[i][1], u * list[i][0], false));
            if (rnd) axo_gate(D, HD);
            prev = D;
        }
        jzTextDoc(L, function (td) { td.applyFill = false; td.applyStroke = true; td.strokeColor = jzHex(col); td.strokeWidth = u * 1.15; });
    }
});

/* ---- xoCutLine — 切り取り線: solid glyphs with a dashed coupon line running around them at a distance */
jzReg('treat', 'xoCutLine', {
    plan: function (rng, st) { return { d: rng.range(0.15, 0.19), c: rng.int(0, 1) }; },
    apply: function (ctx, L, P, o) {
        if (!axo_alive(L)) return;
        var sc = ctx.sc, col = jzTextColor(L);
        if (axo_onPlate(sc, col)) return;
        var rc = P.c ? axo_markCol(sc, col) : axo_accentFor(sc, col, 1.3);
        var G = axo_lay(ctx, L), s = G.fs, kk = axo_k(L), d = s * axo_p(P, 'd', 0.17), lw = Math.max(1.6 * ctx.u / kk, s * 0.022);
        var HD = axo_head(ctx, L, o), rnd = axo_rnd(L);
        var Q = HD + 'var q=oc(cl((time-DL-0.05)/0.4))*' + AXO_OUT + (rnd ? '*' + AXO_REST : '') + ';';
        // paper-coloured stroke (the gap) over a wider stroke in the line colour; the line is cut into dashes by diagonal bands (its matte)
        var C2 = jzNoGhost(axo_copy(L, 'JZ Cut line gap', L, sc.bg, d, false));
        var C1 = jzNoGhost(axo_copy(L, 'JZ Cut line', C2, rc, d + lw * 2, false));
        var t2 = jzEffect(C2, 'ADBE Geometry2', 'JZ Cut line show'); jzEX(t2, 9, Q + '(q>0.02?100:0)');
        var t1 = jzEffect(C1, 'ADBE Geometry2', 'JZ Cut line show'); jzEX(t1, 9, Q + '(q>0.02?100*q:0)');
        var per = s * 0.15 / Math.SQRT2, S = axo_shapeOn(ctx, L, 'JZ Cut line dashes', false, null);
        axo_bandsShape(S, 'dashes', axo_padBox(G, s * 1.2), per * 0.567, per, -45, '#FFFFFF');
        S.moveAfter(C2);
        axo_matte(S, C1);
    }
});

/* ---- xoAltHollow — 交互袋: solid and hollow glyphs take turns (or: kana hollow, kanji solid) */
jzReg('treat', 'xoAltHollow', {
    plan: function (rng, st) { return { v: rng.pick(['alt', 'alt', 'kana']), first: rng.chance(0.5) }; },
    apply: function (ctx, L, P, o) {
        if (!axo_alive(L, 0.5)) return;
        var col = jzTextColor(L), G = axo_lay(ctx, L), s = G.fs, ix = axo_ix(G, o), oo = P.first ? 0 : 1, nK = 0, nO = 0, fl = [], i;
        var isK = function (c) { return jzIsKanji(c) || jzIsKata(c) || jzIsLatin(c); };
        for (i = 0; i < G.glyphs.length; i++) { var ch = G.glyphs[i].ch; if (isK(ch)) nK++; else if (!jzIsPunct(ch)) nO++; }
        var byKana = P.v === 'kana' && nK > 0 && nO > 0;
        for (i = 0; i < G.n; i++) {
            var c = G.chars[i];
            if (!c || c.sp) fl.push(0);
            else if (byKana) fl.push(isK(c.ch) || jzIsPunct(c.ch) ? 0 : 1);
            else fl.push((ix[i] + oo) % 2 ? 1 : 0);
        }
        jzTextDoc(L, function (td) { td.applyStroke = true; td.strokeColor = jzHex(col); td.strokeWidth = Math.max(1.3 * ctx.u / axo_k(L), s * 0.024); });
        jzAnimator(L, 'JZ Hollow glyphs', [['ADBE Text Fill Opacity', 0]], 'var a=' + axo_arr(fl) + ';(a[textIndex-1]||0)*100');
    }
});

/* ---- xoTwinOutline — 二重線字: no fill, two hairline outlines in two colours knocked apart */
jzReg('treat', 'xoTwinOutline', {
    plan: function (rng, st) { return { d: rng.range(0.045, 0.065), dir: rng.pick([[1, 1], [1, 1], [-1, 1], [1, 0], [0.5, -1]]), k: rng.range(0.024, 0.03) }; },
    apply: function (ctx, L, P, o) {
        if (!axo_alive(L, 0.5)) return;
        var sc = ctx.sc, col = jzTextColor(L), c2 = axo_accentFor(sc, col, 1.3), G = axo_lay(ctx, L), s = G.fs, dir = P.dir || [1, 1], d = s * axo_p(P, 'd', 0.055);
        var w = Math.max(1.5 * ctx.u / axo_k(L), s * axo_p(P, 'k', 0.027)), HD = axo_head(ctx, L, o), bx = G.box;
        var D = jzNoGhost(axo_copy(L, 'JZ Twin outline', L, c2, w, false));
        var tf = jzEffect(D, 'ADBE Geometry2', 'JZ Twin offset');
        jzEP(tf, 1, [bx.cx, bx.cy]);
        jzEX(tf, 2, HD + 'var q=oc(cl((time-DL-0.02)/0.4))*' + AXO_OUT + ';[' + jzN(bx.cx) + '+' + jzN(dir[0] * d) + '*q,' + jzN(bx.cy) + '+' + jzN(dir[1] * d) + '*q]');
        if (axo_rnd(L)) jzEX(tf, 9, HD + '100*' + AXO_REST);
        jzTextDoc(L, function (td) { td.applyFill = false; td.applyStroke = true; td.strokeColor = jzHex(col); td.strokeWidth = w; });
    }
});

/* ---- xoBlobKnock — 塊抜き: a fat rim fuses the line into one blob of text colour; the glyphs are knocked out of it */
jzReg('treat', 'xoBlobKnock', {
    plan: function (rng, st) { return { k: rng.range(0.26, 0.34) }; },
    apply: function (ctx, L, P, o) {
        if (!axo_alive(L, 0.9)) return;
        var sc = ctx.sc, col = jzTextColor(L);
        if (axo_onPlate(sc, col)) return;
        var tc = axo_textOn(col, sc.bg, sc), s = jzFontSize(L);
        // the rim is the lyric's own stroke, drawn under all fills: it follows every glyph motion
        jzTextDoc(L, function (td) {
            td.fillColor = jzHex(tc); td.applyStroke = true; td.strokeColor = jzHex(col); td.strokeWidth = s * axo_p(P, 'k', 0.3);
            try { td.strokeOverFill = false; } catch (e) {}
        });
        axo_recolor(L, tc, true);
        axo_fillsOver(L);
    }
});

// ================================================================ DEPTH
/* ---- xoEmboss — 浮き彫り: a light edge on one side and a dark edge on the other (two hard shadows of the lyric) */
jzReg('treat', 'xoEmboss', {
    plan: function (rng, st) { return { d: rng.range(0.028, 0.038), flip: rng.chance(0.25) }; },
    apply: function (ctx, L, P, o) {
        if (!axo_alive(L)) return;
        var sc = ctx.sc, col = jzTextColor(L), hi = jzMixHex(col, '#FFFFFF', 0.7), lo = jzMixHex(col, '#000000', 0.62);
        if (jzContrast(hi, col) < 1.3) hi = axo_accentFor(sc, col, 1.3);
        if (jzContrast(lo, col) < 1.3) lo = axo_accentFor(sc, col, 1.3);
        if (jzContrast(lo, sc.bg) < 1.15) lo = jzMixHex(sc.bg, sc.fg, 0.35);
        if (jzContrast(hi, sc.bg) < 1.15) hi = jzMixHex(sc.bg, sc.fg, 0.3);
        var d = jzFontSize(L) * axo_p(P, 'd', 0.033) * (P.flip ? -1 : 1);
        axo_shadow(L, 'JZ Emboss light', hi, -d, -d, 0, 1);      // the light edge lies over the dark one, as in the browser
        axo_shadow(L, 'JZ Emboss dark', lo, d, d, 0, 1);          // (cast by the lyric + its light edge: the edge's own shadow lands under the lyric)
    }
});

/* ---- xoBandExtrude — 縞立体: the extruded side is built from three bands of alternating colour */
jzReg('treat', 'xoBandExtrude', {
    plan: function (rng, st) { return { d: rng.range(0.15, 0.2), dir: rng.pick([[1, 1], [1, 1], [-1, 1], [1, 0.5]]) }; },
    apply: function (ctx, L, P, o) {
        if (!axo_alive(L)) return;
        var sc = ctx.sc, col = jzTextColor(L), s = jzFontSize(L), dir = P.dir || [1, 1];
        var A = axo_accentFor(sc, col, 1.6);
        var B = axo_first([sc.accent2, sc.ink, sc.ghostB, sc.fg, sc.sub], function (c) { return jzContrast(c, A) >= 1.4 && jzContrast(c, col) >= 1.3 && jzContrast(c, sc.bg) >= 1.3; }, jzMixHex(A, axo_dark(A) ? '#FFFFFF' : '#000000', 0.45));
        var Ls = s * axo_p(P, 'd', 0.175) / 3, vx = dir[0] * Ls, vy = dir[1] * Ls;
        // band 1: a solid sweep; bands 2 and 3: one hard shadow each of everything so far, one band length further
        axo_extrude(ctx, L, 'JZ Band 1', A, vx, vy);
        axo_shadow(L, 'JZ Band 2', B, vx, vy, 0, 1);
        axo_shadow(L, 'JZ Band 3', A, vx, vy, 0, 1);
    }
});

/* ---- xoFloorShadow — 床影: the last line throws a slanted, fading shadow on the floor toward the viewer (flipped, skewed copy) */
jzReg('treat', 'xoFloorShadow', {
    plan: function (rng, st) { return { k: rng.range(0.42, 0.56), sk: rng.range(0.55, 0.9) * (rng.chance(0.5) ? 1 : -1), a: rng.range(0.7, 0.9) }; },
    apply: function (ctx, L, P, o) {
        if (!axo_alive(L, 0.9)) return;
        var sc = ctx.sc, col = jzTextColor(L), sh = axo_shadeCol(sc, col), G = axo_lay(ctx, L), s = G.fs, k = axo_p(P, 'k', 0.5), HD = axo_head(ctx, L, o);
        if (!G.rows.length) return;
        var last = G.rows[G.rows.length - 1], yb = last.cy + s * 0.5 - s * 0.075;
        var D = jzNoGhost(axo_dup(L, 'JZ Floor shadow', L));
        jzTextDoc(D, function (td) { td.applyFill = true; td.fillColor = jzHex(sh); td.applyStroke = false; });
        axo_recolor(D, sh);
        // flip about the floor line: anchor on it, scale y by -k; the slant is a skew in the copy's own space (Transform effect)
        var A = axo_sv(L, 'ADBE Anchor Point'), Pp = axo_sv(L, 'ADBE Position'), Sc = axo_sv(L, 'ADBE Scale'), rot = axo_sv(L, 'ADBE Rotate Z') * Math.PI / 180;
        var sx = Sc[0] / 100, sy = Sc[1] / 100, vy = (yb - A[1]) * sy;
        jzXf(D, 'ADBE Anchor Point').setValue([A[0], yb]);
        jzXf(D, 'ADBE Position').setValue([Pp[0] - vy * Math.sin(rot), Pp[1] + vy * Math.cos(rot)]);
        jzXf(D, 'ADBE Scale').setValue([Sc[0], -Sc[1] * k]);
        jzXf(D, 'ADBE Opacity').setValue(axo_sv(L, 'ADBE Opacity') * axo_p(P, 'a', 0.8));
        // only the last line, strongest at the floor (feathered mask in the copy's own space, before the skew)
        var far = axo_far(ctx, L), m = jzMaskRect(D, G.box.cx - far, last.cy - s * 0.05, G.box.cx + far, yb + s * 0.8);
        m.property('ADBE Mask Feather').setValue([0, s * 0.7]);
        var tf = jzEffect(D, 'ADBE Geometry2', 'JZ Floor slant');
        jzEP(tf, 1, [A[0], yb]); jzEP(tf, 2, [A[0], yb]);
        jzEP(tf, 6, Math.atan(axo_p(P, 'sk', 0.7) * k * Math.abs(sy / (sx || 1))) * 180 / Math.PI); jzEP(tf, 7, 0);
        jzEX(tf, 9, HD + '100*oc(cl((time-DL-0.04)/0.45))*' + AXO_OUT + (axo_rnd(L) ? '*' + AXO_REST : ''));
    }
});

/* ---- xoGroundDots — 接地影: a small oval contact shadow under every glyph */
jzReg('treat', 'xoGroundDots', {
    plan: function (rng, st) { return { w: rng.range(0.4, 0.48), h: rng.range(0.05, 0.065) }; },
    apply: function (ctx, L, P, o) {
        if (!axo_alive(L, 0.9)) return;
        var sc = ctx.sc, sh = axo_shadeCol(sc, jzTextColor(L)), G = axo_lay(ctx, L), s = G.fs, HD = axo_head(ctx, L, o), k, n = 0;
        var S = jzNoGhost(axo_shapeOn(ctx, L, 'JZ Ground shadows', false, HD + 'var q=oc(cl((time-DL-0.02)/0.3))*' + AXO_OUT + ';' + AXO_POP + '*q*0.85'));
        var g = jzGrp(S, 'shadows'), ry = s * axo_p(P, 'h', 0.058);
        for (k = 0; k < G.glyphs.length; k++) {
            var gl = G.glyphs[k];
            if (jzIsPunct(gl.ch)) continue;
            if (G.vert && k < G.glyphs.length - 1) continue;                    // a column stands on its last glyph
            jzAddEllipse(g, Math.max(gl.w, s * 0.5) * axo_p(P, 'w', 0.44) * 2, ry * 2, gl.cx, gl.cy + gl.h * 0.5 + ry * 0.9);
            n++;
        }
        if (!n) { S.remove(); return; }
        jzAddFill(g, sh);
    }
});

/* ---- xoHollowBlock — 白抜き立体: the face is left in the paper colour with a keyline, the solid side carries the colour */
jzReg('treat', 'xoHollowBlock', {
    plan: function (rng, st) { return { d: rng.range(0.09, 0.13), dir: rng.pick([[1, 1], [1, 1], [-1, 1], [1, 0.5]]), k: rng.range(0.026, 0.034) }; },
    apply: function (ctx, L, P, o) {
        if (!axo_alive(L)) return;
        var sc = ctx.sc, col = jzTextColor(L), s = jzFontSize(L), dir = P.dir || [1, 1], Ls = s * axo_p(P, 'd', 0.11);
        if (axo_onPlate(sc, col)) return;
        jzTextDoc(L, function (td) {
            td.fillColor = jzHex(sc.bg); td.applyStroke = true; td.strokeColor = jzHex(col); td.strokeWidth = Math.max(1.5 * ctx.u / axo_k(L), s * axo_p(P, 'k', 0.03));
            try { td.strokeOverFill = true; } catch (e) {}
        });
        axo_recolor(L, sc.bg, true);
        axo_extrude(ctx, L, 'JZ Block side', col, dir[0] * Ls, dir[1] * Ls);
    }
});

/* ---- xoBlowUp — 拡大写し: a pale blown-up copy of the lyric swells out behind it */
jzReg('treat', 'xoBlowUp', {
    plan: function (rng, st) { return { k: rng.range(1.24, 1.4), a: rng.range(0.1, 0.15) }; },
    apply: function (ctx, L, P, o) {
        if (!axo_alive(L, 0.9)) return;
        var G = axo_lay(ctx, L), s = G.fs, bx = G.box;
        if (s * axo_k(L) > jzU(ctx) * 0.5) return;
        var HD = axo_head(ctx, L, o), D = jzNoGhost(axo_dup(L, 'JZ Blow-up', L));
        jzTextDoc(D, function (td) { td.applyStroke = false; });
        jzXf(D, 'ADBE Opacity').setValue(axo_sv(L, 'ADBE Opacity') * axo_p(P, 'a', 0.125));
        var Q = HD + 'var q=oc(cl((time-DL)/0.7))*' + AXO_OUT + (axo_rnd(L) ? '*' + AXO_REST : '') + ';';
        var tf = jzEffect(D, 'ADBE Geometry2', 'JZ Blow-up');
        jzEP(tf, 1, [bx.cx, bx.cy]); jzEP(tf, 2, [bx.cx, bx.cy]);
        jzEX(tf, 4, Q + '100*(1+' + jzN(axo_p(P, 'k', 1.32) - 1) + '*q*(1+0.04*Math.sin(time*1.7)))');
        jzEX(tf, 9, Q + '(q>0.02?100*q:0)');
    }
});
