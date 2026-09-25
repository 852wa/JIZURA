// ================================================================ pack kinetic part 2 — kinetic typography layouts (8–14)

/* ================================================================== 8 knRhythmCuts — 語のカット割り */
var AKN_SHOTS = ['huge', 'vert', 'small', 'crop', 'band', 'tilt'];
jzReg('layout', 'knRhythmCuts', {
    plan: function (rng, cut, st) {
        var sh = AKN_SHOTS.slice(), i; for (i = sh.length - 1; i > 0; i--) { var j = rng.int(0, i), t = sh[i]; sh[i] = sh[j]; sh[j] = t; }
        return { font: rng.pick(jzFontsOf(st, ['display'])), fontB: rng.pick(jzFontsOf(st, ['display', 'serif'])), shots: sh, side: rng.pick([1, -1]), fin: rng.pick(['center', 'center', 'left']) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, u = jzU(ctx), port = jzPortrait(ctx), i;
        var font = jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'display')), fontB = jzP(ctx, 'fontB', font), shots = jzP(ctx, 'shots', AKN_SHOTS), side = jzP(ctx, 'side', 1), accC = akn_accOn(sc);
        var units = akn_units(c, 5, 2), n = units.length, ts = akn_onsets(c, n, 0.5, 0.46);
        var tF = Math.min(ts[n - 1] + 0.55, c.dur - (c.outDur || 0) - 0.45); tF = Math.max(tF, ts[n - 1] + 0.28);
        var lw = Math.max(2 * ctx.u, u * 0.003);
        for (i = 0; i < n; i++) {
            var t = units[i], shot = shots[i % 6] || 'huge', t1 = i < n - 1 ? ts[i + 1] : tF, lat = jzHasLatin(t), o = { font: font, color: sc.fg, x: W / 2, y: H / 2, track: 0.02, mi: akn_mi(ctx, ts[i]) }, str = t, extra = null;
            var HD = akn_H(ctx, 'var T0=' + jzN(ts[i]) + ',dt=time-T0;');
            if (shot === 'huge') o.size = Math.min(akn_fit(ctx, t, font, W * 0.82, H * 0.6, { track: 0.02 }), H * 0.54);
            else if (shot === 'vert' && !lat) {
                str = jzVertical(t); o.x = W / 2 + side * W * (port ? 0.18 : 0.22);
                o.size = Math.min(akn_fit(ctx, jzStrip(t), font, W * 0.4, H * 0.8, { vertical: true, lead: 1.05, track: 0.02 }), W * (port ? 0.34 : 0.26)); o.leading = o.size * 1.05;
            } else if (shot === 'small' || shot === 'vert') {
                o.font = fontB; o.track = 0.12; o.size = Math.min(akn_fit(ctx, t, fontB, W * 0.4, H * 0.12, { track: 0.12 }), H * 0.1);
                var mm = akn_m(ctx, t, fontB, { track: 0.12 }), pw = mm.w * o.size / 2 + o.size * 0.8, ph = mm.h * o.size / 2 + o.size * 0.6, La = o.size * 0.6;
                extra = jzShapeLayer(ctx, 'kn cut brackets', W / 2, H / 2);
                var gb = jzGrp(extra, 'corners'), cr = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
                for (var q = 0; q < 4; q++) { var a = cr[q][0], b = cr[q][1], x = a * pw, y = b * ph; jzAddPath(gb, [[x - a * La, y], [x, y], [x, y - b * La]], false); }
                jzAddStroke(gb, accC, lw);
                jzSetExpr(jzXf(extra, 'ADBE Scale'), HD + 'var s=1.3-0.3*oe(dt/0.2);[s*100,s*100]');
                jzSetExpr(jzXf(extra, 'ADBE Opacity'), HD + 'K*100');
            } else if (shot === 'crop') {
                o.track = 0; o.align = 'left'; o.size = Math.min(akn_fit(ctx, t, font, W * 1.02, H * 0.7, { track: 0 }), H * 0.66);
                o.x = W * 0.97 - akn_em(ctx, t, font, 0) * o.size; o.y = H / 2 + H * 0.04;
            } else if (shot === 'band') {
                o.track = 0.06; o.size = Math.min(akn_fit(ctx, t, font, W * 0.8, H * 0.24, { track: 0.06 }), H * 0.22);
                extra = jzRectLayer(ctx, 'kn cut band', W / 2, H / 2, W, o.size * 1.55, sc.ink);
                jzSetExpr(jzXf(extra, 'ADBE Scale'), HD + '[100,oe(dt/0.18)*100]');
                jzSetExpr(jzXf(extra, 'ADBE Opacity'), HD + 'K*100');
                o.color = akn_onCol(sc, sc.ink);
            } else { o.size = Math.min(akn_fit(ctx, t, font, W * 0.72, H * 0.4, { track: 0.02 }), H * 0.34); o.rot = -8 * side; o.color = accC; }
            if (extra) { extra.inPoint = ts[i]; extra.outPoint = Math.min(c.dur, t1); jzNoGhost(extra); }
            o.H = HD; o.sc = '(function(){var p=1+0.1*Math.exp(-dt*14);return [p,p];})()';
            var w = akn_word(ctx, str, o);
            w.L.inPoint = ts[i]; w.L.outPoint = Math.min(c.dur, t1);
        }
        // final shot: the whole line, clean
        var F = akn_flow(ctx, units, fontB, W * 0.84, H * (port ? 0.42 : 0.34), { maxSize: H * 0.16, track: 0.04 }), left = jzP(ctx, 'fin', 'center') === 'left', ox = left ? W * 0.08 + F.w / 2 : W / 2;
        var HF = akn_H(ctx, 'var dt=time-' + jzN(tF) + ';'), Gn = akn_null(ctx, 'kn cut final', ox, H / 2), Ls = [];
        jzSetExpr(jzXf(Gn, 'ADBE Scale'), HF + 'var p=1+0.06*Math.exp(-Math.max(0,dt)*14);[p*100,p*100]');
        for (i = 0; i < n; i++) {
            var wf = akn_word(ctx, units[i], { font: fontB, size: F.size, color: sc.fg, x: ox + F.pos[i].x, y: H / 2 + F.pos[i].y, track: 0.04, mi: akn_mi(ctx, tF + i * 0.03), H: HF });
            wf.N.parent = Gn; wf.L.inPoint = tF; Ls.push(wf);
        }
        var bb = akn_bbL(Ls);
        var R = akn_bar(ctx, 'kn cut rule', left ? W * 0.08 : W / 2 - F.w / 2, bb.y1 + F.size * 0.25, F.w, lw, accC);
        R.inPoint = tF;
        jzSetExpr(jzXf(R, 'ADBE Scale'), HF + '[oe(dt/0.35)*K*100,100]');
        return bb;
    }
});

/* ================================================================== 9 knPathRide — ループ軌道 */
jzReg('layout', 'knPathRide', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['display'])), side: rng.pick([1, 1, -1]), rail: rng.pick(['dash', 'line', 'dots']), acc: rng.chance(0.5) }; },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, u = jzU(ctx), port = jzPortrait(ctx), i, font = jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'display'));
        var t0 = jzFlat(c.text), chars = jzChars(t0), side = jzP(ctx, 'side', 1) < 0 ? -1 : 1, TAU = Math.PI * 2;
        var size = Math.min(akn_fit(ctx, t0, font, W * (port ? 0.86 : 0.72), H * 0.2, { track: 0.04 }), H * 0.17), Lt = akn_em(ctx, t0, font, 0.04) * size * 1.04;
        var R = jzClamp(Lt / TAU * 1.15, size * 1.5, Math.min(H * 0.28, W * 0.3)), yL = H / 2 + side * R * (port ? 0.5 : 0.6), xT = Math.max(W * 0.06 + R * 0.2, W / 2 - Lt / 2 - size * 0.4);
        var rail = [[-W * 0.9, yL], [xT, yL]], N = 72;
        for (i = 1; i <= N; i++) { var a = i / N * TAU; rail.push([xT + Math.sin(a) * R, yL - side * (1 - Math.cos(a)) * R]); }
        rail.push([W * 2.2, yL]);
        // text baseline path: the rail pushed along its right-hand normal, so glyph centres ride the rail
        var bl = [], off = size * 0.36;
        for (i = 0; i < rail.length; i++) {
            var p0 = rail[Math.max(0, i - 1)], p1 = rail[Math.min(rail.length - 1, i + 1)], dx = p1[0] - p0[0], dy = p1[1] - p0[1], l = Math.sqrt(dx * dx + dy * dy) || 1;
            bl.push([rail[i][0] - dy / l * off, rail[i][1] + dx / l * off]);
        }
        var sT = xT + W * 0.9, sEnd = sT + TAU * R + (W / 2 + Lt / 2 - xT), sStart = sT - (xT + W * 0.05), T = jzClamp(c.dur * 0.55, 0.7, 1.8);
        var L = jzText(ctx, t0, { font: font, size: size, color: sc.fg, x: 0, y: 0, align: 'left', track: 0.04 });
        if (jzP(ctx, 'acc', false)) { var fl = []; for (i = 0; i < chars.length; i++) fl.push(i === chars.length - 1); jzCharColors(L, akn_accOn(sc), fl, 'JZ Layout Accent'); }
        var sh = new Shape(); sh.vertices = bl; sh.closed = false;
        // the baseline loop is longer / shorter than the rail: that difference is added as the text passes the loop
        var la = 0, lb = 0; for (i = 1; i < rail.length - 1; i++) { la += Math.sqrt(Math.pow(rail[i][0] - rail[i - 1][0], 2) + Math.pow(rail[i][1] - rail[i - 1][1], 2)); lb += Math.sqrt(Math.pow(bl[i][0] - bl[i - 1][0], 2) + Math.pow(bl[i][1] - bl[i - 1][1], 2)); }
        var HD = akn_H(ctx, 'var TT=' + jzN(T) + ',S0=' + jzN(sStart) + ',S1=' + jzN(sEnd) + ',LT=' + jzN(Lt) + ',ST=' + jzN(sT) + ',LP=' + jzN(TAU * R) + ',DLP=' + jzN(lb - la) + ';');
        jzTextOnPath(L, sh, HD + 'var q=cl(time/TT),sh=lrp(S0,S1,1-Math.pow(1-q,2.6))+ic(PO)*W*1.3;sh+DLP*cl((sh-LT/2-ST)/LP)-LT', ctx);
        jzAnimate(ctx, L, { mi: 0 });
        // the rail
        var pts = []; for (i = 0; i < rail.length; i++) if (rail[i][0] > -W * 0.1 && rail[i][0] < W * 1.1) pts.push(rail[i]);
        pts.unshift([-W * 0.1, yL]); pts.push([W * 1.1, yL]);
        var lw = Math.max(1.2 * ctx.u, u * 0.0022), style = jzP(ctx, 'rail', 'dash'), S = jzShapeLayer(ctx, 'kn rail', 0, 0), g = jzGrp(S, 'rail');
        jzAddPath(g, pts, false);
        var st = jzAddStroke(g, sc.sub, style === 'dots' ? lw * 2.6 : lw), ds = st.property('ADBE Vector Stroke Dashes');
        if (style === 'dots') { try { st.property('ADBE Vector Stroke Line Cap').setValue(2); } catch (e0) {} }
        if (style !== 'line') {
            try {
                ds.addProperty('ADBE Vector Stroke Dash 1'); ds.addProperty('ADBE Vector Stroke Gap 1');
                ds = jzVecs(g).property(2).property('ADBE Vector Stroke Dashes');
                ds.property('ADBE Vector Stroke Dash 1').setValue(style === 'dots' ? 0.01 : lw * 5);
                ds.property('ADBE Vector Stroke Gap 1').setValue(style === 'dots' ? lw * 9 : lw * 4);
            } catch (e1) { jzWarn('rail dashes: ' + e1.toString()); }
        }
        jzSetExpr(jzXf(S, 'ADBE Opacity'), HD + 'oc(time/0.3)*K*(1-0.6*smo(TT,TT+0.5,time))*' + (style === 'dots' ? 70 : 85));
        S.moveToEnd(); jzNoGhost(S);
        return { x0: W / 2 - Lt / 2, x1: W / 2 + Lt / 2, y0: yL - size * 0.6, y1: yL + size * 0.6, cx: W / 2, cy: yL };
    }
});

/* ================================================================== 10 knGearWords — 歯車 */
jzReg('layout', 'knGearWords', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['display'])), dir: rng.pick([1, -1]), fillMode: rng.pick(['alt', 'alt', 'ink', 'ring']) }; },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, port = jzPortrait(ctx), i, t, font = jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'display')), TAU = Math.PI * 2;
        var nmax = port ? 4 : 5, units = akn_units(c, nmax, Math.min(nmax, Math.max(2, Math.ceil(akn_gc(c.text) / 4)))), n = units.length, ts = akn_onsets(c, n, 0.45, 0.42);
        var txt = [], rs0 = [], rs = [], tk = [];
        for (i = 0; i < n; i++) {
            t = units[i]; txt.push(!jzHasLatin(t) && akn_gc(t) > 3 ? jzSplitLines(jzStrip(t), Math.ceil(akn_gc(t) / 2)) : t);
            var m = akn_m(ctx, txt[i], font, { track: 0.02, lead: 1.05 }); rs0.push(Math.sqrt(m.w * m.w + m.h * m.h) / 2 * 1.12 + 0.18);
        }
        var srt = rs0.slice().sort(function (a, b) { return a - b; }), med = srt[Math.floor(n / 2)], tot = 0, mr = 0;
        for (i = 0; i < n; i++) { rs.push(jzClamp(rs0[i], med * 0.75, med * 1.3)); tk.push(Math.min(1, rs[i] / rs0[i])); tot += rs[i] * 2; mr = Math.max(mr, rs[i]); }
        tot += 0.1 * (n - 1);
        var k = port ? Math.min(H * 0.84 / tot, W * 0.62 / (mr * 2)) : Math.min(W * 0.9 / tot, H * 0.6 / (mr * 2), H * 0.22 / 0.7), cs = [], acc = -tot / 2;
        for (i = 0; i < n; i++) { acc += rs[i]; var z = port ? (i % 2 ? 1 : -1) * mr * 0.32 : (i % 2 ? 1 : -1) * mr * 0.12; cs.push(port ? [W / 2 + z * k, H / 2 + acc * k] : [W / 2 + acc * k, H / 2 + z * k]); acc += rs[i] + 0.1; }
        var mode = jzP(ctx, 'fillMode', 'alt'), dir = jzP(ctx, 'dir', 1);
        var HD = akn_H(ctx, 'var TS=' + akn_arr(ts) + ',RS=' + akn_arr(rs) + ',DR=' + dir + ';' +
            'function ANG(I,t){var a=0;for(var j=I;j<TS.length;j++){if(t>=TS[j])a+=360*(1-ioc(cl((t-TS[j])/0.62)))*(j===I?1:RS[j]/RS[I]*0.35);}return a*(I%2?-1:1)*DR;}' +
            'function POP(I,t){return t<TS[I]?0:ob(cl((t-TS[I])/0.3),1.8);}');
        var Ls = [];
        for (i = 0; i < n; i++) {
            var cx = cs[i][0], cy = cs[i][1], r = rs[i] * k, fill = mode === 'ink' ? sc.ink : mode === 'ring' ? null : (i % 2 ? sc.accent : sc.ink), rim = fill || akn_accOn(sc);
            var S = jzShapeLayer(ctx, 'kn gear', cx, cy);
            // groups are added top first: ring, disc, teeth
            var g1 = jzGrp(S, 'ring'); jzAddEllipse(g1, r * 1.72, r * 1.72); jzAddStroke(g1, fill ? akn_onCol(sc, fill) : rim, Math.max(1, r * 0.02), 35);
            var g2 = jzGrp(S, 'disc'); jzAddEllipse(g2, r * (fill ? 1.92 : 1.86), r * (fill ? 1.92 : 1.86)); jzAddFill(g2, fill || sc.bg);
            var nt = Math.max(10, Math.round(TAU * rs[i] * 6)), th = r * 0.12, pts = [], q;
            for (q = 0; q < nt; q++) {
                var a0 = q / nt * TAU, w = TAU / nt;
                pts.push([Math.cos(a0 - w * 0.25) * r, Math.sin(a0 - w * 0.25) * r], [Math.cos(a0 - w * 0.15) * (r + th), Math.sin(a0 - w * 0.15) * (r + th)],
                    [Math.cos(a0 + w * 0.15) * (r + th), Math.sin(a0 + w * 0.15) * (r + th)], [Math.cos(a0 + w * 0.25) * r, Math.sin(a0 + w * 0.25) * r]);
            }
            var g3 = jzGrp(S, 'teeth'); jzAddPath(g3, pts, true); jzAddFill(g3, rim);
            jzSetExpr(jzXf(S, 'ADBE Rotate Z'), HD + 'ANG(' + i + ',time)');
            jzSetExpr(jzXf(S, 'ADBE Scale'), HD + 'var p=POP(' + i + ',time)*K;[p*100,p*100]');
            jzNoGhost(S);
            var fs = k * tk[i];
            var wd = akn_word(ctx, txt[i], { font: font, size: fs, leading: fs * 1.05, color: fill ? akn_onCol(sc, fill) : sc.fg, x: cx, y: cy, track: 0.02, mi: akn_mi(ctx, ts[i]), H: HD,
                sc: '(function(){var p=POP(' + i + ',time);return [p,p];})()', rotE: 'ANG(' + i + ',time)' });
            Ls.push(wd);
        }
        return akn_bbL(Ls);
    }
});

/* ================================================================== 11 knCollide — 正面衝突 */
jzReg('layout', 'knCollide', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['display'])), acc: rng.pick(['A', 'B', 'none']), spark: rng.chance(0.8), at: rng.range(0.28, 0.36) }; },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, u = jzU(ctx), port = jzPortrait(ctx), i, font = jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'display'));
        var all = akn_units(c, 8, 2), lat = jzHasLatin(c.text), best = 1, bd = 1e9, tot = 0, acc = 0;
        for (i = 0; i < all.length; i++) tot += akn_gc(all[i]);
        for (i = 1; i < all.length; i++) { acc += akn_gc(all[i - 1]); var d = Math.abs(acc - tot / 2); if (d < bd) { bd = d; best = i; } }
        var A = all.slice(0, best).join(lat ? ' ' : ''), B = all.slice(best).join(lat ? ' ' : ''), tC = jzClamp(c.dur * jzP(ctx, 'at', 0.32) * 0.65, 0.25, 0.55);
        var size, pa, pb, axis, emA = akn_em(ctx, A, font, 0.02), emB = akn_em(ctx, B, font, 0.02);
        if (!port) {
            var g = lat ? 0.35 : 0.14; size = Math.min(akn_fit(ctx, A + (lat ? ' ' : '') + B, font, W * 0.86, H * 0.3, { track: 0.02 }), H * 0.24);
            var wa = emA * size, wb = emB * size, x0 = W / 2 - (wa + wb + g * size) / 2; pa = [x0 + wa / 2, H / 2]; pb = [x0 + wa + g * size + wb / 2, H / 2]; axis = 0;
        } else {
            size = Math.min(akn_fit(ctx, A, font, W * 0.86, H * 0.2, { track: 0.02 }), akn_fit(ctx, B, font, W * 0.86, H * 0.2, { track: 0.02 }), W * 0.3);
            pa = [W / 2, H / 2 - size * 0.62]; pb = [W / 2, H / 2 + size * 0.62]; axis = 1;
        }
        var D = axis ? Math.max(pa[1], H - pb[1]) + size * 0.7 : Math.max(pa[0] + emA * size / 2, W - pb[0] + emB * size / 2) + size * 0.2, accC = akn_accOn(sc);
        var HD = akn_H(ctx, 'var TC=' + jzN(tC) + ',D=' + jzN(D) + ',SZ0=' + jzN(size) + ',d=time-TC;' +
            'function OFF(t){var dd=t-TC;return dd<0?-D*(1-Math.pow(cl(t/TC),1.6)):-SZ0*0.28*Math.exp(-dd*6)*Math.sin(dd*15);}' +
            'var sqA=d<0?1:1-0.22*Math.exp(-d*14),jit=d>0?Math.exp(-d*9)*SZ0*0.05:0;');
        var ac = jzP(ctx, 'acc', 'none'), Ls = [];
        function half(t, p, sg, col) {
            var pos = '(function(){var o=OFF(time)*' + sg + ';posterizeTime(24);seedRandom(' + ((c.seed % 9973) + sg * 7) + '+Math.floor(time*24),true);return [' + jzN(p[0]) + (axis ? '' : '+o') + '+random(-1,1)*jit,' + jzN(p[1]) + (axis ? '+o' : '') + '+random(-1,1)*jit];})()';
            Ls.push(akn_word(ctx, t, { font: font, size: size, color: col, x: p[0], y: p[1], track: 0.02, mi: 0, H: HD, pos: pos, sc: axis ? '[1,sqA]' : '[sqA,1]' }));
        }
        half(A, pa, 1, ac === 'A' ? accC : sc.fg);
        half(B, pb, -1, ac === 'B' ? accC : sc.fg);
        // speed lines behind both halves while they fly
        var lw = Math.max(1.5 * ctx.u, u * 0.0028);
        for (var s = 0; s < 2; s++) {
            var sg = s ? -1 : 1, P0 = s ? pb : pa, em = s ? emB : emA, S = jzShapeLayer(ctx, 'kn collide lines', P0[0], P0[1]), gl = jzGrp(S, 'lines');
            for (var j = 0; j < 5; j++) {
                var f = (j - 2) / 2.2 * size * 0.42, len = size * (1.2 + akn_r(c.seed | 0, j, 7) * 1.6);
                if (!axis) { var xe = -sg * (em * size / 2 + size * 0.2); jzAddPath(gl, [[xe - sg * len, f * sg], [xe, f * sg]], false); }
                else { var ye = -sg * size * 0.7; jzAddPath(gl, [[f * 1.6 * sg, ye - sg * len], [f * 1.6 * sg, ye]], false); }
            }
            jzAddStroke(gl, sc.sub, lw);
            jzSetExpr(jzXf(S, 'ADBE Position'), HD + 'var o=OFF(time)*' + sg + ';[value[0]' + (axis ? '' : '+o') + ',value[1]' + (axis ? '+o' : '') + ']');
            jzSetExpr(jzXf(S, 'ADBE Opacity'), HD + 'd<0&&time>0.02?70*cl(time/TC)*K:0');
            S.outPoint = Math.min(c.dur, tC + 0.05); S.moveToEnd(); jzNoGhost(S);
        }
        // sparks at the contact point
        if (jzP(ctx, 'spark', false)) {
            var cx = axis ? W / 2 : (pa[0] + emA * size / 2 + pb[0] - emB * size / 2) / 2, Rm = size * (0.25 + 0.45 * 2.2) + size * 0.5 + 2;
            var Sp = jzShapeLayer(ctx, 'kn collide sparks', cx, H / 2), gs = jzGrp(Sp, 'sparks');
            for (i = 0; i < 12; i++) { var an = (i / 12 + akn_r(c.seed | 0, i, 9) * 0.05) * Math.PI * 2; jzAddPath(gs, [[0, 0], [Math.cos(an) * Rm, Math.sin(an) * Rm]], false); }
            jzAddStroke(gs, accC, lw * 1.4);
            var SH = HD + 'var a=1-d/0.45,r0=SZ0*(0.25+Math.max(0,d)*2.2),r1=r0+SZ0*0.5*a;';
            jzAddTrimPaths(gs, SH + 'r1/' + jzN(Rm) + '*100', SH + 'r0/' + jzN(Rm) + '*100');
            jzSetExpr(jzXf(Sp, 'ADBE Opacity'), SH + '(d>0&&d<0.45)?a*K*100:0');
            Sp.inPoint = tC; Sp.outPoint = Math.min(c.dur, tC + 0.46); jzNoGhost(Sp);
        }
        return akn_bbL(Ls);
    }
});

/* ================================================================== 12 knTumble — 箱転がし */
jzReg('layout', 'knTumble', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['display'])), box: rng.pick(['plate', 'frame', 'none']), acc: rng.int(0, 5), floor: rng.chance(0.7) }; },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, u = jzU(ctx), port = jzPortrait(ctx), i, font = jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'display'));
        var units = akn_units(c, 5, 2), n = units.length, F = akn_flow(ctx, units, font, W * 0.82, H * (port ? 0.4 : 0.3), { maxSize: H * 0.2, track: 0.02, sp: jzHasLatin(c.text) ? 0.5 : 0.3, lead: 1.6 });
        var size = F.size, pad = size * 0.14, h = size + pad * 2, ts = akn_onsets(c, n, 0.42, 0.36), T = 0.5, accC = akn_accOn(sc), box = jzP(ctx, 'box', 'plate'), ac = jzP(ctx, 'acc', 0) % n;
        var lw = Math.max(1.5 * ctx.u, u * 0.0025), WS = [], BS = [], XF = [], MS = [];
        for (i = 0; i < n; i++) {
            var p = F.pos[i], w = p.w + pad * 2; WS.push(w); BS.push(H / 2 + p.y + h / 2); XF.push(W / 2 + p.x - w / 2);
            MS.push(Math.min(3, Math.max(1, Math.ceil((W - XF[i]) / (2 * (w + h))))));
        }
        var HD = akn_H(ctx, 'var TS=' + akn_arr(ts) + ',WS=' + akn_arr(WS) + ',BS=' + akn_arr(BS) + ',XF=' + akn_arr(XF) + ',MS=' + akn_arr(MS) + ',HB=' + jzN(h) + ',TT=' + T + ';' +
            'function U(I,t){var w=WS[I],h=HB,m=MS[I],st=4*m,Tm=TT*(0.7+0.3*m),q=cl((t-TS[I])/Tm)*st,j=Math.min(st-1,Math.floor(q)),f=q>=st?1:q-j,xL=XF[I]+m*2*(w+h);' +
            'for(var s2=0;s2<j;s2++)xL-=s2%2?w:h;var fw=j%2?h:w,fh=j%2?w:h,ph=-90*ios(f),v=rvx(fw/2,-fh/2,ph),ld=q>=st?t-TS[I]-Tm:-1,sq=ld>=0?Math.exp(-ld*14)*0.1:0;' +
            'return [xL+v[0],BS[I]+v[1]+sq*h*0.5,-90*j+ph,1+sq*0.5,1-sq];}');
        // floor line under each row, drawn in from the right
        if (jzP(ctx, 'floor', false)) {
            for (i = 0; i < n; i++) {
                if (i > 0 && F.pos[i - 1].li === F.pos[i].li) continue;
                var r0 = i, r1 = i; while (r1 + 1 < n && F.pos[r1 + 1].li === F.pos[i].li) r1++;
                var fx0 = W / 2 + F.pos[r0].x - F.pos[r0].w / 2 - pad * 3, fx1 = W / 2 + F.pos[r1].x + F.pos[r1].w / 2 + pad * 3;
                var Fl = jzShapeLayer(ctx, 'kn tumble floor', fx1, BS[i] + lw), gf = jzGrp(Fl, 'floor'); jzAddRect(gf, fx1 - fx0, lw, 0, -(fx1 - fx0) / 2, 0); jzAddFill(gf, sc.sub);
                jzSetExpr(jzXf(Fl, 'ADBE Scale'), HD + '[oe(time/0.4)*K*100,100]'); jzXf(Fl, 'ADBE Opacity').setValue(80);
                jzNoGhost(Fl);
            }
        }
        var Ls = [];
        for (i = 0; i < n; i++) {
            var fill = i === ac ? accC : sc.ink, Ex = 'U(' + i + ',time)';
            if (box !== 'none') {
                var S = box === 'plate' ? jzRectLayer(ctx, 'kn tumble box', XF[i] + WS[i] / 2, BS[i] - h / 2, WS[i], h, fill) : jzRectLayer(ctx, 'kn tumble box', XF[i] + WS[i] / 2, BS[i] - h / 2, WS[i], h, null, { stroke: sc.fg, strokeW: lw, round: 2 });
                jzSetExpr(jzXf(S, 'ADBE Position'), HD + 'var u=' + Ex + ';[u[0],u[1]]');
                jzSetExpr(jzXf(S, 'ADBE Rotate Z'), HD + Ex + '[2]');
                jzSetExpr(jzXf(S, 'ADBE Scale'), HD + 'var u=' + Ex + ';[u[3]*100,u[4]*100]');
                jzSetExpr(jzXf(S, 'ADBE Opacity'), HD + 'time<TS[' + i + ']?0:K*100');
                jzNoGhost(S);
            }
            Ls.push(akn_word(ctx, units[i], { font: font, size: size, color: box === 'plate' ? akn_onCol(sc, fill) : (i === ac ? accC : sc.fg), x: XF[i] + WS[i] / 2, y: BS[i] - h / 2, track: 0.02, mi: akn_mi(ctx, ts[i]), H: HD,
                pos: Ex, sc: '(function(){var u=' + Ex + ';return [u[3],u[4]];})()', rotE: Ex + '[2]' }));
        }
        return akn_bbL(Ls);
    }
});

/* ================================================================== 13 knReflow — 縦から横へ */
jzReg('layout', 'knReflow', {
    plan: function (rng, cut, st) {
        var port = cut.H > cut.W * 1.08, lat = /[A-Za-z]/.test(cut.text);
        return { font: rng.pick(jzFontsOf(st, ['serif', 'display'])), dir: !lat && port && rng.chance(0.5) ? 'h2v' : 'v2h', swirl: rng.pick([1, -1]), at: rng.range(0.36, 0.46) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, port = jzPortrait(ctx), i, font = jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'serif'));
        var lat = jzHasLatin(c.text), t0 = lat ? jzFlat(c.text) : jzStrip(c.text), chars = jzChars(t0), n = chars.length;
        var vCols = n <= (port ? 7 : 5) ? 1 : n <= 12 ? 2 : 3, per = Math.ceil(n / vCols), nsp = [];
        for (i = 0; i < n; i++) if (!akn_isSp(chars[i])) nsp.push(chars[i]);
        var htext = jzSplitLines(t0, lat ? (port ? 13 : 20) : (port ? 7 : 14)), vper = Math.ceil(nsp.length / vCols);
        var sv = Math.min(W * 0.5 / ((vCols - 1) * 1.3 + 1), H * 0.8 / (vper * 1.04), W * 0.3);
        var mH = akn_m(ctx, htext, font, { lead: 1.25, track: 0.04 }), sh = Math.min(W * 0.84 / mH.w, H * 0.4 / mH.h, H * 0.24);
        var L = jzText(ctx, htext, { font: font, size: sh, leading: sh * 1.25, color: sc.fg, x: W / 2, y: H / 2, track: 0.04 });
        var G = akn_geo(L, sh), ap = jzXf(L, 'ADBE Anchor Point').value, HX = [], HY = [], VX = [], VY = [], K2 = [], k = 0;
        for (i = 0; i < G.n; i++) {
            HX.push(W / 2 + G.g[i].x - ap[0]); HY.push(H / 2 + G.g[i].y - ap[1]);
            if (G.g[i].sp) { K2.push(-1); VX.push(0); VY.push(0); continue; }
            var col = Math.floor(k / vper), row = k % vper;
            VX.push(W / 2 + ((vCols - 1) / 2 - col) * sv * 1.3); VY.push(H / 2 + (row - (vper - 1) / 2) * sv * 1.04);
            K2.push(k); k++;
        }
        var h2v = jzP(ctx, 'dir', 'v2h') === 'h2v', tR = jzClamp(c.dur * jzP(ctx, 'at', 0.4), 0.5, 1.5), m = Math.max(1, k);
        var HD = akn_H(ctx, 'var HX=' + akn_arr(HX) + ',HY=' + akn_arr(HY) + ',VX=' + akn_arr(VX) + ',VY=' + akn_arr(VY) + ',KI=' + akn_arr(K2) + ',TR=' + jzN(tR) + ',SW=' + akn_swirl(ctx) + ',RV=' + jzN(sv / sh) + ',H2V=' + (h2v ? 1 : 0) + ';' +
            'var i=textIndex-1,kk=KI[i]==null?-1:KI[i],q=kk<0?1:ioc(cl((time-TR-kk*' + jzN(Math.min(0.05, 0.5 / m)) + ')/0.5));' +
            'var ax=H2V?HX[i]:VX[i],ay=H2V?HY[i]:VY[i],bx=H2V?VX[i]:HX[i],by=H2V?VY[i]:HY[i];if(kk<0){ax=bx=HX[i];ay=by=HY[i];}' +
            'var ddx=bx-ax,ddy=by-ay,kq=SW*0.35*(kk%2?1:0.6),mx=(ax+bx)/2-ddy*kq,my=(ay+by)/2+ddx*kq,x=(1-q)*(1-q)*ax+2*(1-q)*q*mx+q*q*bx,y=(1-q)*(1-q)*ay+2*(1-q)*q*my+q*q*by;\n');
        var KK = Math.max(W, H) * 1.5;
        jzAnimator(L, 'JZ Layout Reflow Move', [['ADBE Text Position 3D', [KK, KK, 0]]], HD + '[(x-HX[i])/' + jzN(KK) + '*100,(y-HY[i])/' + jzN(KK) + '*100,0]');
        jzAnimator(L, 'JZ Layout Reflow Size', [['ADBE Text Scale 3D', [400, 400, 100]]], HD + 'var z=H2V?lrp(1,RV,q):lrp(RV,1,q);(z-1)/3*100');
        jzAnimator(L, 'JZ Layout Reflow Turn', [['ADBE Text Rotation', 90]], HD + 'SW*180*bel(q)*0.25/90*100');
        jzAnimate(ctx, L, { mi: 0 });
        if (!h2v) return jzBB(L);
        var bh = vper * sv * 1.04, bw = vCols * sv * 1.3;
        return { x0: W / 2 - bw / 2, x1: W / 2 + bw / 2, y0: H / 2 - bh / 2, y1: H / 2 + bh / 2, cx: W / 2, cy: H / 2 };
    }
});
function akn_swirl(ctx) { return jzP(ctx, 'swirl', 1) < 0 ? '(-1)' : '1'; }

/* ================================================================== 14 knPadGrid — パッド */
jzReg('layout', 'knPadGrid', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['display'])), round: rng.chance(0.5), flash: rng.pick(['accent', 'accent', 'ink']), beat: rng.chance(0.7) }; },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, u = jzU(ctx), port = jzPortrait(ctx), i, font = jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'display'));
        var units = akn_units(c, 6, Math.min(6, Math.max(2, Math.ceil(akn_gc(c.text) / 4)))), n = units.length;
        var cols = port ? (n <= 3 ? 1 : 2) : (n <= 3 ? n : n === 4 ? 2 : 3), rows = Math.ceil(n / cols);
        var gw = W * (port ? 0.84 : 0.86), gh = H * (port ? 0.62 : 0.72), g = u * 0.02, cw = (gw - g * (cols - 1)) / cols, chh = Math.min((gh - g * (rows - 1)) / rows, cw * (port ? 0.8 : 0.75));
        var x0 = W / 2 - gw / 2, y0 = H / 2 - (chh * rows + g * (rows - 1)) / 2, ts = akn_onsets(c, n, 0.45, 0.34);
        var flashC = jzP(ctx, 'flash', 'accent') === 'ink' ? sc.ink : akn_accOn(sc), lw = Math.max(1.5 * ctx.u, u * 0.003), rnd = jzP(ctx, 'round', false) ? chh * 0.12 : 0;
        var sizes = [], sz = 1e9;
        for (i = 0; i < n; i++) { sizes.push(Math.min(akn_fit(ctx, units[i], font, cw * 0.8, chh * 0.62, { track: 0.02 }), chh * 0.5)); sz = Math.min(sz, sizes[i]); }
        sz *= 1.25;
        var HD = akn_H(ctx, 'var TS=' + akn_arr(ts) + ';function PF(I,t){return t<TS[I]?0:0.1+0.9*Math.exp(-(t-TS[I])*6);}');
        // pad outlines pop in one by one; flashes behind the words
        var S = jzShapeLayer(ctx, 'kn pads', 0, 0), Fz = jzShapeLayer(ctx, 'kn pad flash', 0, 0);
        for (i = 0; i < cols * rows; i++) {
            var r = Math.floor(i / cols), q = i % cols, x = x0 + q * (cw + g) + cw / 2, y = y0 + r * (chh + g) + chh / 2;
            var gp = jzGrp(S, 'pad ' + i); jzAddRect(gp, cw, chh, rnd); jzAddStroke(gp, sc.sub, lw);
            jzGX(gp).property('ADBE Vector Position').setValue([x, y]);
            jzSetExpr(jzGX(gp).property('ADBE Vector Scale'), HD + 'var e=ob(cl((time-' + jzN(i * 0.04) + ')/0.3),1.4)*K;[e*100,e*100]');
            if (i < n) {
                var gf = jzGrp(Fz, 'flash ' + i); jzAddRect(gf, cw - lw * 2, chh - lw * 2, rnd); jzAddFill(gf, flashC);
                jzGX(gf).property('ADBE Vector Position').setValue([x, y]);
                jzSetExpr(jzGX(gf).property('ADBE Vector Group Opacity'), HD + 'PF(' + i + ',time)*K*100');
            }
        }
        jzNoGhost(S); jzNoGhost(Fz);
        var Ls = [], onC = akn_onCol(sc, flashC);
        for (i = 0; i < n; i++) {
            var rr = Math.floor(i / cols), qq = i % cols, wx = x0 + qq * (cw + g) + cw / 2, wy = y0 + rr * (chh + g) + chh / 2;
            var w = akn_word(ctx, units[i], { font: font, size: Math.min(sizes[i], sz), color: sc.fg, x: wx, y: wy, track: 0.02, mi: akn_mi(ctx, ts[i]), H: HD,
                sc: '(function(){var p=1+0.12*Math.exp(-Math.max(0,time-TS[' + i + '])*12);return [p,p];})()' });
            jzAnimator(w.L, 'JZ Layout Pad Colour', [['ADBE Text Fill Color', jzHex(onC)]], HD + 'PF(' + i + ',time)>0.5?100:0');
            Ls.push(w);
        }
        return akn_bbL(Ls);
    }
});
