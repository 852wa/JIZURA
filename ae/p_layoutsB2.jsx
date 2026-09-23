// ================================================================ pack layoutsB part 2 (AE port of src/11p_layoutsB.js)
// credits, zoomRepeat, splitHalves, columnsBig, circleWords, dotMatrix, depthStack, typeSpecimen, kanjiFocus,
// halfVertical, curtain, equalizer, tape. Every lyric stays ONE editable text layer (or one per browser item);
// plates / rules / rings / LED grids are shape layers driven by expressions on `time` (0 = cut start).

/* ---------------------------------------------------------------- shared helpers (lb2_) */
// expression header: jzTH (DUR IN OS OD SD PO K + easings) + smoothstep sm(a,b,x) + inOutCubic ioc(x)
function lb2_HD(ctx) {
    return jzTH(ctx) + 'function sm(a,b,x){var t=cl((x-a)/(b-a));return t*t*(3-2*t);}function ioc(x){x=cl(x);return x<0.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;}\n';
}
function lb2_isPunctLine(l) { var a = jzChars(l); for (var i = 0; i < a.length; i++) if (!(jzIsPunct(a[i]) || a[i] === ' ' || a[i] === '　')) return false; return true; }
// J.splitLines that never leaves a line of punctuation only (lines joined with \r)
function lb2_splitL(t, per) {
    var ls = jzSplitLines(t, per).split('\r'), out = [];
    for (var i = 0; i < ls.length; i++) { if (out.length && lb2_isPunctLine(ls[i])) out[out.length - 1] += ls[i]; else out.push(ls[i]); }
    return out.join('\r');
}
// mainLines(text, W, H, perL, perP): portrait -> short lines
function lb2_lines(ctx, text, perL, perP) {
    var t = jzTrim(String(text || '')), n = jzCount(t), per = ctx.W < ctx.H ? perP : perL;
    if (n <= per) return t;
    return lb2_splitL(t, Math.ceil(n / Math.ceil(n / per)));
}
// reading in capitals, only for kana text
function lb2_roma(t) { var c = jzStrip(t); if (!/[ぁ-ヿ]/.test(c)) return null; var r = jzRomaji(c); return r ? r.toUpperCase() : null; }
function lb2_onCol(sc, fill) {
    var cs = [sc.bg, sc.fg, sc.ink, sc.accent, sc.sub], best = null, bv = 0;
    for (var i = 0; i < cs.length; i++) { if (!cs[i] || cs[i] === fill) continue; var k = jzContrast(cs[i], fill); if (k > bv) { bv = k; best = cs[i]; } }
    return bv >= 2.4 ? best : (jzRelLum(fill) > 0.5 ? '#111111' : '#FFFFFF');
}
function lb2_plateCol(sc, pref) { for (var i = 0; i < pref.length; i++) if (pref[i] && jzContrast(pref[i], sc.bg) >= 1.6) return pref[i]; return sc.fg; }
// helper layers the browser draws with ghost off (main pass only) are kept out of the cut's tinted ghost copies
// (so faint items keep the browser's opacity: no ghost copy doubles their weight any more)
function lb2_ng(L) { if (L) jzNoGhost(L); return L; }
function lb2_miAt(ctx, t) { return Math.max(0, t) / Math.max(0.005, ctx.cut.stagger || 0.04); }
function lb2_plateHold(ctx) { return jzIndexOf(['still', 'jitter', 'breathe', 'glitchtick'], ctx.cut.hold) < 0; }
// text layer fitted like J.fitSize: o = { font, color, size, track, lead, maxW, maxH, maxSize, x, y, align, fill, stroke, strokeK (x size), strokeColor, rot, opacity }
function lb2_txt(ctx, str, o) {
    var lead = o.lead || 0, sz = o.size || 100, px = o.x == null ? 0 : o.x, py = o.y == null ? 0 : o.y;
    var L = jzText(ctx, str, { font: o.font, size: sz, color: o.color, x: px, y: py, align: o.align, track: o.track, leading: lead ? sz * lead : null, fill: o.fill,
        stroke: o.strokeK ? sz * o.strokeK : o.stroke, strokeColor: o.strokeColor, strokeOver: o.strokeOver, rot: o.rot, opacity: o.opacity, name: o.name });
    if (o.maxW || o.maxH) {
        var r = jzRect(L), k = Math.min((o.maxW || 1e6) / Math.max(1, r.width), (o.maxH || 1e6) / Math.max(1, r.height));
        var s = sz * k; if (o.maxSize) s = Math.min(s, o.maxSize); s = Math.max(1, s);
        jzTextDoc(L, function (td) { td.fontSize = s; if (lead) { td.autoLeading = false; td.leading = s * lead; } if (o.strokeK) td.strokeWidth = s * o.strokeK; });
        jzAnchor(L, o.align); jzXf(L, 'ADBE Position').setValue([px, py]);
    }
    return L;
}
// measure a string (width, height in px) without leaving a layer behind
function lb2_measure(ctx, str, o) { var P = lb2_txt(ctx, str, o), s = jzSize(P), f = jzFontSize(P); P.remove(); return { w: s[0], h: s[1], size: f }; }
// place a layer (anchored at its rect centre) so its top edge sits at `top`
function lb2_top(L, x, top) { jzXf(L, 'ADBE Position').setValue([x, top + jzSize(L)[1] / 2]); }
// glyph-by-glyph reveal (browser charFn reveal(t0, cnt) over 0.7 s); off = index of this layer's first glyph in the block
function lb2_reveal(ctx, L, t0, cnt, off) {
    jzAnimator(L, 'JZ Reveal', [['ADBE Text Opacity', 0]], JZ_FNS + 'var k=Math.floor(cl((time-' + jzN(t0) + ')/0.7)*' + jzN(cnt + 0.99) + ');(textIndex-1+' + (off || 0) + ')>=k?100:0');
}
// fade a text layer's fill / stroke colour from `fromHex` (usually the background) to `toHex` by `a` (defined in head):
// the browser's translucent items become opaque colour fades, so the cut's tinted ghost copies do not show through them
function lb2_colAnim(L, kind, fromHex, toHex, head) {
    var a = jzHex(fromHex), b = jzHex(toHex), mn = kind === 'stroke' ? 'ADBE Text Stroke Color' : 'ADBE Text Fill Color';
    var an = jzAnimator(L, 'JZ Fade Colour', [[mn, b]], '100');
    jzSetExpr(an.property('ADBE Text Animator Properties').property(mn), head + '[' + jzN(a[0]) + '+' + jzN(b[0] - a[0]) + '*a,' + jzN(a[1]) + '+' + jzN(b[1] - a[1]) + '*a,' + jzN(a[2]) + '+' + jzN(b[2] - a[2]) + '*a,1]');
    return an;
}
// latin-only strings: the browser turns latin glyphs 90 deg in vertical text, so a vertical latin arm / column becomes
// one horizontal text layer rotated 90 deg (reads top to bottom, spaces kept)
function lb2_isLatinStr(t) { return /[A-Za-z0-9]/.test(t) && /^[\x00-\x7F\s]*$/.test(t); }
// polygon / line shape layer at 0,0 (comp space)
function lb2_poly(ctx, name, pts, fill, stroke, w, closed) {
    var S = jzShapeLayer(ctx, name, 0, 0), g = jzGrp(S, name);
    jzAddPath(g, pts, closed);
    if (fill) jzAddFill(g, fill);
    if (stroke) jzAddStroke(g, stroke, w || 2);
    return S;
}

/* ================================================================ 15 credits — エンドロール */
// one text layer per column of the roll (roles / values), scrolled by a Position expression; every row fades at the
// frame edges (and around the lyric) through a per-glyph Opacity animator that knows the row of each glyph
function lb2_credCol(ctx, rows, o, R) {
    var lines = [], li = [], j, k, any = false;
    for (j = 0; j < rows.length; j++) {
        lines.push(rows[j]);
        if (rows[j]) any = true;
        var cs = jzChars(rows[j]); for (k = 0; k < cs.length; k++) li.push(j);
    }
    if (!any) return null;
    var L = lb2_ng(jzText(ctx, lines.join('\r'), { font: o.font, size: o.size, color: o.color, x: o.x, y: R.y0 + (o.dy || 0), align: o.align, track: o.track, leading: R.rowH }));
    jzXf(L, 'ADBE Anchor Point').setValue([0, -o.size * 0.35]);
    jzXf(L, 'ADBE Position').setValue([o.x, R.y0 + (o.dy || 0)]);
    var S = 'var S=((time+' + jzN(R.off) + ')*' + jzN(R.speed) + ')%' + jzN(R.block) + ';';
    jzSetExpr(jzXf(L, 'ADBE Position'), S + '[value[0],value[1]-S]');
    jzSetExpr(jzXf(L, 'ADBE Opacity'), lb2_HD(ctx) + 'value*oe(time/0.6)*K');
    jzXf(L, 'ADBE Opacity').setValue(o.alpha * 100);
    var band = R.side ? '1' : 'sm(' + jzN(R.bandH) + ',' + jzN(R.bandH + R.fs * 2) + ',Math.abs(yy-' + jzN(ctx.H / 2) + '))';
    jzAnimator(L, 'JZ Roll Fade', [['ADBE Text Opacity', 0]], lb2_HD(ctx) + S + 'var li=' + jzArrExpr(li) + ';var yy=' + jzN(R.y0) + '+li[textIndex-1]*' + jzN(R.rowH) + '-S;' +
        'var a=sm(' + jzN(ctx.H * 0.02) + ',' + jzN(ctx.H * 0.14) + ',yy)*sm(' + jzN(ctx.H * 0.98) + ',' + jzN(ctx.H * 0.86) + ',yy)*' + band + ';(1-a)*100');
    return L;
}
jzReg('layout', 'credits', {
    plan: function (rng, cut, st) {
        return { font: rng.pick(jzFontsOf(st, ['serif', 'display'])), fc: rng.pick(jzFontsOf(st, ['serif', 'body'])), variant: rng.pick(['center', 'center', 'side', 'single']), speed: rng.range(0.035, 0.06), off: rng.range(0, 10) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, M = jzU(ctx), u = ctx.u, i, r;
        var variant = jzP(ctx, 'variant', 'center'); if (W < H && variant === 'side') variant = 'center';
        var side = variant === 'side';
        var font = jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'serif')), fc = jzP(ctx, 'fc', jzFontKeyOf(ctx.st, 'serif')), mono = jzMonoF(ctx);
        var mt = lb2_lines(ctx, c.text, side ? 6 : 10, 5);
        // the credit rows: role / value
        var rom = lb2_roma(c.text), vals = [], seen = {};
        function add(rr, v) { v = jzTrim(String(v || '')).replace(/\s+/g, ' '); if (v && !seen['$' + v]) { seen['$' + v] = 1; vals.push([rr, v]); } }
        var line = c.lineText || c.text;
        add('詞', line);
        var ch = jzChunk(line); for (i = 0; i < ch.length; i++) add(i === 0 ? '語' : '', ch[i]);
        if (rom) add('READING', rom);
        if (c.note) add('NOTE', c.note);
        add('LINE', jzLineNo(ctx));
        add('TIME', jzFmtTime(c.start || 0));
        var fs = jzClamp(M * 0.026, 14 * u, 36 * u), rowH = fs * 2.3, nb = vals.length + 2, block = nb * rowH;
        var Kb = Math.ceil(H * 1.1 / block), reps = Kb + 1;
        // main lyric (measured first: the roll keeps clear of it)
        var mx = side ? W * 0.3 : W / 2;
        var P0 = lb2_measure(ctx, mt, { font: font, size: 100, track: 0.06, lead: 1.2, x: mx, y: H / 2, maxW: side ? W * 0.44 : W * 0.72, maxH: H * 0.26, maxSize: H * 0.16 });
        var R = { y0: H * 1.05 - block * Kb, rowH: rowH, block: block, speed: jzP(ctx, 'speed', 0.045) * H, off: jzP(ctx, 'off', 0), side: side, fs: fs,
            bandH: P0.size * mt.split('\r').length * 1.25 / 2 + fs * 2.2 };
        function col(fn) { var o = []; for (r = 0; r < reps; r++) { for (var q = 0; q < vals.length; q++) o.push(fn(vals[q])); o.push(''); o.push(''); } return o; }
        var cx = side ? W * 0.74 : W / 2;
        if (variant === 'single') {
            lb2_credCol(ctx, col(function (v) { return v[0]; }), { font: mono, size: fs * 0.62, color: sc.sub, x: cx, dy: -fs * 0.95, align: 'center', track: 0.3, alpha: 0.8 }, R);
            lb2_credCol(ctx, col(function (v) { return v[1]; }), { font: fc, size: fs, color: sc.fg, x: cx, align: 'center', track: 0.12, alpha: 0.85 }, R);
        } else {
            var g = fs * 0.9;
            lb2_credCol(ctx, col(function (v) { return /[A-Z]/.test(v[0]) ? '' : v[0]; }), { font: fc, size: fs * 0.72, color: sc.sub, x: cx - g, align: 'right', track: 0.25, alpha: 0.85 }, R);
            lb2_credCol(ctx, col(function (v) { return /[A-Z]/.test(v[0]) ? v[0] : ''; }), { font: mono, size: fs * 0.72, color: sc.sub, x: cx - g, align: 'right', track: 0.25, alpha: 0.85 }, R);
            lb2_credCol(ctx, col(function (v) { return v[1]; }), { font: fc, size: fs, color: sc.fg, x: cx + g, align: 'left', track: 0.1, alpha: 0.85 }, R);
        }
        if (side) {
            var S = lb2_ng(lb2_poly(ctx, 'credits rule', [[W * 0.52, H * 0.2], [W * 0.52, H * 0.8]], null, sc.sub, Math.max(u, M * 0.0012)));
            jzAddTrimPaths(S.property('ADBE Root Vectors Group').property(1), JZ_FNS + '100*oe(time/0.8)');
            jzSetExpr(jzXf(S, 'ADBE Opacity'), lb2_HD(ctx) + '50*K');
        }
        var L = lb2_txt(ctx, mt, { font: font, size: 100, color: sc.fg, x: mx, y: H / 2, track: 0.06, lead: 1.2, maxW: side ? W * 0.44 : W * 0.72, maxH: H * 0.26, maxSize: H * 0.16 });
        jzAnimate(ctx, L, { mi: 0 });
        return jzBB(L);
    }
});

/* ================================================================ 16 zoomRepeat — 連続拡大 */
// N copies of the lyric behind it, each cycling through the zoom levels L = (k + phase) mod N: scale q^L, fade in near
// L 0.3..0.95 and out towards Lmax (endless zoom tunnel); a thick background-coloured stroke keeps the lyric clear
jzReg('layout', 'zoomRepeat', {
    plan: function (rng, cut, st) {
        return { font: rng.pick(jzFontsOf(st, ['display', 'serif'])), dir: rng.pick([1, 1, -1]), style: rng.pick(['alt', 'alt', 'outline', 'fill']),
            twist: rng.chance(0.35) ? rng.range(3, 7) * rng.pick([1, -1]) : 0, q: rng.range(1.38, 1.6), speed: rng.range(0.35, 0.6) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, u = ctx.u;
        var font = jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'display')), dir = jzP(ctx, 'dir', 1) < 0 ? -1 : 1, style = jzP(ctx, 'style', 'alt');
        var twist = jzP(ctx, 'twist', 0), q = jzClamp(jzP(ctx, 'q', 1.5), 1.1, 3), speed = jzP(ctx, 'speed', 0.5);
        var mt = lb2_lines(ctx, c.text, 9, 5);
        var o = { font: font, size: 100, color: sc.fg, x: W / 2, y: H / 2, track: 0.03, lead: 1.1, maxW: W * 0.64, maxH: H * 0.3, maxSize: H * 0.2 };
        var m = lb2_measure(ctx, mt, o), size = m.size;
        var Lmax = Math.log(Math.max(W / Math.max(1, m.w), H / Math.max(1, m.h)) * 2.6) / Math.log(q);
        var N = Math.min(9, Math.ceil(Lmax) + 1) + 1; if (N % 2) N++;
        var HD = lb2_HD(ctx) + 'var N=' + N + ',Q=' + jzN(q) + ',LM=' + jzN(Lmax) + ';var e=oe(time/0.5);var ph=time*' + jzN(speed * dir) + '+(1-e)*' + jzN(1.5 * dir) + ';';
        for (var k = N - 1; k >= 0; k--) {
            var outline = style === 'outline' || (style === 'alt' && k % 2 === 0);
            // a faint copy = the bright colour at low opacity (not a dark opaque mix); kept out of the ghosts (ghost: false in the browser)
            var cp = { font: font, size: size, x: W / 2, y: H / 2, track: 0.03, lead: 1.1, name: 'zoom copy ' + k, color: sc.sub };
            if (outline) { cp.fill = false; cp.stroke = Math.max(1.2 * u, size * 0.01); cp.strokeColor = sc.sub; }
            var C = lb2_ng(lb2_txt(ctx, mt, cp));
            var Lk = HD + 'var L=((' + k + '+ph)%N+N)%N;';
            jzSetExpr(jzXf(C, 'ADBE Scale'), Lk + 'var s=Math.pow(Q,L);[value[0]*s,value[1]*s]');
            jzSetExpr(jzXf(C, 'ADBE Opacity'), Lk + 'sm(0.3,0.95,L)*(1-sm(LM*0.35,LM,L))*e*K*' + jzN(outline ? 52.5 : 11.2));
            if (twist) jzSetExpr(jzXf(C, 'ADBE Rotate Z'), Lk + 'value+' + jzN(twist) + '*L');
        }
        // knock-out stroke in the background colour under the lyric, then the lyric
        var KO = lb2_txt(ctx, mt, { font: font, size: size, x: W / 2, y: H / 2, track: 0.03, lead: 1.1, fill: false, stroke: size * 0.2, strokeColor: sc.bg, name: 'knockout' });
        jzMotion(ctx, KO, { size: size, mi: 0 });
        lb2_ng(KO);                                           // (a helper stroke, not the lyric: ghost: false in the browser)
        var L = lb2_txt(ctx, mt, { font: font, size: size, color: sc.fg, x: W / 2, y: H / 2, track: 0.03, lead: 1.1 });
        jzAnimate(ctx, L, { mi: 0 });
        return jzBB(L);
    }
});

/* ================================================================ 17 splitHalves — 上下割り */
// every line = two copies of the line clipped (layer mask) to its upper / lower half; the halves slide in from opposite
// sides (Anchor Point expression, so the cut's own motion stays untouched) and fly apart on the exit; an accent cut line
jzReg('layout', 'splitHalves', {
    plan: function (rng, cut, st) {
        return { font: rng.pick(jzFontsOf(st, ['display', 'serif'])), variant: rng.pick(['slide', 'slide', 'shear', 'duo']), dir: rng.pick([1, -1]), line: rng.pick(['full', 'short']), gap: rng.pick([0.07, 0.1, 0.13]) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, u = ctx.u;
        var font = jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'display')), variant = jzP(ctx, 'variant', 'slide'), dir = jzP(ctx, 'dir', 1) < 0 ? -1 : 1;
        var lineMode = jzP(ctx, 'line', 'full'), gap = jzP(ctx, 'gap', 0.1);
        var mt = lb2_lines(ctx, c.text, 11, 5), lines = mt.split('\r');
        var size = lb2_measure(ctx, mt, { font: font, size: 100, track: 0.04, lead: 1.3, x: W / 2, y: H / 2, maxW: W * 0.84, maxH: H * 0.5, maxSize: H * 0.24 }).size;
        var lead = size * 1.3 + gap * size, D = W * 0.32, lw = Math.max(1.5 * u, size * 0.016), g = gap * size / 2, bb = null;
        var HD = lb2_HD(ctx);
        for (var li = 0; li < lines.length; li++) {
            var y = H / 2 + (li - (lines.length - 1) / 2) * lead, dirL = dir * (li % 2 ? -1 : 1), lw0 = 0;
            for (var h = 0; h < 2; h++) {
                var L = jzText(ctx, lines[li], { font: font, size: size, color: (variant === 'duo' && h) ? sc.accent : sc.fg, x: W / 2, y: y + (h ? g : -g), track: 0.04 });
                var r = jzRect(L), ay = r.top + r.height / 2, x0 = r.left - W * 4, x1 = r.left + r.width + W * 4;
                lw0 = r.width;
                jzMaskRect(L, x0, h ? ay : ay - size * 2, x1, h ? ay + size * 2 : ay);
                var sh = variant === 'shear' ? '+' + jzN(size * 0.14) + '*e*(1+0.25*Math.sin(time*1.7))' : '';
                jzSetExpr(jzXf(L, 'ADBE Anchor Point'), HD + 'var e=oe((time-0.04)/0.7),ex=ie(PO);var off=' + jzN(D) + '*(1-e)' + sh + '+' + jzN(W * 0.4) + '*ex;[value[0]-(' + jzN((h ? -1 : 1) * dirL) + ')*off,value[1]]');
                jzAnimate(ctx, L, { mi: li * 2 + h });
                bb = jzUnion(bb, jzBB(L));
            }
            // the cut line (+ end dots on 'short')
            var half = lineMode === 'full' ? W * 0.5 : lw0 / 2 + size * 0.7;
            var S = jzShapeLayer(ctx, 'cut line', W / 2, y), gl = jzGrp(S, 'line');
            jzAddRect(gl, half * 2, lw); jzAddFill(gl, sc.accent);
            var LE = HD + 'var le=oe((time-0.1)/0.6)*K;';
            jzGX(gl).property('ADBE Vector Scale').expression = LE + '[100*le,100]';
            jzSetExpr(jzXf(S, 'ADBE Opacity'), LE + 'le>0.001?100:0');
            if (lineMode === 'short') {           // end dots: ghost off in the browser (the line itself is ghosted)
                var DS = lb2_ng(jzShapeLayer(ctx, 'cut line dots', W / 2, y));
                for (var sd = -1; sd <= 1; sd += 2) {
                    var gd = jzGrp(DS, 'dot'); jzAddEllipse(gd, lw * 3.2, lw * 3.2); jzAddFill(gd, sc.accent);
                    jzGX(gd).property('ADBE Vector Position').expression = LE + '[' + jzN(sd * half) + '*le,0]';
                }
                jzSetExpr(jzXf(DS, 'ADBE Opacity'), LE + 'le>0.001?100:0');
            }
        }
        return bb;
    }
});

/* ================================================================ 18 columnsBig — 大小縦組 */
// one big vertical column (the lyric) + smaller annotation columns (the whole line, then romaji / note) typed in
// glyph by glyph beside it, a hairline rule and an accent bar / dot
// a small vertical column whose top sits at `top`: CJK = one glyph per line, latin = a line turned 90 deg
function lb2_vcol(ctx, str, o, x, top) {
    var C;
    if (lb2_isLatinStr(str)) { C = jzText(ctx, str, { font: o.font, size: o.size, color: o.color, x: x, y: 0, track: o.track || 0.06, opacity: o.opacity, rot: 90 }); jzXf(C, 'ADBE Position').setValue([x, top + jzSize(C)[0] / 2]); }
    else { C = jzText(ctx, jzVertical(str), { font: o.font, size: o.size, color: o.color, x: x, y: 0, leading: o.size * o.lead, opacity: o.opacity }); lb2_top(C, x, top); }
    return C;
}
jzReg('layout', 'columnsBig', {
    plan: function (rng, cut, st) {
        return { font: rng.pick(jzFontsOf(st, ['display', 'serif'])), fs: rng.pick(jzFontsOf(st, ['serif', 'body'])), side: rng.pick(['left', 'left', 'right']), rule: rng.chance(0.7), mark: rng.pick(['bar', 'dot', 'none']), off: rng.range(-0.05, 0.05) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, M = jzU(ctx), u = ctx.u, port = W < H, i;
        var font = jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'display')), fsF = jzP(ctx, 'fs', jzFontKeyOf(ctx.st, 'serif'));
        var left = jzP(ctx, 'side', 'left') === 'left', mark = jzP(ctx, 'mark', 'bar');
        var txt = jzTrim(c.text).replace(/[\s　]+/g, ' ');
        var hx = W * (port ? (left ? 0.62 : 0.38) : (left ? 0.58 : 0.4)) + jzP(ctx, 'off', 0) * W;
        var lat = lb2_isLatinStr(txt), L;
        if (lat) L = lb2_txt(ctx, txt, { font: font, size: 100, color: sc.fg, x: hx, y: H / 2, track: 0.02, rot: 90, maxW: H * 0.84, maxH: port ? W * 0.44 : W * 0.3, maxSize: H * 0.42 });
        else L = lb2_txt(ctx, jzVertical(txt), { font: font, size: 100, color: sc.fg, x: hx, y: H / 2, lead: 1.02, maxW: port ? W * 0.44 : W * 0.3, maxH: H * 0.84, maxSize: H * 0.42 });
        var size = jzFontSize(L), colH = jzSize(L)[lat ? 0 : 1], top = H / 2 - colH / 2;
        var bbM = lat ? { x0: hx - size * 0.4, x1: hx + size * 0.4, y0: top, y1: top + colH, cx: hx, cy: H / 2 } : jzBB(L);
        jzAnimate(ctx, L, { mi: 0 });
        var fs = jzClamp(M * 0.031, 14 * u, 44 * u);
        var perCol = Math.max(4, Math.floor(colH * 0.92 / (fs * 1.08)));
        var line = jzStrip(c.lineText || c.text), cols = lb2_splitL(line, perCol).split('\r');
        var rom = lb2_roma(txt), sub2 = rom ? rom : c.note ? String(c.note) : 'No.' + jzLineNo(ctx) + ' ' + jzFmtTime(c.start || 0);
        var sgn = left ? -1 : 1, x1 = hx + sgn * (size * 0.5 + fs * 1.9), nL = cols.length;
        var x2 = x1 + sgn * (nL * fs * 1.7 + fs * 0.6), xc = x1 + sgn * (nL - 1) * fs * 0.85;
        var cnt = jzCount(line), offI = 0;
        for (i = 0; i < nL; i++) {           // columns read right -> left
            var C = lb2_ng(lb2_vcol(ctx, cols[i], { font: fsF, size: fs, color: sc.fg, lead: 1.06, opacity: 0.9 }, xc + ((nL - 1) / 2 - i) * fs * 1.7, top));
            lb2_reveal(ctx, C, 0.18, cnt, offI); offI += jzCount(cols[i]);
            jzSetExpr(jzXf(C, 'ADBE Opacity'), lb2_HD(ctx) + 'value*K');
        }
        var s2 = fs * 0.72, T2 = lb2_vcol(ctx, sub2, { font: rom ? jzMonoF(ctx) : fsF, size: s2, color: sc.sub, lead: 1.18, track: 0.18, opacity: 0.9 }, x2, top);
        lb2_reveal(ctx, T2, 0.35, jzCount(sub2) + 2, 0); lb2_ng(T2);
        jzSetExpr(jzXf(T2, 'ADBE Opacity'), lb2_HD(ctx) + 'value*K');
        var lw = Math.max(u, M * 0.0014), rx = hx + sgn * (size * 0.5 + fs * 0.85);
        if (jzP(ctx, 'rule', true)) {
            var R = lb2_ng(lb2_poly(ctx, 'rule', [[rx, top], [rx, top + colH]], null, sc.sub, lw));
            jzAddTrimPaths(R.property('ADBE Root Vectors Group').property(1), JZ_FNS + '100*oc((time-0.1)/0.6)');
            jzSetExpr(jzXf(R, 'ADBE Opacity'), lb2_HD(ctx) + '70*K');
        }
        var Q = lb2_HD(ctx) + 'var x=cl((time-0.15)/0.3);var q=x<=0?0:ob(x,2)*K;';
        if (mark === 'bar') {
            var bh = Math.max(3 * u, size * 0.06), B = jzShapeLayer(ctx, 'mark bar', hx - size * 0.5, top - size * 0.28 + bh / 2), gb = jzGrp(B, 'bar');
            jzAddRect(gb, size, bh, 0, size / 2, 0); jzAddFill(gb, sc.accent);
            jzSetExpr(jzXf(B, 'ADBE Scale'), Q + '[value[0]*q,value[1]]');
        } else if (mark === 'dot') {
            var Dt = jzEllipseLayer(ctx, 'mark dot', rx, top - fs * 0.9, fs * 0.56, fs * 0.56, sc.accent);
            jzSetExpr(jzXf(Dt, 'ADBE Scale'), Q + '[value[0]*q,value[1]*q]');
        }
        return bbM;
    }
});

/* ================================================================ 19 circleWords — 同心円 */
// 2-3 rings of text (text on a circular mask path, tracking set so each ring closes exactly) turning in alternate
// directions around the lyric, thin guide circles and a tick dial that draws itself round
jzReg('layout', 'circleWords', {
    plan: function (rng, cut, st) {
        return { font: rng.pick(jzFontsOf(st, ['display', 'serif'])), fr: rng.pick(jzFontsOf(st, ['body', 'serif'])), rings: rng.pick([2, 3, 3]), speed: rng.range(7, 13), dir: rng.pick([1, -1]), ticks: rng.chance(0.6), guides: rng.chance(0.7) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, M = jzU(ctx), u = ctx.u, s = c.seed || 1, i, k;
        var font = jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'display')), fr = jzP(ctx, 'fr', jzFontKeyOf(ctx.st, 'body'));
        var rings = jzClamp(Math.round(jzP(ctx, 'rings', 3)), 1, 3), speed = jzP(ctx, 'speed', 10), dir = jzP(ctx, 'dir', 1) < 0 ? -1 : 1;
        var cx = W / 2, cy = H / 2, gapR = M * 0.072, R0 = M * 0.46 - gapR * (rings - 1);
        var txt = jzTrim(c.text).replace(/[\s　]+/g, ' '), n = jzCount(txt);
        var mt = n <= 4 ? txt : lb2_splitL(txt, Math.ceil(n / Math.ceil(n / 5)));
        var rom = lb2_roma(txt);
        var units = [jzTrim(String(c.lineText || c.text).replace(/\s+/g, ' ')) + '　✦　', (rom || (c.words && c.words.length ? c.words.join(' / ') : '') || txt) + '  —  ', jzStrip(txt) + '・'];
        var lw = Math.max(u, M * 0.0014), HD = lb2_HD(ctx);
        var G = null;
        if (jzP(ctx, 'guides', true)) { G = lb2_ng(jzShapeLayer(ctx, 'ring guides', cx, cy)); jzXf(G, 'ADBE Opacity').setValue(35); }
        for (k = 0; k < rings; k++) {
            var R = R0 + k * gapR, f = jzClamp(gapR * 0.46 * (k === 1 ? 0.8 : 1), 10 * u, 52 * u), rf = k === 1 && rom ? jzMonoF(ctx) : fr;
            var uw = Math.max(1, lb2_measure(ctx, units[k % 3], { font: rf, size: f, track: 0.08, x: 0, y: 0 }).w);
            var reps = Math.max(1, Math.min(12, Math.round(Math.PI * 2 * R / uw))), str = '';
            for (i = 0; i < reps; i++) str += units[k % 3];
            var chs = jzChars(str); if (chs.length > 160) chs = chs.slice(0, 160);
            str = chs.join('');
            var T = lb2_ng(jzText(ctx, str, { font: rf, size: f, color: k === 0 ? sc.fg : sc.sub, x: 0, y: 0, align: 'left' }));
            var w0 = jzRect(T).width, extra = (Math.PI * 2 * (R - f * 0.36) - w0) / chs.length;
            jzTextDoc(T, function (td) { td.tracking = Math.round(extra / f * 1000); });
            jzTextOnPath(T, jzCircleShape(cx, cy, R - f * 0.36), null, ctx);
            var fl = [], anyStar = false; for (i = 0; i < chs.length; i++) { fl.push(chs[i] === '✦'); if (chs[i] === '✦') anyStar = true; }
            if (anyStar) jzCharColors(T, sc.accent, fl, 'JZ Star');
            var E = HD + 'var e=oe((time-' + jzN(k * 0.08) + ')/0.7);';
            jzSetExpr(jzXf(T, 'ADBE Rotate Z'), 'value+' + jzN(jzR(s, k, 3) * 360) + '+time*' + jzN(speed * (k % 2 ? -1 : 1) * dir));
            jzSetExpr(jzXf(T, 'ADBE Scale'), E + 'var z=0.9+0.1*e;[value[0]*z,value[1]*z]');
            jzSetExpr(jzXf(T, 'ADBE Opacity'), E + '90*e*K');
            if (G) {
                var rs = k === 0 ? [R + gapR * 0.5, R - gapR * 0.5] : [R + gapR * 0.5];
                for (i = 0; i < rs.length; i++) {
                    var gg = jzGrp(G, 'guide ' + k); jzAddEllipse(gg, rs[i] * 2, rs[i] * 2); jzAddStroke(gg, sc.sub, lw);
                    jzGX(gg).property('ADBE Vector Scale').expression = E + 'var z=100*(0.9+0.1*e);[z,z]';
                    jzGX(gg).property('ADBE Vector Group Opacity').expression = E + '100*e*K';
                }
            }
        }
        if (jzP(ctx, 'ticks', true)) {
            var Rt = R0 + (rings - 1) * gapR + gapR * 0.5, TK = lb2_ng(jzShapeLayer(ctx, 'tick dial', cx, cy));
            var spec = [[18, sc.accent, gapR * 0.3, 4], [6, sc.sub, gapR * 0.3, 12], [1, sc.sub, gapR * 0.14, 72]];
            var CN = HD + 'var e=oe(time/0.9)*K;var n=Math.min(72,Math.floor(e*72)+1);';
            for (i = 0; i < spec.length; i++) {
                var gt = jzGrp(TK, 'ticks ' + spec[i][3]);
                jzAddPath(gt, [[0, -Rt], [0, -Rt - spec[i][2]]], false); jzAddStroke(gt, spec[i][1], lw);
                var rp = jzVecs(gt).addProperty('ADBE Vector Filter - Repeater');
                rp.property('ADBE Vector Repeater Copies').expression = CN + 'Math.floor((n-1)/' + spec[i][0] + ')+1';
                var rt = rp.property('ADBE Vector Repeater Transform');
                rt.property('ADBE Vector Repeater Position').setValue([0, 0]);
                rt.property('ADBE Vector Repeater Rotation').setValue(360 / spec[i][3]);
            }
            jzSetExpr(jzXf(TK, 'ADBE Rotate Z'), 'value-time*' + jzN(speed * 0.5 * dir));
            jzSetExpr(jzXf(TK, 'ADBE Opacity'), HD + '60*K');
        }
        var L = lb2_txt(ctx, mt, { font: font, size: 100, color: sc.fg, x: cx, y: cy, track: 0.03, lead: 1.1, maxW: R0 * 1.45, maxH: R0 * 1.05, maxSize: R0 * 0.55 });
        jzAnimate(ctx, L, { mi: 0 });
        return jzBB(L);
    }
});

/* ================================================================ 20 dotMatrix — ドット表示 */
// LED board: panel plate, an unlit dot grid (shape + two repeaters) switching on column by column, and the lyric
// (text layer, thick stroke) seen through an alpha track matte made of the same dot grid -> lit LEDs.
// Reveal: sweep (the matte's column count grows, a bright scan column runs ahead), scroll (text slides in by whole
// dots), random (Block Dissolve at dot size).
function lb2_dotGrid(ctx, name, x0, y0, p, cols, rows, d, round, col, colsExpr) {
    var S = jzShapeLayer(ctx, name, 0, 0), g = jzGrp(S, 'dots');
    if (round) jzAddEllipse(g, d, d, x0 + p / 2, y0 + p / 2); else jzAddRect(g, d, d, 0, x0 + p / 2, y0 + p / 2);
    jzAddFill(g, col);
    var r1 = jzVecs(g).addProperty('ADBE Vector Filter - Repeater');
    if (colsExpr) r1.property('ADBE Vector Repeater Copies').expression = colsExpr; else r1.property('ADBE Vector Repeater Copies').setValue(cols);
    r1.property('ADBE Vector Repeater Transform').property('ADBE Vector Repeater Position').setValue([p, 0]);
    var r2 = jzVecs(g).addProperty('ADBE Vector Filter - Repeater');
    r2.property('ADBE Vector Repeater Copies').setValue(rows);
    r2.property('ADBE Vector Repeater Transform').property('ADBE Vector Repeater Position').setValue([0, p]);
    return S;
}
jzReg('layout', 'dotMatrix', {
    plan: function (rng, cut, st) {
        return { font: rng.pick(['dot', 'gothic_black', 'dot']), reveal: rng.pick(['sweep', 'sweep', 'scroll', 'random']), panel: rng.chance(0.7), col: rng.pick(['accent', 'accent', 'fg']), shape: rng.pick(['round', 'round', 'square']) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, M = jzU(ctx), u = ctx.u, i;
        var font = jzP(ctx, 'font', 'dot'), reveal = jzP(ctx, 'reveal', 'sweep'), panelOn = !!jzP(ctx, 'panel', true), round = jzP(ctx, 'shape', 'round') === 'round';
        var mt = lb2_lines(ctx, c.text, 8, 4), lines = mt.split('\r'), maxL = 1;
        for (i = 0; i < lines.length; i++) maxL = Math.max(maxL, jzCount(lines[i]) || 1);
        var D = jzClamp(Math.floor(W * 0.86 / (maxL * M * 0.011)), 10, 16), lead = 1.3;
        var m = lb2_measure(ctx, mt, { font: font, size: 100, lead: lead, x: 0, y: 0 });
        var cols = Math.ceil(m.w / 100 * D * 0.94) + 2, rows = Math.ceil(D * 0.94 * (lines.length * lead - (lead - 1))) + 2;
        var p = Math.min(W * 0.88 / cols, H * 0.62 / rows), gw = cols * p, gh = rows * p, gx = W / 2 - gw / 2, gy = H / 2 - gh / 2;
        var dark = jzRelLum(sc.bg) < 0.45;
        var panel = panelOn ? (dark ? jzMixHex(sc.bg, sc.fg, 0.05) : (jzRelLum(sc.fg) < jzRelLum(sc.ink) ? sc.fg : sc.ink)) : sc.bg;
        var cand = [jzP(ctx, 'col', 'accent') === 'accent' ? sc.accent : sc.fg, sc.accent, sc.fg, sc.accent2, sc.bg], litC = null;
        for (i = 0; i < cand.length; i++) if (cand[i] && jzContrast(cand[i], panel) >= 2.5) { litC = cand[i]; break; }
        if (!litC) litC = lb2_onCol(sc, panel);
        var dd = p * (round ? 0.76 : 0.8), HD = lb2_HD(ctx), t0 = 0.12, T = jzClamp(c.dur * 0.3, 0.25, 0.7);
        var U = HD + 'var C=' + cols + ',u=cl((time-' + jzN(t0) + ')/' + jzN(T) + ');';
        // panel (on a dark background: a faint fg plate, i.e. fg at 5 % opacity) + unlit dots (lit colour at 13 % opacity)
        if (panelOn) {
            var pd = p * 1.2, PL = jzRectLayer(ctx, 'LED panel', W / 2, H / 2, gw + pd * 2, gh + pd * 2, dark ? sc.fg : panel, { round: p * 1.2 });
            jzSetExpr(jzXf(PL, 'ADBE Opacity'), HD + jzN(dark ? 5 : 100) + '*oe(time/0.3)*K'); lb2_ng(PL);
            var PS = jzRectLayer(ctx, 'LED panel rim', W / 2, H / 2, gw + pd * 2, gh + pd * 2, null, { round: p * 1.2, stroke: litC, strokeW: Math.max(u, p * 0.12) });
            jzSetExpr(jzXf(PS, 'ADBE Opacity'), HD + '30*oe(time/0.3)*K'); lb2_ng(PS);
        }
        var OFF = lb2_dotGrid(ctx, 'LED unlit', gx, gy, p, cols, rows, dd, round, litC, HD + 'Math.ceil(cl(time/0.3)*' + cols + ')');
        jzSetExpr(jzXf(OFF, 'ADBE Opacity'), HD + '13*oe(time/0.3)*K'); lb2_ng(OFF);
        // lit dots: the lyric through a dot-grid matte
        var fsz = 0.94 * D * p;
        var L = jzText(ctx, mt, { font: font, size: fsz, color: litC, x: W / 2, y: H / 2, leading: fsz * lead, stroke: p * 0.4, strokeColor: litC });
        if (reveal === 'scroll') jzSetExpr(jzXf(L, 'ADBE Anchor Point'), U + '[value[0]-Math.round((1-oc(u))*C)*' + jzN(p) + ',value[1]]');
        if (reveal === 'random') {
            var bd = jzEffect(L, 'ADBE Block Dissolve', 'JZ LED Random');
            jzEP(bd, 2, p); jzEP(bd, 3, p); jzEP(bd, 4, 0); jzEP(bd, 5, 0);
            jzEX(bd, 1, U + '100*(1-Math.min(1,u*1.05))');
        }
        jzMotion(ctx, L, { size: fsz, mi: lb2_miAt(ctx, t0), noHold: true });
        var MT = lb2_dotGrid(ctx, 'LED matte', gx, gy, p, cols, rows, dd, round, '#FFFFFF', reveal === 'sweep' ? U + 'Math.max(0,Math.min(C,Math.floor(u*(C+4)-2)+1))' : null);
        L.trackMatteType = TrackMatteType.ALPHA;
        if (reveal === 'sweep') {        // bright scan column at the sweep front
            var SC = jzText(ctx, mt, { font: font, size: fsz, color: sc.fg, x: W / 2, y: H / 2, leading: fsz * lead, stroke: p * 0.4, strokeColor: sc.fg, name: 'LED scan' });
            jzSetExpr(jzXf(SC, 'ADBE Opacity'), U + 'u>0&&u<1?90*K:0');
            var SM = jzShapeLayer(ctx, 'LED scan matte', 0, 0), sg = jzGrp(SM, 'column');
            if (round) jzAddEllipse(sg, dd, dd, gx + p / 2, gy + p / 2); else jzAddRect(sg, dd, dd, 0, gx + p / 2, gy + p / 2);
            jzAddFill(sg, '#FFFFFF');
            var r2 = jzVecs(sg).addProperty('ADBE Vector Filter - Repeater');
            r2.property('ADBE Vector Repeater Copies').setValue(rows);
            r2.property('ADBE Vector Repeater Transform').property('ADBE Vector Repeater Position').setValue([0, p]);
            jzGX(sg).property('ADBE Vector Position').expression = U + '[Math.floor(u*(C+4)-2)*' + jzN(p) + ',0]';
            SC.trackMatteType = TrackMatteType.ALPHA; lb2_ng(SC); lb2_ng(SM);
        }
        return { x0: gx, y0: gy, x1: gx + gw, y1: gy + gh, cx: W / 2, cy: H / 2 };
    }
});

/* ================================================================ 21 depthStack — 奥行き重ね */
// copies of the lyric shrinking towards a (swaying) vanishing point: each copy's Position / Scale follow
// s = 1 / (1 + k*0.26*depth); 'lines' adds four corner rays (rect groups whose size / angle follow the same maths)
jzReg('layout', 'depthStack', {
    plan: function (rng, cut, st) {
        var a = rng.pick([-150, -120, -60, -30, 30, 60, 120, 150, -90, 90]) + rng.range(-12, 12);
        return { font: rng.pick(jzFontsOf(st, ['display', 'serif'])), ang: a, copies: rng.int(5, 8), dist: rng.range(0.42, 0.62), style: rng.pick(['outline', 'outline', 'dim', 'lines']), sway: rng.chance(0.7) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, M = jzU(ctx), u = ctx.u, k;
        var font = jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'display')), N = jzClamp(Math.round(jzP(ctx, 'copies', 6)), 1, 12), style = jzP(ctx, 'style', 'outline');
        var a = jzP(ctx, 'ang', 60) * Math.PI / 180, dx = Math.cos(a), dy = Math.sin(a), dist = jzP(ctx, 'dist', 0.5);
        var mt = lb2_lines(ctx, c.text, 9, 5);
        var cx = W / 2 - dx * M * 0.05, cy = H / 2 - dy * M * 0.05;
        var m = lb2_measure(ctx, mt, { font: font, size: 100, track: 0.03, lead: 1.1, x: cx, y: cy, maxW: W * 0.66, maxH: H * 0.3, maxSize: H * 0.2 }), size = m.size;
        var HD = lb2_HD(ctx) + 'var CX=' + jzN(cx) + ',CY=' + jzN(cy) + ',dp=oc(time/0.7)*K;var vx=' + jzN(cx + dx * M * dist) + ',vy=' + jzN(cy + dy * M * dist) + ';' +
            (jzP(ctx, 'sway', true) ? 'vx+=Math.sin(time*0.7)*' + jzN(M * 0.05) + ';vy+=Math.cos(time*0.55)*' + jzN(M * 0.035) + ';' : '');
        if (style === 'lines') {
            var R = lb2_ng(jzShapeLayer(ctx, 'depth rays', 0, 0)), cs = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
            for (var q = 0; q < 4; q++) {
                var g = jzGrp(R, 'ray'), rr = jzAddRect(g, 10, Math.max(u, M * 0.0013));
                var E = HD + 'var sN=1/(1+' + N + '*0.26*dp);var x0=CX+' + jzN(cs[q][0] * m.w / 2) + ',y0=CY+' + jzN(cs[q][1] * m.h / 2) + ';var x1=CX+(vx-CX)*(1-sN)+' + jzN(cs[q][0] * m.w / 2) + '*sN,y1=CY+(vy-CY)*(1-sN)+' + jzN(cs[q][1] * m.h / 2) + '*sN;';
                rr.property('ADBE Vector Rect Size').expression = E + '[Math.sqrt((x1-x0)*(x1-x0)+(y1-y0)*(y1-y0)),value[1]]';
                jzAddFill(g, sc.sub);                             // (after the rect is configured: adding the fill invalidates rr)
                jzGX(g).property('ADBE Vector Position').expression = E + '[(x0+x1)/2,(y0+y1)/2]';
                jzGX(g).property('ADBE Vector Rotation').expression = E + 'Math.atan2(y1-y0,x1-x0)*180/Math.PI';
            }
            jzSetExpr(jzXf(R, 'ADBE Opacity'), HD + 'dp>0.01?50*K:0');
        }
        for (k = N; k >= 1; k--) {
            var f = k / N, o = { font: font, size: size, x: cx, y: cy, track: 0.03, lead: 1.1, name: 'depth ' + k };
            if (style === 'dim') o.color = jzMixHex(sc.bg, sc.sub, 0.55 - 0.4 * f);
            else { o.fill = false; o.stroke = Math.max(u, size * 0.014); o.strokeColor = k === 1 ? sc.accent : sc.sub; }
            var C = lb2_ng(lb2_txt(ctx, mt, o)), S = HD + 'var s1=1/(1+' + k + '*0.26*dp);';
            jzSetExpr(jzXf(C, 'ADBE Position'), S + '[value[0]+(vx-CX)*(1-s1),value[1]+(vy-CY)*(1-s1)]');
            jzSetExpr(jzXf(C, 'ADBE Scale'), S + '[value[0]*s1,value[1]*s1]');
            jzSetExpr(jzXf(C, 'ADBE Opacity'), S + 'dp<=0.001?0:' + (style === 'dim' ? '100*K' : jzN((0.85 - 0.6 * f) * 100) + '*K'));
        }
        var L = lb2_txt(ctx, mt, { font: font, size: size, color: sc.fg, x: cx, y: cy, track: 0.03, lead: 1.1 });
        jzAnimate(ctx, L, { mi: 0 });
        return jzBB(L);
    }
});

/* ================================================================ 22 typeSpecimen — 書体見本 */
// the lyric set in several typefaces on a specimen grid (2x2 / 3x3 with a big main cell / list rows): every cell
// has a rule that draws out, a mono caption (number, font name, weight) and the sample rising in
var LB2_SPEC_FONTS = ['gothic_black', 'mincho', 'round', 'dot', 'brush', 'pop', 'dela', 'tokumin', 'zenkaku', 'gothic_light', 'mincho_black', 'sansui', 'mincho_light'];
jzReg('layout', 'typeSpecimen', {
    plan: function (rng, cut, st) {
        var main = rng.pick(jzFontsOf(st, ['display', 'serif'])), pool = [], i;
        for (i = 0; i < LB2_SPEC_FONTS.length; i++) if (LB2_SPEC_FONTS[i] !== main && JZ_DATA.fonts[LB2_SPEC_FONTS[i]]) pool.push(LB2_SPEC_FONTS[i]);
        for (i = pool.length - 1; i > 0; i--) { var j = rng.int(0, i), t = pool[i]; pool[i] = pool[j]; pool[j] = t; }
        var port = cut.H > cut.W;
        return { main: main, fonts: pool.slice(0, 6), grid: port ? 'list' : rng.pick(['g2', 'g3', 'list']), num: rng.int(1, 30) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, M = jzU(ctx), u = ctx.u, i;
        var txt = jzTrim(c.text), grid = jzP(ctx, 'grid', W < H ? 'list' : 'g3'), num = jzP(ctx, 'num', 1);
        var main = jzP(ctx, 'main', jzFontKeyOf(ctx.st, 'display')), fonts = jzP(ctx, 'fonts', null);
        if (!fonts || !fonts.length) { fonts = []; for (i = 0; i < LB2_SPEC_FONTS.length; i++) if (LB2_SPEC_FONTS[i] !== main) fonts.push(LB2_SPEC_FONTS[i]); }
        var lw = Math.max(u, M * 0.0014), cap = jzClamp(M * 0.017, 11 * u, 24 * u), mono = jzMonoF(ctx);
        var cells = [], mx = W * 0.07, my = H * 0.1, gw = W - mx * 2, gh = H - my * 2, g, cw, ch;
        function F(k) { return fonts[k % fonts.length]; }
        if (grid === 'g2') {
            g = M * 0.02; cw = (gw - g) / 2; ch = (gh - g) / 2;
            for (i = 0; i < 4; i++) cells.push({ x: mx + (i % 2) * (cw + g), y: my + Math.floor(i / 2) * (ch + g), w: cw, h: ch, font: i === 0 ? main : F(i - 1), main: i === 0 });
        } else if (grid === 'g3') {
            g = M * 0.018; cw = (gw - g * 2) / 3; ch = (gh - g * 2) / 3;
            cells.push({ x: mx, y: my, w: cw * 2 + g, h: ch * 2 + g, font: main, main: true });
            var rest = [[2, 0], [2, 1], [0, 2], [1, 2], [2, 2]];
            for (i = 0; i < rest.length; i++) cells.push({ x: mx + rest[i][0] * (cw + g), y: my + rest[i][1] * (ch + g), w: cw, h: ch, font: F(i), main: false });
        } else {
            var rowsN = W < H ? 5 : 4, tot = 2.2 + (rowsN - 1), y = my;
            for (i = 0; i < rowsN; i++) { var hh = gh * (i === 0 ? 2.2 : 1) / tot; cells.push({ x: mx, y: y, w: gw, h: hh, font: i === 0 ? main : F(i - 1), main: i === 0 }); y += hh; }
        }
        var list = grid === 'list', HD = lb2_HD(ctx), bb = null;
        var RL = lb2_ng(jzShapeLayer(ctx, 'specimen rules', 0, 0));
        for (i = 0; i < cells.length; i++) {
            var cl = cells[i], d = 0.06 + i * 0.07, E = HD + 'var e=oc((time-' + jzN(d) + ')/0.4)*K;';
            var gr = jzGrp(RL, 'rule ' + (i + 1)); jzAddRect(gr, cl.w, cl.main ? lw * 3 : lw, 0, cl.w / 2, 0); jzAddFill(gr, cl.main ? sc.accent : sc.sub);
            jzGX(gr).property('ADBE Vector Position').setValue([cl.x, cl.y]);
            jzGX(gr).property('ADBE Vector Scale').expression = HD + '[100*oe((time-' + jzN(d) + ')/0.5),100]';
            jzGX(gr).property('ADBE Vector Group Opacity').expression = HD + 'time<' + jzN(d) + '?0:' + (cl.main ? 100 : 60) + '*K';
            var FI = JZ_DATA.fonts[cl.font] || {};
            var label = jzPad(num + i, 2) + '  ' + String(FI.label || cl.font).toUpperCase() + '  ' + (FI.weight || '');
            var LB = jzText(ctx, label, { font: mono, size: cap, color: cl.main ? sc.accent : sc.sub, x: cl.x, y: cl.y + cap * 1.1, align: 'left', track: 0.08 });
            jzSetExpr(jzXf(LB, 'ADBE Opacity'), E + '100*e'); lb2_ng(LB);
            var tw = list ? cl.w * (cl.main ? 1 : 0.8) : cl.w * 0.9, th = cl.h - cap * (list ? 1.8 : 2.8);
            var tx = list ? cl.x : cl.x + cl.w / 2, ty = cl.y + cap * (list ? 1.8 : 2.2) + th / 2;
            if (list && !cl.main) { tx = cl.x + cl.w * 0.2; ty = cl.y + cl.h / 2 + cap * 0.3; }
            var T = lb2_txt(ctx, txt, { font: cl.font, size: 100, color: cl.main ? sc.fg : sc.sub, x: tx, y: ty, align: list ? 'left' : 'center', track: 0.02,
                maxW: tw, maxH: th * (list ? 0.78 : 0.7), maxSize: cl.main ? H * 0.3 : H * 0.14 });
            if (cl.main) { jzAnimate(ctx, T, { mi: 0 }); bb = jzBB(T); }
            else {
                lb2_ng(T);
                jzSetExpr(jzXf(T, 'ADBE Opacity'), E + '90*e');
                jzSetExpr(jzXf(T, 'ADBE Position'), E + '[value[0],value[1]+(1-e)*' + jzN(cap * 1.5) + ']');
            }
        }
        return bb;
    }
});

/* ================================================================ 23 kanjiFocus — 一字強調 */
// the first kanji as a huge faint glyph behind (slowly settling), the whole lyric small over it with that glyph in
// the accent colour, an emphasis dot above it and a hairline that draws under the lyric
function lb2_isSmallKana(ch) { return 'ぁぃぅぇぉっゃゅょゎァィゥェォッャュョヮヵヶ'.indexOf(ch) >= 0; }
jzReg('layout', 'kanjiFocus', {
    plan: function (rng, cut, st) {
        return { font: rng.pick(jzFontsOf(st, ['display', 'serif'])), fs: rng.pick(jzFontsOf(st, ['serif', 'display', 'body'])), mode: rng.pick(['dim', 'outline', 'tint']), pos: rng.pick(['center', 'side', 'side']), low: rng.chance(0.45), dots: rng.chance(0.7), dir: rng.pick([1, -1]) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, M = jzU(ctx), u = ctx.u, port = W < H, i;
        var font = jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'display')), fsF = jzP(ctx, 'fs', jzFontKeyOf(ctx.st, 'serif')), mode = jzP(ctx, 'mode', 'dim'), dir = jzP(ctx, 'dir', 1) < 0 ? -1 : 1;
        var raw = jzTrim(c.text), chs = jzChars(raw), fi = -1;
        for (i = 0; i < chs.length && fi < 0; i++) if (jzIsKanji(chs[i])) fi = i;
        for (i = 0; i < chs.length && fi < 0; i++) if (jzTrim(chs[i]) && !jzIsPunct(chs[i]) && !lb2_isSmallKana(chs[i])) fi = i;
        if (fi < 0) fi = 0;
        var fch = chs[fi] || raw;
        var big = port ? W * 1.05 : H * 1.02, side = !port && jzP(ctx, 'pos', 'center') === 'side';
        var bx = side ? W / 2 + dir * W * 0.2 : W / 2, HD = lb2_HD(ctx);
        var bo = { font: font, size: big, x: bx, y: H / 2, name: 'focus glyph' }, bop = 13;
        if (mode === 'tint') { bo.color = sc.accent; bop = 22; }
        else if (mode === 'outline') { bo.fill = false; bo.stroke = Math.max(1.2 * u, big * 0.004); bo.strokeColor = sc.sub; bop = 70; }
        else bo.color = sc.fg;
        var B = lb2_ng(jzText(ctx, fch, bo));      // faint = bright colour at low opacity; ghost: false in the browser
        jzSetExpr(jzXf(B, 'ADBE Scale'), HD + 'var s=(1.08-0.08*oc(time/' + jzN(Math.max(0.5, c.dur)) + '))*(1+0.04*ic(PO));[value[0]*s,value[1]*s]');
        jzSetExpr(jzXf(B, 'ADBE Opacity'), HD + jzN(bop) + '*oc(time/0.8)*K');
        // the lyric
        var mt = lb2_lines(ctx, raw, 16, 8), lines = mt.split('\r');
        var lx = side ? W / 2 - dir * W * 0.12 : W / 2, ly = jzP(ctx, 'low', false) ? H * 0.74 : H / 2;
        var L = lb2_txt(ctx, mt, { font: fsF, size: 100, color: sc.fg, x: lx, y: ly, track: 0.14, lead: 1.5, maxW: side ? W * 0.44 : W * 0.7, maxH: H * 0.2, maxSize: M * 0.075 });
        var size = jzFontSize(L), gl = jzGlyphs(mt), gi = -1;
        for (i = 0; i < gl.length && gi < 0; i++) if (gl[i] === fch) gi = i;
        if (gi >= 0) { var fl = []; for (i = 0; i < gl.length; i++) fl.push(i === gi); jzCharColors(L, sc.accent, fl, 'JZ Focus'); }
        jzAnimate(ctx, L, { mi: 0 });
        var bb = jzBB(L);
        if (gi >= 0 && jzP(ctx, 'dots', true)) {        // emphasis dot above the focus glyph
            var acc = 0, li = 0, ci = 0;
            for (i = 0; i < lines.length; i++) { var n = jzChars(lines[i]).length; if (gi < acc + n) { li = i; ci = gi - acc; break; } acc += n; }
            var lc = jzChars(lines[li]), mo = { font: fsF, size: size, track: 0.14, x: 0, y: 0 };
            var wl = lb2_measure(ctx, lines[li], mo).w, w1 = lb2_measure(ctx, lc.slice(0, ci + 1).join(''), mo).w, w0 = ci > 0 ? lb2_measure(ctx, lc.slice(0, ci).join(''), mo).w + size * 0.14 : 0;
            var gx = lx - wl / 2 + (w0 + w1) / 2, gy = ly + (li - (lines.length - 1) / 2) * size * 1.5;
            var Dt = jzEllipseLayer(ctx, 'focus dot', gx, gy - size * 0.78, size * 0.15, size * 0.15, sc.accent);
            jzSetExpr(jzXf(Dt, 'ADBE Scale'), HD + 'var x=cl((time-0.35)/0.25);var q=x<=0?0:ob(x,2)*K;[value[0]*q,value[1]*q]');
        }
        var y = bb.y1 + size * 0.7, UL = jzShapeLayer(ctx, 'underline', bb.x0, y), gu = jzGrp(UL, 'line');
        jzAddRect(gu, bb.x1 - bb.x0, Math.max(u, M * 0.0013), 0, (bb.x1 - bb.x0) / 2, 0); jzAddFill(gu, sc.sub);
        jzSetExpr(jzXf(UL, 'ADBE Scale'), HD + '[value[0]*oe((time-0.2)/0.6)*K,value[1]]');
        jzXf(UL, 'ADBE Opacity').setValue(60); lb2_ng(UL);
        return bb;
    }
});

/* ================================================================ 24 halfVertical — 縦横混植 */
// the lyric bent into an L: a horizontal arm and a vertical arm (broken at a natural boundary), a thin bracket that
// draws round the outside of the corner (Trim Paths) and an accent square popping on it
jzReg('layout', 'halfVertical', {
    plan: function (rng, cut, st) {
        return { font: rng.pick(jzFontsOf(st, ['display', 'serif'])), shape: rng.pick(['rowCol', 'rowCol', 'colRow']), guide: rng.pick(['bracket', 'tick', 'bracket']) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, M = jzU(ctx), u = ctx.u, port = W < H, i, k;
        var font = jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'display')), rowCol = jzP(ctx, 'shape', 'rowCol') !== 'colRow';
        var txt = jzTrim(c.text).replace(/[\s　]+/g, ' '), arr = jzChars(txt), n = arr.length;
        // break point: near the target share, at a chunk boundary / space, never before small kana or punctuation
        var tgt = n * (port ? (rowCol ? 0.38 : 0.62) : (rowCol ? 0.6 : 0.4)), segB = {}, pos = 0, ch = jzChunk(txt);
        for (i = 0; i < ch.length; i++) { while (pos < n && (arr[pos] === ' ')) pos++; pos += jzChars(ch[i]).length; segB[pos] = 1; }
        var cutAt = Math.max(1, Math.round(tgt)), bs = -1e9;
        for (k = 1; k < n; k++) {
            var pa = arr[k - 1], pb = arr[k], s0 = -Math.abs(k - tgt) * 1.2;
            if (segB[k]) s0 += 2;
            if (pa === ' ' || pb === ' ') s0 += 3;
            if (lb2_isSmallKana(pb) || jzIsPunct(pb) || pb === 'ー') s0 -= 8;
            if (lb2_isSmallKana(pa)) s0 -= 3;
            if (jzIsHira(pa) && !jzIsHira(pb)) s0 += 1.5;
            if (s0 > bs) { bs = s0; cutAt = k; }
        }
        var A = jzTrim(arr.slice(0, cutAt).join('')) || arr[0] || txt, B = jzTrim(arr.slice(cutAt).join(''));
        var tr = 0.06, nA = jzCount(A), nB = jzCount(B);
        var latA = !rowCol && lb2_isLatinStr(A), latB = rowCol && B && lb2_isLatinStr(B);     // vertical latin arm = a line turned 90 deg
        var wA = (rowCol || latA) ? lb2_measure(ctx, A, { font: font, size: 100, track: tr }).w : (nA * 1.06 - 0.06) * 100;
        var wB = B ? ((!rowCol || latB) ? lb2_measure(ctx, B, { font: font, size: 100, track: tr }).w : (nB * 1.06 - 0.06) * 100) : 0;
        var wU = rowCol ? wA / 100 : 1.25 + wB / 100, hU = rowCol ? 1.25 + wB / 100 : wA / 100;
        var size = Math.min(W * 0.82 / wU, H * 0.8 / hU, M * 0.26), x0 = W / 2 - wU * size / 2, y0 = H / 2 - hU * size / 2;
        var bb = null, corner, LA, LB;
        if (rowCol) {
            LA = jzText(ctx, A, { font: font, size: size, color: sc.fg, x: x0, y: y0 + size / 2, align: 'left', track: tr });
            var lastX = x0 + jzSize(LA)[0] - (jzIsLatin(arr[cutAt - 1] || '') ? jzSize(LA)[0] / Math.max(1, nA) / 2 : size * 0.45);
            jzAnimate(ctx, LA, { mi: 0 }); bb = jzBB(LA);
            if (B) {
                if (latB) { LB = jzText(ctx, B, { font: font, size: size, color: sc.fg, x: lastX, y: 0, track: tr, rot: 90 }); jzXf(LB, 'ADBE Position').setValue([lastX, y0 + size * 1.25 + jzSize(LB)[0] / 2]); }
                else { LB = jzText(ctx, jzVertical(B), { font: font, size: size, color: sc.fg, x: lastX, y: 0, leading: size * (1 + tr) }); lb2_top(LB, lastX, y0 + size * 1.25); }
                jzAnimate(ctx, LB, { mi: 3 });
                bb = jzUnion(bb, { x0: lastX - size / 2, x1: lastX + size / 2, y0: y0 + size * 1.25, y1: y0 + hU * size, cx: lastX, cy: y0 + size * 1.25 + (hU - 1.25) * size / 2 });
            }
            corner = [lastX, y0 + size / 2];
        } else {
            var lastY;
            if (latA) { LA = jzText(ctx, A, { font: font, size: size, color: sc.fg, x: x0 + size / 2, y: 0, track: tr, rot: 90 }); jzXf(LA, 'ADBE Position').setValue([x0 + size / 2, y0 + jzSize(LA)[0] / 2]); lastY = y0 + jzSize(LA)[0] - size * 0.3; }
            else { LA = jzText(ctx, jzVertical(A), { font: font, size: size, color: sc.fg, x: x0 + size / 2, y: 0, leading: size * (1 + tr) }); lb2_top(LA, x0 + size / 2, y0); lastY = y0 + (nA - 1) * size * (1 + tr) + size / 2; }
            jzAnimate(ctx, LA, { mi: 0 }); bb = { x0: x0, x1: x0 + size, y0: y0, y1: y0 + hU * size, cx: x0 + size / 2, cy: y0 + hU * size / 2 };
            if (B) { LB = jzText(ctx, B, { font: font, size: size, color: sc.fg, x: x0 + size * 1.25, y: lastY, align: 'left', track: tr }); jzAnimate(ctx, LB, { mi: 3 }); bb = jzUnion(bb, jzBB(LB)); }
            corner = [x0 + size / 2, lastY];
        }
        var g = size * 0.42, lw = Math.max(1.2 * u, M * 0.0016), HD = lb2_HD(ctx);
        if (jzP(ctx, 'guide', 'bracket') === 'bracket') {
            var pts = rowCol ? [[x0 - g * 0.3, y0 - g * 0.55], [corner[0] + size / 2 + g * 0.55, y0 - g * 0.55], [corner[0] + size / 2 + g * 0.55, y0 + hU * size + g * 0.3]]
                : [[x0 - g * 0.55, y0 - g * 0.3], [x0 - g * 0.55, corner[1] + size / 2 + g * 0.55], [x0 + wU * size + g * 0.3, corner[1] + size / 2 + g * 0.55]];
            var G = lb2_ng(lb2_poly(ctx, 'corner bracket', pts, null, sc.sub, lw));
            jzAddTrimPaths(G.property('ADBE Root Vectors Group').property(1), HD + '100*oc((time-0.15)/0.7)*K');
            jzXf(G, 'ADBE Opacity').setValue(80);
        }
        var cs = size * 0.12, px = rowCol ? corner[0] + size / 2 + g * 0.55 : x0 - g * 0.55, py = rowCol ? y0 - g * 0.55 : corner[1] + size / 2 + g * 0.55;
        var Q = jzRectLayer(ctx, 'corner square', px, py, cs, cs, sc.accent);
        jzSetExpr(jzXf(Q, 'ADBE Scale'), HD + 'var x=cl((time-0.3)/0.25);var q=x<=0?0:ob(x,2)*K;[value[0]*q,value[1]*q]');
        return bb;
    }
});

/* ================================================================ 25 curtain — 幕 */
// theatre curtain over the lyric: two side panels (with a bowing inner edge, pleats and tie-backs), a top/bottom
// shutter (with a small line/time label) or a rising curtain with a scalloped valance; opens after the cut starts,
// closes again on the exit. Panels are shape layers moved by Position expressions.
jzReg('layout', 'curtain', {
    plan: function (rng, cut, st) {
        return { font: rng.pick(jzFontsOf(st, ['display', 'serif'])), variant: rng.pick(['side', 'side', 'shutter', 'rise']), col: rng.pick(['velvet', 'velvet', 'accent', 'ink']), drape: rng.chance(0.7), pleats: rng.chance(0.75) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, M = jzU(ctx), u = ctx.u, i;
        var font = jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'display')), variant = jzP(ctx, 'variant', 'side'), colK = jzP(ctx, 'col', 'velvet'), drape = !!jzP(ctx, 'drape', true), pleats = !!jzP(ctx, 'pleats', true);
        var mt = lb2_lines(ctx, c.text, 10, 5), t0 = 0.02, T = jzClamp(c.dur * 0.16, 0.22, 0.48);
        var L = lb2_txt(ctx, mt, { font: font, size: 100, color: sc.fg, x: W / 2, y: H / 2, track: 0.05, lead: 1.15, maxW: W * (drape && variant === 'side' ? 0.7 : 0.8), maxH: H * (variant === 'shutter' ? 0.34 : 0.44), maxSize: H * 0.2 });
        jzAnimate(ctx, L, { mi: lb2_miAt(ctx, t0 + T * 0.25) });
        var dark = jzRelLum(sc.bg) < 0.45;
        var panel = colK === 'velvet' ? jzMixHex(sc.bg, sc.accent, dark ? 0.38 : 0.6) : lb2_plateCol(sc, colK === 'accent' ? [sc.accent, sc.ink] : [sc.ink, sc.accent]);
        var shade = jzMixHex(panel, sc.bg, 0.22), lite = jzMixHex(panel, lb2_onCol(sc, panel), 0.12), lw = Math.max(u, M * 0.002);
        var OP = lb2_HD(ctx) + 'var op=ioc((time-' + jzN(t0) + ')/' + jzN(T) + ')*(1-ioc(PO));';
        function pleatGrp(S, x, xExpr, y, h, k) {
            var g = jzGrp(S, 'pleat ' + k); jzAddRect(g, lw * 3, h); jzAddFill(g, k % 2 ? shade : lite, 55);
            if (xExpr) jzGX(g).property('ADBE Vector Position').expression = OP + '[' + xExpr + ',' + jzN(y) + ']'; else jzGX(g).property('ADBE Vector Position').setValue([x, y]);
        }
        if (variant === 'side') {
            var rest = drape ? W * 0.075 : -W * 0.02, tie = sc.accent === panel ? sc.fg : sc.accent;
            for (var sd = -1; sd <= 1; sd += 2) {           // -1 = left panel (inner edge at layer x 0, panel towards -x)
                var P = lb2_ng(jzShapeLayer(ctx, sd < 0 ? 'curtain left' : 'curtain right', W / 2, 0));
                var XE = sd < 0 ? '(' + jzN(W / 2) + '+' + jzN(rest - W / 2) + '*op)' : '(' + jzN(W / 2) + '+' + jzN(W / 2 - rest) + '*op)';
                jzSetExpr(jzXf(P, 'ADBE Position'), OP + '[' + XE + ',value[1]]');
                if (drape) {
                    var gt = jzGrp(P, 'tie-back'); jzAddRect(gt, W * 0.012 + 2, H * 0.018, 0, sd < 0 ? -W * 0.006 + 1 : W * 0.006 - 1, H * 0.62 + H * 0.009); jzAddFill(gt, tie);
                    jzGX(gt).property('ADBE Vector Group Opacity').expression = OP + '100*cl((op-0.5)*2)';
                }
                if (pleats) for (i = 1; i < 7; i++) pleatGrp(P, 0, sd < 0 ? '-' + XE + '*' + jzN(1 - i / 7) : '(' + jzN(W) + '-' + XE + ')*' + jzN(i / 7), H / 2, H, i);
                var gbul = jzGrp(P, 'bulge'); jzAddPath(gbul, [[0, -5], [-sd * W * 0.02, H * 0.5], [0, H + 5]], true); jzAddFill(gbul, panel);
                jzGX(gbul).property('ADBE Vector Scale').expression = OP + '[100*Math.sin(Math.PI*cl(op)),100]';
                var gp = jzGrp(P, 'panel'); jzAddRect(gp, W * 0.6 + 10, H + 10, 0, sd * (W * 0.3 + 5), H / 2); jzAddFill(gp, panel);
            }
        } else if (variant === 'shutter') {
            var rs = drape ? H * 0.12 : -H * 0.02;
            var YT = '(' + jzN(H / 2) + '+' + jzN(rs - H / 2) + '*op)', YB = '(' + jzN(H / 2) + '+' + jzN(H / 2 - rs) + '*op)';
            for (var sh = -1; sh <= 1; sh += 2) {
                var PS = lb2_ng(jzShapeLayer(ctx, sh < 0 ? 'shutter top' : 'shutter bottom', 0, H / 2)), gs = jzGrp(PS, 'panel');
                jzAddRect(gs, W + 10, H * 0.6 + 10, 0, W / 2, sh * (H * 0.3 + 5)); jzAddFill(gs, panel);
                jzSetExpr(jzXf(PS, 'ADBE Position'), OP + '[value[0],' + (sh < 0 ? YT : YB) + ']');
            }
            if (drape) {
                var fs = jzClamp(H * 0.018, 11 * u, 22 * u);
                var LB = jzText(ctx, jzLineNo(ctx) + ' ／ ' + jzFmtTime(c.start || 0), { font: jzMonoF(ctx), size: fs, color: lb2_onCol(sc, panel), x: W * 0.05, y: rs / 2, align: 'left', track: 0.3 });
                jzSetExpr(jzXf(LB, 'ADBE Position'), OP + '[value[0],' + YT + '/2]');
                jzSetExpr(jzXf(LB, 'ADBE Opacity'), OP + '100*cl((op-0.9)*10)'); lb2_ng(LB);
            }
        } else {
            // rising curtain with a scalloped valance: the panel's bottom edge rides on the layer position
            var rr = drape ? H * 0.1 : -H * 0.05, m = 9, sw = W / m, dip = H * 0.035;
            var PR = lb2_ng(jzShapeLayer(ctx, 'curtain', 0, H + 5)), pts = [[-5, -H - 10], [W + 5, -H - 10], [W + 5, 0]];
            for (i = m; i >= 0; i--) { pts.push([i * sw, 0]); if (i > 0) pts.push([i * sw - sw / 2, dip]); }
            pts.push([-5, 0]);
            if (pleats) for (i = 1; i < 7; i++) pleatGrp(PR, W * i / 7, null, -H / 2 - 5, H + 10, i);
            var gr = jzGrp(PR, 'panel'); jzAddPath(gr, pts, true); jzAddFill(gr, panel);
            jzSetExpr(jzXf(PR, 'ADBE Position'), OP + '[value[0],' + jzN(H + 5) + '+' + jzN(rr - H - 5) + '*op]');
        }
        // (the panels are kept out of the cut's time-shifted ghost copies — the browser draws no ghosts here — so they leave
        // no coloured trails while they move)
        return jzBB(L);
    }
});

/* ================================================================ 26 equalizer — イコライザー */
// one bar per glyph (+ thin spectrum bars between) driven by an expression level = noise + a decaying pulse every
// `tempo` s (a sin-hash, not random(): AE seeds random() per property, and bar / cap / text must agree); each glyph is parented to its bar layer, so it rides on the bar top; bars / blocks / mirror styles, peak caps
function lb2_eqLevel(ctx, tempo) {
    return 'var TP=' + jzN(tempo) + ',SD2=' + ((ctx.cut.seed || 1) % 9973) + ';function lv(x,t){var v=0.5+0.5*noise([t*3.1+x*0.83,SD2*0.37]);v=0.25+0.6*v;var k=Math.floor(t/TP),ph=t-k*TP;' +
        'var hs=Math.sin(k*127.1+Math.round(x*3)*311.7+SD2*0.713)*43758.5453;var pu=Math.exp(-ph*7)*(0.3+0.7*(hs-Math.floor(hs)));v=v*0.75+pu*0.45;return Math.max(0.06,Math.min(1,v));}';
}
// bar groups drawn downward from the bar top (group origin = top); HE defines h; oy = extra y expression for the origin
function lb2_eqBar(S, HE, ox, oy, w, col, alpha, o) {
    var g, pre = function (y) { return HE + '[' + jzN(ox) + ',' + oy + '+' + y + ']'; };
    if (o.style === 'blocks') {
        var parts = [[col, 0, 'Math.min(' + o.kA + ',Math.floor(h/' + jzN(o.seg) + '))'], [o.colB, o.kA, 'Math.max(0,Math.floor(h/' + jzN(o.seg) + ')-' + o.kA + ')']];
        for (var q = 0; q < 2; q++) {
            g = jzGrp(S, q ? 'blocks top' : 'blocks');
            jzAddRect(g, w, o.seg - o.gap, 0, 0, -(parts[q][1] + 0.5) * o.seg); jzAddFill(g, parts[q][0], alpha * 100);
            var rp = jzVecs(g).addProperty('ADBE Vector Filter - Repeater');
            rp.property('ADBE Vector Repeater Copies').expression = HE + parts[q][2];
            rp.property('ADBE Vector Repeater Transform').property('ADBE Vector Repeater Position').setValue([0, -o.seg]);
            jzGX(g).property('ADBE Vector Position').expression = pre('h');
        }
    } else {
        // (each rect is configured before its fill is added: adding a sibling invalidates the rect reference)
        g = jzGrp(S, 'bar'); var r = jzAddRect(g, w, 10);
        r.property('ADBE Vector Rect Size').expression = HE + '[value[0],Math.max(0,h)]';
        jzAddFill(g, col, alpha * 100);
        jzGX(g).property('ADBE Vector Position').expression = pre('h/2');
        if (o.style === 'mirror') {
            var gm = jzGrp(S, 'reflection'), rm = jzAddRect(gm, w, 10);
            rm.property('ADBE Vector Rect Size').expression = HE + '[value[0],Math.max(0,h*0.35)]';
            jzAddFill(gm, col, alpha * 22);
            jzGX(gm).property('ADBE Vector Position').expression = pre('h+' + jzN(o.lw * 2) + '+h*0.175');
        }
    }
}
jzReg('layout', 'equalizer', {
    plan: function (rng, cut, st) {
        return { font: rng.pick(jzFontsOf(st, ['display'])), style: rng.pick(['bars', 'blocks', 'blocks', 'mirror']), thin: rng.pick([0, 2, 3]), peaks: rng.chance(0.7), col: rng.pick(['accent', 'accent', 'duo', 'fg']), tempo: rng.range(0.42, 0.55) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, M = jzU(ctx), u = ctx.u, i, j, r, q;
        var chs = jzChars(jzTrim(c.text).replace(/[\s　]+/g, ' ')), n = chs.length;
        var font = jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'display')), style = jzP(ctx, 'style', 'blocks'), thin = Math.round(jzP(ctx, 'thin', 2)), peaks = !!jzP(ctx, 'peaks', true), colK = jzP(ctx, 'col', 'accent');
        var rows = W < H && n > 6 ? 2 : 1, per = Math.ceil(n / rows), sw = W * 0.86 / per;
        var size = Math.min(sw * 0.78, H * (rows > 1 ? 0.1 : 0.14)), bw = Math.min(sw * 0.6, size * 1.15);
        var colA = lb2_plateCol(sc, [sc.accent, sc.fg]), colB = lb2_plateCol(sc, [sc.accent2, sc.sub, sc.fg]), lw = Math.max(u, M * 0.0016);
        var HD = lb2_HD(ctx) + lb2_eqLevel(ctx, jzP(ctx, 'tempo', 0.5)) + 'var e=oe(time/0.45);';
        var bb = null, pkH = Math.max(3 * u, sw * 0.05), pkOff = peaks ? sw * 0.1 : 0, seg = Math.max(4 * u, sw * 0.14);
        for (r = 0; r < rows; r++) {
            var cnt = Math.min(per, n - r * per); if (cnt <= 0) break;
            var yb = rows > 1 ? (r ? H * 0.84 : H * 0.47) : H * 0.74, hmax = (rows > 1 ? H * 0.26 : H * 0.44) - size * 0.4, x0 = W / 2 - cnt * sw / 2;
            var bo = { style: style, seg: seg, gap: seg * 0.28, kA: Math.floor(hmax / seg * 0.72) + 1, colB: colB, lw: lw };
            // base line
            var BL = lb2_ng(jzShapeLayer(ctx, 'eq base', x0 - sw * 0.2, yb)), gl = jzGrp(BL, 'line');
            jzAddRect(gl, cnt * sw + sw * 0.4, lw, 0, (cnt * sw + sw * 0.4) / 2, 0); jzAddFill(gl, sc.sub);
            jzSetExpr(jzXf(BL, 'ADBE Scale'), HD + '[value[0]*e,value[1]]');
            jzSetExpr(jzXf(BL, 'ADBE Opacity'), HD + '70*K');
            // thin spectrum bars
            if (thin > 0) {
                var TS = lb2_ng(jzShapeLayer(ctx, 'eq spectrum', 0, 0));
                for (j = 0; j < cnt; j++) for (q = 1; q <= thin; q++) {
                    var xi = j + q / (thin + 1);
                    var HT = HD + 'var h=' + jzN(hmax * 0.8) + '*lv(' + jzN(xi + r * 7 + 0.5) + ',time)*e*K;';
                    lb2_eqBar(TS, HT, x0 + xi * sw, '(' + jzN(yb) + '-h)', sw * 0.06, sc.sub, 0.55, bo);
                }
            }
            for (j = 0; j < cnt; j++) {
                i = r * per + j;
                if (chs[i] === ' ') continue;
                var x = x0 + (j + 0.5) * sw, X = jzN(j + 0.5 + r * 7);
                var HB = HD + 'var h=' + jzN(hmax) + '*lv(' + X + ',time)*e*K;';
                var col = colK === 'duo' ? (j % 2 ? colB : colA) : colK === 'fg' ? sc.fg : colA;
                var BR = lb2_ng(jzShapeLayer(ctx, 'eq bar ' + (i + 1), x, yb));
                jzSetExpr(jzXf(BR, 'ADBE Position'), HB + '[value[0],value[1]-h]');
                if (peaks) {
                    var gp = jzGrp(BR, 'peak'); jzAddRect(gp, bw, pkH); jzAddFill(gp, sc.fg);
                    var PK = HB + 'var pk=0;for(var k=0;k<6;k++){var tau=k*0.1;pk=Math.max(pk,lv(' + X + ',time-tau)-tau*0.55);}var ph=' + jzN(hmax) + '*pk*e*K;';
                    jzGX(gp).property('ADBE Vector Position').expression = PK + '[0,h-ph-' + jzN(sw * 0.04 + pkH / 2) + ']';
                    jzGX(gp).property('ADBE Vector Group Opacity').expression = PK + '90*e*K';
                }
                lb2_eqBar(BR, HB, 0, '0', bw, col, colK === 'fg' ? 0.35 : 0.9, bo);
                var T = jzText(ctx, chs[i], { font: font, size: size, color: sc.fg, x: x, y: yb - size * 0.62 - pkOff });
                T.parent = BR;
                jzAnimate(ctx, T, { mi: i });
            }
            bb = jzUnion(bb, { x0: x0, x1: x0 + cnt * sw, y0: yb - hmax * 0.7 - size * 1.2, y1: yb, cx: W / 2, cy: yb - hmax * 0.35 });
        }
        return bb;
    }
});

/* ================================================================ 27 tape — テープ */
// strips of tape with torn ends (shape polygons, faint stripes, edge shading) that unroll from their left end — a
// layer mask whose Mask Expansion grows with time clips the strip and the text on it; stack / single / cross + a label piece
function lb2_tapeStrip(ctx, o) {
    var h = o.h, L = o.L, tooth = h * 0.09, m = 7, i, s = ctx.cut.seed || 1, pts = [[-L / 2, -h / 2], [L / 2, -h / 2]];
    for (i = 1; i <= m; i++) pts.push([L / 2 + (i % 2 ? tooth : -tooth * 0.3) * (0.6 + 0.8 * jzR(s, o.k, i, 1)), -h / 2 + h * i / m]);
    pts.push([-L / 2, h / 2]);
    for (i = m - 1; i >= 1; i--) pts.push([-L / 2 + (i % 2 ? -tooth : tooth * 0.3) * (0.6 + 0.8 * jzR(s, o.k, i, 2)), -h / 2 + h * i / m]);
    var S = lb2_ng(jzShapeLayer(ctx, o.name || 'tape', o.x, o.y)), g;
    jzXf(S, 'ADBE Rotate Z').setValue(o.ang);
    var edge = o.dark ? '#000000' : '#FFFFFF';
    g = jzGrp(S, 'edges'); jzAddRect(g, L, h * 0.08, 0, 0, -h / 2 + h * 0.04); jzAddRect(g, L, h * 0.08, 0, 0, h / 2 - h * 0.04); jzAddFill(g, edge, 12);
    if (o.lines) { g = jzGrp(S, 'stripes'); for (i = 1; i < 6; i++) jzAddRect(g, L, Math.max(ctx.u, h * 0.012), 0, 0, -h / 2 + h * i / 6); jzAddFill(g, lb2_onCol(ctx.sc, o.col), 7); }
    g = jzGrp(S, 'tape'); jzAddPath(g, pts, true); jzAddFill(g, jzMixHex(ctx.sc.bg, o.col, 0.9));     // opaque (the browser's 90 %): no ghost shows through
    lb2_tapeClip(ctx, S, -L / 2, 0, h, o);
    jzSetExpr(jzXf(S, 'ADBE Opacity'), lb2_tapeU(ctx, o) + 'u>0?100*K:0');
    return S;
}
function lb2_tapeU(ctx, o) { return lb2_HD(ctx) + 'var u=oc((time-' + jzN(o.t0) + ')/' + jzN(o.dur) + '),VL=' + jzN(o.L) + '*u;'; }
// unrolling clip in layer space (browser: clip rect from -h to -h + L*u in strip coords): a rectangle whose right edge
// starts one strip-height left of the strip's left end (lx) and grows by Mask Expansion
function lb2_tapeClip(ctx, Ly, lx, cy, h, o) {
    var mk = jzMaskRect(Ly, lx - h * 5, cy - h * 3, lx - h, cy + h * 3);
    jzSetExpr(mk.property('ADBE Mask Offset'), lb2_tapeU(ctx, o) + 'u>=1?10000:VL');
    return mk;
}
// text riding on a strip, clipped by the same unroll
function lb2_tapeText(ctx, str, o, T) {
    var X = jzText(ctx, str, T), r = jzRect(X), ax = r.left + r.width / 2, ay = r.top + r.height / 2;
    jzXf(X, 'ADBE Rotate Z').setValue(o.ang);
    lb2_tapeClip(ctx, X, ax - o.L / 2, ay, o.h, o);
    return X;
}
jzReg('layout', 'tape', {
    plan: function (rng, cut, st) {
        var n = cut.n, port = cut.H > cut.W;
        return { font: rng.pick(jzFontsOf(st, ['display', 'body'])), fs: rng.pick(jzFontsOf(st, ['body', 'serif'])),
            variant: n > 9 || (port && n > 5) ? rng.pick(['stack', 'stack', 'single']) : rng.pick(['single', 'cross', 'stack']),
            ang: rng.range(4, 11) * rng.pick([1, -1]), col: rng.pick(['accent', 'ink', 'accent']), piece: rng.chance(0.75), lines: rng.chance(0.6) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, M = jzU(ctx), u = ctx.u, s = c.seed || 1, port = W < H, i, k;
        var font = jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'display')), fsF = jzP(ctx, 'fs', jzFontKeyOf(ctx.st, 'body')), variant = jzP(ctx, 'variant', 'single');
        var ang = jzP(ctx, 'ang', 6), colK = jzP(ctx, 'col', 'accent'), lines = !!jzP(ctx, 'lines', true), dark = jzRelLum(sc.bg) < 0.45;
        var tapeC = lb2_plateCol(sc, colK === 'accent' ? [sc.accent, sc.ink] : [sc.ink, sc.accent]);
        var tapeC2 = colK === 'accent' ? lb2_plateCol(sc, [sc.ink, sc.fg]) : lb2_plateCol(sc, [sc.accent, sc.fg]);
        var noHold = lb2_plateHold(ctx), txt = jzTrim(c.text), bb = null;
        if (variant === 'stack') {
            var parts = [], src = c.words && c.words.length > 1 ? c.words : [txt];
            for (i = 0; i < src.length; i++) if (jzTrim(src[i])) parts.push(jzTrim(src[i]));
            if (parts.length > 4) { k = Math.ceil(parts.length / 4); var qq = []; for (i = 0; i < parts.length; i += k) qq.push(parts.slice(i, i + k).join('')); parts = qq; }
            if (parts.length <= 1 && jzCount(txt) > (port ? 5 : 9)) parts = jzSplitLines(txt, Math.ceil(jzCount(txt) / 2)).split('\r');
            if (!parts.length) parts = [txt];
            var np = parts.length, longest = 1;
            for (i = 0; i < np; i++) longest = Math.max(longest, lb2_measure(ctx, parts[i], { font: font, size: 100, track: 0.05 }).w / 100);
            var size = Math.min(W * 0.72 / longest, H * 0.62 / (np * 1.75), M * 0.17), h = size * 1.5;
            for (i = 0; i < np; i++) {
                var Lp = lb2_measure(ctx, parts[i], { font: font, size: size, track: 0.05 }).w + size * 1.2;
                var y = H / 2 + (i - (np - 1) / 2) * h * 1.12, x = W / 2 + (jzR(s, i, 3) * 2 - 1) * W * 0.05;
                var col = i % 3 === 1 ? tapeC2 : tapeC;
                var o = { x: x, y: y, ang: (i % 2 ? -1 : 1) * Math.abs(ang) * 0.45 + (jzR(s, i, 4) * 2 - 1) * 1.5, L: Lp, h: h, col: col, k: i, t0: 0.03 + i * 0.12, dur: 0.3, lines: lines, dark: dark, name: 'tape ' + (i + 1) };
                lb2_tapeStrip(ctx, o);
                var TX = lb2_tapeText(ctx, parts[i], o, { font: font, size: size, color: lb2_onCol(sc, col), x: x, y: y, track: 0.05 });
                jzAnimate(ctx, TX, { mi: lb2_miAt(ctx, 0.05 + i * 0.12), noHold: noHold });
                bb = jzUnion(bb, { x0: x - Lp / 2, x1: x + Lp / 2, y0: y - h / 2, y1: y + h / 2, cx: x, cy: y });
            }
            return bb;
        }
        var mt = lb2_lines(ctx, txt, 11, 6), nL = mt.split('\r').length;
        var mm = lb2_measure(ctx, mt, { font: font, size: 100, track: 0.05, lead: 1.15, x: W / 2, y: H / 2, maxW: W * 0.7, maxH: H * 0.3, maxSize: H * 0.17 }), sz = mm.size;
        var Lm = mm.w + sz * 1.6, hm = sz * (nL * 1.15 - 0.15) + sz * 0.75;
        if (variant === 'cross') {
            var unit = jzTrim(String(c.lineText || c.text).replace(/\s+/g, ' ')), fs = hm * 0.26;
            var L2 = Math.min(Math.sqrt(W * W + H * H) * 0.9, lb2_measure(ctx, unit, { font: fsF, size: fs, track: 0.1 }).w * 1.3 + fs * 6);
            var oc = { x: W / 2 + Lm * 0.15, y: H / 2 + hm * 0.1, ang: -ang * 2.4, L: L2, h: hm * 0.5, col: tapeC2, k: 9, t0: 0, dur: 0.4, lines: lines, dark: dark, name: 'tape cross' };
            lb2_tapeStrip(ctx, oc);
            var CT = lb2_tapeText(ctx, unit, oc, { font: fsF, size: fs, color: lb2_onCol(sc, tapeC2), x: oc.x, y: oc.y, track: 0.1 });
            jzSetExpr(jzXf(CT, 'ADBE Opacity'), lb2_tapeU(ctx, oc) + 'u>0?100*K:0'); lb2_ng(CT);
        }
        var om = { x: W / 2, y: H / 2, ang: ang, L: Lm, h: hm, col: tapeC, k: 0, t0: 0.06, dur: 0.34, lines: lines, dark: dark, name: 'tape' };
        lb2_tapeStrip(ctx, om);
        var TM = lb2_tapeText(ctx, mt, om, { font: font, size: sz, color: lb2_onCol(sc, tapeC), x: W / 2, y: H / 2, track: 0.05, leading: sz * 1.15 });
        jzAnimate(ctx, TM, { mi: lb2_miAt(ctx, 0.1), noHold: noHold });
        if (jzP(ctx, 'piece', true)) {
            var ph = hm * 0.42, pl = ph * 2.6, ex = W / 2 + Math.cos(ang * Math.PI / 180) * Lm * 0.5, ey = H / 2 + Math.sin(ang * Math.PI / 180) * Lm * 0.5;
            var rom = lb2_roma(txt), lab = rom ? rom.substr(0, 12) : 'No.' + jzLineNo(ctx);
            var op = { x: ex - ph * 0.3, y: ey - ph * 0.4, ang: ang - 38 * (ang < 0 ? -1 : 1), L: pl, h: ph, col: tapeC2, k: 5, t0: 0.32, dur: 0.18, lines: lines, dark: dark, name: 'tape piece' };
            lb2_tapeStrip(ctx, op);
            var PT = lb2_tapeText(ctx, lab, op, { font: jzMonoF(ctx), size: Math.min(ph * 0.34, pl * 0.7 / Math.max(3, lab.length) * 1.6), color: lb2_onCol(sc, tapeC2), x: op.x, y: op.y, track: 0.12 });
            jzSetExpr(jzXf(PT, 'ADBE Opacity'), lb2_tapeU(ctx, op) + 'u>0?100*K:0'); lb2_ng(PT);
        }
        return { x0: W / 2 - Lm / 2, x1: W / 2 + Lm / 2, y0: H / 2 - hm / 2, y1: H / 2 + hm / 2, cx: W / 2, cy: H / 2 };
    }
});
