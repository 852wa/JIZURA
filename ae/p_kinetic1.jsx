// ================================================================ pack kinetic part 1 — kinetic typography layouts (1–7) + shared layout helpers
// Layout pattern: each moving piece is a text layer parented to a null ("rig"); the null carries the layout's choreography
// (absolute position / scale / rotation from a function U(i, t) embedded in the expression), the text layer keeps the
// cut's own enter / hold / exit / treatment. Word onsets are spread evenly over the cut (no beat grid in AE).

// ---- word units: the cut's word chunks, merged / split to a usable count (browser unitsOf)
function akn_gc(t) { return jzCount(t); }
function akn_splitUnit(s) {
    var t = jzTrim(s), i;
    if (/\s/.test(t)) {
        var mid = t.length / 2, bi = -1, bd = 1e9;
        for (i = 0; i < t.length; i++) if (t.charAt(i) === ' ' && Math.abs(i - mid) < bd) { bd = Math.abs(i - mid); bi = i; }
        return [jzTrim(t.substr(0, bi)), jzTrim(t.substr(bi + 1))];
    }
    var n = jzChars(t).length, parts = jzSplitLines(t, Math.ceil(n / 2)).split('\r');
    return parts.length >= 2 ? [parts[0], parts.slice(1).join('')] : [t];
}
function akn_units(cut, maxU, minU) {
    var text = String(cut.text || ''), lat = jzHasLatin(text), w = [], src = (cut.words && cut.words.length) ? cut.words : (lat ? text.split(/\s+/) : jzChunk(text)), i, g, s;
    for (i = 0; i < src.length; i++) { s = jzTrim(String(src[i])); if (s) w.push(s); }
    if (jzStrip(w.join('')) !== jzStrip(text)) { w = []; src = lat ? text.split(/\s+/) : jzChunk(text); for (i = 0; i < src.length; i++) { s = jzTrim(String(src[i])); if (s) w.push(s); } }
    if (!w.length) w = [jzTrim(text) || '…'];
    while (w.length > maxU) {
        var bi = 0, bv = 1e9;
        for (i = 0; i < w.length - 1; i++) { var v = akn_gc(w[i]) + akn_gc(w[i + 1]); if (v < bv) { bv = v; bi = i; } }
        w.splice(bi, 2, w[bi] + (lat ? ' ' : '') + w[bi + 1]);
    }
    for (g = 0; g < 8 && w.length < minU; g++) {
        var bj = -1, bn = 1;
        for (i = 0; i < w.length; i++) { var n = akn_gc(w[i]), ok = /\s/.test(w[i]) || (!jzHasLatin(w[i]) && n >= 2); if (ok && n > bn) { bn = n; bj = i; } }
        if (bj < 0) break;
        var parts = akn_splitUnit(w[bj]);
        if (parts.length < 2 || !parts[0] || !parts[1]) break;
        w.splice(bj, 1, parts[0], parts[1]);
    }
    return w;
}
// word clock: onset of each unit inside the cut
function akn_onsets(cut, n, frac, gap, t0) {
    var dur = cut.dur || 2, last = Math.max(0, Math.min(dur * frac, (n - 1) * gap)), v = [], i;
    for (i = 0; i < n; i++) v.push((t0 || 0) + (n > 1 ? last * i / (n - 1) : 0));
    return v;
}
function akn_mi(ctx, t) { return Math.max(0, t) / Math.max(0.005, ctx.cut.stagger || 0.04); }
// measuring with a probe layer (size 100): [w, h] per 1 px of font size
var AKN_MEAS = {};
function akn_m(ctx, text, font, o) {
    o = o || {};
    var key = [text, font, o.track || 0, o.lead || 0, o.vertical ? 1 : 0].join('\u0001');
    if (AKN_MEAS[key]) return AKN_MEAS[key];
    var str = o.vertical ? jzVertical(text) : text, P = jzText(ctx, str, { font: font, size: 100, color: '#FFFFFF', x: -9999, y: -9999, track: o.track || 0, leading: o.lead ? 100 * o.lead : null });
    var s = jzSize(P); P.remove();
    var r = { w: Math.max(0.05, s[0] / 100), h: Math.max(0.05, s[1] / 100) };
    AKN_MEAS[key] = r;
    return r;
}
function akn_em(ctx, text, font, track) { return akn_m(ctx, text, font, { track: track }).w; }
function akn_fit(ctx, text, font, maxW, maxH, o) { var m = akn_m(ctx, text, font, o); return Math.min(maxW / m.w, maxH / m.h); }
// flow units into balanced lines (browser flowUnits); positions are unit centres relative to the box centre
function akn_parts(n, L) {
    var out = [];
    function rec(start, left, acc) {
        if (out.length > 80) return;
        if (left === 1) { out.push(acc.concat([[start, n]])); return; }
        for (var e = start + 1; e <= n - left + 1; e++) rec(e, left - 1, acc.concat([[start, e]]));
    }
    if (L >= 1 && L <= n) rec(0, L, []);
    return out;
}
function akn_flow(ctx, units, font, maxW, maxH, o) {
    o = o || {};
    var lat = false, i, L, q;
    for (i = 0; i < units.length; i++) if (jzHasLatin(units[i])) lat = true;
    var sp = o.sp != null ? o.sp : (lat ? 0.32 : 0.08), lead = o.lead || 1.22, track = o.track || 0, ws = [], n = units.length, best = null;
    for (i = 0; i < n; i++) ws.push(akn_em(ctx, units[i], font, track));
    for (L = 1; L <= Math.min(n, o.maxLines || 4); L++) {
        var pts = akn_parts(n, L), bp = null, bw = 1e9;
        for (q = 0; q < pts.length; q++) {
            var lw = [], mw = 0;
            for (var li = 0; li < pts[q].length; li++) { var a = pts[q][li][0], b = pts[q][li][1], w = 0; for (i = a; i < b; i++) w += ws[i] + (i > a ? sp : 0); lw.push(w); if (w > mw) mw = w; }
            if (mw < bw) { bw = mw; bp = { pt: pts[q], lw: lw }; }
        }
        if (!bp) continue;
        var size = Math.min(maxW / bw, maxH / (L * lead - (lead - 1)), o.maxSize || 1e9);
        if (!best || size > best.size * (o.lineBonus || 1.1)) best = { size: size, L: L, pt: bp.pt, lw: bp.lw };
    }
    var S = best.size, pos = [], mx = 0;
    for (li = 0; li < best.pt.length; li++) {
        var y = (li - (best.L - 1) / 2) * lead * S, x = -best.lw[li] * S / 2;
        if (best.lw[li] > mx) mx = best.lw[li];
        for (i = best.pt[li][0]; i < best.pt[li][1]; i++) { var ww = ws[i] * S; pos[i] = { x: x + ww / 2, y: y, w: ww, li: li }; x += ww + sp * S; }
    }
    return { size: S, pos: pos, L: best.L, w: mx * S, h: (best.L * lead - (lead - 1)) * S, ws: ws };
}
// colours
function akn_accOn(sc) { return jzContrast(sc.accent, sc.bg) >= 1.7 ? sc.accent : sc.fg; }
function akn_onCol(sc, fill) {
    var c = [sc.bg, sc.fg, sc.ink, sc.accent, sc.sub], best = null, bv = 0, i;
    for (i = 0; i < c.length; i++) { if (!c[i] || c[i] === fill) continue; var k = jzContrast(c[i], fill); if (k > bv) { bv = k; best = c[i]; } }
    return bv >= 2.6 ? best : (jzLum(fill) > 0.5 ? '#111111' : '#FFFFFF');
}
// expression header for a layout: timing (DUR, IN, OS, OD, PO, K) + easings + W, H
function akn_H(ctx, data) { return jzTH(ctx) + AKN_FNS + AKN_CI_L + 'var W=' + jzN(ctx.W) + ',H=' + jzN(ctx.H) + ';' + (data || '') + '\n'; }
var AKN_CI_L = 'function cix(ts,t){var k=-1;for(var q=0;q<ts.length;q++)if(t>=ts[q])k=q;return k;}';
function akn_A2(a) { var s = [], i; for (i = 0; i < a.length; i++) s.push(akn_arr(a[i])); return '[' + s.join(',') + ']'; }
function akn_null(ctx, name, x, y) {
    var N = ctx.comp.layers.addNull(ctx.comp.duration); N.name = name;
    jzXf(N, 'ADBE Anchor Point').setValue([0, 0]); jzXf(N, 'ADBE Position').setValue([x, y]);
    return jzNoGhost(N);
}
// a lyric piece on a rig. o: jzText options + mi, noHold, H (header with U), pos / sc / rot / a expressions (pos -> [x, y] absolute,
// sc -> [sx, sy] factors, rot -> degrees, a -> 0..1 alpha)
function akn_word(ctx, str, o) {
    var N = akn_null(ctx, 'kn rig ' + String(str).substr(0, 12), o.x, o.y), L = jzText(ctx, str, o), bb = jzBB(L);
    L.parent = N;
    if (o.a) jzAnimator(L, 'JZ Layout Alpha', [['ADBE Text Opacity', 0]], o.H + 'var al=(' + o.a + ');(1-cl(al))*100');
    jzAnimate(ctx, L, { mi: o.mi || 0, noHold: o.noHold });
    if (o.pos) jzSetExpr(jzXf(N, 'ADBE Position'), o.H + 'var u=' + o.pos + ';[u[0],u[1]]');
    if (o.sc) jzSetExpr(jzXf(N, 'ADBE Scale'), o.H + 'var u=' + o.sc + ';[u[0]*100,u[1]*100]');
    if (o.rotE) jzSetExpr(jzXf(N, 'ADBE Rotate Z'), o.H + o.rotE);
    return { N: N, L: L, bb: bb };
}
// straight line / bar as a shape layer: rect w x h, anchor on its left edge (scale x reveals it)
function akn_bar(ctx, name, x, y, w, h, col, opacity) {
    var S = jzShapeLayer(ctx, name, x, y), g = jzGrp(S, name);
    jzAddRect(g, w, h, 0, w / 2, 0); jzAddFill(g, col);
    if (opacity != null) jzXf(S, 'ADBE Opacity').setValue(opacity * 100);
    return jzNoGhost(S);
}
function akn_bbL(list) { var b = null, i; for (i = 0; i < list.length; i++) b = jzUnion(b, list[i].bb || jzBB(list[i])); return b; }

/* ================================================================== 1 knSlamStack — 積み上げ */
jzReg('layout', 'knSlamStack', {
    plan: function (rng, cut, st) {
        return { font: rng.pick(jzFontsOf(st, ['display'])), align: rng.pick(['center', 'center', 'left', 'right']), from: rng.pick(['scale', 'scale', 'drop', 'side']),
            acc: rng.int(0, 5), tilt: rng.chance(0.35) ? rng.range(2, 4) * rng.pick([1, -1]) : 0, rule: rng.chance(0.55) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, u = jzU(ctx), port = jzPortrait(ctx), i, k;
        var font = jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'display')), al = jzP(ctx, 'align', 'center'), from = jzP(ctx, 'from', 'scale'), tilt = jzP(ctx, 'tilt', 0), acc = jzP(ctx, 'acc', 0);
        var units = akn_units(c, port ? 6 : 5, 2), n = units.length, ts = akn_onsets(c, n, 0.42, 0.32), ms = [];
        for (i = 0; i < n; i++) ms.push(akn_em(ctx, units[i], font, 0.02));
        var maxW = W * (tilt ? 0.8 : 0.86), Hb = H * (port ? 0.66 : 0.8), cap = Math.min(H * 0.34, W * 0.44), gap = 0.08;
        function lay(kk) {
            var w = maxW, sizes = [], q, j;
            for (q = 0; q < 5; q++) {
                sizes = []; var lo = 1e9;
                for (j = 0; j < kk; j++) { sizes.push(Math.min(w / ms[j], cap)); lo = Math.min(lo, sizes[j]); }
                var S = 0; for (j = 0; j < kk; j++) { sizes[j] = Math.min(sizes[j], lo * 2.2); S += sizes[j]; }
                S += gap * sizes[0] * (kk - 1);
                if (S <= Hb) break;
                w *= Hb / S;
            }
            var g = gap * sizes[0], tot = 0; for (j = 0; j < kk; j++) tot += sizes[j]; tot += g * (kk - 1);
            var y = -tot / 2, ys = [], sw = 0;
            for (j = 0; j < kk; j++) { ys.push(y + sizes[j] / 2); y += sizes[j] + g; sw = Math.max(sw, sizes[j] * ms[j]); }
            return { sizes: sizes, ys: ys, sw: sw };
        }
        var SA = [], YA = [], SW = [];
        for (k = 1; k <= n; k++) { var A = lay(k); SA.push(A.sizes); YA.push(A.ys); SW.push(A.sw); }
        var F = lay(n), cx = W / 2, cy = H / 2;
        var HD = akn_H(ctx, 'var TS=' + akn_arr(ts) + ',SA=' + akn_A2(SA) + ',YA=' + akn_A2(YA) + ',SW=' + akn_arr(SW) + ',AL=' + (al === 'left' ? -1 : al === 'right' ? 1 : 0) +
            ',FR=' + (from === 'scale' ? 0 : from === 'drop' ? 1 : 2) + ',TL=' + jzN(tilt) + ',GP=' + gap + ';' +
            'function U(I,t){var k=cix(TS,t)+1;if(k<I+1)k=I+1;var A=SA[k-1],B=k>1?SA[k-2]:A,e=oe((t-TS[k-1])/0.34),fr=I===k-1;' +
            'var size=fr?A[I]:lrp(B[I],A[I],e),y=fr?YA[k-1][I]:lrp(YA[k-2][I],YA[k-1][I],e),sw=lrp(k>1?SW[k-2]:SW[k-1],SW[k-1],e),x=AL*sw/2,rot=0,al=1,q=(t-TS[I])/0.24;' +
            'if(q<1){var f=1-oe(cl(q));if(FR===0){size*=1+1.6*f;al=cl(q*5);rot=f*8*(I%2?1:-1);}else if(FR===1){y-=H*0.7*Math.pow(1-cl(q),2);}else{x+=(I%2?1:-1)*W*0.9*f;}}' +
            'var ld=t-TS[k-1]-0.12;if(!fr&&k>1&&ld>0&&ld<0.6)y+=A[k-1]*0.07*sprg(ld,9,26);var px=x,py=y;if(TL){var v=rvx(x,y,TL);px=v[0];py=v[1];rot+=TL;}' +
            'return [' + jzN(cx) + '+px,' + jzN(cy) + '+py,size,rot,al,sw,y];}');
        var Ls = [], accC = akn_accOn(sc);
        for (i = 0; i < n; i++) {
            var fs = F.sizes[i], x = cx + (al === 'left' ? -F.sw / 2 : al === 'right' ? F.sw / 2 : 0), y = cy + F.ys[i];
            if (tilt) { var v = [x - cx, y - cy], r = [v[0] * Math.cos(tilt * Math.PI / 180) - v[1] * Math.sin(tilt * Math.PI / 180), v[0] * Math.sin(tilt * Math.PI / 180) + v[1] * Math.cos(tilt * Math.PI / 180)]; x = cx + r[0]; y = cy + r[1]; }
            var w = akn_word(ctx, units[i], { font: font, size: fs, color: n > 1 && i === acc % n ? accC : sc.fg, x: x, y: y, align: al === 'left' ? 'left' : al === 'right' ? 'right' : 'center', track: 0.02,
                mi: akn_mi(ctx, ts[i]), H: HD, pos: 'U(' + i + ',time)', sc: '(function(){var z=U(' + i + ',time)[2]/' + jzN(fs) + ';return [z,z];})()', rotE: 'U(' + i + ',time)[3]', a: from === 'scale' ? 'U(' + i + ',time)[4]' : null });
            Ls.push(w);
        }
        // hairline rules between the stacked lines draw in as each next line lands
        if (jzP(ctx, 'rule', false) && !tilt) {
            var lw = Math.max(1.5 * ctx.u, u * 0.003);
            for (i = 0; i < n - 1; i++) {
                var R = akn_bar(ctx, 'kn stack rule', cx - F.sw / 2, cy, 1, lw, sc.sub, 0.8);
                jzSetExpr(jzXf(R, 'ADBE Position'), HD + 'var u=U(' + i + ',time),k=cix(TS,time)+1;k=Math.max(1,k);[' + jzN(cx) + '-u[5]/2,' + jzN(cy) + '+u[6]+u[2]*0.5+SA[k-1][0]*GP*0.5]');
                jzSetExpr(jzXf(R, 'ADBE Scale'), HD + 'var u=U(' + i + ',time),re=oe((time-TS[' + (i + 1) + ']-0.05)/0.35)*K;[u[5]*re*100,100]');
                R.moveToEnd();
            }
        }
        return akn_bbL(Ls);
    }
});

/* ================================================================== 2 knQuarterTurn — 直角ターン */
jzReg('layout', 'knQuarterTurn', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['display', 'serif'])), sgn: rng.pick([1, -1]), end: 'all', acc: rng.int(0, 3), joint: rng.chance(0.6) }; },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, i, font = jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'display')), sgn = jzP(ctx, 'sgn', 1), acc = jzP(ctx, 'acc', 0);
        var units = akn_units(c, 4, 2), n = units.length, ts = akn_onsets(c, n, 0.46, 0.5), Lm = [], la = [];
        for (i = 0; i < n; i++) { Lm.push(akn_em(ctx, units[i], font, 0.03)); var cs = jzChars(jzTrim(units[i])); la.push(akn_em(ctx, cs[cs.length - 1] || '字', font, 0)); }
        function rv(x, y, a) { var cc = Math.cos(a * Math.PI / 180), s = Math.sin(a * Math.PI / 180); return [x * cc - y * s, x * s + y * cc]; }
        var ch = [], sx0 = 0, sy0 = 0, a = 0;
        for (i = 0; i < n; i++) {
            if (i > 0) {
                var pd = rv(1, 0, a), na = a + 90 * sgn * (i % 2 ? 1 : -1), nd = rv(1, 0, na), pe = ch[i - 1];
                sx0 = pe.ex - pd[0] * la[i - 1] * 0.5 + nd[0] * 0.62; sy0 = pe.ey - pd[1] * la[i - 1] * 0.5 + nd[1] * 0.62; a = na;
            }
            var d = rv(1, 0, a);
            ch.push({ a: a, cx: sx0 + d[0] * Lm[i] / 2, cy: sy0 + d[1] * Lm[i] / 2, ex: sx0 + d[0] * Lm[i], ey: sy0 + d[1] * Lm[i] });
        }
        var CR = [], CX = [], CY = [], CZ = [], x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
        for (i = 0; i < n; i++) {
            var g = ch[i]; CR.push(-g.a); CX.push(g.cx); CY.push(g.cy); CZ.push(Math.min(W * 0.76 / Lm[i], H * 0.3, W * 0.42));
            var hw = Lm[i] / 2, hh = 0.55, vv = Math.abs(g.a % 180) > 45, w2 = vv ? hh : hw, h2 = vv ? hw : hh;
            x0 = Math.min(x0, g.cx - w2); x1 = Math.max(x1, g.cx + w2); y0 = Math.min(y0, g.cy - h2); y1 = Math.max(y1, g.cy + h2);
        }
        var ov = { x: (x0 + x1) / 2, y: (y0 + y1) / 2, z: Math.min(W * 0.84 / (x1 - x0), H * 0.78 / (y1 - y0), H * 0.3) };
        var tOv = Math.min(ts[n - 1] + 0.62, Math.max(ts[n - 1] + 0.3, c.dur - (c.outDur || 0) - 0.55)), useOv = jzP(ctx, 'end', 'all') !== 'last';
        var FS = 0; for (i = 0; i < n; i++) FS = Math.max(FS, CZ[i]); FS = Math.max(FS, ov.z);
        var jx = [], jy = [];
        for (i = 1; i < n; i++) { var pg = ch[i - 1], pd2 = rv(1, 0, pg.a); jx.push(pg.ex + pd2[0] * 0.35); jy.push(pg.ey + pd2[1] * 0.35); }
        var HD = akn_H(ctx, 'var TS=' + akn_arr(ts) + ',CR=' + akn_arr(CR) + ',CX=' + akn_arr(CX) + ',CY=' + akn_arr(CY) + ',CZ=' + akn_arr(CZ) + ',GA=' + akn_arr(CR) +
            ',JX=' + akn_arr(jx.concat([0])) + ',JY=' + akn_arr(jy.concat([0])) + ',OV=[0,' + jzN(ov.x) + ',' + jzN(ov.y) + ',' + jzN(ov.z) + '],TOV=' + jzN(tOv) + ',UO=' + (useOv ? 1 : 0) + ',NU=' + n + ';' +
            'function CAM(t){var k=cix(TS,t);if(k<0)k=0;var a=Math.max(0,k-1),A=[CR[a],CX[a],CY[a],CZ[a]],B=[CR[k],CX[k],CY[k],CZ[k]],e=k>0?ioc(cl((t-TS[k])/0.36)):1,sm=a!==k?1:0;' +
            'if(UO&&t>=TOV){A=[CR[NU-1],CX[NU-1],CY[NU-1],CZ[NU-1]];B=OV;e=ioc(cl((t-TOV)/0.5));sm=1;}var dp=1-0.22*bel(e)*sm;' +
            'return [lrp(A[0],B[0],e),lrp(A[1],B[1],e),lrp(A[2],B[2],e),Math.exp(lrp(Math.log(A[3]),Math.log(B[3]),e))*dp];}' +
            'function U(I,t){var C=CAM(t),v=rvx(CX[I]-C[1],CY[I]-C[2],C[0]),q=cl((t-TS[I])/0.22),pp=I===0?1:lrp(0.3,1,ob(q,2.2));' +
            'return [W/2+v[0]*C[3],H/2+v[1]*C[3],C[3]*pp,-GA[I]+C[0],I===0?1:cl(q*4)];}');
        var Ls = [], accC = akn_accOn(sc);
        for (i = 0; i < n; i++) {
            var p0 = rv(CX[i] - ov.x, CY[i] - ov.y, 0), fx = W / 2 + p0[0] * ov.z, fy = H / 2 + p0[1] * ov.z;
            var w = akn_word(ctx, units[i], { font: font, size: FS, color: i === acc % n ? accC : sc.fg, x: fx, y: fy, track: 0.03, mi: akn_mi(ctx, ts[i]), H: HD,
                pos: 'U(' + i + ',time)', sc: '(function(){var z=U(' + i + ',time)[2]/' + jzN(FS) + ';return [z,z];})()', rotE: 'U(' + i + ',time)[3]', a: i ? 'U(' + i + ',time)[4]' : null });
            var zb = w.bb, zk = ov.z / FS, vv = Math.abs(ch[i].a % 180) > 45, hw2 = (zb.x1 - zb.x0) / 2 * zk, hh2 = (zb.y1 - zb.y0) / 2 * zk;
            if (vv) { var tq = hw2; hw2 = hh2; hh2 = tq; }
            Ls.push({ bb: { x0: fx - hw2, x1: fx + hw2, y0: fy - hh2, y1: fy + hh2, cx: fx, cy: fy } });
            // joint mark: a small accent square where the line turns
            if (jzP(ctx, 'joint', false) && i > 0) {
                var S = jzShapeLayer(ctx, 'kn joint', W / 2, H / 2), gq = jzGrp(S, 'joint'); jzAddRect(gq, 1, 1); jzAddFill(gq, sc.accent);
                var J = 'var C=CAM(time),v=rvx(JX[' + (i - 1) + ']-C[1],JY[' + (i - 1) + ']-C[2],C[0]),q=cl((time-TS[' + i + '])/0.22),s=C[3]*0.16*ob(cl(q*1.3),2)*K;';
                jzSetExpr(jzXf(S, 'ADBE Position'), HD + J + '[W/2+v[0]*C[3],H/2+v[1]*C[3]]');
                jzSetExpr(jzXf(S, 'ADBE Scale'), HD + J + 's=time<TS[' + i + ']?0:s;[s*100,s*100]');
                jzSetExpr(jzXf(S, 'ADBE Rotate Z'), HD + J + 'C[0]+45');
                jzNoGhost(S);
            }
        }
        // the lyric layers were made at the overview framing (static values = final look)
        return akn_bbL(Ls);
    }
});

/* ================================================================== 3 knSwapCenter — 入れ替わり */
jzReg('layout', 'knSwapCenter', {
    plan: function (rng, cut, st) {
        return { font: rng.pick(jzFontsOf(st, ['display'])), fontL: rng.pick(jzFontsOf(st, ['display', 'serif'])), mode: rng.pick(['roll', 'punch', 'slide', 'roll']), ticks: rng.chance(0.7), acc: rng.chance(0.5) };
    },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, u = jzU(ctx), port = jzPortrait(ctx), i;
        var font = jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'display')), fontL = jzP(ctx, 'fontL', font), mode = jzP(ctx, 'mode', 'roll'), acc = jzP(ctx, 'acc', false);
        var units = akn_units(c, 6, 2), n = units.length, ts = akn_onsets(c, n, 0.4, 0.36), big = [];
        for (i = 0; i < n; i++) big.push(Math.min(akn_fit(ctx, units[i], font, W * 0.8, H * 0.4, { track: 0.02 }), H * 0.34, W * 0.6));
        var F = akn_flow(ctx, units, fontL, W * 0.84, H * (port ? 0.46 : 0.34), { maxSize: H * (port ? 0.13 : 0.2), track: 0.03 });
        var tR = ts[n - 1] + 0.5, lim = c.dur - (c.outDur || 0) - 0.4;
        if (tR > lim) tR = Math.max(ts[n - 1] + 0.18, lim);
        var cx = W / 2, cy = H / 2, accC = akn_accOn(sc), PX = [], PY = [];
        for (i = 0; i < n; i++) { PX.push(F.pos[i].x); PY.push(F.pos[i].y); }
        var HD = akn_H(ctx, 'var TS=' + akn_arr(ts) + ',BG=' + akn_arr(big) + ',PX=' + akn_arr(PX) + ',PY=' + akn_arr(PY) + ',FSZ=' + jzN(F.size) + ',TR=' + jzN(tR) + ',MD=' + (mode === 'punch' ? 1 : mode === 'slide' ? 2 : 0) + ',NU=' + n + ',CX=' + jzN(cx) + ',CY=' + jzN(cy) + ';' +
            // phase 1: [x, y, size, sy, alpha] of the big word I
            'function B1(I,t){var k=cix(TS,t);if(k<0||t>=TR)return [CX,CY,BG[I],1,0];var e=k>0?oe(cl((t-TS[k])/0.26)):1,old;if(I===k)old=0;else if(I===k-1&&e<1)old=1;else return [CX,CY,BG[I],1,0];' +
            'var q=e,s0=BG[I],x=CX,y=CY,size=s0,sy=1,al=1;if(MD===0){y+=s0*1.05*(old?-q:(1-q));sy=old?1-q:q;}else if(MD===1){size=s0*(old?lrp(1,0.45,q):lrp(1.9,1,q));al=old?1-q:cl(q*3);}' +
            'else{x+=(old?-q:1-ob(q,1.3))*W*0.7;al=old?1-q*q:1;}if(sy<0.02)al=0;return [x,y,size,Math.max(0.001,sy),al];}' +
            // phase 2: the line resolves
            'function B2(I,t){var last=I===NU-1,q=oe(cl((t-TR-(last?0:0.05+I*0.035))/0.42));return [lrp(CX,CX+PX[I],q),lrp(CY,CY+PY[I],q),last?lrp(BG[I],FSZ,q):FSZ*lrp(0.3,1,q),1,last?1:cl(q*2.5)];}');
        var Ls = [];
        for (i = 0; i < n; i++) {
            var col = acc && i % 2 ? accC : sc.fg, last = i === n - 1;
            var wb = akn_word(ctx, units[i], { font: font, size: big[i], color: col, x: cx, y: cy, track: 0.02, mi: akn_mi(ctx, ts[i]), H: HD,
                pos: (last ? '(time<TR?B1(' + i + ',time):B2(' + i + ',time))' : 'B1(' + i + ',time)'),
                sc: '(function(){var b=' + (last ? '(time<TR?B1(' + i + ',time):B2(' + i + ',time))' : 'B1(' + i + ',time)') + ',z=b[2]/' + jzN(big[i]) + ';return [z,z*b[3]];})()',
                a: last ? '(time<TR?B1(' + i + ',time)[4]:1)' : 'B1(' + i + ',time)[4]' });
            wb.L.outPoint = last ? Math.min(c.dur, tR + 0.03) : Math.min(c.dur, tR);
            // the resolved line (font of the full line)
            var ws = akn_word(ctx, units[i], { font: fontL, size: F.size, color: col, x: cx + PX[i], y: cy + PY[i], track: 0.03, mi: last ? akn_mi(ctx, ts[i]) : akn_mi(ctx, tR), H: HD,
                pos: 'B2(' + i + ',time)', sc: '(function(){var z=B2(' + i + ',time)[2]/FSZ;return [z,z];})()', a: last ? null : 'B2(' + i + ',time)[4]' });
            ws.L.inPoint = Math.max(0, last ? tR + 0.03 : tR);
            Ls.push(ws);
        }
        // progress ticks under the word
        if (jzP(ctx, 'ticks', false) && n > 1) {
            var tw = u * 0.035, th = Math.max(3 * ctx.u, u * 0.006), gx = tw * 1.5, S = jzShapeLayer(ctx, 'kn swap ticks', cx, cy);
            for (i = 0; i < n; i++) {
                var g = jzGrp(S, 'tick ' + i);
                jzAddRect(g, tw, th, 0, (i - (n - 1) / 2) * gx, 0);
                var fl = jzAddFill(g, sc.sub);
                jzSetExpr(fl.property('ADBE Vector Fill Color'), HD + 'var on=' + i + '<=cix(TS,time);on?' + akn_col(accC) + ':' + akn_col(sc.sub));
                jzSetExpr(fl.property('ADBE Vector Fill Opacity'), HD + i + '<=cix(TS,time)?100:40');
            }
            jzSetExpr(jzXf(S, 'ADBE Position'), HD + 'var k=Math.max(0,cix(TS,time));[CX,Math.min(H*0.9,CY+BG[k]*0.5+' + jzN(u * 0.08) + ')]');
            jzSetExpr(jzXf(S, 'ADBE Opacity'), HD + '100*K*cl(time/0.2)');
            S.outPoint = Math.min(c.dur, tR);
            jzNoGhost(S);
        }
        return akn_bbL(Ls);
    }
});
function akn_col(hex) { var c = jzHex(hex); return '[' + jzN(c[0]) + ',' + jzN(c[1]) + ',' + jzN(c[2]) + ',1]'; }

/* ================================================================== 4 knZoomDive — 文字へ潜る */
// centre offset (em) of a word's focus glyph: first kanji, else the middle glyph
function akn_focus(text, track) {
    var cs = jzChars(text), ad = [], tot = 0, i, fi = -1, ks = [];
    for (i = 0; i < cs.length; i++) { ad.push(akn_adv(cs[i]) + (i < cs.length - 1 ? track : 0)); tot += ad[i]; if (!akn_isSp(cs[i])) { ks.push(i); if (fi < 0 && jzIsKanji(cs[i])) fi = i; } }
    if (fi < 0) fi = ks.length ? ks[Math.floor(ks.length / 2)] : 0;
    var x = 0; for (i = 0; i < fi; i++) x += ad[i];
    return (x + akn_adv(cs[fi] || ' ') / 2) - tot / 2;
}
jzReg('layout', 'knZoomDive', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['display', 'serif'])), cap: rng.chance(0.75), acc: rng.chance(0.5) }; },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, u = jzU(ctx), i, font = jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'display')), acc = jzP(ctx, 'acc', false);
        var units = akn_units(c, 5, 2), n = units.length, ts = akn_onsets(c, n, 0.5, 0.55), sz = [], fx = [];
        for (i = 0; i < n; i++) {
            sz.push(Math.min(akn_fit(ctx, units[i], font, W * 0.78, H * 0.4, { track: 0.02 }), H * 0.34, W * 0.6));
            fx.push(akn_focus(units[i], 0.02) * akn_em(ctx, units[i], font, 0.02) / Math.max(0.1, (function (t) { var cs = jzChars(t), s = 0; for (var q = 0; q < cs.length; q++) s += akn_adv(cs[q]) + 0.02; return s; })(units[i])));
        }
        var cx = W / 2, cy = H / 2, accC = akn_accOn(sc);
        var HD = akn_H(ctx, 'var TS=' + akn_arr(ts) + ',SZ0=' + akn_arr(sz) + ',FX=' + akn_arr(fx) + ',T=0.42,CX=' + jzN(cx) + ',CY=' + jzN(cy) + ';' +
            'function U(I,t){var k=cix(TS,t);if(k===I){var q=k>0?oe(cl((t-TS[k]-T*0.35)/0.45)):1;return [CX,CY,SZ0[I]*lrp(0.03,1,q),cl(q*3)];}' +
            'if(k===I+1){var e=cl((t-TS[k])/T);if(e<1){var s0=SZ0[I],f=FX[I]*s0,ie=ioc(e),px=lrp(CX+f,CX,ie),s=Math.exp(Math.pow(e,1.6)*Math.log(36));return [px-f*s,CY,s0*s,1-smo(0.55,1,e)];}}' +
            'return [CX,CY,SZ0[I],0];}');
        var bb = null;
        for (i = 0; i < n; i++) {
            var w = akn_word(ctx, units[i], { font: font, size: sz[i], color: acc && i % 2 ? accC : sc.fg, x: cx, y: cy, track: 0.02, mi: akn_mi(ctx, ts[i]), H: HD, noHold: i < n - 1,
                pos: 'U(' + i + ',time)', sc: '(function(){var z=U(' + i + ',time)[2]/' + jzN(sz[i]) + ';return [z,z];})()', a: 'U(' + i + ',time)[3]' });
            if (i < n - 1) w.L.outPoint = Math.min(c.dur, ts[i + 1] + 0.43);
            if (i === n - 1) bb = w.bb;
        }
        // the whole line as a caption once the last word has settled
        if (jzP(ctx, 'cap', false) && n > 1 && bb) {
            var t = jzFlat(c.text), bf = jzBodyF(ctx), fs = Math.min(jzClamp(u * 0.034, 14 * ctx.u, 40 * ctx.u), akn_fit(ctx, t, bf, W * 0.8, H * 0.1, { track: 0.18 }));
            var y = Math.min(H * 0.92, bb.y1 + fs * 1.6), T = jzText(ctx, t, { font: bf, size: fs, track: 0.18, x: cx, y: y, color: sc.sub });
            var a = HD + 'var a=oc((time-' + jzN(ts[n - 1] + 0.55) + ')/0.35)*K;';
            jzSetExpr(jzXf(T, 'ADBE Opacity'), a + 'a*100');
            var tw = jzSize(T)[0], R = akn_bar(ctx, 'kn caption rule', cx - tw / 2, y - fs * 1.1, tw, Math.max(1, u * 0.002), sc.sub, 0.6);
            jzSetExpr(jzXf(R, 'ADBE Position'), a + '[' + jzN(cx) + '-' + jzN(tw / 2) + '*a,value[1]]');
            jzSetExpr(jzXf(R, 'ADBE Scale'), a + '[a*100,100]');
            jzNoGhost(T);
        }
        return bb || { x0: W * 0.3, y0: H * 0.4, x1: W * 0.7, y1: H * 0.6, cx: W / 2, cy: H / 2 };
    }
});

/* ================================================================== 5 knFlowSnap — 流れて整列 */
jzReg('layout', 'knFlowSnap', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['display', 'body'])), amp: rng.range(0.1, 0.16), lam: rng.range(0.45, 0.7), grid: rng.pick(['cells', 'cells', 'rules']), acc: rng.int(0, 15) }; },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, u = jzU(ctx), port = jzPortrait(ctx), i, j, font = jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'display'));
        var lat = jzHasLatin(c.text), t0 = jzFlat(c.text), chars = jzChars(t0), n = chars.length, ft, trk, rows = [];
        if (lat) { ft = jzSplitLines(t0, port ? 10 : 18); trk = 0.02; }
        else {
            var c0 = Math.max(2, Math.min(port ? 4 : 6, Math.ceil(Math.sqrt(n * (port ? 0.7 : 1.6))))), cols = Math.ceil(n / Math.ceil(n / c0));
            for (i = 0; i < n; i += cols) rows.push(chars.slice(i, i + cols).join(''));
            ft = rows.join('\r'); trk = 0.3;
        }
        var lead = lat ? 1.25 : 1.3, m = akn_m(ctx, ft, font, { track: trk, lead: lead }), fsz = Math.min(W * 0.8 / m.w, H * (port ? 0.5 : 0.62) / m.h, H * 0.2);
        var L = jzText(ctx, ft, { font: font, size: fsz, color: sc.fg, x: W / 2, y: H / 2, track: trk, leading: fsz * lead, align: lat ? 'center' : 'left' });
        var r = jzRect(L);
        if (!lat) jzXf(L, 'ADBE Position').setValue([W / 2 - r.width / 2, H / 2]);
        var acc = jzP(ctx, 'acc', 0), accC = akn_accOn(sc);
        if (!lat) { var fl = []; for (i = 0; i < n; i++) fl.push(i === acc % n); jzCharColors(L, accC, fl, 'JZ Layout Accent'); }
        // final glyph centres (comp px) and the train
        var G = akn_geo(L, fsz), ap = jzXf(L, 'ADBE Anchor Point').value, lp = jzXf(L, 'ADBE Position').value, FX = [], FY = [], advs = [], totA = 0;
        for (i = 0; i < G.n; i++) {
            FX.push(lp[0] + G.g[i].x - ap[0]); FY.push(lp[1] + G.g[i].y - ap[1]);
            advs.push(akn_adv(G.g[i].ch) * 1.08 + (i > 0 && G.g[i].li !== G.g[i - 1].li ? 0.35 : 0)); totA += advs[i];
        }
        var tS = jzClamp(c.dur * 0.42, 0.45, 1.5), fs = Math.min(H * 0.15, W * 0.95 / Math.max(4, totA)), offs = [], acA = 0;
        for (i = 0; i < G.n; i++) { offs.push((acA + advs[i] / 2) * fs); acA += advs[i]; }
        var Xs = W / 2 - totA * fs / 2, X0 = W + fs * 0.8, A = Math.min(H * jzP(ctx, 'amp', 0.13), W * 0.16), lam = W * jzP(ctx, 'lam', 0.55) * (port ? 1.7 : 1);
        var HG = akn_H(ctx, 'var FX=' + akn_arr(FX) + ',FY=' + akn_arr(FY) + ',OF=' + akn_arr(offs) + ',TSN=' + jzN(tS) + ',XS=' + jzN(Xs) + ',XZ=' + jzN(X0) + ',AM=' + jzN(A) + ',LM=' + jzN(lam) + ',RS=' + jzN(fs / fsz) + ';' +
            'function cy0(x,t){return H/2+AM*Math.sin(x/LM*6.28319+t*3.2);}' +
            'var i=textIndex-1,tf=Math.min(time,TSN),x=lrp(XZ,XS,oc(tf/TSN))+(OF[i]||0),y=cy0(x,tf),rr=Math.atan((cy0(x+2,tf)-cy0(x-2,tf))/4)*57.2958,q=oe(cl((time-TSN-i*0.018)/0.3));\n');
        var KK = Math.max(W, H) * 2;
        jzAnimator(L, 'JZ Layout Flow Move', [['ADBE Text Position 3D', [KK, KK, 0]]], HG + '[(x-(FX[i]||0))*(1-q)/' + jzN(KK) + '*100,(y-(FY[i]||0))*(1-q)/' + jzN(KK) + '*100,0]');
        jzAnimator(L, 'JZ Layout Flow Turn', [['ADBE Text Rotation', 90]], HG + 'rr*(1-q)/90*100');
        jzAnimator(L, 'JZ Layout Flow Size', [['ADBE Text Scale 3D', [200, 200, 100]]], HG + 'var z=lrp(RS,1,q);(z-1)*100');
        jzAnimate(ctx, L, { mi: 0 });
        // grid lines draw in with the snap
        var lw = Math.max(1 * ctx.u, u * 0.0016), S = jzShapeLayer(ctx, 'kn flow grid', 0, 0), g = jzGrp(S, 'grid'), nL = G.nL, rh = fsz * lead, bx0 = lp[0] - ap[0] + r.left, by0 = lp[1] - ap[1] + r.top;
        var gy0 = (by0 + r.height / 2) - nL * rh / 2;
        if (!lat && jzP(ctx, 'grid', 'cells') === 'cells') {
            var cell = fsz * (1 + trk), ncol = 0; for (i = 0; i < rows.length; i++) ncol = Math.max(ncol, jzChars(rows[i]).length);
            var gx0 = bx0 - fsz * trk / 2 - (cell - fsz * (1 + trk)) / 2;
            for (i = 0; i <= nL; i++) jzAddPath(g, [[gx0, gy0 + i * rh], [gx0 + ncol * cell, gy0 + i * rh]], false);
            for (j = 0; j <= ncol; j++) jzAddPath(g, [[gx0 + j * cell, gy0], [gx0 + j * cell, gy0 + nL * rh]], false);
            jzAddStroke(g, sc.sub, lw, 55);
        } else {
            for (i = 0; i < nL; i++) {
                var lx0 = 1e9, lx1 = -1e9;
                for (j = 0; j < G.n; j++) if (G.g[j].li === i) { lx0 = Math.min(lx0, FX[j] - G.g[j].w / 2); lx1 = Math.max(lx1, FX[j] + G.g[j].w / 2); }
                if (lx1 > lx0) jzAddPath(g, [[lx0, gy0 + (i + 0.5) * rh + fsz * 0.62], [lx1, gy0 + (i + 0.5) * rh + fsz * 0.62]], false);
            }
            jzAddStroke(g, sc.sub, lw * 1.5, 70);
        }
        jzAddTrimPaths(g, HG.split('var i=textIndex')[0] + 'oe(cl((time-TSN-0.08)/0.5))*K*100');
        jzSetExpr(jzXf(S, 'ADBE Opacity'), jzTH(ctx) + 'time<' + jzN(tS + 0.08) + '?0:100');
        S.moveToEnd(); jzNoGhost(S);
        // the path the line flowed along (phase travel = sideways shift of one static wave)
        var pts = [], x;
        for (x = -W * 0.1 - lam; x <= W * 1.1 + lam * 0.2; x += W / 48) pts.push([x, H / 2 + A * Math.sin(x / lam * Math.PI * 2)]);
        var Pth = jzPathLayer(ctx, 'kn flow path', pts, sc.sub, { width: Math.max(1 * ctx.u, u * 0.0015) });
        jzSetExpr(jzXf(Pth, 'ADBE Position'), HG.split('var i=textIndex')[0] + '[-Math.min(time,TSN)*3.2*LM/6.28319,0]');
        jzSetExpr(jzXf(Pth, 'ADBE Opacity'), HG.split('var i=textIndex')[0] + '(1-cl((time-TSN)/0.25))*cl(time/0.15)*35');
        Pth.outPoint = Math.min(c.dur, tS + 0.3); Pth.moveToEnd(); jzNoGhost(Pth);
        return jzBB(L);
    }
});

/* ================================================================== 6 knSeesaw — シーソー */
jzReg('layout', 'knSeesaw', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['display'])), order: rng.pick(['lr', 'lr', 'out']), acc: rng.chance(0.5), fulc: rng.pick(['tri', 'tri', 'round']) }; },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, port = jzPortrait(ctx), i, font = jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'display'));
        var units = akn_units(c, 6, 2), n = units.length, F = akn_flow(ctx, units, font, W * 0.78, H * 0.2, { maxLines: 1, maxSize: H * 0.17, track: 0.03, sp: jzHasLatin(c.text) ? 0.4 : 0.22 });
        var size = F.size, th = Math.max(4 * ctx.u, size * 0.1), half = F.w / 2 + size * 0.6, px = W / 2, py = H * (port ? 0.55 : 0.6);
        var ord = []; for (i = 0; i < n; i++) ord.push(i);
        if (jzP(ctx, 'order', 'lr') === 'out') ord.sort(function (a, b) { return Math.abs(F.pos[a].x) - Math.abs(F.pos[b].x); });
        var ts0 = akn_onsets(c, n, 0.45, 0.4), fall = 0.24, tl = [], mass = [], M = 0, mx = 0;
        for (i = 0; i < n; i++) { mass.push(akn_gc(units[i])); M += mass[i]; mx = Math.max(mx, mass[i]); }
        for (i = 0; i < n; i++) tl[ord[i]] = ts0[i] + fall;
        var targ = [0], tq = 0;
        for (i = 0; i < n; i++) { tq += mass[ord[i]] * F.pos[ord[i]].x; targ.push(i === n - 1 ? 0 : jzClamp(tq / (M * half) * 30, -11, 11)); }
        var PXs = []; for (i = 0; i < n; i++) PXs.push(F.pos[i].x);
        var HD = akn_H(ctx, 'var T0=' + akn_arr(ts0) + ',TG=' + akn_arr(targ) + ',TL=' + akn_arr(tl) + ',PXA=' + akn_arr(PXs) + ',FL=0.24,SZ0=' + jzN(size) + ',TH=' + jzN(th) + ',PX=' + jzN(px) + ',PY=' + jzN(py) + ';' +
            'function ANG(t){var a=0;for(var r=0;r<T0.length;r++){var t0=T0[r]+FL;if(t<t0)break;a=TG[r+1]+(TG[r]-TG[r+1])*Math.exp(-3.6*(t-t0))*Math.cos(10*(t-t0));}return a;}' +
            'function U(I,t){var ang=ANG(t),cr=Math.cos(ang*0.0174533),sr=Math.sin(ang*0.0174533),v=-TH/2-SZ0*0.54,x=PX+PXA[I]*cr-v*sr,y=PY+PXA[I]*sr+v*cr,rot=ang,sx=1,sy=1,d=t-TL[I];' +
            'if(d<0){var k=Math.min(1,-d/FL);y-=H*0.55*k*k;rot=ang*(1-k);}else{var q=Math.exp(-d*11)*0.22;sy=1-q;sx=1+q*0.6;x+=sr*SZ0*q*0.5;y+=cr*SZ0*q*0.5;}return [x,y,sx,sy,rot];}');
        var accC = akn_accOn(sc), fh = size * 0.62;
        // fulcrum + plank
        var Fu;
        if (jzP(ctx, 'fulc', 'tri') === 'tri') { Fu = jzShapeLayer(ctx, 'kn fulcrum', px, py + th / 2); var gf = jzGrp(Fu, 'tri'); jzAddPath(gf, [[0, 0], [-fh * 0.62, fh], [fh * 0.62, fh]], true); jzAddFill(gf, accC); }
        else { Fu = jzShapeLayer(ctx, 'kn fulcrum', px, py + th / 2 + fh * 0.45); var ge = jzGrp(Fu, 'round'); jzAddEllipse(ge, fh * 0.9, fh * 0.9); jzAddFill(ge, accC); }
        jzSetExpr(jzXf(Fu, 'ADBE Scale'), HD + 'var e=oe(time/0.35);[e*100,e*100]');
        jzSetExpr(jzXf(Fu, 'ADBE Opacity'), HD + 'K*100');
        var Pk = jzRectLayer(ctx, 'kn plank', px, py, half * 2, th, sc.sub);
        jzSetExpr(jzXf(Pk, 'ADBE Rotate Z'), HD + 'ANG(time)');
        jzSetExpr(jzXf(Pk, 'ADBE Scale'), HD + '[oe(time/0.35)*100,100]');
        jzSetExpr(jzXf(Pk, 'ADBE Opacity'), HD + '90*K');
        jzNoGhost(Fu); jzNoGhost(Pk);
        var Ls = [], accOn = jzP(ctx, 'acc', false);
        for (i = 0; i < n; i++) {
            var w = akn_word(ctx, units[i], { font: font, size: size, color: accOn && mass[i] === mx ? accC : sc.fg, x: px + F.pos[i].x, y: py - th / 2 - size * 0.54, track: 0.03, mi: akn_mi(ctx, tl[i] - fall), H: HD,
                pos: 'U(' + i + ',time)', sc: '(function(){var v=U(' + i + ',time);return [v[2],v[3]];})()', rotE: 'U(' + i + ',time)[4]' });
            Ls.push(w);
        }
        return akn_bbL(Ls);
    }
});

/* ================================================================== 7 knTypeSlam — タイプ→スラム */
jzReg('layout', 'knTypeSlam', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['display'])), key: rng.pick(['long', 'long', 'last']), side: rng.pick(['below', 'below', 'above']), burst: rng.chance(0.7) }; },
    build: function (ctx) {
        var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, u = jzU(ctx), port = jzPortrait(ctx), i, font = jzP(ctx, 'font', jzFontKeyOf(ctx.st, 'display'));
        var t0 = jzFlat(c.text), units = akn_units(c, 6, 1), ki = units.length - 1;
        if (jzP(ctx, 'key', 'long') === 'long') { var bv = -1; for (i = 0; i < units.length; i++) { var v = akn_gc(units[i]) + (/[一-鿿]/.test(units[i]) ? 0.5 : 0); if (v > bv) { bv = v; ki = i; } } }
        var key = jzTrim(units[ki]), tf = jzMonoF(ctx);
        var ts = Math.min(akn_fit(ctx, t0, tf, W * 0.86, H * 0.08, { track: 0.06 }), u * 0.065);
        var ks = Math.min(akn_fit(ctx, key, font, W * 0.84, H * (port ? 0.3 : 0.44), { track: 0.01 }), H * 0.34, W * 0.5);
        var above = jzP(ctx, 'side', 'below') === 'above', ky = H / 2 + (above ? ts * 1.2 : -ts * 1.2), ty = above ? ky - ks * 0.62 - ts * 1.5 : ky + ks * 0.62 + ts * 1.5;
        var nG = jzChars(t0).length, tType = jzClamp(nG * 0.045, 0.25, Math.min(1.1, c.dur * 0.4)), tS = tType + 0.14, accC = akn_accOn(sc);
        // typed line: glyph by glyph, shaken by the impact
        var Tn = akn_null(ctx, 'kn typed rig', W / 2, ty), T = jzText(ctx, t0, { font: tf, size: ts, color: sc.fg, x: W / 2, y: ty, track: 0.06 });
        var tw = jzSize(T)[0], x0 = W / 2 - tw / 2;
        T.parent = Tn;
        var HD = akn_H(ctx, 'var TT=' + jzN(tType) + ',TSL=' + jzN(tS) + ',NG=' + nG + ';');
        jzAnimator(T, 'JZ Layout Type', [['ADBE Text Opacity', 0]], HD + 'textIndex>Math.floor(cl(time/TT)*NG+1e-6)?100:0');
        jzAnimate(ctx, T, { mi: 0 });
        jzSetExpr(jzXf(Tn, 'ADBE Position'), HD + 'var im=time-TSL-0.1,sh=im>0?Math.exp(-im*10)*' + jzN(ts * 0.35) + ':0;posterizeTime(24);seedRandom(' + (c.seed % 9973) + '+Math.floor(time*24),true);[value[0]+random(-1,1)*sh,value[1]+random(-1,1)*sh]');
        // cursor riding at the end of the typed text
        var G = akn_geo(T, ts), RE = [0], ap = jzXf(T, 'ADBE Anchor Point').value;
        for (i = 0; i < G.n; i++) RE.push(G.g[i].x + G.g[i].w / 2 - ap[0] + tw / 2);
        var Cu = jzRectLayer(ctx, 'kn cursor', 0, ty, ts * 0.55, ts, accC);
        jzSetExpr(jzXf(Cu, 'ADBE Position'), HD + 'var RE=' + akn_arr(RE) + ',k=Math.floor(cl(time/TT)*NG+1e-6),wk=k>=NG?' + jzN(tw + ts) + ':RE[k]+(k>0?' + jzN(ts * 0.06) + ':0);[' + jzN(x0) + '+wk+' + jzN(ts * 0.1 + ts * 0.275) + ',value[1]]');
        jzSetExpr(jzXf(Cu, 'ADBE Opacity'), HD + 'var k=Math.floor(cl(time/TT)*NG+1e-6);(k<NG||Math.floor(time*12)%2===0)&&time<TSL+0.6?100*K:0');
        jzNoGhost(Cu);
        // key word slams in
        var HK = HD + 'var q=cl((time-TSL)/0.16),f=1-iq(q),ld=time-TSL-0.16,sq=ld>0?Math.exp(-ld*12)*0.12:0;';
        var kw = akn_word(ctx, key, { font: font, size: ks, color: sc.fg, x: W / 2, y: ky, track: 0.01, mi: akn_mi(ctx, tS), H: HK, sc: '[(1+2.4*f)*(1+sq*0.5),(1+2.4*f)*(1-sq)]', a: 'cl(q*4)' });
        var kb = kw.bb, mw = kb.x1 - kb.x0, mh = kb.y1 - kb.y0;
        if (jzP(ctx, 'burst', false)) {
            var lw = Math.max(2 * ctx.u, u * 0.004), R0 = Math.max(mw, mh) * 0.55 + ks * 0.9 * 0.15, Rm = R0 + u * 0.25 * 0.5 + u * 0.05 + 2, syy = mh / Math.max(mw, mh) + 0.35;
            var B = jzShapeLayer(ctx, 'kn slam burst', W / 2, ky), gb = jzGrp(B, 'rays');
            for (i = 0; i < 10; i++) { var an = (i / 10) * Math.PI * 2 + akn_r(c.seed | 0, i, 5) * 0.4; jzAddPath(gb, [[0, 0], [Math.cos(an) * Rm, Math.sin(an) * Rm * syy]], false); }
            jzAddStroke(gb, accC, lw);
            var BH = HD + 'var ld=time-TSL-0.16,a=1-ld/0.5,r0=' + jzN(R0) + '+ld*' + jzN(u * 0.25) + ',r1=r0+' + jzN(u * 0.05) + '*a;';
            jzAddTrimPaths(gb, BH + 'r1/' + jzN(Rm) + '*100', BH + 'r0/' + jzN(Rm) + '*100');
            jzSetExpr(jzXf(B, 'ADBE Opacity'), BH + '(ld>0&&ld<0.5)?a*K*100:0');
            jzNoGhost(B);
        }
        // mark the key word inside the typed line
        var idx = t0.indexOf(key);
        if (idx >= 0) {
            var gi = jzChars(t0.substr(0, idx)).length, gl = gi + jzChars(key).length - 1;
            if (G.g[gi] && G.g[gl]) {
                var a0 = G.g[gi].x - G.g[gi].w / 2 - ap[0] + tw / 2, kw2 = (G.g[gl].x + G.g[gl].w / 2) - (G.g[gi].x - G.g[gi].w / 2);
                var Mk = akn_bar(ctx, 'kn key mark', x0 + a0, ty + ts * 0.62, kw2, Math.max(2 * ctx.u, ts * 0.12), accC);
                jzSetExpr(jzXf(Mk, 'ADBE Scale'), HD + 'var ld=time-TSL-0.16;[ld>0?oe(ld/0.3)*K*100:0,100]');
            }
        }
        return jzUnion({ x0: x0, x1: x0 + tw, y0: ty - ts / 2, y1: ty + ts / 2, cx: W / 2, cy: ty }, kb);
    }
});
