// ================================================================ pack x2exA (AE port of src/11p_x2_exA.js) — 27 per-glyph exits
// xhCentreThin xhKanaFirst xhCombOut xhEndsOut xhRollCall / xhCeiling xhFlick xhHopFar xhConveyor xhGather xhStairs xhEatAlong
// xhShuffle / xhShutters xhStomp xhCoinSpin xhPageTurn xhTiltSlide xhConcertina / xhBarcode xhMorse xhFullStop /
// xhPieceStrata xhPieceThin xhPieceSpin xhPieceHeap xhPieceParts
// Exit progress = PO (0 at the exit start -> 1 at the cut end; everything is gone at PO >= 0.998, the browser's safety net).
// Per-glyph motion = text animators with Expression Selectors. Every part writes ONE expression body that sets the browser's
// per-glyph values (dx dy rot sx sy sk a col) for the glyph textIndex; axh_emit() turns it into Size / Skew / Turn / Move /
// Colour / Hide animators (all about the glyph centre). Per-glyph constants the browser takes from its layout (order in the
// line, slot positions of the neighbours, seeded randoms) are computed at build time and embedded as arrays. Layouts that give
// every glyph its own text layer are handled through the layer's index in the cut (m.o.mi), like the browser's it.mi.
// Per-glyph clips: a band mask on the lyric (xhCombOut) or an exit-only linked copy ("twin") seen through a track matte of one
// rect per glyph (xhShutters). Glyph swaps (■ ● 。) are shape rects / ellipses riding with the lyric, or a twin whose last
// glyph is the full stop. AE cannot split glyphs into strokes: the five xhPiece… parts use the browser's own glyph-level
// stand-ins (its fallback for outline / gradient items), except xhPieceStrata (5 row-masked twins sliding apart) and
// xhPieceParts (two twins masked to the left / right halves of every glyph).

// ---------------------------------------------------------------- shared helpers (axh_*)
// easings not in JZ_FNS: o4 outQuart, io3 inOutCubic, sg = the browser's seg(x, a, b), stg = its stg(p, k, spread), lp lerp
var AXH_FNS = 'function o4(x){x=cl(x);return 1-Math.pow(1-x,4);}' +
    'function io3(x){x=cl(x);return x<0.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;}' +
    'function sg(x,a,b){return cl((x-a)/(b-a));}function stg(p,k,s){return cl((p-s*k)/(1-s));}function lp(a,b,t){return a+(b-a)*t;}\n';
function axh_T(m) { var c = m.c; return { IN: Math.max(0.02, c.inDur || 0.3), DL: (m.o.mi || 0) * (c.stagger || 0.04), OS: c.dur - (c.outDur || 0), DUR: c.dur }; }
function axh_hd(m) { return m.HD + AXH_FNS; }
function axh_arr(a) { var s = [], i; for (i = 0; i < a.length; i++) s.push(jzN(a[i])); return '[' + s.join(',') + ']'; }
function axh_maxAbs(a, b) { var k = 0, i; for (i = 0; i < a.length; i++) k = Math.max(k, Math.abs(a[i])); if (b) for (i = 0; i < b.length; i++) k = Math.max(k, Math.abs(b[i])); return k; }
function axh_isHex(c) { return typeof c === 'string' && c.charAt(0) === '#' && (c.length === 7 || c.length === 4); }
function axh_pick(a, b) { if (axh_isHex(a)) return a; if (axh_isHex(b)) return b; return '#FFFFFF'; }
// the browser's J.h / J.r / J.rs (seeded choices are made the same way as the web version)
function axh_h(a, b, c, d, e) {
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
function axh_r(a, b, c, d) { return axh_h(a, b, c, d) / 4294967296; }
function axh_rs(a, b, c, d) { return axh_r(a, b, c, d) * 2 - 1; }
// seed of the "item" (one text layer) / of the cut (one-glyph layers share the cut's seed, like the browser)
function axh_seed(m, single) { var s = m.c.seed | 0; return single ? s : (s + (m.o.mi || 0) * 101) | 0; }
function axh_dir(m, salt) { return axh_r(axh_seed(m, false), salt, 5) < 0.5 ? -1 : 1; }
function axh_cutN(m) { return Math.max(1, jzCount(String(m.c.text || ''))); }
// the browser's motionK(env)
function axh_mk(m) { var v = m.ctx.fx && m.ctx.fx.motion != null ? m.ctx.fx.motion : 0.7; return jzClamp(0.55 + v * 0.65, 0.5, 1.3); }
// accent colour for a lit glyph (accent2 when the lyric is already drawn in the accent)
function axh_hot(m) {
    var sc = m.ctx.sc || {}, c0 = String(jzTextColor(m.L)).toUpperCase();
    return c0 === String(sc.accent || '').toUpperCase() ? axh_pick(sc.accent2, sc.fg) : axh_pick(sc.accent, sc.fg);
}
function axh_isSp(ch) { return ch === ' ' || ch === '　' || ch === '\t'; }
function axh_adv(ch) { var c = ch.charCodeAt(0); if (ch === ' ') return 0.3; if (c >= 0xFF61 && c <= 0xFF9F) return 0.5; return c < 0x2000 ? 0.56 : 1; }
function axh_rect(L, t) { try { var r = L.sourceRectAtTime(t, false); if (r && r.width > 0 && r.height > 0) return r; } catch (e) {} return jzRect(L); }
// glyphs placed by the layout itself (its own animators or a text path): slot positions cannot be told from the text block.
// Animators of an entrance / hold / exit ("JZ In …", "hr Hold …") are at rest when the exit starts and do not count.
function axh_arranged(L) {
    var TP = L.property('ADBE Text Properties'), i, n = 0;
    try { if (TP.property('ADBE Text Path Options').property('ADBE Text Path').value > 0) return true; } catch (e0) {}
    try {
        var an = TP.property('ADBE Text Animators'); n = an.numProperties;
        for (i = 1; i <= n; i++) if (!/(^|\s)(In|Hold|Out|Colour)(\s|$)/.test(String(an.property(i).name))) return true;
    } catch (e1) { return n > 0; }
    return false;
}
// glyph geometry in the text layer's own space, one entry per AE character (textIndex order, spaces included):
//   G.g[i] {i, li (AE line), sp, ch, x, y (centre), w, ci, n, s0}; ci / n = index / glyph count in the browser's line, s0 = index
//   of that line's first glyph (a vertical column = one glyph per AE line = ONE line)
//   G.r source rect; G.fs; G.lead; G.vert; G.nL; G.lines[{cy, n}]; G.n = textTotal; G.nk glyphs without spaces; G.arranged; G.masked
function axh_geo(m, Lx) {
    var L = Lx || m.L, TP = L.property('ADBE Text Properties'), td = TP.property('ADBE Text Document').value, t = axh_T(m), i, j;
    var r = axh_rect(L, Math.max(0, Math.min(t.OS - 0.01, t.DL + t.IN + 0.03)));
    var fs = td.fontSize || m.size || 100, text = String(td.text), trk = (td.tracking || 0) / 1000 * fs;
    var lines = text.split(/\r\n|\r|\n|\u0003/), nL = lines.length, lead = fs * 1.2;
    try { if (!td.autoLeading && td.leading > 0) lead = td.leading; } catch (e0) {}
    var just = 'c';
    try { if (td.justification === ParagraphJustification.LEFT_JUSTIFY) just = 'l'; else if (td.justification === ParagraphJustification.RIGHT_JUSTIFY) just = 'r'; } catch (e1) {}
    var G = { fs: fs, lead: lead, nL: nL, r: r, n: 0, nk: 0, g: [], lines: [], vert: nL > 1, arranged: axh_arranged(L), masked: false, text: text };
    try { G.masked = L.property('ADBE Mask Parade').numProperties > 0; } catch (e2) {}
    var rows = [], maxW = 0;
    for (i = 0; i < nL; i++) {
        var cs = jzChars(lines[i]), ws = [], w = 0;
        for (j = 0; j < cs.length; j++) { var a = axh_adv(cs[j]) * fs; ws.push(a); w += a + (j < cs.length - 1 ? trk : 0); }
        if (cs.length > 1) G.vert = false;
        rows.push({ cs: cs, ws: ws, w: w }); if (w > maxW) maxW = w;
    }
    var k = maxW > 0 ? r.width / maxW : 1; if (!(k > 0.5 && k < 2)) k = 1;
    var lh = r.height - (nL - 1) * lead; if (!(lh > fs * 0.5 && lh < fs * 1.6)) lh = fs * 0.95;
    var cx = r.left + r.width / 2;
    for (i = 0; i < nL; i++) {
        var R = rows[i], x = just === 'l' ? r.left : (just === 'r' ? r.left + r.width - R.w * k : cx - R.w * k / 2), y = r.top + lh / 2 + i * lead, ln = { cy: y, n: 0 };
        for (j = 0; j < R.cs.length; j++) {
            var sp = axh_isSp(R.cs[j]);
            G.g.push({ i: G.n, li: i, sp: sp, ch: R.cs[j], x: x + R.ws[j] * k / 2, y: y, w: Math.max(1, R.ws[j] * k), ci: 0, n: 1, s0: G.n });
            x += (R.ws[j] + trk) * k; G.n++;
            if (!sp) { G.nk++; ln.n++; }
        }
        G.lines.push(ln);
    }
    G.cx = cx; G.cy = r.top + r.height / 2;
    var s = 0;
    while (s < G.n) {
        var e = s;
        while (e + 1 < G.n && (G.vert || G.g[e + 1].li === G.g[s].li)) e++;
        for (i = s; i <= e; i++) { G.g[i].ci = i - s; G.g[i].n = e - s + 1; G.g[i].s0 = s; }
        s = e + 1;
    }
    return G;
}
// the browser's orders(env, it), one value per glyph: O.idx / O.ci (index used for parity and seeded randoms), O.lr (0..1 along
// the item), O.ctr (0 at the middle of the glyph's line -> 1 at both ends), O.side (-1 / 0 / 1); O.single; O.N
function axh_ord(m, G) {
    var N = axh_cutN(m), single = G.n <= 1 && N > 1, mi = jzClamp(m.o.mi || 0, 0, N - 1), half = (N - 1) / 2, i, d;
    var O = { single: single, N: single ? N : G.n, idx: [], ci: [], lr: [], ctr: [], side: [] };
    for (i = 0; i < G.n; i++) {
        var g = G.g[i];
        if (single) { d = mi - half; O.idx.push(mi); O.ci.push(mi); O.lr.push(mi / (N - 1)); O.ctr.push(Math.abs(d) / half); }
        else { d = g.n > 1 ? g.ci - (g.n - 1) / 2 : 0; O.idx.push(i); O.ci.push(g.ci); O.lr.push(G.n > 1 ? i / (G.n - 1) : 0); O.ctr.push(g.n > 1 ? Math.abs(d) / ((g.n - 1) / 2) : 0); }
        O.side.push(d > 0 ? 1 : (d < 0 ? -1 : 0));
    }
    return O;
}
// static transform of the layer; a point of its own space in comp space; its scale (comp px per layer unit)
function axh_xf(L) { var tr = L.property('ADBE Transform Group'); return { a: tr.property('ADBE Anchor Point').value, p: tr.property('ADBE Position').value, s: tr.property('ADBE Scale').value, r: tr.property('ADBE Rotate Z').value }; }
function axh_toComp(L, x, y) {
    var X = axh_xf(L), rr = X.r * Math.PI / 180, ux = (x - X.a[0]) * X.s[0] / 100, uy = (y - X.a[1]) * X.s[1] / 100;
    return [X.p[0] + Math.cos(rr) * ux - Math.sin(rr) * uy, X.p[1] + Math.sin(rr) * ux + Math.cos(rr) * uy];
}
function axh_s0(L) { var s = axh_xf(L).s, k = (Math.abs(s[0]) + Math.abs(s[1])) / 200; return k > 0.01 ? k : 1; }
// the lyric's main (opaque, filled) copy: helper layers only go there
function axh_main(m) {
    try {
        var td = m.L.property('ADBE Text Properties').property('ADBE Text Document').value;
        if (td.applyFill === false) return false;
        return jzXf(m.L, 'ADBE Opacity').value >= 85;
    } catch (e) { return true; }
}
function axh_matted(L) { try { return !!L.trackMatteType && L.trackMatteType !== TrackMatteType.NO_TRACK_MATTE; } catch (e) { return false; } }
// too many layers already (very long lines, one glyph per layer with a long lyric, crowded comps): no helper layers
function axh_crowded(m, G) {
    if (G && (G.n > 60 || (G.n <= 1 && axh_cutN(m) > 8))) return true;
    try { return m.ctx.comp.numLayers > 60; } catch (e) { return false; }
}
function axh_nohelp(m, G) { return G.arranged || !G.nk || axh_matted(m.L) || axh_crowded(m, G) || !axh_main(m); }
function axh_top(m) { var L = m.L; if (axh_matted(L)) { try { return m.ctx.comp.layer(L.index - 1); } catch (e) {} } return L; }
function axh_live(m, Lx) { var t = axh_T(m); try { if (t.OS - 0.05 > Lx.inPoint) Lx.inPoint = t.OS - 0.05; } catch (e) {} }
function axh_reset(S) {
    var tr = S.property('ADBE Transform Group');
    tr.property('ADBE Anchor Point').setValue([0, 0]); tr.property('ADBE Position').setValue([0, 0]);
    tr.property('ADBE Scale').setValue([100, 100]); tr.property('ADBE Rotate Z').setValue(0);
}
// linked copy of the lyric, only shown during the exit: parented to L (follows every move of it), takes L's final text style
// by expression (the treatment is applied later). pre: expression statements, fac: opacity factor, text: its own characters
function axh_twin(m, tag, pre, fac, text) {
    var L = m.L, top = axh_top(m), D = L.duplicate(), i, mns = ['ADBE Position', 'ADBE Scale', 'ADBE Rotate Z', 'ADBE Opacity', 'ADBE Anchor Point'];
    try { D.name = String(L.name).substr(0, 20) + ' ' + tag; } catch (e0) {}
    var tr = D.property('ADBE Transform Group');
    for (i = 0; i < mns.length; i++) { try { if (tr.property(mns[i]).expression) tr.property(mns[i]).expression = ''; } catch (e1) {} }
    D.parent = L;
    tr.property('ADBE Scale').setValue([100, 100]); tr.property('ADBE Rotate Z').setValue(0);
    jzSetExpr(tr.property('ADBE Position'), 'parent.transform.anchorPoint');
    jzSetExpr(tr.property('ADBE Opacity'), axh_hd(m) + (pre || '') + 'PO>0&&PO<0.998?value*(' + (fac || '1') + '):0');
    if (text != null) jzTextDoc(D, function (d) { d.text = text; });
    try { D.property('ADBE Text Properties').property('ADBE Text Document').expression = text != null ? 'parent.text.sourceText.style.setText(value.text)' : 'parent.text.sourceText.style'; } catch (e2) {}
    axh_live(m, D);
    try { D.moveBefore(top); } catch (e3) {}
    return D;
}
// shape layer in L's own space (parented to it, right above it), exit only
function axh_shape(m, name, above) {
    var L = m.L, S = m.ctx.comp.layers.addShape();
    try { S.name = name; } catch (e0) {}
    try { S.moveBefore(above || axh_top(m)); } catch (e1) {}
    S.parent = L; axh_reset(S); axh_live(m, S);
    return S;
}
// alpha track matte for the twin T: a shape layer in L's space right above T
function axh_matte(m, T, name) {
    var S = axh_shape(m, name, T), ok = false;
    if (typeof T.setTrackMatte === 'function') { try { T.setTrackMatte(S, TrackMatteType.ALPHA); ok = true; } catch (e0) { ok = false; } }
    if (!ok) { try { T.trackMatteType = TrackMatteType.ALPHA; } catch (e1) { jzWarn('axh matte: ' + e1.toString()); } }
    try { S.enabled = false; } catch (e2) {}
    return S;
}
// one rect / ellipse per glyph on a shape layer riding with the lyric. ex(i, g) -> { pre, size, pos (optional), op } (expressions)
function axh_marks(S, G, dot, col, ex) {
    var i;
    for (i = 0; i < G.n; i++) {
        var g = G.g[i]; if (g.sp) continue;
        var e = ex(i, g), grp = jzGrp(S, 'glyph ' + (i + 1)), sh = dot ? jzAddEllipse(grp, 10, 10) : jzAddRect(grp, 10, 10, 0);
        // (the shape is set up before the fill is added: adding to the contents invalidates older item references)
        jzSetExpr(sh.property(dot ? 'ADBE Vector Ellipse Size' : 'ADBE Vector Rect Size'), e.pre + e.size);
        jzAddFill(grp, col);
        if (e.pos) jzSetExpr(jzGX(grp).property('ADBE Vector Position'), e.pre + e.pos);
        else jzGX(grp).property('ADBE Vector Position').setValue([g.x, g.y]);
        jzSetExpr(jzGX(grp).property('ADBE Vector Group Opacity'), e.pre + e.op);
    }
    return S;
}
// expression prelude of every per-glyph body: i (0-based glyph), FS, p (= PO) + the browser's per-glyph values
function axh_pre(m, G) {
    return axh_hd(m) + 'var i=Math.max(0,Math.min(textIndex-1,' + Math.max(0, G.n - 1) + ')),FS=' + jzN(G.fs) + ',p=PO,dx=0,dy=0,rot=0,sx=1,sy=1,sk=0,a=1,col=0;';
}
// body -> animators. f: { K: px range of dx / dy, R: degrees range of rot, S: range of |1 - scale|, SK: degrees range of sk,
// col: hex (glyphs with col = 1 take it), tag }   (a = glyph alpha 0..1; nothing happens before the exit starts)
function axh_emit(m, G, body, f, Lx) {
    var L = Lx || m.L, pre = axh_pre(m, G) + body, t = f.tag || 'JZ Out';
    if (f.S) jzAnimator(L, t + ' Size', [['ADBE Text Scale 3D', [100 - 100 * f.S, 100 - 100 * f.S, 100]]], pre + 'PO>0?[(1-sx)/' + jzN(f.S) + '*100,(1-sy)/' + jzN(f.S) + '*100,0]:[0,0,0]');
    if (f.SK) jzAnimator(L, t + ' Skew', [['ADBE Text Skew', f.SK]], pre + 'PO>0?sk/' + jzN(f.SK) + '*100:0');
    if (f.R) jzAnimator(L, t + ' Turn', [['ADBE Text Rotation', f.R]], pre + 'PO>0?rot/' + jzN(f.R) + '*100:0');
    if (f.K) jzAnimator(L, t + ' Move', [['ADBE Text Position 3D', [f.K, f.K, 0]]], pre + 'PO>0?[dx/' + jzN(f.K) + '*100,dy/' + jzN(f.K) + '*100,0]:[0,0,0]');
    if (f.col) jzAnimator(L, t + ' Colour', [['ADBE Text Fill Color', jzHex(f.col)], ['ADBE Text Stroke Color', jzHex(f.col)]], pre + 'PO>0&&col?100:0');
    jzAnimator(L, t + ' Hide', [['ADBE Text Opacity', 0]], pre + 'PO>=0.998?100:(PO>0?(1-cl(a))*100:0)');
}
// every exit: fn(m, G, O); ends fully gone
function axh_reg(key, fn) {
    jzReg('exit', key, { apply: function (m) {
        var G = axh_geo(m);
        if (G.n) fn(m, G, axh_ord(m, G));
        m.parts.op.push('f*=PO>=0.998?0:1;');
    } });
}
// the lyric hides while its copies play the exit
function axh_hideL(m) { m.parts.op.push('f*=PO>0?0:1;'); }
// q -> "nothing yet / gone / in between"
var AXH_Q0 = 'if(q>=1)a=0;else if(q>0){';

/* =====================================================================
   A. ORDERING PATTERNS
   ===================================================================== */

/* ---- xhCentreThin — 中央から細る: starting in the middle of the line and spreading to both ends, each glyph narrows to a hairline,
   and the hairline then shortens to nothing */
axh_reg('xhCentreThin', function (m, G, O) {
    axh_emit(m, G, 'var CT=' + axh_arr(O.ctr) + ',q=stg(p,CT[i]||0,0.5);' + AXH_Q0 +
        'var u=Math.max(0.03,lp(1,0.05,io3(sg(q,0,0.6)))),v=Math.max(0.02,1-iq(sg(q,0.5,1)));' + (G.vert ? 'sy=u;sx=v;' : 'sx=u;sy=v;') + '}', { S: 1 });
});

/* ---- xhKanaFirst — かなが先に: the light glyphs (kana, lower case) soften and sink away first; the heavy ones (kanji, capitals)
   stand alone for a beat, then punch out one by one */
function axh_heavy(ch) { return jzIsKanji(ch) || /[A-Z0-9]/.test(ch); }
axh_reg('xhKanaFirst', function (m, G, O) {
    var all = jzChars(jzStrip(String(m.c.text || G.text || ''))), nh = 0, i, HV = [];
    for (i = 0; i < all.length; i++) if (axh_heavy(all[i])) nh++;
    var natural = nh > 0 && nh < all.length;
    for (i = 0; i < G.n; i++) HV.push((natural ? axh_heavy(G.g[i].ch) : O.idx[i] % 3 === 1) ? 1 : 0);
    axh_emit(m, G, 'var HV=' + axh_arr(HV) + ',LR=' + axh_arr(O.lr) + ',o=LR[i]||0,q;' +
        'if(!HV[i]){q=stg(sg(p,0,0.55),o,0.45);' + AXH_Q0 + 'dy=iq(q)*FS*0.3;sx=sy=1-0.2*q;a=1-iq(q);}}' +
        'else{q=stg(sg(p,0.5,1),o,0.4);' + AXH_Q0 + 'var up=Math.sin(sg(q,0,0.35)*Math.PI/2)*0.16,dn=ic(sg(q,0.3,1));sx=sy=Math.max(0.01,(1+up)*(1-dn));a=1-ic(sg(q,0.6,1));}}',
        { K: G.fs * 0.35, S: 1 });
});

/* ---- xhCombOut — 櫛抜け: like two combs pulled apart: every other glyph slides up out of its own cell, then the remaining ones
   slide down out of theirs (the cells of one line join into one band: a mask on the lyric that is only active during the exit;
   several lines / arranged glyphs: the glyphs fade as they leave their cell) */
axh_reg('xhCombOut', function (m, G, O) {
    var L = m.L, r = G.r, fs = G.fs, vert = G.vert;
    var gate = !(G.arranged || G.masked || axh_matted(L) || (!vert && G.nL > 1));
    axh_emit(m, G, 'var CI=' + axh_arr(O.ci) + ',LR=' + axh_arr(O.lr) + ',odd=(CI[i]||0)%2==1,q=stg(odd?sg(p,0.38,1):sg(p,0,0.62),LR[i]||0,0.3);' + AXH_Q0 +
        'var d=io3(q)*1.3*FS*(odd?1:-1);' + (vert ? 'dx=-d;' : 'dy=d;') + (gate ? '' : 'a=cl((1.25-io3(q)*1.3)*1.6);') + '}', { K: fs * 1.35 });
    if (!gate) return;
    var mk = vert ? jzMaskRect(L, G.cx - fs * 0.65, r.top - fs * 3, G.cx + fs * 0.65, r.top + r.height + fs * 3) : jzMaskRect(L, r.left - fs * 3, G.lines[0].cy - fs * 0.65, r.left + r.width + fs * 3, G.lines[0].cy + fs * 0.65);
    try { mk.name = 'JZ Out Comb Cells'; } catch (e0) {}
    jzSetExpr(mk.property('ADBE Mask Offset'), m.HD + 'PO>0?0:1e4');
});

/* ---- xhEndsOut — 両端から抜ける: the outermost pair is pulled off outwards first, then pair after pair; the glyph in the middle
   is the last to go */
axh_reg('xhEndsOut', function (m, G, O) {
    var mk = axh_mk(m), far = G.fs * 2.6 * mk;
    axh_emit(m, G, 'var CT=' + axh_arr(O.ctr) + ',SI=' + axh_arr(O.side) + ',q=stg(p,1-(CT[i]||0),0.62),sd=SI[i]||0;' + AXH_Q0 +
        'if(!sd){sx=sy=Math.max(0.01,1+Math.sin(sg(q,0,0.4)*Math.PI)*0.12-ic(sg(q,0.3,1)));a=1-ic(q);}' +
        'else{var e=ic(q);a=1-iq(sg(q,0.35,1));' + (G.vert ? 'dy=sd*e*' + jzN(far) + ';sy=1+e*1.3;' : 'dx=sd*e*' + jzN(far) + ';sx=1+e*1.3;') + '}}',
        { K: far + 1, S: 1.4 });
});

/* ---- xhRollCall — 指名されて消える: in a shuffled order, one glyph at a time lights up in the accent colour, swells, and snaps shut */
axh_reg('xhRollCall', function (m, G, O) {
    var seed = axh_seed(m, O.single), N = Math.max(1, O.N), RK = [], V = [], i, j;
    for (j = 0; j < N; j++) V.push(axh_r(seed, j, 71));
    for (i = 0; i < G.n; i++) {          // shuffled rank 0..1 (a permutation, so the calls are evenly spaced)
        var rk = 0, v = V[O.idx[i]];
        for (j = 0; j < N; j++) if (V[j] < v) rk++;
        RK.push(N > 1 ? rk / (N - 1) : 0);
    }
    axh_emit(m, G, 'var RK=' + axh_arr(RK) + ',q=stg(p,RK[i]||0,0.72);' + AXH_Q0 +
        'var up=ob(sg(q,0,0.45),2.4),dn=ic(sg(q,0.55,1));sx=1+up*0.24;sy=sx*Math.max(0.02,1-dn);col=1;}', { S: 1, col: axh_hot(m) });
});

/* =====================================================================
   B. PER-GLYPH PATHS
   ===================================================================== */

/* ---- xhCeiling — 天井に貼り付く: one after another the glyphs squat, shoot straight up and splat flat against the top edge of the
   frame, where they slip out of sight (the way up to the frame's top edge is measured per glyph at build time) */
axh_reg('xhCeiling', function (m, G, O) {
    var L = m.L, X = axh_xf(L), rr = X.r * Math.PI / 180, s0x = Math.abs(X.s[0]) / 100 || 1, s0y = Math.abs(X.s[1]) / 100 || 1, gh = G.fs * s0y, RS = [], i, K = G.fs;
    for (i = 0; i < G.n; i++) {
        var rise = Math.max(0, axh_toComp(L, G.g[i].x, G.g[i].y)[1] - gh * 0.1 - 2);
        RS.push(rise); K = Math.max(K, (rise + gh * 0.6) / Math.min(s0x, s0y));
    }
    // d = screen-space way up (comp px); (VX, VY) turns it into the layer's own space
    axh_emit(m, G, 'var RS=' + axh_arr(RS) + ',LR=' + axh_arr(O.lr) + ',q=stg(p,LR[i]||0,0.5);' + AXH_Q0 +
        'var gh=' + jzN(gh) + ',fl=iq(sg(q,0.14,0.4)),hit=sg(q,0.4,0.52),out=iq(sg(q,0.62,1));' +
        'if(q<0.14){var sq=sg(q,0,0.14);sy=1-0.22*Math.sin(sq*Math.PI/2);sx=1+0.1*sq;}else if(q<0.4){sy=lp(0.78,1.5,oc(sg(q,0.14,0.24)));sx=0.86;}' +
        'else{sy=lp(1.5,0.2,oc(hit*2.5))+Math.sin(hit*Math.PI)*0.06;sx=lp(0.86,1.4,ob(hit,2));}' +
        'var d=(q<0.14?(1-sy)*gh*0.5:-(RS[i]||0)*fl)-out*gh*0.45;dx=d*' + jzN(Math.sin(rr) / s0x) + ';dy=d*' + jzN(Math.cos(rr) / s0y) + ';a=1-ic(sg(q,0.7,1));}',
        { K: K + 1, S: 1 });
});

/* ---- xhFlick — 指で弾く: each glyph in turn is pressed back, then flicked: it shoots off low and fast, spinning and shrinking
   into the distance */
axh_reg('xhFlick', function (m, G, O) {
    var dir = axh_dir(m, 81), seed = axh_seed(m, false), dist = Math.max(m.W, m.H) * 0.42 * axh_mk(m) / axh_s0(m.L), LF = [], i;
    for (i = 0; i < G.n; i++) LF.push(0.6 + axh_r(seed, i, 82) * 0.9);
    axh_emit(m, G, 'var LF=' + axh_arr(LF) + ',LR=' + axh_arr(O.lr) + ',D=' + dir + ',q=stg(p,' + (dir > 0 ? '1-(LR[i]||0)' : '(LR[i]||0)') + ',0.6);' + AXH_Q0 +
        'if(q<0.2){var w=Math.sin(sg(q,0,0.2)*Math.PI/2);dx=-D*w*FS*0.07;rot=-D*w*9;sx=1-w*0.08;}' +
        'else{var u=sg(q,0.2,1),e=o4(u);dx=D*(e*' + jzN(dist) + '-(1-u)*FS*0.07*(u<0.1?1:0));dy=(-(LF[i]||1)*u+0.9*u*u)*FS*1.6;rot=D*(e*620-9*(1-u));sx=sy=1-0.72*e;a=1-iq(sg(u,0.45,1));}}',
        { K: dist + G.fs, R: 620, S: 1 });
});

/* ---- xhHopFar — 遠くへ跳ねる: every glyph hops three times on the spot, each hop smaller and further away, until it is too far to see */
axh_reg('xhHopFar', function (m, G, O) {
    var GX = [], GY = [], i;
    for (i = 0; i < G.n; i++) { GX.push(G.g[i].x - G.cx); GY.push(G.g[i].y - G.cy); }
    axh_emit(m, G, 'var GX=' + axh_arr(GX) + ',GY=' + axh_arr(GY) + ',LR=' + axh_arr(O.lr) + ',q=stg(p,LR[i]||0,0.3);' + AXH_Q0 +
        'var HS=[1,0.6,0.3,0.04],h=Math.min(2,Math.floor(q*3)),f=q*3-h,s=lp(HS[h],HS[h+1],io3(f)),far=1-s,land=Math.max(0,1-f/0.14)+Math.max(0,(f-0.86)/0.14),vy=1+Math.sin(f*Math.PI)*0.16-land*0.2;' +
        'sx=s*(1+land*0.12);sy=s*vy;dx=-(GX[i]||0)*far*0.32;dy=-(GY[i]||0)*far*0.32-Math.sin(f*Math.PI)*FS*HS[h]*0.85-far*FS*0.18+(1-vy)*FS*s*0.5;a=h<2?1:1-iq(sg(f,0.3,1));}',
        { K: axh_maxAbs(GX, GY) * 0.32 + G.fs * 1.3, S: 1 });
});

// position at a fractional column index of a line (extrapolates past both ends): pa(first glyph of the line, glyphs in it, f)
var AXH_PA = 'function pa(s,n,f){if(n<2)return [XX[s],YY[s]];var c=Math.max(0,Math.min(n-2,Math.floor(f))),t=f-c,j=s+c;return [XX[j]+(XX[j+1]-XX[j])*t,YY[j]+(YY[j+1]-YY[j])*t];}';
// glyph centres + line start / line length per glyph, as expression arrays XX YY LS LN
function axh_rows(G) {
    var XX = [], YY = [], LS = [], LN = [], i;
    for (i = 0; i < G.n; i++) { XX.push(G.g[i].x); YY.push(G.g[i].y); LS.push(G.g[i].s0); LN.push(G.g[i].n); }
    return 'var XX=' + axh_arr(XX) + ',YY=' + axh_arr(YY) + ',LS=' + axh_arr(LS) + ',LN=' + axh_arr(LN) + ';';
}
// longest way from a glyph to another glyph of its own line
function axh_span(G) {
    var k = 0, i;
    for (i = 0; i < G.n; i++) { var g = G.g[i], h = G.g[g.s0], t = G.g[g.s0 + g.n - 1]; k = Math.max(k, Math.abs(h.x - g.x), Math.abs(h.y - g.y), Math.abs(t.x - g.x), Math.abs(t.y - g.y)); }
    return k;
}

/* ---- xhConveyor — コンベア送り: the line is fed towards its head in jerky steps like a conveyor; whatever passes the head tips over
   the end and drops */
axh_reg('xhConveyor', function (m, G, O) {
    var fs = G.fs, vert = G.vert, per = Math.max(1, Math.ceil(O.N / 7)), steps = Math.ceil(O.N / per) + 1.4;
    var drop = (vert ? 'dx=ax+Math.min(1.1,u*1.6)*FS*0.95;dy=ay-Math.min(u,0.5)*FS*0.5+u*u*FS*2.4;rot=Math.min(1.4,u)*80;' : 'dx=ax-u*FS*0.5;dy=ay+u*u*FS*2.4;rot=-Math.min(1.4,u)*80;') + 'a=1-iq(sg(u,0.35,1.3));';
    axh_emit(m, G, (O.single ? '' : axh_rows(G) + AXH_PA) + 'var CI=' + axh_arr(O.ci) + ',per=' + per + ',x=p*' + jzN(steps) + ',k=Math.floor(x),f=x-k,s=(k+oc(sg(f,0,0.55)))*per,t=s-(CI[i]||0),ax=0,ay=0,u=t/per;' +
        'if(t<=0){' + (O.single ? 'if(f<0.55&&k>0)dx=-Math.sin(sg(f,0,0.55)*Math.PI)*FS*0.05;' : 'var h=LS[i],w=pa(h,LN[i],s);dx=XX[h]-w[0];dy=YY[h]-w[1];') + '}' +   // rigid shift towards the head
        'else if(t>=per*1.3)a=0;else{' + (O.single ? '' : 'ax=XX[LS[i]]-XX[i];ay=YY[LS[i]]-YY[i];') + drop + '}',
        { K: (O.single ? 0 : axh_span(G)) + fs * 4.4, R: 112 });
});

/* ---- xhGather — カード集め: the glyphs are swept up like playing cards: one by one they slide onto the first glyph of their line,
   and the pile is flipped away */
axh_reg('xhGather', function (m, G, O) {
    var fs = G.fs, seed = axh_seed(m, false), TX = [], TY = [], RT = [], KK = [], i;
    if (O.single) {
        axh_emit(m, G, 'var q=stg(p,' + jzN(O.lr[0]) + ',0.6);' + AXH_Q0 + 'sx=Math.max(0.02,1-ic(q));rot=q*14;}', { R: 14, S: 1 });
        return;
    }
    for (i = 0; i < G.n; i++) {
        var g = G.g[i], h = G.g[g.s0];
        TX.push(h.x + axh_rs(seed, i, 91) * fs * 0.05 - g.x); TY.push(h.y + axh_rs(seed, i, 92) * fs * 0.05 - g.y);
        RT.push(axh_rs(seed, i, 93) * 9); KK.push(g.ci === 0 ? -1 : (g.n > 1 ? g.ci / (g.n - 1) : 0));
    }
    axh_emit(m, G, 'var TX=' + axh_arr(TX) + ',TY=' + axh_arr(TY) + ',RT=' + axh_arr(RT) + ',KK=' + axh_arr(KK) + ',fl=ic(sg(p,0.72,1)),q=KK[i]<0?0:stg(sg(p,0,0.72),KK[i]||0,0.62),e=io3(q),arc=Math.sin(e*Math.PI)*FS*0.22;' +
        'dx=(TX[i]||0)*e' + (G.vert ? '+arc' : '') + ';dy=(TY[i]||0)*e' + (G.vert ? '' : '-arc') + '-fl*FS*0.25;rot=(RT[i]||0)*e;sx=Math.max(0.02,1-fl);a=1-ic(sg(p,0.86,1));',
        { K: axh_maxAbs(TX, TY) + fs * 0.5, R: 9, S: 1 });
});

/* ---- xhStairs — 階段落ち: the line breaks into a staircase, each glyph one step lower than the one before; then the glyphs slide
   down the stairs and off, lowest first */
axh_reg('xhStairs', function (m, G, O) {
    var fs = G.fs, mk = axh_mk(m), nn = Math.max(2, O.N), stepH = Math.min(fs * 0.24, fs * 2.2 / nn), SC = [], i;
    for (i = 0; i < G.n; i++) SC.push(O.single ? O.idx[i] : (G.n > 1 ? O.lr[i] * (nn - 1) : 0));
    axh_emit(m, G, 'var SC=' + axh_arr(SC) + ',nn=' + nn + ',x=sg(p,0,0.42)*(nn-1),fk=Math.floor(x),mm=fk+ob(sg(x-fk,0,0.7),2.2),ci=SC[i]||0,dn=' + jzN(stepH) + '*Math.min(ci,mm),q=stg(sg(p,0.36,1),1-ci/(nn-1),0.4);' +
        'if(q>=1)a=0;else{var e=iq(q)*' + jzN(fs * 4.2 * mk) + ';' + (G.vert ? 'dx=-dn-e*0.5;dy=e;rot=-Math.min(1,q*4)*10;' : 'dx=e;dy=dn+e*0.5;rot=Math.min(1,q*4)*10;') + 'a=1-iq(sg(q,0.4,1));}',
        { K: fs * (4.2 * mk + 2.6), R: 10 });
});

/* ---- xhEatAlong — 隣を呑み込む: starting at the head of the line, each glyph slides into its neighbour and is swallowed; the
   neighbour bulges, then is swallowed in turn, and the last one gulps and is gone */
axh_reg('xhEatAlong', function (m, G, O) {
    var gulp = 'function gu(q){return Math.max(0.01,(1+Math.sin(sg(q,0,0.45)*Math.PI/2)*0.3)*(1-ic(sg(q,0.35,1))));}', NX = [], NY = [], CI = [], LN = [], i;
    if (O.single) {
        axh_emit(m, G, gulp + 'var q=stg(p,' + jzN(O.lr[0]) + ',0.6);' + AXH_Q0 + 'sx=sy=gu(q);}', { S: 1 });
        return;
    }
    for (i = 0; i < G.n; i++) {
        var g = G.g[i], last = g.ci === g.n - 1;
        NX.push(last ? 0 : G.g[i + 1].x - g.x); NY.push(last ? 0 : G.g[i + 1].y - g.y); CI.push(g.ci); LN.push(g.n);
    }
    axh_emit(m, G, gulp + 'var NX=' + axh_arr(NX) + ',NY=' + axh_arr(NY) + ',CI=' + axh_arr(CI) + ',LN=' + axh_arr(LN) + ',ci=CI[i]||0,nn=LN[i]||1,f=sg(p,0,0.78)*(nn-1),' +
        'bu=ci>0?Math.sin(sg(f-(ci-1),0.35,1.25)*Math.PI)*0.26:0,s=1;' +
        'if(ci==nn-1){var q=sg(p,0.74,1),gr=nn>1?cl(f/(nn-1))*0.14:0;if(q>=1)a=0;else if(q<=0)s=1+bu+gr;else s=gu(q)*(1+gr);}' +
        'else{var t=f-ci;if(t>=1)a=0;else if(t<=0)s=1+bu;else{var e=iq(t);dx=(NX[i]||0)*e;dy=(NY[i]||0)*e;s=(1+bu)*(1-0.6*e);a=1-ic(t);}}sx=sy=s;',
        { K: axh_maxAbs(NX, NY) + 1, S: 1 });
});

/* ---- xhShuffle — 席替え: neighbours trade places over and under each other, then trade again with the neighbour on the other
   side, fading with every exchange */
axh_reg('xhShuffle', function (m, G, O) {
    var fs = G.fs, BX = [], BY = [], CX = [], CY = [], SO = [], i;
    for (i = 0; i < G.n; i++) {
        var g = G.g[i], n = g.n, c0 = g.ci, c1 = c0 % 2 ? c0 - 1 : c0 + 1, c2;
        if (c1 >= n) c1 = c0;
        c2 = c1 % 2 ? c1 + 1 : c1 - 1; if (c2 < 0 || c2 >= n) c2 = c1;
        var B = G.g[g.s0 + c1], C = G.g[g.s0 + c2];
        BX.push(B.x - g.x); BY.push(B.y - g.y); CX.push(C.x - g.x); CY.push(C.y - g.y); SO.push(O.single || n < 2 ? 1 : 0);
    }
    axh_emit(m, G, 'var BX=' + axh_arr(BX) + ',BY=' + axh_arr(BY) + ',CX=' + axh_arr(CX) + ',CY=' + axh_arr(CY) + ',SO=' + axh_arr(SO) + ',CI=' + axh_arr(O.ci) + ',' +
        'e1=io3(sg(p,0,0.42)),e2=io3(sg(p,0.4,0.8)),en=ic(sg(p,0.62,1)),sn=(CI[i]||0)%2?1:-1,arc=(Math.sin(e1*Math.PI)+Math.sin(e2*Math.PI)*0.8)*FS*0.5*sn;' +
        'sx=sy=Math.max(0.01,1-en*0.7);a=(1-0.3*e1)*(1-en);if(SO[i])rot=sn*(e1+e2)*25;else{dx=(BX[i]||0)*e1*(1-e2)+(CX[i]||0)*e2;dy=(BY[i]||0)*e1*(1-e2)+(CY[i]||0)*e2;}' +
        (G.vert ? 'dx-=arc;' : 'dy+=arc;'),
        { K: Math.max(axh_maxAbs(BX, BY), axh_maxAbs(CX, CY)) + fs, R: 50, S: 1 });
});

/* =====================================================================
   C. PER-GLYPH SHAPE CHANGES
   ===================================================================== */

/* ---- xhShutters — 字ごとシャッター: every glyph has its own shutter: in a scattered order they close, alternately from the sides and
   from top and bottom, to a slit and out (the lyric hides; a linked copy shows through a track matte of one closing rect per
   glyph. Without helper layers the glyphs are squeezed to a slit instead) */
axh_reg('xhShutters', function (m, G, O) {
    var L = m.L, fs = G.fs, seed = axh_seed(m, O.single), RD = [], i;
    for (i = 0; i < G.n; i++) RD.push(axh_r(seed, O.idx[i], 101));
    var wq = function (rd) { return 'var q=stg(PO,' + rd + ',0.55),w=(1-io3(sg(q,0,0.8))*0.94)*(1-iq(sg(q,0.8,1)));'; };
    if (axh_nohelp(m, G) || G.nk > 40) {
        axh_emit(m, G, 'var RD=' + axh_arr(RD) + ',IX=' + axh_arr(O.idx) + ';' + wq('(RD[i]||0)') + 'if(q>=1||w<=0.0065)a=0;else if(q>0){if((IX[i]||0)%2)sy=w;else sx=w;}', { S: 1 });
        return;
    }
    axh_hideL(m);
    var T = axh_twin(m, 'JZ Out Shutters', '', '1'), M = axh_matte(m, T, 'JZ Out Shutter Matte'), H = axh_hd(m);
    axh_marks(M, G, false, '#FFFFFF', function (i2, g) {
        return { pre: H + wq(jzN(RD[i2])), size: O.idx[i2] % 2 ? '[' + jzN(g.w * 1.02) + ',' + jzN(fs * 1.24) + '*w]' : '[' + jzN(g.w * 1.24) + '*w,' + jzN(fs * 1.5) + ']', op: 'q<1&&w>0.0065?100:0' };
    });
});

/* ---- xhStomp — 踏み潰し: a heavy foot walks along the line: glyph after glyph is slammed flat onto the baseline into a dash, the
   neighbours jump, and the dashes shrink away */
axh_reg('xhStomp', function (m, G, O) {
    axh_emit(m, G, 'var LR=' + axh_arr(O.lr) + ',k=LR[i]||0,dk=' + jzN(1 / Math.max(1, O.N - 1)) + ',q=stg(p,k,0.55),jt=k-dk>=-0.000001?sg(stg(p,k-dk,0.55),0.26,0.56):0,' +
        'jo=jt>0&&jt<1&&q<0.26?Math.sin(jt*Math.PI)*(1-jt)*FS*0.12:0;' +     // jolt from the neighbour that was just hit
        'if(q>=1)a=0;else if(q<=0)dy=-jo;else{var hit=ic(sg(q,0,0.26)),wob=sg(q,0.26,0.5),bk=iq(sg(q,0.5,1));' +
        'sy=Math.max(0.035,lp(1,0.07,hit));sx=(1+hit*0.5-Math.sin(wob*Math.PI)*0.08*(q>0.26?1:0))*(1-bk);if(sx<=0.01)a=0;else{dy=(1-sy)*FS*0.5-jo;a=1-ic(sg(q,0.8,1));}}',
        { K: G.fs * 0.65, S: 1 });
});

/* ---- xhCoinSpin — コイン回転: each glyph is tossed like a coin: it spins faster and faster about its upright axis while it rises
   and dwindles (the spin = the glyph's width passing through zero and mirroring) */
axh_reg('xhCoinSpin', function (m, G, O) {
    axh_emit(m, G, 'var LR=' + axh_arr(O.lr) + ',q=stg(p,LR[i]||0,0.4);' + AXH_Q0 +
        'var c=Math.cos(q*q*Math.PI*4.5),sp=(c<0?-1:1)*Math.max(0.03,Math.abs(c)),s=Math.max(0.01,1-ic(q));dy=-(1.5*q-0.5*q*q)*FS*0.9;a=1-ic(sg(q,0.6,1));' + (G.vert ? 'sx=s;sy=s*sp;' : 'sx=s*sp;sy=s;') + '}',
        { K: G.fs, S: 2 });
});

/* ---- xhPageTurn — 一字ずつめくる: the glyphs are turned like pages, each swinging round its leading edge onto the place of the one
   before and fading as it lands */
axh_reg('xhPageTurn', function (m, G, O) {
    var GW = [], i;
    for (i = 0; i < G.n; i++) GW.push(G.vert ? G.fs : G.g[i].w);
    axh_emit(m, G, 'var GW=' + axh_arr(GW) + ',LR=' + axh_arr(O.lr) + ',q=stg(p,LR[i]||0,0.62);' + AXH_Q0 +
        'var th=io3(q)*Math.PI,c=Math.cos(th),sc=(c<0?-1:1)*Math.max(0.03,Math.abs(c));a=th<Math.PI/2?1:1-sg(th,Math.PI*0.5,Math.PI*0.92);' +
        (G.vert ? 'sy=sc;dy=-(1-c)*(GW[i]||FS)*0.5;' : 'sx=sc;dx=-(1-c)*(GW[i]||FS)*0.5;sy=1+Math.sin(th)*0.08;') + '}',
        { K: axh_maxAbs(GW) * 1.05 + 1, S: 2 });
});

/* ---- xhTiltSlide — 傾いて滑る: the glyphs tip over one by one as if the floor were tilted, then slide down the slope and off,
   the downhill ones first */
axh_reg('xhTiltSlide', function (m, G, O) {
    var dir = axh_dir(m, 111), ANG = 22, dist = Math.max(m.W, m.H) * 0.55 * axh_mk(m) / axh_s0(m.L), ca = Math.cos(ANG * Math.PI / 180), sa = Math.sin(ANG * Math.PI / 180);
    axh_emit(m, G, 'var LR=' + axh_arr(O.lr) + ',k=' + (dir > 0 ? '(LR[i]||0)' : '1-(LR[i]||0)') + ',t=stg(sg(p,0,0.5),1-k,0.55),q=stg(sg(p,0.3,1),1-k,0.45);' +     // k = 1 is the downhill end
        'if(q>=1)a=0;else if(t>0){var e=iq(q)*' + jzN(dist) + ';rot=' + jzN(dir * ANG) + '*ob(t,2.6);dx=' + jzN(dir * ca) + '*e;dy=' + jzN(sa) + '*e;a=1-iq(sg(q,0.45,1));}',
        { K: dist + 1, R: 30 });
});

/* ---- xhConcertina — 蛇腹畳み: the line folds up like a concertina: the glyphs lean alternately left and right, squeeze thin and
   close up against the head of the line, and the folded stack shuts */
axh_reg('xhConcertina', function (m, G, O) {
    var vert = G.vert, HX = [], HY = [], HF = [], i;
    for (i = 0; i < G.n; i++) {
        var g = G.g[i], h = G.g[g.s0];
        HX.push(O.single ? 0 : h.x - g.x); HY.push(O.single ? 0 : h.y - g.y); HF.push(!O.single && g.ci === 0 ? (vert ? G.fs : g.w) * 0.5 : 0);
    }
    var f = { K: axh_maxAbs(HX, HY) + G.fs, S: 1 };
    if (vert) f.R = 10; else f.SK = 30;
    axh_emit(m, G, 'var HX=' + axh_arr(HX) + ',HY=' + axh_arr(HY) + ',HF=' + axh_arr(HF) + ',LR=' + axh_arr(O.lr) + ',CI=' + axh_arr(O.ci) + ',' +
        'sh=iq(sg(p,0.5,0.94)),e=io3(stg(sg(p,0,0.6),1-(LR[i]||0),0.25)),sn=(CI[i]||0)%2?1:-1,th=Math.max(0.03,1-e*0.88),hf=(HF[i]||0)*(1-th);' +
        'a=1-ic(sg(p,0.85,1));dx=(HX[i]||0)*e*0.9;dy=(HY[i]||0)*e*0.9;' +
        (vert ? 'dy-=hf;sy=th;rot=sn*e*10;sx=Math.max(0.02,1-sh);' : 'dx-=hf;sx=th;sk=sn*e*30;sy=Math.max(0.02,1-sh);'), f);
});

/* =====================================================================
   D. SWAPS
   ===================================================================== */

/* ---- xhBarcode — バーコード化: each glyph is squeezed into a bar of its own width, so the line becomes a barcode; a reader then
   runs along it and the bars drop out (the bars = shape rects in the text colour that take over from the squeezed glyphs;
   without helper layers the glyphs themselves stay squeezed to bar width) */
axh_reg('xhBarcode', function (m, G, O) {
    var L = m.L, fs = G.fs, vert = G.vert, seed = axh_seed(m, O.single), WK = [], i, shapes = !axh_nohelp(m, G) && G.nk <= 40;
    for (i = 0; i < G.n; i++) { var id = O.idx[i]; WK.push(0.07 + 0.2 * axh_r(seed, id, 121) * axh_r(seed, id, 122) + (axh_r(seed, id, 123) < 0.3 ? 0.14 : 0)); }
    var ev = function (k, wk) {
        return 'var qa=stg(sg(PO,0,0.55),' + k + ',0.5),qb=stg(sg(PO,0.5,1),' + k + ',0.55),bar=qa>=0.5,th=bar?lp(0.34,' + wk + ',oc(sg(qa,0.5,1))):lp(1,0.3,iq(sg(qa,0,0.5))),' +
            'lg=(bar?lp(0.9,1.12,oc(sg(qa,0.5,1))):1)*Math.max(0.02,1-io3(qb)),off=(bar?1.12:1)*io3(qb)*' + jzN(fs * 0.5) + ';';
    };
    axh_emit(m, G, 'var WK=' + axh_arr(WK) + ',LR=' + axh_arr(O.lr) + ';' + ev('(LR[i]||0)', '(WK[i]||0.1)') +
        'if(qb>=1' + (shapes ? '||bar' : '') + ')a=0;else if(qa>0){' + (vert ? 'sy=th;sx=lg;dx=-off;' : 'sx=th;sy=lg;dy=off;') + '}', { K: fs * 0.6, S: 1 });
    if (!shapes) return;
    var H = axh_hd(m), E = jzN(fs * 0.9), S = axh_shape(m, 'JZ Out Bars');
    axh_marks(S, G, false, jzTextColor(L), function (i2, g) {
        return { pre: H + ev(jzN(O.lr[i2]), jzN(WK[i2])), size: vert ? '[' + E + '*lg,' + E + '*th]' : '[' + E + '*th,' + E + '*lg]',
            pos: vert ? '[' + jzN(g.x) + '-off,' + jzN(g.y) + ']' : '[' + jzN(g.x) + ',' + jzN(g.y) + '+off]', op: 'bar&&qb<1&&PO<0.998?100:0' };
    });
    jzSetExpr(jzXf(S, 'ADBE Opacity'), 'parent.transform.opacity');
});

/* ---- xhMorse — 信号になる: the glyphs shrink into dots and dashes, a line of Morse in the accent colour, which is then keyed off
   signal by signal (dots / dashes = shape ellipses, a dash being a dot stretched 3.1x like the browser's; without helper
   layers the shrunken glyphs themselves take the accent colour and blink) */
axh_reg('xhMorse', function (m, G, O) {
    var fs = G.fs, vert = G.vert, seed = axh_seed(m, O.single), hot = axh_hot(m), DS = [], i, shapes = !axh_nohelp(m, G) && G.nk <= 40;
    for (i = 0; i < G.n; i++) DS.push(axh_r(seed, O.idx[i], 131) < 0.42 ? 1 : 0);
    var ev = function (k) {
        return 'var qa=stg(sg(PO,0,0.5),' + k + ',0.5),qb=stg(sg(PO,0.5,1),' + k + ',0.6),dot=qa>=0.5,on=dot&&qb<1&&!(qb>0.45&&qb<0.72),' +      // keyed off … on … off
            'ds=0.24*ob(sg(qa,0.5,1),2.2)*(qb>=0.72?0.8:1);';
    };
    axh_emit(m, G, 'var DS=' + axh_arr(DS) + ',LR=' + axh_arr(O.lr) + ';' + ev('(LR[i]||0)') +
        'if(qb>=1)a=0;else if(qa>0){if(!dot){sx=sy=Math.max(0.05,1-iq(qa*2)*0.9);a=1-iq(qa*2)*0.5;}else{' +
        (shapes ? 'a=0;' : 'a=on?1:0;col=1;sx=sy=ds;if(DS[i])' + (vert ? 'sy' : 'sx') + '=ds*3.1;') + '}}', shapes ? { S: 1 } : { S: 1, col: hot });
    if (!shapes) return;
    var H = axh_hd(m), E = jzN(fs * 0.9), S = axh_shape(m, 'JZ Out Morse');
    axh_marks(S, G, true, hot, function (i2, g) {
        var lx = DS[i2] && !vert ? '*3.1' : '', ly = DS[i2] && vert ? '*3.1' : '';
        return { pre: H + ev(jzN(O.lr[i2])), size: '[' + E + '*ds' + lx + ',' + E + '*ds' + ly + ']', op: 'on&&PO<0.998?100:0' };
    });
    jzSetExpr(jzXf(S, 'ADBE Opacity'), 'parent.transform.opacity');
});

/* ---- xhFullStop — 句点で終わる: the sentence closes itself: the glyphs dwindle into the baseline one after another, the last one
   turns into a full stop that stays for a beat, then drops (the full stop = a linked copy of the lyric whose last glyph is
   。 or . and whose other glyphs are hidden; without it the last glyph stays as a speck and drops) */
function axh_swapChar(text, gi, ch) {      // replace the gi-th glyph (line breaks are not glyphs)
    var cs = jzChars(text), out = '', k = 0, i;
    for (i = 0; i < cs.length; i++) {
        var c = cs[i];
        if (!(c === '\r' || c === '\n' || c === '\u0003')) { if (k === gi) c = ch; k++; }
        out += c;
    }
    return out;
}
axh_reg('xhFullStop', function (m, G, O) {
    var L = m.L, fs = G.fs, last = -1, i;
    for (i = 0; i < G.n; i++) if (!G.g[i].sp) last = i;
    if (O.single) last = O.idx[0] >= O.N - 1 ? 0 : -1;
    var ch = last >= 0 ? G.g[last].ch : '', isStop = last >= 0 && '。．.'.indexOf(ch) >= 0, latin = last >= 0 && jzIsLatin(ch);
    var twin = last >= 0 && !isStop && !axh_matted(L) && !axh_crowded(m, G) && axh_main(m), cx = 0, cy = 0;
    if (twin) {          // made before the lyric gets its exit animators
        var D = axh_twin(m, 'JZ Out Stop', '', 'PO>=0.6?1:0', axh_swapChar(G.text, last, latin ? '.' : '。'));
        if (!G.arranged) { var GT = axh_geo(m, D); if (GT.n === G.n) { cx = G.g[last].x - GT.g[last].x; cy = G.g[last].y - GT.g[last].y; } }
        if (G.vert && !latin) { cx += fs * 0.3; cy -= fs * 0.3; }
        axh_emit(m, G, 'if(i!=' + last + '||p<0.6)a=0;else{var fa=iq(sg(p,0.84,1));sx=sy=Math.max(0.01,ob(sg(p,0.6,0.72),2.6));dx=' + jzN(cx) + ';dy=' + jzN(cy) + '+fa*FS*0.55;a=1-fa;}',
            { K: Math.max(Math.abs(cx), Math.abs(cy)) + fs * 0.6, S: 1, tag: 'JZ Out Stop' }, D);
    }
    axh_emit(m, G, 'var LR=' + axh_arr(O.lr) + ';if(i!=' + last + '){var q=stg(sg(p,0,0.62),LR[i]||0,0.55);' + AXH_Q0 + 'var e=iq(q);sx=sy=Math.max(0.01,1-e);dy=e*FS*0.42;a=1-ic(q);}}' +
        'else{var fa=iq(sg(p,0.84,1));' + (isStop ? 'dy=fa*FS*0.55;a=1-fa;' :       // already a full stop: it simply stays to the end
        'var qa=sg(p,0.42,0.6);if(qa>=1){' + (twin ? 'a=0;' : 'sx=sy=Math.max(0.01,0.2*ob(sg(p,0.6,0.72),2.6));dy=FS*0.42+fa*FS*0.55;a=1-fa;') + '}' +
        'else if(qa>0){var e=iq(qa);sx=sy=Math.max(0.01,1-e);dy=e*FS*0.42;}') + '}',
        { K: fs, S: 1 });
});

/* =====================================================================
   E. STROKE PIECES COMING APART  (AE has no stroke pieces)
   ===================================================================== */
// the browser's glyph-level stand-in (its softOut): q per glyph along the item
function axh_soft(m, G, O, spread, body, f) { axh_emit(m, G, 'var LR=' + axh_arr(O.lr) + ',q=stg(p,LR[i]||0,' + jzN(spread) + ');' + AXH_Q0 + body + '}', f); }

/* ---- xhPieceStrata — 段ずれ抜け: every glyph comes apart in horizontal layers, drawn out row by row, alternately to the left and
   to the right (browser: the strokes are sorted into 5 rows; here: 5 linked copies, each masked to one row of every line,
   their glyphs sliding out on the row's own delay. Without helper layers: the browser's stand-in, glyphs leave alternately) */
axh_reg('xhPieceStrata', function (m, G, O) {
    var L = m.L, r = G.r, fs = G.fs, mk = axh_mk(m), row, i;
    if (axh_nohelp(m, G) || G.masked || G.nL > 12) {
        axh_soft(m, G, O, 0.4, 'dx=(i%2?1:-1)*ic(q)*FS*1.2;a=1-iq(q);', { K: fs * 1.25 });
        return;
    }
    axh_hideL(m);
    for (row = 0; row < 5; row++) {
        var D = axh_twin(m, 'JZ Out Row ' + (row + 1), '', '1');
        axh_emit(m, G, 'var LR=' + axh_arr(O.lr) + ',u=sg(stg(p,LR[i]||0,0.35),' + jzN(row / 4 * 0.42) + ',' + jzN(row / 4 * 0.42 + 0.58) + ');' +
            'if(u>=1)a=0;else{var e=ic(u);dx=((' + row + '+i)%2?1:-1)*e*' + jzN(fs * 1.7 * mk) + ';sx=1+e*1.3;a=(1-iq(sg(u,0.35,1)))*(1-iq(sg(p,0.84,1)));}',
            { K: fs * 1.7 * mk + 1, S: 1.4 }, D);
        for (i = 0; i < G.lines.length; i++) {
            if (!G.lines[i].n) continue;
            var cy = G.lines[i].cy, y0 = cy + (row / 5 - 0.5) * fs - (row === 0 ? fs * 0.1 : 0), y1 = cy + ((row + 1) / 5 - 0.5) * fs + (row === 4 ? fs * 0.1 : 0);
            jzMaskRect(D, r.left - fs * 6, y0, r.left + r.width + fs * 6, y1);
        }
    }
});

/* ---- xhPieceThin — 画が痩せる: (browser: the smallest dots and ticks of every glyph shrink to nothing first, the big strokes hold
   out longest) here every glyph dwindles in place and fades, one after another */
axh_reg('xhPieceThin', function (m, G, O) {
    axh_soft(m, G, O, 0.4, 'sx=sy=Math.max(0.01,1-iq(q));a=1-ic(q);', { S: 1 });
});

/* ---- xhPieceSpin — 画が回る: (browser: every stroke spins on its own centre like a propeller) here every glyph spins up on its
   own centre, neighbours opposite ways, and dwindles */
axh_reg('xhPieceSpin', function (m, G, O) {
    axh_soft(m, G, O, 0.4, 'rot=(i%2?1:-1)*q*q*300;sx=sy=Math.max(0.01,1-ic(q));a=1-ic(q);', { R: 300, S: 1 });
});

/* ---- xhPieceHeap — 画が積もる: (browser: the strokes drop into a little heap at the foot of each glyph, the heaps sink away) here
   every glyph collapses flat onto its foot and fades */
axh_reg('xhPieceHeap', function (m, G, O) {
    axh_soft(m, G, O, 0.4, 'sy=Math.max(0.05,1-iq(sg(q,0,0.6))*0.9);dy=(1-sy)*FS*0.5;a=1-iq(sg(q,0.6,1));', { K: G.fs * 0.55, S: 1 });
});

/* ---- xhPieceParts — 偏と旁が別れる: each glyph parts down the middle: its left side and its right side draw apart, pause, and then
   fly off in opposite directions (two linked copies, one masked to the left halves of all glyphs and one to the right halves,
   moved apart as layers — all glyphs part together; one-glyph layers keep the browser's stagger. Without helper layers: the
   browser's stand-in, whole glyphs leaving alternately along the line) */
axh_reg('xhPieceParts', function (m, G, O) {
    var L = m.L, fs = G.fs, far = Math.max(m.W, m.H) * 0.4 * axh_mk(m) / axh_s0(L), side, i;
    if (axh_nohelp(m, G) || G.masked || G.nk > 30) {
        axh_soft(m, G, O, 0.3, 'var al=(i%2?1:-1)*(oc(sg(q,0,0.35))*FS*0.12+ic(sg(q,0.4,1))*' + jzN(far) + ');' + (G.vert ? 'dy=al;' : 'dx=al;') + 'a=1-iq(sg(q,0.5,1));', { K: far + fs * 0.2 });
        return;
    }
    axh_hideL(m);
    var ev = 'var q=' + (O.single ? 'stg(PO,' + jzN(O.lr[0]) + ',0.3)' : 'PO') + ',d=oc(sg(q,0,0.32))*' + jzN(fs * 0.13) + '+ic(sg(q,0.42,1))*' + jzN(far) + ';';
    var hy = G.nL > 1 ? G.lead / 2 : fs * 0.75;
    for (side = -1; side <= 1; side += 2) {
        var D = axh_twin(m, side < 0 ? 'JZ Out Left' : 'JZ Out Right', ev, '(1-iq(sg(q,0.55,1)))*(1-iq(sg(PO,0.84,1)))');
        jzSetExpr(jzXf(D, 'ADBE Position'), axh_hd(m) + ev + 'var c=parent.transform.anchorPoint;[c[0]+' + jzN(side) + '*d,c[1]]');
        for (i = 0; i < G.n; i++) {
            var g = G.g[i]; if (g.sp) continue;
            var ext = g.w / 2 + ((side < 0 ? g.ci === 0 : g.ci === g.n - 1) || G.vert ? fs * 0.3 : 0);
            if (side < 0) jzMaskRect(D, g.x - ext, g.y - hy, g.x, g.y + hy); else jzMaskRect(D, g.x, g.y - hy, g.x + ext, g.y + hy);
        }
    }
});
