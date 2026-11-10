// ================================================================ x2decA part 2 (AE port of src/11p_x2_decA.js — 追加分2 line-work decor)
// Measuring & drafting marks (xlCaliper … xlBezier) and connectors, pointers, marks (xlEdgeTether … xlSeam).
// Helpers (axl_*) and the conventions are in p_x2_decA1.jsx.

// ================================================================ measuring & drafting

/* ---- xlCaliper — ノギス: a vernier caliper: a graduated beam, a fixed jaw and a sliding jaw that closes on the lyric's width
   (the graduations are two dashed strokes revealed with the beam) */
axl_reg('xlCaliper', function (ctx, bb, p, u) {
    var ax = axl_axes(ctx, bb), m = axl_mg(ctx) * 0.45, hB = 22 * u, c = ctx.sc.fg, acc = axl_acc(ctx), len = ax.L1 - ax.L0, sp = ax.C1 - ax.C0, i;
    var b = axl_sideBand(ctx, ax, hB + 36 * u, !!p.low, 18 * u + sp * 0.06), s = b.s, ci = b.edge, co = b.edge + s * hB;
    var jl = 18 * u + sp * 0.06 + Math.min(sp * 0.45, 80 * u), sw = 44 * u;
    var xa = Math.max(m + 14 * u, ax.L0 - 10 * u), xbT = Math.min(ax.AM - m - sw, ax.L1 + 10 * u), xs = Math.min(ax.AM - m - sw, xbT + Math.max(140 * u, len * 0.35));
    var X0 = xa - 14 * u, X1 = Math.max(X0 + 1, Math.min(ax.AM - m, xbT + 110 * u)), tl = Math.max(1, X1 - xa);
    var xbEx = 'var xb=' + jzN(xs) + '+' + jzN(xbT - xs) + '*ob((t-0.15)/0.55,1.1);', tkEnd = '100*(' + jzN(X0 - xa - 2 * u) + '+' + jzN(X1 - X0) + '*ein(0.45))/' + jzN(tl);
    var S = axl_layer(ctx, 'caliper', 'oc(t/0.3)*o');
    var G = axl_grp(S, 'sliding jaw'), vt = [];
    for (i = 1; i < 6; i++) vt.push(axl_Ms(ax, [[xbT + i * 7 * u, co + 4 * u * s], [xbT + i * 7 * u, co - s * 5 * u]]));
    axl_line(ctx, G, 'vernier', vt, { col: acc, w: 1.2 * u, cap: 1 });
    axl_line(ctx, G, 'jaw', [axl_Ms(ax, [[xbT + 13 * u, ci], [xbT + 13 * u, ci - s * jl * 0.55], [xbT, ci - s * jl], [xbT, ci]]),
        axl_Ms(ax, [[xbT, ci - 4 * u * s], [xbT + sw, ci - 4 * u * s], [xbT + sw, co + 4 * u * s], [xbT, co + 4 * u * s], [xbT, ci - 4 * u * s]])], { col: acc, w: 2.4 * u, cap: 2, join: 1 });
    axl_fin(ctx, G, { pre: xbEx, posEx: axl_along(ax, 'xb-' + jzN(xbT)) });
    axl_line(ctx, S, 'fixed jaw', [axl_Ms(ax, [[xa - 13 * u, ci], [xa - 13 * u, ci - s * jl * 0.55], [xa, ci - s * jl], [xa, ci]])], { col: c, w: 2.4 * u, cap: 2, join: 1 });
    axl_line(ctx, S, 'long graduations', [axl_Ms(ax, [[xa - 0.6 * u, ci + s * 6 * u], [X1, ci + s * 6 * u]])], { col: c, w: 12 * u, op: 80, cap: 1, dash: [1.2 * u, 53.8 * u], end: tkEnd });
    axl_line(ctx, S, 'graduations', [axl_Ms(ax, [[xa - 0.6 * u, ci + s * 3 * u], [X1, ci + s * 3 * u]])], { col: c, w: 6 * u, op: 80, cap: 1, dash: [1.2 * u, 9.8 * u], end: tkEnd });
    var Bm = axl_grp(S, 'beam');
    axl_line(ctx, Bm, 'outline', [axl_Ms(ax, [[X1, ci], [X0, ci], [X0, co], [X1, co], [X1, ci]])], { pivot: axl_M(ax, X0, ci), scEx: axl_scAlong(ax, 'Math.max(0.001,ein(0.45))') });
    axl_fin(ctx, Bm, { col: c, w: 1.8 * u, cap: 1, join: 1 });
    var lp = axl_M(ax, xbT + sw / 2, co + s * 22 * u);
    var T = axl_label(ctx, ((xbT - xa) / 10).toFixed(1), lp[0], lp[1], { size: Math.max(11, 16 * u), color: p.accent ? acc : c, name: 'reading' }, 'ein(0.3,0.3)*o');
    axl_ex(ctx, jzXf(T, 'ADBE Position'), xbEx + axl_along(ax, 'xb-' + jzN(xbT)));
    axl_src(ctx, T, xbEx + '((xb-' + jzN(xa) + ')/10).toFixed(1)');
});

/* ---- xlProtractor — 分度器: a half-disc protractor standing on the lyric: the scale sweeps on (Repeaters) and a needle swings to an angle */
axl_reg('xlProtractor', function (ctx, bb, p, u) {
    var ax = axl_axes(ctx, bb), sp = ax.C1 - ax.C0, len = ax.L1 - ax.L0, b = axl_sideBand(ctx, ax, 180 * u, !!p.low, 18 * u + sp * 0.05), i;
    if (b.room < 44 * u) return;
    var R = jzClamp(Math.min(len * 0.45, b.room - 28 * u), 34 * u, 260 * u), ca = jzClamp((ax.L0 + ax.L1) / 2, R + 10 * u, ax.AM - R - 10 * u), c = ctx.sc.fg, acc = axl_acc(ctx);
    var O = axl_M(ax, ca, b.edge), rs = ax.vert ? -b.s : b.s, kk = jzClamp(R / (150 * u), 0.6, 1.2), a = 'Math.min(1,o*1.5)', na = 'ein(0.2,0.3)*o';
    var angEx = 'var ang=' + jzN(25 + p.r * 130) + '*ob((t-0.3)/0.6,1.5)+' + jzN(2 * ctx.fx.motion) + '*Math.sin(t*2.1);';
    var S = axl_layer(ctx, 'protractor');
    axl_line(ctx, S, 'pivot', null, { ells: [[O[0], O[1], 5 * u]], col: acc, w: 2.2 * u, gop: na });
    axl_line(ctx, S, 'needle', [[[0, 0], axl_M(ax, R * 0.84, 0)]], { col: acc, w: 3 * u, cap: 2, at: O, pre: angEx, rotEx: rs + '*ang', gop: na });
    var tk = [[30, 17], [10, 10], [5, 6]];
    for (i = 0; i < 3; i++) axl_line(ctx, S, tk[i][0] + '° ticks', [[axl_M(ax, R, 0), axl_M(ax, R - tk[i][1] * u * kk, 0)]], { col: c, w: 1.2 * u, op: 85, cap: 1, at: O,
        rep: { n: Math.floor(180 / tk[i][0]) + 1, rot: rs * tk[i][0], copiesEx: 'Math.floor(180*ioc(t/0.65)/' + tk[i][0] + '+1e-6)+1' }, gop: a });
    var arc = [];
    for (i = 0; i <= 40; i++) arc.push(axl_M(ax, ca + Math.cos(180 * i / 40 * AXL_D) * R, b.edge + b.s * Math.sin(180 * i / 40 * AXL_D) * R));
    axl_line(ctx, S, 'arc', [arc], { col: c, w: 2.2 * u, cap: 1, join: 2, end: '100*ioc(t/0.65)', gop: a });
    axl_line(ctx, S, 'base', [axl_Ms(ax, [[ca - R, b.edge], [ca + R, b.edge]])], { col: c, w: 1.8 * u, cap: 1, start: '50-50*ein(0.4)', end: '50+50*ein(0.4)', gop: a });
    if (R > 60 * u) {
        var R2 = jzN(R + 20 * u), T = axl_label(ctx, Math.round(25 + p.r * 130) + '°', O[0], O[1], { size: Math.max(11, 15 * u), color: ctx.sc.sub, name: 'degrees' }, 'ein(0.3,0.5)*o');
        axl_ex(ctx, jzXf(T, 'ADBE Position'), angEx + 'var d=ang*Math.PI/180;' + (ax.vert ? '[' + jzN(O[0]) + '+' + jzN(b.s) + '*Math.sin(d)*' + R2 + ',' + jzN(O[1]) + '+Math.cos(d)*' + R2 + ']'
            : '[' + jzN(O[0]) + '+Math.cos(d)*' + R2 + ',' + jzN(O[1]) + '+' + jzN(b.s) + '*Math.sin(d)*' + R2 + ']'));
        axl_src(ctx, T, angEx + 'Math.round(ang)+"°"');
    }
});

/* ---- xlAngleMark — 角度記号: a geometry angle mark at a corner of the lyric: a dashed base ray, a ray that swings open,
   the arc and its degrees */
axl_reg('xlAngleMark', function (ctx, bb, p, u) {
    var W = ctx.W, H = ctx.H, m = axl_mg(ctx) * 0.6, c = axl_col(ctx, p), sx = p.right ? 1 : -1, sy = p.low ? 1 : -1, i;
    var vx = function (s) { return s > 0 ? bb.x1 + 10 * u : bb.x0 - 10 * u; }, rm = function (s) { return s > 0 ? W - m - vx(s) : vx(s) - m; };
    var vy = function (s) { return s > 0 ? bb.y1 + 10 * u : bb.y0 - 10 * u; }, rv = function (s) { return s > 0 ? H - m - vy(s) : vy(s) - m; };
    if (rv(sy) < 34 * u && rv(-sy) > rv(sy)) sy = -sy;
    var dir = sx, len;
    if (rm(sx) >= 120 * u) len = rm(sx); else if (rm(-sx) >= 120 * u) { sx = -sx; dir = sx; len = rm(sx); } else { dir = -sx; len = axl_bw(bb) * 0.55; }
    len = jzClamp(len * 0.8, 90 * u, 230 * u);
    var V = [vx(sx), vy(sy)], room = Math.max(8 * u, rv(sy)), th = jzClamp(Math.min(22 + p.r * 38, Math.atan2(room, len * 0.85) / AXL_D), 7, 60), thM = th * 1.3;
    var pre = 'var e=ein(0.4),the=' + jzN(th) + '*ob((t-0.2)/0.5,1.7);', a = 'Math.min(1,o*1.5)', arc = [];
    for (i = 0; i <= 18; i++) arc.push([V[0] + dir * Math.cos(thM * i / 18 * AXL_D) * len * 0.42, V[1] + sy * Math.sin(thM * i / 18 * AXL_D) * len * 0.42]);
    var S = axl_layer(ctx, 'angle mark');
    axl_line(ctx, S, 'vertex', null, { ells: [[V[0], V[1], 5 * u]], fill: axl_acc(ctx), gop: a });
    var G = axl_grp(S, 'arc');
    axl_line(ctx, G, 'radius', [arc], { pivot: V, pre: pre, scEx: '[value[0]*Math.max(0.001,e),value[1]*Math.max(0.001,e)]' });
    axl_fin(ctx, G, { col: c, w: 2 * u, cap: 1, join: 2, pre: pre, end: '100*the/' + jzN(thM), gop: a });
    axl_line(ctx, S, 'open ray', [[[0, 0], [dir * len, 0]]], { col: c, w: 3 * u, cap: 2, at: V, pre: pre, rotEx: (dir * sy) + '*the', end: '100*e*o', gop: a });
    axl_line(ctx, S, 'base ray', [[V, [V[0] + dir * len, V[1]]]], { col: ctx.sc.fg, w: 1.8 * u, op: 70, cap: 1, dash: [8 * u, 6 * u], pre: pre, end: '100*e*o', gop: a });
    var T = axl_label(ctx, Math.round(th) + '°', V[0] + dir * (len * 0.42 + 30 * u), V[1], { size: Math.max(11, 17 * u), color: c, name: 'degrees' }, 'ein(0.3,0.4)*o');
    axl_ex(ctx, jzXf(T, 'ADBE Position'), pre + 'var ra=' + jzN(len * 0.42) + '*e+' + jzN(30 * u) + ',d=the/2*Math.PI/180;[' + jzN(V[0]) + '+' + dir + '*Math.cos(d)*ra,' + jzN(V[1]) + '+' + sy + '*Math.sin(d)*ra]');
    axl_src(ctx, T, pre + 'Math.round(Math.abs(the))+"°"');
});

/* ---- xlLevel — 水準器: a spirit level beside the lyric: the bubble sloshes and settles between its two lines */
axl_reg('xlLevel', function (ctx, bb, p, u) {
    var ax = axl_axes(ctx, bb, true), b = axl_sideBand(ctx, ax, 40 * u, !!p.low, 16 * u + axl_bh(bb) * 0.07), c = ctx.sc.fg, acc = axl_acc(ctx), m = axl_mg(ctx) * 0.5;
    var cx = (bb.x0 + bb.x1) / 2, w = jzClamp(axl_bw(bb) * 0.4, 150 * u, 290 * u), h = Math.min(34 * u, b.h), y = b.c;
    var x0 = Math.max(m, bb.x0 - 6 * u), x1 = Math.min(ctx.W - m, bb.x1 + 6 * u), bwd = 19 * u, bhh = Math.max(2 * u, Math.min(11 * u, h / 2 - 4 * u));
    var S = axl_layer(ctx, 'spirit level', 'Math.min(1,o*1.5)');
    var Bu = axl_grp(S, 'bubble');
    axl_line(ctx, Bu, 'glint', [[[-bwd * 0.45, -bhh * 0.35], [-bwd * 0.05, -bhh * 0.35]]], { col: acc, w: 1.3 * u, cap: 2 });
    axl_line(ctx, Bu, 'outline', [axl_rrect(-bwd, -bhh, bwd, bhh, bhh, 6)], { closed: true, col: acc, w: 2.6 * u, cap: 2, join: 2 });
    axl_fin(ctx, Bu, { at: [cx, y], pre: 'var w=' + jzN(w) + '*ein(0.45);',
        posEx: '[value[0]+((w/2-' + jzN(30 * u) + ')*Math.exp(-t*1.5)*Math.cos(t*5.5)*' + (p.right ? 1 : -1) + '+' + jzN(2.5 * u) + '*Math.sin(t*1.3))*' + jzN(0.3 + 0.7 * ctx.fx.motion) + ',value[1]]', gop: 'ein(0.25,0.15)*o' });
    if (x1 - x0 > w + 40 * u) {
        axl_line(ctx, S, 'end ticks', [[[x0, y - 6 * u], [x0, y + 6 * u]], [[x1, y - 6 * u], [x1, y + 6 * u]]], { col: ctx.sc.sub, w: 1.6 * u, cap: 1, pre: 'var e=ein(0.5,0.1)*o;', start: '50-50*e', end: '50+50*e' });
        axl_line(ctx, S, 'reach', [[[cx - w / 2 - 10 * u, y], [x0, y]], [[cx + w / 2 + 10 * u, y], [x1, y]]], { col: ctx.sc.sub, w: 1.6 * u, cap: 1, end: '100*ein(0.5,0.1)*o' });
    }
    var Gl = axl_grp(S, 'centre lines');
    axl_line(ctx, Gl, 'pair', [[[cx - 24 * u, y - h / 2], [cx - 24 * u, y + h / 2]], [[cx + 24 * u, y - h / 2], [cx + 24 * u, y + h / 2]]], { pivot: [cx, y], scEx: '[value[0]*ein(0.45),value[1]]' });
    axl_fin(ctx, Gl, { col: c, w: 1.8 * u, cap: 1 });
    // the vial: a rounded rectangle whose width opens with the entrance (Rect Size expression keeps the round ends round)
    var Gv = jzGrp(S, 'vial'), rc = jzAddRect(Gv, w, h, h / 2, cx, y);
    axl_ex(ctx, rc.property('ADBE Vector Rect Size'), '[' + jzN(w) + '*ein(0.45),' + jzN(h) + ']');
    axl_fin(ctx, Gv, { col: c, w: 2.4 * u, cap: 2, join: 2 });
});

/* ---- xlPlumb — 下げ振り: a plumb line dropped from the top edge: the bob swings like a pendulum and comes to rest */
axl_reg('xlPlumb', function (ctx, bb, p, u) {
    var W = ctx.W, H = ctx.H, m = axl_mg(ctx), c = ctx.sc.fg, wr = W - bb.x1, wl = bb.x0, bob = 46 * u, x, L, lim, sp;
    var side = (p.right ? wr >= 90 * u : wl < 90 * u) ? 1 : -1;
    if (Math.max(wr, wl) >= 90 * u) { sp = side > 0 ? wr : wl; x = side > 0 ? bb.x1 + sp * 0.5 : sp * 0.5; L = jzClamp((bb.y0 + bb.y1) / 2 + axl_bh(bb) * 0.2, H * 0.25, H * 0.72); lim = sp * 0.5 - 16 * u; }
    else if (bb.y0 >= 110 * u) { x = (bb.x0 + bb.x1) / 2 + (p.right ? 1 : -1) * axl_bw(bb) * 0.3; L = bb.y0 - 22 * u - bob; lim = L * 0.3; }
    else { x = p.right ? W - m * 0.5 : m * 0.5; L = H * 0.4; lim = m * 0.3; }
    if (L < 4) return;
    var A = Math.min(9, Math.atan2(Math.max(2, lim), L) / AXL_D), w = 13 * u;
    var pre = 'var lk=Math.max(0.001,ob(t/0.55,1.2)*(0.2+0.8*o));';
    var S = axl_layer(ctx, 'plumb line', 'Math.min(1,o*1.6)');
    axl_line(ctx, S, 'hook', [[[x - 12 * u, 2 * u], [x + 12 * u, 2 * u]]], { col: c, w: 4 * u, cap: 1 });
    var G = axl_grp(S, 'pendulum'), Bo = axl_grp(G, 'bob');
    axl_line(ctx, Bo, 'eye', null, { ells: [[0, bob * 0.2, 3.2 * u]], fill: ctx.sc.bg });
    axl_line(ctx, Bo, 'weight', [[[-w, 0], [w, 0], [w, bob * 0.35], [0, bob], [-w, bob * 0.35]]], { closed: true, fill: axl_col(ctx, p) });
    axl_fin(ctx, Bo, { at: [0, L], pre: pre, posEx: '[0,' + jzN(L) + '*lk]' });
    var St = axl_grp(G, 'string');
    axl_line(ctx, St, 'length', [[[0, 0], [0, L]]], { pre: pre, scEx: '[value[0],value[1]*lk]' });
    axl_fin(ctx, St, { col: c, w: 1.8 * u, cap: 1 });
    axl_fin(ctx, G, { at: [x, 0], rotEx: '-(' + jzN(A) + '*Math.exp(-t*0.9)*Math.cos(t*4.2)+1.2*Math.sin(t*1.7))*' + jzN((0.25 + 0.75 * ctx.fx.motion) * (p.low ? -1 : 1)) });
});

/* ---- xlCompass — コンパス: a drafting compass in free space: the needle leg stays put while the pencil leg draws a full circle */
axl_reg('xlCompass', function (ctx, bb, p, u) {
    var mn = jzU(ctx), R = jzClamp(mn * 0.095, 50 * u, 112 * u), hg = R * 2.1, w = R * 2 + 12 * u, h = hg + R + 28 * u, sc = ctx.sc, acc = axl_acc(ctx), i;
    var sp = axl_spot(ctx, bb, w, h, p, 22 * u), px = sp.x + w / 2, py = sp.y + h - R - 6 * u, dir = p.right ? 1 : -1, ph0 = (-90 + p.r * 360) * AXL_D, arc = [];
    var pre = 'var sw=(6.2832*ioc((t-0.25)/1.2)+Math.max(0,t-1.45)*' + jzN(0.25 * ctx.fx.motion) + ')*' + dir + ',ph=' + jzN(ph0) + '+sw,px=' + jzN(px) + ',py=' + jzN(py) +
        ',qx=px+Math.cos(ph)*' + jzN(R) + ',qy=py+Math.sin(ph)*' + jzN(R) + ',hx=(px+qx)/2,hy=py-' + jzN(hg) + '*ein(0.35);';
    for (i = 0; i <= 72; i++) arc.push([px + Math.cos(ph0 + dir * AXL_TAU * i / 72) * R, py + Math.sin(ph0 + dir * AXL_TAU * i / 72) * R]);
    var q0 = [px + Math.cos(ph0) * R, py + Math.sin(ph0) * R];
    var S = axl_layer(ctx, 'compass', 'oc(t/0.3)*o');
    axl_line(ctx, S, 'pencil', null, { ells: [[0, 0, 4.5 * u]], fill: acc, at: q0, pre: pre, posEx: '[qx,qy]' });
    axl_line(ctx, S, 'centre cross', [[[px - 6 * u, py], [px + 6 * u, py]], [[px, py - 6 * u], [px, py + 6 * u]]], { col: sc.sub, w: 1 * u, cap: 1 });
    var Hg = axl_grp(S, 'hinge');
    axl_line(ctx, Hg, 'pin', null, { ells: [[0, 0, 2.6 * u]], fill: acc });
    axl_line(ctx, Hg, 'disc', null, { ells: [[0, 0, 7 * u]], col: sc.fg, w: 2.2 * u, fill: sc.bg });
    axl_line(ctx, Hg, 'handle', [[[0, 0], [0, -18 * u]]], { col: sc.fg, w: 6 * u, cap: 2 });
    axl_fin(ctx, Hg, { at: [(px + q0[0]) / 2, py - hg], pre: pre, posEx: '[hx,hy]' });
    axl_line(ctx, S, 'legs', [[[px, py], [(px + q0[0]) / 2, py - hg], q0]], { col: sc.fg, w: 2.6 * u, cap: 2, join: 2, pre: pre, pathEx: 'createPath([[px,py],[hx,hy],[qx,qy]],[],[],false)' });
    axl_line(ctx, S, 'drawn circle', [arc], { col: axl_col(ctx, p), w: 3 * u, cap: 1, join: 2, pre: pre, end: '100*Math.min(Math.abs(sw),6.2832)/6.2832' });
});

/* ---- xlBezier — ベジェ曲線: a vector-tool curve beside the lyric: anchor points, control handles that slowly swing,
   the curve following them (a real two-point bezier driven by createPath) */
axl_reg('xlBezier', function (ctx, bb, p, u) {
    var ax = axl_axes(ctx, bb), len = ax.L1 - ax.L0, hh0 = jzClamp(len * 0.14, 54 * u, 130 * u), m = axl_mg(ctx) * 0.5, sc = ctx.sc, acc = axl_acc(ctx), i;
    var b = axl_sideBand(ctx, ax, hh0 + 8 * u, !!p.low, 18 * u + (ax.C1 - ax.C0) * 0.06), hh = Math.max(6 * u, b.h - 8 * u), mo = 0.3 + 0.7 * ctx.fx.motion;
    var a0 = Math.max(m, ax.L0 - 10 * u), a1 = Math.min(ax.AM - m, ax.L1 + 10 * u), ph = p.r * 6, mA = axl_M(ax, a0, b.edge), mB = axl_M(ax, a1, b.edge), r = 6 * u;
    var V = function (a, c) { return ax.vert ? '[' + c + ',' + a + ']' : '[' + a + ',' + c + ']'; };
    var pre = 'var e1=ein(0.3,0.1),ph=' + jzN(ph) + ',mo=' + jzN(mo) + ',ln=' + jzN(len) + ',hh=' + jzN(b.s * hh) + ',ed=' + jzN(b.edge) +
        ',HAa=' + jzN(a0) + '+ln*(0.28+0.06*mo*Math.sin(t*0.9+ph))*e1,HAc=ed+hh*(0.6+0.38*mo*Math.sin(t*1.3+ph))*e1' +
        ',HBa=' + jzN(a1) + '-ln*(0.28+0.06*mo*Math.cos(t*1.1+ph))*e1,HBc=ed+hh*(0.6+0.38*mo*Math.sin(t*1.3+ph+2.3))*e1' +
        ',A=' + axl_pt(mA) + ',B=' + axl_pt(mB) + ',HA=' + V('HAa', 'HAc') + ',HB=' + V('HBa', 'HBc') + ';';
    var a = 'Math.min(1,o*1.5)', ends = [[mB, 'HB'], [mA, 'HA']];
    var S = axl_layer(ctx, 'bezier handles');
    for (i = 0; i < 2; i++) axl_line(ctx, S, 'control point', null, { ells: [[0, 0, r]], col: acc, w: 2 * u, fill: sc.bg, at: ends[i][0], pre: pre, posEx: ends[i][1], scEx: '[value[0]*e1,value[1]*e1]', gop: 'o' });
    for (i = 0; i < 2; i++) axl_line(ctx, S, 'anchor', [[[-r, -r], [r, -r], [r, r], [-r, r]]], { closed: true, fill: acc, at: ends[i][0], scEx: 'var s=ob(t/0.25,2)*o;[value[0]*s,value[1]*s]' });
    for (i = 0; i < 2; i++) axl_line(ctx, S, 'handle', [[ends[i][0], ends[i][0]]], { col: sc.sub, w: 1.6 * u, cap: 1, pre: pre, pathEx: 'createPath([' + (i ? 'A' : 'B') + ',' + ends[i][1] + '],[],[],false)', gop: a });
    axl_line(ctx, S, 'curve', [[mA, mB]], { col: axl_col(ctx, p), w: 3 * u, cap: 2, join: 2, pre: pre,
        pathEx: 'createPath([A,B],[[0,0],[HB[0]-B[0],HB[1]-B[1]]],[[HA[0]-A[0],HA[1]-A[1]],[0,0]],false)', start: '100*(1-o)', end: '100*ioc((t-0.2)/0.55)', gop: a });
});

// ================================================================ connectors, pointers, marks

/* ---- xlEdgeTether — 張り糸: strings stretched taut from the lyric's frame to the screen edges, twanging like plucked strings
   (the pluck scales a half-sine bow across the string; the stroke sits outside that group and keeps its width) */
axl_reg('xlEdgeTether', function (ctx, bb, p, u) {
    var W = ctx.W, H = ctx.H, f = axl_frame(ctx, bb, axl_pad(bb, u, 0.8)), sc = ctx.sc, acc = axl_acc(ctx), dirs = [[1, 0], [-1, 0], [0, -1], [0, 1]], n = p.n + 1, k, i, q = 7 * u;
    var S = axl_layer(ctx, 'edge tethers');
    for (k = n - 1; k >= 0; k--) {
        var dd = dirs[(k + p.v + (p.right ? 0 : 1)) % 4], dx = dd[0], dy = dd[1], lat = axl_rs(p.seed, k, 1) * 0.3;
        var ax = dx ? (dx > 0 ? f.x1 : f.x0) : f.cx + lat * f.w, ay = dy ? (dy > 0 ? f.y1 : f.y0) : f.cy + lat * f.h;
        var ex = dx ? (dx > 0 ? W : 0) : ax, ey = dy ? (dy > 0 ? H : 0) : ay, L = axl_hyp(ex - ax, ey - ay);
        if (L < 12 * u) continue;
        var dl = k * 0.07, pts = [];
        var pre = 'var e=oc((t-' + jzN(dl) + ')/0.3),tau=t-' + jzN(0.3 + dl) + ',cyc=tau>0?tau%1.9:99,amp=Math.exp(-cyc*3)*Math.sin(cyc*40)*M*(e>=1?1:0);if(Math.abs(amp)<0.001)amp=0.001;';
        for (i = 0; i <= 16; i++) { var s = i / 16, d = 10 * u * Math.sin(Math.PI * s); pts.push([jzLerp(ax, ex, s) - dy * d, jzLerp(ay, ey, s) + dx * d]); }
        var qx = ex - (dx > 0 ? q * 2 : dx < 0 ? 0 : q), qy = ey - (dy > 0 ? q * 2 : dy < 0 ? 0 : q);
        axl_line(ctx, S, 'edge clip ' + (k + 1), [[[qx, qy], [qx + q * 2, qy], [qx + q * 2, qy + q * 2], [qx, qy + q * 2]]], { closed: true, fill: acc, pre: pre, gop: '(e>=1?1:0)*o' });
        axl_line(ctx, S, 'eyelet ' + (k + 1), null, { ells: [[ax, ay, 5.5 * u]], col: acc, w: 2.2 * u, fill: sc.bg, pre: pre, gop: 'e*o' });
        var G = axl_grp(S, 'string ' + (k + 1));
        axl_line(ctx, G, 'bow', [pts], { pivot: [ax, ay], pre: pre, scEx: dx ? '[value[0],value[1]*amp]' : '[value[0]*amp,value[1]]' });
        axl_fin(ctx, G, { col: sc.fg, w: 2 * u, op: 90, cap: 1, join: 2, pre: pre, start: '100*(1-o)', end: '100*e' });
    }
});

/* ---- xlHandArrow — 手描き矢印: a hand-drawn arrow swooping in from the free space, its head flicked on at the end */
axl_reg('xlHandArrow', function (ctx, bb, p, u) {
    var W = ctx.W, H = ctx.H, m = axl_mg(ctx) * 0.8, c = axl_col(ctx, p), sx = p.right ? 1 : -1, sy = p.low ? 1 : -1, i, d;
    var rooms = { r: W - m - bb.x1, l: bb.x0 - m, t: bb.y0 - m, b: H - m - bb.y1 };
    var hs = sx > 0 ? ['r', 'l'] : ['l', 'r'], vs = sy > 0 ? ['b', 't'] : ['t', 'b'];
    var ord = p.v % 2 ? [hs[0], vs[0], hs[1], vs[1]] : [vs[0], hs[0], vs[1], hs[1]], sd = null;
    for (i = 0; i < 4; i++) if (rooms[ord[i]] >= 110 * u) { sd = ord[i]; break; }
    if (!sd) { sd = ord[0]; for (i = 1; i < 4; i++) if (rooms[ord[i]] > rooms[sd]) sd = ord[i]; }
    var room = Math.max(rooms[sd], 30 * u), len = jzClamp(room * 0.75, 30 * u, 240 * u), cx = (bb.x0 + bb.x1) / 2, cy = (bb.y0 + bb.y1) / 2, T, St, C;
    if (sd === 'r' || sd === 'l') {
        d = sd === 'r' ? 1 : -1; T = [(d > 0 ? bb.x1 : bb.x0) + d * 16 * u, cy + sy * axl_bh(bb) * 0.15];
        St = [T[0] + d * len, jzClamp(T[1] + sy * len * 0.6, m, H - m)]; C = [jzLerp(T[0], St[0], 0.8), T[1] - sy * len * 0.1];
    } else {
        d = sd === 'b' ? 1 : -1; T = [cx + sx * axl_bw(bb) * 0.2, (d > 0 ? bb.y1 : bb.y0) + d * 16 * u];
        St = [jzClamp(T[0] + sx * len * 0.7, m, W - m), T[1] + d * len]; C = [T[0] - sx * len * 0.12, jzLerp(T[1], St[1], 0.8)];
    }
    var raw = axl_quad(St, C, T, 26);
    for (i = 0; i < raw.length; i++) { var k = Math.sin(i / 26 * Math.PI) * 2.6 * u; raw[i] = [raw[i][0] + axl_noise1(i * 0.45, p.seed) * k, raw[i][1] + axl_noise1(i * 0.45 + 9, p.seed) * k]; }
    var an = Math.atan2(C[1] - T[1], C[0] - T[0]), hl = Math.min(26 * u, len * 0.4);
    var S = axl_layer(ctx, 'sketch arrow', 'Math.min(1,o*1.6)');
    axl_line(ctx, S, 'head', [[T, [T[0] + Math.cos(an - 0.52) * hl, T[1] + Math.sin(an - 0.52) * hl]], [T, [T[0] + Math.cos(an + 0.48) * hl * 0.85, T[1] + Math.sin(an + 0.48) * hl * 0.85]]],
        { col: c, w: 3.2 * u, cap: 2, join: 2, end: '100*ein(0.2,0.45)' });
    axl_line(ctx, S, 'swoop', [raw], { col: c, w: 3.2 * u, cap: 2, join: 2, start: '100*(1-o)', end: '100*ioc(t/0.5)' });
});

/* ---- xlAccentTicks — ちょん線: three short strokes that flick outward from the lyric's corners, and flick again now and then
   (the later flick scales each corner's strokes outward from the corner) */
axl_reg('xlAccentTicks', function (ctx, bb, p, u) {
    var sx = p.right ? 1 : -1, c = axl_col(ctx, p), k0 = jzClamp(axl_bh(bb) / (170 * u), 0.8, 1.7), cs = [[sx, -1], [-sx, 1], [-sx, -1]], das = [-0.46, 0, 0.46], ci, i;
    var S = axl_layer(ctx, 'accent ticks');
    for (ci = p.n - 1; ci >= 0; ci--) {
        var cxs = cs[ci][0], cys = cs[ci][1], ox = (cxs > 0 ? bb.x1 : bb.x0) - cxs * 6 * u, oy = (cys > 0 ? bb.y1 : bb.y0) - cys * 6 * u, base = Math.atan2(cys * 0.75, cxs), rb = 20 * u * k0;
        var pre = 'var tau=t-' + jzN(ci * 0.12) + ',cyc=tau>0?tau%1.5:0,nud=' + jzN(7 * u * ctx.fx.motion) + '*Math.exp(-cyc*7)*(tau>1.5?1:0);';
        var G = axl_grp(S, 'corner ' + (ci + 1)), R = axl_grp(G, 'flick');
        for (i = 0; i < 3; i++) {
            var an = base + das[i] * cxs * cys, L = (i === 1 ? 42 : 30) * u * k0;
            axl_line(ctx, R, 'tick ' + (i + 1), [[[ox + Math.cos(an) * rb, oy + Math.sin(an) * rb], [ox + Math.cos(an) * (rb + L), oy + Math.sin(an) * (rb + L)]]],
                { pre: pre + 'var e=oe((tau-' + jzN(i * 0.03) + ')/0.28);', start: '100*e*(1-o)', end: '100*e' });
        }
        axl_fin(ctx, R, { pivot: [ox, oy], pre: pre, scEx: 'var s=1+nud/' + jzN(rb) + ';[value[0]*s,value[1]*s]' });
        axl_fin(ctx, G, { col: c, w: 4.4 * u * Math.min(k0, 1.3), cap: 2, pre: pre, gop: 'tau>0?Math.min(1,o*2):0' });
    }
});

/* ---- xlPennant — 旗ピン: a pin planted at a corner of the lyric: the pole rises and a pennant unfurls and flutters (createPath) */
axl_reg('xlPennant', function (ctx, bb, p, u) {
    var W = ctx.W, H = ctx.H, m = axl_mg(ctx) * 0.5, rt = bb.y0 - m, rb = H - m - bb.y1, sy = (rt >= 60 * u || rt >= rb) ? -1 : 1, room = sy < 0 ? rt : rb, k;
    var hgt = jzClamp(room * 0.8, 24 * u, 120 * u), s0 = p.right ? 1 : -1, xs = p.big ? [s0, -s0] : [s0], c = axl_col(ctx, { accent: !p.accent }), fg = ctx.sc.fg;
    var FL = jzClamp(hgt * 0.8, 26 * u, 96 * u), FH = jzClamp(hgt * 0.42, 14 * u, 50 * u);
    var S = axl_layer(ctx, 'pennant pin');
    for (k = xs.length - 1; k >= 0; k--) {
        var sx = xs[k], x = jzClamp(sx > 0 ? bb.x1 + 6 * u : bb.x0 - 6 * u, m, W - m), y0 = sy < 0 ? bb.y0 - 6 * u : bb.y1 + 6 * u;
        var dir = (sx > 0 ? x + FL * 1.05 < W - m * 0.6 : x - FL * 1.05 < m * 0.6) ? 1 : -1, yT = y0 + sy * hgt;
        var pre = 'var rise=ob((t-' + jzN(k * 0.12) + ')/0.4,1.4)*o,x=' + jzN(x) + ',yT=' + jzN(y0) + '+' + jzN(sy * hgt) + '*rise,fl=' + jzN(FL) + '*ein(0.45,' + jzN(0.2 + k * 0.12) + ')*o,fh=' + jzN(FH) + '*Math.min(1,rise);';
        axl_line(ctx, S, 'pennant ' + (k + 1), [[[x, yT], [x + dir * FL, yT - sy * FH / 2], [x, yT - sy * FH]]], { closed: true, fill: c, fop: 95, pre: pre,
            pathEx: 'var A=[],B=[],i,s,w,yB=yT-' + jzN(sy) + '*fh,ym=(yT+yB)/2;for(i=0;i<=8;i++){s=i/8;w=Math.sin(s*5-time*6)*fh*0.16*s*' + jzN(0.3 + 0.7 * ctx.fx.motion) +
                ';A.push([x+' + dir + '*fl*s,yT+(ym-yT)*s+w]);B.unshift([x+' + dir + '*fl*s,yB+(ym-yB)*s+w]);}createPath(A.concat(B),[],[],true)', gop: '(fl<1||rise<=0)?0:1' });
        axl_line(ctx, S, 'pin ' + (k + 1), null, { ells: [[x, y0, 3.6 * u]], fill: fg, pre: pre, gop: 'rise>0?1:0' });
        axl_line(ctx, S, 'pole ' + (k + 1), [[[x, y0], [x, y0 + sy * hgt * 1.2]]], { col: fg, w: 2.4 * u, cap: 2, pre: pre, end: '100*rise/1.2' });
    }
});

/* ---- xlCheckBox — チェック欄: a drawn check box (or circle) beside the lyric, ticked by hand with an overshooting stroke */
axl_reg('xlCheckBox', function (ctx, bb, p, u) {
    var s = jzClamp(Math.min(axl_bw(bb), axl_bh(bb)) * 0.5, 46 * u, 92 * u), q = { right: p.right, low: p.low, corner: false }, sd = p.seed, i, pts;
    var sp = axl_spot(ctx, bb, s * 1.25, s * 1.25, q, 18 * u), x = sp.x + s * 0.05, y = sp.y + s * 0.2, k = Math.max(0.8, s / (44 * u));
    var j = function (n) { return axl_rs(sd, n) * s * 0.035; };
    if (p.v % 2) { pts = []; for (i = 0; i <= 30; i++) { var an = -2 + i / 30 * AXL_TAU * 1.07, r = s * 0.5 * (1 + 0.04 * Math.sin(i * 0.9 + sd % 7)); pts.push([x + s / 2 + Math.cos(an) * r, y + s / 2 + Math.sin(an) * r]); } }
    else pts = [[x + j(1), y + j(2)], [x + s + j(3), y + j(4)], [x + s + j(5), y + s + j(6)], [x + j(7), y + s + j(8)], [x + j(1) - 1, y + j(2) - s * 0.08]];
    var chk = axl_quad([x + s * 0.2, y + s * 0.5], [x + s * 0.34, y + s * 0.62], [x + s * 0.44, y + s * 0.8], 4).concat(axl_quad([x + s * 0.44, y + s * 0.8], [x + s * 0.66, y + s * 0.2], [x + s * 1.12, y - s * 0.14], 8));
    var S = axl_layer(ctx, 'check box', 'Math.min(1,o*1.6)');
    axl_line(ctx, S, 'tick', [chk], { col: axl_acc(ctx), w: 4.6 * u * k, cap: 2, join: 2, end: '100*ioc((t-0.42)/0.28)' });
    axl_line(ctx, S, 'box', [pts], { col: ctx.sc.fg, w: 2.4 * u * k, cap: 2, join: 2, end: '100*ioc(t/0.4)' });
});

/* ---- xlCutLine — 切り取り線: a dashed cut line across the screen, opened by a pair of scissors that keeps snipping */
axl_reg('xlCutLine', function (ctx, bb, p, u) {
    var ax = axl_axes(ctx, bb), b = axl_sideBand(ctx, ax, 56 * u, !!p.low, 16 * u + (ax.C1 - ax.C0) * 0.08), c = ctx.sc.fg, rev = !!p.right, AM = ax.AM, k = u * 1.7, sg;
    var col = p.accent ? axl_acc(ctx) : c, a = 'Math.min(1,o*1.6)';
    var pre = 'var mv=ioc(t/0.85),s=' + jzN(AM) + '*(0.03+0.85*mv)+Math.max(0,t-0.85)*' + jzN(5 * u * ctx.fx.motion) + ',X=' + (rev ? jzN(AM) + '-s' : 's') +
        ',ang=(9+15*Math.abs(Math.sin(t*(mv<1?11:3.5))))*' + jzN(0.4 + 0.6 * ctx.fx.motion) + ';';
    var S = axl_layer(ctx, 'cut line', a);
    var G = axl_grp(S, 'scissors');
    axl_line(ctx, G, 'pivot', null, { ells: [[0, 0, 1.8 * k]], fill: col });
    for (sg = -1; sg <= 1; sg += 2) axl_line(ctx, G, sg < 0 ? 'upper blade' : 'lower blade', [[[24 * k, 0], [-13 * k, 0]]], { ells: [[-19.5 * k, -sg * 2.5 * k, 6.5 * k]], col: col, w: 2.2 * k, cap: 2, pre: pre, rotEx: sg + '*ang' });
    axl_fin(ctx, G, { at: axl_M(ax, rev ? AM : 0, b.c), rot: (ax.vert ? 90 : 0) + (rev ? 180 : 0), pre: pre, posEx: ax.vert ? '[' + jzN(b.c) + ',X]' : '[X,' + jzN(b.c) + ']', gop: 'ein(0.2)' });
    axl_line(ctx, S, 'dashes', [axl_Ms(ax, [[rev ? AM : 0, b.c], [rev ? 0 : AM, b.c]])], { col: c, w: 2.2 * u, op: 90, cap: 1, dash: [14 * u, 9 * u], pre: pre,
        start: '90*(1-o)', end: '100*(s-' + jzN(28 * u) + ')/' + jzN(AM) });
});

/* ---- xlSeam — 縫い目: a seam stitched round the screen margin (running, zig-zag or cross stitch) by a travelling needle
   (cross stitches are Repeaters along the four straight sides; the few that would sit on the rounded corners are left out) */
axl_reg('xlSeam', function (ctx, bb, p, u) {
    var W = ctx.W, H = ctx.H, ins = axl_mg(ctx) * 0.55, c = axl_col(ctx, p), v = p.v % 3, i, j;
    var rp = axl_rrect(ins, ins, W - ins, H - ins, 20 * u, 5), pa = axl_mk(rp, true), L = pa.L, a = 'Math.min(1,o*1.5)';
    var st0 = L * ((p.right ? 0.25 : 0) + (p.low ? 0.5 : 0)), lnEx = 'var ln=' + jzN(Math.min(W, H) * 0.34) + '*ioc(t/0.7)*o;';
    var S = axl_layer(ctx, 'stitched seam');
    if (!p.corner) {                                                          // the needle leads the thread, then slips away
        var N = axl_grp(S, 'needle');
        axl_line(ctx, N, 'eye', null, { ells: [[5 * u, 0, 2.6 * u]], col: ctx.sc.fg, w: 1.2 * u });
        axl_line(ctx, N, 'shaft', [[[0, 0], [50 * u, 0]]], { col: ctx.sc.fg, w: 2 * u, cap: 2 });
        axl_fin(ctx, N, { pre: axl_bake(pa) + 'var q=at(P,C,md(' + jzN(st0) + '+Lt*ioc(t/1),Lt));', posEx: '[q[0],q[1]]', rotEx: '(q[2]-0.35)*180/Math.PI', gop: '(1-ic((t-0.95)/0.3))*o' });
    }
    if (v < 2) {
        var path = rp, step, n, o;
        if (v === 1) {
            step = 12 * u * Math.max(1, L / (400 * 12 * u)); n = Math.max(4, Math.floor(L / step)); path = [];
            for (i = 0; i < n; i++) { var q = axl_at(pa, i * step), d = 5 * u * (i % 2 ? 1 : -1); path.push([q[0] - Math.sin(q[2]) * d, q[1] + Math.cos(q[2]) * d]); }
        }
        for (j = 0; j < (p.corner ? 2 : 1); j++) {
            o = { closed: true, col: c, w: (v ? 2.2 : 2.8) * u, op: 85, cap: 1, join: v ? 1 : 2, gop: a };
            if (!v) o.dash = [17 * u, 11 * u];
            if (p.corner) { o.pre = lnEx; o.off = (st0 / L + j * 0.5 - 0.5) * 360; o.start = '50-100*ln/' + jzN(L); o.end = '50+100*ln/' + jzN(L); }
            else { o.pre = 'var e=ioc(t/1);'; o.off = st0 / L * 360; o.start = '100*e*(1-o)'; o.end = '100*e'; }
            axl_line(ctx, S, v ? 'zig-zag stitch' : 'running stitch', [path], o);
        }
    } else {
        var stp = 27 * u * Math.max(1, L / (400 * 27 * u)), d2 = 5 * u, segs = [], cum = pa.cum, cuts = [[5, 6], [11, 12], [17, 18], [23, 24]];
        if (rp.length < 24) cuts = [[0, 1], [1, 2], [2, 3], [3, 4]];
        for (i = 0; i < 4; i++) {
            var sa = cum[cuts[i][0]], sb = cum[cuts[i][1]];
            if (st0 > sa + 1e-6 && st0 < sb - 1e-6) { segs.push([sa, st0 - 1e-6]); segs.push([st0, sb]); } else segs.push([sa, sb]);
        }
        var spEx = p.corner ? lnEx + 'var sp=[[' + jzN(st0) + '-ln,' + jzN(st0) + '+ln],[' + jzN(st0 + L / 2) + '-ln,' + jzN(st0 + L / 2) + '+ln]];'
            : 'var e=ioc(t/1),sp=[[' + jzN(st0) + '+' + jzN(L) + '*e*(1-o),' + jzN(st0) + '+' + jzN(L) + '*e]];';
        for (i = 0; i < segs.length; i++) {
            var iA = Math.ceil(segs[i][0] / stp), iB = Math.floor(segs[i][1] / stp), cnt = iB - iA + 1;
            if (cnt < 1) continue;
            var b0 = axl_at(pa, iA * stp), tx = Math.cos(b0[2]), ty = Math.sin(b0[2]);
            var pre = spEx + 'var j,k,pp,vv,j0=-1,j1=-2;for(j=0;j<' + cnt + ';j++){pp=(' + iA + '+j)*' + jzN(stp) + ';vv=0;for(k=0;k<sp.length;k++){if(sp[k][1]>sp[k][0]&&md(pp-sp[k][0],' + jzN(L) + ')<=sp[k][1]-sp[k][0])vv=1;}if(vv){if(j0<0)j0=j;j1=j;}}';
            axl_line(ctx, S, 'cross stitches ' + (i + 1), [[[b0[0] - d2, b0[1] - d2], [b0[0] + d2, b0[1] + d2]], [[b0[0] - d2, b0[1] + d2], [b0[0] + d2, b0[1] - d2]]], { col: c, w: 2.2 * u, op: 85, cap: 2, pre: pre,
                rep: { n: cnt, pos: [tx * stp, ty * stp], copiesEx: 'Math.max(0,j1-j0+1)', offEx: 'Math.max(0,j0)' }, gop: a });
        }
    }
});
