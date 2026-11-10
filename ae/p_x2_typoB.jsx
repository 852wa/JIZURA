// ================================================================ pack x2typoB (AE port of src/11p_x2_typoB.js): 9 enter, 8 exit, 5 hold, 5 treat, 4 cam, 6 fx, 3 trans
// 追加分2 / 文字PV系: typesetting motions (carets, rules, ticks, index numbers, point sizes).
//
// Techniques (same as the typo set, ae/p_typo3.jsx):
// - per-glyph work = text animators whose Expression Selectors read per-glyph tables (position / reading order / line) computed
//   here from the layer's TextDocument like the browser's layoutText (full-width glyphs = 1 em, latin estimated).
// - carets / rules / ticks / frames the browser draws in item space are shape layers parented to the lyric layer (its layer
//   space = their space); small numbers are mono text layers parented the same way. All of them are kept out of the ghosts.
// - clip windows are layer masks that open completely (mask expansion) outside the move.

var ATZB_CY = 0.38;     // glyph centre above the baseline (em)
var ATZB_MF = 'function ioc(x){x=cl(x);return x<0.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;}function lp(a,b,t){return a+(b-a)*t;}';

/* ---------------------------------------------------------------- small helpers */
// exact port of the browser's J.h / J.r (variant choices match the web frame)
function atzb_h(a, b, c, d, e) {
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
function atzb_r(a, b, c, d, e) { return atzb_h(a, b, c, d, e) / 4294967296; }
function atzb_rs(a, b, c, d, e) { return atzb_r(a, b, c, d, e) * 2 - 1; }
function atzb_arr(a) { var s = []; for (var i = 0; i < a.length; i++) s.push(jzN(a[i])); return '[' + s.join(',') + ']'; }
function atzb_arr2(a) { var s = []; for (var i = 0; i < a.length; i++) s.push(atzb_arr(a[i])); return '[' + s.join(',') + ']'; }
function atzb_isSp(c) { return c === ' ' || c === '　'; }
function atzb_isSmall(c) { return !!c && 'ぁぃぅぇぉっゃゅょゎァィゥェォッャュョヮヵヶ'.indexOf(c) >= 0; }
function atzb_accC(sc) { return jzContrast(sc.accent, sc.bg) >= 1.8 ? sc.accent : sc.fg; }
function atzb_subC(sc) { return jzContrast(sc.sub, sc.bg) >= 1.5 ? sc.sub : sc.fg; }
function atzb_acc(m) { return atzb_accC(m.ctx.sc); }
function atzb_sub(m) { return atzb_subC(m.ctx.sc); }
function atzb_Uk(ctx) { return Math.min(ctx.W, ctx.H) / 1080; }            // U(env)
function atzb_MG(ctx) { return Math.round(Math.min(ctx.W, ctx.H) * 0.05); }  // MG(env)
function atzb_lineNo(ctx) { return ((ctx.cut && ctx.cut.line) | 0) + 1; }
function atzb_cutN(m) { return Math.max(1, jzCount(String(m.c.text || ''))); }
function atzb_mk(m) { return jzClamp((m.ctx.fx.motion != null ? m.ctx.fx.motion : 0.7) / 0.7, 0, 1.6); }
function atzb_seed(m) { return ((m.c.seed | 0) + Math.round(m.o.mi || 0) * 101) | 0; }
function atzb_pt(V, a, c) { return V ? [c, a] : [a, c]; }                 // (along the reading axis, across it) -> [x, y]
function atzb_doc(L) { return L.property('ADBE Text Properties').property('ADBE Text Document').value; }

/* ---------------------------------------------------------------- text geometry (like the browser's layoutText) */
function atzb_adv(ch, mono) {
    var c = ch.charCodeAt(0);
    if (ch === ' ') return mono ? 0.6 : 0.3;
    if (c < 0x80) {
        if (mono) return 0.6;
        if (/[A-Z]/.test(ch)) return /[MW]/.test(ch) ? 0.9 : (ch === 'I' ? 0.32 : 0.7);
        if (/[a-z]/.test(ch)) return /[mw]/.test(ch) ? 0.88 : /[ijl]/.test(ch) ? 0.28 : /[frt]/.test(ch) ? 0.42 : 0.61;
        if (/[0-9]/.test(ch)) return 0.62;
        return /[.,:;!'|]/.test(ch) ? 0.28 : 0.42;
    }
    if (c < 0x250) return 0.56;
    if (c === 0x2014 || c === 0x2015 || c === 0x2500) return 1;
    if (c < 0x2E80 && c !== 0x2026) return 0.6;
    if (c >= 0xFF61 && c <= 0xFF9F) return 0.5;
    return 1;
}
// geometry of a text layer in its own layer space: glyph centres, line extents along the reading axis (a0 / a1) and the
// cross position of each line (c). A layer of one glyph per line is a vertical column (V): one "line" running down.
function atzb_geo(L) {
    var td = atzb_doc(L), i, j;
    var fs = td.fontSize, tr = (td.tracking || 0) / 1000, LD = td.autoLeading === false && td.leading ? td.leading : fs * 1.2;
    var lines = String(td.text).split(/\r\n|\r|\n|\u0003/), nL = lines.length, V = nL >= 2, mono = /Mono|Consolas|Courier/i.test(String(td.font || ''));
    for (i = 0; i < nL; i++) if (jzChars(lines[i]).length > 1) V = false;
    var just = td.justification, left = just === ParagraphJustification.LEFT_JUSTIFY, right = just === ParagraphJustification.RIGHT_JUSTIFY;
    var g = [], ti = 0, ln = [];
    for (i = 0; i < nL; i++) {
        var cs = jzChars(lines[i]), ws = [], w = 0;
        for (j = 0; j < cs.length; j++) { ws.push(atzb_adv(cs[j], mono) * fs); w += ws[j] + (j < cs.length - 1 ? tr * fs : 0); }
        var x = left ? 0 : right ? -w : -w / 2, y = i * LD - ATZB_CY * fs;
        for (j = 0; j < cs.length; j++) { g.push({ ch: cs[j], x: x + ws[j] / 2, y: y, w: ws[j], h: fs, li: V ? 0 : i, ti: ti++, sp: atzb_isSp(cs[j]) || cs[j] === '' }); x += ws[j] + tr * fs; }
    }
    var nLine = V ? 1 : nL;
    for (i = 0; i < nLine; i++) ln.push({ li: i, a0: 1e9, a1: -1e9, c: 0, n: 0, gs: [] });
    for (i = 0; i < g.length; i++) {
        var q = g[i]; if (q.sp) continue;
        var Li = ln[q.li], a0 = V ? q.y - q.h / 2 : q.x - q.w / 2, a1 = V ? q.y + q.h / 2 : q.x + q.w / 2;
        Li.a0 = Math.min(Li.a0, a0); Li.a1 = Math.max(Li.a1, a1); Li.c = V ? q.x : q.y; Li.n++; Li.gs.push(q);
    }
    var plain = [], lns = [], x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (i = 0; i < g.length; i++) if (!g[i].sp) { g[i].rk = plain.length; plain.push(g[i]); x0 = Math.min(x0, g[i].x - g[i].w / 2); x1 = Math.max(x1, g[i].x + g[i].w / 2); y0 = Math.min(y0, g[i].y - g[i].h / 2); y1 = Math.max(y1, g[i].y + g[i].h / 2); }
    if (x0 > x1) { x0 = x1 = y0 = y1 = 0; }
    for (i = 0; i < ln.length; i++) if (ln[i].n) lns.push(ln[i]);        // lines that hold glyphs
    return { g: g, ln: ln, lns: lns, plain: plain, V: V, fs: fs, N: g.length, left: left, right: right,
        box: { x0: x0, x1: x1, y0: y0, y1: y1, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, w: x1 - x0, h: y1 - y0 } };
}
function atzb_gA(G, g) { return G.V ? g.y : g.x; }        // glyph centre along the axis
function atzb_gC(G, g) { return G.V ? g.x : g.y; }        // glyph centre across the axis
function atzb_gLen(G, g) { return G.V ? g.h : g.w; }      // glyph advance along the axis
function atzb_under(G, Ln, size, k) { return Ln.c + (G.V ? -1 : 1) * size * k; }
function atzb_over(G, Ln, size, k) { return Ln.c - (G.V ? -1 : 1) * size * k; }
// reading order 0..1 per glyph (spaces 0); single-glyph layers use their mi within the cut
function atzb_ord(m, G) {
    var out = [], n = G.plain.length, k = 0, i;
    if (n <= 1) { var N = atzb_cutN(m), o = N > 1 ? jzClamp((m.o.mi || 0) / (N - 1), 0, 1) : 0; for (i = 0; i < G.N; i++) out.push(o); return out; }
    for (i = 0; i < G.N; i++) { if (G.g[i].sp) out.push(0); else out.push(k++ / (n - 1)); }
    return out;
}
function atzb_rank(G) { var out = []; for (var i = 0; i < G.N; i++) out.push(G.g[i].sp ? -1 : G.g[i].rk); return out; }
function atzb_solo(m, G) { return G.plain.length <= 1 && atzb_cutN(m) > 1; }
// the layer's static transform (to test comp-space room like the browser does with it.x / it.y)
function atzb_xf(L) {
    var p = jzXf(L, 'ADBE Position').value, a = jzXf(L, 'ADBE Anchor Point').value, s = jzXf(L, 'ADBE Scale').value, r = jzXf(L, 'ADBE Rotate Z').value, par = false;
    try { par = !!L.parent; } catch (e) { par = false; }
    var sx = Math.abs(s[0]) / 100 || 1, sy = Math.abs(s[1]) / 100 || 1;
    return { px: p[0], py: p[1], ax: a[0], ay: a[1], sx: sx, sy: sy, rot: (r || 0) !== 0 || par, par: par };
}
function atzb_cx(T, x) { return T.px + (x - T.ax) * T.sx; }
function atzb_cy(T, y) { return T.py + (y - T.ay) * T.sy; }

/* ---------------------------------------------------------------- per-glyph animators */
// animators sharing one body: the body sets s sx sy (scale) dx dy (px) a (alpha) cm (colour mix) sw (outline 0..1) h (hide)
// o: { pos: bound px, sc: 1, op: 1, col: hex, stroke: px }
function atzb_fx(m, name, pre, body, o) {
    var L = m.L, hd = m.HD + ATZB_MF + pre + 'var i=textIndex-1,s=1,sx=1,sy=1,dx=0,dy=0,a=1,cm=0,sw=0,h=false;' + body + ';\n';
    if (o.pos) { var KB = Math.max(1, o.pos); jzAnimator(L, name + ' Move', [['ADBE Text Position 3D', [KB, KB, 0]]], hd + '[Math.max(-100,Math.min(100,dx/' + jzN(KB) + '*100)),Math.max(-100,Math.min(100,dy/' + jzN(KB) + '*100)),0]'); }
    if (o.sc) jzAnimator(L, name + ' Size', [['ADBE Text Scale 3D', [400, 400, 100]]], hd + '[Math.max(-100,Math.min(100,(s*sx-1)/3*100)),Math.max(-100,Math.min(100,(s*sy-1)/3*100)),0]');
    if (o.col) jzAnimator(L, name + ' Colour', [['ADBE Text Fill Color', jzHex(o.col)]], hd + 'cl(cm)*100');
    if (o.stroke) {
        var td = atzb_doc(L);
        if (td.applyFill !== false) {       // an outlined face is its own outline already
            if (!td.applyStroke) jzTextDoc(L, function (d) { d.applyStroke = true; d.strokeColor = d.fillColor; d.strokeWidth = 0; });
            jzAnimator(L, name + ' Outline', [['ADBE Text Stroke Width', o.stroke], ['ADBE Text Fill Opacity', 0]], hd + 'cl(sw)*100');
        }
    }
    if (o.op) jzAnimator(L, name + ' Alpha', [['ADBE Text Opacity', 0]], hd + 'h?100:(1-cl(a))*100');
}

/* ---------------------------------------------------------------- graphics in the lyric layer's space */
// shape layer parented to the lyric (identity transform), main pass only. opExpr: statements ending in the opacity (0..100);
// po = the lyric layer's opacity. below = drawn under the lyric (the browser's pre hook)
function atzb_post(m, name, opExpr, below) {
    var S = jzShapeLayer(m.ctx, name, 0, 0);
    S.parent = m.L;
    jzXf(S, 'ADBE Anchor Point').setValue([0, 0]); jzXf(S, 'ADBE Position').setValue([0, 0]); jzXf(S, 'ADBE Scale').setValue([100, 100]); jzXf(S, 'ADBE Rotate Z').setValue(0);
    jzSetExpr(jzXf(S, 'ADBE Opacity'), m.HD + ATZB_MF + 'var pp=thisLayer.parent,po=pp?pp.transform.opacity:100;' + (opExpr || 'po'));
    jzNoGhost(S);
    if (below) { try { S.moveAfter(m.L); } catch (e) {} }
    return S;
}
// one group of polylines (finished before the caller adds the next one);
// o: width alpha closed fill fillOp dash [d, g] cap trim (end expr) start (expr) gop gpos (exprs)
function atzb_grp(S, name, segs, col, o) {
    o = o || {};
    var g = jzGrp(S, name), i;
    for (i = 0; i < segs.length; i++) jzAddPath(g, segs[i], !!o.closed);
    if (o.fill) jzAddFill(g, o.fill, o.fillOp);
    if (col) {
        var st = jzAddStroke(g, col, o.width || 1, (o.alpha != null ? o.alpha : 1) * 100);
        if (o.cap) { try { st.property('ADBE Vector Stroke Line Cap').setValue(o.cap); } catch (e) {} }
        if (o.dash) {
            var D = st.property('ADBE Vector Stroke Dashes');
            D.addProperty('ADBE Vector Stroke Dash 1').setValue(o.dash[0]);
            D.addProperty('ADBE Vector Stroke Gap 1').setValue(o.dash[1]);
        }
    }
    if (o.trim || o.start) jzAddTrimPaths(g, o.trim, o.start);
    if (o.gop) jzSetExpr(jzGX(g).property('ADBE Vector Group Opacity'), o.gop);
    if (o.gpos) jzSetExpr(jzGX(g).property('ADBE Vector Position'), o.gpos);
    return g;
}
// rectangles (centre x, y, w, h) in one group; o: fill fillOp stroke width alpha gop gpos piv + gsc (scale about a pivot)
function atzb_rects(S, name, list, o) {
    o = o || {};
    var g = jzGrp(S, name), i;
    for (i = 0; i < list.length; i++) jzAddRect(g, Math.max(0.01, list[i][2]), Math.max(0.01, list[i][3]), 0, list[i][0], list[i][1]);
    if (o.stroke) jzAddStroke(g, o.stroke, o.width || 1, (o.alpha != null ? o.alpha : 1) * 100);
    if (o.fill) jzAddFill(g, o.fill, o.fillOp);
    if (o.gop) jzSetExpr(jzGX(g).property('ADBE Vector Group Opacity'), o.gop);
    if (o.gsc) { jzGX(g).property('ADBE Vector Anchor').setValue(o.piv); jzGX(g).property('ADBE Vector Position').setValue(o.piv); jzSetExpr(jzGX(g).property('ADBE Vector Scale'), o.gsc); }
    if (o.gpos) jzSetExpr(jzGX(g).property('ADBE Vector Position'), o.gpos);
    return g;
}
// one rectangle whose size / centre come from expressions; o: stroke width alpha fill fillOp gop
function atzb_box(S, name, sizeExpr, posExpr, o) {
    var g = jzGrp(S, name), r = jzAddRect(g, 10, 10);
    jzSetExpr(r.property('ADBE Vector Rect Size'), sizeExpr);
    if (posExpr) jzSetExpr(r.property('ADBE Vector Rect Position'), posExpr);
    if (o.stroke) jzAddStroke(g, o.stroke, o.width || 1, (o.alpha != null ? o.alpha : 1) * 100);
    if (o.fill) jzAddFill(g, o.fill, o.fillOp);
    if (o.gop) jzSetExpr(jzGX(g).property('ADBE Vector Group Opacity'), o.gop);
    return g;
}
// small mono label in the lyric layer's space (x, y = the browser's draw position: y centre, x by align), main pass only
function atzb_label(m, txt, x, y, fs, col, align, opExpr, name) {
    var T = jzText(m.ctx, String(txt), { font: jzMonoF(m.ctx), size: fs, color: col, x: 0, y: 0, align: align || 'left', track: 0.04, name: name || 'JZ label' });
    var sc = jzXf(m.L, 'ADBE Scale').value;
    T.parent = m.L;
    jzXf(T, 'ADBE Position').setValue([x, y]); jzXf(T, 'ADBE Rotate Z').setValue(0);
    jzXf(T, 'ADBE Scale').setValue([10000 / Math.max(1, Math.abs(sc[0])), 10000 / Math.max(1, Math.abs(sc[1]))]);   // labels are not stretched with the lyric
    jzSetExpr(jzXf(T, 'ADBE Opacity'), m.HD + ATZB_MF + 'var pp=thisLayer.parent,po=pp?pp.transform.opacity:100;' + (opExpr || 'po'));
    jzNoGhost(T);
    return T;
}
function atzb_srcExpr(T, ex) { try { T.property('ADBE Text Properties').property('ADBE Text Document').expression = ex; } catch (e) { jzWarn('x2typoB text expr: ' + e.toString()); } }
// layer mask (layer space): the first mask of the layer adds, later ones intersect
function atzb_mask(L, verts, expandExpr) {
    var mp = L.property('ADBE Mask Parade'), first = mp.numProperties === 0;
    var mk = mp.addProperty('ADBE Mask Atom'), sh = new Shape();
    sh.vertices = verts; sh.closed = true;
    mk.property('ADBE Mask Shape').setValue(sh);
    if (!first) { try { mk.maskMode = MaskMode.INTERSECT; } catch (e) {} }
    if (expandExpr) mk.property('ADBE Mask Offset').expression = expandExpr;
    return mk;
}
function atzb_maskRect(L, x0, y0, x1, y1, expandExpr) { return atzb_mask(L, [[x1, y0], [x1, y1], [x0, y1], [x0, y0]], expandExpr); }
// generous extents of the layer (estimated geometry and the measured rect)
function atzb_ext(m, G) {
    var b = G.box, big = m.size * 6, r = jzRect(m.L);
    return { x0: Math.min(b.x0, r.left) - big, x1: Math.max(b.x1, r.left + r.width) + big, y0: Math.min(b.y0, r.top) - big, y1: Math.max(b.y1, r.top + r.height) + big };
}
function atzb_lw(m, k, min) { return Math.max((min || 1.5) * m.u, m.size * k); }

/* ================================================================ ENTRANCES */

/* 植字キャレット — a hairline caret sets the glyphs one by one; the newest glyph sits in its body box as an outline for a moment */
jzReg('enter', 'tzCaretSet', { selfHide: true, apply: function (m) {
    var G = atzb_geo(m.L), nn = G.plain.length, s, ow = atzb_lw(m, 0.03);
    if (!nn) return;
    if (atzb_solo(m, G)) {
        atzb_fx(m, 'JZ In Caret', 'var O=' + atzb_arr(atzb_ord(m, G)) + ';', 'var q=(P-O[i]*0.6)/0.4;if(q<=0||time<DL)h=true;else if(q<0.45)sw=1', { op: 1, stroke: ow });
        return;
    }
    var V = G.V, ac = atzb_acc(m);
    var pre = 'var NN=' + nn + ',kk=cl(P)*' + jzN(nn + 1.2) + ',sh=Math.min(NN,Math.floor(kk));';
    atzb_fx(m, 'JZ In Caret', pre + 'var R=' + atzb_arr(atzb_rank(G)) + ';', 'var r=R[i];if(r>=0){if(r>=sh)h=true;else if(r===sh-1&&kk<r+1.6)sw=1;}', { op: 1, stroke: ow });
    var CX = [], CY = [], BX = [0], BY = [0], BW = [1], BH = [1];
    for (s = 0; s <= nn; s++) {
        var g = G.plain[s > 0 ? s - 1 : 0], ca = atzb_gA(G, g) + (s > 0 ? 1 : -1) * (atzb_gLen(G, g) / 2 + m.size * 0.07), p = atzb_pt(V, ca, atzb_gC(G, g));
        CX.push(p[0]); CY.push(p[1]);
        if (s > 0) { BX.push(g.x); BY.push(g.y); BW.push(V ? m.size : g.w); BH.push(V ? g.h : m.size); }
    }
    var S = atzb_post(m, 'JZ caret', '(time>=DL&&P<1)?po:0'), hd = m.HD + pre, hh = m.size * 0.56;
    atzb_grp(S, 'caret', [[atzb_pt(V, 0, -hh), atzb_pt(V, 0, hh)]], ac, { width: atzb_lw(m, 0.03, 2), gpos: hd + 'var X=' + atzb_arr(CX) + ',Y=' + atzb_arr(CY) + ';[X[sh],Y[sh]]' });
    atzb_box(S, 'body box', hd + 'var W=' + atzb_arr(BW) + ',H=' + atzb_arr(BH) + ';[W[sh],H[sh]]', hd + 'var X=' + atzb_arr(BX) + ',Y=' + atzb_arr(BY) + ';[X[sh],Y[sh]]',
        { stroke: ac, width: atzb_lw(m, 0.012, 1), gop: hd + '(sh>0&&kk<sh+0.6)?70:0' });
} });

/* 罫上スライド — a hairline shoots out under the line, the text slides along it and stops dead on a tick mark */
jzReg('enter', 'tzRuleSlide', { apply: function (m) {
    var G = atzb_geo(m.L), V = G.V, k;
    var dir = (atzb_h(m.c.seed | 0, 61) & 1) ? 1 : -1, dist = Math.min((V ? m.H : m.W) * 0.3, m.size * 4);
    // the glyphs slide (the rule stays put in the layer's space)
    jzAnimator(m.L, 'JZ In RuleSlide', [['ADBE Text Position 3D', V ? [0, dist, 0] : [dist, 0, 0]]], m.HD + jzN(-dir) + '*(1-oe(P/0.72))*100');
    m.parts.op.push('f*=cl(P*7);');
    if (atzb_solo(m, G) || !G.lns.length) return;
    var S = atzb_post(m, 'JZ slide rule', '(time>=DL&&P<1)?100:0'), hd = m.HD + 'var qb=oe(P/0.3),qr=ic((P-0.76)/0.24);', ac = atzb_acc(m);
    var lw = atzb_lw(m, 0.022), pad = m.size * 0.14, th = m.size * 0.16;
    for (k = 0; k < G.lns.length && k < 6; k++) {
        var Ln = G.lns[k], tick = dir > 0 ? Ln.a1 + pad : Ln.a0 - pad, far = tick - dir * ((Ln.a1 - Ln.a0) + pad * 2 + dist * 0.6), c = atzb_under(G, Ln, m.size, 0.6);
        atzb_grp(S, 'rule ' + (k + 1), [[atzb_pt(V, far, c), atzb_pt(V, tick, c)]], ac, { width: lw, start: hd + '100*Math.min(qr,qb)', trim: hd + '100*qb' });
        atzb_grp(S, 'tick ' + (k + 1), [[atzb_pt(V, tick, c - th), atzb_pt(V, tick, c + th)]], ac, { width: lw * 1.4, start: hd + '50*qr', trim: hd + '100-50*qr', gop: hd + '(qb>0.9&&qr<1)?100:0' });
    }
} });

/* 計数から組む — every slot first holds a small running figure; the figures lock to the glyphs from the line head on */
jzReg('enter', 'tzCountSet', { selfHide: true, apply: function (m) {
    var G = atzb_geo(m.L), O = atzb_ord(m, G), i;
    atzb_fx(m, 'JZ In Count', 'var O=' + atzb_arr(O) + ';', 'var tl=0.38+O[i]*0.52;if(P<tl||time<DL)h=true;else if(P<tl+0.07)cm=1', { op: 1, col: atzb_acc(m) });
    // the running figures: one small mono text layer in the lyric's space, a "0" over every glyph, counted on by a Character Offset
    var fs = m.size * 0.5, LD = fs * 1.2, strs = [], off = [], DO = [];
    for (i = 0; i < G.N && strs.length < 60; i++) {
        var g = G.g[i]; if (g.sp || jzIsPunct(g.ch) || atzb_isSmall(g.ch)) continue;
        off.push([g.x, g.y + ATZB_CY * fs - strs.length * LD]); DO.push(O[i]); strs.push('0');
    }
    if (!strs.length) return;
    var T = jzText(m.ctx, strs.join('\r'), { font: jzMonoF(m.ctx), size: fs, color: atzb_sub(m), x: 0, y: 0, align: 'center', track: 0, leading: LD, name: 'JZ figures' });
    T.parent = m.L;
    jzXf(T, 'ADBE Anchor Point').setValue([0, 0]); jzXf(T, 'ADBE Position').setValue([0, 0]); jzXf(T, 'ADBE Scale').setValue([100, 100]); jzXf(T, 'ADBE Rotate Z').setValue(0);
    jzCharOffsets(T, off, 'JZ Place');
    var pre = m.HD + 'var O=' + atzb_arr(DO) + ',j=textIndex-1,o=O[j]||0,t0=o*0.2,tl=0.38+o*0.52;';
    jzAnimator(T, 'JZ Figure Count', [['ADBE Text Character Offset', 9]], pre + '(Math.floor(hh(j*3.7+SD*0.13)*10)+Math.floor(time*12))%10/9*100');
    jzAnimator(T, 'JZ Figure Alpha', [['ADBE Text Opacity', 0]], pre + '(time<DL||P<t0||P>=tl)?100:(1-cl((P-t0)/0.06))*100');
    jzSetExpr(jzXf(T, 'ADBE Opacity'), 'var p=thisLayer.parent;p?p.transform.opacity:value');
} });

/* 詰め組み — the line appears loosely spaced; one gap after another closes up from the line head until it is set solid */
jzReg('enter', 'tzCloseUp', { apply: function (m) {
    var G = atzb_geo(m.L), V = G.V, i, k;
    m.parts.op.push('f*=cl(P*8);');
    if (G.plain.length <= 1) {
        if (atzb_cutN(m) <= 1) return;
        // one glyph per layer: the layers start spread out from the frame centre (along x) and close up
        m.parts.pos.push('var tzc=0.3*(1-oe((P-0.2)/0.6));d=[d[0]+(value[0]-' + jzN(m.W / 2) + ')*tzc,d[1]];');
        return;
    }
    var K = [], NL = [], GP = [], KB = 1;
    for (i = 0; i < G.N; i++) { K.push(-1); NL.push(0); GP.push(0); }
    for (k = 0; k < G.lns.length; k++) {
        var gs = G.lns[k].gs, n = gs.length; if (n < 2) continue;
        var ext = atzb_gA(G, gs[n - 1]) - atzb_gA(G, gs[0]) + atzb_gLen(G, gs[0]);
        var gap = jzClamp(((V ? m.H : m.W) * 0.92 - ext) / (n - 1), m.size * 0.22, m.size * 0.55);
        for (i = 0; i < n; i++) { K[gs[i].ti] = i; NL[gs[i].ti] = n; GP[gs[i].ti] = gap; }
        KB = Math.max(KB, gap * (n - 1));
    }
    var AF = V ? -0.5 : G.left ? 0 : G.right ? -1 : -0.5;
    atzb_fx(m, 'JZ In CloseUp', 'var K=' + atzb_arr(K) + ',NL=' + atzb_arr(NL) + ',GP=' + atzb_arr(GP) + ';',
        'var k=K[i];if(k>=0){var n=NL[i],tot=0,cu=0;for(var j=1;j<n;j++){tot+=GP[i]*(1-oe((P-(0.12+(j-1)/(n-1)*0.58))/0.26));if(j===k)cu=tot;}' + (V ? 'dy' : 'dx') + '=' + jzN(AF) + '*tot+cu;}',
        { pos: KB });
} });

/* 細字から太字 — the line starts as a hairline-weight skeleton and gains weight until it reaches its real face */
jzReg('enter', 'tzWeightUp', { apply: function (m) {
    var td = atzb_doc(m.L), sc = m.ctx.sc;
    if (td.applyFill === false || (td.applyStroke && td.strokeWidth > 0)) {       // already outlined: the outline comes on, then the fill follows
        m.parts.op.push('f*=cl(P/0.75);');
        if (td.applyFill !== false) jzAnimator(m.L, 'JZ In Weight Fill', [['ADBE Text Fill Opacity', 0]], m.HD + '(1-cl((P-0.45)/0.5))*100');
        return;
    }
    // a stroke in the background colour over the fill eats the weight away; it thins out to nothing
    // (the document keeps a zero-width stroke in the fill colour, so outline treatments on the same layer still read)
    jzTextDoc(m.L, function (d) { d.applyStroke = true; d.strokeColor = d.fillColor; d.strokeWidth = 0; try { d.strokeOverFill = true; } catch (e) {} });
    jzAnimator(m.L, 'JZ In Weight Colour', [['ADBE Text Stroke Color', jzHex(sc.bg)]], m.HD + 'P<1?100:0');
    jzAnimator(m.L, 'JZ In Weight', [['ADBE Text Stroke Width', m.size * 0.1]], m.HD + '(1-oc((P-0.06)/0.94))*100');
    m.parts.op.push('f*=cl(P*6);');
} });

/* 基線合わせ — the glyphs stand at uneven heights; an alignment guide passes along the line and each one snaps to the baseline */
jzReg('enter', 'tzBaseAlign', { apply: function (m) {
    var G = atzb_geo(m.L), V = G.V, solo = atzb_solo(m, G), O = atzb_ord(m, G), seed = atzb_seed(m), F = [], OF = [], i, k;
    for (i = 0; i < G.N; i++) {
        var g = G.g[i], Ln = G.ln[g.li];
        if (g.sp || !Ln || !Ln.n) { F.push(0); OF.push(0); continue; }
        F.push(solo ? O[i] : (Ln.a1 - Ln.a0 > 1 ? (atzb_gA(G, g) - Ln.a0) / (Ln.a1 - Ln.a0) : 0));
        OF.push(((atzb_h(seed, i, 5) & 1) ? 1 : -1) * jzLerp(0.16, 0.4, atzb_r(seed, i, 6)) * m.size);
    }
    var pre = 'var s=ioc((P-0.14)/0.66)*1.14;';
    m.parts.op.push('f*=cl(P*8);');
    atzb_fx(m, 'JZ In BaseAlign', pre + 'var F=' + atzb_arr(F) + ',OF=' + atzb_arr(OF) + ';', 'var u=cl((s-F[i])/0.12);if(u<1)' + (V ? 'dx' : 'dy') + '=OF[i]*(1-oe(u))', { pos: m.size * 0.4 });
    if (solo) return;
    var S = atzb_post(m, 'JZ align guide', '(time>=DL&&P<1)?po*cl(P/0.1)*(1-cl((P-0.84)/0.16)):0'), hd = m.HD + ATZB_MF + pre, ac = atzb_acc(m);
    var lw = atzb_lw(m, 0.02), pad = m.size * 0.12, hh = m.size * 0.8;
    for (k = 0; k < G.lns.length && k < 6; k++) {
        var L2 = G.lns[k], A0 = L2.a0 - pad, A1 = L2.a1 + pad, c = atzb_under(G, L2, m.size, 0.56);
        var ps = 'var ps=Math.min(' + jzN(A1) + ',' + jzN(L2.a0) + '+' + jzN(L2.a1 - L2.a0) + '*(s-0.04));';
        atzb_grp(S, 'baseline ' + (k + 1), [[atzb_pt(V, A0, c), atzb_pt(V, A1, c)]], ac, { width: lw, trim: hd + ps + '100*cl((ps-' + jzN(A0) + ')/' + jzN(Math.max(1, A1 - A0)) + ')' });
        atzb_grp(S, 'guide ' + (k + 1), [[atzb_pt(V, 0, L2.c - hh), atzb_pt(V, 0, L2.c + hh)]], ac, { width: lw, gpos: hd + ps + (V ? '[0,ps]' : '[ps,0]'), gop: hd + 's<1.1399?100:50' });
    }
} });

/* 級数上げ — the line is set small first and steps up through point sizes (hard cuts) to its size; a size note counts along */
jzReg('enter', 'tzPointSize', { apply: function (m) {
    var G = atzb_geo(m.L), ctx = m.ctx, S4 = [0.34, 0.52, 0.76, 1], i;
    var kz = 'var tzk=Math.min(3,Math.floor(cl(P)*4)),tzs=[0.34,0.52,0.76,1][tzk];';
    m.parts.sc.push(kz + 'f=[f[0]*tzs,f[1]*tzs];');
    m.parts.op.push('f*=cl(P*10);');
    var T0 = atzb_xf(m.L);
    if (atzb_solo(m, G) || T0.rot) return;
    // size note + rule over the line's starting corner (comp space: the lyric layer itself is being scaled)
    var r = jzRect(m.L), U = atzb_Uk(ctx), sub = atzb_sub(m), fs = Math.max(11, 16 * U);
    var x = atzb_cx(T0, r.left), bw = r.width * T0.sx, y = Math.max(atzb_MG(ctx) + fs * 0.6, atzb_cy(T0, r.top) - fs * 1.1), strs = [];
    for (i = 0; i < 4; i++) strs.push('"' + Math.max(1, Math.round(m.size * S4[i] / U / 4)) + 'Q"');
    var op = m.HD + kz + '(time>=DL&&P<1)?100*cl(P*10)*(1-cl((P-0.86)/0.14)):0';
    var T = jzText(ctx, Math.max(1, Math.round(m.size / U / 4)) + 'Q', { font: jzMonoF(ctx), size: fs, color: sub, x: x, y: y, align: 'left', track: 0.04, name: 'JZ point size' });
    atzb_srcExpr(T, m.HD + kz + '[' + strs.join(',') + '][tzk]');
    jzSetExpr(jzXf(T, 'ADBE Opacity'), op); jzNoGhost(T);
    var Sh = jzShapeLayer(ctx, 'JZ point size rule', 0, 0);
    atzb_grp(Sh, 'rule', [[[x, y + fs * 0.78], [x + Math.max(1, bw), y + fs * 0.78]]], sub, { width: Math.max(1, 1.5 * U), trim: m.HD + kz + '100*tzs' });
    jzSetExpr(jzXf(Sh, 'ADBE Opacity'), op); jzNoGhost(Sh);
} });

/* 番号が導く — a small line number appears first, a hairline runs out of it over the line and the glyphs cut on as it passes */
jzReg('enter', 'tzIndexLead', { selfHide: true, apply: function (m) {
    var G = atzb_geo(m.L), V = G.V, solo = atzb_solo(m, G), O = atzb_ord(m, G), ac = atzb_acc(m), sub = atzb_sub(m), i, k;
    if (solo || !G.lns.length) { atzb_fx(m, 'JZ In Index', 'var O=' + atzb_arr(O) + ';', 'if(time<DL||P<0.15+O[i]*0.6)h=true', { op: 1 }); return; }
    var nL = G.lns.length, st = Math.min(0.06, 0.3 / nL), span = 0.62 - (nL - 1) * st, LI = [], GA = [], LA = [], LB = [], idx = {};
    for (k = 0; k < nL; k++) { idx[G.lns[k].li] = k; LA.push(G.lns[k].a0); LB.push(G.lns[k].a1); }
    for (i = 0; i < G.N; i++) { var g = G.g[i]; LI.push(g.sp ? -1 : idx[g.li]); GA.push(atzb_gA(G, g)); }
    var Q = 'function qk(k){return ioc((P-0.14-k*' + jzN(st) + ')/' + jzN(span) + ');}';
    atzb_fx(m, 'JZ In Index', Q + 'var LI=' + atzb_arr(LI) + ',GA=' + atzb_arr(GA) + ',LA=' + atzb_arr(LA) + ',LB=' + atzb_arr(LB) + ';',
        'var k=LI[i];if(time<DL)h=true;else if(k>=0){var q=qk(k);if(q<1){var d=lp(LA[k],LB[k],q)-GA[i];if(d<0)h=true;else if(d<' + jzN(m.size * 0.6) + ')cm=1;}}', { op: 1, col: ac });
    var S = atzb_post(m, 'JZ index rule', '(time>=DL&&P<1)?po:0'), hd = m.HD + ATZB_MF + Q, lw = atzb_lw(m, 0.02), fs = Math.max(12 * m.u, m.size * 0.2);
    for (k = 0; k < nL && k < 6; k++) {
        var Ln = G.lns[k], c = atzb_over(G, Ln, m.size, 0.62);
        atzb_grp(S, 'rule ' + (k + 1), [[atzb_pt(V, Ln.a0, c), atzb_pt(V, Ln.a1, c)]], ac, { width: lw, start: hd + 'var a=ic((P-0.8)/0.2),b=qk(' + k + ');100*Math.min(a,b)', trim: hd + '100*qk(' + k + ')' });
    }
    var L0 = G.lns[0], txt = jzPad(atzb_lineNo(m.ctx) % 100, 2), op = '(time>=DL&&P>0.03&&P<1)?po*(1-cl((P-0.82)/0.18)):0';
    if (V) atzb_label(m, txt, L0.c, L0.a0 - fs * 0.9, fs, sub, 'center', op, 'JZ index no');
    else atzb_label(m, txt, L0.a0, atzb_over(G, L0, m.size, 0.62) - fs * 0.8, fs, sub, 'left', op, 'JZ index no');
} });

/* テキスト枠 — a DTP text frame is drawn (hairline, with handles), the text flows into it, then the frame is deselected */
jzReg('enter', 'tzTextFrame', { selfHide: true, apply: function (m) {
    var G = atzb_geo(m.L), V = G.V, O = atzb_ord(m, G), ac = atzb_acc(m), k;
    if (!G.lns.length) return;
    if (atzb_solo(m, G)) {
        atzb_fx(m, 'JZ In Frame', 'var O=' + atzb_arr(O) + ';', 'var q=(P-O[i]*0.55)/0.45;if(q<=0||time<DL)h=true;else if(q<0.5)sw=1', { op: 1, stroke: atzb_lw(m, 0.03) });
        return;
    }
    atzb_fx(m, 'JZ In Frame', 'var O=' + atzb_arr(O) + ';', 'if(time<DL||P<0.3+O[i]*0.42)h=true', { op: 1 });
    var a0 = 1e9, a1 = -1e9, c0 = 1e9, c1 = -1e9, ck = m.size * 0.5, pad = m.size * 0.16, lw = atzb_lw(m, 0.018);
    for (k = 0; k < G.lns.length; k++) { var Ln = G.lns[k]; a0 = Math.min(a0, Ln.a0); a1 = Math.max(a1, Ln.a1); c0 = Math.min(c0, Ln.c - ck); c1 = Math.max(c1, Ln.c + ck); }
    var A0 = a0 - pad, A1 = a1 + pad, C0 = c0 - pad, C1 = c1 + pad, am = (A0 + A1) / 2, cm = (C0 + C1) / 2, hs = Math.max(4 * m.u, m.size * 0.05);
    var S = atzb_post(m, 'JZ text frame', '(time>=DL&&P<1)?100:0'), hd = m.HD + ATZB_MF;
    atzb_grp(S, 'frame', [[atzb_pt(V, A0, C0), atzb_pt(V, A1, C0), atzb_pt(V, A1, C1), atzb_pt(V, A0, C1), atzb_pt(V, A0, C0)]], ac,
        { width: lw, start: hd + 'var a=ic((P-0.8)/0.2),b=ioc(P/0.38);100*Math.min(a,b)', trim: hd + '100*ioc(P/0.38)' });
    var hp = [[A0, C0], [am, C0], [A1, C0], [A1, cm], [A1, C1], [am, C1], [A0, C1], [A0, cm]], list = [];
    for (k = 0; k < hp.length; k++) { var q = atzb_pt(V, hp[k][0], hp[k][1]); list.push([q[0], q[1], hs, hs]); }
    atzb_rects(S, 'handles', list, { fill: ac, gop: m.HD + '(P>0.36&&P<0.8)?100:0' });
} });

/* ================================================================ EXITS */

/* 縦罫に畳む — the line is condensed and set solid onto its centre until it is one upright hairline, which then shortens away */
jzReg('exit', 'tzCondense', { apply: function (m) {
    var G = atzb_geo(m.L), V = G.V, MD = [], KB = 1, i, k;
    for (i = 0; i < G.N; i++) {
        var g = G.g[i], Ln = G.ln[g.li], d = (g.sp || !Ln || !Ln.n) ? 0 : (Ln.a0 + Ln.a1) / 2 - atzb_gA(G, g);
        MD.push(d); KB = Math.max(KB, Math.abs(d));
    }
    atzb_fx(m, 'JZ Out Condense', 'var MD=' + atzb_arr(MD) + ',e=ioc(PO/0.55);', 'if(PO>=0.55)h=true;else if(PO>0){' + (V ? 'dy=MD[i]*e;sy' : 'dx=MD[i]*e;sx') + '=Math.max(0.04,1-0.96*e);}', { pos: KB, sc: 1, op: 1 });
    var S = atzb_post(m, 'JZ condense rule', 'PO>0?100*cl((PO-0.28)/0.2):0'), hd = m.HD + 'var sh=1-ic((PO-0.6)/0.4);', hh = m.size * 0.58;
    for (k = 0; k < G.lns.length && k < 6; k++) {
        var L2 = G.lns[k], mid = (L2.a0 + L2.a1) / 2;
        atzb_grp(S, 'rule ' + (k + 1), [[atzb_pt(V, mid, L2.c - hh), atzb_pt(V, mid, L2.c + hh)]], atzb_acc(m), { width: atzb_lw(m, 0.028, 2), start: hd + '50-50*sh', trim: hd + '50+50*sh' });
    }
} });

/* 校正で削る — a proofreader's slash is struck through each glyph in turn; the glyph is taken out, then its slash */
jzReg('exit', 'tzProofDelete', { apply: function (m) {
    var G = atzb_geo(m.L), O = atzb_ord(m, G), k;
    atzb_fx(m, 'JZ Out Proof', 'var O=' + atzb_arr(O) + ';', 'if(PO>0&&PO>=O[i]*0.5+0.16)h=true', { op: 1 });
    if (!G.plain.length) return;
    var S = atzb_post(m, 'JZ proof slashes', 'PO>0?100:0'), ac = atzb_acc(m), lw = atzb_lw(m, 0.035, 2);
    for (k = 0; k < G.plain.length && k < 40; k++) {
        var g = G.plain[k], hw = g.w * 0.5, hh = g.h * 0.56, hd = m.HD + 'var t=' + jzN(O[g.ti] * 0.5) + ',on=PO>t&&PO<t+0.42,d=on?cl((PO-t)/0.09):0,r=on?cl((PO-t-0.32)/0.1):0;';
        atzb_grp(S, 'slash ' + (k + 1), [[[g.x - hw, g.y + hh], [g.x + hw, g.y - hh]]], ac, { width: lw, start: hd + '100*Math.min(r,d)', trim: hd + '100*d' });
    }
} });

/* 半分ずつ断つ — a hairline runs through the middle of the line; alternate half-glyphs are cut away, then the rest, then the rule */
jzReg('exit', 'tzHalfCut', { apply: function (m) {
    var G = atzb_geo(m.L), V = G.V, solo = atzb_solo(m, G), k, j;
    if (!G.lns.length) return;
    // one mask = a square wave along every line (alternate glyphs keep the half on one side of the line centre, the others the
    // other half); it opens completely before the cut and the layer is hidden after it
    var verts = [], starts = [], hk = m.size * 0.7;
    for (k = 0; k < G.lns.length; k++) {
        var Ln = G.lns[k], gs = Ln.gs, st = atzb_pt(V, Ln.a0, Ln.c);
        starts.push(st); verts.push(st);
        for (j = 0; j < gs.length; j++) {
            var g = gs[j], rk = solo ? Math.round(m.o.mi || 0) : g.rk, e = Ln.c + ((rk & 1) === 0 ? 1 : -1) * hk;
            var al = atzb_gA(G, g) - atzb_gLen(G, g) / 2, ar = atzb_gA(G, g) + atzb_gLen(G, g) / 2;
            verts.push(atzb_pt(V, al, Ln.c)); verts.push(atzb_pt(V, al, e)); verts.push(atzb_pt(V, ar, e)); verts.push(atzb_pt(V, ar, Ln.c));
        }
        verts.push(st);
    }
    for (k = starts.length - 2; k >= 0; k--) verts.push(starts[k]);      // back along the same way: the links enclose nothing
    atzb_mask(m.L, verts, m.HD + 'PO<0.26?1e4:0');
    m.parts.op.push('f*=PO>=0.54?0:1;');
    if (solo) return;
    var S = atzb_post(m, 'JZ half-cut rule', 'PO>0?100:0'), hd = m.HD + 'var qb=oe(PO/0.24),sh=1-ic((PO-0.56)/0.44);', pad = m.size * 0.14;
    for (k = 0; k < G.lns.length && k < 6; k++) {
        var L2 = G.lns[k];
        atzb_grp(S, 'rule ' + (k + 1), [[atzb_pt(V, L2.a0 - pad, L2.c), atzb_pt(V, L2.a1 + pad, L2.c)]], atzb_acc(m),
            { width: atzb_lw(m, 0.022), start: hd + 'PO<0.56?0:50-50*sh', trim: hd + 'PO<0.56?100*qb:50+50*sh' });
    }
} });

/* 選択して削除 — the line is swept by a selection highlight, deleted in one cut, and a caret blinks once where it began */
jzReg('exit', 'tzSelectDelete', { apply: function (m) {
    var G = atzb_geo(m.L), V = G.V, nL = Math.max(1, G.lns.length), ac = atzb_acc(m), k;
    m.parts.op.push('f*=PO>=0.62?0:1;');
    if (!G.lns.length) return;
    var S = atzb_post(m, 'JZ selection', '(PO>0&&PO<0.62)?po:0', true), pad = m.size * 0.08, hh = m.size * 0.6;
    for (k = 0; k < nL && k < 8; k++) {
        var Ln = G.lns[k], a = Ln.a0 - pad, b = Ln.a1 + pad, ce = atzb_pt(V, (a + b) / 2, Ln.c), sz = atzb_pt(V, b - a, hh * 2);
        atzb_rects(S, 'highlight ' + (k + 1), [[ce[0], ce[1], sz[0], sz[1]]], { fill: ac, fillOp: 42, piv: atzb_pt(V, a, Ln.c),
            gsc: m.HD + ATZB_MF + 'var u=100*cl(ioc(PO/0.5)*' + nL + '-' + k + ');' + (V ? '[100,u]' : '[u,100]') });
    }
    if (atzb_solo(m, G)) return;
    var C = atzb_post(m, 'JZ selection caret', '(PO>=0.62&&PO<0.96&&!(PO>=0.76&&PO<0.86))?100:0'), L0 = G.lns[0], ca = L0.a0 - m.size * 0.08, ch = m.size * 0.56;
    atzb_grp(C, 'caret', [[atzb_pt(V, ca, L0.c - ch), atzb_pt(V, ca, L0.c + ch)]], ac, { width: atzb_lw(m, 0.03, 2) });
} });

/* あふれ送り — the line is pushed a step at a time past a margin rule and is lost there, like overset text leaving its frame */
jzReg('exit', 'tzOverset', { apply: function (m) {
    var G = atzb_geo(m.L), V = G.V, b = G.box, pad = m.size * 0.1, ac = atzb_acc(m);
    if (!G.plain.length) return;
    if (atzb_solo(m, G)) {        // one glyph per layer: the glyphs are pushed off one at a time, last first (two hard half steps)
        var o = atzb_ord(m, G)[G.plain[0].ti];
        m.parts.pos.push('var tzq=cl((PO-' + jzN((1 - o) * 0.6) + ')/0.3);d=[d[0]+' + jzN(m.size * 0.45) + '*(tzq<=0?0:tzq<0.5?0.5:1),d[1]];');
        m.parts.op.push('f*=cl((PO-' + jzN((1 - o) * 0.6) + ')/0.3)>=1?0:1;');
        return;
    }
    var steps = jzClamp(jzCount(String(atzb_doc(m.L).text || '')), 2, 7), dist = (V ? b.h : b.w) + m.size * 0.2, E = atzb_ext(m, G);
    jzAnimator(m.L, 'JZ Out Overset', [['ADBE Text Position 3D', V ? [0, dist, 0] : [dist, 0, 0]]],
        m.HD + 'var kk=cl(PO/0.9)*' + steps + ',sg=Math.min(' + steps + ',Math.floor(kk)),ff=kk-sg;Math.min(1,(sg+oe(ff*2.4))/' + steps + ')*100');
    if (V) atzb_maskRect(m.L, E.x0, b.y0 - pad, E.x1, b.y1 + pad, m.HD + 'PO<=0?1e4:0');
    else atzb_maskRect(m.L, b.x0 - pad, E.y0, b.x1 + pad, E.y1, m.HD + 'PO<=0?1e4:0');
    m.parts.op.push('f*=PO>=0.9?0:1;');
    // margin rule + overset mark (a small boxed plus) at the frame edge
    var S = atzb_post(m, 'JZ overset rule', 'PO>0?100:0'), hd = m.HD + 'var qa=oe(PO/0.12),qr=ic((PO-0.88)/0.12);';
    var lw = atzb_lw(m, 0.022), ex = m.size * 0.15, hs = Math.max(6 * m.u, m.size * 0.16), cx, cy, seg;
    if (!V) { cx = b.x1 + pad; cy = b.y1 + ex + hs * 0.8; seg = [[cx, b.y0 - ex], [cx, b.y1 + ex]]; }
    else { cy = b.y1 + pad; cx = b.x0 - ex - hs * 0.8; seg = [[b.x1 + ex, cy], [b.x0 - ex, cy]]; }
    atzb_grp(S, 'margin', [seg], ac, { width: lw, start: hd + '100*Math.min(qr,qa)', trim: hd + '100*qa' });
    atzb_grp(S, 'overset mark', [[[cx - hs / 2, cy - hs / 2], [cx + hs / 2, cy - hs / 2], [cx + hs / 2, cy + hs / 2], [cx - hs / 2, cy + hs / 2], [cx - hs / 2, cy - hs / 2]],
        [[cx - hs * 0.28, cy], [cx + hs * 0.28, cy]], [[cx, cy - hs * 0.28], [cx, cy + hs * 0.28]]], ac, { width: lw, gop: m.HD + '(PO>0.1&&PO<0.9)?100:0' });
} });

/* 罫が閉じる — a hairline above and one below the line close in on each other, taking the text between them; the one rule left retracts */
jzReg('exit', 'tzRulesClose', { apply: function (m) {
    var G = atzb_geo(m.L), V = G.V, b = G.box, pad = m.size * 0.14, E = atzb_ext(m, G);
    var hc = (V ? b.w : b.h) / 2 + pad, ha = (V ? b.h : b.w) / 2 + pad, pre = 'var e=ioc((PO-0.16)/0.5),hf=' + jzN(hc) + '*(1-e);';
    // clip window closing onto the centre line (cross axis)
    if (V) atzb_maskRect(m.L, b.cx - 0.01, E.y0, b.cx + 0.01, E.y1, m.HD + ATZB_MF + pre + 'PO<=0?1e4:hf');
    else atzb_maskRect(m.L, E.x0, b.cy - 0.01, E.x1, b.cy + 0.01, m.HD + ATZB_MF + pre + 'PO<=0?1e4:hf');
    m.parts.op.push('f*=(PO-0.16)/0.5>=1?0:1;');
    if (atzb_solo(m, G) || !G.plain.length) return;
    var S = atzb_post(m, 'JZ closing rules', 'PO>0?100:0'), hd = m.HD + ATZB_MF + pre + 'var fl=oe(PO/0.2)*(1-ic((PO-0.7)/0.3));', lw = atzb_lw(m, 0.022), i;
    for (i = 0; i < 2; i++) {
        var sg = i ? 1 : -1, seg = V ? [[b.cx, b.cy - ha], [b.cx, b.cy + ha]] : [[b.cx - ha, b.cy], [b.cx + ha, b.cy]];
        atzb_grp(S, i ? 'rule below' : 'rule above', [seg], atzb_acc(m), { width: lw, start: hd + '50-50*fl', trim: hd + '50+50*fl', gpos: hd + (V ? '[' + sg + '*hf,0]' : '[0,' + sg + '*hf]') });
    }
} });

/* 脚注になる — the line shrinks to note size at its own starting corner, a short separator rule is drawn over it, then both are cut */
jzReg('exit', 'tzToFootnote', { apply: function (m) {
    var G = atzb_geo(m.L), V = G.V, sub = atzb_sub(m), r = jzRect(m.L), T0 = atzb_xf(m.L);
    // scale about the starting corner: bottom-left of a horizontal line, top-right of a vertical column
    var kx = V ? r.left + r.width : r.left, ky = V ? r.top : r.top + r.height;
    var ez = 'var tze=cl(PO/0.45);tze=tze<0.5?4*tze*tze*tze:1-Math.pow(-2*tze+2,3)/2;';
    m.parts.sc.push(ez + 'f=[f[0]*(1-0.7*tze),f[1]*(1-0.7*tze)];');
    m.parts.pos.push(ez + 'd=[d[0]+' + jzN((kx - T0.ax) * T0.sx * 0.7) + '*tze,d[1]+' + jzN((ky - T0.ay) * T0.sy * 0.7) + '*tze];');
    m.parts.op.push('f*=PO>=0.8?0:1;');
    if (atzb_doc(m.L).applyFill !== false) jzAnimator(m.L, 'JZ Out Footnote Colour', [['ADBE Text Fill Color', jzHex(sub)]], m.HD + ATZB_MF + 'ioc(PO/0.45)*70');
    if (atzb_solo(m, G) || T0.rot) return;
    // separator rule over the note (comp space: the lyric layer itself is being scaled)
    var x0 = atzb_cx(T0, r.left), x1 = atzb_cx(T0, r.left + r.width), y0 = atzb_cy(T0, r.top), y1 = atzb_cy(T0, r.top + r.height), bw = x1 - x0, bh = y1 - y0;
    var g = m.size * 0.12, len, seg;
    if (!V) { len = Math.min(bw * 0.5, m.size * 2.4); seg = [[x0, y1 - bh * 0.3 - g], [x0 + len, y1 - bh * 0.3 - g]]; }
    else { len = Math.min(bh * 0.5, m.size * 2.4); seg = [[x1 - bw * 0.3 - g, y0], [x1 - bw * 0.3 - g, y0 + len]]; }
    var S = jzShapeLayer(m.ctx, 'JZ footnote rule', 0, 0), hd = m.HD + 'var qd=oe((PO-0.25)/0.3),qr=ic((PO-0.8)/0.2);';
    atzb_grp(S, 'rule', [seg], sub, { width: atzb_lw(m, 0.02), start: hd + '100*Math.min(qr,qd)', trim: hd + '100*qd' });
    jzSetExpr(jzXf(S, 'ADBE Opacity'), m.HD + 'PO>0?100:0'); jzNoGhost(S);
} });

/* 字枠に還る — each glyph in turn is replaced by its empty hairline body box; the boxes are then taken away in the same order */
jzReg('exit', 'tzToTofu', { apply: function (m) {
    var G = atzb_geo(m.L), O = atzb_ord(m, G), k;
    atzb_fx(m, 'JZ Out Tofu', 'var O=' + atzb_arr(O) + ';', 'if(PO>0&&PO>=O[i]*0.45+0.05)h=true', { op: 1 });
    if (!G.plain.length) return;
    var td = atzb_doc(m.L), col = td.applyFill !== false ? jzTextColor(m.L) : m.ctx.sc.fg;
    var S = atzb_post(m, 'JZ body boxes', 'PO>0?100:0'), lw = atzb_lw(m, 0.022);
    for (k = 0; k < G.plain.length && k < 40; k++) {
        var g = G.plain[k], hd = m.HD + 'var t=' + jzN(O[g.ti] * 0.45) + ',u=(PO-t)/0.42,k=u>0.8?1-ic((u-0.8)/0.2)*0.6:1;';
        var gr = atzb_box(S, 'box ' + (k + 1), hd + '[' + jzN(g.w * 0.84) + '*k,' + jzN(g.h * 0.84) + '*k]', null, { stroke: col, width: lw, gop: hd + '(PO>0&&u>=0&&u<1)?100:0' });
        jzGX(gr).property('ADBE Vector Position').setValue([g.x, g.y]);
    }
} });

/* ================================================================ HOLDS */

/* 末尾キャレット — a hairline caret blinks after the last glyph, as if the line were still being written */
jzReg('hold', 'tzCaretBlink', { apply: function (m) {
    var G = atzb_geo(m.L), n = G.plain.length, mk = jzClamp(atzb_mk(m) * 2, 0, 1), N = atzb_cutN(m);
    if (!n || mk < 0.05) return;
    if (n <= 1 && N > 1 && Math.round(m.o.mi || 0) !== N - 1) return;
    var g = G.plain[n - 1], V = G.V, a = atzb_gA(G, g) + atzb_gLen(G, g) / 2 + m.size * 0.09, c = atzb_gC(G, g), hh = m.size * 0.54;
    var S = atzb_post(m, 'JZ end caret', 'var ka=AMT*' + jzN(mk) + ';(ka>=0.05&&(time%1.06)<0.6)?po*ka:0');
    atzb_grp(S, 'caret', [[atzb_pt(V, a, c - hh), atzb_pt(V, a, c + hh)]], atzb_acc(m), { width: atzb_lw(m, 0.03, 2) });
} });

/* 伸びる下線 — a hairline underline grows slowly under the line for as long as the cut rests, a small tick at its head */
jzReg('hold', 'tzUnderGrow', { apply: function (m) {
    var G = atzb_geo(m.L), mk = jzClamp(atzb_mk(m) * 2, 0, 1), V = G.V;
    if (!G.lns.length || mk < 0.03) return;
    var Ln = G.lns[G.lns.length - 1], c = atzb_under(G, Ln, m.size, 0.6), lw = atzb_lw(m, 0.02), th = m.size * 0.09, ac = atzb_acc(m);
    var cdur = m.c.dur || 2, span = Math.max(0.8, cdur - (m.c.inDur || 0) - (m.c.outDur || 0));
    var hd = m.HD + 'var gg=cl((time-' + jzN((m.c.inDur || 0) * 0.85) + ')/' + jzN(span) + '),e=0.1+0.9*(1-Math.pow(1-gg,1.5));';
    var S = atzb_post(m, 'JZ growing underline', 'po*AMT*' + jzN(mk));
    atzb_grp(S, 'underline', [[atzb_pt(V, Ln.a0, c), atzb_pt(V, Ln.a1, c)]], ac, { width: lw, trim: hd + '100*e' });
    if (!atzb_solo(m, G)) atzb_grp(S, 'tick', [[atzb_pt(V, Ln.a0, c - th), atzb_pt(V, Ln.a0, c + th)]], ac, { width: lw, gpos: hd + 'var dd=' + jzN(Ln.a1 - Ln.a0) + '*e;' + (V ? '[0,dd]' : '[dd,0]') });
} });

/* 数える番号 — a small tabular number over the end of the line counts up quietly (no beat data in AE: every 0.5 s) */
jzReg('hold', 'tzIndexCount', { apply: function (m) {
    var G = atzb_geo(m.L), mk = jzClamp(atzb_mk(m) * 2, 0, 1), V = G.V, ctx = m.ctx;
    if (!G.lns.length || mk < 0.03) return;
    if (G.plain.length <= 1 && atzb_cutN(m) > 1 && Math.round(m.o.mi || 0) !== 0) return;
    var Ln = G.lns[0], fs = Math.max(14 * atzb_Uk(ctx), m.size * 0.24), T0 = atzb_xf(m.L), op = 'po*AMT*' + jzN(mk), T;
    if (V) T = atzb_label(m, '01', Ln.c, Ln.a1 + fs * 0.9 / T0.sy, fs, atzb_sub(m), 'center', op, 'JZ running index');
    else {
        var y = atzb_over(G, Ln, m.size, 0.5) - fs * 0.8 / T0.sy;
        if (!T0.rot) y = Math.max(y, T0.ay + (atzb_MG(ctx) + fs * 0.5 - T0.py) / T0.sy);
        T = atzb_label(m, '01', Ln.a1, y, fs, atzb_sub(m), 'right', op, 'JZ running index');
    }
    atzb_srcExpr(T, m.HD + 'var n=(1+Math.floor(Math.max(0,time-IN)/0.5))%100;(n<10?"0":"")+n');
} });

/* 字詰めの手直し — now and then one gap in the line is kerned a hair wider or tighter (a tick marks it), then put back */
jzReg('hold', 'tzKernNudge', { apply: function (m) {
    var G = atzb_geo(m.L), V = G.V, nl = G.lns.length, i, k, j;
    if (G.plain.length < 3 || !nl) return;
    var amp = m.size * 0.09 * Math.min(1.3, atzb_mk(m));
    if (amp < 0.2) return;
    var LI = [], KI = [], LNS = [], B = [], C = [];
    for (i = 0; i < G.N; i++) { LI.push(-1); KI.push(-1); }
    for (k = 0; k < nl; k++) {
        var gs = G.lns[k].gs, row = [0];
        LNS.push(gs.length); C.push(G.lns[k].c);
        for (j = 0; j < gs.length; j++) {
            LI[gs[j].ti] = k; KI[gs[j].ti] = j;
            if (j > 0) row.push((atzb_gA(G, gs[j - 1]) + atzb_gLen(G, gs[j - 1]) / 2 + atzb_gA(G, gs[j]) - atzb_gLen(G, gs[j]) / 2) / 2);
        }
        B.push(row);
    }
    // every 1.3 s another gap of another line (the browser's choice comes from its own per-item seed)
    var pre = 'var LNS=' + atzb_arr(LNS) + ',tt=time/1.3,cyc=Math.floor(tt),fr=tt-cyc,li=Math.floor(hh(SD*0.37+cyc*7.13)*' + nl + ')%' + nl + ',nn=LNS[li],' +
        'jj=nn>=3?1+Math.floor(hh(SD*0.61+cyc*3.7)*(nn-1))%(nn-1):0,sg=hh(SD*0.23+cyc*5.3)<0.5?1:-1,' +
        'prof=nn>=3?oe((fr-0.12)/0.1)*(1-ioc((fr-0.68)/0.2)):0,dd=sg*' + jzN(amp) + '*AMT*prof;';
    atzb_fx(m, 'JZ Hold Kern', pre + 'var LI=' + atzb_arr(LI) + ',KI=' + atzb_arr(KI) + ';', 'if(LI[i]===li&&KI[i]>=0)' + (V ? 'dy' : 'dx') + '=(KI[i]>=jj?0.5:-0.5)*dd', { pos: Math.max(1, amp / 2) });
    var S = atzb_post(m, 'JZ kern tick', pre + 'po*cl(prof*AMT)'), sg2 = V ? -1 : 1;
    atzb_grp(S, 'tick', [[atzb_pt(V, 0, sg2 * m.size * 0.56), atzb_pt(V, 0, sg2 * m.size * 0.74)]], atzb_acc(m), { width: atzb_lw(m, 0.02),
        gpos: m.HD + ATZB_MF + pre + 'var B=' + atzb_arr2(B) + ',C=' + atzb_arr(C) + ',ga=B[li][jj]||0;' + (V ? '[C[li],ga]' : '[ga,C[li]]') });
} });

/* 行き違う罫 — a short hairline over the line and one under it travel slowly in opposite directions */
jzReg('hold', 'tzCounterRules', { apply: function (m) {
    var G = atzb_geo(m.L), V = G.V, mk = Math.min(1.3, atzb_mk(m)), k;
    if (!G.lns.length || atzb_solo(m, G) || mk < 0.03) return;
    var S = atzb_post(m, 'JZ passing rules', 'po*Math.min(1,AMT*' + jzN(mk * 1.5) + ')'), lw = atzb_lw(m, 0.02), ac = atzb_acc(m);
    var hd = m.HD + 'var u=0.5-0.5*Math.cos(time*' + jzN(1.4 * mk) + '+' + (Math.abs(atzb_seed(m)) % 7) + ');';
    for (k = 0; k < G.lns.length && k < 4; k++) {
        var Ln = G.lns[k], len = Ln.a1 - Ln.a0, seg = len * 0.3, co = atzb_over(G, Ln, m.size, 0.64), cu = atzb_under(G, Ln, m.size, 0.64), tr = jzN(len - seg);
        atzb_grp(S, 'over ' + (k + 1), [[atzb_pt(V, Ln.a0, co), atzb_pt(V, Ln.a0 + seg, co)]], ac, { width: lw, gpos: hd + (V ? '[0,' + tr + '*u]' : '[' + tr + '*u,0]') });
        atzb_grp(S, 'under ' + (k + 1), [[atzb_pt(V, Ln.a0, cu), atzb_pt(V, Ln.a0 + seg, cu)]], ac, { width: lw, gpos: hd + (V ? '[0,' + tr + '*(1-u)]' : '[' + tr + '*(1-u),0]') });
    }
} });

/* ================================================================ part 2: text treatments, camera, effect events, transitions */

/* ================================================================ TREATMENTS */
function atzb_alive(L, amin) {
    var td; try { td = atzb_doc(L); } catch (e) { return false; }
    if (!td || td.applyFill === false || !jzTrim(String(td.text || '')) || !(td.fontSize > 1)) return false;
    try { if (jzXf(L, 'ADBE Opacity').valueAtTime(0, true) < (amin || 0.9) * 100) return false; } catch (e2) {}
    return true;
}
// motion-like context for a treated layer: m.HD has DL (the layer's stagger delay), PO (exit progress) and the easings
function atzb_tm(ctx, L, o) {
    o = o || {};
    var fs = jzFontSize(L);
    return { L: L, ctx: ctx, c: ctx.cut, o: o, size: fs, u: ctx.H / 1080, W: ctx.W, H: ctx.H, HD: jzHead(ctx, { mi: o.mi || 0, size: fs }) };
}
var ATZB_QI = 'function qi(d,du){return oe((time-DL-d)/du);}';     // qIn(e, i, d, dur)

/* 行番号 — a small tabular line number is set before the line, divided from it by a hairline */
jzReg('treat', 'tzLineNo', {
    plan: function (rng, st) { return { acc: rng.chance(0.5) }; },
    apply: function (ctx, L, P, o) {
        if (!atzb_alive(L) || jzCount(String(atzb_doc(L).text)) < 2) return;
        var m = atzb_tm(ctx, L, o), G = atzb_geo(L);
        if (!G.lns.length) return;
        var Ln = G.lns[0], col = P.acc ? atzb_accC(ctx.sc) : atzb_subC(ctx.sc), txt = jzPad(atzb_lineNo(ctx) % 100, 2), T0 = atzb_xf(L);
        var s = m.size, fs = Math.max(12 * m.u, s * 0.24), gap = s * 0.16, lw = Math.max(m.u, s * 0.014), mg = atzb_MG(ctx) * 0.8, nw = fs * 1.35;
        var Q = ATZB_QI + 'var q=qi(0.1,0.45);', op = Q + 'po*cl(q*1.5)*(1-ic(PO))', hd = m.HD + Q, S, y;
        if (G.V) {
            y = Ln.a0 - fs * 0.95; if (!T0.rot && atzb_cy(T0, y) < mg + fs * 0.5) return;
            atzb_label(m, txt, Ln.c, y, fs, col, 'center', op, 'JZ line no');
            S = atzb_post(m, 'JZ line no rule', op);
            atzb_grp(S, 'rule', [[[Ln.c - fs * 0.6, Ln.a0 - fs * 0.3], [Ln.c + fs * 0.6, Ln.a0 - fs * 0.3]]], col, { width: lw, start: hd + '50-50*q', trim: hd + '50+50*q' });
        } else if (!T0.rot && atzb_cx(T0, Ln.a0) - mg >= nw + gap * 2) {
            atzb_label(m, txt, Ln.a0 - gap * 2, Ln.c + s * 0.36 - fs * 0.36, fs, col, 'right', op, 'JZ line no');
            S = atzb_post(m, 'JZ line no rule', op);
            atzb_grp(S, 'rule', [[[Ln.a0 - gap, Ln.c - s * 0.42], [Ln.a0 - gap, Ln.c + s * 0.42]]], col, { width: lw, start: hd + '50-50*q', trim: hd + '50+50*q' });
        } else {
            y = Ln.c - s * 0.5 - fs * 0.85; if (!T0.rot && atzb_cy(T0, y) < mg + fs * 0.5) return;
            atzb_label(m, txt, Ln.a0 + fs * 0.05, y, fs, col, 'left', op, 'JZ line no');
            S = atzb_post(m, 'JZ line no rule', op);
            atzb_grp(S, 'rule', [[[Ln.a0, y + fs * 0.62], [Ln.a0 + nw, y + fs * 0.62]]], col, { width: lw, trim: hd + '100*q' });
        }
    }
});

/* 注番号 — one small superscript reference mark (a number or an asterisk) after the last glyph of the line */
jzReg('treat', 'tzSuperNote', {
    plan: function (rng, st) { return { star: rng.chance(0.35), acc: rng.chance(0.7) }; },
    apply: function (ctx, L, P, o) {
        if (!atzb_alive(L) || jzCount(String(atzb_doc(L).text)) < 2) return;
        var m = atzb_tm(ctx, L, o), G = atzb_geo(L);
        if (!G.lns.length) return;
        var Ln = G.lns[G.lns.length - 1], col = P.acc ? atzb_accC(ctx.sc) : jzTextColor(L), txt = P.star ? '＊' : String((atzb_lineNo(ctx) - 1) % 9 + 1), T0 = atzb_xf(L);
        var s = m.size, fs = Math.max(12 * m.u, s * 0.3), mg = atzb_MG(ctx) * 0.6, x, y, al;
        if (G.V) {
            x = Ln.c + s * 0.5 + fs * 0.5; if (!T0.rot && atzb_cx(T0, x) + fs * 0.5 > ctx.W - mg) return;
            y = Ln.a1 - fs * 0.4; al = 'center';
        } else {
            x = Ln.a1 + fs * 0.12; y = Ln.c - s * 0.36; al = 'left';
            if (!(T0.rot || atzb_cx(T0, x) + fs * 0.75 <= ctx.W - mg)) {        // no room beside the line: over its end
                y = Ln.c - s * 0.5 - fs * 0.7; if (atzb_cy(T0, y) < mg + fs * 0.5) return;
                x = Ln.a1; al = 'right';
            }
        }
        var Q = ATZB_QI + 'var q=qi(0.2,0.4);', T = atzb_label(m, txt, x, y, fs, col, al, Q + 'po*cl(q*2)*(1-ic(PO))', 'JZ note mark');
        jzSetExpr(jzXf(T, 'ADBE Position'), m.HD + Q + '[value[0],value[1]+(1-q)*' + jzN(fs * 0.3 / T0.sy) + ']');      // settles down from a little above
    }
});

/* 字面ガイド — type-design guide lines behind the text: body top and bottom (and a dashed centre line), running past both ends */
jzReg('treat', 'tzTypeGuides', {
    plan: function (rng, st) { return { mid: rng.chance(0.6), ext: rng.range(0.3, 0.55), acc: rng.chance(0.3) }; },
    apply: function (ctx, L, P, o) {
        if (!atzb_alive(L) || jzCount(String(atzb_doc(L).text)) < 2) return;
        var m = atzb_tm(ctx, L, o), G = atzb_geo(L), V = G.V, k, i;
        if (!G.lns.length) return;
        var col = P.acc ? atzb_accC(ctx.sc) : atzb_subC(ctx.sc), s = m.size, lw = Math.max(1.5 * m.u, s * 0.015), ext = s * (P.ext || 0.4);
        var S = atzb_post(m, 'JZ type guides', 'po', true);
        for (k = 0; k < G.lns.length && k < 6; k++) {
            var Ln = G.lns[k], a0 = Ln.a0 - ext, a1 = Ln.a1 + ext, hd = m.HD + ATZB_QI + 'var q=qi(' + jzN(0.02 + k * 0.06) + ',0.55),o=ic(PO),hf=q*(1-o);', segs = [], ticks = [];
            for (i = -1; i <= 1; i += 2) segs.push([atzb_pt(V, a0, Ln.c + s * 0.56 * i), atzb_pt(V, a1, Ln.c + s * 0.56 * i)]);
            atzb_grp(S, 'body ' + (k + 1), segs, col, { width: lw, alpha: 0.8, start: hd + '50-50*hf', trim: hd + '50+50*hf' });
            if (P.mid) atzb_grp(S, 'centre ' + (k + 1), [[atzb_pt(V, a0, Ln.c), atzb_pt(V, a1, Ln.c)]], col, { width: lw, alpha: 0.42, dash: [s * 0.07, s * 0.07], start: hd + '50-50*hf', trim: hd + '50+50*hf' });
            ticks.push([atzb_pt(V, Ln.a0, Ln.c - s * 0.66), atzb_pt(V, Ln.a0, Ln.c - s * 0.56)]);
            ticks.push([atzb_pt(V, Ln.a1, Ln.c - s * 0.66), atzb_pt(V, Ln.a1, Ln.c - s * 0.56)]);
            atzb_grp(S, 'ends ' + (k + 1), ticks, col, { width: lw, alpha: 0.8, gop: hd + '(q>0.6&&o<0.4)?100:0' });
        }
    }
});

/* 目次リーダー — like a contents entry: dot leaders run on from the end of the line to a small tabular number
   (set on a row of their own under the line when there is no room beside it) */
jzReg('treat', 'tzTocLeader', {
    plan: function (rng, st) { return { acc: rng.chance(0.5) }; },
    apply: function (ctx, L, P, o) {
        if (!atzb_alive(L) || jzCount(String(atzb_doc(L).text)) < 3) return;
        var m = atzb_tm(ctx, L, o), G = atzb_geo(L), V = G.V;
        if (!G.lns.length) return;
        var Ln = G.lns[G.lns.length - 1], col = P.acc ? atzb_accC(ctx.sc) : atzb_subC(ctx.sc), txt = jzPad(atzb_lineNo(ctx) % 100, 2), T0 = atzb_xf(L);
        var s = m.size, fs = Math.max(12 * m.u, s * 0.26), mg = atzb_MG(ctx) * 0.9, pitch = s * 0.2, r = Math.max(1.2 * m.u, s * 0.024), nw = fs * 1.4;
        var room = T0.rot ? 0 : V ? ((ctx.H - mg) - atzb_cy(T0, Ln.a1 + s * 0.2)) / T0.sy - nw : ((ctx.W - mg) - atzb_cx(T0, Ln.a1 + s * 0.2)) / T0.sx - nw - s * 0.1;
        var start, len, c, nc;
        if (room >= s * 0.8) { start = Ln.a1 + s * 0.2; len = Math.min(room, s * 1.8); c = V ? Ln.c : Ln.c + s * 0.3; nc = V ? Ln.c : Ln.c + s * 0.36 - fs * 0.36; }
        else { start = Ln.a0; len = (Ln.a1 - Ln.a0) - nw - s * 0.08; c = atzb_under(G, Ln, s, 0.7); nc = c + (V ? 0 : -fs * 0.06); }
        if (len < s * 0.5) return;
        var cnt = Math.min(40, Math.floor(len / pitch));
        if (cnt < 2) return;
        var Q = ATZB_QI + 'var q=qi(0.15,0.6)*(1-ic(PO));', hd = m.HD + Q;
        // the dots: a dashed round-capped stroke, uncovered dot by dot
        var S = atzb_post(m, 'JZ leader dots', 'po');
        atzb_grp(S, 'dots', [[atzb_pt(V, start + pitch * 0.5, c), atzb_pt(V, start + pitch * (cnt - 0.5), c)]], col, { width: r * 2, cap: 2, dash: [0.01, pitch - 0.01],
            trim: hd + 'var sh=Math.ceil(' + cnt + '*cl(q*1.4));sh<=0?0:Math.min(100,(sh-0.5)/' + (cnt - 1) + '*100)' });
        if (V) atzb_label(m, txt, nc, start + cnt * pitch + fs * 0.7, fs, col, 'center', Q + 'po*cl(q*3-2)', 'JZ leader no');
        else atzb_label(m, txt, start + cnt * pitch + s * 0.08, nc, fs, col, 'left', Q + 'po*cl(q*3-2)', 'JZ leader no');
    }
});

/* かな小組み — hiragana are set a size smaller than kanji / katakana on the same baseline and closed up (no change for text without both) */
jzReg('treat', 'tzKanaSmall', {
    plan: function (rng, st) { return { k: rng.range(0.76, 0.84) }; },
    apply: function (ctx, L, P, o) {
        if (!atzb_alive(L, 0.5)) return;
        var G = atzb_geo(L), V = G.V, i, j, n;
        if (!G.plain.length) return;
        var ref = jzChars(G.plain.length <= 1 ? String(ctx.cut.text || '') : String(atzb_doc(L).text)), hasBig = false, hasSmall = false;
        for (i = 0; i < ref.length; i++) {
            if (jzIsKanji(ref[i]) || jzIsKata(ref[i]) || /[A-Za-z0-9]/.test(ref[i])) hasBig = true;
            if (jzIsHira(ref[i])) hasSmall = true;
        }
        if (!hasBig || !hasSmall) return;
        var k = P.k || 0.8, off = [], scl = [], any = false;
        for (i = 0; i < G.N; i++) { off.push([0, 0]); scl.push(1); }
        for (n = 0; n < G.lns.length; n++) {
            var gs = G.lns[n].gs, cum = 0, tmp = [];
            for (j = 0; j < gs.length; j++) {
                if (jzIsHira(gs[j].ch)) { var free = (1 - k) * atzb_gLen(G, gs[j]); tmp.push(-(cum + free / 2)); cum += free; }
                else tmp.push(-cum);
            }
            var base = V ? cum / 2 : G.left ? 0 : G.right ? cum : cum / 2;
            for (j = 0; j < gs.length; j++) {
                var g = gs[j], d = tmp[j] + base;
                if (jzIsHira(g.ch)) { scl[g.ti] = k; off[g.ti] = V ? [0, d] : [d, (1 - k) * g.h * 0.36]; any = true; }
                else off[g.ti] = V ? [0, d] : [d, 0];
            }
        }
        if (!any) return;
        jzCharOffsets(L, off, 'JZ Kana Room');
        jzCharScales(L, scl, 'JZ Kana Size');
    }
});

/* ================================================================ CAMERA */
// expression code defining CAM(t) -> [x, y, s*sx, s*sy, 0, skx] = the browser's get() at cut time t. In the snippets: t, cu, KM, DUR, W, H
function atzb_camFn(cam, o) {
    return jzCamHead(cam) + ATZB_MF + 'var W=' + jzN(cam.W || 1920) + ',H=' + jzN(cam.H || 1080) + ';\n' +
        'function CAM(t){t=Math.max(0,t);var cu=cl(t/DUR);' + (o.pre || '') + '\nvar SS=(' + (o.s || '1') + ');return [' + (o.x || '0') + ',' + (o.y || '0') + ',SS*(' + (o.sx || '1') + '),SS*(' + (o.sy || '1') + '),0,' + (o.skx || '0') + '];}\n';
}
// x / y / s / sx / sy go on the camera null; skx = Transform effect Skew on every content layer. The browser evaluates the camera
// per pass at that pass's lagged time (hard steps split the colour ghosts): each ghost (startTime = its lag) gets a Transform
// effect = N(t)^-1 · N(t - lag).
function atzb_cam(cam, o) {
    var F = atzb_camFn(cam, o), C = cam.content || [], i, e, lag, LG;
    if (o.x || o.y) jzSetExpr(jzXf(cam.nul, 'ADBE Position'), F + 'var c=CAM(time);[value[0]+c[0],value[1]+c[1]]');
    if (o.s || o.sx || o.sy) jzSetExpr(jzXf(cam.nul, 'ADBE Scale'), F + 'var c=CAM(time);[value[0]*c[2],value[1]*c[3]]');
    for (i = 0; i < C.length; i++) {
        lag = 0; try { lag = C[i].startTime || 0; } catch (err) { lag = 0; }
        LG = 'var LAG=' + jzN(Math.max(0, lag)) + ';';
        if (o.skx) { e = jzEffect(C[i], 'ADBE Geometry2', 'JZ Cam Skew'); jzEX(e, 6, F + LG + '-CAM(time-LAG)[5]'); }
        if (lag > 0.001 && (o.x || o.y || o.sx || o.sy)) {
            e = jzEffect(C[i], 'ADBE Geometry2', 'JZ Cam Lag'); jzEP(e, 3, 0);
            jzEX(e, 2, F + LG + 'var a=CAM(time),b=CAM(time-LAG);[value[0]+(b[0]-a[0])/a[2],value[1]+(b[1]-a[1])/a[3]]');
            if (o.sx || o.sy) {
                jzEX(e, 4, F + LG + 'CAM(time-LAG)[3]/CAM(time)[3]*100');
                jzEX(e, 5, F + LG + 'CAM(time-LAG)[2]/CAM(time)[2]*100');
            }
        }
    }
}
function atzb_cn(v) { return '(' + jzN(v) + ')'; }
function atzb_cdur(cam) { return Math.max(0.01, (cam.cut && cam.cut.dur) || 3); }

/* タブ送り — the frame sits a few tab stops off and is moved to centre one exact stop at a time, then stays put */
jzReg('cam', 'tzTabStep', {
    plan: function (rng, st) { return { ax: rng.chance(0.7) ? 0 : 1, dir: rng.pick([1, -1]), n: rng.int(2, 3), a: rng.range(0.014, 0.02) }; },
    apply: function (cam, P) {
        var n = P.n || 2, gap = Math.min(0.6, Math.max(0.2, atzb_cdur(cam) * 0.6 / n));
        var o = { pre: 'var dn=0;for(var k=0;k<' + n + ';k++)dn+=ioc((t-0.18-k*' + jzN(gap) + ')/0.16);var dd=-' + atzb_cn(P.dir || 1) + '*' + atzb_cn(P.a || 0.016) + '*(' + n + '-dn)*KM;', s: '1.02' };
        if (P.ax) o.y = 'dd*H'; else o.x = 'dd*W';
        atzb_cam(cam, o);
    }
});

/* 斜体から正体 — the frame starts slanted like an italic and is set upright in one clean move, then leans back by a hair */
jzReg('cam', 'tzItalicSet', {
    plan: function (rng, st) { return { dir: rng.pick([1, 1, -1]), a: rng.range(5.5, 8) }; },
    apply: function (cam, P) {
        var d = atzb_cn(P.dir || 1), tt = Math.min(0.55, Math.max(0.25, atzb_cdur(cam) * 0.4));
        atzb_cam(cam, { pre: 'var e=oe(t/' + jzN(tt) + ');', skx: '-' + d + '*' + atzb_cn(P.a || 6.5) + '*KM*(1-e)+' + d + '*0.9*KM*cu*e', s: '1.02' });
    }
});

/* 行長合わせ — only the width of the frame changes: it starts a little wide (or narrow) and closes slowly to true measure */
jzReg('cam', 'tzMeasureZoom', {
    plan: function (rng, st) { return { wide: rng.chance(0.65), a: rng.range(0.045, 0.06) }; },
    apply: function (cam, P) {
        atzb_cam(cam, { pre: 'var a=' + atzb_cn(P.a || 0.05) + '*KM*(1-ios(cu));', sx: P.wide === false ? '1-a*0.7' : '1+a', s: '1.015' });
    }
});

/* 方眼ステップ — the frame is moved like a plotter head: one small exact step at a time around a square, x and y never together
   (no beat data in AE: the planned period) */
jzReg('cam', 'tzGridStep', {
    plan: function (rng, st) { return { per: rng.range(0.45, 0.6), a: rng.range(0.01, 0.014), cw: rng.pick([1, -1]), s0: rng.int(0, 3) }; },
    apply: function (cam, P) {
        var per = jzN(P.per || 0.5);
        atzb_cam(cam, { pre: 'var C=[[-1,-1],[1,-1],[1,1],[-1,1]],k=Math.floor(t/' + per + '),e=ioc((t-k*' + per + ')/0.14);' +
            'function at(i){return C[(((' + (P.s0 | 0) + '+' + atzb_cn(P.cw || 1) + '*i)%4)+4)%4];}var A=at(Math.max(0,k-1)),B=at(k),a=' + atzb_cn(P.a || 0.012) + '*KM;',
            x: 'lp(A[0],B[0],e)*W*a', y: 'lp(A[1],B[1],e)*H*a*0.9', s: '1.03' });
    }
});

/* ================================================================ SCREEN ACCENTS */
function atzb_evS(ev) { return atzb_h(Math.round(ev.t * 1000), 7717); }
function atzb_amp(ev) { return jzClamp(ev.amp == null ? 1 : ev.amp, 0.5, 1.3); }
function atzb_pop(sc) { var l = [sc.accent, sc.accent2, sc.fg]; for (var i = 0; i < l.length; i++) if (l[i] && jzContrast(l[i], sc.bg) > 1.8) return l[i]; return sc.fg; }
function atzb_hair(f) { return Math.max(1, Math.round(Math.min(f.W, f.H) * 0.0024)); }
function atzb_evHead(ev) { return jzEvHead(ev.t, ev.dur) + ATZB_MF; }

/* 罫線フラッシュ — two or three hairlines (one heavier) shoot across the whole frame and retract from their tails */
jzReg('fx', 'tzRuleFlash', { build: function (f, ev) {
    var W = f.W, H = f.H, s = atzb_evS(ev), n = 2 + (atzb_h(s, 1) % 2), w = atzb_hair(f), vert = atzb_r(s, 2) < 0.2, LL = vert ? W : H, M = vert ? H : W, i;
    var S = jzEvShape(f.comp, 'JZ FX tzRuleFlash', ev.t, ev.dur), col = atzb_pop(ev.sc);
    for (i = 0; i < n; i++) {
        var pos = Math.round(LL * (1 + ((atzb_h(s, 3) % 3) + i * 4) % 11) / 12), rev = ((i + (s & 1)) & 1) === 1, a = rev ? M : 0, b = rev ? 0 : M;
        var hd = atzb_evHead(ev) + 'var u=cl(p*1.25-' + jzN(i * 0.1) + '),hd=oe(u/0.45),tl=ic((u-0.5)/0.5);';
        atzb_grp(S, 'rule ' + (i + 1), [[atzb_pt(vert, a, pos), atzb_pt(vert, b, pos)]], col, { width: i === 0 ? w * 3 : w, start: hd + '100*Math.min(tl,hd)', trim: hd + '100*hd' });
    }
    jzXf(S, 'ADBE Opacity').setValue(100 * jzClamp(atzb_amp(ev), 0, 1));
} });

/* 字抜き帯 — for a frame or two one band of the picture is knocked out: a plate in the text colour, the type in the background colour
   (Tint by luminance inside the band: dark -> one colour, light -> the other) */
jzReg('fx', 'tzKnockBand', { build: function (f, ev) {
    var W = f.W, H = f.H, sc = ev.sc, s = atzb_evS(ev), dk = jzLum(sc.bg) < 0.45, i;
    var cuts = [[ev.t, ev.dur * 0.55, 1], [ev.t + ev.dur * 0.55, ev.dur * 0.45, 0.34]];      // the band is narrower for the last part
    for (i = 0; i < 2; i++) {
        var bh = Math.max(4, Math.round(H * (0.14 + 0.1 * atzb_r(s, 1)) * atzb_amp(ev) * cuts[i][2]));
        var y0 = Math.round(jzClamp(H * (0.5 + 0.14 * atzb_rs(s, 2)) - bh / 2, 0, H - bh));
        var L = jzAdjLayer(f.comp, 'JZ FX tzKnockBand ' + (i + 1), cuts[i][0], cuts[i][1]);
        L.outPoint = Math.min(f.comp.duration, cuts[i][0] + cuts[i][1]);
        if (!(L.outPoint > L.inPoint)) L.outPoint = L.inPoint + 1 / 240;
        jzMaskRect(L, 0, y0, W, y0 + bh);
        var tn = jzEffect(L, 'ADBE Tint', 'JZ Knockout');
        jzEP(tn, 1, jzHex(dk ? sc.fg : sc.bg)); jzEP(tn, 2, jzHex(dk ? sc.bg : sc.fg)); jzEP(tn, 3, 100);
    }
} });

/* 段ずらし — the frame is ruled into text columns; alternate columns step a line up / down (two exact steps) and are set back */
jzReg('fx', 'tzColumnShift', { build: function (f, ev) {
    var W = f.W, H = f.H, s = atzb_evS(ev), n = 4 + (atzb_h(s, 1) % 3), sg = (s & 1) ? 1 : -1, d = H * 0.04 * atzb_amp(ev), w = atzb_hair(f), i, segs = [];
    var hd = atzb_evHead(ev) + 'var lv=p>=1?0:p<0.18?0.5:p<0.5?1:1-ioc((p-0.5)/0.5);';
    for (i = 0; i < n; i++) {
        var x0 = Math.round(i * W / n), x1 = Math.round((i + 1) * W / n);
        var L = jzAdjLayer(f.comp, 'JZ FX tzColumnShift ' + (i + 1), ev.t, ev.dur);
        jzMaskRect(L, x0, 0, x1, H);
        var tr = jzEffect(L, 'ADBE Geometry2', 'JZ Column Shift');
        jzEX(tr, 2, hd + '[value[0],value[1]+Math.round(' + jzN(((i & 1) ? 1 : -1) * sg * d) + '*lv)]');
        if (i > 0) segs.push([[x0, 0], [x0, H]]);
    }
    var S = jzEvShape(f.comp, 'JZ FX tzColumnShift rules', ev.t, ev.dur);
    atzb_grp(S, 'rules', segs, atzb_pop(ev.sc), { width: w });
    jzSetExpr(jzXf(S, 'ADBE Opacity'), hd + '70*Math.min(1,lv*2)');
} });

/* トンボ点滅 — printer's crop marks in the four corners and register marks on the edge centres blink on twice */
jzReg('fx', 'tzRegTicks', { build: function (f, ev) {
    var W = f.W, H = f.H, mn = Math.min(W, H), w = atzb_hair(f), ins = mn * 0.07, len = mn * 0.04, gap = mn * 0.012, col = atzb_pop(ev.sc), segs = [], a, b, i;
    for (a = -1; a <= 1; a += 2) for (b = -1; b <= 1; b += 2) {
        var x = a < 0 ? ins : W - ins, y = b < 0 ? ins : H - ins;
        segs.push([[x + a * gap, y], [x + a * (gap + len), y]]);
        segs.push([[x, y + b * gap], [x, y + b * (gap + len)]]);
    }
    var r = len * 0.32, c = ins * 0.55, pts = [[W / 2, c], [W / 2, H - c], [c, H / 2], [W - c, H / 2]];
    for (i = 0; i < 4; i++) {
        segs.push([[pts[i][0] - len * 0.6, pts[i][1]], [pts[i][0] + len * 0.6, pts[i][1]]]);
        segs.push([[pts[i][0], pts[i][1] - len * 0.6], [pts[i][0], pts[i][1] + len * 0.6]]);
    }
    var S = jzEvShape(f.comp, 'JZ FX tzRegTicks', ev.t, ev.dur);
    atzb_grp(S, 'marks', segs, col, { width: w });
    var g = jzGrp(S, 'rings');
    for (i = 0; i < 4; i++) jzAddEllipse(g, r * 2, r * 2, pts[i][0], pts[i][1]);
    jzAddStroke(g, col, w);
    jzSetExpr(jzXf(S, 'ADBE Opacity'), atzb_evHead(ev) + '(p<0.3||(p>=0.45&&p<0.82))?' + jzN(100 * jzClamp(atzb_amp(ev), 0, 1)) + ':0');
} });

/* 方眼フラッシュ — a hairline baseline grid with column rules draws itself over the frame, line after line, and fades */
jzReg('fx', 'tzGridFlash', { build: function (f, ev) {
    var W = f.W, H = f.H, s = atzb_evS(ev), w = atzb_hair(f), rows = W > H ? 12 : 18, cols = W > H ? 6 : 4, rev = (s & 1) === 1, col = atzb_pop(ev.sc), r, c, hd = atzb_evHead(ev);
    var S = jzEvShape(f.comp, 'JZ FX tzGridFlash', ev.t, ev.dur);
    for (r = 1; r < rows; r++) {
        var y = Math.round(r * H / rows);
        atzb_grp(S, 'row ' + r, [[[rev ? W : 0, y], [rev ? 0 : W, y]]], col, { width: w, trim: hd + '100*oe((p-' + jzN(r / rows * 0.3) + ')/0.3)' });
    }
    for (c = 1; c < cols; c++) {
        var x = Math.round(c * W / cols);
        atzb_grp(S, 'column ' + c, [[[x, 0], [x, H]]], col, { width: w, trim: hd + '100*oe((p-' + jzN(0.12 + c / cols * 0.2) + ')/0.3)' });
    }
    jzSetExpr(jzXf(S, 'ADBE Opacity'), hd + jzN(50 * jzClamp(atzb_amp(ev), 0, 1)) + '*(p<0.65?1:1-ic((p-0.65)/0.35))');
} });

/* コマ位置送り — the whole frame is re-registered: three small exact hard steps around a square, back to true on the fourth */
jzReg('fx', 'tzFrameStep', { build: function (f, ev) {
    var s = atzb_evS(ev), a = Math.min(f.W, f.H) * 0.024 * atzb_amp(ev), path = [[1, 0], [1, 1], [0, 1]], sx = (s & 1) ? 1 : -1, sy = (s & 2) ? 1 : -1, X = [], Y = [], i;
    for (i = 0; i < 3; i++) { var q = (s & 4) ? [path[i][1], path[i][0]] : path[i]; X.push(Math.round(q[0] * sx * a)); Y.push(Math.round(q[1] * sy * a)); }
    X.push(0); Y.push(0);
    var L = jzAdjLayer(f.comp, 'JZ FX tzFrameStep', ev.t, ev.dur), tr = jzEffect(L, 'ADBE Geometry2', 'JZ Frame Step');
    jzEX(tr, 2, atzb_evHead(ev) + 'var i=p>=1?3:Math.min(3,Math.floor(p*4)),X=' + atzb_arr(X) + ',Y=' + atzb_arr(Y) + ';[value[0]+X[i],value[1]+Y[i]]');
} });

/* ================================================================ TRANSITIONS */
function atzb_tacc(t) {
    var sc = t.sc, pb = (t.scPrev || sc).bg, l = [sc.accent, sc.accent2, sc.fg];
    for (var i = 0; i < l.length; i++) if (l[i] && jzContrast(l[i], sc.bg) >= 1.8 && jzContrast(l[i], pb) >= 1.4) return l[i];
    return sc.fg;
}
// the old cut on top for the transition only, cut away by an inverted alpha matte M (its shapes = the uncovered parts)
function atzb_tcopy(t, name) { var C = t.A.duplicate(); C.name = name; C.moveBefore(t.B); C.inPoint = t.t0; C.outPoint = t.t0 + t.dur; return C; }
function atzb_tmatte(M, C) { M.moveBefore(C); C.trackMatteType = TrackMatteType.ALPHA_INVERTED; M.enabled = false; }
function atzb_ths(t) { return jzEvHead(t.t0, t.dur) + ATZB_MF; }

/* 罫割り — a hairline is drawn across the frame, splits in two, and the new cut is uncovered between the parting rules */
jzReg('trans', 'tzRuleSplit', {
    plan: function (rng, st) { return { vert: rng.chance(0.3), at: rng.range(0.42, 0.58) }; },
    build: function (t) {
        var W = t.W, H = t.H, V = !!t.P.vert, LL = V ? W : H, M = V ? H : W, c = Math.round(LL * (t.P.at || 0.5)), ac = atzb_tacc(t), lw = Math.max(2, Math.round(Math.min(W, H) * 0.003)), i;
        var HS = atzb_ths(t) + 'var q1=ioc(p/0.3),q2=ioc((p-0.24)/0.76),lo=lp(' + c + ',0,q2),hi=lp(' + c + ',' + jzN(LL) + ',q2);';
        var C = atzb_tcopy(t, 'JZ Trans rule split (prev cut)'), Mt = jzEvShape(t.comp, 'JZ Trans rule split matte', t.t0, t.dur);
        atzb_box(Mt, 'opening', HS + (V ? '[Math.max(0,hi-lo),' + jzN(H) + ']' : '[' + jzN(W) + ',Math.max(0,hi-lo)]'), HS + (V ? '[(lo+hi)/2,' + jzN(H / 2) + ']' : '[' + jzN(W / 2) + ',(lo+hi)/2]'), { fill: '#FFFFFF' });
        var S = jzEvShape(t.comp, 'JZ Trans rule split rules', t.t0, t.dur);
        for (i = 0; i < 2; i++) {
            atzb_grp(S, 'rule ' + (i + 1), [[atzb_pt(V, 0, 0), atzb_pt(V, M, 0)]], ac, { width: lw, start: HS + '50-50*q1', trim: HS + '50+50*q1',
                gpos: HS + 'var v=' + (i ? 'hi' : 'lo') + ';' + (V ? '[v,0]' : '[0,v]') });
        }
        jzSetExpr(jzXf(S, 'ADBE Opacity'), HS + '100*(1-cl((q2-0.85)/0.15))');
        atzb_tmatte(Mt, C);
    }
});

/* 段ごと差し替え — the frame is set in text columns; column after column is replaced in a hard cut, a hairline dropping down each one */
jzReg('trans', 'tzColumnReplace', {
    plan: function (rng, st) { return { n: rng.int(4, 7), rtl: rng.chance(0.4) }; },
    build: function (t) {
        var W = t.W, H = t.H, n = Math.max(2, Math.round(t.P.n || 5)), ac = atzb_tacc(t), lw = Math.max(2, Math.round(Math.min(W, H) * 0.0028)), i, rules = [];
        var HS = atzb_ths(t), C = atzb_tcopy(t, 'JZ Trans column replace (prev cut)');
        var Mt = jzEvShape(t.comp, 'JZ Trans column replace matte', t.t0, t.dur), S = jzEvShape(t.comp, 'JZ Trans column replace lines', t.t0, t.dur);
        for (i = 0; i < n; i++) {
            var j = t.P.rtl ? n - 1 - i : i, x0 = Math.round(j * W / n), x1 = Math.round((j + 1) * W / n), Q = HS + 'var u=cl((p-' + jzN(i / n * 0.78) + ')/0.22);';
            atzb_rects(Mt, 'column ' + (i + 1), [[(x0 + x1) / 2, H / 2, x1 - x0 + 1, H]], { fill: '#FFFFFF', gop: Q + 'u>0?100:0' });
            atzb_grp(S, 'drop ' + (i + 1), [[[x0, 0], [x1, 0]]], ac, { width: lw, gop: Q + '(u>0&&u<1)?100:0', gpos: Q + '[0,' + jzN(H) + '*oc(u)]' });
            atzb_grp(S, 'edges ' + (i + 1), [[[x0 + lw / 2, 0], [x0 + lw / 2, H]], [[x1 - lw / 2, 0], [x1 - lw / 2, H]]], ac, { width: lw, gop: Q + '(u>0&&u<1)?100:0' });
            if (i > 0) rules.push([[Math.round(i * W / n), 0], [Math.round(i * W / n), H]]);
        }
        atzb_grp(S, 'column rules', rules, ac, { width: lw / 2, gop: HS + '50*Math.sin(Math.PI*p)' });
        atzb_tmatte(Mt, C);
    }
});

/* 基線に畳む — the old cut is folded flat onto a baseline hairline from above and below; the new cut unfolds from the same line */
jzReg('trans', 'tzBaselineFold', {
    plan: function (rng, st) { return { at: rng.range(0.5, 0.66) }; },
    build: function (t) {
        var W = t.W, H = t.H, yb = Math.round(H * (t.P.at || 0.58)), ac = atzb_tacc(t), lw = Math.max(2, Math.round(Math.min(W, H) * 0.003)), HS = atzb_ths(t);
        // behind both cuts: the previous background turning into the new one
        var S1 = jzEvSolid(t.comp, 'JZ Trans fold back', (t.scPrev || t.sc).bg, t.t0, t.dur); S1.moveAfter(t.A);
        var S2 = jzEvSolid(t.comp, 'JZ Trans fold back 2', t.sc.bg, t.t0, t.dur); jzSetExpr(jzXf(S2, 'ADBE Opacity'), HS + '100*p'); S2.moveAfter(t.A);
        // the old cut is squashed onto the line (first half), the new one opens from it (second half); identity outside the transition
        var eA = jzEffect(t.A, 'ADBE Geometry2', 'JZ Trans fold out');
        jzEP(eA, 1, [W / 2, yb]); jzEP(eA, 2, [W / 2, yb]); jzEP(eA, 3, 0);
        jzEX(eA, 4, HS + 'p<=0?100:100*Math.max(0.002,1-ic(p/0.5))');
        jzEX(eA, 9, HS + 'p>=0.5?0:100');
        var eB = jzEffect(t.B, 'ADBE Geometry2', 'JZ Trans fold in');
        jzEP(eB, 1, [W / 2, yb]); jzEP(eB, 2, [W / 2, yb]); jzEP(eB, 3, 0);
        jzEX(eB, 4, HS + 'p>=1?100:100*Math.max(0.002,oc((p-0.5)/0.5))');
        jzEX(eB, 9, HS + 'p<0.5?0:100');
        var S = jzEvShape(t.comp, 'JZ Trans fold line', t.t0, t.dur);
        atzb_grp(S, 'baseline', [[[0, yb], [W, yb]]], ac, { width: lw });
        jzSetExpr(jzXf(S, 'ADBE Opacity'), HS + '100*cl(p/0.2)*(1-cl((p-0.8)/0.2))');
    }
});
