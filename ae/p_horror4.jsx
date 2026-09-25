// ================================================================ pack horror part 4 (AE port of the horror set: decor / bg / cam / fx / trans)
// helpers: ahr_ (p_horror1)

/* ---------------------------------------------------------------- helpers (ahr4_) */
function ahr4_bb(ctx, bb) { return bb || { x0: ctx.W * 0.35, x1: ctx.W * 0.65, y0: ctx.H * 0.4, y1: ctx.H * 0.6, cx: ctx.W / 2, cy: ctx.H / 2 }; }
function ahr4_over(bb, x0, y0, x1, y1, pad) { pad = pad || 0; return !(x1 < bb.x0 - pad || x0 > bb.x1 + pad || y1 < bb.y0 - pad || y0 > bb.y1 + pad); }
// seconds the background had been running at the cut start (browser bgT: consecutive cuts with the same bg + seed count as one run)
function ahr4_run(b) {
    var c = b.cut, cs = (b.plan && b.plan.cuts) || [], s = c.start || 0, P0 = c.bgP || {}, idx = -1, i;
    for (i = 0; i < cs.length; i++) if (cs[i] === c) { idx = i; break; }
    for (i = idx - 1; i >= 0; i--) { var p = cs[i]; if (p.bg === c.bg && (p.bgP || {}).seed === P0.seed && Math.abs(p.end - s) < 0.06) s = p.start; else break; }
    return (c.start || 0) - s;
}
// bg expression header: T = song time (browser env.t), BT = time since the background started, FI = its 0.6 s fade-in
function ahr4_bh(b, fin) { return JZ_FNS + AHR_FNS + 'function wr(v,m){return ((v%m)+m)%m;}var T=time+' + jzN(b.cut.start || 0) + ',BT=time+' + jzN(ahr4_run(b)) + ',FI=oc(BT/' + jzN(fin || 0.6) + ');\n'; }
// failing-light level 0..1 on a 24 Hz clock (browser lamp(t, seed, rate)) -> var lv
function ahr4_lamp(seed, rate, tv) {
    return 'var lst=Math.floor(' + tv + '*24),lrun=Math.floor(lst/4),lv;seedRandom(' + (seed % 99991) + '+lrun*7,true);if(random()<' + jzN(0.1 * (rate || 1)) + '){seedRandom(' + (seed % 99991) + '+lst*13+1,true);lv=random()<0.5?0.15:0.55;}else{seedRandom(' + (seed % 99991) + '+lst*17+2,true);lv=0.88+0.12*random();}\n';
}
function ahr4_solid(comp, hex, name, W, H) { return comp.layers.addSolid(jzHex(hex), name, Math.max(4, Math.round(W)), Math.max(4, Math.round(H)), 1, comp.duration); }
function ahr4_ellMask(L, cx, cy, r, fe, inv, sy) {
    var m = L.property('ADBE Mask Parade').addProperty('ADBE Mask Atom'), sh = jzCircleShape(cx, cy, r), i;
    if (sy && sy !== 1) { var v = sh.vertices, it = sh.inTangents, ot = sh.outTangents; for (i = 0; i < 4; i++) { v[i] = [v[i][0], cy + (v[i][1] - cy) * sy]; it[i] = [it[i][0], it[i][1] * sy]; ot[i] = [ot[i][0], ot[i][1] * sy]; } sh.vertices = v; sh.inTangents = it; sh.outTangents = ot; }
    m.property('ADBE Mask Shape').setValue(sh);
    if (fe) m.property('ADBE Mask Feather').setValue([fe, fe]);
    if (inv) m.inverted = true;
    return m;
}

/* ================================================================ DECOR */

/* hrScratches — 引っ掻き傷: parallel jagged gouges scraped in around the words */
jzReg('decor', 'hrScratches', { back: false, build: function (ctx, bb0, d) {
    var bb = ahr4_bb(ctx, bb0), W = ctx.W, H = ctx.H, sc = ctx.sc, s = d.seed | 0, u = jzU(ctx), n = d.n || 2, g, k, i;
    var S = jzShapeLayer(ctx, 'hr scratches', 0, 0), TH0 = jzTH(ctx);
    for (g = 0; g < n; g++) {
        var corner = (g + (d.v | 0)) % 4, right = corner % 2 === 1, low = corner >= 2;
        var Lg = u * ahr_rr(0.28, 0.42, s, g, 1), ang = (right ? -1 : 1) * ahr_rr(55, 75, s, g, 2) * Math.PI / 180 * (low ? -1 : 1);
        var cx = right ? ahr_rr(W * 0.72, W * 0.9, s, g, 3) : ahr_rr(W * 0.1, W * 0.28, s, g, 3), cy = low ? ahr_rr(H * 0.72, H * 0.88, s, g, 4) : ahr_rr(H * 0.12, H * 0.28, s, g, 4);
        if (ahr4_over(bb, cx - Lg / 2, cy - Lg / 2, cx + Lg / 2, cy + Lg / 2, u * 0.02)) cy = low ? Math.max(cy, bb.y1 + Lg * 0.6) : Math.min(cy, bb.y0 - Lg * 0.6);
        var dx = Math.sin(ang), dy = -Math.cos(ang), px = Math.cos(ang), py = Math.sin(ang);
        var col = (g % 2 && jzContrast(sc.accent, sc.bg) > 1.8) ? sc.accent : sc.fg, gr = jzGrp(S, 'gouge ' + g);
        for (k = 0; k < 4; k++) {
            var off = (k - 1.5) * u * 0.042, len = Lg * (0.75 + 0.3 * ahr_r(s, g, k, 5)), st = ahr_r(s, g, k, 6) * Lg * 0.1;
            var x0 = cx + px * off - dx * Lg / 2 + dx * st, y0 = cy + py * off - dy * Lg / 2 + dy * st, pts = [];
            for (i = 0; i <= 10; i++) { var f = i / 10, j = ahr_rs(s, g, k, i) * u * 0.004; pts.push([x0 + dx * len * f + px * j, y0 + dy * len * f + py * j]); }
            jzAddPath(gr, pts, false);
        }
        var stk = jzAddStroke(gr, col, Math.max(1, u * 0.008), 85); try { stk.property('ADBE Vector Stroke Line Cap').setValue(2); } catch (e) {}
        jzAddTrimPaths(gr, TH0 + '100*oe((time-' + jzN(0.08 + g * 0.18) + ')/0.16)');
    }
    jzSetExpr(jzXf(S, 'ADBE Opacity'), TH0 + '100*K');
    jzNoGhost(S);
} });

/* hrSigil — 魔法陣: a slow-turning ring of marks and a seven-pointed star in faint lines behind the words */
jzReg('decor', 'hrSigil', { back: true, build: function (ctx, bb0, d) {
    var bb = ahr4_bb(ctx, bb0), sc = ctx.sc, s = d.seed | 0, u = jzU(ctx), i;
    var cx = (bb.x0 + bb.x1) / 2, cy = (bb.y0 + bb.y1) / 2, R = Math.min(u * 0.46, Math.max(bb.x1 - bb.x0, bb.y1 - bb.y0) * 0.62 + u * 0.08);
    var col = jzLayC(sc, ahr_dark(sc.bg) ? 0.3 : 0.28), lw = Math.max(1.2 * ahr_px(ctx), u * 0.0022), dir = d.right ? -1 : 1, TH0 = ahr_TH(ctx), e = 'var e=ios(time/1.2);';
    var S = jzShapeLayer(ctx, 'hr sigil', cx, cy);
    // ring of marks between the circles (turns the other way)
    var gm = jzGrp(S, 'marks'), m = 42;
    for (i = 0; i < m; i++) {
        var an = i / m * Math.PI * 2, t = ahr_h(s, i, 3) % 4, r0 = R * 0.915, r1 = R * 0.985, c = Math.cos(an), sn = Math.sin(an), q = (r0 + r1) / 2, dd = R * 0.018;
        if (t === 0) jzAddPath(gm, [[c * r0, sn * r0], [c * r1, sn * r1]], false);
        else if (t === 1) jzAddEllipse(gm, R * 0.024, R * 0.024, c * q, sn * q);
        else if (t === 2) jzAddPath(gm, [[c * q - sn * dd, sn * q + c * dd], [c * q + sn * dd, sn * q - c * dd]], false);
    }
    jzAddStroke(gm, col, lw);
    jzAddTrimPaths(gm, TH0 + e + '100*e');
    jzGX(gm).property('ADBE Vector Rotation').expression = '-time*' + jzN(4 * 0.6 * dir);
    // heptagram {7/3}
    var pts = [];
    for (i = 0; i < 7; i++) { var a2 = -Math.PI / 2 + (i * 3 % 7) / 7 * Math.PI * 2; pts.push([Math.cos(a2) * R * 0.9, Math.sin(a2) * R * 0.9]); }
    pts.push(pts[0]);
    var gh = ahr_path(S, 'star', pts, { stroke: col, sw: lw });
    jzAddTrimPaths(gh, TH0 + '100*cl((time-0.3)/1.2)');
    jzGX(gh).property('ADBE Vector Rotation').expression = 'time*' + jzN(4 * dir);
    // three circles drawing themselves
    var rs = [[R, lw * 1.4, 100], [R * 0.9, lw, 100], [R * 0.62, lw, 80]];
    for (i = 0; i < 3; i++) {
        var gc = jzGrp(S, 'circle ' + i);
        jzAddEllipse(gc, rs[i][0] * 2, rs[i][0] * 2);
        jzAddStroke(gc, col, rs[i][1], rs[i][2]);
        jzAddTrimPaths(gc, TH0 + e + '100*e');
        jzGX(gc).property('ADBE Vector Rotation').setValue(i === 1 ? 180 : 0);
    }
    jzSetExpr(jzXf(S, 'ADBE Opacity'), TH0 + '100*K');
    jzNoGhost(S);
} });

/* hrWatchEye — 見ている目: an outline eye in a corner that opens, looks at the words and blinks at the wrong moments */
jzReg('decor', 'hrWatchEye', { back: false, build: function (ctx, bb0, d) {
    var bb = ahr4_bb(ctx, bb0), W = ctx.W, H = ctx.H, sc = ctx.sc, s = d.seed | 0, u = jzU(ctx), i, k;
    var ew = u * (d.big ? 0.22 : 0.16), eh = ew * 0.26;
    var x = d.right ? W - u * 0.07 - ew / 2 : u * 0.07 + ew / 2, y = d.low ? H - u * 0.08 - eh : u * 0.08 + eh;
    if (ahr4_over(bb, x - ew / 2, y - eh, x + ew / 2, y + eh, u * 0.02)) y = d.low ? Math.max(y, Math.min(H - eh * 1.2, bb.y1 + eh * 1.6)) : Math.min(y, Math.max(eh * 1.2, bb.y0 - eh * 1.6));
    var bl = [];
    for (k = 0; k < 3; k++) bl.push(0.9 + ahr_r(s, k, 5) * 3 + k * 1.3);
    var op = ahr_TH(ctx) + 'var o=oc((time-0.2)/0.6)*K,B=' + ahr_arr(bl) + ';for(var i=0;i<3;i++){var dd=Math.abs(time-B[i]);if(dd<0.08)o*=dd/0.08;}\n';
    var col = sc.fg, lw = Math.max(1.2 * ahr_px(ctx), u * 0.003), S = jzShapeLayer(ctx, 'hr eye', x, y);
    function lid(sg) { var p = []; for (var j = 0; j <= 16; j++) { var f = j / 16; p.push([-ew / 2 + ew * f, sg * Math.sin(Math.PI * f) * eh]); } return p; }
    var top = lid(-1);
    var gl = jzGrp(S, 'lashes');
    for (k = 0; k < 5; k++) { var f2 = 0.2 + k * 0.15, p = top[Math.round(f2 * 16)]; jzAddPath(gl, [p, [p[0] + (f2 - 0.5) * ew * 0.12, p[1] - eh * 0.35]], false); }
    jzAddStroke(gl, col, lw * 0.8, 80);
    jzGX(gl).property('ADBE Vector Scale').expression = op + '[100,100*o]';
    var gt = ahr_path(S, 'top lid', top, { stroke: col, sw: lw * 1.3 });
    jzGX(gt).property('ADBE Vector Scale').expression = op + '[100,100*o]';
    var gb = ahr_path(S, 'bottom lid', lid(1), { stroke: col, sw: lw });
    jzGX(gb).property('ADBE Vector Scale').expression = op + '[100,100*o]';
    // iris + pupil looking at the words (squeezed with the lids instead of clipped)
    var tx = (bb.x0 + bb.x1) / 2, ty = (bb.y0 + bb.y1) / 2, an = Math.atan2(ty - y, tx - x), look = Math.min(1, Math.sqrt((tx - x) * (tx - x) + (ty - y) * (ty - y)) / u);
    var gp = jzGrp(S, 'pupil'); jzAddEllipse(gp, eh * 0.68, eh * 0.68); jzAddFill(gp, ahr_dark(sc.bg) ? sc.accent : sc.fg);
    jzGX(gp).property('ADBE Vector Position').expression = op + '[' + jzN(Math.cos(an) * ew * 0.18 * look) + '+nz(time*0.8,' + (s % 97) + ')*' + jzN(ew * 0.03) + ',' + jzN(Math.sin(an) * eh * 0.3 * look) + ']';
    jzGX(gp).property('ADBE Vector Scale').expression = op + '[100,100*Math.min(1,o*1.2)]';
    var gi = jzGrp(S, 'iris'); jzAddEllipse(gi, eh * 1.56, eh * 1.56); jzAddStroke(gi, col, lw);
    jzGX(gi).property('ADBE Vector Position').expression = op + '[' + jzN(Math.cos(an) * ew * 0.18 * look) + ',' + jzN(Math.sin(an) * eh * 0.3 * look) + ']';
    jzGX(gi).property('ADBE Vector Scale').expression = op + '[100,100*o]';
    jzSetExpr(jzXf(S, 'ADBE Opacity'), jzTH(ctx) + '100*K*oc(time/0.2)');
    jzNoGhost(S);
} });

/* hrStaticPatch — 砂嵐の欠片: small rectangles of TV snow flicker at the edges of the frame */
jzReg('decor', 'hrStaticPatch', { back: false, build: function (ctx, bb0, d) {
    var bb = ahr4_bb(ctx, bb0), W = ctx.W, H = ctx.H, s = d.seed | 0, u = jzU(ctx), n = 3 + (d.n || 2) * 2, k, TH0 = jzTH(ctx);
    for (k = 0; k < n; k++) {
        var w = u * ahr_rr(0.06, 0.2, s, k, 2), h = u * ahr_rr(0.02, 0.07, s, k, 3), edge = ahr_h(s, k, 4) % 4;
        var x = ahr_r(s, k, 5) * (W - w), y = ahr_r(s, k, 6) * (H - h);
        if (edge === 0) y = ahr_rr(0.02, 0.18, s, k, 7) * H; else if (edge === 1) y = H - h - ahr_rr(0.02, 0.18, s, k, 7) * H;
        else if (edge === 2) x = ahr_rr(0.01, 0.1, s, k, 7) * W; else x = W - w - ahr_rr(0.01, 0.1, s, k, 7) * W;
        if (ahr4_over(bb, x, y, x + w, y + h, u * 0.02)) continue;
        var N = ahr_solid(ctx, '#808080', 'hr snow patch ' + (k + 1), w, h);
        jzXf(N, 'ADBE Position').setValue([x + w / 2, y + h / 2]);
        var ne = jzEffect(N, 'ADBE Noise', 'hr Snow'); jzEP(ne, 1, 100); jzEP(ne, 2, 0);
        var sd = (s + k * 131) % 99991;
        jzSetExpr(jzXf(N, 'ADBE Position'), 'posterizeTime(12);seedRandom(' + sd + '+Math.floor(time*12),true);[value[0]+random(-1,1)*' + jzN(u * 0.02) + ',value[1]]');
        jzSetExpr(jzXf(N, 'ADBE Opacity'), TH0 + 'posterizeTime(24);seedRandom(' + sd + '+Math.floor(time*24)*3,true);var on=random()>=0.35;(on?random(45,85):0)*oc(time/0.2)*K');
        jzNoGhost(N);
    }
} });

/* hrDustBeam — 光の筋と埃: a slanted beam from a high window with dust hanging in it */
jzReg('decor', 'hrDustBeam', { back: true, build: function (ctx, bb0, d) {
    var W = ctx.W, H = ctx.H, sc = ctx.sc, s = d.seed | 0, u = jzU(ctx), i, dark = ahr_dark(sc.bg);
    var Lc = ahr_light(sc), right = !!d.right, x0 = right ? W * 0.78 : W * 0.22, w0 = W * 0.12, w1 = W * 0.34, sl = (right ? -1 : 1) * W * 0.28;
    var poly = [[x0 - w0 / 2, -2], [x0 + w0 / 2, -2], [x0 + sl + w1 / 2, H + 2], [x0 + sl - w1 / 2, H + 2]];
    var io = jzTH(ctx) + 'var a=oc(time/0.8)*K;';
    if (!dark) {
        // on light paper the room around the beam is dimmed instead
        var Dm = ahr_solid(ctx, ahr_night(sc), 'hr beam room', W, H), mk = Dm.property('ADBE Mask Parade').addProperty('ADBE Mask Atom'), sh = new Shape();
        sh.vertices = poly; sh.closed = true; mk.property('ADBE Mask Shape').setValue(sh); mk.inverted = true;
        jzSetExpr(jzXf(Dm, 'ADBE Opacity'), io + '12*a');
        jzNoGhost(Dm);
    }
    var B = jzShapeLayer(ctx, 'hr beam', 0, 0), gb = jzGrp(B, 'beam');
    jzAddPath(gb, poly, true); jzAddFill(gb, Lc);
    var lw = jzEffect(B, 'ADBE Linear Wipe', 'hr Beam Fade'); jzEP(lw, 1, 45); jzEP(lw, 2, 0); jzEP(lw, 3, H * 0.9);
    jzSetExpr(jzXf(B, 'ADBE Opacity'), io + jzN((dark ? 0.1 : 0.22) * 100 * 1.6) + '*a');
    jzNoGhost(B);
    // dust inside the beam
    var Du = jzShapeLayer(ctx, 'hr beam dust', 0, 0), gd = jzGrp(Du, 'dust');
    for (i = 0; i < 40; i++) {
        var fy = ahr_r(s, i, 1) * 0.9, y = fy * H, f = ahr_r(s, i, 3), cx = x0 + sl * fy, ww = w0 + (w1 - w0) * fy, r = u * ahr_rr(0.0012, 0.0035, s, i, 4) * 2;
        jzAddEllipse(gd, r, r, cx + (f - 0.5) * ww * 0.9, y);
    }
    jzAddFill(gd, dark ? Lc : sc.sub);
    jzSetExpr(jzXf(Du, 'ADBE Position'), '[Math.sin(time*0.7)*' + jzN(u * 0.01) + ',time*' + jzN(H * 0.01) + ']');
    jzSetExpr(jzXf(Du, 'ADBE Opacity'), io + '55*a*(0.7+0.3*Math.sin(time*1.5))');
    jzNoGhost(Du);
} });

/* hrDrips — 垂れる墨: dark ink running down from the top edge of the frame, slowly */
jzReg('decor', 'hrDrips', { back: false, build: function (ctx, bb0, d) {
    var bb = ahr4_bb(ctx, bb0), W = ctx.W, H = ctx.H, sc = ctx.sc, s = d.seed | 0, u = jzU(ctx), i, k;
    var col = ahr_dark(sc.bg) ? jzMixHex(sc.accent, sc.bg, 0.35) : ahr_night(sc), band = u * 0.03, TH0 = jzTH(ctx);
    var S = jzShapeLayer(ctx, 'hr drips', 0, 0);
    var n = Math.min(13, 7 + (d.n | 0) * 3), lim = Math.max(band * 2, bb.y0 - u * 0.05);
    for (k = 0; k < n; k++) {
        var x = W * (0.03 + 0.94 * ahr_r(s, k, 2)), Ld = u * ahr_rr(0.06, 0.3, s, k, 5);
        if (x > bb.x0 - u * 0.03 && x < bb.x1 + u * 0.03) Ld = Math.min(Ld, lim - band);
        if (Ld <= 1) continue;
        var w = u * ahr_rr(0.004, 0.012, s, k, 6), g = jzGrp(S, 'drip ' + k);
        jzAddPath(g, [[x, band * 0.5], [x, band + Ld]], false);
        var st = jzAddStroke(g, col, w * 1.7); try { st.property('ADBE Vector Stroke Line Cap').setValue(2); } catch (e) {}
        jzAddTrimPaths(g, TH0 + '100*oc((time-' + jzN(ahr_r(s, k, 3) * 0.8) + ')/' + jzN(2.5 + ahr_r(s, k, 4) * 3) + ')');
    }
    var pts = [[-4, -4], [W + 4, -4]];
    for (i = 40; i >= 0; i--) pts.push([W * i / 40, band * (0.6 + 0.6 * ahr_r(s, i, 1))]);
    var gb = ahr_path(S, 'band', pts, { closed: true, fill: col });
    jzGX(gb).property('ADBE Vector Scale').expression = TH0 + '[100,100*oc(time/0.4)]';
    jzSetExpr(jzXf(S, 'ADBE Opacity'), TH0 + '90*K');
    jzNoGhost(S);
} });

/* hrCracks — ひび割れ: fine fractures creep out of a corner of the frame */
jzReg('decor', 'hrCracks', { back: false, build: function (ctx, bb0, d) {
    var bb = ahr4_bb(ctx, bb0), W = ctx.W, H = ctx.H, sc = ctx.sc, s = d.seed | 0, u = jzU(ctx), r;
    var ox = d.right ? W : 0, oy = d.low ? H : 0, lw = Math.max(1, u * 0.0018), base = Math.atan2(H / 2 - oy, W / 2 - ox), byD = [[], [], []];
    function branch(x, y, an, len, depth, id) {
        var pts = [[x, y]], cx = x, cy = y, i, k;
        for (i = 1; i <= 7; i++) { var a = an + ahr_rs(s, id, i, 1) * 0.5; cx += Math.cos(a) * len / 7; cy += Math.sin(a) * len / 7; if (ahr4_over(bb, cx, cy, cx, cy, u * 0.03)) break; pts.push([cx, cy]); }
        if (pts.length > 1) byD[depth].push(pts);
        if (depth < 2) for (k = 0; k < 2; k++) { var j = 2 + (ahr_h(s, id, k, 3) % (pts.length - 1 || 1)), p = pts[Math.min(j, pts.length - 1)]; branch(p[0], p[1], an + (k ? 0.6 : -0.6) * ahr_rr(0.6, 1.2, s, id, k, 4), len * 0.5, depth + 1, id * 3 + k + 1); }
    }
    for (r = 0; r < 3; r++) branch(ox, oy, base + (r - 1) * 0.35 + ahr_rs(s, r, 9) * 0.15, u * ahr_rr(0.28, 0.42, s, r, 10), 0, r + 1);
    var S = jzShapeLayer(ctx, 'hr cracks', 0, 0), TH0 = jzTH(ctx), dd, i2;
    for (dd = 2; dd >= 0; dd--) {
        if (!byD[dd].length) continue;
        var g = jzGrp(S, 'depth ' + dd);
        for (i2 = 0; i2 < byD[dd].length; i2++) jzAddPath(g, byD[dd][i2], false);
        jzAddStroke(g, sc.fg, lw * (1.4 - dd * 0.35), 75);
        jzAddTrimPaths(g, TH0 + '100*cl(oc(time/1.6)*' + jzN(1 + dd * 0.2) + '-' + jzN(dd * 0.25) + ')');
    }
    jzSetExpr(jzXf(S, 'ADBE Opacity'), TH0 + '100*K');
    jzNoGhost(S);
} });

/* ================================================================ BACKGROUNDS */

/* hrFailingLamp — 切れかけの灯: light from a stuttering tube at the top, dark corners that breathe with it */
jzReg('bg', 'hrFailingLamp', {
    plan: function (rng, st) { return { seed: rng.int(1, 1e9), x: rng.range(0.35, 0.65), rate: rng.range(0.7, 1.3) }; },
    build: function (b, P) {
        var W = b.W, H = b.H, sc = b.sc, u = jzU(b), dark = ahr_dark(sc.bg), cx = W * (P.x || 0.5), cy = -u * 0.1, hyp = Math.sqrt(W * W + H * H), seed = P.seed | 0;
        var HD = ahr4_bh(b) + ahr4_lamp(seed, P.rate || 1, 'T');
        var Lg = ahr4_solid(b.comp, ahr_light(sc), 'bg lamp light', W, H);
        ahr4_ellMask(Lg, cx, cy, hyp * 0.3, hyp * 0.9);
        jzSetExpr(jzXf(Lg, 'ADBE Opacity'), HD + jzN((dark ? 0.16 : 0.3) * 100 * 1.4) + '*lv*FI');
        var V = ahr4_solid(b.comp, ahr_night(sc), 'bg lamp dark', W, H);
        ahr4_ellMask(V, W / 2, H / 2, Math.min(W, H) * 0.3 + hyp * 0.15, hyp * 0.3, true);
        jzSetExpr(jzXf(V, 'ADBE Opacity'), HD + '(75-25*lv)*FI');
        var Tb = jzRectLayer(b, 'bg lamp tube', cx, u * 0.012 + Math.max(2, u * 0.006) / 2, u * 0.24, Math.max(2, u * 0.006), jzLayC(sc, dark ? 0.35 : 0.15));
        jzSetExpr(jzXf(Tb, 'ADBE Opacity'), HD + '(25+50*lv)*FI');
    }
});

/* hrCorridor — 暗い廊下: a corridor drawn in faint lines, frames sliding towards the camera, a flickering light at the end */
jzReg('bg', 'hrCorridor', {
    plan: function (rng, st) { return { seed: rng.int(1, 1e9), vx: rng.range(0.44, 0.56), vy: rng.range(0.44, 0.54), spd: rng.range(0.25, 0.45), doors: rng.chance(0.75) }; },
    build: function (b, P) {
        var W = b.W, H = b.H, sc = b.sc, u = jzU(b), dark = ahr_dark(sc.bg), i, k;
        var vx = W * (P.vx || 0.5), vy = H * (P.vy || 0.5), bw = W * 0.08, bh = H * 0.1, col = jzLayC(sc, dark ? 0.28 : 0.22), lw = Math.max(1.2, u * 0.0026);
        var HB = ahr4_bh(b);
        // the light at the far end
        var Lg = ahr4_solid(b.comp, ahr_light(sc), 'bg corridor light', W, H);
        ahr4_ellMask(Lg, vx, vy, Math.max(bw, bh) * 1.2, Math.max(bw, bh) * 3);
        jzSetExpr(jzXf(Lg, 'ADBE Opacity'), HB + ahr4_lamp((P.seed | 0) + 1, 1, 'T') + jzN((dark ? 0.22 : 0.3) * 100 * 1.3) + '*lv*FI');
        var S = jzShapeLayer(b, 'bg corridor', 0, 0), n = 7, sp = P.spd || 0.35;
        // frames sliding towards the camera (floor and ceiling edges)
        for (k = 0; k < n; k++) {
            var g = jzGrp(S, 'frame ' + k), fz = HB + 'var f=wr(' + jzN(k / n) + '+BT*' + jzN(sp * 0.12) + ',1),z=Math.pow(f,2.2);var x0=' + jzN(vx - bw) + '*(1-z),x1=' + jzN(vx + bw) + '*(1-z)+' + jzN(W) + '*z,y0=' + jzN(vy - bh) + '*(1-z),y1=' + jzN(vy + bh) + '*(1-z)+' + jzN(H) + '*z;';
            var r1 = jzAddRect(g, 10, lw, 0);
            r1.property('ADBE Vector Rect Size').expression = fz + '[x1-x0,' + jzN(lw) + ']';
            r1.property('ADBE Vector Rect Position').expression = fz + '[(x0+x1)/2,y0]';
            var r2 = jzAddRect(g, 10, lw, 0);
            r2.property('ADBE Vector Rect Size').expression = fz + '[x1-x0,' + jzN(lw) + ']';
            r2.property('ADBE Vector Rect Position').expression = fz + '[(x0+x1)/2,y1]';
            jzAddFill(g, col);
        }
        var gl = jzGrp(S, 'walls'), back = [[vx - bw, vy - bh], [vx + bw, vy - bh], [vx + bw, vy + bh], [vx - bw, vy + bh]], corners = [[0, 0], [W, 0], [W, H], [0, H]];
        for (i = 0; i < 4; i++) jzAddPath(gl, [corners[i], back[i]], false);
        jzAddPath(gl, back, true);
        jzAddStroke(gl, col, lw);
        jzSetExpr(jzXf(S, 'ADBE Opacity'), HB + '100*FI');
        var V = ahr4_solid(b.comp, ahr_night(sc), 'bg corridor dark', W, H), hyp = Math.sqrt(W * W + H * H);
        ahr4_ellMask(V, vx, vy, Math.min(W, H) * 0.2 + hyp * 0.2, hyp * 0.4, true);
        jzSetExpr(jzXf(V, 'ADBE Opacity'), HB + '55*FI');
    }
});

/* hrMold — 広がる染み: stains of damp creep in from the edges */
jzReg('bg', 'hrMold', {
    plan: function (rng, st) { return { seed: rng.int(1, 1e9), n: rng.int(3, 5), k: rng.range(0.08, 0.14) }; },
    build: function (b, P) {
        var W = b.W, H = b.H, sc = b.sc, u = jzU(b), s = P.seed | 0, k = P.k || 0.1, dark = ahr_dark(sc.bg), i, j;
        var stain = dark ? jzMixHex(sc.bg, jzMixHex(sc.fg, sc.accent2 || sc.sub, 0.5), k) : jzMixHex(sc.bg, jzMixHex(sc.sub, '#000000', 0.3), k * 1.4);
        var rim = dark ? jzMixHex(sc.bg, sc.fg, k * 1.6) : jzMixHex(sc.bg, '#000000', k * 1.3), HB = ahr4_bh(b, 0.8);
        var S = jzShapeLayer(b, 'bg mold', 0, 0);
        for (i = 0; i < (P.n || 4); i++) {
            var edge = ahr_h(s, i, 1) % 4, f = ahr_r(s, i, 2);
            var cx = edge === 0 ? f * W : edge === 1 ? W : edge === 2 ? f * W : 0, cy = edge === 0 ? 0 : edge === 1 ? f * H : edge === 2 ? H : f * H;
            var R = u * ahr_rr(0.25, 0.5, s, i, 3), pts = [], g = jzGrp(S, 'stain ' + i);
            for (j = 0; j < 36; j++) { var a = j / 36 * Math.PI * 2, r = R * (0.7 + 0.45 * ahr_noise1(j * 0.45, s + i)); pts.push([Math.cos(a) * r, Math.sin(a) * r]); }
            jzAddPath(g, pts, true);
            for (j = 0; j < 14; j++) { var a2 = ahr_r(s, i, j, 5) * Math.PI * 2, r2 = R * ahr_rr(1.02, 1.25, s, i, j, 6), d2 = u * ahr_rr(0.002, 0.008, s, i, j, 7) * 2; jzAddEllipse(g, d2, d2, Math.cos(a2) * r2, Math.sin(a2) * r2); }
            jzAddStroke(g, rim, Math.max(1, u * 0.003), 60);
            jzAddFill(g, stain, 80);
            jzGX(g).property('ADBE Vector Position').setValue([cx, cy]);
            jzGX(g).property('ADBE Vector Scale').expression = HB + 'var s=(0.35+0.65*oc(BT/' + jzN(ahr_rr(8, 14, s, i, 4)) + '))*oc(BT/0.8)*100;[s,s]';
        }
    }
});

/* hrDeadTrees — 枯れ木の森: two rows of bare branching trees and ground fog */
jzReg('bg', 'hrDeadTrees', {
    plan: function (rng, st) { return { seed: rng.int(1, 1e9), n: rng.int(5, 8), fog: rng.range(0.1, 0.2) }; },
    build: function (b, P) {
        var W = b.W, H = b.H, sc = b.sc, u = jzU(b), s = P.seed | 0, dark = ahr_dark(sc.bg), HB = ahr4_bh(b, 0.8), l, i, d;
        var layers = [[0.07, 0.75, 0.8], [0.13, 1, 1.15]];
        var S = jzShapeLayer(b, 'bg dead trees', 0, 0);
        for (l = 1; l >= 0; l--) {
            var kk = layers[l][0], hk = layers[l][1], sk = layers[l][2], col = dark ? jzLayC(sc, kk * 0.9) : jzMixHex(sc.bg, '#000000', kk * 1.6);
            var segs = [[], [], [], [], []], n = (P.n || 6) + l * 2;
            for (i = 0; i < n; i++) {
                var x = W * (i + 0.5 + ahr_rs(s, l, i, 1) * 0.35) / n, h = H * ahr_rr(0.7, 1.05, s, l, i, 2) * hk;
                (function seg(x0, y0, an, len, dp, id) {
                    var x1 = x0 + Math.cos(an) * len, y1 = y0 + Math.sin(an) * len;
                    segs[dp].push([[x0, y0], [x1, y1]]);
                    if (dp >= 4) return;
                    for (var bI = 0; bI < 2; bI++) seg(x1, y1, an + (bI ? 1 : -1) * ahr_rr(0.25, 0.7, s, id, bI, 3), len * ahr_rr(0.55, 0.78, s, id, bI, 4), dp + 1, id * 2 + bI + 1);
                })(x, H + 2, -Math.PI / 2 + ahr_rs(s, l, i, 5) * 0.08, h * 0.42, 0, (l * 50 + i) * 64 + 1);
            }
            for (d = 0; d < 5; d++) {
                var g = jzGrp(S, 'row ' + l + ' depth ' + d);
                for (i = 0; i < segs[d].length; i++) jzAddPath(g, segs[d][i], false);
                var st = jzAddStroke(g, col, Math.max(1, u * 0.02 * sk * Math.pow(0.55, d))); try { st.property('ADBE Vector Stroke Line Cap').setValue(2); } catch (e) {}
            }
        }
        jzSetExpr(jzXf(S, 'ADBE Opacity'), HB + '100*FI');
        jzXf(S, 'ADBE Anchor Point').setValue([W / 2, H]);
        jzXf(S, 'ADBE Position').setValue([W / 2, H]);
        jzSetExpr(jzXf(S, 'ADBE Rotate Z'), 'Math.sin((time+' + jzN(b.cut.start || 0) + ')*0.4)*0.25');
        // ground fog
        var F = ahr4_solid(b.comp, dark ? jzLayC(sc, 0.5) : sc.bg, 'bg fog', W, H), fm = F.property('ADBE Mask Parade').addProperty('ADBE Mask Atom'), sh = new Shape();
        sh.vertices = [[-W * 0.2, H * 0.8], [W * 1.2, H * 0.8], [W * 1.2, H * 1.3], [-W * 0.2, H * 1.3]]; sh.closed = true;
        fm.property('ADBE Mask Shape').setValue(sh); fm.property('ADBE Mask Feather').setValue([H * 0.5, H * 0.5]);
        jzSetExpr(jzXf(F, 'ADBE Opacity'), HB + jzN((P.fog || 0.15) * 100 * 1.4) + '*FI');
    }
});

/* ================================================================ CAMERA */

/* hrNervous — 怯えた手持ち: a scared hand-held camera with a sudden flinch now and then */
jzReg('cam', 'hrNervous', {
    plan: function (rng, st) { return { f: rng.range(0.9, 1.3), jerk: rng.range(0.6, 1) }; },
    apply: function (cam, P) {
        var H0 = jzCamHead(cam) + AHR_FNS, f = P.f || 1, sd = (cam.cut.seed | 0) % 97, W = cam.W, H = cam.H;
        var fl = 'var per=1.6,cyc=Math.floor(time/per);seedRandom(SD+cyc*7,true);var since=time-cyc*per-random()*per*0.6,go=random()<' + jzN(0.65 * (P.jerk || 0.8)) + ',j1=random(-1,1),j2=random(-1,1),j3=random(-1,1);var dk=(since>0&&go)?Math.exp(-since*9)*KM:0;';
        jzSetExpr(jzXf(cam.nul, 'ADBE Position'), H0 + fl + 'var t=time*' + jzN(f) + ';' +
            'var x=(nz(t*1.7,' + sd + ')*0.6+nz(t*5.3,' + (sd + 1) + ')*0.4)*' + jzN(W * 0.009) + '*KM+j1*' + jzN(W * 0.025) + '*dk;' +
            'var y=(nz(t*1.4,' + (sd + 2) + ')*0.6+nz(t*4.7,' + (sd + 3) + ')*0.4)*' + jzN(H * 0.011) + '*KM+Math.sin(time*2.2)*' + jzN(H * 0.004) + '*KM+j2*' + jzN(H * 0.03) + '*dk;[value[0]+x,value[1]+y]');
        jzSetExpr(jzXf(cam.nul, 'ADBE Rotate Z'), H0 + fl + 'value+nz(time*' + jzN(f * 1.1) + ',' + (sd + 4) + ')*1.2*KM+j3*3*dk');
        jzSetExpr(jzXf(cam.nul, 'ADBE Scale'), '[value[0]*1.03,value[1]*1.03]');
    }
});

/* hrDutchSnap — 不意の傾き: a slow push, then the frame suddenly tips over */
jzReg('cam', 'hrDutchSnap', {
    plan: function (rng, st) { return { at: rng.range(0.45, 0.65), a: rng.range(3, 4.8) * rng.pick([1, -1]) }; },
    apply: function (cam, P) {
        var H0 = jzCamHead(cam) + AHR_FNS + 'var q=cl((time-DUR*' + jzN(P.at || 0.55) + ')/0.1),e=q<=0?0:ob(q,2.5);';
        jzSetExpr(jzXf(cam.nul, 'ADBE Scale'), H0 + 'var s=1+0.045*KM*ios(cu)+0.02*KM*e;[value[0]*s,value[1]*s]');
        jzSetExpr(jzXf(cam.nul, 'ADBE Rotate Z'), H0 + 'value+' + jzN(P.a || 4) + '*Math.min(1,KM)*e');
        jzSetExpr(jzXf(cam.nul, 'ADBE Position'), H0 + '[value[0],value[1]-' + jzN(cam.H * 0.006) + '*KM*e]');
    }
});

/* ================================================================ SCREEN EFFECTS */

/* hrSubliminal — サブリミナル: one frame of a zoomed, red-stained negative */
jzReg('fx', 'hrSubliminal', { build: function (f, ev) {
    var W = f.W, H = f.H, s = ahr_h(Math.round(ev.t * 1000), 9127), z = 1.25 + 0.2 * ahr_r(s, 1), cx = W * (0.5 + ahr_rs(s, 2) * 0.08), cy = H * (0.5 + ahr_rs(s, 3) * 0.08);
    var L = jzAdjLayer(f.comp, 'JZ FX hrSubliminal', ev.t, Math.max(1 / 24, ev.dur * 0.55));
    var tf = jzEffect(L, 'ADBE Geometry2', 'hr Sub Zoom'); jzEP(tf, 1, [cx, cy]); jzEP(tf, 2, [cx, cy]); jzEP(tf, 4, z * 100);
    jzEffect(L, 'ADBE Invert', 'hr Sub Negative');
    var sc = ev.sc || f.st.schemes[0], red = jzMixHex(jzFitContrast(sc.accent, '#ffffff', 2.5), '#000000', 0.25);
    var ti = L.property('ADBE Effect Parade').addProperty('ADBE Tint'); ti.name = 'hr Sub Stain';
    jzEP(ti, 1, [0, 0, 0]); jzEP(ti, 2, jzHex(red)); jzEP(ti, 3, 100);
} });

/* hrSignalLoss — 映像の途切れ: the picture tears, drops to black with a signal-lost caption, and rolls back in */
jzReg('fx', 'hrSignalLoss', { build: function (f, ev) {
    var W = f.W, H = f.H, s = ahr_h(Math.round(ev.t * 1000), 9127), HD = jzEvHead(ev.t, ev.dur);
    // tearing (p < 0.3) and the roll back in (p > 0.78) on an adjustment layer
    var A = jzAdjLayer(f.comp, 'JZ FX hrSignalLoss', ev.t, ev.dur);
    var ww = jzEffect(A, 'ADBE Wave Warp', 'hr Tear'); jzEP(ww, 1, 2); jzEP(ww, 4, 0); jzEP(ww, 5, 0); jzEP(ww, 6, 1);
    jzEX(ww, 2, HD + 'posterizeTime(24);seedRandom(' + (s % 9973) + '+Math.floor(time*24),true);p<0.3?random(0.3,1)*' + jzN(W * 0.12) + '*p/0.3:0');
    jzEX(ww, 3, HD + 'posterizeTime(24);seedRandom(' + (s % 9973) + '+Math.floor(time*24)+5,true);random(' + jzN(H * 0.1) + ',' + jzN(H * 0.4) + ')');
    var of = jzEffect(A, 'ADBE Offset', 'hr Roll');
    jzEX(of, 1, HD + 'var q=cl((p-0.78)/0.22);[value[0],value[1]+(p>0.78?(1-q)*' + jzN(H * 0.5) + ':0)]');
    var B = jzEvSolid(f.comp, 'JZ FX hrSignalLoss black', '#000000', ev.t, ev.dur);
    jzSetExpr(jzXf(B, 'ADBE Opacity'), HD + 'p<0.3?50*p/0.3:(p<0.78?100:0)');
    var bar = jzEvShape(f.comp, 'JZ FX hrSignalLoss seam', ev.t, ev.dur), gb = jzGrp(bar, 'seam'), bh = Math.max(3, H * 0.03);
    jzAddRect(gb, W, bh, 0, W / 2, -bh / 2); jzAddFill(gb, '#000000');
    jzSetExpr(jzXf(bar, 'ADBE Position'), HD + 'var q=cl((p-0.78)/0.22);[0,(1-q)*' + jzN(H * 0.5) + ']');
    jzSetExpr(jzXf(bar, 'ADBE Opacity'), HD + 'p>0.78?100:0');
    // caption on the black
    var fs = Math.max(10, Math.round(Math.min(W, H) * 0.035)), tctx = { comp: f.comp, roles: null };
    var T1 = jzText(tctx, 'NO SIGNAL', { font: 'mono', size: fs, color: '#FFFFFF', x: W * 0.06, y: H * 0.08, align: 'left' });
    var T2 = jzText(tctx, 'CH ' + jzPad(3 + (s % 9), 2), { font: 'mono', size: fs, color: '#FFFFFF', x: W * 0.06, y: H * 0.08 + fs * 1.5, align: 'left' });
    T1.inPoint = T2.inPoint = Math.max(0, ev.t); T1.outPoint = T2.outPoint = Math.min(f.comp.duration, ev.t + Math.max(ev.dur, 1 / 24));
    jzSetExpr(jzXf(T1, 'ADBE Opacity'), HD + 'posterizeTime(12);(p>=0.3&&p<0.78)?(Math.floor(time*12)%4<3?85:30):0');
    jzSetExpr(jzXf(T2, 'ADBE Opacity'), HD + '(p>=0.3&&p<0.78)?60:0');
} });

/* hrPassingShadow — 横切る影: something tall and dark crosses the frame in a few frames */
jzReg('fx', 'hrPassingShadow', { build: function (f, ev) {
    var W = f.W, H = f.H, s = ahr_h(Math.round(ev.t * 1000), 9127), dir = ahr_r(s, 1) < 0.5 ? 1 : -1, M = Math.min(W, H);
    var w = M * ahr_rr(0.22, 0.32, s, 2), h = H * 1.1, top = H * ahr_rr(0.05, 0.2, s, 3), sc = ev.sc || f.st.schemes[0], dk = ahr_dark(sc.bg);
    var col = dk ? jzMixHex(sc.fg, sc.bg, 0.35) : '#000000';
    var S = jzEvShape(f.comp, 'JZ FX hrPassingShadow', ev.t, ev.dur), k;
    var gg = [[1, dk ? 30 : 65], [1.12, dk ? 15 : 30]];
    for (k = 0; k < 2; k++) {
        var gk = gg[k][0], g = jzGrp(S, 'figure ' + k);
        jzAddEllipse(g, w * 0.6 * gk, w * 0.76 * gk, 0, top + w * 0.35);
        var pts = [[-w * 0.5 * gk, h], [-w * 0.55 * gk, top + w * 0.95], [-w * 0.3 * gk, top + w * (0.72 - 0.05 * gk)], [0, top + w * (0.7 - 0.05 * gk)], [w * 0.3 * gk, top + w * (0.72 - 0.05 * gk)], [w * 0.55 * gk, top + w * 0.95], [w * 0.5 * gk, h]];
        jzAddPath(g, pts, true);
        jzAddFill(g, col, gg[k][1]);
    }
    jzSetExpr(jzXf(S, 'ADBE Position'), jzEvHead(ev.t, ev.dur) + '[' + (dir > 0 ? jzN(-W * 0.25) + '+' + jzN(W * 1.5) + '*p' : jzN(W * 1.25) + '-' + jzN(W * 1.5) + '*p') + ',0]');
} });

/* ================================================================ TRANSITIONS */

/* hrStaticCut — 砂嵐カット: the old shot drowns in snow, the new one surfaces out of it */
jzReg('trans', 'hrStaticCut', {
    plan: function (rng, st) { return { roll: rng.chance(0.6) }; },
    build: function (t) {
        var W = t.W, H = t.H, HD = jzEvHead(t.t0, t.dur) + 'var inW=time>=T0&&time<T0+TD;var nzv=p<0.5?iq(p/0.5):1-(1-(1-(p-0.5)/0.5)*(1-(p-0.5)/0.5));';
        jzSetExpr(jzXf(t.B, 'ADBE Opacity'), HD + '(inW&&p<0.5)?0:value');
        if (t.P.roll) {
            var oa = jzEffect(t.A, 'ADBE Offset', 'hr Static Roll A');
            jzEX(oa, 1, HD + '(inW&&p<0.5)?[value[0],value[1]+Math.round(Math.sin(p*Math.PI)*' + jzN(H * 0.08) + ')]:value');
            var ob2 = jzEffect(t.B, 'ADBE Offset', 'hr Static Roll B');
            jzEX(ob2, 1, HD + '(inW&&p>=0.5)?[value[0],value[1]-Math.round(Math.sin(p*Math.PI)*' + jzN(H * 0.08) + ')]:value');
        }
        var N = jzEvSolid(t.comp, 'JZ Trans hrStaticCut snow', '#808080', t.t0, t.dur);
        var ne = jzEffect(N, 'ADBE Noise', 'hr Snow'); jzEP(ne, 1, 100); jzEP(ne, 2, 0);
        jzSetExpr(jzXf(N, 'ADBE Opacity'), HD + 'Math.min(1,nzv*1.15)*100');
        var Bd = jzEvShape(t.comp, 'JZ Trans hrStaticCut band', t.t0, t.dur), g = jzGrp(Bd, 'band');
        jzAddRect(g, W, H * 0.12, 0, W / 2, H * 0.06); jzAddFill(g, '#000000');
        jzSetExpr(jzXf(Bd, 'ADBE Position'), 'posterizeTime(24);seedRandom(Math.floor(time*24)+7,true);[0,random()*' + jzN(H) + ']');
        jzSetExpr(jzXf(Bd, 'ADBE Opacity'), HD + '50*nzv');
    }
});

/* hrBlink — まばたき: eyelids close on the old shot and open on the new one */
jzReg('trans', 'hrBlink', {
    plan: function (rng, st) { return { half: rng.chance(0.3) }; },
    build: function (t) {
        var W = t.W, H = t.H, bow = H * 0.18 * 0.7, i;
        var HD = jzEvHead(t.t0, t.dur) + 'var inW=time>=T0&&time<T0+TD;var c=p<0.5?ic(p/0.5):1-oc((p-0.5)/0.5);var h=' + jzN(H / 2 * 1.02) + '*c;';
        jzSetExpr(jzXf(t.B, 'ADBE Opacity'), HD + '(inW&&p<0.5)?0:value');
        var S = jzEvShape(t.comp, 'JZ Trans hrBlink lids', t.t0, t.dur), sg = [1, -1];
        for (i = 0; i < 2; i++) {
            var g = jzGrp(S, i ? 'lower lid' : 'upper lid'), pts = [[0, -H * 1.2 * sg[i]], [W, -H * 1.2 * sg[i]]], k;
            for (k = 16; k >= 0; k--) { var f2 = k / 16; pts.push([W * f2, sg[i] * (-bow + 4 * bow * f2 * (1 - f2))]); }
            jzAddPath(g, pts, true); jzAddFill(g, '#000000');
            jzGX(g).property('ADBE Vector Position').expression = HD + (i ? '[0,' + jzN(H) + '-h+' + jzN(bow * 0.5) + ']' : '[0,h-' + jzN(bow * 0.5) + ']');
        }
        // a soft shadow around the lids
        var Sf = jzEvSolid(t.comp, 'JZ Trans hrBlink shade', '#000000', t.t0, t.dur);
        for (i = 0; i < 2; i++) {
            var m = Sf.property('ADBE Mask Parade').addProperty('ADBE Mask Atom'), sh = new Shape(), y0 = i ? H * 0.8 : -H * 0.3, y1 = i ? H * 1.3 : H * 0.2;
            sh.vertices = [[-W * 0.1, y0], [W * 1.1, y0], [W * 1.1, y1], [-W * 0.1, y1]]; sh.closed = true;
            m.property('ADBE Mask Shape').setValue(sh); m.property('ADBE Mask Feather').setValue([H * 0.5, H * 0.5]);
        }
        jzSetExpr(jzXf(Sf, 'ADBE Opacity'), HD + '60*c');
    }
});
