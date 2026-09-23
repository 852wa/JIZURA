// ================================================================ pack exitB part 1 (AE port of src/11p_exitB.js)
// exits: peelOff crumpleOut tearOut scorchOut overexposeOut scanOut stripesOut halftoneOut eraserOut vacuumOut sandOut shredOut
//        dominoOut hingeOut
// holds: glowFlicker windGust dangle eqBounce flashBox glintSweep flipSwap shadowSway magnetJiggle typeRattle focusRack pluckString
// Exits run on PO (0 at the exit start, 1 at the cut end); holds scale their motion by AMT × fx.motion (browser motionK).
// Clips with a MOVING edge (peel line, burning front, stripes, halftone dots, eraser lanes) = a linked copy of the lyric ("twin":
// duplicate parented to L, takes L's final text style, visible only during the exit while L hides) seen through a shape-layer
// alpha track matte parented to L. Clips that stay in place in the layer (torn halves, shredder slot, scan regions) are masks on L
// itself (axis-aligned rects driven by mask expansion), so treatment copies of L keep them. Helper graphics (rims, scan line,
// eraser block, pins, dots, streaks) are shape layers parented to L (comp space when the browser draws them screen-fixed),
// marked jzNoGhost and alive only while they are needed.

// ---------------------------------------------------------------- shared helpers (xb1_*)
// easings not in JZ_FNS: o4 outQuart, io3 inOutCubic, ios inOutSine, sm smoothstep(a, b, x), win = the browser's win(p, o, spread)
var XB1_FNS = 'function o4(x){x=cl(x);return 1-Math.pow(1-x,4);}function io3(x){x=cl(x);return x<0.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;}' +
    'function ios(x){x=cl(x);return -(Math.cos(Math.PI*x)-1)/2;}function sm(a,b,x){x=cl((x-a)/(b-a));return x*x*(3-2*x);}' +
    'function win(p,o,s){return cl((p-o*s)/(1-s));}\n';
// hold strength: HK = AMT × motionK (0..1.6), HKK = min(1, HK)
var XB1_MK = 'var MK=Math.min(1.6,Math.max(0,M/0.7)),HK=AMT*MK,HKK=Math.min(1,HK);\n';
// the lyric's real font size (layer units): layouts fit the text after asking for a size, so m.size can differ from it
function xb1_sz(m) { var f = 0; try { f = jzFontSize(m.L); } catch (e) {} return f > 1 ? f : (m.size || 100); }
function xb1_hd(m) { return m.HD + XB1_FNS + 'var SZ=' + jzN(xb1_sz(m)) + ';\n'; }
function xb1_T(m) { var c = m.c; return { IN: Math.max(0.02, c.inDur || 0.3), DL: (m.o.mi || 0) * (c.stagger || 0.04), OS: c.dur - (c.outDur || 0), DUR: c.dur }; }
// measuring time: entrance done, hold barely started
function xb1_tm(m) { var t = xb1_T(m); return Math.max(0, Math.min(t.OS - 0.01, t.DL + t.IN + 0.03)); }
function xb1_n(x) { return x < 0 ? '(' + jzN(x) + ')' : jzN(x); }
function xb1_arr(a) { var s = [], i; for (i = 0; i < a.length; i++) s.push(jzN(a[i])); return '[' + s.join(',') + ']'; }
function xb1_isHex(c) { return typeof c === 'string' && c.charAt(0) === '#' && (c.length === 7 || c.length === 4); }
function xb1_pick(a, b, c) { if (xb1_isHex(a)) return a; if (xb1_isHex(b)) return b; if (xb1_isHex(c)) return c; return '#FFFFFF'; }
function xb1_col(m) {
    var sc = m.ctx.sc, bg = xb1_pick(sc.bg, '#000000');
    return { bg: bg, acc: xb1_pick(sc.accent, sc.fg), ink: xb1_pick(sc.ink, sc.fg), c0: jzTextColor(m.L), dark: jzLum(bg) < 0.5, sc: sc };
}
// the browser's J.h / J.r / J.rs (seeded choices match the web version)
function xb1_h(a, b, c, d, e) {
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
function xb1_r(a, b, c, d) { return xb1_h(a, b, c, d) / 4294967296; }
function xb1_rs(a, b, c, d) { return xb1_r(a, b, c, d) * 2 - 1; }
function xb1_cutBit(m, k) { return (xb1_h(m.c.seed | 0, k, 1991) & 1) === 1; }
function xb1_noise(x, seed) { var i = Math.floor(x), f = x - i, a = xb1_rs(seed, i, 7), b = xb1_rs(seed, i + 1, 7), u = f * f * (3 - 2 * f); return a + (b - a) * u; }
function xb1_ios(x) { x = jzClamp(x, 0, 1); return -(Math.cos(Math.PI * x) - 1) / 2; }
function xb1_cutN(m) { return Math.max(1, jzCount(String(m.c.text || ''))); }
function xb1_ord(m) { var N = xb1_cutN(m); return N > 1 ? jzClamp((m.o.mi || 0) / (N - 1), 0, 1) : 0; }
function xb1_isSp(ch) { return ch === ' ' || ch === '　' || ch === '\t'; }
function xb1_adv(ch) { var c = ch.charCodeAt(0); if (ch === ' ') return 0.3; if (c >= 0xFF61 && c <= 0xFF9F) return 0.5; return c < 0x2000 ? 0.56 : 1; }
function xb1_rect(L, t) { try { var r = L.sourceRectAtTime(t, false); if (r && r.width > 0 && r.height > 0) return r; } catch (e) {} return jzRect(L); }
// glyph geometry in the text layer's own space (textIndex order, spaces included):
//   G.g[i] {i, li, ci, nl (chars in the line), sp, k, x, y (centre), w}; G.r source rect; G.fs; G.vert (one glyph per line); G.n; G.nk
function xb1_geo(m) {
    var L = m.L, TP = L.property('ADBE Text Properties'), td = TP.property('ADBE Text Document').value, r = xb1_rect(L, xb1_tm(m)), i, j;
    var fs = td.fontSize || xb1_sz(m), text = String(td.text), trk = (td.tracking || 0) / 1000 * fs;
    var lines = text.split(/\r\n|\r|\n|\u0003/), nL = lines.length, lead = fs * 1.2;
    try { if (!td.autoLeading && td.leading > 0) lead = td.leading; } catch (e0) {}
    var just = 'c';
    try { if (td.justification === ParagraphJustification.LEFT_JUSTIFY) just = 'l'; else if (td.justification === ParagraphJustification.RIGHT_JUSTIFY) just = 'r'; } catch (e1) {}
    var G = { fs: fs, lead: lead, nL: nL, r: r, n: 0, nk: 0, g: [], vert: nL > 1 }, rows = [], maxW = 0;
    for (i = 0; i < nL; i++) {
        var cs = jzChars(lines[i]), ws = [], w = 0;
        for (j = 0; j < cs.length; j++) { var a = xb1_adv(cs[j]) * fs; ws.push(a); w += a + (j < cs.length - 1 ? trk : 0); }
        if (cs.length > 1) G.vert = false;
        rows.push({ cs: cs, ws: ws, w: w }); if (w > maxW) maxW = w;
    }
    var k = maxW > 0 ? r.width / maxW : 1; if (!(k > 0.5 && k < 2)) k = 1;
    var lh = r.height - (nL - 1) * lead; if (!(lh > fs * 0.5 && lh < fs * 1.6)) lh = fs * 0.95;
    var cx = r.left + r.width / 2;
    for (i = 0; i < nL; i++) {
        var R = rows[i], x = just === 'l' ? r.left : (just === 'r' ? r.left + r.width - R.w * k : cx - R.w * k / 2), y = r.top + lh / 2 + i * lead;
        for (j = 0; j < R.cs.length; j++) {
            var sp = xb1_isSp(R.cs[j]);
            G.g.push({ i: G.n, li: i, ci: j, nl: R.cs.length, sp: sp, k: sp ? -1 : G.nk, x: x + R.ws[j] * k / 2, y: y, w: Math.max(1, R.ws[j] * k) });
            x += (R.ws[j] + trk) * k; G.n++;
            if (!sp) G.nk++;
        }
    }
    G.cx = cx; G.cy = r.top + r.height / 2;
    return G;
}
function xb1_single(m, G) { return G.nk === 1 && xb1_cutN(m) > 1; }
// the lyric's main (opaque, filled) copy: helper graphics only go there
function xb1_main(m) {
    try {
        var td = m.L.property('ADBE Text Properties').property('ADBE Text Document').value;
        if (td.applyFill === false) return false;
        return jzXf(m.L, 'ADBE Opacity').value >= 85;
    } catch (e) { return true; }
}
// too many layers already (one glyph per layer with a long line, very long lines, crowded comps): no copies
function xb1_crowded(m, G) {
    if (G && (G.n > 60 || (xb1_single(m, G) && xb1_cutN(m) > 8))) return true;
    try { return m.ctx.comp.numLayers > 70; } catch (e) { return false; }
}
// static transform of a layer and conversions between its own space and comp space
function xb1_xf(L) { var tr = L.property('ADBE Transform Group'); return { a: tr.property('ADBE Anchor Point').value, p: tr.property('ADBE Position').value, s: tr.property('ADBE Scale').value, r: tr.property('ADBE Rotate Z').value }; }
function xb1_s0(L) { var s = xb1_xf(L).s, k = (Math.abs(s[0]) + Math.abs(s[1])) / 200; return k > 0.01 ? k : 1; }
function xb1_toComp(L, x, y) {
    var X = xb1_xf(L), rr = X.r * Math.PI / 180, ux = (x - X.a[0]) * X.s[0] / 100, uy = (y - X.a[1]) * X.s[1] / 100;
    return [X.p[0] + Math.cos(rr) * ux - Math.sin(rr) * uy, X.p[1] + Math.sin(rr) * ux + Math.cos(rr) * uy];
}
function xb1_fromComp(L, x, y) {
    var X = xb1_xf(L), rr = -X.r * Math.PI / 180, ux = x - X.p[0], uy = y - X.p[1];
    var vx = Math.cos(rr) * ux - Math.sin(rr) * uy, vy = Math.sin(rr) * ux + Math.cos(rr) * uy;
    return [X.a[0] + vx / ((X.s[0] / 100) || 1), X.a[1] + vy / ((X.s[1] / 100) || 1)];
}
// keep the point (px, py) of L's own space fixed while L is scaled by [fx, fy] and turned by rot degrees (expressions) -> parts.pos
function xb1_pivot(m, fx, fy, rot, px, py) {
    var X = xb1_xf(m.L), ux = (px - X.a[0]) * X.s[0] / 100, uy = (py - X.a[1]) * X.s[1] / 100;
    if (Math.abs(ux) + Math.abs(uy) < 0.5) return '';
    var rr = X.r * Math.PI / 180, vx = Math.cos(rr) * ux - Math.sin(rr) * uy, vy = Math.sin(rr) * ux + Math.cos(rr) * uy;
    return 'var xp_a=(' + jzN(X.r) + '+(' + rot + '))*Math.PI/180,xp_c=Math.cos(xp_a),xp_s=Math.sin(xp_a),xp_x=(' + fx + ')*' + jzN(ux) + ',xp_y=(' + fy + ')*' + jzN(uy) + ';' +
        'd=[d[0]+' + jzN(vx) + '-(xp_c*xp_x-xp_s*xp_y),d[1]+' + jzN(vy) + '-(xp_s*xp_x+xp_c*xp_y)];';
}
// rigid motion of L: extra rotation rotEx (deg) about the comp point Q, then a screen offset [ox, oy] (expressions)
function xb1_rigid(m, pre, rotEx, Q, off) {
    m.parts.rot.push(pre + 'r+=(' + rotEx + ');');
    m.parts.pos.push(pre + 'var xr_a=(' + rotEx + ')*Math.PI/180,xr_c=Math.cos(xr_a),xr_s=Math.sin(xr_a),xr_x=value[0]-' + xb1_n(Q[0]) + ',xr_y=value[1]-' + xb1_n(Q[1]) + ';' +
        'd=[d[0]+xr_c*xr_x-xr_s*xr_y-xr_x+(' + off[0] + '),d[1]+xr_s*xr_x+xr_c*xr_y-xr_y+(' + off[1] + ')];');
}
function xb1_matted(L) { try { return !!L.trackMatteType && L.trackMatteType !== TrackMatteType.NO_TRACK_MATTE; } catch (e) { return false; } }
// the layer new helper layers go above (above the lyric's own track matte when it has one)
function xb1_top(m) { var L = m.L; if (xb1_matted(L)) { try { return m.ctx.comp.layer(L.index - 1); } catch (e) {} } return L; }
function xb1_live(m, Lx, hold) { if (hold) return; var t = xb1_T(m); try { if (t.OS - 0.05 > Lx.inPoint) Lx.inPoint = t.OS - 0.05; } catch (e) {} }
// linked copy of the lyric: parented to L, takes its final text style, opacity = value × fac (expression, header + pre)
function xb1_twin(m, tag, pre, fac, above, hold) {
    var L = m.L, top = above || xb1_top(m), D = L.duplicate(), i, mns = ['ADBE Position', 'ADBE Scale', 'ADBE Rotate Z', 'ADBE Opacity', 'ADBE Anchor Point'];
    try { D.name = String(L.name).substr(0, 20) + ' ' + tag; } catch (e0) {}
    var tr = D.property('ADBE Transform Group');
    for (i = 0; i < mns.length; i++) { try { if (tr.property(mns[i]).expression) tr.property(mns[i]).expression = ''; } catch (e1) {} }
    if (xb1_matted(D) && typeof D.setTrackMatte !== 'function') { try { D.trackMatteType = TrackMatteType.NO_TRACK_MATTE; } catch (e2) {} }
    D.parent = L;
    tr.property('ADBE Scale').setValue([100, 100]); tr.property('ADBE Rotate Z').setValue(0);
    jzSetExpr(tr.property('ADBE Position'), 'parent.transform.anchorPoint');
    jzSetExpr(tr.property('ADBE Opacity'), xb1_hd(m) + (hold ? XB1_MK : '') + (pre || '') + 'value*(' + fac + ')');
    try { D.property('ADBE Text Properties').property('ADBE Text Document').expression = 'parent.text.sourceText.style'; } catch (e3) {}
    xb1_live(m, D, hold);
    try { D.moveBefore(top); } catch (e4) {}
    return D;
}
function xb1_reset(S) {
    var tr = S.property('ADBE Transform Group');
    tr.property('ADBE Anchor Point').setValue([0, 0]); tr.property('ADBE Position').setValue([0, 0]);
    tr.property('ADBE Scale').setValue([100, 100]); tr.property('ADBE Rotate Z').setValue(0);
}
// shape layer in L's own space (parented to L): above `above` (default: above L / its matte) or right below L
function xb1_shape(m, name, above, below, hold) {
    var L = m.L, S = m.ctx.comp.layers.addShape();
    try { S.name = name; } catch (e0) {}
    try { if (below) S.moveAfter(L); else S.moveBefore(above || xb1_top(m)); } catch (e1) {}
    S.parent = L; xb1_reset(S); xb1_live(m, S, hold); jzNoGhost(S);
    return S;
}
// shape layer in comp space (graphics the browser draws fixed on the screen)
function xb1_cshape(m, name, above, hold) {
    var S = m.ctx.comp.layers.addShape();
    try { S.name = name; } catch (e0) {}
    try { S.moveBefore(above || xb1_top(m)); } catch (e1) {}
    xb1_reset(S); xb1_live(m, S, hold); jzNoGhost(S);
    return S;
}
// alpha (or inverted) track matte shape layer for the twin T, in L's space, right above T
function xb1_matteShape(m, T, name, inv, hold) {
    var S = m.ctx.comp.layers.addShape(), tp = inv ? TrackMatteType.ALPHA_INVERTED : TrackMatteType.ALPHA, ok = false;
    try { S.name = name; } catch (e0) {}
    try { S.moveBefore(T); } catch (e1) {}
    S.parent = m.L; xb1_reset(S); xb1_live(m, S, hold);
    if (typeof T.setTrackMatte === 'function') { try { T.setTrackMatte(S, tp); ok = true; } catch (e2) { ok = false; } }
    if (!ok) { try { T.trackMatteType = tp; } catch (e3) { jzWarn('xb1 matte: ' + e3.toString()); } }
    try { S.enabled = false; } catch (e4) {}
    return S;
}
// masks (layer space). 'sub' = subtract; 'add' = add when it is the layer's first active mask, else intersect
function xb1_nMasks(L) {
    var n = 0, i;
    try { var mp = L.property('ADBE Mask Parade'); for (i = 1; i <= mp.numProperties; i++) if (mp.property(i).maskMode !== MaskMode.NONE) n++; } catch (e) {}
    return n;
}
function xb1_mask(Lx, pts, mode, name) {
    var prior = xb1_nMasks(Lx), mk = Lx.property('ADBE Mask Parade').addProperty('ADBE Mask Atom'), sh = new Shape();
    sh.vertices = pts; sh.closed = true; mk.property('ADBE Mask Shape').setValue(sh);
    try { mk.maskMode = mode === 'sub' ? MaskMode.SUBTRACT : (prior ? MaskMode.INTERSECT : MaskMode.ADD); } catch (e) {}
    try { if (name) mk.name = name; } catch (e2) {}
    return mk;
}
function xb1_rpts(x0, y0, x1, y1) { return [[x1, y0], [x1, y1], [x0, y1], [x0, y0]]; }
// axis-aligned wipe on L (fallback without copies): the part behind an edge moving along +axis (sg 1) or -axis (sg -1) is removed
function xb1_wipe(m, r, axis, sg, prog, HD, feather) {
    var sz = xb1_sz(m), big = (r.width + r.height) * 4 + sz * 10, x0 = r.left - sz * 0.3, x1 = r.left + r.width + sz * 0.3, y0 = r.top - sz * 0.3, y1 = r.top + r.height + sz * 0.3, pts, ext;
    if (axis === 'x') { ext = x1 - x0; pts = sg > 0 ? xb1_rpts(x0 - big, y0 - big, x0, y1 + big) : xb1_rpts(x1, y0 - big, x1 + big, y1 + big); }
    else { ext = y1 - y0; pts = sg > 0 ? xb1_rpts(x0 - big, y0 - big, x1 + big, y0) : xb1_rpts(x0 - big, y1, x1 + big, y1 + big); }
    var mk = xb1_mask(m.L, pts, 'sub', 'JZ Out Wipe');
    jzSetExpr(mk.property('ADBE Mask Offset'), HD + 'Math.max(0,(' + prog + '))*' + jzN(ext + (feather || 0)));
    jzSetExpr(mk.property('ADBE Mask Opacity'), HD + '(' + prog + ')>0?100:0');
    if (feather) mk.property('ADBE Mask Feather').setValue([feather, feather]);
    return mk;
}
// L hides while its copies play the exit (PO >= 0.998: everything is gone, like the browser's safety net)
function xb1_hideL(m, pre, cond) { m.parts.op.push(XB1_FNS + (pre || '') + 'f*=(' + (cond || 'PO>0') + ')||PO>=0.998?0:1;'); }
function xb1_safe(m, pre, fac) { m.parts.op.push(XB1_FNS + (pre || '') + 'f*=PO>=0.998?0:(' + (fac || '1') + ');'); }

/* ================================================================ EXITS: paper */

/* ---- peelOff — ステッカー剥がし: a fold line crosses the text diagonally; the peeled part is its mirror image (the sticker's back,
   lifted with a shadow) folded over the stuck part; at the end the flap flies off. Stuck part and flap = twins through half-plane
   mattes that ride with the fold line; the flap is reflected about the fold line (rotation 2α · scale (1, −1)). */
jzReg('exit', 'peelOff', { apply: function (m) {
    var L = m.L, G = xb1_geo(m), r = G.r, sz = xb1_sz(m), C = xb1_col(m), i;
    var v = (xb1_h(m.c.seed | 0, 311) >>> 5) & 3, dx = [0.83, -0.83, 0.83, -0.83][v], dy = [0.56, 0.56, -0.56, -0.56][v], nl = Math.sqrt(dx * dx + dy * dy);
    dx /= nl; dy /= nl;
    var tx = -dy, ty = dx, pad = sz * 0.06, bx0 = r.left - pad, by0 = r.top - pad, bx1 = r.left + r.width + pad, by1 = r.top + r.height + pad;
    var cs = [[bx0, by0], [bx1, by0], [bx0, by1], [bx1, by1]], u0 = 1e9, u1 = -1e9;
    for (i = 0; i < 4; i++) { var uu = cs[i][0] * dx + cs[i][1] * dy; if (uu < u0) u0 = uu; if (uu > u1) u1 = uu; }
    var tc = (bx0 + bx1) / 2 * tx + (by0 + by1) / 2 * ty;
    var ev = 'var pq=' + (xb1_single(m, G) ? 'win(PO,' + jzN(xb1_ord(m)) + ',0.4)' : 'PO') + ',pf=cl(pq/0.74),pfly=cl((pq-0.74)/0.26),' +
        'ps=' + jzN(u0) + '+' + jzN(u1 - u0) + '*(0.1*pf+0.9*pf*pf*(3-2*pf)),px0=ps*' + jzN(dx) + '+' + jzN(tc * tx) + ',py0=ps*' + jzN(dy) + '+' + jzN(tc * ty) + ';';
    var HD = xb1_hd(m) + ev;
    if (xb1_crowded(m, G)) {       // no copies: a straight wipe along the fold's main axis
        var ax = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
        xb1_wipe(m, r, ax, ax === 'x' ? (dx > 0 ? 1 : -1) : (dy > 0 ? 1 : -1), 'pf*1.02', HD, 0);
        xb1_safe(m, ev, 'pf>=1?0:1');
        return;
    }
    xb1_hideL(m, ev, 'pq>0');
    var BIG = (r.width + r.height) * 3 + sz * 12, ang = Math.atan2(dy, dx) * 180 / Math.PI;
    var half = function (S, name) {
        var g = jzGrp(S, name); jzAddRect(g, BIG, BIG, 0); jzAddFill(g, '#FFFFFF');
        jzGX(g).property('ADBE Vector Rotation').setValue(ang);
        jzSetExpr(jzGX(g).property('ADBE Vector Position'), HD + '[px0+' + jzN(BIG / 2 * dx) + ',py0+' + jzN(BIG / 2 * dy) + ']');
    };
    var S = xb1_twin(m, 'JZ Out Stuck', ev, 'pq>0&&pf<1?1:0');
    var MS = xb1_matteShape(m, S, 'JZ Out Stuck Matte');
    half(MS, 'stuck');
    var F = xb1_twin(m, 'JZ Out Flap', ev, 'pq>0?1-iq(pfly):0', MS);
    jzNoGhost(F);                  // the browser draws the flap on the main pass only
    var MF = xb1_matteShape(m, F, 'JZ Out Flap Matte');
    var gA = jzGrp(MF, 'free'); jzAddRect(gA, BIG * 2, BIG * 2, 0, (bx0 + bx1) / 2, (by0 + by1) / 2); jzAddFill(gA, '#FFFFFF');
    jzSetExpr(jzGX(gA).property('ADBE Vector Group Opacity'), HD + 'pfly>0?100:0');
    half(MF, 'flap');
    // mirror about the fold line through (px0, py0), then fly off along the peel direction and up
    var al = Math.atan2(ty, tx), tr = F.property('ADBE Transform Group');
    jzSetExpr(tr.property('ADBE Anchor Point'), HD + '[px0,py0]');
    jzSetExpr(tr.property('ADBE Position'), HD + 'var fm=SZ*2.2*pfly*pfly;[px0+' + jzN(dx) + '*fm,py0+' + jzN(dy) + '*fm-SZ*1.2*pfly]');
    tr.property('ADBE Rotate Z').setValue(al * 360 / Math.PI);
    tr.property('ADBE Scale').setValue([100, -100]);
    var back = jzMixHex(jzMixHex(C.c0, C.bg, 0.5), C.acc, 0.18);
    jzAnimator(F, 'JZ Out Back', [['ADBE Text Fill Color', jzHex(back)], ['ADBE Text Stroke Color', jzHex(back)]], '100');
    // lift shadow: the wanted screen offset w is mirrored into the flap's own space
    var c2 = Math.cos(2 * al), s2 = Math.sin(2 * al), wx = dx, wy = dy + 1, vx = c2 * wx + s2 * wy, vy = s2 * wx - c2 * wy;
    var ds = jzEffect(F, 'ADBE Drop Shadow', 'JZ Out Lift');
    jzEP(ds, 1, jzHex('#000000')); jzEP(ds, 2, (C.dark ? 0.5 : 0.28) * 255); jzEP(ds, 3, Math.atan2(vx, -vy) * 180 / Math.PI); jzEP(ds, 5, sz * 0.12);
    jzEX(ds, 4, HD + 'SZ*(0.05+0.1*pf)*' + jzN(Math.sqrt(wx * wx + wy * wy)));
} });

/* ---- crumpleOut — 丸めて捨てる: three quick squeezes gather the glyphs into a creased ball (per-glyph gather / turn / squash /
   skew, a little turbulence), then the ball is tossed away spinning on a parabola (layer rotation about the box centre + offset) */
jzReg('exit', 'crumpleOut', { apply: function (m) {
    var L = m.L, G = xb1_geo(m), sz = xb1_sz(m), C = xb1_col(m), W = m.W, H = m.H, i, cx = G.cx, cy = G.cy;
    var dir = xb1_cutBit(m, 21) ? 1 : -1;
    var ev = 'var cg1=ob(cl(PO/0.15),1.6),cg2=ob(cl((PO-0.17)/0.15),1.6),cg3=ob(cl((PO-0.34)/0.15),1.6),' +
        'cr=Math.max(0,Math.min(1.08,0.45*cg1+0.3*cg2+0.25*cg3)),cr1=Math.min(1,cr),ck=1-0.93*cr1,cv=cl((PO-0.5)/0.5),' +
        'csp=' + dir + '*(cr*25+620*cv*cv),ctx=' + jzN(dir * W * 0.42) + '*cv,cty=' + jzN(-H * 0.8) + '*cv+' + jzN(H * 1.75) + '*cv*cv;';
    var HD = xb1_hd(m) + ev;
    xb1_safe(m, ev, '1-sm(0.88,1,PO)');
    if (xb1_single(m, G)) {       // one glyph per layer: every glyph is pulled towards the screen centre, turned about it and tossed
        var mi = m.o.mi || 0, cs = m.c.seed | 0, P0 = xb1_toComp(L, cx, cy), s0 = xb1_s0(L);
        var jx = xb1_rs(cs, mi, 23) * sz * s0 * 0.25, jy = xb1_rs(cs, mi, 24) * sz * s0 * 0.25, rr = xb1_rs(cs, mi, 22) * 150, sk = xb1_rs(cs, mi, 25);
        m.parts.rot.push(XB1_FNS + ev + 'r+=csp+' + jzN(rr) + '*cr;');
        m.parts.sc.push(XB1_FNS + ev + 'f=[f[0]*(1-0.5*cr1),f[1]*(1-0.5*cr1)];');
        m.parts.pos.push(XB1_FNS + ev + xb1_pivot(m, '(1-0.5*cr1)', '(1-0.5*cr1)', 'csp+' + jzN(rr) + '*cr', cx, cy) +
            'var cxr=' + jzN(P0[0] - W / 2) + '*ck+' + jzN(jx) + '*cr,cyr=' + jzN(P0[1] - H / 2) + '*ck+' + jzN(jy) + '*cr,ca=csp*Math.PI/180;' +
            'd=[d[0]+' + jzN(W / 2 - P0[0]) + '+Math.cos(ca)*cxr-Math.sin(ca)*cyr+ctx,d[1]+' + jzN(H / 2 - P0[1]) + '+Math.sin(ca)*cxr+Math.cos(ca)*cyr+cty];');
        jzAnimator(L, 'JZ Out Crease', [['ADBE Text Skew', 22]], HD + jzN(sk) + '*cr*100');
        return;
    }
    m.parts.rot.push(XB1_FNS + ev + 'r+=csp;');
    m.parts.pos.push(XB1_FNS + ev + xb1_pivot(m, '1', '1', 'csp', cx, cy) + 'd=[d[0]+ctx,d[1]+cty];');
    var PX = [], PY = [], K = sz;
    for (i = 0; i < G.n; i++) { PX.push(G.g[i].x - cx); PY.push(G.g[i].y - cy); K = Math.max(K, Math.abs(PX[i]) + sz * 0.3, Math.abs(PY[i]) + sz * 0.3); }
    var q = HD + 'var i=textIndex-1,PX=' + xb1_arr(PX) + ',PY=' + xb1_arr(PY) + ',px=PX[i]||0,py=PY[i]||0,' +
        'jx=(hh(textIndex*26+SD)*2-1)*SZ*0.22,jy=(hh(textIndex*27+SD)*2-1)*SZ*0.22,r1=hh(textIndex*28+SD),r2=hh(textIndex*29+SD);';
    jzAnimator(L, 'JZ Out Gather', [['ADBE Text Position 3D', [K, K, 0]]], q + '[(px*(ck-1)+jx*cr)/' + jzN(K) + '*100,(py*(ck-1)+jy*cr)/' + jzN(K) + '*100,0]');
    jzAnimator(L, 'JZ Out Turn', [['ADBE Text Rotation', 170]], q + '(hh(textIndex*30+SD)*2-1)*cr*100');
    jzAnimator(L, 'JZ Out Crease', [['ADBE Text Skew', 26]], q + '(hh(textIndex*31+SD)*2-1)*cr*100');
    jzAnimator(L, 'JZ Out Squash', [['ADBE Text Scale 3D', [0, 0, 100]]], q + 'var s=1-0.55*cr1,sx=s*(1-0.35*r1*cr),sy=s*(1-0.35*r2*cr);[(1-sx)*100,(1-sy)*100,0]');
    jzAnimator(L, 'JZ Out Shade', [['ADBE Text Fill Color', jzHex(C.bg)]], q + 'r1<0.45?30*cr1:0');
    var td = jzEffect(L, 'ADBE Turbulent Displace', 'JZ Out Crumple');
    jzEP(td, 1, 1); jzEP(td, 3, Math.max(8, sz * 0.3)); jzEP(td, 5, 2); jzEP(td, 6, (m.c.seed | 0) % 360);
    jzEX(td, 2, HD + 'SZ*0.1*cr1');
} });

/* ---- tearOut — 破り捨て: torn in two along a jagged line; the halves turn apart about the tear's far end and fall away.
   Half A = L with a static polygon mask (its motion = layer rotation about the pivot + offset); half B = a twin with the other
   polygon, parented to L with the relative motion A⁻¹·B. Single-glyph layouts share one tear through the screen centre. */
jzReg('exit', 'tearOut', { apply: function (m) {
    var L = m.L, G = xb1_geo(m), r = G.r, sz = xb1_sz(m), W = m.W, H = m.H, vert = G.vert, s0 = xb1_s0(L), X = xb1_xf(L), cs = m.c.seed | 0, i, k;
    var ev = 'var to=oc(cl(PO/0.32)),tv=cl((PO-0.26)/0.74),tth=7*to+40*tv*tv,tfa=' + jzN(H * 1.1) + '*tv*tv,tsi=' + jzN(sz * s0 * 1.6) + '*tv;';
    var HD = xb1_hd(m) + ev;
    var rotOf = function (sg) { return (vert ? -sg : sg) + '*tth'; };
    var offOf = function (sg) {
        return vert ? ['(' + jzN(sg * 0.35 - 0.4) + ')*tsi', 'tfa+' + jzN(sg * sz * s0 * 0.3) + '*tv'] : [jzN(sg) + '*tsi', 'tfa*' + (sg < 0 ? '1' : '0.85')];
    };
    var polyA = [], polyB = [], piv, side = 0, big = sz * 4;
    if (xb1_single(m, G) && !vert) {
        var pc = [xb1_toComp(L, r.left, r.top), xb1_toComp(L, r.left + r.width, r.top), xb1_toComp(L, r.left, r.top + r.height), xb1_toComp(L, r.left + r.width, r.top + r.height)];
        var cx0 = 1e9, cx1 = -1e9, cy0 = 1e9, cy1 = -1e9, pd = sz * s0 * 0.3;
        for (i = 0; i < 4; i++) { cx0 = Math.min(cx0, pc[i][0]); cx1 = Math.max(cx1, pc[i][0]); cy0 = Math.min(cy0, pc[i][1]); cy1 = Math.max(cy1, pc[i][1]); }
        cy0 -= pd; cy1 += pd;
        var K1 = jzClamp(Math.ceil((cy1 - cy0) / (sz * s0 * 0.08)), 4, 40), jD = [], jx0 = 1e9, jx1 = -1e9;
        for (k = 0; k <= K1; k++) {
            var Y = cy0 + (cy1 - cy0) * k / K1, Xj = W / 2 + xb1_noise(Y / (H * 0.035), cs + 5) * H * 0.02 + xb1_rs(cs, Math.round(Y / (H * 0.008)), 331) * H * 0.006;
            jD.push([Xj, Y]); jx0 = Math.min(jx0, Xj); jx1 = Math.max(jx1, Xj);
        }
        if (cx1 < jx0) side = -1; else if (cx0 > jx1) side = 1;
        polyA.push(xb1_fromComp(L, -W, cy0 - pd)); polyA.push(xb1_fromComp(L, jD[0][0], cy0 - pd));
        polyB.push(xb1_fromComp(L, 2 * W, cy0 - pd)); polyB.push(xb1_fromComp(L, jD[0][0], cy0 - pd));
        for (k = 0; k <= K1; k++) { var pl = xb1_fromComp(L, jD[k][0], jD[k][1]); polyA.push(pl); polyB.push(pl); }
        polyA.push(xb1_fromComp(L, jD[K1][0], cy1 + pd)); polyA.push(xb1_fromComp(L, -W, cy1 + pd));
        polyB.push(xb1_fromComp(L, jD[K1][0], cy1 + pd)); polyB.push(xb1_fromComp(L, 2 * W, cy1 + pd));
        piv = xb1_fromComp(L, W / 2, H * 0.62);
    } else {
        var pad = sz * 0.3, bx0 = r.left - pad, by0 = r.top - pad, bx1 = r.left + r.width + pad, by1 = r.top + r.height + pad;
        var mid = vert ? (by0 + by1) / 2 : (bx0 + bx1) / 2, a0 = vert ? bx0 : by0, a1 = vert ? bx1 : by1;
        var K = jzClamp(Math.ceil((a1 - a0) / (sz * 0.08)), 6, 48), jag = [];
        for (k = 0; k <= K; k++) {
            var t = a0 + (a1 - a0) * k / K, off = xb1_rs(cs, k, 331) * sz * 0.05 + xb1_noise(k * 0.35, cs + 5) * sz * 0.16;
            jag.push(vert ? [t, mid + off] : [mid + off, t]);
        }
        if (vert) {
            polyA.push([bx0 - big, by0 - big]); polyA.push([bx0 - big, jag[0][1]]);
            polyB.push([bx0 - big, by1 + big]); polyB.push([bx0 - big, jag[0][1]]);
        } else {
            polyA.push([bx0 - big, by0 - big]); polyA.push([jag[0][0], by0 - big]);
            polyB.push([bx1 + big, by0 - big]); polyB.push([jag[0][0], by0 - big]);
        }
        for (k = 0; k <= K; k++) { polyA.push(jag[k]); polyB.push(jag[k]); }
        if (vert) {
            polyA.push([bx1 + big, jag[K][1]]); polyA.push([bx1 + big, by0 - big]);
            polyB.push([bx1 + big, jag[K][1]]); polyB.push([bx1 + big, by1 + big]);
        } else {
            polyA.push([jag[K][0], by1 + big]); polyA.push([bx0 - big, by1 + big]);
            polyB.push([jag[K][0], by1 + big]); polyB.push([bx1 + big, by1 + big]);
        }
        piv = jag[K];                    // the tear starts at the far end and opens from the near one
    }
    var Q = xb1_toComp(L, piv[0], piv[1]);
    xb1_safe(m, ev, '1-sm(0.82,1,PO)');
    if (side || xb1_crowded(m, G)) { xb1_rigid(m, XB1_FNS + ev, rotOf(side || -1), Q, offOf(side || -1)); return; }
    var B = xb1_twin(m, 'JZ Out Torn B', ev, 'PO>0?1-sm(0.82,1,PO):0');
    var mA = xb1_mask(L, polyA, 'add', 'JZ Out Torn A');
    jzSetExpr(mA.property('ADBE Mask Offset'), HD + 'PO>0?0:1e4');
    xb1_rigid(m, XB1_FNS + ev, rotOf(-1), Q, offOf(-1));
    xb1_mask(B, polyB, 'add', 'JZ Out Torn B');
    // B relative to A (both turn about the pivot): rotation rotB - rotA, offset Rot(-(rotA + r0)) (TB - TA) / s0
    var tr = B.property('ADBE Transform Group'), oA = offOf(-1), oB = offOf(1);
    tr.property('ADBE Anchor Point').setValue([piv[0], piv[1]]);
    jzSetExpr(tr.property('ADBE Rotate Z'), HD + '(' + rotOf(1) + ')-(' + rotOf(-1) + ')');
    jzSetExpr(tr.property('ADBE Position'), HD + 'var ra=-((' + rotOf(-1) + ')+' + jzN(X.r) + ')*Math.PI/180,wx=((' + oB[0] + ')-(' + oA[0] + '))/' + jzN(s0) + ',wy=((' + oB[1] + ')-(' + oA[1] + '))/' + jzN(s0) + ';' +
        '[' + jzN(piv[0]) + '+Math.cos(ra)*wx-Math.sin(ra)*wy,' + jzN(piv[1]) + '+Math.sin(ra)*wx+Math.cos(ra)*wy]');
} });

/* ---- scorchOut — 焦げて消える: a burning front with a rough edge eats across the text: glyphs next to the front glow in a heat
   colour, a glowing accent rim with a soot line rides on the edge, embers drift back and up. Unburnt part = twin through a
   rough-edged polygon matte moving with the front. */
jzReg('exit', 'scorchOut', { apply: function (m) {
    var L = m.L, G = xb1_geo(m), r = G.r, sz = xb1_sz(m), C = xb1_col(m), W = m.W, H = m.H, s0 = xb1_s0(L), cs = m.c.seed | 0, i, k;
    var single = xb1_single(m, G), vert = G.vert, seed = single ? cs : cs + (m.o.mi || 0) * 101;
    var U = single ? Math.min(W, H) * 0.16 / s0 : sz, dx = vert ? 0.22 : 1, dy = vert ? 1 : 0.22, nl = Math.sqrt(dx * dx + dy * dy);
    dx /= nl; dy /= nl;
    if (xb1_cutBit(m, 31)) { dx = -dx; dy = -dy; }
    var tx = -dy, ty = dx, pad = sz * 0.2, bx0 = r.left - pad, by0 = r.top - pad, bx1 = r.left + r.width + pad, by1 = r.top + r.height + pad;
    var cn = [[bx0, by0], [bx1, by0], [bx0, by1], [bx1, by1]], u0 = 1e9, u1 = -1e9, w0 = 1e9, w1 = -1e9;
    for (i = 0; i < 4; i++) {
        var uu = cn[i][0] * dx + cn[i][1] * dy, ww = cn[i][0] * tx + cn[i][1] * ty;
        u0 = Math.min(u0, uu); u1 = Math.max(u1, uu); w0 = Math.min(w0, ww); w1 = Math.max(w1, ww);
    }
    if (single) {                    // one screen-wide front for every glyph layer
        var sc4 = [[0, 0], [W, 0], [0, H], [W, H]]; u0 = 1e9; u1 = -1e9;
        for (i = 0; i < 4; i++) { var pl = xb1_fromComp(L, sc4[i][0], sc4[i][1]), us = pl[0] * dx + pl[1] * dy; u0 = Math.min(u0, us); u1 = Math.max(u1, us); }
    }
    var rough = U * 0.2, band = U * 0.4, sA = u0 - rough * 1.3, sB = u1 + rough * 1.3 + band;
    var ev = 'var ss=' + jzN(sA) + '+' + jzN(sB - sA) + '*ios(PO);', HD = xb1_hd(m) + ev, heat = jzMixHex(C.c0, C.acc, 0.85);
    var UG = [];
    for (i = 0; i < G.n; i++) UG.push(G.g[i].x * dx + G.g[i].y * dy);
    var hq = HD + 'var UG=' + xb1_arr(UG) + ',z=((UG[textIndex-1]||0)-ss+' + jzN(U * 0.35) + ')/' + jzN(band + U * 0.7) + ';PO>0&&z>-0.25?90*(1-sm(0,1,z)):0';
    if (xb1_crowded(m, G)) {
        var ax = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y', sg = ax === 'x' ? (dx > 0 ? 1 : -1) : (dy > 0 ? 1 : -1);
        xb1_wipe(m, r, ax, sg, 'ios(PO)*1.08', HD, sz * 0.15);
        jzAnimator(L, 'JZ Out Heat', [['ADBE Text Fill Color', jzHex(heat)]], hq);
        xb1_safe(m, ev, '1');
        return;
    }
    var pt = function (u, w) { return [dx * u + tx * w, dy * u + ty * w]; };
    var FAR = (sB - sA) + U * 6, wa = w0 - U * 0.5, wb = w1 + U * 0.5, Kn = jzClamp(Math.ceil((wb - wa) / (U * 0.07)), 6, 60), edge = [];
    for (k = 0; k <= Kn; k++) {
        var w = wa + (wb - wa) * k / Kn;
        edge.push([rough * (0.75 * xb1_noise(w / U * 2.4, seed) + 0.3 * xb1_noise(w / U * 8, seed + 3)), w]);
    }
    xb1_hideL(m, ev, 'PO>0');
    var T = xb1_twin(m, 'JZ Out Unburnt', ev, 'PO>0?1:0');
    jzAnimator(T, 'JZ Out Heat', [['ADBE Text Fill Color', jzHex(heat)], ['ADBE Text Stroke Color', jzHex(heat)]], hq);
    var M = xb1_matteShape(m, T, 'JZ Out Burn Matte'), g = jzGrp(M, 'unburnt'), poly = [];
    for (k = 0; k <= Kn; k++) poly.push(pt(edge[k][0], edge[k][1]));
    poly.push(pt(FAR, wb)); poly.push(pt(FAR, wa));
    jzAddPath(g, poly, true); jzAddFill(g, '#FFFFFF');
    var at = HD + '[ss*' + jzN(dx) + ',ss*' + jzN(dy) + ']';
    jzSetExpr(jzGX(g).property('ADBE Vector Position'), at);
    if (!xb1_main(m)) return;
    // embers (on top), the glowing rim and the soot line behind it
    var S = xb1_shape(m, 'JZ Out Scorch', M), lw = Math.max(1.5 * m.u / s0, U * 0.03), soot = C.dark ? jzMixHex(C.bg, C.acc, 0.25) : jzMixHex(C.bg, '#000000', 0.45);
    var nE = single ? 5 : 14, j;
    for (j = 0; j < nE; j++) {
        var t0 = xb1_r(seed, j, 341) * 0.85, we = w0 + (w1 - w0) * xb1_r(seed, j, 342);
        var oe = rough * (0.75 * xb1_noise(we / U * 2.4, seed) + 0.3 * xb1_noise(we / U * 8, seed + 3));
        var p0 = pt(sA + (sB - sA) * xb1_ios(t0) + oe - U * 0.05, we), ag = 'var ag=(PO-' + xb1_n(t0) + ')/0.28,ac=cl(ag);';
        var ge = jzGrp(S, 'ember ' + (j + 1)), el = jzAddEllipse(ge, 4, 4); jzAddFill(ge, C.acc);
        jzSetExpr(el.property('ADBE Vector Ellipse Size'), HD + ag + 'var R=ag>0&&ag<1?Math.max(0.8,' + jzN(U * 0.028) + '*(1-ag)):0;[2*R,2*R]');
        jzSetExpr(jzGX(ge).property('ADBE Vector Position'), HD + ag + '[' + jzN(p0[0]) + '-' + xb1_n(dx * U * 0.3) + '*ac+Math.sin(ac*7+' + j + ')*' + jzN(U * 0.06) + ',' + jzN(p0[1]) + '-' + xb1_n(dy * U * 0.3) + '*ac-' + xb1_n(U * 0.9) + '*ac]');
        jzSetExpr(jzGX(ge).property('ADBE Vector Group Opacity'), HD + ag + 'ag>0&&ag<1?(1-ag)*100:0');
    }
    var line = [], sline = [];
    for (k = 0; k <= Kn; k++) { line.push(pt(edge[k][0], edge[k][1])); sline.push(pt(edge[k][0] - lw * 1.6, edge[k][1])); }
    var strokes = [['rim', line, C.acc, lw, 100], ['rim glow', line, C.acc, lw * 4, 22], ['soot', sline, soot, lw * 2.2, 80]];
    for (k = 0; k < strokes.length; k++) {
        var gs = jzGrp(S, strokes[k][0]); jzAddPath(gs, strokes[k][1], false); jzAddStroke(gs, strokes[k][2], strokes[k][3], strokes[k][4]);
        jzSetExpr(jzGX(gs).property('ADBE Vector Position'), at);
    }
    jzSetExpr(jzXf(S, 'ADBE Opacity'), HD + 'PO>0?(1-sm(0.86,1,PO))*100:0');
} });

/* ================================================================ EXITS: light / signal */

/* ---- overexposeOut — 白飛び: the text blows out to white (to the paper on light schemes) with a bloom, swells and spreads a
   little, and a lens streak flares across it while it fades */
jzReg('exit', 'overexposeOut', { apply: function (m) {
    var L = m.L, G = xb1_geo(m), r = G.r, sz = xb1_sz(m), C = xb1_col(m), s0 = xb1_s0(L);
    var hot = C.dark ? '#FFFFFF' : C.bg, glow = C.dark ? jzMixHex(C.acc, '#FFFFFF', 0.45) : C.acc;
    var ev = 'var oxa=iq(cl(PO/0.5)),oxe=oc(cl(PO/0.7));', HD = xb1_hd(m) + ev;
    jzAnimator(L, 'JZ Out Blowout', [['ADBE Text Fill Color', jzHex(hot)], ['ADBE Text Stroke Color', jzHex(hot)]], HD + 'oxa*100');
    jzAnimator(L, 'JZ Out Spread', [['ADBE Text Tracking Amount', 60]], HD + 'oxe*100');
    m.parts.sc.push(ev + 'f=[f[0]*(1+0.07*oxe),f[1]*(1+0.07*oxe)];');
    m.parts.pos.push(ev + xb1_pivot(m, '1+0.07*oxe', '1+0.07*oxe', '0', G.cx, G.cy));
    xb1_safe(m, ev, '1-ios((PO-0.38)/0.62)');
    var ds = jzEffect(L, 'ADBE Drop Shadow', 'JZ Out Bloom');
    jzEP(ds, 1, jzHex(glow)); jzEP(ds, 3, 135); jzEP(ds, 4, 0);
    jzEX(ds, 2, HD + 'PO>0?242:0'); jzEX(ds, 5, HD + 'SZ*(0.05+0.4*oxe)');
    var gl = jzEffect(L, 'ADBE Glo2', 'JZ Out Flare');
    jzEP(gl, 2, 25);
    jzEX(gl, 3, HD + 'Math.min(600,SZ*0.9*oxe)'); jzEX(gl, 4, HD + 'PO>0.12?0.9*oxe:0');
    if (!xb1_main(m)) return;
    var single = xb1_single(m, G);
    if (single && (m.o.mi || 0) !== 0) return;
    // the lens streak: three horizontal bars (soft wide, medium, hot core line)
    var S, cx, cy, bw, k1 = 1, i;
    if (single) { var P0 = xb1_toComp(L, G.cx, G.cy); S = xb1_cshape(m, 'JZ Out Streak'); cx = m.W / 2; cy = P0[1]; bw = m.W * 0.5; k1 = s0; }
    else { S = xb1_shape(m, 'JZ Out Streak'); cx = G.cx; cy = G.cy; bw = r.width; }
    var bars = [[1.8, 0.018, 95], [1.5, 0.06, 35], [1, 0.18, 14]];
    for (i = 0; i < bars.length; i++) {
        var g = jzGrp(S, 'streak ' + (i + 1)), rc = jzAddRect(g, 10, 10, 0); jzAddFill(g, glow);
        jzGX(g).property('ADBE Vector Position').setValue([cx, cy]); jzGX(g).property('ADBE Vector Group Opacity').setValue(bars[i][2]);
        jzSetExpr(rc.property('ADBE Vector Rect Size'), HD + '[' + jzN(bw * bars[i][0]) + '*(0.8+0.9*oxe),' + jzN(sz * k1 * bars[i][1]) + ']');
    }
    jzSetExpr(jzXf(S, 'ADBE Opacity'), HD + 'PO>0?Math.sin(Math.PI*cl((PO-0.12)/0.88))*100:0');
} });

/* ---- scanOut — 走査線消去: a bright scan line runs down; behind it the text breaks into interlaced lines that shear sideways
   in bands and thin out. Below the line = L (subtract mask above the line); the scanned band = a twin with masks for the band
   just above the line, Venetian Blinds as the interlace and a square Wave Warp as the band shear. */
jzReg('exit', 'scanOut', { apply: function (m) {
    var L = m.L, G = xb1_geo(m), r = G.r, sz = xb1_sz(m), C = xb1_col(m), s0 = xb1_s0(L), H = m.H;
    var pad = sz * 0.3, bx0 = r.left - pad, by0 = r.top - pad, bx1 = r.left + r.width + pad, by1 = r.top + r.height + pad, h = by1 - by0;
    var single = xb1_single(m, G), Lh = single ? H * 0.14 / s0 : Math.max(sz * 0.9, h * 0.3);
    var ya = single ? xb1_fromComp(L, m.W / 2, H * 0.2)[1] : by0 - sz * 0.02, yb = single ? xb1_fromComp(L, m.W / 2, H * 0.8)[1] + Lh : by1 + Lh;
    var pitch = Math.max(2.5 * m.u / s0, sz * 0.065); if (h / pitch > 64) pitch = h / 64;
    var ev = 'var sy=' + jzN(ya) + '+' + jzN(yb - ya) + '*PO,sx=Math.max(0,sy-' + xb1_n(ya) + ');', HD = xb1_hd(m) + ev, big = (r.width + r.height) * 4 + sz * 10;
    var above = xb1_rpts(bx0 - big, by0 - big, bx1 + big, ya);
    var T = xb1_crowded(m, G) ? null : xb1_twin(m, 'JZ Out Scanned', ev, 'PO>0?1:0');
    var mk = xb1_mask(L, above, 'sub', 'JZ Out Scan');
    jzSetExpr(mk.property('ADBE Mask Offset'), HD + 'sx'); jzSetExpr(mk.property('ADBE Mask Opacity'), HD + 'PO>0?100:0');
    xb1_safe(m, ev, '1');
    if (T) {
        var a1 = xb1_mask(T, above, 'add', 'JZ Out Scanned');
        jzSetExpr(a1.property('ADBE Mask Offset'), HD + 'sx');
        var a2 = xb1_mask(T, xb1_rpts(bx0 - big, by0 - big - Lh, bx1 + big, ya - Lh), 'sub', 'JZ Out Scan Tail');
        jzSetExpr(a2.property('ADBE Mask Offset'), HD + 'sx');
        a2.property('ADBE Mask Feather').setValue([Lh * 0.7, Lh * 0.7]);
        var vb = jzEffect(T, 'ADBE Venetian Blinds', 'JZ Out Interlace');
        jzEX(vb, 1, HD + '42+30*cl(PO*1.5)'); jzEP(vb, 2, 90); jzEP(vb, 3, pitch * 2); jzEP(vb, 4, 0);
        var ww = jzEffect(T, 'ADBE Wave Warp', 'JZ Out Shear');
        jzEP(ww, 1, 2); jzEP(ww, 3, Math.max(sz * 0.25, h / 3.5)); jzEP(ww, 4, 0); jzEP(ww, 5, 0); jzEP(ww, 6, 1); jzEP(ww, 7, (m.c.seed | 0) % 360);
        jzEX(ww, 2, HD + 'SZ*(0.04+0.45*cl(PO*1.5))');
    }
    if (!xb1_main(m)) return;
    var S = xb1_shape(m, 'JZ Out Scan Line'), lw = Math.max(1.5 * m.u / s0, sz * 0.025), bw = (bx1 - bx0) + sz * 0.4, cx = (bx0 + bx1) / 2, i;
    var lines = [[lw, 100], [lw * 6, 18]];
    for (i = 0; i < lines.length; i++) {
        var g = jzGrp(S, i ? 'glow' : 'line'); jzAddRect(g, bw, lines[i][0], 0); jzAddFill(g, C.acc);
        jzGX(g).property('ADBE Vector Group Opacity').setValue(lines[i][1]);
        jzSetExpr(jzGX(g).property('ADBE Vector Position'), HD + '[' + jzN(cx) + ',sy]');
    }
    jzSetExpr(jzXf(S, 'ADBE Opacity'), HD + 'PO>0&&sy<' + jzN(by1 + sz * 0.1) + '&&sy>' + jzN(by0 - sz * 0.1) + '?(1-sm(0.8,1,PO))*100:0');
} });

/* ================================================================ EXITS: graphic masks */

/* ---- stripesOut — ストライプ消去: slanted stripes, each wiped along its own length in alternating directions, staggered across
   the text, with an accent tick on every moving end (twin through a matte of per-stripe rects) */
jzReg('exit', 'stripesOut', { apply: function (m) {
    var L = m.L, G = xb1_geo(m), r = G.r, sz = xb1_sz(m), C = xb1_col(m), i, k;
    var pad = sz * 0.12, bx0 = r.left - pad, by0 = r.top - pad, bx1 = r.left + r.width + pad, by1 = r.top + r.height + pad;
    var ang = (xb1_cutBit(m, 41) ? 64 : 116) * Math.PI / 180, ldx = Math.cos(ang), ldy = Math.sin(ang), adx = -ldy, ady = ldx;
    var cn = [[bx0, by0], [bx1, by0], [bx0, by1], [bx1, by1]], a0 = 1e9, a1 = -1e9, l0 = 1e9, l1 = -1e9;
    for (i = 0; i < 4; i++) {
        var aa = cn[i][0] * adx + cn[i][1] * ady, ll = cn[i][0] * ldx + cn[i][1] * ldy;
        a0 = Math.min(a0, aa); a1 = Math.max(a1, aa); l0 = Math.min(l0, ll); l1 = Math.max(l1, ll);
    }
    var n = Math.max(2, Math.ceil((a1 - a0) / Math.max(6, sz * 0.38))); if (n > 32) n = 32;
    var sw = (a1 - a0) / n, rev = xb1_cutBit(m, 42), HD = xb1_hd(m), phi = ang * 180 / Math.PI - 90;
    if (xb1_crowded(m, G)) { xb1_wipe(m, r, 'x', (rev ? -1 : 1) * (adx > 0 ? 1 : -1), 'io3(PO)*1.05', HD, sz * 0.1); xb1_safe(m, '', '1'); return; }
    var qe = function (k2) {
        var o = n > 1 ? k2 / (n - 1) : 0, st = (rev ? 1 - o : o) * 0.42, fs = (k2 & 1) === 1;
        return 'var q=io3((PO-' + xb1_n(st) + ')/0.58),la=' + (fs ? jzN(l0) + '+' + jzN(l1 - l0) + '*q' : jzN(l0)) + ',lb=' + (fs ? jzN(l1) : jzN(l1) + '-' + xb1_n(l1 - l0) + '*q') + ';';
    };
    xb1_hideL(m, '', 'PO>0');
    var T = xb1_twin(m, 'JZ Out Striped', '', 'PO>0?1:0'), M = xb1_matteShape(m, T, 'JZ Out Stripes Matte');
    for (k = 0; k < n; k++) {
        var am = a0 + (k + 0.5) * sw, g = jzGrp(M, 'stripe ' + (k + 1)), rc = jzAddRect(g, sw + 0.6, 10, 0); jzAddFill(g, '#FFFFFF');
        jzGX(g).property('ADBE Vector Rotation').setValue(phi);
        jzSetExpr(rc.property('ADBE Vector Rect Size'), HD + qe(k) + '[' + jzN(sw + 0.6) + ',Math.max(0,lb-la)]');
        jzSetExpr(jzGX(g).property('ADBE Vector Position'), HD + qe(k) + 'var lm=(la+lb)/2;[' + jzN(adx * am) + '+' + jzN(ldx) + '*lm,' + jzN(ady * am) + '+' + jzN(ldy) + '*lm]');
    }
    if (!xb1_main(m)) return;
    // the ticks on the moving ends, only where the text box is
    var S = xb1_shape(m, 'JZ Out Stripe Ticks', M), th = Math.max(2 * m.u, sz * 0.045);
    for (k = 0; k < n; k++) {
        var fs2 = (k & 1) === 1, am2 = a0 + (k + 0.5) * sw, gt = jzGrp(S, 'tick ' + (k + 1));
        jzAddRect(gt, Math.max(1, sw - 1), th, 0); jzAddFill(gt, C.acc);
        jzGX(gt).property('ADBE Vector Rotation').setValue(phi);
        var lt = fs2 ? 'la-' + xb1_n(th / 2) : 'lb+' + jzN(th / 2);
        jzSetExpr(jzGX(gt).property('ADBE Vector Position'), HD + qe(k) + 'var lt=' + lt + ';[' + jzN(adx * am2) + '+' + jzN(ldx) + '*lt,' + jzN(ady * am2) + '+' + jzN(ldy) + '*lt]');
        jzSetExpr(jzGX(gt).property('ADBE Vector Group Opacity'), HD + qe(k) + 'q>0&&q<1?(1-sm(0.8,1,q))*100:0');
    }
    jzMaskRect(S, r.left - sz * 0.02, r.top - sz * 0.02, r.left + r.width + sz * 0.02, r.top + r.height + sz * 0.02);
    jzSetExpr(jzXf(S, 'ADBE Opacity'), HD + 'PO>0?100:0');
} });

/* ---- halftoneOut — 網点に消える: the fill breaks into a halftone screen whose dots shrink away in a sweep (twin through a
   hex dot lattice matte: one column of dots per shape group, repeated down the column; dot size follows the sweep) */
jzReg('exit', 'halftoneOut', { apply: function (m) {
    var L = m.L, G = xb1_geo(m), r = G.r, sz = xb1_sz(m), C = xb1_col(m), vert = G.vert, i, j, par;
    var pad = sz * 0.1, bx0 = r.left - pad, by0 = r.top - pad, bx1 = r.left + r.width + pad, by1 = r.top + r.height + pad, w = bx1 - bx0, h = by1 - by0;
    var c = Math.max(3 * m.u, sz * 0.15);
    while ((w / c + 2) * (h / (c * 0.866) + 2) > 220) c *= 1.1;
    var rows = Math.ceil(h / (c * 0.866)) + 1, cols = Math.ceil(w / c) + 2, R0 = c * 0.64, rev = xb1_cutBit(m, 51), HD = xb1_hd(m);
    var tone = [['ADBE Text Fill Color', jzHex(C.acc)]], toneEx = HD + '40*sm(0.05,0.5,PO)';
    if (xb1_crowded(m, G)) {
        var bd = jzEffect(L, 'ADBE Block Dissolve', 'JZ Out Halftone');
        jzEP(bd, 2, c); jzEP(bd, 3, c); jzEP(bd, 4, 0); jzEP(bd, 5, 0);
        jzEX(bd, 1, HD + 'ios(PO)*100');
        jzAnimator(L, 'JZ Out Tone', tone, toneEx);
        xb1_safe(m, '', '1');
        return;
    }
    xb1_hideL(m, '', 'PO>0');
    var T = xb1_twin(m, 'JZ Out Halftone', '', 'PO>0?1:0'), M = xb1_matteShape(m, T, 'JZ Out Halftone Matte');
    jzAnimator(T, 'JZ Out Tone', tone, toneEx);
    var dot = function (g, x, y, pos) {
        if (rev) pos = 1 - pos;
        var el = jzAddEllipse(g, R0 * 2, R0 * 2, x, y);
        jzSetExpr(el.property('ADBE Vector Ellipse Size'), HD + 'var k=cl(PO*1.55-' + xb1_n(pos) + '*0.55),rr=' + jzN(R0) + '*(1-ios(k));[2*rr,2*rr]');
    };
    var rep = function (g, copies, ox, oy) {
        var rp = jzVecs(g).addProperty('ADBE Vector Filter - Repeater');
        rp.property('ADBE Vector Repeater Copies').setValue(copies);
        rp.property('ADBE Vector Repeater Transform').property('ADBE Vector Repeater Position').setValue([ox, oy]);
    };
    if (!vert) {         // sweep along x: one group per column (even / odd rows), repeated down the column
        for (i = 0; i < cols; i++) for (par = 0; par < 2; par++) {
            var nr = par ? Math.floor(rows / 2) : Math.ceil(rows / 2); if (!nr) continue;
            var x = bx0 + (i + par * 0.5 - 0.5) * c, g = jzGrp(M, 'dots ' + (i + 1) + (par ? 'b' : 'a'));
            dot(g, x, by0 + par * c * 0.866, (x - bx0) / w * 0.8 + 0.1);
            rep(g, nr, 0, 2 * c * 0.866); jzAddFill(g, '#FFFFFF');
        }
    } else {             // sweep along y: one group per row
        for (j = 0; j < rows; j++) {
            var y = by0 + j * c * 0.866, gr = jzGrp(M, 'dots ' + (j + 1));
            dot(gr, bx0 + ((j & 1) * 0.5 - 0.5) * c, y, (y - by0) / h * 0.8 + 0.1);
            rep(gr, cols, c, 0); jzAddFill(gr, '#FFFFFF');
        }
    }
} });

/* ---- eraserOut — 黒板消し: a felt eraser zig-zags lane by lane, erasing as it goes and leaving a faint chalky smear that fades
   (kept part = twin through per-lane rect matte; smear = blurred, stretched twin through the complementary matte) */
function xb1_eraserBlock(m, S, E, lanes, felt) {
    // E: expression prefix defining el (lane), ex (block centre along the lane from its start); lanes: {vert, lh, len, L0, A0, fwdSign}
    var g = jzGrp(S, 'eraser'), sf = jzVecs(g).addProperty('ADBE Vector Group'), sb = jzVecs(g).addProperty('ADBE Vector Group');
    sf.name = 'felt'; sb.name = 'body';
    var ew = lanes.ew, lh = lanes.lh, vert = lanes.vert, bw = vert ? lh * 1.06 : ew, bh = vert ? ew : lh * 1.06;
    jzAddRect(sb, bw, bh, Math.min(bw, bh) * 0.18); jzAddFill(sb, lanes.acc);
    var rf = jzAddRect(sf, vert ? bw : bw * 0.3, vert ? bh * 0.3 : bh, Math.min(bw, bh) * 0.12); jzAddFill(sf, felt);
    // felt on the trailing side of the stroke
    jzSetExpr(rf.property('ADBE Vector Rect Position'), E + 'var fw=el%2==0?-1:1;' + (vert ? '[0,fw*' + jzN(bh * 0.35) + ']' : '[fw*' + jzN(bw * 0.35) + ',0]'));
    jzSetExpr(jzGX(g).property('ADBE Vector Position'), E + 'var c=Math.max(' + jzN(-ew / 2) + ',Math.min(' + jzN(lanes.len + ew / 2) + ',ex)),t=el%2==0?' + jzN(lanes.L0) + '+c:' + jzN(lanes.L0 + lanes.len) + '-c,a=' + (vert ? jzN(lanes.A0) + '-(el+0.5)*' + jzN(lh) : jzN(lanes.A0) + '+(el+0.5)*' + jzN(lh)) + ';' + (vert ? '[a,t]' : '[t,a]'));
}
jzReg('exit', 'eraserOut', { apply: function (m) {
    var L = m.L, G = xb1_geo(m), r = G.r, sz = xb1_sz(m), C = xb1_col(m), vert = G.vert, s0 = xb1_s0(L), i, j;
    var felt = jzMixHex(C.acc, C.bg, 0.45), HD = xb1_hd(m);
    if (xb1_single(m, G)) {       // one screen-wide eraser (3 lanes) for every glyph layer; each glyph goes when the eraser reaches it
        var W = m.W, H = m.H, X0 = W * 0.03, X1 = W * 0.97, Y0 = H * 0.3, Y1 = H * 0.7, lhS = (Y1 - Y0) / 3, ewS = H * 0.13 * 0.8, lenS = X1 - X0, legS = lenS + ewS;
        var E1 = 'var epos=cl(PO/0.9)*3*' + jzN(legS) + ',el=Math.min(2,Math.floor(epos/' + jzN(legS) + ')),ex=epos-el*' + jzN(legS) + '-' + xb1_n(ewS / 2) + ';';
        var P0 = xb1_toComp(L, G.cx, G.cy), jl = jzClamp(Math.floor((P0[1] - Y0) / lhS), 0, 2), sg = jl % 2 === 0 ? P0[0] - X0 : X0 + lenS - P0[0];
        var hw = Math.max(4, r.width * s0 * 0.5);
        xb1_safe(m, E1, 'el>' + jl + '?0:(el==' + jl + '?1-cl((ex+' + jzN(ewS * 0.3) + '-' + xb1_n(sg - hw) + ')/' + jzN(2 * hw) + '):1)');
        if ((m.o.mi || 0) !== 0 || !xb1_main(m)) return;
        var SE = xb1_cshape(m, 'JZ Out Eraser');
        xb1_eraserBlock(m, SE, HD + E1, { vert: false, lh: lhS, len: lenS, L0: X0, A0: Y0, ew: ewS, acc: C.acc }, felt);
        jzSetExpr(jzXf(SE, 'ADBE Opacity'), HD + 'PO>0?(1-sm(0.9,1,PO))*100:0');
        return;
    }
    var pad = sz * 0.12, bx0 = r.left - pad, by0 = r.top - pad, bx1 = r.left + r.width + pad, by1 = r.top + r.height + pad;
    var span = vert ? bx1 - bx0 : by1 - by0, len = vert ? by1 - by0 : bx1 - bx0, ink = vert ? span : Math.min(span, (G.nL - 1) * G.lead + G.fs * 0.92 + pad * 2);
    var K = jzClamp(Math.round(ink / (sz * 0.7)), 2, 10), lh = span / K, ew = sz * 0.8, leg = len + ew;     // lane count from the ink height (as the browser's box)
    var L0 = vert ? by0 : bx0, A0 = vert ? bx1 : by0;
    var E = HD + 'var epos=cl(PO/0.9)*' + K + '*' + jzN(leg) + ',el=Math.min(' + (K - 1) + ',Math.floor(epos/' + jzN(leg) + ')),ex=epos-el*' + jzN(leg) + '-' + xb1_n(ew / 2) + ',ecut=Math.max(0,Math.min(' + jzN(len) + ',ex+' + jzN(ew * 0.3) + '));' +
        'function LR(j,a,b){var a0=' + (vert ? jzN(A0) + '-(j+1)*' + jzN(lh) : jzN(A0) + '+j*' + jzN(lh)) + ',f=j%2==0,t0=f?' + jzN(L0) + '+a:' + jzN(L0 + len) + '-b,t1=f?' + jzN(L0) + '+b:' + jzN(L0 + len) + '-a;' +
        'return ' + (vert ? '[a0,t0,' + jzN(lh) + ',Math.max(0,t1-t0)]' : '[t0,a0,Math.max(0,t1-t0),' + jzN(lh) + ']') + ';}';
    if (xb1_crowded(m, G)) { xb1_wipe(m, r, vert ? 'y' : 'x', 1, 'cl(PO/0.9)', HD, 0); xb1_safe(m, '', '1'); return; }
    xb1_hideL(m, '', 'PO>0');
    var lane = function (Mx, keep) {
        for (j = 0; j < K; j++) {
            var g = jzGrp(Mx, 'lane ' + (j + 1)), rc = jzAddRect(g, 10, 10, 0); jzAddFill(g, '#FFFFFF');
            var q = E + 'var j=' + j + ',q=' + (keep ? 'LR(j,j>el?0:(j==el?ecut:' + jzN(len) + '),' + jzN(len) + ')' : 'LR(j,0,j<el?' + jzN(len) + ':(j==el?ecut:0))') + ';';
            jzSetExpr(rc.property('ADBE Vector Rect Size'), q + '[q[2]>0.01&&q[3]>0.01?q[2]+0.4:0,q[3]>0.01&&q[2]>0.01?q[3]+0.4:0]');
            jzSetExpr(jzGX(g).property('ADBE Vector Position'), q + '[q[0]+q[2]/2,q[1]+q[3]/2]');
        }
    };
    var T = xb1_twin(m, 'JZ Out Unerased', '', 'PO>0?1:0'), MK = xb1_matteShape(m, T, 'JZ Out Unerased Matte');
    lane(MK, true);
    if (!xb1_main(m)) return;
    // chalk smear in the erased part: blurred, stretched along the stroke, fading
    var cxm = (bx0 + bx1) / 2, cym = (by0 + by1) / 2;
    var T2 = xb1_twin(m, 'JZ Out Smear', '', 'PO>0?0.26*(1-sm(0.35,0.95,PO)):0', MK), MG = xb1_matteShape(m, T2, 'JZ Out Smear Matte');
    jzNoGhost(T2);
    lane(MG, false);
    var tr2 = T2.property('ADBE Transform Group');
    tr2.property('ADBE Anchor Point').setValue([cxm, cym]);
    jzSetExpr(tr2.property('ADBE Position'), '[' + jzN(cxm) + ',' + jzN(cym) + ']');
    tr2.property('ADBE Scale').setValue(vert ? [100, 112] : [110, 100]);
    jzAnimator(T2, 'JZ Out Chalk', [['ADBE Text Fill Color', jzHex(jzMixHex(C.c0, C.bg, 0.25))], ['ADBE Text Stroke Color', jzHex(jzMixHex(C.c0, C.bg, 0.25))]], '100');
    var gb = jzEffect(T2, 'ADBE Gaussian Blur 2', 'JZ Out Smudge'); jzEP(gb, 1, Math.min(sz * 0.1, 28 * m.u / s0));
    // the eraser block
    var SE2 = xb1_shape(m, 'JZ Out Eraser', MG);
    xb1_eraserBlock(m, SE2, E, { vert: vert, lh: lh, len: len, L0: L0, A0: A0, ew: ew, acc: C.acc }, felt);
    jzSetExpr(jzXf(SE2, 'ADBE Opacity'), HD + 'PO>0?(1-sm(0.9,1,PO))*100:0');
} });

/* ---- vacuumOut — 一点に吸われる: sucked into a point beyond the end of the line, nearest glyph first, each glyph stretching along
   its path; an accent dot at the target swells with what it swallowed and pops as a ring */
function xb1_vacDot(m, S, cx, cy, frEx, szc) {
    var HD = xb1_hd(m), gr = jzGrp(S, 'ring'), er = jzAddEllipse(gr, 4, 4, cx, cy), st = jzAddStroke(gr, m.ctx.sc.accent || '#FFFFFF', 2);
    var rg = 'var rg=cl((PO-0.86)/0.14);';
    jzSetExpr(er.property('ADBE Vector Ellipse Size'), HD + rg + 'var R=' + jzN(szc) + '*(0.15+0.5*oc(rg));[2*R,2*R]');
    jzSetExpr(st.property('ADBE Vector Stroke Width'), HD + rg + 'Math.max(1,' + jzN(szc * 0.03) + '*(1-rg))');
    jzSetExpr(jzGX(gr).property('ADBE Vector Group Opacity'), HD + rg + 'rg>0&&rg<1?(1-rg)*100:0');
    var gd = jzGrp(S, 'dot'), ed = jzAddEllipse(gd, 4, 4, cx, cy); jzAddFill(gd, m.ctx.sc.accent || '#FFFFFF');
    jzSetExpr(ed.property('ADBE Vector Ellipse Size'), HD + frEx + 'var pu=1+0.25*Math.sin(PO*40)*(1-PO),R=' + jzN(szc) + '*(0.05+0.09*fr)*pu*(1-sm(0.9,1,PO));[2*R,2*R]');
    jzSetExpr(jzGX(gd).property('ADBE Vector Group Opacity'), HD + 'PO>0?100:0');
}
jzReg('exit', 'vacuumOut', { apply: function (m) {
    var L = m.L, G = xb1_geo(m), r = G.r, sz = xb1_sz(m), vert = G.vert, rev = xb1_cutBit(m, 61), W = m.W, H = m.H, s0 = xb1_s0(L), cs = m.c.seed | 0, i, HD = xb1_hd(m);
    if (xb1_single(m, G)) {       // whole glyph layers travel to one screen point
        var mi = m.o.mi || 0, Tc = [rev ? W * 0.08 : W * 0.92, H / 2], P0 = xb1_toComp(L, G.cx, G.cy), ddx = Tc[0] - P0[0], ddy = Tc[1] - P0[1];
        var d0 = Math.sqrt(ddx * ddx + ddy * ddy), o = jzClamp(d0 / (W * 0.85), 0, 1), bend = (xb1_r(cs, mi, 62) - 0.5) * d0 * 0.5, nx = -ddy / Math.max(1, d0), ny = ddx / Math.max(1, d0);
        var ev = 'var vq=win(PO,' + jzN(o) + ',0.6),ve=ic(vq),vb=Math.sin(Math.PI*ve)*' + jzN(bend) + ',vfx=(1-0.85*ve)*(1+1.3*vq*vq),vfy=(1-0.85*ve)*(1-0.4*vq*vq);';
        m.parts.sc.push(XB1_FNS + ev + 'f=[f[0]*vfx,f[1]*vfy];');
        m.parts.pos.push(XB1_FNS + ev + xb1_pivot(m, 'vfx', 'vfy', '0', G.cx, G.cy) + 'd=[d[0]+' + jzN(ddx) + '*ve+' + jzN(nx) + '*vb,d[1]+' + jzN(ddy) + '*ve+' + jzN(ny) + '*vb];');
        xb1_safe(m, ev, 'vq>=1?0:1');
        if (mi === 0 && xb1_main(m)) xb1_vacDot(m, xb1_cshape(m, 'JZ Out Vacuum Dot'), Tc[0], Tc[1], 'var fr=cl(PO*1.2);', sz * s0);
        return;
    }
    var bx0 = r.left, by0 = r.top, bx1 = r.left + r.width, by1 = r.top + r.height, bcx = (bx0 + bx1) / 2, bcy = (by0 + by1) / 2;
    var Tl = vert ? [bcx, rev ? by0 - sz * 0.8 : by1 + sz * 0.8] : [rev ? bx0 - sz * 0.8 : bx1 + sz * 0.8, bcy], dm = 1, VX = [], VY = [], O = [], RS = [], OK = [];
    for (i = 0; i < G.n; i++) { var g = G.g[i], vx = Tl[0] - g.x, vy = Tl[1] - g.y; VX.push(vx); VY.push(vy); dm = Math.max(dm, Math.sqrt(vx * vx + vy * vy)); }
    for (i = 0; i < G.n; i++) {
        var dd = Math.sqrt(VX[i] * VX[i] + VY[i] * VY[i]);
        O.push(jzClamp((dd - sz * 0.8) / Math.max(1, dm - sz * 0.8), 0, 1)); RS.push(xb1_rs(cs + (m.o.mi || 0) * 101, i, 63));
        if (!G.g[i].sp) OK.push(O[i]);
    }
    var K = dm * 1.2 + sz;
    var q = HD + 'var i=textIndex-1,VX=' + xb1_arr(VX) + ',VY=' + xb1_arr(VY) + ',O=' + xb1_arr(O) + ',RS=' + xb1_arr(RS) + ',vx=VX[i]||0,vy=VY[i]||0,dd=Math.max(1,Math.sqrt(vx*vx+vy*vy)),' +
        'q=win(PO,O[i]||0,0.5),e=Math.min(1,iq(q/0.94)),bd=(RS[i]||0)*dd*0.1*Math.sin(Math.PI*e),nx=-vy/dd,ny=vx/dd,st=Math.min(1.8,3*q*q),s=1-0.8*e,sa=s*(1+st),sb=s*(1-0.3*st/1.8);';
    jzAnimator(L, 'JZ Out Suck', [['ADBE Text Position 3D', [K, K, 0]]], q + 'q<=0?[0,0,0]:[(vx*e+nx*bd)/' + jzN(K) + '*100,(vy*e+ny*bd)/' + jzN(K) + '*100,0]');
    jzAnimator(L, 'JZ Out Stretch', [['ADBE Text Scale 3D', [300, 300, 100]]], q + 'q<=0?[0,0,0]:' + (vert ? '[(sb-1)/2*100,(sa-1)/2*100,0]' : '[(sa-1)/2*100,(sb-1)/2*100,0]'));
    jzAnimator(L, 'JZ Out Gone', [['ADBE Text Opacity', 0]], q + 'q>=0.94?100:0');
    xb1_safe(m, '', '1');
    if (!xb1_main(m)) return;
    xb1_vacDot(m, xb1_shape(m, 'JZ Out Vacuum Dot'), Tl[0], Tl[1], 'var O=' + xb1_arr(OK) + ',n=0;for(var k=0;k<O.length;k++)if(win(PO,O[k],0.5)>=0.94)n++;var fr=n/' + Math.max(1, OK.length) + ';', sz);
} });

/* ================================================================ EXITS: particles */

/* ---- sandOut — 砂になって飛ぶ: weathered into sand: glyphs blur, lift and stream away on the wind from the leading side,
   shedding grains (a particle shape layer: small stretched grains from every glyph, drifting on the same wind) */
jzReg('exit', 'sandOut', { apply: function (m) {
    var L = m.L, G = xb1_geo(m), r = G.r, sz = xb1_sz(m), C = xb1_col(m), vert = G.vert, s0 = xb1_s0(L), single = xb1_single(m, G), cs = m.c.seed | 0, i, j;
    var dir = xb1_cutBit(m, 71) ? 1 : -1, og = xb1_ord(m), bx0 = r.left, bw = Math.max(1, r.width), by0 = r.top, bh = Math.max(1, r.height), HD = xb1_hd(m);
    var posOf = function (x, y) {
        var p = vert ? (y - by0) / bh : (x - bx0) / bw;
        if (!vert && dir > 0) p = 1 - p;
        if (single) p = 0.8 * (dir > 0 ? 1 - og : og) + 0.2 * p;
        return jzClamp(p, 0, 1);
    };
    var D = sz * 3 + m.W * 0.18 / s0, K = D + sz, PS = [];
    for (i = 0; i < G.n; i++) PS.push(posOf(G.g[i].x, G.g[i].y));
    var q = HD + 'var PS=' + xb1_arr(PS) + ',x=cl((PO-(PS[textIndex-1]||0)*0.5-0.04)/0.4),k1=hh(textIndex*8.2+SD);';
    jzAnimator(L, 'JZ Out Blow', [['ADBE Text Position 3D', [K, K, 0]]], q + 'x<=0?[0,0,0]:[' + dir + '*' + jzN(D) + '*x*x/' + jzN(K) + '*100,-(SZ*0.55*x+Math.sin(x*5+k1*6)*SZ*0.07*x)/' + jzN(K) + '*100,0]');
    jzAnimator(L, 'JZ Out Grainy', [['ADBE Text Scale 3D', [300, 300, 100]], ['ADBE Text Blur', [sz * 0.06, sz * 0.06]]], q + 'var s=1-0.4*x;[((s*(1+1.4*x))-1)/2*100,(s-1)/2*100,0]');
    jzAnimator(L, 'JZ Out Fade', [['ADBE Text Opacity', 0]], q + 'x>=1?100:Math.pow(x,0.6)*100');
    xb1_safe(m, '', '1');
    if (!xb1_main(m) || xb1_crowded(m, G) || !G.nk) return;
    // grains: born inside the glyphs, streaming away on the wind, stretched along it, turning and fading
    var S = xb1_shape(m, 'JZ Out Sand'), vis = [], nG;
    try { S.comment = ''; } catch (e0) {}       // the grains are pieces of the text: they stay in the ghost passes
    for (i = 0; i < G.n; i++) if (!G.g[i].sp) vis.push(G.g[i]);
    nG = single ? 10 : Math.min(96, vis.length * 9);
    for (j = 0; j < nG; j++) {
        var g = vis[j % vis.length], gx = g.x + xb1_rs(cs, j, 84) * g.w * 0.38, gy = g.y + xb1_rs(cs, j, 85) * G.fs * 0.38;
        var t0 = posOf(gx, gy) * 0.5 + xb1_r(cs, j, 81) * 0.18, k1 = xb1_r(cs, j, 82), gd = sz * (0.1 + 0.14 * xb1_r(cs, j, 86));
        var hx = 'var x=(PO-' + xb1_n(t0) + ')/0.32,xc=cl(x);';
        var gg = jzGrp(S, 'grain ' + (j + 1)), rc = jzAddRect(gg, gd, gd * 0.45, 0); jzAddFill(gg, C.c0);
        jzSetExpr(rc.property('ADBE Vector Rect Size'), HD + hx + '[' + jzN(gd) + '*(1+2.4*xc)*(1-0.55*xc),' + jzN(gd * 0.45) + '*(1-0.55*xc)]');
        jzSetExpr(jzGX(gg).property('ADBE Vector Position'), HD + hx + '[' + jzN(gx) + '+' + dir + '*' + jzN(D) + '*xc*xc,' + jzN(gy) + '-(SZ*0.55*xc+Math.sin(xc*5+' + jzN(k1 * 6) + ')*SZ*0.07*xc)]');
        jzSetExpr(jzGX(gg).property('ADBE Vector Rotation'), HD + hx + jzN(xb1_rs(cs, j, 83) * 140) + '*xc*0.3');
        jzSetExpr(jzGX(gg).property('ADBE Vector Group Opacity'), HD + hx + 'x>0&&x<1?(1-x*x)*100:0');
    }
} });

/* ---- shredOut — シュレッダー: the text is fed down into a slot (an ink bar); above it the text is intact (L, clipped by a mask
   that follows the slot), below it comes out as strips that fan out and drop (a twin with the part below the slot, strip gaps as
   masks, widened about the slot) */
jzReg('exit', 'shredOut', { apply: function (m) {
    var L = m.L, G = xb1_geo(m), r = G.r, sz = xb1_sz(m), C = xb1_col(m), H = m.H, s0 = xb1_s0(L), X = xb1_xf(L), single = xb1_single(m, G), k;
    var pad = sz * 0.06, bx0 = r.left - pad, by0 = r.top - pad, bx1 = r.left + r.width + pad, by1 = r.top + r.height + pad, bw = bx1 - bx0, big = (r.width + r.height) * 3 + sz * 10;
    var slot = single ? Math.max(by1 + sz * 0.1, xb1_fromComp(L, m.W / 2, H * 0.66)[1]) : by1 + sz * 0.12, travel = slot - by0 + sz * 0.1;
    var ev = 'var hf=cl((PO-0.08)/0.72),hD=' + jzN(travel) + '*(0.2*hf*hf+0.8*hf),hv=cl((PO-0.72)/0.28),hdr=' + jzN(H * 0.9 / s0) + '*hv*hv,hc=cl(Math.max(0,' + jzN(by1) + '+hD-' + xb1_n(slot) + ')/' + jzN(sz * 1.5) + ');';
    var HD = xb1_hd(m) + ev, rr = X.r * Math.PI / 180;
    m.parts.pos.push(XB1_FNS + ev + 'd=[d[0]-' + xb1_n(Math.sin(rr) * s0) + '*hD,d[1]+' + jzN(Math.cos(rr) * s0) + '*hD];');
    var crowd = xb1_crowded(m, G), T = crowd ? null : xb1_twin(m, 'JZ Out Shreds', ev, 'PO>0?1-sm(0.8,0.97,PO):0');
    var mk = xb1_mask(L, xb1_rpts(bx0 - big, by0 - big, bx1 + big, slot), 'add', 'JZ Out Slot');
    jzSetExpr(mk.property('ADBE Mask Offset'), HD + 'PO>0?-hD:1e4');
    xb1_safe(m, ev, '1');
    if (T) {
        jzNoGhost(T);
        var mb = xb1_mask(T, xb1_rpts(bx0 - big, slot, bx1 + big, by1 + big), 'add', 'JZ Out Below Slot');
        jzSetExpr(mb.property('ADBE Mask Offset'), HD + 'hD');
        var n = jzClamp(Math.round(bw / (sz * 0.2)), 5, 20), sw = bw / n, xc = (bx0 + bx1) / 2;
        for (k = 0; k < n; k++) xb1_mask(T, xb1_rpts(bx0 + k * sw + sw * 0.74, by0 - big, bx0 + (k + 1) * sw, by1 + big), 'sub', 'JZ Out Strip Gap ' + (k + 1));
        var tr = T.property('ADBE Transform Group');
        jzSetExpr(tr.property('ADBE Anchor Point'), HD + '[' + jzN(xc) + ',' + jzN(slot) + '-hD]');
        jzSetExpr(tr.property('ADBE Position'), HD + '[' + jzN(xc) + ',' + jzN(slot) + '-hD+hdr]');
        jzSetExpr(tr.property('ADBE Scale'), HD + '[100*(1+0.28*hc),100]');
        var ww = jzEffect(T, 'ADBE Wave Warp', 'JZ Out Curl');
        jzEP(ww, 1, 1); jzEP(ww, 3, sz * 2.4); jzEP(ww, 4, 90); jzEP(ww, 5, 0); jzEP(ww, 6, 1);
        jzEX(ww, 2, HD + 'SZ*0.05*hc'); jzEX(ww, 7, HD + 'PO*520');
    }
    if (!xb1_main(m)) return;
    // the slot: an ink bar fixed on the screen
    var P = xb1_toComp(L, (bx0 + bx1) / 2, slot), S = xb1_cshape(m, 'JZ Out Slot Bar'), g = jzGrp(S, 'bar'), rc = jzAddRect(g, 10, 10, 0);
    jzAddFill(g, C.ink); jzGX(g).property('ADBE Vector Position').setValue(P);
    jzSetExpr(rc.property('ADBE Vector Rect Size'), HD + '[' + jzN((bw + sz * 0.5) * s0) + '*oc(sm(0,0.12,PO)),' + jzN(Math.max(2 * m.u, sz * s0 * 0.05)) + ']');
    jzSetExpr(jzXf(S, 'ADBE Opacity'), HD + 'PO>0?sm(0,0.1,PO)*(1-sm(0.82,0.98,PO))*100:0');
} });

/* ================================================================ EXITS: mechanics */

/* ---- dominoOut — ドミノ倒し: each glyph topples over its bottom corner onto the next, in a chain; the fallen row sinks and fades */
jzReg('exit', 'dominoOut', { apply: function (m) {
    var L = m.L, G = xb1_geo(m), fs = G.fs, rev = xb1_cutBit(m, 91), sg = rev ? -1 : 1, i, Wd = [];
    for (i = 0; i < G.n; i++) Wd.push(G.g[i].w);
    var ordE = xb1_single(m, G) ? jzN(rev ? 1 - xb1_ord(m) : xb1_ord(m)) : (rev ? '1-' : '') + '(textTotal>1?(textIndex-1)/(textTotal-1):0)', K = fs * 2;
    var q = xb1_hd(m) + 'var W=' + xb1_arr(Wd) + ',q=win(PO,' + ordE + ',0.55),u=(q-0.62)/0.38,th=q<0.62?90*ic(q/0.62):90-10*Math.sin(Math.PI*Math.min(1,u*1.6))*(1-u),' +
        'a=' + sg + '*th*Math.PI/180,px=' + sg + '*(W[textIndex-1]||SZ)/2,py=' + jzN(fs * 0.12) + ',dx=q>0?px-(Math.cos(a)*px-Math.sin(a)*py):0,dy=q>0?py-(Math.sin(a)*px+Math.cos(a)*py):0,sk=SZ*0.9*iq(cl((PO-0.7)/0.3));';
    jzAnimator(L, 'JZ Out Topple', [['ADBE Text Rotation', 90]], q + 'q<=0?0:' + sg + '*th/90*100');
    jzAnimator(L, 'JZ Out Pivot', [['ADBE Text Position 3D', [K, K, 0]]], q + '[dx/' + jzN(K) + '*100,(dy+sk)/' + jzN(K) + '*100,0]');
    xb1_safe(m, '', '1-sm(0.74,0.98,PO)');
} });

/* ---- hingeOut — 片留めが外れる: one pin pops off; the text swings down on the other pin with a damped swing, settles, then
   drops away (layer rotation about the pin + fall), pins drawn in the accent colour */
jzReg('exit', 'hingeOut', { apply: function (m) {
    var L = m.L, G = xb1_geo(m), r = G.r, sz = xb1_sz(m), C = xb1_col(m), H = m.H, s0 = xb1_s0(L), vert = G.vert, cs = m.c.seed | 0;
    var pad = sz * 0.02, x0 = r.left - pad, y0 = r.top - pad, x1 = r.left + r.width + pad, y1 = r.top + r.height + pad, bw = x1 - x0, bh = y1 - y0;
    var left = !xb1_cutBit(m, 102), sg = left ? 1 : -1;
    var ax = (left ? x0 : x1) + sg * Math.min(sz * 0.14, bw * 0.2), ay = y0 + Math.min(sz * 0.12, bh * 0.2), reach = Math.max(1, bw - sz * 0.14);
    var hang = vert ? 24 : Math.min(58, Math.max(14, Math.asin(jzClamp(H * 0.3 / (reach * s0), 0, 1)) * 180 / Math.PI));
    var qx = xb1_single(m, G) ? 'win(PO,' + jzN(xb1_r(cs, m.o.mi || 0, 101)) + ',0.3)' : 'PO';
    var ev = 'var hq=' + qx + ',hu=cl(hq/0.64),hv=cl((hq-0.64)/0.36),hth=' + jzN(hang) + '*(1-Math.exp(-hu*4.5)*Math.cos(hu*12))+30*hv*hv;', HD = xb1_hd(m) + ev;
    var Q = xb1_toComp(L, ax, ay), bxp = left ? x1 - sz * 0.14 : x0 + sz * 0.14, Q1 = xb1_toComp(L, bxp, ay);
    xb1_rigid(m, XB1_FNS + ev, sg + '*hth', Q, [jzN(sg * sz * s0 * 0.4) + '*hv', jzN(H * 1.25) + '*hv*hv']);
    xb1_safe(m, ev, '1-sm(0.9,1,hq)');
    if (!xb1_main(m)) return;
    var S = xb1_cshape(m, 'JZ Out Pins'), rp = Math.max(2 * m.u, sz * s0 * 0.045), szc = sz * s0;
    var g1 = jzGrp(S, 'popped pin'); jzAddEllipse(g1, rp * 2, rp * 2); jzAddFill(g1, C.acc);
    jzSetExpr(jzGX(g1).property('ADBE Vector Position'), HD + 'var fl=cl(hq/0.16);[' + jzN(Q1[0]) + '+' + jzN(sg * szc * 0.5) + '*fl,' + jzN(Q1[1]) + '-' + xb1_n(szc * 0.6) + '*fl+' + jzN(szc * 1.6) + '*fl*fl]');
    jzSetExpr(jzGX(g1).property('ADBE Vector Group Opacity'), HD + 'var fl=cl(hq/0.16);hq>0&&fl<1?(1-fl)*100:0');
    var g0 = jzGrp(S, 'pin'); jzAddEllipse(g0, rp * 2, rp * 2); jzAddFill(g0, C.acc);
    jzGX(g0).property('ADBE Vector Position').setValue(Q);
    jzSetExpr(jzGX(g0).property('ADBE Vector Group Opacity'), HD + 'hq>0?(1-sm(0.05,0.25,hv))*100:0');
} });

/* ================================================================ HOLDS */

/* ---- glowFlicker — 灯火のゆらぎ: a warm candle halo (drop shadow glow) that breathes and gutters irregularly, a faint warm tint
   and a tiny upward lick of the glyphs */
jzReg('hold', 'glowFlicker', { apply: function (m) {
    var L = m.L, C = xb1_col(m), glow = C.dark ? jzMixHex(C.acc, '#FFFFFF', 0.3) : C.acc;
    var ev = XB1_MK + 'var gf=0.6+0.28*noise([time*3.3,SD])+0.12*noise([time*11,SD+5]),glv=cl(gf*(1-0.45*sm(0.35,0.8,noise([time*1.1,SD+9]))));';
    var HD = xb1_hd(m) + ev;
    var ds = jzEffect(L, 'ADBE Drop Shadow', 'JZ Hold Candle');
    jzEP(ds, 1, jzHex(glow)); jzEP(ds, 3, 0);
    jzEX(ds, 2, HD + jzN((C.dark ? 0.9 : 0.6) * 255) + '*cl(HK*4)');
    jzEX(ds, 4, HD + 'SZ*0.02*glv*HKK'); jzEX(ds, 5, HD + 'SZ*(0.06+0.3*glv)*HKK');
    m.parts.op.push(XB1_FNS + ev + 'f*=1-0.16*(1-glv)*HKK;');
    jzAnimator(L, 'JZ Hold Warm', [['ADBE Text Fill Color', jzHex(C.acc)]], HD + '10*glv*HKK');
    var lk = HD + 'var st=0.025*HK*(0.5+0.5*noise([time*6+textIndex*2.3,SD+textIndex]));';
    jzAnimator(L, 'JZ Hold Lick', [['ADBE Text Scale 3D', [100, 110, 100]]], lk + '[0,st/0.1*100,0]');
    jzAnimator(L, 'JZ Hold Lick Base', [['ADBE Text Position 3D', [0, xb1_sz(m) * 0.1, 0]]], lk + '[0,-st/0.1*50,0]');
} });

/* ---- windGust — 突風: every ~2.2 s a gust sweeps along the line: the glyphs are pushed, lean (skew) and spring back */
jzReg('hold', 'windGust', { apply: function (m) {
    var L = m.L, G = xb1_geo(m), sz = xb1_sz(m), cs = (m.c.seed | 0) % 99991;
    var ordE = xb1_single(m, G) ? jzN(xb1_ord(m)) : '(textTotal>1?(textIndex-1)/(textTotal-1):0)';
    var q = xb1_hd(m) + XB1_MK + 'var T=time-0.5-' + xb1_n((cs % 5) * 0.06) + ',cy=Math.floor(T/2.2),si=T-cy*2.2,dr=hh(cy*7.13+' + cs + ')<0.5?1:-1,str=0.7+0.3*hh(cy*3.71+' + cs + '+2),o=' + ordE + ',tau=si-(dr>0?o:1-o)*0.4,' +
        'rr=tau<=0||tau>1.7?0:(tau<0.25?sm(0,0.25,tau):(tau<0.6?1+0.08*Math.sin((tau-0.25)*30):Math.cos((tau-0.6)*9)*Math.exp(-(tau-0.6)*4))),w=dr*rr*HK*str/1.8*100;';
    jzAnimator(L, 'JZ Hold Gust', [['ADBE Text Position 3D', [sz * 0.12 * 1.8, 0, 0]], ['ADBE Text Rotation', 3 * 1.8]], q + 'w');
    jzAnimator(L, 'JZ Hold Lean', [['ADBE Text Skew', 18 * 1.8]], q + '-w');
} });

/* ---- dangle — ぶら下がり: every glyph hangs from its own top edge and swings like a small pendulum at its own tempo */
jzReg('hold', 'dangle', { apply: function (m) {
    var L = m.L, G = xb1_geo(m), a = G.fs * 0.5, K = a * 0.25;
    var q = xb1_hd(m) + XB1_MK + 'var w=6.2832*(0.5+0.28*hh(textIndex*61.1+SD)),ph=hh(textIndex*61.7+SD)*6.2832,th=(6.5*Math.sin(w*time+ph)+1.6*Math.sin(w*2.7*time+ph*2))*HK,tr=th*Math.PI/180;';
    jzAnimator(L, 'JZ Hold Swing', [['ADBE Text Rotation', 14]], q + 'th/14*100');
    jzAnimator(L, 'JZ Hold Hang', [['ADBE Text Position 3D', [K, K, 0]]], q + '[-' + xb1_n(a) + '*Math.sin(tr)/' + jzN(K) + '*100,' + jzN(a) + '*(Math.cos(tr)-1)/' + jzN(K) + '*100,0]');
} });

/* ---- eqBounce — 音圧で伸びる: glyphs stretch up from the baseline like level-meter bars (noise-driven level, as the browser does
   without audio energy); peaks light up in the accent colour */
jzReg('hold', 'eqBounce', { apply: function (m) {
    var L = m.L, G = xb1_geo(m), C = xb1_col(m), mi = m.o.mi || 0, vert = G.vert;
    var q = xb1_hd(m) + XB1_MK + 'var base=0.45+0.4*noise([time*2.6,SD]),bd=cl(base*(0.3+0.7*(0.5+0.5*noise([time*6.5+(textIndex-1+' + mi + ')*1.9,SD+3])))*1.15),st=0.32*bd*HK/0.6*100;';
    jzAnimator(L, 'JZ Hold Level', [['ADBE Text Scale 3D', vert ? [160, 100, 100] : [100, 160, 100]]], q + (vert ? '[st,0,0]' : '[0,st,0]'));
    if (!vert) jzAnimator(L, 'JZ Hold Level Base', [['ADBE Text Position 3D', [0, G.fs * 0.3, 0]]], q + '[0,-st,0]');
    jzAnimator(L, 'JZ Hold Peak', [['ADBE Text Fill Color', jzHex(C.acc)]], q + 'bd>0.72?(bd-0.72)/0.28*0.7*HKK*100:0');
} });

/* ---- flashBox — 拍で反転: on every beat (0.62 s) one glyph is punched out in inverse video: an accent block pops behind it and
   the glyph turns to the background colour */
jzReg('hold', 'flashBox', { apply: function (m) {
    var L = m.L, G = xb1_geo(m), C = xb1_col(m), single = xb1_single(m, G), N = xb1_cutN(m), cs = (m.c.seed | 0) % 99991, i, VI = [], X = [], Y = [], WW = [];
    for (i = 0; i < G.n; i++) if (!G.g[i].sp) { VI.push(i + 1); X.push(G.g[i].x); Y.push(G.g[i].y); WW.push(G.vert ? G.fs : G.g[i].w); }
    if (!VI.length) return;
    var knock = jzContrast(C.bg, C.acc) >= 2.5 ? C.bg : jzOnCol(C.sc, C.acc);
    var ev = XB1_MK + 'var fbi=Math.floor(time/0.62),fbu=(time-fbi*0.62)/0.372,fbp=Math.floor(hh(fbi*7.7+' + cs + '+0.5)*' + N + ')%' + N + ',fbk=' + (single ? '0' : 'fbp%' + VI.length) +
        ',VI=' + xb1_arr(VI) + ',fbon=HK>=0.35&&fbu<1&&time>=0' + (single ? '&&fbp==' + (m.o.mi || 0) : '') + ';';
    var HD = xb1_hd(m) + ev;
    jzAnimator(L, 'JZ Hold Knockout', [['ADBE Text Fill Color', jzHex(knock)], ['ADBE Text Stroke Color', jzHex(knock)]], HD + 'fbon&&textIndex==VI[fbk]?100:0');
    jzAnimator(L, 'JZ Hold Punch', [['ADBE Text Scale 3D', [105, 105, 100]]], HD + 'fbon&&textIndex==VI[fbk]?(1-fbu)*100:0');
    if (!xb1_main(m) || xb1_crowded(m, G)) return;
    var S = xb1_shape(m, 'JZ Hold Flash Box', null, true, true), g = jzGrp(S, 'box'), rc = jzAddRect(g, 10, 10, 0); jzAddFill(g, C.acc);
    var at = 'var X=' + xb1_arr(X) + ',Y=' + xb1_arr(Y) + ',WW=' + xb1_arr(WW) + ',pop=ob(cl(fbu/0.18),2.2);';
    jzSetExpr(rc.property('ADBE Vector Rect Size'), HD + at + '[(WW[fbk]||SZ)*1.06*pop,' + jzN(G.fs) + '*1.06*pop]');
    jzSetExpr(jzGX(g).property('ADBE Vector Position'), HD + at + '[X[fbk]||0,Y[fbk]||0]');
    jzSetExpr(jzGX(g).property('ADBE Vector Group Opacity'), HD + 'fbon&&PO<=0?100:0');
} });

/* ---- glintSweep — 光沢: every 2.4 s a slanted band of light slides across the letters (a highlight-coloured twin seen through two
   slanted bands of a moving matte) */
jzReg('hold', 'glintSweep', { apply: function (m) {
    var L = m.L, G = xb1_geo(m), r = G.r, sz = xb1_sz(m), C = xb1_col(m), mi = m.o.mi || 0, i;
    var pad = sz * 0.2, x0 = r.left - pad, y0 = r.top - pad, x1 = r.left + r.width + pad, y1 = r.top + r.height + pad, hh2 = (y1 - y0) / 2, yc = (y0 + y1) / 2;
    var gc = jzLum(C.c0) > 0.72 ? C.acc : jzMixHex(C.c0, '#FFFFFF', 0.85), bw = sz * 0.34, sl = (y1 - y0) * 0.45;
    var ev = XB1_MK + 'var gT=time-0.5-' + xb1_n(mi * 0.04) + ',gu=((gT%2.4)+2.4)%2.4/0.75,gx=' + jzN(x0 - bw - sl) + '+' + jzN((x1 - x0) + 2 * (bw + sl)) + '*ios(gu),ga=Math.min(1,HK)*0.9;';
    var HD = xb1_hd(m) + ev;
    if (xb1_crowded(m, G) || !xb1_main(m)) {      // per glyph: lit while the band passes over it
        var XX = [], YY = [];
        for (i = 0; i < G.n; i++) { XX.push(G.g[i].x); YY.push(G.g[i].y); }
        jzAnimator(L, 'JZ Hold Glint', [['ADBE Text Fill Color', jzHex(gc)]], HD + 'var X=' + xb1_arr(XX) + ',Y=' + xb1_arr(YY) + ',z=((X[textIndex-1]||0)-gx-' + xb1_n(sl) + '*(' + jzN(yc) + '-(Y[textIndex-1]||0))/' + jzN(hh2) + ')/' + jzN(bw) + ';gu<1&&PO<=0?Math.max(0,1-Math.abs(2*z))*ga*100:0');
        return;
    }
    var T = xb1_twin(m, 'JZ Hold Glint', ev, 'PO<=0&&gu<1&&HK>0.05?ga:0', null, true);
    jzNoGhost(T);
    jzAnimator(T, 'JZ Hold Glint', [['ADBE Text Fill Color', jzHex(gc)], ['ADBE Text Stroke Color', jzHex(gc)]], '100');
    var M = xb1_matteShape(m, T, 'JZ Hold Glint Matte', false, true), g = jzGrp(M, 'glint');
    var band = function (a, w) { jzAddPath(g, [[a + sl, y0], [a + w + sl, y0], [a + w - sl, y1], [a - sl, y1]], true); };
    band(-bw / 2, bw); band(bw * 0.75, bw * 0.28);
    jzAddFill(g, '#FFFFFF');
    jzSetExpr(jzGX(g).property('ADBE Vector Position'), HD + '[gx,0]');
} });

/* ---- flipSwap — 時々裏返る: every 1.6 s one glyph flips over like a card, shows another character on its back (accent colour,
   Character Offset) and flips home */
jzReg('hold', 'flipSwap', { apply: function (m) {
    var L = m.L, G = xb1_geo(m), single = xb1_single(m, G), N = xb1_cutN(m), cs = (m.c.seed | 0) % 99991, C = xb1_col(m), i, VI = [];
    for (i = 0; i < G.n; i++) if (!G.g[i].sp) VI.push(i + 1);
    if (!VI.length) return;
    var q = xb1_hd(m) + XB1_MK + 'var fT=time-0.45,fc=Math.floor(fT/1.6),fu=(fT-fc*1.6)/0.95,fp=Math.floor(hh(fc*5.3+' + cs + '+0.25)*' + N + ')%' + N + ',fk=' + (single ? '0' : 'fp%' + VI.length) + ',VI=' + xb1_arr(VI) + ',' +
        'on=HK>=0.5&&fu<1&&fT>=0' + (single ? '&&fp==' + (m.o.mi || 0) : '') + '&&textIndex==VI[fk],sx=1,alt=0;' +
        'if(fu<0.18){sx=Math.cos(fu/0.18*Math.PI/2);}else if(fu<0.36){sx=Math.sin((fu-0.18)/0.18*Math.PI/2);alt=1;}else if(fu<0.64){alt=1;}else if(fu<0.82){sx=Math.cos((fu-0.64)/0.18*Math.PI/2);alt=1;}else{sx=Math.sin((fu-0.82)/0.18*Math.PI/2);}' +
        'sx=Math.max(0.02,sx);';
    jzAnimator(L, 'JZ Hold Flip', [['ADBE Text Scale 3D', [0, 100, 100]]], q + 'on?[(1-sx)*100,0,0]:[0,0,0]');
    jzAnimator(L, 'JZ Hold Back', [['ADBE Text Character Offset', 40], ['ADBE Text Fill Color', jzHex(C.acc)]], q + 'on&&alt?(1+Math.floor(hh(fc*9.1+' + cs + ')*38))/40*100:0');
} });

/* ---- shadowSway — 影が揺れる: a long soft shadow that swings slowly as if the light source were moving (two stacked drop shadows
   along the swinging angle: a tight base and a long soft tail) */
jzReg('hold', 'shadowSway', { apply: function (m) {
    var L = m.L, C = xb1_col(m), col = C.dark ? jzMixHex(C.bg, C.acc, 0.42) : jzMixHex(C.bg, C.c0, 0.3), ph = (m.c.seed | 0) % 10;
    var ev = XB1_MK + 'var sa=60+45*Math.sin(time*6.2832/5.5+' + ph + '),sL=SZ*(0.12+0.05*Math.sin(time*6.2832/3.3+1))*Math.min(1.3,HK);';
    var HD = xb1_hd(m) + ev, k, sh = [[0.45, 0.3, 0.9], [1, 0.75, 0.55]];
    for (k = 0; k < sh.length; k++) {
        var ds = jzEffect(L, 'ADBE Drop Shadow', 'JZ Hold Sway ' + (k + 1));
        jzEP(ds, 1, jzHex(col));
        jzEX(ds, 2, HD + jzN(sh[k][2] * 255) + '*cl(HK*5)'); jzEX(ds, 3, HD + 'sa+90');
        jzEX(ds, 4, HD + 'sL*' + jzN(sh[k][0])); jzEX(ds, 5, HD + 'sL*' + jzN(sh[k][1]));
    }
} });

/* ---- magnetJiggle — 磁力: an invisible magnet wanders round the text; nearby glyphs lean and buzz towards it */
jzReg('hold', 'magnetJiggle', { apply: function (m) {
    var L = m.L, G = xb1_geo(m), r = G.r, sz = xb1_sz(m), i, sd9 = ((m.c.seed | 0) + (m.o.mi || 0) * 101) % 9;
    if (xb1_single(m, G)) {       // the magnet wanders over the screen; the glyph layer is pulled as a whole
        var W = m.W, H = m.H, s0 = xb1_s0(L), P0 = xb1_toComp(L, G.cx, G.cy), szc = sz * s0;
        var ev = XB1_MK + 'var mx=' + jzN(W / 2) + '+Math.sin(time*0.9+' + ((m.c.seed | 0) % 9) + ')*' + jzN(W * 0.36) + '-' + xb1_n(P0[0]) + ',my=' + jzN(H / 2) + '+Math.sin(time*1.7+1)*' + jzN(H * 0.12) + '-' + xb1_n(P0[1]) + ',' +
            'md=Math.max(1,Math.sqrt(mx*mx+my*my)),mf=1/(1+Math.pow(md/' + jzN(szc * 1.1) + ',2)),mp=' + jzN(szc * 0.2) + '*mf*HK,mb=mf>0.35?(hh(Math.floor(time*24)*13+SD)*2-1)*' + jzN(szc * 0.014) + '*HK*mf:0;';
        m.parts.pos.push(XB1_FNS + ev + 'd=[d[0]+mx/md*mp+mb,d[1]+my/md*mp];');
        m.parts.rot.push(XB1_FNS + ev + 'r+=mx/md*7*mf*HK;');
        return;
    }
    var X = [], Y = [], K = sz * 0.4;
    for (i = 0; i < G.n; i++) { X.push(G.g[i].x); Y.push(G.g[i].y); }
    var q = xb1_hd(m) + XB1_MK + 'var X=' + xb1_arr(X) + ',Y=' + xb1_arr(Y) + ',mx=' + jzN(r.left + r.width / 2) + '+Math.sin(time*0.9+' + sd9 + ')*' + jzN(r.width * 0.5) + '-(X[textIndex-1]||0),' +
        'my=' + jzN(r.top + r.height / 2) + '+Math.sin(time*1.7+1)*' + jzN(r.height * 0.9) + '-(Y[textIndex-1]||0),md=Math.max(1,Math.sqrt(mx*mx+my*my)),mf=1/(1+Math.pow(md/(SZ*1.1),2)),mp=SZ*0.2*mf*HK,' +
        'mb=mf>0.35?(hh(Math.floor(time*24)*13+textIndex*7+SD)*2-1)*SZ*0.014*HK*mf:0;';
    jzAnimator(L, 'JZ Hold Pull', [['ADBE Text Position 3D', [K, K, 0]]], q + '[(mx/md*mp+mb)/' + jzN(K) + '*100,my/md*mp/' + jzN(K) + '*100,0]');
    jzAnimator(L, 'JZ Hold Lean', [['ADBE Text Rotation', 11.2]], q + 'mx/md*7*mf*HK/11.2*100');
} });

/* ---- typeRattle — タイプの震え: an uneven, hand-struck baseline; on each beat (0.45 s) a few keys are struck again: a dip, then
   a new resting place */
jzReg('hold', 'typeRattle', { apply: function (m) {
    var L = m.L, sz = xb1_sz(m), K = sz * 0.14;
    var q = xb1_hd(m) + XB1_MK + 'var bi=Math.floor(time/0.45),bs=time-bi*0.45,ep=-99;for(var b=bi;b>bi-7;b--){if(hh(b*3.17+textIndex*7.31+SD)<0.3){ep=b;break;}}' +
        'var hit=ep==bi&&bs<0.1?1-bs/0.1:0,r1=hh(ep*1.31+textIndex*5.7+SD+0.1)*2-1,r2=hh(ep*2.17+textIndex*3.3+SD+0.2)*2-1,r3=hh(ep*4.1+textIndex*1.9+SD+0.3)*2-1,r4=hh(ep*0.77+textIndex*8.9+SD+0.4);';
    jzAnimator(L, 'JZ Hold Strike', [['ADBE Text Position 3D', [K, K, 0]]], q + '[r2*SZ*0.01*HK/' + jzN(K) + '*100,(r1*SZ*0.045*HK+hit*SZ*0.04*HK)/' + jzN(K) + '*100,0]');
    jzAnimator(L, 'JZ Hold Tilt', [['ADBE Text Rotation', 5.2]], q + 'r3*3.2*HK/5.2*100');
    jzAnimator(L, 'JZ Hold Ink', [['ADBE Text Opacity', 0]], q + '(0.2*r4*HKK+0.15*hit*HKK)*100');
} });

/* ---- focusRack — ピント送り: a plane of focus drifts along the line; glyphs away from it soften, dim and grow slightly */
jzReg('hold', 'focusRack', { apply: function (m) {
    var L = m.L, G = xb1_geo(m), sz = xb1_sz(m), B = Math.min(sz * 0.065, 18 * m.u), cs7 = (m.c.seed | 0) % 7;
    var ordE = xb1_single(m, G) ? jzN(xb1_ord(m)) : '(textTotal>1?(textIndex-1)/(textTotal-1):0)';
    var q = xb1_hd(m) + XB1_MK + 'var fp=0.5+0.62*Math.sin(time*6.2832/4.6+' + cs7 + '),df=cl((Math.abs(' + ordE + '-fp)-0.1)/0.5);';
    jzAnimator(L, 'JZ Hold Defocus', [['ADBE Text Blur', [B, B]]], q + 'df*df*HKK*100');
    jzAnimator(L, 'JZ Hold Dim', [['ADBE Text Opacity', 0]], q + '28*df*HKK');
    jzAnimator(L, 'JZ Hold Swell', [['ADBE Text Scale 3D', [110, 110, 100]]], q + 'var a=0.035*df*HK/0.1*100;[a,a,0]');
} });

/* ---- pluckString — 弦の振動: the line vibrates as a standing wave between its ends, plucked again every 2.4 s and ringing down */
jzReg('hold', 'pluckString', { apply: function (m) {
    var L = m.L, G = xb1_geo(m), sz = xb1_sz(m), vert = G.vert, single = xb1_single(m, G), N = xb1_cutN(m), i, XS = [], K = sz * 0.18 * 1.6 * 1.3;
    for (i = 0; i < G.n; i++) XS.push(single ? ((m.o.mi || 0) + 1) / (N + 1) : vert ? (G.g[i].li + 1) / (G.nL + 1) : (G.g[i].ci + 1) / (G.g[i].nl + 1));
    var q = xb1_hd(m) + XB1_MK + 'var XS=' + xb1_arr(XS) + ',tau=(((time-0.45)%2.4)+2.4)%2.4,A=SZ*0.18*HK*Math.exp(-tau*1.7)*Math.min(1,tau/0.04),x=XS[textIndex-1]||0.5,' +
        'y=A*(Math.sin(Math.PI*x)*Math.cos(tau*6.2832*3.2)+0.3*Math.sin(6.2832*x)*Math.cos(tau*6.2832*6.6+1)),a=y/' + jzN(K) + '*100;';
    jzAnimator(L, 'JZ Hold Pluck', [['ADBE Text Position 3D', vert ? [K, 0, 0] : [0, K, 0]]], q + '[a,a,0]');
} });
