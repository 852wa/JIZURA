// ================================================================ pack x2waA part 2 (AE port of src/11p_x2_waA.js — 追加分2 和風)
// 10 decor parts: wzShippo, wzYagasuri, wzUroko, wzMizuhiki, wzRyusui, wzYukiwa, wzChidori, wzUme, wzTake, wzKazaguruma
// 6 backgrounds:  wzBgShippo, wzBgSayagata, wzBgTatewaku, wzBgRyusui, wzBgYukiwa, wzBgYagasuri
// Uses the kit and helpers of part 1 (p_x2_waA1.jsx, prefix awza_).
//
// decor.build(ctx, bb, d): layers live in the CONTENT comp (time 0 = cut start). Every entry is main-pass only in the browser
// (kept out of the tinted ghosts in awza_dreg) and starts once the entrance has mostly settled: expressions use
// t = time - ST (ST = 0.5 x inDur, at most 0.3 s) and o = 1 - inCubic(exit). The lyric's box is the resting one, so the
// geometry is laid out at build time and moved with group transforms, Trim Paths, masks and a few createPath expressions.
// bg.build(b, P): b.comp is the cut's WRAPPER comp (time 0 = cut start); T = song time, BT = time since this background began.

/* ---------------------------------------------------------------- decor helpers */
function awza_du(ctx) { return Math.min(ctx.W, ctx.H) / 1080; }
function awza_mg(ctx) { return Math.min(ctx.W, ctx.H) * 0.05; }
function awza_vis(ctx, c) { return (c && jzContrast(c, ctx.sc.bg) >= 1.6) ? c : ctx.sc.fg; }
function awza_acc(ctx) { return awza_vis(ctx, ctx.sc.accent); }
function awza_colOf(ctx, p) { return p.accent ? awza_acc(ctx) : ctx.sc.fg; }
function awza_bw(bb) { return bb.x1 - bb.x0; }
function awza_bh(bb) { return bb.y1 - bb.y0; }
function awza_hit(x0, y0, x1, y1, bb, pad) { pad = pad || 0; return !(x1 < bb.x0 - pad || x0 > bb.x1 + pad || y1 < bb.y0 - pad || y0 > bb.y1 + pad); }
// lyric bbox kept on screen (the browser's getBB)
function awza_dbb(ctx, bb) {
    var W = ctx.W, H = ctx.H, b;
    if (bb && isFinite(bb.x0 + bb.x1 + bb.y0 + bb.y1) && bb.x1 > bb.x0 && bb.y1 > bb.y0) {
        b = { x0: Math.max(bb.x0, 0), x1: Math.min(bb.x1, W), y0: Math.max(bb.y0, 0), y1: Math.min(bb.y1, H) };
        if (b.x1 <= b.x0) { b.x0 = bb.x0; b.x1 = bb.x1; }
        if (b.y1 <= b.y0) { b.y0 = bb.y0; b.y1 = bb.y1; }
    } else b = { x0: W * 0.35, x1: W * 0.65, y0: H * 0.4, y1: H * 0.6 };
    b.cx = (b.x0 + b.x1) / 2; b.cy = (b.y0 + b.y1) / 2;
    return b;
}
// a free w×h box next to the lyric or in a screen corner (ok = false when nothing is free)
function awza_spot(ctx, bb, w, h, p, gap) {
    var W = ctx.W, H = ctx.H, m = awza_mg(ctx) * 0.7, sx = p.right ? 1 : -1, sy = p.low ? 1 : -1;
    var ord = [[sx, sy], [-sx, sy], [sx, -sy], [-sx, -sy]], near = [], cor = [], i, a, b, all, x, y;
    for (i = 0; i < 4; i++) {
        a = ord[i][0]; b = ord[i][1];
        near.push([a > 0 ? bb.x1 + gap : bb.x0 - gap - w, jzClamp(bb.cy - h / 2, m, Math.max(m, H - m - h))]);
        near.push([jzClamp(a > 0 ? bb.x1 - w : bb.x0, m, Math.max(m, W - m - w)), b > 0 ? bb.y1 + gap : bb.y0 - gap - h]);
        cor.push([a > 0 ? W - m - w : m, b > 0 ? H - m - h : m]);
    }
    all = p.corner ? cor.concat(near) : near.concat(cor);
    for (i = 0; i < all.length; i++) {
        x = all[i][0]; y = all[i][1];
        if (x < m - 1 || y < m - 1 || x + w > W - m + 1 || y + h > H - m + 1) continue;
        if (!awza_hit(x, y, x + w, y + h, bb, gap * 0.4)) return { x: x, y: y, ok: true };
    }
    return { x: 0, y: 0, ok: false };
}
// awza_spot with the box shrunk step by step until it fits; returns {x, y, k} or null
function awza_spotFit(ctx, bb, w, h, p, gap) {
    var ks = [1, 0.78, 0.6, 0.46], i, s;
    for (i = 0; i < ks.length; i++) { s = awza_spot(ctx, bb, w * ks[i], h * ks[i], p, gap * ks[i]); if (s.ok) return { x: s.x, y: s.y, k: ks[i] }; }
    return null;
}
// corner region that does not touch the lyric: {x, y (the corner), sx, sy (inward directions), w, h} or null
function awza_cornerBox(ctx, bb, p, S, u) {
    var W = ctx.W, H = ctx.H, best = null, R = !!p.right, L = !!p.low, opts = [[R, L], [!R, L], [R, !L], [!R, !L]], i;
    for (i = 0; i < 4; i++) {
        var r = opts[i][0], l = opts[i][1], ax = (r ? W - bb.x1 : bb.x0) - 22 * u, ay = (l ? H - bb.y1 : bb.y0) - 22 * u, s = Math.max(ax, ay);
        if (!best || (s > best.sc * 1.6 && best.sc < 150 * u)) best = { sc: s, ax: ax, ay: ay, r: r, l: l };
    }
    if (!best || best.sc < 90 * u) return null;
    var byX = best.ax >= best.ay;
    return { x: best.r ? W : 0, y: best.l ? H : 0, sx: best.r ? -1 : 1, sy: best.l ? -1 : 1, w: byX ? Math.min(S, best.ax) : Math.min(S, W * 0.5), h: byX ? Math.min(S, H * 0.5) : Math.min(S, best.ay) };
}
// expression header: jzTH + helpers + t (time after the settle delay), V (started), o (exit factor), eased ramps on t
function awza_DH(ctx) {
    return awza_H(ctx) + 'var ST=' + jzN(jzClamp((ctx.cut.inDur || 0) * 0.5, 0, 0.3)) + ',t=time-ST,V=t>0?1:0,o=K;' +
        'function ein(d,dl){return oe((t-(dl||0))/d);}function eio(d,dl){return ioc((t-(dl||0))/d);}function eoc(d,dl){return oc((t-(dl||0))/d);}' +
        'function eb(d,dl,s){var q=cl((t-(dl||0))/d);return q<=0?0:(q>=1?1:ob(q,s||1.6));}\n';
}
function awza_dkit(ctx, name, o) { o = o || {}; o.H = awza_DH(ctx); if (!o.a) o.a = 'V*o'; return awza_kit(ctx, name, o); }
function awza_ein(d, dl) { return 'ein(' + jzN(d) + ',' + jzN(dl || 0) + ')'; }
function awza_eb(d, dl, s) { return 'eb(' + jzN(d) + ',' + jzN(dl || 0) + ',' + jzN(s || 1.6) + ')'; }
// register a decor part: fn(ctx, bb, p, u, mo); its layers are main-pass only
function awza_dreg(key, back, fn) {
    jzReg('decor', key, { back: !!back, build: function (ctx, bb, d) {
        var n0 = ctx.comp.numLayers, p = { n: jzClamp((d.n == null ? 1 : d.n) | 0, 1, 3), v: (d.v || 0) | 0, r: d.r == null ? 0.5 : d.r, seed: d.seed == null ? 1 : d.seed,
            right: !!d.right, low: !!d.low, accent: !!d.accent, corner: !!d.corner, big: !!d.big }, i;
        fn(ctx, awza_dbb(ctx, bb), p, awza_du(ctx), awza_mot(ctx));
        for (i = 1; i <= ctx.comp.numLayers - n0; i++) jzNoGhost(ctx.comp.layer(i));
    } });
}

/* ================================================================== DECOR */

/* 七宝 — a window (round, band or panel) of interlocking circles that wipes open; the knots pulse.
   AE: two circles + Repeaters under a mask that opens; all knots of one sub-lattice pulse together. */
awza_dreg('wzShippo', false, function (ctx, bb, p, u, mo) {
    var W = ctx.W, sc = ctx.sc, r = 30 * u * (p.big ? 1.3 : 1), shape = p.v % 3;
    var w0 = shape === 0 ? r * 6.2 : (shape === 1 ? jzClamp(awza_bw(bb) * 0.8, r * 8, W * 0.7) : r * 8), h0 = shape === 0 ? r * 6.2 : (shape === 1 ? r * 3 : r * 4.4);
    var sp = awza_spotFit(ctx, bb, w0, h0, p, 26 * u); if (!sp) return;
    var w = w0 * sp.k, h = h0 * sp.k, x0 = sp.x, y0 = sp.y, c = awza_colOf(ctx, p), ac = p.accent ? sc.fg : awza_acc(ctx), E = 'var e=eio(0.6);';
    var RECT = 'var xa=' + (p.right ? jzN(x0 + w) + '-' + jzN(w) + '*e' : jzN(x0)) + ',p=[[xa,' + jzN(y0) + '],[xa+' + jzN(w) + '*e,' + jzN(y0) + '],[xa+' + jzN(w) + '*e,' + jzN(y0 + h) + '],[xa,' + jzN(y0 + h) + ']]';
    var rect = [[x0, y0], [x0 + w, y0], [x0 + w, y0 + h], [x0, y0 + h]];
    var g = awza_dkit(ctx, 'wz shippo', { X: E });
    if (shape === 0) {
        var m = awza_maskEll(g, x0 + w / 2, y0 + h / 2, w / 2, w / 2);
        jzSetExpr(m.property('ADBE Mask Shape'), g.H + 'var R=' + jzN(w / 2) + '*e,q=0.5523*R,cx=' + jzN(x0 + w / 2) + ',cy=' + jzN(y0 + h / 2) + ';createPath([[cx,cy-R],[cx+R,cy],[cx,cy+R],[cx-R,cy]],[[-q,0],[0,-q],[q,0],[0,q]],[[q,0],[0,q],[-q,0],[0,-q]],true)');
    } else awza_mask(g, rect, RECT + ';createPath(p,[],[],true)');
    var ni = Math.min(60, Math.ceil(w / r) + 3), nj = Math.min(40, Math.ceil(h / r) + 3), rep = [[Math.ceil((ni + 2) / 2), 2 * r, 0], [Math.ceil((nj + 1) / 2) + 1, 0, 2 * r]];
    g.sub({ dx: 'wr(time*' + jzN(7 * u) + '*MO,' + jzN(2 * r) + ')' });
    awza_op(g, { t: 'ell', list: [[x0 - 2 * r, y0, r, r], [x0 - r, y0 - r, r, r]], stroke: c, sw: 2 * u, k: 0.85, o: { rep: rep } });
    g.c(x0 - 2 * r, y0, r * 0.17, ac, 0.85, { rE: jzN(r * 0.17) + '*(1+0.35*Math.sin(time*2.2))', rep: rep });
    g.c(x0 - r, y0 - r, r * 0.17, ac, 0.85, { rE: jzN(r * 0.17) + '*(1+0.35*Math.sin(time*2.2+1.4))', rep: rep });
    g.end();
    g.done();
    var g2 = awza_dkit(ctx, 'wz shippo frame', { X: E });
    if (shape === 0) g2.cs(x0 + w / 2, y0 + h / 2, w / 2, c, 3 * u, 1, { rE: jzN(w / 2) + '*e' });
    else g2.ps(rect, c, 3 * u, 1, { shape: RECT });
    g2.done();
});

/* 矢絣 — strips of arrow-feather chevrons beside the lyric (above / below it when the sides are full), scrolling in
   opposite directions.  AE: one layer per strip — a chevron pair + Repeater sliding under a mask that grows from the middle. */
awza_dreg('wzYagasuri', false, function (ctx, bb, p, u, mo) {
    var W = ctx.W, H = ctx.H, m = awza_mg(ctx) * 0.7, sw = 46 * u * (p.big ? 1.3 : 1), gap = 14 * u, g0 = 30 * u, horiz = false, plus = !!p.right, k;
    var fr = [W - m - bb.x1 - g0, bb.x0 - g0 - m, H - m - bb.y1 - g0, bb.y0 - g0 - m];
    if ((plus ? fr[0] : fr[1]) < sw) plus = !plus;
    var free = plus ? fr[0] : fr[1];
    if (free < sw) { horiz = true; plus = !!p.low; if ((plus ? fr[2] : fr[3]) < sw) plus = !plus; free = plus ? fr[2] : fr[3]; if (free < sw) return; }
    var n = Math.max(1, Math.min(p.n, Math.floor((free + gap) / (sw + gap)))), AM = horiz ? W : H;
    var h = horiz ? jzClamp(awza_bw(bb) * 1.02, 280 * u, W - m * 2) : jzClamp(awza_bh(bb) * 1.25, 280 * u, H * 0.8), mid = jzClamp(horiz ? bb.cx : bb.cy, h / 2 + m, Math.max(h / 2 + m, AM - h / 2 - m));
    var c = awza_colOf(ctx, p), ph = sw * 0.8, e0 = horiz ? (plus ? bb.y1 : bb.y0) : (plus ? bb.x1 : bb.x0);
    for (k = 0; k < n; k++) {
        var ec = e0 + (plus ? 1 : -1) * (g0 + sw / 2 + k * (sw + gap)), dir = k % 2 ? -1 : 1, px = horiz ? mid : ec, py = horiz ? ec : mid;
        var xl = px - sw / 2, sl = dir * sw * 0.5, gp = 1.5 * u, ya = py - h / 2 - ph * 6;
        // local frame: the strip runs along y through (px, py); a horizontal strip is the same layer turned -90°
        var g = awza_dkit(ctx, 'wz yagasuri ' + (k + 1), { cx: px, cy: py, rotv: horiz ? -90 : 0, X: 'var hq=' + jzN(h / 2) + '*' + awza_ein(0.55, k * 0.09) + ';', a: 'V*o*(hq<1?0:1)' });
        awza_mask(g, [[xl - 4 * u, py - h / 2], [xl + sw + 4 * u, py - h / 2], [xl + sw + 4 * u, py + h / 2], [xl - 4 * u, py + h / 2]],
            'var p=[[' + jzN(xl - 4 * u) + ',' + jzN(py) + '-hq],[' + jzN(xl + sw + 4 * u) + ',' + jzN(py) + '-hq],[' + jzN(xl + sw + 4 * u) + ',' + jzN(py) + '+hq],[' + jzN(xl - 4 * u) + ',' + jzN(py) + '+hq]];createPath(p,[],[],true)');
        g.mr([[xl - 3 * u, py - h / 2, 2 * u, h], [xl + sw + u, py - h / 2, 2 * u, h]], c);
        g.sub({ dy: 'wr(time*' + jzN(22 * u * dir) + '*MO,' + jzN(ph * 2) + ')' });
        g.mp([[[xl, ya], [px - gp, ya + sl], [px - gp, ya + sl + ph], [xl, ya + ph]], [[xl + sw, ya], [px + gp, ya + sl], [px + gp, ya + sl + ph], [xl + sw, ya + ph]]],
            k === 1 && !p.accent ? awza_acc(ctx) : c, 0.85, { rep: [[Math.min(80, Math.ceil((h + ph * 8) / (ph * 2)) + 1), 0, ph * 2]] });
        g.end();
        g.done();
    }
});

/* 鱗 — rows of scale triangles under (or over) the lyric that pop up one by one and shimmer (one group per triangle) */
awza_dreg('wzUroko', false, function (ctx, bb, p, u, mo) {
    var W = ctx.W, H = ctx.H, sc = ctx.sc, m = awza_mg(ctx) * 0.7, b = 42 * u * (p.big ? 1.3 : 1), th = b * 0.82, g0 = 24 * u, r, i;
    var roomB = H - m - bb.y1 - g0, roomT = bb.y0 - g0 - m, low = !!p.low; if ((low ? roomB : roomT) < th) low = !low;
    var room = low ? roomB : roomT; if (room < th) return;
    var rows = Math.max(1, Math.min(p.n, Math.floor(room / th))), wd = jzClamp(awza_bw(bb), 5 * b, W - m * 2), n = Math.min(48, Math.floor(wd / b));
    var x0 = jzClamp(bb.cx - n * b / 2, m, Math.max(m, W - m - n * b)), c = awza_colOf(ctx, p), ac = p.accent ? sc.fg : awza_acc(ctx);
    var g = awza_dkit(ctx, 'wz uroko');
    for (r = 0; r < rows; r++) {
        var cnt = n - (r % 2), yb = low ? bb.y1 + g0 + (r + 1) * th : bb.y0 - g0 - r * th;
        for (i = 0; i < cnt; i++) {
            var idx = p.right ? cnt - 1 - i : i, cx = x0 + (i + 0.5 + (r % 2) * 0.5) * b, cyy = yb - th / 3;
            g.p([[cx, cyy - th * 2 / 3], [cx + b / 2, cyy + th / 3], [cx - b / 2, cyy + th / 3]], r % 2 ? ac : c, 1,
                { org: [cx, cyy], s: awza_eb(0.3, idx * 0.022 + r * 0.1, 1.6) + '*o', a: '0.62+0.38*Math.sin(time*' + jzN(3 * (0.4 + mo)) + '-' + jzN(idx * 0.5 + r) + ')' });
        }
    }
    g.done();
});

/* 水引 — a red-and-white cord knot (three interlocked loops and two tails) tying itself beside the lyric (Trim Paths) */
awza_dreg('wzMizuhiki', false, function (ctx, bb, p, u, mo) {
    var sc = ctx.sc, s0 = 112 * u * (p.big ? 1.25 : 1), sp = awza_spotFit(ctx, bb, s0 * 3.1, s0 * 2.1, p, 26 * u), k, d, i; if (!sp) return;
    var s = s0 * sp.k, cx = sp.x + s * 1.55, cy = sp.y + s * 1.1, cA = awza_acc(ctx), cB = sc.fg === cA ? sc.sub : sc.fg, lw = 4.2 * u * Math.max(0.7, sp.k);
    var g = awza_dkit(ctx, 'wz mizuhiki', { cx: cx, cy: cy, pose: { dy: 'Math.sin(time*1.4)*' + jzN(3 * u) + '*MO' } }), E1 = 'eio(0.7)', E2 = 'eoc(0.5,0.35)';
    function loop(ex, ey, rx, ry, rot, a0) {
        var o = [], cr = Math.cos(rot), sr = Math.sin(rot), N = 48;
        for (i = 0; i <= N; i++) { var a = a0 + i / N * AWZA_TAU, x = Math.cos(a) * rx, y = Math.sin(a) * ry; o.push([ex + x * cr - y * sr, ey + x * sr + y * cr]); }
        return o;
    }
    for (k = 0; k < 3; k++) {
        var q = 1 - k * 0.17;
        for (d = -1; d <= 1; d += 2) {
            g.pl(loop(cx + d * s * 0.47, cy + s * 0.1, s * 0.5 * q, s * 0.37 * q, d * 0.42, d < 0 ? 0 : Math.PI), d < 0 ? cA : cB, lw, 1, { cap: 2, trim: E1 });
            g.pl(awza_quad([cx + d * s * 0.2, cy + s * 0.42], [cx + d * s * (0.9 + k * 0.05), cy + s * (0.75 - k * 0.1)], [cx + d * (1.4 + k * 0.05) * s, cy + (-0.15 - k * 0.14) * s], 16), d < 0 ? cA : cB, lw, 1, { cap: 2, trim: E2, a: 't>0.35?1:0' });
        }
        g.pl(loop(cx, cy - s * 0.3, s * 0.52 * q, s * 0.42 * q, 0, Math.PI / 2), k % 2 ? cA : cB, lw, 1, { cap: 2, trim: E1 });
    }
    g.done();
});

/* 流水 — bundles of staggered parallel water lines flowing behind the lower edge of the lyric, each ending in a curl
   (every line is a createPath expression on the browser's wave formula) */
awza_dreg('wzRyusui', true, function (ctx, bb, p, u, mo) {
    var W = ctx.W, sc = ctx.sc, L = 3 + p.n, xa = Math.max(-20 * u, bb.x0 - 200 * u), xb = Math.min(W + 20 * u, bb.x1 + 200 * u), len = xb - xa, sp = 26 * u * (p.big ? 1.3 : 1), sub = awza_vis(ctx, sc.sub), i, x, a;
    var y0 = (p.low ? bb.y1 : bb.y0) - (L - 1) * sp / 2, lam = 150 * u, A = 15 * u, DX = 24 * u, g = awza_dkit(ctx, 'wz ryusui');
    for (i = 0; i < L; i++) {
        var s0 = xa + len * 0.28 * awza_r01(p.seed, i, 1), s1 = xb - len * 0.28 * awza_r01(p.seed, i, 2), Y = y0 + i * sp, pts = [], curl = i % 2 === 0, cr = 16 * u;
        var yy = function (xx) { return Y + A * Math.sin(xx / lam + i * 0.25) + A * 0.4 * Math.sin(xx / lam * 2.3); };
        for (x = s0; x < s1; x += DX) pts.push([x, yy(x)]);
        pts.push([s1, yy(s1)]);
        if (curl) for (a = 0; a <= 16; a++) { var an = a / 16 * 4.6, rr = cr * (1 - a / 22); pts.push([s1 + Math.sin(an) * rr, yy(s1) - cr + Math.cos(an) * rr + (cr - rr) * 0.4]); }
        var XX = 'var e=eio(0.8,' + jzN(i * 0.07) + '),xs=' + jzN(s0) + ',xe=xs+' + jzN(s1 - s0) + '*e,ph=time*' + jzN(0.9 * (0.3 + mo) * (p.right ? -1 : 1)) + ';' +
            'function yy(x){return ' + jzN(Y) + '+' + jzN(A) + '*Math.sin(x/' + jzN(lam) + '+ph+' + jzN(i * 0.25) + ')+' + jzN(A * 0.4) + '*Math.sin(x/' + jzN(lam) + '*2.3-ph*0.7);}';
        var SH = 'var p=[[xs,yy(xs)]];for(var x=xs+' + jzN(DX) + ',n=0;x<xe&&n<300;x+=' + jzN(DX) + ',n++)p.push([x,yy(x)]);var ey=yy(xe);p.push([xe,ey]);' +
            (curl ? 'var cr=' + jzN(cr) + '*e;for(var a=0;a<=16;a++){var an=a/16*4.6,rr=cr*(1-a/22);p.push([xe+Math.sin(an)*rr,ey-cr+Math.cos(an)*rr+(cr-rr)*0.4]);}' : '');
        g.pl(pts, i === 1 ? awza_acc(ctx) : sub, (i % 2 ? 2.6 : 3.8) * u, i === 1 ? 0.8 : 0.55, { cap: 2, X: XX, shape: SH, a: 'xe-xs<4?0:1' });
    }
    g.done();
});

/* 雪輪 — notched snow-ring crests that bloom around the lyric and turn slowly */
awza_dreg('wzYukiwa', true, function (ctx, bb, p, u, mo) {
    var W = ctx.W, H = ctx.H, n = 2 + p.n, m = awza_mg(ctx), c = awza_colOf(ctx, p), g = awza_dkit(ctx, 'wz yukiwa'), k, i;
    for (k = 0; k < n; k++) {
        var R = (46 + 60 * awza_r01(p.seed, k, 1)) * u * (p.big ? 1.3 : 1), a = (k / n + p.r) * AWZA_TAU + awza_rs(p.seed, k, 2) * 0.3;
        var x = jzClamp(bb.cx + Math.cos(a) * (awza_bw(bb) / 2 + R * 1.05), m + R, W - m - R), y = jzClamp(bb.cy + Math.sin(a) * (awza_bh(bb) / 2 + R * 1.05), m + R, H - m - R);
        var ring = awza_shift(awza_yukiwa(R), x, y), sp = [], c2 = k === 0 ? awza_acc(ctx) : c;
        for (i = 0; i < 6; i++) { var an = i / 6 * AWZA_TAU; sp.push([[x + Math.cos(an) * R * 0.2, y + Math.sin(an) * R * 0.2], [x + Math.cos(an) * R * 0.62, y + Math.sin(an) * R * 0.62]]); }
        g.sub({ org: [x, y], s: awza_eb(0.5, k * 0.1, 1.3), rotv: k * AWZA_R2D, rot: jzN((k % 2 ? -1 : 1) * 0.16 * (0.3 + mo) * AWZA_R2D) + '*time', dy: 'Math.sin(time*0.9+' + jzN(k * 2) + ')*' + jzN(6 * u) + '*MO' });
        g.p(ring, c, 0.12);
        g.ps(ring, c, 2.2 * u, 0.6);
        g.ml(sp, c2, 2 * u, 0.5);
        g.c(x, y, R * 0.1, c2, 0.5);
        g.end();
    }
    g.done();
});

/* 千鳥 — a flock of plump plover silhouettes flapping along an arc over the lyric */
awza_dreg('wzChidori', false, function (ctx, bb, p, u, mo) {
    var W = ctx.W, H = ctx.H, sc = ctx.sc, m = awza_mg(ctx) * 0.7, n = 2 + p.n, sz = 44 * u * (p.big ? 1.25 : 1), need = sz * 2.9, k;
    var up = !p.low; if ((up ? bb.y0 - m : H - m - bb.y1) < need) up = !up;
    if ((up ? bb.y0 - m : H - m - bb.y1) < need) return;
    var yb = up ? bb.y0 - sz * 1.1 : bb.y1 + sz * 1.9, xa = Math.max(m + sz, bb.x0 - 60 * u), xb = Math.min(W - m - sz, bb.x1 + 60 * u), dir = p.right ? 1 : -1, c = awza_colOf(ctx, p);
    var g = awza_dkit(ctx, 'wz chidori');
    function P(pts, S) { var o = [], i; for (i = 0; i < pts.length; i++) o.push([pts[i][0] * S * dir, pts[i][1] * S]); return o; }
    for (k = 0; k < n; k++) {
        var S = sz * (0.8 + 0.4 * awza_r01(p.seed, k, 1)), col = k === 1 ? awza_acc(ctx) : c;
        var XX = 'var f=wr(' + jzN((k + 0.5) / n) + '+time*' + jzN(0.03 * (0.3 + mo)) + ',1),ar=Math.sin(f*Math.PI),e=' + awza_eb(0.4, k * 0.08, 1.6) + '*o*cl(ar*4),' +
            'fl=1+0.3*Math.sin(time*' + jzN(7 * (0.4 + mo)) + '+' + jzN(k * 2.1) + ');';
        g.sub({ X: XX, dx: (dir > 0 ? jzN(xa) + '+' + jzN(xb - xa) + '*f' : jzN(xb) + '+' + jzN(xa - xb) + '*f'),
            dy: jzN(yb) + '-ar*' + jzN(sz * 0.6 * (up ? 1 : -0.5)) + '+Math.sin(time*2.3+' + jzN(k * 1.7) + ')*' + jzN(5 * u) + '*MO',
            s: 'e', a: 'e>0.01?e:0', rot: jzN(dir * AWZA_R2D) + '*(-0.15+0.1*Math.sin(time*1.6+' + k + '))' });
        g.c(0, 0, S * 0.5, col);
        g.p(P([[0.4, -0.16], [0.92, -0.02], [0.4, 0.14]], S), col);
        g.p(P([[-0.05, -0.3], [-0.5, -1.15], [0.32, -0.4]], S), col, 1, { org: [0, -0.35 * S], sy: '(1.15*fl-0.35)/0.8' });
        g.p(P([[-0.28, -0.25], [-1.2, -0.62], [-0.38, 0.12]], S), col, 1, { org: [0, -0.065 * S], sy: '(0.62*fl-0.065)/0.555' });
        g.p(P([[-0.36, 0.1], [-0.98, 0.42], [-0.25, 0.42]], S), col);
        g.c(0.2 * S * dir, -0.12 * S, 0.08 * S, sc.bg);
        g.end();
    }
    g.done();
});

/* 梅の枝 — an angular plum branch grows out of a corner (Trim Paths per segment) and its five-petal blossoms open one by one */
awza_dreg('wzUme', false, function (ctx, bb, p, u, mo) {
    var sc = ctx.sc, cb = awza_cornerBox(ctx, bb, p, 400 * u * (p.big ? 1.25 : 1), u), pi, i, j; if (!cb) return;
    function X(ux, uy) { return [cb.x + cb.sx * ux * cb.w, cb.y + cb.sy * uy * cb.h]; }
    var k = Math.min(cb.w, cb.h) / (400 * u), br = sc.sub, c = awza_acc(ctx), g = awza_dkit(ctx, 'wz ume');
    var paths = [[[0, 0.1], [0.3, 0.2], [0.5, 0.42], [0.78, 0.5], [0.93, 0.74]], [[0.3, 0.2], [0.44, 0.06], [0.66, 0.1]], [[0.5, 0.42], [0.42, 0.66], [0.52, 0.88]], [[0.78, 0.5], [0.95, 0.4]]];
    for (pi = 0; pi < paths.length; pi++) {
        var pa = paths[pi];
        for (i = 0; i < pa.length - 1; i++) {
            g.pl([X(pa[i][0], pa[i][1]), X(pa[i + 1][0], pa[i + 1][1])], br, Math.max(1.5, (pi ? 7 : 13) * u * Math.max(0.5, k) * (1 - i * 0.2)), 0.95,
                { cap: 2, X: 'var f=eio(0.7,' + jzN(pi ? 0.25 + pi * 0.1 : 0) + ')*' + (pa.length - 1) + '-' + i + ';', trim: 'f', a: 'f>0?1:0' });
        }
    }
    var fl = [[0.93, 0.74, 1], [0.66, 0.1, 0.9], [0.52, 0.88, 0.85], [0.5, 0.42, 0.75], [0.3, 0.2, 0.6], [0.95, 0.4, 0.7], [0.78, 0.5, 0.5], [0.42, 0.66, 0.45], [0.44, 0.06, 0.4]];
    for (i = 0; i < fl.length; i++) {
        var f = fl[i], q = X(f[0], f[1]), R = 34 * u * Math.max(0.6, k) * f[2], pet = [], dots = [];
        g.sub({ org: q, s: awza_eb(0.4, 0.55 + i * 0.08, 1.6) + '*o', rotv: i * 1.3 * AWZA_R2D, rot: 'Math.sin(time*1.2+' + i + ')*' + jzN(0.12 * mo * AWZA_R2D) });
        if (f[2] < 0.55) g.c(q[0], q[1], R * 0.75, c);
        else {
            for (j = 0; j < 5; j++) {
                var an = j / 5 * AWZA_TAU, an2 = (j + 0.5) / 5 * AWZA_TAU;
                pet.push([q[0] + Math.cos(an) * R * 0.62, q[1] + Math.sin(an) * R * 0.62, R * 0.56]);
                dots.push([q[0] + Math.cos(an2) * R * 0.34, q[1] + Math.sin(an2) * R * 0.34, R * 0.07]);
            }
            dots.push([q[0], q[1], R * 0.13]);
            g.mc(pet, c, 1, { org: q });
            g.mc(dots, sc.bg, 1, { org: q });
        }
        g.end();
    }
    g.done();
});

/* 竹 — bamboo stalks grow up joint by joint in the margin beside the lyric (faint, behind it, when there is no margin);
   leaves sway at the joints.  AE: each stalk is uncovered from the ground by a mask; its leaves are a second layer. */
awza_dreg('wzTake', true, function (ctx, bb, p, u, mo) {
    var W = ctx.W, H = ctx.H, sc = ctx.sc, g0 = 26 * u, freeR = W - bb.x1 - g0, freeL = bb.x0 - g0, right = !!p.right, k, j, q;
    if ((right ? freeR : freeL) < 80 * u && (right ? freeL : freeR) >= 80 * u) right = !right;
    var free = right ? freeR : freeL, tight = free < 80 * u, al = tight ? 0.26 : 0.9;
    var n = tight ? Math.min(p.n, 2) : Math.max(1, Math.min(p.n, Math.floor((free - 20 * u) / (64 * u)))), c = awza_colOf(ctx, p), lc = p.accent ? sc.fg : awza_acc(ctx), dir = right ? -1 : 1;
    for (k = 0; k < n; k++) {
        var x = (right ? W : 0) + dir * (38 * u + k * 64 * u), sw = (28 - k * 5) * u * (p.big ? 1.25 : 1), top = H * (0.07 + 0.13 * k + 0.05 * awza_r01(p.seed, k, 1)), seg = (150 + 30 * awza_r01(p.seed, k, 2)) * u;
        var full = H - top, HQ = 'var hq=' + jzN(full) + '*eoc(0.9,' + jzN(k * 0.12) + ');', segs = [], joints = [], leaves = [], y;
        for (j = 0, y = H + seg * 0.3 * awza_r01(p.seed, k, 3); j < 20 && y > top; j++, y -= seg) {
            var y1 = Math.max(top, y - seg + 5 * u);
            if (y - y1 > 1) segs.push([x - sw / 2, y1, sw, y - y1]);
            if (y - seg > top) joints.push([x - sw * 0.62, y - seg - u, sw * 1.24, 5 * u]);
            // leaves on every other joint, pointing into the free margin
            if (j % 2 === (k % 2) && y - seg > top + 10 * u && y - seg < H - 40 * u) {
                var ll = tight ? 90 * u : Math.min(120 * u, free - (38 + k * 64 + 4) * u);
                if (ll >= 20 * u) leaves.push([y - seg + 2 * u, ll, j]);
            }
        }
        var g = awza_dkit(ctx, 'wz take ' + (k + 1), { X: HQ, a: 'V*o*' + jzN(al) });
        awza_mask(g, [[x - sw, top - 2], [x + sw, top - 2], [x + sw, H + seg], [x - sw, H + seg]],
            'var p=[[' + jzN(x - sw) + ',' + jzN(H) + '-hq],[' + jzN(x + sw) + ',' + jzN(H) + '-hq],[' + jzN(x + sw) + ',' + jzN(H + seg) + '],[' + jzN(x - sw) + ',' + jzN(H + seg) + ']];createPath(p,[],[],true)');
        g.mr(segs, c); g.mr(joints, c);
        g.done();
        if (!leaves.length) continue;
        var g2 = awza_dkit(ctx, 'wz take leaves ' + (k + 1), { X: HQ, a: 'V*o*' + jzN(al) });
        for (j = 0; j < leaves.length; j++) {
            var ly = leaves[j][0];
            g2.sub({ org: [x, ly], s: 'cl((hq-' + jzN(H - ly) + ')/' + jzN(60 * u) + ')' });
            for (q = 0; q < 3; q++) {
                var an = (dir > 0 ? 0 : Math.PI) + dir * (-0.3 + q * 0.45), l2 = leaves[j][1] * (1 - q * 0.14), wv = l2 * 0.15;
                var lens = awza_quad([x, ly], [x + l2 * 0.5, ly + wv], [x + l2, ly], 8).concat(awza_quad([x + l2, ly], [x + l2 * 0.5, ly - wv], [x, ly], 8).slice(1, 8));
                g2.p(lens, lc, 1, { org: [x, ly], rotv: an * AWZA_R2D, rot: 'Math.sin(time*1.5+' + jzN(k + q + leaves[j][2]) + ')*' + jzN(0.07 * mo * AWZA_R2D) });
            }
            g2.end();
        }
        g2.done();
    }
});

/* 風車 — paper pinwheels on sticks that pop up beside the lyric and keep spinning */
awza_dreg('wzKazaguruma', false, function (ctx, bb, p, u, mo) {
    var sc = ctx.sc, s0 = 66 * u * (p.big ? 1.25 : 1), n = p.n, sp = awza_spotFit(ctx, bb, n * s0 * 2.3, s0 * 3.5, p, 24 * u), k, b; if (!sp) return;
    var s = s0 * sp.k, cA = awza_acc(ctx), cB = sc.fg === cA ? sc.sub : sc.fg, g = awza_dkit(ctx, 'wz kazaguruma');
    function rotP(pts, cx, cy, a) { var o = [], i, cs = Math.cos(a), sn = Math.sin(a); for (i = 0; i < pts.length; i++) o.push([cx + pts[i][0] * cs - pts[i][1] * sn, cy + pts[i][0] * sn + pts[i][1] * cs]); return o; }
    for (k = 0; k < n; k++) {
        var cx = sp.x + s * 1.15 + k * s * 2.3, cy = sp.y + s * (1.1 + (k % 2) * 0.35), dl = k * 0.12;
        g.l(cx, cy, cx, cy + s * (2.3 - (k % 2) * 0.35), sc.sub, 4 * u * Math.max(0.7, sp.k), 1, { cap: 2, trim: awza_ein(0.4, dl), a: 't>' + jzN(dl) + '?1:0' });
        g.sub({ org: [cx, cy], s: awza_eb(0.45, dl, 1.6), rotv: k * AWZA_R2D, rot: jzN((k % 2 ? -1 : 1) * AWZA_R2D) + '*(time*' + jzN(3.4 * (0.25 + mo)) + '+(1-eoc(1.2,' + jzN(dl) + '))*5)' });
        for (b = 0; b < 4; b++) {
            var a = (b + 1) * Math.PI / 2, col = (b + k) % 2 ? cA : cB;
            g.p(rotP([[0, 0], [s, 0], [s * 0.5, s * 0.5]], cx, cy, a), col);
            g.p(rotP([[0, 0], [s * 0.5, s * 0.5], [0, s * 0.5]], cx, cy, a), col, 0.55);
        }
        g.c(cx, cy, s * 0.13, sc.bg);
        g.c(cx, cy, s * 0.07, cA);
        g.end();
    }
    g.done();
});

/* ================================================================== BACKGROUNDS */
// seconds this background had already been running at the cut start (browser bgT: consecutive cuts with the same bg + seed are one run)
function awza_run(b) {
    var c = b.cut, cs = (b.plan && b.plan.cuts) || [], s = c.start || 0, P0 = c.bgP || {}, idx = -1, i;
    for (i = 0; i < cs.length; i++) if (cs[i] === c) { idx = i; break; }
    for (i = idx - 1; i >= 0; i--) {
        var q = cs[i];
        if (q.bg === c.bg && (q.bgP || {}).seed === P0.seed && Math.abs(q.end - s) < 0.06) s = q.start; else break;
    }
    return (c.start || 0) - s;
}
// header: T = absolute song time (browser env.t), BT = time since this background started (browser bgT), e = fade-in
function awza_BH(b, fade) { return JZ_FNS + AWZA_FX + 'var MO=' + jzN(awza_mot(b)) + ',T=time+' + jzN(b.cut.start || 0) + ',BT=time+' + jzN(awza_run(b)) + ',e=oc(BT/' + jzN(fade || 0.7) + ');\n'; }
function awza_bkit(b, name, fade) { return awza_kit(b, name, { H: awza_BH(b, fade), a: 'e' }); }
function awza_bseed(rng) { return rng.int(1, 1e9); }
function awza_tone(sc, col, a) { return jzMixHex(sc.bg, col, jzClamp(a, 0, 1)); }      // the browser's rgba(col, a) over the background

/* 七宝つなぎ — a drifting field of interlocking circles; the knots swell slowly.
   AE: two circles + Repeaters; the browser's travelling wave through the knots becomes two sub-lattices swelling in turn. */
jzReg('bg', 'wzBgShippo', {
    plan: function (rng, st) { return { seed: awza_bseed(rng), r: rng.range(0.065, 0.09), k: rng.range(0.07, 0.095), dx: rng.pick([1, -1]), acc: rng.chance(0.4) }; },
    build: function (b, Q) {
        var W = b.W, H = b.H, sc = b.sc, r = jzU(b) * (Q.r || 0.08), k = Q.k || 0.08;
        var ni = Math.min(90, Math.ceil(W / r) + 5), nj = Math.min(90, Math.ceil(H / r) + 5), rep = [[Math.ceil(ni / 2) + 1, 2 * r, 0], [Math.ceil(nj / 2) + 1, 0, 2 * r]];
        var g = awza_bkit(b, 'bg wz shippo', 0.7), dc = awza_tone(sc, Q.acc ? sc.accent : sc.fg, k * 1.2);
        g.sub({ dx: 'wr(T*' + jzN(r * 0.1 * (Q.dx || 1)) + ',' + jzN(2 * r) + ')', dy: 'wr(T*' + jzN(r * 0.06) + ',' + jzN(2 * r) + ')' });
        awza_op(g, { t: 'ell', list: [[-2 * r, -2 * r, r, r], [-r, -r, r, r]], stroke: awza_tone(sc, sc.fg, k), sw: Math.max(1.2, r * 0.035), k: 1, o: { rep: rep } });
        g.c(-2 * r, -2 * r, r * 0.16, dc, 1, { rE: jzN(r) + '*(0.1+0.12*(0.5+0.5*Math.sin(T*0.9)))*e', rep: rep });
        g.c(-r, -r, r * 0.16, dc, 1, { rE: jzN(r) + '*(0.1+0.12*(0.5+0.5*Math.sin(T*0.9-1.6)))*e', rep: rep });
        g.end();
        g.done();
    }
});

/* 紗綾形 — linked-manji key fret set on the diagonal; the lattice slides along itself and the line weight breathes
   (one four-armed motif, two Repeaters along the lattice vectors) */
jzReg('bg', 'wzBgSayagata', {
    plan: function (rng, st) { return { seed: awza_bseed(rng), q: rng.range(0.015, 0.02), k: rng.range(0.06, 0.08), dir: rng.pick([1, -1]), rot: rng.pick([45, 45, 0]) }; },
    build: function (b, Q) {
        var W = b.W, H = b.H, sc = b.sc, q = jzU(b) * (Q.q || 0.017), k = Q.k || 0.07, cx = W / 2, cy = H / 2, a, arms = [];
        var ax = 6 * q, ay = -4 * q, bx = 4 * q, by = 6 * q, rad = Math.sqrt(W * W + H * H) / 2 + q * 4, N = Math.min(34, Math.ceil(rad / (q * 7.2)) + 2);
        var g = awza_kit(b, 'bg wz sayagata', { H: awza_BH(b, 0.9), a: 'e', rotv: Q.rot == null ? 45 : Q.rot }), ux = 0, uy = -1;
        // four arms: out 2, turn, 3 along (the last unit reaches the neighbour's arm)
        for (a = 0; a < 4; a++) { var vx = -uy, vy = ux; arms.push([[cx, cy], [cx + ux * 2 * q, cy + uy * 2 * q], [cx + (ux * 2 + vx * 3) * q, cy + (uy * 2 + vy * 3) * q]]); ux = vx; uy = vy; }
        g.ml(arms, awza_tone(sc, sc.fg, k), q * 0.3, 1, { cap: 3, swE: jzN(q) + '*(0.3+0.07*Math.sin(T*0.7))', rep: [[2 * N + 1, ax, ay, -N], [2 * N + 1, bx, by, -N]],
            X: 'var f=wr(T*' + jzN(0.03 * (Q.dir || 1)) + ',1);', dx: 'f*' + jzN(ax), dy: 'f*' + jzN(ay) });
        g.done();
    }
});

/* 立涌 — rising-steam lines: mirrored wavy verticals whose swellings climb slowly and breathe
   (one pair of lines as createPath expressions + a Repeater; the dots in the swellings ride on the same phase) */
jzReg('bg', 'wzBgTatewaku', {
    plan: function (rng, st) { return { seed: awza_bseed(rng), d: rng.range(0.1, 0.14), k: rng.range(0.09, 0.115), dots: rng.chance(0.65), dir: rng.pick([1, -1]) }; },
    build: function (b, Q) {
        var W = b.W, H = b.H, sc = b.sc, d = jzU(b) * (Q.d || 0.12), k = Q.k || 0.085, kk = AWZA_TAU / (d * 2.8), n = Math.min(60, Math.ceil(W / d) + 2), st = Math.max(8, H / 48), i, y, lines = [], sh = [];
        var XX = 'var am=' + jzN(d * 0.25) + '*(0.82+0.18*Math.sin(T*0.6))*e,ph=T*' + jzN(0.4 * (Q.dir || 1)) + ';';
        for (i = 0; i < 2; i++) {
            var s = i % 2 ? -1 : 1, x0 = (i - 0.5) * d, pts = [];
            for (y = -st; y <= H + st; y += st) pts.push([x0 + s * d * 0.25 * Math.sin(y * kk), y]);
            lines.push(pts);
            sh.push('var p=[];for(var y=' + jzN(-st) + ',n=0;y<=' + jzN(H + st) + '&&n<80;y+=' + jzN(st) + ',n++)p.push([' + jzN(x0) + '+' + jzN(s) + '*am*Math.sin(y*' + jzN(kk) + '+ph),y])');
        }
        var g = awza_bkit(b, 'bg wz tatewaku', 0.9), per = AWZA_TAU / kk, col = awza_tone(sc, sc.fg, k), rx = Math.ceil(n / 2);
        g.ml(lines, col, Math.max(1.5, d * 0.03), 1, { cap: 2, X: XX, shapes: sh, rep: [[rx, 2 * d, 0]] });
        if (Q.dots) {
            // the gap between line i and i+1 is widest where s·sin = -1
            var ry = Math.min(30, Math.ceil((H + 3 * per) / per) + 1), dc = awza_tone(sc, sc.fg, k * 0.7), yA = -Math.PI / 2 / kk - 2 * per, yB = Math.PI / 2 / kk - 2 * per;
            g.sub({ X: XX, dy: 'wr(-ph/' + jzN(kk) + ',' + jzN(per) + ')' });
            g.c(0, yA, d * 0.085, dc, 1, { rE: jzN(d * 0.085) + '*(0.8+0.2*Math.sin(T*0.9))', rep: [[rx + 1, 2 * d, 0], [ry, 0, per]] });
            g.c(d, yB, d * 0.085, dc, 1, { rE: jzN(d * 0.085) + '*(0.8+0.2*Math.sin(T*0.9+1))', rep: [[rx + 1, 2 * d, 0], [ry, 0, per]] });
            g.end();
        }
        g.done();
    }
});

/* 流水紋 — bundles of staggered parallel water lines sliding sideways at different speeds.
   AE: every line is a fixed wavy path across the frame; Trim Paths start / end follow the browser's sliding ends. */
jzReg('bg', 'wzBgRyusui', {
    plan: function (rng, st) { return { seed: awza_bseed(rng), n: rng.int(6, 9), k: rng.range(0.085, 0.11), dir: rng.pick([1, -1]), acc: rng.chance(0.4) }; },
    build: function (b, Q) {
        var W = b.W, H = b.H, sc = b.sc, U = jzU(b), s = Q.seed || 1, n = Q.n || 6, k = Q.k || 0.085, dy = U * 0.02, t0 = b.cut.start || 0, i, j, x, PAD = 20, FULL = W + PAD * 2, DX = Math.max(16, W / 70);
        var g = awza_bkit(b, 'bg wz ryusui', 0.9);
        for (i = 0; i < n; i++) {
            var m = 3 + (awza_h(s, i, 1) % 3), base = H * (i + 0.5) / n + awza_rs(s, i, 2) * H * 0.04 - (m - 1) * dy / 2, lam = U * (0.2 + 0.14 * awza_r01(s, i, 3)), Am = U * (0.02 + 0.02 * awza_r01(s, i, 4));
            var len = W * (0.55 + 0.4 * awza_r01(s, i, 5)), v = W * (0.012 + 0.018 * awza_r01(s, i, 6)) * (Q.dir || 1), span = W + len + U * 0.3;
            var col = awza_tone(sc, Q.acc && i === 1 ? sc.accent : sc.fg, k * (0.7 + 0.5 * awza_r01(s, i, 8))), lw = Math.max(1.5, U * (0.003 + 0.002 * awza_r01(s, i, 9)));
            for (j = 0; j < m; j++) {
                var pts = [];
                for (x = -PAD; x < W + PAD + DX; x += DX) { var xx = Math.min(x, W + PAD); pts.push([xx, base + j * dy + Am * Math.sin(xx / lam + i * 1.7 + t0 * 0.35) + Am * 0.35 * Math.sin(xx / lam * 2.1 - t0 * 0.2)]); }
                var XX = 'var x0=wr(' + jzN(awza_r01(s, i, 7) * span) + '+T*' + jzN(v) + ',' + jzN(span) + ')-' + jzN(len + U * 0.15) + ',xs=x0+' + jzN(len * 0.3 * awza_r01(s, i, j, 10)) + ',xe=x0+' + jzN(len * (1 - 0.3 * awza_r01(s, i, j, 11))) + ',' +
                    'xa=Math.max(xs,' + jzN(-PAD) + '),xz=Math.min(xe*e+xs*(1-e),' + jzN(W + PAD) + '),ok=xz-xa>=10;';
                g.pl(pts, col, lw, 1, { cap: 2, X: XX, trim0: '(xa+' + jzN(PAD) + ')/' + jzN(FULL), trim: '(ok?xz+' + jzN(PAD) + ':xa+' + jzN(PAD) + ')/' + jzN(FULL), a: 'ok?1:0' });
            }
        }
        g.done();
    }
});

/* 雪輪散らし — scattered snow-ring crests, some filled and some outlined, sinking and turning very slowly */
jzReg('bg', 'wzBgYukiwa', {
    plan: function (rng, st) { return { seed: awza_bseed(rng), n: rng.int(10, 14), k: rng.range(0.065, 0.085), acc: rng.chance(0.5) }; },
    build: function (b, Q) {
        var W = b.W, H = b.H, sc = b.sc, U = jzU(b), s = Q.seed || 1, n = Math.min(16, Q.n || 10), k = Q.k || 0.07, lw = Math.max(1.5, U * 0.0042), i, j;
        var g = awza_bkit(b, 'bg wz yukiwa', 0.9);
        for (i = 0; i < n; i++) {
            var R = U * (0.06 + 0.12 * awza_r01(s, i, 1) * awza_r01(s, i, 2)), span = H + R * 2.4, col = Q.acc && i % 4 === 1 ? sc.accent : sc.fg, ring = awza_yukiwa(R), sp = [];
            g.sub({ dx: 'wr(' + jzN(W * ((i + 0.5) / n + 0.3 * awza_rs(s, i, 3))) + '+Math.sin(T*0.25+' + jzN(i * 1.9) + ')*' + jzN(U * 0.02) + ',' + jzN(W + R * 2) + ')-' + jzN(R),
                dy: 'wr(' + jzN(awza_r01(s, i, 4) * span) + '+T*' + jzN(U * (0.006 + 0.01 * awza_r01(s, i, 5))) + ',' + jzN(span) + ')-' + jzN(R * 1.2),
                s: '0.8+0.2*oc(cl(BT/0.8-' + jzN(i * 0.03) + '))', rotv: i * AWZA_R2D, rot: jzN((i % 2 ? -1 : 1) * 0.06 * AWZA_R2D) + '*T' });
            if (i % 3 === 0) g.p(ring, awza_tone(sc, col, k * 0.8)); else g.ps(ring, awza_tone(sc, col, k * 1.5), lw);
            if (R > U * 0.085) {
                for (j = 0; j < 6; j++) { var an = j / 6 * AWZA_TAU; sp.push([[Math.cos(an) * R * 0.18, Math.sin(an) * R * 0.18], [Math.cos(an) * R * 0.6, Math.sin(an) * R * 0.6]]); }
                g.ml(sp, awza_tone(sc, col, k * 1.4), lw);
            }
            g.end();
        }
        g.done();
    }
});

/* 矢絣 — columns of arrow-feather chevrons; neighbouring columns slide up and down against each other
   (per direction: one chevron pair + two Repeaters) */
jzReg('bg', 'wzBgYagasuri', {
    plan: function (rng, st) { return { seed: awza_bseed(rng), d: rng.range(0.085, 0.12), k: rng.range(0.045, 0.06), spd: rng.range(0.008, 0.016), acc: rng.chance(0.35) }; },
    build: function (b, Q) {
        var W = b.W, H = b.H, sc = b.sc, U = jzU(b), d = U * (Q.d || 0.1), k = Q.k || 0.05, ph = d * 0.85, nc = Math.min(40, Math.ceil(W / d) + 1), x00 = (W - nc * d) / 2, pass;
        var g = awza_bkit(b, 'bg wz yagasuri', 0.8), ry = Math.min(60, Math.ceil((H + ph * 6) / (ph * 2)) + 1);
        for (pass = 0; pass < 2; pass++) {
            var dir = pass ? -1 : 1, x0 = x00 + pass * d, xc = x0 + d / 2, sl = dir * d * 0.5, y = -ph * 4, cnt = Math.ceil((nc - pass) / 2);
            if (cnt < 1) continue;
            g.sub({ dy: 'wr(T*' + jzN(dir * U * (Q.spd || 0.012)) + ',' + jzN(ph * 2) + ')+(1-e)*' + jzN(dir * ph) });
            g.mp([[[x0 + 1, y], [xc - 1, y + sl], [xc - 1, y + sl + ph], [x0 + 1, y + ph]], [[x0 + d - 1, y], [xc + 1, y + sl], [xc + 1, y + sl + ph], [x0 + d - 1, y + ph]]],
                awza_tone(sc, pass && Q.acc ? sc.accent : sc.fg, pass ? k * 0.9 : k), 1, { rep: [[cnt, 2 * d, 0], [ry, 0, ph * 2]] });
            g.end();
        }
        g.done();
    }
});
