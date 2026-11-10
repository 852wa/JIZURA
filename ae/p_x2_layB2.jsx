// ================================================================ pack x2layB part 2 (AE port of src/11p_x2_layB.js): layouts 16-30
// xbDiamond xbShapeLens xbConstruct xbGolden xbVenn xbSlitDisc xbDial xbCrosshair xbStripeDisc xbWedge xbGradBars xbGraph xbPie
// xbCircleFit xbTriangleSet
// (helpers and techniques: see ae/p_x2_layB1.jsx)

/* ---- rows of glyphs that draw a silhouette (diamond / triangle) */
var AXB_DIA = { 1: [1], 2: [2], 3: [3], 4: [1, 2, 1], 5: [1, 3, 1], 6: [1, 2, 2, 1], 7: [2, 3, 2], 8: [1, 3, 3, 1], 9: [2, 5, 2], 10: [3, 4, 3], 11: [3, 5, 3], 12: [2, 4, 4, 2], 13: [1, 3, 5, 3, 1], 14: [3, 4, 4, 3], 15: [1, 4, 5, 4, 1], 16: [3, 5, 5, 3] };
var AXB_DIAW = axb_mix(AXB_DIA, { 6: [1, 4, 1], 9: [2, 5, 2], 12: [3, 6, 3], 14: [2, 5, 5, 2] });
var AXB_TRI = { 1: [1], 2: [2], 3: [1, 2], 4: [1, 3], 5: [2, 3], 6: [1, 2, 3], 7: [3, 4], 8: [1, 3, 4], 9: [2, 3, 4], 10: [1, 2, 3, 4], 11: [2, 4, 5], 12: [3, 4, 5], 13: [1, 3, 4, 5], 14: [2, 3, 4, 5], 15: [1, 2, 3, 4, 5], 16: [1, 2, 3, 4, 6] };
function axb_shapeRows(txt, table, rev) {
    if (jzIsLatinText(txt)) return null;
    var a = jzChars(String(txt).replace(/\s+/g, '')), pat = table[a.length], rows = [], k = 0, i, out = [];
    if (!pat) return null;
    if (rev) pat = pat.slice().reverse();
    for (i = 0; i < pat.length; i++) { rows.push(a.slice(k, k + pat[i])); k += pat[i]; }
    for (i = 1; i < rows.length; i++) while (rows[i].length > 1 && (axb_closeP(rows[i][0]) || axb_isSmall(rows[i][0]) || rows[i][0] === 'ー')) rows[i - 1].push(rows[i].shift());
    for (i = 0; i < rows.length; i++) out.push(rows[i].join(''));
    return out;
}
// half disc (centre cx, cy; radius r): up = the top half, else the bottom half
function axb_halfDisc(cx, cy, r, up) {
    var k = 0.5523 * r;
    return up ? { v: [[cx - r, cy], [cx, cy - r], [cx + r, cy]], i: [[0, 0], [-k, 0], [0, -k]], o: [[0, -k], [k, 0], [0, 0]] }
        : { v: [[cx + r, cy], [cx, cy + r], [cx - r, cy]], i: [[0, 0], [k, 0], [0, k]], o: [[0, k], [-k, 0], [0, 0]] };
}

/* ================================================================== 16 xbDiamond — 菱形組 */
axb_reg('xbDiamond', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['display', 'serif'])), style: rng.pick(['plate', 'plate', 'outline']), col: rng.pick(['ink', 'accent', 'fg']), spin: rng.pick([1, -1]) }; },
    build: function (ctx) {
        var B = axb_base(ctx), W = B.W, H = B.H, sc = B.sc, M = B.M, lw = B.lw, txt = B.txt, font = axb_font(ctx, 'font', 'display'), i;
        var rows = axb_shapeRows(txt, W > H * 1.2 ? AXB_DIAW : AXB_DIA, false) || axb_fitBox(txt, font, W * 0.5, H * 0.36, { track: 0.04 }, 3).text.split('\n'), Rn = rows.length, lead = 1.16;
        var b0 = Rn * 100 * lead / 2 + 78, a0 = 1;
        for (i = 0; i < Rn; i++) a0 = Math.max(a0, axb_meas(rows[i], 100, { font: font, track: 0.04 }).w / 2 / (1 - (Math.abs(i - (Rn - 1) / 2) * 100 * lead + 44) / b0));
        var k = Math.min(W * 0.47 / a0, H * 0.465 / b0, M * 0.0027), size = 100 * k, a = a0 * k, b = b0 * k, cx = W / 2, cy = H / 2;
        var plate = axb_pickPlate(sc, jzP(ctx, 'col', 'ink')), solid = jzP(ctx, 'style', 'plate') === 'plate', acc = axb_accentOn(sc), g = M * 0.03, S = axb_sheet(ctx, 'diamond');
        // the plate pops up while it turns level
        var o = { pre: 'var e=ob(time/0.5,1.2);', piv: [cx, cy], sc: '[e,e]', rot: '(1-' + axb_iE(0.6, 0) + ')*' + jzN(45 * (jzP(ctx, 'spin', 1) < 0 ? -1 : 1)), op: 'K' };
        var dia = [[cx, cy - b], [cx + a, cy], [cx, cy + b], [cx - a, cy]];
        if (solid) axb_P(S, dia, plate, 1, axb_mix(o, { n: 'plate' })); else axb_loop(S, dia, sc.fg, lw * 3, 1, axb_mix(o, { n: 'outline' }));
        axb_loop(S, [[cx, cy - b - g], [cx + a + g, cy], [cx, cy + b + g], [cx - a - g, cy]], solid ? plate : acc, lw * 2, 0.8, axb_mix(o, { n: 'outer line' }));
        for (i = 0; i < 2; i++) {
            var dx = (i ? -1 : 1) * (a + g * 2.2);
            if (cx + dx > g && cx + dx < W - g) axb_O(S, cx + dx, cy, M * 0.008, acc, null, 0, 1, { rs: axb_iE(0.5, 0.25), op: 'K', n: 'dot' });
        }
        axb_flush(S);
        var bb = null;
        for (i = 0; i < Rn; i++) bb = jzUnion(bb, axb_draw(ctx, { text: rows[i], font: font, size: size, x: cx, y: cy + (i - (Rn - 1) / 2) * size * lead, track: 0.04, color: solid ? axb_onCol(sc, plate) : sc.fg, mi: i }));
        return bb;
    }
});

/* ================================================================== 17 xbShapeLens — 図形レンズ */
axb_reg('xbShapeLens', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['display'])), ord: rng.int(0, 5), drift: rng.range(0.5, 1), sz: rng.range(0.95, 1.2), rot: rng.range(-20, 20) }; },
    build: function (ctx) {
        var B = axb_base(ctx), W = B.W, H = B.H, sc = B.sc, M = B.M, font = axb_font(ctx, 'font', 'display'), i;
        var fb = axb_fitBox(B.txt, font, W * 0.88, H * 0.54, { lead: 1.15, track: 0.02 }, 3), size = Math.min(fb.size, M * 0.36);
        var it = { text: fb.text, font: font, size: size, x: W / 2, y: H / 2, lead: 1.15, track: 0.02, color: sc.fg };
        var m = axb_meas(it.text, size, it), drift = jzP(ctx, 'drift', 0.75), rot = jzP(ctx, 'rot', 0);
        // the lyric itself is only an outline
        var bb = axb_draw(ctx, axb_mix(it, { fill: false, stroke: Math.max(2.5 * B.k, size * 0.03), strokeColor: sc.fg, name: 'lyric outline' }));
        var perm = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]][jzP(ctx, 'ord', 0) % 6];
        var cols = [axb_accentOn(sc), axb_pickPlate(sc, 'ink'), axb_pickPlate(sc, 'accent2')], fxs = [0.16, 0.5, 0.84];
        var rs = jzClamp(Math.max(m.h * 0.6, M * 0.15) * jzP(ctx, 'sz', 1), M * 0.12, Math.min(M * 0.3, m.w * 0.3 + M * 0.06));
        function lens(S, j, col) {       // one drifting primitive (the same spec makes the visible lens and its matte)
            var kind = perm[j], x = W / 2 + (fxs[j] - 0.5) * m.w, y = H / 2 + (j % 2 ? 1 : -1) * m.h * 0.1;
            var o = { pre: 'var p=ob((time-' + jzN(0.05 + j * 0.07) + ')/0.45,1.3)*K;', piv: [x, y], sc: '[p,p]', n: 'lens ' + (j + 1),
                pos: '[Math.sin(time*0.55+' + jzN(j * 2.1) + ')*' + jzN(M * 0.035 * drift) + ',Math.cos(time*0.45+' + jzN(j * 1.3) + ')*' + jzN(M * 0.025 * drift) + (kind === 1 ? '+p*' + jzN(rs * 0.12) : '') + ']' };
            if (kind === 1) { o.rot = 'time*3'; axb_P(S, axb_ngon(x, y, rs * 1.25, rs * 1.25, 3, -90 + rot * 0.4), col, 1, o); }
            else if (kind === 2) { o.rot = 'time*2'; axb_P(S, axb_rectPts(x, y, rs * 1.7, rs * 1.7, rot), col, 1, o); }
            else axb_O(S, x, y, rs, col, null, 0, 1, o);
        }
        for (i = 0; i < 3; i++) {
            var S1 = axb_sheet(ctx, 'lens ' + (i + 1)); lens(S1, i, cols[i]); axb_flush(S1);
            // ... and shows it solid on its colour
            var mk = (function (j) { return function (S2) { lens(S2, j, '#FFFFFF'); }; })(i);
            axb_clip(ctx, axb_mix(it, { color: axb_onCol(sc, cols[i]), name: 'lyric in lens ' + (i + 1) }), mk);
        }
        return bb;
    }
});

/* ================================================================== 18 xbConstruct — 斜め構成 */
axb_reg('xbConstruct', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['display'])), ang: rng.pick([-16, -12, 12, 16]), col: rng.pick(['ink', 'fg', 'accent']), wedge: rng.chance(0.8), circ: rng.chance(0.65), key: rng.int(0, 2) }; },
    build: function (ctx) {
        var B = axb_base(ctx), W = B.W, H = B.H, sc = B.sc, M = B.M, lw = B.lw, port = B.port, txt = B.txt, font = axb_font(ctx, 'font', 'display'), i;
        var n = jzCount(txt), lines = axb_linesOf(txt, port ? Math.min(4, Math.ceil(n / 4)) : (n <= 7 ? 1 : n <= 14 ? 2 : 3)).split('\n'), L = lines.length;
        var size = Math.min(M * 0.24, H * 0.5 / (L * 1.34), axb_fitAll(lines, font, W * (port ? 0.76 : 0.7), M, { track: 0.02 }));
        var h = size * 1.34, ws = [], mw = 0;
        for (i = 0; i < L; i++) { ws.push(axb_meas(lines[i], size, { font: font, track: 0.02 }).w); mw = Math.max(mw, ws[i]); }
        var xL = W / 2 - mw / 2, key = L > 1 ? jzP(ctx, 'key', 0) % L : 0, plate = axb_pickPlate(sc, jzP(ctx, 'col', 'ink'));
        var acc = axb_same(axb_accentOn(sc), plate) ? axb_pickPlate(sc, 'fg') : axb_accentOn(sc), yTop = H / 2 - L * h / 2, yBot = H / 2 + L * h / 2;
        var ang = jzP(ctx, 'ang', -12), Rm = axb_rotM(W / 2, H / 2, ang), S = axb_sheet(ctx, 'construction');
        S.rot = [W / 2, H / 2, ang];          // everything hangs on one angle: the whole sheet is turned about the centre
        // crossing bar
        axb_R(S, xL - size * 0.62, H / 2 - H * 1.5, size * 0.16, H * 3, sc.fg, 1, { piv: [xL - size * 0.62, H / 2], sc: '[1,' + axb_iE(0.55, 0.1) + ']', op: 'K', n: 'crossing bar' });
        // key plate, bleeding to the left
        var ky = yTop + key * h + h * 0.02;
        axb_R(S, -W, ky, xL + ws[key] + size * 0.4 + W, h * 0.96, plate, 1, { piv: [-W, ky], sc: '[' + axb_iE(0.5, 0) + ',1]', op: 'K', n: 'key plate' });
        if (jzP(ctx, 'wedge', true)) {
            var ty = yBot + size * 0.3, tx = xL + mw * 0.15;
            axb_P(S, [[tx, ty + size * 0.12], [W * 1.6, ty - size * 0.05], [W * 1.6, ty + size * 1.5]], acc, 1, { pos: '[(1-' + axb_iE(0.6, 0.18) + ')*' + jzN(W) + ',0]', op: 'K', n: 'wedge' });
        }
        if (jzP(ctx, 'circ', true)) axb_O(S, xL + mw + size * 0.2, yTop - size * 0.75, size * 0.55, null, sc.fg, lw * 5, 1, { rs: 'ob((time-0.2)/0.4,1.5)', op: 'K', n: 'ring' });
        axb_flush(S);
        var bb = null;
        for (i = 0; i < L; i++) {
            var o = { text: lines[i], font: font, size: size, x: xL, y: yTop + (i + 0.5) * h, align: 'left', track: 0.02, color: i === key ? axb_onCol(sc, plate) : sc.fg, mi: i };
            var b = axb_ibb(o), p = axb_xfPt(Rm, o.x, o.y);
            axb_draw(ctx, axb_mix(o, { x: p[0], y: p[1], rot: ang }));
            bb = jzUnion(bb, axb_ptsBB([axb_xfPt(Rm, b.x0, b.y0), axb_xfPt(Rm, b.x1, b.y0), axb_xfPt(Rm, b.x1, b.y1), axb_xfPt(Rm, b.x0, b.y1)]));
        }
        return bb;
    }
});

/* ================================================================== 19 xbGolden — 黄金分割 */
axb_reg('xbGolden', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['serif', 'display'])), fh: rng.chance(0.5), fv: rng.chance(0.5), fill: rng.pick([1, 2, 3]), spiral: rng.chance(0.85) }; },
    build: function (ctx) {
        var B = axb_base(ctx), W = B.W, H = B.H, sc = B.sc, M = B.M, lw = B.lw, port = B.port, font = axb_font(ctx, 'font', 'serif'), k;
        var Wc = port ? H : W, Hc = port ? W : H, PHI = 1.618034, s0 = Math.min(Hc * 0.86, Wc * 0.9 / PHI);
        var pfh = jzP(ctx, 'fh', false), pfv = jzP(ctx, 'fv', false), fh = pfh ? -1 : 1, fv = pfv ? -1 : 1, tx = pfh ? Wc : 0, ty = pfv ? Hc : 0;
        var m = port ? [0, fh, fv, 0, ty, tx] : [fh, 0, 0, fv, tx, ty];
        var sq = [], x = (Wc - s0 * PHI) / 2, y = (Hc - s0) / 2, w = s0 * PHI, h = s0, s;
        for (k = 0; k < 7; k++) {
            var d = k % 4;
            if (d === 0) { s = h; sq.push({ x: x, y: y, s: s, cx: x + s, cy: y + s, a: 180 }); x += s; w -= s; }
            else if (d === 1) { s = w; sq.push({ x: x, y: y, s: s, cx: x, cy: y + s, a: 270 }); y += s; h -= s; }
            else if (d === 2) { s = h; sq.push({ x: x + w - s, y: y, s: s, cx: x + w - s, cy: y, a: 0 }); w -= s; }
            else { s = w; sq.push({ x: x, y: y + h - s, s: s, cx: x + w, cy: y + h - s, a: 90 }); h -= s; }
        }
        var acc = axb_accentOn(sc), fill = jzP(ctx, 'fill', 2), S = axb_sheet(ctx, 'golden section');
        for (k = 0; k < 7; k++) {
            var q = sq[k], p0 = axb_xfPt(m, q.x, q.y), p1 = axb_xfPt(m, q.x + q.s, q.y + q.s), rx = Math.min(p0[0], p1[0]), ry = Math.min(p0[1], p1[1]);
            var op = 'K*cl((time-' + jzN(k * 0.06) + ')/0.25)';
            if (k === fill || k === fill + 2) axb_R(S, rx, ry, q.s, q.s, k === fill ? acc : axb_pickPlate(sc, 'ink'), 1, { op: op, n: 'square fill ' + (k + 1) });
            axb_RR(S, rx, ry, q.s, q.s, null, sc.sub, lw * 1.5, 0.75, { op: op, n: 'square ' + (k + 1) });
        }
        if (jzP(ctx, 'spiral', true)) {       // seven quarter arcs, drawn one after the other
            var kp = 0.5523;
            for (k = 0; k < 7; k++) {
                var g = sq[k], a0 = g.a * Math.PI / 180, a1 = (g.a + 90) * Math.PI / 180;
                var v0 = axb_xfPt(m, g.cx + Math.cos(a0) * g.s, g.cy + Math.sin(a0) * g.s), v1 = axb_xfPt(m, g.cx + Math.cos(a1) * g.s, g.cy + Math.sin(a1) * g.s);
                var to = [-Math.sin(a0) * g.s * kp, Math.cos(a0) * g.s * kp], ti = [Math.sin(a1) * g.s * kp, -Math.cos(a1) * g.s * kp];
                axb_L(S, [{ v: [v0, v1], i: [[0, 0], [m[0] * ti[0] + m[2] * ti[1], m[1] * ti[0] + m[3] * ti[1]]], o: [[m[0] * to[0] + m[2] * to[1], m[1] * to[0] + m[3] * to[1]], [0, 0]] }],
                    sc.fg, lw * 2.5, 1, { trim: axb_iE(1, 0) + '*7-' + k, op: 'K', n: 'spiral ' + (k + 1) });
            }
        }
        axb_flush(S);
        var c = axb_xfPt(m, sq[0].x + s0 / 2, sq[0].y + s0 / 2);
        var f = axb_fitBox(B.txt, font, s0 * 0.86, s0 * 0.6, { lead: 1.22, track: 0.03 }, 4), size = Math.min(f.size, M * 0.24);
        return axb_draw(ctx, { text: f.text, font: font, size: size, x: c[0], y: c[1], lead: 1.22, track: 0.03, color: sc.fg });
    }
});

/* ================================================================== 20 xbVenn — ベン図 */
axb_reg('xbVenn', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['display', 'serif'])), swap: rng.chance(0.5), second: rng.pick(['accent', 'accent', 'fg']), ol: rng.chance(0.5) }; },
    build: function (ctx) {
        var B = axb_base(ctx), W = B.W, H = B.H, sc = B.sc, M = B.M, lw = B.lw, port = B.port, txt = B.txt, font = axb_font(ctx, 'font', 'display'), i, Ln;
        var latin = jzIsLatinText(txt), l2 = axb_linesOf(txt, 2).split('\n'), gmin = 1e9, gmax = 1;
        for (i = 0; i < l2.length; i++) { var gc = jzCount(l2[i]); gmin = Math.min(gmin, gc); gmax = Math.max(gmax, gc); }
        var parts = l2.length >= 2 ? [l2[0], l2.slice(1).join(latin ? ' ' : '')] : [txt];
        if (!latin && (l2.length !== 2 || gmin / gmax < 0.3)) {       // no usable phrase break: cut in the middle
            var ar = jzChars(txt.replace(/\s+/g, '')), ct = Math.round(ar.length / 2);
            while (ct < ar.length - 1 && (axb_closeP(ar[ct]) || axb_isSmall(ar[ct]) || ar[ct] === 'ー')) ct++;
            parts = ct > 0 && ct < ar.length ? [ar.slice(0, ct).join(''), ar.slice(ct).join('')] : [txt];
        }
        var two = parts.length === 2, Rr = port ? Math.min(W * 0.42, H * 0.26) : Math.min(H * 0.42, W * 0.26), d = Rr * 0.74, cx = W / 2, cy = H / 2;
        var c1 = port ? [cx, cy - d] : [cx - d, cy], c2 = port ? [cx, cy + d] : [cx + d, cy];
        var colA = axb_pickPlate(sc, 'ink'), colB = axb_pickPlate(sc, jzP(ctx, 'second', 'accent'));
        if (axb_same(colA, colB)) colB = axb_pickPlate(sc, 'fg');
        if (jzP(ctx, 'swap', false)) { var tc = colA; colA = colB; colB = tc; }
        var e1 = 'ob(time/0.5,1.3)', e2 = 'ob((time-0.1)/0.5,1.3)', S = axb_sheet(ctx, 'venn discs');
        axb_O(S, c1[0], c1[1], Rr, colA, null, 0, 1, { rs: e1, op: 'K', n: 'disc 1' });
        if (two) axb_O(S, c2[0], c2[1], Rr, colB, null, 0, 1, { rs: e2, op: 'K', n: 'disc 2' });
        else axb_O(S, c2[0], c2[1], Rr, null, sc.fg, lw * 3, 1, { rs: e2, op: 'K', n: 'ring 2' });
        axb_flush(S);
        if (two) {       // the overlap takes a third colour: disc 2 again, matted by disc 1
            var lens = jzMixHex(colA, colB, 0.5), S2 = axb_sheet(ctx, 'venn overlap'), S3 = axb_sheet(ctx, 'venn overlap matte');
            axb_O(S2, c2[0], c2[1], Rr, jzContrast(lens, colA) > 1.15 ? lens : sc.bg, null, 0, 1, { rs: e2, op: 'K', n: 'overlap' });
            var OL = axb_flush(S2);
            axb_O(S3, c1[0], c1[1], Rr, '#FFFFFF', null, 0, 1, { rs: e1, n: 'disc 1' });
            axb_matte(OL, axb_flush(S3));
        }
        if (jzP(ctx, 'ol', false)) {
            var S4 = axb_sheet(ctx, 'venn outlines'), gq = jzN(M * 0.018 / Rr);
            axb_O(S4, c1[0], c1[1], Rr, null, sc.sub, lw * 1.5, 0.6, { rs: e1 + '+' + gq, op: 'K', n: 'outline 1' });
            if (two) axb_O(S4, c2[0], c2[1], Rr, null, sc.sub, lw * 1.5, 0.6, { rs: e2 + '+' + gq, op: 'K', n: 'outline 2' });
            axb_flush(S4);
        }
        var o = { lead: 1.18, track: 0.02 }, bw = Rr * 1.2, bh = Rr * 1.0, size = M * 0.2, fs = [], bb = null;
        for (i = 0; i < parts.length; i++) size = Math.min(size, axb_fitBox(parts[i], font, bw, bh, o, 3).size);
        for (i = 0; i < parts.length; i++) {
            var tt = null;
            for (Ln = 1; Ln <= 3 && tt == null; Ln++) { var t2 = axb_linesOf(parts[i], Ln); if (axb_fit(t2, font, bw, bh, o) >= size * 0.995) tt = t2; }
            fs.push(tt == null ? axb_fitBox(parts[i], font, bw, bh, o, 3).text : tt);
        }
        for (i = 0; i < parts.length; i++) {
            var c = i ? c2 : c1, sh = two ? Rr * 0.26 * (i ? 1 : -1) : 0;
            bb = jzUnion(bb, axb_draw(ctx, { text: fs[i], font: font, size: size, x: c[0] + (port ? 0 : sh), y: c[1] + (port ? sh : 0), color: axb_onCol(sc, i ? colB : colA), mi: i * 2, lead: 1.18, track: 0.02 }));
        }
        return bb;
    }
});

/* ================================================================== 21 xbSlitDisc — 割れ円 */
axb_reg('xbSlitDisc', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['display', 'serif'])), dir: rng.pick([1, -1]), cols: rng.int(0, 2), shift: rng.range(0.22, 0.5), rule: rng.chance(0.6) }; },
    build: function (ctx) {
        var B = axb_base(ctx), W = B.W, H = B.H, sc = B.sc, M = B.M, lw = B.lw, port = B.port, font = axb_font(ctx, 'font', 'display');
        var fb = axb_fitBox(B.txt, font, W * 0.88, H * (port ? 0.22 : 0.3), { lead: 1.15, track: 0.03 }, port ? 3 : 2), size = Math.min(fb.size, M * 0.26);
        var it = { text: fb.text, font: font, size: size, x: W / 2, y: H / 2, lead: 1.15, track: 0.03, color: sc.fg };
        var gap = axb_meas(it.text, size, it).h + size * 0.5, Rr = Math.max(M * 0.16, Math.min(M * 0.42, H * 0.47 - gap / 2, W * 0.36)), cx = W / 2, cy = H / 2;
        var pal = [[axb_accentOn(sc), axb_pickPlate(sc, 'ink')], [axb_pickPlate(sc, 'ink'), axb_accentOn(sc)], [axb_pickPlate(sc, 'fg'), axb_accentOn(sc)]][jzP(ctx, 'cols', 0) % 3];
        // the halves grow, then slide apart: up / down by the height of the lyric, sideways by the shift
        var pre = 'var eG=ioc((time-0.08)/0.5)*(1-0.6*ic(PO)),g=' + jzN(gap / 2) + '*eG,sh=' + jzN(Rr * jzP(ctx, 'shift', 0.3) * (jzP(ctx, 'dir', 1) < 0 ? -1 : 1)) + '*eG;';
        var eR = axb_iE(0.4, 0), S = axb_sheet(ctx, 'split disc');
        axb_P(S, axb_halfDisc(cx, cy, Rr, true), pal[0], 1, { pre: pre, piv: [cx, cy], sc: '[' + eR + ',' + eR + ']', pos: '[-sh,-g]', op: 'K', n: 'upper half' });
        axb_P(S, axb_halfDisc(cx, cy, Rr, false), pal[1], 1, { pre: pre, piv: [cx, cy], sc: '[' + eR + ',' + eR + ']', pos: '[sh,g]', op: 'K', n: 'lower half' });
        if (jzP(ctx, 'rule', true)) {
            var k = Rr * 1.35, seg = [[[cx - k, cy], [cx + k, cy]]];
            axb_L(S, seg, sc.sub, lw * 1.5, 0.7, { pre: pre, start: '0.5-0.5*eG', trim: '0.5+0.5*eG', pos: '[-sh,-g]', op: 'K', n: 'upper rule' });
            axb_L(S, seg, sc.sub, lw * 1.5, 0.7, { pre: pre, start: '0.5-0.5*eG', trim: '0.5+0.5*eG', pos: '[sh,g]', op: 'K', n: 'lower rule' });
        }
        axb_flush(S);
        return axb_draw(ctx, it);
    }
});

/* ================================================================== 22 xbDial — 文字盤 */
axb_reg('xbDial', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['display', 'serif'])), ticks: rng.pick([60, 48, 72]), hub: rng.chance(0.6), inner: rng.chance(0.6) }; },
    build: function (ctx) {
        var B = axb_base(ctx), W = B.W, H = B.H, sc = B.sc, M = B.M, lw = B.lw, c = B.c, font = axb_font(ctx, 'font', 'display'), i;
        var sl = axb_slots(B.txt), N = Math.max(1, sl.length), cx = W / 2, cy = H / 2;
        var gs = Math.min(M * 0.15, 2 * Math.PI * M * 0.33 / N * 0.72), Rg = M * 0.44 - gs * 0.82, Ro = Rg + gs * 0.82;
        var e = axb_iE(0.7, 0), acc = axb_accentOn(sc), T = jzP(ctx, 'ticks', 60), S = axb_sheet(ctx, 'dial');
        axb_O(S, cx, cy, Ro, null, sc.fg, lw * 2.5, 1, { pre: 'var e=' + e + ';', rs: '0.8+0.2*e', op: 'K*e', n: 'rim' });
        if (jzP(ctx, 'inner', true)) axb_O(S, cx, cy, Rg - gs * 0.8, null, sc.sub, lw * 1.5, 0.6, { rs: e, op: 'K', n: 'inner ring' });
        axb_ticks(S, cx, cy, Ro + M * 0.004, M * 0.007, M * 0.02, T, T / 12, lw * 2, sc.sub, 0.8, e);
        // the hand sweeps from the first glyph to the last while the cut holds
        var inD = c.inDur || 0.3, hold = Math.max(0.05, c.dur - inD - (c.outDur || 0));
        var pre = 'var pr=ios((time-' + jzN(inD * 0.8) + ')/' + jzN(hold) + '),ps=pr*' + (N - 1) + ';';
        var hl = Rg - gs * 0.72, hw = M * 0.012;
        axb_P(S, [[cx - hw * 2, cy + hw], [cx + hl, cy], [cx - hw * 2, cy - hw]], acc, 1, { pre: pre, piv: [cx, cy], sc: '[' + e + ',1]', rot: '-90+ps*' + jzN(360 / N), op: 'K', n: 'hand' });
        axb_O(S, cx, cy, M * 0.022, sc.fg, null, 0, 1, { rs: e, op: 'K', n: 'hub' });
        if (jzP(ctx, 'hub', true)) axb_O(S, cx, cy, M * 0.04, null, sc.fg, lw * 2, 1, { rs: e, op: 'K', n: 'hub ring' });
        axb_P(S, [[cx - M * 0.012, cy - Ro - M * 0.045], [cx + M * 0.012, cy - Ro - M * 0.045], [cx, cy - Ro - M * 0.027]], acc, 1, { op: 'K*' + e, n: 'top mark' });
        axb_flush(S);
        var bb = null, hd = axb_hd(ctx);
        for (i = 0; i < sl.length; i++) {
            if (axb_isSp(sl[i])) continue;
            var a = (-90 + i * 360 / N) * Math.PI / 180, o = { text: sl[i], font: font, size: gs, x: cx + Math.cos(a) * Rg, y: cy + Math.sin(a) * Rg, color: sc.fg, mi: i * 0.6, name: 'dial ' + sl[i] };
            bb = jzUnion(bb, axb_draw(ctx, o));
            // the glyph under the hand lights up
            jzAnimator(o.L, 'JZ Dial Lit', [['ADBE Text Fill Color', jzHex(acc)]], hd + pre + '(Math.round(ps)===' + i + '&&time>' + jzN(inD) + ')?100:0');
        }
        return bb;
    }
});

/* ================================================================== 23 xbCrosshair — 照準 */
axb_reg('xbCrosshair', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['display', 'serif', 'body'])), qx: rng.pick([0, 1]), qy: rng.pick([0, 1]), fr: rng.range(0.22, 0.3), pulse: rng.chance(0.75), marks: rng.chance(0.7) }; },
    build: function (ctx) {
        var B = axb_base(ctx), W = B.W, H = B.H, sc = B.sc, M = B.M, lw = B.lw, ls = B.ls, port = B.port, font = axb_font(ctx, 'font', 'display'), i;
        var qx = jzP(ctx, 'qx', 0), qy = jzP(ctx, 'qy', 0), fr = jzP(ctx, 'fr', 0.26), fxr = port ? fr * 0.9 : fr, fyr = port ? fr * 0.8 : fr * 1.05;
        var px = W * (qx ? 1 - fxr : fxr), py = H * (qy ? 1 - fyr : fyr), gp = M * 0.05;
        var x0 = qx ? W * 0.05 : px + gp, x1 = qx ? px - gp : W * 0.95, y0 = qy ? H * 0.06 : py + gp, y1 = qy ? py - gp : H * 0.94;
        var e = axb_iE(0.7, 0), pe = 'var e=' + e + ';', acc = axb_accentOn(sc), S = axb_sheet(ctx, 'crosshair');
        // two full-bleed hairlines growing out of the crossing
        axb_L(S, [[[0, py], [W, py]]], sc.fg, lw * 2, 0.85, { pre: pe, start: jzN(px / W) + '*(1-e)', trim: jzN(px / W) + '+' + jzN(1 - px / W) + '*e', op: 'K', n: 'hairline h' });
        axb_L(S, [[[px, 0], [px, H]]], sc.fg, lw * 2, 0.85, { pre: pe, start: jzN(py / H) + '*(1-e)', trim: jzN(py / H) + '+' + jzN(1 - py / H) + '*e', op: 'K', n: 'hairline v' });
        // scale ticks along both lines (dashed strokes; every fifth is longer), revealed outwards
        var st = M * 0.04, kx = Math.ceil(W / st), ky = Math.ceil(H / st), dd = lw * 1.5, mn = [], mj = [];
        for (i = -1; i <= 1; i += 2) {
            mn.push([[px + i * (st - dd / 2), py], [px + i * (kx * st + dd / 2), py]]); mn.push([[px, py + i * (st - dd / 2)], [px, py + i * (ky * st + dd / 2)]]);
            mj.push([[px + i * (5 * st - dd / 2), py], [px + i * (kx * st + dd / 2), py]]); mj.push([[px, py + i * (5 * st - dd / 2)], [px, py + i * (ky * st + dd / 2)]]);
        }
        axb_L(S, mn, sc.sub, M * 0.014, 0.7, { dash: [dd, st - dd], trim: e, op: 'K', n: 'ticks' });
        axb_L(S, mj, sc.sub, M * 0.032, 0.7, { dash: [dd, 5 * st - dd], trim: e, op: 'K', n: 'ticks major' });
        axb_O(S, px, py, M * 0.034, null, sc.fg, lw * 2.5, 1, { rs: e, op: 'K', n: 'ring' });
        axb_O(S, px, py, M * 0.085, null, acc, lw * 2, 1, { rs: e, op: 'K', n: 'ring accent' });
        axb_O(S, px, py, M * 0.009, acc, null, 0, 1, { rs: e, op: 'K', n: 'centre' });
        if (jzP(ctx, 'pulse', true)) axb_O(S, px, py, M * 0.085, null, acc, lw * 1.5, 0.6, { pre: pe + 'var f=(time*0.55)%1;', rs: '1+f*' + jzN(0.2 / 0.085), op: '(1-f)*K*e', n: 'pulse' });
        var f = axb_fitBox(B.txt, font, (x1 - x0) * 0.9, (y1 - y0) * 0.72, { lead: 1.2, track: 0.02 }, 4), size = Math.min(f.size, M * 0.26);
        var it = { text: f.text, font: font, size: size, x: (x0 + x1) / 2, y: (y0 + y1) / 2, lead: 1.2, track: 0.02, color: sc.fg };
        if (jzP(ctx, 'marks', true)) {       // corner marks round the lyric
            var m = axb_meas(it.text, size, it), bx = m.w / 2 + size * 0.35, by = m.h / 2 + size * 0.3, k = size * 0.32, cs = [[-1, -1], [1, -1], [1, 1], [-1, 1]], segs = [];
            for (i = 0; i < 4; i++) segs.push([[it.x + cs[i][0] * bx, it.y + cs[i][1] * (by - k)], [it.x + cs[i][0] * bx, it.y + cs[i][1] * by], [it.x + cs[i][0] * (bx - k), it.y + cs[i][1] * by]]);
            axb_L(S, segs, acc, lw * 2.5, 1, { pre: 'var e=' + axb_iE(0.5, 0.2) + ';', start: '0.5-0.5*e', trim: '0.5+0.5*e', op: 'K', n: 'corner marks' });
        }
        axb_flush(S);
        var sx = qx ? 1 : -1, sy = qy ? 1 : -1, la = 'K*' + axb_iC(0.3, 0.3);
        axb_label(ctx, 'X ' + (px / W).toFixed(3), px + sx * M * 0.11, py + sy * ls * 1.5, { align: qx ? 'left' : 'right', op: la });
        axb_label(ctx, 'Y ' + (py / H).toFixed(3), px + sx * M * 0.11, py + sy * ls * 3.1, { align: qx ? 'left' : 'right', op: la });
        return axb_draw(ctx, it);
    }
});

/* ================================================================== 24 xbStripeDisc — 縞の円 */
axb_reg('xbStripeDisc', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['display', 'serif'])), col: rng.pick(['accent', 'accent', 'ink', 'fg']), pos: rng.pick([0.08, 0.18, 0.28]), off: rng.range(-0.06, 0.06), n: rng.pick([5, 6, 7]), up: rng.chance(0.25) }; },
    build: function (ctx) {
        var B = axb_base(ctx), W = B.W, H = B.H, sc = B.sc, M = B.M, port = B.port, font = axb_font(ctx, 'font', 'display'), k;
        var fb = axb_fitBox(B.txt, font, W * 0.88, H * (port ? 0.2 : 0.26), { lead: 1.15, track: 0.03 }, port ? 3 : 2), size = Math.min(fb.size, M * 0.24);
        var it = { text: fb.text, font: font, size: size, lead: 1.15, track: 0.03, color: sc.fg, x: W / 2, y: 0 };
        var m = axb_meas(it.text, size, it), Rr = M * 0.43, cx = W / 2 + jzP(ctx, 'off', 0) * W, cy = H / 2, dir = jzP(ctx, 'up', false) ? -1 : 1;
        var ty = cy + dir * Rr * jzP(ctx, 'pos', 0.18), gh = m.h / 2 + size * 0.24, col = axb_pickPlate(sc, jzP(ctx, 'col', 'accent')), N = jzP(ctx, 'n', 6);
        it.y = ty;
        var S = axb_sheet(ctx, 'disc bands');
        // solid cap on one side of the lyric
        if (dir > 0) axb_R(S, cx - Rr, cy - Rr, Rr * 2, Math.max(0, ty - gh - (cy - Rr)), col, 1, { n: 'cap' });
        else axb_R(S, cx - Rr, ty + gh, Rr * 2, Math.max(0, cy + Rr - (ty + gh)), col, 1, { n: 'cap' });
        // bands on the other side: they drift away from the lyric and thin out
        var ya = dir > 0 ? ty + gh : ty - gh, len = dir > 0 ? cy + Rr - ya : ya - (cy - Rr);
        if (len > 2 * B.k) for (k = 0; k < N; k++) {
            axb_R(S, cx - Rr, ya - 1, Rr * 2, 2, col, 1, { pre: 'var u=(' + k + '+(time*0.22)%1)/' + N + ',th=' + jzN(len / N) + '*(0.78*(1-u)+0.06)*cl(u*' + N + '),of=u*' + jzN(len) + '+' + jzN(len / N * 0.2) + ';',
                piv: [cx, ya], rsz: '[' + jzN(Rr * 2) + ',th]', pos: '[0,' + dir + '*(of+th/2)]', n: 'band ' + (k + 1) });
        }
        S.lop = 'K';
        var SL = axb_flush(S), Ms = axb_sheet(ctx, 'disc matte');
        axb_O(Ms, cx, cy, Rr, '#FFFFFF', null, 0, 1, { rs: axb_iE(0.6, 0), n: 'disc' });
        if (SL) axb_matte(SL, axb_flush(Ms));
        return axb_draw(ctx, it);
    }
});

/* ================================================================== 25 xbWedge — くさび */
axb_reg('xbWedge', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['display', 'serif'])), dir: rng.pick([1, -1]), th: rng.pick([4.5, 6, 7.5]), col: rng.pick(['accent', 'accent', 'ink']), dot: rng.chance(0.7) }; },
    build: function (ctx) {
        var B = axb_base(ctx), W = B.W, H = B.H, sc = B.sc, M = B.M, ls = B.ls, port = B.port, txt = B.txt, font = axb_font(ctx, 'font', 'display'), i;
        var n = jzCount(txt), lines = axb_linesOf(txt, (port ? n <= 3 : n <= 5) ? 1 : 2).split('\n'), L2 = lines.length > 1;
        if (lines.length > 2) lines = [lines[0], lines.slice(1).join('')];
        var thD = jzP(ctx, 'th', 6), th = thD * Math.PI / 180, c = Math.cos(th), s = Math.sin(th), d = jzP(ctx, 'dir', 1) < 0 ? -1 : 1, Lw = W * 0.86, ax = d > 0 ? W * 0.07 : W * 0.93, ay = H / 2;
        var size = Math.min(M * 0.2, H * 0.2, axb_fitAll(lines, font, Lw * 0.8, M, { track: 0.03 }));
        var col = axb_pickPlate(sc, jzP(ctx, 'col', 'accent')), far = Lw / c, S = axb_sheet(ctx, 'wedge');
        axb_P(S, [[ax, ay], [ax + d * c * far, ay - s * far], [ax + d * c * far, ay + s * far]], col, 1, { pre: 'var e=' + axb_iE(0.6, 0) + '*K;', piv: [ax, ay], sc: '[e,e]', n: 'wedge' });
        if (jzP(ctx, 'dot', true)) axb_O(S, ax - d * M * 0.022, ay, M * 0.009, sc.fg, null, 0, 1, { rs: axb_iE(0.4, 0.2), op: 'K', n: 'apex dot' });
        axb_flush(S);
        var t = Lw * 0.55 / c, bb = null;
        for (i = 0; i < lines.length; i++) {       // the lines ride the two edges, tilting apart
            var sg = i ? 1 : -1, ex = ax + d * c * t, ey = ay + sg * s * t, off = size * 0.64;
            bb = jzUnion(bb, axb_draw(ctx, { text: lines[i], font: font, size: size, x: ex - s * d * off, y: ey + sg * c * off, rot: sg * d * thD, track: 0.03, color: sc.fg, mi: i }));
        }
        if (!L2) axb_label(ctx, 'No.' + axb_p2(B.no) + '  ' + thD.toFixed(1) + '°', ax + d * c * t, ay + s * t + c * ls * 1.6, { align: 'center', rot: d * thD, op: 'K*' + axb_iC(0.3, 0.3) });
        return bb;
    }
});

/* ================================================================== 26 xbGradBars — 漸増ストライプ */
axb_reg('xbGradBars', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['display', 'body', 'serif'])), flip: rng.chance(0.5), col: rng.pick(['fg', 'ink', 'accent']), acc: rng.int(0, 4), align: rng.pick(['left', 'left', 'center', 'right']) }; },
    build: function (ctx) {
        var B = axb_base(ctx), W = B.W, H = B.H, sc = B.sc, M = B.M, port = B.port, font = axb_font(ctx, 'font', 'display'), k, j, th, yy;
        var fb = axb_fitBox(B.txt, font, W * 0.88, H * (port ? 0.24 : 0.3), { lead: 1.15, track: 0.03 }, port ? 3 : 2), size = Math.min(fb.size, M * 0.24);
        var al = jzP(ctx, 'align', 'left'), sg = jzP(ctx, 'flip', false) ? -1 : 1, ty = H / 2 + sg * H * 0.12;
        var it = { text: fb.text, font: font, size: size, x: al === 'left' ? W * 0.06 : al === 'right' ? W * 0.94 : W / 2, y: ty, align: al, lead: 1.15, track: 0.03, color: sc.fg };
        var mh = axb_meas(it.text, size, it).h, col = axb_pickPlate(sc, jzP(ctx, 'col', 'fg')), acc = axb_same(axb_accentOn(sc), col) ? axb_pickPlate(sc, 'fg') : axb_accentOn(sc);
        var t0 = Math.min(size * 0.4, M * 0.07), ai = jzP(ctx, 'acc', 0), S = axb_sheet(ctx, 'bars');
        // thin side: bars shrink away from the lyric
        var y = ty - sg * (mh / 2 + size * 0.32);
        for (k = 0; k < 9; k++) {
            th = t0 * Math.pow(0.68, k); if (th < 1.2 * B.k) break;
            yy = sg > 0 ? y - th : y;
            if (yy > H || yy + th < 0) break;
            axb_R(S, 0, yy, W, th, k === ai ? acc : col, 1, { piv: [k % 2 ? W : 0, yy], sc: '[' + axb_stg(k, 0.045, 0.5) + ',1]', op: 'K', n: 'thin bar ' + (k + 1) });
            y -= sg * th * 2;
        }
        // heavy side
        y = ty + sg * (mh / 2 + size * 0.32);
        for (j = 0; j < 4; j++) {
            th = t0 * Math.pow(1.6, j + 1); yy = sg > 0 ? y : y - th;
            if (yy > H || yy + th < 0) break;
            axb_R(S, 0, yy, W, th, col, 1, { piv: [j % 2 ? 0 : W, yy], sc: '[' + axb_stg(j + 1, 0.06, 0.5) + ',1]', op: 'K', n: 'heavy bar ' + (j + 1) });
            y += sg * (th + t0 * 0.6 * Math.pow(1.3, j));
        }
        axb_flush(S);
        return axb_draw(ctx, it);
    }
});

/* ================================================================== 27 xbGraph — 折れ線グラフ */
axb_reg('xbGraph', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['display', 'body'])), trend: rng.pick([1, 1, -1, 0]), amp: rng.range(0.5, 1), area: rng.chance(0.5), drop: rng.chance(0.7) }; },
    build: function (ctx) {
        var B = axb_base(ctx), W = B.W, H = B.H, sc = B.sc, M = B.M, lw = B.lw, ls = B.ls, port = B.port, txt = B.txt, font = axb_font(ctx, 'font', 'display'), r, c, j;
        var N0 = axb_cellsOf(txt).length, pr = axb_padRows(axb_rowCells(txt, port ? (N0 > 10 ? 3 : N0 > 5 ? 2 : 1) : (N0 > 9 ? 2 : 1))), cells = pr.flat, RN = pr.rows, per = pr.per;
        var x0 = W * 0.09, x1 = W * 0.94, RH = Math.min(H * 0.84 / RN, M * 0.62), top = H / 2 - RH * RN / 2, cw = (x1 - x0) / per;
        var gs = Math.min(M * 0.2, cw * 0.84, RH * 0.33), acc = axb_accentOn(sc), e = axb_iE(0.9, 0), pe = 'var e=' + e + ';';
        var trend = jzP(ctx, 'trend', 1), amp = jzP(ctx, 'amp', 0.75), drop = jzP(ctx, 'drop', true), S = axb_sheet(ctx, 'chart');
        var items = [], lab = 0, lStr = [], lPts = [], lCol = [], bb = null;
        for (r = 0; r < RN; r++) {
            var yb = top + r * RH + RH * 0.9, pts = [], ticks = [], line = [];
            axb_L(S, [[[x0, yb], [x1, yb]]], sc.fg, lw * 2.5, 1, { trim: e, op: 'K', n: 'axis x' });
            axb_L(S, [[[x0, yb], [x0, yb - RH * 0.82]]], sc.fg, lw * 2.5, 1, { trim: e, op: 'K', n: 'axis y' });
            axb_P(S, [[x1 + M * 0.014, yb], [x1, yb - M * 0.008], [x1, yb + M * 0.008]], sc.fg, 1, { pre: pe, op: 'K*cl(e*4-3)', n: 'axis arrow' });
            for (c = 0; c < per; c++) {
                var ch = cells[r * per + c];
                if (ch == null || axb_isSp(ch)) continue;
                var i = r * per + c, x = x0 + (c + 0.6) * cw, u = per > 1 ? c / (per - 1) : 0.5;
                var v = (trend > 0 ? u : trend < 0 ? 1 - u : 0.5) * 0.62 + 0.38 * axb_r(B.seed, i, 81) * amp, y = yb - RH * (0.1 + 0.36 * v);
                ticks.push([[x, yb], [x, yb + M * 0.012]]);
                lStr.push(axb_p2(++lab)); lPts.push([x, yb + M * 0.012 + ls * 0.9]); lCol.push(c);
                pts.push([x, y, ch]); line.push([x, y]);
            }
            if (ticks.length) axb_L(S, ticks, sc.fg, lw * 2, 1, { pre: pe, op: 'K*e', n: 'ticks' });
            if (!pts.length) continue;
            // the area under the line opens from the left with the line
            if (jzP(ctx, 'area', false) && pts.length > 1) axb_P(S, [[pts[0][0], yb]].concat(line, [[pts[pts.length - 1][0], yb]]), acc, 0.16, { piv: [pts[0][0], yb], sc: '[' + e + ',1]', op: 'K', n: 'area' });
            if (pts.length > 1) axb_L(S, [line], acc, lw * 3.5, 1, { trim: e, op: 'K', n: 'line' });
            for (j = 0; j < pts.length; j++) {
                var p = pts[j], pa = pe + 'var a=cl((e*' + pts.length + '-' + j + ')*2);';
                if (drop) axb_L(S, [[[p[0], p[1]], [p[0], yb]]], sc.sub, lw * 1.2, 0.5, { pre: pa, op: 'K*a', n: 'drop line' });
                axb_O(S, p[0], p[1], gs * 0.065, sc.bg, sc.fg, gs * 0.04, 1, { pre: pa, piv: [p[0], p[1]], sc: '[a,a]', op: 'K', n: 'point' });
                items.push({ text: p[2], font: font, size: jzChars(p[2]).length > 1 ? gs * 0.74 : gs, x: p[0], y: p[1] - gs * 0.78, color: sc.fg, mi: items.length });
            }
        }
        axb_flush(S);
        axb_multiOp(ctx, axb_multi(ctx, lStr, lPts, { size: ls * 0.85, align: 'center', alpha: 0.8, name: 'point numbers' }), lCol, 'K*cl((time-0.1-D*0.03)/0.2)');
        for (j = 0; j < items.length; j++) bb = jzUnion(bb, axb_draw(ctx, items[j]));
        return bb;
    }
});

/* ================================================================== 28 xbPie — 円グラフ */
axb_reg('xbPie', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['display', 'body', 'serif'])), a0: rng.range(-150, -60), side: rng.pick([0, 1]), rest: rng.range(0.14, 0.3), ex: rng.int(0, 3), hole: rng.chance(0.3) }; },
    build: function (ctx) {
        var B = axb_base(ctx), W = B.W, H = B.H, sc = B.sc, M = B.M, lw = B.lw, ls = B.ls, port = B.port, font = axb_font(ctx, 'font', 'display'), i;
        var side = jzP(ctx, 'side', 0), Rp = port ? Math.min(W * 0.3, H * 0.15) : Math.min(H * 0.3, W * 0.15);
        var pcx = port ? W / 2 : (side ? W * 0.95 - Rp * 1.2 : W * 0.05 + Rp * 1.2), pcy = port ? (side ? H * 0.94 - Rp * 1.15 : H * 0.06 + Rp * 1.15) : H / 2;
        var zx0 = port ? W * 0.08 : (side ? W * 0.06 : pcx + Rp * 1.45), zx1 = port ? W * 0.94 : (side ? pcx - Rp * 1.45 : W * 0.94);
        var zy0 = port ? (side ? H * 0.08 : pcy + Rp * 1.4) : H * 0.14, zy1 = port ? (side ? pcy - Rp * 1.4 : H * 0.92) : H * 0.86;
        var fb = axb_fitBox(B.txt, font, (zx1 - zx0) * 0.84, (zy1 - zy0) * 0.82, { lead: 1.5, track: 0.03 }, 4), lines = fb.text.split('\n'), L = lines.length, size = Math.min(M * 0.2, fb.size);
        var chip = size * 0.3, pitch = Math.min(size * 1.5, (zy1 - zy0) / L), mw = 0, cnt = [], sumc = 0;
        for (i = 0; i < L; i++) { mw = Math.max(mw, axb_meas(lines[i], size, { font: font, track: 0.03 }).w); cnt.push(Math.max(1, jzCount(lines[i]))); sumc += cnt[i]; }
        var bx = (zx0 + zx1) / 2 - (mw + chip + size * 0.35) / 2, tx = bx + chip + size * 0.35, cyT = (zy0 + zy1) / 2, tot = sumc / (1 - jzP(ctx, 'rest', 0.2));
        var c1 = axb_accentOn(sc), c2 = axb_pickPlate(sc, 'ink'), c3 = axb_pickPlate(sc, 'accent2');
        if (axb_same(c3, c1) || axb_same(c3, c2)) c3 = axb_pickPlate(sc, 'fg');
        var cols = [c1, c2, c3, sc.sub], A0 = jzP(ctx, 'a0', -90), a = A0, hole = jzP(ctx, 'hole', false), r0 = hole ? Rp * 0.42 : 0, exI = jzP(ctx, 'ex', 0) % L;
        var S = axb_sheet(ctx, 'pie'), items = [], labels = [], bb = null;
        for (i = 0; i <= L; i++) {       // the slices are the lines of the lyric (+ the unnamed rest); the pie fills clockwise
            var sp = (i < L ? cnt[i] : tot - sumc) / tot * 360, mid = (a + sp / 2) * Math.PI / 180, cm = Math.cos(mid), sm = Math.sin(mid);
            var col = i < L ? cols[i % 4] : axb_dimOf(sc), exo = i < L && i === exI ? Rp * 0.09 : 0, ox = cm * exo, oy = sm * exo;
            axb_A(S, pcx + ox, pcy + oy, (r0 + Rp) / 2, col, Rp - r0, 1,
                { toff: a + 0.6 + 90, trim: '(Math.min(' + jzN(a + sp) + ',' + jzN(A0) + '+360*' + axb_iE(0.9, 0) + ')-' + jzN(a + 1.2) + ')/360', op: 'K', n: 'slice ' + (i + 1) });
            if (i < L) {
                var y = cyT + (i - (L - 1) / 2) * pitch, el = axb_iE(0.5, 0.25 + i * 0.08);
                var p0 = [pcx + ox + cm * Rp * 0.72, pcy + oy + sm * Rp * 0.72], p1 = [pcx + ox + cm * Rp * 1.14, pcy + oy + sm * Rp * 1.14], p2 = [bx - size * 0.18, y];
                if (cm * (p2[0] - pcx) + sm * (p2[1] - pcy) > Rp * 0.3) axb_L(S, [[p0, p1, p2]], sc.sub, lw * 1.6, 0.8, { trim: el, op: 'K', n: 'leader ' + (i + 1) });
                axb_O(S, p0[0], p0[1], M * 0.006, axb_onCol(sc, col), null, 0, 1, { rs: el, op: 'K', n: 'leader dot' });
                axb_R(S, bx, y - chip / 2, chip, chip, col, 1, { piv: [bx, y], sc: '[' + el + ',1]', op: 'K', n: 'chip ' + (i + 1) });
                labels.push([Math.round(cnt[i] / tot * 100) + '%', p1[0] + (cm >= 0 ? ls * 0.4 : -ls * 0.4), p1[1] - ls * 0.9, cm >= 0 ? 'left' : 'right', 'K*cl((time-' + jzN(0.5 + i * 0.08) + ')/0.2)']);
                items.push({ text: lines[i], font: font, size: size, x: tx, y: y, align: 'left', track: 0.03, color: sc.fg, mi: i });
            }
            a += sp;
        }
        axb_flush(S);
        for (i = 0; i < labels.length; i++) axb_label(ctx, labels[i][0], labels[i][1], labels[i][2], { align: labels[i][3], size: ls * 0.9, op: labels[i][4] });
        for (i = 0; i < items.length; i++) bb = jzUnion(bb, axb_draw(ctx, items[i]));
        return bb;
    }
});

/* ================================================================== 29 xbCircleFit — 円形組 */
axb_reg('xbCircleFit', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['display'])), style: rng.pick(['plate', 'plate', 'ring']), col: rng.pick(['ink', 'accent', 'fg']), orb: rng.chance(0.6) }; },
    build: function (ctx) {
        var B = axb_base(ctx), W = B.W, H = B.H, sc = B.sc, M = B.M, lw = B.lw, txt = B.txt, font = axb_font(ctx, 'font', 'display'), i, k;
        var n = jzCount(txt), lines = axb_linesOf(txt, n <= 3 ? 1 : n <= 7 ? 2 : n <= 12 ? 3 : 4).split('\n'), L = lines.length, Rr = M * 0.44, Ri = Rr * 0.9, ld = 1.1;
        var u = [], sz = [], ys = [];
        for (i = 0; i < L; i++) { u.push(Math.max(0.2, axb_meas(lines[i], 100, { font: font, track: 0.02 }).w / 100)); sz.push(Ri * 1.5 / L); }
        // every line is sized to the chord it sits on (the last pass only shrinks)
        function place() { var tot = 0, y, j; for (j = 0; j < L; j++) tot += sz[j] * ld; y = -tot / 2; ys = []; for (j = 0; j < L; j++) { ys.push(y + sz[j] * ld / 2); y += sz[j] * ld; } }
        function chord(j) { var far = Math.abs(ys[j]) + sz[j] * 0.46; return 2 * Math.sqrt(Math.max(Ri * Ri * 0.01, Ri * Ri - far * far)); }
        for (k = 0; k < 14; k++) {
            place();
            var nx = [];
            for (i = 0; i < L; i++) nx.push(sz[i] * 0.45 + 0.55 * Math.min(Ri * 0.95, chord(i) * 0.95 / u[i]));
            sz = nx;
        }
        place();
        var fin = [];
        for (i = 0; i < L; i++) fin.push(Math.min(sz[i], chord(i) * 0.97 / u[i]));
        sz = fin;
        var cx = W / 2, cy = H / 2, e = 'ob(time/0.5,1.2)', plate = axb_pickPlate(sc, jzP(ctx, 'col', 'ink')), solid = jzP(ctx, 'style', 'plate') === 'plate', acc = axb_accentOn(sc), S = axb_sheet(ctx, 'disc');
        if (solid) axb_O(S, cx, cy, Rr, plate, null, 0, 1, { rs: e, op: 'K', n: 'disc' }); else axb_O(S, cx, cy, Rr, null, sc.fg, lw * 4, 1, { rs: e, op: 'K', n: 'ring' });
        axb_O(S, cx, cy, Rr + M * 0.022, null, solid ? plate : acc, lw * 1.6, 0.7, { rs: e, op: 'K', n: 'outer ring' });
        if (jzP(ctx, 'orb', true)) axb_O(S, cx, cy, M * 0.011, axb_same(acc, plate) ? sc.fg : acc, null, 0, 1, { pre: 'var a=time*0.5-1.2;', piv: [cx, cy], rs: e,
            pos: '[Math.cos(a)*' + jzN(Rr + M * 0.022) + ',Math.sin(a)*' + jzN(Rr + M * 0.022) + ']', op: 'K', n: 'orbit dot' });
        axb_flush(S);
        var bb = null;
        for (i = 0; i < L; i++) bb = jzUnion(bb, axb_draw(ctx, { text: lines[i], font: font, size: sz[i], x: cx, y: cy + ys[i], track: 0.02, color: solid ? axb_onCol(sc, plate) : sc.fg, mi: i }));
        return bb;
    }
});

/* ================================================================== 30 xbTriangleSet — 三角組 */
axb_reg('xbTriangleSet', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['display', 'serif'])), inv: rng.chance(0.4), style: rng.pick(['plate', 'plate', 'outline']), col: rng.pick(['ink', 'accent', 'fg']) }; },
    build: function (ctx) {
        var B = axb_base(ctx), W = B.W, H = B.H, sc = B.sc, M = B.M, lw = B.lw, txt = B.txt, font = axb_font(ctx, 'font', 'display'), i, j;
        var inv = jzP(ctx, 'inv', false), rows = axb_shapeRows(txt, AXB_TRI, inv) || axb_linesOf(txt, txt.split(/\s+/).length >= 3 ? 3 : 2).split('\n'), Rn = rows.length, ld = 116, sg = inv ? -1 : 1, hw = [];
        for (i = 0; i < Rn; i++) hw.push(axb_meas(rows[i], 100, { font: font, track: 0.04 }).w / 2);
        // unit space: apex at yA, base at yB (apex-up); inverted layouts mirror y
        function yr(q) { return ((inv ? Rn - 1 - q : q) - (Rn - 1) / 2) * ld; }
        var yB = (Rn * ld) / 2 + 26, yA = 0, Ht = 1, hb = 1, k = 0, As = [92, 140, 200, 270, 350];
        // apex distance: try a few and keep the one that lets the type come out largest
        for (j = 0; j < As.length; j++) {
            var ya = -(Rn * ld) / 2 - As[j], ht = yB - ya, h2 = 1;
            for (i = 0; i < Rn; i++) h2 = Math.max(h2, (hw[i] + 24) * ht / (yr(i) - 46 - ya));
            var kk = Math.min(W * 0.465 / h2, H * 0.9 / ht, M * 0.0026);
            if (kk > k * 1.03) { k = kk; yA = ya; Ht = ht; hb = h2; }
        }
        var size = 100 * k, cx = W / 2, mid = (yA + yB) / 2;
        function Y(y) { return H / 2 + sg * (y - mid) * k; }
        function tri(g) { return [[cx, H / 2 + sg * ((yA - mid) * k - g * 2)], [cx + hb * k + g * 1.8, H / 2 + sg * ((yB - mid) * k + g)], [cx - hb * k - g * 1.8, H / 2 + sg * ((yB - mid) * k + g)]]; }
        var plate = axb_pickPlate(sc, jzP(ctx, 'col', 'ink')), solid = jzP(ctx, 'style', 'plate') === 'plate', acc = axb_accentOn(sc), S = axb_sheet(ctx, 'triangle');
        var o = { pre: 'var e=ob(time/0.5,1.15);', piv: [cx, H / 2], sc: '[e,e]', op: 'K' };
        if (solid) axb_P(S, tri(0), plate, 1, axb_mix(o, { n: 'plate' })); else axb_loop(S, tri(0), sc.fg, lw * 3, 1, axb_mix(o, { n: 'outline' }));
        var g = Math.min(M * 0.022, (H * 0.96 - Ht * k) / 6);
        if (g > 2 * B.k) axb_loop(S, tri(g), solid ? plate : acc, lw * 2, 0.8, axb_mix(o, { n: 'outer line' }));
        axb_flush(S);
        var bb = null;
        for (i = 0; i < Rn; i++) bb = jzUnion(bb, axb_draw(ctx, { text: rows[i], font: font, size: size, x: cx, y: Y(yr(i)), track: 0.04, color: solid ? axb_onCol(sc, plate) : sc.fg, mi: i }));
        return bb;
    }
});
