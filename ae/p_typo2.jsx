// ================================================================ pack typo part 2: layouts 10-18
// tySplitType tyErode tyVRuler tyFullTrack tyStatCount tyMargin tyRotBlock tySquare tyLineFocus (helpers: p_typo1)

/* ================================================================ 10 tySplitType — 断ち割り */
jzReg('layout', 'tySplitType', {
    plan: function (rng, cut, st) {
        return { font: rng.pick(jzFontsOf(st, ['display'])), off: rng.range(0.08, 0.15) * rng.pick([1, -1]), cutY: rng.pick([0.02, -0.06, 0.08]), cap: rng.chance(0.75) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, txt = jzTrim(c.text), font = jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'display')), li;
        var mt = aty_mainLines(txt, W, H, 11, 5), nL = mt.split('\n').length, lead = 1.16;
        var size = Math.min(aty_fit(mt, font, W * 0.76, H * 0.56, { lead: lead, track: 0.03 }), H * 0.3), LD = size * lead;
        var off = jzP(ctx, 'off', 0.1), cutY = jzP(ctx, 'cutY', 0.02), ys = [];
        for (li = 0; li < nL; li++) ys.push(H / 2 + (li - (nL - 1) / 2) * LD + size * cutY);
        var ay = -ATY_CY * size + (nL - 1) / 2 * LD, bb = null, hd = aty_hd(ctx);
        // the same lines twice: the upper halves shift one way, the lower halves the other (layer masks at the cut lines)
        for (var part = 0; part < 2; part++) {
            var top = part === 0, it = { text: mt, font: font, size: size, x: W / 2, y: H / 2, lead: lead, track: 0.03, color: sc.fg, mi: 0 };
            bb = jzUnion(bb, aty_draw(ctx, it));
            var L = it.L;
            for (li = 0; li < nL; li++) {
                var yc = ys[li] - H / 2 + ay, a = yc - LD / 2, b = yc + LD / 2;
                var mk = top ? jzMaskRect(L, -W * 2, li ? a : -H * 2, W * 2, yc) : jzMaskRect(L, -W * 2, yc, W * 2, li < nL - 1 ? b : H * 2);
                mk.property('ADBE Mask Offset').expression = hd + 'oe((time-0.12)/0.7)*' + jzN(size * 0.05);
            }
            var s = top ? 1 : -1;
            jzSetExpr(jzXf(L, 'ADBE Anchor Point'), hd + 'var e=oe((time-0.12)/0.7);[value[0]-e*' + jzN(s * size * off) + ',value[1]+e*' + jzN(s * size * 0.05) + ']');
        }
        var S = jzShapeLayer(ctx, 'cut lines', 0, 0), lw = aty_hair(ctx);
        for (li = 0; li < nL; li++) aty_grp(S, 'cut ' + (li + 1), [[[W * 0.04, ys[li]], [W * 0.96, ys[li]]]], aty_acc(sc), { width: Math.max(1.2 * aty_k(ctx), lw * 1.2), alpha: 0.9, trim: hd + '100*oe((time-' + jzN(0.2 + li * 0.08) + ')/0.6)*K' });
        jzNoGhost(S);
        if (jzP(ctx, 'cap', true)) {
            var ls = aty_ls(ctx) * 0.85, cap = jzChars(aty_roma(txt) || String(c.lineText || txt)).slice(0, 48).join('');
            aty_label(ctx, cap, W * 0.96, ys[nL - 1] + ls * 0.9, { align: 'right', size: ls, track: 0.2, op: 'K*oc((time-0.4)/0.3)' });
        }
        return bb;
    }
});

/* ================================================================ 11 tyErode — 削り反復 */
jzReg('layout', 'tyErode', {
    plan: function (rng, cut, st) {
        return { font: rng.pick(jzFontsOf(st, ['serif', 'display'])), mode: rng.pick(['grow', 'grow', 'erode']), idx: rng.chance(0.7) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, font = jzP(ctx, 'font', jzSerifF(ctx)), erode = jzP(ctx, 'mode', 'grow') === 'erode', i, r;
        var arr = aty_slots(c.text), nS = arr.length, plain = 0;
        for (i = 0; i < nS; i++) if (!aty_isSp(arr[i])) plain++;
        var R = Math.min(5, Math.max(2, plain)), lens = [];
        for (r = 0; r < R; r++) { var l = Math.max(1, Math.round(nS * (r + 1) / R)); if (jzIndexOf(lens, l) < 0) lens.push(l); }
        if (erode) lens.reverse();
        var rows = [];
        for (r = 0; r < lens.length; r++) { var t = jzTrim(arr.slice(0, lens[r]).join('')); if (t) rows.push(t); }
        var Rn = rows.length, full = arr.join(''), leadK = 1.34;
        var size = Math.min(aty_fit(full, font, W * 0.74, 1e6, { track: 0.04 }), H * 0.8 / (Rn * leadK), H * 0.16);
        var fw = aty_meas(full, size, { font: font, track: 0.04 }).w, x0 = W / 2 - fw / 2, mainR = erode ? 0 : Rn - 1, bb = null, nStr = [], nPts = [];
        for (r = 0; r < Rn; r++) {
            var y = H / 2 + (r - (Rn - 1) / 2) * size * leadK, it = { text: rows[r], font: font, size: size, align: 'left', x: x0, y: y, track: 0.04 };
            if (r === mainR) { it.color = sc.fg; it.mi = r * 2.5; bb = aty_draw(ctx, it); }
            else {
                var dist = Math.abs(r - mainR) / Math.max(1, Rn - 1);
                it.color = sc.sub; it.alpha = 0.75 - 0.45 * dist; it.name = 'erode row ' + (r + 1);
                aty_op(ctx, aty_text(ctx, it.text, it), '((time-' + jzN(r * 0.11) + ')/0.12)*K');
            }
            nStr.push(aty_p2(jzCount(rows[r]))); nPts.push([x0 + fw + size * 0.5, y]);
        }
        if (jzP(ctx, 'idx', true)) {
            var N = aty_multi(ctx, nStr, nPts, { size: Math.min(aty_ls(ctx), size * 0.4), align: 'left', alpha: 0.85, name: 'row counts' });
            aty_multiFade(ctx, N, '(time-j*0.11)/0.12*K');
            jzAnimator(N.L, 'JZ Main Row', [['ADBE Text Fill Color', jzHex(aty_acc(sc))]], 'var LI=' + aty_arr(N.li) + ';LI[textIndex-1]===' + mainR + '?100:0');
        }
        return bb;
    }
});

/* ================================================================ 12 tyVRuler — 縦目盛り */
jzReg('layout', 'tyVRuler', {
    plan: function (rng, cut, st) {
        return { font: rng.pick(jzFontsOf(st, ['serif', 'display'])), side: rng.pick([1, -1]), lab: rng.pick(['time', 'time', 'roma']) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, k = aty_k(ctx), i;
        var txt = jzTrim(c.text).replace(/[\s　]+/g, '　'), tr = 0.14, font = jzP(ctx, 'font', jzSerifF(ctx)), side = jzP(ctx, 'side', 1);
        var size = Math.min(aty_fit(txt, font, W * 0.3, H * 0.78, { vertical: true, track: tr }), W * 0.2, H * 0.2), cx = W / 2 - side * size * 0.9;
        var it = { text: txt, font: font, size: size, x: cx, y: H / 2, vertical: true, track: tr, color: sc.fg };
        var bb = aty_draw(ctx, it), gl = aty_gpts(it), n = gl.length;
        if (!n) return bb;
        var lw = aty_hair(ctx), hd = aty_hd(ctx), rx = cx + side * size * 0.85, y0 = gl[0].y - size * 0.7, y1 = gl[n - 1].y + size * 0.7;
        var S = jzShapeLayer(ctx, 'ruler', 0, 0), e = 'oe(time/0.7)*K', fs = jzClamp(size * 0.2, 10 * k, 24 * k), rom = jzP(ctx, 'lab', 'time') === 'roma', strs = [], pts = [];
        aty_grp(S, 'spine', [[[rx, y0], [rx, y1]]], sc.sub, { width: lw, alpha: 0.8, trim: hd + '100*' + e });
        for (i = 0; i < n; i++) {
            var g = gl[i], a = hd + '100*cl(oc((time-' + jzN(0.1 + i * 0.05) + ')/0.25)*K)', segs = [[[rx, g.y], [rx + side * size * 0.3, g.y]]];
            aty_grp(S, 'tick ' + (i + 1), segs, sc.sub, { width: lw, alpha: 0.9, gop: a });
            if (i < n - 1) { var ym = (g.y + gl[i + 1].y) / 2; aty_grp(S, 'half ' + (i + 1), [[[rx, ym], [rx + side * size * 0.14, ym]]], sc.sub, { width: lw, alpha: 0.5, gop: a }); }
            var t = null;
            if (rom) { var rr = aty_romaCh(g.ch); if (rr) t = rr.toUpperCase(); }
            if (!t) t = jzFmtTime(c.start + c.dur * i / n);
            strs.push(t); pts.push([rx + side * size * 0.45, g.y]);
        }
        jzNoGhost(S);
        var M = aty_multi(ctx, strs, pts, { size: fs, align: side > 0 ? 'left' : 'right', name: 'ruler labels' });
        aty_multiFade(ctx, M, 'oc((time-0.1-j*0.05)/0.25)*K');
        // playhead running down the ruler over the cut
        var ts = fs * 0.7, P = jzShapeLayer(ctx, 'playhead', 0, gl[0].y), gp = jzGrp(P, 'head');
        jzAddPath(gp, [[rx - side * 2 * k, 0], [rx - side * ts * 1.4, -ts], [rx - side * ts * 1.4, ts]], true); jzAddFill(gp, aty_acc(sc));
        jzSetExpr(jzXf(P, 'ADBE Position'), 'var u=Math.max(0,Math.min(1,time/' + jzN(Math.max(0.3, c.dur * 0.92)) + '));[value[0],value[1]+u*' + jzN(gl[n - 1].y - gl[0].y) + ']');
        aty_op(ctx, P, e);
        return bb;
    }
});

/* ================================================================ 13 tyFullTrack — 全幅字送り */
jzReg('layout', 'tyFullTrack', {
    plan: function (rng, cut, st) {
        return { font: rng.pick(jzFontsOf(st, ['display', 'serif', 'body'])), caps: rng.chance(0.8), rule: rng.chance(0.75) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, port = aty_port(ctx), font = jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'display')), i;
        var s = aty_slots(c.text), k = s.length, m0 = port ? H * 0.08 : W * 0.06;
        var size = port ? Math.min(W * 0.24, (H - m0 * 2) / k * 0.8, H * 0.11) : Math.min(H * 0.2, (W - m0 * 2) / k * 0.8);
        var m = m0 + size * 0.5, span = (port ? H : W) - m * 2, bb = null, gi = 0, hd = aty_hd(ctx), e = 'oe((time-0.05)/0.8)*K';
        for (i = 0; i < k; i++) {
            if (aty_isSp(s[i])) continue;
            var u = k > 1 ? i / (k - 1) : 0.5;
            bb = jzUnion(bb, aty_draw(ctx, { text: s[i], font: font, size: size, x: port ? W / 2 : m + span * u, y: port ? m + span * u : H / 2, color: sc.fg, mi: gi++ }));
        }
        if (jzP(ctx, 'rule', true)) {
            var seg = !port ? [[W / 2 - span / 2, H / 2 + size * 0.68], [W / 2 + span / 2, H / 2 + size * 0.68]] : [[W / 2 + size * 0.7, H / 2 - span / 2], [W / 2 + size * 0.7, H / 2 + span / 2]];
            aty_lines(ctx, 'track rule', [seg], sc.sub, { width: aty_hair(ctx), alpha: 0.6, trim: hd + '50+50*' + e, start: hd + '50-50*' + e });
        }
        if (jzP(ctx, 'caps', true)) {
            var ls = aty_ls(ctx), cap = jzChars(jzTrim(String(c.lineText || c.text).replace(/\s+/g, ' '))).slice(0, 40).join(''), op = '0.9*' + e;
            if (!port) {
                aty_label(ctx, cap, m, H / 2 - size * 0.62 - ls, { size: ls, font: jzBodyF(ctx), track: 0.14, op: op });
                aty_label(ctx, 'No.' + aty_p2((c.line | 0) + 1) + '  ' + jzFmtTime(c.start), W - m, H / 2 - size * 0.62 - ls, { size: ls, align: 'right', op: op });
            } else {
                aty_label(ctx, 'No.' + aty_p2((c.line | 0) + 1), W / 2 - size * 0.7, m - size * 0.9, { size: ls, align: 'right', op: op });
                aty_label(ctx, jzFmtTime(c.start), W / 2 + size * 0.7, H - m + size * 0.9, { size: ls, op: op });
            }
        }
        return bb;
    }
});

/* ================================================================ 14 tyStatCount — 字数表示 */
jzReg('layout', 'tyStatCount', {
    plan: function (rng, cut, st) {
        return { font: rng.pick(jzFontsOf(st, ['display', 'serif'])), nf: rng.pick(jzFontsOf(st, ['display', 'mono'])), acc: rng.chance(0.5) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, port = aty_port(ctx), txt = jzTrim(c.text), nG = jzCount(txt);
        var font = jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'display')), nf = jzP(ctx, 'nf', font), hd = aty_hd(ctx);
        var mt = aty_mainLines(txt, W, H, 8, 5), o = { lead: 1.2, track: 0.03 }, ls = aty_ls(ctx), lw = aty_hair(ctx);
        var latin = !/[^\x00-\x7f]/.test(txt), e = 'oe((time-0.05)/0.7)*K', it, nx, ny, ns;
        if (!port) {
            it = { text: mt, font: font, size: Math.min(aty_fit(mt, font, W * 0.5, H * 0.54, o), H * 0.2), align: 'left', x: W * 0.08, y: H / 2, color: sc.fg, lead: 1.2, track: 0.03 };
            var rx = W * 0.65;
            aty_lines(ctx, 'stat rule', [[[rx, H / 2 - H * 0.22], [rx, H / 2 + H * 0.22]]], sc.sub, { width: lw, alpha: 0.7, trim: hd + '50+50*' + e, start: hd + '50-50*' + e });
            nx = rx + W * 0.04; ny = H / 2 - H * 0.05; ns = H * 0.26;
        } else {
            it = { text: mt, font: font, size: Math.min(aty_fit(mt, font, W * 0.84, H * 0.42, o), W * 0.18), align: 'left', x: W * 0.08, y: H * 0.36, color: sc.fg, lead: 1.2, track: 0.03 };
            var ry = H * 0.62;
            aty_lines(ctx, 'stat rule', [[[W * 0.08, ry], [W * 0.92, ry]]], sc.sub, { width: lw, alpha: 0.7, trim: hd + '100*' + e });
            nx = W * 0.08; ny = ry + H * 0.1; ns = W * 0.3;
        }
        var bb = aty_draw(ctx, it);
        ns = Math.min(ns, (W * 0.93 - nx) / Math.max(0.3, aty_meas('00', 1, { font: nf }).w));
        // the glyph count ticks up to the cut's glyph count
        var N = aty_text(ctx, aty_p2(nG), { font: nf, size: ns, align: 'left', x: nx, y: ny, color: jzP(ctx, 'acc', false) ? aty_acc(sc) : sc.fg, name: 'glyph count' });
        try { N.property('ADBE Text Properties').property('ADBE Text Document').expression = ATY_FNS + 'var n=Math.round(' + nG + '*oc((time-0.1)/0.9));(n<10?"0":"")+n'; } catch (er) { jzWarn('count: ' + er.toString()); }
        aty_op(ctx, N, e);
        var y2 = ny + ns * 0.62;
        aty_label(ctx, latin ? 'CHARACTERS' : '文字 / CHARACTERS', nx, y2, { size: ls, font: latin ? jzMonoF(ctx) : jzBodyF(ctx), op: e });
        aty_label(ctx, 'LINE ' + aty_p2((c.line | 0) + 1) + '  ─  ' + jzFmtTime(c.start), nx, y2 + ls * 1.8, { size: ls * 0.85, op: '0.8*' + e });
        return bb;
    }
});

/* ================================================================ 15 tyMargin — 余白 */
jzReg('layout', 'tyMargin', {
    plan: function (rng, cut, st) {
        return { font: rng.pick(jzFontsOf(st, ['serif', 'body', 'display'])), pos: rng.pick(['bl', 'bl', 'tr', 'br', 'lc']), mark: rng.chance(0.7) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, M = jzU(ctx), port = aty_port(ctx), txt = jzTrim(c.text), font = jzP(ctx, 'font', jzSerifF(ctx)), pos = jzP(ctx, 'pos', 'bl');
        var mt = jzCount(txt) > (port ? 9 : 14) ? aty_splitL(txt, port ? 8 : 12) : txt;
        var size = Math.min(M * 0.068, aty_fit(mt, font, W * 0.66, H * 0.22, { track: 0.1, lead: 1.4 }));
        var right = pos === 'tr' || pos === 'br', y = pos === 'tr' ? H * 0.2 : pos === 'lc' ? H * 0.5 : H * 0.8, x = right ? W * 0.92 : W * 0.08;
        var it = { text: mt, font: font, size: size, x: x, y: y, align: right ? 'right' : 'left', track: 0.1, lead: 1.4, color: sc.fg };
        var bb = aty_draw(ctx, it), m = aty_meas(mt, size, it), ls = aty_ls(ctx) * 0.9, hd = aty_hd(ctx), e = 'oe((time-0.2)/0.9)*K';
        var tx0 = right ? x - m.w : x, tx1 = right ? x : x + m.w;
        aty_label(ctx, aty_p2((c.line | 0) + 1) + '  —  ' + jzFmtTime(c.start), x, y - m.h / 2 - ls * 1.4, { size: ls, align: right ? 'right' : 'left', op: '0.9*' + e });
        var a0 = right ? tx0 - size * 0.8 : tx1 + size * 0.8, a1 = right ? W * 0.08 : W * 0.92;
        if ((a1 - a0) * (right ? -1 : 1) > W * 0.05) {       // a line out to the far margin, a small square riding its tip
            aty_lines(ctx, 'margin line', [[[a0, y], [a1, y]]], sc.sub, { width: aty_hair(ctx), alpha: 0.6, trim: hd + '100*' + e });
            if (jzP(ctx, 'mark', true)) {
                var q = size * 0.16, Q = jzRectLayer(ctx, 'margin mark', a0, y, q, q, aty_acc(sc));
                jzSetExpr(jzXf(Q, 'ADBE Position'), hd + '[value[0]+' + jzN(a1 - a0) + '*' + e + ',value[1]]');
                aty_op(ctx, Q, e);
            }
        }
        var rom = aty_roma(txt);
        if (rom) aty_label(ctx, rom, x, y + m.h / 2 + ls * 1.3, { size: ls * 0.9, align: right ? 'right' : 'left', track: 0.3, op: '0.75*' + e });
        return bb;
    }
});

/* ================================================================ 16 tyRotBlock — 回転ブロック */
jzReg('layout', 'tyRotBlock', {
    plan: function (rng, cut, st) {
        return { font: rng.pick(jzFontsOf(st, ['display'])), fb: rng.pick(jzFontsOf(st, ['display', 'serif'])), rot: rng.pick([-90, -90, 90]), accent: rng.chance(0.5), rule: rng.chance(0.8) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, port = aty_port(ctx), i;
        var font = jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'display')), fb = jzP(ctx, 'fb', font), rot = jzP(ctx, 'rot', -90);
        var arr = aty_slots(c.text), n = arr.length, ws = c.words || [], cutAt = Math.max(1, Math.round(n * 0.36));
        if (ws.length >= 2) { var l0 = jzChars(jzTrim(ws[0])).length; if (l0 >= 1 && l0 <= Math.ceil(n * 0.55)) cutAt = l0; }
        while (cutAt < n - 1 && (aty_isSmall(arr[cutAt]) || jzIsPunct(arr[cutAt]))) cutAt++;
        var A = jzTrim(arr.slice(0, cutAt).join('')) || arr[0], B = jzTrim(arr.slice(cutAt).join('')) || arr[n - 1], labelA = false;
        if (aty_isLatinT(c.text)) {       // latin: split at a word gap; one word -> the rotated block is a small line label
            var t = jzTrim(c.text), sp = t.indexOf(' ');
            if (sp > 0) { A = t.substr(0, sp); B = jzTrim(t.substr(sp + 1)); }
            else { A = 'LINE ' + aty_p2((c.line | 0) + 1); B = t; labelA = true; }
        }
        var Hb = port ? H * 0.44 : H * 0.62, fA = labelA ? jzMonoF(ctx) : font;
        var wA100 = aty_meas(A, 100, { font: fA, track: 0.02 }).w;
        var sizeA = Math.min(Hb / wA100 * 100, port ? W * 0.3 : W * 0.24, labelA ? jzU(ctx) * 0.06 : 1e9), gap = sizeA * 0.28;
        var Wb = (port ? W * 0.86 : Math.min(W * 0.84, Hb * 2.4)) - sizeA - gap, best = null, nB = jzCount(B);
        for (var Lc = 1; Lc <= 3; Lc++) {
            if (Lc > nB) break;
            var bt = Lc === 1 ? B : aty_splitL(B, Math.ceil(nB / Lc));
            if (Lc > 1 && aty_isLatinT(B)) { var bw2 = jzTrim(B).split(/\s+/); if (bw2.length < Lc) break; bt = aty_groupLines(aty_words(B), Lc).join('\n'); }
            var s = Math.min(aty_fit(bt, fb, Wb, Hb, { lead: 1.08, track: 0.02 }), Hb * 0.6);
            if (!best || s > best.s * 1.05) best = { bt: bt, s: s };
        }
        var mB = aty_meas(best.bt, best.s, { font: fb, lead: 1.08, track: 0.02 }), wA = wA100 * sizeA / 100;
        var tot = sizeA + gap + mB.w, xA = W / 2 - tot / 2 + sizeA / 2, xB = xA + sizeA / 2 + gap, bh = Math.max(wA, mB.h), hd = aty_hd(ctx);
        if (jzP(ctx, 'rule', true)) {
            var e = 'oe((time-0.1)/0.6)*K', rxl = xA + sizeA / 2 + gap / 2;
            aty_lines(ctx, 'block rule', [[[rxl, H / 2 - bh / 2], [rxl, H / 2 + bh / 2]]], sc.sub, { width: aty_hair(ctx), alpha: 0.7, trim: hd + '50+50*' + e, start: hd + '50-50*' + e });
        }
        var itA = { text: A, font: fA, size: sizeA, x: xA, y: H / 2, rot: rot, track: 0.02, color: jzP(ctx, 'accent', false) ? aty_acc(sc) : sc.fg, mi: 0 };
        if (labelA) { itA.color = sc.sub; aty_op(ctx, aty_text(ctx, A, itA), 'oc(time/0.4)*K'); }
        else aty_draw(ctx, itA);
        aty_draw(ctx, { text: best.bt, font: fb, size: best.s, x: xB, y: H / 2, align: 'left', lead: 1.08, track: 0.02, color: sc.fg, mi: 3 });
        return { x0: xA - sizeA / 2, y0: H / 2 - bh / 2, x1: xB + mB.w, y1: H / 2 + bh / 2, cx: (xA - sizeA / 2 + xB + mB.w) / 2, cy: H / 2 };
    }
});

/* ================================================================ 17 tySquare — 方形組 */
jzReg('layout', 'tySquare', {
    plan: function (rng, cut, st) {
        return { font: rng.pick(jzFontsOf(st, ['display', 'serif'])), order: rng.pick(['yoko', 'yoko', 'tate']), frame: rng.chance(0.75), acc: rng.chance(0.7) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, M = jzU(ctx), chars = jzChars(aty_clean(c.text)), n = chars.length, i;
        if (!n) return null;
        var font = jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'display')), tate = jzP(ctx, 'order', 'yoko') === 'tate', accK = jzP(ctx, 'acc', true);
        var a = Math.ceil(Math.sqrt(n)), b = Math.ceil(n / a), cols = tate ? b : a, rows = tate ? a : b;
        var cell = Math.min(W * 0.78 / cols, H * 0.74 / rows, M * 0.3), x0 = W / 2 - cols * cell / 2, y0 = H / 2 - rows * cell / 2;
        var ki = aty_keyIndex(chars, 'kanji'), lw = aty_hair(ctx), ls = aty_ls(ctx), hd = aty_hd(ctx), bb = null, S = null;
        for (i = 0; i < cols * rows; i++) {
            var cc = tate ? cols - 1 - Math.floor(i / rows) : i % cols, rr = tate ? i % rows : Math.floor(i / cols);
            var x = x0 + (cc + 0.5) * cell, y = y0 + (rr + 0.5) * cell;
            if (i < n) bb = jzUnion(bb, aty_draw(ctx, { text: chars[i], font: font, size: cell * 0.9, x: x, y: y, color: accK && i === ki ? aty_acc(sc) : sc.fg, mi: i }));
            else {     // empty cells: small crosses pop in
                var q = cell * 0.08;
                if (!S) S = jzShapeLayer(ctx, 'grid marks', 0, 0);
                aty_grp(S, 'cross ' + (i + 1), [[[x - q, y], [x + q, y]], [[x, y - q], [x, y + q]]], sc.sub, { width: lw, alpha: 0.8, piv: [x, y], gsc: hd + 'var s=cl((time-' + jzN(0.2 + i * 0.03) + ')/0.3);s=s<=0?0:ob(s,2)*K*100;[s,s]' });
            }
        }
        if (S) jzNoGhost(S);
        if (jzP(ctx, 'frame', true)) {
            var xa = x0, xb = x0 + cols * cell, g = cell * 0.12, e = 'oe((time-0.05)/0.7)*K', yb = y0 + rows * cell + g;
            var F = jzShapeLayer(ctx, 'grid frame', 0, 0);
            aty_grp(F, 'top', [[[xa, y0 - g], [xb, y0 - g]]], sc.fg, { width: Math.max(2 * aty_k(ctx), lw * 2.4), alpha: 0.9, trim: hd + '100*' + e });
            aty_grp(F, 'bottom', [[[xb, yb], [xa, yb]]], sc.sub, { width: lw, alpha: 0.8, trim: hd + '100*' + e });
            jzNoGhost(F);
            aty_label(ctx, cols + '×' + rows, xb, yb + ls * 1.1, { align: 'right', size: ls * 0.9, op: e });
            aty_label(ctx, tate ? '縦組' : 'YOKO', xa, yb + ls * 1.1, { size: ls * 0.9, font: tate ? jzBodyF(ctx) : jzMonoF(ctx), op: '0.8*' + e });
        }
        return bb;
    }
});

/* ================================================================ 18 tyLineFocus — 行中強調 */
jzReg('layout', 'tyLineFocus', {
    plan: function (rng, cut, st) {
        return { font: rng.pick(jzFontsOf(st, ['serif', 'display', 'body'])), mark: rng.pick(['bar', 'bar', 'dot', 'box']) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, M = jzU(ctx), port = aty_port(ctx), font = jzP(ctx, 'font', jzSerifF(ctx)), mark = jzP(ctx, 'mark', 'bar'), i;
        var cutT = jzTrim(c.text), line = jzTrim(String(c.lineText || cutT)), s0, s1, same = false;
        if (jzCount(line) > 36) line = cutT;
        function nsI(s, end) { var a = jzChars(s).slice(0, end), q = 0; for (var j = 0; j < a.length; j++) if (!/\s/.test(a[j])) q++; return q; }
        var at = line.indexOf(cutT);
        if (at < 0 || line === cutT) {
            line = cutT; same = true;
            var arr = jzChars(line), ki = aty_keyIndex(arr, 'kanji'), ke = ki;
            if (jzIsKanji(arr[ki])) { while (ke + 1 < arr.length && jzIsKanji(arr[ke + 1])) ke++; }
            else { while (ke + 1 < arr.length && ke - ki < 2 && !aty_isSp(arr[ke + 1]) && !jzIsPunct(arr[ke + 1])) ke++; }
            if (aty_isLatinT(line)) {
                var re = /\S+/g, mm, bst = null;
                while ((mm = re.exec(line))) if (!bst || mm[0].length > bst[0].length) bst = mm;
                if (bst) { ki = jzChars(line.substr(0, bst.index)).length; ke = ki + jzChars(bst[0]).length - 1; }
            }
            s0 = nsI(line, ki); s1 = nsI(line, ke + 1);
        } else { s0 = nsI(line, jzChars(line.substr(0, at)).length); s1 = s0 + jzCount(cutT); }
        var nAll = jzCount(line);
        var mt = nAll > (port ? 7 : 12) ? aty_splitL(line, Math.ceil(nAll / Math.ceil(nAll / (port ? 6 : 11)))) : line;
        var o = { lead: 1.7, track: 0.08 }, size = Math.min(aty_fit(mt, font, W * 0.82, H * 0.56, o), M * 0.12);
        var it = { text: mt, font: font, size: size, x: W / 2, y: H / 2, lead: 1.7, track: 0.08 }, gl = aty_gpts(it), lay = aty_lay(mt, size, it);
        // the whole line, dimmed; the focus glyphs are hidden in it (they are drawn as the lyric below)
        var flags = [], gi = 0;
        for (i = 0; i < lay.length; i++) { if (lay[i].sp) { flags.push(0); continue; } flags.push(gi >= s0 && gi < s1 ? 1 : 0); gi++; }
        var D = aty_text(ctx, mt, { font: font, size: size, x: W / 2, y: H / 2, lead: 1.7, track: 0.08, color: same ? sc.fg : sc.sub, alpha: same ? 0.5 : 0.42, name: 'line (dim)' });
        jzAnimator(D, 'JZ Focus Gap', [['ADBE Text Opacity', 0]], 'var a=' + aty_arr(flags) + ';(a[textIndex-1]||0)*100');
        aty_op(ctx, D, 'oc(time/0.3)*K');
        // focus spans per text line: one lyric layer each, set exactly over the dimmed glyphs
        var spans = [], cur = null;
        for (i = 0; i < gl.length; i++) {
            if (i < s0 || i >= s1) continue;
            if (!cur || cur.li !== gl[i].li) { cur = { li: gl[i].li, g: [], j: i - s0 }; spans.push(cur); }
            cur.g.push(gl[i]);
        }
        var bb = null, hd = aty_hd(ctx), ac = aty_acc(sc), S = null;
        for (var k2 = 0; k2 < spans.length; k2++) {
            var sp = spans[k2], g0 = sp.g[0], gN = sp.g[sp.g.length - 1], txt = '';
            var ti0 = g0.ti, ti1 = gN.ti;
            for (i = ti0; i <= ti1; i++) txt += lay[i].ch;
            bb = jzUnion(bb, aty_draw(ctx, { text: txt, font: font, size: size, align: 'left', x: g0.x - g0.w / 2, y: g0.y, track: 0.08, color: sc.fg, mi: sp.j }));
            var La = g0.x - g0.w / 2, Lb = gN.x + gN.w / 2, y = g0.y, q = 'oe((time-' + jzN(0.25 + k2 * 0.1) + ')/0.5)*K';
            if (!S) S = jzShapeLayer(ctx, 'focus marks', 0, 0);
            if (mark === 'bar') aty_rectGrp(S, 'bar ' + (k2 + 1), La, y + size * 0.62, Lb - La, Math.max(3 * aty_k(ctx), size * 0.07), ac, { piv: [La, y], gsc: hd + '[100*' + q + ',100]' });
            else if (mark === 'dot') {
                for (i = 0; i < sp.g.length; i++) {
                    var gd = sp.g[i], gg = jzGrp(S, 'dot ' + (k2 + 1) + '-' + (i + 1));
                    jzAddEllipse(gg, size * 0.14, size * 0.14, gd.x, gd.y - size * 0.72); jzAddFill(gg, ac);
                    gg = S.property('ADBE Root Vectors Group').property('dot ' + (k2 + 1) + '-' + (i + 1));
                    jzGX(gg).property('ADBE Vector Anchor').setValue([gd.x, gd.y - size * 0.72]); jzGX(gg).property('ADBE Vector Position').setValue([gd.x, gd.y - size * 0.72]);
                    jzSetExpr(jzGX(gg).property('ADBE Vector Scale'), hd + 'var s=100*' + q + ';[s,s]');
                }
            } else {
                var bx = jzGrp(S, 'box ' + (k2 + 1));
                jzAddRect(bx, Lb - La + size * 0.28, size * 1.28, 0, (La + Lb) / 2, y); jzAddStroke(bx, ac, Math.max(1.5 * aty_k(ctx), size * 0.03));
                bx = S.property('ADBE Root Vectors Group').property('box ' + (k2 + 1));
                jzSetExpr(jzGX(bx).property('ADBE Vector Group Opacity'), hd + '100*' + q);
            }
        }
        if (S) jzNoGhost(S);
        return bb || { x0: W * 0.3, y0: H * 0.4, x1: W * 0.7, y1: H * 0.6, cx: W / 2, cy: H / 2 };
    }
});
