// ================================================================ pack x2horrorB (AE port of src/11p_x2_horrorB.js) — 追加分2 for the ホラー set (keys hz…)
// enter : hzAlreadyThere hzUnwatched hzShakyHand hzFloorSeep hzTooClose hzWrongGlyph hzFromScratch hzLateSnap hzLampSweep
// exit  : hzOutOfLight hzTaken hzThumbSmear hzRetinal hzDragCorner hzFlatline hzShadowOff hzBackAway
// hold  : hzSlowBreath hzLoneTremor hzPassing hzPresence hzLoom
// treat : hzUneven hzHairlines hzColdRim hzHusk hzDragMarks
// cam   : hzCreepFreeze hzGlanceBack hzHeldBreath hzColdShiver
// fx    : hzTear hzDrain hzClosingDark hzColdBreath hzFaint hzUpside
// trans : hzBlackout hzSlideDown hzLinger
//
// Per-glyph work = text animators with Expression Selectors. Everything the browser derives from the whole lyric with its
// hash (which glyph, in which order, at which uneven moment) is computed here with the same hash and embedded as arrays
// indexed by textIndex, so the panel picks the same glyphs / moments as the web preview. Motions of the whole line are
// layer transform snippets (m.parts); "scale about the screen centre" = layer scale + a position offset from the comp centre.
// Secondary copies (the shadow that walks off, the looming shadow) are duplicates of the lyric kept out of the colour ghosts.

/* ---------------------------------------------------------------- helpers (ahzb_) */
// the browser's J.h / J.r / J.rs / J.rr / J.noise1
function ahzb_h(a, b, c, d, e) {
    var h = 0x9e3779b9 ^ (a | 0);
    h = jzImul(h ^ (h >>> 16), 0x85ebca6b);
    h = (h + jzImul((b | 0) + 0x632be5ab, 0xc2b2ae35)) | 0;
    h = jzImul(h ^ (h >>> 13), 0xc2b2ae35);
    h = (h + jzImul((c | 0) + 0x5bd1e995, 0x27d4eb2f)) | 0;
    h = jzImul(h ^ (h >>> 15), 0x165667b1);
    h = (h + jzImul((d | 0) + 0x1b873593, 0x85ebca6b)) | 0;
    h = jzImul(h ^ (h >>> 16), 0x27d4eb2f);
    h = (h + jzImul((e | 0) + 0x68e31da4, 0x9e3779b1)) | 0;
    h ^= h >>> 15; h = jzImul(h, 0x2c1b3c6d); h ^= h >>> 12; h = jzImul(h, 0x297a2d39); h ^= h >>> 15;
    return h >>> 0;
}
function ahzb_r(a, b, c, d, e) { return ahzb_h(a, b, c, d, e) / 4294967296; }
function ahzb_rs(a, b, c, d, e) { return ahzb_r(a, b, c, d, e) * 2 - 1; }
function ahzb_rr(lo, hi, a, b, c, d) { return lo + (hi - lo) * ahzb_r(a, b, c, d); }
function ahzb_noise1(x, seed) { var i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return jzLerp(ahzb_rs(seed, i), ahzb_rs(seed, i + 1), u); }
function ahzb_dark(c) { return jzLum(c) < 0.45; }
function ahzb_night(sc) { return jzMixHex(sc.bg, '#000000', ahzb_dark(sc.bg) ? 0.72 : 0.9); }
function ahzb_gcd(a, b) { return b ? ahzb_gcd(b, a % b) : a; }
// expression helpers on top of JZ_FNS: hzs inOutSine, hzc inOutCubic, hzm smoothstep(a, b, x), hzq outQuad,
// hzn smooth noise -1..1 (stands in for the browser's noise1), hza attack → hold → release
var AHZB_FNS = 'function hzs(x){x=cl(x);return -(Math.cos(Math.PI*x)-1)/2;}' +
    'function hzc(x){x=cl(x);return x<0.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;}' +
    'function hzm(a,b,x){x=cl((x-a)/(b-a));return x*x*(3-2*x);}' +
    'function hzq(x){x=cl(x);return 1-(1-x)*(1-x);}' +
    'function hzn(x,s){return Math.sin(x*1.13+s*1.7)*0.55+Math.sin(x*2.31+s*3.1)*0.3+Math.sin(x*4.7+s*0.9)*0.15;}' +
    'function hza(k,a,b){return k<a?oc(k/a):(k>b?1-hzc((k-b)/Math.max(0.001,1-b)):1);}\n';
function ahzb_arr(a) { var s = [], i; for (i = 0; i < a.length; i++) s.push(jzN(a[i])); return '[' + s.join(',') + ']'; }
function ahzb_text(L) { try { return String(L.property('ADBE Text Properties').property('ADBE Text Document').value.text); } catch (e) { return ''; } }
function ahzb_N(cut) { return Math.max(1, jzCount(String(cut.text || ''))); }
function ahzb_motionK(m) { return jzClamp((m.ctx.fx.motion == null ? 0.7 : m.ctx.fx.motion) / 0.7, 0, 1.6); }
// per glyph of the layer (textIndex order): its index in the whole lyric; one-glyph layers use their motion index
// (the browser's indexOf); a space takes the index of the glyph before it
function ahzb_idx(L, cut, mi) {
    var g = jzGlyphs(ahzb_text(L)), N = ahzb_N(cut), out = [], k = 0, i, ns = jzCount(ahzb_text(L));
    mi = Math.round(+mi || 0);
    for (i = 0; i < g.length; i++) {
        if (g[i] === ' ' || g[i] === '　') { out.push(Math.max(0, k - 1)); continue; }
        out.push(ns === 1 && N > 1 ? Math.max(0, Math.min(N - 1, mi)) : k); k++;
    }
    return out;
}
function ahzb_mix(m) { return ahzb_idx(m.L, m.c, m.o && m.o.mi); }
// position 0..1 of each glyph along the lyric (the browser's orderOf)
function ahzb_ord(m) {
    var g = jzGlyphs(ahzb_text(m.L)), N = ahzb_N(m.c), n = g.length, out = [], i, mi = +(m.o && m.o.mi) || 0;
    for (i = 0; i < n; i++) out.push(n > 1 ? i / (n - 1) : (N > 1 ? jzClamp(mi / (N - 1), 0, 1) : 0));
    return out;
}
// one flag per glyph: is it glyph `pick` of the lyric?
function ahzb_flags(idx, pick) { var F = [], i; for (i = 0; i < idx.length; i++) F.push(idx[i] === pick ? 1 : 0); return F; }
function ahzb_scl(L) { var s = [100, 100]; try { s = jzXf(L, 'ADBE Scale').value; } catch (e) {} return [Math.abs(s[0]) / 100 || 1, Math.abs(s[1]) / 100 || 1]; }
function ahzb_hasParent(L) { try { return !!L.parent; } catch (e) { return false; } }
function ahzb_matted(L) { try { return !!L.trackMatteType && L.trackMatteType !== TrackMatteType.NO_TRACK_MATTE; } catch (e) { return false; } }
// vertical lyric = one glyph per line
function ahzb_vert(L) {
    var ls = ahzb_text(L).split(/\r\n|\r|\n/), i;
    if (ls.length < 2) return false;
    for (i = 0; i < ls.length; i++) if (jzChars(ls[i]).length > 1) return false;
    return true;
}
// comp position of a point given in a layer's own coordinates, through its parents (static values)
function ahzb_toComp(L, p) {
    var x = p[0], y = p[1], P = L, g = 0;
    while (P && g++ < 20) {
        var a = jzXf(P, 'ADBE Anchor Point').value, ps = jzXf(P, 'ADBE Position').value, s = jzXf(P, 'ADBE Scale').value, r = jzXf(P, 'ADBE Rotate Z').value * Math.PI / 180;
        var dx = (x - a[0]) * s[0] / 100, dy = (y - a[1]) * s[1] / 100;
        x = ps[0] + dx * Math.cos(r) - dy * Math.sin(r); y = ps[1] + dx * Math.sin(r) + dy * Math.cos(r);
        P = P.parent;
    }
    return [x, y];
}
function ahzb_cw(ch) {       // advance of one glyph in em (estimate)
    if (ch === ' ') return 0.3;
    var c = ch.charCodeAt(0);
    if (c < 0x2000) { if (/[A-Z]/.test(ch)) return 0.68; if (/[a-z]/.test(ch)) return 0.55; if (/[0-9]/.test(ch)) return 0.6; return 0.4; }
    if (c >= 0xFF61 && c <= 0xFF9F) return 0.5;
    return 1;
}
// estimated comp-space centres [x, y] of every glyph of a text layer, in textIndex order (from its measured box)
function ahzb_slots(L) {
    var td = L.property('ADBE Text Properties').property('ADBE Text Document').value;
    var text = String(td.text), size = td.fontSize, tr = (td.tracking || 0) / 1000, lead = size * 1.2;
    try { if (!td.autoLeading && td.leading) lead = td.leading; } catch (e0) {}
    var lines = text.split(/\r\n|\r|\n/), nl = lines.length, wl = [], cs = [], i, j, mx = 0;
    for (i = 0; i < nl; i++) {
        var a = jzChars(lines[i]), w = 0, q = [];
        for (j = 0; j < a.length; j++) { var cw = (ahzb_cw(a[j]) + tr) * size; q.push(cw); w += cw; }
        cs.push(a); wl.push(q); mx = Math.max(mx, w);
    }
    var r = jzRect(L), k = mx > 0 ? r.width / mx : 1, cxL = r.left + r.width / 2, cyL = r.top + r.height / 2, just = td.justification, out = [];
    for (i = 0; i < nl; i++) {
        var tot = 0; for (j = 0; j < wl[i].length; j++) tot += wl[i][j] * k;
        var x0 = just === ParagraphJustification.LEFT_JUSTIFY ? r.left : (just === ParagraphJustification.RIGHT_JUSTIFY ? r.left + r.width - tot : cxL - tot / 2);
        var yl = cyL + (i - (nl - 1) / 2) * lead, acc = x0;
        for (j = 0; j < cs[i].length; j++) { var gw = wl[i][j] * k; out.push(ahzb_toComp(L, [acc + gw / 2, yl])); acc += gw; }
    }
    return out;
}
// "scale about the screen centre" (the browser's scaleAbout): the position part for a scale factor held in variable v
function ahzb_about(m, v) { return ahzb_hasParent(m.L) ? '' : 'd=[d[0]+(value[0]-thisComp.width/2)*(' + v + '-1),d[1]+(value[1]-thisComp.height/2)*(' + v + '-1)];'; }
// give the text a (zero-width) stroke in its own colour so Stroke Width animators can draw an outline; false = it has one
function ahzb_addStroke(L) {
    var td = L.property('ADBE Text Properties').property('ADBE Text Document').value;
    if (td.applyStroke && td.strokeWidth > 0) return false;
    jzTextDoc(L, function (d) {
        d.applyStroke = true; d.strokeWidth = 0;
        try { d.strokeColor = d.applyFill ? d.fillColor : d.strokeColor; } catch (e) {}
        try { d.strokeOverFill = false; } catch (e2) {}
    });
    return true;
}
// a copy of the lyric drawn in one colour behind it (kept out of the colour ghosts); null when the comp is already crowded
function ahzb_copy(m, name, hex) {
    var n = 0; try { n = m.ctx.comp.numLayers; } catch (e) {}
    if (n > 70) return null;
    var D = m.L.duplicate();
    try { D.name = name; } catch (e1) {}
    D.moveAfter(m.L);
    try { if (ahzb_matted(D)) D.trackMatteType = TrackMatteType.NO_TRACK_MATTE; } catch (e2) {}
    var fl = jzEffect(D, 'ADBE Fill', name + ' colour'); jzEP(fl, 3, jzHex(hex));
    jzNoGhost(D);
    return D;
}
// shape layer living in the lyric layer's own space (parented, identity transform)
function ahzb_shapeOn(ctx, L, name) {
    var S = ctx.comp.layers.addShape(); S.name = name;
    S.parent = L;
    jzXf(S, 'ADBE Anchor Point').setValue([0, 0]); jzXf(S, 'ADBE Position').setValue([0, 0]);
    jzXf(S, 'ADBE Scale').setValue([100, 100]); jzXf(S, 'ADBE Rotate Z').setValue(0);
    S.moveBefore(L);
    return S;
}

/* ================================================================ ENTRANCES */

/* hzAlreadyThere — 闇に居た: the line was standing in the dark all along; patches of it brighten at their own pace */
jzReg('enter', 'hzAlreadyThere', { selfHide: true, apply: function (m) {
    var L = m.L, cs = m.c.seed | 0, idx = ahzb_mix(m), T0 = [], LN = [], SG = [], i, k;
    for (i = 0; i < idx.length; i++) { k = ahzb_h(cs, idx[i], 211); T0.push(ahzb_r(k, 1) * 0.5); LN.push(0.22 + ahzb_r(k, 2) * 0.28); SG.push(0.3 * ahzb_r(k, 3)); }
    var q = m.HD + AHZB_FNS + 'var j=textIndex-1,T=' + ahzb_arr(T0) + ',N=' + ahzb_arr(LN) + ',S=' + ahzb_arr(SG) +
        ';var q=cl((P-(T[j]||0))/(N[j]||0.3)),lv=cl(hzs(q)-Math.sin(q*Math.PI)*(S[j]||0));if(P>=1)lv=1;';
    jzAnimator(L, 'hz In Dark', [['ADBE Text Opacity', 0]], q + 'time<DL?100:(1-(0.1+0.9*lv)*Math.min(1,P/0.1))*100');
    jzAnimator(L, 'hz In Dark Colour', [['ADBE Text Fill Color', jzHex(jzMixHex(jzTextColor(L), m.ctx.sc.bg, 0.78))]], q + '(1-lv)*100');
} });

/* hzUnwatched — 目を離した隙: glyphs turn up far apart from each other; each one is faint (and a hair off) until the next arrives */
jzReg('enter', 'hzUnwatched', { selfHide: true, apply: function (m) {
    var L = m.L, cs = m.c.seed | 0, N = ahzb_N(m.c), idx = ahzb_mix(m), S = m.size, hop = Math.max(1, Math.round(N * 0.38)), slot = [], k, i;
    while (ahzb_gcd(hop, N) !== 1) hop++;
    var start = ahzb_h(cs, 221) % N, gap = 0.86 / N, T0 = [], D = [];
    for (k = 0; k < N; k++) slot[(start + k * hop) % N] = k;
    for (i = 0; i < idx.length; i++) { T0.push((slot[idx[i]] || 0) * gap); D.push(ahzb_r(cs, idx[i], 222) < 0.5 ? -1 : 1); }
    var q = m.HD + 'var j=textIndex-1,T=' + ahzb_arr(T0) + ',q=P-(T[j]||0),nw=q>=0&&q<' + jzN(gap) + '&&P<1;';
    jzAnimator(L, 'hz In Unwatched', [['ADBE Text Opacity', 0]], q + '(time<DL||q<0)?100:(nw?70:0)');
    jzAnimator(L, 'hz In Unwatched Off', [['ADBE Text Position 3D', [0, S * 0.05, 0]]], q + 'var D=' + ahzb_arr(D) + ';nw?(D[j]||0)*100:0');
} });

/* hzShakyHand — 震える筆跡: the outlines are traced in four fits and starts by a trembling hand, and only then filled
   (the growing dash on every contour = fine diagonal blinds whose gaps close in the same four steps) */
jzReg('enter', 'hzShakyHand', { apply: function (m) {
    var L = m.L, S = m.size, HD = m.HD + AHZB_FNS;
    if (ahzb_addStroke(L)) jzAnimator(L, 'hz In Hand Line', [['ADBE Text Stroke Width', Math.max(0.6, S * 0.03)]], HD + '(1-hzm(0.82,1,P))*100');
    jzAnimator(L, 'hz In Hand Fill', [['ADBE Text Fill Opacity', 0]], HD + '(1-hzm(0.78,1,P))*100');
    var vb = jzEffect(L, 'ADBE Venetian Blinds', 'hz In Hand Draw');
    jzEP(vb, 2, 35); jzEP(vb, 3, Math.max(3, S * 0.2)); jzEP(vb, 4, 0);
    jzEX(vb, 1, HD + 'var u=P/0.8,dh=1;if(u<1){var sg=Math.floor(u*4),f=u*4-sg;dh=(sg+hzc(f*1.7))/4;}(1-dh)*100');
    var tr = HD + 'var tr=1-hzm(0.7,1,P),k=textIndex*3.7+SD%13;';
    jzAnimator(L, 'hz In Hand Tremor', [['ADBE Text Position 3D', [S * 0.028, S * 0.035, 0]]], tr + '[hzn(P*38,k)*tr*100,hzn(P*31+7,k+1)*tr*100,0]');
    jzAnimator(L, 'hz In Hand Tremor Tilt', [['ADBE Text Rotation', 3.5]], tr + 'hzn(P*17+3,k+2)*tr*100');
} });

/* hzFloorSeep — 床下から滲む: each glyph soaks up from under the floor at its own rate, stalls halfway, then comes through
   (AE: the glyph grows up from its foot — squashed, not clipped — while it rises and takes its colour) */
jzReg('enter', 'hzFloorSeep', { selfHide: true, apply: function (m) {
    var L = m.L, S = m.size, cs = m.c.seed | 0, idx = ahzb_mix(m), T0 = [], LN = [], ST = [], i, k;
    for (i = 0; i < idx.length; i++) { k = ahzb_h(cs, idx[i], 241); T0.push(ahzb_r(k, 1) * 0.38); LN.push(0.4 + ahzb_r(k, 2) * 0.22); ST.push(0.3 + ahzb_r(k, 3) * 0.2); }
    var q = m.HD + AHZB_FNS + 'var j=textIndex-1,T=' + ahzb_arr(T0) + ',N=' + ahzb_arr(LN) + ',S=' + ahzb_arr(ST) +
        ';var q=cl((P-(T[j]||0))/(N[j]||0.5)),st=S[j]||0.4,e=(q>=1||P>=1)?1:(q<0.4?st*oc(q/0.4):(q<0.58?st:st+(1-st)*hzc((q-0.58)/0.42)));';
    jzAnimator(L, 'hz In Seep Hide', [['ADBE Text Opacity', 0]], q + '(time<DL||q<=0)?100:0');
    jzAnimator(L, 'hz In Seep Rise', [['ADBE Text Scale 3D', [100, 4, 100]], ['ADBE Text Position 3D', [0, S * 0.6, 0]]], q + '(1-e)*100');
    jzAnimator(L, 'hz In Seep Colour', [['ADBE Text Fill Color', jzHex(jzMixHex(jzTextColor(L), m.ctx.sc.bg, 0.6))]], q + 'e<0.98?(1-e)*100:0');
} });

/* hzTooClose — 近すぎる: it is suddenly there, a step nearer than it should be, stares, then backs off in three stiff steps */
jzReg('enter', 'hzTooClose', { apply: function (m) {
    var s = 'var hzt=1.12+0.015*Math.min(1,P/0.5);if(P>=0.5)hzt=1.135-0.065*oe((P-0.5)/0.07);if(P>=0.68)hzt=1.07-0.04*oe((P-0.68)/0.07);if(P>=0.86)hzt=1.03-0.03*oe((P-0.86)/0.07);if(P>=1)hzt=1;';
    m.parts.sc.push(s + 'f=[f[0]*hzt,f[1]*hzt];');
    var ab = ahzb_about(m, 'hzt'); if (ab) m.parts.pos.push(s + ab);
    m.parts.op.push('f*=Math.min(1,P/0.06);');
} });

/* hzWrongGlyph — 逆さの一字: the line fades up with one glyph hanging head-down; it notices late and turns itself right */
jzReg('enter', 'hzWrongGlyph', { selfHide: true, apply: function (m) {
    var L = m.L, S = m.size, cs = m.c.seed | 0, N = ahzb_N(m.c), F = ahzb_flags(ahzb_mix(m), ahzb_h(cs, 251) % N);
    var q = m.HD + AHZB_FNS + 'var j=textIndex-1,F=' + ahzb_arr(F) + ',O=' + ahzb_arr(ahzb_ord(m)) +
        ',me=F[j]==1,a=hzm(0,0.3,P-(O[j]||0)*0.12),q=cl((P-0.7)/0.24);if(P>=1){a=1;q=1;}';
    var rnd = 'posterizeTime(24);seedRandom(SD+Math.floor(time*24)*5,true);var w=random(-1,1);';
    jzAnimator(L, 'hz In Wrong Fade', [['ADBE Text Opacity', 0]], q + 'time<DL?100:((me&&P>=0.58)?0:(1-a)*100)');
    jzAnimator(L, 'hz In Wrong Turn', [['ADBE Text Rotation', 180]], q + rnd + '!me?0:(P<0.58?100:(P<0.7?100+w*5:(q>=1?0:(1-ob(q,1.5))*100)))');
    jzAnimator(L, 'hz In Wrong Start', [['ADBE Text Position 3D', [S * 0.03, 0, 0]]], q + rnd + '(me&&P>=0.58&&P<0.7)?random(-1,1)*100:0');
    jzAnimator(L, 'hz In Wrong Red', [['ADBE Text Fill Color', jzHex(m.ctx.sc.accent)]], q + '(me&&a>0&&(P<0.7||q<0.5))?100:0');
} });

/* hzFromScratch — 掻き傷から: every glyph starts as a thin slanted scratch that is drawn, then swells into the letter */
jzReg('enter', 'hzFromScratch', { selfHide: true, apply: function (m) {
    var L = m.L, cs = m.c.seed | 0, idx = ahzb_mix(m), T0 = [], R = [], i, k;
    for (i = 0; i < idx.length; i++) { k = ahzb_h(cs, idx[i], 261); T0.push(ahzb_r(k, 1) * 0.45); R.push((ahzb_r(k, 2) < 0.5 ? -1 : 1) * (28 + ahzb_r(k, 3) * 30)); }
    var q = m.HD + AHZB_FNS + 'var j=textIndex-1,T=' + ahzb_arr(T0) + ',q=cl((P-(T[j]||0))/0.52);if(P>=1)q=1;var sx=1,sy=1,rt=0;' +
        'if(q<0.38){sx=0.05;sy=0.12+1.23*oc(q/0.38);rt=1;}else if(q<1){var e=hzc((q-0.38)/0.62);sx=0.05+0.95*e;sy=1.35-0.35*e;rt=1-e;}';
    jzAnimator(L, 'hz In Scratch Hide', [['ADBE Text Opacity', 0]], q + '(time<DL||q<=0)?100:0');
    jzAnimator(L, 'hz In Scratch', [['ADBE Text Scale 3D', [300, 300, 100]]], q + '[(sx-1)/2*100,(sy-1)/2*100,0]');
    jzAnimator(L, 'hz In Scratch Slant', [['ADBE Text Rotation', 58]], q + 'var R=' + ahzb_arr(R) + ';rt*(R[j]||0)/58*100');
} });

/* hzLateSnap — ずれて昇る: the glyphs creep up dim and out of true, and at the very end they all click into place at once */
jzReg('enter', 'hzLateSnap', { selfHide: true, apply: function (m) {
    var L = m.L, S = m.size, cs = m.c.seed | 0, idx = ahzb_mix(m), RX = [], RY = [], RR = [], i, k;
    for (i = 0; i < idx.length; i++) { k = ahzb_h(cs, idx[i], 271); RX.push(ahzb_rs(k, 1)); RY.push(ahzb_rs(k, 2)); RR.push(ahzb_rs(k, 3)); }
    var q = m.HD + 'var j=textIndex-1,u=Math.min(1,P/0.86),e=P<0.86?0:oe((P-0.86)/0.14),w=1-e;if(P>=1){e=1;w=0;}';
    jzAnimator(L, 'hz In Crooked', [['ADBE Text Position 3D', [S * 0.1, S * 0.64, 0]]], q + 'var X=' + ahzb_arr(RX) + ',Y=' + ahzb_arr(RY) + ';[(X[j]||0)*w*100,((Y[j]||0)*0.09+(1-u)*0.55)/0.64*w*100,0]');
    jzAnimator(L, 'hz In Crooked Tilt', [['ADBE Text Rotation', 11]], q + 'var R=' + ahzb_arr(RR) + ';(R[j]||0)*w*100');
    jzAnimator(L, 'hz In Crooked Dim', [['ADBE Text Opacity', 0]], q + 'var a=(0.12+0.5*u)*Math.min(1,P/0.1);time<DL?100:(1-(a+(1-a)*e))*100');
} });

/* hzLampSweep — 灯りが二度: a beam of light crosses and shows the words for a moment; dark again; when it comes back they stay */
jzReg('enter', 'hzLampSweep', { selfHide: true, apply: function (m) {
    var L = m.L, W = m.W, H = m.H, sl = ahzb_slots(L), dir = (ahzb_h(m.c.seed | 0, 281) & 1) === 1, U = [], i;
    for (i = 0; i < sl.length; i++) { var u = sl[i][0] + (sl[i][1] - H / 2) * 0.3; U.push(dir ? W - u : u); }
    var q = m.HD + AHZB_FNS + 'var U=' + ahzb_arr(U) + ',u=U[textIndex-1]||0,XA=' + jzN(-0.14 * W) + ',XB=' + jzN(1.14 * W) + ',BW=' + jzN(W * 0.13) + ',al=1;' +
        'if(P<0.42){var X=XA+(XB-XA)*P/0.42;al=0.85*hzq(Math.max(0,1-Math.abs(u-X)/BW));}else if(P<0.48)al=0;' +
        'else if(P<0.94){var X2=XA+(XB-XA)*(P-0.48)/0.46,dd=u-X2;al=dd<=0?1:0.85*hzq(Math.max(0,1-dd/BW));}';
    jzAnimator(L, 'hz In Lamp', [['ADBE Text Opacity', 0]], q + 'time<DL?100:(1-al)*100');
} });

/* ================================================================ EXITS */

/* hzOutOfLight — 灯りの外へ: the line sinks while the edge of the dark comes down over it from above
   (an inverted matte whose lower edge descends through the text block; a Linear Wipe when the text already has a matte) */
jzReg('exit', 'hzOutOfLight', { apply: function (m) {
    var L = m.L, S = m.size, r = jzRect(L), k = ahzb_scl(L), hb = r.height + S * 1.15;
    var lev = m.HD + AHZB_FNS + 'var lv=PO<=0?0:hzs(PO/0.92);';
    if (!ahzb_matted(L)) {
        var M = jzShapeLayer(m.ctx, 'hz dark edge', 0, 0), g = jzGrp(M, 'dark'), w = (r.width + S * 4) * k[0], up = S * 2 * k[1];
        var rc = jzAddRect(g, w, 1, 0);
        rc.property('ADBE Vector Rect Size').expression = lev + '[' + jzN(w) + ',PO<=0?0:' + jzN(up) + '+lv*' + jzN(hb * k[1]) + ']';
        rc.property('ADBE Vector Rect Position').expression = lev + '[0,(lv*' + jzN(hb * k[1]) + '-' + jzN(up) + ')/2]';
        jzAddFill(g, '#FFFFFF');
        jzXf(M, 'ADBE Position').setValue(ahzb_toComp(L, [r.left + r.width / 2, r.top - S * 0.4]));
        M.moveBefore(L); M.parent = L;
        L.trackMatteType = TrackMatteType.ALPHA_INVERTED;
        jzNoGhost(M);
    } else {
        var lw = jzEffect(L, 'ADBE Linear Wipe', 'hz Out Dark');
        jzEP(lw, 2, 180); jzEP(lw, 3, S * 0.1);
        jzEX(lw, 1, lev + '100*lv');
    }
    m.parts.pos.push('d=[d[0],d[1]+iq(PO)*SZ*0.45];');
    m.parts.op.push(AHZB_FNS + 'f*=1-hzm(0.8,1,PO);');
    jzAnimator(L, 'hz Out Dark Colour', [['ADBE Text Fill Color', jzHex(ahzb_night(m.ctx.sc))]], m.HD + AHZB_FNS + 'PO<=0?0:hzm(0,0.75,PO)*70');
} });

/* hzTaken — 攫われる: one after another, at uneven moments, a glyph is snatched sideways into the dark; the rest flinch */
jzReg('exit', 'hzTaken', { apply: function (m) {
    var L = m.L, S = m.size, cs = m.c.seed | 0, N = ahzb_N(m.c), idx = ahzb_mix(m), side = (ahzb_h(cs, 312) & 1) ? 1 : -1, k, i;
    // a seeded order of the glyphs (ranks) and N uneven moments in 0..0.8 (some long gaps)
    var ord = [], rk = [], gaps = [], tot = 0, times = [], acc = 0, T0 = [];
    for (k = 0; k < N; k++) ord.push(k);
    ord.sort(function (x, y) { return (ahzb_r(cs, x, 311) - ahzb_r(cs, y, 311)) || (x - y); });
    for (k = 0; k < N; k++) rk[ord[k]] = k;
    for (k = 0; k < N; k++) { var r = ahzb_r(cs, k, 917), g = 0.3 + (r < 0.25 ? 2 : r); gaps.push(g); tot += g; }
    for (k = 0; k < N; k++) { times.push(acc / tot * 0.8); acc += gaps[k]; }
    for (i = 0; i < idx.length; i++) T0.push(times[rk[idx[i]] || 0] || 0);
    var q = m.HD + 'var j=textIndex-1,T=' + ahzb_arr(T0) + ',q=PO<=0?-9:(PO-(T[j]||0))/0.1,tr=(PO>0&&q<0)?cl(1+q/2.5):0,c=cl(q);';
    var rnd = 'posterizeTime(24);seedRandom(textIndex*17+SD+Math.floor(time*24)*5,true);';
    jzAnimator(L, 'hz Out Flinch', [['ADBE Text Position 3D', [S * 0.07, 0, 0]]], q + rnd + '(' + jzN(-side * 0.05) + '+random(-1,1)*0.02)/0.07*tr*100');
    jzAnimator(L, 'hz Out Flinch Tilt', [['ADBE Text Rotation', 5]], q + rnd + 'random(-1,1)*tr*100');
    jzAnimator(L, 'hz Out Snatch', [['ADBE Text Position 3D', [side * m.W * 0.85 / ahzb_scl(L)[0], 0, 0]]], q + 'c*c*c*100');
    jzAnimator(L, 'hz Out Snatch Stretch', [['ADBE Text Scale 3D', [450, 65, 100]]], q + 'c*100');
    jzAnimator(L, 'hz Out Snatch Fade', [['ADBE Text Opacity', 0]], q + 'q>=1?100:60*c');
} });

/* hzThumbSmear — 指で擦る: three slow rubs back and forth; each one drags the ink sideways and leaves less of it */
jzReg('exit', 'hzThumbSmear', { apply: function (m) {
    var pre = 'var hk=Math.min(2,Math.floor(PO/0.3)),hv=PO/0.3-hk,hsw=Math.sin(Math.min(1,hv)*Math.PI),hdr=((' + (ahzb_h(m.c.seed | 0, 321) & 1) + '+hk)%2)?1:-1;';
    m.parts.pos.push('if(PO>0&&PO<0.9){' + pre + 'd=[d[0]+hdr*hsw*SZ*0.1,d[1]+hsw*SZ*0.015*(hk-1)];}');
    m.parts.op.push('if(PO>=0.9)f=0;else if(PO>0){' + pre + 'var hL=[1,0.62,0.3,0],hx=cl((hv-0.15)/0.7);f*=hL[hk]+(hL[hk+1]-hL[hk])*hx*hx*(3-2*hx);}');
    var db = jzEffect(m.L, 'ADBE Motion Blur', 'hz Out Smear');
    jzEP(db, 1, 90); jzEX(db, 2, m.HD + pre + '(PO>0&&PO<0.9)?hsw*SZ*0.22:0');
} });

/* hzRetinal — 目に焼きつく: the words cut out, but their outline stays on the eye, swelling and paling */
jzReg('exit', 'hzRetinal', { apply: function (m) {
    var L = m.L, S = m.size, col = jzMixHex(jzTextColor(L), m.ctx.sc.bg, 0.3), on = m.HD + 'PO>=0.06?100:0';
    var hq = 'var hzr=PO>=0.06?(PO-0.06)/0.94:0,hzz=1+0.05*hzr;';
    if (ahzb_addStroke(L)) jzAnimator(L, 'hz Out Burn Line', [['ADBE Text Stroke Width', Math.max(1, S * 0.018)]], on);
    jzAnimator(L, 'hz Out Burn Colour', [['ADBE Text Stroke Color', jzHex(col)]], on);
    jzAnimator(L, 'hz Out Burn Hollow', [['ADBE Text Fill Opacity', 0]], on);
    m.parts.op.push('if(PO>=0.06){' + hq + 'f*=0.85*(1-hzr)*(1-hzr);}');
    m.parts.sc.push(hq + 'f=[f[0]*hzz,f[1]*hzz];');
    m.parts.pos.push(hq + ahzb_about(m, 'hzz') + 'd=[d[0],d[1]-SZ*0.04*hzr];');
} });

/* hzDragCorner — 隅へ引きずる: something tugs the whole line towards a corner — a tug, a pause, a harder tug — and it is gone */
jzReg('exit', 'hzDragCorner', { apply: function (m) {
    var cs = m.c.seed | 0, sxn = (ahzb_h(cs, 331) & 1) ? 1 : -1, syn = ahzb_r(cs, 332) < 0.75 ? 1 : -1;
    var G = 'var hg=PO<0.3?0.07*oc((PO-0.04)/0.14):(PO<0.58?0.07+0.17*oc((PO-0.3)/0.14):0.24+0.76*ic((PO-0.58)/0.42)),hs=1-0.45*hg,ha=' + jzN(sxn * syn * -16) + '*hg;';
    m.parts.sc.push('if(PO>0){' + G + 'f=[f[0]*hs,f[1]*hs];}');
    m.parts.rot.push('if(PO>0){' + G + 'r+=ha;}');
    m.parts.op.push(AHZB_FNS + 'f*=1-hzm(0.7,0.97,PO);');
    var jit = 'var hj=0;if((PO>0.2&&PO<0.3)||(PO>0.46&&PO<0.58)){seedRandom(SD+Math.floor(time*24)*3,true);hj=random(-1,1)*SZ*0.012;}';
    var off = jzN(sxn * m.W * 0.62) + '*hg+hj', offY = jzN(syn * m.H * 0.62) + '*hg';
    if (ahzb_hasParent(m.L)) m.parts.pos.push('if(PO>0){' + G + jit + 'd=[d[0]+' + off + ',d[1]+' + offY + '];}');
    else m.parts.pos.push('if(PO>0){' + G + jit + 'var hcx=thisComp.width/2,hcy=thisComp.height/2,hx=value[0]-hcx,hy=value[1]-hcy,hr=ha*Math.PI/180,hc=Math.cos(hr),hn=Math.sin(hr);' +
        'd=[d[0]+hcx+(hx*hc-hy*hn)*hs+' + off + '-value[0],d[1]+hcy+(hx*hn+hy*hc)*hs+' + offY + '-value[1]];}');
} });

/* hzFlatline — 心停止: two beats, each weaker; then the line goes flat, holds as a thin trace, and shortens to nothing */
jzReg('exit', 'hzFlatline', { apply: function (m) {
    var v = ahzb_vert(m.L);
    m.parts.sc.push(AHZB_FNS + 'if(PO>0){if(PO<0.46){var hb=1+0.08*Math.exp(-Math.pow((PO-0.08)/0.035,2))+0.045*Math.exp(-Math.pow((PO-0.27)/0.04,2));f=[f[0]*hb,f[1]*hb];}' +
        'else{var hf=1-0.965*oe((PO-0.46)/0.14),hk=PO>0.8?Math.max(0.02,1-hzc((PO-0.8)/0.2)):1;f=' + (v ? '[f[0]*hf,f[1]*hk]' : '[f[0]*hk,f[1]*hf]') + ';}}');
    m.parts.op.push(AHZB_FNS + 'if(PO>0.8)f*=1-hzm(0.6,1,(PO-0.8)/0.2);');
} });

/* hzShadowOff — 影だけ去る: the words fade where they stand while their shadow slips out from under them and walks off
   (the shadow = a one-colour copy of the lyric behind it; it leans as it walks through a per-glyph Skew animator) */
jzReg('exit', 'hzShadowOff', { apply: function (m) {
    var L = m.L, sc = m.ctx.sc, cs = m.c.seed | 0, dir = (ahzb_h(cs, 341) & 1) ? 1 : -1;
    var shc = jzMixHex(jzTextColor(L), sc.bg, ahzb_dark(sc.bg) ? 0.62 : 0.45);
    m.parts.op.push(AHZB_FNS + 'f*=1-hzm(0.08,0.5,PO);');
    var td = null; try { td = L.property('ADBE Text Properties').property('ADBE Text Document').value; } catch (e) {}
    if (!td || td.applyFill === false) return;
    var D = ahzb_copy(m, 'hz shadow', shc); if (!D) return;
    var wk = m.HD + AHZB_FNS + 'var slip=oc(PO/0.3),walk=iq((PO-0.3)/0.7);';
    jzSetExpr(jzXf(D, 'ADBE Position'), wk + '[value[0]+' + dir + '*(SZ*0.22*slip+thisComp.width*0.55*walk),value[1]+SZ*0.1*slip+Math.abs(Math.sin(walk*14))*SZ*0.04]');
    jzSetExpr(jzXf(D, 'ADBE Opacity'), wk + 'PO<=0?0:value*0.75*hzm(0,0.2,PO)*(1-hzm(0.72,1,PO))');
    jzAnimator(D, 'hz Out Shadow Lean', [['ADBE Text Skew', -dir * 14]], wk + 'walk*100');
} });

/* hzBackAway — 後ずさり: it retreats one stiff step at a time, smaller and dimmer, and after the last step it is not there */
jzReg('exit', 'hzBackAway', { apply: function (m) {
    var cs = m.c.seed | 0, RS = [], k;
    for (k = 0; k < 4; k++) RS.push(ahzb_rs(cs, k, 351));
    var B = 'var hL=0,hsh=0,hat=[0.06,0.28,0.5,0.72],hrs=' + ahzb_arr(RS) + ';for(var hi=0;hi<4;hi++){var he=oe((PO-hat[hi])/0.08);hL+=he;hsh+=he*hrs[hi];}var hs=Math.pow(0.88,hL);';
    m.parts.sc.push('if(PO>0){' + B + 'f=[f[0]*hs,f[1]*hs];}');
    m.parts.pos.push('if(PO>0){' + B + ahzb_about(m, 'hs') + 'd=[d[0]+hsh*' + jzN(m.W * 0.012) + ',d[1]-hL*' + jzN(m.H * 0.008) + '];}');
    m.parts.op.push('if(PO>=0.92)f=0;else if(PO>0){' + B + 'f*=Math.pow(0.7,hL);}');
    jzAnimator(m.L, 'hz Out Back Dim', [['ADBE Text Fill Color', jzHex(m.ctx.sc.bg)]], m.HD + 'var o=0;if(PO>0){' + B + 'o=12*hL;}o');
} });

/* ================================================================ HOLDS (strength hk = AMT × motionK, as in the browser) */

/* hzSlowBreath — 遅すぎる呼吸: a very long breath in, held with a faint tremor, and let go all at once */
jzReg('hold', 'hzSlowBreath', { apply: function (m) {
    var V = AHZB_FNS + 'var hbk=AMT*' + jzN(ahzb_motionK(m)) + ',hbu=time/6.2+' + jzN(ahzb_r(m.c.seed | 0, 411) * 0.25) + ';hbu=hbu-Math.floor(hbu);' +
        'var hbv=hbu<0.55?hzs(hbu/0.55):(hbu<0.8?1:(hbu<0.86?1-oe((hbu-0.8)/0.06):0)),hbs=1+0.05*hbv*hbk;';
    m.parts.sc.push(V + 'f=[f[0]*hbs,f[1]*hbs];');
    m.parts.pos.push(V + ahzb_about(m, 'hbs') + 'if(hbu>=0.55&&hbu<0.8){seedRandom(SD+Math.floor(time*24)*7,true);d=[d[0]+random(-1,1)*SZ*0.006*hbk,d[1]+random(-1,1)*SZ*0.004*hbk];}');
    m.parts.op.push(V + 'f*=1-0.14*hbv*Math.min(1,hbk);');
} });

/* hzLoneTremor — 一字の震え: everything is dead still except one glyph, which shivers in slow swells */
jzReg('hold', 'hzLoneTremor', { apply: function (m) {
    var S = m.size, cs = m.c.seed | 0, N = ahzb_N(m.c), F = ahzb_flags(ahzb_mix(m), ahzb_h(cs, 421) % N);
    var q = m.HD + 'var F=' + ahzb_arr(F) + ',hk=AMT*' + jzN(ahzb_motionK(m)) + ',sw=Math.pow(0.5-0.5*Math.cos(time*Math.PI*2/3.4+' + jzN(ahzb_r(cs, 422) * Math.PI * 2) + '),1.6),' +
        'a=(F[textIndex-1]==1&&hk>0.02&&sw>0.02)?sw*hk/1.6*100:0;posterizeTime(24);seedRandom(SD+Math.floor(time*24)*11,true);';
    jzAnimator(m.L, 'hz Hold Tremor', [['ADBE Text Position 3D', [S * 0.04 * 1.6, S * 0.03 * 1.6, 0]]], q + '[random(-1,1)*a,random(-1,1)*a,0]');
    jzAnimator(m.L, 'hz Hold Tremor Tilt', [['ADBE Text Rotation', 6 * 1.6]], q + 'random(-1,1)*a');
} });

/* hzPassing — 何かが通る: an unseen thing moves along the line; where it is, the glyphs dim and lean out of its way */
jzReg('hold', 'hzPassing', { apply: function (m) {
    var L = m.L, S = m.size, W = m.W, cs = m.c.seed | 0, sl = ahzb_slots(L), GX = [], i;
    for (i = 0; i < sl.length; i++) GX.push(sl[i][0]);
    var q = m.HD + 'var GX=' + ahzb_arr(GX) + ',hk=AMT*' + jzN(ahzb_motionK(m)) + ',T=time/3.6+' + jzN(ahzb_r(cs, 431) * 0.4) + ',cyc=Math.floor(T),u=(T-cyc)/0.62,f=0,sg=1;' +
        'if(u<1&&hk>0.02){var bk=((' + (ahzb_h(cs, 432) & 1) + '+cyc)%2)==1,X=' + jzN(W) + '*(bk?1.2-1.4*u:1.4*u-0.2),dd=((GX[textIndex-1]||0)-X)/' + jzN(W * 0.15) + ';' +
        'if(dd>-1&&dd<1){f=(1-dd*dd)*(1-dd*dd);sg=dd<0?-1:1;}}var a=f*hk/1.6*100;';
    jzAnimator(L, 'hz Hold Passing Dim', [['ADBE Text Opacity', 0]], q + '60*f*Math.min(1,hk)');
    jzAnimator(L, 'hz Hold Passing Lean', [['ADBE Text Position 3D', [S * 0.07 * 1.6, S * 0.02 * 1.6, 0]]], q + '[sg*a,a,0]');
    jzAnimator(L, 'hz Hold Passing Tilt', [['ADBE Text Rotation', 8 * 1.6]], q + 'sg*a');
} });

/* hzPresence — 薄れる気配: each glyph is, at its own slow pace, a little less there — and then back */
jzReg('hold', 'hzPresence', { apply: function (m) {
    var S = m.size, cs = m.c.seed | 0, idx = ahzb_mix(m), A = [], i;
    for (i = 0; i < idx.length; i++) A.push((idx[i] * 7.31) % 97);
    var q = m.HD + AHZB_FNS + 'var A=' + ahzb_arr(A) + ',hk=AMT*' + jzN(jzClamp(ahzb_motionK(m), 0.5, 1.2)) + ',d=hk<0.02?0:hzm(0.05,0.75,hzn((time*0.42+(A[textIndex-1]||0))*3,' + ((cs + 441) % 97) + '));';
    jzAnimator(m.L, 'hz Hold Presence', [['ADBE Text Opacity', 0]], q + '62*d*Math.min(1,hk)');
    jzAnimator(m.L, 'hz Hold Presence Sink', [['ADBE Text Position 3D', [0, S * 0.035 * 1.2, 0]]], q + 'd*hk/1.2*100');
} });

/* hzLoom — 背後の影: a larger, faint copy slowly rises up behind the words, and drops away the moment it is noticed */
jzReg('hold', 'hzLoom', { apply: function (m) {
    var L = m.L, sc = m.ctx.sc, cs = m.c.seed | 0, td = null, op = 100;
    try { td = L.property('ADBE Text Properties').property('ADBE Text Document').value; op = jzXf(L, 'ADBE Opacity').value; } catch (e) {}
    if (!td || td.applyFill === false || op < 50) return;
    var D = ahzb_copy(m, 'hz loom', jzMixHex(jzTextColor(L), sc.bg, ahzb_dark(sc.bg) ? 0.5 : 0.35)); if (!D) return;
    // the copy grows about the middle of its box (left / right aligned lines are anchored at their edge)
    var w = jzRect(L).width * ahzb_scl(L)[0], dx = 0;
    if (!ahzb_vert(L)) { if (td.justification === ParagraphJustification.LEFT_JUSTIFY) dx = -w / 2; else if (td.justification === ParagraphJustification.RIGHT_JUSTIFY) dx = w / 2; }
    var V = m.HD + AHZB_FNS + 'var hk=AMT*' + jzN(ahzb_motionK(m)) + ',hu=time/4.8+' + jzN(ahzb_r(cs, 451) * 0.3) + ';hu=hu-Math.floor(hu);' +
        'var hv=hu<0.8?hzs(hu/0.8):1-oe((hu-0.8)/0.2),hs=1+0.17*hv*Math.min(1.2,hk);';
    jzSetExpr(jzXf(D, 'ADBE Scale'), V + '[value[0]*hs,value[1]*hs]');
    jzSetExpr(jzXf(D, 'ADBE Position'), V + '[value[0]+' + jzN(dx) + '*(hs-1),value[1]-SZ*0.1*hv*hk]');
    jzSetExpr(jzXf(D, 'ADBE Opacity'), V + '(hk<0.02||hv<0.02)?0:value*0.34*Math.min(1,hk)*Math.sqrt(hv)');
} });

/* ================================================================ TREATMENTS */
function ahzb_alive(L, amin) {
    try {
        var td = L.property('ADBE Text Properties').property('ADBE Text Document').value;
        if (td.applyFill === false || !(td.fontSize > 1) || jzTrim(String(td.text || '')) === '') return false;
        return jzXf(L, 'ADBE Opacity').value >= (amin == null ? 0.9 : amin) * 100 - 0.01;
    } catch (e) { return false; }
}
function ahzb_head(ctx, L, o) { return jzHead(ctx, { mi: (o && o.mi) || 0, size: jzFontSize(L) }); }

/* hzUneven — むらのある字: some glyphs took the ink badly — a few are much fainter than the rest, and sit a hair low */
jzReg('treat', 'hzUneven', {
    plan: function (rng, st) { return { lo: rng.range(0.36, 0.48), rate: rng.range(0.2, 0.34) }; },
    apply: function (ctx, L, P, o) {
        if (!ahzb_alive(L)) return;
        var cs = ctx.cut.seed | 0, idx = ahzb_idx(L, ctx.cut, o && o.mi), sz = jzFontSize(L), lo = P.lo || 0.42, rate = P.rate || 0.26, N = ahzb_N(ctx.cut);
        var sure = N > 1 ? ahzb_h(cs, 512) % N : -1, A = [], D = [], i;
        for (i = 0; i < idx.length; i++) {
            var ix = idx[i], k = ahzb_h(cs, ix, 511);
            // never two weak glyphs in a row
            var weak = ix === sure || (ahzb_r(k, 1) < rate && ix !== sure + 1 && !(ahzb_r(ahzb_h(cs, ix - 1, 511), 1) < rate && (ix & 1)));
            A.push(weak ? (1 - lo) * 100 : (0.28 - 0.28 * ahzb_r(k, 2)) * 100); D.push(weak ? 100 : 0);
        }
        jzAnimator(L, 'hz Uneven ink', [['ADBE Text Opacity', 0]], 'var a=' + ahzb_arr(A) + ';a[textIndex-1]||0');
        jzAnimator(L, 'hz Uneven sag', [['ADBE Text Position 3D', [0, sz * 0.025, 0]]], 'var a=' + ahzb_arr(D) + ';a[textIndex-1]||0');
    }
});

/* hzHairlines — 細い傷: a few long, thin cuts (background colour) run straight through the words, each trailing off as a faint line */
jzReg('treat', 'hzHairlines', {
    plan: function (rng, st) { return { n: rng.int(3, 5), slant: rng.range(-0.22, 0.22) }; },
    apply: function (ctx, L, P, o) {
        if (!ahzb_alive(L)) return;
        var sc = ctx.sc, r = jzRect(L), w = r.width, h = r.height; if (w < 2 || h < 2) return;
        var sz = jzFontSize(L), seed = (ctx.cut.seed | 0) + ((o && o.mi) || 0) * 101, one = jzCount(ahzb_text(L)) <= 1, n = one ? 1 + (seed & 1) : (P.n || 4), j;
        var x0 = r.left, x1 = r.left + w, y0 = r.top, y1 = r.top + h, lw = Math.max(1.2 * ctx.u, sz * 0.014), lng = one || w >= h;
        var S = ahzb_shapeOn(ctx, L, 'hz hairlines');
        for (j = 0; j < n; j++) {
            var f = (j + 0.5 + ahzb_rs(seed, j, 521) * 0.32) / n, sl = ((P.slant || 0) + ahzb_rs(seed, j, 522) * 0.12) * (lng ? h : w), a0, a1;
            if (lng) { var y = jzLerp(y0, y1, 0.12 + 0.76 * f); a0 = [x0 - sz * 0.12, y - sl]; a1 = [x1 + sz * 0.12, y + sl]; }
            else { var x = jzLerp(x0, x1, 0.12 + 0.76 * f); a0 = [x - sl, y0 - sz * 0.12]; a1 = [x + sl, y1 + sz * 0.12]; }
            var g = jzGrp(S, 'cut ' + (j + 1));
            jzAddPath(g, [a0, a1], false); jzAddStroke(g, sc.bg, lw * (1 + ahzb_r(seed, j, 523)));
            // the cut runs a little past the letters as a faint line
            var ex = sz * (0.25 + 0.5 * ahzb_r(seed, j, 524)), ux = a1[0] - a0[0], uy = a1[1] - a0[1], ul = Math.sqrt(ux * ux + uy * uy) || 1;
            var first = ahzb_r(seed, j, 525) < 0.5, e0 = first ? a0 : a1, sg = first ? -1 : 1;
            var g2 = jzGrp(S, 'trail ' + (j + 1));
            jzAddPath(g2, [e0, [e0[0] + sg * ux / ul * ex, e0[1] + sg * uy / ul * ex]], false); jzAddStroke(g2, sc.sub, lw * 0.8, 40);
        }
        jzSetExpr(jzXf(S, 'ADBE Opacity'), ahzb_head(ctx, L, o) + 'value*(hasParent?parent.transform.opacity/100:1)*cl((time-DL-IN*0.5)/(IN*0.5+0.01))*(1-iq(PO))');
        jzNoGhost(S);
    }
});

/* hzColdRim — 冷たい縁: the letters fall into shade; only a thin cold edge on one side still catches the light
   (the lyric takes the shade colour; a hard, slightly soft Drop Shadow in its old colour is the lit edge) */
jzReg('treat', 'hzColdRim', {
    plan: function (rng, st) { return { side: rng.pick([-1, 1]), d: rng.range(0.022, 0.032) }; },
    apply: function (ctx, L, P, o) {
        if (!ahzb_alive(L)) return;
        var c0 = jzTextColor(L), bg = ctx.sc.bg, sz = jzFontSize(L), d = Math.max(1.5 * ctx.u, sz * (P.d || 0.026)), dx = (P.side || -1) * d, dy = -d * 0.8;
        var e = jzEffect(L, 'ADBE Drop Shadow', 'hz Cold Rim');
        jzEP(e, 1, jzHex(c0)); jzEP(e, 2, 255); jzEP(e, 3, ((Math.atan2(dx, -dy) * 180 / Math.PI) + 360) % 360); jzEP(e, 4, Math.sqrt(dx * dx + dy * dy)); jzEP(e, 5, sz * 0.012);
        var shade = jzMixHex(c0, bg, jzContrast(c0, bg) > 6 ? 0.6 : 0.48);
        jzTextDoc(L, function (td) { td.fillColor = jzHex(shade); });
    }
});

/* hzHusk — 抜け殻: only a broken, irregular outline is left, with the faintest stain of the letter inside
   (stroke + a faint fill, seen through an alpha matte of slanted bands whose widths follow the browser's dash pattern) */
jzReg('treat', 'hzHusk', {
    plan: function (rng, st) { return { k: rng.range(0.85, 1.25), fill: rng.range(0.12, 0.2) }; },
    apply: function (ctx, L, P, o) {
        if (!ahzb_alive(L)) return;
        var td0 = L.property('ADBE Text Properties').property('ADBE Text Document').value;
        if (td0.applyStroke && td0.strokeWidth > 0) return;
        var sz = jzFontSize(L), k = P.k || 1, c0 = jzTextColor(L), i;
        jzTextDoc(L, function (td) { td.applyStroke = true; td.strokeColor = jzHex(c0); td.strokeWidth = Math.max(1.3 * ctx.u, sz * 0.024); try { td.strokeOverFill = true; } catch (e) {} });
        jzAnimator(L, 'hz Husk stain', [['ADBE Text Fill Opacity', (P.fill || 0.15) * 100]], '100');
        if (ahzb_matted(L)) return;
        var r = jzRect(L), cx = r.left + r.width / 2, cy = r.top + r.height / 2, half = (r.width + r.height) * 0.5 + sz * 2;
        var pat = [0.2, 0.05, 0.05, 0.07, 0.34, 0.06, 0.1, 0.11], per = 0;
        for (i = 0; i < pat.length; i++) per += pat[i];
        var sk = sz * k * Math.max(1, (half * 2 / (per * sz * k)) * 4 / 160);       // at most ~160 bands on very long lines
        var S = ahzb_shapeOn(ctx, L, 'hz husk matte'), g = jzGrp(S, 'bands'), u = -half, n = 0;
        while (u < half && n < 170) {
            var dl = Math.max(1, pat[(n * 2) % pat.length] * sk), gl = Math.max(1, pat[(n * 2 + 1) % pat.length] * sk);
            jzAddRect(g, dl, half * 2, 0, u + dl / 2, 0);
            u += dl + gl; n++;
        }
        jzAddFill(g, '#FFFFFF');
        jzGX(g).property('ADBE Vector Position').setValue([cx, cy]);
        jzGX(g).property('ADBE Vector Rotation').setValue(-38);
        L.moveAfter(S);
        var ok = false;
        if (typeof L.setTrackMatte === 'function') { try { L.setTrackMatte(S, TrackMatteType.ALPHA); ok = true; } catch (e1) { ok = false; } }
        if (!ok) L.trackMatteType = TrackMatteType.ALPHA;
        S.enabled = false;
        jzNoGhost(S);
    }
});

/* hzDragMarks — 引きずり跡: every letter has been dragged a little way; a fading trail of it hangs underneath
   (stacked Drop Shadows: each stage copies everything so far, so the trail grows from the lyric's own pixels and thins out) */
jzReg('treat', 'hzDragMarks', {
    plan: function (rng, st) { return { len: rng.range(0.26, 0.42), lean: rng.range(-0.06, 0.06) }; },
    apply: function (ctx, L, P, o) {
        if (!ahzb_alive(L)) return;
        var sz = jzFontSize(L), col = jzMixHex(jzTextColor(L), ctx.sc.bg, 0.45), dx = sz * (P.lean || 0), dy = sz * (P.len || 0.4);
        var len = Math.sqrt(dx * dx + dy * dy) || 1, ux = dx / len, uy = dy / len, cov = 0, d0 = Math.max(0.5, 1.5 * ctx.u), n = 0;
        while (cov < len - 0.01 && n < 14) {
            var st = Math.min(cov < d0 * 2 ? d0 : cov * 0.4, len - cov), t = (cov + st / 2) / len;
            var e = jzEffect(L, 'ADBE Drop Shadow', 'hz Drag ' + (n + 1));
            jzEP(e, 1, jzHex(col)); jzEP(e, 2, Math.round(255 * 0.6 * (1 - 0.8 * t))); jzEP(e, 3, ((Math.atan2(ux, -uy) * 180 / Math.PI) + 360) % 360); jzEP(e, 4, st); jzEP(e, 5, 0);
            cov += st; n++;
        }
    }
});

/* ================================================================ CAMERA (jzCamHead: DUR, KM, SD, cu, ios + JZ_FNS) */

/* hzCreepFreeze — 寄って固まる: a very slow push that stops dead mid-move, as if it heard something, and eases a hair back */
jzReg('cam', 'hzCreepFreeze', {
    plan: function (rng, st) { return { at: rng.range(0.5, 0.68), r: rng.range(-0.6, 0.6) }; },
    apply: function (cam, P) {
        var d = Math.max(0.4, cam.cut.dur), H0 = jzCamHead(cam) + 'var T0=' + jzN(d * (P.at || 0.6)) + ',u=Math.min(1,time/T0),bk=time>T0?oe((time-T0)/0.14):0;';
        jzSetExpr(jzXf(cam.nul, 'ADBE Scale'), H0 + 'var s=1+0.085*KM*u-0.012*KM*bk;[value[0]*s,value[1]*s]');
        jzSetExpr(jzXf(cam.nul, 'ADBE Position'), H0 + '[value[0],value[1]-' + jzN(cam.H * 0.01) + '*KM*u]');
        jzSetExpr(jzXf(cam.nul, 'ADBE Rotate Z'), H0 + 'value+' + jzN(P.r || 0) + '*KM*u');
    }
});

/* hzGlanceBack — 振り返り: a slow drift one way, a quick look over the shoulder the other way, held, and a reluctant return */
jzReg('cam', 'hzGlanceBack', {
    plan: function (rng, st) { return { at: rng.range(0.32, 0.5), dir: rng.pick([-1, 1]) }; },
    apply: function (cam, P) {
        var d = Math.max(0.6, cam.cut.dur), dir = P.dir || 1, W = cam.W, H = cam.H;
        var H0 = jzCamHead(cam) + 'var d=' + jzN(d) + ',hold=Math.min(0.55,d*0.2),q=time-d*' + jzN(P.at || 0.4) + ',gl=q<=0?0:(q<0.13?oe(q/0.13):(q<0.13+hold?1:1-ios((q-0.13-hold)/0.9)));';
        jzSetExpr(jzXf(cam.nul, 'ADBE Position'), H0 + '[value[0]+' + jzN(dir * W * 0.02) + '*KM*ios(time/d)-' + jzN(dir * W * 0.045) + '*KM*gl,value[1]+' + jzN(H * 0.004) + '*KM*gl]');
        jzSetExpr(jzXf(cam.nul, 'ADBE Rotate Z'), H0 + 'value-' + jzN(dir * 1.3) + '*KM*gl');
        jzSetExpr(jzXf(cam.nul, 'ADBE Scale'), H0 + 'var s=1.035+0.012*KM*gl;[value[0]*s,value[1]*s]');
    }
});

/* hzHeldBreath — 息を殺す: the frame sways with slow breathing, then the breath is held — stock still but for a tremor — and let out */
jzReg('cam', 'hzHeldBreath', {
    plan: function (rng, st) { return { at: rng.range(0.3, 0.5), len: rng.range(0.9, 1.5), per: rng.range(2.8, 3.6) }; },
    apply: function (cam, P) {
        var d = Math.max(0.6, cam.cut.dur), hs = d * (P.at || 0.4), len = Math.min(P.len || 1.2, d * 0.4), sd = (cam.cut.seed | 0) % 97, W = cam.W, H = cam.H;
        var H0 = jzCamHead(cam) + AHZB_FNS + 'var t=time,hs=' + jzN(hs) + ',len=' + jzN(len) + ',held=t>=hs&&t<hs+len,te=t<hs?t:(held?hs:t-len),ph=te*Math.PI*2/' + jzN(P.per || 3.2) +
            ',br=Math.sin(ph),tr=held?Math.min(1,(t-hs)/0.3):0;';
        jzSetExpr(jzXf(cam.nul, 'ADBE Scale'), H0 + 'var s=1.03+0.014*KM*br;[value[0]*s,value[1]*s]');
        jzSetExpr(jzXf(cam.nul, 'ADBE Position'), H0 + '[value[0]+Math.sin(ph*0.5)*' + jzN(W * 0.004) + '*KM+hzn(t*45,' + (sd + 1) + ')*' + jzN(W * 0.0014) + '*KM*tr,' +
            'value[1]-' + jzN(H * 0.009) + '*KM*br+hzn(t*39,' + sd + ')*' + jzN(H * 0.0016) + '*KM*tr]');
        jzSetExpr(jzXf(cam.nul, 'ADBE Rotate Z'), H0 + 'value+0.35*KM*Math.sin(ph*0.5+1)');
    }
});

/* hzColdShiver — 悪寒: perfectly still — then a short, fine shudder runs through the frame and dies away */
jzReg('cam', 'hzColdShiver', {
    plan: function (rng, st) { return { per: rng.range(1.9, 2.6), rate: rng.range(0.6, 0.85) }; },
    apply: function (cam, P) {
        var W = cam.W, H = cam.H;
        // hh() (not random()): the three properties must agree on when a shiver starts
        var H0 = jzCamHead(cam) + 'var per=' + jzN(P.per || 2.2) + ',cyc=Math.floor(time/per),sd=SD%997,since=time-cyc*per-(0.15+hh(sd+cyc*7.13)*0.45)*per,' +
            'en=(since>0&&hh(sd+cyc*3.71+5.5)<' + jzN(P.rate || 0.75) + ')?Math.exp(-since*5.5)*(1-Math.exp(-since*45))*KM:0,w=since*Math.PI*2;';
        jzSetExpr(jzXf(cam.nul, 'ADBE Position'), H0 + '[value[0]+Math.sin(w*13)*' + jzN(W * 0.0065) + '*en,value[1]+Math.sin(w*17+1)*' + jzN(H * 0.004) + '*en]');
        jzSetExpr(jzXf(cam.nul, 'ADBE Rotate Z'), H0 + 'value+Math.sin(w*11+2)*0.8*en');
        jzSetExpr(jzXf(cam.nul, 'ADBE Scale'), H0 + 'var s=1.03+0.012*KM*cl(time/Math.max(0.5,DUR))-0.014*en;[value[0]*s,value[1]*s]');
    }
});

/* ================================================================ SCREEN EFFECTS (main comp; p = the browser's k) */
function ahzb_evS(ev) { return ahzb_h(Math.round(ev.t * 1000), 7741); }
function ahzb_amp(ev, lo, hi) { return jzClamp(jzClamp(ev.amp == null ? 1 : ev.amp, 0.5, 1.3), lo == null ? 0.5 : lo, hi == null ? 1.3 : hi); }
function ahzb_hd(f, ev, extra) { return jzEvHead(ev.t, ev.dur, ',W=' + f.W + ',H=' + f.H + (extra || '')) + AHZB_FNS; }
function ahzb_poly(L, pts, mode) {
    var mk = L.property('ADBE Mask Parade').addProperty('ADBE Mask Atom'), sh = new Shape();
    sh.vertices = pts; sh.closed = true;
    mk.property('ADBE Mask Shape').setValue(sh);
    if (mode) mk.maskMode = mode;
    return mk;
}

/* hzTear — 縦の裂け目: the picture rips open along a ragged vertical line, the halves slip against each other, and it closes
   (two masked adjustment layers push the halves apart; the dark of the gap is a solid between two ragged masks that widen) */
jzReg('fx', 'hzTear', { build: function (f, ev) {
    var W = f.W, H = f.H, s = ahzb_evS(ev), M = Math.min(W, H), n = 14, j, sd;
    var x0 = W * ahzb_rr(0.28, 0.72, s, 1), slip = M * 0.014 * (ahzb_r(s, 2) < 0.5 ? 1 : -1), lean = ahzb_rs(s, 3) * W * 0.05, pts = [];
    for (j = 0; j <= n; j++) pts.push([x0 + lean * (j / n - 0.5) + ahzb_rs(s, j, 4) * M * 0.022, j === 0 ? -H * 0.2 : (j === n ? H * 1.2 : H * j / n)]);
    var hd = ahzb_hd(f, ev, ',G0=' + jzN(M * 0.075 * ahzb_amp(ev))) + 'var op=p<0.18?oe(p/0.18):1-hzc((p-0.18)/0.82),gap=G0*op;if(gap<0.6){gap=0;op=0;}\n';
    function half(side) {
        var q = [[side < 0 ? -W : W * 2, -H * 0.2]], i;
        for (i = 0; i <= n; i++) q.push(pts[i]);
        q.push([side < 0 ? -W : W * 2, H * 1.2]);
        return q;
    }
    for (sd = -1; sd <= 1; sd += 2) {
        var A = jzAdjLayer(f.comp, 'JZ FX hzTear ' + (sd < 0 ? 'left' : 'right'), ev.t, ev.dur);
        ahzb_poly(A, half(sd));
        var tr = jzEffect(A, 'ADBE Geometry2', 'hz Tear Slip');
        jzEX(tr, 2, hd + '[value[0]+' + sd + '*gap/2,value[1]+' + jzN(sd * slip) + '*op]');
    }
    var D = jzEvSolid(f.comp, 'JZ FX hzTear dark', ahzb_night(ev.sc), ev.t, ev.dur);
    // (each mask is finished before the next is added: adding one invalidates references to its siblings)
    ahzb_poly(D, half(1)).property('ADBE Mask Offset').expression = hd + 'gap/2';
    ahzb_poly(D, half(-1), MaskMode.INTERSECT).property('ADBE Mask Offset').expression = hd + 'gap/2';
    jzSetExpr(jzXf(D, 'ADBE Opacity'), hd + 'gap>0?100:0');
} });

/* hzDrain — 色を失う: for a moment all colour leaves the picture and the contrast goes flat and pale */
jzReg('fx', 'hzDrain', { build: function (f, ev) {
    var sc = ev.sc, hd = ahzb_hd(f, ev, ',AM=' + jzN(ahzb_amp(ev, 0.6, 1.1))) + 'var e=hza(p,0.15,0.55)*AM;if(e<0.004)e=0;\n';
    var A = jzAdjLayer(f.comp, 'JZ FX hzDrain', ev.t, ev.dur);
    var ti = jzEffect(A, 'ADBE Tint', 'hz Drain Grey'); jzEP(ti, 1, [0, 0, 0]); jzEP(ti, 2, [1, 1, 1]);
    jzEX(ti, 3, hd + '100*Math.min(1,e)');
    var Wsh = jzEvSolid(f.comp, 'JZ FX hzDrain pale', jzMixHex(sc.fg, sc.bg, 0.5), ev.t, ev.dur);
    jzSetExpr(jzXf(Wsh, 'ADBE Opacity'), hd + '30*e');
} });

/* hzClosingDark — 迫る闇: the dark at the edges of the frame swells inwards, nearly reaches the middle, and draws back
   (a black solid with an inverted, feathered round mask whose radius and feather follow the browser's gradient radii) */
jzReg('fx', 'hzClosingDark', { build: function (f, ev) {
    var W = f.W, H = f.H, s = ahzb_evS(ev), R = Math.sqrt(W * W + H * H) / 2, R0 = R * 0.5;
    var cx = W * (0.5 + ahzb_rs(s, 1) * 0.05), cy = H * (0.5 + ahzb_rs(s, 2) * 0.05);
    var hd = ahzb_hd(f, ev, ',AM=' + jzN(ahzb_amp(ev, 0.7, 1.1)) + ',R=' + jzN(R)) + 'var e=hza(p,0.4,0.5)*AM;if(e<0.004)e=0;var wob=1+0.04*Math.sin(p*23+' + (s % 7) + '),ri=R*(0.8-0.54*e)*wob,ro=R*(1.25-0.47*e)*wob;\n';
    var D = jzEvSolid(f.comp, 'JZ FX hzClosingDark', '#000000', ev.t, ev.dur);
    var mk = D.property('ADBE Mask Parade').addProperty('ADBE Mask Atom');
    mk.property('ADBE Mask Shape').setValue(jzCircleShape(cx, cy, R0));
    mk.inverted = true;
    mk.property('ADBE Mask Feather').setValue([R * 0.45, R * 0.45]);
    mk.property('ADBE Mask Feather').expression = hd + '[ro-ri,ro-ri]';
    mk.property('ADBE Mask Offset').expression = hd + '(ri+ro)/2-' + jzN(R0);
    jzSetExpr(jzXf(D, 'ADBE Opacity'), hd + '96*Math.min(1,e)');
} });

/* hzColdBreath — 白い息: a pale cloud of breath rises from below the frame, spreads and thins out (nine blurred puffs) */
jzReg('fx', 'hzColdBreath', { build: function (f, ev) {
    var W = f.W, H = f.H, sc = ev.sc, s = ahzb_evS(ev), M = Math.min(W, H), dk = ahzb_dark(sc.bg), col = jzMixHex(sc.fg, sc.bg, dk ? 0.25 : 0.72), j;
    var x0 = W * ahzb_rr(0.3, 0.7, s, 1), lean = ahzb_rs(s, 2) * W * 0.16, A = (dk ? 0.13 : 0.2) * ahzb_amp(ev, 0.7, 1.1) * 100 * 1.5;
    var S = jzEvShape(f.comp, 'JZ FX hzColdBreath', ev.t, ev.dur);
    for (j = 0; j < 9; j++) {
        var d = j * 0.055, hq = ahzb_hd(f, ev) + 'var q=cl((p-' + jzN(d) + ')/' + jzN(1 - d) + '),e=oc(q);\n';
        var g = jzGrp(S, 'puff ' + (j + 1)), el = jzAddEllipse(g, 10, 10);
        jzSetExpr(el.property('ADBE Vector Ellipse Size'), hq + 'var r=' + jzN(M * (0.6 + 0.8 * ahzb_r(s, j, 3)) * 1.5) + '*(0.07+0.24*e);[r,r]');
        jzAddFill(g, col);
        jzSetExpr(jzGX(g).property('ADBE Vector Position'), hq + '[' + jzN(x0) + '+' + jzN(lean * (0.4 + j * 0.15) + ahzb_rs(s, j, 4) * M * 0.34) + '*e,' + jzN(H * 1.03) + '-' + jzN(H * (0.16 + 0.34 * ahzb_r(s, j, 5))) + '*e]');
        jzSetExpr(jzGX(g).property('ADBE Vector Group Opacity'), hq + '(q<=0||q>=1)?0:' + jzN(A) + '*Math.sin(Math.PI*Math.pow(q,0.7))');
    }
    var gb = jzEffect(S, 'ADBE Gaussian Blur 2', 'hz Breath Soft'); jzEP(gb, 1, M * 0.09);
} });

/* hzFaint — 気が遠のく: the picture slips away from you — smaller, dimmer, soft — into a dark surround, and swims back
   (adjustment layer: Transform + blur; the surround is a thick night-coloured frame that takes the same transform) */
jzReg('fx', 'hzFaint', { build: function (f, ev) {
    var W = f.W, H = f.H, s = ahzb_evS(ev), wd = Math.max(W, H) * 0.4;
    var hd = ahzb_hd(f, ev, ',AM=' + jzN(ahzb_amp(ev, 0.7, 1.1))) + 'var e=hza(p,0.38,0.52)*AM;if(e<0.004)e=0;var z=1-0.11*e,c=[W/2+' + jzN(ahzb_rs(s, 1) * W * 0.02) + '*e,H/2+H*0.025*e],ro=' + jzN(ahzb_rs(s, 2) * 0.02 * 180 / Math.PI) + '*e;\n';
    var A = jzAdjLayer(f.comp, 'JZ FX hzFaint', ev.t, ev.dur);
    var tr = jzEffect(A, 'ADBE Geometry2', 'hz Faint Away'); jzEP(tr, 1, [W / 2, H / 2]); jzEP(tr, 2, [W / 2, H / 2]);
    jzEX(tr, 2, hd + 'c'); jzEX(tr, 4, hd + '100*z'); jzEX(tr, 8, hd + 'ro');
    var gb = jzEffect(A, 'ADBE Gaussian Blur 2', 'hz Faint Soft'); jzEX(gb, 1, hd + 'e>0.1?e*' + jzN(6.4 * Math.min(W, H) / 1080) + ':0');
    var F = jzEvShape(f.comp, 'JZ FX hzFaint surround', ev.t, ev.dur), g = jzGrp(F, 'surround');
    jzAddRect(g, W + wd, H + wd, 0); jzAddStroke(g, ahzb_night(ev.sc), wd);
    jzSetExpr(jzXf(F, 'ADBE Position'), hd + 'c');
    jzSetExpr(jzXf(F, 'ADBE Scale'), hd + '[100*z,100*z]');
    jzSetExpr(jzXf(F, 'ADBE Rotate Z'), hd + 'ro');
    jzSetExpr(jzXf(F, 'ADBE Opacity'), hd + 'e>0?100:0');
    var K = jzEvSolid(f.comp, 'JZ FX hzFaint dim', '#000000', ev.t, ev.dur);
    jzSetExpr(jzXf(K, 'ADBE Opacity'), hd + '50*Math.min(1,e)');
} });

/* hzUpside — 逆さの一コマ: for two frames the whole picture hangs upside down, dim and a little too near */
jzReg('fx', 'hzUpside', { build: function (f, ev) {
    var W = f.W, H = f.H, d = Math.max(1 / 24, ev.dur * 0.7);
    var A = jzAdjLayer(f.comp, 'JZ FX hzUpside', ev.t, d);
    var tr = jzEffect(A, 'ADBE Geometry2', 'hz Upside Down'); jzEP(tr, 1, [W / 2, H / 2]); jzEP(tr, 2, [W / 2, H / 2]); jzEP(tr, 3, 0); jzEP(tr, 4, -106); jzEP(tr, 5, 106);
    var K = jzEvSolid(f.comp, 'JZ FX hzUpside dim', '#000000', ev.t, d);
    jzXf(K, 'ADBE Opacity').setValue(42);
} });

/* ================================================================ TRANSITIONS (t.A = previous wrapper, held; t.B = this cut's wrapper, above it) */
function ahzb_thd(t) { return jzEvHead(t.t0, t.dur, ',W=' + t.W + ',H=' + t.H + ',SD=' + (((t.cut && t.cut.seed) | 0) % 9973)) + AHZB_FNS + 'var inW=time>=T0&&time<T0+TD;'; }
function ahzb_tcopy(t, L, name) {
    var C = L.duplicate();
    C.name = name; C.moveBefore(t.B);
    C.inPoint = t.t0; C.outPoint = t.t0 + t.dur;
    return C;
}

/* hzBlackout — 停電: the light on the old shot sputters and fails; a beat of dark; it comes back on over the new one */
jzReg('trans', 'hzBlackout', {
    plan: function (rng, st) { return { gap: rng.range(0.1, 0.18) }; },
    build: function (t) {
        var g = t.P.gap || 0.14, a1 = 0.5 - g / 2, b0 = 0.5 + g / 2, HD = ahzb_thd(t);
        jzSetExpr(jzXf(t.B, 'ADBE Opacity'), HD + '(inW&&p<' + jzN(b0) + ')?0:value');
        var K = jzEvSolid(t.comp, 'JZ Trans hzBlackout', '#000000', t.t0, t.dur);
        jzSetExpr(jzXf(K, 'ADBE Opacity'), HD + 'var lv=0;seedRandom(SD+Math.floor(time*24)*7,true);var rr=random();' +
            'if(p<' + jzN(a1) + '){var q=p/' + jzN(a1) + ';lv=1-q*q;if(q>0.2&&rr<0.4)lv*=0.25;}else if(p>' + jzN(b0) + '){var q2=(p-' + jzN(b0) + ')/' + jzN(1 - b0) + ';lv=hzq(q2);if(q2<0.6&&rr<0.4)lv*=0.3;}100*(1-lv)');
    }
});

/* hzSlideDown — ずり落ちる: the old picture loses its grip and slides off downwards in uneven strips, stretching as it goes
   (one masked copy of the old cut per strip above the new cut; more than 20 strips are built in pairs) */
jzReg('trans', 'hzSlideDown', {
    plan: function (rng, st) { return { n: rng.pick([18, 28, 40]) }; },
    build: function (t) {
        var W = t.W, H = t.H, sd = (t.cut && t.cut.seed) | 0, n = t.P.n || 28, nA = n > 20 ? Math.round(n / 2) : n, j;
        var hs = 'var T0=' + jzN(t.t0) + ',TD=' + jzN(Math.max(1 / 240, t.dur)) + ';function cl(x){return Math.max(0,Math.min(1,x));}var p=cl((time-T0)/TD);';
        for (j = 0; j < nA; j++) {
            var jj = Math.round(j * n / nA), d = jzClamp(0.2 + ahzb_noise1(jj * 0.37, sd) * 0.2 + ahzb_rs(sd, jj, 721) * 0.05, 0, 0.4);
            var x0 = Math.floor(W * j / nA), x1 = j === nA - 1 ? W : Math.floor(W * (j + 1) / nA), xc = (x0 + x1) / 2;
            var C = ahzb_tcopy(t, t.A, 'JZ Trans hzSlideDown ' + (j + 1)), mp = C.property('ADBE Mask Parade'), first = mp.numProperties === 0;
            var mk = ahzb_poly(C, [[x1 + 0.5, -2], [x1 + 0.5, H + 2], [x0 - 0.5, H + 2], [x0 - 0.5, -2]], first ? null : MaskMode.INTERSECT);
            var e = jzEffect(C, 'ADBE Geometry2', 'hz Slide Down'), Q = hs + 'var q=cl((p-' + jzN(d) + ')/0.6);';
            jzEP(e, 1, [xc, 0]); jzEP(e, 2, [xc, 0]); jzEP(e, 3, 0);
            jzEX(e, 2, Q + '[' + jzN(xc) + ',q*q*q*' + jzN(H * 1.03) + ']');
            jzEX(e, 4, Q + '100*(1+0.45*q)');
            jzEX(e, 9, Q + 'q>=1?0:100');
        }
    }
});

/* hzLinger — 居残る影: the new shot is there at once, but the old one stays on as a pale ghost that drifts up and thins */
jzReg('trans', 'hzLinger', {
    plan: function (rng, st) { return { up: rng.pick([-1, -1, 1]) }; },
    build: function (t) {
        var W = t.W, H = t.H, HD = ahzb_thd(t), dA = ahzb_dark((t.scPrev || t.sc).bg), dB = ahzb_dark(t.sc.bg);
        jzSetExpr(jzXf(t.B, 'ADBE Opacity'), HD + '(inW&&p<0.14)?value*p/0.14:value');
        var C = ahzb_tcopy(t, t.A, 'JZ Trans hzLinger ghost');
        if (dA === dB) C.blendingMode = dB ? BlendingMode.LIGHTEN : BlendingMode.DARKEN;
        jzSetExpr(jzXf(C, 'ADBE Opacity'), HD + 'var a=0.6*(1-hzs(p));seedRandom(SD+Math.floor(time*24)*7,true);if(p>0.3&&random()<0.22)a*=0.35;100*a*' + (dA === dB ? '1' : '0.6'));
        var e = jzEffect(C, 'ADBE Geometry2', 'hz Linger Drift');
        jzEP(e, 1, [W / 2, H / 2]); jzEP(e, 2, [W / 2, H / 2]);
        jzEX(e, 2, HD + '[W/2,H/2+' + jzN((t.P.up || -1) * H * 0.035) + '*oc(p)]');
        jzEX(e, 4, HD + '100*(1+0.07*p)');
    }
});
