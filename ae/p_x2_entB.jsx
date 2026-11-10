// ================================================================ pack x2entB (AE port of src/11p_x2_entB.js) — 30 mask / band entrances
// A. windows   xfCornerBloom xfChevron xfJaws xfSlantLouver xfHolesMerge xfSunburst xfTriptych xfRovingWindow xfStaircase
//              xfQuadRelay xfWiper xfSpiral xfCrossOpen xfClosingHole xfWeave xfPassingWipes xfPrintHead
// B. slices    xfTwoFields xfThreeTier xfStripSort xfEqualizer xfDiagStrips xfRingDial xfStackStrips
// C. plates    xfUnderSweep xfTapeOff xfScanner xfRollerShutter      D. outline first   xfOutlineLead xfTraceFlood
// The browser clips the lyric with a path it rebuilds every frame. Here:
//  - windows  = an alpha track matte shape layer parented to the text (drawn in the text layer's own space); its rects, discs,
//               pies and polygons are static shapes driven by expressions on size / position / scale / trim / stroke width.
//               A group that covers everything switches on when the entrance is over (holds / exits may move glyphs anywhere).
//  - one straight moving edge = a rect mask on the text opened by its mask expansion (no extra layer).
//  - slices   = copies of the text layer ("twins": parented to it, alive only during the entrance) with a static mask each,
//               moved / turned by expressions; the lyric layer itself is switched off until the entrance is over.
//  - helper graphics (bars, frames, arcs, tapes …) = shape layers parented to the text, main pass only (jzNoGhost), gone
//               after the entrance. As in the browser they are only made for the lyric's main copy.
// (u, v) = along / across the reading direction (vertical text: u = y, v = x), box padded by 0.2 × font size like the browser's.

// ---------------------------------------------------------------- shared helpers (axf_*)
// easings not in JZ_FNS: o2 outQuad, o4 outQuart, o5 outQuint, io3 inOutCubic, ios inOutSine, sm smoothstep, lp lerp,
// stg(p, k, spread) stagger, spr damped spring (1 -> 0)
var AXF_FNS = 'function o2(x){x=cl(x);return 1-(1-x)*(1-x);}function o4(x){x=cl(x);return 1-Math.pow(1-x,4);}function o5(x){x=cl(x);return 1-Math.pow(1-x,5);}' +
    'function io3(x){x=cl(x);return x<0.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;}function ios(x){x=cl(x);return -(Math.cos(Math.PI*x)-1)/2;}' +
    'function sm(a,b,x){x=cl((x-a)/(b-a));return x*x*(3-2*x);}function lp(a,b,t){return a+(b-a)*t;}' +
    'function stg(p,k,s){return cl((p-s*k)/(1-s));}' +
    'function spr(t,k,f){t=cl(t);return Math.exp(-k*t)*Math.cos(f*Math.PI*t)*(1-t*t*t);}\n';
function axf_T(m) { var c = m.c; return { IN: Math.max(0.02, c.inDur || 0.3), DL: (m.o.mi || 0) * (c.stagger || 0.04) }; }
// compact header for mattes / masks / helper layers: IN, DL, SZ, P + easings
function axf_head(m) { var t = axf_T(m); return 'var IN=' + jzN(t.IN) + ',DL=' + jzN(t.DL) + ',SZ=' + jzN(m.size) + ';' + JZ_FNS + AXF_FNS + 'var P=cl((time-DL)/IN);\n'; }
// the browser's J.h / J.r / J.rs (seeded directions and variants match the web version)
function axf_h(a, b, c, d, e) {
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
function axf_r(a, b, c, d) { return axf_h(a, b, c, d) / 4294967296; }
function axf_rs(a, b, c, d) { return axf_r(a, b, c, d) * 2 - 1; }
function axf_dir(m, salt) { return axf_r(m.c.seed | 0, salt, 5) < 0.5 ? -1 : 1; }
function axf_isHex(c) { return typeof c === 'string' && c.charAt(0) === '#' && (c.length === 7 || c.length === 4); }
function axf_pick(a, b, c) { if (axf_isHex(a)) return a; if (axf_isHex(b)) return b; if (axf_isHex(c)) return c; return '#FFFFFF'; }
function axf_td(L) { try { return L.property('ADBE Text Properties').property('ADBE Text Document').value; } catch (e) { return null; } }
// browser hotOf: an accent that differs from the lyric's own colour
function axf_hot(m) {
    var sc = m.ctx.sc, own = String(jzTextColor(m.L)).toUpperCase();
    return (axf_isHex(sc.accent) && own === String(sc.accent).toUpperCase()) ? axf_pick(sc.accent2, sc.fg) : axf_pick(sc.accent, sc.fg);
}
// Box of the lyric in the text layer's own space + the browser's (u, v) frame padded by mg (default 0.2 × font size).
// Call BEFORE adding animators. g.vert: one glyph per line (a vertical column); g.n glyphs (AE count), g.nk without spaces
function axf_geo(m, mg) {
    var L = m.L, td = axf_td(L), r = jzRect(L), fs = (td && td.fontSize) || m.size, i;
    var lines = String(td ? td.text : '').split(/\r\n|\r|\n|\u0003/), vert = lines.length > 1, n = 0, nk = 0;
    for (i = 0; i < lines.length; i++) { var cs = jzChars(lines[i]); if (cs.length > 1) vert = false; n += cs.length; nk += jzCount(lines[i]); }
    if (mg == null) mg = fs * 0.2;
    var g = { vert: vert, fs: fs, n: n, nk: nk, x0: r.left, y0: r.top, x1: r.left + r.width, y1: r.top + r.height, w: r.width, h: r.height };
    g.cx = (g.x0 + g.x1) / 2; g.cy = (g.y0 + g.y1) / 2;
    g.U0 = (vert ? g.y0 : g.x0) - mg; g.U1 = (vert ? g.y1 : g.x1) + mg; g.V0 = (vert ? g.x0 : g.y0) - mg; g.V1 = (vert ? g.x1 : g.y1) + mg;
    g.L = g.U1 - g.U0; g.T = g.V1 - g.V0; g.uc = (g.U0 + g.U1) / 2; g.vc = (g.V0 + g.V1) / 2; g.big = fs * 40 + g.L + g.T;
    return g;
}
// the frame as expression constants
function axf_GE(g) { return 'var U0=' + jzN(g.U0) + ',U1=' + jzN(g.U1) + ',V0=' + jzN(g.V0) + ',V1=' + jzN(g.V1) + ',LL=' + jzN(g.L) + ',TT=' + jzN(g.T) + ',uc=' + jzN(g.uc) + ',vc=' + jzN(g.vc) + ';'; }
function axf_p2(g, u, v) { return g.vert ? [v, u] : [u, v]; }
function axf_box(u0, v0, u1, v1) { return [[u0, v0], [u1, v0], [u1, v1], [u0, v1]]; }
function axf_layers(m) { try { return m.ctx.comp.numLayers; } catch (e) { return 0; } }
// extra layers are skipped for very long lines, one-glyph-per-layer layouts of long lyrics and crowded comps
function axf_crowded(m, g) { return g.n > 60 || (g.nk <= 1 && jzCount(m.c.text || '') > 14) || axf_layers(m) > 60; }
// browser isMain: the lyric's opaque, filled item (not a single glyph of a layout that sets every glyph separately)
function axf_main(m, g) {
    var td = axf_td(m.L);
    if (td && td.applyFill === false) return false;
    try { if (jzXf(m.L, 'ADBE Opacity').value < 85) return false; } catch (e) {}
    if (g.nk <= 1 && jzCount(m.c.text || '') > 2) return false;
    return !axf_crowded(m, g);
}
function axf_canMatte(m) { try { var t = m.L.trackMatteType; return !t || t === TrackMatteType.NO_TRACK_MATTE; } catch (e) { return false; } }
// no matte / twins possible: the part falls back to a plain wipe (or its declared core counterpart)
function axf_soft(m, g) { return !axf_canMatte(m) || axf_crowded(m, g); }
function axf_wipe(m, g, dir, eEx) {
    var lw = jzEffect(m.L, 'ADBE Linear Wipe', 'JZ In Wipe');
    jzEP(lw, 2, g.vert ? (dir > 0 ? 180 : 0) : (dir > 0 ? 270 : 90)); jzEP(lw, 3, 0);
    jzEX(lw, 1, m.HD + AXF_FNS + '(1-(' + eEx + '))*100');
}
function axf_core(m, key) { var E = JZ_REG.enter[key]; if (E && E.apply) E.apply(m); }
// shape layer drawn in the text layer's own space (parented to it, right above it). keep: full length (mattes);
// else a helper graphic: main pass only, gone once the entrance is over
function axf_shape(m, name, keep) {
    var L = m.L, S = m.ctx.comp.layers.addShape(), t = axf_T(m);
    try { S.name = name; } catch (e0) {}
    try { S.moveBefore(L); } catch (e1) {}
    S.parent = L;
    var tr = S.property('ADBE Transform Group');
    tr.property('ADBE Anchor Point').setValue([0, 0]); tr.property('ADBE Position').setValue([0, 0]);
    tr.property('ADBE Scale').setValue([100, 100]); tr.property('ADBE Rotate Z').setValue(0);
    if (!keep) { try { S.outPoint = Math.max(S.inPoint + 0.05, Math.min(S.outPoint, t.DL + t.IN + 0.1)); } catch (e2) {} jzNoGhost(S); }
    return S;
}
// opacity of a helper layer: ex = 0..1 factor, nothing before / after the entrance
function axf_fxOp(T, pre, ex) { jzSetExpr(jzXf(T, 'ADBE Opacity'), pre + 'P>=1||time<DL?0:(' + ex + ')*100'); }
function axf_sub(g, name) { var s = jzVecs(g).addProperty('ADBE Vector Group'); if (name) s.name = name; return s; }
// (every shape item is fully set up before the next one is added to the same contents: AE invalidates older references)
// static polygon / polyline in (u, v), stored relative to the anchor (au, av) = the group's position; fill col, or stroke lw
function axf_poly(S, name, g, au, av, pts, col, lw, open) {
    var grp = jzGrp(S, name), xy = [], i;
    for (i = 0; i < pts.length; i++) xy.push(axf_p2(g, pts[i][0] - au, pts[i][1] - av));
    jzAddPath(grp, xy, !open);
    if (lw) jzAddStroke(grp, col || '#FFFFFF', lw); else jzAddFill(grp, col || '#FFFFFF');
    jzGX(grp).property('ADBE Vector Position').setValue(axf_p2(g, au, av));
    return grp;
}
// group position = anchor + (du, dv) (expression strings)
function axf_move(grp, g, pre, au, av, du, dv) {
    var eu = jzN(au) + '+(' + (du || '0') + ')', ev = jzN(av) + '+(' + (dv || '0') + ')';
    jzSetExpr(jzGX(grp).property('ADBE Vector Position'), pre + (g.vert ? '[' + ev + ',' + eu + ']' : '[' + eu + ',' + ev + ']'));
}
// group scale factors along u / v (expression strings, 1 = 100 %)
function axf_scale(grp, g, pre, su, sv) {
    var eu = '(' + (su || '1') + ')*100', ev = '(' + (sv || '1') + ')*100';
    jzSetExpr(jzGX(grp).property('ADBE Vector Scale'), pre + (g.vert ? '[' + ev + ',' + eu + ']' : '[' + eu + ',' + ev + ']'));
}
function axf_op(grp, pre, ex) { jzSetExpr(jzGX(grp).property('ADBE Vector Group Opacity'), pre + ex); }
// rect whose four edges are expressions in (u, v); fill col, or stroke lw
function axf_rect(S, name, g, pre, u0, v0, u1, v1, col, lw) {
    var grp = jzGrp(S, name), rc = jzAddRect(grp, 10, 10, 0);
    var q = pre + 'var a_=' + u0 + ',b_=' + v0 + ',c_=' + u1 + ',d_=' + v1 + ',w_=Math.max(0,c_-a_),h_=Math.max(0,d_-b_);';
    jzSetExpr(rc.property('ADBE Vector Rect Size'), q + (g.vert ? '[h_,w_]' : '[w_,h_]'));
    jzSetExpr(rc.property('ADBE Vector Rect Position'), q + (g.vert ? '[(b_+d_)/2,(a_+c_)/2]' : '[(a_+c_)/2,(b_+d_)/2]'));
    if (lw) jzAddStroke(grp, col || '#FFFFFF', lw); else jzAddFill(grp, col || '#FFFFFF');
    return grp;
}
// ellipse at (x, y) (layer space) with a size expression; fill col, or stroke lw
function axf_ell(S, name, x, y, pre, sizeEx, col, lw) {
    var grp = jzGrp(S, name), el = jzAddEllipse(grp, 10, 10);
    jzSetExpr(el.property('ADBE Vector Ellipse Size'), pre + sizeEx);
    if (lw) jzAddStroke(grp, col || '#FFFFFF', lw); else jzAddFill(grp, col || '#FFFFFF');
    jzGX(grp).property('ADBE Vector Position').setValue([x, y]);
    return grp;
}
// finish a matte layer: (unless inverted) a group that shows everything once the entrance is over, then link it to the lyric
function axf_end(m, S, g, inv) {
    var L = m.L, ok = false, type = inv ? TrackMatteType.ALPHA_INVERTED : TrackMatteType.ALPHA;
    if (!inv) {
        var fg = jzGrp(S, 'after entrance');
        jzAddRect(fg, 40000, 40000, 0, g.cx, g.cy); jzAddFill(fg, '#FFFFFF');
        jzSetExpr(jzGX(fg).property('ADBE Vector Group Opacity'), axf_head(m) + 'time>=DL+IN?100:0');
    }
    try { S.moveBefore(L); } catch (e0) {}
    if (typeof L.setTrackMatte === 'function') { try { L.setTrackMatte(S, type); ok = true; } catch (e1) { ok = false; } }
    if (!ok) { try { L.trackMatteType = type; } catch (e2) { jzWarn('axf matte: ' + e2.toString()); } }
}
// ---- masks (layer space). A layer the layout already masked keeps that clip: the first new mask then intersects
function axf_nMasks(Lx) { try { return Lx.property('ADBE Mask Parade').numProperties; } catch (e) { return 0; } }
function axf_mode(mk, mode) { try { mk.maskMode = mode; } catch (e) {} }
function axf_mPoly(Lx, pts, name) {
    var had = axf_nMasks(Lx) > 0, mk = Lx.property('ADBE Mask Parade').addProperty('ADBE Mask Atom'), sh = new Shape();
    sh.vertices = pts; sh.closed = true;
    mk.property('ADBE Mask Shape').setValue(sh);
    try { if (name) mk.name = name; } catch (e) {}
    if (had) axf_mode(mk, MaskMode.INTERSECT);
    return mk;
}
function axf_mBox(Lx, g, u0, v0, u1, v1, name) {
    var a = axf_p2(g, u0, v0), b = axf_p2(g, u1, v1);
    return axf_mPoly(Lx, [[b[0], a[1]], [b[0], b[1]], [a[0], b[1]], [a[0], a[1]]], name);
}
function axf_mCirc(Lx, cx, cy, r0, name) {
    var had = axf_nMasks(Lx) > 0, mk = Lx.property('ADBE Mask Parade').addProperty('ADBE Mask Atom'), sh = new Shape(), k = r0 * 0.5523;
    sh.vertices = [[cx, cy - r0], [cx + r0, cy], [cx, cy + r0], [cx - r0, cy]];
    sh.inTangents = [[-k, 0], [0, -k], [k, 0], [0, k]]; sh.outTangents = [[k, 0], [0, k], [-k, 0], [0, -k]]; sh.closed = true;
    mk.property('ADBE Mask Shape').setValue(sh);
    try { if (name) mk.name = name; } catch (e) {}
    if (had) axf_mode(mk, MaskMode.INTERSECT);
    return mk;
}
// half plane beyond `edge` on the axis 'u' / 'v' (side +1: towards larger values); its expansion (expression, px) moves the
// edge the other way, so the window opens over the lyric
function axf_half(Lx, g, axis, side, edge, exEx, name) {
    var B = g.big, mk;
    if (axis === 'v') mk = axf_mBox(Lx, g, g.U0 - B, side > 0 ? edge : edge - B, g.U1 + B, side > 0 ? edge + B : edge, name);
    else mk = axf_mBox(Lx, g, side > 0 ? edge : edge - B, g.V0 - B, side > 0 ? edge + B : edge, g.V1 + B, name);
    if (exEx) jzSetExpr(mk.property('ADBE Mask Offset'), exEx);
    return mk;
}
// ---- twins: a copy of the lyric layer that lives only during the entrance, parented to L (follows every move of it).
// Made before the entrance adds its own masks / animators to L.
function axf_twin(m, tag, below) {
    var L = m.L, D = L.duplicate(), t = axf_T(m), i, mns = ['ADBE Position', 'ADBE Scale', 'ADBE Rotate Z', 'ADBE Opacity', 'ADBE Anchor Point'];
    try { D.name = String(L.name).substr(0, 20) + ' ' + tag; } catch (e0) {}
    var tr = D.property('ADBE Transform Group');
    for (i = 0; i < mns.length; i++) { try { if (tr.property(mns[i]).expression) tr.property(mns[i]).expression = ''; } catch (e1) {} }
    D.parent = L;
    tr.property('ADBE Scale').setValue([100, 100]); tr.property('ADBE Rotate Z').setValue(0);
    jzSetExpr(tr.property('ADBE Position'), 'parent.transform.anchorPoint');
    jzSetExpr(tr.property('ADBE Opacity'), axf_head(m) + 'time>=DL&&time<DL+IN?value:0');
    try { D.outPoint = Math.max(D.inPoint + 0.05, Math.min(D.outPoint, t.DL + t.IN + 0.1)); } catch (e2) {}
    if (below) { try { D.moveAfter(L); } catch (e3) {} }
    return D;
}
// one slice: a twin offset by (du, dv) in the lyric's own space, alpha factor aEx (expression strings). The caller adds its mask
function axf_slice(m, g, tag, pre, du, dv, aEx) {
    var D = axf_twin(m, tag), tr = D.property('ADBE Transform Group');
    if (du || dv) {
        var eu = '(' + (du || '0') + ')', ev = '(' + (dv || '0') + ')';
        jzSetExpr(tr.property('ADBE Position'), pre + 'var a_=parent.transform.anchorPoint;' + (g.vert ? '[a_[0]+' + ev + ',a_[1]+' + eu + ']' : '[a_[0]+' + eu + ',a_[1]+' + ev + ']'));
    }
    jzSetExpr(tr.property('ADBE Opacity'), pre + 'time>=DL&&time<DL+IN?value*cl(' + (aEx || '1') + '):0');
    return D;
}
// the lyric layer itself waits until its slices have come together
function axf_hideL(m) { m.parts.op.push('f*=time<DL+IN?0:1;'); }
// outline copy: no fill, a hairline stroke in the lyric's own colour (browser OUTLINE)
function axf_outline(m, D, fs, k) {
    jzTextDoc(D, function (d) {
        var c = d.fillColor;
        d.applyFill = false; d.applyStroke = true; d.strokeColor = c; d.strokeWidth = Math.max(1.2 * m.u, fs * k);
        try { d.strokeOverFill = false; } catch (e) {}
    });
}
function axf_lw(m, g) { return Math.max(2 * m.u, g.fs * 0.03); }

/* =====================================================================
   A. WINDOWS
   ===================================================================== */

/* ---- xfCornerBloom — 角から円: a circle grows out of one corner of the line until it has swallowed the whole of it */
jzReg('enter', 'xfCornerBloom', { apply: function (m) {
    var g = axf_geo(m), fs = g.fs, c = axf_h(m.c.seed | 0, 301) & 3, mg = fs * 0.25, k;
    if (axf_soft(m, g)) { axf_wipe(m, g, (c & 1) ? -1 : 1, 'io3(P)'); return; }
    var x = (c & 1) ? g.x1 + mg : g.x0 - mg, y = (c & 2) ? g.y0 - mg : g.y1 + mg;
    var R = Math.sqrt((g.w + mg * 2) * (g.w + mg * 2) + (g.h + mg * 2) * (g.h + mg * 2)) + 2;
    var E = axf_head(m) + 'var r=' + jzN(R) + '*io3(P);';
    if (axf_main(m, g)) {
        // two quarter arcs on the growing edge (AE ellipses start at 12 o'clock, clockwise)
        var T = axf_shape(m, 'JZ In Bloom Arcs'), a0 = (c & 1) ? ((c & 2) ? 90 : 180) : ((c & 2) ? 0 : 270), col = axf_hot(m), lw = axf_lw(m, g);
        for (k = 0; k < 2; k++) {
            var ag = jzGrp(T, 'arc ' + (k + 1)), ae = jzAddEllipse(ag, 10, 10);
            jzSetExpr(ae.property('ADBE Vector Ellipse Size'), E + '[2*r*' + (k ? 0.82 : 1) + ',2*r*' + (k ? 0.82 : 1) + ']');
            jzAddTrimPaths(ag, '25', null);
            jzAddStroke(ag, col, lw * (k ? 0.5 : 1), k ? 50 : 100);
            jzGX(ag).property('ADBE Vector Position').setValue([x, y]);
            jzGX(ag).property('ADBE Vector Rotation').setValue(a0 - 270);
        }
        axf_fxOp(T, E, '1-sm(0.5,0.92,P)');
    }
    var S = axf_shape(m, 'JZ In Bloom Matte', true);
    axf_ell(S, 'bloom', x, y, E, '[2*r,2*r]');
    axf_end(m, S, g);
} });

/* ---- xfChevron — 山形ワイプ: the leading edge is an arrow head; two outline chevrons run ahead of it */
jzReg('enter', 'xfChevron', { apply: function (m) {
    var g = axf_geo(m), fs = g.fs, dir = axf_dir(m, 302), k = 0.6, hv = g.T / 2, W = g.L + k * hv + 1, Ua = dir > 0 ? g.U0 : g.U1, j;
    if (axf_soft(m, g)) { axf_wipe(m, g, dir, 'io3(P)'); return; }
    var u = function (s) { return Ua + dir * s; };
    var E = axf_head(m) + 'var tip=' + jzN(W) + '*io3(P);';
    if (axf_main(m, g)) {
        var T = axf_shape(m, 'JZ In Chevrons'), col = axf_hot(m), lw = axf_lw(m, g);
        for (j = 0; j < 2; j++) {
            var cg = axf_poly(T, 'chevron ' + (j + 1), g, Ua, g.vc, [[u(-k * hv), g.V0], [u(0), g.vc], [u(-k * hv), g.V1]], col, lw * (j ? 0.6 : 1.2), true);
            axf_move(cg, g, E, Ua, g.vc, jzN(dir) + '*(tip+' + jzN(fs * (0.16 + 0.3 * j)) + ')', '0');
            jzGX(cg).property('ADBE Vector Group Opacity').setValue(j ? 50 : 100);
        }
        axf_fxOp(T, E, 'cl(P*8)*(1-sm(0.72,0.96,P))');
    }
    var S = axf_shape(m, 'JZ In Chevron Matte', true);
    var pg = axf_poly(S, 'arrow', g, Ua, g.vc, [[u(-g.big), g.V0], [u(-k * hv), g.V0], [u(0), g.vc], [u(-k * hv), g.V1], [u(-g.big), g.V1]]);
    axf_move(pg, g, E, Ua, g.vc, jzN(dir) + '*tip', '0');
    axf_end(m, S, g);
} });

/* ---- xfJaws — 噛み合わせ: two saw-toothed jaws close on the line from above and below and mesh along a zigzag */
jzReg('enter', 'xfJaws', { apply: function (m) {
    var g = axf_geo(m, null), fs = g.fs, j;
    g = axf_geo(m, fs * 0.06);
    if (axf_soft(m, g)) { axf_wipe(m, g, 1, 'io3(P/0.94)'); return; }
    var nT = Math.max(2, Math.min(40, Math.round(g.L / (fs * 0.62)))), tw = g.L / nT, am = Math.min(g.T * 0.2, fs * 0.26), D0 = g.T / 2 + am * 0.5;
    var z = [], B = g.big, up = [[g.U0 - B, g.V0 - B], [g.U1 + B, g.V0 - B]], lo = [];
    for (j = 0; j <= nT * 2; j++) z.push([g.U0 + j * tw / 2, g.vc + (j % 2 ? am : -am)]);
    for (j = z.length - 1; j >= 0; j--) up.push([z[j][0] + (j === 0 ? -B : (j === z.length - 1 ? B : 0)), z[j][1] + 0.4]);
    for (j = 0; j < z.length; j++) lo.push([z[j][0] + (j === 0 ? -B : (j === z.length - 1 ? B : 0)), z[j][1] - 0.4]);
    lo.push([g.U1 + B, g.V1 + B]); lo.push([g.U0 - B, g.V1 + B]);
    var E = axf_head(m) + 'var D=' + jzN(D0) + '*(1-io3(P/0.94));';
    if (axf_main(m, g)) {
        var T = axf_shape(m, 'JZ In Jaw Lines'), col = axf_hot(m), lw = axf_lw(m, g);
        var l1 = axf_poly(T, 'upper', g, g.uc, g.vc, z, col, lw, true); axf_move(l1, g, E, g.uc, g.vc, '0', '-D');
        var l2 = axf_poly(T, 'lower', g, g.uc, g.vc, z, col, lw, true); axf_move(l2, g, E, g.uc, g.vc, '0', 'D');
        axf_fxOp(T, E, 'cl(P*6)*(1-sm(0.8,1,P))');
    }
    var S = axf_shape(m, 'JZ In Jaws Matte', true);
    var g1 = axf_poly(S, 'upper jaw', g, g.uc, g.vc, up); axf_move(g1, g, E, g.uc, g.vc, '0', '-D'); axf_op(g1, E, 'P>0?100:0');
    var g2 = axf_poly(S, 'lower jaw', g, g.uc, g.vc, lo); axf_move(g2, g, E, g.uc, g.vc, '0', 'D'); axf_op(g2, E, 'P>0?100:0');
    axf_end(m, S, g);
} });

/* ---- xfSlantLouver — 斜めルーバー: slanted slats drift along the line while they open one after another
   (each slat = a slanted line whose stroke width is its opening) */
jzReg('enter', 'xfSlantLouver', { apply: function (m) {
    var g = axf_geo(m), fs = g.fs, dir = axf_dir(m, 304), k = 0.75 * axf_dir(m, 305), j;
    if (axf_soft(m, g)) { axf_wipe(m, g, dir, 'io3(P)'); return; }
    var ak = Math.abs(k) * g.T / 2, lo = g.U0 - ak, hi = g.U1 + ak, pitch = Math.max(fs * 0.46, (hi - lo) / 70);
    var j0 = Math.floor((lo - (dir > 0 ? pitch * 2.5 : 0)) / pitch) - 1, j1 = Math.ceil((hi + (dir < 0 ? pitch * 2.5 : 0)) / pitch) + 1;
    var E = axf_head(m) + 'var lo=' + jzN(lo) + ',hi=' + jzN(hi) + ',pitch=' + jzN(pitch) + ',drift=(1-oc(P))*pitch*2.5*' + jzN(dir) + ';';
    var S = axf_shape(m, 'JZ In Louvre Matte', true), root = jzGrp(S, 'slats'), ck = 1 / Math.sqrt(1 + k * k);
    for (j = j0; j <= j1 && j - j0 < 90; j++) {
        var sg = axf_sub(root, 'slat ' + (j - j0 + 1));
        jzAddPath(sg, [axf_p2(g, -k * g.T, -g.T), axf_p2(g, k * g.T, g.T)], false);
        var st = jzAddStroke(sg, '#FFFFFF', 1);
        jzSetExpr(st.property('ADBE Vector Stroke Width'), E + 'var c=' + jzN(j * pitch) + '+drift,f=cl((c-lo)/Math.max(1,hi-lo)),d=io3(stg(P,' + (dir > 0 ? '1-f' : 'f') + ',0.45));d<=0?0:(pitch*d+1)*' + jzN(ck));
        jzGX(sg).property('ADBE Vector Position').setValue(axf_p2(g, j * pitch, g.vc));
    }
    axf_move(root, g, E, 0, 0, 'drift', '0');
    axf_end(m, S, g);
} });

/* ---- xfHolesMerge — 穴がつながる: round holes open at scattered points and grow until they merge into the whole line */
jzReg('enter', 'xfHolesMerge', { apply: function (m) {
    var g = axf_geo(m), fs = g.fs, seed = (m.c.seed | 0) + (m.o.mi || 0) * 101, k, H = axf_head(m);
    if (axf_soft(m, g)) { axf_wipe(m, g, 1, 'io3(P)'); return; }
    var n = jzClamp(Math.round(g.L / (fs * 1.2)), 2, 7), cw = g.L / n, hs = [];
    for (k = 0; k < n; k++) {
        var ju = axf_rs(seed, k, 311) * cw * 0.28, jv = axf_rs(seed, k, 312) * g.T * 0.28, c = axf_p2(g, g.U0 + (k + 0.5) * cw + ju, g.vc + jv);
        var hx = cw / 2 + Math.abs(ju), hy = g.T / 2 + Math.abs(jv);
        hs.push({ x: c[0], y: c[1], E: H + 'var q=stg(P,' + jzN(axf_r(seed, k, 313)) + ',0.4),r=' + jzN(Math.sqrt(hx * hx + hy * hy) * 1.03 + 1) + '*io3(q);' });
    }
    if (axf_main(m, g)) {
        var T = axf_shape(m, 'JZ In Hole Rims'), col = axf_hot(m), lw = axf_lw(m, g) * 0.8;
        for (k = 0; k < n; k++) { var rg = axf_ell(T, 'rim ' + (k + 1), hs[k].x, hs[k].y, hs[k].E, '[2*r,2*r]', col, lw); axf_op(rg, hs[k].E, 'q>0?(1-sm(0.25,0.8,q))*100:0'); }
        axf_fxOp(T, H, '1');
    }
    var S = axf_shape(m, 'JZ In Holes Matte', true);
    for (k = 0; k < n; k++) axf_ell(S, 'hole ' + (k + 1), hs[k].x, hs[k].y, hs[k].E, '[2*r,2*r]');
    axf_end(m, S, g);
} });

/* ---- xfSunburst — 放射びらき: eight wedges fan out from the middle of the line, turning slightly as they widen
   (each wedge = a pie: a circle stroked as wide as its diameter, trimmed to the wedge angle) */
jzReg('enter', 'xfSunburst', { apply: function (m) {
    var g = axf_geo(m), dir = axf_dir(m, 321), a0 = axf_r(m.c.seed | 0, 322) * 360, k;
    if (axf_soft(m, g)) { axf_wipe(m, g, dir, 'io3(P)'); return; }
    var R = Math.sqrt(g.L * g.L + g.T * g.T) / 2 + 2, Rr = R * 1.1;
    var E = axf_head(m) + 'var ha=22.5*io3(P)*1.03,a0=' + jzN(a0) + '+(1-oc(P))*' + jzN(0.8 * dir * 180 / Math.PI) + ';';
    if (axf_main(m, g)) {
        var T = axf_shape(m, 'JZ In Rays'), rg = jzGrp(T, 'rays');
        for (k = 0; k < 8; k++) jzAddPath(rg, [[0, 0], [Math.cos(k * Math.PI / 4) * R, Math.sin(k * Math.PI / 4) * R]], false);
        jzAddStroke(rg, axf_hot(m), axf_lw(m, g) * 0.6);
        jzGX(rg).property('ADBE Vector Position').setValue([g.cx, g.cy]);
        jzSetExpr(jzGX(rg).property('ADBE Vector Rotation'), E + 'a0');
        jzSetExpr(jzGX(rg).property('ADBE Vector Scale'), E + 'var s=oc(P*2.2)*100;[s,s]');
        axf_fxOp(T, E, 'cl(P*10)*(1-sm(0.15,0.6,P))');
    }
    var S = axf_shape(m, 'JZ In Sunburst Matte', true), root = jzGrp(S, 'wedges');
    for (k = 0; k < 8; k++) {
        var wg = axf_sub(root, 'wedge ' + (k + 1));
        jzAddEllipse(wg, Rr, Rr);
        jzAddTrimPaths(wg, E + 'ha<=0?0:Math.min(100,ha*2/3.6)', null);
        jzAddStroke(wg, '#FFFFFF', Rr);
        jzGX(wg).property('ADBE Vector Rotation').setValue(k * 45);
    }
    jzGX(root).property('ADBE Vector Position').setValue([g.cx, g.cy]);
    jzSetExpr(jzGX(root).property('ADBE Vector Rotation'), E + 'a0-ha+90');
    axf_end(m, S, g);
} });

/* ---- xfTriptych — 三連窓: three panes; the middle one opens first, then the outer two, each framed while it grows */
jzReg('enter', 'xfTriptych', { apply: function (m) {
    var g = axf_geo(m), ORD = [1, 0, 2], w = g.L / 3, k, H = axf_head(m), Es = [], cs = [];
    if (axf_soft(m, g)) { axf_wipe(m, g, 1, 'io3(P)'); return; }
    for (k = 0; k < 3; k++) { Es.push(H + 'var q=stg(P,' + jzN(ORD[k] / 2) + ',0.45),e=o4(q);'); cs.push(g.U0 + (k + 0.5) * w); }
    if (axf_main(m, g)) {
        var T = axf_shape(m, 'JZ In Pane Frames'), col = axf_hot(m), lw = axf_lw(m, g) * 0.8, hw = jzN(w / 2 + 0.5), hv = jzN(g.T / 2);
        for (k = 0; k < 3; k++) {
            var fg = axf_rect(T, 'frame ' + (k + 1), g, Es[k], jzN(cs[k]) + '-' + hw + '*e', jzN(g.vc) + '-' + hv + '*e', jzN(cs[k]) + '+' + hw + '*e', jzN(g.vc) + '+' + hv + '*e', col, lw);
            axf_op(fg, Es[k], 'q>0?(1-sm(0.55,1,q))*100:0');
        }
        axf_fxOp(T, H, '1');
    }
    var S = axf_shape(m, 'JZ In Panes Matte', true);
    for (k = 0; k < 3; k++) {
        var pg = axf_poly(S, 'pane ' + (k + 1), g, cs[k], g.vc, axf_box(cs[k] - w / 2 - 0.5, g.V0, cs[k] + w / 2 + 0.5, g.V1));
        axf_scale(pg, g, Es[k], 'e', 'e');
    }
    axf_end(m, S, g);
} });

/* ---- xfRovingWindow — 覗き窓: a framed window travels along the line, then stretches back and opens everything */
jzReg('enter', 'xfRovingWindow', { apply: function (m) {
    var g = axf_geo(m), fs = g.fs, dir = axf_dir(m, 331);
    if (axf_soft(m, g)) { axf_wipe(m, g, -dir, 'io3((P-0.5)/0.5)'); return; }
    var w0 = Math.min(jzClamp(g.L * 0.28, fs * 0.9, fs * 2.6), g.L * 0.6);
    var E = axf_head(m) + axf_GE(g) + 'var w0=' + jzN(w0) + ',t1=io3(P/0.5),t2=io3((P-0.5)/0.5),a=P<0.5?lp(-w0,LL-w0,t1):lp(LL-w0,0,t2),z=P<0.5?a+w0:LL;' +
        'a=Math.max(0,a);z=Math.min(LL,z);var wa=' + (dir > 0 ? 'U0+a' : 'U1-z') + ',wz=' + (dir > 0 ? 'U0+z' : 'U1-a') + ';';
    if (axf_main(m, g)) {
        var T = axf_shape(m, 'JZ In Window Frame');
        axf_rect(T, 'frame', g, E, 'wa', 'V0', 'wz', 'V1', axf_hot(m), axf_lw(m, g));
        axf_fxOp(T, E, 'wz-wa<1?0:1-sm(0.78,1,P)');
    }
    var S = axf_shape(m, 'JZ In Window Matte', true);
    axf_rect(S, 'window', g, E, 'wa', 'V0', 'wz', 'V1');
    axf_end(m, S, g);
} });

/* ---- xfStaircase — 階段ワイプ: the line is uncovered column by column, each a little later: a moving staircase */
jzReg('enter', 'xfStaircase', { apply: function (m) {
    var g = axf_geo(m), fs = g.fs, rev = axf_dir(m, 341) < 0, up = axf_dir(m, 342) < 0, k, H = axf_head(m);
    if (axf_soft(m, g)) { axf_wipe(m, g, rev ? -1 : 1, 'io3(P)'); return; }
    var N = jzClamp(Math.round(g.L / (fs * 0.62)), 4, 14), w = g.L / N, Va = up ? g.V1 : g.V0, Es = [];
    for (k = 0; k < N; k++) Es.push(H + 'var f=io3(cl(P*1.75-' + jzN(0.75 * (rev ? N - 1 - k : k) / (N - 1)) + '));');
    if (axf_main(m, g)) {
        var T = axf_shape(m, 'JZ In Steps'), col = axf_hot(m), t = axf_lw(m, g);
        for (k = 0; k < N; k++) {
            var u0 = g.U0 + k * w, bg = axf_poly(T, 'step ' + (k + 1), g, u0, Va, axf_box(u0, Va - t / 2, u0 + w, Va + t / 2), col);
            axf_move(bg, g, Es[k], u0, Va, '0', jzN((up ? -1 : 1) * g.T) + '*f');
            axf_op(bg, Es[k], 'f<=0||f>=1?0:Math.min(1,f*6,(1-f)*6)*100');
        }
        axf_fxOp(T, H, '1');
    }
    var S = axf_shape(m, 'JZ In Stairs Matte', true);
    for (k = 0; k < N; k++) {
        var c0 = g.U0 + k * w, cg = axf_poly(S, 'column ' + (k + 1), g, c0, Va, axf_box(c0, g.V0, c0 + w + 0.6, g.V1));
        axf_scale(cg, g, Es[k], '1', 'f');
    }
    var og = axf_poly(S, 'beyond', g, g.uc, Va, up ? axf_box(g.U0, g.V1 - 0.5, g.U1 + 0.6, g.V1 + g.big) : axf_box(g.U0, g.V0 - g.big, g.U1 + 0.6, g.V0 + 0.5));
    axf_op(og, H, 'P>0?100:0');
    axf_end(m, S, g);
} });

/* ---- xfQuadRelay — 四分割リレー: the four quarters are wiped one after another, the wipe turning a corner each time */
jzReg('enter', 'xfQuadRelay', { apply: function (m) {
    var g = axf_geo(m), flip = axf_dir(m, 351) < 0, k, H = axf_head(m);
    if (axf_soft(m, g)) { axf_wipe(m, g, 1, 'io3(P)'); return; }
    var Va = flip ? g.V1 : g.V0, Vb = flip ? g.V0 : g.V1, t = axf_lw(m, g) * 1.3;
    // [u-from, u-to (the wipe runs from -> to when ax = 'u'), v-from, v-to, axis]
    var Q = [[g.U0, g.uc, Va, g.vc, 'u'], [g.uc, g.U1, Va, g.vc, 'v'], [g.U1, g.uc, Vb, g.vc, 'u'], [g.uc, g.U0, Vb, g.vc, 'v']], Es = [];
    for (k = 0; k < 4; k++) Es.push(H + 'var e=io3(cl((P-' + jzN(k * 0.22) + ')/0.34));');
    var T = axf_main(m, g) ? axf_shape(m, 'JZ In Relay Bars') : null, col = axf_hot(m);
    if (T) {
        for (k = 0; k < 4; k++) {
            var q = Q[k], ua = Math.min(q[0], q[1]), ub = Math.max(q[0], q[1]), va = Math.min(q[2], q[3]), vb = Math.max(q[2], q[3]), bg;
            if (q[4] === 'u') { bg = axf_poly(T, 'bar ' + (k + 1), g, q[0], g.vc, axf_box(q[0] - t / 2, va, q[0] + t / 2, vb), col); axf_move(bg, g, Es[k], q[0], g.vc, jzN(q[1] - q[0]) + '*e', '0'); }
            else { bg = axf_poly(T, 'bar ' + (k + 1), g, g.uc, q[2], axf_box(ua, q[2] - t / 2, ub, q[2] + t / 2), col); axf_move(bg, g, Es[k], g.uc, q[2], '0', jzN(q[3] - q[2]) + '*e'); }
            axf_op(bg, Es[k], 'e>0&&e<1?100:0');
        }
        axf_fxOp(T, H, '1');
    }
    var S = axf_shape(m, 'JZ In Relay Matte', true);
    for (k = 0; k < 4; k++) {
        var p = Q[k], bx = axf_box(Math.min(p[0], p[1]) - 0.4, Math.min(p[2], p[3]) - 0.4, Math.max(p[0], p[1]) + 0.4, Math.max(p[2], p[3]) + 0.4);
        var qg = axf_poly(S, 'quarter ' + (k + 1), g, p[0], p[2], bx);
        if (p[4] === 'u') axf_scale(qg, g, Es[k], 'e', '1'); else axf_scale(qg, g, Es[k], '1', 'e');
    }
    axf_end(m, S, g);
} });

/* ---- xfWiper — ワイパー: an arm pivoting below the line sweeps across like a windscreen wiper (the swept sector = a trimmed pie) */
jzReg('enter', 'xfWiper', { apply: function (m) {
    var g = axf_geo(m), fs = g.fs, dir = axf_dir(m, 361);
    if (axf_soft(m, g)) { axf_wipe(m, g, dir, 'io3(P/0.94)'); return; }
    var d = g.T * 0.55 + fs * 0.5, pv = g.V1 + d, aL = Math.atan2(-d, -g.L / 2) - 0.03, aR = Math.atan2(-d, g.L / 2) + 0.03;
    var A0 = (dir > 0 ? aL : aR) * 180 / Math.PI, span = (aR - aL) * 180 / Math.PI, R = Math.sqrt(g.L * g.L / 4 + (g.T + d) * (g.T + d)) * 1.04, Rr = R * 1.02;
    // angle on screen of the browser's (u, v) angle; the sweep is clockwise on screen when cw
    var th0 = g.vert ? 90 - A0 : A0, cw = (dir > 0) !== g.vert, pc = axf_p2(g, g.uc, pv);
    var E = axf_head(m) + 'var ext=' + jzN(span) + '*io3(P/0.94);';
    if (axf_main(m, g)) {
        var T = axf_shape(m, 'JZ In Wiper Arm'), ag = jzGrp(T, 'arm'), col = axf_hot(m), lw = axf_lw(m, g);
        var s1 = axf_sub(ag, 'pivot'); jzAddEllipse(s1, lw * 4.4, lw * 4.4); jzAddFill(s1, col);
        var s2 = axf_sub(ag, 'blade'); jzAddPath(s2, [[0, 0], [R, 0]], false); jzAddStroke(s2, col, lw * 1.6);
        jzGX(ag).property('ADBE Vector Position').setValue(pc);
        jzSetExpr(jzGX(ag).property('ADBE Vector Rotation'), E + jzN(th0) + (cw ? '+' : '-') + 'ext');
        axf_fxOp(T, E, 'cl(P*10)*(1-sm(0.82,0.98,P))');
    }
    var S = axf_shape(m, 'JZ In Wiper Matte', true), pg = jzGrp(S, 'swept');
    jzAddEllipse(pg, Rr, Rr);
    if (cw) jzAddTrimPaths(pg, E + 'Math.min(100,ext/3.6)', null); else jzAddTrimPaths(pg, null, E + 'Math.max(0,100-ext/3.6)');
    jzAddStroke(pg, '#FFFFFF', Rr);
    jzGX(pg).property('ADBE Vector Position').setValue(pc);
    jzGX(pg).property('ADBE Vector Rotation').setValue(th0 + 90);
    axf_op(pg, E, 'ext>0?100:0');
    axf_end(m, S, g);
} });

/* ---- xfSpiral — 渦巻き窓: a thin spiral slit winds outwards from the middle, then thickens until its turns touch
   (a spiral path trimmed to its length so far, its stroke width = the slit; the group is stretched along the line like the browser's) */
jzReg('enter', 'xfSpiral', { apply: function (m) {
    var g = axf_geo(m), dir = axf_dir(m, 371), th0 = axf_r(m.c.seed | 0, 372) * Math.PI * 2, i, k;
    if (axf_soft(m, g)) { axf_wipe(m, g, dir, 'io3(P)'); return; }
    var kx = jzClamp(g.L / g.T, 1, 3.2), Rm = Math.sqrt(g.L * g.L / 4 / (kx * kx) + g.T * g.T / 4) + 1, pitch = Rm / 3, TM = Math.PI * 6, pts = [], n = 132;
    for (i = 0; i <= n; i++) { var th = TM * i / n, r = pitch * th / (Math.PI * 2); pts.push(axf_p2(g, Math.cos(th0 + dir * th) * r, Math.sin(th0 + dir * th) * r)); }
    var E = axf_head(m) + 'var eL=oc(P/0.7),eW=io3((P-0.3)/0.7),tm=' + jzN(TM) + '*eL;function sl(t){return t*Math.sqrt(1+t*t)+Math.log(t+Math.sqrt(1+t*t));}';
    var trim = E + 'sl(tm)/sl(' + jzN(TM) + ')*100', sc = g.vert ? [100, kx * 100] : [kx * 100, 100];
    var T = axf_main(m, g) ? axf_shape(m, 'JZ In Spiral Line') : null, S = axf_shape(m, 'JZ In Spiral Matte', true), Ls = T ? [T, S] : [S];
    for (k = 0; k < Ls.length; k++) {
        var line = Ls[k] === T, sg = jzGrp(Ls[k], 'spiral');
        jzAddPath(sg, pts, false);
        jzAddTrimPaths(sg, trim, null);
        var st = jzAddStroke(sg, line ? axf_hot(m) : '#FFFFFF', line ? axf_lw(m, g) * 0.7 : 2);
        try { st.property('ADBE Vector Stroke Line Join').setValue(2); } catch (e0) {}
        if (!line) jzSetExpr(st.property('ADBE Vector Stroke Width'), E + '2*' + jzN(pitch) + '*lp(0.15,1.02,eW)');
        jzGX(sg).property('ADBE Vector Position').setValue([g.cx, g.cy]);
        jzGX(sg).property('ADBE Vector Scale').setValue(sc);
    }
    if (T) axf_fxOp(T, E, '1-sm(0.35,0.8,P)');
    axf_end(m, S, g);
} });

/* ---- xfCrossOpen — 十字びらき: a slit along the line and a column across it widen together, the four corners close last */
jzReg('enter', 'xfCrossOpen', { apply: function (m) {
    var g = axf_geo(m), fs = g.fs, su, sv;
    if (axf_soft(m, g)) { axf_wipe(m, g, 1, 'io3(P)'); return; }
    var E = axf_head(m) + 'var e1=io3(P),e2=io3(P*1.15-0.15);';
    if (axf_main(m, g)) {
        var T = axf_shape(m, 'JZ In Cross Corners'), col = axf_hot(m), lw = axf_lw(m, g), arm = fs * 0.22;
        for (su = -1; su <= 1; su += 2) for (sv = -1; sv <= 1; sv += 2) {
            var bg = axf_poly(T, 'corner', g, g.uc, g.vc, [[g.uc + su * arm, g.vc], [g.uc, g.vc], [g.uc, g.vc + sv * arm]], col, lw, true);
            axf_move(bg, g, E, g.uc, g.vc, jzN(su * (g.L / 2 + 0.5)) + '*e2', jzN(sv * (g.T / 2 + 0.5)) + '*e1');
        }
        axf_fxOp(T, E, 'cl(P*8)*(1-sm(0.7,0.95,P))');
    }
    var S = axf_shape(m, 'JZ In Cross Matte', true);
    var g1 = axf_poly(S, 'slit', g, g.uc, g.vc, axf_box(g.U0 - 1, g.V0 - 0.5, g.U1 + 1, g.V1 + 0.5)); axf_scale(g1, g, E, '1', 'e1');
    var g2 = axf_poly(S, 'column', g, g.uc, g.vc, axf_box(g.U0 - 0.5, g.V0 - 1, g.U1 + 0.5, g.V1 + 1)); axf_scale(g2, g, E, 'e2', '1');
    axf_end(m, S, g);
} });

/* ---- xfClosingHole — 閉じる穴: revealed from the outer edge inwards: an oval blind spot shrinks to a point (inverted matte) */
jzReg('enter', 'xfClosingHole', { apply: function (m) {
    var g = axf_geo(m);
    if (axf_soft(m, g)) { m.parts.op.push(AXF_FNS + 'f*=io3(P);'); return; }
    var E = axf_head(m) + 'var k=1-(0.5*oc(P)+0.5*io3(P));', sz = '[' + jzN(g.w * 1.42 + 4) + '*k,' + jzN(g.h * 1.42 + 4) + '*k]';
    if (axf_main(m, g)) {
        var T = axf_shape(m, 'JZ In Hole Rim');
        axf_ell(T, 'rim', g.cx, g.cy, E, sz, axf_hot(m), axf_lw(m, g) * 0.8);
        axf_fxOp(T, E, 'cl(P*3.5)*(1-sm(0.75,1,P))');
    }
    var S = axf_shape(m, 'JZ In Blind Spot', true);
    axf_ell(S, 'blind spot', g.cx, g.cy, E, sz);
    axf_end(m, S, g, true);
} });

/* ---- xfWeave — 織り目: stripes along the line and across it run in from alternate sides, weave a plaid, then thicken to solid
   (four groups of lines: trim = how far they have run, stroke width = how thick they are) */
jzReg('enter', 'xfWeave', { apply: function (m) {
    var g = axf_geo(m), fs = g.fs, j, k;
    if (axf_soft(m, g)) { axf_wipe(m, g, 1, 'io3(P)'); return; }
    var nH = jzClamp(Math.round(g.T / (fs * 0.34)), 3, 12), ph = g.T / nH, nV = jzClamp(Math.round(g.L / (fs * 0.34)), 3, 44), pw = g.L / nV;
    var E = axf_head(m) + 'var x1=io3(P/0.55),x2=io3((P-0.1)/0.55),d=lp(0.42,1,io3((P-0.5)/0.5));';
    var S = axf_shape(m, 'JZ In Weave Matte', true);
    for (k = 0; k < 4; k++) {
        var along = k < 2, odd = k % 2, n = along ? nH : nV, wg = jzGrp(S, (along ? 'weft ' : 'warp ') + (odd ? 'b' : 'a')), any = false;
        for (j = odd; j < n; j += 2) {
            var c = (along ? g.V0 + (j + 0.5) * ph : g.U0 + (j + 0.5) * pw);
            var a = along ? [g.U0 - 1, c] : [c, g.V0 - 1], b = along ? [g.U1 + 1, c] : [c, g.V1 + 1];
            jzAddPath(wg, odd ? [axf_p2(g, b[0], b[1]), axf_p2(g, a[0], a[1])] : [axf_p2(g, a[0], a[1]), axf_p2(g, b[0], b[1])], false);
            any = true;
        }
        if (!any) continue;
        jzAddTrimPaths(wg, E + (along ? 'x1' : 'x2') + '*100', null);
        var st = jzAddStroke(wg, '#FFFFFF', 2);
        jzSetExpr(st.property('ADBE Vector Stroke Width'), E + jzN(along ? ph : pw) + '*d+0.8');
    }
    axf_end(m, S, g);
} });

/* ---- xfPassingWipes — すれ違いワイプ: the upper half is wiped from one end, the lower half from the other; the bars pass mid-line */
jzReg('enter', 'xfPassingWipes', { apply: function (m) {
    var g = axf_geo(m), fs = g.fs, dir = axf_dir(m, 381), k, B = g.big + g.L;
    if (axf_soft(m, g)) { axf_wipe(m, g, dir, 'io3(P)'); return; }
    var E = axf_head(m) + 'var e=io3(P);', T = axf_main(m, g) ? axf_shape(m, 'JZ In Passing Bars') : null, S = axf_shape(m, 'JZ In Passing Matte', true);
    var t2 = Math.max(4 * m.u, fs * 0.07) / 2, col = axf_hot(m);
    for (k = 0; k < 2; k++) {
        var sg = k ? -dir : dir, Ua = sg > 0 ? g.U0 : g.U1, du = jzN(sg * g.L) + '*e';
        var hg = axf_poly(S, k ? 'lower' : 'upper', g, Ua, g.vc, sg > 0 ? axf_box(g.U0 - B, k ? g.vc : g.V0 - g.big, g.U0, k ? g.V1 + g.big : g.vc + 0.4) : axf_box(g.U1, k ? g.vc : g.V0 - g.big, g.U1 + B, k ? g.V1 + g.big : g.vc + 0.4));
        axf_move(hg, g, E, Ua, g.vc, du, '0');
        if (!T) continue;
        var bg = axf_poly(T, k ? 'lower bar' : 'upper bar', g, Ua, g.vc, axf_box(Ua - t2, k ? g.vc : g.V0, Ua + t2, k ? g.V1 : g.vc), col);
        axf_move(bg, g, E, Ua, g.vc, du, '0');
    }
    if (T) axf_fxOp(T, E, 'cl(P*12)');
    axf_end(m, S, g);
} });

/* ---- xfPrintHead — 印字ヘッド: a print head shuttles back and forth, laying the line down one thin row at a time from the top */
jzReg('enter', 'xfPrintHead', { apply: function (m) {
    var g = axf_geo(m), fs = g.fs, first = axf_dir(m, 391), k, H = axf_head(m);
    if (axf_soft(m, g)) { axf_wipe(m, g, first, 'P'); return; }
    var N = jzClamp(Math.round(g.T / (fs * 0.36)), 3, 8), h = g.T / N;
    if (axf_main(m, g)) {
        var T = axf_shape(m, 'JZ In Print Head');
        var E = H + axf_GE(g) + 'var N=' + N + ',k=Math.min(N-1,Math.floor(P*N)),q=cl(P*N-k),e=ios(q),dd=(k%2?-1:1)*' + jzN(first) + ',ed=dd>0?U0+LL*e:U1-LL*e,v0=V0+k*' + jzN(h) + ',hw=' + jzN(fs * 0.11) + ',pd=' + jzN(fs * 0.04) + ';';
        axf_rect(T, 'head', g, E, 'ed-hw', 'v0-pd', 'ed+hw', 'v0+' + jzN(h) + '+pd', axf_hot(m));
        axf_fxOp(T, E, 'P>0?1:0');
    }
    var S = axf_shape(m, 'JZ In Print Matte', true);
    for (k = 0; k < N; k++) {
        var d = (k % 2 ? -1 : 1) * first, Ua = d > 0 ? g.U0 - 1 : g.U1 + 1, v0 = g.V0 + k * h;
        var rg = axf_poly(S, 'row ' + (k + 1), g, Ua, v0, axf_box(g.U0 - 1, v0 - 0.4, g.U1 + 1, v0 + h + 0.4));
        axf_scale(rg, g, H + 'var e=ios(cl(P*' + N + '-' + k + '));', 'e', '1');
    }
    axf_end(m, S, g);
} });

/* =====================================================================
   B. SLICES
   ===================================================================== */

/* ---- xfTwoFields — 二版合わせ: two fields of hairline rows; one slides in from each side and they interleave */
jzReg('enter', 'xfTwoFields', { apply: function (m) {
    var g = axf_geo(m), fs = g.fs, dir = axf_dir(m, 401), f, k, H = axf_head(m);
    if (axf_soft(m, g)) { axf_core(m, 'slice'); return; }
    var D = fs * 1.4 + g.L * 0.18, hr = Math.max(fs * 0.075, 3 * m.u, g.T / 120), n = Math.ceil(g.T / hr), B = g.big, x0 = g.U0 - B, x1 = g.U1 + B, xs = x0 - fs;
    for (f = 0; f < 2; f++) {
        // comb of every other row, joined by a spine far outside the text
        var pts = [], last = null;
        for (k = f; k < n; k += 2) {
            var va = g.V0 + k * hr - (k < 2 ? B : 0), vb = g.V0 + (k + 1) * hr + 0.6 + (k >= n - 2 ? B : 0);
            pts.push(axf_p2(g, last === null ? xs : x0, va)); pts.push(axf_p2(g, x1, va)); pts.push(axf_p2(g, x1, vb)); pts.push(axf_p2(g, x0, vb));
            last = vb;
        }
        if (last === null) continue;
        pts[pts.length - 1] = axf_p2(g, xs, last);
        var Dk = f ? axf_slice(m, g, 'JZ In Field B', H, jzN(dir * D) + '*(1-o4((P-0.3)/0.7))', null, '(P-0.3)*6')
                   : axf_slice(m, g, 'JZ In Field A', H, jzN(-dir * D) + '*(1-o4(P/0.66))', null, 'P*6');
        axf_mPoly(Dk, pts, 'JZ In Field');
    }
    axf_hideL(m);
} });

/* ---- xfThreeTier — 三段ずれ: three tiers arrive one after another from the same side and spring back and forth into line */
jzReg('enter', 'xfThreeTier', { apply: function (m) {
    var g = axf_geo(m), fs = g.fs, dir = axf_dir(m, 411), k, H = axf_head(m), B = g.big;
    if (axf_soft(m, g)) { axf_core(m, 'slice'); return; }
    for (k = 0; k < 3; k++) {
        var E = H + 'var q=stg(P,' + jzN(k / 2) + ',0.3);';
        var Dk = axf_slice(m, g, 'JZ In Tier ' + (k + 1), E, jzN(dir * fs * 1.7) + '*spr(q,3.4,2.5)', null, 'q*5');
        axf_mBox(Dk, g, g.U0 - B, k ? g.V0 + k * g.T / 3 : g.V0 - B, g.U1 + B, k < 2 ? g.V0 + (k + 1) * g.T / 3 + 1.2 : g.V1 + B, 'JZ In Tier');
    }
    axf_hideL(m);
} });

/* ---- xfStripSort — 帯の並べ替え: vertical strips standing in the wrong order hop over each other into place */
jzReg('enter', 'xfStripSort', { apply: function (m) {
    var g = axf_geo(m), fs = g.fs, seed = m.c.seed | 0, k, H = axf_head(m), B = g.big;
    if (axf_soft(m, g)) { axf_core(m, 'slice'); return; }
    var N = jzClamp(Math.round(g.L / (fs * 0.95)), 3, 7), w = g.L / N, sh = 1 + (axf_h(seed, 421) % (N - 1)), slot = [];
    for (k = 0; k < N; k++) slot.push((k + sh) % N);
    var sw = axf_h(seed, 422) % (N - 1), tmp = slot[sw]; slot[sw] = slot[sw + 1]; slot[sw + 1] = tmp;
    for (k = 0; k < N; k++) {
        var E = H + 'var q=stg(P,' + jzN(k / (N - 1)) + ',0.4),e=io3(q);';
        var Dk = axf_slice(m, g, 'JZ In Strip ' + (k + 1), E, jzN((slot[k] - k) * w) + '*(1-e)', jzN(-fs * 0.5 * (k % 2 ? 1 : -1)) + '*Math.sin(Math.PI*q)', 'P*7');
        axf_mBox(Dk, g, g.U0 + k * w - (k ? 0 : B), g.V0 - B, g.U0 + (k + 1) * w + (k < N - 1 ? 1.2 : B), g.V1 + B, 'JZ In Strip');
    }
    axf_hideL(m);
} });

/* ---- xfEqualizer — イコライザ: columns of the line shoot up from behind a floor line to different beats, overshoot and settle
   (browser: fixed-width columns; here every glyph is one column — a text animator under a floor mask, so the lyric stays one layer) */
jzReg('enter', 'xfEqualizer', { apply: function (m) {
    var L = m.L, g = axf_geo(m), fs = g.fs, seed = m.c.seed | 0, i, RD = [], H = axf_head(m), K = g.T + fs * 0.1;
    var main = axf_main(m, g);
    for (i = 0; i < g.n; i++) RD.push(jzN(axf_r(seed, i, 431)));
    if (main) {
        var T = axf_shape(m, 'JZ In Floor'), t = axf_lw(m, g);
        var fg = axf_poly(T, 'floor', g, g.uc, g.V1, axf_box(g.U0, g.V1 - t / 2, g.U1, g.V1 + t / 2), axf_hot(m));
        axf_scale(fg, g, H, 'o4(P/0.2)', '1');
        axf_fxOp(T, H, '1-sm(0.8,1,P)');
    }
    axf_half(L, g, 'v', -1, g.V1, H + 'time>=DL+IN?1e4:0', 'JZ In Floor');
    var q = m.HD + AXF_FNS + 'var RD=[' + RD.join(',') + '],q=stg(P,RD[textIndex-1]||0,0.5);';
    jzAnimator(L, 'JZ In EQ Rise', [['ADBE Text Position 3D', g.vert ? [K, 0, 0] : [0, K, 0]]], q + 'q<=0?100:(1-ob(q,1.5))*100');
    jzAnimator(L, 'JZ In EQ Hide', [['ADBE Text Opacity', 0]], q + 'q<=0?100:0');
} });

/* ---- xfDiagStrips — 斜め帯合わせ: slanted strips slide along their own slant, alternately down and up, into register */
jzReg('enter', 'xfDiagStrips', { apply: function (m) {
    var g = axf_geo(m), fs = g.fs, k = 0.6 * axf_dir(m, 441), j, H = axf_head(m), B = g.big;
    if (axf_soft(m, g)) { axf_core(m, 'slice'); return; }
    var ak = Math.abs(k) * g.T / 2, lo = g.U0 - ak, hi = g.U1 + ak, N = jzClamp(Math.round((hi - lo) / (fs * 1.15)), 3, 7), sw = (hi - lo) / N;
    var nrm = Math.sqrt(k * k + 1), D = g.T + fs * 1.4;
    for (j = 0; j < N; j++) {
        var sg = j % 2 ? 1 : -1, E = H + 'var q=stg(P,' + jzN(j / (N - 1)) + ',0.42),e=o5(q);';
        var Dj = axf_slice(m, g, 'JZ In Diagonal ' + (j + 1), E, jzN(sg * k / nrm * D) + '*(1-e)', jzN(sg / nrm * D) + '*(1-e)', 'q*4');
        var a = j ? lo + j * sw : lo - B, z = j < N - 1 ? lo + (j + 1) * sw + 1.2 : hi + B;
        axf_mPoly(Dj, [axf_p2(g, a - k * B, g.vc - B), axf_p2(g, z - k * B, g.vc - B), axf_p2(g, z + k * B, g.vc + B), axf_p2(g, a + k * B, g.vc + B)], 'JZ In Diagonal');
    }
    axf_hideL(m);
} });

/* ---- xfRingDial — ダイヤル合わせ: concentric rings turned out of place rotate back like a combination lock, inner ring first */
jzReg('enter', 'xfRingDial', { apply: function (m) {
    var g = axf_geo(m), fs = g.fs, n = 4, dir = axf_dir(m, 451), j, H = axf_head(m), B = g.big;
    if (axf_soft(m, g)) { axf_core(m, 'spin'); return; }
    var Rm = Math.sqrt(g.w * g.w + g.h * g.h) / 2 + fs * 0.15;
    if (axf_main(m, g)) {
        var T = axf_shape(m, 'JZ In Dial Rings'), col = axf_hot(m), lw = axf_lw(m, g) * 0.5;
        for (j = 1; j < n; j++) { var rg = jzGrp(T, 'ring ' + j); jzAddEllipse(rg, Rm * j / n * 2, Rm * j / n * 2, g.cx, g.cy); jzAddStroke(rg, col, lw); }
        axf_fxOp(T, H, '0.5*cl(P*8)*(1-sm(0.6,0.95,P))');
    }
    for (j = 0; j < n; j++) {
        var E = H + 'var q=stg(P,' + jzN(j / (n - 1)) + ',0.4);';
        var Dj = axf_slice(m, g, 'JZ In Ring ' + (j + 1), E, null, null, 'q*4'), tr = Dj.property('ADBE Transform Group');
        // turns about the middle of the box
        tr.property('ADBE Anchor Point').setValue([g.cx, g.cy]);
        jzSetExpr(tr.property('ADBE Position'), '[' + jzN(g.cx) + ',' + jzN(g.cy) + ']');
        jzSetExpr(tr.property('ADBE Rotate Z'), E + jzN(dir * (j % 2 ? -1 : 1) * (52 - 9 * j)) + '*(1-o5(q))');
        if (j < n - 1) axf_mCirc(Dj, g.cx, g.cy, Rm * (j + 1) / n + 1.2, 'JZ In Ring');
        else axf_mPoly(Dj, [[g.cx + B, g.cy - B], [g.cx + B, g.cy + B], [g.cx - B, g.cy + B], [g.cx - B, g.cy - B]], 'JZ In Ring');
        if (j) axf_mode(axf_mCirc(Dj, g.cx, g.cy, Rm * j / n, 'JZ In Ring Hole'), MaskMode.SUBTRACT);
    }
    axf_hideL(m);
} });

/* ---- xfStackStrips — 積み帯: built like a wall: the lowest strip drops in and bounces, then the next lands on top of it */
jzReg('enter', 'xfStackStrips', { apply: function (m) {
    var g = axf_geo(m), fs = g.fs, N = 4, k, H = axf_head(m), B = g.big, h = g.T / N;
    if (axf_soft(m, g)) { axf_core(m, 'drop'); return; }
    for (k = 0; k < N; k++) {
        var E = H + 'var q=stg(P,' + jzN((N - 1 - k) / (N - 1)) + ',0.5);';
        var Dk = axf_slice(m, g, 'JZ In Course ' + (k + 1), E, null, jzN(-(g.T + fs * 0.9)) + '*(1-bo(q))', 'q*8');
        axf_mBox(Dk, g, g.U0 - B, k ? g.V0 + k * h : g.V0 - B, g.U1 + B, k < N - 1 ? g.V0 + (k + 1) * h + 1.2 : g.V1 + B, 'JZ In Course');
    }
    axf_hideL(m);
} });

/* =====================================================================
   C. PLATES & BARS
   ===================================================================== */

/* ---- xfUnderSweep — 下線が掃く: an underline is drawn, lifts through the line uncovering what it has passed, retracts as an overline */
jzReg('enter', 'xfUnderSweep', { apply: function (m) {
    var L = m.L, g = axf_geo(m), fs = g.fs, dir = axf_dir(m, 501), main = axf_main(m, g), H = axf_head(m);
    var lf = main ? 'io3((P-0.12)/0.7)' : 'io3(P)';
    if (main) {
        var T = axf_shape(m, 'JZ In Underline'), t = jzN(Math.max(3 * m.u, fs * 0.055) / 2);
        var E = H + axf_GE(g) + 'var bv=lp(V1,V0,' + lf + '),s0=LL*ic(cl((P-0.82)/0.18)),s1=LL*o4(P/0.2);';
        axf_rect(T, 'underline', g, E, dir > 0 ? 'U0+s0' : 'U1-s1', 'bv-' + t, dir > 0 ? 'U0+s1' : 'U1-s0', 'bv+' + t, axf_hot(m));
        axf_fxOp(T, E, 's1-s0<0.5?0:1');
    }
    axf_half(L, g, 'v', 1, g.V1, H + 'time>=DL+IN?1e4:' + jzN(g.T) + '*' + lf, 'JZ In Sweep');
} });

/* ---- xfTapeOff — テープ剥がし: three strips of tape are slapped over the line, then peeled away one by one
   (each tape = a slightly tilted line as thick as its row, trimmed from both ends) */
jzReg('enter', 'xfTapeOff', { apply: function (m) {
    var g = axf_geo(m, null), fs = g.fs, seed = m.c.seed | 0, first = axf_dir(m, 511), k, H = axf_head(m);
    g = axf_geo(m, fs * 0.14);
    if (!axf_main(m, g) || axf_soft(m, g)) { axf_wipe(m, g, first, 'io3(P)'); return; }
    var ex = fs * 0.07, W = g.L + ex * 2, B = g.big, sc = m.ctx.sc, hot = axf_hot(m), cols = [hot, axf_pick(sc.accent2, sc.sub, sc.fg), hot], rows = [];
    for (k = 0; k < 3; k++) {
        rows.push({ d: (k % 2 ? -1 : 1) * first, v0: g.V0 + k * g.T / 3, v1: g.V0 + (k + 1) * g.T / 3, tilt: axf_rs(seed, k, 512) * ex * 0.7,
            E: H + 'var lay=o4(cl((P-' + jzN(k * 0.05) + ')/0.18)),off=io3(cl((P-' + jzN(0.3 + k * 0.13) + ')/0.42));' });
    }
    var T = axf_shape(m, 'JZ In Tapes');
    for (k = 2; k >= 0; k--) {       // the last tape lies on top
        var r = rows[k], ua = r.d > 0 ? g.U0 - ex : g.U1 + ex, vm = (r.v0 + r.v1) / 2, tg = jzGrp(T, 'tape ' + (k + 1));
        jzAddPath(tg, [axf_p2(g, ua, vm - r.tilt), axf_p2(g, ua + r.d * W, vm + r.tilt)], false);
        jzAddTrimPaths(tg, r.E + 'lay*100', r.E + 'Math.min(lay,off)*100');
        jzAddStroke(tg, cols[k], r.v1 - r.v0 + ex * 2);
    }
    axf_fxOp(T, H, '1');
    var S = axf_shape(m, 'JZ In Tape Matte', true);
    for (k = 0; k < 3; k++) {
        var q = rows[k], Ua = q.d > 0 ? g.U0 - ex : g.U1 + ex, v0 = k ? q.v0 - 0.4 : g.V0 - B, v1 = k < 2 ? q.v1 + 0.4 : g.V1 + B;
        var rg = axf_poly(S, 'row ' + (k + 1), g, Ua, g.vc, q.d > 0 ? axf_box(Ua - 2 * B, v0, Ua, v1) : axf_box(Ua, v0, Ua + 2 * B, v1));
        axf_move(rg, g, q.E, Ua, g.vc, jzN(q.d) + '*(lay>=1?' + jzN(B) + ':' + jzN(W) + '*lay-2)', '0');
    }
    axf_end(m, S, g);
} });

/* ---- xfScanner — スキャナ: a light bar passes down the line leaving only a hairline outline, then comes back up and fills it in */
jzReg('enter', 'xfScanner', { apply: function (m) {
    var L = m.L, g = axf_geo(m), fs = g.fs, main = axf_main(m, g) && axf_canMatte(m), H = axf_head(m), TT = jzN(g.T);   // (a copy of a matted layer would lose its matte)
    if (!main) { axf_half(L, g, 'v', -1, g.V0, H + 'time>=DL+IN?1e4:' + TT + '*io3(P)', 'JZ In Scan'); return; }
    var E = H + axf_GE(g) + 'var down=io3(P/0.46),up=io3((P-0.52)/0.48),bv=P<0.5?lp(V0,V1,down):lp(V1,V0,up),tl=' + jzN(fs * 0.22) + '*(P<0.5?-1:1);';
    var T = axf_shape(m, 'JZ In Scan Bar'), col = axf_hot(m), t = jzN(axf_lw(m, g) / 2), pad = jzN(fs * 0.2);
    axf_rect(T, 'bar', g, E, 'U0-' + pad, 'bv-' + t, 'U1+' + pad, 'bv+' + t, col);
    var tg = axf_rect(T, 'trail', g, E, 'U0-' + pad, 'Math.min(bv,bv+tl)', 'U1+' + pad, 'Math.max(bv,bv+tl)', col);
    jzGX(tg).property('ADBE Vector Group Opacity').setValue(18);
    axf_fxOp(T, E, 'cl(P*14)*(1-sm(0.9,1,P))');
    // the hairline outline left behind the bar: a stroke-only copy under the lyric, open above the bar
    var D = axf_twin(m, 'JZ In Scan Outline', true);
    axf_outline(m, D, fs, 0.02);
    jzSetExpr(jzXf(D, 'ADBE Opacity'), H + 'time>=DL&&time<DL+IN?value*0.8:0');
    axf_half(D, g, 'v', -1, g.V0, E + 'bv-V0', 'JZ In Scan Outline');
    // the fill comes back up with the bar
    axf_half(L, g, 'v', 1, g.V1, H + 'time>=DL+IN?1e4:' + TT + '*io3((P-0.52)/0.48)', 'JZ In Scan Fill');
} });

/* ---- xfRollerShutter — 巻き上げ: a slatted shutter rattles down over the line, then rolls up and uncovers it from the bottom */
jzReg('enter', 'xfRollerShutter', { apply: function (m) {
    var L = m.L, g = axf_geo(m), fs = g.fs, main = axf_main(m, g), H = axf_head(m), TT = jzN(g.T), j;
    if (!main) { axf_half(L, g, 'v', 1, g.V1, H + 'time>=DL+IN?1e4:' + TT + '*io3(P)', 'JZ In Shutter'); return; }
    var sc = m.ctx.sc, mg = fs * 0.1, pitch = Math.max(fs * 0.2, g.T / 14), t = Math.max(1.5 * m.u, fs * 0.018), hl = g.L / 2;
    var E = H + 'var ed=P<0.3?' + TT + '*oc(P/0.2):' + TT + '*(1-io3((P-0.3)/0.7));';
    // the shutter hangs from the top of the box (a layer mask cuts it there); its lower edge is the group's origin
    var T = axf_shape(m, 'JZ In Shutter'), root = jzGrp(T, 'shutter');
    var s1 = axf_sub(root, 'bottom bar');
    jzAddPath(s1, [axf_p2(g, -hl - mg * 1.6, -fs * 0.09), axf_p2(g, hl + mg * 1.6, -fs * 0.09), axf_p2(g, hl + mg * 1.6, 0), axf_p2(g, -hl - mg * 1.6, 0)], true);
    jzAddFill(s1, axf_pick(sc.fg));
    var s2 = axf_sub(root, 'slats');
    for (j = 1; j < 16 && j * pitch < g.T + pitch; j++) jzAddPath(s2, [axf_p2(g, -hl - mg, -j * pitch), axf_p2(g, hl + mg, -j * pitch)], false);
    jzAddStroke(s2, axf_pick(sc.bg, '#000000'), t, 40);
    var s3 = axf_sub(root, 'curtain');
    jzAddPath(s3, [axf_p2(g, -hl - mg, -g.T * 2), axf_p2(g, hl + mg, -g.T * 2), axf_p2(g, hl + mg, 0), axf_p2(g, -hl - mg, 0)], true);
    jzAddFill(s3, axf_hot(m));
    axf_move(root, g, E, g.uc, g.V0, '0', 'ed');
    axf_mBox(T, g, g.U0 - fs, g.V0 - 1, g.U1 + fs, g.V1 + fs, 'JZ In Shutter Box');
    axf_fxOp(T, E, 'ed<0.5?0:1');
    // the lyric is only there behind the shutter while it comes down
    axf_half(L, g, 'v', -1, g.V0, E + 'P<0.3?Math.max(0,ed-2):1e4', 'JZ In Behind Shutter');
} });

/* =====================================================================
   D. OUTLINE FIRST
   ===================================================================== */

/* ---- xfOutlineLead — 輪郭が先行: two wipes chase each other along the line: the first leaves only outlines, the second fills them in */
jzReg('enter', 'xfOutlineLead', { apply: function (m) {
    var L = m.L, g = axf_geo(m), fs = g.fs, dir = axf_dir(m, 601), main = axf_main(m, g), H = axf_head(m), LL = jzN(g.L);
    var Ua = dir > 0 ? g.U0 : g.U1, Ub = dir > 0 ? g.U1 : g.U0;
    var E = H + 'var e1=io3(P/0.7),e2=' + (main ? 'io3((P-0.3)/0.7)' : 'io3(P)') + ';';
    if (main) {
        var T = axf_shape(m, 'JZ In Lead Bars'), col = axf_hot(m), t = Math.max(3 * m.u, fs * 0.05) / 2, k;
        for (k = 0; k < 2; k++) {
            var hw = k ? t : t * 0.5, bg = axf_poly(T, k ? 'fill bar' : 'outline bar', g, Ua, g.vc, axf_box(Ua - hw, g.V0, Ua + hw, g.V1), col);
            axf_move(bg, g, E, Ua, g.vc, jzN(dir * g.L) + '*' + (k ? 'e2' : 'e1'), '0');
            axf_op(bg, E, k ? 'e2>0&&e2<1?100:0' : 'e1>0&&e1<1?70:0');
        }
        axf_fxOp(T, H, '1');
    }
    if (main && axf_canMatte(m)) {
        // the outlines between the two fronts: a stroke-only copy under the lyric (not for a matted layer: its copy would lose the matte)
        var D = axf_twin(m, 'JZ In Lead Outline', true);
        axf_outline(m, D, fs, 0.024);
        jzSetExpr(jzXf(D, 'ADBE Opacity'), E + 'time>=DL&&time<DL+IN&&e1>0&&e2<1?value:0');
        axf_half(D, g, 'u', -dir, Ua, E + 'e1>=1?1e4:' + LL + '*e1', 'JZ In Lead Front');
        axf_mode(axf_half(D, g, 'u', dir, Ub, E + LL + '*(1-e2)+0.5', 'JZ In Lead Back'), MaskMode.INTERSECT);
    }
    axf_half(L, g, 'u', -dir, Ua, E + 'time>=DL+IN?1e4:' + LL + '*e2', 'JZ In Lead Fill');
} });

/* ---- xfTraceFlood — なぞって流す: the outlines are traced on first, then a slanted flood of colour runs through and fills them
   (the trace = fine diagonal blinds closing on a stroke-only copy, as in strokeDraw: AE cannot trim a text outline) */
jzReg('enter', 'xfTraceFlood', { apply: function (m) {
    var L = m.L, g = axf_geo(m), fs = g.fs, dir = axf_dir(m, 611), k = 0.5, td = axf_td(L), main = axf_main(m, g), H = axf_head(m);
    if (!main) {
        if (td && td.applyStroke && td.strokeWidth > 0) {
            var vb = jzEffect(L, 'ADBE Venetian Blinds', 'JZ In Trace');
            jzEP(vb, 2, 35); jzEP(vb, 3, Math.max(3, fs * 0.2)); jzEP(vb, 4, 0);
            jzEX(vb, 1, m.HD + AXF_FNS + '(1-o2(P))*100');
        }
        if (td && td.applyFill !== false) jzAnimator(L, 'JZ In Flood', [['ADBE Text Fill Opacity', 0]], m.HD + AXF_FNS + '(1-sm(0.5,1,P))*100');
        return;
    }
    if (axf_soft(m, g)) { axf_wipe(m, g, dir, 'io3((P-0.46)/0.54)'); return; }
    var hv = g.T / 2, W = g.L + 2 * k * hv + 1, Ua = dir > 0 ? g.U0 : g.U1, w = fs * 0.09;
    var u = function (s) { return Ua + dir * s; };
    var E = H + 'var fl=io3((P-0.46)/0.54);', du = jzN(dir * W) + '*fl';
    var T = axf_shape(m, 'JZ In Flood Edge');
    var bg = axf_poly(T, 'edge', g, Ua, g.vc, [[u(0), g.V0], [u(w), g.V0], [u(-2 * k * hv + w), g.V1], [u(-2 * k * hv), g.V1]], axf_hot(m));
    axf_move(bg, g, E, Ua, g.vc, du, '0');
    axf_fxOp(T, E, 'fl<=0||fl>=1?0:Math.min(1,fl*8,(1-fl)*8)');
    var D = axf_twin(m, 'JZ In Trace Outline', true);
    axf_outline(m, D, fs, 0.022);
    jzSetExpr(jzXf(D, 'ADBE Opacity'), H + 'time>=DL&&time<DL+IN?value*(1-sm(0.84,1,P)):0');
    var vb2 = jzEffect(D, 'ADBE Venetian Blinds', 'JZ In Trace');
    jzEP(vb2, 2, 35); jzEP(vb2, 3, Math.max(3, fs * 0.2)); jzEP(vb2, 4, 0);
    jzEX(vb2, 1, H + '(1-o2(cl(P/0.58)))*100');
    var S = axf_shape(m, 'JZ In Flood Matte', true);
    var pg = axf_poly(S, 'flood', g, Ua, g.vc, [[u(-g.big), g.V0], [u(0), g.V0], [u(-2 * k * hv), g.V1], [u(-g.big), g.V1]]);
    axf_move(pg, g, E, Ua, g.vc, du, '0');
    axf_end(m, S, g);
} });
