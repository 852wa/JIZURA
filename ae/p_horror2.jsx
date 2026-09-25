// ================================================================ pack horror part 2 (AE port of the horror set, layouts 7-12)
// hrWrongOne, hrRisingDark, hrRedacted, hrStaticTv, hrSpiritPhoto, hrWrongShadow (helpers: ahr_ in p_horror1)

/* ================================================================ 7. hrWrongOne — 一字だけ違う */
jzReg('layout', 'hrWrongOne', {
    plan: function (rng, cut, st) {
        var a = jzChars(jzFlat(cut.text)), cs = [], kan = [], i;
        for (i = 0; i < a.length; i++) if (a[i] !== ' ' && !jzIsPunct(a[i])) cs.push([a[i], i]);
        for (i = 0; i < cs.length; i++) if (jzIsKanji(cs[i][0]) || jzIsKata(cs[i][0]) || /[A-Za-z]/.test(cs[i][0])) kan.push(cs[i]);
        var pool = kan.length ? kan : cs;
        var pick = pool.length ? pool[rng.int(0, pool.length - 1)][1] : 0;
        return { font: rng.pick(jzFontsOf(st, ['serif', 'display'])), wrong: pick, ang: rng.pick([28, 90, 180, -90, -35]), red: rng.chance(0.35), nums: rng.chance(0.7), sink: rng.range(0.06, 0.2) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, port = jzPortrait(ctx), s = c.seed | 0, i;
        var L = ahr_fit(ctx, jzSplitLines(jzFlat(c.text), port ? 5 : 9), { font: jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'serif')), color: sc.fg, x: W / 2, y: H / 2, track: 0.22, lead: 1.5, maxW: W * 0.82, maxH: H * 0.46, maxSize: H * 0.2 });
        var size = jzFontSize(L), all = ahr_slots(L), bb = jzBB(L);
        // flat-text index (spaces kept) -> glyph (textIndex) of the laid-out layer
        var fa = jzChars(jzFlat(c.text)), want = jzP(ctx, 'wrong', 0), wk = 0, k = 0, ti = -1;
        for (i = 0; i < fa.length; i++) { if (fa[i] === ' ') continue; if (i === want) { wk = k; break; } k++; }
        k = 0; for (i = 0; i < all.length; i++) { if (all[i].sp) continue; if (k === wk) { ti = i; break; } k++; }
        if (ti < 0) for (i = all.length - 1; i >= 0; i--) if (!all[i].sp) { ti = i; break; }
        jzAnimate(ctx, L, { mi: 0 });
        var turnAt = c.dur * 0.35, TI = ti + 1;
        var q = ahr_TH(ctx) + 'var q=ios((time-' + jzN(turnAt) + ')/' + jzN(Math.max(0.5, c.dur * 0.45)) + ');if(textIndex!=' + TI + ')q=0;';
        var tw = 'posterizeTime(12);seedRandom(' + (s % 9973) + '+Math.floor(time*12),true);var tw=(random()<0.07&&time>' + jzN(turnAt) + ')?random(-1,1)*14:0;';
        var ang = jzP(ctx, 'ang', 28);
        // it turns slowly while the rest never move (with a twitch now and then), sinks a little, and may redden
        jzAnimator(L, 'hr Wrong Turn', [['ADBE Text Rotation', 180]], q + tw + '(textIndex==' + TI + ')?(' + jzN(ang) + '*q+tw)/180*100:0');
        jzAnimator(L, 'hr Wrong Sink', [['ADBE Text Position 3D', [size * 0.03, size * 0.2, 0]]], q + 'seedRandom(' + (s % 9973) + '+Math.floor(time*6),true);[random(-1,1)*50*q,' + jzN(jzP(ctx, 'sink', 0.12) / 0.2 * 100) + '*q,0]');
        if (jzP(ctx, 'red', false)) jzAnimator(L, 'hr Wrong Red', [['ADBE Text Fill Color', jzHex(sc.accent)]], q + '100*q');
        if (jzP(ctx, 'nums', true) && all.length) {
            var fs = jzClamp(size * 0.14, 9 * ahr_px(ctx), 22 * ahr_px(ctx)), items = [], idx = 0, wi = -1;
            for (i = 0; i < all.length; i++) { if (all[i].sp) continue; if (i === ti) wi = idx; items.push({ ch: jzPad(idx + 1, 2), x: all[i].x, y: all[i].y + size * 0.72 }); idx++; }
            var NL = ahr_glyphCloud(ctx, items, { font: jzMonoF(ctx), size: fs, color: sc.sub, x: W / 2, y: H / 2, track: 0.1, name: 'hr numbers' });
            var gone = turnAt + 0.3;
            jzAnimator(NL, 'hr Hide Wrong', [['ADBE Text Opacity', 0]], '(time>' + jzN(gone) + '&&(textIndex==' + (wi * 2 + 1) + '||textIndex==' + (wi * 2 + 2) + '))?100:0');
            var TH0 = jzTH(ctx), e = TH0 + 'var e=oc((time-' + jzN((c.inDur || 0.3) * 0.8) + ')/0.3)*K;';
            jzSetExpr(jzXf(NL, 'ADBE Opacity'), e + '70*e');
            jzNoGhost(NL);
            if (wi >= 0) {
                var QQ = jzText(ctx, '??', { font: jzMonoF(ctx), size: fs, color: sc.accent, x: items[wi].x, y: items[wi].y, track: 0.1 });
                jzSetExpr(jzXf(QQ, 'ADBE Opacity'), e + '(time>' + jzN(gone) + '?100:0)*e');
                jzNoGhost(QQ);
            }
        }
        return bb;
    }
});

/* ================================================================ 8. hrRisingDark — 闇から這い出る */
jzReg('layout', 'hrRisingDark', {
    plan: function (rng, cut, st) {
        return { font: rng.pick(jzFontsOf(st, ['display', 'serif'])), pulls: rng.int(3, 5), span: rng.range(0.45, 0.6), rim: rng.chance(0.8) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, port = jzPortrait(ctx), s = c.seed | 0, i, k;
        var text = jzSplitLines(jzFlat(c.text), port ? 5 : 9), cy = H * 0.44;
        var L = ahr_fit(ctx, text, { font: jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'display')), color: sc.fg, x: W / 2, y: cy, track: 0.06, lead: 1.2, maxW: W * 0.82, maxH: H * 0.34, maxSize: H * 0.2 });
        var size = jzFontSize(L), all = ahr_slots(L), bb = jzBB(L);
        var nl = text.split('\r').length, surf = cy + nl * size * 1.2 / 2 + size * 0.3, pulls = jzP(ctx, 'pulls', 4), T = c.dur * jzP(ctx, 'span', 0.5);
        // hand over hand: a few sudden pulls per glyph (times precomputed like the browser)
        var TK = [], RE = [], RO = [], mx = 1, gi = 0;
        for (i = 0; i < all.length; i++) {
            var rest = surf - all[i].y + size * 0.62; RE.push(rest); mx = Math.max(mx, rest);
            RO.push(ahr_rs(s, gi, 83));
            for (k = 0; k < pulls; k++) TK.push(jzClamp(ahr_r(s, gi, k, 81) * 0.8 + k * 0.2 / pulls, 0, 1) * T * (k + 1) / pulls);
            if (!all[i].sp) gi++;
        }
        jzAnimate(ctx, L, { mi: 0 });
        var pr = 'var TK=' + ahr_arr(TK) + ',NP=' + pulls + ',j=textIndex-1,pg=0;for(var k=0;k<NP;k++)pg+=oc((time-(TK[j*NP+k]||0))/0.14)/NP;';
        jzAnimator(L, 'hr Rise', [['ADBE Text Position 3D', [size * 0.02, mx, 0]]], JZ_FNS + pr + 'var RE=' + ahr_arr(RE) + ';posterizeTime(24);seedRandom(textIndex*31+Math.floor(time*24),true);[pg<1?random(-100,100):0,(1-pg)*(RE[j]||0)/' + jzN(mx) + '*100,0]');
        jzAnimator(L, 'hr Rise Tilt', [['ADBE Text Rotation', 16]], JZ_FNS + pr + 'var RO=' + ahr_arr(RO) + ';(1-pg)*(RO[j]||0)*100');
        // the dark pool, drawn over the glyphs still under it
        var pc = ahr_night(sc), pts = [], n = 64;
        for (i = 0; i <= n; i++) { var x = -W * 0.3 + W * 1.6 * i / n; pts.push([x, surf + (ahr_noise1(i * 0.35, s) * 0.6 + Math.sin(i * 0.9) * 0.15) * size * 0.12]); }
        var Pl = jzShapeLayer(ctx, 'hr pool', 0, 0);
        if (jzP(ctx, 'rim', true)) ahr_path(Pl, 'rim', pts, { stroke: sc.sub, sw: Math.max(1, size * 0.012), sop: 35 });
        var body = pts.slice(0); body.push([W * 1.3, H * 1.3]); body.push([-W * 0.3, H * 1.3]);
        ahr_path(Pl, 'pool', body, { closed: true, fill: pc });
        var gr = jzEffect(Pl, 'ADBE Ramp', 'hr Pool Shade');
        jzEP(gr, 1, [W / 2, surf]); jzEP(gr, 2, jzHex(pc)); jzEP(gr, 3, [W / 2, H]); jzEP(gr, 4, jzHex(jzMixHex(pc, '#000000', 0.5)));
        jzSetExpr(jzXf(Pl, 'ADBE Position'), '[Math.sin(time*0.9)*' + jzN(W * 0.04) + ',Math.sin(time*1.4)*' + jzN(size * 0.02) + ']');
        jzSetExpr(jzXf(Pl, 'ADBE Opacity'), jzTH(ctx) + '100*K');
        jzNoGhost(Pl);
        bb.y1 = Math.min(bb.y1, surf); bb.cy = (bb.y0 + bb.y1) / 2;
        return bb;
    }
});

/* ================================================================ 9. hrRedacted — 黒塗り文書 */
jzReg('layout', 'hrRedacted', {
    plan: function (rng, cut, st) {
        return { font: rng.pick(jzFontsOf(st, ['serif', 'body', 'mono'])), row: rng.range(0.42, 0.58), stamp: rng.chance(0.75), stampAng: rng.range(-14, -6), leak: rng.range(0.1, 0.25) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, port = jzPortrait(ctx), s = c.seed | 0, u = jzU(ctx), px = ahr_px(ctx), i, r;
        var mx = W * (port ? 0.08 : 0.12), mw = W - mx * 2, mono = jzMonoF(ctx), fs = jzClamp(u * 0.028, 12 * px, 34 * px), rh = fs * 2.1;
        var barC = jzMixHex(sc.fg, sc.bg, 0.08), txtC = sc.sub, TH0 = jzTH(ctx);
        // header + rule
        var hd = jzText(ctx, 'FILE No. ' + (ahr_h(s, 1) % 9000 + 1000) + '   ' + ahr_date(s, '.'), { font: mono, size: fs * 0.8, color: txtC, x: mx, y: H * 0.08, align: 'left', track: 0.08 });
        ahr_fade(ctx, hd, 0, 0.25); jzNoGhost(hd);
        var RU = jzPathLayer(ctx, 'hr rule', [[mx, H * 0.08 + fs], [mx + mw, H * 0.08 + fs]], txtC, { width: Math.max(1, u * 0.0012), trim: JZ_FNS + '100*oc(time/0.25)' });
        jzSetExpr(jzXf(RU, 'ADBE Opacity'), TH0 + '60*K'); jzNoGhost(RU);
        // the lyric line
        var font = jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'serif')), ly = H * jzP(ctx, 'row', 0.5);
        var L = ahr_fit(ctx, jzSplitLines(jzFlat(c.text), port ? 7 : 16), { font: font, color: sc.fg, x: mx, y: ly, align: 'left', track: 0.06, lead: 1.3, maxW: mw, maxH: H * 0.24, maxSize: Math.min(H * 0.1, fs * 3.4) });
        var size = jzFontSize(L), m = jzSize(L), lh = m[1];
        // filler rows: body text, mostly blacked out
        var bodyT = jzChars(jzFlat(c.lineText || c.text) + '　'), latin = jzHasLatin(c.text), rowsN = Math.floor((H * 0.84 - H * 0.14) / rh), rowsT = [], rows = [];
        for (r = 0; r < rowsN; r++) {
            var y = H * 0.15 + r * rh;
            if (Math.abs(y - ly) < lh / 2 + rh * 0.7) { rowsT.push(' '); continue; }
            var len = r % 5 === 4 ? ahr_rr(0.3, 0.6, s, r, 2) : ahr_rr(0.85, 1, s, r, 2), nC = Math.max(1, Math.floor(mw * len / (fs * (latin ? 0.6 : 1.05)))), row = [];
            for (i = 0; i < nC; i++) row.push(bodyT[i % bodyT.length]);
            rowsT.push(row.join('')); rows.push({ r: r, y: y, len: len });
        }
        var BT = jzText(ctx, rowsT.join('\r'), { font: jzBodyF(ctx), size: fs, color: txtC, x: mx, y: H * 0.15 + (rowsN - 1) / 2 * rh, align: 'left', track: 0.05, leading: rh, name: 'hr file body' });
        ahr_fade(ctx, BT, 0, 0.3, 0.6); jzNoGhost(BT);
        var B = jzShapeLayer(ctx, 'hr bars', 0, 0), leak = jzP(ctx, 'leak', 0.18);
        for (i = rows.length - 1; i >= 0; i--) {
            var R0 = rows[i], g = jzGrp(B, 'row ' + R0.r), x = mx, end = mx + mw * R0.len, cnt = 0;
            while (x < end) {
                var w = mw * ahr_rr(0.08, 0.35, s, R0.r, Math.round(x), 3), gap = fs * ahr_rr(0.4, 2.4, s, R0.r, Math.round(x), 4), ww = Math.min(w, end - x);
                if (ahr_r(s, R0.r, Math.round(x), 5) > leak) { jzAddRect(g, ww, fs * 1.24, 0, x + ww / 2, R0.y); cnt++; }
                x += w + gap;
            }
            if (!cnt) jzAddRect(g, 1, 1, 0, mx, R0.y);
            jzAddFill(g, barC);
            jzGX(g).property('ADBE Vector Anchor').setValue([mx, R0.y]); jzGX(g).property('ADBE Vector Position').setValue([mx, R0.y]);
            jzGX(g).property('ADBE Vector Scale').expression = TH0 + '[100*cl((time-' + jzN(R0.r * 0.025) + ')/0.2)*K,100]';
        }
        jzNoGhost(B);
        L.moveToBeginning();
        var bb = jzBB(L);
        jzAnimate(ctx, L, { mi: 0 });
        // the bar over the lyric slides off, sticks, then goes
        var d0 = (c.inDur || 0.3) * 0.3, fwid = m[0] + size * 0.4, xr = mx - size * 0.2 + fwid;
        var OB = jzShapeLayer(ctx, 'hr lyric bar', xr, ly), go = jzGrp(OB, 'bar');
        jzAddRect(go, fwid, lh + size * 0.24, 0, -fwid / 2, 0); jzAddFill(go, barC);
        jzSetExpr(jzXf(OB, 'ADBE Scale'), ahr_TH(ctx) + 'var k=ioc((time-' + jzN(d0) + ')/0.25)*0.35+ioc((time-' + jzN(d0 + 0.25 + c.dur * 0.08) + ')/0.3)*0.65;[100*(1-k),100]');
        jzSetExpr(jzXf(OB, 'ADBE Opacity'), TH0 + '100*oc(time/0.25)');
        jzNoGhost(OB);
        if (jzP(ctx, 'stamp', true)) {
            var ss = fs * 1.6, word = 'CLASSIFIED', at = c.dur * 0.45;
            var ST = jzText(ctx, word, { font: mono, size: ss, color: sc.accent, x: 0, y: 0, track: 0.2 }), tw = jzSize(ST)[0], sxp = W - mx - tw * 0.55, syp = H * 0.8;
            jzXf(ST, 'ADBE Position').setValue([sxp, syp]);
            var SB = jzRectLayer(ctx, 'hr stamp', sxp, syp, tw + ss, ss * 1.8, null, { round: ss * 0.2, stroke: sc.accent, strokeW: Math.max(2 * px, ss * 0.1) });
            var e = TH0 + 'var q=cl((time-' + jzN(at) + ')/0.12);';
            for (i = 0; i < 2; i++) {
                var X = i ? SB : ST;
                jzXf(X, 'ADBE Rotate Z').setValue(jzP(ctx, 'stampAng', -10));
                jzSetExpr(jzXf(X, 'ADBE Scale'), e + 'var k=(1.6-0.6*oc(q))*100;[k,k]');
                jzSetExpr(jzXf(X, 'ADBE Opacity'), e + '85*Math.min(1,q*2)*K');
                jzNoGhost(X);
            }
        }
        return bb;
    }
});

/* ================================================================ 10. hrStaticTv — 砂嵐のテレビ */
jzReg('layout', 'hrStaticTv', {
    plan: function (rng, cut, st) {
        return { font: rng.pick(jzFontsOf(st, ['display', 'body'])), off: rng.range(-0.06, 0.06), tune: rng.range(0.3, 0.5), ant: rng.range(18, 34) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, port = jzPortrait(ctx), s = c.seed | 0, u = jzU(ctx), k;
        var tw = Math.min(W * (port ? 0.86 : 0.62), H * (port ? 0.5 : 0.8) * 1.3), th = tw / 1.3, cx = W / 2 + jzP(ctx, 'off', 0) * W, cy = H / 2 + th * 0.06;
        var body = jzMixHex(sc.bg, sc.fg, ahr_dark(sc.bg) ? 0.13 : 0.22), edge = jzMixHex(body, sc.fg, 0.3), lw = Math.max(1, u * 0.0018), TH0 = ahr_TH(ctx);
        var top = cy - th / 2, sw = tw * 0.72, sh = th * 0.78, sx0 = cx - tw / 2 + tw * 0.05, sy0 = top + th * 0.11, kx = sx0 + sw + (tw - sw - tw * 0.05) / 2;
        // glow of the screen into the room
        var mxd = Math.max(W, H), GL = ahr_solid(ctx, ahr_light(sc), 'hr tv glow', W, H), gm = GL.property('ADBE Mask Parade').addProperty('ADBE Mask Atom');
        gm.property('ADBE Mask Shape').setValue(jzCircleShape(sx0 + sw / 2, sy0 + sh / 2, mxd * 0.3)); gm.property('ADBE Mask Feather').setValue([mxd * 0.6, mxd * 0.6]);
        ahr_fade(ctx, GL, 0, 0.3, 0.1); jzNoGhost(GL);
        // set: highlight, scanlines (separate), screen, knobs, grille, body, feet, antenna
        var S = jzShapeLayer(ctx, 'hr tv', 0, 0);
        var gk = jzGrp(S, 'knobs');
        for (k = 0; k < 2; k++) jzAddEllipse(gk, tw * 0.07, tw * 0.07, kx, top + th * (0.25 + k * 0.2));
        jzAddStroke(gk, edge, lw); jzAddFill(gk, jzMixHex(body, sc.bg, 0.4));
        var ggr = jzGrp(S, 'grille');
        for (k = 0; k < 5; k++) jzAddPath(ggr, [[kx - tw * 0.04, top + th * (0.62 + k * 0.05)], [kx + tw * 0.04, top + th * (0.62 + k * 0.05)]], false);
        jzAddStroke(ggr, edge, lw, 80);
        var gsc = jzGrp(S, 'screen'); jzAddRect(gsc, sw, sh, sh * 0.1, sx0 + sw / 2, sy0 + sh / 2); jzAddFill(gsc, jzMixHex(sc.bg, '#000000', 0.6));
        var gb = jzGrp(S, 'body'); jzAddRect(gb, tw, th, th * 0.08, cx, top + th / 2); jzAddStroke(gb, edge, lw * 1.5); jzAddFill(gb, body);
        var gf = jzGrp(S, 'feet'); jzAddRect(gf, tw * 0.05, th * 0.06, 0, cx - tw * 0.36 + tw * 0.025, top + th + th * 0.03); jzAddRect(gf, tw * 0.05, th * 0.06, 0, cx + tw * 0.31 + tw * 0.025, top + th + th * 0.03); jzAddFill(gf, body);
        var sg = [-1, 1];
        for (k = 0; k < 2; k++) {
            var a = (90 + sg[k] * jzP(ctx, 'ant', 26)) * Math.PI / 180, ga = jzGrp(S, 'antenna' + k);
            jzAddPath(ga, [[0, 0], [-Math.cos(a) * th * 0.45, -Math.sin(a) * th * 0.45]], false); jzAddStroke(ga, edge, lw * 2);
            jzGX(ga).property('ADBE Vector Position').setValue([cx, top]);
            jzGX(ga).property('ADBE Vector Rotation').expression = 'Math.sin(time*0.7+' + sg[k] + ')*1.5*' + (-sg[k]);
        }
        ahr_fade(ctx, S, 0, 0.3); jzNoGhost(S);
        // static that slowly gives way to the words
        var tune = 'var tune=ioc((time-0.15)/' + jzN(Math.max(0.05, c.dur * jzP(ctx, 'tune', 0.4))) + ');';
        var N = ahr_solid(ctx, '#808080', 'hr tv static', sw - sh * 0.06, sh - sh * 0.06);
        jzXf(N, 'ADBE Position').setValue([sx0 + sw / 2, sy0 + sh / 2]);
        var ne = jzEffect(N, 'ADBE Noise', 'hr Snow'); jzEP(ne, 1, 100); jzEP(ne, 2, 0);
        jzSetExpr(jzXf(N, 'ADBE Opacity'), TH0 + tune + 'posterizeTime(24);seedRandom(' + (s % 9973) + '+Math.floor(time*24),true);var b=random()<0.06?0.35:0;Math.min(100,(0.85-0.6*tune+b)*100)*oc(time/0.3)');
        jzNoGhost(N);
        var tc = jzLum(sc.fg) > 0.5 ? sc.fg : '#FFFFFF';
        var L = ahr_fit(ctx, jzSplitLines(jzFlat(c.text), port ? 5 : 7), { font: jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'display')), color: tc, x: sx0 + sw / 2, y: sy0 + sh / 2, track: 0.04, lead: 1.15, maxW: sw * 0.82, maxH: sh * 0.6, maxSize: sh * 0.36 });
        var bb = jzBB(L);
        jzAnimate(ctx, L, { mi: 0 });
        // vertical roll while it is still tuning + the picture fading in (a Transform effect keeps the motion expressions)
        var tf = jzEffect(L, 'ADBE Geometry2', 'hr Tuning');
        jzEX(tf, 2, TH0 + tune + '[value[0],value[1]+(1-tune)*' + jzN(sh * 0.08) + '*Math.sin(time*23)]');
        jzEX(tf, 9, TH0 + tune + '100*(0.55+0.45*tune)');
        // scanlines + the curved-glass highlight
        var sp = Math.max(3 * ahr_px(ctx), sh / 70), SL = jzShapeLayer(ctx, 'hr tv glass', sx0 + sw / 2, sy0), gh = jzGrp(SL, 'highlight');
        jzAddRect(gh, sw * 0.4, sh * 0.12, sh * 0.06, -sw / 2 + sw * 0.06 + sw * 0.2, sh * 0.05 + sh * 0.06); jzAddFill(gh, '#FFFFFF', 5);
        var gl = jzGrp(SL, 'lines');
        jzAddRect(gl, sw, sp * 0.5, 0, 0, sp * 0.25);
        var rp = jzVecs(gl).addProperty('ADBE Vector Filter - Repeater');
        rp.property('ADBE Vector Repeater Copies').setValue(Math.floor(sh / (sp * 2)));
        rp.property('ADBE Vector Repeater Transform').property('ADBE Vector Repeater Position').setValue([0, sp * 2]);
        jzAddFill(gl, '#000000', 18);
        ahr_fade(ctx, SL, 0, 0.3); jzNoGhost(SL);
        return bb;
    }
});

/* ================================================================ 11. hrSpiritPhoto — 心霊写真 */
jzReg('layout', 'hrSpiritPhoto', {
    plan: function (rng, cut, st) {
        return { hand: rng.chance(0.75) ? 'klee' : rng.pick(jzFontsOf(st, ['body', 'serif'])), ang: rng.range(-5, 5), spot: [rng.range(0.25, 0.75), rng.range(0.3, 0.6)], win: rng.chance(0.6), side: rng.pick([1, -1]) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, port = jzPortrait(ctx), s = c.seed | 0, u = jzU(ctx), i;
        var side = jzP(ctx, 'side', 1), angD = jzP(ctx, 'ang', 0), spot = jzP(ctx, 'spot', [0.5, 0.45]), TH0 = ahr_TH(ctx);
        var pw = port ? W * 0.78 : Math.min(W * 0.46, H * 0.86 * 1.25), ph = pw / 1.25;
        var pcx = port ? W / 2 : (side > 0 ? W * 0.3 : W * 0.7), pcy = port ? H * 0.33 : H * 0.5;
        var rad = angD * Math.PI / 180, cs = Math.cos(rad), sn = Math.sin(rad);
        function T(lx, ly) { return [pcx + lx * cs - ly * sn, pcy + lx * sn + ly * cs]; }
        var border = jzMixHex(ahr_light(sc), sc.sub, 0.1), dark = jzMixHex(ahr_darkOf(sc), '#000000', 0.35), bw = u * 0.018;
        var dev = 'var dv=ios(time/' + jzN(Math.max(0.6, c.dur * 0.35)) + ');';
        var spx = -pw / 2 + pw * spot[0], spy = -ph / 2 + ph * spot[1], sr = pw * 0.09;
        // the photo (local coordinates around its centre; the layer carries the tilt)
        var S = jzShapeLayer(ctx, 'hr photo', pcx, pcy);
        var rr = sr * 1.5, rp = [];
        for (i = 0; i <= 46; i++) { var a = i / 40 * Math.PI * 2 - 1.2, w = 1 + 0.12 * ahr_noise1(i * 0.3, s) + i / 40 * 0.08; rp.push([spx + Math.cos(a) * rr * w * 0.8, spy + Math.sin(a) * rr * w]); }
        var gr = ahr_path(S, 'ring', rp, { stroke: sc.accent, sw: Math.max(2, u * 0.005), sop: 95 });
        jzAddTrimPaths(gr, TH0 + '100*oc((time-' + jzN(c.dur * 0.3) + ')/0.5)*K');
        var gsp = jzGrp(S, 'smudge');
        for (i = 0; i < 5; i++) jzAddEllipse(gsp, sr * 0.75 * (0.5 + i * 0.5), sr * 1.25 * (0.5 + i * 0.5), spx, spy);
        jzAddFill(gsp, border, 13);
        jzGX(gsp).property('ADBE Vector Group Opacity').expression = TH0 + dev + '100*dv';
        var gm = jzGrp(S, 'floor'); jzAddRect(gm, pw, ph * 0.32, 0, 0, ph * 0.18 + ph * 0.16); jzAddFill(gm, border, 60);
        jzGX(gm).property('ADBE Vector Group Opacity').expression = TH0 + dev + '22*dv';
        if (jzP(ctx, 'win', true)) {
            var wx = -pw * 0.3, wy = -ph * 0.32, ww = pw * 0.3, wh = ph * 0.45, gwl = jzGrp(S, 'window bars');
            jzAddPath(gwl, [[wx + ww / 2, wy], [wx + ww / 2, wy + wh]], false); jzAddPath(gwl, [[wx, wy + wh / 2], [wx + ww, wy + wh / 2]], false);
            jzAddStroke(gwl, dark, Math.max(1, u * 0.004));
            var gw = jzGrp(S, 'window'); jzAddRect(gw, ww, wh, 0, wx + ww / 2, wy + wh / 2); jzAddFill(gw, border);
            jzGX(gw).property('ADBE Vector Group Opacity').expression = TH0 + dev + '12*dv';
        }
        var gd = jzGrp(S, 'dark'); jzAddRect(gd, pw, ph, 0, 0, 0); jzAddFill(gd, dark);
        var gbo = jzGrp(S, 'border'); jzAddRect(gbo, pw + bw * 2, ph + bw * 3.2, 0, 0, bw * 1.1); jzAddFill(gbo, border);
        var gsh = jzGrp(S, 'shadow'); jzAddRect(gsh, pw + bw * 2, ph + bw * 3, 0, u * 0.01, bw + u * 0.012); jzAddFill(gsh, '#000000', 25);
        jzXf(S, 'ADBE Rotate Z').setValue(angD);
        ahr_fade(ctx, S, 0, 0.3); jzNoGhost(S);
        var dp = T(pw / 2 - ph * 0.05, ph / 2 - ph * 0.06);
        var DT = jzText(ctx, "'" + ahr_date(s, ' ').substr(2), { font: jzMonoF(ctx), size: ph * 0.055, color: jzFitContrast(sc.accent, dark, 3), x: dp[0], y: dp[1], align: 'right', track: 0.1, rot: angD });
        jzSetExpr(jzXf(DT, 'ADBE Opacity'), TH0 + dev + '90*dv*K'); jzNoGhost(DT);
        // the note (the lyric, handwritten) + the arrow to it
        var hand = jzP(ctx, 'hand', 'klee'), nx = port ? W / 2 : (side > 0 ? W * 0.76 : W * 0.24), ny = port ? H * 0.75 : H * 0.5;
        var L = ahr_fit(ctx, jzSplitLines(jzFlat(c.text), port ? 7 : 6), { font: hand, color: sc.fg, x: nx, y: ny, track: 0.02, lead: 1.2, maxW: port ? W * 0.84 : W * 0.38, maxH: H * (port ? 0.26 : 0.46), maxSize: H * 0.14 });
        var size = jzFontSize(L), nm = jzSize(L);
        jzXf(L, 'ADBE Rotate Z').setValue(-angD * 0.4);
        var bb = jzBB(L);
        jzAnimate(ctx, L, { mi: 0 });
        var A = T(spx + sr * 1.4 * (port ? 0.3 : side), spy + sr * (port ? 1.6 : 0.3)), ax = A[0], ay = A[1];
        var tx = port ? nx : nx - side * (nm[0] / 2 + size * 0.35), ty = port ? ny - nm[1] / 2 - size * 0.35 : ny;
        var mxp = (ax + tx) / 2 + (port ? W * 0.1 : 0), myp = (ay + ty) / 2 - (port ? 0 : H * 0.1), pts = [];
        for (i = 16; i >= 0; i--) { var q = i / 16; pts.push([(1 - q) * (1 - q) * ax + 2 * q * (1 - q) * mxp + q * q * tx, (1 - q) * (1 - q) * ay + 2 * q * (1 - q) * myp + q * q * ty]); }
        var AR = jzShapeLayer(ctx, 'hr arrow', 0, 0), aw = Math.max(2, u * 0.004), an = Math.atan2(ay - pts[14][1], ax - pts[14][0]), La = u * 0.03;
        var ea = TH0 + 'var ae=oc((time-' + jzN(c.dur * 0.3 + 0.35) + ')/0.35)*K;';
        var gh = ahr_path(AR, 'head', [[ax + Math.cos(an + 2.6) * La, ay + Math.sin(an + 2.6) * La], [ax, ay], [ax + Math.cos(an - 2.6) * La, ay + Math.sin(an - 2.6) * La]], { stroke: sc.accent, sw: aw, sop: 90 });
        jzGX(gh).property('ADBE Vector Group Opacity').expression = ea + 'ae>0.95?100:0';
        var gs = ahr_path(AR, 'shaft', pts, { stroke: sc.accent, sw: aw, sop: 90 });
        jzAddTrimPaths(gs, ea + '100*ae');
        jzNoGhost(AR);
        L.moveToBeginning();
        return bb;
    }
});

/* ================================================================ 12. hrWrongShadow — 影が違う */
jzReg('layout', 'hrWrongShadow', {
    plan: function (rng, cut, st) {
        return { font: rng.pick(jzFontsOf(st, ['display', 'serif'])), k: rng.range(1.5, 1.9), turn: rng.range(0.45, 0.65), dir: rng.pick([1, -1]), lean: rng.range(4, 9) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, port = jzPortrait(ctx), s = c.seed | 0;
        var text = jzSplitLines(jzFlat(c.text), port ? 4 : 7), font = jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'display'));
        var L = ahr_fit(ctx, text, { font: font, color: sc.fg, x: W / 2, y: H * 0.6, track: 0.05, lead: 1.1, maxW: W * 0.66, maxH: H * 0.26, maxSize: H * 0.16 });
        var size = jzFontSize(L), m = jzSize(L), cy = H * 0.66 - m[1] * 0.2;
        jzXf(L, 'ADBE Position').setValue([W / 2, cy]);
        // the shadow: bigger, soft, and it moves on its own
        var SH = ahr_fit(ctx, text, { font: font, color: ahr_dark(sc.bg) ? jzMixHex(sc.bg, '#000000', 0.55) : jzMixHex(sc.bg, sc.fg, 0.28), x: W / 2, y: H / 2, track: 0.05, lead: 1.1, maxW: W * 0.92, maxH: H * 0.42, maxSize: size * jzP(ctx, 'k', 1.7) });
        var shM = jzSize(SH), sy = Math.max(H * 0.06 + shM[1] / 2, cy - m[1] * 0.5 - shM[1] * 0.42);
        jzXf(SH, 'ADBE Position').setValue([W / 2, sy]);
        SH.name = 'hr shadow';
        var TH0 = ahr_TH(ctx), lamp = TH0 + 'var on=time<0.08?0:time<0.16?1:time<0.24?0.25:1;posterizeTime(24);seedRandom(' + (s % 9973) + '+Math.floor(time*24),true);var Lm=on*(random()<0.04?0.5:1)*K;';
        // pool of lamp light behind (a soft ellipse)
        var pool = ahr_dark(sc.bg) ? jzMixHex(sc.bg, sc.fg, 0.16) : jzMixHex(sc.bg, '#FFFFFF', 0.5), R = Math.max(shM[0], size * jzP(ctx, 'k', 1.7) * 2.2) * 0.75;
        var PL = ahr_solid(ctx, pool, 'hr lamp pool', W, H), pm = PL.property('ADBE Mask Parade').addProperty('ADBE Mask Atom');
        pm.property('ADBE Mask Shape').setValue(jzCircleShape(W / 2, sy, R * 0.5)); pm.property('ADBE Mask Feather').setValue([R, R]);
        jzXf(PL, 'ADBE Anchor Point').setValue([W / 2, sy]); jzXf(PL, 'ADBE Position').setValue([W / 2, sy]); jzXf(PL, 'ADBE Scale').setValue([100, 72]);
        jzSetExpr(jzXf(PL, 'ADBE Opacity'), lamp + '100*Lm');
        PL.moveAfter(SH);
        var t0 = c.dur * jzP(ctx, 'turn', 0.55), dir = jzP(ctx, 'dir', 1), lean = jzP(ctx, 'lean', 6), sd = s % 97;
        jzSetExpr(jzXf(SH, 'ADBE Position'), TH0 + '[value[0]+nz(time*0.35,' + sd + ')*' + jzN(size * 0.5) + ',value[1]+nz(time*0.3,' + (sd + 2) + ')*' + jzN(size * 0.1) + ']');
        jzSetExpr(jzXf(SH, 'ADBE Scale'), TH0 + 'var sx=1-2*ioc((time-' + jzN(t0) + ')/0.5);if(Math.abs(sx)<0.04)sx=0.04;[value[0]*sx,value[1]]');
        jzSetExpr(jzXf(SH, 'ADBE Rotate Z'), TH0 + 'posterizeTime(12);seedRandom(' + (s % 9973) + '+Math.floor(time*12),true);var tw=random()<0.05?random(-1,1)*8:0;value+' + jzN(dir * lean) + '*nz(time*0.25+3,' + (sd + 4) + ')+tw');
        jzSetExpr(jzXf(SH, 'ADBE Opacity'), lamp + '85*Lm');
        var tf = jzEffect(SH, 'ADBE Geometry2', 'hr Shadow Skew');
        jzEX(tf, 6, TH0 + 'nz(time*0.2,' + (sd + 5) + ')*10');
        var bl = jzEffect(SH, 'ADBE Gaussian Blur 2', 'hr Shadow Soft'); jzEP(bl, 1, Math.max(1, jzFontSize(SH) * 0.03));
        jzNoGhost(SH); jzNoGhost(PL);
        L.moveToBeginning();
        var bb = jzBB(L);
        jzAnimate(ctx, L, { mi: 0 });
        // floor line
        var fyy = cy + m[1] / 2 + size * 0.2, FL = jzPathLayer(ctx, 'hr floor', [[-m[0] * 0.8, 0], [m[0] * 0.8, 0]], sc.sub, { width: Math.max(1, size * 0.012) });
        jzXf(FL, 'ADBE Position').setValue([W / 2, fyy]);
        jzSetExpr(jzXf(FL, 'ADBE Scale'), TH0 + 'var e=oc((time-0.1)/0.5)*K;[100*e,100]');
        jzSetExpr(jzXf(FL, 'ADBE Opacity'), TH0 + '50*K');
        jzNoGhost(FL);
        return bb;
    }
});
