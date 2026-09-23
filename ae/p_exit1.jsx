// ================================================================ pack exit part 1 (AE port of src/11p_exit.js, pack exitHold)
// sinkMask riseOut slideOutL slideOutR flipOutX flipOutY foldOut squash trackOutWide collapse zoomThrough zoomFar spinOut
// twist waveOut blurOutStagger undraw outlineOut irisClose diagWipeOut blindsClose checkerOut
// Exits run on the exit progress PO (0 at the cut's exit start OS, 1 at the cut's end; everything is gone at PO = 1).
// Per-glyph motion = text animators with Expression Selectors (browser win(p, ord, spread) -> q). Clips = layer masks in the
// text layer's own space that stay fully open (expansion 1e4) until the exit starts; the first exit mask INTERSECTs with masks
// the layout / entrance already put on the layer. Copies (the top halves of foldOut, the outline of outlineOut, the echo trails
// of the zooms) are duplicates of the lyric layer parented to it that only show during the exit. Helper graphics (iris ring,
// CRT dot, wipe bar) are shape layers parented to the text layer (placed above it, never between it and its track matte).

// ---------------------------------------------------------------- shared helpers (ex1_*)
// easings not in JZ_FNS: io3 inOutCubic, ios inOutSine, sm smoothstep(a, b, x)
var EX1_FNS = 'function io3(x){x=cl(x);return x<0.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;}function ios(x){x=cl(x);return -(Math.cos(Math.PI*x)-1)/2;}' +
    'function sm(a,b,x){x=cl((x-a)/(b-a));return x*x*(3-2*x);}\n';
var EX1_OWNSTROKE = 'var s0=0;try{s0=text.sourceText.style.strokeWidth;}catch(err){}';   // > 0.5: a treatment gave the text its own stroke
function ex1_H(m) { return m.HD + EX1_FNS; }
// compact header for the many small mask expressions (PO exactly as in the motion header)
function ex1_mini(m) { var t = ex1_T(m); return 'var OS=' + jzN(t.OS) + ',OD=' + jzN(t.OD) + ';function cl(x){return Math.max(0,Math.min(1,x));}var PO=OD>0.002?cl((time-OS)/OD):0;'; }
function ex1_T(m) { var c = m.c, od = c.outDur || 0; return { IN: Math.max(0.02, c.inDur || 0.3), DL: (m.o.mi || 0) * (c.stagger || 0.04), OS: c.dur - od, OD: Math.max(0.001, od) }; }
function ex1_arr(a) { var s = []; for (var i = 0; i < a.length; i++) s.push(jzN(a[i])); return '[' + s.join(',') + ']'; }
function ex1_isHex(c) { return typeof c === 'string' && c.charAt(0) === '#' && (c.length === 7 || c.length === 4); }
function ex1_hex(a, b, c) { if (ex1_isHex(a)) return a; if (ex1_isHex(b)) return b; if (ex1_isHex(c)) return c; return '#FFFFFF'; }
function ex1_td(L) { try { return L.property('ADBE Text Properties').property('ADBE Text Document').value; } catch (e) { return null; } }
function ex1_text(L) { var d = ex1_td(L); return d ? String(d.text) : ''; }
function ex1_isSp(ch) { return /^[\s　]$/.test(ch); }
// the browser's J.h (hash of up to 5 ints) so seeded choices (cutBit, wipe angle) match the web version
function ex1_h(a, b, c, d, e) {
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
function ex1_bit(m, k) { return (ex1_h(m.c.seed | 0, k, 991) & 1) === 1; }   // browser cutBit: same choice for every item of a cut
// browser orderOf: glyph order 0..1; a one-glyph layer (mixed / scatter layouts) uses its mi within the cut
function ex1_om(m) { var N = jzCount(m.c.text || ''); return N > 1 ? jzClamp((m.o.mi || 0) / (N - 1), 0, 1) : 0; }
function ex1_single(m) { return jzCount(ex1_text(m.L)) <= 1 && jzCount(m.c.text || '') > 1; }
// per-glyph window q = win(PO, ord, spread) inside an Expression Selector (rev: the last glyph leaves first)
function ex1_q(m, spread, rev) {
    return 'var n=textTotal,o=n>1?(textIndex-1)/(n-1):' + jzN(ex1_om(m)) + ';' + (rev ? 'o=1-o;' : '') + 'var q=cl((PO-' + jzN(spread) + '*o)/' + jzN(1 - spread) + ');';
}
// random order (browser J.r(seed, i, salt)): a hash of the glyph index and the layer seed, so every animator agrees
function ex1_qr(spread, salt) { return 'var o=hh(textIndex*7.31+SD*0.173+' + salt + '),q=cl((PO-' + jzN(spread) + '*o)/' + jzN(1 - spread) + ');'; }
// the text at rest (after the entrance, before the exit)
function ex1_rest(m) { var t = ex1_T(m); return Math.max(0, Math.min(t.OS - 0.01, t.DL + t.IN)); }
function ex1_rect(m) { try { return m.L.sourceRectAtTime(ex1_rest(m), false); } catch (e) { return jzRect(m.L); } }
function ex1_scale(L) { var s = jzXf(L, 'ADBE Scale').value; return Math.max(0.05, (Math.abs(s[0]) + Math.abs(s[1])) / 200); }
// animators the layout added (glyphs not at their plain places): anything but the motion system's own / colour animators
function ex1_arranged(L) {
    var TP = L.property('ADBE Text Properties'), i;
    try { if (TP.property('ADBE Text Path Options').property('ADBE Text Path').value > 0) return true; } catch (e0) {}
    try {
        var A = TP.property('ADBE Text Animators');
        for (i = 1; i <= A.numProperties; i++) { var nm = String(A.property(i).name); if (!/^JZ (In|Hold|Out)\b/.test(nm) && !/Colou?r/i.test(nm)) return true; }
    } catch (e1) {}
    return false;
}
function ex1_matted(L) { try { var t = L.trackMatteType; return !!t && t !== TrackMatteType.NO_TRACK_MATTE; } catch (e) { return false; } }
// helper layers are skipped for very long lines, one-glyph-per-layer layouts of long lyrics and crowded comps
function ex1_crowded(m, G) {
    var n = G ? G.N : jzCount(ex1_text(m.L));
    if (n > 60 || (n <= 1 && jzCount(m.c.text || '') > 14)) return true;
    try { return m.ctx.comp.numLayers > 60; } catch (e) { return false; }
}
function ex1_meas(T, L, s, just) {
    var d = L.property('ADBE Text Properties').property('ADBE Text Document').value;
    d.text = s; d.justification = just;
    T.property('ADBE Text Properties').property('ADBE Text Document').setValue(d);
    var q = T.sourceRectAtTime(0, false);
    return { l: q.left, r: q.left + q.width };
}
// Geometry of the lyric in the text layer's own space (call BEFORE adding the exit's animators).
//   G.fs, G.lead, G.rect (at rest), G.cx / G.cy box centre, G.vert (one glyph per line), G.nL, G.lines[{cy, chars}],
//   G.g[] per AE character (textIndex order, spaces included): {li, sp, x0, x1, cx, cy, w}, G.W widths, G.N, G.K widest,
//   G.arranged (layout animators / text on a path). measure = exact glyph boxes via a temporary text layer.
function ex1_geo(m, measure) {
    var L = m.L, td = ex1_td(L), i, j;
    var fs = td.fontSize, lead = (!td.autoLeading && td.leading > 0) ? td.leading : fs * 1.2;
    var lines = String(td.text).split(/\r\n|\r|\n|\u0003/), nL = lines.length, r = ex1_rect(m);
    var G = { fs: fs, lead: lead, nL: nL, rect: r, g: [], W: [], lines: [], N: 0, vert: nL > 1, arranged: ex1_arranged(L), K: 0,
        cx: r.left + r.width / 2, cy: r.top + r.height / 2 };
    var inkH = r.height - (nL - 1) * lead; if (!(inkH > fs * 0.3 && inkH < fs * 2)) inkH = fs * 0.9;
    var cy0 = r.top + inkH / 2, trk = (td.tracking || 0) / 1000 * fs;
    for (i = 0; i < nL; i++) { var cs0 = jzChars(lines[i]); if (cs0.length > 1) G.vert = false; G.lines.push({ chars: cs0, cy: cy0 + i * lead }); }
    var T = null;
    if (measure && !G.vert && !G.arranged && jzCount(td.text) <= 60) { try { T = m.ctx.comp.layers.addText('x'); } catch (e3) { T = null; } }
    var LEFT = ParagraphJustification.LEFT_JUSTIFY;
    try {
        for (i = 0; i < nL; i++) {
            var ln = G.lines[i], cs = ln.chars, n = cs.length;
            if (!n) continue;
            var F = null, F0 = null, off = 0, prev = 0;
            if (T && !G.vert) {
                F = ex1_meas(T, L, lines[i], td.justification);
                if (n > 1) { F0 = ex1_meas(T, L, lines[i], LEFT); off = F.l - F0.l; }
                prev = F.l - trk;
            } else if (!G.vert) {
                var wEst = r.width / Math.max(1, n), lx = r.left + (r.width - wEst * n) / 2;
                prev = lx - trk;
            }
            for (j = 0; j < n; j++) {
                var sp = ex1_isSp(cs[j]), x0, x1;
                if (G.vert) { x0 = r.left; x1 = r.left + r.width; }
                else if (T) {
                    x0 = prev + trk;
                    x1 = (j === n - 1) ? F.r : off + ex1_meas(T, L, cs.slice(0, j + 1).join(''), LEFT).r;
                    if (x1 < x0) x1 = x0;
                    prev = x1;
                } else { x0 = prev + trk; x1 = x0 + (r.width + trk) / Math.max(1, n) - trk; prev = x1; }
                var gi = { li: i, sp: sp, x0: x0, x1: x1, cx: (x0 + x1) / 2, cy: ln.cy, w: Math.max(1, x1 - x0) };
                if (G.vert) { gi.w = Math.min(r.width, fs); gi.cx = r.left + r.width / 2; }
                G.g.push(gi); G.W.push(gi.w); G.N++;
                if (gi.w > G.K) G.K = gi.w;
            }
        }
    } catch (e4) { jzWarn('ex1 geometry: ' + e4.toString()); }
    if (T) { try { T.remove(); } catch (e5) {} }
    if (!G.K) G.K = fs;
    return G;
}
// what the layer's existing masks leave visible once the entrance is over:
//   'none' (no masks), 'open' (an entrance mask opened to the whole layer), 'clip' (a real clip from the layout)
function ex1_mstate(L) {
    var MP = L.property('ADBE Mask Parade'), n = MP.numProperties, ok = true, i;
    if (!n) return 'none';
    for (i = n; i >= 1; i--) {
        var mk = MP.property(i), mode = mk.maskMode, ex = '';
        if (mode === MaskMode.NONE) continue;
        try { ex = String(mk.property('ADBE Mask Offset').expression || ''); } catch (e) {}
        if (mode === MaskMode.ADD && !mk.inverted && ex.indexOf('1e4') >= 0) return ok ? 'open' : 'clip';
        if (mode !== MaskMode.ADD) ok = false;
    }
    return 'clip';
}
// finish a new mask: first mask of a group INTERSECTs with the layer's existing masks; optional opacity / expansion expressions
function ex1_fin(Lx, mk, had, first, opEx, exEx, name) {
    if (first && had) { try { mk.maskMode = MaskMode.INTERSECT; } catch (e0) {} }
    try { if (name) mk.name = name; } catch (e1) {}
    if (opEx) jzSetExpr(mk.property('ADBE Mask Opacity'), opEx);
    if (exEx) jzSetExpr(mk.property('ADBE Mask Offset'), exEx);
    return mk;
}
function ex1_mask(Lx, x0, y0, x1, y1, first, opEx, exEx, name) {
    var had = Lx.property('ADBE Mask Parade').numProperties > 0;
    return ex1_fin(Lx, jzMaskRect(Lx, x0, y0, x1, y1), had, first, opEx, exEx, name);
}
function ex1_poly(Lx, pts, first, opEx, exEx, name) {
    var MP = Lx.property('ADBE Mask Parade'), had = MP.numProperties > 0, mk = MP.addProperty('ADBE Mask Atom'), sh = new Shape();
    sh.vertices = pts; sh.closed = true;
    mk.property('ADBE Mask Shape').setValue(sh);
    return ex1_fin(Lx, mk, had, first, opEx, exEx, name);
}
function ex1_circ(Lx, cx, cy, r0, first, opEx, exEx, name) {
    var MP = Lx.property('ADBE Mask Parade'), had = MP.numProperties > 0, mk = MP.addProperty('ADBE Mask Atom'), sh = new Shape(), k = r0 * 0.5523;
    sh.vertices = [[cx, cy - r0], [cx + r0, cy], [cx, cy + r0], [cx - r0, cy]];
    sh.inTangents = [[-k, 0], [0, -k], [k, 0], [0, k]]; sh.outTangents = [[k, 0], [0, k], [-k, 0], [0, -k]]; sh.closed = true;
    mk.property('ADBE Mask Shape').setValue(sh);
    return ex1_fin(Lx, mk, had, first, opEx, exEx, name);
}
// a copy of the lyric layer shown only during the exit: parented to L (follows every move of it), same space as L.
// style: take L's final text style by expression (the treatment is applied later). Made before L gets its exit animators.
function ex1_twin(m, tag, style) {
    var L = m.L, D = L.duplicate(), i, mns = ['ADBE Position', 'ADBE Scale', 'ADBE Rotate Z', 'ADBE Opacity'];
    try { D.name = String(L.name).substr(0, 20) + ' ' + tag; } catch (e0) {}
    var tr = D.property('ADBE Transform Group');
    for (i = 0; i < mns.length; i++) { try { if (tr.property(mns[i]).expression) tr.property(mns[i]).expression = ''; } catch (e1) {} }
    D.parent = L;
    tr.property('ADBE Scale').setValue([100, 100]); tr.property('ADBE Rotate Z').setValue(0);
    jzSetExpr(tr.property('ADBE Position'), 'parent.transform.anchorPoint');
    jzSetExpr(tr.property('ADBE Opacity'), ex1_H(m) + 'time<OS?0:value');
    if (style) { try { D.property('ADBE Text Properties').property('ADBE Text Document').expression = 'parent.text.sourceText.style'; } catch (e2) {} }
    return D;
}
// helper shape layer in the text layer's own space (parented to it), placed above it (and above its track matte)
function ex1_shape(m, name) {
    var L = m.L, S = jzShapeLayer(m.ctx, name, 0, 0), above = L;
    if (ex1_matted(L)) { try { if (L.index > 1) above = m.ctx.comp.layer(L.index - 1); } catch (e0) {} }
    try { S.moveBefore(above); } catch (e1) {}
    S.parent = L;
    var tr = S.property('ADBE Transform Group');
    tr.property('ADBE Anchor Point').setValue([0, 0]); tr.property('ADBE Position').setValue([0, 0]);
    tr.property('ADBE Scale').setValue([100, 100]); tr.property('ADBE Rotate Z').setValue(0);
    return S;
}
// layer space <-> comp space of an unparented layer (position / anchor / scale / rotation at rest)
function ex1_toComp(L, x, y) {
    var tr = L.property('ADBE Transform Group'), p = tr.property('ADBE Position').value, a = tr.property('ADBE Anchor Point').value;
    var s = tr.property('ADBE Scale').value, r = tr.property('ADBE Rotate Z').value * Math.PI / 180, c = Math.cos(r), sn = Math.sin(r);
    var X = (x - a[0]) * s[0] / 100, Y = (y - a[1]) * s[1] / 100;
    return [p[0] + X * c - Y * sn, p[1] + X * sn + Y * c];
}
function ex1_toLayer(L, x, y) {
    var tr = L.property('ADBE Transform Group'), p = tr.property('ADBE Position').value, a = tr.property('ADBE Anchor Point').value;
    var s = tr.property('ADBE Scale').value, r = -tr.property('ADBE Rotate Z').value * Math.PI / 180, c = Math.cos(r), sn = Math.sin(r);
    var X = x - p[0], Y = y - p[1], sx = Math.abs(s[0]) > 0.5 ? s[0] / 100 : 1, sy = Math.abs(s[1]) > 0.5 ? s[1] / 100 : 1;
    return [a[0] + (X * c - Y * sn) / sx, a[1] + (X * sn + Y * c) / sy];
}
// keep the text box centre fixed while the layer is scaled by fS (expression string): the browser scales about the box centre
function ex1_pivot(m, fS) {
    var L = m.L, tr = L.property('ADBE Transform Group'), a = tr.property('ADBE Anchor Point').value, s = tr.property('ADBE Scale').value;
    var rot = tr.property('ADBE Rotate Z').value * Math.PI / 180, r = ex1_rect(m);
    var ux = (r.left + r.width / 2 - a[0]) * s[0] / 100, uy = (r.top + r.height / 2 - a[1]) * s[1] / 100;
    var vx = Math.cos(rot) * ux - Math.sin(rot) * uy, vy = Math.sin(rot) * ux + Math.cos(rot) * uy;
    if (Math.abs(vx) + Math.abs(vy) < 0.5) return;
    m.parts.pos.push('var x1pv=1-(' + fS + ');d=[d[0]+' + jzN(vx) + '*x1pv,d[1]+' + jzN(vy) + '*x1pv];');
}
// add a stroke to the text document (width 0, animated by a Stroke Width animator) when it has none; returns true if added
function ex1_addStroke(L) {
    var td = ex1_td(L);
    if (!td || (td.applyStroke && td.strokeWidth > 0)) return false;
    jzTextDoc(L, function (d) {
        d.applyStroke = true; d.strokeWidth = 0;
        try { d.strokeColor = d.applyFill ? d.fillColor : d.strokeColor; } catch (e) {}
        try { d.strokeOverFill = false; } catch (e2) {}
    });
    return true;
}
// smoothstep for layer transform parts (the parts only get JZ_FNS): 1 - smooth(a, b, PO) as an expression
function ex1_fade(a, b, v) { return 'var ' + v + '=cl((PO-' + jzN(a) + ')/' + jzN(b - a) + ');f*=1-' + v + '*' + v + '*(3-2*' + v + ');'; }

// ================================================================ masks
/* ---- sinkMask — 沈む: each glyph lifts a hair, then sinks below its own baseline (clipped to its line), left to right */
// glyphs leaving their line vertically are clipped to their own line band (the browser's per-glyph window). With several
// lines, alternate lines go to a linked copy D (made here, before the exit's animators) so a glyph leaving its line never
// shows over the next one. Returns null (no clip: glyphs fade instead), { D: null } (one line) or { D: copy }.
function ex1_clipPlan(m, G) {
    var L = m.L;
    if (G.arranged) return null;
    if (G.nL === 1) return { D: null };
    if (ex1_matted(L) || ex1_crowded(m, G) || ex1_mstate(L) === 'clip') return null;
    var D = ex1_twin(m, 'JZ Out Lines B', true), S = [], i;
    for (i = 0; i < G.N; i++) S.push(G.g[i].li % 2);
    var arr = ex1_arr(S);
    jzAnimator(L, 'JZ Out Set A', [['ADBE Text Opacity', 0]], ex1_H(m) + 'var S=' + arr + ';S[textIndex-1]==1&&time>=OS?100:0');
    jzAnimator(D, 'JZ Out Set B', [['ADBE Text Opacity', 0]], 'var S=' + arr + ';S[textIndex-1]==1?0:100');
    return { D: D };
}
function ex1_bands(m, G, D, name) {
    var L = m.L, fs = G.fs, r = G.rect, hb = fs * 0.66, H = ex1_H(m), x0 = r.left - fs * 2, x1 = r.left + r.width + fs * 2, i, nA = 0, nB = 0;
    for (i = 0; i < G.nL; i++) {
        if (!G.lines[i].chars.length) continue;
        var cy = G.lines[i].cy, onB = !!D && i % 2 === 1, first = onB ? !nB : !nA;
        ex1_mask(onB ? D : L, x0, cy - hb, x1, cy + hb, first, null, (!onB && first) ? H + 'time<OS?1e4:0' : null, name + ' ' + (i + 1));
        if (onB) nB++; else nA++;
    }
}

/* ---- sinkMask — 沈む: each glyph lifts a hair, then sinks below its own baseline (clipped to its line), left to right */
jzReg('exit', 'sinkMask', { apply: function (m) {
    var L = m.L, G = ex1_geo(m, false), fs = G.fs, H = ex1_H(m), cp = ex1_clipPlan(m, G), k;
    var q = H + ex1_q(m, 0.5) + 'var d=io3(q)-0.06*Math.sin(Math.PI*cl(q/0.3));';
    var Ls = cp && cp.D ? [L, cp.D] : [L];
    for (k = 0; k < Ls.length; k++) {
        jzAnimator(Ls[k], 'JZ Out Sink', [['ADBE Text Position 3D', [0, fs * 1.4, 0]]], q + 'q<=0?0:d*100');
        jzAnimator(Ls[k], 'JZ Out Hide', [['ADBE Text Opacity', 0]], q + (cp ? 'q>=1?100:0' : 'q>=1?100:sm(0.3,0.75,d)*100'));
    }
    if (cp) ex1_bands(m, G, cp.D, 'JZ Out Sink');
} });

/* ---- riseOut — 上へ抜ける: glyphs shoot up out of their line in random order, stretching with speed (clipped at the line top) */
jzReg('exit', 'riseOut', { apply: function (m) {
    var L = m.L, G = ex1_geo(m, false), fs = G.fs, H = ex1_H(m), cp = ex1_clipPlan(m, G), k;
    var q = H + ex1_qr(0.5, 201) + 'var e=Math.pow(q,2.2),st=Math.sin(Math.PI*q)*q;';
    var Ls = cp && cp.D ? [L, cp.D] : [L];
    for (k = 0; k < Ls.length; k++) {
        jzAnimator(Ls[k], 'JZ Out Rise', [['ADBE Text Position 3D', [0, -fs * 1.5, 0]]], q + 'q<=0?0:e*100');
        jzAnimator(Ls[k], 'JZ Out Stretch', [['ADBE Text Scale 3D', [90, 150, 100]]], q + 'q<=0?[0,0,0]:[st*50,st*100,0]');
        jzAnimator(Ls[k], 'JZ Out Hide', [['ADBE Text Opacity', 0]], q + (cp ? 'q>=1?100:0' : 'q>=1?100:sm(0.2,0.55,e)*100'));
    }
    if (cp) ex1_bands(m, G, cp.D, 'JZ Out Rise');
} });

// ================================================================ slides
/* ---- slideOutL / slideOutR — 左へ / 右へ流れる: a small wind-up, then glyphs accelerate off-screen, stretching and leaning,
   the leading edge first */
function ex1_slide(m, dir) {
    var L = m.L, r = ex1_rect(m), fs = m.size, ks = Math.max(0.05, Math.abs(jzXf(L, 'ADBE Scale').value[0]) / 100);
    var dist = m.W / ks + r.width + fs * 1.5;
    var q = ex1_H(m) + ex1_q(m, 0.5, dir > 0) + 'var wind=q<0.24?Math.sin(q/0.24*Math.PI)*' + jzN(fs * 0.07) + ':0,u=cl((q-0.1)/0.9),v=3*u*u;';
    jzAnimator(L, 'JZ Out Slide', [['ADBE Text Position 3D', [dir * dist, 0, 0]]], q + 'q<=0?0:(' + jzN(dist) + '*u*u*u-wind)/' + jzN(dist) + '*100');
    jzAnimator(L, 'JZ Out Stretch', [['ADBE Text Scale 3D', [230, 72, 100]]], q + 'q<=0?[0,0,0]:[Math.min(1.3,v*0.45)/1.3*100,Math.min(0.28,v*0.09)/0.28*100,0]');
    jzAnimator(L, 'JZ Out Lean', [['ADBE Text Skew', -dir * 22]], q + 'q<=0?0:Math.min(22,v*8)/22*100');
    jzAnimator(L, 'JZ Out Fade', [['ADBE Text Opacity', 0]], q + 'q>=1?100:sm(0.82,1,q)*100');
}
jzReg('exit', 'slideOutL', { apply: function (m) { ex1_slide(m, -1); } });
jzReg('exit', 'slideOutR', { apply: function (m) { ex1_slide(m, 1); } });

// ================================================================ flips / folds
/* ---- flipOutX — 扉が閉まる: each glyph swings shut like a door on its hinge side, darkening towards the background */
jzReg('exit', 'flipOutX', { apply: function (m) {
    var L = m.L, G = ex1_geo(m, true), K = G.K, dir = ex1_bit(m, 1) ? 1 : -1, bg = ex1_hex(m.ctx.sc.bg, '#000000');
    var q = ex1_H(m) + ex1_q(m, 0.5) + 'var W=' + ex1_arr(G.W) + ',w=W[textIndex-1]||SZ,th=iq(q)*Math.PI/2,c=Math.cos(th),s=Math.sin(th);';
    jzAnimator(L, 'JZ Out Door', [['ADBE Text Scale 3D', [0, 114, 100]]], q + 'q<=0?[0,0,0]:[(1-c)*100,s*100,0]');
    jzAnimator(L, 'JZ Out Hinge', [['ADBE Text Position 3D', [dir * K, 0, 0]]], q + 'q<=0?0:(1-c)*w/2/' + jzN(K) + '*100');
    jzAnimator(L, 'JZ Out Shade', [['ADBE Text Fill Color', jzHex(bg)]], q + 'q<=0?0:s*55');
    jzAnimator(L, 'JZ Out Fade', [['ADBE Text Opacity', 0]], q + 'q>=1?100:sm(0.8,1,q)*100');
} });

/* ---- flipOutY — パタン倒れ: glyphs fall flat backwards onto their baseline in random order */
jzReg('exit', 'flipOutY', { apply: function (m) {
    var L = m.L, fs = m.size, bg = ex1_hex(m.ctx.sc.bg, '#000000');
    var q = ex1_H(m) + ex1_qr(0.5, 211) + 'var th=iq(q)*Math.PI/2,c=Math.cos(th),s=Math.sin(th);';
    jzAnimator(L, 'JZ Out Fall', [['ADBE Text Scale 3D', [88, 0, 100]]], q + 'q<=0?[0,0,0]:[s*100,(1-c)*100,0]');
    jzAnimator(L, 'JZ Out Hinge', [['ADBE Text Position 3D', [0, fs * 0.5, 0]]], q + 'q<=0?0:(1-c)*100');
    jzAnimator(L, 'JZ Out Shade', [['ADBE Text Fill Color', jzHex(bg)]], q + 'q<=0?0:s*60');
    jzAnimator(L, 'JZ Out Hide', [['ADBE Text Opacity', 0]], q + 'q>=1?100:0');
} });

/* ---- foldOut — 折り畳み: the top half of every glyph folds down over the bottom half (showing an accent back), then the
   folded glyph flattens away. L keeps the bottom halves; two linked copies show the top halves upright / folded over. */
jzReg('exit', 'foldOut', { apply: function (m) {
    var L = m.L, G = ex1_geo(m, false), fs = G.fs, H = ex1_H(m), i, sc = m.ctx.sc;
    var back = jzMixHex(jzTextColor(L), ex1_hex(sc.accent, sc.fg), 0.75);
    // t = top-half scale (1 -> -1 folded down, then -> 0 with the bottom half), k = bottom-half scale
    var ev = H + ex1_q(m, 0.3) + 'var b=cl((q-0.5)/0.5),k=Math.cos(iq(b)*Math.PI/2),t=Math.cos(ios(q/0.5)*Math.PI)*k,fa=q>=1?100:sm(0.85,1,q)*100;';
    var st = ex1_mstate(L);
    var twins = !G.arranged && !ex1_matted(L) && !ex1_crowded(m, G) && (G.nL === 1 || st !== 'clip');
    if (!twins) {        // one layer: the glyph folds down onto its lower half (no split), then flattens
        jzAnimator(L, 'JZ Out Fold', [['ADBE Text Scale 3D', [100, 0, 100]], ['ADBE Text Position 3D', [0, fs * 0.5, 0]]],
            ev + 'var sy=q<0.5?1-0.5*ios(q/0.5):0.5*k;q<=0?[0,0,0]:[0,(1-sy)*100,0]');
        jzAnimator(L, 'JZ Out Back', [['ADBE Text Fill Color', jzHex(back)]], ev + 'q>0.25&&q<1?100:0');
        jzAnimator(L, 'JZ Out Fade', [['ADBE Text Opacity', 0]], ev + 'fa');
        return;
    }
    var D1 = ex1_twin(m, 'JZ Out Fold Top', true), D2 = ex1_twin(m, 'JZ Out Fold Back', true);
    jzAnimator(L, 'JZ Out Fold', [['ADBE Text Scale 3D', [100, 0, 100]]], ev + 'q<=0?[0,0,0]:[0,(1-k)*100,0]');
    jzAnimator(L, 'JZ Out Fade', [['ADBE Text Opacity', 0]], ev + 'fa');
    jzAnimator(D1, 'JZ Out Fold', [['ADBE Text Scale 3D', [100, -100, 100]]], ev + 'q<=0?[0,0,0]:[0,(1-t)/2*100,0]');
    jzAnimator(D1, 'JZ Out Fade', [['ADBE Text Opacity', 0]], ev + 'q>0&&t<0?100:fa');
    jzAnimator(D2, 'JZ Out Fold', [['ADBE Text Scale 3D', [100, -100, 100]]], ev + 'q<=0?[0,0,0]:[0,(1-t)/2*100,0]');
    jzAnimator(D2, 'JZ Out Back', [['ADBE Text Fill Color', jzHex(back)]], '100');
    jzAnimator(D2, 'JZ Out Fade', [['ADBE Text Opacity', 0]], ev + 'q<=0||t>=0?100:fa');
    // halves: one band per line (vertical text: per glyph); L's first band stays open until the exit starts
    var r = G.rect, x0 = r.left - fs, x1 = r.left + r.width + fs, hb = Math.max(fs * 0.45, Math.min(fs * 0.66, G.lead - fs * 0.5)), sn = fs * 0.004, n = 0;
    for (i = 0; i < G.nL; i++) {
        if (!G.lines[i].chars.length) continue;
        var cy = G.lines[i].cy;
        ex1_mask(L, x0, cy, x1, cy + hb, !n, null, !n ? H + 'time<OS?1e4:0' : null, 'JZ Out Bottom ' + (i + 1));
        ex1_mask(D1, x0, cy - hb, x1, cy + sn, !n, null, null, 'JZ Out Top ' + (i + 1));
        ex1_mask(D2, x0, cy - sn, x1, cy + hb, !n, null, null, 'JZ Out Flap ' + (i + 1));
        n++;
    }
} });

/* ---- squash — 潰れる: CRT switch-off — the line flattens to a hairline, then pinches to a bright dot that fades */
jzReg('exit', 'squash', { apply: function (m) {
    var L = m.L, r = ex1_rect(m), fs = m.size, H = ex1_H(m), N = jzCount(m.c.text || ''), single = ex1_single(m);
    var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    var ev = H + 'var a1=cl(PO/0.42),a2=cl((PO-0.4)/0.45),ky=1-0.97*ic(a1),kx=' + (single ? '1+0.08*oc(a1)' : '(1+0.08*oc(a1))*(1-io3(a2))') + ';';
    // scaled about the text box centre by a Transform effect (the dot layer parented to L is not squashed with it)
    var tf = jzEffect(L, 'ADBE Geometry2', 'JZ Out Squash');
    jzEP(tf, 1, [cx, cy]); jzEP(tf, 2, [cx, cy]); jzEP(tf, 3, 0);
    jzEX(tf, 4, ev + 'ky*100'); jzEX(tf, 5, ev + 'kx*100');
    if (single) {        // one glyph per layer: the whole line collapses to the screen centre
        m.parts.pos.push('var x1a=cl((PO-0.4)/0.45),x1b=x1a<0.5?4*x1a*x1a*x1a:1-Math.pow(-2*x1a+2,3)/2;d=[d[0]+(thisComp.width/2-value[0])*x1b,d[1]];');
        m.parts.op.push(ex1_fade(0.7, 0.9, 'x1f'));
    } else m.parts.op.push('var x1a=cl((PO-0.4)/0.45),x1b=x1a<0.5?4*x1a*x1a*x1a:1-Math.pow(-2*x1a+2,3)/2;f*=(1+0.08*oc(cl(PO/0.42)))*(1-x1b)>0.01?1:0;');
    // the bright dot + hairline left behind (once per cut for one-glyph layers: by the middle one)
    if (single && Math.round(m.o.mi || 0) !== Math.floor((N - 1) / 2)) return;
    if (ex1_crowded(m)) return;
    var col = jzTextColor(L), S, rr, px = cx, py = cy;
    if (single) {
        var c0 = ex1_toComp(L, cx, cy), ks = ex1_scale(L);
        S = jzShapeLayer(m.ctx, 'JZ Out Squash Dot', m.W / 2, c0[1]);
        jzNoGhost(S);
        try { S.moveBefore(ex1_matted(L) && L.index > 1 ? m.ctx.comp.layer(L.index - 1) : L); } catch (e0) {}
        rr = fs * ks * 0.08; px = 0; py = 0;
    } else { S = jzNoGhost(ex1_shape(m, 'JZ Out Squash Dot')); rr = fs * 0.08; }
    var dA = ev + 'var dA=sm(0.6,0.8,PO)*(1-sm(0.88,1,PO));';
    var gl = jzGrp(S, 'line'), rc = jzAddRect(gl, rr * 10, rr * 0.24, 0);
    jzAddFill(gl, col);
    jzGX(gl).property('ADBE Vector Position').setValue([px, py]);
    jzSetExpr(rc.property('ADBE Vector Rect Size'), dA + '[' + jzN(rr * 10) + '*(1-a2*0.5),' + jzN(rr * 0.24) + ']');
    jzSetExpr(jzGX(gl).property('ADBE Vector Group Opacity'), dA + 'dA*80');
    var gd = jzGrp(S, 'dot');
    jzAddEllipse(gd, rr * 2, rr * 2);
    jzAddFill(gd, col);
    jzGX(gd).property('ADBE Vector Position').setValue([px, py]);
    jzSetExpr(jzGX(gd).property('ADBE Vector Group Opacity'), dA + 'dA*100');
} });

/* ---- trackOutWide — 字間が開く: the letter spacing opens up while glyphs thin, blur and fade */
jzReg('exit', 'trackOutWide', { apply: function (m) {
    var L = m.L, G = ex1_geo(m, true), fs = G.fs, vert = G.vert, i, A = [], K = 1;
    for (i = 0; i < G.N; i++) { var v = vert ? G.g[i].cy - G.cy : G.g[i].cx - G.cx; A.push(v); K = Math.max(K, Math.abs(v) * 1.95 + 1); }
    var ev = ex1_H(m) + 'var k=iq(PO)*1.6+PO*0.3;';
    if (G.N > 1) jzAnimator(L, 'JZ Out Track', [['ADBE Text Position 3D', vert ? [0, K, 0] : [K, 0, 0]]], ev + 'var A=' + ex1_arr(A) + ',v=(A[textIndex-1]||0)*k/' + jzN(K) + '*100;' + (vert ? '[0,v,0]' : '[v,0,0]'));
    jzAnimator(L, 'JZ Out Thin', [['ADBE Text Scale 3D', vert ? [100, 40, 100] : [40, 100, 100]]], ev + 'iq(PO)*100');
    var B = fs * 0.035, cap = jzU(m.ctx) * 0.012 / ex1_scale(L);
    jzAnimator(L, 'JZ Out Blur', [['ADBE Text Blur', [B, B]]], ev + 'Math.min(iq(PO),' + jzN(cap / B) + ')*100');
    m.parts.op.push(ex1_fade(0.2, 1, 'x1t'));
    if (ex1_single(m)) m.parts.pos.push('var x1k=PO*PO*1.6+PO*0.3;d=[d[0]+(value[0]-thisComp.width/2)*x1k*0.7,d[1]+(value[1]-thisComp.height/2)*x1k*0.4];');
} });

/* ---- collapse — 吸い込み: the line is sucked into its centre along a spiral (inner glyphs turn faster) */
jzReg('exit', 'collapse', { apply: function (m) {
    var L = m.L, dir = ex1_bit(m, 2) ? 1 : -1;
    m.parts.op.push(ex1_fade(0.8, 1, 'x1c'));
    if (ex1_single(m)) {         // spiral the whole one-glyph layer into the screen centre
        var p0 = jzXf(L, 'ADBE Position').value, px = p0[0] - m.W / 2, py = p0[1] - m.H / 2, R = Math.max(m.W, m.H) * 0.5;
        var ph = dir * (140 + 220 * (1 - Math.min(1, Math.sqrt(px * px + py * py) / R)));
        var PH = 'var x1e=iq(PO),x1p=' + jzN(ph) + '*x1e*Math.PI/180,x1r=1-x1e;';
        var X0 = '(' + jzN(px) + ')', Y0 = '(' + jzN(py) + ')';
        m.parts.pos.push(PH + 'd=[d[0]+(' + X0 + '*Math.cos(x1p)-' + Y0 + '*Math.sin(x1p))*x1r-' + X0 + ',d[1]+(' + X0 + '*Math.sin(x1p)+' + Y0 + '*Math.cos(x1p))*x1r-' + Y0 + '];');
        m.parts.rot.push(PH + 'r+=x1p*180/Math.PI;');
        m.parts.sc.push('var x1s=Math.max(0.02,1-iq(PO)*0.94);f=[f[0]*x1s,f[1]*x1s];');
        return;
    }
    var G = ex1_geo(m, true), r = G.rect, X = [], Y = [], i;
    var Rr = Math.max(1, Math.sqrt(r.width * r.width + r.height * r.height) * 0.5), K = Rr * 2 + 1;
    for (i = 0; i < G.N; i++) { X.push(G.g[i].cx - G.cx); Y.push(G.g[i].cy - G.cy); }
    var ev = ex1_H(m) + 'var X=' + ex1_arr(X) + ',Y=' + ex1_arr(Y) + ',px=X[textIndex-1]||0,py=Y[textIndex-1]||0,e=iq(PO),' +
        'ph=' + dir + '*e*(140+220*(1-cl(Math.sqrt(px*px+py*py)/' + jzN(Rr) + ')))*Math.PI/180,c=Math.cos(ph),s=Math.sin(ph),r=1-e;';
    jzAnimator(L, 'JZ Out Spiral', [['ADBE Text Position 3D', [K, K, 0]]], ev + '[((px*c-py*s)*r-px)/' + jzN(K) + '*100,((px*s+py*c)*r-py)/' + jzN(K) + '*100,0]');
    jzAnimator(L, 'JZ Out Turn', [['ADBE Text Rotation', 360]], ev + 'ph*180/Math.PI/360*100');
    jzAnimator(L, 'JZ Out Shrink', [['ADBE Text Scale 3D', [0, 0, 100]]], ev + '(1-Math.max(0.02,1-e*0.94))*100');
} });

// ================================================================ zooms (echo trails = linked copies behind the text)
// n copies of L behind it, parented to it, scaled k^i about the box centre; opEx: opacity factor of copy i (uses I)
function ex1_echo(m, n, k, opEx, outline, dyEx) {
    var L = m.L, r = ex1_rect(m), bx = r.left + r.width / 2, by = r.top + r.height / 2, H = ex1_H(m), prev = L, i, j;
    var col = jzTextColor(L), mns = ['ADBE Position', 'ADBE Scale', 'ADBE Rotate Z', 'ADBE Opacity', 'ADBE Anchor Point'];
    for (i = 1; i <= n; i++) {
        var D = L.duplicate(), tr = D.property('ADBE Transform Group');
        try { D.name = String(L.name).substr(0, 20) + ' JZ Out Echo ' + i; } catch (e0) {}
        for (j = 0; j < mns.length; j++) { try { if (tr.property(mns[j]).expression) tr.property(mns[j]).expression = ''; } catch (e1) {} }
        D.parent = L;
        tr.property('ADBE Anchor Point').setValue([bx, by]); tr.property('ADBE Position').setValue([bx, by]);
        var s = Math.pow(k, i) * 100;
        tr.property('ADBE Scale').setValue([s, s]); tr.property('ADBE Rotate Z').setValue(0);
        if (dyEx) jzSetExpr(tr.property('ADBE Position'), H + 'var I=' + i + ';[' + jzN(bx) + ',' + jzN(by) + '+(' + dyEx + ')]');
        jzSetExpr(tr.property('ADBE Opacity'), H + 'var I=' + i + ';time<OS?0:value*(' + opEx + ')');
        if (outline) {
            jzTextDoc(D, function (d) {
                d.applyFill = false; d.applyStroke = true; d.strokeColor = jzHex(col); d.strokeWidth = Math.max(1, m.size * 0.012);
            });
        } else { try { D.property('ADBE Text Properties').property('ADBE Text Document').expression = 'parent.text.sourceText.style'; } catch (e2) {} }
        try { D.moveAfter(prev); } catch (e3) {}
        prev = D;
    }
}

/* ---- zoomThrough — 手前へ抜ける: the line rushes towards the camera (grows past the frame) leaving smaller echoes, and fades */
jzReg('exit', 'zoomThrough', { apply: function (m) {
    var L = m.L, single = ex1_single(m), szc = m.size * ex1_scale(L);
    var maxK = Math.max(1.3, Math.max(m.W, m.H) * (single ? 0.8 : 1.6) / Math.max(1, szc));
    var kE = 'Math.min(' + jzN(maxK) + ',1+4.5*ic(PO)+0.25*PO)';
    var echo = !ex1_matted(L) && !ex1_crowded(m);
    if (echo) ex1_echo(m, 3, 0.84, '0.45*sm(0,0.25,PO)*(1-sm(0.3,0.88,PO))*Math.pow(0.62,I-1)', false, null);
    m.parts.sc.push('var x1z=' + kE + ';f=[f[0]*x1z,f[1]*x1z];');
    ex1_pivot(m, kE);
    if (single) m.parts.pos.push('var x1w=4.5*ic(PO)+0.25*PO;d=[d[0]+(value[0]-thisComp.width/2)*x1w,d[1]+(value[1]-thisComp.height/2)*x1w];');
    m.parts.op.push(ex1_fade(0.3, 0.88, 'x1o'));
} });

/* ---- zoomFar — 奥へ遠ざかる: the line recedes fast towards a vanishing point above, trailing larger outline echoes */
jzReg('exit', 'zoomFar', { apply: function (m) {
    var L = m.L, single = ex1_single(m), szc = m.size * ex1_scale(L), E = '(1-Math.pow(1-PO,2.6))';
    if (!ex1_matted(L) && !ex1_crowded(m)) ex1_echo(m, 3, 1.2, '0.6*sm(0,0.2,PO)*(1-sm(0.5,1,PO))*Math.pow(0.62,I-1)', true, jzN(m.size * 0.06) + '*' + E + '*I');
    m.parts.sc.push('var x1q=1-0.9*' + E + ';f=[f[0]*x1q,f[1]*x1q];');
    ex1_pivot(m, '1-0.9*' + E);
    m.parts.pos.push('d=[d[0],d[1]-' + jzN(szc * 0.35) + '*' + E + '];');
    if (single) m.parts.pos.push('var x1g=' + E + '*0.85;d=[d[0]+(thisComp.width/2-value[0])*x1g,d[1]+(thisComp.height/2-value[1])*x1g];');
    m.parts.op.push(ex1_fade(0.5, 1, 'x1o'));
} });

// ================================================================ per-glyph motion
/* ---- spinOut — 回って消える: glyphs spin away, shrinking, with a little hop, left to right */
jzReg('exit', 'spinOut', { apply: function (m) {
    var L = m.L, fs = m.size, dir = ex1_bit(m, 3) ? 1 : -1;
    var q = ex1_H(m) + ex1_q(m, 0.45);
    jzAnimator(L, 'JZ Out Spin', [['ADBE Text Rotation', dir * 250]], q + 'q<=0?0:((textIndex-1)%2?1:0.8)*iq(q)*100');
    jzAnimator(L, 'JZ Out Shrink', [['ADBE Text Scale 3D', [0, 0, 100]]], q + 'q<=0?0:(1-Math.max(0.01,1-ic(q)))*100');
    jzAnimator(L, 'JZ Out Hop', [['ADBE Text Position 3D', [0, -fs * 0.18, 0]]], q + 'q<=0?0:Math.sin(Math.PI*q)*100');
    jzAnimator(L, 'JZ Out Fade', [['ADBE Text Opacity', 0]], q + 'q>=1?100:sm(0.8,1,q)*100');
} });

/* ---- twist — ねじれ: the line twists like a ribbon (a phase gradient along it), showing its darker back, then goes edge-on */
jzReg('exit', 'twist', { apply: function (m) {
    var L = m.L, G = ex1_geo(m, false), vert = G.vert, sc = m.ctx.sc;
    var back = jzMixHex(jzTextColor(L), ex1_hex(sc.bg, '#000000'), 0.5);
    var ev = ex1_H(m) + 'var n=textTotal,o=n>1?(textIndex-1)/(n-1):' + jzN(ex1_om(m)) + ',fl=1-iq((PO-0.55)/0.45),th=Math.pow(PO,1.3)*(0.5+2*o)*Math.PI,c=Math.cos(th)*fl;';
    jzAnimator(L, 'JZ Out Twist', [['ADBE Text Scale 3D', vert ? [-100, 100, 100] : [100, -100, 100]]], ev + (vert ? '[(1-c)/2*100,0,0]' : '[0,(1-c)/2*100,0]'));
    if (!vert) jzAnimator(L, 'JZ Out Lean', [['ADBE Text Skew', 12]], ev + 'Math.sin(th)*fl*100');
    jzAnimator(L, 'JZ Out Back', [['ADBE Text Fill Color', jzHex(back)]], ev + 'c<0?100:0');
    m.parts.op.push(ex1_fade(0.9, 1, 'x1t'));
} });

/* ---- waveOut — 波で崩れる: a wave rolls through the line; each glyph bobs up, tumbles forward and drops away */
jzReg('exit', 'waveOut', { apply: function (m) {
    var L = m.L, A = m.size * 0.42, K = A * 2.7;
    var q = ex1_H(m) + ex1_q(m, 0.55);
    jzAnimator(L, 'JZ Out Wave', [['ADBE Text Position 3D', [K, K, 0]]], q + 'q<=0?[0,0,0]:[q*0.6*' + jzN(A / K) + '*100,(q*q*2.6-Math.sin(q*Math.PI))*' + jzN(A / K) + '*100,0]');
    jzAnimator(L, 'JZ Out Tumble', [['ADBE Text Rotation', 60]], q + 'q<=0?0:(Math.sin(q*Math.PI*1.5)*28+q*30)/60*100');
    jzAnimator(L, 'JZ Out Fade', [['ADBE Text Opacity', 0]], q + 'q>=1?100:sm(0.45,1,q)*100');
} });

/* ---- blurOutStagger — 字ごとボケ: glyph by glyph, each drifts up a little, swells, blurs and fades */
jzReg('exit', 'blurOutStagger', { apply: function (m) {
    var L = m.L, fs = m.size, B = Math.max(0.5, Math.min(fs * 0.09, jzU(m.ctx) * 0.02 / ex1_scale(L)));
    var q = ex1_H(m) + ex1_q(m, 0.55) + 'var e=ios(q);';
    jzAnimator(L, 'JZ Out Blur', [['ADBE Text Blur', [B, B]], ['ADBE Text Scale 3D', [122, 122, 100]], ['ADBE Text Position 3D', [0, -fs * 0.12, 0]]], q + 'q<=0?0:e*100');
    jzAnimator(L, 'JZ Out Fade', [['ADBE Text Opacity', 0]], q + 'q*100');
} });

// ================================================================ line work
/* ---- undraw — 線に戻る: the fill empties out leaving the outline, then the outline is erased stroke by stroke (fine
   diagonal blinds closing = the browser's shrinking dashes) */
jzReg('exit', 'undraw', { apply: function (m) {
    var L = m.L, fs = m.size, ev = ex1_H(m) + 'var a=cl(PO/0.3),b=cl((PO-0.24)/0.76);';
    if (ex1_addStroke(L)) jzAnimator(L, 'JZ Out Line', [['ADBE Text Stroke Width', Math.max(0.6, fs * 0.022)]], ev + EX1_OWNSTROKE + 's0>0.5?0:cl(PO/0.06)*100');
    jzAnimator(L, 'JZ Out Fill', [['ADBE Text Fill Opacity', 0]], ev + 'ios(a)*100');
    var vb = jzEffect(L, 'ADBE Venetian Blinds', 'JZ Out Undraw');
    jzEP(vb, 2, 35); jzEP(vb, 3, Math.max(3, fs * 0.2)); jzEP(vb, 4, 0);
    jzEX(vb, 1, ev + 'ios(b)*100');
    m.parts.op.push(ex1_fade(0.9, 1, 'x1u'));
} });

/* ---- outlineOut — 塗りが抜ける: the fill drains away (level falling from the top) while an accent outline copy of each glyph
   appears, then swells and fades, left to right */
jzReg('exit', 'outlineOut', { apply: function (m) {
    var L = m.L, G = ex1_geo(m, false), fs = G.fs, H = ex1_H(m), sc = m.ctx.sc, acc = ex1_hex(sc.accent, sc.fg);
    var D = (!ex1_matted(L) && !ex1_crowded(m, G)) ? ex1_twin(m, 'JZ Out Outline', false) : null;
    var ev = H + ex1_q(m, 0.35) + 'var k=ios(cl(q/0.7)),u=cl((q-0.68)/0.32);';
    // the fill drains line by line: one level per line (timed like the line's middle glyph) falling from above the glyphs to
    // below them; with several lines, alternate lines go to a linked copy so a line's drain box never shows the next line
    var cp = (ex1_td(L).applyFill !== false) ? ex1_clipPlan(m, G) : null, Ls = cp && cp.D ? [L, cp.D] : [L], i, j;
    for (i = 0; i < Ls.length; i++) jzAnimator(Ls[i], 'JZ Out Hide', [['ADBE Text Opacity', 0]], ev + 'k>=0.999?100:0');
    if (cp) {
        var r = G.rect, hh = fs * 0.72, nA = 0, nB = 0;
        for (i = 0; i < G.nL; i++) {
            var a = -1, b = -1;
            for (j = 0; j < G.N; j++) if (G.g[j].li === i) { if (a < 0) a = j; b = j; }
            if (a < 0) continue;
            var o = G.N > 1 ? (a + b) / 2 / (G.N - 1) : ex1_om(m), cy = G.lines[i].cy, onB = !!cp.D && i % 2 === 1, first = onB ? !nB : !nA;
            var lv = H + 'var qm=cl((PO-' + jzN(0.35 * o) + ')/0.65),km=ios(cl(qm/0.7));';
            ex1_mask(onB ? cp.D : L, r.left - fs * 1.6, cy - hh, r.left + r.width + fs * 1.6, cy + hh * 3, first, lv + 'km>=0.999?0:100',
                lv + (!onB && first ? 'time<OS?1e4:' : '') + '-' + jzN(hh * 2) + '*km', 'JZ Out Drain ' + (i + 1));
            if (onB) nB++; else nA++;
        }
    } else jzAnimator(L, 'JZ Out Fill', [['ADBE Text Fill Opacity', 0]], ev + 'k*100');
    if (!D) return;
    var lw = Math.max(1, fs * 0.024);
    jzTextDoc(D, function (d) {
        d.applyFill = false; d.applyStroke = true; d.strokeColor = jzHex(acc); d.strokeWidth = lw;
        try { d.strokeOverFill = true; } catch (e) {}
    });
    jzAnimator(D, 'JZ Out Swell', [['ADBE Text Scale 3D', [130, 130, 100]]], ev + 'q<=0||q>=1?0:oc(u)*100');
    jzAnimator(D, 'JZ Out Line', [['ADBE Text Opacity', 0]], ev + 'q<=0||q>=1?100:(1-Math.min(1,q*8)*(1-u))*100');
} });

// ================================================================ clip shapes
/* ---- irisClose — アイリス: a circular iris closes on the text box centre, an accent ring riding its edge */
jzReg('exit', 'irisClose', { apply: function (m) {
    var L = m.L, r = ex1_rect(m), fs = m.size, H = ex1_H(m), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    var R0 = Math.sqrt(r.width * r.width + r.height * r.height) * 0.5 + fs * 0.12;
    var ev = H + 'var rad=' + jzN(R0) + '*(1-io3(PO));';
    // a tiny circle grown by mask expansion (an exact circle in AE)
    ex1_circ(L, cx, cy, 1, true, ev + 'rad<0.5?0:100', ev + 'time<OS?1e4:Math.max(0,rad-1)', 'JZ Out Iris');
    if (ex1_crowded(m)) return;
    var lw = Math.max(1.5 * m.u, fs * 0.035), S = jzNoGhost(ex1_shape(m, 'JZ Out Iris Ring')), g = jzGrp(S, 'ring'), el = jzAddEllipse(g, 10, 10);
    jzAddStroke(g, ex1_hex(m.ctx.sc.accent, m.ctx.sc.fg), lw);
    jzGX(g).property('ADBE Vector Position').setValue([cx, cy]);
    jzSetExpr(el.property('ADBE Vector Ellipse Size'), ev + 'var d=(rad+' + jzN(lw / 2) + ')*2;[d,d]');
    jzSetExpr(jzGX(g).property('ADBE Vector Group Opacity'), ev + 'rad<0.5?0:Math.min(1,PO*6)*(1-sm(0.9,1,PO))*100');
} });

/* ---- diagWipeOut — 斜めワイプ: a slanted edge sweeps across the text (angle from the cut seed), an accent bar riding it */
jzReg('exit', 'diagWipeOut', { apply: function (m) {
    var L = m.L, r = ex1_rect(m), fs = m.size, H = ex1_H(m), W = m.W, Hh = m.H, i;
    var v = (ex1_h(m.c.seed | 0, 77) >>> 3) & 3, ang = [22, -22, 158, 202][v];
    var rho = jzXf(L, 'ADBE Rotate Z').value, ks = ex1_scale(L), a = (ang - rho) * Math.PI / 180;
    var dx = Math.cos(a), dy = Math.sin(a), tx = -dy, ty = dx, pad = fs * 0.15;
    // u = along the wipe direction, w = along the edge (layer space)
    var cs = [[r.left - pad, r.top - pad], [r.left + r.width + pad, r.top - pad], [r.left - pad, r.top + r.height + pad], [r.left + r.width + pad, r.top + r.height + pad]];
    var u0 = 1e9, u1 = -1e9, w0 = 1e9, w1 = -1e9;
    for (i = 0; i < 4; i++) { var uu = cs[i][0] * dx + cs[i][1] * dy; if (uu < u0) u0 = uu; if (uu > u1) u1 = uu; }
    var sc = [[0, 0], [W, 0], [0, Hh], [W, Hh]];
    for (i = 0; i < 4; i++) { var p = ex1_toLayer(L, sc[i][0], sc[i][1]), ww = p[0] * tx + p[1] * ty; if (ww < w0) w0 = ww; if (ww > w1) w1 = ww; }
    var th = Math.max(2, Math.min(W, Hh) * 0.011) / ks, uA = u0 - th, span = u1 + th - uA, M = (W + Hh) * 4 / ks, wc = (w0 + w1) / 2;
    var P = function (u, w) { return [dx * u + tx * w, dy * u + ty * w]; };
    var ev = H + 'var sp=' + jzN(span) + '*io3(PO);';
    // the visible half-plane u >= edge: a big rect whose near edge starts before the text, pushed along by negative expansion
    ex1_poly(L, [P(uA, wc - M), P(uA, wc + M), P(uA + 2 * M, wc + M), P(uA + 2 * M, wc - M)], true, ev + 'PO>=0.999?0:100', ev + 'time<OS?1e4:-sp', 'JZ Out Diag');
    if (Math.abs(+m.o.mi || 0) > 1e-6 || ex1_crowded(m)) return;      // the bar is drawn once (by the first item)
    var len = (w1 - w0) + Math.max(W, Hh) * 0.2 / ks, S = jzNoGhost(ex1_shape(m, 'JZ Out Wipe Bar')), g = jzGrp(S, 'bar');
    jzAddRect(g, th, len, 0);
    jzAddFill(g, ex1_hex(m.ctx.sc.accent, m.ctx.sc.fg));
    jzGX(g).property('ADBE Vector Rotation').setValue(ang - rho);
    jzSetExpr(jzGX(g).property('ADBE Vector Position'), ev + 'var u=' + jzN(uA - th / 2) + '+sp;[' + jzN(dx) + '*u+' + jzN(tx * wc) + ',' + jzN(dy) + '*u+' + jzN(ty * wc) + ']');
    jzSetExpr(jzGX(g).property('ADBE Vector Group Opacity'), ev + 'PO>0&&PO<0.999?100:0');
} });

/* ---- blindsClose — ブラインド: the text is cut into thin blinds that close one after another (top to bottom; vertical text
   left to right) */
jzReg('exit', 'blindsClose', { apply: function (m) {
    var L = m.L, G = ex1_geo(m, false), r = G.rect, fs = G.fs, vert = G.vert, H = ex1_mini(m), j;
    var pad = fs * 0.2, x0 = r.left - pad, y0 = r.top - pad, x1 = r.left + r.width + pad, y1 = r.top + r.height + pad;
    var span = vert ? x1 - x0 : y1 - y0, cnt = jzClamp(Math.ceil(span / Math.max(4, fs * 0.26)), 2, 90), pitch = span / cnt, e = pitch / 2 + 1;
    if (ex1_mstate(L) === 'clip') {        // the layout clips this layer: Venetian Blinds instead of a union of masks
        var vb = jzEffect(L, 'ADBE Venetian Blinds', 'JZ Out Blinds');
        jzEP(vb, 2, vert ? 0 : 90); jzEP(vb, 3, pitch); jzEP(vb, 4, 0);
        jzEX(vb, 1, H + 'Math.pow(PO,0.85)*100');
        return;
    }
    for (j = 0; j < cnt; j++) {
        var o = cnt > 1 ? j / (cnt - 1) : 0, ev = H + 'var q=cl((PO-' + jzN(0.4 * o) + ')/0.6),h=' + jzN(pitch) + '*(1-Math.pow(q,0.85));';
        var ex = ev + (j ? '' : 'time<OS?1e4:') + '-(' + jzN(pitch) + '-h)/2+0.4';
        if (vert) ex1_mask(L, x0 + j * pitch, y0 - e, x0 + (j + 1) * pitch, y1 + e, !j, ev + 'h>0.05?100:0', ex, 'JZ Out Blind ' + (j + 1));
        else ex1_mask(L, x0 - e, y0 + j * pitch, x1 + e, y0 + (j + 1) * pitch, !j, ev + 'h>0.05?100:0', ex, 'JZ Out Blind ' + (j + 1));
    }
} });

/* ---- checkerOut — 市松: the text breaks into a checkerboard of squares that shrink away along a diagonal, one colour first */
jzReg('exit', 'checkerOut', { apply: function (m) {
    var L = m.L, G = ex1_geo(m, false), r = G.rect, fs = G.fs, H = ex1_mini(m), x, y;
    var pad = fs * 0.15, x0 = r.left - pad, y0 = r.top - pad, w = r.width + pad * 2, h = r.height + pad * 2;
    var cell = Math.max(4, fs * 0.26);
    while ((w / cell) * (h / cell) > 160) cell *= 1.25;          // (browser: 420 cells; masks are heavier)
    var nx = Math.ceil(w / cell), ny = Math.ceil(h / cell), dg = Math.max(1, nx + ny - 2), c1 = cell + 0.8;
    if (ex1_mstate(L) === 'clip') {        // the layout clips this layer: blocks dissolve instead of a union of masks
        var bd = jzEffect(L, 'ADBE Block Dissolve', 'JZ Out Checker');
        jzEP(bd, 2, cell); jzEP(bd, 3, cell); jzEP(bd, 4, 0); jzEP(bd, 5, 0);
        jzEX(bd, 1, H + 'cl(PO/0.9)*100');
        return;
    }
    for (y = 0; y < ny; y++) for (x = 0; x < nx; x++) {
        var st = ((x + y) & 1) * 0.42 + (x + y) / dg * 0.3, cx = x0 + (x + 0.5) * cell, cy = y0 + (y + 0.5) * cell;
        var ev = H + 'var t=cl((PO-' + jzN(st) + ')/0.28),k=1-t*t;';
        var ex = ev + (x || y ? '' : 'time<OS?1e4:') + '-(' + jzN(c1) + '-(' + jzN(cell) + '*k+(k>0.98?0.8:0)))/2';
        ex1_mask(L, cx - c1 / 2, cy - c1 / 2, cx + c1 / 2, cy + c1 / 2, !(x || y), ev + 'k>0.02?100:0', ex, 'JZ Out Cell ' + (y * nx + x + 1));
    }
} });
