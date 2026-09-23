// ================================================================ background graphics part 1 (AE port of the bg entries in src/11p_looks.js)
// bg.build(b, P): b.comp is the cut's WRAPPER comp (full frame, time 0 = cut start, duration = cut + 1 s). Layers you add
// sit above the scheme colour / paper and below the lyric. Keep contrast low; animate with expressions on `time`.

/* ---- sunburst — 放射: rotating rays, soft disc of the background colour in the middle */
jzReg('bg', 'sunburst', {
    plan: function (rng, st) { return { seed: rng.int(1, 999999999), n: rng.pick([12, 16, 20, 24]), cx: rng.pick([0.5, 0.5, 0.3, 0.7]), cy: rng.pick([0.5, 0.5, 0.62, 1.05]), spd: rng.range(3, 7) * rng.pick([1, -1]), k: rng.range(0.07, 0.1) }; },
    build: function (b, P) {
        var W = b.W, H = b.H, sc = b.sc, cx = W * (P.cx == null ? 0.5 : P.cx), cy = H * (P.cy == null ? 0.5 : P.cy), n = P.n || 16;
        var R = Math.sqrt(W * W + H * H) * 1.1, w = Math.PI * 2 / n * 0.5, i;
        var S = jzShapeLayer(b, 'bg sunburst', cx, cy), g = jzGrp(S, 'rays');
        for (i = 0; i < n; i++) { var a0 = i / n * Math.PI * 2; jzAddPath(g, [[0, 0], [Math.cos(a0) * R, Math.sin(a0) * R], [Math.cos(a0 + w) * R, Math.sin(a0 + w) * R]], true); }
        jzAddFill(g, jzLayC(sc, P.k || 0.08));
        // grow in over 0.5 s, keep turning
        jzSetExpr(jzXf(S, 'ADBE Scale'), JZ_FNS + 'var e=oc(time/0.5);var s=25+75*e;[s,s]');
        jzSetExpr(jzXf(S, 'ADBE Rotate Z'), JZ_FNS + 'time*' + jzN(P.spd || 4) + '+(1-oc(time/0.5))*25');
        // soft disc in the background colour over the centre
        var r = jzU(b) * 0.55, D = b.comp.layers.addSolid(jzHex(sc.bg), 'bg sunburst centre', W, H, 1, b.comp.duration);
        var m = D.property('ADBE Mask Parade').addProperty('ADBE Mask Atom');
        m.property('ADBE Mask Shape').setValue(jzCircleShape(cx, cy, r * 0.6)); m.property('ADBE Mask Feather').setValue([r * 0.8, r * 0.8]);
        jzXf(D, 'ADBE Opacity').setValue(85);
    }
});

// ================================================================ shared helpers of this pack (prefix bg1_)
// the browser's deterministic hash J.h / J.r (so random placements match the web frame exactly)
function bg1_h(a, b, c, d, e) {
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
function bg1_r(a, b, c, d, e) { return bg1_h(a, b, c, d, e) / 4294967296; }
function bg1_rs(a, b, c, d, e) { return bg1_r(a, b, c, d, e) * 2 - 1; }
function bg1_rr(lo, hi, a, b, c, d, e) { return lo + (hi - lo) * bg1_r(a, b, c, d, e); }
// seconds this background had already been running at the cut start (browser bgT: consecutive cuts with the same bg + seed are one run)
function bg1_run(b) {
    var c = b.cut, cs = (b.plan && b.plan.cuts) || [], s = c.start || 0, P0 = c.bgP || {}, idx = -1, i;
    for (i = 0; i < cs.length; i++) if (cs[i] === c) { idx = i; break; }
    for (i = idx - 1; i >= 0; i--) {
        var p = cs[i];
        if (p.bg === c.bg && (p.bgP || {}).seed === P0.seed && Math.abs(p.end - s) < 0.06) s = p.start; else break;
    }
    return (c.start || 0) - s;
}
// expression header: T = absolute song time (browser env.t), BT = time since this background started (browser bgT)
var BG1_FNS = 'function cl(x){return Math.max(0,Math.min(1,x));}function oc(x){x=cl(x);return 1-Math.pow(1-x,3);}function oe(x){x=cl(x);return x>=1?1:1-Math.pow(2,-10*x);}function wr(v,m){return ((v%m)+m)%m;}';
function bg1_hd(b) { return BG1_FNS + 'var T=time+' + jzN(b.cut.start || 0) + ',BT=time+' + jzN(bg1_run(b)) + ';\n'; }
function bg1_px(b) { return jzU(b) / 1080; }                        // one browser design px in comp px
function bg1_dark(sc) { return jzLum(sc.bg) < 0.45; }
// colour mix a -> b by the expression q, as an expression colour [r,g,b,1]
function bg1_mixX(a, b, q) {
    var A = jzHex(a), B = jzHex(b), o = [], i;
    for (i = 0; i < 3; i++) o.push(jzN(A[i]) + '+' + jzN(B[i] - A[i]) + '*(' + q + ')');
    return '[' + o.join(',') + ',1]';
}
function bg1_solid(b, hex, name, w, h) { return b.comp.layers.addSolid(jzHex(hex), name, Math.max(4, Math.round(w)), Math.max(4, Math.round(h)), 1, b.comp.duration); }
// rectangle mask in layer space; o: { f: [fx, fy] feather, mode: MaskMode.*, inv: true }
function bg1_mask(L, x0, y0, x1, y1, o) {
    o = o || {};
    var m = L.property('ADBE Mask Parade').addProperty('ADBE Mask Atom'), sh = new Shape();
    sh.vertices = [[x1, y0], [x1, y1], [x0, y1], [x0, y0]]; sh.closed = true;
    m.property('ADBE Mask Shape').setValue(sh);
    if (o.f) m.property('ADBE Mask Feather').setValue(o.f);
    if (o.mode) m.maskMode = o.mode;
    if (o.inv) m.inverted = true;
    return m;
}
function bg1_cmask(L, cx, cy, r, o) {
    o = o || {};
    var m = L.property('ADBE Mask Parade').addProperty('ADBE Mask Atom');
    m.property('ADBE Mask Shape').setValue(jzCircleShape(cx, cy, r));
    if (o.f) m.property('ADBE Mask Feather').setValue(o.f);
    if (o.inv) m.inverted = true;
    return m;
}
// shape Repeater (copies n, offset off, step [dx, dy]) at the end of group g
function bg1_rep(g, n, dx, dy, off) {
    var V = jzVecs(g), ix = V.addProperty('ADBE Vector Filter - Repeater').propertyIndex;
    V.property(ix).property('ADBE Vector Repeater Copies').setValue(n);
    if (off) V.property(ix).property('ADBE Vector Repeater Offset').setValue(off);
    V.property(ix).property('ADBE Vector Repeater Transform').property('ADBE Vector Repeater Position').setValue([dx, dy]);
    return V.property(ix);
}
function bg1_seed(rng) { return rng.int(1, 999999999); }
function bg1_sub(g, name) { var c = jzVecs(g).addProperty('ADBE Vector Group'); if (name) c.name = name; return c; }   // group inside a group

/* ---- concentric — 同心円: rings drifting outwards from the centre, pulsing line width / tone */
jzReg('bg', 'concentric', {
    plan: function (rng, st) { return { seed: bg1_seed(rng), gap: rng.range(0.07, 0.11), spd: rng.range(0.15, 0.35) * rng.pick([1, 1, -1]), k: rng.range(0.08, 0.12), cy: rng.pick([0.5, 0.5, 0.58]) }; },
    build: function (b, P) {
        var W = b.W, H = b.H, sc = b.sc, gap = jzU(b) * (P.gap || 0.09), k = P.k || 0.1, i;
        var Rm = Math.sqrt(W * W + H * H) * 0.6, n = Math.ceil(Rm / gap) + 1;
        var S = jzShapeLayer(b, 'bg concentric', W / 2, H * (P.cy || 0.5)), g = jzGrp(S, 'rings');
        var hd = bg1_hd(b) + 'var G=' + jzN(gap) + ',ph=wr(T*' + jzN(P.spd || 0.2) + ',1),Rm=' + jzN(Rm) + '*oc(BT/0.6),pu=0.5+0.5*Math.sin(T*Math.PI);\n';
        for (i = 0; i < n; i++) {   // ring i sits at (phase + i) * gap; rings outside the growing radius collapse to nothing
            var el = jzAddEllipse(g, 10, 10);
            jzSetExpr(el.property('ADBE Vector Ellipse Size'), hd + 'var r=(ph+' + i + ')*G;(r<2||r>=Rm)?[0,0]:[2*r,2*r]');
        }
        var st = jzAddStroke(g, jzLayC(sc, k), gap * 0.19);
        jzSetExpr(st.property('ADBE Vector Stroke Width'), hd + 'G*(0.14+0.1*pu)');
        jzSetExpr(st.property('ADBE Vector Stroke Color'), hd + bg1_mixX(sc.bg, sc.fg, jzN(k) + '*(0.8+0.4*pu)'));
    }
});

/* ---- halftoneFade — 網点グラデ: hex dot screen whose dots grow along a direction (the lattice is turned with the direction), slow drift */
jzReg('bg', 'halftoneFade', {
    plan: function (rng, st) { return { seed: bg1_seed(rng), dir: rng.pick([0, 45, 90, 135, 180, 225, 270, 315]), cell: rng.range(0.032, 0.045), k: rng.range(0.12, 0.17) }; },
    build: function (b, P) {
        var W = b.W, H = b.H, cell = jzU(b) * (P.cell || 0.032), rh = cell * 0.866, i, h;
        var ang = (P.dir || 0) * Math.PI / 180, dx = Math.cos(ang), dy = Math.sin(ang);
        var ext = Math.abs(dx) * W / 2 + Math.abs(dy) * H / 2, ext2 = Math.abs(dy) * W / 2 + Math.abs(dx) * H / 2;
        var S = jzShapeLayer(b, 'bg halftoneFade', W / 2, H / 2);
        jzXf(S, 'ADBE Rotate Z').setValue(P.dir || 0);
        var g = jzGrp(S, 'dots'), n0 = Math.ceil((ext + cell) / cell);
        // one dot per column (even row + odd row), the column is repeated downwards; size = smoothstep along the gradient axis
        for (i = -n0; i <= n0; i++) for (h = 0; h < 2; h++) {
            var x = i * cell + h * cell / 2, t = jzClamp((x / ext + 0.8) / 1.8, 0, 1), r = cell * 0.52 * t * t * (3 - 2 * t);
            if (r < cell * 0.06) continue;
            jzAddEllipse(g, r * 2, r * 2, x, h * rh);
        }
        jzAddFill(g, jzLayC(b.sc, P.k || 0.14));
        var ny = Math.ceil((ext2 + 2 * rh) / (2 * rh)) * 2 + 2;
        bg1_rep(g, ny, 0, 2 * rh, -ny / 2);
        jzSetExpr(jzGX(g).property('ADBE Vector Position'), bg1_hd(b) + '[0,wr(T*' + jzN(cell * 0.35) + ',' + jzN(2 * rh) + ')]');
        jzSetExpr(jzXf(S, 'ADBE Opacity'), bg1_hd(b) + '100*oc(BT/0.5)');
    }
});

/* ---- bigStripes — 大きな斜線: wide diagonal stripes sliding sideways, stripes widen in */
jzReg('bg', 'bigStripes', {
    plan: function (rng, st) { return { seed: bg1_seed(rng), ang: rng.pick([30, 45, -30, -45, 60]), w: rng.range(0.06, 0.11), spd: rng.range(0.03, 0.08) * rng.pick([1, -1]), fill: rng.pick([0.5, 0.5, 0.3]), k: rng.range(0.05, 0.08) }; },
    build: function (b, P) {
        var W = b.W, H = b.H, U = jzU(b), R = Math.sqrt(W * W + H * H) / 2 + 10 * bg1_px(b), per = U * (P.w || 0.08) * 2, fw = per * (P.fill || 0.5);
        var S = jzShapeLayer(b, 'bg bigStripes', W / 2, H / 2);
        jzXf(S, 'ADBE Rotate Z').setValue(P.ang || 45);
        var g = jzGrp(S, 'stripes'), rc = jzAddRect(g, fw, 2 * R);
        var hd = bg1_hd(b) + 'var w=' + jzN(fw) + '*oe(BT/0.5);';
        jzSetExpr(rc.property('ADBE Vector Rect Size'), hd + '[w,' + jzN(2 * R) + ']');
        jzSetExpr(rc.property('ADBE Vector Rect Position'), hd + '[w/2,0]');
        jzAddFill(g, jzLayC(b.sc, P.k || 0.06));
        bg1_rep(g, Math.ceil(2 * R / per) + 3, per, 0, 0);
        jzSetExpr(jzGX(g).property('ADBE Vector Position'), bg1_hd(b) + '[' + jzN(-R - per) + '+wr(T*' + jzN(U * (P.spd || 0.05)) + ',' + jzN(per) + '),0]');
    }
});

/* ---- splitV / splitH / splitDiag — 二色: a flat second tone slides in from one side, its edge sways; thin accent line on the edge */
function bg1_splitCol(sc, P) { return P.c === 'tint' ? jzTintC(sc, (P.k || 0.08) * 1.8) : jzLayC(sc, P.k || 0.08); }
function bg1_split(b, P, vert) {
    var W = b.W, H = b.H, px = bg1_px(b), far = (P.side || 1) > 0, L = vert ? W : H, M = vert ? H : W;
    var hd = bg1_hd(b) + 'var e=oe(BT/0.5),x=' + jzN(L) + '*(' + jzN(P.pos || 0.5) + '+0.012*Math.sin(T*' + (vert ? '0.6' : '0.5') + ')),ed=' + (far ? jzN(L) + '+(x-' + jzN(L) + ')*e' : 'x*e') + ';';
    var xy = function (a, c) { return vert ? '[' + a + ',' + c + ']' : '[' + c + ',' + a + ']'; };
    var S = jzShapeLayer(b, 'bg ' + (vert ? 'splitV' : 'splitH'), 0, 0);
    var g2 = jzGrp(S, 'edge'), r2 = jzAddRect(g2, vert ? 2 * px : M, vert ? M : 2 * px);
    jzSetExpr(r2.property('ADBE Vector Rect Position'), hd + xy('ed', jzN(M / 2)));
    jzAddFill(g2, jzTintC(b.sc, 0.45), 60);
    jzSetExpr(jzGX(g2).property('ADBE Vector Group Opacity'), hd + '100*e');
    var g = jzGrp(S, 'panel'), rc = jzAddRect(g, vert ? L + 2 * px : M + 2 * px, vert ? M + 2 * px : L + 2 * px);
    jzSetExpr(rc.property('ADBE Vector Rect Position'), hd + xy('ed' + (far ? '+' : '-') + jzN(L / 2 + px), jzN(M / 2)));
    jzAddFill(g, bg1_splitCol(b.sc, P));
}
jzReg('bg', 'splitV', {
    plan: function (rng, st) { return { seed: bg1_seed(rng), side: rng.pick([1, -1]), pos: rng.range(0.4, 0.6), c: rng.pick(['lay', 'lay', 'tint']), k: rng.range(0.08, 0.12) }; },
    build: function (b, P) { bg1_split(b, P, true); }
});
jzReg('bg', 'splitH', {
    plan: function (rng, st) { return { seed: bg1_seed(rng), side: rng.pick([1, -1]), pos: rng.range(0.42, 0.6), c: rng.pick(['lay', 'lay', 'tint']), k: rng.range(0.08, 0.12) }; },
    build: function (b, P) { bg1_split(b, P, false); }
});
jzReg('bg', 'splitDiag', {
    plan: function (rng, st) { return { seed: bg1_seed(rng), side: rng.pick([1, -1]), pos: rng.range(0.42, 0.58), ang: rng.range(14, 30) * rng.pick([1, -1]), c: rng.pick(['lay', 'lay', 'tint']), k: rng.range(0.08, 0.12) }; },
    build: function (b, P) {
        var W = b.W, H = b.H, px = bg1_px(b), side = (P.side || 1) > 0 ? 1 : -1, tn = Math.tan((P.ang || 20) * Math.PI / 180), far = side * W * 2.2;
        var hd = bg1_hd(b) + 'var e=oe(BT/0.5),cx=' + jzN(W * (P.pos || 0.5)) + '+(1-e)*' + jzN(W * 0.9 * side) + '+' + jzN(W * 0.01) + '*Math.sin(T*0.5);';
        var S = jzShapeLayer(b, 'bg splitDiag', 0, 0);
        var g2 = jzGrp(S, 'edge');
        jzAddPath(g2, [[-tn * H / 2, -px], [tn * H / 2, H + px]], false);
        jzAddStroke(g2, jzTintC(b.sc, 0.45), 2 * px, 60);
        jzSetExpr(jzGX(g2).property('ADBE Vector Position'), hd + '[cx,0]');
        jzSetExpr(jzGX(g2).property('ADBE Vector Group Opacity'), hd + '100*e');
        var g = jzGrp(S, 'panel');
        jzAddPath(g, [[-tn * H / 2, -px], [far, -px], [far, H + px], [tn * H / 2, H + px]], true);
        jzAddFill(g, bg1_splitCol(b.sc, P));
        jzSetExpr(jzGX(g).property('ADBE Vector Position'), hd + '[cx,0]');
    }
});

/* ---- gradientSweep — グラデ: a broad band of accent tint (linear 0 -> 1 -> 0 across the frame) that turns slowly and sways.
   AE: a big rotated solid; two feathered half-plane masks (expansion + feather follow the peak) give the linear ramps */
jzReg('bg', 'gradientSweep', {
    plan: function (rng, st) { return { seed: bg1_seed(rng), spd: rng.range(0.25, 0.5), k: rng.range(0.16, 0.26), c: rng.pick(['accent', 'accent', 'accent2', 'fg']), a0: rng.range(0, 6.28) }; },
    build: function (b, P) {
        // the solid is twice the frame diagonal so the masks' feather never reaches the layer edges inside the frame
        var W = b.W, H = b.H, sc = b.sc, L = Math.sqrt(W * W + H * H) / 2, D = Math.ceil(L * 4) + 8, F = D * 3;
        var tint = jzMixHex(sc.bg, sc[P.c] || sc.accent, P.k || 0.2);
        var S = bg1_solid(b, tint, 'bg gradientSweep', D, D);
        var hd = bg1_hd(b) + 'var L=' + jzN(L) + ',xp=L*(2*(0.5+0.32*Math.sin(T*' + jzN(P.spd || 0.35) + '))-1);';
        // rising side: from -L (0) to the peak (1)
        var m1 = bg1_mask(S, D / 2, -F, F, F);
        jzSetExpr(m1.property('ADBE Mask Offset'), hd + '(L-xp)/2');
        jzSetExpr(m1.property('ADBE Mask Feather'), hd + '[Math.max(0,xp+L),0]');
        var m2 = bg1_mask(S, -F, -F, D / 2, F, { mode: MaskMode.INTERSECT });
        jzSetExpr(m2.property('ADBE Mask Offset'), hd + '(xp+L)/2');
        jzSetExpr(m2.property('ADBE Mask Feather'), hd + '[Math.max(0,L-xp),0]');
        jzSetExpr(jzXf(S, 'ADBE Rotate Z'), bg1_hd(b) + '(' + jzN(P.a0 || 0) + '+T*0.12)*180/Math.PI');
        jzSetExpr(jzXf(S, 'ADBE Opacity'), bg1_hd(b) + '100*oc(BT/0.6)');
    }
});

/* ---- spotlight — スポットライト: a wandering soft pool of light, darker surroundings, optional beam from the top */
jzReg('bg', 'spotlight', {
    plan: function (rng, st) { return { seed: bg1_seed(rng), beam: rng.chance(0.6), k: rng.range(0.1, 0.16) }; },
    build: function (b, P) {
        var W = b.W, H = b.H, sc = b.sc, s = P.seed || 1, U = jzU(b), R = U * 0.62, dk = bg1_dark(sc), px = bg1_px(b);
        var lc = dk ? sc.fg : '#FFFFFF', k = P.k || 0.12;
        var hd = bg1_hd(b) + 'var e=oc(BT/0.6),cx=' + jzN(W) + '*(0.5+0.2*Math.sin(T*0.31+' + (s % 7) + ')),cy=' + jzN(H) + '*(0.52+0.08*Math.sin(T*0.23+' + (s % 5) + '));';
        // darker surroundings: black with a soft hole (transparent inside 0.3R, full outside 1.7R)
        var V = bg1_solid(b, '#000000', 'bg spotlight shade', W * 2 + 4 * R, H * 2 + 4 * R), vw = W + 2 * R, vh = H + 2 * R;
        bg1_cmask(V, vw, vh, R, { f: [R * 1.4, R * 1.4], inv: true });
        jzSetExpr(jzXf(V, 'ADBE Position'), hd + '[cx,cy]');
        jzSetExpr(jzXf(V, 'ADBE Opacity'), hd + jzN(dk ? 35 : 14) + '*e');
        // the pool of light
        var G = bg1_solid(b, lc, 'bg spotlight light', R * 2.4, R * 2.4);
        bg1_cmask(G, R * 1.2, R * 1.2, R * 0.6, { f: [R * 0.8, R * 0.8] });
        jzSetExpr(jzXf(G, 'ADBE Position'), hd + '[cx,cy]');
        jzSetExpr(jzXf(G, 'ADBE Opacity'), hd + jzN(k * 100) + '*e');
        if (P.beam) {   // trapezoid from the top edge to the pool, fading out downwards (a feathered mask follows the pool's height)
            var Hb = 1000, S = jzShapeLayer(b, 'bg spotlight beam', 0, 0), g = jzGrp(S, 'beam');
            jzAddPath(g, [[-U * 0.04, 0], [U * 0.04, 0], [R * 0.75, Hb], [-R * 0.75, Hb]], true);
            jzAddFill(g, lc);
            var hb = hd + 'var tx=cx+(' + jzN(W / 2) + '-cx)*0.5,dx=cx-tx,dy=cy+' + jzN(2 * px) + ';';
            jzSetExpr(jzGX(g).property('ADBE Vector Position'), hb + '[tx,' + jzN(-2 * px) + ']');
            jzSetExpr(jzGX(g).property('ADBE Vector Rotation'), hb + 'Math.atan2(-dx,dy)*180/Math.PI');
            jzSetExpr(jzGX(g).property('ADBE Vector Scale'), hb + '[100,Math.sqrt(dx*dx+dy*dy)/' + Hb + '*100]');
            var m = bg1_mask(S, -W, -H * 3, W * 2, 0);
            jzSetExpr(m.property('ADBE Mask Offset'), hd + 'cy/2');
            jzSetExpr(m.property('ADBE Mask Feather'), hd + '[0,Math.max(1,cy)]');
            jzSetExpr(jzXf(S, 'ADBE Opacity'), hd + jzN(k * 70) + '*e');
        }
    }
});

/* ---- tvBars — テレビの帯: a few horizontal bars of different heights rolling down the frame (same bars as the browser) */
jzReg('bg', 'tvBars', {
    plan: function (rng, st) { return { seed: bg1_seed(rng), n: rng.int(4, 7), spd: rng.range(0.05, 0.14), k: rng.range(0.06, 0.09) }; },
    build: function (b, P) {
        var W = b.W, H = b.H, sc = b.sc, s = P.seed || 1, k = P.k || 0.07, n = P.n || 5, px = bg1_px(b), i;
        var S = jzShapeLayer(b, 'bg tvBars', 0, 0);
        for (i = n - 1; i >= 0; i--) {    // later bars on top (first shape group = front)
            var h = H * bg1_rr(0.02, 0.15, s, i, 1), v = H * (P.spd || 0.08) * (0.5 + bg1_r(s, i, 2)), y0 = bg1_r(s, i, 3) * H * 1.4;
            var g = jzGrp(S, 'bar ' + (i + 1));
            if (bg1_r(s, i, 5) < 0.5) {
                var lh = Math.max(1.5 * px, H * 0.002), gl = bg1_sub(g, 'line');
                jzAddRect(gl, W, lh, 0, W / 2, -H * 0.012 + lh / 2); jzAddFill(gl, jzLayC(sc, k * 1.4));
            }
            var gb = bg1_sub(g, 'band');
            jzAddRect(gb, W, h, 0, W / 2, h / 2);
            jzAddFill(gb, i % 3 === 0 ? jzTintC(sc, k * 1.7) : jzLayC(sc, k * (0.6 + 0.8 * bg1_r(s, i, 4))));
            jzSetExpr(jzGX(g).property('ADBE Vector Position'), bg1_hd(b) + '[0,wr(T*' + jzN(v) + '+' + jzN(y0) + ',' + jzN(H * 1.4) + ')-' + jzN(H * 0.2) + ']');
        }
    }
});

/* ---- checker — 市松: large faint checkerboard (optionally at 45°) sliding diagonally */
jzReg('bg', 'checker', {
    plan: function (rng, st) { return { seed: bg1_seed(rng), n: rng.int(5, 8), k: rng.range(0.04, 0.065), spd: rng.range(0.1, 0.25), rot: rng.pick([0, 0, 45]) }; },
    build: function (b, P) {
        var W = b.W, H = b.H, cell = jzU(b) / (P.n || 6) * (P.rot ? 1.2 : 1), R = Math.sqrt(W * W + H * H) / 2 + cell * 2;
        var S = jzShapeLayer(b, 'bg checker', W / 2, H / 2);
        if (P.rot) jzXf(S, 'ADBE Rotate Z').setValue(P.rot);
        var g = jzGrp(S, 'checks');
        jzAddRect(g, cell, cell, 0, cell / 2, -cell / 2);      // 2x2 tile: the two odd squares
        jzAddRect(g, cell, cell, 0, -cell / 2, cell / 2);
        jzAddFill(g, jzLayC(b.sc, P.k || 0.05));
        var c = Math.ceil(R / (2 * cell)) * 2 + 4;
        bg1_rep(g, c, 2 * cell, 0, -c / 2);
        bg1_rep(g, c, 0, 2 * cell, -c / 2);
        jzSetExpr(jzGX(g).property('ADBE Vector Position'), bg1_hd(b) + 'var o=wr(T*' + jzN(cell * (P.spd || 0.15)) + ',' + jzN(2 * cell) + ');[o,o]');
        jzSetExpr(jzXf(S, 'ADBE Opacity'), bg1_hd(b) + '100*oc(BT/0.4)');
    }
});

/* ---- bigChar — 巨大文字: the line's first character, huge and faint, off to one side, breathing slowly */
jzReg('bg', 'bigChar', {
    plan: function (rng, st) { return { seed: bg1_seed(rng), side: rng.pick([-1, 1]), font: rng.pick(['display', 'serif']), outline: rng.chance(0.3), k: rng.range(0.07, 0.1) }; },
    build: function (b, P) {
        var W = b.W, H = b.H, sc = b.sc, k = P.k || 0.08, side = P.side || 1, i;
        var cs = jzChars(String(b.cut.lineText || b.cut.text || '').replace(/[\s　]+/g, '')), ch = null;
        for (i = 0; i < cs.length; i++) if (!jzIsPunct(cs[i])) { ch = cs[i]; break; }
        if (!ch) ch = cs[0];
        if (!ch) return;
        var size = Math.max(W, H) * 0.6, o = { font: jzFontsOf(b.st, [P.font || 'display'])[0], size: size, color: jzLayC(sc, k), x: W / 2 + side * W * 0.2, y: H * 0.53, rot: side * 4, name: 'bg bigChar' };
        if (P.outline) { o.fill = false; o.stroke = Math.max(2 * bg1_px(b), size * 0.006); o.strokeColor = jzLayC(sc, k * 2.4); }
        var L = jzText({ comp: b.comp, roles: null, W: W, H: H }, ch, o);
        jzSetExpr(jzXf(L, 'ADBE Scale'), bg1_hd(b) + 'var f=1.06-0.06*oc(BT/0.7)+0.015*Math.sin(T*0.3);[value[0]*f,value[1]*f]');
        jzSetExpr(jzXf(L, 'ADBE Position'), bg1_hd(b) + '[value[0]+Math.sin(T*0.2)*' + jzN(W * 0.01) + ',value[1]]');
        jzSetExpr(jzXf(L, 'ADBE Opacity'), bg1_hd(b) + '100*oc(BT/0.7)');
    }
});

/* ---- speedLines — 集中線: manga focus lines around a clear ellipse, re-drawn every frame step (3 random sets cycle) */
jzReg('bg', 'speedLines', {
    plan: function (rng, st) { return { seed: bg1_seed(rng), n: rng.int(90, 140), k: rng.range(0.2, 0.28), clear: rng.range(0.3, 0.36) }; },
    build: function (b, P) {
        var W = b.W, H = b.H, s = P.seed || 1, n = P.n || 100, K = 3, TAU = Math.PI * 2, j, i;
        var rx = W * (P.clear || 0.38), ry = H * (P.clear || 0.38) * 1.05, R = Math.sqrt(W * W + H * H) * 0.6;
        var S = jzShapeLayer(b, 'bg speedLines', W / 2, H / 2);
        for (j = 0; j < K; j++) {
            var g = jzGrp(S, 'lines ' + (j + 1));
            for (i = 0; i < n; i++) {
                var a = (i + bg1_r(s, i, j, 1) * 0.8) / n * TAU, f = 1 + bg1_r(s, i, j, 2) * 0.5, w = TAU / n * (0.15 + 0.45 * bg1_r(s, i, j, 3));
                jzAddPath(g, [[Math.cos(a) * rx * f, Math.sin(a) * ry * f], [Math.cos(a - w / 2) * R, Math.sin(a - w / 2) * R], [Math.cos(a + w / 2) * R, Math.sin(a + w / 2) * R]], true);
            }
            jzAddFill(g, jzLayC(b.sc, P.k || 0.16));
            jzSetExpr(jzGX(g).property('ADBE Vector Group Opacity'), bg1_hd(b) + 'Math.floor(T*12+1e-6)%' + K + '===' + j + '?100:0');
        }
        // the clear area opens from 1.6x to 1x over 0.3 s (the lines' outer ends stay off-frame)
        jzSetExpr(jzXf(S, 'ADBE Scale'), bg1_hd(b) + 'var f=100*(1+(1-oc(BT/0.3))*0.6);[f,f]');
    }
});

/* ---- scanBars — 走査線の帯: 2-3 tall soft bands (vertical gradient up to a bright scan line) rolling down slowly */
jzReg('bg', 'scanBars', {
    plan: function (rng, st) { return { seed: bg1_seed(rng), n: rng.int(2, 3), spd: rng.range(0.06, 0.12), k: rng.range(0.05, 0.08) }; },
    build: function (b, P) {
        var W = b.W, H = b.H, sc = b.sc, s = P.seed || 1, k = P.k || 0.06, px = bg1_px(b), F = H * 4, i;
        for (i = 0; i < (P.n || 2); i++) {
            var h = H * (0.12 + 0.12 * bg1_r(s, i, 1)), v = H * (P.spd || 0.08) * (0.8 + 0.4 * bg1_r(s, i, 2)), y0 = bg1_r(s, i, 3) * H * 1.5, lh = Math.max(1.5 * px, H * 0.0018);
            var S = jzShapeLayer(b, 'bg scanBars ' + (i + 1), 0, 0);
            var gl = jzGrp(S, 'scan line'); jzAddRect(gl, W, lh, 0, W / 2, h * 0.86 + lh / 2); jzAddFill(gl, sc.fg);
            var gb = jzGrp(S, 'band'); jzAddRect(gb, W, h, 0, W / 2, h / 2); jzAddFill(gb, sc.fg, 62.5);
            // alpha 0 at the top -> 1 at 0.85 h -> 0 at the bottom (two feathered half-plane masks)
            bg1_mask(S, -W, h * 0.425, W * 2, F, { f: [0, h * 0.85] });
            bg1_mask(S, -W, -F, W * 2, h * 0.925, { f: [0, h * 0.15], mode: MaskMode.INTERSECT });
            jzXf(S, 'ADBE Opacity').setValue(Math.min(100, k * 160));
            jzSetExpr(jzXf(S, 'ADBE Position'), bg1_hd(b) + '[0,wr(T*' + jzN(v) + '+' + jzN(y0) + ',' + jzN(H * 1.5) + ')-' + jzN(H * 0.3) + ']');
        }
    }
});

/* ---- dotGrid — ドット格子: fine dot lattice drifting diagonally (optional plus marks every 4th point), a few accent dots twinkle */
jzReg('bg', 'dotGrid', {
    plan: function (rng, st) { return { seed: bg1_seed(rng), sp: rng.range(0.045, 0.065), k: rng.range(0.22, 0.3), plus: rng.chance(0.4) }; },
    build: function (b, P) {
        var W = b.W, H = b.H, sc = b.sc, U = jzU(b), sp = U * (P.sp || 0.055), r = Math.max(1.5 * bg1_px(b), U * 0.0036), i, j;
        var per = P.plus ? sp * 4 : sp, S = jzShapeLayer(b, 'bg dotGrid', 0, 0), g = jzGrp(S, 'lattice');
        if (P.plus) {       // 4x4 tile: a plus at the tile origin, dots elsewhere
            jzAddRect(g, r * 6, r, 0, 0, 0); jzAddRect(g, r, r * 6, 0, 0, 0);
            for (j = 0; j < 4; j++) for (i = 0; i < 4; i++) if (i || j) jzAddEllipse(g, r * 2, r * 2, i * sp, j * sp);
        } else jzAddEllipse(g, r * 2, r * 2);
        jzAddFill(g, jzLayC(sc, P.k || 0.2));
        var nx = Math.ceil((W + 2 * per) / per) + 1, ny = Math.ceil((H + 2 * per) / per) + 1;
        bg1_rep(g, nx, per, 0, 0);
        bg1_rep(g, ny, 0, per, 0);
        jzSetExpr(jzGX(g).property('ADBE Vector Position'), bg1_hd(b) + '[wr(T*' + jzN(0.15 * sp) + ',' + jzN(per) + ')-' + jzN(per) + ',wr(T*' + jzN(0.08 * sp) + ',' + jzN(per) + ')-' + jzN(per) + ']');
        // accent twinkles: re-picked every half second on lattice points (about 1.2 % of the dots)
        var cols = Math.ceil(W / sp) + 2, rows = Math.ceil(H / sp) + 2, M = Math.max(2, Math.round(cols * rows * 0.012)), sd = (P.seed || 1) % 9973;
        var ga = jzGrp(S, 'accents');
        for (i = 0; i < M; i++) {
            var gi = bg1_sub(ga, 'twinkle ' + (i + 1));
            jzAddEllipse(gi, r * 4, r * 4);
            jzSetExpr(jzGX(gi).property('ADBE Vector Position'), bg1_hd(b) + 'var tw=Math.floor(T*2),mx=T*0.15,my=T*0.08;seedRandom(' + sd + '+tw*97+' + i + '*7,true);' +
                'var a=Math.floor(random(-1,' + cols + ')),c=Math.floor(random(-1,' + rows + '));[(a+wr(mx,1))*' + jzN(sp) + ',(c+wr(my,1))*' + jzN(sp) + ']');
        }
        jzAddFill(ga, jzTintC(sc, 0.55));
        jzSetExpr(jzXf(S, 'ADBE Opacity'), bg1_hd(b) + '100*oc(BT/0.5)');
    }
});

/* ---- retroGrid — レトロ格子: synthwave floor (perspective grid rushing towards the viewer), horizon glow, optional striped sun */
jzReg('bg', 'retroGrid', {
    plan: function (rng, st) { return { seed: bg1_seed(rng), hz: rng.range(0.56, 0.64), spd: rng.range(0.4, 0.8), sun: rng.chance(0.4), k: rng.range(0.38, 0.5) }; },
    build: function (b, P) {
        var W = b.W, H = b.H, sc = b.sc, U = jzU(b), px = bg1_px(b), k = P.k || 0.35, yh = H * (P.hz || 0.6), D = H - yh, col = jzTintC(sc, k), i, j;
        var hd = bg1_hd(b) + 'var e=oc(BT/0.6);';
        if (P.sun) {
            var R = U * 0.2, sy = yh - R * 0.35, SN = jzShapeLayer(b, 'bg retroGrid sun', W / 2, sy);
            var gs = jzGrp(SN, 'stripes');
            for (i = 0; i < 5; i++) { var hh = R * 0.03 * (1 + i * 0.6); jzAddRect(gs, R * 2, hh, 0, 0, R * (0.1 + i * 0.18) + hh / 2); }
            jzAddFill(gs, sc.bg);
            var gc = jzGrp(SN, 'sun'), el = jzAddEllipse(gc, R * 2, R * 2);
            jzSetExpr(el.property('ADBE Vector Ellipse Size'), hd + '[' + jzN(2 * R) + '*e,' + jzN(2 * R) + '*e]');
            jzAddFill(gc, jzTintC(sc, k * 0.45));
            bg1_mask(SN, -W, -H * 2, W, yh - sy);           // only above the horizon
        }
        var S = jzShapeLayer(b, 'bg retroGrid floor', 0, 0), spB = W * 0.18;
        var gh = jzGrp(S, 'rows');
        for (j = 0; j < 26; j++) {      // row j sits at depth z = j + 1 - phase
            var gj = bg1_sub(gh, 'row ' + (j + 1));
            jzAddPath(gj, [[-2 * px, yh], [W + 2 * px, yh]], false);
            jzSetExpr(jzGX(gj).property('ADBE Vector Position'), bg1_hd(b) + 'var z=' + (j + 1) + '-wr(T*' + jzN(P.spd || 0.6) + ',1),y=z>0.2?' + jzN(D * 0.9) + '/z:1e5;(y>' + jzN(D + 2 * px) + '||y<' + jzN(1.5 * px) + ')?[0,' + jzN(H * 3) + ']:[0,y]');
        }
        jzAddStroke(gh, col, Math.max(1.5 * px, U * 0.0025));
        var gv = jzGrp(S, 'rails');
        for (i = -12; i <= 12; i++) jzAddPath(gv, [[W / 2 + i * spB * 0.06, yh], [W / 2 + i * spB * 1.6, H + H * 0.3]], false);
        jzAddStroke(gv, col, Math.max(1.5 * px, U * 0.0025));
        // lines fade in towards the horizon: alpha 0 at the horizon, ~0.55 at 30 %, 1 at the bottom
        bg1_mask(S, -W, yh + D * 0.275, W * 2, H * 3, { f: [0, D * 0.55] });
        jzSetExpr(jzXf(S, 'ADBE Opacity'), hd + '100*e');
        // glow above the horizon + the horizon line
        var GL = bg1_solid(b, col, 'bg retroGrid glow', W, H * 0.1);
        jzXf(GL, 'ADBE Position').setValue([W / 2, yh - H * 0.05]);
        bg1_mask(GL, -W, H * 0.05, W * 2, H, { f: [0, H * 0.1] });
        jzSetExpr(jzXf(GL, 'ADBE Opacity'), hd + '35*e');
        var HL = jzRectLayer(b, 'bg retroGrid horizon', W / 2, yh, W, 2 * px, col);
        jzSetExpr(jzXf(HL, 'ADBE Opacity'), hd + '80*e');
    }
});

/* ---- bokehBg — ボケ玉: large soft out-of-focus discs in the scheme colours drifting up, twinkling (screen blend on dark schemes) */
jzReg('bg', 'bokehBg', {
    plan: function (rng, st) { return { seed: bg1_seed(rng), n: rng.int(12, 20), k: rng.range(0.18, 0.28) }; },
    build: function (b, P) {
        var W = b.W, H = b.H, sc = b.sc, s = P.seed || 1, U = jzU(b), dk = bg1_dark(sc), i;
        var cols = [sc.accent, sc.accent2 || sc.accent, sc.fg, sc.ghostA || sc.accent, sc.ghostB || sc.fg];
        var S = jzShapeLayer(b, 'bg bokehBg', 0, 0);
        for (i = (P.n || 12) - 1; i >= 0; i--) {
            var r = U * bg1_rr(0.035, 0.13, s, i, 1), vx = bg1_rs(s, i, 2) * U * 0.03, vy = -U * bg1_rr(0.01, 0.04, s, i, 3);
            var a = (P.k || 0.2) * (0.5 + 0.5 * bg1_r(s, i, 6)) * (dk ? 1 : 0.7), c = cols[i % cols.length];
            var g = jzGrp(S, 'bokeh ' + (i + 1));
            jzAddEllipse(g, r * 1.68, r * 1.68); jzAddStroke(g, c, r * 0.16, 35);     // brighter rim
            var gi = bg1_sub(g, 'disc'); jzAddEllipse(gi, r * 1.84, r * 1.84); jzAddFill(gi, c, 70);
            jzSetExpr(jzGX(g).property('ADBE Vector Position'), bg1_hd(b) + '[wr(' + jzN(bg1_r(s, i, 4) * W) + '+T*' + jzN(vx) + ',' + jzN(W + 2 * r) + ')-' + jzN(r) + '+Math.sin(T*0.4+' + i + ')*' + jzN(U * 0.015) +
                ',wr(' + jzN(bg1_r(s, i, 5) * H) + '+T*' + jzN(vy) + ',' + jzN(H + 2 * r) + ')-' + jzN(r) + ']');
            jzSetExpr(jzGX(g).property('ADBE Vector Group Opacity'), bg1_hd(b) + jzN(a * 100) + '*oc(BT/0.8)*(0.75+0.25*Math.sin(T*' + jzN(0.6 + bg1_r(s, i, 7)) + '+' + i + '))');
        }
        var bl = jzEffect(S, 'ADBE Gaussian Blur 2', 'JZ Bokeh Soft'); jzEP(bl, 1, U * 0.006); jzEP(bl, 3, 0);
        if (dk) S.blendingMode = BlendingMode.SCREEN;
    }
});

/* ---- particlesBg — 舞い上がる粒: many small dots / squares rising and swaying, fading out towards the top */
jzReg('bg', 'particlesBg', {
    plan: function (rng, st) { return { seed: bg1_seed(rng), n: rng.int(60, 100), k: rng.range(0.45, 0.65), sq: rng.chance(0.4) }; },
    build: function (b, P) {
        var W = b.W, H = b.H, sc = b.sc, s = P.seed || 1, U = jzU(b), px = bg1_px(b), i;
        var area = W * H / (px * px), n = Math.min(140, Math.round((P.n || 60) * Math.sqrt(area / (1920 * 1080))));
        var S = jzShapeLayer(b, 'bg particlesBg', 0, 0), lay = jzLayC(sc, 0.6);
        for (i = 0; i < n; i++) {
            var v = H * bg1_rr(0.04, 0.14, s, i, 1), sz = U * bg1_rr(0.0025, 0.008, s, i, 5), g = jzGrp(S, 'p' + (i + 1));
            if (P.sq) jzAddRect(g, sz * 2, sz * 2); else jzAddEllipse(g, sz * 2, sz * 2);
            jzAddFill(g, bg1_r(s, i, 7) < 0.22 ? sc.accent : lay, (0.55 + 0.45 * bg1_r(s, i, 6)) * 100);
            jzSetExpr(jzGX(g).property('ADBE Vector Position'), bg1_hd(b) + '[' + jzN(bg1_r(s, i, 3) * W) + '+Math.sin(T*' + jzN(bg1_rr(0.4, 1.2, s, i, 4)) + '+' + i + ')*' + jzN(U * 0.02) +
                ',' + jzN(H + 10 * px) + '-wr(T*' + jzN(v) + '+' + jzN(bg1_r(s, i, 2) * H * 1.2) + ',' + jzN(H * 1.2) + ')]');
        }
        bg1_mask(S, -W, H * 0.15, W * 2, H * 3, { f: [0, H * 0.3] });     // fade out towards the top edge
        jzSetExpr(jzXf(S, 'ADBE Opacity'), bg1_hd(b) + jzN((P.k || 0.45) * 100) + '*oc(BT/0.6)');
    }
});

/* ---- ripples — 波紋: rings spreading out every 0.7 s (at the centre or at random spots), a thinner echo ring inside */
jzReg('bg', 'ripples', {
    plan: function (rng, st) { return { seed: bg1_seed(rng), centre: rng.chance(0.4), life: rng.range(1.6, 2.4), k: rng.range(0.24, 0.34) }; },
    build: function (b, P) {
        var W = b.W, H = b.H, sc = b.sc, s = P.seed || 1, U = jzU(b), life = P.life || 1.8, per = 0.7, t0 = b.cut.start || 0, j, m;
        // ring centres by ring index (same hash as the browser), baked for the rings this cut can show
        var m0 = Math.floor(t0 / per) - 5, m1 = Math.floor((t0 + b.comp.duration) / per) + 1, X = [], Y = [];
        for (m = m0; m <= m1; m++) { X.push(jzN(P.centre ? W / 2 : W * bg1_rr(0.15, 0.85, s, m, 1))); Y.push(jzN(P.centre ? H / 2 : H * bg1_rr(0.2, 0.8, s, m, 2))); }
        var S = jzShapeLayer(b, 'bg ripples', 0, 0);
        for (j = 0; j < 4; j++) {
            var hd = bg1_hd(b) + 'var m=Math.floor(T/' + per + ')-' + j + ',age=T-m*' + per + ',q=cl(age/' + jzN(life) + '),r=' + jzN(U) + '*(0.05+0.75*oc(q)),a=age>' + jzN(life) + '?0:' + jzN((P.k || 0.2) * 100) + '*Math.pow(1-q,1.4);';
            var g = jzGrp(S, 'ring ' + (j + 1));
            var gi = bg1_sub(g, 'echo'), ei = jzAddEllipse(gi, 10, 10);
            jzSetExpr(ei.property('ADBE Vector Ellipse Size'), hd + '[1.6*r,1.6*r]');
            var si = jzAddStroke(gi, sc.fg, U * 0.0015, 50);
            jzSetExpr(si.property('ADBE Vector Stroke Opacity'), hd + 'a*0.5');
            var go = bg1_sub(g, 'ring'), eo = jzAddEllipse(go, 10, 10);
            jzSetExpr(eo.property('ADBE Vector Ellipse Size'), hd + '[2*r,2*r]');
            var so = jzAddStroke(go, sc.fg, U * 0.005, 100);
            jzSetExpr(so.property('ADBE Vector Stroke Opacity'), hd + 'a');
            jzSetExpr(so.property('ADBE Vector Stroke Width'), hd + jzN(U) + '*(0.008*(1-q)+0.002)');
            jzSetExpr(jzGX(g).property('ADBE Vector Position'), hd + 'var X=[' + X.join(',') + '],Y=[' + Y.join(',') + '],i=Math.max(0,Math.min(' + (X.length - 1) + ',m-(' + m0 + ')));[X[i],Y[i]]');
        }
    }
});

/* ---- polka — 水玉: hex polka dots popping in (overshoot), slow diagonal drift */
jzReg('bg', 'polka', {
    plan: function (rng, st) { return { seed: bg1_seed(rng), sp: rng.range(0.11, 0.16), r: rng.range(0.2, 0.3), k: rng.range(0.06, 0.09), acc: rng.chance(0.3) }; },
    build: function (b, P) {
        var W = b.W, H = b.H, sc = b.sc, sp = jzU(b) * (P.sp || 0.13), r = sp * (P.r || 0.25), rh = sp * 0.866, i;
        var S = jzShapeLayer(b, 'bg polka', 0, 0), g = jzGrp(S, 'dots');
        var sz = bg1_hd(b) + JZ_FNS + 'var d=' + jzN(2 * r) + '*ob(BT/0.45,1.5);[d,d]';
        for (i = 0; i < 2; i++) { var el = jzAddEllipse(g, 2 * r, 2 * r, i * sp / 2, i * rh); jzSetExpr(el.property('ADBE Vector Ellipse Size'), sz); }
        jzAddFill(g, P.acc ? jzTintC(sc, (P.k || 0.07) * 1.8) : jzLayC(sc, P.k || 0.07));
        bg1_rep(g, Math.ceil((W + 3 * sp) / sp) + 1, sp, 0, 0);
        bg1_rep(g, Math.ceil((H + 3 * rh) / (2 * rh)) + 1, 0, 2 * rh, 0);
        jzSetExpr(jzGX(g).property('ADBE Vector Position'), bg1_hd(b) + '[wr(T*' + jzN(sp * 0.25) + ',' + jzN(sp) + ')-' + jzN(2 * sp) + ',wr(T*' + jzN(sp * 0.15) + ',' + jzN(2 * rh) + ')-' + jzN(2 * rh) + ']');
    }
});

/* ---- eqBars — 背景イコライザー: a faint spectrum of bars (bottom / mirrored / centred, optionally segmented) with peak caps.
   Levels come from smooth noise + a 2 Hz pulse (the browser follows the audio energy / beats when it has them) */
jzReg('bg', 'eqBars', {
    plan: function (rng, st) { return { seed: bg1_seed(rng), n: rng.pick([24, 32, 40]), mode: rng.pick(['bottom', 'bottom', 'mirror', 'center']), seg: rng.chance(0.4), k: rng.range(0.09, 0.14) }; },
    build: function (b, P) {
        var W = b.W, H = b.H, sc = b.sc, s = (P.seed || 1) % 997, n = P.n || 32, bw = W / n, bwd = bw * 0.62, Hm = H * 0.32, segH = bw * 0.45, mode = P.mode || 'bottom', i;
        var S = jzShapeLayer(b, 'bg eqBars', 0, 0);
        var lv = function (i) {       // expression: level L (0..1) of bar i, h = its height in px
            return bg1_hd(b) + 'var en=0.45+0.2*noise(T*2+' + jzN(s * 0.37) + '),bt=Math.exp(-wr(T*2,1)*4),nz=0.5+0.5*noise(T*4+' + jzN(i * 1.7 + s * 1.31 + i * 11.3) + '),sh=' + jzN(0.55 + 0.45 * Math.sin(Math.PI * (i + 0.5) / n)) +
                ',L=cl(sh*(0.25+0.75*en)*(0.55+0.45*nz)+bt*0.18*nz)*oc(BT/0.4),h=' + jzN(Hm) + '*L;';
        };
        if (mode !== 'center') {     // peak caps (drawn over the bars)
            var gc = jzGrp(S, 'caps'), ch = Math.max(2 * bg1_px(b), bw * 0.12);
            for (i = 0; i < n; i++) {
                var gci = bg1_sub(gc, 'cap ' + (i + 1)); jzAddRect(gci, bwd, ch);
                jzSetExpr(jzGX(gci).property('ADBE Vector Position'), lv(i) + '[' + jzN(i * bw + bw * 0.5) + ',' + jzN(H - bw * 0.3 + ch / 2) + '-h]');
            }
            jzAddFill(gc, jzTintC(sc, 0.4));
        }
        var gb = jzGrp(S, 'bars');
        for (i = 0; i < n; i++) {
            var xc = i * bw + bw * 0.5, parts = mode === 'center' ? [[H / 2, -1, 0.7], [H / 2, 1, 0.7]] : (mode === 'mirror' ? [[H, -1, 1], [0, 1, 0.7]] : [[H, -1, 1]]), q;
            for (q = 0; q < parts.length; q++) {
                var y0 = parts[q][0], dir = parts[q][1], f = parts[q][2], gi = bg1_sub(gb, 'bar ' + (i + 1) + (q ? 'b' : ''));
                if (P.seg) {      // stacked segments, the Repeater shows as many as fit
                    jzAddRect(gi, bwd, segH * 0.7, 0, 0, dir * segH * 0.35);
                    var rp = bg1_rep(gi, 0, 0, dir * segH, 0);
                    jzSetExpr(rp.property('ADBE Vector Repeater Copies'), lv(i) + 'var hhv=h*' + jzN(f) + ';hhv<' + jzN(segH * 0.7) + '?0:Math.floor((hhv-' + jzN(segH * 0.7) + ')/' + jzN(segH) + ')+1');
                } else {          // one bar growing from its base
                    jzAddRect(gi, bwd, Hm * f, 0, 0, dir * Hm * f / 2);
                    jzSetExpr(jzGX(gi).property('ADBE Vector Scale'), lv(i) + '[100,L*100]');
                }
                jzGX(gi).property('ADBE Vector Position').setValue([xc, y0]);
            }
        }
        jzAddFill(gb, jzLayC(sc, P.k || 0.11));
    }
});

/* ---- borderFrame — 太枠: a thick frame drawn around the picture (two strokes racing round), optional thin inner frame */
jzReg('bg', 'borderFrame', {
    plan: function (rng, st) { return { seed: bg1_seed(rng), th: rng.range(0.012, 0.022), m: rng.range(0.03, 0.05), acc: rng.chance(0.6), dbl: rng.chance(0.4) }; },
    build: function (b, P) {
        var W = b.W, H = b.H, sc = b.sc, U = jzU(b), m = U * (P.m || 0.04), th = U * (P.th || 0.016), i;
        var cand = P.acc ? [sc.accent, sc.ink, sc.fg] : [sc.ink, sc.fg], col = sc.fg;
        for (i = 0; i < cand.length; i++) if (cand[i] && jzContrast(cand[i], sc.bg) >= 1.6) { col = cand[i]; break; }
        var x0 = m + th / 2, y0 = m + th / 2, x1 = W - m - th / 2, y1 = H - m - th / 2;
        var trim = bg1_hd(b) + 'var x=cl(BT/0.6);100*(x<0.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2)';
        var S = jzShapeLayer(b, 'bg borderFrame', 0, 0);
        if (P.dbl) {
            var m2 = m + th * 2.4, g2 = jzGrp(S, 'inner');
            jzAddPath(g2, [[m2, m2], [W - m2, m2], [W - m2, H - m2], [m2, H - m2], [m2, m2]], false);
            jzAddTrimPaths(g2, trim);
            jzAddStroke(g2, col, Math.max(bg1_px(b), th * 0.18), 45);
        }
        var g = jzGrp(S, 'frame');
        jzAddPath(g, [[x0 - th / 2, y0], [x1, y0], [x1, y1 + th / 2]], false);
        jzAddPath(g, [[x1 + th / 2, y1], [x0, y1], [x0, y0 - th / 2]], false);
        jzAddTrimPaths(g, trim);
        jzAddStroke(g, col, th);
    }
});

/* ---- letterbox — シネスコ帯: cinema bars slide in from the top and bottom edges, thin line on their inner edge */
jzReg('bg', 'letterbox', {
    plan: function (rng, st) { return { seed: bg1_seed(rng), k: rng.range(0.085, 0.11), line: rng.chance(0.6) }; },
    build: function (b, P) {
        var W = b.W, H = b.H, sc = b.sc, px = bg1_px(b), dk = bg1_dark(sc), bh = W >= H ? H * (P.k || 0.1) : H * 0.05, lt = Math.max(1.2 * px, H * 0.0015), i;
        var S = jzShapeLayer(b, 'bg letterbox', 0, 0), hd = bg1_hd(b) + 'var bh=' + jzN(bh) + '*oe(BT/0.55);';
        if (P.line || dk) {
            var gl = jzGrp(S, 'lines');
            for (i = 0; i < 2; i++) {
                var gi = bg1_sub(gl, i ? 'bottom line' : 'top line'); jzAddRect(gi, W, lt);
                jzSetExpr(jzGX(gi).property('ADBE Vector Position'), hd + (i ? '[' + jzN(W / 2) + ',' + jzN(H - lt / 2) + '-bh]' : '[' + jzN(W / 2) + ',bh+' + jzN(lt / 2) + ']'));
            }
            jzAddFill(gl, dk ? jzLayC(sc, 0.3) : jzTintC(sc, 0.6));
            jzSetExpr(jzGX(gl).property('ADBE Vector Group Opacity'), hd + 'bh<0.5?0:100');
        }
        var g = jzGrp(S, 'bars');
        for (i = 0; i < 2; i++) {
            var gb = bg1_sub(g, i ? 'bottom' : 'top');
            jzAddRect(gb, W + 2 * px, bh + px, 0, 0, (i ? -1 : 1) * (bh + px) / 2);
            jzGX(gb).property('ADBE Vector Position').setValue([W / 2, i ? H + px : -px]);
            jzSetExpr(jzGX(gb).property('ADBE Vector Scale'), hd + '[100,100*bh/' + jzN(bh) + ']');
        }
        jzAddFill(g, dk ? jzMixHex(sc.bg, '#000000', 0.85) : jzMixHex(sc.fg, '#000000', 0.3));
    }
});

/* ---- noiseField — ノイズの揺らぎ: a coarse grid of cells lit where a drifting noise field crosses a threshold (3 tones), stepped flicker.
   AE: Fractal Noise -> Offset (drift + per-step jitter) -> Mosaic (cells) -> Threshold (one layer per tone) -> Tint, blended Lighten / Darken */
jzReg('bg', 'noiseField', {
    plan: function (rng, st) { return { seed: bg1_seed(rng), n: rng.int(14, 22), k: rng.range(0.05, 0.085), th: rng.range(0.56, 0.66) }; },
    build: function (b, P) {
        var W = b.W, H = b.H, sc = b.sc, s = P.seed || 1, cell = jzU(b) / (P.n || 18), th = P.th || 0.6, k = P.k || 0.07, i;
        var lighter = jzLum(sc.fg) >= jzLum(sc.bg), base = lighter ? [0, 0, 0] : [1, 1, 1], sx = 2;
        var lw = Math.ceil(W / sx), cols = Math.max(1, Math.round(W / cell)), rows = Math.max(1, Math.round(H / cell)), sd = s % 9973;
        var tones = [[0, 0.6], [0.1, 1], [0.2, 1.6]];
        for (i = 0; i < 3; i++) {
            var L = bg1_solid(b, '#808080', 'bg noiseField ' + (i + 1), lw, H);
            jzXf(L, 'ADBE Scale').setValue([sx * 100, 100]);           // noise stretched sideways like the browser's row noise
            jzEffect(L, 'ADBE Fractal Noise', 'JZ Noise');
            var of = jzEffect(L, 'ADBE Offset', 'JZ Drift');
            jzEX(of, 1, bg1_hd(b) + 'var st=Math.floor(T*12+1e-6);seedRandom(' + sd + '+st,true);[value[0]-T*' + jzN(cell * 3 / sx) + '+random(-0.35,0.35)*' + jzN(cell / sx) + ',value[1]+T*' + jzN(cell * 1.7) + '+random(-0.35,0.35)*' + jzN(cell) + ']');
            var mo = jzEffect(L, 'ADBE Mosaic', 'JZ Cells'); jzEP(mo, 1, cols); jzEP(mo, 2, rows); jzEP(mo, 3, 1);
            var tr = jzEffect(L, 'ADBE Threshold2', 'JZ Level');
            jzEX(tr, 1, bg1_hd(b) + '255*Math.min(1,' + jzN(th + tones[i][0]) + '+(1-cl(BT/0.3))*0.4)');
            var tn = jzEffect(L, 'ADBE Tint', 'JZ Tone'); jzEP(tn, 1, base); jzEP(tn, 2, jzHex(jzLayC(sc, k * tones[i][1]))); jzEP(tn, 3, 100);
            L.blendingMode = lighter ? BlendingMode.LIGHTEN : BlendingMode.DARKEN;
        }
        // an occasional accent cell jumping every other step (the browser turns ~1 % of the lit cells)
        var A = jzShapeLayer(b, 'bg noiseField accent', 0, 0), ga = jzGrp(A, 'accent cell');
        jzAddRect(ga, cell - bg1_px(b), cell - bg1_px(b), 0, cell / 2, cell / 2);
        jzAddFill(ga, jzTintC(sc, 0.3));
        var ax = bg1_hd(b) + 'var st=Math.floor(T*6+1e-6);seedRandom(' + (sd + 5000) + '+st*7,true);var px=Math.floor(random(0,' + cols + '))*' + jzN(cell) + ',py=Math.floor(random(0,' + rows + '))*' + jzN(cell) + ',on=random()<0.6;';
        jzSetExpr(jzGX(ga).property('ADBE Vector Position'), ax + '[px,py]');
        jzSetExpr(jzXf(A, 'ADBE Opacity'), ax + '(BT<0.3||!on)?0:100');
    }
});
