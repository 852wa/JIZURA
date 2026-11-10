// ================================================================ pack x2entA (AE port of src/11p_x2_entA.js) — 30 per-glyph entrances
// xeCenterDeal xeEndsInward xeFillGaps xeKanjiFirst xeTripleBeat xeMarch xeBlockDrop / xeArcToss xeOrbitIn xeRicochet xeLeapfrog
// xeCeilingFall xeChainBump xeVanishPoint xeInchworm / xeSwingDoor xeSkewFlap xeGlyphCurtain xeCellSlide xeGearTick xeCoinToss
// xeBellows xeUnevenScale / xeRedact xeBlanks xeCloneMorph / xePieceRain xePieceVortex xePieceStrata xePiecePile
// Per-glyph motion = text animators with Expression Selectors. Every part writes ONE expression body that sets the browser's
// per-glyph values (dx dy rot sx sy sk a) for the glyph textIndex; axe_emit() turns it into Move / Turn / Size / Skew / Hide
// animators (same order as the browser: scale, skew, rotation, offset — all about the glyph centre). Per-glyph constants the
// browser takes from its layout (slot positions, order in the line, seeded randoms) are computed here and embedded as arrays.
// Placeholder glyphs (■ □) are shape rects parented to the text layer; clones / clipped glyphs are linked copies ("twins").
// The four stroke-piece parts (xePiece…) cannot split glyphs into strokes in AE: they use the browser's own glyph-level
// stand-ins (its fallback for outline / gradient items); xePieceStrata additionally slices the line into 5 sliding rows.

// ---------------------------------------------------------------- shared helpers (axe_*)
// easings not in JZ_FNS: o4 outQuart, io3 inOutCubic, ios inOutSine, spr damped spring (1 -> 0), tri triangle wave -1..1
var AXE_FNS = 'function o4(x){x=cl(x);return 1-Math.pow(1-x,4);}' +
    'function io3(x){x=cl(x);return x<0.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;}function ios(x){x=cl(x);return -(Math.cos(Math.PI*x)-1)/2;}' +
    'function spr(t,k,f){t=cl(t);return Math.exp(-k*t)*Math.cos(f*Math.PI*t)*(1-t*t*t);}' +
    'function tri(x){return 2*Math.abs(2*(x-Math.floor(x+0.5)))-1;}\n';
var AXE_PERM3 = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
function axe_T(m) { var c = m.c; return { IN: Math.max(0.02, c.inDur || 0.3), DL: (m.o.mi || 0) * (c.stagger || 0.04) }; }
// compact header for helper layers (IN, DL, SZ, SD, P + easings)
function axe_head(m) { var t = axe_T(m); return 'var IN=' + jzN(t.IN) + ',DL=' + jzN(t.DL) + ',SZ=' + jzN(m.size) + ',SD=' + ((m.c.seed % 99991) + (m.o.mi || 0) * 101) + ';' + JZ_FNS + AXE_FNS + 'var P=cl((time-DL)/IN);\n'; }
function axe_arr(a) { var s = [], i; for (i = 0; i < a.length; i++) s.push(jzN(a[i])); return '[' + s.join(',') + ']'; }
function axe_isHex(c) { return typeof c === 'string' && c.charAt(0) === '#' && (c.length === 7 || c.length === 4); }
function axe_pick(a, b, c) { if (axe_isHex(a)) return a; if (axe_isHex(b)) return b; if (axe_isHex(c)) return c; return '#FFFFFF'; }
// the browser's J.h / J.r (so seeded directions and per-glyph randoms match the web version)
function axe_h(a, b, c, d, e) {
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
function axe_r(a, b, c, d) { return axe_h(a, b, c, d) / 4294967296; }
function axe_dir(m, salt) { return axe_r(m.c.seed | 0, salt, 5) < 0.5 ? -1 : 1; }
function axe_isSp(ch) { return ch === ' ' || ch === '　' || ch === '\t'; }
function axe_adv(ch) {
    var c = ch.charCodeAt(0);
    if (ch === ' ') return 0.3;
    if (c >= 0xFF61 && c <= 0xFF9F) return 0.5;
    return c < 0x2000 ? 0.56 : 1;
}
// glyph geometry in the text layer's own space, one entry per AE character (textIndex order, spaces included):
//   G.g[i] {i, li (AE line), sp, ch, x, y (centre), w, h, ci, n, l}; ci / n = index / glyph count in the browser's line and
//   l = {x0, y0, x1, y1, cx, cy} first / last / middle slot of that line (a vertical column = one glyph per AE line = ONE line)
//   G.r source rect; G.fs; G.vert; G.lines[{cy, x0, x1, n}]; G.n = textTotal; G.nk glyphs without spaces; G.arranged; G.masked
function axe_geo(m, Lx) {
    var L = Lx || m.L, TP = L.property('ADBE Text Properties'), td = TP.property('ADBE Text Document').value, r = jzRect(L), i, j;
    var fs = td.fontSize || m.size, text = String(td.text), trk = (td.tracking || 0) / 1000 * fs;
    var lines = text.split(/\r\n|\r|\n|\u0003/), nL = lines.length, lead = fs * 1.2;
    try { if (!td.autoLeading && td.leading > 0) lead = td.leading; } catch (e0) {}
    var just = 'c';
    try { if (td.justification === ParagraphJustification.LEFT_JUSTIFY) just = 'l'; else if (td.justification === ParagraphJustification.RIGHT_JUSTIFY) just = 'r'; } catch (e1) {}
    var G = { fs: fs, lead: lead, nL: nL, r: r, n: 0, nk: 0, g: [], lines: [], vert: nL > 1, arranged: false, masked: false, text: text };
    try { G.arranged = TP.property('ADBE Text Animators').numProperties > 0; } catch (e2) {}
    try { if (TP.property('ADBE Text Path Options').property('ADBE Text Path').value > 0) G.arranged = true; } catch (e3) {}
    try { G.masked = L.property('ADBE Mask Parade').numProperties > 0; } catch (e4) {}
    var rows = [], maxW = 0;
    for (i = 0; i < nL; i++) {
        var cs = jzChars(lines[i]), ws = [], w = 0;
        for (j = 0; j < cs.length; j++) { var a = axe_adv(cs[j]) * fs; ws.push(a); w += a + (j < cs.length - 1 ? trk : 0); }
        if (cs.length > 1) G.vert = false;
        rows.push({ cs: cs, ws: ws, w: w }); if (w > maxW) maxW = w;
    }
    var k = maxW > 0 ? r.width / maxW : 1; if (!(k > 0.5 && k < 2)) k = 1;
    var lh = r.height - (nL - 1) * lead; if (!(lh > fs * 0.5 && lh < fs * 1.6)) lh = fs * 0.95;
    var cx = r.left + r.width / 2;
    for (i = 0; i < nL; i++) {
        var R = rows[i], x = just === 'l' ? r.left : (just === 'r' ? r.left + r.width - R.w * k : cx - R.w * k / 2), y = r.top + lh / 2 + i * lead;
        var ln = { cy: y, x0: x, x1: x + R.w * k, n: 0 };
        for (j = 0; j < R.cs.length; j++) {
            var sp = axe_isSp(R.cs[j]);
            G.g.push({ i: G.n, li: i, sp: sp, ch: R.cs[j], x: x + R.ws[j] * k / 2, y: y, w: Math.max(1, R.ws[j] * k), h: fs, ci: 0, n: 1, l: null });
            x += (R.ws[j] + trk) * k; G.n++;
            if (!sp) { G.nk++; ln.n++; }
        }
        G.lines.push(ln);
    }
    G.cx = cx; G.cy = r.top + r.height / 2;
    // the browser's lines
    var s = 0;
    while (s < G.n) {
        var e = s;
        while (e + 1 < G.n && (G.vert || G.g[e + 1].li === G.g[s].li)) e++;
        var A = G.g[s], B = G.g[e], li = { x0: A.x, y0: A.y, x1: B.x, y1: B.y, cx: (A.x + B.x) / 2, cy: (A.y + B.y) / 2 };
        for (i = s; i <= e; i++) { G.g[i].ci = i - s; G.g[i].n = e - s + 1; G.g[i].l = li; }
        s = e + 1;
    }
    return G;
}
// 0 at the middle of the glyph's line -> 1 at both ends / which side of the middle (-1, 0, 1)
function axe_ctr(g) { return g.n > 1 ? Math.abs(g.ci - (g.n - 1) / 2) / ((g.n - 1) / 2) : 0; }
function axe_side(g) { var d = g.n > 1 ? g.ci - (g.n - 1) / 2 : 0; return d > 0 ? 1 : (d < 0 ? -1 : 0); }
function axe_ord(i, n) { return n > 1 ? i / (n - 1) : 0; }
// layouts that give every glyph its own text layer: the layer index stands in for the glyph index (parity, seeded randoms)
function axe_idx(m, G, i) { return G.n <= 1 ? (m.o.mi || 0) : i; }
function axe_multi(m, G) { return G.n > 1 || jzCount(m.c.text || '') > 1; }
// the lyric's main copy (not a faded / outline copy)
function axe_main(m) {
    try {
        var td = m.L.property('ADBE Text Properties').property('ADBE Text Document').value;
        if (td.applyFill === false) return false;
        return jzXf(m.L, 'ADBE Opacity').value >= 85;
    } catch (e) { return true; }
}
function axe_matted(L) { try { return L.trackMatteType !== TrackMatteType.NO_TRACK_MATTE; } catch (e) { return false; } }
// helper layers / twins are skipped for very long lines, for one-glyph-per-layer layouts of long lyrics and when the comp is crowded
function axe_crowded(m, G) {
    if (G && (G.n > 60 || (G.nk <= 1 && jzCount(m.c.text || '') > 14))) return true;
    try { return m.ctx.comp.numLayers > 60; } catch (e) { return false; }
}
function axe_top(m) { var L = m.L; if (axe_matted(L)) { try { return m.ctx.comp.layer(L.index - 1); } catch (e) {} } return L; }
// helper shape layer in the text layer's own space (parented to it, right above it), only alive during the entrance
function axe_shape(m, name) {
    var L = m.L, S = m.ctx.comp.layers.addShape(), t = axe_T(m);
    S.name = name;
    try { S.moveBefore(axe_top(m)); } catch (e0) {}
    S.parent = L;
    var tr = S.property('ADBE Transform Group');
    tr.property('ADBE Anchor Point').setValue([0, 0]); tr.property('ADBE Position').setValue([0, 0]);
    tr.property('ADBE Scale').setValue([100, 100]); tr.property('ADBE Rotate Z').setValue(0);
    try { S.outPoint = Math.max(S.inPoint + 0.05, Math.min(S.outPoint, t.DL + t.IN + 0.1)); } catch (e1) {}
    return S;
}
// linked copy of the text layer: parented to L (follows every move of it), takes L's final text style by expression
// (the treatment is applied later) but keeps its own characters, shows only during the entrance
function axe_twin(m, tag, text) {
    var L = m.L, D = L.duplicate(), t = axe_T(m), i, mns = ['ADBE Position', 'ADBE Scale', 'ADBE Rotate Z', 'ADBE Opacity', 'ADBE Anchor Point'];
    try { D.name = String(L.name).substr(0, 20) + ' ' + tag; } catch (e0) {}
    var tr = D.property('ADBE Transform Group');
    for (i = 0; i < mns.length; i++) { try { if (tr.property(mns[i]).expression) tr.property(mns[i]).expression = ''; } catch (e1) {} }
    D.parent = L;
    tr.property('ADBE Scale').setValue([100, 100]); tr.property('ADBE Rotate Z').setValue(0);
    jzSetExpr(tr.property('ADBE Position'), 'parent.transform.anchorPoint');
    jzSetExpr(tr.property('ADBE Opacity'), axe_head(m) + 'time>=DL&&time<DL+IN?value:0');
    if (text != null) jzTextDoc(D, function (d) { d.text = text; });
    try { D.property('ADBE Text Properties').property('ADBE Text Document').expression = 'parent.text.sourceText.style.setText(value.text)'; } catch (e2) {}
    try { D.outPoint = Math.max(D.inPoint + 0.05, Math.min(D.outPoint, t.DL + t.IN + 0.1)); } catch (e3) {}
    return D;
}
// expression prelude of every per-glyph body: i (0-based glyph), n, o (= ordLR), j (index for parity), FS + the browser values
function axe_pre(m, G) {
    return m.HD + AXE_FNS + 'var i=textIndex-1,n=textTotal,o=n>1?i/(n-1):0,j=' + (G.n <= 1 ? String(m.o.mi || 0) : 'i') + ',FS=' + jzN(G.fs) +
        ',dx=0,dy=0,rot=0,sx=1,sy=1,sk=0,a=1;';
}
// body -> animators. f: { K: px range of dx / dy, R: degrees range of rot, S: range of |1 - scale|, SK: degrees range of sk,
// col: [hex, 'condition'], tag }   (a = glyph alpha 0..1; everything is at rest once the entrance is over)
function axe_emit(m, G, body, f, Lx) {
    var L = Lx || m.L, pre = axe_pre(m, G) + body, t = f.tag || 'JZ In';
    if (f.S) jzAnimator(L, t + ' Size', [['ADBE Text Scale 3D', [100 - 100 * f.S, 100 - 100 * f.S, 100]]], pre + 'P<1?[(1-sx)/' + jzN(f.S) + '*100,(1-sy)/' + jzN(f.S) + '*100,0]:[0,0,0]');
    if (f.SK) jzAnimator(L, t + ' Skew', [['ADBE Text Skew', f.SK]], pre + 'P<1?sk/' + jzN(f.SK) + '*100:0');
    if (f.R) jzAnimator(L, t + ' Turn', [['ADBE Text Rotation', f.R]], pre + 'P<1?rot/' + jzN(f.R) + '*100:0');
    if (f.K) jzAnimator(L, t + ' Move', [['ADBE Text Position 3D', [f.K, f.K, 0]]], pre + 'P<1?[dx/' + jzN(f.K) + '*100,dy/' + jzN(f.K) + '*100,0]:[0,0,0]');
    if (f.col) jzAnimator(L, t + ' Flash', [['ADBE Text Fill Color', jzHex(f.col[0])]], pre + 'P<1&&(' + f.col[1] + ')?100:0');
    jzAnimator(L, t + ' Hide', [['ADBE Text Opacity', 0]], pre + 'P<1?(1-Math.max(0,Math.min(1,a)))*100:0');
}
function axe_maxAbs(a, b) { var k = 0, i; for (i = 0; i < a.length; i++) k = Math.max(k, Math.abs(a[i])); if (b) for (i = 0; i < b.length; i++) k = Math.max(k, Math.abs(b[i])); return k; }

/* =====================================================================
   A. ORDERING PATTERNS
   ===================================================================== */

/* ---- xeCenterDeal — 中央から配る: every glyph starts stacked on the middle of its line and is dealt outwards like cards, middle first */
jzReg('enter', 'xeCenterDeal', { selfHide: true, apply: function (m) {
    var G = axe_geo(m), CT = [], SI = [], DX = [], DY = [], i;
    for (i = 0; i < G.n; i++) { var g = G.g[i]; CT.push(axe_ctr(g)); SI.push(axe_side(g)); DX.push(g.l.cx - g.x); DY.push(g.l.cy - g.y); }
    axe_emit(m, G, 'var CT=' + axe_arr(CT) + ',SI=' + axe_arr(SI) + ',DX=' + axe_arr(DX) + ',DY=' + axe_arr(DY) + ';' +
        'var q=cl((P-0.45*(CT[i]||0))/0.55),k=1-ob(q,1.25),c3=oc(q);dx=(DX[i]||0)*k;dy=(DY[i]||0)*k;rot=(SI[i]||0)*(1-c3)*22;sx=sy=0.72+0.28*c3;a=cl(q*5);',
        { K: axe_maxAbs(DX, DY) * 1.2 + 1, R: 22, S: 1 });
} });

/* ---- xeEndsInward — 両端から: the outermost pair slides in first, then pair after pair closes in; the middle glyph punches in last */
jzReg('enter', 'xeEndsInward', { selfHide: true, apply: function (m) {
    var G = axe_geo(m), CT = [], SI = [], i;
    for (i = 0; i < G.n; i++) { CT.push(axe_ctr(G.g[i])); SI.push(axe_side(G.g[i])); }
    axe_emit(m, G, 'var CT=' + axe_arr(CT) + ',SI=' + axe_arr(SI) + ';' +
        'var q=cl((P-0.5*(1-(CT[i]||0)))/0.5),sd=SI[i]||0,k=1-o4(q);a=cl(q*4);' +
        'if(sd){' + (G.vert ? 'sy=1+k*0.7;dy=' : 'sx=1+k*0.7;dx=') + 'sd*k*FS*1.7;}else{sx=sy=1.9-0.9*ob(q,1.4);}',
        { K: G.fs * 1.8, S: 1 });
} });

/* ---- xeFillGaps — 隙間埋め: every other glyph fades in first, leaving gaps; the missing ones then fall into the gaps and jolt their neighbours */
jzReg('enter', 'xeFillGaps', { selfHide: true, apply: function (m) {
    var G = axe_geo(m), CI = [], T0 = [], NA = [], NB = [], i, solo = G.n <= 1;
    for (i = 0; i < G.n; i++) { CI.push(solo ? (m.o.mi || 0) : G.g[i].ci); T0.push(0.36 + axe_ord(i, G.n) * 0.34); }
    for (i = 0; i < G.n; i++) { NA.push(i > 0 && CI[i - 1] % 2 === 1 ? T0[i - 1] : 9); NB.push(i + 1 < G.n && CI[i + 1] % 2 === 1 ? T0[i + 1] : 9); }
    axe_emit(m, G, 'var CI=' + axe_arr(CI) + ',T0=' + axe_arr(T0) + ',NA=' + axe_arr(NA) + ',NB=' + axe_arr(NB) + ',ci=CI[i]||0;' +
        'if(ci%2==0){var q=cl((P-o*0.18)/0.28),jo=0,v=(P-NA[i]-0.26)/0.2;if(v>0&&v<1)jo+=Math.sin(v*Math.PI)*(1-v);v=(P-NB[i]-0.26)/0.2;if(v>0&&v<1)jo+=Math.sin(v*Math.PI)*(1-v);' +
        'sx=sy=0.82+0.18*oc(q);a=q<=0?0:ios(q);dy=jo*FS*0.09;rot=jo*(ci%4?3:-3);}' +
        'else{var u=(P-T0[i])/0.26;if(u<=0)a=0;else if(u<1){dy=-(1-iq(u))*FS*1.5;a=cl(u*5);}' +
        'else{var v=cl((u-1)*0.26/0.14);if(v<1){var sq=1-0.2*Math.sin(v*Math.PI);sy=sq;sx=1+(1-sq)*0.6;dy=(1-sq)*FS*0.5;}}}',
        { K: G.fs * 1.6, R: 6, S: 1 });
} });

/* ---- xeKanjiFirst — 漢字が先: kanji (or word heads) drop in heavy and big; the kana then float up softly around them */
jzReg('enter', 'xeKanjiFirst', { selfHide: true, apply: function (m) {
    var G = axe_geo(m), HV = [], i, vis = G.nk, cnt = 0;
    for (i = 0; i < G.n; i++) { HV.push(!G.g[i].sp && jzIsKanji(G.g[i].ch) ? 1 : 0); cnt += HV[i]; }
    if (!cnt || cnt === vis) {
        cnt = 0;
        for (i = 0; i < G.n; i++) { HV[i] = !G.g[i].sp && (G.g[i].ci === 0 || G.g[i - 1].sp) ? 1 : 0; cnt += HV[i]; }
    }
    if (vis > 3 && (cnt <= 1 || cnt === vis)) for (i = 0; i < G.n; i++) HV[i] = G.g[i].ci % 3 === 0 ? 1 : 0;
    axe_emit(m, G, 'var HV=' + axe_arr(HV) + ';' +
        'if(HV[i]){var q=cl((P-o*0.22)/0.42),f=iq(q/0.55),v=cl((q-0.55)/0.45),w=Math.sin(v*Math.PI)*(1-v);dy=-(1-f)*FS*1.1-w*FS*0.1;sx=sy=(1.55-0.55*f)*(1+0.08*w);a=cl(q*6);}' +
        'else{var q=cl((P-0.36-o*0.26)/0.38),c3=oc(q);dy=(1-c3)*FS*0.42;a=ios(q);sx=sy=0.9+0.1*c3;}',
        { K: G.fs * 1.3, S: 1 });
} });

/* ---- xeTripleBeat — 三拍子: the glyphs are dealt into three groups that snap on, on three hard beats */
jzReg('enter', 'xeTripleBeat', { selfHide: true, apply: function (m) {
    var G = axe_geo(m), GR = [], i, seed = m.c.seed | 0, sc = m.ctx.sc, col = jzTextColor(m.L);
    for (i = 0; i < G.n; i++) GR.push(G.n <= 1 ? (m.o.mi || 0) % 3 : (G.n < 3 ? i % 3 : AXE_PERM3[axe_h(seed, Math.floor(i / 3), 41) % 6][i % 3]));
    var hot = String(col).toUpperCase() === String(sc.accent || '').toUpperCase() ? axe_pick(sc.accent2, sc.fg) : axe_pick(sc.accent, sc.fg);
    axe_emit(m, G, 'var GR=' + axe_arr(GR) + ',u=(P-0.03-(GR[i]||0)*0.31)/0.3;' +
        'if(u<=0)a=0;else if(u<1){var k=Math.pow(1-u,3);sx=sy=1+0.5*k;dy=-k*FS*0.06;}',
        { K: G.fs * 0.1, S: 1, col: [hot, 'u>0&&u<0.3'] });
} });

/* ---- xeMarch — 行進: the line walks in from the side in a few steps, every glyph waddling from foot to foot */
jzReg('enter', 'xeMarch', { selfHide: true, apply: function (m) {
    var G = axe_geo(m), dir = axe_dir(m, 11);
    axe_emit(m, G, 'var lead=' + (dir > 0 ? '1-o' : 'o') + ',q=cl(P*1.14-lead*0.14),k=q*5,fl=Math.floor(k),fr=cl((k-fl)/0.62),pg=(fl+io3(fr))/5,hop=Math.sin(fr*Math.PI),al=' + jzN(dir) + '*(1-pg)*FS*2.4;' +
        (G.vert ? 'dy=al-hop*FS*0.13;' : 'dx=al;dy=-hop*FS*0.13;') + 'rot=((fl+j)%2?1:-1)*hop*10;a=cl(q*5);',
        { K: G.fs * 2.6, R: 10 });
} });

/* ---- xeBlockDrop — 落ちゲー: glyphs come down like falling blocks: grid steps, one sideways shift and one quarter turn on the way */
jzReg('enter', 'xeBlockDrop', { selfHide: true, apply: function (m) {
    var G = axe_geo(m), seed = m.c.seed | 0, DD = [], SG = [], i, step = G.fs * 0.44, multi = axe_multi(m, G);
    for (i = 0; i < G.n; i++) { var x = axe_idx(m, G, i); DD.push(multi ? axe_r(seed, x, 51) * 0.52 : 0); SG.push(axe_r(seed, x, 52) < 0.5 ? -1 : 1); }
    axe_emit(m, G, 'var DD=' + axe_arr(DD) + ',SG=' + axe_arr(SG) + ',ST=' + jzN(step) + ',u=(P-(DD[i]||0))/0.46;' +
        'if(u<=0)a=0;else if(u<1){var k=Math.floor(u*6),sg=SG[i]||1;dy=-(6-k)*ST;dx=k<2?sg*ST:0;rot=k<4?sg*90:0;}',
        { K: step * 6.2, R: 90 });
} });

/* =====================================================================
   B. PER-GLYPH PATHS
   ===================================================================== */

/* ---- xeArcToss — 放り投げ: all glyphs are thrown from one point below the line and land in their slots along parabolas */
jzReg('enter', 'xeArcToss', { selfHide: true, apply: function (m) {
    var G = axe_geo(m), r = G.r, fs = G.fs, dir = axe_dir(m, 13), EX = [], EY = [], i, K = 1;
    var ox = (dir > 0 ? r.left : r.left + r.width) - dir * fs * 0.8, oy = r.top + r.height + fs * 1.6;
    for (i = 0; i < G.n; i++) {
        EX.push(ox - G.g[i].x); EY.push(oy - G.g[i].y);
        K = Math.max(K, Math.abs(EX[i]), Math.abs(EY[i]) + fs * 1.7 + Math.abs(EX[i]) * 0.18);
    }
    axe_emit(m, G, 'var EX=' + axe_arr(EX) + ',EY=' + axe_arr(EY) + ',q=cl((P-0.5*' + (dir > 0 ? 'o' : '(1-o)') + ')/0.5),t=oc(q),ex=EX[i]||0,ey=EY[i]||0,h=FS*1.7+Math.abs(ex)*0.18;' +
        'dx=ex*(1-t);dy=ey*(1-t)-4*h*t*(1-t);rot=' + jzN(-dir * 210) + '*(1-t);sx=sy=0.45+0.55*t;a=cl(q*5);',
        { K: K + 1, R: 210, S: 1 });
} });

/* ---- xeOrbitIn — 小回り: each glyph, upright, circles its own slot on a shrinking orbit; neighbours turn opposite ways */
jzReg('enter', 'xeOrbitIn', { selfHide: true, apply: function (m) {
    var G = axe_geo(m);
    axe_emit(m, G, 'var q=cl((P-0.4*o)/0.6),c3=oc(q),k=1-c3,an=-Math.PI/2+(j%2?1:-1)*k*Math.PI*2.4,r=FS*0.95*k;dx=Math.cos(an)*r;dy=Math.sin(an)*r;sx=sy=0.6+0.4*c3;a=cl(q*4);',
        { K: G.fs, S: 1 });
} });

/* ---- xeRicochet — 跳ね返り: each glyph shoots in from the side zigzagging between two invisible walls, the corridor narrowing to its slot */
jzReg('enter', 'xeRicochet', { selfHide: true, apply: function (m) {
    var G = axe_geo(m), dir = axe_dir(m, 17);
    axe_emit(m, G, 'var q=cl((P-0.45*' + (dir > 0 ? '(1-o)' : 'o') + ')/0.55),k=Math.pow(1-q,1.5),w=tri(q*2.5+(j%2)*0.5),al=' + jzN(dir) + '*k*FS*3.2,cr=w*FS*0.95*(1-q);' +
        (G.vert ? 'dx=-cr;dy=al;' : 'dx=al;dy=cr;') + 'rot=w*14*(1-q);a=cl(q*6);',
        { K: G.fs * 3.3, R: 14 });
} });

/* ---- xeLeapfrog — 馬跳び: each glyph starts on its predecessor's slot and hops over into its own, the line laying itself out by leaps */
jzReg('enter', 'xeLeapfrog', { selfHide: true, apply: function (m) {
    var G = axe_geo(m), PX = [], PY = [], i, vert = G.vert;
    for (i = 0; i < G.n; i++) {
        var g = G.g[i];
        if (g.ci > 0) { PX.push(G.g[i - 1].x - g.x); PY.push(G.g[i - 1].y - g.y); }
        else { PX.push(vert ? 0 : -g.w); PY.push(vert ? -G.lead : 0); }
    }
    axe_emit(m, G, 'var PX=' + axe_arr(PX) + ',PY=' + axe_arr(PY) + ',q=cl((P-0.72*o)/0.28),t=io3(q/0.8),hop=Math.sin(t*Math.PI)*FS*0.85,v=cl((q-0.8)/0.2),sq=1-0.16*Math.sin(v*Math.PI);' +
        'dx=(PX[i]||0)*(1-t);dy=(PY[i]||0)*(1-t);a=cl(q*8);sy=sq;sx=1+(1-sq)*0.5;' + (vert ? 'dx+=hop;' : 'dy+=-hop+(1-sq)*FS*0.5;'),
        { K: axe_maxAbs(PX, PY) + G.fs, S: 1 });
} });

/* ---- xeCeilingFall — 天井から: the glyphs first hang upside down from a ceiling above the line, then let go one by one, turning over as they fall */
jzReg('enter', 'xeCeilingFall', { selfHide: true, apply: function (m) {
    var G = axe_geo(m);
    axe_emit(m, G, 'var qa=cl((P-o*0.14)/0.14),u=cl((P-0.3-o*0.38)/0.32);' +
        'if(qa<=0)a=0;else if(u<1){var f=iq(u/0.72),v=cl((u-0.72)/0.28),sq=1-0.18*Math.sin(v*Math.PI);dy=-(1-f)*FS*1.2+(1-sq)*FS*0.5;rot=180*(1-io3(u/0.72));a=qa*(0.6+0.4*cl(u*4));sy=sq;sx=1+(1-sq)*0.5;}',
        { K: G.fs * 1.3, R: 180, S: 1 });
} });

/* ---- xeChainBump — 玉突き: the first glyph slides in and hits the row; the knock runs down the line, each glyph appearing as it is struck */
jzReg('enter', 'xeChainBump', { selfHide: true, apply: function (m) {
    var G = axe_geo(m), CI = [], LN = [], i;
    for (i = 0; i < G.n; i++) { CI.push(G.g[i].ci); LN.push(G.g[i].n); }
    axe_emit(m, G, 'var CI=' + axe_arr(CI) + ',LN=' + axe_arr(LN) + ',ci=CI[i]||0,ln=LN[i]||1,al=0;' +
        'if(ci==0){if(P<0.26){al=-(1-iq(P/0.26))*FS*3;a=cl(P*9);}else{var v=cl((P-0.26)/0.3);al=-Math.sin(v*Math.PI)*(1-v)*FS*0.22;}}' +
        'else{var t=0.26+(ci-1)/Math.max(1,ln-1)*0.42,v=(P-t)/(1-t),last=ci==ln-1;if(v<=0)a=0;else if(v<1){var b=Math.sin(Math.min(1,v*1.6)*Math.PI)*(1-v);' +
        'al=b*FS*(last?0.9:0.34);a=cl(v*9);sx=sy=1+0.22*Math.pow(1-v,4);if(last)rot=b*16;}}' + (G.vert ? 'dy=al;' : 'dx=al;'),
        { K: G.fs * 3.1, R: 16, S: 1 });
} });

/* ---- xeVanishPoint — 消失点から: glyphs fly out of one far point high above the line, growing along perspective lines, in random order */
jzReg('enter', 'xeVanishPoint', { selfHide: true, apply: function (m) {
    var G = axe_geo(m), r = G.r, seed = m.c.seed | 0, VX = [], VY = [], RD = [], i, multi = axe_multi(m, G);
    var sc = jzXf(m.L, 'ADBE Scale').value, s0x = Math.abs(sc[0] / 100) || 1, s0y = Math.abs(sc[1] / 100) || 1;
    var vx = G.cx + axe_dir(m, 19) * Math.min(m.W * 0.12 / s0x, r.width * 0.3), vy = G.cy - Math.min(m.H * 0.3 / s0y, Math.max(G.fs * 2.2, r.height * 1.4));
    for (i = 0; i < G.n; i++) { VX.push(vx - G.g[i].x); VY.push(vy - G.g[i].y); RD.push(multi ? axe_r(seed, axe_idx(m, G, i), 23) : 0); }
    axe_emit(m, G, 'var VX=' + axe_arr(VX) + ',VY=' + axe_arr(VY) + ',RD=' + axe_arr(RD) + ',q=cl((P-0.42*(RD[i]||0))/0.58),k=q>=1?1:Math.max(0.03,Math.pow(q,2.2)*(1+0.12*Math.sin(q*Math.PI)));' +
        'dx=(VX[i]||0)*(1-k);dy=(VY[i]||0)*(1-k);sx=sy=k;a=cl(q*3);',
        { K: axe_maxAbs(VX, VY) + 1, S: 1 });
} });

/* ---- xeInchworm — 尺取り: each glyph stretches from the previous slot across to its own, then pulls its tail in, inching the line forward */
jzReg('enter', 'xeInchworm', { selfHide: true, apply: function (m) {
    var G = axe_geo(m), DI = [], AW = [], i, vert = G.vert;
    for (i = 0; i < G.n; i++) {
        var g = G.g[i], aw = Math.max(1, vert ? g.h : g.w), d = aw;
        if (g.ci > 0) d = vert ? g.y - G.g[i - 1].y : g.x - G.g[i - 1].x;
        DI.push(jzClamp(d, aw * 0.4, aw * 2.2)); AW.push(aw);
    }
    axe_emit(m, G, 'var DI=' + axe_arr(DI) + ',AW=' + axe_arr(AW) + ',q=cl((P-0.66*o)/0.34),di=DI[i]||FS,aw=AW[i]||FS,len=q<0.5?di*oc(q/0.5):di*(1-io3((q-0.5)/0.5)),' +
        'mid=q<0.5?-di+len/2:-len/2,st=1+len/aw,cs=1/Math.pow(st,0.25);a=cl(q*8);' + (vert ? 'dy=mid;sy=st;sx=cs;' : 'dx=mid;sx=st;sy=cs;'),
        { K: axe_maxAbs(DI) * 1.1 + 1, S: 2.5 });
} });

/* =====================================================================
   C. PER-GLYPH SHAPE CHANGES
   ===================================================================== */

/* ---- xeSwingDoor — ドア開き: every glyph swings shut like a door on its own edge hinge (alternating sides), rattling a little as it closes */
jzReg('enter', 'xeSwingDoor', { selfHide: true, apply: function (m) {
    var G = axe_geo(m), HW = [], i, vert = G.vert;
    for (i = 0; i < G.n; i++) HW.push((vert ? G.g[i].h : G.g[i].w) / 2);
    axe_emit(m, G, 'var HW=' + axe_arr(HW) + ',q=cl((P-0.45*o)/0.55),th=88*Math.PI/180*spr(q,3.2,2.5),c=Math.max(0.03,Math.cos(th)),far=1+0.16*Math.abs(Math.sin(th)),sh=(j%2?1:-1)*(1-c)*(HW[i]||0);' +
        'a=cl(q*6);' + (vert ? 'sy=c;sx=far;dy=sh;' : 'sx=c;sy=far;dx=sh;'),
        { K: axe_maxAbs(HW) + 1, S: 1 });
} });

/* ---- xeSkewFlap — はためき: glyphs arrive sheared hard to one side and flap back and forth like small flags until they stand straight */
jzReg('enter', 'xeSkewFlap', { selfHide: true, apply: function (m) {
    var G = axe_geo(m);
    axe_emit(m, G, 'var q=cl((P-0.42*o)/0.58),s=spr(q,2.6,3.4)*(j%2?1:-1);sk=s*46;sx=1-0.45*Math.abs(s);a=cl(q*5);', { SK: 46, S: 1 });
} });

/* ---- xeGlyphCurtain — 字ごと開帳: each glyph has its own pair of curtains: it is uncovered from its centre line outwards while easing narrower
   (the uncovered part = a linked copy seen through a track matte of one growing rect per glyph; the lyric layer shows each glyph when it is fully open) */
jzReg('enter', 'xeGlyphCurtain', { selfHide: true, apply: function (m) {
    var L = m.L, G = axe_geo(m), seed = m.c.seed | 0, OR = [], i, vert = G.vert, multi = axe_multi(m, G);
    for (i = 0; i < G.n; i++) OR.push(multi ? axe_ord(i, G.n) * 0.6 + axe_r(seed, axe_idx(m, G, i), 29) * 0.4 : 0);
    var qs = 'var OR=' + axe_arr(OR) + ',q=cl((P-0.5*(OR[i]||0))/0.5),k=0.02+0.8*io3(q),st=1.3-0.3*oc(q);';
    if (G.arranged || axe_matted(L) || axe_crowded(m, G) || G.nk > 40 || !G.nk || !axe_main(m)) {      // no clips: the glyph opens out of its centre line
        axe_emit(m, G, qs + 'var op=Math.min(1,k*2)*st;a=cl(q*8);' + (vert ? 'sy=op;' : 'sx=op;'), { S: 1 });
        return;
    }
    var D = axe_twin(m, 'JZ In Curtain');
    axe_emit(m, G, qs + 'a=q>0&&q<1?1:0;' + (vert ? 'sy=st;' : 'sx=st;'), { S: 1 }, D);
    var M = axe_shape(m, 'JZ In Curtain Matte'), H = axe_head(m);
    for (i = 0; i < G.n; i++) {
        var g = G.g[i]; if (g.sp) continue;
        var hq = H + 'var q=cl((P-' + jzN(0.5 * OR[i]) + ')/0.5),k=0.02+0.8*io3(q),st=1.3-0.3*oc(q);';
        var grp = jzGrp(M, 'open ' + (i + 1)), rc = jzAddRect(grp, 10, 10, 0);
        // (the rect is set up before the fill is added: adding to the contents invalidates older item references)
        jzSetExpr(rc.property('ADBE Vector Rect Size'), hq + (vert ? '[' + jzN(g.w * 2.4) + ',' + jzN(2 * g.h) + '*k*st]' : '[' + jzN(2 * g.w) + '*k*st,' + jzN(g.h * 2.4) + ']'));
        jzAddFill(grp, '#FFFFFF');
        jzGX(grp).property('ADBE Vector Position').setValue([g.x, g.y]);
        jzSetExpr(jzGX(grp).property('ADBE Vector Group Opacity'), hq + 'q>0&&q<1?100:0');
    }
    try { D.moveBefore(L); M.moveBefore(D); D.trackMatteType = TrackMatteType.ALPHA; } catch (e1) { jzWarn('xeGlyphCurtain matte: ' + e1.toString()); }
    jzAnimator(L, 'JZ In Hide', [['ADBE Text Opacity', 0]], axe_pre(m, G) + qs + 'q<1?100:0');
} });

/* ---- xeCellSlide — 互い違い窓: every glyph sits behind its own window; odd ones slide up into it from below, even ones down from above
   (the windows of one line join into one band: a mask on the lyric layer that opens when the entrance is over) */
jzReg('enter', 'xeCellSlide', { selfHide: true, apply: function (m) {
    var L = m.L, G = axe_geo(m), r = G.r, fs = G.fs, vert = G.vert;
    var gate = !(G.arranged || G.masked || axe_matted(L) || !G.n || (!vert && G.nL > 1));
    axe_emit(m, G, 'var q=cl((P-0.5*o)/0.5),off=(j%2?1:-1)*(1-o4(q))*1.15;' + (vert ? 'dx' : 'dy') + '=off*FS;a=q<=0?0:' + (gate ? '1' : 'cl((1.2-Math.abs(off))*1.8)') + ';',
        { K: fs * 1.2 });
    if (!gate) return;
    var mk = vert ? jzMaskRect(L, G.cx - fs * 0.62, r.top - fs, G.cx + fs * 0.62, r.top + r.height + fs) : jzMaskRect(L, r.left - fs, G.lines[0].cy - fs * 0.62, r.left + r.width + fs, G.lines[0].cy + fs * 0.62);
    try { mk.name = 'JZ In Windows'; } catch (e0) {}
    jzSetExpr(mk.property('ADBE Mask Offset'), axe_head(m) + 'time>=DL+IN?1e4:0');
} });

/* ---- xeGearTick — 歯車: the whole row turns like meshed gears: neighbours rotate opposite ways, advancing in clockwork ticks */
jzReg('enter', 'xeGearTick', { selfHide: true, apply: function (m) {
    var G = axe_geo(m);
    axe_emit(m, G, 'var q=cl((P-0.12*o)/0.88),k=q*5,fl=Math.floor(k),e=q>=1?1:(fl+ob((k-fl)/0.45,2.2))/5;rot=(j%2?1:-1)*150*(1-e);sx=sy=0.5+0.5*e;a=cl(q*6);',
        { R: 160, S: 1 });
} });

/* ---- xeCoinToss — コイントス: each glyph is flipped up off the line like a coin, turning over end to end, and lands face up */
jzReg('enter', 'xeCoinToss', { selfHide: true, apply: function (m) {
    var G = axe_geo(m);
    axe_emit(m, G, 'var q=cl((P-0.5*o)/0.5),c=Math.cos((1-q)*Math.PI*3),s=0.8+0.2*q;dy=-4.6*FS*q*(1-q);sx=s;sy=(c<0?-1:1)*Math.max(0.04,Math.abs(c))*s;a=cl(q*7);',
        { K: G.fs * 1.2, S: 2 });
} });

/* ---- xeBellows — 蛇腹のばし: the line starts pressed together at its head as a zigzag of thin slanted glyphs and is pulled out like bellows */
jzReg('enter', 'xeBellows', { selfHide: true, apply: function (m) {
    var G = axe_geo(m), BX = [], BY = [], CI = [], LN = [], i, vert = G.vert;
    for (i = 0; i < G.n; i++) { var g = G.g[i]; BX.push(g.l.x0 - g.x); BY.push(g.l.y0 - g.y); CI.push(g.ci); LN.push(g.n); }
    var f = { K: axe_maxAbs(BX, BY) + 1, S: 1 };
    if (vert) f.R = 22; else f.SK = 38;
    axe_emit(m, G, 'var BX=' + axe_arr(BX) + ',BY=' + axe_arr(BY) + ',CI=' + axe_arr(CI) + ',LN=' + axe_arr(LN) + ',ci=CI[i]||0,ln=LN[i]||1,q=cl((P-0.28*(ln>1?ci/(ln-1):0))/0.72),e=ob(q,1.3),' +
        'k=q>=1?0:1-e,th=q>=1?1:Math.max(0.12,0.12+0.88*e);dx=(BX[i]||0)*k*0.9;dy=(BY[i]||0)*k*0.9;a=cl(P*6);' +
        (vert ? 'sy=th;rot=(ci%2?1:-1)*22*k;' : 'sx=th;sk=(ci%2?1:-1)*38*k;'), f);
} });

/* ---- xeUnevenScale — 背くらべ: the glyphs fade in at wildly different sizes standing on one baseline, then spring to equal size one by one */
jzReg('enter', 'xeUnevenScale', { selfHide: true, apply: function (m) {
    var G = axe_geo(m), seed = m.c.seed | 0, S0 = [], i;
    for (i = 0; i < G.n; i++) { var x = axe_idx(m, G, i), r = axe_r(seed, x, 33); S0.push((x + (seed & 1)) % 2 ? 0.35 + 0.3 * r : 1.3 + 0.3 * r); }
    axe_emit(m, G, 'var S0=' + axe_arr(S0) + ',v=cl((P-0.2-o*0.4)/0.4),s=1+((S0[i]||1)-1)*spr(v,3,2.5);sx=sy=s;a=cl(P*5);' + (G.vert ? '' : 'dy=(1-s)*FS*0.36;'),
        { K: G.fs * 0.4, S: 1 });
} });

/* =====================================================================
   D. PLACEHOLDER SWAPS
   ===================================================================== */
// one placeholder square per glyph on a shape layer that rides with the lyric layer (■ filled / □ outlined); returns the layer.
// ex(i, g) -> { pre: 'expression prelude', sc: '[x%, y%]', op: 'opacity %' }
function axe_boxes(m, G, name, side, col, outline, ex) {
    var S = axe_shape(m, name), i, lw = Math.max(1, G.fs * 0.06);
    for (i = 0; i < G.n; i++) {
        var g = G.g[i]; if (g.sp) continue;
        var e = ex(i, g), grp = jzGrp(S, 'box ' + (i + 1));
        jzAddRect(grp, side - (outline ? lw : 0), side - (outline ? lw : 0), 0);
        if (outline) jzAddStroke(grp, col, lw); else jzAddFill(grp, col);
        jzGX(grp).property('ADBE Vector Position').setValue([g.x, g.y]);
        jzSetExpr(jzGX(grp).property('ADBE Vector Scale'), e.pre + e.sc);
        jzSetExpr(jzGX(grp).property('ADBE Vector Group Opacity'), e.pre + e.op);
    }
    jzSetExpr(jzXf(S, 'ADBE Opacity'), 'parent.transform.opacity');
    return S;
}
// width of a full-width placeholder relative to this glyph's slot (keeps the squares inside narrow latin slots)
function axe_slotK(g, G) { return jzClamp(g.w / Math.max(1, G.fs), 0.3, 1); }

/* ---- xeRedact — 伏せ字めくり: the line first appears censored as solid blocks; the blocks then turn over, in random order, into the real glyphs
   (blocks = shape squares in the text colour; they flip shut, the glyph flips open in their place) */
jzReg('enter', 'xeRedact', { selfHide: true, apply: function (m) {
    var L = m.L, G = axe_geo(m), seed = m.c.seed | 0, RD = [], i, vert = G.vert, multi = axe_multi(m, G);
    for (i = 0; i < G.n; i++) RD.push(multi ? axe_r(seed, axe_idx(m, G, i), 37) : 0);
    axe_emit(m, G, 'var RD=' + axe_arr(RD) + ',qa=cl((P-o*0.16)/0.1),u=(P-0.3-(RD[i]||0)*0.5)/0.2;' +
        'if(qa<=0||u<0.5)a=0;else if(u<1){var c=Math.max(0.05,Math.sin((u-0.5)*Math.PI));' + (vert ? 'sy=c;' : 'sx=c;') + '}',
        { S: 1 });
    if (G.arranged || axe_crowded(m, G) || !G.nk) return;
    var H = axe_head(m), outline = false, col = jzTextColor(L);
    try { var td = L.property('ADBE Text Properties').property('ADBE Text Document').value; if (td.applyFill === false) { outline = true; col = jzToHex(td.strokeColor[0] * 255, td.strokeColor[1] * 255, td.strokeColor[2] * 255); } } catch (e0) {}
    axe_boxes(m, G, 'JZ In Blocks', G.fs * 0.9, col, outline, function (i2, g) {
        var k = jzN(axe_slotK(g, G) * 100);
        return { pre: H + 'var qa=cl((P-' + jzN(axe_ord(i2, G.n) * 0.16) + ')/0.1),u=(P-0.3-' + jzN(RD[i2] * 0.5) + ')/0.2,c=u<=0?1:Math.max(0.05,Math.cos(u*Math.PI)),s=Math.max(0,ob(qa,2));',
            sc: vert ? '[' + k + '*s,100*c*s]' : '[' + k + '*c*s,100*s]', op: 'qa>0&&u<0.5&&P<1?100:0' };
    });
} });

/* ---- xeBlanks — 空欄埋め: empty answer boxes mark every slot; the glyphs are then filled in one after another, each box becoming its glyph */
jzReg('enter', 'xeBlanks', { selfHide: true, apply: function (m) {
    var L = m.L, G = axe_geo(m), sc = m.ctx.sc;
    axe_emit(m, G, 'var u=(P-0.24-o*0.5)/0.26;if(u<=0)a=0;else if(u<1){sx=sy=0.45+0.55*ob(u,2.4);a=cl(0.4+u*3);dy=-(1-oc(u))*FS*0.12;}',
        { K: G.fs * 0.15, S: 1 });
    if (G.arranged || axe_crowded(m, G) || !G.nk) return;
    var H = axe_head(m), col = axe_main(m) ? axe_pick(sc.sub, sc.fg) : jzTextColor(L);
    axe_boxes(m, G, 'JZ In Blanks', G.fs * 0.86, col, true, function (i2, g) {
        var k = jzN(axe_slotK(g, G));
        return { pre: H + 'var qa=cl(P/0.16),u=(P-0.24-' + jzN(axe_ord(i2, G.n) * 0.5) + ')/0.26,s=(0.8+0.14*oc(qa))*100;',
            sc: '[' + k + '*s,s]', op: 'u<=0?75*qa:0' };
    });
} });

/* ---- xeCloneMorph — 分身から: the first glyph copies itself along the whole line; the copies then turn, one by one, into the glyphs that belong there
   (copies = a linked copy of the layer whose characters are all the first glyph, half transparent; each squashes shut and the real glyph opens) */
jzReg('enter', 'xeCloneMorph', { selfHide: true, apply: function (m) {
    var L = m.L, G = axe_geo(m), i, f0 = -1, FX = [], FY = [];
    for (i = 0; i < G.n; i++) if (!G.g[i].sp) { f0 = i; break; }
    if (f0 < 0) return;
    var first = G.g[f0], twin = !(G.arranged || axe_matted(L) || axe_crowded(m, G) || G.nk < 2);
    for (i = 0; i < G.n; i++) { FX.push(first.x - G.g[i].x); FY.push(first.y - G.g[i].y); }
    var tm = 'var ld=i==' + f0 + ',qa=cl((cl(P/0.34)-0.55*o)/0.45),u=(P-0.4-o*0.4)/0.2,k=1-oc(qa),sq=u>0&&u<1?1-0.55*Math.sin(u*Math.PI):1;';
    // the lyric layer: the first glyph pops in; the others open out of their squashed copy
    axe_emit(m, G, tm + 'if(ld){var ql=cl(P/0.12);if(ql<=0)a=0;else if(ql<1){sx=sy=ob(ql,2.2);a=cl(ql*3);}}' +
        'else if(u<0.5){' + (twin || G.arranged ? 'a=0;' : 'var FX=' + axe_arr(FX) + ',FY=' + axe_arr(FY) + ';a=qa>0?0.5:0;dx=(FX[i]||0)*k;dy=(FY[i]||0)*k;sy=sq;') + '}' +
        'else if(u<1){sy=sq;a=0.5+0.5*cl((u-0.5)*4);}',
        twin || G.arranged ? { S: 1 } : { K: axe_maxAbs(FX, FY) + 1, S: 1 });
    if (!twin) return;
    var cs = jzChars(G.text), t2 = '', SP = [], CX = [], CY = [], SXC = [];
    for (i = 0; i < cs.length; i++) t2 += (cs[i] === '\r' || cs[i] === '\n' || cs[i] === '\u0003' || axe_isSp(cs[i])) ? cs[i] : first.ch;
    var D = axe_twin(m, 'JZ In Clones', t2), GT = axe_geo(m, D);
    if (GT.n !== G.n) { try { D.remove(); } catch (e0) {} return; }
    for (i = 0; i < G.n; i++) {
        SP.push(G.g[i].sp ? 1 : 0); CX.push(G.g[i].x - GT.g[i].x); CY.push(G.g[i].y - GT.g[i].y);
        SXC.push(jzClamp(G.g[i].w / Math.max(1, first.w), 0.35, 1));
    }
    axe_emit(m, G, tm + 'var SP=' + axe_arr(SP) + ',CX=' + axe_arr(CX) + ',CY=' + axe_arr(CY) + ',FX=' + axe_arr(FX) + ',FY=' + axe_arr(FY) + ',SXC=' + axe_arr(SXC) + ';' +
        'if(ld||SP[i]||qa<=0||u>=0.5)a=0;else{a=0.5;dx=(CX[i]||0)+(FX[i]||0)*k;dy=(CY[i]||0)+(FY[i]||0)*k;sx=SXC[i]||1;sy=sq;}',
        { K: axe_maxAbs(FX, FY) + axe_maxAbs(CX, CY) + 1, S: 1 }, D);
    try { D.moveBefore(L); } catch (e1) {}
} });

/* =====================================================================
   E. STROKE-PIECE ASSEMBLIES  (AE has no stroke pieces: the browser's glyph-level stand-ins)
   ===================================================================== */
function axe_soft(m, G, spread, body, f) { axe_emit(m, G, 'var q=cl((P-' + jzN(spread) + '*o)/' + jzN(1 - spread) + ');' + body, f); }

/* ---- xePieceRain — 画の雨: (browser: the strokes of each glyph rain straight down, the lowest landing first) here every glyph rains down
   stretched tall and lands in its slot, left to right */
jzReg('enter', 'xePieceRain', { selfHide: true, apply: function (m) {
    var G = axe_geo(m);
    axe_soft(m, G, 0.5, 'dy=-(1-iq(q))*FS*1.3;a=cl(q*4);sy=1+(1-q)*0.4;', { K: G.fs * 1.4, S: 1 });
} });

/* ---- xePieceVortex — 渦巻き組み: (browser: each glyph's strokes swirl in on a vortex) here every glyph winds in, big and spinning, neighbours opposite ways */
jzReg('enter', 'xePieceVortex', { selfHide: true, apply: function (m) {
    var G = axe_geo(m);
    axe_soft(m, G, 0.45, 'var c3=oc(q);rot=(j%2?1:-1)*(1-c3)*160;sx=sy=1.6-0.6*c3;a=cl(q*3);', { R: 160, S: 1 });
} });

/* ---- xePieceStrata — 段すべり: each glyph is built in horizontal layers that slide in row by row, alternately from the left and the right
   (browser: the strokes are sorted into 5 rows; here: 5 linked copies, each masked to one row of the line, sliding on their own delays) */
jzReg('enter', 'xePieceStrata', { selfHide: true, apply: function (m) {
    var L = m.L, G = axe_geo(m), r = G.r, fs = G.fs, row, i;
    if (G.arranged || G.masked || axe_matted(L) || axe_crowded(m, G) || !G.nk || G.nL > 12 || !axe_main(m)) {
        axe_soft(m, G, 0.4, 'dx=(j%2?1:-1)*(1-o4(q))*FS*0.9;a=cl(q*4);', { K: fs });
        return;
    }
    for (row = 0; row < 5; row++) {
        var D = axe_twin(m, 'JZ In Row ' + (row + 1));
        axe_emit(m, G, 'var u=cl((cl((P-0.35*o)/0.65)-' + jzN(row / 4 * 0.42) + ')/0.58),k=1-o4(u);dx=((' + row + '+j)%2?1:-1)*k*FS*1.25;sx=1+k*1.1;a=cl(u*4);',
            { K: fs * 1.3, S: 1.5 }, D);
        for (i = 0; i < G.lines.length; i++) {
            if (!G.lines[i].n) continue;
            var cy = G.lines[i].cy, y0 = cy + (row / 5 - 0.5) * fs - (row === 0 ? fs * 0.1 : 0), y1 = cy + ((row + 1) / 5 - 0.5) * fs + (row === 4 ? fs * 0.1 : 0);
            jzMaskRect(D, r.left - fs * 4, y0, r.left + r.width + fs * 4, y1);
        }
        try { D.moveBefore(L); } catch (e1) {}
    }
    jzAnimator(L, 'JZ In Hide', [['ADBE Text Opacity', 0]], m.HD + 'P<1?100:0');
} });

/* ---- xePiecePile — 積み木起こし: (browser: the strokes hop up out of a heap at the foot of every glyph) here every glyph rises out of a flat
   heap at its foot with a small overshoot */
jzReg('enter', 'xePiecePile', { selfHide: true, apply: function (m) {
    var G = axe_geo(m);
    axe_soft(m, G, 0.4, 'if(q<1){sy=Math.max(0.06,ob(q,1.8));dy=(1-sy)*FS*0.5;}a=cl(q*5);', { K: G.fs * 0.6, S: 1 });
} });
