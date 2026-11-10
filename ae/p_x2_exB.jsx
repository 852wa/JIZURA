// ================================================================ pack x2exB (AE port of src/11p_x2_exB.js) — 27 mask / clip / band exits
// windows : xiCropTurns xiFinder xiCounterWipe xiTwoPass xiCentreOut
// shapes  : xiDiagPinch xiMothHoles xiSawBite xiRadialBlinds xiPortholes xiLattice xiRings xiSpiralTiles xiEyelid xiPicket
// bands   : xiFields xiDrawers xiCounterScroll xiPistons xiSliceWave
// plates  : xiPlateCarry xiTwinPlates xiRollShutter xiRedact xiInverseBand xiFillDrop xiDotted
// Every exit runs on p = PO (0 at the exit start, 1 at the cut end; layers holding ONE glyph of a longer cut leave one after
// another in reading order, like the browser). All geometry lives in the text layer's own space on its source rect:
// "along" (A) = the writing direction, "cross" (B) = across it, so one recipe serves horizontal and vertical text.
// Moving clip shapes = a linked copy of the lyric ("twin": duplicate parented to L, takes L's final text style, visible only
// during the exit while L hides) seen through a shape-layer track matte parented to L whose shapes are driven by expressions.
// Bands / slices = one twin per band with a static rect mask, moved by its position; a clip that stays in place while the
// band moves is a subtract mask beyond the box edge whose expansion follows the move. Covering plates wipe L itself with
// such a mask. Bars, ticks, rails, rims and plates are shape layers parented to L (jzNoGhost, main copy only).

// ---------------------------------------------------------------- shared helpers (axi_*)
// easings not in JZ_FNS: io3 inOutCubic, ios inOutSine, sm smoothstep(a, b, x), win = the browser's win(p, o, spread),
// sg = the browser's seg(x, a, b), lp = lerp
var AXI_FNS = 'function io3(x){x=cl(x);return x<0.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;}' +
    'function ios(x){x=cl(x);return -(Math.cos(Math.PI*x)-1)/2;}function sm(a,b,x){x=cl((x-a)/(b-a));return x*x*(3-2*x);}' +
    'function win(p,o,s){return cl((p-o*s)/(1-s));}function sg(x,a,b){return cl((x-a)/(b-a));}function lp(a,b,t){return a+(b-a)*t;}\n';
function axi_sz(m) { var f = 0; try { f = jzFontSize(m.L); } catch (e) {} return f > 1 ? f : (m.size || 100); }
function axi_T(m) { var c = m.c; return { IN: Math.max(0.02, c.inDur || 0.3), DL: (m.o.mi || 0) * (c.stagger || 0.04), OS: c.dur - (c.outDur || 0), DUR: c.dur }; }
// measuring time: entrance done, hold barely started
function axi_tm(m) { var t = axi_T(m); return Math.max(0, Math.min(t.OS - 0.01, t.DL + t.IN + 0.03)); }
function axi_arr(a) { var s = [], i; for (i = 0; i < a.length; i++) s.push(jzN(a[i])); return '[' + s.join(',') + ']'; }
function axi_isHex(c) { return typeof c === 'string' && c.charAt(0) === '#' && (c.length === 7 || c.length === 4); }
function axi_pick(a, b, c) { if (axi_isHex(a)) return a; if (axi_isHex(b)) return b; if (axi_isHex(c)) return c; return '#FFFFFF'; }
function axi_same(a, b) {
    if (!axi_isHex(a) || !axi_isHex(b)) return false;
    var x = jzHex(a), y = jzHex(b);
    return Math.abs(x[0] - y[0]) + Math.abs(x[1] - y[1]) + Math.abs(x[2] - y[2]) < 0.012;
}
// colours: c0 the text's own, hot = the browser's hot(env, it), plate = its plateCol(env, it)
function axi_col(m) {
    var sc = m.ctx.sc, bg = axi_pick(sc.bg, '#000000'), acc = axi_pick(sc.accent, sc.fg), c0 = jzTextColor(m.L);
    var hot = axi_same(c0, sc.accent) ? axi_pick(sc.accent2, sc.fg, acc) : acc, plate = hot;
    if (axi_isHex(sc.ink) && axi_isHex(sc.bg) && !axi_same(sc.ink, c0) && Math.abs(jzLum(sc.ink) - jzLum(sc.bg)) > 0.3) plate = sc.ink;
    return { bg: bg, acc: acc, c0: c0, hot: hot, plate: plate };
}
// the browser's J.h / J.r / J.rs (seeded choices match the web version)
function axi_h(a, b, c, d, e) {
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
function axi_r(a, b, c, d) { return axi_h(a, b, c, d) / 4294967296; }
function axi_rs(a, b, c, d) { return axi_r(a, b, c, d) * 2 - 1; }
function axi_bit(m, k) { return (axi_h(m.c.seed | 0, k, 991) & 1) === 1; }     // the browser's cutBit: one choice per cut
function axi_cutN(m) { return Math.max(1, jzCount(String(m.c.text || ''))); }
function axi_isSp(ch) { return ch === ' ' || ch === '　' || ch === '\t'; }
function axi_adv(ch) { var c = ch.charCodeAt(0); if (ch === ' ') return 0.3; if (c >= 0xFF61 && c <= 0xFF9F) return 0.5; return c < 0x2000 ? 0.56 : 1; }
function axi_rectAt(L, t) { try { var r = L.sourceRectAtTime(t, false); if (r && r.width > 0 && r.height > 0) return r; } catch (e) {} return jzRect(L); }
// glyph geometry in the text layer's own space (textIndex order, spaces included):
//   G.g[i] {i, li, sp, x, y (centre), w}; G.r source rect; G.fs; G.vert (one glyph per line); G.n; G.nk (glyphs without spaces)
function axi_geo(m) {
    var L = m.L, TP = L.property('ADBE Text Properties'), td = TP.property('ADBE Text Document').value, r = axi_rectAt(L, axi_tm(m)), i, j;
    var fs = td.fontSize || axi_sz(m), text = String(td.text), trk = (td.tracking || 0) / 1000 * fs;
    var lines = text.split(/\r\n|\r|\n|\u0003/), nL = lines.length, lead = fs * 1.2;
    try { if (!td.autoLeading && td.leading > 0) lead = td.leading; } catch (e0) {}
    var just = 'c';
    try { if (td.justification === ParagraphJustification.LEFT_JUSTIFY) just = 'l'; else if (td.justification === ParagraphJustification.RIGHT_JUSTIFY) just = 'r'; } catch (e1) {}
    var G = { fs: fs, lead: lead, nL: nL, r: r, n: 0, nk: 0, g: [], vert: nL > 1, fill: td.applyFill !== false, stroke: !!(td.applyStroke && td.strokeWidth > 0) }, rows = [], maxW = 0;
    for (i = 0; i < nL; i++) {
        var cs = jzChars(lines[i]), ws = [], w = 0;
        for (j = 0; j < cs.length; j++) { var a = axi_adv(cs[j]) * fs; ws.push(a); w += a + (j < cs.length - 1 ? trk : 0); }
        if (cs.length > 1) G.vert = false;
        rows.push({ cs: cs, ws: ws, w: w }); if (w > maxW) maxW = w;
    }
    var k = maxW > 0 ? r.width / maxW : 1; if (!(k > 0.5 && k < 2)) k = 1;
    var lh = r.height - (nL - 1) * lead; if (!(lh > fs * 0.5 && lh < fs * 1.6)) lh = fs * 0.95;
    var cx = r.left + r.width / 2;
    for (i = 0; i < nL; i++) {
        var R = rows[i], x = just === 'l' ? r.left : (just === 'r' ? r.left + r.width - R.w * k : cx - R.w * k / 2), y = r.top + lh / 2 + i * lead;
        for (j = 0; j < R.cs.length; j++) {
            var sp = axi_isSp(R.cs[j]);
            G.g.push({ i: G.n, li: i, sp: sp, x: x + R.ws[j] * k / 2, y: y, w: Math.max(1, R.ws[j] * k) });
            x += (R.ws[j] + trk) * k; G.n++;
            if (!sp) G.nk++;
        }
    }
    return G;
}
function axi_xf(L) { var tr = L.property('ADBE Transform Group'); return { a: tr.property('ADBE Anchor Point').value, p: tr.property('ADBE Position').value, s: tr.property('ADBE Scale').value, r: tr.property('ADBE Rotate Z').value }; }
function axi_toComp(L, x, y) {
    var X = axi_xf(L), rr = X.r * Math.PI / 180, ux = (x - X.a[0]) * X.s[0] / 100, uy = (y - X.a[1]) * X.s[1] / 100;
    return [X.p[0] + Math.cos(rr) * ux - Math.sin(rr) * uy, X.p[1] + Math.sin(rr) * ux + Math.cos(rr) * uy];
}
// along / cross -> x / y (numbers, expression strings, rect corner lists)
function axi_pt(v, a, b) { return v ? [b, a] : [a, b]; }
function axi_xy(v, a, b) { return v ? '[' + b + ',' + a + ']' : '[' + a + ',' + b + ']'; }
function axi_rp(v, a0, b0, a1, b1) { return v ? [[b1, a0], [b1, a1], [b0, a1], [b0, a0]] : [[a1, b0], [a1, b1], [a0, b1], [a0, b0]]; }
// part context: box (source rect + pad × font size) as along / cross extents, expression header with p, ON and the box constants
function axi_K(m, padK) {
    var L = m.L, G = axi_geo(m), r = G.r, sz = axi_sz(m), pad = sz * padK, v = G.vert, sc = L.property('ADBE Transform Group').property('ADBE Scale').value;
    var s0 = (Math.abs(sc[0]) + Math.abs(sc[1])) / 200; if (!(s0 > 0.01)) s0 = 1;
    var K = { m: m, L: L, G: G, r: r, sz: sz, v: v, s0: s0, u: m.u / s0, C: axi_col(m), M: null,
        x0: r.left - pad, y0: r.top - pad, x1: r.left + r.width + pad, y1: r.top + r.height + pad };
    K.w = K.x1 - K.x0; K.h = K.y1 - K.y0; K.cx = (K.x0 + K.x1) / 2; K.cy = (K.y0 + K.y1) / 2;
    K.a0 = v ? K.y0 : K.x0; K.a1 = v ? K.y1 : K.x1; K.b0 = v ? K.x0 : K.y0; K.b1 = v ? K.x1 : K.y1;
    K.len = K.a1 - K.a0; K.cr = K.b1 - K.b0; K.ac = (K.a0 + K.a1) / 2; K.bc = (K.b0 + K.b1) / 2;
    K.big = (r.width + r.height) * 2 + sz * 8;
    K.th = Math.max(3 * K.u, sz * 0.045);                 // the browser's barW
    K.far = (v ? m.H : m.W) / s0 + K.len;                 // far enough along the line to be off the screen
    K.single = G.nk === 1 && axi_cutN(m) > 1;
    K.seed = (m.c.seed | 0) + (m.o.mi || 0) * 101;
    var N = axi_cutN(m), ord = N > 1 ? jzClamp((m.o.mi || 0) / (N - 1), 0, 1) : 0;
    K.pre = AXI_FNS + 'var p=' + (K.single ? 'win(PO,' + jzN(ord) + ',0.4)' : 'PO') + ';if(PO>=0.998)p=1;var ON=p>0&&p<0.998,' +
        'A0=' + jzN(K.a0) + ',A1=' + jzN(K.a1) + ',B0=' + jzN(K.b0) + ',B1=' + jzN(K.b1) + ',AC=' + jzN(K.ac) + ',BC=' + jzN(K.bc) +
        ',LEN=' + jzN(K.len) + ',CR=' + jzN(K.cr) + ',BIG=' + jzN(K.big) + ',TH=' + jzN(K.th) + ',FAR=' + jzN(K.far) + ';';
    K.HD = m.HD + K.pre + 'var SZ=' + jzN(sz) + ';\n';
    return K;
}
// the lyric's main (opaque, filled) copy: helper graphics only go there
function axi_main(K) {
    try { if (!K.G.fill) return false; return jzXf(K.L, 'ADBE Opacity').value >= 85; } catch (e) { return true; }
}
// too many layers already (one glyph per layer with a long line, very long lines, crowded comps): no copies
function axi_crowded(K, extra) {
    if (K.G.n > 60 || (K.single && axi_cutN(K.m) > 8)) return true;
    try { return K.m.ctx.comp.numLayers + (extra || 0) > 70; } catch (e) { return false; }
}
function axi_matted(L) { try { return !!L.trackMatteType && L.trackMatteType !== TrackMatteType.NO_TRACK_MATTE; } catch (e) { return false; } }
// the layer new helper layers go above (above the lyric's own track matte when it has one)
function axi_top(m) { var L = m.L; if (axi_matted(L)) { try { return m.ctx.comp.layer(L.index - 1); } catch (e) {} } return L; }
function axi_live(m, Lx) { var t = axi_T(m); try { if (t.OS - 0.05 > Lx.inPoint) Lx.inPoint = t.OS - 0.05; } catch (e) {} }
function axi_reset(S) {
    var tr = S.property('ADBE Transform Group');
    tr.property('ADBE Anchor Point').setValue([0, 0]); tr.property('ADBE Position').setValue([0, 0]);
    tr.property('ADBE Scale').setValue([100, 100]); tr.property('ADBE Rotate Z').setValue(0);
}
// linked copy of the lyric: parented to L, takes its final text style; opacity = value × fac, optional offset [x, y] (expressions
// after K.HD + pre, in L's own space)
function axi_twin(K, tag, pre, fac, off, above) {
    var m = K.m, L = m.L, top = above || axi_top(m), D = L.duplicate(), i, mns = ['ADBE Position', 'ADBE Scale', 'ADBE Rotate Z', 'ADBE Opacity', 'ADBE Anchor Point'];
    try { D.name = String(L.name).substr(0, 18) + ' ' + tag; } catch (e0) {}
    var tr = D.property('ADBE Transform Group');
    for (i = 0; i < mns.length; i++) { try { if (tr.property(mns[i]).expression) tr.property(mns[i]).expression = ''; } catch (e1) {} }
    if (axi_matted(D) && typeof D.setTrackMatte !== 'function') { try { D.trackMatteType = TrackMatteType.NO_TRACK_MATTE; } catch (e2) {} }
    D.parent = L;
    tr.property('ADBE Scale').setValue([100, 100]); tr.property('ADBE Rotate Z').setValue(0);
    jzSetExpr(tr.property('ADBE Position'), off ? K.HD + (pre || '') + 'var tw_o=' + off + ',tw_q=parent.transform.anchorPoint;[tw_q[0]+tw_o[0],tw_q[1]+tw_o[1]]' : 'parent.transform.anchorPoint');
    jzSetExpr(tr.property('ADBE Opacity'), K.HD + (pre || '') + 'value*(' + fac + ')');
    try { D.property('ADBE Text Properties').property('ADBE Text Document').expression = 'parent.text.sourceText.style'; } catch (e3) {}
    axi_live(m, D);
    try { D.moveBefore(top); } catch (e4) {}
    return D;
}
// alpha (or inverted) track matte shape layer for the twin T, in L's space, right above T
function axi_matte(K, T, name, inv) {
    var m = K.m, S = m.ctx.comp.layers.addShape(), tp = inv ? TrackMatteType.ALPHA_INVERTED : TrackMatteType.ALPHA, ok = false;
    try { S.name = name; } catch (e0) {}
    try { S.moveBefore(T); } catch (e1) {}
    S.parent = m.L; axi_reset(S); axi_live(m, S);
    if (typeof T.setTrackMatte === 'function') { try { T.setTrackMatte(S, tp); ok = true; } catch (e2) { ok = false; } }
    if (!ok) { try { T.trackMatteType = tp; } catch (e3) { jzWarn('axi matte: ' + e3.toString()); } }
    try { S.enabled = false; } catch (e4) {}
    return S;
}
// L hides while its copies play the exit / L stays and takes a factor (p >= 0.998: everything is gone, like the browser's safety net)
function axi_hideL(K, pre, cond) { K.m.parts.op.push(K.pre + (pre || '') + 'f*=(' + (cond || 'p>0') + ')||p>=0.998?0:1;'); }
function axi_safe(K, pre, fac) { K.m.parts.op.push(K.pre + (pre || '') + 'f*=p>=0.998?0:(' + (fac || '1') + ');'); }
// the usual set-up: L hides, a twin shows through a matte (returned; the part adds the matte's shapes)
function axi_clip(K, tag, inv, pre) {
    axi_hideL(K);
    var T = axi_twin(K, 'JZ Out ' + tag, pre || '', 'ON?1:0', null);
    K.T = T; K.M = axi_matte(K, T, 'JZ Out ' + tag + ' Matte', inv);
    return K.M;
}
// helper graphics layer in L's own space (main copy only): opacity = fac (0..1) while the exit runs
function axi_gfx(K, name, pre, fac, above) {
    if (!axi_main(K)) return null;
    var m = K.m, S = m.ctx.comp.layers.addShape();
    try { S.name = name; } catch (e0) {}
    try { S.moveBefore(above || K.M || axi_top(m)); } catch (e1) {}
    S.parent = m.L; axi_reset(S); axi_live(m, S); jzNoGhost(S);
    jzSetExpr(jzXf(S, 'ADBE Opacity'), K.HD + (pre || '') + 'ON?100*(' + (fac || '1') + '):0');
    return S;
}
// rect group whose edges [a0, b0, a1, b1] (along / cross) are expressions; op = group opacity expression (0..100)
function axi_rect(S, name, col, K, pre, e, op) {
    var g = jzGrp(S, name), rc = jzAddRect(g, 10, 10, 0);
    var q = K.HD + (pre || '') + 'var ra=' + e[0] + ',rb=' + e[1] + ',rc=' + e[2] + ',rd=' + e[3] + ';';
    jzSetExpr(rc.property('ADBE Vector Rect Size'), q + axi_xy(K.v, 'Math.max(0,rc-ra)', 'Math.max(0,rd-rb)'));
    jzSetExpr(rc.property('ADBE Vector Rect Position'), q + axi_xy(K.v, '(ra+rc)/2', '(rb+rd)/2'));
    jzAddFill(g, col);
    if (op) jzSetExpr(jzGX(g).property('ADBE Vector Group Opacity'), K.HD + (pre || '') + op);
    return g;
}
function axi_rep(g, copies, x, y) {
    var rp = jzVecs(g).addProperty('ADBE Vector Filter - Repeater');
    rp.property('ADBE Vector Repeater Copies').setValue(copies);
    rp.property('ADBE Vector Repeater Transform').property('ADBE Vector Repeater Position').setValue([x, y]);
}
// masks (layer space). 'sub' = subtract; 'add' = add when it is the layer's first active mask, else intersect
function axi_mask(Lx, pts, mode, name) {
    var prior = 0, i;
    try { var mp = Lx.property('ADBE Mask Parade'); for (i = 1; i <= mp.numProperties; i++) if (mp.property(i).maskMode !== MaskMode.NONE) prior++; } catch (e0) {}
    var mk = Lx.property('ADBE Mask Parade').addProperty('ADBE Mask Atom'), sh = new Shape();
    sh.vertices = pts; sh.closed = true; mk.property('ADBE Mask Shape').setValue(sh);
    try { mk.maskMode = mode === 'sub' ? MaskMode.SUBTRACT : (prior ? MaskMode.INTERSECT : MaskMode.ADD); } catch (e) {}
    try { if (name) mk.name = name; } catch (e2) {}
    return mk;
}
// wipe on the layer Lx: everything within px (expression, layer units) of the box edge `side` ('a0' 'a1' 'b0' 'b1') is removed —
// a subtract mask beyond that edge whose expansion is px
function axi_wipe(K, Lx, side, pre, px, name) {
    var B = K.big * 4 + K.far, pts;
    if (side === 'a0') pts = axi_rp(K.v, K.a0 - B, K.b0 - B, K.a0, K.b1 + B);
    else if (side === 'a1') pts = axi_rp(K.v, K.a1, K.b0 - B, K.a1 + B, K.b1 + B);
    else if (side === 'b0') pts = axi_rp(K.v, K.a0 - B, K.b0 - B, K.a1 + B, K.b0);
    else pts = axi_rp(K.v, K.a0 - B, K.b1, K.a1 + B, K.b1 + B);
    var mk = axi_mask(Lx, pts, 'sub', name || 'JZ Out Wipe');
    jzSetExpr(mk.property('ADBE Mask Offset'), K.HD + (pre || '') + 'Math.max(0,(' + px + '))');
    jzSetExpr(mk.property('ADBE Mask Opacity'), K.HD + 'p>0?100:0');
    return mk;
}
// no copies possible: a plain wipe along the line
function axi_fallback(K) { axi_wipe(K, K.L, 'a0', '', 'io3(p)*LEN*1.02'); axi_safe(K); }
// bands: one twin per band with a static rect mask. rows = true: strips across the line [lo, hi] (cross) moved ALONG it;
// false: slices along the line [lo, hi] moved ACROSS it. list[k] = { lo, hi, pre, sh (px expression), cut (clip at the box
// edge the band moves towards), dir (+1 / -1: the way it leaves) }
function axi_bands(K, tag, rows, list) {
    var v = K.v, B = K.big * 4 + K.far, k, above = null;
    axi_hideL(K);
    for (k = 0; k < list.length; k++) {
        var o = list[k], lo = k === 0 ? o.lo - B : o.lo, hi = k === list.length - 1 ? o.hi + B : o.hi;
        var T = axi_twin(K, 'JZ Out ' + tag + ' ' + (k + 1), o.pre, 'ON?1:0', rows ? axi_xy(v, '(' + o.sh + ')', '0') : axi_xy(v, '0', '(' + o.sh + ')'), above);
        axi_mask(T, rows ? axi_rp(v, K.a0 - B, lo, K.a1 + B, hi) : axi_rp(v, lo, K.b0 - B, hi, K.b1 + B), 'add', 'JZ Out ' + tag);
        if (o.cut) {
            var pts = rows ? (o.dir > 0 ? axi_rp(v, K.a1, K.b0 - B, K.a1 + B, K.b1 + B) : axi_rp(v, K.a0 - B, K.b0 - B, K.a0, K.b1 + B))
                : (o.dir > 0 ? axi_rp(v, K.a0 - B, K.b1, K.a1 + B, K.b1 + B) : axi_rp(v, K.a0 - B, K.b0 - B, K.a1 + B, K.b0));
            var mk = axi_mask(T, pts, 'sub', 'JZ Out ' + tag + ' Edge');
            jzSetExpr(mk.property('ADBE Mask Offset'), K.HD + o.pre + 'Math.max(0,' + o.dir + '*(' + o.sh + '))');
        }
        above = T;
    }
    K.M = above;
}
// the text becomes its own outline while the exit runs: fill off, a stroke of lw (expression, px) in the text colour
// (texts that already have a stroke keep theirs)
function axi_outline(K, pre, lw, fillOff) {
    var L = K.L, sz = K.sz, added = false;
    if (!K.G.stroke) {
        jzTextDoc(L, function (d) {
            d.applyStroke = true; d.strokeWidth = 0;
            try { d.strokeColor = d.applyFill ? d.fillColor : d.strokeColor; } catch (e) {}
            try { d.strokeOverFill = false; } catch (e2) {}
        });
        added = true;
    }
    if (added) jzAnimator(L, 'JZ Out Line', [['ADBE Text Stroke Width', sz * 0.03]], K.HD + pre + 'var s0=0;try{s0=text.sourceText.style.strokeWidth;}catch(err){}s0>0.5||p<=0?0:(' + lw + ')/' + jzN(sz * 0.03) + '*100');
    if (K.G.fill) jzAnimator(L, 'JZ Out Fill', [['ADBE Text Fill Opacity', 0]], K.HD + pre + (fillOff || 'p>0?100:0'));
}

/* ================================================================ A. WINDOWS */

/* ---- xiCropTurns — 四辺が詰まる: the crop closes one edge at a time (head, top, tail, bottom, round after round), each move a
   clean step marked by a tick on the moving edge */
jzReg('exit', 'xiCropTurns', { apply: function (m) {
    var K = axi_K(m, 0.3);
    if (axi_crowded(K)) { axi_fallback(K); return; }
    var ev = 'var cu=p*11,cn=[0,0,0,0],ci;for(ci=0;ci<11;ci++)cn[ci%4]+=io3(sg(cu-ci,0,0.8));' +
        'var ca=lp(A0,AC,cn[0]/3),cb=lp(B0,BC,cn[1]/3),cc=lp(A1,AC,cn[2]/3),cd=lp(B1,BC,cn[3]/3);if(cc-ca<0.5||cd-cb<0.5){cc=ca;cd=cb;}';
    var M = axi_clip(K, 'Crop');
    axi_rect(M, 'crop', '#FFFFFF', K, ev, ['ca', 'cb', 'cc', 'cd']);
    var S = axi_gfx(K, 'JZ Out Crop Tick', ev, 'cu-Math.floor(cu)<0.86&&cc>ca?1:0');
    if (!S) return;
    axi_rect(S, 'tick', K.C.hot, K, ev + 'var cj=Math.floor(cu)%4,ct=cj==0?[ca-TH,cb,ca,cd]:cj==1?[ca,cb-TH,cc,cb]:cj==2?[cc,cb,cc+TH,cd]:[ca,cd,cc,cd+TH];', ['ct[0]', 'ct[1]', 'ct[2]', 'ct[3]']);
} });

/* ---- xiFinder — 覗き窓が去る: the view narrows to a small framed finder at the head of the line, the finder pans along the
   text, runs off its end and shuts (four corner brackets ride on the window) */
jzReg('exit', 'xiFinder', { apply: function (m) {
    var K = axi_K(m, 0.3), sz = K.sz, v = K.v, i, j;
    if (axi_crowded(K)) { axi_fallback(K); return; }
    var wl = Math.min(Math.max(sz * 0.95, K.len * 0.22), K.len * 0.55), lw = Math.max(2 * K.u, sz * 0.028), m0 = sz * 0.24, gp = lw * 0.5;
    var ev = 'var q1=io3(sg(p,0,0.3)),q2=io3(sg(p,0.3,0.78)),q3=ic(sg(p,0.78,1)),WL=' + jzN(wl) + ',fs=A0+(LEN-WL)*q2+WL*q3,fe=lp(A1,A0+WL,q1)+(LEN-WL)*q2+WL*q3;' +
        (axi_bit(m, 5) ? 'var ft=fs;fs=A0+A1-fe;fe=A0+A1-ft;' : '') +
        'var fh=CR/2*(1-q3),fb=BC-fh,fd=BC+fh;if(fh<0.4||fe-fs<0.4){fe=fs;fd=fb;}var fm=Math.max(0,Math.min(' + jzN(m0) + ',(fe-fs)*0.3,fh*0.7));';
    var M = axi_clip(K, 'Finder');
    axi_rect(M, 'finder', '#FFFFFF', K, ev, ['fs', 'fb', 'fe', 'fd']);
    var S = axi_gfx(K, 'JZ Out Finder Frame', ev, 'sg(p,0,0.14)*(1-sg(p,0.93,1))*(fe>fs?1:0)');
    if (!S) return;
    var g = jzGrp(S, 'corners');
    for (i = 0; i < 2; i++) for (j = 0; j < 2; j++) {
        var da = i ? -1 : 1, db = j ? -1 : 1, sub = jzVecs(g).addProperty('ADBE Vector Group');
        sub.name = 'corner ' + (i * 2 + j + 1);
        jzAddPath(sub, [axi_pt(v, da * m0, 0), [0, 0], axi_pt(v, 0, db * m0)], false);
        jzSetExpr(jzGX(sub).property('ADBE Vector Position'), K.HD + ev + axi_xy(v, i ? 'fe+' + jzN(gp) : 'fs-' + jzN(gp), j ? 'fd+' + jzN(gp) : 'fb-' + jzN(gp)));
        jzSetExpr(jzGX(sub).property('ADBE Vector Scale'), K.HD + ev + 'var fk=fm/' + jzN(m0) + '*100;[fk,fk]');
    }
    jzAddStroke(g, K.C.hot, lw);
} });

/* ---- xiCounterWipe — すれ違いワイプ: the upper half is wiped from the head, the lower half from the tail: two short bars pass
   each other in the middle */
jzReg('exit', 'xiCounterWipe', { apply: function (m) {
    var K = axi_K(m, 0.3), sz = K.sz;
    if (axi_crowded(K)) { axi_fallback(K); return; }
    var ev = 'var e1=io3(sg(p,0,0.84)),e2=io3(sg(p,0.16,1)),x1=lp(A0,A1,e1),x2=lp(A1,A0,e2);';
    var M = axi_clip(K, 'Counter');
    axi_rect(M, 'upper', '#FFFFFF', K, ev, ['e1<1?x1:A1+BIG', 'B0-BIG', 'A1+BIG', 'BC']);
    axi_rect(M, 'lower', '#FFFFFF', K, ev, ['A0-BIG', 'BC', 'e2<1?x2:A0-BIG', 'B1+BIG']);
    var S = axi_gfx(K, 'JZ Out Counter Bars', ev, '1');
    if (!S) return;
    axi_rect(S, 'bar 1', K.C.hot, K, ev, ['x1-TH', jzN(K.b0 + sz * 0.16), 'x1', 'BC'], 'e1>0&&e1<1?100:0');
    axi_rect(S, 'bar 2', K.C.hot, K, ev, ['x2', 'BC', 'x2+TH', jzN(K.b1 - sz * 0.16)], 'e2>0&&e2<1?100:0');
} });

/* ---- xiTwoPass — 二度拭き: a bar crosses the text and takes every other hairline stripe with it; it turns at the end and on
   the way back takes the rest */
jzReg('exit', 'xiTwoPass', { apply: function (m) {
    var K = axi_K(m, 0.3), sz = K.sz, v = K.v;
    if (axi_crowded(K)) { axi_fallback(K); return; }
    var n = Math.min(64, Math.max(4, Math.ceil(K.cr / Math.max(3 * K.u, sz * 0.085)))), pitch = K.cr / n;
    var ev = 'var e1=io3(sg(p,0,0.46)),e2=io3(sg(p,0.54,1)),xa=lp(A0,A1,e1),xb=lp(A1,A0,e2),lim=Math.min(xa,xb);';
    var M = axi_clip(K, 'Two-Pass');
    axi_rect(M, 'unwiped', '#FFFFFF', K, ev, ['e1<1?xa:A1+BIG', 'B0-BIG', 'A1+BIG', 'B1+BIG']);
    var g = jzGrp(M, 'stripes'), rc = jzAddRect(g, 10, pitch, 0);
    jzSetExpr(rc.property('ADBE Vector Rect Size'), K.HD + ev + axi_xy(v, 'Math.max(0,lim-A0)', jzN(pitch)));
    jzSetExpr(rc.property('ADBE Vector Rect Position'), K.HD + ev + axi_xy(v, '(A0+lim)/2', jzN(K.b0 + pitch / 2)));
    var st = axi_pt(v, 0, pitch * 2);
    axi_rep(g, Math.ceil(n / 2), st[0], st[1]); jzAddFill(g, '#FFFFFF');
    var th = K.th * 1.3;
    var S = axi_gfx(K, 'JZ Out Two-Pass Bar', ev, '1');
    if (!S) return;
    axi_rect(S, 'bar', K.C.hot, K, ev + 'var bx=p<0.5?xa:xb,bh=' + jzN(K.cr / 2 - sz * 0.12) + '*oc(sg(p,0,0.07))*(1-ic(sg(p,0.93,1)));',
        ['bx-' + jzN(th / 2), 'BC-bh', 'bx+' + jzN(th / 2), 'BC+bh']);
} });

/* ---- xiCentreOut — 中央から拭う: a double bar appears in the middle of the line and parts: the text is wiped from its centre
   out to both ends */
jzReg('exit', 'xiCentreOut', { apply: function (m) {
    var K = axi_K(m, 0.3), sz = K.sz;
    if (axi_crowded(K)) { axi_fallback(K); return; }
    var ev = 'var cg=LEN/2*io3(sg(p,0.08,1)),cz=LEN/2-cg<0.4,ch=' + jzN(K.cr / 2 - sz * 0.12) + '*oc(sg(p,0,0.12))*(1-ic(sg(p,0.9,1)));';
    var M = axi_clip(K, 'Parting');
    axi_rect(M, 'head', '#FFFFFF', K, ev, ['A0-BIG', 'B0-BIG', 'cz?A0-BIG:AC-cg', 'B1+BIG']);
    axi_rect(M, 'tail', '#FFFFFF', K, ev, ['cz?A1+BIG:AC+cg', 'B0-BIG', 'A1+BIG', 'B1+BIG']);
    var S = axi_gfx(K, 'JZ Out Parting Bars', ev, '1');
    if (!S) return;
    axi_rect(S, 'bar 1', K.C.hot, K, ev, ['AC-cg-TH', 'BC-ch', 'AC-cg', 'BC+ch']);
    axi_rect(S, 'bar 2', K.C.hot, K, ev, ['AC+cg', 'BC-ch', 'AC+cg+TH', 'BC+ch']);
} });

/* ================================================================ B. CLIP SHAPES */

/* ---- xiDiagPinch — 斜めに挟む: two parallel slanted edges come in from opposite corners and pinch the text into a thin
   diagonal sliver (a slanted band matte; the two edge lines are clipped to the text box) */
jzReg('exit', 'xiDiagPinch', { apply: function (m) {
    var K = axi_K(m, 0.25), sz = K.sz, i;
    if (axi_crowded(K)) { axi_fallback(K); return; }
    var deg = (K.v ? 90 : 0) + (axi_bit(m, 11) ? 34 : -34), ang = deg * Math.PI / 180, dx = Math.cos(ang), dy = Math.sin(ang), tx = -dy, ty = dx;
    var cs = [[K.x0, K.y0], [K.x1, K.y0], [K.x0, K.y1], [K.x1, K.y1]], u0 = 1e9, u1 = -1e9, w0 = 1e9, w1 = -1e9;
    for (i = 0; i < 4; i++) {
        var uu = cs[i][0] * dx + cs[i][1] * dy, ww = cs[i][0] * tx + cs[i][1] * ty;
        u0 = Math.min(u0, uu); u1 = Math.max(u1, uu); w0 = Math.min(w0, ww); w1 = Math.max(w1, ww);
    }
    var uc = (u0 + u1) / 2, wc = (w0 + w1) / 2, WW = (w1 - w0) + K.big * 2;
    var ev = 'var d0=lp(' + jzN(u0) + ',' + jzN(uc) + ',io3(sg(p,0,0.86))),d1=lp(' + jzN(u1) + ',' + jzN(uc) + ',io3(sg(p,0.14,1)));if(d1-d0<0.5)d1=d0;';
    var at = function (u) { return 'var um=' + u + ';[' + jzN(dx) + '*um+' + jzN(tx * wc) + ',' + jzN(dy) + '*um+' + jzN(ty * wc) + ']'; };
    var M = axi_clip(K, 'Pinch'), g = jzGrp(M, 'sliver'), rc = jzAddRect(g, 10, WW, 0);
    jzSetExpr(rc.property('ADBE Vector Rect Size'), K.HD + ev + '[d1-d0,' + jzN(WW) + ']');
    jzAddFill(g, '#FFFFFF');
    jzGX(g).property('ADBE Vector Rotation').setValue(deg);
    jzSetExpr(jzGX(g).property('ADBE Vector Position'), K.HD + ev + at('(d0+d1)/2'));
    var S = axi_gfx(K, 'JZ Out Pinch Edges', ev, 'sg(p,0,0.1)*(1-sg(p,0.92,1))*(d1>d0?1:0)');
    if (!S) return;
    var lw = Math.max(2 * K.u, sz * 0.03), ex = sz * 0.12;
    for (i = 0; i < 2; i++) {
        var gl = jzGrp(S, 'edge ' + (i + 1));
        jzAddRect(gl, lw, (w1 - w0) + ex * 2, 0); jzAddFill(gl, K.C.hot);
        jzGX(gl).property('ADBE Vector Rotation').setValue(deg);
        jzSetExpr(jzGX(gl).property('ADBE Vector Position'), K.HD + ev + at(i ? 'd1+' + jzN(lw / 2) : 'd0-' + jzN(lw / 2)));
    }
    jzMaskRect(S, K.x0 - ex, K.y0 - ex, K.x1 + ex, K.y1 + ex);
} });

/* ---- xiMothHoles — 虫食い穴: round holes open here and there in the text, small at first, then they spread into each other
   until nothing is left (circles in an inverted matte) */
jzReg('exit', 'xiMothHoles', { apply: function (m) {
    var K = axi_K(m, 0.15), sz = K.sz, seed = K.seed, i;
    if (axi_crowded(K)) { axi_fallback(K); return; }
    var n = jzClamp(Math.round(K.len / (sz * 0.6)) + 3, 5, 12), sx = K.len / n * 0.96, sy = K.cr * 0.86, rm = Math.sqrt(sx * sx + sy * sy) + 2;
    var M = axi_clip(K, 'Moth', true);
    for (i = 0; i < n; i++) {
        var a = K.a0 + K.len * jzClamp((i + 0.5 + axi_rs(seed, i, 71) * 0.45) / n, 0, 1), b = K.b0 + K.cr * (0.15 + 0.7 * axi_r(seed, i, 72));
        var st = i === 0 ? 0 : axi_r(seed, i, 73) * 0.4, r0 = sz * (0.16 + 0.2 * axi_r(seed, i, 74)), c = axi_pt(K.v, a, b);
        var g = jzGrp(M, 'hole ' + (i + 1)), el = jzAddEllipse(g, 2, 2, c[0], c[1]);
        jzSetExpr(el.property('ADBE Vector Ellipse Size'), K.HD + 'var q=sg(p,' + jzN(st) + ',1),hr=q<=0?0:' + jzN(r0) + '*oc(sg(q,0,0.35))+' + jzN(rm - r0) + '*iq(sg(q,0.3,1));[2*hr,2*hr]');
        jzAddFill(g, '#FFFFFF');
    }
} });

/* ---- xiSawBite — 噛みちぎる: two rows of interlocking saw teeth close on the text from both sides: a first bite, a breath, then
   the jaws lock and the seam pulls shut (the two jaws = polygons in an inverted matte; the tooth lines are trimmed away at the end) */
jzReg('exit', 'xiSawBite', { apply: function (m) {
    var K = axi_K(m, 0.25), sz = K.sz, v = K.v, i;
    if (axi_crowded(K)) { axi_fallback(K); return; }
    var A = Math.min(sz * 0.36, K.cr * 0.4), pitch = Math.max(sz * 0.62, K.len / 30), half = pitch / 2, gap0 = K.cr + A;
    var mc = Math.ceil((K.len + sz) / half) + 1, aS = K.a0 - sz * 0.5, far = K.big + K.cr, zig = [], top = [], bot = [];
    for (i = 0; i <= mc; i++) { var pz = axi_pt(v, aS + i * half, i % 2 ? A : 0); zig.push(pz); top.push(pz); bot.push(pz); }
    top.push(axi_pt(v, aS + mc * half, -far)); top.push(axi_pt(v, aS, -far));
    bot.push(axi_pt(v, aS + mc * half, far)); bot.push(axi_pt(v, aS, far));
    var ev = 'var gf=p<0.3?lp(1,0.2,io3(p/0.3)):(p<0.46?lp(0.2,0.42,oc(sg(p,0.3,0.46))):0.42*(1-ic(sg(p,0.46,0.8)))),gp=' + jzN(gap0) + '*gf,bt=BC-' + jzN(A / 2) + '-gp/2,sh=ic(sg(p,0.8,1));';
    var pT = K.HD + ev + axi_xy(v, '0', 'bt'), pB = K.HD + ev + axi_xy(v, '0', 'gp<0.4?bt-2:bt+gp');
    var M = axi_clip(K, 'Bite', true);
    var g1 = jzGrp(M, 'upper jaw'); jzAddPath(g1, top, true); jzAddFill(g1, '#FFFFFF');
    jzSetExpr(jzGX(g1).property('ADBE Vector Position'), pT);
    var g2 = jzGrp(M, 'lower jaw'); jzAddPath(g2, bot, true); jzAddFill(g2, '#FFFFFF');
    jzSetExpr(jzGX(g2).property('ADBE Vector Position'), pB);
    var S = axi_gfx(K, 'JZ Out Bite Teeth', ev, 'sg(p,0,0.1)*(sh<0.98?1:0)');
    if (!S) return;
    var lw = Math.max(2 * K.u, sz * 0.03);
    for (i = 0; i < 2; i++) {
        var gl = jzGrp(S, i ? 'lower teeth' : 'upper teeth');
        jzAddPath(gl, zig, false); jzAddStroke(gl, K.C.hot, lw);
        jzAddTrimPaths(gl, K.HD + ev + '100-sh*50', K.HD + ev + 'sh*50');
        jzSetExpr(jzGX(gl).property('ADBE Vector Position'), i ? pB : pT);
        if (i) jzSetExpr(jzGX(gl).property('ADBE Vector Group Opacity'), K.HD + ev + 'gp<0.4?0:100');
    }
} });

/* ---- xiRadialBlinds — 放射ブラインド: the text is seen through a turning fan of 12 wedges around its centre; the wedges narrow
   one after another until the fan is shut (each wedge = a triangle whose cross scale is tan(half angle)) */
jzReg('exit', 'xiRadialBlinds', { apply: function (m) {
    var K = axi_K(m, 0.25), sz = K.sz, k;
    if (axi_crowded(K)) { axi_fallback(K); return; }
    var R = (Math.sqrt(K.w * K.w + K.h * K.h) / 2 + sz * 0.2) * 1.06, turn = (axi_bit(m, 21) ? 1 : -1) * 42;
    var M = axi_clip(K, 'Fan');
    for (k = 0; k < 12; k++) {
        var g = jzGrp(M, 'wedge ' + (k + 1));
        jzAddPath(g, [[0, 0], [R, -R], [R, R]], true); jzAddFill(g, '#FFFFFF');
        jzGX(g).property('ADBE Vector Position').setValue([K.cx, K.cy]);
        jzSetExpr(jzGX(g).property('ADBE Vector Rotation'), K.HD + jzN(k * 30) + '+' + jzN(turn) + '*io3(p)');
        jzSetExpr(jzGX(g).property('ADBE Vector Scale'), K.HD + 'var wh=Math.PI/12*(1-io3(win(p,' + jzN((k % 2) * 0.62 + (k % 3) * 0.12) + ',0.5)));' +
            '[100,wh>0.002?Math.tan(wh+(wh>Math.PI/12*0.995?0.004:0))*100:0]');
    }
} });

/* ---- xiPortholes — 丸窓: the text shrinks back into a row of portholes, each ringed for a moment; the portholes then close
   from the ends towards the middle */
jzReg('exit', 'xiPortholes', { apply: function (m) {
    var K = axi_K(m, 0.2), sz = K.sz, i;
    if (axi_crowded(K)) { axi_fallback(K); return; }
    var n = jzClamp(Math.round(K.len / (K.cr * 0.95)), 1, 16), cw = K.len / n, R0 = Math.sqrt(cw * cw / 4 + K.cr * K.cr / 4) * 1.03, rp = Math.min(K.cr * 0.4, cw * 0.46);
    var mid = (n - 1) / 2, lw = Math.max(2 * K.u, sz * 0.03), qs = [], cs = [];
    for (i = 0; i < n; i++) {
        qs.push('var q=win(p,' + jzN(n > 1 ? 1 - Math.abs(i - mid) / mid : 0) + ',0.3),hr=lp(' + jzN(R0) + ',' + jzN(rp) + ',io3(sg(q,0,0.42)))*(1-ic(sg(q,0.58,1)));if(hr<0.3)hr=0;');
        cs.push(axi_pt(K.v, K.a0 + (i + 0.5) * cw, K.bc));
    }
    var M = axi_clip(K, 'Portholes');
    for (i = 0; i < n; i++) {
        var g = jzGrp(M, 'porthole ' + (i + 1)), el = jzAddEllipse(g, 2, 2, cs[i][0], cs[i][1]);
        jzSetExpr(el.property('ADBE Vector Ellipse Size'), K.HD + qs[i] + '[2*hr,2*hr]');
        jzAddFill(g, '#FFFFFF');
    }
    var S = axi_gfx(K, 'JZ Out Porthole Rings', '', '1');
    if (!S) return;
    for (i = 0; i < n; i++) {
        var gr = jzGrp(S, 'ring ' + (i + 1)), er = jzAddEllipse(gr, 2, 2, cs[i][0], cs[i][1]);
        jzSetExpr(er.property('ADBE Vector Ellipse Size'), K.HD + qs[i] + '[2*hr+' + jzN(lw) + ',2*hr+' + jzN(lw) + ']');
        jzAddStroke(gr, K.C.hot, lw);
        jzSetExpr(jzGX(gr).property('ADBE Vector Group Opacity'), K.HD + qs[i] + 'hr>0?sg(q,0.2,0.42)*(1-sg(q,0.9,1))*100:0');
    }
} });

/* ---- xiLattice — 網目に痩せる: the text thins to a diagonal lattice: only two sets of crossing slanted lines of it remain, and
   they grow finer until they are gone (two repeated bar sets in the matte) */
jzReg('exit', 'xiLattice', { apply: function (m) {
    var K = axi_K(m, 0.2), sz = K.sz, s, i;
    if (axi_crowded(K)) { axi_fallback(K); return; }
    var pitch = Math.max(Math.min(K.cr * 0.75, sz * 1.1), sz * 0.55), span = K.w + K.h; if (span / pitch > 22) pitch = span / 22;
    var fx = ['lp(1,0.17,io3(sg(p,0,0.4)))*(1-iq(sg(p,0.42,0.9)))', 'lp(1,0.17,io3(sg(p,0.06,0.46)))*(1-iq(sg(p,0.5,1)))'];
    var cs = [[K.x0, K.y0], [K.x1, K.y0], [K.x0, K.y1], [K.x1, K.y1]], LL = Math.sqrt(K.w * K.w + K.h * K.h) + sz * 2;
    var M = axi_clip(K, 'Lattice');
    for (s = 0; s < 2; s++) {
        var deg = (K.v ? 90 : 0) + (s ? -52 : 52), nx = -Math.sin(deg * Math.PI / 180), ny = Math.cos(deg * Math.PI / 180), lo = 1e9, hi = -1e9;
        for (i = 0; i < 4; i++) { var os = (cs[i][0] - K.cx) * nx + (cs[i][1] - K.cy) * ny; lo = Math.min(lo, os); hi = Math.max(hi, os); }
        var k0 = Math.floor(lo / pitch), k1 = Math.ceil(hi / pitch);
        var g = jzGrp(M, 'bars ' + (s + 1)), rc = jzAddRect(g, LL, pitch, 0, 0, k0 * pitch);
        jzSetExpr(rc.property('ADBE Vector Rect Size'), K.HD + 'var lf=' + fx[s] + ';[' + jzN(LL) + ',lf<0.004?0:' + jzN(pitch) + '*lf+(lf>0.995?0.8:0)]');
        axi_rep(g, k1 - k0 + 1, 0, pitch); jzAddFill(g, '#FFFFFF');
        jzGX(g).property('ADBE Vector Position').setValue([K.cx, K.cy]);
        jzGX(g).property('ADBE Vector Rotation').setValue(deg);
    }
} });

/* ---- xiRings — 波紋抜き: the text is cut into concentric rings around its centre; ring after ring thins to a hairline and
   goes out (stroked circles in the matte: the stroke width is the ring's width) */
jzReg('exit', 'xiRings', { apply: function (m) {
    var K = axi_K(m, 0.2), sz = K.sz, k;
    if (axi_crowded(K)) { axi_fallback(K); return; }
    var Rm = Math.sqrt(K.w * K.w + K.h * K.h) / 2, pitch = Math.max(sz * 0.3, Rm / 14), n = Math.max(2, Math.ceil(Rm / pitch)), inward = axi_bit(m, 31);
    var M = axi_clip(K, 'Rings');
    for (k = 0; k < n; k++) {
        var o = inward ? 1 - k / (n - 1) : k / (n - 1), g = jzGrp(M, 'ring ' + (k + 1));
        jzAddEllipse(g, (2 * k + 1) * pitch, (2 * k + 1) * pitch, K.cx, K.cy);
        var st = jzAddStroke(g, '#FFFFFF', pitch);
        jzSetExpr(st.property('ADBE Vector Stroke Width'), K.HD + 'var rk=1-io3(win(p,' + jzN(o) + ',0.55));rk<0.01?0:' + jzN(pitch) + '*rk+(rk>0.995?0.8:0)');
    }
} });

/* ---- xiSpiralTiles — 渦巻きタイル: the text is seen through a grid of small windows that shut one by one along a spiral, from
   the rim inwards (alternate tiles close sideways / upright) */
function axi_spiral(nx, ny) {
    var o = [], x0 = 0, y0 = 0, x1 = nx - 1, y1 = ny - 1, k = 0, x, y;
    while (x0 <= x1 && y0 <= y1) {
        for (x = x0; x <= x1; x++) o[y0 * nx + x] = k++;
        for (y = y0 + 1; y <= y1; y++) o[y * nx + x1] = k++;
        if (y1 > y0) for (x = x1 - 1; x >= x0; x--) o[y1 * nx + x] = k++;
        if (x1 > x0) for (y = y1 - 1; y > y0; y--) o[y * nx + x0] = k++;
        x0++; y0++; x1--; y1--;
    }
    return o;
}
jzReg('exit', 'xiSpiralTiles', { apply: function (m) {
    var K = axi_K(m, 0.15), sz = K.sz, v = K.v, x, y, CAP = 96;
    if (axi_crowded(K)) { axi_fallback(K); return; }
    var ny = jzClamp(Math.round(K.cr / (sz * 0.5)), 2, 6), cell = K.cr / ny, nx = Math.max(1, Math.ceil(K.len / cell - 0.01));
    while (nx * ny > CAP && ny > 2) { ny--; cell = K.cr / ny; nx = Math.max(1, Math.ceil(K.len / cell - 0.01)); }
    if (nx * ny > CAP) nx = Math.floor(CAP / ny);
    var cw = K.len / nx, N = nx * ny, ord = axi_spiral(nx, ny);
    var M = axi_clip(K, 'Tiles');
    for (y = 0; y < ny; y++) for (x = 0; x < nx; x++) {
        var c = axi_pt(v, K.a0 + (x + 0.5) * cw, K.b0 + (y + 0.5) * cell), g = jzGrp(M, 'tile ' + (y * nx + x + 1)), rc = jzAddRect(g, 10, 10, 0, c[0], c[1]);
        jzSetExpr(rc.property('ADBE Vector Rect Size'), K.HD + 'var tk=1-io3(win(p,' + jzN(N > 1 ? ord[y * nx + x] / (N - 1) : 0) + ',0.62)),te=tk>0.995?0.8:0;tk<0.015?[0,0]:' +
            (((x + y) & 1) ? axi_xy(v, jzN(cw) + '*tk+te', jzN(cell) + '+te') : axi_xy(v, jzN(cw) + '+te', jzN(cell) + '*tk+te')));
        jzAddFill(g, '#FFFFFF');
    }
} });

/* ---- xiEyelid — まぶたを閉じる: two curved lids close over the text like an eye: they droop, lift once more, then shut, and the
   lash line draws in to nothing. The eye = one lens outline (two circular arcs) whose cross scale follows the opening; the
   lash lines are the same outline stroked. */
jzReg('exit', 'xiEyelid', { apply: function (m) {
    var K = axi_K(m, 0.25), sz = K.sz, v = K.v, i, k;
    if (axi_crowded(K)) { axi_fallback(K); return; }
    var Lh = K.len * 0.5 + sz * 0.9, xc = K.len / 2, yc = K.cr / 2, hA = yc * 0.5, hB = yc * 0.92, hr = hB, Rr = (Lh * Lh + hr * hr) / (2 * hr);
    var yy = function (x) { return Math.sqrt(Math.max(0, Rr * Rr - x * x)) - (Rr - hr); };
    var h0 = K.cr * 0.9 + sz * 0.3;
    for (k = 0; k < 8 && h0 / hr * yy(xc) < yc; k++) h0 *= 1.3;
    var KN = 22, up = [], dn = [], lens = [];
    for (i = 0; i <= KN; i++) { var x = Lh * (i / KN * 2 - 1), y = yy(x); up.push(axi_pt(v, x, -y)); dn.push(axi_pt(v, x, y)); }
    for (i = 0; i <= KN; i++) lens.push(up[i]);
    for (i = KN - 1; i >= 1; i--) lens.push(dn[i]);
    var ev = 'var eh=p<0.3?lp(' + jzN(h0) + ',' + jzN(hA) + ',io3(p/0.3)):(p<0.46?lp(' + jzN(hA) + ',' + jzN(hB) + ',io3(sg(p,0.3,0.46))):' + jzN(hB) + '*(1-io3(sg(p,0.46,0.8)))),' +
        'ek=eh<0.6?0:eh/' + jzN(hr) + '*100,es=eh<0.6?1-io3(sg(p,0.8,1)):1;';
    var c = axi_pt(v, K.ac, K.bc);
    var M = axi_clip(K, 'Eyelid'), g = jzGrp(M, 'eye');
    jzAddPath(g, lens, true); jzAddFill(g, '#FFFFFF');
    jzGX(g).property('ADBE Vector Position').setValue(c);
    jzSetExpr(jzGX(g).property('ADBE Vector Scale'), K.HD + ev + axi_xy(v, '100', 'ek'));
    var S = axi_gfx(K, 'JZ Out Lash Lines', ev, 'sg(p,0.02,0.14)*(es*' + jzN(Lh) + '>1?1:0)');
    if (!S) return;
    var gl = jzGrp(S, 'lids'), sub = jzVecs(gl).addProperty('ADBE Vector Group');
    sub.name = 'lid lines';
    jzAddPath(sub, up, false); jzAddPath(sub, dn, false);
    jzGX(sub).property('ADBE Vector Position').setValue(c);
    jzSetExpr(jzGX(sub).property('ADBE Vector Scale'), K.HD + ev + axi_xy(v, 'es*100', 'ek'));
    jzAddStroke(gl, K.C.hot, Math.max(2 * K.u, sz * 0.028));
} });

/* ---- xiPicket — 格子が通る: a picket of slits slides across the text while its slats widen: the text flickers through ever
   narrower gaps and is shut out */
jzReg('exit', 'xiPicket', { apply: function (m) {
    var K = axi_K(m, 0.3), sz = K.sz, v = K.v;
    if (axi_crowded(K)) { axi_fallback(K); return; }
    var pitch = Math.max(sz * 0.3, K.len / 48), dir = axi_bit(m, 41) ? 1 : -1, c = axi_pt(v, K.a0 - pitch * 8.5, K.bc), st = axi_pt(v, pitch, 0);
    var ev = 'var po=' + jzN(pitch) + '*lp(1,0.42,io3(sg(p,0,0.34)))*(1-iq(sg(p,0.36,0.96)));if(po<0.3)po=0;else if(po>' + jzN(pitch * 0.995) + ')po+=0.5;';
    var M = axi_clip(K, 'Picket'), g = jzGrp(M, 'slits'), rc = jzAddRect(g, pitch, K.cr + K.big * 2, 0, c[0], c[1]);
    jzSetExpr(rc.property('ADBE Vector Rect Size'), K.HD + ev + axi_xy(v, 'po', jzN(K.cr + K.big * 2)));
    axi_rep(g, Math.ceil(K.len / pitch) + 14, st[0], st[1]); jzAddFill(g, '#FFFFFF');
    jzSetExpr(jzGX(g).property('ADBE Vector Position'), K.HD + axi_xy(v, jzN(dir * pitch * 3.2) + '*ios(p)', '0'));
} });

/* ================================================================ C. BANDS / SLICES */

/* ---- xiFields — インターレース: the text splits into its two scan-line fields: one slips out of register, then the other the
   opposite way, and the two fields run off in opposite directions (two twins, each through a matte of every other line) */
jzReg('exit', 'xiFields', { apply: function (m) {
    var K = axi_K(m, 0.3), sz = K.sz, v = K.v, par;
    if (axi_crowded(K, 4)) { axi_fallback(K); return; }
    var pitch = Math.max(2.5 * K.u, sz * 0.055); if (K.cr / pitch > 90) pitch = K.cr / 90;
    var n = Math.ceil(K.cr / pitch), LL = K.far * 2 + K.big, st = axi_pt(v, 0, pitch * 2);
    var ev = 'var fB=SZ*0.11*oc(sg(p,0,0.14))+FAR*ic(sg(p,0.34,0.9)),fA=-SZ*0.11*oc(sg(p,0.2,0.34))-FAR*ic(sg(p,0.42,0.98));';
    axi_hideL(K);
    var above = null;
    for (par = 0; par < 2; par++) {
        var T = axi_twin(K, 'JZ Out Field ' + (par ? 'B' : 'A'), ev, 'ON?1:0', axi_xy(v, par ? 'fB' : 'fA', '0'), above);
        var M = axi_matte(K, T, 'JZ Out Field ' + (par ? 'B' : 'A') + ' Matte'), cnt = Math.ceil((n - par) / 2);
        if (cnt > 0) {
            var c = axi_pt(v, K.ac, K.b0 + (par + 0.5) * pitch), sr = axi_pt(v, LL, pitch), g = jzGrp(M, 'lines');
            jzAddRect(g, sr[0], sr[1], 0, c[0], c[1]); axi_rep(g, cnt, st[0], st[1]); jzAddFill(g, '#FFFFFF');
        }
        if (!par) {       // everything outside the lined box rides with field A
            var s2 = axi_pt(v, LL, K.big), c1 = axi_pt(v, K.ac, K.b0 - K.big / 2), c2 = axi_pt(v, K.ac, K.b0 + n * pitch + K.big / 2);
            var g1 = jzGrp(M, 'above'); jzAddRect(g1, s2[0], s2[1], 0, c1[0], c1[1]); jzAddFill(g1, '#FFFFFF');
            var g2 = jzGrp(M, 'below'); jzAddRect(g2, s2[0], s2[1], 0, c2[0], c2[1]); jzAddFill(g2, '#FFFFFF');
        }
        above = M;
    }
} });

/* ---- xiDrawers — 引き出し: the text is a chest of drawers: slice after slice is tugged out a notch, waits, and is then pulled
   right out, alternately to either side */
jzReg('exit', 'xiDrawers', { apply: function (m) {
    var K = axi_K(m, 0.2), sz = K.sz, k, list = [];
    var n = jzClamp(Math.round(K.cr / (sz * 0.28)), 4, 9);
    if (axi_crowded(K, n)) { axi_fallback(K); return; }
    var h = K.cr / n, d = 0.44, st = (1 - d) / (n - 1), s0 = axi_bit(m, 45) ? 1 : -1;
    for (k = 0; k < n; k++) list.push({ lo: K.b0 + k * h, hi: K.b0 + (k + 1) * h + (k < n - 1 ? 0.6 : 0),
        pre: 'var q=sg(p,' + jzN(k * st) + ',' + jzN(k * st + d) + ');', sh: jzN((k % 2 ? 1 : -1) * s0) + '*(SZ*0.24*oc(sg(q,0,0.24))+FAR*ic(sg(q,0.44,1)))' });
    axi_bands(K, 'Drawer', true, list);
} });

/* ---- xiCounterScroll — 行違い送り: the text scrolls out of its own fixed window in strips, neighbouring strips in opposite
   directions, between two end rails */
jzReg('exit', 'xiCounterScroll', { apply: function (m) {
    var K = axi_K(m, 0.25), sz = K.sz, k, list = [];
    var n = jzClamp(Math.round(K.cr / (sz * 0.55)), 2, 8);
    if (axi_crowded(K, n)) { axi_fallback(K); return; }
    var h = K.cr / n, dist = K.len + 2, s0 = axi_bit(m, 51) ? 1 : -1;
    for (k = 0; k < n; k++) {
        var dir = (k % 2 ? 1 : -1) * s0;
        list.push({ lo: K.b0 + k * h, hi: K.b0 + (k + 1) * h + (k < n - 1 ? 0.6 : 0), pre: '', cut: true, dir: dir,
            sh: jzN(dir * dist) + '*io3(win(sg(p,0.06,0.96),' + jzN(k / (n - 1)) + ',0.3))' });
    }
    axi_bands(K, 'Strip', true, list);
    var ev = 'var rh=' + jzN(K.cr / 2 - sz * 0.1) + '*oc(sg(p,0,0.12))*(1-ic(sg(p,0.86,1)));';
    var S = axi_gfx(K, 'JZ Out Scroll Rails', ev, '1');
    if (!S) return;
    axi_rect(S, 'rail 1', K.C.hot, K, ev, ['A0-TH', 'BC-rh', 'A0', 'BC+rh']);
    axi_rect(S, 'rail 2', K.C.hot, K, ev, ['A1', 'BC-rh', 'A1+TH', 'BC+rh']);
} });

/* ---- xiPistons — ピストン抜け: between two rails the text is cut into upright slices that work like pistons: one after another
   they dip, then plunge out behind the rails, alternately up and down (at most 10 slices here; the browser goes up to 14) */
jzReg('exit', 'xiPistons', { apply: function (m) {
    var K = axi_K(m, 0.25), sz = K.sz, k, list = [];
    var n = jzClamp(Math.round(K.len / (sz * 0.5)), 3, 10);
    if (axi_crowded(K, n)) { axi_fallback(K); return; }
    var w = K.len / n, dist = K.cr + 2;
    for (k = 0; k < n; k++) {
        var dir = k % 2 ? 1 : -1;
        list.push({ lo: K.a0 + k * w, hi: K.a0 + (k + 1) * w + (k < n - 1 ? 0.6 : 0), cut: true, dir: dir,
            pre: 'var q=win(sg(p,0.05,0.95),' + jzN(k / (n - 1)) + ',0.52);', sh: dir + '*(-SZ*0.09*Math.sin(Math.PI*sg(q,0,0.32))+' + jzN(dist) + '*ic(sg(q,0.26,1)))' });
    }
    axi_bands(K, 'Piston', false, list);
    var th = K.th * 0.7, ev = 'var rl=LEN/2*oc(sg(p,0,0.12))*(1-ic(sg(p,0.88,1)));';
    var S = axi_gfx(K, 'JZ Out Piston Rails', ev, '1');
    if (!S) return;
    axi_rect(S, 'rail 1', K.C.hot, K, ev, ['AC-rl', 'B0-' + jzN(th), 'AC+rl', 'B0']);
    axi_rect(S, 'rail 2', K.C.hot, K, ev, ['AC-rl', 'B1', 'AC+rl', 'B1+' + jzN(th)]);
} });

/* ---- xiSliceWave — スライスの波: a ripple runs through the upright slices of the text, each hopping as it passes; on the second
   pass every slice it reaches shoots away (at most 10 slices here; the browser goes up to 12) */
jzReg('exit', 'xiSliceWave', { apply: function (m) {
    var K = axi_K(m, 0.3), sz = K.sz, v = K.v, k, list = [];
    var n = jzClamp(Math.round(K.len / (sz * 0.4)), 4, 10);
    if (axi_crowded(K, n)) { axi_fallback(K); return; }
    var w = K.len / n, rev = axi_bit(m, 55), edge = v ? axi_toComp(K.L, K.x1, K.cy)[0] : axi_toComp(K.L, K.cx, K.y1)[1];
    var far = (Math.max(0, edge) + (v ? m.W : m.H) * 0.08) / K.s0 + sz * 0.6;      // from the box's far edge to beyond the screen edge
    for (k = 0; k < n; k++) {
        var o = ((rev ? n - 1 - k : k) + 0.5) / n;
        list.push({ lo: K.a0 + k * w, hi: K.a0 + (k + 1) * w + (k < n - 1 ? 0.6 : 0),
            pre: 'var wc=lp(-0.2,1.2,sg(p,0,0.42)),wz=(' + jzN(o) + '-wc)/0.2,hop=Math.max(0,1-wz*wz);', sh: '-SZ*0.2*hop-' + jzN(far) + '*iq(win(sg(p,0.3,0.98),' + jzN(o) + ',0.5))' });
    }
    axi_bands(K, 'Slice', false, list);
} });

/* ================================================================ D. BARS AND PLATES */

/* ---- xiPlateCarry — 板で持ち去る: a plate is laid over the text from above; after a beat the plate tips, backs up a little and
   slides off sideways, and the place is empty */
jzReg('exit', 'xiPlateCarry', { apply: function (m) {
    var K = axi_K(m, 0.16), v = K.v, dir = axi_bit(m, 61) ? 1 : -1;
    var ev = 'var qa=io3(sg(p,0,0.34)),fr=lp(B0,B1,qa),qc=sg(p,0.46,1),sl=' + dir + '*FAR*qc*qc*(2.4*qc-1.4)*0.999;';
    axi_wipe(K, K.L, 'b0', ev, 'fr-B0', 'JZ Out Under Plate');
    axi_safe(K, ev, 'qa>=1?0:1');
    var S = axi_gfx(K, 'JZ Out Plate', ev, 'fr-B0>0.4?1:0');
    if (!S) return;
    var g = jzGrp(S, 'plate'), rc = jzAddRect(g, 10, 10, 0);
    jzSetExpr(rc.property('ADBE Vector Rect Size'), K.HD + ev + axi_xy(v, 'LEN', 'fr-B0'));
    jzAddFill(g, K.C.plate);
    jzSetExpr(jzGX(g).property('ADBE Vector Position'), K.HD + ev + axi_xy(v, 'AC+sl', '(B0+fr)/2'));
    jzSetExpr(jzGX(g).property('ADBE Vector Rotation'), K.HD + ev + jzN((v ? -1 : 1) * dir * 9) + '*iq(qc)');
} });

/* ---- xiTwinPlates — 二枚板で閉じる: two plates slide in from the ends and meet over the text; each then folds away to its own
   edge, and the two edge lines draw back */
jzReg('exit', 'xiTwinPlates', { apply: function (m) {
    var K = axi_K(m, 0.16);
    var ev = 'var qa=oc(sg(p,0,0.36)),eL=lp(A0,AC,qa),eR=lp(A1,AC,qa),qb=io3(sg(p,0.46,0.76)),qc=ic(sg(p,0.76,1));';
    axi_wipe(K, K.L, 'a0', ev, 'eL-A0', 'JZ Out Under Plate 1');
    axi_wipe(K, K.L, 'a1', ev, 'A1-eR', 'JZ Out Under Plate 2');
    axi_safe(K, ev, 'qa>=1?0:1');
    var S = axi_gfx(K, 'JZ Out Twin Plates', ev, '1');
    if (!S) return;
    axi_rect(S, 'plate 1', K.C.hot, K, ev, ['A0', 'B0', 'lp(eL,A0,qc)', 'lp(B1,B0+TH,qb)']);
    axi_rect(S, 'plate 2', K.C.hot, K, ev, ['lp(eR,A1,qc)', 'lp(B0,B1-TH,qb)', 'A1', 'B1']);
} });

/* ---- xiRollShutter — シャッター: a slatted shutter rolls down over the text; when it is down, the slats thin out one after
   another and behind them there is nothing */
jzReg('exit', 'xiRollShutter', { apply: function (m) {
    var K = axi_K(m, 0.16), sz = K.sz, v = K.v, j;
    var n = jzClamp(Math.ceil(K.cr / (sz * 0.17)), 3, 40), pitch = K.cr / n, sh = pitch * 0.84;
    var ev = 'var qa=oc(sg(p,0,0.4)),fr=B0+CR*qa,p2=sg(p,0.5,1);';
    axi_wipe(K, K.L, 'b0', ev, 'fr-B0', 'JZ Out Under Shutter');
    axi_safe(K, ev, 'qa>=1?0:1');
    var S = axi_gfx(K, 'JZ Out Shutter', ev, '1');
    if (!S) return;
    for (j = 0; j < n; j++) {
        var t0 = K.b0 + j * pitch, c = axi_pt(v, K.ac, t0 + sh / 2), g = jzGrp(S, 'slat ' + (j + 1)), rc = jzAddRect(g, 10, 10, 0, c[0], c[1]);
        jzSetExpr(rc.property('ADBE Vector Rect Size'), K.HD + ev + axi_xy(v, 'LEN', jzN(t0) + '<fr?' + jzN(sh) + '*(1-io3(win(p2,' + jzN(j / (n - 1)) + ',0.5))):0'));
        jzAddFill(g, K.C.hot);
    }
    axi_wipe(K, S, 'b1', ev, 'B1-fr', 'JZ Out Shutter Front');      // the slat that is rolling out ends at the front
} });

/* ---- xiRedact — 黒塗り: the text is redacted: solid bars in the text's own colour slam down over it piece by piece (the glyphs
   under a bar go out), then each bar flattens to a rule and the rule is drawn back */
jzReg('exit', 'xiRedact', { apply: function (m) {
    var K = axi_K(m, 0), G = K.G, sz = K.sz, v = K.v, seed = K.seed, lines = [], O = [], segs = [], i, k, li;
    for (i = 0; i < G.n; i++) {
        O.push(-1);
        var gl = G.g[i]; if (gl.sp) continue;
        li = v ? 0 : gl.li;
        if (!lines[li]) lines[li] = [];
        lines[li].push(gl);
    }
    for (li = 0; li < lines.length; li++) {
        var gs = lines[li]; if (!gs || !gs.length) continue;
        var n = gs.length, parts = n <= 3 ? 1 : (n <= 8 ? 2 : 3), cuts = [0];
        for (k = 1; k < parts; k++) cuts.push(jzClamp(Math.round(n * k / parts + axi_rs(seed, li, k, 81) * n * 0.12), cuts[cuts.length - 1] + 1, n - 1));
        cuts.push(n);
        for (k = 0; k < cuts.length - 1; k++) {
            if (cuts[k + 1] <= cuts[k]) continue;
            var S0 = { a0: 1e9, a1: -1e9, b0: 1e9, b1: -1e9, o: axi_r(seed, li, k, 82) };
            for (i = cuts[k]; i < cuts[k + 1]; i++) {
                var q = gs[i], ga = v ? q.y : q.x, ha = (v ? G.fs : q.w) / 2, gb = v ? q.x : q.y;
                O[q.i] = S0.o;
                S0.a0 = Math.min(S0.a0, ga - ha); S0.a1 = Math.max(S0.a1, ga + ha); S0.b0 = Math.min(S0.b0, gb - sz / 2); S0.b1 = Math.max(S0.b1, gb + sz / 2);
            }
            segs.push(S0);
        }
    }
    axi_safe(K);
    if (!segs.length) return;
    jzAnimator(K.L, 'JZ Out Redacted', [['ADBE Text Opacity', 0]], K.HD + 'var O=' + axi_arr(O) + ',o=O[textIndex-1];o>=0&&sg(p,o*0.3,o*0.3+0.1)>=0.55?100:0');
    var S = axi_gfx(K, 'JZ Out Redact Bars', '', '1');
    if (!S) return;
    var pa = sz * 0.07, pb = sz * 0.03;
    for (k = 0; k < segs.length; k++) {
        var s = segs[k], bc = (s.b0 + s.b1) / 2, hb = (s.b1 - s.b0) / 2 + pb, o = s.o;
        var ev = 'var on=sg(p,' + jzN(o * 0.3) + ',' + jzN(o * 0.3 + 0.1) + '),rw=sg(p,' + jzN(0.56 + o * 0.2) + ',' + jzN(0.8 + o * 0.2) + '),kb=oe(on)*lp(1,0.07,io3(sg(rw,0,0.5))),ka=1-ic(sg(rw,0.4,1));if(kb<=0.002||ka<=0.002){kb=0;ka=0;}';
        axi_rect(S, 'bar ' + (k + 1), K.C.c0, K, ev, [jzN(s.a0 - pa), jzN(bc) + '-' + jzN(hb) + '*kb', jzN(s.a0 - pa) + '+' + jzN(s.a1 - s.a0 + pa * 2) + '*ka', jzN(bc) + '+' + jzN(hb) + '*kb']);
    }
} });

/* ---- xiInverseBand — 反転帯: a band in the text's colour opens behind the line so the text flips to the background colour; the
   band then closes in from both ends and takes the text with it (band = shape over L; the flipped text = a twin in the
   background colour through a matte of the same band) */
jzReg('exit', 'xiInverseBand', { apply: function (m) {
    var K = axi_K(m, 0.14);
    var ev = 'var q1=oe(sg(p,0,0.26)),q2=io3(sg(p,0.38,1)),ia=lp(A0,AC,q2),ic2=lp(A1,AC,q2),ih=CR/2*q1;if(ic2-ia<0.4||ih<0.2){ic2=ia;ih=0;}';
    var e = ['ia', 'BC-ih', 'ic2', 'BC+ih'], crowd = axi_crowded(K);
    axi_safe(K, '', 'p>=0.26?0:1');
    var S = axi_gfx(K, 'JZ Out Band', ev, '1');
    if (!S) return;
    axi_rect(S, 'band', K.C.c0, K, ev, e);
    if (crowd) return;
    var T = axi_twin(K, 'JZ Out Flipped', '', 'ON?1:0', null, S);
    jzNoGhost(T);
    jzAnimator(T, 'JZ Out Flip', [['ADBE Text Fill Color', jzHex(K.C.bg)], ['ADBE Text Stroke Color', jzHex(K.C.bg)]], '100');
    var M = axi_matte(K, T, 'JZ Out Band Matte');
    axi_rect(M, 'band', '#FFFFFF', K, ev, e);
} });

/* ---- xiFillDrop — 塗りが落ちる: the solid fill lets go of its outline and drops out through a slot under the line; the empty
   outline is then un-drawn (AE cannot trim a text stroke: the outline is wiped away along the line while it fades) */
jzReg('exit', 'xiFillDrop', { apply: function (m) {
    var K = axi_K(m, 0.12), sz = K.sz;
    if (!K.G.fill) {       // outline text: only the un-drawing
        axi_wipe(K, K.L, 'a0', '', 'ios(p)*LEN*1.02', 'JZ Out Undraw');
        axi_safe(K, '', '1-sm(0.92,1,p)');
        return;
    }
    var ev = 'var q=sg(p,0,0.56),dr=' + jzN(K.h + sz * 0.3) + '*(iq(q)*1.02-0.02*Math.sin(Math.PI*sg(q,0,0.3))),ud=sg(p,0.38,0.97);';
    var crowd = axi_crowded(K), T = null;
    if (!crowd) {          // the falling fill: a twin clipped at the slot (made before L turns into its outline)
        T = axi_twin(K, 'JZ Out Fill', ev, 'ON&&q<1?1-sm(0.92,1,p):0', '[0,dr]');
        var B = K.big * 4 + K.far, mk = axi_mask(T, [[K.x1 + B, K.y1], [K.x1 + B, K.y1 + B], [K.x0 - B, K.y1 + B], [K.x0 - B, K.y1]], 'sub', 'JZ Out Slot');
        jzSetExpr(mk.property('ADBE Mask Offset'), K.HD + ev + 'Math.max(0,dr)');
        K.M = T;
    }
    axi_outline(K, ev, 'SZ*0.022*Math.min(1,p*10)', crowd ? 'p>0?ios(q)*100:0' : 'p>0?100:0');
    axi_wipe(K, K.L, 'a0', ev, 'ios(ud)*LEN*1.02', 'JZ Out Undraw');
    axi_safe(K, '', '1-sm(0.92,1,p)');
    var S = axi_gfx(K, 'JZ Out Slot', '', 'sg(p,0.02,0.12)*(1-sg(p,0.5,0.62))');
    if (!S) return;
    var th = Math.max(2 * K.u, sz * 0.03), g = jzGrp(S, 'slot');
    jzAddRect(g, K.w, th, 0, K.cx, K.y1 + th / 2); jzAddFill(g, K.C.hot);
} });

/* ---- xiDotted — 点線にほどける: the fill is wiped off, leaving the bare outline; the outline breaks into dashes, the dashes
   shorten to dots, and the dots go out (AE cannot dash a text stroke: fine diagonal blinds chop the outline into dashes
   that shorten the same way) */
jzReg('exit', 'xiDotted', { apply: function (m) {
    var K = axi_K(m, 0.3), sz = K.sz, had = K.G.fill, rev = axi_bit(m, 65), crowd = axi_crowded(K);
    var unit = Math.max(5 * K.u, sz * 0.1);
    var ev = 'var dk=io3(sg(p,' + (had ? '0.3' : '0.05') + ',0.96)),de=io3(sg(p,0,0.4));';
    if (had && !crowd) {   // the filled copy that is wiped off (made before L turns into its outline)
        var T = axi_twin(K, 'JZ Out Fill', ev, 'ON&&de<1?1:0', null);
        axi_wipe(K, T, rev ? 'a1' : 'a0', ev, 'de*LEN', 'JZ Out Fill Wipe');
        K.M = T;
    }
    axi_outline(K, ev, 'SZ*0.024*Math.min(1,p*10)', crowd ? 'p>0?de*100:0' : 'p>0?100:0');
    var vb = jzEffect(K.L, 'ADBE Venetian Blinds', 'JZ Out Dashes');
    jzEP(vb, 2, 45); jzEP(vb, 3, unit / Math.sqrt(2)); jzEP(vb, 4, 0);
    jzEX(vb, 1, K.HD + ev + 'p>0?dk*100:0');
    axi_safe(K, ev, '(1-dk)*' + jzN(unit) + '<0.05?0:1-sm(0.9,1,p)');
} });
