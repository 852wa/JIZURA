// ================================================================ pack enter B part 2 (AE port of src/11p_enterB.js)
// heatHaze crtOn interlace loadingBar dither odometer matrixRain hatchFill brushReveal inkDrop quarters invertBox
// printRegister echoCount liquidFill windBlown strokeOrder clockWipe shadowFirst bubbles tokoroten
// Per-glyph motion = text animators with Expression Selectors. Clips = layer masks on the text (static shapes opened by
// mask expansion) or, where a mask cannot draw the shape (dither lattice, bristle strips, clock pies, a wavy liquid level),
// an alpha track matte shape layer parented to the text. Helper graphics (bars, hands, bubbles …) are shape layers parented
// to the text layer, placed right above it and gone once the entrance is over. Copies ("twins") are duplicates of the text
// layer made before the entrance's own animators are added, parented to it and gone once the entrance is over.

// ---------------------------------------------------------------- shared helpers (eb2_*)
// easings not in JZ_FNS: o4 outQuart, o5 outQuint, io4 inOutQuart, ios inOutSine, sm smoothstep(a, b, x)
var EB2_FNS = 'function o4(x){x=cl(x);return 1-Math.pow(1-x,4);}function o5(x){x=cl(x);return 1-Math.pow(1-x,5);}' +
    'function io4(x){x=cl(x);return x<0.5?8*x*x*x*x:1-Math.pow(-2*x+2,4)/2;}function ios(x){x=cl(x);return -(Math.cos(Math.PI*x)-1)/2;}' +
    'function sm(a,b,x){x=cl((x-a)/(b-a));return x*x*(3-2*x);}\n';
var EB2_BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
var EB2_OWNSTROKE = 'var s0=0;try{s0=text.sourceText.style.strokeWidth;}catch(err){}';   // > 0.5: a treatment gave the text its own stroke

function eb2_T(m) { var c = m.c; return { IN: Math.max(0.02, c.inDur || 0.3), DL: (m.o.mi || 0) * (c.stagger || 0.04) }; }
// compact header for masks / helper layers: IN, DL, SZ, P + easings
function eb2_head(m) { var t = eb2_T(m); return 'var IN=' + jzN(t.IN) + ',DL=' + jzN(t.DL) + ',SZ=' + jzN(m.size) + ';' + JZ_FNS + EB2_FNS + 'var P=cl((time-DL)/IN);\n'; }
// browser stg(p, ordLR(i, n), spread) inside an Expression Selector -> q
function eb2_q(spread) { return 'var n=textTotal,o=n>1?(textIndex-1)/(n-1):0,q=cl((P-' + jzN(spread) + '*o)/' + jzN(1 - spread) + ');'; }
function eb2_arr(a) { var s = []; for (var i = 0; i < a.length; i++) s.push(jzN(a[i])); return '[' + s.join(',') + ']'; }
function eb2_pt(x, y) { return '[' + jzN(x) + ',' + jzN(y) + ']'; }
// the browser's J.h / J.r so seeded choices match the web version
function eb2_h(a, b, c, d, e) {
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
function eb2_r(a, b, c, d, e) { return eb2_h(a, b, c, d, e) / 4294967296; }
function eb2_dir(m, salt) { return eb2_r(m.c.seed | 0, salt, 5) < 0.5 ? -1 : 1; }
function eb2_isHex(c) { return typeof c === 'string' && c.charAt(0) === '#' && (c.length === 7 || c.length === 4); }
function eb2_pick(a, b, c) { if (eb2_isHex(a)) return a; if (eb2_isHex(b)) return b; if (eb2_isHex(c)) return c; return '#FFFFFF'; }
// hotOf: white on a dark background, else the accent
function eb2_hot(m) { var sc = m.ctx.sc, bg = eb2_pick(sc.bg, '#000000'); return jzLum(bg) < 0.5 ? '#FFFFFF' : eb2_pick(sc.accent, sc.fg); }
function eb2_td(L) { try { return L.property('ADBE Text Properties').property('ADBE Text Document').value; } catch (e) { return null; } }
function eb2_isSp(ch) { return /^[\s　]$/.test(ch); }
// helper layers are skipped for very long lines, one-glyph-per-layer layouts of long lyrics and crowded comps
function eb2_crowded(m, G) {
    if (G && (G.N > 60 || (G.N <= 1 && jzCount(m.c.text || '') > 14))) return true;
    try { return m.ctx.comp.numLayers > 60; } catch (e) { return false; }
}
// browser isMain / isPrimary: the lyric's opaque, filled item (primary: more than one glyph)
function eb2_main(m, G) {
    var td = eb2_td(m.L);
    if (td && td.applyFill === false) return false;
    try { if (jzXf(m.L, 'ADBE Opacity').value < 85) return false; } catch (e) {}
    return !eb2_crowded(m, G);
}
function eb2_prim(m, G) { var td = eb2_td(m.L); return eb2_main(m, G) && !!td && jzCount(String(td.text)) > 1; }
function eb2_layers(m) { try { return m.ctx.comp.numLayers; } catch (e) { return 0; } }
function eb2_meas(T, L, s, just) {
    var d = L.property('ADBE Text Properties').property('ADBE Text Document').value;
    d.text = s; d.justification = just;
    T.property('ADBE Text Properties').property('ADBE Text Document').setValue(d);
    var q = T.sourceRectAtTime(0, false);
    return { l: q.left, r: q.left + q.width };
}
// Geometry of the lyric in the text layer's own space (call BEFORE adding animators).
//   G.fs, G.lead, G.rect, G.vert (one glyph per line), G.nL, G.lines[{cy, x0, x1, chars}],
//   G.g[] per AE character (textIndex order, spaces included): {i, li, sp, x0, x1, cx, cy, w, h}, G.N = textTotal,
//   G.arranged (layout animators / text on a path), G.masked (the layout masks this layer). measure: exact glyph boxes.
function eb2_geo(m, measure) {
    var L = m.L, TP = L.property('ADBE Text Properties'), td = TP.property('ADBE Text Document').value, i, j;
    var fs = td.fontSize, lead = (!td.autoLeading && td.leading > 0) ? td.leading : fs * 1.2;
    var lines = String(td.text).split(/\r\n|\r|\n|\u0003/), nL = lines.length, r = jzRect(L);
    var G = { fs: fs, lead: lead, nL: nL, rect: r, g: [], lines: [], N: 0, vert: nL > 1, arranged: false, masked: false };
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
                F = eb2_meas(T, L, lines[i], td.justification); ln.x0 = F.l; ln.x1 = F.r;
                if (n > 1) { F0 = eb2_meas(T, L, lines[i], LEFT); off = F.l - F0.l; }
                prev = F.l - trk;
            } else if (!G.vert) {
                var wEst = r.width / Math.max(1, n), lx = r.left + (r.width - wEst * n) / 2;
                ln.x0 = lx; ln.x1 = lx + wEst * n; prev = lx - trk;
            }
            for (j = 0; j < n; j++) {
                var sp = eb2_isSp(cs[j]), x0, x1;
                if (G.vert) { x0 = r.left; x1 = r.left + r.width; }
                else if (T) {
                    x0 = prev + trk;
                    x1 = (j === n - 1) ? F.r : off + eb2_meas(T, L, cs.slice(0, j + 1).join(''), LEFT).r;
                    if (x1 < x0) x1 = x0;
                    prev = x1;
                } else { x0 = prev + trk; x1 = x0 + (r.width + trk) / Math.max(1, n) - trk; prev = x1; }
                var gi = { i: G.N, li: i, sp: sp, x0: x0, x1: x1, cx: (x0 + x1) / 2, cy: ln.cy, w: Math.max(1, x1 - x0), h: fs };
                if (G.vert) gi.w = Math.min(r.width, fs);
                G.g.push(gi); G.N++;
            }
        }
    } catch (e4) { jzWarn('eb2 geometry: ' + e4.toString()); }
    if (T) { try { T.remove(); } catch (e5) {} }
    return G;
}
// reading lines as [{li, u0, u1, v}] (u along the reading direction, v = line centre across it); vertical text = one column
function eb2_lines(G) {
    var r = G.rect, out = [], i, j;
    if (G.vert) return [{ li: 0, u0: r.top, u1: r.top + r.height, v: r.left + r.width / 2 }];
    for (i = 0; i < G.nL; i++) {
        var u0 = 1e9, u1 = -1e9;
        for (j = 0; j < G.N; j++) { var g = G.g[j]; if (g.li !== i || g.sp) continue; if (g.x0 < u0) u0 = g.x0; if (g.x1 > u1) u1 = g.x1; }
        if (u1 > u0) out.push({ li: i, u0: u0, u1: u1, v: G.lines[i].cy });
    }
    return out;
}
// rect mask in the layer's space with optional opacity / expansion expressions
function eb2_mask(Lx, x0, y0, x1, y1, opEx, exEx, name) {
    var mk = jzMaskRect(Lx, x0, y0, x1, y1);
    try { if (name) mk.name = name; } catch (e) {}
    if (opEx) jzSetExpr(mk.property('ADBE Mask Opacity'), opEx);
    if (exEx) jzSetExpr(mk.property('ADBE Mask Offset'), exEx);
    return mk;
}
// circle mask of radius r0 (grown by expansion) / closed polygon mask
function eb2_circ(Lx, cx, cy, r0, name) {
    var mk = Lx.property('ADBE Mask Parade').addProperty('ADBE Mask Atom'), sh = new Shape(), k = r0 * 0.5523;
    sh.vertices = [[cx, cy - r0], [cx + r0, cy], [cx, cy + r0], [cx - r0, cy]];
    sh.inTangents = [[-k, 0], [0, -k], [k, 0], [0, k]]; sh.outTangents = [[k, 0], [0, k], [-k, 0], [0, -k]]; sh.closed = true;
    mk.property('ADBE Mask Shape').setValue(sh);
    try { if (name) mk.name = name; } catch (e) {}
    return mk;
}
function eb2_poly(Lx, pts, name) {
    var mk = Lx.property('ADBE Mask Parade').addProperty('ADBE Mask Atom'), sh = new Shape();
    sh.vertices = pts; sh.closed = true;
    mk.property('ADBE Mask Shape').setValue(sh);
    try { if (name) mk.name = name; } catch (e) {}
    return mk;
}
// helper shape layer drawn in the text layer's own space (parented to it, right above it); keep = full length (mattes)
function eb2_shape(m, name, keep) {
    var L = m.L, S = m.ctx.comp.layers.addShape(), t = eb2_T(m);
    try { S.name = name; } catch (e0) {}
    try { S.moveBefore(L); } catch (e1) {}
    S.parent = L;
    var tr = S.property('ADBE Transform Group');
    tr.property('ADBE Anchor Point').setValue([0, 0]); tr.property('ADBE Position').setValue([0, 0]);
    tr.property('ADBE Scale').setValue([100, 100]); tr.property('ADBE Rotate Z').setValue(0);
    // helper graphics are drawn in the browser's main pass only (ghost off); mattes (keep) clip the lyric in the ghosts too
    if (!keep) { try { S.outPoint = Math.max(S.inPoint + 0.05, Math.min(S.outPoint, t.DL + t.IN + 0.1)); } catch (e2) {} jzNoGhost(S); }
    return S;
}
// a copy of the lyric layer that lives only during the entrance: parented to L (follows every move of it), made before the
// entrance's own animators are added. posEx: position expression (default: exactly on L); opEx: extra opacity factor.
function eb2_twin(m, tag, below, posEx, opEx) {
    var L = m.L, D = L.duplicate(), t = eb2_T(m), i, mns = ['ADBE Position', 'ADBE Scale', 'ADBE Rotate Z', 'ADBE Opacity'];
    try { D.name = String(L.name).substr(0, 20) + ' ' + tag; } catch (e0) {}
    var tr = D.property('ADBE Transform Group');
    for (i = 0; i < mns.length; i++) { try { if (tr.property(mns[i]).expression) tr.property(mns[i]).expression = ''; } catch (e1) {} }
    D.parent = L;
    tr.property('ADBE Scale').setValue([100, 100]); tr.property('ADBE Rotate Z').setValue(0);
    jzSetExpr(tr.property('ADBE Position'), posEx || 'parent.transform.anchorPoint');
    jzSetExpr(tr.property('ADBE Opacity'), eb2_head(m) + 'time>=DL&&time<DL+IN?value' + (opEx ? '*(' + opEx + ')' : '') + ':0');
    try { D.outPoint = Math.max(D.inPoint + 0.05, Math.min(D.outPoint, t.DL + t.IN + 0.1)); } catch (e2) {}
    if (below) { try { D.moveAfter(L); } catch (e3) {} }
    return D;
}
// alpha track matte: L shows only inside S (S right above L). AE 23+ links mattes with setTrackMatte
function eb2_canMatte(m) {
    try { var t = m.L.trackMatteType; return !t || t === TrackMatteType.NO_TRACK_MATTE; } catch (e) { return false; }
}
function eb2_matte(m, S) {
    var L = m.L, ok = false;
    try { S.moveBefore(L); } catch (e0) {}
    if (typeof L.setTrackMatte === 'function') { try { L.setTrackMatte(S, TrackMatteType.ALPHA); ok = true; } catch (e1) { ok = false; } }
    if (!ok) { try { L.trackMatteType = TrackMatteType.ALPHA; } catch (e2) { jzWarn('eb2 matte: ' + e2.toString()); } }
}
// matte group that shows everything once the entrance is over (holds / exits may move glyphs anywhere)
function eb2_fullMatte(m, S, cx, cy) {
    var g = jzGrp(S, 'after entrance'), H = eb2_head(m);
    jzAddRect(g, 40000, 40000, 0, cx, cy); jzAddFill(g, '#FFFFFF');
    jzSetExpr(jzGX(g).property('ADBE Vector Group Opacity'), H + 'time>=DL+IN?100:0');
}
// add a stroke to the text document (width 0, animated by a Stroke Width animator) when it has none; returns true if added
function eb2_addStroke(L) {
    var td = eb2_td(L);
    if (!td || (td.applyStroke && td.strokeWidth > 0)) return false;
    jzTextDoc(L, function (d) {
        d.applyStroke = true; d.strokeWidth = 0;
        try { d.strokeColor = d.applyFill ? d.fillColor : d.strokeColor; } catch (e) {}
        try { d.strokeOverFill = false; } catch (e2) {}
    });
    return true;
}
// keep the text box centre fixed while the layer is scaled by fx / fy (expression strings; pre: variables they need)
function eb2_pivot(m, fx, fy, pre) {
    var L = m.L, tr = L.property('ADBE Transform Group'), a = tr.property('ADBE Anchor Point').value, s = tr.property('ADBE Scale').value;
    var rot = tr.property('ADBE Rotate Z').value * Math.PI / 180, r = jzRect(L);
    var ux = (r.left + r.width / 2 - a[0]) * s[0] / 100, uy = (r.top + r.height / 2 - a[1]) * s[1] / 100;
    if (Math.abs(ux) + Math.abs(uy) < 0.5) return;
    var c = Math.cos(rot), sn = Math.sin(rot);
    m.parts.pos.push((pre || '') + 'var b2px=(1-(' + fx + '))*' + jzN(ux) + ',b2py=(1-(' + fy + '))*' + jzN(uy) + ';d=[d[0]+' + jzN(c) + '*b2px-' + jzN(sn) + '*b2py,d[1]+' + jzN(sn) + '*b2px+' + jzN(c) + '*b2py];');
}
// Transform effect (layer space): anchor at (cx, cy); position / rotation / scale expressions (already with header)
function eb2_xform(Lx, name, cx, cy, posEx, rotEx, sxEx, syEx) {
    var e = jzEffect(Lx, 'ADBE Geometry2', name);
    jzEP(e, 1, [cx, cy]); jzEP(e, 2, [cx, cy]);
    if (posEx) jzEX(e, 2, posEx);
    if (sxEx || syEx) { jzEP(e, 3, 0); if (syEx) jzEX(e, 4, syEx); if (sxEx) jzEX(e, 5, sxEx); }
    if (rotEx) jzEX(e, 8, rotEx);
    return e;
}
// Venetian Blinds as a print pattern (completion %, direction deg, width px)
function eb2_blinds(Lx, name, comp, dir, w) {
    var vb = jzEffect(Lx, 'ADBE Venetian Blinds', name);
    jzEP(vb, 1, comp); jzEP(vb, 2, dir); jzEP(vb, 3, w); jzEP(vb, 4, 0);
    return vb;
}
// wavy water surface: two sine Wave Warps with vertical displacement (same numbers on every layer that shows the surface)
function eb2_waves(Lx, E, sz, ph) {
    var k, W = [[1, sz * 1.7, 'time*401+' + jzN(ph * 57.2958)], [0.45, sz * 1.7 / 2.3, '-time*286']];
    for (k = 0; k < 2; k++) {
        var ww = jzEffect(Lx, 'ADBE Wave Warp', 'JZ In Surface ' + (k + 1));
        jzEP(ww, 1, 1); jzEP(ww, 3, W[k][1]); jzEP(ww, 4, 90); jzEP(ww, 5, 0); jzEP(ww, 6, 1);
        jzEX(ww, 2, E + 'amp*' + jzN(W[k][0]));
        jzEX(ww, 7, W[k][2]);
    }
}
function eb2_wipe(m, angle, completionEx) {
    var lw = jzEffect(m.L, 'ADBE Linear Wipe', 'JZ In Wipe');
    jzEP(lw, 2, angle); jzEP(lw, 3, 0); jzEX(lw, 1, completionEx);
}

/* ---- heatHaze — 陽炎: the line shimmers in through heat haze — thin slices wobble sideways and calm down */
jzReg('enter', 'heatHaze', { apply: function (m) {
    var L = m.L, G = eb2_geo(m, false), r = G.rect, sz = m.size, vert = G.vert;
    var h = (vert ? r.width : r.height) + sz * 0.6, n = jzClamp(Math.round(h / (sz * 0.085)), 8, 14), band = h / n;
    // browser: band k shifts by amp*sin(k*0.9+t*17)*(0.55+0.45*sin(k*0.37+t*6)) -> two sine waves across the slices
    var A = m.HD + EB2_FNS + 'var A=SZ*0.36*(1-ios(P));', W = [[0.72, band * 2 * Math.PI / 0.9, 'time*974'], [0.3, band * 2 * Math.PI / 0.37, '90-time*344']], k;
    for (k = 0; k < 2; k++) {
        var ww = jzEffect(L, 'ADBE Wave Warp', 'JZ In Haze ' + (k + 1));
        jzEP(ww, 1, 1); jzEP(ww, 3, W[k][1]); jzEP(ww, 4, vert ? 90 : 0); jzEP(ww, 5, 0); jzEP(ww, 6, 1);
        jzEX(ww, 2, A + 'A*' + jzN(W[k][0]));
        jzEX(ww, 7, W[k][2]);
    }
    m.parts.op.push('f*=oc(P*2.4);');
} });

/* ---- crtOn — CRT電源: a bright dot stretches into a scan line, which opens vertically into the (hot → own colour) text */
jzReg('enter', 'crtOn', { apply: function (m) {
    var L = m.L, r = jzRect(L), sz = m.size, cx = r.left + r.width / 2, cy = r.top + r.height / 2, hot = eb2_hot(m), H = m.HD + EB2_FNS, k;
    // the squash is a Transform effect about the box centre (the scan line parented to the layer must not be squashed)
    eb2_xform(L, 'JZ In CRT', cx, cy, null, null, H + '(1.18-0.18*oc((P-0.24)/0.5))*100', H + 'Math.max(0.012,ob((P-0.24)/0.5,1.6))*100');
    m.parts.op.push('f*=P<0.24?0:1;');
    jzAnimator(L, 'JZ In CRT Hot', [['ADBE Text Fill Color', jzHex(hot)]], H + '(1-sm(0.3,0.95,P))*100');
    if (!eb2_prim(m)) return;
    var S = eb2_shape(m, 'JZ In CRT Line');
    var E = eb2_head(m) + 'var la=(1-sm(0.3,0.55,P))*cl(P*12),w=' + jzN(r.width + sz * 0.6) + '*o4(P/0.3),th=' + jzN(Math.max(2 * m.u, sz * 0.045)) + '*(1+2*sm(0.2,0.3,P));';
    for (k = 0; k < 2; k++) {
        var grp = jzGrp(S, k ? 'line' : 'glow'), rc = jzAddRect(grp, 10, 10, 0);
        jzSetExpr(rc.property('ADBE Vector Rect Size'), E + '[Math.max(0.01,w),th*' + (k ? 1 : 4) + ']');   // before the fill is added (keeps rc valid)
        jzAddFill(grp, hot);
        jzGX(grp).property('ADBE Vector Position').setValue([cx, cy]);
        jzSetExpr(jzGX(grp).property('ADBE Vector Group Opacity'), E + 'la*' + (k ? 100 : 25));
    }
} });

/* ---- interlace — インターレース: the even scanlines are drawn top to bottom, then a second field fills the odd ones */
jzReg('enter', 'interlace', { apply: function (m) {
    var L = m.L, G = eb2_geo(m, false), r = G.rect, sz = m.size, hr = Math.max(2.5 * m.u, sz * 0.065), pad = sz * 0.25, k;
    var V0 = r.top - pad, V1 = r.top + r.height + pad, span = V1 - V0, n = Math.min(260, Math.ceil(span / hr));
    var x0 = r.left - sz, x1 = r.left + r.width + sz, big = span + sz * 20, H = eb2_head(m), ff = 'var f1=cl(P/0.52),f2=cl((P-0.48)/0.52);';
    if (G.masked) { eb2_wipe(m, 180, H + ff + '(1-(f1+f2)/2)*100'); }
    else {
        // ((y < field-2 front) OR even line) AND (y < field-1 front); the fronts are rect masks opened by expansion
        eb2_mask(L, x0, V0 - big, x1, V0, null, H + ff + 'time>=DL+IN?1e4:f2*' + jzN(span), 'JZ In Field 2');
        var xs = x0 - sz * 0.3, pts = [[xs, V0]];      // comb of the even scanlines, joined by a spine left of the text
        for (k = 0; k < n; k += 2) {
            var ya = V0 + k * hr, yb = ya + hr;
            pts.push([x1, ya]); pts.push([x1, yb]);
            if (k + 2 < n) { pts.push([x0, yb]); pts.push([x0, yb + hr]); } else pts.push([xs, yb]);
        }
        eb2_poly(L, pts, 'JZ In Field 1');
        var m3 = eb2_mask(L, x0, V0 - big, x1, V0, null, H + ff + 'time>=DL+IN?1e4:f1*' + jzN(span), 'JZ In Scan');
        try { m3.maskMode = MaskMode.INTERSECT; } catch (e0) {}
    }
    if (!eb2_prim(m, G)) return;
    var S = eb2_shape(m, 'JZ In Scanline'), gr = jzGrp(S, 'scan');
    jzAddRect(gr, r.width + sz * 0.6, Math.max(1.5 * m.u, sz * 0.02), 0);
    jzAddFill(gr, eb2_hot(m));
    var E = H + ff + 'var f=P<0.5?f1:f2,fd=P<0.5?1:1-sm(0.85,0.99,f);';
    jzSetExpr(jzGX(gr).property('ADBE Vector Position'), E + '[' + jzN(r.left + r.width / 2) + ',' + jzN(V0) + '+f*' + jzN(span) + ']');
    jzSetExpr(jzGX(gr).property('ADBE Vector Group Opacity'), E + 'f>0&&f<1?90*fd:0');
} });

/* ---- loadingBar — ローディング: a progress bar fills in uneven bursts (with a % counter); glyphs pop up as it passes under them */
jzReg('enter', 'loadingBar', { selfHide: true, apply: function (m) {
    var L = m.L, G = eb2_geo(m, true), r = G.rect, sz = m.size, vert = G.vert, seed = m.c.seed | 0, sc = m.ctx.sc, i, k;
    var KY = [[0.06, 0], [0.2, 0.16 + 0.08 * eb2_r(seed, 1)], [0.3, 0.24 + 0.08 * eb2_r(seed, 2)], [0.42, 0.52 + 0.1 * eb2_r(seed, 3)], [0.52, 0.6 + 0.08 * eb2_r(seed, 4)], [0.7, 1]], ks = [], F = [];
    for (i = 0; i < KY.length; i++) ks.push(eb2_pt(KY[i][0], KY[i][1]));
    var PR = 'var KY=[' + ks.join(',') + '],pr=0;for(var kk=1;kk<KY.length;kk++)if(P>=KY[kk-1][0])pr=KY[kk-1][1]+(KY[kk][1]-KY[kk-1][1])*oc((P-KY[kk-1][0])/(KY[kk][0]-KY[kk-1][0]));';
    var U0 = vert ? r.top : r.left, span = Math.max(1, vert ? r.height : r.width);
    for (i = 0; i < G.N; i++) F.push(((vert ? G.g[i].cy : G.g[i].cx) - U0) / span);
    var q = m.HD + PR + 'var F=' + eb2_arr(F) + ',q=cl((pr-(F[textIndex-1]||0))/0.12+0.35);';
    jzAnimator(L, 'JZ In Load Pop', [['ADBE Text Position 3D', vert ? [-sz * 0.25, 0, 0] : [0, sz * 0.25, 0]]], q + 'q<=0||q>=1?0:(1-ob(q,2))*100');
    jzAnimator(L, 'JZ In Load Hide', [['ADBE Text Opacity', 0]], q + 'q<=0?100:(1-cl(q*3))*100');
    if (!eb2_prim(m, G)) return;
    var th = Math.max(3 * m.u, sz * 0.07), gap = sz * 0.24, Ln = vert ? r.height : r.width, fs = Math.max(14 * m.u, sz * 0.26);
    var E = eb2_head(m) + PR + 'var out=sm(0.74,0.96,P),bA=cl(P/0.08)*(1-sm(0.88,1,P)),lo=' + jzN(Ln) + '*out,hi=' + jzN(Ln) + '*pr;';
    var S = eb2_shape(m, 'JZ In Loading'), yb = r.top + r.height + gap, xb = r.left - gap - th;
    for (k = 0; k < 2; k++) {
        // the rect is set up before the fill is added (adding to the contents invalidates older item references)
        var grp = jzGrp(S, k ? 'fill' : 'track'), rc = jzAddRect(grp, 10, 10, 0);
        var ln = 'var s0=lo,s1=Math.max(s0,' + (k ? 'hi' : jzN(Ln)) + ');';
        if (!vert) {
            jzSetExpr(rc.property('ADBE Vector Rect Size'), E + ln + '[s1-s0,' + jzN(th) + ']');
            jzSetExpr(rc.property('ADBE Vector Rect Position'), E + ln + '[' + jzN(r.left) + '+(s0+s1)/2,' + jzN(yb + th / 2) + ']');
        } else {
            jzSetExpr(rc.property('ADBE Vector Rect Size'), E + ln + '[' + jzN(th) + ',s1-s0]');
            jzSetExpr(rc.property('ADBE Vector Rect Position'), E + ln + '[' + jzN(xb + th / 2) + ',' + jzN(r.top) + '+(s0+s1)/2]');
        }
        jzAddFill(grp, k ? eb2_pick(sc.accent, sc.fg) : eb2_pick(sc.sub, sc.fg), k ? 100 : 30);
        jzSetExpr(jzGX(grp).property('ADBE Vector Group Opacity'), E + (k ? '(hi>lo?bA:0)*100' : 'bA*100'));
    }
    // the % counter (mono, sub colour), parented to the lyric
    var T = null;
    try { T = jzText(m.ctx, '100%', { size: fs, font: jzMonoF(m.ctx), color: eb2_pick(sc.sub, sc.fg), align: vert ? 'center' : 'left', x: 0, y: 0, name: 'JZ In Loading %' }); } catch (e0) { T = null; }
    if (!T) return;
    jzNoGhost(T);
    try { T.moveBefore(L); } catch (e1) {}
    T.parent = L;
    var tt = T.property('ADBE Transform Group'), t = eb2_T(m);
    tt.property('ADBE Position').setValue(vert ? [xb + th / 2, r.top + r.height + fs * 0.9] : [r.left + r.width + fs * 0.4, yb + th / 2]);
    tt.property('ADBE Scale').setValue([100, 100]); tt.property('ADBE Rotate Z').setValue(0);
    jzSetExpr(T.property('ADBE Text Properties').property('ADBE Text Document'), E + 'Math.round(pr*100)+"%"');
    jzSetExpr(tt.property('ADBE Opacity'), E + 'bA*(1-out)*100');
    try { T.outPoint = Math.max(T.inPoint + 0.05, Math.min(T.outPoint, t.DL + t.IN + 0.1)); } catch (e2) {}
} });

/* ---- dither — ディザ: ordered (Bayer 4×4) dither dissolve — the line fills in through a regular crosshatch of pixels */
jzReg('enter', 'dither', { apply: function (m) {
    var L = m.L, r = jzRect(L), sz = m.size, dir = eb2_dir(m, 101), H = eb2_head(m), bx, by;
    var pad = sz * 0.2, W = r.width + pad * 2, Hh = r.height + pad * 2, cs = Math.max(3 * m.u, sz * 0.075);
    while ((W / cs) * (Hh / cs) > 1400) cs *= 1.2;
    var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    if (!eb2_canMatte(m) || eb2_crowded(m)) {      // no matte possible: random block dissolve
        var bd = jzEffect(L, 'ADBE Block Dissolve', 'JZ In Dither');
        jzEP(bd, 2, cs); jzEP(bd, 3, cs); jzEP(bd, 4, 0); jzEP(bd, 5, 0);
        jzEX(bd, 1, H + '(1-cl(P*1.1))*100');
        return;
    }
    var nx = Math.ceil(W / cs), ny = Math.ceil(Hh / cs), ox = cx - nx * cs / 2, oy = cy - ny * cs / 2, ov = cs * 0.02 + 0.6;
    // one lattice (period 4 cells) per Bayer level; a cell is on once P*1.35 - 0.3*u > threshold (u = column 0..1 along dir):
    // the lattice's column count grows from the leading side (Repeater copies), rows are all there (second Repeater)
    var S = eb2_shape(m, 'JZ In Dither Matte', true);
    for (by = 0; by < 4 && by < ny; by++) for (bx = 0; bx < 4 && bx < nx; bx++) {
        var th = (EB2_BAYER[by * 4 + bx] + 0.5) / 16, nxl = Math.ceil((nx - bx) / 4), nyl = Math.ceil((ny - by) / 4);
        var ixs = dir > 0 ? bx : bx + 4 * (nxl - 1), lead = dir > 0 ? bx : nx - 1 - ixs;
        var grp = jzGrp(S, 'level ' + EB2_BAYER[by * 4 + bx]);
        jzAddRect(grp, cs + ov, cs + ov, 0, ox + (ixs + 0.5) * cs, oy + (by + 0.5) * cs);
        var r1 = jzVecs(grp).addProperty('ADBE Vector Filter - Repeater');
        jzSetExpr(r1.property('ADBE Vector Repeater Copies'), H + 'var F=(P*1.35-' + jzN(th) + ')/0.3*' + (nx - 1) + ';Math.max(0,Math.min(' + nxl + ',Math.ceil((F-' + lead + ')/4)))');
        r1.property('ADBE Vector Repeater Transform').property('ADBE Vector Repeater Position').setValue([dir * 4 * cs, 0]);
        var r2 = jzVecs(grp).addProperty('ADBE Vector Filter - Repeater');
        r2.property('ADBE Vector Repeater Copies').setValue(nyl);
        r2.property('ADBE Vector Repeater Transform').property('ADBE Vector Repeater Position').setValue([0, 4 * cs]);
        jzAddFill(grp, '#FFFFFF');
    }
    eb2_fullMatte(m, S, cx, cy);
    eb2_matte(m, S);
} });

/* ---- odometer — ドラム回転: each glyph rolls up through a few characters on its own drum and clicks to a stop */
function eb2_reel(Lx, q, fs, twin) {
    var K = fs * 0.56;
    jzAnimator(Lx, 'JZ In Reel Roll', [['ADBE Text Position 3D', [0, K, 0]]], q + 'on?Math.sin(f*Math.PI/2)*100:0');
    jzAnimator(Lx, 'JZ In Reel Drum', [['ADBE Text Scale 3D', [100, 0, 100]]], q + 'on?(1-Math.cos(f*Math.PI/2))*100:0');
    jzAnimator(Lx, 'JZ In Reel Char', [['ADBE Text Character Offset', 100]], q + 'on&&j>0?1+Math.floor(hh(textIndex*31+j*7+SD)*40):0');
    jzAnimator(Lx, 'JZ In Reel Hide', [['ADBE Text Opacity', 0]], q + (twin ? '!on?100:' : 'q<=0||(q<1&&!on)?100:') + '35*Math.abs(f)');
}
jzReg('enter', 'odometer', { selfHide: true, apply: function (m) {
    var L = m.L, G = eb2_geo(m, false), D = eb2_crowded(m, G) ? null : eb2_twin(m, 'JZ In Reel B');
    // reel of R cells (0 = the real glyph); s runs R -> 0 with a little overshoot. The lyric shows cell floor(s) coming up from
    // below, the copy cell floor(s)+1 leaving upwards; both are projected on a drum (squashed towards its rim) instead of a window mask
    var base = m.HD + EB2_FNS + eb2_q(0.45) + 'var R=3+Math.floor(hh(textIndex*13+SD)*3),s=R*(1-ob(q,1.15)),j=Math.floor(s),f=s-j;';
    eb2_reel(L, base + 'var on=q>0&&q<1&&j>=0;', G.fs, false);
    if (D) eb2_reel(D, base + 'j=j+1;f=f-1;var on=q>0&&q<1&&j<=R;', G.fs, true);
} });

/* ---- matrixRain — データ降下: each glyph falls in as the bright head of a short stream of flickering characters */
jzReg('enter', 'matrixRain', { selfHide: true, apply: function (m) {
    var L = m.L, G = eb2_geo(m, false), fs = G.fs, sc = m.ctx.sc, hot = eb2_hot(m), acc = eb2_pick(sc.accent, sc.fg), i, k, LI = [], Ds = [];
    for (i = 0; i < G.N; i++) LI.push(G.g[i].li);
    var nl = eb2_layers(m), nT = eb2_crowded(m, G) ? 0 : (nl > 30 ? 1 : (nl > 18 ? 2 : 3));
    for (k = nT; k >= 1; k--) Ds[k - 1] = eb2_twin(m, 'JZ In Rain ' + k, true);
    // lower lines (vertical text: lower glyphs) land first, so no stream runs over a glyph that has already landed
    var base = m.HD + EB2_FNS + 'var LI=' + eb2_arr(LI) + ',NL=' + G.nL + ',ky=0.35*hh(textIndex*7+SD)+0.65*(NL>1?(NL-1-(LI[textIndex-1]||0))/(NL-1):0),' +
        'q=cl((P-0.45*ky)/0.55),D=SZ*(2.2+hh(textIndex*11+SD)),y=-D*(1-oc(q/0.62));';
    var KF = fs * 3.2, SG = 'posterizeTime(12);seedRandom(textIndex*31+SD+Math.floor(time*12)*7';
    jzAnimator(L, 'JZ In Rain Fall', [['ADBE Text Position 3D', [0, -KF, 0]]], base + 'q>0&&q<0.62?-y/' + jzN(KF) + '*100:0');
    jzAnimator(L, 'JZ In Rain Sign', [['ADBE Text Character Offset', 60]], base + SG + ',true);var rr=random(15,100);q>0&&q<0.62?rr:0');
    jzAnimator(L, 'JZ In Rain Hot', [['ADBE Text Fill Color', jzHex(hot)]], base + 'q<=0?0:(q<0.62?100:(1-oc((q-0.62)/0.38))*100)');
    jzAnimator(L, 'JZ In Hide', [['ADBE Text Opacity', 0]], base + 'q<=0?100:0');
    for (k = 1; k <= nT; k++) {
        var D = Ds[k - 1], KT = KF + fs * 0.92 * k;
        var bk = base + 'var on=q>0&&q<1,a=' + jzN((1 - k / 5) * 0.75) + '*(1-sm(0.558,1,q))*cl(q*6);';
        jzAnimator(D, 'JZ Rain Fall', [['ADBE Text Position 3D', [0, -KT, 0]]], bk + 'on?(-y+' + jzN(fs * 0.92 * k) + ')/' + jzN(KT) + '*100:0');
        jzAnimator(D, 'JZ Rain Sign', [['ADBE Text Character Offset', 60]], bk + SG + '+' + (k * 1009) + ',true);var rr=random(15,100);on?rr:0');
        jzAnimator(D, 'JZ Rain Tint', [['ADBE Text Fill Color', jzHex(acc)], ['ADBE Text Scale 3D', [90, 90, 100]]], '100');
        jzAnimator(D, 'JZ Rain Fade', [['ADBE Text Opacity', 0]], bk + 'on?(1-a)*100:100');
    }
} });

/* ---- hatchFill — ハッチ→ベタ: each glyph is first printed as a hatch / halftone pattern with a hairline outline, then the ink fills in */
jzReg('enter', 'hatchFill', { selfHide: true, apply: function (m) {
    var L = m.L, sz = m.size, td = eb2_td(L), pat = ['stripes', 'hatch', 'dots'][eb2_h(m.c.seed | 0, 131) % 3];
    var D = (td && td.applyFill !== false && !eb2_crowded(m)) ? jzNoGhost(eb2_twin(m, 'JZ In Hatch', true)) : null;
    var q = m.HD + EB2_FNS + eb2_q(0.45);
    if (eb2_addStroke(L)) jzAnimator(L, 'JZ In Hatch Line', [['ADBE Text Stroke Width', Math.max(0.8 * m.u, sz * 0.014)]], q + EB2_OWNSTROKE + 's0>0.5||q<=0||q>=1?0:(1-sm(0.75,1,q))*100');
    jzAnimator(L, 'JZ In Hatch Fill', [['ADBE Text Fill Opacity', 0]], q + 'q<=0.35?100:(1-ios((q-0.35)/0.55))*100');
    jzAnimator(L, 'JZ In Hatch Settle', [['ADBE Text Scale 3D', [110, 110, 100]]], q + 'q<=0||q>=1?0:(1-oc(q/0.4))*100');
    jzAnimator(L, 'JZ In Hide', [['ADBE Text Opacity', 0]], q + 'q<=0?100:(1-cl(q*5))*100');
    if (!D) return;
    // the pattern print (behind): same glyphs through Venetian Blinds (stripes / cross-cut dots)
    jzAnimator(D, 'JZ Hatch Settle', [['ADBE Text Scale 3D', [110, 110, 100]]], q + 'q<=0||q>=1?0:(1-oc(q/0.4))*100');
    jzAnimator(D, 'JZ Hatch Fade', [['ADBE Text Opacity', 0]], q + 'q<=0||q>=1?100:(1-cl(q*5)*(1-sm(0.75,1,q)))*100');
    var wv = Math.max(3 * m.u, sz * 0.085);
    if (pat === 'dots') { eb2_blinds(D, 'JZ Hatch Dots A', 45, 0, wv); eb2_blinds(D, 'JZ Hatch Dots B', 45, 90, wv); }
    else if (pat === 'hatch') eb2_blinds(D, 'JZ Hatch', 62, 135, wv * 0.8);
    else eb2_blinds(D, 'JZ Hatch Stripes', 55, 45, wv);
} });

/* ---- brushReveal — 筆払い: a dry-brush pass (bristle tips in the accent colour) paints each line in, line after line */
jzReg('enter', 'brushReveal', { apply: function (m) {
    var L = m.L, G = eb2_geo(m, true), sz = m.size, seed = m.c.seed | 0, KS = 14, tail = sz * 1.1, pad = sz * 0.2, tip = sz * 0.32, i, k;
    var LS = eb2_lines(G), nL = LS.length, H = eb2_head(m), r = G.rect, vert = G.vert;
    if (!eb2_canMatte(m) || !nL || nL > 12 || eb2_crowded(m, G)) { eb2_wipe(m, vert ? 180 : 270, H + '(1-ios(P))*100'); return; }
    var T = eb2_main(m, G) ? eb2_shape(m, 'JZ In Brush Tips') : null, S = eb2_shape(m, 'JZ In Brush Matte', true), acc = eb2_pick(m.ctx.sc.accent, m.ctx.sc.fg);
    var hv = G.fs * 0.66, th = hv * 2 / KS;
    for (i = 0; i < nL; i++) {
        var ln = LS[i], ord = nL > 1 ? i / (nL - 1) : 0, spr = nL > 1 ? 0.4 : 0, a0 = ln.u0 - pad;
        var LQ = H + 'var q=cl((P-' + jzN(spr * ord) + ')/' + jzN(1 - spr) + '),F=' + jzN(a0) + '+' + jzN(ln.u1 + pad + tail - a0) + '*ios(q),a=' + jzN(a0) + ';';
        for (k = 0; k < KS; k++) {
            var lag = tail * Math.pow(eb2_r(seed, ln.li, k, 141), 1.6), vc = ln.v - hv + (k + 0.5) * th;
            var SE = LQ + 'var e=Math.max(a,F-' + jzN(lag) + ');';
            // each rect is set up before its fill is added (adding to the contents invalidates older item references)
            var g = jzGrp(S, 'strip ' + (i + 1) + '.' + (k + 1)), rc = jzAddRect(g, 10, 10, 0);
            jzSetExpr(rc.property('ADBE Vector Rect Size'), SE + (vert ? '[' + jzN(th + 0.8) + ',e-a]' : '[e-a,' + jzN(th + 0.8) + ']'));
            jzSetExpr(rc.property('ADBE Vector Rect Position'), SE + (vert ? '[' + jzN(vc) + ',(a+e)/2]' : '[(a+e)/2,' + jzN(vc) + ']'));
            jzAddFill(g, '#FFFFFF');
            if (!T) continue;
            var tg = jzGrp(T, 'tip ' + (i + 1) + '.' + (k + 1)), tr = jzAddRect(tg, 10, 10, 0), TE = SE + 'var t0=Math.max(a,e-' + jzN(tip) + ');';
            jzSetExpr(tr.property('ADBE Vector Rect Size'), TE + (vert ? '[' + jzN(th * 0.92) + ',e-t0]' : '[e-t0,' + jzN(th * 0.92) + ']'));
            jzSetExpr(tr.property('ADBE Vector Rect Position'), TE + (vert ? '[' + jzN(vc) + ',(t0+e)/2]' : '[(t0+e)/2,' + jzN(vc) + ']'));
            jzAddFill(tg, acc);
            jzSetExpr(jzGX(tg).property('ADBE Vector Group Opacity'), TE + 'q>0&&e>a&&e<=' + jzN(ln.u1 + pad + tip) + '?90*(1-sm(0.7,0.95,q)):0');
        }
    }
    eb2_fullMatte(m, S, r.left + r.width / 2, r.top + r.height / 2);
    eb2_matte(m, S);
} });

/* ---- inkDrop — インク滴: an ink drop lands inside every glyph (random order) and spreads out in a blot that reveals it */
jzReg('enter', 'inkDrop', { apply: function (m) {
    var L = m.L, G = eb2_geo(m, true), sz = m.size, seed = m.c.seed | 0, H = eb2_head(m), i, first = true;
    if (G.masked || G.arranged || eb2_crowded(m, G) || G.N > 40) {       // no per-glyph masks: glyphs bleed in (blur + fade), random order
        var qb = m.HD + EB2_FNS + 'var q=cl((P-0.5*hh(textIndex*7+SD))/0.5);';
        jzAnimator(L, 'JZ In Ink', [['ADBE Text Blur', [sz * 0.12, sz * 0.12]], ['ADBE Text Opacity', 0], ['ADBE Text Scale 3D', [60, 60, 100]]], qb + '(1-oc(q))*100');
        return;
    }
    var T = eb2_main(m, G) ? eb2_shape(m, 'JZ In Ink Drops') : null, acc = eb2_pick(m.ctx.sc.accent, m.ctx.sc.fg);
    for (i = 0; i < G.N; i++) {
        var g = G.g[i]; if (g.sp) continue;
        var hw = g.w / 2, hh2 = g.h / 2, px = g.cx + (eb2_r(seed, i, 152) * 2 - 1) * hw * 0.4, py = g.cy + (eb2_r(seed, i, 153) * 2 - 1) * hh2 * 0.4;
        var ax = hw + Math.abs(px - g.cx), ay = hh2 + Math.abs(py - g.cy), R = Math.sqrt(ax * ax + ay * ay) + sz * 0.08;
        var QE = H + 'var q=cl((P-' + jzN(0.5 * eb2_r(seed, i, 151)) + ')/0.5);';
        var mk = eb2_circ(L, px, py, 1, 'JZ In Ink ' + (i + 1));
        jzSetExpr(mk.property('ADBE Mask Opacity'), QE + 'q>0.12||time>=DL+IN?100:0');
        jzSetExpr(mk.property('ADBE Mask Offset'), QE + (first ? 'time>=DL+IN?1e4:' : '') + jzN(R) + '*oc((q-0.12)/0.88)-1');
        first = false;
        if (!T) continue;
        var dg = jzGrp(T, 'drop ' + (i + 1)), el = jzAddEllipse(dg, 10, 10);
        jzSetExpr(el.property('ADBE Vector Ellipse Size'), QE + 'var t=q/0.12,r=' + jzN(sz * 0.07) + '*(q<0.12?ob(t,2):1+(q-0.12)*4);[2*r,2*r]');   // before the fill (keeps el valid)
        jzAddFill(dg, acc);
        jzGX(dg).property('ADBE Vector Position').setValue([px, py]);
        jzSetExpr(jzGX(dg).property('ADBE Vector Group Opacity'), QE + 'q>0&&q<0.4?(q<0.12?100:(1-(q-0.12)/0.28)*100):0');
    }
} });

/* ---- quarters — 四方集結: the line is cut into four quadrants that fly in from the four corners and lock together */
jzReg('enter', 'quarters', { apply: function (m) {
    var L = m.L, G = eb2_geo(m, false), r = G.rect, sz = m.size, dir = eb2_dir(m, 161), H = eb2_head(m), k;
    var cx = r.left + r.width / 2, cy = r.top + r.height / 2, big = sz * 30, td = eb2_td(L);
    var D = sz * (td && jzCount(String(td.text)) > 1 ? 1.1 : 0.5) + Math.max(r.width, r.height) * 0.12;
    m.parts.op.push('f*=cl(P*5);');
    var Q = [[-1, -1], [1, 1], [1, -1], [-1, 1]], lays = [L];         // diagonal pairs arrive together
    if (G.masked || eb2_crowded(m, G)) {       // no quadrant copies: the whole line settles in from the first corner
        eb2_xform(L, 'JZ In Quarter Move', cx, cy, H + 'var e1=1-o5(P);[' + jzN(cx) + '-' + jzN(D) + '*e1,' + jzN(cy) + '-' + jzN(D) + '*e1]', H + jzN(dir * 9) + '*(1-o5(P))');
        return;
    }
    for (k = 1; k < 4; k++) lays.push(eb2_twin(m, 'JZ In Quarter ' + (k + 1), false, null, 'cl(P*5)'));
    for (k = 0; k < 4; k++) {
        var sx = Q[k][0], sy = Q[k][1], Lk = lays[k], ov = k ? 0.6 : 0;
        var x0 = sx < 0 ? cx - big : cx - ov, x1 = sx < 0 ? cx + ov : cx + big, y0 = sy < 0 ? cy - big : cy - ov, y1 = sy < 0 ? cy + ov : cy + big;
        eb2_mask(Lk, x0, y0, x1, y1, null, k ? null : H + 'time>=DL+IN?1e4:0', 'JZ In Quarter');
        var E = H + 'var e1=1-o5(cl((P-' + (k < 2 ? 0 : 0.2) + ')/0.8));';
        eb2_xform(Lk, 'JZ In Quarter Move', cx, cy, E + '[' + jzN(cx) + '+' + jzN(sx * D) + '*e1,' + jzN(cy) + '+' + jzN(sy * D) + '*e1]', E + jzN(dir * sx * sy * 9) + '*e1');
    }
} });

/* ---- invertBox — 反転抜け: a solid block wipes on with the lyric knocked out of it, then drops away and leaves the plain text */
jzReg('enter', 'invertBox', { apply: function (m) {
    var L = m.L, G = eb2_geo(m, false), r = G.rect, sz = m.size, mg = sz * 0.16, sc = m.ctx.sc, H = eb2_head(m), big = sz * 20;
    var col = jzTextColor(L), bg = eb2_pick(sc.bg, '#000000');
    var x0 = r.left - mg, y0 = r.top - mg, x1 = r.left + r.width + mg, y1 = r.top + r.height + mg, w = x1 - x0, h = y1 - y0;
    var E = H + 'var e1=o4(P/0.34),e2=io4((P-0.42)/0.55);';
    if (G.masked) { eb2_wipe(m, 270, E + '(1-e1)*100'); return; }
    var K = (eb2_main(m, G) && !eb2_crowded(m, G)) ? jzNoGhost(eb2_twin(m, 'JZ In Knockout')) : null;
    // the lyric shows only above the block's top edge (where the block has already dropped away)
    eb2_mask(L, x0 - big, y0 - big, x1 + big, y0, E + 'e2>0||time>=DL+IN?100:0', E + 'time>=DL+IN?1e4:e2*' + jzN(h), 'JZ In Uncover');
    var B = eb2_shape(m, 'JZ In Block'), gr = jzGrp(B, 'block'), rc = jzAddRect(gr, 10, 10, 0);
    var BE = E + 'var bw=' + jzN(w) + '*e1,bh=' + jzN(h) + '*(1-e2);';
    jzSetExpr(rc.property('ADBE Vector Rect Size'), BE + '[bw,bh]');       // the rect is set up before the fill is added (keeps rc valid)
    jzSetExpr(rc.property('ADBE Vector Rect Position'), BE + '[' + jzN(x0) + '+bw/2,' + jzN(y1) + '-bh/2]');
    jzAddFill(gr, col);
    jzSetExpr(jzGX(gr).property('ADBE Vector Group Opacity'), BE + 'bw>=0.5&&bh>=0.5?100:0');
    if (!K) return;
    // the knocked-out lyric: a background-coloured copy on top of the block, clipped to it
    try { K.moveBefore(B); } catch (e0) {}
    jzAnimator(K, 'JZ Knockout', [['ADBE Text Fill Color', jzHex(bg)], ['ADBE Text Stroke Color', jzHex(bg)]], '100');
    eb2_mask(K, x0 - big, y0 - big, x0, y1 + big, null, E + 'e1*' + jzN(w), 'JZ Block Right');
    var mk = eb2_mask(K, x0 - big, y0, x1 + big, y1 + big, null, E + '-e2*' + jzN(h), 'JZ Block Top');
    try { mk.maskMode = MaskMode.INTERSECT; } catch (e1) {}
} });

/* ---- printRegister — 版ズレ: misregistered riso print — two halftone colour plates jolt into register in a few hard steps */
jzReg('enter', 'printRegister', { apply: function (m) {
    var L = m.L, r = jzRect(L), sz = m.size, seed = m.c.seed | 0, sc = m.ctx.sc, j;
    var cx = r.left + r.width / 2, cy = r.top + r.height / 2, a0 = eb2_r(seed, 171) * Math.PI * 2;
    var plates = [eb2_pick(sc.accent), eb2_pick(sc.accent2, sc.ghostA, sc.accent)];
    var E = eb2_head(m) + 'var x4=cl(P/0.8)*4,k=Math.min(3,Math.floor(x4)),e=P>=0.8?1:(k+ob(cl((x4-k)/0.3),2.2))/4,Dd=' + jzN(sz * 0.42) + '*(1-e);';
    var off = function (jj) { var a = a0 + jj * Math.PI * 2 / 3; return '[' + jzN(cx) + '+' + jzN(Math.cos(a)) + '*Dd,' + jzN(cy) + '+' + jzN(Math.sin(a)) + '*Dd]'; };
    var Ds = [];
    if (eb2_main(m) && !eb2_crowded(m)) { Ds.push(jzNoGhost(eb2_twin(m, 'JZ In Plate 1', true, null, 'cl(P*4)*(1-sm(0.8,1,P))'))); Ds.push(jzNoGhost(eb2_twin(m, 'JZ In Plate 2', true, null, 'cl(P*4)*(1-sm(0.8,1,P))'))); }
    eb2_xform(L, 'JZ In Register', cx, cy, E + off(0));
    m.parts.op.push('f*=cl(P*4);');
    var wv = Math.max(3 * m.u, sz * 0.075);
    for (j = 0; j < Ds.length; j++) {
        var D = Ds[j];
        jzAnimator(D, 'JZ Plate Ink', [['ADBE Text Fill Color', jzHex(plates[j])], ['ADBE Text Stroke Color', jzHex(plates[j])]], '100');
        if (j === 0) { eb2_blinds(D, 'JZ Plate Dots A', 45, 0, wv); eb2_blinds(D, 'JZ Plate Dots B', 45, 90, wv); }
        else eb2_blinds(D, 'JZ Plate Lines', 50, 90, wv * 0.9);
        eb2_xform(D, 'JZ Plate Offset', cx, cy, E + off(j + 1));
    }
} });

/* ---- echoCount — カウントイン: three stepped copies trail behind the line and drop off one per beat (3, 2, 1, on) */
jzReg('enter', 'echoCount', { apply: function (m) {
    var L = m.L, sz = m.size, dir = eb2_dir(m, 181), sc = m.ctx.sc, col = eb2_pick(sc.accent, sc.sub, sc.fg), k;
    var X = 'var b2x4=cl(P/0.88)*4,b2b=Math.min(3,Math.floor(b2x4)),b2f=b2x4-b2b,b2n=P>=0.88?0:3-b2b,b2u=cl((P-0.9)/0.09);';
    var fS = '(P>=1?1:1+0.14*Math.exp(-b2f*7)*(P<0.88?1:0)+(P>=0.88?0.1*Math.exp(-(P-0.88)*40)*(1-b2u*b2u*(3-2*b2u)):0))';
    m.parts.sc.push(X + 'var b2s=' + fS + ';f=[f[0]*b2s,f[1]*b2s];');
    eb2_pivot(m, fS, fS, X);
    m.parts.op.push('f*=cl(P*10);');
    if (eb2_crowded(m)) return;
    for (k = 3; k >= 1; k--) {        // the copy nearest to the line is directly behind it
        var dx = k * dir * sz * 0.16, dy = k * sz * 0.11;
        var D = eb2_twin(m, 'JZ In Count ' + k, true, 'var a=parent.transform.anchorPoint;[a[0]+' + jzN(dx) + ',a[1]+' + jzN(dy) + ']',
            'cl(P*10)*' + jzN(0.75 * Math.pow(0.72, k - 1)) + '*(P<0.88&&' + k + '<=3-Math.min(3,Math.floor(cl(P/0.88)*4))?1:0)');
        jzAnimator(D, 'JZ Count Ink', [['ADBE Text Fill Color', jzHex(col)], ['ADBE Text Stroke Color', jzHex(col)]], '100');
    }
} });

/* ---- liquidFill — 水位上昇: the glyphs fill up like glasses — a wavy liquid level rises through hairline outlines */
jzReg('enter', 'liquidFill', { apply: function (m) {
    var L = m.L, G = eb2_geo(m, false), r = G.rect, sz = m.size, seed = m.c.seed | 0, ph = eb2_r(seed, 201) * Math.PI * 2, td = eb2_td(L);
    var mg = sz * 0.3, X0 = r.left - mg, X1 = r.left + r.width + mg, Y0 = r.top - mg, Y1 = r.top + r.height + mg, cx = r.left + r.width / 2, bot = Y1 + sz * 20;
    var E = eb2_head(m) + 'var e=ios(cl(P/0.94)),amp=' + jzN(sz * 0.08) + '*(1-sm(0.75,1,P)),lvl=' + jzN(Y1) + '+(' + jzN(Y0 - Y1) + '-amp*2)*e,oa=cl(P*6)*(1-sm(0.8,1,P));';
    if (!eb2_canMatte(m) || eb2_crowded(m, G)) { eb2_wipe(m, 0, E + '(1-e)*100'); return; }
    // hairline outline of the glass (behind), only while filling
    if (td && td.applyFill !== false) {
        var D = jzNoGhost(eb2_twin(m, 'JZ In Glass', true, null, '0.45*cl(P*6)*(1-sm(0.8,1,P))')), c0 = td.fillColor;
        jzTextDoc(D, function (d) { d.applyFill = false; d.applyStroke = true; d.strokeColor = c0; d.strokeWidth = Math.max(1 * m.u, sz * 0.014); try { d.strokeOverFill = true; } catch (e0) {} });
    }
    // the surface line (accent) rides the level with the same waves as the matte
    if (eb2_prim(m, G)) {
        var T = eb2_shape(m, 'JZ In Liquid Line'), lg = jzGrp(T, 'surface');
        jzAddPath(lg, [[X0, 0], [X1, 0]], false);
        jzAddStroke(lg, eb2_pick(m.ctx.sc.accent, m.ctx.sc.fg), Math.max(1.5 * m.u, sz * 0.025));
        jzSetExpr(jzGX(lg).property('ADBE Vector Position'), E + '[0,lvl]');
        jzSetExpr(jzGX(lg).property('ADBE Vector Group Opacity'), E + 'e>0.02?oa*100:0');
        eb2_waves(T, E, sz, ph);
    }
    var S = eb2_shape(m, 'JZ In Liquid Matte', true), g = jzGrp(S, 'liquid'), rc = jzAddRect(g, 10, 10, 0);
    jzSetExpr(rc.property('ADBE Vector Rect Size'), E + '[' + jzN(X1 - X0) + ',Math.max(0,' + jzN(bot) + '-lvl)]');   // before the fill (keeps rc valid)
    jzSetExpr(rc.property('ADBE Vector Rect Position'), E + '[' + jzN(cx) + ',(lvl+' + jzN(bot) + ')/2]');
    jzAddFill(g, '#FFFFFF');
    eb2_waves(S, E, sz, ph);
    eb2_fullMatte(m, S, cx, r.top + r.height / 2);
    eb2_matte(m, S);
} });

/* ---- windBlown — 風に乗って: glyphs are blown in from one side on a gust, fluttering like leaves before they settle
   (browser: every stroke piece separately -> AE: per glyph) */
jzReg('enter', 'windBlown', { selfHide: true, apply: function (m) {
    var L = m.L, sz = m.size, dir = eb2_dir(m, 191), ks = 1;
    try { ks = Math.abs(jzXf(L, 'ADBE Scale').value[0]) / 100 || 1; } catch (e0) {}
    var Dd = m.W * 0.3 / ks + sz * 2, PX = Dd * 1.2, PY = sz * 1.2;
    var q = m.HD + EB2_FNS + 'var n=textTotal,o=n>1?(textIndex-1)/(n-1):0;' + (dir > 0 ? 'o=1-o;' : '') +
        'var i=textIndex+SD,q=cl((P-0.55*(0.55*o+0.45*hh(i*3+1)))/0.45),k=1-oc(q),ph=hh(i*5+2)*Math.PI*2,on=q>0&&q<1;';
    jzAnimator(L, 'JZ In Gust', [['ADBE Text Position 3D', [PX, PY, 0]]], q + 'on?[' + (-dir) + '*' + jzN(Dd) + '*k*(0.8+0.4*hh(i*7+3))/' + jzN(PX) + '*100,(Math.sin(ph+k*6)*0.55-0.5*(hh(i*11+4)*2-1))*SZ*k/' + jzN(PY) + '*100,0]:[0,0,0]');
    jzAnimator(L, 'JZ In Flutter', [['ADBE Text Rotation', 170]], q + 'on?Math.sin(ph*2+k*7)*k*100:0');
    jzAnimator(L, 'JZ In Leaf', [['ADBE Text Scale 3D', [70, 70, 100]]], q + 'on?k*100:0');
    jzAnimator(L, 'JZ In Hide', [['ADBE Text Opacity', 0]], q + 'q<=0?100:(1-cl(q*4))*100');
} });

/* ---- strokeOrder — 一画ずつ: every glyph is written in from its top-left to its bottom-right, glyph after glyph
   (browser: stroke pieces in reading order -> AE: a soft circular front per glyph + a small settle) */
jzReg('enter', 'strokeOrder', { selfHide: true, apply: function (m) {
    var L = m.L, G = eb2_geo(m, true), sz = m.size, H = eb2_head(m), i, first = true;
    var soft = G.masked || G.arranged || eb2_crowded(m, G) || G.N > 40;
    var q = m.HD + EB2_FNS + eb2_q(0.6);
    jzAnimator(L, 'JZ In Write Settle', [['ADBE Text Scale 3D', [soft ? 115 : 108, soft ? 115 : 108, 100]]], q + 'q<=0||q>=1?0:(1-oc(q))*100');
    jzAnimator(L, 'JZ In Hide', [['ADBE Text Opacity', 0]], q + (soft ? 'q<=0?100:(1-ios(q))*100' : 'q<=0?100:(1-cl(q*4))*100'));
    if (soft) return;
    var fe = sz * 0.1, n = G.N;
    for (i = 0; i < n; i++) {
        var g = G.g[i]; if (g.sp) continue;
        var tlx = g.x0, tly = g.cy - g.h * 0.55, ccx = tlx - g.w * 0.25, ccy = tly - g.h * 0.3;
        var R0 = Math.sqrt((tlx - ccx) * (tlx - ccx) + (tly - ccy) * (tly - ccy)) * 0.75;
        var bx = g.x1 - ccx, by = g.cy + g.h * 0.55 - ccy, R1 = Math.sqrt(bx * bx + by * by) + fe;
        var QE = H + 'var q=cl((P-' + jzN(0.6 * (n > 1 ? i / (n - 1) : 0)) + ')/0.4);';
        var mk = eb2_circ(L, ccx, ccy, 1, 'JZ In Write ' + (i + 1));
        try { mk.property('ADBE Mask Feather').setValue([fe, fe]); } catch (e0) {}
        jzSetExpr(mk.property('ADBE Mask Opacity'), QE + 'q>0||time>=DL+IN?100:0');
        jzSetExpr(mk.property('ADBE Mask Offset'), QE + (first ? 'time>=DL+IN?1e4:' : '') + jzN(R0) + '+' + jzN(R1 - R0) + '*ios((q-0.06)/0.86)-1');
        first = false;
    }
} });

/* ---- clockWipe — 時計回り: every glyph is uncovered by a clock hand sweeping once around its centre */
jzReg('enter', 'clockWipe', { apply: function (m) {
    var L = m.L, G = eb2_geo(m, true), sz = m.size, seed = m.c.seed | 0, H = eb2_head(m), r = G.rect, i, n = G.N;
    var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    if (!eb2_canMatte(m) || G.arranged || eb2_crowded(m, G) || n > 40) {   // one clock sweep over the whole line
        var rw = jzEffect(L, 'ADBE Radial Wipe', 'JZ In Clock');
        jzEP(rw, 3, [cx, cy]); jzEP(rw, 4, eb2_r(seed, 0, 211) < 0.5 ? 1 : 2); jzEX(rw, 1, H + '(1-ios(P))*100');
        return;
    }
    var T = eb2_main(m, G) ? eb2_shape(m, 'JZ In Clock Hands') : null, S = eb2_shape(m, 'JZ In Clock Matte', true);
    var lw = Math.max(1.5 * m.u, sz * 0.028), acc = eb2_pick(m.ctx.sc.accent, m.ctx.sc.fg);
    for (i = 0; i < n; i++) {
        var g = G.g[i]; if (g.sp) continue;
        var R = Math.sqrt(g.w * g.w + g.h * g.h) * 0.55 + sz * 0.05, cw = eb2_r(seed, i, 211) < 0.5;
        var QE = H + 'var q=cl((P-' + jzN(0.5 * (n > 1 ? i / (n - 1) : 0)) + ')/0.5),sw=ios(q);';
        // pie = a circle of radius R/2 stroked R wide, trimmed to the swept angle (AE ellipses start at 12 o'clock, clockwise)
        var pg = jzGrp(S, 'pie ' + (i + 1));
        jzAddEllipse(pg, R, R);
        if (cw) jzAddTrimPaths(pg, QE + 'q>=1?100:sw*100', null);
        else jzAddTrimPaths(pg, null, QE + 'q>=1?0:100-sw*100');
        jzAddStroke(pg, '#FFFFFF', R);
        jzGX(pg).property('ADBE Vector Position').setValue([g.cx, g.cy]);
        jzSetExpr(jzGX(pg).property('ADBE Vector Group Opacity'), QE + 'q>0?100:0');
        if (!T) continue;
        var hg = jzGrp(T, 'hand ' + (i + 1));
        jzAddPath(hg, [[0, 0], [0, -R * 0.9]], false);
        jzAddStroke(hg, acc, lw);
        jzAddEllipse(hg, lw * 2.6, lw * 2.6);
        jzAddFill(hg, acc);
        jzGX(hg).property('ADBE Vector Position').setValue([g.cx, g.cy]);
        jzSetExpr(jzGX(hg).property('ADBE Vector Rotation'), QE + (cw ? '' : '-') + 'sw*360');
        jzSetExpr(jzGX(hg).property('ADBE Vector Group Opacity'), QE + 'q>0&&q<1?(1-sm(0.8,1,q))*cl(q*8)*100:0');
    }
    eb2_fullMatte(m, S, cx, cy);
    eb2_matte(m, S);
} });

/* ---- shadowFirst — 影落とし: each glyph's shadow lands first; the glyph drops from above the lens straight onto it */
jzReg('enter', 'shadowFirst', { selfHide: true, apply: function (m) {
    var L = m.L, sz = m.size, sc = m.ctx.sc, bg = eb2_pick(sc.bg, '#000000');
    var sh = jzMixHex(bg, jzLum(bg) < 0.5 ? eb2_pick(sc.fg) : '#000000', 0.28);
    var D = eb2_crowded(m) ? null : eb2_twin(m, 'JZ In Shadow', true);
    var q = m.HD + EB2_FNS + eb2_q(0.45) + 'var tL=0.72,e=iq((q-0.12)/(tL-0.12)),u=cl((q-tL)/(1-tL));';
    jzAnimator(L, 'JZ In Drop Scale', [['ADBE Text Scale 3D', [175, 175, 100]]], q + 'q<=0.12||q>=1?0:(q<tL?(1-e)*100:-0.07*Math.sin(Math.PI*u)*(1-u)/0.75*100)');
    jzAnimator(L, 'JZ In Drop Move', [['ADBE Text Position 3D', [-sz * 0.22, -sz * 0.34, 0]]], q + 'q>0.12&&q<tL?(1-e)*100:0');
    jzAnimator(L, 'JZ In Hide', [['ADBE Text Opacity', 0]], q + 'q<=0.12?100:(1-cl((q-0.12)*4))*100');
    if (!D) return;
    var qs = q + 'var es=cl(q/tL);';
    jzAnimator(D, 'JZ Shadow Ink', [['ADBE Text Fill Color', jzHex(sh)], ['ADBE Text Stroke Color', jzHex(sh)]], '100');
    jzAnimator(D, 'JZ Shadow Grow', [['ADBE Text Scale 3D', [55, 55, 100]], ['ADBE Text Blur', [sz * 0.05, sz * 0.05]]], qs + 'q<=0?0:(1-iq(es))*100');
    jzAnimator(D, 'JZ Shadow Fade', [['ADBE Text Opacity', 0]], qs + 'q<=0||q>=tL+0.05?100:(1-cl(q*5)*0.85)*100');
} });

/* ---- bubbles — 泡: glyphs float up inside soap bubbles, wobbling, and pop out full size when the bubbles burst */
jzReg('enter', 'bubbles', { selfHide: true, apply: function (m) {
    var L = m.L, G = eb2_geo(m, true), sz = m.size, seed = m.c.seed | 0, i, N = G.N, RD = [], PH = [];
    for (i = 0; i < N; i++) { RD.push(eb2_r(seed, i, 221)); PH.push(eb2_r(seed, i, 222) * Math.PI * 2); }
    var q = m.HD + 'var RD=' + eb2_arr(RD) + ',PH=' + eb2_arr(PH) + ',n=textTotal,o=n>1?(textIndex-1)/(n-1):0,' +
        'q=cl((P-0.45*(0.5*(RD[textIndex-1]||0)+0.5*o))/0.55),f=cl(q/0.68),ph=PH[textIndex-1]||0,tP=0.68;';
    jzAnimator(L, 'JZ In Bubble Float', [['ADBE Text Position 3D', [sz * 0.1, sz * 1.7, 0]]], q + 'q>0&&q<tP?[Math.sin(ph+f*9)*(1-f)*100,(1-oc(f))*100,0]:[0,0,0]');
    jzAnimator(L, 'JZ In Bubble Size', [['ADBE Text Scale 3D', [0, 0, 100]]], q + 'q<=0||q>=1?0:(q<tP?32:(1-(0.68+0.32*ob((q-tP)/(1-tP),2.6)))*100)');
    jzAnimator(L, 'JZ In Hide', [['ADBE Text Opacity', 0]], q + 'q<=0?100:(1-cl(q*6))*100');
    if (!eb2_main(m, G) || G.arranged || N > 40) return;
    var S = eb2_shape(m, 'JZ In Bubbles'), lw = Math.max(1.2 * m.u, sz * 0.018), H = eb2_head(m), sc = m.ctx.sc;
    var acc = eb2_pick(sc.accent, sc.fg), hi = eb2_pick(sc.fg, '#FFFFFF');
    for (i = 0; i < N; i++) {
        var g = G.g[i]; if (g.sp) continue;
        var rr = Math.max(g.w, g.h) * 0.56, o = N > 1 ? i / (N - 1) : 0;
        var QE = H + 'var q=cl((P-0.45*(0.5*' + jzN(RD[i]) + '+0.5*' + jzN(o) + '))/0.55),f=cl(q/0.68),tP=0.68,u=(q-tP)/(1-tP),' +
            'bx=' + jzN(g.cx) + '+Math.sin(' + jzN(PH[i]) + '+f*9)*' + jzN(sz * 0.1) + '*(1-f),by=' + jzN(g.cy) + '+' + jzN(sz * 1.7) + '*(1-oc(f));';
        var bg = jzGrp(S, 'bubble ' + (i + 1)), el = jzAddEllipse(bg, rr * 2, rr * 2);
        jzSetExpr(el.property('ADBE Vector Ellipse Size'), QE + 'var k=q<tP?1:1+0.6*oc(u/0.5);[' + jzN(rr * 2) + '*k,' + jzN(rr * 2) + '*k]');   // before the stroke (keeps el valid)
        var st = jzAddStroke(bg, acc, lw);
        jzSetExpr(st.property('ADBE Vector Stroke Width'), QE + 'q<tP?' + jzN(lw) + ':' + jzN(lw) + '*Math.max(0,1-u)');
        jzSetExpr(jzGX(bg).property('ADBE Vector Position'), QE + 'q<tP?[bx,by]:' + eb2_pt(g.cx, g.cy));
        jzSetExpr(jzGX(bg).property('ADBE Vector Group Opacity'), QE + 'q<=0||q>=1?0:(q<tP?cl(q*6)*85:(u<0.5?(1-u/0.5)*100:0))');
        // the highlight arc (upper left, 200..245 deg -> 80.6..93.1 % of an ellipse that starts at 12 o'clock)
        var hg = jzGrp(S, 'shine ' + (i + 1));
        jzAddEllipse(hg, rr * 1.44, rr * 1.44);
        var tp = jzAddTrimPaths(hg, null, null);
        tp.property('ADBE Vector Trim Start').setValue(80.6); tp.property('ADBE Vector Trim End').setValue(93.1);
        jzAddStroke(hg, hi, lw * 1.2);
        jzSetExpr(jzGX(hg).property('ADBE Vector Position'), QE + '[bx,by]');
        jzSetExpr(jzGX(hg).property('ADBE Vector Group Opacity'), QE + 'q>0&&q<tP?cl(q*6)*60:0');
    }
} });

/* ---- tokoroten — ところてん: the line is pushed out through a slit, glyphs squeezed thin at the slit, relaxing as they emerge */
jzReg('enter', 'tokoroten', { selfHide: true, apply: function (m) {
    var L = m.L, G = eb2_geo(m, true), r = G.rect, sz = m.size, vert = G.vert, i, U = [], HU = [];
    var U0 = vert ? r.top : r.left, U1 = vert ? r.top + r.height : r.left + r.width, slit = U0 - sz * 0.12, Lt = U1 - U0 + sz * 0.3, KX = Lt + sz;
    for (i = 0; i < G.N; i++) { U.push(vert ? G.g[i].cy : G.g[i].cx); HU.push((vert ? G.fs : G.g[i].w) / 2); }
    // squeeze factor km at the slit -> 1 at `rel` past it; dd = compressed distance travelled past the slit
    var q = m.HD + EB2_FNS + 'var U=' + eb2_arr(U) + ',HU=' + eb2_arr(HU) + ',u=U[textIndex-1]||0,hu=HU[textIndex-1]||0,sl=' + jzN(slit) + ',rel=' + jzN(sz * 2) +
        ',km=0.18,c=1-sm(0.55,1,P),off=-(1-ios(cl(P/0.9)))*' + jzN(Lt) + ',e=u+off-sl,k0=1-c*(1-km),dd=0;' +
        'if(e<=0){dd=e*k0;}else{var rr=Math.min(e,rel);dd=k0*rr+(1-k0)*rr*rr/(2*rel)+Math.max(0,e-rel);}' +
        'var k=Math.max(0.05,1-c*(1-(km+(1-km)*cl(e/rel)))),du=sl+dd-u,st=1+0.3*(1-k),hid=e+hu<0,done=off>=-0.5&&c<=0;';
    jzAnimator(L, 'JZ In Push', [['ADBE Text Position 3D', vert ? [0, KX, 0] : [KX, 0, 0]]], q + 'hid||done?0:du/' + jzN(KX) + '*100');
    jzAnimator(L, 'JZ In Squeeze', [['ADBE Text Scale 3D', vert ? [200, 0, 100] : [0, 200, 100]]], q + 'hid||done?[0,0,0]:' + (vert ? '[(st-1)*100,(1-k)*100,0]' : '[(1-k)*100,(st-1)*100,0]'));
    jzAnimator(L, 'JZ In Hide', [['ADBE Text Opacity', 0]], q + 'hid&&!done?100:0');
    var H = eb2_head(m), mg = sz * 0.3;
    if (!G.masked) {     // nothing shows before the slit
        if (vert) eb2_mask(L, r.left - mg * 4, slit, r.left + r.width + mg * 4, U1 + sz * 20, null, H + 'time>=DL+IN?1e4:0', 'JZ In Slit');
        else eb2_mask(L, slit, r.top - mg * 4, U1 + sz * 20, r.top + r.height + mg * 4, null, H + 'time>=DL+IN?1e4:0', 'JZ In Slit');
    }
    if (!eb2_prim(m, G)) return;
    var S = eb2_shape(m, 'JZ In Slit'), gr = jzGrp(S, 'slit'), t = Math.max(3 * m.u, sz * 0.07), ext = sz * 0.25;
    if (vert) jzAddRect(gr, r.width + ext * 2, t, 0, r.left + r.width / 2, slit - t / 2);
    else jzAddRect(gr, t, r.height + ext * 2, 0, slit - t / 2, r.top + r.height / 2);
    jzAddFill(gr, eb2_pick(m.ctx.sc.accent, m.ctx.sc.fg));
    jzSetExpr(jzGX(gr).property('ADBE Vector Group Opacity'), H + 'cl(P*8)*(1-sm(0.85,1,P))*100');
} });
