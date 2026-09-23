// ================================================================ background graphics part 3 (AE port of scenes / textures in src/11p_bgcamB.js)
// bg.build(b, P): b.comp is the cut's WRAPPER comp (full frame, time 0 = cut start, duration = cut + 1 s). Layers added here sit
// above the scheme colour / paper and below the lyric. Low contrast; everything animated with expressions on `time`.

// ================================================================ shared helpers of this pack (prefix bg3_)
var BG3_TAU = Math.PI * 2;
// the browser's deterministic hash J.h / J.r / J.rs / J.rr and smooth 1D noise J.noise1 (so baked shapes match the web frame)
function bg3_h(a, b, c, d, e) {
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
function bg3_r(a, b, c, d, e) { return bg3_h(a, b, c, d, e) / 4294967296; }
function bg3_rs(a, b, c, d, e) { return bg3_r(a, b, c, d, e) * 2 - 1; }
function bg3_rr(lo, hi, a, b, c, d, e) { return lo + (hi - lo) * bg3_r(a, b, c, d, e); }
function bg3_n1(x, s) { var i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f), a = bg3_rs(s, i); return a + (bg3_rs(s, i + 1) - a) * u; }
function bg3_sgn(x) { return x > 0 ? 1 : (x < 0 ? -1 : 0); }
// seconds this background had already been running at the cut start (browser bgT: consecutive cuts with the same bg + seed are one run)
function bg3_run(b) {
    var c = b.cut, cs = (b.plan && b.plan.cuts) || [], s = c.start || 0, P0 = c.bgP || {}, idx = -1, i;
    for (i = 0; i < cs.length; i++) if (cs[i] === c) { idx = i; break; }
    for (i = idx - 1; i >= 0; i--) {
        var p = cs[i];
        if (p.bg === c.bg && (p.bgP || {}).seed === P0.seed && Math.abs(p.end - s) < 0.06) s = p.start; else break;
    }
    return (c.start || 0) - s;
}
// expression helpers: cl oc oe oq iq wr, hs(i, s) hash -1..1, n1(x, s) smooth noise -1..1 (stand-in for J.noise1)
var BG3_FNS = 'function cl(x){return Math.max(0,Math.min(1,x));}function oc(x){x=cl(x);return 1-Math.pow(1-x,3);}function oe(x){x=cl(x);return x>=1?1:1-Math.pow(2,-10*x);}' +
    'function oq(x){x=cl(x);return 1-(1-x)*(1-x);}function iq(x){x=cl(x);return x*x;}function wr(v,m){return ((v%m)+m)%m;}' +
    'function hs(i,s){var x=Math.sin(i*127.1+s*311.7)*43758.5453;return 2*(x-Math.floor(x))-1;}function n1(x,s){var i=Math.floor(x),f=x-i,u=f*f*(3-2*f),a=hs(i,s);return a+(hs(i+1,s)-a)*u;}';
// header: T = absolute song time (browser env.t), BT = time since this background started (browser bgT)
function bg3_hd(b) { return BG3_FNS + 'var T=time+' + jzN(b.cut.start || 0) + ',BT=time+' + jzN(bg3_run(b)) + ';\n'; }
function bg3_px(b) { return jzU(b) / 1080; }                                   // one browser design px in comp px
function bg3_area(b) { var p = bg3_px(b); return Math.sqrt(b.W * b.H / (p * p) / (1920 * 1080)); }
function bg3_seed(rng) { return rng.int(1, 999999999); }
function bg3_dark(sc) { return jzLum(sc.bg) < 0.45; }
function bg3_glow(sc) { var L = jzLum(sc.bg), c = [sc.accent, sc.accent2, sc.ghostA, sc.ghostB, sc.fg], i; for (i = 0; i < c.length; i++) if (c[i] && jzLum(c[i]) > L + 0.25) return c[i]; return sc.fg; }
function bg3_lightOn(sc) { return bg3_dark(sc) ? bg3_glow(sc) : (jzLum(sc.bg) < 0.78 ? '#FFFFFF' : jzMixHex(sc.accent, '#FFFFFF', 0.2)); }
function bg3_hues(sc) {
    var c = [sc.accent, sc.accent2, sc.ghostA, sc.ghostB, sc.fg], out = [], seen = {}, i;
    for (i = 0; i < c.length; i++) {
        if (!c[i] || jzContrast(c[i], sc.bg) < 1.25) continue;
        var kk = String(c[i]).toLowerCase(); if (seen[kk]) continue;
        seen[kk] = 1; out.push(c[i]);
    }
    return out.length ? out : [sc.fg];
}
function bg3_col(hex) { var c = jzHex(hex); return '[' + jzN(c[0]) + ',' + jzN(c[1]) + ',' + jzN(c[2]) + ',1]'; }
function bg3_solid(b, hex, name, w, h) { return b.comp.layers.addSolid(jzHex(hex), name, Math.max(4, Math.round(w)), Math.max(4, Math.round(h)), 1, b.comp.duration); }
// rectangle / circle masks in layer space; o: { f: [fx, fy] feather, mode: MaskMode.*, inv: true }
function bg3_mask(L, x0, y0, x1, y1, o) {
    o = o || {};
    var m = L.property('ADBE Mask Parade').addProperty('ADBE Mask Atom'), sh = new Shape();
    sh.vertices = [[x1, y0], [x1, y1], [x0, y1], [x0, y0]]; sh.closed = true;
    m.property('ADBE Mask Shape').setValue(sh);
    if (o.f) m.property('ADBE Mask Feather').setValue(o.f);
    if (o.mode) m.maskMode = o.mode;
    if (o.inv) m.inverted = true;
    return m;
}
function bg3_cmask(L, cx, cy, r, o) {
    o = o || {};
    var m = L.property('ADBE Mask Parade').addProperty('ADBE Mask Atom');
    m.property('ADBE Mask Shape').setValue(jzCircleShape(cx, cy, r));
    if (o.f) m.property('ADBE Mask Feather').setValue(o.f);
    if (o.mode) m.maskMode = o.mode;
    if (o.inv) m.inverted = true;
    return m;
}
// shape Repeater (copies n, offset off, step [dx, dy]) at the end of group g
function bg3_rep(g, n, dx, dy, off) {
    var V = jzVecs(g), ix = V.addProperty('ADBE Vector Filter - Repeater').propertyIndex;
    V.property(ix).property('ADBE Vector Repeater Copies').setValue(n);
    if (off) V.property(ix).property('ADBE Vector Repeater Offset').setValue(off);
    V.property(ix).property('ADBE Vector Repeater Transform').property('ADBE Vector Repeater Position').setValue([dx, dy]);
    return V.property(ix);
}
function bg3_sub(g, name) { var c = jzVecs(g).addProperty('ADBE Vector Group'); if (name) c.name = name; return c; }
// capsule (rounded ends) with its top-left at (x, y) — the browser's cap()
function bg3_cap(g, x, y, w, h) { return jzAddRect(g, w, h, h / 2, x + w / 2, y + h / 2); }
// path with optional Catmull-Rom tangents (smooth curves through the points)
function bg3_path(g, pts, closed, smooth) {
    var p = jzVecs(g).addProperty('ADBE Vector Shape - Group'), sh = new Shape(), n = pts.length, ins = [], outs = [], i;
    sh.vertices = pts; sh.closed = !!closed;
    if (smooth && n > 2) {
        for (i = 0; i < n; i++) {
            var a = pts[i > 0 ? i - 1 : (closed ? n - 1 : 0)], c = pts[i < n - 1 ? i + 1 : (closed ? 0 : n - 1)];
            var tx = (c[0] - a[0]) / 6, ty = (c[1] - a[1]) / 6;
            ins.push([-tx, -ty]); outs.push([tx, ty]);
        }
        sh.inTangents = ins; sh.outTangents = outs;
    }
    p.property('ADBE Vector Shape').setValue(sh);
    return p;
}
function bg3_roundJoin(st) { try { st.property('ADBE Vector Stroke Line Join').setValue(2); st.property('ADBE Vector Stroke Line Cap').setValue(2); } catch (e) {} return st; }
// VHS speckle strip: grey solid -> Noise (new grain every frame) -> Mosaic cells (cw x ch px, none when cw = 0) -> Threshold -> Tint; screen (dark) / multiply (light)
function bg3_vhsNoise(b, col, dk, name, w, h, cw, ch, th) {
    var L = bg3_solid(b, '#808080', name, w, h);
    var nz = jzEffect(L, 'ADBE Noise', 'JZ Grain'); jzEP(nz, 1, 100); jzEP(nz, 2, 0); jzEP(nz, 3, 1);
    if (cw) { var mo = jzEffect(L, 'ADBE Mosaic', 'JZ Cells'); jzEP(mo, 1, Math.max(1, Math.round(w / cw))); jzEP(mo, 2, Math.max(1, Math.round(h / ch))); jzEP(mo, 3, 1); }
    var tr = jzEffect(L, 'ADBE Threshold2', 'JZ Speckle'); jzEP(tr, 1, th || 200);
    var tn = jzEffect(L, 'ADBE Tint', 'JZ Tone'); jzEP(tn, 1, dk ? [0, 0, 0] : [1, 1, 1]); jzEP(tn, 2, jzHex(col)); jzEP(tn, 3, 100);
    L.blendingMode = dk ? BlendingMode.SCREEN : BlendingMode.MULTIPLY;
    return L;
}
// the browser's 2D value noise / fbm (hash2 -> noise2 -> fbm2); lattice hashes cached in C per build
function bg3_hash2(x, y, s) {
    var h = (jzImul(x | 0, 374761393) + jzImul(y | 0, 668265263) + jzImul(s | 0, 144665)) | 0;
    h = jzImul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296;
}
function bg3_hc(C, x, y, s) { var key = x + ',' + y + ',' + s, v = C[key]; if (v === undefined) { v = bg3_hash2(x, y, s); C[key] = v; } return v; }
function bg3_nz2(C, x, y, s) {
    var ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
    var a = bg3_hc(C, ix, iy, s), b = bg3_hc(C, ix + 1, iy, s), c = bg3_hc(C, ix, iy + 1, s), d = bg3_hc(C, ix + 1, iy + 1, s);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function bg3_fbm2(C, x, y, s, oct) { var v = 0, a = 0.5, f = 1, n = 0, i; for (i = 0; i < oct; i++) { v += bg3_nz2(C, x * f, y * f, s + i * 101) * a; n += a; a *= 0.5; f *= 2.03; } return v / n; }
// iso-line of a sampled field F ((G+1) x (G+1), row-major) at level lv -> [{ pts (grid units), closed }] (marching squares + chaining)
function bg3_iso(F, G, lv) {
    var adj = {}, pos = {}, used = {}, out = [], keys = [], i, j, z, pass, id, R = G + 1;
    var link = function (p, q) { (adj[p] = adj[p] || []).push(q); (adj[q] = adj[q] || []).push(p); };
    var pH = function (i, j) { var id = 'h' + i + '_' + j; if (!pos[id]) { var f0 = F[j * R + i], f1 = F[j * R + i + 1]; pos[id] = [i + (lv - f0) / (f1 - f0), j]; } return id; };
    var pV = function (i, j) { var id = 'v' + i + '_' + j; if (!pos[id]) { var f0 = F[j * R + i], f1 = F[(j + 1) * R + i]; pos[id] = [i, j + (lv - f0) / (f1 - f0)]; } return id; };
    for (j = 0; j < G; j++) for (i = 0; i < G; i++) {
        var a = F[j * R + i] > lv, b = F[j * R + i + 1] > lv, c = F[(j + 1) * R + i + 1] > lv, d = F[(j + 1) * R + i] > lv;
        var cs = (a ? 8 : 0) + (b ? 4 : 0) + (c ? 2 : 0) + (d ? 1 : 0);
        if (cs === 0 || cs === 15) continue;
        var e = [];               // crossed edges in order top, right, bottom, left
        if (a !== b) e.push(pH(i, j));
        if (b !== c) e.push(pV(i + 1, j));
        if (d !== c) e.push(pH(i, j + 1));
        if (a !== d) e.push(pV(i, j));
        if (e.length === 2) link(e[0], e[1]);
        else if (e.length === 4) {
            var cv = (F[j * R + i] + F[j * R + i + 1] + F[(j + 1) * R + i + 1] + F[(j + 1) * R + i]) / 4 > lv;
            if ((cs === 10 && cv) || (cs === 5 && !cv)) { link(e[0], e[1]); link(e[2], e[3]); } else { link(e[3], e[0]); link(e[1], e[2]); }
        }
    }
    for (id in adj) if (adj.hasOwnProperty(id)) keys.push(id);
    for (pass = 0; pass < 2; pass++) for (z = 0; z < keys.length; z++) {
        id = keys[z];
        if (used[id] || (pass === 0 && adj[id].length !== 1)) continue;
        var chain = [], cur = id, prev = null;
        while (cur && !used[cur]) {
            used[cur] = 1; chain.push(pos[cur]);
            var nx = null, nb = adj[cur], q;
            for (q = 0; q < nb.length; q++) if (nb[q] !== prev && !used[nb[q]]) { nx = nb[q]; break; }
            prev = cur; cur = nx;
        }
        if (chain.length >= 3) out.push({ pts: chain, closed: pass === 1 });
    }
    return out;
}

/* ---- nightMoon — 月夜: moon (full with craters, or crescent) with a soft halo, sparse twinkling stars, thin cloud streaks drifting across */
jzReg('bg', 'nightMoon', {
    plan: function (rng, st) { return { seed: bg3_seed(rng), side: rng.pick([1, -1]), R: rng.range(0.11, 0.15), phase: rng.pick(['full', 'crescent', 'crescent']), k: rng.range(0.18, 0.26) }; },
    build: function (b, P) {
        var W = b.W, H = b.H, sc = b.sc, sd = P.seed || 1, U = jzU(b), dk = bg3_dark(sc), side = (P.side || 1) > 0 ? 1 : -1, port = H > W, i;
        var R = U * (P.R || 0.13), mx = W * (0.5 + side * (port ? 0.2 : 0.3)), my = H * (port ? 0.2 : 0.27), gl = bg3_glow(sc);
        var moonC = dk ? jzMixHex(sc.bg, gl === sc.fg ? sc.fg : jzMixHex(sc.fg, gl, 0.3), P.k || 0.22) : jzMixHex(sc.bg, '#FFFFFF', 0.55);
        var haloC = dk ? moonC : jzMixHex(sc.bg, '#FFFFFF', 0.7);
        var hd = bg3_hd(b) + 'var e=oc(BT/1.2),my=' + jzN(my) + '+(1-e)*' + jzN(H * 0.06) + ';';
        // stars (upper 62 %, none near the moon)
        var nS = Math.round(28 * bg3_area(b)), S = jzShapeLayer(b, 'bg nightMoon stars', 0, 0), stc = dk ? jzLayC(sc, 0.55) : jzLayC(sc, 0.2);
        for (i = 0; i < nS; i++) {
            var x = bg3_r(sd, i, 1) * W, y = bg3_r(sd, i, 2) * H * 0.62, r = U * bg3_rr(0.001, 0.0024, sd, i, 3);
            if (Math.sqrt((x - mx) * (x - mx) + (y - my) * (y - my)) < R * 2.2) continue;
            var g = jzGrp(S, 'star ' + (i + 1)); jzAddRect(g, r * 2, r * 2, 0, x, y); jzAddFill(g, stc);
            jzSetExpr(jzGX(g).property('ADBE Vector Group Opacity'), hd + '100*e*(0.2+0.4*(0.5+0.5*Math.sin(T*' + jzN(bg3_rr(0.8, 2.4, sd, i, 4)) + '+' + i + ')))');
        }
        // halo: a steep inner glow + a long faint tail (two feathered circles), breathing
        var HL = bg3_solid(b, haloC, 'bg nightMoon halo', R * 7, R * 7), hc = R * 3.5;
        bg3_cmask(HL, hc, hc, R * 1.2, { f: [R, R] });
        var m2 = bg3_cmask(HL, hc, hc, R * 2.1, { f: [R * 2.6, R * 2.6] }); m2.property('ADBE Mask Opacity').setValue(30);
        jzSetExpr(jzXf(HL, 'ADBE Position'), hd + '[' + jzN(mx) + ',my]');
        jzSetExpr(jzXf(HL, 'ADBE Opacity'), hd + jzN(dk ? 35 : 50) + '*e*(0.9+0.1*Math.sin(T*0.7))');
        // the moon: disc (+ craters) or a crescent cut by a subtracted circle
        var M = jzShapeLayer(b, 'bg nightMoon moon', mx, my);
        if (P.phase !== 'crescent') {
            var gc = jzGrp(M, 'craters');
            for (i = 0; i < 6; i++) { var a = bg3_r(sd, i, 11) * BG3_TAU, d = R * Math.sqrt(bg3_r(sd, i, 12)) * 0.7, cr = R * bg3_rr(0.08, 0.2, sd, i, 13); jzAddEllipse(gc, cr * 2, cr * 2, Math.cos(a) * d, Math.sin(a) * d); }
            jzAddFill(gc, jzMixHex(moonC, sc.bg, 0.22));
        }
        var gd = jzGrp(M, 'disc'); jzAddEllipse(gd, R * 2, R * 2); jzAddFill(gd, moonC);
        if (P.phase === 'crescent') bg3_cmask(M, side * R * 0.42, -R * 0.22, R * 0.9, { mode: MaskMode.SUBTRACT });
        jzSetExpr(jzXf(M, 'ADBE Position'), hd + '[' + jzN(mx) + ',my]');
        jzSetExpr(jzXf(M, 'ADBE Opacity'), hd + '100*e');
        // thin cloud streaks (3 capsules each) drifting across the moon
        var C = jzShapeLayer(b, 'bg nightMoon clouds', 0, 0), cc = dk ? jzLayC(sc, 0.07) : jzLayC(sc, 0.05);
        for (i = 0; i < 3; i++) {
            var w = U * bg3_rr(0.4, 0.7, sd, i, 21), h = U * bg3_rr(0.02, 0.03, sd, i, 22), L = W + w * 2, gs = jzGrp(C, 'streak ' + (i + 1));
            bg3_cap(gs, 0, 0, w, h); bg3_cap(gs, w * bg3_rr(0.15, 0.4, sd, i, 26), -h * 0.75, w * 0.45, h * 0.9); bg3_cap(gs, w * bg3_rr(0.35, 0.6, sd, i, 27), h * 0.7, w * 0.5, h * 0.8);
            jzAddFill(gs, cc);
            jzSetExpr(jzGX(gs).property('ADBE Vector Position'), hd + '[wr(' + jzN((i + bg3_r(sd, i, 23) * 0.5) / 3 * L) + '+T*' + jzN(U * bg3_rr(0.025, 0.045, sd, i, 24)) + ',' + jzN(L) + ')-' + jzN(w) +
                ',my+' + jzN(R * (i - 1) * 0.8 + R * bg3_rr(-0.2, 0.3, sd, i, 25)) + ']');
        }
        jzSetExpr(jzXf(C, 'ADBE Opacity'), hd + '70*e');
    }
});

/* ---- skyline — 街並み: two rows of building silhouettes scrolling at different speeds (parallax) with lit windows, horizon glow; rises in.
   AE: only the buildings this cut can show are baked (windows as lit at the cut's middle), the city groups slide with an expression */
jzReg('bg', 'skyline', {
    plan: function (rng, st) { return { seed: bg3_seed(rng), k: rng.range(0.08, 0.11), dir: rng.pick([1, -1]), win: rng.range(0.22, 0.34) }; },
    build: function (b, P) {
        var W = b.W, H = b.H, sc = b.sc, sd = P.seed || 1, U = jzU(b), px = bg3_px(b), dk = bg3_dark(sc), k = P.k || 0.09, dir = P.dir || 1, l;
        var Lp = Math.max(W, H) * 1.5, T0 = b.cut.start || 0, T1 = T0 + b.comp.duration, Tm = (T0 + T1) / 2;
        var hd = bg3_hd(b) + 'var e=oc(BT/0.9);';
        // horizon glow behind the city (0 at mid height -> faint at the bottom)
        var G = bg3_solid(b, dk ? bg3_glow(sc) : sc.accent, 'bg skyline glow', W, H);
        bg3_mask(G, -W, H * 0.75, W * 2, H * 3, { f: [0, H * 0.5] });
        jzSetExpr(jzXf(G, 'ADBE Opacity'), hd + jzN(dk ? 10 : 8) + '*e');
        var winLit = dk ? jzMixHex(sc.bg, bg3_glow(sc), 0.4) : jzMixHex(jzLayC(sc, k * 1.1), '#FFFFFF', 0.55);
        var LY = [[0.6, 0.12, 0.34, 0.012], [1.1, 0.06, 0.2, 0.03]], cw = U * 0.022, ch = U * 0.03;
        for (l = 0; l < 2; l++) {
            var km = LY[l][0], h0 = LY[l][1], h1 = LY[l][2], sp = U * LY[l][3] * dir, O0 = T0 * sp, oMin = Math.min(T0 * sp, T1 * sp), oMax = Math.max(T0 * sp, T1 * sp);
            var S = jzShapeLayer(b, 'bg skyline ' + (l ? 'front' : 'back'), 0, 0), gC = jzGrp(S, 'city'), gw = bg3_sub(gC, 'windows'), gb = bg3_sub(gC, 'buildings');
            var x = 0, bi = 0;
            while (x < Lp && bi < 80) {
                var w = U * bg3_rr(0.05, 0.12, sd, l, bi, 1), gapW = U * bg3_rr(0, 0.012, sd, l, bi, 2);
                var h = H * bg3_rr(h0, h1, sd, l, bi, 3) * (W < H ? 0.75 : 1), tier = bg3_r(sd, l, bi, 4) < 0.35, ant = bg3_r(sd, l, bi, 5) < 0.25;
                var k0 = Math.floor((oMin - x - w) / Lp), k1 = Math.ceil((oMax + W - x) / Lp), kk;
                for (kk = k0; kk <= k1; kk++) {
                    // screen x of this copy = x + kk*Lp - t*sp; skip copies that never reach the frame during the cut
                    if (x + kk * Lp - oMax > W || x + kk * Lp - oMin + w < 0) continue;
                    var X0 = x + kk * Lp - O0, top = H - h;
                    jzAddRect(gb, w, h + 2 * px, 0, X0 + w / 2, top + h / 2 + px);
                    if (tier) jzAddRect(gb, w * 0.6, h * 0.12 + px, 0, X0 + w * 0.5, top - h * 0.06 + px / 2);
                    if (ant) { var aw = Math.max(1.5 * px, U * 0.002); jzAddRect(gb, aw, h * 0.2, 0, X0 + w * 0.5 - px + aw / 2, top - h * (tier ? 0.32 : 0.2) + h * 0.1); }
                    var nx = Math.floor((w - cw * 0.4) / cw), ny = Math.floor((h - ch) / ch), wx, wy;
                    for (wy = 0; wy < ny && wy < 30; wy++) for (wx = 0; wx < nx; wx++) {
                        var ph = Math.floor(Tm * 0.25 + bg3_r(sd, l, bi, wx, wy) * 7);
                        if (bg3_r(sd + ph, l * 97 + bi, wx, wy) > (P.win || 0.28)) continue;
                        jzAddRect(gw, cw * 0.4, ch * 0.45, 0, X0 + (w - nx * cw) / 2 + wx * cw + cw * 0.5, top + ch * 0.7 + wy * ch + ch * 0.225);
                    }
                }
                x += w + gapW; bi++;
            }
            jzAddFill(gw, winLit, l ? 80 : 50);
            jzAddFill(gb, jzLayC(sc, k * km));
            jzSetExpr(jzGX(gC).property('ADBE Vector Position'), hd + '[' + jzN(O0) + '-T*' + jzN(sp) + ',0]');
            jzSetExpr(jzXf(S, 'ADBE Position'), hd + '[0,(1-e)*' + jzN(H * 0.25) + ']');
        }
    }
});

/* ---- sunsetSun — 夕日: sun sinking slowly behind the horizon (halo, sky glow), shimmering reflection strokes on the water, faint swell lines.
   AE: sun disc + halo = one solid with two masks, clipped at the horizon by a track matte */
jzReg('bg', 'sunsetSun', {
    plan: function (rng, st) { return { seed: bg3_seed(rng), hz: rng.range(0.7, 0.76), R: rng.range(0.12, 0.16), cx: rng.pick([rng.range(0.22, 0.34), rng.range(0.66, 0.78)]), k: rng.range(0.28, 0.36) }; },
    build: function (b, P) {
        var W = b.W, H = b.H, sc = b.sc, sd = P.seed || 1, U = jzU(b), px = bg3_px(b), dk = bg3_dark(sc), k = P.k || 0.35, s9 = sd % 997, j;
        var hz = H * (P.hz || 0.72) * (W < H ? 0.97 : 1), R = U * (P.R || 0.14), pc = P.cx || 0.3, cx = W * (W < H ? 0.5 + (pc - 0.5) * 0.6 : pc);
        var base = dk ? bg3_glow(sc) : sc.accent, sunC = jzMixHex(sc.bg, base, k * (dk ? 1 : 0.7));
        var hd = bg3_hd(b) + 'var e=oc(BT/1.2),cy=' + jzN(hz - R * 0.5) + '+' + jzN(R * 0.35) + '*cl(BT/14)+(1-e)*' + jzN(R * 0.9) + ';';
        // sky glow: 0 half a frame above the horizon -> faint at the horizon, nothing below
        var SK = bg3_solid(b, base, 'bg sunsetSun sky', W, H);
        bg3_mask(SK, -W, hz - H * 0.25, W * 2, H * 3, { f: [0, H * 0.5] });
        bg3_mask(SK, -W, -H * 3, W * 2, hz, { mode: MaskMode.INTERSECT });
        jzSetExpr(jzXf(SK, 'ADBE Opacity'), hd + jzN(dk ? 12 : 10) + '*e');
        // sun + halo, matted to the sky above the horizon
        var c0 = R * 3.2, SN = bg3_solid(b, sunC, 'bg sunsetSun sun', c0 * 2, c0 * 2);
        bg3_cmask(SN, c0, c0, R);
        var mh = bg3_cmask(SN, c0, c0, R * 2, { f: [R * 2, R * 2] }); mh.property('ADBE Mask Opacity').setValue(45);
        jzSetExpr(jzXf(SN, 'ADBE Position'), hd + '[' + jzN(cx) + ',cy]');
        jzSetExpr(jzXf(SN, 'ADBE Opacity'), hd + '100*e');
        var MT = jzShapeLayer(b, 'bg sunsetSun horizon matte', 0, 0), gm = jzGrp(MT, 'above horizon');
        jzAddRect(gm, W * 3, hz + H, 0, W / 2, (hz - H) / 2); jzAddFill(gm, '#FFFFFF');
        SN.trackMatteType = TrackMatteType.ALPHA;
        // horizon line
        var HLn = jzRectLayer(b, 'bg sunsetSun horizon', W / 2, hz, W, Math.max(px, U * 0.0016), jzLayC(sc, 0.14));
        jzSetExpr(jzXf(HLn, 'ADBE Opacity'), hd + '100*e');
        // reflection strokes under the sun (split in two, widths / offsets shimmering)
        var WT = jzShapeLayer(b, 'bg sunsetSun water', cx, 0);
        for (j = 0; j < 18; j++) {
            var y = hz + U * 0.012 * Math.pow(j + 1, 1.3); if (y > H) break;
            var q = j / 18, hh = Math.max(1.2 * px, U * 0.0035 * (1 + j * 0.1));
            var wx = hd + 'var wv=' + jzN(R * (1.25 - q * 0.6)) + '*(0.55+0.45*n1(T*1.3+' + jzN(j * 1.9) + ',' + s9 + ')),xo=' + jzN(R * 0.18) + '*n1(T*0.9+' + jzN(j * 2.7) + ',' + (s9 + 3) +
                '),sp=0.2+0.15*n1(T*1.7+' + jzN(j * 3.3) + ',' + (s9 + 9) + '),lw=Math.max(0,wv*(1-sp));';
            var g = jzGrp(WT, 'glint ' + (j + 1)), r1 = jzAddRect(g, 10, hh), r2 = jzAddRect(g, 10, hh);
            jzSetExpr(r1.property('ADBE Vector Rect Size'), wx + '[lw,' + jzN(hh) + ']');
            jzSetExpr(r2.property('ADBE Vector Rect Size'), wx + '[lw,' + jzN(hh) + ']');
            jzSetExpr(r1.property('ADBE Vector Rect Position'), wx + '[xo-wv+lw/2,' + jzN(y + hh / 2) + ']');
            jzSetExpr(r2.property('ADBE Vector Rect Position'), wx + '[xo+wv*sp+lw/2,' + jzN(y + hh / 2) + ']');
            jzAddFill(g, sunC);
            jzSetExpr(jzGX(g).property('ADBE Vector Group Opacity'), hd + '100*e*' + jzN(0.75 * (1 - q)) + '*(0.6+0.4*n1(T*2+' + j + ',' + (s9 + 5) + '))');
        }
        // faint swell lines drifting left / right
        var SW = jzShapeLayer(b, 'bg sunsetSun swell', 0, 0), gs = jzGrp(SW, 'swell'), th = Math.max(px, U * 0.0018);
        for (j = 0; j < 7; j++) {
            var y2 = hz + (H - hz) * (0.12 + j * 0.13), wl = U * bg3_rr(0.15, 0.4, sd, j, 32), gj = bg3_sub(gs, 'line ' + (j + 1));
            jzAddRect(gj, wl, th, 0, wl / 2, th / 2);
            jzSetExpr(jzGX(gj).property('ADBE Vector Position'), hd + '[wr(T*' + jzN(U * 0.03 * (j % 2 ? 1 : -1)) + '+' + jzN(bg3_r(sd, j, 31) * W) + ',' + jzN(W * 1.4) + ')-' + jzN(W * 0.2) + ',' + jzN(y2) + ']');
        }
        jzAddFill(gs, jzLayC(sc, 0.08));
        jzSetExpr(jzXf(SW, 'ADBE Opacity'), hd + '80*e');
    }
});

/* ---- oceanWaves — 海の波: stacked wave lines, closer (lower) ones bigger / slower / darker, travelling sideways.
   AE: one straight stroke per line bent by two Wave Warps (main swell + a smaller counter-running chop), phases driven by time */
jzReg('bg', 'oceanWaves', {
    plan: function (rng, st) { return { seed: bg3_seed(rng), n: rng.int(9, 13), hz: rng.range(0.48, 0.58), k: rng.range(0.12, 0.17), dir: rng.pick([1, -1]) }; },
    build: function (b, P) {
        var W = b.W, H = b.H, sc = b.sc, sd = P.seed || 1, U = jzU(b), px = bg3_px(b), n = P.n || 11, hz = P.hz || 0.52, dir = P.dir || 1, i;
        for (i = 0; i < n; i++) {
            var q = (i + 1) / n, y0 = H * (hz + (1 - hz) * Math.pow(q, 1.55)), A = U * (0.004 + 0.028 * Math.pow(q, 1.4)), lam = W * (0.07 + 0.3 * q);
            var w = 0.9 + 0.5 * bg3_r(sd, i, 1), ph = bg3_r(sd, i, 2) * BG3_TAU;
            // main swell: one baked sine path (period lam) sliding sideways by its phase speed, wrapped every period
            var S = jzShapeLayer(b, 'bg oceanWaves ' + (i + 1), 0, y0), g = jzGrp(S, 'wave'), pts = [], x, st = lam / 12;
            for (x = -2 * lam; x <= W + lam + st; x += st) pts.push([x, A * Math.sin(x / lam * BG3_TAU + ph)]);
            bg3_path(g, pts, false, true);
            bg3_roundJoin(jzAddStroke(g, jzLayC(sc, (P.k || 0.14) * (0.45 + 0.75 * q)), Math.max(px, U * (0.0014 + 0.0035 * q))));
            jzSetExpr(jzGX(g).property('ADBE Vector Position'), bg3_hd(b) + '[wr(T*' + jzN(w * dir * lam / BG3_TAU) + ',' + jzN(lam) + '),0]');
            // counter-running chop on top of it (Wave Warp, phase driven by time)
            var w2 = jzEffect(S, 'ADBE Wave Warp', 'JZ Chop');
            jzEP(w2, 1, 1); jzEP(w2, 2, A * 0.35); jzEP(w2, 3, lam / 2.3); jzEP(w2, 4, 90); jzEP(w2, 5, 0); jzEP(w2, 6, 1);
            jzEX(w2, 7, bg3_hd(b) + '-(T*' + jzN(w * 1.3 * dir) + '+' + jzN(2 * ph) + ')*180/Math.PI');
            jzSetExpr(jzXf(S, 'ADBE Position'), bg3_hd(b) + 'var e=oc(BT/0.9);[0,' + jzN(y0) + '+(1-e)*' + jzN(H * 0.15 * q) + ']');
            jzSetExpr(jzXf(S, 'ADBE Opacity'), bg3_hd(b) + '100*oc(BT/0.9)');
        }
    }
});

/* ---- rainWindow — 雨の窓: slanted rain streaks falling fast, mist at the bottom, drops on the glass that sit, grow and run down with a trail.
   AE: streaks in 10 speed classes, each a static set sliding along the rain direction (Repeater copy = wrap); one group per drop */
jzReg('bg', 'rainWindow', {
    plan: function (rng, st) { return { seed: bg3_seed(rng), ang: rng.range(4, 13) * rng.pick([1, -1]), n: rng.int(100, 140), k: rng.range(0.15, 0.2), drops: rng.int(16, 24) }; },
    build: function (b, P) {
        var W = b.W, H = b.H, sc = b.sc, sd = P.seed || 1, U = jzU(b), px = bg3_px(b), k = P.k || 0.15, dk = bg3_dark(sc), s9 = sd % 9973, i, gI;
        var n = Math.round((P.n || 70) * bg3_area(b)), tn = Math.tan((P.ang || 8) * Math.PI / 180), span = W + H * Math.abs(tn);
        var hd = bg3_hd(b) + 'var e=oc(BT/0.6);';
        var NG = 10, Lm = H * 0.09, Pg = H + Lm, S = jzShapeLayer(b, 'bg rainWindow rain', 0, 0), grs = [];
        for (gI = 0; gI < NG; gI++) grs.push(jzGrp(S, 'rain ' + (gI + 1)));
        for (i = 0; i < n; i++) {
            var gi = Math.min(NG - 1, Math.floor(bg3_r(sd, i, 1) * NG)), L = H * bg3_rr(0.03, 0.09, sd, i, 2);
            var y = bg3_r(sd, i, 4) * Pg - Lm, x = bg3_r(sd, i, 3) * span - (tn > 0 ? H * tn : 0) + y * tn;
            jzAddPath(grs[gi], [[x, y], [x + L * tn, y + L]], false);
        }
        for (gI = 0; gI < NG; gI++) {
            var vg = H * (1.3 + 0.8 * (gI + 0.5) / NG);
            bg3_roundJoin(jzAddStroke(grs[gI], jzLayC(sc, k), Math.max(px, U * 0.0016)));
            bg3_rep(grs[gI], 2, Pg * tn, Pg, -1);
            jzSetExpr(jzGX(grs[gI]).property('ADBE Vector Position'), hd + 'var d=wr(T*' + jzN(vg) + '+' + jzN(bg3_r(sd, gI, 9) * Pg) + ',' + jzN(Pg) + ');[d*' + jzN(tn) + ',d]');
        }
        jzSetExpr(jzXf(S, 'ADBE Opacity'), hd + '85*e');
        // mist rising from the bottom
        var F = bg3_solid(b, sc.fg, 'bg rainWindow mist', W, H);
        bg3_mask(F, -W, H * 0.81, W * 2, H * 3, { f: [0, H * 0.38] });
        jzSetExpr(jzXf(F, 'ADBE Opacity'), hd + '5*e');
        // drops on the glass: sit + grow (60 % of their cycle), then slide down (accelerating) leaving a trail; new spot every cycle
        var dc = jzLayC(sc, k * 1.5), hc = dk ? jzLayC(sc, k * 3.5) : jzMixHex(sc.bg, '#FFFFFF', 0.7), D = jzShapeLayer(b, 'bg rainWindow drops', 0, 0);
        for (i = 0; i < (P.drops || 12); i++) {
            var per = bg3_rr(3.5, 6.5, sd, i, 11), r = U * bg3_rr(0.008, 0.019, sd, i, 15);
            var dh = hd + 'var per=' + jzN(per) + ',tt=T+' + jzN(bg3_r(sd, i, 12) * per) + ',u=wr(tt,per)/per,cy=Math.floor(tt/per);seedRandom(' + s9 + '+' + (i * 7919) + '+cy*131,true);' +
                'var x0=random(0.03,0.97)*' + jzN(W) + ',y0=random(0.04,0.7)*' + jzN(H) + ',r=' + jzN(r) + ',x=x0,y=y0,q=0,sl=u>=0.6,a=e*cl(u/0.08);' +
                'if(!sl){r*=0.65+0.35*u/0.6;}else{q=(u-0.6)/0.4;y=y0+iq(q)*' + jzN(H * 1.15) + ';x=x0+' + jzN(U * 0.006) + '*Math.sin(q*18+' + i + ');}var L=Math.max(0,y-' + jzN(r * 0.8) + '-y0);';
            var g = jzGrp(D, 'drop ' + (i + 1));
            var gh = bg3_sub(g, 'glint'), eh = jzAddEllipse(gh, 10, 10); jzAddFill(gh, hc);
            jzSetExpr(eh.property('ADBE Vector Ellipse Size'), dh + '[r*0.56,r*0.56]');
            jzSetExpr(eh.property('ADBE Vector Ellipse Position'), dh + '[-r*0.3,-r*0.35]');
            jzSetExpr(jzGX(gh).property('ADBE Vector Group Opacity'), dh + '70*a');
            var gb = bg3_sub(g, 'body'), eb = jzAddEllipse(gb, 10, 10); jzAddFill(gb, dc);
            jzSetExpr(eb.property('ADBE Vector Ellipse Size'), dh + '[r*1.8,r*2]');
            jzSetExpr(jzGX(gb).property('ADBE Vector Group Opacity'), dh + '90*a');
            var gt = bg3_sub(g, 'trail'), rt = jzAddRect(gt, 10, 10, r * 0.22); jzAddFill(gt, dc);
            jzSetExpr(rt.property('ADBE Vector Rect Size'), dh + '[' + jzN(r * 0.45) + ',L]');
            jzSetExpr(rt.property('ADBE Vector Rect Position'), dh + '[(x0-x)/2,-' + jzN(r * 0.8) + '-L/2]');
            jzSetExpr(jzGX(gt).property('ADBE Vector Group Opacity'), dh + 'sl?55*e*(1-q*0.5):0');
            jzSetExpr(jzGX(g).property('ADBE Vector Position'), dh + '[x,y]');
        }
    }
});

/* ---- snowLayers — 雪: three depths of soft snowflakes (small / slow far, big / fast near) falling with wind and sway */
jzReg('bg', 'snowLayers', {
    plan: function (rng, st) { return { seed: bg3_seed(rng), wind: rng.range(-0.45, 0.45), dens: rng.range(0.85, 1.2) }; },
    build: function (b, P) {
        var W = b.W, H = b.H, sc = b.sc, sd = P.seed || 1, U = jzU(b), l, i;
        var col = jzLum(sc.bg) < 0.88 ? jzMixHex(sc.bg, '#FFFFFF', 0.92) : jzLayC(sc, 0.35), area = bg3_area(b) * (P.dens || 1);
        var LY = [[70, 0.0045, 0.05, 0.012, 0.5], [36, 0.009, 0.09, 0.02, 0.6], [11, 0.02, 0.16, 0.035, 0.32]];
        for (l = 0; l < 3; l++) {
            var n = Math.round(LY[l][0] * area), vy = H * LY[l][2], vx = vy * (P.wind || 0), sz = U * LY[l][1], S = jzShapeLayer(b, 'bg snowLayers ' + (l + 1), 0, 0);
            for (i = 0; i < n; i++) {
                var s = sz * (0.7 + 0.6 * bg3_r(sd, l, i, 1)), f = bg3_rr(0.5, 1.3, sd, l, i, 2), g = jzGrp(S, 'flake ' + (i + 1));
                jzAddEllipse(g, s * 1.3, s * 1.3); jzAddFill(g, col, LY[l][4] * (0.6 + 0.4 * bg3_r(sd, l, i, 6)) * 100);
                jzSetExpr(jzGX(g).property('ADBE Vector Position'), bg3_hd(b) + '[wr(' + jzN(bg3_r(sd, l, i, 5) * W * 1.1) + '+T*' + jzN(vx) + '+Math.sin(T*' + jzN(f) + '+' + i + ')*' + jzN(U * LY[l][3]) + ',' + jzN(W * 1.1) + ')-' + jzN(W * 0.05) +
                    ',wr(' + jzN(bg3_r(sd, l, i, 3) * H * 1.2) + '+T*' + jzN(vy * (0.8 + 0.4 * bg3_r(sd, l, i, 4))) + ',' + jzN(H * 1.2) + ')-' + jzN(H * 0.1) + ']');
            }
            var bl = jzEffect(S, 'ADBE Gaussian Blur 2', 'JZ Soft Flakes'); jzEP(bl, 1, sz * 0.5); jzEP(bl, 3, 0);
            jzSetExpr(jzXf(S, 'ADBE Opacity'), bg3_hd(b) + '100*oc(BT/1)');
        }
    }
});

/* ---- fireworks — 花火: a shell every ~0.65 s: launch trail, flash, two rings of streaks spreading out and falling with gravity, crackle.
   AE: 6 shell slots (a slot shows every 6th shell); rings = one streak + head repeated round the burst centre */
jzReg('bg', 'fireworks', {
    plan: function (rng, st) { return { seed: bg3_seed(rng), per: rng.range(0.55, 0.8), k: rng.range(0.42, 0.55) }; },
    build: function (b, P) {
        var W = b.W, H = b.H, sc = b.sc, sd = P.seed || 1, U = jzU(b), px = bg3_px(b), dk = bg3_dark(sc), cols = bg3_hues(sc), s9 = sd % 9973, j, q;
        var per = P.per || 0.65, NS = 6, lw = Math.max(px, U * 0.0024), hr = U * 0.0028, KK = (P.k || 0.48) * (dk ? 1 : 0.6), CA = [], HA = [];
        for (j = 0; j < cols.length; j++) { var c = dk ? cols[j] : jzMixHex(cols[j], sc.bg, 0.2); CA.push(bg3_col(c)); HA.push(bg3_col(dk ? jzMixHex(c, '#FFFFFF', 0.5) : c)); }
        var slot = function (j) {
            return bg3_hd(b) + 'var e=oc(BT/0.3),K=' + jzN(KK) + '*e,per=' + jzN(per) + ',idx=Math.floor(T/per),b=idx-wr(idx-' + j + ',' + NS + ');' +
                'seedRandom(' + s9 + '+b*101,true);var jt=random(),ox=random(0.1,0.9)*' + jzN(W) + ',oy=random(0.1,0.48)*' + jzN(H) + ',ci=Math.floor(random()*' + CA.length + ')%' + CA.length +
                ',n0=28+Math.floor(random()*14),V=random(0.7,1.05)*' + jzN(U) + ';var age=T-(b*per+jt*per*0.5),vis=age>=0&&age<=2.45,a=age-0.45,aa=Math.max(0,a),fd=a>0?Math.pow(Math.max(0,1-a/2),1.6):0;' +
                'function dd(tt,sp){return sp*(1-Math.exp(-2.6*tt))/2.6;}var C=[' + CA.join(',') + '],HC=[' + HA.join(',') + '];';
        };
        var S = jzShapeLayer(b, 'bg fireworks', 0, 0), FL = jzShapeLayer(b, 'bg fireworks flash', 0, 0);
        for (j = 0; j < NS; j++) {
            var hd = slot(j), gs = jzGrp(S, 'shell ' + (j + 1)), gB = bg3_sub(gs, 'burst');
            for (q = 0; q < 2; q++) {
                var f = q ? 0.55 * 0.925 : 0.925, gr = bg3_sub(gB, q ? 'inner ring' : 'outer ring');
                var ghd = bg3_sub(gr, 'head'), rh = jzAddRect(ghd, hr * 2, hr * 2), fh = jzAddFill(ghd, '#FFFFFF');
                jzSetExpr(rh.property('ADBE Vector Rect Position'), hd + '[dd(aa,V*' + jzN(f) + '),0]');
                jzSetExpr(fh.property('ADBE Vector Fill Color'), hd + 'HC[ci]');
                jzSetExpr(jzGX(ghd).property('ADBE Vector Group Opacity'), hd + 'var st=Math.floor(T*12+1e-6);seedRandom(' + (s9 + 7) + '+b*31+st*' + (q + 3) + ',true);(a>0.9&&random()<0.35)?0:100');
                var gk = bg3_sub(gr, 'streak'), rk = jzAddRect(gk, 10, lw), fk = jzAddFill(gk, '#FFFFFF');
                var dx = 'var d1=dd(aa,V*' + jzN(f) + '),d0=dd(Math.max(0,a-0.16),V*' + jzN(f) + ');';
                jzSetExpr(rk.property('ADBE Vector Rect Size'), hd + dx + '[Math.max(0,d1-d0),' + jzN(lw) + ']');
                jzSetExpr(rk.property('ADBE Vector Rect Position'), hd + dx + '[(d0+d1)/2,0]');
                jzSetExpr(fk.property('ADBE Vector Fill Color'), hd + 'C[ci]');
                var rp = bg3_rep(gr, 30, 0, 0, 0);
                jzSetExpr(rp.property('ADBE Vector Repeater Copies'), hd + 'n0');
                jzSetExpr(rp.property('ADBE Vector Repeater Transform').property('ADBE Vector Repeater Rotation'), hd + '360/n0');
                if (q) jzSetExpr(jzGX(gr).property('ADBE Vector Rotation'), hd + '180/n0');
            }
            jzSetExpr(jzGX(gB).property('ADBE Vector Position'), hd + '[ox,oy+' + jzN(U * 0.055) + '*aa*aa]');
            jzSetExpr(jzGX(gB).property('ADBE Vector Group Opacity'), hd + '(vis&&a>=0)?100*K*fd:0');
            // launch trail rising to the burst point
            var gL = bg3_sub(gs, 'launch'), rl = jzAddRect(gL, lw, 10), fl = jzAddFill(gL, '#FFFFFF');
            var lx = 'var y=' + jzN(H * 1.02) + '+(oy-' + jzN(H * 1.02) + ')*oq(age/0.45),y2=' + jzN(H * 1.02) + '+(oy-' + jzN(H * 1.02) + ')*oq(Math.max(0,age-0.12)/0.45);';
            jzSetExpr(rl.property('ADBE Vector Rect Size'), hd + lx + '[' + jzN(lw) + ',Math.max(0,y2-y)]');
            jzSetExpr(rl.property('ADBE Vector Rect Position'), hd + lx + '[ox+Math.sin(age*30)*' + jzN(U * 0.001) + ',(y+y2)/2]');
            jzSetExpr(fl.property('ADBE Vector Fill Color'), hd + 'C[ci]');
            jzSetExpr(jzGX(gL).property('ADBE Vector Group Opacity'), hd + '(age>=0&&age<0.45)?60*K:0');
            // flash at the burst point
            var gF = jzGrp(FL, 'flash ' + (j + 1)), ef = jzAddEllipse(gF, U * 0.13, U * 0.13), ff = jzAddFill(gF, '#FFFFFF');
            jzSetExpr(ef.property('ADBE Vector Ellipse Position'), hd + '[ox,oy]');
            jzSetExpr(ff.property('ADBE Vector Fill Color'), hd + 'C[ci]');
            jzSetExpr(jzGX(gF).property('ADBE Vector Group Opacity'), hd + '(a>=0&&a<0.25)?60*K*(1-a/0.25):0');
        }
        var bl = jzEffect(FL, 'ADBE Gaussian Blur 2', 'JZ Flash Soft'); jzEP(bl, 1, U * 0.05); jzEP(bl, 3, 0);
        if (dk) { S.blendingMode = BlendingMode.SCREEN; FL.blendingMode = BlendingMode.SCREEN; }
    }
});

/* ---- cloudLayers — 雲: three depths of flat puffy clouds drifting sideways at parallax speeds, breathing slightly */
jzReg('bg', 'cloudLayers', {
    plan: function (rng, st) { return { seed: bg3_seed(rng), dir: rng.pick([1, -1]), k: rng.range(0.06, 0.09) }; },
    build: function (b, P) {
        var W = b.W, H = b.H, sc = b.sc, sd = P.seed || 1, U = jzU(b), k = P.k || 0.075, dir = P.dir || 1, l, c, p;
        var LY = [[0.1, 0.3, 0.55, 0.012, 0.55], [0.3, 0.55, 0.8, 0.026, 0.8], [0.72, 0.98, 1.15, 0.05, 1.1]];
        for (l = 0; l < 3; l++) {
            var cw0 = U * 0.5 * LY[l][2], Lp = W + cw0 * 2.4, S = jzShapeLayer(b, 'bg cloudLayers ' + (l + 1), 0, 0), gA = jzGrp(S, 'clouds');
            for (c = 0; c < 4; c++) {
                var cw = cw0 * bg3_rr(0.75, 1.2, sd, l, c, 1), y = H * bg3_rr(LY[l][0], LY[l][1], sd, l, c, 3), np = 5 + (bg3_h(sd, l, c) % 3), rmin = 1e9;
                var g = bg3_sub(gA, 'cloud ' + (c + 1));
                for (p = 0; p < np; p++) {
                    var f = (p + 0.5) / np, pr = cw / np * (0.75 + 1.05 * Math.sin(Math.PI * f)) * (0.85 + 0.3 * bg3_r(sd, l, c, p, 4));
                    jzAddEllipse(g, pr * 2, pr * 2, cw * f + bg3_rs(sd, l, c, p, 5) * cw * 0.03, -pr); rmin = Math.min(rmin, pr);
                }
                jzAddRect(g, cw * (1 - 1 / np), rmin, 0, cw * 0.5, -rmin / 2);
                jzSetExpr(jzGX(g).property('ADBE Vector Position'), bg3_hd(b) + 'var e=oc(BT/1);[wr(' + jzN((c + bg3_r(sd, l, c, 2) * 0.6) / 4 * Lp) + '+T*' + jzN(U * LY[l][3] * dir) + ',' + jzN(Lp) + ')-' + jzN(cw * 1.2) +
                    ',' + jzN(y) + '+(1-e)*' + jzN(H * 0.05 * (l + 1)) + ']');
                jzSetExpr(jzGX(g).property('ADBE Vector Scale'), bg3_hd(b) + 'var s=100+2*Math.sin(T*0.6+' + c + ');[s,s]');
            }
            jzAddFill(gA, jzLayC(sc, k * LY[l][4]));
        }
    }
});

/* ---- mountains — 山並み: 3-4 ridged mountain ranges (same noise as the browser), far ones paler, scrolling at parallax, mist in the valleys */
jzReg('bg', 'mountains', {
    plan: function (rng, st) { return { seed: bg3_seed(rng), n: rng.int(3, 4), k: rng.range(0.07, 0.1), dir: rng.pick([1, -1]), mist: rng.chance(0.7) }; },
    build: function (b, P) {
        var W = b.W, H = b.H, sc = b.sc, sd = P.seed || 1, U = jzU(b), px = bg3_px(b), n = P.n || 3, k = P.k || 0.085, dir = P.dir || 1, port = H > W, l, o;
        var m = jzClamp(Math.round(W / (U * 0.01)), 60, 220), dxs = W / m, T0 = b.cut.start || 0, T1 = T0 + b.comp.duration;
        for (l = 0; l < n; l++) {
            var q = n > 1 ? l / (n - 1) : 1, base = H * ((port ? 0.68 : 0.64) + 0.14 * q), A = H * (port ? 0.17 : 0.3) * (1 - 0.35 * q);
            var s2 = U * (0.42 + 0.2 * (1 - q)), sp = 0.012 * (l + 1) * dir, o0 = T0 * sp + l * 7.3, o1 = T1 * sp + l * 7.3, O = o0 * s2;
            var xa = Math.min(o0, o1) * s2 - 2 * px - dxs, xb = W + Math.max(o0, o1) * s2 + 2 * px + dxs, pts = [[xa - O, H + 2 * px]], x, xl = xa;
            for (x = xa; x <= xb + dxs * 0.5; x += dxs) {
                var X = x / s2, v = 0, amp = 1, f = 1, nrm = 0;
                for (o = 0; o < 4; o++) { v += (1 - Math.abs(bg3_n1(X * f, sd + l * 31 + o * 7))) * amp; nrm += amp; amp *= 0.48; f *= 2.2; }
                v = jzClamp((v / nrm - 0.4) * 1.8, 0, 1);
                pts.push([x - O, base - A * v * v]); xl = x;
            }
            pts.push([xl - O, H + 2 * px]);
            var hd = bg3_hd(b) + 'var e=oc(BT/1.1),rise=(1-e)*' + jzN(H * 0.3 * (1 - q * 0.4)) + ';';
            var S = jzShapeLayer(b, 'bg mountains ' + (l + 1), 0, 0), g = jzGrp(S, 'range');
            jzAddPath(g, pts, true); jzAddFill(g, jzLayC(sc, k * (0.45 + 0.75 * q)));
            jzSetExpr(jzGX(g).property('ADBE Vector Position'), '[-time*' + jzN(sp * s2) + ',0]');
            jzSetExpr(jzXf(S, 'ADBE Position'), hd + '[0,rise]');
            if (P.mist !== false && l < n - 1) {      // valley mist: background colour fading in below the ridge
                var y0 = base - A * 0.25, y1 = base + H * 0.06, MS = bg3_solid(b, sc.bg, 'bg mountains mist ' + (l + 1), W, H);
                bg3_mask(MS, -W, (y0 + y1) / 2, W * 2, H * 3, { f: [0, y1 - y0] });
                jzXf(MS, 'ADBE Opacity').setValue(55);
                jzSetExpr(jzXf(MS, 'ADBE Position'), hd + '[value[0],value[1]+rise]');
            }
        }
    }
});

/* ---- filmStrip — フィルム: film strips along two edges sliding in, perforations + frame lines running, flickering scratches and dust */
jzReg('bg', 'filmStrip', {
    plan: function (rng, st) { return { seed: bg3_seed(rng), dir: rng.pick([1, -1]), spd: rng.range(0.6, 1.2), scratch: rng.chance(0.7) }; },
    build: function (b, P) {
        var W = b.W, H = b.H, sc = b.sc, sd = P.seed || 1, U = jzU(b), px = bg3_px(b), dk = bg3_dark(sc), vert = H > W, s9 = sd % 9973, side, i;
        var bw = U * 0.085, L = vert ? H : W, M = vert ? W : H, lw = Math.max(px, U * 0.002);
        var band = dk ? jzLayC(sc, 0.05) : jzLayC(sc, 0.13), hole = dk ? jzLayC(sc, 0.17) : jzMixHex(sc.bg, '#FFFFFF', 0.55), edge = dk ? jzLayC(sc, 0.12) : jzLayC(sc, 0.22);
        var p = bw * 0.62, hw = bw * 0.3, hh = bw * 0.38;
        var hd = bg3_hd(b) + 'var e=oe(BT/0.55),sl=(1-e)*' + jzN(bw * 1.3) + ',off=wr(T*' + jzN(p * (P.spd || 0.9) * (P.dir || 1)) + ',' + jzN(p) + ');';
        var xy = function (a, c) { return vert ? [c, a] : [a, c]; };                                    // a: along the strip, c: across
        var xs = function (a, c) { return vert ? '[' + c + ',' + a + ']' : '[' + a + ',' + c + ']'; };
        var S = jzShapeLayer(b, 'bg filmStrip', 0, 0);
        for (side = 0; side < 2; side++) {
            var g = jzGrp(S, side ? 'far strip' : 'near strip');
            var gd = bg3_sub(g, 'frame lines'), dz = xy(lw, bw * 0.2), dc = xy(lw / 2, bw * (side ? 0.72 : 0.08) + bw * 0.1), s4 = xy(4 * p, 0);
            jzAddRect(gd, dz[0], dz[1], 0, dc[0], dc[1]); jzAddFill(gd, edge);
            bg3_rep(gd, Math.ceil(L / (4 * p)) + 3, s4[0], s4[1], 0);
            jzSetExpr(jzGX(gd).property('ADBE Vector Position'), hd + 'var a=wr(off,' + jzN(4 * p) + ')-' + jzN(4 * p) + ';' + xs('a', '0'));
            var gh = bg3_sub(g, 'perforations'), hz = xy(hw, hh), hc = xy(p / 2, bw / 2 + (side ? 0.12 : -0.12) * bw), s1 = xy(p, 0);
            jzAddRect(gh, hz[0], hz[1], bw * 0.06, hc[0], hc[1]); jzAddFill(gh, hole);
            bg3_rep(gh, Math.ceil(L / p) + 3, s1[0], s1[1], 0);
            jzSetExpr(jzGX(gh).property('ADBE Vector Position'), hd + 'var a=off-' + jzN(p) + ';' + xs('a', '0'));
            var ge = bg3_sub(g, 'edge'), ez = xy(L, lw), ec = xy(L / 2, side ? lw / 2 : bw - lw / 2);
            jzAddRect(ge, ez[0], ez[1], 0, ec[0], ec[1]); jzAddFill(ge, edge);
            var gb = bg3_sub(g, 'band'), bz = xy(L + 4 * px, bw), bc = xy(L / 2, bw / 2);
            jzAddRect(gb, bz[0], bz[1], 0, bc[0], bc[1]); jzAddFill(gb, band);
            jzSetExpr(jzGX(g).property('ADBE Vector Position'), hd + xs('0', side ? jzN(M - bw) + '+sl' : '-sl'));
        }
        if (P.scratch !== false) {        // scratches + dust re-drawn on a 12 fps clock
            var X = jzShapeLayer(b, 'bg filmStrip scratches', 0, 0), scol = dk ? jzLayC(sc, 0.35) : jzLayC(sc, 0.3);
            for (i = 0; i < 3; i++) {
                var gs = jzGrp(X, 'scratch ' + (i + 1)), rs = jzAddRect(gs, 2, 2); jzAddFill(gs, scol);
                var ex = hd + 'var st=Math.floor(T*12+1e-6);seedRandom(' + s9 + '+Math.floor(st/4)*37+' + i + ',true);var x=random()*' + jzN(L) + ';seedRandom(' + (s9 + 500) + '+st*37+' + i + ',true);' +
                    'var on=random()<=0.55;x+=random(-1,1)*' + jzN(U * 0.004) + ';var w=random(' + jzN(Math.max(px, U * 0.0008)) + ',' + jzN(Math.max(px, U * 0.002)) + '),al=random(0.1,0.22);';
                jzSetExpr(rs.property('ADBE Vector Rect Size'), ex + xs('w', jzN(M + 4 * px)));
                jzSetExpr(jzGX(gs).property('ADBE Vector Position'), ex + xs('x', jzN(M / 2)));
                jzSetExpr(jzGX(gs).property('ADBE Vector Group Opacity'), ex + 'on?100*e*al:0');
            }
            for (i = 0; i < 6; i++) {
                var gu = jzGrp(X, 'dust ' + (i + 1)), ru = jzAddRect(gu, 2, 2); jzAddFill(gu, scol);
                var du = hd + 'var st=Math.floor(T*12+1e-6);seedRandom(' + (s9 + 900) + '+st*53+' + i + ',true);var on=random()<=0.5,r=random(' + jzN(U * 0.001) + ',' + jzN(U * 0.003) + '),x=random()*' + jzN(W) + ',y=random()*' + jzN(H) + ';';
                jzSetExpr(ru.property('ADBE Vector Rect Size'), du + '[2*r,1.4*r]');
                jzSetExpr(jzGX(gu).property('ADBE Vector Position'), du + '[x+r,y+0.7*r]');
                jzSetExpr(jzGX(gu).property('ADBE Vector Group Opacity'), du + 'on?25*e:0');
            }
        }
    }
});

/* ---- vhsBand — VHSノイズ: a rolling band of tape noise with a soft light smear and tracking lines, torn head-switching strip at the bottom.
   AE: noise = Noise -> Mosaic -> Threshold -> Tint on grey solids (new grain every frame), screen on dark / multiply on light schemes */
jzReg('bg', 'vhsBand', {
    plan: function (rng, st) { return { seed: bg3_seed(rng), h: rng.range(0.07, 0.12), spd: rng.range(0.08, 0.16) * rng.pick([1, -1]), k: rng.range(0.22, 0.32) }; },
    build: function (b, P) {
        var W = b.W, H = b.H, sc = b.sc, sd = P.seed || 1, U = jzU(b), px = bg3_px(b), dk = bg3_dark(sc), s9 = sd % 9973, i;
        var col = dk ? sc.fg : jzMixHex(sc.fg, sc.bg, 0.2), kk = (P.k || 0.26) * (dk ? 1 : 0.75), bh = H * (P.h || 0.09), cx = 9 * px, cy = 2 * px;
        var hd = bg3_hd(b) + 'var e=oc(BT/0.3),st=Math.floor(T*12+1e-6),y=wr(T*' + jzN(H * (P.spd || 0.12)) + '+' + jzN(bg3_r(sd, 1) * H) + ',' + jzN(H * 1.3) + ')-' + jzN(H * 0.15) + ';';
        // rolling noise band (jumps sideways a little every step)
        var NB = bg3_vhsNoise(b, col, dk, 'bg vhsBand noise', W, bh, cx, cy);
        jzSetExpr(jzXf(NB, 'ADBE Position'), hd + 'seedRandom(' + s9 + '+st*17,true);[' + jzN(W / 2) + '+random(-1,1)*' + jzN(U * 0.01) + ',y+' + jzN(bh / 2) + ']');
        jzSetExpr(jzXf(NB, 'ADBE Opacity'), hd + jzN(kk * 100) + '*e');
        // soft light smear around the band
        var LG = bg3_solid(b, bg3_lightOn(sc), 'bg vhsBand smear', W, bh * 2);
        bg3_mask(LG, -W, bh * 0.4, W * 2, bh * 1.2, { f: [0, bh * 0.8] });
        jzSetExpr(jzXf(LG, 'ADBE Position'), hd + '[' + jzN(W / 2) + ',y+' + jzN(0.4 * bh) + ']');
        jzSetExpr(jzXf(LG, 'ADBE Opacity'), hd + jzN(dk ? 5 : 10) + '*e');
        // tracking lines inside the band
        var TL = jzShapeLayer(b, 'bg vhsBand tracking', 0, 0), th = Math.max(px, U * 0.0016);
        for (i = 0; i < 3; i++) {
            var g = jzGrp(TL, 'line ' + (i + 1)), rl = jzAddRect(g, 10, th); jzAddFill(g, jzLayC(sc, dk ? 0.3 : 0.2));
            var lx = hd + 'seedRandom(' + (s9 + 300) + '+Math.floor(st/2)*29+' + i + ',true);var ly=y+' + jzN(bh) + '*random();seedRandom(' + (s9 + 600) + '+st*29+' + i + ',true);var lx=random()*' + jzN(W * 0.6) + ',lw=random(0.2,0.6)*' + jzN(W) + ';';
            jzSetExpr(rl.property('ADBE Vector Rect Size'), lx + '[lw,' + jzN(th) + ']');
            jzSetExpr(jzGX(g).property('ADBE Vector Position'), lx + '[lx+lw/2,ly+' + jzN(th / 2) + ']');
        }
        jzSetExpr(jzXf(TL, 'ADBE Opacity'), hd + '50*e');
        // head-switching strip: 4 rows of noise, knocked sideways (more at the top rows)
        var hb = H * 0.028;
        for (i = 0; i < 4; i++) {
            var HS = bg3_vhsNoise(b, col, dk, 'bg vhsBand head ' + (i + 1), W, hb / 4 + px, 0, 0, 185);
            jzSetExpr(jzXf(HS, 'ADBE Position'), hd + 'seedRandom(' + (s9 + 800) + '+st*13+' + i + ',true);[' + jzN(W / 2 + U * 0.02 * (4 - i) / 4) + '+random(-1,1)*' + jzN(U * 0.03) + ',' + jzN(H - hb + hb * i / 4 + hb / 8 + px / 2) + ']');
            jzSetExpr(jzXf(HS, 'ADBE Opacity'), hd + jzN(kk * 90) + '*e');
        }
    }
});

/* ---- tornPaper — 破れ紙: two sheets of paper with torn edges slide in over the top & bottom (or the diagonal corners / the sides), soft shadow + light fibrous rim */
jzReg('bg', 'tornPaper', {
    plan: function (rng, st) { return { seed: bg3_seed(rng), v: rng.pick(['tb', 'tb', 'diag', 'side']), k: rng.range(0.05, 0.08) }; },
    build: function (b, P) {
        var W = b.W, H = b.H, sc = b.sc, sd = P.seed || 1, U = jzU(b), px = bg3_px(b), dk = bg3_dark(sc), k = P.k || 0.065, v = P.v || 'tb', i, j;
        if (v === 'side' && H > W) v = 'tb';
        // [A, B, n] = edge from A to B, the sheet covers the side of the normal n
        var SS = v === 'diag' ? [[[-W * 0.05, H * 0.58], [W * 0.5, H * 1.05], [-0.7, 0.7]], [[W * 0.55, -H * 0.05], [W * 1.05, H * 0.48], [0.7, -0.7]]]
            : v === 'side' ? [[[W * 0.13, -H * 0.05], [W * 0.1, H * 1.05], [-1, 0]], [[W * 0.9, -H * 0.05], [W * 0.87, H * 1.05], [1, 0]]]
                : [[[-W * 0.05, H * 0.83], [W * 1.05, H * 0.79], [0, 1]], [[-W * 0.05, H * 0.13], [W * 1.05, H * 0.17], [0, -1]]];
        var tones = dk ? [jzLayC(sc, k), jzMixHex(sc.bg, sc.accent, k * 1.6)] : [jzMixHex(sc.bg, '#FFFFFF', 0.5), jzLayC(sc, k)], far = Math.sqrt(W * W + H * H), sd2 = U * 0.008;
        for (i = 0; i < 2; i++) {
            var A = SS[i][0], B = SS[i][1], nr = SS[i][2], dx = B[0] - A[0], dy = B[1] - A[1], len = Math.sqrt(dx * dx + dy * dy), N = Math.min(260, Math.ceil(len / (U * 0.009)));
            var tx = dx / len, ty = dy / len, pts = [], rim = [];
            for (j = 0; j <= N; j++) {
                var u = j / N, o = U * (0.018 * bg3_n1(u * 9, sd + i * 17) + 0.007 * bg3_n1(u * 45, sd + i * 5) + 0.0035 * bg3_rs(sd, i, j));
                pts.push([A[0] + dx * u + nr[0] * o, A[1] + dy * u + nr[1] * o]);
                rim.push(j ? [pts[j][0] - nr[0] * U * 0.002, pts[j][1] - nr[1] * U * 0.002] : [pts[0][0], pts[0][1]]);
            }
            var poly = pts.concat([[B[0] + nr[0] * far + tx * far * 0.2, B[1] + nr[1] * far + ty * far * 0.2], [A[0] + nr[0] * far - tx * far * 0.2, A[1] + nr[1] * far - ty * far * 0.2]]);
            var L = jzShapeLayer(b, 'bg tornPaper ' + (i + 1), 0, 0);
            var gr = jzGrp(L, 'torn rim'); jzAddPath(gr, rim, false);
            bg3_roundJoin(jzAddStroke(gr, dk ? jzLayC(sc, k * 2.4) : jzMixHex(tones[i % 2], '#FFFFFF', 0.75), Math.max(px, U * 0.004)));
            var gs = jzGrp(L, 'sheet'); jzAddPath(gs, poly, true); jzAddFill(gs, tones[i % 2]);
            var gd = jzGrp(L, 'shadow'); jzAddPath(gd, poly, true); jzAddFill(gd, '#000000', dk ? 35 : 10);
            jzGX(gd).property('ADBE Vector Position').setValue([-nr[0] * sd2 * 0.5, -nr[1] * sd2 * 0.5 + sd2 * 0.6]);
            jzSetExpr(jzXf(L, 'ADBE Position'), bg3_hd(b) + 'var ip=oc((BT-' + jzN(i * 0.12) + ')/0.6),pu=(1-ip)*' + jzN(U * 0.35) + '+Math.sin(T*0.5+' + (i * 2) + ')*' + jzN(U * 0.004) + ';[' + jzN(nr[0]) + '*pu,' + jzN(nr[1]) + '*pu]');
        }
    }
});

/* ---- godRays — 光芒: shafts of light fanning down from a source above the frame, each beam widening / brightening with slow noise, dust motes */
jzReg('bg', 'godRays', {
    plan: function (rng, st) { return { seed: bg3_seed(rng), x: rng.pick([rng.range(0.12, 0.35), rng.range(0.65, 0.88), 0.5]), n: rng.int(7, 11), spread: rng.range(45, 75), k: rng.range(0.11, 0.16), dust: rng.chance(0.75) }; },
    build: function (b, P) {
        var W = b.W, H = b.H, sc = b.sc, sd = P.seed || 1, U = jzU(b), dk = bg3_dark(sc), s9 = sd % 997, n = P.n || 9, i, q;
        var rc = dk ? bg3_lightOn(sc) : (jzLum(sc.bg) < 0.8 ? '#FFFFFF' : jzMixHex(sc.accent, sc.bg, 0.3)), kk = (P.k || 0.13) * (dk ? 1.35 : 1.4);
        var L = Math.sqrt(W * W + H * H) * 1.25, sy = -H * 0.12, xr = P.x == null ? 0.5 : P.x, w0 = 3 * Math.PI / 180, FW = [1.8, 1, 0.45], OP = [16, 30, 55];
        var hd = bg3_hd(b) + 'var e=oc(BT/1),sx=' + jzN(W * xr) + '+' + jzN(W * 0.04) + '*Math.sin(T*0.1+' + (sd % 7) + '),base=Math.atan2(' + jzN(H * 0.55 - sy) + ',' + jzN(W * 0.5) + '-sx);';
        var S = jzShapeLayer(b, 'bg godRays', W * xr, sy);
        for (i = 0; i < n; i++) {
            var g = jzGrp(S, 'beam ' + (i + 1));
            for (q = 0; q < 3; q++) {     // nested wedges -> soft falloff across the beam
                var gq = bg3_sub(g, 'wedge ' + (q + 1)), ww = w0 * FW[q] / 2;
                jzAddPath(gq, [[0, 0], [Math.cos(-ww) * L, Math.sin(-ww) * L], [Math.cos(ww) * L, Math.sin(ww) * L]], true);
                jzAddFill(gq, rc, OP[q]);
            }
            var bh = hd + 'var a=base+(' + jzN((P.spread || 60) * (i / (n - 1) - 0.5) + bg3_rs(sd, i, 1) * 4) + '+3*n1(T*0.15+' + jzN(i * 1.3) + ',' + s9 + '))*Math.PI/180,w=' +
                jzN((1.2 + 3.6 * bg3_r(sd, i, 2)) * Math.PI / 180) + '*(0.75+0.25*n1(T*0.4+' + i + ',' + (s9 + 7) + ')),lv=0.5+0.5*n1(T*0.35+' + jzN(i * 2.1) + ',' + (s9 + 3) + ');';
            jzSetExpr(jzGX(g).property('ADBE Vector Rotation'), bh + 'a*180/Math.PI');
            jzSetExpr(jzGX(g).property('ADBE Vector Scale'), bh + '[100,100*w/' + jzN(w0) + ']');
            jzSetExpr(jzGX(g).property('ADBE Vector Group Opacity'), bh + '100*(0.35+0.65*lv)');
        }
        // light fading with the distance from the source (feathered circle round the layer origin = the source)
        bg3_cmask(S, 0, 0, L * 0.3, { f: [L * 0.6, L * 0.6] });
        var bl = jzEffect(S, 'ADBE Gaussian Blur 2', 'JZ Rays Soft'); jzEP(bl, 1, U * 0.012); jzEP(bl, 3, 0);
        jzSetExpr(jzXf(S, 'ADBE Position'), hd + '[sx,' + jzN(sy) + ']');
        jzSetExpr(jzXf(S, 'ADBE Opacity'), hd + jzN(Math.min(100, kk * 130)) + '*e');
        if (P.dust !== false) {        // dust motes drifting through the light
            var D = jzShapeLayer(b, 'bg godRays dust', 0, 0);
            for (i = 0; i < 26; i++) {
                var r = U * bg3_rr(0.0012, 0.003, sd, i, 15), gm = jzGrp(D, 'mote ' + (i + 1)); jzAddRect(gm, r * 2, r * 2); jzAddFill(gm, rc);
                var mh = hd + 'var x=wr(' + jzN(bg3_r(sd, i, 11) * W) + '+T*' + jzN(U * bg3_rs(sd, i, 12) * 0.02) + '+Math.sin(T*0.5+' + i + ')*' + jzN(U * 0.01) + ',' + jzN(W) + '),y=wr(' + jzN(bg3_r(sd, i, 13) * H) + '+T*' + jzN(U * bg3_rr(-0.02, 0.01, sd, i, 14)) + ',' + jzN(H) + ');';
                jzSetExpr(jzGX(gm).property('ADBE Vector Position'), mh + '[x,y]');
                jzSetExpr(jzGX(gm).property('ADBE Vector Group Opacity'), mh + 'var dx=x-sx,dy=y+' + jzN(-sy) + ',nr=cl(1-Math.sqrt(dx*dx+dy*dy)/' + jzN(L) + ');100*e*(0.15+0.35*nr)*(0.5+0.5*Math.sin(T*' + jzN(bg3_rr(0.8, 2, sd, i, 16)) + '+' + i + '))');
            }
        }
    }
});

/* ---- vignettePulse — 色の周辺光: two colour glows in opposite corners (or one coloured vignette) pulsing gently */
jzReg('bg', 'vignettePulse', {
    plan: function (rng, st) { return { seed: bg3_seed(rng), k: rng.range(0.3, 0.42), two: rng.chance(0.6), rate: rng.range(0.35, 0.55) }; },
    build: function (b, P) {
        var W = b.W, H = b.H, sc = b.sc, U = jzU(b), dk = bg3_dark(sc), cols = bg3_hues(sc), R = Math.sqrt(W * W + H * H) / 2, i;
        var cA = jzMixHex(sc.bg, cols[0], 0.7), cB = jzMixHex(sc.bg, cols[1] || cols[0], 0.7);
        var hd = bg3_hd(b) + 'var e=oc(BT/0.8),pu=0.75+0.25*Math.sin(T*' + jzN(BG3_TAU * (P.rate || 0.45)) + '),kk=' + jzN((P.k || 0.35) * (dk ? 1 : 0.8)) + '*e*pu;';
        if (P.two !== false) {
            var CS = [[0, 0, cA, 0], [W, H, cB, 1.7]], r0 = R * 1.25;
            for (i = 0; i < 2; i++) {
                var V = bg3_solid(b, CS[i][2], 'bg vignettePulse ' + (i ? 'B' : 'A'), r0 * 2.2, r0 * 2.2);
                bg3_cmask(V, r0 * 1.1, r0 * 1.1, r0 * 0.45, { f: [r0 * 0.9, r0 * 0.9] });
                jzXf(V, 'ADBE Position').setValue([CS[i][0], CS[i][1]]);
                jzSetExpr(jzXf(V, 'ADBE Scale'), hd + 'var s=100*(1+0.064*Math.sin(T*0.6+' + CS[i][3] + '));[s,s]');
                jzSetExpr(jzXf(V, 'ADBE Opacity'), hd + '100*Math.min(1,kk)');
            }
        } else {
            var ri = U * 0.32 * 0.99, ro = R * 1.05, c = R * 1.2, VS = bg3_solid(b, cA, 'bg vignettePulse', c * 2, c * 2);
            var m = bg3_cmask(VS, c, c, (ri + ro) / 2, { f: [ro - ri, ro - ri], inv: true });
            jzSetExpr(m.property('ADBE Mask Offset'), hd + jzN(U * 0.32) + '*(1.08-0.12*pu)-' + jzN(ri));
            jzXf(VS, 'ADBE Position').setValue([W / 2, H / 2]);
            jzSetExpr(jzXf(VS, 'ADBE Opacity'), hd + '100*Math.min(1,kk*1.1)');
        }
    }
});

/* ---- kaleidoscope — 万華鏡: small shapes drifting outwards, mirrored n-fold (each piece + its mirror image), slowly turning; two polygon rings */
jzReg('bg', 'kaleidoscope', {
    plan: function (rng, st) { return { seed: bg3_seed(rng), n: rng.pick([6, 8, 8, 10]), m: rng.int(6, 9), k: rng.range(0.075, 0.1), spd: rng.range(0.05, 0.1) * rng.pick([1, -1]) }; },
    build: function (b, P) {
        var W = b.W, H = b.H, sc = b.sc, sd = P.seed || 1, U = jzU(b), px = bg3_px(b), n = P.n || 8, m = P.m || 7, k = P.k || 0.085, j, q, z;
        var R = Math.sqrt(W * W + H * H) * 0.58, seg = Math.PI / n, r0 = U * 0.13;
        var hd = bg3_hd(b) + 'var e=oc(BT/0.8),rot=T*' + jzN(P.spd || 0.07) + ';';
        var S = jzShapeLayer(b, 'bg kaleidoscope', W / 2, H / 2);
        // faint polygon rings anchoring the symmetry (drawn on top), turning against each other
        var gr = jzGrp(S, 'rings'), RG = [[U * 0.46, -1], [U * 0.82, 1]];
        for (q = 0; q < 2; q++) {
            var gq = bg3_sub(gr, 'ring ' + (q + 1)), pts = [];
            for (z = 0; z < 2 * n; z++) pts.push([Math.cos(z * seg) * RG[q][0], Math.sin(z * seg) * RG[q][0]]);
            jzAddPath(gq, pts, true);
            jzSetExpr(jzGX(gq).property('ADBE Vector Rotation'), hd + (RG[q][1] > 0 ? '-' : '') + 'rot*1.5*180/Math.PI');
        }
        jzAddStroke(gr, jzLayC(sc, k * 0.9), Math.max(px, U * 0.002));
        jzSetExpr(jzGX(gr).property('ADBE Vector Group Opacity'), hd + '100*e');
        // pieces: unit shapes (100 px) scaled by expression; the mirror copy is flipped; Repeater makes the n-fold symmetry
        var SH = [[[100, 0], [-50, 80], [-50, -30]], [[100, 0], [0, 42], [-70, 0], [0, -42]]];
        for (j = 0; j < m; j++) {
            var type = bg3_h(sd, j) % 3, v = 0.6 + 0.8 * bg3_r(sd, j, 2), line = bg3_r(sd, j, 5) < 0.35;
            var jh = hd + 'var r=' + jzN(r0) + '+wr(' + jzN(bg3_r(sd, j, 1) * (R - r0)) + '+T*' + jzN(U * 0.05 * v) + ',' + jzN(R - r0) + '),fd=cl((r-' + jzN(r0) + ')/' + jzN(U * 0.15) + ')*cl((' + jzN(R) + '-r)/' + jzN(U * 0.2) + ')*e,' +
                'phi=' + jzN(seg) + '*(0.15+0.7*(0.5+0.5*Math.sin(T*' + jzN(0.35 * v) + '+' + jzN(j * 1.9) + '))),s=r*' + jzN(0.09 + 0.1 * bg3_r(sd, j, 3)) + '*fd,own=T*' + jzN(bg3_rs(sd, j, 4) * 1.2) + '+' + j + ';';
            var g = jzGrp(S, 'piece ' + (j + 1));
            for (q = 0; q < 2; q++) {
                var gi = bg3_sub(g, q ? 'mirror' : 'shape'), ng = q ? '-' : '';
                if (type === 2) jzAddEllipse(gi, 110, 110); else jzAddPath(gi, SH[type], true);
                jzSetExpr(jzGX(gi).property('ADBE Vector Position'), jh + '[r*Math.cos(phi),' + ng + 'r*Math.sin(phi)]');
                jzSetExpr(jzGX(gi).property('ADBE Vector Rotation'), jh + ng + '(phi+own)*180/Math.PI');
                jzSetExpr(jzGX(gi).property('ADBE Vector Scale'), jh + '[s,' + ng + 's]');
            }
            if (line) jzAddStroke(g, jzTintC(sc, k * 2.4), Math.max(px, U * 0.0028)); else jzAddFill(g, jzLayC(sc, k));
            var rp = bg3_rep(g, n, 0, 0, 0);
            rp.property('ADBE Vector Repeater Transform').property('ADBE Vector Repeater Rotation').setValue(360 / n);
            jzSetExpr(jzGX(g).property('ADBE Vector Rotation'), jh + 'rot*180/Math.PI');
            jzSetExpr(jzGX(g).property('ADBE Vector Group Opacity'), jh + 'fd>0.02?100:0');
        }
    }
});

/* ---- marble — 大理石: thin marble veins (turbulent sine iso-lines of the browser's fbm field) with a faint glow, optional accent veins,
   soft cloudiness; the whole texture drifts slowly. AE: the veins are traced once (marching squares) into smooth stroked paths */
jzReg('bg', 'marble', {
    plan: function (rng, st) { return { seed: bg3_seed(rng), ang: rng.range(0, 3.14), freq: rng.range(1.4, 2.2), turb: rng.range(7, 10), k: rng.range(0.17, 0.22), acc: rng.chance(0.5), dir: rng.pick([1, -1]) }; },
    build: function (b, P) {
        var W = b.W, H = b.H, sc = b.sc, sd = P.seed || 1, U = jzU(b), px = bg3_px(b), dk = bg3_dark(sc), M = U * 0.12, s = sd % 13, C = {}, G = 64, i, j, z;
        var c2 = jzContrast(sc.accent, sc.bg) > 1.3 ? sc.accent : (sc.accent2 || sc.fg);
        var w = W + 2 * M, h = H + 2 * M, D = Math.max(w, h), sD = D / G;
        var a = P.ang || 0.7, ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(a + 1.1), sb = Math.sin(a + 1.1), fq = (P.freq || 3) * BG3_TAU, tb = P.turb || 5;
        var F1 = [], F2 = [];
        for (j = 0; j <= G; j++) for (i = 0; i <= G; i++) {
            var u = i / G, v = j / G, X = u * 3, Y = v * 3;
            F1.push((u * ca + v * sa) * fq + bg3_fbm2(C, X, Y, sd, 4) * tb);
            if (P.acc) F2.push((u * cb + v * sb) * fq * 1.6 + bg3_fbm2(C, X * 1.4 + 5, Y * 1.4, sd + 9, 3) * tb * 1.3);
        }
        var hd = bg3_hd(b) + 'var e=oc(BT/1),ox=' + jzN(M) + '+' + jzN(M * 0.9) + '*Math.sin(T*' + jzN(0.06 * (P.dir || 1)) + '+' + s + '),oy=' + jzN(M) + '+' + jzN(M * 0.9) + '*Math.cos(T*0.045+' + (s * 2) + ');';
        var pos = hd + '[' + jzN((w - D) / 2) + '-ox,' + jzN((h - D) / 2) + '-oy]';
        // faint cloudiness (big soft noise, fg tone)
        var CL = bg3_solid(b, '#808080', 'bg marble cloud', D / 4, D / 4);
        var fn = jzEffect(CL, 'ADBE Fractal Noise', 'JZ Cloud'); jzEP(fn, 4, 140); jzEP(fn, 5, -20);
        var tn = jzEffect(CL, 'ADBE Tint', 'JZ Cloud Tone'); jzEP(tn, 1, jzHex(sc.bg)); jzEP(tn, 2, jzHex(sc.fg)); jzEP(tn, 3, 100);
        jzXf(CL, 'ADBE Scale').setValue([400, 400]);
        jzSetExpr(jzXf(CL, 'ADBE Position'), hd + '[' + jzN(w / 2) + '-ox,' + jzN(h / 2) + '-oy]');
        jzSetExpr(jzXf(CL, 'ADBE Opacity'), hd + jzN((P.k || 0.2) * 100 * 0.3 * (dk ? 1 : 0.8)) + '*e');
        // the veins: phase = k*PI iso-lines -> smooth paths (texture px), one layer drifting like the browser's plate
        var S = jzShapeLayer(b, 'bg marble', 0, 0), sets = [[F1, sc.fg, 'veins']];
        if (P.acc) sets.push([F2, c2, 'accent veins']);
        for (z = 0; z < sets.length; z++) {        // main veins first (= on top of the accent veins)
            var F = sets[z][0], lo = 1e9, hi = -1e9, g = jzGrp(S, sets[z][2]), lv;
            for (i = 0; i < F.length; i++) { if (F[i] < lo) lo = F[i]; if (F[i] > hi) hi = F[i]; }
            for (lv = Math.ceil(lo / Math.PI); lv * Math.PI <= hi; lv++) {
                var ch = bg3_iso(F, G, lv * Math.PI), c;
                for (c = 0; c < ch.length; c++) {
                    var pp = [], q;
                    for (q = 0; q < ch[c].pts.length; q++) pp.push([ch[c].pts[q][0] * sD, ch[c].pts[q][1] * sD]);
                    bg3_path(g, pp, ch[c].closed, true);
                }
            }
            if (z === 0) {
                bg3_roundJoin(jzAddStroke(g, sets[z][1], Math.max(px, U * 0.009), 100));
                bg3_roundJoin(jzAddStroke(g, sets[z][1], U * 0.03, 10));
            } else bg3_roundJoin(jzAddStroke(g, sets[z][1], Math.max(px, U * 0.005), 50));
        }
        jzSetExpr(jzXf(S, 'ADBE Position'), pos);
        jzSetExpr(jzXf(S, 'ADBE Opacity'), hd + jzN((P.k || 0.2) * 100 * (dk ? 1 : 0.8)) + '*e');
        // vein brightness varies along the veins (browser: x (0.45 + 0.55 * noise)) -> luma matte of soft noise drifting with the texture
        var MN = bg3_solid(b, '#808080', 'bg marble vein matte', D / 4, D / 4);
        var fm = jzEffect(MN, 'ADBE Fractal Noise', 'JZ Vein Level'); jzEP(fm, 4, 70); jzEP(fm, 5, 25);
        jzXf(MN, 'ADBE Scale').setValue([400, 400]);
        jzSetExpr(jzXf(MN, 'ADBE Position'), hd + '[' + jzN(w / 2) + '-ox,' + jzN(h / 2) + '-oy]');
        S.trackMatteType = TrackMatteType.LUMA;
    }
});

/* ---- paperCut — 切り絵: 3-4 layered paper frames with wavy superellipse openings (back = smallest), growing in, gently swaying, drop shadows.
   AE: full-frame solids with a subtracted mask (the opening, baked at the cut), Drop Shadow; grow = layer scale about the centre */
jzReg('bg', 'paperCut', {
    plan: function (rng, st) { return { seed: bg3_seed(rng), L: rng.int(3, 4), lobes: rng.int(5, 9), k: rng.range(0.06, 0.09), acc: rng.chance(0.5), p: rng.range(2.4, 3.2) }; },
    build: function (b, P) {
        var W = b.W, H = b.H, sc = b.sc, sd = P.seed || 1, U = jzU(b), dk = bg3_dark(sc), NL = P.L || 3, k = P.k || 0.075, pe = 2 / (P.p || 2.8), lobes = P.lobes || 6, N = 144, i, j;
        var Tm = (b.cut.start || 0) + b.comp.duration * 0.4, SW = W * 1.4, SH = H * 1.4, sh = U * 0.009;
        for (i = 0; i < NL; i++) {
            var d = NL > 1 ? (NL - 1 - i) / (NL - 1) : 0, rx = W * (0.41 + 0.17 * (1 - d)), ry = H * (0.38 + 0.17 * (1 - d)), ph = bg3_r(sd, i, 1) * BG3_TAU, sw = Tm * 0.25 * (i % 2 ? 1 : -1), pts = [];
            for (j = 0; j < N; j++) {
                var th = j / N * BG3_TAU, c = Math.cos(th), s = Math.sin(th);
                var wv = 1 + 0.035 * Math.sin((lobes + i) * th + ph + sw) + 0.014 * Math.sin((lobes * 2 + 3) * th - ph * 1.3 - sw * 0.7);
                pts.push([SW / 2 + rx * bg3_sgn(c) * Math.pow(Math.abs(c), pe) * wv, SH / 2 + ry * bg3_sgn(s) * Math.pow(Math.abs(s), pe) * wv]);
            }
            var hue = P.acc && i % 2 ? sc.accent : sc.fg;
            var col = dk ? jzMixHex(sc.bg, hue, k * (0.5 + 0.7 * (i + 1) / NL)) : jzMixHex(sc.bg, i % 2 ? hue : '#FFFFFF', (i % 2 ? k : 0.35) * (0.6 + 0.5 * (i + 1) / NL));
            var L = bg3_solid(b, col, 'bg paperCut ' + (i + 1), SW, SH);
            var mk = L.property('ADBE Mask Parade').addProperty('ADBE Mask Atom'), shp = new Shape(); shp.vertices = pts; shp.closed = true;
            mk.property('ADBE Mask Shape').setValue(shp); mk.maskMode = MaskMode.SUBTRACT;
            var ds = jzEffect(L, 'ADBE Drop Shadow', 'JZ Paper Shadow');
            jzEP(ds, 1, [0, 0, 0]); jzEP(ds, 2, Math.round(255 * (dk ? 0.32 : 0.12))); jzEP(ds, 3, 158.2); jzEP(ds, 4, sh * Math.sqrt(1.16)); jzEP(ds, 5, 0);
            var hi = bg3_hd(b) + 'var ip=oc((BT-' + jzN(i * 0.1) + ')/0.8),gr=1+(1-ip)*0.7;';
            jzSetExpr(jzXf(L, 'ADBE Scale'), hi + '[100*gr,100*gr]');
            jzSetExpr(jzXf(L, 'ADBE Position'), hi + '[' + jzN(W / 2) + '+Math.sin(T*0.35+' + i + ')*' + jzN(U * 0.006 * (i + 1)) + ',' + jzN(H / 2) + '+Math.cos(T*0.3+' + i + ')*' + jzN(U * 0.004 * (i + 1)) + ']');
        }
    }
});
