// ================================================================ 追加分2 backgrounds part 1 (AE port of src/11p_x2_bg.js, pack x2bg: xpDriftBars … xpWindStreaks)
// bg.build(b, P): b.comp is the cut's WRAPPER comp (full frame, time 0 = cut start, duration = cut + 1 s). Layers added here sit
// above the scheme colour / paper and below the lyric. Quiet full-screen fields: one or two shape layers each, repeaters where a
// pattern repeats, everything animated with expressions on `time`.
// Tones: the browser paints the scheme colour with a small alpha (fg at 4 % …), so fills / strokes here keep the real colour and
// carry that alpha as their opacity (overlaps add up the same way). Inside a layer the FIRST group is drawn on top, so groups are
// added in reverse browser order. Every shape / group is finished (expressions included) before its next sibling is added.

// ================================================================ shared helpers of this pack (prefix axp_; also used by p_x2_bg2.jsx)
var AXP_TAU = Math.PI * 2;
// the browser's deterministic hash J.h / J.r / J.rs and smooth 1D noise J.noise1 (so baked shapes match the web frame)
function axp_h(a, b, c, d, e) {
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
function axp_r(a, b, c, d, e) { return axp_h(a, b, c, d, e) / 4294967296; }
function axp_rs(a, b, c, d, e) { return axp_r(a, b, c, d, e) * 2 - 1; }
function axp_n1(x, s) { var i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f), a = axp_rs(s, i); return a + (axp_rs(s, i + 1) - a) * u; }
function axp_wrap(v, m) { return ((v % m) + m) % m; }
// seconds this background had already been running at the cut start (browser bgT: consecutive cuts with the same bg + seed are one run)
function axp_run(b) {
    var c = b.cut, cs = (b.plan && b.plan.cuts) || [], s = c.start || 0, P0 = c.bgP || {}, idx = -1, i;
    for (i = 0; i < cs.length; i++) if (cs[i] === c) { idx = i; break; }
    for (i = idx - 1; i >= 0; i--) {
        var p = cs[i];
        if (p.bg === c.bg && (p.bgP || {}).seed === P0.seed && Math.abs(p.end - s) < 0.06) s = p.start; else break;
    }
    return (c.start || 0) - s;
}
// expression helpers: cl clamp, oc outCubic, ioc inOutCubic, sm smoothstep, wr wrap, hs(i, s) hash -1..1, n1(x, s) smooth noise -1..1 (stand-in for J.noise1)
var AXP_FNS = 'function cl(x){return Math.max(0,Math.min(1,x));}function oc(x){x=cl(x);return 1-Math.pow(1-x,3);}' +
    'function ioc(x){x=cl(x);return x<0.5?4*x*x*x:1-Math.pow(2-2*x,3)/2;}function sm(a,b,x){var t=cl((x-a)/(b-a));return t*t*(3-2*t);}' +
    'function wr(v,m){return ((v%m)+m)%m;}' +
    'function hs(i,s){var x=Math.sin(i*127.1+s*311.7)*43758.5453;return 2*(x-Math.floor(x))-1;}function n1(x,s){var i=Math.floor(x),f=x-i,u=f*f*(3-2*f),a=hs(i,s);return a+(hs(i+1,s)-a)*u;}';
// header: T = absolute song time (browser env.t), BT = time since this background started (browser bgT)
function axp_hd(b) { return AXP_FNS + 'var T=time+' + jzN(b.cut.start || 0) + ',BT=time+' + jzN(axp_run(b)) + ';\n'; }
function axp_px(b) { return jzU(b) / 1080; }                                   // one browser design px in comp px
function axp_lw(b, k) { return Math.max(1.5 * axp_px(b), jzU(b) * k); }        // the browser's LW(env, k)
function axp_seed(rng) { return rng.int(1, 1000000000); }
function axp_light(sc) { var L = jzLum(sc.bg); return L < 0.45 ? sc.fg : (L < 0.78 ? '#FFFFFF' : jzMixHex(sc.accent, '#FFFFFF', 0.25)); }
// fill / stroke in a colour at alpha a (0..1)
function axp_fill(g, hex, a) { return jzAddFill(g, hex, jzClamp(a, 0, 1) * 100); }
function axp_stroke(g, hex, w, a) { return jzAddStroke(g, hex, w, jzClamp(a, 0, 1) * 100); }
function axp_round(st) { try { st.property('ADBE Vector Stroke Line Join').setValue(2); st.property('ADBE Vector Stroke Line Cap').setValue(2); } catch (e) {} return st; }
// layer opacity = the browser's fadeIn(env, d)
function axp_fade(b, L, d) { jzSetExpr(jzXf(L, 'ADBE Opacity'), axp_hd(b) + '100*oc(BT/' + jzN(d || 0.6) + ')'); }
function axp_sub(g, name) { var c = jzVecs(g).addProperty('ADBE Vector Group'); if (name) c.name = name; return c; }   // group inside a group
// shape Repeater at the end of group g: n copies stepping [dx, dy]; o: { off: offset, rot: degrees per copy, sc: [sx, sy] per copy }
function axp_rep(g, n, dx, dy, o) {
    o = o || {};
    var V = jzVecs(g), ix = V.addProperty('ADBE Vector Filter - Repeater').propertyIndex, R = V.property(ix);
    R.property('ADBE Vector Repeater Copies').setValue(Math.max(1, Math.round(n)));
    if (o.off) R.property('ADBE Vector Repeater Offset').setValue(o.off);
    var X = R.property('ADBE Vector Repeater Transform');
    X.property('ADBE Vector Repeater Position').setValue([dx || 0, dy || 0]);
    if (o.rot) X.property('ADBE Vector Repeater Rotation').setValue(o.rot);
    if (o.sc) X.property('ADBE Vector Repeater Scale').setValue(o.sc);
    return R;
}
// dashed stroke: dash d, gap gp, optional expression on the dash offset
// (AE starts with an empty Dashes group; each entry is added AND set before the next one is added)
function axp_dashP(D, mn, v, ex) {
    var p = null;
    try { p = D.addProperty(mn); } catch (e) { p = null; }
    if (!p) { try { p = D.property(mn); } catch (e2) { p = null; } }
    if (!p) return;
    if (v != null) p.setValue(v);
    if (ex) jzSetExpr(p, ex);
}
function axp_dash(st, d, gp, offEx) {
    var D = st.property('ADBE Vector Stroke Dashes');
    axp_dashP(D, 'ADBE Vector Stroke Dash 1', d);
    axp_dashP(D, 'ADBE Vector Stroke Gap 1', gp);
    if (offEx) axp_dashP(D, 'ADBE Vector Stroke Offset', null, offEx);
}
function axp_solid(b, hex, name, w, h) { return b.comp.layers.addSolid(jzHex(hex), name, Math.max(4, Math.round(w)), Math.max(4, Math.round(h)), 1, b.comp.duration); }
// polygon mask in layer space; o: { f: [fx, fy] feather, mode: MaskMode.*, inv: true }
function axp_mask(L, pts, o) {
    o = o || {};
    var m = L.property('ADBE Mask Parade').addProperty('ADBE Mask Atom'), sh = new Shape();
    sh.vertices = pts; sh.closed = true;
    m.property('ADBE Mask Shape').setValue(sh);
    if (o.f) m.property('ADBE Mask Feather').setValue(o.f);
    if (o.mode) m.maskMode = o.mode;
    if (o.inv) m.inverted = true;
    return m;
}
function axp_rmask(L, x0, y0, x1, y1, o) { return axp_mask(L, [[x1, y0], [x1, y1], [x0, y1], [x0, y0]], o); }
function axp_cmask(L, cx, cy, r, o) {
    o = o || {};
    var m = L.property('ADBE Mask Parade').addProperty('ADBE Mask Atom');
    m.property('ADBE Mask Shape').setValue(jzCircleShape(cx, cy, r));
    if (o.f) m.property('ADBE Mask Feather').setValue(o.f);
    if (o.inv) m.inverted = true;
    return m;
}
// regular polygon path (the browser's polyPath): n corners on radius R, first corner at angle rot (radians)
function axp_poly(g, R, n, rot, cx, cy) {
    var p = [], i;
    for (i = 0; i < n; i++) { var a = (rot || 0) + i / n * AXP_TAU; p.push([(cx || 0) + Math.cos(a) * R, (cy || 0) + Math.sin(a) * R]); }
    return jzAddPath(g, p, true);
}
// open path through pts with Catmull-Rom tangents (a smooth curve)
function axp_curve(g, pts) {
    var p = jzVecs(g).addProperty('ADBE Vector Shape - Group'), sh = new Shape(), n = pts.length, ins = [], outs = [], i;
    sh.vertices = pts; sh.closed = false;
    for (i = 0; i < n; i++) {
        var a = pts[i > 0 ? i - 1 : 0], c = pts[i < n - 1 ? i + 1 : n - 1];
        ins.push([-(c[0] - a[0]) / 6, -(c[1] - a[1]) / 6]); outs.push([(c[0] - a[0]) / 6, (c[1] - a[1]) / 6]);
    }
    sh.inTangents = ins; sh.outTangents = outs;
    p.property('ADBE Vector Shape').setValue(sh);
    return p;
}
// tail of a path expression: Q = [[x, y, r], …] -> ONE closed path holding a circle per entry. The circles are strung together
// (upper halves on the way out, lower halves on the way back along the same straight bridges), so the bridges enclose no area
// and only the discs are filled. Lets a whole row of individually moving / pulsing dots live on a single expression.
var AXP_BEAD = 'var k,z=[0,0],V=[],I=[],O=[],i,x,y,r;' +
    'for(i=0;i<Q.length;i++){x=Q[i][0];y=Q[i][1];r=Q[i][2];k=0.5523*r;V.push([x-r,y],[x,y-r],[x+r,y]);I.push(z,[-k,0],[0,-k]);O.push([0,-k],[k,0],z);}' +
    'for(i=Q.length-1;i>=0;i--){x=Q[i][0];y=Q[i][1];r=Q[i][2];k=0.5523*r;V.push([x+r,y],[x,y+r],[x-r,y]);I.push(z,[k,0],[0,k]);O.push([0,k],[-k,0],z);}' +
    'createPath(V,I,O,true)';

/* ================================================================ GEOMETRIC FIELDS */

/* ---- xpDriftBars — 漂う帯: 5–7 wide bars (one in the accent) drifting slowly across at their own speeds, wrapping round */
jzReg('bg', 'xpDriftBars', {
    plan: function (rng, st) { return { seed: axp_seed(rng), n: rng.int(5, 7), vert: rng.chance(0.7), k: rng.range(0.045, 0.06) }; },
    build: function (b, P) {
        var W = b.W, H = b.H, sc = b.sc, s = P.seed || 1, vert = P.vert !== false, L = vert ? W : H, n = P.n || 6, k = P.k || 0.04, i;
        var S = jzShapeLayer(b, 'bg xpDriftBars', 0, 0), hd = axp_hd(b);
        for (i = n - 1; i >= 0; i--) {
            var w = L * (0.07 + 0.2 * axp_r(s, i, 1)), v = (0.012 + 0.028 * axp_r(s, i, 2)) * (axp_r(s, i, 3) < 0.5 ? -1 : 1);
            var g = jzGrp(S, 'bar ' + (i + 1));
            if (vert) jzAddRect(g, w, H, 0, w / 2, H / 2); else jzAddRect(g, W, w, 0, W / 2, w / 2);
            axp_fill(g, i === 1 ? sc.accent : sc.fg, i === 1 ? k * 1.1 : k * (0.6 + 0.8 * axp_r(s, i, 5)));
            var ex = 'wr(' + jzN(axp_r(s, i, 4) * (L + w)) + '+T*' + jzN(v * L) + ',' + jzN(L + w) + ')-' + jzN(w);
            jzSetExpr(jzGX(g).property('ADBE Vector Position'), hd + (vert ? '[' + ex + ',0]' : '[0,' + ex + ']'));
        }
        axp_fade(b, S, 0.6);
    }
});

/* ---- xpBigPolygon — 回る多角形: a huge polygon turning slowly, a smaller one turning the other way inside, an outline one outside */
jzReg('bg', 'xpBigPolygon', {
    plan: function (rng, st) { return { seed: axp_seed(rng), sides: rng.pick([3, 5, 6, 8]), cx: rng.pick([0.26, 0.74, 0.5]), cy: rng.pick([0.42, 0.58]), spd: rng.range(1.5, 3.2) * rng.pick([1, -1]), k: rng.range(0.04, 0.055) }; },
    build: function (b, P) {
        var W = b.W, H = b.H, sc = b.sc, U = jzU(b), n = P.sides || 5, k = P.k || 0.045, R = U * 0.8;
        var hd = axp_hd(b) + 'var e=oc(BT/0.8),rot=T*' + jzN(P.spd || 2) + '+' + jzN((P.seed || 1) % 60) + ';';
        var S = jzShapeLayer(b, 'bg xpBigPolygon', W * (P.cx || 0.5), H * (P.cy || 0.5));
        var g = jzGrp(S, 'outline'); axp_poly(g, R * 1.24, n, 0); axp_stroke(g, sc.fg, axp_lw(b, 0.003), k * 2.2);
        jzSetExpr(jzGX(g).property('ADBE Vector Rotation'), hd + 'rot*0.6');
        g = jzGrp(S, 'inner'); axp_poly(g, R * 0.58, n, 0); axp_fill(g, sc.fg, k * 0.8);
        jzSetExpr(jzGX(g).property('ADBE Vector Rotation'), hd + '-rot*1.4');
        g = jzGrp(S, 'outer'); axp_poly(g, R, n, 0); axp_fill(g, sc.fg, k);
        jzSetExpr(jzGX(g).property('ADBE Vector Rotation'), hd + 'rot');
        jzSetExpr(jzXf(S, 'ADBE Scale'), hd + 'var q=86+14*e;[q,q]');
        jzSetExpr(jzXf(S, 'ADBE Opacity'), hd + '100*e');
    }
});

/* ---- xpShiftRows — ずれる段: rows of blocks (block, gap, block …), every row sliding sideways at its own speed, alternate rows the other way */
jzReg('bg', 'xpShiftRows', {
    plan: function (rng, st) { return { seed: axp_seed(rng), ar: rng.range(2.2, 3.4), spd: rng.range(0.05, 0.1), k: rng.range(0.035, 0.05) }; },
    build: function (b, P) {
        var W = b.W, H = b.H, sc = b.sc, s = P.seed || 1, U = jzU(b), rh = U * 0.105, bw = rh * (P.ar || 2.6), rows = Math.min(24, Math.ceil(H / rh)), j;
        var nc = Math.min(14, Math.ceil((W + bw * 2) / (bw * 2))), S = jzShapeLayer(b, 'bg xpShiftRows', 0, 0), hd = axp_hd(b);
        for (j = 0; j < rows; j++) {
            var g = jzGrp(S, 'row ' + (j + 1));
            jzAddRect(g, bw, rh, 0, bw / 2, rh / 2); axp_fill(g, sc.fg, P.k || 0.04); axp_rep(g, nc, bw * 2, 0);
            jzSetExpr(jzGX(g).property('ADBE Vector Position'), hd + '[wr(T*' + jzN(bw * (P.spd || 0.07) * (j % 2 ? -1 : 1) * (0.5 + axp_r(s, j))) + '+' + jzN(axp_r(s, j, 2) * bw * 2) + ',' + jzN(bw * 2) + ')-' + jzN(bw * 2) + ',' + jzN(j * rh) + ']');
        }
        axp_fade(b, S, 0.6);
    }
});

/* ---- xpNestTri — ねじれ三角: eight nested outline triangles (or pentagons), each breathing and twisting a little later than the one inside it */
jzReg('bg', 'xpNestTri', {
    plan: function (rng, st) { return { seed: axp_seed(rng), sides: rng.pick([3, 3, 5]), cy: rng.pick([0.5, 0.56]), k: rng.range(0.085, 0.11) }; },
    build: function (b, P) {
        var W = b.W, H = b.H, sc = b.sc, U = jzU(b), n = P.sides || 3, i;
        var hd = axp_hd(b) + 'var e=oc(BT/0.8);';
        var S = jzShapeLayer(b, 'bg xpNestTri', W / 2, H * (P.cy || 0.5)), G = jzGrp(S, 'polygons');
        for (i = 0; i < 8; i++) {
            var q = axp_sub(G, 'polygon ' + (i + 1));
            axp_poly(q, U * (0.14 + i * 0.17), n, -Math.PI / 2);
            jzSetExpr(jzGX(q).property('ADBE Vector Scale'), hd + 'var q=100*(1+0.05*Math.sin(T*0.5-' + jzN(i * 0.6) + '))*(0.7+0.3*e);[q,q]');
            jzSetExpr(jzGX(q).property('ADBE Vector Rotation'), hd + '28*Math.sin(T*0.22-' + jzN(i * 0.38) + ')');
        }
        axp_round(axp_stroke(G, sc.fg, axp_lw(b, 0.005), P.k || 0.1));      // one stroke outside the scaled groups: the line width stays constant
        jzSetExpr(jzXf(S, 'ADBE Opacity'), hd + '100*e');
    }
});

/* ---- xpCornerArcs — 角の扇: thick concentric arcs fanning out of two opposite corners, breathing in a slow wave (one arc in the accent) */
jzReg('bg', 'xpCornerArcs', {
    plan: function (rng, st) { return { seed: axp_seed(rng), diag: rng.chance(0.5), k: rng.range(0.045, 0.06) }; },
    build: function (b, P) {
        var W = b.W, H = b.H, sc = b.sc, U = jzU(b), k = P.k || 0.05, c, i;
        var cs = P.diag ? [[0, 0], [W, H]] : [[W, 0], [0, H]], hd = axp_hd(b) + 'var e=oc(BT/0.8);';
        var S = jzShapeLayer(b, 'bg xpCornerArcs', 0, 0);
        for (c = 1; c >= 0; c--) for (i = 4; i >= 0; i--) {
            var g = jzGrp(S, 'arc ' + (c + 1) + '-' + (i + 1)), el = jzAddEllipse(g, 10, 10, cs[c][0], cs[c][1]);
            jzSetExpr(el.property('ADBE Vector Ellipse Size'), hd + 'var r=' + jzN(U * (0.2 + 0.19 * i)) + '*(1+0.07*Math.sin(T*0.5-' + jzN(i * 0.7) + '+' + jzN(c * 2.2) + '))*(0.6+0.4*e);[2*r,2*r]');
            axp_stroke(g, c && i === 1 ? sc.accent : sc.fg, U * 0.085 * (1 - i * 0.1), k * (1 - i * 0.14));
        }
        jzSetExpr(jzXf(S, 'ADBE Opacity'), hd + '100*e');
    }
});

/* ---- xpPanels — 動く仕切り: the frame divided into three tinted panels by thin rules; the dividers slide slowly */
jzReg('bg', 'xpPanels', {
    plan: function (rng, st) { return { seed: axp_seed(rng), flip: rng.chance(0.5), flipY: rng.chance(0.5), k: rng.range(0.03, 0.042) }; },
    build: function (b, P) {
        var W = b.W, H = b.H, sc = b.sc, s = (P.seed || 1) % 9, k = P.k || 0.035, lw = axp_lw(b, 0.003), g, r;
        var S = jzShapeLayer(b, 'bg xpPanels', W / 2, H / 2);
        jzXf(S, 'ADBE Anchor Point').setValue([W / 2, H / 2]);
        if (P.flip || P.flipY) jzXf(S, 'ADBE Scale').setValue([P.flip ? -100 : 100, P.flipY ? -100 : 100]);
        var hd = axp_hd(b) + 'var W=' + jzN(W) + ',H=' + jzN(H) + ',x1=W*(0.36+0.07*Math.sin(T*0.21+' + s + ')),y1=H*(0.42+0.09*Math.sin(T*0.17+' + (s * 2) + ')),x2=x1+(W-x1)*(0.5+0.18*Math.sin(T*0.13+' + (s * 3) + '));';
        g = jzGrp(S, 'rules');
        r = jzAddRect(g, lw, H); jzSetExpr(r.property('ADBE Vector Rect Position'), hd + '[x1,H/2]');
        r = jzAddRect(g, W * 2, lw); jzSetExpr(r.property('ADBE Vector Rect Position'), hd + '[x1+W,y1]');
        r = jzAddRect(g, lw, H * 2); jzSetExpr(r.property('ADBE Vector Rect Position'), hd + '[x2,y1+H]');
        axp_fill(g, sc.fg, 0.13);
        g = jzGrp(S, 'panel right');
        r = jzAddRect(g, W * 2, H * 2); jzSetExpr(r.property('ADBE Vector Rect Position'), hd + '[x2+W,y1+H]');
        axp_fill(g, sc.fg, k * 2);
        g = jzGrp(S, 'panel middle');
        r = jzAddRect(g, 10, H * 2);
        jzSetExpr(r.property('ADBE Vector Rect Size'), hd + '[Math.max(0,x2-x1),H*2]');
        jzSetExpr(r.property('ADBE Vector Rect Position'), hd + '[(x1+x2)/2,y1+H]');
        axp_fill(g, sc.accent, k * 1.3);
        g = jzGrp(S, 'panel top');
        r = jzAddRect(g, W * 2, H * 2); jzSetExpr(r.property('ADBE Vector Rect Position'), hd + '[x1+W,y1-H]');
        axp_fill(g, sc.fg, k);
        axp_fade(b, S, 0.6);
    }
});

/* ---- xpPlusField — 回る十字: a lattice of small crosses, each turning a quarter turn back and forth; the turn runs across the field as a wave.
   AE: crosses on the same diagonal share one rotating cross (Repeater along the diagonal), so the wave front runs at 45°
   (browser: about 35°) — one expression per diagonal instead of one per cross */
jzReg('bg', 'xpPlusField', {
    plan: function (rng, st) { return { seed: axp_seed(rng), sp: rng.range(0.11, 0.14), k: rng.range(0.1, 0.13) }; },
    build: function (b, P) {
        var W = b.W, H = b.H, sc = b.sc, U = jzU(b), sp = U * (P.sp || 0.12), arm = sp * 0.17, d;
        var nx = Math.min(30, Math.ceil(W / sp) + 1), ny = Math.min(30, Math.ceil(H / sp) + 1), ox = (W - (nx - 1) * sp) / 2, oy = (H - (ny - 1) * sp) / 2;
        var S = jzShapeLayer(b, 'bg xpPlusField', 0, 0), hd = axp_hd(b);
        for (d = 0; d <= nx + ny - 2; d++) {
            var i0 = Math.min(d, nx - 1), j0 = d - i0, cnt = Math.min(i0, ny - 1 - j0) + 1;
            if (j0 > ny - 1 || cnt < 1) continue;
            var g = jzGrp(S, 'diagonal ' + (d + 1)), c = axp_sub(g, 'cross');
            jzAddPath(c, [[-arm, 0], [arm, 0]], false); jzAddPath(c, [[0, -arm], [0, arm]], false);
            jzSetExpr(jzGX(c).property('ADBE Vector Rotation'), hd + '90*ioc(0.5+0.5*Math.sin(T*0.7-' + jzN(d * 0.36) + '))');
            axp_stroke(g, sc.fg, axp_lw(b, 0.0035), P.k || 0.11);
            axp_rep(g, cnt, -sp, sp);
            jzGX(g).property('ADBE Vector Position').setValue([ox + i0 * sp, oy + j0 * sp]);
        }
        axp_fade(b, S, 0.6);
    }
});

/* ---- xpFoldPlanes — 折り重なる面: four big translucent triangles (one in the accent) whose corners wander slowly, overlapping like folded paper */
jzReg('bg', 'xpFoldPlanes', {
    plan: function (rng, st) { return { seed: axp_seed(rng), k: rng.range(0.035, 0.05) }; },
    build: function (b, P) {
        var W = b.W, H = b.H, sc = b.sc, s = P.seed || 1, s9 = s % 997, k = P.k || 0.04, i, j;
        var S = jzShapeLayer(b, 'bg xpFoldPlanes', 0, 0), hd = axp_hd(b);
        for (i = 3; i >= 0; i--) {
            var pts = [], ex = [];
            for (j = 0; j < 3; j++) {
                var a = AXP_TAU * (axp_r(s, i, j) * 0.25 + j / 3 + i * 0.13), rd = 0.5 + 0.4 * axp_r(s, i, j, 2);
                var x = W * (0.5 + Math.cos(a) * rd), y = H * (0.5 + Math.sin(a) * rd);
                pts.push([x, y]);
                ex.push('[' + jzN(x) + '+' + jzN(W * 0.14) + '*n1(T*0.07+' + jzN(j * 3.1) + ',' + (s9 + i * 7 + j) + '),' + jzN(y) + '+' + jzN(H * 0.14) + '*n1(T*0.06+' + jzN(j * 5.3) + ',' + (s9 + i * 11 + j + 40) + ')]');
            }
            var g = jzGrp(S, 'plane ' + (i + 1)), p = jzAddPath(g, pts, true);
            jzSetExpr(p.property('ADBE Vector Shape'), hd + 'createPath([' + ex.join(',') + '],[],[],true)');
            axp_round(axp_stroke(g, sc.fg, axp_lw(b, 0.002), k * 1.6));
            axp_fill(g, i === 2 ? sc.accent : sc.fg, k);
        }
        axp_fade(b, S, 0.8);
    }
});

/* ================================================================ LINE FIELDS */

/* ---- xpFlowLines — 流れる線: 16–24 parallel hairlines bending like a slow current.
   AE: the browser's main noise term is one profile that travels along the lines and is offset from line to line, so it is baked
   once from the browser's own noise (for the stretch this cut can show), repeated for every line and slid with an expression;
   the smaller counter-running term is a Wave Warp across the whole field */
jzReg('bg', 'xpFlowLines', {
    plan: function (rng, st) { return { seed: axp_seed(rng), n: rng.int(16, 24), horiz: rng.chance(0.35), k: rng.range(0.13, 0.16) }; },
    build: function (b, P) {
        var W = b.W, H = b.H, sc = b.sc, s = P.seed || 1, hz = !!P.horiz, L = hz ? W : H, X = hz ? H : W, n = P.n || 20, amp = X * 0.075;
        var T0 = b.cut.start || 0, T1 = T0 + b.comp.duration, hd = axp_hd(b);
        // noise argument of line i at (u, T): u*2.2 + T*0.12 + i*0.09 ; the baked path is line -1 at T0 (along = u*L)
        var aRef = T0 * 0.12 - 0.09, a0 = aRef - 0.3, a1 = 2.2 + T1 * 0.12 + n * 0.09 + 0.3, st = 1 / 8, pts = [], a;
        for (a = a0; a <= a1 + st; a += st) { var al = (a - aRef) / 2.2 * L, pv = amp * axp_n1(a, s); pts.push(hz ? [al, pv] : [pv, al]); }
        var S = jzShapeLayer(b, 'bg xpFlowLines', 0, 0), g = jzGrp(S, 'lines');
        axp_curve(g, pts);
        axp_round(axp_stroke(g, sc.fg, axp_lw(b, 0.0022), P.k || 0.11));
        var sh = -0.09 / 2.2 * L, dx = X / n;
        axp_rep(g, n + 2, hz ? sh : dx, hz ? dx : sh);
        var sl = '-time*' + jzN(0.12 / 2.2 * L), b0 = jzN(-0.5 / n * X);
        jzSetExpr(jzGX(g).property('ADBE Vector Position'), hd + (hz ? '[' + sl + ',' + b0 + ']' : '[' + b0 + ',' + sl + ']'));
        var ww = jzEffect(S, 'ADBE Wave Warp', 'JZ Cross Current');
        jzEP(ww, 1, 1); jzEP(ww, 2, amp * 0.25); jzEP(ww, 3, L * 0.4); jzEP(ww, 4, hz ? 90 : 0); jzEP(ww, 5, 0); jzEP(ww, 6, 1);
        jzEX(ww, 7, hd + 'T*36');
        axp_fade(b, S, 0.6);
    }
});

/* ---- xpHorizonLines — 遠近の横線: horizontal rules leaving a horizon line upwards and downwards, getting thicker and faster like a floor and a ceiling in perspective */
jzReg('bg', 'xpHorizonLines', {
    plan: function (rng, st) { return { seed: axp_seed(rng), cy: rng.pick([0.5, 0.42, 0.6]), spd: rng.range(0.035, 0.06), k: rng.range(0.085, 0.11) }; },
    build: function (b, P) {
        var W = b.W, H = b.H, sc = b.sc, U = jzU(b), px = axp_px(b), n = 9, k = P.k || 0.09, i, hd = axp_hd(b);
        var S = jzShapeLayer(b, 'bg xpHorizonLines', 0, H * (P.cy || 0.5));
        var g = jzGrp(S, 'horizon');
        jzAddRect(g, W, 2 * px); axp_fill(g, sc.accent, 0.22);
        jzGX(g).property('ADBE Vector Position').setValue([W / 2, 0]);
        jzSetExpr(jzGX(g).property('ADBE Vector Scale'), hd + '[100*oc(BT/0.6),100]');
        for (i = 0; i < n; i++) {
            var hp = hd + 'var p=wr(' + jzN(i / n) + '+T*' + jzN(P.spd || 0.045) + ',1);';
            g = jzGrp(S, 'rule ' + (i + 1));
            var q = axp_sub(g, 'bar');
            jzAddRect(q, W, U * 0.011, 0, W / 2, 0);
            jzSetExpr(jzGX(q).property('ADBE Vector Position'), hp + '[0,' + jzN(H * 0.66) + '*Math.pow(p,2.3)]');
            jzSetExpr(jzGX(q).property('ADBE Vector Scale'), hp + '[100,100*Math.max(p,' + jzN(1.5 * px / (U * 0.011)) + ')]');
            axp_fill(g, sc.fg, k);
            axp_rep(g, 2, 0, 0, { sc: [100, -100] });      // second copy mirrored about the horizon
            jzSetExpr(jzGX(g).property('ADBE Vector Group Opacity'), hp + '100*Math.min(1,p*4)*(1-sm(0.8,1,p))');
        }
        jzSetExpr(jzXf(S, 'ADBE Position'), hd + '[0,' + jzN(H) + '*(' + jzN(P.cy || 0.5) + '+0.04*Math.sin(T*0.19))]');
        axp_fade(b, S, 0.6);
    }
});

/* ---- xpDialTicks — 目盛りの輪: four rings of tick marks (every sixth one longer) turning at different speeds and directions */
jzReg('bg', 'xpDialTicks', {
    plan: function (rng, st) { return { seed: axp_seed(rng), cx: rng.pick([0.5, 0.5, 0.18, 0.82]), cy: rng.pick([0.5, 0.5, 0.62]), spd: rng.range(1.5, 3) * rng.pick([1, -1]), k: rng.range(0.17, 0.21) }; },
    build: function (b, P) {
        var W = b.W, H = b.H, sc = b.sc, U = jzU(b), NS = [48, 72, 120, 180], RS = [0.3, 0.47, 0.7, 1.02], SP = [1, -0.6, 0.35, -0.2], r;
        var hd = axp_hd(b) + 'var e=oc(BT/0.8);', lw = axp_lw(b, 0.0034), k = P.k || 0.12;
        var S = jzShapeLayer(b, 'bg xpDialTicks', W * (P.cx || 0.5), H * (P.cy || 0.5));
        for (r = 0; r < 4; r++) {
            var N = NS[r], R = U * RS[r], g = jzGrp(S, 'ring ' + (r + 1));
            var q = axp_sub(g, 'long');       // the extra length of every sixth tick
            jzAddPath(q, [[R + U * 0.016, 0], [R + U * 0.04, 0]], false); axp_stroke(q, sc.fg, lw, k); axp_rep(q, N / 6, 0, 0, { rot: 2160 / N });
            q = axp_sub(g, 'ticks');
            jzAddPath(q, [[R, 0], [R + U * 0.016, 0]], false); axp_stroke(q, sc.fg, lw, k); axp_rep(q, N, 0, 0, { rot: 360 / N });
            jzSetExpr(jzGX(g).property('ADBE Vector Rotation'), hd + 'T*' + jzN((P.spd || 2) * SP[r]));
        }
        jzSetExpr(jzXf(S, 'ADBE Scale'), hd + 'var q=85+15*e;[q,q]');
        jzSetExpr(jzXf(S, 'ADBE Opacity'), hd + '100*e');
    }
});

/* ---- xpSineWeave — 編む波線: bands of two mirrored sine lines crossing each other like a braid, phases running in alternate directions */
jzReg('bg', 'xpSineWeave', {
    plan: function (rng, st) { return { seed: axp_seed(rng), k: rng.range(0.12, 0.15), spd: rng.range(0.25, 0.45) }; },
    build: function (b, P) {
        var W = b.W, H = b.H, sc = b.sc, s = P.seed || 1, nb = H > W ? 5 : 3, amp = H / nb * 0.3, bi;
        var S = jzShapeLayer(b, 'bg xpSineWeave', 0, 0), hd = axp_hd(b);
        for (bi = 0; bi < nb; bi++) {
            var kx = AXP_TAU * (1.3 + 1.2 * axp_r(s, bi)), g = jzGrp(S, 'band ' + (bi + 1)), p = jzAddPath(g, [[0, 0], [W, 0]], false);
            jzSetExpr(p.property('ADBE Vector Shape'), hd + 'var o=[],q,u,ph=' + jzN(axp_r(s, bi, 2) * AXP_TAU) + '+T*' + jzN((P.spd || 0.3) * (bi % 2 ? -1 : 1)) + ';' +
                'for(q=0;q<=44;q++){u=q/44;o.push([u*' + jzN(W) + ',' + jzN(amp) + '*Math.sin(u*' + jzN(kx) + '+ph)*(0.75+0.25*Math.sin(u*3.1+T*0.2+' + bi + '))]);}createPath(o,[],[],false)');
            axp_round(axp_stroke(g, sc.fg, axp_lw(b, 0.0035), P.k || 0.1));
            axp_rep(g, 2, 0, 0, { sc: [100, -100] });      // the mirrored partner line
            jzGX(g).property('ADBE Vector Position').setValue([0, H * (bi + 0.5) / nb]);
        }
        axp_fade(b, S, 0.6);
    }
});

/* ---- xpLissajous — リサージュ: one frame-filling Lissajous curve slowly changing its figure, with a fainter echo that lags behind; drawn on.
   AE: 120 bezier points (analytic tangents) instead of the browser's 260 straight steps */
jzReg('bg', 'xpLissajous', {
    plan: function (rng, st) { return { seed: axp_seed(rng), ab: rng.pick([[3, 2], [5, 4], [3, 4], [5, 3], [2, 1]]), spd: rng.range(0.08, 0.14), k: rng.range(0.14, 0.17) }; },
    build: function (b, P) {
        var W = b.W, H = b.H, sc = b.sc, ab = P.ab || [3, 2], k = P.k || 0.12, c;
        var S = jzShapeLayer(b, 'bg xpLissajous', W / 2, H / 2), hd = axp_hd(b);
        for (c = 1; c >= 0; c--) {
            var g = jzGrp(S, c ? 'echo' : 'curve'), p = jzAddPath(g, [[0, 0], [10, 10]], false);
            jzSetExpr(p.property('ADBE Vector Shape'), hd + 'var N=120,A=' + jzN(ab[0]) + ',B=' + jzN(ab[1]) + ',rx=' + jzN(W * 0.46) + ',ry=' + jzN(H * 0.44) + ',dl=T*' + jzN(P.spd || 0.1) + '-' + jzN(c * 0.35) + '+' + ((P.seed || 1) % 6) +
                ',h=Math.PI*2/N/3,V=[],I=[],O=[],i,th,dx,dy;for(i=0;i<N;i++){th=i/N*Math.PI*2;V.push([rx*Math.sin(A*th+dl),ry*Math.sin(B*th)]);dx=rx*A*Math.cos(A*th+dl)*h;dy=ry*B*Math.cos(B*th)*h;I.push([-dx,-dy]);O.push([dx,dy]);}createPath(V,I,O,true)');
            jzAddTrimPaths(g, hd + '100*oc(BT/1)');
            axp_round(axp_stroke(g, sc.fg, axp_lw(b, 0.0026), k * (c ? 0.45 : 1)));
        }
        axp_fade(b, S, 1);
    }
});

/* ---- xpPendulums — 振り子の糸: strings of different lengths hanging from the top edge with a small bob, each swinging at the pace of its length */
jzReg('bg', 'xpPendulums', {
    plan: function (rng, st) { return { seed: axp_seed(rng), k: rng.range(0.15, 0.19), amp: rng.range(5, 9) }; },
    build: function (b, P) {
        var W = b.W, H = b.H, sc = b.sc, s = P.seed || 1, U = jzU(b), n = Math.min(18, Math.round(W / (U * 0.14))), k = P.k || 0.11, i;
        var S = jzShapeLayer(b, 'bg xpPendulums', 0, 0), hd = axp_hd(b);
        for (i = 0; i < n; i++) {
            var x = W * (i + 0.5 + 0.3 * axp_rs(s, i, 1)) / n, L = H * (0.28 + 0.55 * axp_r(s, i, 2)), rb = U * (0.008 + 0.01 * axp_r(s, i, 4));
            var g = jzGrp(S, 'pendulum ' + (i + 1)), q = axp_sub(g, 'bob');
            jzAddEllipse(q, rb * 2, rb * 2, 0, L); axp_fill(q, sc.fg, k * 1.3);
            q = axp_sub(g, 'string');
            jzAddPath(q, [[0, 0], [0, L]], false); axp_stroke(q, sc.fg, axp_lw(b, 0.002), k);
            jzGX(g).property('ADBE Vector Position').setValue([x, 0]);
            jzSetExpr(jzGX(g).property('ADBE Vector Rotation'), hd + '-' + jzN(P.amp || 7) + '*Math.sin(T*' + jzN(0.9 / Math.sqrt(0.3 + L / H)) + '+' + jzN(axp_r(s, i, 3) * AXP_TAU) + ')');
        }
        jzSetExpr(jzXf(S, 'ADBE Scale'), hd + '[100,100*oc(BT/0.9)]');      // the strings let down from the top edge
        axp_fade(b, S, 0.9);
    }
});

/* ---- xpOrbits — 軌道: five tilted elliptical orbits around a small core, an accent planet travelling on each */
jzReg('bg', 'xpOrbits', {
    plan: function (rng, st) { return { seed: axp_seed(rng), tilt: rng.range(-28, 28), cx: rng.pick([0.5, 0.36, 0.64]), spd: rng.range(0.25, 0.4), k: rng.range(0.15, 0.19) }; },
    build: function (b, P) {
        var W = b.W, H = b.H, sc = b.sc, s = P.seed || 1, U = jzU(b), k = P.k || 0.11, big = Math.max(W, H), i;
        var S = jzShapeLayer(b, 'bg xpOrbits', W * (P.cx || 0.5), H * 0.5), hd = axp_hd(b) + 'var e=oc(BT/0.9);';
        jzXf(S, 'ADBE Rotate Z').setValue((P.tilt || 0) + (H > W ? 90 : 0));
        var g = jzGrp(S, 'planets');
        for (i = 0; i < 5; i++) {
            var rx = big * (0.16 + 0.13 * i), rp = U * (0.009 + 0.008 * axp_r(s, i, 2)), el = jzAddEllipse(g, rp * 2, rp * 2);
            jzSetExpr(el.property('ADBE Vector Ellipse Position'), hd + 'var a=T*' + jzN((P.spd || 0.3) / (0.6 + i * 0.5) * (i % 2 ? -1 : 1)) + '+' + jzN(axp_r(s, i) * AXP_TAU) + ';[' + jzN(rx) + '*Math.cos(a),' + jzN(rx * 0.36) + '*Math.sin(a)]');
        }
        axp_fill(g, sc.accent, 0.45);
        g = jzGrp(S, 'core'); jzAddEllipse(g, U * 0.07, U * 0.07); axp_fill(g, sc.fg, k * 0.6);
        g = jzGrp(S, 'orbits');
        for (i = 0; i < 5; i++) jzAddEllipse(g, big * (0.16 + 0.13 * i) * 2, big * (0.16 + 0.13 * i) * 0.72);
        axp_stroke(g, sc.fg, axp_lw(b, 0.002), k);
        jzSetExpr(jzXf(S, 'ADBE Scale'), hd + 'var q=80+20*e;[q,q]');
        jzSetExpr(jzXf(S, 'ADBE Opacity'), hd + '100*e');
    }
});

/* ---- xpMarchDash — 流れる破線: 9–13 horizontal dashed lines, every line with its own dash rhythm, marching left or right (one line in the accent) */
jzReg('bg', 'xpMarchDash', {
    plan: function (rng, st) { return { seed: axp_seed(rng), n: rng.int(9, 13), spd: rng.range(0.03, 0.06), k: rng.range(0.1, 0.13) }; },
    build: function (b, P) {
        var W = b.W, H = b.H, sc = b.sc, s = P.seed || 1, U = jzU(b), n = P.n || 11, k = P.k || 0.08, i;
        var S = jzShapeLayer(b, 'bg xpMarchDash', 0, 0), hd = axp_hd(b);
        for (i = 0; i < n; i++) {
            var y = H * (i + 0.5) / n, d = U * (0.04 + 0.24 * axp_r(s, i)), gp = d * (0.5 + axp_r(s, i, 2));
            var g = jzGrp(S, 'line ' + (i + 1));
            jzAddPath(g, [[0, y], [W, y]], false);
            var st = axp_stroke(g, i === (s % n) ? sc.accent : sc.fg, axp_lw(b, 0.005), k * (0.7 + 0.7 * axp_r(s, i, 5)));
            axp_dash(st, d, gp, hd + '-T*' + jzN(U * (P.spd || 0.04) * (i % 2 ? -1 : 1) * (0.5 + 1.5 * axp_r(s, i, 3))) + '+' + jzN(axp_r(s, i, 4) * (d + gp)));
        }
        axp_fade(b, S, 0.6);
    }
});

/* ---- xpDepthGrid — 迫る方眼: three square grids zooming towards the viewer, each fading in small and out at double size, one after the other */
jzReg('bg', 'xpDepthGrid', {
    plan: function (rng, st) { return { seed: axp_seed(rng), spd: rng.range(0.035, 0.06), k: rng.range(0.1, 0.13) }; },
    build: function (b, P) {
        var W = b.W, H = b.H, sc = b.sc, U = jzU(b), base = U * 0.1, lw = Math.max(1.2 * axp_px(b), U * 0.0016), l;
        var nx = Math.min(16, Math.ceil(W / 2 / base)), ny = Math.min(16, Math.ceil(H / 2 / base));
        for (l = 0; l < 3; l++) {
            var S = jzShapeLayer(b, 'bg xpDepthGrid ' + (l + 1), W / 2, H / 2), hd = axp_hd(b) + 'var p=wr(T*' + jzN(P.spd || 0.045) + '+' + jzN(l / 3) + ',1);';
            var g = jzGrp(S, 'rows');
            jzAddRect(g, W, lw, 0, 0, (-ny + 0.5) * base); axp_fill(g, sc.fg, P.k || 0.11); axp_rep(g, 2 * ny + 1, 0, base);
            g = jzGrp(S, 'columns');
            jzAddRect(g, lw, H, 0, (-nx + 0.5) * base, 0); axp_fill(g, sc.fg, P.k || 0.11); axp_rep(g, 2 * nx + 1, base, 0);
            jzSetExpr(jzXf(S, 'ADBE Scale'), hd + 'var q=100*Math.pow(2,p);[q,q]');
            jzSetExpr(jzXf(S, 'ADBE Opacity'), hd + '100*oc(BT/0.6)*Math.sin(Math.PI*p)');
        }
    }
});

/* ---- xpStringArt — 糸の曲線: straight threads strung between the two edges of a corner so that they envelope a curve; two opposite corners, the threads creeping along.
   AE: the 22 threads of a corner are one zigzag path (createPath); the turns between threads lie outside the frame */
jzReg('bg', 'xpStringArt', {
    plan: function (rng, st) { return { seed: axp_seed(rng), diag: rng.chance(0.5), spd: rng.range(0.04, 0.07), k: rng.range(0.1, 0.13) }; },
    build: function (b, P) {
        var W = b.W, H = b.H, sc = b.sc, U = jzU(b), c;
        var cs = P.diag ? [[0, 0, 1, 1], [W, H, -1, -1]] : [[W, 0, -1, 1], [0, H, 1, -1]];
        var S = jzShapeLayer(b, 'bg xpStringArt', 0, 0), hd = axp_hd(b);
        for (c = 1; c >= 0; c--) {
            var g = jzGrp(S, 'corner ' + (c + 1)), p = jzAddPath(g, [[0, 0], [10, 10]], false);
            jzSetExpr(p.property('ADBE Vector Shape'), hd + 'var e=oc(BT/0.9),fr=wr(T*' + jzN(P.spd || 0.05) + ',1),Lx=' + jzN(W * 0.85) + '*e,Ly=' + jzN(H * 0.85) + '*e,m=' + jzN(U * 0.05) + ',o=[],i,u,px,py,q1,q2,A,B;' +
                'for(i=0;i<22;i++){u=(i+' + (c ? '1-fr' : 'fr') + ')/22;py=Ly*(1-u);px=Lx*u;q1=Math.min(m/(py+0.001),3);q2=Math.min(m/(px+0.001),3);A=[-px*q2,py*(1+q2)];B=[px*(1+q1),-py*q1];' +
                'if(i%2){o.push(B);o.push(A);}else{o.push(A);o.push(B);}}createPath(o,[],[],false)');
            axp_round(axp_stroke(g, sc.fg, axp_lw(b, 0.0018), P.k || 0.11));
            jzGX(g).property('ADBE Vector Position').setValue([cs[c][0], cs[c][1]]);
            jzGX(g).property('ADBE Vector Scale').setValue([cs[c][2] * 100, cs[c][3] * 100]);
        }
        axp_fade(b, S, 0.9);
    }
});

/* ================================================================ DOT / PARTICLE FIELDS */

/* ---- xpDotSheet — 波打つ点の面: a sheet of dots seen in perspective (12 rows, 26 dots each), waves running through it; dots swell on the crests.
   AE: one path per row holding its 26 discs (AXP_BEAD), driven by one expression */
jzReg('bg', 'xpDotSheet', {
    plan: function (rng, st) { return { seed: axp_seed(rng), top: rng.chance(0.3), k: rng.range(0.16, 0.2) }; },
    build: function (b, P) {
        var W = b.W, H = b.H, sc = b.sc, U = jzU(b), cols = 26, rows = 12, j;
        var S = jzShapeLayer(b, 'bg xpDotSheet', 0, 0), hd = axp_hd(b), g = jzGrp(S, 'dots');
        if (P.top) { jzXf(S, 'ADBE Position').setValue([0, H]); jzXf(S, 'ADBE Scale').setValue([100, -100]); }
        for (j = rows - 1; j >= 0; j--) {
            var near = 1 - j / (rows - 1), yb = H * (0.4 + 0.58 * Math.pow(near, 1.7)), sz = 0.4 + 0.6 * near, p = jzAddPath(g, [[0, yb], [W, yb], [W, yb + 1]], true);
            jzSetExpr(p.property('ADBE Vector Shape'), hd + 'var C=Math.cos(' + jzN(j * 0.6) + '-T*0.5),Q=[],n,h;for(n=0;n<' + cols + ';n++){h=Math.sin(n*0.45+T*0.9+' + jzN(j * 0.2) + ')*C;' +
                'Q.push([' + jzN(W * -0.06 + U * 0.02 * j) + '+' + jzN(W * 1.12 / (cols - 1)) + '*n,' + jzN(yb) + '-h*' + jzN(U * 0.04 * sz) + ',' + jzN(U * 0.0065 * sz) + '*(1+0.45*h)]);}' + AXP_BEAD);
        }
        axp_fill(g, sc.fg, P.k || 0.18);
        axp_fade(b, S, 0.6);
    }
});

/* ---- xpWindStreaks — 風の筋: short horizontal streaks in three depths blowing across, nearer ones longer, thicker and faster.
   AE: the 14 streaks of a depth slide as one group and wrap with a 2-copy Repeater (browser: every streak wraps on its own length) */
jzReg('bg', 'xpWindStreaks', {
    plan: function (rng, st) { return { seed: axp_seed(rng), ang: rng.range(-10, 10), dir: rng.pick([1, -1]), spd: rng.range(0.05, 0.09), k: rng.range(0.17, 0.21) }; },
    build: function (b, P) {
        var W = b.W, H = b.H, sc = b.sc, s = P.seed || 1, U = jzU(b), D = Math.sqrt(W * W + H * H), k = P.k || 0.11, bi, i;
        var S = jzShapeLayer(b, 'bg xpWindStreaks', W / 2, H / 2), hd = axp_hd(b);
        jzXf(S, 'ADBE Rotate Z').setValue(P.ang || 0);
        for (bi = 2; bi >= 0; bi--) {
            var d = (bi + 1) / 3, Pd = D + U * (0.05 + 0.16 * d) * 1.4, g = jzGrp(S, 'streaks ' + (bi + 1));
            for (i = 0; i < 14; i++) {
                var len = U * (0.05 + 0.16 * d) * (0.6 + 0.8 * axp_r(s, bi, i, 1)), x = axp_r(s, bi, i, 2) * (D + len) - D / 2 - len, y = (axp_r(s, bi, i, 3) - 0.5) * D;
                jzAddPath(g, [[x, y], [x + len, y]], false);
            }
            axp_round(axp_stroke(g, sc.fg, Math.max(1.2 * axp_px(b), U * 0.0018 * (1 + d * 1.4)), k * (0.45 + 0.55 * d)));
            axp_rep(g, 2, Pd, 0, { off: -1 });
            jzSetExpr(jzGX(g).property('ADBE Vector Position'), hd + '[wr(T*' + jzN((P.dir || 1) * D * (P.spd || 0.07) * (0.4 + d)) + ',' + jzN(Pd) + '),' + jzN(U * 0.012) + '*Math.sin(T*0.8+' + bi + ')]');
        }
        axp_fade(b, S, 0.6);
    }
});
