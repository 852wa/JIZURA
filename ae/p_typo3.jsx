// ================================================================ pack typo part 3: enters, exits and holds (helpers: p_typo1)
// Per-glyph work = text animators whose Expression Selectors read per-glyph tables (positions / reading order / line) computed
// here from the layer's TextDocument like the browser's layoutText. Lines / brackets / cursors the browser draws in item space
// are shape layers parented to the lyric layer (its layer space = their space), following its opacity.

var ATY_MF = 'function ioc(x){x=cl(x);return x<0.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;}function lp(a,b,t){return a+(b-a)*t;}';

// geometry of a text layer in its own layer space: glyph centres (baseline - CY em), line extents along the reading axis
function aty_geo(m) {
    var L = m.L, td = L.property('ADBE Text Properties').property('ADBE Text Document').value, i, j;
    var fs = td.fontSize, tr = (td.tracking || 0) / 1000, LD = td.autoLeading === false && td.leading ? td.leading : fs * 1.2;
    var lines = String(td.text).split(/\r\n|\r|\n|\u0003/), nL = lines.length, V = nL >= 2, mono = /Mono|Consolas|Courier/i.test(String(td.font || ''));
    for (i = 0; i < nL; i++) if (jzChars(lines[i]).length > 1) V = false;
    var just = td.justification, left = just === ParagraphJustification.LEFT_JUSTIFY, right = just === ParagraphJustification.RIGHT_JUSTIFY;
    var g = [], ti = 0, ln = [];
    for (i = 0; i < nL; i++) {
        var cs = jzChars(lines[i]), ws = [], w = 0;
        for (j = 0; j < cs.length; j++) { ws.push(aty_adv(cs[j], mono) * fs); w += ws[j] + (j < cs.length - 1 ? tr * fs : 0); }
        var x = left ? 0 : right ? -w : -w / 2, y = i * LD - ATY_CY * fs;
        for (j = 0; j < cs.length; j++) { g.push({ ch: cs[j], x: x + ws[j] / 2, y: y, w: ws[j], h: fs, li: V ? 0 : i, ci: V ? i : j, ti: ti++, sp: aty_isSp(cs[j]) || cs[j] === '' }); x += ws[j] + tr * fs; }
    }
    // lines: a0 / a1 along the reading axis, c = cross position (centre)
    var nLine = V ? 1 : nL;
    for (i = 0; i < nLine; i++) ln.push({ a0: 1e9, a1: -1e9, c: 0, n: 0 });
    for (i = 0; i < g.length; i++) {
        var q = g[i]; if (q.sp) continue;
        var Li = ln[q.li], a0 = V ? q.y - q.h / 2 : q.x - q.w / 2, a1 = V ? q.y + q.h / 2 : q.x + q.w / 2;
        Li.a0 = Math.min(Li.a0, a0); Li.a1 = Math.max(Li.a1, a1); Li.c = V ? q.x : q.y; Li.n++;
    }
    var plain = [], x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (i = 0; i < g.length; i++) if (!g[i].sp) { plain.push(g[i]); x0 = Math.min(x0, g[i].x - g[i].w / 2); x1 = Math.max(x1, g[i].x + g[i].w / 2); y0 = Math.min(y0, g[i].y - g[i].h / 2); y1 = Math.max(y1, g[i].y + g[i].h / 2); }
    if (x0 > x1) { x0 = x1 = y0 = y1 = 0; }
    return { g: g, ln: ln, plain: plain, V: V, fs: fs, N: g.length, box: { x0: x0, x1: x1, y0: y0, y1: y1, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, w: x1 - x0, h: y1 - y0 } };
}
function aty_cutN(m) { return Math.max(1, jzCount(String(m.c.text || ''))); }
function aty_mk(m) { return jzClamp((m.ctx.fx.motion != null ? m.ctx.fx.motion : 0.7) / 0.7, 0, 1.6); }
// reading order 0..1 per glyph (spaces 0); single-glyph layers use their mi within the cut
function aty_ord(m, G) {
    var out = [], n = G.plain.length, k = 0, i;
    if (n <= 1) { var N = aty_cutN(m), o = N > 1 ? jzClamp((m.o.mi || 0) / (N - 1), 0, 1) : 0; for (i = 0; i < G.N; i++) out.push(o); return out; }
    for (i = 0; i < G.N; i++) { if (G.g[i].sp) out.push(0); else out.push(k++ / (n - 1)); }
    return out;
}
function aty_rank(G) { var out = [], k = 0; for (var i = 0; i < G.N; i++) out.push(G.g[i].sp ? -1 : k++); return out; }
// key glyph (first kanji of the longest kanji run; latin: first letter of the longest word; else first plain glyph) -> ti
function aty_keyTi(G) {
    var g = G.g, best = -1, bl = 0, i, j;
    for (i = 0; i < g.length; i++) {
        if (!jzIsKanji(g[i].ch)) continue;
        j = i; while (j < g.length && jzIsKanji(g[j].ch)) j++;
        if (j - i > bl) { bl = j - i; best = i; }
        i = j;
    }
    if (best >= 0) return best;
    var wb = -1, wl = 0;
    for (i = 0; i < g.length; i++) {
        if (!/[A-Za-z0-9]/.test(g[i].ch)) continue;
        j = i; while (j < g.length && /[A-Za-z0-9'’]/.test(g[j].ch)) j++;
        if (j - i > wl) { wl = j - i; wb = i; }
        i = j;
    }
    if (wb >= 0) return wb;
    for (i = 0; i < g.length; i++) if (!g[i].sp && !jzIsPunct(g[i].ch) && !aty_isSmall(g[i].ch)) return i;
    return 0;
}
function aty_col(m, which) { var sc = m.ctx.sc; return which === 'sub' ? aty_subc(sc) : aty_acc(sc); }
// per-glyph animators sharing one body: the body sets s sx sy (scale) dx dy (px) a (alpha) cm (colour mix) bl (blur 0..1) sw (outline 0..1) h (hide)
// o: { pos: bound px, sc: 1, op: 1, col: hex, blur: px, fillOp: 1, stroke: px }
function aty_fx(m, name, pre, body, o) {
    var L = m.L, hd = m.HD + ATY_MF + pre + 'var i=textIndex-1,s=1,sx=1,sy=1,dx=0,dy=0,a=1,cm=0,bl=0,sw=0,h=false;' + body + ';\n';
    if (o.pos) { var KB = Math.max(1, o.pos); jzAnimator(L, name + ' Move', [['ADBE Text Position 3D', [KB, KB, 0]]], hd + '[dx/' + jzN(KB) + '*100,dy/' + jzN(KB) + '*100,0]'); }
    if (o.sc) jzAnimator(L, name + ' Size', [['ADBE Text Scale 3D', [400, 400, 100]]], hd + '[Math.max(-100,Math.min(100,(s*sx-1)/3*100)),Math.max(-100,Math.min(100,(s*sy-1)/3*100)),0]');
    if (o.col) jzAnimator(L, name + ' Colour', [['ADBE Text Fill Color', jzHex(o.col)]], hd + 'cl(cm)*100');
    if (o.blur) jzAnimator(L, name + ' Soft', [['ADBE Text Blur', [o.blur, o.blur]]], hd + 'cl(bl)*100');
    if (o.dot) {       // tiny glyph + thick round stroke in the accent colour = a dot
        var td = L.property('ADBE Text Properties').property('ADBE Text Document').value;
        if (!td.applyStroke) jzTextDoc(L, function (d) { d.applyStroke = true; d.strokeColor = d.fillColor; d.strokeWidth = 0; });
        jzAnimator(L, name + ' Dot', [['ADBE Text Stroke Width', m.size * 0.9], ['ADBE Text Stroke Color', jzHex(o.dot)]], hd + 'cl(bl)*100');
    }
    if (o.stroke) jzAnimator(L, name + ' Outline', [['ADBE Text Stroke Width', o.stroke], ['ADBE Text Fill Opacity', 0]], hd + 'cl(sw)*100');
    if (o.op) jzAnimator(L, name + ' Alpha', [['ADBE Text Opacity', 0]], hd + 'h?100:(1-cl(a))*100');
}
// shape layer living in the lyric layer's space (parented, identity transform), following its opacity, main pass only
function aty_post(m, name) {
    var S = jzShapeLayer(m.ctx, name, 0, 0);
    S.parent = m.L;
    jzXf(S, 'ADBE Anchor Point').setValue([0, 0]); jzXf(S, 'ADBE Position').setValue([0, 0]); jzXf(S, 'ADBE Scale').setValue([100, 100]); jzXf(S, 'ADBE Rotate Z').setValue(0);
    jzSetExpr(jzXf(S, 'ADBE Opacity'), 'var p=thisLayer.parent;p?p.transform.opacity:value');
    jzNoGhost(S);
    return S;
}
// per-line rule segments in layer space: from a (expr, 0..1 along the line) to b (expr), offset across the line by off (px)
function aty_lineRules(m, S, G, off, col, lw, qa, qb, gop, pre2) {
    for (var k = 0; k < G.ln.length; k++) {
        var Ln = G.ln[k]; if (!Ln.n) continue;
        var c = Ln.c + off, seg = G.V ? [[c, Ln.a0], [c, Ln.a1]] : [[Ln.a0, c], [Ln.a1, c]], pre = m.HD + ATY_MF + (pre2 || '') + 'var k=' + k + ';';
        aty_grp(S, 'rule ' + (k + 1), [seg], col, { width: lw, start: pre + '100*cl(' + qa + ')', trim: pre + '100*cl(' + qb + ')', gop: gop ? pre + gop : null });
    }
}
// layer mask in layer space: the first mask of the layer adds, later ones intersect
function aty_mask(L, x0, y0, x1, y1, expandExpr) {
    var mp = L.property('ADBE Mask Parade'), first = mp.numProperties === 0;
    var mk = jzMaskRect(L, x0, y0, x1, y1);
    if (!first) { try { mk.maskMode = MaskMode.INTERSECT; } catch (e) {} }
    if (expandExpr) mk.property('ADBE Mask Offset').expression = expandExpr;
    return mk;
}
// brackets 「 」 around the box, opening (half = expr in px) along the reading axis
function aty_brackets(m, G, halfExpr, alphaExpr) {
    var b = G.box, V = G.V, size = m.size, g = size * 0.18, Lb = Math.max(size * 0.28, (V ? b.w : b.h) * 0.3), lw = Math.max(2 * m.u, size * 0.055), col = aty_col(m);
    var S = aty_post(m, 'JZ brackets'), hd = m.HD + ATY_MF;
    if (!V) {
        var yt = b.cy - b.h / 2 - g * 0.5, yb = b.cy + b.h / 2 + g * 0.5, xl = b.cx - g, xr = b.cx + g;
        aty_grp(S, 'open', [[[xl, yt + Lb], [xl, yt], [xl + Lb, yt]]], col, { width: lw, gpos: hd + 'var hf=' + halfExpr + ';[-hf,0]' });
        aty_grp(S, 'close', [[[xr, yb - Lb], [xr, yb], [xr - Lb, yb]]], col, { width: lw, gpos: hd + 'var hf=' + halfExpr + ';[hf,0]' });
    } else {
        var yt2 = b.cy - g, yb2 = b.cy + g, xr2 = b.cx + b.w / 2 + g * 0.5, xl2 = b.cx - b.w / 2 - g * 0.5;
        aty_grp(S, 'open', [[[xr2 - Lb, yt2], [xr2, yt2], [xr2, yt2 + Lb]]], col, { width: lw, gpos: hd + 'var hf=' + halfExpr + ';[0,-hf]' });
        aty_grp(S, 'close', [[[xl2 + Lb, yb2], [xl2, yb2], [xl2, yb2 - Lb]]], col, { width: lw, gpos: hd + 'var hf=' + halfExpr + ';[0,hf]' });
    }
    jzSetExpr(jzXf(S, 'ADBE Opacity'), hd + 'var p=thisLayer.parent;(p?p.transform.opacity:100)*cl(' + alphaExpr + ')');
}
function aty_isSolo(m, G) { return G.plain.length <= 1 && aty_cutN(m) > 1; }
// thin mask at the box centre, opened by mask expansion (half px); 'after' = expansion once the move is over
function aty_clipMask(m, G, halfExpr) {
    var b = G.box, big = m.size * 4, r = jzRect(m.L);
    var x0 = Math.min(b.x0, r.left) - big, x1 = Math.max(b.x1, r.left + r.width) + big, y0 = Math.min(b.y0, r.top) - big, y1 = Math.max(b.y1, r.top + r.height) + big;
    if (G.V) aty_mask(m.L, x0, b.cy - 0.01, x1, b.cy + 0.01, m.HD + ATY_MF + halfExpr);
    else aty_mask(m.L, b.cx - 0.01, y0, b.cx + 0.01, y1, m.HD + ATY_MF + halfExpr);
}

/* ================================================================ ENTRANCES */

/* キー字先行 — the key glyph lands first (big -> size), the rest slide out from behind it */
jzReg('enter', 'tyKeyFirst', { selfHide: true, apply: function (m) {
    var G = aty_geo(m), i;
    if (G.plain.length <= 1) { aty_fx(m, 'JZ In Key', 'var q=cl(P/0.7);', 'if(q<=0)h=true;s=lp(1.9,1,oe(q));a=cl(q*4)', { sc: 1, op: 1 }); return; }
    var ki = aty_keyTi(G), gk = G.g[ki], md = 1, D = [], DX = [], DY = [], KB = 1;
    for (i = 0; i < G.N; i++) if (!G.g[i].sp) md = Math.max(md, Math.abs(i - ki));
    for (i = 0; i < G.N; i++) { D.push(Math.abs(i - ki) / md); DX.push(gk.x - G.g[i].x); DY.push(gk.y - G.g[i].y); KB = Math.max(KB, Math.abs(DX[i]), Math.abs(DY[i])); }
    aty_fx(m, 'JZ In Key', 'var KI=' + ki + ',D=' + aty_arr(D) + ',DX=' + aty_arr(DX) + ',DY=' + aty_arr(DY) + ';',
        'var kq=cl(P/0.42);if(i===KI){if(kq<=0)h=true;s=lp(2.1,1,oe(kq));a=cl(kq*4);}else{var q=cl((P-0.3-D[i]*0.35)/0.35);if(q<=0)h=true;var e=oe(q);dx=DX[i]*(1-e);dy=DY[i]*(1-e);s=lp(0.4,1,e);a=cl(q*2.5);}',
        { pos: KB, sc: 1, op: 1 });
} });

/* 行送りワイプ — each line is wiped on in turn, an accent rule running ahead under it */
jzReg('enter', 'tyLineWipe', { selfHide: true, apply: function (m) {
    var G = aty_geo(m), nL = G.ln.length, st = Math.min(0.28, 0.6 / nL), LI = [], A0 = [], LN = [], LA = [], LB = [], i;
    for (i = 0; i < G.N; i++) { var g = G.g[i]; LI.push(g.li); A0.push(G.V ? g.y - g.h / 2 : g.x - g.w / 2); LN.push(Math.max(1, G.V ? g.h : g.w)); }
    for (i = 0; i < nL; i++) { LA.push(G.ln[i].a0); LB.push(G.ln[i].a1); }
    var Q = 'function qk(k){return ioc(cl((P-k*' + jzN(st) + ')/' + jzN(1 - (nL - 1) * st) + '));}';
    // glyphs appear as the wipe edge passes them (a soft per-glyph edge)
    aty_fx(m, 'JZ In LineWipe', Q + 'var LI=' + aty_arr(LI) + ',A0=' + aty_arr(A0) + ',LN=' + aty_arr(LN) + ',LA=' + aty_arr(LA) + ',LB=' + aty_arr(LB) + ';',
        'var k=LI[i],q=qk(k),ed=lp(LA[k],LB[k],q),f=(ed-A0[i])/LN[i];if(f<=0)h=true;a=q>=1?1:cl(f*1.3)', { op: 1 });
    var S = aty_post(m, 'JZ wipe rule');
    aty_lineRules(m, S, G, m.size * 0.64, aty_col(m), Math.max(2 * m.u, m.size * 0.05), 'ic(cl(qk(k)*1.4-0.4))', 'qk(k)', 'qk(k)<1?100:0', Q);
} });

/* 一字ずつ拡大 — glyphs are flashed one at a time, large in the middle, then set into their slot */
jzReg('enter', 'tyZoomOne', { selfHide: true, apply: function (m) {
    var G = aty_geo(m), nn = G.plain.length, i;
    if (!nn) return;
    var b = G.box, big = jzClamp(Math.min(m.W, m.H) * 0.5 / Math.max(1, m.size), 1.15, 2.6), Lq = nn > 1 ? Math.min(0.55, 2.2 / (nn + 1)) : 1;
    if (nn === 1 && aty_cutN(m) > 1) { aty_fx(m, 'JZ In ZoomOne', 'var q=cl(P);', 'if(q<=0)h=true;s=lp(' + jzN(big) + ',1,oe(q));a=cl(q*5)', { sc: 1, op: 1 }); return; }
    var R = aty_rank(G), CX = [], CY = [], KB = 1;
    for (i = 0; i < G.N; i++) { CX.push(b.cx - G.g[i].x); CY.push(b.cy - G.g[i].y); KB = Math.max(KB, Math.abs(CX[i]), Math.abs(CY[i])); }
    aty_fx(m, 'JZ In ZoomOne', 'var R=' + aty_arr(R) + ',CX=' + aty_arr(CX) + ',CY=' + aty_arr(CY) + ',BG=' + jzN(big) + ',LQ=' + jzN(Lq) + ',NN=' + nn + ';',
        'var k=R[i];if(k<0){h=true;}else{var s0=NN>1?k/(NN-1)*(1-LQ):0,q=cl((P-s0)/LQ);if(q<=0)h=true;' +
        'if(q<0.38){dx=CX[i];dy=CY[i];s=lp(BG*1.25,BG,oc(q/0.38));a=cl(q/0.1);}else if(q<1){var e=ioc((q-0.38)/0.62);dx=CX[i]*(1-e);dy=CY[i]*(1-e);s=lp(BG,1,e);}}',
        { pos: KB, sc: 1, op: 1 });
} });

/* 下線から立つ — an underline is drawn, the glyphs grow up out of it, the line then retracts */
jzReg('enter', 'tyUnderLift', { selfHide: true, apply: function (m) {
    var G = aty_geo(m), O = aty_ord(m, G), multi = G.plain.length > 1, V = G.V, i, HW = [];
    for (i = 0; i < G.N; i++) HW.push((V ? G.g[i].w : G.g[i].h) * 0.45);
    aty_fx(m, 'JZ In Lift', 'var O=' + aty_arr(O) + ',HW=' + aty_arr(HW) + ';',
        'var q=cl((P-0.22-' + (multi ? 'O[i]' : '0') + '*0.38)/0.4);if(q<=0)h=true;if(q<1){var e=Math.max(0.02,ob(q,1.5));' + (V ? 'sx=e;dx=-(1-e)*HW[i];' : 'sy=e;dy=(1-e)*HW[i];') + '}',
        { pos: m.size, sc: 1, op: 1 });
    var S = aty_post(m, 'JZ lift line');
    aty_lineRules(m, S, G, (V ? -1 : 1) * m.size * 0.56, aty_col(m), Math.max(2.5 * m.u, m.size * 0.055), 'ic(cl((P-0.72)/0.28))', 'oe(cl(P/0.32))', null);
} });

/* 点から字 — every glyph starts as a small accent dot that pops, then grows into the glyph */
jzReg('enter', 'tyDotGrow', { selfHide: true, apply: function (m) {
    var G = aty_geo(m), O = aty_ord(m, G);
    aty_fx(m, 'JZ In Dot', 'var O=' + aty_arr(O) + ';',
        'var t0=O[i]*0.5,q1=cl((P-t0)/0.18),q2=cl((P-t0-0.2)/0.3);if(q1<=0)h=true;else if(q2<=0){s=0.2*ob(q1,2.6);cm=1;bl=1;}else if(q2<1){s=lp(0.3,1,ob(q2,1.8));a=cl(0.35+q2*3);cm=1-cl(q2*2);bl=1-cl(q2*4);}',
        { sc: 1, op: 1, col: aty_col(m), dot: aty_col(m) });
} });

/* 括弧が開く — 「 」 start together in the middle and slide apart, revealing the line between them */
jzReg('enter', 'tyBracketOpen', { apply: function (m) {
    var G = aty_geo(m), b = G.box, pad = m.size * 0.12, hw = (G.V ? b.h : b.w) / 2 + pad;
    var half = hw + '*ioc(cl((P-0.08)/0.62))';
    aty_clipMask(m, G, 'P>=1?1e4:' + half);
    if (!aty_isSolo(m, G)) aty_brackets(m, G, jzN(hw) + '*ioc(cl((P-0.08)/0.62))', 'cl(P/0.08)*(1-cl((P-0.78)/0.22))');
} });

/* 打ち直し — typed in with a cursor; one glyph is mistyped, deleted and typed again */
jzReg('enter', 'tyRetype', { selfHide: true, apply: function (m) {
    var G = aty_geo(m), N = G.N, i;
    if (G.plain.length <= 1) { jzAnimator(m.L, 'JZ In Retype', [['ADBE Text Opacity', 0]], m.HD + 'P<0.35?100:0'); return; }
    var seed = (m.c.seed | 0) + (m.o.mi || 0) * 101, wi = -1;
    if (G.plain.length >= 3) wi = G.plain[1 + Math.floor(jzR(seed, 31) * (G.plain.length - 1)) % (G.plain.length - 1)].ti;
    var S0 = N + (wi >= 0 ? 2 : 0);
    var pre = 'var WI=' + wi + ',NN=' + N + ',k=Math.floor(cl(P)*' + jzN(S0 + 0.999) + '),sh,wr=false;' +
        'if(WI<0||k<=WI)sh=Math.min(NN,k);else if(k===WI+1){sh=WI+1;wr=true;}else if(k===WI+2)sh=WI;else sh=Math.min(NN,k-2);';
    aty_fx(m, 'JZ In Retype', pre, 'if(i>=sh)h=true;if(wr&&i===WI)cm=1', { op: 1, col: aty_col(m) });
    if (wi >= 0) jzAnimator(m.L, 'JZ In Typo', [['ADBE Text Character Offset', 3 + Math.floor(jzR(seed, 32) * 9)]], m.HD + pre + '(wr&&textIndex-1===WI)?100:0');
    if (G.V) return;
    // block cursor after the last typed glyph (blinks once the line is complete, gone at the end of the entrance)
    var CX = [], CY = [];
    for (i = 0; i <= N; i++) {
        var g = i > 0 ? G.g[i - 1] : null;
        CX.push(g ? g.x + g.w / 2 + m.size * 0.08 + m.size * 0.25 : (G.g[0] ? G.g[0].x - G.g[0].w / 2 + m.size * 0.25 : 0)); CY.push(g ? g.y : (G.g[0] ? G.g[0].y : 0));
    }
    var S = aty_post(m, 'JZ cursor');
    aty_rectGrp(S, 'cursor', -m.size * 0.25, -m.size * 0.45, m.size * 0.5, m.size * 0.9, m.ctx.sc.accent,
        { gpos: m.HD + pre + 'var X=' + aty_arr(CX) + ',Y=' + aty_arr(CY) + ';[X[sh],Y[sh]]' });
    jzSetExpr(jzXf(S, 'ADBE Opacity'), m.HD + pre + 'var p=thisLayer.parent;var o=p?p.transform.opacity:100;(time<DL||P>=1)?0:(sh>=NN&&Math.floor(time*12)%2===1?0:o)');
} });

/* ルビから — each glyph appears small in the ruby position above its slot, then drops and grows into place */
jzReg('enter', 'tyRubyDrop', { selfHide: true, apply: function (m) {
    var G = aty_geo(m), O = aty_ord(m, G), V = G.V, OF = [], i;
    for (i = 0; i < G.N; i++) OF.push(V ? G.g[i].w * 0.8 : -G.g[i].h * 0.8);
    aty_fx(m, 'JZ In Ruby', 'var O=' + aty_arr(O) + ',OF=' + aty_arr(OF) + ';',
        'var q=cl((P-O[i]*0.45)/0.55);if(q<=0)h=true;else if(q<0.4){' + (V ? 'dx' : 'dy') + '=OF[i];s=0.32;a=cl(q/0.4*1.6);cm=1;}else if(q<1){var e=oc((q-0.4)/0.6);s=lp(0.32,1,e);' + (V ? 'dx' : 'dy') + '=OF[i]*(1-e);cm=e<0.55?1:0;}',
        { pos: m.size, sc: 1, op: 1, col: aty_col(m, 'sub') });
} });

/* ================================================================ EXITS */

/* 線で消す — a strike line is drawn through each line, the glyphs collapse onto it, then the line retracts */
jzReg('exit', 'tyStrike', { apply: function (m) {
    var G = aty_geo(m), O = aty_ord(m, G), V = G.V;
    aty_fx(m, 'JZ Out Strike', 'var O=' + aty_arr(O) + ';',
        'var q=cl((PO-0.3-O[i]*0.3)/0.4);if(q>=1)h=true;else if(q>0){var e=ic(q);' + (V ? 'sx' : 'sy') + '=1-e*0.95;a=1-e*e;}', { sc: 1, op: 1 });
    var S = aty_post(m, 'JZ strike'), pad = m.size * 0.1, i;
    for (i = 0; i < G.ln.length; i++) { G.ln[i].a0 -= pad; G.ln[i].a1 += pad; }
    aty_lineRules(m, S, G, m.size * 0.04, aty_col(m), Math.max(2.5 * m.u, m.size * 0.07), 'ic(cl((PO-0.74)/0.26))', 'PO>0?oe(cl(PO/0.38)):0', null);
} });

/* 点に戻る — glyphs shrink into small accent dots, which then wink out */
jzReg('exit', 'tyToDot', { apply: function (m) {
    var G = aty_geo(m), O = aty_ord(m, G);
    aty_fx(m, 'JZ Out Dot', 'var O=' + aty_arr(O) + ';',
        'var q=cl((PO-O[i]*0.4)/0.6);if(q>=1)h=true;else if(q>0){if(q<0.5)s=lp(1,0.3,ic(q/0.5));else{var u=(q-0.5)/0.5;s=0.22*(1-ic(u));cm=1;bl=1;a=1-u*u;}}',
        { sc: 1, op: 1, col: aty_col(m), dot: aty_col(m) });
} });

/* 改行送り — the text line-feeds upward in three steps and leaves through a window */
jzReg('exit', 'tyLineFeed', { apply: function (m) {
    var G = aty_geo(m), b = G.box, V = G.V, pad = m.size * 0.12, dist = (V ? b.w : b.h) + m.size * 0.3;
    var st = 'var kk=cl(PO)*3,sg=Math.min(3,Math.floor(kk)),ff=kk-sg,stp=Math.min(1,(sg+oc(cl(ff*2.6)))/3);';
    jzAnimator(m.L, 'JZ Out LineFeed', [['ADBE Text Position 3D', V ? [dist, 0, 0] : [0, -dist, 0]]], m.HD + st + 'stp*100');
    if (V) aty_mask(m.L, b.x0 - pad, b.y0 - m.size * 4, b.x1 + pad, b.y1 + m.size * 4, m.HD + 'PO<=0?1e4:0');
    else aty_mask(m.L, b.x0 - m.size * 4, b.y0 - pad, b.x1 + m.size * 4, b.y1 + pad, m.HD + 'PO<=0?1e4:0');
    m.parts.op.push('f*=PO>=0.999?0:1;');
} });

/* 括弧閉じ — 「 」 appear at the ends and close in to the middle, taking the line with them */
jzReg('exit', 'tyBracketClose', { apply: function (m) {
    var G = aty_geo(m), b = G.box, hw = (G.V ? b.h : b.w) / 2 + m.size * 0.12, half = jzN(hw) + '*(1-ioc(cl((PO-0.12)/0.7)))';
    aty_clipMask(m, G, 'PO<=0?1e4:' + half);
    m.parts.op.push('f*=cl((PO-0.12)/0.7)>=1?0:1;');
    if (!aty_isSolo(m, G)) aty_brackets(m, G, half, 'cl(PO/0.12)*(1-cl((PO-0.84)/0.16))');
} });

/* 番号に変わる — each glyph turns into its small index number, then the numbers fade */
jzReg('exit', 'tyToIndex', { apply: function (m) {
    var G = aty_geo(m), O = aty_ord(m, G), V = G.V, i;
    aty_fx(m, 'JZ Out Index', 'var O=' + aty_arr(O) + ';', 'var q=cl((PO-O[i]*0.4)/0.6);if(q>=0.3)h=true;else if(q>0)s=lp(1,0.55,ic(q/0.3))', { sc: 1, op: 1 });
    var base = G.plain.length <= 1 ? Math.round(m.o.mi || 0) : 0, strs = [], J = [], off = [], fs = m.size * 0.42, LD = fs * 1.2, k = 0;
    for (i = 0; i < G.N; i++) {
        var g = G.g[i]; if (g.sp) continue;
        var t = aty_p2(base + (++k)), cs = jzChars(t);
        for (var c2 = 0; c2 < cs.length; c2++) { J.push(i); off.push([g.x, g.y + ATY_CY * fs - (strs.length) * LD]); }
        strs.push(t);
    }
    if (!strs.length) return;
    // the numbers: one text layer in the lyric's space, each number over its glyph
    var T = jzText(m.ctx, strs.join('\r'), { font: jzMonoF(m.ctx), size: fs, color: aty_col(m, 'sub'), x: 0, y: 0, align: 'center', track: 0, leading: LD, name: 'JZ indices' });
    T.parent = m.L;
    jzXf(T, 'ADBE Anchor Point').setValue([0, 0]); jzXf(T, 'ADBE Position').setValue([0, 0]); jzXf(T, 'ADBE Scale').setValue([100, 100]); jzXf(T, 'ADBE Rotate Z').setValue(0);
    jzCharOffsets(T, off, 'JZ Place');
    var pre = m.HD + 'var O=' + aty_arr(O) + ',J=' + aty_arr(J) + ';var j=J[textIndex-1]||0,q=cl((PO-O[j]*0.4)/0.6),u=(q-0.3)/0.7;';
    jzAnimator(T, 'JZ Index Drift', [['ADBE Text Position 3D', V ? [-m.size * 0.2, 0, 0] : [0, -m.size * 0.2, 0]]], pre + 'cl(u)*100');
    jzAnimator(T, 'JZ Index Alpha', [['ADBE Text Opacity', 0]], pre + '(q<0.3||q>=1)?100:ic(u)*100');
    jzSetExpr(jzXf(T, 'ADBE Opacity'), 'var p=thisLayer.parent;p?p.transform.opacity:value');
    jzNoGhost(T);
} });

/* 一字残し — everything folds into the key glyph, which then swells and fades */
jzReg('exit', 'tyKeyLast', { apply: function (m) {
    var G = aty_geo(m), i;
    if (G.plain.length <= 1 && aty_cutN(m) > 1) {
        var keep = !!G.plain[0] && jzIsKanji(G.plain[0].ch) && jzR(m.c.seed | 0, Math.round(m.o.mi || 0), 5) < 0.5;
        if (!keep) aty_fx(m, 'JZ Out Key', 'var q=cl(PO/0.5);', 'if(q>=1)h=true;s=1-0.6*ic(q);a=1-q', { sc: 1, op: 1 });
        else aty_fx(m, 'JZ Out Key', 'var q=cl((PO-0.4)/0.6);', 'if(q>=1)h=true;s=1+ic(q)*1.4;a=1-ic(q)', { sc: 1, op: 1 });
        return;
    }
    var ki = G.plain.length > 1 ? aty_keyTi(G) : (G.plain[0] ? G.plain[0].ti : 0), gk = G.g[ki] || G.g[0], md = 1, D = [], DX = [], DY = [], KB = 1;
    for (i = 0; i < G.N; i++) if (!G.g[i].sp) md = Math.max(md, Math.abs(i - ki));
    for (i = 0; i < G.N; i++) { D.push(Math.abs(i - ki) / md); DX.push(gk.x - G.g[i].x); DY.push(gk.y - G.g[i].y); KB = Math.max(KB, Math.abs(DX[i]), Math.abs(DY[i])); }
    aty_fx(m, 'JZ Out Key', 'var KI=' + ki + ',D=' + aty_arr(D) + ',DX=' + aty_arr(DX) + ',DY=' + aty_arr(DY) + ';',
        'if(i===KI){var q=cl((PO-0.45)/0.55);if(q>=1)h=true;s=1+ic(q)*1.8;a=1-ic(q);}else{var q2=cl((PO-(1-D[i])*0.2)/0.45);if(q2>=1)h=true;else if(q2>0){var e=ic(q2);dx=DX[i]*e;dy=DY[i]*e;s=1-0.6*e;a=1-e;}}',
        { pos: KB, sc: 1, op: 1 });
} });

/* 下線へ沈む — an underline is drawn, each glyph sinks into it (masked at the line), then the line retracts */
jzReg('exit', 'tyUnderSink', { apply: function (m) {
    var G = aty_geo(m), O = aty_ord(m, G), V = G.V, HW = [], i, off = (V ? -1 : 1) * m.size * 0.56;
    for (i = 0; i < G.N; i++) HW.push(V ? G.g[i].w : G.g[i].h);
    var one = G.ln.length <= 1;
    if (one) aty_fx(m, 'JZ Out Sink', 'var O=' + aty_arr(O) + ',HW=' + aty_arr(HW) + ';',
        'var q=cl((PO-0.2-O[i]*0.4)/0.35);if(q>=1)h=true;else if(q>0){var d=ic(q)*1.25;' + (V ? 'dx=-HW[i]*d' : 'dy=HW[i]*d') + ';}', { pos: m.size * 1.4, op: 1 });
    // several lines: a static clip per line would let glyphs show again in the next line's band -> they squash into their underline instead
    else aty_fx(m, 'JZ Out Sink', 'var O=' + aty_arr(O) + ',HW=' + aty_arr(HW) + ';',
        'var q=cl((PO-0.2-O[i]*0.4)/0.35);if(q>=1)h=true;else if(q>0){var d=ic(q);' + (V ? 'sx=1-d;dx=-HW[i]*0.55*d' : 'sy=1-d;dy=HW[i]*0.55*d') + ';}', { pos: m.size, sc: 1, op: 1 });
    // one line: clip it at its underline while sinking (the mask opens fully outside the exit)
    var big = m.size * 6, r = jzRect(m.L);
    if (one && G.ln[0] && G.ln[0].n) {
        var Ln = G.ln[0], c = Ln.c + off;
        if (V) aty_mask(m.L, c, Ln.a0 - big, c + big, Ln.a1 + big, m.HD + 'PO<=0?1e4:0');
        else aty_mask(m.L, Math.min(Ln.a0, r.left) - big, c - big, Math.max(Ln.a1, r.left + r.width) + big, c, m.HD + 'PO<=0?1e4:0');
    }
    var S = aty_post(m, 'JZ sink line');
    aty_lineRules(m, S, G, off, aty_col(m), Math.max(2.5 * m.u, m.size * 0.05), 'ic(cl((PO-0.78)/0.22))', 'PO>0?oe(cl(PO/0.28)):0', null);
} });

/* 縦組に折れる — a horizontal line folds down into a vertical column (a column folds into a row), then fades */
jzReg('exit', 'tyFoldVert', { apply: function (m) {
    var G = aty_geo(m), V = G.V, i, DX = [], DY = [], KB = 1, lines = {};
    for (i = 0; i < G.N; i++) { var g = G.g[i]; if (g.sp) continue; if (!lines[g.li]) lines[g.li] = []; lines[g.li].push(g); }
    for (i = 0; i < G.N; i++) {
        var q = G.g[i], dx = 0, dy = 0;
        if (!q.sp) {
            var Ls = lines[q.li], n = Ls.length, k = 0, c0 = 1e9, c1 = -1e9;
            for (var j = 0; j < n; j++) { if (Ls[j] === q) k = j; c0 = Math.min(c0, V ? Ls[j].y : Ls[j].x); c1 = Math.max(c1, V ? Ls[j].y : Ls[j].x); }
            var mid = (c0 + c1) / 2, pitch = Math.min(1.02, (V ? m.W : m.H) * 0.82 / Math.max(1, n * (V ? q.w : q.h))), of = (k - (n - 1) / 2) * pitch;
            if (!V) { dx = mid - q.x; dy = of * q.h; } else { dy = mid - q.y; dx = of * q.w; }
        }
        DX.push(dx); DY.push(dy); KB = Math.max(KB, Math.abs(dx), Math.abs(dy) + m.size);
    }
    aty_fx(m, 'JZ Out Fold', 'var DX=' + aty_arr(DX) + ',DY=' + aty_arr(DY) + ',e=ioc(cl(PO/0.5)),ff=cl((PO-0.36)/0.5),dr=iq(ff)*' + jzN(m.size * 0.25) + ';',
        'if(ff>=1)h=true;dx=DX[i]*e' + (V ? '-dr' : '') + ';dy=DY[i]*e' + (V ? '' : '+dr') + ';a=1-iq(ff)', { pos: KB, op: 1 });
} });

/* ================================================================ HOLDS */

/* 一字の鼓動 — only the key glyph pulses */
jzReg('hold', 'tyKeyPulse', { apply: function (m) {
    var G = aty_geo(m);
    if (!G.plain.length) return;
    var kk = jzN(0.1 * aty_mk(m)), pulse = 'var pu=Math.pow(0.5+0.5*Math.sin(time*6.2832*0.95),4),kq=' + kk + '*AMT*pu;';
    if (G.plain.length === 1) { if (!jzIsKanji(G.plain[0].ch)) return; aty_fx(m, 'JZ Hold Pulse', pulse, 's=1+kq*0.7', { sc: 1 }); return; }
    aty_fx(m, 'JZ Hold Pulse', pulse + 'var KI=' + aty_keyTi(G) + ';', 'if(i===KI)s=1+kq', { sc: 1 });
} });

/* 読み送り — a reading cursor steps along the line: the current glyph lifts a little in the accent colour */
jzReg('hold', 'tyReadCursor', { apply: function (m) {
    var G = aty_geo(m), n = G.plain.length;
    if (!n) return;
    var V = G.V, lift = m.size * 0.07 * Math.min(1, aty_mk(m)), tot = n <= 1 ? aty_cutN(m) : n;
    var pre = 'var ps=Math.floor(time*4)%' + (tot + 2) + ',fr=(time*4)%1,up=oc(cl(fr*4))*(1-ic(cl((fr-0.6)/0.4))),on=AMT>=0.3;';
    var sel = n <= 1 ? '(' + (Math.round(m.o.mi || 0) % (tot + 2)) + '===ps)' : '(R[i]===ps)';
    aty_fx(m, 'JZ Hold Read', pre + 'var R=' + aty_arr(aty_rank(G)) + ';',
        'if(on&&' + sel + '){' + (V ? 'dx=' + jzN(lift) + '*up' : 'dy=-' + jzN(lift) + '*up') + ';cm=1;}', { pos: Math.max(1, lift), col: aty_col(m) });
} });

/* 白抜き明滅 — now and then one glyph switches to outline only for a moment */
jzReg('hold', 'tyOutlineBlink', { apply: function (m) {
    var G = aty_geo(m), n = G.plain.length, td = m.L.property('ADBE Text Properties').property('ADBE Text Document').value;
    if (!n || td.applyFill === false) return;
    if (!td.applyStroke) jzTextDoc(m.L, function (d) { d.applyStroke = true; d.strokeColor = d.fillColor; d.strokeWidth = 0; });
    var pr = 0.28 * (0.5 + 0.5 * aty_mk(m)) / (n === 1 ? Math.max(1, aty_cutN(m) * 0.5) : 1);
    var pre = 'var sp=Math.floor(time*6),R=' + aty_arr(aty_rank(G)) + ',on=hh(SD*0.37+sp*7.13)<' + jzN(pr) + '*AMT,pk=Math.floor(hh(SD*0.61+sp*3.7)*' + n + '),tw=' + (n > 3 ? 'hh(SD*0.23+sp*5.3)<0.3?Math.floor(hh(SD*0.91+sp*2.9)*' + n + '):-1' : '-1') + ';';
    aty_fx(m, 'JZ Hold Blink', pre, 'if(on&&(R[i]===pk||R[i]===tw))sw=1', { stroke: Math.max(1.5 * m.u, m.size * 0.03) });
} });

/* 字間ステップ — letter spacing snaps between a few set values, like a typographer trying options */
jzReg('hold', 'tyTrackStep', { apply: function (m) {
    var G = aty_geo(m);
    if (G.plain.length < 2 || G.V) return;
    var mk = Math.min(1.2, aty_mk(m));
    jzAnimator(m.L, 'JZ Hold Track', [['ADBE Text Tracking Amount', 100 * mk]],
        m.HD + 'var lv=[0,1,2,1],t=time/0.55,k=Math.floor(t),f=t-k,a=lv[k%4],b=lv[(k+1)%4],e=cl((f-0.85)/0.15);e=e>=1?1:1-Math.pow(2,-10*e);(a+(b-a)*e)/2*AMT*100');
} });
