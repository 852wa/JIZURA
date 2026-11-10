// ================================================================ pack x2decB (AE port of src/11p_x2_decB.js — 30 追加分2 decor parts)
// Shared helpers (prefix axm_), particles that follow a rule (xmSettle … xmConveyor), shapes that build (xmStairs … xmScatter),
// accents that react (xmBeatSteps xmGauge xmHatch) and the faint back-layer patterns (xmPolyGrow … xmWaves).
// decor.build(ctx, bb, d): layers live in the CONTENT comp (time 0 = cut start). The browser draws every entry on the main pass
// only, so all layers are kept out of the tinted ghosts (jzNoGhost, done once in axm_reg). Front parts wait until the lyric's
// entrance has mostly settled: expressions use t = time - ST (ST = 0.6 × inDur, at most 0.35 s); K = 1 - inCubic(exit) is the
// browser's o. The lyric box is the resting one (the browser keeps the last real box per cut as well).
// The browser simulations are closed-form in t, so every particle is ONE shape group whose transform expression evaluates the
// same formula (seeded constants are computed here with the browser's hash and embedded). Discrete simulations (sliding puzzle,
// bubble sort) are run at build time and embedded as per-piece cell strings. The densest swarms use fewer particles than the
// browser (see each part) to keep the group count modest.

// ---------------------------------------------------------------- shared helpers (axm_)
var AXM_D = Math.PI / 180, AXM_TAU = Math.PI * 2;
// the browser's deterministic hash J.h / J.r / J.rs / J.rr (so seeded placements match the web frame)
function axm_h(a, b, c, d, e) {
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
function axm_r(a, b, c, d, e) { return axm_h(a, b, c, d, e) / 4294967296; }
function axm_rs(a, b, c, d, e) { return axm_r(a, b, c, d, e) * 2 - 1; }
function axm_rr(lo, hi, a, b, c, d, e) { return lo + (hi - lo) * axm_r(a, b, c, d, e); }
function axm_u(ctx) { return jzU(ctx) / 1080; }                       // browser U(env): 1 at a 1080 short side
function axm_mg(ctx) { return jzU(ctx) * 0.05; }                      // safe margin
function axm_vis(sc, c, mn) { return (c && jzContrast(c, sc.bg) >= (mn || 1.6)) ? c : sc.fg; }
function axm_acc(sc) { return axm_vis(sc, sc.accent); }
function axm_acc2(sc) { return axm_vis(sc, sc.accent2 || sc.accent); }
function axm_subc(sc) { return axm_vis(sc, sc.sub, 1.4); }
function axm_col(sc, p) { return p.accent ? axm_acc(sc) : sc.fg; }
// faint colours of the back-layer patterns (DIM / LN in the browser)
function axm_dim(sc) { var d = sc.dim, c = d ? jzContrast(d, sc.bg) : 0; return (c >= 1.3 && c <= 2.4) ? d : jzMixHex(sc.bg, sc.fg, 0.2); }
function axm_ln(sc) { return jzMixHex(sc.bg, sc.fg, 0.36); }
function axm_sp(ctx) { return 0.45 + 0.8 * ctx.fx.motion; }           // speed factor of continuous motion
function axm_bw(bb) { return bb.x1 - bb.x0; }
function axm_bh(bb) { return bb.y1 - bb.y0; }
function axm_hit(x0, y0, x1, y1, bb, pad) { pad = pad || 0; return !(x1 < bb.x0 - pad || x0 > bb.x1 + pad || y1 < bb.y0 - pad || y0 > bb.y1 + pad); }
function axm_hyp(x, y) { return Math.sqrt(x * x + y * y); }
function axm_cx(hex) { var c = jzHex(hex); return '[' + jzN(c[0]) + ',' + jzN(c[1]) + ',' + jzN(c[2]) + ',1]'; }
// expression text from a template: $0 $1 … are replaced by the values (numbers through jzN, strings as they are)
function axm_f(tpl, vals) {
    return tpl.replace(/\$(\d+)/g, function (all, i) { var v = vals[parseInt(i, 10)]; return typeof v === 'string' ? v : jzN(v); });
}
// lyric bbox clamped to the frame like the browser's getBB
function axm_bb(ctx, bb) {
    var b = { x0: Math.max(bb.x0, 0), x1: Math.min(bb.x1, ctx.W), y0: Math.max(bb.y0, 0), y1: Math.min(bb.y1, ctx.H) };
    if (b.x1 <= b.x0) { b.x0 = bb.x0; b.x1 = bb.x1; }
    if (b.y1 <= b.y0) { b.y0 = bb.y0; b.y1 = bb.y1; }
    return b;
}
function axm_pad(bb, u, k) { return (24 * u + Math.min(axm_bw(bb), axm_bh(bb)) * 0.14) * (k == null ? 1 : k); }
function axm_frame(ctx, bb, pad) {
    var m = axm_mg(ctx) * 0.35;
    var x0 = Math.max(m, bb.x0 - pad), y0 = Math.max(m, bb.y0 - pad), x1 = Math.min(ctx.W - m, bb.x1 + pad), y1 = Math.min(ctx.H - m, bb.y1 + pad);
    return { x0: x0, y0: y0, x1: x1, y1: y1, w: x1 - x0, h: y1 - y0, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
}
// a free w×h box in a screen corner (or at the middle of an edge) that does not touch the lyric; null when there is none
function axm_spot(ctx, bb, w, h, p, gap) {
    var W = ctx.W, H = ctx.H, m = axm_mg(ctx) * 0.8, sx = p.right ? 1 : -1, sy = p.low ? 1 : -1, i;
    var o = [[sx, sy], [-sx, sy], [sx, -sy], [-sx, -sy], [0, sy], [0, -sy], [sx, 0], [-sx, 0]];
    for (i = 0; i < o.length; i++) {
        var a = o[i][0], b = o[i][1], x = a > 0 ? W - m - w : (a < 0 ? m : (W - w) / 2), y = b > 0 ? H - m - h : (b < 0 ? m : (H - h) / 2);
        if (x >= 0 && y >= 0 && !axm_hit(x, y, x + w, y + h, bb, gap)) return { x: x, y: y, w: w, h: h, cx: x + w / 2, cy: y + h / 2 };
    }
    return null;
}
// a free horizontal band of height h just below / above the lyric (else along the bottom / top margin); null when there is none
function axm_band(ctx, bb, h, low, gap, edgeOK) {
    var H = ctx.H, m = axm_mg(ctx) * 0.5, dn = bb.y1 + gap + h <= H - m, up = bb.y0 - gap - h >= m, i;
    if (low ? dn : up) return low ? { y: bb.y1 + gap, h: h, s: 1 } : { y: bb.y0 - gap - h, h: h, s: -1 };
    if (low ? up : dn) return low ? { y: bb.y0 - gap - h, h: h, s: -1 } : { y: bb.y1 + gap, h: h, s: 1 };
    if (edgeOK === false) return null;
    var m2 = axm_mg(ctx), ss = low ? [1, -1] : [-1, 1];
    for (i = 0; i < 2; i++) { var s = ss[i], y = s > 0 ? H - m2 - h : m2; if (y + h < bb.y0 - gap * 0.5 || y > bb.y1 + gap * 0.5) return { y: y, h: h, s: s }; }
    return null;
}
// expression header: jzTH (DUR IN OS OD SD, easings cl oe oc ic iq ob hh, PO, K) + ioc (inOutCubic) md (positive modulo)
// tri (0 → 1 → 0 over one unit) obk (the browser's outBack, s = 1.9) + t (local time after the settle delay), V (started)
var AXM_FNS = 'function ioc(x){x=cl(x);return x<0.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;}function md(a,n){return ((a%n)+n)%n;}' +
    'function tri(x){return 1-Math.abs(2*md(x,1)-1);}function obk(x){x=cl(x);return x<=0?0:ob(x,1.9);}\n';
function axm_H(ctx, st) { return jzTH(ctx) + AXM_FNS + 'var ST=' + jzN(st || 0) + ',t=time-ST,V=t<0?0:1;\n'; }
// layer opacity = value × started × exit fade × extra factor
function axm_op(ctx, L, st, ex) { jzSetExpr(jzXf(L, 'ADBE Opacity'), axm_H(ctx, st) + 'value*V*K' + (ex ? '*(' + ex + ')' : '')); }
function axm_sub(g, name) { var s = jzVecs(g).addProperty('ADBE Vector Group'); if (name) s.name = name; return s; }
function axm_gx(g, mn, ex) { jzSetExpr(jzGX(g).property(mn), ex); }
function axm_st(g, col, w, op, cap, join) {
    var s = jzAddStroke(g, col, w, op);
    try { if (cap) s.property('ADBE Vector Stroke Line Cap').setValue(cap); if (join) s.property('ADBE Vector Stroke Line Join').setValue(join); } catch (e) {}
    return s;
}
// dashes: each entry is set right after it is added (adding the next one invalidates the reference); offEx = dash offset expression
function axm_dash(s, on, off, offEx) {
    var D = s.property('ADBE Vector Stroke Dashes'), mn = ['ADBE Vector Stroke Dash 1', 'ADBE Vector Stroke Gap 1', 'ADBE Vector Stroke Offset'], v = [on, off, 0], i, p;
    for (i = 0; i < (offEx ? 3 : 2); i++) {
        p = null;
        try { p = D.addProperty(mn[i]); } catch (e) { p = null; }
        if (!p) { try { p = D.property(mn[i]); } catch (e1) { p = null; } }
        try { if (p) { if (i < 2) p.setValue(v[i]); else p.expression = offEx; } } catch (e2) {}
    }
}
// trim paths: full expressions for end / start (clamped 0..100 by AE)
function axm_trim(g, endEx, startEx) {
    var tr = jzVecs(g).addProperty('ADBE Vector Filter - Trim');
    if (endEx != null) jzSetExpr(tr.property('ADBE Vector Trim End'), endEx);
    if (startEx != null) jzSetExpr(tr.property('ADBE Vector Trim Start'), startEx);
    return tr;
}
function axm_rep(g, n, px, py, rot, off) {
    var rp = jzVecs(g).addProperty('ADBE Vector Filter - Repeater');
    rp.property('ADBE Vector Repeater Copies').setValue(n);
    if (off) rp.property('ADBE Vector Repeater Offset').setValue(off);
    var rt = rp.property('ADBE Vector Repeater Transform');
    rt.property('ADBE Vector Repeater Position').setValue([px || 0, py || 0]);
    if (rot) rt.property('ADBE Vector Repeater Rotation').setValue(rot);
    return rp;
}
// canvas-style arc (radians, y down) as a polyline
function axm_arc(cx, cy, r, a0, a1, n) { var o = [], i; n = n || 24; for (i = 0; i <= n; i++) { var a = a0 + (a1 - a0) * i / n; o.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } return o; }
function axm_ellShape(cx, cy, rx, ry) {
    var kx = 0.5523 * rx, ky = 0.5523 * ry, sh = new Shape();
    sh.vertices = [[cx, cy - ry], [cx + rx, cy], [cx, cy + ry], [cx - rx, cy]];
    sh.inTangents = [[-kx, 0], [0, -ky], [kx, 0], [0, ky]];
    sh.outTangents = [[kx, 0], [0, ky], [-kx, 0], [0, -ky]];
    sh.closed = true; return sh;
}
function axm_rectShape(x0, y0, x1, y1) { var sh = new Shape(); sh.vertices = [[x1, y0], [x1, y1], [x0, y1], [x0, y0]]; sh.closed = true; return sh; }
function axm_mask(L, sh, mode, feather) {
    var m = L.property('ADBE Mask Parade').addProperty('ADBE Mask Atom');
    m.property('ADBE Mask Shape').setValue(sh);
    if (mode) m.maskMode = mode;
    if (feather) m.property('ADBE Mask Feather').setValue([feather, feather]);
    return m;
}
// the browser's keepOut (fade inside / near the lyric box) as a feathered subtract mask
function axm_keepOut(L, bb, pad) { return axm_mask(L, axm_rectShape(bb.x0 - pad / 2, bb.y0 - pad / 2, bb.x1 + pad / 2, bb.y1 + pad / 2), MaskMode.SUBTRACT, pad); }
// register: fn(ctx, bb, p, u, ST). p = the browser's normalised params; front parts get the clamped lyric box and the settle delay
function axm_reg(k, back, fn) {
    jzReg('decor', k, { back: !!back, build: function (ctx, bb, d) {
        var n0 = ctx.comp.numLayers, i, p = {}, key;
        for (key in d) if (d.hasOwnProperty(key)) p[key] = d[key];
        p.n = jzClamp((p.n == null ? 1 : p.n) | 0, 1, 3); p.v = (p.v || 0) | 0; if (p.r == null) p.r = 0.5; if (p.seed == null) p.seed = 1;
        fn(ctx, axm_bb(ctx, bb), p, axm_u(ctx), back ? 0 : jzClamp((ctx.cut.inDur || 0) * 0.6, 0, 0.35));
        var added = ctx.comp.numLayers - n0;
        for (i = 1; i <= added; i++) jzNoGhost(ctx.comp.layer(i));
    } });
}

// ================================================================ particles that follow a rule

/* ---- xmSettle — 積もる粒: small squares fall one by one and pile up on the top edge of the lyric (or on the floor) */
axm_reg('xmSettle', false, function (ctx, bb, p, u, ST) {
    var W = ctx.W, H = ctx.H, sc = ctx.sc, s = p.seed, sz = (p.big ? 17 : 13) * u, gap = 8 * u, i;
    var top = bb.y0 - gap > sz * 5, xa = top ? bb.x0 : 0, xw = top ? axm_bw(bb) : W, base = top ? bb.y0 - gap : H;
    var nb = jzClamp(Math.round(xw / (sz * 1.2)), 3, 64), N = Math.min(22 + p.n * 10, nb * 4), lev = [];
    for (i = 0; i < nb; i++) lev.push(0);
    var span = jzClamp((ctx.cut.dur || 2) * 0.32, 0.5, 2), cols = [sc.fg, axm_acc(sc), axm_acc2(sc)], HD = axm_H(ctx, ST), list = [];
    for (i = 0; i < N; i++) {
        var b = Math.min(nb - 1, Math.floor(axm_r(s, i, 1) * nb)), lv = lev[b]++;
        var yr = base - (lv + 0.5) * sz;
        list.push({ i: i, dl: axm_r(s, i, 3) * span, x: xa + (b + 0.5 + axm_rs(s, i, 2) * 0.16) * (xw / nb), yr: yr, y0: Math.min(-sz * 2, yr - H * 0.3) });
    }
    var S = jzShapeLayer(ctx, 'settling grains', 0, 0);
    for (i = N - 1; i >= 0; i--) {                       // later grains are drawn on top in the browser
        var q = list[i], g = jzGrp(S, 'grain ' + (q.i + 1));
        jzAddRect(g, sz * 0.86, sz * 0.86); jzAddFill(g, cols[q.i % 5 === 0 ? 1 : (q.i % 7 === 0 ? 2 : 0)], 92);
        var pre = HD + axm_f('var q=cl((t-$0)/0.6),b2=cl((t-$1)/0.22),ou=1-K;', [q.dl, q.dl + 0.6]);
        axm_gx(g, 'ADBE Vector Position', pre + axm_f('[$0+ou*$1,$2+$3*q*q-Math.sin(Math.PI*b2)*$4-ou*$5]',
            [q.x, axm_rs(s, q.i, 5) * W * 0.1, q.y0, q.yr - q.y0, sz * 0.4, H * 0.07 * axm_r(s, q.i, 6)]));
        axm_gx(g, 'ADBE Vector Rotation', pre + axm_f('((1-q)*$0+ou*$1)*57.2958', [axm_rs(s, q.i, 4) * 5, axm_rs(s, q.i, 7) * 2]));
    }
    if (!top) axm_keepOut(S, bb, sz * 2.5);
    axm_op(ctx, S, ST);
});

/* ---- xmSwarm — よける群れ: a stream of short dashes crosses the screen and parts round the lyric like water round a stone.
   28 + 10n dashes (browser 34 + 14n); each dash = one group: position = the stream formula, rotation = its local direction */
axm_reg('xmSwarm', false, function (ctx, bb, p, u, ST) {
    var W = ctx.W, H = ctx.H, sc = ctx.sc, s = p.seed, M = 28 + p.n * 10, dir = p.right ? 1 : -1, gap = 26 * u, i;
    var cx = (bb.x0 + bb.x1) / 2, cy = (bb.y0 + bb.y1) / 2, a = axm_bw(bb) / 2 * 1.35 + gap * 2, B = (axm_bh(bb) / 2 + gap) / 0.72;
    var m = 40 * u, span = W + 2 * m, sp = axm_sp(ctx), acc = axm_acc(sc), HD = axm_H(ctx, ST);
    var S = jzShapeLayer(ctx, 'parting swarm', 0, 0);
    for (i = 0; i < M; i++) {
        var v = dir * W * axm_rr(0.1, 0.2, s, i, 2) * sp, d = H * axm_rr(0.03, 0.97, s, i, 3) - cy, big = i % 6 === 0;
        var g = jzGrp(S, 'dash ' + (i + 1));
        jzAddPath(g, [[-Math.abs(v) * 0.1, 0], [0, 0]], false);
        axm_st(g, big ? acc : sc.fg, (big ? 5.5 : 3.6) * u, 80, 2);
        var pre = HD + axm_f('function ps(tt){var x=md($0+$1*tt,$2)-$3,k=(x-$4)/$5,hy=$6*Math.exp(-k*k*k*k);return [x,$7+$8*Math.sqrt($9+hy*hy)];}',
            [axm_r(s, i, 1) * span, v, span, m, cx, a, B, cy, d >= 0 ? 1 : -1, d * d]);
        axm_gx(g, 'ADBE Vector Position', pre + 'ps(t)');
        axm_gx(g, 'ADBE Vector Rotation', pre + 'var q=ps(t),q0=ps(t-0.1);Math.abs(q[0]-q0[0])>' + jzN(W * 0.5) + '?' + (dir > 0 ? 0 : 180) + ':Math.atan2(q[1]-q0[1],q[0]-q0[0])*57.2958');
    }
    axm_op(ctx, S, ST, 'oc(t/0.5)');
});

/* ---- xmBounce — 跳ねる玉: balls hop along the top of the lyric (or a floor line under it), squashing and leaving a landing mark */
axm_reg('xmBounce', false, function (ctx, bb, p, u, ST) {
    var H = ctx.H, sc = ctx.sc, gap = 10 * u, r = (p.big ? 22 : 16) * u, m = axm_mg(ctx) * 0.4, k;
    var up = bb.y0 - gap - 2 * r - m, dn = H - m - bb.y1 - gap - 2 * r, top = !p.low;
    if ((top ? up : dn) < 44 * u) top = !top;
    var room = top ? up : dn; if (room < 16 * u) return;
    var hh = Math.min(130 * u, room), yB = top ? bb.y0 - gap : bb.y1 + gap + hh + 2 * r;
    var xa = bb.x0 + r, xb = Math.max(xa + 1, bb.x1 - r), hops = jzClamp(Math.round((xb - xa) / (150 * u)), 2, 9), Th = 0.5 / (0.6 + 0.6 * ctx.fx.motion);
    var HD = axm_H(ctx, ST), S = jzShapeLayer(ctx, 'bouncing balls', 0, 0);
    for (k = p.n - 1; k >= 0; k--) {
        var col = k === 0 ? axm_col(sc, p) : (k === 1 ? axm_acc(sc) : sc.fg);
        var pre = HD + axm_f('var ph=t/$0+$1,j=Math.floor(ph),f=ph-j,c=Math.min(f,1-f),s2=1-0.34*Math.exp(-c*20),e=oc(t/0.45);function X(q){return $2+$3*tri(q/$4);}',
            [Th, k * (0.37 + 2 * hops / p.n), xa, xb - xa, 2 * hops]);
        var gb = jzGrp(S, 'ball ' + (k + 1));
        jzAddEllipse(gb, r * 2, r * 2); jzAddFill(gb, col);
        axm_gx(gb, 'ADBE Vector Position', pre + axm_f('[X(ph),$0-$1*s2-$2*4*f*(1-f)-(1-e)*$2]', [yB, r, hh]));
        axm_gx(gb, 'ADBE Vector Scale', pre + '[100*K/s2,100*K*s2]');
        axm_gx(gb, 'ADBE Vector Group Opacity', pre + 'cl(e*1.5)*100');
        var gm = jzGrp(S, 'mark ' + (k + 1));
        jzAddPath(gm, [[-r, 0], [r, 0]], false); axm_st(gm, col, 2 * u, null, 1);
        axm_gx(gm, 'ADBE Vector Position', pre + '[X(j),' + jzN(yB) + ']');
        axm_gx(gm, 'ADBE Vector Scale', pre + '[(0.5+1.5*f)*100,100]');
        axm_gx(gm, 'ADBE Vector Group Opacity', pre + '(1-f)*70*e');
    }
    if (!top) {
        var gf = jzGrp(S, 'floor');
        jzAddPath(gf, [[-(xb - xa) / 2 - r, 0], [(xb - xa) / 2 + r, 0]], false); axm_st(gf, axm_subc(sc), 1.6 * u, 80, 1);
        jzGX(gf).property('ADBE Vector Position').setValue([(xa + xb) / 2, yB]);
        axm_gx(gf, 'ADBE Vector Scale', HD + '[oc(t/0.45)*100,100]');
    }
    axm_op(ctx, S, ST);
});

/* ---- xmFuse — 導火線: a fuse beside the lyric burns down over the cut: a spitting spark eats the line and leaves ash dots */
axm_reg('xmFuse', false, function (ctx, bb, p, u, ST) {
    var W = ctx.W, H = ctx.H, sc = ctx.sc, gap = 24 * u, m = axm_mg(ctx) * 0.5, vert = axm_bh(bb) > axm_bw(bb) * 1.25, A, B, nx = 0, ny = 0, i;
    if (!vert) {
        var low = !!p.low; if (low ? bb.y1 + gap > H - m : bb.y0 - gap < m) low = !low;
        var y = low ? bb.y1 + gap : bb.y0 - gap; A = [bb.x0, y]; B = [bb.x1, y]; ny = low ? 1 : -1;
    } else {
        var rt = !!p.low; if (rt ? bb.x1 + gap > W - m : bb.x0 - gap < m) rt = !rt;
        var x = rt ? bb.x1 + gap : bb.x0 - gap; A = [x, bb.y0]; B = [x, bb.y1]; nx = rt ? 1 : -1;
    }
    if (!p.right) { var sw = A; A = B; B = sw; }
    var L = axm_hyp(B[0] - A[0], B[1] - A[1]), n = jzClamp(Math.round(L / (12 * u)), 8, 120), pts = [], c = ctx.cut;
    for (i = 0; i <= n; i++) { var qq = i / n, w = Math.sin(qq * L / (40 * u)) * 5 * u; pts.push([jzLerp(A[0], B[0], qq) + nx * w, jzLerp(A[1], B[1], qq) + ny * w]); }
    var acc = axm_acc(sc), HD = axm_H(ctx, ST) + 'var e=oc(t/0.4),q=cl((t-0.3)/' + jzN(Math.max(0.6, c.dur - (c.outDur || 0) - 1)) + ')*0.93;';
    var S = jzShapeLayer(ctx, 'burning fuse', 0, 0);
    // head: spark lines re-drawn 12× per second, embers thrown off to the free side, the glowing tip
    var gh = jzGrp(S, 'head'), gd = axm_sub(gh, 'tip');
    jzAddEllipse(gd, 13 * u, 13 * u); jzAddFill(gd, acc);
    var an0 = Math.atan2(ny, nx);
    for (i = 0; i < 6; i++) {
        var ge = axm_sub(gh, 'ember ' + (i + 1)), pe = HD + axm_f('var ph=t*1.8+$0,a=ph-Math.floor(ph),an=$1+(hh(Math.floor(ph)*5.3+$2+SD*0.013)*2-1)*1.2;', [i / 6, an0, i * 1.9 + 0.7]);
        jzAddEllipse(ge, 5 * u, 5 * u); jzAddFill(ge, acc);
        axm_gx(ge, 'ADBE Vector Position', pe + '[Math.cos(an)*a*' + jzN(60 * u) + ',Math.sin(an)*a*' + jzN(60 * u) + ']');
        axm_gx(ge, 'ADBE Vector Group Opacity', pe + '(1-a)*100');
    }
    for (i = 0; i < 7; i++) {
        var gs = axm_sub(gh, 'spark ' + (i + 1)), ps = HD + 'var hk=Math.floor(time*12)*7.13+' + jzN(i * 3.7 + 1.3) + '+SD*0.011;';
        jzAddPath(gs, [[5 * u, 0], [38 * u, 0]], false); axm_st(gs, i % 3 ? acc : sc.fg, 2.6 * u, null, 2);
        axm_gx(gs, 'ADBE Vector Rotation', ps + 'hh(hk)*360');
        axm_gx(gs, 'ADBE Vector Scale', ps + '[(13+25*hh(hk+0.37))/38*100*K,100]');
    }
    axm_gx(gh, 'ADBE Vector Position', HD + axm_f('var w=Math.sin(q*$0)*$1;[$2+$3*q+$4*w,$5+$6*q+$7*w]', [L / (40 * u), 5 * u, A[0], B[0] - A[0], nx, A[1], B[1] - A[1], ny]));
    axm_gx(gh, 'ADBE Vector Group Opacity', HD + 'e>q?100:0');
    var gr = jzGrp(S, 'end ring');
    jzAddEllipse(gr, 10 * u, 10 * u, pts[n][0], pts[n][1]); axm_st(gr, sc.fg, 2 * u);
    axm_gx(gr, 'ADBE Vector Group Opacity', HD + 'e>0.98?100:0');
    var ga = jzGrp(S, 'ash');
    jzAddPath(ga, pts, false); axm_trim(ga, HD + 'q*100');
    axm_dash(axm_st(ga, axm_subc(sc), 4 * u, 50, 2), 0.1, 2 * L / n - 0.1);
    var gl = jzGrp(S, 'fuse');
    jzAddPath(gl, pts, false); axm_trim(gl, HD + 'Math.max(q,e)*100', HD + 'q*100');
    axm_st(gl, sc.fg, 3.2 * u, null, 2, 2);
    axm_op(ctx, S, ST);
});

/* ---- xmMagnet — 吸いつく粒: scattered dust is pulled in and sticks along an invisible frame round the lyric, then creeps along it.
   26 + 10n dots (browser 34 + 14n); the faint flight tails of the browser are left out */
axm_reg('xmMagnet', false, function (ctx, bb, p, u, ST) {
    var sc = ctx.sc, s = p.seed, f = axm_frame(ctx, bb, axm_pad(bb, u)), N = 26 + p.n * 10, Lp = 2 * (f.w + f.h), mn = jzU(ctx), i;
    var acc = axm_acc(sc), dr = 12 * u * axm_sp(ctx) * (p.right ? 1 : -1);
    var HD = axm_H(ctx, ST) + axm_f('function per(d){d=md(d,$0);if(d<$1)return [$3+d,$4,0,-1];d-=$1;if(d<$2)return [$5,$4+d,1,0];d-=$2;if(d<$1)return [$5-d,$6,0,1];d-=$1;return [$3,$6-d,-1,0];}',
        [Lp, f.w, f.h, f.x0, f.y0, f.x1, f.y1]);
    var S = jzShapeLayer(ctx, 'magnet dust', 0, 0);
    for (i = N - 1; i >= 0; i--) {
        var big = i % 5 === 0, g = jzGrp(S, 'dust ' + (i + 1));
        jzAddEllipse(g, (big ? 11 : 6.8) * u, (big ? 11 : 6.8) * u); jzAddFill(g, big ? acc : sc.fg, 95);
        axm_gx(g, 'ADBE Vector Position', HD + axm_f('var a=per($0+t*$1),qq=cl((t-$2)/0.6),q=oc(qq),k=(1-q)+ic(PO)*1.2,ds=$3*k,tg=$4*ds*0.5,wb=Math.sin(t*3+$5)*$6*q;' +
            'qq<=0?[-9999,-9999]:[a[0]+a[2]*(ds+wb)-a[3]*tg,a[1]+a[3]*(ds+wb)+a[2]*tg]',
            [(i + axm_r(s, i, 1) * 0.6) / N * Lp, dr, axm_r(s, i, 2) * 0.45, axm_rr(0.16, 0.5, s, i, 3) * mn, axm_rs(s, i, 4), i * 1.7, 2.5 * u]));
    }
    axm_op(ctx, S, ST);
});

/* ---- xmPendulum — 振り子の波: a row of pendulums of graded length swings in and out of phase (travelling wave patterns) */
axm_reg('xmPendulum', false, function (ctx, bb, p, u, ST) {
    var W = ctx.W, H = ctx.H, sc = ctx.sc, gap = 16 * u, rb = 8.5 * u, m = axm_mg(ctx) * 0.5, i;
    var dn = H - m - bb.y1 - gap - rb * 2, up = bb.y0 - gap - rb * 2 - m, low = !!p.low;
    if ((low ? dn : up) < 64 * u) low = !low;
    var room = low ? dn : up; if (room < 40 * u) return;
    var Lmax = Math.min((p.big ? 200 : 150) * u, room), py = low ? bb.y1 + gap : bb.y0 - gap - rb * 2 - Lmax;
    var cx = (bb.x0 + bb.x1) / 2, wid = Math.min(Math.max(axm_bw(bb), 280 * u), W - m * 4), xa = jzClamp(cx - wid / 2, m * 2, W - m * 2 - wid), xb = xa + wid;
    var N = jzClamp(Math.round(wid / (46 * u)), 5, 17), k0 = 8, Tc = 16 / axm_sp(ctx), acc = axm_acc(sc), HD = axm_H(ctx, ST);
    var S = jzShapeLayer(ctx, 'pendulum wave', 0, 0);
    for (i = 0; i < N; i++) {
        var x = jzLerp(xa, xb, (i + 0.5) / N), fq = k0 + i * 8 / N, L0 = Lmax * Math.pow(k0 / fq, 2);
        var g = jzGrp(S, 'pendulum ' + (i + 1)), gb = axm_sub(g, 'bob');
        jzAddEllipse(gb, rb * 2, rb * 2, 0, L0); jzAddFill(gb, i % 4 === 0 ? acc : sc.fg);
        var gl = axm_sub(g, 'string');
        jzAddPath(gl, [[0, 0], [0, L0]], false); axm_st(gl, axm_subc(sc), 1.6 * u, 85, 2);
        jzGX(g).property('ADBE Vector Position').setValue([x, py]);
        axm_gx(g, 'ADBE Vector Rotation', HD + '-24*Math.cos(' + jzN(AXM_TAU * fq / Tc) + '*t)');
        axm_gx(g, 'ADBE Vector Scale', HD + 'var s=oc(t/0.5)*K*100;[s,s]');
    }
    var gt = jzGrp(S, 'bar');
    jzAddPath(gt, [[-wid / 2, 0], [wid / 2, 0]], false); axm_st(gt, sc.fg, 2.2 * u, null, 1);
    jzGX(gt).property('ADBE Vector Position').setValue([(xa + xb) / 2, py]);
    axm_gx(gt, 'ADBE Vector Scale', HD + '[oc(t/0.5)*100,100]');
    axm_op(ctx, S, ST);
});

/* ---- xmFountain — 粒の噴水: particles jet up from the bottom edge in arcs and fall back, born and dying in a loop.
   24 + 8n particles per emitter (browser 36 + 12n), two thirds of that each when there are two emitters */
axm_reg('xmFountain', false, function (ctx, bb, p, u, ST) {
    var W = ctx.W, H = ctx.H, sc = ctx.sc, s = p.seed, Tl = 1.25 / axm_sp(ctx), Tf = Tl * 0.94, acc = axm_acc(sc), a2 = axm_acc2(sc), k, i;
    var ems = p.corner ? [0.12, 0.88] : [p.right ? 0.86 : 0.14], M = Math.round((24 + p.n * 8) * (ems.length > 1 ? 0.66 : 1)), HD = axm_H(ctx, ST);
    var S = jzShapeLayer(ctx, 'particle fountain', 0, 0);
    for (k = 0; k < ems.length; k++) for (i = 0; i < M; i++) {
        var g = jzGrp(S, 'drop ' + (k * M + i + 1)), d = axm_rr(5.5, 10, s, i, k + 7) * u * 0.8 * 2;
        jzAddEllipse(g, d, d); jzAddFill(g, i % 3 === 0 ? acc : (i % 5 === 0 ? a2 : sc.fg));
        axm_gx(g, 'ADBE Vector Position', HD + axm_f('var ph=t/$0+$1,j=Math.floor(ph),a=(ph-j)*$0,h=$2*(0.22+0.28*hh(j*7.31+$3+SD*0.017)),v=4*h/$4,g=2*v/$4;' +
            '(t-a<0||a>$4)?[$5,$6]:[$5+(hh(j*3.17+$7+SD*0.019)*2-1)*$8*a,$9-v*a+g*a*a/2]',
            [Tl, (i + axm_r(s, i, k, 9)) / M, H, i * 1.37 + k * 11.3, Tf, W * ems[k], H + 200 * u, i * 2.11 + k * 5.9, jzU(ctx) * 0.11, H + 6 * u]));
    }
    axm_keepOut(S, bb, 40 * u);
    axm_op(ctx, S, ST);
});

/* ---- xmDominoes — ドミノ倒し: a row of upright bars topples in a chain along the lyric, then stands back up from the far end */
axm_reg('xmDominoes', false, function (ctx, bb, p, u, ST) {
    var W = ctx.W, H = ctx.H, sc = ctx.sc, gap = 14 * u, h = (p.big ? 68 : 52) * u, w = 8.5 * u, m = axm_mg(ctx) * 0.4, i;
    var dn = H - m - bb.y1 - gap - h, up = bb.y0 - gap - h - m, low = !!p.low;
    if ((low ? dn : up) < 0) low = !low;
    if ((low ? dn : up) < 0) return;
    var yb = low ? bb.y1 + gap + h : bb.y0 - gap, dir = p.right ? 1 : -1, xa = bb.x0 + w, xb = bb.x1 - w;
    if (xb - xa < 220 * u) { var c = jzClamp((xa + xb) / 2, m + 110 * u, W - m - 110 * u); xa = c - 110 * u; xb = c + 110 * u; }
    var lenAll = xb - xa - h * 0.9, N = jzClamp(Math.ceil(lenAll / (h * 0.66)) + 1, 4, 40), pitch = lenAll / (N - 1);
    var thMax = Math.min(Math.acos(jzClamp(w / pitch, 0, 1)) * 0.985, 86 * AXM_D), rate = 15 * axm_sp(ctx), Tf = (N + 3) / rate, T = 2 * Tf + 1.3;
    var HD = axm_H(ctx, ST) + axm_f('var tc=t>0.5?md(t-0.5,$0):-1,wf=tc*$1,wr=(tc-$2)*$1;function sm(x){var z=cl(x/2.2);return z*z*(3-2*z);}', [T, rate, Tf + 0.7]);
    var S = jzShapeLayer(ctx, 'dominoes', 0, 0), gB = jzGrp(S, 'bars');
    for (i = N - 1; i >= 0; i--) {
        var g = axm_sub(gB, 'bar ' + (i + 1)), x = dir > 0 ? xa + i * pitch : xb - i * pitch;
        jzAddRect(g, w, h, 0, dir > 0 ? -w / 2 : w / 2, -h / 2); jzAddFill(g, i === 0 ? axm_acc(sc) : sc.fg);
        jzGX(g).property('ADBE Vector Position').setValue([x + dir * w / 2, 0]);
        axm_gx(g, 'ADBE Vector Rotation', HD + axm_f('tc<0?0:$0*iq((wf-$1)/2.2)*(1-sm(wr-$2))', [dir * (i === N - 1 ? 90 : thMax / AXM_D), i, N - 1 - i]));
    }
    jzGX(gB).property('ADBE Vector Position').setValue([0, yb]);
    axm_gx(gB, 'ADBE Vector Scale', HD + '[100,obk(t/0.3)*K*100]');
    var gf = jzGrp(S, 'floor');
    jzAddPath(gf, [[-(xb - xa) / 2, 0], [(xb - xa) / 2, 0]], false); axm_st(gf, axm_subc(sc), 1.4 * u, 70, 1);
    jzGX(gf).property('ADBE Vector Position').setValue([(xa + xb) / 2, yb]);
    axm_gx(gf, 'ADBE Vector Scale', HD + '[oe(t/0.4)*100,100]');
    axm_op(ctx, S, ST);
});

/* ---- xmPong — ピンポン: a two-paddle rally in the free band beside the lyric: the ball zigzags, the paddles track it */
axm_reg('xmPong', false, function (ctx, bb, p, u, ST) {
    var W = ctx.W, sc = ctx.sc, m = axm_mg(ctx), hB = (p.big ? 210 : 160) * u, bd = axm_band(ctx, bb, hB, p.low, 20 * u, false), k;
    if (!bd) return;
    var xa = m * 1.2, xb = W - m * 1.2, pw = 13 * u, ph = 66 * u, bs = 11 * u, sp = axm_sp(ctx), acc = axm_acc(sc);
    var y0 = bd.y + bs, y1 = bd.y + bd.h - bs, mid = (y0 + y1) / 2, lo = y0 + ph / 2 - bs, hi = y1 - ph / 2 + bs;
    var HD = axm_H(ctx, ST) + axm_f('function ball(tt){var k=tri(tt*$0+$1);return [$2+$3*k,$4+$5*tri(tt*$6+$7),k];}' +
        'var b=ball(t),e=oe(t/0.45),off=((1-e)+(1-K))*$8;function cy(v){return Math.max($9,Math.min($10,v));}',
        [sp / 2.3, p.r, xa + pw + bs, xb - xa - 2 * (pw + bs), y0, y1 - y0, sp / 1.37, p.r * 3, 120 * u, lo, hi]);
    var S = jzShapeLayer(ctx, 'pong rally', 0, 0), g, fl;
    for (k = 0; k <= 4; k++) {                           // ball (k = 0) and its fading trail
        g = jzGrp(S, k ? 'trail ' + k : 'ball');
        jzAddRect(g, bs * 2 * (1 - k * 0.12), bs * 2 * (1 - k * 0.12)); jzAddFill(g, k ? sc.fg : axm_col(sc, p), k ? (0.4 - k * 0.08) * 100 : 100);
        axm_gx(g, 'ADBE Vector Position', HD + 'var q=ball(t-' + jzN(k * 0.035) + ');[q[0],q[1]]');
        axm_gx(g, 'ADBE Vector Group Opacity', HD + 'cl(e*1.2)*100');
    }
    g = jzGrp(S, 'net');
    var y = bd.y + 4 * u, cnt = 0; while (y < bd.y + bd.h - 8 * u) { cnt++; y += 22 * u; }
    jzAddRect(g, 4 * u, 11 * u, 0, W / 2, bd.y + 9.5 * u); axm_rep(g, Math.max(1, cnt), 0, 22 * u); jzAddFill(g, axm_subc(sc), 55);
    g = jzGrp(S, 'paddle R');
    jzAddRect(g, pw, ph); fl = jzAddFill(g, sc.fg);
    jzSetExpr(fl.property('ADBE Vector Fill Color'), HD + 'b[2]>0.95?' + axm_cx(acc) + ':' + axm_cx(sc.fg));
    axm_gx(g, 'ADBE Vector Position', HD + axm_f('[$0+off,cy($1+(b[1]-$1)*(0.15+b[2]*0.85))]', [xb - pw / 2, mid]));
    g = jzGrp(S, 'paddle L');
    jzAddRect(g, pw, ph); fl = jzAddFill(g, sc.fg);
    jzSetExpr(fl.property('ADBE Vector Fill Color'), HD + 'b[2]<0.05?' + axm_cx(acc) + ':' + axm_cx(sc.fg));
    axm_gx(g, 'ADBE Vector Position', HD + axm_f('[$0-off,cy(b[1]+($1-b[1])*b[2]*0.85)]', [xa + pw / 2, mid]));
    axm_op(ctx, S, ST);
});

/* ---- xmConveyor — ベルト運搬: a conveyor belt beside the lyric carries simple shapes along and drops them off the end.
   Each belt slot keeps its shape and colour (the browser re-rolls them every lap) */
axm_reg('xmConveyor', false, function (ctx, bb, p, u, ST) {
    var W = ctx.W, sc = ctx.sc, s = p.seed, m = axm_mg(ctx), bd = axm_band(ctx, bb, 140 * u, p.low, 14 * u), i, k;
    if (!bd) return;
    var dir = p.right ? 1 : -1, sz = 17 * u, v = 90 * u * axm_sp(ctx), spc = 120 * u;
    var xa = Math.max(m, bb.x0 - 30 * u), xb = Math.min(W - m, bb.x1 + 30 * u);
    if (xb - xa < 340 * u) { var c = jzClamp((xa + xb) / 2, m + 170 * u, W - m - 170 * u); xa = c - 170 * u; xb = c + 170 * u; }
    xb -= 50 * u * (dir > 0 ? 1 : 0); xa += 50 * u * (dir > 0 ? 0 : 1);
    var len = xb - xa, yT = bd.y + 58 * u, bt = 16 * u, cx = (xa + xb) / 2, HD = axm_H(ctx, ST) + 'var e=oc(t/0.45);';
    var cnt = Math.ceil(len / spc) + 1, loop = cnt * spc, cols = [sc.fg, axm_acc(sc), axm_acc2(sc)];
    var S = jzShapeLayer(ctx, 'conveyor belt', 0, 0), g;
    for (i = 0; i < cnt; i++) {
        var ty = Math.floor(axm_r(s, i, 1) * 3), col = cols[Math.floor(axm_r(s, i, 2) * 3)];
        var pre = HD + axm_f('var d=md($0+t*$1,$2),ov=d-$3,tt=ov/$1;', [i * spc, v, loop, len]);
        g = jzGrp(S, 'item ' + (i + 1));
        if (ty === 0) jzAddEllipse(g, sz * 2, sz * 2);
        else if (ty === 1) jzAddRect(g, sz * 1.8, sz * 1.8);
        else { var tp = []; for (k = 0; k < 3; k++) { var an = -90 * AXM_D + k * AXM_TAU / 3; tp.push([Math.cos(an) * sz * 1.2, sz * 0.2 + Math.sin(an) * sz * 1.2]); } jzAddPath(g, tp, true); }
        jzAddFill(g, col);
        axm_gx(g, 'ADBE Vector Position', pre + axm_f('ov>0?[$0+$1*ov*0.75,$2+Math.min(tt*tt*$3,$4)]:[$5+$6*d,$2]',
            [(dir > 0 ? xa : xb) + dir * len, dir, yT - sz - 2 * u, 900 * u, 60 * u, dir > 0 ? xa : xb, dir]));
        if (ty !== 0) axm_gx(g, 'ADBE Vector Rotation', pre + 'ov>0?' + jzN(dir * 5 * 57.2958) + '*tt:0');
        axm_gx(g, 'ADBE Vector Scale', pre + axm_f('var s=obk(d/$0)*obk((t-$1)/0.3)*100;[s,s]', [30 * u, 0.1 + (i % 5) * 0.05]));
        axm_gx(g, 'ADBE Vector Group Opacity', pre + axm_f('(ov>0?1-cl(ov/$0):cl(d/$1))*e*100', [spc * 0.55, 26 * u]));
    }
    g = jzGrp(S, 'rollers');
    jzAddPath(g, [[-len / 2, 0], [len / 2, 0]], false);
    axm_dash(axm_st(g, axm_subc(sc), 3 * u, null, 1), 5 * u, 15 * u, HD + jzN(-dir * v) + '*t');
    jzGX(g).property('ADBE Vector Position').setValue([cx, yT + bt / 2]);
    axm_gx(g, 'ADBE Vector Scale', HD + '[e*100,100]');
    g = jzGrp(S, 'belt');
    var rc = jzAddRect(g, len + bt, bt, bt / 2, cx, yT + bt / 2);
    jzSetExpr(rc.property('ADBE Vector Rect Size'), HD + '[' + jzN(bt) + '+' + jzN(len) + '*e,' + jzN(bt) + ']');
    axm_st(g, sc.fg, 2.6 * u, null, 1);
    axm_op(ctx, S, ST);
});

// ================================================================ shapes that build

/* ---- xmStairs — 階段ブロック: blocks drop into a screen corner and build a staircase; a dot keeps hopping up the steps */
axm_reg('xmStairs', false, function (ctx, bb, p, u, ST) {
    var W = ctx.W, H = ctx.H, sc = ctx.sc, b = (p.big ? 56 : 44) * u, Sn = 4 + p.n, gp = 3 * u, sx = p.right ? -1 : 1, sy = p.low ? -1 : 1, i, j, idx = 0;
    var X0 = p.right ? W : 0, Y0 = p.low ? H : 0, acc = axm_acc(sc), HD = axm_H(ctx, ST), r = 9.5 * u;
    var S = jzShapeLayer(ctx, 'step blocks', 0, 0), g = jzGrp(S, 'hopper');
    jzAddEllipse(g, r * 2, r * 2); jzAddFill(g, sc.fg);
    axm_gx(g, 'ADBE Vector Position', HD + axm_f('var ph=(t-$0)/$1,jj=Math.floor(ph)%$2,f=ph-Math.floor(ph),ja=$3-jj,jb=ja-1;' +
        'function tp(j){return $4+$5*(($6-j)*$7+$8);}function xs(j){return $9+$10*(j+0.5)*$7;}' +
        'var x=xs(ja)+(xs(jb)-xs(ja))*f,y=tp(ja)+(tp(jb)-tp(ja))*f+$5*4*f*(1-f)*$7*0.7;' +
        '(ph<0||jj>=$3||(x>$11&&x<$12&&y>$13&&y<$14))?[-9999,-9999]:[x,y]',
        [0.5 + Sn * Sn * 0.018, 0.34 / axm_sp(ctx), Sn + 1, Sn - 1, Y0, sy, Sn, b, r + 2 * u, X0, sx, bb.x0 - 5 * u, bb.x1 + 5 * u, bb.y0 - 5 * u, bb.y1 + 5 * u]));
    var gB = jzGrp(S, 'blocks');
    for (i = 0; i < Sn; i++) for (j = 0; j < Sn - i; j++, idx++) {
        var x = sx > 0 ? X0 + j * b : X0 - (j + 1) * b, y = sy > 0 ? Y0 + i * b : Y0 - (i + 1) * b, diag = i === Sn - 1 - j;
        if (axm_hit(x, y, x + b, y + b, bb, 8 * u)) continue;
        var gk = axm_sub(gB, 'block ' + (idx + 1));
        jzAddRect(gk, b - gp, b - gp); jzAddFill(gk, diag ? acc : sc.fg, diag ? 100 : 86);
        axm_gx(gk, 'ADBE Vector Position', HD + axm_f('var q=cl((t-$0)/0.34);q<=0?[-9999,-9999]:[$1,$2+$3*(1-oc(q))]', [idx * 0.022, x + b / 2, y + b / 2, sy * b * 3]));
    }
    axm_gx(gB, 'ADBE Vector Position', HD + '[0,' + jzN(-sy * b * (Sn + 1)) + '*(1-K)]');
    axm_op(ctx, S, ST);
});

/* ---- xmIsoCubes — 積む立方体: isometric cubes drop in one after another and stack into a small pile in a free corner */
axm_reg('xmIsoCubes', false, function (ctx, bb, p, u, ST) {
    var sc = ctx.sc, s = p.seed, a = (p.big ? 46 : 36) * u, sp = axm_spot(ctx, bb, a * 5.4, a * 6.2, p, 14 * u), x, y, z, i;
    if (!sp) return;
    var ox = sp.cx, oy = sp.y + a * 3.6, kx = a * 0.866, acc = axm_acc(sc), cL = jzMixHex(sc.fg, sc.bg, 0.55), cR = jzMixHex(sc.fg, sc.bg, 0.28), list = [];
    for (x = 0; x < 3; x++) for (y = 0; y < 3; y++) {
        var hgt = x + y === 0 ? 3 : jzClamp(3 - x - y + Math.floor(axm_r(s, x, y, 1) * 2.3), 0, 3);
        for (z = 0; z < hgt; z++) list.push({ dl: (z + (x + y) * 0.3) * 0.2, cx: ox + (x - y) * kx, cy: oy + (x + y) * a / 2 - z * a - a, top: (z === hgt - 1 && axm_r(s, x, y, 2) < 0.3) ? acc : sc.fg });
    }
    var HD = axm_H(ctx, ST), S = jzShapeLayer(ctx, 'iso cubes', 0, 0);
    for (i = list.length - 1; i >= 0; i--) {             // the browser paints back to front: the last cube is on top
        var q = list[i], g = jzGrp(S, 'cube ' + (i + 1)), f;
        f = axm_sub(g, 'top'); jzAddPath(f, [[0, -a / 2], [kx, 0], [0, a / 2], [-kx, 0]], true); jzAddFill(f, q.top);
        f = axm_sub(g, 'right'); jzAddPath(f, [[kx, 0], [0, a / 2], [0, a * 1.5], [kx, a]], true); jzAddFill(f, cR);
        f = axm_sub(g, 'left'); jzAddPath(f, [[-kx, 0], [0, a / 2], [0, a * 1.5], [-kx, a]], true); jzAddFill(f, cL);
        axm_gx(g, 'ADBE Vector Position', HD + axm_f('var q=cl((t-$0)/0.36);q<=0?[-9999,-9999]:[$1,$2-(1-oc(q))*$3-(1-K)*$4]', [q.dl, q.cx, q.cy, a * 2.5, a * 1.5]));
        axm_gx(g, 'ADBE Vector Group Opacity', HD + 'cl((t-' + jzN(q.dl) + ')/0.144)*100');
    }
    axm_op(ctx, S, ST);
});

/* ---- xmSlide — スライドパズル: a 3×3 tile puzzle in a free corner; one tile at a time slides into the empty cell.
   The moves are worked out here with the browser's rule and embedded per tile as a string of cells (one digit per step) */
axm_reg('xmSlide', false, function (ctx, bb, p, u, ST) {
    var sc = ctx.sc, s = p.seed, ts = (p.big ? 60 : 46) * u, gp = 7 * u, wd = ts * 3 + gp * 2, sp = axm_spot(ctx, bb, wd, wd, p, 16 * u), q, c, j, id;
    if (!sp) return;
    var stepT = 0.48 / axm_sp(ctx), MX = Math.min(400, Math.floor(Math.max(0, ctx.cut.dur - ST - 0.55) / stepT) + 2);
    var grid = [0, 1, 2, 3, 4, 5, 6, 7, -1], hole = 8, prev = -1, seq = [];
    for (id = 0; id < 8; id++) seq.push(String(id));
    for (q = 0; q < MX; q++) {
        var cnd = [], dd = [], hx = hole % 3, hy = Math.floor(hole / 3);
        if (hx > 0) cnd.push(hole - 1); if (hx < 2) cnd.push(hole + 1); if (hy > 0) cnd.push(hole - 3); if (hy < 2) cnd.push(hole + 3);
        for (j = 0; j < cnd.length; j++) if (cnd[j] !== prev) dd.push(cnd[j]);
        var k = dd[axm_h(s, q, 7) % dd.length];
        grid[hole] = grid[k]; grid[k] = -1; prev = hole; hole = k;
        for (c = 0; c < 9; c++) if (grid[c] >= 0) seq[grid[c]] += String(c);
    }
    var HD = axm_H(ctx, ST), acc = axm_acc(sc), S = jzShapeLayer(ctx, 'sliding tiles', 0, 0);
    for (id = 0; id < 8; id++) {
        var g = jzGrp(S, 'tile ' + (id + 1));
        jzAddRect(g, ts, ts, 7 * u); jzAddFill(g, id === 0 ? acc : sc.fg, id === 0 ? 100 : (0.6 + 0.3 * (id % 2)) * 100);
        axm_gx(g, 'ADBE Vector Position', HD + axm_f('var ph=Math.max(0,(t-0.55)/$0),m=Math.min(Math.floor(ph),$1),f=t<0.55?0:ioc((ph-m)/0.62),Q="' + seq[id] + '",' +
            'c0=parseInt(Q.charAt(m),10),c1=parseInt(Q.charAt(m+1),10),x0=c0%3,y0=Math.floor(c0/3);' +
            '[$2+(x0+(c1%3-x0)*f)*$4,$3+(y0+(Math.floor(c1/3)-y0)*f)*$4]', [stepT, MX - 1, sp.x + ts / 2, sp.y + ts / 2, ts + gp]));
        axm_gx(g, 'ADBE Vector Scale', HD + 'var e=obk((t-' + jzN(id * 0.035) + ')/0.3)*K*100;[e,e]');
    }
    axm_op(ctx, S, ST);
});

/* ---- xmGears — 歯車: two meshed gears in a free corner turn against each other at their tooth ratio */
function axm_gear(Rp, N, md) {
    var ro = Rp + md * 0.5, ri = Rp - md * 0.6, Pt = AXM_TAU / N, fr = [[0.2, ri], [0.31, ro], [0.69, ro], [0.8, ri]], o = [], i, j;
    for (i = 0; i < N; i++) for (j = 0; j < 4; j++) { var a = (i + fr[j][0]) * Pt; o.push([Math.cos(a) * fr[j][1], Math.sin(a) * fr[j][1]]); }
    return o;
}
axm_reg('xmGears', false, function (ctx, bb, p, u, ST) {
    var sc = ctx.sc, k = p.big ? 1.9 : 1.5, R1 = 56 * u * k, N1 = 12, N2 = 7, R2 = R1 * N2 / N1, md = 9 * u * k, phi = -28 * AXM_D, i;
    var w = R1 + (R1 + R2) * Math.cos(phi) + R2 + md * 2 + 8 * u, h = R1 * 2 + md * 2 + 26 * u * k, sp = axm_spot(ctx, bb, w, h, p, 14 * u);
    if (!sp) return;
    var fl = p.right ? -1 : 1, c1x = fl > 0 ? sp.x + md + 4 * u + R1 : sp.x + w - md - 4 * u - R1, c1y = sp.y + h - md - 4 * u - R1;
    var c2x = c1x + fl * (R1 + R2) * Math.cos(phi), c2y = c1y + (R1 + R2) * Math.sin(phi), ph2 = fl > 0 ? phi : Math.PI - phi;
    var HD = axm_H(ctx, ST) + 'var w0=(t*' + jzN(0.75 * axm_sp(ctx)) + '+(1-oc(t/0.9))*3)*57.2958;';
    var S = jzShapeLayer(ctx, 'gears', 0, 0);
    // small gear: filled, with a hole in the background colour
    var g2 = jzGrp(S, 'gear small'), f = axm_sub(g2, 'hole');
    jzAddEllipse(f, R2 * 0.52, R2 * 0.52); jzAddFill(f, sc.bg);
    f = axm_sub(g2, 'body'); jzAddPath(f, axm_gear(R2, N2, md), true); jzAddFill(f, p.accent ? sc.fg : axm_acc(sc));
    jzGX(g2).property('ADBE Vector Position').setValue([c2x, c2y]);
    axm_gx(g2, 'ADBE Vector Rotation', HD + jzN((ph2 + Math.PI - 0.5 * AXM_TAU / N2) / AXM_D) + '-w0*' + jzN(N1 / N2));
    axm_gx(g2, 'ADBE Vector Scale', HD + 'var e=obk((t-0.12)/0.5)*K*100;[e,e]');
    // large gear: outline, three spokes and a hub ring
    var g1 = jzGrp(S, 'gear large');
    jzAddPath(g1, axm_gear(R1, N1, md), true);
    for (i = 0; i < 3; i++) { var a = i * AXM_TAU / 3; jzAddPath(g1, [[Math.cos(a) * R1 * 0.2, Math.sin(a) * R1 * 0.2], [Math.cos(a) * (R1 - md), Math.sin(a) * (R1 - md)]], false); }
    jzAddEllipse(g1, R1 * 0.4, R1 * 0.4);
    axm_st(g1, sc.fg, 2.4 * u, null, 1, 2);
    jzGX(g1).property('ADBE Vector Position').setValue([c1x, c1y]);
    axm_gx(g1, 'ADBE Vector Rotation', HD + jzN(ph2 / AXM_D) + '+w0');
    axm_gx(g1, 'ADBE Vector Scale', HD + 'var e=obk(t/0.5)*K*100;[e,e]');
    axm_op(ctx, S, ST);
});

/* ---- xmSortBars — 並べ替え棒: a row of shuffled bars sorts itself: neighbours light up and swap until the heights are in order.
   The bubble sort is run here; each bar carries its column per step as a string of hex digits */
axm_reg('xmSortBars', false, function (ctx, bb, p, u, ST) {
    var sc = ctx.sc, s = p.seed, N = 8 + p.n * 2, k = p.big ? 1.9 : 1.5, bwid = 9 * u * k, pit = 15 * u * k, hm = 84 * u * k, i, j, a, b, q;
    var sp = axm_spot(ctx, bb, N * pit, hm + 8 * u, p, 14 * u); if (!sp) return;
    var arr = [], sw = [], seq = [], HEX = '0123456789abcdef';
    for (i = 0; i < N; i++) arr.push(i);
    for (i = N - 1; i > 0; i--) { j = axm_h(s, i, 3) % (i + 1); q = arr[i]; arr[i] = arr[j]; arr[j] = q; }
    var c = arr.slice(0);
    for (a = 0; a < N; a++) for (b = 0; b < N - 1 - a; b++) if (c[b] > c[b + 1]) { q = c[b]; c[b] = c[b + 1]; c[b + 1] = q; sw.push(b); }
    for (i = 0; i < N; i++) seq.push('');
    for (i = 0; i < N; i++) seq[arr[i]] += HEX.charAt(i);
    for (j = 0; j < sw.length; j++) { b = sw[j]; q = arr[b]; arr[b] = arr[b + 1]; arr[b + 1] = q; for (i = 0; i < N; i++) seq[arr[i]] += HEX.charAt(i); }
    var NS = sw.length, stepT = jzClamp(((ctx.cut.dur || 3) - 1.3) / Math.max(1, NS), 0.05, 0.2), yb = sp.y + sp.h - 3 * u, acc = axm_acc(sc);
    var HD = axm_H(ctx, ST), S = jzShapeLayer(ctx, 'sorting bars', 0, 0), gB = jzGrp(S, 'bars');
    for (i = 0; i < N; i++) {                              // i = the bar's rank (height)
        var h = hm * (i + 1) / N, g = axm_sub(gB, 'bar ' + (i + 1));
        var pre = HD + axm_f('var ph=Math.max(0,(t-0.5)/$0),m=Math.min(Math.floor(ph),$1),f=ioc((ph-m)/0.8),Q="' + seq[i] + '",c0=parseInt(Q.charAt(m),16),c1=parseInt(Q.charAt(Math.min(m+1,$1)),16);', [stepT, NS]);
        jzAddRect(g, bwid, h, 0, 0, -h / 2);
        var fl = jzAddFill(g, sc.fg, 92);
        jzSetExpr(fl.property('ADBE Vector Fill Color'), pre + axm_f('(t>0.5&&(m<$0?c0!=c1:Math.abs((ph-$0)*$1-c0)<1))?$2:$3', [NS, stepT * 14, axm_cx(acc), axm_cx(sc.fg)]));
        axm_gx(g, 'ADBE Vector Position', pre + axm_f('[$0+(c0+(c1-c0)*f)*$1,0]', [sp.x + pit / 2, pit]));
    }
    jzGX(gB).property('ADBE Vector Position').setValue([0, yb]);
    axm_gx(gB, 'ADBE Vector Scale', HD + '[100,obk(t/0.35)*K*100]');
    var gl = jzGrp(S, 'base');
    jzAddPath(gl, [[sp.x, yb + 3 * u], [sp.x + N * pit, yb + 3 * u]], false); axm_trim(gl, HD + 'oe(t/0.4)*100'); axm_st(gl, axm_subc(sc), 1.4 * u, 80, 1);
    axm_op(ctx, S, ST);
});

/* ---- xmPie — 分割パイ: a segmented donut assembles wedge by wedge in a free corner; one wedge sits apart and kicks out on the beat
   (no beat data in the content comp: the browser's own 0.5 s fallback clock) */
axm_reg('xmPie', false, function (ctx, bb, p, u, ST) {
    var sc = ctx.sc, s = p.seed, Rd = (p.big ? 124 : 96) * u, sp = axm_spot(ctx, bb, Rd * 2 + 50 * u, Rd * 2 + 50 * u, p, 14 * u), i;
    if (!sp) return;
    var Kn = 3 + p.n, fr = [], sum = 0, cols = [axm_acc(sc), sc.fg, axm_subc(sc), sc.fg, axm_acc2(sc), axm_subc(sc)], gpA = 1.6 * AXM_D;
    for (i = 0; i < Kn; i++) { fr.push(axm_rr(0.6, 1.7, s, i, 1)); sum += fr[i]; }
    var HD = axm_H(ctx, ST), S = jzShapeLayer(ctx, 'exploded pie', sp.cx, sp.cy), a0 = p.r * AXM_TAU;
    for (i = 0; i < Kn; i++) {
        var a1 = a0 + fr[i] / sum * AXM_TAU, am = (a0 + a1) / 2, n = Math.max(4, Math.ceil((a1 - a0) / (6 * AXM_D)));
        var pts = axm_arc(0, 0, Rd, a0 + gpA, a1 - gpA, n).concat(axm_arc(0, 0, Rd * 0.44, a1 - gpA * 2, a0 + gpA * 2, n));
        var g = jzGrp(S, 'wedge ' + (i + 1));
        jzAddPath(g, pts, true); jzAddFill(g, cols[i % cols.length], i === 0 ? 100 : (i % 2 ? 88 : 70));
        axm_gx(g, 'ADBE Vector Scale', HD + 'var e=obk((t-' + jzN(i * 0.07) + ')/0.36)*K*100;[e,e]');
        if (i === 0) axm_gx(g, 'ADBE Vector Position', HD + axm_f('var of=(12+14*Math.exp(-md(t,0.5)*7))*$0;[$1*of,$2*of]', [u, Math.cos(am), Math.sin(am)]));
        a0 = a1;
    }
    jzSetExpr(jzXf(S, 'ADBE Rotate Z'), axm_H(ctx, ST) + 't*' + jzN(9 * axm_sp(ctx) * (p.right ? 1 : -1)));
    axm_op(ctx, S, ST);
});

/* ---- xmScatter — 散布図: a small chart in a free corner: axes draw on, data points pop in one by one, then a trend line runs through */
axm_reg('xmScatter', false, function (ctx, bb, p, u, ST) {
    var sc = ctx.sc, s = p.seed, w = (p.big ? 330 : 260) * u, h = w * 0.72, sp = axm_spot(ctx, bb, w, h, p, 14 * u), i;
    if (!sp) return;
    var x0 = sp.x + 10 * u, y0 = sp.y + h - 10 * u, pw = w - 18 * u, phh = h - 18 * u, M = 10 + p.n * 5, up = p.v % 2 === 0;
    var HD = axm_H(ctx, ST), S = jzShapeLayer(ctx, 'scatter plot', 0, 0);
    var g = jzGrp(S, 'trend'), fa = up ? 0.14 + 0.7 * 0.03 : 0.86 - 0.7 * 0.03, fb = up ? 0.14 + 0.7 * 0.97 : 0.86 - 0.7 * 0.97;
    jzAddPath(g, [[x0 + 0.03 * pw, y0 - fa * phh], [x0 + 0.97 * pw, y0 - fb * phh]], false);
    axm_trim(g, HD + 'ioc((t-' + jzN(0.45 + M * 0.05) + ')/0.5)*100'); axm_st(g, axm_acc(sc), 3.2 * u, null, 2);
    for (i = M - 1; i >= 0; i--) {
        var x = 0.06 + 0.88 * axm_r(s, i, 1), y = jzClamp((up ? 0.14 + 0.7 * x : 0.86 - 0.7 * x) + axm_rs(s, i, 2) * 0.15, 0.04, 0.97);
        g = jzGrp(S, 'point ' + (i + 1));
        jzAddEllipse(g, 11 * u, 11 * u); jzAddFill(g, i % 6 === 2 ? axm_acc2(sc) : sc.fg, 95);
        jzGX(g).property('ADBE Vector Position').setValue([x0 + x * pw, y0 - y * phh]);
        axm_gx(g, 'ADBE Vector Scale', HD + 'var q=obk((t-' + jzN(0.3 + i * 0.05) + ')/0.26)*K*100;[q,q]');
    }
    g = jzGrp(S, 'ticks');
    for (i = 1; i <= 4; i++) {
        jzAddPath(g, [[x0 + pw * i / 4.4, y0], [x0 + pw * i / 4.4, y0 + 5 * u]], false);
        jzAddPath(g, [[x0, y0 - phh * i / 4.4], [x0 - 5 * u, y0 - phh * i / 4.4]], false);
    }
    axm_st(g, sc.fg, 1.4 * u, null, 1);
    axm_gx(g, 'ADBE Vector Group Opacity', HD + 'oc(t/0.45)*100');
    g = jzGrp(S, 'axes');
    jzAddPath(g, [[x0, y0 - phh], [x0, y0], [x0 + pw, y0]], false); axm_trim(g, HD + 'oc(t/0.45)*100'); axm_st(g, sc.fg, 2.6 * u, null, 2, 2);
    axm_op(ctx, S, ST);
});

// ---------------------------------------------------------------- notes for the reacting accents and back patterns
// The content comp has no beat / loudness data: beat-driven parts
// run on the browser's own fallback clock (one beat = 0.5 s of cut time), the gauge on the browser's fallback energy curve.
// Back patterns are built from static paths moved by group transforms, Trim Paths, Repeaters and masks; where the browser
// re-computes a whole field per frame (triangle lattice, dot matrix) the cells are grouped and the wave is a travelling matte.

// ================================================================ accents that react

/* ---- xmBeatSteps — 拍ステップ: a step-sequencer row beside the lyric: the lit square advances one step on every beat */
axm_reg('xmBeatSteps', false, function (ctx, bb, p, u, ST) {
    var W = ctx.W, sc = ctx.sc, Kn = 8, s2 = (p.big ? 40 : 30) * u, gp = s2 * 0.55, wid = Kn * s2 + (Kn - 1) * gp, m = axm_mg(ctx), i;
    var bd = axm_band(ctx, bb, s2 * 1.7, p.low, 18 * u); if (!bd) return;
    var cx = jzClamp((bb.x0 + bb.x1) / 2, m + wid / 2, W - m - wid / 2), yc = bd.y + bd.h / 2, acc = axm_acc(sc);
    var HD = axm_H(ctx, ST) + 'var bi=md(Math.floor(t/0.5),8),pu=Math.exp(-md(t,0.5)*7);', S = jzShapeLayer(ctx, 'beat steps', 0, 0), g;
    for (i = 0; i < Kn; i++) {
        var x = cx - wid / 2 + i * (s2 + gp) + s2 / 2, pre = HD + 'var e=obk((t-' + jzN(i * 0.03) + ')/0.3)*K,i=' + i + ';';
        g = jzGrp(S, 'step ' + (i + 1));
        jzAddRect(g, s2, s2);
        var fl = jzAddFill(g, sc.fg);
        jzSetExpr(fl.property('ADBE Vector Fill Color'), pre + 'i===bi?' + axm_cx(acc) + ':' + axm_cx(sc.fg));
        jzGX(g).property('ADBE Vector Position').setValue([x, yc]);
        axm_gx(g, 'ADBE Vector Scale', pre + 'var s=(i===bi?1+0.4*pu:0.8)*e*100;[s,s]');
        axm_gx(g, 'ADBE Vector Group Opacity', pre + 'i===bi?100:(i<bi?60:0)');
        g = jzGrp(S, 'outline ' + (i + 1));
        jzAddRect(g, s2 * 0.8, s2 * 0.8); axm_st(g, sc.fg, 2.2 * u, 80);
        jzGX(g).property('ADBE Vector Position').setValue([x, yc]);
        axm_gx(g, 'ADBE Vector Group Opacity', pre + 'i>bi?cl(e)*100:0');
    }
    g = jzGrp(S, 'bar marks');
    for (i = 0; i < Kn; i += 4) { var xm = cx - wid / 2 + i * (s2 + gp) + s2 / 2; jzAddPath(g, [[xm - s2 / 2, yc + bd.s * s2 * 0.82], [xm + s2 / 2, yc + bd.s * s2 * 0.82]], false); }
    axm_st(g, axm_subc(sc), 1.6 * u, 80, 1);
    axm_gx(g, 'ADBE Vector Group Opacity', HD + 'cl(obk(t/0.3))*100');
    axm_op(ctx, S, ST);
});

/* ---- xmGauge — 針メーター: an analogue dial in a free corner; the needle follows the loudness of the music
   (here: the browser's fallback energy = slow noise + a kick every 0.5 s) */
axm_reg('xmGauge', false, function (ctx, bb, p, u, ST) {
    var sc = ctx.sc, Rd = (p.big ? 140 : 108) * u, sp = axm_spot(ctx, bb, Rd * 2 + 24 * u, Rd + 30 * u, p, 14 * u), i, gi;
    if (!sp) return;
    var cx = sp.cx, cy = sp.y + sp.h - 14 * u, acc = axm_acc(sc), HD = axm_H(ctx, ST) + 'var e=oc(t/0.5);';
    var S = jzShapeLayer(ctx, 'needle gauge', cx, cy), g = jzGrp(S, 'hub');
    jzAddEllipse(g, 16 * u, 16 * u); jzAddFill(g, sc.fg);
    axm_gx(g, 'ADBE Vector Scale', HD + '[e*100,e*100]');
    var NE = HD + 'function n1(x,s){var i=Math.floor(x),f=x-i,w=f*f*(3-2*f),a=hh(i*1.31+s)*2-1,b=hh((i+1)*1.31+s)*2-1;return a+(b-a)*w;}' +
        'var en=cl(0.42+0.3*n1((' + jzN(ctx.cut.start || 0) + '+time)*1.7,SD*0.01)+0.3*Math.exp(-md(t,0.5)*6)),v=1-Math.abs(1-cl(t/0.5)*2);v=v+(en-v)*cl((t-0.45)/0.25);';
    g = jzGrp(S, 'needle');
    jzAddPath(g, [[-10 * u, 0], [Rd * 0.84, 0]], false);
    var st = axm_st(g, sc.fg, 4 * u, null, 2);
    jzSetExpr(st.property('ADBE Vector Stroke Color'), NE + 'v>0.75?' + axm_cx(acc) + ':' + axm_cx(sc.fg));
    axm_gx(g, 'ADBE Vector Rotation', NE + '180*(1+Math.max(0.02,Math.min(0.98,v)))');
    axm_gx(g, 'ADBE Vector Group Opacity', HD + 'cl(t/0.15)*100');
    // ticks in four groups (colour × weight); they come on along the arc
    var TG = [['ticks', sc.fg, 1.5, [1, 2, 3, 4, 6, 7]], ['ticks major', sc.fg, 2.4, [0, 5]], ['ticks hot', acc, 1.5, [8, 9]], ['tick max', acc, 2.4, [10]]];
    for (gi = 0; gi < TG.length; gi++) {
        g = jzGrp(S, TG[gi][0]);
        for (i = 0; i < TG[gi][3].length; i++) {
            var ti = TG[gi][3][i], a = Math.PI * (1 + ti / 10), l = (ti % 5 === 0 ? 22 : 12) * u, r0 = Rd - 3 * u;
            jzAddPath(g, [[Math.cos(a) * r0, Math.sin(a) * r0], [Math.cos(a) * (r0 - l), Math.sin(a) * (r0 - l)]], false);
        }
        axm_st(g, TG[gi][1], TG[gi][2] * u, null, 1);
        axm_gx(g, 'ADBE Vector Group Opacity', HD + 'cl((e-' + jzN(TG[gi][3][0] / 10 * 0.8) + ')*5)*100');
    }
    g = jzGrp(S, 'red zone');
    jzAddPath(g, axm_arc(0, 0, Rd - 7 * u, Math.PI * 1.72, Math.PI * 2, 14), false);
    axm_trim(g, HD + 'cl((e-0.72)/0.28)*100'); axm_st(g, acc, 6 * u, null, 1);
    g = jzGrp(S, 'dial');
    jzAddPath(g, axm_arc(0, 0, Rd, Math.PI, Math.PI * 2, 48), false);
    axm_trim(g, HD + 'e*100'); axm_st(g, sc.fg, 2.6 * u, null, 1, 2);
    axm_op(ctx, S, ST);
});

/* ---- xmHatch — 斜線の影: an offset drop shadow of the lyric block made only of diagonal hatching that sweeps on and creeps.
   One hatch line × Repeater, clipped by two masks: the shifted box (add) minus the lyric's own box (subtract) */
axm_reg('xmHatch', false, function (ctx, bb, p, u, ST) {
    var sc = ctx.sc, f = axm_frame(ctx, bb, axm_pad(bb, u, 0.8)), d = (18 + p.n * 11) * u, dx = p.right ? d : -d, dy = p.low ? d : -d;
    var sp = 11 * u, x0 = f.x0 + dx, y0 = f.y0 + dy, cnt = Math.min(600, Math.ceil((f.w + f.h) / sp) + 1), HD = axm_H(ctx, ST);
    var S = jzShapeLayer(ctx, 'hatch shadow', 0, 0), g = jzGrp(S, 'hatch'), xs = x0 + (p.right ? 0 : (cnt - 1) * sp);
    jzAddPath(g, [[xs, y0], [xs - f.h, y0 + f.h]], false);
    var rp = axm_rep(g, cnt, p.right ? sp : -sp, 0);
    jzSetExpr(rp.property('ADBE Vector Repeater Copies'), HD + 'Math.ceil(' + cnt + '*ioc(t/0.55))');
    axm_st(g, axm_col(sc, p), 2.2 * u, 90, 1);
    axm_gx(g, 'ADBE Vector Position', HD + '[md(t*' + jzN(9 * u * axm_sp(ctx)) + ',' + jzN(sp) + '),0]');
    axm_mask(S, axm_rectShape(x0, y0, x0 + f.w, y0 + f.h));
    axm_mask(S, axm_rectShape(f.x0, f.y0, f.x1, f.y1), MaskMode.SUBTRACT);
    axm_op(ctx, S, ST);
});

// ================================================================ back-layer patterns (kept faint)

/* ---- xmPolyGrow — 増える角: a large faint polygon behind the lyric keeps gaining and losing a corner (triangle … octagon).
   Polystar polygons with a fractional Points value (AE draws the same open-ended in-between polygon as the browser) */
axm_reg('xmPolyGrow', true, function (ctx, bb, p, u, ST) {
    var W = ctx.W, H = ctx.H, sc = ctx.sc, m = jzU(ctx), c = axm_ln(sc), dir = p.right ? 1 : -1, i, k;
    var cx = p.corner ? W * (p.right ? 0.8 : 0.2) : W * 0.5, cy = p.corner ? H * (p.low ? 0.74 : 0.26) : H * 0.5;
    var R0 = m * (p.corner ? 0.25 : 0.4) * (p.big ? 1.12 : 1);
    var HD = axm_H(ctx, 0) + axm_f('var ph=t/$0,k=Math.floor(ph),f=ioc((ph-k)/0.5);function sq(n){var z=md(n+$1,10);return 3+(z<5?z:10-z);}var ne=sq(k)+(sq(k+1)-sq(k))*f,R0=$2*oc(t/0.5);',
        [0.95 / axm_sp(ctx), p.v, R0]);
    var S = jzShapeLayer(ctx, 'growing polygon', cx, cy), g;
    for (i = 0; i < 8; i++) {
        g = jzGrp(S, 'corner ' + (i + 1));
        jzAddEllipse(g, 18 * u, 18 * u); jzAddFill(g, c);
        axm_gx(g, 'ADBE Vector Position', HD + axm_f('var a=(-90+$0*t)*0.0174533+$1*6.283185/ne;$1>=Math.ceil(ne-0.000001)?[-99999,-99999]:[Math.cos(a)*R0,Math.sin(a)*R0]', [dir * 6, i]));
    }
    for (k = 0; k < 2; k++) {
        g = jzGrp(S, k ? 'inner' : 'outer');
        var st = jzAddStar(g, 3, R0 * (k ? 0.62 : 1), R0 * 0.3);
        st.property('ADBE Vector Star Type').setValue(2);
        jzSetExpr(st.property('ADBE Vector Star Points'), HD + 'ne');
        jzSetExpr(st.property('ADBE Vector Star Outer Radius'), HD + 'R0*' + (k ? 0.62 : 1));
        jzSetExpr(st.property('ADBE Vector Star Rotation'), HD + 't*' + jzN(k ? -dir * 9 : dir * 6));
        axm_st(g, c, (k ? 2.4 : 4.5) * u, k ? 80 : 90, 2, 2);
    }
    axm_op(ctx, S, 0);
});

/* ---- xmTriLattice — 三角タイル: a triangle lattice spreads from a screen corner; cells fill in, breathe and empty again.
   The cells are static paths in seven groups (outlines, four breathing phases of fills, two of accent fills);
   the spread from the corner and the fall-off are a feathered mask growing out of that corner */
axm_reg('xmTriLattice', true, function (ctx, bb, p, u, ST) {
    var W = ctx.W, H = ctx.H, sc = ctx.sc, s = p.seed, m = jzU(ctx), sd = m * 0.088 * (p.big ? 1.2 : 1), hT = sd * 0.866, c = axm_dim(sc), acc = axm_acc(sc), r, q, i, gi;
    var ox = p.right ? W : 0, oy = p.low ? H : 0, sx = p.right ? -1 : 1, sy = p.low ? -1 : 1, reach = m * (0.5 + 0.06 * p.n), rows = Math.ceil(reach / hT), cols = Math.ceil(reach / (sd / 2));
    var sets = [[], [], [], [], [], [], []];              // 0 outlines, 1-4 fills, 5-6 accent fills
    for (r = 0; r < rows; r++) for (q = -1; q < cols; q++) {
        var upT = (q + r) % 2 === 0, gx = (q + 1) * sd / 2, gy = (r + 0.5) * hT, dd = axm_hyp(gx, gy) / reach;
        if (jzClamp((1 - dd) * 1.6, 0, 1) <= 0) continue;
        var ya = (upT ? r + 1 : r) * hT, yb = (upT ? r : r + 1) * hT, pts = [[q * sd / 2, ya], [(q + 2) * sd / 2, ya], [gx, yb]], cy2 = (ya * 2 + yb) / 3, P2 = [];
        for (i = 0; i < 3; i++) P2.push([ox + sx * (gx + (pts[i][0] - gx) * 0.9), oy + sy * (cy2 + (pts[i][1] - cy2) * 0.9)]);
        var h = axm_r(s, r, q, 2), ph = axm_r(s, r, q, 3);
        sets[h < 0.05 ? 5 + Math.floor(ph * 2) : (h < 0.48 ? 1 + Math.floor(ph * 4) : 0)].push(P2);
    }
    var HD = axm_H(ctx, 0), S = jzShapeLayer(ctx, 'triangle lattice', 0, 0), w0 = 0.9 * axm_sp(ctx);
    for (gi = 6; gi >= 0; gi--) {
        if (!sets[gi].length) continue;
        var g = jzGrp(S, gi === 0 ? 'outlines' : (gi < 5 ? 'fills ' + gi : 'accent ' + (gi - 4)));
        for (i = 0; i < sets[gi].length; i++) jzAddPath(g, sets[gi][i], true);
        if (gi === 0) axm_st(g, c, 1.6 * u, 80, 2, 2);
        else {
            jzAddFill(g, gi < 5 ? c : acc);
            var pz = gi < 5 ? (gi - 0.5) / 4 * AXM_TAU : (gi - 4.5) / 2 * AXM_TAU;
            axm_gx(g, 'ADBE Vector Group Opacity', HD + axm_f('var tg=0.5+0.5*Math.sin(t*$0+$1);', [w0, pz]) + (gi < 5 ? '(0.25+0.7*tg)*100' : '30*tg'));
        }
    }
    var mk = axm_mask(S, jzCircleShape(ox, oy, reach * 0.6875), null, reach * 0.625);
    jzSetExpr(mk.property('ADBE Mask Offset'), HD + '-(1-oc(t/0.75))*' + jzN(reach));
    axm_op(ctx, S, 0);
});

/* ---- xmDotWave — 点灯ドット: a dot-matrix panel behind the lyric; a diagonal wave of larger, brighter dots keeps rolling through.
   Three layers: the small-dot grid (Repeaters), a grid of large + lit dots, and the soft diagonal bands that reveal it as an
   alpha matte and travel at the browser wave's speed (dots brighten into the band instead of swelling one by one) */
axm_reg('xmDotWave', true, function (ctx, bb, p, u, ST) {
    var W = ctx.W, H = ctx.H, sc = ctx.sc, m = jzU(ctx), d = m * 0.042, strip = p.v >= 3, dir = p.right ? 1 : -1;
    var cols = Math.min(64, Math.floor(W * 0.92 / d)), rows = Math.min(26, Math.max(3, Math.round(H * (strip ? 0.2 : 0.52) / d)));
    var cy = strip ? H * (p.low ? 0.82 : 0.18) : H * 0.5, x0 = W / 2 - (cols - 1) * d / 2, y0 = cy - (rows - 1) * d / 2, sp = axm_sp(ctx);
    var HD = axm_H(ctx, 0), dim = axm_dim(sc), ext = Math.max(cols, rows) * d;
    function grid(S, name, dia, col, op) {
        var g = jzGrp(S, name);
        jzAddEllipse(g, dia, dia, x0, y0); axm_rep(g, cols, d, 0); axm_rep(g, rows, 0, d); jzAddFill(g, col, op);
    }
    function reveal(S) {                                  // the panel lights up from its centre outwards
        var mk = axm_mask(S, axm_ellShape(W / 2, cy, cols * d * 0.78, rows * d * 0.78), null, d * 3);
        jzSetExpr(mk.property('ADBE Mask Offset'), HD + '-(1-cl(t/0.7))*' + jzN(ext * 0.8));
        axm_op(ctx, S, 0);
    }
    var S1 = jzShapeLayer(ctx, 'dot matrix', 0, 0);
    grid(S1, 'dots', d * 0.19, dim, 95); reveal(S1);
    var S2 = jzShapeLayer(ctx, 'dot matrix wave', 0, 0);
    grid(S2, 'lit', d * 0.34, axm_col(sc, p), 30); grid(S2, 'large', d * 0.52, dim, 95); reveal(S2);
    // matte: bands across the wave vector (0.33·dir, 0.52) per cell; crest where the browser's sine is 1
    var kk = axm_hyp(0.33, 0.52) / d, lam = AXM_TAU / kk, diag = axm_hyp(W, H), n = 2 * Math.ceil(diag / lam) + 3;
    var ph0 = (cols - 1) / 2 * 0.33 * dir + (rows - 1) / 2 * 0.52;
    var Mt = jzShapeLayer(ctx, 'dot matrix bands', W / 2, cy), gm = jzGrp(Mt, 'bands');
    jzAddRect(gm, lam * 0.3, diag * 2.4); axm_rep(gm, n, lam, 0, 0, -Math.floor(n / 2)); jzAddFill(gm, '#FFFFFF');
    axm_gx(gm, 'ADBE Vector Position', HD + axm_f('[md(($0+$1*t)/$2,$3),0]', [Math.PI / 2 - ph0, 2.6 * sp, kk, lam]));
    jzXf(Mt, 'ADBE Rotate Z').setValue(Math.atan2(0.52, 0.33 * dir) / AXM_D);
    var bl = jzEffect(Mt, 'ADBE Gaussian Blur 2', 'JZ Band Soft'); jzEP(bl, 1, d * 1.1); jzEP(bl, 3, 0);
    S2.trackMatteType = TrackMatteType.ALPHA; Mt.enabled = false;
});

/* ---- xmContour — 等高線: nested wobbly closed curves like a contour map draw themselves behind the lyric.
   The curves are the browser's at t = 0, drawn on with Trim Paths; its very slow drift of the wobble is left out */
axm_reg('xmContour', true, function (ctx, bb, p, u, ST) {
    var W = ctx.W, H = ctx.H, sc = ctx.sc, s = p.seed, m = jzU(ctx), c = axm_ln(sc), ax = W > H ? 1.4 : 1, ay = H > W ? 1.4 : 1, M = 60, hI, k, i;
    var HD = axm_H(ctx, 0), S = jzShapeLayer(ctx, 'contour lines', 0, 0);
    for (hI = (p.n >= 2 ? 1 : 0); hI >= 0; hI--) {
        var cx = W * (hI ? axm_rr(0.12, 0.88, s, hI, 1) : axm_rr(0.38, 0.62, s, 0, 1)), cy = H * (hI ? axm_rr(0.15, 0.85, s, hI, 2) : axm_rr(0.4, 0.6, s, 0, 2));
        var Rm = m * (hI ? 0.24 : 0.5), Kn = hI ? 4 : (p.big ? 7 : 6), f1 = axm_r(s, hI, 3) * AXM_TAU, f2 = axm_r(s, hI, 4) * AXM_TAU, f3 = axm_r(s, hI, 5) * AXM_TAU;
        for (k = Kn - 1; k >= 0; k--) {
            var rad = Rm * (k + 0.6) / Kn, wk = 0.5 + 0.5 * k / Kn, pts = [];
            for (i = 0; i <= M; i++) {
                var th = i / M * AXM_TAU + f1, wob = 0.17 * Math.sin(2 * th + f1 + k * 0.25) + 0.1 * Math.sin(3 * th + f2 - k * 0.2) + 0.05 * Math.sin(5 * th + f3 + k * 0.3);
                pts.push([cx + Math.cos(th) * rad * (1 + wob * wk) * ax, cy + Math.sin(th) * rad * (1 + wob * wk) * ay]);
            }
            var g = jzGrp(S, (hI ? 'hill ' : 'contour ') + (k + 1));
            jzAddPath(g, pts, false); axm_trim(g, HD + 'ioc((t-' + jzN((Kn - 1 - k) * 0.06 + hI * 0.2) + ')/0.8)*100');
            axm_st(g, c, (k % 3 === 0 ? 3.4 : 2) * u, 90, 2, 2);
        }
    }
    axm_op(ctx, S, 0);
});

/* ---- xmMoire — モアレ: two sets of fine concentric rings slide over each other; the interference bands swing round */
axm_reg('xmMoire', true, function (ctx, bb, p, u, ST) {
    var W = ctx.W, H = ctx.H, sc = ctx.sc, m = jzU(ctx), c = axm_ln(sc), Kn = 12 + p.n * 2, spc = m * 0.03, q, k;
    var cx = p.corner ? W * (p.right ? 0.78 : 0.22) : W * 0.5, cy = p.corner ? H * (p.low ? 0.72 : 0.28) : H * 0.5;
    var HD = axm_H(ctx, 0), S = jzShapeLayer(ctx, 'moire rings', cx, cy);
    for (q = 0; q < 2; q++) {
        var g = jzGrp(S, 'rings ' + (q + 1));
        for (k = 0; k < Kn; k++) {
            var gr = axm_sub(g, 'ring ' + (k + 1));
            jzAddEllipse(gr, spc * (k + 1) * 2, spc * (k + 1) * 2); axm_st(gr, c, 2.4 * u, 80 * (1 - 0.5 * k / Kn));
        }
        axm_gx(g, 'ADBE Vector Position', HD + axm_f('var an=t*$0+$1,d=$2*oc(t/0.8);[Math.cos(an)*d,Math.sin(an)*d]',
            [0.4 * axm_sp(ctx) * (p.right ? 1 : -1), p.r * AXM_TAU, spc * 1.5 * (q ? 1 : -1)]));
        axm_gx(g, 'ADBE Vector Scale', HD + 'var s=(0.6+0.4*oc(t/0.7))*100;[s,s]');
    }
    axm_op(ctx, S, 0, 'oc(t/0.6)');
});

/* ---- xmTruchet — 円弧タイル: a patch of quarter-arc tiles grows from a corner; tiles keep turning a quarter so the paths re-route */
axm_reg('xmTruchet', true, function (ctx, bb, p, u, ST) {
    var W = ctx.W, H = ctx.H, sc = ctx.sc, s = p.seed, m = jzU(ctx), c = m * 0.092 * (p.big ? 1.2 : 1), col = axm_ln(sc), i, j;
    var ox = p.right ? W : 0, oy = p.low ? H : 0, sx = p.right ? -1 : 1, sy = p.low ? -1 : 1, reach = m * (0.5 + 0.05 * p.n), nn = Math.ceil(reach / c), T = 2.8 / axm_sp(ctx);
    var HD = axm_H(ctx, 0), S = jzShapeLayer(ctx, 'truchet tiles', 0, 0);
    var a1 = axm_arc(-c / 2, -c / 2, c / 2, 0, Math.PI / 2, 10), a2 = axm_arc(c / 2, c / 2, c / 2, Math.PI, Math.PI * 1.5, 10);
    for (j = 0; j < nn; j++) for (i = 0; i < nn; i++) {
        var gx = (i + 0.5) * c, gy = (j + 0.5) * c, dd = axm_hyp(gx, gy) / reach, fall = jzClamp((1 - dd) * 1.7, 0, 1);
        if (fall <= 0) continue;
        var g = jzGrp(S, 'tile ' + (i + 1) + '-' + (j + 1));
        jzAddPath(g, a1, false); jzAddPath(g, a2, false); axm_st(g, col, 3.6 * u, fall * 90, 1);
        jzGX(g).property('ADBE Vector Position').setValue([ox + sx * gx, oy + sy * gy]);
        axm_gx(g, 'ADBE Vector Rotation', HD + axm_f('var ph=(t+$0)/$1,fl=Math.floor(ph);($2+fl-1+ioc((ph-fl)*$1/0.4))*90', [axm_r(s, i, j, 2) * T, T, axm_h(s, i, j, 3) & 1]));
        axm_gx(g, 'ADBE Vector Scale', HD + 'var e=obk((t-' + jzN(dd * 0.55 + axm_r(s, i, j, 1) * 0.2) + ')/0.4)*100;[e,e]');
    }
    axm_op(ctx, S, 0);
});

/* ---- xmSpiro — スピログラフ: a faint spirograph curve is traced by a moving pen behind the lyric, then turns slowly.
   The pen dot reads a table of points at equal arc length so it stays on the end of the trimmed line */
axm_reg('xmSpiro', true, function (ctx, bb, p, u, ST) {
    var W = ctx.W, H = ctx.H, sc = ctx.sc, m = jzU(ctx), set = [[5, 3, 2.2], [7, 3, 2.4], [8, 5, 3.6], [7, 2, 1.6], [9, 4, 3], [10, 3, 2.4]][((p.v % 6) + 6) % 6], a = set[0], b = set[1], d = set[2], i;
    var cx = p.corner ? W * (p.right ? 0.78 : 0.22) : W * 0.5, cy = p.corner ? H * (p.low ? 0.72 : 0.28) : H * 0.5;
    var Sc = m * (p.corner ? 0.25 : 0.4) * (p.big ? 1.1 : 1) / (a - b + d), n = 64 * b, pts = [], cum = [0];
    for (i = 0; i <= n; i++) {
        var th = i / n * AXM_TAU * b;
        pts.push([((a - b) * Math.cos(th) + d * Math.cos((a - b) / b * th)) * Sc, ((a - b) * Math.sin(th) - d * Math.sin((a - b) / b * th)) * Sc]);
        if (i) cum.push(cum[i - 1] + axm_hyp(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    }
    var NT = 96, tab = [], j = 0, k;
    for (k = 0; k <= NT; k++) {
        var L = cum[n] * k / NT;
        while (j < n - 1 && cum[j + 1] < L) j++;
        var f = (L - cum[j]) / Math.max(1e-6, cum[j + 1] - cum[j]);
        tab.push('[' + jzN(jzLerp(pts[j][0], pts[j + 1][0], f)) + ',' + jzN(jzLerp(pts[j][1], pts[j + 1][1], f)) + ']');
    }
    var HD = axm_H(ctx, 0), S = jzShapeLayer(ctx, 'spirograph', cx, cy), g = jzGrp(S, 'curve'), gs;
    gs = axm_sub(g, 'pen'); jzAddEllipse(gs, 14 * u, 14 * u); jzAddFill(gs, axm_subc(sc), 70);
    axm_gx(gs, 'ADBE Vector Position', HD + 'var P=[' + tab.join(',') + '],q=ioc(t/1.9)*' + NT + ',i=Math.min(' + (NT - 1) + ',Math.floor(q)),f=q-i;[P[i][0]+(P[i+1][0]-P[i][0])*f,P[i][1]+(P[i+1][1]-P[i][1])*f]');
    axm_gx(gs, 'ADBE Vector Group Opacity', HD + 't<1.9?100:0');
    gs = axm_sub(g, 'line'); jzAddPath(gs, pts, false); axm_trim(gs, HD + 'ioc(t/1.9)*100'); axm_st(gs, axm_ln(sc), 2.6 * u, 95, 2, 2);
    axm_gx(g, 'ADBE Vector Rotation', HD + jzN(p.r * 360) + '+t*' + jzN(4 * axm_sp(ctx) * (p.right ? 1 : -1)));
    axm_op(ctx, S, 0);
});

/* ---- xmIris — 絞り羽根: a camera iris of straight blades behind the lyric opens on entry, breathes with the beat, closes on exit.
   One blade edge × Repeater; the edge slides out along its own direction as the iris opens and a round mask ends it at the rim */
axm_reg('xmIris', true, function (ctx, bb, p, u, ST) {
    var W = ctx.W, H = ctx.H, sc = ctx.sc, m = jzU(ctx), c = axm_ln(sc), N = 5 + p.n, al = AXM_TAU / N;
    var cx = p.corner ? W * (p.right ? 0.78 : 0.22) : W * 0.5, cy = p.corner ? H * (p.low ? 0.7 : 0.3) : H * 0.5, Rd = m * (p.corner ? 0.27 : 0.42) * (p.big ? 1.08 : 1);
    var HD = axm_H(ctx, 0) + axm_f('var e=oc(t/0.6),pu=Math.exp(-md(t,0.5)*5)*0.4,r=$0*Math.max(0.02,Math.min(0.9,e*(0.4+0.08*Math.sin(t*0.8)+0.1*pu)*(0.15+0.85*K)));', [Rd]);
    var dx = 1 - Math.cos(al), dy = -Math.sin(al), dl = axm_hyp(dx, dy);
    var S = jzShapeLayer(ctx, 'iris blades', cx, cy), g = jzGrp(S, 'blades'), gb = axm_sub(g, 'edge');
    jzAddPath(gb, [[0, 0], [dx / dl * Rd * 2.2, dy / dl * Rd * 2.2]], false); axm_st(gb, c, 3 * u, 90, 1);
    axm_gx(gb, 'ADBE Vector Position', HD + '[r*' + jzN(Math.cos(al)) + ',r*' + jzN(Math.sin(al)) + ']');
    axm_rep(g, N, 0, 0, 360 / N);
    axm_gx(g, 'ADBE Vector Rotation', HD + '(t*' + jzN(8 * axm_sp(ctx)) + '+(1-e)*70)*' + (p.right ? 1 : -1));
    axm_mask(S, jzCircleShape(0, 0, Rd));
    axm_op(ctx, S, 0, 'oc(t/0.6)');
    var S2 = jzShapeLayer(ctx, 'iris rim', cx, cy), g2 = jzGrp(S2, 'rim outer');
    jzAddEllipse(g2, Rd * 2.1, Rd * 2.1); axm_st(g2, c, 1.8 * u, 70);
    g2 = jzGrp(S2, 'rim'); jzAddEllipse(g2, Rd * 2, Rd * 2); axm_st(g2, c, 4 * u, 90);
    axm_op(ctx, S2, 0, 'oc(t/0.6)');
});

/* ---- xmWhirl — 渦巻く四角: squares nested corner-to-edge form a whirl whose twist slowly tightens and relaxes.
   One square × Repeater whose rotation / scale step follow the twist (the stroke sits after the Repeater: even weight) */
axm_reg('xmWhirl', true, function (ctx, bb, p, u, ST) {
    var W = ctx.W, H = ctx.H, sc = ctx.sc, m = jzU(ctx), c = axm_ln(sc), Kn = 11 + p.n * 2;
    var cx = p.corner ? W * (p.right ? 0.8 : 0.2) : W * 0.5, cy = p.corner ? H * (p.low ? 0.72 : 0.28) : H * 0.5, side = 2 * m * (p.corner ? 0.22 : 0.37) * (p.big ? 1.1 : 1);
    var HD = axm_H(ctx, 0) + axm_f('var dl=8+5*Math.sin(t*$0+$1);', [0.5 * axm_sp(ctx), p.r * AXM_TAU]);
    var S = jzShapeLayer(ctx, 'whirl squares', cx, cy), g = jzGrp(S, 'whirl');
    jzAddRect(g, side, side);
    var rp = jzVecs(g).addProperty('ADBE Vector Filter - Repeater');
    jzSetExpr(rp.property('ADBE Vector Repeater Copies'), HD + 'Math.min(' + Kn + ',Math.floor(Math.max(0,t)/0.035)+1)');
    var rt = rp.property('ADBE Vector Repeater Transform');
    rt.property('ADBE Vector Repeater Position').setValue([0, 0]);
    jzSetExpr(rt.property('ADBE Vector Repeater Rotation'), HD + 'dl*' + (p.right ? 1 : -1));
    jzSetExpr(rt.property('ADBE Vector Repeater Scale'), HD + 'var a=dl*0.0174533,s=100/(Math.cos(a)+Math.sin(a));[s,s]');
    axm_st(g, c, 2.3 * u, 90, 1, 2);
    axm_gx(g, 'ADBE Vector Rotation', HD + 't*3');
    axm_op(ctx, S, 0, 'oc(t/0.45)');
});

/* ---- xmWaves — 重なる波: three flat layers of filled waves rise from the bottom (or hang from the top) edge and roll.
   Each wave is one long static outline that slides sideways at its own speed (its slow second harmonic rides along with it) */
axm_reg('xmWaves', true, function (ctx, bb, p, u, ST) {
    var W = ctx.W, H = ctx.H, sc = ctx.sc, c = axm_dim(sc), sy = p.low ? 1 : -1, edge = p.low ? H + 4 : -4, sp = axm_sp(ctx), k, i;
    var HD = axm_H(ctx, 0), S = jzShapeLayer(ctx, 'layered waves', 0, 0), dur = Math.max(0.5, ctx.cut.dur || 2) + 0.5, stp = W / 48;
    for (k = 2; k >= 0; k--) {
        var yb = H * (p.low ? 0.8 + 0.055 * k : 0.2 - 0.055 * k), wl = W / (1.25 + 0.55 * k + 0.2 * p.n), amp = H * 0.02 * (1 + 0.25 * k);
        var rate = (0.9 + 0.5 * k) * sp * (k % 2 ? -1 : 1) * (p.right ? 1 : -1), ph0 = k * 1.7 + p.r * 6, vx = rate * wl / AXM_TAU, tr = vx * dur;
        var xA = Math.min(0, tr) - stp, xB = W + Math.max(0, tr) + stp, n = Math.ceil((xB - xA) / stp), pts = [[xA, edge]];
        for (i = 0; i <= n; i++) { var x = xA + (xB - xA) * i / n; pts.push([x, yb + Math.sin(x / wl * AXM_TAU + ph0) * amp + Math.sin(x / wl * AXM_TAU * 0.47 - ph0 * 0.6) * amp * 0.5]); }
        pts.push([xB, edge]);
        var g = jzGrp(S, 'wave ' + (k + 1));
        jzAddPath(g, pts, true); jzAddFill(g, c, 50);
        axm_gx(g, 'ADBE Vector Position', HD + axm_f('[-t*$0,$1*(1-oc((t-$2)/0.6)*K)]', [vx, sy * H * 0.26, k * 0.08]));
    }
});
