// ================================================================ x2decA part 1 (AE port of src/11p_x2_decA.js — 追加分2 line-work decor)
// Shared helpers (prefix axl_) + frames (xlGapFrame … xlFocusHunt), brackets (xlCurlyBrace … xlRepeatBars) and
// rules (xlDoubleRule … xlWingLines). Part 2 (p_x2_decA2.jsx) holds the measuring / drafting marks, connectors and marks.
// decor.build(ctx, bb, d): layers live in the CONTENT comp (time 0 = cut start). Every entry is main-pass line work in the
// browser, so its layers are kept out of the tinted ghosts (jzNoGhost, done once in axl_reg), and it waits until the lyric's
// entrance has mostly settled: expressions use t = time - ST (ST = 0.6 × inDur, at most 0.35 s) and o = 1 - inCubic(exit).
// The lyric's box is the resting one (the browser also keeps the last real box per cut), so all geometry is laid out at
// build time and moved with Trim Paths, group transforms, dashes and repeaters; the few shapes that really change form
// (compass legs, bezier curve, pennant) use createPath().

// ---------------------------------------------------------------- shared helpers
var AXL_D = Math.PI / 180, AXL_TAU = Math.PI * 2;
// the browser's deterministic hash J.h / J.r / J.rs and J.noise1 (so seeded wobbles match the web frame)
function axl_h(a, b, c, d, e) {
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
function axl_r(a, b, c, d, e) { return axl_h(a, b, c, d, e) / 4294967296; }
function axl_rs(a, b, c, d, e) { return axl_r(a, b, c, d, e) * 2 - 1; }
function axl_noise1(x, seed) { var i = Math.floor(x), f = x - i, k = f * f * (3 - 2 * f); return jzLerp(axl_rs(seed, i), axl_rs(seed, i + 1), k); }
function axl_u(ctx) { return jzU(ctx) / 1080; }                       // browser U(env): 1 at a 1080 short side
function axl_mg(ctx) { return jzU(ctx) * 0.05; }                      // safe margin
function axl_vis(sc, c) { return (c && jzContrast(c, sc.bg) >= 1.6) ? c : sc.fg; }
function axl_acc(ctx) { return axl_vis(ctx.sc, ctx.sc.accent); }
function axl_col(ctx, p) { return p.accent ? axl_acc(ctx) : ctx.sc.fg; }
function axl_bw(bb) { return bb.x1 - bb.x0; }
function axl_bh(bb) { return bb.y1 - bb.y0; }
function axl_hit(x0, y0, x1, y1, bb, pad) { pad = pad || 0; return !(x1 < bb.x0 - pad || x0 > bb.x1 + pad || y1 < bb.y0 - pad || y0 > bb.y1 + pad); }
function axl_hyp(x, y) { return Math.sqrt(x * x + y * y); }
function axl_cx(hex) { var c = jzHex(hex); return '[' + jzN(c[0]) + ',' + jzN(c[1]) + ',' + jzN(c[2]) + ',1]'; }
function axl_pt(p) { return '[' + jzN(p[0]) + ',' + jzN(p[1]) + ']'; }
// lyric bbox kept on screen (the browser's getBB)
function axl_bb(ctx, bb) {
    var W = ctx.W, H = ctx.H, b;
    if (bb && isFinite(bb.x0 + bb.x1 + bb.y0 + bb.y1) && bb.x1 > bb.x0 && bb.y1 > bb.y0) {
        b = { x0: Math.max(bb.x0, 0), x1: Math.min(bb.x1, W), y0: Math.max(bb.y0, 0), y1: Math.min(bb.y1, H) };
        if (b.x1 <= b.x0) { b.x0 = bb.x0; b.x1 = bb.x1; }
        if (b.y1 <= b.y0) { b.y0 = bb.y0; b.y1 = bb.y1; }
        return b;
    }
    return { x0: W * 0.35, x1: W * 0.65, y0: H * 0.4, y1: H * 0.6 };
}
// padded frame round the lyric, kept on screen
function axl_frame(ctx, bb, pad) {
    var m = axl_mg(ctx) * 0.35;
    var x0 = Math.max(m, bb.x0 - pad), y0 = Math.max(m, bb.y0 - pad), x1 = Math.min(ctx.W - m, bb.x1 + pad), y1 = Math.min(ctx.H - m, bb.y1 + pad);
    return { x0: x0, y0: y0, x1: x1, y1: y1, w: x1 - x0, h: y1 - y0, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
}
function axl_pad(bb, u, k) { return (24 * u + Math.min(axl_bw(bb), axl_bh(bb)) * 0.14) * (k == null ? 1 : k); }
// "along / across" axes of the lyric: horizontal text -> along = x; vertical text -> along = y
function axl_axes(ctx, bb, forceH) {
    var vert = !forceH && axl_bh(bb) > axl_bw(bb) * 1.25;
    return vert ? { vert: true, L0: bb.y0, L1: bb.y1, C0: bb.x0, C1: bb.x1, AM: ctx.H, CM: ctx.W }
        : { vert: false, L0: bb.x0, L1: bb.x1, C0: bb.y0, C1: bb.y1, AM: ctx.W, CM: ctx.H };
}
function axl_M(ax, a, c) { return ax.vert ? [c, a] : [a, c]; }
function axl_Ms(ax, list) { var o = [], i; for (i = 0; i < list.length; i++) o.push(axl_M(ax, list[i][0], list[i][1])); return o; }
// expression results that move / scale a group along (or across) the lyric's axis
function axl_along(ax, ex) { return ax.vert ? '[value[0],value[1]+(' + ex + ')]' : '[value[0]+(' + ex + '),value[1]]'; }
function axl_scAlong(ax, ex) { return ax.vert ? '[value[0],value[1]*(' + ex + ')]' : '[value[0]*(' + ex + '),value[1]]'; }
function axl_scAcross(ax, ex) { return ax.vert ? '[value[0]*(' + ex + '),value[1]]' : '[value[0],value[1]*(' + ex + ')]'; }
// a free band of height h beside the lyric on the across axis (plus = below / right)
function axl_sideBand(ctx, ax, h, plus, gap) {
    var m = axl_mg(ctx) * 0.5, rp = ax.CM - m - (ax.C1 + gap), rm = ax.C0 - gap - m, s = plus ? 1 : -1;
    if ((s > 0 ? rp : rm) < h) { if ((s > 0 ? rm : rp) >= h) s = -s; else s = rp >= rm ? 1 : -1; }
    var room = Math.max(s > 0 ? rp : rm, 4), hh = Math.min(h, room), edge = s > 0 ? ax.C1 + gap : ax.C0 - gap;
    return { s: s, room: room, edge: edge, c: edge + s * hh / 2, h: hh };
}
// a free w×h box near the lyric or in a screen corner
function axl_spot(ctx, bb, w, h, p, gap) {
    var W = ctx.W, H = ctx.H, m = axl_mg(ctx) * 0.7, sx = p.right ? 1 : -1, sy = p.low ? 1 : -1;
    var ord = [[sx, sy], [-sx, sy], [sx, -sy], [-sx, -sy]], near = [], cor = [], i, a, b, all, x, y;
    for (i = 0; i < 4; i++) {
        a = ord[i][0]; b = ord[i][1];
        near.push([a > 0 ? bb.x1 + gap : bb.x0 - gap - w, (bb.y0 + bb.y1) / 2 - h / 2]);
        near.push([a > 0 ? bb.x1 - w : bb.x0, b > 0 ? bb.y1 + gap : bb.y0 - gap - h]);
        cor.push([a > 0 ? W - m - w : m, b > 0 ? H - m - h : m]);
    }
    all = p.corner ? cor.concat(near) : near.concat(cor);
    for (i = 0; i < all.length; i++) {
        x = all[i][0]; y = all[i][1];
        if (x < m - 1 || y < m - 1 || x + w > W - m + 1 || y + h > H - m + 1) continue;
        if (!axl_hit(x, y, x + w, y + h, bb, gap * 0.4)) return { x: x, y: y, ok: true };
    }
    return { x: jzClamp(cor[0][0], 0, Math.max(0, W - w)), y: jzClamp(cor[0][1], 0, Math.max(0, H - h)), ok: false };
}
// polyline with cumulative lengths (open = the points as given, pts = closed copy when asked)
function axl_mk(pts, closed) {
    var q = closed ? pts.concat([pts[0]]) : pts, cum = [0], i;
    for (i = 1; i < q.length; i++) cum.push(cum[i - 1] + axl_hyp(q[i][0] - q[i - 1][0], q[i][1] - q[i - 1][1]));
    return { open: pts, pts: q, cum: cum, L: cum[cum.length - 1] || 1e-6 };
}
function axl_at(pa, s) {
    var pts = pa.pts, cum = pa.cum, i = 1; s = jzClamp(s, 0, pa.L);
    while (i < cum.length - 1 && cum[i] < s) i++;
    var d = (cum[i] - cum[i - 1]) || 1e-6, k = (s - cum[i - 1]) / d;
    return [jzLerp(pts[i - 1][0], pts[i][0], k), jzLerp(pts[i - 1][1], pts[i][1], k), Math.atan2(pts[i][1] - pts[i - 1][1], pts[i][0] - pts[i - 1][0])];
}
// the same polyline inside an expression: P (points), C (cumulative lengths), Lt (length), at(P,C,s) -> [x, y, angle]
function axl_bake(pa) {
    var a = [], c = [], i;
    for (i = 0; i < pa.pts.length; i++) { a.push(axl_pt(pa.pts[i])); c.push(jzN(pa.cum[i])); }
    return 'var P=[' + a.join(',') + '],C=[' + c.join(',') + '],Lt=' + jzN(pa.L) + ';' +
        'function at(P,C,s){var n=C.length;s=Math.max(0,Math.min(C[n-1],s));var i=1;while(i<n-1&&C[i]<s)i++;var d=(C[i]-C[i-1])||1e-6,k=(s-C[i-1])/d;' +
        'return [P[i-1][0]+(P[i][0]-P[i-1][0])*k,P[i-1][1]+(P[i][1]-P[i-1][1])*k,Math.atan2(P[i][1]-P[i-1][1],P[i][0]-P[i-1][0])];}\n';
}
// point lists (angles in degrees, 0 = right, clockwise on screen)
function axl_arc(cx, cy, r, a0, a1, n) { var o = [], i, a; n = n || 24; for (i = 0; i <= n; i++) { a = (a0 + (a1 - a0) * i / n) * AXL_D; o.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } return o; }
function axl_quad(a, b, c, n) { var o = [], i, t, k; n = n || 10; for (i = 0; i <= n; i++) { t = i / n; k = 1 - t; o.push([k * k * a[0] + 2 * k * t * b[0] + t * t * c[0], k * k * a[1] + 2 * k * t * b[1] + t * t * c[1]]); } return o; }
// rounded rectangle as an open list of points, clockwise from the top-left arc
function axl_rrect(x0, y0, x1, y1, r, n) {
    n = n || 8; r = Math.max(0, Math.min(r, (x1 - x0) / 2, (y1 - y0) / 2));
    if (r < 0.6) return [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
    var cs = [[x0 + r, y0 + r, 180], [x1 - r, y0 + r, 270], [x1 - r, y1 - r, 0], [x0 + r, y1 - r, 90]], o = [], k;
    for (k = 0; k < 4; k++) o = o.concat(axl_arc(cs[k][0], cs[k][1], r, cs[k][2], cs[k][2] + 90, n));
    return o;
}

// ---- expressions: jzTH (DUR IN OS OD, easings, PO, K) + t (time after the settle delay), V (started), o (exit factor), M (motion)
var AXL_FNS = 'function ioc(x){x=cl(x);return x<0.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;}function md(a,n){return ((a%n)+n)%n;}function ein(d,dl){return oe((t-(dl||0))/d);}\n';
function axl_settle(ctx) { return jzClamp((ctx.cut.inDur || 0) * 0.6, 0, 0.35); }
function axl_H(ctx) { return jzTH(ctx) + AXL_FNS + 'var ST=' + jzN(axl_settle(ctx)) + ',t=time-ST,V=t>0?1:0,o=K,M=' + jzN(ctx.fx.motion) + ';\n'; }
function axl_ex(ctx, prop, ex) { jzSetExpr(prop, axl_H(ctx) + ex); }
// a shape layer in comp coordinates (position 0,0); opacity = value × started × extra factor
function axl_layer(ctx, name, opEx) {
    var S = jzShapeLayer(ctx, name, 0, 0);
    axl_ex(ctx, jzXf(S, 'ADBE Opacity'), 'value*V*(' + (opEx || '1') + ')');
    return S;
}
// a group in a layer or inside another group.  AE rule: adding a property invalidates the references to its siblings,
// so every group is finished (axl_fin) before the next one is added to the same parent
function axl_grp(par, name) {
    var g;
    if (par.matchName === 'ADBE Vector Group') { g = jzVecs(par).addProperty('ADBE Vector Group'); if (name) g.name = name; return g; }
    return jzGrp(par, name);
}
// dashes: every entry is fetched by matchName after all were added (adding one invalidates the others)
function axl_dash(ctx, s, on, gap, offEx, onEx, gapEx) {
    var D = s.property('ADBE Vector Stroke Dashes'), pr;
    try { D.addProperty('ADBE Vector Stroke Dash 1'); } catch (e) {}
    try { D.addProperty('ADBE Vector Stroke Gap 1'); } catch (e1) {}
    if (offEx) { try { D.addProperty('ADBE Vector Stroke Offset'); } catch (e2) {} }
    try {
        pr = D.property('ADBE Vector Stroke Dash 1'); pr.setValue(Math.max(0.01, on)); if (onEx) axl_ex(ctx, pr, onEx);
        pr = D.property('ADBE Vector Stroke Gap 1'); pr.setValue(Math.max(0.01, gap)); if (gapEx) axl_ex(ctx, pr, gapEx);
        if (offEx) { pr = D.property('ADBE Vector Stroke Offset'); axl_ex(ctx, pr, offEx); }
    } catch (e3) { jzWarn('xl dashes: ' + e3.toString()); }
}
// finish a group whose shapes are in place.  o = {
//   col, w, op (0..100), cap (1 butt 2 round), join (1 miter 2 round), colEx, dash: [on, gap], dashOff / dashOn / dashGap (expr),
//   fill, fop, start / end (trim %, expr), off (trim offset: degrees or expr), rep: { n, pos, rot, copiesEx, offEx },
//   at: [x, y] (group position), pivot: [x, y] (anchor + position), rot, posEx / rotEx / scEx, gop (opacity factor expr),
//   pre: statements put before every expression of the group }
function axl_fin(ctx, g, o) {
    var pre = o.pre || '', s, tr, rp, rt, T;
    if (o.col) {
        s = jzAddStroke(g, o.col, o.w || 2, o.op);
        try { s.property('ADBE Vector Stroke Line Cap').setValue(o.cap || 1); s.property('ADBE Vector Stroke Line Join').setValue(o.join || 1); } catch (e) {}
        if (o.colEx) axl_ex(ctx, s.property('ADBE Vector Stroke Color'), pre + o.colEx);
        if (o.dash) axl_dash(ctx, s, o.dash[0], o.dash[1], o.dashOff ? pre + o.dashOff : null, o.dashOn ? pre + o.dashOn : null, o.dashGap ? pre + o.dashGap : null);
    }
    if (o.fill) jzAddFill(g, o.fill, o.fop);
    if (o.end != null || o.start != null || o.off != null) {
        tr = jzVecs(g).addProperty('ADBE Vector Filter - Trim');
        if (o.end != null) axl_ex(ctx, tr.property('ADBE Vector Trim End'), pre + 'Math.max(0,Math.min(100,' + (o.start != null ? 'Math.max(' + o.start + ',' + o.end + ')' : o.end) + '))');
        if (o.start != null) axl_ex(ctx, tr.property('ADBE Vector Trim Start'), pre + 'Math.max(0,Math.min(100,' + o.start + '))');
        if (o.off != null) { if (typeof o.off === 'number') tr.property('ADBE Vector Trim Offset').setValue(o.off); else axl_ex(ctx, tr.property('ADBE Vector Trim Offset'), pre + o.off); }
    }
    if (o.rep) {
        rp = jzVecs(g).addProperty('ADBE Vector Filter - Repeater');
        rp.property('ADBE Vector Repeater Copies').setValue(o.rep.n);
        if (o.rep.copiesEx) axl_ex(ctx, rp.property('ADBE Vector Repeater Copies'), pre + o.rep.copiesEx);
        if (o.rep.offEx) axl_ex(ctx, rp.property('ADBE Vector Repeater Offset'), pre + o.rep.offEx);
        rt = rp.property('ADBE Vector Repeater Transform');
        rt.property('ADBE Vector Repeater Position').setValue(o.rep.pos || [0, 0]);
        if (o.rep.rot) rt.property('ADBE Vector Repeater Rotation').setValue(o.rep.rot);
    }
    T = jzGX(g);
    if (o.pivot) { T.property('ADBE Vector Anchor').setValue(o.pivot); T.property('ADBE Vector Position').setValue(o.pivot); }
    if (o.at) T.property('ADBE Vector Position').setValue(o.at);
    if (o.rot) T.property('ADBE Vector Rotation').setValue(o.rot);
    if (o.posEx) axl_ex(ctx, T.property('ADBE Vector Position'), pre + o.posEx);
    if (o.rotEx) axl_ex(ctx, T.property('ADBE Vector Rotation'), pre + o.rotEx);
    if (o.scEx) axl_ex(ctx, T.property('ADBE Vector Scale'), pre + o.scEx);
    if (o.gop) axl_ex(ctx, T.property('ADBE Vector Group Opacity'), pre + 'value*(' + o.gop + ')');
    return g;
}
// one finished group: polylines (o.closed), circles (o.ells: [[x, y, r], …]) ; o.pathEx = expression for the first path
function axl_line(ctx, par, name, paths, o) {
    var g = axl_grp(par, name), i, pp;
    for (i = 0; i < (paths ? paths.length : 0); i++) {
        pp = jzAddPath(g, paths[i], !!o.closed);
        if (o.pathEx && i === 0) axl_ex(ctx, pp.property('ADBE Vector Shape'), (o.pre || '') + o.pathEx);
    }
    if (o.ells) for (i = 0; i < o.ells.length; i++) jzAddEllipse(g, o.ells[i][2] * 2, o.ells[i][2] * 2, o.ells[i][0], o.ells[i][1]);
    return axl_fin(ctx, g, o);
}
// small secondary text (the browser's label(): mono, centred, fg) ; opacity = value × started × extra factor
function axl_label(ctx, text, x, y, o, opEx) {
    o = o || {};
    var L = jzText(ctx, String(text), { font: o.font || jzMonoF(ctx), size: o.size || Math.max(11, 15 * axl_u(ctx)), color: o.color || ctx.sc.fg, x: x, y: y,
        align: o.align || 'center', track: o.track == null ? 0.06 : o.track, name: o.name });
    axl_ex(ctx, jzXf(L, 'ADBE Opacity'), 'value*V*(' + (opEx || '1') + ')');
    return L;
}
function axl_src(ctx, L, ex) { try { L.property('ADBE Text Properties').property('ADBE Text Document').expression = axl_H(ctx) + ex; } catch (e) { jzWarn('xl source text: ' + e.toString()); } }
// register an entry: params normalised like the browser wrapper; all layers are main-pass only -> kept out of the ghosts
function axl_reg(k, fn) {
    jzReg('decor', k, { build: function (ctx, bb0, d) {
        var n0 = ctx.comp.numLayers, p = {}, key, i, added;
        for (key in d) if (d.hasOwnProperty(key)) p[key] = d[key];
        p.n = jzClamp((p.n == null ? 1 : p.n) | 0, 1, 3); p.v = (p.v || 0) | 0;
        if (p.r == null) p.r = 0.5; if (p.seed == null) p.seed = 1;
        fn(ctx, axl_bb(ctx, bb0), p, axl_u(ctx));
        added = ctx.comp.numLayers - n0;
        for (i = 1; i <= added; i++) jzNoGhost(ctx.comp.layer(i));
    } });
}
// (inside one shape layer the first group is drawn on top, so groups are added in the reverse of the browser's draw order)

// ================================================================ frames

/* ---- xlGapFrame — 途切れ枠: a frame drawn on by one pen stroke, broken by 2–4 gaps that keep travelling round it */
axl_reg('xlGapFrame', function (ctx, bb, p, u) {
    var f = axl_frame(ctx, bb, axl_pad(bb, u, 1.15)), c = axl_col(ctx, p), i;
    var pts = [[f.x0, f.y0], [f.x1, f.y0], [f.x1, f.y1], [f.x0, f.y1]];
    pts = pts.slice(p.v % 4).concat(pts.slice(0, p.v % 4));
    if (!p.right) pts = [pts[0]].concat(pts.slice(1).reverse());
    var L = 2 * (f.w + f.h), k = p.n + 1, cell = L / k, g0 = jzClamp(L * 0.045, 18 * u, 64 * u);
    var pre = 'var gap=' + jzN(cell) + '+' + jzN(g0 - cell) + '*o,mv=time*' + jzN(26 * u * (0.5 + ctx.fx.motion)) + ';';
    var S = axl_layer(ctx, 'gapped frame');
    if (p.big) {
        var d = 9 * u, pb = [], Lb = L + 8 * d, cb = Lb / k;
        for (i = 0; i < 4; i++) pb.push([pts[i][0] + (pts[i][0] < f.cx ? -d : d), pts[i][1] + (pts[i][1] < f.cy ? -d : d)]);
        axl_line(ctx, S, 'outer frame', [pb], { closed: true, col: ctx.sc.sub, w: 1.1 * u, op: 70, cap: 1, join: 1, pre: pre,
            dash: [cb - g0, g0], dashOn: 'Math.max(0.01,' + jzN(cb) + '-gap)', dashGap: 'gap', dashOff: 'mv+' + jzN(cb / 2), end: '100*ioc((t-0.15)/0.55)', gop: 'o' });
    }
    axl_line(ctx, S, 'frame', [pts], { closed: true, col: c, w: 3 * u, cap: 1, join: 1, pre: pre,
        dash: [cell - g0, g0], dashOn: 'Math.max(0.01,' + jzN(cell) + '-gap)', dashGap: 'gap', dashOff: '-mv', end: '100*ioc(t/0.55)', gop: 'Math.min(1,o*1.6)' });
});

/* ---- xlHopCorners — 巡る角: one or two corner marks that hop from corner to corner along the frame, bending round each corner */
axl_reg('xlHopCorners', function (ctx, bb, p, u) {
    var f = axl_frame(ctx, bb, axl_pad(bb, u, 1)), c = axl_col(ctx, p), L = 2 * (f.w + f.h), dir = p.right ? 1 : -1, mo = ctx.fx.motion > 0.05 ? 1 : 0, j, i;
    var pts = [[f.x0, f.y0], [f.x1, f.y0], [f.x1, f.y1], [f.x0, f.y1]];
    var S = axl_layer(ctx, 'hopping corners');
    for (i = 3; i >= 0; i--) axl_line(ctx, S, 'corner dot', null, { ells: [[pts[i][0], pts[i][1], 2.4 * u]], fill: ctx.sc.sub, fop: 70, gop: 'o*ein(0.3,' + jzN(i * 0.05) + ')' });
    for (j = (p.n >= 2 ? 1 : 0); j >= 0; j--) {
        var pre = 'var S=[0,' + jzN(f.w) + ',' + jzN(f.w + f.h) + ',' + jzN(2 * f.w + f.h) + ',' + jzN(L) + '],k=Math.floor(t/0.85),fr=ioc((t-k*0.85)/0.4)*' + mo +
            ',a=md(k*' + (mo * dir) + '+' + (j * 2 + p.v) + ',4),b=md(a-1,4),len=' + (dir > 0 ? 'S[a+1]-S[a]' : 'S[b+1]-S[b]') + ',s=S[a]+' + dir + '*len*fr' +
            ',arm=' + jzN(Math.min(f.w, f.h) * 0.2 + 10 * u) + '*ein(0.35)*(1+0.7*Math.sin(Math.PI*fr))*o;';
        axl_line(ctx, S, 'mark ' + (j + 1), [pts], { closed: true, col: c, w: 3.6 * u, cap: 1, join: 1, pre: pre, end: '200*arm/' + jzN(L), off: '(s-arm)/' + jzN(L) + '*360' });
    }
});

/* ---- xlSketchBox — 下描き枠: a pencil-sketched box: four overshooting strokes gone over twice, lightly boiling
   (the boil moves each whole stroke on fours instead of every point) */
axl_reg('xlSketchBox', function (ctx, bb, p, u) {
    var f = axl_frame(ctx, bb, axl_pad(bb, u, 1.1)), c = axl_col(ctx, p), sd = p.seed, ps, k, i;
    var ed = [[f.x0, f.y0, f.x1, f.y0], [f.x1, f.y0, f.x1, f.y1], [f.x1, f.y1, f.x0, f.y1], [f.x0, f.y1, f.x0, f.y0]];
    var S = axl_layer(ctx, 'sketch box');
    for (ps = 1; ps >= 0; ps--) for (k = 3; k >= 0; k--) {
        var ax = ed[k][0], ay = ed[k][1], bx = ed[k][2], by = ed[k][3], L = axl_hyp(bx - ax, by - ay) || 1, dx = (bx - ax) / L, dy = (by - ay) / L, nx = -dy, ny = dx;
        var o0 = (6 + 14 * axl_r(sd, k, ps, 1)) * u, o1 = (6 + 14 * axl_r(sd, k, ps, 2)) * u, pts = [];
        for (i = 0; i <= 6; i++) {
            var s = i / 6, a = -o0 + (L + o0 + o1) * s;
            var j = (axl_rs(sd, k, ps, i, 3) * 2.6 + (ps ? 3 : -1) * Math.sin(s * Math.PI) + axl_rs(sd, k, ps, 5) * 4 * (s - 0.5)) * u;
            pts.push([ax + dx * a + nx * j, ay + dy * a + ny * j]);
        }
        var bo = jzN(1.1 * u * ctx.fx.motion), ph = k * 13 + ps * 57 + (sd % 97);
        axl_line(ctx, S, (ps ? 'second ' : 'first ') + 'stroke ' + (k + 1), [pts], { col: c, w: (ps ? 1.8 : 2.8) * u, op: ps ? 60 : 95, cap: 2, join: 2,
            start: '100*(1-o)', end: '100*ioc((t-' + jzN(k * 0.12 + ps * 0.5) + ')/0.24)', gop: 'Math.min(1,o*2)',
            posEx: 'var q=Math.floor(t*4);[value[0]+(hh(q*7.3+' + ph + ')*2-1)*' + bo + ',value[1]+(hh(q*5.1+' + (ph + 31) + ')*2-1)*' + bo + ']' });
    }
});

/* ---- xlDashTrack — 破線トラック: a dashed racetrack (stadium) round the lyric with a start line and a runner lapping it */
axl_reg('xlDashTrack', function (ctx, bb, p, u) {
    var f = axl_frame(ctx, bb, axl_pad(bb, u, 1.7)), dir = p.right ? 1 : -1, c = axl_acc(ctx), fg = ctx.sc.fg;
    var pa = axl_mk(axl_rrect(f.x0, f.y0, f.x1, f.y1, Math.min(f.w, f.h) / 2, 10), true), L = pa.L;
    var s0 = L * 0.07, st = axl_at(pa, s0), nx = -Math.sin(st[2]), ny = Math.cos(st[2]), tx = Math.cos(st[2]) * 4 * u, ty = Math.sin(st[2]) * 4 * u, g = 11 * u, r = 13 * u;
    var sEx = 'var s=' + jzN(s0) + '+' + dir + '*Math.max(0,t-0.45)*' + jzN((90 + 160 * ctx.fx.motion) * u) + ';';
    var S = axl_layer(ctx, 'dashed track');
    axl_line(ctx, S, 'runner', [[[r * 1.3, 0], [Math.cos(2.5) * r * 0.9, Math.sin(2.5) * r * 0.9], [Math.cos(-2.5) * r * 0.9, Math.sin(-2.5) * r * 0.9]]], { closed: true, fill: c,
        pre: axl_bake(pa) + sEx + 'var q=at(P,C,md(s,Lt));', posEx: '[q[0],q[1]]', rotEx: 'q[2]*180/Math.PI' + (dir < 0 ? '+180' : ''), gop: 'ein(0.25,0.45)*o' });
    axl_line(ctx, S, 'runner trail', [pa.open], { closed: true, col: c, w: 4 * u, cap: 1, join: 2, pre: sEx,
        end: jzN(80 * u / L * 100), off: '(s' + (dir > 0 ? '-' + jzN(80 * u) : '') + ')/' + jzN(L) + '*360', gop: 'ein(0.25,0.45)*o' });
    axl_line(ctx, S, 'start line', [[[st[0] - nx * g, st[1] - ny * g], [st[0] + nx * g, st[1] + ny * g]], [[st[0] - nx * g + tx, st[1] - ny * g + ty], [st[0] + nx * g + tx, st[1] + ny * g + ty]]],
        { col: fg, w: 1.6 * u, cap: 1, start: '50-50*ein(0.25,0.1)', end: '50+50*ein(0.25,0.1)', gop: 'o' });
    axl_line(ctx, S, 'track', [pa.open], { closed: true, col: fg, w: 2.2 * u, op: 90, cap: 1, join: 2, dash: [11 * u, 8 * u], end: '100*ioc(t/0.6)', gop: 'o' });
});

/* ---- xlBubbleLine — 吹き出し線: the lyric inside a hand-lettered speech balloon outline with a tail (or thought bubbles) */
axl_reg('xlBubbleLine', function (ctx, bb, p, u) {
    var f = axl_frame(ctx, bb, axl_pad(bb, u, 1.5)), c = axl_col(ctx, p), m = axl_mg(ctx) * 0.35, i;
    var r = Math.min(f.h * 0.38, 44 * u, f.w / 2), rb = ctx.H - m - f.y1, rt = f.y0 - m;
    var side = p.low ? (rb >= 22 * u ? 1 : rt >= 22 * u ? -1 : 0) : (rt >= 22 * u ? -1 : rb >= 22 * u ? 1 : 0);
    var tw = Math.min(46 * u, (f.w - 2 * r) * 0.6); if (tw < 10 * u) side = 0;
    var tl = Math.min((side > 0 ? rb : rt) * 0.8, 64 * u), tx = jzClamp(f.cx + (p.right ? 0.2 : -0.2) * f.w, f.x0 + r + tw / 2, f.x1 - r - tw / 2), sk = (p.right ? 1 : -1) * 26 * u;
    var thought = p.v % 2 === 1;
    var pts = axl_arc(f.x0 + r, f.y0 + r, r, 180, 270, 8);
    if (side < 0 && !thought) pts.push([tx - tw / 2, f.y0], [tx + sk, f.y0 - tl], [tx + tw / 2, f.y0]);
    pts = pts.concat(axl_arc(f.x1 - r, f.y0 + r, r, 270, 360, 8), axl_arc(f.x1 - r, f.y1 - r, r, 0, 90, 8));
    if (side > 0 && !thought) pts.push([tx + tw / 2, f.y1], [tx + sk, f.y1 + tl], [tx - tw / 2, f.y1]);
    pts = pts.concat(axl_arc(f.x0 + r, f.y1 - r, r, 90, 180, 8));
    var S = axl_layer(ctx, 'speech outline');
    if (thought && side) {
        var y = side > 0 ? f.y1 : f.y0, th = [[0.28, 13], [0.66, 8.5], [1, 5]];
        for (i = 2; i >= 0; i--) axl_line(ctx, S, 'thought bubble ' + (i + 1), null, { ells: [[0, 0, th[i][1] * u]], col: c, w: 2.2 * u, at: [tx + sk * th[i][0] * 1.4, y + side * tl * th[i][0]],
            scEx: 'var s=ob((t-' + jzN(0.35 + i * 0.1) + ')/0.25,2);[value[0]*s,value[1]*s]', gop: 'o' });
    }
    // the pop (0.9 -> 1) scales the outline in a sub-group, the stroke sits outside it and keeps its width
    var G = axl_grp(S, 'balloon');
    axl_line(ctx, G, 'outline', [pts], { closed: true, pivot: [f.cx, f.cy], scEx: 'var s=0.9+0.1*ob(t/0.4,2);[value[0]*s,value[1]*s]' });
    axl_fin(ctx, G, { col: c, w: 3.2 * u, cap: 2, join: 2, end: '100*ioc(t/0.55)', gop: 'Math.min(1,o*1.5)' });
});

/* ---- xlTransformBox — 変形ハンドル: a design-tool transform box dragged open from one corner: marching ants, eight handles,
   a rotate stalk and a size readout */
axl_reg('xlTransformBox', function (ctx, bb, p, u) {
    var f = axl_frame(ctx, bb, axl_pad(bb, u, 1)), sc = ctx.sc, m = axl_mg(ctx) * 0.35, hs = 6 * u, i;
    var x0 = f.x0, y0 = f.y0, w0 = 24 * u;
    var pre = 'var e=ein(0.5),X1=' + jzN(x0 + w0) + '+' + jzN(f.x1 - x0 - w0) + '*e,Y1=' + jzN(y0 + w0) + '+' + jzN(f.y1 - y0 - w0) + '*e,X0=' + jzN(x0) + ',Y0=' + jzN(y0) + ';';
    var up = y0 - 34 * u > m, below = f.y1 + 30 * u < ctx.H - m, ha = 'ein(0.2,0.1)*o';
    var S = axl_layer(ctx, 'transform box');
    axl_line(ctx, S, 'cursor', [[[4 * u, 4 * u], [4 * u, 24 * u], [9.5 * u, 18.5 * u], [18 * u, 18 * u]]], { closed: true, fill: sc.fg, pre: pre, posEx: '[X1,Y1]', gop: '(1-ic((t-0.55)/0.3))*o' });
    var R = axl_grp(S, 'rotate handle');
    axl_line(ctx, R, 'knob', null, { ells: [[0, (up ? -1 : 1) * 28 * u, 5 * u]], col: axl_acc(ctx), w: 1.8 * u });
    axl_line(ctx, R, 'stalk', [[[0, (up ? -1 : 1) * hs], [0, (up ? -1 : 1) * 28 * u]]], { col: sc.fg, w: 1.2 * u, cap: 1 });
    axl_fin(ctx, R, { pre: pre, posEx: '[(X0+X1)/2,' + (up ? 'Y0' : 'Y1') + ']', gop: ha });
    var Hn = axl_grp(S, 'handles'), hp = [[0, 0], [0.5, 0], [1, 0], [1, 0.5], [1, 1], [0.5, 1], [0, 1], [0, 0.5]];
    for (i = 7; i >= 0; i--) axl_line(ctx, Hn, 'handle ' + (i + 1), [[[-hs, -hs], [hs, -hs], [hs, hs], [-hs, hs]]], { closed: true, col: sc.fg, w: 1.5 * u, cap: 1, join: 1, fill: sc.bg,
        pre: pre, posEx: '[X0+(X1-X0)*' + hp[i][0] + ',Y0+(Y1-Y0)*' + hp[i][1] + ']' });
    axl_fin(ctx, Hn, { gop: ha });
    var B = axl_grp(S, 'marching ants');
    axl_line(ctx, B, 'box', [[[x0, y0], [f.x1, y0], [f.x1, f.y1], [x0, f.y1]]], { closed: true, pivot: [x0, y0], pre: pre,
        scEx: '[value[0]*(X1-X0)/' + jzN(Math.max(1, f.x1 - x0)) + ',value[1]*(Y1-Y0)/' + jzN(Math.max(1, f.y1 - y0)) + ']' });
    axl_fin(ctx, B, { col: sc.fg, w: 1.6 * u, op: 90, cap: 1, join: 1, dash: [7 * u, 5 * u], dashOff: '-time*' + jzN(18 * u), gop: 'o' });
    var T = axl_label(ctx, Math.round(f.w) + ' × ' + Math.round(f.h), f.x1, below ? f.y1 + 18 * u : y0 - 18 * u,
        { align: 'right', size: Math.max(11, 16 * u), color: p.accent ? axl_acc(ctx) : sc.sub, name: 'size readout' }, 'ein(0.3,0.15)*o');
    axl_ex(ctx, jzXf(T, 'ADBE Position'), pre + '[X1,' + (below ? 'Y1+' + jzN(18 * u) : jzN(y0 - 18 * u)) + ']');
    axl_src(ctx, T, pre + 'Math.round(X1-X0)+" × "+Math.round(Y1-Y0)');
});

/* ---- xlFocusHunt — ピント枠: autofocus corners with rounded bends that hunt in and out, then lock with a confirm dot
   (the hunt scales the whole frame, so the bends breathe with it) */
axl_reg('xlFocusHunt', function (ctx, bb, p, u) {
    var f = axl_frame(ctx, bb, axl_pad(bb, u, 1.35)), sc = ctx.sc, acc = axl_acc(ctx), hw = f.w / 2, hh = f.h / 2, tk = 9 * u, i;
    var rr = jzClamp(Math.min(f.w, f.h) * 0.24, 12 * u, 48 * u), cs = [[-1, -1, 180], [1, -1, 270], [1, 1, 0], [-1, 1, 90]], arcs = [];
    var pre = 'var hu=1+(0.2*Math.exp(-t*4.5)*Math.cos(t*15)+0.3*(1-ein(0.3)))*' + jzN(0.35 + 0.65 * ctx.fx.motion) + ';', sEx = '[value[0]*hu,value[1]*hu]';
    var colEx = 't>0.78?' + axl_cx(acc) + ':' + axl_cx(sc.fg), a = 'oc(t/0.25)*o';
    for (i = 0; i < 4; i++) arcs.push(axl_arc(f.cx + cs[i][0] * (hw - rr), f.cy + cs[i][1] * (hh - rr), rr, cs[i][2], cs[i][2] + 90, 10));
    var S = axl_layer(ctx, 'focus frame');
    axl_line(ctx, S, 'confirm dot', null, { ells: [[jzClamp(p.right ? f.cx + hw + 14 * u : f.cx - hw - 14 * u, 8 * u, ctx.W - 8 * u), f.cy + (p.low ? 1 : -1) * (hh - rr * 0.4), 5.5 * u]], fill: acc,
        gop: 't>0.78?(t<1.25?(Math.floor((t-0.78)*10)%2===0?1:0.2):1)*o:0' });
    var G1 = axl_grp(S, 'ticks');
    axl_line(ctx, G1, 'hunt', [[[f.cx, f.cy - hh], [f.cx, f.cy - hh - tk]], [[f.cx, f.cy + hh], [f.cx, f.cy + hh + tk]], [[f.cx - hw, f.cy], [f.cx - hw - tk, f.cy]], [[f.cx + hw, f.cy], [f.cx + hw + tk, f.cy]]],
        { pivot: [f.cx, f.cy], pre: pre, scEx: sEx });
    axl_fin(ctx, G1, { col: sc.fg, w: 1.4 * u, cap: 1, colEx: colEx, gop: a });
    var G2 = axl_grp(S, 'corners');
    axl_line(ctx, G2, 'hunt', arcs, { pivot: [f.cx, f.cy], pre: pre, scEx: sEx });
    axl_fin(ctx, G2, { col: sc.fg, w: 2.8 * u, cap: 1, join: 2, colEx: colEx, gop: a });
});

// ================================================================ brackets

/* ---- xlCurlyBrace — 波括弧: large curly braces that unfurl from their cusps at both ends of the lyric */
axl_reg('xlCurlyBrace', function (ctx, bb, p, u) {
    var ax = axl_axes(ctx, bb), c = axl_col(ctx, p), m = axl_mg(ctx) * 0.3, sd;
    var c0 = ax.C0 - 8 * u, c1 = ax.C1 + 8 * u, sp = c1 - c0, mid = (c0 + c1) / 2, g = 22 * u;
    var S = axl_layer(ctx, 'curly braces');
    for (sd = -1; sd <= 1; sd += 2) {
        var base = sd < 0 ? ax.L0 - g : ax.L1 + g, room = sd < 0 ? base - m : ax.AM - m - base;
        var d = Math.min(jzClamp(sp * 0.13, 10 * u, 38 * u), Math.max(5 * u, room / 2)), q = Math.min(d * 1.4, sp / 4);
        var X0 = base, X1 = base + sd * d, X2 = base + sd * 2 * d;
        var raw = axl_quad([X0, c0], [X1, c0], [X1, c0 + q], 6).concat(axl_quad([X1, mid - q], [X1, mid], [X2, mid], 6), axl_quad([X2, mid], [X1, mid], [X1, mid + q], 6), axl_quad([X1, c1 - q], [X1, c1], [X0, c1], 6));
        axl_line(ctx, S, sd < 0 ? 'opening brace' : 'closing brace', [axl_Ms(ax, raw)], { col: c, w: (p.big ? 4 : 3) * u, cap: 2, join: 2,
            pre: 'var e=ein(0.55),ea=Math.min(e,o);', start: '50-50*ea', end: '50+50*ea', posEx: axl_along(ax, jzN(sd * 36 * u) + '*(1-e)'), gop: 'Math.min(1,o*2)' });
    }
});

/* ---- xlNestBracket — 重ね括弧: three nested square brackets on each side, fanning outward, a pulse running through them */
axl_reg('xlNestBracket', function (ctx, bb, p, u) {
    var ax = axl_axes(ctx, bb), c = axl_col(ctx, p), mid = (ax.C0 + ax.C1) / 2, sp = ax.C1 - ax.C0, m = axl_mg(ctx) * 0.3, sd, k;
    var S = axl_layer(ctx, 'nested brackets');
    for (sd = -1; sd <= 1; sd += 2) for (k = 2; k >= 0; k--) {
        var a = jzClamp((sd < 0 ? ax.L0 : ax.L1) + sd * (28 * u + k * 18 * u), m, ax.AM - m), hk = sp * (1 - k * 0.2) / 2 + 8 * u, arm = 14 * u;
        axl_line(ctx, S, (sd < 0 ? 'left ' : 'right ') + 'bracket ' + (k + 1), [axl_Ms(ax, [[a - sd * arm, mid - hk], [a, mid - hk], [a, mid + hk], [a - sd * arm, mid + hk]])],
            { col: c, w: (4.6 - k * 1.2) * u, cap: 1, join: 1, pre: 'var e=ein(0.4,' + jzN(k * 0.07) + ');',
                posEx: axl_along(ax, sd + '*((1-e)*' + jzN(60 * u) + '+(1-o)*' + jzN(30 * u) + ')'), gop: 'e*o*(0.5+0.5*Math.pow(Math.max(0,Math.sin(t*3.4-' + jzN(k * 0.9) + ')),2))' });
    }
});

/* ---- xlRepeatBars — 反復記号: musical repeat signs: thick + thin bar lines and two dots enclosing the lyric
   (the dots pulse on a steady 5 rad/s swell — the panel has no beat clock in the content comp) */
axl_reg('xlRepeatBars', function (ctx, bb, p, u) {
    var ax = axl_axes(ctx, bb), c = axl_col(ctx, p), mid = (ax.C0 + ax.C1) / 2, sp = ax.C1 - ax.C0, hh = sp / 2 + 8 * u, m = axl_mg(ctx) * 0.3, sd, dy, thin = [], thick = [];
    var S = axl_layer(ctx, 'repeat bars');
    for (sd = -1; sd <= 1; sd += 2) {
        var base = sd < 0 ? ax.L0 : ax.L1, x20 = jzClamp(base + sd * 20 * u, m, ax.AM - m), x38 = jzClamp(base + sd * 38 * u, m, ax.AM - m), x52 = jzClamp(base + sd * 52 * u, m, ax.AM - m);
        thin.push(axl_Ms(ax, [[x38, mid - hh], [x38, mid + hh]])); thick.push(axl_Ms(ax, [[x52, mid - hh], [x52, mid + hh]]));
        for (dy = -1; dy <= 1; dy += 2) axl_line(ctx, S, 'dot', null, { ells: [[0, 0, 6 * u]], fill: axl_acc(ctx), at: axl_M(ax, x20, mid + dy * Math.max(10 * u, sp * 0.14)),
            scEx: 'var s=ob((t-0.3)/0.25,2.5)*o*(1+' + jzN(0.24 * ctx.fx.motion) + '*Math.pow(Math.max(0,Math.sin(t*5)),6));[value[0]*s,value[1]*s]' });
    }
    axl_line(ctx, S, 'thick bars', thick, { col: c, w: 9 * u, cap: 1, pre: 'var e=ein(0.35,0.15)*o;', start: '50-50*e', end: '50+50*e' });
    axl_line(ctx, S, 'thin bars', thin, { col: c, w: 2.2 * u, cap: 1, pre: 'var e=ein(0.35,0.05)*o;', start: '50-50*e', end: '50+50*e' });
});

// ================================================================ rules, underlines, overlines

/* ---- xlDoubleRule — 太細罫: thick-and-thin "Oxford" rules above and below: the thick ones open from the centre,
   the thin ones run in from opposite ends */
axl_reg('xlDoubleRule', function (ctx, bb, p, u) {
    var ax = axl_axes(ctx, bb), c = axl_col(ctx, p), m = axl_mg(ctx) * 0.4, i;
    var ext = 26 * u + (p.big ? (ax.L1 - ax.L0) * 0.1 : 0), a0 = Math.max(m, ax.L0 - ext), a1 = Math.min(ax.AM - m, ax.L1 + ext);
    var g = 16 * u + (ax.C1 - ax.C0) * 0.1, sep = 10 * u, v = p.v % 3, k = v === 1 ? 0.5 : 1;
    var cT = Math.max(m + sep, ax.C0 - g), cB = Math.min(ax.CM - m - sep, ax.C1 + g);
    var S = axl_layer(ctx, 'oxford rules');
    if (v === 2) {
        var ds = [[a0, cT], [a1, cT], [a0, cB], [a1, cB]], r = 5 * u;
        for (i = 3; i >= 0; i--) axl_line(ctx, S, 'diamond', [[[-r, 0], [0, -r], [r, 0], [0, r]]], { closed: true, fill: axl_acc(ctx), at: axl_M(ax, ds[i][0], ds[i][1]),
            scEx: 'var s=ob((t-0.45)/0.25,2)*o;[value[0]*s,value[1]*s]' });
    }
    axl_line(ctx, S, 'thin rules', [axl_Ms(ax, [[a0, cT], [a1, cT]]), axl_Ms(ax, [[a1, cB], [a0, cB]])], { col: c, w: 1.8 * u, cap: 1, start: '100*(1-o)', end: '100*ioc((t-0.12)/0.5)', gop: 'o' });
    axl_line(ctx, S, 'thick rules', [axl_Ms(ax, [[a0, cT - sep], [a1, cT - sep]]), axl_Ms(ax, [[a0, cB + sep], [a1, cB + sep]])], { col: c, w: 7 * u, cap: 1,
        pre: 'var e=ein(0.5)*o*' + k + ';', start: '50-50*e', end: '50+50*e' });
});

/* ---- xlArrowRules — 往復矢印: an arrow shoots along under the lyric, a second one answers above in the opposite direction */
axl_reg('xlArrowRules', function (ctx, bb, p, u) {
    var ax = axl_axes(ctx, bb), c = axl_col(ctx, p), m = axl_mg(ctx) * 0.5, g = 22 * u + (ax.C1 - ax.C0) * 0.08, i;
    var a0 = Math.max(m, ax.L0 - 30 * u), a1 = Math.min(ax.AM - m, ax.L1 + 30 * u), fl = p.right ? 1 : -1, one = p.v % 3 === 2, hs = 20 * u, len = Math.max(1, a1 - a0);
    var rows = [[Math.min(ax.CM - m, ax.C1 + g), fl, 0], [Math.max(m, ax.C0 - g), -fl, 0.2]];
    if (one) rows = [rows[p.low ? 0 : 1]];
    var S = axl_layer(ctx, 'return arrows');
    for (i = rows.length - 1; i >= 0; i--) {
        var cc = rows[i][0], dir = rows[i][1], from = dir > 0 ? a0 : a1, to = dir > 0 ? a1 : a0;
        var pre = 'var e=ein(0.5,' + jzN(rows[i][2]) + '),hk=Math.min(1,e*3);', R = axl_grp(S, 'arrow ' + (i + 1));
        if (one) axl_line(ctx, R, 'echo', [axl_Ms(ax, [[from, cc + 7 * u * (p.low ? 1 : -1)], [to, cc + 7 * u * (p.low ? 1 : -1)]])], { col: c, w: 1.2 * u, op: 80, cap: 1, pre: pre,
            start: '100*e*(1-o)', end: '100*(e-' + jzN(hs / len) + '*hk)' });
        axl_line(ctx, R, 'tail', [axl_Ms(ax, [[0, -10 * u], [0, 10 * u]])], { col: c, w: 3 * u, cap: 1, pre: pre, at: axl_M(ax, from, cc),
            posEx: axl_along(ax, jzN(to - from) + '*e*(1-o)'), gop: 'e>0?1:0' });
        var Hd = axl_grp(R, 'head');
        axl_line(ctx, Hd, 'chevron', [axl_Ms(ax, [[-dir * hs, -hs * 0.62], [0, 0], [-dir * hs, hs * 0.62]])], { pre: pre, at: axl_M(ax, from, cc),
            posEx: axl_along(ax, jzN(to - from) + '*e'), scEx: '[value[0]*hk,value[1]*hk]' });
        axl_fin(ctx, Hd, { col: c, w: 3 * u, cap: 1, join: 1 });
        axl_line(ctx, R, 'shaft', [axl_Ms(ax, [[from, cc], [to, cc]])], { col: c, w: 3 * u, cap: 1, pre: pre, start: '100*e*(1-o)', end: '100*e' });
        axl_fin(ctx, R, { gop: 'o' });
    }
});

/* ---- xlHairpin — クレッシェンド: a musical hairpin opening (or closing) along the lyric, with p / f at its ends */
axl_reg('xlHairpin', function (ctx, bb, p, u) {
    var ax = axl_axes(ctx, bb), c = axl_col(ctx, p), len = ax.L1 - ax.L0, m = axl_mg(ctx) * 0.5;
    var hp = jzClamp(len * 0.07, 30 * u, 84 * u), b = axl_sideBand(ctx, ax, hp + 8 * u, !ax.vert || !!p.low, 18 * u + (ax.C1 - ax.C0) * 0.06);
    var dec = p.v % 2 === 1, open = Math.max(4 * u, Math.min(hp, b.h - 6 * u)) / 2, A = dec ? ax.L1 : ax.L0, B = dec ? ax.L0 : ax.L1;
    var fs = Math.max(16, 30 * u), la = 'ein(0.3,0.35)*o', q;
    var S = axl_layer(ctx, 'hairpin'), G = axl_grp(S, 'hairpin');
    axl_line(ctx, G, 'wedge', [axl_Ms(ax, [[A, b.c], [B, b.c - open]]), axl_Ms(ax, [[A, b.c], [B, b.c + open]])], { pivot: axl_M(ax, A, b.c),
        scEx: axl_scAcross(ax, '0.88+' + jzN(0.12 * ctx.fx.motion) + '*Math.sin(t*2.2)') });
    axl_fin(ctx, G, { col: c, w: 2.6 * u, cap: 2, start: '100*(1-o)', end: '100*oc(t/0.65)', gop: 'Math.min(1,o*2)' });
    if (ax.L0 - fs * 1.4 > m) { q = axl_M(ax, ax.L0 - fs * 0.8, b.c); axl_label(ctx, dec ? 'f' : 'p', q[0], q[1], { font: jzSerifF(ctx), size: fs, color: c, track: 0 }, la); }
    if (ax.L1 + fs * 1.4 < ax.AM - m) { q = axl_M(ax, ax.L1 + fs * 0.8, b.c); axl_label(ctx, dec ? 'p' : 'f', q[0], q[1], { font: jzSerifF(ctx), size: fs, color: c, track: 0 }, la); }
});

/* ---- xlSlur — スラー: a tapered slur arc swept over the lyric from its first glyph to its last
   (the taper is five thin strokes that fan apart in the middle, so Trim Paths can sweep it) */
axl_reg('xlSlur', function (ctx, bb, p, u) {
    var ax = axl_axes(ctx, bb), c = axl_col(ctx, p), len = ax.L1 - ax.L0, hs = jzClamp(len * 0.07, 16 * u, 56 * u), dash = p.v % 2 === 1;
    var sides = p.big ? [false, true] : [!!p.low], si, i, j, n = 28;
    var S = axl_layer(ctx, 'slur');
    for (si = 0; si < sides.length; si++) {
        var plus = sides[si], b = axl_sideBand(ctx, ax, hs + 6 * u, plus, 10 * u + (ax.C1 - ax.C0) * 0.05);
        if (si && b.s !== (plus ? 1 : -1)) continue;
        var h = Math.min(hs, b.h), a0 = ax.L0 + len * 0.03, a1 = ax.L1 - len * 0.03, paths = [];
        for (j = 0; j < (dash ? 1 : 5); j++) {
            var pts = [];
            for (i = 0; i <= n; i++) { var s = i / n; pts.push(axl_M(ax, jzLerp(a0, a1, s), b.edge + b.s * (h * 4 * s * (1 - s) - j / 4 * 6 * u * Math.sin(Math.PI * s)))); }
            paths.push(pts);
        }
        var o = { col: c, w: (dash ? 2.8 : 2) * u, cap: dash ? 1 : 2, join: 2, pre: 'var e=ioc((t-' + jzN(si * 0.15) + ')/0.6);',
            start: si ? '100*(1-e)' : '100*(1-o)', end: si ? '100*o' : '100*e', gop: dash ? 'o' : 'Math.min(1,o*2)' };
        if (dash) o.dash = [12 * u, 8 * u];
        axl_line(ctx, S, si ? 'second slur' : 'slur', paths, o);
    }
});

/* ---- xlLadder — はしご罫: a ladder rule: two rails with rungs laid one by one (Repeater), one lit rung climbing along it */
axl_reg('xlLadder', function (ctx, bb, p, u) {
    var ax = axl_axes(ctx, bb), b = axl_sideBand(ctx, ax, 26 * u, !!p.low, 16 * u + (ax.C1 - ax.C0) * 0.08), m = axl_mg(ctx) * 0.5, fg = ctx.sc.fg, k;
    var a0 = Math.max(m, ax.L0 - 10 * u), a1 = Math.min(ax.AM - m, ax.L1 + 10 * u), hw = Math.min(12 * u, b.h / 2);
    var step = Math.max(26 * u, (a1 - a0) / 110), n = Math.max(1, Math.floor((a1 - a0) / step)), st = (a1 - a0) / n, dir = p.right ? -1 : 1;
    var x0 = dir > 0 ? a0 : a1, xe = x0 + dir * (a1 - a0);
    var pre = 'var e=oc(t/0.6),n=' + n + ',i0=Math.ceil((1-o)*n-1e-6),i1=Math.floor(e*n+1e-6),lit=Math.floor(Math.max(0,t)*' + jzN(5 + 8 * ctx.fx.motion) + ')%(n+1);';
    var S = axl_layer(ctx, 'ladder rule');
    for (k = 2; k >= 0; k--) axl_line(ctx, S, 'lit rung ' + (k + 1), [axl_Ms(ax, [[0, -hw - 3 * u], [0, hw + 3 * u]])], { col: axl_acc(ctx), w: 4 * u, cap: 1, pre: pre + 'var i=lit-' + k + ';',
        at: axl_M(ax, x0, b.c), posEx: axl_along(ax, jzN(dir * st) + '*i'), gop: '(i>=0&&i/n<=e)?o*' + jzN(1 - k * 0.35) + ':0' });
    axl_line(ctx, S, 'rungs', [axl_Ms(ax, [[x0, b.c - hw], [x0, b.c + hw]])], { col: fg, w: 1.6 * u, op: 80, cap: 1, pre: pre,
        rep: { n: n + 1, pos: axl_M(ax, dir * st, 0), copiesEx: 'Math.max(0,i1-i0+1)', offEx: 'i0' }, gop: 'o' });
    axl_line(ctx, S, 'rails', [axl_Ms(ax, [[x0, b.c - hw], [xe, b.c - hw]]), axl_Ms(ax, [[x0, b.c + hw], [xe, b.c + hw]])], { col: fg, w: 2 * u, op: 90, cap: 1,
        start: '100*(1-o)', end: '100*oc(t/0.6)', gop: 'o' });
});

/* ---- xlWingLines — 翼の線: feathered stacks of parallel lines shooting out from both ends of the lyric like wings */
axl_reg('xlWingLines', function (ctx, bb, p, u) {
    var ax = axl_axes(ctx, bb), c = axl_col(ctx, p), m = axl_mg(ctx) * 0.5, mid = (ax.C0 + ax.C1) / 2, sp = ax.C1 - ax.C0, len = ax.L1 - ax.L0;
    var gc = jzClamp(sp / 6, 9 * u, 22 * u), sym = p.v % 2 === 1, i, sd;
    var S = axl_layer(ctx, 'wing lines');
    for (i = 4; i >= 0; i--) {
        var paths = [], f = sym ? 1 - Math.abs(i - 2) * 0.3 : 1 - i * 0.17, cc = mid + (i - 2) * gc;
        for (sd = -1; sd <= 1; sd += 2) {
            var base = (sd < 0 ? ax.L0 : ax.L1) + sd * 16 * u, room = sd < 0 ? base - m : ax.AM - m - base, Lm = Math.min(room, len * 0.25 + 70 * u, 260 * u);
            if (Lm < 22 * u) continue;
            paths.push(axl_Ms(ax, [[base, cc], [base + sd * Lm * f * 1.07, cc]]));
        }
        if (!paths.length) continue;
        axl_line(ctx, S, 'feather ' + (i + 1), paths, { col: (i === (sym ? 2 : 0) && p.accent) ? axl_acc(ctx) : c, w: (sym ? 4 - Math.abs(i - 2) * 0.8 : 4.2 - i * 0.55) * u, cap: 2,
            pre: 'var e=ein(0.45,' + jzN(i * 0.05) + ')*(1+' + jzN(0.07 * ctx.fx.motion) + '*Math.sin(t*3-' + jzN(i * 0.7) + '))/1.07;', start: '100*e*(1-o)', end: '100*e', gop: 'Math.min(1,o*2)' });
    }
});
