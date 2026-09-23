// ================================================================ pack enter part 1 (AE port of src/11p_enter.js)
// Worked example: riseMask. Per-glyph motion lives in text animators with Expression Selectors:
// the selector's amount (percent, per glyph via textIndex / textTotal) scales the animator's property value.

/* ---- riseMask — 下から出現: glyphs rise into place from under the line, left to right */
jzReg('enter', 'riseMask', { apply: function (m) {
    var L = m.L, r = jzRect(L), h = r.height;
    // stg(p, ordLR(i, n), 0.45) with a quintic ease: each glyph starts a little after the previous one
    var q = m.HD + 'var n=textTotal,o=n>1?(textIndex-1)/(n-1):0,q=cl((P-0.45*o)/0.55);';
    jzAnimator(L, 'JZ In Rise', [['ADBE Text Position 3D', [0, h * 1.15, 0]]], q + '(q<=0?1:Math.pow(1-q,5))*100');
    jzAnimator(L, 'JZ In Hide', [['ADBE Text Opacity', 0]], q + 'q<=0?100:0');
    // the "mask": clip everything below the text block while glyphs come up (opens once the entrance is over)
    var mk = jzMaskRect(L, r.left - h, r.top - h * 2, r.left + r.width + h, r.top + r.height + h * 0.08);
    mk.property('ADBE Mask Offset').expression = m.HD + 'time>DL+IN+0.05?1e4:0';   // mask expansion: gone once the entrance is over
} });

// ================================================================ shared helpers of this pack (prefix en1_)
// easing not in JZ_FNS: o2 outQuad, o4 outQuart, o5 outQuint, io3 inOutCubic, io4 inOutQuart, sm smoothstep(a, b, x)
var EN1_FNS = 'function o2(x){x=cl(x);return 1-(1-x)*(1-x);}function o4(x){x=cl(x);return 1-Math.pow(1-x,4);}function o5(x){x=cl(x);return 1-Math.pow(1-x,5);}' +
    'function io3(x){x=cl(x);return x<0.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;}function io4(x){x=cl(x);return x<0.5?8*x*x*x*x:1-Math.pow(-2*x+2,4)/2;}' +
    'function sm(a,b,x){x=cl((x-a)/(b-a));return x*x*(3-2*x);}\n';
// entrance timing of this layer (same numbers as jzHead)
function en1_T(m) { var c = m.c; return { IN: Math.max(0.02, c.inDur || 0.3), DL: (m.o.mi || 0) * (c.stagger || 0.04) }; }
// compact header for masks / helper layers: IN, DL, SZ, P + easing
function en1_head(m) { var t = en1_T(m); return 'var IN=' + jzN(t.IN) + ',DL=' + jzN(t.DL) + ',SZ=' + jzN(m.size) + ';' + JZ_FNS + EN1_FNS + 'var P=cl((time-DL)/IN);\n'; }
// per-glyph stagger inside an Expression Selector: browser stg(p, ordLR | ordC, spread) -> q
function en1_q(kind, spread) {
    var o = kind === 'C' ? 'n>1?Math.abs(textIndex-1-(n-1)/2)/((n-1)/2):0' : 'n>1?(textIndex-1)/(n-1):0';
    return 'var n=textTotal,o=' + o + ',q=cl((P-' + jzN(spread) + '*o)/' + jzN(1 - spread) + ');';
}
function en1_arr(a) { var s = []; for (var i = 0; i < a.length; i++) s.push(jzN(a[i])); return '[' + s.join(',') + ']'; }
function en1_col(hex) { var c = jzHex(hex); return '[' + jzN(c[0]) + ',' + jzN(c[1]) + ',' + jzN(c[2]) + ',1]'; }
// the browser's numeric hash J.h, so seeded directions (dirOf) match the web version
function en1_h(a, b, c, d, e) {
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
function en1_dir(m, salt) { return en1_h((m.c.seed || 0) | 0, salt, 5) / 4294967296 < 0.5 ? -1 : 1; }
function en1_isSp(ch) { return /^[\s　]$/.test(ch); }
function en1_meas(T, L, s, just) {
    var d = L.property('ADBE Text Properties').property('ADBE Text Document').value;
    d.text = s; d.justification = just;
    T.property('ADBE Text Properties').property('ADBE Text Document').setValue(d);
    var q = T.sourceRectAtTime(0, false);
    return { l: q.left, r: q.left + q.width };
}
// Geometry of the lyric in the text layer's own space (call BEFORE adding animators).
//   G.fs font size, G.lead line pitch, G.rect source rect, G.vert (one glyph per line), G.lines[{cy, x0, x1, chars}],
//   G.g[] one entry per AE character (textIndex order, spaces included): {i, li, sp, k (index among non-spaces), x0, x1, cx, cy, w, h}
//   G.W per-glyph widths, G.N = textTotal, G.arranged (layout animators / text on a path: glyphs are not at their plain places),
//   G.masked (the layout masks this layer already). measure = true measures every glyph box with a temporary text layer.
function en1_geo(m, measure) {
    var L = m.L, TP = L.property('ADBE Text Properties'), td = TP.property('ADBE Text Document').value, i, j;
    var fs = td.fontSize, lead = (!td.autoLeading && td.leading > 0) ? td.leading : fs * 1.2;
    var lines = String(td.text).split(/\r\n|\r|\n|\u0003/), nL = lines.length, r = jzRect(L);
    var G = { fs: fs, lead: lead, nL: nL, rect: r, g: [], W: [], lines: [], N: 0, vert: nL > 1, arranged: false, masked: false, K: 0 };
    try { G.arranged = TP.property('ADBE Text Animators').numProperties > 0; } catch (e0) {}
    try { if (TP.property('ADBE Text Path Options').property('ADBE Text Path').value > 0) G.arranged = true; } catch (e1) {}
    try { G.masked = L.property('ADBE Mask Parade').numProperties > 0; } catch (e2) {}
    var inkH = r.height - (nL - 1) * lead; if (!(inkH > fs * 0.3 && inkH < fs * 2)) inkH = fs * 0.9;
    var cy0 = r.top + inkH / 2, trk = (td.tracking || 0) / 1000 * fs;
    for (i = 0; i < nL; i++) { var cs0 = jzChars(lines[i]); if (cs0.length > 1) G.vert = false; G.lines.push({ chars: cs0, cy: cy0 + i * lead, x0: r.left, x1: r.left + r.width }); }
    var T = null;
    if (measure && !G.arranged && jzCount(td.text) <= 60) { try { T = m.ctx.comp.layers.addText('x'); } catch (e3) { T = null; } }
    var k = 0, LEFT = ParagraphJustification.LEFT_JUSTIFY;
    try {
        for (i = 0; i < nL; i++) {
            var ln = G.lines[i], cs = ln.chars, n = cs.length;
            if (!n) continue;
            var F = null, F0 = null, off = 0, prev = 0;
            if (T && !G.vert) {
                F = en1_meas(T, L, lines[i], td.justification); ln.x0 = F.l; ln.x1 = F.r;
                if (n > 1) { F0 = en1_meas(T, L, lines[i], LEFT); off = F.l - F0.l; }
                prev = F.l - trk;
            } else if (!G.vert) {      // not measured: monospace estimate centred like the block
                var wEst = r.width / Math.max(1, n), lx = r.left + (r.width - wEst * n) / 2;
                ln.x0 = lx; ln.x1 = lx + wEst * n; prev = lx - trk;
            }
            for (j = 0; j < n; j++) {
                var sp = en1_isSp(cs[j]), x0, x1;
                if (G.vert) { x0 = r.left; x1 = r.left + r.width; }
                else if (T) {
                    x0 = prev + trk;
                    x1 = (j === n - 1) ? F.r : off + en1_meas(T, L, cs.slice(0, j + 1).join(''), LEFT).r;
                    if (x1 < x0) x1 = x0;
                    prev = x1;
                } else { x0 = prev + trk; x1 = x0 + (r.width + trk) / Math.max(1, n) - trk; prev = x1; }
                var gi = { i: G.N, li: i, sp: sp, k: sp ? -1 : k, x0: x0, x1: x1, cx: (x0 + x1) / 2, cy: ln.cy, w: Math.max(1, x1 - x0), h: fs };
                if (G.vert) gi.w = fs;
                if (!sp) k++;
                G.g.push(gi); G.W.push(gi.w); G.N++;
                if (gi.w > G.K) G.K = gi.w;
            }
        }
    } catch (e4) { jzWarn('en1 geometry: ' + e4.toString()); }
    if (T) { try { T.remove(); } catch (e5) {} }
    if (!G.K) G.K = fs;
    return G;
}
// rect mask in the layer's space with optional opacity / expansion expressions
function en1_mask(Lx, x0, y0, x1, y1, opEx, exEx, name) {
    var mk = jzMaskRect(Lx, x0, y0, x1, y1);
    try { if (name) mk.name = name; } catch (e) {}
    if (opEx) jzSetExpr(mk.property('ADBE Mask Opacity'), opEx);
    if (exEx) jzSetExpr(mk.property('ADBE Mask Offset'), exEx);
    return mk;
}
// L keeps glyph set 0, a copy D shows set 1 while the entrance runs, so neighbouring glyphs / lines can each be clipped to
// their own boxes (one layer mask cannot tell glyphs apart). D is parented to L (follows every move of it), takes L's final
// text style by expression (the treatment is applied later) and is gone once the entrance is over.
function en1_twin(m, S, tag) {
    var L = m.L, D = L.duplicate(), t = en1_T(m), H = en1_head(m), i, mns = ['ADBE Position', 'ADBE Scale', 'ADBE Rotate Z', 'ADBE Opacity'];
    try { D.name = String(L.name).substr(0, 20) + ' ' + (tag || 'JZ In B'); } catch (e0) {}
    var tr = D.property('ADBE Transform Group');
    for (i = 0; i < mns.length; i++) { try { if (tr.property(mns[i]).expression) tr.property(mns[i]).expression = ''; } catch (e1) {} }
    D.parent = L;
    tr.property('ADBE Scale').setValue([100, 100]); tr.property('ADBE Rotate Z').setValue(0);
    jzSetExpr(tr.property('ADBE Position'), 'parent.transform.anchorPoint');
    jzSetExpr(tr.property('ADBE Opacity'), H + 'time>=DL&&time<DL+IN?value:0');
    try { D.property('ADBE Text Properties').property('ADBE Text Document').expression = 'parent.text.sourceText.style'; } catch (e2) {}
    try { D.outPoint = Math.max(D.inPoint + 0.05, Math.min(D.outPoint, t.DL + t.IN + 0.1)); } catch (e3) {}
    if (!S) return D;            // both layers show every glyph (they get different masks)
    var arr = en1_arr(S);
    jzAnimator(L, 'JZ In Set A', [['ADBE Text Opacity', 0]], H + 'var S=' + arr + ';S[textIndex-1]==1&&time<DL+IN?100:0');
    jzAnimator(D, 'JZ In Set B', [['ADBE Text Opacity', 0]], 'var S=' + arr + ';S[textIndex-1]==1?0:100');
    return D;
}
// helper shape layer drawn in the text layer's own space (parented to it, right above it), only during the entrance.
// Helpers the browser draws with ghost off (accent bars / rings / blocks) are marked jzNoGhost where they are made; the flipX
// tiles are the glyphs' own backs (ghosted like the lyric) and stay in the ghosts.
function en1_shape(m, name) {
    var L = m.L, S = jzShapeLayer(m.ctx, name, 0, 0), t = en1_T(m);
    try { S.moveBefore(L); } catch (e0) {}
    S.parent = L;
    var tr = S.property('ADBE Transform Group');
    tr.property('ADBE Anchor Point').setValue([0, 0]); tr.property('ADBE Position').setValue([0, 0]);
    tr.property('ADBE Scale').setValue([100, 100]); tr.property('ADBE Rotate Z').setValue(0);
    try { S.outPoint = Math.max(S.inPoint + 0.05, Math.min(S.outPoint, t.DL + t.IN + 0.1)); } catch (e1) {}
    return S;
}
// one band mask per line (glyphs move vertically). set -1 = every line, 0 / 1 = lines of that parity.
// The first mask of the lyric layer itself opens completely once the entrance is over.
function en1_bands(m, Lx, G, set, pad, first) {
    var i, n = 0, H = en1_head(m), x0 = G.rect.left - G.fs, x1 = G.rect.left + G.rect.width + G.fs;
    for (i = 0; i < G.nL; i++) {
        if (!G.lines[i].chars.length || (set >= 0 && i % 2 !== set)) continue;
        en1_mask(Lx, x0, G.lines[i].cy - pad, x1, G.lines[i].cy + pad, null, (first && !n) ? H + 'time>=DL+IN?1e4:0' : null, 'JZ In Line ' + (i + 1));
        n++;
    }
}
// one box mask per glyph (glyphs move sideways), switched on when its glyph starts (browser stg order LR, spread).
// set -1 = every glyph, 0 / 1 = glyphs of that parity (S). padX in glyph widths, padY in px.
function en1_boxes(m, Lx, G, S, set, padX, padY, spread, first) {
    var i, n = 0, H = en1_head(m);
    for (i = 0; i < G.N; i++) {
        var g = G.g[i]; if (g.sp || (set >= 0 && S[i] !== set)) continue;
        var o = G.N > 1 ? i / (G.N - 1) : 0;
        var op = H + 'cl((P-' + jzN(spread * o) + ')/' + jzN(1 - spread) + ')>0?100:0';
        en1_mask(Lx, g.x0 - padX * g.w, g.cy - padY, g.x1 + padX * g.w, g.cy + padY, op, (first && !n) ? H + 'time>=DL+IN?1e4:0' : null, 'JZ In Box ' + (i + 1));
        n++;
    }
}
// glyph sets: alternate glyphs (by position among non-spaces) or alternate lines
function en1_setGlyph(G) { var s = [], i; for (i = 0; i < G.N; i++) s.push(G.g[i].sp ? 0 : G.g[i].k % 2); return s; }
function en1_setLine(G) { var s = [], i; for (i = 0; i < G.N; i++) s.push(G.g[i].li % 2); return s; }
function en1_maxRow(G) { var b = 0, i, c; for (i = 0; i < G.nL; i++) { c = 0; for (var j = 0; j < G.lines[i].chars.length; j++) if (!en1_isSp(G.lines[i].chars[j])) c++; if (c > b) b = c; } return b; }
// helper layers (twins / tiles / bars) are skipped for very long lines, for one-glyph-per-layer layouts of long lyrics
// (decided per cut so every glyph of the cut is built the same way) and when the comp is already crowded
function en1_crowded(m, G) {
    if (G && (G.N > 60 || (G.N <= 1 && jzCount(m.c.text || '') > 14))) return true;
    try { return m.ctx.comp.numLayers > 60; } catch (e) { return false; }
}
// add a stroke to the text document (width 0, animated by a Stroke Width animator) when it has none; returns true if added
var EN1_OWNSTROKE = 'var s0=0;try{s0=text.sourceText.style.strokeWidth;}catch(err){}';   // > 0.5: a treatment gave the text its own stroke
function en1_addStroke(L) {
    var td = L.property('ADBE Text Properties').property('ADBE Text Document').value;
    if (td.applyStroke && td.strokeWidth > 0) return false;
    jzTextDoc(L, function (d) {
        d.applyStroke = true; d.strokeWidth = 0;
        try { d.strokeColor = d.applyFill ? d.fillColor : d.strokeColor; } catch (e) {}
        try { d.strokeOverFill = false; } catch (e2) {}
    });
    return true;
}

/* ---- dropMask — 上から出現: glyphs drop into place from the top of their own line box, left to right, with a little overshoot */
jzReg('enter', 'dropMask', { apply: function (m) {
    var L = m.L, G = en1_geo(m, false), fs = G.fs, q = m.HD + EN1_FNS + en1_q('LR', 0.45);
    var soft = G.arranged || G.masked || (G.nL > 1 && en1_crowded(m, G));   // no clean clip possible: glyphs fade in instead of being clipped
    jzAnimator(L, 'JZ In Drop', [['ADBE Text Position 3D', [0, -fs * 1.15, 0]]], q + '(q<=0?1:1-ob(q,1.35))*100');
    jzAnimator(L, 'JZ In Hide', [['ADBE Text Opacity', 0]], q + (soft ? 'q<=0?100:100*(1-cl((1.1-1.15*(1-ob(q,1.35)))/0.88))' : 'q<=0?100:0'));
    if (soft) return;
    // each line is clipped to its own band; alternate lines go to a linked copy so a glyph coming down never shows over the line above
    var D = G.nL > 1 ? en1_twin(m, en1_setLine(G)) : null;
    en1_bands(m, L, G, D ? 0 : -1, fs * 0.66, true);
    if (D) en1_bands(m, D, G, 1, fs * 0.66, false);
} });

/* ---- slideL — 左からスライド: glyphs slide in from the left and fade up, staggered left to right */
jzReg('enter', 'slideL', { apply: function (m) {
    var q = m.HD + EN1_FNS + en1_q('LR', 0.5);
    jzAnimator(m.L, 'JZ In Slide', [['ADBE Text Position 3D', [-m.size * 0.85, 0, 0]]], q + '(q<=0?1:1-o5(q))*100');
    jzAnimator(m.L, 'JZ In Fade', [['ADBE Text Opacity', 0]], q + 'q<=0?100:(1-Math.pow(cl(q*1.6),1.6))*100');
} });

/* ---- slideR — 右からスライド: every glyph slides in from the right inside its own box */
jzReg('enter', 'slideR', { apply: function (m) {
    var L = m.L, G = en1_geo(m, true), K = G.K * 1.25;
    var q = m.HD + EN1_FNS + en1_q('LR', 0.45) + 'var W=' + en1_arr(G.W) + ',w=W[textIndex-1]||SZ;';
    var soft = G.arranged || G.masked || G.N > 60 || (en1_maxRow(G) > 1 && en1_crowded(m, G));
    jzAnimator(L, 'JZ In Slide', [['ADBE Text Position 3D', [K, 0, 0]]], q + '(q<=0?1:1-o5(q))*1.2*w/' + jzN(K) + '*100');
    jzAnimator(L, 'JZ In Hide', [['ADBE Text Opacity', 0]], q + (soft ? 'q<=0?100:100*(1-cl(1.12-1.2*(1-o5(q))))' : 'q<=0?100:0'));
    if (soft) return;
    // per-glyph box masks; neighbours within a line alternate between L and a linked copy so a glyph's box never shows the one before it
    var S = en1_setGlyph(G), D = en1_maxRow(G) > 1 ? en1_twin(m, S) : null, pY = G.vert ? Math.max(G.lead, G.fs) * 0.5 : G.fs * 0.66;
    en1_boxes(m, L, G, S, D ? 0 : -1, 0.12, pY, 0.45, true);
    if (D) en1_boxes(m, D, G, S, 1, 0.12, pY, 0.45, false);
} });

/* ---- slideWhole — 全体スライド: the whole line slides in along its reading direction with an overshoot */
jzReg('enter', 'slideWhole', { apply: function (m) {
    var n = 1, dir = en1_dir(m, 11), vert = false;
    try {
        var tx = String(m.L.property('ADBE Text Properties').property('ADBE Text Document').value.text), lines = tx.split(/\r\n|\r|\n/);
        n = jzCount(tx); vert = lines.length > 1; for (var i = 0; i < lines.length; i++) if (jzChars(lines[i]).length > 1) vert = false;
    } catch (e) {}
    var sc = jzXf(m.L, 'ADBE Scale').value, k = Math.abs((vert ? sc[1] : sc[0]) / 100) || 1;
    var D = m.size * k * (n <= 1 ? 1.3 : 3.2) * (0.7 + 0.6 * m.ctx.fx.motion) * dir;
    m.parts.pos.push('var e1=ob(P,1.7);d=[d[0]+' + (vert ? '0' : jzN(D) + '*(1-e1)') + ',d[1]+' + (vert ? jzN(D) + '*(1-e1)' : '0') + '];');
    m.parts.op.push('f*=cl(P*4);');
} });

/* ---- flipX — 縦軸フリップ: an accent tile pops up and turns over around the vertical axis to reveal each glyph */
jzReg('enter', 'flipX', { apply: function (m) {
    var L = m.L, G = en1_geo(m, true), sc = m.ctx.sc, col = jzTextColor(L), bg = sc.bg || '#000000', i;
    var back = (String(col).toUpperCase() === String(sc.accent || '').toUpperCase()) ? (sc.accent2 || sc.fg) : (sc.accent || sc.fg);
    var th = 'var pop=ob(q/0.22,1.6),th=(1-ob((q-0.22)/0.78,1.25))*Math.PI,c=Math.cos(th),sh=Math.abs(Math.sin(th));';
    var q = m.HD + EN1_FNS + en1_q('LR', 0.45) + th;
    jzAnimator(L, 'JZ In Flip', [['ADBE Text Scale 3D', [0, 100, 100]]], q + 'q<=0||q>=1||c<0?[0,0,0]:[(1-Math.max(0.04,c))*100,0,0]');
    jzAnimator(L, 'JZ In Shade', [['ADBE Text Fill Color', jzHex(bg)]], q + 'q<=0||q>=1?0:Math.min(0.5,sh*0.5)*100');
    jzAnimator(L, 'JZ In Hide', [['ADBE Text Opacity', 0]], q + 'q<=0||(q<1&&c<0)?100:0');
    if (G.arranged || en1_crowded(m, G)) return;
    // the tile side: one square per glyph on a helper shape layer in the text's own space
    var S = en1_shape(m, 'JZ In Tiles'), H = en1_head(m), ts = G.fs * 0.84, cB = jzHex(back), cG = jzHex(bg);
    for (i = 0; i < G.N; i++) {
        var g = G.g[i]; if (g.sp) continue;
        var o = G.N > 1 ? i / (G.N - 1) : 0, hq = H + 'var q=cl((P-' + jzN(0.45 * o) + ')/0.55);' + th;
        var grp = jzGrp(S, 'tile ' + (i + 1));
        jzAddRect(grp, ts, ts, 0);
        var f = jzAddFill(grp, back), gx = jzGX(grp);
        gx.property('ADBE Vector Position').setValue([g.cx, g.cy]);
        jzSetExpr(gx.property('ADBE Vector Scale'), hq + 'var s=1.02*pop*100;[Math.max(0.04,-c)*s,s]');
        jzSetExpr(gx.property('ADBE Vector Group Opacity'), hq + 'q>0&&q<1&&c<0?cl(q*8)*100:0');
        jzSetExpr(f.property('ADBE Vector Fill Color'), hq + 'var k=sh*0.35,a=' + en1_col(back) + ',b=' + en1_col(bg) + ';[a[0]+(b[0]-a[0])*k,a[1]+(b[1]-a[1])*k,a[2]+(b[2]-a[2])*k,1]');
    }
} });

/* ---- flipY — 横軸フリップ: three-quarter tumble around the horizontal axis (shows the mirrored back once), centre glyphs first */
jzReg('enter', 'flipY', { apply: function (m) {
    var bg = m.ctx.sc.bg || '#000000';
    var q = m.HD + EN1_FNS + en1_q('C', 0.4) + 'var th=(1-o4(q))*1.5*Math.PI,c=Math.cos(th);if(Math.abs(c)<0.04)c=c<0?-0.04:0.04;';
    jzAnimator(m.L, 'JZ In Tumble', [['ADBE Text Scale 3D', [100, -100, 100]]], q + 'q<=0||q>=1?[0,0,0]:[0,(1-c)/2*100,0]');
    jzAnimator(m.L, 'JZ In Shade', [['ADBE Text Fill Color', jzHex(bg)]], q + 'q<=0||q>=1?0:Math.min(0.75,Math.abs(Math.sin(th))*0.6+(c<0?0.2:0))*100');
    jzAnimator(m.L, 'JZ In Hide', [['ADBE Text Opacity', 0]], q + 'q<=0?100:(1-cl(q*3))*100');
} });

/* ---- domino — ドミノ: each glyph lies on its right side and swings upright around its bottom-right corner, left to right */
jzReg('enter', 'domino', { apply: function (m) {
    var L = m.L, G = en1_geo(m, true), K = Math.max(G.K, G.fs) * 1.6, hh = G.fs / 2;
    var q = m.HD + EN1_FNS + en1_q('LR', 0.55) + 'var W=' + en1_arr(G.W) + ',hw=(W[textIndex-1]||SZ)/2,hhv=' + jzN(hh) + ';' +
        'var th=(1-ob(q,1.5))*Math.PI/2,c=Math.cos(th),s=Math.sin(th),vx=-hw,vy=-hhv;';
    jzAnimator(L, 'JZ In Domino', [['ADBE Text Rotation', 90]], q + 'q<=0||q>=1?0:(1-ob(q,1.5))*100');
    jzAnimator(L, 'JZ In Pivot', [['ADBE Text Position 3D', [K, K, 0]]], q + 'q<=0||q>=1?[0,0,0]:[(c*vx-s*vy-vx)/' + jzN(K) + '*100,(s*vx+c*vy-vy)/' + jzN(K) + '*100,0]');
    jzAnimator(L, 'JZ In Hide', [['ADBE Text Opacity', 0]], q + 'q<=0?100:(1-cl(q*4))*100');
} });

/* ---- fold — 折り開き: accordion — glyphs unfold vertically, alternately from their top and bottom edge */
jzReg('enter', 'fold', { apply: function (m) {
    var L = m.L, fs = m.size, bg = m.ctx.sc.bg || '#000000';
    var q = m.HD + EN1_FNS + en1_q('LR', 0.5) + 'var sy=Math.max(0.02,ob(q,1.6));';
    jzAnimator(L, 'JZ In Fold', [['ADBE Text Scale 3D', [100, 0, 100]]], q + 'q<=0||q>=1?[0,0,0]:[0,(1-sy)*100,0]');
    jzAnimator(L, 'JZ In Hinge', [['ADBE Text Position 3D', [0, fs, 0]]], q + 'q<=0||q>=1?[0,0,0]:[0,((textIndex-1)%2?1:-1)*(1-sy)*50,0]');
    jzAnimator(L, 'JZ In Shade', [['ADBE Text Fill Color', jzHex(bg)]], q + 'q<=0||q>=1?0:cl(1-sy)*60');
    jzAnimator(L, 'JZ In Hide', [['ADBE Text Opacity', 0]], q + 'q<=0?100:(1-cl(q*4))*100');
} });

/* ---- unroll — 巻き開き: each glyph unrolls from its leading edge like a scroll, an accent roll-bar riding the open edge */
jzReg('enter', 'unroll', { apply: function (m) {
    var L = m.L, G = en1_geo(m, true), vert = G.vert, K = Math.max(G.K, G.fs), i;
    // browser: width k = 0.3..1 (outCubic) and a clip that opens from the leading edge -> here: one squash k*open
    var ev = 'var e=oc(q),k=0.3+0.7*e,r=-0.62+1.24*e,s=k*cl(0.5+r);';
    var q = m.HD + EN1_FNS + en1_q('LR', 0.5) + ev + 'var W=' + en1_arr(G.W) + ',w=W[textIndex-1]||SZ;';
    if (vert) {
        jzAnimator(L, 'JZ In Unroll', [['ADBE Text Scale 3D', [100, 0, 100]]], q + 'q<=0||q>=1?[0,0,0]:[0,(1-s)*100,0]');
        jzAnimator(L, 'JZ In Edge', [['ADBE Text Position 3D', [0, K, 0]]], q + 'q<=0||q>=1?[0,0,0]:[0,-(1-s)*' + jzN(G.fs / 2) + '/' + jzN(K) + '*100,0]');
    } else {
        jzAnimator(L, 'JZ In Unroll', [['ADBE Text Scale 3D', [0, 100, 100]]], q + 'q<=0||q>=1?[0,0,0]:[(1-s)*100,0,0]');
        jzAnimator(L, 'JZ In Edge', [['ADBE Text Position 3D', [K, 0, 0]]], q + 'q<=0||q>=1?[0,0,0]:[-(1-s)*w/2/' + jzN(K) + '*100,0,0]');
    }
    jzAnimator(L, 'JZ In Hide', [['ADBE Text Opacity', 0]], q + 'q<=0?100:0');
    if (G.arranged || en1_crowded(m, G)) return;
    // the roll bars (accent), one per glyph, at the open edge
    var S = jzNoGhost(en1_shape(m, 'JZ In Roll')), H = en1_head(m), t = Math.max(1.5 * m.u, G.fs * 0.028), acc = m.ctx.sc.accent || '#ffffff';
    for (i = 0; i < G.N; i++) {
        var g = G.g[i]; if (g.sp) continue;
        var o = G.N > 1 ? i / (G.N - 1) : 0, hq = H + 'var q=cl((P-' + jzN(0.5 * o) + ')/0.5);' + ev;
        var grp = jzGrp(S, 'roll ' + (i + 1)), gx = jzGX(grp);
        if (vert) { jzAddRect(grp, G.fs * 1.12, t, 0); jzSetExpr(gx.property('ADBE Vector Position'), hq + '[' + jzN(g.cx) + ',' + jzN(g.cy - G.fs / 2) + '+k*(0.5+r)*' + jzN(G.fs) + ']'); }
        else { jzAddRect(grp, t, G.fs * 1.12, 0); jzSetExpr(gx.property('ADBE Vector Position'), hq + '[' + jzN(g.cx - g.w / 2) + '+k*(0.5+r)*' + jzN(g.w) + ',' + jzN(g.cy) + ']'); }
        jzAddFill(grp, acc);
        jzSetExpr(gx.property('ADBE Vector Group Opacity'), hq + 'q>0&&q<1?Math.pow(1-e,0.6)*100:0');
    }
} });

/* ---- strokeDraw — 線画から塗り: outlines draw in everywhere at once (growing dashes), then the fill comes up and the line thins */
jzReg('enter', 'strokeDraw', { apply: function (m) {
    var L = m.L, fs = m.size;
    var added = en1_addStroke(L);
    if (added) jzAnimator(L, 'JZ In Line', [['ADBE Text Stroke Width', Math.max(0.6, fs * 0.032)]], m.HD + EN1_FNS + EN1_OWNSTROKE + 's0>0.5?0:(1-sm(0.55,0.86,P))*100');
    jzAnimator(L, 'JZ In Fill', [['ADBE Text Fill Opacity', 0]], m.HD + EN1_FNS + '(1-sm(0.42,0.9,P))*100');
    // the outlines draw themselves everywhere at once (browser: a growing dash on every contour) -> fine diagonal blinds
    // whose gaps close with the same outQuad timing, so each stroke shows as growing dashes until it is complete
    var vb = jzEffect(L, 'ADBE Venetian Blinds', 'JZ In Draw');
    jzEP(vb, 2, 35); jzEP(vb, 3, Math.max(3, fs * 0.2)); jzEP(vb, 4, 0);
    jzEX(vb, 1, m.HD + EN1_FNS + '(1-o2(P/0.62))*100');
} });

/* ---- outlineFill — 輪郭→塗り: glyphs arrive as outlines (settling from 130%), then fill in and the outline melts away, left to right */
jzReg('enter', 'outlineFill', { apply: function (m) {
    var L = m.L, td = L.property('ADBE Text Properties').property('ADBE Text Document').value, fs = td.fontSize;
    var hasFill = td.applyFill !== false, q = m.HD + EN1_FNS + en1_q('LR', 0.4);
    jzAnimator(L, 'JZ In Settle', [['ADBE Text Scale 3D', [130, 130, 100]]], q + 'q<=0||q>=1?0:(1-o5(q/0.35))*100');
    jzAnimator(L, 'JZ In Hide', [['ADBE Text Opacity', 0]], q + 'q<=0?100:(1-cl(q*5))*100');
    if (!hasFill) return;
    if (en1_addStroke(L)) jzAnimator(L, 'JZ In Outline', [['ADBE Text Stroke Width', Math.max(1.2 * m.u, fs * 0.028)]], q + EN1_OWNSTROKE + 'q<=0||q>=1||s0>0.5?0:(1-sm(0.68,0.9,q))*100');
    jzAnimator(L, 'JZ In Fill', [['ADBE Text Fill Opacity', 0]], q + 'q>=1?0:(1-io4((q-0.3)/0.55))*100');
} });

/* ---- splitJoin — 上下合体: the top and bottom halves of every glyph slide in from opposite sides and join */
jzReg('enter', 'splitJoin', { apply: function (m) {
    var L = m.L, G = en1_geo(m, true), vert = G.vert, dir = en1_dir(m, 13), K = Math.max(G.K, G.fs) * 1.2, i;
    var q = m.HD + EN1_FNS + en1_q('LR', 0.4) + 'var W=' + en1_arr(G.W) + ',w=' + (vert ? jzN(G.fs) : 'W[textIndex-1]||SZ') + ',f=1.1*(1-o5(q));';
    var soft = G.arranged || G.masked || en1_crowded(m, G);
    var mv = function (Lx, sgn) {      // sgn -1 = top (vertical text: right) half, +1 = the other half
        var sv = jzN(sgn * dir);
        jzAnimator(Lx, 'JZ In Half', [['ADBE Text Position 3D', [vert ? 0 : K, vert ? K : 0, 0]]], q + 'var v=q<=0||q>=1?0:' + sv + '*f*w/' + jzN(K) + '*100;' + (vert ? '[0,v,0]' : '[v,0,0]'));
    };
    jzAnimator(L, 'JZ In Hide', [['ADBE Text Opacity', 0]], q + (soft ? 'q<=0?100:100*(1-cl(1.12-f))' : 'q<=0?100:100*(1-cl((1.12-f)*2))'));
    if (soft) { mv(L, -1); return; }
    var D = en1_twin(m, null, 'JZ In Half B');
    mv(L, -1); mv(D, 1);
    // L keeps the top halves (vertical: right halves), the copy the other halves: one mask per line / column
    var pad = G.fs * 0.66, r = G.rect, H = en1_head(m), n = 0;
    if (vert) {
        var xc = r.left + r.width / 2, y0 = r.top - G.fs, y1 = r.top + r.height + G.fs;
        en1_mask(L, xc, y0, r.left + r.width + G.fs, y1, null, H + 'time>=DL+IN?1e4:0', 'JZ In Half');
        en1_mask(D, r.left - G.fs, y0, xc + 0.004 * G.fs, y1, null, null, 'JZ In Half');
    } else {
        for (i = 0; i < G.nL; i++) {
            var ln = G.lines[i]; if (!ln.chars.length) continue;
            var x0 = r.left - G.fs * 1.5, x1 = r.left + r.width + G.fs * 1.5;
            en1_mask(L, x0, ln.cy - pad, x1, ln.cy + 0.004 * G.fs, null, !n ? H + 'time>=DL+IN?1e4:0' : null, 'JZ In Top ' + (i + 1));
            en1_mask(D, x0, ln.cy, x1, ln.cy + pad, null, null, 'JZ In Bottom ' + (i + 1));
            n++;
        }
    }
} });

/* ---- vSlice — 縦スライス: the line is cut into vertical strips that slide in alternately from above and below */
jzReg('enter', 'vSlice', { apply: function (m) {
    var r = jzRect(m.L), fs = m.size, span = r.width + fs * 0.6;
    var n = jzClamp(Math.round(span / (fs * 0.55)), 4, 8), dist = r.height * 0.9 + fs * 1.4;
    // square Wave Warp = strips of alternating vertical offset (one strip = half a wave)
    var ww = jzEffect(m.L, 'ADBE Wave Warp', 'JZ In VSlice');
    jzEP(ww, 1, 2); jzEP(ww, 3, span / n * 2); jzEP(ww, 4, 90); jzEP(ww, 5, 0); jzEP(ww, 6, 1); jzEP(ww, 7, 0);
    // browser: centre strips first (ordC stagger over half the entrance); one Wave Warp moves all strips by their mean offset
    jzEX(ww, 2, m.HD + 'var N=' + n + ',s=0;for(var i=0;i<N;i++){var o=Math.abs(i-(N-1)/2)/((N-1)/2);s+=Math.pow(1-cl((P-0.5*o)/0.5),5);}' + jzN(dist) + '*s/N');
    m.parts.op.push('f*=cl(P*3);');
} });

/* ---- shutter — シャッター: two accent lines grow from the centre, then part like a shutter and reveal the line between them */
jzReg('enter', 'shutter', { apply: function (m) {
    var L = m.L, G = en1_geo(m, false), r = G.rect, fs = G.fs, vert = G.vert, mg = fs * 0.2, H = en1_head(m);
    var cx = r.left + r.width / 2, cy = r.top + r.height / 2, w = r.width, h = r.height, t = Math.max(2 * m.u, fs * 0.03);
    var ev = 'var grow=o5(P/0.32),open=io4((P-0.18)/0.82),hhv=' + jzN((vert ? w : h) / 2 + mg) + '*open;';
    if (!G.masked) {
        var mk = vert ? en1_mask(L, cx - 0.25, r.top - mg, cx + 0.25, r.top + h + mg, null, null, 'JZ In Shutter') : en1_mask(L, r.left - mg, cy - 0.25, r.left + w + mg, cy + 0.25, null, null, 'JZ In Shutter');
        jzSetExpr(mk.property('ADBE Mask Opacity'), H + ev + 'open>0?100:0');
        jzSetExpr(mk.property('ADBE Mask Offset'), H + ev + 'time>=DL+IN?1e4:hhv');
    }
    if (G.arranged || en1_crowded(m, G)) return;
    var S = jzNoGhost(en1_shape(m, 'JZ In Shutter')), acc = m.ctx.sc.accent || '#ffffff', len = (vert ? h : w) + mg * 2, k;
    for (k = 0; k < 2; k++) {
        var grp = jzGrp(S, k ? 'line B' : 'line A'), rc = jzAddRect(grp, 10, 10, 0), gx = jzGX(grp), sg = k ? '+' : '-';
        jzAddFill(grp, acc);
        jzSetExpr(rc.property('ADBE Vector Rect Size'), H + ev + (vert ? '[' + jzN(t) + ',' + jzN(len) + '*grow]' : '[' + jzN(len) + '*grow,' + jzN(t) + ']'));
        jzSetExpr(gx.property('ADBE Vector Position'), H + ev + (vert ? '[' + jzN(cx) + sg + 'hh,' + jzN(cy) + ']' : '[' + jzN(cx) + ',' + jzN(cy) + sg + 'hh]'));
        jzSetExpr(gx.property('ADBE Vector Group Opacity'), H + ev + (k ? '(open>0?1:0)*' : '') + '(1-sm(0.6,0.9,P))*100');
    }
} });

/* ---- iris — アイリス: a circular iris opens from the centre with an accent ring on its edge while the line settles from 114% */
jzReg('enter', 'iris', { apply: function (m) {
    var L = m.L, G = en1_geo(m, false), r = G.rect, fs = G.fs, H = en1_head(m);
    var cx = r.left + r.width / 2, cy = r.top + r.height / 2, R = Math.sqrt(r.width * r.width + r.height * r.height) / 2 + fs * 0.25;
    m.parts.sc.push('var s1=1.14-0.14*(1-Math.pow(1-P,4));f=[f[0]*s1,f[1]*s1];');
    var ev = 'var e=o4(P),rad=' + jzN(R) + '*e;';
    if (!G.masked) {
        // a tiny circle grown by mask expansion (exact circle in AE)
        var mk = L.property('ADBE Mask Parade').addProperty('ADBE Mask Atom'), sh = new Shape(), r0 = 1, kk = r0 * 0.5523;
        sh.vertices = [[cx, cy - r0], [cx + r0, cy], [cx, cy + r0], [cx - r0, cy]];
        sh.inTangents = [[-kk, 0], [0, -kk], [kk, 0], [0, kk]]; sh.outTangents = [[kk, 0], [0, kk], [-kk, 0], [0, -kk]]; sh.closed = true;
        mk.property('ADBE Mask Shape').setValue(sh);
        try { mk.name = 'JZ In Iris'; } catch (e0) {}
        jzSetExpr(mk.property('ADBE Mask Opacity'), H + ev + 'rad>0.5?100:0');
        jzSetExpr(mk.property('ADBE Mask Offset'), H + ev + 'time>=DL+IN?1e4:Math.max(0,rad-' + jzN(r0) + ')');
    }
    if (G.arranged || en1_crowded(m, G)) return;
    var S = jzNoGhost(en1_shape(m, 'JZ In Iris')), grp = jzGrp(S, 'ring'), el = jzAddEllipse(grp, 10, 10), gx = jzGX(grp);
    jzAddStroke(grp, m.ctx.sc.accent || '#ffffff', Math.max(2 * m.u, fs * 0.03));
    gx.property('ADBE Vector Position').setValue([cx, cy]);
    jzSetExpr(el.property('ADBE Vector Ellipse Size'), H + ev + '[rad*2,rad*2]');
    jzSetExpr(gx.property('ADBE Vector Group Opacity'), H + ev + 'rad>0.5?(1-sm(0.3,0.8,P))*100:0');
} });

/* ---- diagWipe — 斜めワイプ: a slanted accent block sweeps over the line, then retracts and leaves the text behind it */
jzReg('enter', 'diagWipe', { apply: function (m) {
    var L = m.L, G = en1_geo(m, false), r = G.rect, fs = G.fs, vert = G.vert, dir = en1_dir(m, 17), kS = 0.5, H = en1_head(m);
    // (u, v): u along the reading direction, v across it
    var U0 = vert ? r.top : r.left, U1 = U0 + (vert ? r.height : r.width), V0 = vert ? r.left : r.top, V1 = V0 + (vert ? r.width : r.height);
    var mg = fs * 0.16, hv = (V1 - V0) / 2 + mg, half = (U1 - U0) / 2 + mg + kS * hv, uc = (U0 + U1) / 2, vc = (V0 + V1) / 2, big = Math.max(m.W, m.H) * 4;
    var ev = 'var eL=o4(P/0.5),eT=io3((P-0.18)/0.74),hf=' + jzN(half) + ',Lx=-hf+2*hf*eL,Tx=-hf+2*hf*eT;';
    if (!G.masked) {
        // text visible behind the block's trailing edge: an axis-aligned rect whose front edge (at the slant's front-most point) moves by expansion
        var f0 = -half + kS * hv, a0, a1;
        if (dir > 0) { a0 = uc - big; a1 = uc + f0; } else { a0 = uc - f0; a1 = uc + big; }
        var mk = vert ? en1_mask(L, vc - hv, a0, vc + hv, a1, null, null, 'JZ In Diag') : en1_mask(L, a0, vc - hv, a1, vc + hv, null, null, 'JZ In Diag');
        jzSetExpr(mk.property('ADBE Mask Offset'), H + ev + 'time>=DL+IN?1e4:Tx+hf');
    }
    if (G.arranged || en1_crowded(m, G)) return;
    var S = jzNoGhost(en1_shape(m, 'JZ In Diag')), grp = jzGrp(S, 'block'), rc = jzAddRect(grp, 10, 10, 0), gx = jzGX(grp), sk = Math.atan(kS) * 180 / Math.PI;
    jzAddFill(grp, m.ctx.sc.accent || '#ffffff');
    if (vert) { gx.property('ADBE Vector Skew Axis').setValue(90); gx.property('ADBE Vector Skew').setValue(dir * sk); }
    else gx.property('ADBE Vector Skew').setValue(-dir * sk);
    jzSetExpr(rc.property('ADBE Vector Rect Size'), H + ev + 'var ln=Math.max(0,Lx-Tx);' + (vert ? '[' + jzN(hv * 2) + ',ln]' : '[ln,' + jzN(hv * 2) + ']'));
    jzSetExpr(gx.property('ADBE Vector Position'), H + ev + 'var u=' + jzN(uc) + '+' + dir + '*(Lx+Tx)/2;' + (vert ? '[' + jzN(vc) + ',u]' : '[u,' + jzN(vc) + ']'));
    jzSetExpr(gx.property('ADBE Vector Group Opacity'), H + ev + 'Lx-Tx>=0.5?100:0');
} });

/* ---- blinds — ブラインド: thin blinds open one after another along the line (top to bottom; vertical text right to left) */
jzReg('enter', 'blinds', { apply: function (m) {
    var L = m.L, G = en1_geo(m, false), r = G.rect, fs = G.fs, vert = G.vert, mg = fs * 0.2, H = en1_head(m), k;
    if (G.masked) { jzAnimator(L, 'JZ In Fade', [['ADBE Text Opacity', 0]], m.HD + '(1-P)*100'); return; }
    var V0 = (vert ? r.left : r.top) - mg, V1 = (vert ? r.left + r.width : r.top + r.height) + mg, U0 = (vert ? r.top : r.left) - mg, U1 = (vert ? r.top + r.height : r.left + r.width) + mg;
    var pitch = Math.max(fs * 0.2, (V1 - V0) / 40), N = Math.max(1, Math.ceil((V1 - V0) / pitch));
    for (k = 0; k < N; k++) {
        var ord = N > 1 ? (vert ? N - 1 - k : k) / (N - 1) : 0, c = V0 + (k + 0.5) * pitch;
        var ev = 'var e=o4((P-' + jzN(0.55 * ord) + ')/0.45);';
        var mk = vert ? en1_mask(L, c - 0.25, U0, c + 0.25, U1, null, null, 'JZ In Blind ' + (k + 1)) : en1_mask(L, U0, c - 0.25, U1, c + 0.25, null, null, 'JZ In Blind ' + (k + 1));
        jzSetExpr(mk.property('ADBE Mask Opacity'), H + ev + 'e>0?100:0');
        jzSetExpr(mk.property('ADBE Mask Offset'), H + ev + (k ? '' : 'time>=DL+IN?1e4:') + jzN(pitch * 0.5) + '*e+0.15');
    }
} });
