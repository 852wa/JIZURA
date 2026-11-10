// ================================================================ pack x2typoA part 2 (AE port of src/11p_x2_typoA.js): 10 decor parts + 6 type-only backgrounds
// decor: tzNoteMark tzProgRule tzTrackMarks tzSideCaption tzHeadEnd tzNumStrip tzDotLeader tzEmBox tzCornerNums tzReadCaret
// bg:    tzBgBaseGrid tzBgNumField tzBgColumns tzBgBigDigits tzBgGlyphField tzBgRules
// (helpers: ae/p_x2_typoA1.jsx)
//
// - the browser decor reads the real glyph boxes of the lyric when the layout gives them; the AE layouts return a plain
//   bounding box, so glyph cells are always the browser's fallback: an even grid over the lyric's box (atza_cells).
// - everything is drawn on the main pass only in the browser, so every decor layer is kept out of the ghosts (jzNoGhost).
// - backgrounds live in the cut's wrapper comp (time 0 = cut start): T = song time, BT = time since this background started.

/* ---------------------------------------------------------------- decor helpers */
function atza_FS(ctx) { return Math.max(11, 16 * atza_k(ctx)); }
function atza_MG(ctx) { return Math.round(jzU(ctx) * 0.05); }
function atza_hit(x0, y0, x1, y1, bb, pad) { pad = pad || 0; return !(x1 < bb.x0 - pad || x0 > bb.x1 + pad || y1 < bb.y0 - pad || y0 > bb.y1 + pad); }
function atza_bbok(ctx, bb) {
    if (bb && bb.x1 > bb.x0 && bb.y1 > bb.y0) return { x0: Math.max(bb.x0, -ctx.W * 0.1), x1: Math.min(bb.x1, ctx.W * 1.1), y0: Math.max(bb.y0, -ctx.H * 0.1), y1: Math.min(bb.y1, ctx.H * 1.1) };
    return { x0: ctx.W * 0.35, x1: ctx.W * 0.65, y0: ctx.H * 0.4, y1: ctx.H * 0.6 };
}
// glyph cells of the lyric in reading order: an even grid over the bbox (the browser's fallback). returns { a: [{x,y,w,h}], vert }
function atza_cells(ctx, bb) {
    var out = [], w = bb.x1 - bb.x0, h = bb.y1 - bb.y0, vert = h > w * 1.2, n = jzClamp(jzCount(String((ctx.cut && ctx.cut.text) || '')), 1, 30), best = 1, bv = 1e9, r, i;
    for (r = 1; r <= Math.min(6, n); r++) {
        var a = vert ? w / r : w / Math.ceil(n / r), b = vert ? h / Math.ceil(n / r) : h / r, v = Math.abs(Math.log(a / b));
        if (v < bv - 1e-6) { bv = v; best = r; }
    }
    var per = Math.ceil(n / best);
    for (i = 0; i < n; i++) {
        var p = Math.floor(i / per), q = i % per;
        if (!vert) out.push({ x: bb.x0 + (q + 0.5) * w / per, y: bb.y0 + (p + 0.5) * h / best, w: w / per, h: h / best });
        else out.push({ x: bb.x1 - (p + 0.5) * w / best, y: bb.y0 + (q + 0.5) * h / per, w: w / best, h: h / per });
    }
    return { a: out, vert: vert };
}
// expression helpers: two digits, mm:ss.ff
var ATZA_TFMT = 'function p2(n){n=Math.floor(n);return (n<10?"0":"")+n;}function tf(t){t=Math.max(0,t);return p2(t/60)+":"+p2(t%60)+"."+p2((t%1)*100);}';
// a label typed in from its first glyph: k = number of glyphs shown (expression using textTotal)
function atza_typed(ctx, L, k) { jzAnimator(L, 'JZ Type', [['ADBE Text Opacity', 0]], atza_hd(ctx) + 'textIndex>' + k + '?100:0'); return L; }

/* ================================================================ DECOR */

/* 注記号 — a small reference mark at the lyric's shoulder and the matching footnote line in the margin */
jzReg('decor', 'tzNoteMark', { back: false, build: function (ctx, bb0, d) {
    var bb = atza_bbok(ctx, bb0), W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, u = atza_k(ctx), m = atza_MG(ctx), fs = atza_FS(ctx), hd = atza_hd(ctx), i;
    var mk = ['※', '＊', '†'][(d.v | 0) % 3], num = String(jzClamp(d.n | 0, 1, 3)), ac = atza_acc(sc), ms = fs * 1.9, A = 'cl(ob(cl((time-0.15)/0.35),1.6))';
    var x = bb.x1 + ms * 0.55, y = bb.y0 + ms * 0.15;
    if (x + ms * 1.2 > W - m * 0.5) { x = bb.x1 - ms * 0.6; y = bb.y0 - ms * 0.75; }
    if (y > m * 0.5) {        // the mark pops up to full size, its numeral beside it
        var Mk = atza_label(ctx, mk, x, y, { font: jzBodyF(ctx), size: ms, color: ac, align: 'center', track: 0, op: A + '*K', name: 'note mark' });
        jzSetExpr(jzXf(Mk, 'ADBE Scale'), hd + 'var s=60+40*' + A + ';[s,s]');
        atza_label(ctx, num, x + ms * 0.62, y - ms * 0.22, { size: ms * 0.55, color: ac, align: 'left', track: 0, op: A + '*K', name: 'note number' });
    }
    var note = num + '  ' + jzFmtTime(c.start) + ' — L' + atza_p2((c.line | 0) + 1) + ' / ' + atza_p2(jzCount(String(c.text || '')));
    var nw = atza_tw(note, jzMonoF(ctx), fs * 0.9) + fs * 1.4, right = !!d.right, ys = d.low === false ? [m + fs * 1.4, H - m - fs * 0.5] : [H - m - fs * 0.5, m + fs * 1.4];
    for (i = 0; i < 2; i++) {
        var yF = ys[i], x0 = right ? W - m - nw : m, e = 'oe((time-0.25)/0.6)*K';
        if (atza_hit(x0, yF - fs * 2, x0 + nw, yF + fs, bb, 10 * u)) continue;
        atza_lines(ctx, 'footnote rule', [[[x0, yF - fs * 1.25], [x0 + Math.min(nw, W * 0.16), yF - fs * 1.25]]], sc.sub, { width: Math.max(1, u), alpha: 0.7, trim: hd + '100*' + e, op: 'K' });
        atza_label(ctx, mk, x0 + fs * 0.45, yF, { font: jzBodyF(ctx), size: fs * 0.95, color: ac, align: 'center', track: 0, op: e, name: 'footnote mark' });
        atza_typed(ctx, atza_label(ctx, note, x0 + fs * 1.2, yF, { size: fs * 0.9, alpha: 0.9, op: 'K', name: 'footnote' }), 'Math.floor(textTotal*cl((time-0.3)/0.5))');
        break;
    }
} });

/* 進行罫 — a hairline as long as the lyric; a heavier rule grows along it with the cut's time, a small numeral riding its head */
jzReg('decor', 'tzProgRule', { back: false, build: function (ctx, bb0, d) {
    var bb = atza_bbok(ctx, bb0), W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, u = atza_k(ctx), m = atza_MG(ctx), fs = atza_FS(ctx), hd = atza_hd(ctx), bw = bb.x1 - bb.x0, bh = bb.y1 - bb.y0;
    var horiz = bw >= bh * 0.8, gap = 16 * u + (horiz ? bh : bw) * 0.07, lw = Math.max(1, u), col = d.accent ? atza_acc(sc) : sc.fg, a0, a1, cc, side, mid, half;
    if (horiz) {
        mid = (bb.x0 + bb.x1) / 2; half = Math.max(bw, W * 0.24) / 2; a0 = Math.max(m, mid - half); a1 = Math.min(W - m, mid + half);
        side = d.low === false ? -1 : 1; cc = side > 0 ? bb.y1 + gap : bb.y0 - gap;
        if (cc > H - m - fs * 2 || cc < m + fs * 2) { side = -side; cc = side > 0 ? bb.y1 + gap : bb.y0 - gap; }
        if (cc > H - m * 0.6 || cc < m * 0.6) return;
    } else {
        mid = (bb.y0 + bb.y1) / 2; half = Math.max(bh, H * 0.24) / 2; a0 = Math.max(m, mid - half); a1 = Math.min(H - m, mid + half);
        side = d.right === false ? -1 : 1; cc = side > 0 ? bb.x1 + gap : bb.x0 - gap;
        if (cc > W - m - fs * 3 || cc < m + fs * 3) { side = -side; cc = side > 0 ? bb.x1 + gap : bb.x0 - gap; }
        if (cc > W - m * 0.6 || cc < m * 0.6) return;
    }
    if (!(a1 > a0)) return;
    var pt = function (a, b) { return horiz ? [a, b] : [b, a]; };
    // e: the hairline is drawn; q: the cut's time (linear), the heavy rule follows it
    var t = 5 * u, Q = 'var e=oe(time/0.6),q=cl(time/' + jzN(Math.max(0.3, c.dur - (c.outDur || 0) * 0.5)) + ');';
    var S = jzShapeLayer(ctx, 'progress rule', 0, 0);
    atza_grp(S, 'track', [[pt(a0, cc), pt(a1, cc)]], sc.sub, { width: lw, alpha: 0.45, trim: hd + Q + '100*e' });
    atza_grp(S, 'start', [[pt(a0, cc - t), pt(a0, cc + t)]], sc.sub, { width: lw, alpha: 0.8 });
    atza_grp(S, 'end', [[pt(a1, cc - t), pt(a1, cc + t)]], sc.sub, { width: lw, alpha: 0.8, gop: hd + Q + 'e>0.98?100:0' });
    atza_grp(S, 'progress', [[pt(a0, cc), pt(a1, cc)]], col, { width: Math.max(2, 3 * u), trim: hd + Q + '100*q*e' });
    atza_op(ctx, S, 'K');
    var live = (d.v | 0) % 2, lo = { size: fs, align: horiz ? 'center' : (side > 0 ? 'left' : 'right'), color: sc.fg, op: 'oc((time-0.15)/0.3)*K', name: 'progress readout' };
    var R = horiz ? atza_label(ctx, live ? jzFmtTime(c.start) : '00', a0 + fs, cc + side * fs * 1.25, lo) : atza_label(ctx, live ? jzFmtTime(c.start) : '00', cc + side * fs * 0.9, a0 + fs, lo);
    var AQ = 'var aq=Math.max(' + jzN(a0 + fs) + ',Math.min(' + jzN(a1 - fs) + ',' + jzN(a0) + '+' + jzN(a1 - a0) + '*q*e));';
    jzSetExpr(jzXf(R, 'ADBE Position'), hd + Q + AQ + (horiz ? '[aq,value[1]]' : '[value[0],aq]'));
    atza_srcText(R, hd + Q + (live ? ATZA_TFMT + 'tf(time+' + jzN(c.start || 0) + ')' : 'var v=Math.round(q*100);(v<10?"0":"")+v'));
} });

/* 字送り記号 — under (or beside) the lyric: a short rule per glyph, a caret in every gap and the spacing values in small numerals */
jzReg('decor', 'tzTrackMarks', { back: false, build: function (ctx, bb0, d) {
    var bb = atza_bbok(ctx, bb0), W = ctx.W, H = ctx.H, sc = ctx.sc, u = atza_k(ctx), m = atza_MG(ctx), fs = atza_FS(ctx) * 0.88, hd = atza_hd(ctx), i;
    var CE = atza_cells(ctx, bb), all = CE.a, vert = CE.vert, cells = [], lim = -1e9;
    // one line (or column) of glyphs only: the last one
    for (i = 0; i < all.length; i++) lim = Math.max(lim, vert ? all[i].x : all[i].y);
    for (i = 0; i < all.length; i++) if (vert ? Math.abs(all[i].x - lim) < all[i].w * 0.5 : Math.abs(all[i].y - lim) < all[i].h * 0.5) cells.push(all[i]);
    cells.sort(function (p, q) { return vert ? p.y - q.y : p.x - q.x; });
    var n = cells.length;
    if (!n) return;
    var sz = vert ? cells[0].w : cells[0].h, gap = 12 * u + sz * 0.1, lw = Math.max(1, u), ac = atza_acc(sc), side = vert ? 1 : (d.low === false ? -1 : 1);
    var cc = vert ? bb.x1 + gap : (side > 0 ? bb.y1 + gap : bb.y0 - gap);
    if (!vert && (cc > H - m - fs * 2.4 || cc < m + fs * 2.4)) { side = -side; cc = side > 0 ? bb.y1 + gap : bb.y0 - gap; }
    if (vert && cc > W - m - fs * 3) { side = -1; cc = bb.x0 - gap; }
    if ((vert ? W : H) - cc < m * 0.6 || cc < m * 0.6) return;
    var pt = function (a, b) { return vert ? [b, a] : [a, b]; };
    var lo = function (g) { return vert ? g.y - g.h / 2 : g.x - g.w / 2; }, hi = function (g) { return vert ? g.y + g.h / 2 : g.x + g.w / 2; };
    var t = 4 * u, rules = [], carets = [], vs = [], vp = [];
    for (i = 0; i < n; i++) {
        rules.push([pt(lo(cells[i]) + sz * 0.06, cc), pt(hi(cells[i]) - sz * 0.06, cc)]);
        if (i < n - 1) {
            var gm = (hi(cells[i]) + lo(cells[i + 1])) / 2, v = Math.round((lo(cells[i + 1]) - hi(cells[i])) / sz * 1000);
            carets.push([pt(gm - t, cc + side * t * 1.5), pt(gm, cc), pt(gm + t, cc + side * t * 1.5)]);
            if (n <= 9) { vs.push((v >= 0 ? '+' : '−') + Math.abs(v)); vp.push(vert ? [cc + side * (t * 1.5 + fs * 0.5), gm] : [gm, cc + side * (t * 1.5 + fs)]); }
        }
    }
    var S = jzShapeLayer(ctx, 'tracking marks', 0, 0), e = 'oe((time-0.08)/0.45)*K';
    atza_grp(S, 'glyph rules', rules, sc.sub, { width: lw, alpha: 0.85, trim: hd + '50+50*' + e, start: hd + '50-50*' + e });
    if (carets.length) atza_grp(S, 'carets', carets, ac, { width: lw, gop: hd + '100*cl(oe((time-' + jzN(0.08 + n * 0.015) + ')/0.45)*K)' });
    jzNoGhost(S);
    if (vs.length) { var V = atza_multi(ctx, vs, vp, { size: fs, align: vert ? (side > 0 ? 'left' : 'right') : 'center', track: 0.02, alpha: 0.9, name: 'spacing values' }); atza_multiFade(ctx, V, 'oe((time-0.08-j*0.03)/0.45)*K'); }
    if (n > 9 || n === 1) {
        var span = Math.round((hi(cells[n - 1]) - lo(cells[0])) / u), a = 'oc((time-0.3)/0.3)*K';
        if (!vert) atza_label(ctx, 'W ' + span, lo(cells[0]), cc + side * fs * 1.5, { size: fs, alpha: 0.9, op: a });
        else atza_label(ctx, 'H ' + span, cc + side * fs * 0.8, lo(cells[0]) + fs, { size: fs, alpha: 0.9, align: side > 0 ? 'left' : 'right', op: a });
    }
} });

/* 縦キャプション — a figure caption in a mono face, turned 90° and typed along the side of the lyric beside a hairline */
jzReg('decor', 'tzSideCaption', { back: false, build: function (ctx, bb0, d) {
    var bb = atza_bbok(ctx, bb0), W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, u = atza_k(ctx), m = atza_MG(ctx), fs = atza_FS(ctx), hd = atza_hd(ctx), k;
    var gap = 18 * u + Math.min(bb.x1 - bb.x0, bb.y1 - bb.y0) * 0.05, side = d.right ? 1 : -1, x = 0, ok = false, mono = jzMonoF(ctx);
    for (k = 0; k < 2 && !ok; k++) { x = side > 0 ? bb.x1 + gap + fs : bb.x0 - gap - fs; ok = x > m * 0.7 && x < W - m * 0.7; if (!ok) side = -side; }
    if (!ok) return;
    var cap = 'FIG.' + atza_p2((c.index | 0) + 1) + ' — ' + jzFmtTime(c.start) + ' — ' + atza_p2(jzCount(String(c.text || ''))) + ' GLYPHS';
    if (atza_tw(cap, mono, fs, 0.16) > H - m * 2) cap = 'FIG.' + atza_p2((c.index | 0) + 1) + ' — ' + jzFmtTime(c.start);
    var Lc = atza_tw(cap, mono, fs, 0.16), y0 = Math.max(m, bb.y0), y1 = Math.min(H - m, bb.y1), cy = Math.max(m + Lc / 2, Math.min(H - m - Lc / 2, (y0 + y1) / 2));
    var e = 'oe(time/0.6)*K', xr = x - side * fs * 0.95, ya = Math.min(y0, cy - Lc / 2), yb = Math.max(y1, cy + Lc / 2), ys = side > 0 ? ya : yb, ye = side > 0 ? yb : ya, t = 5 * u;
    var S = jzShapeLayer(ctx, 'caption rule', 0, 0);
    atza_grp(S, 'rule', [[[xr, ys], [xr, ye]]], sc.sub, { width: Math.max(1, u), alpha: 0.7, trim: hd + '100*' + e });
    atza_grp(S, 'tick', [[[xr, ys], [xr + side * t * 2, ys]]], atza_acc(sc), { width: Math.max(1.5, 2 * u), gop: hd + '100*cl(' + e + ')' });
    jzNoGhost(S);
    // typed from the start of the line: the text is set flush left and turned about its start point
    var T = atza_label(ctx, cap, x, side > 0 ? cy - Lc / 2 : cy + Lc / 2, { size: fs, align: 'left', track: 0.16, alpha: 0.9, op: 'K', name: 'side caption' });
    jzXf(T, 'ADBE Rotate Z').setValue(side > 0 ? 90 : -90);
    atza_typed(ctx, T, 'Math.floor(textTotal*cl((time-0.12)/0.6))');
} });

/* 行頭記号 — a pilcrow (or section sign) set before the head of the lyric and a small end mark closing it */
jzReg('decor', 'tzHeadEnd', { back: false, build: function (ctx, bb0, d) {
    var bb = atza_bbok(ctx, bb0), W = ctx.W, H = ctx.H, sc = ctx.sc, u = atza_k(ctx), m = atza_MG(ctx), hd = atza_hd(ctx);
    var cells = atza_cells(ctx, bb).a, g0 = cells[0], g1 = cells[cells.length - 1], hh = g0 ? Math.min(g0.h, g0.w * 1.4) : bb.y1 - bb.y0;
    var S = jzClamp(hh * 0.5, 30 * u, 96 * u), gap = 10 * u + S * 0.18, ac = atza_acc(sc), mk = ['¶', '§', '¶'][(d.v | 0) % 3];
    var x = bb.x0 - gap - S * 0.3, y = (g0 ? g0.y - g0.h / 2 : bb.y0) + S * 0.5;
    if (x - S * 0.4 < m * 0.6) { x = bb.x0 + S * 0.3; y = bb.y0 - gap - S * 0.45; }
    if (y - S * 0.5 > m * 0.4) {
        var P = atza_text(ctx, mk, { font: jzSerifF(ctx), size: S, x: x, y: y, color: d.accent ? ac : sc.sub, name: 'pilcrow' });
        jzSetExpr(jzXf(P, 'ADBE Position'), hd + '[value[0]-(1-oe(time/0.5))*' + jzN(S * 0.5) + ',value[1]]');
        atza_op(ctx, P, 'oc(time/0.45)*K');
    }
    var q = jzClamp(hh * 0.13, 8 * u, 22 * u), ex = bb.x1 + gap * 0.8, ey = (g1 ? g1.y + g1.h / 2 : bb.y1) - q - hh * 0.1;
    if (ex + q > W - m * 0.6) { ex = bb.x1 - q; ey = bb.y1 + gap * 0.8; }
    if (ey + q < H - m * 0.4) {
        var E = (d.v | 0) % 2 ? jzRectLayer(ctx, 'end mark', ex + q / 2, ey + q / 2, q, q, null, { stroke: sc.fg, strokeW: Math.max(1.5, 2 * u) })
            : jzRectLayer(ctx, 'end mark', ex + q / 2, ey + q / 2, q, q, d.accent ? sc.fg : ac, {});
        jzSetExpr(jzXf(E, 'ADBE Scale'), hd + 'var s=100*Math.max(0,Math.min(1.2,ob(cl((time-0.3)/0.35),2)*K));[s,s]');
        atza_op(ctx, E, 'K');
    }
} });

/* 番号列 — a strip of small running numerals in the margin, stepping on by one at every cut; the current one is underlined */
jzReg('decor', 'tzNumStrip', { back: false, build: function (ctx, bb0, d) {
    var bb = atza_bbok(ctx, bb0), W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, u = atza_k(ctx), m = atza_MG(ctx), fs = atza_FS(ctx), hd = atza_hd(ctx), i, j;
    var vert = (d.v | 0) % 3 === 2 && W > H, pitch = vert ? fs * 2.3 : fs * 3.5, Lw = vert ? H : W;
    var k = Math.max(1, Math.min(5, Math.floor((Lw * 0.5 - m) / pitch - 0.5))), cc = 0, ok = false, sides = vert ? [!!d.right, !d.right] : [d.low !== false, d.low === false];
    for (i = 0; i < 2 && !ok; i++) {
        cc = vert ? (sides[i] ? W - m - fs * 1.3 : m + fs * 1.3) : (sides[i] ? H - m - fs * 0.5 : m + fs * 0.5);
        ok = vert ? !atza_hit(cc - fs * 1.6, H / 2 - (k + 1) * pitch, cc + fs * 1.6, H / 2 + (k + 1) * pitch, bb, 8 * u) : !atza_hit(W / 2 - (k + 1) * pitch, cc - fs * 1.4, W / 2 + (k + 1) * pitch, cc + fs * 1.4, bb, 8 * u);
    }
    if (!ok) return;
    // the strip slides one step into place; numerals fade towards the ends (the current one is a layer of its own)
    var idx = (c.index | 0) + 1, strs = [], pts = [], al = [], SL = '(1-oe(time/0.55))*' + jzN(pitch), a0 = 'oc(time/0.3)*K';
    for (j = -k; j <= k; j++) {
        if (!j || idx + j < 1) continue;
        strs.push(jzPad(idx + j, 3)); pts.push(vert ? [cc, H / 2 + j * pitch] : [W / 2 + j * pitch, cc]); al.push(0.55 * jzClamp(1 - Math.abs(j) / (k + 0.6), 0, 1));
    }
    var mv = hd + (vert ? '[value[0],value[1]+' + SL + ']' : '[value[0]+' + SL + ',value[1]]');
    if (strs.length) {
        var N = atza_multi(ctx, strs, pts, { size: fs * 0.9, align: 'center', name: 'number strip' });
        jzAnimator(N.L, 'JZ Dim', [['ADBE Text Opacity', 0]], 'var LI=' + atza_arr(N.li) + ',A=' + atza_arr(al) + ';(1-A[LI[textIndex-1]||0])*100');
        jzSetExpr(jzXf(N.L, 'ADBE Position'), mv); atza_op(ctx, N.L, a0);
    }
    var C = atza_label(ctx, jzPad(idx, 3), vert ? cc : W / 2, vert ? H / 2 : cc, { size: fs * 1.05, align: 'center', color: sc.fg, op: a0, name: 'current number' });
    jzSetExpr(jzXf(C, 'ADBE Position'), mv);
    var e = 'oe((time-0.2)/0.5)*K', q = vert ? cc + (cc > W / 2 ? -1 : 1) * fs * 1.5 : cc + (cc > H / 2 ? -1 : 1) * fs;
    atza_lines(ctx, 'number underline', [vert ? [[q, H / 2 - fs * 0.8], [q, H / 2 + fs * 0.8]] : [[W / 2 - fs * 1.2, q], [W / 2 + fs * 1.2, q]]], atza_acc(sc), { width: Math.max(1.5, 2 * u), trim: hd + '50+50*' + e, start: hd + '50-50*' + e });
} });

/* リーダー罫 — a dot leader runs from the end of the lyric out to the margin and ends in a small page numeral */
jzReg('decor', 'tzDotLeader', { back: false, build: function (ctx, bb0, d) {
    var bb = atza_bbok(ctx, bb0), W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, u = atza_k(ctx), m = atza_MG(ctx), fs = atza_FS(ctx), hd = atza_hd(ctx), bw = bb.x1 - bb.x0, bh = bb.y1 - bb.y0;
    var cells = atza_cells(ctx, bb).a, g1 = cells[cells.length - 1], g0 = cells[0];
    var num = (d.v | 0) % 2 ? 'p.' + ((c.index | 0) + 1) : atza_p2((c.line | 0) + 1), ns = fs * 1.25, nw = atza_tw(num, jzMonoF(ctx), ns, 0.08), gap = 14 * u + Math.min(bw, bh) * 0.06;
    var dir = 0, xa = 0, xb = 0, y = 0, pass, a, b;
    for (pass = 0; pass < 2 && !dir; pass++) {
        if ((d.right === false) === (pass === 0)) { a = bb.x0 - gap; b = m + nw + fs * 0.7; if (a - b > W * 0.07) { dir = -1; xa = a; xb = b; y = g0 ? g0.y + g0.h * 0.3 : bb.y0 + bh * 0.8; } }
        else { a = bb.x1 + gap; b = W - m - nw - fs * 0.7; if (b - a > W * 0.07) { dir = 1; xa = a; xb = b; y = g1 ? g1.y + g1.h * 0.3 : bb.y1 - bh * 0.2; } }
    }
    if (!dir) return;
    y = jzClamp(y, m, H - m);
    // square dots = a dashed stroke; Trim Paths lets them appear one by one
    var pitch = Math.max(fs * 0.8, Math.abs(xb - xa) / 90), cnt = Math.max(1, Math.floor(Math.abs(xb - xa) / pitch)), r = Math.max(1.3 * u, fs * 0.08), len = cnt * pitch + r * 2;
    atza_lines(ctx, 'dot leader', [[[xa - dir * r, y], [xa + dir * (cnt * pitch + r), y]]], sc.sub, { width: r * 2, alpha: 0.8, dash: [r * 2, Math.max(0.1, pitch - r * 2)],
        trim: hd + '(Math.floor(' + cnt + '*oc((time-0.1)/0.8))*' + jzN(pitch) + '+' + jzN(r * 2) + ')/' + jzN(len) + '*100', op: 'K' });
    atza_label(ctx, num, dir > 0 ? W - m : m, y - ns * 0.12, { size: ns, align: dir > 0 ? 'right' : 'left', color: sc.fg, track: 0.08, op: 'oc((time-0.75)/0.3)*K', name: 'leader numeral' });
} });

/* 仮想ボディ — the body of every glyph drawn as a hairline box around it, with small ticks at the middle of each side */
jzReg('decor', 'tzEmBox', { back: false, build: function (ctx, bb0, d) {
    var bb = atza_bbok(ctx, bb0), sc = ctx.sc, u = atza_k(ctx), cells = atza_cells(ctx, bb).a.slice(0, 34), lw = Math.max(1, u), fs = atza_FS(ctx) * 0.8, hd = atza_hd(ctx), pad = 1.02 + ((d.v | 0) % 2) * 0.05, ticks = [], i;
    var S = jzShapeLayer(ctx, 'em squares', 0, 0);
    for (i = 0; i < cells.length; i++) {
        var g = cells[i], hw = g.w * pad / 2, hh = g.h * pad / 2, t = Math.max(4 * u, Math.min(hw, hh) * 0.09);
        atza_grp(S, 'body ' + (i + 1), [atza_rectPts(g.x - hw, g.y - hh, g.x + hw, g.y + hh)], sc.sub, { width: lw, alpha: 0.6, trim: hd + '100*oe((time-' + jzN(0.1 + i * 0.035) + ')/0.6)' });
        ticks.push([[g.x, g.y - hh], [g.x, g.y - hh - t]]); ticks.push([[g.x, g.y + hh], [g.x, g.y + hh + t]]);
        ticks.push([[g.x - hw, g.y], [g.x - hw + t * 0.6, g.y]]); ticks.push([[g.x + hw, g.y], [g.x + hw - t * 0.6, g.y]]);
    }
    if (ticks.length) atza_grp(S, 'ticks', ticks, sc.sub, { width: lw, alpha: 0.8, trim: hd + '100*oe((time-' + jzN(0.1 + cells.length * 0.0175) + ')/0.6)' });
    atza_op(ctx, S, 'K');
    var g0 = cells[0];
    if (g0 && g0.y - g0.h * pad / 2 - fs * 2.2 > 0) atza_label(ctx, 'EM ' + Math.round(Math.max(g0.w, g0.h) / u), g0.x - g0.w * pad / 2, g0.y - g0.h * pad / 2 - fs * 1.3, { size: fs, alpha: 0.9, color: d.accent ? atza_acc(sc) : sc.sub, op: 'oc((time-0.35)/0.3)*K' });
} });

/* 四隅の数字 — small live numerals in the frame corners (line, running time, glyph count, cut), each on a short hairline */
jzReg('decor', 'tzCornerNums', { back: false, build: function (ctx, bb0, d) {
    var bb = atza_bbok(ctx, bb0), W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, u = atza_k(ctx), m = atza_MG(ctx), fs = atza_FS(ctx), hd = atza_hd(ctx), i, any = false;
    var items = [[0, 0, 'L.' + atza_p2((c.line | 0) + 1)], [1, 0, jzFmtTime(c.start)], [0, 1, atza_p2(jzCount(String(c.text || ''))) + ' CH'], [1, 1, jzPad((c.index | 0) + 1, 3)]];
    var two = (d.n | 0) <= 1, lw = Math.max(1, u), ac = atza_acc(sc), mono = jzMonoF(ctx), S = jzShapeLayer(ctx, 'corner rules', 0, 0);
    for (i = 0; i < 4; i++) {
        var r = items[i][0], b = items[i][1], t = items[i][2];
        if (two && (d.right ? r === b : r !== b)) continue;
        var x = r ? W - m : m, y = b ? H - m - fs * 0.5 : m + fs * 0.5, w = atza_tw(t, mono, fs) + fs;
        if (atza_hit(r ? x - w : x, y - fs * 1.6, r ? x : x + w, y + fs * 1.6, bb, 8 * u)) continue;
        var e = 'oe((time-' + jzN(i * 0.07) + ')/0.5)*K', yl = y + (b ? -1 : 1) * fs * 1.05, dd = r ? -1 : 1;
        atza_grp(S, 'rule ' + (i + 1), [[[x, yl], [x + dd * fs * 2.6, yl]]], i === 0 ? ac : sc.sub, { width: i === 0 ? Math.max(1.5, 2 * u) : lw, alpha: 0.9, trim: hd + '100*' + e });
        any = true;
        var T = atza_label(ctx, t, x, y, { size: fs, align: r ? 'right' : 'left', color: i === 1 ? sc.fg : sc.sub, alpha: 0.95, op: e, name: 'corner ' + (i + 1) });
        if (i === 1) atza_srcText(T, ATZA_TFMT + 'tf(' + jzN(c.start || 0) + '+Math.min(time,' + jzN(c.dur) + '))');     // the running time stays live
        else atza_typed(ctx, T, 'Math.ceil(textTotal*cl((time-' + jzN(0.1 + i * 0.07) + ')/0.35))');
    }
    if (any) jzNoGhost(S); else S.remove();
} });

/* 読み位置 — a small caret steps from glyph to glyph under the lyric as the cut plays, with the position in numerals */
jzReg('decor', 'tzReadCaret', { back: false, build: function (ctx, bb0, d) {
    var bb = atza_bbok(ctx, bb0), W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, u = atza_k(ctx), m = atza_MG(ctx), fs = atza_FS(ctx) * 0.88, hd = atza_hd(ctx), i;
    var CE = atza_cells(ctx, bb), cells = CE.a, n = cells.length, vert = CE.vert, ac = atza_acc(sc);
    if (!n) return;
    var g0 = cells[0], t = jzClamp((vert ? g0.w : g0.h) * 0.1, 7 * u, 14 * u), gap = 8 * u + t, X = [], Y = [], side = 1, mx = -1e9;
    for (i = 0; i < n; i++) { X.push(cells[i].x); Y.push(cells[i].y); mx = Math.max(mx, cells[i].x); }
    if (vert) side = mx + g0.w / 2 + gap + t * 2 + fs * 3 < W - m * 0.4 ? 1 : -1;
    // i = the glyph being read, k = the step towards it; the caret jumps between lines / columns instead of sliding through the lyric
    var CX = hd + 'var X=' + atza_arr(X) + ',Y=' + atza_arr(Y) + ',n=' + n + ';var f=cl((time-0.1)/' + jzN(Math.max(0.3, c.dur * 0.86 - 0.1)) + ')*n,i=Math.min(n-1,Math.floor(f)),j=Math.max(0,i-1),k=oc((f-i)*3.5);' +
        (vert ? 'if(Math.abs(X[i]-X[j])>' + jzN(g0.w * 0.5) + ')k=1;var x=X[j]+(X[i]-X[j])*k+' + jzN(side * (g0.w / 2 + gap)) + ',y=Y[j]+(Y[i]-Y[j])*k;'
              : 'if(Math.abs(Y[i]-Y[j])>' + jzN(g0.h * 0.5) + ')k=1;var x=X[j]+(X[i]-X[j])*k,y=Y[j]+(Y[i]-Y[j])*k+' + jzN(g0.h / 2 + gap) + ';') +
        'var a=cl(ob(cl(time/0.35),1.8)*K);';
    var lim = jzN(H - m * 0.4);
    if (!vert) {       // hairline under the row being read
        var rows = [], S = jzShapeLayer(ctx, 'reading line', 0, 0);
        for (i = 0; i < n; i++) {
            var q, hitR = -1;
            for (q = 0; q < rows.length; q++) if (Math.abs(rows[q].y - cells[i].y) < g0.h * 0.5) hitR = q;
            if (hitR < 0) rows.push({ y: cells[i].y, x0: cells[i].x - cells[i].w / 2, x1: cells[i].x + cells[i].w / 2 });
            else { rows[hitR].x0 = Math.min(rows[hitR].x0, cells[i].x - cells[i].w / 2); rows[hitR].x1 = Math.max(rows[hitR].x1, cells[i].x + cells[i].w / 2); }
        }
        for (i = 0; i < rows.length; i++) {
            var yr = rows[i].y + g0.h / 2 + gap - t * 0.35;
            atza_grp(S, 'row ' + (i + 1), [[[rows[i].x0, yr], [rows[i].x1, yr]]], sc.sub, { width: Math.max(1, u), alpha: 0.5, trim: hd + '100*oe(time/0.6)',
                gop: CX + '(Math.abs(Y[i]-' + jzN(rows[i].y) + ')<' + jzN(g0.h * 0.5) + '&&y+' + jzN(t * 2) + '<=' + lim + ')?100:0' });
        }
        atza_op(ctx, S, 'K');
    }
    var Cr = jzPathLayer(ctx, 'reading caret', vert ? [[0, 0], [side * t * 1.7, -t], [side * t * 1.7, t]] : [[0, 0], [-t, t * 1.7], [t, t * 1.7]], null, { closed: true, fill: ac });
    jzSetExpr(jzXf(Cr, 'ADBE Position'), CX + '[x,y]');
    jzSetExpr(jzXf(Cr, 'ADBE Opacity'), CX + (vert ? '100*a' : '(y+' + jzN(t * 2) + '>' + lim + ')?0:100*a'));
    jzNoGhost(Cr);
    var R = atza_label(ctx, '01/' + atza_p2(n), 0, 0, { size: fs, align: vert ? (side > 0 ? 'left' : 'right') : 'center', track: 0.04, alpha: 0.9, name: 'reading position' });
    jzSetExpr(jzXf(R, 'ADBE Position'), CX + (vert ? '[x+' + jzN(side * (t * 1.7 + fs * 0.5)) + ',y]' : '[x,y+' + jzN(t * 1.7 + fs * 0.95) + ']'));
    jzSetExpr(jzXf(R, 'ADBE Opacity'), CX + (vert ? 'value*a' : '(y+' + jzN(t * 1.7 + fs * 1.6) + '<' + lim + ')?value*a:0'));
    atza_srcText(R, CX + 'function p2(v){return (v<10?"0":"")+v;}p2(i+1)+"/"+' + atza_str(atza_p2(n)));
} });

/* ================================================================ BACKGROUNDS */
var ATZA_BFN = ATZA_FNS + 'function wr(v,m){return ((v%m)+m)%m;}';
// seconds this background had already been running at the cut start (browser bgT: consecutive cuts with the same bg + seed are one run)
function atza_run(b) {
    var c = b.cut, cs = (b.plan && b.plan.cuts) || [], s = c.start || 0, P0 = c.bgP || {}, idx = -1, i;
    for (i = 0; i < cs.length; i++) if (cs[i] === c) { idx = i; break; }
    for (i = idx - 1; i >= 0; i--) {
        var p = cs[i];
        if (p.bg === c.bg && (p.bgP || {}).seed === P0.seed && Math.abs(p.end - s) < 0.06) s = p.start; else break;
    }
    return (c.start || 0) - s;
}
// expression header: T = absolute song time (browser env.t), BT = time since this background started (browser bgT)
function atza_bhd(b) { return ATZA_BFN + 'var T=time+' + jzN(b.cut.start || 0) + ',BT=time+' + jzN(atza_run(b)) + ';\n'; }
function atza_bop(b, L, f) { jzSetExpr(jzXf(L, 'ADBE Opacity'), atza_bhd(b) + 'value*cl(' + f + ')'); return L; }

/* 基線グリッド — a faint baseline grid across the frame, every few lines a little stronger and numbered, drifting very slowly */
jzReg('bg', 'tzBgBaseGrid', {
    plan: function (rng, st) { return { seed: rng.int(1, 1e9), rows: rng.int(22, 30), every: rng.pick([4, 4, 5]), drift: rng.range(5, 10) * rng.pick([1, -1]), k: rng.range(0.1, 0.135), nums: rng.chance(0.8), right: rng.chance(0.3) }; },
    build: function (b, P) {
        var W = b.W, H = b.H, sc = b.sc, M = jzU(b), rows = P.rows || 26, every = P.every || 4, k = P.k || 0.12, g = Math.max(W, H) / rows, dr = (P.drift || 6) * M / 1080, i;
        // the grid scrolls with the song time: build the rows that cross the frame during this cut and move the layer
        var t0 = b.cut.start || 0, s0 = t0 * dr, s1 = (t0 + b.comp.duration) * dr, k0 = Math.ceil(-Math.max(s0, s1) / g) - 1, k1 = Math.floor((H - Math.min(s0, s1)) / g) + 1;
        if (k1 - k0 > 140) k1 = k0 + 140;
        var right = !!P.right, mx = right ? W * 0.92 : W * 0.08, fs = Math.max(9, M * 0.013), lw = Math.max(1, M * 0.0014), hd = atza_bhd(b), e = 'oc(BT/0.8)', weak = [], strong = [], ns = [], np = [];
        for (i = k0; i <= k1; i++) {
            var st = ((i % every) + every) % every === 0;
            (st ? strong : weak).push([[0, i * g], [W, i * g]]);
            if (st) { ns.push(atza_p2((((-i) % 100) + 100) % 100)); np.push([mx + (right ? 1 : -1) * fs * 0.7, i * g - fs * 0.9]); }
        }
        var mv = hd + '[value[0],T*' + jzN(dr) + ']';
        var S = jzShapeLayer(b, 'bg baseline grid', 0, 0);
        if (weak.length) atza_grp(S, 'baselines', weak, sc.fg, { width: lw, alpha: Math.min(1, k), trim: hd + '100*' + e });
        if (strong.length) atza_grp(S, 'every ' + every, strong, sc.fg, { width: lw, alpha: Math.min(1, k * 1.8), trim: hd + '100*' + e });
        jzSetExpr(jzXf(S, 'ADBE Position'), mv); atza_bop(b, S, e);
        var Mg = jzShapeLayer(b, 'bg grid margin', 0, 0);
        atza_grp(Mg, 'margin', [[[mx, 0], [mx, H]]], sc.accent, { width: lw, alpha: Math.min(1, k * 2.4), trim: hd + '100*' + e });
        atza_bop(b, Mg, e);
        if (P.nums !== false && ns.length) {
            var N = atza_multi(b, ns, np, { size: fs, align: right ? 'left' : 'right', track: 0, color: sc.fg, alpha: Math.min(1, k * 2.6), name: 'bg grid numbers' });
            jzSetExpr(jzXf(N.L, 'ADBE Position'), mv); atza_bop(b, N.L, e);
        }
    }
});

/* 数字の野 — a field of small two-digit numerals in a mono face; single cells tick over now and then, one row reads a little clearer */
jzReg('bg', 'tzBgNumField', {
    plan: function (rng, st) { return { seed: rng.int(1, 1e9), fs: rng.range(0.016, 0.021), k: rng.range(0.075, 0.1), rate: rng.range(0.2, 0.5), band: rng.chance(0.7) }; },
    build: function (b, P) {
        var W = b.W, H = b.H, sc = b.sc, M = jzU(b), s = P.seed || 1, fs = M * (P.fs || 0.018), rh = fs * 2.5, k = P.k || 0.085, rate = P.rate || 0.3, mono = jzMonoF(b), i, j;
        var cw = Math.max(fs * 1.2, atza_tw('00  ', mono, fs, 0)), cols = Math.min(64, Math.ceil(W / cw) + 1), rows = Math.min(60, Math.ceil(H / rh) + 1), hd = atza_bhd(b), str = [];
        // ONE text layer: its Source Text expression writes the whole field (alternate rows start half a cell further in)
        for (j = 0; j < rows; j++) { var ln = j % 2 ? '' : '  '; for (i = 0; i < cols; i++) ln += jzPad(atza_h(s, i, j, 0) % 100, 2) + '  '; str.push(ln); }
        var FN = 'var C=' + cols + ',R=' + rows + ',S=' + (s % 997) + ';function h2(a,b,c){var x=Math.sin(a*127.1+b*311.7+c*74.7+S)*43758.5453;return x-Math.floor(x);}' +
            'function row(j){var s=j%2?"":"  ";for(var i=0;i<C;i++){var ph=Math.floor(T*' + jzN(rate) + '*(0.2+1.8*h2(i,j,9))+h2(i,j,3)*10);var v=Math.floor(h2(i+ph*17,j,ph)*100);s+=(v<10?"0":"")+v+"  ";}return s;}';
        var F = atza_text(b, str.join('\n'), { font: mono, size: fs, align: 'left', track: 0, lead: 2.5, x: fs * 0.6 - cw * 0.5, y: rows * rh / 2, color: sc.fg, alpha: Math.min(1, k), name: 'bg numeral field' });
        atza_srcText(F, hd + FN + 'var o="";for(var j=0;j<R;j++)o+=row(j)+(j<R-1?"\\r":"");o');
        atza_bop(b, F, 'oc(BT/0.8)');
        if (P.band !== false) {       // the clearer row: the same numerals once more on top of one row, moving on every 2.5 s
            var HOT = 'var hot=Math.floor(T*0.4+' + jzN(atza_r(s, 7) * rows) + ')%R;';
            var B = atza_text(b, str[0], { font: mono, size: fs, align: 'left', track: 0, x: fs * 0.6 - cw * 0.5, y: rh / 2, color: sc.fg, alpha: Math.min(1, k * 1.1), name: 'bg numeral band' });
            atza_srcText(B, hd + FN + HOT + 'row(hot)');
            jzSetExpr(jzXf(B, 'ADBE Position'), hd + 'var R=' + rows + ';' + HOT + '[value[0],(hot+0.5)*' + jzN(rh) + ']');
            atza_bop(b, B, 'oc(BT/0.8)');
        }
    }
});

/* 段組ガイド — the column guides of a page layout: pale columns and gutters, head and foot lines, small column numbers; one column lights faintly in turn */
jzReg('bg', 'tzBgColumns', {
    plan: function (rng, st) { return { seed: rng.int(1, 1e9), cols: rng.pick([4, 6, 6, 8]), k: rng.range(0.035, 0.05), step: rng.range(1.8, 2.8), nums: rng.chance(0.75), fill: rng.chance(0.7) }; },
    build: function (b, P) {
        var W = b.W, H = b.H, sc = b.sc, M = jzU(b), k = P.k || 0.042, n = W < H ? Math.max(3, Math.round((P.cols || 6) / 2)) : (P.cols || 6), i;
        var mx = W * 0.05, gut = M * 0.016, cw = (W - mx * 2 - (n - 1) * gut) / n, y0 = H * 0.045, y1 = H * 0.955, fs = Math.max(9, M * 0.011), hd = atza_bhd(b), e = 'oc(BT/0.9)';
        var PU = 'var f=T/' + jzN(P.step || 2.2) + ',act=Math.floor(f)%' + n + ',pu=Math.sin(Math.PI*(f%1));', guides = [], ns = [], np = [];
        // column tints (the layer grows down from the head line); the active column pulses
        var F = jzShapeLayer(b, 'bg column tints', 0, 0);
        for (i = 0; i < n; i++) {
            var x = mx + i * (cw + gut), base = P.fill !== false && i % 2 === 0 ? k * 0.55 : 0;
            atza_rectGrp(F, 'column ' + (i + 1), x, y0, cw, y1 - y0, sc.fg, { gop: hd + PU + '(' + jzN(base) + '+(act===' + i + '?' + jzN(k * 0.9) + '*pu:0))*100' });
            guides.push([[x, y0], [x, y1]]); guides.push([[x + cw, y0], [x + cw, y1]]);
            ns.push(atza_p2(i + 1)); np.push([x + fs * 0.4, y0 + fs * 1.1]);
        }
        jzXf(F, 'ADBE Anchor Point').setValue([0, y0]); jzXf(F, 'ADBE Position').setValue([0, y0]);
        jzSetExpr(jzXf(F, 'ADBE Scale'), hd + '[100,100*' + e + ']'); atza_bop(b, F, e);
        var G = jzShapeLayer(b, 'bg column guides', 0, 0);
        atza_grp(G, 'guides', guides, sc.fg, { width: Math.max(1, M * 0.001), alpha: Math.min(1, k * 2.2), trim: hd + '100*' + e });
        atza_grp(G, 'head and foot', [[[0, y0], [W, y0]], [[W, y1], [0, y1]]], sc.accent, { width: Math.max(1, M * 0.001), alpha: Math.min(1, k * 2.6), trim: hd + '100*' + e });
        atza_bop(b, G, e);
        if (P.nums !== false) { var N = atza_multi(b, ns, np, { size: fs, align: 'left', track: 0, color: sc.fg, alpha: Math.min(1, k * 4), name: 'bg column numbers' }); atza_bop(b, N.L, e); }
    }
});

/* 淡い大数字 — the line number (or the running second) as two huge pale digits cut by the frame edge; they roll in when the number changes */
jzReg('bg', 'tzBgBigDigits', {
    plan: function (rng, st) { return { seed: rng.int(1, 1e9), side: rng.pick([-1, 1]), font: rng.pick(['display', 'mono', 'serif']), outline: rng.chance(0.6), k: rng.range(0.055, 0.08), what: rng.pick(['line', 'line', 'sec']), low: rng.chance(0.6) }; },
    build: function (b, P) {
        var W = b.W, H = b.H, sc = b.sc, cut = b.cut, k = P.k || 0.065, side = P.side || 1, sec = P.what === 'sec', hd = atza_bhd(b);
        var txt = sec ? atza_p2(Math.floor(cut.start || 0) % 100) : atza_p2(((cut.line | 0) + 1) % 100);
        var font = P.font === 'mono' ? jzMonoF(b) : jzFontsOf(b.st, [P.font || 'display'])[0], size = Math.max(W, H) * 0.6;
        var it = { text: txt, font: font, size: size, x: W / 2 + side * W * 0.2, y: H * (P.low !== false ? 0.62 : 0.4), color: sc.fg, alpha: Math.min(1, k), name: 'bg pale counter' };
        if (P.outline !== false) { it.fill = false; it.stroke = Math.max(2, size * 0.004); it.strokeColor = sc.fg; it.alpha = Math.min(0.24, k * 2.4); }
        var L = atza_text(b, txt, it);
        jzSetExpr(jzXf(L, 'ADBE Position'), hd + 'var roll=1-oe(' + (sec ? '(T%1)/0.4' : 'BT/0.8') + ');[value[0],value[1]+roll*' + jzN(size * (sec ? 0.05 : 0.16)) + ']');
        atza_bop(b, L, 'oc(BT/0.7)');
        if (sec) atza_srcText(L, hd + 'var v=Math.floor(T)%100;(v<10?"0":"")+v');
    }
});

/* 字の地紋 — the glyphs of the current lyric line, small and widely spaced, tiled over the whole frame; alternate rows drift opposite ways */
jzReg('bg', 'tzBgGlyphField', {
    plan: function (rng, st) { return { seed: rng.int(1, 1e9), fs: rng.range(0.03, 0.042), k: rng.range(0.06, 0.085), v: rng.range(8, 16), font: rng.pick(['body', 'serif', 'body']) }; },
    build: function (b, P) {
        var W = b.W, H = b.H, sc = b.sc, M = jzU(b), cut = b.cut, src = jzChars(atza_clean(cut.lineText || cut.text || '')), arr = [], i, j;
        for (i = 0; i < src.length && arr.length < 24; i++) if (!atza_isP(src[i])) arr.push(src[i]);
        if (!arr.length) return;
        var fs = M * (P.fs || 0.036), rowH = fs * 2.3, font = jzFontsOf(b.st, [P.font || 'body'])[0], unit = arr.join('　') + '　', hd = atza_bhd(b);
        // the period of one unit, measured on the real face (difference of two probes, so trailing spaces cannot be lost)
        var o1 = { font: font, size: fs, align: 'left', track: 0, x: -9999, y: -9999, color: sc.fg }, p1 = atza_text(b, unit + unit + '字', o1), p2 = atza_text(b, unit + '字', o1);
        var per = jzSize(p1)[0] - jzSize(p2)[0];
        p1.remove(); p2.remove();
        if (!(per > fs)) per = Math.max(fs, atza_tw(unit, font, fs, 0));
        var reps = Math.min(40, Math.ceil(W / per) + 2), rows = Math.min(48, Math.ceil(H / rowH) + 1), v = (P.v || 12) * M / 1080, str = '';
        for (i = 0; i < reps; i++) str += unit;
        for (j = 0; j < rows; j++) {
            var L = atza_text(b, str, { font: font, size: fs, align: 'left', track: 0, x: 0, y: (j + 0.5) * rowH, color: sc.fg, alpha: Math.min(1, P.k || 0.07), name: 'bg glyph row ' + (j + 1) });
            jzSetExpr(jzXf(L, 'ADBE Position'), hd + 'var per=' + jzN(per) + ';[wr(T*' + jzN(v * (j % 2 ? 1 : -1)) + '+' + jzN(j * fs * 1.37 + atza_r(P.seed || 1, j) * per) + ',per)-per,value[1]]');
            atza_bop(b, L, 'oc(BT/0.9)');
        }
    }
});

/* 罫線の呼吸 — a few typographic rules (hairline, double, thick-and-thin, dotted) reach in from the edges and slowly lengthen and shorten */
jzReg('bg', 'tzBgRules', {
    plan: function (rng, st) { return { seed: rng.int(1, 1e9), n: rng.int(6, 9), k: rng.range(0.12, 0.16) }; },
    build: function (b, P) {
        var W = b.W, H = b.H, sc = b.sc, M = jzU(b), s = P.seed || 1, n = P.n || 7, k = Math.min(1, P.k || 0.1), u = M / 1080, lw = Math.max(1, u * 1.5), hd = atza_bhd(b), i;
        var S = jzShapeLayer(b, 'bg breathing rules', 0, 0);
        for (i = 0; i < n; i++) {
            var y = H * (0.07 + 0.86 * (i + 0.5) / n) + atza_rs(s, i, 1) * H * 0.025, kind = atza_h(s, i, 2) % 4, fromL = atza_r(s, i, 3) < 0.5, xa = fromL ? 0 : W, xf = fromL ? W : 0;
            // len = the rule's length in px (breathing), drawn from its edge with Trim Paths
            var LEN = hd + 'var len=' + jzN(W) + '*(0.22+0.62*(0.5+0.5*Math.sin(T*' + jzN(0.12 + 0.2 * atza_r(s, i, 4)) + '+' + jzN(atza_r(s, i, 5) * Math.PI * 2) + ')))*oe(BT/1.1);';
            var col = i === (s % n) ? sc.accent : sc.fg, tr = LEN + 'len/' + jzN(W) + '*100', nm = 'rule ' + (i + 1);
            if (kind === 0) atza_grp(S, nm, [[[xa, y], [xf, y]]], col, { width: lw, alpha: k, trim: tr });
            else if (kind === 1) atza_grp(S, nm + ' double', [[[xa, y - 3 * u], [xf, y - 3 * u]], [[xa, y + 3 * u], [xf, y + 3 * u]]], col, { width: lw, alpha: k, trim: tr });
            else if (kind === 2) {
                atza_grp(S, nm + ' thick', [[[xa, y - 3.5 * u], [xf, y - 3.5 * u]]], col, { width: lw * 3.2, alpha: k, trim: tr });
                atza_grp(S, nm + ' thin', [[[xa, y + 3.5 * u], [xf, y + 3.5 * u]]], col, { width: lw, alpha: k, trim: tr });
            } else atza_grp(S, nm + ' dotted', [[[xa, y], [xf, y]]], col, { width: lw * 1.6, alpha: k, dash: [lw * 1.6, lw * 4.5], trim: tr });
            atza_grp(S, nm + ' end', [[[0, -7 * u], [0, 7 * u]]], col, { width: lw, alpha: k, gpos: LEN + '[' + (fromL ? 'len' : jzN(W) + '-len') + ',' + jzN(y) + ']' });
        }
    }
});
