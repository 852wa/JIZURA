// ================================================================ pack x2kineticB part 2 (AE port of src/11p_x2_kineticB.js, keys kz…)
// 5 treatments, 4 cameras, 6 effect events, 3 transitions. Helpers (akzb_geo / akzb_words / akzb_h / AKZB_FNS …) are in part 1.
//  - treatments: static per-glyph arrangement = animators on the lyric itself (it stays one editable text); copies drawn in
//    another colour / through a comb / as strips = linked copies of the lyric layer (akzb_twin: parented to it, so they follow
//    whatever the layout and the motion do with it) carrying a Transform effect
//  - cameras: CAM(t) on the camera null (+ Transform skew / blur on the content layers), as ae/p_kinetic4.jsx
//  - effect events: adjustment layers with a Transform effect rework the picture in place, a scheme-background shape covers
//    what that uncovers; where the browser draws its snapshot again (smear, squeezed frame) the cut wrappers are duplicated
//  - transitions: Transform effects on the two cut wrappers + a background solid + an accent edge

/* ================================================================ TREATMENTS */
function akzb_td(L) { try { return L.property('ADBE Text Properties').property('ADBE Text Document').value; } catch (e) { return null; } }
// browser alive(it, amin): a filled, (nearly) opaque lyric
function akzb_alive(L, amin) {
    var td = akzb_td(L);
    if (!td || td.applyFill === false || !jzTrim(String(td.text || '')) || !(td.fontSize > 1)) return false;
    var op = 100; try { op = jzXf(L, 'ADBE Opacity').valueAtTime(0, true); } catch (e2) { try { op = jzXf(L, 'ADBE Opacity').value; } catch (e3) { op = 100; } }
    return op >= (amin == null ? 0.9 : amin) * 100 - 0.1;
}
// masks on the lyric; own: leave out the floor mask of this pack's kzHammerDown exit (copies simply sink behind it too)
function akzb_nMasks(L, own) {
    var n = 0, i, mp;
    try { mp = L.property('ADBE Mask Parade'); for (i = 1; i <= mp.numProperties; i++) if (!own || String(mp.property(i).name) !== 'JZ Out Hammer Floor') n++; } catch (e) { n = 0; }
    return n;
}
// extra copies allowed in this comp (layouts that set every glyph as its own layer get fewer)
function akzb_budget(ctx, want) { var n = 0; try { n = ctx.comp.numLayers; } catch (e) { n = 0; } return n > 40 ? Math.min(want, 1) : (n > 20 ? Math.min(want, 2) : want); }
// accentFor(sc, col, min): an accent that reads on the glyph colour and on the background
function akzb_accentFor(sc, col, min) {
    var l = [sc.accent, sc.accent2, sc.ghostA, sc.ghostB], i;
    for (i = 0; i < l.length; i++) if (l[i] && jzContrast(l[i], col) >= min && jzContrast(l[i], sc.bg) >= 1.5) return l[i];
    return jzFitContrast(sc.accent, col, min + 0.3);
}
// linked copy of the lyric layer: keeps text, animators and effects, sits exactly on L (parented) and takes its opacity
function akzb_twin(L, name, after) {
    var D = L.duplicate(), i, mns = ['ADBE Position', 'ADBE Scale', 'ADBE Rotate Z', 'ADBE Opacity', 'ADBE Anchor Point'];
    try { D.name = name; } catch (e0) {}
    var tr = D.property('ADBE Transform Group');
    for (i = 0; i < mns.length; i++) { try { if (tr.property(mns[i]).expression) tr.property(mns[i]).expression = ''; } catch (e1) {} }
    D.parent = L;
    tr.property('ADBE Scale').setValue([100, 100]); tr.property('ADBE Rotate Z').setValue(0);
    jzSetExpr(tr.property('ADBE Position'), 'parent.transform.anchorPoint');
    tr.property('ADBE Opacity').setValue(100);
    jzSetExpr(tr.property('ADBE Opacity'), 'parent.transform.opacity');
    try { D.moveAfter(after || L); } catch (e2) {}
    return D;
}
// every colour animator of a copy takes the copy's colour
function akzb_recolor(D, hex) {
    var an = D.property('ADBE Text Properties').property('ADBE Text Animators'), i, c = jzHex(hex);
    for (i = 1; i <= an.numProperties; i++) {
        var pr = an.property(i).property('ADBE Text Animator Properties'), f = pr.property('ADBE Text Fill Color'), s = pr.property('ADBE Text Stroke Color');
        if (f) f.setValue(c);
        if (s) s.setValue(c);
    }
}
function akzb_thead(ctx, o, fs) { return jzHead(ctx, { mi: (o && o.mi) || 0, size: fs }) + AKZB_FNS; }

/* kzSpeedShadow — 流線影: the glyphs drag a shadow of thin speed lines behind them: their own shapes smeared backwards, seen through a comb
   (n accent copies behind the lyric, each a step further back along the line, cut into thin lines by Venetian Blinds; main pass only) */
jzReg('treat', 'kzSpeedShadow', {
    plan: function (rng, st) { return { d: rng.range(0.36, 0.52), n: rng.int(3, 4), gap: rng.range(0.17, 0.21) }; },
    apply: function (ctx, L, P, o) {
        if (!akzb_alive(L) || akzb_nMasks(L, true) > 0) return;
        var G = akzb_geo(L), fs = G.fs, n = akzb_budget(ctx, P.n || 3), tc = akzb_accentFor(ctx.sc, jzTextColor(L), 1.5), c, prev = L;
        var gp = fs * (P.gap || 0.19), th = fs * 0.07, cx = G.r.left + G.r.width / 2, cy = G.r.top + G.r.height / 2;
        var HD = akzb_thead(ctx, o, fs) + 'var q=oc(cl((time-DL-0.02)/0.4))*(1-ic(PO)),LL=' + jzN(fs * (P.d || 0.44)) + '*q;';
        for (c = 1; c <= n; c++) {
            var D = akzb_twin(L, 'JZ Treat SpeedShadow ' + c, prev); prev = D;
            jzTextDoc(D, function (td) { td.applyFill = true; td.fillColor = jzHex(tc); td.applyStroke = false; });
            akzb_recolor(D, tc);
            var vb = jzEffect(D, 'ADBE Venetian Blinds', 'JZ Speed Comb');
            jzEP(vb, 1, jzClamp((1 - th / gp) * 100, 0, 95)); jzEP(vb, 2, G.vert ? 90 : 0); jzEP(vb, 3, Math.max(2, gp)); jzEP(vb, 4, 0);
            var tf = jzEffect(D, 'ADBE Geometry2', 'JZ Speed Trail');
            jzEP(tf, 1, [cx, cy]); jzEP(tf, 2, [cx, cy]);
            jzEX(tf, 2, HD + 'var o=LL*' + jzN(c / n) + ';' + (G.vert ? '[' + jzN(cx) + ',' + jzN(cy) + '-o]' : '[' + jzN(cx) + '-o,' + jzN(cy) + ']'));
            jzEX(tf, 9, HD + 'q<0.02?0:' + jzN(100 * (1 - 0.7 * (c - 1) / Math.max(1, n - 1))));
            jzNoGhost(D);
        }
    }
});
/* kzOnionSkin — 前コマ残し: two outline drawings of the line stay behind it, tipped back about its foot like the previous frames of a swing */
jzReg('treat', 'kzOnionSkin', {
    plan: function (rng, st) { return { r: rng.range(2.6, 3.8) * rng.pick([1, -1]), n: rng.pick([2, 2, 3]) }; },
    apply: function (ctx, L, P, o) {
        if (!akzb_alive(L)) return;
        var G = akzb_geo(L), fs = G.fs, n = akzb_budget(ctx, P.n || 2), tc = akzb_accentFor(ctx.sc, jzTextColor(L), 1.4), k, prev = L;
        var w = Math.min(G.r.width, fs * 9), h = G.r.height, cx = G.r.left + G.r.width / 2, cy = G.r.top + G.r.height / 2;
        var HD = akzb_thead(ctx, o, fs) + 'var amt=ob(cl((time-DL-0.08)/0.5),1.6)*(1-ic(PO)),th=' + jzN(P.r || 3) + '*amt*(0.9+0.1*Math.sin(time*2.6)),tr=th*0.0174533;';
        for (k = 1; k <= n; k++) {
            var D = akzb_twin(L, 'JZ Treat OnionSkin ' + k, prev); prev = D;
            jzTextDoc(D, function (td) {
                td.applyFill = false; td.applyStroke = true; td.strokeColor = jzHex(tc); td.strokeWidth = Math.max(1, fs * 0.012);
            });
            akzb_recolor(D, tc);
            var tf = jzEffect(D, 'ADBE Geometry2', 'JZ Onion Pose');
            jzEP(tf, 1, [cx, cy]); jzEP(tf, 2, [cx, cy]);
            jzEX(tf, 2, HD + '[' + jzN(cx) + '+' + k + '*tr*' + jzN(h / 2) + ',' + jzN(cy) + '-' + k + '*Math.abs(tr)*' + jzN(w / 2) + ']');
            jzEX(tf, 8, HD + k + '*th');
            jzEX(tf, 9, HD + 'amt<=0.01?0:' + jzN(100 * 0.85 * Math.pow(0.62, k - 1)));
        }
    }
});
/* kzCrescendo — 加速組み: the glyphs grow steadily along the line on a common baseline, as if the phrase were gathering speed */
jzReg('treat', 'kzCrescendo', {
    plan: function (rng, st) { return { k: rng.range(0.34, 0.46), rev: rng.chance(0.22) }; },
    apply: function (ctx, L, P, o) {
        if (!akzb_alive(L, 0.5)) return;
        var G = akzb_geo(L), vert = G.vert, kk = P.k || 0.4, rev = !!P.rev, lines = {}, order = [], offs = [], scs = [], i, q, li, any = false;
        for (i = 0; i < G.n; i++) { offs.push([0, 0]); scs.push(1); li = vert ? 0 : G.g[i].li; if (!lines[li]) { lines[li] = []; order.push(li); } lines[li].push(i); }
        for (li = 0; li < order.length; li++) {
            var ln = lines[order[li]], m = ln.length;
            if (m < 2) continue;
            var first = G.g[ln[0]], last = G.g[ln[m - 1]], sc0 = [], tot = 0, sum = 0, g, adv;
            var a0 = vert ? first.y - first.h / 2 : first.x - first.w / 2, a1 = vert ? last.y + last.h / 2 : last.x + last.w / 2, old = a1 - a0;
            for (q = 0; q < m; q++) {
                var u = q / (m - 1); sc0.push(jzLerp(1 - kk * 0.55, 1 + kk * 0.45, rev ? 1 - u : u));
                g = G.g[ln[q]]; adv = vert ? g.h : g.w; tot += adv * sc0[q]; sum += adv;
            }
            var gapSum = old - sum, norm = Math.min(1, (old - gapSum) / Math.max(1e-6, tot)), pos = 0, np = [];
            // keep the original gaps between glyphs, re-flow the scaled advances and keep the line's own alignment
            for (q = 0; q < m; q++) {
                g = G.g[ln[q]]; adv = (vert ? g.h : g.w) * sc0[q] * norm;
                if (q > 0) { var pv = G.g[ln[q - 1]]; pos += vert ? (g.y - g.h / 2) - (pv.y + pv.h / 2) : (g.x - g.w / 2) - (pv.x + pv.w / 2); }
                np.push(pos + adv / 2); pos += adv;
            }
            var start = G.just === 'l' ? a0 : (G.just === 'r' && !vert ? a1 - pos : a0 + (old - pos) / 2);
            for (q = 0; q < m; q++) {
                g = G.g[ln[q]]; var s = sc0[q] * norm, na = start + np[q];
                scs[ln[q]] = s; offs[ln[q]] = vert ? [0, na - g.y] : [na - g.x, (1 - s) * 0.36 * G.fs];
                any = true;
            }
        }
        if (!any) return;
        jzCharScales(L, scs, 'JZ Treat Crescendo Size');
        jzCharOffsets(L, offs, 'JZ Treat Crescendo Place');
    }
});
/* kzHopArc — 跳ね組み: every word is set along the arc of a hop: its letters rise, tip over the top and come down again */
jzReg('treat', 'kzHopArc', {
    plan: function (rng, st) { return { h: rng.range(0.17, 0.25), tilt: rng.range(9, 14) }; },
    apply: function (ctx, L, P, o) {
        if (!akzb_alive(L, 0.5)) return;
        var G = akzb_geo(L), Wd = akzb_words(ctx.cut, G), vert = G.vert, hh = P.h || 0.2, tl = P.tilt || 11, offs = [], rots = [], i, any = false;
        for (i = 0; i < G.n; i++) {
            var j = Wd.map[i], m = j >= 0 ? Wd.W[j].n : 0;
            if (j < 0 || m < 2 || jzIsPunct(G.g[i].ch)) { offs.push([0, 0]); rots.push(0); continue; }
            var u = 0.12 + 0.76 * Wd.inW[i] / (m - 1);
            var lift = (Math.sin(Math.PI * u) - 0.55) * hh * G.fs * Math.min(1, 0.55 + m * 0.15), rot = -Math.cos(Math.PI * u) * tl;
            offs.push(vert ? [lift, 0] : [0, -lift]); rots.push(vert ? rot * 0.6 : -rot); any = true;
        }
        if (!any) return;
        jzCharOffsets(L, offs, 'JZ Treat HopArc Lift');
        jzCharRotations(L, rots, 'JZ Treat HopArc Tip');
    }
});
/* kzStepShear — 段々斜体: the line is cut into level strips and each strip is pushed a step further forward: an italic made of stairs
   (strips = the lyric + linked copies, each masked to its band of every row and shifted by a Transform effect; a vertical column
   tips its glyphs instead and a turned / already masked / crowded lyric leans as a plain italic, like the browser's fall-backs) */
jzReg('treat', 'kzStepShear', {
    plan: function (rng, st) { return { n: rng.pick([3, 4, 4, 5]), d: rng.range(0.05, 0.075), dir: rng.pick([1, 1, -1]) }; },
    apply: function (ctx, L, P, o) {
        if (!akzb_alive(L, 0.5)) return;
        var G = akzb_geo(L), fs = G.fs, n = Math.max(2, Math.min(6, P.n || 4)), dir = P.dir || 1, d = P.d || 0.06, b, li, rot = 0, nl = 0;
        if (G.vert) { jzAnimator(L, 'JZ Treat StepShear Tip', [['ADBE Text Rotation', 5 * dir]], '100'); return; }
        try { rot = jzXf(L, 'ADBE Rotate Z').value; } catch (e0) { rot = 0; }
        try { nl = ctx.comp.numLayers; } catch (e1) { nl = 0; }
        if (Math.abs(rot) > 0.5 || akzb_nMasks(L) > 0 || nl > 40) { jzAnimator(L, 'JZ Treat StepShear Lean', [['ADBE Text Skew', -9 * dir]], '100'); return; }
        var lead = G.nL > 1 ? G.lead : fs * 1.3, big = Math.max(ctx.W, ctx.H) * 3, cx = G.r.left + G.r.width / 2, cy = G.r.top + G.r.height / 2;
        var HD = akzb_thead(ctx, o, fs) + 'var q=ob(cl((time-DL-0.05)/0.4),1.8)*(1-ic(PO));';
        var pieces = [L], prev = L;
        for (b = 1; b < n; b++) { prev = akzb_twin(L, 'JZ Treat StepShear ' + (b + 1), prev); pieces.push(prev); }
        for (b = 0; b < n; b++) {
            var Lb = pieces[b];
            for (li = 0; li < G.nL; li++) {
                var y0 = G.rowY[li] - lead / 2 + b * lead / n, y1 = y0 + lead / n;
                if (li === 0 && b === 0) y0 = -big;
                if (li === G.nL - 1 && b === n - 1) y1 = big;
                jzMaskRect(Lb, cx - big, y0, cx + big, y1);
            }
            var tf = jzEffect(Lb, 'ADBE Geometry2', 'JZ Step Shift');
            jzEP(tf, 1, [cx, cy]); jzEP(tf, 2, [cx, cy]);
            jzEX(tf, 2, HD + '[' + jzN(cx) + '+' + jzN(dir * d * fs * ((n - 1) / 2 - b)) + '*q,' + jzN(cy) + ']');
        }
    }
});

/* ================================================================ CAMERA */
// word clock of a cut (same rule as the browser: onsets spread over the first half; no beat grid in AE)
function akzb_wordTimes(cut, nMax) {
    var n = Math.max(1, Math.min(nMax || 6, (cut.words || []).length || 1)), dur = cut.dur || 2, i, t = [];
    if (n < 2 && dur > 1.2) n = 2;
    var last = Math.max(0, Math.min(dur * 0.5, (n - 1) * 0.38));
    for (i = 0; i < n; i++) t.push(n > 1 ? last * i / (n - 1) : 0);
    return t;
}
// browser design px -> comp px (blur radii)
function akzb_px(cam) { var W = cam.W || 1920, H = cam.H || 1080, r = W / H; return Math.min(W, H) / ((Math.abs(r - 1) < 0.02 || Math.abs(r - 0.8) < 0.02) ? 1440 : 1080); }
// CAM(t) -> [x, y, sx, sy, rot, skx, blur]; snippets see t, KM, K (= min(1, KM)), DUR, W, H, TS (word onsets), NT + easings
function akzb_camfn(cam, o) {
    return jzCamHead(cam) + AKZB_FNS + 'var W=' + jzN(cam.W || 1920) + ',H=' + jzN(cam.H || 1080) + ',TS=' + akzb_arr(akzb_wordTimes(cam.cut, 6)) + ',NT=TS.length;\n' +
        'function CAM(t){t=Math.max(0,t);var K=Math.min(1,KM),x=0,y=0,s=1,sx=1,sy=1,rot=0,skx=0,blur=0;\n' + o.code + '\nreturn [x,y,s*sx,s*sy,rot,skx,blur];}\n';
}
// null gets x / y / scale / rotation; skew (Transform effect) and blur go on every content layer. Ghosts (time-shifted copies)
// get a Transform effect that re-plays the camera at their own lag, like the browser's per-pass camera.
function akzb_cam(cam, o) {
    var F = akzb_camfn(cam, o), i, e, C = cam.content || [], lag, LG;
    if (o.xy) jzSetExpr(jzXf(cam.nul, 'ADBE Position'), F + 'var c=CAM(time);[value[0]+c[0],value[1]+c[1]]');
    if (o.s) jzSetExpr(jzXf(cam.nul, 'ADBE Scale'), F + 'var c=CAM(time);[value[0]*c[2],value[1]*c[3]]');
    if (o.rot) jzSetExpr(jzXf(cam.nul, 'ADBE Rotate Z'), F + 'value+CAM(time)[4]');
    for (i = 0; i < C.length; i++) {
        lag = 0; try { lag = C[i].startTime || 0; } catch (err) { lag = 0; }
        LG = 'var LAG=' + jzN(Math.max(0, lag)) + ';';
        if (o.skx) { e = jzEffect(C[i], 'ADBE Geometry2', 'JZ Cam Skew'); jzEX(e, 6, F + LG + '-CAM(time-LAG)[5]'); }
        if (lag > 0.001) {
            e = jzEffect(C[i], 'ADBE Geometry2', 'JZ Cam Lag'); jzEP(e, 3, 0);
            jzEX(e, 2, F + LG + 'var a=CAM(time),b=CAM(time-LAG),dx=b[0]-a[0],dy=b[1]-a[1],r=-a[4]*Math.PI/180,cs=Math.cos(r),sn=Math.sin(r);' +
                '[value[0]+(dx*cs-dy*sn)/a[2],value[1]+(dx*sn+dy*cs)/a[3]]');
            if (o.s) { jzEX(e, 4, F + LG + 'CAM(time-LAG)[3]/CAM(time)[3]*100'); jzEX(e, 5, F + LG + 'CAM(time-LAG)[2]/CAM(time)[2]*100'); }
            if (o.rot) jzEX(e, 8, F + LG + 'CAM(time-LAG)[4]-CAM(time)[4]');
        }
        if (o.blur) { e = jzEffect(C[i], 'ADBE Gaussian Blur 2', 'JZ Cam Blur'); jzEX(e, 1, F + 'var B=CAM(time)[6];B>0.4?B*' + jzN(2 * akzb_px(cam)) + ':0'); }
    }
}
function akzb_n(v) { return '(' + jzN(v) + ')'; }

/* kzRecoil — 被弾の反動: the cut opens as if the frame had just been struck: knocked off along one line, twisted, ringing back to rest;
   later words land lighter blows from the other side */
jzReg('cam', 'kzRecoil', {
    plan: function (rng, st) { return { a: rng.range(0, Math.PI * 2), r: rng.range(2.4, 3.5) * rng.pick([1, -1]) }; },
    apply: function (cam, P) {
        akzb_cam(cam, { xy: 1, s: 1, rot: 1, blur: 1, code: 'var CA=' + akzb_n(Math.cos(P.a || 0)) + ',SA=' + akzb_n(Math.sin(P.a || 0)) + ',vx=0,vy=0,vr=0,z=0,q,d,g,sg,rr;' +
            'for(q=0;q<NT&&q<6;q++){d=t-TS[q];if(d<0)break;g=q===0?1:0.36;sg=q%2?-1:1;rr=Math.exp(-d*7.5)*Math.cos(d*19);' +
            'vx+=sg*CA*g*rr;vy+=sg*SA*g*rr;vr+=sg*g*Math.exp(-d*6.5)*Math.cos(d*15);z+=g*Math.exp(-d*9);}' +
            'x=Math.max(-1,Math.min(1,vx))*W*0.042*K;y=Math.max(-1,Math.min(1,vy))*H*0.036*K;rot=Math.max(-1.2,Math.min(1.2,vr))*' + akzb_n(P.r || 3) + '*K;' +
            's=1.03+0.045*K*Math.min(1,z);blur=5*K*Math.exp(-t*14);' });
    }
});
/* kzKnockback — ノックバック: the frame is punched away from the viewer on the first frames, springs forward past its place and settles */
jzReg('cam', 'kzKnockback', {
    plan: function (rng, st) { return { r: rng.range(-1.6, 1.6), z: rng.range(0.06, 0.075) }; },
    apply: function (cam, P) {
        akzb_cam(cam, { s: 1, rot: 1, blur: 1, code: 'var aa=0.07,kb,d;if(t<aa)kb=oc(t/aa);else{d=t-aa;kb=Math.exp(-d*6)*Math.cos(d*13.5);}' +
            'var drift=0.02*cl((t-0.6)/Math.max(0.6,DUR-0.6));s=1-' + akzb_n(P.z || 0.07) + '*K*kb+drift;rot=' + akzb_n(P.r || 0) + '*K*kb;blur=6*K*Math.max(0,kb)*Math.exp(-t*9);' });
    }
});
/* kzWordNod — 語でうなずく: the camera nods once for every word: a quick dip with a slight squeeze, and up again
   (the browser's extra nods on later beats are left out: no beat grid here) */
jzReg('cam', 'kzWordNod', {
    plan: function (rng, st) { return { a: rng.range(0.018, 0.026), up: rng.chance(0.25) }; },
    apply: function (cam, P) {
        akzb_cam(cam, { xy: 1, s: 1, code: 'function nod(d){return d<0?0:(d<0.08?oc(d/0.08):Math.exp(-(d-0.08)*8)*Math.cos((d-0.08)*14));}' +
            'var v=0,q;for(q=0;q<NT&&q<6;q++)v+=(q===0?0.6:1)*nod(t-TS[q]);v=Math.max(-1,Math.min(1.2,v));' +
            'y=' + (P.up ? -1 : 1) + '*H*' + akzb_n(P.a || 0.022) + '*K*v;s=1.02+0.02*K*Math.max(0,v);sy=1-0.012*K*v;' });
    }
});
/* kzSkidStop — 横滑り停止: the frame slides in sideways, sheared by its own speed, brakes hard and rocks back upright */
jzReg('cam', 'kzSkidStop', {
    plan: function (rng, st) { return { dir: rng.pick([1, -1]), a: rng.range(0.04, 0.05) }; },
    apply: function (cam, P) {
        akzb_cam(cam, { xy: 1, s: 1, skx: 1, blur: 1, code: 'var T=0.46,dr=' + akzb_n(P.dir || 1) + ',rem=1-oc(cl(t/T)),d=t-T*0.8,back=d>0?Math.exp(-d*8)*Math.sin(d*19):0;' +
            'x=-dr*W*' + akzb_n(P.a || 0.045) + '*K*rem;skx=dr*K*(7*Math.pow(rem,0.7)-3*back);sx=1+0.04*K*rem;s=1.02;blur=4*K*rem*rem;' });
    }
});

/* ================================================================ FX (fx.build(f, ev): f.comp = the main comp, ev = { t, dur, amp, sc }) */
function akzb_evS(ev) { return akzb_h(Math.round(ev.t * 1000), 6841); }
function akzb_amp1(ev) { return jzClamp(ev.amp == null ? 1 : ev.amp, 0.5, 1.3); }
function akzb_pop(sc) {
    var l = [sc.accent, sc.accent2, sc.fg], i;
    for (i = 0; i < l.length; i++) if (l[i] && jzContrast(l[i], sc.bg) > 1.6) return l[i];
    return sc.fg;
}
// p = the browser's k (0..1 over the event); W, H, M (= min) + easings
function akzb_fhd(f, ev, extra) { return jzEvHead(ev.t, ev.dur, ',W=' + f.W + ',H=' + f.H + ',M=' + Math.min(f.W, f.H) + (extra || '')) + AKZB_FNS; }
function akzb_t1(ev) { return ev.t + Math.max(ev.dur, 1 / 24); }
function akzb_span(L, t0, t1) { try { L.inPoint = t0; L.outPoint = Math.max(t1, t0 + 0.001); } catch (e) { jzWarn('akzb span: ' + e.toString()); } return L; }
// Transform effect (ADBE Geometry2: 1 anchor, 2 position, 3 uniform scale, 4 scale height, 5 scale width, 6 skew, 7 skew axis, 8 rotation, 9 opacity)
function akzb_xf(L, name, px, py) {
    var e = jzEffect(L, 'ADBE Geometry2', name);
    jzEP(e, 1, [px, py]); jzEP(e, 2, [px, py]);
    return e;
}
// the picture below, shifted by (dxEx, dyEx) px (adjustment layer) + the scheme background where the shifted picture leaves the frame
function akzb_shift(f, ev, tag, hd, dxEx, dyEx) {
    var W = f.W, H = f.H, L = jzAdjLayer(f.comp, 'JZ FX ' + tag, ev.t, ev.dur), tr = akzb_xf(L, 'JZ Knock', W / 2, H / 2);
    jzEX(tr, 2, hd + '[' + jzN(W / 2) + '+(' + dxEx + '),' + jzN(H / 2) + '+(' + dyEx + ')]');
    var S = jzEvShape(f.comp, 'JZ FX ' + tag + ' margins', ev.t, ev.dur), g = jzGrp(S, 'margins');
    jzAddRect(g, W * 4, H * 4, 0, 0, 0);
    jzAddRect(g, W, H, 0, 0, 0);
    akzb_eo(jzAddFill(g, ev.sc.bg));
    jzSetExpr(jzGX(g).property('ADBE Vector Position'), hd + '[' + jzN(W / 2) + '+(' + dxEx + '),' + jzN(H / 2) + '+(' + dyEx + ')]');
    return L;
}
function akzb_eo(fill) { try { fill.property('ADBE Vector Fill Rule').setValue(2); } catch (e) {} return fill; }
// rectangle with expressions on its size / position (set up before anything else is added to the group)
function akzb_rect(g, w, h, x, y, sizeEx, posEx) {
    var r = jzAddRect(g, w, h, 0, x, y);
    if (sizeEx) jzSetExpr(r.property('ADBE Vector Rect Size'), sizeEx);
    if (posEx) jzSetExpr(r.property('ADBE Vector Rect Position'), posEx);
    return r;
}
function akzb_isWrap(L) {
    try { return !!(L && L.source && typeof L.source.numLayers === 'number' && /^\d\d\d /.test(String(L.name))); } catch (e) { return false; }
}
// copies of the picture: duplicates of the cut wrappers visible during the event, moved to the top of the main comp and trimmed to it.
// A matted wrapper takes a copy of its matte along (kept directly above the copy). fn(layer, isMatte) is applied to each.
function akzb_copies(f, ev, tag, fn) {
    var C = f.comp, t0 = ev.t, t1 = akzb_t1(ev), src = [], out = [], i, L, D, M, M0;
    if (f.wraps) {
        for (i = f.wraps.length - 1; i >= 0; i--) { var W0 = f.wraps[i]; if (W0.cut.start > t1 + 1 || W0.cut.end < t0 - 1) continue; L = W0.layer; if (L.inPoint < t1 - 0.0001 && L.outPoint > t0 + 0.0001) src.push(L); }
    } else for (i = C.numLayers; i >= 1; i--) { L = C.layer(i); if (akzb_isWrap(L) && L.inPoint < t1 - 0.0001 && L.outPoint > t0 + 0.0001) src.push(L); }
    for (i = 0; i < src.length; i++) {
        L = src[i]; M0 = null;
        try { if (L.trackMatteType !== TrackMatteType.NO_TRACK_MATTE && L.index > 1) M0 = C.layer(L.index - 1); } catch (e0) {}
        D = L.duplicate(); D.moveToBeginning(); D.name = 'JZ FX ' + tag + ' copy';
        akzb_span(D, Math.max(D.inPoint, t0), Math.min(D.outPoint, t1));
        M = null;
        if (M0) { M = M0.duplicate(); M.moveToBeginning(); M.name = 'JZ FX ' + tag + ' matte'; akzb_span(M, Math.max(M.inPoint, t0), Math.min(M.outPoint, t1)); }
        else { try { if (D.trackMatteType !== TrackMatteType.NO_TRACK_MATTE) D.trackMatteType = TrackMatteType.NO_TRACK_MATTE; } catch (e1) {} }
        if (fn) { fn(D, false); if (M) fn(M, true); }
        out.push({ L: D, M: M });
    }
    return out;
}

/* kzEdgeHit — 端からの一撃: something hits the frame from one edge: spikes burst inward from the point of impact and the picture recoils */
jzReg('fx', 'kzEdgeHit', { build: function (f, ev) {
    var W = f.W, H = f.H, sc = ev.sc, s = akzb_evS(ev), M = Math.min(W, H), a = akzb_amp1(ev), side = akzb_h(s, 1) % 4, u = 0.3 + 0.4 * akzb_r(s, 2), i;
    var hx = side === 0 ? 0 : (side === 1 ? W : W * u), hy = side === 2 ? 0 : (side === 3 ? H : H * u);
    var nx = side === 0 ? 1 : (side === 1 ? -1 : 0), ny = side === 2 ? 1 : (side === 3 ? -1 : 0);
    var hd = akzb_fhd(f, ev) + 'var rec=(p<0.14?oe(p/0.14):rng((p-0.14)/0.86,1.5,3.2))*' + jzN(M * 0.035 * a) + ',g=p<0.22?oe(p/0.22):1,out=oc(cl((p-0.18)/0.82));\n';
    akzb_shift(f, ev, 'kzEdgeHit', hd, 'Math.round(' + nx + '*rec)', 'Math.round(' + ny + '*rec)');
    var S = jzEvShape(f.comp, 'JZ FX kzEdgeHit spikes', ev.t, ev.dur), n = 9, base = Math.atan2(ny, nx), pc = akzb_pop(sc);
    // flash at the point of impact (on top)
    var gf = jzGrp(S, 'flash');
    jzAddEllipse(gf, 2, 2, 0, 0); jzAddFill(gf, sc.fg);
    jzGX(gf).property('ADBE Vector Position').setValue([hx, hy]);
    jzSetExpr(jzGX(gf).property('ADBE Vector Scale'), hd + 'var fr=' + jzN(M * 0.06 * a) + '*g*(1-out);[fr*100,fr*100]');
    jzSetExpr(jzGX(gf).property('ADBE Vector Group Opacity'), hd + jzN(M * 0.06 * a) + '*g*(1-out)>0.5?100:0');
    for (i = n - 1; i >= 0; i--) {
        var an = base + ((i + 0.5) / n - 0.5) * 2.5 + akzb_rs(s, i, 3) * 0.08, lenK = M * akzb_rr(0.2, 0.48, s, i, 4) * a, wK = M * akzb_rr(0.012, 0.028, s, i, 5);
        var q = hd + 'var len=' + jzN(lenK) + '*g,r0=' + jzN(M * 0.03) + '+len*1.1*out,r1=r0+len*(1-out),w=' + jzN(wK) + '*(1-out);';
        var gs = jzGrp(S, 'spike ' + (i + 1));
        jzAddPath(gs, [[0, -1], [0, 1], [1, 0]], true);
        jzAddFill(gs, i % 3 === 1 ? sc.fg : pc);
        jzGX(gs).property('ADBE Vector Rotation').setValue(an * 180 / Math.PI);
        jzSetExpr(jzGX(gs).property('ADBE Vector Position'), q + '[' + jzN(hx) + '+' + akzb_n(Math.cos(an)) + '*r0,' + jzN(hy) + '+' + akzb_n(Math.sin(an)) + '*r0]');
        jzSetExpr(jzGX(gs).property('ADBE Vector Scale'), q + '[Math.max(0,r1-r0)*100,w*100]');
        jzSetExpr(jzGX(gs).property('ADBE Vector Group Opacity'), q + '(r1-r0<1||w<0.4)?0:100');
    }
} });

/* kzKnockSmear — 小突きスミア: the picture is knocked sideways and springs back; for those frames it drags a smear of itself behind
   (the smear = five copies of the cut, lighten / darken blended, each a step further back) */
jzReg('fx', 'kzKnockSmear', { build: function (f, ev) {
    var W = f.W, H = f.H, sc = ev.sc, s = akzb_evS(ev), vert = W < H ? akzb_r(s, 1) < 0.5 : akzb_r(s, 1) < 0.2, dir = akzb_r(s, 2) < 0.5 ? 1 : -1, Lc = vert ? H : W, i;
    var hd = akzb_fhd(f, ev) + 'var v=p<0.16?oe(p/0.16):rng((p-0.16)/0.84,1.5,2.6),o=Math.round(' + jzN(dir * Lc * 0.065 * akzb_amp1(ev)) + '*v);\n';
    akzb_shift(f, ev, 'kzKnockSmear', hd, vert ? '0' : 'o', vert ? 'o' : '0');
    var dark = jzLum(sc.bg) < 0.45, n = 6;
    var mk = function (fr) {
        return function (D, isMatte) {
            var tr = akzb_xf(D, 'JZ Smear', W / 2, H / 2), q = 'var q=Math.round(o*' + akzb_n(1 - fr * 1.6) + ');';
            jzEX(tr, 2, hd + q + (vert ? '[' + jzN(W / 2) + ',' + jzN(H / 2) + '+q]' : '[' + jzN(W / 2) + '+q,' + jzN(H / 2) + ']'));
            if (isMatte) return;
            jzEX(tr, 9, hd + 'Math.abs(o)<1?0:' + jzN(42 * (1 - fr)));
            try { D.blendingMode = dark ? BlendingMode.LIGHTEN : BlendingMode.DARKEN; } catch (e0) {}
        };
    };
    for (i = 1; i < n; i++) akzb_copies(f, ev, 'kzKnockSmear ' + i, mk(i / n));
} });

/* kzCardSlam — 浮かせて叩く: the picture is lifted off the page as a card with a solid shadow, hangs for a moment, and is slapped back down */
jzReg('fx', 'kzCardSlam', { build: function (f, ev) {
    var W = f.W, H = f.H, sc = ev.sc, s = akzb_evS(ev), M = Math.min(W, H), a = akzb_amp1(ev), sg = akzb_r(s, 1) < 0.5 ? 1 : -1;
    var hd = akzb_fhd(f, ev, ',A=' + jzN(a) + ',SG=' + sg) + 'var lift=0,z=1,rot=0,q;' +
        'if(p>=0.68){q=(p-0.68)/0.32;z=1+0.035*A*rng(q,1.5,3);if(Math.abs(z-1)<0.0015)z=1;}' +
        'else{lift=p<0.28?ob(p/0.28,1.8):(p<0.56?1:1-ic((p-0.56)/0.12));if(lift<0.004)lift=0;z=1-0.11*A*lift;rot=-1.6*SG*lift;}' +
        'var d=M*0.035*A*lift,cw=W*z,ch=H*z;\n';
    var L = jzAdjLayer(f.comp, 'JZ FX kzCardSlam', ev.t, ev.dur), tr = akzb_xf(L, 'JZ Card', W / 2, H / 2);
    jzEP(tr, 3, 0); jzEX(tr, 4, hd + 'z*100'); jzEX(tr, 5, hd + 'z*100'); jzEX(tr, 8, hd + 'rot');
    // everything around the card, in the card's own turned frame: outline, solid shadow, darkened page (top to bottom)
    var S = jzEvShape(f.comp, 'JZ FX kzCardSlam card', ev.t, ev.dur), big = Math.max(W, H) * 4, g;
    jzXf(S, 'ADBE Position').setValue([W / 2, H / 2]);
    jzSetExpr(jzXf(S, 'ADBE Rotate Z'), hd + 'rot');
    jzSetExpr(jzXf(S, 'ADBE Opacity'), hd + '(p<0.68&&lift>0)?100:0');
    g = jzGrp(S, 'outline');
    akzb_rect(g, W, H, 0, 0, hd + '[cw,ch]', null);
    jzAddStroke(g, sc.fg, Math.max(1, M * 0.003));
    jzSetExpr(jzGX(g).property('ADBE Vector Group Opacity'), hd + '60*cl(lift)');
    g = jzGrp(S, 'shadow');
    akzb_rect(g, W, 10, 0, 0, hd + '[cw,Math.max(0,d)]', hd + '[d*SG,ch/2+d/2]');
    akzb_rect(g, 10, H, 0, 0, hd + '[Math.max(0,d),Math.max(0,ch-d)]', hd + '[SG*(cw/2+d/2),d/2]');
    jzAddFill(g, akzb_pop(sc));
    g = jzGrp(S, 'shade');
    jzAddRect(g, big, big, 0, 0, 0);
    akzb_rect(g, W, H, 0, 0, hd + '[cw,ch]', null);
    akzb_eo(jzAddFill(g, '#000000'));
    jzSetExpr(jzGX(g).property('ADBE Vector Group Opacity'), hd + '28*cl(lift)');
    g = jzGrp(S, 'page');
    jzAddRect(g, big, big, 0, 0, 0);
    akzb_rect(g, W, H, 0, 0, hd + '[cw,ch]', null);
    akzb_eo(jzAddFill(g, sc.bg));
} });

/* kzShockArcs — 衝撃の弧: a shock leaves the middle of the frame as pairs of arcs, like (( )) , thinning as they travel, while the picture bulges */
jzReg('fx', 'kzShockArcs', { build: function (f, ev) {
    var W = f.W, H = f.H, sc = ev.sc, M = Math.min(W, H), a = akzb_amp1(ev), vert = W < H * 0.9, Lc = vert ? H : W, i, k;
    var hd = akzb_fhd(f, ev, ',A=' + jzN(a));
    var L = jzAdjLayer(f.comp, 'JZ FX kzShockArcs', ev.t, ev.dur), tr = akzb_xf(L, 'JZ Bulge', W / 2, H / 2);
    jzEP(tr, 3, 0);
    jzEX(tr, vert ? 4 : 5, hd + 'var pu=p<0.15?oe(p/0.15):1-ioc((p-0.15)/0.85),st=1+0.035*A*pu;st>1.002?st*100:100');
    var S = jzEvShape(f.comp, 'JZ FX kzShockArcs arcs', ev.t, ev.dur), pc = akzb_pop(sc), bs = vert ? [90, -90] : [0, 180];
    for (i = 0; i < 3; i++) for (k = 0; k < 2; k++) {
        var q = hd + 'var q=cl((p-' + jzN(i * 0.11) + ')/0.7),R=' + jzN(Lc) + '*(0.2+0.28*oc(q)),span=Math.asin(Math.min(0.95,' + jzN(M * 0.36) + '/R)),lw=' + jzN(M * 0.024 * a * (1 - i * 0.22)) + '*(1-q);';
        var g = jzGrp(S, 'arc ' + (i + 1) + (k ? 'b' : 'a'));
        var el = jzAddEllipse(g, 100, 100, 0, 0);
        jzSetExpr(el.property('ADBE Vector Ellipse Size'), q + '[R*2,R*2]');
        jzAddTrimPaths(g, q + 'span/3.14159*100');
        var st = jzAddStroke(g, pc, 4);
        try { st.property('ADBE Vector Stroke Line Cap').setValue(2); } catch (e0) {}
        jzSetExpr(st.property('ADBE Vector Stroke Width'), q + 'Math.max(0,lw)');
        jzGX(g).property('ADBE Vector Position').setValue([W / 2, H / 2]);
        // the ellipse path starts at the top and runs clockwise: turn the group so the trimmed arc is centred on its direction
        jzSetExpr(jzGX(g).property('ADBE Vector Rotation'), q + jzN(bs[k] + 90) + '-span*57.2958');
        jzSetExpr(jzGX(g).property('ADBE Vector Group Opacity'), q + '(q<=0||q>=1||lw<0.5)?0:(1-q*q)*100');
    }
} });

/* kzDustLanding — 着地の土煙: the picture lands with a thud: it drops a little, bounces, and dust rolls away along the bottom edge on both sides */
jzReg('fx', 'kzDustLanding', { build: function (f, ev) {
    var W = f.W, H = f.H, sc = ev.sc, s = akzb_evS(ev), M = Math.min(W, H), a = akzb_amp1(ev), sd, i;
    var hd = akzb_fhd(f, ev) + 'var drop=p<0.1?oc(p/0.1):rng((p-0.1)/0.9,1.75,3.5),o=Math.round(' + jzN(M * 0.028 * a) + '*drop),q=cl((p-0.05)/0.95),e=oc(q);\n';
    akzb_shift(f, ev, 'kzDustLanding', hd, '0', 'o');
    var S = jzEvShape(f.comp, 'JZ FX kzDustLanding dust', ev.t, ev.dur), col = jzMixHex(sc.fg, sc.bg, 0.45);
    for (sd = -1; sd <= 1; sd += 2) for (i = 0; i < 6; i++) {
        var u = (i + 1) / 6, rK = M * (0.02 + 0.04 * akzb_r(s, i, sd + 2)) * a, yK = M * 0.07 * u * akzb_r(s, i, 7);
        var Q = hd + 'var r=' + jzN(rK) + '*(0.45+0.9*e)*(1-0.55*q);';
        var g = jzGrp(S, 'puff ' + (sd < 0 ? 'L' : 'R') + (i + 1));
        jzAddEllipse(g, 2, 2, 0, 0); jzAddFill(g, col);
        jzSetExpr(jzGX(g).property('ADBE Vector Position'), Q + '[' + jzN(W / 2) + '+' + akzb_n(sd) + '*(' + jzN(W * 0.06) + '+' + jzN(W * 0.38 * u) + '*e),' + jzN(H) + '-r*0.5-' + jzN(yK) + '*e]');
        jzSetExpr(jzGX(g).property('ADBE Vector Scale'), Q + '[r*100,r*100]');
        jzSetExpr(jzGX(g).property('ADBE Vector Group Opacity'), Q + '(q<=0||q>=1)?0:' + jzN(90 * (1 - 0.4 * u)) + '*(1-q)');
    }
} });

/* kzBulldoze — 押しのけバー: a bar ploughs across the frame: ahead of it the picture is squeezed up against the far edge, behind it it stands again
   (the squeezed picture = a copy of the cut scaled along one axis against that edge; the untouched cut shows behind the bar) */
jzReg('fx', 'kzBulldoze', { build: function (f, ev) {
    var W = f.W, H = f.H, sc = ev.sc, s = akzb_evS(ev), M = Math.min(W, H), vert = W < H ? akzb_r(s, 1) < 0.6 : akzb_r(s, 1) < 0.15, rev = akzb_r(s, 2) < 0.5, Lc = vert ? H : W;
    var hd = akzb_fhd(f, ev, ',LC=' + Lc + ',RV=' + (rev ? 1 : 0)) + 'var b=Math.round(LC*ios(p)),rest=LC-b,bw=Math.max(3,' + jzN(M * 0.03 * akzb_amp1(ev)) + '*Math.sin(Math.PI*p)),' +
        'seam=RV?rest:b,lw=Math.max(1,bw*0.16),ld=RV?seam-bw/2-lw*2:seam+bw/2+lw,on=(p>0&&p<1&&rest>=1);\n';
    var ax = vert ? W / 2 : (rev ? 0 : W), ay = vert ? (rev ? 0 : H) : H / 2;
    akzb_copies(f, ev, 'kzBulldoze', function (D, isMatte) {
        var tr = akzb_xf(D, 'JZ Squeeze', ax, ay);
        jzEP(tr, 3, 0);
        jzEX(tr, vert ? 4 : 5, hd + 'Math.max(0.01,rest/LC*100)');
    });
    var S = jzEvShape(f.comp, 'JZ FX kzBulldoze bar', ev.t, ev.dur), g;
    jzSetExpr(jzXf(S, 'ADBE Opacity'), hd + 'on?100:0');
    g = jzGrp(S, 'bar');
    akzb_rect(g, 10, 10, 0, 0, hd + (vert ? '[W,bw]' : '[bw,H]'), hd + (vert ? '[W/2,seam]' : '[seam,H/2]'));
    jzAddFill(g, akzb_pop(sc));
    g = jzGrp(S, 'leading line');
    akzb_rect(g, 10, 10, 0, 0, hd + (vert ? '[W,lw]' : '[lw,H]'), hd + (vert ? '[W/2,ld+lw/2]' : '[ld+lw/2,H/2]'));
    jzAddFill(g, sc.fg, 80);
} });

/* ================================================================ TRANSITIONS (t = { comp, A, B, t0, dur, P, sc, W, H }) */
function akzb_tacc(t) { var sc = t.sc; return jzContrast(sc.accent, sc.bg) >= 1.6 ? sc.accent : sc.fg; }
function akzb_thd(t, extra) { return jzEvHead(t.t0, t.dur, ',W=' + t.W + ',H=' + t.H + (extra || '')) + AKZB_FNS; }
function akzb_tbg(t, name) { var bgS = jzEvSolid(t.comp, name, t.sc.bg, t.t0, t.dur); try { bgS.moveAfter(t.A); } catch (e) {} return bgS; }

/* kzShoveOff — 突き飛ばし: the new frame slams in from the side and overshoots; the old one is knocked clean away, tumbling as it goes */
jzReg('trans', 'kzShoveOff', {
    plan: function (rng, st) { return { dir: rng.pick([1, -1]), vert: rng.chance(0.25) }; },
    build: function (t) {
        var W = t.W, H = t.H, dir = t.P.dir || 1, vert = !!t.P.vert, Lc = vert ? H : W, cx = W / 2, cy = H / 2;
        var HD = akzb_thd(t, ',DR=' + dir + ',LC=' + Lc) + 'var eA=oc(cl(p*1.15)),dA=-DR*LC*1.15*eA,dB=p>=1?0:Math.round(DR*LC*(1-ob(p,1.5))),' +
            'lw=' + jzN(Math.max(2, Math.min(W, H) * 0.012)) + '*(1-p),edge=DR>0?dB-lw:dB+LC;\n';
        akzb_tbg(t, 'JZ Trans shove bg');
        var xa = akzb_xf(t.A, 'JZ Trans shove A', cx, cy);
        jzEX(xa, 2, HD + 'p<=0?[' + jzN(cx) + ',' + jzN(cy) + ']:' + (vert ? '[' + jzN(cx) + '+W*0.1*eA*eA,' + jzN(cy) + '+dA]' : '[' + jzN(cx) + '+dA,' + jzN(cy) + '+H*0.12*eA*eA]'));
        jzEX(xa, 8, HD + 'p<=0?0:-DR*14*eA');
        var xb = akzb_xf(t.B, 'JZ Trans shove B', cx, cy);
        jzEX(xb, 2, HD + (vert ? '[' + jzN(cx) + ',' + jzN(cy) + '+dB]' : '[' + jzN(cx) + '+dB,' + jzN(cy) + ']'));
        // accent edge on the leading side of the new frame
        var S = jzEvShape(t.comp, 'JZ Trans shove edge', t.t0, t.dur), g = jzGrp(S, 'edge');
        akzb_rect(g, 10, 10, 0, 0, HD + (vert ? '[W,Math.max(0,lw)]' : '[Math.max(0,lw),H]'), HD + (vert ? '[W/2,edge+lw/2]' : '[edge+lw/2,H/2]'));
        jzAddFill(g, akzb_tacc(t));
        jzSetExpr(jzXf(S, 'ADBE Opacity'), HD + '(p<=0||p>=1)?0:cl((1-p)*1.4)*100');
    }
});
/* kzCrushDown — 押し潰し: the new frame comes down like a press: the old one is squeezed flat against the far edge, pushes back once, and is gone */
jzReg('trans', 'kzCrushDown', {
    plan: function (rng, st) { return { from: rng.pick(['top', 'top', 'left', 'right', 'bottom']) }; },
    build: function (t) {
        var W = t.W, H = t.H, from = t.P.from || 'top', hor = from === 'left' || from === 'right', Lc = hor ? W : H, cx = W / 2, cy = H / 2;
        var lw = Math.max(2, Math.min(W, H) * 0.007), near = from === 'top' || from === 'left';
        var HD = akzb_thd(t, ',LC=' + Lc) + 'var tl=0.62,f,q,u;if(p<tl){q=p/tl;f=q*q;}else{u=(p-tl)/(1-tl);f=1-0.075*Math.abs(Math.sin(u*Math.PI*2))*(1-u);}' +
            'var d=Math.round(LC*f),rest=LC-d,seam=' + (near ? 'd' : 'rest-' + jzN(lw)) + ';\n';
        akzb_tbg(t, 'JZ Trans crush bg');
        // the old frame is squeezed against the edge the press moves towards
        var xa = akzb_xf(t.A, 'JZ Trans crush A', hor ? (near ? W : 0) : cx, hor ? cy : (near ? H : 0));
        jzEP(xa, 3, 0);
        jzEX(xa, hor ? 5 : 4, HD + 'p<=0?100:Math.max(0.01,rest/LC*100)');
        var xb = akzb_xf(t.B, 'JZ Trans crush B', cx, cy), off = near ? 'd-LC' : 'rest';
        jzEX(xb, 2, HD + 'var o=p>=1?0:' + off + ';' + (hor ? '[' + jzN(cx) + '+o,' + jzN(cy) + ']' : '[' + jzN(cx) + ',' + jzN(cy) + '+o]'));
        var S = jzEvShape(t.comp, 'JZ Trans crush seam', t.t0, t.dur), g = jzGrp(S, 'seam');
        akzb_rect(g, hor ? lw : W, hor ? H : lw, 0, 0, null, HD + (hor ? '[seam+' + jzN(lw / 2) + ',H/2]' : '[W/2,seam+' + jzN(lw / 2) + ']'));
        jzAddFill(g, akzb_tacc(t));
        jzSetExpr(jzXf(S, 'ADBE Opacity'), HD + '(p<=0||p>=1)?0:cl((1-p)*3)*100');
    }
});
/* kzCarousel — 大回し: both frames ride on one huge wheel whose hub is far outside the picture: a turn carries the old one off and the new
   one in, a little too far, and back */
jzReg('trans', 'kzCarousel', {
    plan: function (rng, st) { return { dir: rng.pick([1, -1]), top: rng.chance(0.3) }; },
    build: function (t) {
        var W = t.W, H = t.H, dir = t.P.dir || 1, R = Math.max(W, H) * 1.3, px = W / 2, py = t.P.top ? H / 2 - R : H / 2 + R;
        var th = 2 * Math.atan((W / 2) / (R - H / 2)) * 1.05 * 180 / Math.PI;
        var HD = akzb_thd(t, ',DR=' + dir + ',TH=' + jzN(th)) + 'var e=ioc(cl(p/0.78))+0.035*Math.sin(Math.PI*cl((p-0.55)/0.45));\n';
        akzb_tbg(t, 'JZ Trans carousel bg');
        var xa = akzb_xf(t.A, 'JZ Trans carousel A', px, py);
        jzEX(xa, 8, HD + 'p<=0?0:-DR*TH*e');
        var xb = akzb_xf(t.B, 'JZ Trans carousel B', px, py);
        jzEX(xb, 8, HD + 'p>=1?0:DR*TH*(1-e)');
    }
});
