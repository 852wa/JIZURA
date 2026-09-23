// ================================================================ pack layoutsD part 2 (AE port of src/11p_layoutsD.js, entries 18-34)
// wordSearch, puzzle, shadowPlay, kaleido, dominoes, burst, fisheye, wall, origami, zipper, sliceStack, glitchGrid,
// mosaicTiles, maskReveal, contour, halftoneBig, stencil
//
// Techniques used here:
// - clipped copies of the lyric (puzzle pieces, kaleidoscope wedges, blind slats, stacked slices, mosaic) are ONE precomp that
//   holds the plate + the lyric (still one editable text layer, with its enter / hold / exit), used several times with masks.
// - projected / folding polygons (walls, paper flaps) are fixed unit shapes mapped by the shape group transform
//   (position + rotation + skew + scale = any 2D affine map), driven by expressions: no animated paths needed.
// - pattern-filled lyrics (maskReveal, halftoneBig) use the lyric as an alpha track matte for a pattern layer.

var LD2_CY = 0.38;     // glyph centre above the baseline (em)
// extra easing / hash for expressions (append after jzTH)
var LD2_FNS = 'function ioc(x){x=cl(x);return x<0.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;}function ios(x){x=cl(x);return -(Math.cos(Math.PI*x)-1)/2;}' +
    'function hr(a,b){var x=Math.sin(a*12.9898+b*78.233)*43758.5453;return x-Math.floor(x);}\n';
var LD2_KANA = 'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん';
// affine map of a unit shape ((0,0) (100,0) (0,100)) onto A, B, C: rotation th, scale sx / sy, skew kk (group transform)
var LD2_AFF = 'var m11=(B[0]-A[0])/100,m21=(B[1]-A[1])/100,m12=(C[0]-A[0])/100,m22=(C[1]-A[1])/100,th=Math.atan2(m21,m11),cs=Math.cos(th),sn=Math.sin(th),' +
    'sx=Math.sqrt(m11*m11+m21*m21),sy=-m12*sn+m22*cs,kk=Math.abs(sy)<1e-6?0:(m12*cs+m22*sn)/sy;';

/* ---------------------------------------------------------------- small helpers */
function ld2_TH(ctx) { return jzTH(ctx) + LD2_FNS; }
function ld2_box(x0, y0, x1, y1) { return { x0: x0, y0: y0, x1: x1, y1: y1, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 }; }
function ld2_miAt(ctx, t) { return Math.max(0, t) / Math.max(0.005, ctx.cut.stagger || 0.04); }
function ld2_plateHold(ctx) { return jzIndexOf(['still', 'jitter', 'breathe', 'glitchtick'], ctx.cut.hold || 'still') < 0; }
function ld2_isSmall(ch) { return 'ぁぃぅぇぉっゃゅょゎァィゥェォッャュョヮヵヶ'.indexOf(ch) >= 0; }
function ld2_light(sc) { return jzLum(sc.fg) > jzLum(sc.bg) ? sc.fg : sc.bg; }
function ld2_dark(sc) { return jzLum(sc.fg) > jzLum(sc.bg) ? sc.bg : sc.fg; }
function ld2_onCol(sc, fill) {
    var c = [sc.bg, sc.fg, sc.ink, sc.accent, sc.sub], best = null, bv = 0;
    for (var i = 0; i < c.length; i++) { if (!c[i] || String(c[i]).toUpperCase() === String(fill).toUpperCase()) continue; var k = jzContrast(c[i], fill); if (k > bv) { bv = k; best = c[i]; } }
    return bv >= 2.4 ? best : (jzLum(fill) > 0.5 ? '#111111' : '#FFFFFF');
}
function ld2_plateCol(sc, pref) { for (var i = 0; i < pref.length; i++) if (pref[i] && jzContrast(pref[i], sc.bg) >= 1.6) return pref[i]; return sc.fg; }
function ld2_shade(sc, c, s) { return s >= 0 ? jzMixHex(c, ld2_light(sc), Math.min(0.9, s)) : jzMixHex(c, ld2_dark(sc), Math.min(0.9, -s)); }
function ld2_rgb(hex) { var c = jzHex(hex); return '[' + jzN(c[0]) + ',' + jzN(c[1]) + ',' + jzN(c[2]) + ',1]'; }
// glyph pool for fillers: the line's own glyphs + every third hiragana
function ld2_pool(c) {
    var own = jzChars(jzStrip((c.lineText || '') + c.text)), out = [], i;
    for (i = 0; i < own.length; i++) if (!jzIsPunct(own[i]) && !ld2_isSmall(own[i]) && own[i] !== 'ー' && !jzIsLatin(own[i]) && !/["'\\\s]/.test(own[i])) out.push(own[i]);
    var ka = jzChars(LD2_KANA);
    for (i = 0; i < ka.length; i += 3) out.push(ka[i]);
    return out;
}
// advance width in em (full-width glyphs are exactly 1 em)
function ld2_adv(ch) {
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

/* ---- chunking (browser chunksK): k balanced groups of words, long words split at natural points */
function ld2_splitWord(w) {
    var ch = jzChars(w), n = ch.length, i;
    if (/[A-Za-z]/.test(w)) {
        if (/[^\x00-\x7F]/.test(w)) { var cw = jzChunk(w); if (cw.length > 1) return cw; }
        return n > 10 ? [w.substr(0, Math.ceil(w.length / 2)), w.substr(Math.ceil(w.length / 2))] : [w];
    }
    if (n < 2) return [w];
    var sp = jzSplitLines(w, Math.ceil(n / 2)).split('\r'), o = [];
    for (i = 0; i < sp.length; i++) if (sp[i]) o.push(sp[i]);
    return o;
}
function ld2_chunksK(text, k) {
    var t = jzTrim(String(text || '')), words = [], i, j, g;
    if (!t) return [''];
    if (/\s/.test(t) && jzHasLatin(t)) {
        var ws = t.split(/\s+/), tmp = [];
        for (i = 0; i < ws.length; i++) if (ws[i]) tmp.push(ws[i]);
        for (i = 0; i < tmp.length; i++) words.push({ t: tmp[i], sp: i < tmp.length - 1 });
    } else {
        var cs = jzChunk(jzStrip(t));
        for (i = 0; i < cs.length; i++) { var w0 = jzTrim(cs[i]); if (w0) words.push({ t: w0, sp: false }); }
    }
    if (!words.length) words = [{ t: t, sp: false }];
    k = Math.max(1, Math.min(k, jzCount(t)));
    var hard = {};
    var gl = function (w) { return jzCount(w.t); };
    var splitAt = function (idx) {
        var w = words[idx], parts = ld2_splitWord(w.t), rep = [];
        if (parts.length < 2) { hard[w.t] = 1; return false; }
        for (var q = 0; q < parts.length; q++) rep.push({ t: parts[q], sp: q === parts.length - 1 ? w.sp : false });
        words = words.slice(0, idx).concat(rep, words.slice(idx + 1));
        return true;
    };
    for (var guard = 0; words.length < k && guard < 20; guard++) {
        var bi = -1, bl = 1;
        for (i = 0; i < words.length; i++) if (!hard[words[i].t] && gl(words[i]) > bl) { bl = gl(words[i]); bi = i; }
        if (bi < 0) break;
        splitAt(bi);
    }
    var part = function () {
        var n = words.length, kk = Math.min(k, n), pre = [0], dp = [], by = [], a, b;
        for (a = 0; a < n; a++) pre.push(pre[a] + gl(words[a]) + 0.4);
        var tgt = pre[n] / kk;
        for (g = 0; g <= kk; g++) { dp.push([]); by.push([]); for (a = 0; a <= n; a++) { dp[g].push(1e18); by[g].push(0); } }
        dp[0][0] = 0;
        for (g = 1; g <= kk; g++) for (a = g; a <= n; a++) for (b = g - 1; b < a; b++) { var d = pre[a] - pre[b] - tgt, v = dp[g - 1][b] + d * d; if (v < dp[g][a]) { dp[g][a] = v; by[g][a] = b; } }
        var cuts = [], p = n;
        for (g = kk; g >= 1; g--) { cuts.unshift(p); p = by[g][p]; }
        var out = [], prev = 0;
        for (a = 0; a < cuts.length; a++) { out.push(words.slice(prev, cuts[a])); prev = cuts[a]; }
        return out;
    };
    var groups = part();
    for (var it = 0; it < 3 && groups.length > 1; it++) {
        var mx = -1, mn = 1e9, gi = 0;
        for (i = 0; i < groups.length; i++) { var sum = 0; for (j = 0; j < groups[i].length; j++) sum += gl(groups[i][j]); if (sum > mx) { mx = sum; gi = i; } if (sum < mn) mn = sum; }
        if (mx <= mn * 1.7 + 1) break;
        var bw = null, big = groups[gi];
        for (j = 0; j < big.length; j++) if (!hard[big[j].t] && gl(big[j]) >= 4 && (!bw || gl(big[j]) > gl(bw))) bw = big[j];
        if (!bw || !splitAt(jzIndexOf(words, bw))) break;
        groups = part();
    }
    var res = [];
    for (i = 0; i < groups.length; i++) { var s = ''; for (j = 0; j < groups[i].length; j++) s += groups[i][j].t + (j < groups[i].length - 1 && groups[i][j].sp ? ' ' : ''); if (s) res.push(s); }
    return res.length ? res : [t];
}
// balanced display line breaks at chunk boundaries (AE line break = \r)
function ld2_brk(text, maxPer) { var t = jzFlat(text), n = jzCount(t); return n <= maxPer ? t : ld2_chunksK(t, Math.ceil(n / maxPer)).join('\r'); }
// rows of glyph slots (a ' ' slot is a word gap)
function ld2_rowsOf(text, maxPer) {
    var t = jzFlat(text), n = jzCount(t), rs = n > maxPer ? ld2_chunksK(t, Math.ceil(n / maxPer)) : [t], out = [];
    for (var i = 0; i < rs.length; i++) out.push(jzChars(jzTrim(rs[i])));
    return out;
}

/* ---- text: measure / fit / place */
function ld2_meas(ctx, str, font, track, lead) {
    var L = jzText(ctx, str, { font: font, size: 100, color: '#FFFFFF', x: -9999, y: -9999, track: track || 0, leading: /\r/.test(str) ? 100 * (lead || 1.2) : null });
    var r = jzRect(L); L.remove();
    return { w: Math.max(1, r.width), h: Math.max(1, r.height) };
}
// browser J.fitSize: the size at which the block fits maxW x maxH
function ld2_fit(ctx, str, font, maxW, maxH, track, lead) { var m = ld2_meas(ctx, str, font, track, lead); return 100 * Math.min(maxW / m.w, maxH / m.h); }
function ld2_measAt(ctx, str, font, size, track, lead) { var m = ld2_meas(ctx, str, font, track, lead); return { w: m.w * size / 100, h: m.h * size / 100 }; }
// text block of a given size centred at (o.x, o.y); o { color, track, lead, fill, stroke, strokeColor, strokeOver, name, align }
function ld2_T(ctx, str, font, size, o) {
    return jzText(ctx, str, { font: font, size: size, color: o.color || ctx.sc.fg, x: o.x || 0, y: o.y || 0, align: o.align, track: o.track || 0,
        leading: /\r/.test(str) ? size * (o.lead || 1.2) : null, fill: o.fill, stroke: o.stroke, strokeColor: o.strokeColor, strokeOver: o.strokeOver, name: o.name });
}
// one glyph whose em centre sits at (x, y)
function ld2_G(ctx, ch, font, size, x, y, col, name) {
    var L = jzText(ctx, ch, { font: font, size: size, color: col, x: x, y: y, name: name || ch });
    jzXf(L, 'ADBE Anchor Point').setValue([0, -LD2_CY * size]);
    jzXf(L, 'ADBE Position').setValue([x, y]);
    return L;
}
// "one glyph per line" layer: glyph i rests with its em centre at (0, i*LD - CY*fs) in layer space; the layer's anchor and
// position are both (ax, ay) so layer space = comp space and layer-level motion pivots round (ax, ay)
function ld2_glyphs(ctx, chars, o) {
    var t = [], i;
    for (i = 0; i < chars.length; i++) t.push(chars[i] === '' ? ' ' : chars[i]);
    var L = jzText(ctx, t.join('\r'), { font: o.font, size: o.size, color: o.color || '#FFFFFF', x: 0, y: 0, track: 0, leading: o.size, fill: o.fill, stroke: o.stroke, strokeColor: o.strokeColor, name: o.name || 'glyphs' });
    jzXf(L, 'ADBE Anchor Point').setValue([o.ax || 0, o.ay || 0]); jzXf(L, 'ADBE Position').setValue([o.ax || 0, o.ay || 0]);
    return L;
}

/* ---- text animators (expression selectors): body sets a (alpha) / sx, sy (scale) / dx, dy (px) / r (deg) / m (colour mix) / k (skew deg) */
function ld2_opAnim(L, name, head, body) { return jzAnimator(L, name, [['ADBE Text Opacity', 0]], head + 'var a=1;' + body + ';(1-Math.max(0,Math.min(1,a)))*100'); }
function ld2_scAnim(L, name, head, body) { return jzAnimator(L, name, [['ADBE Text Scale 3D', [300, 300, 100]]], head + 'var sx=1,sy=1;' + body + ';[Math.max(-1,Math.min(1,(sx-1)/2))*100,Math.max(-1,Math.min(1,(sy-1)/2))*100,0]'); }
function ld2_posAnim(L, name, KB, head, body) { return jzAnimator(L, name, [['ADBE Text Position 3D', [KB, KB, 0]]], head + 'var dx=0,dy=0;' + body + ';[dx/' + jzN(KB) + '*100,dy/' + jzN(KB) + '*100,0]'); }
function ld2_rotAnim(L, name, R, head, body) { return jzAnimator(L, name, [['ADBE Text Rotation', R]], head + 'var r=0;' + body + ';Math.max(-1,Math.min(1,r/' + jzN(R) + '))*100'); }
function ld2_colAnim(L, name, hex, head, body) { return jzAnimator(L, name, [['ADBE Text Fill Color', jzHex(hex)]], head + 'var m=0;' + body + ';Math.max(0,Math.min(1,m))*100'); }
function ld2_skAnim(L, name, head, body) { return jzAnimator(L, name, [['ADBE Text Skew', 85]], head + 'var k=0;' + body + ';Math.max(-85,Math.min(85,k))/85*100'); }

/* ---- shapes / layers */
function ld2_gX(g, mn, ex) { jzSetExpr(jzGX(g).property(mn), ex); }
function ld2_path(g, sh) { var p = jzVecs(g).addProperty('ADBE Vector Shape - Group'); p.property('ADBE Vector Shape').setValue(sh); return p; }
function ld2_sub(g, name) { var n = jzVecs(g).addProperty('ADBE Vector Group'); if (name) n.name = name; return n; }
// group holding a unit triangle ('tri': A, B, C) or parallelogram ('par': A, B, A+C-A) mapped by expressions; abc defines var A, B, C
function ld2_affGroup(S, name, kind, col, head, abc) {
    var g = jzGrp(S, name);
    jzAddPath(g, kind === 'tri' ? [[0, 0], [100, 0], [0, 100]] : [[0, 0], [100, 0], [100, 100], [0, 100]], true);
    jzAddFill(g, col);
    var e = head + abc + LD2_AFF;
    ld2_gX(g, 'ADBE Vector Position', e + '[A[0],A[1]]');
    ld2_gX(g, 'ADBE Vector Rotation', e + 'th*180/Math.PI');
    ld2_gX(g, 'ADBE Vector Scale', e + '[sx*100,sy*100]');
    ld2_gX(g, 'ADBE Vector Skew', e + 'Math.max(-85,Math.min(85,-Math.atan(kk)*180/Math.PI))');
    return g;
}
// planar quad Q[0..3] (expression 'var Q=[[x,y],...]') as a parallelogram + a triangle that overlap (no seam)
function ld2_quad(S, name, col, head, qExpr) {
    ld2_affGroup(S, name + ' b', 'tri', col, head, qExpr + 'var A=Q[0],B=Q[2],C=Q[3];');
    ld2_affGroup(S, name + ' a', 'par', col, head, qExpr + 'var A=Q[0],B=Q[1],C=[Q[0][0]+Q[2][0]-Q[1][0],Q[0][1]+Q[2][1]-Q[1][1]];');
}
function ld2_null(ctx, name, x, y) {
    var N = ctx.comp.layers.addNull(ctx.comp.duration); N.name = name;
    jzXf(N, 'ADBE Anchor Point').setValue([0, 0]); jzXf(N, 'ADBE Position').setValue([x || 0, y || 0]);
    return N;
}
// parent a layer without moving it, then place it in the parent's space
function ld2_ng(list) { for (var i = 0; i < list.length; i++) if (list[i]) jzNoGhost(list[i]); }   // browser: drawn with ghost off
function ld2_parent(L, P, x, y) { L.setParentWithJump(P); jzXf(L, 'ADBE Position').setValue([x, y]); }
// alpha track matte: L shows only inside M (M directly above L)
function ld2_matte(L, M, inverted) {
    var tt = inverted ? TrackMatteType.ALPHA_INVERTED : TrackMatteType.ALPHA, ok = false;
    if (typeof L.setTrackMatte === 'function') { try { L.setTrackMatte(M, tt); ok = true; } catch (e) { ok = false; } }
    if (!ok) { try { L.trackMatteType = tt; } catch (e2) { jzWarn('matte: ' + e2.toString()); } }
}
// precomp of the content comp's size / length; its ctx builds layers inside it (the lyric stays one editable text layer)
function ld2_precomp(ctx, name, w, h) {
    var pc = app.project.items.addComp(name, Math.round(w || ctx.W), Math.round(h || ctx.H), 1, ctx.comp.duration, ctx.comp.frameRate);
    try { pc.parentFolder = ctx.comp.parentFolder; } catch (e) {}
    var pctx = jzCopy(ctx); pctx.comp = pc;
    if (w) { pctx.W = pc.width; pctx.H = pc.height; }
    return { comp: pc, ctx: pctx };
}
function ld2_use(ctx, pc, name) { var L = ctx.comp.layers.add(pc); L.name = name; L.startTime = 0; return L; }
function ld2_mask(L, sh, mode) {
    var m = L.property('ADBE Mask Parade').addProperty('ADBE Mask Atom');
    m.property('ADBE Mask Shape').setValue(sh);
    if (mode) { try { m.maskMode = mode; } catch (e) {} }
    return m;
}
function ld2_shape(pts, closed) { var sh = new Shape(); sh.vertices = pts; sh.closed = closed !== false; return sh; }
function ld2_rectShape(x0, y0, x1, y1) { return ld2_shape([[x0, y0], [x1, y0], [x1, y1], [x0, y1]], true); }

/* ================================================================== 18 wordSearch — 文字探し */
jzReg('layout', 'wordSearch', {
    plan: function (rng, cut, st) {
        var port = cut.H > cut.W * 1.08, n = cut.n, dirs = ['h', 'h'];
        if (port && n <= 14) dirs.push('v', 'v', 'v');
        if (n <= 8) dirs.push('d');
        return { font: rng.pick(jzFontsOf(st, ['display', 'body'])), gf: rng.pick(jzFontsOf(st, ['body', 'display'])), dir: rng.pick(dirs), decoys: rng.int(1, 3), pad: rng.int(1, 3) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, s = c.seed, u = jzU(ctx), port = jzPortrait(ctx), i, r, q;
        var all = jzChars(jzFlat(c.text)), chs = [];
        for (i = 0; i < all.length; i++) if (all[i] !== ' ') chs.push(all[i]);
        var n = chs.length;
        if (!n) return null;
        var font = jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'display')), gf = jzP(ctx, 'gf', jzBodyF(ctx));
        var dir = jzP(ctx, 'dir', 'h'), pad = jzP(ctx, 'pad', 2), decoys = jzP(ctx, 'decoys', 2), C, R;
        if (dir === 'v' && n > 14) dir = 'h';
        if (dir === 'd' && n > 9) dir = 'h';
        if (dir === 'h') { C = n + pad * 2; R = port ? Math.max(7, Math.round(C * 1.4)) : Math.max(5, Math.round(C * 0.5)); if (port && C > 9) C = n + 1; }
        else if (dir === 'v') { R = n + pad * 2; C = Math.max(5, Math.round(R * (W / H) * 1.1)); }
        else { C = n + 2; R = n + 2; }
        C = Math.min(C, 18); R = Math.min(R, 18, Math.max(dir === 'v' ? n + 1 : dir === 'd' ? n : 5, Math.floor(150 / C)));
        if (dir === 'v') C = Math.min(C, Math.max(5, Math.floor(150 / R)));
        var cell = Math.min(W * 0.86 / C, H * 0.8 / R, u * 0.16), gx = W / 2 - C * cell / 2, gy = H / 2 - R * cell / 2;
        var r0, c0, dr = 0, dc = 1;
        if (dir === 'h') { r0 = Math.floor(R / 2) + (jzHash(s, 1) % 3) - 1; c0 = Math.floor((C - n) / 2); }
        else if (dir === 'v') { dr = 1; dc = 0; c0 = Math.floor(C / 2) + (jzHash(s, 1) % 3) - 1; r0 = Math.floor((R - n) / 2); }
        else { dr = 1; dc = 1; r0 = Math.floor((R - n) / 2); c0 = Math.floor((C - n) / 2); }
        r0 = jzClamp(r0, 0, Math.max(0, R - 1 - dr * (n - 1))); c0 = jzClamp(c0, 0, Math.max(0, C - 1 - dc * (n - 1)));
        var onPath = {};
        for (i = 0; i < n; i++) onPath[(r0 + dr * i) * 64 + (c0 + dc * i)] = i;
        var pool = ld2_pool(c), NP = pool.length, TH = ld2_TH(ctx), GA = 'var GA=oc(time/0.4)*K;';
        // panel
        var PN = jzRectLayer(ctx, 'grid panel', W / 2, H / 2, C * cell + cell * 0.7, R * cell + cell * 0.7, jzMixHex(sc.bg, sc.fg, jzLum(sc.bg) < 0.5 ? 0.06 : 0.05),
            { round: cell * 0.3, stroke: jzMixHex(sc.bg, sc.fg, 0.2), strokeW: Math.max(1, u * 0.0018) });
        jzSetExpr(jzXf(PN, 'ADBE Opacity'), TH + GA + 'value*GA'); jzNoGhost(PN);
        // decoy capsules (words "found" earlier)
        var rr = cell * 0.42, lwC = Math.max(1.5, cell * 0.06), DS = jzShapeLayer(ctx, 'found words', 0, 0), nd = 0;
        for (var d = 0; d < decoys; d++) {
            var ra = jzHash(s, d, 21) % R, len = 3 + jzHash(s, d, 22) % 2, ca = jzHash(s, d, 23) % Math.max(1, C - len), clash = false;
            for (q = 0; q < len; q++) if (onPath[ra * 64 + ca + q] != null) clash = true;
            if (clash) continue;
            var gd = jzGrp(DS, 'word ' + (d + 1)), L0 = (len - 1) * cell;
            jzAddRect(gd, L0 + rr * 2, rr * 2, rr, L0 / 2, 0.001); jzAddStroke(gd, sc.sub, lwC);
            jzGX(gd).property('ADBE Vector Position').setValue([gx + (ca + 0.5) * cell, gy + (ra + 0.5) * cell]);
            nd++;
        }
        if (nd) { jzSetExpr(jzXf(DS, 'ADBE Opacity'), TH + GA + '50*GA'); jzNoGhost(DS); } else DS.remove();
        // the letter grid: one text, rows = lines, cell pitch = glyph advance + tracking; rows fade in top to bottom
        var gs = cell * 0.56, rows = [];
        for (r = 0; r < R; r++) { var row = ''; for (q = 0; q < C; q++) row += onPath[r * 64 + q] != null ? '　' : pool[jzHash(s, r, q, 9) % NP]; rows.push(row); }
        var GL = jzText(ctx, rows.join('\r'), { font: gf, size: gs, color: sc.sub, x: 0, y: 0, align: 'left', track: (cell - gs) / gs, leading: cell, name: 'letter grid' });
        jzXf(GL, 'ADBE Anchor Point').setValue([0, 0]);
        jzXf(GL, 'ADBE Position').setValue([gx + (cell - gs) / 2, gy + 0.5 * cell + LD2_CY * gs]);
        jzSetExpr(jzXf(GL, 'ADBE Opacity'), TH + '75*K'); jzNoGhost(GL);
        ld2_opAnim(GL, 'JZ Rows In', TH + GA, 'var rw=Math.floor((textIndex-1)/' + C + ');a=cl(GA*' + (R + 2) + '-rw)');
        // the find: a capsule sweeps along the lyric
        var sweep = jzClamp(c.dur * 0.3, 0.35, 0.8), stepL = cell * Math.sqrt(dr * dr + dc * dc);
        var FF = TH + 'var f=ioc((time-0.35)/' + jzN(sweep) + ')*(1-ic(PO*1.3)),LN=' + (n - 1) + '*f*' + jzN(stepL) + ';';
        var CP = jzShapeLayer(ctx, 'find', gx + (c0 + 0.5) * cell, gy + (r0 + 0.5) * cell), gc = jzGrp(CP, 'capsule');
        var rc = jzAddRect(gc, rr * 2, rr * 2, rr, 0, 0);
        jzSetExpr(rc.property('ADBE Vector Rect Size'), FF + '[LN+' + jzN(rr * 2) + ',' + jzN(rr * 2) + ']');
        jzSetExpr(rc.property('ADBE Vector Rect Position'), FF + '[LN/2,0]');
        jzAddStroke(gc, sc.accent, lwC); jzAddFill(gc, sc.accent, 30);
        jzXf(CP, 'ADBE Rotate Z').setValue(Math.atan2(dr, dc) * 180 / Math.PI);
        jzSetExpr(jzXf(CP, 'ADBE Opacity'), FF + '(f>0?100:0)*K'); jzNoGhost(CP);
        // the lyric glyphs light up as the capsule passes
        var bb = null, lit = FF + 'var LT=cl(((' + (n > 1 ? 'f*' + (n - 1) : 'f') + ')-IX+0.6)/0.6);';
        for (i = 0; i < n; i++) {
            var x = gx + (c0 + dc * i + 0.5) * cell, y = gy + (r0 + dr * i + 0.5) * cell;
            var G = ld2_G(ctx, chs[i], font, gs, x, y, sc.sub), hd = 'var IX=' + i + ';' + lit;
            ld2_scAnim(G, 'JZ Lit Size', hd, 'sx=1+LT*' + jzN(0.08 / 0.56) + ';sy=sx');
            ld2_colAnim(G, 'JZ Lit Colour', sc.fg, hd, 'm=LT>0.5?1:0');
            ld2_opAnim(G, 'JZ Lit Alpha', hd, 'a=0.75+0.25*LT');
            jzAnimate(ctx, G, { mi: ld2_miAt(ctx, 0.1 + i * 0.02), noHold: ld2_plateHold(ctx) });
            bb = jzUnion(bb, ld2_box(x - cell / 2, y - cell / 2, x + cell / 2, y + cell / 2));
        }
        return bb;
    }
});

/* ================================================================== 19 puzzle — パズル */
// jigsaw piece outline (x, y, w, h); e = [top, right, bottom, left] knob sides (+-1, 0 = straight)
function ld2_jigShape(x, y, w, h, e) {
    var V = [], I = [], O = [];
    var add = function (p, i, o) { V.push(p); I.push(i || [0, 0]); O.push(o || [0, 0]); };
    var edge = function (xa, ya, xb, yb, sg, lastE) {
        if (sg) {
            var dx = xb - xa, dy = yb - ya, L = Math.sqrt(dx * dx + dy * dy), ux = dx / L, uy = dy / L, nx = uy * sg, ny = -ux * sg;
            var P = function (t, k) { return [xa + ux * t * L + nx * k * L, ya + uy * t * L + ny * k * L]; };
            var a = P(0.37, 0), b1 = P(0.42, 0.1), b2 = P(0.3, 0.26), cc = P(0.5, 0.27), d1 = P(0.7, 0.26), d2 = P(0.58, 0.1), ee = P(0.63, 0);
            add(a, null, [b1[0] - a[0], b1[1] - a[1]]);
            add(cc, [b2[0] - cc[0], b2[1] - cc[1]], [d1[0] - cc[0], d1[1] - cc[1]]);
            add(ee, [d2[0] - ee[0], d2[1] - ee[1]], null);
        }
        if (!lastE) add([xb, yb]);
    };
    add([x, y]);
    edge(x, y, x + w, y, e[0]); edge(x + w, y, x + w, y + h, e[1]); edge(x + w, y + h, x, y + h, e[2]); edge(x, y + h, x, y, e[3], true);
    var sh = new Shape(); sh.vertices = V; sh.inTangents = I; sh.outTangents = O; sh.closed = true;
    return sh;
}
jzReg('layout', 'puzzle', {
    plan: function (rng, cut, st) {
        return { font: rng.pick(jzFontsOf(st, ['display', 'serif'])), plate: rng.pick(['accent', 'light', 'ink']), rows: rng.pick([2, 2, 3]), last: rng.chance(0.65), spread: rng.range(0.6, 1) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, s = c.seed, u = jzU(ctx), port = jzPortrait(ctx), i, k;
        var font = jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'display')), text = ld2_brk(c.text, port ? 5 : 8), tr = 0.04, lead = 1.12;
        var size = Math.min(ld2_fit(ctx, text, font, W * 0.7, H * (port ? 0.3 : 0.4), tr, lead), u * 0.22), m = ld2_measAt(ctx, text, font, size, tr, lead);
        var bw = Math.min(W * 0.92, m.w + size * 1.3), bh = Math.min(H * 0.8, m.h + size * 1.1), x0 = W / 2 - bw / 2, y0 = H / 2 - bh / 2;
        var R = jzP(ctx, 'rows', 2), C = Math.max(2, Math.min(Math.round(bw / bh * R), Math.floor(28 / R))), pw = bw / C, ph = bh / R, last = !!jzP(ctx, 'last', true), spread = jzP(ctx, 'spread', 0.8);
        var pl = jzP(ctx, 'plate', 'accent');
        var plate = pl === 'light' ? jzMixHex(ld2_light(sc), sc.accent, 0.08) : ld2_plateCol(sc, pl === 'accent' ? [sc.accent, sc.ink] : [sc.ink, sc.accent]), tc = ld2_onCol(sc, plate);
        var N = R * C, ord = [], rank = [];
        for (i = 0; i < N; i++) ord.push(i);
        ord.sort(function (a, b) { return jzR(s, a, 3) - jzR(s, b, 3); });
        for (i = 0; i < N; i++) rank[ord[i]] = i;
        var fd = 0.42, span = jzClamp(c.dur * 0.3, 0.3, 0.8);
        var tOf = function (p) { var q = rank[p]; if (last && q === N - 1) return 0.1 + span + 0.25; return 0.06 + (N > 1 ? q / (N - 1) : 0) * span * (last ? 0.85 : 1); };
        var hS = function (r2, c2) { return jzHash(s, r2, c2, 1) & 1 ? 1 : -1; };
        var vS = function (r2, c2) { return jzHash(s, r2, c2, 2) & 1 ? 1 : -1; };
        var edges = function (r2, c2) { return [r2 === 0 ? 0 : -hS(r2 - 1, c2), c2 === C - 1 ? 0 : vS(r2, c2), r2 === R - 1 ? 0 : hS(r2, c2), c2 === 0 ? 0 : -vS(r2, c2 - 1)]; };
        // the picture: plate + lyric in one precomp
        var PC = ld2_precomp(ctx, 'JZ puzzle art'), pctx = PC.ctx;
        jzRectLayer(pctx, 'plate', W / 2, H / 2, bw + pw * 0.8, bh + ph * 0.8, plate);
        var L = ld2_T(pctx, text, font, size, { color: tc, x: W / 2, y: H / 2, track: tr, lead: lead });
        jzAnimate(pctx, L, { mi: 0, noHold: ld2_plateHold(ctx) });
        var bb = jzBB(L);
        // pieces: the precomp masked by a jigsaw outline, flying in (in rank order, later ones on top) and apart at the end
        var TH = ld2_TH(ctx), dia = Math.sqrt(W * W + H * H), heads = [], shapes = [], homes = [];
        for (k = 0; k < N; k++) {
            var p = ord[k], r = Math.floor(p / C), cc = p % C, hx = x0 + (cc + 0.5) * pw, hy = y0 + (r + 0.5) * ph;
            var ang = jzR(s, p, 4) * Math.PI * 2, dist = dia * 0.45 * spread * (0.6 + 0.4 * jzR(s, p, 5));
            var hd = TH + 'var HX=' + jzN(hx) + ',HY=' + jzN(hy) + ',CA=' + jzN(Math.cos(ang)) + ',SA=' + jzN(Math.sin(ang)) + ',DI=' + jzN(dist) + ',T0=' + jzN(tOf(p)) +
                ',RK=' + jzN(k / N) + ',R6=' + jzN(jzR(s, p, 6) * 2 - 1) + ',R7=' + jzN(jzR(s, p, 7) * 2 - 1) + ';' +
                'var f=cl((time-T0)/' + jzN(fd) + '),fo=cl(PO*1.5-RK*0.5),e=f<1?oc(f):1,eo=ic(fo),SX=HX+CA*DI,SY=HY+SA*DI*0.7;';
            var sh = ld2_jigShape(x0 + cc * pw, y0 + r * ph, pw, ph, edges(r, cc));
            heads.push(hd); shapes.push(sh); homes.push([hx, hy]);
            var PL = jzNoGhost(ld2_use(ctx, PC.comp, 'piece ' + (r + 1) + '-' + (cc + 1)));
            ld2_mask(PL, sh);
            jzXf(PL, 'ADBE Anchor Point').setValue([hx, hy]); jzXf(PL, 'ADBE Position').setValue([hx, hy]);
            jzSetExpr(jzXf(PL, 'ADBE Position'), hd + '[SX+(HX-SX)*e+(HX-' + jzN(W / 2) + ')*eo*1.4+CA*eo*DI*0.5,SY+(HY-SY)*e+(HY-' + jzN(H / 2) + ')*eo*1.4+SA*eo*DI*0.4]');
            jzSetExpr(jzXf(PL, 'ADBE Rotate Z'), hd + 'R6*70*(1-e)+R7*50*eo');
            jzSetExpr(jzXf(PL, 'ADBE Scale'), hd + 'var lf=1+0.08*(1-e)+0.06*eo;[100*lf,100*lf]');
            jzSetExpr(jzXf(PL, 'ADBE Opacity'), hd + 'f<=0?0:(1-eo)*(fo>0?K:1)*100');
            var DSh = jzEffect(PL, 'ADBE Drop Shadow', 'JZ Lift');
            jzEP(DSh, 1, jzHex(ld2_dark(sc))); jzEP(DSh, 3, 146); jzEP(DSh, 4, u * 0.0216); jzEP(DSh, 5, 0);
            jzEX(DSh, 2, hd + '(f<1||fo>0)?76.5:0');
        }
        // seams (all pieces, moving with them) + the flash round the last piece
        var SM = jzNoGhost(jzShapeLayer(ctx, 'seams', 0, 0)), lw = Math.max(1, u * 0.0018), sCol = jzMixHex(plate, ld2_dark(sc), 0.45);
        if (last && N > 1) {
            var gF = jzGrp(SM, 'last piece flash'), tl = TH + 'var tl=time-' + jzN(tOf(ord[N - 1]) + fd) + ',k2=(tl>0&&tl<0.35)?1-tl/0.35:0;';
            ld2_path(gF, shapes[N - 1]);
            var stF = jzAddStroke(gF, sc.accent, Math.max(2, u * 0.006));
            jzSetExpr(stF.property('ADBE Vector Stroke Width'), tl + 'value*k2');
            ld2_gX(gF, 'ADBE Vector Group Opacity', tl + 'k2*K*100');
        }
        for (k = N - 1; k >= 0; k--) {
            var g = jzGrp(SM, 'seam ' + (k + 1));
            ld2_path(g, shapes[k]); jzAddStroke(g, sCol, lw);
            jzGX(g).property('ADBE Vector Anchor').setValue(homes[k]);
            ld2_gX(g, 'ADBE Vector Position', heads[k] + '[SX+(HX-SX)*e+(HX-' + jzN(W / 2) + ')*eo*1.4+CA*eo*DI*0.5,SY+(HY-SY)*e+(HY-' + jzN(H / 2) + ')*eo*1.4+SA*eo*DI*0.4]');
            ld2_gX(g, 'ADBE Vector Rotation', heads[k] + 'R6*70*(1-e)+R7*50*eo');
            ld2_gX(g, 'ADBE Vector Scale', heads[k] + 'var lf=1+0.08*(1-e)+0.06*eo;[100*lf,100*lf]');
            ld2_gX(g, 'ADBE Vector Group Opacity', heads[k] + 'f<=0?0:((f>=1&&fo<=0)?55:100)*(1-eo)*(fo>0?K:1)');
        }
        return bb || ld2_box(x0, y0, x0 + bw, y0 + bh);
    }
});

/* ================================================================== 20 shadowPlay — 影絵 */
jzReg('layout', 'shadowPlay', {
    plan: function (rng, cut, st) {
        return { font: rng.pick(jzFontsOf(st, ['display', 'display', 'serif'])), mode: rng.pick(['floor', 'floor', 'wall']), dir: rng.pick([1, -1]), sweep: rng.range(0.7, 1), sun: rng.chance(0.8) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, u = jzU(ctx), port = jzPortrait(ctx), i;
        var font = jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'display')), dark = jzLum(sc.bg) < 0.45, dir = jzP(ctx, 'dir', 1) < 0 ? -1 : 1;
        var text = ld2_brk(c.text, port ? 5 : 9), tr = 0.04, lead = 1.08, TH = ld2_TH(ctx);
        var shC = dark ? jzMixHex(sc.bg, '#000000', 0.55) : jzMixHex(ld2_dark(sc), sc.bg, 0.25), size, m, L, S;
        if (jzP(ctx, 'mode', 'floor') !== 'wall') {
            size = Math.min(ld2_fit(ctx, text, font, W * 0.8, H * (port ? 0.22 : 0.3), tr, lead), u * 0.22); m = ld2_measAt(ctx, text, font, size, tr, lead);
            var yb = H * (port ? 0.56 : 0.6), ty = yb - m.h / 2 - size * 0.04, floorC = jzMixHex(sc.bg, sc.fg, dark ? 0.13 : 0.07), FA = 'var FA=oc(time/0.5)*K;';
            // floor plane (grows down from the horizon) + horizon line
            var FL = jzShapeLayer(ctx, 'floor', 0, yb), gf = jzGrp(FL, 'floor');
            jzAddRect(gf, W, H - yb + 2, 0, W / 2, (H - yb + 2) / 2); jzAddFill(gf, floorC);
            jzSetExpr(jzXf(FL, 'ADBE Scale'), TH + FA + '[100,100*FA]');
            jzSetExpr(jzXf(FL, 'ADBE Opacity'), TH + FA + '100*FA');
            var HZ = jzRectLayer(ctx, 'horizon', W / 2, yb, W, Math.max(1, u * 0.002), sc.sub, { opacity: 0.6 }); ld2_ng([FL, HZ]);
            jzSetExpr(jzXf(HZ, 'ADBE Scale'), TH + FA + '[100*FA,100]');
            // the sun crosses the sky; the shadow swings like a sundial
            var PHI = TH + 'var PHI=(74+(38-74)*ios(time/' + jzN(Math.max(0.5, c.dur)) + '))*' + jzN((0.85 + 0.15 * jzP(ctx, 'sweep', 0.85)) * dir) + '*Math.PI/180;';
            if (jzP(ctx, 'sun', true)) {
                var sr0 = u * 0.045, SU = jzShapeLayer(ctx, 'sun', W / 2, yb), g1 = jzGrp(SU, 'rays'), g2 = jzGrp(SU, 'disc'), g3 = jzGrp(SU, 'glow');
                for (i = 0; i < 10; i++) { var a = i / 10 * Math.PI * 2; jzAddPath(g1, [[Math.cos(a) * sr0 * 1.35, Math.sin(a) * sr0 * 1.35], [Math.cos(a) * sr0 * 1.75, Math.sin(a) * sr0 * 1.75]], false); }
                jzAddStroke(g1, sc.accent, Math.max(1.5, sr0 * 0.1), 80);
                ld2_gX(g1, 'ADBE Vector Rotation', 'time*0.4*180/Math.PI');
                jzAddEllipse(g2, sr0 * 2, sr0 * 2); jzAddFill(g2, sc.accent);
                jzAddEllipse(g3, sr0 * 3.8, sr0 * 3.8); jzAddFill(g3, sc.accent, 12);
                var mw2 = m.w / 2 + sr0 * 2.2, capY = ty - m.h / 2 - sr0 * 2.4;
                jzSetExpr(jzXf(SU, 'ADBE Position'), PHI + 'var sx=' + jzN(W / 2) + '-Math.sin(PHI)*' + jzN(W * 0.4) + ',sy=' + jzN(yb - sr0 * 1.6) + '-' + jzN(yb - H * 0.1) + '*Math.cos(PHI)*1.1;' +
                    'if(Math.abs(sx-' + jzN(W / 2) + ')<' + jzN(mw2) + ')sy=Math.min(sy,' + jzN(capY) + ');[sx,sy]');
                jzSetExpr(jzXf(SU, 'ADBE Scale'), TH + 'var q=ob(cl((time-0.1)/0.5),1.70158)*100;[q,q]');
                jzSetExpr(jzXf(SU, 'ADBE Opacity'), TH + '100*K'); jzNoGhost(SU);
            }
            // cast shadow: the lyric reflected about the floor line and sheared, M = [[1, sh], [0, -d]] = R(ph) S(s1, s2) R(th)
            var SVD = PHI + 'var sh=Math.max(-1.9,Math.min(1.9,Math.tan(PHI)*0.75)),d=0.3+0.3*Math.abs(Math.sin(PHI));' +
                'var E=(1-d)/2,F=(1+d)/2,G=sh/2,Hh=-sh/2,Q=Math.sqrt(E*E+Hh*Hh),Rr=Math.sqrt(F*F+G*G),s1=Q+Rr,s2=Q-Rr,a1=Math.atan2(G,F),a2=Math.atan2(Hh,E);';
            var NA = ld2_null(ctx, 'shadow skew', W / 2, yb), NB = ld2_null(ctx, 'shadow turn', 0, 0);
            ld2_parent(NB, NA, 0, 0);
            jzSetExpr(jzXf(NA, 'ADBE Rotate Z'), SVD + '(a2+a1)/2*180/Math.PI');
            jzSetExpr(jzXf(NA, 'ADBE Scale'), SVD + '[s1*100,s2*100]');
            jzSetExpr(jzXf(NB, 'ADBE Rotate Z'), SVD + '(a2-a1)/2*180/Math.PI');
            S = ld2_T(ctx, text, font, size, { color: shC, x: W / 2, y: ty, track: tr, lead: lead, name: 'cast shadow' });
            jzXf(S, 'ADBE Opacity').setValue(85); jzNoGhost(S);
            jzAnimate(ctx, S, { mi: 0, treat: false });
            ld2_parent(S, NB, 0, ty - yb);
            // the far end of the shadow fades into the floor
            var Lsh = m.h * 0.45 * 1.15 + size * 0.1, FO = jzShapeLayer(ctx, 'shadow fade', 0, 0), gF = jzGrp(FO, 'fade');
            jzAddRect(gF, W, H - yb, 0, W / 2, yb + (H - yb) / 2); jzAddFill(gF, floorC);
            var mk = ld2_mask(FO, ld2_rectShape(-W, yb + Lsh * 0.675, W * 2, H * 2));
            mk.property('ADBE Mask Feather').setValue([Lsh * 0.65, Lsh * 0.65]);
            jzSetExpr(jzXf(FO, 'ADBE Opacity'), TH + FA + '70*FA'); jzNoGhost(FO);
            L = ld2_T(ctx, text, font, size, { color: sc.fg, x: W / 2, y: ty, track: tr, lead: lead });
            jzAnimate(ctx, L, { mi: 0 });
            return jzBB(L);
        }
        // wall: a small lamp in front throws a big soft shadow on the wall behind
        size = Math.min(ld2_fit(ctx, text, font, W * 0.6, H * (port ? 0.2 : 0.26), tr, lead), u * 0.17);
        var tx = W / 2, tyW = H * 0.5, glowC = dark ? sc.accent : ld2_light(sc);
        var LMP = TH + 'var LX=' + jzN(W / 2) + '+Math.sin(time*0.45+' + (dir > 0 ? 0 : 2) + ')*' + jzN(W * 0.16) + ',LY=' + jzN(H * 0.86) + '+Math.sin(time*1.7)*' + jzN(H * 0.006) +
            ',KS=1.42+0.1*Math.sin(time*0.6),LA=oc(time/0.5)*K,FL=0.92+0.08*hh(SD+Math.floor(time*24)*3.1);';
        // light pool round the lamp (screen-blended radial ramp)
        var GL = jzShapeLayer(ctx, 'lamp light', 0, 0), gg = jzGrp(GL, 'light');
        jzAddRect(gg, W, H, 0, W / 2, H / 2); jzAddFill(gg, '#000000');
        var rp = jzEffect(GL, 'ADBE Ramp', 'JZ Lamp Light');
        jzEP(rp, 2, jzHex(jzMixHex('#000000', glowC, dark ? 0.18 : 0.35))); jzEP(rp, 4, [0, 0, 0]); jzEP(rp, 5, 2);
        jzEX(rp, 1, LMP + '[LX,LY]');
        jzEX(rp, 3, LMP + '[LX+' + jzN(Math.max(W, H) * 0.75) + ',LY]');
        GL.blendingMode = BlendingMode.SCREEN;
        jzSetExpr(jzXf(GL, 'ADBE Opacity'), LMP + '100*LA*FL'); jzNoGhost(GL);
        // the shadow: the lyric scaled up about the lamp (a parent that follows the lamp), blurred
        var NS = ld2_null(ctx, 'lamp pivot', 0, 0);
        jzSetExpr(jzXf(NS, 'ADBE Anchor Point'), LMP + '[LX,LY]');
        jzSetExpr(jzXf(NS, 'ADBE Position'), LMP + '[LX,LY]');
        jzSetExpr(jzXf(NS, 'ADBE Scale'), LMP + '[KS*100,KS*100]');
        S = ld2_T(ctx, text, font, size, { color: shC, x: tx, y: tyW, track: tr, lead: lead, name: 'wall shadow' });
        jzAnimate(ctx, S, { mi: 0, treat: false });
        ld2_parent(S, NS, tx, tyW);
        ld2_opAnim(S, 'JZ Shadow Alpha', LMP, 'a=' + (dark ? 0.9 : 0.55) + '*LA');
        var bl = jzEffect(S, 'ADBE Gaussian Blur 2', 'JZ Soft Shadow'); jzEP(bl, 1, size * 0.04 * 1.42); jzNoGhost(S);
        // the lamp
        var fr = u * 0.02, LP = jzShapeLayer(ctx, 'lamp', 0, 0), gb = jzGrp(LP, 'base'), gfl = jzGrp(LP, 'flame'), gh = jzGrp(LP, 'halo');
        jzAddRect(gb, fr * 1.8, fr * 1.6, 0, 0, fr * 1.4); jzAddFill(gb, sc.sub);
        jzAddPath(gfl, [[0, -fr * 2.2], [fr * 0.8, -fr * 0.2], [0, fr * 0.6], [-fr * 0.8, -fr * 0.2]], true); jzAddFill(gfl, sc.accent);
        ld2_gX(gfl, 'ADBE Vector Scale', LMP + '[100,100*FL]');
        jzAddEllipse(gh, fr * 7, fr * 7); jzAddFill(gh, sc.accent, 15);
        ld2_gX(gh, 'ADBE Vector Group Opacity', LMP + '100*FL');
        jzSetExpr(jzXf(LP, 'ADBE Position'), LMP + '[LX,LY]');
        jzSetExpr(jzXf(LP, 'ADBE Opacity'), LMP + '100*LA'); jzNoGhost(LP);
        L = ld2_T(ctx, text, font, size, { color: sc.fg, x: tx, y: tyW, track: tr, lead: lead });
        jzAnimate(ctx, L, { mi: 0 });
        return jzBB(L);
    }
});

/* ================================================================== 21 kaleido — 万華鏡 */
jzReg('layout', 'kaleido', {
    plan: function (rng, cut, st) {
        return { font: rng.pick(jzFontsOf(st, ['display', 'serif'])), N: rng.pick([6, 8, 8, 10, 12]), speed: rng.range(4, 10) * rng.pick([1, -1]), flow: rng.range(0.15, 0.3), center: rng.pick(['disc', 'disc', 'band']), tint: rng.pick(['sub', 'accent', 'mixed']) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, u = jzU(ctx), port = jzPortrait(ctx), i, j;
        var font = jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'display')), t0 = jzFlat(c.text), n = jzCount(t0);
        var unit = n > 5 ? ld2_chunksK(t0, Math.ceil(n / 4))[0] : t0;
        var cx = W / 2, cy = H / 2, N = Math.max(4, Math.round(jzP(ctx, 'N', 8))), al = Math.PI * 2 / N, Rr = Math.sqrt(W * W + H * H) * 0.56;
        var speed = jzP(ctx, 'speed', 6), flow = jzP(ctx, 'flow', 0.2), tint = jzP(ctx, 'tint', 'sub'), TH = ld2_TH(ctx);
        var cols = tint === 'accent' ? [sc.accent, sc.sub, sc.sub] : tint === 'mixed' ? [sc.sub, sc.accent, sc.sub, sc.accent2 || sc.sub] : [sc.sub, jzMixHex(sc.sub, sc.bg, 0.4)];
        // one wedge (precomp): unit copies flowing outward along the bisector (+x), turned 90 degrees
        var S2 = Math.ceil(Rr * 1.1) * 2, pcx = S2 / 2, pcy = S2 / 2;
        var PC = ld2_precomp(ctx, 'JZ kaleido wedge', S2, S2), pctx = PC.ctx, EW = 'var EW=oc(time/0.6);';
        var LNm = jzShapeLayer(pctx, 'axis', 0, 0), gl = jzGrp(LNm, 'axis');
        jzAddPath(gl, [[pcx + Rr * 0.1, pcy], [pcx + Rr, pcy]], false); jzAddStroke(gl, sc.dim || sc.sub, Math.max(1, u * 0.001));
        jzSetExpr(jzXf(LNm, 'ADBE Opacity'), TH + EW + '50*K*EW');
        var M = 4, tn = Math.tan(al / 2);
        for (j = 0; j <= M; j++) {
            var T = ld2_T(pctx, unit, font, 100, { color: cols[j % cols.length], x: pcx, y: pcy, name: 'unit ' + (j + 1) });
            jzXf(T, 'ADBE Rotate Z').setValue(90);
            var FW = TH + EW + 'var ph=((time*' + jzN(flow) + ')%0.25+0.25)%0.25,f=' + jzN(j / M) + '+ph,r=' + jzN(Rr) + '*(0.12+f*0.95),sz=Math.min(r*' + jzN(tn * 1.2) + ',r*0.5),al=Math.min(1,f*4)*(1-f*0.55)*K*EW;';
            jzSetExpr(jzXf(T, 'ADBE Position'), FW + '[' + jzN(pcx) + '+r,' + jzN(pcy) + ']');
            jzSetExpr(jzXf(T, 'ADBE Scale'), FW + '[sz,sz]');
            jzSetExpr(jzXf(T, 'ADBE Opacity'), FW + '(al<=0.02||sz<4)?0:al*50');
        }
        // N wedges round the centre, every other one mirrored
        var wsh = ld2_shape([[pcx, pcy], [pcx + Rr * Math.cos(-al / 2) * 1.05, pcy + Rr * Math.sin(-al / 2) * 1.05], [pcx + Rr * Math.cos(al / 2) * 1.05, pcy + Rr * Math.sin(al / 2) * 1.05]], true);
        for (i = 0; i < N; i++) {
            var WL = jzNoGhost(ld2_use(ctx, PC.comp, 'wedge ' + (i + 1)));
            ld2_mask(WL, wsh);
            jzXf(WL, 'ADBE Anchor Point').setValue([pcx, pcy]); jzXf(WL, 'ADBE Position').setValue([cx, cy]);
            if (i % 2) jzXf(WL, 'ADBE Scale').setValue([100, -100]);
            jzSetExpr(jzXf(WL, 'ADBE Rotate Z'), TH + EW + 'time*' + jzN(speed) + '+(1-EW)*60+' + jzN((i + 0.5) * 360 / N));
        }
        // centre: the lyric on a disc or a band
        var disc = jzP(ctx, 'center', 'disc') === 'disc' && n <= (port ? 8 : 9), text, size, tr = 0.03, lead = 1.1;
        if (disc) {
            text = ld2_brk(t0, n <= 4 ? 4 : Math.ceil(n / 2));
            var Rc = Math.min(W, H) * (n > 5 ? 0.36 : 0.3);
            size = Math.min(ld2_fit(ctx, text, font, Rc * 1.55, Rc * 1.2, tr, lead), u * 0.16);
            var D = jzShapeLayer(ctx, 'disc', cx, cy), g1 = jzGrp(D, 'ring'), g2 = jzGrp(D, 'disc');
            jzAddEllipse(g1, Rc * 2.12, Rc * 2.12); jzAddStroke(g1, sc.sub, Math.max(1, u * 0.001), 60);
            jzAddEllipse(g2, Rc * 2, Rc * 2); jzAddStroke(g2, sc.accent, Math.max(2, u * 0.004)); jzAddFill(g2, sc.bg);
            jzSetExpr(jzXf(D, 'ADBE Scale'), TH + 'var q=ob(cl(time/0.4),1.5)*(1-0.3*ic(PO))*100;[q,q]');
            jzSetExpr(jzXf(D, 'ADBE Opacity'), TH + '100*K'); jzNoGhost(D);
        } else {
            text = ld2_brk(t0, port ? 5 : 8);
            size = Math.min(ld2_fit(ctx, text, font, W * 0.84, H * 0.26, tr, lead), u * 0.18);
            var mb = ld2_measAt(ctx, text, font, size, tr, lead), bh0 = mb.h + size * 0.6, lwB = Math.max(2, u * 0.003);
            var BD = jzNoGhost(jzShapeLayer(ctx, 'band', cx, cy)), gb = jzGrp(BD, 'band'), gt = jzGrp(BD, 'top'), gbt = jzGrp(BD, 'bottom');
            var BH = TH + 'var bh=' + jzN(bh0) + '*oe(time/0.4)*(1-ic(PO));';
            jzAddRect(gt, W, lwB, 0, 0, 0); jzAddFill(gt, sc.accent); ld2_gX(gt, 'ADBE Vector Position', BH + '[0,-bh/2]'); ld2_gX(gt, 'ADBE Vector Group Opacity', BH + '100*K');
            jzAddRect(gbt, W, lwB, 0, 0, 0); jzAddFill(gbt, sc.accent); ld2_gX(gbt, 'ADBE Vector Position', BH + '[0,bh/2]'); ld2_gX(gbt, 'ADBE Vector Group Opacity', BH + '100*K');
            jzAddRect(gb, W, bh0, 0, 0, 0); jzAddFill(gb, sc.bg); ld2_gX(gb, 'ADBE Vector Scale', BH + '[100,bh/' + jzN(bh0) + '*100]');
        }
        var L = ld2_T(ctx, text, font, size, { color: sc.fg, x: cx, y: cy, track: tr, lead: lead });
        jzAnimate(ctx, L, { mi: 0 });
        return jzBB(L);
    }
});

/* ================================================================== 22 dominoes — ドミノ */
var LD2_PIPS = [[], [[0, 0]], [[-1, -1], [1, 1]], [[-1, -1], [0, 0], [1, 1]], [[-1, -1], [1, -1], [-1, 1], [1, 1]], [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]]];
jzReg('layout', 'dominoes', {
    plan: function (rng, cut, st) {
        return { font: rng.pick(jzFontsOf(st, ['display', 'serif'])), face: rng.pick(['light', 'light', 'ink']), pips: rng.chance(0.8) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, s = c.seed, u = jzU(ctx), port = jzPortrait(ctx), r, j, q;
        var n = jzCount(c.text);
        if (n < 1) return null;
        var font = jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'display')), pips = !!jzP(ctx, 'pips', true);
        var rowsD = ld2_rowsOf(c.text, port ? 5 : n <= 7 ? 7 : Math.ceil(n / 2)), rows = rowsD.length, per = 1;
        for (r = 0; r < rows; r++) per = Math.max(per, rowsD[r].length);
        var asp = pips ? 1.9 : 1.45, gapK = 0.5;
        var w = Math.min(W * 0.84 / (per + (per - 1) * gapK), H * 0.72 / (rows * asp + (rows - 1) * 0.35), u * 0.2), h = w * asp, g = w * gapK;
        var faceC = jzP(ctx, 'face', 'light') === 'ink' ? ld2_plateCol(sc, [sc.ink, sc.fg]) : jzMixHex(ld2_light(sc), sc.accent, 0.06);
        var tc = ld2_onCol(sc, faceC), sideC = ld2_shade(sc, faceC, -0.35), pipC = jzMixHex(faceC, tc, 0.7), thick = w * 0.12;
        var lean = Math.asin(jzClamp((g - thick * 0.2) / h, 0, 0.95)) * 180 / Math.PI;
        var T0 = 0.1, dT = jzClamp(c.dur * 0.3 / n, 0.04, 0.09), rise = 0.26;
        var outDur = Math.max(0.3, Math.min(c.dur * 0.35, (c.outDur || 0.3) + 0.25)), oStart = c.dur - outDur, TH = ld2_TH(ctx);
        var FLN = jzNoGhost(jzShapeLayer(ctx, 'floor lines', 0, 0)), bb = null, gi = 0;
        jzSetExpr(jzXf(FLN, 'ADBE Opacity'), TH + '50*oe(time/0.3)*K');
        for (r = 0; r < rows; r++) {
            var row = rowsD[r], cnt = row.length, yF = H / 2 + (r - (rows - 1) / 2) * (h + w * 0.35) + h / 2, half = cnt * (w + g) / 2 + w * 0.4;
            var gfl = jzGrp(FLN, 'floor ' + (r + 1));
            jzAddPath(gfl, [[W / 2 - half, yF], [W / 2 + half, yF]], false); jzAddStroke(gfl, sc.sub, Math.max(1, u * 0.0018));
            for (j = 0; j < cnt; j++) {
                if (row[j] === ' ') continue;
                var i = gi++, xc = W / 2 + (j - (cnt - 1) / 2) * (w + g), ti = T0 + i * dT;
                // stand up in a wave from the left (pivot = bottom-left corner), fall in a chain to the right (bottom-right corner)
                var hd = TH + 'var fu=cl((time-' + jzN(ti) + ')/' + jzN(rise) + '),th=0,pv=0;if(fu<1){th=-' + jzN(j === 0 ? 88 : lean) + '*(1-ob(fu,1.6));pv=-1;}' +
                    'var fo=(time-(' + jzN(oStart + j * 0.05) + '))/0.3;if(fo>0){th=' + jzN(j === cnt - 1 ? 88 : lean) + '*iq(Math.min(1,fo));pv=1;}' +
                    'var vis=cl((time-' + jzN(ti - 0.08) + ')/0.1)*(1-ic(cl((PO-0.7)/0.3)));';
                var TL = jzNoGhost(jzShapeLayer(ctx, 'tile ' + (i + 1), xc, yF));
                if (pips) {
                    var gp = jzGrp(TL, 'pips'), pn = jzHash(s, i, 11) % 7;
                    for (q = 0; q < LD2_PIPS[pn].length; q++) jzAddEllipse(gp, w * 0.14, w * 0.14, LD2_PIPS[pn][q][0] * w * 0.22, -h * 0.235 + LD2_PIPS[pn][q][1] * w * 0.22);
                    jzAddFill(gp, pipC);
                    var gln = jzGrp(TL, 'half line'); jzAddPath(gln, [[-w * 0.36, -h * 0.47], [w * 0.36, -h * 0.47]], false); jzAddStroke(gln, jzMixHex(faceC, tc, 0.45), Math.max(1, w * 0.03));
                }
                var gfc = jzGrp(TL, 'face'); jzAddRect(gfc, w, h, w * 0.1, 0, -h / 2); jzAddFill(gfc, faceC);
                var gsd = jzGrp(TL, 'side'); jzAddPath(gsd, [[w / 2, -h + thick * 0.4], [w / 2 + thick, -h + thick * 0.7], [w / 2 + thick, thick * 0.3], [w / 2, 0]], true); jzAddFill(gsd, sideC);
                var gsh = jzGrp(TL, 'shadow'); jzAddPath(gsh, [[-w / 2, 0], [w / 2, 0], [w * 0.6, w * 0.04], [-w * 0.4, w * 0.04]], true); jzAddFill(gsh, ld2_dark(sc), 25);
                jzSetExpr(jzXf(TL, 'ADBE Anchor Point'), hd + '[pv*' + jzN(w / 2) + ',0]');
                jzSetExpr(jzXf(TL, 'ADBE Position'), hd + '[' + jzN(xc) + '+pv*' + jzN(w / 2) + ',' + jzN(yF) + ']');
                jzSetExpr(jzXf(TL, 'ADBE Rotate Z'), hd + 'th');
                jzSetExpr(jzXf(TL, 'ADBE Opacity'), hd + '100*vis');
                // the glyph rides on the tile
                var cyT = pips ? -h * 0.735 : -h / 2;
                var G = ld2_G(ctx, row[j], font, w * 0.7, xc, yF + cyT, tc);
                ld2_opAnim(G, 'JZ Tile Alpha', hd, 'a=vis');
                jzAnimate(ctx, G, { mi: ld2_miAt(ctx, ti), noHold: ld2_plateHold(ctx) });
                ld2_parent(G, TL, 0, cyT);
                bb = jzUnion(bb, ld2_box(xc - w * 0.4, yF + cyT - w * 0.4, xc + w * 0.4, yF + cyT + w * 0.4));
            }
        }
        return bb;
    }
});

/* ================================================================== 23 burst — ドカン */
jzReg('layout', 'burst', {
    plan: function (rng, cut, st) {
        return { font: rng.pick(jzFontsOf(st, ['display'])), spikes: rng.int(13, 19), sharp: rng.range(0.66, 0.78), tilt: rng.range(-9, 9), lines: rng.chance(0.75), debris: rng.chance(0.8), order: rng.pick(['accent', 'ink']) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, s = c.seed, u = jzU(ctx), port = jzPortrait(ctx), i, v;
        var font = jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'display')), text = ld2_brk(c.text, port ? 4 : 6), tr = 0.02, lead = 1.05;
        var rxM = W * 0.355, ryM = Math.min(H * 0.355, rxM * (port ? 1.5 : 1.1));
        var size = Math.min(ld2_fit(ctx, text, font, rxM * 1.08, ryM, tr, lead), u * 0.24), m = ld2_measAt(ctx, text, font, size, tr, lead);
        var rx = Math.min(rxM, m.w / 2 / 0.54 + size * 0.15), ry = Math.min(ryM, Math.max(m.h / 2 / 0.54 + size * 0.15, rx * 0.55)), cx = W / 2, cy = H / 2;
        var N = Math.max(5, Math.round(jzP(ctx, 'spikes', 16))), sharp = jzP(ctx, 'sharp', 0.72), tilt = jzP(ctx, 'tilt', 0);
        var A = ld2_plateCol(sc, jzP(ctx, 'order', 'accent') === 'accent' ? [sc.accent, sc.ink] : [sc.ink, sc.accent]), B = null, cand = [ld2_dark(sc), ld2_light(sc), sc.bg, sc.fg];
        for (i = 0; i < cand.length; i++) if (!B && jzContrast(cand[i], A) >= 2.2 && cand[i] !== A) B = cand[i];
        B = B || ld2_onCol(sc, A);
        var TH = ld2_TH(ctx), QR = TH + 'var q=ob(cl(time/0.3),2.2)*(1-0.6*ic(PO))*(1+0.015*Math.sin(time*7)*cl(time-0.3)),ROT=' + jzN(tilt) + '+(1-oc(time/0.3))*-25+ic(PO)*20;';
        // shock ring
        var RG = jzNoGhost(jzShapeLayer(ctx, 'shock ring', cx, cy)), gr = jzGrp(RG, 'ring'), R0 = Math.max(rx, ry) * 2;
        var el = jzAddEllipse(gr, R0, R0), stR = jzAddStroke(gr, A, Math.max(2, u * 0.012)), RN = TH + 'var rg=cl(time/0.45);';
        jzSetExpr(el.property('ADBE Vector Ellipse Size'), RN + 'var d=' + jzN(R0) + '*(0.6+rg*1.1);[d,d]');
        jzSetExpr(stR.property('ADBE Vector Stroke Width'), RN + 'value*(1-rg)');
        jzSetExpr(jzXf(RG, 'ADBE Opacity'), RN + 'rg>=1?0:(1-rg)*K*100');
        // speed lines (flicker per frame)
        if (jzP(ctx, 'lines', true)) {
            var SL = jzNoGhost(jzShapeLayer(ctx, 'speed lines', cx, cy));
            for (i = 0; i < 28; i++) {
                var a = i / 28 * Math.PI * 2 + (jzR(s, i, 8) * 2 - 1) * 0.08, r0 = 1.325, r1 = r0 + 0.2 + jzR(s, i, 11) * 0.25, gl = jzGrp(SL, 'line ' + (i + 1));
                jzAddPath(gl, [[Math.cos(a) * rx * r0, Math.sin(a) * ry * r0], [Math.cos(a) * rx * r1, Math.sin(a) * ry * r1]], false); jzAddStroke(gl, sc.sub, Math.max(1.5, u * 0.004));
                var FK = TH + 'var st=Math.floor(time*24);';
                ld2_gX(gl, 'ADBE Vector Group Opacity', FK + 'hh(SD+' + (i * 7) + '+st*1.37)<0.3?0:100');
                ld2_gX(gl, 'ADBE Vector Scale', FK + 'var k=100+(hh(SD+' + (i * 11) + '+st*2.11)-0.5)*12;[k,k]');
            }
            jzSetExpr(jzXf(SL, 'ADBE Scale'), QR + '[q*100,q*100]');
            jzSetExpr(jzXf(SL, 'ADBE Opacity'), TH + '70*K');
        }
        // debris flying out
        if (jzP(ctx, 'debris', true)) {
            var DB = jzNoGhost(jzShapeLayer(ctx, 'debris', cx, cy)), sz0 = u * 0.018;
            for (i = 0; i < 12; i++) {
                var a2 = jzR(s, i, 21) * Math.PI * 2, sp = 0.5 + 0.6 * jzR(s, i, 22), rr = jzR(s, i, 23) * Math.PI * 2, gd = jzGrp(DB, 'bit ' + (i + 1));
                jzAddPath(gd, [[sz0, 0], [Math.cos(2.2) * sz0, Math.sin(2.2) * sz0], [Math.cos(4.1) * sz0 * 0.7, Math.sin(4.1) * sz0 * 0.7]], true); jzAddFill(gd, i % 2 ? A : B);
                var DF = TH + 'var f=oc(time/0.8),d=1.05+f*0.6*' + jzN(sp) + ';';
                ld2_gX(gd, 'ADBE Vector Position', DF + '[' + jzN(Math.cos(a2) * rx) + '*d,' + jzN(Math.sin(a2) * ry) + '*d+f*f*' + jzN(H * 0.05) + ']');
                ld2_gX(gd, 'ADBE Vector Scale', DF + '[(1-f)*100,(1-f)*100]');
                ld2_gX(gd, 'ADBE Vector Rotation', DF + '(' + jzN(rr) + '+f*6)*180/Math.PI');
            }
            jzSetExpr(jzXf(DB, 'ADBE Opacity'), TH + 'time<0.9?100*K:0');
        }
        // the plate: 3 stacked jagged stars + shadow, each boiling between 3 drawings
        var ST = jzNoGhost(jzShapeLayer(ctx, 'burst', cx, cy)), defs = [[3, 0.86, 0.08, A], [2, 0.93, 0.12, B], [1, 1.12, 0.22, A], [1, 1.12, 0.22, ld2_dark(sc)]];
        for (var k = 0; k < defs.length; k++) {
            var df = defs[k], gk = jzGrp(ST, k === 3 ? 'shadow' : 'star ' + (k + 1));
            for (v = 0; v < 3; v++) {
                var pts = [], gv = ld2_sub(gk, 'boil ' + (v + 1));
                for (i = 0; i < N * 2; i++) {
                    var an = i / (N * 2) * Math.PI * 2, rq = i % 2 ? sharp + (jzR(s, i, df[0], v) * 2 - 1) * 0.04 : 1 + jzR(s, i, df[0], v) * df[2];
                    pts.push([Math.cos(an) * rx * rq * df[1], Math.sin(an) * ry * rq * df[1]]);
                }
                jzAddPath(gv, pts, true); jzAddFill(gv, df[3], k === 3 ? 30 : 100);
                ld2_gX(gv, 'ADBE Vector Group Opacity', 'Math.floor(time*8)%3==' + v + '?100:0');
            }
            if (k === 3) ld2_gX(gk, 'ADBE Vector Position', QR + 'var qq=Math.max(q,0.01),aa=-ROT*Math.PI/180,ox=' + jzN(u * 0.012) + ',oy=' + jzN(u * 0.016) + ';[(ox*Math.cos(aa)-oy*Math.sin(aa))/qq,(ox*Math.sin(aa)+oy*Math.cos(aa))/qq]');
        }
        jzSetExpr(jzXf(ST, 'ADBE Scale'), QR + '[q*100,q*100]');
        jzSetExpr(jzXf(ST, 'ADBE Rotate Z'), QR + 'ROT');
        jzSetExpr(jzXf(ST, 'ADBE Opacity'), QR + 'q<=0.01?0:100*K');
        // the lyric rides a pivot that follows the plate (0.6 of its turn, never larger than 1)
        var NP = ld2_null(ctx, 'burst pivot', cx, cy);
        jzSetExpr(jzXf(NP, 'ADBE Rotate Z'), QR + 'ROT*0.6');
        jzSetExpr(jzXf(NP, 'ADBE Scale'), QR + 'var k=Math.min(1,q)*100;[k,k]');
        var L = ld2_T(ctx, text, font, size, { color: ld2_onCol(sc, A), x: cx, y: cy, track: tr, lead: lead });
        var bb = jzBB(L);
        jzAnimate(ctx, L, { mi: 0 });
        ld2_parent(L, NP, 0, 0);
        return bb;
    }
});

/* ================================================================== 24 fisheye — 魚眼レンズ */
// circular arc (degrees, screen angles) as an open bezier Shape
function ld2_arc(cx, cy, r, a0, a1) {
    var segs = Math.max(1, Math.ceil(Math.abs(a1 - a0) / 90)), da = (a1 - a0) / segs, k = 4 / 3 * Math.tan(da * Math.PI / 720) * r, V = [], I = [], O = [];
    for (var i = 0; i <= segs; i++) {
        var a = (a0 + da * i) * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
        V.push([cx + c * r, cy + s * r]); I.push(i ? [s * k, -c * k] : [0, 0]); O.push(i < segs ? [-s * k, c * k] : [0, 0]);
    }
    var sh = new Shape(); sh.vertices = V; sh.inTangents = I; sh.outTangents = O; sh.closed = false;
    return sh;
}
jzReg('layout', 'fisheye', {
    plan: function (rng, cut, st) {
        return { font: rng.pick(jzFontsOf(st, ['display', 'serif'])), mode: rng.pick(['sweep', 'sweep', 'pingpong']), glass: rng.pick(['lens', 'lens', 'grid', 'none']), amp: rng.range(0.7, 1.1) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, u = jzU(ctx), port = jzPortrait(ctx), i, j, ri;
        var font = jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'display')), t0 = jzFlat(c.text), n = jzCount(t0);
        if (!n) return null;
        var A = jzP(ctx, 'amp', 0.9), mode = jzP(ctx, 'mode', 'sweep') === 'pingpong' ? 1 : 0, glass = jzP(ctx, 'glass', 'lens');
        var rowsT = n > (port ? 6 : 10) ? ld2_chunksK(t0, port ? Math.ceil(n / 6) : 2) : [t0], nR = rowsT.length, rowsC = [], s0 = u * 0.16;
        for (ri = 0; ri < nR; ri++) { var ch = jzChars(jzTrim(rowsT[ri])), a = 0; for (j = 0; j < ch.length; j++) a += ld2_adv(ch[j]); s0 = Math.min(s0, W * 0.84 / (a + A * 1.6)); rowsC.push(ch); }
        s0 = Math.min(s0, H * 0.6 / (nR * (1.4 + A * 0.5)));
        var sig = s0 * 1.25, RB = [], RY = [], XL = [], TW = [], bb = null;
        for (ri = 0; ri < nR; ri++) {
            var ws = [], tot = 0;
            for (j = 0; j < rowsC[ri].length; j++) { ws.push(ld2_adv(rowsC[ri][j]) * s0); tot += ws[j]; }
            RB.push(ws); TW.push(tot); XL.push(W / 2 - tot / 2); RY.push(H / 2 + (ri - (nR - 1) / 2) * s0 * (1.35 + A * 0.55));
        }
        var rb = [];
        for (ri = 0; ri < nR; ri++) rb.push(jzArrExpr(RB[ri]));
        // row(ri): bulge factor per glyph (lens at lx, gaussian), re-flowed round the centre
        var FE = ld2_TH(ctx) + 'var RB=[' + rb.join(',') + '],RY=' + jzArrExpr(RY) + ',XL=' + jzArrExpr(XL) + ',TW=' + jzArrExpr(TW) + ',SIG=' + jzN(sig) + ',AMP=' + jzN(A) + ',NR=' + nR + ',W2=' + jzN(W / 2) + ',MODE=' + mode + ';' +
            'var LI=oc((time-0.1)/0.4)*(1-ic(PO)),TT=cl((time-0.2)/' + jzN(Math.max(0.4, c.dur - 0.5)) + ');' +
            'function lensX(r){if(MODE==0){var f=TT*NR-r;return (f<0||f>1)?null:XL[r]-SIG+(TW[r]+SIG*2)*ios(f);}return XL[r]+TW[r]*(0.5-0.5*Math.cos(time*1.6+r*1.3));}' +
            'function row(r){var B=RB[r],lx=lensX(r),ks=[],acc=0,tot=0;for(var j=0;j<B.length;j++){var x=XL[r]+acc+B[j]/2;acc+=B[j];var k=lx==null?1:1+AMP*LI*Math.exp(-Math.pow((x-lx)/SIG,2));ks.push(k);tot+=B[j]*k;}return {ks:ks,tot:tot,lx:lx};}\n';
        for (ri = 0; ri < nR; ri++) {
            var L = ld2_G(ctx, rowsC[ri].join(''), font, s0, W / 2, RY[ri], sc.fg, rowsT[ri]);
            var hd = FE + 'var R=row(' + ri + '),B=RB[' + ri + '],i=Math.min(textIndex-1,B.length-1),k=R.ks[i],xr=XL[' + ri + '],xn=W2-R.tot/2;for(var j=0;j<i;j++){xr+=B[j];xn+=B[j]*R.ks[j];}xr+=B[i]/2;xn+=B[i]*k/2;';
            ld2_posAnim(L, 'JZ Lens Flow', W, hd, 'dx=xn-xr');
            ld2_scAnim(L, 'JZ Lens Bulge', hd, 'sx=k;sy=k');
            ld2_colAnim(L, 'JZ Lens Tint', sc.accent, hd, 'm=k>1.35?1:0');
            jzAnimate(ctx, L, { mi: ri * 3 });
            bb = jzUnion(bb, ld2_box(W / 2 - TW[ri] / 2 - s0 * 0.4, RY[ri] - s0 * 0.7, W / 2 + TW[ri] / 2 + s0 * 0.4, RY[ri] + s0 * 0.7));
            if (glass === 'grid') {
                // warped grid round the lens (drawn at full bulge, faded with it)
                var GR = jzNoGhost(jzShapeLayer(ctx, 'lens grid ' + (ri + 1), 0, 0)), gg = jzGrp(GR, 'grid'), gq = s0 * 0.5, q, kq;
                var warp = function (dx, dy) { var rr = Math.sqrt(dx * dx + dy * dy), f = 1 + 0.9 * A * Math.exp(-Math.pow(rr / (sig * 1.4), 2)); return [dx * f, dy * f]; };
                for (kq = -3; kq <= 3; kq++) { var p1 = []; for (q = -12; q <= 12; q++) p1.push(warp(q * gq * 0.5, kq * gq)); jzAddPath(gg, p1, false); }
                for (kq = -6; kq <= 6; kq++) { var p2 = []; for (q = -6; q <= 6; q++) p2.push(warp(kq * gq, q * gq * 0.5)); jzAddPath(gg, p2, false); }
                jzAddStroke(gg, sc.sub, Math.max(1, u * 0.0012));
                jzSetExpr(jzXf(GR, 'ADBE Position'), FE + 'var lx=lensX(' + ri + ');[lx==null?-9999:lx,RY[' + ri + ']]');
                jzSetExpr(jzXf(GR, 'ADBE Opacity'), FE + 'lensX(' + ri + ')==null?0:35*K*LI');
            }
        }
        if (glass === 'lens') {
            // magnifier over the most bulged glyph (the active row when sweeping, the last row in ping-pong)
            var R0 = s0 * 1.05, lw = Math.max(2, u * 0.005), LS = jzNoGhost(jzShapeLayer(ctx, 'lens', 0, 0)), lc = ld2_light(sc);
            var gh = jzGrp(LS, 'handle'), a50 = 50 * Math.PI / 180;
            jzAddPath(gh, [[Math.cos(a50) * R0, Math.sin(a50) * R0], [Math.cos(a50) * R0 * 1.75, Math.sin(a50) * R0 * 1.75]], false); jzAddStroke(gh, sc.sub, lw * 2.6);
            var ga = jzGrp(LS, 'glint'); ld2_path(ga, ld2_arc(0, 0, R0 * 0.8, 200, 250)); jzAddStroke(ga, lc, lw * 0.8, 70);
            var gr = jzGrp(LS, 'rim'); jzAddEllipse(gr, R0 * 2, R0 * 2); jzAddStroke(gr, sc.sub, lw); jzAddFill(gr, lc, 6);
            var LH = FE + 'var ri=MODE==0?Math.max(0,Math.min(NR-1,Math.floor(TT*NR))):NR-1,R=row(ri),B=RB[ri],bi=0,bw=0,x=W2-R.tot/2;for(var j=0;j<B.length;j++)if(R.ks[j]>bw){bw=R.ks[j];bi=j;}' +
                'for(j=0;j<bi;j++)x+=B[j]*R.ks[j];x+=B[bi]*bw/2;var RL=Math.max(' + jzN(s0) + '*(0.5+0.5*bw)*0.95*1.25,' + jzN(R0) + ');';
            jzSetExpr(jzXf(LS, 'ADBE Position'), LH + '[x,RY[ri]]');
            jzSetExpr(jzXf(LS, 'ADBE Scale'), LH + '[RL/' + jzN(R0) + '*100,RL/' + jzN(R0) + '*100]');
            jzSetExpr(jzXf(LS, 'ADBE Opacity'), LH + 'R.lx==null?0:100*LI');
        }
        return bb;
    }
});

/* ================================================================== 25 wall — 壁面パース */
jzReg('layout', 'wall', {
    plan: function (rng, cut, st) {
        return { font: rng.pick(jzFontsOf(st, ['display', 'display', 'serif'])), side: rng.pick([1, -1]), yaw: rng.range(36, 46), orbit: rng.range(8, 14), stripe: rng.chance(0.7), eye: rng.range(-0.06, 0.06), tone: rng.pick(['plate', 'plain']) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, u = jzU(ctx), port = jzPortrait(ctx), i, j, r;
        var font = jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'display')), side = jzP(ctx, 'side', 1) < 0 ? -1 : 1, yaw0 = jzP(ctx, 'yaw', 40), orbit = jzP(ctx, 'orbit', 10);
        var eye = jzP(ctx, 'eye', 0), tone = jzP(ctx, 'tone', 'plate'), f = Math.max(W, H) * 1.05, D = f;
        var ccx = W / 2 - side * W * (port ? 0.3 : 0.22), ccy = H * (0.5 + eye), Ht = H * (port ? 0.26 : 0.4), Hb = H * (port ? 0.2 : 0.34), LL = D * (port ? 1.5 : 1.15), LO = D * 1.2;
        var plate = tone === 'plate' ? ld2_plateCol(sc, [sc.ink, sc.fg]) : jzMixHex(sc.bg, sc.fg, jzLum(sc.bg) < 0.5 ? 0.1 : 0.07);
        var litW = ld2_shade(sc, plate, 0.06), dimW = ld2_shade(sc, plate, -0.3), tc = tone === 'plate' ? ld2_onCol(sc, plate) : sc.fg;
        // projection (expressions): a corner at depth D, the lyric wall along dL, the other wall along dO, yaw orbiting in / out
        var WH = ld2_TH(ctx) + 'var F=' + jzN(f) + ',D=' + jzN(D) + ',SIDE=' + side + ',CX=' + jzN(ccx) + ',CY=' + jzN(ccy) + ',HT=' + jzN(Ht) + ',HB=' + jzN(Hb) + ',LL=' + jzN(LL) + ',LO=' + jzN(LO) + ';' +
            'var a0=oc(time/0.9),YAW=(' + jzN(yaw0) + '+(1-a0)*' + jzN(orbit * 2.2) + '+Math.sin(time*0.35)*' + jzN(orbit * 0.15) + '+ic(PO)*' + jzN(orbit * 1.5) + ')*Math.PI/180;' +
            'var dL=[SIDE*Math.sin(YAW),Math.cos(YAW)],dO=[-SIDE*Math.cos(YAW),Math.sin(YAW)],WA=oc(time/0.5)*K;' +
            'function PJ(d,s,Y){var Z=D+d[1]*s;return [CX+F*d[0]*s/Z,CY+F*Y/Z];}function FACE(d,L,y0,y1){return [PJ(d,0,y0),PJ(d,L,y0),PJ(d,L,y1),PJ(d,0,y1)];}\n';
        var pj = function (d, s, Y) { var Z = D + d[1] * s; return [ccx + f * d[0] * s / Z, ccy + f * Y / Z]; };
        var yr = yaw0 * Math.PI / 180, dLr = [side * Math.sin(yr), Math.cos(yr)];
        // ground + horizon
        var GD = jzRectLayer(ctx, 'ground', W / 2, (ccy + H) / 2, W, H - ccy, jzMixHex(sc.bg, ld2_dark(sc), 0.35));
        jzSetExpr(jzXf(GD, 'ADBE Opacity'), WH + '50*WA');
        var HZ = jzRectLayer(ctx, 'horizon', W / 2, ccy, W, Math.max(1, u * 0.001), sc.sub);
        jzSetExpr(jzXf(HZ, 'ADBE Opacity'), WH + '25*WA'); ld2_ng([GD, HZ]);
        // walls (quads mapped by group transforms), stripes on top
        var WS = jzShapeLayer(ctx, 'walls', 0, 0);
        if (jzP(ctx, 'stripe', true)) {
            ld2_quad(WS, 'stripe lyric wall', sc.accent, WH, 'var Q=FACE(dL,LL*WA,HB*0.55,HB*0.72);');
            ld2_quad(WS, 'stripe other wall', sc.accent, WH, 'var Q=FACE(dO,LO*WA,HB*0.55,HB*0.72);');
        }
        var gcn = jzGrp(WS, 'corner');
        jzAddPath(gcn, [[ccx, ccy - f * Ht / D], [ccx, ccy + f * Hb / D]], false); jzAddStroke(gcn, jzMixHex(litW, ld2_dark(sc), 0.3), Math.max(1, u * 0.0016) * 1.5);
        ld2_quad(WS, 'lyric wall', litW, WH, 'var Q=FACE(dL,LL*WA,-HT,HB);');
        ld2_quad(WS, 'other wall', dimW, WH, 'var Q=FACE(dO,LO*WA,-HT,HB);');
        jzSetExpr(jzXf(WS, 'ADBE Opacity'), WH + '100*K'); jzNoGhost(WS);
        // per-glyph perspective: glyph centre p0, local x along the wall, local y world-vertical -> rotation + skew + scale
        var GLY = 'var p0=PJ(DV,sp,Y),p1=PJ(DV,sp+FS,Y),p2=PJ(DV,sp,Y+1),m11=p1[0]-p0[0],m21=p1[1]-p0[1],m12=p2[0]-p0[0],m22=p2[1]-p0[1],th=Math.atan2(m21,m11),cs=Math.cos(th),sn=Math.sin(th),' +
            'jx=Math.sqrt(m11*m11+m21*m21),jy=-m12*sn+m22*cs,kk=Math.abs(jy)<1e-6?0:(m12*cs+m22*sn)/jy;';
        var KB = Math.max(W, H) * 3;
        var persp = function (L, hd, fs, cnt) {
            ld2_posAnim(L, 'JZ Wall Place', KB + cnt * fs, hd, 'dx=p0[0];dy=p0[1]-(i*' + jzN(fs) + '-' + jzN(LD2_CY * fs) + ')');
            ld2_rotAnim(L, 'JZ Wall Turn', 180, hd, 'r=th*180/Math.PI');
            ld2_skAnim(L, 'JZ Wall Skew', hd, 'k=Math.atan(kk)*180/Math.PI');
            ld2_scAnim(L, 'JZ Wall Scale', hd, 'sx=jx;sy=jy');
        };
        // other wall: rows of the line in small type
        var oc = jzFlat(c.lineText || c.text), rowsO = port ? 3 : 4, fsO = Ht * 0.12, fo = jzBodyF(ctx);
        var ochs = jzChars(oc + '　・　' + oc + '　・　' + oc).slice(0, 40), ads = [], tot = 0, cnt = 0;
        for (i = 0; i < ochs.length; i++) { var ad = ld2_adv(ochs[i]) * fsO * 1.1; if (tot + ad > LO * 0.86) break; ads.push(ad); tot += ad; cnt++; }
        var OG = [], OSP = [], OY = [], ORW = [];
        for (r = 0; r < rowsO; r++) {
            var uu = 0;
            for (i = 0; i < cnt; i++) {
                var mid = uu + ads[i] / 2; uu += ads[i];
                if (ochs[i] === ' ' || ochs[i] === '　') continue;
                OG.push(ochs[i]); OSP.push(-side >= 0 ? LO * 0.07 + mid : LO * 0.07 + tot - mid); OY.push(-Ht * 0.72 + r * fsO * 1.9); ORW.push(r);
            }
        }
        if (OG.length) {
            var OL = jzNoGhost(ld2_glyphs(ctx, OG, { font: fo, size: fsO, color: jzMixHex(dimW, ld2_onCol(sc, dimW), 0.55), name: 'other wall copy' }));
            var oh = WH + 'var SPA=' + jzArrExpr(OSP) + ',YA=' + jzArrExpr(OY) + ',RWA=' + jzArrExpr(ORW) + ',i=textIndex-1,sp=SPA[i],Y=YA[i],DV=dO,FS=' + (side > 0 ? -1 : 1) + ';' + GLY;
            persp(OL, oh, fsO, OG.length);
            ld2_opAnim(OL, 'JZ Wall Copy In', oh, 'a=WA*cl((time-0.2-RWA[i]*0.08)/0.3)');
        }
        // the lyric along the main wall (one layer per line, pivot = its settled centre)
        var t0 = jzFlat(c.text), n = jzCount(t0), lines = n > (port ? 5 : 8) ? ld2_chunksK(t0, port ? Math.ceil(n / 5) : 2) : [t0], nl = lines.length, bb = null;
        var g = (Ht + Hb * 0.5) * 0.62 / (nl * 1.15);
        for (j = 0; j < nl; j++) { var aa = 0, lc = jzChars(lines[j]); for (i = 0; i < lc.length; i++) aa += ld2_adv(lc[i]) * 1.04; g = Math.min(g, LL * 0.86 / Math.max(1, aa)); }
        for (j = 0; j < nl; j++) {
            var chs = jzChars(jzTrim(lines[j])), Y = -Ht * 0.25 + (j - (nl - 1) / 2) * g * 1.15, SP = [], tt = 0, u2 = 0, x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
            for (i = 0; i < chs.length; i++) tt += ld2_adv(chs[i]) * g * 1.04;
            for (i = 0; i < chs.length; i++) {
                var a2 = ld2_adv(chs[i]) * g * 1.04, md = u2 + a2 / 2; u2 += a2;
                var sp = side >= 0 ? LL * 0.07 + md : LL * 0.07 + tt - md; SP.push(sp);
                var q0 = pj(dLr, sp, Y - g / 2), q1 = pj(dLr, sp, Y + g / 2);
                x0 = Math.min(x0, q0[0] - g / 2); x1 = Math.max(x1, q0[0] + g / 2); y0 = Math.min(y0, q0[1]); y1 = Math.max(y1, q1[1]);
            }
            var box = ld2_box(x0, y0, x1, y1);
            bb = jzUnion(bb, box);
            var ML = ld2_glyphs(ctx, chs, { font: font, size: g, color: tc, name: lines[j], ax: box.cx, ay: box.cy });
            var mh = WH + 'var SPA=' + jzArrExpr(SP) + ',i=Math.min(textIndex-1,SPA.length-1),sp=SPA[i],Y=' + jzN(Y) + ',DV=dL,FS=' + (side < 0 ? -1 : 1) + ';' + GLY;
            persp(ML, mh, g, chs.length);
            ld2_opAnim(ML, 'JZ Wall Reach', mh, 'a=sp<=LL*WA?1:0');
            jzAnimate(ctx, ML, { mi: j * 3, noHold: true });
        }
        return bb;
    }
});

/* ================================================================== 26 origami — 折り紙 */
jzReg('layout', 'origami', {
    plan: function (rng, cut, st) {
        var port = cut.H > cut.W * 1.08;
        return { font: rng.pick(jzFontsOf(st, ['serif', 'display'])), mode: !port && cut.n > 6 && rng.chance(0.6) ? 'gate' : rng.pick(['blintz', 'blintz', 'gate']), col: rng.pick(['accent', 'accent', 'ink']), order: rng.int(0, 3) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, u = jzU(ctx), port = jzPortrait(ctx), i, q;
        var font = jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'serif')), paper0 = ld2_light(sc), dk = ld2_dark(sc), lt = ld2_light(sc), back = null;
        var cand = jzP(ctx, 'col', 'accent') === 'ink' ? [sc.accent2, sc.accent, sc.ink] : [sc.accent, sc.accent2, sc.ink];
        for (i = 0; i < cand.length; i++) if (!back && cand[i] && jzContrast(cand[i], paper0) >= 1.5 && jzContrast(cand[i], sc.bg) >= 1.3) back = cand[i];
        back = back || dk;
        var paper = jzMixHex(paper0, back, 0.05), tc = ld2_onCol(sc, paper) === paper ? dk : (jzContrast(dk, paper) > 3 ? dk : ld2_onCol(sc, paper));
        var crease = jzMixHex(paper, dk, 0.22), cx = W / 2, cy = H / 2, TH = ld2_TH(ctx), lw = Math.max(1, u * 0.001);
        var t0 = jzFlat(c.text), n = jzCount(t0), order = jzP(ctx, 'order', 0);
        // flap angle (deg) of flap q: opens in turn, closes again on the way out; c = cos
        var FA = function (qq) { return TH + 'var p=ioc((time-' + jzN(0.1 + qq * 0.13) + ')/0.36)*166,oF=cl(PO*1.3);if(oF>0)p=Math.min(p,166*(1-ioc((oF-' + jzN(qq * 0.12 * 0.8) + ')/0.6)));var c=Math.cos(p*Math.PI/180);' +
            'function mx(a,b,t){t=Math.max(0,Math.min(0.9,t));return [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t,1];}' +
            'function sh(col,s){return s>=0?mx(col,' + ld2_rgb(lt) + ',s):mx(col,' + ld2_rgb(dk) + ',-s);}'; };
        // everything shrinks into the centre at the very end: one pivot
        var PV = ld2_null(ctx, 'paper pivot', cx, cy);
        jzXf(PV, 'ADBE Anchor Point').setValue([cx, cy]);
        jzSetExpr(jzXf(PV, 'ADBE Scale'), TH + 'var k=(1-ic(cl((PO-0.75)/0.25)))*100;[k,k]');
        var sheet = jzShapeLayer(ctx, 'paper', 0, 0), under = null, over = null, text, size, tr, lead, mi, bbox;
        if (jzP(ctx, 'mode', 'blintz') === 'gate' && !port) {
            text = ld2_brk(t0, 9); tr = 0.04; lead = 1.12; mi = 0.15;
            size = Math.min(ld2_fit(ctx, text, font, W * 0.66, H * 0.4, tr, lead), u * 0.2);
            var m = ld2_measAt(ctx, text, font, size, tr, lead), sw = Math.min(W * 0.86, m.w + size * 1.6), shh = Math.min(H * 0.72, m.h + size * 1.4), x0 = cx - sw / 2, y0 = cy - shh / 2;
            var g1 = jzGrp(sheet, 'creases');
            jzAddPath(g1, [[x0 + sw / 4, y0], [x0 + sw / 4, y0 + shh]], false); jzAddPath(g1, [[x0 + sw * 3 / 4, y0], [x0 + sw * 3 / 4, y0 + shh]], false); jzAddStroke(g1, crease, lw, 80);
            var g2 = jzGrp(sheet, 'sheet'); jzAddRect(g2, sw, shh, 0, cx, cy); jzAddFill(g2, paper);
            var g3 = jzGrp(sheet, 'shadow'); jzAddRect(g3, sw, shh, 0, cx + u * 0.012, cy + u * 0.018); jzAddFill(g3, dk, 30);
            bbox = ld2_box(x0, y0, x0 + sw, y0 + shh);
            var gate = function (S, isUnder) {
                for (var k = 0; k < 2; k++) {
                    var hx = k ? x0 + sw * 3 / 4 : x0 + sw / 4, dir = k ? -1 : 1, hd = FA(k), gd = jzGrp(S, 'door ' + (k + 1));
                    var ge = ld2_sub(gd, 'edge'); jzAddRect(ge, Math.max(1.5, u * 0.0015), shh, 0, dir * sw / 4, 0); var fe = jzAddFill(ge, ld2_shade(sc, back, 0.25));
                    ld2_gX(ge, 'ADBE Vector Group Opacity', hd + 'c>0?100:0');
                    var gp = ld2_sub(gd, 'leaf'); jzAddRect(gp, sw / 4, shh, 0, dir * sw / 8, 0); var fp = jzAddFill(gp, back);
                    jzSetExpr(fp.property('ADBE Vector Fill Color'), hd + 'c>0?sh(' + ld2_rgb(back) + ',-0.25*(1-c)):sh(' + ld2_rgb(paper) + ',' + jzN(k ? -0.09 : 0.03) + '*-c-0.35*(1+c))');
                    jzGX(gd).property('ADBE Vector Position').setValue([hx, cy]);
                    ld2_gX(gd, 'ADBE Vector Scale', hd + '[c*100,100]');
                    ld2_gX(gd, 'ADBE Vector Group Opacity', hd + ((isUnder ? 'c<0' : 'c>=0') + '?100:0'));
                }
            };
            under = jzShapeLayer(ctx, 'doors (open)', 0, 0); gate(under, true);
            var L = ld2_T(ctx, text, font, size, { color: tc, x: cx, y: cy, track: tr, lead: lead });
            jzAnimate(ctx, L, { mi: ld2_miAt(ctx, mi), noHold: ld2_plateHold(ctx) });
            over = jzShapeLayer(ctx, 'doors (closed)', 0, 0); gate(over, false);
        } else {
            // blintz: a diamond sheet, four corners folded to the centre and opened one by one
            var S = Math.min(W * 0.84, H * 0.84, u * 0.95), R = S / 2;
            var C = [[cx, cy - R], [cx + R, cy], [cx, cy + R], [cx - R, cy]], M = [];
            for (i = 0; i < 4; i++) M.push([(C[i][0] + C[(i + 1) % 4][0]) / 2, (C[i][1] + C[(i + 1) % 4][1]) / 2]);
            var gc = jzGrp(sheet, 'creases');
            for (i = 0; i < 4; i++) jzAddPath(gc, [M[i], M[(i + 1) % 4]], false);
            jzAddStroke(gc, crease, lw, 80);
            var gd2 = jzGrp(sheet, 'diagonals'); jzAddPath(gd2, [C[0], C[2]], false); jzAddPath(gd2, [C[1], C[3]], false); jzAddStroke(gd2, crease, lw, 35);
            var gs = jzGrp(sheet, 'sheet'); jzAddPath(gs, C, true); jzAddFill(gs, paper);
            var gsh = jzGrp(sheet, 'shadow'); jzAddPath(gsh, [[C[0][0] + u * 0.012, C[0][1] + u * 0.018], [C[1][0] + u * 0.012, C[1][1] + u * 0.018], [C[2][0] + u * 0.012, C[2][1] + u * 0.018], [C[3][0] + u * 0.012, C[3][1] + u * 0.018]], true); jzAddFill(gsh, dk, 30);
            text = n <= 4 ? t0 : ld2_brk(t0, n <= 9 ? Math.ceil(n / 2) : Math.ceil(n / 3)); tr = 0.02; lead = 1.08; mi = 0.12;
            size = Math.min(ld2_fit(ctx, text, font, R * 0.94 * 0.84, R * 0.94 * 0.84, tr, lead), u * 0.2);
            bbox = ld2_box(cx - R, cy - R, cx + R, cy + R);
            var flaps = function (Sx, isUnder) {
                for (var qq = 0; qq < 4; qq++) {
                    var k = (qq + order) % 4, a = M[(k + 3) % 4], b = M[k], hm = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
                    var ux = b[0] - a[0], uy = b[1] - a[1], Lh = Math.sqrt(ux * ux + uy * uy); ux /= Lh; uy /= Lh;
                    var dx = cx - hm[0], dy = cy - hm[1], ly = dx * -uy + dy * ux;       // apex (the centre) in the hinge frame
                    var lk = [0.04, -0.1, -0.05, 0.02][k], hd = FA(qq), gf = jzGrp(Sx, 'flap ' + (k + 1));
                    var ge = ld2_sub(gf, 'edge'); jzAddPath(ge, [[-Lh / 2, 0], [0, ly], [Lh / 2, 0]], false);
                    var st = jzAddStroke(ge, crease, lw);
                    jzSetExpr(st.property('ADBE Vector Stroke Color'), hd + 'c>0?' + ld2_rgb(ld2_shade(sc, back, 0.2)) + ':' + ld2_rgb(crease));
                    var gp = ld2_sub(gf, 'leaf'); jzAddPath(gp, [[-Lh / 2, 0], [Lh / 2, 0], [0, ly]], true); var fp = jzAddFill(gp, back);
                    jzSetExpr(fp.property('ADBE Vector Fill Color'), hd + 'c>0?sh(' + ld2_rgb(back) + ',-0.3*(1-c)):sh(' + ld2_rgb(paper) + ',' + jzN(lk) + '*-c-0.32*(1+c))');
                    jzGX(gf).property('ADBE Vector Position').setValue(hm);
                    jzGX(gf).property('ADBE Vector Rotation').setValue(Math.atan2(uy, ux) * 180 / Math.PI);
                    ld2_gX(gf, 'ADBE Vector Scale', hd + '[100,c*100]');
                    ld2_gX(gf, 'ADBE Vector Group Opacity', hd + ((isUnder ? 'c<0' : 'c>=0') + '?100:0'));
                }
            };
            under = jzShapeLayer(ctx, 'flaps (open)', 0, 0); flaps(under, true);
            var L2 = ld2_T(ctx, text, font, size, { color: tc, x: cx, y: cy, track: tr, lead: lead });
            jzAnimate(ctx, L2, { mi: ld2_miAt(ctx, mi), noHold: ld2_plateHold(ctx) });
            over = jzShapeLayer(ctx, 'flaps (closed)', 0, 0); flaps(over, false);
            L = L2;
        }
        jzSetExpr(jzXf(sheet, 'ADBE Opacity'), TH + '100*K');
        jzSetExpr(jzXf(under, 'ADBE Opacity'), TH + '100*K');
        jzSetExpr(jzXf(over, 'ADBE Opacity'), TH + '100*K');
        ld2_ng([sheet, under, over]);
        var bbL = jzBB(L), list = [sheet, under, L, over];
        for (i = 0; i < list.length; i++) ld2_parent(list[i], PV, jzXf(list[i], 'ADBE Position').value[0], jzXf(list[i], 'ADBE Position').value[1]);
        return bbL || bbox;
    }
});

/* ================================================================== 27 zipper — ジッパー */
jzReg('layout', 'zipper', {
    plan: function (rng, cut, st) {
        return { font: rng.pick(jzFontsOf(st, ['display', 'serif'])), cloth: rng.pick(['ink', 'accent', 'ink']), dir: rng.pick([1, -1]), stitch: rng.chance(0.8) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, u = jzU(ctx), port = jzPortrait(ctx), i, k;
        var font = jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'display')), t0 = jzFlat(c.text), n = jzCount(t0), vert = port && n <= 10 && !jzHasLatin(t0);
        // work in a frame where the seam runs along +x (vertical zip: a parent null swaps x and y)
        var Lw = vert ? H : W, Lh = vert ? W : H, x0 = Lw * 0.05, x1 = Lw * 0.95, tr = 0.05, lead = vert ? 1.05 : 1.1;
        var text = vert ? jzVertical(t0) : ld2_brk(t0, port ? 5 : 9);
        var size = Math.min(ld2_fit(ctx, text, font, vert ? Lh * 0.44 : Lw * 0.66, vert ? Lw * 0.64 : Lh * 0.36, vert ? 0 : tr, lead), u * 0.2), m = ld2_measAt(ctx, text, font, size, vert ? 0 : tr, lead);
        var G = (vert ? m.w : m.h) / 2 + size * 0.55, tIn = jzClamp(c.dur * 0.3, 0.45, 1), tOut = Math.max(0.3, (c.outDur || 0.3) + 0.2), dir = jzP(ctx, 'dir', 1) < 0 ? -1 : 1;
        var cy = Lh / 2, cloth = ld2_plateCol(sc, jzP(ctx, 'cloth', 'ink') === 'accent' ? [sc.accent, sc.ink] : [sc.ink, sc.accent]);
        var tape = ld2_shade(sc, cloth, -0.25), toothC = jzMixHex(sc.sub, ld2_light(sc), 0.4), tw = u * 0.022, pitch = u * 0.02;
        var ZH = ld2_TH(ctx) + 'var X0=' + jzN(x0) + ',X1=' + jzN(x1) + ',GG=' + jzN(G) + ',CYZ=' + jzN(cy) + ',DZ=' + dir + ';' +
            'var sp=ioc((time-0.22)/' + jzN(tIn) + ')*(1-ioc((time-(' + jzN(c.dur - tOut - 0.22) + '))/' + jzN(tOut) + ')),xs=DZ>0?X0+(X1-X0)*sp:X1+(X0-X1)*sp,za=DZ>0?X0:xs,zb=DZ>0?xs:X1,wb=1+0.02*Math.sin(time*2);' +
            'function gp(x){return (x<=za||x>=zb||zb-za<1)?0:GG*Math.pow(Math.sin(Math.PI*(x-za)/(zb-za)),0.75)*wb;}' +
            'var off=(1-oc(time/0.28)+ic((time-(' + jzN(c.dur - 0.22) + '))/0.22))*' + jzN(Lh * 0.62) + ';\n';
        // the lyric sits under the cloth
        var L = ld2_T(ctx, text, font, size, { color: sc.fg, x: W / 2, y: H / 2, track: vert ? 0 : tr, lead: lead });
        jzAnimate(ctx, L, { mi: ld2_miAt(ctx, 0.15) });
        var bb = jzBB(L);
        var FR = null;
        if (vert) { FR = ld2_null(ctx, 'zip frame', 0, 0); jzXf(FR, 'ADBE Rotate Z').setValue(90); jzXf(FR, 'ADBE Scale').setValue([100, -100]); }
        // lens outline (unit width 100): upper edge left->right, lower edge back
        var lens = function (hh) {
            var pts = [], q, N2 = 36;
            for (q = 0; q <= N2; q++) pts.push([q / N2 * 100, -hh * Math.pow(Math.sin(Math.PI * q / N2), 0.75)]);
            for (q = N2 - 1; q > 0; q--) pts.push([q / N2 * 100, hh * Math.pow(Math.sin(Math.PI * q / N2), 0.75)]);
            return pts;
        };
        var lensXf = function (g) {
            ld2_gX(g, 'ADBE Vector Position', ZH + '[za,CYZ]');
            ld2_gX(g, 'ADBE Vector Scale', ZH + 'var w=zb-za;w<1?[0,0]:[w,100*wb]');
        };
        // cloth: two halves (slide in from the edges, out at the very end) + tape; the gap lens cuts through them (inverted matte)
        var CL = jzShapeLayer(ctx, 'zip cloth', 0, 0);
        var gT = jzGrp(CL, 'teeth');
        var nT = Math.floor((x1 - x0) / pitch + 1e-6);
        for (k = 0; k <= nT; k++) {
            var xk = x0 + k * pitch, up = k % 2 ? -1 : 1, gk = ld2_sub(gT, 'tooth ' + (k + 1));
            jzAddRect(gk, pitch * 0.68, tw * 0.7, 0, 0, 0); jzAddFill(gk, toothC);
            var TK = ZH + 'var x=' + jzN(xk) + ',g=gp(x),d=(gp(x+1)-gp(x-1))/2;';
            ld2_gX(gk, 'ADBE Vector Position', TK + '[x,g<0.5?CYZ+' + jzN(up * tw * 0.7 * 0.28) + ':CYZ+' + up + '*(g+' + jzN(tw * 0.15) + ')]');
            ld2_gX(gk, 'ADBE Vector Rotation', TK + 'g<0.5?0:Math.atan(' + up + '*d)*180/Math.PI');
        }
        ld2_gX(gT, 'ADBE Vector Group Opacity', ZH + 'off<1?100:0');
        var stitch = !!jzP(ctx, 'stitch', true), stC = ld2_shade(sc, cloth, 0.25), sw = Math.max(1, u * 0.0022);
        if (stitch) {
            var gsc = jzGrp(CL, 'stitch lens'); jzAddPath(gsc, lens(G + tw * 1.6), true);
            var ss2 = jzAddStroke(gsc, stC, sw, 80);
            try { var ds2 = ss2.property('ADBE Vector Stroke Dashes'); ds2.addProperty('ADBE Vector Stroke Dash 1').setValue(u * 0.012); ds2.addProperty('ADBE Vector Stroke Gap 1').setValue(u * 0.01); } catch (eD2) {}
            lensXf(gsc);
        }
        var gTL = jzGrp(CL, 'tape lens'); jzAddPath(gTL, lens(G + tw), true); jzAddFill(gTL, tape); lensXf(gTL);
        for (var s2 = -1; s2 <= 1; s2 += 2) {
            var gh = jzGrp(CL, s2 < 0 ? 'top half' : 'bottom half');
            if (stitch) {
                // straight stitches where the zip is closed (trimmed to x < za and x > zb)
                for (var sd = 0; sd < 2; sd++) {
                    var gsl = ld2_sub(gh, 'stitch ' + (sd ? 'after' : 'before')), xa = -Lw * 0.02, xb = Lw * 1.02;
                    jzAddPath(gsl, [[xa, cy + s2 * tw * 1.6], [xb, cy + s2 * tw * 1.6]], false);
                    var ss = jzAddStroke(gsl, stC, sw, 80);
                    try { var dsh = ss.property('ADBE Vector Stroke Dashes'); dsh.addProperty('ADBE Vector Stroke Dash 1').setValue(u * 0.012); dsh.addProperty('ADBE Vector Stroke Gap 1').setValue(u * 0.01); } catch (eD) {}
                    if (sd) jzAddTrimPaths(gsl, null, ZH + 'cl((zb-(' + jzN(xa) + '))/' + jzN(xb - xa) + ')*100');
                    else jzAddTrimPaths(gsl, ZH + 'cl((za-(' + jzN(xa) + '))/' + jzN(xb - xa) + ')*100', null);
                }
            }
            var gtp = ld2_sub(gh, 'tape'); jzAddRect(gtp, Lw * 1.1, tw, 0, Lw / 2, cy + s2 * tw / 2); jzAddFill(gtp, tape);
            var gcl = ld2_sub(gh, 'cloth'); jzAddRect(gcl, Lw * 1.1, Lh * 0.6, 0, Lw / 2, cy + s2 * Lh * 0.3); jzAddFill(gcl, cloth);
            ld2_gX(gh, 'ADBE Vector Position', ZH + '[0,' + s2 + '*off]');
        }
        var MT = jzShapeLayer(ctx, 'zip gap (matte)', 0, 0), gm = jzGrp(MT, 'gap');
        jzAddPath(gm, lens(G), true); jzAddFill(gm, '#FFFFFF'); lensXf(gm);
        ld2_matte(CL, MT, true);
        // slider + swinging pull tab
        var SLd = jzShapeLayer(ctx, 'zip slider', 0, 0), bw = u * 0.05, bh = u * 0.035, tabL = u * 0.075;
        var gtb = jzGrp(SLd, 'tab');
        jzAddEllipse(gtb, bw * 0.24, bw * 0.24, 0, tabL * 0.75); jzAddFill(gtb, cloth);
        var gtt = ld2_sub(gtb, 'tab plate'); jzAddPath(gtt, [[-bw * 0.28, 0], [bw * 0.28, 0], [bw * 0.34, tabL], [-bw * 0.34, tabL]], true); jzAddFill(gtt, jzMixHex(toothC, ld2_dark(sc), 0.15));
        jzGX(gtb).property('ADBE Vector Position').setValue([dir * bw * 0.1, bh * 0.4]);
        ld2_gX(gtb, 'ADBE Vector Rotation', 'Math.sin(time*3)*0.15*180/Math.PI');
        var gsb = jzGrp(SLd, 'slider'); jzAddPath(gsb, [[-bw * 0.6 * dir, -bh], [bw * 0.5 * dir, -bh * 0.7], [bw * 0.5 * dir, bh * 0.7], [-bw * 0.6 * dir, bh]], true); jzAddFill(gsb, toothC);
        jzSetExpr(jzXf(SLd, 'ADBE Position'), ZH + '[xs,CYZ]');
        jzSetExpr(jzXf(SLd, 'ADBE Opacity'), ZH + 'off<1?100*K:0');
        if (FR) { ld2_parent(CL, FR, 0, 0); ld2_parent(MT, FR, 0, 0); SLd.setParentWithJump(FR); }
        ld2_ng([CL, MT, SLd]);
        return bb;
    }
});

/* ================================================================== 28 sliceStack — スライス積層 */
jzReg('layout', 'sliceStack', {
    plan: function (rng, cut, st) {
        var mode = rng.pick(['blinds', 'blinds', 'stack', 'wave']);
        return { font: rng.pick(jzFontsOf(st, ['display'])), mode: mode, slices: mode === 'blinds' ? rng.int(6, 9) : rng.int(6, 8), gap: rng.range(0.3, 0.55), side: rng.pick(['accent', 'accent', 'sub']), amp: rng.range(0.08, 0.16), dir: rng.pick([1, -1]), plate: rng.pick(['ink', 'accent']) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, u = jzU(ctx), port = jzPortrait(ctx), i;
        var font = jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'display')), text = ld2_brk(c.text, port ? 5 : 8), tr = 0.02, lead = 1.02, mode = jzP(ctx, 'mode', 'blinds'), blinds = mode === 'blinds';
        var size = Math.min(ld2_fit(ctx, text, font, W * (blinds ? 0.74 : 0.78), H * (blinds ? 0.46 : 0.42), tr, lead), u * 0.3), m = ld2_measAt(ctx, text, font, size, tr, lead);
        var Sn = Math.max(2, Math.round(jzP(ctx, 'slices', 7))), tbx = W / 2, tby = H / 2, TH = ld2_TH(ctx), mot = ctx.fx && ctx.fx.motion != null ? ctx.fx.motion : 0.7;
        var PC = ld2_precomp(ctx, 'JZ slice art'), pctx = PC.ctx, L, bb;
        if (blinds) {
            // venetian blind: slats carrying the lyric turn open, a ripple runs through them, they turn shut again
            var padX = size * 0.45, padY = size * 0.3, bh = m.h + padY * 2, hs = bh / Sn, gp = hs * 0.08, x0 = tbx - m.w / 2 - padX, w = m.w + padX * 2, yTop = tby - bh / 2;
            var pc = ld2_plateCol(sc, jzP(ctx, 'plate', 'ink') === 'accent' ? [sc.accent, sc.ink] : [sc.ink, sc.accent]), tc = ld2_onCol(sc, pc), backC = ld2_shade(sc, pc, -0.45);
            jzRectLayer(pctx, 'plate', tbx, tby, w, bh, pc);
            L = ld2_T(pctx, text, font, size, { color: tc, x: tbx, y: tby, track: tr, lead: lead });
            jzAnimate(pctx, L, { mi: 0, noHold: true });
            var SLn = jzShapeLayer(pctx, 'slat edges', 0, 0), gl = jzGrp(SLn, 'edges'), elw = Math.max(1, hs * 0.04);
            for (i = 0; i < Sn; i++) jzAddRect(gl, w, elw, 0, tbx, yTop + i * hs + hs - gp / 2 - elw / 2);
            jzAddFill(gl, ld2_dark(sc), 35);
            // rail + cords
            var RA = TH + 'var RA=oc(time/0.3)*K;', RL = jzShapeLayer(ctx, 'blind rail', 0, 0), gr = jzGrp(RL, 'rail');
            jzAddRect(gr, w + size * 0.16, hs * 0.3, 0, tbx, yTop - hs * 0.4); jzAddFill(gr, ld2_shade(sc, pc, -0.2));
            jzSetExpr(jzXf(RL, 'ADBE Opacity'), RA + '100*RA');
            var CD = jzShapeLayer(ctx, 'blind cords', 0, yTop - hs * 0.3), gcd = jzGrp(CD, 'cords');
            jzAddRect(gcd, Math.max(1, u * 0.0015), bh + hs * 0.3, 0, x0 + w * 0.2, (bh + hs * 0.3) / 2); jzAddRect(gcd, Math.max(1, u * 0.0015), bh + hs * 0.3, 0, x0 + w * 0.8, (bh + hs * 0.3) / 2); jzAddFill(gcd, sc.sub);
            jzSetExpr(jzXf(CD, 'ADBE Scale'), RA + '[100,100*RA]');
            jzSetExpr(jzXf(CD, 'ADBE Opacity'), RA + '60*RA'); ld2_ng([RL, CD]);
            for (i = 0; i < Sn; i++) {
                var f = Sn > 1 ? i / (Sn - 1) : 0, yc = yTop + i * hs + hs / 2;
                var hd = TH + 'var ph=(1-ob(cl((time-' + jzN(0.05 + f * 0.25) + ')/0.45),1.3))*90+Math.sin(time*2.4-' + jzN(i * 0.7) + ')*' + jzN(16 * mot) + '*cl((time-0.6)/0.4)-ic(cl(PO*1.3-' + jzN(f * 0.3) + '))*90,c=Math.cos(ph*Math.PI/180);';
                var SL = jzNoGhost(ld2_use(ctx, PC.comp, 'slat ' + (i + 1)));
                ld2_mask(SL, ld2_rectShape(x0, yc - (hs - gp) / 2, x0 + w, yc + (hs - gp) / 2));
                jzXf(SL, 'ADBE Anchor Point').setValue([tbx, yc]); jzXf(SL, 'ADBE Position').setValue([tbx, yc]);
                jzSetExpr(jzXf(SL, 'ADBE Scale'), hd + '[100,100*c]');
                jzSetExpr(jzXf(SL, 'ADBE Opacity'), hd + 'Math.abs(c)*' + jzN(hs - gp) + '<0.6?0:100*K');
                var fl = jzEffect(SL, 'ADBE Fill', 'JZ Slat Shade');
                jzEX(fl, 3, hd + 'c>0?' + ld2_rgb(ld2_dark(sc)) + ':' + ld2_rgb(backC));
                jzEX(fl, 7, hd + 'c>0?0.35*(1-c):1');
            }
            return ld2_box(x0, yTop, x0 + w, yTop + bh);
        }
        // stack / wave: horizontal slices of the lyric pulled apart, each with a coloured side face under it
        var hs2 = (m.h + size * 0.1) / Sn, gp2 = hs2 * jzP(ctx, 'gap', 0.4), totH = Sn * hs2 + (Sn - 1) * gp2, y0 = H / 2 - totH / 2;
        var sideC = jzP(ctx, 'side', 'accent') === 'accent' ? sc.accent : jzMixHex(sc.fg, sc.bg, 0.55), dep = Math.min(gp2 * 0.9, size * 0.08);
        var A = size * jzP(ctx, 'amp', 0.12) * (0.5 + 0.7 * mot), dr = jzP(ctx, 'dir', 1) < 0 ? -1 : 1;
        L = ld2_T(pctx, text, font, size, { color: sc.fg, x: tbx, y: tby, track: tr, lead: lead });
        jzAnimate(pctx, L, { mi: 0, noHold: true });
        for (i = 0; i < Sn; i++) {
            var f2 = Sn > 1 ? i / (Sn - 1) : 0.5, by0 = tby - Sn * hs2 / 2 + i * hs2, dy = y0 + i * (hs2 + gp2) - by0, alt = i % 2 ? 1 : -1;
            var hx = TH + 'var dx=' + (mode === 'wave' ? jzN(A) + '*Math.sin(' + jzN(f2 * Math.PI * 2 * 0.9) + '+time*' + jzN(2.2 * dr) + ')' : jzN(A * 1.4 * (f2 - 0.5) * 2 * dr) + '*(0.75+0.25*Math.cos(time*1.1))') +
                '+(1-oe((time-' + jzN(i * 0.025) + ')/0.45))*' + jzN(W * 0.7 * -alt) + '+ic(cl(PO*1.3-' + jzN(f2 * 0.3) + '))*' + jzN(W * 0.8 * alt) + ';';
            var SD2 = jzNoGhost(ld2_use(ctx, PC.comp, 'slice side ' + (i + 1)));
            ld2_mask(SD2, ld2_rectShape(-W, by0 + hs2 - dep - 0.5, W * 2, by0 + hs2));
            jzSetExpr(jzXf(SD2, 'ADBE Position'), hx + '[value[0]+dx+' + jzN(dep * 0.5) + ',value[1]+' + jzN(dy + dep) + ']');
            var fs = jzEffect(SD2, 'ADBE Fill', 'JZ Side'); jzEP(fs, 3, jzHex(sideC));
            var SF = ld2_use(ctx, PC.comp, 'slice ' + (i + 1));
            ld2_mask(SF, ld2_rectShape(-W, by0, W * 2, by0 + hs2 + 0.5));
            jzSetExpr(jzXf(SF, 'ADBE Position'), hx + '[value[0]+dx,value[1]+' + jzN(dy) + ']');
        }
        var w2 = m.w / 2 + A * 1.4;
        return ld2_box(tbx - w2, y0, tbx + w2, y0 + totH);
    }
});

/* ================================================================== 29 glitchGrid — グリッチ格子 */
jzReg('layout', 'glitchGrid', {
    plan: function (rng, cut, st) {
        return { font: rng.pick(jzFontsOf(st, ['display'])), rate: rng.int(3, 6), inv: rng.range(0.1, 0.22), labels: rng.chance(0.75), gut: rng.range(0.008, 0.016) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, s = c.seed, u = jzU(ctx), port = jzPortrait(ctx), sq = !port && W < H * 1.45, i, r, cc;
        var font = jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'display')), rate = Math.max(1, Math.round(jzP(ctx, 'rate', 4))), invP = jzP(ctx, 'inv', 0.15), labels = !!jzP(ctx, 'labels', true);
        var C = port ? 3 : sq ? 3 : 4, R = port ? 5 : 3, g = u * jzP(ctx, 'gut', 0.012), mx = W * 0.04, my = H * 0.05;
        var cw = (W - mx * 2 - g * (C - 1)) / C, ch = (H - my * 2 - g * (R - 1)) / R, crow = Math.floor(R / 2);
        var cc0 = port ? 0 : C === 4 ? 1 : 0, cc1 = port ? C - 1 : C === 4 ? 2 : C - 1;
        var text = jzFlat(c.text), t2 = ld2_brk(c.text, port ? 5 : 8), lw = Math.max(1, u * 0.0015);
        var pal = [sc.fg, sc.accent, sc.sub, sc.ghostA, sc.ghostB], cols = [], onc = [];
        for (i = 0; i < pal.length; i++) if (pal[i] && jzContrast(pal[i], sc.bg) > 1.4) { cols.push(jzMixHex(pal[i], sc.bg, 0.25)); }
        if (!cols.length) cols.push(sc.fg);
        var CA = [], OA = [];
        for (i = 0; i < cols.length; i++) { CA.push(ld2_rgb(cols[i])); OA.push(ld2_rgb(ld2_onCol(sc, cols[i]))); }
        var TH = ld2_TH(ctx), base = TH + 'var st=Math.floor(time*24),COLS=[' + CA.join(',') + '],ONC=[' + OA.join(',') + '],NC=' + cols.length + ',RATE=' + rate + ',INV=' + jzN(invP) + ';';
        var cell = function (id) { return 'var ID=' + id + ',T1=' + jzN(0.03 + jzR(s, id, 1) * 0.35) + ',R3=' + jzN(jzR(s, id, 3)) + ',H4=' + (jzHash(s, id, 4) % 7) + ';' +
            'var on=time>T1&&(time-T1>0.12||hh(SD*0.37+ID*13+st*1.7)<0.6)&&!(PO>R3*0.8+0.1),kk=Math.floor((st+H4)/RATE),inv=hh(ID*7.3+kk*3.1+SD*0.11)<INV,' +
            'ci=Math.floor(hh(ID*5.9+kk*2.7+SD*0.23)*NC)%NC,zoom=1.4+2.2*hh(ID*3.7+kk*1.9+SD*0.31),fresh=(st+H4)%RATE==0;'; };
        var rect = function (r2, c0, c1) { return [mx + c0 * (cw + g), my + r2 * (ch + g), (c1 - c0 + 1) * cw + (c1 - c0) * g, ch]; };
        // cell plates, borders and fresh-frame slice bars (one shape layer)
        var CS = jzNoGhost(jzShapeLayer(ctx, 'cells', 0, 0)), ids = [];
        for (r = 0; r < R; r++) for (cc = 0; cc < C; cc++) {
            if (r === crow && cc >= cc0 && cc <= cc1) continue;
            var id = r * C + cc, q = rect(r, cc, cc), hd = base + cell(id);
            ids.push([id, q]);
            var gcl = jzGrp(CS, 'cell ' + (id + 1));
            var gb = ld2_sub(gcl, 'slice bar'); jzAddRect(gb, q[2], q[3] * 0.06, 0, 0, 0);
            var fb = jzAddFill(gb, sc.fg, 60);
            jzSetExpr(fb.property('ADBE Vector Fill Color'), hd + 'inv?ONC[ci]:COLS[ci]');
            ld2_gX(gb, 'ADBE Vector Position', hd + '[0,' + jzN(-q[3] / 2) + '+' + jzN(q[3]) + '*hh(ID*4.3+st*0.9+SD*0.71)+' + jzN(q[3] * 0.03) + ']');
            ld2_gX(gb, 'ADBE Vector Group Opacity', hd + 'fresh?100:0');
            var gp = ld2_sub(gcl, 'plate'); jzAddRect(gp, q[2], q[3], 0, 0, 0);
            jzAddStroke(gp, jzMixHex(sc.bg, sc.fg, 0.2), lw);
            var fp = jzAddFill(gp, sc.bg);
            jzSetExpr(fp.property('ADBE Vector Fill Color'), hd + 'inv?COLS[ci]:' + ld2_rgb(jzMixHex(sc.bg, sc.fg, 0.04)));
            jzSetExpr(fp.property('ADBE Vector Fill Opacity'), hd + 'inv?85:100');
            jzGX(gcl).property('ADBE Vector Position').setValue([q[0] + q[2] / 2, q[1] + q[3] / 2]);
            ld2_gX(gcl, 'ADBE Vector Group Opacity', hd + 'on?100*K:0');
        }
        // zoomed glitch copies of the line, one per cell, clipped by the cell (alpha matte)
        for (i = 0; i < ids.length; i++) {
            var id2 = ids[i][0], q2 = ids[i][1], hc = base + cell(id2), fs0 = Math.min(q2[3] * 0.9, q2[2] * 0.9) * 0.5;
            var T = ld2_T(ctx, text, font, fs0, { color: sc.fg, x: q2[0] + q2[2] / 2, y: q2[1] + q2[3] / 2, name: 'CH.' + jzPad(id2 + 1, 2) });
            jzSetExpr(jzXf(T, 'ADBE Scale'), hc + '[zoom*100,zoom*100]');
            jzSetExpr(jzXf(T, 'ADBE Position'), hc + 'var ox=(hh(ID*2.3+kk*4.1+SD*0.41)*2-1)*' + jzN(q2[2] * 0.5) + ',oy=(hh(ID*6.1+kk*1.3+SD*0.53)*2-1)*' + jzN(q2[3] * 0.3) +
                ',sl=fresh?(hh(ID*9.1+st*0.7+SD*0.61)*2-1)*' + jzN(q2[2] * 0.12) + ':0;[value[0]+ox+sl,value[1]+oy]');
            jzSetExpr(jzXf(T, 'ADBE Opacity'), hc + 'on?(inv?90:60)*K:0');
            var fe = jzEffect(T, 'ADBE Fill', 'JZ Channel Colour');
            jzEX(fe, 3, hc + 'inv?ONC[ci]:COLS[ci]');
            var MK = jzRectLayer(ctx, 'CH.' + jzPad(id2 + 1, 2) + ' window', q2[0] + q2[2] / 2, q2[1] + q2[3] / 2, q2[2], q2[3], '#FFFFFF');
            ld2_matte(T, MK); ld2_ng([T, MK]);
        }
        // channel labels: one left-aligned text, one label per line, placed on its cell
        if (labels && ids.length) {
            var ls = Math.max(10 * ctx.u, u * 0.013), LD = ls * 1.2, lines = [], LX = [], LY = [], LS = [];
            for (i = 0; i < ids.length; i++) { lines.push('CH.' + jzPad(ids[i][0] + 1, 2) + '  x2.0'); LX.push(ids[i][1][0] + u * 0.01); LY.push(ids[i][1][1] + u * 0.016); }
            var LB = jzText(ctx, lines.join('\r'), { font: jzMonoF(ctx), size: ls, color: sc.sub, x: 0, y: 0, align: 'left', leading: LD, name: 'channel labels' });
            jzXf(LB, 'ADBE Anchor Point').setValue([0, 0]); jzXf(LB, 'ADBE Position').setValue([0, 0]);
            var cells = [];
            for (i = 0; i < ids.length; i++) cells.push('(function(){' + cell(ids[i][0]) + 'return [on,zoom];})()');
            var LH = base + 'var CL=[' + cells.join(',') + '];';
            var NM = []; for (i = 0; i < ids.length; i++) NM.push('"' + jzPad(ids[i][0] + 1, 2) + '"');
            try {
                LB.property('ADBE Text Properties').property('ADBE Text Document').expression = LH + 'var NM=[' + NM.join(',') + '],o=[];for(var q=0;q<CL.length;q++){var z=Math.round(CL[q][1]*10)/10,zs=String(z);if(zs.indexOf(".")<0)zs+=".0";o.push("CH."+NM[q]+"  x"+zs);}o.join("\\r")';
            } catch (eL) { jzWarn('glitchGrid labels: ' + eL.toString()); }
            var lh2 = LH + 'var li=Math.floor((textIndex-1)/11),LX=' + jzArrExpr(LX) + ',LY=' + jzArrExpr(LY) + ';';
            ld2_posAnim(LB, 'JZ Label Place', Math.max(W, H) * 2, lh2, 'dx=LX[li];dy=LY[li]-li*' + jzN(LD) + '+' + jzN(LD2_CY * ls));
            ld2_opAnim(LB, 'JZ Label Show', lh2, 'a=CL[li]&&CL[li][0]?0.8*K:0'); jzNoGhost(LB);
        }
        // the clean cell
        var qc = rect(crow, cc0, cc1), CF = jzShapeLayer(ctx, 'clean cell', qc[0] + qc[2] / 2, qc[1] + qc[3] / 2), gcf = jzGrp(CF, 'frame');
        var rcf = jzAddRect(gcf, qc[2], qc[3], 0, 0, 0); jzAddStroke(gcf, sc.accent, Math.max(2, u * 0.003));
        jzSetExpr(rcf.property('ADBE Vector Rect Size'), TH + '[' + jzN(qc[2]) + '*oe(time/0.35),' + jzN(qc[3]) + ']');
        jzSetExpr(jzXf(CF, 'ADBE Opacity'), TH + '100*K'); jzNoGhost(CF);
        if (labels) {
            var RC = jzText(ctx, 'REC ● CLEAN', { font: jzMonoF(ctx), size: Math.max(10 * ctx.u, u * 0.014), color: sc.accent, x: 0, y: 0, align: 'left', name: 'REC label' });
            jzXf(RC, 'ADBE Anchor Point').setValue([0, 0]);
            jzXf(RC, 'ADBE Position').setValue([qc[0] + u * 0.012, qc[1] + u * 0.018 + LD2_CY * Math.max(10 * ctx.u, u * 0.014)]);
            jzSetExpr(jzXf(RC, 'ADBE Opacity'), TH + '(Math.floor(time*24)%4<3?100:30)*K'); jzNoGhost(RC);
        }
        var size = Math.min(ld2_fit(ctx, t2, font, qc[2] * 0.88, qc[3] * 0.8, 0.04, 1.1), u * 0.24);
        var L = ld2_T(ctx, t2, font, size, { color: sc.fg, x: qc[0] + qc[2] / 2, y: qc[1] + qc[3] / 2, track: 0.04, lead: 1.1 });
        jzAnimate(ctx, L, { mi: 0 });
        return jzBB(L);
    }
});

/* ================================================================== 30 mosaicTiles — タイル画 */
// AE-native: the fat lyric (precomp) -> reveal (wipe / block dissolve / growing iris mask) -> Mosaic on a grid aligned to the
// tile pitch -> grout lines cut out with an inverted matte; a faint floor of empty tiles behind
jzReg('layout', 'mosaicTiles', {
    plan: function (rng, cut, st) {
        return { font: rng.pick(jzFontsOf(st, ['display'])), D: rng.int(9, 12), wave: rng.pick(['diag', 'random', 'center']), rot: rng.chance(0.4), col: rng.pick(['fg', 'accent', 'fg']), floor: rng.chance(0.75) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, u = jzU(ctx), port = jzPortrait(ctx);
        var font = jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'display')), text = ld2_brk(c.text, port ? 4 : 7), lead = 1.15, D = jzP(ctx, 'D', 10), wave = jzP(ctx, 'wave', 'diag');
        if (!jzCount(text)) return null;
        var m100 = ld2_meas(ctx, text, font, 0, lead), cols = Math.ceil(m100.w / 100 * D) + 2, rows = Math.ceil(m100.h / 100 * D) + 2;
        var p0 = Math.min(W * 0.88 / cols, H * 0.66 / rows), nx = Math.max(4, Math.round(W / p0)), ny = Math.max(4, Math.round(H / p0)), px = W / nx, py = H / ny, p = Math.min(px, py);
        var gx = Math.round((W / 2 - cols * px / 2) / px) * px, gy = Math.round((H / 2 - rows * py / 2) / py) * py, gw = cols * px, gh = rows * py;
        var col = jzP(ctx, 'col', 'fg') === 'accent' && jzContrast(sc.accent, sc.bg) > 1.8 ? sc.accent : sc.fg, TH = ld2_TH(ctx), span = jzClamp(c.dur * 0.3, 0.3, 0.8);
        // grout floor: every cell of the panel as a faint tile
        if (jzP(ctx, 'floor', true)) {
            var FL = jzShapeLayer(ctx, 'tile floor', 0, 0), gf = jzGrp(FL, 'tiles'), tw = p * 0.86;
            jzAddRect(gf, tw, tw, 0, gx - px / 2, gy - py / 2); jzAddFill(gf, jzMixHex(sc.bg, sc.fg, 0.07));
            var r1 = jzVecs(gf).addProperty('ADBE Vector Filter - Repeater'); r1.property('ADBE Vector Repeater Copies').setValue(cols + 2);
            r1.property('ADBE Vector Repeater Transform').property('ADBE Vector Repeater Position').setValue([px, 0]);
            var r2 = jzVecs(gf).addProperty('ADBE Vector Filter - Repeater'); r2.property('ADBE Vector Repeater Copies').setValue(rows + 2);
            r2.property('ADBE Vector Repeater Transform').property('ADBE Vector Repeater Position').setValue([0, py]);
            jzSetExpr(jzXf(FL, 'ADBE Opacity'), TH + '100*oc(time/0.4)*K'); jzNoGhost(FL);
        }
        // the lyric, drawn fat, in a precomp
        var PC = ld2_precomp(ctx, 'JZ mosaic art'), fsz = D * p;
        var L = ld2_T(PC.ctx, text, font, fsz, { color: col, x: W / 2, y: H / 2, lead: lead, stroke: p * 0.35, strokeColor: col, strokeOver: false });
        jzAnimate(PC.ctx, L, { mi: 0, noHold: true, treat: false });
        var ML = ld2_use(ctx, PC.comp, 'mosaic');
        var IN = TH + 'var pin=cl((time-0.08)/' + jzN(span + 0.22) + '),pout=cl(PO*1.25);';
        if (wave === 'center') {
            var Rm = Math.sqrt(gw * gw + gh * gh) / 2, k = 0.5523 * Rm, sh = new Shape();
            sh.vertices = [[W / 2, H / 2 - Rm], [W / 2 + Rm, H / 2], [W / 2, H / 2 + Rm], [W / 2 - Rm, H / 2]];
            sh.inTangents = [[-k, 0], [0, -k], [k, 0], [0, k]]; sh.outTangents = [[k, 0], [0, k], [-k, 0], [0, -k]]; sh.closed = true;
            var mk = ld2_mask(ML, sh);
            jzSetExpr(mk.property('ADBE Mask Offset'), IN + '-' + jzN(Rm * 0.98) + '*(1-oc(pin))');
        } else if (wave === 'diag') {
            var lwp = jzEffect(ML, 'ADBE Linear Wipe', 'JZ Tiles In');
            jzEP(lwp, 2, 315); jzEP(lwp, 3, p * 3);
            jzEX(lwp, 1, IN + '(1-pin)*100');
        }
        var bd = jzEffect(ML, 'ADBE Block Dissolve', 'JZ Tiles Out');
        jzEP(bd, 2, px); jzEP(bd, 3, py); jzEP(bd, 4, 0); jzEP(bd, 5, 0);
        jzEX(bd, 1, IN + (wave === 'random' ? 'Math.max(1-pin,pout)*100' : 'pout*100'));
        var mo = jzEffect(ML, 'ADBE Mosaic', 'JZ Tiles');
        jzEP(mo, 1, nx); jzEP(mo, 2, ny); jzEP(mo, 3, 1);
        // grout: thin lines on the tile grid, cut out of the mosaic (inverted alpha matte)
        var GR = jzShapeLayer(ctx, 'grout (matte)', 0, 0), gl = p * 0.14;
        var gv = jzGrp(GR, 'verticals'); jzAddRect(gv, gl, H * 1.2, 0, 0, H / 2); jzAddFill(gv, '#FFFFFF');
        var rv = jzVecs(gv).addProperty('ADBE Vector Filter - Repeater'); rv.property('ADBE Vector Repeater Copies').setValue(nx + 1);
        rv.property('ADBE Vector Repeater Transform').property('ADBE Vector Repeater Position').setValue([px, 0]);
        var gh2 = jzGrp(GR, 'horizontals'); jzAddRect(gh2, W * 1.2, gl, 0, W / 2, 0); jzAddFill(gh2, '#FFFFFF');
        var rh = jzVecs(gh2).addProperty('ADBE Vector Filter - Repeater'); rh.property('ADBE Vector Repeater Copies').setValue(ny + 1);
        rh.property('ADBE Vector Repeater Transform').property('ADBE Vector Repeater Position').setValue([0, py]);
        ld2_matte(ML, GR, true);
        return ld2_box(gx, gy, gx + gw, gy + gh);
    }
});

/* ================================================================== 31 maskReveal — 文字窓 */
// the lyric is the alpha matte of a moving pattern layer (stripes / dots / rows of the line / soft shine)
jzReg('layout', 'maskReveal', {
    plan: function (rng, cut, st) {
        return { font: rng.pick(jzFontsOf(st, ['display'])), scene: rng.pick(['stripes', 'lines', 'dots', 'shine', 'stripes']), ang: rng.range(20, 35) * rng.pick([1, -1]), speed: rng.range(0.6, 1.2), rim: rng.chance(0.65), label: rng.chance(0.6) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, u = jzU(ctx), port = jzPortrait(ctx), i, j;
        var font = jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'display')), text = ld2_brk(c.text, port ? 4 : 7), lead = 1.0;
        var size = Math.min(ld2_fit(ctx, text, font, W * 0.88, H * (port ? 0.56 : 0.66), 0, lead), u * 0.46), m = ld2_measAt(ctx, text, font, size, 0, lead);
        var scene = jzP(ctx, 'scene', 'stripes'), ang = jzP(ctx, 'ang', 25), speed = jzP(ctx, 'speed', 0.9), cx = W / 2, cy = H / 2;
        var A = jzContrast(sc.accent, sc.bg) >= 1.8 ? sc.accent : sc.fg, B = null, cand = [sc.fg, ld2_light(sc), sc.accent2];
        for (i = 0; i < cand.length; i++) if (!B && cand[i] && cand[i] !== A && jzContrast(cand[i], sc.bg) >= 1.8) B = cand[i];
        B = B || A;
        var bw = m.w + size, bh = m.h + size, diag = Math.sqrt(bw * bw + bh * bh), TB = 'var TB=time*' + jzN(speed) + ';';
        // the pattern layer (centred on the text), background B
        var P = jzShapeLayer(ctx, 'window scene', cx, cy), gpat;
        if (scene === 'lines') {
            var ls = size * 0.16, unit = jzFlat(c.lineText || c.text) + '　・　', f = jzBodyF(ctx), uw = Math.max(ls, ld2_measAt(ctx, unit, f, ls, 0, 1).w), rh = ls * 1.3;
            var reps = Math.ceil((bw + uw * 2) / uw) + 1, nr = Math.ceil((bh + rh * 2) / rh) + 1, row = '', lines = [];
            for (j = 0; j < reps; j++) row += unit;
            for (j = 0; j < nr; j++) lines.push(row);
            var gbg = jzGrp(P, 'ground'); jzAddRect(gbg, bw + uw * 2, bh + rh * 2, 0, 0, 0); jzAddFill(gbg, B);
            var LT = jzText(ctx, lines.join('\r'), { font: f, size: ls, color: A, x: 0, y: 0, align: 'left', leading: rh, name: 'window rows' });
            jzXf(LT, 'ADBE Anchor Point').setValue([0, 0]);
            jzXf(LT, 'ADBE Position').setValue([cx - bw / 2 - uw, cy - bh / 2 - rh + LD2_CY * ls]);
            jzSetExpr(jzXf(LT, 'ADBE Position'), TB + '[value[0]-((TB*' + jzN(size * 0.5) + ')%' + jzN(uw) + '),value[1]]');
            var perLine = jzChars(row).length;
            ld2_posAnim(LT, 'JZ Brick Rows', uw, '', 'dx=Math.floor((textIndex-1)/' + perLine + ')%2?' + jzN(-uw / 2) + ':0');
            // rows and ground both need the lyric as matte: two copies of the (animated) lyric, one above each
            P.moveAfter(LT);
            var T0 = ld2_T(ctx, text, font, size, { color: B, x: cx, y: cy, lead: lead, name: c.text });
            jzAnimate(ctx, T0, { mi: 0, treat: false });
            var T1 = T0.duplicate(); T1.moveBefore(LT);
            ld2_matte(LT, T1); ld2_matte(P, T0);
            T0.moveBefore(P);
            gpat = null;
            var Tm = T0;
        } else {
            gpat = jzGrp(P, 'pattern');
            var gbg2 = jzGrp(P, 'ground');
            jzAddRect(gbg2, diag + size, diag + size, 0, 0, 0); jzAddFill(gbg2, scene === 'shine' && sc.grad ? sc.grad[0] : (scene === 'shine' ? A : B));
            if (scene === 'dots') {
                var per = size * 0.2, nd = Math.ceil(diag / per) + 3;
                jzAddEllipse(gpat, per * 0.6, per * 0.6, -nd / 2 * per, -nd / 2 * per); jzAddFill(gpat, A);
                var rd1 = jzVecs(gpat).addProperty('ADBE Vector Filter - Repeater'); rd1.property('ADBE Vector Repeater Copies').setValue(nd);
                rd1.property('ADBE Vector Repeater Transform').property('ADBE Vector Repeater Position').setValue([per, 0]);
                var rd2 = jzVecs(gpat).addProperty('ADBE Vector Filter - Repeater'); rd2.property('ADBE Vector Repeater Copies').setValue(nd);
                rd2.property('ADBE Vector Repeater Transform').property('ADBE Vector Repeater Position').setValue([0, per]);
                ld2_gX(gpat, 'ADBE Vector Position', TB + 'var o=(TB*' + jzN(size * 0.3) + ')%' + jzN(per) + ';[o,o]');
                jzGX(gpat).property('ADBE Vector Rotation').setValue(ang);
            } else {
                // stripes (hard) or shine (wide, blurred bands moving along the diagonal)
                var shine = scene === 'shine', per2 = shine ? size * 1.7 : size * 0.26, ns = Math.ceil(diag / per2) + 3;
                jzAddRect(gpat, per2 / 2, diag + size, 0, -ns / 2 * per2, 0); jzAddFill(gpat, shine ? (sc.grad ? sc.grad[1] : B) : A);
                var rs = jzVecs(gpat).addProperty('ADBE Vector Filter - Repeater'); rs.property('ADBE Vector Repeater Copies').setValue(ns);
                rs.property('ADBE Vector Repeater Transform').property('ADBE Vector Repeater Position').setValue([per2, 0]);
                jzGX(gpat).property('ADBE Vector Rotation').setValue(shine ? 45 : ang);
                ld2_gX(gpat, 'ADBE Vector Position', TB + (shine ? 'var o=((TB*0.45)%1)*' + jzN(per2) + ';[o*0.7071,o*0.7071]' : 'var o=(TB*' + jzN(size * 0.5) + ')%' + jzN(per2) + ',a=' + jzN(ang * Math.PI / 180) + ';[o*Math.cos(a),o*Math.sin(a)]'));
                if (shine) { var gb = jzEffect(P, 'ADBE Gaussian Blur 2', 'JZ Shine Soft'); jzEP(gb, 1, per2 * 0.22); }
            }
            var T2 = ld2_T(ctx, text, font, size, { color: B, x: cx, y: cy, lead: lead, name: c.text });
            jzAnimate(ctx, T2, { mi: 0, treat: false });
            ld2_matte(P, T2);
            Tm = T2;
        }
        var bb = jzBB(Tm);
        if (jzP(ctx, 'rim', true)) {
            var RM = Tm.duplicate(); RM.moveBefore(Tm); RM.name = 'rim';
            try { RM.enabled = true; RM.trackMatteType = TrackMatteType.NO_TRACK_MATTE; } catch (eR) {}
            jzTextDoc(RM, function (td) { td.applyFill = false; td.applyStroke = true; td.strokeColor = jzHex(A); td.strokeWidth = Math.max(1.5, size * 0.012); });
            jzXf(RM, 'ADBE Opacity').setValue(90); jzNoGhost(RM);
        }
        if (jzP(ctx, 'label', true)) {
            var lsz = jzSmallSize(ctx), lab = jzAltCopy(ctx);
            if (jzChars(lab).length > 30) lab = jzChars(lab).slice(0, 29).join('') + '…';
            var LB = jzText(ctx, lab, { font: jzBodyF(ctx), size: lsz, color: sc.sub, x: W / 2 - m.w / 2, y: Math.min(H * 0.95, H / 2 + m.h / 2 + lsz * 1.8), align: 'left', track: 0.2, name: 'label' });
            jzFade(ctx, LB, 0.25, 0.4); jzNoGhost(LB);
        }
        return bb;
    }
});

/* ================================================================== 32 contour — 等高線 */
jzReg('layout', 'contour', {
    plan: function (rng, cut, st) {
        return { font: rng.pick(jzFontsOf(st, ['display', 'serif'])), fb: rng.pick(jzFontsOf(st, ['display'])), side: rng.pick([1, -1]), rings: rng.int(4, 6), speed: rng.range(0.25, 0.5), col: rng.pick(['sub', 'accent', 'sub']), place: rng.pick(['low', 'center', 'low']) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, u = jzU(ctx), port = jzPortrait(ctx), i, k;
        var font = jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'display')), fb = jzP(ctx, 'fb', jzFontKeyOf(ctx.st, 'display')), side = jzP(ctx, 'side', 1) < 0 ? -1 : 1;
        var t0 = jzChars(jzStrip(c.text)), big = '';
        for (i = 0; i < t0.length && !big; i++) if (jzIsKanji(t0[i])) big = t0[i];
        for (i = 0; i < t0.length && !big; i++) if (!jzIsPunct(t0[i]) && !ld2_isSmall(t0[i])) big = t0[i];
        if (!big && t0.length) big = t0[0];
        var bs = Math.min(H * 0.95, W * (port ? 1.05 : 0.7)), bx = W / 2 + side * W * (port ? 0.12 : 0.2), by = H * 0.5;
        var lineC = jzP(ctx, 'col', 'sub') === 'accent' ? sc.accent : sc.sub, TH = ld2_TH(ctx);
        // contour rings: a fat stroke in the line colour under a slightly thinner one in the ground colour -> one thin line per level
        if (big) {
            var K = Math.max(1, Math.round(jzP(ctx, 'rings', 5))), gap = bs * 0.03, lw = Math.max(1.2, bs * 0.0028), maxW = 2 * gap * (K + 1) + gap + lw * 2;
            var RH = TH + 'var PH=((time*' + jzN(jzP(ctx, 'speed', 0.35)) + ')%1+1)%1,GR=oc(time/0.9),CI=oc(time/0.5)*K;';
            for (k = K; k >= 1; k--) {
                var wk = '(2*' + jzN(gap) + '*(' + (k - 1) + '+PH)*GR+' + jzN(gap * 0.6) + ')';
                for (var pass = 0; pass < 2; pass++) {
                    var R = jzNoGhost(ld2_G(ctx, big, fb, bs, bx, by, pass ? sc.bg : lineC, 'contour ' + k + (pass ? ' gap' : ' line')));
                    jzTextDoc(R, function (td) { td.applyFill = false; td.applyStroke = true; td.strokeColor = jzHex(pass ? sc.bg : lineC); td.strokeWidth = 0.1; });
                    jzAnimator(R, 'JZ Ring Width', [['ADBE Text Stroke Width', maxW]], RH + 'Math.max(0,Math.min(1,(' + wk + (pass ? '-' : '+') + jzN(lw) + ')/' + jzN(maxW) + '))*100');
                    jzSetExpr(jzXf(R, 'ADBE Opacity'), RH + (pass ? '94*CI' : '80*' + (k === K ? '(1-PH)' : '1') + '*' + jzN(1 - 0.1 * k) + '*CI'));
                }
            }
            var BF = jzNoGhost(ld2_G(ctx, big, fb, bs, bx, by, sc.bg, 'contour core'));
            jzTextDoc(BF, function (td) { td.applyStroke = true; td.strokeColor = jzHex(lineC); td.strokeWidth = lw * 1.6; try { td.strokeOverFill = true; } catch (eS) {} });
            jzSetExpr(jzXf(BF, 'ADBE Opacity'), RH + '100*CI');
        }
        // the lyric, small and solid, in the calm area beside the big character
        var text = ld2_brk(c.text, port ? 6 : 8), tr = 0.06, lead = 1.25;
        var size = Math.min(ld2_fit(ctx, text, font, W * (port ? 0.8 : 0.5), H * 0.3, tr, lead), u * 0.12), m = ld2_measAt(ctx, text, font, size, tr, lead);
        var tx = port ? W / 2 : W / 2 - side * W * 0.2, ty = jzP(ctx, 'place', 'low') === 'low' ? H * (port ? 0.78 : 0.7) : H / 2;
        var mx = jzClamp(tx, W * 0.06 + m.w / 2, W * 0.94 - m.w / 2);
        var L = ld2_T(ctx, text, font, size, { color: sc.fg, x: mx, y: ty, track: tr, lead: lead });
        jzAnimate(ctx, L, { mi: 0 });
        var bb = jzBB(L), ls = jzSmallSize(ctx) * 0.9, LA = TH + 'var LA=oc((time-0.3)/0.4)*K;';
        var LN = jzShapeLayer(ctx, 'rule', bb.x0, bb.y0 - ls * 1.2), gl = jzGrp(LN, 'rule');
        jzAddPath(gl, [[0, 0], [bb.x1 - bb.x0, 0]], false); jzAddStroke(gl, lineC, Math.max(1, u * 0.0015), 80);
        jzSetExpr(jzXf(LN, 'ADBE Scale'), LA + '[100*LA,100]');
        jzSetExpr(jzXf(LN, 'ADBE Opacity'), LA + 'LA>0?100:0');
        var LB = jzText(ctx, big + '  ─  No.' + jzLineNo(ctx), { font: jzMonoF(ctx), size: ls, color: sc.sub, x: bb.x0, y: bb.y0 - ls * 2.3, align: 'left', track: 0.2, name: 'contour label' });
        jzSetExpr(jzXf(LB, 'ADBE Opacity'), LA + '100*LA'); ld2_ng([LN, LB]);
        return bb;
    }
});

/* ================================================================== 33 halftoneBig — 網点巨大文字 */
// the lyric (fattened) is the alpha matte of a rotated dot screen; one group per screen column (repeater down the column),
// the dot size follows a travelling tone wave
jzReg('layout', 'halftoneBig', {
    plan: function (rng, cut, st) {
        return { font: rng.pick(jzFontsOf(st, ['display'])), mode: rng.pick(['duo', 'duo', 'tone']), ang: rng.range(15, 40) * rng.pick([1, -1]), shape: rng.pick(['dot', 'dot', 'line']), speed: rng.range(0.4, 0.8), crop: rng.chance(0.35) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, u = jzU(ctx), port = jzPortrait(ctx), i;
        var font = jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'display')), text = ld2_brk(c.text, port ? 4 : 5), tr = -0.02, lead = 0.98;
        var fitW = jzP(ctx, 'crop', false) ? 1.12 : 0.9;
        var size = Math.min(ld2_fit(ctx, text, font, W * fitW, H * (port ? 0.6 : 0.8), tr, lead), u * 0.7), m = ld2_measAt(ctx, text, font, size, tr, lead);
        var dotC = jzContrast(sc.fg, sc.bg) >= 3 ? sc.fg : (jzContrast(ld2_light(sc), sc.bg) >= 3 ? ld2_light(sc) : sc.fg), duoC = null, cand = [sc.accent, sc.accent2];
        for (i = 0; i < cand.length; i++) if (!duoC && cand[i] && jzContrast(cand[i], sc.bg) >= 1.6 && cand[i] !== dotC) duoC = cand[i];
        duoC = duoC || sc.sub;
        var cx = W / 2, cy = H / 2, TH = ld2_TH(ctx), bb;
        if (jzP(ctx, 'mode', 'duo') === 'duo') {
            var d = size * 0.045, DU = ld2_T(ctx, text, font, size, { color: duoC, x: cx + d, y: cy + d, track: tr, lead: lead, name: 'duo' });
            jzAnimate(ctx, DU, { mi: 0, treat: false }); jzNoGhost(DU);
        }
        var pitch = Math.max(6 * ctx.u, size * 0.068), a = jzP(ctx, 'ang', 25), ar = a * Math.PI / 180, ca = Math.abs(Math.cos(ar)), sa = Math.abs(Math.sin(ar));
        var R = Math.sqrt(m.w * m.w + m.h * m.h) / 2 + pitch;
        var NX = Math.ceil(((m.w * ca + m.h * sa) / 2 + pitch * 2) / pitch), NY = Math.ceil(((m.w * sa + m.h * ca) / 2 + pitch * 2) / pitch), line = jzP(ctx, 'shape', 'dot') === 'line';
        var DS = jzShapeLayer(ctx, 'dot screen', cx, cy);
        jzXf(DS, 'ADBE Rotate Z').setValue(a);
        var TN = TH + 'var GRW=oc(time/0.7)*(1-0.6*ic(PO)),PHT=time*' + jzN(jzP(ctx, 'speed', 0.6)) + ';';
        for (i = -NX; i <= NX; i++) {
            var lx = i * pitch, gcol = jzGrp(DS, 'column ' + (i + NX + 1));
            var TE = TN + 'var f=' + jzN(lx / R * 0.5 + 0.5) + ',tone=cl(0.3+0.7*(0.5+0.5*Math.sin((f*1.6-PHT)*Math.PI))),r=' + jzN(pitch * 0.66) + '*Math.sqrt(tone)*GRW;';
            if (line) { var rc = jzAddRect(gcol, pitch, pitch, 0, lx, -NY * pitch); jzSetExpr(rc.property('ADBE Vector Rect Size'), TE + '[' + jzN(pitch * 1.02) + ',Math.max(0,r*1.44)]'); }
            else { var el = jzAddEllipse(gcol, pitch, pitch, lx, -NY * pitch); jzSetExpr(el.property('ADBE Vector Ellipse Size'), TE + '[Math.max(0,r*2),Math.max(0,r*2)]'); }
            var rp = jzVecs(gcol).addProperty('ADBE Vector Filter - Repeater'); rp.property('ADBE Vector Repeater Copies').setValue(NY * 2 + 1);
            rp.property('ADBE Vector Repeater Transform').property('ADBE Vector Repeater Position').setValue([0, pitch]);
            jzAddFill(gcol, dotC);
        }
        // the matte: the lyric with a fat stroke so dots near the edges stay whole
        var T = ld2_T(ctx, text, font, size, { color: dotC, x: cx, y: cy, track: tr, lead: lead, stroke: pitch * 0.5, strokeColor: dotC, strokeOver: false });
        jzAnimate(ctx, T, { mi: 0, treat: false });
        ld2_matte(DS, T);
        bb = jzBB(T);
        return bb;
    }
});

/* ================================================================== 34 stencil — ステンシル */
jzReg('layout', 'stencil', {
    plan: function (rng, cut, st) {
        return { font: rng.pick(jzFontsOf(st, ['display'])), col: rng.pick(['accent', 'fg', 'accent']), drips: rng.int(1, 3), marks: rng.chance(0.75), dir: rng.pick([1, -1]), tilt: rng.range(-3, 3) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, s = c.seed, u = jzU(ctx), port = jzPortrait(ctx), i, k;
        var font = jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'display')), text = ld2_brk(c.text, port ? 4 : 7), tr = 0.08, lead = 1.12;
        var size = Math.min(ld2_fit(ctx, text, font, W * 0.84, H * (port ? 0.5 : 0.56), tr, lead), u * 0.32), m = ld2_measAt(ctx, text, font, size, tr, lead);
        var col = jzP(ctx, 'col', 'accent') === 'accent' && jzContrast(sc.accent, sc.bg) >= 1.8 ? sc.accent : sc.fg, dir = jzP(ctx, 'dir', 1) < 0 ? -1 : 1, tilt = jzP(ctx, 'tilt', 0);
        var x0 = W / 2 - m.w / 2, x1 = W / 2 + m.w / 2, y0 = H / 2 - m.h / 2, y1 = H / 2 + m.h / 2, TH = ld2_TH(ctx);
        // glyph boxes (em layout, centre-relative): x along the line, y = line centre
        var lines = String(text).split('\r'), nL = lines.length, LD = size * lead, boxes = [];
        for (var li = 0; li < nL; li++) {
            var ch = jzChars(lines[li]), wsum = 0, j;
            for (j = 0; j < ch.length; j++) wsum += ld2_adv(ch[j]) * size + (j < ch.length - 1 ? tr * size : 0);
            var xx = -wsum / 2;
            for (j = 0; j < ch.length; j++) {
                var aw = ld2_adv(ch[j]) * size;
                if (ch[j] !== ' ' && ch[j] !== '　' && !jzIsPunct(ch[j])) boxes.push({ lx: xx + aw / 2, ly: (li - (nL - 1) / 2) * LD, w: aw, h: size });
                xx += aw + tr * size;
            }
        }
        var sw = jzClamp(c.dur * 0.3, 0.35, 0.9), hs = dir > 0 ? x0 - size * 0.3 : x1 + size * 0.3, he = dir > 0 ? x1 + size * 0.3 : x0 - size * 0.3;
        var HD = TH + 'var FS=ios((time-0.05)/' + jzN(sw) + '),HEAD=' + jzN(hs) + '+' + jzN(he - hs) + '*FS;';
        // the nozzle has sprayed everything on its trailing side: a rect mask whose edge follows the head (mask expansion)
        var reveal = function (Ly, ox, big) {
            var m0 = dir > 0 ? ld2_rectShape(-big, -big, hs - ox, big) : ld2_rectShape(hs - ox, -big, big, big);
            var had = Ly.property('ADBE Mask Parade').numProperties > 0, mk = ld2_mask(Ly, m0, had ? MaskMode.INTERSECT : MaskMode.ADD);
            jzSetExpr(mk.property('ADBE Mask Offset'), HD + 'Math.max(0,' + (dir > 0 ? 'HEAD-(' + jzN(hs) + ')' : '(' + jzN(hs) + ')-HEAD') + ')');
            return mk;
        };
        if (jzP(ctx, 'marks', true)) {
            var MK = jzShapeLayer(ctx, 'registration marks', 0, 0), Lm = size * 0.18, lwm = Math.max(1, u * 0.0016), pp = size * 0.28, gm = jzGrp(MK, 'marks');
            var cs = [[x0 - pp, y0 - pp], [x1 + pp, y0 - pp], [x1 + pp, y1 + pp], [x0 - pp, y1 + pp]];
            for (i = 0; i < 4; i++) { jzAddPath(gm, [[cs[i][0] - Lm, cs[i][1]], [cs[i][0] + Lm, cs[i][1]]], false); jzAddPath(gm, [[cs[i][0], cs[i][1] - Lm], [cs[i][0], cs[i][1] + Lm]], false); jzAddEllipse(gm, Lm * 0.9, Lm * 0.9, cs[i][0], cs[i][1]); }
            jzAddStroke(gm, sc.sub, lwm);
            jzSetExpr(jzXf(MK, 'ADBE Opacity'), TH + '100*oc(time/0.35)*K');
            var ML = jzText(ctx, 'No.' + jzLineNo(ctx) + '  /  ' + jzFmtTime(c.start), { font: jzMonoF(ctx), size: jzSmallSize(ctx), color: sc.sub, x: x0 - pp + Lm * 1.4, y: y0 - pp, align: 'left', track: 0.25, name: 'stencil label' });
            jzSetExpr(jzXf(ML, 'ADBE Opacity'), TH + '100*oc(time/0.35)*K'); ld2_ng([MK, ML]);
        }
        // overspray mist round every glyph + drips (in the tilted stencil frame)
        var MS = jzShapeLayer(ctx, 'overspray', W / 2, H / 2), gms = jzGrp(MS, 'mist');
        jzXf(MS, 'ADBE Anchor Point').setValue([W / 2, H / 2]); jzXf(MS, 'ADBE Rotate Z').setValue(tilt);
        for (i = 0; i < boxes.length; i++) {
            var b = boxes[i];
            for (k = 0; k < 12; k++) {
                var an = jzR(s, i, k, 1) * Math.PI * 2, rr = 0.5 + jzR(s, i, k, 2) * 0.35, rd = size * (0.004 + jzR(s, i, k, 3) * 0.008);
                jzAddEllipse(gms, rd * 2, rd * 2, W / 2 + b.lx + Math.cos(an) * b.w * rr * 0.62, H / 2 + b.ly + Math.sin(an) * b.h * rr * 0.62);
            }
        }
        jzAddFill(gms, col);
        jzSetExpr(jzXf(MS, 'ADBE Opacity'), TH + '50*K');
        reveal(MS, 0, Math.max(W, H) * 3); jzNoGhost(MS);
        if (boxes.length) {
            var DR = jzShapeLayer(ctx, 'drips', W / 2, H / 2), w0 = size * 0.035, nd = jzP(ctx, 'drips', 2);
            jzXf(DR, 'ADBE Anchor Point').setValue([W / 2, H / 2]); jzXf(DR, 'ADBE Rotate Z').setValue(tilt);
            for (k = 0; k < nd; k++) {
                var bx = boxes[jzHash(s, k, 7) % boxes.length], dx = W / 2 + bx.lx + (jzR(s, k, 8) * 2 - 1) * bx.w * 0.3, top = H / 2 + bx.ly + bx.h * 0.35;
                var t1 = 0.3 + k * 0.25 + (dir > 0 ? (dx - x0) / Math.max(1, x1 - x0) : (x1 - dx) / Math.max(1, x1 - x0)) * sw, Lmax = size * (0.25 + 0.3 * jzR(s, k, 9));
                var DL = TH + 'var DLn=' + jzN(Lmax) + '*oc((time-' + jzN(t1) + ')/1.4);';
                var gd = jzGrp(DR, 'drip ' + (k + 1)), gdb = ld2_sub(gd, 'bead'), gdr = ld2_sub(gd, 'run');
                jzAddEllipse(gdb, w0 * 1.2, w0 * 1.2); jzAddFill(gdb, col);
                ld2_gX(gdb, 'ADBE Vector Position', DL + '[0,DLn]');
                jzAddPath(gdr, [[-w0 / 2, 0], [w0 / 2, 0], [w0 * 0.35, 100], [-w0 * 0.35, 100]], true); jzAddFill(gdr, col);
                ld2_gX(gdr, 'ADBE Vector Scale', DL + '[100,DLn]');
                jzGX(gd).property('ADBE Vector Position').setValue([dx, top]);
                ld2_gX(gd, 'ADBE Vector Group Opacity', DL + 'DLn>1?100:0');
            }
            jzSetExpr(jzXf(DR, 'ADBE Opacity'), TH + '100*K'); jzNoGhost(DR);
        }
        // the lyric, cut by the stencil bridges (subtract masks) and revealed behind the nozzle
        var L = ld2_T(ctx, text, font, size, { color: col, x: W / 2, y: H / 2, track: tr, lead: lead });
        jzXf(L, 'ADBE Anchor Point').setValue([0, (nL - 1) / 2 * LD - LD2_CY * size]);
        jzXf(L, 'ADBE Position').setValue([W / 2, H / 2]);
        jzXf(L, 'ADBE Rotate Z').setValue(tilt);
        var bb = ld2_box(x0, y0, x1, y1);
        jzAnimate(ctx, L, { mi: 0, treat: false });
        var ax = 0, ay = (nL - 1) / 2 * LD - LD2_CY * size;
        reveal(L, W / 2 - ax, Math.max(W, H) * 3);
        var bw = size * 0.05;
        for (i = 0; i < boxes.length; i++) {
            var q = boxes[i], vx = q.lx + ((i % 3) - 1) * q.w * 0.06, gx = ax + 0, gy = ay;
            ld2_mask(L, ld2_rectShape(gx + vx - bw / 2, gy + q.ly - q.h * 0.62, gx + vx + bw / 2, gy + q.ly + q.h * 0.62), MaskMode.SUBTRACT);
            if (i % 2) {
                var hy = gy + q.ly - q.h * 0.06 - bw / 2;
                ld2_mask(L, ld2_rectShape(gx + q.lx - q.w * 0.62, hy, gx + vx - bw / 2, hy + bw), MaskMode.SUBTRACT);
                ld2_mask(L, ld2_rectShape(gx + vx + bw / 2, hy, gx + q.lx + q.w * 0.62, hy + bw), MaskMode.SUBTRACT);
            }
        }
        // spray cloud at the nozzle while it moves (3 drawings cycling)
        var CLd = jzShapeLayer(ctx, 'nozzle spray', 0, 0);
        for (var v = 0; v < 3; v++) {
            var gv = jzGrp(CLd, 'puff ' + (v + 1));
            for (k = 0; k < 24; k++) { var r2 = size * (0.01 + jzR(s, k, 13) * 0.02); jzAddEllipse(gv, r2 * 2, r2 * 2, (jzR(s, k, v, 12) * 2 - 1) * size * 0.25, y0 + (y1 - y0) * jzR(s, k, v, 11)); }
            jzAddFill(gv, col);
            ld2_gX(gv, 'ADBE Vector Group Opacity', 'Math.floor(time*24)%3==' + v + '?100:0');
        }
        jzSetExpr(jzXf(CLd, 'ADBE Position'), HD + '[HEAD,0]');
        jzSetExpr(jzXf(CLd, 'ADBE Opacity'), HD + '(FS>0&&FS<1)?35*K:0'); jzNoGhost(CLd);
        return bb;
    }
});
