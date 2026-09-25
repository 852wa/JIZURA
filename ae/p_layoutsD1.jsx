// ================================================================ pack layoutsD part 1 (AE port of src/11p_layoutsD.js, entries 1-17)
// cube, cylinder, flipCards, accordion, flag, ribbon, pendulum, pile, blocks, balloons, magnets, tiles, bulbs, ledScroll,
// billboard, crowdBubbles, crossword
//
// Techniques used here (no 3D layers — the faux 3D is done with 2D affine maps, as in the browser):
// - an affine map M = [a, b, c, d, e, f] (x' = a*x + c*y + e, y' = b*x + d*y + f) is split by aff() in the expressions into
//   Rotation * Skew * Scale: shape groups take it as their group transform, a text layer through a Transform effect.
// - deforming quads (cloth strips, ribbon segments) are pairs of triangles: a 100 px unit triangle mapped by its group
//   transform. All triangles of one surface live in sub-groups of ONE group with ONE fill, so they fill as a union (no seams).
// - "glyph layers": one glyph per line, anchor = position (layer space == comp space); per-glyph animators move / turn /
//   scale / hide each glyph, so many freely placed glyphs stay ONE editable text layer.
// - moving objects that carry a lyric glyph are separate shape layers and the text is parented to them, so the cut's
//   enter / hold / exit expressions on the text layer stay untouched.

var LD1_CY = 0.38;     // glyph centre above the baseline (em)
// expression helpers appended after jzTH(ctx): in-out cubic, affine split, colour mix
var LD1_FX = 'function iocu(x){x=cl(x);return x<0.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;}' +
    'function aff(a,b,c,d){var sx=Math.sqrt(a*a+b*b);if(sx<1e-6)sx=1e-6;var r=Math.atan2(b,a),kk=(a*c+b*d)/sx,sy=(a*d-b*c)/sx,t=Math.abs(sy)<1e-6?0:kk/sy;t=Math.max(-11,Math.min(11,t));return [r*180/Math.PI,-Math.atan(t)*180/Math.PI,sx*100,sy*100];}' +
    'function mixc(a,b,t){return [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t,1];}\n';

/* ---------------------------------------------------------------- small helpers */
function ld1_H(ctx) { return jzTH(ctx) + LD1_FX; }
function ld1_mot(ctx) { return ctx.fx && ctx.fx.motion != null ? ctx.fx.motion : 0.7; }
function ld1_col(hex) { var c = jzHex(hex); return '[' + jzN(c[0]) + ',' + jzN(c[1]) + ',' + jzN(c[2]) + ',1]'; }
function ld1_box(x0, y0, x1, y1) { return { x0: x0, y0: y0, x1: x1, y1: y1, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 }; }
function ld1_stag(ctx) { return Math.max(0.005, ctx.cut.stagger || 0.04); }
function ld1_mi(ctx, t) { return Math.floor(Math.max(0, t) / ld1_stag(ctx) + 1e-6); }      // browser miAt
function ld1_plateHold(ctx) { return jzIndexOf(['still', 'jitter', 'breathe', 'glitchtick'], ctx.cut.hold || 'still') < 0; }
function ld1_light(sc) { return jzLum(sc.fg) > jzLum(sc.bg) ? sc.fg : sc.bg; }
function ld1_dark(sc) { return jzLum(sc.fg) > jzLum(sc.bg) ? sc.bg : sc.fg; }
function ld1_onCol(sc, fill) {
    var c = [sc.bg, sc.fg, sc.ink, sc.accent, sc.sub], best = null, bv = 0;
    for (var i = 0; i < c.length; i++) { if (!c[i] || String(c[i]).toUpperCase() === String(fill).toUpperCase()) continue; var k = jzContrast(c[i], fill); if (k > bv) { bv = k; best = c[i]; } }
    return bv >= 2.4 ? best : (jzLum(fill) > 0.5 ? '#111111' : '#FFFFFF');
}
function ld1_plateCol(sc, pref) { for (var i = 0; i < pref.length; i++) if (pref[i] && jzContrast(pref[i], sc.bg) >= 1.6) return pref[i]; return sc.fg; }
function ld1_shade(sc, c, s) { return s >= 0 ? jzMixHex(c, ld1_light(sc), Math.min(0.9, s)) : jzMixHex(c, ld1_dark(sc), Math.min(0.9, -s)); }
function ld1_objCols(sc) {
    var src = [sc.accent, sc.fg, sc.accent2, sc.ink, sc.sub], out = [];
    for (var i = 0; i < src.length; i++) if (src[i] && jzContrast(src[i], sc.bg) >= 1.7 && jzIndexOf(out, src[i]) < 0) out.push(src[i]);
    return out.length ? out : [sc.fg];
}
function ld1_alt(ctx) { var c = ctx.cut; if (c.lineText && jzStrip(c.lineText) !== jzStrip(c.text)) return jzFlat(c.lineText); return jzRomajiOf(ctx) || 'No.' + jzLineNo(ctx); }
function ld1_arr(a) { return jzArrExpr(a); }
function ld1_strArr(a) { var o = []; for (var i = 0; i < a.length; i++) o.push('"' + String(a[i]).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"'); return '[' + o.join(',') + ']'; }
function ld1_sub(g, name) { var q = jzVecs(g).addProperty('ADBE Vector Group'); if (name) q.name = name; return q; }
// re-fetch a named top-level group of a shape layer (a sibling added to Contents invalidates older group references in AE)
function ld1_rg(S, name) { return S.property('ADBE Root Vectors Group').property(name); }
function ld1_gOp(g, ex) { jzSetExpr(jzGX(g).property('ADBE Vector Group Opacity'), ex); }
function ld1_gPos(g, ex) { jzSetExpr(jzGX(g).property('ADBE Vector Position'), ex); }
function ld1_gSc(g, ex) { jzSetExpr(jzGX(g).property('ADBE Vector Scale'), ex); }
function ld1_gRot(g, ex) { jzSetExpr(jzGX(g).property('ADBE Vector Rotation'), ex); }
function ld1_rr(g, w, h, r, x, y) { return jzAddRect(g, Math.max(0.5, w), Math.max(0.5, h), Math.max(0, Math.min(r, w / 2, h / 2)), x || 0, y || 0); }
// parent without converting the child's values: every parent here has anchor = position (layer space == comp space)
function ld1_parent(L, P) { try { L.setParentWithJump(P); } catch (e) { try { L.parent = P; } catch (e2) { jzWarn('parent: ' + e2.toString()); } } }
function ld1_behind(list, L) { for (var i = 0; i < list.length; i++) list[i].moveAfter(L); }
// dashed stroke (AE starts with an empty Dashes group; the preview model has fixed children).
// Every addProperty invalidates the dash properties added before it, so add them all first, then fetch them by matchName.
function ld1_dash(st, d, gp, offExpr) {
    var D = st.property('ADBE Vector Stroke Dashes'), p1 = null, p2 = null, p3 = null;
    try { D.addProperty('ADBE Vector Stroke Dash 1'); D.addProperty('ADBE Vector Stroke Gap 1'); if (offExpr) D.addProperty('ADBE Vector Stroke Offset'); } catch (e) {}
    try { p1 = D.property('ADBE Vector Stroke Dash 1'); p2 = D.property('ADBE Vector Stroke Gap 1'); if (offExpr) p3 = D.property('ADBE Vector Stroke Offset'); } catch (e1) { jzWarn('dashes: ' + e1.toString()); }
    if (p1) p1.setValue(d); if (p2) p2.setValue(gp);
    if (p3 && offExpr) jzSetExpr(p3, offExpr);
}
function ld1_cap(st, c) { try { st.property('ADBE Vector Stroke Line Cap').setValue(c); } catch (e) {} }

// ---- affine maps: body is expression code that defines M = [a, b, c, d, e, f] (group-local px -> comp px)
function ld1_affGrp(g, head, body, opExpr) {
    var tg = jzGX(g), pre = head + body + ';var AF=aff(M[0],M[1],M[2],M[3]);';
    jzSetExpr(tg.property('ADBE Vector Position'), head + body + ';[M[4],M[5]]');
    jzSetExpr(tg.property('ADBE Vector Rotation'), pre + 'AF[0]');
    jzSetExpr(tg.property('ADBE Vector Skew'), pre + 'AF[1]');
    jzSetExpr(tg.property('ADBE Vector Scale'), pre + '[AF[2],AF[3]]');
    if (opExpr) jzSetExpr(tg.property('ADBE Vector Group Opacity'), head + body + ';' + opExpr);
}
// triangle sub-group: body defines T = [x0, y0, x1, y1, x2, y2] in comp px (the parent group has an identity transform)
function ld1_tri(parent, name, head, body) {
    var g = ld1_sub(parent, name);
    jzAddPath(g, [[0, 0], [100, 0], [0, 100]], true);
    ld1_affGrp(g, head, body + ';var M=[(T[2]-T[0])/100,(T[3]-T[1])/100,(T[4]-T[0])/100,(T[5]-T[1])/100,T[0],T[1]]');
    return g;
}
// quad A B C D (in order round the outline) as two triangles; body defines Q = [ax, ay, bx, by, cx, cy, dx, dy]
function ld1_quad(parent, name, head, body) {
    ld1_tri(parent, name + ' a', head, body + ';var T=[Q[0],Q[1],Q[2],Q[3],Q[6],Q[7]]');
    ld1_tri(parent, name + ' b', head, body + ';var T=[Q[4],Q[5],Q[6],Q[7],Q[2],Q[3]]');
}
// text layer mapped by M (content relative to the layer's anchor); P = the layer's own (rest) position in comp px
function ld1_fxAff(L, head, body, opExpr, P) {
    var A = jzXf(L, 'ADBE Anchor Point').value, e = jzEffect(L, 'ADBE Geometry2', 'JZ Face');
    if (!e) return null;
    var pre = head + body + ';var AF=aff(M[0],M[1],M[2],M[3]);';
    jzEP(e, 1, [A[0], A[1]]);
    jzEX(e, 2, head + body + ';[' + jzN(A[0] - P[0]) + '+M[4],' + jzN(A[1] - P[1]) + '+M[5]]');
    jzEP(e, 3, 0);
    jzEX(e, 4, pre + 'AF[3]'); jzEX(e, 5, pre + 'AF[2]'); jzEX(e, 6, pre + 'AF[1]'); jzEP(e, 7, 0); jzEX(e, 8, pre + 'AF[0]');
    if (opExpr) jzEX(e, 9, head + body + ';' + opExpr);
    return e;
}

// ---- ghosts: the browser draws every plate / helper graphic of these layouts with ghost off (main pass, g=false or gIn only while
// flying in); only the lyric is ghosted. ld1_anim records the lyric layers, ld1_reg marks every other layer of the build jzNoGhost.
var LD1_LYR = [];
function ld1_anim(ctx, L, o) { LD1_LYR.push(L); return jzAnimate(ctx, L, o); }
function ld1_reg(key, def) {
    var b = def.build;
    def.build = function (ctx) {
        LD1_LYR = [];
        var bb = b(ctx), keep = {}, i;
        for (i = 0; i < LD1_LYR.length; i++) { try { keep[LD1_LYR[i].index] = 1; } catch (e) {} }
        for (i = 1; i <= ctx.comp.numLayers; i++) if (!keep[i]) jzNoGhost(ctx.comp.layer(i));
        LD1_LYR = [];
        return bb;
    };
    jzReg('layout', key, def);
}

/* ---------------------------------------------------------------- text helpers */
// advance width in em (the browser measures real fonts; full-width glyphs are exactly 1 em)
function ld1_adv(ch) {
    var c = ch.charCodeAt(0);
    if (ch === ' ') return 0.34;
    if (c < 0x80) {
        if (/[A-Z]/.test(ch)) return /[MW]/.test(ch) ? 0.9 : (ch === 'I' ? 0.32 : 0.7);
        if (/[a-z]/.test(ch)) return /[mw]/.test(ch) ? 0.88 : /[ijl]/.test(ch) ? 0.28 : /[frt]/.test(ch) ? 0.42 : 0.61;
        if (/[0-9]/.test(ch)) return 0.62;
        return /[.,:;!'|]/.test(ch) ? 0.28 : 0.42;
    }
    if (c < 0x250) return 0.56;
    if (c >= 0xFF61 && c <= 0xFF9F) return 0.5;
    return 1;
}
function ld1_lineW(str, track) { var a = jzChars(str), w = 0; for (var i = 0; i < a.length; i++) w += ld1_adv(a[i]) + (i < a.length - 1 ? (track || 0) : 0); return w; }
// { w, h } in em of a block ('\r' separated lines)
function ld1_meas(str, track, lead) {
    var ls = String(str).split(/\r\n|\r|\n/), w = 0.01;
    for (var i = 0; i < ls.length; i++) w = Math.max(w, ld1_lineW(ls[i], track));
    return { w: w, h: (ls.length - 1) * (lead || 1.2) + 1 };
}
// browser J.fitSize: the font size that fits the block into maxW x maxH
function ld1_fit(str, maxW, maxH, track, lead) { var m = ld1_meas(str, track, lead); return Math.min(maxW / m.w, maxH / m.h); }
// a text block centred at (x, y); o: { font, size, color, track, lead, fill, stroke, strokeColor, opacity, name, align }
function ld1_T(ctx, str, o) {
    var multi = /\r/.test(str);
    return jzText(ctx, str, { font: o.font, size: o.size, color: o.color || ctx.sc.fg, x: o.x || 0, y: o.y || 0, track: o.track || 0, leading: multi ? o.size * (o.lead || 1.2) : null,
        fill: o.fill, stroke: o.stroke, strokeColor: o.strokeColor, strokeOver: o.strokeOver, opacity: o.opacity, name: o.name, align: o.align });
}
// fade a secondary layer: value * expr (expr uses the jzTH header)
function ld1_opx(ctx, L, ex) { jzSetExpr(jzXf(L, 'ADBE Opacity'), ld1_H(ctx) + 'value*(' + ex + ')'); }

/* ---- chunking (port of the browser pack's chunksK / rowsOf / brk) */
function ld1_splitWord(w) {
    var n = jzChars(w).length, o = [], i;
    if (/[A-Za-z]/.test(w)) {
        if (/[^\x00-\x7F]/.test(w)) { var c = jzChunk(w); if (c.length > 1) return c; }
        return n > 10 ? [w.substr(0, Math.ceil(w.length / 2)), w.substr(Math.ceil(w.length / 2))] : [w];
    }
    if (n < 2) return [w];
    var p = jzSplitLines(w, Math.ceil(n / 2)).split('\r');
    for (i = 0; i < p.length; i++) if (p[i]) o.push(p[i]);
    return o;
}
function ld1_chunksK(text, k) {
    var t = jzTrim(String(text || '')), i, j, words = [];
    if (!t) return [''];
    if (/\s/.test(t) && jzHasLatin(t)) {
        var ws = t.split(/\s+/);
        for (i = 0; i < ws.length; i++) if (ws[i]) words.push({ t: ws[i], sp: true });
        if (words.length) words[words.length - 1].sp = false;
    } else {
        var chs = jzChunk(jzStrip(t));
        for (i = 0; i < chs.length; i++) { var q0 = jzTrim(chs[i]); if (q0) words.push({ t: q0, sp: false }); }
    }
    if (!words.length) words = [{ t: t, sp: false }];
    k = Math.max(1, Math.min(k, jzCount(t)));
    var hard = {};
    function gl(w) { return jzCount(w.t); }
    function splitAt(idx) {
        var w = words[idx], parts = ld1_splitWord(w.t), rep = [];
        if (parts.length < 2) { hard[w.t] = 1; return false; }
        for (var q = 0; q < parts.length; q++) rep.push({ t: parts[q], sp: q === parts.length - 1 ? w.sp : false });
        words = words.slice(0, idx).concat(rep, words.slice(idx + 1));
        return true;
    }
    for (var guard = 0; words.length < k && guard < 20; guard++) {
        var bi = -1, bl = 1;
        for (i = 0; i < words.length; i++) if (!hard[words[i].t] && gl(words[i]) > bl) { bl = gl(words[i]); bi = i; }
        if (bi < 0) break;
        splitAt(bi);
    }
    function part() {
        var n = words.length, kk = Math.min(k, n), pre = [0], g, a, b, dp = [], by = [];
        for (a = 0; a < n; a++) pre.push(pre[a] + gl(words[a]) + 0.4);
        var tgt = pre[n] / kk;
        for (g = 0; g <= kk; g++) { dp.push([]); by.push([]); for (a = 0; a <= n; a++) { dp[g].push(1e18); by[g].push(0); } }
        dp[0][0] = 0;
        for (g = 1; g <= kk; g++) for (a = g; a <= n; a++) for (b = g - 1; b < a; b++) { var d = pre[a] - pre[b] - tgt, v = dp[g - 1][b] + d * d; if (v < dp[g][a]) { dp[g][a] = v; by[g][a] = b; } }
        var cuts = [], x = n, out = [], prev = 0;
        for (g = kk; g >= 1; g--) { cuts.unshift(x); x = by[g][x]; }
        for (a = 0; a < cuts.length; a++) { out.push(words.slice(prev, cuts[a])); prev = cuts[a]; }
        return out;
    }
    var groups = part();
    for (var it = 0; it < 3 && groups.length > 1; it++) {
        var mx = -1, mn = 1e9, gi = 0;
        for (i = 0; i < groups.length; i++) { var s = 0; for (j = 0; j < groups[i].length; j++) s += gl(groups[i][j]); if (s > mx) { mx = s; gi = i; } if (s < mn) mn = s; }
        if (mx <= mn * 1.7 + 1) break;
        var big = groups[gi], bw = null, wi = -1;
        for (j = 0; j < big.length; j++) if (!hard[big[j].t] && gl(big[j]) >= 4 && (!bw || gl(big[j]) > gl(bw))) bw = big[j];
        if (!bw) break;
        for (j = 0; j < words.length; j++) if (words[j] === bw) { wi = j; break; }
        if (wi < 0 || !splitAt(wi)) break;
        groups = part();
    }
    var res = [];
    for (i = 0; i < groups.length; i++) { var s2 = ''; for (j = 0; j < groups[i].length; j++) s2 += groups[i][j].t + (j < groups[i].length - 1 && groups[i][j].sp ? ' ' : ''); if (s2) res.push(s2); }
    return res.length ? res : [t];
}
// rows of glyph slots (a ' ' slot is a word gap) broken at chunk boundaries
function ld1_rowsOf(text, maxPer) {
    var t = jzFlat(text), n = jzCount(t), rs = n > maxPer ? ld1_chunksK(t, Math.ceil(n / maxPer)) : [t], out = [];
    for (var i = 0; i < rs.length; i++) out.push(jzChars(jzTrim(rs[i])));
    return out;
}
function ld1_brk(text, maxPer) { var t = jzFlat(text), n = jzCount(t); return n <= maxPer ? t : ld1_chunksK(t, Math.ceil(n / maxPer)).join('\r'); }

/* ---- glyph layers: ONE text layer, one glyph per line; anchor = position = (cx, cy) keeps layer space == comp space */
function ld1_G(ctx, chars, o) {
    var t = [], i;
    for (i = 0; i < chars.length; i++) t.push(chars[i] === '' || chars[i] === ' ' ? '・' : chars[i]);
    var L = jzText(ctx, t.join('\r'), { font: o.font, size: o.size, color: o.color || ctx.sc.fg, x: 0, y: 0, track: 0, leading: o.size, fill: o.fill, stroke: o.stroke,
        strokeColor: o.strokeColor, strokeOver: o.strokeOver, name: o.name || 'glyphs' });
    var cx = o.cx || 0, cy = o.cy || 0;
    jzXf(L, 'ADBE Anchor Point').setValue([cx, cy]); jzXf(L, 'ADBE Position').setValue([cx, cy]);
    return { L: L, fs: o.size, LD: o.size, n: t.length };
}
// per-glyph transform from one expression body (i = glyph index): it sets x, y (glyph centre, comp px) and optionally
// r (deg), sx / sy (scale factors -1..3), a (opacity 0..1); which = letters of 'prsa' for the animators to create
function ld1_GX(ctx, G, name, head, body, which) {
    var pre = head + 'var i=textIndex-1,x=0,y=0,r=0,sx=1,sy=1,a=1;' + body + ';', KB = Math.max(ctx.W, ctx.H) * 3 + G.n * G.LD;
    if (which.indexOf('p') >= 0) jzAnimator(G.L, name + ' Place', [['ADBE Text Position 3D', [KB, KB, 0]]], pre + '[x/' + jzN(KB) + '*100,(y+' + jzN(LD1_CY * G.fs) + '-i*' + jzN(G.LD) + ')/' + jzN(KB) + '*100,0]');
    if (which.indexOf('r') >= 0) jzAnimator(G.L, name + ' Turn', [['ADBE Text Rotation', 360]], pre + 'Math.max(-100,Math.min(100,r/3.6))');
    if (which.indexOf('s') >= 0) jzAnimator(G.L, name + ' Size', [['ADBE Text Scale 3D', [300, 300, 100]]], pre + '[Math.max(-100,Math.min(100,(sx-1)*50)),Math.max(-100,Math.min(100,(sy-1)*50)),0]');
    if (which.indexOf('a') >= 0) jzAnimator(G.L, name + ' Show', [['ADBE Text Opacity', 0]], pre + '(1-cl(a))*100');
}
// static placement of a glyph layer: pts[i] = [x, y] glyph centres (comp px)
function ld1_place(G, pts, name) {
    var offs = [];
    for (var i = 0; i < pts.length; i++) offs.push([pts[i][0], pts[i][1] + LD1_CY * G.fs - i * G.LD]);
    return jzCharOffsets(G.L, offs, name || 'JZ Place');
}
// glyph centres of a row of slots (advance widths), centred on cx; returns [{ ch, x, w }]
function ld1_row(chars, size, k, cx) {
    var tot = 0, i, out = [];
    for (i = 0; i < chars.length; i++) tot += ld1_adv(chars[i]) * size * k;
    var x = cx - tot / 2;
    for (i = 0; i < chars.length; i++) { var w = ld1_adv(chars[i]) * size * k; out.push({ ch: chars[i], x: x + w / 2, w: w }); x += w; }
    out.tot = tot;
    return out;
}

/* ================================================================== 1 cube — 立方体 */
// orthographic cube (yaw th, pitch ph): every face is a parallelogram, so faces are affine-mapped rectangles and the
// lyric on a face is the text layer mapped by the same matrix (Transform effect)
function ld1_cubeTh(mode, dir, k, T, t) {
    var D = Math.PI / 180, x = Math.max(0, Math.min(1, t / 0.8)), c = 2.1, sIn = 1 - (1 + c * Math.pow(x - 1, 3) + 1.1 * Math.pow(x - 1, 2));
    if (mode === 'turn') {
        var acc = 0;
        for (var j = 1; j < k; j++) { var q = Math.max(0, Math.min(1, (t - j * T + 0.25) / 0.5)); acc += q < 0.5 ? 4 * q * q * q : 1 - Math.pow(-2 * q + 2, 3) / 2; }
        return dir * (-(acc * Math.PI / 2) - 20 * D - sIn * 90 * D);
    }
    return dir * ((mode === 'pair' ? -45 : -24) * D) + sIn * 100 * D * dir;
}
ld1_reg('cube', {
    plan: function (rng, cut, st) {
        var n = cut.n, mode = n >= 4 && rng.chance(0.45) ? 'pair' : 'single';
        if (n >= 6 && cut.dur > 2.6 && rng.chance(0.35)) mode = 'turn';
        var k = mode === 'pair' ? 2 : mode === 'turn' ? Math.min(4, Math.max(2, Math.ceil(n / 5))) : 1;
        return {
            mode: mode, chunks: k > 1 ? ld1_chunksK(cut.text, k) : [jzFlat(cut.text)], font: rng.pick(jzFontsOf(st, ['display', 'display', 'serif'])),
            pitch: rng.range(20, 30), dir: rng.pick([1, -1]), face: rng.pick(['ink', 'accent', 'ink']), top: rng.pick(['accent', 'shade']), sway: rng.range(3, 7)
        };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, u = jzU(ctx), port = jzPortrait(ctx), i, f;
        var chunks = jzP(ctx, 'chunks', null);
        if (!chunks || !chunks.length) chunks = [jzFlat(c.text)];
        var mode = chunks.length < 2 ? 'single' : jzP(ctx, 'mode', 'pair');
        if (mode === 'single') chunks = [jzFlat(c.text)];
        var font = jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'display')), ph = jzP(ctx, 'pitch', 25) * Math.PI / 180, dir = jzP(ctx, 'dir', 1) < 0 ? -1 : 1;
        var h = Math.min(W * (mode === 'pair' ? 0.27 : 0.3), H * 0.285, u * 0.36), cx = W / 2, cy = H / 2 + h * Math.sin(ph) * 0.55;
        var pc = ld1_plateCol(sc, jzP(ctx, 'face', 'ink') === 'accent' ? [sc.accent, sc.ink] : [sc.ink, sc.fg, sc.accent]), tc = ld1_onCol(sc, pc);
        var topC = jzP(ctx, 'top', 'shade') === 'accent' && jzContrast(sc.accent, pc) > 1.3 ? sc.accent : ld1_shade(sc, pc, 0.22);
        var k = chunks.length, T = c.dur / k, DK = ld1_dark(sc), sp = Math.sin(ph), cp = Math.cos(ph);
        var HD = ld1_H(ctx) + 'var DG=Math.PI/180,DIR=' + dir + ',SP=' + jzN(sp) + ',CP=' + jzN(cp) + ',H0=' + jzN(h) + ',CX=' + jzN(cx) + ',CY=' + jzN(cy) + ';' +
            'var pp=ob(cl(time/0.4),1.3)*(1-0.15*ic(PO)),hs=H0*pp,sIn=1-ob(cl(time/0.8),1.1),th;';
        if (mode === 'turn') HD += 'var acc=0;for(var j=1;j<' + k + ';j++)acc+=iocu((time-j*' + jzN(T) + '+0.25)/0.5);th=DIR*(-(acc*Math.PI/2)-20*DG-sIn*90*DG);';
        else HD += 'th=DIR*(' + (mode === 'pair' ? -45 : -24) + '*DG)+sIn*100*DG*DIR;';
        HD += 'th+=Math.sin(time*0.7)*' + jzN(jzP(ctx, 'sway', 5) * ld1_mot(ctx)) + '*DG+ic(PO)*70*DG*DIR;' +
            'function face(f){if(f<4){var a=f*Math.PI/2+th,ca=Math.cos(a),sa=Math.sin(a);return [ca,-sa*SP,0,CP,CX+hs*sa,CY+hs*ca*SP,ca*CP,sa,ca];}' +
            'var ct=Math.cos(th),s2=Math.sin(th);return [ct,-s2*SP,s2,ct*SP,CX,CY-hs*CP,SP,0,0];}\n';
        var CL = 'var PCc=' + ld1_col(pc) + ',LIc=' + ld1_col(ld1_light(sc)) + ',DKc=' + ld1_col(DK) + ';function shd(s){return s>=0?mixc(PCc,LIc,Math.min(0.9,s)):mixc(PCc,DKc,Math.min(0.9,-s));}';
        // faces (visible faces of a convex solid never overlap) + contact shadow below them
        var S = jzShapeLayer(ctx, 'cube', 0, 0), lw = Math.max(1.2 * ctx.u, u * 0.0022);
        for (f = 0; f < 5; f++) {
            var g = jzGrp(S, f === 4 ? 'top' : 'face ' + (f + 1));
            jzAddRect(g, 2 * h, 2 * h, 0);
            var fb = 'var F=face(' + f + ');var M=[F[0]*pp,F[1]*pp,F[2]*pp,F[3]*pp,F[4],F[5]]';
            var lx = HD + CL + fb + ';var LT=shd((-0.55*F[7]*DIR+0.55*F[8])*0.35);';
            // each item is fully set up before its next sibling is added (adding one invalidates older item references in AE)
            var stk = jzAddStroke(g, jzMixHex(f === 4 ? topC : pc, DK, 0.35), lw);
            if (f < 4) jzSetExpr(stk.property('ADBE Vector Stroke Color'), lx + 'mixc(LT,DKc,0.35)');
            var fl = jzAddFill(g, f === 4 ? topC : pc);
            if (f < 4) jzSetExpr(fl.property('ADBE Vector Fill Color'), lx + 'LT');
            ld1_affGrp(g, HD, fb, '(F[6]>0.004?100:0)');
        }
        var gS = jzGrp(S, 'shadow'); jzAddRect(gS, 2.08 * h, 2.08 * h, 0); jzAddFill(gS, DK);
        ld1_affGrp(gS, HD, 'var F=face(4);var M=[F[0]*pp,F[1]*pp,F[2]*pp,F[3]*pp,CX,CY+hs*CP+hs*0.14]', '35');
        jzSetExpr(jzXf(S, 'ADBE Opacity'), HD + 'hs<1?0:100*K');
        // which face carries which chunk
        function faceOf(f) {
            if (mode === 'turn') { var idx = dir > 0 ? f : (4 - f) % 4; return idx < k ? idx : -1; }
            if (mode === 'pair') return dir > 0 ? (f === 0 ? 0 : f === 1 ? 1 : -1) : (f === 3 ? 0 : f === 0 ? 1 : -1);
            return f === 0 ? 0 : -1;
        }
        function restC(f, t) { var th = ld1_cubeTh(mode, dir, k, T, t), a = f * Math.PI / 2 + th; return [cx + h * Math.sin(a), cy + h * Math.cos(a) * sp]; }
        function faceText(L, f, P, opE) { ld1_fxAff(L, HD, 'var F=face(' + f + ');var M=[F[0]*pp,F[1]*pp,F[2]*pp,F[3]*pp,F[4],F[5]]', '(F[6]>=0.08?' + opE + ':0)', P); }
        // top label
        var P4 = [cx, cy - h * cp], TL = jzText(ctx, 'No.' + jzLineNo(ctx), { font: jzMonoF(ctx), size: h * 0.2, track: 0.2, color: ld1_onCol(sc, topC), x: P4[0], y: P4[1], name: 'cube top label' });
        faceText(TL, 4, P4, '90*K');
        for (f = 0; f < 4; f++) {
            var ci = faceOf(f), L, P;
            if (ci >= 0 && chunks[ci]) {
                var t = ld1_brk(chunks[ci], mode === 'single' ? (port ? 4 : 5) : 4), size = Math.min(ld1_fit(t, h * 1.64, h * 1.5, 0.02, 1.12), h * 0.9);
                var arrive = mode === 'turn' ? ci * T + (ci ? 0.05 : 0.12) : 0.18 + ci * 0.12;
                P = restC(f, arrive + 0.6);
                L = ld1_T(ctx, t, { font: font, size: size, color: tc, x: P[0], y: P[1], track: 0.02, lead: 1.12, name: chunks[ci] });
                ld1_anim(ctx, L, { mi: ld1_mi(ctx, arrive), noHold: ld1_plateHold(ctx) });
                faceText(L, f, P, '100');
            } else if (mode === 'single' && f === (dir > 0 ? 1 : 3)) {
                var at = ld1_brk(ld1_alt(ctx), 6), fs = Math.min(ld1_fit(at, h * 1.5, h * 1.2, 0.08, 1.4), h * 0.2);
                P = restC(f, 1);
                L = ld1_T(ctx, at, { font: jzBodyF(ctx), size: fs, color: tc, x: P[0], y: P[1], track: 0.08, lead: 1.4, name: 'cube side copy' });
                faceText(L, f, P, '75*K*oe((time-0.3)/0.4)');
            } else if (mode === 'single' && f === (dir > 0 ? 3 : 1)) {
                P = restC(f, 1);
                L = ld1_T(ctx, jzLineNo(ctx), { font: font, size: h * 1.1, color: tc, x: P[0], y: P[1], fill: false, stroke: Math.max(1.5 * ctx.u, h * 0.012), strokeColor: tc, name: 'cube side number' });
                faceText(L, f, P, '50*K');
            }
        }
        return ld1_box(cx - h * 1.35, cy - h * (1 + sp) - h * 0.1, cx + h * 1.35, cy + h * (cp + sp) + h * 0.1);
    }
});

/* ================================================================== 2 cylinder — 円筒 */
ld1_reg('cylinder', {
    plan: function (rng, cut, st) {
        return {
            font: rng.pick(jzFontsOf(st, ['display', 'serif'])), fs: rng.pick(jzFontsOf(st, ['body', 'display'])), rings: rng.pick([2, 4, 4, 6]), band: rng.chance(0.45),
            dir: rng.pick([1, -1]), speed: rng.range(0.25, 0.45), tilt: rng.range(0.13, 0.2), sep: rng.pick([' ・ ', ' / ', ' — ']), glass: rng.chance(0.7)
        };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, u = jzU(ctx), port = jzPortrait(ctx), i, j;
        var font = jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'display')), fsF = jzP(ctx, 'fs', jzBodyF(ctx)), dir = jzP(ctx, 'dir', 1) < 0 ? -1 : 1;
        var t0 = jzFlat(c.text), n = jzCount(t0);
        if (!n) return null;
        var rowsT = n > (port ? 7 : 9) ? ld1_chunksK(t0, 2) : [t0], nR = rowsT.length;
        var R = Math.min(W * (port ? 0.38 : 0.3), H * 0.42), cx = W / 2, ek = jzP(ctx, 'tilt', 0.16), yMid = H / 2, size = H * 0.2;
        for (i = 0; i < rowsT.length; i++) size = Math.min(size, 2.1 * R / Math.max(1, ld1_lineW(rowsT[i], 0) * 1.04));
        size = Math.min(size, u * (nR > 1 ? 0.15 : 0.19));
        var rowGap = size * 1.45, blockH = nR * rowGap, mot = ld1_mot(ctx);
        var ss = Math.max(12 * ctx.u, size * 0.3), unit = jzChars(jzFlat(c.lineText || c.text) + jzP(ctx, 'sep', ' ・ ')), nSec = jzP(ctx, 'rings', 4), ringY = [];
        for (i = 0; i < nSec; i++) { var side = i % 2 ? 1 : -1, kk = Math.floor(i / 2); ringY.push({ y: yMid + side * (blockH / 2 + ss * 0.9 + kk * ss * 1.6), dir: (i % 2 ? 1 : -1) * dir, k: kk }); }
        var yTop = yMid - blockH / 2, yBot = yMid + blockH / 2;
        for (i = 0; i < ringY.length; i++) { yTop = Math.min(yTop, ringY[i].y - ss * 0.8); yBot = Math.max(yBot, ringY[i].y + ss * 0.8); }
        yTop += -ek * R - size * 0.12; yBot += -ek * R + size * 0.12;
        var HD = ld1_H(ctx) + 'var DIR=' + dir + ',RR=' + jzN(R) + ',EK=' + jzN(ek) + ',CX=' + jzN(cx) + ';var spin=-(1-oc(time/0.8))*1.7*DIR+Math.sin(time*0.8)*' + jzN(0.05 * mot) + '+ic(PO)*1.9*DIR;';
        function ell(y, a0, a1, N) { var pts = []; for (var q = 0; q <= N; q++) { var t = a0 + (a1 - a0) * q / N; pts.push([cx + R * Math.sin(t), y + ek * R * Math.cos(t)]); } return pts; }
        // glass body
        if (jzP(ctx, 'glass', true)) {
            var lw = Math.max(1 * ctx.u, u * 0.0016), GS = jzShapeLayer(ctx, 'cylinder glass', 0, 0), gg = jzGrp(GS, 'glass');
            jzAddPath(gg, ell(yTop, -Math.PI, Math.PI, 48), true);
            jzAddPath(gg, ell(yBot, -Math.PI / 2, Math.PI / 2, 24), false);
            jzAddStroke(gg, sc.sub, lw);
            var gl2 = jzGrp(GS, 'sides');
            jzAddPath(gl2, [[cx - R, yTop], [cx - R, yBot]], false); jzAddPath(gl2, [[cx + R, yTop], [cx + R, yBot]], false);
            jzAddStroke(gl2, sc.sub, lw); jzAddTrimPaths(gl2, ld1_H(ctx) + 'oc(time/0.6)*100');
            ld1_opx(ctx, GS, '0.45*oc(time/0.6)*K');
        }
        // wrap band behind the lyric (radial ramp = the browser's horizontal light gradient)
        var bandC = ld1_plateCol(sc, [sc.accent, sc.ink]), onBand = !!jzP(ctx, 'band', false);
        if (onBand) {
            var yb0 = yMid - blockH / 2 + size * 0.02 - ek * R, yb1 = yMid + blockH / 2 - size * 0.02 - ek * R;
            var top = ell(yb0, -Math.PI / 2, Math.PI / 2, 36), bot = ell(yb1, -Math.PI / 2, Math.PI / 2, 36).reverse();
            var BS = jzShapeLayer(ctx, 'cylinder band', 0, 0), gb = jzGrp(BS, 'band');
            jzAddPath(gb, top.concat(bot), true); jzAddFill(gb, bandC);
            var rp = jzEffect(BS, 'ADBE Ramp', 'JZ Band Light'), ymb = (yb0 + yb1) / 2 + ek * R;
            jzEP(rp, 1, [cx + R * 0.1, ymb]); jzEP(rp, 2, jzHex(ld1_shade(sc, bandC, 0.12))); jzEP(rp, 3, [cx + R * 1.15, ymb]); jzEP(rp, 4, jzHex(ld1_shade(sc, bandC, -0.5))); jzEP(rp, 5, 2);
            ld1_opx(ctx, BS, 'oc(time/0.6)*K');
        }
        // secondary rings: one glyph layer each, glyphs placed round the drum (back half mirrored & dim)
        var speed = jzP(ctx, 'speed', 0.35);
        for (i = 0; i < ringY.length; i++) {
            var rg = ringY[i], cnt = Math.min(72, Math.max(unit.length, Math.floor(Math.PI * 2 * R / (ss * 1.05)))), chs = [], JJ = [];
            for (j = 0; j < cnt; j++) { var ch = unit[j % unit.length]; if (ch === ' ' || ch === '　') continue; chs.push(ch); JJ.push(j); }
            if (!chs.length) continue;
            var G = ld1_G(ctx, chs, { font: fsF, size: ss, color: sc.sub, name: 'cylinder ring ' + (i + 1), cx: cx, cy: rg.y });
            var rh = HD + 'var JJ=' + ld1_arr(JJ) + ',ea=oc((time-' + jzN(0.05 + rg.k * 0.08) + ')/0.5)*K;';
            ld1_GX(ctx, G, 'JZ Ring', rh, 'var t=time*' + jzN(speed * rg.dir) + '+' + jzN(rg.k * 0.7) + '+spin*0.5+JJ[i]/' + cnt + '*Math.PI*2,c=Math.cos(t),s=Math.sin(t);' +
                'x=CX+RR*s;y=' + jzN(rg.y) + '-EK*RR+EK*RR*c;sx=c;r=Math.atan2(-EK*s,1)*180/Math.PI*0.8;a=Math.abs(c)<0.06?0:(c>0?0.45+0.55*c:0.12-0.1*c)*ea', 'prsa');
        }
        // the lyric rows on the front of the drum (one glyph layer)
        var gl = [], A0 = [], Y0 = [], RI = [];
        for (var ri = 0; ri < nR; ri++) {
            var y0 = yMid + (ri - (nR - 1) / 2) * rowGap, row = ld1_row(jzChars(rowsT[ri]), size, 1.04, 0);
            for (j = 0; j < row.length; j++) { if (row[j].ch === ' ') continue; gl.push(row[j].ch); A0.push(row[j].x); Y0.push(y0); RI.push(ri % 2 ? 0.08 : -0.08); }
        }
        var ML = ld1_G(ctx, gl, { font: font, size: size, color: onBand ? ld1_onCol(sc, bandC) : sc.fg, name: t0, cx: cx, cy: yMid });
        ld1_GX(ctx, ML, 'JZ Drum', HD + 'var A0=' + ld1_arr(A0) + ',Y0=' + ld1_arr(Y0) + ',RI=' + ld1_arr(RI) + ';',
            'var t=A0[i]/RR+spin+RI[i]*' + (nR > 1 ? '(1-oc(time/0.9))' : '0') + ',c=Math.cos(t),s=Math.sin(t);x=CX+RR*s;y=Y0[i]-EK*RR+EK*RR*c;sx=Math.max(0.02,c);' +
            'r=Math.atan(-EK*s/Math.max(c,0.5))*180/Math.PI;a=c<0.03?0:0.35+0.65*Math.pow(c,0.6)', 'prsa');
        ld1_anim(ctx, ML.L, { mi: 0, noHold: true });
        return ld1_box(cx - R, yMid - blockH / 2, cx + R, yMid + blockH / 2);
    }
});

/* ================================================================== 3 flipCards — カードめくり */
ld1_reg('flipCards', {
    plan: function (rng, cut, st) {
        return { font: rng.pick(jzFontsOf(st, ['display', 'serif'])), order: rng.pick(['ltr', 'ltr', 'random']), table: rng.chance(0.55), back: rng.pick(['accent', 'ink']), peek: rng.chance(0.6), idx: rng.chance(0.7) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, s = c.seed, u = jzU(ctx), port = jzPortrait(ctx), i, j;
        var font = jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'display')), table = !!jzP(ctx, 'table', false), peek = !!jzP(ctx, 'peek', false), idx = !!jzP(ctx, 'idx', true);
        var rowsC = ld1_rowsOf(c.text, port ? 4 : 7), cards = [], per = 1;
        for (i = 0; i < rowsC.length; i++) { per = Math.max(per, rowsC[i].length); for (j = 0; j < rowsC[i].length; j++) if (rowsC[i][j] !== ' ') cards.push({ ch: rowsC[i][j], r: i, j: j, cnt: rowsC[i].length }); }
        var n = cards.length;
        if (!n) return null;
        var rowsL = rowsC.length, rows = rowsL + (table ? 2 : 0), asp = 1.38, gap = 0.16;
        var k = Math.min(W * 0.86 / (per + (per - 1) * gap), H * (table ? 0.86 : 0.7) / (rows * asp + (rows - 1) * gap), u * 0.26);
        var cw = k, chh = k * asp, sx = k * (1 + gap), sy = chh + k * gap;
        var faceC = ld1_light(sc), faceT = ld1_dark(sc), backC = null, cand = (jzP(ctx, 'back', 'accent') === 'accent' ? [sc.accent, sc.ink] : [sc.ink, sc.accent]).concat([sc.accent2, sc.sub, ld1_dark(sc)]);
        for (i = 0; i < cand.length && !backC; i++) if (cand[i] && jzContrast(cand[i], faceC) >= 1.6 && jzContrast(cand[i], sc.bg) >= 1.25) backC = cand[i];
        if (!backC) backC = jzMixHex(faceC, ld1_dark(sc), 0.6);
        var backL = jzMixHex(backC, ld1_onCol(sc, backC), 0.35);
        var fd = jzClamp(c.dur * 0.12, 0.22, 0.36), gapT = jzClamp(c.dur * 0.34 / n, 0.04, 0.12), rank = [];
        for (i = 0; i < n; i++) rank.push(i);
        if (jzP(ctx, 'order', 'ltr') === 'random') rank.sort(function (a, b) { return jzR(s, a, 31) - jzR(s, b, 31); });
        var ord = []; for (i = 0; i < n; i++) ord.push(0);
        for (i = 0; i < n; i++) ord[rank[i]] = i;
        var lw = Math.max(1 * ctx.u, k * 0.012), rr = k * 0.08, TH = ld1_H(ctx), DK = ld1_dark(sc);
        // card geometry at flip progress p (0 face-down .. 1 face-up), card turns round its vertical axis
        var FL = 'function card(p){var an=p*Math.PI,cc=Math.cos(an),sn=Math.sin(an),s2=1+0.1*sn;return [Math.max(0.02,Math.abs(cc))*s2,s2,sn,p>=0.5?1:0];}';
        function cardGroups(S, name, x, y, pE, aE, xh) {
            var g = jzGrp(S, name), hd = TH + FL + (xh || '') + 'var P=' + pE + ',C=card(P);';
            var gf = ld1_sub(g, 'face'); ld1_rr(gf, cw, chh, rr * 0.5); jzAddStroke(gf, jzMixHex(faceC, faceT, 0.25), lw); jzAddFill(gf, faceC);
            ld1_gOp(gf, hd + 'C[3]*100');
            var gb = ld1_sub(g, 'back'), ins = k * 0.09, dd = Math.min(cw - ins * 2, chh - ins * 2) * 0.28;
            var gd = ld1_sub(gb, 'diamond'); jzAddPath(gd, [[0, -dd * 1.2], [dd * 0.9, 0], [0, dd * 1.2], [-dd * 0.9, 0]], true); jzAddFill(gd, backL);
            var gi = ld1_sub(gb, 'inner'); ld1_rr(gi, cw - ins * 2, chh - ins * 2, rr * 0.6); jzAddStroke(gi, backL, lw);
            var gb2 = ld1_sub(gb, 'plate'); ld1_rr(gb2, cw, chh, rr * 0.5); jzAddFill(gb2, backC);
            ld1_gOp(gb, hd + '(1-C[3])*100');
            var gs = ld1_sub(g, 'shadow'); ld1_rr(gs, cw, chh, rr * 0.5); jzAddFill(gs, DK);
            ld1_gPos(gs, hd + '[' + jzN(k * 0.05) + '*(1+C[2]*1.5)/C[0],' + jzN(k * 0.07) + '*(1+C[2]*1.5)/C[1]]'); ld1_gOp(gs, '25');
            jzGX(g).property('ADBE Vector Position').setValue([x, y]);
            ld1_gSc(g, hd + '[C[0]*100,C[1]*100]');
            ld1_gOp(g, hd + '100*(' + aE + ')');
            return g;
        }
        // decoy table rows (face-down), one decoy peeks now and then
        if (table) {
            var DS = jzShapeLayer(ctx, 'card table', 0, 0), PE = [], PX = [], PY = [];
            var ta = 'oc(time/0.4)*(1-ic((PO-0.4)/0.6))*0.8', q = 0;
            var pk = 'function pk(q){if(!' + (peek ? 1 : 0) + ')return 0;var T=1.3,kk=Math.floor(time/T),f=time/T-kk;if(kk<1||Math.floor(hh(kk*5+' + (s % 997) + ')*' + (per * 2) + ')!==q)return 0;return f<0.25?iocu(f/0.25):f<0.6?1:1-iocu((f-0.6)/0.25);}';
            for (var side = 0; side < 2; side++) {
                var rr0 = side ? rowsL : -1;
                for (j = 0; j < per; j++) {
                    var x = W / 2 + (j - (per - 1) / 2) * sx, y = H / 2 + (rr0 - (rowsL - 1) / 2) * sy, qi = j + (side ? per : 0);
                    cardGroups(DS, 'decoy ' + (q + 1), x, y, 'pk(' + qi + ')', ta, pk);
                    PX.push(x); PY.push(y); PE.push(qi); q++;
                }
            }
            if (peek) {
                var gl = [], QI = [];
                for (i = 0; i < PE.length; i++) { gl.push(jzR(s, i, 6) < 0.5 ? '？' : '★'); QI.push(PE[i]); }
                var DG2 = ld1_G(ctx, gl, { font: font, size: k * 0.46, color: sc.accent === faceC ? faceT : sc.accent, name: 'card peeks', cx: W / 2, cy: H / 2 });
                var PXa = [], PYa = []; for (i = 0; i < PX.length; i++) { PXa.push(PX[i]); PYa.push(PY[i]); }
                ld1_GX(ctx, DG2, 'JZ Peek', TH + FL + pk + 'var PX=' + ld1_arr(PXa) + ',PY=' + ld1_arr(PYa) + ',QI=' + ld1_arr(QI) + ';',
                    'var P=pk(QI[i]),C=card(P);x=PX[i];y=PY[i];sx=C[0];sy=C[1];a=C[3]*' + ta, 'psa');
            }
        }
        // the lyric cards: plates in one shape layer, one text layer per card (scaled by a per-glyph animator)
        var CS = jzShapeLayer(ctx, 'cards', 0, 0), bb = null, IX = [], IP = [], IS = [];
        var PO_ = function (i) { return 'var ti=' + jzN(0.12 + ord[i] * gapT) + ',p=iocu((time-ti)/' + jzN(fd) + '),po=cl(PO*1.5-' + jzN(ord[i] / Math.max(1, n) * 0.5) + ');if(po>0)p=Math.min(p,1-iocu(po));p'; };
        var cardP = [];
        for (i = 0; i < n; i++) {
            var cd = cards[i], x2 = W / 2 + (cd.j - (cd.cnt - 1) / 2) * sx, y2 = H / 2 + (cd.r - (rowsL - 1) / 2) * sy;
            cardP.push([x2, y2]);
            var pE = '(function(){' + PO_(i).replace(/p$/, 'return p;') + '})()';
            cardGroups(CS, 'card ' + (i + 1), x2, y2, pE, 'oc((time-' + jzN(ord[i] * 0.02) + ')/0.25)*(1-ic((PO-0.55)/0.45))');
        }
        for (i = 0; i < n; i++) {
            var pE2 = '(function(){' + PO_(i).replace(/p$/, 'return p;') + '})()';
            var T = ld1_T(ctx, cards[i].ch, { font: font, size: k * 0.6, color: faceT, x: cardP[i][0], y: cardP[i][1], name: cards[i].ch });
            var fh = TH + FL + 'var P=' + pE2 + ',C=card(P);';
            jzAnimator(T, 'JZ Flip', [['ADBE Text Scale 3D', [300, 300, 100]]], fh + '[(C[0]-1)*50,(C[1]-1)*50,0]');
            jzAnimator(T, 'JZ Face Up', [['ADBE Text Opacity', 0]], fh + '(1-C[3])*100');
            ld1_anim(ctx, T, { mi: ld1_mi(ctx, 0.12 + ord[i] * gapT + fd * 0.5), noHold: ld1_plateHold(ctx) });
            bb = jzUnion(bb, ld1_box(cardP[i][0] - cw / 2, cardP[i][1] - chh / 2, cardP[i][0] + cw / 2, cardP[i][1] + chh / 2));
            if (idx) { IX.push(cards[i].ch, cards[i].ch); IP.push(i, i); IS.push(-1, 1); }
        }
        // corner indices of all cards: one glyph layer
        if (idx && IX.length) {
            var XS = [], YS = [], PS = [];
            for (i = 0; i < n; i++) { XS.push(cardP[i][0]); YS.push(cardP[i][1]); }
            var CI = ld1_G(ctx, IX, { font: font, size: k * 0.15, color: sc.accent, name: 'card indices', cx: W / 2, cy: H / 2 });
            var ph = TH + FL + 'var XS=' + ld1_arr(XS) + ',YS=' + ld1_arr(YS) + ',IP=' + ld1_arr(IP) + ',IS=' + ld1_arr(IS) + ';function pc(i){';
            for (i = 0; i < n; i++) ph += (i ? 'else ' : '') + 'if(i===' + i + '){' + PO_(i).replace(/p$/, 'return p;') + '}';
            ph += 'return 0;}';
            ld1_GX(ctx, CI, 'JZ Index', ph, 'var q=IP[i],C=card(pc(q)),sg=IS[i];x=XS[q]+sg*' + jzN(cw * 0.34) + '*C[0];y=YS[q]+sg*' + jzN(chh * 0.36) + '*C[1];sx=C[0];sy=C[1];r=sg>0?180:0;' +
                'a=C[3]*(C[0]>0.33?1:0)*oc((time-' + '0.1)/0.25)*K', 'prsa');
        }
        return bb;
    }
});

// glyph centres of a block laid out like the browser's layoutText (relative to the block centre)
function ld1_layout(str, size, track, lead) {
    var lines = String(str).split(/\r\n|\r|\n/), nL = lines.length, LDd = (lead || 1.2) * size, out = [], mw = 0;
    for (var li = 0; li < nL; li++) {
        var a = jzChars(lines[li]), ws = [], w = 0, j;
        for (j = 0; j < a.length; j++) { ws.push(ld1_adv(a[j]) * size); w += ws[j] + (j < a.length - 1 ? (track || 0) * size : 0); }
        mw = Math.max(mw, w);
        var x = -w / 2, y = (li - (nL - 1) / 2) * LDd;
        for (j = 0; j < a.length; j++) { out.push({ ch: a[j], x: x + ws[j] / 2, y: y, sp: a[j] === ' ' || a[j] === '　' }); x += ws[j] + (track || 0) * size; }
    }
    out.W = mw; out.H = nL * LDd - (LDd - size);
    return out;
}

/* ================================================================== 4 accordion — 蛇腹 */
// panels are trapezoids (alternate edges taller): rect + two right-angle wedges scaled by the group transform, one fill
ld1_reg('accordion', {
    plan: function (rng, cut, st) {
        var port = cut.H > cut.W * 1.08;
        return {
            font: rng.pick(jzFontsOf(st, ['display', 'serif'])), fold: rng.range(26, 38), orient: port && cut.n <= 10 && rng.chance(0.7) ? 'v' : 'h',
            covers: rng.chance(0.7), plate: rng.pick(['ink', 'fg', 'accent']), breathe: rng.range(3, 7), start: rng.pick([1, -1])
        };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, u = jzU(ctx), port = jzPortrait(ctx), i, j, r;
        var n = jzCount(c.text);
        if (!n) return null;
        var font = jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'display')), fold = jzP(ctx, 'fold', 32), vert = jzP(ctx, 'orient', 'h') === 'v' && port && n <= 10;
        var rowsA = ld1_rowsOf(c.text, vert ? 10 : port ? 5 : 9), rows = rowsA.length, per = 1;
        for (r = 0; r < rows; r++) per = Math.max(per, rowsA[r].length);
        var cA = Math.cos(fold * Math.PI / 180), kap = 0.13, st0 = jzP(ctx, 'start', 1) > 0 ? 0 : 1;
        var Pw = Math.min((vert ? H * 0.82 : W * 0.86) / (per * cA + 0.5), (vert ? W * 0.5 : H * 0.62 / rows) / 1.25, u * 0.3), Ph = Pw * 1.2;
        var pl = jzP(ctx, 'plate', 'ink'), pc = ld1_plateCol(sc, pl === 'accent' ? [sc.accent, sc.ink] : pl === 'fg' ? [sc.fg, sc.ink] : [sc.ink, sc.fg]);
        var tc = ld1_onCol(sc, pc), lit = ld1_shade(sc, pc, 0.1), dim = ld1_shade(sc, pc, -0.32), cv = ld1_plateCol(sc, [sc.accent, sc.ink, sc.fg]);
        var covC = cv === pc ? ld1_shade(sc, pc, -0.45) : cv, DK = ld1_dark(sc), lw = Math.max(1 * ctx.u, u * 0.0016);
        var AL = vert ? H / 2 : W / 2;                      // centre along the strip
        var HD = ld1_H(ctx) + 'var FD=' + jzN(fold) + ',PW=' + jzN(Pw) + ',PH=' + jzN(Ph) + ',KP=' + kap + ';var opn=ob(cl((time-0.02)/0.7),1.25);' +
            'var al=FD+(1-opn)*(86-FD)+Math.sin(time*2.1)*' + jzN(jzP(ctx, 'breathe', 5) * ld1_mot(ctx)) + '*cl(time/0.8)+ic(PO)*(88-FD);al=Math.max(2,Math.min(88.5,al))*Math.PI/180;' +
            'var ca=Math.cos(al),sa=Math.sin(al),pw=PW*ca,hmn=PH*(1-KP*sa),dd=PH*KP*sa;\n';
        function P2(a, b) { return vert ? '[' + b + ',' + a + ']' : '[' + a + ',' + b + ']'; }
        var S = jzShapeLayer(ctx, 'accordion', 0, 0), gl = [], GJ = [], GC = [], GY = [];
        for (r = 0; r < rows; r++) {
            var row = rowsA[r], cnt = row.length, cy = (vert ? W : H) / 2 + (r - (rows - 1) / 2) * Ph * 1.3;
            var rh = HD + 'var CNT=' + cnt + ',CY=' + jzN(cy) + ',C0=' + jzN(AL) + '-CNT*pw/2;';
            // end covers
            if (jzP(ctx, 'covers', true)) {
                var gc = jzGrp(S, 'covers ' + (r + 1)), cw2 = Ph * 0.09;
                for (var e2 = 0; e2 < 2; e2++) {
                    var rc = ld1_rr(gc, 1, 1, 0), tallL = (st0 % 2) === 0, pe = e2 ? cnt : 0, tall = ((pe + st0) % 2) === 0;
                    jzSetExpr(rc.property('ADBE Vector Rect Position'), rh + 'var a=' + (e2 ? 'C0+CNT*pw+' + jzN(cw2 / 2) : 'C0-' + jzN(cw2 / 2)) + ';' + P2('a', 'CY'));
                    jzSetExpr(rc.property('ADBE Vector Rect Size'), rh + 'var hq=' + (tall ? 'PH*(1+KP*sa)' : 'hmn') + '*1.16;' + P2(jzN(cw2), 'hq'));
                }
                jzAddFill(gc, covC); ld1_gOp(gc, rh + '100*oc(time/0.3)*K');
            }
            for (j = 0; j < cnt; j++) {
                var par = (j + st0) % 2, dirW = par === 0 ? 1 : -1, col = par === 0 ? lit : dim;   // par 0: tall edge on the left
                var g = jzGrp(S, 'panel ' + (r + 1) + '.' + (j + 1)), ph2 = rh + 'var a0=C0+' + j + '*pw,a1=a0+pw,xt=' + (par === 0 ? 'a0' : 'a1') + ';';
                var gcr = ld1_sub(g, 'crease'), rcr = ld1_rr(gcr, 1, 1, 0);
                jzSetExpr(rcr.property('ADBE Vector Rect Position'), ph2 + P2('a0', 'CY'));
                jzSetExpr(rcr.property('ADBE Vector Rect Size'), ph2 + P2(jzN(lw), (par === 0 ? 'hmn+2*dd' : 'hmn')));
                jzAddFill(gcr, jzMixHex(col, DK, 0.4));
                for (var w2 = 0; w2 < 2; w2++) {
                    var gw = ld1_sub(g, w2 ? 'wedge bottom' : 'wedge top');
                    jzAddPath(gw, vert ? [[0, 0], [0, 100], [(w2 ? 100 : -100), 0]] : [[0, 0], [100, 0], [0, (w2 ? 100 : -100)]], true);
                    ld1_gPos(gw, ph2 + 'var b=CY' + (w2 ? '+' : '-') + 'hmn/2;' + P2('xt', 'b'));
                    ld1_gSc(gw, ph2 + P2(dirW + '*pw', 'dd+0.5'));
                }
                var rp = ld1_rr(g, 1, 1, 0);
                jzSetExpr(rp.property('ADBE Vector Rect Position'), ph2 + P2('(a0+a1)/2', 'CY'));
                jzSetExpr(rp.property('ADBE Vector Rect Size'), ph2 + P2('pw+0.6', 'hmn+1'));
                jzAddFill(g, col);
                ld1_gOp(g, ph2 + '100*cl((time-' + jzN(j * 0.03) + ')/0.2)*K');
                if (row[j] !== ' ') { gl.push(row[j]); GJ.push(j); GC.push(cnt); GY.push(cy); }
            }
            // shadow under the strip
            var gs = jzGrp(S, 'shadow ' + (r + 1)), rs = ld1_rr(gs, 1, 1, 0);
            jzSetExpr(rs.property('ADBE Vector Rect Position'), rh + P2(jzN(AL + Ph * 0.06), 'CY+PH*(1+KP*sa)/2+' + jzN(Ph * 0.045)));
            jzSetExpr(rs.property('ADBE Vector Rect Size'), rh + P2('CNT*pw', jzN(Ph * 0.05)));
            jzAddFill(gs, DK); ld1_gOp(gs, rh + '30*K');
        }
        // the lyric: one glyph layer, glyph j sits on the middle of panel j, squashed along the strip by cos(fold)
        var size = Math.min(Pw * 0.66, Ph * 0.62);
        var G = ld1_G(ctx, gl, { font: font, size: size, color: tc, name: jzFlat(c.text), cx: W / 2, cy: H / 2 });
        ld1_GX(ctx, G, 'JZ Panel', HD + 'var GJ=' + ld1_arr(GJ) + ',GC=' + ld1_arr(GC) + ',GY=' + ld1_arr(GY) + ';',
            'var al2=' + jzN(AL) + '+(GJ[i]-GC[i]/2+0.5)*pw;' + (vert ? 'x=GY[i];y=al2;sy=ca' : 'x=al2;y=GY[i];sx=ca') + ';a=cl((time-GJ[i]*0.03)/0.06)', 'psa');
        ld1_anim(ctx, G.L, { mi: ld1_mi(ctx, 0.12), noHold: ld1_plateHold(ctx) });
        var tw = per * Pw * cA, th = (rows - 1) * Ph * 1.3 + Ph;
        return vert ? ld1_box(W / 2 - th / 2, H / 2 - tw / 2, W / 2 + th / 2, H / 2 + tw / 2) : ld1_box(W / 2 - tw / 2, H / 2 - th / 2, W / 2 + tw / 2, H / 2 + th / 2);
    }
});

/* ================================================================== 5 flag — はためく旗 */
// the cloth is sampled in the expressions (N strips); every strip is two triangles of one union fill
var LD1_FLAG_N = 12;
ld1_reg('flag', {
    plan: function (rng, cut, st) {
        return {
            font: rng.pick(jzFontsOf(st, ['display', 'serif'])), mode: rng.pick(['unfurl', 'unfurl', 'raise']), cloth: rng.pick(['accent', 'ink', 'accent']), trim: rng.pick(['none', 'bands', 'edge']),
            tail: rng.pick(['rect', 'rect', 'swallow']), wind: rng.range(0.7, 1.15), side: rng.pick([1, 1, -1])
        };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, u = jzU(ctx), port = jzPortrait(ctx), i, q;
        var side = jzP(ctx, 'side', 1) < 0 ? -1 : 1, t0 = jzFlat(c.text), n = jzCount(t0);
        if (!n) return null;
        var font = jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'display')), mode = jzP(ctx, 'mode', 'unfurl'), trim = jzP(ctx, 'trim', 'none'), sw = jzP(ctx, 'tail', 'rect') === 'swallow', wind = jzP(ctx, 'wind', 0.9);
        var text = ld1_brk(t0, port ? 5 : n <= 5 ? 5 : Math.max(4, Math.ceil(n / 2)));
        var Wf = W * (port ? 0.78 : 0.62), Hf = Math.min(H * (port ? 0.34 : 0.52), Wf * 0.64), poleX = side > 0 ? W / 2 - Wf / 2 - W * 0.03 : W / 2 + Wf / 2 + W * 0.03;
        var col = ld1_plateCol(sc, jzP(ctx, 'cloth', 'accent') === 'ink' ? [sc.ink, sc.accent] : [sc.accent, sc.ink]), tc = ld1_onCol(sc, col);
        var trimC = jzContrast(sc.fg, col) > 1.5 ? (col === sc.accent ? ld1_onCol(sc, col) : sc.accent) : sc.accent;
        var N = LD1_FLAG_N, mot = ld1_mot(ctx), un = mode === 'unfurl' ? 1 : 0, ra = mode === 'raise' ? 1 : 0;
        var HD = ld1_H(ctx) + 'var WF=' + jzN(Wf) + ',HF=' + jzN(Hf) + ',PX=' + jzN(poleX) + ',SI=' + side + ',NN=' + N + ',OM=' + jzN(3.2 * wind) + ';' +
            'var unf=' + (un ? 'oc(cl((time-0.05)/0.75))' : '1') + ',rai=' + (ra ? 'oc(cl(time/0.8))' : '1') + ',low=' + (ra ? 'ic(PO)' : '0') + ',furl=' + (un ? 'ic(PO)' : '0') + ';' +
            'var Y0=' + jzN(H / 2 - Hf / 2 - H * 0.03) + '+(1-rai)*' + jzN(H * 0.55) + '+low*' + jzN(H * 0.6) + ',ext=Math.max(0.001,unf*(1-furl));' +
            'var AMP=HF*0.1*' + jzN(wind * (0.5 + 0.7 * mot)) + '*(1+(1-unf)*1.2),DZ=WF*1.3;' +
            'function zf(x){return AMP*Math.pow(Math.max(0,x),0.85)*Math.sin(2*Math.PI*1.05*x-OM*time)+AMP*0.35*x*Math.sin(2*Math.PI*1.3*x-OM*0.7*time+1.3);}' +
            'function samp(){var S=[],xa=0;for(var q=0;q<=NN;q++){var uu=q/NN*ext,z=zf(uu),dz=(zf(uu+0.01)-zf(uu-0.01))/0.02/WF;if(q>0)xa+=(WF*ext/NN)/Math.sqrt(1+dz*dz);' +
            'var hs=1+z/DZ,dr=uu*uu*HF*0.05-z*0.12;S.push([PX+SI*xa,Y0+dr-(hs-1)*HF/2,Y0+dr+HF*hs-(hs-1)*HF/2,dz,hs]);}return S;}' +
            'function at(S,uu){var f=cl(uu/ext)*NN,k=Math.min(NN-1,Math.floor(f)),t=f-k,a=S[k],b=S[k+1];return [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t,a[3]+(b[3]-a[3])*t,a[4]+(b[4]-a[4])*t];}' +
            'function vy(p,v){return p[1]+(p[2]-p[1])*v;}\nvar S=samp();';
        var pa = ra ? 'oc(time/0.3)*(1-ic((PO-0.5)/0.5))' : 'oc(time/0.3)*K', show = '(unf*K>0.001&&Y0<' + jzN(H * 1.2) + '?100:0)';
        // pole + finial (behind the cloth)
        var pw = Math.max(3 * ctx.u, u * 0.011), ptop = H / 2 - Hf / 2 - H * 0.03 - Hf * 0.3;
        var PL = jzShapeLayer(ctx, 'flag pole', 0, 0), gp = jzGrp(PL, 'finial'); jzAddEllipse(gp, pw * 3, pw * 3, poleX, ptop); jzAddFill(gp, sc.accent);
        var gp2 = jzGrp(PL, 'pole'); ld1_rr(gp2, pw, H * 1.2, 0, poleX, ptop + H * 0.6); jzAddFill(gp2, sc.sub);
        ld1_opx(ctx, PL, pa);
        // cloth, trims, fold shading
        var CS = jzShapeLayer(ctx, 'flag cloth', 0, 0), qn = sw ? N - 2 : N;
        function band(name, v0, v1, colr, q0, q1) {
            var g = jzGrp(CS, name);
            for (var qq = q0; qq < q1; qq++) ld1_quad(g, 'strip ' + (qq + 1), HD, 'var a=S[' + qq + '],b=S[' + (qq + 1) + '];var Q=[a[0],vy(a,' + v0 + '),b[0],vy(b,' + v0 + '),b[0],vy(b,' + v1 + '),a[0],vy(a,' + v1 + ')]');
            if (colr) jzAddFill(g, colr);
            return g;
        }
        if (trim === 'edge') { var ge = band('edge trim', -0.01, 1.01, trimC, 0, 1); }
        if (trim === 'bands') { band('band top', 0.08, 0.15, trimC, 0, N); band('band bottom', 0.85, 0.92, trimC, 0, N); }
        var gsh = jzGrp(CS, 'folds');
        for (q = 0; q < qn; q++) {
            var gq = ld1_sub(gsh, 'fold ' + (q + 1)), vv = 'var v=Math.max(-0.4,Math.min(0.2,-(S[' + q + '][3]+S[' + (q + 1) + '][3])/2*SI*0.9));';
            ld1_quad(gq, 'q', HD, 'var a=S[' + q + '],b=S[' + (q + 1) + '];var Q=[a[0],a[1],b[0],b[1],b[0],b[2],a[0],a[2]]');
            var ff = jzAddFill(gq, ld1_dark(sc));
            jzSetExpr(ff.property('ADBE Vector Fill Color'), HD + vv + 'v<0?' + ld1_col(ld1_dark(sc)) + ':' + ld1_col(ld1_light(sc)));
            ld1_gOp(gq, HD + vv + 'Math.abs(v)<0.02?0:Math.abs(v)*80');
        }
        var gcl = band('cloth', 0, 1, null, 0, qn);
        if (sw) {       // swallowtail: fan of triangles round the notch point
            var nb = 'var p10=S[' + (N - 2) + '],p11=S[' + (N - 1) + '],p12=S[' + N + '],mx=p10[0]+(p11[0]-p10[0])*0.32,my=(vy(p10,0.5)+vy(p11,0.5))/2;';
            ld1_tri(gcl, 'fork 1', HD, nb + 'var T=[mx,my,p10[0],p10[1],p10[0],p10[2]]');
            ld1_tri(gcl, 'fork 2', HD, nb + 'var T=[mx,my,p10[0],p10[1],p11[0],p11[1]]');
            ld1_tri(gcl, 'fork 3', HD, nb + 'var T=[mx,my,p11[0],p11[1],p12[0],p12[1]]');
            ld1_tri(gcl, 'fork 4', HD, nb + 'var T=[mx,my,p10[0],p10[2],p11[0],p11[2]]');
            ld1_tri(gcl, 'fork 5', HD, nb + 'var T=[mx,my,p11[0],p11[2],p12[0],p12[2]]');
        }
        jzAddFill(gcl, col);
        jzSetExpr(jzXf(CS, 'ADBE Opacity'), HD + show + '*K');
        // rope rings
        var RS = jzShapeLayer(ctx, 'flag rings', 0, 0);
        for (i = 0; i < 2; i++) {
            var gr = jzGrp(RS, 'ring ' + (i + 1)); jzAddEllipse(gr, pw * 1.8, pw * 1.8); jzAddStroke(gr, sc.sub, Math.max(1 * ctx.u, pw * 0.3));
            ld1_gPos(gr, HD + '[' + jzN(poleX + side * pw * 0.2) + ',Y0' + (i ? '+HF-' : '+') + jzN(Hf * 0.04) + ']');
        }
        jzSetExpr(jzXf(RS, 'ADBE Opacity'), HD + show + '*K');
        // the lyric printed on the cloth
        var size = Math.min(ld1_fit(text, Wf * (sw ? 0.66 : 0.78), Hf * (trim === 'bands' ? 0.58 : 0.68), 0.04, 1.15), Hf * 0.42);
        var lay = ld1_layout(text, size, 0.04, 1.15), gl = [], UU = [], VV = [], uC = (sw ? 0.46 : 0.52) + (trim === 'edge' ? 0.03 : 0);
        for (i = 0; i < lay.length; i++) { if (lay[i].sp) continue; gl.push(lay[i].ch); UU.push(uC + side * lay[i].x / Wf); VV.push(0.5 + lay[i].y / Hf); }
        var G = ld1_G(ctx, gl, { font: font, size: size, color: tc, name: t0, cx: W / 2, cy: H / 2 });
        ld1_GX(ctx, G, 'JZ Cloth', HD + 'var UU=' + ld1_arr(UU) + ',VV=' + ld1_arr(VV) + ';',
            'var uu=UU[i],p=at(S,uu),pa=at(S,uu+0.01),pb=at(S,uu-0.01);x=p[0];y=vy(p,VV[i]);' +
            'var sl=((pa[1]+pa[2])-(pb[1]+pb[2]))/2/(Math.abs(pa[0]-pb[0])+0.001);r=Math.atan(sl*SI)*180/Math.PI;sx=1/Math.sqrt(1+p[3]*p[3]);sy=p[4];a=uu>ext?0:1', 'prsa');
        ld1_anim(ctx, G.L, { mi: ld1_mi(ctx, 0.1), noHold: ld1_plateHold(ctx) });
        var x0 = Math.min(poleX, poleX + side * Wf), y0 = H / 2 - Hf / 2 - H * 0.03;
        return ld1_box(x0, y0, x0 + Wf, y0 + Hf);
    }
});

/* ================================================================== 6 ribbon — リボン */
// the band is sampled along its arc length in the expressions; segments = quads (two triangles) in one union fill per side
ld1_reg('ribbon', {
    plan: function (rng, cut, st) {
        return {
            font: rng.pick(jzFontsOf(st, ['display', 'serif'])), amp: rng.range(0.05, 0.1), freq: rng.range(0.55, 0.9), ph: rng.range(0, 6), col: rng.pick(['accent', 'accent', 'ink']),
            reveal: rng.pick(['center', 'left']), tilt: rng.range(-6, 6)
        };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, u = jzU(ctx), port = jzPortrait(ctx), i, j, q;
        var t0 = jzFlat(c.text), n = jzCount(t0);
        if (!n) return null;
        var font = jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'display')), left = jzP(ctx, 'reveal', 'center') === 'left';
        var rowsT = n > (port ? 6 : 10) ? ld1_chunksK(t0, n > 12 && port ? 3 : 2) : [t0], nR = rowsT.length;
        var pc = ld1_plateCol(sc, jzP(ctx, 'col', 'accent') === 'ink' ? [sc.ink, sc.accent] : [sc.accent, sc.ink]), back = ld1_shade(sc, pc, -0.42), tc = ld1_onCol(sc, pc);
        var x0 = W * 0.09, x1 = W * 0.91, LL = x1 - x0, size = u * 0.16, DK = ld1_dark(sc);
        for (i = 0; i < nR; i++) size = Math.min(size, LL * 0.58 / Math.max(1, ld1_lineW(rowsT[i], 0) * 1.05));
        size = Math.min(size, H * 0.62 / (nR * 2.3));
        var bw = size * 0.72, mot = ld1_mot(ctx);
        // f breakpoints: the twist crosses zero at f = 0.085 / 0.915 (so no segment straddles the flip)
        var FB = [0, 0.04, 0.085], NF = 16;
        for (i = 1; i <= NF; i++) FB.push(0.085 + (0.83 * i) / NF);
        FB.push(0.96, 1);
        var HD0 = ld1_H(ctx) + 'var X0=' + jzN(x0) + ',LL=' + jzN(LL) + ',BW=' + jzN(bw) + ',FR=' + jzN(jzP(ctx, 'freq', 0.7)) + ';' +
            'function tau(f){var d=Math.abs(f-0.5);return d<0.33?1:Math.cos(Math.PI*(d-0.33)/0.17);}' +
            'function tab(){var X=[],Y=[],A=[0];for(var q=0;q<=48;q++){var x=X0+LL*q/48;X.push(x);Y.push(pth(x));if(q)A.push(A[q-1]+Math.sqrt((X[q]-X[q-1])*(X[q]-X[q-1])+(Y[q]-Y[q-1])*(Y[q]-Y[q-1])));}return [X,Y,A];}' +
            'function atS(T,s){var X=T[0],Y=T[1],A=T[2];s=Math.max(0,Math.min(A[48],s));var lo=0,hi=48;while(hi-lo>1){var m=Math.floor((lo+hi)/2);if(A[m]<=s)lo=m;else hi=m;}' +
            'var f=(s-A[lo])/Math.max(1e-6,A[hi]-A[lo]);return [X[lo]+(X[hi]-X[lo])*f,Y[lo]+(Y[hi]-Y[lo])*f,Math.atan2(Y[hi]-Y[lo],X[hi]-X[lo])];}' +
            'function edge(T,f,sg){var p=atS(T,f*T[2][48]),t=tau(f)*sg*BW;return [p[0]-Math.sin(p[2])*t,p[1]+Math.cos(p[2])*t];}';
        function rowHead(ri) {
            var cy = H / 2 + (ri - (nR - 1) / 2) * size * 2.35, tl = Math.tan(jzP(ctx, 'tilt', 0) * Math.PI / 180) * (ri % 2 ? -1 : 1);
            return HD0 + 'var CYr=' + jzN(cy) + ',AMP=' + jzN(H * jzP(ctx, 'amp', 0.07) * (nR > 1 ? 0.55 : 1)) + '*(1+0.12*Math.sin(time*1.1+' + ri + ')),PHS=' + jzN(jzP(ctx, 'ph', 0) + ri * 2.1) + '+time*' + jzN(0.9 * mot * 0.6) + ';' +
                'var pth=function(x){return CYr+AMP*Math.sin(2*Math.PI*FR*(x-X0)/LL+PHS)+(x-' + jzN(W / 2) + ')*' + jzN(tl) + ';};' +
                'var e=iocu((time-' + jzN(ri * 0.12) + ')/0.75)*(1-ic(PO)),w0=' + (left ? '0' : '0.5-e/2') + ',w1=' + (left ? 'e' : '0.5+e/2') + ';var TB=tab();\n';
        }
        var RS = jzShapeLayer(ctx, 'ribbon', 0, 0), shadeG = [], tailsG = [];
        var gl = [], OF = [], RI = [], TS = [];
        for (var ri = 0; ri < nR; ri++) {
            var HD = rowHead(ri);
            jzGrp(RS, 'front ' + (ri + 1)); jzGrp(RS, 'back ' + (ri + 1)); jzGrp(RS, 'twist shade ' + (ri + 1));
            // fetch the three groups after all were added (each addition invalidates the older sibling references in AE)
            var gF = ld1_rg(RS, 'front ' + (ri + 1)), gB = ld1_rg(RS, 'back ' + (ri + 1)), gT = ld1_rg(RS, 'twist shade ' + (ri + 1));
            for (q = 0; q < FB.length - 1; q++) {
                var fa = FB[q], fb = FB[q + 1], fm = (fa + fb) / 2, dm = Math.abs(fm - 0.5), tm = dm < 0.33 ? 1 : Math.cos(Math.PI * (dm - 0.33) / 0.17);
                var body = 'var fa=Math.max(' + jzN(fa) + ',w0),fb=Math.min(' + jzN(fb) + ',w1);if(fb<fa)fb=fa;var A1=edge(TB,fa,1),B1=edge(TB,fb,1),B2=edge(TB,fb,-1),A2=edge(TB,fa,-1);var Q=[A1[0],A1[1],B1[0],B1[1],B2[0],B2[1],A2[0],A2[1]]';
                ld1_quad(tm >= 0 ? gF : gB, 'seg ' + (q + 1), HD, body);
                if (Math.abs(tm) < 0.97) { var gs = ld1_sub(gT, 'shade ' + (q + 1)); ld1_quad(gs, 'q', HD, body); jzAddFill(gs, DK); ld1_gOp(gs, jzN((1 - Math.abs(tm)) * 40)); }
            }
            jzAddFill(gF, pc); jzAddFill(gB, back);
            // notched tails
            var gt = jzGrp(RS, 'tails ' + (ri + 1));
            for (var en = 0; en < 2; en++) {
                var fE = en ? 1 : 0, dn = en ? -1 : 1;
                var tb = 'var p=atS(TB,' + fE + '*TB[2][48]),a=edge(TB,' + fE + ',1),b=edge(TB,' + fE + ',-1),ex=-Math.cos(p[2])*BW*1.3*' + dn + ',ey=-Math.sin(p[2])*BW*1.3*' + dn + ',k=(' + fE + '>=w0&&' + fE + '<=w1)?1:0;' +
                    'ex*=k;ey*=k;var ax=a[0],ay=a[1],bx=b[0],by=b[1];if(!k){ax=bx=p[0];ay=by=p[1];}';
                ld1_tri(gt, 'tail ' + (en + 1) + 'a', HD, tb + 'var T=[ax,ay,ax+ex,ay+ey,p[0]+ex*0.45,p[1]+ey*0.45]');
                ld1_tri(gt, 'tail ' + (en + 1) + 'b', HD, tb + 'var T=[ax,ay,p[0]+ex*0.45,p[1]+ey*0.45,bx,by]');
                ld1_tri(gt, 'tail ' + (en + 1) + 'c', HD, tb + 'var T=[bx,by,p[0]+ex*0.45,p[1]+ey*0.45,bx+ex,by+ey]');
            }
            jzAddFill(gt, ld1_shade(sc, back, -0.12));
            // lyric glyphs along the flat middle (arc-length offsets from the centre)
            var row = ld1_row(jzChars(rowsT[ri]), size, 1.05, 0);
            for (j = 0; j < row.length; j++) { if (row[j].ch === ' ') continue; gl.push(row[j].ch); OF.push(row[j].x); RI.push(ri); }
        }
        // shadow: a copy of the band, dark and offset
        var SH = null;
        try { SH = RS.duplicate(); } catch (eD) { SH = null; }
        if (SH) {
            SH.name = 'ribbon shadow'; SH.moveAfter(RS);
            var sh = size * 0.1;
            jzXf(SH, 'ADBE Position').setValue([sh, sh * 1.4]);
            var rv = SH.property('ADBE Root Vectors Group');
            for (i = rv.numProperties; i >= 1; i--) { var nm = rv.property(i).name; if (/^(twist|tails)/.test(nm)) rv.property(i).remove(); }
            for (i = 1; i <= rv.numProperties; i++) {
                var cg = rv.property(i).property('ADBE Vectors Group');
                for (j = 1; j <= cg.numProperties; j++) if (cg.property(j).matchName === 'ADBE Vector Graphic - Fill') cg.property(j).property('ADBE Vector Fill Color').setValue(jzHex(DK));
            }
            jzXf(SH, 'ADBE Opacity').setValue(22);
        }
        // one glyph layer for all rows: each glyph finds its row's curve (same maths per row)
        var hd = ld1_H(ctx) + 'var RI=' + ld1_arr(RI) + ',OF=' + ld1_arr(OF) + ';', rb = '';
        for (ri = 0; ri < nR; ri++) rb += (ri ? 'else ' : '') + 'if(RI[i]===' + ri + '){' + rowHead(ri).replace(ld1_H(ctx), '').replace(/\n/g, '') + 'R=[TB,w0,w1];}';
        var G = ld1_G(ctx, gl, { font: font, size: size, color: tc, name: t0, cx: W / 2, cy: H / 2 });
        ld1_GX(ctx, G, 'JZ Ribbon', hd, 'var R=null;' + rb + 'var TB=R[0],s=TB[2][48]/2+OF[i],f=s/TB[2][48],p=atS(TB,s);x=p[0];y=p[1];r=p[2]*180/Math.PI;sy=tau(f);a=(f>=R[1]&&f<=R[2])?1:0', 'prsa');
        ld1_anim(ctx, G.L, { mi: 0, noHold: ld1_plateHold(ctx) });
        var hH = (nR - 1) * size * 2.35 / 2 + H * jzP(ctx, 'amp', 0.07) + bw;
        return ld1_box(x0, H / 2 - hH, x1, H / 2 + hH);
    }
});

/* ================================================================== 7 pendulum — 振り子 */
// a line segment as a thin rect (rotated group): body defines X0, Y0, X1, Y1 (comp px)
function ld1_seg(parent, name, head, body, lw) {
    var g = ld1_sub(parent, name), r = jzAddRect(g, 100, lw, 0, 50, 0), pre = head + body + ';var DX=X1-X0,DY=Y1-Y0,LN=Math.sqrt(DX*DX+DY*DY);';
    ld1_gPos(g, pre + '[X0,Y0]'); ld1_gRot(g, pre + 'Math.atan2(DY,DX)*180/Math.PI');
    jzSetExpr(r.property('ADBE Vector Rect Size'), pre + '[Math.max(0.01,LN),' + jzN(lw) + ']');
    jzSetExpr(r.property('ADBE Vector Rect Position'), pre + '[Math.max(0.01,LN)/2,0]');
    return g;
}
ld1_reg('pendulum', {
    plan: function (rng, cut, st) {
        var n = cut.n, port = cut.H > cut.W * 1.08, spaced = /\s/.test(jzTrim(String(cut.text))), opts = [];
        if (n <= (port ? 5 : 8) && !spaced) opts.push('cradle', 'cradle');
        if (n <= 12 && !spaced) opts.push('fan', port ? 'fan' : 'chunks');
        if (n >= 4) opts.push('chunks');
        var mode = rng.pick(opts.length ? opts : ['chunks']);
        return { mode: mode, chunks: ld1_chunksK(cut.text, jzClamp(Math.ceil(n / 4), 2, 4)), font: rng.pick(jzFontsOf(st, ['display', 'serif'])), period: rng.range(1.05, 1.4), amp: rng.range(22, 30), phase: rng.range(0, 6), side: rng.pick([1, -1]) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, u = jzU(ctx), port = jzPortrait(ctx), i, q;
        var all = jzChars(jzFlat(c.text)), chs = [];
        for (i = 0; i < all.length; i++) if (all[i] !== ' ') chs.push(all[i]);
        var n = chs.length;
        if (!n) return null;
        var font = jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'display')), mode = jzP(ctx, 'mode', 'fan'), mot = ld1_mot(ctx), period = jzP(ctx, 'period', 1.2), side = jzP(ctx, 'side', 1) < 0 ? -1 : 1;
        if (mode === 'cradle' && n > (port ? 6 : 9)) mode = 'fan';
        if (mode === 'fan' && n > 13) mode = 'chunks';
        var lw = Math.max(1 * ctx.u, u * 0.0015), pc = ld1_plateCol(sc, [sc.ink, sc.fg]), tc = ld1_onCol(sc, pc), DK = ld1_dark(sc);
        var TH = ld1_H(ctx), fa = 'oc(time/0.45)*K', bb = null;
        if (mode === 'cradle') {
            var r = Math.min(W * 0.84 / (n * 2.02 + 1.2), H * 0.13, u * 0.12), L = Math.min(H * 0.42, r * 5.2), cx = W / 2, x0 = cx - (n - 1) * r;
            var py = H / 2 - L * 0.62, by = py + L, fw = (n - 1) * r + r * 2.6, fb = by + r + H * 0.06;
            var FR = jzShapeLayer(ctx, 'cradle frame', 0, 0), gf = jzGrp(FR, 'frame');
            jzAddPath(gf, [[cx - fw, fb], [cx - fw, py], [cx + fw, py], [cx + fw, fb]], false); jzAddStroke(gf, sc.sub, Math.max(2 * ctx.u, u * 0.006));
            var gbs = jzGrp(FR, 'base'); ld1_rr(gbs, fw * 2 + r * 1.4, r * 0.28, r * 0.1, cx, fb + r * 0.14); jzAddFill(gbs, sc.sub);
            ld1_opx(ctx, FR, fa);
            var A = jzP(ctx, 'amp', 26) * (0.6 + 0.5 * mot), w = Math.PI * 2 / period;
            var CH = TH + 'var W2=' + jzN(w) + ',AA=' + jzN(A) + '*Math.PI/180,LL=' + jzN(L) + ',PY=' + jzN(py) + ';var tau=time-0.75,sA=tau>0?-Math.cos(W2*tau):-1,lift=tau>0?1:iocu((time-0.25)/0.45),dec=1-0.25*cl(tau/6);' +
                'function th(i){if(' + n + '===1)return AA*dec*sA*lift;if(i===0)return AA*dec*Math.min(0,sA)*(tau>0?1:lift);if(i===' + (n - 1) + ')return AA*dec*Math.max(0,sA);return 0;}' +
                'function drp(i){return ob(cl((time-i*0.05)/0.35),1.4);}';
            var SL = jzShapeLayer(ctx, 'cradle strings', 0, 0), d = r * 0.85, gst = jzGrp(SL, 'strings');
            for (i = 0; i < n; i++) {
                var px = x0 + i * r * 2, bE = 'var t_=th(' + i + '),Lc=LL*drp(' + i + ');var X1=' + jzN(px) + '+Math.sin(t_)*Lc,Y1=PY+Math.cos(t_)*Lc;';
                ld1_seg(gst, 'string ' + (i + 1) + 'a', CH, bE + 'var X0=' + jzN(px - d) + ',Y0=PY', lw);
                ld1_seg(gst, 'string ' + (i + 1) + 'b', CH, bE + 'var X0=' + jzN(px + d) + ',Y0=PY', lw);
            }
            jzAddFill(gst, sc.sub);
            // impact sparks on the end balls
            if (n > 1) {
                for (var en = 0; en < 2; en++) {
                    var ie = en ? n - 1 : 0, sxp = x0 + ie * r * 2 + (en ? -r : r), dr = en ? -1 : 1, gk = jzGrp(SL, 'sparks ' + (en + 1));
                    for (q = -1; q <= 1; q++) { jzAddPath(gk, [[sxp + dr * r * 0.2, by + q * r * 0.5], [sxp + dr * r * 0.55, by + q * r * 0.9]], false); }
                    jzAddStroke(gk, sc.accent, Math.max(1.5 * ctx.u, r * 0.05));
                    ld1_gOp(gk, CH + 'var ph=((W2*tau)/Math.PI)%2,nr=Math.min(Math.abs(ph-0.5),Math.abs(ph-1.5));(tau>0&&nr<0.08&&' + (en ? '!' : '') + '(Math.abs(ph-0.5)<0.08))?100*(1-nr/0.08):0');
                }
            }
            ld1_opx(ctx, SL, '0.9*K');
            for (i = 0; i < n; i++) {
                var px2 = x0 + i * r * 2, B = jzShapeLayer(ctx, 'ball ' + (i + 1), px2, py);
                jzXf(B, 'ADBE Anchor Point').setValue([px2, py]);
                var gh = jzGrp(B, 'gloss'); jzAddEllipse(gh, r * 0.4, r * 0.4, px2 - r * 0.35, by - r * 0.38); jzAddFill(gh, ld1_light(sc)); ld1_gOp(gh, '35');
                var gb = jzGrp(B, 'ball'); jzAddEllipse(gb, r * 1.97, r * 1.97, px2, by); jzAddStroke(gb, jzMixHex(pc, DK, 0.4), lw); jzAddFill(gb, pc);
                jzSetExpr(jzXf(B, 'ADBE Rotate Z'), CH + '-th(' + i + ')*180/Math.PI');
                jzSetExpr(jzXf(B, 'ADBE Position'), CH + '[value[0],value[1]-LL*(1-drp(' + i + '))]');
                jzSetExpr(jzXf(B, 'ADBE Opacity'), CH + '(drp(' + i + ')<=0?0:100)*K');
                var T = ld1_T(ctx, chs[i], { font: font, size: r * 1.08, color: tc, x: px2, y: by, name: chs[i] });
                ld1_parent(T, B);
                ld1_anim(ctx, T, { mi: ld1_mi(ctx, 0.15 + i * 0.05), noHold: ld1_plateHold(ctx) });
                bb = jzUnion(bb, ld1_box(px2 - r, by - r, px2 + r, by + r));
            }
            return bb;
        }
        // single pivot: pendulums of different length (a pendulum wave)
        var items = [], k, cks = jzP(ctx, 'chunks', null);
        if (mode === 'fan') for (i = 0; i < n; i++) items.push(chs[i]);
        else { if (!cks || !cks.length) cks = ld1_chunksK(c.text, 3); for (i = 0; i < cks.length; i++) items.push(jzFlat(cks[i])); }
        k = items.length;
        var pX = W / 2, pY = H * 0.06, size, step, L0, plateW = [];
        if (mode === 'fan') { step = Math.min(H * 0.84 / (k + 1.2), W * 0.2); size = step * 0.84; L0 = step * 1.4; }
        else {
            var wMax = W * (port ? 0.8 : 0.56); size = u * 0.14;
            for (i = 0; i < k; i++) size = Math.min(size, ld1_fit(items[i], wMax, H * 0.8 / (k + 1) * 0.62, 0.03, 1.2));
            step = size * 1.75; L0 = Math.max(H * 0.9 - step * k, size * 2);
            for (i = 0; i < k; i++) plateW.push(ld1_lineW(items[i], 0.03) * size + size * 0.8);
        }
        var Lmax = L0 + step * (k - 1), A2 = (mode === 'fan' ? 7 : 5) * (0.5 + 0.7 * mot);
        var PV = jzShapeLayer(ctx, 'pivot', 0, 0), gv = jzGrp(PV, 'pin'); var rp = Math.max(3 * ctx.u, u * 0.008); jzAddEllipse(gv, rp * 2, rp * 2, pX, pY); jzAddFill(gv, sc.accent);
        var gbar = jzGrp(PV, 'bar'), bh = Math.max(3 * ctx.u, u * 0.005); ld1_rr(gbar, u * 0.12, bh, 0, pX, pY - Math.max(2 * ctx.u, u * 0.003) + bh / 2); jzAddFill(gbar, sc.sub);
        ld1_gSc(gbar, TH + '[value[0]*oc(time/0.45),value[1]]');
        ld1_opx(ctx, PV, fa);
        var arms = [];
        for (i = 0; i < k; i++) {
            var Li = L0 + step * i, Ti = period * 1.6 * Math.sqrt(Li / Lmax), col = i % 2 && jzContrast(sc.accent, sc.bg) > 1.6 ? sc.accent : pc;
            var AH = TH + 'var gr=oc((time-' + jzN(i * 0.04) + ')/0.4),LI=' + jzN(Li) + ';var th=' + jzN(A2 * side) + '*Math.cos(2*Math.PI*Math.max(0,time-0.2)/' + jzN(Ti) + ')*iocu((time-0.1)/0.6)+ic(PO)*30*' + jzN(side * (0.5 + i / k)) + ';';
            var AR = jzShapeLayer(ctx, 'pendulum ' + (i + 1), pX, pY);
            jzXf(AR, 'ADBE Anchor Point').setValue([pX, pY]);
            var off = mode === 'fan' ? size * 0.55 : size * 0.62;
            // bob
            var gB = jzGrp(AR, 'bob');
            if (mode === 'fan') jzAddEllipse(gB, size * 1.24, size * 1.24);
            else {
                var gHo = ld1_sub(gB, 'hole'), h2 = size * 1.24; jzAddEllipse(gHo, Math.max(4 * ctx.u, size * 0.12), Math.max(4 * ctx.u, size * 0.12), 0, -h2 / 2 + h2 * 0.12); jzAddFill(gHo, sc.bg);
                var gPl = ld1_sub(gB, 'plate'); ld1_rr(gPl, plateW[i], h2, h2 * 0.14); jzAddFill(gPl, col);
            }
            if (mode === 'fan') jzAddFill(gB, col);
            ld1_gPos(gB, AH + '[' + jzN(pX) + ',' + jzN(pY) + '+LI*gr]');
            // string (behind the bob)
            var gS = jzGrp(AR, 'string'), rS = jzAddRect(gS, lw, 10, 0);
            jzSetExpr(rS.property('ADBE Vector Rect Size'), AH + '[' + jzN(lw) + ',Math.max(0.01,LI*gr-' + jzN(off) + ')]');
            jzSetExpr(rS.property('ADBE Vector Rect Position'), AH + '[' + jzN(pX) + ',' + jzN(pY) + '+Math.max(0.01,LI*gr-' + jzN(off) + ')/2]');
            jzAddFill(gS, sc.sub); ld1_gOp(gS, '75');
            jzSetExpr(jzXf(AR, 'ADBE Rotate Z'), AH + '-th');
            jzSetExpr(jzXf(AR, 'ADBE Opacity'), AH + '(gr<=0?0:100)*K');
            arms.push({ L: AR, y: pY + Li, col: col, Li: Li, AH: AH });
        }
        // bobs in front of every string: move the string groups of all arms under the first arm layer
        for (i = 0; i < k; i++) {
            var it = arms[i], T2 = ld1_T(ctx, items[i], { font: font, size: mode === 'fan' ? size * 0.78 : size, color: ld1_onCol(sc, it.col), x: pX, y: it.y + (mode === 'fan' ? 0 : size * 0.06), track: 0.03, name: items[i] });
            ld1_parent(T2, it.L);
            jzAnimator(T2, 'JZ Grow', [['ADBE Text Position 3D', [0, -it.Li, 0]]], it.AH + '(1-gr)*100');
            ld1_anim(ctx, T2, { mi: ld1_mi(ctx, 0.12 + i * 0.05), noHold: ld1_plateHold(ctx) });
            var hw = mode === 'fan' ? size * 0.62 : plateW[i] / 2;
            bb = jzUnion(bb, ld1_box(pX - hw, it.y - size * 0.62, pX + hw, it.y + size * 0.62));
        }
        return bb;
    }
});

/* ================================================================== 8 pile — 文字の山 */
ld1_reg('pile', {
    plan: function (rng, cut, st) {
        return { font: rng.pick(jzFontsOf(st, ['display'])), hf: rng.pick(jzFontsOf(st, ['body', 'display', 'serif'])), peak: rng.range(-0.12, 0.12), hgt: rng.range(0.26, 0.34), order: rng.pick(['ltr', 'random', 'random']), dust: rng.chance(0.7) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, s = c.seed, u = jzU(ctx), port = jzPortrait(ctx), i, j, ri;
        var t0 = jzFlat(c.text), n = jzCount(t0);
        if (!n) return null;
        var font = jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'display')), hf = jzP(ctx, 'hf', jzBodyF(ctx));
        var rowsT = n > (port ? 5 : 8) ? ld1_chunksK(t0, port ? Math.ceil(n / 5) : 2) : [t0], nR = rowsT.length;
        var size = Math.min(u * 0.2, H * 0.5 / (nR + 0.6)), maxTot = 0;
        for (i = 0; i < nR; i++) size = Math.min(size, W * (port ? 0.86 : 0.74) / Math.max(1, ld1_lineW(rowsT[i], 0) * 1.02));
        for (i = 0; i < nR; i++) maxTot = Math.max(maxTot, ld1_lineW(rowsT[i], 0) * 1.02 * size);
        var cx = jzClamp(W * (0.5 + jzP(ctx, 'peak', 0) * (port ? 0.2 : 0.6)), W * 0.06 + maxTot / 2, W * 0.94 - maxTot / 2), sig = Math.max(W * 0.26, maxTot * 0.68);
        var yBase = H * 1.04, Hm = yBase - (H * (0.5 + jzP(ctx, 'hgt', 0.3) * 0.25) + nR * size * 0.49);
        function surf0(x) { return yBase - Hm / (1 + Math.pow((x - cx) / sig, 4)) + Math.sin(x / W * 17 + s % 7) * H * 0.006 + Math.sin(x / W * 31 + (s % 5)) * H * 0.004; }
        var TH = ld1_H(ctx) + 'var HM=' + jzN(Hm) + ';var rise=(1-oc(time/0.5))*HM*1.1+ic(PO)*HM*0.5;';
        // the mound + a heap of small glyphs in its top layers (both ride on "rise")
        var cell = jzClamp(u * 0.045, 16 * ctx.u, 60 * ctx.u), mound = [];
        for (i = 0; i <= 48; i++) { var x = -W * 0.02 + W * 1.04 * i / 48; mound.push([x, surf0(x) + cell * 1.2]); }
        mound.push([W * 1.02, H * 1.9], [-W * 0.02, H * 1.9]);
        var MS = jzShapeLayer(ctx, 'mound', 0, 0), gm = jzGrp(MS, 'mound'); jzAddPath(gm, mound, true); jzAddFill(gm, jzMixHex(sc.bg, sc.sub, 0.14));
        jzSetExpr(jzXf(MS, 'ADBE Position'), TH + '[value[0],value[1]+rise]'); ld1_opx(ctx, MS, 'K');
        var pool = [], own = jzChars(jzStrip((c.lineText || '') + c.text)), KA = jzChars(jzPool('hira'));
        for (i = 0; i < own.length; i++) if (!jzIsPunct(own[i]) && !jzIsLatin(own[i]) && 'ぁぃぅぇぉっゃゅょゎァィゥェォッャュョヮー'.indexOf(own[i]) < 0) pool.push(own[i]);
        for (i = 0; i < KA.length; i += 3) pool.push(KA[i]);
        var colsN = Math.ceil(W / cell) + 2, depth = Math.max(3, Math.min(5, Math.floor(200 / colsN))), hp = [], hch = [], hr = [], ha = [], hc = [];
        for (var gx = -1; gx < colsN - 1 && hp.length < 200; gx++) {
            var hx = (gx + 0.5) * cell, top = surf0(hx);
            for (var gy = 0; gy < depth && hp.length < 200; gy++) {
                var hy = top + (gy + 0.5) * cell * 0.82;
                if (hy > H + cell) break;
                hp.push([hx + (jzR(s, gx, gy, 3) * 2 - 1) * cell * 0.3, hy + (jzR(s, gx, gy, 4) * 2 - 1) * cell * 0.2]); hr.push((jzR(s, gx, gy, 5) * 2 - 1) * 70);
                hch.push(pool[jzHash(s, gx, gy, 6) % pool.length]); hc.push(jzR(s, gx, gy, 7) < 0.14); ha.push((0.35 + 0.5 * jzR(s, gx, gy, 8)) * (1 - gy / (depth + 1)));
            }
        }
        if (hp.length) {
            var HG = ld1_G(ctx, hch, { font: hf, size: cell * 0.8, color: sc.sub, name: 'heap', cx: W / 2, cy: H / 2 });
            ld1_place(HG, hp, 'JZ Heap Place'); jzCharRotations(HG.L, hr, 'JZ Heap Tilt'); jzCharColors(HG.L, sc.accent, hc, 'JZ Heap Accent');
            jzAnimator(HG.L, 'JZ Heap Fade', [['ADBE Text Opacity', 0]], 'var a=' + ld1_arr(ha) + ';(1-(a[textIndex-1]||0))*100');
            jzSetExpr(jzXf(HG.L, 'ADBE Position'), TH + '[value[0],value[1]+rise]'); ld1_opx(ctx, HG.L, 'K');
        }
        // lyric glyphs fall onto the heap (lower rows first) and settle along its slope
        var fd = 0.34, gap = jzClamp(c.dur * 0.3 / n, 0.03, 0.09), order = [], when = {};
        for (ri = nR - 1; ri >= 0; ri--) {
            var ch0 = jzChars(rowsT[ri]), ord = [];
            for (i = 0; i < ch0.length; i++) ord.push(i);
            if (jzP(ctx, 'order', 'random') === 'random') ord.sort(function (a, b) { return jzR(s, ri, a, 21) - jzR(s, ri, b, 21); });
            for (i = 0; i < ord.length; i++) order.push([ri, ord[i]]);
        }
        for (i = 0; i < order.length; i++) when[order[i][0] * 100 + order[i][1]] = 0.08 + i * gap;
        var gl = [], GX = [], T1 = [], S0 = [], TL = [], R0 = [], Y0 = [], LY = [], AC = [], bb = null;
        for (ri = 0; ri < nR; ri++) {
            var lay = nR - 1 - ri, row = ld1_row(jzChars(rowsT[ri]), size, 1.02, cx);
            for (i = 0; i < row.length; i++) {
                if (row[i].ch === ' ') continue;
                var gxp = row[i].x, slope = Math.atan2(surf0(gxp + size * 0.5) - surf0(gxp - size * 0.5), size);
                gl.push(row[i].ch); GX.push(gxp); T1.push(when[ri * 100 + i]); S0.push(surf0(gxp) - size * (0.47 + lay * 0.98));
                TL.push(slope / Math.PI * 180 * 0.7 + (jzR(s, ri, i, 9) * 2 - 1) * 6); R0.push((jzR(s, ri, i, 11) * 2 - 1) * 50); Y0.push(-size * 1.2 - jzR(s, ri, i, 10) * H * 0.2); AC.push(jzR(s, ri, i, 12) < 0.12);
                bb = jzUnion(bb, ld1_box(gxp - size / 2, surf0(gxp) - size * (0.97 + lay * 0.98), gxp + size / 2, surf0(gxp) - size * lay * 0.98));
            }
        }
        var FH = TH + 'var T1=' + ld1_arr(T1) + ',S0=' + ld1_arr(S0) + ',GX=' + ld1_arr(GX) + ';function fall(i){var f=(time-T1[i])/' + fd + ',rest=S0[i]+rise;if(f<0)return [0,0,0,1];' +
            'if(f<1){var e=iq(f);return [1,f,rest,1];}var tau=(f-1)*' + fd + ';return [1,f,rest-' + jzN(size * 0.14) + '*Math.abs(Math.sin(tau*16))*Math.exp(-tau/0.09),1-0.16*Math.exp(-tau/0.05)];}';
        var G = ld1_G(ctx, gl, { font: font, size: size, color: sc.fg, name: t0, cx: cx, cy: H / 2 });
        ld1_GX(ctx, G, 'JZ Fall', FH + 'var TL=' + ld1_arr(TL) + ',R0=' + ld1_arr(R0) + ',Y0=' + ld1_arr(Y0) + ';',
            'var F=fall(i);x=GX[i];if(F[1]<1){var e=iq(F[1]);y=Y0[i]+(F[2]-Y0[i])*e;r=R0[i]+(TL[i]-R0[i])*e;}else{y=F[2];r=TL[i];}sy=F[3];y+=' + jzN(size * 0.47) + '*(1-sy);a=F[0]', 'prsa');
        jzCharColors(G.L, sc.accent, AC, 'JZ Accent');
        ld1_anim(ctx, G.L, { mi: ld1_mi(ctx, 0.08) });
        // dust puffs when a glyph lands
        if (jzP(ctx, 'dust', true)) {
            var DS = jzShapeLayer(ctx, 'dust', 0, 0), dr = size * 0.035;
            for (i = 0; i < gl.length; i++) {
                var gd = jzGrp(DS, 'dust ' + (i + 1));
                for (var qd = 0; qd < 4; qd++) {
                    var dir = qd < 2 ? -1 : 1, sp = 0.6 + 0.6 * jzR(s, i, qd, 13), gq = ld1_sub(gd, 'puff'), dh = FH + 'var F=fall(' + i + '),tau=(F[1]-1)*' + fd + ';';
                    jzAddEllipse(gq, dr * 2, dr * 2); jzAddFill(gq, sc.sub);
                    ld1_gPos(gq, dh + '[GX[' + i + ']+' + dir + '*(' + jzN(size * 0.35) + '+tau*' + jzN(size * 1.6 * sp) + '),F[2]+' + jzN(size * 0.45) + '-tau*' + jzN(size) + '*(0.9-tau*2.2)*' + jzN(sp) + ']');
                    ld1_gSc(gq, dh + 'var k=cl(1-tau/0.35);[100*k,100*k]');
                    ld1_gOp(gq, dh + '(F[1]>=1&&tau<0.35)?100*(1-tau/0.35):0');
                }
            }
            ld1_opx(ctx, DS, 'K');
        }
        return bb;
    }
});

/* ================================================================== 9 blocks — 積み木 */
// every block is a shape layer (front, top, side, inset) pivoting at its bottom centre; its glyph is parented to it
ld1_reg('blocks', {
    plan: function (rng, cut, st) {
        return { font: rng.pick(jzFontsOf(st, ['display'])), deco: rng.chance(0.75), tilt: rng.chance(0.5), hop: rng.chance(0.7), side: rng.pick([1, -1]), colOff: rng.int(0, 5) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, s = c.seed, u = jzU(ctx), port = jzPortrait(ctx), i, j, r;
        var n = jzCount(c.text);
        if (!n) return null;
        var font = jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'display')), side = jzP(ctx, 'side', 1) < 0 ? -1 : 1, colOff = jzP(ctx, 'colOff', 0);
        var rowsB = ld1_rowsOf(c.text, port ? 4 : n <= 6 ? 6 : Math.min(8, Math.ceil(n / 2))), rows = rowsB.length, per = 1;
        for (r = 0; r < rows; r++) per = Math.max(per, rowsB[r].length);
        var dk = 0.34, gk = 1.07, deco = !!jzP(ctx, 'deco', true) && (!port || n <= 3), extra = deco ? 2 : 0;
        var k = Math.min(W * 0.84 / (per * gk + extra * 0.95 + dk), H * 0.7 / (rows * 1.02 + dk + 0.2), u * 0.26);
        var dx = k * dk * 0.8 * side, dy = -k * dk * 0.62, floorY = H / 2 + (rows * k) / 2 + k * 0.1, cols = ld1_objCols(sc), lw = Math.max(1 * ctx.u, k * 0.012);
        var FL = jzShapeLayer(ctx, 'floor', 0, 0), gfl = jzGrp(FL, 'floor'); jzAddPath(gfl, [[W * 0.08, floorY], [W * 0.92, floorY]], false); jzAddStroke(gfl, sc.sub, Math.max(1 * ctx.u, u * 0.002));
        ld1_opx(ctx, FL, '0.6*oe(time/0.4)*K');
        var blk = [], byRow = [], gi = 0;
        for (r = 0; r < rows; r++) byRow.push([]);
        for (r = 0; r < rows; r++) for (j = 0; j < rowsB[r].length; j++) {
            if (rowsB[r][j] === ' ') continue;
            var b0 = { ch: rowsB[r][j], x: W / 2 + (j - (rowsB[r].length - 1) / 2) * k * gk - dx / 2, y: floorY - (rows - r - 0.5) * k * 1.02, r: r, order: (rows - 1 - r) * per + j, col: cols[(gi++ + colOff) % cols.length] };
            blk.push(b0); byRow[r].push(b0);
        }
        for (r = 0; r < rows - 1; r++) for (j = 0; j < byRow[r].length; j++) {
            var bq = byRow[r][j], sup = false;
            for (var z = 0; z < byRow[r + 1].length; z++) if (Math.abs(byRow[r + 1][z].x - bq.x) < k * 0.6) sup = true;
            if (sup) continue;
            var f2 = { ch: null, shape: 3, x: bq.x, y: floorY - (rows - r - 1.5) * k * 1.02, r: r + 1, order: (rows - 2 - r) * per - 1, col: jzMixHex(bq.col, sc.bg, 0.35) };
            blk.push(f2); byRow[r + 1].push(f2);
        }
        if (deco) {
            var cntB = Math.min(per, n), xl = W / 2 - (cntB - 1) / 2 * k * gk - dx / 2 - k * 1.05, xr = W / 2 + (cntB - 1) / 2 * k * gk - dx / 2 + k * 1.05;
            blk.push({ ch: null, shape: 0, x: xl, y: floorY - k * 0.5 * 0.8, sz: 0.8, order: -1, col: cols[(colOff + 2) % cols.length] });
            blk.push({ ch: null, shape: 1, x: xr, y: floorY - k * 0.5 * 0.8, sz: 0.8, order: n + 1, col: cols[(colOff + 3) % cols.length] });
            if (rows === 1) blk.push({ ch: null, shape: 2, x: xr + (jzR(s, 1) * 2 - 1) * k * 0.05, y: floorY - k * 0.8 - k * 0.3, sz: 0.6, order: n + 2, col: cols[(colOff + 1) % cols.length] });
        }
        for (i = 0; i < blk.length; i++) blk[i].bi = i;
        var gap = jzClamp(c.dur * 0.3 / (n + 2), 0.035, 0.1), fd = 0.3, hopOn = !!jzP(ctx, 'hop', true), tilt = !!jzP(ctx, 'tilt', false);
        var TH = ld1_H(ctx) + 'var HOP0=' + jzN(0.3 + (n + 2) * gap + fd) + ';function hop(bi){if(!' + (hopOn ? 1 : 0) + '||time<HOP0)return 0;var kk=Math.floor(time/0.65),f=(time-kk*0.65)/0.32;' +
            'if(Math.floor(hh(kk*4+' + (s % 997) + ')*' + n + ')!==bi||f>=1)return 0;return Math.sin(Math.PI*cl(f));}';
        var sorted = blk.slice(0);
        sorted.sort(function (a, b) { return (b.y - a.y) || (side > 0 ? a.x - b.x : b.x - a.x); });
        var bb = null;
        for (i = 0; i < sorted.length; i++) {
            var b = sorted[i], kz = k * (b.sz || 1), hk = kz / 2, ddx = dx * (b.sz || 1), ddy = dy * (b.sz || 1), t1 = 0.06 + (b.order + 1) * gap;
            var rot = tilt && b.r === 0 && rows > 1 ? (jzR(s, b.bi, 3) * 2 - 1) * 3 : 0, top = ld1_shade(sc, b.col, 0.28), sd = ld1_shade(sc, b.col, -0.3), cy0 = b.y;
            var BL = jzShapeLayer(ctx, b.ch ? 'block ' + b.ch : 'block', b.x, cy0 + hk);
            jzXf(BL, 'ADBE Anchor Point').setValue([b.x, cy0 + hk]);
            var X = b.x, Y = cy0;
            if (b.ch == null && b.shape !== 3) {
                var tcol = jzMixHex(b.col, ld1_onCol(sc, b.col), 0.8), qq = kz * 0.26, gd = jzGrp(BL, 'mark');
                if (b.shape === 0) jzAddEllipse(gd, qq * 2, qq * 2, X, Y);
                else if (b.shape === 1) jzAddPath(gd, [[X, Y - qq * 1.1], [X + qq * 1.05, Y + qq * 0.8], [X - qq * 1.05, Y + qq * 0.8]], true);
                else jzAddPath(gd, [[X, Y - qq], [X + qq, Y], [X, Y + qq], [X - qq, Y]], true);
                jzAddFill(gd, tcol);
            }
            var gin = jzGrp(BL, 'inset'); ld1_rr(gin, kz * 0.84, kz * 0.84, kz * 0.06, X, Y); jzAddStroke(gin, jzMixHex(b.col, ld1_onCol(sc, b.col), 0.35), lw * 1.5);
            var gfr = jzGrp(BL, 'front'); ld1_rr(gfr, kz, kz, 0, X, Y); jzAddFill(gfr, b.col);
            var gsd = jzGrp(BL, 'side'), sx0 = side > 0 ? X + hk : X - hk;
            jzAddPath(gsd, [[sx0, Y - hk], [sx0 + ddx, Y - hk + ddy], [sx0 + ddx, Y + hk + ddy], [sx0, Y + hk]], true); jzAddFill(gsd, sd);
            var gtp = jzGrp(BL, 'top');
            jzAddPath(gtp, [[X - hk, Y - hk], [X + hk, Y - hk], [X + hk + ddx, Y - hk + ddy], [X - hk + ddx, Y - hk + ddy]], true); jzAddFill(gtp, top);
            if (rot) jzXf(BL, 'ADBE Rotate Z').setValue(rot);
            var BH = TH + 'var f=(time-' + jzN(t1) + ')/' + fd + ',y=' + jzN(cy0) + ',sq=1;if(f<1)y=' + jzN(-kz * 2 - (H - cy0) * 0.2) + '+(' + jzN(cy0) + '-(' + jzN(-kz * 2 - (H - cy0) * 0.2) + '))*iq(f);' +
                'else{var tau=(f-1)*' + fd + ';y-=' + jzN(kz * 0.1) + '*Math.abs(Math.sin(tau*14))*Math.exp(-tau/0.1);sq=1-0.1*Math.exp(-tau/0.05);}' +
                'y-=' + jzN(kz * 0.16) + '*hop(' + b.bi + ');y+=iq(cl(PO*1.4-' + jzN((b.order + 1) / (n + 3) * 0.4) + '))*' + jzN(H * 0.7) + ';';
            jzSetExpr(jzXf(BL, 'ADBE Position'), BH + '[value[0],y+' + jzN(hk) + ']');
            jzSetExpr(jzXf(BL, 'ADBE Scale'), BH + '[value[0],value[1]*sq]');
            jzSetExpr(jzXf(BL, 'ADBE Opacity'), BH + '(f<0?0:100)*K');
            if (b.ch != null) {
                var T = ld1_T(ctx, b.ch, { font: font, size: kz * 0.6, color: ld1_onCol(sc, b.col), x: X, y: Y, name: b.ch });
                ld1_parent(T, BL);
                ld1_anim(ctx, T, { mi: ld1_mi(ctx, t1), noHold: ld1_plateHold(ctx) });
                bb = jzUnion(bb, ld1_box(X - hk, Y - hk, X + hk, Y + hk));
            }
        }
        return bb;
    }
});

// per-glyph colours from a palette: one Fill (and optionally Stroke) Color animator per distinct colour
function ld1_palAnim(L, cols, name, stroke) {
    var uniq = [], i, j;
    for (i = 0; i < cols.length; i++) if (jzIndexOf(uniq, cols[i]) < 0) uniq.push(cols[i]);
    for (j = 0; j < uniq.length; j++) {
        var f = [];
        for (i = 0; i < cols.length; i++) f.push(cols[i] === uniq[j] ? 1 : 0);
        var props = [['ADBE Text Fill Color', jzHex(uniq[j])]];
        if (stroke) props.push(['ADBE Text Stroke Color', jzHex(uniq[j])]);
        jzAnimator(L, name + ' ' + (j + 1), props, 'var a=' + ld1_arr(f) + ';(a[textIndex-1]||0)*100');
    }
}

/* ================================================================== 10 balloons — 文字風船 */
ld1_reg('balloons', {
    plan: function (rng, cut, st) {
        return { font: rng.pick(jzFontsOf(st, ['display'])), tie: rng.pick(['bunch', 'bunch', 'free']), arc: rng.range(0.02, 0.06), colOff: rng.int(0, 4), mono: rng.chance(0.3) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, s = c.seed, u = jzU(ctx), port = jzPortrait(ctx), i, j, ri;
        var t0 = jzFlat(c.text), n = jzCount(t0);
        if (!n) return null;
        var font = jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'display')), bunch = jzP(ctx, 'tie', 'bunch') === 'bunch', arc = jzP(ctx, 'arc', 0.04), colOff = jzP(ctx, 'colOff', 0), mono = !!jzP(ctx, 'mono', false);
        var rowsT = n > (port ? 4 : 7) ? ld1_chunksK(t0, port ? Math.ceil(n / 4) : 2) : [t0], nR = rowsT.length, mot = ld1_mot(ctx);
        var size = Math.min(u * 0.26, H * 0.56 / (nR * 1.25 + 0.3));
        for (i = 0; i < nR; i++) size = Math.min(size, W * 0.84 / Math.max(1, ld1_lineW(rowsT[i], 0) * 1.2));
        var cols = ld1_objCols(sc), gx = W / 2, gy = H * 0.93, gl = [], XS = [], YS = [], PH = [], T1 = [], R3 = [], FL = [], CO = [], DC = [], bb = null;
        for (ri = 0; ri < nR; ri++) {
            var row = ld1_row(jzChars(rowsT[ri]), size, 1.2, W / 2), yRow = H * 0.4 + (ri - (nR - 1) / 2) * size * 1.3;
            for (j = 0; j < row.length; j++) {
                if (row[j].ch === ' ') continue;
                var q = gl.length, u0 = row.tot > 0 ? (row[j].x - W / 2) / (row.tot / 2) : 0, col = mono ? cols[colOff % cols.length] : cols[(q + colOff) % cols.length];
                gl.push(row[j].ch); XS.push(row[j].x); YS.push(yRow - arc * H * (1 - u0 * u0)); PH.push(jzR(s, q, 1) * Math.PI * 2);
                T1.push(0.05 + q * jzClamp(c.dur * 0.3 / n, 0.03, 0.08)); R3.push((jzR(s, q, 3) * 2 - 1) * 4); FL.push(0.8 + 0.4 * jzR(s, q, 2));
                CO.push(col); DC.push(ld1_shade(sc, col, -0.38));
                bb = jzUnion(bb, ld1_box(row[j].x - size * 0.5, YS[q] - size * 0.55, row[j].x + size * 0.5, YS[q] + size * 0.55));
            }
        }
        var BH = ld1_H(ctx) + 'var XS=' + ld1_arr(XS) + ',YS=' + ld1_arr(YS) + ',PH=' + ld1_arr(PH) + ',T1=' + ld1_arr(T1) + ',R3=' + ld1_arr(R3) + ',FL=' + ld1_arr(FL) + ',SZ=' + jzN(size) + ',MO=' + jzN(0.4 + mot) + ';' +
            'var fly=ic(PO)*' + jzN(H * 0.9) + ';function bal(i){var e=cl((time-T1[i])/0.45),ph=PH[i];return [XS[i]+Math.sin(time*0.9+ph)*SZ*0.03,YS[i]+Math.sin(time*1.4+ph)*SZ*0.05*MO+(1-oc(e))*' + jzN(H * 0.35) + '-fly*FL[i],' +
            'Math.sin(time*0.8+ph*1.3)*5*MO+R3[i],e];}\n';
        // strings (knot -> gather point, sagging: two segments) + knots
        var SL = jzShapeLayer(ctx, 'balloon strings', 0, 0), lw = Math.max(1 * ctx.u, u * 0.0016);
        jzGrp(SL, 'strings'); jzGrp(SL, 'knots');
        var gs = ld1_rg(SL, 'strings'), gk = ld1_rg(SL, 'knots');      // fetched after both exist (AE invalidates older sibling refs)
        for (i = 0; i < gl.length; i++) {
            var kb = 'var B=bal(' + i + '),rr=B[2]*Math.PI/180,bx=B[0]-Math.sin(rr)*SZ*0.58,by=B[1]+Math.cos(rr)*SZ*0.58,' +
                (bunch ? 'ex=' + jzN(gx) + '+(B[0]-' + jzN(gx) + ')*0.06,ey=' + jzN(gy) + '-fly' : 'ex=bx+Math.sin(time*1.1+' + i + ')*SZ*0.2,ey=Math.min(' + jzN(H * 1.05) + ',by+' + jzN(H * 0.3) + ')') +
                ',mx=(bx+ex)/2+Math.sin(time*2+' + i + ')*SZ*0.05,my=(by+ey)/2+SZ*0.25,k=B[3]>0?1:0;';
            var s1 = ld1_seg(gs, 'string ' + (i + 1) + 'a', BH, kb + 'var X0=bx,Y0=by,X1=mx,Y1=my', lw);
            ld1_gOp(s1, BH + kb + 'k*100');
            var s2 = ld1_seg(gs, 'string ' + (i + 1) + 'b', BH, kb + 'var X0=mx,Y0=my,X1=ex,Y1=ey', lw);
            ld1_gOp(s2, BH + kb + 'k*100');
            var gkn = ld1_sub(gk, 'knot ' + (i + 1)); jzAddPath(gkn, [[-size * 0.05, size * 0.07], [size * 0.05, size * 0.07], [0, -size * 0.02]], true); jzAddFill(gkn, DC[i]);
            ld1_gPos(gkn, BH + kb + '[bx,by]'); ld1_gOp(gkn, BH + kb + 'k*100');
        }
        jzAddFill(gs, sc.sub);
        jzSetExpr(jzXf(SL, 'ADBE Opacity'), BH + '85*K');
        if (bunch) {
            var KS = jzShapeLayer(ctx, 'balloon gather', 0, 0), gg = jzGrp(KS, 'knot'); jzAddEllipse(gg, size * 0.1, size * 0.1); jzAddFill(gg, sc.sub);
            ld1_gPos(gg, BH + '[' + jzN(gx) + ',' + jzN(gy) + '-fly]'); ld1_opx(ctx, KS, 'oc((time-0.2)/0.3)*K');
        }
        var pb = 'var B=bal(i),q=B[3]<=0?0:ob(B[3],2.2);x=B[0];y=B[1];r=B[2];sx=sy=0.3+0.7*q;a=B[3]>0?1:0';
        // puffy rim (dark, fat stroke under) + body (the lyric) + gloss dots
        var RG = ld1_G(ctx, gl, { font: font, size: size, color: '#000000', stroke: size * 0.13, strokeColor: '#000000', name: 'balloon rims', cx: W / 2, cy: H / 2 });
        ld1_GX(ctx, RG, 'JZ Balloon', BH, pb, 'prsa'); ld1_palAnim(RG.L, DC, 'JZ Rim Colour', true); ld1_opx(ctx, RG.L, 'K');
        var G = ld1_G(ctx, gl, { font: font, size: size, color: CO[0], stroke: size * 0.065, strokeColor: CO[0], name: t0, cx: W / 2, cy: H / 2 });
        ld1_GX(ctx, G, 'JZ Balloon', BH, pb, 'prsa'); ld1_palAnim(G.L, CO, 'JZ Balloon Colour', true);
        ld1_anim(ctx, G.L, { mi: ld1_mi(ctx, T1[0]), treat: false });
        var GS = jzShapeLayer(ctx, 'balloon gloss', 0, 0), gd = jzGrp(GS, 'dots');
        for (i = 0; i < gl.length; i++) {
            var gq = ld1_sub(gd, 'dot ' + (i + 1)); jzAddEllipse(gq, size * 0.09, size * 0.09);
            ld1_gPos(gq, BH + 'var B=bal(' + i + '),sz=' + jzN(size) + '*(0.3+0.7*(B[3]<=0?0:ob(B[3],2.2)));[B[0]-sz*0.22,B[1]-sz*0.26]');
            ld1_gOp(gq, BH + 'var B=bal(' + i + ');70*B[3]');
        }
        jzAddFill(gd, ld1_light(sc)); ld1_opx(ctx, GS, 'K');
        return bb;
    }
});

/* ================================================================== 11 magnets — マグネット文字 */
var LD1_DECOY = 'ABCDEFGHKMNPRSTXYZ0123456789★♥♪?!';
ld1_reg('magnets', {
    plan: function (rng, cut, st) {
        return { font: rng.pick(jzFontsOf(st, ['display'])), df: rng.pick(jzFontsOf(st, ['display', 'body'])), decoys: rng.int(6, 11), handle: rng.pick([1, -1]), colOff: rng.int(0, 4), tilt: rng.range(6, 12) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, s = c.seed, u = jzU(ctx), port = jzPortrait(ctx), i, j, ri;
        var chs0 = jzChars(jzFlat(c.text)), n = 0;
        for (i = 0; i < chs0.length; i++) if (chs0[i] !== ' ') n++;
        if (!n) return null;
        var font = jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'display')), df = jzP(ctx, 'df', font), colOff = jzP(ctx, 'colOff', 0), tilt = jzP(ctx, 'tilt', 9), nd = jzP(ctx, 'decoys', 8);
        var mx = W * 0.04, my = H * 0.05, bw = W - mx * 2, bh = H - my * 2, rr = u * 0.03, DK = ld1_dark(sc);
        var board = jzMixHex(sc.bg, sc.fg, jzLum(sc.bg) < 0.5 ? 0.07 : 0.06), TH = ld1_H(ctx);
        // the board (fridge door) + handle
        var BD = jzShapeLayer(ctx, 'magnet board', 0, 0);
        var hx = jzP(ctx, 'handle', 1) > 0 ? mx + bw - u * 0.05 : mx + u * 0.035, hhh = bh * 0.34;
        var gh = jzGrp(BD, 'handle'); ld1_rr(gh, u * 0.016, hhh, u * 0.008, hx + u * 0.008, H / 2); jzAddFill(gh, jzMixHex(board, sc.fg, 0.2));
        var gb = jzGrp(BD, 'board'); ld1_rr(gb, bw, bh, rr, W / 2, H / 2); jzAddStroke(gb, jzMixHex(sc.bg, sc.fg, 0.16), Math.max(1 * ctx.u, u * 0.002)); jzAddFill(gb, board);
        jzSetExpr(jzXf(BD, 'ADBE Position'), TH + '[value[0],value[1]+(1-oc(time/0.45))*' + jzN(H * 0.04) + ']'); ld1_opx(ctx, BD, 'oc(time/0.45)*K');
        // lyric layout in rows
        var per = port ? 4 : 8, ft = jzFlat(c.text), rowsT = n > per ? ld1_chunksK(ft, Math.ceil(n / per)) : [ft], nR = rowsT.length, base = Math.min(u * 0.22, H * 0.56 / (nR * 1.12));
        function kOf(ch) { return jzIsKanji(ch) ? 1 : jzIsPunct(ch) ? 0.6 : 'ぁぃぅぇぉっゃゅょゎァィゥェォッャュョヮ'.indexOf(ch) >= 0 ? 0.7 : 0.86; }
        for (ri = 0; ri < nR; ri++) { var a0 = 0, cc = jzChars(rowsT[ri]); for (j = 0; j < cc.length; j++) a0 += ld1_adv(cc[j]) * (jzIsKanji(cc[j]) ? 1 : 0.86) * 1.1; base = Math.min(base, bw * 0.8 / Math.max(1, a0)); }
        var cols = ld1_objCols(sc), gl = [], XS = [], YS = [], KS = [], RS = [], CO = [], T1 = [], bb = null, gap = jzClamp(c.dur * 0.32 / n, 0.04, 0.1);
        for (ri = 0; ri < nR; ri++) {
            var ch1 = jzChars(rowsT[ri]), ads = [], tot = 0;
            for (j = 0; j < ch1.length; j++) { ads.push(ld1_adv(ch1[j]) * base * kOf(ch1[j]) * 1.1); tot += ads[j]; }
            var x = W / 2 - tot / 2, y = H / 2 + (ri - (nR - 1) / 2) * base * 1.14;
            for (j = 0; j < ch1.length; j++) {
                var cxp = x + ads[j] / 2; x += ads[j];
                if (ch1[j] === ' ') continue;
                var q = gl.length;
                gl.push(ch1[j]); XS.push(cxp + (jzR(s, q, 1) * 2 - 1) * base * 0.04); YS.push(y + (jzR(s, q, 2) * 2 - 1) * base * 0.08); KS.push(kOf(ch1[j]));
                RS.push((jzR(s, q, 3) * 2 - 1) * tilt); CO.push(cols[(q * 7 + colOff) % cols.length]); T1.push(0.18 + q * gap);
                bb = jzUnion(bb, ld1_box(XS[q] - base * KS[q] * 0.5, YS[q] - base * KS[q] * 0.55, XS[q] + base * KS[q] * 0.5, YS[q] + base * KS[q] * 0.55));
            }
        }
        // decoy magnets round the edges (never over the lyric band)
        var bandY0 = H / 2 - nR * base * 0.62, bandY1 = H / 2 + nR * base * 0.62, dg = [], DX = [], DY = [], DS = [], DR = [], DCo = [], DT = [], half = Math.ceil(nd / 2);
        for (var d = 0; d < nd; d++) {
            var topS = d % 2 === 0, slot = Math.floor(d / 2), sz = Math.min(base * (0.36 + 0.22 * jzR(s, d, 14)), u * 0.09);
            var dy2 = topS ? jzLerp(my + bh * 0.08 + sz * 0.6, Math.max(my + bh * 0.1 + sz * 0.6, bandY0 - sz * 0.8), jzR(s, d, 11)) : jzLerp(Math.min(my + bh * 0.9 - sz * 0.6, bandY1 + sz * 0.8), my + bh * 0.92 - sz * 0.6, jzR(s, d, 11));
            var dch = LD1_DECOY.charAt(jzHash(s, d, 13) % LD1_DECOY.length);
            dg.push(dch); DX.push(mx + bw * (0.1 + 0.8 * (slot + 0.2 + 0.6 * jzR(s, d, 12)) / half)); DY.push(dy2); DS.push(sz); DR.push((jzR(s, d, 15) * 2 - 1) * 25); DCo.push(cols[(d + 2 + colOff) % cols.length]); DT.push(0.05 + d * 0.04);
        }
        if (dg.length) {
            var dmax = 0; for (i = 0; i < DS.length; i++) dmax = Math.max(dmax, DS[i]);
            var DH = TH + 'var DX=' + ld1_arr(DX) + ',DY=' + ld1_arr(DY) + ',DS=' + ld1_arr(DS) + ',DR=' + ld1_arr(DR) + ',DT=' + ld1_arr(DT) + ';';
            var db = 'var e=cl((time-DT[i])/0.2),k=1+0.25*(1-oc(e));sx=sy=DS[i]/' + jzN(dmax) + '*k;r=DR[i];a=e;';
            var DSh = ld1_G(ctx, dg, { font: df, size: dmax, color: DK, stroke: dmax * 0.08, strokeColor: DK, name: 'decoy shadows', cx: W / 2, cy: H / 2 });
            ld1_GX(ctx, DSh, 'JZ Decoy', DH, db + 'x=DX[i]+DS[i]*0.05;y=DY[i]+DS[i]*0.07', 'prsa'); ld1_opx(ctx, DSh.L, '0.28*K');
            var DB = ld1_G(ctx, dg, { font: df, size: dmax, color: DCo[0], stroke: dmax * 0.08, strokeColor: DCo[0], name: 'decoys', cx: W / 2, cy: H / 2 });
            ld1_GX(ctx, DB, 'JZ Decoy', DH, db + 'x=DX[i];y=DY[i]', 'prsa'); ld1_palAnim(DB.L, DCo, 'JZ Decoy Colour', true); ld1_opx(ctx, DB.L, '0.85*K');
        }
        // the lyric magnets: snap onto the board (shadow shrinks as they land)
        var MH = TH + 'var XS=' + ld1_arr(XS) + ',YS=' + ld1_arr(YS) + ',KS=' + ld1_arr(KS) + ',RS=' + ld1_arr(RS) + ',T1=' + ld1_arr(T1) + ',BS=' + jzN(base) + ';' +
            'function mg(i){var f=(time-T1[i])/0.16;if(f<0)return [0,0,0];var sn=f<1?1.28-0.28*iq(f):1-0.05*Math.exp(-(f-1)*0.16/0.05)*Math.cos((f-1)*3);return [1,sn,f<1?1-f:0];}';
        var SH = ld1_G(ctx, gl, { font: font, size: base, color: DK, stroke: base * 0.08, strokeColor: DK, name: 'magnet shadows', cx: W / 2, cy: H / 2 });
        ld1_GX(ctx, SH, 'JZ Magnet', MH, 'var m=mg(i);x=XS[i]+BS*KS[i]*(0.04+m[2]*0.12);y=YS[i]+BS*KS[i]*(0.06+m[2]*0.18);r=RS[i];sx=sy=KS[i]*m[1];a=m[0]*(0.3-m[2]*0.15)', 'prsa');
        ld1_opx(ctx, SH.L, 'K');
        var G = ld1_G(ctx, gl, { font: font, size: base, color: CO[0], stroke: base * 0.08, strokeColor: CO[0], name: ft, cx: W / 2, cy: H / 2 });
        ld1_GX(ctx, G, 'JZ Magnet', MH, 'var m=mg(i);x=XS[i];y=YS[i];r=RS[i];sx=sy=KS[i]*m[1];a=m[0]', 'prsa');
        ld1_palAnim(G.L, CO, 'JZ Magnet Colour', true);
        ld1_anim(ctx, G.L, { mi: ld1_mi(ctx, 0.18), treat: false });
        return bb;
    }
});

/* ================================================================== 12 tiles — 文字タイル */
var LD1_LPTS = { A: 1, B: 3, C: 3, D: 2, E: 1, F: 4, G: 2, H: 4, I: 1, J: 8, K: 5, L: 1, M: 3, N: 1, O: 1, P: 3, Q: 10, R: 1, S: 1, T: 1, U: 1, V: 4, W: 4, X: 8, Y: 4, Z: 10 };
function ld1_tilePts(ch) {
    var up = ch.toUpperCase();
    if (LD1_LPTS[up]) return LD1_LPTS[up];
    var sid = jzHash(ch, 0, 0, 0);
    if (jzIsKanji(ch)) return 3 + (sid % 8);
    if ('ぁぃぅぇぉっゃゅょゎァィゥェォッャュョヮ'.indexOf(ch) >= 0) return 5;
    if (jzIsPunct(ch)) return 0;
    if (jzIsKata(ch)) return 2 + (sid % 2);
    return 1 + (sid % 3);
}
ld1_reg('tiles', {
    plan: function (rng, cut, st) {
        return { font: rng.pick(jzFontsOf(st, ['display', 'serif'])), from: rng.pick(['right', 'right', 'drop']), rack: rng.pick(['accent', 'ink', 'sub']), score: rng.chance(0.75) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, s = c.seed, u = jzU(ctx), port = jzPortrait(ctx), i, j, r;
        var n = jzCount(c.text);
        if (!n) return null;
        var font = jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'display')), drop = jzP(ctx, 'from', 'right') === 'drop', rk = jzP(ctx, 'rack', 'accent');
        var rowsT = ld1_rowsOf(c.text, port ? 5 : 9), rows = rowsT.length, per = 1;
        for (r = 0; r < rows; r++) per = Math.max(per, rowsT[r].length);
        var k = Math.min(W * 0.84 / (per * 1.08 + 0.6), H * 0.62 / (rows * 1.75), u * 0.2), DK = ld1_dark(sc);
        var tileC = jzMixHex(ld1_light(sc), sc.accent, 0.1), tileT = DK, edge = jzMixHex(tileC, DK, 0.3), hi = jzMixHex(tileC, '#FFFFFF', 0.35);
        var rackC = ld1_plateCol(sc, rk === 'accent' ? [sc.accent, sc.ink] : rk === 'sub' ? [sc.sub, sc.ink] : [sc.ink, sc.accent]);
        var gap = jzClamp(c.dur * 0.36 / n, 0.05, 0.12), fd = 0.28, lean = -k * 0.05;
        var TH = ld1_H(ctx) + 'var ra=oc(time/0.4)*K;';
        var tl = [], TX = [], TY = [], TT = [], TJ = [], TC = [], PT = [], total = 0, bb = null, rowY = [], rowW = [];
        for (r = 0; r < rows; r++) {
            var cnt = rowsT[r].length, ry = H / 2 + (r - (rows - 1) / 2) * k * 1.75;
            rowY.push(ry); rowW.push(cnt * k * 1.08 + k * 0.5);
            for (j = 0; j < cnt; j++) {
                if (rowsT[r][j] === ' ') continue;
                var x = W / 2 + (j - (cnt - 1) / 2) * k * 1.08, pts = ld1_tilePts(rowsT[r][j]);
                tl.push(rowsT[r][j]); TX.push(x); TY.push(ry); TT.push(0.12 + (tl.length - 1) * gap); TJ.push(j / Math.max(1, cnt)); PT.push(pts); total += pts;
                bb = jzUnion(bb, ld1_box(x - k / 2, ry - k / 2 + lean, x + k / 2, ry + k / 2 + lean));
            }
        }
        var nT = tl.length, RR = [];
        for (i = 0; i < nT; i++) RR.push((jzR(s, i, 2) * 2 - 1) * 30);
        // tile motion: t = [x, y, rot, visible]
        var MH = TH + 'var TX=' + ld1_arr(TX) + ',TY=' + ld1_arr(TY) + ',TT=' + ld1_arr(TT) + ',TJ=' + ld1_arr(TJ) + ',RR=' + ld1_arr(RR) + ',KK=' + jzN(k) + ';' +
            'function tile(i){var f=cl((time-TT[i])/' + fd + '),x=TX[i],y=TY[i],r=0;if(time<TT[i])return [x,y,0,0];' +
            (drop ? 'y=TY[i]-' + jzN(H * 0.5) + '*(1-iq(f));r=(1-f)*RR[i];if(f>=1){var d=time-TT[i]-' + fd + ';y-=KK*0.06*Math.abs(Math.sin(d*18))*Math.exp(-d/0.08);}'
                : 'var e=oc(f);x=' + jzN(W + k) + '+(TX[i]-' + jzN(W + k) + ')*e;r=(1-e)*10;y=TY[i]-Math.sin(Math.PI*f)*KK*0.15;') +
            'var po=ic(cl(PO*1.4-TJ[i]*0.4));x-=po*(TX[i]+KK*3);return [x,y+' + jzN(lean) + ',r,1];}';
        // rack back slot + shadow (behind the tiles)
        var RB = jzShapeLayer(ctx, 'rack back', 0, 0);
        for (r = 0; r < rows; r++) {
            var ryy = rowY[r] + k * 0.42, rw = rowW[r];
            var gsl = jzGrp(RB, 'slot ' + (r + 1)); ld1_rr(gsl, rw, k * 0.14, 0, 0, ryy - k * 0.05); jzAddFill(gsl, ld1_shade(sc, rackC, -0.3));
            var gsh = jzGrp(RB, 'shadow ' + (r + 1)); jzAddPath(gsh, [[-rw / 2 + k * 0.06, ryy + k * 0.34], [rw / 2 + k * 0.06, ryy + k * 0.34], [rw / 2 + k * 0.2, ryy + k * 0.42], [-rw / 2 + k * 0.2, ryy + k * 0.42]], true);
            jzAddFill(gsh, DK); ld1_gOp(gsh, '25');
        }
        jzXf(RB, 'ADBE Position').setValue([W / 2, 0]);
        jzSetExpr(jzXf(RB, 'ADBE Scale'), TH + '[value[0]*(0.3+0.7*ra),value[1]]'); jzSetExpr(jzXf(RB, 'ADBE Opacity'), TH + 'value*ra');
        // tiles (one shape layer, a group per tile)
        var TS = jzShapeLayer(ctx, 'tiles', 0, 0);
        for (i = 0; i < nT; i++) {
            var g = jzGrp(TS, 'tile ' + (i + 1));
            var gl2 = ld1_sub(g, 'shine'); jzAddPath(gl2, [[-k / 2 + k * 0.12, -k / 2 + k * 0.05], [k / 2 - k * 0.12, -k / 2 + k * 0.05]], false); jzAddStroke(gl2, hi, Math.max(1 * ctx.u, k * 0.025)); ld1_gOp(gl2, '70');
            var gt = ld1_sub(g, 'tile'); ld1_rr(gt, k, k, k * 0.1); jzAddFill(gt, tileC);
            var ge = ld1_sub(g, 'edge'); ld1_rr(ge, k, k, k * 0.1, k * 0.03, k * 0.06); jzAddFill(ge, edge);
            ld1_gPos(g, MH + 'var t=tile(' + i + ');[t[0],t[1]]'); ld1_gRot(g, MH + 'tile(' + i + ')[2]'); ld1_gOp(g, MH + 'tile(' + i + ')[3]*100');
        }
        ld1_opx(ctx, TS, 'K');
        // point values (one glyph per character of every value, riding on its tile)
        var pg = [], PI_ = [], PO_ = [];
        for (i = 0; i < nT; i++) { if (PT[i] <= 0) continue; var ps = jzChars(String(PT[i])); for (j = 0; j < ps.length; j++) { pg.push(ps[j]); PI_.push(i); PO_.push((j - (ps.length - 1) / 2) * k * 0.105); } }
        if (pg.length) {
            var PG = ld1_G(ctx, pg, { font: jzMonoF(ctx), size: k * 0.17, color: tileT, name: 'tile points', cx: W / 2, cy: H / 2 });
            ld1_GX(ctx, PG, 'JZ Points', MH + 'var PI_=' + ld1_arr(PI_) + ',PO_=' + ld1_arr(PO_) + ';',
                'var t=tile(PI_[i]),an=t[2]*Math.PI/180,ox=KK*0.35+PO_[i],oy=KK*0.33;x=t[0]+ox*Math.cos(an)-oy*Math.sin(an);y=t[1]+ox*Math.sin(an)+oy*Math.cos(an);r=t[2];a=t[3]*0.85', 'pra');
            ld1_opx(ctx, PG.L, 'K');
        }
        // the lyric glyphs ride on their tiles
        var G = ld1_G(ctx, tl, { font: font, size: k * 0.6, color: tileT, name: jzFlat(c.text), cx: W / 2, cy: H / 2 });
        ld1_GX(ctx, G, 'JZ Tile', MH, 'var t=tile(i),an=t[2]*Math.PI/180,ox=-KK*0.06,oy=-KK*0.05;x=t[0]+ox*Math.cos(an)-oy*Math.sin(an);y=t[1]+ox*Math.sin(an)+oy*Math.cos(an);r=t[2];a=t[3]', 'pra');
        ld1_anim(ctx, G.L, { mi: ld1_mi(ctx, 0.12), noHold: ld1_plateHold(ctx) });
        // rack front lip (over the tile bottoms)
        var RF = jzShapeLayer(ctx, 'rack front', 0, 0);
        for (r = 0; r < rows; r++) {
            var ry2 = rowY[r] + k * 0.42, rw2 = rowW[r];
            var glp = jzGrp(RF, 'lip ' + (r + 1));
            var gln = ld1_sub(glp, 'shine'); jzAddPath(gln, [[-rw2 / 2, ry2 + k * 0.02], [rw2 / 2, ry2 + k * 0.02]], false); jzAddStroke(gln, ld1_shade(sc, rackC, 0.3), Math.max(1 * ctx.u, k * 0.02));
            var glf = ld1_sub(glp, 'lip'); jzAddPath(glf, [[-rw2 / 2, ry2 + k * 0.02], [rw2 / 2, ry2 + k * 0.02], [rw2 / 2 - k * 0.06, ry2 + k * 0.34], [-rw2 / 2 + k * 0.06, ry2 + k * 0.34]], true); jzAddFill(glf, rackC);
        }
        jzXf(RF, 'ADBE Position').setValue([W / 2, 0]);
        jzSetExpr(jzXf(RF, 'ADBE Scale'), TH + '[value[0]*(0.3+0.7*ra),value[1]]'); jzSetExpr(jzXf(RF, 'ADBE Opacity'), TH + 'value*ra');
        // score: counts the values of the tiles that have landed
        if (jzP(ctx, 'score', true)) {
            var fs = Math.max(jzSmallSize(ctx), k * 0.16), lastY = rowY[rows - 1] + k * 0.76, hw = Math.min(per, n) * k * 0.54 + k * 0.25, ly = lastY + fs * 1.6;
            var SL = jzText(ctx, 'SCORE', { font: jzMonoF(ctx), size: fs, track: 0.3, align: 'left', x: W / 2 - hw, y: ly, color: sc.sub, name: 'tiles score label' });
            ld1_opx(ctx, SL, 'oc((time-0.2)/0.3)*K');
            var SV = jzText(ctx, '000', { font: jzMonoF(ctx), size: fs * 1.5, track: 0.1, align: 'right', x: W / 2 + hw, y: ly, color: sc.fg, name: 'tiles score' });
            var sh = MH + 'var PT=' + ld1_arr(PT) + ';var sc_=0;for(var i=0;i<PT.length;i++)if(time>=TT[i]+' + fd + ')sc_+=PT[i];';
            try { SV.property('ADBE Text Properties').property('ADBE Text Document').expression = sh + 'var s=String(sc_);while(s.length<3)s="0"+s;s'; } catch (e0) { jzWarn('score: ' + e0.toString()); }
            jzAnimator(SV, 'JZ Score Done', [['ADBE Text Fill Color', jzHex(sc.accent)]], sh + (total > 0 ? '(sc_>=' + total + ')?100:0' : '0'));
            ld1_opx(ctx, SV, 'oc((time-0.2)/0.3)*K');
        }
        return bb;
    }
});

// shape repeater: copies of everything above it in the group, offset by [dx, dy]
function ld1_rep(g, copies, dx, dy) {
    var r = jzVecs(g).addProperty('ADBE Vector Filter - Repeater');
    r.property('ADBE Vector Repeater Copies').setValue(copies);
    r.property('ADBE Vector Repeater Transform').property('ADBE Vector Repeater Position').setValue([dx, dy]);
    return r;
}
// alpha track matte: L shows only inside M (M directly above L). AE 23+ links mattes with setTrackMatte
function ld1_matte(L, M) {
    M.moveBefore(L);
    var ok = false;
    if (typeof L.setTrackMatte === 'function') { try { L.setTrackMatte(M, TrackMatteType.ALPHA); ok = true; } catch (e) { ok = false; } }
    if (!ok) { try { L.trackMatteType = TrackMatteType.ALPHA; } catch (e2) { jzWarn('matte: ' + e2.toString()); } }
}
function ld1_perim(pts) { var L = 0; for (var i = 0; i < pts.length; i++) { var a = pts[i], b = pts[(i + 1) % pts.length]; L += Math.sqrt((b[0] - a[0]) * (b[0] - a[0]) + (b[1] - a[1]) * (b[1] - a[1])); } return L; }

/* ================================================================== 13 bulbs — 電球サイン */
// the bulbs are dashed strokes (zero-length dashes with round caps = dots) along the sign's inset outline:
// sockets, dim-lit and lit patterns are separate strokes; the chase moves the lit stroke's dash offset
ld1_reg('bulbs', {
    plan: function (rng, cut, st) {
        return { font: rng.pick(jzFontsOf(st, ['display'])), shape: rng.pick(['board', 'board', 'arrow', 'double']), chase: rng.pick(['chase', 'chase', 'alt', 'wave']), dir: rng.pick([1, -1]), sub: rng.chance(0.6) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, u = jzU(ctx), port = jzPortrait(ctx), i;
        var font = jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'display')), shp = jzP(ctx, 'shape', 'board'), chase = jzP(ctx, 'chase', 'chase'), dir = jzP(ctx, 'dir', 1) < 0 ? -1 : 1;
        var text = ld1_brk(c.text, port ? 5 : 8), arrow = shp === 'arrow' && !port;
        var maxW = W * (arrow ? 0.62 : 0.72), maxH = H * (port ? 0.36 : 0.42), m1 = ld1_meas(text, 0.06, 1.12), subT = jzP(ctx, 'sub', false) ? ld1_alt(ctx) : null;
        var size = Math.min(ld1_fit(text, maxW, maxH, 0.06, 1.12), u * 0.24, W * (arrow ? 0.8 : 0.9) / (m1.w + 1.5), H * 0.8 / (m1.h + 1.24 + (subT ? 0.3 : 0)));
        var mw = m1.w * size, mh = m1.h * size, ss = Math.max(jzSmallSize(ctx), size * 0.16), padX = size * 0.75, padY = size * 0.62;
        var bw = mw + padX * 2, bh = mh + padY * 2 + (subT ? ss * 1.8 : 0), ax = arrow ? bh * 0.42 * dir : 0, cx = W / 2 - ax / 2, cy = H / 2, x0 = cx - bw / 2, y0 = cy - bh / 2;
        var DK = ld1_dark(sc), dark = jzLum(sc.bg) < 0.4, board = dark ? jzMixHex(sc.bg, sc.fg, 0.1) : DK, bulbC = null, textC = null, cand = [sc.accent, ld1_light(sc), sc.accent2];
        for (i = 0; i < cand.length && !bulbC; i++) if (cand[i] && jzContrast(cand[i], board) >= 2) bulbC = cand[i];
        bulbC = bulbC || ld1_light(sc);
        cand = [ld1_light(sc), sc.fg, sc.accent];
        for (i = 0; i < cand.length && !textC; i++) if (cand[i] && jzContrast(cand[i], board) >= 3) textC = cand[i];
        textC = textC || ld1_onCol(sc, board);
        var TH = ld1_H(ctx) + 'var qq=ob(cl(time/0.35),1.4)*(1-0.1*ic(PO));';
        var shape = null, tip;
        if (arrow) {
            tip = dir > 0 ? [x0 + bw + bh * 0.5, cy] : [x0 - bh * 0.5, cy];
            shape = dir > 0 ? [[x0, y0], [x0 + bw, y0], [x0 + bw, y0 - bh * 0.12], tip, [x0 + bw, y0 + bh * 1.12], [x0 + bw, y0 + bh], [x0, y0 + bh]]
                : [[x0 + bw, y0], [x0, y0], [x0, y0 - bh * 0.12], tip, [x0, y0 + bh * 1.12], [x0, y0 + bh], [x0 + bw, y0 + bh]];
        }
        // the sign (scaled from its centre with the pop)
        var S = jzShapeLayer(ctx, 'bulb sign', cx, cy);
        jzXf(S, 'ADBE Anchor Point').setValue([cx, cy]);
        jzSetExpr(jzXf(S, 'ADBE Scale'), TH + '[value[0]*qq,value[1]*qq]');
        jzSetExpr(jzXf(S, 'ADBE Opacity'), TH + '(qq<=0.01?0:100)*K');
        var r = jzClamp(size * 0.075, 4 * ctx.u, u * 0.022), rings = shp === 'double' && !arrow ? [0.95, 0.86] : [arrow ? 0.93 : 0.95];
        var lw0 = Math.max(1.5 * ctx.u, u * 0.003);
        for (var ri = 0; ri < rings.length; ri++) {
            var k = rings[ri], col = ri ? (jzContrast(sc.accent2 || bulbC, board) > 2 ? (sc.accent2 || bulbC) : bulbC) : bulbC, path = null, per;
            var gR = jzGrp(S, 'bulbs ' + (ri + 1));
            var addRing = function (gg) {
                if (arrow) { var pp = []; for (var z = 0; z < shape.length; z++) pp.push([cx + (shape[z][0] - cx) * k, cy + (shape[z][1] - cy) * k]); jzAddPath(gg, pp, true); return ld1_perim(pp); }
                var d = size * 0.3 * (1 - k), ww = bw - d * 2, hh2 = bh - d * 2 * (bh / bw), rr = Math.min(size * 0.3 * k, ww / 2, hh2 / 2);
                jzAddRect(gg, ww, hh2, rr, cx, cy);
                return 2 * (ww + hh2) - 8 * rr + 2 * Math.PI * rr;
            };
            var N = 0, sp = 1;
            // layers of the bulb ring, top first: highlights, lit bulbs, glow, dim-lit, sockets
            var parts = [['shine', '#FFFFFF', r * 0.7, 70, [-r * 0.25, -r * 0.3]], ['lit', col, r * 2, 100, null], ['glow', col, r * 4.2, 16, null], ['dim', jzMixHex(jzMixHex(board, col, 0.3), col, chase === 'alt' ? 0.2 : chase === 'wave' ? 0.35 : 0.18), r * 2, 100, null], ['sockets', jzMixHex(board, col, 0.22), r * 2, 100, null]];
            for (var pi = 0; pi < parts.length; pi++) {
                var gp = ld1_sub(gR, parts[pi][0]), L0 = addRing(gp);
                if (!N) { N = Math.max(4, Math.min(140, Math.round(L0 / (r * 3.3)))); sp = L0 / N; }
                var st = jzAddStroke(gp, parts[pi][1], parts[pi][2], parts[pi][3]);
                ld1_cap(st, 2);
                var lit = pi < 3, period = chase === 'alt' ? 2 : 3;
                var offE = null;
                if (lit) {
                    if (chase === 'alt') offE = ld1_H(ctx) + '((Math.floor(time*3)+' + ri + ')%2)*' + jzN(sp);
                    else offE = ld1_H(ctx) + 'var st=Math.floor(time*' + (chase === 'wave' ? 5 : 9) + ')*' + dir + '+' + (ri ? 0 : 1) + ';(((st%3)+3)%3)*' + jzN(sp);
                }
                ld1_dash(st, 0.01, (lit ? period * sp : sp) - 0.01, offE);
                if (parts[pi][4]) jzGX(gp).property('ADBE Vector Position').setValue(parts[pi][4]);
                if (pi < 4) jzAddTrimPaths(gp, ld1_H(ctx) + 'iocu((time-' + jzN(0.1 + ri * 0.1) + ')/0.6)*100', ld1_H(ctx) + 'Math.min(ic(PO),iocu((time-' + jzN(0.1 + ri * 0.1) + ')/0.6))*100');
            }
        }
        var gO = jzGrp(S, 'board');
        if (arrow) jzAddPath(gO, shape, true); else jzAddRect(gO, bw, bh, size * 0.3, cx, cy);
        jzAddStroke(gO, jzMixHex(board, bulbC, 0.35), lw0); jzAddFill(gO, board);
        var gSh = jzGrp(S, 'shadow');
        if (arrow) jzAddPath(gSh, shape, true); else jzAddRect(gSh, bw, bh, size * 0.3, cx, cy);
        jzAddFill(gSh, DK); ld1_gOp(gSh, '30'); jzGX(gSh).property('ADBE Vector Position').setValue([u * 0.012, u * 0.016]);
        // lyric + sub copy ride on the sign
        var ty = cy - (subT ? ss * 0.9 : 0);
        var L = ld1_T(ctx, text, { font: font, size: size, color: textC, x: cx, y: ty, track: 0.06, lead: 1.12, name: jzFlat(c.text) });
        ld1_parent(L, S);
        ld1_anim(ctx, L, { mi: 0, noHold: ld1_plateHold(ctx) });
        if (subT) {
            var t = jzChars(subT).length > 28 ? jzChars(subT).slice(0, 27).join('') + '…' : subT;
            var sz = Math.min(ss, ld1_fit(t, bw - padX, ss * 1.2, 0.18, 1.2));
            var SB = jzText(ctx, t, { font: jzBodyF(ctx), size: sz, track: 0.18, color: bulbC, x: cx, y: cy + mh / 2 + padY * 0.1, name: 'bulb sign copy' });
            ld1_parent(SB, S); ld1_opx(ctx, SB, 'oe((time-0.3)/0.3)*K');
        }
        return ld1_box(cx - mw / 2, ty - mh / 2, cx + mw / 2, ty + mh / 2);
    }
});

/* ================================================================== 14 ledScroll — 電光掲示板 */
// LED dots = a dot grid (ellipse + two repeaters) used as the alpha matte of the scrolling text; a dim copy shows the off LEDs
ld1_reg('ledScroll', {
    plan: function (rng, cut, st) {
        return { font: rng.pick(['dot', 'dot'].concat(jzFontsOf(st, ['display', 'body']))), col: rng.pick(['accent', 'accent', 'fg', 'accent2']), info: rng.pick(['top', 'bottom', 'none', 'bottom']), mods: rng.int(3, 6), y: rng.pick([0.5, 0.5, 0.42, 0.58]) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, u = jzU(ctx), i, j;
        var text = jzFlat(c.text), n = jzCount(text);
        if (!n) return null;
        var font = jzP(ctx, 'font', 'dot'), info = jzP(ctx, 'info', 'bottom'), mods = jzP(ctx, 'mods', 4), cl = jzP(ctx, 'col', 'accent');
        var fx0 = W * 0.03, fw = W * 0.94, adv0 = ld1_lineW(text, 0.08);
        var size = jzClamp((fw - W * 0.04) * 0.9 / Math.max(0.5, adv0), u * 0.1, Math.min(u * 0.2, H * 0.2)), p = size / 9.5;
        var ph = size * 1.36, infoH = info === 'none' ? 0 : size * 0.56, fr = size * 0.2, fh = ph + infoH + fr * 2 + (infoH ? fr * 0.6 : 0), fy0 = H * jzP(ctx, 'y', 0.5) - fh / 2;
        var DK = ld1_dark(sc), frameC = jzMixHex(DK, sc.sub, jzLum(sc.bg) < 0.4 ? 0.25 : 0.2), panel = jzMixHex(DK, '#000000', 0.5), ledC = null, infoC = null, i2;
        var cand = [cl === 'fg' ? ld1_light(sc) : cl === 'accent2' ? sc.accent2 : sc.accent, sc.accent, ld1_light(sc)];
        for (i = 0; i < cand.length && !ledC; i++) if (cand[i] && jzContrast(cand[i], panel) >= 3) ledC = cand[i];
        ledC = ledC || '#FFFFFF';
        cand = [sc.accent2, sc.accent, ld1_light(sc)];
        for (i = 0; i < cand.length && !infoC; i++) if (cand[i] && cand[i] !== ledC && jzContrast(cand[i], panel) >= 3) infoC = cand[i];
        infoC = infoC || ld1_light(sc);
        var TH = ld1_H(ctx) + 'var ee=oc(time/0.35),hw=' + jzN(fw / 2) + '*ee;';
        // frame + module seams + bolts
        var F = jzShapeLayer(ctx, 'led frame', 0, 0), mw = fw / mods;
        var gb = jzGrp(F, 'bolts');
        for (i = 0; i < mods; i++) for (j = 0; j < 4; j++) {
            var bx = j % 2 ? fx0 + (i + 1) * mw - fr * 0.6 : fx0 + i * mw + fr * 0.6, by = j < 2 ? fy0 + fr * 0.5 : fy0 + fh - fr * 0.5, gq = ld1_sub(gb, 'bolt');
            jzAddEllipse(gq, fr * 0.28, fr * 0.28, bx, by); ld1_gOp(gq, TH + '(Math.abs(' + jzN(bx - W / 2) + ')<hw)?100:0');
        }
        jzAddFill(gb, jzMixHex(frameC, ld1_light(sc), 0.3));
        var gs = jzGrp(F, 'seams');
        for (i = 1; i < mods; i++) { var sxp = fx0 + i * mw, gq2 = ld1_sub(gs, 'seam'); ld1_rr(gq2, 2 * ctx.u, fh, 0, sxp, fy0 + fh / 2); ld1_gOp(gq2, TH + '(Math.abs(' + jzN(sxp - W / 2) + ')<hw)?100:0'); }
        jzAddFill(gs, jzMixHex(frameC, '#000000', 0.35));
        var mainY = info === 'top' ? fy0 + fr + infoH + fr * 0.6 : fy0 + fr, panels = [{ y: mainY, h: ph, col: ledC }];
        if (infoH) panels.push({ y: info === 'top' ? fy0 + fr : mainY + ph + fr * 0.6, h: infoH, col: infoC });
        for (i = 0; i < panels.length; i++) { var gpn = jzGrp(F, 'panel ' + (i + 1)), rp = ld1_rr(gpn, fw - fr * 2, panels[i].h, 0, W / 2, panels[i].y + panels[i].h / 2); jzSetExpr(rp.property('ADBE Vector Rect Size'), TH + '[Math.max(0.5,hw*2-' + jzN(fr * 2) + '),' + jzN(panels[i].h) + ']'); jzAddFill(gpn, panel); }
        var gf = jzGrp(F, 'frame'), rf = ld1_rr(gf, fw, fh, fr * 0.6, W / 2, fy0 + fh / 2);
        jzSetExpr(rf.property('ADBE Vector Rect Size'), TH + '[Math.max(0.5,hw*2),' + jzN(fh) + ']');
        jzAddFill(gf, frameC);
        ld1_opx(ctx, F, 'K');
        // dot grids: cols x rows of LEDs over a panel (x-scaled with the frame as it opens)
        function dots(name, P0, col) {
            var D = jzShapeLayer(ctx, name, W / 2, 0), g = jzGrp(D, 'leds'), cols = Math.floor((fw - fr * 2) / p), rows = Math.max(1, Math.floor(P0.h / p));
            var gx0 = W / 2 - cols * p / 2, gy0 = P0.y + (P0.h - rows * p) / 2;
            jzXf(D, 'ADBE Anchor Point').setValue([W / 2, 0]);
            jzAddEllipse(g, p * 0.72, p * 0.72, gx0 + p / 2, gy0 + p / 2);
            ld1_rep(g, cols, p, 0); ld1_rep(g, rows, 0, p);
            jzAddFill(g, col);
            jzSetExpr(jzXf(D, 'ADBE Scale'), TH + '[value[0]*ee,value[1]]');
            return D;
        }
        for (i = 0; i < panels.length; i++) { var DO = dots('led off ' + (i + 1), panels[i], jzMixHex(panel, panels[i].col, 0.13)); ld1_opx(ctx, DO, 'K'); }
        // main text: slides in and stops (or scrolls as a marquee when too long); an empty shape layer carries the move
        var P0 = panels[0], m = ld1_lineW(text, 0.08) * size, pw0 = fw - fr * 2, fits = m <= pw0 * 0.94, cyy = P0.y + P0.h / 2;
        var MV = jzShapeLayer(ctx, 'led scroller', W / 2, cyy), mvH;
        jzXf(MV, 'ADBE Anchor Point').setValue([W / 2, cyy]);       // anchor = position: children keep comp coordinates
        if (fits) {
            var tIn = jzClamp(c.dur * 0.28, 0.35, 0.9), tOut = Math.max(0.2, c.outDur || 0.3);
            mvH = TH + 'var a=oc(time/' + jzN(tIn) + '),b=ic((time-' + jzN(c.dur - tOut) + ')/' + jzN(tOut) + ');var x=' + jzN(W / 2 + pw0 / 2 + m / 2) + '+(' + jzN(W / 2) + '-' + jzN(W / 2 + pw0 / 2 + m / 2) + ')*a-b*' + jzN(pw0 / 2 + m / 2) + ';';
        } else {
            var perS = m + size * 2, v = Math.max(W * 0.35, perS / Math.max(0.8, c.dur * 0.9));
            mvH = TH + 'var x=' + jzN(W / 2 + pw0 / 2 + m / 2) + '-((time*' + jzN(v) + ')%' + jzN(perS) + ');';
        }
        jzSetExpr(jzXf(MV, 'ADBE Position'), mvH + '[Math.round(x/' + jzN(p) + ')*' + jzN(p) + ',value[1]]');
        var str = fits ? text : text + '　　' + text + '　　' + text, off = fits ? 0 : m + size * 2;
        var LT = ld1_T(ctx, str, { font: font, size: size, color: ledC, x: W / 2 + off, y: cyy, track: 0.08, name: text });
        ld1_parent(LT, MV);
        ld1_anim(ctx, LT, { mi: 0, noHold: true, treat: false });
        var DM = dots('led matte 1', P0, '#FFFFFF');
        ld1_matte(LT, DM);
        // info line
        if (infoH) {
            var P1 = panels[1], ac = ld1_alt(ctx), inf = 'LINE ' + jzLineNo(ctx) + '  ◆  ' + jzFmtTime(c.start || 0) + (/^No\./.test(ac) ? '' : '  ◆  ' + ac) + '   ◆   ';
            var fs = P1.h * 0.72, im = ld1_lineW(inf, 0.1) * fs, reps = Math.ceil((fw + im) / Math.max(1, im)) + 1, s4 = '';
            for (i = 0; i < reps; i++) s4 += inf;
            var IT = jzText(ctx, s4, { font: font, size: fs, align: 'left', x: W / 2 - pw0 / 2, y: P1.y + P1.h / 2, track: 0.1, color: infoC, name: 'led info' });
            jzSetExpr(jzXf(IT, 'ADBE Position'), TH + 'var x=value[0]-((time*' + jzN(size * 2.2) + ')%' + jzN(im) + ');[Math.round(x/' + jzN(p) + ')*' + jzN(p) + ',value[1]]');
            ld1_opx(ctx, IT, 'oe((time-0.2)/0.3)*K');
            var DI = dots('led matte 2', P1, '#FFFFFF');
            ld1_matte(IT, DI);
        }
        return ld1_box(Math.max(W / 2 - pw0 / 2, W / 2 - m / 2), P0.y, Math.min(W / 2 + pw0 / 2, W / 2 + m / 2), P0.y + P0.h);
    }
});

/* ================================================================== 15 billboard — 看板 */
ld1_reg('billboard', {
    plan: function (rng, cut, st) {
        return { font: rng.pick(jzFontsOf(st, ['display', 'serif'])), face: rng.pick(['light', 'light', 'accent']), lamps: rng.int(3, 4), sweep: rng.range(8, 16), tag: rng.chance(0.7) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, s = c.seed, u = jzU(ctx), port = jzPortrait(ctx), i;
        var font = jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'display')), text = ld1_brk(c.text, port ? 5 : 9), tag = !!jzP(ctx, 'tag', true), NL = jzP(ctx, 'lamps', 3), sweep = jzP(ctx, 'sweep', 12);
        var bw = W * (port ? 0.86 : 0.72), bh = Math.min(H * (port ? 0.3 : 0.42), bw * 0.5), bx = W / 2 - bw / 2, by = H * (port ? 0.3 : 0.16), groundY = H * 0.94;
        var DK = ld1_dark(sc), steel = jzMixHex(DK, sc.sub, 0.35), faceC;
        if (jzP(ctx, 'face', 'light') === 'accent' || jzLum(sc.bg) > 0.55) {
            if (jzLum(sc.bg) > 0.55) { var fc = [sc.accent, sc.ink, sc.fg]; faceC = sc.fg; for (i = 0; i < fc.length; i++) if (fc[i] && jzContrast(fc[i], sc.bg) >= 1.8) { faceC = fc[i]; break; } }
            else faceC = ld1_plateCol(sc, [sc.accent, sc.ink]);
        } else faceC = jzMixHex(ld1_light(sc), sc.accent, 0.06);
        var tc = ld1_onCol(sc, faceC), lw = Math.max(1.2 * ctx.u, u * 0.0025);
        var TH = ld1_H(ctx) + 'var rise=(1-oc(time/0.55))*' + jzN(H * 0.08) + '+ic(PO)*' + jzN(H * 0.05) + ',a0=oc(time/0.35)*K;' +
            'function on(i){var t1=0.15+i*0.12,o=time>t1+0.25?1:time>t1?(hh(Math.floor(time*24)*7+i*13+' + (s % 997) + ')<0.55?1:0.1):0;return o*(1-ic(cl(PO*1.6-i*0.12)));}';
        // ground + posts (their tops follow the board)
        var ST = jzShapeLayer(ctx, 'billboard stand', 0, 0), pw = bw * 0.035;
        var gg = jzGrp(ST, 'ground'); jzAddPath(gg, [[W * 0.03, groundY], [W * 0.97, groundY]], false); jzAddStroke(gg, sc.sub, lw); ld1_gOp(gg, '50');
        for (i = 0; i < 2; i++) {
            var px = bx + bw * (i ? 0.78 : 0.22), gp = jzGrp(ST, 'post ' + (i + 1)), rp = ld1_rr(gp, pw, 10, 0);
            jzSetExpr(rp.property('ADBE Vector Rect Size'), TH + '[' + jzN(pw) + ',Math.max(1,' + jzN(groundY - by - bh) + '-rise)]');
            jzSetExpr(rp.property('ADBE Vector Rect Position'), TH + '[' + jzN(px) + ',(' + jzN(by + bh) + '+rise+' + jzN(groundY) + ')/2]');
            jzAddFill(gp, steel);
        }
        var x1 = bx + bw * 0.22, x2 = bx + bw * 0.78, gx = jzGrp(ST, 'bracing');
        ld1_seg(gx, 'brace 1', TH, 'var yb=' + jzN(by + bh) + '+rise,Lp=' + jzN(groundY) + '-yb;var X0=' + jzN(x1) + ',Y0=yb+Lp*0.25,X1=' + jzN(x2) + ',Y1=' + jzN(groundY) + '-Lp*0.1', lw);
        ld1_seg(gx, 'brace 2', TH, 'var yb=' + jzN(by + bh) + '+rise,Lp=' + jzN(groundY) + '-yb;var X0=' + jzN(x2) + ',Y0=yb+Lp*0.25,X1=' + jzN(x1) + ',Y1=' + jzN(groundY) + '-Lp*0.1', lw);
        jzAddFill(gx, steel);
        jzSetExpr(jzXf(ST, 'ADBE Opacity'), TH + '100*a0');
        // the board rig (catwalk, frame, face) moves with "rise"
        var B = jzShapeLayer(ctx, 'billboard', 0, 0), cwY = by + bh + bh * 0.1;
        jzSetExpr(jzXf(B, 'ADBE Position'), TH + '[value[0],value[1]+rise]');
        var gcw = jzGrp(B, 'catwalk');
        ld1_rr(gcw, bw * 0.92, bh * 0.025, 0, W / 2, cwY + bh * 0.0125);
        for (i = 0; i <= 10; i++) ld1_rr(gcw, lw, bh * 0.07, 0, bx + bw * (0.04 + 0.92 * i / 10), cwY - bh * 0.035);
        ld1_rr(gcw, bw * 0.92, lw, 0, W / 2, cwY - bh * 0.07);
        jzAddFill(gcw, steel);
        var gfa = jzGrp(B, 'face'); ld1_rr(gfa, bw, bh, 0, W / 2, by + bh / 2); jzAddFill(gfa, jzMixHex(faceC, DK, 0.28));
        var gfr = jzGrp(B, 'frame'); ld1_rr(gfr, bw * 1.03, bh + bw * 0.03, 0, W / 2, by + bh / 2); jzAddFill(gfr, steel);
        jzSetExpr(jzXf(B, 'ADBE Opacity'), TH + '100*a0');
        // lamp light: soft cones (three stacked translucent lengths) sweeping over the face, clipped to it, + the lit face
        var CN = jzShapeLayer(ctx, 'billboard light', 0, 0);
        jzSetExpr(jzXf(CN, 'ADBE Position'), TH + '[value[0],value[1]+rise]');
        var gl = jzGrp(CN, 'lit face'); ld1_rr(gl, bw, bh, 0, W / 2, by + bh / 2); jzAddFill(gl, faceC);
        var litE = '(0'; for (i = 0; i < NL; i++) litE += '+on(' + i + ')'; litE += ')/' + NL;
        ld1_gOp(gl, TH + '55*' + litE);
        for (i = 0; i < NL; i++) {
            var lx = bx + bw * (i + 0.5) / NL, ly = by + bh + bh * 0.06, spread = bw / NL * 0.75, gc = jzGrp(CN, 'cone ' + (i + 1));
            for (var z = 0; z < 3; z++) {
                var len = bh * [0.5, 0.85, 1.25][z], sprd = spread * len / (bh * 1.25), gz = ld1_sub(gc, 'beam ' + (z + 1));
                jzAddPath(gz, [[-bw * 0.02, 0], [-sprd, -len], [sprd, -len], [bw * 0.02, 0]], true); jzAddFill(gz, faceC); ld1_gOp(gz, '32');
            }
            jzGX(gc).property('ADBE Vector Position').setValue([lx, ly]);
            ld1_gRot(gc, TH + 'Math.sin(time*0.8+' + jzN(i * 1.7) + ')*' + jzN(sweep));
            ld1_gOp(gc, TH + 'on(' + i + ')*100');
        }
        var mk = jzMaskRect(CN, bx, by, bx + bw, by + bh);
        jzSetExpr(jzXf(CN, 'ADBE Opacity'), TH + '100*a0');
        // lamp housings + arms
        var LH = jzShapeLayer(ctx, 'billboard lamps', 0, 0);
        jzSetExpr(jzXf(LH, 'ADBE Position'), TH + '[value[0],value[1]+rise]');
        for (i = 0; i < NL; i++) {
            var lx2 = bx + bw * (i + 0.5) / NL, ly2 = by + bh + bh * 0.06, gh = jzGrp(LH, 'lamp ' + (i + 1));
            var gbulb = ld1_sub(gh, 'bulb'); jzAddEllipse(gbulb, bh * 0.05, bh * 0.05, lx2, ly2 - bh * 0.03); jzAddFill(gbulb, ld1_light(sc)); ld1_gOp(gbulb, TH + '(on(' + i + ')>0.5)?100:0');
            var gho = ld1_sub(gh, 'housing'); jzAddPath(gho, [[lx2 - bh * 0.05, ly2 + bh * 0.03], [lx2 + bh * 0.05, ly2 + bh * 0.03], [lx2 + bh * 0.035, ly2 - bh * 0.03], [lx2 - bh * 0.035, ly2 - bh * 0.03]], true);
            ld1_rr(gho, lw * 1.5, cwY - ly2 + bh * 0.02, 0, lx2, (cwY + ly2 + bh * 0.02) / 2); jzAddFill(gho, steel);
        }
        jzSetExpr(jzXf(LH, 'ADBE Opacity'), TH + '100*a0');
        // lyric + tags ride on the board
        var size = Math.min(ld1_fit(text, bw * 0.84, bh * 0.66, 0.04, 1.1), bh * 0.6), ty = by + bh / 2 + (tag ? bh * 0.03 : 0);
        var L = ld1_T(ctx, text, { font: font, size: size, color: tc, x: W / 2, y: ty, track: 0.04, lead: 1.1, name: jzFlat(c.text) });
        ld1_parent(L, B);
        ld1_anim(ctx, L, { mi: ld1_mi(ctx, 0.3), noHold: ld1_plateHold(ctx) });
        if (tag) {
            var fs = Math.max(jzSmallSize(ctx) * 0.8, bh * 0.05);
            var T1 = jzText(ctx, 'No.' + jzLineNo(ctx), { font: jzMonoF(ctx), size: fs, align: 'left', track: 0.2, x: bx + bw * 0.025, y: by + fs * 1.1, color: tc, name: 'billboard no' });
            var T2 = jzText(ctx, jzFmtTime(c.start || 0), { font: jzMonoF(ctx), size: fs, align: 'right', track: 0.2, x: bx + bw * 0.975, y: by + fs * 1.1, color: tc, name: 'billboard time' });
            ld1_parent(T1, B); ld1_parent(T2, B);
            jzSetExpr(jzXf(T1, 'ADBE Opacity'), TH + '70*a0'); jzSetExpr(jzXf(T2, 'ADBE Opacity'), TH + '70*a0');
        }
        var m = ld1_meas(text, 0.04, 1.1);
        return ld1_box(W / 2 - m.w * size / 2, ty - m.h * size / 2, W / 2 + m.w * size / 2, ty + m.h * size / 2);
    }
});

/* ================================================================== 16 crowdBubbles — 吹き出しの群れ */
var LD1_REACT = ['\u2026', '\uFF01\uFF1F', '\u266A', '\uFF1F', '\uFF01', '\u2026\uFF01', '\u2661'];
// bubble outline in local px: kind round / rect / shout, tail towards tailDir
function ld1_bubble(g, kind, w, h, tailDir, fill, stroke, lw) {
    var tx = tailDir * w * 0.18, ty = h * 0.42, tail = [[tx - w * 0.06 * tailDir, ty - h * 0.05], [tx + w * 0.02 * tailDir, ty - h * 0.05], [tx - w * 0.1 * tailDir, h * 0.5 + h * 0.3]];
    if (stroke) { var gl = ld1_sub(g, 'tail line'); jzAddPath(gl, [tail[0], tail[2], tail[1]], false); jzAddStroke(gl, stroke, lw); }
    var gt = ld1_sub(g, 'tail'); jzAddPath(gt, tail, true); jzAddFill(gt, fill);
    var gb = ld1_sub(g, 'body');
    if (kind === 'rect') jzAddRect(gb, w, h, h * 0.35);
    else if (kind === 'shout') { var pts = []; for (var i = 0; i < 22; i++) { var t = i / 22 * Math.PI * 2, rr = i % 2 ? 0.8 : 1.12; pts.push([Math.cos(t) * w / 2 * rr, Math.sin(t) * h / 2 * rr]); } jzAddPath(gb, pts, true); }
    else jzAddEllipse(gb, w, h);
    if (stroke) jzAddStroke(gb, stroke, lw);
    jzAddFill(gb, fill);
    return g;
}
ld1_reg('crowdBubbles', {
    plan: function (rng, cut, st) {
        return { font: rng.pick(jzFontsOf(st, ['display', 'body'])), sf: rng.pick(jzFontsOf(st, ['body', 'display'])), big: rng.pick(['round', 'round', 'rect', 'shout']), style: rng.pick(['mixed', 'outline', 'filled']), count: rng.int(10, 16), side: rng.pick([1, -1]) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, s = c.seed, u = jzU(ctx), port = jzPortrait(ctx), i, j, g2;
        var font = jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'display')), sf = jzP(ctx, 'sf', jzBodyF(ctx)), style = jzP(ctx, 'style', 'mixed'), bk = jzP(ctx, 'big', 'round'), side = jzP(ctx, 'side', 1) < 0 ? -1 : 1;
        var text = ld1_brk(c.text, port ? 5 : 8), size = Math.min(ld1_fit(text, W * (port ? 0.62 : 0.46), H * (port ? 0.22 : 0.3), 0.03, 1.15), u * 0.15), m = ld1_meas(text, 0.03, 1.15);
        var bw = m.w * size + size * 1.4, bh = m.h * size + size * 1.1, cx = W / 2, cy = H / 2 - bh * 0.05, bigC = null, cand = [sc.accent, ld1_light(sc)];
        for (i = 0; i < cand.length && !bigC; i++) if (cand[i] && jzContrast(cand[i], sc.bg) >= 1.8) bigC = cand[i];
        bigC = bigC || ld1_light(sc);
        var tc = ld1_onCol(sc, bigC), lw = Math.max(1.2 * ctx.u, u * 0.0025);
        // fragments for the crowd
        var words = [], src = jzChunk(jzFlat(c.lineText || c.text)).concat(jzChunk(jzFlat(c.text)));
        for (i = 0; i < src.length; i++) { var pp = jzSplitLines(src[i], 4).split('\r'); for (j = 0; j < pp.length; j++) if (pp[j] && jzIndexOf(words, pp[j]) < 0 && !/["\\]/.test(pp[j])) words.push(pp[j]); }
        function frag(q) { var r = jzHash(s, q, 41) % 10; if (r < 6 && words.length) return words[jzHash(s, q, 42) % words.length]; return LD1_REACT[jzHash(s, q, 43) % LD1_REACT.length]; }
        // slots around the big bubble
        var slots = [], gxN = port ? 3 : 6, gyN = port ? 8 : 5;
        for (var gy = 0; gy < gyN; gy++) for (var gx = 0; gx < gxN; gx++) {
            var x = W * (0.1 + 0.8 * (gx + 0.5) / gxN) + (jzR(s, gx, gy, 1) * 2 - 1) * W * 0.04, y = H * (0.1 + 0.8 * (gy + 0.5) / gyN) + (jzR(s, gx, gy, 2) * 2 - 1) * H * 0.03;
            if (Math.abs(x - cx) < bw * 0.5 + W * (port ? 0.12 : 0.07) && Math.abs(y - cy) < bh * 0.5 + H * (port ? 0.04 : 0.07)) continue;
            slots.push([x, y, jzR(s, gx, gy, 3)]);
        }
        slots.sort(function (a, b) { return a[2] - b[2]; });
        var cnt = Math.min(jzP(ctx, 'count', 12), slots.length), ss = Math.max(jzSmallSize(ctx) * 1.4, Math.min(size * 0.42, u * 0.05));
        var life = jzClamp(c.dur * 0.7, 1.2, 3), jx = W * 0.8 / gxN * 0.18, jy = H * 0.8 / gyN * 0.14, NG = Math.ceil((c.dur + 0.7) / life) + 1;
        var T0 = [], FR = [], LN = [], WS = [], JX = [], JY = [], KR = [], SX = [], SY = [], FI = [];
        for (i = 0; i < cnt; i++) {
            T0.push(0.05 + jzR(s, i, 5) * Math.min(0.6, c.dur * 0.25)); SX.push(slots[i][0]); SY.push(slots[i][1]);
            FI.push(style === 'filled' || (style === 'mixed' && jzR(s, i, 9) < 0.45));
            var fr = [], ln = [], ws = [], jxs = [], jys = [], kr = [];
            for (g2 = 0; g2 < NG; g2++) {
                var t = frag(i * 7 + g2); fr.push(t); ln.push(jzChars(t).length); ws.push(ld1_lineW(t, 0.04) * ss + ss * 1.4);
                jxs.push((jzR(s, i, g2, 44) * 2 - 1) * jx); jys.push((jzR(s, i, g2, 45) * 2 - 1) * jy); kr.push(jzR(s, i, g2, 8) < 0.5 ? 1 : 0);
            }
            FR.push(fr); LN.push(ln); WS.push(ws); JX.push(jxs); JY.push(jys); KR.push(kr);
        }
        function arr2(a) { var o = []; for (var z = 0; z < a.length; z++) o.push(ld1_arr(a[z])); return '[' + o.join(',') + ']'; }
        var CH = ld1_H(ctx) + 'var T0=' + ld1_arr(T0) + ',LF=' + jzN(life) + ',NG=' + NG + ',SX=' + ld1_arr(SX) + ',SY=' + ld1_arr(SY) + ',JX=' + arr2(JX) + ',JY=' + arr2(JY) + ',KR=' + arr2(KR) + ',WS=' + arr2(WS) + ',LN=' + arr2(LN) + ';' +
            'function gen(i){if(time<T0[i])return -1;return Math.min(NG-1,Math.floor((time-T0[i])/LF));}' +
            'function bub(i){var g=gen(i);if(g<0)return [0,0,0,0];var tl=time-T0[i]-g*LF,e=ob(cl(tl/0.22),2.2)*(1-ic(cl((tl-LF+0.2)/0.2)))*K;return [e,g,SX[i]+JX[i][g],SY[i]+JY[i][g]];}\n';
        // the crowd: one shape layer (a group per bubble; round / rect bodies swap per generation) + one text layer
        var CS = jzShapeLayer(ctx, 'crowd bubbles', 0, 0);
        for (i = 0; i < cnt; i++) {
            var gb = jzGrp(CS, 'bubble ' + (i + 1)), fcol = FI[i] ? jzMixHex(sc.bg, sc.fg, 0.14) : sc.bg, stc = FI[i] ? null : sc.sub, td = SX[i] < cx ? 1 : -1;
            for (var kd = 0; kd < 2; kd++) {
                var gk = ld1_bubble(ld1_sub(gb, kd ? 'rect' : 'round'), kd ? 'rect' : 'round', 100, ss * 2, td, fcol, stc, lw);
                ld1_gSc(gk, CH + 'var B=bub(' + i + '),w=WS[' + i + '][Math.max(0,B[1])];[w,100]');
                ld1_gOp(gk, CH + 'var B=bub(' + i + ');KR[' + i + '][Math.max(0,B[1])]===' + kd + '?100:0');
            }
            ld1_gPos(gb, CH + 'var B=bub(' + i + ');[B[2],B[3]]');
            ld1_gSc(gb, CH + 'var B=bub(' + i + ');[B[0]*100,B[0]*100]');
            ld1_gOp(gb, CH + 'var B=bub(' + i + ');B[0]>0.01?95:0');
        }
        // crowd texts: one line per bubble (the source text switches with the generations), each line moved onto its bubble
        var TX = jzText(ctx, ' ', { font: sf, size: ss, color: sc.sub, x: 0, y: 0, leading: ss, track: 0.04, name: 'crowd texts' });
        jzXf(TX, 'ADBE Anchor Point').setValue([0, 0]); jzXf(TX, 'ADBE Position').setValue([0, 0]);
        var CT = CH + 'var FR=[';
        for (i = 0; i < cnt; i++) CT += (i ? ',' : '') + ld1_strArr(FR[i]);
        CT += '];';
        try { TX.property('ADBE Text Properties').property('ADBE Text Document').expression = CT + 'var s="";for(var i=0;i<' + cnt + ';i++){if(i)s+="\\r";var g=gen(i);s+=g<0?" ":FR[i][g];}s'; } catch (eT) { jzWarn('crowd source: ' + eT.toString()); }
        var LNf = 'function lineOf(ti){var acc=0;for(var k=0;k<' + cnt + ';k++){var g=gen(k),n=g<0?1:LN[k][g];if(ti<=acc+n)return k;acc+=n;}return ' + (cnt - 1) + ';}var ln=lineOf(textIndex),B=bub(ln);';
        var KB = Math.max(W, H) * 3;
        jzAnimator(TX, 'JZ Crowd Place', [['ADBE Text Position 3D', [KB, KB, 0]]], CH + LNf + '[B[2]/' + jzN(KB) + '*100,(B[3]+' + jzN(LD1_CY * ss) + '-ln*' + jzN(ss) + ')/' + jzN(KB) + '*100,0]');
        jzAnimator(TX, 'JZ Crowd Show', [['ADBE Text Opacity', 0]], CH + LNf + '(1-cl((B[0]-0.5)*2))*100');
        var FIa = []; for (i = 0; i < cnt; i++) FIa.push(FI[i] ? 1 : 0);
        jzAnimator(TX, 'JZ Crowd Filled', [['ADBE Text Fill Color', jzHex(sc.fg)]], CH + 'var FI=' + ld1_arr(FIa) + ';' + LNf + 'FI[ln]*100');
        // the big bubble with the lyric (the lyric is parented to it)
        var BB = jzShapeLayer(ctx, 'big bubble', cx, cy);
        jzXf(BB, 'ADBE Anchor Point').setValue([cx, cy]);
        var gB = ld1_bubble(jzGrp(BB, 'bubble'), bk, bw * (bk === 'shout' ? 1.25 : 1), bh * (bk === 'shout' ? 1.3 : 1), side, bigC, null, lw);
        jzGX(gB).property('ADBE Vector Position').setValue([cx, cy]);
        var BQ = ld1_H(ctx) + 'var q=ob(cl((time-0.05)/0.3),1.8)*(1-0.2*ic(PO));';
        jzSetExpr(jzXf(BB, 'ADBE Scale'), BQ + '[value[0]*q,value[1]*q]');
        jzSetExpr(jzXf(BB, 'ADBE Opacity'), BQ + '(q<=0.01?0:100)*K');
        var L = ld1_T(ctx, text, { font: font, size: size, color: tc, x: cx, y: cy, track: 0.03, lead: 1.15, name: jzFlat(c.text) });
        ld1_parent(L, BB);
        ld1_anim(ctx, L, { mi: ld1_mi(ctx, 0.12), noHold: ld1_plateHold(ctx) });
        return ld1_box(cx - m.w * size / 2, cy - m.h * size / 2, cx + m.w * size / 2, cy + m.h * size / 2);
    }
});

/* ================================================================== 17 crossword — クロスワード */
ld1_reg('crossword', {
    plan: function (rng, cut, st) {
        return { font: rng.pick(jzFontsOf(st, ['display', 'serif'])), dens: rng.range(0.14, 0.22), fill: rng.int(2, 3), clue: rng.chance(0.8) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, s = c.seed, u = jzU(ctx), port = jzPortrait(ctx), i, j, r, cc;
        var font = jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'display')), dens = jzP(ctx, 'dens', 0.18), fillN = jzP(ctx, 'fill', 2), clue = !!jzP(ctx, 'clue', true);
        var t0 = jzFlat(c.text), all = jzChars(t0), chs = [];
        for (i = 0; i < all.length; i++) if (all[i] !== ' ') chs.push(all[i]);
        var n = chs.length;
        if (!n) return null;
        var maxRow = port ? 7 : 12, words = [];
        if (n > maxRow) { var ws = ld1_chunksK(t0, Math.ceil(n / maxRow)); for (i = 0; i < ws.length; i++) { var wa = jzChars(ws[i]), wo = []; for (j = 0; j < wa.length; j++) if (wa[j] !== ' ') wo.push(wa[j]); if (wo.length) words.push(wo); } }
        else words = [chs];
        var LW = 1; for (i = 0; i < words.length; i++) LW = Math.max(LW, words[i].length);
        var C = Math.max(LW + 2, port ? 7 : 9), R = words.length > 1 ? 7 : port ? 7 : 5;
        var below = clue && H > W * 0.7, clueW = clue && !below ? 0.24 : 0;
        var cell = Math.min(W * (0.88 - clueW) / C, H * (below ? 0.64 : 0.8) / R, u * 0.14), gw = C * cell, gh = R * cell, fsC = Math.max(jzSmallSize(ctx) * 1.15, cell * 0.24);
        var gx = (W - gw - (clueW ? W * clueW : 0)) / 2, gy = (H - gh - (below ? fsC * 5 : 0)) / 2;
        var rowsW = words.length > 2 ? [1, 3, 5] : words.length > 1 ? [1, 5] : [Math.floor(R / 2)], c0 = [];
        for (i = 0; i < words.length; i++) c0.push(Math.floor((C - words[i].length) / 2) - (jzHash(s, words[i].length, 0, 0) % 2 && C - words[i].length > 2 ? 1 : 0));
        function key(a, b) { return a * 64 + b; }
        var lyr = {}, black = {};
        for (i = 0; i < words.length; i++) for (j = 0; j < words[i].length; j++) lyr[key(rowsW[i], c0[i] + j)] = { ch: words[i][j], wi: i, j: j };
        for (r = 0; r < R; r++) for (cc = 0; cc < C; cc++) {
            var r2 = R - 1 - r, c2 = C - 1 - cc;
            if (lyr[key(r, cc)] || lyr[key(r2, c2)]) continue;
            if (jzR(s, Math.min(key(r, cc), key(r2, c2)), 3) < dens) { black[key(r, cc)] = 1; black[key(r2, c2)] = 1; }
        }
        for (i = 0; i < words.length; i++) { if (c0[i] > 0) black[key(rowsW[i], c0[i] - 1)] = 1; if (c0[i] + words[i].length < C) black[key(rowsW[i], c0[i] + words[i].length)] = 1; }
        function isW(a, b) { return a >= 0 && b >= 0 && a < R && b < C && !black[key(a, b)]; }
        var num = {}, kn = 1, numCount = 0;
        for (r = 0; r < R; r++) for (cc = 0; cc < C; cc++) {
            if (!isW(r, cc)) continue;
            if ((!isW(r, cc - 1) && isW(r, cc + 1)) || (!isW(r - 1, cc) && isW(r + 1, cc))) { num[key(r, cc)] = kn++; numCount++; }
        }
        // pencilled crossing entries
        var pool = [], own = jzChars(jzStrip((c.lineText || '') + c.text)), KA = jzChars(jzPool('hira'));
        for (i = 0; i < own.length; i++) if (!jzIsPunct(own[i]) && !jzIsLatin(own[i]) && 'ぁぃぅぇぉっゃゅょゎァィゥェォッャュョヮー'.indexOf(own[i]) < 0) pool.push(own[i]);
        for (i = 0; i < KA.length; i += 3) pool.push(KA[i]);
        var pencil = {}, fills = 0;
        for (i = 0; i < words.length; i++) for (j = 0; j < words[i].length; j++) {
            if (fills >= fillN * words.length || jzR(s, i, j, 5) > 0.45) continue;
            var col = c0[i] + j, rw = rowsW[i], a = rw, b = rw;
            while (isW(a - 1, col)) a--;
            while (isW(b + 1, col)) b++;
            if (b - a < 2) continue;
            fills++;
            for (var rr = a; rr <= b; rr++) if (!lyr[key(rr, col)]) pencil[key(rr, col)] = pool[jzHash(s, rr, col, 6) % pool.length];
        }
        var paperC = ld1_light(sc), inkC = ld1_dark(sc), lw = Math.max(1 * ctx.u, cell * 0.035), T1 = 0.25, per = jzClamp(c.dur * 0.4 / n, 0.04, 0.11);
        var TH = ld1_H(ctx) + 'var ga=oc(time/0.35)*K,typed=Math.floor((time-' + T1 + ')/' + jzN(per) + ');function ra(r){return cl(ga*' + R + '-r);}';
        // grid: frame + paper (unrolls downward), then per-row black cells and rules
        var GS = jzShapeLayer(ctx, 'crossword grid', 0, 0);
        var order = [];
        for (i = 0; i < words.length; i++) for (j = 0; j < words[i].length; j++) order.push([i, j]);
        var WI = [], WJ = [];
        for (i = 0; i < order.length; i++) { WI.push(order[i][0]); WJ.push(order[i][1]); }
        var HL = TH + 'var WI=' + ld1_arr(WI) + ',RW=' + ld1_arr(rowsW) + ',C0=' + ld1_arr(c0) + ',WJ=' + ld1_arr(WJ) + ';var cur=(typed>=0&&typed<' + n + ')?typed:-1,cw=cur>=0?WI[cur]:-1;';
        var gc = jzGrp(GS, 'cursor'); ld1_rr(gc, cell, cell, 0); jzAddFill(gc, sc.accent);
        ld1_gPos(gc, HL + 'cur<0?[0,0]:[' + jzN(gx + cell / 2) + '+(C0[cw]+WJ[cur])*' + jzN(cell) + ',' + jzN(gy + cell / 2) + '+RW[cw]*' + jzN(cell) + ']');
        ld1_gOp(gc, HL + 'cur<0?0:50');
        for (i = 0; i < words.length; i++) {
            var gw2 = jzGrp(GS, 'word ' + (i + 1)); ld1_rr(gw2, words[i].length * cell, cell, 0, gx + (c0[i] + words[i].length / 2) * cell, gy + (rowsW[i] + 0.5) * cell); jzAddFill(gw2, sc.accent);
            ld1_gOp(gw2, HL + '(cw===' + i + ')?20:(typed>=' + n + '?12:0)');
        }
        for (r = 0; r < R; r++) {
            var gr = jzGrp(GS, 'row ' + (r + 1));
            ld1_sub(gr, 'rules'); ld1_sub(gr, 'black');
            var grl = jzVecs(gr).property('rules'), gbl = jzVecs(gr).property('black');     // fetched after both exist (AE rule)
            ld1_rr(grl, gw, lw * 0.6, 0, gx + gw / 2, gy + (r + 1) * cell);
            for (cc = 0; cc < C; cc++) ld1_rr(grl, lw * 0.6, cell, 0, gx + (cc + 1) * cell, gy + (r + 0.5) * cell);
            jzAddFill(grl, inkC); ld1_gOp(grl, '55');
            var anyB = false;
            for (cc = 0; cc < C; cc++) if (black[key(r, cc)]) { ld1_rr(gbl, cell + 0.5, cell + 0.5, 0, gx + (cc + 0.5) * cell, gy + (r + 0.5) * cell); anyB = true; }
            if (anyB) jzAddFill(gbl, inkC);
            ld1_gOp(gr, TH + 'ra(' + r + ')*100');
        }
        // paper, then frame: each group is finished before the next one is added (AE invalidates older sibling refs)
        var gp = jzGrp(GS, 'paper'); ld1_rr(gp, gw, gh, 0, gw / 2, gh / 2); jzAddFill(gp, paperC);
        jzGX(gp).property('ADBE Vector Position').setValue([gx, gy]);
        ld1_gSc(gp, TH + '[100,ga*100]');
        var gf = jzGrp(GS, 'frame'); ld1_rr(gf, gw + lw * 4, gh + lw * 4, 0, gw / 2, gh / 2); jzAddFill(gf, inkC);
        jzGX(gf).property('ADBE Vector Position').setValue([gx, gy]);
        jzGX(gf).property('ADBE Vector Anchor').setValue([0, -lw * 2]);
        ld1_gSc(gf, TH + 'var h=' + jzN(gh) + ';[100,(h*ga+' + jzN(lw * 4) + ')/(h+' + jzN(lw * 4) + ')*100]');
        ld1_opx(ctx, GS, 'K');
        // clue numbers (one glyph per digit) + pencilled entries
        var ng = [], NP = [], NR = [], pg = [], PP = [], PR = [];
        for (r = 0; r < R; r++) for (cc = 0; cc < C; cc++) {
            var nm = num[key(r, cc)];
            if (nm) { var ds = jzChars(String(nm)); for (j = 0; j < ds.length; j++) { ng.push(ds[j]); NP.push([gx + cc * cell + cell * 0.07 + cell * 0.2 * 0.62 * (j + 0.5), gy + r * cell + cell * 0.15]); NR.push(r); } }
            if (pencil[key(r, cc)]) { pg.push(pencil[key(r, cc)]); PP.push([gx + (cc + 0.5) * cell, gy + r * cell + cell * 0.56]); PR.push(r); }
        }
        if (ng.length) {
            var NG = ld1_G(ctx, ng, { font: jzMonoF(ctx), size: cell * 0.2, color: inkC, name: 'crossword numbers', cx: W / 2, cy: H / 2 });
            ld1_place(NG, NP); jzAnimator(NG.L, 'JZ Row Show', [['ADBE Text Opacity', 0]], TH + 'var NR=' + ld1_arr(NR) + ';(1-0.8*ra(NR[textIndex-1]))*100'); ld1_opx(ctx, NG.L, 'K');
        }
        if (pg.length) {
            var PGL = ld1_G(ctx, pg, { font: jzBodyF(ctx), size: cell * 0.46, color: jzMixHex(paperC, inkC, 0.38), name: 'crossword pencil', cx: W / 2, cy: H / 2 });
            ld1_place(PGL, PP); jzAnimator(PGL.L, 'JZ Pencil Show', [['ADBE Text Opacity', 0]], TH + 'var PR=' + ld1_arr(PR) + ',r=PR[textIndex-1];(1-oe((time-0.3-r*0.03)/0.3)*ra(r))*100'); ld1_opx(ctx, PGL.L, 'K');
        }
        // the lyric, typed into its row(s) one cell after another
        var gl = [], LP = [], bb = null;
        for (i = 0; i < order.length; i++) {
            var wi = order[i][0], jj = order[i][1], lx = gx + (c0[wi] + jj + 0.5) * cell, ly = gy + (rowsW[wi] + 0.56) * cell;
            gl.push(words[wi][jj]); LP.push([lx, ly]);
            bb = jzUnion(bb, ld1_box(lx - cell / 2, ly - cell * 0.56, lx + cell / 2, ly + cell * 0.44));
        }
        var G = ld1_G(ctx, gl, { font: font, size: cell * 0.7, color: inkC, name: t0, cx: W / 2, cy: H / 2 });
        ld1_place(G, LP);
        jzAnimator(G.L, 'JZ Typed', [['ADBE Text Opacity', 0]], TH + '(time<' + T1 + '+(textIndex-1)*' + jzN(per) + ')?100:0');
        ld1_anim(ctx, G.L, { mi: ld1_mi(ctx, T1), noHold: ld1_plateHold(ctx) });
        // clues
        if (clue) {
            var fs = fsC, cxl = below ? gx : gx + gw + W * 0.035, cyl = below ? gy + gh + fs * 1.6 : gy + fs;
            var n1 = num[key(rowsW[0], c0[0])] || 1, rom = jzRomajiOf(ctx);
            var lines = [['\u30E8\u30B3\u306E\u30AB\u30AE', sc.accent, jzMonoF(ctx)], [n1 + '  ' + (c.note || rom || '(' + n + ')'), sc.fg, jzBodyF(ctx)], ['\u30BF\u30C6\u306E\u30AB\u30AE', sc.accent, jzMonoF(ctx)], [(numCount > 3 ? 3 : 2) + '  \u2500', sc.sub, jzBodyF(ctx)]];
            for (i = 0; i < lines.length; i++) {
                var tt = jzChars(lines[i][0]).length > 22 ? jzChars(lines[i][0]).slice(0, 21).join('') + '\u2026' : lines[i][0];
                var yy = below ? cyl + (i % 2) * fs * 1.7 : cyl + i * fs * 1.9 + (i >= 2 ? fs * 0.8 : 0), xx = below && i >= 2 ? cxl + gw * 0.55 : cxl;
                var CL = jzText(ctx, tt, { font: lines[i][2], size: fs, align: 'left', x: xx, y: yy, track: 0.08, color: lines[i][1], name: 'crossword clue ' + (i + 1) });
                ld1_opx(ctx, CL, 'oc((time-0.35)/0.4)*K');
            }
        }
        return bb;
    }
});
