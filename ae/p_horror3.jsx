// ================================================================ pack horror part 3 (AE port of the horror set: enter / exit / hold / treat)
// Per-glyph work = text animators with Expression Selectors. Per-glyph numbers the browser derives from the whole lyric
// (glyph index in the lyric, irregular arrival times …) are precomputed here and embedded as arrays indexed by textIndex.

/* ---------------------------------------------------------------- helpers (ahr3_) */
function ahr3_text(L) { try { return String(L.property('ADBE Text Properties').property('ADBE Text Document').value.text); } catch (e) { return ''; } }
function ahr3_N(m) { return Math.max(1, jzCount(String(m.c.text || ''))); }
function ahr3_cs(m) { return m.c.seed | 0; }
// per glyph of this layer (textIndex order): its index in the whole lyric (-1 for spaces); one-glyph layers use their motion index
function ahr3_idx(m) {
    var g = jzGlyphs(ahr3_text(m.L)), N = ahr3_N(m), out = [], k = 0, i, ns = jzCount(ahr3_text(m.L));
    var mi = Math.round(+(m.o && m.o.mi) || 0);
    for (i = 0; i < g.length; i++) {
        if (g[i] === ' ' || g[i] === '　') { out.push(-1); continue; }
        out.push(ns === 1 && N > 1 ? Math.min(N - 1, mi) : k); k++;
    }
    return out;
}
// position 0..1 of each glyph along the lyric (browser orderOf)
function ahr3_ord(m) {
    var g = jzGlyphs(ahr3_text(m.L)), N = ahr3_N(m), n = g.length, out = [], i, mi = +(m.o && m.o.mi) || 0;
    for (i = 0; i < n; i++) out.push(n > 1 ? i / (n - 1) : (N > 1 ? jzClamp(mi / (N - 1), 0, 1) : 0));
    return out;
}
function ahr3_motionK(m) { return jzClamp((m.ctx.fx.motion == null ? 0.7 : m.ctx.fx.motion) / 0.7, 0, 1.6); }
// comp position of a point given in a layer's own (layer-space) coordinates, through its parents (static values)
function ahr3_toComp(L, p) {
    var x = p[0], y = p[1], P = L, g = 0;
    while (P && g++ < 20) {
        var a = jzXf(P, 'ADBE Anchor Point').value, ps = jzXf(P, 'ADBE Position').value, s = jzXf(P, 'ADBE Scale').value, r = jzXf(P, 'ADBE Rotate Z').value * Math.PI / 180;
        var dx = (x - a[0]) * s[0] / 100, dy = (y - a[1]) * s[1] / 100;
        x = ps[0] + dx * Math.cos(r) - dy * Math.sin(r); y = ps[1] + dx * Math.sin(r) + dy * Math.cos(r);
        P = P.parent;
    }
    return [x, y];
}
// a helper shape layer that rides on the lyric layer L (parented; sits just above it unless L uses a track matte)
function ahr3_rider(m, L, name) {
    var S = jzShapeLayer(m.ctx || m, name, 0, 0);
    try { if (!L.trackMatteType || L.trackMatteType === TrackMatteType.NO_TRACK_MATTE) S.moveBefore(L); } catch (e) {}
    return S;
}
function ahr3_attach(S, L) { S.parent = L; return S; }

/* ================================================================ ENTRANCES */

/* hrBlinkCreep — 瞬きの間に: every blink, the glyphs are closer */
jzReg('enter', 'hrBlinkCreep', { apply: function (m) {
    var L = m.L, S = m.size, D = S * 2;
    m.parts.op.push('if((P>=0.26&&P<0.31)||(P>=0.52&&P<0.57)||(P>=0.78&&P<0.83))f=0;');
    var q = m.HD + 'var st=(P>=0.31?1:0)+(P>=0.57?1:0)+(P>=0.83?1:0),r=1-st/3;' + m.seedR + 'var an=random(0,Math.PI*2),ds=random(0.9,2),rt=random(-1,1);';
    jzAnimator(L, 'hr In Creep', [['ADBE Text Position 3D', [D, D, 0]]], q + '[Math.cos(an)*ds*' + jzN(S) + '*r/' + jzN(D) + '*100,Math.sin(an)*ds*' + jzN(S) + '*r*0.6/' + jzN(D) + '*100,0]');
    jzAnimator(L, 'hr In Creep Tilt', [['ADBE Text Rotation', 25]], q + 'rt*r*100');
    jzAnimator(L, 'hr In Creep Size', [['ADBE Text Scale 3D', [55, 55, 100]], ['ADBE Text Opacity', 30]], q + 'r*100');
} });

/* hrJumpScare — 飛び出し: faint and tiny, then it snaps at you and settles */
jzReg('enter', 'hrJumpScare', { apply: function (m) {
    var rnd = 'seedRandom(SD+Math.floor(time*24)*3,true);var j1=random(-1,1),j2=random(-1,1),j3=random(-1,1),j4=random();';
    m.parts.sc.push('var k0=P<0.62?0.42+0.08*P/0.62:(1+0.95*(1-oe((P-0.62)/0.38)));f=[f[0]*k0,f[1]*k0];');
    m.parts.op.push('if(P<0.62){' + rnd + 'f*=(0.1+0.12*P/0.62)*(j4<0.15?0.3:1);}');
    m.parts.pos.push(rnd + 'var kj=P<0.62?0.02*0.45:0.12*(1-oe((P-0.62)/0.38))*1.9;d=[d[0]+j1*SZ*kj,d[1]+j2*SZ*kj];');
    m.parts.rot.push(rnd + 'r+=P<0.62?0:j3*7*(1-oe((P-0.62)/0.38));');
} });

/* hrUneasy — 間の悪い出現: glyphs arrive one by one after irregular, too-long pauses, each with a twitch */
jzReg('enter', 'hrUneasy', { selfHide: true, apply: function (m) {
    var L = m.L, S = m.size, cs = ahr3_cs(m), N = ahr3_N(m), idx = ahr3_idx(m), gaps = [], tot = 0, k, i;
    for (k = 0; k < N; k++) { var r = ahr_r(cs, k, 901), g = 0.25 + (r < 0.25 ? 2.2 : r * 1.1); gaps.push(g); tot += g; }
    var times = [], acc = 0; for (k = 0; k < N; k++) { times.push(acc / tot * 0.86); acc += gaps[k]; }
    var T0 = [], RX = [], RY = [], RR = [];
    for (i = 0; i < idx.length; i++) {
        var ix = idx[i] < 0 ? (i ? idx[i - 1] : 0) : idx[i]; ix = Math.max(0, Math.min(N - 1, ix));
        var h = ahr_h(cs, ix, 21);
        T0.push(times[ix] || 0); RX.push(ahr_rs(h, 1)); RY.push(ahr_rs(h, 2)); RR.push(ahr_rs(h, 3));
    }
    var q = m.HD + 'var T=' + ahr_arr(T0) + ',j=textIndex-1,q=(P-(T[j]||0))/0.1;';
    jzAnimator(L, 'hr In Wait', [['ADBE Text Opacity', 0]], q + '(q<0||time<DL)?100:0');
    jzAnimator(L, 'hr In Twitch', [['ADBE Text Position 3D', [S * 0.18, S * 0.1, 0]]], q + 'var RX=' + ahr_arr(RX) + ',RY=' + ahr_arr(RY) + ',a=(q>=0&&q<1)?(1-q)*100:0;[RX[j]*a,RY[j]*a,0]');
    jzAnimator(L, 'hr In Twitch Tilt', [['ADBE Text Rotation', 18]], q + 'var RR=' + ahr_arr(RR) + ';(q>=0&&q<1)?RR[j]*(1-q)*100:0');
    jzAnimator(L, 'hr In Red', [['ADBE Text Fill Color', jzHex(m.ctx.sc.accent)]], q + '(q>=0&&q<0.5)?100:0');
} });

/* hrVhold — 垂直同期: the line rolls through its own block like a TV losing sync, then locks */
jzReg('enter', 'hrVhold', { apply: function (m) {
    var L = m.L, S = m.size, r = jzRect(L), pad = S * 0.25, HH = r.height + pad * 2, sl = ahr_slots(L), Y = [], i;
    var ap = jzXf(L, 'ADBE Position').value, sy = jzXf(L, 'ADBE Scale').value[1] / 100 || 1;
    var top = ap[1] - (r.height / 2 + pad) * sy;
    for (i = 0; i < sl.length; i++) Y.push((sl[i].y - top) / sy);
    var hs = 'var HH=' + jzN(HH) + ',e=oc(P),mm=(((1-e)*2.6*HH)%HH+HH)%HH;';
    jzAnimator(L, 'hr In Roll', [['ADBE Text Position 3D', [0, HH, 0]]], m.HD + hs + 'var Y=' + ahr_arr(Y) + ',y=Y[textIndex-1]||0;[0,(((y+mm)%HH)-y)/HH*100,0]');
    m.parts.pos.push('posterizeTime(24);seedRandom(SD+Math.floor(time*24),true);d=[d[0]+random(-1,1)*SZ*0.05*(1-oc(P)),d[1]];');
    m.parts.op.push('f*=Math.min(1,0.4+P*2);');
} });

/* hrMirrorSnap — 鏡文字: it appears reversed, shudders, and snaps the right way round */
jzReg('enter', 'hrMirrorSnap', { apply: function (m) {
    m.parts.sc.push('var ms=-1;if(P>=0.55&&P<0.72){seedRandom(SD+Math.floor(time*24)*7,true);ms=random()<0.5?-1:0.25;}else if(P>=0.72)ms=-0.2+1.2*ob((P-0.72)/0.28,2.2);if(P>=1)ms=1;if(Math.abs(ms)<0.04)ms=0.04;f=[f[0]*ms,f[1]];');
    m.parts.op.push('f*=Math.min(1,P/0.18);');
    m.parts.rot.push('if(P<0.55)r+=Math.sin(P*30)*1.5;');
} });

/* hrManifest — 浮かび上がる: each glyph wavers in and out on its own breath, and finally holds */
jzReg('enter', 'hrManifest', { selfHide: true, apply: function (m) {
    var L = m.L, S = m.size;
    var q = m.HD + m.seedR + 'var ph=random(0,Math.PI*2),fq=7+random(0,6),fin=P<=0.72?0:(P>=1?1:((P-0.72)/0.28)*((P-0.72)/0.28)*(3-2*(P-0.72)/0.28));' +
        'var wv=cl(P*1.3)*(0.45+0.55*Math.max(0,Math.sin(P*fq+ph)));var a=time<DL?0:wv+(1-wv)*fin;';
    jzAnimator(L, 'hr In Breath', [['ADBE Text Opacity', 0]], q + '(1-a)*100');
    jzAnimator(L, 'hr In Waver', [['ADBE Text Position 3D', [S * 0.12, S * 0.08, 0]]], q + '[Math.sin(P*4*3.1+ph)*(1-fin)*100,Math.sin(P*3*2.7+ph*1.3)*(1-fin)*100,0]');
} });

/* hrClawReveal — 爪痕から: four slanted tears open across the line and widen until it is all there
   (an alpha matte of tilted bands riding on the text; layer masks when the text already has a matte) */
jzReg('enter', 'hrClawReveal', { apply: function (m) {
    var L = m.L, S = m.size, r = jzRect(L), pad = S * 0.3, seed = (m.c.seed | 0) + ((m.o && m.o.mi) || 0);
    var x0 = r.left - pad, x1 = r.left + r.width + pad, y0 = r.top - pad, y1 = r.top + r.height + pad, Wd = x1 - x0, Hh = y1 - y0;
    var n = 4, sp = Wd / n, slope = Math.min(0.55 * Hh, sp * 1.4), dir = (ahr_h(seed, 3) & 1) ? 1 : -1, k;
    var ang = Math.atan2(slope, Hh) * 180 / Math.PI * -dir, rcx = (x0 + x1) / 2, rcy = (y0 + y1) / 2;
    function wx(kk, edge) {
        return m.HD + AHR_FNS + 'var q=cl((P-' + jzN(kk * 0.08) + ')/0.7)' + (edge ? '*sm(0.5,0.9,P)' : '') + ';var e=ioc(q);var w=' +
            '(P>0.97||time>DL+IN+0.05)?' + jzN(Wd * 3) + ':(q<=0?0:' + jzN(sp * 0.08) + '+' + jzN(sp * 1.1) + '*e*e);';
    }
    var hasMatte = false; try { hasMatte = L.trackMatteType && L.trackMatteType !== TrackMatteType.NO_TRACK_MATTE; } catch (e0) {}
    if (!hasMatte) {
        var M = jzShapeLayer(m.ctx, 'hr claw matte', 0, 0);
        for (k = -2; k < n + 2; k++) {
            var kk = Math.max(0, Math.min(n - 1, k)), g = jzGrp(M, 'tear ' + k);
            var rc = jzAddRect(g, sp * 0.08, Hh * 1.5, 0);
            rc.property('ADBE Vector Rect Size').expression = wx(kk, k < 0 || k >= n) + '[w,' + jzN(Hh * 1.5) + ']';
            jzAddFill(g, '#FFFFFF');
            jzGX(g).property('ADBE Vector Position').setValue([x0 + (k + 0.5) * sp - rcx, 0]);
            jzGX(g).property('ADBE Vector Rotation').setValue(ang);
        }
        jzXf(M, 'ADBE Position').setValue(ahr3_toComp(L, [rcx, rcy]));
        M.moveBefore(L);
        M.parent = L;
        L.trackMatteType = TrackMatteType.ALPHA;
        jzNoGhost(M);
        return;
    }
    for (k = -2; k < n + 2; k++) {
        var cx = x0 + (k + 0.5) * sp, a = -slope / 2 * dir, b = slope / 2 * dir, w0 = sp * 0.5;
        var mk = L.property('ADBE Mask Parade').addProperty('ADBE Mask Atom'), sh = new Shape();
        sh.vertices = [[cx - w0 / 2 + a, y0], [cx + w0 / 2 + a, y0], [cx + w0 / 2 + b, y1], [cx - w0 / 2 + b, y1]]; sh.closed = true;
        mk.property('ADBE Mask Shape').setValue(sh);
        mk.property('ADBE Mask Offset').expression = wx(Math.max(0, Math.min(n - 1, k)), k < 0 || k >= n) + 'w>' + jzN(Wd * 2) + '?1e4:(w<=0?' + jzN(-w0) + ':(w-' + jzN(w0) + ')/2)';
    }
} });

/* ================================================================ EXITS */

/* hrPulledDown — 引きずり込み: yanked down one by one; the last one clings and trembles first */
jzReg('exit', 'hrPulledDown', { apply: function (m) {
    var L = m.L, S = m.size, cs = ahr3_cs(m), N = ahr3_N(m), idx = ahr3_idx(m), last = ahr_h(cs, 41) % N, T0 = [], LA = [], RR = [], i;
    for (i = 0; i < idx.length; i++) { var ix = Math.max(0, idx[i]); T0.push(ix === last ? 0.7 : ahr_r(cs, ix, 42) * 0.5); LA.push(ix === last ? 1.6 : 0.6); RR.push(ahr_rs(cs, ix, 46)); }
    var q = m.HD + 'var T=' + ahr_arr(T0) + ',j=textIndex-1,q=(PO-(T[j]||0))/0.28;';
    var tr = 'var LA=' + ahr_arr(LA) + ',tr=(PO>0&&q<0)?cl(1+q*1.5)*LA[j]:0;posterizeTime(24);seedRandom(textIndex*17+SD+Math.floor(time*24)*5,true);';
    jzAnimator(L, 'hr Out Tremble', [['ADBE Text Position 3D', [S * 0.03, S * 0.02, 0]]], q + tr + '[random(-1,1)*tr*100,random(-1,1)*tr*100,0]');
    jzAnimator(L, 'hr Out Tremble Tilt', [['ADBE Text Rotation', 6]], q + tr + 'random(-1,1)*tr*100');
    jzAnimator(L, 'hr Out Pull', [['ADBE Text Position 3D', [0, m.H * 1.1, 0]]], q + 'var qq=cl(q);qq*qq*100');
    jzAnimator(L, 'hr Out Pull Stretch', [['ADBE Text Scale 3D', [70, 280, 100]]], q + 'cl(q)*100');
    jzAnimator(L, 'hr Out Pull Tilt', [['ADBE Text Rotation', 12]], q + 'var RR=' + ahr_arr(RR) + ';RR[j]*cl(q)*100');
    jzAnimator(L, 'hr Out Pull Fade', [['ADBE Text Opacity', 0]], q + 'q>=1?100:ic(cl(q))*100');
} });

/* hrLookBack — 一字残る: the line vanishes except one glyph, which turns to look, then is gone */
jzReg('exit', 'hrLookBack', { apply: function (m) {
    var L = m.L, cs = ahr3_cs(m), N = ahr3_N(m), idx = ahr3_idx(m), txt = jzChars(jzStrip(m.c.text)), k, i;
    var pick = ahr_h(cs, 51) % N;
    for (k = 0; k < N; k++) { var j = (pick + k) % N; if (jzIsKanji(txt[j] || ' ') || /[A-Za-z]/.test(txt[j] || '')) { pick = j; break; } }
    var dir = (ahr_h(cs, 52) & 1) ? 1 : -1, F = [];
    for (i = 0; i < idx.length; i++) F.push(idx[i] === pick ? 1 : 0);
    var q = m.HD + AHR_FNS + 'var F=' + ahr_arr(F) + ',me=F[textIndex-1]==1,q=ios((PO-0.12)/0.55);';
    jzAnimator(L, 'hr Out Leave', [['ADBE Text Opacity', 0]], q + 'PO<=0?0:(me?(PO>=0.86?100:0):(PO<0.06?60:100))');
    jzAnimator(L, 'hr Out Look', [['ADBE Text Rotation', 24 * dir], ['ADBE Text Scale 3D', [116, 116, 100]]], q + 'me&&PO>0?q*100:0');
    jzAnimator(L, 'hr Out Look Twitch', [['ADBE Text Rotation', 6]], q + 'posterizeTime(24);seedRandom(SD+Math.floor(time*24)*3,true);var a=random(),b=random(-1,1);me&&PO>0&&a<0.12?b*100:0');
    jzAnimator(L, 'hr Out Look Red', [['ADBE Text Fill Color', jzHex(m.ctx.sc.accent)]], q + 'me&&q>0.3?100:0');
} });

/* hrTurnAway — 背を向ける: each glyph turns its back (edge-on, reversed, darkened) and fades */
jzReg('exit', 'hrTurnAway', { apply: function (m) {
    var L = m.L, S = m.size, ord = ahr3_ord(m);
    var q = m.HD + AHR_FNS + 'var O=' + ahr_arr(ord) + ',q=cl((PO-(O[textIndex-1]||0)*0.4)/0.6);';
    jzAnimator(L, 'hr Out Turn', [['ADBE Text Scale 3D', [-100, 100, 100]]], q + 'var sx=Math.cos(q*Math.PI*0.95);if(Math.abs(sx)<0.04)sx=0.04;[(1-sx)/2*100,0,0]');
    jzAnimator(L, 'hr Out Turn Dark', [['ADBE Text Fill Color', jzHex(ahr_night(m.ctx.sc))]], q + 'q>0.5?(0.35+q*0.5)*100:0');
    jzAnimator(L, 'hr Out Turn Fade', [['ADBE Text Opacity', 0], ['ADBE Text Position 3D', [0, S * 0.08, 0]]], q + 'q>=1?100:sm(0.6,1,q)*100');
} });

/* hrShiver — 震えて消える: a tremor that keeps growing, and glyphs drop out of existence between frames */
jzReg('exit', 'hrShiver', { apply: function (m) {
    var L = m.L, S = m.size, cs = ahr3_cs(m), idx = ahr3_idx(m), T0 = [], i;
    for (i = 0; i < idx.length; i++) T0.push(0.3 + ahr_r(cs, Math.max(0, idx[i]), 61) * 0.62);
    var q = m.HD + 'var T=' + ahr_arr(T0) + ',j=textIndex-1;';
    jzAnimator(L, 'hr Out Gone', [['ADBE Text Opacity', 0]], q + 'PO>0&&PO>=T[j]?100:0');
    jzAnimator(L, 'hr Out Shiver', [['ADBE Text Position 3D', [S * 0.155, S * 0.155, 0]]], q + 'posterizeTime(24);seedRandom(textIndex*29+SD+Math.floor(time*24)*7,true);var a=PO>0?(0.025+0.13*PO)/0.155*100:0;[random(-1,1)*a,random(-1,1)*a,0]');
    jzAnimator(L, 'hr Out Shiver Tilt', [['ADBE Text Rotation', 14]], q + 'posterizeTime(24);seedRandom(textIndex*37+SD+Math.floor(time*24)*11,true);random(-1,1)*PO*100');
} });

/* hrSwallow — 闇に呑まれる: a stain of darkness spreads from one point and eats the line */
jzReg('exit', 'hrSwallow', { apply: function (m) {
    var L = m.L, S = m.size, r = jzRect(L), seed = (m.c.seed | 0) + ((m.o && m.o.mi) || 0) * 101, i;
    var bx0 = r.left, bx1 = r.left + r.width, by0 = r.top, by1 = r.top + r.height;
    var cx = jzLerp(bx0, bx1, ahr_rr(0.15, 0.85, seed, 71)), cy = jzLerp(by0, by1, ahr_rr(0.3, 0.7, seed, 72));
    var dxm = Math.max(cx - bx0, bx1 - cx), dym = Math.max(cy - by0, by1 - cy), Rmax = Math.sqrt(dxm * dxm + dym * dym) + S * 0.2;
    var RX = 'var R=' + jzN(Rmax * 1.08) + '*ic(cl(PO/0.75));';
    // the text is cut away inside the stain (a subtractive mask that grows) ...
    var rb = Rmax * 0.3, mk = L.property('ADBE Mask Parade').addProperty('ADBE Mask Atom'), sh = new Shape(), pts = [];
    for (i = 0; i < 22; i++) { var a = i / 22 * Math.PI * 2, rr = rb * (0.72 + 0.4 * ahr_r(seed, i, 73)); pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]); }
    sh.vertices = pts; sh.closed = true;
    mk.property('ADBE Mask Shape').setValue(sh);
    mk.maskMode = MaskMode.SUBTRACT;
    mk.property('ADBE Mask Opacity').expression = m.HD + 'PO>0?100:0';
    mk.property('ADBE Mask Offset').expression = m.HD + RX + 'PO<=0?' + jzN(-rb * 2) + ':R-' + jzN(rb * 0.9);
    m.parts.op.push('if(PO>0.97)f=0;');
    // ... and the stain itself is drawn over it (rides on the text layer)
    var B = ahr3_rider(m, L, 'hr swallow'), cp = ahr3_toComp(L, [cx, cy]), bp = [];
    for (i = 0; i < 22; i++) { var a2 = i / 22 * Math.PI * 2, r2 = Rmax * 1.08 * (0.72 + 0.4 * ahr_r(seed, i, 73)); bp.push([Math.cos(a2) * r2, Math.sin(a2) * r2]); }
    var g = jzGrp(B, 'stain'); jzAddPath(g, bp, true); jzAddFill(g, ahr_night(m.ctx.sc));
    jzXf(B, 'ADBE Position').setValue(cp);
    jzSetExpr(jzXf(B, 'ADBE Scale'), m.HD + 'var R=ic(cl(PO/0.75));var k=value[0]*R*(1+0.04*Math.sin(PO*9));[k,k]');
    jzSetExpr(jzXf(B, 'ADBE Opacity'), m.HD + AHR_FNS + 'PO<=0?0:85*(1-sm(0.62,0.95,PO))');
    jzNoGhost(B);
} });

/* hrFlickerDie — 明滅して消える: the words strobe out, with single frames where they come back wrong */
jzReg('exit', 'hrFlickerDie', { apply: function (m) {
    var rnd = 'posterizeTime(24);seedRandom(SD+Math.floor(time*24)*7,true);var r1=random(),r2=random(),r3=random(-1,1),r4=random();var hid=PO>0.92||r1>Math.pow(1-PO,1.3)*0.95,mir=!hid&&r2<0.22&&PO>0.15;';
    m.parts.op.push('if(PO>0){' + rnd + 'f*=hid?0:(mir?1:0.55+0.45*r4);}');
    m.parts.sc.push('if(PO>0){' + rnd + 'if(mir)f=[-f[0],f[1]];}');
    m.parts.pos.push('if(PO>0){' + rnd + 'if(mir)d=[d[0],d[1]+r3*SZ*0.1];}');
    jzAnimator(m.L, 'hr Out Wrong', [['ADBE Text Fill Color', jzHex(m.ctx.sc.accent)]], m.HD + 'var mir=false;if(PO>0){' + rnd + '}mir?100:0');
} });

/* hrDrain — 滴り落ちる: the ink level sinks inside the glyphs while drips run out of the bottom */
jzReg('exit', 'hrDrain', { apply: function (m) {
    var L = m.L, S = m.size, cs = ahr3_cs(m), idx = ahr3_idx(m), sl = ahr_slots(L), i, d;
    var r = jzRect(L), hasMatte = false; try { hasMatte = L.trackMatteType && L.trackMatteType !== TrackMatteType.NO_TRACK_MATTE; } catch (e0) {}
    var lev = m.HD + AHR_FNS + 'var lv=PO<=0?0:ios((PO-0.12)/0.72);';
    if (!hasMatte) {
        // the ink level: an inverted matte whose lower edge sinks through the text block
        var pad = S * 0.3, top = r.top - pad, hb = r.height + pad * 2, M = jzShapeLayer(m.ctx, 'hr drain level', 0, 0), gm = jzGrp(M, 'level');
        var rc = jzAddRect(gm, r.width + pad * 4, 1, 0);
        rc.property('ADBE Vector Rect Size').expression = lev + '[' + jzN(r.width + pad * 4) + ',Math.max(0,lv*' + jzN(hb) + ')]';
        rc.property('ADBE Vector Rect Position').expression = lev + '[0,Math.max(0,lv*' + jzN(hb) + ')/2]';
        jzAddFill(gm, '#FFFFFF');
        jzXf(M, 'ADBE Position').setValue(ahr3_toComp(L, [r.left + r.width / 2, top]));
        M.moveBefore(L); M.parent = L;
        L.trackMatteType = TrackMatteType.ALPHA_INVERTED;
        jzNoGhost(M);
    } else {
        var lw = jzEffect(L, 'ADBE Linear Wipe', 'hr Out Drain');
        jzEP(lw, 2, 180); jzEP(lw, 3, S * 0.25);
        jzEX(lw, 1, lev + '100*lv');
    }
    // drips below the glyphs
    var B = ahr3_rider(m, L, 'hr drain drips'), g = jzGrp(B, 'drips'), cnt = 0, col = jzTextColor(L), p0 = ahr3_toComp(L, [0, 0]);
    for (i = 0; i < sl.length && cnt < 16; i++) {
        if (sl[i].sp) continue;
        var k = ahr_h(cs, Math.max(0, idx[i]), 91), nd = 1 + (k % 2);
        for (d = 0; d < nd && cnt < 16; d++) {
            var x = sl[i].x + ahr_rs(k, d, 1) * sl[i].w * 0.3, yb = sl[i].y + S * 0.4, Ld = S * (0.3 + 1.4 * ahr_r(k, d, 2));
            jzAddPath(g, [[x - p0[0], yb - S * 0.05 - p0[1]], [x - p0[0], yb + Ld - p0[1]]], false); cnt++;
        }
    }
    if (!cnt) jzAddPath(g, [[0, 0], [0, 1]], false);
    var st = jzAddStroke(g, col, Math.max(1, S * 0.035)); try { st.property('ADBE Vector Stroke Line Cap').setValue(2); } catch (e) {}
    jzAddTrimPaths(g, m.HD + AHR_FNS + '100*oc(ios(PO/0.85))');
    jzXf(B, 'ADBE Position').setValue(p0);
    ahr3_attach(B, L);
    jzSetExpr(jzXf(B, 'ADBE Opacity'), m.HD + AHR_FNS + 'PO<=0?0:100*(1-sm(0.75,1,PO))');
    jzNoGhost(B);
} });

/* ================================================================ HOLDS */

/* hrTwitch — 痙攣: dead still, then a rare violent jerk of one glyph (or the whole line) */
jzReg('hold', 'hrTwitch', { apply: function (m) {
    var S = m.size, kM = ahr3_motionK(m);
    var q = m.HD + 'posterizeTime(12);seedRandom(SD+Math.floor(time*12)*13,true);var kk=AMT*' + jzN(kM) + ';var go=random()<0.07*kk*2,wh=random()<0.25,tg=Math.floor(random()*textTotal)+1;' +
        'var a1=random(-1,1),a2=random(-1,1),a3=random(-1,1),a4=random();var on=kk>0.02&&go&&(wh||textIndex==tg);';
    jzAnimator(m.L, 'hr Hold Twitch', [['ADBE Text Position 3D', [S * 0.22, S * 0.14, 0]]], q + 'on?[a1*kk*100,a2*kk*100,0]:[0,0,0]');
    jzAnimator(m.L, 'hr Hold Twitch Tilt', [['ADBE Text Rotation', 28]], q + 'on?a3*kk*100:0');
    jzAnimator(m.L, 'hr Hold Twitch Size', [['ADBE Text Scale 3D', [112, 112, 100]]], q + 'on?a4*kk*100:0');
} });

/* hrStare — 見つめる字: now and then one glyph slowly tilts its head towards you, holds, and snaps back */
jzReg('hold', 'hrStare', { apply: function (m) {
    var S = m.size, kM = ahr3_motionK(m);
    var q = m.HD + 'var t=time-0.3,kk=AMT*' + jzN(kM) + ',v=0,dr=1,tg=-1;if(t>0&&kk>0.02){var cy=Math.floor(t/2),u=(t-cy*2)/2;tg=Math.floor(hh(cy*111+SD)*textTotal)+1;dr=hh(cy*112+SD)<0.5?1:-1;' +
        'v=u<0.6?-(Math.cos(Math.PI*u/0.6)-1)/2:(u<0.85?1:1-oe((u-0.85)/0.15));}var on=textIndex==tg;';
    jzAnimator(m.L, 'hr Hold Stare', [['ADBE Text Rotation', 22]], q + 'on?dr*v*kk*100:0');
    jzAnimator(m.L, 'hr Hold Stare Lean', [['ADBE Text Scale 3D', [112, 112, 100]], ['ADBE Text Position 3D', [0, -S * 0.04, 0]]], q + 'on?v*kk*100:0');
} });

/* hrLagOne — 遅れる一字: the line sways together, one glyph follows a moment too late */
jzReg('hold', 'hrLagOne', { apply: function (m) {
    var S = m.size, kM = ahr3_motionK(m), cs = ahr3_cs(m), N = ahr3_N(m), idx = ahr3_idx(m), late = ahr_h(cs, 121) % N, F = [], i;
    for (i = 0; i < idx.length; i++) F.push(idx[i] === late ? 1 : 0);
    var sd = cs % 97;
    var q = m.HD + AHR_FNS + 'var F=' + ahr_arr(F) + ',kk=AMT*' + jzN(kM) + ',tt=time-(F[textIndex-1]==1?0.75:0);';
    jzAnimator(m.L, 'hr Hold Sway', [['ADBE Text Position 3D', [S * 0.1, S * 0.06, 0]]], q + '[nz(tt*0.9,' + sd + ')*kk*100,nz(tt*0.7+5,' + (sd + 1) + ')*kk*100,0]');
    jzAnimator(m.L, 'hr Hold Sway Tilt', [['ADBE Text Rotation', 4]], q + 'nz(tt*0.5+9,' + (sd + 2) + ')*kk*100');
} });

/* hrFlickerLight — 切れかけの灯: the words buzz, dim and drop out for a frame or two */
jzReg('hold', 'hrFlickerLight', { apply: function (m) {
    var kM = jzClamp(ahr3_motionK(m), 0.4, 1.3);
    var lv = 'posterizeTime(24);var st=Math.floor(time*24),run=Math.floor(st/2),kk=AMT*' + jzN(kM) + ';seedRandom(SD+st*3,true);var lv=0.9+0.1*random();seedRandom(SD+run*5+1,true);' +
        'if(random()<0.09*kk){seedRandom(SD+st*7+2,true);lv=random()<0.5?0.08:0.35;}else{seedRandom(SD+st*11+3,true);if(random()<0.05*kk)lv=0.5;}var al=kk<0.02?1:1-(1-lv)*Math.min(1,kk);';
    m.parts.op.push(lv + 'f*=al;');
    jzAnimator(m.L, 'hr Hold Dim', [['ADBE Text Fill Color', jzHex(jzMixHex(jzTextColor(m.L), m.ctx.sc.bg, 0.3))]], m.HD + lv + 'al<0.6?100:0');
} });

/* ================================================================ TREATMENTS */
function ahr3_alive(L) { try { var td = L.property('ADBE Text Properties').property('ADBE Text Document').value; return td.applyFill !== false && jzFontSize(L) > 1 && jzTrim(td.text) !== ''; } catch (e) { return false; } }

/* hrInkBleed — 滲み垂れ: a dark halo seeps out of the letters and thin drips run down from some of them */
jzReg('treat', 'hrInkBleed', {
    plan: function (rng, st) { return { drips: rng.range(0.25, 0.45), red: rng.chance(0.4) }; },
    apply: function (ctx, L, P, o) {
        if (!ahr3_alive(L)) return;
        var sc = ctx.sc, c = jzTextColor(L), halo = P.red ? sc.accent : jzMixHex(c, sc.bg, ahr_dark(sc.bg) ? 0.5 : 0.3), sz = jzFontSize(L), cs = ctx.cut.seed | 0, i;
        var single = jzCount(ahr3_text(L)) === 1 && jzCount(ctx.cut.text) > 4;
        if (!single) {
            var ds = jzEffect(L, 'ADBE Drop Shadow', 'hr Bleed');
            jzEP(ds, 1, jzHex(halo)); jzEP(ds, 2, 0.8 * 255); jzEP(ds, 3, 180); jzEP(ds, 4, sz * 0.02); jzEP(ds, 5, sz * 0.14);
        }
        var sl = ahr_slots(L), rate = P.drips || 0.35, p0 = ahr3_toComp(L, [0, 0]), pts = [];
        for (i = 0; i < sl.length; i++) {
            if (sl[i].sp || jzIsPunct(sl[i].ch)) continue;
            var k = ahr_h(cs, i, Math.round(sl[i].x), 141);
            if (ahr_r(k, 1) > rate) continue;
            var x = sl[i].x + ahr_rs(k, 2) * sl[i].w * 0.25, y = sl[i].y + sz * 0.36, Ld = sz * (0.2 + 0.9 * ahr_r(k, 3));
            pts.push([[x - p0[0], y - p0[1]], [x + ahr_rs(k, 5) * sz * 0.02 - p0[0], y + Ld - p0[1]]]);
        }
        if (!pts.length) return;
        var B = ahr3_rider(ctx, L, 'hr bleed drips'), g = jzGrp(B, 'drips');
        for (i = 0; i < pts.length; i++) jzAddPath(g, pts[i], false);
        var st = jzAddStroke(g, P.red ? sc.accent : c, Math.max(1, sz * 0.028)); try { st.property('ADBE Vector Stroke Line Cap').setValue(2); } catch (e) {}
        var cut = ctx.cut, d0 = (cut.inDur || 0.3) * 1.1;
        jzAddTrimPaths(g, JZ_FNS + '100*oc((time-' + jzN(d0) + ')/' + jzN(Math.max(0.8, cut.dur * 0.7)) + ')');
        jzXf(B, 'ADBE Position').setValue(p0);
        ahr3_attach(B, L);
        jzSetExpr(jzXf(B, 'ADBE Opacity'), jzTH(ctx) + '90*(1-PO)');
        jzNoGhost(B);
    }
});

/* hrEroded — 風化: letters worn away with pits and scratches (an inverted alpha matte riding on the text) */
jzReg('treat', 'hrEroded', {
    plan: function (rng, st) { return { dens: rng.range(0.7, 1.2), scr: rng.chance(0.7) }; },
    apply: function (ctx, L, P, o) {
        if (!ahr3_alive(L)) return;
        try { if (L.trackMatteType && L.trackMatteType !== TrackMatteType.NO_TRACK_MATTE) return; } catch (e0) {}
        var cs = ctx.cut.seed | 0, sz = jzFontSize(L), dens = P.dens || 1, sl = ahr_slots(L), p0 = ahr3_toComp(L, [0, 0]), i, j, budget = 200;
        var M = jzShapeLayer(ctx, 'hr erosion', 0, 0), gp = jzGrp(M, 'pits'), sc2 = [];
        for (i = 0; i < sl.length; i++) {
            if (sl[i].sp) continue;
            var k = ahr_h(cs, i, 151), n = Math.round((8 + ahr_r(k, 1) * 7) * dens), gw = sl[i].w, gh = sz;
            for (j = 0; j < n && budget-- > 0; j++) {
                var r = sz * (0.012 + 0.05 * Math.pow(ahr_r(k, j, 2), 2));
                jzAddEllipse(gp, r * 2, r * 2, sl[i].x + ahr_rs(k, j, 3) * gw * 0.45 - p0[0], sl[i].y + ahr_rs(k, j, 4) * gh * 0.45 - p0[1]);
            }
            if (P.scr && ahr_r(k, 5) < 0.45) { var a = ahr_r(k, 6) * Math.PI, Ls = gw * 0.6; sc2.push([[sl[i].x - Math.cos(a) * Ls / 2 - p0[0], sl[i].y - Math.sin(a) * Ls / 2 - p0[1]], [sl[i].x + Math.cos(a) * Ls / 2 - p0[0], sl[i].y + Math.sin(a) * Ls / 2 - p0[1]]]); }
        }
        jzAddFill(gp, '#000000');
        if (sc2.length) { var gs = jzGrp(M, 'scratches'); for (i = 0; i < sc2.length; i++) jzAddPath(gs, sc2[i], false); jzAddStroke(gs, '#000000', Math.max(1.5, sz * 0.022)); }
        jzXf(M, 'ADBE Position').setValue(p0);
        M.moveBefore(L);
        ahr3_attach(M, L);
        L.trackMatteType = TrackMatteType.ALPHA_INVERTED;
        jzNoGhost(M);
    }
});

/* hrRedact — 黒塗り: a bar covers part of the line and is pulled off later, leaving its outline */
jzReg('treat', 'hrRedact', {
    plan: function (rng, st) { return { at: rng.range(0.25, 0.5), frac: rng.range(0.3, 0.6), from: rng.range(0, 1) }; },
    apply: function (ctx, L, P, o) {
        if (!ahr3_alive(L)) return;
        var frac = P.frac || 0.45, from = P.from == null ? 0.5 : P.from, N = jzCount(ctx.cut.text), n1 = jzCount(ahr3_text(L));
        if (n1 === 1 && N > 1) { var od = jzClamp(((o && o.mi) || 0) / (N - 1), 0, 1), a0 = from * (1 - frac); if (od < a0 || od > a0 + frac) return; }
        var gl = ahr_nonSp(ahr_slots(L)); if (!gl.length) return;
        var s0 = 0, s1 = gl.length - 1, sz = jzFontSize(L), i;
        if (gl.length > 2) { var mm = Math.max(1, Math.round(gl.length * frac)); s0 = Math.min(gl.length - mm, Math.floor(from * (gl.length - mm + 1))); s1 = s0 + mm - 1; }
        var x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
        for (i = s0; i <= s1; i++) { x0 = Math.min(x0, gl[i].x - gl[i].w / 2); x1 = Math.max(x1, gl[i].x + gl[i].w / 2); y0 = Math.min(y0, gl[i].y - sz * 0.5); y1 = Math.max(y1, gl[i].y + sz * 0.5); }
        var pd = sz * 0.06, c = jzTextColor(L), cut = ctx.cut, t0 = (cut.inDur || 0.3) + (cut.dur - (cut.inDur || 0.3) - (cut.outDur || 0.2)) * (P.at || 0.35);
        var w = x1 - x0 + pd * 2, h = y1 - y0 + pd, ke = ahr_TH(ctx) + 'var k=ioc((time-' + jzN(t0) + ')/0.35);';
        var B = ahr3_rider(ctx, L, 'hr redact bar'), xr = x1 + pd, ym = (y0 + y1) / 2;
        var go = jzGrp(B, 'outline'); jzAddRect(go, w, h, 0, -w / 2, 0); jzAddStroke(go, ctx.sc.sub, Math.max(1, sz * 0.01));
        jzGX(go).property('ADBE Vector Group Opacity').expression = ke + '50*k';
        var gb = jzGrp(B, 'bar'); jzAddRect(gb, w, h, 0, -w / 2, 0); jzAddFill(gb, c);
        jzGX(gb).property('ADBE Vector Scale').expression = ke + '[100*(1-k),100]';
        jzXf(B, 'ADBE Position').setValue([xr, ym]);
        ahr3_attach(B, L);
        jzSetExpr(jzXf(B, 'ADBE Opacity'), jzTH(ctx) + '100*K');
        jzNoGhost(B);
    }
});

/* hrDoubleExp — 二重露光: a second, fainter take of the line drifts out of register */
jzReg('treat', 'hrDoubleExp', {
    plan: function (rng, st) { return { amp: rng.range(0.18, 0.28), k: rng.range(1.03, 1.08) }; },
    apply: function (ctx, L, P, o) {
        if (!ahr3_alive(L)) return;
        var sc = ctx.sc, own = jzTextColor(L), cands = [sc.sub, sc.ghostA, sc.fg], col = sc.sub, i, cs = ctx.cut.seed | 0, sz = jzFontSize(L), amp = P.amp || 0.2;
        for (i = 0; i < cands.length; i++) if (cands[i] && String(cands[i]).toUpperCase() !== String(own).toUpperCase() && jzContrast(cands[i], sc.bg) > 1.3) { col = cands[i]; break; }
        var D = L.duplicate();
        D.moveAfter(L); D.name = 'hr double';
        try { D.trackMatteType = TrackMatteType.NO_TRACK_MATTE; } catch (e0) {}
        var fl = jzEffect(D, 'ADBE Fill', 'hr Double Colour'); jzEP(fl, 3, jzHex(col));
        var tf = jzEffect(D, 'ADBE Geometry2', 'hr Double Drift'), sd = cs % 97;
        jzEX(tf, 2, AHR_FNS + JZ_FNS + '[value[0]+nz(time*0.6,' + (sd + 3) + ')*' + jzN(sz * amp) + ',value[1]+nz(time*0.5,' + (sd + 4) + ')*' + jzN(sz * amp * 0.7) + ']');
        jzEP(tf, 4, (P.k || 1.05) * 100);
        jzXf(D, 'ADBE Opacity').setValue(40);
        jzNoGhost(D);
    }
});
