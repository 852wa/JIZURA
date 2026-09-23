// ================================================================ background graphics part 2 (AE port of the bg entries in src/11p_bgcamB.js)
// bg.build(b, P): b.comp is the cut's WRAPPER comp (full frame, time 0 = cut start, duration = cut + 1 s). Layers you add sit above the
// scheme colour / paper and below the lyric. Expressions use T = absolute song time (browser env.t) and BT = time since this background
// started (browser bgT, drives the fade-ins). Repeating patterns are ONE shape group + two Repeaters (x / y) that slide by a wrapped offset.

// ================================================================ shared helpers of this pack (prefix bg2_)
// the browser's deterministic hash J.h / J.r (so random placements match the web frame)
function bg2_h(a, b, c, d, e) {
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
function bg2_r(a, b, c, d, e) { return bg2_h(a, b, c, d, e) / 4294967296; }
function bg2_rs(a, b, c, d, e) { return bg2_r(a, b, c, d, e) * 2 - 1; }
function bg2_rr(lo, hi, a, b, c, d, e) { return lo + (hi - lo) * bg2_r(a, b, c, d, e); }
// J.noise1 / fbm1 of the browser (1-D value noise, -1..1) for baked shapes
function bg2_noise1(x, s) { var i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f), a = bg2_rs(s, i), c = bg2_rs(s, i + 1); return a + (c - a) * u; }
function bg2_fbm1(x, s, oct) { var v = 0, a = 0.5, f = 1, n = 0, i; for (i = 0; i < oct; i++) { v += bg2_noise1(x * f, s + i * 53) * a; n += a; a *= 0.5; f *= 2.1; } return v / n; }
function bg2_smooth(a, b, x) { var t = jzClamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
function bg2_oc(x) { x = jzClamp(x, 0, 1); return 1 - Math.pow(1 - x, 3); }
// seconds this background had already been running at the cut start (browser bgT: consecutive cuts with the same bg + seed are one run)
function bg2_run(b) {
    var c = b.cut, cs = (b.plan && b.plan.cuts) || [], s = c.start || 0, P0 = c.bgP || {}, idx = -1, i;
    for (i = 0; i < cs.length; i++) if (cs[i] === c) { idx = i; break; }
    for (i = idx - 1; i >= 0; i--) {
        var p = cs[i];
        if (p.bg === c.bg && (p.bgP || {}).seed === P0.seed && Math.abs(p.end - s) < 0.06) s = p.start; else break;
    }
    return (c.start || 0) - s;
}
// expression header: T = absolute song time, BT = time since this background started
var BG2_FNS = 'function cl(x){return Math.max(0,Math.min(1,x));}function oc(x){x=cl(x);return 1-Math.pow(1-x,3);}function wr(v,m){return ((v%m)+m)%m;}';
// value noise inside expressions (sin-hash lattice, smoothstep; same statistics as the browser's noise1 / noise2, identical in AE and preview)
var BG2_VN = 'function hs(i,j){var q=Math.sin(i*127.1+j*311.7)*43758.5453;return q-Math.floor(q);}' +
    'function vn1(x,j){var i=Math.floor(x),f=x-i,u=f*f*(3-2*f),a=hs(i,j),c=hs(i+1,j);return (a+(c-a)*u)*2-1;}' +
    'function vn2(x,y){var i=Math.floor(x),j=Math.floor(y),fx=x-i,fy=y-j,u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy),a=hs(i,j),c=hs(i+1,j),d=hs(i,j+1),e=hs(i+1,j+1);return a+(c-a)*u+(d-a)*v+(a-c-d+e)*u*v;}';
function bg2_hd(b) { return BG2_FNS + 'var T=time+' + jzN(b.cut.start || 0) + ',BT=time+' + jzN(bg2_run(b)) + ';\n'; }
function bg2_px(b) { return jzU(b) / 1080; }                        // one browser design px in comp px
function bg2_dark(sc) { return jzLum(sc.bg) < 0.45; }
// colourful scheme colours that stand apart from the background (browser hues())
function bg2_hues(sc) {
    var c = [sc.accent, sc.accent2, sc.ghostA, sc.ghostB, sc.fg], o = [], i, j;
    for (i = 0; i < c.length; i++) {
        if (!c[i] || jzContrast(c[i], sc.bg) < 1.25) continue;
        var k = String(c[i]).toLowerCase(), dup = false;
        for (j = 0; j < o.length; j++) if (String(o[j]).toLowerCase() === k) dup = true;
        if (!dup) o.push(c[i]);
    }
    return o.length ? o : [sc.fg];
}
function bg2_glowOf(sc) { var L = jzLum(sc.bg), c = [sc.accent, sc.accent2, sc.ghostA, sc.ghostB, sc.fg], i; for (i = 0; i < c.length; i++) if (c[i] && jzLum(c[i]) > L + 0.25) return c[i]; return sc.fg; }
function bg2_lightOn(sc) { return bg2_dark(sc) ? bg2_glowOf(sc) : (jzLum(sc.bg) < 0.78 ? '#FFFFFF' : jzMixHex(sc.accent, '#FFFFFF', 0.2)); }
function bg2_seed(rng) { return rng.int(1, 999999999); }
function bg2_solid(b, hex, name, w, h) { return b.comp.layers.addSolid(jzHex(hex), name, Math.max(4, Math.round(w)), Math.max(4, Math.round(h)), 1, b.comp.duration); }
// rectangle mask in layer space; o: { f: [fx, fy] feather, mode: MaskMode.*, inv: true }
function bg2_mask(L, x0, y0, x1, y1, o) {
    o = o || {};
    var m = L.property('ADBE Mask Parade').addProperty('ADBE Mask Atom'), sh = new Shape();
    sh.vertices = [[x1, y0], [x1, y1], [x0, y1], [x0, y0]]; sh.closed = true;
    m.property('ADBE Mask Shape').setValue(sh);
    if (o.f) m.property('ADBE Mask Feather').setValue(o.f);
    if (o.mode) m.maskMode = o.mode;
    if (o.inv) m.inverted = true;
    return m;
}
function bg2_cmask(L, cx, cy, r, o) {
    o = o || {};
    var m = L.property('ADBE Mask Parade').addProperty('ADBE Mask Atom');
    m.property('ADBE Mask Shape').setValue(jzCircleShape(cx, cy, r));
    if (o.f) m.property('ADBE Mask Feather').setValue(o.f);
    if (o.mode) m.maskMode = o.mode;
    if (o.inv) m.inverted = true;
    return m;
}
// shape Repeater (copies n, offset off, step [dx, dy]) at the end of group g
function bg2_rep(g, n, dx, dy, off) {
    var V = jzVecs(g), ix = V.addProperty('ADBE Vector Filter - Repeater').propertyIndex;
    V.property(ix).property('ADBE Vector Repeater Copies').setValue(n);
    if (off) V.property(ix).property('ADBE Vector Repeater Offset').setValue(off);
    V.property(ix).property('ADBE Vector Repeater Transform').property('ADBE Vector Repeater Position').setValue([dx, dy]);
    return V.property(ix);
}
// a periodic tile (period dx × dy) repeated over the frame; the group's position then slides by -(wrapped offset + 2 periods)
function bg2_tile(g, W, H, dx, dy, ex, ey) {
    bg2_rep(g, Math.ceil((W + (ex || 0)) / dx) + 5, dx, 0, 0);
    bg2_rep(g, Math.ceil((H + (ey || 0)) / dy) + 5, 0, dy, 0);
}
function bg2_sub(g, name) { var c = jzVecs(g).addProperty('ADBE Vector Group'); if (name) c.name = name; return c; }   // group inside a group
function bg2_hex(g, x, y, r) { var p = [], m; for (m = 0; m < 6; m++) { var a = (m * 60 - 30) * Math.PI / 180; p.push([x + Math.cos(a) * r, y + Math.sin(a) * r]); } return jzAddPath(g, p, true); }
function bg2_round(st) { try { st.property('ADBE Vector Stroke Line Cap').setValue(2); st.property('ADBE Vector Stroke Line Join').setValue(2); } catch (e) {} return st; }
// dashed stroke (AE starts with an empty Dashes group; the preview model has fixed children)
// (each entry is added AND set before the next one is added: in AE adding to the Dashes group invalidates held references to the others)
function bg2_dashP(D, mn, v) {
    var p = null;
    try { p = D.addProperty(mn); } catch (e) { p = null; }
    if (!p) { try { p = D.property(mn); } catch (e2) { p = null; } }
    if (p) p.setValue(v);
}
function bg2_dash(st, dl, gp) {
    var D = st.property('ADBE Vector Stroke Dashes');
    bg2_dashP(D, 'ADBE Vector Stroke Dash 1', dl);
    bg2_dashP(D, 'ADBE Vector Stroke Gap 1', gp);
}
// L gets the layer directly above it as track matte (and the matte is switched off)
function bg2_matte(L, M, type) { L.trackMatteType = type; M.enabled = false; }

/* ================================================================ GRADIENT */

/* ---- auroraRibbons — オーロラ: 2-3 curtains of light (bright lower edge, fading upwards) waving sideways, streaked by drifting rays.
   AE: per ribbon one shape layer of columns (ray opacity per column from noise), two feathered masks give the vertical fade,
   Gaussian Blur softens, two sine Wave Warps bend the curtain (the browser's sine + noise baseline) */
jzReg('bg', 'auroraRibbons', {
    plan: function (rng, st) { return { seed: bg2_seed(rng), n: rng.int(2, 3), y: rng.range(0.36, 0.48), k: rng.range(0.2, 0.28), c0: rng.int(0, 3) }; },
    build: function (b, P) {
        var W = b.W, H = b.H, sc = b.sc, s = P.seed || 1, dk = bg2_dark(sc), px = bg2_px(b), M = 56, cw = W / M, i, r;
        var hu = bg2_hues(sc), lite = [];
        for (i = 0; i < hu.length; i++) if (jzLum(hu[i]) > jzLum(sc.bg) + 0.12) lite.push(hu[i]);
        var lc = dk ? (lite.length ? lite : [bg2_lightOn(sc)]) : [bg2_lightOn(sc), sc.accent];
        var kk = (P.k || 0.24) * (dk ? 1.25 : 0.8), n = P.n || 2, hd = bg2_hd(b) + BG2_VN;
        for (r = 0; r < n; r++) {
            var col = lc[((P.c0 || 0) + r) % lc.length], base = H * ((P.y || 0.42) + r * 0.1 - 0.05), dir = r % 2 ? -1 : 1, ph = (s % 97) * 0.13 + r * 2.1;
            var h = Math.max(W, H) * 0.3 * (1 - 0.1 * r), sr = (s % 89) + r * 17;
            var S = jzShapeLayer(b, 'bg auroraRibbons ' + (r + 1), 0, 0);
            for (i = 0; i < M; i++) {
                var u = (i + 0.5) / M, ed = bg2_smooth(0, 0.18, u) * bg2_smooth(1, 0.82, u);
                var g = jzGrp(S, 'ray ' + (i + 1));
                jzAddRect(g, cw + 2 * px, h * 1.07, 0, (i + 0.5) * cw, base - h + h * 0.535);
                var f = jzAddFill(g, col);
                jzSetExpr(f.property('ADBE Vector Fill Opacity'), hd + 'var n1=vn1(' + jzN(u * 34) + '+T*' + jzN(0.9 * dir) + ',' + (sr + 31) + '),n2=vn1(' + jzN(u * 13) + '-T*0.4,' + (sr + 3) + '),n3=vn1(' + jzN(u * 1.5) + '+T*0.1,' + sr + ');' +
                    'Math.min(100,' + jzN(100 * kk * ed) + '*(0.2+1.1*Math.pow(0.5+0.5*n1,1.4)*(0.7+0.3*n2))*(0.75+0.25*n3))');
            }
            // vertical profile: transparent top -> bright band just above the base line -> quick fade below it
            // (two identical intersecting linear ramps = r^2, the browser strip's convex 0 / 0.22 / 0.85 / 1 profile)
            bg2_mask(S, -W, base - 0.475 * h, 2 * W, base + 3 * h, { f: [0, 0.85 * h] });
            bg2_mask(S, -W, base - 0.475 * h, 2 * W, base + 3 * h, { f: [0, 0.85 * h], mode: MaskMode.INTERSECT });
            bg2_mask(S, -W, base - 3 * h, 2 * W, base + 0.035 * h, { f: [0, 0.08 * h], mode: MaskMode.INTERSECT });
            var bl = jzEffect(S, 'ADBE Gaussian Blur 2', 'JZ Aurora Soft'); jzEP(bl, 1, cw * 1.1); jzEP(bl, 3, 0);
            var wv = [[H * 0.07, W / 0.75, ph, 0.3 * dir], [H * 0.035, W / 1.9, ph * 1.7 + 1, 0.69 * dir]], q;
            for (q = 0; q < 2; q++) {
                var ww = jzEffect(S, 'ADBE Wave Warp', 'JZ Aurora Wave ' + (q + 1));
                jzEP(ww, 1, 1); jzEP(ww, 4, 90); jzEP(ww, 5, 0); jzEP(ww, 6, 1);
                jzEX(ww, 2, jzN(wv[q][0])); jzEX(ww, 3, jzN(wv[q][1]));
                jzEX(ww, 7, hd + '-(' + jzN(wv[q][2]) + '+T*' + jzN(wv[q][3]) + ')*180/Math.PI');
            }
            jzSetExpr(jzXf(S, 'ADBE Opacity'), hd + '100*oc(BT/1.2)');
        }
    }
});

/* ---- meshBlobs — メッシュグラデ: 3-4 huge soft discs in the scheme's hues wandering on Lissajous paths (solid + feathered circle mask each) */
jzReg('bg', 'meshBlobs', {
    plan: function (rng, st) { return { seed: bg2_seed(rng), n: rng.int(3, 4), k: rng.range(0.2, 0.3) }; },
    build: function (b, P) {
        var W = b.W, H = b.H, sc = b.sc, s = P.seed || 1, cols = bg2_hues(sc), dk = bg2_dark(sc), R0 = Math.max(W, H) * 0.5, n = P.n || 3, i;
        for (i = 0; i < n; i++) {
            var w1 = bg2_rr(0.16, 0.3, s, i, 1), w2 = bg2_rr(0.14, 0.26, s, i, 2), R = R0 * bg2_rr(0.75, 1.1, s, i, 5);
            var c = jzMixHex(sc.bg, cols[i % cols.length], (P.k || 0.25) * (dk ? 1 : 0.75)), D = Math.ceil(R * 2.1);
            var L = bg2_solid(b, c, 'bg meshBlobs ' + (i + 1), D, D);
            bg2_cmask(L, D / 2, D / 2, R * 0.5, { f: [R, R] });          // alpha 1 at the centre -> 0.5 at R/2 -> 0 at R
            jzSetExpr(jzXf(L, 'ADBE Position'), bg2_hd(b) + '[' + jzN(W) + '*(0.5+0.42*Math.sin(T*' + jzN(w1) + '+' + jzN(bg2_r(s, i, 3) * 2 * Math.PI) + ')),' +
                jzN(H) + '*(0.5+0.4*Math.cos(T*' + jzN(w2) + '+' + jzN(bg2_r(s, i, 4) * 2 * Math.PI) + '))]');
            jzSetExpr(jzXf(L, 'ADBE Scale'), bg2_hd(b) + 'var f=100*(1+0.08*Math.sin(T*0.45+' + jzN(i * 1.7) + '));[f,f]');
            jzSetExpr(jzXf(L, 'ADBE Opacity'), bg2_hd(b) + '95*oc(BT/1)');
        }
    }
});

/* ---- duotoneSweep — 二色スイープ: two tones swept round an (often off-frame) centre, turning slowly, with a faint sheen.
   AE: 4-Color Gradient whose points (A, B, A, B) turn on a circle round the centre (≈ the browser's conic gradient);
   the sheen = two narrow nested wedges of light turning 1.6x faster */
jzReg('bg', 'duotoneSweep', {
    plan: function (rng, st) { return { seed: bg2_seed(rng), pos: rng.pick([[0.5, 1.2], [-0.15, 1.1], [1.15, 1.1], [0.5, -0.2], [-0.1, -0.1]]), spd: rng.range(0.08, 0.14) * rng.pick([1, -1]), k: rng.range(0.14, 0.2), a0: rng.range(0, 6.28) }; },
    build: function (b, P) {
        var W = b.W, H = b.H, sc = b.sc, U = jzU(b), cols = bg2_hues(sc), k = P.k || 0.16, j, q;
        var cA = jzMixHex(sc.bg, cols[0], k), cB = jzMixHex(sc.bg, cols[1] || sc.fg, k);
        var pos = P.pos || [0.5, 1.2], cx = W * pos[0], cy = H * pos[1];
        var dC = Math.sqrt((cx - W / 2) * (cx - W / 2) + (cy - H / 2) * (cy - H / 2)), rho = dC * 0.9 + U * 0.25;
        var hd = bg2_hd(b) + 'var a=' + jzN(P.a0 || 0) + '+T*' + jzN(P.spd || 0.1) + ';';
        var L = bg2_solid(b, cA, 'bg duotoneSweep', W, H);
        var fx = jzEffect(L, 'ADBE 4ColorGradient', 'JZ Duotone');
        for (j = 0; j < 4; j++) {
            jzEX(fx, 1 + 2 * j, hd + 'var q=a+' + jzN(j * Math.PI / 2) + ';[' + jzN(cx) + '+Math.cos(q)*' + jzN(rho) + ',' + jzN(cy) + '+Math.sin(q)*' + jzN(rho) + ']');
            jzEP(fx, 2 + 2 * j, jzHex(j % 2 ? cB : cA));
        }
        jzSetExpr(jzXf(L, 'ADBE Opacity'), hd + '90*oc(BT/0.8)');
        // sheen: bands centred at 0.06 and 0.62 turns after the (1.6x faster) sheen angle; three nested wedges = triangular profile
        var Rw = Math.sqrt(W * W + H * H) * 1.8, S = jzShapeLayer(b, 'bg duotoneSweep sheen', cx, cy), hl = bg2_lightOn(sc);
        for (j = 0; j < 2; j++) {
            var g = jzGrp(S, 'sheen ' + (j + 1));
            for (q = 1; q <= 3; q++) {
                var w = 0.015 * q * 2 * Math.PI, gq = bg2_sub(g, 'band ' + q);
                jzAddPath(gq, [[0, 0], [Math.cos(-w) * Rw, Math.sin(-w) * Rw], [Math.cos(w) * Rw, Math.sin(w) * Rw]], true);
                jzAddFill(gq, hl, 2.5);
            }
            jzSetExpr(jzGX(g).property('ADBE Vector Rotation'), hd + '(a*1.6+1+' + jzN((j ? 0.62 : 0.06) * 2 * Math.PI) + ')*180/Math.PI');
        }
        var bl = jzEffect(S, 'ADBE Gaussian Blur 2', 'JZ Sheen Soft'); jzEP(bl, 1, U * 0.02); jzEP(bl, 3, 0);
        jzSetExpr(jzXf(S, 'ADBE Opacity'), hd + '100*oc(BT/0.8)');
    }
});

/* ---- horizonGlow — 惑星の縁: the limb of a huge planet rising at the bottom, a breathing atmosphere glow, a flare sliding along the rim.
   AE: planet = shape ellipse; glow = two frame-sized solids with feathered ring masks (they move with the planet), limb stroke, flare disc */
jzReg('bg', 'horizonGlow', {
    plan: function (rng, st) { return { seed: bg2_seed(rng), cx: rng.range(0.3, 0.7), R: rng.range(1.3, 2.1), top: rng.range(0.7, 0.8), k: rng.range(0.28, 0.4) }; },
    build: function (b, P) {
        var W = b.W, H = b.H, sc = b.sc, U = jzU(b), dk = bg2_dark(sc), s = P.seed || 1, px = bg2_px(b), i;
        var R = Math.max(W, H) * (P.R || 1.6), cx0 = W * (P.cx || 0.5), cy0 = H * (P.top || 0.75) + R;
        var gc = dk ? bg2_glowOf(sc) : jzTintC(sc, 0.8), k = (P.k || 0.32) * (dk ? 1 : 0.55);
        var hd = bg2_hd(b) + 'var e=oc(BT/1.1),dx=' + jzN(W * 0.03) + '*Math.sin(T*0.08+' + (s % 9) + '),dy=(1-e)*' + jzN(H * 0.25) + '+' + jzN(H * 0.008) + '*Math.sin(T*0.25),br=0.85+0.15*Math.sin(T*0.7);';
        var cen = hd + '[' + jzN(cx0) + '+dx,' + jzN(cy0) + '+dy]';
        // the planet
        var D = jzShapeLayer(b, 'bg horizonGlow planet', 0, 0), gd = jzGrp(D, 'planet');
        jzAddEllipse(gd, 2 * R, 2 * R);
        jzAddFill(gd, dk ? jzMixHex(sc.bg, '#000000', 0.42) : jzMixHex(sc.bg, sc.fg, 0.05));
        jzSetExpr(jzGX(gd).property('ADBE Vector Position'), cen);
        jzSetExpr(jzXf(D, 'ADBE Opacity'), hd + '100*e');
        // atmosphere: wide soft ring + tight bright ring (solids 1.1W x 1.4H, top-left at (-0.05W, -0.35H) when the planet rests)
        var ox = W * 0.05, oy = H * 0.35, spec = [[1.09, 0.26, k * 32], [1.008, 0.03, k * 100]];
        for (i = 0; i < 2; i++) {
            var G = bg2_solid(b, gc, 'bg horizonGlow atmosphere ' + (i + 1), W * 1.1, H * 1.4);
            bg2_cmask(G, cx0 + ox, cy0 + oy, R * spec[i][0], { f: [R * spec[i][1], R * spec[i][1]] });
            bg2_cmask(G, cx0 + ox, cy0 + oy, R * 0.97, { mode: MaskMode.SUBTRACT });
            jzSetExpr(jzXf(G, 'ADBE Position'), hd + '[' + jzN(W * 0.55 - ox) + '+dx,' + jzN(H * 0.7 - oy) + '+dy]');
            jzSetExpr(jzXf(G, 'ADBE Opacity'), hd + 'Math.min(100,' + jzN(spec[i][2]) + '*br*e)');
        }
        // the limb line
        var Lm = jzShapeLayer(b, 'bg horizonGlow limb', 0, 0), gl = jzGrp(Lm, 'limb');
        jzAddEllipse(gl, 2 * R, 2 * R);
        jzAddStroke(gl, gc, Math.max(px, U * 0.0022), Math.min(80, k * 160));
        jzSetExpr(jzGX(gl).property('ADBE Vector Position'), cen);
        jzSetExpr(jzXf(Lm, 'ADBE Opacity'), hd + '100*e');
        // a flare sliding slowly along the limb
        var fr = U * 0.3, F = bg2_solid(b, dk ? gc : bg2_lightOn(sc), 'bg horizonGlow flare', fr * 2, fr * 2);
        bg2_cmask(F, fr, fr, fr * 0.4, { f: [fr * 0.8, fr * 0.8] });
        jzSetExpr(jzXf(F, 'ADBE Position'), hd + 'var fa=-Math.PI/2+0.22*Math.sin(T*0.12+' + (s % 13) + ');[' + jzN(cx0) + '+dx+Math.cos(fa)*' + jzN(R) + ',' + jzN(cy0) + '+dy+Math.sin(fa)*' + jzN(R) + ']');
        jzSetExpr(jzXf(F, 'ADBE Opacity'), hd + 'Math.min(100,' + jzN(k * 90) + '*br*e)');
    }
});

/* ================================================================ PATTERN */

/* ---- seigaiha — 青海波: overlapping wave scales (concentric arcs + a small centre dot), drifting sideways and bobbing.
   AE: the visible part of every arc is computed once (later rows cover earlier ones), one scale pair per tile, Repeaters */
function bg2_seigaiha(R, rings, lw) {
    var cov = [[R, R / 2], [-R, R / 2], [0, R], [R, 1.5 * R], [-R, 1.5 * R], [0, 2 * R]], D2R = Math.PI / 180, arcs = [], m, j, q;
    var vis = function (x, y) { for (var c = 0; c < cov.length; c++) { var dx = x - cov[c][0], dy = y - cov[c][1]; if (dx * dx + dy * dy < R * R * 0.9999) return false; } return true; };
    for (m = 0; m < rings; m++) {
        var r = R * (1 - m / rings) - lw * 0.6, al = 0;
        if (r <= lw) continue;
        while (al < 180 && vis(r * Math.cos((-90 + al + 0.5) * D2R), r * Math.sin((-90 + al + 0.5) * D2R))) al += 0.5;
        if (al < 1) continue;
        var np = Math.max(3, Math.ceil(al / 3)) * 2 + 1, pts = [];
        for (j = 0; j < np; j++) { var an = (-90 - al + 2 * al * j / (np - 1)) * D2R; pts.push([r * Math.cos(an), r * Math.sin(an)]); }
        arcs.push(pts);
    }
    var rd = R / rings * 0.62, dot = [];
    for (q = 0; q < 36; q++) {
        var a2 = q * 10 * D2R, rho = 0;
        while (rho < rd && vis(Math.cos(a2) * (rho + rd / 16), Math.sin(a2) * (rho + rd / 16))) rho += rd / 16;
        dot.push([Math.cos(a2) * rho, Math.sin(a2) * rho]);
    }
    return { arcs: arcs, dot: dot };
}
function bg2_shift(pts, x, y) { var o = [], i; for (i = 0; i < pts.length; i++) o.push([pts[i][0] + x, pts[i][1] + y]); return o; }
jzReg('bg', 'seigaiha', {
    plan: function (rng, st) { return { seed: bg2_seed(rng), R: rng.range(0.07, 0.1), rings: rng.int(3, 4), k: rng.range(0.075, 0.1), dir: rng.pick([1, -1]), acc: rng.chance(0.3) }; },
    build: function (b, P) {
        var W = b.W, H = b.H, sc = b.sc, R = jzU(b) * (P.R || 0.08), rings = P.rings || 4, k = P.k || 0.09, lw = R * 0.075, i, c;
        var col = P.acc ? jzTintC(sc, k * 1.6) : jzLayC(sc, k), fc = jzLayC(sc, k * 0.35), geo = bg2_seigaiha(R, rings, lw), C = [[0, 0], [R, R / 2]];
        var S = jzShapeLayer(b, 'bg seigaiha', 0, 0), g = jzGrp(S, 'waves');
        var gs = bg2_sub(g, 'rings');
        for (c = 0; c < 2; c++) for (i = 0; i < geo.arcs.length; i++) jzAddPath(gs, bg2_shift(geo.arcs[i], C[c][0], C[c][1]), false);
        jzAddStroke(gs, col, lw);
        var gd = bg2_sub(g, 'dots');
        for (c = 0; c < 2; c++) jzAddPath(gd, bg2_shift(geo.dot, C[c][0], C[c][1]), true);
        jzAddFill(gd, fc);
        bg2_tile(g, W, H, 2 * R, R, 2 * R, 2 * R);
        var hd = bg2_hd(b) + 'var e=oc(BT/0.7);';
        jzSetExpr(jzGX(g).property('ADBE Vector Position'), hd + '[-wr(T*' + jzN(R * 0.22 * (P.dir || 1)) + ',' + jzN(2 * R) + ')-' + jzN(4 * R) +
            ',-wr(' + jzN(R * 0.5) + '+Math.sin(T*0.5)*' + jzN(R * 0.08) + '-(1-e)*' + jzN(R * 0.5) + ',' + jzN(R) + ')-' + jzN(2 * R) + ']');
        jzSetExpr(jzXf(S, 'ADBE Opacity'), hd + '100*e');
    }
});

/* ---- asanoha — 麻の葉: hemp-leaf lattice (triangles + spokes to their centres) drifting slowly; a diagonal band of light sweeps across
   and draws the lines stronger (AE: a stronger copy of the lattice under a soft moving band matte) */
function bg2_asanoha(g, a, h) {
    var T = [[[0, 0], [a, 0], [a / 2, h]], [[a / 2, h], [1.5 * a, h], [a, 0]], [[a / 2, h], [1.5 * a, h], [a, 2 * h]], [[0, 2 * h], [a, 2 * h], [a / 2, h]]], i;
    for (i = 0; i < 4; i++) {
        var A = T[i][0], B = T[i][1], C = T[i][2], G = [(A[0] + B[0] + C[0]) / 3, (A[1] + B[1] + C[1]) / 3];
        jzAddPath(g, [A, B, C], true);
        jzAddPath(g, [A, G, B], false);
        jzAddPath(g, [G, C], false);
    }
}
jzReg('bg', 'asanoha', {
    plan: function (rng, st) { return { seed: bg2_seed(rng), a: rng.range(0.1, 0.14), k: rng.range(0.09, 0.12), dx: rng.pick([1, -1]), sweep: rng.range(0.07, 0.12) }; },
    build: function (b, P) {
        var W = b.W, H = b.H, sc = b.sc, U = jzU(b), px = bg2_px(b), a = U * (P.a || 0.12), h = a * Math.sqrt(3) / 2, k = P.k || 0.09, lw = Math.max(0.8 * px, a * 0.018);
        var hd = bg2_hd(b) + 'var e=oc(BT/0.8);';
        var pos = hd + '[-wr(T*' + jzN(a * 0.08 * (P.dx || 1)) + ',' + jzN(a) + ')-' + jzN(2 * a) + ',-wr(T*' + jzN(h * 0.05) + '+(1-e)*' + jzN(h) + ',' + jzN(2 * h) + ')-' + jzN(4 * h) + ']';
        var lat = function (name, c, w) {
            var L = jzShapeLayer(b, name, 0, 0), g = jzGrp(L, 'asanoha');
            bg2_asanoha(g, a, h); bg2_round(jzAddStroke(g, c, w));
            bg2_tile(g, W, H, a, 2 * h, 2 * a, 2 * h);
            jzSetExpr(jzGX(g).property('ADBE Vector Position'), pos);
            jzSetExpr(jzXf(L, 'ADBE Opacity'), hd + '100*e');
            return L;
        };
        lat('bg asanoha', jzLayC(sc, k), lw);
        var S2 = lat('bg asanoha sheen', jzLayC(sc, k * 1.3), lw * 1.15);
        // the band: parallelogram leaning 45° (x - y), soft edges; position = the browser's sweep centre (bgT based)
        var bw = U * 0.22, M = jzShapeLayer(b, 'bg asanoha band', 0, 0), gm = jzGrp(M, 'band'), hw = bw * 0.6;
        jzAddPath(gm, [[-hw + 4 * px, -4 * px], [hw + 4 * px, -4 * px], [hw - H - 4 * px, H + 4 * px], [-hw - H - 4 * px, H + 4 * px]], true);
        jzAddFill(gm, '#FFFFFF');
        jzSetExpr(jzGX(gm).property('ADBE Vector Position'), bg2_hd(b) + '[(wr(BT*' + jzN(P.sweep || 0.09) + '+0.4,1.5)-0.25)*' + jzN(W + H) + ',0]');
        var bl = jzEffect(M, 'ADBE Gaussian Blur 2', 'JZ Band Soft'); jzEP(bl, 1, bw * 0.6); jzEP(bl, 3, 0);
        bg2_matte(S2, M, TrackMatteType.ALPHA);
    }
});

/* ---- houndstooth — 千鳥格子: the classic broken check, sliding diagonally */
jzReg('bg', 'houndstooth', {
    plan: function (rng, st) { return { seed: bg2_seed(rng), c: rng.range(0.04, 0.055), k: rng.range(0.055, 0.075), dx: rng.pick([1, -1]), acc: rng.chance(0.25) }; },
    build: function (b, P) {
        var W = b.W, H = b.H, sc = b.sc, c = jzU(b) * (P.c || 0.045), k = P.k || 0.065, i;
        var col = P.acc ? jzTintC(sc, k * 1.7) : jzLayC(sc, k);
        var S = jzShapeLayer(b, 'bg houndstooth', 0, 0), g = jzGrp(S, 'tooth'), B = [[c, 0], [0, c]];
        jzAddRect(g, c, c, 0, c / 2, c / 2);
        for (i = 0; i < 2; i++) {
            var bx = B[i][0], by = B[i][1];
            jzAddPath(g, [[bx, by], [bx + c / 2, by], [bx, by + c / 2]], true);
            jzAddPath(g, [[bx + c, by], [bx + c, by + c / 2], [bx + c / 2, by + c], [bx, by + c]], true);
        }
        jzAddFill(g, col);
        bg2_tile(g, W, H, 2 * c, 2 * c, 2 * c, 2 * c);
        var hd = bg2_hd(b);
        jzSetExpr(jzGX(g).property('ADBE Vector Position'), hd + 'var d=T*' + jzN(c * 0.35) + ';[-wr(d*' + (P.dx || 1) + ',' + jzN(2 * c) + ')-' + jzN(4 * c) + ',-wr(d*0.6,' + jzN(2 * c) + ')-' + jzN(4 * c) + ']');
        jzSetExpr(jzXf(S, 'ADBE Opacity'), hd + '100*oc(BT/0.6)');
    }
});

/* ---- herringbone — ヘリンボーン: two-tone brick weave at ±45°, travelling along its zig-zag columns, a slow sheen crossing it.
   AE: one brick pair + two Repeaters along the weave's own lattice vectors (u,u) and (2u,-2u) in a rotated shape layer */
jzReg('bg', 'herringbone', {
    plan: function (rng, st) { return { seed: bg2_seed(rng), u: rng.range(0.032, 0.045), k: rng.range(0.07, 0.1), dir: rng.pick([1, -1]), rot: rng.pick([45, 45, -45]) }; },
    build: function (b, P) {
        var W = b.W, H = b.H, sc = b.sc, U = jzU(b), u = U * (P.u || 0.038), k = P.k || 0.08, rot = P.rot || 45, gp = u * 0.1, dk = bg2_dark(sc);
        var hd = bg2_hd(b);
        var S = jzShapeLayer(b, 'bg herringbone', W / 2, H / 2);
        jzXf(S, 'ADBE Rotate Z').setValue(rot);
        var g = jzGrp(S, 'weave');
        var ga = bg2_sub(g, 'across'); jzAddRect(ga, 2 * u - 2 * gp, u - 2 * gp, 0, u, u / 2); jzAddFill(ga, jzLayC(sc, k));
        var gb = bg2_sub(g, 'along'); jzAddRect(gb, u - 2 * gp, 2 * u - 2 * gp, 0, 2.5 * u, 0); jzAddFill(gb, jzLayC(sc, k * 0.45));
        // copies needed along each (orthogonal) lattice vector to cover the frame once rotated
        var th = rot * Math.PI / 180, V = [[1, 1], [2, -2]], i;
        for (i = 0; i < 2; i++) {
            var L = Math.sqrt(V[i][0] * V[i][0] + V[i][1] * V[i][1]), sx = (Math.cos(th) * V[i][0] - Math.sin(th) * V[i][1]) / L, sy = (Math.sin(th) * V[i][0] + Math.cos(th) * V[i][1]) / L;
            var half = Math.abs(sx) * W / 2 + Math.abs(sy) * H / 2 + 6 * u, n = 2 * Math.ceil(half / (L * u)) + 2;
            bg2_rep(g, n, V[i][0] * u, V[i][1] * u, -n / 2);
        }
        var sp = 'wr(T*' + jzN(u * 0.6 * (P.dir || 1)) + ',' + jzN(Math.SQRT2 * u) + ')';
        jzSetExpr(jzXf(S, 'ADBE Position'), hd + (rot > 0 ? '[' + jzN(W / 2) + ',' + jzN(H / 2) + '-' + sp + ']' : '[' + jzN(W / 2) + '-' + sp + ',' + jzN(H / 2) + ']'));
        jzSetExpr(jzXf(S, 'ADBE Opacity'), hd + '100*oc(BT/0.7)');
        // sheen band (leaning like the browser's x - 0.6y skew), soft sideways
        var bw = U * 0.35, SH = jzShapeLayer(b, 'bg herringbone sheen', 0, 0), gs = jzGrp(SH, 'sheen'), y0 = -H * 0.05, y1 = H * 1.05;
        jzAddPath(gs, [[-bw / 2 - 0.6 * y0, y0], [bw / 2 - 0.6 * y0, y0], [bw / 2 - 0.6 * y1, y1], [-bw / 2 - 0.6 * y1, y1]], true);
        jzAddFill(gs, bg2_lightOn(sc));
        jzSetExpr(jzGX(gs).property('ADBE Vector Position'), hd + '[(wr(T*0.1,1.6)-0.3)*' + jzN(W + H) + ',0]');
        var bl = jzEffect(SH, 'ADBE Gaussian Blur 2', 'JZ Sheen Soft'); jzEP(bl, 1, bw * 0.5); jzEP(bl, 2, 2); jzEP(bl, 3, 0);
        jzSetExpr(jzXf(SH, 'ADBE Opacity'), hd + jzN((dk ? 3.5 : 8) * 1.2) + '*oc(BT/0.7)');
    }
});

/* ---- argyle — アーガイル: a checker of two-tone diamonds drifting vertically + dashed diagonal over-check lines moving on their own */
jzReg('bg', 'argyle', {
    plan: function (rng, st) { return { seed: bg2_seed(rng), dw: rng.range(0.16, 0.22), asp: rng.range(1.3, 1.5), k: rng.range(0.06, 0.085), up: rng.pick([1, -1]) }; },
    build: function (b, P) {
        var W = b.W, H = b.H, sc = b.sc, px = bg2_px(b), dw = jzU(b) * (P.dw || 0.18), dh = dw * (P.asp || 1.4), k = P.k || 0.07, i;
        var hd = bg2_hd(b) + 'var e=oc(BT/0.6),d=T*' + jzN(dh * 0.1 * (P.up || 1)) + ';';
        var dia = function (g, x, y) { jzAddPath(g, [[x, y - dh / 2], [x + dw / 2, y], [x, y + dh / 2], [x - dw / 2, y]], true); };
        var S = jzShapeLayer(b, 'bg argyle', 0, 0), g = jzGrp(S, 'diamonds');
        var gA = bg2_sub(g, 'A'); dia(gA, 0, 0); dia(gA, dw, dh); jzAddFill(gA, jzLayC(sc, k));
        var gB = bg2_sub(g, 'B'); dia(gB, dw, 0); dia(gB, 0, dh); jzAddFill(gB, jzTintC(sc, k * 1.6));
        bg2_tile(g, W, H, 2 * dw, 2 * dh, 4 * dw, 4 * dh);
        jzSetExpr(jzGX(g).property('ADBE Vector Position'), hd + '[-wr(' + jzN(dw - W / 2) + ',' + jzN(2 * dw) + ')-' + jzN(4 * dw) + ',-wr(d-(1-e)*' + jzN(dh * 0.3) + ',' + jzN(2 * dh) + ')-' + jzN(4 * dh) + ']');
        jzSetExpr(jzXf(S, 'ADBE Opacity'), hd + '100*e');
        // over-check: long dashed diagonals through the diamonds' corners (dash = 1/12 of one diamond edge, as in the browser tile)
        var LL = jzShapeLayer(b, 'bg argyle lines', 0, 0), gl = jzGrp(LL, 'lines'), NT = Math.ceil(H / dh) + 3, nx = Math.ceil(W / dw) + NT + 6;
        for (i = 0; i < 2; i++) {
            var gi = bg2_sub(gl, i ? 'falling left' : 'falling right'), sgn = i ? -1 : 1, x0 = -sgn * dw / 2;
            jzAddPath(gi, [[x0 - sgn * 2 * dw, -2 * dh], [x0 + sgn * NT * dw, NT * dh]], false);
            bg2_rep(gi, nx, dw, 0, i ? -3 : -(NT + 3));
        }
        var Ld = Math.sqrt(dw * dw + dh * dh), st = jzAddStroke(gl, jzLayC(sc, k * 3), Math.max(0.8 * px, dw * 0.012));
        bg2_dash(st, Ld / 12, Ld / 12);
        jzSetExpr(jzGX(gl).property('ADBE Vector Position'), hd + '[-wr(' + jzN(dw / 2 - W / 2) + '-d*0.6,' + jzN(dw) + '),-wr(-d,' + jzN(dh) + ')]');
        jzSetExpr(jzXf(LL, 'ADBE Opacity'), hd + '90*e');
    }
});

/* ---- tartan — タータン: a mirrored sett of stripes crossed with itself (translucent), warp drifting sideways, weft drifting up */
jzReg('bg', 'tartan', {
    plan: function (rng, st) { return { seed: bg2_seed(rng), S: rng.range(0.34, 0.5), w1: rng.range(0.18, 0.28), w2: rng.range(0.08, 0.13), k: rng.range(0.085, 0.115), acc: rng.chance(0.6) }; },
    build: function (b, P) {
        var W = b.W, H = b.H, sc = b.sc, S0 = jzU(b) * (P.S || 0.42), k = P.k || 0.1, w1 = P.w1 || 0.22, w2 = P.w2 || 0.1, o, q, m;
        var cA = jzLayC(sc, k), cB = P.acc ? jzTintC(sc, k * 1.5) : jzLayC(sc, k * 0.6), cL = jzLayC(sc, k * 1.6), cT = jzTintC(sc, k * 2.4);
        var sett = [[0, w1, cA, 0.6], [w1 + 0.04, 0.012, cL, 0.9], [w1 + 0.1, w2, cB, 0.55], [0.72, 0.008, cT, 0.9], [0.84, 0.02, cL, 0.7]];
        var hd = bg2_hd(b), S = jzShapeLayer(b, 'bg tartan', 0, 0);
        for (o = 0; o < 2; o++) {      // weft (horizontal) first = drawn on top
            var hz = o === 0, g = jzGrp(S, hz ? 'weft' : 'warp'), span = (hz ? W : H) + 4 * S0;
            for (q = 0; q < sett.length; q++) {
                var gi = bg2_sub(g, 'stripe ' + (q + 1)), p0 = sett[q][0], w = sett[q][1], xs = [(p0 + w / 2) * S0, S0 - (p0 + w / 2) * S0];
                for (m = 0; m < 2; m++) {
                    if (hz) jzAddRect(gi, span, w * S0, 0, (hz ? W : H) / 2, xs[m]);
                    else jzAddRect(gi, w * S0, span, 0, xs[m], H / 2);
                }
                jzAddFill(gi, sett[q][2], sett[q][3] * 100);
            }
            var n = Math.ceil((hz ? H : W) / S0) + 4;
            if (hz) { bg2_rep(g, n, 0, S0, 0); jzSetExpr(jzGX(g).property('ADBE Vector Position'), hd + '[0,-wr(T*' + jzN(S0 * 0.025) + '+' + jzN(S0 * 0.37) + ',' + jzN(S0) + ')-' + jzN(S0) + ']'); }
            else { bg2_rep(g, n, S0, 0, 0); jzSetExpr(jzGX(g).property('ADBE Vector Position'), hd + '[-wr(-T*' + jzN(S0 * 0.035) + ',' + jzN(S0) + ')-' + jzN(S0) + ',0]'); }
        }
        jzSetExpr(jzXf(S, 'ADBE Opacity'), hd + '100*oc(BT/0.8)');
    }
});

/* ---- chevron — 山形: zig-zag bands flowing up or down, swaying a little sideways */
jzReg('bg', 'chevron', {
    plan: function (rng, st) { return { seed: bg2_seed(rng), p: rng.range(0.13, 0.19), amp: rng.range(0.28, 0.42), k: rng.range(0.055, 0.075), dir: rng.pick([1, -1]), acc: rng.chance(0.3) }; },
    build: function (b, P) {
        var W = b.W, H = b.H, sc = b.sc, px = bg2_px(b), p = jzU(b) * (P.p || 0.16), D = p * 0.5, A = p * (P.amp || 0.35), k = P.k || 0.065;
        var col = P.acc ? jzTintC(sc, k * 1.7) : jzLayC(sc, k), y0 = A / 2;
        var S = jzShapeLayer(b, 'bg chevron', 0, 0), g = jzGrp(S, 'chevrons');
        jzAddPath(g, [[-px, y0], [p / 2, y0 - A], [p + px, y0], [p + px, y0 + D / 2], [p / 2, y0 - A + D / 2], [-px, y0 + D / 2]], true);
        jzAddFill(g, col);
        bg2_tile(g, W, H, p, D, 2 * p, 2 * D + 2 * A);
        var hd = bg2_hd(b);
        jzSetExpr(jzGX(g).property('ADBE Vector Position'), hd + '[-wr(' + jzN(p / 2 - W / 2) + '+Math.sin(T*0.3)*' + jzN(p * 0.1) + ',' + jzN(p) + ')-' + jzN(2 * p) +
            ',-wr(-T*' + jzN(D * 0.4 * (P.dir || 1)) + '+(1-oc(BT/0.6))*' + jzN(D) + ',' + jzN(D) + ')-' + jzN(2 * D) + ']');
        jzSetExpr(jzXf(S, 'ADBE Opacity'), hd + '100*oc(BT/0.6)');
    }
});

/* ---- isoCubes — 立方体: isometric cube lattice; the light turns slowly so top / left / right faces trade brightness */
jzReg('bg', 'isoCubes', {
    plan: function (rng, st) { return { seed: bg2_seed(rng), s: rng.range(0.055, 0.075), k: rng.range(0.08, 0.11), spd: rng.range(0.2, 0.35) * rng.pick([1, -1]), l0: rng.range(0, 6.28) }; },
    build: function (b, P) {
        var W = b.W, H = b.H, sc = b.sc, s = jzU(b) * (P.s || 0.065), r3 = Math.sqrt(3), pw = r3 * s, ph = 3 * s, col = jzLayC(sc, P.k || 0.09), fi, n2;
        var hd = bg2_hd(b) + 'var e=oc(BT/0.6),Lg=' + jzN(P.l0 || 0) + '+T*' + jzN(P.spd || 0.25) + ';';
        var dirs = [-Math.PI / 2, Math.PI * 5 / 6, Math.PI / 6], names = ['top', 'left', 'right'];
        var S = jzShapeLayer(b, 'bg isoCubes', 0, 0), g = jzGrp(S, 'cubes');
        for (fi = 0; fi < 3; fi++) {
            var gi = bg2_sub(g, names[fi]);
            for (n2 = 0; n2 < 2; n2++) {
                var cx = n2 * pw / 2, cy = n2 * 1.5 * s, Tp = [cx, cy - s], UR = [cx + pw / 2, cy - s / 2], LR = [cx + pw / 2, cy + s / 2], Bt = [cx, cy + s], LL = [cx - pw / 2, cy + s / 2], UL = [cx - pw / 2, cy - s / 2], C = [cx, cy];
                jzAddPath(gi, fi === 0 ? [Tp, UR, C, UL] : fi === 1 ? [UL, C, Bt, LL] : [UR, LR, Bt, C], true);
            }
            var f = jzAddFill(gi, col);
            jzSetExpr(f.property('ADBE Vector Fill Opacity'), hd + '100*e*(0.25+0.75*(0.5+0.5*Math.cos(Lg-(' + jzN(dirs[fi]) + '))))');
        }
        bg2_tile(g, W, H, pw, ph, 2 * pw, 2 * ph);
        jzSetExpr(jzGX(g).property('ADBE Vector Position'), hd + '[-wr(T*' + jzN(s * 0.25) + ',' + jzN(pw) + ')-' + jzN(2 * pw) + ',-wr(T*' + jzN(s * 0.25 / r3 * 1.5) + ',' + jzN(ph) + ')-' + jzN(2 * ph) + ']');
    }
});

/* ---- hexGrid — 六角格子: honeycomb outline growing out from the centre; rings of light travel outwards through the cells
   (AE: soft rings seen through a honeycomb alpha matte) or random cells sparkle */
jzReg('bg', 'hexGrid', {
    plan: function (rng, st) { return { seed: bg2_seed(rng), s: rng.range(0.05, 0.07), k: rng.range(0.09, 0.12), mode: rng.pick(['ring', 'ring', 'sparkle']) }; },
    build: function (b, P) {
        var W = b.W, H = b.H, sc = b.sc, U = jzU(b), px = bg2_px(b), s = U * (P.s || 0.06), r3 = Math.sqrt(3), rr = s * 0.9, k = P.k || 0.1, i, j;
        var R = Math.sqrt(W * W + H * H) / 2, cols = Math.ceil(W / (r3 * s)) + 2, rows = Math.ceil(H / (1.5 * s)) + 2, sd = (P.seed || 1) % 9973;
        var hd = bg2_hd(b) + 'var e=oc(BT/0.7);', tint = jzTintC(sc, k * 1.6), sparkle = P.mode === 'sparkle';
        var lattice = function (g, r) { bg2_hex(g, 0, 0, r); bg2_hex(g, r3 * s / 2, 1.5 * s, r); };
        var tileIt = function (g) { bg2_rep(g, cols + 3, r3 * s, 0, 0); bg2_rep(g, Math.ceil(rows / 2) + 3, 0, 3 * s, 0); jzGX(g).property('ADBE Vector Position').setValue([-r3 * s, -3 * s]); };
        // outline grid (+ sparkles), revealed by a growing disc
        var GL = jzShapeLayer(b, 'bg hexGrid', 0, 0);
        if (sparkle) {
            var M = Math.max(3, Math.round(cols * rows * 0.05)), gs = jzGrp(GL, 'sparkles');
            for (i = 0; i < M; i++) {
                var gi = bg2_sub(gs, 'sparkle ' + (i + 1)); bg2_hex(gi, 0, 0, rr * 0.86);
                var fi = jzAddFill(gi, tint);
                var ex = hd + 'var tw=Math.floor(T*3+1e-6),f=T*3-tw;seedRandom(' + sd + '+tw*97+' + (i * 7) + ',true);var ci=Math.floor(random(-1,' + cols + ')),cj=Math.floor(random(-1,' + rows + '));';
                jzSetExpr(jzGX(gi).property('ADBE Vector Position'), ex + '[(ci+(((cj%2)+2)%2)*0.5)*' + jzN(r3 * s) + ',cj*' + jzN(1.5 * s) + ']');
                jzSetExpr(fi.property('ADBE Vector Fill Opacity'), ex + 'var v=1-f*0.6;v>0.75?100:(v>0.45?62.5:31.25)');
            }
        }
        var gg = jzGrp(GL, 'grid'); lattice(gg, rr);
        jzAddStroke(gg, jzLayC(sc, k), Math.max(px, U * 0.0022));
        tileIt(gg);
        var MK = jzShapeLayer(b, 'bg hexGrid reveal', W / 2, H / 2), gk = jzGrp(MK, 'reveal'), ek = jzAddEllipse(gk, 10, 10);
        jzSetExpr(ek.property('ADBE Vector Ellipse Size'), hd + 'var d=2*(' + jzN(1.2 * R) + '*e+' + jzN(s * 0.5) + ');[d,d]');
        jzAddFill(gk, '#FFFFFF');
        bg2_matte(GL, MK, TrackMatteType.ALPHA);
        if (!sparkle) {
            // cos^6 rings (3 lit levels = three nested strokes of the brightest tint) travelling outwards, collapsed beyond the revealed radius
            var RL = jzShapeLayer(b, 'bg hexGrid rings', W / 2, H / 2), lam = R / 3.2;
            for (j = 0; j < 6; j++) {
                var g = jzGrp(RL, 'ring ' + (j + 1)), el = jzAddEllipse(g, 10, 10);
                jzSetExpr(el.property('ADBE Vector Ellipse Size'), hd + 'var r=(' + j + '+wr(T*0.55,1))*' + jzN(lam) + ';r>' + jzN(1.2 * R) + '*e+' + jzN(lam * 0.15) + '?[0,0]:[2*r,2*r]');
                jzAddStroke(g, tint, lam * 0.32, 31.25); jzAddStroke(g, tint, lam * 0.22, 45.45); jzAddStroke(g, tint, lam * 0.14, 100);
            }
            var HM = jzShapeLayer(b, 'bg hexGrid cells', 0, 0), gm = jzGrp(HM, 'cells');
            lattice(gm, rr * 0.86); jzAddFill(gm, '#FFFFFF'); tileIt(gm);
            bg2_matte(RL, HM, TrackMatteType.ALPHA);
        }
    }
});

/* ---- triTess — 三角モザイク: triangle mosaic whose cells light up in 4 tones where a drifting noise field (+ a diagonal sweep) is high.
   AE: one group per triangle, its fill opacity (a tone of the brightest colour) from 2-D value noise computed in an expression */
jzReg('bg', 'triTess', {
    plan: function (rng, st) { return { seed: bg2_seed(rng), a: rng.range(0.1, 0.15), k: rng.range(0.07, 0.1), acc: rng.chance(0.35) }; },
    build: function (b, P) {
        var W = b.W, H = b.H, sc = b.sc, sd = P.seed || 1, U = jzU(b), a = U * (P.a || 0.12), h = a * Math.sqrt(3) / 2, k = P.k || 0.085, r, i, up;
        var cols = Math.ceil(W / a) + 2, rows = Math.ceil(H / h) + 1, top = P.acc ? 1.45 * 1.4 : 1.45, ms = [0.35, 0.65, 1];
        var ctop = P.acc ? jzTintC(sc, k * top) : jzLayC(sc, k * 1.45), lv = [];
        for (i = 0; i < 3; i++) lv.push(jzN(100 * ms[i] / top));
        var hd = bg2_hd(b) + BG2_VN + 'var e=oc(BT/0.8),sw=(wr(T*0.07,1.6)-0.3)*' + jzN(W + H) + ',ns=' + (sd % 997) + ';';
        var S = jzShapeLayer(b, 'bg triTess', 0, 0);
        for (r = 0; r < rows; r++) for (i = -1; i < cols - 1; i++) for (up = 0; up < 2; up++) {
            var y0 = r * h, y1 = y0 + h, x0 = i * a + (r & 1 ? a / 2 : 0) + (up ? a / 2 : 0);
            var tri = up ? [[x0, y1], [x0 + a, y1], [x0 + a / 2, y0]] : [[x0, y0], [x0 + a, y0], [x0 + a / 2, y1]];
            var gx = x0 + a / 2, gy = up ? y0 + h * 0.66 : y0 + h * 0.33, jr = (bg2_r(sd, r, i, up) - 0.5) * 0.12;
            var g = jzGrp(S, 't' + r + '_' + i + '_' + up);
            jzAddPath(g, tri, true);
            var f = jzAddFill(g, ctop);
            jzSetExpr(f.property('ADBE Vector Fill Opacity'), hd + 'var X=' + jzN(gx / U * 1.6) + '+T*0.12,Y=' + jzN(gy / U * 1.6) + '-T*0.07;' +
                'var v=(vn2(X+ns,Y)*0.5+vn2(X*2.03+17,Y*2.03+ns)*0.25)/0.75+0.35*Math.exp(-Math.pow((' + jzN(gx + gy) + '-sw)/' + jzN(U * 0.35) + ',2));' +
                'v=v*e+' + jzN(jr) + ';v>0.78?100:(v>0.62?' + lv[2] + ':(v>0.46?' + lv[1] + ':(v>0.3?' + lv[0] + ':0)))');
        }
    }
});

/* ---- moire — モアレ: two identical sets of fine concentric rings wandering around the centre -> drifting interference fringes */
jzReg('bg', 'moire', {
    plan: function (rng, st) { return { seed: bg2_seed(rng), gap: rng.range(0.016, 0.022), k: rng.range(0.08, 0.11), amp: rng.range(0.05, 0.09) }; },
    build: function (b, P) {
        var W = b.W, H = b.H, sc = b.sc, U = jzU(b), gap = U * (P.gap || 0.018), amp = U * (P.amp || 0.07), s = (P.seed || 1) % 17, q, r;
        var M = amp * 2.2, Rm = Math.sqrt((W + 2 * M) * (W + 2 * M) + (H + 2 * M) * (H + 2 * M)) / 2, col = jzLayC(sc, P.k || 0.1), hd = bg2_hd(b);
        var S = jzShapeLayer(b, 'bg moire', 0, 0);
        var cen = ['[' + jzN(W / 2) + '+' + jzN(amp) + '*Math.sin(T*0.33+' + s + '),' + jzN(H / 2) + '+' + jzN(amp * 0.7) + '*Math.cos(T*0.27+' + s + ')]',
            '[' + jzN(W / 2) + '-' + jzN(amp) + '*Math.sin(T*0.29+' + (s + 1) + '),' + jzN(H / 2) + '-' + jzN(amp * 0.7) + '*Math.cos(T*0.37+' + (s + 2) + ')]'];
        for (q = 0; q < 2; q++) {
            var g = jzGrp(S, 'rings ' + (q + 1));
            for (r = gap; r < Rm; r += gap) jzAddEllipse(g, 2 * r, 2 * r);
            jzAddStroke(g, col, gap * 0.42);
            jzSetExpr(jzGX(g).property('ADBE Vector Position'), hd + cen[q]);
        }
        jzSetExpr(jzXf(S, 'ADBE Opacity'), hd + '100*oc(BT/0.8)');
    }
});

/* ---- squareTunnel — 四角トンネル: nested, twisting squares (even-odd fill = alternating bands) flying towards the viewer.
   AE: one square + Repeater (scale r, rotation twist per copy) + even-odd Fill; the copy count toggles by one so the band parity stays put */
jzReg('bg', 'squareTunnel', {
    plan: function (rng, st) { return { seed: bg2_seed(rng), r: rng.range(1.22, 1.32), twist: rng.range(3, 7) * rng.pick([1, -1]), spd: rng.range(0.35, 0.6), k: rng.range(0.05, 0.07) }; },
    build: function (b, P) {
        var W = b.W, H = b.H, sc = b.sc, U = jzU(b), r = P.r || 1.26, lr = Math.log(r), S0 = U * 0.08, smin = U * 0.035, tw = P.twist || 5;
        var maxS = Math.sqrt(W * W + H * H) * 1.05, L0 = Math.log(smin / S0) / lr, K0 = Math.ceil(Math.log(maxS / smin) / lr) + 2;
        var hd = bg2_hd(b) + 'var z=T*' + jzN(P.spd || 0.45) + '+(1-oc(BT/0.5))*1.5,q=z-(' + jzN(L0) + '),nH=Math.floor(q),f=q-nH;';
        var S = jzShapeLayer(b, 'bg squareTunnel', W / 2, H / 2), g = jzGrp(S, 'squares');
        var rc = jzAddRect(g, smin * 2, smin * 2);
        jzSetExpr(rc.property('ADBE Vector Rect Size'), hd + 'var h=' + jzN(smin) + '*Math.pow(' + jzN(r) + ',f);[2*h,2*h]');
        var rp = bg2_rep(g, K0, 0, 0, 0), rt = rp.property('ADBE Vector Repeater Transform');
        rt.property('ADBE Vector Repeater Scale').setValue([100 * r, 100 * r]);
        rt.property('ADBE Vector Repeater Rotation').setValue(tw);
        jzSetExpr(rp.property('ADBE Vector Repeater Copies'), hd + K0 + '+((((nH+1-' + K0 + ')%2)+2)%2)');
        var fl = jzAddFill(g, jzLayC(sc, P.k || 0.06));
        fl.property('ADBE Vector Fill Rule').setValue(2);
        jzSetExpr(jzGX(g).property('ADBE Vector Rotation'), hd + '(f+(' + jzN(L0) + '))*' + jzN(tw) + '+T*4');
    }
});

/* ---- spiralArms — 渦巻き: 3-6 logarithmic spiral arms turning slowly, a soft disc of the background colour over the centre */
jzReg('bg', 'spiralArms', {
    plan: function (rng, st) { return { seed: bg2_seed(rng), n: rng.int(3, 6), b: rng.range(0.26, 0.38), spd: rng.range(0.14, 0.24) * rng.pick([1, -1]), k: rng.range(0.055, 0.075), cy: rng.pick([0.5, 0.5, 0.56]) }; },
    build: function (b, P) {
        var W = b.W, H = b.H, sc = b.sc, U = jzU(b), n = P.n || 4, bb = P.b || 0.32, spd = P.spd || 0.18, kk, i;
        var cx = W / 2, cy = H * (P.cy || 0.5), r0 = U * 0.09, Rm = Math.sqrt(W * W + H * H) * 0.62, thMax = Math.log(Rm / r0) / bb, w = Math.PI / n, steps = 110;
        var hd = bg2_hd(b) + 'var e=oc(BT/0.7);';
        var S = jzShapeLayer(b, 'bg spiralArms', cx, cy), g = jzGrp(S, 'arms');
        for (kk = 0; kk < n; kk++) {
            var base = kk * 2 * Math.PI / n, pts = [], th, rr;
            for (i = 0; i <= steps; i++) { th = thMax * i / steps; rr = r0 * Math.exp(bb * th); pts.push([Math.cos(base + th) * rr, Math.sin(base + th) * rr]); }
            for (i = steps; i >= 0; i--) { th = thMax * i / steps; rr = r0 * Math.exp(bb * th); pts.push([Math.cos(base + th + w) * rr, Math.sin(base + th + w) * rr]); }
            jzAddPath(g, pts, true);
        }
        jzAddFill(g, jzLayC(sc, P.k || 0.065));
        jzSetExpr(jzGX(g).property('ADBE Vector Rotation'), hd + '(T*' + jzN(spd) + '+(1-e)*' + jzN(spd < 0 ? -1.2 : 1.2) + ')*180/Math.PI');
        jzSetExpr(jzGX(g).property('ADBE Vector Scale'), hd + 'var f=100*(0.4+0.6*e);[f,f]');
        var D = U * 0.84, C = bg2_solid(b, sc.bg, 'bg spiralArms centre', D, D);
        bg2_cmask(C, D / 2, D / 2, U * 0.21, { f: [U * 0.42, U * 0.42] });
        jzXf(C, 'ADBE Position').setValue([cx, cy]);
        jzXf(C, 'ADBE Opacity').setValue(80);
    }
});

/* ---- topoLines — 等高線: contour lines of a slowly drifting terrain, levels creeping; every 4th line heavier.
   AE: Fractal Noise zoomed by a Transform effect (drift = its position) -> Posterize (terraces) -> Find Edges -> Threshold = white lines,
   used as luma matte for a colour solid; the heavy lines are a second chain with a quarter of the levels */
function bg2_topo(b, name, lv, bExpr, zoom, posExpr, thick) {
    var L = bg2_solid(b, '#808080', name, b.W, b.H), px = bg2_px(b);
    var fn = jzEffect(L, 'ADBE Fractal Noise', 'JZ Topo Field'); jzEP(fn, 2, 4); jzEP(fn, 4, 180); jzEX(fn, 5, bExpr);
    var tr = jzEffect(L, 'ADBE Geometry2', 'JZ Topo Zoom'); jzEP(tr, 3, 1); jzEP(tr, 4, zoom); jzEX(tr, 2, posExpr);
    var po = jzEffect(L, 'ADBE Posterize', 'JZ Topo Levels'); jzEP(po, 1, lv);
    var fe = jzEffect(L, 'ADBE Find Edges', 'JZ Topo Edges'); jzEP(fe, 1, 1);
    var th = jzEffect(L, 'ADBE Threshold2', 'JZ Topo Lines'); jzEP(th, 1, 10);
    if (thick) {
        var bx = jzEffect(L, 'ADBE Box Blur2', 'JZ Topo Thick'); jzEP(bx, 1, Math.max(1, 1.2 * px)); jzEP(bx, 2, 1); jzEP(bx, 4, 0);
        var t2 = jzEffect(L, 'ADBE Threshold2', 'JZ Topo Heavy'); jzEP(t2, 1, 50);
    }
    return L;
}
jzReg('bg', 'topoLines', {
    plan: function (rng, st) { return { seed: bg2_seed(rng), n: rng.int(10, 14), fs: rng.range(1.2, 1.7), k: rng.range(0.11, 0.15), acc: rng.chance(0.3) }; },
    build: function (b, P) {
        var W = b.W, H = b.H, sc = b.sc, U = jzU(b), sd = P.seed || 1, k = P.k || 0.13, m4 = Math.max(2, Math.round((P.n || 12) / 4)), Lv = 4 * m4 + 1;
        var zoom = 100 * U / ((P.fs || 1.4) * 150), hd = bg2_hd(b);
        var z = hd + 'var z=T*0.06+(1-oc(BT/0.9))*2,c=wr(z,4)-2;';
        var pos = hd + '[' + jzN(W / 2 + (bg2_r(sd, 1) - 0.5) * W * 1.2) + '-BT*' + jzN(U * 0.025) + ',' + jzN(H / 2 + (bg2_r(sd, 2) - 0.5) * H * 1.2) + '+BT*' + jzN(U * 0.018) + ']';
        var fade = hd + '100*oc(BT/0.9)', i;
        var chains = [[Lv, z + '100*c/' + (Lv - 1), false, jzLayC(sc, k)], [m4 + 1, z + '100*(c+0.5)/' + (Lv - 1), true, P.acc ? jzTintC(sc, k * 2.2) : jzLayC(sc, k * 1.6)]];
        for (i = 0; i < 2; i++) {
            var C = bg2_solid(b, chains[i][3], 'bg topoLines ' + (i ? 'major' : 'lines'), W, H);
            jzSetExpr(jzXf(C, 'ADBE Opacity'), fade);
            var Mt = bg2_topo(b, 'bg topoLines ' + (i ? 'major' : 'lines') + ' matte', chains[i][0], chains[i][1], zoom, pos, chains[i][2]);
            bg2_matte(C, Mt, TrackMatteType.LUMA);
        }
    }
});

/* ---- ridgePlot — 稜線グラフ: stacked ridge lines (Joy Division), each hiding the ones behind it, peaks rolling sideways.
   AE: the ridge outlines are baked as path keyframes (5 per second, denser while they grow in), front ridge in the top group */
jzReg('bg', 'ridgePlot', {
    plan: function (rng, st) { return { seed: bg2_seed(rng), n: rng.int(18, 26), k: rng.range(0.15, 0.2), amp: rng.range(0.07, 0.1), mode: rng.pick(['center', 'center', 'wide']), spd: rng.range(0.18, 0.3) }; },
    build: function (b, P) {
        var W = b.W, H = b.H, sc = b.sc, sd = P.seed || 1, U = jzU(b), px = bg2_px(b), n = P.n || 22, spd = P.spd || 0.24, i, j, q;
        var x0 = W * 0.06, x1 = W * 0.94, y0 = H * 0.2, y1 = H * 0.94, gap = (y1 - y0) / (n - 1), m = jzClamp(Math.round((x1 - x0) / (U * 0.018)), 50, 100);
        var amp = H * (P.amp || 0.085) * (W < H ? 0.6 : 1), tx = b.st && b.st.texture, paper = sc.paper || (tx && tx.paper > 0.5);
        var t0 = b.cut.start || 0, run = bg2_run(b), dur = b.comp.duration, ts = [], t;
        for (t = 0; t < 1.2 && t < dur; t += 0.1) ts.push(t);
        var step = Math.max(0.2, dur / 80);
        for (t = 1.2; t < dur; t += step) ts.push(t);
        ts.push(dur);
        var envs = [], xs = [];
        for (j = 0; j <= m; j++) {
            var u = j / m;
            xs.push(x0 + (x1 - x0) * u);
            envs.push(P.mode === 'wide' ? 0.3 + 0.7 * Math.pow(Math.sin(Math.PI * u), 2) : 0.08 + 0.92 * Math.exp(-Math.pow((u - 0.5) / 0.16, 2)));
        }
        var S = jzShapeLayer(b, 'bg ridgePlot', 0, 0), lw = Math.max(px, U * 0.0022), lc = jzLayC(sc, P.k || 0.17);
        for (i = n - 1; i >= 0; i--) {       // front (lowest) ridge = first group = on top
            var base = y0 + i * gap, g = jzGrp(S, 'ridge ' + (i + 1)), jit = [], closedV = [], openV = [];
            for (j = 0; j <= m; j++) jit.push(H * 0.002 * bg2_noise1(j / m * 40 + i, sd));
            for (q = 0; q < ts.length; q++) {
                var T = t0 + ts[q], e = bg2_oc((run + ts[q]) / 1), grow = bg2_oc(e * 1.6 - i / n * 0.6), pts = [];
                for (j = 0; j <= m; j++) {
                    var v = Math.pow(0.5 + 0.5 * bg2_fbm1(j / m * 7 + T * spd + i * 0.41, sd + i * 7, 3), 2.4);
                    pts.push([xs[j], base - amp * envs[j] * v * 2.2 * grow - jit[j]]);
                }
                var so = new Shape(); so.vertices = pts; so.closed = false; openV.push(so);
                var sf = new Shape(); sf.vertices = [[x0, base + px]].concat(pts, [[x1, base + px]]); sf.closed = true; closedV.push(sf);
            }
            // (each path gets its keyframes before the stroke / fill / next group is added: adding invalidates `pL` / `pF` in AE)
            var gL = bg2_sub(g, 'line'), pL = jzAddPath(gL, openV[0].vertices, false);
            pL.property('ADBE Vector Shape').setValuesAtTimes(ts, openV);
            bg2_round(jzAddStroke(gL, lc, lw));
            var gF = bg2_sub(g, 'fill'), pF = jzAddPath(gF, closedV[0].vertices, true);
            pF.property('ADBE Vector Shape').setValuesAtTimes(ts, closedV);
            jzAddFill(gF, sc.bg, paper ? 72 : 90);
        }
    }
});

/* ================================================================ SCENE */

/* ---- starfield — 星空: three parallax layers of stars drifting one way and twinkling (big ones with a cross flare), a shooting star now and then.
   AE: per layer one tile (1.1W x 1.1H) of static stars in 5 twinkle groups, slid by a wrapped offset and repeated 2x2 */
jzReg('bg', 'starfield', {
    plan: function (rng, st) { return { seed: bg2_seed(rng), ang: rng.range(-0.3, 0.3) + (rng.chance(0.5) ? Math.PI : 0), spd: rng.range(0.8, 1.3), shoot: rng.chance(0.75) }; },
    build: function (b, P) {
        var W = b.W, H = b.H, sc = b.sc, sd = P.seed || 1, U = jzU(b), px = bg2_px(b), dk = bg2_dark(sc), l, i, q, m;
        var col = dk ? jzMixHex(sc.bg, sc.fg, 0.92) : (jzLum(sc.bg) < 0.78 ? '#FFFFFF' : jzLayC(sc, 0.5));
        var area = Math.sqrt(W * H) / px / Math.sqrt(1920 * 1080), vx = Math.cos(P.ang || 0), vy = Math.sin(P.ang || 0), spd = P.spd || 1;
        var Wt = W * 1.1, Ht = H * 1.1, NB = 5, am = dk ? 1 : 0.65, hd = bg2_hd(b) + 'var e=oc(BT/0.9);';
        var layers = [[90, 0.0013, 0.006, 0.45], [46, 0.002, 0.018, 0.65], [18, 0.0032, 0.045, 0.85]];
        var S = jzShapeLayer(b, 'bg starfield', 0, 0);
        if (P.shoot) {     // shooting star: every 3.4 s window (85 %), a delayed 0.75 s streak (baked per window)
            var per = 3.4, tc = b.cut.start || 0, m0 = Math.floor(tc / per) - 1, m1 = Math.floor((tc + b.comp.duration) / per) + 1, A = [];
            for (m = m0; m <= m1; m++) {
                var ang = bg2_rr(20, 38, sd, m, 3) * Math.PI / 180 * (bg2_r(sd, m, 4) < 0.5 ? 1 : -1);
                A.push('[' + [jzN(W * bg2_rr(0.15, 0.7, sd, m, 1)), jzN(H * bg2_rr(0.05, 0.35, sd, m, 2)), jzN(Math.cos(ang) * (ang < 0 ? -1 : 1)), jzN(Math.abs(Math.sin(ang))), jzN(bg2_r(sd, m, 8) * 1.5), bg2_r(sd, m, 9) < 0.85 ? 1 : 0].join(',') + ']');
            }
            var mh = hd + 'var MS=[' + A.join(',') + '],id=Math.floor(T/' + per + '),A=MS[Math.max(0,Math.min(' + (A.length - 1) + ',id-(' + m0 + ')))],age=T-id*' + per + '-A[4],q=cl(age/0.75),on=A[5]>0&&age>0&&age<0.75,oq=1-(1-q)*(1-q);';
            var gm = jzGrp(S, 'shooting star'), mw = Math.max(px, U * 0.002) * 1.4, TL = U * 0.16;
            var g1 = bg2_sub(gm, 'head'); jzAddPath(g1, [[0, -mw / 2], [0, mw / 2], [-TL * 0.45, 0]], true); jzAddEllipse(g1, mw, mw); jzAddFill(g1, col, 45);
            var g2 = bg2_sub(gm, 'tail'); jzAddPath(g2, [[0, -mw / 2], [0, mw / 2], [-TL, 0]], true); jzAddFill(g2, col, 55);
            jzSetExpr(jzGX(gm).property('ADBE Vector Position'), mh + '[A[0]+A[2]*' + jzN(U * 0.55) + '*oq,A[1]+A[3]*' + jzN(U * 0.55) + '*oq]');
            jzSetExpr(jzGX(gm).property('ADBE Vector Rotation'), mh + 'Math.atan2(A[3],A[2])*180/Math.PI');
            jzSetExpr(jzGX(gm).property('ADBE Vector Scale'), mh + '[on?100*Math.max(0.01,Math.sin(Math.PI*q)):0,100]');
            jzSetExpr(jzGX(gm).property('ADBE Vector Group Opacity'), mh + 'on?Math.min(100,145*e*(1-q*0.6)):0');
        }
        for (l = 2; l >= 0; l--) {       // near (big, fast) layer on top
            var cnt = Math.round(layers[l][0] * area), v = U * layers[l][2] * spd, aB = layers[l][3], g = jzGrp(S, 'stars ' + (l + 1)), stars = [];
            for (i = 0; i < cnt; i++) stars.push([bg2_r(sd, l, i, 1) * Wt, bg2_r(sd, l, i, 2) * Ht, U * layers[l][1] * (0.6 + 0.8 * bg2_r(sd, l, i, 3))]);
            // every sub-group is filled completely before the next one is added (adding a group invalidates the held siblings in AE)
            if (l === 2) {
                var fl = bg2_sub(g, 'flares');
                for (i = 0; i < cnt; i++) if (bg2_r(sd, l, i, 5) < 0.5) { var L5 = stars[i][2] * 5.5, thn = Math.max(0.6 * px, stars[i][2] * 0.25); jzAddRect(fl, 2 * L5, thn, 0, stars[i][0], stars[i][1]); jzAddRect(fl, thn, 2 * L5, 0, stars[i][0], stars[i][1]); }
                var ff = jzAddFill(fl, col); jzSetExpr(ff.property('ADBE Vector Fill Opacity'), hd + jzN(50 * aB * am) + '*e*(0.45+0.55*(0.5+0.5*Math.sin(T*1.7+2)))');
            }
            for (q = 0; q < NB; q++) {
                var gq = bg2_sub(g, 'twinkle ' + (q + 1));
                for (i = q; i < cnt; i += NB) {
                    var x = stars[i][0], y = stars[i][1], r = stars[i][2];
                    if (l < 2) jzAddRect(gq, 2 * r, 2 * r, 0, x, y);
                    else jzAddEllipse(gq, 2 * r, 2 * r, x, y);
                }
                var f = jzAddFill(gq, col);
                jzSetExpr(f.property('ADBE Vector Fill Opacity'), hd + jzN(100 * aB * am) + '*e*(0.45+0.55*(0.5+0.5*Math.sin(T*' + jzN(1.1 + 2.6 * (q + 0.5) / NB) + '+' + jzN(q * 1.7 + l) + ')))');
            }
            bg2_rep(g, 2, Wt, 0, 0); bg2_rep(g, 2, 0, Ht, 0);
            jzSetExpr(jzGX(g).property('ADBE Vector Position'), hd + '[wr(T*' + jzN(v * vx) + ',' + jzN(Wt) + ')-' + jzN(Wt + W * 0.05) + ',wr(T*' + jzN(v * vy) + ',' + jzN(Ht) + ')-' + jzN(Ht + H * 0.05) + ']');
        }
    }
});
