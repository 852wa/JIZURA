// ================================================================ pack kinetic part 4 — word-timed cameras, transitions, treatments and decor

// word clock of a cut (same rule as the browser: onsets spread over the first half; no beat grid in AE)
function akn_wordTimes(cut, nMax) {
    var n = Math.max(1, Math.min(nMax || 6, (cut.words || []).length || 1)), dur = cut.dur || 2, i, t = [];
    if (n < 2 && dur > 1.2) n = 2;
    var last = Math.max(0, Math.min(dur * 0.5, (n - 1) * 0.38));
    for (i = 0; i < n; i++) t.push(n > 1 ? last * i / (n - 1) : 0);
    return t;
}
var AKN_CI = 'function ci(t){var k=-1;for(var q=0;q<TS.length;q++)if(t>=TS[q])k=q;return k;}';

/* ================================================================ CAMERA */
// browser design px -> comp px (blur radii)
function akn_px(cam) { var W = cam.W || 1920, H = cam.H || 1080, r = W / H; return Math.min(W, H) / ((Math.abs(r - 1) < 0.02 || Math.abs(r - 0.8) < 0.02) ? 1440 : 1080); }
// CAM(t) -> [x, y, sx, sy, rot, skx, blur]; snippets see t, KM, K (= min(1, KM)), DUR, W, H, TS (word onsets), NT, ci(t) + easings
function akn_camfn(cam, o) {
    return jzCamHead(cam) + AKN_FNS + 'var W=' + jzN(cam.W || 1920) + ',H=' + jzN(cam.H || 1080) + ',TS=' + akn_arr(akn_wordTimes(cam.cut, 6)) + ',NT=TS.length;' + AKN_CI + '\n' +
        'function CAM(t){t=Math.max(0,t);var K=Math.min(1,KM),x=0,y=0,s=1,sx=1,sy=1,rot=0,skx=0,blur=0;\n' + o.code + '\nreturn [x,y,s*sx,s*sy,rot,skx,blur];}\n';
}
// null gets x / y / scale / rotation; skew (Transform effect) and blur go on every content layer. Ghosts (time-shifted copies)
// get a Transform effect that re-plays the camera at their own lag, like the browser's per-pass camera.
function akn_cam(cam, o) {
    var F = akn_camfn(cam, o), i, e, C = cam.content || [], lag, LG;
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
        if (o.blur) { e = jzEffect(C[i], 'ADBE Gaussian Blur 2', 'JZ Cam Blur'); jzEX(e, 1, F + 'var B=CAM(time)[6];B>0.4?B*' + jzN(2 * akn_px(cam)) + ':0'); }
    }
}
function akn_n(v) { return '(' + jzN(v) + ')'; }

jzReg('cam', 'knReadPan', {
    // one snap per word, then it settles back to centre (the whip blur is left out: skew only)
    plan: function (rng, st) { return { a: rng.range(0.026, 0.036) }; },
    apply: function (cam, P) {
        akn_cam(cam, { xy: 1, s: 1, skx: 1, code: 'var A=W*' + akn_n(P.a || 0.03) + '*KM;s=1.035;' +
            'if(NT<2){x=A*(1-2*ios(t/Math.max(0.4,DUR)))*0.5;}else{function pz(k){return A*(1-2*k/(NT-1));}' +
            'var k=Math.max(0,ci(t)),e=k>0?ob(cl((t-TS[k])/0.2),1.8):1;x=k>0?lrp(pz(k-1),pz(k),e):pz(0);x*=1-ioc(cl((t-TS[NT-1]-0.55)/0.5));' +
            'var wh=k>0?bel(cl((t-TS[k])/0.14)):0;skx=-(A<0?-1:1)*2.5*wh*KM;}' });
    }
});
jzReg('cam', 'knTiltKick', {
    // every new word kicks the frame into a lean, alternating sides; the last one sets it level
    plan: function (rng, st) { return { dir: rng.pick([1, -1]), a: rng.range(2.4, 3.4) }; },
    apply: function (cam, P) {
        akn_cam(cam, { rot: 1, s: 1, code: 'var A=' + akn_n(P.a || 3) + '*K*' + akn_n(P.dir || 1) + ';function ag(k){return k>=NT-1?0:(k%2?-A:A);}' +
            'var k=Math.max(0,ci(t)),d=t-TS[k],fr=k>0?ag(k-1):0,to=ag(k),r=to+(fr-to)*Math.exp(-d*7)*Math.cos(d*17);rot=Math.max(-5,Math.min(5,r));s=1.03+0.012*Math.abs(r)/3;' });
    }
});
jzReg('cam', 'knCardFlip', {
    // the frame flips over like a card to show the cut, and pinches on each new word
    plan: function (rng, st) { return { vert: rng.chance(0.3), dir: rng.pick([1, -1]) }; },
    apply: function (cam, P) {
        var code = 'var d=' + akn_n(P.dir || 1) + ',q=cl(t/0.42),th=90*(1-ob(q,1.7)),f=Math.max(0.04,Math.abs(Math.cos(th*0.0174533)));' +
            'for(var i=1;i<NT;i++){var dd=t-TS[i];if(dd>0&&dd<0.24)f*=1-0.1*K*bel(dd/0.24);}var sn=Math.sin(th*0.0174533);s=1.01;';
        if (P.vert) akn_cam(cam, { xy: 1, s: 1, code: code + 'sy=f;y=-H*0.02*sn;' });
        else akn_cam(cam, { xy: 1, s: 1, skx: 1, code: code + 'sx=f;skx=7*sn*d*K*0.4;x=W*0.02*sn*d;' });
    }
});
jzReg('cam', 'knShearKick', {
    // a sideways shear kick on every word that springs back upright
    plan: function (rng, st) { return { a: rng.range(5, 8) }; },
    apply: function (cam, P) {
        akn_cam(cam, { xy: 1, s: 1, skx: 1, code: 'var KK=Math.min(1.1,KM),ix=Math.max(0,ci(t)),sn=t-TS[ix],w=Math.exp(-sn*8)*Math.cos(sn*22),sg=ix%2?1:-1;' +
            'skx=' + akn_n(P.a || 6.5) + '*KK*w*sg;x=W*0.006*KK*w*sg;s=1.02;' });
    }
});
jzReg('cam', 'knJumpCut', {
    // hard reframes on every word (tighter, wider, off-centre) with no in-betweens, then back to centre
    plan: function (rng, st) { return { s0: rng.int(0, 99) }; },
    apply: function (cam, P) {
        var sd = ((cam.cut.seed | 0) + (P.s0 | 0)), rx = [], ry = [], k;
        for (k = 0; k < 6; k++) { rx.push(0.5 + 0.5 * akn_r(sd, k, 1)); ry.push(akn_rs(sd, k, 2)); }
        akn_cam(cam, { xy: 1, s: 1, code: 'var RX=' + akn_arr(rx) + ',RY=' + akn_arr(ry) + ',SS=[1,1.12,1.05,1.14,1.08,1.13],k=Math.max(0,ci(t));' +
            'if(t>TS[NT-1]+0.5||NT<2){s=1.02;}else{var S0=SS[(k+' + (((sd % 3) + 3) % 3) + ')%6],sg=k%2?1:-1;s=1+(S0-1)*K;x=sg*RX[k%6]*W*0.04*K*(k?1:0);y=RY[k%6]*H*0.035*K;}' });
    }
});
jzReg('cam', 'knRushIn', {
    // the whole frame rushes up from far away, overshoots a touch and locks
    plan: function (rng, st) { return { z: rng.range(0.66, 0.76), r: rng.range(-4, 4) }; },
    apply: function (cam, P) {
        akn_cam(cam, { s: 1, rot: 1, blur: 1, code: 'var q=cl(t/0.34);if(q>=1){s=1+0.01*cl((t-0.34)/Math.max(0.3,DUR));}else{var e=ob(q,1.9);' +
            's=lrp(1-(1-' + akn_n(P.z || 0.7) + ')*K,1,e);rot=' + akn_n(P.r || 0) + '*(1-oc(q))*K;blur=9*K*(1-oc(q));}' });
    }
});

/* ================================================================ TRANSITIONS */
function akn_tacc(t) { var sc = t.sc; return jzContrast(sc.accent, sc.bg) >= 1.6 ? sc.accent : sc.fg; }
function akn_thd(t) { return jzEvHead(t.t0, t.dur) + AKN_FNS; }
// Transform effect on a wrapper: identity outside the window
function akn_xf(L, name) { var e = jzEffect(L, 'ADBE Geometry2', name); jzEP(e, 3, 1); return L.property('ADBE Effect Parade').property(name); }

jzReg('trans', 'knCornerSwing', {
    // the old frame swings away round a corner, the new one swings in behind it
    plan: function (rng, st) { return { c: rng.int(0, 3) }; },
    build: function (t) {
        var W = t.W, H = t.H, c = (t.P.c | 0) % 4, px = (c === 1 || c === 2) ? W : 0, py = c >= 2 ? 0 : H, sg = (c === 0 || c === 2) ? 1 : -1, HD = akn_thd(t) + 'var e=ioc(p);';
        var bgS = jzEvSolid(t.comp, 'JZ Trans swing bg', t.sc.bg, t.t0, t.dur); bgS.moveAfter(t.A);
        var xa = akn_xf(t.A, 'JZ Trans swing A');
        jzEP(xa, 1, [px, py]); jzEP(xa, 2, [px, py]); jzEX(xa, 8, HD + 'p<=0||p>=1?0:' + (90 * sg) + '*e');
        var xb = akn_xf(t.B, 'JZ Trans swing B');
        jzEP(xb, 1, [px, py]); jzEP(xb, 2, [px, py]); jzEX(xb, 8, HD + 'p>=1?0:' + (-90 * sg) + '*(1-e)');
        // thin accent edge along the swinging seam
        var lw = Math.max(2, Math.min(W, H) * 0.006), S = jzEvShape(t.comp, 'JZ Trans swing edge', t.t0, t.dur), g = jzGrp(S, 'edge');
        var left = (c === 0 || c === 3), y0 = -(py ? H : 0);
        jzAddRect(g, lw, H * 2, 0, left ? -lw / 2 : lw / 2, y0 + H);
        jzAddFill(g, akn_tacc(t));
        jzXf(S, 'ADBE Position').setValue([px, py]);
        jzSetExpr(jzXf(S, 'ADBE Rotate Z'), HD + (90 * sg) + '*e');
        jzSetExpr(jzXf(S, 'ADBE Opacity'), HD + '100*bel(p)');
    }
});
jzReg('trans', 'knStutterCut', {
    // rhythm cut: old and new frames trade places in hard cuts before the new one holds
    plan: function (rng, st) { return { z: rng.range(1.05, 1.1), o: rng.range(0.02, 0.035) * rng.pick([1, -1]) }; },
    build: function (t) {
        var W = t.W, H = t.H, z = t.P.z || 1.07, o = (t.P.o || 0.03) * W;
        var HD = akn_thd(t) + 'var CU=[0.18,0.36,0.52,0.7],k=0;while(k<4&&p>=CU[k])k++;var SQ=[[0,1,0],[1,' + jzN(z) + ',' + jzN(o) + '],[0,' + jzN(1 / z) + ',' + jzN(-o * 0.6) + '],[1,' + jzN(z * 1.03) + ',' + jzN(-o) + '],[1,1,0]],Q=SQ[k];';
        var bgS = jzEvSolid(t.comp, 'JZ Trans stutter bg', (t.scPrev || t.sc).bg, t.t0, t.dur); bgS.moveAfter(t.A);
        var xa = akn_xf(t.A, 'JZ Trans stutter A');
        jzEP(xa, 1, [W / 2, H / 2]); jzEX(xa, 2, HD + '(p>0&&p<1&&Q[0]===0)?[' + jzN(W / 2) + '+Q[2],' + jzN(H / 2) + ']:[' + jzN(W / 2) + ',' + jzN(H / 2) + ']');
        jzEX(xa, 3, HD + '(p>0&&p<1&&Q[0]===0)?Q[1]*100:100');
        var xb = akn_xf(t.B, 'JZ Trans stutter B');
        jzEP(xb, 1, [W / 2, H / 2]); jzEX(xb, 2, HD + '(p>0&&p<1&&Q[0]===1)?[' + jzN(W / 2) + '+Q[2],' + jzN(H / 2) + ']:[' + jzN(W / 2) + ',' + jzN(H / 2) + ']');
        jzEX(xb, 3, HD + '(p>0&&p<1&&Q[0]===1)?Q[1]*100:100');
        jzEX(xb, 9, HD + 'p>=1?100:(p<=0?0:Q[0]*100)');
        // a one-frame accent bar on each cut
        var h = Math.max(3, H * 0.012), S = jzEvShape(t.comp, 'JZ Trans stutter bar', t.t0, t.dur), g = jzGrp(S, 'bar');
        jzAddRect(g, W, h, 0, W / 2, 0); jzAddFill(g, akn_tacc(t));
        jzSetExpr(jzXf(S, 'ADBE Position'), HD + '[0,(k%2?0.3:0.68)*' + jzN(H) + '+' + jzN(h / 2) + ']');
        jzSetExpr(jzXf(S, 'ADBE Opacity'), HD + 'var sn=k>0?p-CU[k-1]:1;sn<0.06&&p<1?90:0');
    }
});
jzReg('trans', 'knStripSlam', {
    // the new frame drops in as tall strips, one after another, each landing with a small bounce
    plan: function (rng, st) { return { n: rng.int(3, 5), rev: rng.chance(0.5), up: rng.chance(0.25) }; },
    build: function (t) {
        var W = t.W, H = t.H, n = Math.max(2, Math.min(6, t.P.n || 4)), up = !!t.P.up, i;
        var HD = akn_thd(t) + 'function yq(q){var tl=0.62,y;if(q<tl){var f=q/tl;y=-' + jzN(H) + '*(1-f*f);}else{var u=(q-tl)/(1-tl);y=-' + jzN(H) + '*0.06*Math.abs(Math.sin(u*Math.PI*2))*(1-u);}return ' + (up ? '-y' : 'y') + ';}';
        // darken the old frame
        var dk = jzEvSolid(t.comp, 'JZ Trans strip shade', '#000000', t.t0, t.dur); dk.moveBefore(t.A);
        jzSetExpr(jzXf(dk, 'ADBE Opacity'), HD + '30*p');
        var top = t.B;
        for (i = 0; i < n; i++) {
            var k = t.P.rev ? n - 1 - i : i, x0 = Math.round(i * W / n), x1 = Math.round((i + 1) * W / n), D = t.B.duplicate();
            try { D.name = 'JZ Trans strip ' + i; } catch (e0) {}
            D.moveBefore(top); top = D;
            D.inPoint = Math.max(0, t.t0); D.outPoint = t.t0 + t.dur;
            jzMaskRect(D, x0, -H, x1, H * 2);
            var xe = akn_xf(D, 'JZ Trans strip drop');
            jzEP(xe, 1, [W / 2, H / 2]);
            jzEX(xe, 2, HD + 'var q=cl((p-' + jzN(k / n * 0.45) + ')/0.55);[' + jzN(W / 2) + ',' + jzN(H / 2) + '+yq(q)]');
            jzEX(xe, 9, HD + 'var q=cl((p-' + jzN(k / n * 0.45) + ')/0.55);q>0?100:0');
        }
        var xb = akn_xf(t.B, 'JZ Trans strip hide');
        jzEX(xb, 9, HD + 'p>0&&p<1?0:100');
        // accent edge on each falling strip
        var S = jzEvShape(t.comp, 'JZ Trans strip edges', t.t0, t.dur), eh = Math.max(3, H * 0.008), acc = akn_tacc(t);
        S.moveBefore(top);
        for (i = 0; i < n; i++) {
            var k2 = t.P.rev ? n - 1 - i : i, a0 = Math.round(i * W / n), a1 = Math.round((i + 1) * W / n), g = jzGrp(S, 'edge ' + i);
            jzAddRect(g, a1 - a0, eh, 0, (a0 + a1) / 2, up ? 0 : H - eh / 2);
            jzAddFill(g, acc);
            var q = 'var q=cl((p-' + jzN(k2 / n * 0.45) + ')/0.55);';
            jzSetExpr(jzGX(g).property('ADBE Vector Position'), HD + q + '[0,yq(q)]');
            jzSetExpr(jzGX(g).property('ADBE Vector Group Opacity'), HD + q + '(q>0&&q<1)?80*(1-q):0');
        }
    }
});

/* ================================================================ TREATMENTS */
function akn_alive(L) {
    var td; try { td = L.property('ADBE Text Properties').property('ADBE Text Document').value; } catch (e) { return false; }
    if (!td || td.applyFill === false || !jzTrim(String(td.text || '')) || !(td.fontSize > 1)) return false;
    var op = 100; try { op = jzXf(L, 'ADBE Opacity').valueAtTime(0, true); } catch (e2) { op = jzXf(L, 'ADBE Opacity').value; }
    return op >= 89.9;
}
jzReg('treat', 'knWordScale', {
    // one key word is set big, the rest small — the line re-flows around the contrast
    plan: function (rng, st) { return { big: rng.range(1.28, 1.42), small: rng.range(0.78, 0.86), pick: rng.pick(['long', 'long', 'last', 'first']) }; },
    apply: function (ctx, L, P, o) {
        if (!akn_alive(L)) return;
        var G = akn_geo(L), Wd = akn_words(ctx.cut, G), nW = Wd.nW, i, j;
        if (nW < 2) return;
        var big = P.big || 1.35, small = P.small || 0.82, cnt = [], kan = [], kw = 0;
        for (j = 0; j < nW; j++) { cnt.push(0); kan.push(0); }
        for (i = 0; i < G.n; i++) { j = Wd.map[i]; if (j >= 0) { cnt[j]++; if (jzIsKanji(G.g[i].ch)) kan[j]++; } }
        if (P.pick === 'last') kw = nW - 1; else if (P.pick === 'first') kw = 0;
        else for (j = 1; j < nW; j++) if (cnt[j] + kan[j] * 0.5 > cnt[kw] + kan[kw] * 0.5) kw = j;
        var vert = G.vert, tb = 0, ts = 0;
        for (i = 0; i < G.n; i++) { j = Wd.map[i]; if (j < 0) continue; var ad = vert ? G.g[i].h : G.g[i].w; if (j === kw) tb += ad; else ts += ad; }
        var norm = Math.min(1, (tb + ts) / Math.max(1e-6, tb * big + ts * small));
        var offs = [], scs = [], lines = {}, li;
        for (i = 0; i < G.n; i++) { offs.push([0, 0]); scs.push(1); li = vert ? 0 : G.g[i].li; (lines[li] = lines[li] || []).push(i); }
        var td = L.property('ADBE Text Properties').property('ADBE Text Document').value, trk = (td.tracking || 0) / 1000 * G.fs;
        var just = 'c'; try { if (td.justification === ParagraphJustification.LEFT_JUSTIFY) just = 'l'; else if (td.justification === ParagraphJustification.RIGHT_JUSTIFY) just = 'r'; } catch (e1) {}
        for (li in lines) if (lines.hasOwnProperty(li)) {
            var ln = lines[li], g0 = G.g[ln[0]], gl = G.g[ln[ln.length - 1]];
            var a0 = vert ? g0.y - g0.h / 2 : g0.x - g0.w / 2, a1 = vert ? gl.y + gl.h / 2 : gl.x + gl.w / 2, pos = 0, np = [];
            for (i = 0; i < ln.length; i++) { j = Wd.map[ln[i]]; var k = (j === kw ? big : small) * norm, g = G.g[ln[i]], adv = (vert ? g.h : g.w) * k; np.push(pos + adv / 2); pos += adv + trk; scs[ln[i]] = k; }
            var len = pos - trk, start = just === 'l' ? a0 : just === 'r' ? a1 - len : a0 + (a1 - a0 - len) / 2;
            for (i = 0; i < ln.length; i++) {
                var g2 = G.g[ln[i]], na = start + np[i];
                offs[ln[i]] = vert ? [0, na - g2.y] : [na - g2.x, (1 - scs[ln[i]]) * 0.36 * G.fs];
            }
        }
        jzCharScales(L, scs, 'JZ Treat WordScale Size');
        jzCharOffsets(L, offs, 'JZ Treat WordScale Place');
    }
});
jzReg('treat', 'knWordPlate', {
    // every other word is knocked out of a solid plate
    plan: function (rng, st) { return { first: rng.chance(0.5), pad: rng.range(0.08, 0.14), tilt: rng.chance(0.4) ? rng.range(1.5, 3) : 0 }; },
    apply: function (ctx, L, P, o) {
        if (!akn_alive(L)) return;
        var G = akn_geo(L), Wd = akn_words(ctx.cut, G), nW = Wd.nW, i, j, sc = ctx.sc;
        if (nW < 2) return;
        var plate = jzContrast(sc.ink, sc.bg) >= 2 ? sc.ink : sc.fg, tc = null, bv = 0, cs = [sc.bg, sc.fg, sc.ink, sc.accent];
        for (i = 0; i < cs.length; i++) { if (!cs[i] || cs[i] === plate) continue; var k = jzContrast(cs[i], plate); if (k > bv) { bv = k; tc = cs[i]; } }
        if (bv < 2.6) tc = jzLum(plate) > 0.5 ? '#111111' : '#FFFFFF';
        var flags = [];
        for (i = 0; i < G.n; i++) { j = Wd.map[i]; flags.push(j >= 0 && ((j % 2 === 0) === !!P.first)); }
        jzCharColors(L, tc, flags, 'JZ Treat WordPlate Colour');
        // plates: one per on-word and line, in the text layer's own space (parented)
        var boxes = [], key = {};
        for (i = 0; i < G.n; i++) {
            if (!flags[i]) continue;
            var g = G.g[i], kk = Wd.map[i] * 100 + g.li, B = key[kk];
            if (!B) { B = key[kk] = { x0: 1e9, y0: 1e9, x1: -1e9, y1: -1e9 }; boxes.push(B); }
            B.x0 = Math.min(B.x0, g.x - g.w / 2); B.x1 = Math.max(B.x1, g.x + g.w / 2); B.y0 = Math.min(B.y0, g.y - g.h / 2); B.y1 = Math.max(B.y1, g.y + g.h / 2);
        }
        if (!boxes.length) return;
        var S = ctx.comp.layers.addShape(); S.name = 'JZ Treat WordPlate';
        S.moveAfter(L);
        var pd = G.fs * (P.pad || 0.1);
        for (i = 0; i < boxes.length; i++) {
            var b = boxes[i], gp = jzGrp(S, 'plate ' + i);
            jzAddRect(gp, b.x1 - b.x0 + pd * 2, b.y1 - b.y0 + pd * 1.4, 0, 0, 0);
            jzAddFill(gp, plate);
            jzGX(gp).property('ADBE Vector Position').setValue([(b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2]);
            if (P.tilt) jzGX(gp).property('ADBE Vector Rotation').setValue(i % 2 ? P.tilt : -P.tilt);
        }
        S.setParentWithJump(L);
        jzXf(S, 'ADBE Anchor Point').setValue([0, 0]); jzXf(S, 'ADBE Position').setValue([0, 0]);
        var HD = jzHead(ctx, { mi: (o && o.mi) || 0, size: G.fs });
        jzSetExpr(jzXf(S, 'ADBE Opacity'), HD + 'var po=100;try{po=parent.transform.opacity;}catch(e){}time<DL?0:po*oc((time-DL)/IN)*(1-PO)');
    }
});

/* ================================================================ DECOR */
jzReg('decor', 'knSpeedTrail', { back: false, build: function (ctx, bb, d) {
    // speed lines stream off the back of the lyric (on its roomier side)
    var W = ctx.W, H = ctx.H, sc = ctx.sc, u = Math.min(W, H), i;
    if (!bb) bb = { x0: W * 0.35, x1: W * 0.65, y0: H * 0.4, y1: H * 0.6 };
    var vert = (bb.y1 - bb.y0) > (bb.x1 - bb.x0) * 1.3, roomA = vert ? bb.y0 : bb.x0, roomB = vert ? H - bb.y1 : W - bb.x1;
    var side = Math.abs(roomA - roomB) < u * 0.05 ? (d.right ? 1 : -1) : (roomB > roomA ? 1 : -1);
    var N = 8 + (d.n | 0) * 3, col = jzContrast(sc.sub, sc.bg) >= 1.4 ? sc.sub : sc.fg;
    var span = vert ? bb.x1 - bb.x0 : bb.y1 - bb.y0, len = vert ? bb.y1 - bb.y0 : bb.x1 - bb.x0, tight = Math.max(roomA, roomB) < u * 0.14;
    var e0 = side < 0 ? (vert ? bb.y0 : bb.x0) : (vert ? bb.y1 : bb.x1);
    var S = jzShapeLayer(ctx, 'kn speed trail', 0, 0), TH = jzTH(ctx) + 'var o=oc(time/0.3)*K;';
    for (i = 0; i < N; i++) {
        var r = function (k) { return akn_r(d.seed | 0, i, k); };
        var f = (i + 0.5) / N, lw = Math.max(1.5, u * (0.003 + r(1) * 0.006)), st = tight ? len * (0.2 + r(3) * 0.3) : -u * (0.015 + 0.02 * r(3));
        var c = tight ? (i % 2 ? (vert ? bb.x1 : bb.y1) + span * (0.05 + 0.3 * f) : (vert ? bb.x0 : bb.y0) - span * (0.05 + 0.3 * f))
            : jzLerp(vert ? bb.x0 : bb.y0, vert ? bb.x1 : bb.y1, 0.08 + 0.84 * f) + (r(7) - 0.5) * span * 0.04;
        var g = jzGrp(S, 'streak ' + i);
        jzAddRect(g, vert ? lw : 1, vert ? 1 : lw, 0, 0, 0);
        jzAddFill(g, col);
        var q = TH + 'var L0=' + jzN(u * (0.18 + r(2) * 0.3)) + '*o,ph=((time*' + jzN(1.3 + r(4) * 1.5) + '+' + jzN(r(5)) + ')%1+1)%1,s0=' + jzN(-st) + '+ph*L0*0.6,s1=s0+L0*(0.35+0.65*(1-ph)),' +
            'p0=' + jzN(e0) + '+' + side + '*s0,p1=' + jzN(e0) + '+' + side + '*s1;';
        jzSetExpr(jzGX(g).property('ADBE Vector Position'), q + (vert ? '[' + jzN(c) + ',(p0+p1)/2]' : '[(p0+p1)/2,' + jzN(c) + ']'));
        jzSetExpr(jzGX(g).property('ADBE Vector Scale'), q + (vert ? '[100,Math.abs(p1-p0)*100]' : '[Math.abs(p1-p0)*100,100]'));
        jzSetExpr(jzGX(g).property('ADBE Vector Group Opacity'), q + jzN((0.35 + 0.35 * r(6)) * 100) + '*o*(1-ph*0.5)');
    }
    jzNoGhost(S);
} });
jzReg('decor', 'knWordTicks', { back: false, build: function (ctx, bb, d) {
    // a segmented bar that fills one segment per word as the words arrive, with a running count
    var W = ctx.W, H = ctx.H, sc = ctx.sc, u = Math.min(W, H), ts = akn_wordTimes(ctx.cut, 6), n = ts.length, i;
    if (!bb) bb = { x0: W * 0.35, x1: W * 0.65, y0: H * 0.4, y1: H * 0.6 };
    var segW = u * 0.06, segH = Math.max(4, u * 0.011), gp = u * 0.014, tot = n * segW + (n - 1) * gp;
    var below = bb.y1 + u * 0.08 < H * 0.93, y = below ? bb.y1 + u * 0.06 : bb.y0 - u * 0.06;
    var cx = jzClamp((bb.x0 + bb.x1) / 2, tot / 2 + W * 0.06, W * 0.94 - tot / 2), x0 = cx - tot / 2, acc = jzContrast(sc.accent, sc.bg) >= 1.6 ? sc.accent : sc.fg;
    var S = jzShapeLayer(ctx, 'kn word ticks', x0, y), TH = jzTH(ctx) + AKN_FNS + 'var TS=' + akn_arr(ts) + ',o=oc(time/0.35)*K;' + AKN_CI + 'var k=ci(time);';
    for (i = 0; i < n; i++) {
        var g = jzGrp(S, 'slot ' + i);
        jzAddRect(g, segW, segH, 0, i * (segW + gp) + segW / 2, 0);
        jzAddFill(g, sc.sub, 35);
    }
    for (i = 0; i < n; i++) {
        var g2 = jzGrp(S, 'fill ' + i);
        jzAddRect(g2, segW, segH, 0, segW / 2, 0);
        jzAddFill(g2, acc);
        var x = i * (segW + gp), F = TH + 'var f=' + i + '<=k?oe((time-TS[' + i + '])/0.18):0,cur=' + i + '===k;';
        jzGX(g2).property('ADBE Vector Position').setValue([x, 0]);
        jzSetExpr(jzGX(g2).property('ADBE Vector Position'), F + '[' + jzN(x) + ',cur?' + jzN(-segH * 0.6) + '*(1-f):0]');
        jzSetExpr(jzGX(g2).property('ADBE Vector Scale'), F + '[f*100,cur?(1+1.2*(1-f))*100:100]');
        jzSetExpr(jzGX(g2).property('ADBE Vector Group Opacity'), F + 'f>0?100:0');
    }
    jzSetExpr(jzXf(S, 'ADBE Opacity'), TH + 'o*100');
    jzNoGhost(S);
    // running count: one small text per word, shown from its onset to the next one
    var fs = jzClamp(u * 0.028, 14 * ctx.u, 32 * ctx.u), mono = jzMonoF(ctx);
    for (i = 0; i < n; i++) {
        var T = jzText(ctx, jzPad(i + 1, 2) + ' / ' + jzPad(n, 2), { font: mono, size: fs, color: sc.sub, x: x0 + tot + u * 0.02, y: y, align: 'left' });
        if (i > 0) T.inPoint = ts[i];
        if (i < n - 1) T.outPoint = ts[i + 1];
        jzSetExpr(jzXf(T, 'ADBE Opacity'), TH + 'o*100');
        jzNoGhost(T);
    }
} });
