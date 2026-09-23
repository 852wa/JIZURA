// ================================================================ pack exit B part 2 (AE port of src/11p_exitB.js)
// rocketOff bounceOff balloonOff deflateOut hazeOut glassBreak zipOut clapShut lampOff slotOut clockOut matrixOut tornadoOut
// rollUpOut snakeOut flutterOut rollOff fanClose rgbSplitOut shockOut floodOut slashOut mosaicOut scribbleOut candleOut
// Exit progress = PO (0 → 1, everything gone at 1). Per-glyph motion = text animators with Expression Selectors; screen-space
// directions (down / right, distances to the frame edge) are converted to the text layer's own space at build time.
// Clips are layer masks on the lyric (static shapes, moved by mask expansion, active only while the exit runs) or, where a
// mask cannot draw the shape (per-glyph clock sweeps), an alpha track matte on an exit-only copy of the lyric (never on the
// lyric itself, so treatment copies made later keep working). Helper graphics (flames, strings, sliders, rings, water line,
// scribbles, smoke …) are shape layers parented to the text layer, alive only during the exit and kept out of the ghosts.
// Copies ("twins") are duplicates of the lyric made before the exit's own animators, parented to it, visible only in the exit.

// ---------------------------------------------------------------- shared helpers (xb2_*)
// easings not in JZ_FNS: ios inOutSine, io3 inOutCubic, sm smoothstep(a, b, x), wn browser win(p, o, spread), n1 smooth 1-D noise (-1..1)
var XB2_FNS = 'function ios(x){x=cl(x);return -(Math.cos(Math.PI*x)-1)/2;}' +
    'function io3(x){x=cl(x);return x<0.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;}' +
    'function sm(a,b,x){x=cl((x-a)/(b-a));return x*x*(3-2*x);}' +
    'function wn(p,o,s){return cl((p-o*s)/(1-s));}' +
    'function n1(x,s){var i=Math.floor(x),f=x-i,u=f*f*(3-2*f);return (hh(i*1.37+s)*(1-u)+hh(i*1.37+1.37+s)*u)*2-1;}\n';
var XB2_BIG = 30000;

// size reference = the text document's real (fitted) font size, like the browser's it.size (m.size / SZ is the size the layout asked for)
function xb2_sz(m) { var td = xb2_td(m.L); return td && td.fontSize > 0 ? td.fontSize : m.size; }
function xb2_hd(m) { return m.HD + XB2_FNS + 'SZ=' + jzN(xb2_sz(m)) + ';\n'; }
function xb2_T(m) { var c = m.c; return { OS: c.dur - (c.outDur || 0), OD: Math.max(0.001, c.outDur || 0), DUR: c.dur }; }
function xb2_n(x) { return '(' + jzN(x) + ')'; }
function xb2_arr(a) { var s = [], i; for (i = 0; i < a.length; i++) s.push(jzN(a[i])); return '[' + s.join(',') + ']'; }
function xb2_pt(x, y) { return '[' + jzN(x) + ',' + jzN(y) + ']'; }
// the browser's J.h / J.r (seeded directions match the web version)
function xb2_h(a, b, c, d, e) {
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
function xb2_r(a, b, c, d, e) { return xb2_h(a, b, c, d, e) / 4294967296; }
function xb2_rs(a, b, c, d, e) { return xb2_r(a, b, c, d, e) * 2 - 1; }
function xb2_bit(m, k) { return (xb2_h(m.c.seed | 0, k, 1991) & 1) === 1; }      // browser cutBit
function xb2_cr(m, k) { return xb2_r(m.c.seed | 0, k, 1993); }                     // browser cutR
function xb2_isHex(c) { return typeof c === 'string' && c.charAt(0) === '#' && (c.length === 7 || c.length === 4); }
function xb2_pick(a, b, c) { if (xb2_isHex(a)) return a; if (xb2_isHex(b)) return b; if (xb2_isHex(c)) return c; return '#FFFFFF'; }
function xb2_mix(a, b, t) { return jzMixHex(xb2_pick(a), xb2_pick(b), jzClamp(t, 0, 1)); }
function xb2_col(m) {
    var sc = m.ctx.sc || {}, bg = xb2_pick(sc.bg, '#000000');
    return { bg: bg, fg: xb2_pick(sc.fg, '#FFFFFF'), acc: xb2_pick(sc.accent, sc.fg), sub: xb2_pick(sc.sub, sc.fg), dark: jzLum(bg) < 0.5,
        c0: xb2_pick(jzTextColor(m.L), sc.fg), gA: xb2_pick(sc.ghostA, sc.accent, sc.fg), gB: xb2_pick(sc.ghostB, sc.fg) };
}
function xb2_td(L) { try { return L.property('ADBE Text Properties').property('ADBE Text Document').value; } catch (e) { return null; } }
function xb2_isSp(ch) { return /^[\s　]$/.test(ch); }
function xb2_layers(m) { try { return m.ctx.comp.numLayers; } catch (e) { return 0; } }
// order 0..1 of a one-glyph layer within the cut (browser orderOf for single-glyph items)
function xb2_og(m) { var N = jzCount(m.c.text || ''), mi = m.o.mi || 0; return N > 1 ? jzClamp(mi / (N - 1), 0, 1) : 0; }
// per-glyph index / order: in a selector (ti = textIndex) or for glyph i of n in helper-layer expressions
function xb2_sel(m) { return 'var ti=textIndex,tn=textTotal,o=tn>1?(ti-1)/(tn-1):' + jzN(xb2_og(m)) + ';'; }
function xb2_at(m, i, n) { return 'var ti=' + (i + 1) + ',tn=' + n + ',o=tn>1?(ti-1)/(tn-1):' + jzN(xb2_og(m)) + ';'; }
// screen frame of the layer: s = scale, k = layer px per comp px, dn / rt = screen down / right as unit vectors in layer space
function xb2_frame(m) {
    var tr = m.L.property('ADBE Transform Group'), s = 1, r = 0;
    try { s = Math.abs(tr.property('ADBE Scale').value[0]) / 100; } catch (e0) {}
    if (!(s > 0.01)) s = 1;
    try { r = tr.property('ADBE Rotate Z').value * Math.PI / 180; } catch (e1) {}
    return { s: s, k: 1 / s, r: r, deg: r * 180 / Math.PI, dn: [Math.sin(r), Math.cos(r)], rt: [Math.cos(r), -Math.sin(r)] };
}
function xb2_dirs(F) { return 'var DN0=' + jzN(F.dn[0]) + ',DN1=' + jzN(F.dn[1]) + ',RT0=' + jzN(F.rt[0]) + ',RT1=' + jzN(F.rt[1]) + ';'; }
function xb2_toComp(L, x, y) {
    var tr = L.property('ADBE Transform Group'), a = tr.property('ADBE Anchor Point').value, p = tr.property('ADBE Position').value;
    var s = tr.property('ADBE Scale').value, r = tr.property('ADBE Rotate Z').value * Math.PI / 180;
    var ux = (x - a[0]) * s[0] / 100, uy = (y - a[1]) * s[1] / 100;
    return [p[0] + Math.cos(r) * ux - Math.sin(r) * uy, p[1] + Math.sin(r) * ux + Math.cos(r) * uy];
}
function xb2_toLayer(L, X, Y) {
    var tr = L.property('ADBE Transform Group'), a = tr.property('ADBE Anchor Point').value, p = tr.property('ADBE Position').value;
    var s = tr.property('ADBE Scale').value, r = tr.property('ADBE Rotate Z').value * Math.PI / 180;
    var dx = X - p[0], dy = Y - p[1], c = Math.cos(r), sn = Math.sin(r), sx = (s[0] || 100) / 100, sy = (s[1] || 100) / 100;
    return [a[0] + (c * dx + sn * dy) / sx, a[1] + (-sn * dx + c * dy) / sy];
}
// comp-space bounding box of a layer-space rect
function xb2_cbox(L, r) {
    var P = [[r.left, r.top], [r.left + r.width, r.top], [r.left, r.top + r.height], [r.left + r.width, r.top + r.height]], x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, i;
    for (i = 0; i < 4; i++) { var q = xb2_toComp(L, P[i][0], P[i][1]); x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]); }
    return { x0: x0, y0: y0, x1: x1, y1: y1, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
}
function xb2_meas(T, L, s, just) {
    var d = L.property('ADBE Text Properties').property('ADBE Text Document').value;
    d.text = s; d.justification = just;
    T.property('ADBE Text Properties').property('ADBE Text Document').setValue(d);
    var q = T.sourceRectAtTime(0, false);
    return { l: q.left, r: q.left + q.width };
}
// Geometry of the lyric in the text layer's own space (call BEFORE adding animators).
//   G.fs, G.lead, G.rect, G.vert (one glyph per line), G.nL, G.lines[{cy, x0, x1, chars}], G.N = textTotal, G.nk (glyphs without spaces)
//   G.g[] per AE character (textIndex order, spaces included): {i, li, sp, x0, x1, cx, cy, w, h}; G.arranged / G.masked
function xb2_geo(m, measure) {
    var L = m.L, TP = L.property('ADBE Text Properties'), td = TP.property('ADBE Text Document').value, i, j;
    var fs = td.fontSize, lead = (!td.autoLeading && td.leading > 0) ? td.leading : fs * 1.2;
    var lines = String(td.text).split(/\r\n|\r|\n|\u0003/), nL = lines.length, r = jzRect(L);
    var G = { fs: fs, lead: lead, nL: nL, rect: r, g: [], lines: [], N: 0, nk: 0, vert: nL > 1, arranged: false, masked: false };
    try { G.arranged = TP.property('ADBE Text Animators').numProperties > 0; } catch (e0) {}
    try { if (TP.property('ADBE Text Path Options').property('ADBE Text Path').value > 0) G.arranged = true; } catch (e1) {}
    try { G.masked = L.property('ADBE Mask Parade').numProperties > 0; } catch (e2) {}
    var inkH = r.height - (nL - 1) * lead; if (!(inkH > fs * 0.3 && inkH < fs * 2)) inkH = fs * 0.9;
    var cy0 = r.top + inkH / 2, trk = (td.tracking || 0) / 1000 * fs;
    for (i = 0; i < nL; i++) { var cs0 = jzChars(lines[i]); if (cs0.length > 1) G.vert = false; G.lines.push({ chars: cs0, cy: cy0 + i * lead, x0: r.left, x1: r.left + r.width }); }
    var T = null;
    if (measure && !G.arranged && jzCount(td.text) <= 60) { try { T = m.ctx.comp.layers.addText('x'); } catch (e3) { T = null; } }
    var LEFT = ParagraphJustification.LEFT_JUSTIFY;
    try {
        for (i = 0; i < nL; i++) {
            var ln = G.lines[i], cs = ln.chars, n = cs.length;
            if (!n) continue;
            var F = null, F0 = null, off = 0, prev = 0;
            if (T && !G.vert) {
                F = xb2_meas(T, L, lines[i], td.justification); ln.x0 = F.l; ln.x1 = F.r;
                if (n > 1) { F0 = xb2_meas(T, L, lines[i], LEFT); off = F.l - F0.l; }
                prev = F.l - trk;
            } else if (!G.vert) {
                var wEst = r.width / Math.max(1, n), lx = r.left + (r.width - wEst * n) / 2;
                ln.x0 = lx; ln.x1 = lx + wEst * n; prev = lx - trk;
            }
            for (j = 0; j < n; j++) {
                var sp = xb2_isSp(cs[j]), x0, x1;
                if (G.vert) { x0 = r.left; x1 = r.left + r.width; }
                else if (T) {
                    x0 = prev + trk;
                    x1 = (j === n - 1) ? F.r : off + xb2_meas(T, L, cs.slice(0, j + 1).join(''), LEFT).r;
                    if (x1 < x0) x1 = x0;
                    prev = x1;
                } else { x0 = prev + trk; x1 = x0 + (r.width + trk) / Math.max(1, n) - trk; prev = x1; }
                var gi = { i: G.N, li: i, sp: sp, x0: x0, x1: x1, cx: (x0 + x1) / 2, cy: ln.cy, w: Math.max(1, x1 - x0), h: fs };
                if (G.vert) gi.w = Math.min(r.width, fs);
                G.g.push(gi); G.N++; if (!sp) G.nk++;
            }
        }
    } catch (e4) { jzWarn('xb2 geometry: ' + e4.toString()); }
    if (T) { try { T.remove(); } catch (e5) {} }
    if (!G.N) { G.g.push({ i: 0, li: 0, sp: false, x0: r.left, x1: r.left + r.width, cx: r.left + r.width / 2, cy: r.top + r.height / 2, w: Math.max(1, r.width), h: fs }); G.N = 1; G.nk = 1; }
    return G;
}
// reading lines [{u0, u1, v}] (u along the reading direction, v = line centre across it); vertical text = one column
function xb2_lines(G) {
    var r = G.rect, out = [], i, j;
    if (G.vert) return [{ li: -1, u0: r.top, u1: r.top + r.height, v: r.left + r.width / 2 }];
    for (i = 0; i < G.nL; i++) {
        var u0 = 1e9, u1 = -1e9;
        for (j = 0; j < G.N; j++) { var g = G.g[j]; if (g.li !== i || g.sp) continue; if (g.x0 < u0) u0 = g.x0; if (g.x1 > u1) u1 = g.x1; }
        if (u1 > u0) out.push({ li: i, u0: u0, u1: u1, v: G.lines[i].cy });
    }
    return out;
}
// one glyph per layer inside a longer lyric (browser isSingle)
function xb2_single(m, G) { return G.nk <= 1 && jzCount(m.c.text || '') > 1; }
// helper layers / twins are skipped for very long lines, one-glyph-per-layer layouts of long lyrics and crowded comps
function xb2_crowded(m, G) {
    if (G && (G.N > 60 || (G.nk <= 1 && jzCount(m.c.text || '') > 14))) return true;
    return xb2_layers(m) > 60;
}
// the lyric's opaque, filled copy (helper graphics only go there)
function xb2_main(m, G) {
    var td = xb2_td(m.L);
    if (td && td.applyFill === false) return false;
    try { if (jzXf(m.L, 'ADBE Opacity').value < 85) return false; } catch (e) {}
    return !xb2_crowded(m, G);
}
// per-glyph helper groups are only drawn for lines of reasonable length
function xb2_fewGlyphs(G) { return G.nk <= 24 && !G.arranged; }
function xb2_matted(L) { try { return L.trackMatteType !== TrackMatteType.NO_TRACK_MATTE; } catch (e) { return false; } }
// layer that helper layers go above (above the lyric's own layout matte if it has one)
function xb2_top(m) { var L = m.L; if (xb2_matted(L)) { try { return m.ctx.comp.layer(L.index - 1); } catch (e) {} } return L; }
// only alive during the exit
function xb2_live(m, Lx) { var t = xb2_T(m); try { Lx.inPoint = Math.max(0, Math.min(t.OS - 0.04, t.DUR - 0.05)); } catch (e) {} }
// helper shape layer drawn in the text layer's own space (parented to it, above it), exit only, main pass only
function xb2_shape(m, name, above) {
    var L = m.L, S = m.ctx.comp.layers.addShape();
    try { S.name = name; } catch (e0) {}
    try { S.moveBefore(above || xb2_top(m)); } catch (e1) {}
    S.parent = L;
    var tr = S.property('ADBE Transform Group');
    tr.property('ADBE Anchor Point').setValue([0, 0]); tr.property('ADBE Position').setValue([0, 0]);
    tr.property('ADBE Scale').setValue([100, 100]); tr.property('ADBE Rotate Z').setValue(0);
    xb2_live(m, S);
    jzNoGhost(S);
    return S;
}
function xb2_sub(g, name) { var s = jzVecs(g).addProperty('ADBE Vector Group'); if (name) s.name = name; return s; }
// copy of the lyric shown only during the exit: parented to L (follows every move of it), takes L's final text style,
// made before the exit's own animators. pre: expression statements; opEx: opacity factor; posEx: position (default on L)
function xb2_twin(m, tag, pre, opEx, posEx, below) {
    var L = m.L, top = xb2_top(m), D = L.duplicate(), i, mns = ['ADBE Position', 'ADBE Scale', 'ADBE Rotate Z', 'ADBE Opacity', 'ADBE Anchor Point'];
    try { D.name = String(L.name).substr(0, 20) + ' ' + tag; } catch (e0) {}
    var tr = D.property('ADBE Transform Group');
    for (i = 0; i < mns.length; i++) { try { if (tr.property(mns[i]).expression) tr.property(mns[i]).expression = ''; } catch (e1) {} }
    try { if (xb2_matted(D)) D.trackMatteType = TrackMatteType.NO_TRACK_MATTE; } catch (e2) {}
    try { if (below) D.moveAfter(L); else D.moveBefore(top); } catch (e3) {}
    D.parent = L;
    tr.property('ADBE Scale').setValue([100, 100]); tr.property('ADBE Rotate Z').setValue(0);
    jzSetExpr(tr.property('ADBE Position'), posEx ? xb2_hd(m) + (pre || '') + posEx : 'parent.transform.anchorPoint');
    jzSetExpr(tr.property('ADBE Opacity'), xb2_hd(m) + (pre || '') + 'PO>0&&PO<0.998?value*(' + (opEx || '1') + '):0');
    try { D.property('ADBE Text Properties').property('ADBE Text Document').expression = 'parent.text.sourceText.style'; } catch (e4) {}
    xb2_live(m, D);
    return D;
}
// masks in the layer's space; intersect with masks the layout already put on the layer
function xb2_maskPoly(Lx, pts, name, expEx, feather) {
    var n0 = 0; try { n0 = Lx.property('ADBE Mask Parade').numProperties; } catch (e0) {}
    var mk = Lx.property('ADBE Mask Parade').addProperty('ADBE Mask Atom'), sh = new Shape();
    sh.vertices = pts; sh.closed = true;
    mk.property('ADBE Mask Shape').setValue(sh);
    try { if (name) mk.name = name; } catch (e1) {}
    if (n0 > 0) { try { mk.maskMode = MaskMode.INTERSECT; } catch (e2) {} }
    if (feather) { try { mk.property('ADBE Mask Feather').setValue([feather, feather]); } catch (e3) {} }
    if (expEx) jzSetExpr(mk.property('ADBE Mask Offset'), expEx);
    return mk;
}
function xb2_maskRect(Lx, x0, y0, x1, y1, name, expEx, feather) { return xb2_maskPoly(Lx, [[x1, y0], [x1, y1], [x0, y1], [x0, y0]], name, expEx, feather); }
// alpha track matte: D shows only inside S (S right above D)
function xb2_matte(D, S) {
    var ok = false;
    try { S.moveBefore(D); } catch (e0) {}
    if (typeof D.setTrackMatte === 'function') { try { D.setTrackMatte(S, TrackMatteType.ALPHA); ok = true; } catch (e1) { ok = false; } }
    if (!ok) { try { D.trackMatteType = TrackMatteType.ALPHA; } catch (e2) { jzWarn('xb2 matte: ' + e2.toString()); } }
}
// Transform effect (layer space): anchor at (cx, cy); position / rotation expressions
function xb2_xform(Lx, name, cx, cy, posEx, rotEx) {
    var e = jzEffect(Lx, 'ADBE Geometry2', name);
    jzEP(e, 1, [cx, cy]); jzEP(e, 2, [cx, cy]);
    if (posEx) jzEX(e, 2, posEx);
    if (rotEx) jzEX(e, 8, rotEx);
    return e;
}
// keep the point (px, py) of L's own space fixed while the layer is scaled by fx / fy (expression strings) -> m.parts.pos snippet
function xb2_pivot(m, fx, fy, px, py, pre) {
    var tr = m.L.property('ADBE Transform Group'), a = tr.property('ADBE Anchor Point').value, s = tr.property('ADBE Scale').value;
    var r0 = tr.property('ADBE Rotate Z').value * Math.PI / 180, ux = (px - a[0]) * s[0] / 100, uy = (py - a[1]) * s[1] / 100;
    if (Math.abs(ux) + Math.abs(uy) < 0.5) return '';
    var c = Math.cos(r0), sn = Math.sin(r0);
    return (pre || '') + 'var pvx=(1-(' + fx + '))*' + xb2_n(ux) + ',pvy=(1-(' + fy + '))*' + xb2_n(uy) + ';d=[d[0]+' + xb2_n(c) + '*pvx+' + xb2_n(-sn) + '*pvy,d[1]+' + xb2_n(sn) + '*pvx+' + xb2_n(c) + '*pvy];';
}
// sine Wave Warp (height / phase expressions; direction 0 = horizontal displacement in slices, 90 = vertical)
function xb2_wave(Lx, name, dir, width, hEx, phEx) {
    var ww = jzEffect(Lx, 'ADBE Wave Warp', name);
    jzEP(ww, 1, 1); jzEP(ww, 3, Math.max(2, width)); jzEP(ww, 4, dir); jzEP(ww, 5, 0); jzEP(ww, 6, 1);
    jzEX(ww, 2, hEx); jzEX(ww, 7, phEx);
    return ww;
}
// every exit ends fully gone (the browser's p >= 0.998 safety net)
// (the layer transform snippets are composed with m.HD only: XB2_FNS goes in front of the first snippet this exit adds)
function xb2_reg(key, fn) {
    jzReg('exit', key, { apply: function (m) {
        var ks = ['sc', 'pos', 'op', 'rot'], n0 = [], i;
        for (i = 0; i < ks.length; i++) n0.push(m.parts[ks[i]].length);
        fn(m);
        m.parts.op.push('f*=PO>=0.998?0:1;');
        for (i = 0; i < ks.length; i++) if (m.parts[ks[i]].length > n0[i]) m.parts[ks[i]].splice(n0[i], 0, XB2_FNS);
    } });
}
// fallback when helper layers would be too many: glyphs burst apart, tumble and drop
function xb2_burst(m) {
    var L = m.L, sz = xb2_sz(m), K = sz * 3, F = xb2_frame(m);
    var q = xb2_hd(m) + xb2_dirs(F) + xb2_sel(m) + 'var q=wn(PO,hh(ti*3.1+SD+7)*0.35,0.35),a=hh(ti*5.3+SD+9)*6.2832,e=q*q,fa=e*e;';
    jzAnimator(L, 'JZ Out Burst', [['ADBE Text Position 3D', [K, K, 0]]], q + 'q>0?[(Math.cos(a)*0.5*e+DN0*0.5*fa)*100,(Math.sin(a)*0.5*e+DN1*0.5*fa)*100,0]:[0,0,0]');
    jzAnimator(L, 'JZ Out Tumble', [['ADBE Text Rotation', 220]], q + 'q>0?(hh(ti*7.7+SD+3)*2-1)*e*100:0');
    jzAnimator(L, 'JZ Out Fade', [['ADBE Text Opacity', 0]], q + 'q>=1?100:sm(0.55,1,q)*100');
}

/* ================================================================ MECHANICS */

/* ---- rocketOff — 打ち上げ: each glyph squats, then blasts off upward on a flame trail, leaving a puff of smoke on the pad */
xb2_reg('rocketOff', function (m) {
    var L = m.L, G = xb2_geo(m, true), F = xb2_frame(m), sz = xb2_sz(m), H = xb2_hd(m), C = xb2_col(m), i;
    var cb = xb2_cbox(L, G.rect), D = Math.max(sz * 2, cb.y1 * F.k + sz * 1.6), K = D + sz;
    var base = 'var q=wn(PO,hh(ti*7.31+SD+111)*0.85,0.55),u=q<0.3?0:(q-0.3)/0.7,Lf=' + jzN(D) + '*Math.pow(u,2.3),hz=SZ*0.5,st=1+Math.min(0.8,3*u*u);';
    var sel = H + xb2_dirs(F) + xb2_sel(m) + base;
    jzAnimator(L, 'JZ Out Rocket', [['ADBE Text Position 3D', [K, K, 0]]], sel +
        'var dx=0,dy=0;if(q>0&&q<0.3){var uu=q/0.3,sq=Math.sin(uu*Math.PI/2),k=1-0.22*sq;seedRandom(ti*31+SD+Math.floor(time*24),true);var sh=random(-1,1)*SZ*0.02*uu;' +
        'dx=DN0*(1-k)*hz+RT0*sh;dy=DN1*(1-k)*hz+RT1*sh;}else if(q>=0.3){dx=-DN0*Lf;dy=-DN1*Lf;}[dx/' + jzN(K) + '*100,dy/' + jzN(K) + '*100,0]');
    jzAnimator(L, 'JZ Out Rocket Squash', [['ADBE Text Scale 3D', [200, 200, 100]]], sel +
        'var fx=1,fy=1;if(q>0&&q<0.3){var sq=Math.sin(q/0.3*Math.PI/2);fy=1-0.22*sq;fx=1+0.12*sq;}else if(q>=0.3){fy=st;fx=1-0.12*(st-1);}[(fx-1)*100,(fy-1)*100,0]');
    jzAnimator(L, 'JZ Out Hide', [['ADBE Text Opacity', 0]], sel + 'q>=1?100:0');
    if (!xb2_main(m, G) || !xb2_fewGlyphs(G)) return;
    // flame trail + nose flame on every glyph, smoke puffs on its launch pad
    var S = xb2_shape(m, 'JZ Out Rocket Flames'), T = sz * 2.6;
    for (i = 0; i < G.N; i++) {
        var g = G.g[i]; if (g.sp) continue;
        var E = H + xb2_at(m, i, G.N) + base;
        // (group transforms are fetched after the group's contents are complete)
        var fg = jzGrp(S, 'flame ' + (i + 1));
        var tail = xb2_sub(fg, 'trail');
        var s1 = xb2_sub(tail, 'glow'); jzAddRect(s1, sz * 0.2, T, 0, 0, T / 2); jzAddFill(s1, C.acc, 28);
        var s2 = xb2_sub(tail, 'core'); jzAddRect(s2, sz * 0.08, T * 0.75, 0, 0, T * 0.375); jzAddFill(s2, C.acc, 95);
        jzSetExpr(jzGX(tail).property('ADBE Vector Scale'), E + '[100,Math.min(Lf,' + jzN(T) + ')/' + jzN(T) + '*100]');
        var tip = xb2_sub(fg, 'tip'); jzAddPath(tip, [[-sz * 0.1, 0], [sz * 0.1, 0], [0, sz * 0.45]], true); jzAddFill(tip, C.acc);
        var gx = jzGX(fg);
        gx.property('ADBE Vector Rotation').setValue(-F.deg);
        jzSetExpr(gx.property('ADBE Vector Position'), E + '[' + jzN(g.cx) + '+' + xb2_n(F.dn[0]) + '*(hz*st-Lf),' + jzN(g.cy) + '+' + xb2_n(F.dn[1]) + '*(hz*st-Lf)]');
        jzSetExpr(gx.property('ADBE Vector Group Opacity'), E + 'q>=0.3&&q<1?(1-u*0.8)*100:0');
        var sm = jzGrp(S, 'smoke ' + (i + 1)), sx, k;
        for (k = 0; k < 3; k++) { var d = sz * 0.6 * (1 - Math.abs(k - 1) * 0.3); jzAddEllipse(sm, d, d, (k - 1) * sz * 0.35, -sz * 0.05); }
        jzAddFill(sm, C.sub, 35);
        sx = jzGX(sm);
        sx.property('ADBE Vector Position').setValue([g.cx + F.dn[0] * g.h * 0.5, g.cy + F.dn[1] * g.h * 0.5]);
        sx.property('ADBE Vector Rotation').setValue(-F.deg);
        jzSetExpr(sx.property('ADBE Vector Scale'), E + 'var s=(0.08+0.22*u)/0.3*100;[s,s]');
        jzSetExpr(sx.property('ADBE Vector Group Opacity'), E + 'q>=0.3&&q<1?(1-u)*100:0');
    }
});

/* ---- bounceOff — 弾んで去る: glyphs hop away sideways in shrinking bounces, squashing on every landing */
var XB2_HOPS = 'function hops(q){var R=0.64,S=0,j,d,t;for(j=0;j<4;j++)S+=Math.pow(R,j);t=q*S;for(j=0;j<4;j++){d=Math.pow(R,j);if(t<=d||j==3){var u=cl(t/d),hk=d*d;' +
    'return [hk*4*u*(1-u),Math.max(0,1-Math.min(u,1-u)/0.09)*Math.sqrt(hk)];}t-=d;}return [0,0];}';
// distance (layer px) each glyph travels to leave the frame sideways
function xb2_edgeDist(m, G, F, dir, extra) {
    var DI = [], i, mx = 0;
    for (i = 0; i < G.N; i++) {
        var c = xb2_toComp(m.L, G.g[i].cx, G.g[i].cy), d = (dir > 0 ? m.W - c[0] : c[0]) * F.k + extra;
        d = Math.max(extra, d); DI.push(d); if (d > mx) mx = d;
    }
    return { DI: DI, mx: mx };
}
xb2_reg('bounceOff', function (m) {
    var L = m.L, G = xb2_geo(m, true), F = xb2_frame(m), sz = xb2_sz(m), dir = xb2_bit(m, 121) ? 1 : -1;
    var ED = xb2_edgeDist(m, G, F, dir, sz * 1.2), K = ED.mx + sz * 2;
    var sel = xb2_hd(m) + XB2_HOPS + xb2_dirs(F) + xb2_sel(m) + (dir > 0 ? 'o=1-o;' : '') + 'var DI=' + xb2_arr(ED.DI) + ',q=wn(PO,o,0.42),on=q>0&&q<1,dist=DI[ti-1]||DI[0],' +
        'along=' + dir + '*dist*Math.pow(q,1.25),hp=hops(q),h=hp[0]*SZ*1.4,sq=on?0.3*hp[1]:0,kk=1-sq,hz=SZ*0.5;';
    jzAnimator(L, 'JZ Out Hop', [['ADBE Text Position 3D', [K, K, 0]]], sel + 'on?[(RT0*along-DN0*h+DN0*(1-kk)*hz)/' + jzN(K) + '*100,(RT1*along-DN1*h+DN1*(1-kk)*hz)/' + jzN(K) + '*100,0]:[0,0,0]');
    jzAnimator(L, 'JZ Out Hop Tilt', [['ADBE Text Rotation', 14]], sel + 'on?' + dir + '*Math.sin(Math.PI*Math.min(1,hp[0]*4))*100:0');
    jzAnimator(L, 'JZ Out Hop Squash', [['ADBE Text Scale 3D', [200, 200, 100]]], sel + '[sq*70,-sq*100,0]');
    jzAnimator(L, 'JZ Out Hide', [['ADBE Text Opacity', 0]], sel + 'q>=1?100:0');
});

/* ---- balloonOff — 風船で飛ぶ: each glyph floats up on a string, swaying like a pendulum below its balloon */
xb2_reg('balloonOff', function (m) {
    var L = m.L, G = xb2_geo(m, true), F = xb2_frame(m), sz = xb2_sz(m), H = xb2_hd(m), C = xb2_col(m), i;
    var cb = xb2_cbox(L, G.rect), D = Math.max(sz * 2, cb.y1 * F.k + sz * 1.8), K = D + sz;
    var base = 'var q=wn(PO,hh(ti*5.17+SD+141),0.45),on=q>0&&q<1,Lf=' + jzN(D) + '*Math.pow(q,1.7),ph=hh(ti*3.7+SD+142)*6.2832,w=7+3*hh(ti*2.9+SD+143),am=Math.min(1,q*3),' +
        'sw=Math.sin(q*w+ph)*SZ*0.22*am,rr=-Math.cos(q*w+ph)*11*am,inf=1+0.07*Math.sin(Math.PI*Math.min(1,q*2.5));';
    var sel = H + xb2_dirs(F) + xb2_sel(m) + base;
    jzAnimator(L, 'JZ Out Balloon', [['ADBE Text Position 3D', [K, K, 0]]], sel + 'on?[(RT0*sw-DN0*Lf)/' + jzN(K) + '*100,(RT1*sw-DN1*Lf)/' + jzN(K) + '*100,0]:[0,0,0]');
    jzAnimator(L, 'JZ Out Sway', [['ADBE Text Rotation', 11]], sel + 'on?rr/11*100:0');
    jzAnimator(L, 'JZ Out Inflate', [['ADBE Text Scale 3D', [200, 200, 100]]], sel + 'on?[(inf-1)*100,(inf-1)*100,0]:[0,0,0]');
    jzAnimator(L, 'JZ Out Hide', [['ADBE Text Opacity', 0]], sel + 'q>=1?100:0');
    if (!xb2_main(m, G) || !xb2_fewGlyphs(G)) return;
    // the strings hang from the glyph bottoms and swing with them
    var S = xb2_shape(m, 'JZ Out Balloon Strings'), lw = Math.max(1 * m.u, sz * 0.014);
    for (i = 0; i < G.N; i++) {
        var g = G.g[i]; if (g.sp) continue;
        var E = H + xb2_dirs(F) + xb2_at(m, i, G.N) + base, hz = g.h * 0.5;
        var sg = jzGrp(S, 'string ' + (i + 1));
        jzAddPath(sg, [[0, hz], [sz * 0.05, hz + sz * 0.35], [-sz * 0.03, hz + sz * 0.65], [0, hz + sz * 0.95]], false);
        var st = jzAddStroke(sg, C.sub, lw); try { st.property('ADBE Vector Stroke Line Join').setValue(2); } catch (e0) {}
        var gx = jzGX(sg);             // (fetched after the group's contents are complete)
        jzSetExpr(gx.property('ADBE Vector Position'), E + '[' + jzN(g.cx) + '+RT0*sw-DN0*Lf,' + jzN(g.cy) + '+RT1*sw-DN1*Lf]');
        jzSetExpr(gx.property('ADBE Vector Rotation'), E + 'rr');
        jzSetExpr(gx.property('ADBE Vector Group Opacity'), E + 'on?85*Math.min(1,q*8):0');
    }
});

/* ---- deflateOut — しぼんで飛ぶ: each glyph puffs up, then zips around erratically like a let-go balloon while it shrinks away */
xb2_reg('deflateOut', function (m) {
    var L = m.L, sz = xb2_sz(m), K = sz * 9;
    var sel = xb2_hd(m) + xb2_sel(m) + 'var q=wn(PO,hh(ti*6.1+SD+151)*0.8,0.4),x=0,y=0,rt=0,s=1,sx=1,sy=1;' +
        'if(q>0&&q<0.16){var u=q/0.16;s=1+0.16*oc(u);sx=1+0.05*Math.sin(u*25);sy=1-0.05*Math.sin(u*25);rt=(hh(ti*4.3+SD+152)*2-1)*4*u;}' +
        'else if(q>=0.16){var u=Math.min(1,(q-0.16)/0.81),th0=hh(ti*3.3+SD+153)*6.2832,th=th0,k;' +
        'for(k=0;k<14;k++){var t=(k+0.5)/14*u;th=th0+7*n1(t*5,ti*7+SD)+3*t;var v=SZ*7.5*(0.5+t)*(u/14);x+=Math.cos(th)*v;y+=Math.sin(th)*v;}' +
        'var wb=Math.sin(u*70)*0.14*(1-u);rt=(th-th0)*28.648;s=1.16*(1-Math.pow(u,1.3));sx=1+wb;sy=1-wb;}';
    jzAnimator(L, 'JZ Out Deflate', [['ADBE Text Position 3D', [K, K, 0]]], sel + '[x/' + jzN(K) + '*100,y/' + jzN(K) + '*100,0]');
    jzAnimator(L, 'JZ Out Deflate Spin', [['ADBE Text Rotation', 720]], sel + 'rt/7.2');
    jzAnimator(L, 'JZ Out Deflate Size', [['ADBE Text Scale 3D', [200, 200, 100]]], sel + '[(s*sx-1)*100,(s*sy-1)*100,0]');
    jzAnimator(L, 'JZ Out Hide', [['ADBE Text Opacity', 0]], sel + 'q>=0.97?100:0');
});

/* ---- hazeOut — 陽炎に消える: the text wobbles in rippling slices, stretches upward, tints and thins into the air */
xb2_reg('hazeOut', function (m) {
    var L = m.L, G = xb2_geo(m, false), r = G.rect, F = xb2_frame(m), sz = xb2_sz(m), C = xb2_col(m), H = xb2_hd(m), vert = G.vert;
    var E = 'var he=iq(PO);';
    m.parts.sc.push(E + 'f=[f[0]*(1-0.05*he),f[1]*(1+0.3*he)];');
    m.parts.pos.push(xb2_pivot(m, '1-0.05*he', '1+0.3*he', r.left + r.width / 2, r.top + r.height, E));
    m.parts.pos.push(E + 'd=[d[0],d[1]-' + jzN(sz * F.s * 0.3) + '*he];');
    m.parts.op.push('f*=1-sm(0.3,0.94,PO);');
    jzAnimator(L, 'JZ Out Haze Tint', [['ADBE Text Fill Color', jzHex(C.acc)]], H + '30*sm(0.1,0.7,PO)');
    // browser: band shift A*sin(c*6.5-t*12)*(0.6+0.4*sin(c*2.3+t*5)), c = band centre / size -> two sine Wave Warps across the slices
    var A = H + 'var A=PO>0?SZ*(0.02+0.26*ios(PO)):0;';
    xb2_wave(L, 'JZ Out Haze 1', vert ? 90 : 0, sz * 2 * Math.PI / 6.5, A + 'A*0.42', 'time*687.5');
    xb2_wave(L, 'JZ Out Haze 2', vert ? 90 : 0, sz * 2 * Math.PI / 2.3, A + 'A*0.16', '90-time*286.5');
});

/* ---- glassBreak — ガラス割れ: an impact cracks the text like a pane of glass, then the shards tumble and drop away
   (browser: inner + outer shard per spoke -> AE: one pie-shaped shard per spoke, each a masked copy with a Transform effect) */
xb2_reg('glassBreak', function (m) {
    var L = m.L, G = xb2_geo(m, false), r = G.rect, F = xb2_frame(m), sz = xb2_sz(m), seed = m.c.seed | 0, C = xb2_col(m), H = xb2_hd(m), k, j;
    var single = xb2_single(m, G), nl = xb2_layers(m);
    if (xb2_crowded(m, G) || (single && nl > 26) || nl > 48) { xb2_burst(m); return; }
    var VE = (single ? 'var q=wn(PO,' + jzN(xb2_og(m)) + ',0.4);' : 'var q=PO;') + 'var cr=cl(q/0.2),v=cl((q-0.18)/0.82);';
    var pad = sz * 0.12, bx0 = r.left - pad, by0 = r.top - pad, bx1 = r.left + r.width + pad, by1 = r.top + r.height + pad;
    var bw = bx1 - bx0, bh = by1 - by0, ix = (bx0 + bx1) / 2 + xb2_rs(seed, 151) * bw * 0.2, iy = (by0 + by1) / 2 + xb2_rs(seed, 152) * bh * 0.12;
    var K = single ? 3 : jzClamp(Math.round(5 + bw / Math.max(1, bh) * 0.8), 6, 8);
    if (nl > 30) K = Math.min(K, 5);
    var B = [], R = [], AN = [], TAU = Math.PI * 2;
    for (k = 0; k < K; k++) {
        var a = (k + 0.35 * xb2_rs(seed, k, 153)) / K * TAU, c = Math.cos(a), s = Math.sin(a);
        var tx = c > 0 ? (bx1 - ix) / c : (c < 0 ? (bx0 - ix) / c : 1e9), ty = s > 0 ? (by1 - iy) / s : (s < 0 ? (by0 - iy) / s : 1e9);
        var tt = Math.min(tx, ty), f = 0.3 + 0.25 * xb2_r(seed, k, 154);
        B.push([ix + c * tt, iy + s * tt]); R.push([ix + c * tt * f, iy + s * tt * f]); AN.push(Math.atan2(s * tt, c * tt));
    }
    // shards: centre -> spoke k -> box corners between the spokes -> spoke k+1
    var CO = [[bx1, by1], [bx0, by1], [bx0, by0], [bx1, by0]], first = null, fall = m.H * F.k * 1.1;
    for (k = 0; k < K; k++) {
        var k2 = (k + 1) % K, a1 = AN[k], dd = AN[k2] - a1, poly = [[ix, iy], B[k]], cs = [];
        dd = ((dd % TAU) + TAU) % TAU;
        for (j = 0; j < 4; j++) {
            var da = Math.atan2(CO[j][1] - iy, CO[j][0] - ix) - a1; da = ((da % TAU) + TAU) % TAU;
            if (da > 0 && da < dd) cs.push([da, CO[j][0], CO[j][1]]);
        }
        cs.sort(function (p1, p2) { return p1[0] - p2[0]; });
        for (j = 0; j < cs.length; j++) poly.push([cs[j][1], cs[j][2]]);
        poly.push(B[k2]);
        var cx = 0, cy = 0; for (j = 0; j < poly.length; j++) { cx += poly[j][0]; cy += poly[j][1]; } cx /= poly.length; cy /= poly.length;
        var dl = xb2_r(seed, k, 155) * 0.3, rot = xb2_rs(seed, k, 156) * 120, ox = (cx - ix) / Math.max(1, bw) * sz * 1.2, oy = (cy - iy) / Math.max(1, bh) * sz * 0.5;
        var UE = VE + 'var u=cl((v-' + jzN(dl) + ')/' + jzN(1 - dl) + ');';
        var D = xb2_twin(m, 'JZ Out Shard ' + (k + 1), UE, 'v>0?1-sm(0.75,1,u):0');
        jzNoGhost(D);                    // the browser draws the shards on the main pass only
        if (!first) first = D;
        xb2_maskPoly(D, poly, 'JZ Out Shard');
        xb2_xform(D, 'JZ Out Shard Fall', cx, cy, H + UE + '[' + jzN(cx) + '+' + xb2_n(ox) + '*u+' + xb2_n(F.dn[0] * fall) + '*u*u,' + jzN(cy) + '+' + xb2_n(oy) + '*u+' + xb2_n(F.dn[1] * fall) + '*u*u]', H + UE + jzN(rot) + '*u*u');
    }
    m.parts.op.push(VE + 'f*=v>0?0:1;');
    // the cracks run out from the impact point (background colour), then fade while the shards drop
    var S = xb2_shape(m, 'JZ Out Cracks', first || null), lw = Math.max(1.5 * m.u, sz * 0.032);
    // (spokes, ring, impact — in this stacking order — each finished before the next group is added: adding a group
    //  invalidates references to its siblings)
    var sp = jzGrp(S, 'spokes');
    for (k = 0; k < K; k++) jzAddPath(sp, [[ix, iy], B[k]], false);
    jzAddTrimPaths(sp, H + VE + 'cr*100');
    var s1 = jzAddStroke(sp, C.bg, lw);
    jzSetExpr(s1.property('ADBE Vector Stroke Width'), H + VE + jzN(lw) + '*(v>0?Math.max(0,1-v*4):1)');
    jzSetExpr(jzGX(sp).property('ADBE Vector Group Opacity'), H + VE + 'q>0&&v<0.25?100:0');
    var rg = jzGrp(S, 'ring');
    for (k = 0; k < K; k++) jzAddPath(rg, [R[k], R[(k + 1) % K]], false);
    jzAddTrimPaths(rg, H + VE + 'cl((cr-0.5)*2)*100');
    var s2 = jzAddStroke(rg, C.bg, lw * 0.8);
    jzSetExpr(s2.property('ADBE Vector Stroke Width'), H + VE + jzN(lw * 0.8) + '*(v>0?Math.max(0,1-v*4):1)');
    jzSetExpr(jzGX(rg).property('ADBE Vector Group Opacity'), H + VE + 'cr>0.5&&v<0.25?100:0');
    var fl = jzGrp(S, 'impact'), fe = jzAddEllipse(fl, 10, 10, ix, iy);
    jzSetExpr(fe.property('ADBE Vector Ellipse Size'), H + VE + 'var d=SZ*(0.06+0.2*cr)*2;[d,d]');
    jzAddFill(fl, C.acc);
    jzSetExpr(jzGX(fl).property('ADBE Vector Group Opacity'), H + VE + 'q>0&&v<=0?50*(1-cr):0');
});

/* ---- zipOut — ジッパー: a slider runs along each line; behind it the glyphs are pinched shut onto a row of teeth */
xb2_reg('zipOut', function (m) {
    var L = m.L, G = xb2_geo(m, true), sz = xb2_sz(m), C = xb2_col(m), H = xb2_hd(m), rev = xb2_bit(m, 161), single = xb2_single(m, G), vert = G.vert, i;
    var N = jzCount(m.c.text || ''), lines = xb2_lines(G), OA = [];
    for (i = 0; i < G.N; i++) {
        var g = G.g[i], ln = null, j;
        for (j = 0; j < lines.length; j++) if (vert || lines[j].li === g.li) { ln = lines[j]; break; }
        var o = 0; if (ln) o = ((vert ? g.cy : g.cx) - ln.u0) / Math.max(1, ln.u1 - ln.u0);
        OA.push(rev ? 1 - o : o);
    }
    var og = xb2_og(m), band = single ? 1.2 / Math.max(1, N - 1) : 0.22, PS = 'var ps=-0.12+1.24*ios(cl(PO/0.8)),fa=PO>0?1-sm(0.76,0.96,PO):0;';
    var sel = H + PS + (single ? 'var o=' + jzN(rev ? 1 - og : og) + ';' : 'var OA=' + xb2_arr(OA) + ',o=OA[textIndex-1]||0;') + 'var c=PO>0?ios(cl((ps-o)/' + jzN(band) + '+0.15)):0;';
    jzAnimator(L, 'JZ Out Zip', [['ADBE Text Scale 3D', vert ? [0, 100, 100] : [100, 0, 100]]], sel + 'c*100');
    jzAnimator(L, 'JZ Out Hide', [['ADBE Text Opacity', 0]], sel + 'c>=0.99?100:0');
    if (single || !xb2_main(m, G) || G.arranged) return;
    // teeth (a zigzag drawn up to the slider) + slider with its pull tab, per line
    var S = xb2_shape(m, 'JZ Out Zip'), w = sz * 0.3, h = sz * 0.46, tp = Math.max(3 * m.u, sz * 0.09), th = sz * 0.05;
    for (i = 0; i < lines.length; i++) {
        var a0 = lines[i].u0, a1 = lines[i].u1, mid = lines[i].v, len = a1 - a0, z0 = a0 - sz * 0.1, z1 = a1 + sz * 0.1;
        var SP = H + PS + 'var sp=' + jzN(a0) + '+' + jzN(len) + '*ps;' + (rev ? 'sp=' + jzN(a0 + a1) + '-sp;' : '') + 'var tf=cl((sp-' + xb2_n(z0) + ')/' + jzN(z1 - z0) + ')*100;';
        var tg = jzGrp(S, 'teeth ' + (i + 1));
        jzAddPath(tg, vert ? [[mid, z0], [mid, z1]] : [[z0, mid], [z1, mid]], false);
        var zz = jzVecs(tg).addProperty('ADBE Vector Filter - Zigzag');
        try { zz.property('ADBE Vector Zigzag Size').setValue(th * 0.5); zz.property('ADBE Vector Zigzag Detail').setValue(Math.max(2, Math.round((z1 - z0) / tp))); zz.property('ADBE Vector Zigzag Points').setValue(1); } catch (e0) {}
        if (rev) jzAddTrimPaths(tg, null, SP + 'tf'); else jzAddTrimPaths(tg, SP + 'tf', null);
        jzAddStroke(tg, C.sub, th * 0.7);
        jzSetExpr(jzGX(tg).property('ADBE Vector Group Opacity'), SP + 'fa*100');
        var sg = jzGrp(S, 'slider ' + (i + 1));
        if (vert) { jzAddRect(sg, h, w, w * 0.3); jzAddRect(sg, sz * 0.36, w * 0.4, w * 0.2, h / 2 - sz * 0.02 + sz * 0.18, 0); }
        else { jzAddRect(sg, w, h, w * 0.3); jzAddRect(sg, w * 0.4, sz * 0.36, w * 0.2, 0, h / 2 - sz * 0.02 + sz * 0.18); }
        jzAddFill(sg, C.acc);
        jzSetExpr(jzGX(sg).property('ADBE Vector Position'), SP + (vert ? '[' + jzN(mid) + ',sp]' : '[sp,' + jzN(mid) + ']'));
        jzSetExpr(jzGX(sg).property('ADBE Vector Group Opacity'), SP + 'sp>' + jzN(a0 - sz * 0.5) + '&&sp<' + jzN(a1 + sz * 0.5) + '?fa*100:0');
    }
});

/* ---- clapShut — 中央で閉じる: both halves slam into a seam at the centre and vanish into it, with an impact flash */
xb2_reg('clapShut', function (m) {
    var L = m.L, G = xb2_geo(m, false), r = G.rect, F = xb2_frame(m), sz = xb2_sz(m), C = xb2_col(m), H = xb2_hd(m), vert = G.vert, BIG = XB2_BIG, k;
    var E = 'var e=ic(cl(PO/0.62)),hit=cl((PO-0.6)/0.4);';
    if (xb2_single(m, G)) {       // one glyph per layer: slide towards the frame centre and vanish into it
        var cc = xb2_toLayer(L, m.W / 2, m.H / 2), pc = xb2_toComp(L, r.left + r.width / 2, r.top + r.height / 2), left = pc[0] < m.W / 2, Dd = m.W * 0.47 * F.k * (left ? 1 : -1);
        jzAnimator(L, 'JZ Out Clap', [['ADBE Text Position 3D', [F.rt[0] * Dd, F.rt[1] * Dd, 0]]], H + E + 'e*100');
        // keep the glyph's own side of the vertical line through the frame centre (a half plane in the layer's rotated space)
        var sg = left ? -1 : 1, rt = F.rt, dn = F.dn, Q1 = [cc[0] - dn[0] * BIG, cc[1] - dn[1] * BIG], Q2 = [cc[0] + dn[0] * BIG, cc[1] + dn[1] * BIG];
        xb2_maskPoly(L, [Q1, Q2, [Q2[0] + sg * rt[0] * BIG, Q2[1] + sg * rt[1] * BIG], [Q1[0] + sg * rt[0] * BIG, Q1[1] + sg * rt[1] * BIG]], 'JZ Out Clap', H + 'PO>0?0:1e4');
        m.parts.op.push(E + 'f*=e>=0.999?0:1;');
        if (Math.round(m.o.mi || 0) !== 0 || xb2_crowded(m)) return;
        var S1 = xb2_shape(m, 'JZ Out Clap Flash'), g1 = jzGrp(S1, 'flash'), rc = jzAddRect(g1, 10, 10, 0);
        jzSetExpr(rc.property('ADBE Vector Rect Size'), H + E + '[' + jzN(sz * 0.12) + '*(1-hit),' + jzN(m.H * 0.3 * F.k) + '*(1+0.6*oc(hit))]');
        jzGX(g1).property('ADBE Vector Position').setValue(cc); jzGX(g1).property('ADBE Vector Rotation').setValue(-F.deg);
        jzAddFill(g1, C.acc);          // (after the rect is configured: adding the fill invalidates the rect reference)
        jzSetExpr(jzGX(g1).property('ADBE Vector Group Opacity'), H + E + 'hit>0&&hit<1?(1-hit)*100:0');
        return;
    }
    var pad = sz * 0.04, bx0 = r.left - pad, bx1 = r.left + r.width + pad, by0 = r.top - pad, by1 = r.top + r.height + pad;
    var seam = vert ? (by0 + by1) / 2 : (bx0 + bx1) / 2, mc = vert ? (bx0 + bx1) / 2 : (by0 + by1) / 2, half = (vert ? by1 - by0 : bx1 - bx0) / 2 + sz * 0.05, cross = vert ? bx1 - bx0 : by1 - by0;
    // the far half is a masked copy sliding the other way
    var D = xb2_twin(m, 'JZ Out Clap B', E, '1');
    var mv = function (Lx, sg) {
        jzAnimator(Lx, 'JZ Out Clap', [['ADBE Text Position 3D', vert ? [0, sg * half, 0] : [sg * half, 0, 0]], ['ADBE Text Scale 3D', vert ? [100, 88, 100] : [88, 100, 100]]], H + E + 'e*100');
    };
    mv(L, 1); mv(D, -1);
    if (vert) { xb2_maskRect(L, mc - BIG, seam - BIG, mc + BIG, seam, 'JZ Out Clap', H + 'PO>0?0:1e4'); xb2_maskRect(D, mc - BIG, seam, mc + BIG, seam + BIG, 'JZ Out Clap'); }
    else { xb2_maskRect(L, seam - BIG, mc - BIG, seam, mc + BIG, 'JZ Out Clap', H + 'PO>0?0:1e4'); xb2_maskRect(D, seam, mc - BIG, seam + BIG, mc + BIG, 'JZ Out Clap'); }
    if (!xb2_main(m, G)) return;
    // seam line, then the impact flash + sparks
    var S = xb2_shape(m, 'JZ Out Clap Flash'), lw = Math.max(1.5 * m.u, sz * 0.025), sx = vert ? mc : seam, sy = vert ? seam : mc;
    // (rects are configured before their fills are added: adding a fill invalidates the rect reference)
    var fg = jzGrp(S, 'seam'), fr = jzAddRect(fg, 10, 10, 0, sx, sy);
    var SE = H + E + 'var sa=sm(0,0.15,PO)*(1-sm(0.6,0.7,PO)),ln=hit>0?' + jzN(sz * 0.14) + '*(1-oc(hit)):' + jzN(lw) + ',ex=hit>0?' + jzN(cross) + '*(1+0.7*oc(hit)):' + jzN(cross * 1.1) + '*oc(sm(0,0.15,PO));';
    jzSetExpr(fr.property('ADBE Vector Rect Size'), SE + (vert ? '[ex,ln]' : '[ln,ex]'));
    jzAddFill(fg, C.acc);
    jzSetExpr(jzGX(fg).property('ADBE Vector Group Opacity'), SE + 'PO<=0||hit>=1?0:(hit>0?(1-hit):sa)*100');
    for (k = 0; k < 4; k++) {
        var kg = jzGrp(S, 'spark ' + (k + 1)), kr = jzAddRect(kg, 10, Math.max(1 * m.u, sz * 0.03), 0);
        var KE = H + E + 'var r0=SZ*(0.2+0.6*hit),r1=r0+SZ*0.25*(1-hit);';
        jzSetExpr(kr.property('ADBE Vector Rect Size'), KE + '[Math.max(0.1,r1-r0),' + jzN(Math.max(1 * m.u, sz * 0.03)) + ']');
        jzSetExpr(kr.property('ADBE Vector Rect Position'), KE + '[(r0+r1)/2,0]');
        jzAddFill(kg, C.acc);
        jzGX(kg).property('ADBE Vector Position').setValue([sx, sy]);
        jzGX(kg).property('ADBE Vector Rotation').setValue(((k + 0.5) / 4 * Math.PI * 2 + 0.3) * 180 / Math.PI);
        jzSetExpr(jzGX(kg).property('ADBE Vector Group Opacity'), H + E + 'hit>0&&hit<1?(1-hit)*100:0');
    }
});

/* ---- lampOff — 消灯: the sign loses power: glyphs flicker on a failing supply and die one by one, leaving dark tubes that fade */
xb2_reg('lampOff', function (m) {
    var L = m.L, G = xb2_geo(m, false), C = xb2_col(m), H = xb2_hd(m), sz = xb2_sz(m);
    var dimC = xb2_mix(C.c0, C.bg, 0.78), hot = C.dark ? xb2_mix(C.c0, '#FFFFFF', 0.5) : C.c0;
    var base = H + 'var ti=textIndex,q=(PO-hh(ti*8.3+SD+171)*0.46)/0.36;seedRandom(ti*31+SD+Math.floor(time*12)*7,true);var off=random()<0.3+0.7*(q/0.55);';
    jzAnimator(L, 'JZ Out Lamp Hot', [['ADBE Text Fill Color', jzHex(hot)]], base + 'q>0&&q<=0.55&&!off?100:0');
    jzAnimator(L, 'JZ Out Lamp Dim', [['ADBE Text Fill Color', jzHex(dimC)]], base + 'q>0.55||(q>0&&off)?100:0');
    jzAnimator(L, 'JZ Out Lamp Fade', [['ADBE Text Opacity', 0]], base + 'q>=1?100:(q>0.55?(q-0.55)/0.45*100:0)');
    if (!C.dark || !xb2_main(m, G)) return;
    // the glow of the lit tubes shrinks as they die
    var ds = jzEffect(L, 'ADBE Drop Shadow', 'JZ Out Lamp Glow');
    jzEP(ds, 1, jzHex(xb2_mix(C.c0, C.acc, 0.4))); jzEP(ds, 3, 0); jzEP(ds, 4, 0); jzEP(ds, 6, 0);
    jzEX(ds, 2, H + 'PO>0?217:0');
    jzEX(ds, 5, H + 'var N=' + G.N + ',lit=0,i;for(i=1;i<=N;i++){var qq=(PO-hh(i*8.3+SD+171)*0.46)/0.36;lit+=qq<=0?1:(qq<0.5?0.5:0);}' + jzN(sz * 0.44) + '*lit/N');   // softness ~ 2x the canvas shadowBlur (sz*0.22)
});

/* ---- slotOut — スロット回転: every glyph spins up like a slot reel, faster and faster, and stops on an empty cell
   (browser: cells scroll through a clipped window -> AE: cells are projected on a drum, no clip needed) */
function xb2_reel(Lx, q, fs, acc, twin) {
    var K = fs * 0.6;
    jzAnimator(Lx, 'JZ Out Reel Roll', [['ADBE Text Position 3D', [0, K, 0]]], q + 'on?-Math.sin(f*Math.PI/2)*100:0');
    jzAnimator(Lx, 'JZ Out Reel Drum', [['ADBE Text Scale 3D', [100, 0, 100]]], q + 'on?(1-Math.cos(f*Math.PI/2))*100:0');
    jzAnimator(Lx, 'JZ Out Reel Blur', [['ADBE Text Scale 3D', [100, 200, 100]]], q + 'on?[0,sp*100,0]:[0,0,0]');
    jzAnimator(Lx, 'JZ Out Reel Char', [['ADBE Text Character Offset', 100]], q + 'on&&cj>0?1+Math.floor(hh(ti*31+cj*7+SD)*40):0');
    jzAnimator(Lx, 'JZ Out Reel Acc', [['ADBE Text Fill Color', jzHex(acc)]], q + 'on&&cj>0&&hh(ti*17+cj*5+SD+183)<0.3?100:0');
    jzAnimator(Lx, 'JZ Out Reel Hide', [['ADBE Text Opacity', 0]], q + (twin ? '!on?100:' : 'q>0&&cj>MM?100:!on?0:') + '35*Math.abs(f)');
}
xb2_reg('slotOut', function (m) {
    var L = m.L, G = xb2_geo(m, false), C = xb2_col(m), D = xb2_crowded(m, G) ? null : xb2_twin(m, 'JZ Out Reel B', '', '1');
    var base = xb2_hd(m) + xb2_sel(m) + 'var MM=3+Math.floor(hh(ti*9.1+SD+182)*4),q=wn(PO,o,0.35),ph=(MM+1)*io3(q),j=Math.floor(ph),fr=ph-j,sp=Math.min(0.6,0.72*Math.sin(Math.PI*q));';
    xb2_reel(L, base + 'var cj=j,f=fr,on=q>0&&cj<=MM;', G.fs, C.acc, false);
    if (D) xb2_reel(D, base + 'var cj=j+1,f=fr-1,on=q>0&&q<1&&cj<=MM;', G.fs, C.acc, true);
});

/* ---- clockOut — 時計ワイプ: every glyph is swept away by its own little clock hand, one after another
   (AE: the lyric hands over to two exit-only copies — odd / even glyphs — each matted by per-glyph pies, so neighbouring
   pies never overlap; browser square cells -> round pies) */
xb2_reg('clockOut', function (m) {
    var L = m.L, G = xb2_geo(m, true), r = G.rect, sz = xb2_sz(m), C = xb2_col(m), H = xb2_hd(m), n = G.N, i, p;
    var cw = !xb2_bit(m, 191), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    if (G.arranged || xb2_crowded(m, G) || n > 40 || xb2_layers(m) > 40 || G.nk <= 1) {   // one clock sweep over the whole item
        var rw = jzEffect(L, 'ADBE Radial Wipe', 'JZ Out Clock');
        var qs = G.nk <= 1 ? 'var q=wn(PO,' + jzN(xb2_og(m)) + ',0.55);' : 'var q=PO;';
        jzEP(rw, 3, [cx, cy]); jzEP(rw, 4, cw ? 1 : 2); jzEX(rw, 1, H + qs + 'ios(q)*100');
        return;
    }
    var QE = function (idx) { return H + xb2_at(m, idx, n) + 'var q=wn(PO,o,0.55),e=ios(q);'; };
    var TW = [], MT = [];
    for (p = 0; p < 2; p++) {
        var D = xb2_twin(m, 'JZ Out Clock ' + (p ? 'B' : 'A'), '', '1');
        jzAnimator(D, 'JZ Out Clock Parity', [['ADBE Text Opacity', 0]], '(textIndex-1)%2==' + p + '?0:100');
        TW.push(D);
    }
    for (p = 0; p < 2; p++) { MT.push(xb2_shape(m, 'JZ Out Clock Matte ' + (p ? 'B' : 'A'), TW[p])); xb2_matte(TW[p], MT[p]); }
    m.parts.op.push('f*=PO>0?0:1;');
    var T = xb2_main(m, G) ? xb2_shape(m, 'JZ Out Clock Hands', MT[0]) : null, lw = Math.max(1.5 * m.u, sz * 0.03);
    for (i = 0; i < n; i++) {
        var g = G.g[i]; if (g.sp) continue;
        var R = Math.sqrt(g.w * g.w + g.h * g.h) * 0.56 + sz * 0.04, E = QE(i);
        // pie = circle of radius R/2 stroked R wide, trimmed to the part the hand has not reached yet (starts at 12 o'clock, clockwise)
        var pg = jzGrp(MT[i % 2], 'pie ' + (i + 1));
        jzAddEllipse(pg, R, R);
        if (cw) jzAddTrimPaths(pg, null, E + 'e*100'); else jzAddTrimPaths(pg, E + '(1-e)*100', null);
        jzAddStroke(pg, '#FFFFFF', R);
        jzGX(pg).property('ADBE Vector Position').setValue([g.cx, g.cy]);
        jzSetExpr(jzGX(pg).property('ADBE Vector Group Opacity'), E + 'q<1?100:0');
        if (!T) continue;
        var AE2 = E + 'var a=q>0&&q<1?Math.min(1,(1-e)*6)*100:0;';
        var wg = jzGrp(T, 'glow ' + (i + 1)), Rg = R * 0.8;
        jzAddEllipse(wg, Rg, Rg);
        if (cw) jzAddTrimPaths(wg, E + 'e*100', E + 'Math.max(0,e-0.0955)*100');
        else jzAddTrimPaths(wg, E + 'Math.min(1,1-e+0.0955)*100', E + '(1-e)*100');
        jzAddStroke(wg, C.acc, Rg, 22);
        jzGX(wg).property('ADBE Vector Position').setValue([g.cx, g.cy]);
        jzSetExpr(jzGX(wg).property('ADBE Vector Group Opacity'), AE2 + 'a');
        var hg = jzGrp(T, 'hand ' + (i + 1));
        jzAddPath(hg, [[0, 0], [0, -R * 0.82]], false);
        jzAddStroke(hg, C.acc, lw);
        jzAddEllipse(hg, lw * 2.6, lw * 2.6);
        jzAddFill(hg, C.acc);
        jzGX(hg).property('ADBE Vector Position').setValue([g.cx, g.cy]);
        jzSetExpr(jzGX(hg).property('ADBE Vector Rotation'), E + (cw ? '' : '-') + 'e*360');
        jzSetExpr(jzGX(hg).property('ADBE Vector Group Opacity'), AE2 + 'a');
    }
});

/* ---- matrixOut — デジタル雨: glyphs decode into falling columns of flickering characters that pour off the bottom */
xb2_reg('matrixOut', function (m) {
    var L = m.L, G = xb2_geo(m, false), F = xb2_frame(m), sz = xb2_sz(m), C = xb2_col(m), fs = G.fs, k, Ds = [];
    var head = C.dark ? xb2_mix(C.c0, '#FFFFFF', 0.4) : C.c0, cb = xb2_cbox(L, G.rect), D = Math.max(sz * 2, (m.H - cb.y0) * F.k + sz * 1.2), K = D + sz * 6, pt = fs * 0.92;
    var nl = xb2_layers(m), nT = xb2_crowded(m, G) ? 0 : (nl > 44 ? 1 : (nl > 34 ? 2 : (nl > 24 ? 3 : 4)));
    for (k = nT; k >= 1; k--) Ds[k - 1] = xb2_twin(m, 'JZ Out Rain ' + k, '', '1', null, true);
    var base = xb2_hd(m) + xb2_sel(m) + 'var q=wn(PO,hh(ti*4.7+SD+201)*0.9,0.5),u=cl((q-0.22)/0.78),Lf=' + jzN(D) + '*Math.pow(u,1.7);';
    var SG = 'seedRandom(ti*31+SD+Math.floor(time*12)*7', vK = [F.dn[0] * K, F.dn[1] * K, 0];
    jzAnimator(L, 'JZ Out Rain Fall', [['ADBE Text Position 3D', vK]], base + 'var a=q>0&&q<1?Lf/' + jzN(K) + '*100:0;[a,a,0]');
    jzAnimator(L, 'JZ Out Rain Sign', [['ADBE Text Character Offset', 60]], base + SG + ',true);var rr=random(15,100),dec=random()<q/0.22+0.2;q>0&&q<1&&(q>=0.22||dec)?rr:0');
    jzAnimator(L, 'JZ Out Rain Decode', [['ADBE Text Fill Color', jzHex(C.acc)]], base + SG + ',true);var rr=random(15,100),dec=random()<q/0.22+0.2;q>0&&q<0.22&&dec?100:0');
    jzAnimator(L, 'JZ Out Rain Head', [['ADBE Text Fill Color', jzHex(head)]], base + 'q>=0.22&&q<1?100:0');
    jzAnimator(L, 'JZ Out Hide', [['ADBE Text Opacity', 0]], base + 'q>=1?100:0');
    for (k = 1; k <= nT; k++) {
        var T = Ds[k - 1], bk = base + 'var on=q>=0.22&&q<1&&Lf>=' + jzN(k * pt * 0.6) + ';';
        jzAnimator(T, 'JZ Rain Fall', [['ADBE Text Position 3D', vK]], bk + 'var a=on?(Lf-' + jzN(k * pt) + ')/' + jzN(K) + '*100:0;[a,a,0]');
        jzAnimator(T, 'JZ Rain Sign', [['ADBE Text Character Offset', 60]], bk + SG + '+' + (k * 1009) + ',true);var rr=random(15,100);on?rr:0');
        jzAnimator(T, 'JZ Rain Tint', [['ADBE Text Fill Color', jzHex(C.acc)]], '100');
        jzAnimator(T, 'JZ Rain Fade', [['ADBE Text Opacity', 0]], bk + 'on?(1-Math.min(1,' + jzN(1.25 * (1 - k / 6)) + '*(1-0.5*u)))*100:100');
    }
});

/* ---- tornadoOut — 竜巻: the glyphs are caught in a vortex, orbiting a vertical axis (front / back) while they are lifted away */
xb2_reg('tornadoOut', function (m) {
    var L = m.L, G = xb2_geo(m, true), F = xb2_frame(m), sz = xb2_sz(m), dir = xb2_bit(m, 211) ? 1 : -1, single = xb2_single(m, G), i;
    var cb = xb2_cbox(L, G.rect), up = Math.max(sz * 2, cb.y1 * F.k + sz * 1.8), OX = [], R0 = 1;
    var cx = single ? m.W / 2 : cb.cx;
    for (i = 0; i < G.N; i++) { var c = xb2_toComp(L, G.g[i].cx, G.g[i].cy), ox = (c[0] - cx) * F.k; OX.push(ox); R0 = Math.max(R0, Math.abs(ox)); }
    if (single) R0 = m.W * 0.45 * F.k;
    R0 += sz * 0.3;
    var K = R0 * 2.5 + up * 1.5 + sz * 3;
    var sel = xb2_hd(m) + xb2_dirs(F) + xb2_sel(m) + 'var OX=' + xb2_arr(OX) + ',R0=' + jzN(R0) + ',q=wn(PO,hh(ti*6.7+SD+214)*0.5,0.25),on=q>0,ox=OX[ti-1]||0,r=hh(ti*6.3+SD+212),hx=' + (single ? jzN(xb2_og(m)) : 'o') + ',' +
        'th0=Math.asin(Math.max(-1,Math.min(1,ox/R0))),th=th0+' + dir + '*Math.PI*(3.2+r)*q*q,lift=' + jzN(up) + '*Math.pow(q,2.2)*(0.8+0.3*r)+SZ*1.4*hx*oc(q),' +
        'R=R0*(1-0.35*oc(q))+lift*0.25+SZ*0.6*q,dx=R*Math.sin(th)-ox,dy=-lift,z=Math.cos(th),al=1-sm(0.8,0.98,PO);';
    jzAnimator(L, 'JZ Out Vortex', [['ADBE Text Position 3D', [K, K, 0]]], sel + 'on?[(RT0*dx+DN0*dy)/' + jzN(K) + '*100,(RT1*dx+DN1*dy)/' + jzN(K) + '*100,0]:[0,0,0]');
    jzAnimator(L, 'JZ Out Vortex Tilt', [['ADBE Text Rotation', 14]], sel + 'on?-Math.sin(th)*q*100:0');
    jzAnimator(L, 'JZ Out Vortex Depth', [['ADBE Text Scale 3D', [200, 200, 100]]], sel + 'on?[(z-1)*28,(z-1)*28,0]:[0,0,0]');
    jzAnimator(L, 'JZ Out Vortex Fade', [['ADBE Text Opacity', 0]], sel + 'on?(1-(0.3+0.35*(z+1))*al)*100:0');
});

/* ---- rollUpOut — 巻き取る: a paper roll travels along the line, swallowing the text as it goes, then is lifted away */
xb2_reg('rollUpOut', function (m) {
    var L = m.L, G = xb2_geo(m, true), r = G.rect, F = xb2_frame(m), sz = xb2_sz(m), C = xb2_col(m), H = xb2_hd(m), vert = G.vert, rev = xb2_bit(m, 221), single = xb2_single(m, G), i;
    var pad = sz * 0.08, a0 = (vert ? r.top : r.left) - pad, a1 = (vert ? r.top + r.height : r.left + r.width) + pad;
    var c0x = (vert ? r.left : r.top) - pad, c1x = (vert ? r.left + r.width : r.top + r.height) + pad, r0 = sz * 0.26, sg = rev ? -1 : 1, S0 = a0, S1 = a1, XR;
    if (single) {
        var pc = xb2_toComp(L, r.left + r.width / 2, r.top + r.height / 2);
        S0 = xb2_toLayer(L, m.W * 0.03, pc[1])[0]; S1 = xb2_toLayer(L, m.W * 0.97, pc[1])[0];
        XR = rev ? jzN(S1) + '+' + xb2_n(S0 - S1) + '*e' : jzN(S0) + '+' + xb2_n(S1 - S0) + '*e';
    } else XR = rev ? jzN(a1 + r0) + '+' + xb2_n(a0 - r0 * 3 - a1 - r0) + '*e' : jzN(a0 - r0) + '+' + xb2_n(a1 + r0 * 3 - a0 + r0) + '*e';
    var E0 = single ? (rev ? S1 - r0 : S0 + r0) : (rev ? a1 : a0);
    var RE = 'var e=ios(cl(PO/0.86)),Xr=' + XR + ',rl=' + (rev ? 'Math.max(0,' + jzN(S1) + '-Xr)' : 'Math.max(0,Xr-' + xb2_n(S0) + ')') + ',rr=' + jzN(r0) + '*Math.sqrt(1+rl/(SZ*2)),edge=Xr+' + sg + '*rr;';
    var CA = [], HW = [];
    for (i = 0; i < G.N; i++) { var g = G.g[i]; CA.push(vert ? g.cy : g.cx); HW.push((vert ? g.h : g.w) / 2); }
    var sel = H + RE + 'var CA=' + xb2_arr(CA) + ',HW=' + xb2_arr(HW) + ',c=CA[textIndex-1]||0,hw=HW[textIndex-1]||1,dd=(c-edge)*' + sg + ',near=PO>0?cl(1-(dd-hw)/(rr*2.6)):0,k=1-0.55*Math.pow(near,1.6);';
    var KP = sz;
    jzAnimator(L, 'JZ Out Roll Bunch', [['ADBE Text Position 3D', vert ? [0, KP, 0] : [KP, 0, 0]]], sel + 'var a=' + (-sg) + '*(1-k)*hw/' + jzN(KP) + '*100;[a,a,0]');
    jzAnimator(L, 'JZ Out Roll Squeeze', [['ADBE Text Scale 3D', vert ? [100, 0, 100] : [0, 100, 100]]], sel + '(1-k)*100');
    jzAnimator(L, 'JZ Out Roll Shade', [['ADBE Text Fill Color', jzHex(C.bg)]], sel + '45*near');
    jzAnimator(L, 'JZ Out Hide', [['ADBE Text Opacity', 0]], sel + 'PO>0&&dd+hw<=0?100:0');
    // the flat paper starts at the roll's edge: mask edge moved by expansion
    var BIG = XB2_BIG, EX = H + RE + 'PO>0?' + (rev ? '(edge-' + xb2_n(E0) + ')' : '-(edge-' + xb2_n(E0) + ')') + ':1e4';
    if (vert) xb2_maskRect(L, c0x - BIG, rev ? E0 - BIG : E0, c1x + BIG, rev ? E0 : E0 + BIG, 'JZ Out Roll', EX);
    else xb2_maskRect(L, rev ? E0 - BIG : E0, c0x - BIG, rev ? E0 : E0 + BIG, c1x + BIG, 'JZ Out Roll', EX);
    if (!xb2_main(m, single ? null : G) || (single && xb2_layers(m) > 40)) return;
    // the roll: back, highlight band, shadow band; finally lifted away (shrinks to its middle)
    var S = xb2_shape(m, 'JZ Out Roll'), cm = (c0x + c1x) / 2, band = [[0.72, 1, xb2_mix(C.c0, C.bg, 0.8)], [0.18, 0.38, xb2_mix(C.c0, C.bg, 0.25)], [0, 1, xb2_mix(C.c0, C.bg, 0.55)]], b;
    var LE = H + RE + 'var lf=ic(cl((PO-0.8)/0.18)),e0=' + jzN(c0x - sz * 0.06) + '+' + xb2_n(cm - c0x + sz * 0.06) + '*lf,e1=' + jzN(c1x + sz * 0.06) + '+' + xb2_n(cm - c1x - sz * 0.06) + '*lf,x0=Xr-rr*(1-lf),w=2*rr*(1-lf);';
    for (b = 0; b < 3; b++) {
        var bg = jzGrp(S, 'roll ' + (b + 1)), rc = jzAddRect(bg, 10, 10, 0), s0 = band[b][0], s1 = band[b][1];
        jzSetExpr(rc.property('ADBE Vector Rect Size'), LE + 'var aw=Math.max(0,' + jzN(s1 - s0) + '*w),cw=Math.max(0,e1-e0);' + (vert ? '[cw,aw]' : '[aw,cw]'));
        jzSetExpr(rc.property('ADBE Vector Rect Position'), LE + 'var ap=x0+' + jzN((s0 + s1) / 2) + '*w,cp=(e0+e1)/2;' + (vert ? '[cp,ap]' : '[ap,cp]'));
        jzAddFill(bg, band[b][2]);     // (after the rect is configured: adding the fill invalidates the rect reference)
    }
    jzSetExpr(jzXf(S, 'ADBE Opacity'), H + 'PO>0&&PO<0.998?(1-sm(0.82,0.98,PO))*100:0');
});

/* ---- snakeOut — 列になって去る: the line runs along itself, bends round a curve and leaves, every glyph following the one before */
function xb2_snakeFn(aEnd, R, n) {
    return 'function snk(a2,o){var AE=' + jzN(aEnd) + ',RR=' + jzN(R) + ',NN=' + n + ';if(a2<=AE)return [a2,o,0];var s=a2-AE,arc=RR*Math.PI/2;' +
        'if(s<=arc){var f=s/RR,ca=Math.cos(f),sa=Math.sin(f);return [AE+RR*sa-NN*sa*o,NN*RR*(1-ca)+ca*o,NN*f*57.2958];}return [AE+RR-NN*o,NN*(RR+s-arc),NN*90];}' +
        'function ez(x){return 0.35*x*x+0.65*Math.pow(x,2.4);}';
}
xb2_reg('snakeOut', function (m) {
    var L = m.L, G = xb2_geo(m, true), r = G.rect, F = xb2_frame(m), sz = xb2_sz(m), rev = xb2_bit(m, 231), n = xb2_bit(m, 232) ? 1 : -1, W = m.W, Hh = m.H, i;
    if (xb2_single(m, G)) {        // one glyph per layer: the whole train runs along the frame and turns off it
        var ux = rev ? -1 : 1, aE = rev ? -W * 0.1 : W * 0.9, RS = Math.min(W, Hh) * 0.2, pc = xb2_toComp(L, r.left + r.width / 2, r.top + r.height / 2);
        var SN = xb2_snakeFn(aE, RS, n) + 'var nn=snk(' + jzN(pc[0] * ux) + '+' + jzN(W * 1.2 + RS * 2 + Hh * 0.8) + '*ez(PO),' + jzN((pc[1] - Hh / 2) * ux) + ');';
        m.parts.pos.push(SN + 'd=[d[0]+nn[0]*' + ux + '-' + xb2_n(pc[0]) + ',d[1]+' + jzN(Hh / 2) + '+nn[1]*' + ux + '-' + xb2_n(pc[1]) + '];');
        m.parts.rot.push(SN + 'r+=nn[2];');
        return;
    }
    var vert = G.vert, u = vert ? [0, 1] : [1, 0];
    if (rev) u = [-u[0], -u[1]];
    var v = [-u[1], u[0]], bcx = r.left + r.width / 2, bcy = r.top + r.height / 2, oc = bcx * v[0] + bcy * v[1], A = [], O = [], aMin = 1e9, aMax = -1e9;
    for (i = 0; i < G.N; i++) {
        var g = G.g[i], a = g.cx * u[0] + g.cy * u[1];
        A.push(a); O.push(g.cx * v[0] + g.cy * v[1] - oc);
        if (!g.sp) { aMin = Math.min(aMin, a); aMax = Math.max(aMax, a); }
    }
    if (aMax < aMin) { aMin = 0; aMax = 0; }
    var aEnd = aMax + sz * 0.5, R = sz * 1.3, Dt = (aEnd - aMin) + R * 2 + Math.max(W, Hh) * 0.75 * F.k, K = Dt + R * 2 + sz;
    var sel = xb2_hd(m) + xb2_snakeFn(aEnd, R, n) + 'var A=' + xb2_arr(A) + ',O=' + xb2_arr(O) + ',a=A[textIndex-1]||0,ov=O[textIndex-1]||0,nn=snk(a+' + jzN(Dt) + '*ez(PO),ov),' +
        'dx=' + xb2_n(u[0]) + '*(nn[0]-a)+' + xb2_n(v[0]) + '*(nn[1]-ov),dy=' + xb2_n(u[1]) + '*(nn[0]-a)+' + xb2_n(v[1]) + '*(nn[1]-ov);';
    jzAnimator(L, 'JZ Out Train', [['ADBE Text Position 3D', [K, K, 0]]], sel + '[dx/' + jzN(K) + '*100,dy/' + jzN(K) + '*100,0]');
    jzAnimator(L, 'JZ Out Train Turn', [['ADBE Text Rotation', 90]], sel + 'nn[2]/0.9');
    m.parts.op.push('f*=1-sm(0.9,1,PO);');
});

/* ---- flutterOut — ひらひら落ちる: glyphs detach one by one and flutter down like paper, swaying, tilting and flipping over */
xb2_reg('flutterOut', function (m) {
    var L = m.L, G = xb2_geo(m, false), F = xb2_frame(m), sz = xb2_sz(m), C = xb2_col(m);
    var cb = xb2_cbox(L, G.rect), D = Math.max(sz * 2, (m.H - cb.y0) * F.k + sz * 1.2), K = D + sz, back = xb2_mix(C.c0, C.bg, 0.45);
    var sel = xb2_hd(m) + xb2_dirs(F) + xb2_sel(m) + 'var q=wn(PO,hh(ti*3.9+SD+241),0.5),on=q>0&&q<1,ph=hh(ti*2.3+SD+242)*6.2832,w=7+4*hh(ti*5.3+SD+243),am=Math.min(1,q*4),' +
        'sw=Math.sin(q*w+ph)*SZ*0.55*am,Lf=' + jzN(D) + '*(0.25*q+0.75*Math.pow(q,1.6)),fl=Math.cos(q*(9+5*hh(ti*7.7+SD+244))+ph*0.5),' +
        'shv=q<0.08?Math.sin(q*300)*6*(1-q/0.08):0,rt=Math.cos(q*w+ph)*28*am+shv,sx=1+(fl-1)*am;';
    jzAnimator(L, 'JZ Out Flutter', [['ADBE Text Position 3D', [K, K, 0]]], sel + 'on?[(RT0*sw+DN0*Lf)/' + jzN(K) + '*100,(RT1*sw+DN1*Lf)/' + jzN(K) + '*100,0]:[0,0,0]');
    jzAnimator(L, 'JZ Out Flutter Tilt', [['ADBE Text Rotation', 40]], sel + 'on?rt/0.4:0');
    jzAnimator(L, 'JZ Out Flip', [['ADBE Text Scale 3D', [-100, 100, 100]]], sel + 'on?[(1-sx)/2*100,0,0]:[0,0,0]');
    jzAnimator(L, 'JZ Out Flip Back', [['ADBE Text Fill Color', jzHex(back)]], sel + 'on&&fl<0&&am>0.5?100:0');
    jzAnimator(L, 'JZ Out Hide', [['ADBE Text Opacity', 0]], sel + 'q>=1?100:0');
});

/* ---- rollOff — 転がって去る: each glyph tips over its corner and rolls away like a die, leading edge first */
xb2_reg('rollOff', function (m) {
    var L = m.L, G = xb2_geo(m, true), F = xb2_frame(m), sz = xb2_sz(m), dir = xb2_bit(m, 251) ? 1 : -1, RR = [], i;
    var ED = xb2_edgeDist(m, G, F, dir, sz * 1.3), K = ED.mx + sz * 2;
    for (i = 0; i < G.N; i++) RR.push(Math.max(G.g[i].w, sz * 0.8) / 2);
    var sel = xb2_hd(m) + xb2_dirs(F) + xb2_sel(m) + (dir > 0 ? 'o=1-o;' : '') + 'var DI=' + xb2_arr(ED.DI) + ',RR=' + xb2_arr(RR) + ',q=wn(PO,o,0.45),on=q>0&&q<1,' +
        'dist=DI[ti-1]||DI[0],rd=RR[ti-1]||RR[0],along=dist*Math.pow(q,1.7),th=along/rd,hp=Math.PI/2,ph=((th%hp)+hp)%hp,rise=rd*(Math.SQRT2*Math.cos(ph-Math.PI/4)-1),al=' + dir + '*along;';
    jzAnimator(L, 'JZ Out Roll', [['ADBE Text Position 3D', [K, K, 0]]], sel + 'on?[(RT0*al-DN0*rise)/' + jzN(K) + '*100,(RT1*al-DN1*rise)/' + jzN(K) + '*100,0]:[0,0,0]');
    jzAnimator(L, 'JZ Out Roll Turn', [['ADBE Text Rotation', 3600]], sel + 'on?' + dir + '*th*57.2958/36:0');
    jzAnimator(L, 'JZ Out Hide', [['ADBE Text Opacity', 0]], sel + 'q>=1?100:0');
});

/* ---- fanClose — 扇を閉じる: the line bends into an arc round a pivot, the ribs close onto one edge and the fan shrinks away */
function xb2_fanFn(R, aLim, rev) {
    return 'var bend=ios(cl(PO/0.3)),cls=io3(cl((PO-0.24)/0.5)),fin=cl((PO-0.72)/0.28),fs=1-0.75*iq(fin),al=1-sm(0.8,0.99,PO),spin=' + (rev ? 1 : -1) + '*0.5*iq(fin);' +
        'function plc(a,w){var alT=(a/' + jzN(R) + ')+(' + jzN(aLim) + '-a/' + jzN(R) + ')*cls+spin,rr=' + jzN(R) + '-w;return [a+(Math.sin(alT)*rr-a)*bend,w+((' + jzN(R) + '-Math.cos(alT)*rr)-w)*bend,alT*bend*57.2958];}';
}
xb2_reg('fanClose', function (m) {
    var L = m.L, G = xb2_geo(m, true), r = G.rect, sz = xb2_sz(m), rev = xb2_bit(m, 261), i;
    if (xb2_single(m, G)) {       // one glyph per layer: the whole frame is the fan
        var W = m.W, Hh = m.H, RS = W * 0.55, aL = (rev ? 1 : -1) * W * 0.45 / RS, pc = xb2_toComp(L, r.left + r.width / 2, r.top + r.height / 2);
        var N = jzCount(m.c.text || ''), lead = Math.round(m.o.mi || 0) === (rev ? N - 1 : 0);
        var FN = xb2_fanFn(RS, aL, rev) + 'var nn=plc(' + jzN(pc[0] - W / 2) + ',' + jzN(pc[1] - Hh / 2) + ');';
        m.parts.pos.push(FN + 'd=[d[0]+' + jzN(W / 2) + '+nn[0]-' + xb2_n(pc[0]) + ',d[1]+' + jzN(Hh / 2) + '+nn[1]-' + xb2_n(pc[1]) + '];');
        m.parts.rot.push(FN + 'r+=nn[2];');
        m.parts.sc.push(FN + 'f=[f[0]*fs,f[1]*fs];');
        m.parts.op.push(FN + 'f*=al' + (lead ? '' : '*(1-sm(0.55,0.95,cls))') + ';');
        return;
    }
    var vert = G.vert, u = vert ? [0, 1] : [1, 0], v = [-u[1], u[0]], bcx = r.left + r.width / 2, bcy = r.top + r.height / 2;
    var ac = bcx * u[0] + bcy * u[1], oc = bcx * v[0] + bcy * v[1], A = [], WV = [], aMin = 1e9, aMax = -1e9;
    for (i = 0; i < G.N; i++) {
        var g = G.g[i], a = g.cx * u[0] + g.cy * u[1] - ac;
        A.push(a); WV.push(g.cx * v[0] + g.cy * v[1] - oc);
        if (!g.sp) { aMin = Math.min(aMin, a); aMax = Math.max(aMax, a); }
    }
    if (aMax < aMin) { aMin = 0; aMax = 0; }
    var half = Math.max(sz, (aMax - aMin) / 2), R = Math.max(sz * 2, half * 1.15), aLim = (rev ? aMax : aMin) / R, K = R * 2 + half * 2 + sz;
    var sel = xb2_hd(m) + xb2_fanFn(R, aLim, rev) + 'var A=' + xb2_arr(A) + ',WV=' + xb2_arr(WV) + ',a=A[textIndex-1]||0,w=WV[textIndex-1]||0,nn=plc(a,w),' +
        'dx=' + xb2_n(u[0]) + '*(nn[0]-a)+' + xb2_n(v[0]) + '*(nn[1]-w),dy=' + xb2_n(u[1]) + '*(nn[0]-a)+' + xb2_n(v[1]) + '*(nn[1]-w),' +
        'lead=Math.abs(a/' + jzN(R) + '-' + xb2_n(aLim) + ')<0.001,aa=al*(lead?1:1-sm(0.55,0.95,cls));';
    jzAnimator(L, 'JZ Out Fan', [['ADBE Text Position 3D', [K, K, 0]]], sel + '[dx/' + jzN(K) + '*100,dy/' + jzN(K) + '*100,0]');
    jzAnimator(L, 'JZ Out Rib', [['ADBE Text Rotation', 180]], sel + 'nn[2]/1.8');
    jzAnimator(L, 'JZ Out Fan Size', [['ADBE Text Scale 3D', [0, 0, 100]]], sel + '[(1-fs)*100,(1-fs)*100,0]');
    jzAnimator(L, 'JZ Out Fan Fade', [['ADBE Text Opacity', 0]], sel + '(1-aa)*100');
});

/* ================================================================ SIGNAL / GRAPHIC */

/* ---- rgbSplitOut — 色分解: the text splits into its ghost / accent channels which drift apart with a jitter and fade */
xb2_reg('rgbSplitOut', function (m) {
    var L = m.L, G = xb2_geo(m, false), C = xb2_col(m), k;
    var cols = [C.gA, C.gB, C.acc], dirs = [[-1, -0.3], [1, 0.25], [0.15, 0.9]];
    m.parts.op.push('f*=1-sm(0.05,0.35,PO);');
    if (!xb2_main(m, G) || xb2_layers(m) > 50) {       // no copies: a jittering tinted fade
        jzAnimator(L, 'JZ Out Split Tint', [['ADBE Text Fill Color', jzHex(C.acc)]], xb2_hd(m) + '60*sm(0,0.3,PO)');
        m.parts.pos.push('seedRandom(SD+Math.floor(time*12)*3,true);var jx=PO>0?random(-1,1)*' + jzN(xb2_sz(m) * 0.08) + '*(0.3+PO):0;d=[d[0]+jx,d[1]];');
        return;
    }
    var pre = 'var e=ic(PO),sp=SZ*(0.05+1.5*e),ca=sm(0,0.1,PO)*(1-sm(0.55,0.96,PO));';
    for (k = 0; k < 3; k++) {
        var pos = 'seedRandom(SD+Math.floor(time*12)*3+' + (k * 17) + ',true);var jx=random(-1,1)*SZ*0.06*(0.3+e),jy=random(-1,1)*SZ*0.015,p=parent.transform.anchorPoint;' +
            '[p[0]+' + xb2_n(dirs[k][0]) + '*sp+jx,p[1]+' + xb2_n(dirs[k][1] * 0.5) + '*sp+jy]';
        var D = xb2_twin(m, 'JZ Out Split ' + (k + 1), pre, 'ca*' + (k === 2 ? '0.8' : '0.9'), pos);
        jzNoGhost(D);                    // the browser draws the channel copies on the main pass only
        var fe = jzEffect(D, 'ADBE Fill', 'JZ Out Channel');
        jzEP(fe, 3, jzHex(cols[k])); jzEP(fe, 7, 1);
        try { D.blendingMode = C.dark ? BlendingMode.SCREEN : BlendingMode.MULTIPLY; } catch (e0) {}
        if (k) jzSetExpr(jzXf(D, 'ADBE Scale'), xb2_hd(m) + 'var s=100*(1+' + jzN(0.08 * k) + '*ic(PO));[s,s]');
    }
});

/* ---- shockOut — 衝撃波: a small implosion, then a ring bursts outward and every glyph is blown away as the ring passes it */
xb2_reg('shockOut', function (m) {
    var L = m.L, G = xb2_geo(m, true), r = G.rect, F = xb2_frame(m), sz = xb2_sz(m), C = xb2_col(m), H = xb2_hd(m), single = xb2_single(m, G), i;
    var cx = r.left + r.width / 2, cy = r.top + r.height / 2, RM = Math.sqrt(r.width * r.width + r.height * r.height) / 2 + sz * 1.8, DD = [], UX = [], UY = [];
    if (single) { var cc = xb2_toLayer(L, m.W / 2, m.H / 2); cx = cc[0]; cy = cc[1]; RM = Math.sqrt(m.W * m.W + m.H * m.H) * 0.55 * F.k; }
    for (i = 0; i < G.N; i++) {
        var dx = G.g[i].cx - cx, dy = G.g[i].cy - cy, d = Math.sqrt(dx * dx + dy * dy) || 1;
        DD.push(d); UX.push(dx / d); UY.push(dy / d);
    }
    var K = sz * 1.7, RE = 'var rg=' + jzN(RM) + '*oc(cl((PO-0.12)/0.88)),pre=PO<0.16?Math.sin(Math.PI*cl(PO/0.16)):0;';
    var sel = H + RE + xb2_sel(m) + 'var DD=' + xb2_arr(DD) + ',UX=' + xb2_arr(UX) + ',UY=' + xb2_arr(UY) + ',dd=DD[ti-1]||1,ps=rg-dd,mv=0,s=1,a=1,rt=0;' +
        'if(PO>0){if(ps<=0){mv=-pre*SZ*0.08;s=1-0.05*pre;}else{var k=1-Math.exp(-ps/(SZ*0.7));mv=SZ*1.6*k;s=1+0.2*Math.exp(-ps/(SZ*0.25))-0.45*sm(0,SZ*2,ps);' +
        'a=1-sm(SZ*0.15,SZ*1.5,ps);rt=(hh(ti*5.9+SD+281)*2-1)*50*k;}}s=Math.max(0.05,s);var ux=UX[ti-1]||0,uy=UY[ti-1]||0;';
    jzAnimator(L, 'JZ Out Shock', [['ADBE Text Position 3D', [K, K, 0]]], sel + '[ux*mv/' + jzN(K) + '*100,uy*mv/' + jzN(K) + '*100,0]');
    jzAnimator(L, 'JZ Out Shock Size', [['ADBE Text Scale 3D', [200, 200, 100]]], sel + '[(s-1)*100,(s-1)*100,0]');
    jzAnimator(L, 'JZ Out Shock Spin', [['ADBE Text Rotation', 50]], sel + 'rt*2');
    jzAnimator(L, 'JZ Out Shock Fade', [['ADBE Text Opacity', 0]], sel + '(1-a)*100');
    if (!xb2_main(m, single ? null : G) || (single && Math.round(m.o.mi || 0) !== 0)) return;
    var S = xb2_shape(m, 'JZ Out Shock Ring'), RG = H + RE + 'var fa=1-sm(0.3,1,PO);', ring = [[1, 0.09, 1.5, 100], [0.82, 0.025, 1, 60]], k;
    for (k = 0; k < 2; k++) {
        var gg = jzGrp(S, 'ring ' + (k + 1)), el = jzAddEllipse(gg, 10, 10, cx, cy);
        jzSetExpr(el.property('ADBE Vector Ellipse Size'), RG + 'var d=Math.max(0.1,rg*' + jzN(ring[k][0] * 2) + ');[d,d]');
        var st = jzAddStroke(gg, C.acc, 2, ring[k][3]);     // (after the ellipse is configured: adding invalidates its reference)
        jzSetExpr(st.property('ADBE Vector Stroke Width'),RG + 'Math.max(' + jzN(ring[k][2] * m.u) + ',SZ*' + jzN(ring[k][1]) + '*fa)');
        jzSetExpr(jzGX(gg).property('ADBE Vector Group Opacity'), RG + 'PO>0&&rg>0.5?fa*100:0');
    }
});

/* ---- floodOut — 水没: a wavy water line rises through the text; what is under water wobbles, tints and sinks out of sight
   (AE: the dry part is cut by a straight, feathered mask edge that rises under the wavy surface line) */
xb2_reg('floodOut', function (m) {
    var L = m.L, G = xb2_geo(m, false), r = G.rect, F = xb2_frame(m), sz = xb2_sz(m), C = xb2_col(m), H = xb2_hd(m), single = xb2_single(m, G), seed = m.c.seed | 0, BIG = XB2_BIG, j, k;
    // layer-space frame: u along screen right (rt), v along screen down (dn); c = box centre
    var pad = sz * 0.15, rt = F.rt, dn = F.dn, cx = r.left + r.width / 2, cy = r.top + r.height / 2, cu = cx * rt[0] + cy * rt[1], cv = cx * dn[0] + cy * dn[1];
    var PB = [[r.left - pad, r.top - pad], [r.left + r.width + pad, r.top - pad], [r.left - pad, r.top + r.height + pad], [r.left + r.width + pad, r.top + r.height + pad]];
    var u0 = 1e9, u1 = -1e9, v0 = 1e9, v1 = -1e9;
    for (k = 0; k < 4; k++) { var pu = PB[k][0] * rt[0] + PB[k][1] * rt[1], pv = PB[k][0] * dn[0] + PB[k][1] * dn[1]; u0 = Math.min(u0, pu); u1 = Math.max(u1, pu); v0 = Math.min(v0, pv); v1 = Math.max(v1, pv); }
    var U = single ? m.H * 0.12 * F.k : sz, A = U * 0.07, V0, V1;
    if (single) {                  // one glyph per layer: the level crosses the frame from 74% to 24% of its height
        var tr = L.property('ADBE Transform Group'), an = tr.property('ADBE Anchor Point').value, ps = tr.property('ADBE Position').value, av = an[0] * dn[0] + an[1] * dn[1];
        V0 = av + (m.H * 0.74 - ps[1]) * F.k; V1 = av + (m.H * 0.24 - ps[1]) * F.k;
    } else { V0 = v1 + A * 2; V1 = v0 - A * 3; }
    var E = 'var e=ios(cl(PO/0.9)),V=' + jzN(V0) + '+' + xb2_n(V1 - V0) + '*e;', fe = Math.max(2 * m.u, A * 1.6);
    var bp = function (v, off) { var d = v - cv + (off || 0); return [cx + dn[0] * d, cy + dn[1] * d]; };     // point on the level line below the centre
    var half = function (v, sg, off) {                       // half plane above (sg -1) / below (sg 1) the level v
        var b0 = bp(v, off), a1 = [b0[0] - rt[0] * BIG, b0[1] - rt[1] * BIG], a2 = [b0[0] + rt[0] * BIG, b0[1] + rt[1] * BIG];
        return [a1, a2, [a2[0] + sg * dn[0] * BIG, a2[1] + sg * dn[1] * BIG], [a1[0] + sg * dn[0] * BIG, a1[1] + sg * dn[1] * BIG]];
    };
    var main = xb2_main(m, single ? null : G);
    // under water: a tinted, refracted copy below the level (drawn on the main pass only)
    if (main && xb2_layers(m) <= 50) {
        var dy = sz * 0.05, D = xb2_twin(m, 'JZ Out Flood Under', E + 'var uw=(1-sm(0.3,0.95,PO))*0.5;', 'uw', 'var p=parent.transform.anchorPoint;[p[0]+' + xb2_n(dn[0] * dy) + ',p[1]+' + xb2_n(dn[1] * dy) + ']', true);
        jzNoGhost(D);
        xb2_maskPoly(D, half(V0, 1, -dy), 'JZ Out Flood Under', H + E + 'PO>0?' + jzN(V0) + '-V:0', fe);
        var fl = jzEffect(D, 'ADBE Fill', 'JZ Out Water Tint'); jzEP(fl, 3, jzHex(xb2_mix(C.c0, C.acc, 0.55))); jzEP(fl, 7, 1);
        xb2_wave(D, 'JZ Out Refract', 0, sz * 2 * Math.PI / 7, H + 'PO>0?SZ*0.04:0', 'time*343.8');
    }
    // above water: the lyric, cut at the level (mask edge moved by expansion)
    xb2_maskPoly(L, half(V0, -1), 'JZ Out Flood', H + E + 'PO>0?-(' + jzN(V0) + '-V):1e4', fe);
    m.parts.op.push(E + 'f*=V<' + jzN(v0 - A * 2) + '?0:1;');
    if (!main) return;
    // the water line (two sine waves) + bubbles rising to it, drawn upright in a group turned back to the screen axes
    var S = xb2_shape(m, 'JZ Out Flood Line'), LE = H + E + 'var fa=PO>0?1-sm(0.82,0.98,PO):0;', x0 = u0 - cu - sz * 0.2, x1 = u1 - cu + sz * 0.2;
    var wg = jzGrp(S, 'water');
    jzGX(wg).property('ADBE Vector Position').setValue([cx, cy]); jzGX(wg).property('ADBE Vector Rotation').setValue(-F.deg);
    // (each sub-group / item is finished before the next sibling is added: adding one invalidates references to the others)
    var cg = xb2_sub(wg, 'core');
    jzAddPath(cg, [[x0, 0], [x1, 0]], false); jzAddStroke(cg, C.acc, Math.max(1.5 * m.u, U * 0.028));
    jzSetExpr(jzGX(cg).property('ADBE Vector Position'), LE + '[0,V-' + xb2_n(cv) + ']');
    var gg = xb2_sub(wg, 'glow');
    jzAddPath(gg, [[x0, 0], [x1, 0]], false); jzAddStroke(gg, C.acc, Math.max(4 * m.u, U * 0.1), 15);
    jzSetExpr(jzGX(gg).property('ADBE Vector Position'), LE + '[0,V-' + xb2_n(cv) + ']');
    for (j = 0; j < 7; j++) {
        var bgp = xb2_sub(wg, 'bubble ' + (j + 1)), bx = x0 + (x1 - x0) * xb2_r(seed, j, 291), rb = xb2_r(seed, j, 292);
        var BE = LE + 'var ph=(PO*2.2+' + jzN(rb) + ')%1,by=V+' + jzN(A) + '+(1-ph)*SZ*0.9;';
        var be = jzAddEllipse(bgp, 10, 10);
        jzSetExpr(be.property('ADBE Vector Ellipse Size'), BE + 'var d=2*Math.max(1,SZ*0.03*(0.5+ph));[d,d]');
        jzAddStroke(bgp, C.acc, Math.max(1 * m.u, sz * 0.01));
        jzSetExpr(jzGX(bgp).property('ADBE Vector Position'), BE + '[' + jzN(bx) + '+Math.sin(ph*9+' + j + ')*SZ*0.03,by-' + xb2_n(cv) + ']');
        jzSetExpr(jzGX(bgp).property('ADBE Vector Group Opacity'), BE + 'by>' + jzN(v1 + sz * 0.3) + '?0:70*fa*(1-ph*0.5)');
    }
    jzSetExpr(jzXf(S, 'ADBE Opacity'), LE + 'fa*100');
    xb2_wave(S, 'JZ Out Surface 1', 90, U * 2 * Math.PI / 4.2, H + jzN(A), 'time*286.5');
    xb2_wave(S, 'JZ Out Surface 2', 90, U * 2 * Math.PI / 9.5, H + jzN(A * 0.5), '-time*418.3');
});

/* ---- slashOut — 一刀両断: one clean sword stroke: a flash along the line, a beat, then the upper half slides off along the cut */
xb2_reg('slashOut', function (m) {
    var L = m.L, G = xb2_geo(m, false), r = G.rect, sz = xb2_sz(m), C = xb2_col(m), H = xb2_hd(m), vert = G.vert;
    var pad = sz * 0.2, bw = r.width + pad * 2, bh = r.height + pad * 2, cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    var tilt = (xb2_bit(m, 301) ? 1 : -1) * (vert ? 16 + 8 * xb2_cr(m, 302) : 7 + 5 * xb2_cr(m, 302)), th = ((vert ? 90 : 0) + tilt) * Math.PI / 180;
    var d = [Math.cos(th), Math.sin(th)], n = [-d[1], d[0]], LL = Math.sqrt(bw * bw + bh * bh) + sz * 4, dn = d[1] > 0 ? d : [-d[0], -d[1]];
    var half = function (sg) {
        var o = [cx + n[0] * sg * LL, cy + n[1] * sg * LL];
        return [[cx - d[0] * LL, cy - d[1] * LL], [cx + d[0] * LL, cy + d[1] * LL], [o[0] + d[0] * LL, o[1] + d[1] * LL], [o[0] - d[0] * LL, o[1] - d[1] * LL]];
    };
    var E = 'var fl=cl(PO/0.12),gap=sm(0.12,0.3,PO),v=cl((PO-0.3)/0.7),iv=iq(v);';
    // the upper half: a masked copy that slides downhill along the cut
    if (xb2_layers(m) <= 56) {
        var D = xb2_twin(m, 'JZ Out Slash Top', E, '1-sm(0.62,0.98,PO)');
        xb2_maskPoly(D, half(-1), 'JZ Out Slash Top');
        xb2_xform(D, 'JZ Out Slash Slide', cx, cy, H + E + 'var sl=SZ*0.06*gap+SZ*2.2*iv;[' + jzN(cx) + '+' + xb2_n(dn[0]) + '*sl-' + xb2_n(n[0]) + '*SZ*0.05*gap,' + jzN(cy) + '+' + xb2_n(dn[1]) + '*sl-' + xb2_n(n[1]) + '*SZ*0.05*gap]');
    }
    // the lower half: the lyric itself, cut along the line (mask active only in the exit), nudged and faded
    xb2_maskPoly(L, half(1), 'JZ Out Slash', H + 'PO>0?0:1e4');
    xb2_xform(L, 'JZ Out Slash Drop', cx, cy, H + E + '[' + jzN(cx) + '-' + xb2_n(dn[0]) + '*SZ*0.35*iv+' + xb2_n(n[0]) + '*SZ*0.03*gap,' + jzN(cy) + '-' + xb2_n(dn[1]) + '*SZ*0.35*iv+' + xb2_n(n[1]) + '*(SZ*0.03*gap+SZ*0.5*iv)]');
    m.parts.op.push('f*=1-sm(0.5,0.95,PO);');
    if (!xb2_main(m, G)) return;
    // the flash of the blade along the cut
    var ext = (vert ? r.height : r.width) / 2 + sz * 0.9, P0 = [cx - d[0] * ext, cy - d[1] * ext], P1 = [cx + d[0] * ext, cy + d[1] * ext], st = xb2_bit(m, 303);
    var S = xb2_shape(m, 'JZ Out Slash Flash'), FE = H + E + 'var fa=PO>0?1-sm(0.12,0.34,PO):0;', k, W2 = [[0.09, 2, 35], [0.03, 1.5, 100]];
    for (k = 0; k < 2; k++) {
        var gg = jzGrp(S, k ? 'core' : 'glow');
        jzAddPath(gg, st ? [P1, P0] : [P0, P1], false);
        jzAddTrimPaths(gg, FE + 'oe(fl)*100', FE + 'sm(0.08,0.3,PO)*100');
        var sk = jzAddStroke(gg, C.acc, 2, W2[k][2]);
        jzSetExpr(sk.property('ADBE Vector Stroke Width'), FE + 'Math.max(' + jzN(W2[k][1] * m.u) + ',SZ*' + jzN(W2[k][0]) + '*fa)');
    }
    jzSetExpr(jzXf(S, 'ADBE Opacity'), FE + 'fa*100');
});

/* ---- mosaicOut — モザイク: the text is pixelated into ever larger blocks while it fades */
// (browser: an off-screen low-res copy on the main pass only -> AE: an exit-only copy of the lyric with a Mosaic effect, kept out
//  of the chroma ghosts; text layers are rasterised in comp space, so the block count is set in comp px)
xb2_reg('mosaicOut', function (m) {
    var L = m.L, G = xb2_geo(m, false), F = xb2_frame(m), H = xb2_hd(m) + 'var b=SZ*' + jzN(F.s) + '*(0.01+0.34*Math.pow(PO,1.5)),on=PO>0&&b>=1.6;';
    var T = L;
    if (!xb2_crowded(m, G) && xb2_layers(m) <= 56) {
        T = xb2_twin(m, 'JZ Out Mosaic', '', '1-sm(0.55,0.97,PO)');
        jzNoGhost(T);
        m.parts.op.push('f*=PO>0?0:1;');
    } else m.parts.op.push('f*=1-sm(0.55,0.97,PO);');
    var mo = jzEffect(T, 'ADBE Mosaic', 'JZ Out Mosaic');
    jzEX(mo, 1, H + 'on?Math.max(1,Math.min(4000,Math.round(thisComp.width/b))):4000');
    jzEX(mo, 2, H + 'on?Math.max(1,Math.min(4000,Math.round(thisComp.height/b))):4000');
    jzEP(mo, 3, 0);
});

/* ---- scribbleOut — ぐしゃぐしゃ消し: a thick marker scrawls back and forth over each line, then text and scribble fade together */
xb2_reg('scribbleOut', function (m) {
    var L = m.L, G = xb2_geo(m, true), sz = xb2_sz(m), C = xb2_col(m), H = xb2_hd(m), seed = m.c.seed | 0, vert = G.vert, lines = xb2_lines(G), li;
    m.parts.op.push('f*=1-sm(0.45,0.75,PO);');
    if (!lines.length || xb2_layers(m) > 60) return;
    var S = xb2_shape(m, 'JZ Out Scribble');
    for (li = 0; li < lines.length; li++) {
        var a0 = lines[li].u0 - sz * 0.15, a1 = lines[li].u1 + sz * 0.15, mid = lines[li].v, hf = G.fs * 0.5, pts = [], a = a0, k = 0;
        while (a < a1 && k < 200) {              // forward: uneven strokes, the hand drifts up and down
            var dr = Math.sin(a / sz * 1.3 + li) * hf * 0.18, o = dr + ((k & 1) ? 1 : -1) * hf * (0.8 + 0.45 * xb2_r(seed, li, k, 312));
            pts.push(vert ? [mid + o, a] : [a, mid + o]);
            a += sz * (0.14 + 0.2 * xb2_r(seed, li, k, 311)); k++;
        }
        a = a1;
        while (a > a0 && k < 400) {              // back again, flatter and faster, filling the gaps
            var dr2 = Math.sin(a / sz * 2.1 + li * 3) * hf * 0.25, o2 = dr2 + ((k & 1) ? 1 : -1) * hf * (0.45 + 0.4 * xb2_r(seed, li, k, 314));
            pts.push(vert ? [mid + o2, a] : [a, mid + o2]);
            a -= sz * (0.2 + 0.25 * xb2_r(seed, li, k, 313)); k++;
        }
        if (pts.length < 2) continue;
        var g = jzGrp(S, 'scribble ' + (li + 1));
        jzAddPath(g, pts, false);
        jzAddTrimPaths(g, H + 'ios(cl(PO/0.58))*100', null);
        var st = jzAddStroke(g, C.acc, sz * 0.15);
        try { st.property('ADBE Vector Stroke Line Cap').setValue(2); st.property('ADBE Vector Stroke Line Join').setValue(2); } catch (e0) {}
        jzSetExpr(st.property('ADBE Vector Stroke Width'), H + 'Math.max(1,SZ*0.15*(1-0.7*sm(0.62,0.95,PO)))');
    }
    jzSetExpr(jzXf(S, 'ADBE Opacity'), H + 'PO>0?(1-sm(0.66,0.97,PO))*100:0');
});

/* ---- candleOut — 吹き消す: a breath travels along the line; each glyph leans, flickers, goes out and leaves a curl of smoke */
xb2_reg('candleOut', function (m) {
    var L = m.L, G = xb2_geo(m, true), F = xb2_frame(m), sz = xb2_sz(m), C = xb2_col(m), H = xb2_hd(m), dir = xb2_bit(m, 321) ? 1 : -1, i;
    var warm = xb2_mix(C.c0, C.acc, 0.5), UE = (dir > 0 ? '' : 'o=1-o;') + 'var u=(PO-o*0.42)/0.5;';
    var sel = H + xb2_sel(m) + UE + 'var ln=Math.sin(Math.PI*Math.min(1,Math.max(0,u)/0.45));seedRandom(ti*37+SD+Math.floor(time*12)*11,true);var fl=random();';
    jzAnimator(L, 'JZ Out Candle Lean', [['ADBE Text Skew', -dir * 22], ['ADBE Text Position 3D', [dir * sz * 0.06, 0, 0]], ['ADBE Text Scale 3D', [104, 104, 100]]], sel + 'u>0&&u<0.45?ln*100:0');
    jzAnimator(L, 'JZ Out Candle Warm', [['ADBE Text Fill Color', jzHex(warm)]], sel + 'u>0?100:0');
    jzAnimator(L, 'JZ Out Candle Fade', [['ADBE Text Opacity', 0]], sel + 'u<=0?0:(u>=0.45?100:(1-(u>0.3?(1-(u-0.3)/0.15)*(fl<0.5?1:0.6):0.65+0.35*fl))*100)');
    if (!xb2_main(m, G) || !xb2_fewGlyphs(G)) return;
    // a curl of smoke rises from every glyph once it is out
    var S = xb2_shape(m, 'JZ Out Candle Smoke'), lw = Math.max(1.2 * m.u, sz * 0.03);
    for (i = 0; i < G.N; i++) {
        var g = G.g[i]; if (g.sp) continue;
        var pts = [], k;
        for (k = 0; k <= 9; k++) { var f = k / 9, hgt = sz * 1.55 * f, w = Math.sin(f * 5 + 7 + i) * sz * 0.09 * f + dir * sz * 0.4 * f; pts.push([w, -hgt]); }
        var sg = jzGrp(S, 'smoke ' + (i + 1)), E = H + xb2_at(m, i, G.N) + UE + 'var ag=(u-0.36)/0.64;';
        jzAddPath(sg, pts, false);
        jzAddTrimPaths(sg, E + 'cl((0.25+1.3*ag)/1.55)*100', null);
        var st = jzAddStroke(sg, C.sub, lw); try { st.property('ADBE Vector Stroke Line Cap').setValue(2); st.property('ADBE Vector Stroke Line Join').setValue(2); } catch (e0) {}
        var gx = jzGX(sg);             // (fetched after the group's contents are complete)
        gx.property('ADBE Vector Position').setValue([g.cx - F.dn[0] * g.h * 0.4, g.cy - F.dn[1] * g.h * 0.4]);
        gx.property('ADBE Vector Rotation').setValue(-F.deg);
        jzSetExpr(gx.property('ADBE Vector Group Opacity'), E + 'u>=0.36&&u<1?90*(1-ag):0');
    }
});
