// ================================================================ pack x2layD part 2 (AE port of src/11p_x2_layD.js, entries 16-30)
// xdSquareWave, xdAxisAlt, xdPointSym, xdWindSway, xdSunShadow, xdSkewSweep, xdStretchEcho, xdColumnEcho, xdSkyline,
// xdSpiralEcho, xdRipple, xdFourUp, xdTrace, xdTide, xdStitch
// (helpers: see ae/p_x2_layD1.jsx — both files are needed together)

// Transform effect on a text layer about the comp point (X, Y): skew (degrees, expression) and optional height scale (percent,
// expression). A shear x' = x + c*y is Skew = -atan(c) (same convention as the affine helpers of the layoutsD port).
function axd_shear(L, X, Y, skewEx, scYEx) {
    var A = jzXf(L, 'ADBE Anchor Point').value, P = jzXf(L, 'ADBE Position').value, e = jzEffect(L, 'ADBE Geometry2', 'JZ Shear');
    if (!e) return null;
    var pt = [A[0] + (X - P[0]), A[1] + (Y - P[1])];
    jzEP(e, 1, pt); jzEP(e, 2, pt); jzEP(e, 3, 0);
    if (scYEx) jzEX(e, 4, scYEx);
    jzEX(e, 6, skewEx); jzEP(e, 7, 0);
    return e;
}

/* ================================================================== 16 xdSquareWave — 矩形波
   every glyph layer steps with a position animator; the signal line is a createPath expression. */
axd_reg('xdSquareWave', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['display', 'mono', 'body'])), wl: rng.pick([2, 4, 4, 6]), speed: rng.range(0.1, 0.2) * rng.pick([1, -1]), line: rng.chance(0.85), amp: rng.range(0.36, 0.44), bits: rng.chance(0.6) }; },
    build: function (ctx) {
        var b = axd_base(ctx), W = b.W, H = b.H, sc = b.sc, M = b.M, port = b.port, lw = b.lw, HD = b.HD, r, i;
        var n0 = jzCount(b.txt), L = axd_layRows(b.txt, W * 0.8, H * 0.76, { mono: 1.12, spw: 1.12, lead: 2.35, maxR: port ? 4 : (n0 > 10 ? 2 : 1), cap: M * 0.19 }), size = L.size;
        if (!L.n) return null;
        var font = jzFontOf(ctx, 'font', 'display'), amp = jzP(ctx, 'amp', 0.4), acc = axd_acc(sc), bb = null;
        var SG = HD + 'function sg(xc){return Math.max(-1,Math.min(1,Math.sin(TAU*(xc/' + jzN(jzP(ctx, 'wl', 4)) + '-time*' + jzN(jzP(ctx, 'speed', 0.15)) + ')+0.4)*6));}';
        if (jzP(ctx, 'line', true)) {
            var S = axd_fadeK(ctx, axd_S(ctx, 'signal'));
            for (r = 0; r < L.R; r++) {
                var y = H / 2 + (r - (L.R - 1) / 2) * L.lead * size, w = L.ws[r], KP = Math.min(160, Math.ceil(w / 1.12 * 10) + 10);
                axd_g(S, 'wave ' + r, { paths: [[[W / 2 - (w / 2 + 0.5) * size, y], [W / 2 + (w / 2 + 0.5) * size, y]]] }, { stroke: acc, w: lw * 2, a: 0.9 }, {
                    path: SG + 'var p=[],w=' + jzN(w) + ';for(var k=0;k<=' + KP + ';k++){var xe=-w/2-0.5+(w+1)*k/' + KP + ';p.push([' + jzN(W / 2) + '+xe*' + jzN(size) + ',' + jzN(y) + '-sg((xe+w/2)/1.12-0.5+' + jzN(r * 1.7) + ')*' + jzN(size * 0.15) + ']);}createPath(p,[],[],false)',
                    trim: HD + axd_ie(0.7, r * 0.08) + '*100' });
                if (jzP(ctx, 'bits', true)) {
                    var lx = W / 2 - (w / 2 + 0.85) * size;
                    jzFade(ctx, axd_lbl(ctx, '1', lx, y - amp * size), 0.2, 0.4);
                    jzFade(ctx, axd_lbl(ctx, '0', lx, y + amp * size), 0.2, 0.4);
                }
            }
        }
        for (i = 0; i < L.g.length; i++) {
            var g = L.g[i], x = W / 2 + g.ex * size, gy = H / 2 + g.ey * size;
            var T = axd_put(ctx, g.t, { font: font, size: size, sx: axd_sqz(g.t), x: x, y: gy, mi: axd_miOf(g.i, L.n) });
            axd_ride(T, 'JZ Step', SG, 'dy=sg(' + jzN((g.ex + L.ws[g.r] / 2) / 1.12 - 0.5 + g.r * 1.7) + ')*' + jzN(amp * size), Math.max(W, H));
            bb = axd_bbc(bb, x, gy, size / 2, size * (0.5 + amp));
        }
        return bb;
    }
});

/* ================================================================== 17 xdAxisAlt — 軸振り分け */
axd_reg('xdAxisAlt', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['display', 'serif'])), first: rng.pick([1, -1]), marker: rng.chance(0.75), nums: rng.chance(0.4) }; },
    build: function (ctx) {
        var b = axd_base(ctx), W = b.W, H = b.H, sc = b.sc, M = b.M, port = b.port, lw = b.lw, HD = b.HD, s;
        var sl = axd_cells(b.txt), N = sl.length, n = axd_cnt(sl);
        if (!N) return null;
        var size = port ? Math.min(H * 0.84 / ((N - 1) + 1), W * 0.28) : Math.min(W * 0.86 / ((N - 1) + 1), H * 0.27, M * 0.26);
        var pitch = size, off = size * 0.62, acc = axd_acc(sc), col = axd_sub(sc), font = jzFontOf(ctx, 'font', 'display'), first = jzP(ctx, 'first', 1) < 0 ? -1 : 1;
        function A(q) { return (q - (N - 1) / 2) * pitch; }
        function P2(a, d) { return port ? [W / 2 + d, H / 2 + a] : [W / 2 + a, H / 2 + d]; }
        var S = axd_fadeK(ctx, axd_S(ctx, 'axis')), E = axd_ie(0.7, 0), a0 = A(-0.9), a1 = A(N - 0.1), hh = size * 0.07, items = [], gi = 0, bb = null;
        axd_g(S, 'axis', { paths: [[P2(a0, 0), P2(a1, 0)]] }, { stroke: col, w: lw * 1.6, a: 0.85 }, { trim: HD + E + '*100' });
        axd_g(S, 'axis tip', { paths: [[P2(a1 - hh * 1.4, hh), P2(a1, 0), P2(a1 - hh * 1.4, -hh)]] }, { stroke: col, w: lw * 1.6 }, { op: HD + '(' + E + '>0.9?85:0)' });
        for (s = 0; s < N; s++) {
            if (axd_isSp(sl[s])) continue;
            var side = first * (s % 2 ? -1 : 1), nd = P2(A(s), 0), gp = P2(A(s), side * off), st0 = P2(A(s), side * size * 0.13), q = 'oe((time-' + jzN(s * 0.04) + ')/0.35)';
            axd_g(S, 'stub ' + s, { paths: [[nd, st0]] }, { stroke: col, w: lw * 1.2, a: 0.8 }, { trim: HD + q + '*100' });
            axd_g(S, 'node ' + s, { ell: [size * 0.07, size * 0.07] }, { fill: sc.fg }, { p: nd, sc: HD + 'var e=' + q + '*100;[e,e]' });
            if (jzP(ctx, 'nums', false)) { var np = P2(A(s), -side * size * 0.17); jzFade(ctx, axd_lbl(ctx, jzPad(gi + 1, 2), np[0], np[1], { size: size * 0.11, opacity: 0.9 }), s * 0.04, 0.35); }
            items.push([sl[s], gp[0], gp[1], gi++]);
        }
        if (jzP(ctx, 'marker', true)) {
            var m0 = P2(A(-0.5), 0), m1 = P2(A(N - 0.5), 0);
            axd_g(S, 'marker', { ell: [size * 0.17, size * 0.17] }, { stroke: acc, w: lw * 2.2 }, {
                pos: HD + 'var u=cl(time/Math.max(0.5,DUR));[' + jzN(m0[0]) + '+' + jzN(m1[0] - m0[0]) + '*u,' + jzN(m0[1]) + '+' + jzN(m1[1] - m0[1]) + '*u]', op: HD + axd_ic(0.3, 0.2) + '*100' });
        }
        for (s = 0; s < items.length; s++) {
            axd_put(ctx, items[s][0], { font: font, size: size, sx: axd_sqz(items[s][0]), x: items[s][1], y: items[s][2], mi: axd_miOf(items[s][3], n) });
            bb = axd_bbc(bb, items[s][1], items[s][2], size / 2, size / 2);
        }
        return bb;
    }
});

/* ================================================================== 18 xdPointSym — 点対称 */
axd_reg('xdPointSym', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['display', 'serif'])), mode: rng.pick(['tb', 'tb', 'corner']), copy: rng.pick(['outline', 'dim', 'lines']), mark: rng.pick(['diamond', 'dot']) }; },
    build: function (ctx) {
        var b = axd_base(ctx), W = b.W, H = b.H, sc = b.sc, M = b.M, port = b.port, lw = b.lw, HD = b.HD, s;
        if (!b.txt) return null;
        var corner = jzP(ctx, 'mode', 'tb') === 'corner', font = jzFontOf(ctx, 'font', 'display'), acc = axd_acc(sc), bw = W * (corner ? 0.62 : 0.8), bh = H * (corner ? 0.3 : 0.31);
        var fb = axd_fitBox(b.txt, bw, bh, 1.15, 0.02, port ? 4 : 2);
        var Lm = axd_T(ctx, fb.text, { font: font, size: fb.size, x: corner ? W * 0.07 : W / 2, y: H / 2, lead: 1.15, track: 0.02, align: corner ? 'left' : null, fitW: bw, fitH: bh, cap: M * 0.26 });
        var m = axd_m(Lm, fb.text, 1.15), size = m.size, x = corner ? W * 0.07 : W / 2, y = corner ? H * 0.08 + m.h / 2 : H / 2 - m.h / 2 - Math.max(size * 0.32, H * 0.04);
        jzXf(Lm, 'ADBE Position').setValue([x, y]);
        var C = axd_copy(ctx, fb.text, { font: font, size: size, x: x, y: y, lead: 1.15, track: 0.02, align: corner ? 'left' : null }, jzP(ctx, 'copy', 'outline'), 1);
        axd_pivot(C, W / 2, H / 2);
        jzSetExpr(jzXf(C, 'ADBE Rotate Z'), HD + 'value+180*' + axd_ie(0.8, 0.05));
        jzFade(ctx, C, 0.05, 0.4);
        var S = axd_fadeK(ctx, axd_S(ctx, 'centre')), E = axd_ie(0.6, 0.1), r = M * 0.016;
        if (corner) {
            var dx = (W * 0.5 - (x + m.w)) * 0.55, dy = (H * 0.5 - (y + m.h / 2)) * 0.55;
            axd_g(S, 'diagonal', { paths: [[[W / 2 - dx, H / 2 - dy], [W / 2 + dx, H / 2 + dy]]] }, { stroke: axd_sub(sc), w: lw * 1.2, a: 0.6 }, axd_mid(HD, E));
        } else for (s = -1; s <= 1; s += 2) axd_g(S, 'arm ' + s, { paths: [[[W / 2 + s * r * 2.2, H / 2], [W / 2 + s * (r * 2.2 + W * 0.3), H / 2]]] }, { stroke: axd_sub(sc), w: lw * 1.2, a: 0.6 }, { trim: HD + E + '*100' });
        if (jzP(ctx, 'mark', 'diamond') === 'dot') axd_g(S, 'mark', { ell: [r * 1.6, r * 1.6] }, { fill: acc }, { p: [W / 2, H / 2], sc: HD + 'var e=' + E + '*100;[e,e]' });
        else axd_g(S, 'mark', { paths: [[[-r, 0], [0, -r * 1.4], [r, 0], [0, r * 1.4]]], closed: true }, { fill: acc }, { p: [W / 2, H / 2], sc: HD + 'var e=' + E + '*100;[e,e]' });
        Lm.moveToBeginning();
        axd_anim(ctx, Lm, { mi: 0 });
        var xl = corner ? x : x - m.w / 2;
        return axd_bb(xl, y - m.h / 2, xl + m.w, y + m.h / 2);
    }
});

/* ================================================================== 19 xdWindSway — なびく字
   one text block; the lean is a Skew animator (per-character anchors moved down to the baseline so the feet stay put) whose
   selector expression reads each glyph's column / row. */
axd_reg('xdWindSway', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['display', 'serif', 'serif'])), amp: rng.range(11, 18), speed: rng.range(1.2, 1.9), dir: rng.pick([1, -1]), streaks: rng.chance(0.7), ground: rng.chance(0.75) }; },
    build: function (ctx) {
        var b = axd_base(ctx), W = b.W, H = b.H, sc = b.sc, M = b.M, port = b.port, lw = b.lw, HD = b.HD, seed = b.seed, r, k;
        var L = axd_layRows(b.txt, W * 0.78, H * 0.58, { track: 0.07, lead: 1.5, maxR: port ? 4 : 2, cap: M * 0.26 });
        if (!L.n) return null;
        var str = axd_rowsStr(L.rows), dir = jzP(ctx, 'dir', 1) < 0 ? -1 : 1;
        var Lm = axd_T(ctx, str, { font: jzFontOf(ctx, 'font', 'display'), size: L.size, x: W / 2, y: H / 2, lead: 1.5, track: 0.07, fitW: W * 0.78, fitH: H * 0.58, cap: M * 0.26 });
        var m = axd_m(Lm, str, 1.5), size = m.size, wEst = 0.3, cm = axd_charMap(L.rows);
        for (r = 0; r < L.ws.length; r++) wEst = Math.max(wEst, L.ws[r]);
        var kx = m.w / (wEst * size);
        axd_moreAlign(Lm, [0, 0]);
        axd_anim(ctx, Lm, { mi: 0 });
        jzAnimator(Lm, 'JZ Wind', [['ADBE Text Skew', 60]], HD + 'var j=' + jzArrExpr(cm.col) + '[textIndex-1]||0,r=' + jzArrExpr(cm.row) + '[textIndex-1]||0,gu=0.7+0.3*Math.sin(time*0.7+' + jzN(seed % 7) + ');' +
            jzN(dir * jzP(ctx, 'amp', 14)) + '*gu*(0.3+0.7*(0.5+0.5*Math.sin(time*' + jzN(jzP(ctx, 'speed', 1.5)) + '-' + jzN(dir) + '*j*0.55+r*1.3)))/60*100');
        var S = axd_fadeK(ctx, axd_S(ctx, 'wind'));
        if (jzP(ctx, 'ground', true)) for (r = 0; r < L.R; r++) {
            var y = H / 2 + (r - (L.R - 1) / 2) * 1.5 * size + size * 0.56, hw = (L.ws[r] * kx / 2 + 0.3) * size;
            axd_g(S, 'ground ' + r, { paths: [[[W / 2 - hw, y], [W / 2 + hw, y]]] }, { stroke: axd_sub(sc), w: lw * 1.4, a: 0.7 }, axd_mid(HD, axd_ie(0.6, r * 0.06)));
        }
        if (jzP(ctx, 'streaks', true)) for (k = 0; k < 4; k++) {
            var len = W * (0.05 + 0.06 * jzR(seed, k, 4)), U = 'var u=fr(time*' + jzN(0.16 * (0.8 + 0.3 * jzR(seed, k, 2))) + '+' + jzN(jzR(seed, k, 1)) + ');';
            axd_g(S, 'streak ' + k, { paths: [[[0, 0], [len, 0]]] }, { stroke: sc.sub, w: lw * 1.2 }, {
                pos: HD + U + '[' + jzN(W) + '*' + (dir > 0 ? '(-0.1+1.2*u)' : '(1.1-1.2*u)') + ',' + jzN(H * (0.16 + 0.68 * jzR(seed, k, 3))) + ']', op: HD + U + '40*Math.sin(Math.PI*u)*' + axd_ic(0.5, 0) });
        }
        S.moveToEnd();
        return axd_bb(W / 2 - m.w / 2, H / 2 - m.h / 2, W / 2 + m.w / 2, H / 2 + m.h / 2);
    }
});

/* ================================================================== 20 xdSunShadow — 動く影
   the shadow is a copy of the line flipped and sheared about the ground line by a Transform effect (skew + negative height). */
axd_reg('xdSunShadow', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['display', 'serif'])), dir: rng.pick([1, -1]), sun: rng.chance(0.75), style: rng.pick(['fill', 'fill', 'lines']) }; },
    build: function (ctx) {
        var b = axd_base(ctx), W = b.W, H = b.H, sc = b.sc, M = b.M, port = b.port, lw = b.lw, HD = b.HD, k;
        if (!b.txt) return null;
        var font = jzFontOf(ctx, 'font', 'display'), acc = axd_acc(sc), lines = jzP(ctx, 'style', 'fill') === 'lines', y = H * 0.43;
        var fb = axd_fitBox(b.txt, W * 0.7, H * 0.28, 1.12, 0.02, port ? 3 : 2);
        var Lm = axd_T(ctx, fb.text, { font: font, size: fb.size, x: W / 2, y: y, lead: 1.12, track: 0.02, fitW: W * 0.7, fitH: H * 0.28, cap: M * 0.24 });
        var m = axd_m(Lm, fb.text, 1.12), size = m.size, by = y + m.h / 2 - size * 0.04;
        var SH = 'var u=cl(time/Math.max(0.5,DUR)),sh=' + jzN(jzP(ctx, 'dir', 1) < 0 ? -1 : 1) + '*lp(1.15,0.3,u),ln=0.5+0.34*Math.abs(sh);';
        var C = axd_T(ctx, fb.text, { font: font, size: size, x: W / 2, y: y, lead: 1.12, track: 0.02, color: jzMixHex(sc.bg, sc.fg, lines ? 0.4 : 0.27), name: 'shadow' });
        if (lines) axd_pattern(C, 'lines', size);
        axd_shear(C, W / 2, by, HD + SH + '-Math.atan(sh/ln)/DG', HD + SH + '-ln*100');
        jzFade(ctx, C, 0, 0.5);
        var S = axd_fadeK(ctx, axd_S(ctx, 'ground')), gw = Math.min(W * 0.45, m.w / 2 + size * 1.2);
        axd_g(S, 'ground', { paths: [[[W / 2 - gw, by], [W / 2 + gw, by]]] }, { stroke: axd_sub(sc), w: lw * 1.4, a: 0.7 }, axd_mid(HD, axd_ie(0.6, 0)));
        if (jzP(ctx, 'sun', true)) {
            var Rs = by - H * 0.09, rx = Math.min(Rs, W * 0.42), r = M * 0.02;
            for (k = -6; k <= 6; k++) { var p2 = k * 8.5 * Math.PI / 180; axd_g(S, 'path ' + k, { ell: [lw * 2.6, lw * 2.6] }, { fill: sc.sub }, { p: [W / 2 + Math.sin(p2) * rx, by - Math.cos(p2) * Rs], op: HD + '45*' + axd_ic(0.5, 0.03 * (k + 6)) }); }
            var SP = HD + SH + 'var ph=-sh*50*DG;[' + jzN(W / 2) + '+Math.sin(ph)*' + jzN(rx) + ',' + jzN(by) + '-Math.cos(ph)*' + jzN(Rs) + ']', SS = HD + 'var e=' + axd_ie(0.4, 0.1) + '*100;[e,e]';
            axd_g(S, 'sun', { ell: [r * 2, r * 2] }, { fill: acc }, { pos: SP, sc: SS });
            axd_g(S, 'halo', { ell: [r * 3.8, r * 3.8] }, { stroke: acc, w: lw * 1.4, a: 0.6 }, { pos: SP, sc: SS });
        }
        Lm.moveToBeginning();
        axd_anim(ctx, Lm, { mi: 0 });
        return axd_bb(W / 2 - m.w / 2, y - m.h / 2, W / 2 + m.w / 2, y + m.h / 2);
    }
});

/* ================================================================== 21 xdSkewSweep — 斜体の残像 */
axd_reg('xdSkewSweep', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['display', 'serif'])), dir: rng.pick([1, -1]), K: rng.int(4, 6), total: rng.range(36, 50), style: rng.pick(['outline', 'outline', 'dim']) }; },
    build: function (ctx) {
        var b = axd_base(ctx), W = b.W, H = b.H, sc = b.sc, M = b.M, port = b.port, lw = b.lw, HD = b.HD, k;
        if (!b.txt) return null;
        var font = jzFontOf(ctx, 'font', 'display'), dir = jzP(ctx, 'dir', 1) < 0 ? -1 : 1, KN = jzP(ctx, 'K', 5), bw = W * (port ? 0.7 : 0.6);
        var fb = axd_fitBox(b.txt, bw, H * 0.3, 1.15, 0.02, port ? 3 : 2);
        var Lm = axd_T(ctx, fb.text, { font: font, size: fb.size, x: W / 2, y: H / 2, lead: 1.15, track: 0.02, fitW: bw, fitH: H * 0.3, cap: M * 0.24 });
        var m = axd_m(Lm, fb.text, 1.15), size = m.size, by = H / 2 + m.h / 2 - size * 0.05, x = W / 2 - dir * Math.min(m.h * 0.3, W * 0.06);
        jzXf(Lm, 'ADBE Position').setValue([x, H / 2]);
        var AX = 'var sa=' + jzN(jzP(ctx, 'total', 42) / KN) + '*(0.12+0.88*oe(time/0.8))*(0.86+0.14*Math.sin(time*0.9));';
        for (k = KN; k >= 1; k--) {
            var C = axd_copy(ctx, fb.text, { font: font, size: size, x: x, y: H / 2, lead: 1.15, track: 0.02 }, jzP(ctx, 'style', 'outline'), Math.max(0, 0.9 - 0.12 * k));
            axd_shear(C, x, by, HD + AX + 'Math.max(-70,Math.min(70,' + jzN(k * dir) + '*sa))', null);
            jzFade(ctx, C, 0.04 * k, 0.4);
        }
        var S = axd_fadeK(ctx, axd_S(ctx, 'baseline')), hw = m.w / 2 + size * 0.3;
        axd_g(S, 'baseline', { paths: [[[x - hw, by + size * 0.08], [x + hw, by + size * 0.08]]] }, { stroke: axd_acc(sc), w: lw * 2 }, axd_mid(HD, axd_ie(0.6, 0)));
        Lm.moveToBeginning();
        axd_anim(ctx, Lm, { mi: 0 });
        return axd_bb(x - m.w / 2, H / 2 - m.h / 2, x + m.w / 2, H / 2 + m.h / 2);
    }
});

/* ================================================================== 22 xdStretchEcho — 縦伸びエコー */
axd_reg('xdStretchEcho', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['display', 'serif'])), mode: rng.pick(['up', 'up', 'both']), K: rng.int(3, 4), q: rng.range(0.42, 0.58), style: rng.pick(['outline', 'outline', 'dim']) }; },
    build: function (ctx) {
        var b = axd_base(ctx), W = b.W, H = b.H, M = b.M, port = b.port, HD = b.HD, k;
        if (!b.txt) return null;
        var font = jzFontOf(ctx, 'font', 'display'), KN = jzP(ctx, 'K', 3), q = jzP(ctx, 'q', 0.5), maxSy = 1 + KN * q, up = jzP(ctx, 'mode', 'up') === 'up';
        var fb = axd_fitBox(b.txt, W * 0.84, H * 0.7 / maxSy, 1.08, 0.03, port ? 3 : 1);
        var Lm = axd_T(ctx, fb.text, { font: font, size: fb.size, x: W / 2, y: H / 2, lead: 1.08, track: 0.03, fitW: W * 0.84, fitH: H * 0.7 / maxSy, cap: M * 0.2 });
        var m = axd_m(Lm, fb.text, 1.08), size = m.size, by = H / 2 + m.h * maxSy / 2, y = up ? by - m.h / 2 : H / 2;
        jzXf(Lm, 'ADBE Position').setValue([W / 2, y]);
        for (k = KN; k >= 1; k--) {
            var C = axd_copy(ctx, fb.text, { font: font, size: size, x: W / 2, y: y, lead: 1.08, track: 0.03 }, jzP(ctx, 'style', 'outline'), Math.max(0, 0.85 - 0.15 * k));
            if (up) axd_pivot(C, W / 2, by);
            jzSetExpr(jzXf(C, 'ADBE Scale'), HD + '[value[0],value[1]*(1+' + jzN(k * q) + '*' + axd_ie(0.7, k * 0.06) + '*(1+0.06*Math.sin(time*1.3+' + jzN(k * 0.9) + ')))]');
            jzFade(ctx, C, k * 0.05, 0.3);
        }
        Lm.moveToBeginning();
        axd_anim(ctx, Lm, { mi: 0 });
        return axd_bb(W / 2 - m.w / 2, y - m.h / 2, W / 2 + m.w / 2, y + m.h / 2);
    }
});

/* ================================================================== 23 xdColumnEcho — 縦こだま
   three glyph layers (one per echo generation): every glyph's echo travels, shrinks and fades by animator expressions. */
axd_reg('xdColumnEcho', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['display', 'serif'])), speed: rng.range(0.22, 0.36), style: rng.pick(['outline', 'outline', 'dim']), mode: rng.pick(['alt', 'alt', 'pair']) }; },
    build: function (ctx) {
        var b = axd_base(ctx), W = b.W, H = b.H, sc = b.sc, M = b.M, port = b.port, HD = b.HD, s, k;
        var sl = axd_cells(b.txt), N = sl.length, n = axd_cnt(sl), pk = 1.08;
        if (!N) return null;
        var size = port ? Math.min(H * 0.82 / (N * pk), W * 0.165) : Math.min(W * 0.86 / (N * pk), H * 0.165, M * 0.2);
        var font = jzFontOf(ctx, 'font', 'display'), dim = jzP(ctx, 'style', 'outline') === 'dim', cells = [], slot = [], bb = null, gi = 0;
        function XY(q, d) { return port ? [W / 2 + d, H / 2 + (q - (N - 1) / 2) * size * pk] : [W / 2 + (q - (N - 1) / 2) * size * pk, H / 2 + d]; }
        for (s = 0; s < N; s++) if (!axd_isSp(sl[s])) { cells.push(sl[s]); slot.push(s); }
        var P0 = XY(0, 0);
        for (k = 0; k < 3; k++) {
            var G = axd_G(ctx, cells, dim ? { font: font, size: size, color: jzMixHex(sc.bg, sc.fg, 0.3), opacity: 0.9, name: 'echo ' + k } :
                { font: font, size: size, fill: false, stroke: Math.max(1.5, size * 0.016), strokeColor: sc.fg, opacity: 0.75, name: 'echo ' + k });
            var body = 'var u=' + k + '+fr(time*' + jzN(jzP(ctx, 'speed', 0.3)) + '+i*0.37),d=' + jzN(size) + '*(0.3+0.6*u)*(' + (jzP(ctx, 'mode', 'alt') === 'alt' ? 'i%2' : 'Math.floor(i/2)%2') + '?1:-1),q=' + jzArrExpr(slot) + '[i];' +
                's=1-0.1*u;a=(1-u/3)*cl(u*2.2);' + (port ? 'x=' + jzN(P0[0]) + '+d;y=' + jzN(P0[1]) + '+q*' + jzN(size * pk) : 'x=' + jzN(P0[0]) + '+q*' + jzN(size * pk) + ';y=' + jzN(P0[1]) + '+d');
            axd_GX(ctx, G, 'JZ Echo', HD, body, 'psa');
            jzFade(ctx, G.L, 0.15, 0.5);
        }
        for (s = 0; s < N; s++) {
            if (axd_isSp(sl[s])) continue;
            var p = XY(s, 0);
            axd_put(ctx, sl[s], { font: font, size: size, sx: axd_sqz(sl[s]), x: p[0], y: p[1], mi: axd_miOf(gi++, n) });
            bb = axd_bbc(bb, p[0], p[1], size / 2, size / 2);
        }
        return bb;
    }
});

/* ================================================================== 24 xdSkyline — 伸び縮み
   one text block; every glyph is stretched upwards from its baseline by a vertical Scale animator (per-character anchors on
   the baseline). The browser stretches from the bottom of the em box, a little below the baseline. */
axd_reg('xdSkyline', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['display'])), mode: rng.pick(['wave', 'wave', 'rand']), A: rng.range(0.8, 1.25), speed: rng.range(0.8, 1.3), sx: rng.pick([0.82, 0.9, 1]), ground: rng.chance(0.8) }; },
    build: function (ctx) {
        var b = axd_base(ctx), W = b.W, H = b.H, sc = b.sc, M = b.M, port = b.port, lw = b.lw, HD = b.HD, seed = b.seed, r, i;
        var n0 = jzCount(b.txt), AA = jzP(ctx, 'A', 1), sx = jzP(ctx, 'sx', 1), sp = jzP(ctx, 'speed', 1), rowK = 1 + AA, lead = rowK + 0.32;
        var L = axd_layRows(b.txt, W * 0.84 / sx, H * 0.78, { track: 0.03, lead: lead, maxR: port ? 3 : (n0 > 9 ? 2 : 1), cap: M * 0.2 });
        if (!L.n) return null;
        var str = axd_rowsStr(L.rows);
        var Lm = axd_T(ctx, str, { font: jzFontOf(ctx, 'font', 'display'), size: L.size, x: W / 2, y: H / 2, lead: lead, track: 0.03, fitW: W * 0.84 / sx, fitH: H * 0.78, cap: M * 0.2 });
        var m = axd_m(Lm, str, lead), size = m.size, top = H / 2 - (L.R * lead - 0.32) * size / 2, wEst = 0.3, cm = axd_charMap(L.rows), r1 = [], r2 = [];
        for (r = 0; r < L.ws.length; r++) wEst = Math.max(wEst, L.ws[r]);
        var kx = m.w / (wEst * size);
        // first baseline at the layer origin: row r stands on top + r*lead*size + rowK*size (em-box bottom = baseline + 0.12 em)
        jzXf(Lm, 'ADBE Anchor Point').setValue([0, 0]);
        jzXf(Lm, 'ADBE Position').setValue([W / 2, top + rowK * size - (0.5 - AXD_CY) * size]);
        if (sx !== 1) jzXf(Lm, 'ADBE Scale').setValue([sx * 100, 100]);
        axd_moreAlign(Lm, [0, 0]);
        axd_anim(ctx, Lm, { mi: 0 });
        for (i = 0; i < L.n; i++) { r1.push(jzR(seed, i, 1) * 6.3); r2.push(jzR(seed, i, 2) * 6.3); }
        var LV = jzP(ctx, 'mode', 'wave') === 'wave' ? '0.5+0.5*Math.sin(time*' + jzN(sp * 1.6) + '-i*0.95)' :
            '0.5+0.27*Math.sin(time*' + jzN(sp * 1.9) + '+' + jzArrExpr(r1) + '[i])+0.23*Math.sin(time*' + jzN(sp * 1.1) + '+' + jzArrExpr(r2) + '[i])';
        jzAnimator(Lm, 'JZ Skyline', [['ADBE Text Scale 3D', [100, 300, 100]]], HD + 'var i=' + jzArrExpr(cm.gi) + '[textIndex-1];i==null||i<0?0:Math.min(100,' + jzN(AA) + '*(' + LV + ')*50)');
        if (jzP(ctx, 'ground', true)) {
            var S = axd_fadeK(ctx, axd_S(ctx, 'ground'));
            for (r = 0; r < L.R; r++) {
                var y = top + r * lead * size + rowK * size + size * 0.07, hw = (L.ws[r] * kx * sx / 2 + 0.2) * size;
                axd_g(S, 'ground ' + r, { paths: [[[W / 2 - hw, y], [W / 2 + hw, y]]] }, { stroke: axd_acc(sc), w: lw * 2.4 }, axd_mid(HD, axd_ie(0.6, r * 0.06)));
            }
            S.moveToEnd();
        }
        return axd_bb(W / 2 - m.w * sx / 2, top, W / 2 + m.w * sx / 2, top + (L.R * lead - 0.32) * size);
    }
});

/* ================================================================== 25 xdSpiralEcho — 渦巻きコピー */
axd_reg('xdSpiralEcho', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['display', 'serif'])), dir: rng.pick([1, -1]), K: rng.int(6, 8), th: rng.range(17, 24), q: rng.range(0.8, 0.85), style: rng.pick(['outline', 'outline', 'dim']) }; },
    build: function (ctx) {
        var b = axd_base(ctx), W = b.W, H = b.H, sc = b.sc, M = b.M, port = b.port, HD = b.HD, k;
        if (!b.txt) return null;
        var font = jzFontOf(ctx, 'font', 'display'), dir = jzP(ctx, 'dir', 1) < 0 ? -1 : 1, KN = jzP(ctx, 'K', 7), bw = W * (port ? 0.74 : 0.5);
        var fb = axd_fitBox(b.txt, bw, H * 0.2, 1.12, 0.02, port ? 3 : 2);
        var Lm = axd_T(ctx, fb.text, { font: font, size: fb.size, x: W / 2, y: H / 2, lead: 1.12, track: 0.02, fitW: bw, fitH: H * 0.2, cap: M * 0.19 });
        var m = axd_m(Lm, fb.text, 1.12), size = m.size, r0 = Math.max(m.h * 1.25, Math.min(H * 0.26, m.w * 0.5));
        var y = H / 2 - r0 * 0.5, x = W / 2 - dir * m.w * 0.12, px = x - dir * m.w * 0.16, py = y + r0;
        jzXf(Lm, 'ADBE Position').setValue([x, y]);
        for (k = KN; k >= 1; k--) {
            var C = axd_copy(ctx, fb.text, { font: font, size: size, x: x, y: y, lead: 1.12, track: 0.02 }, jzP(ctx, 'style', 'outline'), Math.max(0, 0.9 - 0.09 * k)), s2 = Math.pow(jzP(ctx, 'q', 0.82), k);
            axd_pivot(C, px, py);
            jzXf(C, 'ADBE Scale').setValue([s2 * 100, s2 * 100]);
            jzSetExpr(jzXf(C, 'ADBE Rotate Z'), HD + 'value+' + jzN(dir * k * jzP(ctx, 'th', 20)) + '*(0.15+0.85*' + axd_ie(0.9, 0) + ')*(1+0.07*Math.sin(time*0.8))');
            jzFade(ctx, C, 0.04 * k, 0.4);
        }
        var S = axd_fadeK(ctx, axd_S(ctx, 'pivot'));
        axd_g(S, 'pin', { ell: [size * 0.09, size * 0.09] }, { fill: axd_acc(sc) }, { p: [px, py], sc: HD + 'var e=' + axd_ie(0.3, 0) + '*100;[e,e]' });
        Lm.moveToBeginning();
        axd_anim(ctx, Lm, { mi: 0 });
        return axd_bb(x - m.w / 2, y - m.h / 2, x + m.w / 2, y + m.h / 2);
    }
});

/* ================================================================== 26 xdRipple — 波紋の字 */
axd_reg('xdRipple', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['serif', 'display', 'body'])), shape: rng.pick(['ring', 'ring', 'square']), sync: rng.pick(['wave', 'rand']), speed: rng.range(0.32, 0.5), K: rng.pick([2, 3]) }; },
    build: function (ctx) {
        var b = axd_base(ctx), W = b.W, H = b.H, sc = b.sc, M = b.M, port = b.port, lw = b.lw, i, k;
        var L = axd_layRows(b.txt, W * 0.76, H * 0.6, { mono: 1, track: 0.34, lead: 1.62, maxR: port ? 5 : 3, cap: M * 0.19 }), size = L.size;
        if (!L.n) return null;
        var font = jzFontOf(ctx, 'font', 'serif'), col = axd_sub(sc), KN = jzP(ctx, 'K', 2), ring = jzP(ctx, 'shape', 'ring') !== 'square', bb = null;
        var S = axd_S(ctx, 'ripples');
        for (i = 0; i < L.g.length; i++) {
            var g = L.g[i], x = W / 2 + g.ex * size, y = H / 2 + g.ey * size, ph = jzP(ctx, 'sync', 'wave') === 'wave' ? -g.i * 0.14 : jzR(b.seed, g.i, 5);
            for (k = 0; k < KN; k++) {
                var U = AXD_LITE + 'var u=fr(time*' + jzN(jzP(ctx, 'speed', 0.4)) + '+' + jzN(k / KN + ph) + ');';
                axd_g(S, 'ring ' + i + '.' + k, ring ? { ell: [size, size] } : { rect: [size, size], round: size * 0.13 }, { stroke: col, w: lw * 2 }, {
                    p: [x, y], size: U + 'var d=' + jzN(size * 2) + '*(0.5+0.62*u);[d,d]', op: U + 'Math.pow(1-u,1.2)*cl(u*5)*95' });
            }
            bb = axd_bbc(bb, x, y, size / 2, size / 2);
        }
        jzFade(ctx, S, 0.1, 0.6);
        for (i = 0; i < L.g.length; i++) axd_put(ctx, L.g[i].t, { font: font, size: size, sx: axd_sqz(L.g[i].t), x: W / 2 + L.g[i].ex * size, y: H / 2 + L.g[i].ey * size, mi: axd_miOf(L.g[i].i, L.n) });
        return bb;
    }
});

/* ================================================================== 27 xdFourUp — 四面刷り
   the copies are text layers in the five copy styles; when the fills swap, every cell holds one layer per style and the
   opacity expression shows the one whose turn it is. */
axd_reg('xdFourUp', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['display'])), main: rng.int(0, 3), cyc: rng.chance(0.65), cross: rng.chance(0.8), rot: rng.int(0, 3), per: rng.range(0.7, 1.1) }; },
    build: function (ctx) {
        var b = axd_base(ctx), W = b.W, H = b.H, sc = b.sc, M = b.M, port = b.port, lw = b.lw, HD = b.HD, i, j, r, k = 0;
        if (!b.txt) return null;
        var n = jzCount(b.txt), col1 = port && n > 4, C = col1 ? 1 : 2, R = col1 ? 4 : 2, cw = W * 0.92 / C, ch = H * 0.9 / R, font = jzFontOf(ctx, 'font', 'display');
        var fb = axd_fitBox(b.txt, cw * 0.84, ch * 0.7, 1.12, 0.02, 3), kinds = ['outline', 'stripes', 'dots', 'lines', 'dim'], cyc = jzP(ctx, 'cyc', true), rot = jzP(ctx, 'rot', 0), mi0 = jzP(ctx, 'main', 0) % (C * R);
        function at(q) { return [W / 2 + ((q % C) - (C - 1) / 2) * cw, H / 2 + (Math.floor(q / C) - (R - 1) / 2) * ch]; }
        var pm = at(mi0), Lm = axd_T(ctx, fb.text, { font: font, size: fb.size, x: pm[0], y: pm[1], lead: 1.12, track: 0.02, fitW: cw * 0.84, fitH: ch * 0.7, cap: M * 0.2 });
        var m = axd_m(Lm, fb.text, 1.12), size = m.size;
        if (jzP(ctx, 'cross', true)) {
            var S = axd_fadeK(ctx, axd_S(ctx, 'register lines')), colr = axd_sub(sc), E = axd_ie(0.6, 0);
            if (C > 1) axd_g(S, 'v', { paths: [[[W / 2, H / 2 - H * 0.45], [W / 2, H / 2 + H * 0.45]]] }, { stroke: colr, w: lw * 1.3, a: 0.7 }, axd_mid(HD, E));
            for (r = 1; r < R; r++) axd_g(S, 'h ' + r, { paths: [[[W / 2 - W * 0.46, H / 2 + (r - R / 2) * ch], [W / 2 + W * 0.46, H / 2 + (r - R / 2) * ch]]] }, { stroke: colr, w: lw * 1.3, a: 0.7 }, axd_mid(HD, E));
        }
        for (i = 0; i < C * R; i++) {
            if (i === mi0) continue;
            var p = at(i), o = { font: font, size: size, x: p[0], y: p[1], lead: 1.12, track: 0.02 }, FD = axd_ic(0.35, 0.1 + k * 0.1) + '*K';
            if (!cyc) axd_opx(axd_copy(ctx, fb.text, o, kinds[(k + rot) % 5], 1), HD + 'value*' + FD);
            else for (j = 0; j < 5; j++) axd_opx(axd_copy(ctx, fb.text, o, kinds[j], 1), HD + 'value*' + FD + '*(((' + (k + rot) + '+Math.floor(Math.max(0,time-0.5)/' + jzN(jzP(ctx, 'per', 0.9)) + '))%5)==' + j + '?1:0)');
            k++;
        }
        Lm.moveToBeginning();
        axd_anim(ctx, Lm, { mi: 0 });
        return axd_bb(pm[0] - m.w / 2, pm[1] - m.h / 2, pm[0] + m.w / 2, pm[1] + m.h / 2);
    }
});

/* ================================================================== 28 xdTrace — なぞり書き
   text blocks: the lyric on top, below it a faint copy and an outlined copy whose glyphs appear one after another (an
   Opacity animator). The browser draws each outline stroke on progressively; a text stroke cannot be trimmed in AE. */
axd_reg('xdTrace', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['display', 'serif', 'serif'])), C: rng.pick([2, 2, 3]), guide: rng.chance(0.8), col: rng.pick(['fg', 'accent', 'fg']) }; },
    build: function (ctx) {
        var b = axd_base(ctx), W = b.W, H = b.H, sc = b.sc, M = b.M, port = b.port, lw = b.lw, HD = b.HD, r, bi;
        var n0 = jzCount(b.txt), o = { track: 0.06, lead: 1.2, maxR: port ? (n0 > 10 ? 3 : (n0 > 5 ? 2 : 1)) : 1 };
        var L = axd_layRows(b.txt, W * 0.84, H, o);
        if (!L.n) return null;
        var R0 = L.R, C = Math.max(1, Math.min(jzP(ctx, 'C', 2), R0 >= 3 ? 1 : (R0 === 2 ? 2 : 3))), gapK = 1.3, str = axd_rowsStr(L.rows), font = jzFontOf(ctx, 'font', 'display');
        var Lm = axd_T(ctx, str, { font: font, size: Math.min(L.size, M * 0.19), x: W / 2, y: H / 2, lead: 1.2, track: 0.06, fitW: W * 0.84, fitH: H * 0.8 / ((C + 1) * gapK), cap: M * 0.19 });
        var m = axd_m(Lm, str, 1.2), size = m.size, hb = (L.R * 1.2 - 0.2) * size, pit = hb * gapK, top = H / 2 - ((C + 1) * pit - (pit - hb)) / 2;
        var tc = jzP(ctx, 'col', 'fg') === 'accent' ? axd_acc(sc) : sc.fg, dt = jzClamp((b.dur * 0.82 - 0.35) / Math.max(1, C * L.n), 0.03, 0.16), cm = axd_charMap(L.rows);
        jzXf(Lm, 'ADBE Position').setValue([W / 2, top + hb / 2]);
        var S = jzP(ctx, 'guide', true) ? axd_fadeK(ctx, axd_S(ctx, 'guides')) : null, hw = m.w / 2 + size * 0.2;
        for (bi = 0; bi <= C; bi++) {
            var cy = top + bi * pit + hb / 2;
            if (S) for (r = 0; r < L.R; r++) {
                var y = cy + (r - (L.R - 1) / 2) * 1.2 * size + size * 0.56;
                axd_g(S, 'guide ' + bi + '.' + r, { paths: [[[W / 2 - hw, y], [W / 2 + hw, y]]] }, { stroke: sc.sub, w: lw, a: 0.5 }, axd_mid(HD, axd_ie(0.5, bi * 0.08)));
            }
            if (!bi) continue;
            jzFade(ctx, axd_T(ctx, str, { font: font, size: size, x: W / 2, y: cy, lead: 1.2, track: 0.06, color: jzMixHex(sc.bg, sc.fg, 0.12), name: 'trace ground ' + bi }), 0.1, 0.4);
            var T = axd_T(ctx, str, { font: font, size: size, x: W / 2, y: cy, lead: 1.2, track: 0.06, fill: false, stroke: Math.max(1.6, size * 0.022), strokeColor: tc, name: 'trace ' + bi });
            axd_show(T, 'JZ Trace', HD, 'var i=' + jzArrExpr(cm.gi) + '[textIndex-1]||0;a=cl((time-0.35-(' + ((bi - 1) * L.n) + '+Math.max(0,i))*' + jzN(dt) + ')/' + jzN(dt * 2.4) + ')');
            axd_opx(T, jzTH(ctx) + 'value*K');
        }
        if (S) S.moveToEnd();
        Lm.moveToBeginning();
        axd_anim(ctx, Lm, { mi: 0 });
        return axd_bb(W / 2 - m.w / 2, top, W / 2 + m.w / 2, top + hb);
    }
});

/* ================================================================== 29 xdTide — 満ち潮
   the lyric twice: foreground colour below, water colour on top with a mask whose path follows the water line (createPath
   in comp space through fromComp). Water line / body = createPath groups. */
axd_reg('xdTide', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['display', 'display', 'serif'])), lvl: rng.range(0.5, 0.78), col: rng.pick(['accent', 'accent', 'accent2']), speed: rng.range(1.4, 2.2) * rng.pick([1, -1]), body: rng.chance(0.8) }; },
    build: function (ctx) {
        var b = axd_base(ctx), W = b.W, H = b.H, sc = b.sc, M = b.M, port = b.port, lw = b.lw, HD = b.HD;
        if (!b.txt) return null;
        var font = jzFontOf(ctx, 'font', 'display');
        var fb = axd_fitBox(b.txt, W * 0.84, H * 0.5, 1.2, 0.02, port ? 4 : 2);
        var Lm = axd_T(ctx, fb.text, { font: font, size: fb.size, x: W / 2, y: H / 2, lead: 1.2, track: 0.02, fitW: W * 0.84, fitH: H * 0.5, cap: M * 0.32 });
        var m = axd_m(Lm, fb.text, 1.2), size = m.size, y1 = H / 2 + m.h / 2;
        var wc = jzP(ctx, 'col', 'accent') === 'accent2' && sc.accent2 && jzContrast(sc.accent2, sc.bg) >= 2 ? sc.accent2 : axd_acc(sc);
        if (wc === sc.fg) wc = jzMixHex(sc.fg, sc.bg, 0.45);
        var WV = HD + 'var u=ios(cl(time/' + jzN(Math.max(0.6, b.dur * 0.85)) + ')),ys=lp(' + jzN(y1 + size * 0.3) + ',' + jzN(y1 - m.h * jzP(ctx, 'lvl', 0.65)) + ',u),am=' + jzN(size * 0.05) + ',tt=time*' + jzN(jzP(ctx, 'speed', 1.8)) + ',ww=' + jzN(W) + ';' +
            'function wy(x){return ys+am*Math.sin(x/ww*TAU*2.2+tt)+am*0.45*Math.sin(x/ww*TAU*5.1-tt*1.6);}var p=[];';
        var LOOP = 'for(var k=0;k<=40;k++){var x=-ww*0.05+ww*1.1*k/40;', seed0 = [[-W * 0.05, y1], [W * 1.05, y1]];
        var S = axd_S(ctx, 'water');
        axd_g(S, 'water line', { paths: [seed0] }, { stroke: wc, w: lw * 2, a: 0.85 }, { path: WV + LOOP + 'p.push([x,wy(x)]);}createPath(p,[],[],false)' });
        if (jzP(ctx, 'body', true)) axd_g(S, 'water body', { paths: [[seed0[0], seed0[1], [W * 1.05, H * 1.2], [-W * 0.05, H * 1.2]]], closed: true }, { fill: wc, a: 0.13 }, {
            path: WV + LOOP + 'p.push([x,wy(x)]);}p.push([ww*1.05,' + jzN(H * 1.2) + ']);p.push([-ww*0.05,' + jzN(H * 1.2) + ']);createPath(p,[],[],true)' });
        jzFade(ctx, S, 0, 0.5);
        S.moveToEnd();
        axd_anim(ctx, Lm, { mi: 0 });
        var Lw = axd_T(ctx, fb.text, { font: font, size: size, x: W / 2, y: H / 2, lead: 1.2, track: 0.02, color: wc });
        try {
            var mk = jzMaskRect(Lw, -W, 0, W * 2, H * 2);
            jzSetExpr(mk.property('ADBE Mask Shape'), WV + 'var q;' + LOOP + 'q=fromComp([x,wy(x)]);p.push([q[0],q[1]]);}q=fromComp([ww*1.05,' + jzN(H * 1.2) + ']);p.push([q[0],q[1]]);q=fromComp([-ww*0.05,' + jzN(H * 1.2) + ']);p.push([q[0],q[1]]);createPath(p,[],[],true)');
        } catch (e) { jzWarn('xdTide mask: ' + e.toString()); }
        axd_anim(ctx, Lw, { mi: 0 });
        return axd_bb(W / 2 - m.w / 2, H / 2 - m.h / 2, W / 2 + m.w / 2, H / 2 + m.h / 2);
    }
});

/* ================================================================== 30 xdStitch — 縫い目
   the thread is a sampled cosine path drawn on with Trim Paths; 'dash' = a dashed stroke whose dash offset crawls. */
axd_reg('xdStitch', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['display', 'serif'])), style: rng.pick(['dash', 'dash', 'knot']), speed: rng.range(0.5, 0.9) * rng.pick([1, -1]), first: rng.pick([1, -1]), col: rng.pick(['accent', 'accent', 'sub']) }; },
    build: function (ctx) {
        var b = axd_base(ctx), W = b.W, H = b.H, sc = b.sc, M = b.M, port = b.port, lw = b.lw, HD = b.HD, r, i, j;
        var n0 = jzCount(b.txt), pk = 1.3;
        var L = axd_layRows(b.txt, W * 0.78, H * 0.6, { mono: pk, spw: pk, lead: 2.0, maxR: port ? 4 : (n0 > 9 ? 2 : 1), cap: M * 0.19 }), size = L.size;
        if (!L.n) return null;
        var A = size * 0.68, col = jzP(ctx, 'col', 'accent') === 'accent' ? axd_acc(sc) : axd_sub(sc), dx = size * 0.15, first = jzP(ctx, 'first', 1) < 0 ? -1 : 1, knot = jzP(ctx, 'style', 'dash') === 'knot';
        var font = jzFontOf(ctx, 'font', 'display'), S = axd_fadeK(ctx, axd_S(ctx, 'thread')), bb = null;
        for (r = 0; r < L.R; r++) {
            var cy = H / 2 + (r - (L.R - 1) / 2) * L.lead * size, w = L.ws[r] * size, x0 = W / 2 - w / 2 + pk * size / 2, xa = x0 - pk * size * 0.75, xb = x0 + w - pk * size * 0.25, pts = [], x;
            for (x = xa; x < xb; x += dx / 2) pts.push([x, cy - first * A * Math.cos(Math.PI * (x - x0) / (pk * size))]);
            pts.push([xb, cy - first * A * Math.cos(Math.PI * (xb - x0) / (pk * size))]);
            var E = 'iocu((time-' + jzN(r * 0.1) + ')/0.8)';
            axd_g(S, 'thread ' + r, { paths: [pts] }, knot ? { stroke: col, w: lw * 1.6, a: 0.85 } :
                { stroke: col, w: lw * 2.2, a: 0.9, dash: [dx * 1.15, dx * 0.85, AXD_LITE + '-fr(time*' + jzN(jzP(ctx, 'speed', 0.7)) + ')*' + jzN(dx * 2)] }, { trim: HD + E + '*100' });
            if (knot) for (j = 0; x0 + (j - 0.5) * pk * size <= xb; j++) {
                var kx = x0 + (j - 0.5) * pk * size;
                axd_g(S, 'knot ' + r + '.' + j, { ell: [lw * 6, lw * 6] }, { fill: col }, { p: [kx, cy], op: HD + '(' + E + '>=' + jzN((kx - xa) / Math.max(1, xb - xa)) + '?100:0)' });
            }
            var ND = HD + 'var e=' + E + ',xe=lp(' + jzN(xa) + ',' + jzN(xb) + ',e);function ya(x){return ' + jzN(cy) + '-' + jzN(first * A) + '*Math.cos(Math.PI*(x-' + jzN(x0) + ')/' + jzN(pk * size) + ');}';
            axd_g(S, 'needle ' + r, { paths: [[[0, 0], [size * 0.3, 0]]] }, { stroke: sc.fg, w: lw * 1.6 }, { pos: ND + '[xe,ya(xe)]', rot: ND + 'Math.atan2((ya(xe+1)-ya(xe-1))/2,1)/DG', op: ND + '(e>0.02&&e<1)?100:0' });
        }
        for (i = 0; i < L.g.length; i++) {
            var g = L.g[i], sgn = (Math.round(g.ex / pk + L.ws[g.r] / pk / 2 - 0.5) % 2 ? -1 : 1) * first, gx = W / 2 + g.ex * size, gy = H / 2 + g.ey * size + sgn * size * 0.07;
            axd_put(ctx, g.t, { font: font, size: size, sx: axd_sqz(g.t), x: gx, y: gy, mi: axd_miOf(g.i, L.n) });
            bb = axd_bbc(bb, gx, gy, size / 2, size / 2);
        }
        return bb;
    }
});
