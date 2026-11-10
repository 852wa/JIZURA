// ================================================================ pack x2horrorA part 2 (AE port of src/11p_x2_horrorA.js: layouts 9-15, decor, bg)
// layouts: hzStreetLamp, hzTornNote, hzUnderDoor, hzSlats, hzStoppedClock, hzCloser, hzStairs
// decor:   hzPairEyes, hzPeeker, hzFootprints, hzStrayGlyph, hzFingers, hzHandprints, hzBareBulb, hzDoorAjar, hzCobweb, hzFilmDirt
// bg:      hzFogBanks, hzSwingLight, hzFarWindows, hzHeadlights, hzHallLights, hzWires
// helpers: ahza_ (p_x2_horrorA1)

/* ================================================================ 9. hzStreetLamp — 街灯の下
   the line stands in the cone of the only light, everything else is night, and the lamp is failing */
jzReg('layout', 'hzStreetLamp', {
    plan: function (rng, cut, st) {
        return { font: rng.pick(jzFontsOf(st, ['serif', 'display'])), side: rng.pick([-1, 1]), rate: rng.range(0.4, 0.9), moths: rng.int(3, 6) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, s = c.seed | 0, u = jzU(ctx), px = ahza_px(ctx), port = jzPortrait(ctx), side = jzP(ctx, 'side', 1), k, i;
        var wg = Math.min(W * 0.46, u * 0.64), hx = W * (0.5 + (port ? 0 : side * 0.05)), hy = H * 0.12, gy = H * 0.88, cH = gy - hy, ap = u * 0.022;
        // the block sits at the foot of the cone: the lower it ends up, the wider it may be
        var L = ahza_fit(ctx, ahza_lines(ctx, jzFlat(c.text), 7, 5), { font: ahza_font(ctx), color: sc.fg, x: hx, y: gy, track: 0.05, lead: 1.16, maxW: wg * 0.92, maxH: cH * 0.42, maxSize: H * 0.17 });
        for (k = 0; k < 2; k++) { var f = jzClamp(1 - 0.07 - jzSize(L)[1] / cH, 0.5, 0.9); ahza_refit(L, Math.min(wg * 2 * f * 0.9, W * 0.84), cH * 0.42, H * 0.17, 1.16); }
        var m = jzSize(L);
        jzXf(L, 'ADBE Position').setValue([hx, gy - cH * 0.07 - m[1] / 2]);
        var bb = jzBB(L), Lc = ahza_glow(sc), dk = ahza_night(sc), HD = ahza_TH(ctx);
        // lamp level: stutters on, fails now and then, dies on the way out
        var LV = 'var lv;if(time<0.4){lv=(rn(ST,3)<0.45?0.12:1)*cl(time/0.1);}else{lv=lamp(time+' + (s % 97) + ',SD,' + jzN(jzP(ctx, 'rate', 0.65)) + ');}if(PO>0)lv*=(rn(ST,4)<0.4?0.3:1)*(1-ic(PO));\n';
        var cone = [[hx - ap, hy], [hx + ap, hy], [hx + wg, gy], [hx - wg, gy]];
        // light: a faint cone, brighter under the head, a pool on the ground
        var kl = ahza_kit(ctx, 'hz lamp cone');
        ahza_op(kl, { name: 'cone', t: 'p', pts: cone, closed: true, fill: Lc });
        ahza_done(kl, HD + LV + '6*lv');
        var G1 = ahza_solid(ctx.comp, Lc, 'hz lamp glow', W, H);
        ahza_mask(G1, cone);
        ahza_ellMask(G1, hx, hy, cH * 0.22, cH * 0.22, [cH * 0.8, cH * 0.8], MaskMode.INTERSECT);
        jzSetExpr(jzXf(G1, 'ADBE Opacity'), HD + LV + '26*lv');
        jzNoGhost(G1);
        var G2 = ahza_solid(ctx.comp, Lc, 'hz lamp pool', W, H);
        ahza_ellMask(G2, hx, gy, wg * 0.5, wg * 0.06, [wg, wg * 0.12]);
        jzSetExpr(jzXf(G2, 'ADBE Opacity'), HD + LV + '20*lv');
        jzNoGhost(G2);
        L.moveToBeginning();
        jzAnimate(ctx, L, { mi: 0 });
        // the night around the cone, the cone dimming when the lamp fails, and the lamp itself
        var BIG = Math.max(W, H) * 6, pc = jzMixHex(dk, ahza_light(sc), 0.3), lw = Math.max(2 * px, u * 0.006), pxx = hx - side * wg * 0.94, kn = ahza_kit(ctx, 'hz night');
        ahza_op(kn, { name: 'night', t: 'r', cx: W / 2, cy: H / 2, w: BIG, h: BIG, more: [{ t: 'p', pts: cone, closed: true }], fill: dk, fop: 93, eo: true });
        ahza_op(kn, { name: 'lamp out', t: 'p', pts: cone, closed: true, fill: dk, opX: HD + LV + 'cl((1-lv)*0.85)*100' });
        ahza_op(kn, { name: 'pole', t: 'p', pts: [[pxx, gy], [pxx, hy - u * 0.02], [hx - side * ap, hy - u * 0.02]], stroke: pc, sw: lw });
        ahza_op(kn, { name: 'head', t: 'p', pts: [[hx - ap * 1.8, hy], [hx + ap * 1.8, hy], [hx + ap, hy - u * 0.03], [hx - ap, hy - u * 0.03]], closed: true, fill: pc });
        ahza_op(kn, { name: 'tube', t: 'r', cx: hx, cy: hy + Math.max(2 * px, u * 0.005) / 2, w: ap * 2.6, h: Math.max(2 * px, u * 0.005), fill: Lc, opX: HD + LV + 'cl(lv)*90' });
        ahza_op(kn, { name: 'ground', t: 'p', pts: [[0, gy], [W, gy]], stroke: pc, sw: Math.max(px, u * 0.002), sop: 50 });
        for (i = 0; i < jzP(ctx, 'moths', 4); i++) {
            var ph = ahza_r(s, i, 21) * Math.PI * 2, rr = u * ahza_rr(0.02, 0.06, s, i, 22), sp = ahza_rr(3, 6, s, i, 23) * (i % 2 ? 1 : -1), md = Math.max(1.2 * px, u * 0.003) * 2;
            ahza_op(kn, { name: 'moth ' + i, t: 'e', cx: 0, cy: 0, w: md, h: md, fill: Lc, gpos: [hx, hy + u * 0.05],
                posX: HD + '[' + jzN(hx) + '+Math.cos(time*' + jzN(sp) + '+' + jzN(ph) + ')*' + jzN(rr * 1.3) + '+nz(time*2,' + ((s + i) % 997) + ')*' + jzN(rr) + ',' + jzN(hy + u * 0.05) + '+Math.sin(time*' + jzN(sp * 1.3) + '+' + jzN(ph) + ')*' + jzN(rr) + ']',
                opX: HD + LV + '70*cl(lv)*oc(time/0.3)' });
        }
        ahza_done(kn, null);
        return bb;
    }
});

/* ================================================================ 10. hzTornNote — 破れた書き置き
   a note torn in two: the pieces start joined, tear apart and lie crooked, the line split between them */
function ahza_piece(ctx, name, cx, cy, pw, h, top, size, paperC, inkC, rule, s) {
    var k = ahza_kit(ctx, name), NJ = 18, i, y, edge = [], pts, sh = [], rules = [];
    for (i = 0; i <= NJ; i++) edge.push(ahza_rs(s, i, 31) * size * 0.13 + (i % 2 ? 1 : -1) * size * 0.03);
    if (top) { pts = []; for (i = 0; i <= NJ; i++) pts.push([cx - pw / 2 + pw * i / NJ, cy - h / 2 + edge[i]]); pts.push([cx + pw / 2, cy + h / 2]); pts.push([cx - pw / 2, cy + h / 2]); }
    else { pts = [[cx - pw / 2, cy - h / 2], [cx + pw / 2, cy - h / 2]]; for (i = NJ; i >= 0; i--) pts.push([cx - pw / 2 + pw * i / NJ, cy + h / 2 + edge[i]]); }
    for (i = 0; i < pts.length; i++) sh.push([pts[i][0] + size * 0.05, pts[i][1] + size * 0.07]);
    ahza_op(k, { name: 'shadow', t: 'p', pts: sh, closed: true, fill: '#000000', fop: 28 });
    ahza_op(k, { name: 'paper', t: 'p', pts: pts, closed: true, fill: paperC });
    if (rule) {
        // ruled lines (kept clear of the torn edge instead of being clipped by it)
        for (y = -h / 2 + size * 0.42; y < h / 2 - size * 0.18; y += size * 0.6) if (!top || y > -h / 2 + size * 0.2) rules.push({ t: 'p', pts: [[cx - pw / 2, cy + y], [cx + pw / 2, cy + y]] });
        if (rules.length) { var r0 = rules[0]; r0.name = 'rules'; r0.more = rules.slice(1); r0.stroke = inkC; r0.sw = Math.max(ahza_px(ctx), size * 0.012); r0.sop = 14; ahza_op(k, r0); }
    }
    return ahza_pivot(ahza_done(k, ahza_TH(ctx) + '100*oc(time/0.2)*K'), cx, cy);
}
jzReg('layout', 'hzTornNote', {
    plan: function (rng, cut, st) {
        return { font: rng.chance(0.7) ? 'klee' : rng.pick(jzFontsOf(st, ['body', 'serif'])), rotA: rng.range(-4.5, -1.5), rotB: rng.range(2, 5.5), dx: rng.range(0.02, 0.045), side: rng.pick([-1, 1]), rule: rng.chance(0.6) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, s = c.seed | 0, port = jzPortrait(ctx), font = jzP(ctx, 'font', 'klee'), side = jzP(ctx, 'side', 1);
        var raw = jzFlat(c.text), n = jzCount(raw), whole = jzSplitLines(raw, port ? 5 : 8).split('\r'), tA, tB = '', h;
        if (whole.length >= 2) { h = Math.ceil(whole.length / 2); tA = whole.slice(0, h).join('\r'); tB = whole.slice(h).join('\r'); }
        else if (jzHasLatin(raw) && raw.indexOf(' ') >= 0) { var ws = raw.split(' '); h = Math.ceil(ws.length / 2); tA = ws.slice(0, h).join(' '); tB = ws.slice(h).join(' '); }
        else if (!jzHasLatin(raw) && n >= 4) {
            var a = jzChars(raw); h = Math.ceil(a.length / 2);
            while (h < a.length - 1 && (jzIsPunct(a[h]) || 'ぁぃぅぇぉっゃゅょゎァィゥェォッャュョヮ'.indexOf(a[h]) >= 0 || a[h] === 'ー')) h++;
            tA = a.slice(0, h).join(''); tB = a.slice(h).join('');
        } else tA = raw;
        var mw = W * 0.56, mh = H * (tB ? 0.21 : 0.34), paperC = jzMixHex(ahza_light(sc), ahza_darkOf(sc), 0.1), inkC = jzMixHex(ahza_darkOf(sc), '#000000', 0.25);
        var LA = ahza_fit(ctx, tA, { font: font, color: inkC, x: W / 2, y: H / 2, track: 0.04, lead: 1.2, maxW: mw, maxH: mh, maxSize: H * 0.19 }), LB = null, size = jzFontSize(LA);
        if (tB) {
            LB = ahza_fit(ctx, tB, { font: font, color: inkC, x: W / 2, y: H / 2, track: 0.04, lead: 1.2, maxW: mw, maxH: mh, maxSize: H * 0.19 });
            size = Math.min(size, jzFontSize(LB)); ahza_setSize(LA, size, 1.2); ahza_setSize(LB, size, 1.2);
        }
        var mA = jzSize(LA), mB = LB ? jzSize(LB) : [0, 0], pw = Math.max(mA[0], mB[0]) + size * 1.3, hA = mA[1] + size * 0.95, hB = tB ? mB[1] + size * 0.95 : size * 1.1;
        var yA0 = H / 2 - (hA + hB) / 2 + hA / 2, yB0 = yA0 + hA / 2 + hB / 2, HD = ahza_TH(ctx) + 'var q=ioc((time-0.12)/0.6);', rule = jzP(ctx, 'rule', true), dx = jzP(ctx, 'dx', 0.03);
        jzXf(LA, 'ADBE Position').setValue([W / 2, yA0]);
        var PA = ahza_piece(ctx, 'hz note upper', W / 2, yA0, pw, hA, false, size, paperC, inkC, rule, s);
        var PB = ahza_piece(ctx, 'hz note lower', W / 2, yB0, pw, hB, true, size, paperC, inkC, rule, s);
        LA.moveToBeginning(); ahza_parent(LA, PA);
        jzSetExpr(jzXf(PA, 'ADBE Position'), HD + '[value[0]+' + jzN(-side * W * dx) + '*q,value[1]+' + jzN(-H * 0.02) + '*q]');
        jzSetExpr(jzXf(PA, 'ADBE Rotate Z'), HD + jzN(jzP(ctx, 'rotA', -3)) + '*q');
        jzSetExpr(jzXf(PB, 'ADBE Position'), HD + '[value[0]+' + jzN(side * W * dx) + '*q,value[1]+' + jzN(H * 0.03) + '*q]');
        jzSetExpr(jzXf(PB, 'ADBE Rotate Z'), HD + jzN(jzP(ctx, 'rotB', 3.5)) + '*q');
        var bb = jzBB(LA);
        jzAnimate(ctx, LA, { mi: 0 });
        if (LB) {
            jzXf(LB, 'ADBE Position').setValue([W / 2, yB0 + size * 0.06]);        // nudged down past the torn edge
            LB.moveToBeginning(); ahza_parent(LB, PB);
            bb = jzUnion(bb, jzBB(LB));
            jzAnimate(ctx, LB, { mi: 1 });
        }
        return bb;
    }
});

/* ================================================================ 11. hzUnderDoor — 扉の下の影
   the strip of light under a door, and two shadows that walk into it and stop */
jzReg('layout', 'hzUnderDoor', {
    plan: function (rng, cut, st) {
        return { font: rng.pick(jzFontsOf(st, ['serif', 'display'])), from: rng.pick([-1, 1]), at: rng.range(0.28, 0.42), knob: rng.pick([-1, 1]), fx: rng.range(-0.18, 0.18) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, u = jzU(ctx), px = ahza_px(ctx), i;
        var top = H * 0.07, gy = H * 0.855, gh = u * 0.02;
        var L = ahza_fit(ctx, ahza_lines(ctx, jzFlat(c.text), 9, 5), { font: ahza_font(ctx), color: sc.fg, x: W / 2, y: (top + gy) / 2 - H * 0.02, track: 0.05, lead: 1.18, maxW: W * 0.72, maxH: H * 0.4, maxSize: H * 0.2 });
        var size = jzFontSize(L), m = jzSize(L), bb = jzBB(L);
        var dw = jzClamp(m[0] + size * 1.7, Math.min(W * 0.5, H * 0.46), W * 0.88), x0 = W / 2 - dw / 2, x1 = W / 2 + dw / 2;
        var col = ahza_dim(sc, 0.26), lw = Math.max(1.2 * px, u * 0.0024), Lc = ahza_glow(sc), HD = ahza_TH(ctx), E = 'var e=ioc(time/0.8);';
        var from = jzP(ctx, 'from', 1), knob = jzP(ctx, 'knob', 1), at = jzP(ctx, 'at', 0.35);
        var LV = 'var lv=(time<0.3?(rn(ST,2)<0.4?0.2:1):0.9+0.1*rn(ST,3))*cl(time/0.12)*(1-cl(PO*3));';
        // light spilling under the door onto the floor
        var Sp = ahza_solid(ctx.comp, Lc, 'hz door spill', W, H), fl = H - gy - gh;
        ahza_mask(Sp, [[x0, gy + gh], [x1, gy + gh], [x1 + dw * 0.12, H + 2], [x0 - dw * 0.12, H + 2]]);
        ahza_mask(Sp, ahza_rectPts(-W, gy + gh - fl * 3, W * 2, gy + gh + fl * 0.4), [0, fl * 0.9], MaskMode.INTERSECT);
        jzSetExpr(jzXf(Sp, 'ADBE Opacity'), HD + LV + '20*lv');
        jzNoGhost(Sp);
        var k = ahza_kit(ctx, 'hz door');
        ahza_op(k, { name: 'frame', t: 'p', pts: [[x0, gy], [x0, top], [x1, top], [x1, gy]], stroke: col, sw: lw, trim: HD + E + '100*e', opX: HD + '100*K' });
        ahza_op(k, { name: 'floor', t: 'p', pts: [[0, gy + gh], [x0, gy + gh]], more: [{ t: 'p', pts: [[x1, gy + gh], [W, gy + gh]] }], stroke: col, sw: lw, opX: HD + E + '60*e*K' });
        ahza_op(k, { name: 'gap light', t: 'r', cx: W / 2, cy: gy + gh / 2, w: dw, h: gh, fill: Lc, opX: HD + LV + '90*lv' });
        // the handle moves once they have stopped
        var t0 = c.dur * at * 0.5, T = Math.max(0.8, c.dur * at), kx = knob > 0 ? x1 - size * 0.42 : x0 + size * 0.42, ky = H * 0.5, kr = Math.max(4 * px, u * 0.013);
        ahza_op(k, { name: 'knob', t: 'e', cx: kx, cy: ky, w: kr * 2, h: kr * 2, stroke: col, sw: lw, opX: HD + E + '100*e*K' });
        ahza_op(k, { name: 'handle', t: 'p', pts: [[0, 0], [-knob * kr * 3.2, 0]], stroke: col, sw: lw * 1.6, gpos: [kx, ky], opX: HD + E + '100*e*K',
            rotX: HD + 'var rat=time>' + jzN(t0 + T * 1.15) + '&&rn(Math.floor(time*1.3),6)<0.55?Math.sin(time*22)*24:0;-(10+rat)*' + knob });
        ahza_done(k, null);
        // feet: they come along the gap in a few steps and stop under the words (kept inside the gap by a layer mask)
        var fw = jzClamp(dw * 0.075, u * 0.045, u * 0.085), tx = W / 2 + jzP(ctx, 'fx', 0) * dw, sx = from > 0 ? x1 + fw * 2 : x0 - fw * 2, kf = ahza_kit(ctx, 'hz feet');
        var WALK = 'function walk(v){v=cl(v)*4;var k=Math.floor(v);return Math.min(1,(k+ioc(v-k))/4);}';
        for (i = 0; i < 2; i++) {
            var ex = tx + (i ? 1 : -1) * from * fw * 0.75, FX = HD + WALK + '[' + jzN(sx) + '+' + jzN(ex - sx) + '*walk((time-' + jzN(t0 + (i ? T * 0.11 : 0)) + ')/' + jzN(T) + '),' + jzN(gy) + ']';
            ahza_op(kf, { name: 'foot ' + i, t: 'r', cx: 0, cy: gh / 2, w: fw, h: gh + 2 * px, fill: sc.bg, gpos: [sx, gy], posX: FX });
            ahza_op(kf, { name: 'foot shadow ' + i, t: 'p', pts: [[-fw / 2, gh], [fw / 2, gh], [fw, H - gy + 2], [-fw, H - gy + 2]], closed: true, fill: sc.bg, gpos: [sx, gy], posX: FX, opX: HD + LV + '80*cl(lv)' });
        }
        var Ft = ahza_done(kf, null);
        ahza_mask(Ft, ahza_rectPts(x0, gy - 2 * px, x1, H + 4));
        L.moveToBeginning();
        jzAnimate(ctx, L, { mi: 0 });
        return bb;
    }
});

/* ================================================================ 12. hzSlats — 鎧戸の隙間
   seen from inside a closet: horizontal slats open just enough to read the line, and someone walks past outside */
jzReg('layout', 'hzSlats', {
    plan: function (rng, cut, st) {
        return { font: rng.pick(jzFontsOf(st, ['display'])), duty: rng.range(0.26, 0.33), at: rng.range(0.35, 0.6), dir: rng.pick([-1, 1]), pass: rng.chance(0.85) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, u = jzU(ctx), px = ahza_px(ctx);
        var L = ahza_fit(ctx, ahza_lines(ctx, jzFlat(c.text), 8, 4), { font: ahza_font(ctx, 'display'), color: sc.fg, x: W / 2, y: H / 2, track: 0.03, lead: 1.12, maxW: W * 0.84, maxH: H * 0.5, maxSize: H * 0.3 });
        var size = jzFontSize(L), bb = jzBB(L), HD = ahza_TH(ctx), duty = jzP(ctx, 'duty', 0.3);
        jzAnimate(ctx, L, { mi: 0 });
        var dk = ahza_night(sc), slat = jzMixHex(sc.bg, '#000000', ahza_isDark(sc.bg) ? 0.55 : 0.84), edge = jzMixHex(slat, ahza_light(sc), 0.22);
        var ph = jzClamp(size * 0.2, u * 0.028, u * 0.06), lh = Math.max(px, u * 0.0016), OPEN = 'var open=ioc((time-0.03)/0.5)*(1-ic(PO));';
        // someone passes outside
        if (jzP(ctx, 'pass', true)) {
            var kp = ahza_kit(ctx, 'hz passer'), PE = HD + 'var p=(time-DUR*' + jzN(jzP(ctx, 'at', 0.45)) + ')/1.3;', dir = jzP(ctx, 'dir', 1);
            ahza_op(kp, { t: 'r', cx: 0, cy: H / 2, w: u * 0.26, h: H + 4, fill: dk, fop: 30 });
            ahza_op(kp, { t: 'r', cx: 0, cy: H / 2, w: u * 0.16, h: H + 4, fill: dk, fop: 45 });
            var Sp = ahza_done(kp, PE + 'p>0&&p<1?100:0');
            jzSetExpr(jzXf(Sp, 'ADBE Position'), PE + 'var f=' + (dir > 0 ? 'cl(p)' : '1-cl(p)') + ';[' + jzN(-u * 0.2) + '+' + jzN(W + u * 0.4) + '*f,value[1]]');
        }
        // the slats: one slat (hinged at its top edge) repeated down the frame; they all open and close together
        var N = Math.min(80, Math.ceil((H + ph * 0.4) / ph) + 1), S = jzShapeLayer(ctx, 'hz slats', 0, 0);
        var Gh = jzGrp(S, 'hand on a slat');          // now and then one of them closes a little
        jzAddRect(Gh, W * 1.2, ph * 0.25, 0, 0, 0); jzAddFill(Gh, slat);
        var HAND = HD + OPEN + 'var q=Math.floor(time*1.5),i=Math.floor(rn(q,4)*' + N + ');';
        ahza_ex(jzGX(Gh).property('ADBE Vector Position'), HAND + '[' + jzN(W / 2) + ',' + jzN(-ph * 0.4 + ph * duty + ph * 0.125) + '+i*' + jzN(ph) + ']');
        ahza_ex(jzGX(Gh).property('ADBE Vector Group Opacity'), HAND + 'rn(q,3)<0.3&&open>0.9?100:0');
        var G = jzGrp(S, 'slats'), inner = jzVecs(G).addProperty('ADBE Vector Group');
        inner.name = 'slat';
        jzAddRect(inner, W * 1.2, lh / duty, 0, W / 2, ph - lh / duty / 2);
        var fe = jzAddFill(inner, edge, 80);
        ahza_ex(fe.property('ADBE Vector Fill Opacity'), HD + OPEN + 'open>0.05?80:0');
        jzAddRect(inner, W * 1.2, ph + 0.5, 0, W / 2, ph / 2);
        jzAddFill(inner, slat);
        jzGX(inner).property('ADBE Vector Position').setValue([0, -ph * 0.4]);
        ahza_ex(jzGX(inner).property('ADBE Vector Scale'), HD + OPEN + '[100,(1+' + jzN(duty - 1) + '*open)*100]');
        var rp = jzVecs(G).addProperty('ADBE Vector Filter - Repeater');
        rp.property('ADBE Vector Repeater Copies').setValue(N);
        jzVecs(G).property('ADBE Vector Filter - Repeater').property('ADBE Vector Repeater Transform').property('ADBE Vector Repeater Position').setValue([0, ph]);
        jzNoGhost(S);
        return bb;
    }
});

/* ================================================================ 13. hzStoppedClock — 止まった時計
   a clock that has stopped: the second hand keeps trying the same second; the line stands beside the dial */
jzReg('layout', 'hzStoppedClock', {
    plan: function (rng, cut, st) {
        return { font: rng.pick(jzFontsOf(st, ['serif', 'display'])), hh: rng.int(1, 11), mm: rng.int(3, 57), ss: rng.int(5, 50), stick: rng.range(0.25, 0.45), flip: rng.chance(0.5), roman: rng.chance(0.5) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, u = jzU(ctx), px = ahza_px(ctx), port = jzPortrait(ctx), flip = !!jzP(ctx, 'flip', false), i;
        var R = port ? W * 0.3 : Math.min(H * 0.33, W * 0.2), cx = port ? W / 2 : (flip ? W * 0.94 - R : W * 0.06 + R), cy = port ? H * 0.28 : H * 0.48;
        var tw = W * 0.83 - R * 2, tcx = flip ? W * 0.06 + tw / 2 : W * 0.94 - tw / 2, hh = jzP(ctx, 'hh', 3), mm = jzP(ctx, 'mm', 17), ss = jzP(ctx, 'ss', 20);
        var o = { font: ahza_font(ctx), color: sc.fg, x: port ? W / 2 : tcx, y: port ? H * 0.72 : H / 2, track: 0.05, lead: 1.18, maxW: port ? W * 0.84 : tw, maxH: port ? H * 0.32 : H * 0.62, maxSize: port ? H * 0.13 : H * 0.22 };
        var L = ahza_fit(ctx, jzSplitLines(jzFlat(c.text), 5), o), bb = jzBB(L);
        var col = ahza_dim(sc, 0.34), hc = ahza_dim(sc, 0.55), lw = Math.max(1.2 * px, u * 0.0026), HD = ahza_TH(ctx), E = HD + '100*ioc(time/0.9)', H2 = HD + 'var h=oc((time-0.25)/0.5)*100;[h,h]';
        // the second hand runs, then sticks: it tries the next second and falls back
        var SEC = 'var TS=' + jzN(Math.max(0.6, c.dur * jzP(ctx, 'stick', 0.35))) + ',sec=' + ss + '+Math.floor(Math.min(Math.max(0,time),TS)),tr=0;if(time>=TS){var f=(time-TS)%1;if(f<0.13)sec+=1;tr=(rn(ST,5)*2-1)*0.7;}';
        var k = ahza_kit(ctx, 'hz clock'), big = [], small = [];
        ahza_op(k, { name: 'dial', t: 'e', cx: cx, cy: cy, w: R * 2, h: R * 2, stroke: col, sw: lw * 1.5, trim: E });
        for (i = 0; i < 60; i++) {
            var an = (i / 60) * Math.PI * 2 - Math.PI / 2, isB = i % 5 === 0, r0 = R * (isB ? 0.88 : 0.94), co = Math.cos(an), sn = Math.sin(an);
            (isB ? big : small).push({ t: 'p', pts: [[cx + co * r0, cy + sn * r0], [cx + co * R * 0.975, cy + sn * R * 0.975]] });
        }
        big[0].name = 'hours'; big[0].more = big.slice(1); big[0].stroke = col; big[0].sw = lw * 1.6; big[0].opX = E; ahza_op(k, big[0]);
        small[0].name = 'minutes'; small[0].more = small.slice(1); small[0].stroke = col; small[0].sw = lw; small[0].sop = 70; small[0].opX = E; ahza_op(k, small[0]);
        ahza_op(k, { name: 'hour hand', t: 'p', pts: [[0, 0], [0, -R * 0.5]], stroke: hc, sw: lw * 3, gpos: [cx, cy], grot: ((hh % 12) + mm / 60) * 30, scaleX: H2 });
        ahza_op(k, { name: 'minute hand', t: 'p', pts: [[0, 0], [0, -R * 0.76]], stroke: hc, sw: lw * 2, gpos: [cx, cy], grot: mm * 6, scaleX: H2 });
        ahza_op(k, { name: 'second hand', t: 'p', pts: [[0, R * 0.14], [0, -R * 0.84]], stroke: ahza_acc(sc, sc.bg), sw: lw * 1.2, gpos: [cx, cy], scaleX: H2, rotX: HD + SEC + 'sec*6+tr' });
        ahza_op(k, { name: 'hub', t: 'e', cx: cx, cy: cy, w: lw * 6, h: lw * 6, fill: hc, opX: E });
        ahza_done(k, HD + '100*K');
        var fs = jzClamp(u * 0.026, 11 * px, 32 * px);
        var Rd = ahza_label(ctx, jzPad(hh, 2) + ':' + jzPad(mm, 2) + ':' + jzPad(ss, 2), { font: jzMonoF(ctx), size: fs, color: col, x: cx, y: cy + R + fs * 1.7, track: 0.12, name: 'hz clock readout' }, HD + '100*ioc(time/0.9)*K');
        ahza_srcEx(Rd, HD + SEC + 'var n=sec%60;"' + jzPad(hh, 2) + ':' + jzPad(mm, 2) + ':"+(n<10?"0":"")+n');
        L.moveToBeginning();
        jzAnimate(ctx, L, { mi: 0 });
        return bb;
    }
});

/* ================================================================ 14. hzCloser — 近づく人影
   a far figure on an empty floor; each time the light drops out it is standing nearer */
jzReg('layout', 'hzCloser', {
    plan: function (rng, cut, st) {
        return { font: rng.pick(jzFontsOf(st, ['serif', 'display'])), side: rng.pick([-1, 1]), k: rng.int(3, 4), vx: rng.range(0.42, 0.58) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, u = jzU(ctx), px = ahza_px(ctx), port = jzPortrait(ctx), i;
        var L = ahza_fit(ctx, ahza_lines(ctx, jzFlat(c.text), 10, 5), { font: ahza_font(ctx), color: sc.fg, x: W / 2, y: H * 0.26, track: 0.05, lead: 1.16, maxW: W * 0.82, maxH: H * (port ? 0.26 : 0.29), maxSize: H * 0.19 });
        var m = jzSize(L), ty = Math.max(port ? H * 0.24 : H * 0.26, H * 0.07 + m[1] / 2), hy = H * (port ? 0.56 : 0.6), vx = W * jzP(ctx, 'vx', 0.5), K = jzP(ctx, 'k', 3);
        jzXf(L, 'ADBE Position').setValue([W / 2, ty]);
        var bb = jzBB(L), Lc = ahza_glow(sc), col = ahza_dim(sc, 0.22), lw = Math.max(1.2 * px, u * 0.0022), HD = ahza_TH(ctx), E = 'var e=oc(time/0.7);';
        var Gl = ahza_solid(ctx.comp, Lc, 'hz floor light', W, H);
        ahza_ellMask(Gl, vx, hy, u * 0.28, u * 0.28 * 0.45, [u * 0.62, u * 0.62 * 0.45]);
        jzSetExpr(jzXf(Gl, 'ADBE Opacity'), HD + '24*oc(time/0.7)*K');
        jzNoGhost(Gl);
        var k = ahza_kit(ctx, 'hz empty floor'), bxs = [-0.25, 0.2, 0.8, 1.25], rays = [];
        ahza_op(k, { name: 'horizon', t: 'p', pts: [[0, hy], [W, hy]], stroke: col, sw: lw, ganchor: [W / 2, hy], gpos: [W / 2, hy], scaleX: HD + E + '[100*e,100]' });
        for (i = 0; i < 4; i++) rays.push({ t: 'p', pts: [[vx, hy], [W * bxs[i], H]] });
        rays[0].name = 'floor lines'; rays[0].more = rays.slice(1); rays[0].stroke = col; rays[0].sw = lw; rays[0].sop = 70; rays[0].trim = HD + E + '100*e'; ahza_op(k, rays[0]);
        // the figure: a head and a long body, nothing else (drawn at its nearest size, scaled down while it is far)
        var hF = H * (port ? 0.3 : 0.38), r = hF * 0.1, top = -hF, fc = jzMixHex(sc.bg, '#000000', ahza_isDark(sc.bg) ? 0.75 : 0.82), z = [0, 0], q23 = 2 / 3;
        var P0 = [-hF * 0.065, top + r * 2.1], C1 = [-hF * 0.16, top + r * 2.5], P1 = [-hF * 0.15, top + r * 4.4], P4 = [hF * 0.15, top + r * 4.4], C2 = [hF * 0.16, top + r * 2.5], P5 = [hF * 0.065, top + r * 2.1];
        var STG = 'var st=0;for(var k=1;k<=' + K + ';k++){if(time>=DUR*(0.18+0.6*k/' + K + '))st=k;}var f=Math.pow(st/' + K + ',1.6),hF=' + jzN(H * 0.05) + '+' + jzN(hF - H * 0.05) + '*f;';
        ahza_op(k, { name: 'figure', t: 'p', closed: true, pts: [P0, P1, [-hF * 0.115, 0], [hF * 0.115, 0], P4, P5],
            inT: [z, [(C1[0] - P1[0]) * q23, (C1[1] - P1[1]) * q23], z, z, z, [(C2[0] - P5[0]) * q23, (C2[1] - P5[1]) * q23]],
            outT: [[(C1[0] - P0[0]) * q23, (C1[1] - P0[1]) * q23], z, z, z, [(C2[0] - P4[0]) * q23, (C2[1] - P4[1]) * q23], z],
            more: [{ t: 'e', cx: 0, cy: top + r * 1.05, w: r * 2, h: r * 2 }], stroke: ahza_dim(sc, 0.3), sw: lw, fill: fc, gpos: [vx, hy],
            posX: HD + STG + 'var b0=' + jzN(hy) + '+hF*0.03;[' + jzN(vx) + '+' + jzN(W * (0.5 + jzP(ctx, 'side', 1) * 0.28) - vx) + '*f,b0+(' + jzN(H * 1.03) + '-b0)*f]',
            scaleX: HD + STG + 'var s=hF/' + jzN(hF) + '*100;[s,s]', opX: HD + '100*cl((time-0.25)/0.5)' });
        ahza_done(k, HD + '100*K');
        L.moveToBeginning();
        jzAnimate(ctx, L, { mi: 0 });
        // the light drops out for a moment at every step
        var kd = ahza_kit(ctx, 'hz blink');
        ahza_op(kd, { name: 'dark', t: 'r', cx: W / 2, cy: H / 2, w: W + 4, h: H + 4, fill: ahza_night(sc) });
        ahza_done(kd, HD + 'var d=0;for(var k=1;k<=' + K + ';k++){var q=time-DUR*(0.18+0.6*k/' + K + ');if(q>-0.045&&q<0.1)d=1;}d*86');
        return bb;
    }
});

/* ================================================================ 15. hzStairs — 下りていく階段
   each line of the lyric on a lower, smaller step; below them the steps go dark, and something is climbing */
jzReg('layout', 'hzStairs', {
    plan: function (rng, cut, st) {
        return { font: rng.pick(jzFontsOf(st, ['display', 'serif'])), q: rng.range(0.82, 0.87), climb: rng.chance(0.85), at: rng.range(0.25, 0.4), vx: rng.range(-0.04, 0.04) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, u = jzU(ctx), px = ahza_px(ctx), port = jzPortrait(ctx), font = ahza_font(ctx, 'display'), i;
        var N = 8, q = jzP(ctx, 'q', 0.85), lines = jzSplitLines(jzFlat(c.text), port ? 5 : 8).split('\r').slice(0, 5), Ln = lines.length;
        var h0 = H * 0.86 * (1 - q) / (1 - Math.pow(q, N)), cx0 = W / 2, drift = W * jzP(ctx, 'vx', 0), ys = [H * 0.07], Ls = [], base = 1e9;
        for (i = 0; i < N; i++) ys.push(ys[i] + h0 * Math.pow(q, i));
        function hw(j) { return W * 0.45 * Math.pow(q, j); }
        function cxi(j) { return cx0 + drift * j; }
        for (i = 0; i < Ln; i++) {
            var Li = jzText(ctx, lines[i], { font: font, size: 100, color: sc.fg, x: cxi(i) + drift * 0.5, y: (ys[i] + ys[i + 1]) / 2, track: 0.05 }), r = jzRect(Li);
            base = Math.min(base, 100 * Math.min(hw(i + 1) * 2 * 0.88 / Math.max(1, r.width), (ys[i + 1] - ys[i]) * 0.68 / Math.max(1, r.height)) / Math.pow(q, i));
            Ls.push(Li);
        }
        base = Math.min(base, H * 0.2);
        var bb = null;
        for (i = 0; i < Ln; i++) { ahza_setSize(Ls[i], base * Math.pow(q, i), 1.2); bb = jzUnion(bb, jzBB(Ls[i])); }
        var col = ahza_dim(sc, 0.36), lw = Math.max(1.2 * px, u * 0.0024), Lc = ahza_glow(sc), HD = ahza_TH(ctx), k = ahza_kit(ctx, 'hz stairs');
        // something comes up the steps, one at a time, and stops just below the words
        if (jzP(ctx, 'climb', true) && Ln < N) {
            var t0 = c.dur * jzP(ctx, 'at', 0.3), dt = Math.max(0.22, Math.min(0.5, c.dur * 0.45 / Math.max(1, N - Ln)));
            var CL = HD + 'var cur=Math.max(' + Ln + ',' + (N - 1) + '-Math.floor((time-' + jzN(t0) + ')/' + jzN(dt) + ')),on=time>=' + jzN(t0) + ';';
            for (i = Ln; i < N; i++) ahza_op(k, { name: 'tread ' + i, t: 'p', closed: true, fill: Lc, pts: [[cxi(i) - hw(i), ys[i]], [cxi(i) + hw(i), ys[i]], [cxi(i + 1) + hw(i + 1), ys[i + 1]], [cxi(i + 1) - hw(i + 1), ys[i + 1]]],
                opX: CL + '!on?0:(cur==' + i + '?20*(0.75+0.25*rn(ST,6)):(cur<' + i + '?5:0))' });
        }
        for (i = 0; i <= N; i++) {
            var E = HD + 'var e=oc((time-' + jzN(i * 0.07) + ')/0.4);', more = [], sg;
            if (i < N) for (sg = -1; sg <= 1; sg += 2) more.push({ t: 'p', pts: [[cxi(i) + sg * hw(i), ys[i]], [(cxi(i) + sg * hw(i) + cxi(i + 1) + sg * hw(i + 1)) / 2, (ys[i] + ys[i + 1]) / 2], [cxi(i + 1) + sg * hw(i + 1), ys[i + 1]]] });
            ahza_op(k, { name: 'step ' + i, t: 'p', pts: [[cxi(i) - hw(i), ys[i]], [cxi(i) + hw(i), ys[i]]], stroke: col, sw: lw, sop: 100 * (1 - 0.62 * i / N), trim: E + '50+50*e', trimS: E + '50-50*e' });
            if (more.length) ahza_op(k, { name: 'sides ' + i, t: 'p', pts: more[0].pts, more: [more[1]], stroke: col, sw: lw, sop: 80 * (1 - 0.62 * i / N), trim: HD + '100*oc((time-' + jzN(i * 0.07 + 0.2) + ')/0.3)' });
        }
        ahza_done(k, HD + '100*K');
        // the steps below the words go dark
        var yd = ys[Math.min(N, Ln)], Dk = ahza_solid(ctx.comp, ahza_night(sc), 'hz stairwell dark', W, H);
        ahza_mask(Dk, ahza_rectPts(-W, yd + (H - yd) * 0.55, W * 2, H * 2), [0, (H - yd) * 0.9]);
        jzSetExpr(jzXf(Dk, 'ADBE Opacity'), HD + '78*oc(time/0.6)*K');
        jzNoGhost(Dk);
        for (i = 0; i < Ln; i++) { Ls[i].moveToBeginning(); jzAnimate(ctx, Ls[i], { mi: i }); }
        return bb;
    }
});

/* ================================================================ DECOR */
function ahza_bb(ctx, bb) { return bb || { x0: ctx.W * 0.35, x1: ctx.W * 0.65, y0: ctx.H * 0.4, y1: ctx.H * 0.6, cx: ctx.W / 2, cy: ctx.H / 2 }; }
// a spot inside the frame that is as far from the lyric as a few tries allow (browser farSpot)
function ahza_far(ctx, bb, s, k, mx, my) {
    var W = ctx.W, H = ctx.H, best = [W * mx, H * my], bd = -1, i;
    for (i = 0; i < 9; i++) {
        var x = W * (mx + (1 - 2 * mx) * ahza_r(s, k, i, 1)), y = H * (my + (1 - 2 * my) * ahza_r(s, k, i, 2)), d = ahza_dist(bb, x, y);
        if (d > bd) { bd = d; best = [x, y]; }
    }
    return { x: best[0], y: best[1], d: bd };
}

/* hzPairEyes — 闇の中の目: pairs of small lights far from the words; they open late, blink, and are shut again before the cut ends */
jzReg('decor', 'hzPairEyes', { back: false, build: function (ctx, bb0, d) {
    var bb = ahza_bb(ctx, bb0), sc = ctx.sc, s = d.seed | 0, u = jzU(ctx), n = 1 + (d.n | 0), HD = ahza_TH(ctx), kit = ahza_kit(ctx, 'hz eyes'), k, b, any = false;
    for (k = 0; k < n && k < 4; k++) {
        var sp = ahza_far(ctx, bb, s, k, 0.07, 0.09); if (sp.d < u * 0.1) continue;
        var t0 = 0.45 + k * 0.6 + ahza_r(s, k, 3) * 0.5, bl = [];
        for (b = 0; b < 4; b++) bl.push(jzN(t0 + 0.7 + b * 1.25 + ahza_r(s, k, b, 4) * 0.9));
        var r = u * (d.big ? 0.011 : 0.0085) * (1 - k * 0.12), gap = r * 4.4;
        var OPEN = HD + 'var op=oc((time-' + jzN(t0) + ')/0.18)*(1-cl(PO*' + jzN(1.6 + k * 0.5) + ')),B=[' + bl.join(',') + '];for(var i=0;i<4;i++){var q=Math.abs(time-B[i]);if(q<0.07)op*=q/0.07;}';
        ahza_op(kit, { name: 'eyes ' + k, t: 'e', cx: -gap / 2, cy: 0, w: r * 2, h: r * 1.64, more: [{ t: 'e', cx: gap / 2, cy: 0, w: r * 2, h: r * 1.64 }], fill: sc.fg, gpos: [sp.x, sp.y], grot: ahza_rs(s, k, 5) * 0.2 * 180 / Math.PI,
            scaleX: OPEN + '[100,Math.max(4,op*100)]', opX: OPEN + 'op<=0.02?0:90',
            // the gaze shifts in small jumps
            posX: HD + 'var g=Math.floor(time*0.7)+' + (k * 13) + ';[' + jzN(sp.x) + '+(rn(g,6)*2-1)*' + jzN(r * 0.8) + ',' + jzN(sp.y) + '+(rn(g,7)*2-1)*' + jzN(r * 0.4) + ']' });
        any = true;
    }
    if (any) ahza_done(kit, null);
} });

/* hzPeeker — 覗き込む影: a head-shaped shadow leaning in from the side edge; it flinches back once and vanishes fast */
jzReg('decor', 'hzPeeker', { back: false, build: function (ctx, bb0, d) {
    var bb = ahza_bb(ctx, bb0), W = ctx.W, H = ctx.H, sc = ctx.sc, s = d.seed | 0, u = jzU(ctx), dir = d.right ? -1 : 1, dark = ahza_isDark(sc.bg);
    var r = u * (d.big ? 0.085 : 0.065), ex = d.right ? W : 0, y = H * (d.low ? 0.68 : 0.3) + ahza_rs(s, 1) * H * 0.06;
    var near = d.right ? bb.x1 > W - r * 2.4 : bb.x0 < r * 2.4;
    if (near && y > bb.y0 - r * 1.6 && y < bb.y1 + r * 1.6) y = (bb.y0 + bb.y1) / 2 > H / 2 ? Math.max(r * 1.2, bb.y0 - r * 2) : Math.min(H - r * 1.2, bb.y1 + r * 2);
    var HD = ahza_TH(ctx) + 'var lean=ios((time-0.3)/1.4),fl=time-' + jzN(2.2 + ahza_r(s, 2) * 1.5) + ';if(fl>0&&fl<0.9)lean*=0.25+0.75*ios(Math.abs(fl-0.3)/0.6);lean*=1-oc(PO*3);\n';
    var fc = dark ? jzMixHex(sc.bg, sc.fg, 0.13) : jzMixHex(sc.bg, '#000000', 0.72), k = ahza_kit(ctx, 'hz peeker'), head = ahza_ell(0, 0, r * 0.82, r, dir * 0.12);
    ahza_op(k, { name: 'shoulder', t: 'e', cx: -dir * r * 1.5, cy: r * 2.3, w: r * 3.4, h: r * 3, fill: fc, fop: 95 });
    head.name = 'head'; head.fill = fc; head.fop = 95; ahza_op(k, head);
    ahza_op(k, { name: 'eye', t: 'e', cx: 0, cy: 0, w: r * 0.15, h: r * 0.15, fill: dark ? sc.fg : sc.bg, gpos: [dir * r * 0.38, -r * 0.12],
        opX: HD + '90*cl(lean*1.4-0.4)', scaleX: HD + 'var b=Math.abs(time-' + jzN(1.9 + ahza_r(s, 3)) + ')<0.07?15:100;[b,b]' });
    var S = ahza_done(k, HD + 'lean<=0.01?0:100');
    jzSetExpr(jzXf(S, 'ADBE Position'), HD + '[' + jzN(ex) + '+' + dir + '*(' + jzN(-r * 1.1) + '+lean*' + jzN(r * 1.75) + '),' + jzN(y) + '+Math.sin(time*0.8)*' + jzN(r * 0.05) + ']');
} });

/* hzFootprints — 近づく足跡: wet footprints that come towards the words one step at a time and stop short of them */
jzReg('decor', 'hzFootprints', { back: true, build: function (ctx, bb0, d) {
    var bb = ahza_bb(ctx, bb0), W = ctx.W, H = ctx.H, sc = ctx.sc, s = d.seed | 0, u = jzU(ctx), HD = ahza_TH(ctx), i;
    var below = H - bb.y1 > bb.y0, sx = W * (d.right ? 0.95 : 0.05), sy = below ? H * 0.95 : H * 0.05;
    var tx = jzClamp((bb.x0 + bb.x1) / 2 + ahza_rs(s, 1) * u * 0.1, W * 0.2, W * 0.8), ty = below ? Math.min(H * 0.93, bb.y1 + u * 0.1) : Math.max(H * 0.07, bb.y0 - u * 0.1);
    var D = Math.sqrt((tx - sx) * (tx - sx) + (ty - sy) * (ty - sy)), ang = Math.atan2(ty - sy, tx - sx), N = Math.min(14, Math.max(3, Math.floor(D / (u * 0.1))));
    var col = ahza_dim(sc, 0.34), fl = u * 0.042, k = ahza_kit(ctx, 'hz footprints');
    for (i = 0; i < N; i++) {
        var t0 = 0.2 + i * 0.24, f = (i + 0.5) / N, sd = i % 2 ? 1 : -1;
        ahza_op(k, { name: 'print ' + i, t: 'e', cx: fl * 0.2, cy: 0, w: fl, h: fl * 0.52, more: [{ t: 'e', cx: -fl * 0.48, cy: 0, w: fl * 0.4, h: fl * 0.36 }], fill: col,
            gpos: [jzLerp(sx, tx, f) - Math.sin(ang) * sd * fl * 0.55, jzLerp(sy, ty, f) + Math.cos(ang) * sd * fl * 0.55], grot: (ang + sd * 0.12 + ahza_rs(s, i, 2) * 0.1) * 180 / Math.PI,
            opX: HD + 'var a=time-' + jzN(t0) + ';100*cl(a/0.1)*(0.32+0.5*Math.exp(-Math.max(0,a)*0.5))' });
    }
    ahza_done(k, HD + '100*K');
} });

/* hzStrayGlyph — はぐれた一字: a glyph of the line turns up somewhere it should not be, mirrored, faint, twitching */
jzReg('decor', 'hzStrayGlyph', { back: false, build: function (ctx, bb0, d) {
    var bb = ahza_bb(ctx, bb0), sc = ctx.sc, s = d.seed | 0, u = jzU(ctx), cs = jzChars(String(ctx.cut.text || '')), gl = [], HD = ahza_TH(ctx), k, i;
    for (i = 0; i < cs.length; i++) if (!/[\s　]/.test(cs[i]) && !jzIsPunct(cs[i])) gl.push(cs[i]);
    if (!gl.length) return;
    var font = (ctx.st.fonts.serif && ctx.st.fonts.serif[0]) || (ctx.st.fonts.body && ctx.st.fonts.body[0]) || 'mincho', n = Math.min(2, 1 + ((d.n | 0) >> 1));
    for (k = 0; k < n; k++) {
        var sp = ahza_far(ctx, bb, s, k + 5, 0.1, 0.13), size = u * (d.big ? 0.15 : 0.11) * (1 - k * 0.2);
        if (sp.d < size * 0.9) continue;
        var t0 = 0.5 + k * 0.7;
        var G = jzText(ctx, gl[ahza_h(s, k, 4) % gl.length], { font: font, size: size, color: sc.sub || sc.fg, x: sp.x, y: sp.y, sx: -1, rot: ahza_rs(s, k, 6) * 14 + (k ? 180 : 0), name: 'hz stray glyph' });
        // flickers into place, drops out now and then, twitches
        jzSetExpr(jzXf(G, 'ADBE Opacity'), HD + 'var a=cl((time-' + jzN(t0) + ')/0.08)*(1-cl(PO*2.5));if(time-' + jzN(t0) + '<0.5&&rn(ST+' + (k * 31) + ',1)<0.45)a*=0.2;if(rn(Math.floor(ST/2)+' + (k * 31) + ',2)<0.07)a*=0.3;50*a');
        jzSetExpr(jzXf(G, 'ADBE Position'), HD + '[value[0]+(rn(Math.floor(ST/4)+' + (k * 31) + ',3)<0.18?(rn(ST+' + (k * 31) + ',5)*2-1)*' + jzN(size * 0.08) + ':0),value[1]]');
        jzNoGhost(G);
    }
} });

/* hzFingers — 忍び寄る指: long shadow fingers that creep out of a corner towards the words and stop just short of them */
jzReg('decor', 'hzFingers', { back: false, build: function (ctx, bb0, d) {
    var bb = ahza_bb(ctx, bb0), W = ctx.W, H = ctx.H, sc = ctx.sc, s = d.seed | 0, u = jzU(ctx), HD = ahza_TH(ctx), k, i;
    var ox = d.right ? W : 0, oy = d.low ? H : 0, base = Math.atan2((bb.cy != null ? bb.cy : H / 2) - oy, (bb.x0 + bb.x1) / 2 - ox);
    var col = ahza_isDark(sc.bg) ? jzMixHex(sc.bg, sc.fg, 0.15) : jzMixHex(sc.bg, '#000000', 0.7), nF = 4 + (d.big ? 1 : 0);
    var reach = Math.max(u * 0.12, ahza_dist(bb, ox, oy) - u * 0.05), kit = ahza_kit(ctx, 'hz fingers');
    for (k = 0; k < nF; k++) {
        var an0 = base + (k - (nF - 1) / 2) * 0.2 + ahza_rs(s, k, 2) * 0.05, Lf = Math.min(reach, u * ahza_rr(0.3, 0.6, s, k, 3)) * ahza_rr(0.72, 1, s, k, 4), w0 = u * ahza_rr(0.026, 0.04, s, k, 5);
        var m = 12, Lp = [], Rp = [], x = 0, y = 0, an = 0, ca = Math.cos(an0), sa = Math.sin(an0);
        // built along the finger's own axis (the group is turned to an0), so that it can grow lengthwise
        for (i = 0; i <= m; i++) {
            var f = i / m, w = w0 * (1 - f * 0.8) * (i === m ? 0.25 : 1) * (1 + 0.18 * Math.sin(f * 9.4));    // knuckles
            Lp.push([x - Math.sin(an) * w, y + Math.cos(an) * w]); Rp.push([x + Math.sin(an) * w, y - Math.cos(an) * w]);
            an = ahza_noise1(f * 2.2, s + k * 7) * 0.5 * f;
            x += Math.cos(an) * Lf / m; y += Math.sin(an) * Lf / m;
            var gx = ox + x * ca - y * sa, gy = oy + x * sa + y * ca;
            if (ahza_over(bb, gx, gy, gx, gy, u * 0.03)) { Lp.push([x, y]); break; }
        }
        ahza_op(kit, { name: 'finger ' + k, t: 'p', pts: Lp.concat(Rp.reverse()), closed: true, rc: w0 * 0.6, fill: col, fop: 92, gpos: [ox, oy], grot: an0 * 180 / Math.PI,
            scaleX: HD + 'var g=oc((time-' + jzN(0.1 + k * 0.12) + ')/' + jzN(1.5 + ahza_r(s, k, 1) * 1.5) + ')*(1-ic(PO*1.4));[g*100,(0.45+0.55*g)*100]',
            opX: HD + 'oc((time-' + jzN(0.1 + k * 0.12) + ')/0.2)*100' });
    }
    ahza_done(kit, null);
} });

/* hzHandprints — 窓の手形: pale smears pressed against the frame one after another, slowly running */
jzReg('decor', 'hzHandprints', { back: false, build: function (ctx, bb0, d) {
    var bb = ahza_bb(ctx, bb0), sc = ctx.sc, s = d.seed | 0, u = jzU(ctx), HD = ahza_TH(ctx), n = 2 + (d.n | 0), kit = ahza_kit(ctx, 'hz handprints'), lens = [0.95, 1.12, 1.05, 0.82], k, f, any = false;
    var col = ahza_isDark(sc.bg) ? jzMixHex(sc.bg, sc.fg, 0.42) : jzMixHex(sc.bg, sc.fg, 0.3);
    for (k = 0; k < n && k < 5; k++) {
        var sp = ahza_far(ctx, bb, s, k + 11, 0.09, 0.12), R = u * (d.big ? 0.07 : 0.055) * ahza_rr(0.85, 1.15, s, k, 1);
        if (sp.d < R * 2.6) continue;
        var t0 = 0.25 + k * 0.5 + ahza_r(s, k, 2) * 0.3, A = HD + 'var g=time-' + jzN(t0) + ',a=cl(g/0.12)*(0.2+0.2*Math.exp(-Math.max(0,g)*0.6));';
        var hand = ahza_ell(0, R * 0.25, R * 0.62, R * 0.7, 0), parts = [], drips = [];
        for (f = 0; f < 4; f++) {
            var fa = -0.42 + f * 0.28, len = R * lens[f], cy = -R * 0.55 - len * 0.5;
            parts.push(ahza_ell(-cy * Math.sin(fa), cy * Math.cos(fa), R * 0.14, len * 0.5, fa));
        }
        parts.push(ahza_ell(-(-R * 0.8) * Math.sin(-1.15), -R * 0.8 * Math.cos(-1.15), R * 0.15, R * 0.42, -1.15));
        hand.name = 'hand ' + k; hand.more = parts; hand.fill = col; hand.gpos = [sp.x, sp.y]; hand.grot = ahza_rs(s, k, 3) * 0.6 * 180 / Math.PI; hand.gscale = [ahza_r(s, k, 4) < 0.5 ? -100 : 100, 100];
        hand.opX = A + '100*a';
        // the smear runs down from the palm
        for (f = 0; f < 3; f++) {
            var x = sp.x + (f - 1) * R * 0.42 + ahza_rs(s, k, f, 5) * R * 0.1, Ld = R * ahza_rr(0.8, 2.2, s, k, f, 6);
            if (!ahza_over(bb, x, sp.y + R * 0.9 + Ld, x, sp.y + R * 0.9 + Ld, u * 0.02)) drips.push({ t: 'p', pts: [[x, sp.y + R * 0.9], [x, sp.y + R * 0.9 + Ld]] });
        }
        if (drips.length) { drips[0].name = 'smear ' + k; drips[0].more = drips.slice(1); drips[0].stroke = col; drips[0].sw = Math.max(1.2 * ahza_px(ctx), R * 0.07); drips[0].trim = A + '100*oc(g/4)'; drips[0].opX = A + '80*a'; ahza_op(kit, drips[0]); }
        ahza_op(kit, hand);
        any = true;
    }
    if (any) ahza_done(kit, HD + '100*K');
} });

/* hzBareBulb — 揺れる裸電球: a bare bulb on a cord at the top of the frame; it swings, stutters and goes out before the cut does */
jzReg('decor', 'hzBareBulb', { back: false, build: function (ctx, bb0, d) {
    var bb = ahza_bb(ctx, bb0), W = ctx.W, sc = ctx.sc, s = d.seed | 0, u = jzU(ctx), px = ahza_px(ctx);
    var x = W * (d.right ? 0.84 : 0.16) + ahza_rs(s, 1) * W * 0.04, Lc = u * (d.big ? 0.2 : 0.14);
    if (bb.y0 < Lc + u * 0.12 && x > bb.x0 - u * 0.1 && x < bb.x1 + u * 0.1) {
        var nx = d.right ? bb.x1 + u * 0.12 : bb.x0 - u * 0.12;
        if (nx > u * 0.06 && nx < W - u * 0.06) x = nx; else Lc = Math.max(u * 0.02, bb.y0 - u * 0.11);
    }
    var r = u * 0.018, col = ahza_dim(sc, 0.5), Lg = ahza_glow(sc), mot = ctx.fx && ctx.fx.motion != null ? ctx.fx.motion : 0.7;
    var HD = ahza_TH(ctx) + 'var LL=' + jzN(Lc) + '*oc(time/0.5)*(1-ic(PO*1.2-0.2)),ang=Math.sin(time*1.9+' + jzN(ahza_r(s, 2) * 6) + ')*(5+8*Math.exp(-Math.max(0,time)*0.35))*' + jzN(0.4 + 0.6 * mot) + ';' +
        'var lv=time<0.75?(time>0.3&&rn(ST,3)<0.55?1:0.08):lamp(T,SD,1.3);if(PO>0)lv*=(rn(ST,4)<0.5?0.15:1)*(1-cl(PO*2));\n';
    // glow (follows the bulb)
    var gs = u * 0.3, Gl = ahza_solid(ctx.comp, Lg, 'hz bulb glow', gs, gs);
    ahza_ellMask(Gl, gs / 2, gs / 2, gs * 0.14, gs * 0.14, [gs * 0.36, gs * 0.36]);
    jzSetExpr(jzXf(Gl, 'ADBE Position'), HD + 'var a=ang*Math.PI/180;[' + jzN(x) + '+Math.sin(a)*(LL+' + jzN(r * 0.9) + '),Math.cos(a)*(LL+' + jzN(r * 0.9) + ')]');
    jzSetExpr(jzXf(Gl, 'ADBE Opacity'), HD + 'LL<=1?0:30*lv');
    jzNoGhost(Gl);
    // cord + bulb: the layer hangs from (x, 0) and swings about it
    var k = ahza_kit(ctx, 'hz bare bulb'), BP = HD + '[' + jzN(x) + ',LL]';
    ahza_op(k, { name: 'cord', t: 'p', pts: [[0, -2 * px], [0, Lc]], stroke: col, sw: Math.max(1.2 * px, u * 0.0022), gpos: [x, 0], scaleX: HD + '[100,LL/' + jzN(Lc) + '*100]' });
    ahza_op(k, { name: 'socket', t: 'p', pts: [[0, -r * 1.5], [0, 0]], stroke: col, sw: r * 0.8, gpos: [x, Lc], posX: BP });
    ahza_op(k, { name: 'bulb', t: 'e', cx: 0, cy: r * 0.9, w: r * 2, h: r * 2, fill: Lg, stroke: col, sw: Math.max(px, u * 0.002), gpos: [x, Lc], posX: BP });
    ahza_op(k, { name: 'bulb off', t: 'e', cx: 0, cy: r * 0.9, w: r * 1.86, h: r * 1.86, fill: sc.bg, gpos: [x, Lc], posX: BP, opX: HD + 'lv<0.9?cl(1-lv)*85:0' });
    var S = ahza_pivot(ahza_done(k, HD + 'LL<=1?0:100'), x, 0);
    jzSetExpr(jzXf(S, 'ADBE Rotate Z'), HD + '-ang');
} });

/* hzDoorAjar — 開きかけの扉: a small door at the edge of the frame that opens by itself, a little, and is shut when the cut leaves */
jzReg('decor', 'hzDoorAjar', { back: false, build: function (ctx, bb0, d) {
    var bb = ahza_bb(ctx, bb0), W = ctx.W, H = ctx.H, sc = ctx.sc, s = d.seed | 0, u = jzU(ctx), px = ahza_px(ctx);
    var dw = u * (d.big ? 0.12 : 0.095), dh = dw * 2.15, right = !!d.right, gy = H - u * 0.05;
    function xOf(rt) { return rt ? W - u * 0.06 - dw : u * 0.06; }
    if (ahza_over(bb, xOf(right), gy - dh, xOf(right) + dw, gy, u * 0.03)) {
        right = !right;
        if (ahza_over(bb, xOf(right), gy - dh, xOf(right) + dw, gy, u * 0.03)) { var kk = jzClamp((gy - bb.y1 - u * 0.04) / dh, 0, 1); if (kk < 0.35) return; dw *= kk; dh *= kk; }
    }
    var x = xOf(right), y = gy - dh, col = ahza_dim(sc, 0.4), lw = Math.max(1.2 * px, u * 0.0024), Lg = ahza_glow(sc), HD = ahza_TH(ctx), E = 'var e=oc(time/0.5);';
    // it opens while nobody looks, in two goes, and slams on the way out
    var OP = 'var op=(0.07*oc((time-0.5)/0.5)+0.24*ios((time-' + jzN(1.5 + ahza_r(s, 1)) + ')/1.8))*(1-oe(PO*2.5)),lv=0.85+0.15*rn(ST,2),sw=' + jzN(dw) + '*op;';
    var hinge = right ? x + dw : x, dir = right ? -1 : 1, k = ahza_kit(ctx, 'hz door ajar');
    ahza_op(k, { name: 'frame', t: 'p', pts: [[x, gy], [x, y], [x + dw, y], [x + dw, gy]], stroke: col, sw: lw, trim: HD + E + '100*e', opX: HD + '100*K' });
    ahza_op(k, { name: 'floor', t: 'p', pts: [[x - dw * 0.5, gy], [x + dw * 1.5, gy]], stroke: col, sw: lw, opX: HD + E + '60*e*K' });
    ahza_op(k, { name: 'light', t: 'r', cx: dir * dw / 2, cy: 0, w: dw, h: dh - lw, fill: Lg, gpos: [hinge, y + lw + (dh - lw) / 2], scaleX: HD + OP + '[op*100,100]', opX: HD + OP + 'op<=0.003?0:85*lv' });
    ahza_op(k, { name: 'spill', t: 'p', closed: true, fill: Lg, pts: [[hinge, gy], [hinge + dir * dw * 0.2, gy], [hinge + dir * dw, gy + u * 0.045], [hinge + dir * dw * 0.2, gy + u * 0.045]],
        pathX: HD + OP + 'var h=' + jzN(hinge) + ',d=' + dir + ';createPath([[h,' + jzN(gy) + '],[h+d*sw,' + jzN(gy) + '],[h+d*(sw*2.4+' + jzN(dw * 0.5) + '),' + jzN(gy + u * 0.045) + '],[h+d*' + jzN(dw * 0.2) + ',' + jzN(gy + u * 0.045) + ']],[],[],true)',
        opX: HD + OP + 'op<=0.003?0:14*lv' });
    ahza_op(k, { name: 'knob', t: 'e', cx: 0, cy: 0, w: Math.max(1.5 * px, dw * 0.035) * 2, h: Math.max(1.5 * px, dw * 0.035) * 2, fill: col, gpos: [hinge + dir * dw * 0.1, y + dh * 0.55],
        posX: HD + OP + '[' + jzN(hinge) + '+' + dir + '*(sw+' + jzN(dw * 0.1) + '),' + jzN(y + dh * 0.55) + ']', opX: HD + OP + 'op<=0.003?0:100*K' });
    ahza_done(k, null);
} });

/* hzCobweb — 隅の蜘蛛の巣: a cobweb spun into a corner, thread by thread, with one line let down from it */
jzReg('decor', 'hzCobweb', { back: false, build: function (ctx, bb0, d) {
    var bb = ahza_bb(ctx, bb0), W = ctx.W, H = ctx.H, sc = ctx.sc, s = d.seed | 0, u = jzU(ctx), px = ahza_px(ctx), HD = ahza_TH(ctx), i, q;
    var right = !!d.right, low = bb.y0 < u * 0.2 && bb.y1 < H - u * 0.2, ox = right ? W : 0, oy = low ? H : 0, dx = right ? -1 : 1, dy = low ? -1 : 1;
    var R = Math.min(u * (d.big ? 0.36 : 0.27), Math.max(u * 0.1, ahza_dist(bb, ox, oy) - u * 0.03));
    var col = ahza_dim(sc, 0.42), lw = Math.max(px, u * 0.0016), nR = 6, ends = [], rad = [], k = ahza_kit(ctx, 'hz cobweb');
    for (i = 0; i < nR; i++) {
        var an = (i / (nR - 1)) * Math.PI / 2 + (i > 0 && i < nR - 1 ? ahza_rs(s, i, 1) * 0.07 : 0), len = R * (i === 0 || i === nR - 1 ? 1.12 : ahza_rr(0.8, 1.05, s, i, 2));
        ends.push([Math.cos(an) * dx, Math.sin(an) * dy, len]);
        rad.push({ t: 'p', pts: [[ox, oy], [ox + ends[i][0] * len, oy + ends[i][1] * len]] });
    }
    rad[0].name = 'radials'; rad[0].more = rad.slice(1); rad[0].stroke = col; rad[0].sw = lw; rad[0].trim = HD + '100*oc(time/0.6)'; ahza_op(k, rad[0]);
    for (q = 0; q < 5; q++) {
        var f = 0.24 + 0.17 * q, pts = [];
        for (i = 0; i < nR; i++) {
            var a = ends[i], r1 = Math.min(a[2], R * f * (1 + ahza_rs(s, q, i, 3) * 0.05));
            pts.push([ox + a[0] * r1, oy + a[1] * r1]);
            if (i < nR - 1) { var b = ends[i + 1], r2 = Math.min(b[2], R * f); pts.push([ox + (a[0] * r1 + b[0] * r2) / 2 * 0.9, oy + (a[1] * r1 + b[1] * r2) / 2 * 0.9]); }   // the thread sags towards the corner
        }
        ahza_op(k, { name: 'ring ' + q, t: 'p', pts: pts, stroke: col, sw: lw, sop: 85, trim: HD + '100*cl((time-' + jzN(0.4 + q * 0.22) + ')/0.5)' });
    }
    // one thread let down, with something small at the end of it
    if (!low) {
        var e2 = ends[2], hx = ox + e2[0] * e2[2] * 0.7, hy = oy + e2[1] * e2[2] * 0.7, tl = u * 0.16, TL = HD + 'var tl=' + jzN(tl) + '*ios((time-1.4)/2.6);';
        if (!ahza_over(bb, hx, hy, hx, hy + tl, u * 0.03)) {
            ahza_op(k, { name: 'thread', t: 'p', pts: [[hx, hy], [hx, hy + tl]], stroke: col, sw: lw, trim: HD + '100*ios((time-1.4)/2.6)' });
            ahza_op(k, { name: 'spider', t: 'e', cx: 0, cy: 0, w: u * 0.01, h: u * 0.01, fill: col, gpos: [hx, hy], posX: TL + '[' + jzN(hx) + ',' + jzN(hy) + '+tl]', opX: TL + 'tl>' + jzN(2 * px) + '?100:0' });
        }
    }
    ahza_done(k, HD + '100*K');
} });

/* hzFilmDirt — 古いフィルムの傷: hairline scratches that stay for a few frames, and dirt that jumps around the edges */
jzReg('decor', 'hzFilmDirt', { back: false, build: function (ctx, bb0, d) {
    var bb = ahza_bb(ctx, bb0), W = ctx.W, H = ctx.H, sc = ctx.sc, s = d.seed | 0, u = jzU(ctx), px = ahza_px(ctx), HD = ahza_TH(ctx), i, j;
    var col = sc.fg, lw = Math.max(px, u * 0.0014), pd = u * 0.02, k = ahza_kit(ctx, 'hz film dirt'), KK = 'var kk=oc(time/0.3)*K;';
    // scratches: each lives for 8 steps at a random place; over the words it keeps to the part above (or below) them
    for (i = 0; i < 2 + (d.n | 0); i++) {
        var SC = HD + 'var run=Math.floor((ST+' + (i * 5) + ')/8)+' + (i * 101) + ',x=' + jzN(W) + '*rn(run,2)+(rn(ST+' + (i * 7) + ',3)*2-1)*' + jzN(u * 0.003) + ',y0=' + jzN(H * 0.3) + '*rn(run,5),y1=' + jzN(H) + '*(0.7+0.3*rn(run,6));' +
            'if(x>' + jzN(bb.x0 - pd) + '&&x<' + jzN(bb.x1 + pd) + '){if(' + jzN(bb.y0 - pd) + '>y0+4)y1=Math.min(y1,' + jzN(bb.y0 - pd) + ');else y0=Math.max(y0,' + jzN(Math.min(H, bb.y1 + pd)) + ');}';
        ahza_op(k, { name: 'scratch ' + i, t: 'p', pts: [[0, 0], [0, H]], stroke: col, sw: lw, posX: SC + '[x,y0]', scaleX: SC + '[100,Math.max(0,y1-y0)/' + jzN(H) + '*100]',
            opX: HD + KK + 'var run=Math.floor((ST+' + (i * 5) + ')/8)+' + (i * 101) + ';rn(run,1)<0.35?0:30*kk*(0.5+0.5*rn(ST+' + (i * 7) + ',4))' });
    }
    // dirt: a few prepared scatterings (clear of the words) that swap at random 6 times a second
    var n = 6 + (d.n | 0) * 3, M = 5;
    for (j = 0; j < M; j++) {
        var dots = [], hairs = [];
        for (i = 0; i < n; i++) {
            var x = W * ahza_r(s, i, j, 7), y = H * ahza_r(s, i, j, 8); if (ahza_over(bb, x, y, x, y, u * 0.035)) continue;
            var r = u * ahza_rr(0.0015, 0.006, s, i, j, 9);
            if (i % 3 === 0) { var an = ahza_r(s, i, j, 10) * Math.PI * 2, l = r * 5; hairs.push({ t: 'p', pts: [[x, y], [x + Math.cos(an) * l, y + Math.sin(an) * l], [x + Math.cos(an + 0.7) * l * 1.6, y + Math.sin(an + 0.7) * l * 1.6]] }); }
            else dots.push({ t: 'e', cx: x, cy: y, w: r * 2, h: r * 2 });
        }
        var ON = HD + KK + 'Math.floor(rn(Math.floor(time*6),7)*' + M + ')==' + j + '?55*kk:0';
        if (dots.length) { dots[0].name = 'specks ' + j; dots[0].more = dots.slice(1); dots[0].fill = col; dots[0].opX = ON; ahza_op(k, dots[0]); }
        if (hairs.length) { hairs[0].name = 'hairs ' + j; hairs[0].more = hairs.slice(1); hairs[0].stroke = col; hairs[0].sw = lw; hairs[0].opX = ON; ahza_op(k, hairs[0]); }
    }
    ahza_done(k, null);
} });

/* ================================================================ BACKGROUNDS */
// seconds the background had been running at the cut start (browser bgT: consecutive cuts with the same bg + seed count as one run)
function ahza_run(b) {
    var c = b.cut, cs = (b.plan && b.plan.cuts) || [], s = c.start || 0, P0 = c.bgP || {}, idx = -1, i;
    for (i = 0; i < cs.length; i++) if (cs[i] === c) { idx = i; break; }
    for (i = idx - 1; i >= 0; i--) { var p = cs[i]; if (p.bg === c.bg && (p.bgP || {}).seed === P0.seed && Math.abs(p.end - s) < 0.06) s = p.start; else break; }
    return (c.start || 0) - s;
}
// bg expression header: T = song time (browser env.t), BT = time since the background started, FI = its fade-in, SD = seed
function ahza_bh(b, seed, fin) {
    return 'var SD=' + ((seed | 0) % 99991) + ';\n' + JZ_FNS + AHZA_F + 'var T=time+' + jzN(ahza_start(b.cut)) + ',BT=time+' + jzN(ahza_run(b)) + ',FI=oc(BT/' + jzN(fin || 0.6) + '),ST=Math.floor(T*24);\n';
}
function ahza_bkit(b, name) { return ahza_kit(b, name); }
function ahza_bdone(k, opEx) { var S = jzShapeLayer(k.ctx, k.name, 0, 0), i; for (i = k.ops.length - 1; i >= 0; i--) ahza_emit(S, k.ops[i], i); if (opEx) jzSetExpr(jzXf(S, 'ADBE Opacity'), opEx); return S; }
// dark corners (browser vign): nothing inside r0 x min(W, H), up to `a` at the corners
function ahza_vign(b, HB, a, r0) {
    var W = b.W, H = b.H, hyp = Math.sqrt(W * W + H * H), ri = Math.min(W, H) * (r0 == null ? 0.3 : r0), ro = hyp * 0.62;
    var V = ahza_solid(b.comp, ahza_night(b.sc), 'bg vignette', W, H);
    ahza_ellMask(V, W / 2, H / 2, (ri + ro) / 2, (ri + ro) / 2, [ro - ri, ro - ri], null, true);
    jzSetExpr(jzXf(V, 'ADBE Opacity'), HB + jzN(a * 100) + '*FI');
    return V;
}
// a bright scheme is dimmed a little so that light shows on it
function ahza_dimBg(b, HB) {
    if (ahza_isDark(b.sc.bg)) return;
    var D = ahza_solid(b.comp, jzMixHex(b.sc.bg, '#000000', 0.5), 'bg dim', b.W, b.H);
    jzSetExpr(jzXf(D, 'ADBE Opacity'), HB + '20*FI');
}
function ahza_blur(L, amt) { var e = jzEffect(L, 'ADBE Gaussian Blur 2', 'hz Soft'); jzEP(e, 1, amt); return e; }

/* hzFogBanks — 流れる霧: banks of fog sliding past each other at different heights and speeds */
jzReg('bg', 'hzFogBanks', {
    plan: function (rng, st) { return { seed: rng.int(1, 1e9), n: rng.int(4, 6), sp: rng.range(0.6, 1.3), a: rng.range(0.1, 0.15) }; },
    build: function (b, P) {
        var W = b.W, H = b.H, sc = b.sc, u = jzU(b), s = P.seed | 0, dark = ahza_isDark(sc.bg), HB = ahza_bh(b, s, 1), i, j;
        var fog = dark ? jzMixHex(sc.bg, sc.fg, 0.65) : jzMixHex(sc.bg, sc.fg, 0.6), a0 = (P.a || 0.12) * (dark ? 1 : 1.5), k = ahza_bkit(b, 'bg fog banks');
        for (i = 0; i < (P.n || 5); i++) for (j = 0; j < 2; j++) {
            var rx = W * ahza_rr(0.4, 0.75, s, i, j, 2), ry = u * ahza_rr(0.06, 0.15, s, i, 3), y = H * (0.1 + 0.85 * ahza_r(s, i, 1));
            var v = ahza_rr(0.01, 0.028, s, i, 4) * (i % 2 ? -1 : 1) * (P.sp || 1), span = W + rx * 2;
            ahza_op(k, { name: 'bank ' + i + '.' + j, t: 'e', cx: 0, cy: 0, w: rx * 1.3, h: ry * 1.3, fill: fog, gpos: [W / 2, y],
                posX: HB + '[wr(' + jzN(W * ahza_r(s, i, j, 5) * 2 + j * span / 2) + '+T*' + jzN(v * W) + ',' + jzN(span) + ')-' + jzN(rx) + ',' + jzN(y) + '+Math.sin(T*0.13+' + (i * 2) + ')*' + jzN(u * 0.02) + ']',
                opX: HB + jzN(Math.min(100, a0 * 100 * 1.5)) + '*(0.75+0.25*Math.sin(T*0.21+' + (i + j) + '))' });
        }
        var S = ahza_bdone(k, HB + '100*FI');
        ahza_blur(S, u * 0.07);
        var G = ahza_solid(b.comp, fog, 'bg ground fog', W, H);
        ahza_mask(G, ahza_rectPts(-W, H * 0.82, W * 2, H * 2), [0, H * 0.4]);
        jzSetExpr(jzXf(G, 'ADBE Opacity'), HB + jzN(Math.min(100, a0 * 90)) + '*FI');
        ahza_vign(b, HB, 0.4);
    }
});

/* hzSwingLight — 揺れる灯り: one hanging light swinging slowly; its cone sweeps the room and the dark follows it */
jzReg('bg', 'hzSwingLight', {
    plan: function (rng, st) { return { seed: rng.int(1, 1e9), x: rng.range(0.38, 0.62), amp: rng.range(11, 18), w: rng.range(0.55, 0.85), half: rng.range(13, 18) }; },
    build: function (b, P) {
        var W = b.W, H = b.H, sc = b.sc, u = jzU(b), s = P.seed | 0, dark = ahza_isDark(sc.bg), mot = b.fx && b.fx.motion != null ? b.fx.motion : 0.7;
        var px = W * (P.x || 0.5), py = -u * 0.04, Ll = Math.sqrt(W * W + H * H) * 1.1, hw = Math.tan((P.half || 15) * Math.PI / 180) * Ll;
        var HB = ahza_bh(b, s, 0.8) + 'var th=' + jzN(P.amp || 14) + '*Math.sin(T*' + jzN(P.w || 0.7) + '+' + jzN(ahza_r(s, 1) * 6) + ')*' + jzN(0.35 + 0.65 * mot) + ',lv=lamp(T,SD,0.5)*FI;\n';
        var Lc = ahza_glow(sc), dk = dark ? ahza_night(sc) : jzMixHex(sc.bg, '#000000', 0.55);
        var cone = [[px - u * 0.02, py], [px + u * 0.02, py], [px + hw, py + Ll], [px - hw, py + Ll]], k = ahza_bkit(b, 'bg swing light');
        ahza_op(k, { name: 'dark', t: 'r', cx: px, cy: py + Ll * 0.5, w: Ll * 4, h: Ll * 3, more: [{ t: 'p', pts: cone, closed: true }], fill: dk, eo: true, opX: HB + (dark ? 50 : 20) + '*FI' });
        ahza_op(k, { name: 'cone', t: 'p', pts: cone, closed: true, fill: Lc, opX: HB + '7*lv' });
        // cord and shade
        ahza_op(k, { name: 'shade', t: 'p', closed: true, pts: [[px - u * 0.012, py + u * 0.075], [px + u * 0.012, py + u * 0.075], [px + u * 0.04, py + u * 0.105], [px - u * 0.04, py + u * 0.105]],
            more: [{ t: 'r', cx: px, cy: py + u * 0.0375, w: u * 0.003, h: u * 0.075 }], fill: ahza_dim(sc, 0.4), opX: HB + '100*FI' });
        var S = ahza_pivot(ahza_bdone(k, null), px, py);
        jzSetExpr(jzXf(S, 'ADBE Rotate Z'), HB + '-th');
        // soft light under the shade and on the floor (they follow the swing)
        var hs = u * 0.7, Hd = ahza_solid(b.comp, Lc, 'bg swing glow', hs, hs);
        ahza_ellMask(Hd, hs / 2, hs / 2, hs * 0.12, hs * 0.12, [hs * 0.4, hs * 0.4]);
        jzSetExpr(jzXf(Hd, 'ADBE Position'), HB + 'var a=th*Math.PI/180;[' + jzN(px) + '+Math.sin(a)*' + jzN(u * 0.2) + ',' + jzN(py) + '+Math.cos(a)*' + jzN(u * 0.2) + ']');
        jzSetExpr(jzXf(Hd, 'ADBE Opacity'), HB + '17*lv');
        var fw = u * 1.1, fh = u * 0.18, Fl = ahza_solid(b.comp, Lc, 'bg swing floor', fw, fh);
        ahza_ellMask(Fl, fw / 2, fh / 2, fw * 0.2, fh * 0.2, [fw * 0.5, fh * 0.5]);
        jzSetExpr(jzXf(Fl, 'ADBE Position'), HB + '[' + jzN(px) + '+Math.tan(th*Math.PI/180)*' + jzN(H * 0.94 - py) + ',' + jzN(H * 0.94) + ']');
        jzSetExpr(jzXf(Fl, 'ADBE Opacity'), HB + '14*lv');
    }
});

/* hzFarWindows — 消える窓明かり: a row of houses far away; their windows go dark one after another until a single one is left, and then that one too */
jzReg('bg', 'hzFarWindows', {
    plan: function (rng, st) { return { seed: rng.int(1, 1e9), n: rng.int(6, 9), per: rng.range(20, 28), keep: rng.int(0, 8) }; },
    build: function (b, P) {
        var W = b.W, H = b.H, sc = b.sc, u = jzU(b), s = P.seed | 0, dark = ahza_isDark(sc.bg), per = P.per || 24, n = P.n || 7, keep = (P.keep | 0) % n, i, j;
        var hc = dark ? jzMixHex(sc.bg, sc.fg, 0.075) : jzMixHex(sc.bg, '#000000', 0.16), wc = dark ? jzMixHex(sc.fg, sc.accent, 0.2) : jzMixHex(sc.bg, '#FFFFFF', 0.7);
        var HB = ahza_bh(b, s, 0.8) + 'var PER=' + jzN(per) + ',cyc=wr(BT,PER);\n';
        var G = ahza_solid(b.comp, hc, 'bg dusk', W, H);
        ahza_mask(G, ahza_rectPts(-W, H * 0.8, W * 2, H * 2), [0, H * 0.45]);
        jzSetExpr(jzXf(G, 'ADBE Opacity'), HB + '50*FI');
        var k = ahza_bkit(b, 'bg far houses'), houses = [], wins = [];
        for (i = 0; i < n; i++) {
            var w = (W / n) * ahza_rr(0.72, 1.02, s, i, 1), x = W * (i / n) + ahza_rs(s, i, 2) * W * 0.012, h = u * ahza_rr(0.11, 0.27, s, i, 3), y = H - h;
            houses.push({ t: 'r', cx: x + w / 2, cy: y + (h + 2) / 2, w: w, h: h + 2 });
            if (ahza_r(s, i, 4) < 0.6) houses.push({ t: 'p', closed: true, pts: [[x - w * 0.04, y + 1], [x + w / 2, y - h * ahza_rr(0.18, 0.34, s, i, 5)], [x + w * 1.04, y + 1]] });
            var nw = 1 + (ahza_h(s, i, 6) % 3), ww = Math.min(w * 0.14, u * 0.022), wh = ww * 1.3;
            for (j = 0; j < nw; j++) {
                var last = i === keep && j === 0, off = last ? per * 0.9 : per * (0.1 + 0.68 * ahza_r(s, i, j, 7));
                wins.push({ name: 'window ' + i + '.' + j, t: 'r', cx: x + w * (0.18 + 0.64 * (nw === 1 ? 0.5 : j / (nw - 1))), cy: y + h * ahza_rr(0.22, 0.55, s, i, j, 11) + wh / 2, w: ww, h: wh, fill: wc,
                    opX: HB + 'var a=cl((cyc-' + jzN(ahza_r(s, i, j, 8) * 0.8) + ')/0.4),off=' + jzN(off) + ';if(cyc>off)a=0;else if(cyc>off-0.4&&rn(ST+' + (i * 37 + j * 11) + ',9)<0.5)a*=0.25;' +
                        (last ? 'if(cyc>PER*0.74&&rn(Math.floor(ST/2),10)<0.3)a*=0.3;' : '') + '62*a' });       // the last one hesitates
            }
        }
        houses[0].name = 'houses'; houses[0].more = houses.slice(1); houses[0].fill = hc; ahza_op(k, houses[0]);
        for (i = 0; i < wins.length; i++) ahza_op(k, wins[i]);
        var S = ahza_bdone(k, HB + '100*FI');
        jzSetExpr(jzXf(S, 'ADBE Position'), HB + '[value[0],value[1]+(1-FI)*' + jzN(u * 0.2) + ']');
        ahza_vign(b, HB, 0.3, 0.36);
    }
});

/* hzHeadlights — 通り過ぎる光: car lights from the street; a window-shaped patch of light slides across the wall, stretches and is gone */
jzReg('bg', 'hzHeadlights', {
    plan: function (rng, st) { return { seed: rng.int(1, 1e9), per: rng.range(6.5, 9.5), y: rng.range(0.34, 0.5), dir: rng.pick([-1, 1]), a: rng.range(0.1, 0.15), cols: rng.int(2, 3) }; },
    build: function (b, P) {
        var W = b.W, H = b.H, sc = b.sc, u = jzU(b), dark = ahza_isDark(sc.bg), per = P.per || 8, dir = P.dir || 1, cols = P.cols || 2, yc = H * (P.y || 0.42), q, cI, rI;
        var HB = ahza_bh(b, P.seed | 0, 0.6), Lc = ahza_glow(sc), wv = u * 0.46, hv = u * 0.4, gp = u * 0.014, k = ahza_bkit(b, 'bg headlights');
        ahza_dimBg(b, HB);
        for (q = 0; q < 2; q++) {
            var panes = [];
            for (cI = 0; cI < cols; cI++) for (rI = 0; rI < 2; rI++) panes.push({ t: 'r', cx: -wv / 2 + (wv / cols) * (cI + 0.5), cy: -hv / 2 + (hv / 2) * (rI + 0.5), w: wv / cols - gp, h: hv / 2 - gp });
            var PP = HB + 'var p=(wr(BT+0.3,' + jzN(per) + ')-' + jzN(q * 0.42) + ')/3.3,on=p>0&&p<1,pe=' + (dir > 0 ? 'cl(p)' : '1-cl(p)') + ',sn=Math.sin(Math.PI*cl(p));';
            panes[0].name = q ? 'echo' : 'patch'; panes[0].more = panes.slice(1); panes[0].fill = Lc; panes[0].gpos = [-u, yc];
            panes[0].posX = PP + '[' + jzN(-u * 0.55) + '+' + jzN(W + u * 1.1) + '*pe,' + jzN(yc) + ']';
            panes[0].scaleX = PP + '[(0.8+0.45*sn)*100,100]';
            panes[0].opX = PP + 'on?Math.min(50,Math.pow(sn,0.7)*' + jzN((P.a || 0.12) * (q ? 0.45 : 1) * (dark ? 1 : 2.3) * 100) + '*FI):0';
            ahza_op(k, panes[0]);
        }
        // the patch leans as it passes (group skew, written after the kit is built: -0.85 .. 0.85 shear)
        var S = ahza_bdone(k, null), root = S.property('ADBE Root Vectors Group');
        for (q = 1; q <= 2; q++) {
            var qq = 2 - q;
            ahza_ex(root.property(q).property('ADBE Vector Transform Group').property('ADBE Vector Skew'),
                HB + 'var p=(wr(BT+0.3,' + jzN(per) + ')-' + jzN(qq * 0.42) + ')/3.3,pe=' + (dir > 0 ? 'cl(p)' : '1-cl(p)') + ';-Math.atan(-0.85+1.7*pe)*180/Math.PI');
        }
        ahza_vign(b, HB, 0.42);
    }
});

/* hzHallLights — 消えていく照明: a corridor of ceiling lights; they die one by one from the far end towards you, the dark holds, then they all come back */
jzReg('bg', 'hzHallLights', {
    plan: function (rng, st) { return { seed: rng.int(1, 1e9), vx: rng.range(0.42, 0.58), n: rng.int(7, 9), per: rng.range(12, 16) }; },
    build: function (b, P) {
        var W = b.W, H = b.H, sc = b.sc, u = jzU(b), dark = ahza_isDark(sc.bg), per = P.per || 14, n = P.n || 8, vx = W * (P.vx || 0.5), vy = H * 0.47, i, kI;
        var Lc = ahza_glow(sc), col = ahza_dim(sc, 0.2), HB = ahza_bh(b, P.seed | 0, 0.7) + 'var PER=' + jzN(per) + ',cyc=wr(BT,PER);\n';
        function sK(q) { return 1 / (1 + q * 0.62); }
        ahza_dimBg(b, HB);
        var far = sK(n), cor = [[0, 0], [W, 0], [W, H], [0, H]], lines = [], k = ahza_bkit(b, 'bg hall'), kg = ahza_bkit(b, 'bg hall glow'), dtt = per * 0.55 / n;
        for (i = 0; i < 4; i++) lines.push({ t: 'p', pts: [cor[i], [vx + (cor[i][0] - vx) * far, vy + (cor[i][1] - vy) * far]] });
        lines.push({ t: 'r', cx: vx - vx * far + W * far / 2, cy: vy - vy * far + H * far / 2, w: W * far, h: H * far });
        lines[0].name = 'corridor'; lines[0].more = lines.slice(1); lines[0].stroke = col; lines[0].sw = Math.max(1.2, u * 0.0024); lines[0].sop = 80; ahza_op(k, lines[0]);
        for (kI = n - 1; kI >= 0; kI--) {
            var z = sK(kI), y = vy - (vy - H * 0.035) * z, fy = vy + (H * 0.985 - vy) * z, hw = W * 0.15 * z, hh = Math.max(1.5, u * 0.014 * z), off = per * 0.14 + (n - 1 - kI) * dtt;
            var ON = HB + 'var on=1,off=' + jzN(off) + ';if(cyc>PER*0.9)on=rn(ST+' + (kI * 41) + ',1)<0.25+0.75*(cyc-PER*0.9)/(PER*0.1)?1:0.1;else if(cyc>off)on=0;else if(cyc>off-0.45)on=rn(ST+' + (kI * 41) + ',2)<0.5?1:0.15;' +
                'var za=' + jzN(Math.pow(z, 0.35) * (dark ? 1 : 1.7)) + '*on;';
            ahza_op(k, { name: 'panel ' + kI, t: 'r', cx: vx, cy: y, w: hw * 2, h: hh * 2, stroke: col, sw: Math.max(1, u * 0.002 * Math.sqrt(z)) });
            ahza_op(k, { name: 'lit ' + kI, t: 'r', cx: vx, cy: y, w: hw * 2, h: hh * 2, fill: Lc, opX: ON + 'Math.min(100,50*za)' });
            ahza_op(kg, { name: 'glow ' + kI, t: 'e', cx: vx, cy: y + hh, w: hw * 2.6, h: hw * 1.3, fill: Lc, opX: ON + 'Math.min(100,13*za)' });
            ahza_op(kg, { name: 'floor ' + kI, t: 'e', cx: vx, cy: fy, w: hw * 2.6, h: hw * 0.58, fill: Lc, opX: ON + 'Math.min(100,7.5*za)' });
        }
        ahza_blur(ahza_bdone(kg, HB + '100*FI'), u * 0.03);
        ahza_bdone(k, HB + '100*FI');
        ahza_vign(b, HB, 0.5, 0.25);
    }
});

/* hzWires — たるんだ電線: sagging wires between two poles at dusk, and the small dark shapes sitting on them leave one at a time */
jzReg('bg', 'hzWires', {
    plan: function (rng, st) { return { seed: rng.int(1, 1e9), n: rng.int(3, 4), birds: rng.int(5, 8), per: rng.range(20, 28), x1: rng.range(0.1, 0.2), x2: rng.range(0.74, 0.86), y: rng.range(0.16, 0.26) }; },
    build: function (b, P) {
        var W = b.W, H = b.H, sc = b.sc, u = jzU(b), s = P.seed | 0, dark = ahza_isDark(sc.bg), per = P.per || 24, n = P.n || 3, kI, bI, q23 = 2 / 3;
        var col = dark ? jzMixHex(sc.bg, sc.fg, 0.2) : jzMixHex(sc.bg, '#000000', 0.3), lw = Math.max(1.2, u * 0.0022), HB = ahza_bh(b, s, 0.8) + 'var PER=' + jzN(per) + ',cyc=wr(BT,PER);\n';
        var G = ahza_solid(b.comp, sc.accent, 'bg dusk glow', W, H);
        ahza_mask(G, ahza_rectPts(-W, H * 0.78, W * 2, H * 2), [0, H * 0.5]);
        jzSetExpr(jzXf(G, 'ADBE Opacity'), HB + '7*FI');
        var xa = W * (P.x1 || 0.15), xb = W * (P.x2 || 0.8), ya = H * (P.y || 0.2), yb = ya + H * 0.05, gapW = u * 0.034, k = ahza_bkit(b, 'bg wires'), poles = [[xa, ya, 1], [xb, yb, 0.82]], wires = [], paths = [];
        for (kI = 0; kI < 2; kI++) {
            var X = poles[kI][0], Y = poles[kI][1], kk = poles[kI][2];
            ahza_op(k, { name: 'pole ' + kI, t: 'p', pts: [[X, H + 4], [X, Y - u * 0.04 * kk]], stroke: col, sw: u * 0.009 * kk, cap: 2 });
            ahza_op(k, { name: 'arms ' + kI, t: 'p', pts: [[X - u * 0.07 * kk, Y], [X + u * 0.07 * kk, Y]], more: [{ t: 'p', pts: [[X - u * 0.05 * kk, Y + gapW * 1.6 * kk], [X + u * 0.05 * kk, Y + gapW * 1.6 * kk]] }], stroke: col, sw: u * 0.005 * kk, cap: 2 });
        }
        function tg(c, p) { return [(c[0] - p[0]) * q23, (c[1] - p[1]) * q23]; }
        for (kI = 0; kI < n; kI++) {
            var ox = (kI - (n - 1) / 2) * gapW * 1.3, oy = (kI % 2) * gapW * 1.6, sag = u * (0.07 + 0.025 * kI);
            var p0 = [xa + ox, ya + oy], p1 = [xb + ox * 0.82, yb + oy * 0.82], cM = [(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2 + sag * 2];
            var pL = [-W * 0.25, p0[1] - H * 0.02], cL = [(p0[0] - W * 0.25) / 2, p0[1] + sag * 1.2], pR = [W * 1.3, p1[1] + H * 0.03], cR = [(p1[0] + W * 1.3) / 2, p1[1] + sag * 1.4];
            wires.push([p0, cM, p1]);
            paths.push({ t: 'p', pts: [pL, p0, p1, pR], inT: [[0, 0], tg(cL, p0), tg(cM, p1), tg(cR, pR)], outT: [tg(cL, pL), tg(cM, p0), tg(cR, p1), [0, 0]] });
        }
        paths[0].name = 'wires'; paths[0].more = paths.slice(1); paths[0].stroke = col; paths[0].sw = lw; paths[0].cap = 2; ahza_op(k, paths[0]);
        // the shapes on the wire: fewer every time you look
        var nb = P.birds || 6, r = u * 0.009;
        for (bI = 0; bI < nb; bI++) {
            var last = bI === 0, off = last ? per * 0.92 : per * (0.12 + 0.66 * ahza_r(s, bI, 1));
            var w = wires[ahza_h(s, bI, 3) % Math.min(2, wires.length)], f = last ? 0.5 + ahza_rs(s, 9) * 0.1 : 0.12 + 0.76 * ahza_r(s, bI, 4), q = 1 - f;
            var x = q * q * w[0][0] + 2 * q * f * w[1][0] + f * f * w[2][0], y = q * q * w[0][1] + 2 * q * f * w[1][1] + f * f * w[2][1];
            ahza_op(k, { name: 'bird ' + bI, t: 'e', cx: x, cy: y - r * 1.05, w: r * 1.5, h: r * 2.3, more: [{ t: 'e', cx: x + (bI % 2 ? 1 : -1) * r * 0.3, cy: y - r * 2.3, w: r, h: r }], fill: col,
                opX: HB + 'cyc>' + jzN(off) + '?0:100*cl((cyc-' + jzN(ahza_r(s, bI, 2) * 0.6) + ')/0.3)' });
        }
        var S = ahza_bdone(k, HB + '100*FI');
        // the whole span breathes a little (the browser lets each wire's sag move)
        jzSetExpr(jzXf(S, 'ADBE Position'), HB + '[value[0]+Math.sin(T*0.37)*' + jzN(u * 0.003) + ',value[1]+Math.sin(T*0.5)*' + jzN(u * 0.004) + ']');
        ahza_vign(b, HB, 0.3, 0.38);
    }
});
