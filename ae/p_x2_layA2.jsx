// ================================================================ pack x2layA part 2 (AE port of src/11p_x2_layA.js): layouts 15-30
// xaAirmail xaFigure xaLineNumbers xaPunchCard xaSpacers xaCutLine xaChecklist xaBlockquote xaScreenplay xaTearTabs xaBrace
// xaNutrition xaDogEar xaRuleSpecimen xaLetterhead xaSwatchFan
// (helpers: ae/p_x2_layA1.jsx)

/* ================================================================== 15 xaAirmail — エアメール
   the striped border is one layer of slanted stripes that scrolls behind a track matte of the border ring */
axa_reg('xaAirmail', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['serif', 'body', 'display'])), stamp: rng.chance(0.85), tilt: rng.pick([-2, 0, 2]), tag: rng.chance(0.7) }; },
    build: function (ctx) {
        var B = axa_base(ctx), W = B.W, H = B.H, sc = B.sc, M = B.M, port = B.port, lw = B.lw, ls = B.ls, font = jzP(ctx, 'font', jzSerifF(ctx));
        var ew = port ? W * 0.88 : Math.min(W * 0.84, H * 0.82 * 1.5), eh = port ? Math.min(H * 0.6, ew * 1.15) : ew / 1.5, x0 = (W - ew) / 2, y0 = (H - eh) / 2;
        var paper = axa_paperOf(sc), ink = axa_onCol(sc, paper), c1 = axa_accOn(sc, paper);
        var c2 = sc.accent2 && String(sc.accent2).toUpperCase() !== String(c1).toUpperCase() && jzContrast(sc.accent2, paper) >= 1.6 ? sc.accent2 : ink;
        axa_tilt(W / 2, H / 2, jzP(ctx, 'tilt', 0));
        var e = axa_iE(0.45, 0), a = e + '*K', b = M * 0.03, la = axa_iC(0.3, 0.3) + '*K', S = axa_sheet(ctx, 'envelope'), k, i, x;
        axa_R(S, x0, y0, ew, eh, paper, 1, { pos: '[0,(1-' + e + ')*' + jzN(M * 0.04) + ']', op: a, n: 'paper' });
        // stripes
        var p = b * 2.6, ST = axa_sheet(ctx, 'airmail stripes'), cols = [c1, c2];
        for (k = 0; k < 2; k++) {
            var segs = [];
            for (x = x0 - eh - p * 2 + k * p * 0.5, i = 0; x < x0 + ew + p && i < 200; x += p, i++) segs.push([[x, y0 + eh], [x + p * 0.27, y0 + eh], [x + p * 0.27 + eh, y0], [x + eh, y0]]);
            axa_spec(ST, null, { k: 'path', segs: segs, closed: true, fill: cols[k], a: 1, pos: '[(time*' + jzN(b * 0.5) + ')%' + jzN(p) + ',0]', n: 'stripes ' + (k + 1) });
        }
        ST.lop = a;
        var SL = axa_flush(ST, false), MT = axa_sheet(ctx, 'border matte');
        axa_R(MT, x0, y0, ew, b, '#FFFFFF', 1); axa_R(MT, x0, y0 + eh - b, ew, b, '#FFFFFF', 1); axa_R(MT, x0, y0 + b, b, eh - b * 2, '#FFFFFF', 1); axa_R(MT, x0 + ew - b, y0 + b, b, eh - b * 2, '#FFFFFF', 1);
        axa_matte(SL, axa_flush(MT, false), TrackMatteType.ALPHA);
        if (jzP(ctx, 'stamp', true)) {
            var sw = Math.min(eh * 0.2, ew * 0.14), sh2 = sw * 1.2, sx = x0 + ew - b * 2 - sw, sy = y0 + b * 2;
            axa_L(S, [[[sx, sy], [sx + sw, sy]], [[sx, sy + sh2], [sx + sw, sy + sh2]], [[sx, sy], [sx, sy + sh2]], [[sx + sw, sy], [sx + sw, sy + sh2]]], ink, lw * 2, 1, { dash: [lw * 2, lw * 3], op: la, n: 'perforation' });
            axa_R(S, sx + sw * 0.14, sy + sw * 0.14, sw * 0.72, sh2 - sw * 0.28, c1, 0.85, { op: la, n: 'stamp' });
            axa_label(ctx, axa_p2(B.no), sx + sw / 2, sy + sh2 / 2, { align: 'center', color: axa_onCol(sc, c1), op: la, size: sw * 0.34, track: 0 });
            var pe = 'oc((time-0.45)/0.3)*K', px = sx - sw * 0.1, py = sy + sh2 * 0.62, pr = sw * 0.46, wv = [];
            axa_O(S, px, py, pr, null, ink, lw * 1.5, 0.7, { sc: '[1.25-0.25*' + pe + ',1.25-0.25*' + pe + ']', piv: [px, py], op: pe, n: 'postmark' });
            axa_O(S, px, py, pr * 0.66, null, ink, lw, 0.7, { op: pe, n: 'postmark inner' });
            for (k = 0; k < 4; k++) { var pts = []; for (i = 0; i <= 16; i++) pts.push([px - pr * 1.2 - (i / 16) * sw * 1.5, py + (k - 1.5) * pr * 0.42 + Math.sin(i * 1.1) * pr * 0.09]); wv.push(pts); }
            axa_L(S, wv, ink, lw * 1.3, 0.6, { sc: '[' + pe + ',1]', piv: [px - pr * 1.2, py], op: pe, n: 'postmark waves' });
        }
        if (jzP(ctx, 'tag', true)) {
            var tw = Math.min(ew * 0.26, ls * 11), th = ls * 1.9, tx = x0 + b * 2, ty = y0 + eh - b * 2 - th;
            axa_R(S, tx, ty, tw, th, c1, 1, { sc: '[' + axa_iE(0.4, 0.25) + ',1]', piv: [tx, ty], op: 'K', n: 'par avion' });
            axa_label(ctx, 'PAR AVION', tx + tw / 2, ty + th / 2, { align: 'center', color: axa_onCol(sc, c1), op: la, size: Math.min(ls, tw * 0.1), track: 0.2 });
        }
        var o = { lead: 1.25, track: 0.03 }, f = axa_fitBox(B.txt, font, ew * 0.74, eh * 0.4, o, port ? 4 : 3), size = Math.min(f.size, M * 0.22);
        var it = { text: f.text, font: font, size: size, x: W / 2, y: y0 + eh * 0.55, color: ink, lead: 1.25, track: 0.03, fitW: ew * 0.74 }, m = axa_meas(it.text, size, it);
        var uy = it.y + m.h / 2 + size * 0.22, ue = axa_iE(0.6, 0.2) + '*K';
        axa_L(S, [[[W / 2 - m.w / 2, uy], [W / 2 + m.w / 2, uy]]], ink, lw, 0.6, { trim: '0.5+0.5*' + ue, start: '0.5-0.5*' + ue, n: 'underline' });
        axa_flush(S, true);
        return axa_draw(ctx, it);
    }
});

/* ================================================================== 16 xaFigure — 図版 */
axa_reg('xaFigure', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['serif', 'display', 'body'])), side: rng.pick(['l', 'r']), pic: rng.pick(['x', 'scene', 'target']), top: rng.chance(0.5) }; },
    build: function (ctx) {
        var B = axa_base(ctx), W = B.W, H = B.H, sc = B.sc, M = B.M, port = B.port, lw = B.lw, ls = B.ls, font = jzP(ctx, 'font', jzSerifF(ctx)), side = jzP(ctx, 'side', 'l'), pic = jzP(ctx, 'pic', 'x'), top = jzP(ctx, 'top', true);
        var o = { lead: 1.22, track: 0.03 }, dim = axa_dimOf(sc), acc = axa_accentOn(sc), bx, by, bw, bh, it, f, size, m, cx, cy, cw;
        if (!port) {
            bw = W * 0.3; bh = H * 0.58; by = (H - bh) / 2; bx = side === 'l' ? W * 0.07 : W * 0.93 - bw;
            var gap = W * 0.04, aw = W * 0.86 - bw - gap;
            f = axa_fitBox(B.txt, font, aw, bh * 0.7, o, 3); size = Math.min(f.size, M * 0.24);
            it = { text: f.text, font: font, size: size, align: 'left', x: side === 'l' ? bx + bw + gap : W * 0.07, color: sc.fg, lead: 1.22, track: 0.03, fitW: aw };
            m = axa_meas(it.text, size, it); it.y = by + bh - m.h / 2 - size * 0.05; cx = it.x; cy = it.y - m.h / 2 - size * 0.45; cw = aw;
        } else {
            bw = W * 0.86; bh = H * 0.3; bx = W * 0.07; by = top ? H * 0.1 : H * 0.6;
            f = axa_fitBox(B.txt, font, bw, H * 0.34, o, 4); size = Math.min(f.size, M * 0.24);
            it = { text: f.text, font: font, size: size, align: 'left', x: bx, color: sc.fg, lead: 1.22, track: 0.03, fitW: bw };
            m = axa_meas(it.text, size, it); it.y = top ? by + bh + ls * 4 + m.h / 2 : by - ls * 2 - m.h / 2; cx = bx; cy = it.y - m.h / 2 - ls * 1.6; cw = bw;
        }
        var e = axa_iE(0.6, 0) + '*K', e2 = 'ioc((time-0.15)/0.6)*K', S = axa_sheet(ctx, 'picture box'), mid = [bx + bw / 2, by + bh / 2], g2 = '[' + e2 + ',' + e2 + ']';
        axa_R(S, bx, by, bw, bh, dim, 0.7, { sc: '[1,' + e + ']', piv: [bx, by], n: 'box' });
        axa_L(S, [[[bx, by], [bx + bw, by], [bx + bw, by + bh], [bx, by + bh], [bx, by]]], sc.sub, lw * 1.5, 1, { trim: e2, n: 'box frame' });
        if (pic === 'x') axa_L(S, [[[bx, by], [bx + bw, by + bh]], [[bx + bw, by], [bx, by + bh]]], sc.sub, lw, 0.9, { trim: e2, n: 'cross' });
        else if (pic === 'scene') {
            axa_L(S, [[[bx, by + bh * 0.8], [bx + bw * 0.3, by + bh * 0.45], [bx + bw * 0.5, by + bh * 0.68], [bx + bw * 0.7, by + bh * 0.38], [bx + bw, by + bh * 0.75]]], sc.sub, lw * 1.5, 0.9, { trim: e2, n: 'hills' });
            axa_O(S, bx + bw * 0.24, by + bh * 0.24, Math.min(bw, bh) * 0.08, null, sc.sub, lw * 1.5, 0.9, { sc: g2, piv: [bx + bw * 0.24, by + bh * 0.24], n: 'sun' });
        } else {
            var r = Math.min(bw, bh) * 0.22;
            axa_O(S, mid[0], mid[1], r, null, sc.sub, lw * 1.5, 0.9, { sc: g2, piv: mid, n: 'target' });
            axa_L(S, [[[mid[0] - r * 1.5, mid[1]], [mid[0] + r * 1.5, mid[1]]], [[mid[0], mid[1] - r * 1.5], [mid[0], mid[1] + r * 1.5]]], sc.sub, lw, 0.9, { sc: g2, piv: mid, n: 'target cross' });
        }
        var la = axa_iC(0.3, 0.3) + '*K';
        axa_label(ctx, 'FPO', bx + ls * 0.7, by + bh - ls, { alpha: 0.8, op: la, size: ls * 0.85 });
        axa_label(ctx, Math.round(bw) + ' × ' + Math.round(bh), bx + bw - ls * 0.7, by + bh - ls, { align: 'right', alpha: 0.8, op: la, size: ls * 0.85 });
        axa_label(ctx, 'FIG. ' + axa_p2(B.no), cx, cy, { op: la, color: acc, size: ls * 1.1 });
        if (cw - ls * 6.2 > 0) axa_L(S, [[[cx + ls * 6.2, cy], [cx + cw, cy]]], sc.sub, lw, 0.8, { trim: axa_iE(0.6, 0.25), op: 'K', n: 'caption rule' });
        axa_flush(S, true);
        return axa_draw(ctx, it);
    }
});

/* ================================================================== 17 xaLineNumbers — 行番号 */
axa_reg('xaLineNumbers', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['serif', 'body', 'display'])), hl: rng.chance(0.65), start: rng.int(1, 90), every: rng.pick([1, 1, 5]) }; },
    build: function (ctx) {
        var B = axa_base(ctx), W = B.W, H = B.H, sc = B.sc, M = B.M, port = B.port, lw = B.lw, font = jzP(ctx, 'font', jzSerifF(ctx));
        var lead = 1.5, o = { lead: lead, track: 0.03 }, gw = M * 0.12, tx = W * 0.07 + gw;
        var f = axa_fitBox(B.txt, font, W * 0.86 - gw, H * 0.5, o, port ? 4 : 3), size = Math.min(f.size, M * 0.2), L = f.text.split('\n').length;
        var pitch = size * lead, dim = axa_dimOf(sc), acc = axa_accentOn(sc), i;
        function yOf(q) { return H / 2 + (q - (L - 1) / 2) * pitch; }
        var before = Math.max(0, Math.min(3, Math.floor((yOf(0) - H * 0.08) / pitch))), after = Math.max(0, Math.min(3, Math.floor((H * 0.92 - yOf(L - 1)) / pitch)));
        var rx = tx - gw * 0.22, S = axa_sheet(ctx, 'listing'), ns = Math.min(size * 0.3, gw * 0.3), nA = [[], [], []], nB = [[], [], []];
        axa_L(S, [[[rx, H * 0.06], [rx, H * 0.94]]], sc.sub, lw, 0.8, { trim: axa_iE(0.7, 0) + '*K', n: 'gutter rule' });
        if (jzP(ctx, 'hl', true)) axa_R(S, rx, yOf(0) - pitch / 2, W - rx, L * pitch, dim, 0.55, { sc: '[' + axa_iE(0.5, 0.05) + ',1]', piv: [rx, yOf(0)], op: 'K', n: 'live lines' });
        for (i = -before; i < L + after; i++) {
            var live = i >= 0 && i < L, num = jzP(ctx, 'start', 1) + before + i, dl = 0.05 + (i + before) * 0.04, nn = live ? nA : nB;
            if (live || jzP(ctx, 'every', 1) === 1 || num % 5 === 0) { nn[0].push(String(num)); nn[1].push([rx - gw * 0.14, yOf(i)]); nn[2].push(dl); }
            if (!live) axa_R(S, tx, yOf(i) - size * 0.09, (W * 0.86 - gw) * (0.35 + 0.55 * axa_r(B.seed, i + 9, 31)), size * 0.18, dim, 1, { sc: '[' + axa_iE(0.6, dl) + ',1]', piv: [tx, yOf(i)], op: 'K', n: 'other line' });
        }
        axa_flush(S, true);
        axa_multiOp(ctx, axa_multi(ctx, nA[0], nA[1], { size: ns, align: 'right', track: 0, color: acc, name: 'line numbers' }), nA[2], 'oc((time-D)/0.3)*K');
        axa_multiOp(ctx, axa_multi(ctx, nB[0], nB[1], { size: ns, align: 'right', track: 0, color: sc.sub, alpha: 0.7, name: 'other numbers' }), nB[2], 'oc((time-D)/0.3)*K');
        return axa_draw(ctx, { text: f.text, font: font, size: size, align: 'left', x: tx, y: H / 2, color: sc.fg, lead: lead, track: 0.03, fitW: W * 0.86 - gw });
    }
});

/* ================================================================== 18 xaPunchCard — パンチカード
   the digit field is drawn as dashed column strokes; the holes are punched four columns at a time */
axa_reg('xaPunchCard', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['body', 'display', 'mono'])), cols: rng.pick([28, 32, 36]), tilt: rng.pick([0, -1.5, 1.5]) }; },
    build: function (ctx) {
        var B = axa_base(ctx), W = B.W, H = B.H, sc = B.sc, M = B.M, port = B.port, lw = B.lw, ls = B.ls, font = jzP(ctx, 'font', jzBodyF(ctx));
        var cw = port ? W * 0.9 : Math.min(W * 0.88, H * 0.82 * 1.9), ch = port ? Math.min(H * 0.7, cw * 1.35) : cw / 1.9, x0 = (W - cw) / 2, y0 = (H - ch) / 2;
        var paper = axa_paperOf(sc), ink = axa_onCol(sc, paper), faint = jzMixHex(paper, ink, 0.3), S = axa_sheet(ctx, 'punch card'), k, r;
        axa_tilt(W / 2, H / 2, jzP(ctx, 'tilt', 0));
        var e = axa_iE(0.45, 0), c = ch * 0.09, la = axa_iC(0.3, 0.25) + '*K';
        axa_P(S, [[x0 + c, y0], [x0 + cw, y0], [x0 + cw, y0 + ch], [x0, y0 + ch], [x0, y0 + c]], paper, 1, { pos: '[' + jzN(-W * 0.08) + '*(1-' + e + '),0]', op: e + '*K', n: 'card' });
        var zy = y0 + ch * (port ? 0.34 : 0.4), nR = port ? 12 : 9, nC = port ? 18 : jzP(ctx, 'cols', 32), gx = x0 + cw * 0.05, gw = cw * 0.9, gy = zy + ch * 0.045, gh = y0 + ch * 0.95 - gy, cx = gw / nC, cy = gh / nR;
        axa_L(S, [[[x0 + cw * 0.05, zy], [x0 + cw * 0.95, zy]]], ink, lw * 1.5, 1, { trim: axa_iE(0.6, 0.15), op: 'K', n: 'field rule' });
        axa_label(ctx, 'JZ ' + (5000 + (axa_h(B.seed, 4) % 999)), x0 + cw * 0.95, y0 + ls * 1.3, { align: 'right', color: faint, op: la, size: ls * 0.85 });
        var marks = [], holes = [], hl = [], k0 = 0;
        for (k = 0; k < nC; k++) {
            var xc = gx + k * cx + cx * 0.5, h1 = axa_h(B.seed, k, 51) % nR, h2 = axa_h(B.seed, k, 53) % (nR * 3);
            marks.push([[xc, gy + cy * 0.34], [xc, gy + nR * cy]]);
            for (r = 0; r < nR; r++) if (r === h1 || r === h2) hl.push([[gx + k * cx + cx * 0.2, gy + r * cy + cy * 0.08], [gx + k * cx + cx * 0.8, gy + r * cy + cy * 0.08], [gx + k * cx + cx * 0.8, gy + r * cy + cy * 0.92], [gx + k * cx + cx * 0.2, gy + r * cy + cy * 0.92]]);
            if (k % 4 === 3 || k === nC - 1) {
                axa_L(S, marks, faint, cx * 0.28, 1, { dash: [cy * 0.32, cy * 0.68], op: axa_iC(0.3, 0.1 + (k0 + k) / 2 * 0.012) + '*K', n: 'digits ' + (k0 + 1) });
                if (hl.length) holes.push({ k: 'path', segs: hl, closed: true, fill: sc.bg, a: 1, op: 'cl((time-0.2)/0.9)*' + nC + '>' + jzN((k0 + k) / 2) + '?K:0', n: 'holes ' + (k0 + 1) });
                marks = []; hl = []; k0 = k + 1;
            }
        }
        for (k = 0; k < holes.length; k++) axa_spec(S, null, holes[k]);
        axa_flush(S, true);
        var zh = zy - y0, o = { lead: 1.18, track: 0.03 }, f = axa_fitBox(B.txt, font, cw * 0.84, zh * 0.74, o, port ? 4 : 2), size = Math.min(f.size, M * 0.24);
        return axa_draw(ctx, { text: f.text, font: font, size: size, x: W / 2 + c * 0.2, y: y0 + zh * 0.53, color: ink, lead: 1.18, track: 0.03, fitW: cw * 0.84 });
    }
});

/* ================================================================== 19 xaSpacers — 込め物 */
axa_reg('xaSpacers', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['display', 'serif'])), lab: rng.chance(0.75), style: rng.pick(['x', 'fill', 'hatch']), tr: rng.pick([0.5, 0.62, 0.75]) }; },
    build: function (ctx) {
        var B = axa_base(ctx), W = B.W, H = B.H, sc = B.sc, M = B.M, port = B.port, lw = B.lw, font = jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'display')), style = jzP(ctx, 'style', 'x'), tr = jzP(ctx, 'tr', 0.62);
        var n = jzCount(B.txt), Ln = port ? Math.ceil(n / 4) : Math.ceil(n / 5), lead = 1.75;
        var mt = axa_evenSplit(B.txt, Ln).join('\n'), o = { lead: lead, track: tr };
        var size = Math.min(axa_fit(mt, font, W * 0.76, H * 0.66, o), M * 0.26);
        var it = { text: mt, font: font, size: size, x: W / 2, y: H / 2, color: sc.fg, lead: lead, track: tr };
        var gl = axa_gpts(it), dim = axa_dimOf(sc), acc = axa_accentOn(sc), q = 0, S = axa_sheet(ctx, 'spacing quads'), i, j, k, lA = [[], [], []], lB = [[], [], []];
        for (i = 0; i < gl.length; i++) {
            var a = gl[i], b = gl[i + 1], first = i === 0 || gl[i - 1].li !== a.li, last = !b || b.li !== a.li, quads = [];
            if (first) quads.push([a.x - a.w / 2 - size * 0.42, a.x - a.w / 2 - size * 0.06]);
            quads.push(last ? [a.x + a.w / 2 + size * 0.06, a.x + a.w / 2 + size * 0.42] : [a.x + a.w / 2 + size * 0.05, b.x - b.w / 2 - size * 0.05]);
            for (j = 0; j < quads.length; j++) {
                var xa = quads[j][0], xb = quads[j][1], dl = 0.1 + q * 0.03, wq = xb - xa; q++;
                if (wq < size * 0.08) continue;
                var h = size * 0.9, ya = a.y - h / 2, g = { sc: '[1,' + axa_iE(0.45, dl) + '*K]', piv: [xa, a.y], n: 'quad ' + q };
                if (style === 'fill') axa_R(S, xa, ya, wq, h, dim, 1, g);
                else {
                    var sg = [[[xa, ya], [xb, ya], [xb, ya + h], [xa, ya + h], [xa, ya]]];
                    if (style === 'x') { sg.push([[xa, ya], [xb, ya + h]]); sg.push([[xb, ya], [xa, ya + h]]); }
                    else for (k = 1; k <= 3; k++) sg.push([[xa, ya + h * k / 4], [xb, ya + h * k / 4 - Math.min(h / 4, wq * 0.6)]]);
                    axa_L(S, sg, sc.sub, lw, 0.8, g);
                }
                if (jzP(ctx, 'lab', true)) {
                    var ll = (first && quads.length > 1 && xa < a.x && q % 2) ? lB : lA;
                    ll[0].push((wq / size).toFixed(2).replace(/^0/, '')); ll[1].push([(xa + xb) / 2, a.y + size * 0.66]); ll[2].push(dl);
                }
            }
        }
        axa_flush(S, true);
        var fs = Math.max(9 * B.k, size * 0.12), fa = 'oe((time-D)/0.45)*K';
        axa_multiOp(ctx, axa_multi(ctx, lA[0], lA[1], { size: fs, align: 'center', track: 0, color: acc, name: 'quad widths' }), lA[2], fa);
        axa_multiOp(ctx, axa_multi(ctx, lB[0], lB[1], { size: fs, align: 'center', track: 0, color: sc.sub, name: 'quad widths 2' }), lB[2], fa);
        return axa_draw(ctx, it);
    }
});

/* ================================================================== 20 xaCutLine — 切り取り線
   the dashed line is one path trimmed at the scissors; the scissors are their own layer travelling along it */
axa_reg('xaCutLine', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['display', 'serif', 'body'])), pos: rng.pick(['low', 'low', 'high']), stub: rng.pick(['bar', 'form']), dir: rng.pick([1, 1, -1]) }; },
    build: function (ctx) {
        var B = axa_base(ctx), W = B.W, H = B.H, sc = B.sc, M = B.M, port = B.port, lw = B.lw, ls = B.ls, c = B.c, font = jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'display')), d = jzP(ctx, 'dir', 1);
        var low = jzP(ctx, 'pos', 'low') === 'low', yl = H * (low ? (port ? 0.72 : 0.68) : (port ? 0.28 : 0.32));
        var zy0 = low ? H * 0.06 : yl, zy1 = low ? yl : H * 0.94, sy0 = low ? yl : H * 0.06, sy1 = low ? H * 0.94 : yl, scy = (sy0 + sy1) / 2, sh = sy1 - sy0, k;
        var o = { lead: 1.2, track: 0.03 }, f = axa_fitBox(B.txt, font, W * 0.84, (zy1 - zy0) * 0.72, o, port ? 4 : 2), size = Math.min(f.size, M * 0.3);
        var e = axa_iE(0.6, 0), T = jzN(Math.max(0.6, c.dur - (c.outDur || 0))), acc = axa_accentOn(sc), s = M * 0.046, S = axa_sheet(ctx, 'cut line');
        var far = d > 0 ? W + 10 : -10, near = d > 0 ? -10 : W + 10, F0 = '((10+' + jzN(W) + '*(0.05+0.9*cl(time/' + T + ')))/' + jzN(W + 20) + ')';
        // uncut part dashed, cut part a faint hairline
        axa_L(S, [[[near, yl], [far, yl]]], sc.fg, lw * 2, 1, { dash: [lw * 7, lw * 6], start: F0, trim: F0 + '+(1-' + F0 + ')*' + e, op: 'K', n: 'dashed line' });
        axa_L(S, [[[near, yl], [far, yl]]], sc.sub, lw, 0.45, { trim: F0 + '-' + jzN(s * 1.5 / (W + 20)), op: e + '*K', n: 'cut line' });
        // scissors (drawn round the pivot of the blades; the layer rides along the line)
        var SC = axa_sheet(ctx, 'scissors'), px = -d * s * 0.2, sw = lw * 2.4;
        for (k = -1; k <= 1; k += 2) {
            axa_O(SC, -d * s * 1.25, k * s * 0.5, s * 0.3, null, sc.fg, sw, 1, { n: 'handle' });
            axa_L(SC, [[[-d * s * 0.98, k * s * 0.34], [px, 0]]], sc.fg, sw, 1, { n: 'arm' });
            axa_L(SC, [[[px, 0], [px + d * s * 1.15, 0]]], sc.fg, sw, 1, { piv: [px, 0], rot: 'Math.atan(' + jzN(-k * d / 1.15) + '*(0.35+0.3*Math.sin(time*13)))*180/Math.PI', n: 'blade' });
        }
        axa_O(SC, px, 0, lw * 2.2, acc, null, 0, 1, { n: 'pivot' });
        SC.lop = e + '*K';
        var SL = axa_flush(SC, false);
        jzSetExpr(jzXf(SL, 'ADBE Position'), axa_hd(ctx) + 'var u=cl(time/' + T + ');[' + (d > 0 ? jzN(W) + '*(0.05+0.9*u)' : jzN(W) + '*(0.95-0.9*u)') + ',' + jzN(yl) + ']');
        var la = axa_iC(0.3, 0.3) + '*K', latin = jzIsLatinText(B.txt);
        axa_label(ctx, latin ? 'CUT HERE' : 'キリトリ', d > 0 ? W * 0.93 : W * 0.07, yl + (low ? -1 : 1) * ls * 1.1, { align: d > 0 ? 'right' : 'left', font: jzBodyF(ctx), op: la, size: ls * 0.9, track: 0.3 });
        // stub
        axa_label(ctx, 'No.' + jzPad(1 + (axa_h(B.seed, 5) % 9999), 4), W * 0.07, scy - sh * 0.2, { op: la, color: acc });
        if (jzP(ctx, 'stub', 'bar') === 'bar') {
            var gk = axa_greek(S, W * 0.07, scy - sh * 0.02, W * 0.32, 2, ls * 1.2, axa_dimOf(sc), 1, B.seed, axa_iE(0.5, 0.3));
            if (gk) gk.op = la;
            axa_barcode(S, W * 0.93 - W * 0.3, scy - sh * 0.22, W * 0.3, sh * 0.44, sc.sub, la, B.seed, axa_iE(0.6, 0.3));
        } else {
            var names = ['NAME', 'DATE', 'SIGN'];
            for (k = 0; k < 3; k++) {
                var x = W * 0.07 + k * W * 0.3;
                axa_label(ctx, names[k], x, scy + sh * 0.02, { op: la, size: ls * 0.8 });
                axa_L(S, [[[x, scy + sh * 0.2], [x + W * 0.26, scy + sh * 0.2]]], sc.sub, lw, 1, { trim: axa_iE(0.5, 0.3 + k * 0.08), op: 'K', n: 'field ' + (k + 1) });
            }
        }
        axa_flush(S, true);
        return axa_draw(ctx, { text: f.text, font: font, size: size, x: W / 2, y: (zy0 + zy1) / 2, color: sc.fg, lead: 1.2, track: 0.03, fitW: W * 0.84 });
    }
});

/* ================================================================== 21 xaChecklist — チェック欄 */
axa_reg('xaChecklist', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['body', 'display', 'serif'])), box: rng.pick(['sq', 'sq', 'circle']), pre: rng.int(0, 1), post: rng.int(1, 2) }; },
    build: function (ctx) {
        var B = axa_base(ctx), W = B.W, H = B.H, sc = B.sc, M = B.M, port = B.port, lw = B.lw, ls = B.ls, font = jzP(ctx, 'font', jzBodyF(ctx)), i, r;
        var n = jzChars(B.txt).length, lines = axa_smartSplit(B.txt, port ? (n <= 4 ? 1 : n <= 8 ? 2 : n <= 12 ? 3 : 4) : (n <= 7 ? 1 : n <= 13 ? 2 : 3), port), L = lines.length;
        var pre = jzP(ctx, 'pre', 0), post = L >= 3 ? 1 : jzP(ctx, 'post', 1), rows = pre + L + post, areaH = H * 0.72, size = Math.min(M * 0.22, areaH / rows * 0.62);
        for (i = 0; i < L; i++) size = Math.min(size, axa_fit(lines[i], font, W * 0.7, 1e6, { track: 0.03 }));
        var pitch = Math.min(size * 1.55, areaH / rows), bs = size * 0.62, x0 = W * 0.08, tx = x0 + bs * 1.7, yT = H * 0.53 - rows * pitch / 2;
        var acc = axa_accentOn(sc), dim = axa_dimOf(sc), la = axa_iC(0.3, 0.15) + '*K', S = axa_sheet(ctx, 'checklist'), bb = null, its = [], t0s = [];
        for (r = 0; r < rows; r++) {
            var y = yT + (r + 0.5) * pitch, li = r - pre, live = li >= 0 && li < L, dl = 0.05 + r * 0.06, a = axa_iC(0.3, dl) + '*K', e = axa_iE(0.5, dl), bc = live ? sc.fg : sc.sub;
            axa_L(S, [[[x0, y + pitch / 2], [x0 + W * 0.84, y + pitch / 2]]], sc.sub, lw, 0.5, { trim: e, op: 'K', n: 'row rule ' + (r + 1) });
            if (jzP(ctx, 'box', 'sq') === 'circle') axa_O(S, x0 + bs / 2, y, bs / 2, null, bc, lw * 2, 1, { op: a, n: 'box ' + (r + 1) });
            else axa_F(S, x0, y - bs / 2, bs, bs, bc, lw * 2, 1, { op: a, n: 'box ' + (r + 1) });
            if (r < pre + L) {
                var t0 = live ? (B.c.inDur || 0.3) * 0.7 + li * 0.16 : 0.1;
                if (live) t0s.push(jzN(t0));
                axa_L(S, [[[x0 + bs * 0.12, y - bs * 0.02], [x0 + bs * 0.42, y + bs * 0.3], [x0 + bs * 1.12, y - bs * 0.62]]], live ? acc : sc.sub, Math.max(3 * B.k, bs * 0.13), 1, { trim: 'oc((time-' + jzN(t0) + ')/0.22)*K', n: 'tick ' + (r + 1) });
            }
            if (live) its.push({ text: lines[li], font: font, size: size, align: 'left', x: tx, y: y, track: 0.03, color: sc.fg, mi: li * 2 });
            else {
                var w = W * (0.3 + 0.3 * axa_r(B.seed, r, 61));
                axa_R(S, tx, y - size * 0.09, w, size * 0.18, dim, 1, { sc: '[' + e + ',1]', piv: [tx, y], op: 'K', n: 'other item' });
                if (r < pre) axa_L(S, [[[tx - size * 0.1, y], [tx + w + size * 0.1, y]]], sc.sub, lw * 1.5, 0.8, { trim: axa_iE(0.5, 0.3), op: 'K', n: 'done' });
            }
        }
        axa_flush(S, true);
        axa_label(ctx, 'CHECK LIST', x0, yT - ls * 1.4, { op: la, track: 0.3 });
        // the count follows the ticks
        var Cn = axa_label(ctx, (pre + L) + ' / ' + rows, x0 + W * 0.84, yT - ls * 1.4, { align: 'right', op: la, color: acc, name: 'count' });
        try { Cn.property('ADBE Text Properties').property('ADBE Text Document').expression = axa_hd(ctx) + 'var T=[' + t0s.join(',') + '],n=' + pre + ';for(var i=0;i<T.length;i++)if(oc((time-T[i])/0.22)*K>0.5)n++;n+" / ' + rows + '"'; } catch (ex) { jzWarn('checklist count: ' + ex.toString()); }
        for (i = 0; i < its.length; i++) bb = jzUnion(bb, axa_draw(ctx, its[i]));
        return bb;
    }
});

/* ================================================================== 22 xaBlockquote — 引用線 */
axa_reg('xaBlockquote', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['serif', 'display'])), side: rng.pick(['l', 'l', 'r']), bar: rng.pick(['solid', 'solid', 'double', 'dots']), cite: rng.chance(0.7), col: rng.pick(['accent', 'accent', 'fg']) }; },
    build: function (ctx) {
        var B = axa_base(ctx), W = B.W, H = B.H, sc = B.sc, M = B.M, port = B.port, lw = B.lw, ls = B.ls, font = jzP(ctx, 'font', jzSerifF(ctx)), bar = jzP(ctx, 'bar', 'solid'), cite = jzP(ctx, 'cite', true), i;
        var o = { lead: 1.32, track: 0.03 }, f = axa_fitBox(B.txt, font, W * 0.72, H * 0.56, o, port ? 4 : 3), size = Math.min(f.size, M * 0.24);
        var left = jzP(ctx, 'side', 'l') === 'l', it = { text: f.text, font: font, size: size, align: left ? 'left' : 'right', color: sc.fg, lead: 1.32, track: 0.03, fitW: W * 0.72 }, m = axa_meas(it.text, size, it);
        var bwd = Math.max(6 * B.k, size * 0.09), gap = size * 0.5, tot = bwd + gap + m.w, bx = left ? (W - tot) / 2 : (W + tot) / 2 - bwd;
        it.x = left ? bx + bwd + gap : bx - gap; it.y = H / 2 - (cite ? size * 0.2 : 0);
        var y0 = it.y - m.h / 2 - size * 0.18, hh = m.h + size * 0.36, e = axa_iE(0.55, 0) + '*XO', c = jzP(ctx, 'col', 'accent') === 'accent' ? axa_accentOn(sc) : sc.fg, S = axa_sheet(ctx, 'quote bar');
        if (bar === 'dots') {
            var kd = Math.max(3, Math.round(hh / (bwd * 2))), sg = [], i0 = 0;
            for (i = 0; i < kd; i++) {
                var yy = y0 + (hh - bwd) * (i / Math.max(1, kd - 1));
                sg.push([[bx, yy], [bx + bwd, yy], [bx + bwd, yy + bwd], [bx, yy + bwd]]);
                if (sg.length >= 3 || i === kd - 1) { axa_spec(S, null, { k: 'path', segs: sg, closed: true, fill: c, a: 1, op: e + '*' + kd + '>' + i0 + '?1:0', n: 'dots' }); sg = []; i0 = i + 1; }
            }
        } else {
            axa_R(S, bx, y0, bwd * (bar === 'double' ? 0.6 : 1), hh, c, 1, { sc: '[1,' + e + ']', piv: [bx, y0], n: 'bar' });
            if (bar === 'double') axa_R(S, bx + (left ? bwd * 0.9 : -bwd * 0.3 - lw), y0, Math.max(lw, bwd * 0.12), hh, c, 1, { sc: '[1,' + e + ']', piv: [bx, y0], n: 'bar 2' });
        }
        if (cite) {
            var cy = Math.min(H * 0.94, y0 + hh + size * 0.45), cx = left ? it.x + m.w : it.x - m.w, sg2 = left ? -1 : 1;
            axa_label(ctx, 'LINE ' + axa_p2(B.no), cx, cy, { align: left ? 'right' : 'left', op: axa_iC(0.35, 0.35) + '*K' });
            axa_L(S, [[[cx + sg2 * ls * 5.4, cy], [cx + sg2 * (ls * 5.4 + size * 0.6), cy]]], sc.sub, lw, 0.8, { trim: axa_iE(0.5, 0.35), op: 'K', n: 'cite rule' });
        }
        axa_flush(S, true);
        return axa_draw(ctx, it);
    }
});

/* ================================================================== 23 xaScreenplay — 台本 */
axa_reg('xaScreenplay', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['serif', 'body'])), scn: rng.int(1, 99), io: rng.pick(['INT.', 'EXT.']), time: rng.pick(['NIGHT', 'DAY', 'DAWN', 'DUSK']), vo: rng.pick([' (V.O.)', ' (O.S.)', '']), trans: rng.pick(['CUT TO:', 'FADE OUT.', 'DISSOLVE TO:']), guides: rng.chance(0.7) }; },
    build: function (ctx) {
        var B = axa_base(ctx), W = B.W, H = B.H, sc = B.sc, M = B.M, port = B.port, lw = B.lw, ls = B.ls, font = jzP(ctx, 'font', jzSerifF(ctx));
        var colW = W * (port ? 0.8 : 0.6), o = { lead: 1.32, track: 0.03 }, s2 = ls * 1.15;
        var f = axa_fitBox(B.txt, font, colW * 0.96, H * 0.42, o, port ? 4 : 3), size = Math.min(f.size, M * 0.2);
        var it = { text: f.text, font: font, size: size, x: W / 2, y: H * 0.55, color: sc.fg, lead: 1.32, track: 0.03, fitW: colW * 0.96 }, m = axa_meas(it.text, size, it);
        function la(k) { return axa_iC(0.3, 0.08 * k) + '*K'; }
        var x0 = W * 0.08, x1 = W * 0.92, hy = H * 0.11, S = axa_sheet(ctx, 'script page');
        axa_label(ctx, jzP(ctx, 'scn', 1) + '   ' + jzP(ctx, 'io', 'INT.') + ' LYRIC — ' + jzP(ctx, 'time', 'NIGHT'), x0, hy, { color: sc.fg, op: la(0), size: s2 });
        axa_label(ctx, B.no + '.', x1, hy, { align: 'right', op: la(0), size: s2 });
        axa_L(S, [[[x0, hy + s2 * 1.1], [x1, hy + s2 * 1.1]]], sc.sub, lw, 0.8, { trim: axa_iE(0.6, 0), op: 'K', n: 'slug rule' });
        axa_label(ctx, 'VOICE' + jzP(ctx, 'vo', ''), W / 2, it.y - m.h / 2 - s2 * 1.9, { align: 'center', color: axa_accentOn(sc), op: la(2), size: s2, track: 0.3 });
        if (jzP(ctx, 'guides', true)) axa_L(S, [[[W / 2 - colW / 2, hy + s2 * 2.6], [W / 2 - colW / 2, H * 0.86]], [[W / 2 + colW / 2, hy + s2 * 2.6], [W / 2 + colW / 2, H * 0.86]]], sc.sub, lw, 0.5, { dash: [lw * 3, lw * 5], trim: axa_iE(0.7, 0.1), op: 'K', n: 'dialogue guides' });
        axa_label(ctx, '(CONTINUED)', x0, H * 0.9, { alpha: 0.8, op: la(4), size: s2 * 0.9 });
        axa_label(ctx, jzP(ctx, 'trans', 'CUT TO:'), x1, H * 0.9, { align: 'right', color: sc.fg, op: la(5), size: s2 });
        axa_flush(S, true);
        return axa_draw(ctx, it);
    }
});

/* ================================================================== 24 xaTearTabs — ちぎり札 */
axa_reg('xaTearTabs', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['display', 'body'])), nT: rng.pick([7, 8, 9]), g1: rng.int(0, 8), g2: rng.int(0, 8), tilt: rng.pick([-1.5, 0, 1.5]), pin: rng.chance(0.8) }; },
    build: function (ctx) {
        var B = axa_base(ctx), W = B.W, H = B.H, sc = B.sc, M = B.M, port = B.port, lw = B.lw, ls = B.ls, font = jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'display'));
        var fw = port ? W * 0.84 : Math.min(W * 0.62, H), fh = H * 0.86, x0 = (W - fw) / 2, y0 = (H - fh) / 2, tabH = fh * 0.25, bodyH = fh - tabH;
        var paper = axa_paperOf(sc), ink = axa_onCol(sc, paper), faint = jzMixHex(paper, ink, 0.4), latin = jzIsLatinText(B.txt), nT = jzP(ctx, 'nT', 8), tw = fw / nT, k;
        var tabT = axa_short(B.txt.replace(/\s+/g, latin ? ' ' : ''), latin ? 12 : 6), tl = jzChars(tabT).length, S = axa_sheet(ctx, 'flyer');
        axa_tilt(W / 2, y0, jzP(ctx, 'tilt', 0));
        var e = axa_iE(0.45, 0), a = e + '*K', la = axa_iC(0.3, 0.3) + '*K', ty = y0 + bodyH, mot = ctx.fx.motion == null ? 0.7 : ctx.fx.motion;
        axa_R(S, x0, y0, fw, bodyH, paper, 1, { sc: '[1,' + e + ']', piv: [x0, y0], op: 'K', n: 'notice' });
        for (k = 0; k < nT; k++) {
            var gone = k === jzP(ctx, 'g1', 0) % nT || k === (jzP(ctx, 'g2', 0) + 3) % nT, cx = x0 + (k + 0.5) * tw, ea = axa_iE(0.4, 0.2 + k * 0.03) + '*K';
            if (gone) { axa_R(S, cx - tw * 0.46, ty - 1, tw * 0.92, tabH * 0.05 + 1, paper, 1, { op: ea, n: 'torn tab ' + (k + 1) }); continue; }
            // the tab hangs from the tear line and sways; its text sways with it
            var sway = 'Math.sin(time*1.4+' + jzN(k * 1.9) + ')*' + jzN(1.6 * mot);
            axa_R(S, cx - tw * 0.46, ty - 1, tw * 0.92, tabH + 1, paper, 1, { sc: '[1,' + ea + ']', piv: [cx, ty], rot: sway, op: 'K', n: 'tab ' + (k + 1) });
            var fsz = Math.min(tw * 0.4, tabH * 0.84 / Math.max(1, tl * (latin ? 0.62 : 1.06)));
            var TL = axa_label(ctx, tabT, cx, ty + tabH * 0.5, { align: 'center', font: jzBodyF(ctx), size: fsz, color: ink, op: ea + '*' + la, track: 0.02, vertical: !latin, rot: latin ? 90 : 0, name: 'tab text ' + (k + 1) });
            if (TL) { axa_pivot(TL, cx, ty); jzSetExpr(jzXf(TL, 'ADBE Rotate Z'), 'value+' + sway); }
        }
        axa_L(S, [[[x0, ty], [x0 + fw, ty]]], faint, lw * 1.3, 1, { dash: [lw * 4, lw * 4], op: la, n: 'tear line' });
        axa_label(ctx, 'TAKE ONE', W / 2, ty - ls * 1.5, { align: 'center', color: faint, op: la, track: 0.4 });
        if (jzP(ctx, 'pin', true)) { axa_O(S, W / 2, y0 + fh * 0.035, M * 0.013, axa_accOn(sc, paper), null, 0, 1, { op: a, n: 'pin' }); axa_O(S, W / 2 - M * 0.004, y0 + fh * 0.035 - M * 0.004, M * 0.004, paper, null, 0, 0.7, { op: a, n: 'pin light' }); }
        axa_flush(S, true);
        var o = { lead: 1.2, track: 0.02 }, f = axa_fitBox(B.txt, font, fw * 0.84, bodyH * 0.62, o, port ? 4 : 3), size = Math.min(f.size, M * 0.26);
        return axa_draw(ctx, { text: f.text, font: font, size: size, x: W / 2, y: y0 + bodyH * 0.49, color: ink, lead: 1.2, track: 0.02, fitW: fw * 0.84 });
    }
});

/* ================================================================== 25 xaBrace — 括弧まとめ */
function axa_bracePts(x, y0, y1, d, r) {
    var ym = (y0 + y1) / 2, top = [], N = 8, i, t;
    for (i = 0; i <= N; i++) { t = (i / N) * Math.PI / 2; top.push([x + (d / 2) * Math.sin(t), y0 + r * (1 - Math.cos(t))]); }
    for (i = 0; i <= N; i++) { t = (i / N) * Math.PI / 2; top.push([x + d / 2 + (d / 2) * (1 - Math.cos(t)), ym - r + r * Math.sin(t)]); }
    var out = top.slice(0);
    for (i = top.length - 2; i >= 0; i--) out.push([top[i][0], y0 + y1 - top[i][1]]);
    return out;
}
axa_reg('xaBrace', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['display', 'serif'])), pos: rng.pick(['r', 'l', 'under', 'r']), col: rng.pick(['accent', 'accent', 'fg']) }; },
    build: function (ctx) {
        var B = axa_base(ctx), W = B.W, H = B.H, sc = B.sc, M = B.M, port = B.port, ls = B.ls, font = jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'display')), pos = jzP(ctx, 'pos', 'r'), i;
        var n = jzCount(B.txt), latin = jzIsLatinText(B.txt), c = jzP(ctx, 'col', 'accent') === 'accent' ? axa_accentOn(sc) : sc.fg, bf = jzBodyF(ctx);
        var cnt = latin ? B.txt.split(/\s+/).length + ' WORDS' : n + ' 字', e = 'ioc((time-0.12)/0.6)*XO', la = axa_iC(0.3, 0.55) + '*K', S = axa_sheet(ctx, 'brace');
        var under = pos === 'under' && !port && n <= 9, o = { lead: 1.25, track: 0.03 }, size, it, m, d, pts;
        if (under) {
            size = Math.min(axa_fit(B.txt, font, W * 0.82, H * 0.3, o), M * 0.26);
            it = { text: B.txt, font: font, size: size, x: W / 2, y: H * 0.44, color: sc.fg, lead: 1.25, track: 0.03, fitW: W * 0.82 }; m = axa_meas(it.text, size, it);
            var by = it.y + m.h / 2 + size * 0.22;
            d = size * 0.36; pts = axa_bracePts(by, W / 2 - m.w / 2, W / 2 + m.w / 2, d, d * 0.5);
            for (i = 0; i < pts.length; i++) pts[i] = [pts[i][1], pts[i][0]];
            axa_L(S, [pts], c, Math.max(2.5 * B.k, size * 0.028), 1, { trim: e, n: 'brace' });
            axa_flush(S, true);
            axa_label(ctx, cnt, W / 2, by + d + ls * 1.9, { align: 'center', font: bf, size: ls * 2.2, color: c, op: la });
            axa_label(ctx, 'LINE ' + axa_p2(B.no), W / 2, by + d + ls * 4.2, { align: 'center', op: la });
            return axa_draw(ctx, it);
        }
        var labW = ls * (latin ? 11 : 8.5), f = axa_fitBox(B.txt, font, W * 0.84 - labW - M * 0.1, H * 0.6, o, port ? 4 : 3);
        size = Math.min(f.size, M * 0.24);
        var right = pos !== 'l';
        it = { text: f.text, font: font, size: size, align: right ? 'left' : 'right', y: H / 2, color: sc.fg, lead: 1.25, track: 0.03, fitW: W * 0.84 - labW - M * 0.1 }; m = axa_meas(it.text, size, it);
        d = Math.min(size * 0.4, M * 0.07);
        var gap = size * 0.3, tot = m.w + gap + d + gap * 0.6 + labW, xs = (W - tot) / 2, s = right ? 1 : -1;
        it.x = right ? xs : W - xs;
        var bx = it.x + s * (m.w + gap);
        pts = axa_bracePts(bx, H / 2 - m.h / 2 - size * 0.1, H / 2 + m.h / 2 + size * 0.1, s * d, Math.min(d * 0.6, m.h * 0.2));
        axa_L(S, [pts], c, Math.max(2.5 * B.k, size * 0.028), 1, { trim: e, n: 'brace' });
        axa_flush(S, true);
        var lx = bx + s * (d + gap * 0.6);
        axa_label(ctx, cnt, lx, H / 2 - ls * 1.1, { align: right ? 'left' : 'right', font: bf, size: ls * 2.1, color: c, op: la, track: 0.05 });
        axa_label(ctx, 'LINE ' + axa_p2(B.no), lx, H / 2 + ls * 1.3, { align: right ? 'left' : 'right', op: la });
        return axa_draw(ctx, it);
    }
});

/* ================================================================== 26 xaNutrition — 成分表示 */
axa_reg('xaNutrition', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['display', 'body'])), tilt: rng.pick([0, 0, -1.5, 1.5]), inv: rng.chance(0.4) }; },
    build: function (ctx) {
        var B = axa_base(ctx), W = B.W, H = B.H, sc = B.sc, M = B.M, port = B.port, lw = B.lw, ls = B.ls, font = jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'display')), inv = jzP(ctx, 'inv', false), i;
        var bw = port ? W * 0.84 : Math.min(W * 0.52, H * 0.95), bh = H * 0.84, x0 = (W - bw) / 2, y0 = (H - bh) / 2, p = bw * 0.055;
        var paper = axa_paperOf(sc), ink = inv ? axa_onCol(sc, paper) : sc.fg, sub = inv ? jzMixHex(paper, ink, 0.6) : sc.sub, bf = jzBodyF(ctx);
        var chars = jzChars(B.txt.replace(/\s+/g, '')), nK = 0, nKa = 0, nL = 0;
        for (i = 0; i < chars.length; i++) { if (jzIsKanji(chars[i])) nK++; if (jzIsHira(chars[i]) || jzIsKata(chars[i])) nKa++; if (jzIsLatin(chars[i])) nL++; }
        var rowsD = [['GLYPHS', chars.length], ['KANJI', nK], ['KANA', nKa], ['LATIN', nL], ['LINE No.', B.no], ['SECONDS', (B.c.dur || 0).toFixed(1)]], S = axa_sheet(ctx, 'facts label');
        axa_tilt(W / 2, H / 2, jzP(ctx, 'tilt', 0));
        S.lop = 'K';
        var e = axa_iE(0.5, 0), bl = Math.max(4 * B.k, M * 0.007);
        if (inv) axa_R(S, x0, y0, bw, bh, paper, 1, { sc: '[' + e + ',1]', piv: [W / 2, y0], n: 'paper' });
        axa_L(S, [[[x0, y0], [x0 + bw, y0], [x0 + bw, y0 + bh], [x0, y0 + bh], [x0, y0]]], ink, bl, 1, { trim: 'ioc(time/0.6)', n: 'box' });
        var zh = bh * 0.38, yb = y0 + zh + p, xl = x0 + p, xr = x0 + bw - p, iw = bw - p * 2;
        axa_R(S, xl, yb, iw, bh * 0.022, ink, 1, { sc: '[' + axa_iE(0.5, 0.1) + ',1]', piv: [xl, yb], n: 'heavy bar' });
        var la0 = axa_iC(0.3, 0.2) + '*K', rs = Math.min(ls * 1.25, bw * 0.045);
        axa_label(ctx, 'Per 1 line', xl, yb + bh * 0.022 + rs * 1.2, { color: sub, op: la0, size: rs * 0.85, font: bf, track: 0.04 });
        var ry0 = yb + bh * 0.022 + rs * 2.2, rh = (y0 + bh - p - rs * 1.6 - ry0) / rowsD.length, kS = [], kP = [], vS = [], vP = [], dD = [];
        for (i = 0; i < rowsD.length; i++) {
            var y = ry0 + rh * i, ee = axa_iE(0.5, 0.15 + i * 0.05);
            if (i === 1) axa_R(S, xl, y - bh * 0.005, iw, bh * 0.01, ink, 1, { sc: '[' + ee + ',1]', piv: [xl, y], n: 'bar' });
            else axa_L(S, [[[xl, y], [xl + iw, y]]], ink, lw, 1, { trim: ee, n: 'row rule ' + (i + 1) });
            kS.push(rowsD[i][0]); kP.push([xl + (i > 0 && i < 4 ? rs : 0), y + rh / 2]); vS.push(String(rowsD[i][1])); vP.push([xr, y + rh / 2]); dD.push(0.2 + i * 0.05);
        }
        axa_R(S, xl, ry0 + rh * rowsD.length - bh * 0.005, iw, bh * 0.01, ink, 1, { sc: '[' + axa_iE(0.5, 0.4) + ',1]', piv: [xl, y0], n: 'foot bar' });
        axa_flush(S, true);
        axa_multiOp(ctx, axa_multi(ctx, kS, kP, { size: rs, align: 'left', track: 0.08, color: ink, name: 'facts' }), dD, 'oc((time-D)/0.3)*K');
        axa_multiOp(ctx, axa_multi(ctx, vS, vP, { font: bf, size: rs * 1.15, align: 'right', track: 0.02, color: ink, name: 'figures' }), dD, 'oc((time-D)/0.3)*K');
        axa_label(ctx, '* DAILY VALUE NOT ESTABLISHED', xl, y0 + bh - p - rs * 0.3, { color: sub, op: la0, size: rs * 0.7, track: 0.04 });
        var o = { lead: 1.15, track: 0.01 }, f = axa_fitBox(B.txt, font, iw, zh * 0.82, o, 4), size = Math.min(f.size, M * 0.26);
        return axa_draw(ctx, { text: f.text, font: font, size: size, align: 'left', x: xl, y: y0 + p * 0.6 + zh / 2, color: ink, lead: 1.15, track: 0.01, fitW: iw });
    }
});

/* ================================================================== 27 xaDogEar — 折れ角
   the page is a plain sheet; an inverted track matte (a triangle growing from the corner) cuts the folded corner away,
   the flap is a second triangle growing from the same corner */
axa_reg('xaDogEar', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['serif', 'display'])), corner: rng.pick(['tr', 'tr', 'tl', 'br']), tilt: rng.pick([-1.5, 0, 0, 1.5]), stack: rng.chance(0.6), k: rng.range(0.11, 0.17) }; },
    build: function (ctx) {
        var B = axa_base(ctx), W = B.W, H = B.H, sc = B.sc, M = B.M, port = B.port, lw = B.lw, ls = B.ls, font = jzP(ctx, 'font', jzSerifF(ctx)), corner = String(jzP(ctx, 'corner', 'tr'));
        var pw = port ? W * 0.84 : Math.min(W * 0.68, H * 1.15), ph = H * 0.84, x0 = (W - pw) / 2, y0 = (H - ph) / 2, x1 = x0 + pw, y1 = y0 + ph;
        var paper = axa_paperOf(sc), ink = axa_onCol(sc, paper), faint = jzMixHex(paper, ink, 0.45), shade = jzMixHex(paper, ink, 0.24);
        var fl = corner.indexOf('l') >= 0, fb = corner.indexOf('b') >= 0;
        function mp(pts) { var o2 = [], q; for (q = 0; q < pts.length; q++) o2.push([fl ? x0 + x1 - pts[q][0] : pts[q][0], fb ? y0 + y1 - pts[q][1] : pts[q][1]]); return o2; }
        axa_tilt(W / 2, H / 2, jzP(ctx, 'tilt', 0));
        var e = axa_iE(0.45, 0), a = e + '*K', F = M * jzP(ctx, 'k', 0.14), fp = 'oc((time-0.3)/0.45)', la = axa_iC(0.3, 0.3) + '*K', dy = '[0,(1-' + e + ')*' + jzN(M * 0.04) + ']';
        var cn = mp([[x1, y0]])[0], gf = '[' + fp + ',' + fp + ']';
        var PG = axa_sheet(ctx, 'page');
        axa_R(PG, x0, y0, pw, ph, paper, 1, { pos: dy, op: a, n: 'page' });
        var PL = axa_flush(PG, false), MT = axa_sheet(ctx, 'corner matte');
        axa_P(MT, mp([[x1 - F, y0], [x1, y0], [x1, y0 + F]]), '#FFFFFF', 1, { sc: gf, piv: cn, n: 'corner' });
        axa_matte(PL, axa_flush(MT, false), TrackMatteType.ALPHA_INVERTED);
        var FL = axa_sheet(ctx, 'folded corner');
        axa_P(FL, mp([[x1 - F, y0], [x1 - F, y0 + F], [x1, y0 + F]]), shade, 1, { sc: gf, piv: cn, n: 'flap' });
        axa_L(FL, [mp([[x1 - F, y0], [x1, y0 + F]])], faint, lw, 1, { sc: gf, piv: cn, n: 'fold' });
        FL.lop = a;
        axa_flush(FL, false);
        var S = axa_sheet(ctx, 'page furniture'), hy = y0 + ph * 0.09, top = !fb;
        axa_L(S, [[[x0 + pw * 0.08, hy], [x0 + pw * 0.08 + pw * (top ? 0.66 : 0.84), hy]]], faint, lw, 1, { trim: axa_iE(0.6, 0.15), op: 'K', n: 'running head rule' });
        axa_flush(S, false);
        axa_label(ctx, axa_short(B.c.lineText || B.txt, port ? 14 : 22), x0 + pw * 0.08, hy - ls * 0.9, { font: jzBodyF(ctx), color: faint, op: la, size: ls * 0.9, track: 0.08 });
        axa_label(ctx, '— ' + B.no + ' —', W / 2, y1 - ph * 0.06, { align: 'center', color: faint, op: la });
        if (jzP(ctx, 'stack', false)) { var SK = axa_sheet(ctx, 'page behind'); axa_R(SK, x0 + M * 0.016, y0 + M * 0.016, pw, ph, jzMixHex(paper, sc.bg, 0.5), 1, { pos: dy, op: a, n: 'page behind' }); axa_flush(SK, true); }
        var o = { lead: 1.32, track: 0.03 }, f = axa_fitBox(B.txt, font, pw * 0.8, ph * 0.56, o, 4), size = Math.min(f.size, M * 0.24);
        return axa_draw(ctx, { text: f.text, font: font, size: size, x: W / 2, y: y0 + ph * 0.51, color: ink, lead: 1.32, track: 0.03, fitW: pw * 0.8 });
    }
});

/* ================================================================== 28 xaRuleSpecimen — 罫線見本 */
var AXA_RULES = [['thick', '4 PT'], ['double', 'DOUBLE'], ['dotted', 'DOTTED'], ['wave', 'WAVE'], ['scotch', 'SCOTCH'], ['dashed', 'DASHED']];
axa_reg('xaRuleSpecimen', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['display', 'serif'])), o: rng.int(0, 5), lab: rng.chance(0.85), acc: rng.int(0, 5), al: rng.pick(['left', 'left', 'center']) }; },
    build: function (ctx) {
        var B = axa_base(ctx), W = B.W, H = B.H, sc = B.sc, M = B.M, port = B.port, lw = B.lw, ls = B.ls, font = jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'display')), lab = jzP(ctx, 'lab', true), al = jzP(ctx, 'al', 'left'), k, i, x;
        var n = jzChars(B.txt).length, lines = axa_smartSplit(B.txt, port ? (n <= 4 ? 1 : n <= 8 ? 2 : n <= 12 ? 3 : 4) : (n <= 8 ? 1 : n <= 14 ? 2 : 3), port), L = lines.length;
        var x0 = W * 0.07, tw = W * 0.86, size = Math.min(M * 0.24, H * 0.7 / (L * 1.75));
        for (i = 0; i < L; i++) size = Math.min(size, axa_fit(lines[i], font, tw, 1e6, { track: 0.03 }));
        var pitch = size * 1.75, ys = [];
        for (k = 0; k <= L; k++) ys.push(H / 2 + (k - L / 2) * pitch);
        if (L === 1) { ys.unshift(ys[0] - pitch * 0.3); ys.push(ys[ys.length - 1] + pitch * 0.3); }
        var labW = lab ? ls * 7 : 0, t = Math.max(3 * B.k, size * 0.045), S = axa_sheet(ctx, 'rules'), nS = [], nP = [], nD = [], full = tw - labW;
        for (k = 0; k < ys.length; k++) {
            var y = ys[k], R = AXA_RULES[(k + jzP(ctx, 'o', 0)) % AXA_RULES.length], kind = R[0], e = axa_iE(0.6, 0.06 * k) + '*XO', c = k === jzP(ctx, 'acc', 0) % ys.length ? axa_accentOn(sc) : sc.fg;
            // odd rules run in from the right
            var xa = k % 2 ? x0 + full : x0, xb = k % 2 ? x0 : x0 + full, g = { trim: e, n: 'rule ' + (k + 1) + ' ' + kind };
            if (kind === 'thick') axa_L(S, [[[xa, y], [xb, y]]], c, t, 1, g);
            else if (kind === 'double') axa_L(S, [[[xa, y - t * 0.45], [xb, y - t * 0.45]], [[xa, y + t * 0.45], [xb, y + t * 0.45]]], c, t * 0.3, 1, g);
            else if (kind === 'scotch') { axa_L(S, [[[xa, y - t * 0.3], [xb, y - t * 0.3]]], c, t * 0.8, 1, g); axa_L(S, [[[xa, y + t * 0.7], [xb, y + t * 0.7]]], c, Math.max(lw, t * 0.16), 1, g); }
            else if (kind === 'dashed') axa_L(S, [[[xa, y], [xb, y]]], c, t * 0.4, 1, axa_mix(g, { dash: [t * 2.4, t * 1.4] }));
            else if (kind === 'dotted') axa_L(S, [[[xa, y], [xb, y]]], c, t * 0.6, 1, axa_mix(g, { dash: [0.01, t * 1.5], cap: 2 }));
            else {
                var pts = [];
                for (x = x0; x <= x0 + full; x += t * 0.8) pts.push([x, y + Math.sin((x - x0) / (t * 1.3)) * t * 0.55]);
                if (k % 2) pts.reverse();
                if (pts.length > 1) axa_L(S, [pts], c, t * 0.32, 1, g);
            }
            if (lab) { nS.push(R[1]); nP.push([x0 + tw, y]); nD.push(0.25 + 0.06 * k); }
        }
        axa_flush(S, true);
        axa_multiOp(ctx, axa_multi(ctx, nS, nP, { size: ls * 0.9, align: 'right', color: sc.sub, name: 'rule names' }), nD, 'oc((time-D)/0.3)*K');
        var bb = null, o0 = L === 1 ? 1 : 0;
        for (i = 0; i < L; i++) bb = jzUnion(bb, axa_draw(ctx, { text: lines[i], font: font, size: size, align: al, x: al === 'left' ? x0 : W / 2, y: (ys[i + o0] + ys[i + o0 + 1]) / 2, track: 0.03, color: sc.fg, mi: i * 2 }));
        return bb;
    }
});

/* ================================================================== 29 xaLetterhead — レターヘッド */
axa_reg('xaLetterhead', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['serif', 'body', 'display'])), mark: rng.pick(['circle', 'sq', 'tri']), sign: rng.chance(0.85), s1: rng.int(1, 999) }; },
    build: function (ctx) {
        var B = axa_base(ctx), W = B.W, H = B.H, sc = B.sc, M = B.M, port = B.port, lw = B.lw, ls = B.ls, font = jzP(ctx, 'font', jzSerifF(ctx)), mark = jzP(ctx, 'mark', 'circle'), sign = jzP(ctx, 'sign', true), k, i;
        var x0 = W * 0.08, x1 = W * 0.92, ty = H * 0.075, ms = M * 0.075, acc = axa_accentOn(sc), dim = axa_dimOf(sc), S = axa_sheet(ctx, 'stationery');
        var em = 'ob(time/0.45,1.6)*K', cx = x0 + ms / 2, cy = ty + ms / 2, gm = '[' + em + ',' + em + ']';
        if (mark === 'circle') { axa_O(S, cx, cy, ms / 2, acc, null, 0, 1, { sc: gm, piv: [cx, cy], n: 'mark' }); axa_O(S, cx + ms * 0.38, cy, ms / 2, null, sc.fg, lw * 2, 1, { sc: gm, piv: [cx + ms * 0.38, cy], n: 'mark ring' }); }
        else if (mark === 'sq') { axa_R(S, cx - ms / 2, cy - ms / 2, ms, ms, acc, 1, { sc: gm, piv: [cx, cy], n: 'mark' }); axa_F(S, cx - ms * 0.2, cy - ms * 0.2, ms, ms, sc.fg, lw * 2, 1, { sc: gm, piv: [cx - ms * 0.2, cy - ms * 0.2], n: 'mark frame' }); }
        else { axa_P(S, [[cx - ms / 2, cy + ms / 2], [cx, cy - ms / 2], [cx + ms / 2, cy + ms / 2]], acc, 1, { sc: gm, piv: [cx, cy], n: 'mark' }); axa_O(S, cx + ms * 0.34, cy + ms * 0.1, ms * 0.3, null, sc.fg, lw * 2, 1, { sc: gm, piv: [cx + ms * 0.34, cy + ms * 0.1], n: 'mark ring' }); }
        var e1 = axa_iE(0.55, 0.1), la = axa_iC(0.3, 0.3) + '*K', ad = [], ft = [];
        // greeked name / address / footer: bars as strokes, grown by Trim Paths
        axa_L(S, [[[x0 + ms * 1.7, cy - ms * 0.14], [x0 + ms * 1.7 + W * 0.2, cy - ms * 0.14]]], sc.fg, ms * 0.16, 0.9, { trim: e1, op: 'K', n: 'name' });
        axa_L(S, [[[x0 + ms * 1.7, cy + ms * 0.15], [x0 + ms * 1.7 + W * 0.12, cy + ms * 0.15]]], dim, ms * 0.1, 1, { trim: e1, op: 'K', n: 'name 2' });
        for (k = 0; k < 3; k++) ad.push([[x1, ty + ms * (0.12 + k * 0.3) + ms * 0.045], [x1 - W * (0.16 - k * 0.03), ty + ms * (0.12 + k * 0.3) + ms * 0.045]]);
        axa_L(S, ad, dim, ms * 0.09, 1, { trim: e1, op: 'K', n: 'address' });
        var hy = ty + ms + M * 0.03;
        axa_L(S, [[[x0, hy], [x1, hy]]], sc.fg, lw * 1.4, 1, { trim: axa_iE(0.7, 0.05), op: 'K', n: 'head rule' });
        axa_label(ctx, 'REF. ' + axa_p2(B.no) + '-' + jzPad(jzP(ctx, 's1', 1), 3), x1, hy + ls * 1.4, { align: 'right', op: la });
        axa_L(S, [[[x0, H * 0.925], [x1, H * 0.925]]], sc.sub, lw, 0.7, { trim: axa_iE(0.7, 0.2), op: 'K', n: 'foot rule' });
        for (k = 0; k < 3; k++) ft.push([[W / 2 - W * 0.15 + k * W * 0.105, H * 0.945 + ms * 0.04], [W / 2 - W * 0.15 + k * W * 0.105 + W * 0.09, H * 0.945 + ms * 0.04]]);
        axa_L(S, ft, dim, ms * 0.08, 1, { trim: e1, op: 'K', n: 'footer' });
        var o = { lead: 1.32, track: 0.03 }, top = hy + ls * 2.6, bot = H * (sign ? 0.76 : 0.88);
        var f = axa_fitBox(B.txt, font, W * 0.84, (bot - top) * 0.86, o, port ? 4 : 3), size = Math.min(f.size, M * 0.22);
        if (sign) {
            var sw = M * 0.3, sx = x1 - sw, sy = H * 0.845, pts = [], ph = (B.seed % 628) / 100;
            for (i = 0; i <= 96; i++) { var u = i / 96, kk = 1 - u * 0.55, th = u * 34 + ph; pts.push([sx + u * sw * 0.86 + Math.cos(th) * sw * 0.04 * kk, sy - (Math.sin(th) * 0.55 + Math.sin(u * 9 + ph * 2) * 0.45 + 0.3) * M * 0.036 * kk]); }
            pts.push([sx + sw * 0.98, sy - M * 0.02]);
            axa_L(S, [pts], acc, Math.max(2.5 * B.k, M * 0.004), 1, { trim: 'ioc((time-0.5)/0.7)', op: 'K', n: 'signature' });
            axa_L(S, [[[sx, sy + M * 0.03], [sx + sw, sy + M * 0.03]]], sc.sub, lw, 1, { trim: axa_iE(0.5, 0.35), op: 'K', n: 'signature line' });
            axa_label(ctx, 'SIGNED', sx, sy + M * 0.03 + ls * 1.1, { op: la, size: ls * 0.85 });
        }
        axa_flush(S, true);
        return axa_draw(ctx, { text: f.text, font: font, size: size, align: 'left', x: x0, y: (top + bot) / 2, color: sc.fg, lead: 1.32, track: 0.03, fitW: W * 0.84 });
    }
});

/* ================================================================== 30 xaSwatchFan — 色見本帳 (one layer per chip, turning about the rivet) */
axa_reg('xaSwatchFan', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['display', 'body'])), nb: rng.pick([2, 3, 3]), dir: rng.pick([1, -1]), code: rng.int(100, 999), ang: rng.range(9, 13) }; },
    build: function (ctx) {
        var B = axa_base(ctx), W = B.W, H = B.H, sc = B.sc, M = B.M, port = B.port, lw = B.lw, ls = B.ls, font = jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'display')), d = jzP(ctx, 'dir', 1), k;
        var ch = port ? Math.min(H * 0.68, W * 0.66 * 1.75) : H * 0.82, cw = port ? W * 0.66 : Math.min(W * 0.4, ch * 0.66);
        var cx = W / 2 + d * W * (port ? 0.05 : 0.09), x0 = cx - cw / 2, y0 = (H - ch) / 2, px = cx, py = y0 + ch - cw * 0.13, r = cw * 0.05;
        var paper = axa_paperOf(sc), ink = axa_onCol(sc, paper), fieldH = ch * 0.68, src = [sc.accent, sc.accent2, sc.ink, sc.sub, jzMixHex(paper, ink, 0.6)], cols = [];
        for (k = 0; k < src.length; k++) if (src[k] && jzContrast(src[k], paper) >= 1.35) cols.push(src[k]);
        var field = cols[0] || jzMixHex(paper, ink, 0.8), fon = axa_onCol(sc, field), hd = axa_hd(ctx), e = axa_iE(0.45, 0);
        function chip(col, rotK, name) {
            var S = axa_sheet(ctx, name);
            axa_RR(S, x0, y0, cw, ch, r, paper, 1, null, 0, { n: 'chip' });
            axa_RR(S, x0 + cw * 0.05, y0 + cw * 0.05, cw * 0.9, fieldH, r * 0.5, col, 1, null, 0, { n: 'colour' });
            axa_O(S, px, py, r, sc.bg, null, 0, 1, { n: 'rivet hole' });
            axa_O(S, px, py, r * 1.5, null, jzMixHex(paper, ink, 0.5), lw * 1.5, 1, { n: 'rivet' });
            S.lop = e + '*K';
            var L = axa_flush(S, false);
            jzXf(L, 'ADBE Anchor Point').setValue([px, py]); jzXf(L, 'ADBE Position').setValue([px, py]);
            jzSetExpr(jzXf(L, 'ADBE Position'), hd + '[value[0],value[1]+(1-' + e + ')*' + jzN(M * 0.05) + ']');
            if (rotK) jzSetExpr(jzXf(L, 'ADBE Rotate Z'), hd + jzN(rotK) + '*ob((time-0.15)/0.6,1.2)');
            return L;
        }
        for (k = jzP(ctx, 'nb', 3); k >= 1; k--) chip(cols[k % Math.max(1, cols.length)] || field, -d * k * jzP(ctx, 'ang', 11), 'chip ' + (k + 1));
        chip(field, 0, 'top chip');
        var la = axa_iC(0.3, 0.3) + '*K', ly = y0 + cw * 0.05 + fieldH;
        axa_label(ctx, 'JZ ' + jzP(ctx, 'code', 100) + ' C', x0 + cw * 0.07, ly + (py - r * 2 - ly) * 0.34, { color: ink, op: la, size: Math.min(ls * 1.3, cw * 0.07) });
        axa_label(ctx, axa_short(B.c.lineText || B.txt, 14), x0 + cw * 0.07, ly + (py - r * 2 - ly) * 0.72, { font: jzBodyF(ctx), color: jzMixHex(paper, ink, 0.55), op: la, size: Math.min(ls, cw * 0.055), track: 0.04 });
        var o = { lead: 1.18, track: 0.02 }, f = axa_fitBox(B.txt, font, cw * 0.8, fieldH * 0.8, o, 5), size = Math.min(f.size, cw * 0.42);
        return axa_draw(ctx, { text: f.text, font: font, size: size, x: cx, y: y0 + cw * 0.05 + fieldH / 2, color: fon, lead: 1.18, track: 0.02, fitW: cw * 0.8 });
    }
});
